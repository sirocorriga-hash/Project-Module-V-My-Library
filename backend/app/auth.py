"""Accounts: registration, login, logout, profile settings and password reset.

Authentication uses Flask's signed session cookie (HttpOnly, SameSite=Lax).
The React app is served from the same origin, so no token lives in JavaScript.
"""

from flask import Blueprint, current_app, jsonify, session
from itsdangerous import BadSignature, URLSafeTimedSerializer

from .access import current_user, login_required, start_session
from .extensions import db, limiter
from .http import body, error
from .mail import send_mail
from .messages import t
from .models import Library, User
from .validation import ValidationError, text, validate_password, validate_registration, validate_settings

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

RESET_MAX_AGE = 3600  # seconds


def _user_by_email(email):
    return db.session.scalar(db.select(User).filter_by(email=text(email).lower()))


@bp.post("/register")
@limiter.limit("10 per hour")
def register():
    data = validate_registration(body())
    if _user_by_email(data["email"]):
        raise ValidationError({"email": "email_taken"})
    user = User(email=data["email"], name=data["name"], language=data["language"],
                library=Library.personal(data["name"]))
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    start_session(user)
    return jsonify(user.to_dict()), 201


@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data = body()
    user = _user_by_email(data.get("email"))
    # Same answer whether the email or the password is wrong.
    if user is None or not user.check_password(str(data.get("password") or "")):
        return error("bad_credentials", 401)
    start_session(user)
    return jsonify(user.to_dict())


@bp.post("/logout")
def logout():
    session.clear()
    return "", 204


@bp.get("/me")
@login_required
def me():
    return jsonify(current_user().to_dict())


@bp.put("/me")
@login_required
def update_me():
    user = current_user()
    for key, value in validate_settings(body()).items():
        setattr(user, key, value)
    db.session.commit()
    return jsonify(user.to_dict())


# --- Password reset ---------------------------------------------------------
# The token is signed with SECRET_KEY and contains the end of the password hash,
# so it stops working after one hour or as soon as the password changes.

def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="password-reset")


def reset_token(user):
    return _serializer().dumps({"id": user.id, "h": user.password_hash[-16:]})


@bp.post("/forgot")
@limiter.limit("5 per hour")
def forgot_password():
    user = _user_by_email(body().get("email"))
    if user:
        link = f"{current_app.config['APP_URL']}/reset?token={reset_token(user)}"
        send_mail(user.email, t("reset_subject", user.language),
                  t("reset_body", user.language, name=user.name, link=link))
    return "", 204   # same answer whether the account exists or not


@bp.post("/reset")
@limiter.limit("10 per hour")
def reset_password():
    data = body()
    try:
        payload = _serializer().loads(str(data.get("token") or ""), max_age=RESET_MAX_AGE)
    except BadSignature:            # also covers SignatureExpired
        return error("reset_invalid", 400)
    user = db.session.get(User, payload.get("id"))
    if user is None or user.password_hash[-16:] != payload.get("h"):
        return error("reset_invalid", 400)
    user.set_password(validate_password(data))
    db.session.commit()
    start_session(user)
    return jsonify(user.to_dict())
