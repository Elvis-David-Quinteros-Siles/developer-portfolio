# backend-go (go-api)

REST API del portafolio en **Go 1.23 + Gin** con **Clean Architecture**.
Es el *read side* del sistema (CQRS a nivel de sistema, ADR-0003): consume las
tablas de PostgreSQL en **solo lectura** y delega la única escritura (contacto)
a Django vía la mutation GraphQL `submitContact`.

## Estructura (regla de dependencia → `domain`)

```
backend-go/
├── cmd/
│   ├── api/            # main: composición (DI manual por constructores)
│   └── healthcheck/    # binario estático para el healthcheck de compose
├── internal/
│   ├── domain/         # entidades + puertos (interfaces). CERO deps externas
│   ├── usecase/        # casos de uso (dependen solo de domain) + tests
│   ├── adapter/
│   │   ├── http/       # handlers Gin, DTOs, middleware, Swagger UI embebido
│   │   └── notifier/   # cliente HTTP → mutation GraphQL de Django (Adapter)
│   └── infrastructure/ # postgres (pgx/v5), config (env), logger (slog), jwt
└── api/                # openapi.yaml escrito a mano + embed
```

## Endpoints (prefijo `/api/v1`, ver CONTRACTS §3)

| Método | Ruta                      | Auth | Notas                                   |
|--------|---------------------------|------|-----------------------------------------|
| GET    | `/profile`                | —    | Singleton                               |
| GET    | `/projects`               | —    | `?featured=true`                        |
| GET    | `/projects/:slug`         | —    | Incluye galería `project_image`         |
| GET    | `/skills`                 | —    | Categorías con skills anidadas (1 JOIN) |
| GET    | `/experience`             | —    | Actual primero, luego desc              |
| GET    | `/architecture`           | —    | Topics de arquitectura                  |
| GET    | `/certifications`         | —    | Desc por fecha                          |
| GET    | `/education`              | —    | Desc por fecha                          |
| POST   | `/contact`                | —    | Delegado a Django (202 / 503 / 502)     |
| POST   | `/auth/login`             | —    | JWT HS256, TTL 1 h (ADR-0004)           |
| GET    | `/admin/contact-messages` | JWT  | Paginado `?page&page_size`              |
| GET    | `/openapi.yaml` `/docs`   | —    | OpenAPI 3 + Swagger UI                  |
| GET    | `/healthz` `/readyz`      | —    | En la raíz, fuera de `/api/v1`          |

- Éxito: envelope `{ "data": ..., "meta": { "request_id", "timestamp" } }`
  (los listados paginados añaden `meta.pagination`).
- Errores: **RFC 7807** (`application/problem+json`); la validación de dominio
  usa 422 con el miembro de extensión `errors` (campo → mensaje).
- Todas las lecturas filtran `deleted_at IS NULL`.

## Flujo de contacto (CONTRACTS §6)

`POST /contact` valida (binding + reglas de dominio: name 2–120,
email RFC 5322 ≤254, subject 3–200, message 10–5000) y llama a
`GRAPHQL_API_URL/graphql` con `X-Internal-Token` y timeout de **5 s**,
propagando `X-Request-ID`, la IP (primer valor de `X-Forwarded-For`) y el
`User-Agent`. Respuestas: 202 con el id; 503 si Django no responde; 502 si
Django rechaza la mutation. **Nunca escribe en PostgreSQL.**

## Variables de entorno

`PORT` (8080), `GIN_MODE`, `DATABASE_URL`*, `GRAPHQL_API_URL`*,
`INTERNAL_SERVICE_TOKEN`*, `JWT_SECRET`*, `ADMIN_USERNAME`*,
`ADMIN_PASSWORD`*, `LOG_LEVEL` (info). Las marcadas con * son obligatorias:
el proceso falla rápido si faltan.

## Build, tests y ejecución

Go no necesita estar instalado en el host; todo pasa por Docker:

```bash
# regenerar go.sum si cambian dependencias
docker run --rm -v "C:\dtic\portafolio\backend-go:/app" -w /app golang:1.23-alpine go mod tidy

# imagen (el stage `test` ejecuta go vet + go test; si fallan no hay imagen)
docker build -t portfolio-go-api .

# suite de tests aislada
docker build --target test .
```

Imagen final: **distroless static (nonroot, sin shell)** con dos binarios:
`/app/api` (ENTRYPOINT) y `/app/healthcheck` (usado por el `healthcheck` de
docker-compose: `["CMD", "/app/healthcheck"]`).

## Observabilidad y operación

- Logs JSON (`log/slog`) a stdout con `request_id`, `status`, `latency_ms`.
- `X-Request-ID` se propaga entrante → logs → llamada a Django.
- Recovery middleware: panic → RFC 7807 500 (sin caída del proceso).
- Graceful shutdown (SIGTERM/SIGINT, drenado 10 s) y context propagation en
  todas las queries (pgx) y llamadas salientes.
- `/readyz` hace ping real al pool de pgx; `/healthz` es liveness puro.
