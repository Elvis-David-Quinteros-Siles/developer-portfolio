"""Notificación de mensajes de contacto — patrón Strategy/Adapter.

`EmailNotifier` es la interfaz (puerto). `LoggingEmailNotifier` es el adaptador
por defecto (JSON estructurado a stdout) y `SmtpEmailNotifier` envía por correo
de verdad. Se elige con `NOTIFIER_BACKEND` (`log` | `smtp`); la tarea Celery no
conoce ninguna de las dos (DIP).
"""
from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage

from portfolio.models import ContactMessage

logger = logging.getLogger("portfolio.notifications")


class EmailNotifier(ABC):
    """Puerto: notifica que llegó un mensaje de contacto."""

    @abstractmethod
    def send(self, message: ContactMessage) -> None:
        """Envía la notificación. Debe lanzar excepción si falla (para retry)."""


class LoggingEmailNotifier(EmailNotifier):
    """Adaptador por defecto: log JSON estructurado (visible en `docker logs`)."""

    def send(self, message: ContactMessage) -> None:
        logger.info(
            "contact.notification",
            extra={
                "event": "contact_message_received",
                "message_id": str(message.id),
                "contact_name": message.name,
                "contact_email": message.email,
                "subject": message.subject,
                "ip_address": message.ip_address,
                "received_at": message.created_at.isoformat(),
            },
        )


class SmtpEmailNotifier(EmailNotifier):
    """Adaptador SMTP: envía el aviso con la configuración EMAIL_* de Django.

    El remitente es la cuenta configurada, pero el `Reply-To` es quien escribió:
    así, responder desde el cliente de correo contesta a esa persona y no a uno
    mismo. Las excepciones se dejan subir a propósito — la tarea Celery
    reintenta con backoff exponencial.
    """

    def __init__(self, recipient: str):
        if not recipient:
            raise ImproperlyConfigured(
                "NOTIFY_EMAIL_TO es obligatorio con NOTIFIER_BACKEND=smtp: "
                "es la dirección que recibe los mensajes de contacto."
            )
        if not settings.EMAIL_HOST:
            raise ImproperlyConfigured(
                "EMAIL_HOST es obligatorio con NOTIFIER_BACKEND=smtp."
            )
        self.recipient = recipient

    def send(self, message: ContactMessage) -> None:
        body = (
            f"Nuevo mensaje de contacto del portfolio.\n\n"
            f"Nombre:  {message.name}\n"
            f"Email:   {message.email}\n"
            f"Asunto:  {message.subject}\n"
            f"Fecha:   {message.created_at.isoformat()}\n"
            f"IP:      {message.ip_address or 'desconocida'}\n"
            f"ID:      {message.id}\n\n"
            f"{'-' * 60}\n\n"
            f"{message.message}\n"
        )
        sent = EmailMessage(
            subject=f"[Portfolio] {message.subject}",
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[self.recipient],
            reply_to=[message.email],
        ).send(fail_silently=False)

        if not sent:
            # El backend puede devolver 0 sin lanzar: para Celery eso sería un
            # éxito silencioso y el mensaje se perdería sin rastro.
            raise RuntimeError(f"SMTP no aceptó el mensaje {message.id}")


def get_notifier() -> EmailNotifier:
    """Factory: selecciona la estrategia vía env (default: log)."""
    backend = os.environ.get("NOTIFIER_BACKEND", "log").strip().lower()
    if backend == "smtp":
        return SmtpEmailNotifier(recipient=os.environ.get("NOTIFY_EMAIL_TO", ""))
    return LoggingEmailNotifier()
