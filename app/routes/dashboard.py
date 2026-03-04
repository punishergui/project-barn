from collections import defaultdict

import bcrypt
from datetime import date, datetime, timedelta
from io import BytesIO

from flask import Blueprint, current_app, jsonify, redirect, render_template, request, send_file, send_from_directory, session, url_for

from app import save_upload
from app.data.breeds import BREEDS
from app.data.project_types import PROJECT_TYPE_CONFIG
from app.models import AuctionSale, Expense, FeedLog, Goal, HealthRecord, IncomeRecord, InventoryItem, Notification, Photo, Profile, Project, ProjectActivity, ProjectMaterial, ProjectNarrative, Show, ShowCompliance, ShowDay, ShowDayCheck, ShowEntry, SkillsChecklist, Task, db


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
    "dairy": "🥛",
    "pig": "🐖",
    "goat": "🐐",
    "sheep": "🐑",
    "chicken": "🐔",
    "rabbit": "🐇",
    "horse": "🐎",
    "baking": "🧁",
    "sewing": "🧵",
    "shooting": "🎯",
    "garden": "🌱",
    "robotics": "🤖",
    "photography": "📷",
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

def parse_date(val):
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except ValueError:
        return None


def require_project_access(project):
    profile_id = session.get('active_profile_id')
    if not profile_id:
        from flask import abort
        abort(403)


VIDEO_EXTS = {'.mp4', '.mov', '.avi', '.webm'}

EXPENSE_CATEGORIES = {
    "feed": "Feed (Grain / Complete)",
    "hay": "Hay / Forage",
    "bedding": "Bedding",
    "vet": "Veterinary / Medical",
    "entry_fee": "Entry Fee",
    "supplies": "Supplies",
    "equipment": "Equipment",
    "transportation": "Transportation",
    "registration": "Registration / Membership",
    "grooming": "Grooming Supplies",
    "breeding_fee": "Breeding Fee",
    "insurance": "Insurance",
    "other_expense": "Other",
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
    today = date.today()
    withdrawal_project_ids = set(
        r.project_id for r in HealthRecord.query.filter(
            HealthRecord.withdrawal_end_date >= today).all()
    )

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
        project_count=len(projects),
        tasks_today=tasks_today,
        shows_upcoming=shows_upcoming,
        upcoming_preview=upcoming_preview,
        greeting=greeting,
        profiles=profiles,
        task_icons=TASK_ICONS,
        recent_activity=recent_activity,
        project_map=project_map,
        project_photos=project_photos,
        today=today,
        withdrawal_project_ids=withdrawal_project_ids,
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
            sub_type=(request.form.get("sub_type") or "").strip() or None,
            sex=(request.form.get("sex") or "").strip() or None,
            animal_dob=parse_date(request.form.get("animal_dob")),
            ear_tag=(request.form.get("ear_tag") or "").strip() or None,
            tattoo=(request.form.get("tattoo") or "").strip() or None,
            rfid_tag=(request.form.get("rfid_tag") or "").strip() or None,
            registration_number=(request.form.get("registration_number") or "").strip() or None,
            scrapie_tag=(request.form.get("scrapie_tag") or "").strip() or None,
            coggins_date=parse_date(request.form.get("coggins_date")),
            yqca_number=(request.form.get("yqca_number") or "").strip() or None,
            yqca_expiry=parse_date(request.form.get("yqca_expiry")),
            initial_weight=float(request.form.get("initial_weight") or 0) or None,
            target_weight=float(request.form.get("target_weight") or 0) or None,
            target_date=parse_date(request.form.get("target_date")),
            start_date=parse_date(request.form.get("start_date")),
            purchase_date=parse_date(request.form.get("purchase_date")),
            purchase_price=request.form.get("purchase_price", type=float) or 0,
            notes=(request.form.get("notes") or "").strip() or None,
            club_name=request.form.get('club_name', '').strip() or None,
            county=request.form.get('county', '').strip() or None,
            state=request.form.get('state', 'Texas').strip() or 'Texas',
            project_year=int(request.form.get('project_year') or 0) or None,
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
    require_project_access(project)
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
    total_auction_proceeds = db.session.query(
        db.func.sum(AuctionSale.net_proceeds)
    ).filter_by(project_id=project_id).scalar() or 0
    total_income_records = db.session.query(
        db.func.sum(IncomeRecord.amount)
    ).filter_by(project_id=project_id).scalar() or 0
    total_expenses_sum = db.session.query(
        db.func.sum(Expense.amount)
    ).filter_by(project_id=project_id).scalar() or 0
    net_pl = round(total_income_records + (total_auction_proceeds or 0)
                   - total_expenses_sum, 2)
    type_config = PROJECT_TYPE_CONFIG.get(project.type, {})
    activity_hours = db.session.query(
        db.func.sum(ProjectActivity.hours)
    ).filter_by(project_id=project_id).scalar() or 0
    skills_total = SkillsChecklist.query.filter_by(
        project_id=project_id).count()
    skills_done = SkillsChecklist.query.filter_by(
        project_id=project_id, completed=True).count()
    has_narrative = ProjectNarrative.query.filter_by(
        project_id=project_id).first() is not None
    tab = request.args.get("tab", "timeline")
    photos = Photo.query.filter_by(project_id=project.id).order_by(Photo.uploaded_at.desc()).all()
    goals = Goal.query.filter_by(project_id=project_id).order_by(Goal.completed.asc(), Goal.created_at.asc()).all()

    weigh_tasks = [t for t in tasks if t.task_type == "weigh" and t.weight_lbs and t.logged_at]
    weigh_tasks_sorted = sorted(weigh_tasks, key=lambda t: t.logged_at)
    current_weight = weigh_tasks_sorted[-1].weight_lbs if weigh_tasks_sorted else project.initial_weight
    adg = None
    projected_weight = None
    days_until_fair = None
    weight_status = None
    if project.initial_weight and current_weight and project.start_date:
        days_on_feed = (date.today() - project.start_date).days or 1
        adg = round((current_weight - project.initial_weight) / days_on_feed, 2)
        if project.target_date:
            days_until_fair = (project.target_date - date.today()).days
            if days_until_fair > 0 and adg:
                projected_weight = round(current_weight + (adg * days_until_fair), 1)
                if project.target_weight:
                    diff = projected_weight - project.target_weight
                    if abs(diff) <= project.target_weight * 0.03:
                        weight_status = "on_track"
                    elif diff > 0:
                        weight_status = "heavy"
                    else:
                        weight_status = "light"

    recent_feed_logs = FeedLog.query.filter_by(project_id=project_id).order_by(FeedLog.date.desc()).limit(5).all()
    recent_health_records = HealthRecord.query.filter_by(
        project_id=project_id).order_by(HealthRecord.date.desc()).limit(5).all()
    from datetime import date as date_cls
    today = date_cls.today()
    active_withdrawal_count = HealthRecord.query.filter_by(
        project_id=project_id).filter(
        HealthRecord.withdrawal_end_date >= today).count()
    feed_logs_all = FeedLog.query.filter_by(project_id=project_id).all()
    feed_total_lbs = sum(l.amount_lbs for l in feed_logs_all)
    feed_total_cost = sum(
        (l.amount_lbs / l.bag_size_lbs * l.cost_per_bag)
        for l in feed_logs_all
        if l.cost_per_bag and l.bag_size_lbs and l.bag_size_lbs > 0
    )
    fcr = None
    if project.initial_weight and current_weight:
        total_gain = current_weight - project.initial_weight
        if total_gain > 0 and feed_total_lbs > 0:
            fcr = round(feed_total_lbs / total_gain, 2)
    feed_summary = {
        'total_lbs': round(feed_total_lbs, 1),
        'total_cost': round(feed_total_cost, 2),
        'fcr': fcr
    } if feed_logs_all else None

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
        adg=adg,
        projected_weight=projected_weight,
        days_until_fair=days_until_fair,
        weight_status=weight_status,
        current_weight=current_weight,
        recent_feed_logs=recent_feed_logs,
        recent_health_records=recent_health_records,
        today=today,
        active_withdrawal_count=active_withdrawal_count,
        feed_summary=feed_summary,
        net_pl=net_pl,
        type_config=type_config,
        activity_hours=activity_hours,
        skills_total=skills_total,
        skills_done=skills_done,
        has_narrative=has_narrative,
    )


