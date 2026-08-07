"""Endpoints HTTP no-GraphQL."""
from __future__ import annotations

import logging

from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger("portfolio.health")


def health(request):
    """`GET /health/` → 200 {"status": "ok"} si la app y la DB responden.

    Lo consume el healthcheck del compose; go-api espera este estado para
    arrancar (garantiza esquema migrado, ADR-0003).
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        logger.exception("health.database_unreachable")
        return JsonResponse({"status": "error", "database": "unreachable"}, status=503)
    return JsonResponse({"status": "ok"})
