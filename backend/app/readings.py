"""Readings of a book (one per read-through) and their reading sessions."""

from flask import Blueprint, jsonify

from .access import current_user, library_book, login_required, own_row
from .books import view
from .extensions import db
from .http import NotFound, body, error
from .models import Reading, ReadingSession
from .services import book_view, log_session
from .validation import validate_reading, validate_session

bp = Blueprint("readings", __name__, url_prefix="/api")


@bp.post("/books/<int:book_id>/readings")
@login_required
def start_reading(book_id):
    """Start reading (or re-reading) a book today."""
    book, user = library_book(book_id), current_user()
    if book.open_reading(user):
        return error("reading_open", 409)
    book.readings.append(Reading(user_id=user.id))
    db.session.commit()
    return view(book), 201


@bp.put("/readings/<int:reading_id>")
@login_required
def update_reading(reading_id):
    """Finish (finished_on), reopen (finished_on: null), rate, or correct the start date."""
    reading = own_row(Reading, reading_id)
    changes = validate_reading(body(), reading)
    reopening = "finished_on" in changes and changes["finished_on"] is None
    other_open = reading.book.open_reading(current_user())
    if reopening and other_open is not None and other_open is not reading:
        return error("reading_open", 409)
    for key, value in changes.items():
        setattr(reading, key, value)
    db.session.commit()
    return view(reading.book)


@bp.delete("/readings/<int:reading_id>")
@login_required
def delete_reading(reading_id):
    reading = own_row(Reading, reading_id)
    book = reading.book
    db.session.delete(reading)
    db.session.commit()
    db.session.refresh(book)
    return view(book)


@bp.post("/books/<int:book_id>/sessions")
@login_required
def add_session(book_id):
    """Body: {read_on, minutes, pages?, finished?, rating?}. Starts a reading if none is open."""
    book = library_book(book_id)
    session = log_session(book, current_user(), validate_session(body()))
    db.session.commit()
    return jsonify({"session": session.to_dict(), "book": book_view(book, current_user())}), 201


@bp.delete("/sessions/<int:session_id>")
@login_required
def delete_session(session_id):
    session = db.session.get(ReadingSession, session_id)
    if session is None:
        raise NotFound()
    reading = own_row(Reading, session.reading_id)
    db.session.delete(session)
    db.session.commit()
    db.session.refresh(reading.book)
    return view(reading.book)
