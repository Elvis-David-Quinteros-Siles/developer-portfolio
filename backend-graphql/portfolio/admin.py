"""Django admin: gestión completa del contenido (solo red interna)."""
from __future__ import annotations

from django.contrib import admin

from portfolio import models


class BaseAdmin(admin.ModelAdmin):
    """Muestra también los soft-deleted para poder restaurarlos."""

    readonly_fields = ("id", "created_at", "updated_at", "deleted_at")
    actions = ("soft_delete_selected", "restore_selected")

    def get_queryset(self, request):
        return self.model.all_objects.get_queryset()

    @admin.display(boolean=True, description="Eliminado")
    def is_deleted(self, obj) -> bool:
        return obj.deleted_at is not None

    @admin.action(description="Soft delete seleccionados")
    def soft_delete_selected(self, request, queryset):
        for obj in queryset:
            obj.soft_delete()

    @admin.action(description="Restaurar seleccionados")
    def restore_selected(self, request, queryset):
        queryset.update(deleted_at=None)


@admin.register(models.Profile)
class ProfileAdmin(BaseAdmin):
    list_display = ("full_name", "headline", "email", "location", "updated_at", "is_deleted")
    search_fields = ("full_name", "email")


@admin.register(models.SkillCategory)
class SkillCategoryAdmin(BaseAdmin):
    list_display = ("name", "slug", "display_order", "updated_at", "is_deleted")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("display_order",)


@admin.register(models.Skill)
class SkillAdmin(BaseAdmin):
    list_display = ("name", "category", "level", "years", "icon", "display_order", "is_deleted")
    list_filter = ("category", "level")
    search_fields = ("name",)
    list_select_related = ("category",)


class ProjectImageInline(admin.TabularInline):
    model = models.ProjectImage
    extra = 0


@admin.register(models.Project)
class ProjectAdmin(BaseAdmin):
    list_display = ("title", "slug", "featured", "display_order", "updated_at", "is_deleted")
    list_filter = ("featured",)
    search_fields = ("title", "slug", "summary")
    prepopulated_fields = {"slug": ("title",)}
    inlines = (ProjectImageInline,)


@admin.register(models.ProjectImage)
class ProjectImageAdmin(BaseAdmin):
    list_display = ("project", "url", "caption", "display_order", "is_deleted")
    list_select_related = ("project",)


@admin.register(models.Experience)
class ExperienceAdmin(BaseAdmin):
    list_display = ("role", "company", "start_date", "end_date", "display_order", "is_deleted")
    search_fields = ("company", "role")


@admin.register(models.Certification)
class CertificationAdmin(BaseAdmin):
    list_display = ("name", "issuer", "issue_date", "expires_at", "is_deleted")
    search_fields = ("name", "issuer")


@admin.register(models.Education)
class EducationAdmin(BaseAdmin):
    list_display = ("degree", "institution", "field", "start_date", "end_date", "is_deleted")
    search_fields = ("institution", "degree")


@admin.register(models.Post)
class PostAdmin(BaseAdmin):
    list_display = ("title", "slug", "published", "published_at", "reading_minutes", "is_deleted")
    list_filter = ("published",)
    search_fields = ("title", "slug", "excerpt")
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"


@admin.register(models.ArchitectureTopic)
class ArchitectureTopicAdmin(BaseAdmin):
    list_display = ("title", "slug", "category", "display_order", "is_deleted")
    list_filter = ("category",)
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(models.ContactMessage)
class ContactMessageAdmin(BaseAdmin):
    list_display = ("subject", "name", "email", "status", "ip_address", "created_at", "is_deleted")
    list_filter = ("status",)
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = BaseAdmin.readonly_fields + (
        "name", "email", "subject", "message", "ip_address", "user_agent",
    )
