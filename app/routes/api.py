from __future__ import annotations

from datetime import date, datetime, time, timedelta
import csv
import io
import mimetypes
import os

from werkzeug.utils import secure_filename

from flask import Blueprint, Response, current_app, jsonify, request, send_from_directory, session
from sqlalchemy import func, text
from werkzeug.security import check_password_hash, generate_password_hash

from app import save_upload, save_upload_in_subdir
from app.models import AppSetting, AuctionSale, Expense, ExpenseAllocation, ExpenseReceipt, FamilyInventoryItem, FeedEntry, FeedInventorySimple, HealthEntry, IncomeRecord, Media, Placing, Profile, Project, ProjectMaterial, ProjectTask, Show, ShowDay, ShowDayTask, ShowEntry, Task, TaskItem, TimelineEntry, WeightEntry, db

api_bp = Blueprint("api", __name__, url_prefix="/api")
UNLOCK_DURATION_MINUTES = 15

INCOME_TYPE_STORAGE_MAP = {
    "auction_sale": "auction_sale",
    "add_on": "add_on",
    "sponsorship": "sponsorship",
    "private_sale": "private_sale",
    "prize_money": "prize",
    "refund": "other",
    "other": "other",
}

INCOME_TYPE_API_MAP = {value: key for key, value in INCOME_TYPE_STORAGE_MAP.items()}
INCOME_TYPE_API_MAP["premium"] = "prize_money"

PROJECT_TYPE_API_TO_DB = {
    "livestock": "cow",
    "cooking": "baking",
    "crafts": "other",
    "woodworking": "other",
    "gardening": "garden",
    "photography": "photography",
    "sewing": "sewing",
    "other": "other",
    "steer": "cow",
    "goat": "goat",
    "pig": "pig",
}
PROJECT_TYPE_DB_TO_API = {
    "cow": "livestock",
    "goat": "livestock",
    "pig": "livestock",
    "sheep": "livestock",
    "chicken": "livestock",
    "rabbit": "livestock",
    "horse": "livestock",
    "dairy": "livestock",
    "baking": "cooking",
    "garden": "gardening",
    "photography": "photography",
    "sewing": "sewing",
    "other": "other",
}

LIVESTOCK_TYPES = {"cow", "goat", "pig", "sheep", "chicken", "rabbit", "horse", "dairy"}


def _parse_date_value(value: object) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _income_payload(row: IncomeRecord) -> dict[str, object]:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "profile_id": row.logged_by_id,
        "date": _iso(row.date),
        "type": INCOME_TYPE_API_MAP.get(row.category, row.category),
        "source": row.source,
        "amount": float(row.amount),
        "amount_cents": int(round(float(row.amount) * 100)),
        "notes": row.notes,
        "created_at": _iso(getattr(row, "created_at", None) or row.date),
        "updated_at": _iso(getattr(row, "updated_at", None) or getattr(row, "created_at", None) or row.date),
    }


def _auction_payload(row: AuctionSale) -> dict[str, object]:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "show_id": row.show_id,
        "sale_date": _iso(row.sale_date),
        "buyer_name": row.buyer_name,
        "sale_amount": float(row.total_price or 0),
        "add_ons_amount": float(row.addon_amount or 0),
        "fees_amount": float(row.deductions or 0),
        "final_payout": float(row.net_proceeds or 0),
        "notes": row.notes,
    }


def _date_window_from_request() -> tuple[date | None, date | None]:
    range_key = (request.args.get("range") or "all").strip().lower()
    start = _parse_date_value(request.args.get("start_date"))
    end = _parse_date_value(request.args.get("end_date"))
    if range_key == "this_year":
        today = date.today()
        return date(today.year, 1, 1), date(today.year, 12, 31)
    return start, end


def _project_financial_summary(project: Project, start: date | None = None, end: date | None = None) -> dict[str, object]:
    expense_total_cents = 0
    for expense in Expense.query.all():
        if start and expense.date < start:
            continue
        if end and expense.date > end:
            continue
        for row in _allocation_rows_for_expense(expense):
            if row["project_id"] == project.id:
                expense_total_cents += row["amount_cents"]

    feed_total_cents = 0
    health_total_cents = 0
    materials_total_cents = 0
    income_total_cents = 0

    feed_query = FeedEntry.query.filter_by(project_id=project.id)
    health_query = HealthEntry.query.filter_by(project_id=project.id)
    income_query = IncomeRecord.query.filter_by(project_id=project.id)
    auction_query = AuctionSale.query.filter_by(project_id=project.id)
    material_query = ProjectMaterial.query.filter_by(project_id=project.id)

    if start:
        feed_query = feed_query.filter(FeedEntry.recorded_at >= start)
        health_query = health_query.filter(HealthEntry.recorded_at >= start)
        income_query = income_query.filter(IncomeRecord.date >= start)
        auction_query = auction_query.filter(AuctionSale.sale_date >= start)
    if end:
        feed_query = feed_query.filter(FeedEntry.recorded_at <= end)
        health_query = health_query.filter(HealthEntry.recorded_at <= end)
        income_query = income_query.filter(IncomeRecord.date <= end)
        auction_query = auction_query.filter(AuctionSale.sale_date <= end)
        material_query = material_query.filter(ProjectMaterial.date_purchased <= end)
    if start:
        material_query = material_query.filter(ProjectMaterial.date_purchased >= start)

    feed_total_cents = sum(int(row.cost_cents or 0) for row in feed_query.all())
    health_total_cents = sum(int(row.cost_cents or 0) for row in health_query.all())
    materials_total_cents = sum(int(round(float((row.total_cost or 0)) * 100)) for row in material_query.all())
    income_total_cents = sum(int(round(float(row.amount) * 100)) for row in income_query.all())
    income_total_cents += sum(int(round(float(row.net_proceeds or 0) * 100)) for row in auction_query.all())

    total_expenses_cents = expense_total_cents + feed_total_cents + health_total_cents + materials_total_cents
    net_cents = income_total_cents - total_expenses_cents
    latest_sale = auction_query.order_by(AuctionSale.sale_date.desc(), AuctionSale.id.desc()).first()

    return {
        "project_id": project.id,
        "project_name": project.name,
        "owner_profile_id": project.owner_id,
        "total_expenses_cents": total_expenses_cents,
        "total_expenses": total_expenses_cents / 100.0,
        "total_feed_cents": feed_total_cents,
        "total_feed": feed_total_cents / 100.0,
        "total_health_cents": health_total_cents,
        "total_health": health_total_cents / 100.0,
        "total_materials_cents": materials_total_cents,
        "total_materials": materials_total_cents / 100.0,
        "total_income_cents": income_total_cents,
        "total_income": income_total_cents / 100.0,
        "net_profit_loss_cents": net_cents,
        "net_profit_loss": net_cents / 100.0,
        "latest_sale": _auction_payload(latest_sale) if latest_sale else None,
    }


CARE_CATEGORY_LABELS = {
    "feed": "Fed",
    "water": "Watered",
    "grooming": "Groomed",
    "exercise": "Exercised",
    "weigh": "Weighed",
    "health check": "Health Check",
    "clean pen": "Cleaned Pen",
    "note": "Care Note",
}


def _care_entry_payload(entry: TimelineEntry) -> dict[str, object]:
    category = (entry.type or "note").strip().lower()
    return {
        "id": entry.id,
        "project_id": entry.project_id,
        "recorded_at": _iso(entry.date),
        "category": category,
        "label": CARE_CATEGORY_LABELS.get(category, entry.type),
        "title": entry.title,
        "notes": entry.description,
        "created_at": _iso(entry.created_at),
    }


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


def _upload_error_response() -> tuple[Response, int] | None:
    if current_app.config.get("UPLOAD_READY"):
        return None
    return jsonify({"error": current_app.config.get("UPLOAD_ERROR") or "Upload directory is not configured"}), 503


def _guess_mime(filename: str) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def _validate_upload(file, allowed_prefixes: tuple[str, ...], allowed_exact: set[str] | None = None) -> tuple[str | None, tuple[Response, int] | None]:
    if not file or not file.filename:
        return None, (jsonify({"error": "file is required"}), 400)

    safe_name = secure_filename(file.filename)
    if not safe_name:
        return None, (jsonify({"error": "Invalid file name"}), 400)

    mime_type = file.mimetype or _guess_mime(safe_name)
    if not any(mime_type.startswith(prefix) for prefix in allowed_prefixes):
        if not allowed_exact or mime_type not in allowed_exact:
            return None, (jsonify({"error": f"Unsupported file type: {mime_type}"}), 400)

    return safe_name, None


