"""Application settings.

Demo-scoped: SQLite + local filesystem instead of the spec's PostgreSQL 16 + MinIO
(see the plan's "Decisions and deviations"). Both are single-value swaps here.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PB_", env_file=".env", extra="ignore")

    app_name: str = "Photobooth Management System (Demo)"
    api_prefix: str = "/api/v1"

    # SQLite lives beside the app so the demo is trivially resettable: delete the file.
    database_url: str = f"sqlite:///{(BACKEND_ROOT / 'demo.db').as_posix()}"

    # Root of the §17.2 storage tree.
    storage_dir: Path = BACKEND_ROOT / "storage"

    # Demo secret. A real deployment must inject this via environment.
    # At least 32 bytes so PyJWT does not warn about HMAC key length for SHA256.
    jwt_secret: str = "demo-secret-not-for-production-0123456789"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60 * 12  # generous so a demo never expires mid-run

    # §15.5 — booths missing this many seconds of heartbeats are considered OFFLINE.
    heartbeat_timeout_seconds: int = 90

    # §10.4 MockPrinterAdapter timing, and the failure switch used to demo §23.2.
    print_duration_seconds: float = 2.5
    printer_fail_next: bool = False

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
