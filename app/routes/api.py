from __future__ import annotations

from datetime import date, datetime, time, timedelta

from flask import Blueprint, jsonify, request, session
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from app.models import Expense, Profile, Project, Show, Task, db

api_bp = Blueprint("api", __name__, url_prefix="/api")
UNLOCK_DURATION_MINUTES = 15


def _as_dt(value: date | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.combine(value, time.min)


def _iso(value: date | datetime | None) -> str | None:
    parsed = _as_dt(value)
    return parsed.isoformat() if parsed else None


def _avatar_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"/uploads/{path}"


def _active_profile() -> Profile | None:
    profile_id = session.get("active_profile_id")
    if profile_id:
        profile = Profile.query.get(profile_id)
        if profile:
            return profile
    profile = Profile.query.order_by(Profile.id.asc()).first()
    if profile:
        session["active_profile_id"] = profile.id
    return profile


def _is_unlocked() -> bool:
    unlocked_until = session.get("unlock_expires_at")
    if not unlocked_until:
        return False
    try:
        expires_at = datetime.fromisoformat(unlocked_until)
    except ValueError:
        return False
    if datetime.utcnow() >= expires_at:
        session.pop("unlock_expires_at", None)
        return False
    return True


def _auth_status_payload(profile: Profile | None) -> dict[str, object]:
    return {
        "role": profile.role if profile else None,
        "is_unlocked": _is_unlocked(),
        "unlock_expires_at": session.get("unlock_expires_at"),
    }


def _require_parent_unlocked() -> tuple[Profile | None, tuple[object, int] | None]:
    profile = _active_profile()
    if profile is None:
        return None, (jsonify({"error": "No active profile"}), 401)
    if profile.role != "parent":
        return profile, (jsonify({"error": "Parent profile required"}), 403)
    if not _is_unlocked():
        return profile, (jsonify({"error": "Parent PIN unlock required"}), 403)
    return profile, None


def _project_payload(project: Project) -> dict[str, object]:
    return {
        "id": project.id,
        "name": project.name,
        "species": "steer" if project.type == "cow" else project.type,
        "tag": project.ear_tag,
        "status": project.status,
        "owner_profile_id": project.owner_id,
        "notes": project.notes,
        "created_at": _iso(project.created_at),
        "updated_at": _iso(project.updated_at or project.created_at),
    }


def _expense_payload(expense: Expense) -> dict[str, object]:
    return {
        "id": expense.id,
        "project_id": expense.project_id,
        "date": _iso(expense.date),
        "category": expense.category,
        "vendor": expense.vendor,
        "amount": float(expense.amount),
        "note": expense.notes,
        "receipt_url": expense.receipt_url,
        "created_at": _iso(expense.created_at),
        "updated_at": _iso(expense.updated_at or expense.created_at),
    }


@api_bp.get("/health")
def api_health():
    return jsonify({"status": "ok", "service": "project-barn-backend"})


@api_bp.get("/session")
def api_session():
    profile = _active_profile()
    return jsonify({
        "active_profile": {
            "id": profile.id if profile else None,
            "name": profile.name if profile else None,
            "role": profile.role if profile else None,
            "avatar_url": _avatar_url(profile.avatar_path) if profile else None,
        },
        "family": {"id": None, "name": None},
    })


@api_bp.get("/profiles")
def api_profiles():
    profiles = Profile.query.filter_by(archived=False).order_by(Profile.name.asc()).all()
    return jsonify([
        {"id": p.id, "name": p.name, "role": p.role, "avatar_url": _avatar_url(p.avatar_path)}
        for p in profiles
    ])


@api_bp.post("/session/switch-profile")
def api_switch_profile():
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    if profile_id is None:
        return jsonify({"error": "profile_id is required"}), 400
    profile = Profile.query.get(profile_id)
    if profile is None or profile.archived:
        return jsonify({"error": "Profile not found"}), 404
    session["active_profile_id"] = profile.id
    session.pop("unlock_expires_at", None)
    return jsonify({"active_profile": {"id": profile.id, "name": profile.name, "role": profile.role, "avatar_url": _avatar_url(profile.avatar_path)}})


@api_bp.get("/auth/status")
def api_auth_status():
    profile = _active_profile()
    return jsonify(_auth_status_payload(profile))


@api_bp.post("/auth/set-pin")
def api_set_pin():
    profile = _active_profile()
    if profile is None:
        return jsonify({"error": "No active profile"}), 401
    if profile.role != "parent":
        return jsonify({"error": "Parent profile required"}), 403

    payload = request.get_json(silent=True) or {}
    pin = str(payload.get("pin", "")).strip()
    if len(pin) < 4 or len(pin) > 12 or not pin.isdigit():
        return jsonify({"error": "PIN must be 4-12 digits"}), 400

    if profile.pin_hash and not _is_unlocked():
        return jsonify({"error": "Unlock required before changing PIN"}), 403

    profile.pin_hash = generate_password_hash(pin)
    db.session.commit()
    return jsonify({"success": True})


@api_bp.post("/auth/unlock")
def api_unlock():
    profile = _active_profile()
    if profile is None:
        return jsonify({"error": "No active profile"}), 401
    if profile.role != "parent":
        return jsonify({"error": "Parent profile required"}), 403

    payload = request.get_json(silent=True) or {}
    pin = str(payload.get("pin", "")).strip()

    if not profile.pin_hash:
        return jsonify({"error": "PIN has not been set"}), 400

    if not check_password_hash(profile.pin_hash, pin):
        return jsonify({"error": "Invalid PIN"}), 401

    expires_at = datetime.utcnow() + timedelta(minutes=UNLOCK_DURATION_MINUTES)
    session["unlock_expires_at"] = expires_at.isoformat()
    return jsonify({"success": True, "unlock_expires_at": expires_at.isoformat(), "minutes": UNLOCK_DURATION_MINUTES})


@api_bp.post("/auth/lock")
def api_lock():
    session.pop("unlock_expires_at", None)
    return jsonify({"success": True})


@api_bp.get("/projects")
def api_projects():
    species = request.args.get("species")
    status = request.args.get("status")
    owner_profile_id = request.args.get("owner")

    query = Project.query
    if species:
        query = query.filter(Project.type == species)
    if status:
        query = query.filter(Project.status == status)
    if owner_profile_id and owner_profile_id.isdigit():
        query = query.filter(Project.owner_id == int(owner_profile_id))

    projects = query.order_by(Project.updated_at.desc(), Project.id.desc()).all()
    return jsonify([_project_payload(project) for project in projects])


@api_bp.post("/projects")
def api_create_project():
    profile, error = _require_parent_unlocked()
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    species = str(payload.get("species", "")).strip() or "other"
    owner_profile_id = payload.get("owner_profile_id")

    if not name:
        return jsonify({"error": "name is required"}), 400
    if species not in {"goat", "steer", "pig", "other"}:
        return jsonify({"error": "species must be goat, steer, pig, or other"}), 400
    if not owner_profile_id:
        return jsonify({"error": "owner_profile_id is required"}), 400

    owner = Profile.query.get(owner_profile_id)
    if owner is None:
        return jsonify({"error": "owner_profile_id is invalid"}), 400

    mapped_type = "cow" if species == "steer" else species
    project = Project(
        name=name,
        type=mapped_type,
        owner_id=owner_profile_id,
        ear_tag=(payload.get("tag") or None),
        status=(payload.get("status") or "active"),
        notes=(payload.get("notes") or None),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(_project_payload(project)), 201


@api_bp.get("/projects/<int:project_id>")
def api_project_detail(project_id: int):
    project = Project.query.get_or_404(project_id)
    return jsonify(_project_payload(project))


@api_bp.patch("/projects/<int:project_id>")
def api_project_update(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    project = Project.query.get_or_404(project_id)
    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        project.name = str(payload["name"]).strip()
    if "species" in payload:
        species = str(payload["species"]).strip()
        if species not in {"goat", "steer", "pig", "other"}:
            return jsonify({"error": "species must be goat, steer, pig, or other"}), 400
        project.type = "cow" if species == "steer" else species
    if "tag" in payload:
        project.ear_tag = payload["tag"]
    if "status" in payload:
        project.status = payload["status"]
    if "owner_profile_id" in payload:
        owner = Profile.query.get(payload["owner_profile_id"])
        if owner is None:
            return jsonify({"error": "owner_profile_id is invalid"}), 400
        project.owner_id = owner.id
    if "notes" in payload:
        project.notes = payload["notes"]

    project.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_project_payload(project))


@api_bp.delete("/projects/<int:project_id>")
def api_project_delete(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    project = Project.query.get_or_404(project_id)
    Expense.query.filter_by(project_id=project.id).delete()
    db.session.delete(project)
    db.session.commit()
    return jsonify({"success": True})


@api_bp.get("/expenses")
def api_expenses():
    query = Expense.query

    project_id = request.args.get("project_id")
    category = request.args.get("category")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    if project_id and project_id.isdigit():
        query = query.filter(Expense.project_id == int(project_id))
    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(Expense.date <= date.fromisoformat(end_date))

    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()
    return jsonify([_expense_payload(expense) for expense in expenses])


@api_bp.post("/expenses")
def api_expenses_create():
    profile, error = _require_parent_unlocked()
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    try:
        expense = Expense(
            project_id=int(payload.get("project_id")),
            logged_by_id=profile.id,
            amount=float(payload.get("amount")),
            category=str(payload.get("category", "other_expense")),
            date=date.fromisoformat(str(payload.get("date"))),
            notes=payload.get("note"),
            vendor=payload.get("vendor"),
            receipt_url=payload.get("receipt_url"),
        )
    except Exception:
        return jsonify({"error": "Invalid expense payload"}), 400

    db.session.add(expense)
    db.session.commit()
    return jsonify(_expense_payload(expense)), 201


@api_bp.get("/expenses/<int:expense_id>")
def api_expense_detail(expense_id: int):
    expense = Expense.query.get_or_404(expense_id)
    return jsonify(_expense_payload(expense))


@api_bp.patch("/expenses/<int:expense_id>")
def api_expense_update(expense_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    expense = Expense.query.get_or_404(expense_id)

    if "project_id" in payload:
        expense.project_id = int(payload["project_id"])
    if "date" in payload:
        expense.date = date.fromisoformat(payload["date"])
    if "category" in payload:
        expense.category = payload["category"]
    if "vendor" in payload:
        expense.vendor = payload["vendor"]
    if "amount" in payload:
        expense.amount = float(payload["amount"])
    if "note" in payload:
        expense.notes = payload["note"]
    if "receipt_url" in payload:
        expense.receipt_url = payload["receipt_url"]

    expense.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_expense_payload(expense))


@api_bp.delete("/expenses/<int:expense_id>")
def api_expense_delete(expense_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"success": True})


@api_bp.get("/summary")
@api_bp.get("/dashboard")
def api_summary():
    counts = {
        "projects": Project.query.count(),
        "profiles": Profile.query.count(),
        "expenses": Expense.query.count(),
        "shows": Show.query.count(),
        "tasks": Task.query.count(),
    }

    month_start = date.today().replace(day=1)
    month_total = db.session.query(func.sum(Expense.amount)).filter(Expense.date >= month_start).scalar() or 0
    by_project = (
        db.session.query(Project.name, func.sum(Expense.amount).label("total"))
        .join(Expense, Expense.project_id == Project.id)
        .group_by(Project.id)
        .order_by(func.sum(Expense.amount).desc())
        .all()
    )

    return jsonify({
        "counts": counts,
        "month_total": float(month_total),
        "by_project": [{"name": name, "total": float(total or 0)} for name, total in by_project],
        "recent_activity": [],
        "upcoming": [],
    })
