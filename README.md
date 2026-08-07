# Portfolio — Plataforma de Portafolio Profesional Cloud-Native

<!-- Al publicar en GitHub, sustituye OWNER/REPO por tu ruta real -->
[![stack](https://github.com/OWNER/REPO/actions/workflows/stack.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/stack.yml)
[![gateway](https://github.com/OWNER/REPO/actions/workflows/gateway.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/gateway.yml)
[![backend-go](https://github.com/OWNER/REPO/actions/workflows/backend-go.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/backend-go.yml)
[![backend-graphql](https://github.com/OWNER/REPO/actions/workflows/backend-graphql.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/backend-graphql.yml)
[![frontend](https://github.com/OWNER/REPO/actions/workflows/frontend.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/frontend.yml)

Portafolio de ingeniería construido como **sistema de microservicios**: el
propio producto demuestra backend, arquitectura de software, sistemas
distribuidos y DevOps.

```
Cliente → Nginx → API Gateway (Go) → Go REST API (Gin) → Django + Strawberry GraphQL → PostgreSQL
                                                      ↘ Redis · Celery
```

## Servicios

| Servicio        | Tecnología                              | Rol                                            |
|-----------------|-----------------------------------------|------------------------------------------------|
| `nginx`         | Nginx 1.27                              | Edge: proxy, compresión, seguridad, HTTP/2     |
| `frontend`      | React 19 · TS · Vite · Tailwind · shadcn| SPA premium dark, SEO, animaciones             |
| `gateway`       | Go (stdlib)                             | Rate limiting (Redis), JWT, request-id, CORS   |
| `go-api`        | Go · Gin · Clean Architecture           | REST read-side + contacto, OpenAPI/Swagger     |
| `graphql-api`   | Django 5 · Strawberry · DataLoaders     | GraphQL, dueño del esquema, admin, media       |
| `celery-worker` | Celery · Redis                          | Tareas asíncronas (notificaciones)             |
| `postgres`      | PostgreSQL 16                           | Datos (UUID, soft delete, constraints, índices)|
| `redis`         | Redis 7                                 | Rate limit, cache, broker Celery               |

## Quick start

```bash
cp .env.example .env      # ajusta los secretos
docker compose up -d --build
# → http://localhost           (SPA)
# → http://localhost/api/v1/docs   (Swagger)
# → http://localhost/graphql      (GraphQL)
```

Solo se necesita Docker. Todo (Go, Python, Node) compila en multi-stage builds.

## Documentación

- [Arquitectura y diagrama](docs/ARCHITECTURE.md)
- [Contratos entre servicios](docs/CONTRACTS.md) — fuente de verdad
- [Diseño de base de datos](docs/DATABASE.md)
- [Decisiones (ADRs)](docs/adr/)
- [Guía de despliegue](docs/DEPLOYMENT.md)
- [Guía de desarrollo](docs/DEVELOPMENT.md)

## Principios aplicados

Clean Architecture (go-api) · Hexagonal (graphql-api) · CQRS a nivel de sistema
(Django write-side, Go read-side, ADR-0003) · Repository, Strategy, Adapter,
Decorator · SOLID/DRY/KISS/YAGNI · 12-factor · defensa en profundidad (JWT en
gateway **y** backends) · un único escritor por tabla · fail-open razonado en
rate limiting (ADR-0005).

## Seguridad

Redes Docker segmentadas (edge/internal/data, solo Nginx publica puerto),
imágenes distroless/non-root, JWT HS256, rate limiting por IP, CORS estricto,
cabeceras de seguridad, validación en todas las capas, secretos solo por
entorno, ReCaptcha preparado.
