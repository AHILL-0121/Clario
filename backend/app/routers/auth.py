import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.models.subscription import Subscription, PlanType
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.config import settings

router = APIRouter()


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create tenant
    slug = slugify(body.tenant_name)
    tenant = Tenant(name=body.tenant_name, slug=slug)
    db.add(tenant)
    await db.flush()

    # Create subscription (Basic plan default)
    sub = Subscription(
        tenant_id=tenant.id,
        plan=PlanType.BASIC,
        ticket_limit=settings.BASIC_TICKET_LIMIT,
        agent_limit=settings.BASIC_AGENT_LIMIT,
        ai_token_limit=100_000,
    )
    db.add(sub)

    # Create owner user
    user = User(
        tenant_id=tenant.id,
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="owner",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "tenant_id": str(tenant.id), "role": user.role})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token({"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
