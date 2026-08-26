"""Seed the demo database.

Seeds *configuration only* — booths, packages, templates, LUTs, users. No fake sessions,
booths that pretend to be online, or invented statistics: per the agreed scope, everything
the dashboards show is real. Booths read OFFLINE until a kiosk tab actually connects.

    python -m app.seed                     # idempotent: safe to re-run
    python -m app.seed --reset             # drop and rebuild
    python -m app.seed --demo-history      # opt-in backfill for presenting

Template geometry below is real: slot positions tile their canvas with even gutters at
300 DPI, so the composited output is correctly proportioned for the print size.
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import timedelta

from sqlalchemy import delete, select

from app.db import Base, SessionLocal, engine, init_db
from app.models import (
    Booth,
    BoothSession,
    DeviceStatus,
    FinalOutput,
    Location,
    Lut,
    Operator,
    Package,
    Photo,
    PrintJob,
    SystemLog,
    Template,
    User,
    utcnow,
)
from app.security import hash_password
from app.state_machine import SessionStatus
from app.storage import ensure_tree

# Demo credentials — printed on the login screen. Not suitable for deployment.
ADMIN_CREDS = ("admin", "admin123")
OPERATOR_CREDS = [
    ("rahim", "rahim123", "Rahim Uddin", "BC-01"),
    ("karim", "karim123", "Karim Hossain", "CP-01"),
]
DEVICE_SECRETS = {"DEVICE_9832": "sk_booth_bc01_demo", "DEVICE_4521": "sk_booth_cp01_demo"}


def _strip_template(name: str, category: str, slots: int, *, accent: str) -> dict:
    """A vertical photo strip: 4x6in at 300dpi = 1200x1800, the classic booth format."""
    width, height = 1200, 1800
    margin, gutter = 48, 24
    footer = 140
    slot_w = width - margin * 2
    total_gutter = gutter * (slots - 1)
    slot_h = (height - margin * 2 - footer - total_gutter) // slots
    return {
        "template_id": name.lower().replace(" ", "_"),
        "name": name,
        "version": 1,
        "is_active": True,
        "canvas": {
            "width": width,
            "height": height,
            "background_color": "#FFFFFF",
            "accent_color": accent,
            "dpi": 300,
        },
        "slots": [
            {
                "index": i,
                "x": margin,
                "y": margin + i * (slot_h + gutter),
                "width": slot_w,
                "height": slot_h,
                "rotation": 0,
                "border": {"width": 3, "color": accent, "radius": 8},
                "crop_mode": "cover",
            }
            for i in range(slots)
        ],
        "decorations": [
            {
                "type": "text",
                "content": "XYZ PHOTOBOOTH",
                "x": width // 2,
                "y": height - footer + 52,
                "font_size": 40,
                "font_family": "Georgia, serif",
                "color": accent,
                "alignment": "center",
                "letter_spacing": 6,
            },
            {
                "type": "text",
                "content": "{{date}}",
                "x": width // 2,
                "y": height - footer + 100,
                "font_size": 26,
                "font_family": "Georgia, serif",
                "color": "#8A8A8A",
                "alignment": "center",
            },
        ],
        "metadata": {"category": category, "tags": ["strip", "vertical", f"{slots}-photo"]},
    }


def _grid_template(name: str, category: str, cols: int, rows: int, *, accent: str) -> dict:
    """A grid layout: 6x4in landscape at 300dpi."""
    width, height = 1800, 1200
    margin, gutter = 56, 28
    footer = 120
    slot_w = (width - margin * 2 - gutter * (cols - 1)) // cols
    slot_h = (height - margin * 2 - footer - gutter * (rows - 1)) // rows
    slots = []
    for r in range(rows):
        for c in range(cols):
            slots.append(
                {
                    "index": r * cols + c,
                    "x": margin + c * (slot_w + gutter),
                    "y": margin + r * (slot_h + gutter),
                    "width": slot_w,
                    "height": slot_h,
                    "rotation": 0,
                    "border": {"width": 3, "color": accent, "radius": 8},
                    "crop_mode": "cover",
                }
            )
    return {
        "template_id": name.lower().replace(" ", "_"),
        "name": name,
        "version": 1,
        "is_active": True,
        "canvas": {
            "width": width,
            "height": height,
            "background_color": "#FFFFFF",
            "accent_color": accent,
            "dpi": 300,
        },
        "slots": slots,
        "decorations": [
            {
                "type": "text",
                "content": "XYZ PHOTOBOOTH",
                "x": width // 2,
                "y": height - footer + 58,
                "font_size": 38,
                "font_family": "Georgia, serif",
                "color": accent,
                "alignment": "center",
                "letter_spacing": 6,
            },
        ],
        "metadata": {"category": category, "tags": ["grid", "landscape", f"{cols * rows}-photo"]},
    }


TEMPLATES = [
    _strip_template("Classic Strip", "classic", 4, accent="#1F2937"),
    _strip_template("Couple", "couple", 2, accent="#9D174D"),
    _grid_template("Friends Grid", "friends", 3, 2, accent="#0F766E"),
    _strip_template("Birthday", "celebration", 3, accent="#B45309"),
]

# §11.1 filters. Applied as canvas/CSS operations; `file_path` records the .cube a real
# build would load in their place.
LUTS = [
    ("Normal", "No processing — the original capture", "none", "luts/normal/normal.cube"),
    ("Black & White", "Grayscale conversion", "grayscale(1)", "luts/bw/bw.cube"),
    (
        "Vintage",
        "Warm, faded colours",
        "sepia(0.45) contrast(1.08) saturate(1.15) brightness(1.03)",
        "luts/vintage/vintage_v2.cube",
    ),
    ("Warm", "Orange/yellow tone shift", "saturate(1.25) hue-rotate(-12deg) brightness(1.05)",
     "luts/warm/warm.cube"),
    ("Cool", "Blue/cyan tone shift", "saturate(1.1) hue-rotate(14deg) brightness(1.02)",
     "luts/cool/cool.cube"),
    ("Film", "Analog film look", "contrast(1.15) saturate(0.9) sepia(0.15)", "luts/film/film.cube"),
]

PACKAGES = [
    # (name, seconds, photos, retakes, prints, price, expiry_behavior, grace)
    ("Standard", 180, 4, 2, 2, 350.00, "AUTO_COMPLETE", 0),
    ("Premium", 300, 6, -1, 4, 600.00, "GRACE_PERIOD", 30),
    ("Quick Shot", 90, 2, 1, 1, 200.00, "AUTO_COMPLETE", 0),
]

LOCATIONS = [
    ("Bashundhara City", "Panthapath", "Dhaka", [("Booth 01", "BC-01", "DEVICE_9832")]),
    ("Centre Point", "Uttara", "Dhaka", [("Booth 01", "CP-01", "DEVICE_4521")]),
]


def seed(reset: bool = False, demo_history: bool = False) -> None:
    ensure_tree()
    if reset:
        Base.metadata.drop_all(bind=engine)
    init_db()

    with SessionLocal() as db:
        if db.scalars(select(User).limit(1)).first() and not reset:
            print("Database already seeded. Use --reset to rebuild.")
        else:
            _seed_config(db)
            db.commit()
            print("Seeded configuration: 2 booths, 3 packages, 4 templates, 6 filters.")
            _print_credentials()

        if demo_history:
            _seed_history(db)
            db.commit()


def _seed_config(db) -> None:
    # Wire foreign keys through relationships rather than `.id`: primary keys are
    # column defaults, so they are still None until the unit of work flushes.
    admin = User(username=ADMIN_CREDS[0], password_hash=hash_password(ADMIN_CREDS[1]), role="ADMIN")
    db.add(admin)
    db.add(Operator(user=admin, name="System Administrator"))

    booths_by_code: dict[str, Booth] = {}
    for loc_name, address, city, booth_defs in LOCATIONS:
        location = Location(name=loc_name, address=address, city=city)
        db.add(location)
        for booth_name, code, device_id in booth_defs:
            booth = Booth(
                location=location,
                name=booth_name,
                booth_code=code,
                device_id=device_id,
                device_secret_hash=hash_password(DEVICE_SECRETS[device_id]),
                status="OFFLINE",  # honest until a kiosk connects
            )
            db.add(booth)
            db.add(DeviceStatus(booth=booth))
            booths_by_code[code] = booth

    for username, password, full_name, booth_code in OPERATOR_CREDS:
        user = User(username=username, password_hash=hash_password(password), role="OPERATOR")
        db.add(user)
        db.add(
            Operator(
                user=user,
                name=full_name,
                phone="+8801700000000",
                assigned_booth=booths_by_code[booth_code],
            )
        )

    for name, dur, photos, retakes, prints, price, expiry, grace in PACKAGES:
        db.add(
            Package(
                name=name,
                duration_seconds=dur,
                max_photos=photos,
                max_retakes=retakes,
                number_of_prints=prints,
                price=price,
                expiry_behavior=expiry,
                grace_period_sec=grace,
            )
        )

    for cfg in TEMPLATES:
        db.add(
            Template(
                name=cfg["name"],
                category=cfg["metadata"]["category"],
                configuration=cfg,
                number_of_slots=len(cfg["slots"]),
            )
        )

    for name, desc, css, path in LUTS:
        db.add(Lut(name=name, description=desc, css_filter=css, file_path=path))


def _seed_history(db) -> None:
    """Opt-in backfill so the admin dashboard can be demoed against a populated view.

    Writes completed sessions with no photo rows — there are no image files to point at,
    and inventing paths would produce broken thumbnails in the gallery. Session history
    and the stat tiles populate; the gallery stays empty until real sessions run.
    """
    existing = db.scalars(select(BoothSession).limit(1)).first()
    if existing is not None:
        print("History already present; skipping --demo-history.")
        return

    booths = list(db.scalars(select(Booth)))
    packages = list(db.scalars(select(Package)))
    templates = list(db.scalars(select(Template)))
    operators = [o for o in db.scalars(select(Operator)) if o.assigned_booth_id]
    rng = random.Random(20260820)  # fixed seed: reproducible demos

    created = 0
    for day_offset in range(14):
        day = utcnow() - timedelta(days=day_offset)
        for _ in range(rng.randint(6, 14)):
            booth = rng.choice(booths)
            package = rng.choice(packages)
            template = rng.choice([t for t in templates if t.number_of_slots <= package.max_photos])
            operator = next((o for o in operators if o.assigned_booth_id == booth.id), None)
            started = day.replace(
                hour=rng.randint(11, 20), minute=rng.randint(0, 59), second=rng.randint(0, 59)
            )
            # A realistic mix: mostly completed, a few cancelled/expired.
            status = rng.choices(
                [SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.EXPIRED],
                weights=[88, 7, 5],
            )[0]
            session = BoothSession(
                booth=booth,
                operator=operator,
                package=package,
                template=template,
                customer_name=None,
                status=status,
                allocated_time=package.duration_seconds,
                remaining_time=0,
                total_photos=template.number_of_slots,
                photos_captured=(
                    template.number_of_slots
                    if status == SessionStatus.COMPLETED
                    else rng.randint(0, template.number_of_slots)
                ),
                retakes_used=rng.randint(0, 2),
                started_at=started,
                ended_at=started + timedelta(seconds=package.duration_seconds),
                created_at=started - timedelta(seconds=45),
            )
            db.add(session)
            if status == SessionStatus.COMPLETED:
                db.add(
                    PrintJob(
                        session=session,
                        copies=package.number_of_prints,
                        status="COMPLETED",
                        created_at=session.ended_at,
                        completed_at=session.ended_at + timedelta(seconds=3),
                    )
                )
            created += 1

    print(f"Backfilled {created} historical sessions (no photo files — gallery stays empty).")


def _print_credentials() -> None:
    print("\n  Demo credentials")
    print(f"    admin     {ADMIN_CREDS[0]} / {ADMIN_CREDS[1]}")
    for username, password, name, code in OPERATOR_CREDS:
        print(f"    operator  {username} / {password}   ({name}, {code})")
    print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed the photobooth demo database.")
    parser.add_argument("--reset", action="store_true", help="drop all tables first")
    parser.add_argument(
        "--demo-history",
        action="store_true",
        help="backfill ~14 days of sessions for presenting (no photo files)",
    )
    args = parser.parse_args(argv)
    seed(reset=args.reset, demo_history=args.demo_history)
    return 0


if __name__ == "__main__":
    sys.exit(main())
