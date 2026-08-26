"""Session state machine — the authority for §13.

Both surfaces mirror this table (the kiosk in `apps/web/src/lib/machine.ts`), but the
server is the only place that *enforces* it: every transition request is validated here
before anything is persisted or dispatched over WebSocket.
"""

from __future__ import annotations

from enum import StrEnum


class SessionStatus(StrEnum):
    """The 13 states from §13.1."""

    CREATED = "CREATED"
    READY = "READY"
    TEMPLATE_SELECTED = "TEMPLATE_SELECTED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    PHOTO_COMPLETE = "PHOTO_COMPLETE"
    FINAL_PREVIEW = "FINAL_PREVIEW"
    PRINTING = "PRINTING"
    PRINT_FAILED = "PRINT_FAILED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    ERROR = "ERROR"


#: States from which no further transition is possible (§13.1 "Terminal States").
TERMINAL: frozenset[SessionStatus] = frozenset(
    {
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
        SessionStatus.EXPIRED,
        SessionStatus.ERROR,
    }
)

#: §13.2, transcribed. Values are the states reachable from each key.
_TRANSITIONS: dict[SessionStatus, frozenset[SessionStatus]] = {
    SessionStatus.CREATED: frozenset({SessionStatus.READY}),
    SessionStatus.READY: frozenset({SessionStatus.TEMPLATE_SELECTED}),
    SessionStatus.TEMPLATE_SELECTED: frozenset({SessionStatus.ACTIVE}),
    SessionStatus.ACTIVE: frozenset(
        {SessionStatus.PAUSED, SessionStatus.PHOTO_COMPLETE, SessionStatus.EXPIRED}
    ),
    SessionStatus.PAUSED: frozenset({SessionStatus.ACTIVE}),
    SessionStatus.PHOTO_COMPLETE: frozenset({SessionStatus.FINAL_PREVIEW}),
    # FINAL_PREVIEW → ACTIVE is the retake path (§13.2 "Customer retakes a photo").
    SessionStatus.FINAL_PREVIEW: frozenset({SessionStatus.PRINTING, SessionStatus.ACTIVE}),
    SessionStatus.PRINTING: frozenset({SessionStatus.COMPLETED, SessionStatus.PRINT_FAILED}),
    SessionStatus.PRINT_FAILED: frozenset({SessionStatus.PRINTING}),
    # Terminal states intentionally have no outbound edges.
    SessionStatus.COMPLETED: frozenset(),
    SessionStatus.CANCELLED: frozenset(),
    SessionStatus.EXPIRED: frozenset(),
    SessionStatus.ERROR: frozenset(),
}

#: §13.2's two wildcard rows: "Any non-terminal → CANCELLED / ERROR".
_FROM_ANY_NON_TERMINAL: frozenset[SessionStatus] = frozenset(
    {SessionStatus.CANCELLED, SessionStatus.ERROR}
)

#: RESTART_SESSION (§15.3) rewinds a live session rather than ending it. Not in the
#: §13.2 table, which only covers forward progress, so it is modelled explicitly.
_RESTART_TARGET = SessionStatus.READY


class InvalidTransition(Exception):
    """Raised when a transition is not permitted by §13.2."""

    def __init__(self, current: SessionStatus, requested: SessionStatus) -> None:
        self.current = current
        self.requested = requested
        super().__init__(f"Cannot transition session from {current} to {requested}")


def is_terminal(status: SessionStatus) -> bool:
    return status in TERMINAL


def can_transition(current: SessionStatus, requested: SessionStatus) -> bool:
    if current in TERMINAL:
        return False
    if requested in _FROM_ANY_NON_TERMINAL:
        return True
    return requested in _TRANSITIONS[current]


def assert_transition(current: SessionStatus, requested: SessionStatus) -> None:
    """Raise `InvalidTransition` unless the move is legal. Call before persisting."""
    if not can_transition(current, requested):
        raise InvalidTransition(current, requested)


def can_restart(current: SessionStatus) -> bool:
    """RESTART_SESSION is legal from any live state (§4.4 'Restart Session')."""
    return current not in TERMINAL


def allowed_from(current: SessionStatus) -> set[SessionStatus]:
    """Every legal next state — used by the API to advertise available actions."""
    if current in TERMINAL:
        return set()
    return set(_TRANSITIONS[current]) | set(_FROM_ANY_NON_TERMINAL)
