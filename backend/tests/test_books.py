from datetime import date, timedelta

import app.lookup as lookup

from .conftest import add_book


def test_create_validate_update_delete(client):
    book = add_book(client, pages="250", cover_url="javascript:alert(1)")
    assert book["pages"] == 250 and book["cover_url"] == "" and book["read_status"] == "to_read"
    bad = client.post("/api/books", json={"title": " ", "author": "X", "genre": "Y", "year": 3000})
    assert bad.status_code == 422 and set(bad.json["fields"]) == {"title", "year"}
    upd = client.put(f"/api/books/{book['id']}", json={**book, "title": "Dune Messiah", "wishlist": True})
    assert upd.json["title"] == "Dune Messiah" and upd.json["read_status"] == "wishlist"
    assert client.delete(f"/api/books/{book['id']}").status_code == 204
    assert client.get(f"/api/books/{book['id']}").status_code == 404


def test_lend_due_date_overdue_and_return(client):
    book_id = add_book(client)["id"]
    due = (date.today() + timedelta(days=14)).isoformat()
    lent = client.post(f"/api/books/{book_id}/lend", json={"borrower": "Luca", "due_on": due}).json
    assert lent["status"] == "loaned" and lent["due_on"] == due and not lent["overdue"]
    past = (date.today() - timedelta(days=1)).isoformat()
    assert client.post(f"/api/books/{book_id}/lend", json={"borrower": "Luca", "due_on": past}).status_code == 422
    # Lending a book that is already out edits the open loan.
    client.post(f"/api/books/{book_id}/lend", json={"borrower": "Luca R.", "due_on": None})
    back = client.post(f"/api/books/{book_id}/return").json
    assert back["status"] == "available" and back["borrower"] == ""
    loans = client.get(f"/api/books/{book_id}/history").json["loans"]
    assert len(loans) == 1 and loans[0]["borrower"] == "Luca R." and not loans[0]["active"]
    assert client.get("/api/borrowers").json == ["Luca R."]


def test_wishlist_books_cannot_be_lent(client):
    book_id = add_book(client, wishlist=True)["id"]
    assert client.post(f"/api/books/{book_id}/lend", json={"borrower": "X"}).status_code == 409


def test_readings_sessions_and_rereads(client):
    book_id = add_book(client, pages=100)["id"]
    res = client.post(f"/api/books/{book_id}/sessions", json={"minutes": 30, "pages": 20})
    assert res.status_code == 201 and res.json["book"]["read_status"] == "reading"
    res = client.post(f"/api/books/{book_id}/sessions", json={"minutes": 90, "pages": 80, "finished": True, "rating": 4})
    book = res.json["book"]
    assert book["read_status"] == "read" and book["rating"] == 4 and book["times_read"] == 1
    assert book["minutes_read"] == 120 and book["pages_read"] == 100

    # Re-read: a new reading, the first one stays in the history.
    assert client.post(f"/api/books/{book_id}/readings").json["read_status"] == "reading"
    assert client.post(f"/api/books/{book_id}/readings").status_code == 409
    history = client.get(f"/api/books/{book_id}/history").json
    assert [r["finished_on"] is None for r in history["readings"]] == [True, False]

    # Reopening the finished one is refused while another reading is open.
    first_id = history["readings"][1]["id"]
    assert client.put(f"/api/readings/{first_id}", json={"finished_on": None}).status_code == 409
    assert client.put(f"/api/readings/{first_id}", json={"rating": 9}).status_code == 422
    client.delete(f"/api/readings/{history['readings'][0]['id']}")
    assert client.get(f"/api/books/{book_id}").json["read_status"] == "read"

    session_id = history["readings"][1]["sessions"][0]["id"]
    assert client.delete(f"/api/sessions/{session_id}").json["minutes_read"] == 30


def test_session_validation(client):
    book_id = add_book(client)["id"]
    future = (date.today() + timedelta(days=2)).isoformat()
    res = client.post(f"/api/books/{book_id}/sessions", json={"minutes": 0, "read_on": future})
    assert res.status_code == 422 and set(res.json["fields"]) == {"minutes", "read_on"}


def test_notes(client):
    book_id = add_book(client)["id"]
    assert client.post(f"/api/books/{book_id}/notes", json={"body": "  "}).status_code == 422
    note = client.post(f"/api/books/{book_id}/notes", json={"body": "Spice!", "is_quote": True, "page": 12}).json
    assert client.get(f"/api/books/{book_id}/history").json["notes"][0]["page"] == 12
    assert client.delete(f"/api/notes/{note['id']}").status_code == 204


