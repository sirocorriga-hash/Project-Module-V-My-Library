"""Reading and lending reports for the signed-in user.

Counting and summing are done by the database (SUM, COUNT, GROUP BY); date
arithmetic is done in Python so the same code also runs on SQLite in tests.
"""

import math
from collections import defaultdict
from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from .access import current_user, login_required
from .extensions import db
from .models import Book, Reading, ReadingSession

bp = Blueprint("reports", __name__, url_prefix="/api/reports")

DEFAULT_PACE = 30          # pages per hour when nothing better is known
MIN_MEASURED_MINUTES = 30  # below this, a measured pace is too noisy to trust


def _round(value, digits=1):
    return None if value is None else round(value, digits)


def _my_sessions(user):
    return db.select(ReadingSession).join(Reading).where(Reading.user_id == user.id)


def reading_pace(user, use_manual=True):
    """Return (pages_per_hour, source, measured)."""
    minutes, pages = db.session.execute(
        db.select(func.coalesce(func.sum(ReadingSession.minutes), 0), func.coalesce(func.sum(ReadingSession.pages), 0))
        .join(Reading).where(Reading.user_id == user.id, ReadingSession.pages.is_not(None))
    ).one()
    measured = pages * 60 / minutes if minutes >= MIN_MEASURED_MINUTES and pages > 0 else None
    if use_manual and user.pages_per_hour:
        return user.pages_per_hour, "manual", _round(measured)
    if measured:
        return measured, "measured", _round(measured)
    return DEFAULT_PACE, "default", None


def _estimate(user, books, today, daily, pace, pace_source, measured):
    queue, without_pages = [], []
    for b in books:
        mine = b.readings_of(user)
        current = b.open_reading(user)
        if b.wishlist or (mine and current is None):     # not owned, or already read
            continue
        if not b.pages:
            without_pages.append({"id": b.id, "title": b.title})
            continue
        remaining = max(b.pages - (current.pages_read if current else 0), 0)
        queue.append({"id": b.id, "title": b.title, "author": b.author,
                      "read_status": "reading" if current else "to_read",
                      "pages": b.pages, "pages_remaining": remaining, "hours": _round(remaining / pace)})
    queue.sort(key=lambda r: (r["read_status"] != "reading", r["hours"]))
    pages_left = sum(r["pages_remaining"] for r in queue)
    hours = pages_left / pace
    days = math.ceil(hours * 60 / daily) if pages_left else 0
    return {
        "pace_pages_per_hour": _round(pace), "pace_source": pace_source, "measured_pages_per_hour": measured,
        "daily_minutes": daily, "books": len(queue), "pages_remaining": pages_left,
        "hours": _round(hours), "days": days,
        "finish_date": (today + timedelta(days=days)).isoformat() if days else None,
        "queue": queue, "without_pages": without_pages,
    }


def _finished(user, books):
    rows = []
    for b in books:
        for n, r in enumerate(b.readings_of(user), start=1):
            if r.finished_on is None:
                continue
            timed = [s for s in r.sessions if s.pages is not None]
            t_min, t_pages = sum(s.minutes for s in timed), sum(s.pages for s in timed)
            rows.append({
                "book_id": b.id, "title": b.title, "author": b.author, "reading_number": n,
                "minutes": r.minutes, "sessions": len(r.sessions), "rating": r.rating,
                "started_on": r.started_on.isoformat(), "finished_on": r.finished_on.isoformat(),
                "calendar_days": (r.finished_on - r.started_on).days + 1,
                "pages_per_hour": _round(t_pages * 60 / t_min) if t_min and t_pages else None,
            })
    return sorted(rows, key=lambda r: r["finished_on"], reverse=True)


def _months(user, today):
    first = date(today.year - (today.month < 12), today.month % 12 + 1, 1)   # 12 months including this one
    rows = db.session.execute(
        db.select(ReadingSession.read_on, ReadingSession.minutes, ReadingSession.pages)
        .join(Reading).where(Reading.user_id == user.id, ReadingSession.read_on >= first)
    ).all()
    totals = defaultdict(lambda: [0, 0])
    for read_on, minutes, pages in rows:
        totals[read_on.strftime("%Y-%m")][0] += minutes
        totals[read_on.strftime("%Y-%m")][1] += pages or 0
    months, cursor = [], first
    for _ in range(12):
        key = cursor.strftime("%Y-%m")
        months.append({"month": key, "minutes": totals[key][0], "pages": totals[key][1]})
        cursor = date(cursor.year + (cursor.month == 12), cursor.month % 12 + 1, 1)
    return months


