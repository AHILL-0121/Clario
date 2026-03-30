import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.database import init_db
from app.core.startup import run_startup_checks, silence_noisy_loggers
from app.routers import auth, tickets, customers, webhooks, ai, analytics, subscriptions, ws
from app.routers import admin as admin_router, tenant_admin as tenant_admin_router

# Silence SQLAlchemy / noisy libs immediately at import time
silence_noisy_loggers()

log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_startup_checks(abort_on_db_fail=True)
    await init_db()
    yield
    log.info("Shutting down…")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics ──────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(tickets.router,       prefix="/api/tickets",       tags=["Tickets"])
app.include_router(customers.router,     prefix="/api/customers",     tags=["Customers"])
app.include_router(webhooks.router,      prefix="/api/webhooks",      tags=["Webhooks"])
app.include_router(ai.router,            prefix="/api/ai",            tags=["AI"])
app.include_router(analytics.router,     prefix="/api/analytics",     tags=["Analytics"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(ws.router,            prefix="/ws",                tags=["WebSocket"])
app.include_router(admin_router.router,        prefix="/api/admin",        tags=["Platform Admin"])
app.include_router(tenant_admin_router.router, prefix="/api/tenant-admin", tags=["Tenant Admin"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
