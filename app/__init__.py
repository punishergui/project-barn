import os
import uuid
from datetime import date, datetime, timedelta

import bcrypt
from flask import Flask
from sqlalchemy import text

from app.models import Expense, Goal, Notification, Photo, Profile, Project, Show, ShowDay, ShowDayCheck, ShowEntry, Task, db


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    db_path = os.getenv("BARN_DB_PATH", "/data/barn.db")
    upload_dir = os.getenv("BARN_UPLOAD_DIR", "/data/uploads")

    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["BARN_UPLOAD_DIR"] = upload_dir
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    os.makedirs(upload_dir, exist_ok=True)

    db.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.dashboard import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)

    with app.app_context():
        db.create_all()
        run_migrations()
        seed_if_empty()

    return app


def run_migrations() -> None:
    statements = [
        "ALTER TABLE show_entry ADD COLUMN day_number INTEGER",
        "ALTER TABLE show_entry ADD COLUMN ring TEXT",
        "ALTER TABLE show_entry ADD COLUMN class_name TEXT",
        "ALTER TABLE show_day ADD COLUMN date DATE",
        "ALTER TABLE show_day ADD COLUMN notes TEXT",
        "ALTER TABLE photo ADD COLUMN caption TEXT",
        "ALTER TABLE photo ADD COLUMN photo_type TEXT DEFAULT 'photo'",
        "ALTER TABLE photo ADD COLUMN show_day_id INTEGER",
        "ALTER TABLE photo ADD COLUMN show_id INTEGER",
        "ALTER TABLE photo ADD COLUMN project_id INTEGER",
        "ALTER TABLE photo ADD COLUMN uploaded_by_id INTEGER",
        "ALTER TABLE photo ADD COLUMN uploaded_at DATETIME",
        "ALTER TABLE goal ADD COLUMN completed_at DATETIME",
        "ALTER TABLE goal ADD COLUMN completed_by_id INTEGER",
        "ALTER TABLE notification ADD COLUMN link TEXT",
    ]

    with db.engine.connect() as conn:
        for statement in statements:
            try:
                conn.execute(text(statement))
            except Exception:
                pass
        conn.commit()


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


ALLOWED_UPLOAD_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp", "mp4", "mov"}


def save_upload(file_storage, upload_dir: str) -> str:
    if not file_storage or not file_storage.filename:
        raise ValueError("No file uploaded")

    original_name = file_storage.filename.rsplit("/", 1)[-1]
    if "." not in original_name:
        raise ValueError("Invalid file type")

    extension = original_name.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise ValueError("Invalid file type")

    filename = f"{uuid.uuid4().hex}.{extension}"
    file_storage.save(os.path.join(upload_dir, filename))
    return filename
