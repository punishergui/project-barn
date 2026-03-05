from __future__ import annotations

from datetime import date, datetime, time, timedelta
import csv
import io

from flask import Blueprint, Response, current_app, jsonify, request, session
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

from app import save_upload
from app.models import AppSetting, Expense, ExpenseAllocation, ExpenseReceipt, Media, Placing, Profile, Project, Show, ShowDay, ShowEntry, Task, TaskItem, TimelineEntry, db

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
    allocations = sorted(expense.allocations, key=lambda item: item.id)
    receipts = sorted(expense.receipts, key=lambda item: item.id)
    return {
        "id": expense.id,
        "project_id": expense.project_id,
        "date": _iso(expense.date),
        "category": expense.category,
        "vendor": expense.vendor,
        "amount": float(expense.amount),
        "amount_cents": int(round(float(expense.amount) * 100)),
        "note": expense.notes,
        "receipt_url": expense.receipt_url,
        "is_split": len(allocations) > 0,
        "allocation_count": len(allocations),
        "receipt_count": len(receipts),
        "allocations": [_allocation_payload(item) for item in allocations],
        "receipts": [_receipt_payload(item) for item in receipts],
        "created_at": _iso(expense.created_at),
        "updated_at": _iso(expense.updated_at or expense.created_at),
    }


def _receipt_payload(receipt: ExpenseReceipt) -> dict[str, object]:
    return {
        "id": receipt.id,
        "expense_id": receipt.expense_id,
        "file_name": receipt.file_name,
        "url": receipt.url,
        "caption": receipt.caption,
        "created_at": _iso(receipt.created_at),
    }


def _allocation_payload(allocation: ExpenseAllocation) -> dict[str, object]:
    return {
        "id": allocation.id,
        "expense_id": allocation.expense_id,
        "project_id": allocation.project_id,
        "amount_cents": allocation.amount_cents,
        "amount": allocation.amount_cents / 100.0,
        "created_at": _iso(allocation.created_at),
    }


def _expense_total_cents(expense: Expense) -> int:
    return int(round(float(expense.amount) * 100))


def _allocation_rows_for_expense(expense: Expense) -> list[dict[str, int]]:
    if expense.allocations:
        return [{"project_id": item.project_id, "amount_cents": item.amount_cents} for item in expense.allocations]
    return [{"project_id": expense.project_id, "amount_cents": _expense_total_cents(expense)}]


def _project_totals() -> list[dict[str, object]]:
    projects = {project.id: project.name for project in Project.query.all()}
    totals: dict[int, int] = {}
    expenses = Expense.query.all()
    for expense in expenses:
        for row in _allocation_rows_for_expense(expense):
            totals[row["project_id"]] = totals.get(row["project_id"], 0) + row["amount_cents"]
    rows = []
    for project_id, cents in totals.items():
        rows.append({"project_id": project_id, "name": projects.get(project_id, f"Project {project_id}"), "total": cents / 100.0})
    rows.sort(key=lambda row: row["total"], reverse=True)
    return rows


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

    if category:
        query = query.filter(Expense.category == category)
    if start_date:
        query = query.filter(Expense.date >= date.fromisoformat(start_date))
    if end_date:
        query = query.filter(Expense.date <= date.fromisoformat(end_date))

    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()

    if project_id and project_id.isdigit():
        selected_project_id = int(project_id)
        expenses = [
            expense for expense in expenses
            if any(row["project_id"] == selected_project_id for row in _allocation_rows_for_expense(expense))
        ]

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


@api_bp.post("/expenses/<int:expense_id>/receipts")
def api_expense_receipts_create(expense_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    expense = Expense.query.get_or_404(expense_id)
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "file is required"}), 400

    original_name = file.filename or ""
    if "." not in original_name:
        return jsonify({"error": "Invalid file type"}), 400
    extension = original_name.rsplit(".", 1)[1].lower()
    if extension not in {"png", "jpg", "jpeg", "webp"}:
        return jsonify({"error": "Invalid file type"}), 400

    file.stream.seek(0, 2)
    file_size = file.stream.tell()
    file.stream.seek(0)
    if file_size > 10 * 1024 * 1024:
        return jsonify({"error": "File exceeds 10MB max size"}), 400

    try:
        filename = save_upload(file, current_app.config["BARN_UPLOAD_DIR"])
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    receipt = ExpenseReceipt(
        expense_id=expense.id,
        file_name=filename,
        url=f"/uploads/{filename}",
        caption=(request.form.get("caption") or None),
    )
    db.session.add(receipt)
    db.session.commit()
    return jsonify(_receipt_payload(receipt)), 201


