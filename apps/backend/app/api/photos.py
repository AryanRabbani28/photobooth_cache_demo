"""Photo upload, compositing hand-off, printing, and media serving.

Uploads come from the kiosk as multipart JPEG blobs produced by canvas — the browser is
the capture device here (§8.1), so the backend's job is to store what it is given under
the §17.2 layout and record the row.
"""

from __future__ import annotations

from fastapi import APIRouter, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.api.common import (
    assert_booth_matches,
    get_session_or_404,
    latest_final_output,
    log,
    recount_photos,
    session_out,
    transition,
)
from app.models import FinalOutput, Lut, Photo, PrintJob, utcnow
from app.printer import arm_failure, failure_armed, run_print_job
from app.schemas import (
    FinalOutputOut,
    PhotoOut,
    PrintJobOut,
    PrintRequest,
    ReprintRequest,
    SessionOut,
)
from app.security import (
    AdminUser,
    CurrentBooth,
    CurrentUser,
    DbSession,
    assert_can_command_booth,
    decode_token,
)
from app.state_machine import SessionStatus
from app.storage import absolute, save_final, save_photo
from app.ws import Command, Event, manager

router = APIRouter(tags=["photos"])

MAX_UPLOAD_BYTES = 12 * 1024 * 1024  # a 1200x1800 canvas JPEG lands far under this


async def _read_image(file: UploadFile) -> bytes:
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Expected JPEG or PNG, got {file.content_type}"
        )
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty upload")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image too large")
    return data


@router.post(
    "/sessions/{session_id}/photos",
    response_model=PhotoOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    session_id: str,
    booth: CurrentBooth,
    db: DbSession,
    slot_index: int = Form(...),
    filter_name: str | None = Form(default=None),
    original: UploadFile = Form(...),
    processed: UploadFile | None = Form(default=None),
) -> PhotoOut:
    """One capture. Stores the original and, when a filter was applied, the processed
    copy — §17.2 keeps them apart so the original is always recoverable.
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)

    if session.status not in (SessionStatus.ACTIVE, SessionStatus.PAUSED):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot capture while session is {session.status}"
        )
    if slot_index >= session.total_photos:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Slot {slot_index} is out of range for {session.total_photos} photos",
        )
    if any(p.slot_index == slot_index for p in session.photos):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Slot {slot_index} is already filled — request a retake to replace it",
        )

    original_path = save_photo(
        await _read_image(original), session.id, slot_index, processed=False
    )
    processed_path = None
    if processed is not None:
        processed_path = save_photo(
            await _read_image(processed), session.id, slot_index, processed=True
        )

    lut = None
    if filter_name:
        lut = db.scalars(select(Lut).where(Lut.name == filter_name)).first()

    photo = Photo(
        session=session,
        slot_index=slot_index,
        original_file_path=original_path,
        processed_file_path=processed_path,
        lut=lut,
        filter_name=filter_name,
    )
    db.add(photo)
    # Flush before counting: `is_kept` is a column default, so it is still None on the
    # instance until the unit of work writes it — an unflushed photo would not count
    # itself and every session would report one capture short.
    db.flush()
    recount_photos(db, session)
    db.commit()
    db.refresh(photo)
    db.refresh(session)

    await manager.broadcast_event(
        Event.PHOTO_CAPTURED,
        {
            "session_id": session.id,
            "slot_index": slot_index,
            "photos_captured": session.photos_captured,
            "total_photos": session.total_photos,
            "filter_name": filter_name,
        },
        booth_id=booth.id,
    )
    return PhotoOut.model_validate(photo)


@router.post(
    "/sessions/{session_id}/final",
    response_model=FinalOutputOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_final(
    session_id: str,
    booth: CurrentBooth,
    db: DbSession,
    image: UploadFile = Form(...),
) -> FinalOutputOut:
    """The composited strip (§12.3), rendered by the kiosk's canvas compositor.

    Moves the session to FINAL_PREVIEW, which is the state the print button lives in.
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)

    data = await _read_image(image)
    # Re-compositing after a retake replaces the previous output rather than piling up
    # near-identical files.
    for existing in list(session.final_outputs):
        try:
            absolute(existing.file_path).unlink(missing_ok=True)
        except (ValueError, OSError):
            pass
        db.delete(existing)
    db.flush()

    final = FinalOutput(session=session, file_path=save_final(data, session.id))
    db.add(final)
    if session.status == SessionStatus.PHOTO_COMPLETE:
        transition(session, SessionStatus.FINAL_PREVIEW)
    db.commit()
    db.refresh(final)
    return FinalOutputOut.model_validate(final)


@router.get("/sessions/{session_id}/photos", response_model=list[PhotoOut])
def list_photos(session_id: str, user: CurrentUser, db: DbSession) -> list[Photo]:
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)
    return list(session.photos)


# ----------------------------------------------------------------------- print


