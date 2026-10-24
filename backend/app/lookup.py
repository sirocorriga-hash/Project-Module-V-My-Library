"""Book data from an ISBN, via the free Open Library API.

The browser asks our server, not Open Library directly, so the answer can be
cleaned up here and the frontend receives exactly the fields of the book form.
"""

import json
import re
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from flask import Blueprint, current_app, jsonify

from .access import login_required
from .http import error
from .validation import ValidationError, clean_isbn

bp = Blueprint("lookup", __name__, url_prefix="/api/lookup")


def fetch_json(url):
    """Isolated so the tests can replace it."""
    req = Request(url, headers={"User-Agent": "MyLibrary/4 (personal catalogue)"})
    with urlopen(req, timeout=8) as res:
        return json.load(res)


def isbn_valid(isbn):
    return len(isbn) in (10, 13) and isbn[:-1].isdigit()


def parse_openlibrary(isbn, data):
    """Turn Open Library's `jscmd=data` record into book-form fields."""
    year = re.search(r"\d{4}", data.get("publish_date", ""))
    subjects = [s.get("name", "") for s in data.get("subjects", []) if isinstance(s, dict)]
    cover = (data.get("cover") or {}).get("medium", "")
    return {
        "isbn": isbn,
        "title": data.get("title", "")[:300],
        "author": ", ".join(a.get("name", "") for a in data.get("authors", []) if isinstance(a, dict))[:200],
        "year": int(year.group()) if year else None,
        "pages": data.get("number_of_pages") if isinstance(data.get("number_of_pages"), int) else None,
        "genre": subjects[0][:100] if subjects else "",
        "cover_url": cover.replace("http://", "https://", 1) if cover else "",
    }


@bp.get("/isbn/<path:raw>")
@login_required
def by_isbn(raw):
    isbn = clean_isbn(raw)
    if not isbn_valid(isbn):
        raise ValidationError({"isbn": "isbn_invalid"})
    url = f"{current_app.config['OPENLIBRARY_URL']}/api/books?bibkeys=ISBN:{quote(isbn)}&format=json&jscmd=data"
    try:
        data = fetch_json(url)
    except (URLError, TimeoutError, ValueError):
        return error("lookup_failed", 502)
    record = data.get(f"ISBN:{isbn}") if isinstance(data, dict) else None
    if not record:
        return error("isbn_not_found", 404)
    return jsonify(parse_openlibrary(isbn, record))
