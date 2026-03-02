import os
from datetime import date, datetime, timedelta

import bcrypt
from flask import Flask

from app.models import Expense, Profile, Project, Show, ShowEntry, Task, db


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    db_path = os.getenv("BARN_DB_PATH", "/data/barn.db")
    upload_dir = os.getenv("BARN_UPLOAD_DIR", "/data/uploads")

    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["BARN_UPLOAD_DIR"] = upload_dir

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    os.makedirs(upload_dir, exist_ok=True)

    db.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

    with app.app_context():
        db.create_all()
        seed_if_empty()

    return app


def seed_if_empty() -> None:
    if Profile.query.first():
        return

    mom_pin = bcrypt.hashpw(b"1234", bcrypt.gensalt()).decode("utf-8")

    mom = Profile(name="Mom", role="parent", pin_hash=mom_pin, color="#5C2E00")
    jake = Profile(name="Jake", role="kid", pin_hash=None, color="#1A3A5C")
    db.session.add_all([mom, jake])
    db.session.flush()

    bella = Project(name="Bella", type="cow", owner_id=jake.id, breed="Holstein")
    oscar = Project(name="Oscar", type="pig", owner_id=jake.id, breed="Market Hog")
    db.session.add_all([bella, oscar])
    db.session.flush()

    today = datetime.now().replace(second=0, microsecond=0)
    tasks = [
        Task(project_id=bella.id, logged_by_id=mom.id, task_type="feed", notes="Fed Bella", logged_at=today.replace(hour=7, minute=30)),
        Task(project_id=oscar.id, logged_by_id=jake.id, task_type="feed", notes="Fed Oscar", logged_at=today.replace(hour=8, minute=0)),
        Task(project_id=bella.id, logged_by_id=jake.id, task_type="walk", notes="Walk Bella • Due 5:30 PM", logged_at=None),
        Task(project_id=oscar.id, logged_by_id=jake.id, task_type="weigh", notes="Weigh Oscar • Due today", logged_at=None),
    ]
    db.session.add_all(tasks)

    show = Show(
        name="County Fair",
        location="Madison Fairgrounds",
        start_date=date.today() + timedelta(days=30),
        end_date=None,
        notes=None,
    )
    db.session.add(show)

    db.session.commit()
