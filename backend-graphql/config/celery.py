"""Aplicación Celery del proyecto (broker/backend = REDIS_URL).

El worker se lanza como `celery -A config worker` (ver docker-compose.yml).
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("portfolio")

# Toda la configuración CELERY_* vive en config/settings.py (12-factor).
app.config_from_object("django.conf:settings", namespace="CELERY")

# Descubre tareas en portfolio/tasks.py
app.autodiscover_tasks()
