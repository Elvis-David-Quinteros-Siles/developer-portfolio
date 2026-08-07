"""Espera a que PostgreSQL acepte conexiones (usado por entrypoint.sh)."""
from __future__ import annotations

import logging
import time

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.db.utils import OperationalError

logger = logging.getLogger("portfolio.wait_for_db")


class Command(BaseCommand):
    help = "Bloquea hasta que la base de datos responda (o agota reintentos)."

    def add_arguments(self, parser):
        parser.add_argument("--retries", type=int, default=30)
        parser.add_argument("--delay", type=float, default=1.0)

    def handle(self, *args, **options):
        retries: int = options["retries"]
        delay: float = options["delay"]
        for attempt in range(1, retries + 1):
            try:
                connection.ensure_connection()
            except OperationalError as exc:
                logger.info(
                    "wait_for_db.retry",
                    extra={"attempt": attempt, "retries": retries, "error": str(exc)},
                )
                time.sleep(delay)
            else:
                logger.info("wait_for_db.ready", extra={"attempt": attempt})
                return
        raise CommandError(f"Base de datos inaccesible tras {retries} intentos")
