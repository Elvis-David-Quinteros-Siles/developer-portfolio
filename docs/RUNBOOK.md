# Cómo hacerlo correr

Guía lineal de cero a funcionando. Cada paso termina con una comprobación: si
esa comprobación pasa, sigue; si no, salta a
[§5 Cuando algo falla](#5-cuando-algo-falla).

Elige tu escenario:

| Quiero… | Ve a |
|---|---|
| Levantarlo en mi máquina para trabajar | [§1 Local](#1-local) |
| Publicarlo en mi servidor usando el PostgreSQL que ya tengo ahí | [§2 Servidor](#2-servidor-con-tu-postgresql-existente) |
| Que se despliegue solo en cada push | [§3 Jenkins](#3-automatizarlo-con-jenkins) |

---

## 0. Requisitos

Solo Docker. Go, Python y Node compilan dentro de los multi-stage builds: no
hacen falta instalados.

```bash
docker compose version     # v2.24 o superior
docker info                # si falla, el daemon no está corriendo
```

- **Compose v2.24+** es obligatorio para el escenario de servidor: el override de
  producción usa las etiquetas `!override`, que versiones anteriores no entienden.
- **Windows**: abre Docker Desktop antes de empezar — `docker compose version`
  responde aunque el daemon esté parado (es solo el CLI), pero `docker info`
  falla. Los comandos `sh scripts/...` de esta guía asumen **Git Bash**.
- **`make` es opcional.** Cada atajo `make x` va acompañado de su comando real,
  que funciona siempre. En Windows normalmente no hay `make`.

---

## 1. Local

```bash
cp .env.example .env
docker compose up -d --build
```

Tarda unos minutos la primera vez (compila Go, instala dependencias de Python y
Node). Las siguientes usan caché de capas.

**Comprobación:**

```bash
docker compose ps                        # 8 servicios, todos (healthy)
sh scripts/smoke-test.sh http://localhost # → "Resultado: TODO OK"
```

Si los 8 salen `healthy` y el smoke test da TODO OK, está funcionando.

| URL | Qué es |
|---|---|
| http://localhost | la SPA |
| http://localhost/api/v1/docs | Swagger UI del API REST |
| http://localhost/graphql | GraphQL (GraphiQL si `DJANGO_DEBUG=1`) |
| http://localhost/api/v1/skills | datos crudos, útil para ver si el seed corrió |

### El puerto 80 está ocupado (típico en Windows)

Cambia `NGINX_PORT=8090` en el `.env`, vuelve a levantar y añade el puerto a
todas las URLs:

```bash
docker compose up -d
sh scripts/smoke-test.sh http://localhost:8090
```

Usa `localhost`, no `127.0.0.1`: Nginx propaga el `Host` hasta Django, que valida
`DJANGO_ALLOWED_HOSTS` por dominio y responde 400 a un host que no esté en la
lista.

### Qué pasa al arrancar

No hay pasos manuales de base de datos. El orden lo imponen los health checks:

```
postgres · redis  →  graphql-api  →  go-api  →  gateway  →  nginx
```

`graphql-api` es el dueño del esquema (ADR-0003) y su entrypoint hace, en cada
arranque, `migrate` → `seed_demo` → `ensure_admin`. Por eso `go-api` espera a que
esté sano: arrancar antes significaría leer tablas que aún no existen.

`seed_demo` es idempotente y **aditivo**: crea lo que falte sin tocar lo que ya
está. Para restaurar el contenido canónico pisando cambios manuales:

```bash
docker compose exec graphql-api python manage.py seed_demo --refresh
```

### Parar y reiniciar

```bash
docker compose down            # para todo, conserva los datos
docker compose down -v         # borra también la base y los uploads (reset total)
docker compose up -d --build go-api   # reconstruir un servicio suelto
docker compose logs -f gateway        # seguir logs de uno
```

Para desarrollo del frontend con hot reload y detalles por servicio, mira
[DEVELOPMENT.md](DEVELOPMENT.md).

---

## 2. Servidor con tu PostgreSQL existente

Aquí el compose **no** levanta su propio PostgreSQL: usa el contenedor que ya
corre en el servidor. Una sola base que respaldar y monitorear, en lugar de dos.
El detalle del diseño está en
[DEPLOYMENT.md § PostgreSQL externo](DEPLOYMENT.md#postgresql-externo-contenedor-ya-existente-en-el-servidor);
aquí van los pasos.

### 2.1 Preparar el `.env`

```bash
git clone <repo> /opt/portfolio && cd /opt/portfolio
cp .env.example .env
```

Edita el `.env`. Lo que cambia respecto a local:

| Variable | Qué poner |
|---|---|
| `PG_CONTAINER` | nombre de tu contenedor de PostgreSQL (`docker ps`) |
| `DATABASE_URL` | `postgres://<user>:<pass>@<PG_CONTAINER>:5432/<db>?sslmode=disable` |
| `POSTGRES_DB` / `_USER` / `_PASSWORD` | credenciales a crear — deben coincidir con `DATABASE_URL` |
| `NGINX_PORT` | `8081` u otro libre, si tu Nginx ya tiene el 80 |
| `DJANGO_ALLOWED_HOSTS` | tu dominio, **dejando `localhost`** (lo usa el smoke test) |
| `CORS_ORIGINS` | `https://tudominio.com` |
| `REGISTRY` / `IMAGE_PREFIX` | de dónde salen las imágenes |

Regenera **todos** los secretos: `openssl rand -hex 32` para `JWT_SECRET`,
`INTERNAL_SERVICE_TOKEN` y `DJANGO_SECRET_KEY`; contraseñas propias para
`REDIS_PASSWORD` y `ADMIN_PASSWORD`. Los valores `change-me-*` no deben llegar a
producción.

### 2.2 Preparar la base en tu PostgreSQL

```bash
sh scripts/db-bootstrap.sh          # atajo: make db-bootstrap
```

Idempotente: se puede repetir sin miedo. Crea el rol (o sincroniza su contraseña
con el `.env`), crea la base con ese rol como dueño, habilita `pgcrypto`, le da la
propiedad del schema `public` —imprescindible en **PostgreSQL 15+**, donde sin eso
`migrate` falla con `permission denied`—, crea la red Docker compartida, engancha
tu contenedor de PostgreSQL y verifica el login por TCP.

**Comprobación:** la última línea debe decir
`conectado como <user> a <db>`. No crea tablas: eso lo hace Django al arrancar.

### 2.3 Levantar

**Si todavía no tienes registry ni pipeline** — construye en el servidor:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build --wait --wait-timeout 420
```

El override lleva `image:` además de `build:`, así que la imagen construida queda
etiquetada con el nombre del registry: cuando más tarde conectes el pipeline, no
hay que cambiar nada.

**Con las imágenes ya publicadas** — el camino normal:

```bash
IMAGE_TAG=<sha> sh scripts/deploy.sh
```

`deploy.sh` descarga las imágenes, levanta el stack esperando a que todo quede
`healthy`, corre el smoke test y guarda el tag en `.deployed-tag`. O sin smoke
test automático, solo levantar: `make prod-up`, equivalente a

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --remove-orphans --wait --wait-timeout 300
```

**Comprobación:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
# 7 servicios healthy — y NINGUNO llamado postgres: ese es el tuyo, aparte
sh scripts/smoke-test.sh http://localhost:8081
```

### 2.4 Ponerlo detrás de tu Nginx

El Nginx del proyecto es el router del stack (`/` → SPA, `/api/` + `/graphql` +
`/media/` → gateway, cabeceras de seguridad, `X-Request-ID`), no un servidor de
estáticos. Se encadena detrás del tuyo, que se queda con TLS y los dominios:

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

Recarga con `nginx -s reload` (o `docker exec <tu-nginx> nginx -s reload`) y entra
por tu dominio.

### 2.5 Actualizar y volver atrás

```bash
git fetch --prune origin && git checkout -q <sha-nuevo>
IMAGE_TAG=<sha-nuevo> sh scripts/deploy.sh

cat .deployed-tag                       # qué está desplegado ahora
IMAGE_TAG=<sha-anterior> sh scripts/deploy.sh   # volver atrás
```

Antes de un rollback, comprueba si el despliegue nuevo trajo migraciones: Django
migra al arrancar y el esquema ya avanzó. Volver al código anterior con un esquema
nuevo suele funcionar (las migraciones son aditivas) pero no está garantizado.

---

## 3. Automatizarlo con Jenkins

El `Jenkinsfile` de la raíz hace build → verificar Django → smoke end-to-end →
publicar imágenes → desplegar. La configuración del job, los plugins y las
credenciales están en
[DEPLOYMENT.md § CI/CD con Jenkins](DEPLOYMENT.md#cicd-con-jenkins).

Para ponerlo a correr:

1. Completa antes el escenario [§2](#2-servidor-con-tu-postgresql-existente) a
   mano. El pipeline automatiza un despliegue que ya funciona; no lo depures por
   primera vez a través de Jenkins.
2. En el servidor, `docker login <registry>` una vez: el `pull` del deploy usa esa
   sesión y Jenkins no le pasa credenciales.
3. Crea el job (*Pipeline script from SCM*) y lánzalo con `DEPLOY=false` y
   `PUSH_IMAGES=false`. Así solo construye y pasa el smoke test: valida el
   pipeline sin tocar producción.
4. Cuando eso salga verde, relanza con los dos en `true`.

Cada build usa un proyecto de Compose aislado (`portfolio-ci-<nº>`) y un `.env`
desechable con `NGINX_PORT=0`, así que puede correr en el mismo servidor que
producción sin interferir.

El `Jenkinsfile` declara `triggers { githubPush() }`: cada push lanza el build
a través del webhook de GitHub (*Settings → Webhooks*, payload
`https://jenkins.edqs.online/github-webhook/`, `application/json`, solo el
evento *push*). Si un push a `main` no dispara nada, revisa por este orden:
que el webhook exista y su última entrega haya devuelto 200 (*Recent
Deliveries*), y que el job se haya ejecutado al menos una vez desde que se
añadió el trigger: Jenkins solo lo registra al ejecutar el `Jenkinsfile`.

---

## 4. Verificar que funciona de verdad

El smoke test cubre las 13 rutas críticas, incluida la escritura:

```bash
sh scripts/smoke-test.sh http://localhost        # o el puerto que uses
```

Para inspeccionar el flujo de contacto a mano —el único camino que escribe en la
base, y el que cruza los cuatro servicios:

```bash
curl -X POST http://localhost/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","subject":"Hola","message":"Mensaje de prueba suficientemente largo."}'
# → 202 {"data":{"id":"<uuid>"}}
docker compose logs celery-worker    # el worker loggea la notificación
```

Repítelo más de 5 veces en una hora y debe devolver **429**: el rate limiting del
gateway está activo. Un 429 aquí es una señal buena, no un fallo.

Comprobar los datos directamente (ajusta el contenedor y las credenciales):

```bash
docker compose exec postgres psql -U portfolio -d portfolio \
  -c "SELECT c.name, count(s.id) FROM skill_category c
      LEFT JOIN skill s ON s.category_id = c.id GROUP BY c.name, c.display_order
      ORDER BY c.display_order"
```

Con PostgreSQL externo, sustituye `docker compose exec postgres` por
`docker exec -i <tu-contenedor-postgres>`.

---

## 5. Cuando algo falla

Primero, siempre lo mismo:

```bash
docker compose ps                    # quién no está healthy
docker compose logs --tail 100 <servicio>
```

| Síntoma | Causa | Arreglo |
|---|---|---|
| `error during connect: ... dockerDesktopLinuxEngine` | el daemon no corre | abre Docker Desktop y espera a que `docker info` responda |
| `bind: address already in use` al levantar | el puerto de `NGINX_PORT` está ocupado | cámbialo en el `.env` y `up -d` otra vez |
| `unknown tag: !override` o el override se ignora | Compose anterior a v2.24 | actualiza Docker; comprueba con `docker compose version` |
| `permission denied for schema public` en los logs de `graphql-api` | PostgreSQL 15+ sin el dueño del schema ajustado | corre `sh scripts/db-bootstrap.sh` |
| `400 Bad Request` en `/graphql` o el smoke test falla solo ahí | el `Host` no está en `DJANGO_ALLOWED_HOSTS` | añade el dominio y **mantén `localhost`** |
| `manifest unknown` / `pull access denied` en el deploy | el tag no está publicado, o falta `docker login` en el servidor | verifica el tag en el registry y vuelve a loguearte |
| `graphql-api` nunca llega a healthy | no alcanza la base, o las migraciones fallan | `docker compose logs graphql-api`: el entrypoint imprime el error exacto de `wait_for_db`/`migrate` |
| `could not translate host name "<contenedor>"` | el PostgreSQL externo no está en la red compartida | `sh scripts/db-bootstrap.sh` lo engancha; o `docker network connect <red> <contenedor>` |
| Cambié el contenido del seed y no aparece | `seed_demo` es aditivo: no sobrescribe filas que ya existen | `... python manage.py seed_demo --refresh` |
| El stack va bien pero la SPA muestra datos que no son los de la base | la SPA cayó a su contenido de respaldo (`frontend/src/content/fallback.ts`) porque la API no respondió | revisa `/api/v1/skills` directamente y los logs del gateway |
| Todo healthy pero el navegador no carga | miras el puerto equivocado | `docker compose ps` muestra el mapeo real en la columna PORTS |

Último recurso en local, borra datos:

```bash
docker compose down -v && docker compose up -d --build
```

En el servidor **no** uses `down -v` con base externa: no borraría tu PostgreSQL
(está fuera del compose), pero sí el volumen `media` con los uploads.

---

## 6. Chuleta

| Qué | Local | Servidor (PostgreSQL externo) |
|---|---|---|
| Levantar | `docker compose up -d --build` | `IMAGE_TAG=<sha> sh scripts/deploy.sh` |
| Estado | `docker compose ps` | `make prod-ps` |
| Logs | `docker compose logs -f <svc>` | `make prod-logs` |
| Parar | `docker compose down` | `make prod-down` |
| Verificar | `sh scripts/smoke-test.sh http://localhost` | `sh scripts/smoke-test.sh http://localhost:8081` |
| Reseed | `docker compose exec graphql-api python manage.py seed_demo --refresh` | `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec graphql-api python manage.py seed_demo --refresh` |

Los atajos `make prod-*` equivalen a
`docker compose -f docker-compose.yml -f docker-compose.prod.yml <acción>`; usa el
comando largo si no tienes `make`.

Los binarios de `frontend/public/` (logo, favicons, tarjeta OpenGraph, imágenes
del showcase) no los produce el build: se generan a mano con `npm run logo`,
`npm run og` y `npm run showcase`, y se versionan. Ver
[DEVELOPMENT.md § Assets estáticos generados](DEVELOPMENT.md#assets-estáticos-generados).

Documentación relacionada: [DEVELOPMENT.md](DEVELOPMENT.md) para trabajar en el
código · [DEPLOYMENT.md](DEPLOYMENT.md) para el diseño del despliegue y Jenkins ·
[ARCHITECTURE.md](ARCHITECTURE.md) para entender por qué el sistema está partido
así · [gitops.md](gitops.md) para la ruta alternativa con Kubernetes y Argo CD.
