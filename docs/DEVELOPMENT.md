# Guía de Desarrollo

Esta guía asume el stack ya levantado y se centra en el día a día del código.
Para arrancarlo por primera vez o resolver un fallo de arranque:
**[RUNBOOK.md](RUNBOOK.md)**.

## Arranque

```bash
cp .env.example .env
docker compose up -d --build
```

Las URLs siguientes asumen `NGINX_PORT=80`; si lo cambiaste en `.env`
(p. ej. 8090 en Windows, que reserva el 80), añade `:PUERTO`.

| URL                              | Qué es                            |
|----------------------------------|-----------------------------------|
| http://localhost                 | SPA                               |
| http://localhost/api/v1/docs     | Swagger UI (go-api)               |
| http://localhost/api/v1/profile  | REST directo                      |
| http://localhost/graphql         | GraphQL (GraphiQL si DEBUG=1)     |

Admin de Django: solo red interna. Para usarlo en dev:
`docker compose exec graphql-api ...` o publica temporalmente el puerto 8000.

## Flujo de trabajo por servicio

Cada servicio es autónomo: su README documenta cómo desarrollarlo aislado.
Reconstruir uno solo:

```bash
docker compose up -d --build go-api
```

### frontend (con hot reload, requiere Node 22)
```bash
cd frontend && npm install && npm run dev
# Vite proxy /api y /graphql → localhost:80 (compose levantado)
```

Comprobaciones antes de subir (las mismas que aplica el build de la imagen:
la stage `lint` del Dockerfile bloquea el build si fallan):
```bash
npm run lint && npm run typecheck
```

#### Assets estáticos generados

Tres scripts producen los binarios de `public/`. **No se ejecutan en el build**:
son `one-off`, se corren a mano y el resultado se versiona. Todos usan `sharp`.

| Comando | Genera | Cuándo ejecutarlo |
|---|---|---|
| `npm run logo` | `logo-mark.png`, `logo-edqs.png`, `favicon.png`, `apple-touch-icon.png` | al cambiar `brand/logo-source.png` |
| `npm run og` | `og.png` (1200×630, tarjeta al compartir) | al cambiar el isotipo, el nombre o el headline |
| `npm run showcase` | `public/showcase/*.webp` | rara vez; descarga fotos de prueba, requiere red |

`generate-logo.mjs` recorta el isotipo y el lockup del PNG de marca y les
devuelve el canal alfa: como el arte es color sobre negro ya viene
premultiplicado, así que el canal más brillante da la cobertura y el color se
des-premultiplica. Sin eso, el fondo horneado del original (`#030715`) se vería
como un recuadro sobre el fondo del sitio (`#0a0a0f`).

El isotipo se compone dentro de `og.png`, así que **`npm run og` va después de
`npm run logo`** si cambió la marca.

### backend-go / gateway
Sin Go local: `docker compose up -d --build go-api` tras cada cambio, o
instala Go 1.23 y `go run ./cmd/api`. Tests: `docker build` los ejecuta en el
stage de test; localmente `go test ./...`.

### backend-graphql
```bash
docker compose exec graphql-api python manage.py makemigrations portfolio
docker compose restart graphql-api   # entrypoint aplica migrate
docker compose exec graphql-api python manage.py seed_demo
```

## Convenciones
- Los contratos entre servicios viven en `docs/CONTRACTS.md`; cambiarlos exige
  actualizar el documento y, si es una decisión de diseño, un ADR nuevo.
- Logs siempre estructurados JSON a stdout con `request_id`.
- Toda tabla nueva: UUID PK, timestamps, soft delete, índices (ver DATABASE.md).
- Commits pequeños por servicio; los directorios de servicio no se importan
  entre sí (el acoplamiento permitido es solo por red/contratos).

## Probar el flujo de contacto end-to-end
```bash
curl -X POST http://localhost/api/v1/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","subject":"Hola","message":"Mensaje de prueba suficientemente largo."}'
# → 202 {"data":{"id":"<uuid>"}} ; el worker Celery loggea la notificación:
docker compose logs celery-worker
# Repite >5 veces en una hora → 429 del gateway (rate limit).
```
