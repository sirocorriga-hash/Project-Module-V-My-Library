"""Sharing: every user belongs to one library; others can join it with its invite code."""

from flask import Blueprint, jsonify

from .access import current_user, login_required
from .extensions import db
from .http import body, error
from .limits import MAX_NAME
from .models import Library, new_invite_code
from .validation import ValidationError, text

bp = Blueprint("library", __name__, url_prefix="/api/library")


@bp.put("")
@login_required
def rename():
    name = text(body().get("name"), MAX_NAME)
    if not name:
        raise ValidationError({"library_name": "library_name_required"})
    current_user().library.name = name
    db.session.commit()
    return jsonify(current_user().to_dict())


@bp.post("/invite")
@login_required
def regenerate_invite_code():
    """A fresh code; the old one stops working."""
    current_user().library.invite_code = new_invite_code()
    db.session.commit()
    return jsonify(current_user().to_dict())


@bp.post("/join")
@login_required
def join():
    """Move into another library. Books are never moved or merged: to avoid losing
    them, this is allowed only when the current library is empty or shared."""
    user = current_user()
    target = db.session.scalar(db.select(Library).filter_by(invite_code=text(body().get("code"))))
    if target is None:
        raise ValidationError({"code": "invite_invalid"})
    if target.id == user.library_id:
        return jsonify(user.to_dict())
    old = user.library
    if old.books and len(old.members) == 1:
        return error("library_has_books", 409)
    user.library = target
    if not old.members:
        db.session.delete(old)
    db.session.commit()
    return jsonify(user.to_dict())


@bp.post("/leave")
@login_required
def leave():
    """Leave a shared library for a new, empty one. The books stay with the others."""
    user = current_user()
    if len(user.library.members) > 1:
        user.library = Library.personal(user.name)
        db.session.commit()
    return jsonify(user.to_dict())
