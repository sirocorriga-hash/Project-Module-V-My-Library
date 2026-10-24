import pytest
from flask.testing import FlaskClient

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.mail import outbox


class ApiClient(FlaskClient):
    """Adds the anti-CSRF header the React app always sends; English messages by default."""

    def open(self, *args, **kwargs):
        headers = kwargs.pop("headers", None) or {}
        headers.setdefault("X-Requested-With", "fetch")
        headers.setdefault("Accept-Language", "en")
        return super().open(*args, headers=headers, **kwargs)


@pytest.fixture()
def app():
    app = create_app(TestConfig)
    app.test_client_class = ApiClient
    outbox.clear()
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def register(client, email="ada@example.com", name="Ada"):
    res = client.post("/api/auth/register", json={"email": email, "password": "secret123", "name": name})
    assert res.status_code == 201, res.json
    return res.json


def add_book(client, **fields):
    payload = {"title": "Dune", "author": "Frank Herbert", "genre": "Sci-Fi", "year": 1965, **fields}
    res = client.post("/api/books", json=payload)
    assert res.status_code == 201, res.json
    return res.json


@pytest.fixture()
def client(app):
    c = app.test_client()
    register(c)
    return c


@pytest.fixture()
def anon(app):
    return app.test_client()
