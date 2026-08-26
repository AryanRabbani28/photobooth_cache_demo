"""Booth endpoints: status for the dashboards, heartbeat for the kiosk."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.common import booth_out, get_booth_or_404, live_session_for, session_out
from app.models import Booth, DeviceStatus, utcnow
from app.schemas import BoothOut, HeartbeatRequest, SessionOut
from app.security import CurrentBooth, CurrentUser, DbSession, operator_for
from app.storage import free_space_mb

router = APIRouter(tags=["booths"])


@router.get("/booths", response_model=list[BoothOut])
def list_booths(user: CurrentUser, db: DbSession) -> list[BoothOut]:
    """Admins see every booth; an operator sees only the one they command (§25.2)."""
    booths = list(db.scalars(select(Booth).order_by(Booth.booth_code)))
    if user.role != "ADMIN":
        operator = operator_for(user, db)
        assigned = operator.assigned_booth_id if operator else None
        booths = [b for b in booths if b.id == assigned]
    return [booth_out(db, b) for b in booths]


@router.get("/booths/{booth_id}", response_model=BoothOut)
def get_booth(booth_id: str, user: CurrentUser, db: DbSession) -> BoothOut:
    from app.security import assert_can_command_booth

    assert_can_command_booth(user, booth_id, db)
    return booth_out(db, get_booth_or_404(db, booth_id))


@router.get("/booths/{booth_id}/session", response_model=SessionOut | None)
def get_booth_live_session(booth_id: str, user: CurrentUser, db: DbSession) -> SessionOut | None:
    """What this booth is doing right now — the operator monitor's poll fallback."""
    from app.security import assert_can_command_booth

    assert_can_command_booth(user, booth_id, db)
    get_booth_or_404(db, booth_id)
    live = live_session_for(db, booth_id)
    return session_out(db, live) if live else None


# ------------------------------------------------------------------- kiosk side


@router.get("/booth/me", response_model=BoothOut)
def booth_me(booth: CurrentBooth, db: DbSession) -> BoothOut:
    """The kiosk's own identity, used to render the booth code on the idle screen."""
    return booth_out(db, booth)


@router.get("/booth/me/session", response_model=SessionOut | None)
def booth_live_session(booth: CurrentBooth, db: DbSession) -> SessionOut | None:
    """§23.3 crash recovery: on load, the kiosk asks whether a session is still open.

    Reloading the kiosk tab mid-session therefore resumes rather than dropping the
    customer back to idle.
    """
    live = live_session_for(db, booth.id)
    return session_out(db, live) if live else None


@router.post("/booth/heartbeat", response_model=BoothOut)
def heartbeat(body: HeartbeatRequest, booth: CurrentBooth, db: DbSession) -> BoothOut:
    """§15.5 — every 30s from the kiosk.

    Two jobs: refresh the device-status row the dashboards display, and accept the
    kiosk's `remaining_time` as truth. The kiosk owns the countdown (§2.2 Principle 1),
    so the server records what it reports rather than running a clock of its own.
    """
    booth.last_seen = utcnow()
    if body.app_version:
        booth.app_version = body.app_version
    if booth.status == "OFFLINE":
        booth.status = "ONLINE"

    _upsert_device_status(db, booth, body)

    if body.session_id and body.remaining_time is not None:
        live = live_session_for(db, booth.id)
        if live is not None and live.id == body.session_id:
            live.remaining_time = body.remaining_time

    db.commit()
    db.refresh(booth)
    return booth_out(db, booth)


def _upsert_device_status(db: Session, booth: Booth, body: HeartbeatRequest) -> None:
    row = booth.device_status
    if row is None:
        row = DeviceStatus(booth=booth)
        db.add(row)
    row.camera_status = body.camera_status
    row.camera_model = body.camera_model
    row.printer_status = body.printer_status
    row.printer_model = body.printer_model
    row.internet_status = body.internet_status
    row.app_version = body.app_version
    row.disk_free_mb = free_space_mb()  # measured, not reported by the client
    row.updated_at = utcnow()
