import os
import secrets
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")


def _database_url():
    url = os.getenv("DATABASE_URL", "postgresql+psycopg://library:library@localhost:5432/library")
    # Hosting services (Render, Railway, Heroku) give "postgres://..." URLs.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Config:
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB is plenty for an import file
    FRONTEND_DIST = os.getenv("FRONTEND_DIST", str(BASE_DIR.parent / "frontend" / "dist"))

    # Signs the session cookie and the password-reset links.
    SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "0") == "1"
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)

    # Number of reverse proxies in front of the app (1 on Render); 0 = clients connect directly.
    PROXY_COUNT = int(os.getenv("PROXY_COUNT", "0"))

    # Public address of the site, used in the links sent by email.
    APP_URL = os.getenv("APP_URL", "http://localhost:5000").rstrip("/")

    # Email. Without MAIL_SERVER, messages are written to the log instead of being sent.
    MAIL_SERVER = os.getenv("MAIL_SERVER", "")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "1") == "1"
    MAIL_FROM = os.getenv("MAIL_FROM", "My Library <no-reply@localhost>")

    # Rate-limit counters. memory:// is per process; use redis://... with several workers.
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    # Book data lookup by ISBN.
    OPENLIBRARY_URL = os.getenv("OPENLIBRARY_URL", "https://openlibrary.org")


class TestConfig(Config):
    TESTING = True
    SECRET_KEY = "test"
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    SQLALCHEMY_ENGINE_OPTIONS = {}
    RATELIMIT_ENABLED = False
    MAIL_SERVER = ""
