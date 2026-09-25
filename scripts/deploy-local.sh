#!/usr/bin/env sh
# ==============================================================================
# Despliegue sin registry, para cuando Jenkins corre en el propio servidor.
#
# Las imágenes que el pipeline acaba de construir y probar ya están en el daemon
# de Docker del servidor: basta con re-etiquetarlas con los nombres que usa el
# proyecto de producción (`portfolio-<servicio>`) y recrear los contenedores sin
# compilar nada. Sigue valiendo la regla: lo que se prueba es lo que se despliega.
#
#   # Desde Jenkins (etapa Desplegar, DEPLOY_MODE=local-images):
#   PROJECT_DIR=/ruta GIT_SHA=<sha> IMAGE_TAG=<sha12> CI_PROJECT=portfolio-ci-N \
#     sh scripts/deploy-local.sh
#
#   # Rollback a mano a un tag desplegado antes (sin CI_PROJECT ni GIT_SHA):
#   cd /ruta && IMAGE_TAG=<tag-anterior> sh scripts/deploy-local.sh
#
# Asume que PROJECT_DIR es un clon en `main` con su `.env` de producción (y el
# docker-compose.override.yml local, si lo hay). Como en deploy.sh, no hay
# rollback automático: Django migra al arrancar y volver atrás no siempre es
# seguro, así que el script imprime el comando y deja los logs a la vista.
# ==============================================================================
set -eu

IMAGE_TAG=${IMAGE_TAG:?define IMAGE_TAG=<tag a desplegar>}
PROJECT_DIR=${PROJECT_DIR:-$(pwd)}
CI_PROJECT=${CI_PROJECT:-}
GIT_SHA=${GIT_SHA:-}
SMOKE_URL=${SMOKE_URL:-https://edqs.online}
WAIT_TIMEOUT=${WAIT_TIMEOUT:-300}
# Todos los servicios con imagen propia, celery-worker incluido: en el compose
# base tiene su propio `build`, así que su imagen se llama distinto.
SERVICES=${DEPLOY_SERVICES:-nginx frontend gateway go-api graphql-api celery-worker}

cd "$PROJECT_DIR"
[ -f .env ] || { echo "ERROR: falta .env en $PROJECT_DIR" >&2; exit 1; }

TAG_FILE=.deployed-tag
PREVIOUS_TAG=$([ -f "$TAG_FILE" ] && cat "$TAG_FILE" || echo "")

# Jenkins corre como root dentro de su contenedor: git se ejecuta con el dueño
# del checkout para no dejar archivos de root en el clon del servidor.
as_owner() {
    if [ "$(id -u)" = "0" ] && [ "$(stat -c %u .)" != "0" ]; then
        HOME=/tmp setpriv --reuid "$(stat -c %u .)" --regid "$(stat -c %g .)" \
            --clear-groups "$@"
    else
        "$@"
    fi
}

echo "==> Despliegue local de $IMAGE_TAG (anterior: ${PREVIOUS_TAG:-desconocido})"

if [ -n "$GIT_SHA" ]; then
    # Compose files y smoke test del mismo commit que las imágenes. Solo avance
    # rápido: si el clon del servidor divergió, mejor parar que pisarlo.
    echo "==> Sincronizo $PROJECT_DIR con $GIT_SHA"
    as_owner git fetch --quiet --prune origin
    as_owner git merge --ff-only --quiet "$GIT_SHA"
fi

echo "==> Etiqueto imágenes"
for service in $SERVICES; do
    if [ -n "$CI_PROJECT" ]; then
        src="${CI_PROJECT}-${service}"
    else
        src="portfolio-${service}:${IMAGE_TAG}"
    fi
    docker image inspect "$src" >/dev/null 2>&1 || {
        echo "ERROR: no existe la imagen $src" >&2; exit 1
    }
    # El tag con el SHA queda para poder volver atrás sin recompilar.
    docker tag "$src" "portfolio-${service}:${IMAGE_TAG}"
    docker tag "$src" "portfolio-${service}:latest"
done

echo "==> Recreo el stack y espero que todo quede healthy"
if ! docker compose up -d --no-build --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT"; then
    echo "ERROR: algún servicio no llegó a healthy." >&2
    docker compose ps
    docker compose logs --tail 120
    exit 1
fi

echo "==> Smoke test contra $SMOKE_URL"
if ! sh scripts/smoke-test.sh "$SMOKE_URL"; then
    echo "" >&2
    echo "ERROR: el smoke test falló con $IMAGE_TAG ya desplegado." >&2
    docker compose ps
    docker compose logs --tail 120
    if [ -n "$PREVIOUS_TAG" ]; then
        echo "" >&2
        echo "Rollback (revisa primero si hubo migraciones nuevas):" >&2
        echo "  cd $PROJECT_DIR && IMAGE_TAG=$PREVIOUS_TAG sh scripts/deploy-local.sh" >&2
    fi
    exit 1
fi

as_owner sh -c 'printf "%s\n" "$1" > "$2"' _ "$IMAGE_TAG" "$TAG_FILE"
echo "==> OK: $IMAGE_TAG desplegado y verificado"
docker compose ps
