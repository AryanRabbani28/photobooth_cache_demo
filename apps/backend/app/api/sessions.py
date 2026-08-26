"""Session lifecycle — the §13 state machine over HTTP.

Endpoints split by who calls them:

  * **Operator/admin** create a session and issue the six §21.4 controls. Each writes
    the new state, then pushes the matching §15.3 command to the booth's socket.
  * **Kiosk** advances the session as the customer moves through the flow (select
    template, begin, capture, finish), then emits the §15.4 event for dashboards.

The server validates every transition (`common.transition`) before persisting, so a
client that has drifted out of sync gets a 409 rather than corrupting the session.

These handlers are `async def` to await the WebSocket fan-out, which means the
synchronous SQLite calls run on the event loop. Acceptable at demo scale (one local
database, a handful of sockets); a real deployment would use async SQLAlchemy.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.api.common import (
    LIVE_STATUSES,
    assert_booth_matches,
    command_booth,
    get_booth_or_404,
    get_session_or_404,
    live_session_for,
    log,
    recount_photos,
    session_out,
    transition,
)
from app.models import BoothSession, Package, Template, utcnow
from app.schemas import (
    AddTimeRequest,
    ExpireRequest,
    RetakeRequest,
    SelectTemplateRequest,
    SessionCreate,
    SessionOut,
    TickRequest,
)
from app.security import CurrentBooth, CurrentUser, DbSession, assert_can_command_booth, operator_for
from app.state_machine import SessionStatus, can_restart
from app.storage import absolute
from app.ws import Command, Event, manager

router = APIRouter(tags=["sessions"])


# =============================================================== operator side


@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(body: SessionCreate, user: CurrentUser, db: DbSession) -> SessionOut:
    """§4.1 — the mechanic the whole product turns on.

    The operator clicks START SESSION and *that booth* unlocks. No session key, no
    customer login: the booth is identified by which socket the command goes to.
    """
    assert_can_command_booth(user, body.booth_id, db)
    booth = get_booth_or_404(db, body.booth_id)

    if booth.id not in manager.connected_booth_ids:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Booth is offline — open the kiosk screen for this booth first",
        )
    if (existing := live_session_for(db, booth.id)) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Booth already has an active session ({existing.status})",
        )

    package = db.get(Package, body.package_id)
    if package is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Package not found")

    operator = operator_for(user, db)
    duration = body.duration_seconds or package.duration_seconds
    session = BoothSession(
        booth=booth,
        operator=operator,
        package=package,
        customer_name=body.customer_name,
        status=SessionStatus.CREATED,
        allocated_time=duration,
        remaining_time=duration,
        total_photos=package.max_photos,
        number_of_prints=body.number_of_prints or package.number_of_prints,
    )
    db.add(session)
    db.flush()  # assign the id before it goes into the command payload

    payload = {
        "session_id": session.id,
        "package_name": package.name,
        "customer_name": session.customer_name,
        "duration_seconds": duration,
        "max_photos": package.max_photos,
        "max_retakes": package.max_retakes,
        "number_of_prints": session.number_of_prints,
        "expiry_behavior": package.expiry_behavior,
        "grace_period_sec": package.grace_period_sec,
    }
    # Deliver before committing: if the socket has dropped since the check above, the
    # session is rolled back rather than left stranded in CREATED.
    await command_booth(booth.id, Command.START_SESSION, payload)

    # The kiosk has the command; it is now waiting for template selection.
    transition(session, SessionStatus.READY)
    log(db, "INFO", "sessions", f"Session started on {booth.booth_code}", booth_id=booth.id)
    db.commit()
    db.refresh(session)

    result = session_out(db, session)
    await manager.broadcast_event(
        Event.SESSION_STARTED, result.model_dump(mode="json"), booth_id=booth.id
    )
    return result


@router.post("/sessions/{session_id}/pause", response_model=SessionOut)
async def pause_session(session_id: str, user: CurrentUser, db: DbSession) -> SessionOut:
    """§21.4 PAUSE — freezes the kiosk countdown."""
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)

    transition(session, SessionStatus.PAUSED)
    await command_booth(session.booth_id, Command.PAUSE_SESSION, {"session_id": session.id})
    db.commit()
    db.refresh(session)

    result = session_out(db, session)
    await manager.broadcast_event(
        Event.SESSION_PAUSED, result.model_dump(mode="json"), booth_id=session.booth_id
    )
    return result


@router.post("/sessions/{session_id}/resume", response_model=SessionOut)
async def resume_session(session_id: str, user: CurrentUser, db: DbSession) -> SessionOut:
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)

    transition(session, SessionStatus.ACTIVE)
    await command_booth(session.booth_id, Command.RESUME_SESSION, {"session_id": session.id})
    db.commit()
    db.refresh(session)

    result = session_out(db, session)
    await manager.broadcast_event(
        Event.SESSION_RESUMED, result.model_dump(mode="json"), booth_id=session.booth_id
    )
    return result


@router.post("/sessions/{session_id}/add-time", response_model=SessionOut)
async def add_time(
    session_id: str, body: AddTimeRequest, user: CurrentUser, db: DbSession
) -> SessionOut:
    """§4.4 ADD TIME. Extends both the allowance and what's left on the clock.

    Legal while paused as well as active — the operator usually pauses first to explain
    the situation to the customer, then grants the extra time.
    """
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)

    if session.status not in (SessionStatus.ACTIVE, SessionStatus.PAUSED):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot add time to a session in {session.status}"
        )

    session.allocated_time += body.seconds
    session.remaining_time = (session.remaining_time or 0) + body.seconds
    await command_booth(
        session.booth_id,
        Command.ADD_TIME,
        {"session_id": session.id, "seconds": body.seconds,
         "remaining_time": session.remaining_time},
    )
    db.commit()
    db.refresh(session)
    return session_out(db, session)


@router.post("/sessions/{session_id}/cancel", response_model=SessionOut)
async def cancel_session(session_id: str, user: CurrentUser, db: DbSession) -> SessionOut:
    """§21.4 CANCEL — terminal, from any live state (§13.2 wildcard row)."""
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)

    transition(session, SessionStatus.CANCELLED)
    session.ended_at = utcnow()
    # Best-effort: a cancel must still succeed if the kiosk tab has already closed,
    # otherwise the session would be stuck live forever with no way to clear it.
    try:
        await command_booth(session.booth_id, Command.CANCEL_SESSION, {"session_id": session.id})
    except HTTPException:
        log(
            db, "WARN", "sessions",
            "Session cancelled while booth offline; kiosk not notified",
            booth_id=session.booth_id, session_id=session.id,
        )
    db.commit()
    db.refresh(session)

    result = session_out(db, session)
    await manager.broadcast_event(
        Event.SESSION_COMPLETED, result.model_dump(mode="json"), booth_id=session.booth_id
    )
    return result


@router.post("/sessions/{session_id}/restart", response_model=SessionOut)
async def restart_session(session_id: str, user: CurrentUser, db: DbSession) -> SessionOut:
    """§15.3 RESTART_SESSION — rewind to template selection, same time allowance.

    Discards the captures taken so far, which is what restarting means: their files are
    deleted along with their rows, so the gallery never shows a photo whose file is gone.
    """
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)

    if not can_restart(session.status_enum):
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Cannot restart a session in {session.status}"
        )

    for photo in list(session.photos):
        for rel in (photo.original_file_path, photo.processed_file_path):
            if rel:
                try:
                    absolute(rel).unlink(missing_ok=True)
                except (ValueError, OSError):
                    pass  # a missing file must not block the restart
        db.delete(photo)
    for final in list(session.final_outputs):
        if final.file_path:
            try:
                absolute(final.file_path).unlink(missing_ok=True)
            except (ValueError, OSError):
                pass
        db.delete(final)

    session.status = SessionStatus.READY  # explicit rewind, outside the §13.2 table
    session.template_id = None
    session.photos_captured = 0
    session.retakes_used = 0
    session.remaining_time = session.allocated_time
    session.started_at = None

    await command_booth(
        session.booth_id,
        Command.RESTART_SESSION,
        {"session_id": session.id, "remaining_time": session.remaining_time},
    )
    log(db, "INFO", "sessions", "Session restarted", booth_id=session.booth_id,
        session_id=session.id)
    db.commit()
    db.refresh(session)
    return session_out(db, session)


@router.post("/booths/{booth_id}/lock", response_model=SessionOut | None)
async def lock_booth(booth_id: str, user: CurrentUser, db: DbSession) -> SessionOut | None:
    """§15.3 LOCK_BOOTH — take a booth out of service without ending a session."""
    assert_can_command_booth(user, booth_id, db)
    booth = get_booth_or_404(db, booth_id)
    booth.status = "MAINTENANCE"
    await command_booth(booth_id, Command.LOCK_BOOTH, {"booth_code": booth.booth_code})
    db.commit()
    live = live_session_for(db, booth_id)
    return session_out(db, live) if live else None


@router.post("/booths/{booth_id}/unlock", response_model=SessionOut | None)
async def unlock_booth(booth_id: str, user: CurrentUser, db: DbSession) -> SessionOut | None:
    assert_can_command_booth(user, booth_id, db)
    booth = get_booth_or_404(db, booth_id)
    booth.status = "ONLINE"
    await command_booth(booth_id, Command.UNLOCK_BOOTH, {"booth_code": booth.booth_code})
    db.commit()
    live = live_session_for(db, booth_id)
    return session_out(db, live) if live else None


# ================================================================== kiosk side


@router.post("/sessions/{session_id}/select-template", response_model=SessionOut)
async def select_template(
    session_id: str, body: SelectTemplateRequest, booth: CurrentBooth, db: DbSession
) -> SessionOut:
    """§4.2 step 5. Sets the photo count from the template's slots (§12.4)."""
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)

    template = db.get(Template, body.template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    if session.package and template.number_of_slots > session.package.max_photos:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{template.name} needs {template.number_of_slots} photos but the package "
            f"allows {session.package.max_photos}",
        )

    transition(session, SessionStatus.TEMPLATE_SELECTED)
    session.template = template
    session.total_photos = template.number_of_slots
    db.commit()
    db.refresh(session)
    return session_out(db, session)


