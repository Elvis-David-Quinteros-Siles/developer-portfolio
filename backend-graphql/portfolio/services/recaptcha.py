"""Verificación ReCaptcha v2/v3 contra Google.

RECAPTCHA_SECRET_KEY vacío ⇒ verificación deshabilitada (CONTRACTS §7).
Fail-closed: si Google no responde, el envío se rechaza (y se loggea).
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger("portfolio.recaptcha")

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
TIMEOUT_SECONDS = 5


def verify(token: str | None, remote_ip: str | None = None) -> bool:
    secret = settings.RECAPTCHA_SECRET_KEY
    if not secret:
        return True  # deshabilitado por configuración
    if not token:
        logger.warning("recaptcha.missing_token")
        return False
    data = {"secret": secret, "response": token}
    if remote_ip:
        data["remoteip"] = remote_ip
    try:
        response = requests.post(VERIFY_URL, data=data, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        body = response.json()
    except requests.RequestException:
        logger.exception("recaptcha.verify_error")
        return False
    success = bool(body.get("success"))
    if not success:
        logger.warning("recaptcha.rejected", extra={"error_codes": body.get("error-codes")})
    return success
