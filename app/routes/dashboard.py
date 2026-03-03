from collections import defaultdict

import bcrypt
from datetime import date, datetime, timedelta
from io import BytesIO

from flask import Blueprint, current_app, jsonify, redirect, render_template, request, send_file, send_from_directory, session, url_for

from app import save_upload
from app.models import Expense, Goal, Notification, Photo, Profile, Project, Show, ShowDay, ShowDayCheck, ShowEntry, Task, db


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

VIDEO_EXTS = {'.mp4', '.mov', '.avi', '.webm'}

EXPENSE_CATEGORIES = {
    "feed": "Feed",
    "bedding": "Bedding",
    "vet": "Vet",
    "entry_fee": "Entry Fee",
    "supplies": "Supplies",
    "other": "Other",
}


@dashboard_bp.before_app_request
def require_session():
    if request.path.startswith("/static") or request.path.startswith("/profiles") or request.path.startswith("/uploads"):
        return
    if request.endpoint == "auth.logout":
        return
    if not session.get("active_profile_id"):
        return redirect(url_for("auth.profiles_page"))

    active_profile = Profile.query.get(session["active_profile_id"])
    if not active_profile:
        session.clear()
        return redirect(url_for("auth.profiles_page"))

    if active_profile.role == "grandparent" and request.method == "POST":
        allowed_posts = (
            request.path == "/tasks/log"
            or request.path.endswith("/tasks/log")
            or request.path.startswith("/notifications/read/")
            or request.path == "/notifications/read-all"
        )
        if not allowed_posts:
            if request.is_json:
                return jsonify({"success": False, "error": "Grandparent accounts are view-only"}), 403
            return redirect(request.referrer or url_for("dashboard.dashboard_home"))


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
    recent_expenses = Expense.query.order_by(Expense.date.desc(), Expense.id.desc()).limit(3).all()

    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 18 else "Good evening")
    profiles = {profile.id: profile for profile in Profile.query.all()}
    project_map = {project.id: project for project in projects}
    project_photos = {
        project.id: Photo.query.filter_by(project_id=project.id).order_by(Photo.uploaded_at.desc()).first()
        for project in projects
    }

    # Auto-generate notifications
    profile_id = session["active_profile_id"]
    upcoming_shows = Show.query.filter(
        Show.start_date >= date.today(),
        Show.start_date <= date.today() + timedelta(days=3)
    ).all()
    for show in upcoming_shows:
        exists = Notification.query.filter_by(
            profile_id=profile_id, type="show_alert", title=f"Upcoming: {show.name}"
        ).first()
        if not exists:
            db.session.add(Notification(
                profile_id=profile_id, title=f"Upcoming: {show.name}",
                body=f"{show.start_date.strftime('%b %-d')} at {show.location}",
                type="show_alert", link=f"/shows/{show.id}"
            ))
    pending_tasks = Task.query.filter(Task.logged_at.is_(None)).limit(5).all()
    for task in pending_tasks:
        exists = Notification.query.filter_by(
            profile_id=profile_id, type="task_due", title=f"Pending: {task.notes or task.task_type}"
        ).first()
        if not exists:
            db.session.add(Notification(
                profile_id=profile_id,
                title=f"Pending: {task.notes or task.task_type}",
                body="Task not yet logged", type="task_due"
            ))
    db.session.commit()
    unread_count = Notification.query.filter_by(profile_id=profile_id, read=False).count()
    notifications = Notification.query.filter_by(profile_id=profile_id).order_by(Notification.created_at.desc()).limit(10).all()

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
        recent_expenses=recent_expenses,
        expense_categories=EXPENSE_CATEGORIES,
        unread_count=unread_count,
        notifications=notifications,
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
            start_date=request.form.get("start_date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) if request.form.get("start_date") else None,
            purchase_date=request.form.get("purchase_date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) if request.form.get("purchase_date") else None,
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
    ribbon_count = sum(1 for entry in entries if entry.ribbon_color)
    ribbon_dates = set()
    for entry in entries:
        if not entry.ribbon_color:
            continue
        show_obj = shows.get(entry.show_id)
        if not show_obj:
            continue
        if entry.day_number and entry.day_number > 0:
            ribbon_dates.add(show_obj.start_date + timedelta(days=entry.day_number - 1))
        else:
            ribbon_dates.add(show_obj.start_date)
    total_spent = sum(expense.amount for expense in expenses)
    tab = request.args.get("tab", "timeline")
    photos = Photo.query.filter_by(project_id=project.id).order_by(Photo.uploaded_at.desc()).all()
    goals = Goal.query.filter_by(project_id=project_id).order_by(Goal.completed.asc(), Goal.created_at.asc()).all()

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
        expense_categories=EXPENSE_CATEGORIES,
        goals=goals,
        ribbon_count=ribbon_count,
        ribbon_dates=ribbon_dates,
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
        expense_categories=EXPENSE_CATEGORIES,
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
        duration_minutes=payload.get("duration_minutes"),
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
    class_name = (request.form.get("class_name") or "").strip() or None
    ring = (request.form.get("ring") or "").strip() or None
    judge_notes = (request.form.get("judge_notes") or "").strip() or None

    entry.placing = placing
    entry.ribbon_color = ribbon_color
    entry.day_number = day_number
    entry.class_name = class_name
    entry.ring = ring
    entry.judge_notes = judge_notes

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




@dashboard_bp.get("/timeline")
def family_timeline():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    filter_profile_id = request.args.get("profile", type=int)
    filter_project_id = request.args.get("project", type=int)
    filter_type = request.args.get("type")
    page = request.args.get("page", type=int) or 1
    page = 1 if page < 1 else page
    per_page = 50

    query = Task.query.filter(Task.logged_at.isnot(None))
    if filter_profile_id:
        query = query.filter(Task.logged_by_id == filter_profile_id)
    if filter_project_id:
        query = query.filter(Task.project_id == filter_project_id)
    if filter_type:
        query = query.filter(Task.task_type == filter_type)

    events = query.order_by(Task.logged_at.desc(), Task.id.desc()).limit(per_page).offset((page - 1) * per_page).all()

    profiles = {profile.id: profile for profile in Profile.query.all()}
    project_map = {project.id: project for project in Project.query.all()}
    all_profiles = Profile.query.filter_by(archived=False).order_by(Profile.name.asc()).all()
    all_projects = Project.query.order_by(Project.name.asc()).all()

    next_page_events = query.order_by(Task.logged_at.desc(), Task.id.desc()).limit(per_page).offset(page * per_page).all()

    return render_template(
        "timeline.html",
        active_profile=active_profile,
        events=events,
        profiles=profiles,
        project_map=project_map,
        filter_profile_id=filter_profile_id,
        filter_project_id=filter_project_id,
        filter_type=filter_type,
        all_profiles=all_profiles,
        all_projects=all_projects,
        page=page,
        has_next=bool(next_page_events),
        task_icons=TASK_ICONS,
        page_title="Family Timeline",
        back_url=url_for("dashboard.dashboard_home"),
    )


@dashboard_bp.get("/expenses")
def expenses_list():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    expenses = Expense.query.order_by(Expense.date.desc(), Expense.id.desc()).all()
    projects = {project.id: project for project in Project.query.order_by(Project.name.asc()).all()}
    profiles = {profile.id: profile for profile in Profile.query.all()}

    grouped_expenses = defaultdict(list)
    project_totals = defaultdict(float)
    grand_total = 0.0

    for expense in expenses:
        month_key = expense.date.strftime("%B %Y")
        grouped_expenses[month_key].append(expense)
        project_totals[expense.project_id] += expense.amount
        grand_total += expense.amount

    month_sections = [{"label": label, "expenses": values} for label, values in grouped_expenses.items()]
    summary_rows = [
        {"project": projects[project_id], "total": total}
        for project_id, total in sorted(project_totals.items(), key=lambda item: projects[item[0]].name.lower())
        if project_id in projects
    ]

    return render_template(
        "expenses.html",
        active_profile=active_profile,
        page_title="Expenses",
        back_url=url_for("dashboard.dashboard_home"),
        top_action_url=url_for("dashboard.expense_add_global"),
        top_action_label="+ Add",
        month_sections=month_sections,
        projects=projects,
        profiles=profiles,
        summary_rows=summary_rows,
        grand_total=grand_total,
        expense_categories=EXPENSE_CATEGORIES,
    )


@dashboard_bp.route("/expenses/add", methods=["GET", "POST"])
def expense_add_global():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    projects = Project.query.order_by(Project.name.asc()).all()
    profiles = {profile.id: profile for profile in Profile.query.order_by(Profile.name.asc()).all()}

    if request.method == "POST":
        project_id = request.form.get("project_id", type=int)
        if not project_id:
            return render_template(
                "expense_add_global.html",
                active_profile=active_profile,
                projects=projects,
                profiles=profiles,
                expense_categories=EXPENSE_CATEGORIES,
                today=date.today().isoformat(),
                page_title="Add Expense",
                back_url=url_for("dashboard.expenses_list"),
                error="Project is required.",
            )

        expense = Expense(
            project_id=project_id,
            logged_by_id=active_profile.id,
            amount=request.form.get("amount", type=float) or 0,
            category=request.form.get("category", "other"),
            date=request.form.get("date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) or date.today(),
            notes=(request.form.get("notes") or "").strip() or None,
        )
        db.session.add(expense)
        db.session.commit()
        return redirect(url_for("dashboard.expenses_list"))

    return render_template(
        "expense_add_global.html",
        active_profile=active_profile,
        projects=projects,
        profiles=profiles,
        expense_categories=EXPENSE_CATEGORIES,
        today=date.today().isoformat(),
        page_title="Add Expense",
        back_url=url_for("dashboard.expenses_list"),
    )


@dashboard_bp.get("/reports")
def reports_page():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    projects = Project.query.order_by(Project.name.asc()).all()
    profiles = {profile.id: profile for profile in Profile.query.order_by(Profile.name.asc()).all()}

    expense_summary = []
    grand_total = 0.0
    for project in projects:
        expenses = Expense.query.filter_by(project_id=project.id).order_by(Expense.date.desc(), Expense.id.desc()).all()
        category_totals = defaultdict(float)
        for expense in expenses:
            category_totals[expense.category] += expense.amount
            grand_total += expense.amount
        expense_summary.append({"project": project, "category_totals": dict(category_totals), "total": sum(category_totals.values())})

    leaderboard_counts = defaultdict(int)
    for task in Task.query.all():
        leaderboard_counts[task.logged_by_id] += 1
    max_count = max(leaderboard_counts.values(), default=0)
    leaderboard_rows = []
    for profile in profiles.values():
        count = leaderboard_counts.get(profile.id, 0)
        width_pct = int((count / max_count) * 100) if max_count else 0
        leaderboard_rows.append({"profile": profile, "count": count, "width_pct": width_pct})
    leaderboard_rows.sort(key=lambda row: (-row["count"], row["profile"].name.lower()))

    return render_template(
        "reports.html",
        active_profile=active_profile,
        page_title="Reports",
        back_url=url_for("dashboard.dashboard_home"),
        projects=projects,
        expense_summary=expense_summary,
        expense_categories=EXPENSE_CATEGORIES,
        leaderboard_rows=leaderboard_rows,
        grand_total=grand_total,
    )


@dashboard_bp.get("/reports/export/<int:project_id>")
def export_project_book(project_id: int):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    project = Project.query.get_or_404(project_id)
    profiles = {profile.id: profile for profile in Profile.query.all()}
    owner = profiles.get(project.owner_id)

    expenses = Expense.query.filter_by(project_id=project.id).order_by(Expense.date.asc(), Expense.id.asc()).all()
    tasks = Task.query.filter_by(project_id=project.id).order_by(Task.logged_at.asc().nullslast(), Task.id.asc()).all()
    entries = ShowEntry.query.filter_by(project_id=project.id).order_by(ShowEntry.id.asc()).all()
    shows = {show.id: show for show in Show.query.filter(Show.id.in_([entry.show_id for entry in entries])).all()} if entries else {}

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title=f"{project.name} Project Book")
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>{project.name} Project Book</b>", styles["Title"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Owner: {owner.name if owner else 'Unknown'}", styles["Normal"]))
    story.append(Paragraph(f"Type/Breed: {project.type.capitalize()}{' / ' + project.breed if project.breed else ''}", styles["Normal"]))
    story.append(Paragraph(f"Date: {date.today().strftime('%B %d, %Y')}", styles["Normal"]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Goals</b>", styles["Heading2"]))
    story.append(Paragraph(project.notes or "No goals recorded.", styles["Normal"]))
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Financial Summary</b>", styles["Heading2"]))
    exp_table_data = [["Date", "Category", "Notes", "Amount"]]
    expenses_total = 0.0
    for expense in expenses:
        exp_table_data.append([
            expense.date.strftime("%Y-%m-%d"),
            EXPENSE_CATEGORIES.get(expense.category, expense.category),
            expense.notes or "Expense",
            f"${expense.amount:.2f}",
        ])
        expenses_total += expense.amount
    exp_table_data.append(["", "", "Total", f"${expenses_total:.2f}"])
    exp_table = Table(exp_table_data, colWidths=[80, 100, 230, 80])
    exp_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#341A08")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (2, -1), (3, -1), "Helvetica-Bold"),
    ]))
    story.append(exp_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Activity Log</b>", styles["Heading2"]))
    task_table_data = [["Date/Time", "Who", "Type", "Notes"]]
    for task in tasks:
        who = profiles.get(task.logged_by_id)
        task_table_data.append([
            task.logged_at.strftime("%Y-%m-%d %I:%M %p") if task.logged_at else "Pending",
            who.name if who else "Unknown",
            task.task_type.capitalize(),
            task.notes or "",
        ])
    if len(task_table_data) == 1:
        task_table_data.append(["-", "-", "-", "No activity logged."])
    task_table = Table(task_table_data, colWidths=[120, 80, 70, 220])
    task_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#341A08")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    story.append(task_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Show Results</b>", styles["Heading2"]))
    show_table_data = [["Show", "Placing", "Ribbon"]]
    for entry in entries:
        show = shows.get(entry.show_id)
        show_table_data.append([
            show.name if show else "Show",
            entry.placing or "-",
            RIBBON_LABELS.get(entry.ribbon_color, (entry.ribbon_color or "-").title()),
        ])
    if len(show_table_data) == 1:
        show_table_data.append(["-", "-", "No show results."])
    show_table = Table(show_table_data, colWidths=[280, 120, 90])
    show_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#341A08")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    story.append(show_table)

    doc.build(story)
    buffer.seek(0)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"{project.name.lower().replace(' ', '-')}-project-book.pdf")


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

    extension = f".{filename.rsplit('.', 1)[1].lower()}" if "." in filename else ""
    photo_type = "video" if extension in VIDEO_EXTS else "photo"

    photo = Photo(
        project_id=project.id,
        filename=filename,
        caption=(request.form.get("caption") or "").strip() or None,
        photo_type=photo_type,
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

    extension = f".{filename.rsplit('.', 1)[1].lower()}" if "." in filename else ""
    photo_type = "video" if extension in VIDEO_EXTS else "photo"

    photo = Photo(
        show_id=show.id,
        show_day_id=show_day_record.id,
        filename=filename,
        photo_type=photo_type,
        uploaded_by_id=session["active_profile_id"],
    )
    db.session.add(photo)
    db.session.commit()
    return jsonify({"success": True, "filename": filename})


@dashboard_bp.post("/projects/<int:project_id>/goals/add")
def goal_add(project_id):
    project = Project.query.get_or_404(project_id)
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    if not text:
        return jsonify({"success": False, "error": "Text required"})
    goal = Goal(project_id=project.id, text=text)
    db.session.add(goal)
    db.session.commit()
    return jsonify({"success": True, "id": goal.id, "text": goal.text})


@dashboard_bp.post("/projects/<int:project_id>/goals/<int:goal_id>/toggle")
def goal_toggle(project_id, goal_id):
    goal = Goal.query.filter_by(id=goal_id, project_id=project_id).first_or_404()
    goal.completed = not goal.completed
    goal.completed_at = datetime.now() if goal.completed else None
    goal.completed_by_id = session["active_profile_id"] if goal.completed else None
    db.session.commit()
    return jsonify({"success": True, "completed": goal.completed})


@dashboard_bp.post("/notifications/read/<int:notif_id>")
def notification_read(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    notif.read = True
    db.session.commit()
    return jsonify({"success": True})


@dashboard_bp.post("/notifications/read-all")
def notification_read_all():
    profile_id = session["active_profile_id"]
    Notification.query.filter_by(profile_id=profile_id, read=False).update({"read": True})
    db.session.commit()
    return jsonify({"success": True})


@dashboard_bp.route("/projects/<int:project_id>/edit", methods=["GET", "POST"])
def project_edit(project_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    project = Project.query.get_or_404(project_id)
    profiles = Profile.query.order_by(Profile.name.asc()).all()

    if request.method == "POST":
        project.name = (request.form.get("name") or "").strip() or project.name
        project.type = request.form.get("type", project.type)
        project.owner_id = request.form.get("owner_id", type=int) or project.owner_id
        project.breed = (request.form.get("breed") or "").strip() or None
        project.start_date = request.form.get("start_date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) if request.form.get("start_date") else None
        project.purchase_date = request.form.get("purchase_date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) if request.form.get("purchase_date") else None
        project.purchase_price = request.form.get("purchase_price", type=float) or 0
        project.notes = (request.form.get("notes") or "").strip() or None
        db.session.commit()
        return redirect(url_for("dashboard.project_detail", project_id=project.id))

    return render_template(
        "project_edit.html",
        active_profile=active_profile,
        profiles=profiles,
        project=project,
        page_title="Edit Project",
        back_url=url_for("dashboard.project_detail", project_id=project.id),
    )


@dashboard_bp.get("/profiles/<int:profile_id>/summary")
def profile_summary(profile_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    profile = Profile.query.get_or_404(profile_id)
    age = ((date.today() - profile.birthdate).days // 365) if profile.birthdate else None
    years_active = date.today().year - profile.created_at.year + 1
    projects = Project.query.filter_by(owner_id=profile.id).order_by(Project.name.asc()).all()
    project_ids = [project.id for project in projects]
    entries = ShowEntry.query.filter(ShowEntry.project_id.in_(project_ids)).all() if project_ids else []
    total_ribbons = len([entry for entry in entries if entry.ribbon_color])
    expenses = Expense.query.filter(Expense.project_id.in_(project_ids)).all() if project_ids else []
    total_spent = sum(expense.amount for expense in expenses)
    total_tasks = Task.query.filter_by(logged_by_id=profile.id).count()
    shows = {show.id: show for show in Show.query.filter(Show.id.in_([entry.show_id for entry in entries])).all()} if entries else {}
    projects_by_id = {project.id: project for project in projects}
    project_totals = defaultdict(float)
    for expense in expenses:
        project_totals[expense.project_id] += expense.amount

    return render_template(
        "profile_summary.html",
        active_profile=active_profile,
        profile=profile,
        age=age,
        years_active=years_active,
        projects=projects,
        total_ribbons=total_ribbons,
        total_spent=total_spent,
        total_tasks=total_tasks,
        entries=entries,
        shows=shows,
        projects_by_id=projects_by_id,
        project_totals=project_totals,
        page_title="Profile Summary",
        back_url=url_for("dashboard.dashboard_home"),
    )


@dashboard_bp.get("/settings/profiles")
def settings_profiles():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    if active_profile.role != "parent":
        return redirect(url_for("dashboard.dashboard_home"))
    profiles = Profile.query.order_by(Profile.name.asc()).all()
    today = date.today()
    return render_template("settings_profiles.html", active_profile=active_profile, profiles=profiles, today=today, page_title="Manage Profiles", back_url=url_for("dashboard.dashboard_home"))


@dashboard_bp.route("/settings/profiles/add", methods=["GET", "POST"])
def settings_profiles_add():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    if active_profile.role != "parent":
        return redirect(url_for("dashboard.dashboard_home"))

    colors = ["#5C2E00", "#1A3A5C", "#2D5A1B", "#6B2D6B", "#1A4A4A", "#8B4513"]
    if request.method == "POST":
        pin = (request.form.get("pin") or "").strip()
        pin_confirm = (request.form.get("pin_confirm") or "").strip()
        if pin and pin != pin_confirm:
            return render_template("settings_profile_add.html", active_profile=active_profile, colors=colors, error="PINs do not match", page_title="Add Profile", back_url=url_for("dashboard.settings_profiles"))
        pin_hash = bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8") if pin else None
        profile = Profile(
            name=(request.form.get("name") or "").strip(),
            role=request.form.get("role", "kid"),
            pin_hash=pin_hash,
            color=request.form.get("color") or colors[0],
            birthdate=request.form.get("birthdate", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) if request.form.get("birthdate") else None,
        )
        db.session.add(profile)
        db.session.commit()
        return redirect(url_for("dashboard.settings_profiles"))

    return render_template("settings_profile_add.html", active_profile=active_profile, colors=colors, page_title="Add Profile", back_url=url_for("dashboard.settings_profiles"))


@dashboard_bp.route("/settings/profiles/<int:profile_id>/edit", methods=["GET", "POST"])
def settings_profiles_edit(profile_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    if active_profile.role != "parent":
        return redirect(url_for("dashboard.dashboard_home"))

    profile = Profile.query.get_or_404(profile_id)
    colors = ["#5C2E00", "#1A3A5C", "#2D5A1B", "#6B2D6B", "#1A4A4A", "#8B4513"]

    if request.method == "POST":
        profile.name = (request.form.get("name") or "").strip() or profile.name
        profile.role = request.form.get("role", profile.role)
        profile.color = request.form.get("color") or profile.color
        profile.birthdate = request.form.get("birthdate", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) if request.form.get("birthdate") else None

        if request.form.get("remove_pin") == "1" and profile.role == "kid":
            profile.pin_hash = None

        new_pin = (request.form.get("new_pin") or "").strip()
        new_pin_confirm = (request.form.get("new_pin_confirm") or "").strip()
        if new_pin:
            if new_pin != new_pin_confirm:
                return render_template("settings_profile_edit.html", active_profile=active_profile, profile=profile, colors=colors, error="PINs do not match", page_title="Edit Profile", back_url=url_for("dashboard.settings_profiles"))
            profile.pin_hash = bcrypt.hashpw(new_pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        db.session.commit()
        return redirect(url_for("dashboard.settings_profiles"))

    return render_template("settings_profile_edit.html", active_profile=active_profile, profile=profile, colors=colors, page_title="Edit Profile", back_url=url_for("dashboard.settings_profiles"))


@dashboard_bp.post("/settings/profiles/<int:profile_id>/archive")
def settings_profiles_archive(profile_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    if active_profile.role != "parent":
        return redirect(url_for("dashboard.dashboard_home"))
    profile = Profile.query.get_or_404(profile_id)
    profile.archived = not profile.archived
    db.session.commit()
    return redirect(url_for("dashboard.settings_profiles"))


@dashboard_bp.post("/settings/profiles/<int:profile_id>/restore")
def settings_profiles_restore(profile_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    if active_profile.role != "parent":
        return redirect(url_for("dashboard.dashboard_home"))
    profile = Profile.query.get_or_404(profile_id)
    profile.archived = False
    db.session.commit()
    return redirect(url_for("dashboard.settings_profiles"))


@dashboard_bp.post('/settings/profiles/<int:profile_id>/delete')
def profile_delete(profile_id):
    active = Profile.query.get(session['active_profile_id'])
    if not active or active.role != 'parent':
        return redirect('/')
    if profile_id == active.id:
        return redirect('/settings/profiles')
    profile = Profile.query.get_or_404(profile_id)
    for project in Project.query.filter_by(owner_id=profile.id).all():
        project.owner_id = active.id
    Notification.query.filter_by(profile_id=profile.id).delete()
    Goal.query.filter(Goal.completed_by_id == profile.id).update({'completed_by_id': None})
    Task.query.filter_by(logged_by_id=profile.id).update({'logged_by_id': active.id})
    db.session.delete(profile)
    db.session.commit()
    return redirect('/settings/profiles')


@dashboard_bp.get("/admin")
def admin_dashboard():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    if active_profile.role != "parent":
        return redirect(url_for("dashboard.dashboard_home"))

    projects = Project.query.order_by(Project.name.asc()).all()
    profiles = {profile.id: profile for profile in Profile.query.order_by(Profile.name.asc()).all()}
    first_of_month = date.today().replace(day=1)
    monthly_expenses = Expense.query.filter(Expense.date >= first_of_month).all()
    monthly_total = sum(expense.amount for expense in monthly_expenses)
    monthly_by_project = defaultdict(float)
    for expense in monthly_expenses:
        monthly_by_project[expense.project_id] += expense.amount
    projects_by_id = {project.id: project for project in projects}
    monthly_by_project_rows = [
        {"project": projects_by_id.get(project_id), "amount": amount}
        for project_id, amount in monthly_by_project.items()
        if projects_by_id.get(project_id)
    ]

    recent_ribbons = ShowEntry.query.filter(ShowEntry.ribbon_color.isnot(None)).order_by(ShowEntry.id.desc()).limit(10).all()
    ribbon_total = ShowEntry.query.filter(ShowEntry.ribbon_color.isnot(None)).count()
    shows = {show.id: show for show in Show.query.filter(Show.id.in_([entry.show_id for entry in recent_ribbons])).all()} if recent_ribbons else {}

    week_start = date.today() - timedelta(days=date.today().weekday())
    all_profiles = Profile.query.filter_by(archived=False).order_by(Profile.name.asc()).all()
    weekly_task_counts = defaultdict(int)
    for task in Task.query.filter(Task.logged_at.isnot(None)).all():
        if task.logged_at.date() >= week_start:
            weekly_task_counts[task.logged_by_id] += 1

    return render_template(
        "admin_dashboard.html",
        active_profile=active_profile,
        all_projects=projects,
        profiles=profiles,
        monthly_total=monthly_total,
        monthly_by_project=monthly_by_project,
        monthly_by_project_rows=monthly_by_project_rows,
        recent_ribbons=recent_ribbons,
        all_profiles=all_profiles,
        weekly_task_counts=weekly_task_counts,
        ribbon_total=ribbon_total,
        shows=shows,
        page_title="Admin",
        back_url=url_for("dashboard.dashboard_home"),
    )


@dashboard_bp.post("/profiles/<int:profile_id>/avatar/remove")
def remove_avatar(profile_id: int):
    profile = Profile.query.get_or_404(profile_id)
    profile.avatar_path = None
    db.session.commit()
    return jsonify({"success": True})
