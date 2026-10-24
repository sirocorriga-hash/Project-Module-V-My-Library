"""Command-line tasks: `flask --app wsgi <command>`."""

import click

from .demo import create_demo_user
from .extensions import db
from .models import User
from .reminders import send_reminders


def register_cli(app):
    @app.cli.command("create-demo")
    @click.option("--email", default="demo@example.com")
    @click.option("--password", default="demo1234")
    def create_demo(email, password):
        """Create a demo account with sample books, readings, notes and loans."""
        if db.session.scalar(db.select(User).filter_by(email=email)):
            raise click.ClickException(f"{email} already exists.")
        create_demo_user(email, password)
        click.echo(f"Demo account ready: {email} / {password}")

    @app.cli.command("send-reminders")
    def send_reminders_command():
        """Email each member of a library the list of its overdue loans. Run it once a day (cron)."""
        click.echo(f"Reminders sent to {send_reminders()} users.")
