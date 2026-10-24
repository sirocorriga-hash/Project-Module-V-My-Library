from app import create_app
from app.auth import reset_token
from app.config import TestConfig
from app.extensions import db
from app.mail import outbox
from app.models import User

from .conftest import add_book, register


def test_requires_login(anon):
    for path in ("/api/books", "/api/reports", "/api/borrowers", "/api/lookup/isbn/9780261102217"):
        assert anon.get(path).status_code == 401


def test_csrf_header_required(anon):
    res = anon.post("/api/auth/login", json={}, headers={"X-Requested-With": ""})
    assert res.status_code == 400


def test_register_login_logout(anon):
    user = register(anon, "bob@example.com")
    assert user["library"]["members"][0]["name"] == "Ada"
    anon.post("/api/auth/logout")
    assert anon.get("/api/auth/me").status_code == 401
    assert anon.post("/api/auth/login", json={"email": "bob@example.com", "password": "nope"}).status_code == 401
    assert anon.post("/api/auth/login", json={"email": " BOB@example.com", "password": "secret123"}).status_code == 200


def test_messages_follow_accept_language(anon):
    body = {"email": "bad", "password": "short", "name": ""}
    en = anon.post("/api/auth/register", json=body).json
    it = anon.post("/api/auth/register", json=body, headers={"Accept-Language": "it-IT,it;q=0.9"}).json
    assert en["fields"]["password"] == "Use at least 8 characters."
    assert it["fields"]["password"] == "Usa almeno 8 caratteri."
    assert set(en["fields"]) == {"email", "password", "name"}


def test_duplicate_email(anon):
    register(anon, "dup@example.com")
    res = anon.post("/api/auth/register", json={"email": "dup@example.com", "password": "longenough", "name": "D"})
    assert res.status_code == 422 and "email" in res.json["fields"]


def test_settings(client):
    res = client.put("/api/auth/me", json={"daily_minutes": 45, "pages_per_hour": "", "yearly_goal": 20, "language": "en"})
    assert res.json["daily_minutes"] == 45 and res.json["pages_per_hour"] is None
    assert res.json["yearly_goal"] == 20 and res.json["language"] == "en"
    bad = client.put("/api/auth/me", json={"pages_per_hour": 900, "language": "fr", "yearly_goal": "x"})
    assert set(bad.json["fields"]) == {"pages_per_hour", "language", "yearly_goal"}


def test_password_reset(app, anon):
    register(anon, "eve@example.com", "Eve")
    anon.post("/api/auth/logout")
    assert anon.post("/api/auth/forgot", json={"email": "nobody@example.com"}).status_code == 204
    assert outbox == []                      # same answer, but nothing sent
    assert anon.post("/api/auth/forgot", json={"email": "eve@example.com"}).status_code == 204
    assert "/reset?token=" in outbox[0].get_content()

    token = reset_token(db.session.scalar(db.select(User).filter_by(email="eve@example.com")))
    assert anon.post("/api/auth/reset", json={"token": token, "password": "short"}).status_code == 422
    assert anon.post("/api/auth/reset", json={"token": token, "password": "brand-new-pw"}).status_code == 200
    # The password changed, so the same link no longer works.
    assert anon.post("/api/auth/reset", json={"token": token, "password": "another-pw"}).status_code == 400
    assert anon.post("/api/auth/reset", json={"token": "garbage", "password": "another-pw"}).status_code == 400
    anon.post("/api/auth/logout")
    assert anon.post("/api/auth/login", json={"email": "eve@example.com", "password": "brand-new-pw"}).status_code == 200


class LimitedConfig(TestConfig):
    RATELIMIT_ENABLED = True


def test_login_rate_limit(app):
    limited = create_app(LimitedConfig)
    limited.test_client_class = app.test_client_class
    with limited.app_context():
        db.create_all()
    c = limited.test_client()
    codes = [c.post("/api/auth/login", json={"email": "x@y.zz", "password": "p"}).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10 and codes[10] == 429
    assert "Too many" in c.post("/api/auth/login", json={}).json["error"]


# --- Shared libraries ----------------------------------------------------------

def test_libraries_are_isolated(app):
    alice, bob = app.test_client(), app.test_client()
    register(alice, "alice@example.com")
    register(bob, "bob@example.com")
    book_id = add_book(alice)["id"]
    assert bob.get("/api/books").json == []
    assert bob.get(f"/api/books/{book_id}").status_code == 404
    assert bob.delete(f"/api/books/{book_id}").status_code == 404
    assert bob.post(f"/api/books/{book_id}/sessions", json={"minutes": 10}).status_code == 404


def test_join_share_and_leave(app):
    alice, bob = app.test_client(), app.test_client()
    code = register(alice, "alice@example.com", "Alice")["library"]["invite_code"]
    register(bob, "bob@example.com", "Bob")
    book_id = add_book(alice)["id"]

    assert bob.post("/api/library/join", json={"code": "wrong"}).status_code == 422
    joined = bob.post("/api/library/join", json={"code": code}).json
    assert sorted(m["name"] for m in joined["library"]["members"]) == ["Alice", "Bob"]

    # Same books, but each member has their own reading state.
    bob.post(f"/api/books/{book_id}/sessions", json={"minutes": 20, "finished": True})
    assert bob.get(f"/api/books/{book_id}").json["read_status"] == "read"
    assert alice.get(f"/api/books/{book_id}").json["read_status"] == "to_read"

    # A new code invalidates the old one.
    new_code = alice.post("/api/library/invite").json["library"]["invite_code"]
    assert new_code != code

    left = bob.post("/api/library/leave").json
    assert len(left["library"]["members"]) == 1 and bob.get("/api/books").json == []
    assert len(alice.get("/api/books").json) == 1


def test_cannot_join_while_owning_books(app):
    alice, bob = app.test_client(), app.test_client()
    code = register(alice, "alice@example.com")["library"]["invite_code"]
    register(bob, "bob@example.com")
    add_book(bob)
    assert bob.post("/api/library/join", json={"code": code}).status_code == 409
