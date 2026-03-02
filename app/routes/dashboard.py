from datetime import date, datetime

from flask import Blueprint, redirect, request, render_template, session, url_for

from app.models import Profile, Project, Show, Task, db


dashboard_bp = Blueprint("dashboard", __name__)


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
    projects = Project.query.all()
    shows_upcoming = Show.query.filter(Show.start_date >= date.today()).all()
    tasks_today = Task.query.order_by(Task.id.asc()).all()

    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 18 else "Good evening")
    profiles = {profile.id: profile for profile in Profile.query.all()}

    return render_template(
        "dashboard.html",
        active_profile=active_profile,
        projects=projects,
        tasks_today=tasks_today,
        shows_upcoming=shows_upcoming,
        greeting=greeting,
        profiles=profiles,
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
