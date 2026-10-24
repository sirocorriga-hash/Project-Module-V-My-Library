"""Deployment hardening: trust the reverse proxy's headers, add browser security headers."""

from werkzeug.middleware.proxy_fix import ProxyFix

# Text fonts come from Google Fonts, the icon font (Bootstrap Icons) is bundled with the app;
# book covers come from any https host (see validation.normalise).
CONTENT_SECURITY_POLICY = "; ".join((
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",   # React and Recharts set style attributes
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
))

HEADERS = {
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",   # camera: barcode scanner
}
HSTS = "max-age=31536000; includeSubDomains"


def register_security(app):
    proxies = app.config["PROXY_COUNT"]
    if proxies:
        # Without this, every client looks like the proxy: wrong rate-limit keys, http:// links.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=proxies, x_proto=proxies, x_host=proxies)

    @app.after_request
    def add_headers(response):
        for name, value in HEADERS.items():
            response.headers.setdefault(name, value)
        if app.config["SESSION_COOKIE_SECURE"]:
            response.headers.setdefault("Strict-Transport-Security", HSTS)
        return response
