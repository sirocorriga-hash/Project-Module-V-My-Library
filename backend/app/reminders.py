"""Daily email of overdue loans: `flask send-reminders`, run once a day by cron."""

from datetime import date

from sqlalchemy.orm import selectinload

from .extensions import db
from .mail import send_mail
from .messages import t
from .models import Book, Library, Loan


def overdue_digest(today=None):
    """{user: [loan, ...]} for every member of a library with overdue loans."""
    today = today or date.today()
    loans = db.session.scalars(
        db.select(Loan).where(Loan.returned_on.is_(None), Loan.due_on < today)
        .options(selectinload(Loan.book).selectinload(Book.library).selectinload(Library.members))
    ).all()
    digest = {}
    for loan in loans:
        for member in loan.book.library.members:
            digest.setdefault(member, []).append(loan)
    return digest


def send_reminders(today=None):
    today = today or date.today()
    digest = overdue_digest(today)
    for user, loans in digest.items():
        lines = [t("reminder_intro", user.language, name=user.name)]
        lines += [t("reminder_line", user.language, title=l.book.title, borrower=l.borrower or "—",
                    due=l.due_on.isoformat(), days=(today - l.due_on).days) for l in loans]
        send_mail(user.email, t("reminder_subject", user.language), "\n".join(lines))
    return len(digest)
