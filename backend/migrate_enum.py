"""Add ADMIN and TENANT_ADMIN values to the PostgreSQL userrole enum.

NOTE: PostgreSQL SAEnum uses uppercase member NAMES (OWNER, MANAGER, AGENT).
We must add uppercase 'ADMIN' and 'TENANT_ADMIN' — not lowercase.
We also drop the lowercase 'admin'/'tenant_admin' we added incorrectly.
"""
import asyncio
import sys
sys.path.insert(0, ".")
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")

        # Add correct uppercase values
        await conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMIN'"))
        await conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TENANT_ADMIN'"))
        print("Done: userrole enum updated with ADMIN + TENANT_ADMIN (uppercase)")

        # Verify
        result = await conn.execute(text(
            "SELECT enumlabel FROM pg_enum "
            "JOIN pg_type ON pg_enum.enumtypid = pg_type.oid "
            "WHERE pg_type.typname = 'userrole' "
            "ORDER BY enumsortorder"
        ))
        print("Current userrole values:", [r[0] for r in result.fetchall()])

asyncio.run(migrate())
