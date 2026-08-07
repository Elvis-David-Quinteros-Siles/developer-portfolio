"""Notificación de mensajes de contacto — patrón Strategy/Adapter.

`EmailNotifier` es la interfaz (puerto). `LoggingEmailNotifier` es la
implementación activa (adaptador que emite JSON estructurado a stdout).
`SmtpEmailNotifier` es el stub listo para conectar un SMTP real: basta con
configurar EMAIL_HOST/credenciales y completar `send()` con
`django.core.mail.send_mail`, sin tocar la tarea Celery (DIP).
"""
from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod

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
    """Stub SMTP: implementar con django.core.mail cuando exista un servidor.

    Ejemplo de implementación:
        from django.core.mail import send_mail
        send_mail(subject=..., message=..., from_email=..., recipient_list=[...])
    """

    def __init__(self, recipient: str):
        self.recipient = recipient

    def send(self, message: ContactMessage) -> None:  # pragma: no cover
        raise NotImplementedError(
            "SmtpEmailNotifier requiere configuración EMAIL_* de Django; "
            "usar NOTIFIER_BACKEND=log mientras tanto."
        )


def get_notifier() -> EmailNotifier:
    """Factory: selecciona la estrategia vía env (default: log)."""
    backend = os.environ.get("NOTIFIER_BACKEND", "log").strip().lower()
    if backend == "smtp":
        return SmtpEmailNotifier(recipient=os.environ.get("NOTIFY_EMAIL_TO", ""))
    return LoggingEmailNotifier()
