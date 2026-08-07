# ------------------------------------------------------------------ builder --
FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY requirements.txt .
RUN pip wheel --wheel-dir /build/wheels -r requirements.txt

# -------------------------------------------------------------------- final --
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias desde las wheels del builder (sin toolchain en la imagen final)
COPY --from=builder /build/wheels /tmp/wheels
COPY requirements.txt .
RUN pip install --no-index --find-links=/tmp/wheels -r requirements.txt \
    && rm -rf /tmp/wheels

COPY . .

# Usuario no-root + /app/media escribible (volumen compartido con celery)
RUN sed -i 's/\r$//' /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh \
    && addgroup --system app \
    && adduser --system --ingroup app --home /home/app app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app

# Estáticos del admin (env dummies: collectstatic no toca DB/Redis)
RUN DJANGO_SECRET_KEY=build-only \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    REDIS_URL=redis://localhost:6379/0 \
    JWT_SECRET=build-only \
    INTERNAL_SERVICE_TOKEN=build-only \
    python manage.py collectstatic --noinput

USER app

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "-b", "0.0.0.0:8000", "--workers", "2", "--access-logfile", "-"]
