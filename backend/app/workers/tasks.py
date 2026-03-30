import asyncio
import structlog
from app.workers.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.tenant import Tenant
from sqlalchemy import select

log = structlog.get_logger()


def _run(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="app.workers.tasks.generate_all_weekly_reports", bind=True, max_retries=3)
def generate_all_weekly_reports(self):
    async def _inner():
        from app.services.analytics_service import AnalyticsService
        svc = AnalyticsService()
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Tenant).where(Tenant.is_active == True))  # noqa: E712
            tenants = result.scalars().all()
            for tenant in tenants:
                try:
                    await svc.generate_weekly_summary(str(tenant.id), db)
                except Exception as e:
                    log.error("Failed to generate weekly report", tenant_id=str(tenant.id), error=str(e))

    try:
        _run(_inner())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="app.workers.tasks.poll_imap_inbox", bind=True, max_retries=2)
def poll_imap_inbox(self):
    """Poll IMAP inbox and convert new emails into tickets."""
    log.info("Polling IMAP inbox…")
    # TODO: implement IMAP polling with imaplib2
    # For each new email:
    #   1. Parse sender, subject, body
    #   2. Find or create customer by email
    #   3. Create ticket on EMAIL channel
    #   4. Trigger AI draft
    pass


@celery_app.task(name="app.workers.tasks.retry_failed_webhook")
def retry_failed_webhook(crm: str, payload: dict, tenant_id: str):
    """Retry a failed CRM webhook processing."""
    async def _inner():
        from app.services.crm_service import CRMService
        import uuid
        svc = CRMService()
        async with AsyncSessionLocal() as db:
            await svc.process_event(crm, payload, uuid.UUID(tenant_id), db)
    _run(_inner())
