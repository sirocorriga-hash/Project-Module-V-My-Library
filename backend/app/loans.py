"""Lending a book and getting it back."""

from flask import Blueprint, jsonify

from .access import current_user, library_book, login_required
from .books import view
from .extensions import db
from .http import body, error
from .models import Book, Loan
from .services import give_back, lend
from .validation import validate_lend

bp = Blueprint("loans", __name__, url_prefix="/api")


@bp.post("/books/<int:book_id>/lend")
@login_required
def lend_book(book_id):
    """Body: {"borrower": "Luca", "due_on": "YYYY-MM-DD" | null}. On a loaned book it edits the loan."""
    book = library_book(book_id)
    if book.wishlist:
        return error("wishlist_no_loan", 409)
    data = validate_lend(body())
    lend(book, data["borrower"], data["due_on"])
    db.session.commit()
    return view(book)


@bp.post("/books/<int:book_id>/return")
@login_required
def return_book(book_id):
    book = library_book(book_id)
    give_back(book)
    db.session.commit()
    return view(book)


@bp.get("/borrowers")
@login_required
def borrowers():
    """Names already used in this library, most recent first (for the autocomplete)."""
    last_lent = db.func.max(Loan.lent_on)
    rows = db.session.execute(
        db.select(Loan.borrower, last_lent).join(Book)
        .where(Book.library_id == current_user().library_id, Loan.borrower != "")
        .group_by(Loan.borrower).order_by(last_lent.desc())
    ).all()
    return jsonify([name for name, _ in rows])
