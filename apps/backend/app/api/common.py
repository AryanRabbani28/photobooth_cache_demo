"""Shared helpers for the API layer: lookups, guards, and serialisation.

Kept in one place so every router applies the same rules — particularly the §13.2
transition guard, which must reject an illegal move identically no matter which
surface asked for it.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Booth, BoothSession, FinalOutput, Photo, SystemLog
from app.schemas import BoothOut, DeviceStatusOut, SessionOut
from app.security import Claims
from app.state_machine import TERMINAL, InvalidTransition, SessionStatus, assert_transition
from app.ws import Command, manager

#: Statuses a session can still move on from — i.e. "this booth is busy".
LIVE_STATUSES: tuple[str, ...] = tuple(s.value for s in SessionStatus if s not in TERMINAL)


# ------------------------------------------------------------------ principals


def any_principal(claims: Claims) -> dict:
    """Accept a human *or* a booth token.

    Used by read-only catalogue endpoints (templates, LUTs, packages) that both the
    kiosk and the dashboards need.
    """
    if claims.get("role") not in ("ADMIN", "OPERATOR", "BOOTH_DEVICE"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Unrecognised token role")
    return claims


AnyPrincipal = Annotated[dict, Depends(any_principal)]


# --------------------------------------------------------------------- lookups


def get_booth_or_404(db: Session, booth_id: str) -> Booth:
    booth = db.get(Booth, booth_id)
    if booth is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booth not found")
    return booth


def get_session_or_404(db: Session, session_id: str) -> BoothSession:
    session = db.get(BoothSession, session_id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return session


def live_session_for(db: Session, booth_id: str) -> BoothSession | None:
    """The booth's current non-terminal session, if any.

    This is what a reloaded kiosk rehydrates from (§23.3) and what makes a booth read
    BUSY on the dashboards.
    """
    return db.scalars(
        select(BoothSession)
        .where(BoothSession.booth_id == booth_id, BoothSession.status.in_(LIVE_STATUSES))
        .order_by(BoothSession.created_at.desc())
    ).first()


def latest_final_output(db: Session, session_id: str) -> FinalOutput | None:
    return db.scalars(
        select(FinalOutput)
        .where(FinalOutput.session_id == session_id)
        .order_by(FinalOutput.created_at.desc())
    ).first()


def recount_photos(db: Session, session: BoothSession) -> int:
    """Set `photos_captured` from what is actually stored.

    Counted with a query rather than from `session.photos`: the loaded collection still
    holds rows deleted in this unit of work, so a retake would recount the photo it just
    removed. Call after `db.flush()`.
    """
    count = (
        db.scalar(
            select(func.count())
            .select_from(Photo)
            .where(Photo.session_id == session.id, Photo.is_kept.is_not(False))
        )
        or 0
    )
    session.photos_captured = count
    return count


# ---------------------------------------------------------------------- guards


def transition(session: BoothSession, to: SessionStatus) -> None:
    """Move a session, or fail with 409.

    A 409 here is a real answer, not a bug: it is the server refusing a move §13.2
    does not allow (say, ACTIVE → COMPLETED skipping the print step).
    """
    try:
        assert_transition(session.status_enum, to)
    except InvalidTransition as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    session.status = to


def assert_booth_matches(booth: Booth, session: BoothSession) -> None:
    """A device token may only touch its own booth's session."""
    if session.booth_id != booth.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Session belongs to another booth")


async def command_booth(booth_id: str, command: Command, payload: dict) -> None:
    """Deliver a §15.3 command, or 409 if that booth has no kiosk connected.

    The demo deliberately refuses rather than queueing: offline command queueing is
    §18 sync, which is out of scope, and silently accepting a command nobody will
    receive would be the dishonest option.
    """
    try:
        await manager.send_to_booth(booth_id, command, payload)
    except ConnectionError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Booth is offline — cannot deliver {command}"
        ) from exc


def log(db: Session, level: str, source: str, message: str, **details: object) -> None:
    """Write a §16.2 system_logs row. The admin error tile counts these."""
    db.add(
        SystemLog(
            booth_id=details.pop("booth_id", None),  # type: ignore[arg-type]
            level=level,
            source=source,
            message=message,
            details=details or None,
        )
    )


# ---------------------------------------------------------------- serialisation


def booth_out(db: Session, booth: Booth) -> BoothOut:
    """Serialise a booth with its *observed* status.

    Status is derived from whether a kiosk socket is actually connected right now, not
    from a column somebody remembered to update. If BC-01 has no tab open it reads
    OFFLINE, which is the honest answer.
    """
    connected = booth.id in manager.connected_booth_ids
    live = live_session_for(db, booth.id)
    if not connected:
        observed = "OFFLINE"
    elif booth.status == "MAINTENANCE":
        observed = "MAINTENANCE"
    elif live is not None:
        observed = "BUSY"
    else:
        observed = "ONLINE"

    return BoothOut(
        id=booth.id,
        name=booth.name,
        booth_code=booth.booth_code,
        device_id=booth.device_id,
        status=observed,
        last_seen=booth.last_seen,
        app_version=booth.app_version,
        location_name=booth.location.name if booth.location else None,
        device_status=(
            DeviceStatusOut.model_validate(booth.device_status) if booth.device_status else None
        ),
        active_session_id=live.id if live else None,
    )


def session_out(db: Session, session: BoothSession) -> SessionOut:
    final = latest_final_output(db, session.id)
    package = session.package
    # Queried, not counted from `session.photos`, for the same reason as `recount_photos`.
    photo_count = (
        db.scalar(
            select(func.count())
            .select_from(Photo)
            .where(Photo.session_id == session.id, Photo.is_kept.is_not(False))
        )
        or 0
    )
    return SessionOut(
        id=session.id,
        booth_id=session.booth_id,
        booth_code=session.booth.booth_code if session.booth else None,
        operator_id=session.operator_id,
        operator_name=session.operator.name if session.operator else None,
        package_id=session.package_id,
        package_name=package.name if package else None,
        template_id=session.template_id,
        template_name=session.template.name if session.template else None,
        customer_name=session.customer_name,
        status=SessionStatus(session.status),
        allocated_time=session.allocated_time,
        remaining_time=session.remaining_time,
        total_photos=session.total_photos,
        photos_captured=session.photos_captured,
        retakes_used=session.retakes_used,
        max_retakes=package.max_retakes if package else None,
        number_of_prints=session.number_of_prints
        or (package.number_of_prints if package else None),
        started_at=session.started_at,
        ended_at=session.ended_at,
        created_at=session.created_at,
        photo_count=photo_count,
        final_output_id=final.id if final else None,
        final_output_path=final.file_path if final else None,
    )
