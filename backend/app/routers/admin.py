"""
Platform admin router — accessible only to users with role=admin.
Provides MSME company (tenant) oversight endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.ticket import Ticket
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.routers.auth import get_current_user

router = APIRouter()


# ── dependency ────────────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required",
        )
    return current_user


# ── schemas ───────────────────────────────────────────────────────────────────

class TenantSummary(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    ticket_count: int
    user_count: int
    created_at: str


class TenantToggleResponse(BaseModel):
    id: str
    is_active: bool
    message: str


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/tenants", response_model=List[TenantSummary])
async def list_all_tenants(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return all MSME tenants with aggregated stats."""
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()

    output = []
    for t in tenants:
        ticket_count = (await db.execute(
            select(func.count(Ticket.id)).where(Ticket.tenant_id == t.id)
        )).scalar() or 0

        user_count = (await db.execute(
            select(func.count(User.id)).where(User.tenant_id == t.id)
        )).scalar() or 0

        output.append(
            TenantSummary(
                id=str(t.id),
                name=t.name,
                slug=t.slug,
                plan="free",
                is_active=t.is_active,
                ticket_count=ticket_count,
                user_count=user_count,
                created_at=t.created_at.isoformat() if t.created_at else "",
            )
        )
    return output


@router.patch("/tenants/{tenant_id}/toggle", response_model=TenantToggleResponse)
async def toggle_tenant_active(
    tenant_id: UUID,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate an MSME company account."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.is_active = not tenant.is_active  # type: ignore[assignment]
    await db.commit()
    await db.refresh(tenant)

    return TenantToggleResponse(
        id=str(tenant.id),
        is_active=tenant.is_active,
        message=f"Tenant {'activated' if tenant.is_active else 'deactivated'} successfully",
    )


@router.get("/stats")
async def platform_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """High-level platform statistics for the admin dashboard."""
    total_tenants = (await db.execute(select(func.count(Tenant.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_tickets = (await db.execute(select(func.count(Ticket.id)))).scalar() or 0
    active_tenants = (await db.execute(
        select(func.count(Tenant.id)).where(Tenant.is_active == True)  # noqa: E712
    )).scalar() or 0

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "inactive_tenants": total_tenants - active_tenants,
        "total_users": total_users,
        "total_tickets": total_tickets,
    }
