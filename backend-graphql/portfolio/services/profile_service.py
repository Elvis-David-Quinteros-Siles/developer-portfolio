"""Caso de uso: actualización del perfil (mutation updateProfile, JWT admin)."""
from __future__ import annotations

import logging

from portfolio.models import Profile
from portfolio.services.exceptions import NotFoundError, ValidationError

logger = logging.getLogger("portfolio.profile")

# Campos permitidos para actualización parcial.
UPDATABLE_FIELDS = {
    "full_name",
    "headline",
    "bio",
    "photo_url",
    "cv_url",
    "github_url",
    "linkedin_url",
    "email",
    "location",
    "philosophy",
}


def update_profile(changes: dict) -> Profile:
    """Aplica una actualización parcial sobre el perfil singleton."""
    unknown = set(changes) - UPDATABLE_FIELDS
    if unknown:
        raise ValidationError(f"Campos no actualizables: {sorted(unknown)}")

    profile = Profile.objects.order_by("created_at").first()
    if profile is None:
        raise NotFoundError("No existe un perfil; ejecute seed_demo o créelo en el admin")

    for name in ("full_name", "headline"):
        if name in changes and not str(changes[name] or "").strip():
            raise ValidationError(f"'{name}' no puede quedar vacío")

    for field, value in changes.items():
        setattr(profile, field, value if value is not None else "")

    profile.save(update_fields=[*changes.keys(), "updated_at"])
    logger.info("profile.updated", extra={"fields": sorted(changes.keys())})
    return profile
