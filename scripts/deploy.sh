#!/usr/bin/env sh
# ==============================================================================
# Despliegue en el servidor desde imágenes ya publicadas. Lo invoca Jenkins, pero
# funciona igual a mano: es el mismo camino en los dos casos.
#
#   IMAGE_TAG=<sha> sh scripts/deploy.sh
#
# Asume que el repo ya está en el commit correcto (Jenkins hace el checkout
# antes) y que el `.env` del servidor existe con los secretos reales. No toca la
# base de datos: las migraciones las aplica el entrypoint de Django al arrancar.
#
# No hay rollback automático a propósito: cuando el smoke test falla, el esquema
# ya avanzó y volver al código anterior no siempre es seguro. El script imprime
# el comando exacto de rollback y deja los logs a la vista para decidir.
# ==============================================================================
set -eu

IMAGE_TAG=${IMAGE_TAG:?define IMAGE_TAG=<sha o tag a desplegar>}
WAIT_TIMEOUT=${WAIT_TIMEOUT:-300}
TAG_FILE=${TAG_FILE:-.deployed-tag}

[ -f .env ] || { echo "ERROR: falta .env en $(pwd)" >&2; exit 1; }
[ -f docker-compose.prod.yml ] || { echo "ERROR: ejecútalo desde la raíz del repo" >&2; exit 1; }

# Si lo invoca Jenkins, hereda su COMPOSE_PROJECT_NAME=portfolio-ci-N, que manda
# sobre el `name:` del compose y apuntaría al stack de CI.
unset COMPOSE_PROJECT_NAME

compose() { docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"; }

export IMAGE_TAG
PREVIOUS_TAG=$([ -f "$TAG_FILE" ] && cat "$TAG_FILE" || echo "")

# El puerto publicado sale del .env (NGINX_PORT). En un servidor con su propio
# Nginx delante debería ser un puerto local, no el 80. Se recorta cualquier
# comentario o espacio al final de la línea; si no está definido, cae al 80.
# `localhost` y no 127.0.0.1: Nginx propaga el Host hasta Django, que valida
# DJANGO_ALLOWED_HOSTS por dominio. Mantén `localhost` en esa lista.
# (No se llama NGINX_PORT para no confundirla con la variable que compose
# interpola desde el .env: esta es solo para construir la URL del smoke test.)
PUBLISHED_PORT=$(sed -n 's/^NGINX_PORT=//p' .env | head -n1 | sed 's/[[:space:]#].*$//')
BASE_URL=${SMOKE_URL:-http://localhost:${PUBLISHED_PORT:-80}}

echo "==> Despliegue de $IMAGE_TAG (anterior: ${PREVIOUS_TAG:-desconocido})"

echo "==> Descargo imágenes del registry"
compose pull --quiet

echo "==> Levanto el stack y espero que todo quede healthy"
if ! compose up -d --remove-orphans --wait --wait-timeout "$WAIT_TIMEOUT"; then
    echo "ERROR: algún servicio no llegó a healthy." >&2
    compose ps
    compose logs --tail 120
    exit 1
fi

echo "==> Smoke test contra $BASE_URL"
if ! sh scripts/smoke-test.sh "$BASE_URL"; then
    echo "" >&2
    echo "ERROR: el smoke test falló con $IMAGE_TAG ya desplegado." >&2
    compose ps
    compose logs --tail 120
    if [ -n "$PREVIOUS_TAG" ]; then
        echo "" >&2
        echo "Rollback (revisa primero si hubo migraciones nuevas):" >&2
        echo "  IMAGE_TAG=$PREVIOUS_TAG sh scripts/deploy.sh" >&2
    fi
    exit 1
fi

printf '%s\n' "$IMAGE_TAG" > "$TAG_FILE"
echo "==> OK: $IMAGE_TAG desplegado y verificado"
compose ps
