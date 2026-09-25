# Guía de Despliegue

## Requisitos
- Docker Engine 24+ con Compose v2. Nada más: todos los builds son multi-stage.
- Para el despliegue con Postgres externo, Compose **v2.24+** (usa las etiquetas
  `!override`). Compruébalo con `docker compose version`.

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

## PostgreSQL externo (contenedor ya existente en el servidor)

El compose base trae su propio PostgreSQL, cómodo en desarrollo. En un servidor
que **ya tiene** un contenedor de PostgreSQL conviene reutilizarlo: una sola
instancia que respaldar, monitorear y actualizar. Dos instancias significan dos
rutinas de backup, y la que se olvida es la que se pierde.

`docker-compose.prod.yml` hace ese cambio: deja el `postgres` del proyecto tras
un perfil que nunca se activa, quita la espera a su health check y engancha los
tres servicios que hablan con la base (`go-api`, `graphql-api`, `celery-worker`)
a una red compartida con el contenedor existente.

> Los `make x` de esta guía son atajos. Si no tienes `make` (habitual en
> Windows), cada uno equivale a un comando directo: `make db-bootstrap` →
> `sh scripts/db-bootstrap.sh`, y `make prod-*` →
> `docker compose -f docker-compose.yml -f docker-compose.prod.yml <acción>`.
> Todos están en el [RUNBOOK](RUNBOOK.md#6-chuleta).

### Puesta en marcha

```bash
# 1. Configura el .env con los datos de la base que quieres usar
cp .env.example .env
#    POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD  → credenciales a crear
#    PG_CONTAINER=<nombre de tu contenedor de PostgreSQL>
#    DATABASE_URL=postgres://<user>:<pass>@<PG_CONTAINER>:5432/<db>?sslmode=disable
#    NGINX_PORT=8081   (si ya tienes un Nginx en el 80; ver § "Detrás de tu Nginx")
#    REGISTRY / IMAGE_PREFIX → donde publica el pipeline

# 2. Crea rol, base, pgcrypto, permisos y la red compartida (idempotente)
make db-bootstrap

# 3. Despliega
IMAGE_TAG=<sha> make prod-up
make prod-ps            # todo debe quedar healthy
```

`make db-bootstrap` (script `scripts/db-bootstrap.sh`) hace exactamente esto,
todo repetible sin efectos secundarios:

1. Crea el rol de la aplicación, o sincroniza su contraseña con el `.env`.
2. Crea la base con ese rol como dueño (si ya existe, no toca su contenido).
3. Habilita `pgcrypto` y le da la propiedad del schema `public` — **necesario en
   PostgreSQL 15+**, donde el rol público ya no puede crear objetos y `migrate`
   fallaría con `permission denied`.
4. Crea la red Docker compartida y engancha tu contenedor de PostgreSQL.
5. Verifica el login por TCP, la misma ruta de autenticación que usarán los
   contenedores de la aplicación.

No crea tablas: de eso se encarga el entrypoint de Django, que en cada arranque
ejecuta `migrate`, `seed_demo` y `ensure_admin`.

### Si tu PostgreSQL no está en una red de Docker

El script crea la red y conecta el contenedor por ti. Si prefieres hacerlo a
mano, son dos comandos:

```bash
docker network create portfolio-dbnet
docker network connect portfolio-dbnet <tu-contenedor-postgres>
```

Si en cambio tu PostgreSQL está publicado en el host (o es un servicio
gestionado), borra el bloque `networks.dbnet` de `docker-compose.prod.yml`, quita
`dbnet` de los tres servicios y apunta `DATABASE_URL` al host — con
`extra_hosts: ["host.docker.internal:host-gateway"]` en cada uno de esos
servicios si es el propio host. El archivo lleva esa alternativa comentada.

### Volver al Postgres embebido

El servicio sigue definido, solo desactivado por perfil:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile embedded-db up -d
```

### Detrás de tu Nginx del servidor

El Nginx del proyecto es el router del stack (`/` → SPA, `/api/` + `/graphql` +
`/media/` → gateway, cabeceras de seguridad, `X-Request-ID`), no un servidor de
estáticos. Se encadena detrás del Nginx del servidor, que se queda con TLS y los
dominios: pon `NGINX_PORT=8081` en el `.env` y delega todo en él.

```nginx
server {
    listen 443 ssl;
    server_name tudominio.com;
    # ... certificados ...
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Si tu Nginx también es un contenedor, conéctalo a la red `edge` del proyecto y
usa `proxy_pass http://portfolio-nginx-1:80` sin publicar ningún puerto.

### Backups con base externa

`make backup` apunta al contenedor del compose y ya no aplica. Con base externa:

```bash
docker exec -t <tu-contenedor-postgres> \
  pg_dump -U portfolio portfolio > backups/portfolio-$(date +%Y%m%d).sql
```

Sigue haciendo falta respaldar el volumen `media` (uploads), que continúa dentro
del compose.

## Correo del formulario de contacto

El mensaje **siempre** se persiste en PostgreSQL y se puede leer en el admin de
Django; el correo es solo el aviso. Por defecto ese aviso va al log del worker
(`NOTIFIER_BACKEND=log`), así que el formulario funciona desde el primer arranque
sin configurar nada — pero no te enteras de que llegó.

Para recibirlo por correo, en el `.env`:

```bash
NOTIFIER_BACKEND=smtp
NOTIFY_EMAIL_TO=tu@correo.com          # quien RECIBE los avisos
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=tu@gmail.com
EMAIL_HOST_PASSWORD=xxxxxxxxxxxxxxxx   # contraseña de aplicación, no la de la cuenta
EMAIL_USE_TLS=1
DEFAULT_FROM_EMAIL=tu@gmail.com
```

Reinicia `graphql-api` y `celery-worker` (quien envía es el worker).

Detalles que evitan sorpresas:

- **Gmail exige una contraseña de aplicación**, de 16 caracteres, y para generarla
  hace falta tener activada la verificación en dos pasos:
  <https://myaccount.google.com/apppasswords>. La contraseña normal de la cuenta
  es rechazada desde 2022.
- `EMAIL_USE_TLS` y `EMAIL_USE_SSL` son **excluyentes**: TLS para el puerto 587,
  SSL para el 465. Si activas los dos, Django no arranca — falla con un mensaje
  claro en lugar de romperse dentro de la tarea Celery cinco reintentos después.
- El `Reply-To` del aviso es la dirección de quien escribió, así que responder
  desde el cliente de correo le contesta a esa persona y no a ti mismo.
- Muchos proveedores **rechazan un remitente distinto de la cuenta autenticada**:
  deja `DEFAULT_FROM_EMAIL` igual a `EMAIL_HOST_USER` salvo que tengas un dominio
  propio configurado.
- Si el envío falla, Celery reintenta con backoff exponencial hasta 5 veces. El
  mensaje ya está guardado: un fallo de SMTP no pierde el contacto.
- `EMAIL_HOST_PASSWORD` es un secreto. Vive en el `.env` del servidor, que está
  en `.gitignore`: nunca en el repositorio.

### Probarlo sin credenciales

Con el backend de consola, el correo se imprime en el log del worker en vez de
enviarse — sirve para verificar el flujo completo:

```bash
NOTIFIER_BACKEND=smtp
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.example.invalid   # no se usa, pero la validación lo exige
NOTIFY_EMAIL_TO=destino@example.com
```

Envía el formulario y mira `docker compose logs celery-worker`: ahí aparece el
correo completo, con cabeceras.

## CI/CD con Jenkins

`Jenkinsfile` cubre el ciclo completo para el despliegue con Compose. La idea
central: **el artefacto que se prueba es el que se despliega**. Las imágenes se
etiquetan con el SHA del commit, pasan el smoke test y llegan al servidor tal
cual — el servidor nunca compila nada. Cómo llegan depende de `DEPLOY_MODE`:
`local-images` (por defecto, Jenkins en el propio servidor) las re-etiqueta en el
mismo daemon de Docker; `registry` las publica y el servidor las descarga.

| Etapa | Qué hace | Qué corta el pipeline |
|-------|----------|----------------------|
| Preparar | SHA corto como `IMAGE_TAG`, `.env` efímero con secretos aleatorios | — |
| Build de imágenes | `docker compose build --pull` | `go vet`/`go test` (Go) y eslint/`tsc` (frontend) corren **dentro** de los Dockerfiles |
| Verificar Django | `manage.py check` y `makemigrations --check` | drift entre modelos y migraciones |
| Smoke end-to-end | levanta el stack completo y corre `scripts/smoke-test.sh` | cualquier ruta rota, incluido el POST de contacto Go → Django → PostgreSQL → Celery |
| Publicar imágenes | `docker tag` + `docker push` (solo en `main`, `DEPLOY_MODE=registry` y `PUSH_IMAGES`) | — |
| Desplegar | `scripts/deploy-local.sh` o `scripts/deploy.sh` según `DEPLOY_MODE` (solo en `main` y con `DEPLOY`) | servicios que no llegan a healthy; smoke test contra producción |

Las puertas de calidad viven en los Dockerfiles, no en el pipeline: el agente de
Jenkins solo necesita Docker, y `docker compose up --build` en cualquier máquina
aplica las mismas comprobaciones.

### Configuración del job

1. **Job** de tipo *Pipeline* → *Pipeline script from SCM*, apuntando a este
   repositorio (el checkout es implícito).
2. **Agente Linux** con Docker Engine, Compose v2.24+, `git` y `sh`. No hace
   falta Node ni Go.
3. **Plugins**: *Pipeline*, *Credentials Binding*, *Timestamper* y — solo si
   despliegas por SSH — *SSH Agent*. Si falta alguno, el pipeline no arranca y el
   error apunta a la directiva que lo usa.
4. **Credenciales** en Jenkins:
   - `portfolio-registry` (*Username/Password*) — solo en modo `registry`, para
     publicar las imágenes.
     En GHCR, el usuario es tu handle y la contraseña un PAT con `write:packages`.
   - `portfolio-deploy-key` (*SSH private key*) — solo si Jenkins no corre en el
     servidor.
5. **Parámetros** (se ajustan en cada ejecución, con estos valores por defecto):

   | Parámetro | Default | Para qué |
   |-----------|---------|----------|
   | `REGISTRY` | `ghcr.io/elvis-david-quinteros-siles` | registry y namespace de las imágenes (minúsculas: GHCR rechaza mayúsculas) |
   | `DEPLOY_MODE` | `local-images` | `local-images`: re-etiqueta en el servidor sin registry; `registry`: publica y el servidor descarga |
   | `DEPLOY_TARGET` | `local` | solo en modo `registry`: `local` si Jenkins está en el servidor; si no, `usuario@host` |
   | `PROJECT_DIR` | `/home/ubuntu/developer-portfolio` | ruta del checkout en el servidor |
   | `PUSH_IMAGES` | `false` | publicar en el registry (solo en modo `registry`) |
   | `DEPLOY` | `true` | desplegar tras el smoke test de CI |

   Ojo con `DEPLOY=true` por defecto: cualquier build de `main` — lanzado a
   mano o por el webhook de cada push — acaba en producción. Para probar sin
   desplegar, *Build with Parameters* con `DEPLOY` desmarcado. En el primer
   build de un job nuevo Jenkins aún no conoce los parámetros (los declara el
   `Jenkinsfile` al ejecutarse), así que solo ofrece *Build Now* con los valores
   por defecto: decláralos en el job o cancela ese primer build.

6. **En el servidor**, una vez: clonar el repo en `PROJECT_DIR` y crear el `.env`
   con los secretos reales. En modo `registry`, además, `make db-bootstrap` (si
   usas Postgres externo) y `docker login <registry>` (el `docker pull` del
   deploy usa esa sesión; Jenkins no le pasa credenciales).

Los secretos de producción nunca pasan por Jenkins: viven en el `.env` del
servidor. El pipeline genera su propio `.env` desechable con
`scripts/ci-env.sh` — valores aleatorios en cada build y `NGINX_PORT=0`, para
que el stack de CI no choque con el de producción aunque compartan el host. Por
la misma razón cada build usa un proyecto de Compose aislado
(`portfolio-ci-<nº>`), pasado con `-p` en todos los comandos.

Ese nombre también se exporta como `COMPOSE_PROJECT_NAME` a todo el pipeline, y
esa variable manda sobre el `name: portfolio` del compose. Por eso
`deploy.sh` y `deploy-local.sh` hacen `unset COMPOSE_PROJECT_NAME` al empezar:
sin eso, el `up` del despliegue recrea el stack de CI con el `.env` de
producción en vez de tocar producción (le pasó al build #2 del job). Cualquier
script nuevo que Jenkins invoque sobre el stack de producción necesita lo mismo.

La limpieza final no usa `docker compose down --rmi local`: compose borra la
primera etiqueta por orden alfabético de la imagen de cada contenedor, y tras un
despliegue `local-images` esa puede ser la de producción
(`portfolio-celery-worker:<sha>` va antes que `portfolio-ci-N-celery-worker`).
En su lugar quita por nombre las etiquetas `portfolio-ci-N-<servicio>`, que solo
desetiquetan si la imagen tiene otras.

### Despliegue

`scripts/deploy.sh` corre en el servidor (lo invoca Jenkins, o tú a mano):

```bash
cd /opt/portfolio
git fetch --prune origin && git checkout -q <sha>
IMAGE_TAG=<sha> sh scripts/deploy.sh
```

Descarga las imágenes, levanta el stack esperando a que todo quede `healthy`,
corre el smoke test y guarda el tag desplegado en `.deployed-tag`.

**No hay rollback automático, a propósito.** Cuando el smoke test falla, el
esquema ya avanzó (Django migra al arrancar) y volver al código anterior no
siempre es seguro. El script imprime el comando exacto de rollback y volca los
logs para decidir con datos:

```bash
IMAGE_TAG=<tag-anterior> sh scripts/deploy.sh
```

### Modo `local-images` (Jenkins en el mismo servidor, sin registry)

Es el `DEPLOY_MODE` por defecto. Si Jenkins corre en el servidor de producción,
las imágenes que construyó y probó ya están en su daemon de Docker: publicarlas
en un registry solo para descargarlas de vuelta no aporta nada.
`scripts/deploy-local.sh` las re-etiqueta como `portfolio-<servicio>:<sha>` y
`:latest`, avanza el clon del servidor (`PROJECT_DIR`) a ese commit (solo
fast-forward), recrea el stack con `--no-build` y corre el smoke test contra
`SMOKE_URL` (por defecto `https://edqs.online`). Solo si el smoke test pasa
escribe el tag en `.deployed-tag`: ese archivo es siempre la última versión
desplegada **y verificada**.

Requisitos cuando Jenkins es un contenedor que usa el socket del host:

- Cliente de Docker con Compose dentro del contenedor de Jenkins.
- `PROJECT_DIR` montado en el contenedor **en la misma ruta** que en el host.
- `/var/jenkins_home` en el host como enlace al volumen de Jenkins: el daemon
  resuelve los bind mounts del compose de CI (p. ej. `docker/postgres/init`)
  con rutas del host.

Rollback sin recompilar, con un tag desplegado antes (tienen que existir las
imágenes `portfolio-<servicio>:<tag>` de los seis servicios; compruébalo con
`docker images 'portfolio-*'`, y si falta alguna, `docker compose up -d --build`
desde el commit correspondiente):

```bash
cd /home/ubuntu/developer-portfolio && IMAGE_TAG=<tag-anterior> sh scripts/deploy-local.sh
```

### Relación con los workflows de GitHub Actions

Conviven sin pisarse, porque despliegan a sitios distintos:

- `.github/workflows/*.yml` por servicio: puerta de calidad en pull request.
- `.github/workflows/ci.yml`: publica en GHCR y actualiza los tags de `k8s/`
  para que Argo CD sincronice — la ruta **Kubernetes** (`docs/gitops.md`).
- `Jenkinsfile`: la ruta **Compose sobre un servidor**, la que describe esta
  guía. Si solo usas Jenkins, `ci.yml` se puede desactivar.

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
