"""Permisos reutilizables del schema (strawberry BasePermission).

- IsInternalService: header X-Internal-Token == INTERNAL_SERVICE_TOKEN
  (mutation submitContact — solo la invoca go-api, CONTRACTS §6).
- IsAdmin: Authorization: Bearer <JWT HS256 role=admin> (updateProfile,
  uploadImage).
"""
from __future__ import annotations

import logging
import typing

from django.conf import settings
from django.utils.crypto import constant_time_compare
from strawberry.permission import BasePermission

from portfolio.services import auth_service
from portfolio.services.exceptions import AuthenticationError

logger = logging.getLogger("portfolio.gql.permissions")


def _get_request(info) -> typing.Any:
    return info.context.request


class IsInternalService(BasePermission):
    message = "No autorizado: se requiere el token interno de servicio (X-Internal-Token)"
    error_extensions = {"code": "UNAUTHORIZED"}

    def has_permission(self, source, info, **kwargs) -> bool:
        expected = settings.INTERNAL_SERVICE_TOKEN
        provided = _get_request(info).headers.get("X-Internal-Token", "")
        allowed = bool(expected) and constant_time_compare(provided, expected)
        if not allowed:
            logger.warning("internal_token.rejected")
        return allowed


class IsAdmin(BasePermission):
    message = "No autorizado: se requiere un JWT admin válido (Authorization: Bearer)"
    error_extensions = {"code": "UNAUTHENTICATED"}

    def has_permission(self, source, info, **kwargs) -> bool:
        header = _get_request(info).headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return False
        try:
            auth_service.verify_admin_token(header[len("Bearer "):].strip())
        except AuthenticationError as exc:
            logger.warning("admin_token.rejected", extra={"reason": str(exc)})
            return False
        return True
