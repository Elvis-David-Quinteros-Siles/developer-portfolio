"""Tareas Celery (broker/backend = REDIS_URL, ver config/celery.py)."""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger("portfolio.tasks")


@shared_task(
    bind=True,
    name="portfolio.notify_contact_message",
    autoretry_for=(Exception,),
    retry_backoff=True,          # 1s, 2s, 4s, ... exponencial
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=5,
    acks_late=True,
)
def notify_contact_message(self, message_id: str) -> str:
    """Notifica un mensaje de contacto recién persistido.

    Carga el mensaje y delega en la estrategia EmailNotifier activa
    (por defecto, log JSON estructurado; stub SMTP listo para conectar).
    """
    from portfolio.models import ContactMessage
    from portfolio.services.notifications import get_notifier

    message = ContactMessage.objects.filter(id=message_id).first()
    if message is None:
        # No reintentar: el mensaje no existe (o fue soft-deleted).
        logger.warning("notify_contact_message.not_found", extra={"message_id": message_id})
        return "not_found"

    get_notifier().send(message)
    logger.info(
        "notify_contact_message.sent",
        extra={"message_id": message_id, "attempt": self.request.retries},
    )
    return "sent"
