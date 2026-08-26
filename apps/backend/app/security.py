"""Authentication: password hashing, JWT issue/verify, and FastAPI dependencies.

Two principal kinds share one token format, distinguished by the `role` claim (§20.2):
human users (ADMIN, OPERATOR) and booth devices (BOOTH_DEVICE, §20.3).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Booth, Operator, User

Role = Literal["ADMIN", "OPERATOR", "BOOTH_DEVICE"]

_bearer = HTTPBearer(auto_error=False)


# ----------------------------------------------------------------- passwords


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        # Malformed hash in the database — treat as a failed login, never a 500.
        return False


# --------------------------------------------------------------------- tokens


def create_token(subject: str, role: Role, **extra: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
        **extra,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc


# ---------------------------------------------------------------- dependencies


def _claims(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return decode_token(creds.credentials)


Claims = Annotated[dict, Depends(_claims)]
DbSession = Annotated[Session, Depends(get_db)]


def current_user(claims: Claims, db: DbSession) -> User:
    """The authenticated human. Rejects device tokens."""
    if claims.get("role") not in ("ADMIN", "OPERATOR"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "User token required")
    user = db.get(User, claims["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def require_admin(user: CurrentUser) -> User:
    if user.role != "ADMIN":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user


AdminUser = Annotated[User, Depends(require_admin)]


def current_booth(claims: Claims, db: DbSession) -> Booth:
    """The authenticated booth device (§20.3)."""
    if claims.get("role") != "BOOTH_DEVICE":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Device token required")
    booth = db.get(Booth, claims["sub"])
    if booth is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Booth not found")
    return booth


CurrentBooth = Annotated[Booth, Depends(current_booth)]


def operator_for(user: User, db: Session) -> Operator | None:
    return db.scalars(select(Operator).where(Operator.user_id == user.id)).first()


def assert_can_command_booth(user: User, booth_id: str, db: Session) -> None:
    """§25.2 — an operator may only act on the booth they are assigned to.

    Enforced server-side because hiding the button is not access control.
    """
    if user.role == "ADMIN":
        return
    operator = operator_for(user, db)
    if operator is None or operator.assigned_booth_id != booth_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not assigned to this booth")
