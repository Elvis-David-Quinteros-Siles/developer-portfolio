"""DataLoaders por request: baten los FK y eliminan N+1.

- skills_by_category: SkillCategory.id -> [Skill]
- images_by_project:  Project.id      -> [ProjectImage]

Los load_fn son async (requisito de strawberry.dataloader); el acceso ORM
se hace dentro de sync_to_async porque Django prohíbe ORM en el event loop.
"""
from __future__ import annotations

import uuid
from collections import defaultdict

from asgiref.sync import sync_to_async
from strawberry.dataloader import DataLoader

from portfolio.models import ProjectImage, Skill


async def _load_skills_by_category(keys: list[uuid.UUID]) -> list[list[Skill]]:
    def fetch() -> dict[uuid.UUID, list[Skill]]:
        grouped: dict[uuid.UUID, list[Skill]] = defaultdict(list)
        qs = Skill.objects.filter(category_id__in=keys).order_by("display_order", "name")
        for skill in qs:
            grouped[skill.category_id].append(skill)
        return grouped

    grouped = await sync_to_async(fetch)()
    return [grouped.get(key, []) for key in keys]


async def _load_images_by_project(keys: list[uuid.UUID]) -> list[list[ProjectImage]]:
    def fetch() -> dict[uuid.UUID, list[ProjectImage]]:
        grouped: dict[uuid.UUID, list[ProjectImage]] = defaultdict(list)
        qs = ProjectImage.objects.filter(project_id__in=keys).order_by("display_order", "created_at")
        for image in qs:
            grouped[image.project_id].append(image)
        return grouped

    grouped = await sync_to_async(fetch)()
    return [grouped.get(key, []) for key in keys]


class Loaders:
    """Instanciado por request (ver PortfolioGraphQLView.get_context)."""

    def __init__(self) -> None:
        self.skills_by_category: DataLoader = DataLoader(load_fn=_load_skills_by_category)
        self.images_by_project: DataLoader = DataLoader(load_fn=_load_images_by_project)
