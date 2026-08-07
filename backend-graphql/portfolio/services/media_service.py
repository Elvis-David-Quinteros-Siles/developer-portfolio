"""Caso de uso: subida de imágenes (mutation uploadImage, JWT admin).

Guarda en MEDIA_ROOT (/app/media, volumen compartido) y devuelve la URL
pública relativa (/media/...), servida por Django detrás del gateway.
"""
from __future__ import annotations

import logging
import posixpath
import uuid
from pathlib import PurePosixPath

from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone

from portfolio.services.exceptions import ValidationError

logger = logging.getLogger("portfolio.media")

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}


def save_image(uploaded_file) -> str:
    name = getattr(uploaded_file, "name", "") or ""
    extension = PurePosixPath(name.replace("\\", "/")).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Extensión no permitida '{extension or '?'}'. "
            f"Permitidas: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    size = getattr(uploaded_file, "size", None)
    if size is not None and size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise ValidationError(
            f"Archivo demasiado grande ({size} bytes; máx. {settings.MAX_UPLOAD_SIZE_BYTES})"
        )

    now = timezone.now()
    target = posixpath.join("uploads", f"{now:%Y/%m}", f"{uuid.uuid4().hex}{extension}")
    stored_name = default_storage.save(target, uploaded_file)
    url = settings.MEDIA_URL + stored_name
    logger.info("media.uploaded", extra={"path": stored_name, "size": size})
    return url
