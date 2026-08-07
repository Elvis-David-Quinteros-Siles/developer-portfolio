"""Consultas de contenido (read side del API GraphQL).

Solo objetos vivos (manager por defecto) y posts publicados.
Las funciones devuelven listas materializadas: los resolvers async las
invocan vía sync_to_async y no deben disparar lazy-loading posterior.
"""
from __future__ import annotations

from portfolio.models import (
    ArchitectureTopic,
    Certification,
    Education,
    Experience,
    Post,
    Profile,
    Project,
    SkillCategory,
)


def get_profile() -> Profile | None:
    return Profile.objects.order_by("created_at").first()


def list_projects(featured: bool | None = None) -> list[Project]:
    qs = Project.objects.all()
    if featured is not None:
        qs = qs.filter(featured=featured)
    return list(qs.order_by("display_order", "-created_at"))


def get_project(slug: str) -> Project | None:
    return Project.objects.filter(slug=slug).first()


def list_skill_categories() -> list[SkillCategory]:
    return list(SkillCategory.objects.order_by("display_order", "name"))


def list_experience() -> list[Experience]:
    return list(Experience.objects.order_by("display_order", "-start_date"))


def list_certifications() -> list[Certification]:
    return list(Certification.objects.order_by("-issue_date"))


def list_education() -> list[Education]:
    return list(Education.objects.order_by("-start_date"))


def published_posts_qs():
    return Post.objects.filter(published=True).order_by("-published_at", "-created_at")


def list_posts(*, limit: int, offset: int, tag: str | None = None) -> tuple[list[Post], bool, int]:
    """Devuelve (página, has_next, total). `tags__contains` usa el índice GIN."""
    qs = published_posts_qs()
    if tag:
        qs = qs.filter(tags__contains=[tag])
    total = qs.count()
    window = list(qs[offset : offset + limit + 1])
    has_next = len(window) > limit
    return window[:limit], has_next, total


def get_post(slug: str) -> Post | None:
    return published_posts_qs().filter(slug=slug).first()


def list_architecture_topics() -> list[ArchitectureTopic]:
    return list(ArchitectureTopic.objects.order_by("display_order", "title"))
