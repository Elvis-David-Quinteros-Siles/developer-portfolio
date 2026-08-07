"""Caso de uso: recepción de mensajes de contacto (write side, ADR-0003).

Flujo (CONTRACTS §6): Go valida y delega aquí con X-Internal-Token; este
servicio revalida (defensa en profundidad), verifica ReCaptcha si está
configurado, persiste y encola la notificación en Celery.
"""
from __future__ import annotations

import ipaddress
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email

from portfolio.models import ContactMessage
from portfolio.services import recaptcha
from portfolio.services.exceptions import ValidationError

logger = logging.getLogger("portfolio.contact")

MAX_NAME = 200
MAX_SUBJECT = 300
MAX_MESSAGE = 5000


def _clean_ip(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip().split(",")[0].strip()
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        logger.warning("contact.invalid_ip_discarded", extra={"raw_ip": value})
        return None


def submit_contact(
    *,
    name: str,
    email: str,
    subject: str,
    message: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    recaptcha_token: str | None = None,
) -> ContactMessage:
    name = (name or "").strip()
    email = (email or "").strip()
    subject = (subject or "").strip()
    message = (message or "").strip()

    if not name or len(name) > MAX_NAME:
        raise ValidationError(f"'name' es obligatorio (máx. {MAX_NAME} caracteres)")
    try:
        validate_email(email)
    except DjangoValidationError as exc:
        raise ValidationError("'email' no es una dirección válida") from exc
    if not subject or len(subject) > MAX_SUBJECT:
        raise ValidationError(f"'subject' es obligatorio (máx. {MAX_SUBJECT} caracteres)")
    if not message or len(message) > MAX_MESSAGE:
        raise ValidationError(f"'message' es obligatorio (máx. {MAX_MESSAGE} caracteres)")

    clean_ip = _clean_ip(ip_address)
    if not recaptcha.verify(recaptcha_token, remote_ip=clean_ip):
        raise ValidationError("Verificación ReCaptcha fallida")

    contact = ContactMessage.objects.create(
        name=name,
        email=email,
        subject=subject,
        message=message,
        ip_address=clean_ip,
        user_agent=(user_agent or "")[:2000],
        status=ContactMessage.Status.NEW,
    )

    # Import local para evitar ciclo tasks -> notifications -> models.
    from portfolio.tasks import notify_contact_message

    notify_contact_message.delay(str(contact.id))
    logger.info("contact.persisted", extra={"message_id": str(contact.id)})
    return contact
