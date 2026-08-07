#!/bin/sh
# Entrypoint del contenedor graphql-api / celery-worker.
# - Para comandos celery: solo espera la DB y ejecuta (graphql-api ya migró:
#   el compose arranca celery tras el health de graphql-api).
# - Para el resto: espera DB, migra, siembra contenido demo, garantiza el
#   superusuario admin y ejecuta el comando (gunicorn por defecto).
set -e

if [ "$1" = "celery" ]; then
    python manage.py wait_for_db --retries 30 --delay 1
    exec "$@"
fi

python manage.py wait_for_db --retries 30 --delay 1
python manage.py migrate --noinput
python manage.py seed_demo
python manage.py ensure_admin

exec "$@"
