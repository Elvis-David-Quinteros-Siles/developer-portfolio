"""Paquete de configuración del proyecto.

Importa la app de Celery para que `@shared_task` la encuentre cuando
Django arranca (patrón estándar de la documentación de Celery).
"""
from .celery import app as celery_app

__all__ = ("celery_app",)
