"""Celery application instance for background/async work (e.g. document ingestion)."""
from celery import Celery

from app.core.config import settings

celery = Celery(
    "prepgenius",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    timezone="UTC",
)

# Explicitly import the task module so workers register tasks on startup.
celery.conf.imports = ("app.workers.tasks",)
