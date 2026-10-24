"""Who is signed in, and which rows they may touch.

Every endpoint that reads or changes data goes through these helpers, so the
"only your own library" rule lives in one place. A row of another library is
reported as missing (404), never as forbidden, so ids reveal nothing.
"""

from functools import wraps

from flask import session
from sqlalchemy.orm import selectinload

from .extensions import db
from .http import NotFound, error
from .models import Book, Reading, User

# Loading options for book lists that show loans and reading progress (avoids N+1 queries).
WITH_HISTORY = (selectinload(Book.loans), selectinload(Book.readings).selectinload(Reading.sessions))


def current_user():
    # db.session.get() uses the identity map after the first call: no extra queries.
    user_id = session.get("user_id")
    return db.session.get(User, user_id) if user_id else None


def start_session(user):
    session.clear()
    session["user_id"] = user.id
    session.permanent = True


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if current_user() is None:
            return error("sign_in", 401)
        return view(*args, **kwargs)
    return wrapper


def library_books(*options):
    """Query for the books of the signed-in user's library."""
    return db.select(Book).filter_by(library_id=current_user().library_id).options(*options)


def library_book(book_id):
    """A book of the user's library, or 404."""
    book = db.session.scalar(library_books().filter_by(id=book_id))
    if book is None:
        raise NotFound()
    return book


def own_row(model, row_id):
    """A reading or note of the signed-in user, on a book of their current library, or 404."""
    row = db.session.get(model, row_id)
    user = current_user()
    if row is None or row.user_id != user.id or row.book.library_id != user.library_id:
        raise NotFound()
    return row
