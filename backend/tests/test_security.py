from app import create_app
from app.config import TestConfig


def test_security_headers_on_api_and_pages(client):
    for response in (client.get("/api/health"), client.get("/")):
        assert "default-src 'self'" in response.headers["Content-Security-Policy"]
        assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "Strict-Transport-Security" not in response.headers      # cookies are not Secure in tests


def test_bundled_icon_font_is_allowed(client):
    """Bootstrap Icons ships its font inside the build: without 'self' every icon disappears."""
    policy = dict(part.split(" ", 1) for part in client.get("/").headers["Content-Security-Policy"].split("; "))
    assert "'self'" in policy["font-src"].split()


def test_hsts_only_when_served_over_https(app):
    class Https(TestConfig):
        SESSION_COOKIE_SECURE = True

    assert "max-age" in create_app(Https).test_client().get("/api/health").headers["Strict-Transport-Security"]


def test_client_address_comes_from_the_proxy_header(app):
    class Behind(TestConfig):
        PROXY_COUNT = 1

    from flask import request
    proxied = create_app(Behind)
    proxied.add_url_rule("/whoami", "whoami", lambda: request.remote_addr)
    client = proxied.test_client()
    assert client.get("/whoami", headers={"X-Forwarded-For": "203.0.113.7"}).get_data(as_text=True) == "203.0.113.7"
    # Not behind a proxy: the header is ignored, so it cannot be used to dodge the rate limit.
    direct = create_app(TestConfig)
    direct.add_url_rule("/whoami", "whoami", lambda: request.remote_addr)
    assert direct.test_client().get("/whoami", headers={"X-Forwarded-For": "203.0.113.7"}) \
        .get_data(as_text=True) != "203.0.113.7"
