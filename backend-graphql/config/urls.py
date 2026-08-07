"""Rutas HTTP del servicio (CONTRACTS.md §4).

- /graphql        → API GraphQL (CSRF exento: API token-based servicio-a-servicio)
- /health/        → liveness/readiness (chequea DB con SELECT 1)
- /django-admin/  → admin de Django (solo red interna)
- /media/         → archivos subidos; se sirve también con DEBUG=0 porque es
                    tráfico interno detrás del gateway (cache headers allí).
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, re_path
from django.views.decorators.csrf import csrf_exempt
from django.views.static import serve

from portfolio.gql.schema import schema
from portfolio.gql.views import PortfolioGraphQLView
from portfolio.views import health

graphql_view = csrf_exempt(
    PortfolioGraphQLView.as_view(
        schema=schema,
        graphql_ide="graphiql" if settings.DEBUG else None,  # GraphiQL solo con DEBUG
        multipart_uploads_enabled=True,  # mutation uploadImage(file: Upload!)
    )
)

urlpatterns = [
    path("graphql", graphql_view),
    path("graphql/", graphql_view),
    path("health/", health, name="health"),
    path("django-admin/", admin.site.urls),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    re_path(r"^django-static/(?P<path>.*)$", serve, {"document_root": settings.STATIC_ROOT}),
]
