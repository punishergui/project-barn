from datetime import date, datetime, timedelta

from flask import Blueprint, current_app, jsonify, redirect, render_template, request, send_from_directory, session, url_for

from app import save_upload
from app.models import Expense, Photo, Profile, Project, Show, ShowDay, ShowDayCheck, ShowEntry, Task, db


dashboard_bp = Blueprint("dashboard", __name__)

TASK_ICONS = {
    "feed": "🌾",
    "water": "💧",
    "groom": "✂️",
    "walk": "🏃",
    "weigh": "⚖️",
    "show": "🏅",
    "note": "📝",
    "other": "📝",
}
PROJECT_EMOJI = {
    "cow": "🐄",
    "pig": "🐖",
    "goat": "🐐",
    "sheep": "🐑",
    "chicken": "🐔",
    "rabbit": "🐇",
    "baking": "🧁",
    "welding": "🔧",
    "other": "📋",
}
RIBBON_LABELS = {
    "blue": "Blue",
    "red": "Red",
    "white": "White",
    "yellow": "Yellow",
    "purple": "Purple",
    "grand": "Grand",
    "reserve": "Reserve",
}
SHOW_CHECK_ITEMS = [
    "Feed & Water",
    "Grooming",
    "Walk & Exercise",
    "Show Ring",
    "Notes",
]


@dashboard_bp.before_app_request
def require_session():
    if request.path.startswith("/static") or request.path.startswith("/profiles") or request.path.startswith("/uploads"):
        return
    if request.endpoint == "auth.logout":
        return
    if not session.get("active_profile_id"):
        return redirect(url_for("auth.profiles_page"))


def _show_total_days(show: Show) -> int:
    if show.end_date and show.end_date >= show.start_date:
        return (show.end_date - show.start_date).days + 1
    return 1


def _get_or_create_show_day(show: Show, day_num: int) -> ShowDay:
    show_day = ShowDay.query.filter_by(show_id=show.id, day_number=day_num).first()
    if not show_day:
        show_day = ShowDay(show_id=show.id, day_number=day_num)
        show_day.date = show.start_date + timedelta(days=day_num - 1)
        db.session.add(show_day)
        db.session.flush()

    existing = {check.item_name: check for check in ShowDayCheck.query.filter_by(show_day_id=show_day.id).all()}
    for item_name in SHOW_CHECK_ITEMS:
        if item_name not in existing:
            db.session.add(ShowDayCheck(show_day_id=show_day.id, item_name=item_name, completed=False))
    db.session.commit()
    return show_day


@dashboard_bp.get("/")
def dashboard_home():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    projects = Project.query.order_by(Project.name.asc()).all()
    shows_upcoming = Show.query.filter(Show.start_date >= date.today()).order_by(Show.start_date.asc()).all()
    upcoming_preview = shows_upcoming[:3]
    tasks_today = Task.query.order_by(Task.id.asc()).all()
    recent_activity = Task.query.filter(Task.logged_at.isnot(None)).order_by(Task.logged_at.desc()).limit(5).all()

    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 18 else "Good evening")
    profiles = {profile.id: profile for profile in Profile.query.all()}
    project_map = {project.id: project for project in projects}
    project_photos = {
        project.id: Photo.query.filter_by(project_id=project.id).order_by(Photo.uploaded_at.desc()).first()
        for project in projects
    }

    return render_template(
        "dashboard.html",
        active_profile=active_profile,
        projects=projects,
        tasks_today=tasks_today,
        shows_upcoming=shows_upcoming,
        upcoming_preview=upcoming_preview,
        greeting=greeting,
        profiles=profiles,
        task_icons=TASK_ICONS,
        recent_activity=recent_activity,
        project_map=project_map,
        project_photos=project_photos,
        today=date.today(),
    )


@dashboard_bp.post("/tasks/log")
def log_task():
    task_id = (request.get_json(silent=True) or {}).get("task_id")
    if not task_id:
        task_id = request.form.get("task_id", type=int)
    task = Task.query.get_or_404(task_id)

    task.logged_at = datetime.now()
    task.logged_by_id = session["active_profile_id"]
    db.session.commit()
    return redirect(url_for("dashboard.dashboard_home"))


@dashboard_bp.get("/projects")
def projects_list():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    projects = Project.query.order_by(Project.name.asc()).all()
    profiles = {profile.id: profile for profile in Profile.query.order_by(Profile.name.asc()).all()}
    project_photos = {
        project.id: Photo.query.filter_by(project_id=project.id).order_by(Photo.uploaded_at.desc()).first()
        for project in projects
    }
    return render_template(
        "projects_list.html",
        active_profile=active_profile,
        projects=projects,
        profiles=profiles,
        project_emoji=PROJECT_EMOJI,
        project_photos=project_photos,
        page_title="Projects",
    )


