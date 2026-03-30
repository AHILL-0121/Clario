from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.user import User
from app.models.subscription import Subscription, PlanType
from app.core.security import get_current_user
from app.config import settings
from pydantic import BaseModel

router = APIRouter()

PLAN_LIMITS = {
    PlanType.BASIC: {
        "ticket_limit": settings.BASIC_TICKET_LIMIT,
        "agent_limit": settings.BASIC_AGENT_LIMIT,
        "ai_token_limit": 100_000,
    },
    PlanType.PRO: {
        "ticket_limit": settings.PRO_TICKET_LIMIT,
        "agent_limit": settings.PRO_AGENT_LIMIT,
        "ai_token_limit": 1_000_000,
    },
    PlanType.PREMIUM: {
        "ticket_limit": settings.PREMIUM_TICKET_LIMIT,
        "agent_limit": settings.PREMIUM_AGENT_LIMIT,
        "ai_token_limit": 10_000_000,
    },
}


class UpgradeRequest(BaseModel):
    plan: PlanType


@router.get("/")
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Subscription).where(Subscription.tenant_id == current_user.tenant_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@router.post("/upgrade")
async def upgrade_plan(
    body: UpgradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limits = PLAN_LIMITS[body.plan]
    await db.execute(
        update(Subscription)
        .where(Subscription.tenant_id == current_user.tenant_id)
        .values(plan=body.plan, **limits)
    )
    await db.commit()
    return {"message": f"Upgraded to {body.plan} plan", "limits": limits}
