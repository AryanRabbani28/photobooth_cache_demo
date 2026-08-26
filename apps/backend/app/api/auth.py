"""Auth endpoints — §20.2 human login and §20.3 booth device login."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.models import Booth, User
from app.schemas import DeviceLoginRequest, LoginRequest, MeResponse, TokenResponse
from app.security import (
    CurrentUser,
    DbSession,
    create_token,
    operator_for,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DbSession) -> TokenResponse:
    """Operator or admin login (§21.1)."""
    user = db.scalars(select(User).where(User.username == body.username)).first()
    # One message for both wrong-user and wrong-password: don't confirm which usernames
    # exist.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    operator = operator_for(user, db)
    booth = operator.assigned_booth if operator else None
    return TokenResponse(
        access_token=create_token(user.id, user.role),  # type: ignore[arg-type]
        role=user.role,
        display_name=operator.name if operator else user.username,
        user_id=user.id,
        booth_id=booth.id if booth else None,
        booth_code=booth.booth_code if booth else None,
        location=booth.location.name if booth and booth.location else None,
    )


@router.post("/device-login", response_model=TokenResponse)
def device_login(body: DeviceLoginRequest, db: DbSession) -> TokenResponse:
    """§20.3 — a kiosk authenticates as a device, using a device_id + secret pair.

    The token's subject is the booth id, so every booth-scoped endpoint can trust that
    a kiosk is only ever acting for itself.
    """
    booth = db.scalars(select(Booth).where(Booth.device_id == body.device_id)).first()
    if (
        booth is None
        or booth.device_secret_hash is None
        or not verify_password(body.device_secret, booth.device_secret_hash)
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid device credentials")

    return TokenResponse(
        access_token=create_token(booth.id, "BOOTH_DEVICE", booth_code=booth.booth_code),
        role="BOOTH_DEVICE",
        display_name=f"{booth.booth_code} — {booth.name}",
        booth_id=booth.id,
        booth_code=booth.booth_code,
        location=booth.location.name if booth.location else None,
    )


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser, db: DbSession) -> MeResponse:
    operator = operator_for(user, db)
    booth = operator.assigned_booth if operator else None
    return MeResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        display_name=operator.name if operator else user.username,
        assigned_booth_id=booth.id if booth else None,
        assigned_booth_code=booth.booth_code if booth else None,
        assigned_booth_name=booth.name if booth else None,
    )
