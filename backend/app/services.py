"""State changes that touch more than one table, and the per-user view of a book.

Keeping them here means the form, the buttons and the importer all update the
loan history and the readings in exactly the same way.
"""

from datetime import date

from .limits import MAX_LEN
from .models import Book, Loan, Note, Reading, ReadingSession, db
from .validation import fingerprint, import_rating, import_session, normalise_import, parse_date, validate_note

# --- Loans ------------------------------------------------------------------

def lend(book, borrower, due_on=None, today=None):
    loan = book.open_loan
    if loan is None:
        book.loans.append(Loan(borrower=borrower, due_on=due_on, lent_on=today or date.today()))
    else:                                   # already out: correct the name or the due date
        loan.borrower, loan.due_on = borrower, due_on
    book.status, book.borrower = "loaned", borrower


def give_back(book, today=None):
    loan = book.open_loan
    if loan is not None:
        loan.returned_on = today or date.today()
    book.status, book.borrower = "available", ""


def apply_book(book, data):
    """Write validated catalogue fields onto a book. Loans change only through lend/give_back."""
    for key in Book.CATALOGUE_FIELDS:
        setattr(book, key, data[key])
    return book


def sync_loan(book, data):
    """Used by the importer: bring the loan state in line with the file's `status`."""
    if data["status"] == "loaned" and book.open_loan is None:
        lend(book, data["borrower"])
    elif data["status"] == "loaned":
        book.status, book.borrower = "loaned", book.open_loan.borrower
    else:
        give_back(book)


# --- Readings ---------------------------------------------------------------

def log_session(book, user, data):
    """Add a session to the open reading, starting one if needed; optionally finish it."""
    reading = book.open_reading(user)
    if reading is None:
        reading = Reading(user_id=user.id, started_on=data["read_on"])
        book.readings.append(reading)
    reading.started_on = min(reading.started_on, data["read_on"])
    session = ReadingSession(read_on=data["read_on"], minutes=data["minutes"], pages=data["pages"])
    reading.sessions.append(session)
    if data["finished"]:
        reading.finished_on = max(data["read_on"], reading.started_on)
        reading.rating = data["rating"] or reading.rating
    return session


def book_view(book, user, today=None):
    """The book as the signed-in user sees it: catalogue data + their own reading state."""
    mine = book.readings_of(user)
    current = book.open_reading(user)
    finished = [r for r in mine if r.finished_on]
    latest = mine[-1] if mine else None
    if book.wishlist:
        read_status = "wishlist"
    elif current:
        read_status = "reading"
    elif finished:
        read_status = "read"
    else:
        read_status = "to_read"
    loan = book.open_loan
    return {
        "id": book.id,
        **{key: getattr(book, key) for key in Book.CATALOGUE_FIELDS},
        "status": book.status,
        "borrower": book.borrower,
        "due_on": loan.due_on.isoformat() if loan and loan.due_on else None,
        "overdue": bool(loan and loan.is_overdue(today)),
        "read_status": read_status,
        "times_read": len(finished),
        "finished_on": finished[-1].finished_on.isoformat() if finished else None,
        "rating": next((r.rating for r in reversed(finished) if r.rating), None),
        # Progress of the reading in progress (or of the last one).
        "minutes_read": latest.minutes if latest else 0,
        "pages_read": latest.pages_read if latest else 0,
        "session_count": len(latest.sessions) if latest else 0,
    }


# --- Import / export --------------------------------------------------------

def new_book(library, data, user=None, history=None):
    """Create a book; `history` is an export-file record whose loans/readings/notes are restored."""
    book = Book(library=library)
    db.session.add(book)
    apply_book(book, data)
    if history:
        restore_history(book, user, history)
    sync_loan(book, data)
    return book


