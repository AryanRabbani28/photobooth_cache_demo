"""Pydantic v2 request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.state_machine import SessionStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------- auth


class LoginRequest(BaseModel):
    username: str
    password: str


class DeviceLoginRequest(BaseModel):
    """§20.3 — booths authenticate as devices, not humans."""

    device_id: str
    device_secret: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    display_name: str
    user_id: str | None = None
    booth_id: str | None = None
    booth_code: str | None = None
    location: str | None = None


class MeResponse(BaseModel):
    id: str
    username: str
    role: str
    display_name: str
    assigned_booth_id: str | None = None
    assigned_booth_code: str | None = None
    assigned_booth_name: str | None = None


# ----------------------------------------------------------------------- booths


class DeviceStatusOut(ORMModel):
    camera_status: str
    camera_model: str | None
    printer_status: str
    printer_model: str | None
    internet_status: str
    disk_free_mb: int | None
    app_version: str | None
    updated_at: datetime


class BoothOut(ORMModel):
    id: str
    name: str
    booth_code: str
    device_id: str | None
    status: str
    last_seen: datetime | None
    app_version: str | None
    location_name: str | None = None
    device_status: DeviceStatusOut | None = None
    active_session_id: str | None = None


# ---------------------------------------------------------------- configuration


class PackageOut(ORMModel):
    id: str
    name: str
    duration_seconds: int
    max_photos: int
    max_retakes: int
    number_of_prints: int
    price: float | None
    expiry_behavior: str
    grace_period_sec: int


class TemplateOut(ORMModel):
    id: str
    name: str
    category: str | None
    configuration: dict[str, Any]
    number_of_slots: int
    version: int


class LutOut(ORMModel):
    id: str
    name: str
    description: str | None
    css_filter: str | None
    file_path: str


# --------------------------------------------------------------------- sessions


class SessionCreate(BaseModel):
    """The §21.3 start-session form."""

    booth_id: str
    package_id: str
    customer_name: str | None = None
    # Operator may override the package default (§21.3 shows editable duration/prints).
    duration_seconds: int | None = Field(default=None, ge=30, le=3600)
    number_of_prints: int | None = Field(default=None, ge=1, le=10)


class SessionOut(ORMModel):
    id: str
    booth_id: str
    booth_code: str | None = None
    operator_id: str | None
    operator_name: str | None = None
    package_id: str | None
    package_name: str | None = None
    template_id: str | None
    template_name: str | None = None
    customer_name: str | None
    status: SessionStatus
    allocated_time: int
    remaining_time: int | None
    total_photos: int
    photos_captured: int
    retakes_used: int
    max_retakes: int | None = None
    number_of_prints: int | None = None
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    photo_count: int = 0
    final_output_id: str | None = None
    final_output_path: str | None = None


class SelectTemplateRequest(BaseModel):
    template_id: str


class AddTimeRequest(BaseModel):
    # §4.4 offers +30s / +1m / +2m; bounded to keep a demo session sane.
    seconds: int = Field(ge=5, le=600)


class TickRequest(BaseModel):
    """Kiosk reporting authoritative remaining time (it owns the clock, §2.2 P1)."""

    remaining_time: int = Field(ge=0)


class ExpireRequest(BaseModel):
    remaining_time: int = 0


class RetakeRequest(BaseModel):
    slot_index: int = Field(ge=0)


class PhotoOut(ORMModel):
    id: str
    session_id: str
    slot_index: int
    original_file_path: str
    processed_file_path: str | None
    filter_name: str | None
    is_kept: bool
    captured_at: datetime


class FinalOutputOut(ORMModel):
    id: str
    session_id: str
    file_path: str
    created_at: datetime


class PrintJobOut(ORMModel):
    id: str
    session_id: str
    final_output_id: str | None
    copies: int
    status: str
    error_message: str | None
    is_reprint: bool
    created_at: datetime
    completed_at: datetime | None


class PrintRequest(BaseModel):
    copies: int | None = Field(default=None, ge=1, le=10)


class ReprintRequest(BaseModel):
    session_id: str | None = None
    final_output_id: str | None = None
    copies: int = Field(default=1, ge=1, le=10)


# -------------------------------------------------------------------- heartbeat


class HeartbeatRequest(BaseModel):
    """§15.5 heartbeat payload, minus the fields the server derives itself."""

    camera_status: Literal["CONNECTED", "DISCONNECTED", "UNKNOWN"] = "UNKNOWN"
    camera_model: str | None = None
    printer_status: Literal["READY", "ERROR", "BUSY", "UNKNOWN"] = "UNKNOWN"
    printer_model: str | None = None
    internet_status: Literal["ONLINE", "OFFLINE", "UNKNOWN"] = "ONLINE"
    session_id: str | None = None
    remaining_time: int | None = None
    app_version: str | None = None


# -------------------------------------------------------------------- analytics


class OverviewStats(BaseModel):
    """§22.1 dashboard tiles."""

    total_booths: int
    online_booths: int
    offline_booths: int
    active_sessions: int
    sessions_today: int
    photos_today: int
    prints_today: int
    errors_today: int
    top_locations: list[dict[str, Any]]
    popular_templates: list[dict[str, Any]]
    popular_filters: list[dict[str, Any]]
