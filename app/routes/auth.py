import bcrypt
from flask import Blueprint, current_app, jsonify, redirect, render_template, request, session, url_for

from app import save_upload
from app.models import Profile, db


auth_bp = Blueprint("auth", __name__)


@auth_bp.get("/profiles")
def profiles_page():
    profiles = Profile.query.filter_by(archived=False).order_by(Profile.name.asc()).all()
    return render_template("profiles.html", profiles=profiles)


@auth_bp.post("/profiles/select")
def select_profile():
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    pin = str(payload.get("pin", ""))

    profile = Profile.query.get_or_404(profile_id)
    requires_pin = profile.role in {"parent", "grandparent"} or bool(profile.pin_hash)

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


@auth_bp.post("/profiles/<int:profile_id>/avatar")
def upload_avatar(profile_id: int):
    profile = Profile.query.get_or_404(profile_id)
    file_storage = request.files.get("avatar")

    try:
        filename = save_upload(file_storage, current_app.config["BARN_UPLOAD_DIR"])
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    profile.avatar_path = filename
    db.session.commit()
    if session.get('active_profile_id') == profile_id:
        session.modified = True
    return jsonify({"success": True, "filename": filename})
