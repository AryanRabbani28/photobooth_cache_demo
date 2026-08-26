"""Filesystem storage using the §17.2 layout.

This module is the seam an S3/MinIO backend would replace: callers only ever receive
relative paths, never absolute ones, so swapping the implementation does not touch
the API layer or the database rows already written.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from app.config import settings
from app.models import utcnow

# §17.2 — photos/{originals,processed,final}, plus printed/ for MockPrinterAdapter output.
ORIGINALS = "photos/originals"
PROCESSED = "photos/processed"
FINAL = "photos/final"
PRINTED = "printed"
TEMPLATES = "templates"
THUMBNAILS = "templates/thumbnails"


def _date_parts(when: datetime | None = None) -> str:
    d = when or utcnow()
    return f"{d.year:04d}/{d.month:02d}/{d.day:02d}"


def ensure_tree() -> None:
    """Create the storage skeleton. Idempotent; called once at startup."""
    for sub in (ORIGINALS, PROCESSED, FINAL, PRINTED, TEMPLATES, THUMBNAILS):
        (settings.storage_dir / sub).mkdir(parents=True, exist_ok=True)


def absolute(relative_path: str) -> Path:
    """Resolve a stored relative path, refusing anything that escapes the root.

    Paths reach here from request bodies (e.g. reprint by final-output id), so a
    traversal guard belongs here rather than at each call site.
    """
    root = settings.storage_dir.resolve()
    candidate = (root / relative_path).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError(f"Path escapes storage root: {relative_path}")
    return candidate


def save_photo(data: bytes, session_id: str, slot_index: int, *, processed: bool) -> str:
    """Write one capture and return its path relative to the storage root."""
    bucket = PROCESSED if processed else ORIGINALS
    rel_dir = f"{bucket}/{_date_parts()}"
    (settings.storage_dir / rel_dir).mkdir(parents=True, exist_ok=True)
    rel_path = f"{rel_dir}/{session_id}_{slot_index:02d}.jpg"
    absolute(rel_path).write_bytes(data)
    return rel_path


def save_final(data: bytes, session_id: str) -> str:
    """Write the composited output (§12.3) and return its relative path."""
    rel_dir = f"{FINAL}/{_date_parts()}"
    (settings.storage_dir / rel_dir).mkdir(parents=True, exist_ok=True)
    rel_path = f"{rel_dir}/{session_id}_final.jpg"
    absolute(rel_path).write_bytes(data)
    return rel_path


def save_printed(source_rel_path: str, job_id: str) -> str:
    """MockPrinterAdapter's 'output tray' (§10.4): copy the final image to printed/."""
    rel_dir = f"{PRINTED}/{_date_parts()}"
    (settings.storage_dir / rel_dir).mkdir(parents=True, exist_ok=True)
    rel_path = f"{rel_dir}/{job_id}.jpg"
    absolute(rel_path).write_bytes(absolute(source_rel_path).read_bytes())
    return rel_path


def free_space_mb() -> int:
    """Real disk space for the §15.5 heartbeat, not an invented number."""
    import shutil

    return shutil.disk_usage(settings.storage_dir).free // (1024 * 1024)