@api_bp.get("/expenses/<int:expense_id>/receipts")
def api_expense_receipts_list(expense_id: int):
    Expense.query.get_or_404(expense_id)
    receipts = ExpenseReceipt.query.filter_by(expense_id=expense_id).order_by(ExpenseReceipt.id.asc()).all()
    return jsonify([_receipt_payload(item) for item in receipts])


@api_bp.delete("/receipts/<int:receipt_id>")
def api_expense_receipt_delete(receipt_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    receipt = ExpenseReceipt.query.get_or_404(receipt_id)
    db.session.delete(receipt)
    db.session.commit()
    return jsonify({"success": True})


@api_bp.post("/expenses/<int:expense_id>/allocations")
def api_expense_allocations_replace(expense_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error

    expense = Expense.query.get_or_404(expense_id)
    payload = request.get_json(silent=True) or {}
    allocations = payload.get("allocations")
    if not isinstance(allocations, list) or len(allocations) == 0:
        return jsonify({"error": "allocations must contain at least one allocation"}), 400

    normalized: list[tuple[int, int]] = []
    seen_projects: set[int] = set()
    for item in allocations:
        try:
            project_id = int(item.get("project_id"))
            amount_cents = int(item.get("amount_cents"))
        except Exception:
            return jsonify({"error": "Each allocation needs valid project_id and amount_cents"}), 400
        if amount_cents < 0:
            return jsonify({"error": "amount_cents must be >= 0"}), 400
        if project_id in seen_projects:
            return jsonify({"error": "Duplicate project_id values are not allowed"}), 400
        if Project.query.get(project_id) is None:
            return jsonify({"error": f"project_id {project_id} does not exist"}), 400
        seen_projects.add(project_id)
        normalized.append((project_id, amount_cents))

    expected_total = _expense_total_cents(expense)
    provided_total = sum(amount for _, amount in normalized)
    if provided_total != expected_total:
        return jsonify({"error": "Allocation sum must equal expense amount exactly"}), 400

    ExpenseAllocation.query.filter_by(expense_id=expense.id).delete()
    for project_id, amount_cents in normalized:
        db.session.add(ExpenseAllocation(expense_id=expense.id, project_id=project_id, amount_cents=amount_cents))
    expense.updated_at = datetime.utcnow()
    db.session.commit()

    rows = ExpenseAllocation.query.filter_by(expense_id=expense.id).order_by(ExpenseAllocation.id.asc()).all()
    return jsonify([_allocation_payload(item) for item in rows])


@api_bp.get("/expenses/<int:expense_id>/allocations")
def api_expense_allocations_list(expense_id: int):
    expense = Expense.query.get_or_404(expense_id)
    rows = ExpenseAllocation.query.filter_by(expense_id=expense.id).order_by(ExpenseAllocation.id.asc()).all()
    if rows:
        return jsonify([_allocation_payload(item) for item in rows])
    fallback = [{"id": None, "expense_id": expense.id, "project_id": expense.project_id, "amount_cents": _expense_total_cents(expense), "amount": expense.amount, "created_at": _iso(expense.created_at)}]
    return jsonify(fallback)


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
    month_total_cents = 0
    for expense in Expense.query.filter(Expense.date >= month_start).all():
        month_total_cents += sum(row["amount_cents"] for row in _allocation_rows_for_expense(expense))

    return jsonify({
        "counts": counts,
        "month_total": month_total_cents / 100.0,
        "by_project": [{"name": row["name"], "total": row["total"], "project_id": row["project_id"]} for row in _project_totals()],
        "recent_activity": [],
        "upcoming": [],
    })


def _show_day_payload(show_day: ShowDay) -> dict[str, object]:
    return {
        "id": show_day.id,
        "show_id": show_day.show_id,
        "day_number": show_day.day_number,
        "date": _iso(show_day.date),
    }


def _placing_payload(placing: Placing) -> dict[str, object]:
    return {
        "id": placing.id,
        "entry_id": placing.entry_id,
        "show_day_id": placing.show_day_id,
        "ring": placing.ring,
        "placing": placing.placing,
        "points": placing.points,
        "judge": placing.judge,
        "notes": placing.notes,
        "created_at": _iso(placing.created_at),
    }


def _show_entry_payload(entry: ShowEntry) -> dict[str, object]:
    placings = Placing.query.filter_by(entry_id=entry.id).order_by(Placing.id.asc()).all()
    return {
        "id": entry.id,
        "show_id": entry.show_id,
        "project_id": entry.project_id,
        "class_name": entry.class_name,
        "division": entry.division,
        "weight": entry.weight,
        "notes": entry.notes,
        "placings": [_placing_payload(p) for p in placings],
    }


def _show_payload(show: Show) -> dict[str, object]:
    days = ShowDay.query.filter_by(show_id=show.id).order_by(ShowDay.day_number.asc(), ShowDay.id.asc()).all()
    entries = ShowEntry.query.filter_by(show_id=show.id).order_by(ShowEntry.id.asc()).all()
    return {
        "id": show.id,
        "name": show.name,
        "location": show.location,
        "start_date": _iso(show.start_date),
        "end_date": _iso(show.end_date),
        "notes": show.notes,
        "created_at": _iso(show.created_at),
        "days": [_show_day_payload(day) for day in days],
        "entries": [_show_entry_payload(entry) for entry in entries],
    }


def _timeline_payload(item: TimelineEntry) -> dict[str, object]:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "type": item.type,
        "title": item.title,
        "description": item.description,
        "date": _iso(item.date),
        "created_at": _iso(item.created_at),
    }


def _task_item_payload(task: TaskItem) -> dict[str, object]:
    return {
        "id": task.id,
        "project_id": task.project_id,
        "title": task.title,
        "due_date": _iso(task.due_date),
        "recurrence": task.recurrence,
        "assigned_profile_id": task.assigned_profile_id,
        "status": task.status,
        "priority": task.priority,
        "notes": task.notes,
        "created_at": _iso(task.created_at),
        "updated_at": _iso(task.updated_at),
        "completed_at": _iso(task.completed_at),
    }


def _media_payload(item: Media) -> dict[str, object]:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "show_id": item.show_id,
        "show_day_id": item.show_day_id,
        "file_name": item.file_name,
        "url": item.url,
        "caption": item.caption,
        "created_at": _iso(item.created_at),
    }


