# Guía de Despliegue

## Requisitos
- Docker Engine 24+ con Compose v2. Nada más: todos los builds son multi-stage.

## Producción en un host (VPS)

```bash
git clone <repo> && cd portfolio
cp .env.example .env
# Genera secretos reales:
#   openssl rand -hex 32   → JWT_SECRET, INTERNAL_SERVICE_TOKEN, DJANGO_SECRET_KEY
# Cambia POSTGRES_PASSWORD, REDIS_PASSWORD, ADMIN_PASSWORD.
# CORS_ORIGINS=https://tudominio.com
docker compose up -d --build
docker compose ps          # todos deben quedar healthy
```

El orden de arranque lo resuelven los health checks:
`postgres/redis → graphql-api (migra + seed) → go-api → gateway → nginx`.

### TLS
Termina TLS delante del compose con tu método preferido:
- **Recomendado:** Caddy o Traefik como proxy en el host apuntando a `:80`, o
- Añade certbot + certificados montados al servicio nginx (los `server_name` y
  el bloque 443 son el único cambio; HTTP/2 ya está activo).

### Operación
```bash
docker compose logs -f gateway        # logs JSON por servicio
docker compose exec graphql-api python manage.py createsuperuser
docker compose exec postgres pg_dump -U portfolio portfolio > backup.sql
docker compose pull && docker compose up -d --build   # actualizar
```

### Backups
Volúmenes con estado: `pgdata` (crítico), `media` (uploads), `redisdata`
(regenerable). Programa `pg_dump` + copia de `media` fuera del host.

## Kubernetes (mapa de migración — ADR-0006)

| Compose                    | Kubernetes                                  |
|----------------------------|---------------------------------------------|
| servicios app              | Deployment + Service + HPA                  |
| postgres / redis           | Servicio gestionado (RDS/Cloud SQL) o StatefulSet |
| nginx                      | Ingress Controller + cert-manager           |
| `.env`                     | ConfigMap + Secret (o External Secrets)     |
| `depends_on` + healthcheck | readiness/liveness probes + initContainers  |
| redes edge/internal/data   | NetworkPolicies                             |
| volumen `media`            | PVC u object storage (S3) tras un adapter   |

Los servicios ya son stateless y 12-factor: no requieren cambios de código.

## Checklist previa a producción
- [ ] Secretos regenerados (nunca los de `.env.example`)
- [ ] `DJANGO_DEBUG=0`, `GIN_MODE=release`
- [ ] `CORS_ORIGINS` y `DJANGO_ALLOWED_HOSTS` con el dominio real
- [ ] TLS activo y HTTP→HTTPS
- [ ] Backups de `pgdata` y `media` programados
- [ ] `docker compose ps` todo healthy tras el deploy
