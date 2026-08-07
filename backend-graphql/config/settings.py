"""Settings 12-factor: TODA la configuración proviene del entorno.

Variables canónicas (CONTRACTS.md §7): DATABASE_URL, REDIS_URL,
DJANGO_SECRET_KEY, DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS, JWT_SECRET,
INTERNAL_SERVICE_TOKEN, ADMIN_USERNAME, ADMIN_PASSWORD, RECAPTCHA_SECRET_KEY.
"""
from __future__ import annotations

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name: str, default: str | None = None, *, required: bool = False) -> str:
    value = os.environ.get(name, default)
    if required and not value:
        raise ImproperlyConfigured(f"Variable de entorno requerida ausente: {name}")
    return value if value is not None else ""


def env_bool(name: str, default: str = "0") -> bool:
    return env(name, default).strip().lower() in {"1", "true", "yes", "on"}


# --- Núcleo ------------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", required=True)
DEBUG = env_bool("DJANGO_DEBUG", "0")

# El healthcheck del compose llama a http://127.0.0.1:8000/health/ — se
# garantiza siempre loopback además de lo declarado en DJANGO_ALLOWED_HOSTS.
ALLOWED_HOSTS = sorted(
    {h.strip() for h in env("DJANGO_ALLOWED_HOSTS", "graphql-api,localhost").split(",") if h.strip()}
    | {"localhost", "127.0.0.1"}
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "portfolio.apps.PortfolioConfig",
]

MIDDLEWARE = [
    "portfolio.middleware.RequestIDMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Base de datos (Django es el dueño del esquema — ADR-0003) ---------------
DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL", required=True),
        conn_max_age=60,
        conn_health_checks=True,
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Redis: cache + broker Celery -------------------------------------------
REDIS_URL = env("REDIS_URL", required=True)

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "KEY_PREFIX": "portfolio",
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TIME_LIMIT = 60
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
# No secuestrar el root logger: se usa el logging JSON propio (ver LOGGING).
CELERY_WORKER_HIJACK_ROOT_LOGGER = False

# --- Seguridad / integración -------------------------------------------------
JWT_SECRET = env("JWT_SECRET", required=True)
JWT_TTL_SECONDS = 3600  # exp 1h (CONTRACTS §4)
INTERNAL_SERVICE_TOKEN = env("INTERNAL_SERVICE_TOKEN", required=True)
ADMIN_USERNAME = env("ADMIN_USERNAME", "")
ADMIN_PASSWORD = env("ADMIN_PASSWORD", "")
# Vacío => verificación ReCaptcha deshabilitada (CONTRACTS §7)
RECAPTCHA_SECRET_KEY = env("RECAPTCHA_SECRET_KEY", "")

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# --- i18n --------------------------------------------------------------------
LANGUAGE_CODE = "es"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Estáticos y media -------------------------------------------------------
# STATIC solo lo consume /django-admin/ (tráfico interno detrás del gateway).
STATIC_URL = "/django-static/"
STATIC_ROOT = Path(env("DJANGO_STATIC_ROOT", str(BASE_DIR / "staticfiles")))

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("DJANGO_MEDIA_ROOT", "/app/media"))

# Límite de subida de imágenes (uploadImage)
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024

# --- Logging JSON estructurado a stdout (request_id incluido) ----------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {"()": "portfolio.observability.JsonFormatter"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO").upper()},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        # El access log ya lo emite el middleware propio con request_id.
        "django.server": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "portfolio": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