@dashboard_bp.route("/projects/add", methods=["GET", "POST"])
def project_add():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    profiles = Profile.query.order_by(Profile.name.asc()).all()

    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        if not name:
            return render_template(
                "project_add.html",
                active_profile=active_profile,
                profiles=profiles,
                error="Project name is required.",
                page_title="New Project",
                back_url=url_for("dashboard.dashboard_home"),
            )

        project = Project(
            name=name,
            type=request.form.get("type", "other"),
            owner_id=request.form.get("owner_id", type=int),
            breed=(request.form.get("breed") or "").strip() or None,
            purchase_price=request.form.get("purchase_price", type=float) or 0,
            notes=(request.form.get("notes") or "").strip() or None,
        )
        db.session.add(project)
        db.session.commit()
        return redirect(url_for("dashboard.project_detail", project_id=project.id))

    return render_template(
        "project_add.html",
        active_profile=active_profile,
        profiles=profiles,
        page_title="New Project",
        back_url=url_for("dashboard.dashboard_home"),
    )


@dashboard_bp.get("/projects/<int:project_id>")
def project_detail(project_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    project = Project.query.get_or_404(project_id)
    profiles = {profile.id: profile for profile in Profile.query.all()}

    tasks = Task.query.filter_by(project_id=project.id).order_by(Task.logged_at.desc().nullslast(), Task.id.desc()).all()
    expenses = Expense.query.filter_by(project_id=project.id).order_by(Expense.date.desc(), Expense.id.desc()).all()
    entries = ShowEntry.query.filter_by(project_id=project.id).order_by(ShowEntry.id.desc()).all()
    show_ids = [entry.show_id for entry in entries]
    shows = {show.id: show for show in Show.query.filter(Show.id.in_(show_ids)).all()} if show_ids else {}
    total_spent = sum(expense.amount for expense in expenses)
    tab = request.args.get("tab", "timeline")
    photos = Photo.query.filter_by(project_id=project.id).order_by(Photo.uploaded_at.desc()).all()

    return render_template(
        "project_detail.html",
        active_profile=active_profile,
        project=project,
        profiles=profiles,
        tasks=tasks,
        expenses=expenses,
        entries=entries,
        shows=shows,
        total_spent=total_spent,
        task_icons=TASK_ICONS,
        ribbon_labels=RIBBON_LABELS,
        project_emoji=PROJECT_EMOJI,
        photos=photos,
        tab=tab,
        hide_top_bar=True,
    )


@dashboard_bp.route("/projects/<int:project_id>/expenses/add", methods=["GET", "POST"])
def expense_add(project_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    project = Project.query.get_or_404(project_id)

    if request.method == "POST":
        expense = Expense(
            project_id=project.id,
            logged_by_id=active_profile.id,
            amount=request.form.get("amount", type=float) or 0,
            category=request.form.get("category", "other"),
            date=request.form.get("date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) or date.today(),
            notes=(request.form.get("notes") or "").strip() or None,
        )
        db.session.add(expense)
        db.session.commit()
        return redirect(url_for("dashboard.project_detail", project_id=project.id, tab="expenses"))

    return render_template(
        "expense_add.html",
        active_profile=active_profile,
        project=project,
        today=date.today().isoformat(),
        page_title="Add Expense",
        back_url=url_for("dashboard.project_detail", project_id=project.id),
    )


@dashboard_bp.post("/projects/<int:project_id>/tasks/log")
def project_task_log(project_id: int):
    project = Project.query.get_or_404(project_id)
    payload = request.get_json(silent=True) or {}

    task = Task(
        project_id=project.id,
        logged_by_id=session["active_profile_id"],
        task_type=payload.get("task_type", "other"),
        notes=(payload.get("notes") or "").strip() or None,
        weight_lbs=payload.get("weight_lbs"),
        logged_at=datetime.now(),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"success": True})


@dashboard_bp.get("/shows")
def shows_list():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    shows = Show.query.order_by(Show.start_date.asc(), Show.id.asc()).all()
    return render_template(
        "shows.html",
        active_profile=active_profile,
        shows=shows,
        today=date.today(),
        page_title="Shows",
        back_url=url_for("dashboard.dashboard_home"),
    )


@dashboard_bp.route("/shows/add", methods=["GET", "POST"])
def show_add():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    projects = Project.query.order_by(Project.name.asc()).all()
    profiles = {profile.id: profile for profile in Profile.query.order_by(Profile.name.asc()).all()}

    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        location = (request.form.get("location") or "").strip()
        start_date_raw = request.form.get("start_date")
        end_date_raw = request.form.get("end_date")

        if not name or not location or not start_date_raw:
            return render_template(
                "show_add.html",
                active_profile=active_profile,
                projects=projects,
                profiles=profiles,
                project_emoji=PROJECT_EMOJI,
                error="Name, location, and start date are required.",
                page_title="Add Show",
                back_url=url_for("dashboard.shows_list"),
            )

        start_date_val = datetime.strptime(start_date_raw, "%Y-%m-%d").date()
        end_date_val = datetime.strptime(end_date_raw, "%Y-%m-%d").date() if end_date_raw else None

        show = Show(name=name, location=location, start_date=start_date_val, end_date=end_date_val, notes=(request.form.get("notes") or "").strip() or None)
        db.session.add(show)
        db.session.flush()

        selected_projects = request.form.getlist("project_ids")
        for project_id in selected_projects:
            db.session.add(ShowEntry(show_id=show.id, project_id=int(project_id)))

        db.session.add(ShowDay(show_id=show.id, day_number=1, date=show.start_date))
        db.session.commit()
        _get_or_create_show_day(show, 1)
        return redirect(url_for("dashboard.show_detail", show_id=show.id))

    return render_template(
        "show_add.html",
        active_profile=active_profile,
        projects=projects,
        profiles=profiles,
        project_emoji=PROJECT_EMOJI,
        page_title="Add Show",
        back_url=url_for("dashboard.shows_list"),
    )


@dashboard_bp.get("/shows/<int:show_id>")
def show_detail(show_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    show = Show.query.get_or_404(show_id)
    entries = ShowEntry.query.filter_by(show_id=show.id).order_by(ShowEntry.id.asc()).all()
    project_ids = [entry.project_id for entry in entries]
    projects = {project.id: project for project in Project.query.filter(Project.id.in_(project_ids)).all()} if project_ids else {}
    profiles = {profile.id: profile for profile in Profile.query.all()}
    has_results = any(entry.placing or entry.ribbon_color for entry in entries)

    return render_template(
        "show_detail.html",
        active_profile=active_profile,
        show=show,
        entries=entries,
        projects=projects,
        profiles=profiles,
        project_emoji=PROJECT_EMOJI,
        ribbon_labels=RIBBON_LABELS,
        has_results=has_results,
        page_title="Show Details",
        back_url=url_for("dashboard.shows_list"),
    )


@dashboard_bp.get("/shows/<int:show_id>/day/<int:day_num>")
def show_day(show_id: int, day_num: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    show = Show.query.get_or_404(show_id)
    total_days = _show_total_days(show)

    max_existing = db.session.query(db.func.max(ShowDay.day_number)).filter_by(show_id=show.id).scalar() or 0
    if day_num < 1:
        return redirect(url_for("dashboard.show_day", show_id=show.id, day_num=1))

    allowed_max = max(total_days, max_existing, day_num)
    if day_num > allowed_max:
        return redirect(url_for("dashboard.show_day", show_id=show.id, day_num=allowed_max))

    show_day_record = _get_or_create_show_day(show, day_num)
    day_rows = ShowDay.query.filter_by(show_id=show.id).order_by(ShowDay.day_number.asc()).all()
    day_numbers = [row.day_number for row in day_rows]
    if not day_numbers:
        day_numbers = list(range(1, total_days + 1))

    checks = ShowDayCheck.query.filter_by(show_day_id=show_day_record.id).order_by(ShowDayCheck.id.asc()).all()

    entries = ShowEntry.query.filter_by(show_id=show.id).order_by(ShowEntry.id.asc()).all()
    project_ids = [entry.project_id for entry in entries]
    projects = {project.id: project for project in Project.query.filter(Project.id.in_(project_ids)).all()} if project_ids else {}
    day_photos = Photo.query.filter_by(show_day_id=show_day_record.id).order_by(Photo.uploaded_at.desc()).all()

    return render_template(
        "show_day.html",
        active_profile=active_profile,
        show=show,
        day_num=day_num,
        day_numbers=day_numbers,
        show_day_record=show_day_record,
        checks=checks,
        entries=entries,
        projects=projects,
        project_emoji=PROJECT_EMOJI,
        ribbon_labels=RIBBON_LABELS,
        day_photos=day_photos,
        page_title="Show Day",
        back_url=url_for("dashboard.show_detail", show_id=show.id),
    )


@dashboard_bp.post("/shows/<int:show_id>/days/add")
def add_show_day(show_id: int):
    show = Show.query.get_or_404(show_id)
    max_day = db.session.query(db.func.max(ShowDay.day_number)).filter_by(show_id=show.id).scalar() or _show_total_days(show)
    next_day = max_day + 1

    show_day_record = ShowDay(show_id=show.id, day_number=next_day, date=show.start_date + timedelta(days=next_day - 1))
    db.session.add(show_day_record)
    db.session.commit()
    _get_or_create_show_day(show, next_day)
    return redirect(url_for("dashboard.show_day", show_id=show.id, day_num=next_day))


@dashboard_bp.post("/shows/<int:show_id>/day/<int:day_num>/check")
def toggle_show_day_check(show_id: int, day_num: int):
    show = Show.query.get_or_404(show_id)
    show_day_record = _get_or_create_show_day(show, day_num)
    payload = request.get_json(silent=True) or {}
    item_name = (payload.get("item") or request.form.get("item") or "").strip()

    check = ShowDayCheck.query.filter_by(show_day_id=show_day_record.id, item_name=item_name).first_or_404()
    check.completed = not check.completed
    if check.completed:
        check.completed_at = datetime.now()
        check.completed_by_id = session["active_profile_id"]
    else:
        check.completed_at = None
        check.completed_by_id = None
    db.session.commit()

    if request.is_json:
        return jsonify({"success": True, "completed": check.completed})
    return redirect(url_for("dashboard.show_day", show_id=show.id, day_num=day_num))


@dashboard_bp.post("/shows/<int:show_id>/day/<int:day_num>/notes")
def save_show_day_notes(show_id: int, day_num: int):
    show = Show.query.get_or_404(show_id)
    show_day_record = _get_or_create_show_day(show, day_num)
    show_day_record.notes = (request.form.get("notes") or "").strip() or None
    db.session.commit()
    return redirect(url_for("dashboard.show_day", show_id=show.id, day_num=day_num))


@dashboard_bp.post("/shows/<int:show_id>/entries/<int:entry_id>/result")
def save_show_entry_result(show_id: int, entry_id: int):
    show = Show.query.get_or_404(show_id)
    entry = ShowEntry.query.filter_by(id=entry_id, show_id=show.id).first_or_404()

    placing = (request.form.get("placing") or "").strip() or None
    ribbon_color = (request.form.get("ribbon_color") or "").strip() or None
    day_number = request.form.get("day_number", type=int)

    entry.placing = placing
    entry.ribbon_color = ribbon_color
    entry.day_number = day_number

    task_note = f"{show.name}: {placing or 'Result saved'}"
    if ribbon_color:
        task_note = f"{task_note} ({RIBBON_LABELS.get(ribbon_color, ribbon_color.title())} ribbon)"

    db.session.add(
        Task(
            project_id=entry.project_id,
            logged_by_id=session["active_profile_id"],
            task_type="show",
            notes=task_note,
            logged_at=datetime.now(),
        )
    )
    db.session.commit()

    return redirect(url_for("dashboard.show_day", show_id=show.id, day_num=day_number or 1))


@dashboard_bp.get("/expenses")
def expenses_stub():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    return render_template("expenses.html", active_profile=active_profile, page_title="Expenses")


@dashboard_bp.get("/reports")
def reports_stub():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    return render_template("reports.html", active_profile=active_profile, page_title="Reports")


@dashboard_bp.get("/uploads/<path:filename>")
def uploaded_file(filename: str):
    return send_from_directory(current_app.config["BARN_UPLOAD_DIR"], filename)


@dashboard_bp.post("/projects/<int:project_id>/photos/upload")
def upload_project_photo(project_id: int):
    project = Project.query.get_or_404(project_id)
    file_storage = request.files.get("photo")

    try:
        filename = save_upload(file_storage, current_app.config["BARN_UPLOAD_DIR"])
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    photo = Photo(
        project_id=project.id,
        filename=filename,
        caption=(request.form.get("caption") or "").strip() or None,
        photo_type="photo",
        uploaded_by_id=session["active_profile_id"],
    )
    db.session.add(photo)
    db.session.commit()
    return jsonify({"success": True, "filename": filename, "id": photo.id})


@dashboard_bp.post("/shows/<int:show_id>/day/<int:day_num>/photos/upload")
def upload_show_day_photo(show_id: int, day_num: int):
    show = Show.query.get_or_404(show_id)
    show_day_record = _get_or_create_show_day(show, day_num)
    file_storage = request.files.get("photo")

    try:
        filename = save_upload(file_storage, current_app.config["BARN_UPLOAD_DIR"])
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    photo = Photo(
        show_id=show.id,
        show_day_id=show_day_record.id,
        filename=filename,
        photo_type="photo",
        uploaded_by_id=session["active_profile_id"],
    )
    db.session.add(photo)
    db.session.commit()
    return jsonify({"success": True, "filename": filename})
