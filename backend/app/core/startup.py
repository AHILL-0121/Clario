"""
Startup connectivity & configuration checks.
Runs before the server accepts requests; failures are logged clearly.
"""

import sys
import logging
import importlib
import httpx
import redis.asyncio as aioredis
from sqlalchemy import text
from app.config import settings
from app.database import engine


class _FallbackLogger:
    def __init__(self, name: str):
        self._logger = logging.getLogger(name)

    @staticmethod
    def _format(message: str, fields: dict) -> str:
        if not fields:
            return message
        extras = " ".join(f"{k}={v!r}" for k, v in fields.items())
        return f"{message} {extras}"

    def info(self, message: str, **fields):
        self._logger.info(self._format(message, fields))

    def warning(self, message: str, **fields):
        self._logger.warning(self._format(message, fields))

    def error(self, message: str, **fields):
        self._logger.error(self._format(message, fields))

    def critical(self, message: str, **fields):
        self._logger.critical(self._format(message, fields))


def _get_logger():
    try:
        structlog = importlib.import_module("structlog")
        return structlog.get_logger()
    except Exception:
        return _FallbackLogger(__name__)


log = _get_logger()

# ── Silence SQLAlchemy & other noisy libs ────────────────────────────────────
def silence_noisy_loggers():
    for name in (
        "sqlalchemy",
        "sqlalchemy.engine",
        "sqlalchemy.engine.base",
        "sqlalchemy.dialects",
        "sqlalchemy.pool",
        "sqlalchemy.orm",
        "alembic",
        "asyncpg",
        "httpx",
        "httpcore",
    ):
        logging.getLogger(name).setLevel(logging.WARNING)


# ── Individual checks ────────────────────────────────────────────────────────
async def check_database() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        log.info("✅  Database     OK", url=settings.DATABASE_URL.split("@")[-1])
        return True
    except Exception as exc:
        log.error("❌  Database     FAILED", error=str(exc))
        return False


async def check_redis() -> bool:
    try:
        client = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        await client.ping()
        await client.aclose()
        log.info("✅  Redis        OK", url=settings.REDIS_URL)
        return True
    except Exception as exc:
        log.error("❌  Redis        FAILED", error=str(exc))
        return False


async def check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
        log.info("✅  Ollama       OK", url=settings.OLLAMA_BASE_URL, model=settings.OLLAMA_MODEL)
        return True
    except Exception as exc:
        log.warning("⚠️   Ollama       UNAVAILABLE (AI features degraded)", error=str(exc))
        return False  # non-fatal — app still starts


# ── Config summary ───────────────────────────────────────────────────────────
def print_config_summary():
    log.info(
        "📋  Config summary",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        db=settings.DATABASE_URL.split("@")[-1],          # hide credentials
        redis=settings.REDIS_URL,
        ollama=settings.OLLAMA_BASE_URL,
        model=settings.OLLAMA_MODEL,
        escalation_threshold=settings.ESCALATION_THRESHOLD,
        allowed_origins=settings.ALLOWED_ORIGINS,
    )


# ── Master runner ────────────────────────────────────────────────────────────
async def run_startup_checks(*, abort_on_db_fail: bool = True):
    silence_noisy_loggers()
    print_config_summary()

    log.info("🔍  Running startup connectivity checks…")
    db_ok     = await check_database()
    redis_ok  = await check_redis()
    await check_ollama()          # warning-only, never fatal

    if abort_on_db_fail and not db_ok:
        log.critical("Database is unreachable. Cannot start. Fix DATABASE_URL and retry.")
        sys.exit(1)

    if not redis_ok:
        log.warning("Redis is unreachable. Background tasks and Celery will not work.")

    log.info("🚀  Startup checks done — server is ready")