@router.post("/sessions/{session_id}/print", response_model=PrintJobOut)
async def print_session(
    session_id: str, body: PrintRequest, booth: CurrentBooth, db: DbSession
) -> PrintJobOut:
    """§4.2 step 12 — the customer confirms, the kiosk prints.

    Runs the job inline so the kiosk's PRINTING screen ends when the job does. At a
    2.5s mock duration that is fine; a real 8s-per-print queue would move to a worker.
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)

    final = latest_final_output(db, session.id)
    if final is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "No composited output to print — upload the final image first"
        )

    transition(session, SessionStatus.PRINTING)
    job = PrintJob(
        session=session,
        final_output=final,
        copies=body.copies or session.number_of_prints or 1,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    await run_print_job(db, job, final.file_path, booth.id)

    if job.status == "COMPLETED":
        transition(session, SessionStatus.COMPLETED)
        session.ended_at = utcnow()
    else:
        transition(session, SessionStatus.PRINT_FAILED)
        log(db, "ERROR", "printer", job.error_message or "Print failed",
            booth_id=booth.id, session_id=session.id, job_id=job.id)
    db.commit()
    db.refresh(job)
    db.refresh(session)

    await manager.broadcast_event(
        Event.SESSION_COMPLETED if job.status == "COMPLETED" else Event.PRINTER_ERROR,
        session_out(db, session).model_dump(mode="json"),
        booth_id=booth.id,
    )
    return PrintJobOut.model_validate(job)


@router.post("/sessions/{session_id}/reprint", response_model=PrintJobOut)
async def reprint(
    session_id: str, body: ReprintRequest, user: CurrentUser, db: DbSession
) -> PrintJobOut:
    """§21.4 REPRINT — operator-initiated, and the §23.2 recovery path after a failure.

    Works on a completed session (customer wants another copy) and on a failed one
    (retry the print), which is why it accepts both PRINT_FAILED and terminal states.
    """
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)

    final = (
        db.get(FinalOutput, body.final_output_id)
        if body.final_output_id
        else latest_final_output(db, session.id)
    )
    if final is None or final.session_id != session.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No final output for this session")

    retrying = session.status == SessionStatus.PRINT_FAILED
    if retrying:
        transition(session, SessionStatus.PRINTING)

    job = PrintJob(
        session=session, final_output=final, copies=body.copies, is_reprint=not retrying
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Tell the kiosk so it can show the printing screen again during a retry.
    try:
        await manager.send_to_booth(
            session.booth_id,
            Command.REPRINT,
            {"session_id": session.id, "job_id": job.id, "copies": job.copies},
        )
    except ConnectionError:
        pass  # a reprint for a walk-up customer works with the kiosk closed

    await run_print_job(db, job, final.file_path, session.booth_id)

    if retrying:
        if job.status == "COMPLETED":
            transition(session, SessionStatus.COMPLETED)
            session.ended_at = utcnow()
        else:
            transition(session, SessionStatus.PRINT_FAILED)
        db.commit()
        db.refresh(session)
        await manager.broadcast_event(
            Event.SESSION_COMPLETED if job.status == "COMPLETED" else Event.PRINTER_ERROR,
            session_out(db, session).model_dump(mode="json"),
            booth_id=session.booth_id,
        )
    db.refresh(job)
    return PrintJobOut.model_validate(job)


@router.get("/print-jobs", response_model=list[PrintJobOut])
def list_print_jobs(
    user: CurrentUser, db: DbSession, session_id: str | None = None, limit: int = 50
) -> list[PrintJob]:
    stmt = select(PrintJob)
    if session_id:
        session = get_session_or_404(db, session_id)
        assert_can_command_booth(user, session.booth_id, db)
        stmt = stmt.where(PrintJob.session_id == session_id)
    return list(db.scalars(stmt.order_by(PrintJob.created_at.desc()).limit(limit)))


@router.post("/printer/fail-next", response_model=dict)
def set_printer_failure(armed: bool, _: AdminUser) -> dict:
    """Arm the §10.4 failure injection so §23.2 recovery can be shown live.

    Admin-only, and one-shot: the next job fails, the retry after it succeeds.
    """
    return {"failure_armed": arm_failure(armed)}


@router.get("/printer/fail-next", response_model=dict)
def get_printer_failure(_: CurrentUser) -> dict:
    return {"failure_armed": failure_armed()}


# ----------------------------------------------------------------------- media


@router.get("/media/{path:path}")
def serve_media(path: str, db: DbSession, token: str | None = None) -> Response:
    """Serve a stored image.

    Authenticated: these are photographs of customers, so §25.3's privacy posture says
    they don't belong on an open static route. The token arrives as a query parameter
    because an `<img src>` cannot carry an Authorization header — the same JWT, moved to
    where the browser can actually send it. `absolute()` blocks traversal.
    """
    claims = decode_token(token) if token else None
    if claims is None or claims.get("role") not in ("ADMIN", "OPERATOR", "BOOTH_DEVICE"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Valid token required")

    try:
        target = absolute(path)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path") from exc
    if not target.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    # Customer photographs: never let a shared cache hold on to them.
    return FileResponse(
        target, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=300"}
    )
