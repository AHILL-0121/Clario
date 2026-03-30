from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus
from app.models.analytics import WeeklyMetric
from app.core.security import get_current_user
from app.services.analytics_service import AnalyticsService
from typing import List
from datetime import date

router = APIRouter()
analytics_service = AnalyticsService()


def require_owner(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Analytics access restricted to Owner only")
    return current_user


@router.get("/dashboard")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tid = current_user.tenant_id

    # Quick counts
    total = await db.execute(select(func.count()).where(Ticket.tenant_id == tid))
    open_c = await db.execute(select(func.count()).where(Ticket.tenant_id == tid, Ticket.status == TicketStatus.OPEN))
    escalated = await db.execute(select(func.count()).where(Ticket.tenant_id == tid, Ticket.status == TicketStatus.ESCALATED))
    closed = await db.execute(select(func.count()).where(Ticket.tenant_id == tid, Ticket.status == TicketStatus.CLOSED))

    return {
        "total_tickets": total.scalar(),
        "open_tickets": open_c.scalar(),
        "escalated_tickets": escalated.scalar(),
        "closed_tickets": closed.scalar(),
    }


@router.get("/weekly")
async def weekly_metrics(
    limit: int = 12,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    result = await db.execute(
        select(WeeklyMetric)
        .where(WeeklyMetric.tenant_id == current_user.tenant_id)
        .order_by(WeeklyMetric.week_start.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/generate-weekly")
async def generate_weekly_report(
    current_user: User = Depends(require_owner),
    db: AsyncSession = Depends(get_db),
):
    """Owner triggers a new weekly AI report generation."""
    report = await analytics_service.generate_weekly_summary(str(current_user.tenant_id), db)
    return report