@api_bp.get('/shows')
def api_shows():
    shows = Show.query.order_by(Show.start_date.asc(), Show.id.asc()).all()
    return jsonify([_show_payload(show) for show in shows])


@api_bp.post('/shows')
def api_create_show():
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    name = str(payload.get('name', '')).strip()
    location = str(payload.get('location', '')).strip()
    start_date_raw = payload.get('start_date')
    if not name or not location or not start_date_raw:
        return jsonify({'error': 'name, location, and start_date are required'}), 400
    show = Show(name=name, location=location, start_date=date.fromisoformat(start_date_raw), end_date=date.fromisoformat(payload['end_date']) if payload.get('end_date') else None, notes=payload.get('notes'))
    db.session.add(show)
    db.session.commit()
    return jsonify(_show_payload(show)), 201


@api_bp.get('/shows/<int:show_id>')
def api_show_detail(show_id: int):
    return jsonify(_show_payload(Show.query.get_or_404(show_id)))


@api_bp.patch('/shows/<int:show_id>')
def api_show_update(show_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    show = Show.query.get_or_404(show_id)
    payload = request.get_json(silent=True) or {}
    for key in ['name', 'location', 'notes']:
        if key in payload:
            setattr(show, key, payload[key])
    if 'start_date' in payload:
        show.start_date = date.fromisoformat(payload['start_date'])
    if 'end_date' in payload:
        show.end_date = date.fromisoformat(payload['end_date']) if payload['end_date'] else None
    db.session.commit()
    return jsonify(_show_payload(show))


@api_bp.delete('/shows/<int:show_id>')
def api_show_delete(show_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    show = Show.query.get_or_404(show_id)
    entries = ShowEntry.query.filter_by(show_id=show.id).all()
    for entry in entries:
        Placing.query.filter_by(entry_id=entry.id).delete()
    ShowEntry.query.filter_by(show_id=show.id).delete()
    ShowDay.query.filter_by(show_id=show.id).delete()
    Media.query.filter_by(show_id=show.id).delete()
    db.session.delete(show)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.post('/shows/<int:show_id>/days')
def api_show_day_create(show_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Show.query.get_or_404(show_id)
    payload = request.get_json(silent=True) or {}
    count = ShowDay.query.filter_by(show_id=show_id).count()
    day = ShowDay(show_id=show_id, day_number=count + 1, date=date.fromisoformat(payload['date']) if payload.get('date') else None)
    db.session.add(day)
    db.session.commit()
    return jsonify(_show_day_payload(day)), 201


@api_bp.delete('/show-days/<int:show_day_id>')
def api_show_day_delete(show_day_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    show_day = ShowDay.query.get_or_404(show_day_id)
    Placing.query.filter_by(show_day_id=show_day.id).delete()
    Media.query.filter_by(show_day_id=show_day.id).delete()
    db.session.delete(show_day)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.post('/shows/<int:show_id>/entries')
def api_show_entry_create(show_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Show.query.get_or_404(show_id)
    payload = request.get_json(silent=True) or {}
    entry = ShowEntry(show_id=show_id, project_id=int(payload.get('project_id')), class_name=payload.get('class_name'), division=payload.get('division'), weight=float(payload['weight']) if payload.get('weight') not in (None, '') else None, notes=payload.get('notes'))
    db.session.add(entry)
    db.session.commit()
    return jsonify(_show_entry_payload(entry)), 201


@api_bp.get('/entries/<int:entry_id>')
def api_show_entry_detail(entry_id: int):
    return jsonify(_show_entry_payload(ShowEntry.query.get_or_404(entry_id)))


@api_bp.patch('/entries/<int:entry_id>')
def api_show_entry_update(entry_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    entry = ShowEntry.query.get_or_404(entry_id)
    payload = request.get_json(silent=True) or {}
    for key in ['class_name', 'division', 'notes']:
        if key in payload:
            setattr(entry, key, payload[key])
    if 'project_id' in payload:
        entry.project_id = int(payload['project_id'])
    if 'weight' in payload:
        entry.weight = float(payload['weight']) if payload['weight'] not in (None, '') else None
    db.session.commit()
    return jsonify(_show_entry_payload(entry))


@api_bp.delete('/entries/<int:entry_id>')
def api_show_entry_delete(entry_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    entry = ShowEntry.query.get_or_404(entry_id)
    Placing.query.filter_by(entry_id=entry.id).delete()
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.post('/entries/<int:entry_id>/placings')
def api_placings_create(entry_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    ShowEntry.query.get_or_404(entry_id)
    payload = request.get_json(silent=True) or {}
    placing_value = str(payload.get('placing', '')).strip()
    show_day_id = payload.get('show_day_id')
    if not placing_value or not show_day_id:
        return jsonify({'error': 'placing and show_day_id are required'}), 400
    placing = Placing(entry_id=entry_id, show_day_id=int(show_day_id), ring=payload.get('ring'), placing=placing_value, points=float(payload['points']) if payload.get('points') not in (None, '') else None, judge=payload.get('judge'), notes=payload.get('notes'))
    db.session.add(placing)
    db.session.commit()
    return jsonify(_placing_payload(placing)), 201


@api_bp.patch('/placings/<int:placing_id>')
def api_placings_update(placing_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    placing = Placing.query.get_or_404(placing_id)
    payload = request.get_json(silent=True) or {}
    for key in ['ring', 'placing', 'judge', 'notes']:
        if key in payload:
            setattr(placing, key, payload[key])
    if 'points' in payload:
        placing.points = float(payload['points']) if payload['points'] not in (None, '') else None
    db.session.commit()
    return jsonify(_placing_payload(placing))


@api_bp.delete('/placings/<int:placing_id>')
def api_placings_delete(placing_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    db.session.delete(Placing.query.get_or_404(placing_id))
    db.session.commit()
    return jsonify({'success': True})


@api_bp.get('/projects/<int:project_id>/shows')
def api_project_shows(project_id: int):
    Project.query.get_or_404(project_id)
    entries = ShowEntry.query.filter_by(project_id=project_id).all()
    show_ids = sorted({e.show_id for e in entries})
    shows = [Show.query.get(show_id) for show_id in show_ids]
    return jsonify([_show_payload(show) for show in shows if show])


@api_bp.get('/projects/<int:project_id>/timeline')
def api_project_timeline(project_id: int):
    Project.query.get_or_404(project_id)
    items = TimelineEntry.query.filter_by(project_id=project_id).order_by(TimelineEntry.date.desc(), TimelineEntry.id.desc()).all()
    return jsonify([_timeline_payload(item) for item in items])


@api_bp.post('/projects/<int:project_id>/timeline')
def api_project_timeline_create(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    payload = request.get_json(silent=True) or {}
    title = str(payload.get('title', '')).strip()
    event_type = str(payload.get('type', '')).strip()
    event_date = payload.get('date')
    if not title or not event_type or not event_date:
        return jsonify({'error': 'type, title, and date are required'}), 400
    item = TimelineEntry(project_id=project_id, type=event_type, title=title, description=payload.get('description'), date=date.fromisoformat(event_date))
    db.session.add(item)
    db.session.commit()
    return jsonify(_timeline_payload(item)), 201


@api_bp.delete('/timeline/<int:timeline_id>')
def api_project_timeline_delete(timeline_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    db.session.delete(TimelineEntry.query.get_or_404(timeline_id))
    db.session.commit()
    return jsonify({'success': True})


@api_bp.post('/media/upload')
def api_media_upload():
    _, error = _require_parent_unlocked()
    if error:
        return error
    file = request.files.get('file')
    try:
        filename = save_upload(file, current_app.config['BARN_UPLOAD_DIR'])
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400
    media = Media(project_id=int(request.form['project_id']) if request.form.get('project_id') else None, show_id=int(request.form['show_id']) if request.form.get('show_id') else None, show_day_id=int(request.form['show_day_id']) if request.form.get('show_day_id') else None, file_name=filename, url=f"/uploads/{filename}", caption=request.form.get('caption'))
    db.session.add(media)
    db.session.commit()
    return jsonify(_media_payload(media)), 201


@api_bp.get('/media')
def api_media_list():
    query = Media.query
    for key in ['project_id', 'show_id', 'show_day_id']:
        value = request.args.get(key)
        if value:
            query = query.filter(getattr(Media, key) == int(value))
    media = query.order_by(Media.created_at.desc(), Media.id.desc()).all()
    return jsonify([_media_payload(m) for m in media])


@api_bp.delete('/media/<int:media_id>')
def api_media_delete(media_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    media = Media.query.get_or_404(media_id)
    db.session.delete(media)
    db.session.commit()
    return jsonify({'success': True})
@api_bp.get('/tasks')
def api_tasks():
    query = TaskItem.query
    for key in ['status', 'project_id', 'assigned_profile_id']:
        value = request.args.get(key)
        if value:
            col = getattr(TaskItem, key)
            query = query.filter(col == (int(value) if key.endswith('_id') else value))
    due_before = request.args.get('due_before')
    due_after = request.args.get('due_after')
    if due_before:
        query = query.filter(TaskItem.due_date <= date.fromisoformat(due_before))
    if due_after:
        query = query.filter(TaskItem.due_date >= date.fromisoformat(due_after))
    tasks = query.order_by(TaskItem.status.asc(), TaskItem.due_date.asc().nulls_last(), TaskItem.id.desc()).all()
    return jsonify([_task_item_payload(task) for task in tasks])


@api_bp.post('/tasks')
def api_task_create():
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    title = str(payload.get('title', '')).strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400
    task = TaskItem(project_id=payload.get('project_id'), title=title, due_date=date.fromisoformat(payload['due_date']) if payload.get('due_date') else None, recurrence=payload.get('recurrence') or 'none', assigned_profile_id=payload.get('assigned_profile_id'), status=payload.get('status') or 'open', priority=payload.get('priority') or 'normal', notes=payload.get('notes'))
    db.session.add(task)
    db.session.commit()
    return jsonify(_task_item_payload(task)), 201


@api_bp.get('/tasks/<int:task_id>')
def api_task_detail(task_id: int):
    return jsonify(_task_item_payload(TaskItem.query.get_or_404(task_id)))


@api_bp.patch('/tasks/<int:task_id>')
def api_task_update(task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    task = TaskItem.query.get_or_404(task_id)
    payload = request.get_json(silent=True) or {}
    for key in ['title', 'recurrence', 'status', 'priority', 'notes']:
        if key in payload:
            setattr(task, key, payload[key])
    for key in ['project_id', 'assigned_profile_id']:
        if key in payload:
            setattr(task, key, payload[key])
    if 'due_date' in payload:
        task.due_date = date.fromisoformat(payload['due_date']) if payload['due_date'] else None
    if task.status == 'done' and task.completed_at is None:
        task.completed_at = datetime.utcnow()
    if task.status != 'done':
        task.completed_at = None
    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_task_item_payload(task))


@api_bp.delete('/tasks/<int:task_id>')
def api_task_delete(task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    db.session.delete(TaskItem.query.get_or_404(task_id))
    db.session.commit()
    return jsonify({'success': True})


@api_bp.post('/tasks/<int:task_id>/toggle')
def api_task_toggle(task_id: int):
    profile = _active_profile()
    if profile is None:
        return jsonify({'error': 'No active profile'}), 401
    task = TaskItem.query.get_or_404(task_id)
    if profile.role == 'parent':
        if not _is_unlocked():
            return jsonify({'error': 'Parent PIN unlock required'}), 403
    else:
        setting = AppSetting.query.order_by(AppSetting.id.asc()).first()
        allow = bool(setting.allow_kid_task_toggle) if setting else False
        if not allow or task.assigned_profile_id != profile.id:
            return jsonify({'error': 'Not allowed to toggle this task'}), 403
    task.status = 'done' if task.status != 'done' else 'open'
    task.completed_at = datetime.utcnow() if task.status == 'done' else None
    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_task_item_payload(task))


@api_bp.get('/projects/<int:project_id>/tasks')
def api_project_tasks(project_id: int):
    Project.query.get_or_404(project_id)
    tasks = TaskItem.query.filter_by(project_id=project_id).order_by(TaskItem.due_date.asc().nulls_last(), TaskItem.id.desc()).all()
    return jsonify([_task_item_payload(task) for task in tasks])


def _csv_response(filename: str, headers: list[str], rows: list[list[object]]) -> Response:
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(headers)
    writer.writerows(rows)
    return Response(stream.getvalue(), mimetype='text/csv', headers={'Content-Disposition': f'attachment; filename={filename}'})


@api_bp.get('/export/projects.csv')
def api_export_projects_csv():
    _, error = _require_parent_unlocked()
    if error:
        return error
    projects = Project.query.order_by(Project.id.asc()).all()
    rows = [[p.id, p.name, p.type, p.status, p.owner_id, p.created_at.date().isoformat() if p.created_at else ''] for p in projects]
    return _csv_response('projects.csv', ['id', 'name', 'species', 'status', 'owner_profile_id', 'created_at'], rows)


@api_bp.get('/export/expenses.csv')
def api_export_expenses_csv():
    _, error = _require_parent_unlocked()
    if error:
        return error
    query = Expense.query
    start = request.args.get('start')
    end = request.args.get('end')
    project_id = request.args.get('project_id')
    if start:
        query = query.filter(Expense.date >= date.fromisoformat(start))
    if end:
        query = query.filter(Expense.date <= date.fromisoformat(end))
    expenses = query.order_by(Expense.date.asc(), Expense.id.asc()).all()
    rows = []
    for e in expenses:
        allocation_rows = _allocation_rows_for_expense(e)
        if project_id:
            selected_project_id = int(project_id)
            matched = [row for row in allocation_rows if row['project_id'] == selected_project_id]
            if not matched:
                continue
            amount = sum(row['amount_cents'] for row in matched) / 100.0
            row_project_id = selected_project_id
        else:
            amount = e.amount
            row_project_id = e.project_id
        rows.append([e.id, row_project_id, e.date.isoformat(), e.category, e.vendor or '', amount, e.notes or ''])
    return _csv_response('expenses.csv', ['id', 'project_id', 'date', 'category', 'vendor', 'amount', 'notes'], rows)


@api_bp.get('/export/tasks.csv')
def api_export_tasks_csv():
    _, error = _require_parent_unlocked()
    if error:
        return error
    query = TaskItem.query
    status = request.args.get('status')
    assigned_profile_id = request.args.get('assigned_profile_id')
    if status:
        query = query.filter(TaskItem.status == status)
    if assigned_profile_id:
        query = query.filter(TaskItem.assigned_profile_id == int(assigned_profile_id))
    tasks = query.order_by(TaskItem.id.asc()).all()
    rows = [[t.id, t.project_id or '', t.title, t.status, t.priority, t.due_date.isoformat() if t.due_date else '', t.assigned_profile_id or ''] for t in tasks]
    return _csv_response('tasks.csv', ['id', 'project_id', 'title', 'status', 'priority', 'due_date', 'assigned_profile_id'], rows)


@api_bp.get('/export/project/<int:project_id>.pdf')
def api_export_project_pdf(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    project = Project.query.get_or_404(project_id)
    expenses_total = 0.0
    for expense in Expense.query.all():
        for row in _allocation_rows_for_expense(expense):
            if row["project_id"] == project_id:
                expenses_total += row["amount_cents"] / 100.0
    tasks_open = TaskItem.query.filter_by(project_id=project_id, status='open').count()
    entries = ShowEntry.query.filter_by(project_id=project_id).all()
    placements = sum(Placing.query.filter_by(entry_id=e.id).count() for e in entries)
    text = f"Project Show Packet\nProject: {project.name}\nSpecies: {project.type}\nStatus: {project.status}\nTotal Expenses: ${float(expenses_total):.2f}\nOpen Tasks: {tasks_open}\nRecent Placings: {placements}\nGenerated: {datetime.utcnow().isoformat()}"
    escaped = text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    stream = f"BT /F1 12 Tf 50 760 Td ({escaped.replace(chr(10), ') Tj T* (')}) Tj ET"
    pdf = f"%PDF-1.1\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length {len(stream)} >> stream\n{stream}\nendstream endobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000243 00000 n \n0000000000 00000 n \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n0\n%%EOF"
    return Response(pdf, mimetype='application/pdf', headers={'Content-Disposition': f'attachment; filename=project-{project_id}.pdf'})


@api_bp.get('/settings')
def api_settings_get():
    setting = AppSetting.query.order_by(AppSetting.id.asc()).first()
    if setting is None:
        setting = AppSetting(family_name='', allow_kid_task_toggle=False)
        db.session.add(setting)
        db.session.commit()
    return jsonify({'family_name': setting.family_name, 'allow_kid_task_toggle': setting.allow_kid_task_toggle})


@api_bp.patch('/settings')
def api_settings_patch():
    _, error = _require_parent_unlocked()
    if error:
        return error
    setting = AppSetting.query.order_by(AppSetting.id.asc()).first()
    if setting is None:
        setting = AppSetting(family_name='', allow_kid_task_toggle=False)
        db.session.add(setting)
    payload = request.get_json(silent=True) or {}
    if 'family_name' in payload:
        setting.family_name = payload['family_name']
    if 'allow_kid_task_toggle' in payload:
        setting.allow_kid_task_toggle = bool(payload['allow_kid_task_toggle'])
    db.session.commit()
    return jsonify({'family_name': setting.family_name, 'allow_kid_task_toggle': setting.allow_kid_task_toggle})
