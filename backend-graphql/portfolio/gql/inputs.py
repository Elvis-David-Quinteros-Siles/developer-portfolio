"""Inputs GraphQL (CONTRACTS §4)."""
from __future__ import annotations

from typing import Optional

import strawberry


@strawberry.input
class ContactInput:
    name: str
    email: str
    subject: str
    message: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    recaptcha_token: Optional[str] = None


@strawberry.input
class ProfileInput:
    """Actualización parcial: solo se aplican los campos provistos."""

    full_name: Optional[str] = strawberry.UNSET
    headline: Optional[str] = strawberry.UNSET
    bio: Optional[str] = strawberry.UNSET
    photo_url: Optional[str] = strawberry.UNSET
    cv_url: Optional[str] = strawberry.UNSET
    github_url: Optional[str] = strawberry.UNSET
    linkedin_url: Optional[str] = strawberry.UNSET
    email: Optional[str] = strawberry.UNSET
    location: Optional[str] = strawberry.UNSET
    philosophy: Optional[str] = strawberry.UNSET

    _FIELDS = (
        "full_name", "headline", "bio", "photo_url", "cv_url",
        "github_url", "linkedin_url", "email", "location", "philosophy",
    )

    def changes(self) -> dict:
        return {
            field: getattr(self, field)
            for field in self._FIELDS
            if getattr(self, field) is not strawberry.UNSET
        }