@router.post("/sessions/{session_id}/begin", response_model=SessionOut)
async def begin_session(session_id: str, booth: CurrentBooth, db: DbSession) -> SessionOut:
    """§4.2 step 6 — **the timer starts here**, not when the operator created the session.

    The spec is emphatic about this: the customer's paid time must not be spent reading
    the welcome screen or choosing a template.
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)

    transition(session, SessionStatus.ACTIVE)
    session.started_at = utcnow()
    session.remaining_time = session.allocated_time
    db.commit()
    db.refresh(session)

    result = session_out(db, session)
    await manager.broadcast_event(
        Event.SESSION_RESUMED, result.model_dump(mode="json"), booth_id=booth.id
    )
    return result


@router.post("/sessions/{session_id}/tick", response_model=SessionOut)
async def tick(
    session_id: str, body: TickRequest, booth: CurrentBooth, db: DbSession
) -> SessionOut:
    """The kiosk reporting its authoritative clock (§2.2 Principle 1).

    Accepted in ACTIVE only: a paused session's remaining time must not drift, and a
    finished one is settled.
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)
    if session.status == SessionStatus.ACTIVE:
        session.remaining_time = body.remaining_time
        db.commit()
        db.refresh(session)
    return session_out(db, session)


@router.post("/sessions/{session_id}/expire", response_model=SessionOut)
async def expire_session(
    session_id: str, body: ExpireRequest, booth: CurrentBooth, db: DbSession
) -> SessionOut:
    """Time ran out. §14.1 decides what that means, and the decision lives here.

    With photos already taken, expiry moves to PHOTO_COMPLETE so the customer still
    gets the prints they paid for — discarding them at the buzzer would be the wrong
    read of AUTO_COMPLETE. Only a session with nothing captured actually EXPIREs.
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)
    session.remaining_time = body.remaining_time

    if session.photos_captured > 0:
        transition(session, SessionStatus.PHOTO_COMPLETE)
        event = Event.SESSION_COMPLETED
    else:
        transition(session, SessionStatus.EXPIRED)
        session.ended_at = utcnow()
        event = Event.SESSION_EXPIRED
        log(db, "INFO", "sessions", "Session expired with no photos captured",
            booth_id=booth.id, session_id=session.id)

    db.commit()
    db.refresh(session)
    result = session_out(db, session)
    await manager.broadcast_event(event, result.model_dump(mode="json"), booth_id=booth.id)
    return result


@router.post("/sessions/{session_id}/photos-complete", response_model=SessionOut)
async def photos_complete(session_id: str, booth: CurrentBooth, db: DbSession) -> SessionOut:
    """All slots filled (§13.1 PHOTO_COMPLETE)."""
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)
    transition(session, SessionStatus.PHOTO_COMPLETE)
    db.commit()
    db.refresh(session)
    return session_out(db, session)


@router.post("/sessions/{session_id}/retake", response_model=SessionOut)
async def request_retake(
    session_id: str, body: RetakeRequest, booth: CurrentBooth, db: DbSession
) -> SessionOut:
    """§13.2's FINAL_PREVIEW → ACTIVE edge: the customer wants one shot again.

    Retake budget is enforced here, not in the kiosk UI — `max_retakes` of -1 means
    unlimited (§16.2).
    """
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)

    max_retakes = session.package.max_retakes if session.package else -1
    if max_retakes >= 0 and session.retakes_used >= max_retakes:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Retake limit reached ({max_retakes})"
        )

    photo = next((p for p in session.photos if p.slot_index == body.slot_index), None)
    if photo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No photo in slot {body.slot_index}")

    transition(session, SessionStatus.ACTIVE)
    session.retakes_used += 1
    # Drop the old capture so the slot is genuinely empty and re-uploadable.
    for rel in (photo.original_file_path, photo.processed_file_path):
        if rel:
            try:
                absolute(rel).unlink(missing_ok=True)
            except (ValueError, OSError):
                pass
    db.delete(photo)
    db.flush()
    recount_photos(db, session)
    db.commit()
    db.refresh(session)
    return session_out(db, session)


# ==================================================================== read side


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    user: CurrentUser,
    db: DbSession,
    booth_id: str | None = None,
    session_status: str | None = Query(default=None, alias="status"),
    live: bool = False,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[SessionOut]:
    """Session history (§22.3). Operators are scoped to their own booth."""
    from sqlalchemy import select

    stmt = select(BoothSession)
    if user.role != "ADMIN":
        operator = operator_for(user, db)
        stmt = stmt.where(BoothSession.booth_id == (operator.assigned_booth_id if operator else ""))
    if booth_id:
        stmt = stmt.where(BoothSession.booth_id == booth_id)
    if session_status:
        stmt = stmt.where(BoothSession.status == session_status)
    if live:
        stmt = stmt.where(BoothSession.status.in_(LIVE_STATUSES))

    rows = db.scalars(
        stmt.order_by(BoothSession.created_at.desc()).limit(limit).offset(offset)
    )
    return [session_out(db, s) for s in rows]


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(session_id: str, user: CurrentUser, db: DbSession) -> SessionOut:
    session = get_session_or_404(db, session_id)
    assert_can_command_booth(user, session.booth_id, db)
    return session_out(db, session)


@router.get("/booth/sessions/{session_id}", response_model=SessionOut)
def kiosk_get_session(session_id: str, booth: CurrentBooth, db: DbSession) -> SessionOut:
    """The kiosk's own view of its session, for polling after a reconnect."""
    session = get_session_or_404(db, session_id)
    assert_booth_matches(booth, session)
    return session_out(db, session)
