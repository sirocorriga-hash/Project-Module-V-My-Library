"""Demo data: `flask create-demo` and the tests use it, so every screen has something to show."""

import random
from datetime import date, timedelta

from .extensions import db
from .models import Library, Loan, Note, Reading, ReadingSession, User
from .services import new_book
from .validation import normalise

SAMPLE_BOOKS = [
    {"title": "Nineteen Eighty-Four", "author": "George Orwell", "genre": "Fiction", "year": 1949,
     "isbn": "978-0141036144", "shelfmark": "A-01", "pages": 328},
    {"title": "Pride and Prejudice", "author": "Jane Austen", "genre": "Fiction", "year": 1813,
     "isbn": "978-0141439518", "shelfmark": "A-02", "pages": 432},
    {"title": "The Hobbit", "author": "J.R.R. Tolkien", "genre": "Fantasy", "year": 1937,
     "isbn": "978-0261102217", "shelfmark": "B-03", "pages": 310},
    {"title": "Il nome della rosa", "author": "Umberto Eco", "genre": "Fiction", "year": 1980,
     "isbn": "978-8845278433", "shelfmark": "C-01", "pages": 624},
    {"title": "Sapiens", "author": "Yuval Noah Harari", "genre": "History", "year": 2011,
     "isbn": "978-0099590088", "shelfmark": "D-02", "pages": 512},
    {"title": "Le città invisibili", "author": "Italo Calvino", "genre": "Fiction", "year": 1972,
     "isbn": "978-8804668237", "pages": 168, "wishlist": True},
]


def create_demo_user(email="demo@example.com", password="demo1234", today=None):
    """A user with books, reading sessions, notes and loan history, so every screen has something to show."""
    today = today or date.today()
    rng = random.Random(42)
    user = User(email=email, name="Demo Reader", daily_minutes=40, yearly_goal=12, language="it",
                library=Library(name="Demo · My Library"))
    user.set_password(password)
    db.session.add(user)
    books = {b["title"]: new_book(user.library, normalise(b)) for b in SAMPLE_BOOKS}
    db.session.flush()

    def read(book, start_days_ago, count, pace, finish=True, rating=None):
        day = today - timedelta(days=start_days_ago)
        reading = Reading(user_id=user.id, started_on=day, rating=rating)
        for _ in range(count):
            minutes = rng.choice([20, 30, 35, 45, 60])
            reading.sessions.append(ReadingSession(read_on=min(day, today), minutes=minutes,
                                                   pages=round(minutes / 60 * pace)))
            day += timedelta(days=rng.choice([1, 1, 2, 3]))
        reading.finished_on = min(day, today) if finish else None
        book.readings.append(reading)

    read(books["Nineteen Eighty-Four"], 200, 14, 38, rating=5)
    read(books["The Hobbit"], 110, 11, 42, rating=4)
    read(books["Pride and Prejudice"], 9, 8, 33, finish=False)

    hobbit, orwell = books["The Hobbit"], books["Nineteen Eighty-Four"]
    hobbit.loans.append(Loan(borrower="Luca", lent_on=today - timedelta(days=60), returned_on=today - timedelta(days=41)))
    hobbit.loans.append(Loan(borrower="Marta", lent_on=today - timedelta(days=40), due_on=today - timedelta(days=10)))
    hobbit.status, hobbit.borrower = "loaned", "Marta"
    orwell.loans.append(Loan(borrower="Marta", lent_on=today - timedelta(days=150), returned_on=today - timedelta(days=122)))
    orwell.notes.append(Note(user_id=user.id, is_quote=True, page=5,
                             body="It was a bright cold day in April, and the clocks were striking thirteen."))
    orwell.notes.append(Note(user_id=user.id, body="Da rileggere insieme a «Il mondo nuovo»."))
    db.session.commit()
    return user