def _streaks(user, today):
    """Current streak (days in a row up to today, or yesterday) and the longest one."""
    days = sorted(set(db.session.scalars(
        db.select(ReadingSession.read_on).join(Reading).where(Reading.user_id == user.id)).all()))
    longest = run = 0
    previous = None
    for d in days:
        run = run + 1 if previous and d - previous == timedelta(days=1) else 1
        longest, previous = max(longest, run), d
    day_set, current = set(days), 0
    cursor = today if today in day_set else today - timedelta(days=1)
    while cursor in day_set:
        current, cursor = current + 1, cursor - timedelta(days=1)
    return {"current": current, "longest": longest, "read_today": today in day_set}


def _goal(user, finished, today):
    done = sum(1 for r in finished if r["finished_on"].startswith(str(today.year)))
    goal = user.yearly_goal
    year_days = (date(today.year, 12, 31) - date(today.year, 1, 1)).days + 1
    expected = goal * today.timetuple().tm_yday / year_days if goal else None
    return {"year": today.year, "goal": goal, "finished": done,
            "expected_by_now": _round(expected), "on_track": done >= math.floor(expected) if goal else None}


def _lending(books, today):
    loans = [(b, l) for b in books for l in b.loans]
    closed = [l.days(today) for _, l in loans if l.returned_on]
    by_borrower = defaultdict(lambda: {"loans": 0, "days": 0, "active": 0})
    active = []
    for b, l in loans:
        name, d = l.borrower or "—", l.days(today)
        by_borrower[name]["loans"] += 1
        by_borrower[name]["days"] += d
        if l.returned_on is None:
            by_borrower[name]["active"] += 1
            active.append({"book_id": b.id, "title": b.title, "borrower": name, "lent_on": l.lent_on.isoformat(),
                           "due_on": l.due_on.isoformat() if l.due_on else None,
                           "days": d, "overdue": l.is_overdue(today)})
    active.sort(key=lambda r: (not r["overdue"], -r["days"]))
    return {
        "total_loans": len(loans), "active_loans": len(active),
        "overdue_loans": sum(1 for a in active if a["overdue"]),
        "avg_days_closed": _round(sum(closed) / len(closed)) if closed else None,
        "longest_days": max((l.days(today) for _, l in loans), default=None),
        "total_days": sum(l.days(today) for _, l in loans),
        "active": active,
        "by_borrower": sorted(({"borrower": k, **v} for k, v in by_borrower.items()),
                              key=lambda r: r["days"], reverse=True),
    }


def build_report(user, today=None, daily_minutes=None, pace_override=None, use_manual=True):
    today = today or date.today()
    books = db.session.scalars(
        db.select(Book).filter_by(library_id=user.library_id)
        .options(selectinload(Book.loans), selectinload(Book.readings).selectinload(Reading.sessions))
    ).all()

    pace, source, measured = reading_pace(user, use_manual)
    if pace_override:
        pace, source = pace_override, "what-if"
    finished = _finished(user, books)
    count, minutes = db.session.execute(
        db.select(func.count(ReadingSession.id), func.coalesce(func.sum(ReadingSession.minutes), 0))
        .join(Reading).where(Reading.user_id == user.id)
    ).one()
    timed = [r for r in finished if r["minutes"]]

    return {
        "generated_on": today.isoformat(),
        "estimate": _estimate(user, books, today, daily_minutes or user.daily_minutes, pace, source, measured),
        "reading": {
            "total_minutes": minutes, "total_hours": _round(minutes / 60), "sessions": count,
            "books_finished": len(finished),
            "avg_hours_per_book": _round(sum(r["minutes"] for r in timed) / len(timed) / 60) if timed else None,
            "avg_minutes_per_session": _round(minutes / count) if count else None,
            "finished": finished, "months": _months(user, today),
            "streak": _streaks(user, today), "goal": _goal(user, finished, today),
        },
        "lending": _lending(books, today),
    }


@bp.get("")
@login_required
def report():
    """What-if parameters: ?daily_minutes=45&pages_per_hour=40 (or pages_per_hour=auto)."""
    def positive(name, upper):
        value = request.args.get(name, "")
        return int(value) if value.isdigit() and 1 <= int(value) <= upper else None

    return jsonify(build_report(current_user(),
                                daily_minutes=positive("daily_minutes", 1440),
                                pace_override=positive("pages_per_hour", 500),
                                use_manual=request.args.get("pages_per_hour") != "auto"))
