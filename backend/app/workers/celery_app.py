from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "ai_support",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        # Generate weekly reports every Monday at 07:00 UTC
        "weekly-report": {
            "task": "app.workers.tasks.generate_all_weekly_reports",
            "schedule": crontab(hour=7, minute=0, day_of_week=1),
        },
        # Process IMAP email inbox every 5 minutes
        "imap-poll": {
            "task": "app.workers.tasks.poll_imap_inbox",
            "schedule": crontab(minute="*/5"),
        },
    },
)
