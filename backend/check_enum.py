"""Diagnostic: check userrole enum values in the database."""
import asyncio
import sys
sys.path.insert(0, ".")
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        # Get all values of the userrole enum type
        result = await conn.execute(text(
            "SELECT enumlabel FROM pg_enum "
            "JOIN pg_type ON pg_enum.enumtypid = pg_type.oid "
            "WHERE pg_type.typname = 'userrole' "
            "ORDER BY pg_enum.enumsortorder"
        ))
        rows = result.fetchall()
        print("userrole enum values in PostgreSQL:")
        for r in rows:
            print(f"  {r[0]!r}")

        # Also check existing user roles
        result2 = await conn.execute(text("SELECT email, role FROM users LIMIT 10"))
        rows2 = result2.fetchall()
        print("\nExisting users:")
        for r in rows2:
            print(f"  {r[0]} -> role={r[1]!r}")

asyncio.run(check())
