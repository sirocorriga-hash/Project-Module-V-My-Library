"""Export the catalogue to a JSON file, and import one back."""

from datetime import date

from flask import Blueprint, Response, json
from sqlalchemy.orm import selectinload

from .access import WITH_HISTORY, current_user, library_books, login_required
from .extensions import db
from .http import body, error
from .models import Book
from .services import export_book, import_books
from .validation import looks_like_book

bp = Blueprint("transfer", __name__, url_prefix="/api/books")

IMPORT_MODES = ("preview", "add", "update", "replace")


@bp.get("/export")
@login_required
def export_books():
    books = db.session.scalars(library_books(*WITH_HISTORY, selectinload(Book.notes)).order_by(Book.id)).all()
    payload = json.dumps([export_book(b, current_user()) for b in books], indent=2, ensure_ascii=False)
    return Response(payload, mimetype="application/json", headers={
        "Content-Disposition": f'attachment; filename="my-library-{date.today().isoformat()}.json"'})


@bp.post("/import")
@login_required
def import_file():
    """Body: {"mode": "preview"|"add"|"update"|"replace", "books": [...] or {"books": [...]}}."""
    data = body()
    if not data:
        return error("bad_json")
    mode = data.get("mode", "preview")
    if mode not in IMPORT_MODES:
        return error("unknown_mode")
    items = data.get("books")
    items = items.get("books") if isinstance(items, dict) else items   # a whole export file is accepted too
    if not isinstance(items, list):
        return error("no_list")
    records = [item for item in items if looks_like_book(item)]
    if not records:
        return error("no_books")

    user = current_user()
    existing = db.session.scalars(library_books(*WITH_HISTORY)).all()
    result = import_books(user.library, user, existing, records, mode)
    if mode != "preview":
        db.session.commit()
    return result
