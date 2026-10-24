"""Shared helpers for building API responses and the app-wide error handlers."""

from flask import jsonify, request
from flask_limiter.errors import RateLimitExceeded

from .messages import t
from .validation import ValidationError


class NotFound(Exception):
    """Raised for missing rows *and* for rows of another library, so ids are never revealed."""


def error(key, status=400, **extra):
    return jsonify({"error": t(key), **extra}), status


def body():
    """The request's JSON object, or an empty dict."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def register_error_handlers(app):
    @app.errorhandler(ValidationError)
    def on_validation(err):
        return error("invalid_fields", 422, fields={k: t(v) for k, v in err.errors.items()})

    @app.errorhandler(NotFound)
    def on_not_found(_err):
        return error("not_found", 404)

    @app.errorhandler(RateLimitExceeded)
    def on_rate_limit(_err):
        return error("too_many", 429)