@dashboard_bp.get('/projects/<int:project_id>/activity')
@dashboard_bp.post('/projects/<int:project_id>/activity')
def activity_log(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    activities = ProjectActivity.query.filter_by(
        project_id=project_id).order_by(
        ProjectActivity.date.desc()).all()
    profiles = {p.id: p for p in Profile.query.all()}
    total_hours = sum(a.hours or 0 for a in activities)
    if request.method == 'POST':
        from datetime import date as date_cls
        hours_val = request.form.get('hours','').strip()
        act = ProjectActivity(
            project_id=project_id,
            logged_by_id=session['active_profile_id'],
            date=parse_date(request.form.get('date')) or date_cls.today(),
            title=request.form.get('title','').strip(),
            hours=float(hours_val) if hours_val else None,
            notes=request.form.get('notes','').strip() or None,
        )
        db.session.add(act)
        db.session.commit()
        return redirect(f'/projects/{project_id}/activity')
    type_config = PROJECT_TYPE_CONFIG.get(project.type, {})
    return render_template('activity_log.html',
        project=project, activities=activities,
        profiles=profiles, total_hours=round(total_hours, 1),
        type_config=type_config,
        page_title='Activity Log',
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.post('/projects/<int:project_id>/activity'
                   '/<int:act_id>/delete')
def activity_delete(project_id, act_id):
    active = Profile.query.get(session['active_profile_id'])
    act = ProjectActivity.query.filter_by(
        id=act_id, project_id=project_id).first_or_404()
    if active.role == 'parent' or act.logged_by_id == active.id:
        db.session.delete(act)
        db.session.commit()
    return redirect(f'/projects/{project_id}/activity')


@dashboard_bp.get('/projects/<int:project_id>/skills')
@dashboard_bp.post('/projects/<int:project_id>/skills')
def skills_checklist(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    skills = SkillsChecklist.query.filter_by(
        project_id=project_id).order_by(
        SkillsChecklist.sort_order,
        SkillsChecklist.id).all()
    if not skills:
        config = PROJECT_TYPE_CONFIG.get(project.type, {})
        for i, skill_name in enumerate(
                config.get('default_skills', [])):
            s = SkillsChecklist(
                project_id=project_id,
                skill_name=skill_name,
                sort_order=i)
            db.session.add(s)
        db.session.commit()
        skills = SkillsChecklist.query.filter_by(
            project_id=project_id).order_by(
            SkillsChecklist.sort_order).all()
    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'add':
            new_skill_name = request.form.get('skill_name','').strip()
            if new_skill_name:
                new_skill = SkillsChecklist(
                    project_id=project_id,
                    skill_name=new_skill_name,
                    sort_order=len(skills))
                db.session.add(new_skill)
                db.session.commit()
        elif action == 'toggle':
            from datetime import datetime as dt
            skill_id = int(request.form.get('skill_id'))
            skill = SkillsChecklist.query.filter_by(
                id=skill_id, project_id=project_id).first()
            if skill:
                skill.completed = not skill.completed
                skill.completed_at = dt.utcnow() if skill.completed else None
                skill.completed_by_id = session['active_profile_id'] if skill.completed else None
                db.session.commit()
        elif action == 'delete':
            active = Profile.query.get(session['active_profile_id'])
            if active.role == 'parent':
                skill_id = int(request.form.get('skill_id'))
                skill = SkillsChecklist.query.filter_by(
                    id=skill_id, project_id=project_id).first()
                if skill:
                    db.session.delete(skill)
                    db.session.commit()
        return redirect(f'/projects/{project_id}/skills')
    completed_count = sum(1 for s in skills if s.completed)
    profiles = {p.id: p for p in Profile.query.all()}
    return render_template('skills_checklist.html',
        project=project, skills=skills,
        completed_count=completed_count,
        total_count=len(skills),
        profiles=profiles,
        page_title='Skills Checklist',
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.get('/projects/<int:project_id>/materials')
@dashboard_bp.post('/projects/<int:project_id>/materials')
def materials(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    items = ProjectMaterial.query.filter_by(
        project_id=project_id).order_by(
        ProjectMaterial.date_purchased.desc()).all()
    total_cost = sum(
        i.total_cost for i in items if i.total_cost)
    type_config = PROJECT_TYPE_CONFIG.get(project.type, {})
    if request.method == 'POST':
        from datetime import date as date_cls
        qty = float(request.form.get('quantity') or 1) or None
        unit_cost = float(request.form.get('unit_cost') or 0) or None
        total = round(qty * unit_cost, 2) if qty and unit_cost else None
        item = ProjectMaterial(
            project_id=project_id,
            logged_by_id=session['active_profile_id'],
            item_name=request.form.get('item_name','').strip(),
            quantity=qty,
            unit=request.form.get('unit','').strip() or None,
            unit_cost=unit_cost,
            total_cost=total,
            category=request.form.get('category','').strip() or None,
            notes=request.form.get('notes','').strip() or None,
            date_purchased=parse_date(
                request.form.get('date_purchased')) or date_cls.today(),
        )
        db.session.add(item)
        if total:
            expense = Expense(
                project_id=project_id,
                logged_by_id=session['active_profile_id'],
                amount=total,
                category='supplies',
                date=item.date_purchased,
                notes=item.item_name,
            )
            db.session.add(expense)
        db.session.commit()
        return redirect(f'/projects/{project_id}/materials')
    profiles = {p.id: p for p in Profile.query.all()}
    return render_template('materials.html',
        project=project, items=items,
        total_cost=round(total_cost, 2),
        profiles=profiles,
        type_config=type_config,
        page_title=type_config.get('material_label','Materials'),
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.post('/projects/<int:project_id>/materials'
                   '/<int:item_id>/delete')
def material_delete(project_id, item_id):
    active = Profile.query.get(session['active_profile_id'])
    item = ProjectMaterial.query.filter_by(
        id=item_id, project_id=project_id).first_or_404()
    if active.role == 'parent' or item.logged_by_id == active.id:
        db.session.delete(item)
        db.session.commit()
    return redirect(f'/projects/{project_id}/materials')


@dashboard_bp.get('/projects/<int:project_id>/narrative')
@dashboard_bp.post('/projects/<int:project_id>/narrative')
def narrative(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    narr = ProjectNarrative.query.filter_by(
        project_id=project_id).first()
    if request.method == 'POST':
        from datetime import datetime as dt
        if not narr:
            narr = ProjectNarrative(project_id=project_id)
            db.session.add(narr)
        narr.project_goals_narrative = request.form.get('project_goals_narrative','').strip() or None
        narr.what_i_did = request.form.get('what_i_did','').strip() or None
        narr.what_i_learned = request.form.get('what_i_learned','').strip() or None
        narr.how_i_improved = request.form.get('how_i_improved','').strip() or None
        narr.skills_learned = request.form.get('skills_learned','').strip() or None
        narr.updated_at = dt.utcnow()
        db.session.commit()
        return redirect(f'/projects/{project_id}/narrative')
    return render_template('narrative.html',
        project=project, narr=narr,
        page_title='Project Story',
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.route("/projects/<int:project_id>/expenses/add", methods=["GET", "POST"])
def expense_add(project_id: int):
    active_profile = Profile.query.get_or_404(session["active_profile_id"])
    project = Project.query.get_or_404(project_id)

    if request.method == "POST":
        vendor = request.form.get('vendor', '').strip() or None
        expense = Expense(
            project_id=project.id,
            logged_by_id=active_profile.id,
            amount=request.form.get("amount", type=float) or 0,
            category=request.form.get("category", "other_expense"),
            date=request.form.get("date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) or date.today(),
            notes=(request.form.get("notes") or "").strip() or None,
            vendor=vendor,
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

        vendor = request.form.get('vendor', '').strip() or None
        expense = Expense(
            project_id=project_id,
            logged_by_id=active_profile.id,
            amount=request.form.get("amount", type=float) or 0,
            category=request.form.get("category", "other_expense"),
            date=request.form.get("date", type=lambda v: datetime.strptime(v, "%Y-%m-%d").date()) or date.today(),
            notes=(request.form.get("notes") or "").strip() or None,
            vendor=vendor,
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


@dashboard_bp.get('/reports/export/<int:project_id>')
def reports_export(project_id):
    import io
    from datetime import date as date_cls
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
        Table, TableStyle, HRFlowable, PageBreak)
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT
    from flask import Response

    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    owner = Profile.query.get(project.owner_id)

    BARN_RED = colors.HexColor('#8B2814')
    GOLD = colors.HexColor('#D4920C')
    GOLD_LIGHT = colors.HexColor('#F0B020')
    DARK_CARD = colors.HexColor('#2C1810')
    CREAM = colors.HexColor('#FAF6ED')
    MUTED = colors.HexColor('#B89070')
    WHITE = colors.white
    BLACK = colors.HexColor('#1E0C04')
    GREEN = colors.HexColor('#3DAA60')
    RED_LIGHT = colors.HexColor('#FF8070')

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch)

    styles = getSampleStyleSheet()

    def sty(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    S_TITLE = sty('title', fontSize=26, textColor=GOLD_LIGHT,
                  fontName='Helvetica-Bold', alignment=TA_CENTER,
                  spaceAfter=4)
    S_SUB = sty('sub', fontSize=13, textColor=MUTED,
                alignment=TA_CENTER, spaceAfter=2)
    S_H1 = sty('h1', fontSize=16, textColor=GOLD_LIGHT,
               fontName='Helvetica-Bold', spaceBefore=14,
               spaceAfter=4)
    S_H2 = sty('h2', fontSize=12, textColor=GOLD,
               fontName='Helvetica-Bold', spaceBefore=8,
               spaceAfter=3)
    S_MUTED = sty('muted', fontSize=9, textColor=MUTED,
                  spaceAfter=2)
    S_NARR = sty('narr', fontSize=10, textColor=BLACK,
                 leading=16, spaceAfter=8)

    def hr():
        return HRFlowable(width='100%', thickness=0.5,
            color=colors.HexColor('#C4A060'), spaceAfter=6, spaceBefore=6)

    def sp(h=8):
        return Spacer(1, h)

    def tbl_style(extra=None):
        base = [
            ('BACKGROUND', (0, 0), (-1, 0), DARK_CARD),
            ('TEXTCOLOR', (0, 0), (-1, 0), GOLD_LIGHT),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [CREAM, colors.HexColor('#F0E8D8')]),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TEXTCOLOR', (0, 1), (-1, -1), BLACK),
            ('GRID', (0, 0), (-1, -1), 0.3,
             colors.HexColor('#C4A060')),
            ('ROWHEIGHT', (0, 0), (-1, -1), 18),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]
        if extra:
            base.extend(extra)
        return TableStyle(base)

    story = []
    story.append(sp(40))
    story.append(Paragraph('PROJECT BARN', S_TITLE))
    story.append(Paragraph('4-H Project Record Book', S_SUB))
    story.append(sp(6))
    story.append(hr())
    story.append(sp(20))

    type_cfg = PROJECT_TYPE_CONFIG.get(project.type, {})
    emoji = type_cfg.get('emoji', '📋')
    story.append(Paragraph(emoji, sty('em', fontSize=48,
        alignment=TA_CENTER, spaceAfter=6)))
    story.append(Paragraph(project.name,
        sty('pname', fontSize=22, textColor=BARN_RED,
            fontName='Helvetica-Bold', alignment=TA_CENTER,
            spaceAfter=4)))
    story.append(Paragraph(type_cfg.get('label', project.type.title()),
        sty('ptype', fontSize=13, textColor=MUTED,
            alignment=TA_CENTER, spaceAfter=16)))

    year = project.project_year or date_cls.today().year
    club = (project.club_name or (owner.club_name if owner else '') or '—')
    county = (project.county or (owner.county if owner else '') or '—')
    state = (project.state or (owner.state if owner else 'Texas') or 'Texas')
    cover_data = [
        ['Member Name', owner.name if owner else '—'],
        ['Club / Chapter', club],
        ['County', county],
        ['State', state],
        ['Project Year', str(year)],
        ['Breed / Sub-type',
         f"{project.breed or '—'}"
         f"{' · ' + project.sub_type if project.sub_type else ''}"],
    ]
    if owner and owner.birthdate:
        age = (date_cls.today() - owner.birthdate).days // 365
        cover_data.insert(1, ['Age / Grade', f'{age} years old'])
    if owner and owner.years_in_4h:
        cover_data.append(['Years in 4-H', str(owner.years_in_4h)])
    ct = Table(cover_data, colWidths=[2*inch, 4.5*inch])
    ct.setStyle(tbl_style())
    story.append(ct)
    story.append(sp(20))
    story.append(hr())
    story.append(Paragraph(
        f'Generated {date_cls.today().strftime("%B %d, %Y")}', S_MUTED))
    story.append(PageBreak())

    story.append(Paragraph('Project Overview', S_H1))
    story.append(hr())
    overview_data = []
    if project.start_date:
        overview_data.append(['Start Date', project.start_date.strftime('%B %d, %Y')])
    if project.purchase_date:
        overview_data.append(['Purchase Date', project.purchase_date.strftime('%B %d, %Y')])
    if project.purchase_price:
        overview_data.append(['Purchase Price', f'${project.purchase_price:.2f}'])
    if project.initial_weight:
        overview_data.append(['Starting Weight', f'{project.initial_weight} lbs'])
    if project.target_weight:
        overview_data.append(['Target Weight', f'{project.target_weight} lbs'])
    if project.target_date:
        overview_data.append(['Fair / Target Date', project.target_date.strftime('%B %d, %Y')])
    if project.ear_tag:
        overview_data.append(['Ear Tag', project.ear_tag])
    if project.registration_number:
        overview_data.append(['Registration', project.registration_number])
    if project.yqca_number:
        exp = (f' (exp {project.yqca_expiry.strftime("%m/%d/%y")})' if project.yqca_expiry else '')
        overview_data.append(['YQCA #', f'{project.yqca_number}{exp}'])
    if project.notes:
        overview_data.append(['Notes', project.notes])
    if overview_data:
        ot = Table(overview_data, colWidths=[2*inch, 4.5*inch])
        ot.setStyle(tbl_style())
        story.append(ot)
        story.append(sp(12))

    goals = Goal.query.filter_by(project_id=project_id).all()
    if goals:
        story.append(Paragraph('Project Goals', S_H2))
        g_data = [['#', 'Goal', 'Status']]
        for i, g in enumerate(goals, 1):
            g_data.append([str(i), g.text, '✓ Complete' if g.completed else 'In Progress'])
        gt = Table(g_data, colWidths=[0.3*inch, 5.2*inch, 1*inch])
        gt.setStyle(tbl_style([('TEXTCOLOR', (2, 1), (2, -1), GREEN)]))
        story.append(gt)
        story.append(sp(12))

    activities = ProjectActivity.query.filter_by(project_id=project_id).order_by(ProjectActivity.date).all()
    total_hours = sum(a.hours or 0 for a in activities)
    if activities:
        story.append(Paragraph(f'Activity Log  ({total_hours:.1f} total hours)', S_H2))
        a_data = [['Date', 'Activity', 'Hours', 'Notes']]
        for a in activities:
            a_data.append([
                a.date.strftime('%m/%d/%y') if a.date else '—',
                a.title,
                f'{a.hours:.2f}' if a.hours else '—',
                a.notes or ''
            ])
        at = Table(a_data, colWidths=[0.9*inch, 2.8*inch, 0.6*inch, 2.2*inch])
        at.setStyle(tbl_style())
        story.append(at)
        story.append(sp(8))
    story.append(PageBreak())

    story.append(Paragraph('Financial Records', S_H1))
    story.append(hr())
    expenses = Expense.query.filter_by(project_id=project_id).order_by(Expense.date).all()
    total_expenses = sum(e.amount for e in expenses)
    if expenses:
        story.append(Paragraph('Expenses', S_H2))
        e_data = [['Date', 'Category', 'Vendor', 'Amount', 'Notes']]
        for e in expenses:
            e_data.append([
                e.date.strftime('%m/%d/%y'),
                e.category.replace('_', ' ').title(),
                e.vendor or '—',
                f'${e.amount:.2f}',
                (e.notes or '')[:40]
            ])
        e_data.append(['', '', 'TOTAL EXPENSES', f'${total_expenses:.2f}', ''])
        et = Table(e_data, colWidths=[0.8*inch, 1.3*inch, 1.4*inch, 0.9*inch, 2.1*inch])
        et.setStyle(tbl_style([
            ('FONTNAME', (-3, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), DARK_CARD),
            ('TEXTCOLOR', (0, -1), (-1, -1), GOLD_LIGHT),
        ]))
        story.append(et)
        story.append(sp(10))

    income_records = IncomeRecord.query.filter_by(project_id=project_id).order_by(IncomeRecord.date).all()
    auction_sales = AuctionSale.query.filter_by(project_id=project_id).all()
    total_income = (sum(r.amount for r in income_records) + sum(s.net_proceeds for s in auction_sales))
    if income_records or auction_sales:
        story.append(Paragraph('Income', S_H2))
        i_data = [['Date', 'Category', 'Source / Buyer', 'Amount']]
        for r in income_records:
            i_data.append([r.date.strftime('%m/%d/%y'), r.category.replace('_', ' ').title(), r.source or '—', f'${r.amount:.2f}'])
        for s in auction_sales:
            detail = f'${s.price_per_lb:.3f}/lb' if s.price_per_lb else 'flat price'
            i_data.append([s.sale_date.strftime('%m/%d/%y'), 'Auction Sale', f'{s.buyer_name} ({detail})', f'${s.net_proceeds:.2f}'])
        i_data.append(['', 'TOTAL INCOME', '', f'${total_income:.2f}'])
        it = Table(i_data, colWidths=[0.8*inch, 1.4*inch, 3.0*inch, 1.3*inch])
        it.setStyle(tbl_style([
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), DARK_CARD),
            ('TEXTCOLOR', (0, -1), (-1, -1), GOLD_LIGHT),
        ]))
        story.append(it)
        story.append(sp(10))

    net = total_income - total_expenses
    st = Table([
        ['Total Expenses', f'${total_expenses:.2f}'],
        ['Total Income', f'${total_income:.2f}'],
        ['Net Profit / Loss', f'{"+" if net >= 0 else ""}${net:.2f}'],
    ], colWidths=[4*inch, 2.5*inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), DARK_CARD),
        ('TEXTCOLOR', (0, 0), (0, -1), WHITE),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (1, 0), (1, 0), RED_LIGHT),
        ('TEXTCOLOR', (1, 1), (1, 1), GREEN),
        ('TEXTCOLOR', (1, 2), (1, 2), GREEN if net >= 0 else RED_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#C4A060')),
    ]))
    story.append(st)

    inv_items = InventoryItem.query.filter_by(project_id=project_id).all()
    if inv_items:
        story.append(sp(10))
        story.append(Paragraph('Inventory', S_H2))
        beg = [i for i in inv_items if i.inventory_type == 'beginning']
        end = [i for i in inv_items if i.inventory_type == 'ending']
        beg_total = sum(i.total_value for i in beg)
        end_total = sum(i.total_value for i in end)
        inv_data = [['Type', 'Description', 'Qty', 'Unit Value', 'Total']]
        for i in beg + end:
            inv_data.append([
                'Beginning' if i in beg else 'Ending', i.item_description,
                f'{i.quantity:.1f}', f'${i.unit_value:.2f}', f'${i.total_value:.2f}'
            ])
        inv_data.append(['', 'Net Inventory Change', '', '', f'${end_total - beg_total:.2f}'])
        ivt = Table(inv_data, colWidths=[0.8*inch, 2.5*inch, 0.5*inch, 1.0*inch, 0.7*inch])
        ivt.setStyle(tbl_style())
        story.append(ivt)
    story.append(PageBreak())

    is_livestock = type_cfg.get('is_livestock', False)
    if is_livestock:
        story.append(Paragraph('Livestock Performance', S_H1))
        story.append(hr())
        weigh_tasks = Task.query.filter_by(project_id=project_id, task_type='weigh').filter(Task.weight_lbs.isnot(None)).order_by(Task.logged_at).all()
        if project.initial_weight or weigh_tasks:
            story.append(Paragraph('Weight History', S_H2))
            w_data = [['Date', 'Weight (lbs)', 'Gain', 'ADG']]
            prev_w = project.initial_weight
            prev_d = project.start_date
            if project.initial_weight and project.start_date:
                w_data.append([project.start_date.strftime('%m/%d/%y'), f'{project.initial_weight:.1f}', '— (start)', '—'])
            for t in weigh_tasks:
                w = t.weight_lbs
                d = t.logged_at.date() if t.logged_at else None
                gain = f'{w - prev_w:.1f}' if prev_w else '—'
                adg = '—'
                if prev_w and prev_d and d and d > prev_d:
                    days = (d - prev_d).days
                    adg = f'{(w - prev_w) / days:.3f}' if days else '—'
                w_data.append([d.strftime('%m/%d/%y') if d else '—', f'{w:.1f}', gain, adg])
                prev_w = w
                prev_d = d
            wt = Table(w_data, colWidths=[1.0*inch, 1.4*inch, 1.2*inch, 1.0*inch])
            wt.setStyle(tbl_style([('TEXTCOLOR', (3, 1), (3, -1), GOLD_LIGHT)]))
            story.append(wt)
            story.append(sp(10))

        feed_logs = FeedLog.query.filter_by(project_id=project_id).all()
        total_feed_lbs = sum(l.amount_lbs for l in feed_logs)
        total_feed_cost = sum(l.amount_lbs / l.bag_size_lbs * l.cost_per_bag for l in feed_logs if l.cost_per_bag and l.bag_size_lbs and l.bag_size_lbs > 0)
        if feed_logs:
            story.append(Paragraph('Feed Summary', S_H2))
            feed_summary = {}
            for l in feed_logs:
                key = f'{l.feed_brand or "Unknown"} ({l.feed_type})'
                feed_summary.setdefault(key, {'lbs': 0, 'cost': 0})
                feed_summary[key]['lbs'] += l.amount_lbs
                if l.cost_per_bag and l.bag_size_lbs and l.bag_size_lbs > 0:
                    feed_summary[key]['cost'] += l.amount_lbs / l.bag_size_lbs * l.cost_per_bag
            fd = [['Feed Product', 'Total lbs', 'Est. Cost']]
            for name, vals in feed_summary.items():
                fd.append([name, f'{vals["lbs"]:.1f}', f'${vals["cost"]:.2f}'])
            fd.append(['TOTALS', f'{total_feed_lbs:.1f}', f'${total_feed_cost:.2f}'])
            fdt = Table(fd, colWidths=[3.5*inch, 1.2*inch, 1.2*inch])
            fdt.setStyle(tbl_style([
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), DARK_CARD),
                ('TEXTCOLOR', (0, -1), (-1, -1), GOLD_LIGHT),
            ]))
            story.append(fdt)
            story.append(sp(10))

        if weigh_tasks and project.initial_weight:
            final_w = weigh_tasks[-1].weight_lbs
            total_gain = final_w - project.initial_weight
            days_on = ((date_cls.today() - project.start_date).days if project.start_date else None)
            overall_adg = (round(total_gain / days_on, 3) if days_on and days_on > 0 else None)
            fcr = (round(total_feed_lbs / total_gain, 2) if total_gain > 0 and total_feed_lbs > 0 else None)
            feed_cplg = (round(total_feed_cost / total_gain, 2) if total_gain > 0 and total_feed_cost > 0 else None)
            tot_cplg = (round(total_expenses / total_gain, 2) if total_gain > 0 and total_expenses > 0 else None)
            story.append(Paragraph('Performance Calculations', S_H2))
            pt = Table([
                ['Starting Weight', f'{project.initial_weight:.1f} lbs'],
                ['Final / Current Weight', f'{final_w:.1f} lbs'],
                ['Total Weight Gain', f'{total_gain:.1f} lbs'],
                ['Days on Feed', str(days_on) if days_on else '—'],
                ['Overall ADG', f'{overall_adg:.3f} lbs/day' if overall_adg else '—'],
                ['Total Feed Fed', f'{total_feed_lbs:.1f} lbs'],
                ['Feed Conversion Ratio', f'{fcr}:1' if fcr else '—'],
                ['Total Feed Cost', f'${total_feed_cost:.2f}'],
                ['Feed Cost per lb Gain', f'${feed_cplg:.2f}' if feed_cplg else '—'],
                ['Total Cost per lb Gain', f'${tot_cplg:.2f}' if tot_cplg else '—'],
            ], colWidths=[3*inch, 3.5*inch])
            pt.setStyle(tbl_style([('TEXTCOLOR', (1, 1), (1, -1), GOLD_LIGHT)]))
            story.append(pt)

        health = HealthRecord.query.filter_by(project_id=project_id).order_by(HealthRecord.date).all()
        if health:
            story.append(sp(10))
            story.append(Paragraph('Health Records', S_H2))
            h_data = [['Date', 'Type', 'Product', 'Dosage/Route', 'Withdrawal End']]
            for r in health:
                route = f' / {r.route}' if r.route else ''
                h_data.append([
                    r.date.strftime('%m/%d/%y'),
                    r.record_type.replace('_', ' ').title(),
                    r.product_name,
                    f'{r.dosage or ""}{route}',
                    r.withdrawal_end_date.strftime('%m/%d/%y') if r.withdrawal_end_date else '—'
                ])
            ht = Table(h_data, colWidths=[0.8*inch, 1.1*inch, 1.5*inch, 1.3*inch, 1.0*inch])
            ht.setStyle(tbl_style())
            story.append(ht)
        story.append(PageBreak())

    entries = ShowEntry.query.filter_by(project_id=project_id).all()
    if entries:
        story.append(Paragraph('Show Results', S_H1))
        story.append(hr())
        shows_map = {s.id: s for s in Show.query.all()}
        s_data = [['Show', 'Date', 'Class', 'Ring', 'Placing', 'Ribbon']]
        for e in entries:
            show = shows_map.get(e.show_id)
            s_data.append([
                show.name if show else '—',
                show.start_date.strftime('%m/%d/%y') if show and show.start_date else '—',
                e.class_name or '—',
                e.ring or '—',
                e.placing or '—',
                e.ribbon_color or '—'
            ])
        sht = Table(s_data, colWidths=[1.8*inch, 0.9*inch, 1.3*inch, 0.7*inch, 0.7*inch, 0.9*inch])
        sht.setStyle(tbl_style())
        story.append(sht)

        auction_sales_all = AuctionSale.query.filter_by(project_id=project_id).all()
        if auction_sales_all:
            story.append(sp(10))
            story.append(Paragraph('Auction Sales', S_H2))
            au_data = [['Date', 'Buyer', 'Weight', 'Price/lb', 'Net Proceeds', 'Thank You']]
            for s in auction_sales_all:
                au_data.append([
                    s.sale_date.strftime('%m/%d/%y'), s.buyer_name,
                    f'{s.weight_at_sale:.1f} lbs' if s.weight_at_sale else '—',
                    f'${s.price_per_lb:.3f}' if s.price_per_lb else '—',
                    f'${s.net_proceeds:.2f}',
                    '✓ Sent' if s.thank_you_sent else 'Not sent'
                ])
            aut = Table(au_data, colWidths=[0.8*inch, 1.6*inch, 0.8*inch, 0.7*inch, 1.1*inch, 0.7*inch])
            aut.setStyle(tbl_style([('TEXTCOLOR', (5, 1), (5, -1), GREEN)]))
            story.append(aut)
        story.append(PageBreak())

    narr = ProjectNarrative.query.filter_by(project_id=project_id).first()
    skills = SkillsChecklist.query.filter_by(project_id=project_id).all()
    profiles_map = {p.id: p for p in Profile.query.all()}
    story.append(Paragraph('Project Story', S_H1))
    story.append(hr())
    story.append(Paragraph('Member reflection and narrative for 4-H record book.', S_MUTED))
    story.append(sp(8))
    sections = [
        ('My Project Goals', 'project_goals_narrative'),
        ('What I Did', 'what_i_did'),
        ('What I Learned', 'what_i_learned'),
        ('How I Improved', 'how_i_improved'),
        ('Skills Learned', 'skills_learned'),
    ]
    for label, field in sections:
        story.append(Paragraph(label, S_H2))
        text = getattr(narr, field, None) if narr else None
        if text:
            for para in text.split('\n'):
                if para.strip():
                    story.append(Paragraph(para.strip(), S_NARR))
        else:
            story.append(Paragraph('(not completed)', S_MUTED))
        story.append(sp(6))

    if skills:
        story.append(sp(6))
        story.append(Paragraph('Skills Checklist', S_H2))
        sk_data = [['Skill', 'Status', 'Completed By']]
        for s in skills:
            by = profiles_map.get(s.completed_by_id).name if s.completed_by_id in profiles_map else '—'
            sk_data.append([s.skill_name, '✓ Complete' if s.completed else 'In Progress', by if s.completed else '—'])
        skt = Table(sk_data, colWidths=[3.8*inch, 1.2*inch, 1.5*inch])
        skt.setStyle(tbl_style([('TEXTCOLOR', (1, 1), (1, -1), GREEN)]))
        story.append(skt)

    doc.build(story)
    buf.seek(0)
    safe_name = project.name.replace(' ', '_').replace('/', '_')
    filename = f'{safe_name}_record_book_{year}.pdf'
    return Response(buf.read(), mimetype='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@dashboard_bp.get('/reports/export-all')
def reports_export_all():
    active = Profile.query.get(session.get('active_profile_id'))
    if not active or active.role != 'parent':
        return redirect('/')

    import zipfile
    import io
    from flask import Response
    from datetime import date as dc

    projects = Project.query.all()
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for project in projects:
            try:
                with current_app.test_request_context():
                    session['active_profile_id'] = active.id
                    resp = reports_export(project.id)
                    safe = project.name.replace(' ', '_').replace('/', '_')
                    year = project.project_year or dc.today().year
                    zf.writestr(f'{safe}_record_book_{year}.pdf', resp.get_data())
            except Exception as e:
                current_app.logger.error(f'Export failed for project {project.id}: {e}')
    zip_buf.seek(0)
    fname = f'ProjectBarn_RecordBooks_{dc.today().isoformat()}.zip'
    return Response(zip_buf.read(), mimetype='application/zip',
        headers={'Content-Disposition': f'attachment; filename="{fname}"'})


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
        project.sub_type = (request.form.get("sub_type") or "").strip() or None
        project.sex = (request.form.get("sex") or "").strip() or None
        project.animal_dob = parse_date(request.form.get("animal_dob"))
        project.initial_weight = float(request.form.get("initial_weight") or 0) or None
        project.target_weight = float(request.form.get("target_weight") or 0) or None
        project.target_date = parse_date(request.form.get("target_date"))
        project.ear_tag = (request.form.get("ear_tag") or "").strip() or None
        project.tattoo = (request.form.get("tattoo") or "").strip() or None
        project.rfid_tag = (request.form.get("rfid_tag") or "").strip() or None
        project.registration_number = (request.form.get("registration_number") or "").strip() or None
        project.scrapie_tag = (request.form.get("scrapie_tag") or "").strip() or None
        project.coggins_date = parse_date(request.form.get("coggins_date"))
        project.yqca_number = (request.form.get("yqca_number") or "").strip() or None
        project.yqca_expiry = parse_date(request.form.get("yqca_expiry"))
        project.start_date = parse_date(request.form.get("start_date"))
        project.purchase_date = parse_date(request.form.get("purchase_date"))
        project.purchase_price = request.form.get("purchase_price", type=float) or 0
        project.notes = (request.form.get("notes") or "").strip() or None
        project.club_name = request.form.get('club_name', '').strip() or None
        project.county = request.form.get('county', '').strip() or None
        project.state = request.form.get('state', 'Texas').strip() or 'Texas'
        project.project_year = int(request.form.get('project_year') or 0) or None
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
        profile.club_name = request.form.get('club_name', '').strip() or None
        profile.county = request.form.get('county', '').strip() or None
        profile.state = request.form.get('state', 'Texas').strip() or 'Texas'
        profile.years_in_4h = int(request.form.get('years_in_4h') or 0) or None

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


@dashboard_bp.get('/api/breeds/<species>')
def api_breeds(species):
    from app.data.breeds import BREEDS
    data = BREEDS.get(species, {})
    return jsonify({
        'sub_types': data.get('sub_types', []),
        'breeds': data.get('breeds', [])
    })

@dashboard_bp.get('/projects/<int:project_id>/feed')
def feed_log(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    logs = FeedLog.query.filter_by(project_id=project_id)\
        .order_by(FeedLog.date.desc()).all()
    profiles = {p.id: p for p in Profile.query.all()}
    total_lbs = sum(l.amount_lbs for l in logs)
    total_cost = sum(
        (l.amount_lbs / l.bag_size_lbs * l.cost_per_bag)
        for l in logs
        if l.cost_per_bag and l.bag_size_lbs and l.bag_size_lbs > 0
    )
    weigh_tasks = Task.query.filter_by(
        project_id=project_id, task_type='weigh'
    ).filter(Task.weight_lbs.isnot(None)).order_by(Task.logged_at).all()
    total_gain = 0
    fcr = None
    cost_per_lb_gain = None
    if weigh_tasks and project.initial_weight:
        total_gain = weigh_tasks[-1].weight_lbs - project.initial_weight
        if total_gain > 0 and total_lbs > 0:
            fcr = round(total_lbs / total_gain, 2)
            if total_cost > 0:
                cost_per_lb_gain = round(total_cost / total_gain, 2)
    return render_template('feed_log.html',
        project=project, logs=logs, profiles=profiles,
        total_lbs=round(total_lbs, 1), total_cost=round(total_cost, 2),
        fcr=fcr, cost_per_lb_gain=cost_per_lb_gain,
        total_gain=round(total_gain, 1),
        page_title='Feed Log', back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']),
        today=date.today().isoformat())


@dashboard_bp.get('/projects/<int:project_id>/feed/add')
@dashboard_bp.post('/projects/<int:project_id>/feed/add')
def feed_log_add(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    if request.method == 'POST':
        from datetime import date as date_cls
        log = FeedLog(
            project_id=project_id,
            logged_by_id=session['active_profile_id'],
            date=parse_date(request.form.get('date')) or date_cls.today(),
            feed_brand=request.form.get('feed_brand', '').strip() or None,
            feed_type=request.form.get('feed_type', 'grain'),
            amount_lbs=float(request.form.get('amount_lbs') or 0),
            feedings_per_day=int(request.form.get('feedings_per_day') or 1),
            cost_per_bag=float(request.form.get('cost_per_bag') or 0) or None,
            bag_size_lbs=float(request.form.get('bag_size_lbs') or 0) or None,
            notes=request.form.get('notes', '').strip() or None,
        )
        db.session.add(log)
        db.session.commit()
        return redirect(f'/projects/{project_id}/feed')
    return render_template('feed_log_add.html',
        project=project,
        page_title='Log Feed', back_url=f'/projects/{project_id}/feed',
        active_profile=Profile.query.get(session['active_profile_id']),
        today=date.today().isoformat())


@dashboard_bp.post('/projects/<int:project_id>/feed/<int:log_id>/delete')
def feed_log_delete(project_id, log_id):
    log = FeedLog.query.filter_by(
        id=log_id, project_id=project_id).first_or_404()
    active_profile = Profile.query.get_or_404(session['active_profile_id'])
    if active_profile.role != 'parent' and active_profile.id != log.logged_by_id:
        return redirect(f'/projects/{project_id}/feed')
    db.session.delete(log)
    db.session.commit()
    return redirect(f'/projects/{project_id}/feed')


@dashboard_bp.get('/projects/<int:project_id>/health')
def health_log(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    from datetime import date as date_cls
    records = HealthRecord.query.filter_by(project_id=project_id)\
        .order_by(HealthRecord.date.desc()).all()
    profiles = {p.id: p for p in Profile.query.all()}
    today = date_cls.today()
    active_withdrawals = [
        r for r in records
        if r.withdrawal_end_date and r.withdrawal_end_date >= today
    ]
    return render_template('health_log.html',
        project=project, records=records, profiles=profiles,
        today=today, active_withdrawals=active_withdrawals,
        page_title='Health Records', back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.get('/projects/<int:project_id>/health/add')
@dashboard_bp.post('/projects/<int:project_id>/health/add')
def health_log_add(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    if request.method == 'POST':
        from datetime import date as date_cls, timedelta
        treatment_date = parse_date(request.form.get('date')) or date_cls.today()
        withdrawal_days = int(request.form.get('withdrawal_days') or 0) or None
        withdrawal_end = None
        if withdrawal_days:
            withdrawal_end = treatment_date + timedelta(days=withdrawal_days)
        record = HealthRecord(
            project_id=project_id,
            logged_by_id=session['active_profile_id'],
            date=treatment_date,
            record_type=request.form.get('record_type', 'observation'),
            product_name=request.form.get('product_name', '').strip(),
            dosage=request.form.get('dosage', '').strip() or None,
            route=request.form.get('route') or None,
            lot_number=request.form.get('lot_number', '').strip() or None,
            administered_by=request.form.get('administered_by', '').strip() or None,
            withdrawal_days=withdrawal_days,
            withdrawal_end_date=withdrawal_end,
            cost=float(request.form.get('cost') or 0) or None,
            notes=request.form.get('notes', '').strip() or None,
        )
        db.session.add(record)
        if record.cost:
            expense = Expense(
                project_id=project_id,
                logged_by_id=session['active_profile_id'],
                amount=record.cost,
                category='vet',
                date=treatment_date,
                notes=f'{record.record_type.title()}: {record.product_name}'
            )
            db.session.add(expense)
        db.session.commit()
        return redirect(f'/projects/{project_id}/health')
    return render_template('health_log_add.html',
        project=project,
        page_title='Add Health Record',
        back_url=f'/projects/{project_id}/health',
        active_profile=Profile.query.get(session['active_profile_id']),
        today=date.today().isoformat())


@dashboard_bp.post('/projects/<int:project_id>/health/<int:record_id>/delete')
def health_log_delete(project_id, record_id):
    record = HealthRecord.query.filter_by(
        id=record_id, project_id=project_id).first_or_404()
    active_profile = Profile.query.get_or_404(session['active_profile_id'])
    if active_profile.role != 'parent':
        return redirect(f'/projects/{project_id}/health')
    db.session.delete(record)
    db.session.commit()
    return redirect(f'/projects/{project_id}/health')


@dashboard_bp.get('/shows/<int:show_id>/entries/<int:entry_id>/compliance')
@dashboard_bp.post('/shows/<int:show_id>/entries/<int:entry_id>/compliance')
def show_compliance(show_id, entry_id):
    show = Show.query.get_or_404(show_id)
    entry = ShowEntry.query.filter_by(
        id=entry_id, show_id=show_id).first_or_404()
    project = Project.query.get_or_404(entry.project_id)
    compliance = ShowCompliance.query.filter_by(
        show_entry_id=entry_id).first()
    if request.method == 'POST':
        if not compliance:
            compliance = ShowCompliance(
                show_entry_id=entry_id,
                project_id=entry.project_id)
            db.session.add(compliance)
        compliance.cvi_date = parse_date(request.form.get('cvi_date'))
        compliance.cvi_vet = request.form.get('cvi_vet', '').strip() or None
        compliance.cvi_expiry = parse_date(request.form.get('cvi_expiry'))
        compliance.yqca_verified = bool(request.form.get('yqca_verified'))
        compliance.health_test_type = (
            request.form.get('health_test_type', '').strip() or None)
        compliance.health_test_date = (
            parse_date(request.form.get('health_test_date')))
        compliance.health_test_result = (
            request.form.get('health_test_result', '').strip() or None)
        compliance.entry_fee_paid = bool(request.form.get('entry_fee_paid'))
        compliance.weigh_in_time = (
            request.form.get('weigh_in_time', '').strip() or None)
        compliance.weigh_in_weight = (
            float(request.form.get('weigh_in_weight') or 0) or None)
        compliance.weigh_in_official = (
            bool(request.form.get('weigh_in_official')))
        compliance.notes = request.form.get('notes', '').strip() or None
        db.session.commit()
        return redirect(f'/shows/{show_id}')
    return render_template('show_compliance.html',
        show=show, entry=entry, project=project,
        compliance=compliance,
        page_title='Show Compliance',
        back_url=f'/shows/{show_id}',
        today=date.today(),
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.get('/projects/<int:project_id>/auction')
def auction_list(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    sales = AuctionSale.query.filter_by(
        project_id=project_id).order_by(
        AuctionSale.sale_date.desc()).all()
    total_proceeds = sum(s.net_proceeds for s in sales)
    unsent = [s for s in sales if not s.thank_you_sent]
    return render_template('auction_list.html',
        project=project, sales=sales,
        total_proceeds=round(total_proceeds, 2),
        unsent=unsent,
        page_title='Auction Sales',
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.get('/projects/<int:project_id>/auction/add')
@dashboard_bp.post('/projects/<int:project_id>/auction/add')
def auction_add(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    shows = Show.query.order_by(Show.start_date.desc()).all()
    if request.method == 'POST':
        from datetime import date as date_cls
        weight = float(request.form.get('weight_at_sale') or 0) or None
        ppl = float(request.form.get('price_per_lb') or 0) or None
        flat = float(request.form.get('flat_price') or 0) or None
        if ppl and weight:
            total = round(weight * ppl, 2)
        elif flat:
            total = flat
        else:
            total = float(request.form.get('total_price') or 0)
        addon = float(request.form.get('addon_amount') or 0)
        deductions = float(request.form.get('deductions') or 0)
        net = round(total + addon - deductions, 2)
        sale = AuctionSale(
            project_id=project_id,
            show_id=int(request.form.get('show_id')) if
                request.form.get('show_id') else None,
            sale_date=parse_date(request.form.get('sale_date')) or
                date_cls.today(),
            buyer_name=request.form.get('buyer_name', '').strip(),
            buyer_business=request.form.get('buyer_business',
                '').strip() or None,
            weight_at_sale=weight,
            price_per_lb=ppl,
            flat_price=flat,
            total_price=total,
            addon_amount=addon,
            deductions=deductions,
            net_proceeds=net,
            notes=request.form.get('notes', '').strip() or None,
        )
        db.session.add(sale)
        from app.models import Expense
        income = Expense(
            project_id=project_id,
            logged_by_id=session['active_profile_id'],
            amount=net,
            category='other_expense',
            date=sale.sale_date,
            notes=f'Auction sale — {sale.buyer_name}'
                  f'{" @ " + str(ppl) + "/lb" if ppl else ""}'
        )
        db.session.add(income)
        db.session.commit()
        return redirect(f'/projects/{project_id}/auction')
    return render_template('auction_add.html',
        project=project, shows=shows,
        page_title='Add Auction Sale',
        back_url=f'/projects/{project_id}/auction',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.post('/projects/<int:project_id>/auction'
                   '/<int:sale_id>/thankyou')
def auction_thankyou(project_id, sale_id):
    sale = AuctionSale.query.filter_by(
        id=sale_id, project_id=project_id).first_or_404()
    from datetime import date as date_cls
    sale.thank_you_sent = True
    sale.thank_you_date = date_cls.today()
    db.session.commit()
    return redirect(f'/projects/{project_id}/auction')


@dashboard_bp.post('/projects/<int:project_id>/auction'
                   '/<int:sale_id>/delete')
def auction_delete(project_id, sale_id):
    active = Profile.query.get(session['active_profile_id'])
    if not active or active.role != 'parent':
        return redirect('/')
    sale = AuctionSale.query.filter_by(
        id=sale_id, project_id=project_id).first_or_404()
    db.session.delete(sale)
    db.session.commit()
    return redirect(f'/projects/{project_id}/auction')


@dashboard_bp.get('/projects/<int:project_id>/rog')
def rate_of_gain(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    weigh_tasks = Task.query.filter_by(
        project_id=project_id, task_type='weigh'
    ).filter(Task.weight_lbs.isnot(None)).order_by(Task.logged_at).all()
    entries = []
    prev_weight = project.initial_weight
    prev_date = project.start_date
    for t in weigh_tasks:
        w = t.weight_lbs
        d = t.logged_at.date() if t.logged_at else None
        adg = None
        if prev_weight and prev_date and d and d > prev_date:
            days = (d - prev_date).days
            adg = round((w - prev_weight) / days, 3) if days else None
        entries.append({'date': d, 'weight': w, 'adg': adg,
                        'task': t})
        prev_weight = w
        prev_date = d
    return render_template('rate_of_gain.html',
        project=project, entries=entries,
        page_title='Rate of Gain',
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.get('/projects/<int:project_id>/income')
@dashboard_bp.post('/projects/<int:project_id>/income')
def income_add(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    records = IncomeRecord.query.filter_by(
        project_id=project_id).order_by(
        IncomeRecord.date.desc()).all()
    if request.method == 'POST':
        from datetime import date as date_cls
        record = IncomeRecord(
            project_id=project_id,
            logged_by_id=session['active_profile_id'],
            date=parse_date(request.form.get('date')) or date_cls.today(),
            category=request.form.get('category', 'other'),
            amount=float(request.form.get('amount') or 0),
            source=request.form.get('source', '').strip() or None,
            notes=request.form.get('notes', '').strip() or None,
        )
        db.session.add(record)
        db.session.commit()
        return redirect(f'/projects/{project_id}/income')
    total_income = sum(r.amount for r in records)
    return render_template('income_list.html',
        project=project, records=records,
        total_income=round(total_income, 2),
        page_title='Income', back_url=f'/projects/{project_id}',
        today=date.today().isoformat(),
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.post('/projects/<int:project_id>/income'
                   '/<int:record_id>/delete')
def income_delete(project_id, record_id):
    active = Profile.query.get(session['active_profile_id'])
    if not active or active.role != 'parent':
        return redirect('/')
    record = IncomeRecord.query.filter_by(
        id=record_id, project_id=project_id).first_or_404()
    db.session.delete(record)
    db.session.commit()
    return redirect(f'/projects/{project_id}/income')


@dashboard_bp.get('/projects/<int:project_id>/inventory')
@dashboard_bp.post('/projects/<int:project_id>/inventory')
def inventory(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    items = InventoryItem.query.filter_by(
        project_id=project_id).order_by(
        InventoryItem.inventory_date.desc()).all()
    beginning = [i for i in items if i.inventory_type == 'beginning']
    ending = [i for i in items if i.inventory_type == 'ending']
    beginning_total = sum(i.total_value for i in beginning)
    ending_total = sum(i.total_value for i in ending)
    if request.method == 'POST':
        from datetime import date as date_cls
        qty = float(request.form.get('quantity') or 1)
        unit_val = float(request.form.get('unit_value') or 0)
        item = InventoryItem(
            project_id=project_id,
            item_description=request.form.get('item_description', '').strip(),
            quantity=qty,
            unit_value=unit_val,
            total_value=round(qty * unit_val, 2),
            inventory_date=parse_date(
                request.form.get('inventory_date')) or date_cls.today(),
            inventory_type=request.form.get('inventory_type', 'ending'),
        )
        db.session.add(item)
        db.session.commit()
        return redirect(f'/projects/{project_id}/inventory')
    return render_template('inventory.html',
        project=project, beginning=beginning, ending=ending,
        beginning_total=round(beginning_total, 2),
        ending_total=round(ending_total, 2),
        net_change=round(ending_total - beginning_total, 2),
        page_title='Inventory', back_url=f'/projects/{project_id}',
        today=date.today().isoformat(),
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.post('/projects/<int:project_id>/inventory'
                   '/<int:item_id>/delete')
def inventory_delete(project_id, item_id):
    active = Profile.query.get(session['active_profile_id'])
    if not active or active.role != 'parent':
        return redirect('/')
    item = InventoryItem.query.filter_by(
        id=item_id, project_id=project_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return redirect(f'/projects/{project_id}/inventory')


@dashboard_bp.get('/projects/<int:project_id>/financial')
def financial_summary(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    from datetime import date as date_cls

    expenses = Expense.query.filter_by(project_id=project_id)        .order_by(Expense.date).all()
    expense_by_cat = {}
    for e in expenses:
        expense_by_cat.setdefault(e.category, []).append(e)
    total_expenses = sum(e.amount for e in expenses)

    income_records = IncomeRecord.query.filter_by(
        project_id=project_id).order_by(IncomeRecord.date).all()
    auction_sales = AuctionSale.query.filter_by(
        project_id=project_id).all()
    total_income_records = sum(r.amount for r in income_records)
    total_auction = sum(s.net_proceeds for s in auction_sales)
    total_income = total_income_records + total_auction
    net_profit_loss = total_income - total_expenses

    feed_logs = FeedLog.query.filter_by(project_id=project_id).all()
    total_feed_lbs = sum(l.amount_lbs for l in feed_logs)
    total_feed_cost = sum(
        (l.amount_lbs / l.bag_size_lbs * l.cost_per_bag)
        for l in feed_logs
        if l.cost_per_bag and l.bag_size_lbs and l.bag_size_lbs > 0
    )

    weigh_tasks = Task.query.filter_by(
        project_id=project_id, task_type='weigh'
    ).filter(Task.weight_lbs.isnot(None))     .order_by(Task.logged_at).all()
    total_gain = 0
    fcr = None
    feed_cost_per_lb = None
    total_cost_per_lb = None
    current_weight = weigh_tasks[-1].weight_lbs if weigh_tasks else None
    if weigh_tasks and project.initial_weight:
        total_gain = weigh_tasks[-1].weight_lbs - project.initial_weight
        if total_gain > 0:
            if total_feed_lbs > 0:
                fcr = round(total_feed_lbs / total_gain, 2)
            if total_feed_cost > 0:
                feed_cost_per_lb = round(total_feed_cost / total_gain, 2)
            if total_expenses > 0:
                total_cost_per_lb = round(total_expenses / total_gain, 2)

    days_on_feed = None
    if project.start_date:
        days_on_feed = (date_cls.today() - project.start_date).days

    inventory_items = InventoryItem.query.filter_by(
        project_id=project_id).all()
    beginning_inv = sum(i.total_value for i in inventory_items
                        if i.inventory_type == 'beginning')
    ending_inv = sum(i.total_value for i in inventory_items
                     if i.inventory_type == 'ending')

    tasks_with_duration = Task.query.filter_by(
        project_id=project_id).filter(
        Task.duration_minutes.isnot(None)).all()
    total_hours = round(
        sum(t.duration_minutes for t in tasks_with_duration) / 60, 1)

    return render_template('financial_summary.html',
        project=project,
        expenses=expenses,
        expense_by_cat=expense_by_cat,
        expense_categories=EXPENSE_CATEGORIES,
        total_expenses=round(total_expenses, 2),
        income_records=income_records,
        auction_sales=auction_sales,
        total_income=round(total_income, 2),
        net_profit_loss=round(net_profit_loss, 2),
        total_feed_lbs=round(total_feed_lbs, 1),
        total_feed_cost=round(total_feed_cost, 2),
        total_gain=round(total_gain, 1),
        current_weight=current_weight,
        fcr=fcr,
        feed_cost_per_lb=feed_cost_per_lb,
        total_cost_per_lb=total_cost_per_lb,
        days_on_feed=days_on_feed,
        beginning_inv=round(beginning_inv, 2),
        ending_inv=round(ending_inv, 2),
        net_inv_change=round(ending_inv - beginning_inv, 2),
        total_hours=total_hours,
        page_title='Financial Summary',
        back_url=f'/projects/{project_id}',
        active_profile=Profile.query.get(session['active_profile_id']))


@dashboard_bp.get('/projects/<int:project_id>/expenses/csv')
def expenses_csv(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    import csv
    import io
    from flask import Response
    expenses = Expense.query.filter_by(
        project_id=project_id).order_by(Expense.date).all()
    profiles = {p.id: p for p in Profile.query.all()}
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Category', 'Vendor', 'Amount', 'Notes',
                     'Logged By'])
    for e in expenses:
        writer.writerow([
            e.date.isoformat(),
            e.category.replace('_', ' ').title(),
            e.vendor or '',
            f'{e.amount:.2f}',
            e.notes or '',
            profiles.get(e.logged_by_id, type('', (), {'name': ''})()).name
        ])
    output.seek(0)
    filename = f'{project.name.replace(" ","_")}_expenses.csv'
    return Response(output.getvalue(), mimetype='text/csv',
        headers={'Content-Disposition':
                 f'attachment; filename="{filename}"'})


@dashboard_bp.get('/projects/<int:project_id>/financial/csv')
def financial_csv(project_id):
    project = Project.query.get_or_404(project_id)
    require_project_access(project)
    import csv
    import io
    from flask import Response
    expenses = Expense.query.filter_by(
        project_id=project_id).order_by(Expense.date).all()
    income = IncomeRecord.query.filter_by(
        project_id=project_id).order_by(IncomeRecord.date).all()
    auction = AuctionSale.query.filter_by(
        project_id=project_id).order_by(AuctionSale.sale_date).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['--- EXPENSES ---'])
    writer.writerow(['Date', 'Category', 'Vendor', 'Amount', 'Notes'])
    for e in expenses:
        writer.writerow([e.date.isoformat(),
            e.category.replace('_', ' ').title(),
            e.vendor or '', f'{e.amount:.2f}', e.notes or ''])
    writer.writerow([])
    writer.writerow(['--- INCOME ---'])
    writer.writerow(['Date', 'Category', 'Source', 'Amount', 'Notes'])
    for r in income:
        writer.writerow([r.date.isoformat(),
            r.category.replace('_', ' ').title(),
            r.source or '', f'{r.amount:.2f}', r.notes or ''])
    for s in auction:
        writer.writerow([s.sale_date.isoformat(), 'Auction Sale',
            s.buyer_name, f'{s.net_proceeds:.2f}', s.notes or ''])
    output.seek(0)
    filename = f'{project.name.replace(" ","_")}_financial.csv'
    return Response(output.getvalue(), mimetype='text/csv',
        headers={'Content-Disposition':
                 f'attachment; filename="{filename}"'})
