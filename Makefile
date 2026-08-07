# Atajos de operación. Requisito único: Docker.
.PHONY: up down build logs ps restart seed migrate test-go test-gateway backup

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
