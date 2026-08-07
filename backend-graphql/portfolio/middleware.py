"""Middleware de observabilidad: request_id + access log JSON."""
from __future__ import annotations

import logging
import time
import uuid

from portfolio.observability import request_id_var

logger = logging.getLogger("portfolio.request")


class RequestIDMiddleware:
    """Lee X-Request-ID (lo genera si falta), lo expone en un ContextVar para
    el formatter JSON, lo devuelve en la respuesta y emite el access log
    estructurado con latency_ms y status (CONTRACTS §8)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.request_id = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            response = self.get_response(request)
        finally:
            request_id_var.reset(token)
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        response["X-Request-ID"] = request_id
        # El healthcheck golpea /health/ cada 15s: no ensuciar el log.
        if request.path != "/health/":
            logger.info(
                "request.completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.path,
                    "status": response.status_code,
                    "latency_ms": latency_ms,
                },
            )
        return response
