#!/usr/bin/env sh
# ==============================================================================
# Prepara el portfolio dentro de un PostgreSQL que YA existe en el servidor.
#
# Hace tres cosas, todas idempotentes (se puede ejecutar N veces):
#   1. Crea (o sincroniza la contraseña de) el rol de la aplicación.
#   2. Crea la base de datos con ese rol como dueño.
#   3. Habilita `pgcrypto` y deja los permisos listos para las migraciones.
# Además crea la red Docker compartida y engancha el contenedor de PostgreSQL,
# para que los servicios del compose lo resuelvan por nombre.
#
# NO crea tablas: de eso se encarga `manage.py migrate` al arrancar Django.
#
# Uso (en el servidor, desde la raíz del repo, con el .env ya configurado):
#   PG_CONTAINER=mi-postgres sh scripts/db-bootstrap.sh
#
# Variables: PG_CONTAINER (obligatoria), PG_SUPERUSER (default postgres),
# EXTERNAL_DB_NETWORK, y POSTGRES_DB/USER/PASSWORD (se leen del .env si no están
# en el entorno).
# ==============================================================================
set -eu

ENV_FILE=${ENV_FILE:-.env}
if [ -f "$ENV_FILE" ]; then
    # Las credenciales salen del .env a propósito: es el archivo que consumen los
    # contenedores, así que crear el rol con otro valor sería crear una
    # discrepancia. PG_CONTAINER y PG_SUPERUSER, en cambio, describen el servidor
    # y se pasan por entorno, así que se conservan.
    _pg_container_cli=${PG_CONTAINER:-}
    _pg_superuser_cli=${PG_SUPERUSER:-}
    # Sin barra, `.` buscaría en el PATH en lugar del directorio actual.
    case "$ENV_FILE" in
        */*) _env_path=$ENV_FILE ;;
        *) _env_path="./$ENV_FILE" ;;
    esac
    # shellcheck disable=SC1090
    set -a && . "$_env_path" && set +a
    [ -n "$_pg_container_cli" ] && PG_CONTAINER=$_pg_container_cli
    [ -n "$_pg_superuser_cli" ] && PG_SUPERUSER=$_pg_superuser_cli
fi

: "${PG_CONTAINER:?define PG_CONTAINER=<nombre del contenedor de PostgreSQL>}"
PG_SUPERUSER=${PG_SUPERUSER:-postgres}
DB_NAME=${POSTGRES_DB:?falta POSTGRES_DB (revisa el .env)}
DB_USER=${POSTGRES_USER:?falta POSTGRES_USER (revisa el .env)}
DB_PASSWORD=${POSTGRES_PASSWORD:?falta POSTGRES_PASSWORD (revisa el .env)}
NETWORK=${EXTERNAL_DB_NETWORK:-portfolio-dbnet}

if ! docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -q true; then
    echo "ERROR: el contenedor '$PG_CONTAINER' no existe o no está corriendo." >&2
    echo "       Lístalos con: docker ps --format '{{.Names}}\t{{.Image}}'" >&2
    exit 1
fi

# Escapado de literales SQL: la comilla simple se duplica. `standard_conforming_
# strings` está en on por defecto, así que la barra invertida no es de escape.
sql_lit() { printf '%s' "$1" | sed "s/'/''/g"; }
ESC_USER=$(sql_lit "$DB_USER")
ESC_NAME=$(sql_lit "$DB_NAME")
ESC_PASSWORD=$(sql_lit "$DB_PASSWORD")

psql_super() { docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PG_SUPERUSER" "$@"; }

echo "==> PostgreSQL: $PG_CONTAINER (superusuario: $PG_SUPERUSER)"
psql_super -tAc 'SELECT version()' | head -n1 | sed 's/^/    /'

# ------------------------------------------------------------------- 1. rol ---
if [ "$(psql_super -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$ESC_USER'")" = "1" ]; then
    echo "==> Rol '$DB_USER' ya existe: sincronizo la contraseña con el .env"
    psql_super -c "ALTER ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$ESC_PASSWORD'" >/dev/null
else
    echo "==> Creo el rol '$DB_USER'"
    psql_super -c "CREATE ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$ESC_PASSWORD'" >/dev/null
fi

# ------------------------------------------------------------------ 2. base ---
if [ "$(psql_super -tAc "SELECT 1 FROM pg_database WHERE datname = '$ESC_NAME'")" = "1" ]; then
    echo "==> Base '$DB_NAME' ya existe (no se toca su contenido)"
else
    echo "==> Creo la base '$DB_NAME' con dueño '$DB_USER'"
    psql_super -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\"" >/dev/null
fi

# ------------------------------------------------- 3. extensión y permisos ---
# pgcrypto es el respaldo de `gen_random_uuid()` (docs/DATABASE.md); los UUID los
# genera Python, pero el DEFAULT de la columna lo necesita en PostgreSQL < 13.
# Ser dueño del schema public importa en PostgreSQL 15+, donde el rol público ya
# no puede crear objetos: sin esto, `migrate` falla con "permission denied".
echo "==> Habilito pgcrypto y ajusto permisos en '$DB_NAME'"
psql_super -d "$DB_NAME" >/dev/null <<SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER SCHEMA public OWNER TO "$DB_USER";
GRANT ALL ON SCHEMA public TO "$DB_USER";
GRANT ALL ON DATABASE "$DB_NAME" TO "$DB_USER";
SQL

# --------------------------------------------------------------- 4. red Docker
if docker network inspect "$NETWORK" >/dev/null 2>&1; then
    echo "==> Red '$NETWORK' ya existe"
else
    echo "==> Creo la red '$NETWORK'"
    docker network create "$NETWORK" >/dev/null
fi

if docker network inspect "$NETWORK" --format '{{range .Containers}}{{.Name}} {{end}}' | grep -qw "$PG_CONTAINER"; then
    echo "==> '$PG_CONTAINER' ya está en la red '$NETWORK'"
else
    echo "==> Engancho '$PG_CONTAINER' a la red '$NETWORK'"
    docker network connect "$NETWORK" "$PG_CONTAINER"
fi

# ---------------------------------------------------------- 5. verificación ---
# Por TCP (-h 127.0.0.1), no por socket: así se ejercita la misma autenticación
# por contraseña que usarán los contenedores de la aplicación.
echo "==> Verifico el login de la aplicación"
if docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$PG_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" \
    -tAc "SELECT 'conectado como ' || current_user || ' a ' || current_database()" 2>/dev/null; then
    :
else
    echo "ERROR: el rol existe pero no puede conectarse por TCP." >&2
    echo "       Revisa pg_hba.conf del contenedor: hace falta una línea como" >&2
    echo "         host  $DB_NAME  $DB_USER  0.0.0.0/0  scram-sha-256" >&2
    exit 1
fi

cat <<EOF

Listo. Apunta DATABASE_URL en el .env a este contenedor:

  DATABASE_URL=postgres://$DB_USER:<password>@$PG_CONTAINER:5432/$DB_NAME?sslmode=disable

y despliega con:  make prod-up
EOF
