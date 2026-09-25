#!/usr/bin/env sh
# ==============================================================================
# Genera un .env efímero para CI a partir de .env.example.
#
#   sh scripts/ci-env.sh [destino]     # default: .env
#
# Dos decisiones que importan:
#   - Secretos aleatorios en cada ejecución: ningún build hereda credenciales de
#     otro y los valores `change-me-*` nunca llegan a ejecutarse.
#   - NGINX_PORT=0: Docker asigna un puerto libre, así el stack de CI no choca
#     con uno de producción corriendo en el mismo host. El puerto real se
#     descubre después con `docker compose port nginx 80`.
# ==============================================================================
set -eu

OUT=${1:-.env}
[ -f .env.example ] || { echo "ERROR: ejecútalo desde la raíz del repo" >&2; exit 1; }

# Hex aleatorio de N caracteres, sin depender de openssl.
rand() { tr -dc 'a-f0-9' < /dev/urandom | dd bs=1 count="${1:-32}" 2>/dev/null; }

# El delimitador es `|` porque los valores generados son hexadecimales: no
# pueden contenerlo. Las contraseñas se sustituyen en global (`g`) porque el
# mismo placeholder aparece dentro de DATABASE_URL y REDIS_URL.
sed -e "s|change-me-strong-password|$(rand 24)|g" \
    -e "s|change-me-redis-password|$(rand 24)|g" \
    -e "s|change-me-jwt-secret-64-hex|$(rand 64)|" \
    -e "s|change-me-internal-token|$(rand 64)|" \
    -e "s|change-me-django-secret|$(rand 64)|" \
    -e "s|change-me-admin-password|$(rand 16)|" \
    -e "s|^NGINX_PORT=.*|NGINX_PORT=0|" \
    .env.example > "$OUT"

echo "$OUT generado (secretos aleatorios, NGINX_PORT=0)"
