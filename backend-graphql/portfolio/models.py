"""Modelos = DATABASE.md al pie de la letra.

- `db_table` explícito SIN prefijo de app.
- BaseModel abstracto: id UUID (default lo pone Django; la DB además tiene
  pgcrypto/gen_random_uuid como default de respaldo vía init SQL),
  created_at/updated_at automáticos, deleted_at (soft delete).
- Managers: `objects` filtra vivos; `all_objects` sin filtro.
- Constraints CHECK e índices (parciales y GIN) declarados en Meta para que
  las migraciones de Django — dueño único del esquema (ADR-0003) — los creen.
"""
from __future__ import annotations

import uuid

from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.db.models import F, Q, Value
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=True)

    def delete(self):  # soft delete masivo: nunca DELETE físico
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    """Manager por defecto: solo objetos vivos (deleted_at IS NULL)."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return super().get_queryset().filter(deleted_at__isnull=True)


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, default=None)

    objects = SoftDeleteManager()  # default: filtra vivos
    all_objects = models.Manager()  # sin filtro (admin / auditoría / FKs)

    class Meta:
        abstract = True
        # Acceso vía relaciones (FK) sin filtro implícito: evita objetos
        # "fantasma" al navegar desde padres soft-deleted.
        base_manager_name = "all_objects"

    def soft_delete(self) -> None:
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def delete(self, using=None, keep_parents=False):  # noqa: D102
        self.soft_delete()

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)


class Profile(BaseModel):
    """Singleton lógico: un único perfil vivo (índice único sobre constante)."""

    full_name = models.CharField(max_length=200)
    headline = models.CharField(max_length=300)
    bio = models.TextField(blank=True, default="")
    photo_url = models.CharField(max_length=500, blank=True, default="")
    cv_url = models.CharField(max_length=500, blank=True, default="")
    github_url = models.CharField(max_length=500, blank=True, default="")
    linkedin_url = models.CharField(max_length=500, blank=True, default="")
    email = models.EmailField(max_length=254, blank=True, default="")
    location = models.CharField(max_length=200, blank=True, default="")
    philosophy = models.TextField(blank=True, default="")

    class Meta(BaseModel.Meta):
        db_table = "profile"
        constraints = [
            models.UniqueConstraint(
                Value(1),
                condition=Q(deleted_at__isnull=True),
                name="profile_singleton_uq",
            ),
        ]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="profile_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.full_name


class SkillCategory(BaseModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    display_order = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "skill_category"
        ordering = ["display_order", "name"]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="skill_category_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class Skill(BaseModel):
    category = models.ForeignKey(
        SkillCategory, on_delete=models.RESTRICT, related_name="skills", db_column="category_id"
    )
    name = models.CharField(max_length=120)
    icon = models.CharField(max_length=120, blank=True, default="", help_text="Slug de icono, ej. simple-icons:go")
    level = models.PositiveSmallIntegerField(default=3)
    years = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    description = models.TextField(blank=True, default="")
    display_order = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "skill"
        ordering = ["display_order", "name"]
        constraints = [
            models.CheckConstraint(condition=Q(level__gte=1) & Q(level__lte=5), name="skill_level_between_1_5"),
            models.CheckConstraint(condition=Q(years__gte=0), name="skill_years_gte_0"),
        ]
        indexes = [
            models.Index(fields=["category", "display_order"], name="skill_cat_order_idx"),
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="skill_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class Project(BaseModel):
    slug = models.SlugField(max_length=160, unique=True)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True, default="", help_text="Markdown")
    problem = models.TextField(blank=True, default="")
    solution = models.TextField(blank=True, default="")
    outcome = models.TextField(blank=True, default="")
    stack = models.JSONField(default=list, blank=True, help_text="Array de strings")
    image_url = models.CharField(max_length=500, blank=True, default="")
    architecture_diagram_url = models.CharField(max_length=500, blank=True, default="")
    github_url = models.CharField(max_length=500, blank=True, default="")
    demo_url = models.CharField(max_length=500, blank=True, default="")
    video_url = models.CharField(max_length=500, blank=True, default="")
    featured = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "project"
        ordering = ["display_order", "-created_at"]
        indexes = [
            models.Index(
                fields=["featured"],
                condition=Q(featured=True) & Q(deleted_at__isnull=True),
                name="project_featured_idx",
            ),
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="project_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.title


class ProjectImage(BaseModel):
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="images", db_column="project_id"
    )
    url = models.CharField(max_length=500)
    caption = models.CharField(max_length=300, blank=True, default="")
    display_order = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "project_image"
        ordering = ["display_order", "created_at"]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="project_image_alive_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.project_id}:{self.url}"


class Experience(BaseModel):
    company = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    location = models.CharField(max_length=200, blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # NULL => actual
    description = models.TextField(blank=True, default="")
    achievements = models.JSONField(default=list, blank=True)
    tech = models.JSONField(default=list, blank=True)
    display_order = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "experience"
        ordering = ["display_order", "-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gte=F("start_date")),
                name="experience_dates_chk",
            ),
        ]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="experience_alive_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.role} @ {self.company}"


class Certification(BaseModel):
    name = models.CharField(max_length=200)
    issuer = models.CharField(max_length=200)
    issue_date = models.DateField()
    expires_at = models.DateField(null=True, blank=True)
    credential_id = models.CharField(max_length=200, blank=True, default="")
    credential_url = models.CharField(max_length=500, blank=True, default="")
    badge_url = models.CharField(max_length=500, blank=True, default="")

    class Meta(BaseModel.Meta):
        db_table = "certification"
        ordering = ["-issue_date"]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="certification_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.name


class Education(BaseModel):
    institution = models.CharField(max_length=200)
    degree = models.CharField(max_length=200)
    field = models.CharField(max_length=200, blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default="")

    class Meta(BaseModel.Meta):
        db_table = "education"
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gte=F("start_date")),
                name="education_dates_chk",
            ),
        ]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="education_alive_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.degree} — {self.institution}"


class Post(BaseModel):
    slug = models.SlugField(max_length=160, unique=True)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=500, blank=True, default="")
    content = models.TextField(blank=True, default="", help_text="Markdown")
    cover_url = models.CharField(max_length=500, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    reading_minutes = models.PositiveSmallIntegerField(default=5)

    class Meta(BaseModel.Meta):
        db_table = "post"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(
                fields=["-published_at"],
                condition=Q(published=True) & Q(deleted_at__isnull=True),
                name="post_published_idx",
            ),
            GinIndex(fields=["tags"], name="post_tags_gin"),
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="post_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.title


class ArchitectureTopic(BaseModel):
    slug = models.SlugField(max_length=160, unique=True)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=120, blank=True, default="", help_text="patterns | infra | observability")
    description = models.TextField(blank=True, default="", help_text="Markdown")
    diagram_url = models.CharField(max_length=500, blank=True, default="")
    display_order = models.IntegerField(default=0)

    class Meta(BaseModel.Meta):
        db_table = "architecture_topic"
        ordering = ["display_order", "title"]
        indexes = [
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="arch_topic_alive_idx"),
        ]

    def __str__(self) -> str:
        return self.title


class ContactMessage(BaseModel):
    class Status(models.TextChoices):
        NEW = "new", "Nuevo"
        READ = "read", "Leído"
        REPLIED = "replied", "Respondido"

    name = models.CharField(max_length=200)
    email = models.EmailField(max_length=254)
    subject = models.CharField(max_length=300)
    message = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)  # inet NULL
    user_agent = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)

    class Meta(BaseModel.Meta):
        db_table = "contact_message"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(status__in=["new", "read", "replied"]),
                name="contact_status_chk",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-created_at"], name="contact_status_created_idx"),
            models.Index(fields=["id"], condition=Q(deleted_at__isnull=True), name="contact_msg_alive_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.subject} <{self.email}>"
