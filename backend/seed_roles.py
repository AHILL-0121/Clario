"""Seed manager and agent accounts into the demo tenant."""
import asyncio, sys
sys.path.insert(0, ".")
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.security import hash_password
from sqlalchemy import select
import uuid

TENANT_ID = uuid.UUID("0c1ef5be-4fde-4bf7-ae8e-3f56cb174828")
TENANT_SLUG = "demo-company"
DEFAULT_PASSWORD = "Clario@2026!"

SEED_USERS = [
    {"email": "manager@demo.com", "password": DEFAULT_PASSWORD, "full_name": "Demo Manager", "role": UserRole.MANAGER},
    {"email": "agent@demo.com",   "password": DEFAULT_PASSWORD, "full_name": "Demo Agent",   "role": UserRole.AGENT},
]

async def seed():
    async with AsyncSessionLocal() as db:
        tenant = (await db.execute(select(Tenant).where(Tenant.id == TENANT_ID))).scalar_one_or_none()
        if not tenant:
            tenant = Tenant(
                id=TENANT_ID,
                name="Demo Company",
                slug=TENANT_SLUG,
                is_active=True,
            )
            db.add(tenant)
            await db.flush()
            print("  created tenant: Demo Company")

        for u in SEED_USERS:
            exists = (await db.execute(select(User).where(User.email == u["email"]))).scalar_one_or_none()
            if exists:
                exists.tenant_id = TENANT_ID
                exists.role = u["role"]
                exists.full_name = u["full_name"]
                exists.is_active = True
                exists.hashed_password = hash_password(u["password"])
                print(f"  updated: {u['email']}  role={u['role']}")
                continue
            user = User(
                tenant_id=TENANT_ID,
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
            )
            db.add(user)
            print(f"  created: {u['email']}  role={u['role']}")
        await db.commit()
    print("Seeding complete.")

asyncio.run(seed())
