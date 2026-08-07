"""Schema Strawberry (CONTRACTS §4).

Resolvers finos: delegan en portfolio/services (application layer, estilo
hexagonal). ORM siempre vía sync_to_async (ejecución async + WSGI).
"""
from __future__ import annotations

import base64
import binascii
import logging
from typing import Optional

import strawberry
from asgiref.sync import sync_to_async
from graphql import GraphQLError
from strawberry.file_uploads import Upload

from portfolio.gql.inputs import ContactInput, ProfileInput
from portfolio.gql.permissions import IsAdmin, IsInternalService
from portfolio.gql.types import (
    ArchitectureTopicType,
    AuthPayloadType,
    CertificationType,
    ContactMessageType,
    EducationType,
    ExperienceType,
    PageInfo,
    PostConnection,
    PostEdge,
    PostType,
    ProfileType,
    ProjectType,
    SkillCategoryType,
)
from portfolio.services import (
    auth_service,
    contact_service,
    content_service,
    media_service,
    profile_service,
)
from portfolio.services.exceptions import DomainError

logger = logging.getLogger("portfolio.gql")

MAX_PAGE_SIZE = 50
DEFAULT_PAGE_SIZE = 10
_CURSOR_PREFIX = "offset:"


def _encode_cursor(offset: int) -> str:
    return base64.b64encode(f"{_CURSOR_PREFIX}{offset}".encode()).decode()


def _decode_cursor(cursor: Optional[str]) -> int:
    if not cursor:
        return 0
    try:
        raw = base64.b64decode(cursor.encode(), validate=True).decode()
        if not raw.startswith(_CURSOR_PREFIX):
            raise ValueError(raw)
        offset = int(raw[len(_CURSOR_PREFIX):])
        if offset < 0:
            raise ValueError(offset)
        return offset
    except (ValueError, binascii.Error, UnicodeDecodeError) as exc:
        raise GraphQLError(
            "Cursor inválido", extensions={"code": "BAD_USER_INPUT"}
        ) from exc


def _domain_error(exc: DomainError) -> GraphQLError:
    return GraphQLError(str(exc), extensions={"code": exc.code})


@strawberry.type
class Query:
    @strawberry.field(description="Perfil (singleton).")
    async def profile(self) -> Optional[ProfileType]:
        return await sync_to_async(content_service.get_profile)()

    @strawberry.field(description="Proyectos vivos; filtro opcional por destacados.")
    async def projects(self, featured: Optional[bool] = None) -> list[ProjectType]:
        return await sync_to_async(content_service.list_projects)(featured)

    @strawberry.field(description="Detalle de proyecto por slug.")
    async def project(self, slug: str) -> Optional[ProjectType]:
        return await sync_to_async(content_service.get_project)(slug)

    @strawberry.field(description="Categorías con skills anidadas (DataLoader).")
    async def skill_categories(self) -> list[SkillCategoryType]:
        return await sync_to_async(content_service.list_skill_categories)()

    @strawberry.field(description="Experiencia ordenada descendente.")
    async def experience(self) -> list[ExperienceType]:
        return await sync_to_async(content_service.list_experience)()

    @strawberry.field
    async def certifications(self) -> list[CertificationType]:
        return await sync_to_async(content_service.list_certifications)()

    @strawberry.field
    async def education(self) -> list[EducationType]:
        return await sync_to_async(content_service.list_education)()

    @strawberry.field(description="Posts publicados; paginación por cursor y filtro por tag.")
    async def posts(
        self,
        first: int = DEFAULT_PAGE_SIZE,
        after: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> PostConnection:
        first = max(1, min(first, MAX_PAGE_SIZE))
        offset = _decode_cursor(after)
        items, has_next, total = await sync_to_async(content_service.list_posts)(
            limit=first, offset=offset, tag=tag
        )
        edges = [
            PostEdge(node=post, cursor=_encode_cursor(offset + index + 1))
            for index, post in enumerate(items)
        ]
        return PostConnection(
            edges=edges,
            page_info=PageInfo(
                has_next_page=has_next,
                end_cursor=edges[-1].cursor if edges else None,
            ),
            total_count=total,
        )

    @strawberry.field(description="Post publicado por slug.")
    async def post(self, slug: str) -> Optional[PostType]:
        return await sync_to_async(content_service.get_post)(slug)

    @strawberry.field
    async def architecture_topics(self) -> list[ArchitectureTopicType]:
        return await sync_to_async(content_service.list_architecture_topics)()


@strawberry.type
class Mutation:
    @strawberry.mutation(
        permission_classes=[IsInternalService],
        description="Recibe un mensaje de contacto (solo go-api, X-Internal-Token).",
    )
    async def submit_contact(self, input: ContactInput) -> ContactMessageType:
        try:
            return await sync_to_async(contact_service.submit_contact)(
                name=input.name,
                email=input.email,
                subject=input.subject,
                message=input.message,
                ip_address=input.ip_address,
                user_agent=input.user_agent,
                recaptcha_token=input.recaptcha_token,
            )
        except DomainError as exc:
            raise _domain_error(exc) from exc

    @strawberry.mutation(description="Credenciales admin (env) → JWT HS256, exp 1h.")
    async def admin_login(self, username: str, password: str) -> AuthPayloadType:
        try:
            token, expires_at = await sync_to_async(auth_service.login)(username, password)
        except DomainError as exc:
            raise _domain_error(exc) from exc
        return AuthPayloadType(token=token, token_type="Bearer", expires_at=expires_at)

    @strawberry.mutation(
        permission_classes=[IsAdmin],
        description="Actualización parcial del perfil (JWT admin).",
    )
    async def update_profile(self, input: ProfileInput) -> ProfileType:
        try:
            return await sync_to_async(profile_service.update_profile)(input.changes())
        except DomainError as exc:
            raise _domain_error(exc) from exc

    @strawberry.mutation(
        permission_classes=[IsAdmin],
        description="Sube una imagen a /app/media y devuelve su URL (/media/...).",
    )
    async def upload_image(self, file: Upload) -> str:
        try:
            return await sync_to_async(media_service.save_image)(file)
        except DomainError as exc:
            raise _domain_error(exc) from exc


schema = strawberry.Schema(query=Query, mutation=Mutation)
