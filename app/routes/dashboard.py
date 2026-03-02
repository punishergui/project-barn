from datetime import date, datetime

from flask import Blueprint, jsonify, redirect, render_template, request, session, url_for

from app.models import Expense, Profile, Project, Show, ShowEntry, Task, db


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


@dashboard_bp.before_app_request
def require_session():
    if request.path.startswith("/static") or request.path.startswith("/profiles"):
        return
    if request.endpoint == "auth.logout":
        return
    if not session.get("active_profile_id"):
        return redirect(url_for("auth.profiles_page"))


@dashboard_bp.get("/")
def dashboard_home():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    projects = Project.query.order_by(Project.name.asc()).all()
    shows_upcoming = Show.query.filter(Show.start_date >= date.today()).all()
    tasks_today = Task.query.order_by(Task.id.asc()).all()
    recent_activity = (
        Task.query.filter(Task.logged_at.isnot(None)).order_by(Task.logged_at.desc()).limit(5).all()
    )

    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 18 else "Good evening")
    profiles = {profile.id: profile for profile in Profile.query.all()}
    project_map = {project.id: project for project in projects}

    return render_template(
        "dashboard.html",
        active_profile=active_profile,
        projects=projects,
        tasks_today=tasks_today,
        shows_upcoming=shows_upcoming,
        greeting=greeting,
        profiles=profiles,
        task_icons=TASK_ICONS,
        project_map=project_map,
        recent_activity=recent_activity,
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
    return render_template(
        "projects_list.html",
        active_profile=active_profile,
        projects=projects,
        profiles=profiles,
        project_emoji=PROJECT_EMOJI,
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
        project_emoji=PROJECT_EMOJI,
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
def shows_stub():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    return render_template("shows.html", active_profile=active_profile, page_title="Shows")


@dashboard_bp.get("/expenses")
def expenses_stub():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    return render_template("expenses.html", active_profile=active_profile, page_title="Expenses")


@dashboard_bp.get("/reports")
def reports_stub():
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    return render_template("reports.html", active_profile=active_profile, page_title="Reports")