def export_book(book, user):
    record = {key: getattr(book, key) for key in Book.CATALOGUE_FIELDS}
    record.update(status=book.status, borrower=book.borrower)
    record["loans"] = [{"borrower": l.borrower, "lent_on": l.lent_on.isoformat(),
                        "due_on": l.due_on.isoformat() if l.due_on else None,
                        "returned_on": l.returned_on.isoformat() if l.returned_on else None}
                       for l in book.loans]
    record["readings"] = [{k: v for k, v in r.to_dict(with_sessions=True).items()
                           if k in ("started_on", "finished_on", "rating", "sessions")}
                          for r in book.readings_of(user)]
    for reading in record["readings"]:
        for s in reading["sessions"]:
            s.pop("id")
    record["notes"] = [{k: v for k, v in n.to_dict().items() if k in ("body", "is_quote", "page")}
                       for n in book.notes if n.user_id == user.id]
    return record


def restore_history(book, user, raw):
    """Re-create loans, readings and notes from an export file. Bad rows are skipped.

    Also understands the previous file format, where `read_status`, `finished_on`
    and `sessions` sat directly on the book.
    """
    for item in raw.get("loans") or []:
        if not isinstance(item, dict):
            continue
        lent, due, back = (parse_date(item.get(k)) for k in ("lent_on", "due_on", "returned_on"))
        if lent and (back is None or back >= lent):
            book.loans.append(Loan(borrower=str(item.get("borrower") or "")[:MAX_LEN["borrower"]], lent_on=lent,
                                   due_on=due if due and due >= lent else None, returned_on=back))
    open_loans = sorted((l for l in book.loans if l.returned_on is None), key=lambda l: l.lent_on)
    for stale in open_loans[:-1]:           # at most one open loan
        stale.returned_on = stale.lent_on

    readings = raw.get("readings")
    if not isinstance(readings, list):      # previous format
        legacy_status = raw.get("read_status")
        readings = []
        if legacy_status in ("reading", "read") or raw.get("sessions"):
            readings = [{"sessions": raw.get("sessions") or [],
                         "finished_on": raw.get("finished_on") or (date.today().isoformat()
                                                                   if legacy_status == "read" else None)}]
    for item in readings:
        if not isinstance(item, dict):
            continue
        sessions = [ReadingSession(read_on=d, minutes=m, pages=p)
                    for d, m, p in filter(None, map(import_session, item.get("sessions") or []))]
        finished = parse_date(item.get("finished_on"))
        started = parse_date(item.get("started_on")) or min([s.read_on for s in sessions] + [finished or date.today()])
        book.readings.append(Reading(user_id=user.id, started_on=started, rating=import_rating(item.get("rating")),
                                     sessions=sessions,
                                     finished_on=finished if finished and finished >= started else None))

    for item in raw.get("notes") or []:
        try:
            book.notes.append(Note(user_id=user.id, **validate_note(item)))
        except ValueError:
            continue


def import_books(library, user, existing, records, mode):
    """Apply an import file. `records` are the raw items, `existing` the library's books.

    Books match on title + author (case-insensitive). Loans, readings and notes in
    the file are restored for the books that get inserted; `update` keeps the
    history of the books already present. Returns the counts shown to the user.
    """
    incoming = [(normalise_import(item), item) for item in records]
    known = {fingerprint({"title": b.title, "author": b.author}): b for b in existing}

    if mode == "preview":
        matched = sum(1 for clean, _ in incoming if fingerprint(clean) in known)
        return {"total": len(incoming), "matched": matched, "fresh": len(incoming) - matched}

    if mode == "replace":
        for book in existing:
            db.session.delete(book)
        db.session.flush()
        known = {}

    added = updated = 0
    for clean, raw in incoming:
        key = fingerprint(clean)
        current = known.get(key)
        if current is None:
            known[key] = new_book(library, clean, user=user, history=raw)
            added += 1
        elif mode == "update":
            before = {k: getattr(current, k) for k in Book.CATALOGUE_FIELDS}
            apply_book(current, clean)
            updated += before != {k: getattr(current, k) for k in Book.CATALOGUE_FIELDS}
    return {"added": added, "updated": updated}
