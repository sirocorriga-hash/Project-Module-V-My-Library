"""Flask extensions, created once and bound to the app in create_app()."""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
# No global limit: only the sensitive endpoints (login, register, password reset) are limited.
limiter = Limiter(key_func=get_remote_address, default_limits=[])