def _save_file(file, subdir: str | None = None) -> tuple[str | None, tuple[Response, int] | None]:
    upload_error = _upload_error_response()
    if upload_error:
        return None, upload_error

    upload_dir = current_app.config["UPLOAD_DIR"]
    try:
        os.makedirs(upload_dir, exist_ok=True)
        filename = save_upload_in_subdir(file, upload_dir, subdir) if subdir else save_upload(file, upload_dir)
    except ValueError as exc:
        return None, (jsonify({"error": str(exc)}), 400)
    except OSError as exc:
        return None, (jsonify({"error": f"Could not store upload: {exc}"}), 500)
    return filename, None


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
    project_kind = PROJECT_TYPE_DB_TO_API.get(project.type, "other")
    is_livestock = project.type in LIVESTOCK_TYPES
    return {
        "id": project.id,
        "name": project.name,
        "species": "steer" if project.type == "cow" else project.type,
        "project_type": project_kind,
        "is_livestock": is_livestock,
        "project_category": project.sub_type,
        "breed": project.breed,
        "sex": project.sex,
        "ear_tag": project.ear_tag,
        "target_weight": project.target_weight,
        "purchase_date": _iso(project.purchase_date),
        "goal": project.goal,
        "materials_needed": project.materials_needed,
        "completion_target_date": _iso(project.completion_target_date),
        "competition_category": project.competition_category,
        "tag": project.ear_tag,
        "status": project.status,
        "owner_profile_id": project.owner_id,
        "notes": project.notes,
        "created_at": _iso(project.created_at),
        "updated_at": _iso(project.updated_at or project.created_at),
        "photo_url": _avatar_url(project.photo_path),
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


@api_bp.get("/ready")
def api_ready():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ready", "service": "project-barn-backend"}), 200
    except Exception:
        return jsonify({"status": "not_ready", "service": "project-barn-backend"}), 503


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


@api_bp.get("/uploads/status")
def api_upload_status():
    if current_app.config.get("UPLOAD_READY"):
        return jsonify({"ready": True, "upload_dir": current_app.config.get("UPLOAD_DIR")})
    return jsonify({"ready": False, "error": current_app.config.get("UPLOAD_ERROR")}), 503


@api_bp.get("/uploads/<path:filename>")
def api_uploaded_file(filename: str):
    if not current_app.config.get("UPLOAD_READY"):
        return jsonify({"error": current_app.config.get("UPLOAD_ERROR") or "Upload directory is not configured"}), 503
    return send_from_directory(current_app.config["UPLOAD_DIR"], filename)


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
    project_type = request.args.get("project_type")
    status = request.args.get("status")
    owner_profile_id = request.args.get("owner")

    query = Project.query
    if species:
        query = query.filter(Project.type == species)
    if project_type:
        if project_type == "livestock":
            query = query.filter(Project.type.in_(tuple(LIVESTOCK_TYPES)))
        elif project_type in PROJECT_TYPE_API_TO_DB:
            query = query.filter(Project.type == PROJECT_TYPE_API_TO_DB[project_type])
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
    project_type = str(payload.get("project_type", "")).strip()
    owner_profile_id = payload.get("owner_profile_id")

    if not name:
        return jsonify({"error": "name is required"}), 400
    normalized = project_type or species
    if normalized not in PROJECT_TYPE_API_TO_DB:
        return jsonify({"error": "project_type must be one of livestock, cooking, crafts, woodworking, gardening, photography, sewing, other"}), 400
    if not owner_profile_id:
        return jsonify({"error": "owner_profile_id is required"}), 400

    owner = Profile.query.get(owner_profile_id)
    if owner is None:
        return jsonify({"error": "owner_profile_id is invalid"}), 400

    mapped_type = PROJECT_TYPE_API_TO_DB[normalized]
    project = Project(
        name=name,
        type=mapped_type,
        owner_id=owner_profile_id,
        breed=(payload.get("breed") or None),
        sex=(payload.get("sex") or None),
        target_weight=(float(payload["target_weight"]) if payload.get("target_weight") not in (None, "") else None),
        purchase_date=_parse_date_value(payload.get("purchase_date")),
        ear_tag=(payload.get("tag") or None),
        sub_type=(payload.get("project_category") or None),
        goal=(payload.get("goal") or None),
        materials_needed=(payload.get("materials_needed") or None),
        completion_target_date=_parse_date_value(payload.get("completion_target_date")),
        competition_category=(payload.get("competition_category") or None),
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
    if "species" in payload or "project_type" in payload:
        normalized = str(payload.get("project_type") or payload.get("species") or "").strip()
        if normalized not in PROJECT_TYPE_API_TO_DB:
            return jsonify({"error": "invalid project type"}), 400
        project.type = PROJECT_TYPE_API_TO_DB[normalized]
    if "tag" in payload:
        project.ear_tag = payload["tag"]
    if "breed" in payload:
        project.breed = str(payload.get("breed") or "").strip() or None
    if "sex" in payload:
        project.sex = str(payload.get("sex") or "").strip() or None
    if "target_weight" in payload:
        project.target_weight = float(payload["target_weight"]) if payload.get("target_weight") not in (None, "") else None
    if "purchase_date" in payload:
        project.purchase_date = _parse_date_value(payload.get("purchase_date"))
    if "project_category" in payload:
        project.sub_type = str(payload.get("project_category") or "").strip() or None
    if "goal" in payload:
        project.goal = str(payload.get("goal") or "").strip() or None
    if "materials_needed" in payload:
        project.materials_needed = str(payload.get("materials_needed") or "").strip() or None
    if "completion_target_date" in payload:
        project.completion_target_date = _parse_date_value(payload.get("completion_target_date"))
    if "competition_category" in payload:
        project.competition_category = str(payload.get("competition_category") or "").strip() or None
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


def _inventory_payload(item: FamilyInventoryItem) -> dict[str, object]:
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "quantity": float(item.quantity or 0),
        "unit": item.unit,
        "location": item.location,
        "condition": item.condition,
        "assigned_project_id": item.assigned_project_id,
        "notes": item.notes,
        "low_stock": bool(item.low_stock),
        "archived": bool(item.archived),
        "created_at": _iso(item.created_at),
        "updated_at": _iso(item.updated_at),
    }


def _project_material_payload(row: ProjectMaterial) -> dict[str, object]:
    return {
        "id": row.id,
        "project_id": row.project_id,
        "logged_by_id": row.logged_by_id,
        "item_name": row.item_name,
        "quantity": row.quantity,
        "unit": row.unit,
        "unit_cost": row.unit_cost,
        "total_cost": row.total_cost,
        "category": row.category,
        "inventory_item_id": row.inventory_item_id,
        "status": row.status,
        "notes": row.notes,
        "date_purchased": _iso(row.date_purchased),
    }


@api_bp.get('/inventory')
def api_inventory_list():
    include_archived = request.args.get('include_archived') == '1'
    query = FamilyInventoryItem.query
    if not include_archived:
        query = query.filter(FamilyInventoryItem.archived.is_(False))
    rows = query.order_by(FamilyInventoryItem.updated_at.desc(), FamilyInventoryItem.id.desc()).all()
    return jsonify([_inventory_payload(item) for item in rows])


@api_bp.post('/inventory')
def api_inventory_create():
    profile, error = _require_parent_unlocked()
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    name = str(payload.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400

    row = FamilyInventoryItem(
        name=name,
        category=str(payload.get('category') or 'general').strip() or 'general',
        quantity=float(payload.get('quantity') or 1),
        unit=str(payload.get('unit') or '').strip() or None,
        location=str(payload.get('location') or '').strip() or None,
        condition=str(payload.get('condition') or '').strip() or None,
        assigned_project_id=(int(payload['assigned_project_id']) if payload.get('assigned_project_id') not in (None, '') else None),
        notes=str(payload.get('notes') or '').strip() or None,
        low_stock=bool(payload.get('low_stock', False)),
        archived=bool(payload.get('archived', False)),
    )
    if row.assigned_project_id is not None and Project.query.get(row.assigned_project_id) is None:
        return jsonify({'error': 'assigned_project_id is invalid'}), 400

    db.session.add(row)
    db.session.commit()
    return jsonify(_inventory_payload(row)), 201


@api_bp.patch('/inventory/<int:item_id>')
def api_inventory_update(item_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = FamilyInventoryItem.query.get_or_404(item_id)
    payload = request.get_json(silent=True) or {}

    if 'name' in payload:
        row.name = str(payload.get('name') or '').strip() or row.name
    if 'category' in payload:
        row.category = str(payload.get('category') or '').strip() or 'general'
    if 'quantity' in payload:
        row.quantity = float(payload.get('quantity') or 0)
    if 'unit' in payload:
        row.unit = str(payload.get('unit') or '').strip() or None
    if 'location' in payload:
        row.location = str(payload.get('location') or '').strip() or None
    if 'condition' in payload:
        row.condition = str(payload.get('condition') or '').strip() or None
    if 'assigned_project_id' in payload:
        assigned_project_id = int(payload['assigned_project_id']) if payload.get('assigned_project_id') not in (None, '') else None
        if assigned_project_id is not None and Project.query.get(assigned_project_id) is None:
            return jsonify({'error': 'assigned_project_id is invalid'}), 400
        row.assigned_project_id = assigned_project_id
    if 'notes' in payload:
        row.notes = str(payload.get('notes') or '').strip() or None
    if 'low_stock' in payload:
        row.low_stock = bool(payload.get('low_stock'))
    if 'archived' in payload:
        row.archived = bool(payload.get('archived'))
    row.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify(_inventory_payload(row))


@api_bp.delete('/inventory/<int:item_id>')
def api_inventory_delete(item_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = FamilyInventoryItem.query.get_or_404(item_id)
    row.archived = True
    row.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'archived': True})


@api_bp.get('/projects/<int:project_id>/materials')
def api_project_materials(project_id: int):
    Project.query.get_or_404(project_id)
    rows = ProjectMaterial.query.filter_by(project_id=project_id).order_by(ProjectMaterial.id.desc()).all()
    return jsonify([_project_material_payload(row) for row in rows])


@api_bp.post('/projects/<int:project_id>/materials')
def api_project_materials_create(project_id: int):
    profile, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    payload = request.get_json(silent=True) or {}
    item_name = str(payload.get('item_name') or '').strip()
    if not item_name:
        return jsonify({'error': 'item_name is required'}), 400

    inventory_item_id = int(payload['inventory_item_id']) if payload.get('inventory_item_id') not in (None, '') else None
    if inventory_item_id is not None and FamilyInventoryItem.query.get(inventory_item_id) is None:
        return jsonify({'error': 'inventory_item_id is invalid'}), 400

    row = ProjectMaterial(
        project_id=project_id,
        logged_by_id=profile.id,
        item_name=item_name,
        quantity=float(payload['quantity']) if payload.get('quantity') not in (None, '') else None,
        unit=str(payload.get('unit') or '').strip() or None,
        unit_cost=float(payload['unit_cost']) if payload.get('unit_cost') not in (None, '') else None,
        total_cost=float(payload['total_cost']) if payload.get('total_cost') not in (None, '') else None,
        category=str(payload.get('category') or '').strip() or None,
        inventory_item_id=inventory_item_id,
        status=str(payload.get('status') or '').strip() or None,
        notes=str(payload.get('notes') or '').strip() or None,
        date_purchased=_parse_date_value(payload.get('date_purchased')),
    )
    if row.total_cost is None and row.unit_cost is not None and row.quantity is not None:
        row.total_cost = row.unit_cost * row.quantity
    db.session.add(row)
    db.session.commit()
    return jsonify(_project_material_payload(row)), 201


@api_bp.patch('/projects/<int:project_id>/materials/<int:material_id>')
def api_project_materials_update(project_id: int, material_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    row = ProjectMaterial.query.filter_by(project_id=project_id, id=material_id).first_or_404()
    payload = request.get_json(silent=True) or {}

    for key in ('item_name', 'unit', 'category', 'status', 'notes'):
        if key in payload:
            setattr(row, key, str(payload.get(key) or '').strip() or None)
    if 'quantity' in payload:
        row.quantity = float(payload['quantity']) if payload.get('quantity') not in (None, '') else None
    if 'unit_cost' in payload:
        row.unit_cost = float(payload['unit_cost']) if payload.get('unit_cost') not in (None, '') else None
    if 'total_cost' in payload:
        row.total_cost = float(payload['total_cost']) if payload.get('total_cost') not in (None, '') else None
    if 'date_purchased' in payload:
        row.date_purchased = _parse_date_value(payload.get('date_purchased'))
    if 'inventory_item_id' in payload:
        inventory_item_id = int(payload['inventory_item_id']) if payload.get('inventory_item_id') not in (None, '') else None
        if inventory_item_id is not None and FamilyInventoryItem.query.get(inventory_item_id) is None:
            return jsonify({'error': 'inventory_item_id is invalid'}), 400
        row.inventory_item_id = inventory_item_id

    if row.total_cost is None and row.unit_cost is not None and row.quantity is not None:
        row.total_cost = row.unit_cost * row.quantity
    db.session.commit()
    return jsonify(_project_material_payload(row))


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
    _, validation_error = _validate_upload(file, ("image/",), {"application/pdf"})
    if validation_error:
        return validation_error

    filename, save_error = _save_file(file, "receipts")
    if save_error:
        return save_error

    receipt = ExpenseReceipt(
        expense_id=expense.id,
        file_name=filename,
        url=f"/uploads/{filename}",
        caption=(request.form.get("caption") or None),
    )
    expense.receipt_url = receipt.url
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




@api_bp.get('/income')
def api_income_list():
    query = IncomeRecord.query
    project_id = request.args.get('project_id')
    if project_id:
        query = query.filter(IncomeRecord.project_id == int(project_id))
    start, end = _date_window_from_request()
    if start:
        query = query.filter(IncomeRecord.date >= start)
    if end:
        query = query.filter(IncomeRecord.date <= end)
    rows = query.order_by(IncomeRecord.date.desc(), IncomeRecord.id.desc()).all()
    return jsonify([_income_payload(row) for row in rows])


@api_bp.post('/income')
def api_income_create():
    profile, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    income_type = str(payload.get('type') or 'other').strip().lower()
    category = INCOME_TYPE_STORAGE_MAP.get(income_type)
    if category is None:
        return jsonify({'error': 'Invalid income type'}), 400
    try:
        logged_date = _parse_date_value(payload.get('date')) or date.today()
    except ValueError:
        return jsonify({'error': 'Invalid date'}), 400
    project_id_value = payload.get('project_id')
    if project_id_value in (None, ''):
        first_project = Project.query.order_by(Project.id.asc()).first()
        if not first_project:
            return jsonify({'error': 'project_id is required when no projects exist'}), 400
        project_id = first_project.id
    else:
        project_id = int(project_id_value)
    if Project.query.get(project_id) is None:
        return jsonify({'error': 'project not found'}), 404
    amount = float(payload.get('amount') or 0)
    if amount <= 0:
        return jsonify({'error': 'amount must be greater than 0'}), 400
    source = str(payload.get('source') or '').strip() or None
    notes = str(payload.get('notes') or '').strip() or None
    profile_id = payload.get('profile_id')
    logged_by_id = int(profile_id) if profile_id not in (None, '') else profile.id

    row = IncomeRecord(
        project_id=project_id,
        logged_by_id=logged_by_id,
        date=logged_date,
        category=category,
        amount=amount,
        source=source,
        notes=notes,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(_income_payload(row)), 201


@api_bp.patch('/income/<int:income_id>')
def api_income_update(income_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = IncomeRecord.query.get_or_404(income_id)
    payload = request.get_json(silent=True) or {}
    if 'type' in payload:
        income_type = str(payload.get('type') or '').strip().lower()
        category = INCOME_TYPE_STORAGE_MAP.get(income_type)
        if category is None:
            return jsonify({'error': 'Invalid income type'}), 400
        row.category = category
    if 'project_id' in payload and payload.get('project_id') not in (None, ''):
        project_id = int(payload['project_id'])
        if Project.query.get(project_id) is None:
            return jsonify({'error': 'project not found'}), 404
        row.project_id = project_id
    if 'profile_id' in payload and payload.get('profile_id') not in (None, ''):
        row.logged_by_id = int(payload['profile_id'])
    if 'date' in payload:
        try:
            parsed_date = _parse_date_value(payload.get('date'))
        except ValueError:
            return jsonify({'error': 'Invalid date'}), 400
        if parsed_date is not None:
            row.date = parsed_date
    if 'source' in payload:
        row.source = str(payload.get('source') or '').strip() or None
    if 'notes' in payload:
        row.notes = str(payload.get('notes') or '').strip() or None
    if 'amount' in payload:
        amount = float(payload.get('amount') or 0)
        if amount <= 0:
            return jsonify({'error': 'amount must be greater than 0'}), 400
        row.amount = amount
    db.session.commit()
    return jsonify(_income_payload(row))


@api_bp.delete('/income/<int:income_id>')
def api_income_delete(income_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = IncomeRecord.query.get_or_404(income_id)
    db.session.delete(row)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.get('/auction-sales')
def api_auction_sales_list():
    query = AuctionSale.query
    project_id = request.args.get('project_id')
    if project_id:
        query = query.filter(AuctionSale.project_id == int(project_id))
    start, end = _date_window_from_request()
    if start:
        query = query.filter(AuctionSale.sale_date >= start)
    if end:
        query = query.filter(AuctionSale.sale_date <= end)
    rows = query.order_by(AuctionSale.sale_date.desc(), AuctionSale.id.desc()).all()
    return jsonify([_auction_payload(row) for row in rows])


@api_bp.post('/auction-sales')
def api_auction_sales_create():
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    try:
        project_id = int(payload.get('project_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'project_id is required'}), 400
    if Project.query.get(project_id) is None:
        return jsonify({'error': 'project not found'}), 404
    try:
        sale_date = _parse_date_value(payload.get('sale_date')) or date.today()
    except ValueError:
        return jsonify({'error': 'Invalid sale date'}), 400
    sale_amount = float(payload.get('sale_amount') or 0)
    add_ons_amount = float(payload.get('add_ons_amount') or 0)
    fees_amount = float(payload.get('fees_amount') or 0)
    final_payout = payload.get('final_payout')
    if final_payout in (None, ''):
        final_payout = sale_amount + add_ons_amount - fees_amount
    final_payout = float(final_payout)
    row = AuctionSale(
        project_id=project_id,
        show_id=(int(payload.get('show_id')) if payload.get('show_id') not in (None, '') else None),
        sale_date=sale_date,
        buyer_name=str(payload.get('buyer_name') or 'Buyer').strip(),
        total_price=sale_amount,
        addon_amount=add_ons_amount,
        deductions=fees_amount,
        net_proceeds=final_payout,
        notes=str(payload.get('notes') or '').strip() or None,
    )
    db.session.add(row)
    db.session.flush()
    income_row = IncomeRecord(
        project_id=project_id,
        logged_by_id=_active_profile().id if _active_profile() else Project.query.get(project_id).owner_id,
        date=sale_date,
        category='auction_sale',
        amount=final_payout,
        source=f"Auction buyer: {row.buyer_name}",
        notes=f"Auction sale #{row.id}" + (f" - {row.notes}" if row.notes else ''),
    )
    db.session.add(income_row)
    db.session.commit()
    return jsonify(_auction_payload(row)), 201


@api_bp.patch('/auction-sales/<int:sale_id>')
def api_auction_sales_update(sale_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = AuctionSale.query.get_or_404(sale_id)
    payload = request.get_json(silent=True) or {}
    if 'project_id' in payload and payload.get('project_id') not in (None, ''):
        row.project_id = int(payload['project_id'])
    if 'show_id' in payload:
        row.show_id = int(payload['show_id']) if payload.get('show_id') not in (None, '') else None
    if 'sale_date' in payload:
        try:
            parsed = _parse_date_value(payload.get('sale_date'))
        except ValueError:
            return jsonify({'error': 'Invalid sale date'}), 400
        if parsed is not None:
            row.sale_date = parsed
    if 'buyer_name' in payload:
        row.buyer_name = str(payload.get('buyer_name') or '').strip() or row.buyer_name
    if 'sale_amount' in payload:
        row.total_price = float(payload.get('sale_amount') or 0)
    if 'add_ons_amount' in payload:
        row.addon_amount = float(payload.get('add_ons_amount') or 0)
    if 'fees_amount' in payload:
        row.deductions = float(payload.get('fees_amount') or 0)
    if 'final_payout' in payload:
        row.net_proceeds = float(payload.get('final_payout') or 0)
    else:
        row.net_proceeds = float(row.total_price or 0) + float(row.addon_amount or 0) - float(row.deductions or 0)
    if 'notes' in payload:
        row.notes = str(payload.get('notes') or '').strip() or None
    db.session.commit()
    return jsonify(_auction_payload(row))


@api_bp.get('/projects/<int:project_id>/financial-summary')
def api_project_financial_summary(project_id: int):
    project = Project.query.get_or_404(project_id)
    start, end = _date_window_from_request()
    return jsonify(_project_financial_summary(project, start, end))


@api_bp.get('/reports/financial-summary')
def api_reports_financial_summary():
    start, end = _date_window_from_request()
    profiles = {profile.id: profile.name for profile in Profile.query.filter_by(archived=False).all()}
    projects = Project.query.order_by(Project.name.asc()).all()
    by_project = []
    by_member_totals: dict[int, dict[str, object]] = {}
    for project in projects:
        summary = _project_financial_summary(project, start, end)
        owner_id = summary['owner_profile_id']
        summary['owner_name'] = profiles.get(owner_id, 'Unknown')
        by_project.append(summary)
        member = by_member_totals.setdefault(owner_id, {
            'profile_id': owner_id,
            'member_name': profiles.get(owner_id, 'Unknown'),
            'total_project_expenses_cents': 0,
            'total_project_income_cents': 0,
            'net_total_cents': 0,
        })
        member['total_project_expenses_cents'] += int(summary['total_expenses_cents'])
        member['total_project_income_cents'] += int(summary['total_income_cents'])
        member['net_total_cents'] += int(summary['net_profit_loss_cents'])

    overall_expenses = sum(int(row['total_expenses_cents']) for row in by_project)
    overall_income = sum(int(row['total_income_cents']) for row in by_project)
    recent_sales = AuctionSale.query.order_by(AuctionSale.sale_date.desc(), AuctionSale.id.desc()).limit(10).all()
    if start:
        recent_sales = [row for row in recent_sales if row.sale_date >= start]
    if end:
        recent_sales = [row for row in recent_sales if row.sale_date <= end]

    by_member = []
    for row in by_member_totals.values():
        by_member.append({
            **row,
            'total_project_expenses': row['total_project_expenses_cents'] / 100.0,
            'total_project_income': row['total_project_income_cents'] / 100.0,
            'net_total': row['net_total_cents'] / 100.0,
        })

    return jsonify({
        'range': request.args.get('range') or 'all',
        'start_date': start.isoformat() if start else None,
        'end_date': end.isoformat() if end else None,
        'overall_totals': {
            'total_expenses_cents': overall_expenses,
            'total_expenses': overall_expenses / 100.0,
            'total_income_cents': overall_income,
            'total_income': overall_income / 100.0,
            'net_family_balance_cents': overall_income - overall_expenses,
            'net_family_balance': (overall_income - overall_expenses) / 100.0,
        },
        'by_project': by_project,
        'by_member': by_member,
        'recent_sales': [_auction_payload(row) for row in recent_sales],
    })


@api_bp.get('/reports/financial-summary.csv')
def api_reports_financial_summary_csv():
    _, error = _require_parent_unlocked()
    if error:
        return error
    data = api_reports_financial_summary().get_json()
    rows = []
    for row in data['by_project']:
        rows.append([
            row['project_id'],
            row['project_name'],
            row['owner_name'],
            f"{row['total_expenses']:.2f}",
            f"{row['total_income']:.2f}",
            f"{row['net_profit_loss']:.2f}",
        ])
    return _csv_response('financial-summary.csv', ['project_id', 'project_name', 'owner', 'expenses', 'income', 'net'], rows)


@api_bp.get('/income.csv')
def api_income_csv():
    _, error = _require_parent_unlocked()
    if error:
        return error
    rows = IncomeRecord.query.order_by(IncomeRecord.date.asc(), IncomeRecord.id.asc()).all()
    csv_rows = [[row.id, row.project_id, row.logged_by_id, row.date.isoformat(), INCOME_TYPE_API_MAP.get(row.category, row.category), row.source or '', f"{float(row.amount):.2f}", row.notes or ''] for row in rows]
    return _csv_response('income.csv', ['id', 'project_id', 'profile_id', 'date', 'type', 'source', 'amount', 'notes'], csv_rows)

@api_bp.get("/summary")
@api_bp.get("/dashboard")
def api_summary():
    profile = _active_profile()
    setting = AppSetting.query.order_by(AppSetting.id.asc()).first()

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

    profiles = Profile.query.filter_by(archived=False).all()
    owner_names = {row.id: row.name for row in profiles}

    all_projects = Project.query.order_by(Project.id.asc()).all()
    project_names = {row.id: row.name for row in all_projects}
    active_projects = [row for row in all_projects if row.status == "active"][:8]
    all_expenses = Expense.query.order_by(Expense.date.desc(), Expense.id.desc()).all()

    expense_by_project: dict[int, int] = {}
    for expense in all_expenses:
        for row in _allocation_rows_for_expense(expense):
            expense_by_project[row["project_id"]] = expense_by_project.get(row["project_id"], 0) + row["amount_cents"]

    open_tasks_by_project = {
        project_id: count
        for project_id, count in db.session.query(ProjectTask.project_id, func.count(ProjectTask.id))
        .filter(ProjectTask.is_completed.is_(False))
        .group_by(ProjectTask.project_id)
        .all()
    }

    shows = Show.query.order_by(Show.start_date.asc(), Show.id.asc()).all()
    today = date.today()
    upcoming_shows = [show for show in shows if show.start_date and show.start_date >= today][:5]

    next_show_by_project: dict[int, Show] = {}
    for show in upcoming_shows:
        entries = ShowEntry.query.filter_by(show_id=show.id).all()
        for entry in entries:
            if entry.project_id not in next_show_by_project:
                next_show_by_project[entry.project_id] = show

    project_cards = []
    for project in active_projects:
        next_show = next_show_by_project.get(project.id)
        latest_weight = WeightEntry.query.filter_by(project_id=project.id).order_by(WeightEntry.recorded_at.desc(), WeightEntry.id.desc()).first()
        project_cards.append({
            "id": project.id,
            "name": project.name,
            "species": "steer" if project.type == "cow" else project.type,
            "project_type": PROJECT_TYPE_DB_TO_API.get(project.type, "other"),
            "project_category": project.sub_type,
            "is_livestock": project.type in LIVESTOCK_TYPES,
            "owner": owner_names.get(project.owner_id, "Unknown"),
            "status": project.status,
            "photo_url": _avatar_url(project.photo_path),
            "spent_total": expense_by_project.get(project.id, 0) / 100.0,
            "open_tasks": int(open_tasks_by_project.get(project.id, 0)),
            "latest_weight_lbs": latest_weight.weight_lbs if latest_weight else None,
            "next_event": next_show.name if next_show else None,
            "next_show": {
                "id": next_show.id,
                "name": next_show.name,
                "date": _iso(next_show.start_date),
            } if next_show else None,
        })

    recent_expenses = []
    for expense in all_expenses[:6]:
        recent_expenses.append({
            "id": expense.id,
            "project_id": expense.project_id,
            "project_name": project_names.get(expense.project_id, f"Project {expense.project_id}"),
            "amount": float(expense.amount),
            "date": _iso(expense.date),
            "category": expense.category,
            "vendor": expense.vendor,
            "has_receipt": len(expense.receipts) > 0,
        })

    recent_activity = []
    timeline_rows = TimelineEntry.query.order_by(TimelineEntry.date.desc(), TimelineEntry.id.desc()).limit(10).all()
    for item in timeline_rows:
        recent_activity.append({
            "id": f"timeline-{item.id}",
            "kind": "timeline",
            "title": item.title,
            "subtitle": item.type,
            "date": _iso(item.date),
            "href": f"/projects/{item.project_id}?tab=timeline",
        })

    for expense in all_expenses[:10]:
        recent_activity.append({
            "id": f"expense-{expense.id}",
            "kind": "expense",
            "title": f"Expense: {expense.category}",
            "subtitle": expense.vendor or "Expense recorded",
            "date": _iso(expense.date),
            "href": f"/expenses/{expense.id}",
        })

    placing_rows = Placing.query.order_by(Placing.created_at.desc(), Placing.id.desc()).limit(10).all()
    for placing in placing_rows:
        recent_activity.append({
            "id": f"placing-{placing.id}",
            "kind": "show",
            "title": f"Placing: {placing.placing}",
            "subtitle": placing.class_name or "Show placing",
            "date": _iso(placing.placed_at or placing.created_at),
            "href": f"/shows/{placing.show_id}" if placing.show_id else "/shows",
        })

    task_rows = ProjectTask.query.order_by(ProjectTask.updated_at.desc(), ProjectTask.id.desc()).limit(10).all()
    for task in task_rows:
        recent_activity.append({
            "id": f"task-{task.id}",
            "kind": "task",
            "title": task.title,
            "subtitle": "Completed" if task.is_completed else "Task updated",
            "date": _iso(task.updated_at or task.created_at),
            "href": f"/projects/{task.project_id}?tab=tasks",
        })

    recent_activity = [item for item in recent_activity if item.get("date")]
    recent_activity.sort(key=lambda item: item["date"], reverse=True)

    low_feed_inventory = [
        _feed_inventory_payload(item)
        for item in FeedInventorySimple.query.filter(FeedInventorySimple.is_active.is_(True)).order_by(FeedInventorySimple.updated_at.desc()).all()
        if item.low_stock_threshold is not None and item.qty_on_hand <= item.low_stock_threshold
    ][:6]

    recent_feed_events = []
    feed_rows = FeedEntry.query.order_by(FeedEntry.recorded_at.desc(), FeedEntry.id.desc()).limit(8).all()
    for feed_row in feed_rows:
        recent_feed_events.append({
            "id": feed_row.id,
            "project_id": feed_row.project_id,
            "project_name": project_names.get(feed_row.project_id, f"Project {feed_row.project_id}"),
            "recorded_at": _iso(feed_row.recorded_at),
            "feed_type": feed_row.feed_type,
            "amount": feed_row.amount,
            "unit": feed_row.unit,
        })

    total_spent_cents = 0
    for expense in all_expenses:
        total_spent_cents += sum(row["amount_cents"] for row in _allocation_rows_for_expense(expense))
    total_income_cents = sum(int(round(float(row.amount) * 100)) for row in IncomeRecord.query.all())
    total_income_cents += sum(int(round(float(row.net_proceeds or 0) * 100)) for row in AuctionSale.query.all())
    recent_sale = AuctionSale.query.order_by(AuctionSale.sale_date.desc(), AuctionSale.id.desc()).first()

    return jsonify({
        "active_profile": {
            "id": profile.id if profile else None,
            "name": profile.name if profile else None,
            "role": profile.role if profile else None,
            "avatar_url": _avatar_url(profile.avatar_path) if profile else None,
        },
        "family_name": setting.family_name if setting and setting.family_name else None,
        "counts": counts,
        "month_total": month_total_cents / 100.0,
        "active_projects": project_cards,
        "upcoming_shows": [
            {
                "id": show.id,
                "name": show.name,
                "date": _iso(show.start_date),
                "location": show.location,
            }
            for show in upcoming_shows
        ],
        "recent_expenses": recent_expenses,
        "recent_activity": recent_activity[:10],
        "low_feed_inventory": low_feed_inventory,
        "recent_feed_events": recent_feed_events,
        "finance_summary": {
            "total_spent": total_spent_cents / 100.0,
            "total_income": total_income_cents / 100.0,
            "net_balance": (total_income_cents - total_spent_cents) / 100.0,
            "recent_sale": _auction_payload(recent_sale) if recent_sale else None,
        },
    })

def _show_day_payload(show_day: ShowDay) -> dict[str, object]:
    return {
        "id": show_day.id,
        "show_id": show_day.show_id,
        "day_number": show_day.day_number,
        "label": show_day.label,
        "show_date": _iso(show_day.date),
        "date": _iso(show_day.date),
        "notes": show_day.notes,
        "created_at": _iso(show_day.created_at),
    }


def _show_day_task_payload(task: ShowDayTask) -> dict[str, object]:
    return {
        "id": task.id,
        "show_day_id": task.show_day_id,
        "project_id": task.project_id,
        "task_key": task.task_key,
        "task_label": task.task_label,
        "is_completed": bool(task.is_completed),
        "completed_at": _iso(task.completed_at),
        "notes": task.notes,
    }


def _placing_payload(placing: Placing) -> dict[str, object]:
    return {
        "id": placing.id,
        "entry_id": placing.entry_id,
        "show_id": placing.show_id,
        "show_day_id": placing.show_day_id,
        "project_id": placing.project_id,
        "class_name": placing.class_name,
        "ring": placing.ring,
        "placing": placing.placing,
        "ribbon_type": placing.ribbon_type,
        "points": placing.points,
        "judge": placing.judge,
        "notes": placing.notes,
        "placed_at": _iso(placing.placed_at),
        "photo_url": placing.photo_url,
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
        "timeline_entry_id": item.timeline_entry_id,
        "placing_id": item.placing_id,
        "show_id": item.show_id,
        "show_day_id": item.show_day_id,
        "kind": item.kind,
        "file_name": item.file_name,
        "file_url": item.url,
        "url": item.url,
        "caption": item.caption,
        "created_at": _iso(item.created_at),
    }


def _project_task_payload(task: ProjectTask) -> dict[str, object]:
    return {
        "id": task.id,
        "project_id": task.project_id,
        "title": task.title,
        "due_date": _iso(task.due_date),
        "is_daily": bool(task.is_daily),
        "is_completed": bool(task.is_completed),
        "completed_at": _iso(task.completed_at),
        "created_at": _iso(task.created_at),
        "updated_at": _iso(task.updated_at),
    }


def _weight_entry_payload(entry: WeightEntry) -> dict[str, object]:
    return {"id": entry.id, "project_id": entry.project_id, "recorded_at": _iso(entry.recorded_at), "weight_lbs": entry.weight_lbs, "notes": entry.notes}


def _health_entry_payload(entry: HealthEntry) -> dict[str, object]:
    return {
        "id": entry.id,
        "project_id": entry.project_id,
        "recorded_at": _iso(entry.recorded_at),
        "category": entry.category,
        "description": entry.description,
        "cost_cents": entry.cost_cents,
        "cost": (entry.cost_cents / 100.0) if entry.cost_cents is not None else None,
        "vendor": entry.vendor,
        "attachment_receipt_url": entry.attachment_receipt_url,
    }


def _feed_entry_payload(entry: FeedEntry) -> dict[str, object]:
    inventory_item = FeedInventorySimple.query.get(entry.feed_inventory_item_id) if entry.feed_inventory_item_id else None
    return {
        "id": entry.id,
        "project_id": entry.project_id,
        "recorded_at": _iso(entry.recorded_at),
        "feed_type": entry.feed_type,
        "amount": entry.amount,
        "unit": entry.unit,
        "cost_cents": entry.cost_cents,
        "cost": (entry.cost_cents / 100.0) if entry.cost_cents is not None else None,
        "feed_inventory_item_id": entry.feed_inventory_item_id,
        "feed_inventory_item_name": inventory_item.name if inventory_item else None,
        "notes": entry.notes,
    }


def _feed_inventory_payload(item: FeedInventorySimple) -> dict[str, object]:
    threshold = item.low_stock_threshold
    low_stock = bool(threshold is not None and item.qty_on_hand <= threshold)
    return {
        "id": item.id,
        "name": item.name,
        "brand": item.brand,
        "category": item.category,
        "unit": item.unit,
        "qty_on_hand": item.qty_on_hand,
        "low_stock_threshold": threshold,
        "low_stock": low_stock,
        "notes": item.notes,
        "is_active": bool(item.is_active),
        "created_at": _iso(item.created_at),
        "updated_at": _iso(item.updated_at),
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
@api_bp.post('/shows/<int:show_id>/day')
def api_show_day_create(show_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Show.query.get_or_404(show_id)
    payload = request.get_json(silent=True) or {}
    count = ShowDay.query.filter_by(show_id=show_id).count()
    day = ShowDay(show_id=show_id, day_number=count + 1, label=payload.get('label') or f'Day {count + 1}', notes=payload.get('notes'), date=date.fromisoformat(payload['show_date']) if payload.get('show_date') else (date.fromisoformat(payload['date']) if payload.get('date') else None))
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
@api_bp.post('/shows/<int:show_id>/entry')
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


@api_bp.post("/uploads/profile-avatar")
def api_upload_profile_avatar():
    profile = _active_profile()
    if profile is None:
        return jsonify({"error": "No active profile"}), 401

    file = request.files.get("file")
    _, validation_error = _validate_upload(file, ("image/",))
    if validation_error:
        return validation_error

    filename, save_error = _save_file(file, "profiles")
    if save_error:
        return save_error

    profile.avatar_path = filename
    db.session.commit()
    return jsonify({"url": f"/uploads/{filename}", "profile_id": profile.id})


@api_bp.post("/uploads/project-hero")
def api_upload_project_hero():
    _, error = _require_parent_unlocked()
    if error:
        return error

    project_id = request.form.get("project_id", type=int)
    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    project = Project.query.get_or_404(project_id)
    file = request.files.get("file")
    _, validation_error = _validate_upload(file, ("image/",))
    if validation_error:
        return validation_error

    filename, save_error = _save_file(file, "projects")
    if save_error:
        return save_error

    project.photo_path = filename
    project.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"url": f"/uploads/{filename}", "project_id": project.id})


@api_bp.post("/uploads/receipt")
def api_upload_receipt():
    _, error = _require_parent_unlocked()
    if error:
        return error

    expense_id = request.form.get("expense_id", type=int)
    if not expense_id:
        return jsonify({"error": "expense_id is required"}), 400

    expense = Expense.query.get_or_404(expense_id)
    file = request.files.get("file")
    _, validation_error = _validate_upload(file, ("image/",), {"application/pdf"})
    if validation_error:
        return validation_error

    filename, save_error = _save_file(file, "receipts")
    if save_error:
        return save_error

    receipt = ExpenseReceipt(
        expense_id=expense.id,
        file_name=filename,
        url=f"/uploads/{filename}",
        caption=(request.form.get("caption") or None),
    )
    expense.receipt_url = receipt.url
    db.session.add(receipt)
    db.session.commit()
    return jsonify({"url": receipt.url, "receipt": _receipt_payload(receipt)})


@api_bp.post("/uploads/project-media")
def api_upload_project_media():
    _, error = _require_parent_unlocked()
    if error:
        return error

    project_id = request.form.get("project_id", type=int)
    if not project_id:
        return jsonify({"error": "project_id is required"}), 400

    Project.query.get_or_404(project_id)
    file = request.files.get("file")
    safe_name, validation_error = _validate_upload(file, ("image/", "video/"))
    if validation_error:
        return validation_error

    filename, save_error = _save_file(file, "media")
    if save_error:
        return save_error

    media = Media(
        project_id=project_id,
        kind="project",
        file_name=safe_name or filename,
        url=f"/uploads/{filename}",
        caption=(request.form.get("caption") or None),
    )
    db.session.add(media)
    db.session.commit()
    return jsonify({"url": media.url, "media": _media_payload(media)})


@api_bp.post('/media/upload')
def api_media_upload():
    _, error = _require_parent_unlocked()
    if error:
        return error
    file = request.files.get('file')
    try:
        filename = save_upload(file, current_app.config['UPLOAD_DIR'])
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400
    media = Media(project_id=int(request.form['project_id']) if request.form.get('project_id') else None, timeline_entry_id=int(request.form['timeline_entry_id']) if request.form.get('timeline_entry_id') else None, placing_id=int(request.form['placing_id']) if request.form.get('placing_id') else None, show_id=int(request.form['show_id']) if request.form.get('show_id') else None, show_day_id=int(request.form['show_day_id']) if request.form.get('show_day_id') else None, kind=request.form.get('kind') or 'project', file_name=filename, url=f"/uploads/{filename}", caption=request.form.get('caption'))
    db.session.add(media)
    db.session.commit()
    return jsonify(_media_payload(media)), 201


@api_bp.get('/media')
def api_media_list():
    query = Media.query
    for key in ['project_id', 'show_id', 'show_day_id', 'placing_id', 'timeline_entry_id']:
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
@api_bp.get('/shows/<int:show_id>/days')
def api_show_days(show_id: int):
    Show.query.get_or_404(show_id)
    days = ShowDay.query.filter_by(show_id=show_id).order_by(ShowDay.day_number.asc(), ShowDay.id.asc()).all()
    return jsonify([_show_day_payload(day) for day in days])


@api_bp.patch('/show-days/<int:show_day_id>')
def api_show_day_update(show_day_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    show_day = ShowDay.query.get_or_404(show_day_id)
    payload = request.get_json(silent=True) or {}
    if 'label' in payload:
        show_day.label = payload['label']
    if 'notes' in payload:
        show_day.notes = payload['notes']
    if 'show_date' in payload:
        show_day.date = date.fromisoformat(payload['show_date']) if payload['show_date'] else None
    if 'date' in payload:
        show_day.date = date.fromisoformat(payload['date']) if payload['date'] else None
    db.session.commit()
    return jsonify(_show_day_payload(show_day))


@api_bp.get('/show-days/<int:show_day_id>/tasks')
def api_show_day_tasks(show_day_id: int):
    ShowDay.query.get_or_404(show_day_id)
    tasks = ShowDayTask.query.filter_by(show_day_id=show_day_id).order_by(ShowDayTask.id.asc()).all()
    return jsonify([_show_day_task_payload(task) for task in tasks])


@api_bp.post('/show-days/<int:show_day_id>/tasks')
def api_show_day_tasks_create(show_day_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    ShowDay.query.get_or_404(show_day_id)
    payload = request.get_json(silent=True) or {}
    project_id = payload.get('project_id')
    task_key = str(payload.get('task_key') or '').strip()
    task_label = str(payload.get('task_label') or '').strip()
    if not project_id or not task_key or not task_label:
        return jsonify({'error': 'project_id, task_key, and task_label are required'}), 400
    task = ShowDayTask(show_day_id=show_day_id, project_id=int(project_id), task_key=task_key, task_label=task_label, is_completed=bool(payload.get('is_completed', False)), completed_at=datetime.utcnow() if payload.get('is_completed') else None, notes=payload.get('notes'))
    db.session.add(task)
    db.session.commit()
    return jsonify(_show_day_task_payload(task)), 201


@api_bp.patch('/show-day-tasks/<int:task_id>')
def api_show_day_tasks_update(task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    task = ShowDayTask.query.get_or_404(task_id)
    payload = request.get_json(silent=True) or {}
    for key in ['task_key', 'task_label', 'notes']:
        if key in payload:
            setattr(task, key, payload[key])
    if 'is_completed' in payload:
        task.is_completed = bool(payload['is_completed'])
        task.completed_at = datetime.utcnow() if task.is_completed else None
    db.session.commit()
    return jsonify(_show_day_task_payload(task))


@api_bp.delete('/show-day-tasks/<int:task_id>')
def api_show_day_tasks_delete(task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    db.session.delete(ShowDayTask.query.get_or_404(task_id))
    db.session.commit()
    return jsonify({'success': True})


@api_bp.get('/projects/<int:project_id>/placings')
def api_project_placings(project_id: int):
    Project.query.get_or_404(project_id)
    placings = Placing.query.filter_by(project_id=project_id).order_by(Placing.created_at.desc(), Placing.id.desc()).all()
    return jsonify([_placing_payload(item) for item in placings])


@api_bp.get('/shows/<int:show_id>/placings')
def api_show_placings(show_id: int):
    Show.query.get_or_404(show_id)
    placings = Placing.query.filter_by(show_id=show_id).order_by(Placing.created_at.desc(), Placing.id.desc()).all()
    return jsonify([_placing_payload(item) for item in placings])


@api_bp.post('/placings')
@api_bp.post('/shows/<int:show_id>/placing')
def api_placings_create_v2(show_id: int | None = None):
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    show_id = show_id or payload.get('show_id')
    project_id = payload.get('project_id')
    placing_value = str(payload.get('placing') or '').strip()
    if not show_id or not project_id or not placing_value:
        return jsonify({'error': 'show_id, project_id, and placing are required'}), 400
    entry = ShowEntry.query.filter_by(show_id=int(show_id), project_id=int(project_id)).first()
    if not entry:
        entry = ShowEntry(show_id=int(show_id), project_id=int(project_id), class_name=payload.get('class_name'), division=payload.get('division'), notes=payload.get('notes'))
        db.session.add(entry)
        db.session.flush()
    placing = Placing(entry_id=entry.id, show_id=int(show_id), show_day_id=int(payload['show_day_id']) if payload.get('show_day_id') else None, project_id=int(project_id), class_name=payload.get('class_name'), ring=payload.get('ring'), placing=placing_value, ribbon_type=payload.get('ribbon_type'), points=float(payload['points']) if payload.get('points') not in (None, '') else None, judge=payload.get('judge'), notes=payload.get('notes'), placed_at=datetime.fromisoformat(payload['placed_at']) if payload.get('placed_at') else None, photo_url=payload.get('photo_url'))
    db.session.add(placing)
    db.session.commit()
    return jsonify(_placing_payload(placing)), 201


@api_bp.get('/projects/<int:project_id>/media')
def api_project_media(project_id: int):
    Project.query.get_or_404(project_id)
    rows = Media.query.filter_by(project_id=project_id).order_by(Media.created_at.desc(), Media.id.desc()).all()
    return jsonify([_media_payload(item) for item in rows])


@api_bp.post('/projects/<int:project_id>/media')
def api_project_media_create(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    file = request.files.get('file')
    try:
        filename = save_upload(file, current_app.config['UPLOAD_DIR'])
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400
    media = Media(project_id=project_id, kind=request.form.get('kind') or 'project', file_name=filename, url=f"/uploads/{filename}", caption=request.form.get('caption'))
    db.session.add(media)
    db.session.commit()
    return jsonify(_media_payload(media)), 201


@api_bp.get('/placings/<int:placing_id>/media')
def api_placing_media(placing_id: int):
    Placing.query.get_or_404(placing_id)
    rows = Media.query.filter_by(placing_id=placing_id).order_by(Media.created_at.desc(), Media.id.desc()).all()
    return jsonify([_media_payload(item) for item in rows])


@api_bp.post('/placings/<int:placing_id>/media')
def api_placing_media_create(placing_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    placing = Placing.query.get_or_404(placing_id)
    file = request.files.get('file')
    try:
        filename = save_upload(file, current_app.config['UPLOAD_DIR'])
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400
    media = Media(project_id=placing.project_id, placing_id=placing_id, show_id=placing.show_id, show_day_id=placing.show_day_id, kind='placing', file_name=filename, url=f"/uploads/{filename}", caption=request.form.get('caption'))
    db.session.add(media)
    db.session.commit()
    return jsonify(_media_payload(media)), 201


@api_bp.get('/tasks')
def api_tasks():
    query = ProjectTask.query
    for key in ['project_id']:
        value = request.args.get(key)
        if value:
            query = query.filter(getattr(ProjectTask, key) == int(value))
    status = request.args.get('status')
    if status == 'done':
        query = query.filter(ProjectTask.is_completed.is_(True))
    elif status == 'open':
        query = query.filter(ProjectTask.is_completed.is_(False))
    due_before = request.args.get('due_before')
    due_after = request.args.get('due_after')
    if due_before:
        query = query.filter(ProjectTask.due_date <= date.fromisoformat(due_before))
    if due_after:
        query = query.filter(ProjectTask.due_date >= date.fromisoformat(due_after))
    tasks = query.order_by(ProjectTask.is_completed.asc(), ProjectTask.due_date.asc().nulls_last(), ProjectTask.id.desc()).all()
    return jsonify([_project_task_payload(task) for task in tasks])


@api_bp.post('/tasks')
def api_task_create():
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    title = str(payload.get('title', '')).strip()
    project_id = payload.get('project_id')
    if not title or project_id is None:
        return jsonify({'error': 'title and project_id are required'}), 400
    now = datetime.utcnow()
    task = ProjectTask(project_id=int(project_id), title=title, due_date=date.fromisoformat(payload['due_date']) if payload.get('due_date') else None, is_daily=(payload.get('recurrence') == 'daily' or bool(payload.get('is_daily', False))), is_completed=(payload.get('status') == 'done' or bool(payload.get('is_completed', False))), completed_at=now if (payload.get('status') == 'done' or payload.get('is_completed')) else None, created_at=now, updated_at=now)
    db.session.add(task)
    db.session.commit()
    return jsonify(_project_task_payload(task)), 201


@api_bp.get('/tasks/<int:task_id>')
def api_task_detail(task_id: int):
    return jsonify(_project_task_payload(ProjectTask.query.get_or_404(task_id)))


@api_bp.patch('/tasks/<int:task_id>')
def api_task_update(task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    task = ProjectTask.query.get_or_404(task_id)
    payload = request.get_json(silent=True) or {}
    if 'title' in payload:
        task.title = str(payload.get('title') or '').strip()
    if 'project_id' in payload and payload['project_id'] is not None:
        task.project_id = int(payload['project_id'])
    if 'due_date' in payload:
        task.due_date = date.fromisoformat(payload['due_date']) if payload['due_date'] else None
    if 'recurrence' in payload:
        task.is_daily = payload.get('recurrence') == 'daily'
    if 'is_daily' in payload:
        task.is_daily = bool(payload['is_daily'])
    if 'status' in payload:
        task.is_completed = payload['status'] == 'done'
    if 'is_completed' in payload:
        task.is_completed = bool(payload['is_completed'])
    task.completed_at = datetime.utcnow() if task.is_completed else None
    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_project_task_payload(task))


@api_bp.delete('/tasks/<int:task_id>')
def api_task_delete(task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    db.session.delete(ProjectTask.query.get_or_404(task_id))
    db.session.commit()
    return jsonify({'success': True})


@api_bp.post('/tasks/<int:task_id>/toggle')
def api_task_toggle(task_id: int):
    profile = _active_profile()
    if profile is None:
        return jsonify({'error': 'No active profile'}), 401
    task = ProjectTask.query.get_or_404(task_id)
    if profile.role == 'parent':
        if not _is_unlocked():
            return jsonify({'error': 'Parent PIN unlock required'}), 403
    task.is_completed = not bool(task.is_completed)
    task.completed_at = datetime.utcnow() if task.is_completed else None
    task.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_project_task_payload(task))


@api_bp.get('/projects/<int:project_id>/tasks')
def api_project_tasks_v2(project_id: int):
    Project.query.get_or_404(project_id)
    tasks = ProjectTask.query.filter_by(project_id=project_id).order_by(ProjectTask.is_completed.asc(), ProjectTask.due_date.asc().nulls_last(), ProjectTask.id.desc()).all()
    return jsonify([_project_task_payload(item) for item in tasks])


@api_bp.post('/projects/<int:project_id>/tasks')
def api_project_task_create_v2(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    payload = request.get_json(silent=True) or {}
    title = str(payload.get('title', '')).strip()
    if not title:
        return jsonify({'error': 'title is required'}), 400
    now = datetime.utcnow()
    item = ProjectTask(project_id=project_id, title=title, due_date=date.fromisoformat(payload['due_date']) if payload.get('due_date') else None, is_daily=bool(payload.get('is_daily', False)), is_completed=bool(payload.get('is_completed', False)), completed_at=now if payload.get('is_completed') else None, created_at=now, updated_at=now)
    db.session.add(item)
    db.session.commit()
    return jsonify(_project_task_payload(item)), 201


@api_bp.post('/projects/<int:project_id>/tasks/<int:task_id>/complete')
def api_project_task_complete(project_id: int, task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    item = ProjectTask.query.filter_by(id=task_id, project_id=project_id).first_or_404()
    item.is_completed = True
    item.completed_at = datetime.utcnow()
    item.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_project_task_payload(item))


@api_bp.post('/projects/<int:project_id>/tasks/<int:task_id>/uncomplete')
def api_project_task_uncomplete(project_id: int, task_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)
    item = ProjectTask.query.filter_by(id=task_id, project_id=project_id).first_or_404()
    item.is_completed = False
    item.completed_at = None
    item.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_project_task_payload(item))


@api_bp.get('/projects/<int:project_id>/weights')
def api_project_weights(project_id: int):
    Project.query.get_or_404(project_id)
    rows = WeightEntry.query.filter_by(project_id=project_id).order_by(WeightEntry.recorded_at.desc(), WeightEntry.id.desc()).all()
    return jsonify([_weight_entry_payload(item) for item in rows])


@api_bp.post('/projects/<int:project_id>/weights')
def api_project_weights_create(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    if payload.get('weight_lbs') is None or not payload.get('recorded_at'):
        return jsonify({'error': 'recorded_at and weight_lbs are required'}), 400
    row = WeightEntry(project_id=project_id, recorded_at=date.fromisoformat(payload['recorded_at']), weight_lbs=float(payload['weight_lbs']), notes=(payload.get('notes') or None))
    db.session.add(row)
    db.session.commit()
    return jsonify(_weight_entry_payload(row)), 201


@api_bp.delete('/weights/<int:entry_id>')
def api_project_weights_delete(entry_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = WeightEntry.query.get_or_404(entry_id)
    db.session.delete(row)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.get('/projects/<int:project_id>/health')
def api_project_health(project_id: int):
    Project.query.get_or_404(project_id)
    rows = HealthEntry.query.filter_by(project_id=project_id).order_by(HealthEntry.recorded_at.desc(), HealthEntry.id.desc()).all()
    return jsonify([_health_entry_payload(item) for item in rows])


@api_bp.post('/projects/<int:project_id>/health')
def api_project_health_create(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    if not payload.get('recorded_at') or not str(payload.get('category') or '').strip() or not str(payload.get('description') or '').strip():
        return jsonify({'error': 'recorded_at, category, and description are required'}), 400
    cents = None
    if payload.get('cost') not in [None, '']:
        cents = int(round(float(payload.get('cost')) * 100))
    elif payload.get('cost_cents') is not None:
        cents = int(payload.get('cost_cents'))
    row = HealthEntry(project_id=project_id, recorded_at=date.fromisoformat(payload['recorded_at']), category=str(payload['category']).strip(), description=str(payload['description']).strip(), cost_cents=cents, vendor=(str(payload.get('vendor')).strip() if payload.get('vendor') else None), attachment_receipt_url=(str(payload.get('attachment_receipt_url')).strip() if payload.get('attachment_receipt_url') else None))
    db.session.add(row)
    db.session.commit()
    return jsonify(_health_entry_payload(row)), 201


@api_bp.delete('/health/<int:entry_id>')
def api_project_health_delete(entry_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = HealthEntry.query.get_or_404(entry_id)
    db.session.delete(row)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.get('/projects/<int:project_id>/feed')
def api_project_feed(project_id: int):
    Project.query.get_or_404(project_id)
    rows = FeedEntry.query.filter_by(project_id=project_id).order_by(FeedEntry.recorded_at.desc(), FeedEntry.id.desc()).all()
    return jsonify([_feed_entry_payload(item) for item in rows])


@api_bp.post('/projects/<int:project_id>/feed')
def api_project_feed_create(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    if not payload.get('recorded_at') or payload.get('amount') is None or not str(payload.get('unit') or '').strip():
        return jsonify({'error': 'recorded_at, amount, and unit are required'}), 400
    inventory_item = None
    if payload.get('feed_inventory_item_id') not in (None, ''):
        inventory_item = FeedInventorySimple.query.get(int(payload.get('feed_inventory_item_id')))
        if inventory_item is None:
            return jsonify({'error': 'feed_inventory_item_id is invalid'}), 400
    feed_type = str(payload.get('feed_type') or '').strip() or (inventory_item.name if inventory_item else '')
    if not feed_type:
        return jsonify({'error': 'feed_type is required when no inventory item is selected'}), 400
    amount = float(payload['amount'])
    if amount <= 0:
        return jsonify({'error': 'amount must be greater than 0'}), 400
    cents = None
    if payload.get('cost') not in [None, '']:
        cents = int(round(float(payload.get('cost')) * 100))
    elif payload.get('cost_cents') is not None:
        cents = int(payload.get('cost_cents'))
    row = FeedEntry(project_id=project_id, recorded_at=date.fromisoformat(payload['recorded_at']), feed_type=feed_type, amount=amount, unit=str(payload['unit']).strip(), cost_cents=cents, feed_inventory_item_id=(inventory_item.id if inventory_item else None), notes=(str(payload.get('notes')).strip() if payload.get('notes') else None))

    if inventory_item is not None and payload.get('decrement_inventory', True):
        inventory_item.qty_on_hand = max(0.0, float(inventory_item.qty_on_hand) - amount)
        inventory_item.updated_at = datetime.utcnow()

    timeline_title = f"Fed {feed_type}"
    timeline_note = f"{amount:g} {str(payload['unit']).strip()}"
    if row.notes:
        timeline_note = f"{timeline_note} • {row.notes}"
    timeline_row = TimelineEntry(project_id=project_id, type='feed', title=timeline_title, description=timeline_note, date=row.recorded_at, created_at=datetime.utcnow())

    db.session.add(row)
    db.session.add(timeline_row)
    db.session.commit()
    return jsonify(_feed_entry_payload(row)), 201


@api_bp.delete('/feed-entries/<int:entry_id>')
def api_project_feed_delete(entry_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = FeedEntry.query.get_or_404(entry_id)
    db.session.delete(row)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.get('/projects/<int:project_id>/care')
def api_project_care(project_id: int):
    Project.query.get_or_404(project_id)
    rows = TimelineEntry.query.filter_by(project_id=project_id).order_by(TimelineEntry.date.desc(), TimelineEntry.id.desc()).all()
    filtered = [row for row in rows if (row.type or '').strip().lower() in CARE_CATEGORY_LABELS]
    return jsonify([_care_entry_payload(row) for row in filtered])


@api_bp.post('/projects/<int:project_id>/care')
def api_project_care_create(project_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    Project.query.get_or_404(project_id)

    payload = request.get_json(silent=True) or {}
    category = str(payload.get('category') or '').strip().lower()
    recorded_at_raw = str(payload.get('recorded_at') or '').strip()
    if category not in CARE_CATEGORY_LABELS:
        return jsonify({'error': 'category must be one of: ' + ', '.join(CARE_CATEGORY_LABELS.keys())}), 400
    if not recorded_at_raw:
        return jsonify({'error': 'recorded_at is required'}), 400

    recorded_at = date.fromisoformat(recorded_at_raw)
    notes = str(payload.get('notes') or '').strip() or None
    title = str(payload.get('title') or CARE_CATEGORY_LABELS[category]).strip()
    row = TimelineEntry(
        project_id=project_id,
        type=category,
        title=title,
        description=notes,
        date=recorded_at,
        created_at=datetime.utcnow(),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(_care_entry_payload(row)), 201


@api_bp.get('/feed-inventory')
def api_feed_inventory_list_v2():
    rows = FeedInventorySimple.query.filter(FeedInventorySimple.is_active.is_(True)).order_by(FeedInventorySimple.name.asc(), FeedInventorySimple.id.asc()).all()
    return jsonify([_feed_inventory_payload(item) for item in rows])


@api_bp.get('/feed')
def api_feed_inventory_list_alias():
    return api_feed_inventory_list_v2()


@api_bp.post('/feed-inventory')
def api_feed_inventory_create_v2():
    _, error = _require_parent_unlocked()
    if error:
        return error
    payload = request.get_json(silent=True) or {}
    name = str(payload.get('name') or '').strip()
    unit = str(payload.get('unit') or '').strip()
    if not name or not unit:
        return jsonify({'error': 'name and unit are required'}), 400
    threshold_value = payload.get('low_stock_threshold')
    row = FeedInventorySimple(
        name=name,
        brand=(str(payload.get('brand')).strip() if payload.get('brand') else None),
        category=(str(payload.get('category')).strip() if payload.get('category') else None),
        unit=unit,
        qty_on_hand=float(payload.get('qty_on_hand') or 0),
        low_stock_threshold=(float(threshold_value) if threshold_value not in (None, '') else None),
        notes=(str(payload.get('notes')).strip() if payload.get('notes') else None),
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(_feed_inventory_payload(row)), 201


@api_bp.post('/feed')
def api_feed_inventory_create_alias():
    return api_feed_inventory_create_v2()


@api_bp.patch('/feed-inventory/<int:item_id>')
def api_feed_inventory_update_v2(item_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = FeedInventorySimple.query.get_or_404(item_id)
    payload = request.get_json(silent=True) or {}
    if 'name' in payload:
        row.name = str(payload['name']).strip()
    if 'brand' in payload:
        row.brand = (str(payload['brand']).strip() or None) if payload['brand'] is not None else None
    if 'category' in payload:
        row.category = (str(payload['category']).strip() or None) if payload['category'] is not None else None
    if 'unit' in payload:
        row.unit = str(payload['unit']).strip()
    if 'qty_on_hand' in payload:
        row.qty_on_hand = float(payload['qty_on_hand'])
    if 'low_stock_threshold' in payload:
        value = payload.get('low_stock_threshold')
        row.low_stock_threshold = float(value) if value not in (None, '') else None
    if 'notes' in payload:
        row.notes = (str(payload.get('notes')).strip() or None) if payload.get('notes') is not None else None
    if 'is_active' in payload:
        row.is_active = bool(payload.get('is_active'))
    row.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_feed_inventory_payload(row))


@api_bp.patch('/feed/<int:item_id>')
def api_feed_inventory_update_alias(item_id: int):
    return api_feed_inventory_update_v2(item_id)


@api_bp.delete('/feed/<int:item_id>')
def api_feed_inventory_delete(item_id: int):
    _, error = _require_parent_unlocked()
    if error:
        return error
    row = FeedInventorySimple.query.get_or_404(item_id)
    in_use = FeedEntry.query.filter_by(feed_inventory_item_id=row.id).first() is not None
    if in_use:
        row.is_active = False
        row.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'soft_deleted': True})
    db.session.delete(row)
    db.session.commit()
    return jsonify({'success': True, 'soft_deleted': False})


@api_bp.get('/reports/project-record-book/<int:project_id>')
def api_project_record_book(project_id: int):
    project = Project.query.get_or_404(project_id)
    owner = Profile.query.get(project.owner_id)
    expenses = Expense.query.filter_by(project_id=project_id).all()
    feed_rows = FeedEntry.query.filter_by(project_id=project_id).all()
    health_rows = HealthEntry.query.filter_by(project_id=project_id).all()
    task_rows = ProjectTask.query.filter_by(project_id=project_id).all()
    timeline_rows = TimelineEntry.query.filter_by(project_id=project_id).all()
    show_entries = ShowEntry.query.filter_by(project_id=project_id).all()
    show_ids = [item.show_id for item in show_entries]
    shows = Show.query.filter(Show.id.in_(show_ids)).all() if show_ids else []
    placings = Placing.query.filter_by(project_id=project_id).all()
    media_count = Media.query.filter_by(project_id=project_id).count()
    return jsonify({
        'project': _project_payload(project),
        'owner': {'id': owner.id, 'name': owner.name, 'role': owner.role} if owner else None,
        'expenses': {'count': len(expenses), 'total_cents': sum(int(round(float(x.amount) * 100)) for x in expenses), 'total': sum(float(x.amount) for x in expenses)},
        'feed': {'count': len(feed_rows), 'total_cents': sum(int(x.cost_cents or 0) for x in feed_rows), 'total': sum(int(x.cost_cents or 0) for x in feed_rows) / 100.0},
        'health': {'count': len(health_rows), 'total_cents': sum(int(x.cost_cents or 0) for x in health_rows), 'total': sum(int(x.cost_cents or 0) for x in health_rows) / 100.0},
        'tasks': {'completed': sum(1 for item in task_rows if item.is_completed), 'open': sum(1 for item in task_rows if not item.is_completed), 'total': len(task_rows)},
        'timeline': {'count': len(timeline_rows), 'entries': [_timeline_payload(item) for item in sorted(timeline_rows, key=lambda item: (item.date, item.id), reverse=True)[:25]]},
        'shows': {'count': len(shows), 'items': [_show_payload(item) for item in shows]},
        'placings': {'count': len(placings), 'items': [_placing_payload(item) for item in placings]},
        'ribbons': {'count': len([item for item in placings if item.ribbon_type])},
        'media': {'count': media_count},
    })


@api_bp.get('/reports/family-season-summary')
def api_family_season_summary():
    profiles = Profile.query.filter_by(archived=False).all()
    projects = Project.query.all()
    project_map = {item.id: item for item in projects}
    by_kid = []
    for profile in profiles:
        owned = [item for item in projects if item.owner_id == profile.id]
        project_ids = [item.id for item in owned]
        expenses_total_cents = 0
        for expense in Expense.query.all():
            for alloc in _allocation_rows_for_expense(expense):
                if alloc['project_id'] in project_ids:
                    expenses_total_cents += alloc['amount_cents']
        feed_total_cents = sum(int(item.cost_cents or 0) for item in FeedEntry.query.filter(FeedEntry.project_id.in_(project_ids)).all()) if project_ids else 0
        health_total_cents = sum(int(item.cost_cents or 0) for item in HealthEntry.query.filter(HealthEntry.project_id.in_(project_ids)).all()) if project_ids else 0
        entries = ShowEntry.query.filter(ShowEntry.project_id.in_(project_ids)).all() if project_ids else []
        placings = Placing.query.filter(Placing.project_id.in_(project_ids)).all() if project_ids else []
        by_kid.append({
            'profile_id': profile.id,
            'profile_name': profile.name,
            'project_count': len(owned),
            'expenses_total_cents': expenses_total_cents,
            'feed_total_cents': feed_total_cents,
            'health_total_cents': health_total_cents,
            'shows_count': len({item.show_id for item in entries}),
            'placings_count': len(placings),
            'ribbons_count': len([item for item in placings if item.ribbon_type]),
            'total_cents': expenses_total_cents + feed_total_cents + health_total_cents,
        })
    by_project = []
    for project in projects:
        placings = Placing.query.filter_by(project_id=project.id).all()
        by_project.append({
            'project_id': project.id,
            'project_name': project.name,
            'owner_profile_id': project.owner_id,
            'owner_name': next((p.name for p in profiles if p.id == project.owner_id), 'Unknown'),
            'expenses_total_cents': sum(row['amount_cents'] for expense in Expense.query.all() for row in _allocation_rows_for_expense(expense) if row['project_id'] == project.id),
            'feed_total_cents': sum(int(item.cost_cents or 0) for item in FeedEntry.query.filter_by(project_id=project.id).all()),
            'health_total_cents': sum(int(item.cost_cents or 0) for item in HealthEntry.query.filter_by(project_id=project.id).all()),
            'shows_count': ShowEntry.query.filter_by(project_id=project.id).count(),
            'placings_count': len(placings),
            'ribbons_count': len([item for item in placings if item.ribbon_type]),
        })
    totals = {
        'expenses_total_cents': sum(item['expenses_total_cents'] for item in by_project),
        'feed_total_cents': sum(item['feed_total_cents'] for item in by_project),
        'health_total_cents': sum(item['health_total_cents'] for item in by_project),
        'shows_count': sum(item['shows_count'] for item in by_project),
        'placings_count': sum(item['placings_count'] for item in by_project),
    }
    totals['grand_total_cents'] = totals['expenses_total_cents'] + totals['feed_total_cents'] + totals['health_total_cents']
    return jsonify({'totals': totals, 'by_kid': by_kid, 'by_project': by_project})


@api_bp.get('/reports/summary')
def api_reports_summary():
    start_raw = request.args.get('start_date')
    end_raw = request.args.get('end_date')
    start = date.fromisoformat(start_raw) if start_raw else None
    end = date.fromisoformat(end_raw) if end_raw else None

    projects = Project.query.order_by(Project.name.asc()).all()
    project_rows = {p.id: {
        'project_id': p.id,
        'project_name': p.name,
        'expenses_total_cents': 0,
        'health_total_cents': 0,
        'feed_total_cents': 0,
        'shows_count': 0,
        'entries_count': 0,
        'net_total_cents': 0,
    } for p in projects}

    expense_query = Expense.query
    if start:
        expense_query = expense_query.filter(Expense.date >= start)
    if end:
        expense_query = expense_query.filter(Expense.date <= end)
    for expense in expense_query.all():
        for alloc in _allocation_rows_for_expense(expense):
            if alloc['project_id'] in project_rows:
                project_rows[alloc['project_id']]['expenses_total_cents'] += alloc['amount_cents']

    feed_query = FeedEntry.query
    if start:
        feed_query = feed_query.filter(FeedEntry.recorded_at >= start)
    if end:
        feed_query = feed_query.filter(FeedEntry.recorded_at <= end)
    for row in feed_query.all():
        if row.project_id in project_rows:
            project_rows[row.project_id]['feed_total_cents'] += int(row.cost_cents or 0)

    health_query = HealthEntry.query
    if start:
        health_query = health_query.filter(HealthEntry.recorded_at >= start)
    if end:
        health_query = health_query.filter(HealthEntry.recorded_at <= end)
    for row in health_query.all():
        if row.project_id in project_rows:
            project_rows[row.project_id]['health_total_cents'] += int(row.cost_cents or 0)

    shows = Show.query.all()
    for show in shows:
        in_range = True
        if start and show.start_date < start:
            in_range = False
        if end and show.start_date > end:
            in_range = False
        if not in_range:
            continue
        entries = ShowEntry.query.filter_by(show_id=show.id).all()
        for entry in entries:
            if entry.project_id in project_rows:
                project_rows[entry.project_id]['shows_count'] += 1
                project_rows[entry.project_id]['entries_count'] += 1

    result_rows = []
    overall = {'expenses_total_cents': 0, 'feed_total_cents': 0, 'health_total_cents': 0, 'shows_count': 0, 'entries_count': 0, 'grand_total_cents': 0}
    for row in project_rows.values():
        row['net_total_cents'] = row['expenses_total_cents'] + row['feed_total_cents'] + row['health_total_cents']
        result_rows.append({**row, 'expenses_total': row['expenses_total_cents']/100.0, 'feed_total': row['feed_total_cents']/100.0, 'health_total': row['health_total_cents']/100.0, 'net_total': row['net_total_cents']/100.0})
        overall['expenses_total_cents'] += row['expenses_total_cents']
        overall['feed_total_cents'] += row['feed_total_cents']
        overall['health_total_cents'] += row['health_total_cents']
        overall['shows_count'] += row['shows_count']
        overall['entries_count'] += row['entries_count']

    overall['grand_total_cents'] = overall['expenses_total_cents'] + overall['feed_total_cents'] + overall['health_total_cents']
    overall.update({'expenses_total': overall['expenses_total_cents']/100.0, 'feed_total': overall['feed_total_cents']/100.0, 'health_total': overall['health_total_cents']/100.0, 'grand_total': overall['grand_total_cents']/100.0})
    result_rows.sort(key=lambda item: item['project_name'])
    return jsonify({'start_date': start_raw, 'end_date': end_raw, 'projects': result_rows, 'overall': overall})


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
