"""Read-only configuration catalogue: packages, templates, LUTs.

CRUD is out of demo scope (the plan's "Stripped" column) — these are seeded. Both the
kiosk and the dashboards read them, so every endpoint accepts either token kind.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.common import AnyPrincipal
from app.models import Lut, Package, Template
from app.schemas import LutOut, PackageOut, TemplateOut
from app.security import DbSession

router = APIRouter(tags=["configuration"])


@router.get("/packages", response_model=list[PackageOut])
def list_packages(_: AnyPrincipal, db: DbSession) -> list[Package]:
    """§21.3 — what the operator picks from when starting a session."""
    return list(
        db.scalars(select(Package).where(Package.is_active).order_by(Package.duration_seconds))
    )


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(
    _: AnyPrincipal,
    db: DbSession,
    max_slots: int | None = None,
) -> list[Template]:
    """The §12.2 configurations the kiosk compositor renders from.

    `max_slots` filters to templates a package can actually fill: offering a 6-slot
    grid on a 4-photo package would strand two empty slots.
    """
    stmt = select(Template).where(Template.is_active)
    if max_slots is not None:
        stmt = stmt.where(Template.number_of_slots <= max_slots)
    return list(db.scalars(stmt.order_by(Template.number_of_slots, Template.name)))


@router.get("/templates/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, _: AnyPrincipal, db: DbSession) -> Template:
    template = db.get(Template, template_id)
    if template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    return template


@router.get("/luts", response_model=list[LutOut])
def list_luts(_: AnyPrincipal, db: DbSession) -> list[Lut]:
    """§11.1 filters. Seeded in display order, so no sort key is imposed here."""
    return list(db.scalars(select(Lut).where(Lut.is_active).order_by(Lut.created_at)))
