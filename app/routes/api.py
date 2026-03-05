from __future__ import annotations

from datetime import date, datetime

from flask import Blueprint, jsonify, session
from sqlalchemy import func

from app.models import Expense, Photo, Profile, Project, ProjectActivity, Show, ShowEntry, Task, db

api_bp = Blueprint("api", __name__, url_prefix="/api")


def _iso(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return datetime.combine(value, datetime.min.time()).isoformat()


def _avatar_url(avatar_path: str | None) -> str | None:
    if not avatar_path:
        return None
    if avatar_path.startswith("http://") or avatar_path.startswith("https://"):
        return avatar_path
    return f"/uploads/{avatar_path}"


def _project_hero_image(project: Project) -> str | None:
    if not project.photo_path:
        return None
    if project.photo_path.startswith("http://") or project.photo_path.startswith("https://"):
        return project.photo_path
    return f"/uploads/{project.photo_path}"


@api_bp.get("/health")
def api_health():
    return jsonify({"status": "ok", "service": "project-barn-backend"})


@api_bp.get("/session")
def api_session():
    profile = None
    profile_id = session.get("active_profile_id")
    if profile_id:
        profile = Profile.query.get(profile_id)

    if profile is None:
        profile = Profile.query.order_by(Profile.id.asc()).first()

    return jsonify(
        {
            "active_profile": {
                "id": profile.id if profile else None,
                "name": profile.name if profile else None,
                "role": profile.role if profile else None,
                "avatar_url": _avatar_url(profile.avatar_path) if profile else None,
            },
            "family": {"id": None, "name": None},
        }
    )


@api_bp.get("/profiles")
def api_profiles():
    profiles = Profile.query.order_by(Profile.name.asc()).all()
    return jsonify(
        [
            {
                "id": profile.id,
                "name": profile.name,
                "role": profile.role,
                "avatar_url": _avatar_url(profile.avatar_path),
            }
            for profile in profiles
        ]
    )


@api_bp.get("/projects")
def api_projects():
    projects = Project.query.order_by(Project.created_at.desc()).all()

    owner_ids = {project.owner_id for project in projects}
    owners = {
        profile.id: profile
        for profile in Profile.query.filter(Profile.id.in_(owner_ids)).all()
    } if owner_ids else {}

    expense_totals = {
        row.project_id: float(row.total_cost or 0)
        for row in db.session.query(
            Expense.project_id,
            func.sum(Expense.amount).label("total_cost"),
        )
        .group_by(Expense.project_id)
        .all()
    }

    ribbon_counts = {
        row.project_id: int(row.ribbon_count or 0)
        for row in db.session.query(
            ShowEntry.project_id,
            func.count(ShowEntry.id).label("ribbon_count"),
        )
        .filter(ShowEntry.placing.isnot(None), ShowEntry.placing != "")
        .group_by(ShowEntry.project_id)
        .all()
    }

    expense_updates = {
        row.project_id: row.latest_date
        for row in db.session.query(
            Expense.project_id,
            func.max(Expense.date).label("latest_date"),
        )
        .group_by(Expense.project_id)
        .all()
    }

    activity_updates = {
        row.project_id: row.latest_date
        for row in db.session.query(
            ProjectActivity.project_id,
            func.max(ProjectActivity.date).label("latest_date"),
        )
        .group_by(ProjectActivity.project_id)
        .all()
    }

    payload = []
    for project in projects:
        owner = owners.get(project.owner_id)
        updated_candidates = [project.created_at, expense_updates.get(project.id), activity_updates.get(project.id)]
        updated_at = max((candidate for candidate in updated_candidates if candidate is not None), default=None)
        payload.append(
            {
                "id": project.id,
                "name": project.name,
                "animal_type": project.type,
                "owner_profile": {
                    "id": owner.id if owner else project.owner_id,
                    "name": owner.name if owner else "Unknown",
                },
                "hero_image_url": _project_hero_image(project),
                "updated_at": _iso(updated_at),
                "total_cost": expense_totals.get(project.id, 0),
                "ribbon_count": ribbon_counts.get(project.id, 0),
            }
        )

    return jsonify(payload)


@api_bp.get("/projects/<int:project_id>")
def api_project_detail(project_id: int):
    project = Project.query.get_or_404(project_id)
    owner = Profile.query.get(project.owner_id)

    total_cost = (
        db.session.query(func.sum(Expense.amount))
        .filter(Expense.project_id == project.id)
        .scalar()
    ) or 0
    expenses_count = Expense.query.filter_by(project_id=project.id).count()
    photos_count = Photo.query.filter_by(project_id=project.id).count()
    shows_count = (
        db.session.query(func.count(func.distinct(ShowEntry.show_id)))
        .filter(ShowEntry.project_id == project.id)
        .scalar()
    ) or 0

    activities = (
        ProjectActivity.query.filter_by(project_id=project.id)
        .order_by(ProjectActivity.date.desc(), ProjectActivity.id.desc())
        .limit(10)
        .all()
    )

    return jsonify(
        {
            "id": project.id,
            "name": project.name,
            "animal_type": project.type,
            "owner_profile": {
                "id": owner.id if owner else project.owner_id,
                "name": owner.name if owner else "Unknown",
            },
            "hero_image_url": _project_hero_image(project),
            "summary": {
                "total_cost": float(total_cost),
                "expenses_count": expenses_count,
                "photos_count": photos_count,
                "shows_count": int(shows_count),
            },
            "recent_activity": [
                {
                    "id": activity.id,
                    "date": _iso(activity.date),
                    "type": activity.title,
                    "note": activity.notes,
                }
                for activity in activities
            ],
        }
    )


@api_bp.get("/dashboard")
def api_dashboard():
    counts = {
        "projects": Project.query.count(),
        "profiles": Profile.query.count(),
        "expenses": Expense.query.count(),
        "shows": Show.query.count(),
        "tasks": Task.query.count(),
    }

    recent_items: list[dict[str, object]] = []

    for expense in Expense.query.order_by(Expense.date.desc(), Expense.id.desc()).limit(4).all():
        recent_items.append(
            {
                "kind": "expense",
                "label": f"Expense: ${expense.amount:.2f}",
                "date": _iso(expense.date),
                "project_id": expense.project_id,
            }
        )

    for activity in ProjectActivity.query.order_by(ProjectActivity.date.desc(), ProjectActivity.id.desc()).limit(4).all():
        recent_items.append(
            {
                "kind": "activity",
                "label": activity.title,
                "date": _iso(activity.date),
                "project_id": activity.project_id,
            }
        )

    for show in Show.query.order_by(Show.start_date.desc(), Show.id.desc()).limit(4).all():
        recent_items.append(
            {
                "kind": "show",
                "label": show.name,
                "date": _iso(show.start_date),
                "project_id": None,
            }
        )

    recent_activity = sorted(recent_items, key=lambda item: item.get("date") or "", reverse=True)[:10]

    upcoming = [
        {
            "kind": "show",
            "label": show.name,
            "date": _iso(show.start_date),
            "project_id": None,
        }
        for show in Show.query.filter(Show.start_date >= date.today()).order_by(Show.start_date.asc()).limit(5).all()
    ]

    return jsonify({"counts": counts, "recent_activity": recent_activity, "upcoming": upcoming})
