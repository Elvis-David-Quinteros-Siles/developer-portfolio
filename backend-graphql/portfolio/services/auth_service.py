"""Autenticación admin: credenciales de entorno → JWT HS256 (PyJWT).

Claims: sub, role=admin, iat, exp (1h). Secreto compartido JWT_SECRET
(el gateway valida el mismo token para rutas admin del go-api).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from django.utils.crypto import constant_time_compare

from portfolio.services.exceptions import AuthenticationError

logger = logging.getLogger("portfolio.auth")

ALGORITHM = "HS256"


def login(username: str, password: str) -> tuple[str, datetime]:
    """Valida credenciales admin (env) y emite un JWT. Devuelve (token, exp)."""
    configured = bool(settings.ADMIN_USERNAME) and bool(settings.ADMIN_PASSWORD)
    valid = (
        configured
        and constant_time_compare(username, settings.ADMIN_USERNAME)
        and constant_time_compare(password, settings.ADMIN_PASSWORD)
    )
    if not valid:
        logger.warning("auth.login_failed", extra={"username": username})
        raise AuthenticationError("Credenciales inválidas")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.JWT_TTL_SECONDS)
    token = jwt.encode(
        {"sub": username, "role": "admin", "iat": now, "exp": expires_at},
        settings.JWT_SECRET,
        algorithm=ALGORITHM,
    )
    logger.info("auth.login_ok", extra={"username": username})
    return token, expires_at


def verify_admin_token(token: str) -> dict:
    """Decodifica y valida un JWT admin. Lanza AuthenticationError si no es válido."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError(f"Token inválido: {exc}") from exc
    if payload.get("role") != "admin":
        raise AuthenticationError("El token no tiene rol admin")
    return payload
