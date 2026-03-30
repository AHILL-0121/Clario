"""
Seed admin@platform.com and tenantadmin@demo.com accounts.

Usage (from backend/ directory):
    python seed_admin_roles.py
"""
import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.core.security import hash_password

DEMO_TENANT_ID = uuid.UUID("0c1ef5be-4fde-4bf7-ae8e-3f56cb174828")
PLATFORM_TENANT_SLUG = "platform-system"
DEMO_TENANT_SLUG = "demo-company"
DEFAULT_PASSWORD = "Clario@2026!"


async def seed():
    async with AsyncSessionLocal() as db:
        # ── 1. Ensure system tenant exists ──────────────────────────────────
        sys_tenant = (
            await db.execute(
                select(Tenant).where(Tenant.slug == PLATFORM_TENANT_SLUG)
            )
        ).scalar_one_or_none()

        if not sys_tenant:
            sys_tenant = Tenant(
                id=uuid.uuid4(),
                name="Platform System",
                slug=PLATFORM_TENANT_SLUG,
                is_active=True,
            )
            db.add(sys_tenant)
            await db.flush()  # get sys_tenant.id without full commit
            print(f"  created tenant: Platform System (id={sys_tenant.id})")
        else:
            print(f"  skip tenant (exists): {sys_tenant.slug}")

        # ── 1b. Ensure demo tenant exists for tenant_admin account ─────────
        demo_tenant = (
            await db.execute(select(Tenant).where(Tenant.id == DEMO_TENANT_ID))
        ).scalar_one_or_none()

        if not demo_tenant:
            demo_tenant = Tenant(
                id=DEMO_TENANT_ID,
                name="Demo Company",
                slug=DEMO_TENANT_SLUG,
                is_active=True,
            )
            db.add(demo_tenant)
            await db.flush()
            print(f"  created tenant: Demo Company (id={demo_tenant.id})")
        else:
            print("  skip tenant (exists): demo-company")

        # ── 2. Seed platform admin ───────────────────────────────────────────
        admin_email = "admin@platform.com"
        admin_exists = (
            await db.execute(select(User).where(User.email == admin_email))
        ).scalar_one_or_none()

        if not admin_exists:
            admin_user = User(
                id=uuid.uuid4(),
                tenant_id=sys_tenant.id,
                email=admin_email,
                hashed_password=hash_password(DEFAULT_PASSWORD),
                full_name="Platform Admin",
                role=UserRole.ADMIN,
            )
            db.add(admin_user)
            print(f"  created: {admin_email}  role=admin")
        else:
            admin_exists.tenant_id = sys_tenant.id
            admin_exists.role = UserRole.ADMIN
            admin_exists.full_name = admin_exists.full_name or "Platform Admin"
            admin_exists.is_active = True
            admin_exists.hashed_password = hash_password(DEFAULT_PASSWORD)
            print(f"  updated: {admin_email}  role=admin")

        # ── 3. Seed tenant admin in demo tenant ──────────────────────────────
        ta_email = "tenantadmin@demo.com"
        ta_exists = (
            await db.execute(select(User).where(User.email == ta_email))
        ).scalar_one_or_none()

        if not ta_exists:
            ta_user = User(
                id=uuid.uuid4(),
                tenant_id=DEMO_TENANT_ID,
                email=ta_email,
                hashed_password=hash_password(DEFAULT_PASSWORD),
                full_name="Demo Tenant Admin",
                role=UserRole.TENANT_ADMIN,
            )
            db.add(ta_user)
            print(f"  created: {ta_email}  role=tenant_admin")
        else:
            ta_exists.tenant_id = DEMO_TENANT_ID
            ta_exists.role = UserRole.TENANT_ADMIN
            ta_exists.full_name = ta_exists.full_name or "Demo Tenant Admin"
            ta_exists.is_active = True
            ta_exists.hashed_password = hash_password(DEFAULT_PASSWORD)
            print(f"  updated: {ta_email}  role=tenant_admin")

        await db.commit()

    print("\nSeeding complete.")
    print(f"  admin@platform.com    / {DEFAULT_PASSWORD}  → /admin")
    print(f"  tenantadmin@demo.com  / {DEFAULT_PASSWORD}  → /dashboard (tenant admin)")


asyncio.run(seed())
