"""The catalogue: books of the signed-in user's library."""

from flask import Blueprint, jsonify

from .access import WITH_HISTORY, current_user, library_book, library_books, login_required
from .extensions import db
from .http import body, error
from .models import Book
from .services import apply_book, book_view, new_book
from .validation import validate_book

bp = Blueprint("books", __name__, url_prefix="/api/books")


def view(book):
    """The JSON answer for one book, as the signed-in user sees it."""
    return jsonify(book_view(book, current_user()))


@bp.get("")
@login_required
def list_books():
    books = db.session.scalars(library_books(*WITH_HISTORY).order_by(Book.id)).all()
    return jsonify([book_view(b, current_user()) for b in books])


@bp.get("/<int:book_id>")
@login_required
def get_book(book_id):
    return view(library_book(book_id))


@bp.post("")
@login_required
def create_book():
    book = new_book(current_user().library, validate_book(body()))
    db.session.commit()
    return view(book), 201


@bp.put("/<int:book_id>")
@login_required
def update_book(book_id):
    book = library_book(book_id)
    data = validate_book(body())
    if data["wishlist"] and book.status == "loaned":
        return error("wishlist_no_loan", 409)
    apply_book(book, data)
    db.session.commit()
    return view(book)


@bp.delete("/<int:book_id>")
@login_required
def delete_book(book_id):
    db.session.delete(library_book(book_id))
    db.session.commit()
    return "", 204


@bp.get("/<int:book_id>/history")
@login_required
def book_history(book_id):
    """Everything the detail window shows: my readings with sessions, my notes, the loans."""
    book, user = library_book(book_id), current_user()
    return jsonify({
        "book": book_view(book, user),
        "readings": [r.to_dict(with_sessions=True) for r in reversed(book.readings_of(user))],
        "notes": [n.to_dict() for n in sorted(book.notes, key=lambda n: n.created_at, reverse=True)
                  if n.user_id == user.id],
        "loans": [l.to_dict() for l in reversed(book.loans)],
    })
