# Service Contracts — Source of Truth

> Este documento congela los contratos entre servicios. **Ningún servicio puede
> desviarse de lo aquí definido sin un ADR que lo justifique.**

## 1. Topología y puertos

| Servicio        | Imagen / Build        | Puerto interno | Expuesto al host | Redes                  |
|-----------------|-----------------------|:--------------:|:----------------:|------------------------|
| `nginx`         | `nginx/`              | 80             | **80**           | `edge`                 |
| `frontend`      | `frontend/`           | 8080           | —                | `edge`                 |
| `gateway`       | `gateway/`            | 8080           | —                | `edge`, `internal`, `data` |
| `go-api`        | `backend-go/`         | 8080           | —                | `internal`, `data`     |
| `graphql-api`   | `backend-graphql/`    | 8000           | —                | `internal`, `data`     |
| `celery-worker` | `backend-graphql/`    | —              | —                | `internal`, `data`     |
| `postgres`      | `postgres:16-alpine`  | 5432           | —                | `data`                 |
| `redis`         | `redis:7-alpine`      | 6379           | —                | `data`                 |

Solo `nginx` publica un puerto. Resolución por DNS interno de Docker
(`http://go-api:8080`, `http://graphql-api:8000`, etc.).

## 2. Enrutamiento

### Nginx (edge)
| Ruta            | Destino                  |
|-----------------|--------------------------|
| `/`             | `frontend:8080` (SPA)    |
| `/api/`         | `gateway:8080`           |
| `/graphql`      | `gateway:8080`           |
| `/media/`       | `gateway:8080`           |

### Gateway
| Ruta                  | Destino                       | Middleware                                  |
|-----------------------|-------------------------------|---------------------------------------------|
| `/api/v1/*`           | `go-api:8080/api/v1/*`        | request-id, logging, rate-limit, CORS       |
| `/graphql`            | `graphql-api:8000/graphql`    | request-id, logging, rate-limit, CORS       |
| `/media/*`            | `graphql-api:8000/media/*`    | cache headers                               |
| `/api/v1/admin/*`     | `go-api:8080/api/v1/admin/*`  | + validación JWT (HS256, `JWT_SECRET`)      |

El gateway propaga `X-Request-ID` (lo genera si no existe) y `X-Forwarded-For`.

## 3. API REST (go-api) — prefijo `/api/v1`

| Método | Ruta                    | Auth | Descripción                              |
|--------|-------------------------|------|------------------------------------------|
| GET    | `/profile`              | —    | Perfil (singleton)                       |
| GET    | `/projects`             | —    | Lista proyectos (`?featured=true`)       |
| GET    | `/projects/:slug`       | —    | Detalle de proyecto con imágenes         |
| GET    | `/skills`               | —    | Skills agrupadas por categoría           |
| GET    | `/experience`           | —    | Experiencia ordenada desc                |
| GET    | `/architecture`         | —    | Topics de arquitectura                   |
| GET    | `/certifications`       | —    | Certificaciones                          |
| GET    | `/education`            | —    | Educación                                |
| POST   | `/contact`              | —    | **Delegación → mutation GraphQL** (§6)   |
| POST   | `/auth/login`           | —    | Credenciales admin (env) → JWT           |
| GET    | `/admin/contact-messages` | JWT | Mensajes recibidos                       |
| GET    | `/healthz` `/readyz`    | —    | Liveness / readiness (fuera de `/api/v1`)|
| GET    | `/api/v1/docs/*`        | —    | Swagger UI (OpenAPI 3)                   |

**Envelope de respuesta:**
```json
{ "data": ..., "meta": { "request_id": "...", "timestamp": "..." } }
```
**Errores (RFC 7807):**
```json
{ "type": "about:blank", "title": "Not Found", "status": 404, "detail": "...", "instance": "/api/v1/projects/x" }
```

## 4. API GraphQL (graphql-api) — `/graphql`

**Queries:** `profile`, `projects(featured)`, `project(slug)`, `skillCategories`
(con skills anidadas vía DataLoader), `experience`, `certifications`, `education`,
`posts(first, after, tag)` (paginación cursor), `post(slug)`, `architectureTopics`.

**Mutations:** `submitContact(input)`, `adminLogin(username, password)`,
`updateProfile(input)` (JWT), `uploadImage(file: Upload)` (JWT).

Health: `GET /health/` → 200. Admin de Django en `/django-admin/` (solo red interna).

## 5. Base de datos

PostgreSQL 16, DB única `portfolio`. **Django es el dueño exclusivo del esquema**
(migraciones = Django ORM; ver ADR-0003). Go consume las tablas como sistema
externo vía repositorios. Nombres de tabla explícitos con `db_table` (sin prefijo
de app): `profile`, `skill_category`, `skill`, `project`, `project_image`,
`experience`, `certification`, `education`, `post`, `architecture_topic`,
`contact_message`. Esquema completo en [DATABASE.md](./DATABASE.md).

Convenciones obligatorias en toda tabla:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at`, `updated_at TIMESTAMPTZ NOT NULL`
- Soft delete: `deleted_at TIMESTAMPTZ NULL` + índice parcial `WHERE deleted_at IS NULL`
- Índices en slugs (únicos), FKs y columnas de filtrado.

## 6. Integración Go → Django (flujo de contacto)

```
Cliente → Nginx → Gateway (rate-limit Redis) → Go REST POST /api/v1/contact
  → valida payload (binding + reglas de dominio)
  → llama internamente a graphql-api: mutation submitContact (HTTP POST /graphql,
    header `X-Internal-Token: $INTERNAL_SERVICE_TOKEN`)
  → Django persiste contact_message + verifica ReCaptcha (si está configurado)
  → Django encola tarea Celery (notificación) en Redis
  → Go responde 202 Accepted con el id del mensaje
```
Este es el flujo Cliente → Nginx → Gateway → Go → Django → PostgreSQL del diagrama
de arquitectura. Timeout Go→Django: 5s; si Django no responde, Go devuelve 503
(RFC 7807) — nunca persiste por su cuenta (single writer, ADR-0003).

## 7. Variables de entorno (nombres canónicos)

Ver `.env.example` en la raíz. Claves compartidas:

| Variable                 | Usada por                    |
|--------------------------|------------------------------|
| `DATABASE_URL`           | go-api, graphql-api, celery  |
| `REDIS_URL`              | gateway, graphql-api, celery |
| `JWT_SECRET`             | gateway, go-api, graphql-api |
| `INTERNAL_SERVICE_TOKEN` | go-api, graphql-api          |
| `CORS_ORIGINS`           | gateway                      |
| `RECAPTCHA_SECRET_KEY`   | graphql-api (vacío ⇒ off)    |

## 8. Observabilidad

- Logs estructurados JSON a stdout en todos los servicios (`request_id`, `latency_ms`, `status`).
- Health checks HTTP en todos los contenedores (`healthcheck` en compose).
- `X-Request-ID` se propaga de extremo a extremo (nginx → gateway → go → django).
