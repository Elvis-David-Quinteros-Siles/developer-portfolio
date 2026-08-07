"""Crea el superusuario de Django admin desde ADMIN_USERNAME/ADMIN_PASSWORD.

Idempotente: si ya existe, sincroniza la contraseña con el entorno (la env
es la fuente de verdad de la credencial admin en todo el stack).
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

logger = logging.getLogger("portfolio.ensure_admin")


class Command(BaseCommand):
    help = "Garantiza el superusuario admin definido por variables de entorno."

    def handle(self, *args, **options):
        username = settings.ADMIN_USERNAME
        password = settings.ADMIN_PASSWORD
        if not username or not password:
            logger.warning("ensure_admin.skipped_missing_env")
            return

        user_model = get_user_model()
        user = user_model.objects.filter(username=username).first()
        if user is None:
            user_model.objects.create_superuser(username=username, password=password)
            logger.info("ensure_admin.created", extra={"username": username})
            return

        changed = False
        if not user.check_password(password):
            user.set_password(password)
            changed = True
        if not (user.is_staff and user.is_superuser and user.is_active):
            user.is_staff = user.is_superuser = user.is_active = True
            changed = True
        if changed:
            user.save()
            logger.info("ensure_admin.updated", extra={"username": username})
        else:
            logger.info("ensure_admin.unchanged", extra={"username": username})
