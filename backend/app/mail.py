"""Sending email. Without MAIL_SERVER configured, messages are logged instead,
which is enough for development and tests."""

import smtplib
from email.message import EmailMessage

from flask import current_app

outbox = []   # every message "sent" while TESTING, for assertions


def send_mail(to, subject, body):
    cfg = current_app.config
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = cfg["MAIL_FROM"], to, subject
    msg.set_content(body)

    if current_app.testing:
        outbox.append(msg)
        return
    if not cfg["MAIL_SERVER"]:
        current_app.logger.warning("MAIL_SERVER not set, email not sent:\nTo: %s\nSubject: %s\n\n%s", to, subject, body)
        return
    with smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"], timeout=15) as smtp:
        if cfg["MAIL_USE_TLS"]:
            smtp.starttls()
        if cfg["MAIL_USERNAME"]:
            smtp.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
        smtp.send_message(msg)
