"""WebSocket connection management — §15.1 topology.

Command and event names are the spec's, verbatim, so this wire protocol transfers
unchanged to the real build.

Two channels, kept strictly separate:

  * Booth sockets at `/ws/booth` — one per connected kiosk tab, addressed by booth_id.
  * Client sockets at `/ws/client` — operator and admin dashboards. They subscribe to a
    booth's events (operator) or broadcast (admin) by messaging a subscriptions channel.

Nothing routes directly between a booth and a dashboard; every message passes through
the backend, as §15.1 requires.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from enum import StrEnum

from fastapi import WebSocket


class Command(StrEnum):
    """§15.3 — backend → booth."""

    START_SESSION = "START_SESSION"
    PAUSE_SESSION = "PAUSE_SESSION"
    RESUME_SESSION = "RESUME_SESSION"
    ADD_TIME = "ADD_TIME"
    CANCEL_SESSION = "CANCEL_SESSION"
    RESTART_SESSION = "RESTART_SESSION"
    REPRINT = "REPRINT"
    LOCK_BOOTH = "LOCK_BOOTH"
    UNLOCK_BOOTH = "UNLOCK_BOOTH"
    SYNC_TEMPLATES = "SYNC_TEMPLATES"
    SYNC_LUTS = "SYNC_LUTS"


class Event(StrEnum):
    """§15.4 — booth → backend, then fanned out to subscribed clients."""

    BOOTH_ONLINE = "BOOTH_ONLINE"
    BOOTH_OFFLINE = "BOOTH_OFFLINE"
    CAMERA_CONNECTED = "CAMERA_CONNECTED"
    CAMERA_DISCONNECTED = "CAMERA_DISCONNECTED"
    PRINTER_READY = "PRINTER_READY"
    PRINTER_ERROR = "PRINTER_ERROR"
    SESSION_STARTED = "SESSION_STARTED"
    SESSION_PAUSED = "SESSION_PAUSED"
    SESSION_RESUMED = "SESSION_RESUMED"
    SESSION_COMPLETED = "SESSION_COMPLETED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    PHOTO_CAPTURED = "PHOTO_CAPTURED"
    PRINT_STARTED = "PRINT_STARTED"
    PRINT_COMPLETED = "PRINT_COMPLETED"
    PRINT_FAILED = "PRINT_FAILED"
    SYNC_COMPLETED = "SYNC_COMPLETED"
    HEARTBEAT = "HEARTBEAT"


@dataclass
class ClientSubscriptions:
    """What a dashboard socket wants to hear.

    An operator socket subscribes to its one assigned booth; an admin socket subscribes
    to every booth. `all_booths` is the admin path, `booth_ids` the operator path.
    """

    booth_ids: set[str] = field(default_factory=set)
    all_booths: bool = False
    user_id: str | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self._booths: dict[str, WebSocket] = {}          # booth_id → socket
        self._clients: dict[WebSocket, ClientSubscriptions] = {}
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------ booth channel

    async def register_booth(self, booth_id: str, ws: WebSocket) -> None:
        async with self._lock:
            old = self._booths.get(booth_id)
            if old is not None and old is not ws:
                # A second kiosk tab for the same booth — replace, then close the old
                # socket so it cannot keep the booth "online" after its tab is gone.
                await old.close(code=4001)
            self._booths[booth_id] = ws

    async def unregister_booth(self, booth_id: str, ws: WebSocket) -> None:
        async with self._lock:
            if self._booths.get(booth_id) is ws:
                del self._booths[booth_id]

    @property
    def connected_booth_ids(self) -> set[str]:
        return set(self._booths)

    # ----------------------------------------------------------- client channel

    async def register_client(self, ws: WebSocket, subs: ClientSubscriptions) -> None:
        async with self._lock:
            self._clients[ws] = subs

    async def unregister_client(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.pop(ws, None)

    # ---------------------------------------------------------------- dispatch

    async def send_to_booth(self, booth_id: str, command: Command, payload: dict) -> None:
        """Push a §15.3 command to a booth. Returns nothing; if the booth is offline
        the caller must decide (the demo surfaces a 409 rather than queueing §18)."""
        ws = self._booths.get(booth_id)
        if ws is None:
            raise ConnectionError(f"Booth {booth_id} is not connected")
        await self._send(ws, {"type": "command", "command": command, "payload": payload})

    async def broadcast_event(
        self,
        event: Event,
        payload: dict,
        *,
        booth_id: str | None = None,
        exclude: WebSocket | None = None,
    ) -> None:
        """Fan a §15.4 event out to dashboard sockets that subscribed to the booth."""
        message = {"type": "event", "event": event, "payload": payload}
        async with self._lock:
            targets = list(self._clients.items())
        for ws, subs in targets:
            if ws is exclude:
                continue
            if subs.all_booths or (booth_id is not None and booth_id in subs.booth_ids):
                await self._send(ws, message)

    @staticmethod
    async def _send(ws: WebSocket, message: dict) -> None:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            # The socket is gone; the owner's receive loop will notice and unregister.
            pass


manager = ConnectionManager()
