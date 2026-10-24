from datetime import date, timedelta

from app.demo import create_demo_user
from app.extensions import db
from app.mail import outbox
from app.models import Book, Loan, Reading, ReadingSession, User
from app.reminders import send_reminders
from app.reports import build_report


def _user():
    return db.session.scalar(db.select(User))


def test_report_math(client):
    today = date(2026, 6, 15)
    user = _user()
    user.daily_minutes, user.yearly_goal = 60, 10
    lib = user.library
    a = Book(library=lib, title="Read", author="X", genre="G", pages=200)
    b = Book(library=lib, title="Half", author="X", genre="G", pages=300)
    c = Book(library=lib, title="Next", author="X", genre="G", pages=100)
    d = Book(library=lib, title="No pages", author="X", genre="G")
    w = Book(library=lib, title="Wish", author="X", genre="G", pages=999, wishlist=True)
    a.readings.append(Reading(user_id=user.id, started_on=date(2026, 6, 1), finished_on=date(2026, 6, 10), rating=4,
                              sessions=[ReadingSession(read_on=date(2026, 6, 1), minutes=120, pages=80),
                                        ReadingSession(read_on=date(2026, 6, 10), minutes=180, pages=120)]))
    b.readings.append(Reading(user_id=user.id, started_on=date(2026, 6, 12),
                              sessions=[ReadingSession(read_on=date(2026, 6, 13), minutes=30, pages=50),
                                        ReadingSession(read_on=date(2026, 6, 14), minutes=30, pages=50)]))
    a.loans.append(Loan(borrower="Luca", lent_on=date(2026, 5, 1), returned_on=date(2026, 5, 11)))
    c.loans.append(Loan(borrower="Luca", lent_on=date(2026, 6, 1), due_on=date(2026, 6, 10)))
    db.session.add_all([a, b, c, d, w])
    db.session.commit()

    r = build_report(user, today=today)
    est = r["estimate"]
    assert est["pace_source"] == "measured" and est["pace_pages_per_hour"] == 50   # 300 pages / 6 h
    assert est["pages_remaining"] == 300 and est["hours"] == 6 and est["days"] == 6  # 200 + 100, wishlist excluded
    assert est["queue"][0]["title"] == "Half" and [x["title"] for x in est["without_pages"]] == ["No pages"]

    fin = r["reading"]["finished"][0]
    assert fin["minutes"] == 300 and fin["calendar_days"] == 10 and fin["pages_per_hour"] == 40 and fin["rating"] == 4
    assert r["reading"]["months"][-1] == {"month": "2026-06", "minutes": 360, "pages": 300}
    assert r["reading"]["streak"] == {"current": 2, "longest": 2, "read_today": False}
    goal = r["reading"]["goal"]
    assert goal["finished"] == 1 and goal["goal"] == 10 and goal["on_track"] is False   # ~4.5 expected by mid-June

    lend = r["lending"]
    assert lend["total_loans"] == 2 and lend["active_loans"] == 1 and lend["overdue_loans"] == 1
    assert lend["avg_days_closed"] == 10 and lend["active"][0]["overdue"] is True
    assert lend["by_borrower"][0] == {"borrower": "Luca", "loans": 2, "days": 24, "active": 1}

    assert build_report(user, today=today, pace_override=100, daily_minutes=30)["estimate"]["days"] == 6
    user.pages_per_hour = 90
    assert build_report(user, today=today)["estimate"]["pace_source"] == "manual"
    assert build_report(user, today=today, use_manual=False)["estimate"]["pace_source"] == "measured"


def test_demo_user_report_and_reminders(app, anon):
    create_demo_user()
    anon.post("/api/auth/login", json={"email": "demo@example.com", "password": "demo1234"})
    r = anon.get("/api/reports?daily_minutes=90").json
    assert r["estimate"]["daily_minutes"] == 90 and r["reading"]["books_finished"] == 2
    assert r["lending"]["overdue_loans"] == 1
    assert send_reminders() == 1
    assert "The Hobbit" in outbox[0].get_content() and outbox[0]["To"] == "demo@example.com"
    assert send_reminders(today=date.today() - timedelta(days=30)) == 0
