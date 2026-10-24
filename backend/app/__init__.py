import os
from pathlib import Path

from flask import Flask, request, send_from_directory

from . import auth, books, library, loans, lookup, notes, readings, reports, transfer
from .cli import register_cli
from .config import Config
from .extensions import db, limiter, migrate
from .http import error, register_error_handlers
from .security import register_security

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def create_app(config_object=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_object)
    app.json.sort_keys = False
    if not os.getenv("SECRET_KEY") and not app.testing:
        app.logger.warning("SECRET_KEY is not set: sessions will not survive a restart "
                           "and will not work with more than one worker.")

    db.init_app(app)
    migrate.init_app(app, db, directory=str(Path(__file__).resolve().parent.parent / "migrations"))
    limiter.init_app(app)
    for module in (auth, library, books, transfer, loans, readings, notes, lookup, reports):
        app.register_blueprint(module.bp)
    register_error_handlers(app)
    register_security(app)
    register_cli(app)

    @app.before_request
    def csrf_guard():
        """Browsers cannot add a custom header to a cross-site request without a CORS
        preflight, which this server never approves: requiring it blocks CSRF."""
        if request.method in UNSAFE_METHODS and request.path.startswith("/api/") \
                and request.headers.get("X-Requested-With") != "fetch":
            return error("missing_header", 400)
        return None

    @app.get("/api/health")
    def health():
        db.session.execute(db.select(1))
        return {"status": "ok"}

    _serve_frontend(app, Path(config_object.FRONTEND_DIST).resolve())
    return app


def _serve_frontend(app, dist):
    """Serve the compiled React app; unknown paths get index.html (client-side routing)."""

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def spa(path):
        if path.startswith("api/"):
            return error("not_found", 404)
        if path and (dist / path).is_file():
            if path.startswith("assets/"):          # file names contain a content hash: cache for a year
                response = send_from_directory(dist, path, max_age=31536000)
                response.cache_control.immutable = True
                return response
            return send_from_directory(dist, path)  # Flask default: no-cache (sw.js, manifest, icons)
        if (dist / "index.html").is_file():
            return send_from_directory(dist, "index.html")
        return ("Frontend not built yet. Run `npm run build` in frontend/, "
                "or use `npm run dev` during development.", 503)
