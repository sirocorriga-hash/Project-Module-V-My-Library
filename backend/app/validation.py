"""Single checkpoint for incoming data.

Every record that reaches the database passes through one of these functions.
Errors are message keys (see messages.py), translated when the response is built.
"""

import re
from datetime import date

from .limits import (
    LANGUAGES,
    MAX_GOAL,
    MAX_LEN,
    MAX_MINUTES,
    MAX_NAME,
    MAX_NOTE,
    MAX_PACE,
    MAX_PAGES,
    MAX_SESSION_PAGES,
    MAX_YEAR,
    MIN_PASSWORD,
    RATING,
    in_range,
)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ValidationError(ValueError):
    """`errors` maps field -> message key."""

    def __init__(self, errors):
        super().__init__(", ".join(f"{k}: {v}" for k, v in errors.items()))
        self.errors = errors


def text(value, limit=None):
    out = "" if value is None else str(value).strip()
    return out[:limit] if limit else out


def integer(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def parse_date(value):
    """ISO date (or the date part of a timestamp) -> date, else None."""
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(text(value)[:10])
    except ValueError:
        return None


def _check(errors, condition, field, key):
    if not condition:
        errors.setdefault(field, key)


def _raise_if(errors):
    if errors:
        raise ValidationError(errors)


def optional_int(raw, key):
    """'' / None -> None; otherwise the integer, or a sentinel that fails range checks."""
    if raw.get(key) in (None, ""):
        return None
    value = integer(raw.get(key))
    return value if value is not None else -1


# --- Books ------------------------------------------------------------------

def clean_isbn(value):
    return re.sub(r"[^0-9Xx]", "", text(value)).upper()


def normalise(raw):
    """Return a clean dict with exactly the known book fields (lenient: used for imports too)."""
    raw = raw if isinstance(raw, dict) else {}
    book = {key: text(raw.get(key), limit) for key, limit in MAX_LEN.items()}
    book["year"] = integer(raw.get("year"))
    pages = integer(raw.get("pages"))
    book["pages"] = pages if pages and pages > 0 else None
    book["wishlist"] = raw.get("wishlist") is True
    book["status"] = "loaned" if raw.get("status") == "loaned" and not book["wishlist"] else "available"
    if book["status"] == "available":
        book["borrower"] = ""          # the borrower only makes sense for a book that is out
    if not book["cover_url"].startswith("https://"):
        book["cover_url"] = ""         # only https images, never javascript: or data: URLs
    return book


def validate_book(raw):
    """Stricter rules for a book typed in by hand (mirrors the form's `required`)."""
    book = normalise(raw)
    errors = {}
    _check(errors, book["title"], "title", "title_required")
    _check(errors, book["author"], "author", "author_required")
    _check(errors, book["genre"], "genre", "genre_required")
    _check(errors, book["year"] is None or 0 <= book["year"] <= MAX_YEAR, "year", "year_range")
    _check(errors, book["pages"] is None or book["pages"] <= MAX_PAGES, "pages", "pages_range")
    _raise_if(errors)
    return book


def normalise_import(raw):
    """Like `normalise`, but a year or page count the database would refuse is dropped, not an error."""
    book = normalise(raw)
    if book["year"] is not None and not 0 <= book["year"] <= MAX_YEAR:
        book["year"] = None
    if book["pages"] is not None and book["pages"] > MAX_PAGES:
        book["pages"] = None
    return book


def import_session(raw):
    """A session from an export file as (read_on, minutes, pages), or None if unusable."""
    if not isinstance(raw, dict):
        return None
    read_on, minutes, pages = parse_date(raw.get("read_on")), raw.get("minutes"), raw.get("pages")
    if not (read_on and isinstance(minutes, int) and in_range(minutes, 1, MAX_MINUTES)):
        return None
    return read_on, minutes, pages if isinstance(pages, int) and in_range(pages, 0, MAX_SESSION_PAGES) else None


def import_rating(value):
    return value if isinstance(value, int) and in_range(value, *RATING) else None


def looks_like_book(value):
    """An imported record is usable only if it has at least a title or an author."""
    return isinstance(value, dict) and bool(text(value.get("title")) or text(value.get("author")))


def fingerprint(book):
    """Same title + same author = same book, regardless of id."""
    return f"{book['title'].lower()}|{book['author'].lower()}"


# --- Loans ------------------------------------------------------------------

def validate_lend(raw, today=None):
    raw = raw if isinstance(raw, dict) else {}
    today = today or date.today()
    due = parse_date(raw.get("due_on")) if raw.get("due_on") else None
    errors = {}
    _check(errors, not raw.get("due_on") or due, "due_on", "date_invalid")
    _check(errors, due is None or due >= today, "due_on", "due_before_lent")
    _raise_if(errors)
    return {"borrower": text(raw.get("borrower"), MAX_LEN["borrower"]), "due_on": due}


# --- Readings, sessions, notes ----------------------------------------------

def validate_session(raw):
    raw = raw if isinstance(raw, dict) else {}
    read_on = parse_date(raw.get("read_on")) if raw.get("read_on") else date.today()
    minutes = integer(raw.get("minutes"))
    pages = optional_int(raw, "pages")
    rating = optional_int(raw, "rating")
    errors = {}
    _check(errors, read_on, "read_on", "date_invalid")
    _check(errors, read_on is None or read_on <= date.today(), "read_on", "date_future")
    _check(errors, in_range(minutes, 1, MAX_MINUTES), "minutes", "minutes_range")
    _check(errors, pages is None or in_range(pages, 0, MAX_SESSION_PAGES), "pages", "session_pages_range")
    _check(errors, rating is None or in_range(rating, *RATING), "rating", "rating_range")
    _raise_if(errors)
    return {"read_on": read_on, "minutes": minutes, "pages": pages,
            "finished": raw.get("finished") is True, "rating": rating}


def validate_reading(raw, current):
    """Partial update of a reading: started_on, finished_on (null = reopen), rating."""
    raw = raw if isinstance(raw, dict) else {}
    out, errors = {}, {}
    for field in ("started_on", "finished_on"):
        if field in raw:
            value = parse_date(raw[field]) if raw[field] else None
            _check(errors, value or (field == "finished_on" and not raw[field]), field, "date_invalid")
            _check(errors, value is None or value <= date.today(), field, "date_future")
            out[field] = value
    if "rating" in raw:
        out["rating"] = optional_int(raw, "rating")
        _check(errors, out["rating"] is None or in_range(out["rating"], *RATING), "rating", "rating_range")
    start = out.get("started_on", current.started_on)
    end = out.get("finished_on", current.finished_on)
    _check(errors, not (start and end) or end >= start, "finished_on", "finished_before_start")
    _raise_if(errors)
    return out


def validate_note(raw):
    raw = raw if isinstance(raw, dict) else {}
    body = text(raw.get("body"), MAX_NOTE)
    page = optional_int(raw, "page")
    errors = {}
    _check(errors, body, "body", "note_required")
    _check(errors, page is None or in_range(page, 1, MAX_PAGES), "page", "note_page")
    _raise_if(errors)
    return {"body": body, "page": page, "is_quote": raw.get("is_quote") is True}


# --- Users and libraries ----------------------------------------------------

def validate_registration(raw):
    raw = raw if isinstance(raw, dict) else {}
    email = text(raw.get("email")).lower()
    data = {"email": email, "password": str(raw.get("password") or ""), "name": text(raw.get("name"), MAX_NAME),
            "language": raw.get("language") if raw.get("language") in LANGUAGES else LANGUAGES[0]}
    errors = {}
    _check(errors, data["name"], "name", "name_required")
    _check(errors, EMAIL_RE.match(email) and len(email) <= 254, "email", "email_invalid")
    _check(errors, len(data["password"]) >= MIN_PASSWORD, "password", "password_short")
    _raise_if(errors)
    return data


def validate_password(raw):
    password = str((raw or {}).get("password") or "")
    _raise_if({} if len(password) >= MIN_PASSWORD else {"password": "password_short"})
    return password


def validate_settings(raw):
    """Partial update of the profile. Only the keys present are changed."""
    raw = raw if isinstance(raw, dict) else {}
    out, errors = {}, {}
    if "name" in raw:
        out["name"] = text(raw["name"], MAX_NAME)
        _check(errors, out["name"], "name", "name_required")
    if "language" in raw:
        out["language"] = raw["language"]
        _check(errors, raw["language"] in LANGUAGES, "language", "language_invalid")
    if "daily_minutes" in raw:
        out["daily_minutes"] = integer(raw["daily_minutes"])
        _check(errors, in_range(out["daily_minutes"], 1, MAX_MINUTES), "daily_minutes", "daily_minutes_range")
    for key, upper, message in (("pages_per_hour", MAX_PACE, "pace_range"), ("yearly_goal", MAX_GOAL, "goal_range")):
        if key in raw:
            out[key] = optional_int(raw, key)
            _check(errors, out[key] is None or in_range(out[key], 1, upper), key, message)
    _raise_if(errors)
    return out
