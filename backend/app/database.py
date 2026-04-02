from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=20,
    echo=False,          # SQLAlchemy SQL logs suppressed; use structlog for app-level logging
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup and apply lightweight idempotent schema sync."""
    import app.models  # noqa: F401 – registers all ORM models with Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "postgresql":
            # Keep older databases compatible when new columns are added to existing tables.
            await conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS share_token VARCHAR(64)"))
            await conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_tickets_share_token "
                "ON tickets (share_token) WHERE share_token IS NOT NULL"
            ))
