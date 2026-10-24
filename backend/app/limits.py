"""Allowed values and ranges, in one place.

The validators, the importer and the database CHECK constraints all read
these, so a limit can never differ between the form and the table.
(The frontend keeps the same numbers in src/lib/limits.ts.)
Changing a limit that a CHECK uses needs a new migration: `flask db migrate`.
"""

LANGUAGES = ("it", "en")
BOOK_STATUSES = ("available", "loaned")

MAX_YEAR = 2100
MAX_PAGES = 20000            # pages of a book, and the page of a note
MAX_MINUTES = 1440           # one reading session, and the daily reading time
MAX_SESSION_PAGES = 5000     # pages read in one session
RATING = (1, 5)
MAX_PACE = 500               # pages per hour
MAX_GOAL = 1000              # books per year
MIN_PASSWORD = 8

MAX_LEN = {"title": 300, "author": 200, "genre": 100, "isbn": 32, "shelfmark": 32,
           "borrower": 120, "cover_url": 500}
MAX_NAME = 120               # user and library names
MAX_NOTE = 5000


def in_range(value, low, high):
    return value is not None and low <= value <= high


def sql_in(column, values):
    """`column IN ('a', 'b')` for a CHECK constraint."""
    return f"{column} IN ({', '.join(repr(v) for v in values)})"
