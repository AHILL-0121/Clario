"""
Tenant-admin router — accessible to users with role in {tenant_admin, owner}.
Manages KB entries, team members, and escalation policies for a single tenant.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.kb_entry import KBEntry
from app.models.tenant_settings import TenantSettings
from app.models.user import User, UserRole
from app.routers.auth import get_current_user
from app.core.security import hash_password

router = APIRouter()


# ── dependency ────────────────────────────────────────────────────────────────

_TENANT_ADMIN_ROLES = {UserRole.TENANT_ADMIN, UserRole.OWNER}


def require_tenant_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in _TENANT_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant admin or owner access required",
        )
    return current_user


# ── KB schemas ────────────────────────────────────────────────────────────────

class KBEntryCreate(BaseModel):
    title: str = Field(..., max_length=500)
    content: str
    source_type: str = "manual"  # manual | import | webhook


class KBEntryOut(BaseModel):
    id: str
    title: str
    content: str
    source_type: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ── Team schemas ──────────────────────────────────────────────────────────────

class TeamMemberCreate(BaseModel):
    full_name: str
    email: str
    password: str = Field(..., min_length=8)
    role: str = Field("agent", pattern="^(agent|manager)$")


class TeamMemberOut(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Policy schemas ────────────────────────────────────────────────────────────

class PoliciesUpdate(BaseModel):
    escalation_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    auto_draft_enabled: Optional[bool] = None
    auto_escalate_enabled: Optional[bool] = None
    max_response_time_hours: Optional[int] = Field(None, ge=1, le=168)
    welcome_message: Optional[str] = None


class PoliciesOut(BaseModel):
    tenant_id: str
    escalation_threshold: float
    auto_draft_enabled: bool
    auto_escalate_enabled: bool
    max_response_time_hours: int
    welcome_message: Optional[str]
    updated_at: str


# ── KB endpoints ──────────────────────────────────────────────────────────────

@router.get("/kb", response_model=List[KBEntryOut])
async def list_kb_entries(
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBEntry)
        .where(KBEntry.tenant_id == actor.tenant_id)
        .order_by(KBEntry.created_at.desc())
    )
    entries = result.scalars().all()
    return [
        KBEntryOut(
            id=str(e.id),
            title=e.title,
            content=e.content,
            source_type=e.source_type,
            created_at=e.created_at.isoformat(),
            updated_at=e.updated_at.isoformat(),
        )
        for e in entries
    ]


@router.post("/kb", response_model=KBEntryOut, status_code=201)
async def create_kb_entry(
    payload: KBEntryCreate,
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    entry = KBEntry(
        id=uuid4(),
        tenant_id=actor.tenant_id,
        title=payload.title,
        content=payload.content,
        source_type=payload.source_type,
        created_by_id=actor.id,
        created_at=now,
        updated_at=now,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return KBEntryOut(
        id=str(entry.id),
        title=entry.title,
        content=entry.content,
        source_type=entry.source_type,
        created_at=entry.created_at.isoformat(),
        updated_at=entry.updated_at.isoformat(),
    )


@router.delete("/kb/{entry_id}", status_code=204)
async def delete_kb_entry(
    entry_id: UUID,
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBEntry).where(KBEntry.id == entry_id, KBEntry.tenant_id == actor.tenant_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="KB entry not found")
    await db.delete(entry)
    await db.commit()


# ── Team endpoints ────────────────────────────────────────────────────────────

@router.get("/team", response_model=List[TeamMemberOut])
async def list_team(
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(
            User.tenant_id == actor.tenant_id,
            User.role.in_([UserRole.AGENT, UserRole.MANAGER]),
        )
        .order_by(User.full_name)
    )
    members = result.scalars().all()
    return [
        TeamMemberOut(
            id=str(m.id),
            full_name=m.full_name,
            email=m.email,
            role=m.role.value,
            is_active=bool(getattr(m, "is_active", True)),
        )
        for m in members
    ]


@router.post("/team", response_model=TeamMemberOut, status_code=201)
async def create_team_member(
    payload: TeamMemberCreate,
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    existing_res = await db.execute(select(User).where(User.email == payload.email))
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    role_map = {"agent": UserRole.AGENT, "manager": UserRole.MANAGER}
    new_user = User(
        id=uuid4(),
        tenant_id=actor.tenant_id,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role_map[payload.role],
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return TeamMemberOut(
        id=str(new_user.id),
        full_name=new_user.full_name,
        email=new_user.email,
        role=new_user.role.value,
        is_active=True,
    )


@router.delete("/team/{user_id}", status_code=204)
async def deactivate_team_member(
    user_id: UUID,
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == actor.tenant_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    if member.role not in (UserRole.AGENT, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Cannot deactivate admin/owner accounts")
    member.is_active = False  # type: ignore[assignment]
    await db.commit()


# ── Policy endpoints ──────────────────────────────────────────────────────────

async def _get_or_create_settings(tenant_id: UUID, db: AsyncSession) -> TenantSettings:
    result = await db.execute(select(TenantSettings).where(TenantSettings.tenant_id == tenant_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = TenantSettings(
            tenant_id=tenant_id,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("/policies", response_model=PoliciesOut)
async def get_policies(
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_or_create_settings(actor.tenant_id, db)
    return PoliciesOut(
        tenant_id=str(s.tenant_id),
        escalation_threshold=s.escalation_threshold,
        auto_draft_enabled=s.auto_draft_enabled,
        auto_escalate_enabled=s.auto_escalate_enabled,
        max_response_time_hours=s.max_response_time_hours,
        welcome_message=s.welcome_message,
        updated_at=s.updated_at.isoformat(),
    )


@router.put("/policies", response_model=PoliciesOut)
async def update_policies(
    payload: PoliciesUpdate,
    actor: User = Depends(require_tenant_admin),
    db: AsyncSession = Depends(get_db),
):
    s = await _get_or_create_settings(actor.tenant_id, db)

    if payload.escalation_threshold is not None:
        s.escalation_threshold = payload.escalation_threshold  # type: ignore
    if payload.auto_draft_enabled is not None:
        s.auto_draft_enabled = payload.auto_draft_enabled  # type: ignore
    if payload.auto_escalate_enabled is not None:
        s.auto_escalate_enabled = payload.auto_escalate_enabled  # type: ignore
    if payload.max_response_time_hours is not None:
        s.max_response_time_hours = payload.max_response_time_hours  # type: ignore
    if payload.welcome_message is not None:
        s.welcome_message = payload.welcome_message  # type: ignore

    s.updated_at = datetime.now(timezone.utc)  # type: ignore
    await db.commit()
    await db.refresh(s)

    return PoliciesOut(
        tenant_id=str(s.tenant_id),
        escalation_threshold=s.escalation_threshold,
        auto_draft_enabled=s.auto_draft_enabled,
        auto_escalate_enabled=s.auto_escalate_enabled,
        max_response_time_hours=s.max_response_time_hours,
        welcome_message=s.welcome_message,
        updated_at=s.updated_at.isoformat(),
    )
