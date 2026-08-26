"""MockPrinterAdapter — the spec's own §10.4 stand-in for a dye-sub printer.

What is mocked is narrow and explicit: the hardware. Everything around it is real —
the `print_jobs` row moves QUEUED → PRINTING → COMPLETED|FAILED through the §10.3
states, the composited JPEG is written to `storage/printed/` as the "output tray", and
the §15.4 print events reach the dashboards over the same socket a real adapter would
use. Swapping in a CUPS or DNP adapter replaces this file and nothing else.

`settings.printer_fail_next` injects a failure so §23.2 print recovery can be
demonstrated rather than described. It is a one-shot: consumed by the next job, so the
retry that follows succeeds and the operator sees the whole recovery arc.
"""

from __future__ import annotations

import asyncio

from sqlalchemy.orm import Session

from app.config import settings
from app.models import PrintJob, utcnow
from app.storage import save_printed
from app.ws import Event, manager


class PrinterError(RuntimeError):
    """Raised for a simulated hardware fault; recorded on the job row."""


_fail_next = False


def arm_failure(value: bool) -> bool:
    """Arm or clear the one-shot failure injection. Returns the new state."""
    global _fail_next
    _fail_next = value
    return _fail_next


def failure_armed() -> bool:
    return _fail_next or settings.printer_fail_next


def _consume_failure() -> bool:
    global _fail_next
    if _fail_next:
        _fail_next = False
        return True
    return settings.printer_fail_next


async def run_print_job(db: Session, job: PrintJob, source_rel_path: str, booth_id: str) -> PrintJob:
    """Drive one job through §10.3. Commits at each state change so a dashboard
    polling mid-print sees PRINTING rather than jumping QUEUED → COMPLETED."""
    job.status = "PRINTING"
    db.commit()
    await manager.broadcast_event(
        Event.PRINT_STARTED,
        {"job_id": job.id, "session_id": job.session_id, "copies": job.copies},
        booth_id=booth_id,
    )

    # Stands in for the ~8s a real 4x6 dye-sub takes; short enough not to stall a demo.
    await asyncio.sleep(settings.print_duration_seconds)

    try:
        if _consume_failure():
            raise PrinterError("Printer reported: media jam (injected failure)")
        printed_path = save_printed(source_rel_path, job.id)
    except (PrinterError, OSError) as exc:
        job.status = "FAILED"
        job.error_message = str(exc)
        db.commit()
        await manager.broadcast_event(
            Event.PRINT_FAILED,
            {"job_id": job.id, "session_id": job.session_id, "error": str(exc)},
            booth_id=booth_id,
        )
        return job

    job.status = "COMPLETED"
    job.completed_at = utcnow()
    db.commit()
    await manager.broadcast_event(
        Event.PRINT_COMPLETED,
        {
            "job_id": job.id,
            "session_id": job.session_id,
            "copies": job.copies,
            "printed_path": printed_path,
        },
        booth_id=booth_id,
    )
    return job
