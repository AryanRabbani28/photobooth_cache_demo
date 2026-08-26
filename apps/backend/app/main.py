"""FastAPI application entry point.

    uvicorn app.main:app --reload --port 8000

Startup creates the schema, seeds configuration if the database is empty, and builds the
§17.2 storage tree — so a fresh clone runs with no setup step. It also resets every booth
to OFFLINE: booth status reflects live sockets, and a status left over from the last run
would be a lie until the sweeper caught it.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, update

from app.api import analytics, auth, booths, config_routes, photos, sessions, ws_routes
from app.config import settings
from app.db import SessionLocal, init_db
from app.models import Booth, User
from app.storage import ensure_tree


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    ensure_tree()
    init_db()

    with SessionLocal() as db:
        if db.scalars(select(User).limit(1)).first() is None:
            from app.seed import _seed_config

            _seed_config(db)
            db.commit()
            print("Empty database — seeded demo configuration (admin/admin123).")
        # No kiosk can be connected before the server accepts its first socket.
        db.execute(update(Booth).values(status="OFFLINE"))
        db.commit()

    sweeper = asyncio.create_task(ws_routes.sweep_stale_booths())
    try:
        yield
    finally:
        sweeper.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await sweeper


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    summary="Demo backend for the Photobooth Management System specification.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, booths, config_routes, sessions, photos, analytics):
    app.include_router(module.router, prefix=settings.api_prefix)

app.include_router(ws_routes.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    from app.ws import manager

    return {
        "status": "ok",
        "connected_booths": sorted(manager.connected_booth_ids),
        "storage": str(settings.storage_dir),
    }
