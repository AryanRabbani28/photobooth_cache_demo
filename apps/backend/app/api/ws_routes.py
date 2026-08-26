"""WebSocket endpoints — the two §15.1 channels.

Tokens arrive as a query parameter because the browser's WebSocket constructor cannot
set headers. The socket is accepted first, then authenticated, so an auth failure can be
reported as a close code the client can actually read instead of a bare handshake reject.

Close codes:
  4001  replaced by a newer kiosk tab for the same booth
  4003  authentication failed
"""

from __future__ import annotations

import asyncio
import contextlib
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Booth, Operator, User, utcnow
from app.security import decode_token
from app.ws import ClientSubscriptions, Event, manager

router = APIRouter()


@router.websocket("/ws/booth")
async def booth_socket(websocket: WebSocket, token: str) -> None:
    """A kiosk's socket. Its lifetime *is* the booth's online status.

    While this socket is open the booth is online; when it closes the booth is offline,
    with no column to fall out of date. That is what keeps the dashboards honest.
    """
    await websocket.accept()
    try:
        claims = decode_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid token")
        return
    if claims.get("role") != "BOOTH_DEVICE":
        await websocket.close(code=4003, reason="Device token required")
        return

    booth_id = claims["sub"]
    with SessionLocal() as db:
        booth = db.get(Booth, booth_id)
        if booth is None:
            await websocket.close(code=4003, reason="Booth not found")
            return
        booth_code = booth.booth_code
        booth.status = "ONLINE"
        booth.last_seen = utcnow()
        db.commit()

    await manager.register_booth(booth_id, websocket)
    await manager.broadcast_event(
        Event.BOOTH_ONLINE, {"booth_id": booth_id, "booth_code": booth_code}, booth_id=booth_id
    )

    try:
        while True:
            raw = await websocket.receive_text()
            await _handle_booth_message(booth_id, booth_code, raw)
    except WebSocketDisconnect:
        pass
    except Exception:
        with contextlib.suppress(Exception):
            await websocket.close()
    finally:
        await manager.unregister_booth(booth_id, websocket)
        with SessionLocal() as db:
            booth = db.get(Booth, booth_id)
            if booth is not None and booth.status != "MAINTENANCE":
                booth.status = "OFFLINE"
                db.commit()
        await manager.broadcast_event(
            Event.BOOTH_OFFLINE,
            {"booth_id": booth_id, "booth_code": booth_code},
            booth_id=booth_id,
        )


async def _handle_booth_message(booth_id: str, booth_code: str, raw: str) -> None:
    """Relay a §15.4 event from the kiosk to the dashboards.

    State changes are *not* applied here — those go through the REST endpoints so a
    single code path validates §13.2. This channel carries notifications only, which is
    why an unknown event is dropped rather than erroring.
    """
    try:
        message = json.loads(raw)
    except json.JSONDecodeError:
        return

    event_name = message.get("event")
    if event_name is None:
        return
    try:
        event = Event(event_name)
    except ValueError:
        return

    payload = {"booth_id": booth_id, "booth_code": booth_code, **(message.get("payload") or {})}

    if event in (Event.CAMERA_CONNECTED, Event.CAMERA_DISCONNECTED):
        # §23.1 — record camera state so the operator sees a disconnect immediately
        # rather than at the next 30s heartbeat.
        with SessionLocal() as db:
            booth = db.get(Booth, booth_id)
            if booth is not None and booth.device_status is not None:
                booth.device_status.camera_status = (
                    "CONNECTED" if event == Event.CAMERA_CONNECTED else "DISCONNECTED"
                )
                booth.device_status.camera_model = payload.get("camera_model")
                db.commit()

    await manager.broadcast_event(event, payload, booth_id=booth_id)


@router.websocket("/ws/client")
async def client_socket(websocket: WebSocket, token: str) -> None:
    """An operator or admin dashboard socket.

    Subscription scope is derived from the token, not requested by the client: an
    operator gets their assigned booth and an admin gets all booths, so a client cannot
    subscribe its way into another booth's events (§25.2).
    """
    await websocket.accept()
    try:
        claims = decode_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid token")
        return
    if claims.get("role") not in ("ADMIN", "OPERATOR"):
        await websocket.close(code=4003, reason="User token required")
        return

    user_id = claims["sub"]
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if user is None or not user.is_active:
            await websocket.close(code=4003, reason="User not found")
            return
        if user.role == "ADMIN":
            subs = ClientSubscriptions(all_booths=True, user_id=user_id)
        else:
            operator = db.scalars(select(Operator).where(Operator.user_id == user_id)).first()
            assigned = {operator.assigned_booth_id} if operator and operator.assigned_booth_id else set()
            subs = ClientSubscriptions(booth_ids=assigned, user_id=user_id)  # type: ignore[arg-type]

    await manager.register_client(websocket, subs)
    # Tell the dashboard which booths are live right now, so it renders correct status
    # on connect instead of waiting for the next event.
    with contextlib.suppress(Exception):
        await websocket.send_text(
            json.dumps(
                {
                    "type": "hello",
                    "payload": {
                        "online_booth_ids": sorted(manager.connected_booth_ids),
                        "scope": "all" if subs.all_booths else sorted(subs.booth_ids),
                    },
                }
            )
        )

    try:
        while True:
            # Dashboards act over REST; this loop exists to keep the socket open and
            # answer pings.
            raw = await websocket.receive_text()
            with contextlib.suppress(json.JSONDecodeError):
                if json.loads(raw).get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        with contextlib.suppress(Exception):
            await websocket.close()
    finally:
        await manager.unregister_client(websocket)


async def sweep_stale_booths() -> None:
    """§15.5 — mark a booth offline when its heartbeats stop.

    A socket that dies without a close frame (laptop lid, network drop) leaves the
    connection registered, so time-since-last-heartbeat is the backstop that keeps a
    dead booth from reading ONLINE forever.
    """
    from app.config import settings

    while True:
        await asyncio.sleep(30)
        cutoff = utcnow().timestamp() - settings.heartbeat_timeout_seconds
        with contextlib.suppress(Exception):
            with SessionLocal() as db:
                for booth in db.scalars(select(Booth).where(Booth.status == "ONLINE")):
                    if booth.id in manager.connected_booth_ids:
                        continue
                    if booth.last_seen is None or booth.last_seen.timestamp() < cutoff:
                        booth.status = "OFFLINE"
                db.commit()
