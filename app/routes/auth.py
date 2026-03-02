import bcrypt
from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for

from app.models import Profile


auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/profiles")
def profiles_page():
    profiles = Profile.query.order_by(Profile.name.asc()).all()
    return render_template("profiles.html", profiles=profiles)


@auth_bp.post("/profiles/select")
def select_profile():
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    pin = str(payload.get("pin", ""))

    profile = Profile.query.get_or_404(profile_id)
    requires_pin = profile.role == "parent" or bool(profile.pin_hash)

    if requires_pin:
        if not profile.pin_hash:
            return jsonify({"success": False, "error": "Invalid PIN"}), 401
        if not pin or not bcrypt.checkpw(pin.encode("utf-8"), profile.pin_hash.encode("utf-8")):
            return jsonify({"success": False, "error": "Invalid PIN"}), 401

    session["active_profile_id"] = profile.id
    return jsonify({"success": True, "redirect": "/"})


@auth_bp.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.profiles_page"))