def test_isbn_lookup(client, monkeypatch):
    record = {"ISBN:9780261102217": {
        "title": "The Hobbit", "authors": [{"name": "J.R.R. Tolkien"}], "number_of_pages": 310,
        "publish_date": "September 21, 1937", "subjects": [{"name": "Fantasy"}],
        "cover": {"medium": "http://covers.openlibrary.org/b/id/1-M.jpg"}}}
    monkeypatch.setattr(lookup, "fetch_json", lambda url: record if "9780261102217" in url else {})
    data = client.get("/api/lookup/isbn/978-0-261-10221-7").json
    assert data == {"isbn": "9780261102217", "title": "The Hobbit", "author": "J.R.R. Tolkien", "year": 1937,
                    "pages": 310, "genre": "Fantasy", "cover_url": "https://covers.openlibrary.org/b/id/1-M.jpg"}
    assert client.get("/api/lookup/isbn/9780000000002").status_code == 404
    assert client.get("/api/lookup/isbn/123").status_code == 422

    def offline(url):
        raise TimeoutError()
    monkeypatch.setattr(lookup, "fetch_json", offline)
    assert client.get("/api/lookup/isbn/9780261102217").status_code == 502


def test_import_modes(client):
    add_book(client, genre="Old genre")
    incoming = [{"title": "DUNE", "author": "frank herbert", "genre": "Sci-Fi"},
                {"title": "Emma", "author": "Jane Austen", "genre": "Fiction"}, {"foo": "not a book"}]
    assert client.post("/api/books/import", json={"mode": "preview", "books": incoming}).json == \
        {"total": 2, "matched": 1, "fresh": 1}
    assert client.post("/api/books/import", json={"mode": "add", "books": incoming}).json == {"added": 1, "updated": 0}
    assert client.post("/api/books/import", json={"mode": "update", "books": {"books": incoming}}).json == \
        {"added": 0, "updated": 1}
    assert client.post("/api/books/import", json={"mode": "replace", "books": incoming[:1]}).json == \
        {"added": 1, "updated": 0}
    assert len(client.get("/api/books").json) == 1
    assert client.post("/api/books/import", json={"mode": "zap", "books": []}).status_code == 400
    assert client.post("/api/books/import", json={"mode": "add", "books": [{}]}).status_code == 400


def test_export_import_roundtrip(app, client):
    from .conftest import register
    book_id = add_book(client, pages=50)["id"]
    client.post(f"/api/books/{book_id}/sessions", json={"minutes": 25, "pages": 10, "finished": True, "rating": 5})
    client.post(f"/api/books/{book_id}/notes", json={"body": "Great"})
    client.post(f"/api/books/{book_id}/lend", json={"borrower": "Luca"})
    exported = client.get("/api/books/export").json
    assert exported[0]["readings"][0]["rating"] == 5 and exported[0]["loans"][0]["borrower"] == "Luca"

    other = app.test_client()
    register(other, "other@example.com")
    assert other.post("/api/books/import", json={"mode": "add", "books": exported}).json["added"] == 1
    book = other.get("/api/books").json[0]
    assert book["read_status"] == "read" and book["rating"] == 5 and book["status"] == "loaned"
    history = other.get(f"/api/books/{book['id']}/history").json
    assert history["notes"][0]["body"] == "Great" and len(history["loans"]) == 1


def test_import_drops_out_of_range_year_and_pages(client):
    dirty = [{"title": "A", "author": "X", "year": 3000, "pages": 99999},
             {"title": "B", "author": "X", "year": -5, "pages": 300}]
    assert client.post("/api/books/import", json={"mode": "add", "books": dirty}).json["added"] == 2
    first, second = client.get("/api/books").json
    assert (first["year"], first["pages"]) == (None, None)
    assert (second["year"], second["pages"]) == (None, 300)


def test_import_previous_file_format(client):
    legacy = [{"title": "Old", "author": "Format", "genre": "G", "read_status": "read", "finished_on": "2026-01-10",
               "sessions": [{"read_on": "2026-01-05", "minutes": 40, "pages": 30}]}]
    client.post("/api/books/import", json={"mode": "add", "books": legacy})
    book = client.get("/api/books").json[0]
    assert book["read_status"] == "read" and book["finished_on"] == "2026-01-10" and book["minutes_read"] == 40
