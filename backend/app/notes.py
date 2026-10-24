"""Personal notes and quotes on a book."""

from flask import Blueprint, jsonify

from .access import current_user, library_book, login_required, own_row
from .extensions import db
from .http import body
from .models import Note
from .validation import validate_note

bp = Blueprint("notes", __name__, url_prefix="/api")


@bp.post("/books/<int:book_id>/notes")
@login_required
def add_note(book_id):
    book = library_book(book_id)
    note = Note(user_id=current_user().id, **validate_note(body()))
    book.notes.append(note)
    db.session.commit()
    return jsonify(note.to_dict()), 201


@bp.delete("/notes/<int:note_id>")
@login_required
def delete_note(note_id):
    db.session.delete(own_row(Note, note_id))
    db.session.commit()
    return "", 204
