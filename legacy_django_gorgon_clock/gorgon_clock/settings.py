"""
Django settings for Gorgon Clock — production-ready for Render.
"""

import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Security ────────────────────────────────────────────────────
# Secret key comes from Render env var; falls back for local dev only.
SECRET_KEY = os.environ.get('SECRET_KEY', default='local-dev-only-insecure-key')

# Debug is OFF on Render (RENDER env var is set automatically by Render).
# Keep it on locally so runserver works without extra config.
DEBUG = 'RENDER' not in os.environ

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Render sets this automatically — add it so Django accepts requests.
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# ── Apps ────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.staticfiles',
]

# ── Middleware ───────────────────────────────────────────────────
# WhiteNoise MUST come immediately after SecurityMiddleware.
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
]

# ── URLs & WSGI ─────────────────────────────────────────────────
ROOT_URLCONF = 'gorgon_clock.urls'
WSGI_APPLICATION = 'gorgon_clock.wsgi.application'

# ── Templates ───────────────────────────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': False,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

# ── Database ────────────────────────────────────────────────────
# Render provides DATABASE_URL automatically when you link a Postgres db.
# Falls back to SQLite for local dev so you don't need Postgres locally.
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# ── Static files ────────────────────────────────────────────────
STATIC_URL = '/static/'

# collectstatic gathers files into this directory on Render.
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Local static files your app ships (none right now, but the dir must exist
# or collectstatic will error if STATICFILES_DIRS points at a missing path).
_local_static = BASE_DIR / 'static'
if _local_static.exists():
    STATICFILES_DIRS = [_local_static]

# WhiteNoise: compress + fingerprint static files for long-term caching.
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Misc ────────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Security headers (production) ───────────────────────────────
# These only activate when DEBUG=False (i.e. on Render).
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER      = True
    SECURE_CONTENT_TYPE_NOSNIFF    = True
    X_FRAME_OPTIONS                = 'DENY'
    SECURE_HSTS_SECONDS            = 31536000   # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD            = True
    SECURE_SSL_REDIRECT            = True
    SESSION_COOKIE_SECURE          = True
    CSRF_COOKIE_SECURE             = True
