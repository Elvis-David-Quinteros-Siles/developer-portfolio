# backend-graphql — API GraphQL (Django 5 + Strawberry + Celery)

Servicio **write side y dueño único del esquema** de PostgreSQL (ADR-0003).
Expone la API GraphQL del portfolio, sirve `/media/`, procesa el flujo de
contacto delegado por `go-api` y notifica de forma asíncrona vía Celery.

## Stack

| Componente | Elección | Nota |
|---|---|---|
| Framework | Django 5.2 LTS | ORM = migraciones = esquema (ADR-0003) |
| GraphQL | Strawberry (`AsyncGraphQLView`) | DataLoaders por request; ORM vía `sync_to_async` |
| Tareas | Celery 5.5 (`-A config`) | broker y result backend = `REDIS_URL` |
| Cache | django-redis | mismo `REDIS_URL` |
| DB | PostgreSQL 16 (psycopg 3) | `DATABASE_URL` |
| Servidor | gunicorn (WSGI, 2 workers) | puerto interno 8000 |

## Estructura (hexagonal)

```
config/                  # settings 12-factor, celery, urls, wsgi
portfolio/
├── models.py            # esquema EXACTO de docs/DATABASE.md (db_table sin prefijo)
├── gql/                 # adaptador GraphQL: types, inputs, loaders, permisos, schema
├── services/            # application layer: casos de uso puros (resolvers finos)
│   ├── contact_service  # validación + recaptcha + persistencia + encolado
│   ├── auth_service     # credenciales env → JWT HS256 (sub/role=admin/exp 1h)
│   ├── profile_service  # updateProfile (parcial)
│   ├── media_service    # uploadImage → /app/media
│   ├── content_service  # consultas de lectura (solo vivos / publicados)
│   ├── recaptcha        # vacío ⇒ off; fail-closed si Google no responde
│   └── notifications    # puerto EmailNotifier + adaptadores (log JSON, stub SMTP)
├── tasks.py             # notify_contact_message (retries con backoff exponencial)
├── middleware.py        # X-Request-ID + access log JSON (latency_ms, status)
├── observability.py     # JsonFormatter + ContextVar request_id
└── management/commands/ # wait_for_db, seed_demo, ensure_admin, export_schema
```

## Endpoints

| Ruta | Descripción |
|---|---|
| `POST /graphql` | API GraphQL (CSRF exento; GraphiQL solo con `DJANGO_DEBUG=1`) |
| `GET /health/` | 200 `{"status": "ok"}` — incluye `SELECT 1` a la DB |
| `/django-admin/` | Admin de Django (solo red interna) |
| `/media/*` | Archivos subidos (servidos también con DEBUG=0: tráfico interno tras el gateway) |

## Seguridad de mutations

- `submitContact` — exige header `X-Internal-Token == INTERNAL_SERVICE_TOKEN`
  (solo la invoca go-api; comparación en tiempo constante).
- `adminLogin` — credenciales `ADMIN_USERNAME`/`ADMIN_PASSWORD` → JWT HS256
  firmado con `JWT_SECRET`, claims `sub`, `role=admin`, `exp` 1 h.
- `updateProfile`, `uploadImage` — `Authorization: Bearer <JWT admin>`
  (permiso reutilizable `IsAdmin`).

## Modelo de datos

Todas las tablas heredan de `BaseModel`: `id` UUID (default en Django;
la DB tiene además `pgcrypto` como respaldo), `created_at`/`updated_at`
automáticos y **soft delete** (`deleted_at`; manager por defecto filtra
vivos, `all_objects` sin filtro, `.soft_delete()`). Constraints CHECK,
índices parciales (`WHERE deleted_at IS NULL`, `featured`, `published`)
y GIN sobre `post.tags` se declaran en `Meta` y viven en las migraciones.

## Arranque del contenedor (`entrypoint.sh`)

1. `wait_for_db` (loop corto) → 2. `migrate` → 3. `seed_demo` (idempotente:
solo crea lo que falta; `--refresh` restaura el demo canónico) →
4. `ensure_admin` (superusuario desde env) → 5. `exec gunicorn`.
Si el comando es `celery ...` (worker), solo espera la DB y ejecuta.

## Comandos útiles (vía Docker; no se requiere Python en el host)

```bash
# Build
docker build -t portfolio-graphql ./backend-graphql

# Chequeo del proyecto (env dummies: no necesita DB accesible)
docker run --rm --entrypoint python \
  -e DJANGO_SECRET_KEY=x -e DATABASE_URL=postgres://x:x@localhost:5432/x \
  -e REDIS_URL=redis://localhost:6379/0 -e JWT_SECRET=x -e INTERNAL_SERVICE_TOKEN=x \
  portfolio-graphql manage.py check

# Regenerar migraciones (escribe en el repo montado)
docker run --rm --user root -v "$PWD/backend-graphql:/app" \
  -e DJANGO_SECRET_KEY=x -e DATABASE_URL=postgres://x:x@localhost:5432/x \
  -e REDIS_URL=redis://localhost:6379/0 -e JWT_SECRET=x -e INTERNAL_SERVICE_TOKEN=x \
  --entrypoint python portfolio-graphql manage.py makemigrations portfolio

# Exportar el SDL (mantener schema.graphql versionado)
docker run --rm --user root -v "$PWD/backend-graphql:/app" \
  -e DJANGO_SECRET_KEY=x -e DATABASE_URL=postgres://x:x@localhost:5432/x \
  -e REDIS_URL=redis://localhost:6379/0 -e JWT_SECRET=x -e INTERNAL_SERVICE_TOKEN=x \
  --entrypoint python portfolio-graphql manage.py export_schema --output /app/schema.graphql
```

## Variables de entorno

Ver `.env.example` en la raíz. Requeridas: `DJANGO_SECRET_KEY`,
`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`
(el arranque falla explícitamente si faltan). Opcionales:
`DJANGO_DEBUG` (default 0), `DJANGO_ALLOWED_HOSTS` (se añade siempre
loopback para el healthcheck), `ADMIN_USERNAME`/`ADMIN_PASSWORD`,
`RECAPTCHA_SECRET_KEY` (vacío ⇒ off), `NOTIFIER_BACKEND` (`log` | `smtp`),
`LOG_LEVEL`.

## Observabilidad

Logs JSON a stdout con `request_id` (header `X-Request-ID` propagado por el
gateway y devuelto en la respuesta), `latency_ms` y `status` por request.
El worker Celery usa el mismo formatter (no secuestra el root logger).
