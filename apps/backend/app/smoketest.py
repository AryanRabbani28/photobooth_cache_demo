"""End-to-end smoke test of the demo backend.

Runs the plan's verification list against the real app: the §4.1 operator-starts /
kiosk-unlocks handoff, the full happy path through to a COMPLETED print, and the
negative cases that matter (illegal transition → 409, cross-booth command → 403,
print failure → §23.2 recovery).

    python -m app.smoketest

Uses a throwaway database, so it never touches demo.db.
"""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
from pathlib import Path

# Redirect storage and database before app modules read settings.
_tmp = Path(tempfile.mkdtemp(prefix="pb_smoke_"))
os.environ["PB_DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["PB_STORAGE_DIR"] = str(_tmp / "storage")
os.environ["PB_PRINT_DURATION_SECONDS"] = "0.05"  # keep the run brisk

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

# The Windows console defaults to cp1252, which cannot encode the section and arrow
# characters used in the labels below.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PASS, FAIL = "  [ok]", "  [FAIL]"
_failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"{PASS} {label}")
    else:
        print(f"{FAIL} {label}  {detail}")
        _failures.append(label)


def jpeg(width: int = 640, height: int = 480, colour: tuple = (90, 140, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), colour).save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def main() -> int:
    from app.db import SessionLocal, init_db
    from app.main import app
    from app.seed import _seed_config
    from app.storage import ensure_tree

    ensure_tree()
    init_db()
    with SessionLocal() as db:
        _seed_config(db)
        db.commit()

    client = TestClient(app)

    print("\n--- auth ---")
    r = client.post("/api/v1/auth/login", json={"username": "rahim", "password": "rahim123"})
    check("operator login", r.status_code == 200, r.text)
    op = r.json()
    op_h = {"Authorization": f"Bearer {op['access_token']}"}
    booth_id = op["booth_id"]
    check("token carries assigned booth", op["booth_code"] == "BC-01", str(op))

    r = client.post("/api/v1/auth/login", json={"username": "rahim", "password": "wrong"})
    check("bad password rejected", r.status_code == 401, r.text)

    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    admin_h = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.post(
        "/api/v1/auth/device-login",
        json={"device_id": "DEVICE_9832", "device_secret": "sk_booth_bc01_demo"},
    )
    check("booth device login (§20.3)", r.status_code == 200, r.text)
    dev = r.json()
    dev_h = {"Authorization": f"Bearer {dev['access_token']}"}
    dev_token = dev["access_token"]

    r = client.post(
        "/api/v1/auth/device-login",
        json={"device_id": "DEVICE_9832", "device_secret": "nope"},
    )
    check("bad device secret rejected", r.status_code == 401, r.text)

    print("\n--- booth offline before any kiosk connects ---")
    r = client.get("/api/v1/booths", headers=admin_h)
    booths = r.json()
    check("admin sees both booths", len(booths) == 2, str(len(booths)))
    check(
        "booth reads OFFLINE with no kiosk",
        all(b["status"] == "OFFLINE" for b in booths),
        str([b["status"] for b in booths]),
    )

    r = client.get("/api/v1/booths", headers=op_h)
    check("operator sees only their booth (§25.2)", len(r.json()) == 1, str(r.json()))

    pkgs = client.get("/api/v1/packages", headers=op_h).json()
    standard = next(p for p in pkgs if p["name"] == "Standard")
    check("packages seeded", len(pkgs) == 3, str(len(pkgs)))

    # Starting a session with no kiosk connected must fail, not silently create one.
    r = client.post(
        "/api/v1/sessions",
        headers=op_h,
        json={"booth_id": booth_id, "package_id": standard["id"]},
    )
    check("cannot start session on offline booth", r.status_code == 409, r.text)

    print("\n--- kiosk connects (§4.1 handoff) ---")
    with client.websocket_connect(f"/ws/booth?token={dev_token}") as kiosk:
        r = client.get("/api/v1/booths", headers=op_h)
        check("booth now reads ONLINE", r.json()[0]["status"] == "ONLINE", r.text)

        r = client.post(
            "/api/v1/sessions",
            headers=op_h,
            json={
                "booth_id": booth_id,
                "package_id": standard["id"],
                "customer_name": "Demo Customer",
            },
        )
        check("operator starts session", r.status_code == 201, r.text)
        session = r.json()
        sid = session["id"]
        check("session is READY for the kiosk", session["status"] == "READY", session["status"])

        # The kiosk unlocks because a command arrived — no interaction at the kiosk.
        msg = kiosk.receive_json()
        check(
            "kiosk received START_SESSION (§15.3)",
            msg.get("command") == "START_SESSION" and msg["payload"]["session_id"] == sid,
            json.dumps(msg),
        )

        r = client.get("/api/v1/booths", headers=op_h)
        check("booth reads BUSY during session", r.json()[0]["status"] == "BUSY", r.text)

        r = client.post(
            "/api/v1/sessions",
            headers=op_h,
            json={"booth_id": booth_id, "package_id": standard["id"]},
        )
        check("second concurrent session refused", r.status_code == 409, r.text)

        print("\n--- kiosk rehydration (§23.3) ---")
        r = client.get("/api/v1/booth/me/session", headers=dev_h)
        check("reloaded kiosk finds its session", r.json() and r.json()["id"] == sid, r.text)

        print("\n--- template + timer ---")
        templates = client.get(
            "/api/v1/templates", headers=dev_h, params={"max_slots": standard["max_photos"]}
        ).json()
        check("templates filtered to package capacity", len(templates) >= 1, str(len(templates)))
        strip = next(t for t in templates if t["name"] == "Classic Strip")

        # A 6-slot template on a 4-photo package must be refused.
        all_templates = client.get("/api/v1/templates", headers=dev_h).json()
        grid = next((t for t in all_templates if t["number_of_slots"] > standard["max_photos"]), None)
        if grid:
            r = client.post(
                f"/api/v1/sessions/{sid}/select-template",
                headers=dev_h,
                json={"template_id": grid["id"]},
            )
            check("oversized template refused", r.status_code == 400, r.text)

        r = client.post(
            f"/api/v1/sessions/{sid}/select-template",
            headers=dev_h,
            json={"template_id": strip["id"]},
        )
        check("template selected", r.json()["status"] == "TEMPLATE_SELECTED", r.text)
        check("photo count from template slots (§12.4)",
              r.json()["total_photos"] == strip["number_of_slots"], r.text)

        # The timer must not have started yet — that is the §4.2 step 6 point.
        check("timer not started at session creation", r.json()["started_at"] is None, r.text)

        r = client.post(f"/api/v1/sessions/{sid}/begin", headers=dev_h)
        check("BEGIN starts the timer (§4.2 step 6)",
              r.json()["status"] == "ACTIVE" and r.json()["started_at"] is not None, r.text)

        print("\n--- illegal transitions rejected ---")
        r = client.post(f"/api/v1/sessions/{sid}/photos-complete", headers=dev_h)
        # ACTIVE → PHOTO_COMPLETE is legal, so undo it by checking the reverse instead.
        check("ACTIVE → PHOTO_COMPLETE allowed", r.status_code == 200, r.text)
        r = client.post(f"/api/v1/sessions/{sid}/begin", headers=dev_h)
        check("PHOTO_COMPLETE → ACTIVE refused with 409", r.status_code == 409, r.text)

        # Put it back to ACTIVE the legitimate way, via the retake path, after a capture.
        print("\n--- capture ---")
        # First return to ACTIVE: PHOTO_COMPLETE → FINAL_PREVIEW → (retake) → ACTIVE needs
        # a photo, so upload while ACTIVE. Restart to get a clean ACTIVE state.
        r = client.post(f"/api/v1/sessions/{sid}/restart", headers=op_h)
        check("operator restart rewinds to READY", r.json()["status"] == "READY", r.text)
        kiosk.receive_json()  # RESTART_SESSION
        client.post(
            f"/api/v1/sessions/{sid}/select-template",
            headers=dev_h,
            json={"template_id": strip["id"]},
        )
        client.post(f"/api/v1/sessions/{sid}/begin", headers=dev_h)

        slots = strip["number_of_slots"]
        for i in range(slots):
            r = client.post(
                f"/api/v1/sessions/{sid}/photos",
                headers=dev_h,
                data={"slot_index": str(i), "filter_name": "Vintage"},
                files={
                    "original": (f"o{i}.jpg", jpeg(colour=(60 + i * 40, 120, 200)), "image/jpeg"),
                    "processed": (f"p{i}.jpg", jpeg(colour=(80 + i * 40, 130, 190)), "image/jpeg"),
                },
            )
            if r.status_code != 201:
                check(f"upload slot {i}", False, r.text)
                break
        else:
            check(f"uploaded {slots} photos", True)

        r = client.get(f"/api/v1/sessions/{sid}", headers=op_h)
        check("operator sees live photo count", r.json()["photos_captured"] == slots, r.text)

        r = client.post(
            f"/api/v1/sessions/{sid}/photos",
            headers=dev_h,
            data={"slot_index": "0"},
            files={"original": ("dup.jpg", jpeg(), "image/jpeg")},
        )
        check("duplicate slot refused", r.status_code == 409, r.text)

        print("\n--- pause / add time ---")
        r = client.post(f"/api/v1/sessions/{sid}/pause", headers=op_h)
        check("operator pauses", r.json()["status"] == "PAUSED", r.text)
        check("kiosk got PAUSE_SESSION", kiosk.receive_json()["command"] == "PAUSE_SESSION")

        before = r.json()["remaining_time"]
        r = client.post(f"/api/v1/sessions/{sid}/add-time", headers=op_h, json={"seconds": 60})
        check("add time while paused", r.json()["remaining_time"] == before + 60, r.text)
        check("kiosk got ADD_TIME", kiosk.receive_json()["command"] == "ADD_TIME")

        r = client.post(f"/api/v1/sessions/{sid}/resume", headers=op_h)
        check("operator resumes", r.json()["status"] == "ACTIVE", r.text)
        check("kiosk got RESUME_SESSION", kiosk.receive_json()["command"] == "RESUME_SESSION")

        print("\n--- retake (§13.2 FINAL_PREVIEW → ACTIVE) ---")
        client.post(f"/api/v1/sessions/{sid}/photos-complete", headers=dev_h)
        r = client.post(
            f"/api/v1/sessions/{sid}/final",
            headers=dev_h,
            files={"image": ("final.jpg", jpeg(1200, 1800), "image/jpeg")},
        )
        check("final composite uploaded", r.status_code == 201, r.text)
        r = client.get(f"/api/v1/sessions/{sid}", headers=op_h)
        check("session at FINAL_PREVIEW", r.json()["status"] == "FINAL_PREVIEW", r.text)

        r = client.post(f"/api/v1/sessions/{sid}/retake", headers=dev_h, json={"slot_index": 1})
        check("retake returns to ACTIVE", r.json()["status"] == "ACTIVE", r.text)
        check("retake frees the slot", r.json()["photos_captured"] == slots - 1, r.text)
        check("retake counted", r.json()["retakes_used"] == 1, r.text)

        client.post(
            f"/api/v1/sessions/{sid}/photos",
            headers=dev_h,
            data={"slot_index": "1", "filter_name": "B&W"},
            files={"original": ("r1.jpg", jpeg(colour=(200, 200, 200)), "image/jpeg")},
        )
        client.post(f"/api/v1/sessions/{sid}/photos-complete", headers=dev_h)
        client.post(
            f"/api/v1/sessions/{sid}/final",
            headers=dev_h,
            files={"image": ("final2.jpg", jpeg(1200, 1800), "image/jpeg")},
        )

        print("\n--- print failure then recovery (§23.2) ---")
        r = client.post("/api/v1/printer/fail-next", headers=admin_h, params={"armed": True})
        check("failure armed (admin only)", r.json()["failure_armed"] is True, r.text)
        r = client.post("/api/v1/printer/fail-next", headers=op_h, params={"armed": True})
        check("operator cannot arm failure", r.status_code == 403, r.text)

        r = client.post(f"/api/v1/sessions/{sid}/print", headers=dev_h, json={})
        check("print job FAILED as injected", r.json()["status"] == "FAILED", r.text)
        r = client.get(f"/api/v1/sessions/{sid}", headers=op_h)
        check("session at PRINT_FAILED", r.json()["status"] == "PRINT_FAILED", r.text)

        r = client.post(f"/api/v1/sessions/{sid}/reprint", headers=op_h, json={"copies": 1})
        check("retry succeeds", r.json()["status"] == "COMPLETED", r.text)
        r = client.get(f"/api/v1/sessions/{sid}", headers=op_h)
        check("session COMPLETED after recovery", r.json()["status"] == "COMPLETED", r.text)
        check("ended_at recorded", r.json()["ended_at"] is not None, r.text)

        print("\n--- cross-booth authorisation (§25.2) ---")
        cp = client.post(
            "/api/v1/auth/login", json={"username": "karim", "password": "karim123"}
        ).json()
        cp_h = {"Authorization": f"Bearer {cp['access_token']}"}
        r = client.get(f"/api/v1/sessions/{sid}", headers=cp_h)
        check("other operator cannot read this session", r.status_code == 403, r.text)
        r = client.post(f"/api/v1/sessions/{sid}/cancel", headers=cp_h)
        check("other operator cannot cancel it", r.status_code == 403, r.text)
        r = client.post(
            "/api/v1/sessions",
            headers=cp_h,
            json={"booth_id": booth_id, "package_id": standard["id"]},
        )
        check("other operator cannot start on this booth", r.status_code == 403, r.text)

        print("\n--- heartbeat (§15.5) ---")
        r = client.post(
            "/api/v1/booth/heartbeat",
            headers=dev_h,
            json={
                "camera_status": "CONNECTED",
                "camera_model": "Webcam (demo)",
                "printer_status": "READY",
                "app_version": "0.1.0",
            },
        )
        check("heartbeat accepted", r.status_code == 200, r.text)
        ds = r.json()["device_status"]
        check("device status recorded", ds["camera_status"] == "CONNECTED", str(ds))
        check("real disk space measured", ds["disk_free_mb"] > 0, str(ds))

        print("\n--- media serving ---")
        photos = client.get(f"/api/v1/sessions/{sid}/photos", headers=op_h).json()
        check("photo rows persisted", len(photos) == slots, str(len(photos)))
        path = photos[0]["original_file_path"]
        r = client.get(f"/api/v1/media/{path}")
        check("media requires a token", r.status_code == 401, str(r.status_code))
        r = client.get(f"/api/v1/media/{path}", params={"token": op["access_token"]})
        check("media served with token", r.status_code == 200 and r.content[:2] == b"\xff\xd8",
              str(r.status_code))
        r = client.get(
            "/api/v1/media/../../../../etc/passwd", params={"token": op["access_token"]}
        )
        check("traversal blocked", r.status_code in (400, 404), str(r.status_code))

        print("\n--- files on disk (§17.2) ---")
        from app.config import settings as s
        originals = list((s.storage_dir / "photos/originals").rglob("*.jpg"))
        finals = list((s.storage_dir / "photos/final").rglob("*.jpg"))
        printed = list((s.storage_dir / "printed").rglob("*.jpg"))
        check(f"originals written ({len(originals)})", len(originals) == slots, str(originals[:2]))
        check(f"final written ({len(finals)})", len(finals) == 1, str(finals))
        check(f"printed tray written ({len(printed)})", len(printed) == 1, str(printed))

        print("\n--- analytics counts real rows ---")
        r = client.get("/api/v1/analytics/overview", headers=admin_h)
        stats = r.json()
        check("sessions_today counted", stats["sessions_today"] == 1, str(stats))
        check("photos_today counted", stats["photos_today"] == slots, str(stats))
        check("prints_today counted", stats["prints_today"] >= 1, str(stats))
        check("online booths from live sockets", stats["online_booths"] == 1, str(stats))
        check("errors_today logged the print failure", stats["errors_today"] >= 1, str(stats))
        check("popular filters tallied", len(stats["popular_filters"]) >= 1, str(stats))

    print("\n--- kiosk disconnected ---")
    r = client.get("/api/v1/booths", headers=op_h)
    check("booth back to OFFLINE after socket closes", r.json()[0]["status"] == "OFFLINE", r.text)

    r = client.get("/api/v1/analytics/overview", headers=admin_h)
    check("online_booths back to zero", r.json()["online_booths"] == 0, r.text)

    print()
    if _failures:
        print(f"FAILED: {len(_failures)} check(s)")
        for f in _failures:
            print(f"  - {f}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        import shutil

        shutil.rmtree(_tmp, ignore_errors=True)
