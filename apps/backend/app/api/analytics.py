"""Analytics — the §22.1 dashboard tiles.

Every number here is counted from real rows. Nothing is estimated or padded: on a fresh
database the tiles read zero and fill as sessions actually run, which is the honest
behaviour the demo scope calls for.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import func, select

from app.models import Booth, BoothSession, Location, Photo, PrintJob, SystemLog, Template, utcnow
from app.schemas import OverviewStats
from app.security import CurrentUser, DbSession
from app.state_machine import TERMINAL, SessionStatus
from app.ws import manager

router = APIRouter(tags=["analytics"])

_LIVE = tuple(s.value for s in SessionStatus if s not in TERMINAL)


@router.get("/analytics/overview", response_model=OverviewStats)
def overview(_: CurrentUser, db: DbSession) -> OverviewStats:
    """§22.1 tiles. "Today" is UTC midnight — the demo runs in one sitting, so a
    timezone-aware business day would be precision without a purpose."""
    since = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_booths = db.scalar(select(func.count()).select_from(Booth)) or 0
    # Online is measured from live sockets, not a status column: a booth is online iff
    # a kiosk is connected right now.
    online = len(manager.connected_booth_ids)

    sessions_today = (
        db.scalar(
            select(func.count()).select_from(BoothSession).where(BoothSession.created_at >= since)
        )
        or 0
    )
    active_sessions = (
        db.scalar(
            select(func.count()).select_from(BoothSession).where(BoothSession.status.in_(_LIVE))
        )
        or 0
    )
    photos_today = (
        db.scalar(select(func.count()).select_from(Photo).where(Photo.captured_at >= since)) or 0
    )
    prints_today = (
        db.scalar(
            select(func.coalesce(func.sum(PrintJob.copies), 0)).where(
                PrintJob.created_at >= since, PrintJob.status == "COMPLETED"
            )
        )
        or 0
    )
    errors_today = (
        db.scalar(
            select(func.count())
            .select_from(SystemLog)
            .where(SystemLog.created_at >= since, SystemLog.level.in_(("ERROR", "CRITICAL")))
        )
        or 0
    )

    # §22.2 revenue-by-location, over the trailing week.
    week_ago = utcnow() - timedelta(days=7)
    top_locations = [
        {"location": name, "sessions": count}
        for name, count in db.execute(
            select(Location.name, func.count(BoothSession.id))
            .join(Booth, Booth.location_id == Location.id)
            .join(BoothSession, BoothSession.booth_id == Booth.id)
            .where(BoothSession.created_at >= week_ago)
            .group_by(Location.name)
            .order_by(func.count(BoothSession.id).desc())
            .limit(5)
        ).all()
    ]

    popular_templates = [
        {"template": name, "uses": count}
        for name, count in db.execute(
            select(Template.name, func.count(BoothSession.id))
            .join(BoothSession, BoothSession.template_id == Template.id)
            .group_by(Template.name)
            .order_by(func.count(BoothSession.id).desc())
            .limit(5)
        ).all()
    ]

    popular_filters = [
        {"filter": name, "uses": count}
        for name, count in db.execute(
            select(Photo.filter_name, func.count(Photo.id))
            .where(Photo.filter_name.is_not(None))
            .group_by(Photo.filter_name)
            .order_by(func.count(Photo.id).desc())
            .limit(6)
        ).all()
    ]

    return OverviewStats(
        total_booths=total_booths,
        online_booths=online,
        offline_booths=max(0, total_booths - online),
        active_sessions=active_sessions,
        sessions_today=sessions_today,
        photos_today=photos_today,
        prints_today=int(prints_today),
        errors_today=errors_today,
        top_locations=top_locations,
        popular_templates=popular_templates,
        popular_filters=popular_filters,
    )


@router.get("/logs", response_model=list[dict])
def recent_logs(_: CurrentUser, db: DbSession, limit: int = 50) -> list[dict]:
    """§22.5 system logs — what actually happened, including the print failures."""
    rows = db.scalars(select(SystemLog).order_by(SystemLog.created_at.desc()).limit(limit))
    return [
        {
            "id": r.id,
            "level": r.level,
            "source": r.source,
            "message": r.message,
            "details": r.details,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
