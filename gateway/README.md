# gateway

API Gateway del portfolio (Go, stdlib `net/http` + `httputil.ReverseProxy`).
Segunda capa tras Nginx (ADR-0001): concentra las políticas transversales
programables para que los backends queden simples.

## Responsabilidad

- **Enrutamiento** (CONTRACTS.md §2): `/api/v1/*` → go-api, `/graphql` y
  `/media/*` → graphql-api. `/media/*` añade `Cache-Control` por defecto.
- **Auth en el borde** (ADR-0004): `/api/v1/admin/*` exige JWT HS256 válido
  (`Bearer`, firma con `JWT_SECRET`, `exp` obligatorio, `role=admin`); si
  falla responde `401` RFC 7807.
- **Rate limiting** (ADR-0005): ventana deslizante en Redis, por IP.
  Global por minuto y adicional para `POST /api/v1/contact` por hora.
  Al exceder: `429 application/problem+json` + `Retry-After`. Si Redis no
  responde: **fail-open** con warning.
- **Observabilidad** (CONTRACTS.md §8): genera/propaga `X-Request-ID`,
  logs JSON por request (`request_id`, `method`, `path`, `status`,
  `latency_ms`, `ip`) con `log/slog`.
- **CORS** dinámico por entorno, con respuesta de preflight.
- **Health**: `GET /healthz` (liveness) y `GET /readyz` (readiness; hace ping
  a Redis pero reporta ready aunque esté caído — fail-open). No se proxean.

## Variables de entorno

| Variable             | Default                   | Descripción                                  |
|----------------------|---------------------------|----------------------------------------------|
| `PORT`               | `8080`                    | Puerto de escucha                            |
| `GO_API_URL`         | `http://go-api:8080`      | Backend REST                                 |
| `GRAPHQL_API_URL`    | `http://graphql-api:8000` | Backend GraphQL / media                      |
| `REDIS_URL`          | — (vacío ⇒ limiter off)   | p. ej. `redis://:pass@redis:6379/0`          |
| `JWT_SECRET`         | **requerida**             | Secreto HS256 compartido                     |
| `CORS_ORIGINS`       | — (vacío ⇒ sin CORS)      | Orígenes permitidos, separados por coma      |
| `RATE_LIMIT_GLOBAL`  | `100`                     | Req/min por IP (0 desactiva)                 |
| `RATE_LIMIT_CONTACT` | `5`                       | Req/hora por IP a `POST /api/v1/contact`     |
| `LOG_LEVEL`          | `info`                    | `debug`/`info`/`warn`/`error`                |

## Cómo correr

Como parte del stack (recomendado):

```sh
docker compose up -d --build gateway
```

Solo esta imagen (los tests corren dentro del build):

```sh
docker build -t portfolio-gateway ./gateway
docker run --rm -p 8080:8080 -e JWT_SECRET=dev-secret portfolio-gateway
```

Tests durante el desarrollo (no requiere Go en el host):

```sh
docker run --rm -v "$PWD/gateway:/app" -w /app golang:1.23-alpine go test ./...
```

## Estructura

```
cmd/gateway/       binario principal
cmd/healthcheck/   probe del contenedor (la imagen distroless no tiene shell)
internal/config/   carga de configuración por entorno
internal/middleware/  request-id, logging, CORS, auth JWT, rate limit (decorator)
internal/proxy/    reverse proxies hacia los backends
internal/ratelimit/  estrategia Limiter + sliding window en Redis (strategy)
internal/problem/  errores RFC 7807
```
