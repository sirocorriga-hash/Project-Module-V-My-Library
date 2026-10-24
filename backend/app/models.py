"""Database tables.

    libraries 1──* users                 (members share one catalogue)
    libraries 1──* books 1──* loans      (loans belong to the physical copy)
    users ─┬─* readings *── books        (each reading of a book by a member)
           │      1──* reading_sessions
           └─* notes *── books
"""

import secrets
from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db
from .limits import (
    BOOK_STATUSES,
    LANGUAGES,
    MAX_GOAL,
    MAX_MINUTES,
    MAX_PACE,
    MAX_PAGES,
    MAX_SESSION_PAGES,
    MAX_YEAR,
    RATING,
    sql_in,
)


def _now():
    return datetime.now(timezone.utc)


def new_invite_code():
    return secrets.token_urlsafe(6)


class Library(db.Model):
    __tablename__ = "libraries"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, default="My Library")
    invite_code = db.Column(db.String(16), nullable=False, unique=True, default=new_invite_code)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    members = db.relationship("User", back_populates="library")
    books = db.relationship("Book", back_populates="library", cascade="all, delete-orphan", passive_deletes=True)

    @classmethod
    def personal(cls, owner_name):
        """The library every new account starts with (also after leaving a shared one)."""
        return cls(name=f"{owner_name} · My Library")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "invite_code": self.invite_code,
                "members": [{"id": u.id, "name": u.name} for u in self.members]}


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"daily_minutes BETWEEN 1 AND {MAX_MINUTES}", name="ck_users_daily_minutes"),
        CheckConstraint(f"pages_per_hour IS NULL OR pages_per_hour BETWEEN 1 AND {MAX_PACE}", name="ck_users_pph"),
        CheckConstraint(f"yearly_goal IS NULL OR yearly_goal BETWEEN 1 AND {MAX_GOAL}", name="ck_users_goal"),
        CheckConstraint(sql_in("language", LANGUAGES), name="ck_users_language"),
    )

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(254), nullable=False, unique=True, index=True)
    name = db.Column(db.String(120), nullable=False, default="")
    password_hash = db.Column(db.String(255), nullable=False)
    library_id = db.Column(db.Integer, db.ForeignKey("libraries.id"), nullable=False, index=True)
    pages_per_hour = db.Column(db.Integer, nullable=True)      # NULL = measure it from sessions
    daily_minutes = db.Column(db.Integer, nullable=False, default=30)
    yearly_goal = db.Column(db.Integer, nullable=True)         # books to finish this year
    language = db.Column(db.String(2), nullable=False, default="it")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    library = db.relationship("Library", back_populates="members")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id, "email": self.email, "name": self.name, "language": self.language,
            "pages_per_hour": self.pages_per_hour, "daily_minutes": self.daily_minutes,
            "yearly_goal": self.yearly_goal, "library": self.library.to_dict(),
        }


