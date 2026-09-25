# Atajos de operación. Requisito único: Docker.
.PHONY: up down build logs ps restart seed migrate test-go test-gateway backup \
        prod-up prod-down prod-logs prod-ps prod-pull db-bootstrap ci-env

# Producción: Postgres externo + imágenes del registry (docs/DEPLOYMENT.md).
PROD_COMPOSE = docker compose -f docker-compose.yml -f docker-compose.prod.yml

up:            ## Levanta todo el stack
	docker compose up -d --build

down:          ## Detiene y elimina contenedores (conserva volúmenes)
	docker compose down

build:         ## Reconstruye imágenes sin levantar
	docker compose build

logs:          ## Logs agregados en vivo
	docker compose logs -f --tail=100

ps:            ## Estado y salud de los servicios
	docker compose ps

restart:       ## Reinicia un servicio: make restart s=go-api
	docker compose up -d --build $(s)

seed:          ## Re-ejecuta el seed de contenido demo
	docker compose exec graphql-api python manage.py seed_demo

migrate:       ## Aplica migraciones pendientes
	docker compose exec graphql-api python manage.py migrate

test-go:       ## Tests del backend Go (en contenedor)
	docker run --rm -v "$(CURDIR)/backend-go:/app" -w /app golang:1.23-alpine go test ./...

test-gateway:  ## Tests del gateway (en contenedor)
	docker run --rm -v "$(CURDIR)/gateway:/app" -w /app golang:1.23-alpine go test ./...

backup:        ## Dump de PostgreSQL a ./backups
	mkdir -p backups && docker compose exec -T postgres pg_dump -U $${POSTGRES_USER:-portfolio} $${POSTGRES_DB:-portfolio} > backups/portfolio-$$(date +%Y%m%d-%H%M%S).sql

# --------------------------------------------------------------- producción ---

db-bootstrap:  ## Crea rol, base, pgcrypto y red en el PostgreSQL ya existente
	sh scripts/db-bootstrap.sh

prod-up:       ## Despliega con Postgres externo e imágenes del registry
	$(PROD_COMPOSE) up -d --remove-orphans --wait --wait-timeout 300

prod-pull:     ## Descarga las imágenes del tag actual sin reiniciar nada
	$(PROD_COMPOSE) pull

prod-down:     ## Detiene el stack de producción (no toca el Postgres externo)
	$(PROD_COMPOSE) down

prod-ps:       ## Estado y salud del stack de producción
	$(PROD_COMPOSE) ps

prod-logs:     ## Logs del stack de producción
	$(PROD_COMPOSE) logs -f --tail=100

ci-env:        ## Genera un .env efímero con secretos aleatorios (lo usa Jenkins)
	sh scripts/ci-env.sh .env
