"""Tipos GraphQL (Strawberry). Los resolvers devuelven instancias del ORM y
Strawberry resuelve los campos por atributo (mismo nombre snake_case →
camelCase en el schema). Las relaciones anidadas usan DataLoader."""
from __future__ import annotations

import datetime
import decimal
import uuid
from typing import Optional

import strawberry


@strawberry.type
class SkillType:
    id: uuid.UUID
    name: str
    icon: str
    level: int
    years: decimal.Decimal
    description: str
    display_order: int


@strawberry.type
class SkillCategoryType:
    id: uuid.UUID
    name: str
    slug: str
    display_order: int

    @strawberry.field
    async def skills(self, info: strawberry.Info) -> list[SkillType]:
        return await info.context.loaders.skills_by_category.load(self.id)


@strawberry.type
class ProjectImageType:
    id: uuid.UUID
    url: str
    caption: str
    display_order: int


@strawberry.type
class ProjectType:
    id: uuid.UUID
    slug: str
    title: str
    summary: str
    description: str
    problem: str
    solution: str
    outcome: str
    stack: list[str]
    image_url: str
    architecture_diagram_url: str
    github_url: str
    demo_url: str
    video_url: str
    featured: bool
    display_order: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    @strawberry.field
    async def images(self, info: strawberry.Info) -> list[ProjectImageType]:
        return await info.context.loaders.images_by_project.load(self.id)


@strawberry.type
class ProfileType:
    id: uuid.UUID
    full_name: str
    headline: str
    bio: str
    photo_url: str
    cv_url: str
    github_url: str
    linkedin_url: str
    email: str
    location: str
    philosophy: str
    updated_at: datetime.datetime


@strawberry.type
class ExperienceType:
    id: uuid.UUID
    company: str
    role: str
    location: str
    start_date: datetime.date
    end_date: Optional[datetime.date]
    description: str
    achievements: list[str]
    tech: list[str]
    display_order: int


@strawberry.type
class CertificationType:
    id: uuid.UUID
    name: str
    issuer: str
    issue_date: datetime.date
    expires_at: Optional[datetime.date]
    credential_id: str
    credential_url: str
    badge_url: str


@strawberry.type
class EducationType:
    id: uuid.UUID
    institution: str
    degree: str
    field: str
    start_date: datetime.date
    end_date: Optional[datetime.date]
    description: str


@strawberry.type
class PostType:
    id: uuid.UUID
    slug: str
    title: str
    excerpt: str
    content: str
    cover_url: str
    tags: list[str]
    published: bool
    published_at: Optional[datetime.datetime]
    reading_minutes: int


@strawberry.type
class PostEdge:
    node: PostType
    cursor: str


@strawberry.type
class PageInfo:
    has_next_page: bool
    end_cursor: Optional[str]


@strawberry.type
class PostConnection:
    edges: list[PostEdge]
    page_info: PageInfo
    total_count: int


@strawberry.type
class ArchitectureTopicType:
    id: uuid.UUID
    slug: str
    title: str
    category: str
    description: str
    diagram_url: str
    display_order: int


@strawberry.type
class ContactMessageType:
    id: uuid.UUID
    name: str
    email: str
    subject: str
    message: str
    status: str
    created_at: datetime.datetime


@strawberry.type
class AuthPayloadType:
    token: str
    token_type: str
    expires_at: datetime.datetime