class Book(db.Model):
    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint(sql_in("status", BOOK_STATUSES), name="ck_books_status"),
        CheckConstraint(f"year IS NULL OR (year BETWEEN 0 AND {MAX_YEAR})", name="ck_books_year"),
        CheckConstraint(f"pages IS NULL OR pages BETWEEN 1 AND {MAX_PAGES}", name="ck_books_pages"),
    )

    id = db.Column(db.Integer, primary_key=True)
    library_id = db.Column(db.Integer, db.ForeignKey("libraries.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(300), nullable=False, default="")
    author = db.Column(db.String(200), nullable=False, default="")
    genre = db.Column(db.String(100), nullable=False, default="")
    year = db.Column(db.Integer, nullable=True)
    isbn = db.Column(db.String(32), nullable=False, default="")
    shelfmark = db.Column(db.String(32), nullable=False, default="")
    pages = db.Column(db.Integer, nullable=True)
    cover_url = db.Column(db.String(500), nullable=False, default="")
    wishlist = db.Column(db.Boolean, nullable=False, default=False)   # not owned yet
    # Current loan state of the copy; the history is in `loans`.
    status = db.Column(db.String(16), nullable=False, default="available")
    borrower = db.Column(db.String(120), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    library = db.relationship("Library", back_populates="books")
    loans = db.relationship("Loan", back_populates="book", cascade="all, delete-orphan",
                            passive_deletes=True, order_by="Loan.lent_on")
    readings = db.relationship("Reading", back_populates="book", cascade="all, delete-orphan",
                               passive_deletes=True, order_by="Reading.started_on")
    notes = db.relationship("Note", back_populates="book", cascade="all, delete-orphan", passive_deletes=True)

    CATALOGUE_FIELDS = ("title", "author", "genre", "year", "isbn", "shelfmark", "pages", "cover_url", "wishlist")

    @property
    def open_loan(self):
        return next((loan for loan in self.loans if loan.returned_on is None), None)

    # Readings are personal: these always take the user whose readings are wanted.
    def readings_of(self, user):
        return [r for r in self.readings if r.user_id == user.id]

    def open_reading(self, user):
        return next((r for r in self.readings_of(user) if r.finished_on is None), None)


class Loan(db.Model):
    __tablename__ = "loans"
    __table_args__ = (
        CheckConstraint("returned_on IS NULL OR returned_on >= lent_on", name="ck_loans_returned"),
        CheckConstraint("due_on IS NULL OR due_on >= lent_on", name="ck_loans_due"),
    )

    id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    borrower = db.Column(db.String(120), nullable=False, default="")
    lent_on = db.Column(db.Date, nullable=False, default=date.today)
    due_on = db.Column(db.Date, nullable=True)
    returned_on = db.Column(db.Date, nullable=True)

    book = db.relationship("Book", back_populates="loans")

    def days(self, today=None):
        return ((self.returned_on or today or date.today()) - self.lent_on).days

    def is_overdue(self, today=None):
        return self.returned_on is None and self.due_on is not None and self.due_on < (today or date.today())

    def to_dict(self):
        return {
            "id": self.id, "book_id": self.book_id, "borrower": self.borrower,
            "lent_on": self.lent_on.isoformat(),
            "due_on": self.due_on.isoformat() if self.due_on else None,
            "returned_on": self.returned_on.isoformat() if self.returned_on else None,
            "days": self.days(), "active": self.returned_on is None, "overdue": self.is_overdue(),
        }


class Reading(db.Model):
    """One reading of a book by one user. Re-reading a book starts a new row."""
    __tablename__ = "readings"
    __table_args__ = (
        CheckConstraint("finished_on IS NULL OR finished_on >= started_on", name="ck_readings_dates"),
        CheckConstraint(f"rating IS NULL OR rating BETWEEN {RATING[0]} AND {RATING[1]}", name="ck_readings_rating"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    started_on = db.Column(db.Date, nullable=False, default=date.today)
    finished_on = db.Column(db.Date, nullable=True)            # NULL = still reading
    rating = db.Column(db.Integer, nullable=True)

    book = db.relationship("Book", back_populates="readings")
    sessions = db.relationship("ReadingSession", back_populates="reading", cascade="all, delete-orphan",
                               passive_deletes=True, order_by="ReadingSession.read_on")

    @property
    def minutes(self):
        return sum(s.minutes for s in self.sessions)

    @property
    def pages_read(self):
        return sum(s.pages or 0 for s in self.sessions)

    def to_dict(self, with_sessions=False):
        out = {
            "id": self.id, "book_id": self.book_id,
            "started_on": self.started_on.isoformat(),
            "finished_on": self.finished_on.isoformat() if self.finished_on else None,
            "rating": self.rating, "minutes": self.minutes, "pages_read": self.pages_read,
        }
        if with_sessions:
            out["sessions"] = [s.to_dict() for s in reversed(self.sessions)]
        return out


class ReadingSession(db.Model):
    __tablename__ = "reading_sessions"
    __table_args__ = (
        CheckConstraint(f"minutes BETWEEN 1 AND {MAX_MINUTES}", name="ck_sessions_minutes"),
        CheckConstraint(f"pages IS NULL OR pages BETWEEN 0 AND {MAX_SESSION_PAGES}", name="ck_sessions_pages"),
    )

    id = db.Column(db.Integer, primary_key=True)
    reading_id = db.Column(db.Integer, db.ForeignKey("readings.id", ondelete="CASCADE"), nullable=False, index=True)
    read_on = db.Column(db.Date, nullable=False, default=date.today, index=True)
    minutes = db.Column(db.Integer, nullable=False)
    pages = db.Column(db.Integer, nullable=True)

    reading = db.relationship("Reading", back_populates="sessions")

    def to_dict(self):
        return {"id": self.id, "read_on": self.read_on.isoformat(), "minutes": self.minutes, "pages": self.pages}


class Note(db.Model):
    """A personal note or a quote (with optional page) on a book."""
    __tablename__ = "notes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    is_quote = db.Column(db.Boolean, nullable=False, default=False)
    page = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_now)

    book = db.relationship("Book", back_populates="notes")

    def to_dict(self):
        return {"id": self.id, "book_id": self.book_id, "body": self.body, "is_quote": self.is_quote,
                "page": self.page, "created_at": self.created_at.isoformat()}
