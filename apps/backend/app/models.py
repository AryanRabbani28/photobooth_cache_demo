"""ORM models mirroring the spec's §16.2 schema.

Deviation: the spec's DDL is PostgreSQL-specific (`gen_random_uuid()`, `JSONB`,
`TIMESTAMPTZ`). These are portable equivalents — `String(36)` UUIDs generated in Python,
`JSON`, and naive UTC `DateTime` — so the same models run on SQLite for the demo and on
Postgres or MySQL by changing only `settings.database_url`.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.state_machine import SessionStatus


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Naive UTC. Naive because SQLite discards tzinfo, so storing it invites
    comparisons between aware and naive datetimes that raise at runtime."""
    return datetime.now(UTC).replace(tzinfo=None)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


# --------------------------------------------------------------------------- users


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # §20.2 — ADMIN | OPERATOR | BOOTH_DEVICE
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    operator: Mapped[Operator | None] = relationship(back_populates="user", uselist=False)


class Operator(Base, TimestampMixin):
    __tablename__ = "operators"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    # §3.2 — one operator commands exactly one booth.
    assigned_booth_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("booths.id", ondelete="SET NULL")
    )

    user: Mapped[User | None] = relationship(back_populates="operator")
    assigned_booth: Mapped[Booth | None] = relationship(back_populates="operators")


# --------------------------------------------------------------------- booths


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    booths: Mapped[list[Booth]] = relationship(back_populates="location")


class Booth(Base, TimestampMixin):
    __tablename__ = "booths"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    location_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("locations.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    booth_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    device_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    # Hash of the §20.3 device secret — never the secret itself.
    device_secret_hash: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="OFFLINE", nullable=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime)
    app_version: Mapped[str | None] = mapped_column(String(20))

    location: Mapped[Location | None] = relationship(back_populates="booths")
    operators: Mapped[list[Operator]] = relationship(back_populates="assigned_booth")
    device_status: Mapped[DeviceStatus | None] = relationship(
        back_populates="booth", uselist=False, cascade="all, delete-orphan"
    )
    sessions: Mapped[list[BoothSession]] = relationship(back_populates="booth")


class DeviceStatus(Base):
    """§16.2 device_status — one row per booth, overwritten by each heartbeat."""

    __tablename__ = "device_status"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    booth_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("booths.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    camera_status: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    camera_model: Mapped[str | None] = mapped_column(String(100))
    printer_status: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    printer_model: Mapped[str | None] = mapped_column(String(100))
    internet_status: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    disk_free_mb: Mapped[int | None] = mapped_column(Integer)
    app_version: Mapped[str | None] = mapped_column(String(20))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    booth: Mapped[Booth] = relationship(back_populates="device_status")


# ------------------------------------------------------------------- configuration


class Package(Base, TimestampMixin):
    __tablename__ = "packages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    max_photos: Mapped[int] = mapped_column(Integer, nullable=False)
    max_retakes: Mapped[int] = mapped_column(Integer, default=-1, nullable=False)  # -1 = unlimited
    number_of_prints: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    price: Mapped[float | None] = mapped_column(Numeric(10, 2))
    # §14.1 — AUTO_COMPLETE | GRACE_PERIOD | ASK_OPERATOR
    expiry_behavior: Mapped[str] = mapped_column(String(20), default="AUTO_COMPLETE", nullable=False)
    grace_period_sec: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Template(Base, TimestampMixin):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    # The full §12.2 JSON. The kiosk's compositor renders straight from this.
    configuration: Mapped[dict] = mapped_column(JSON, nullable=False)
    thumbnail_path: Mapped[str | None] = mapped_column(String(500))
    template_path: Mapped[str | None] = mapped_column(String(500))
    # Denormalised len(configuration["slots"]) — §12.4 derives photo count from it.
    number_of_slots: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Lut(Base, TimestampMixin):
    """§16.2 luts. The demo's filters are canvas operations rather than parsed `.cube`
    files, so `file_path` is a declared intent the real build fulfils; `css_filter`
    carries what the browser actually applies."""

    __tablename__ = "luts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    preview_path: Mapped[str | None] = mapped_column(String(500))
    css_filter: Mapped[str | None] = mapped_column(String(500))
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


# ----------------------------------------------------------------------- sessions


class BoothSession(Base, TimestampMixin):
    """§16.2 sessions. Named `BoothSession` so it never collides with a SQLAlchemy
    `Session` in a type annotation or import."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    booth_id: Mapped[str] = mapped_column(String(36), ForeignKey("booths.id"), nullable=False)
    operator_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("operators.id"))
    package_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("packages.id"))
    template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("templates.id"))
    customer_name: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default=SessionStatus.CREATED, nullable=False)

    allocated_time: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_time: Mapped[int | None] = mapped_column(Integer)
    total_photos: Mapped[int] = mapped_column(Integer, nullable=False)
    photos_captured: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retakes_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Copied from the package at creation so the operator's §21.3 override survives a
    # later package edit — the session prints what was agreed when it started.
    number_of_prints: Mapped[int | None] = mapped_column(Integer)

    # started_at is when the *timer* starts (§4.2 step 6), not when the operator
    # created the session — the distinction the spec is emphatic about.
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)

    booth: Mapped[Booth] = relationship(back_populates="sessions")
    operator: Mapped[Operator | None] = relationship()
    package: Mapped[Package | None] = relationship()
    template: Mapped[Template | None] = relationship()
    photos: Mapped[list[Photo]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="Photo.slot_index"
    )
    final_outputs: Mapped[list[FinalOutput]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    print_jobs: Mapped[list[PrintJob]] = relationship(back_populates="session")

    @property
    def status_enum(self) -> SessionStatus:
        return SessionStatus(self.status)


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    original_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    processed_file_path: Mapped[str | None] = mapped_column(String(500))
    lut_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("luts.id"))
    filter_name: Mapped[str | None] = mapped_column(String(50))
    is_kept: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    # Always SYNCED here: the browser uploads directly, so there is no §18 queue to
    # traverse. Retained so the column means the same thing in the real build.
    sync_status: Mapped[str] = mapped_column(String(20), default="SYNCED", nullable=False)

    session: Mapped[BoothSession] = relationship(back_populates="photos")
    lut: Mapped[Lut | None] = relationship()


class FinalOutput(Base):
    __tablename__ = "final_outputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    sync_status: Mapped[str] = mapped_column(String(20), default="SYNCED", nullable=False)

    session: Mapped[BoothSession] = relationship(back_populates="final_outputs")


class PrintJob(Base):
    __tablename__ = "print_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), nullable=False)
    final_output_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("final_outputs.id")
    )
    copies: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # §10.3 — QUEUED | PRINTING | COMPLETED | FAILED | CANCELLED
    status: Mapped[str] = mapped_column(String(20), default="QUEUED", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
    is_reprint: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    session: Mapped[BoothSession] = relationship(back_populates="print_jobs")
    final_output: Mapped[FinalOutput | None] = relationship()


class SystemLog(Base):
    __tablename__ = "system_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    booth_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("booths.id"))
    level: Mapped[str] = mapped_column(String(10), nullable=False)
    source: Mapped[str | None] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False, index=True)
