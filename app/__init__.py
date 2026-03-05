import os
import uuid
from datetime import date, datetime, timedelta

import bcrypt
from flask import Flask
from sqlalchemy import text

from app.models import AppSetting, AuctionSale, EquipmentItem, Expense, ExpenseAllocation, ExpenseReceipt, FeedEntry, FeedInventory, FeedInventorySimple, FeedLog, Goal, HealthEntry, HealthRecord, IncomeRecord, InventoryItem, Media, Notification, PackingListItem, PackingListTemplate, Photo, Placing, Profile, Project, ProjectActivity, ProjectMaterial, ProjectNarrative, ProjectTask, Show, ShowCompliance, ShowDay, ShowDayCheck, ShowEntry, SkillsChecklist, Task, TaskItem, TimelineEntry, WeightEntry, db


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
    from app.routes.api import api_bp
    from app.cli import init_app as init_cli

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(api_bp)
    init_cli(app)

    with app.app_context():
        db.create_all()
        run_migrations()
        if AppSetting.query.count() == 0:
            db.session.add(AppSetting(family_name="", allow_kid_task_toggle=False))
            db.session.commit()
        seed_if_empty()
        seed_default_packing_lists(app)

    return app


def run_migrations() -> None:
    statements = [
        "ALTER TABLE show_entry ADD COLUMN day_number INTEGER",
        "ALTER TABLE show_entry ADD COLUMN ring TEXT",
        "ALTER TABLE show_entry ADD COLUMN class_name TEXT",
        "ALTER TABLE show_day ADD COLUMN date DATE",
        "ALTER TABLE show_day ADD COLUMN notes TEXT",
        "ALTER TABLE show_day ADD COLUMN label TEXT",
        "ALTER TABLE show_entry ADD COLUMN division TEXT",
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
        "ALTER TABLE profile ADD COLUMN archived BOOLEAN DEFAULT 0",
        "ALTER TABLE profile ADD COLUMN birthdate DATE",
        "ALTER TABLE project ADD COLUMN start_date DATE",
        "ALTER TABLE project ADD COLUMN purchase_date DATE",
        "ALTER TABLE project ADD COLUMN sub_type TEXT",
        "ALTER TABLE project ADD COLUMN sex TEXT",
        "ALTER TABLE project ADD COLUMN animal_dob DATE",
        "ALTER TABLE project ADD COLUMN ear_tag TEXT",
        "ALTER TABLE project ADD COLUMN tattoo TEXT",
        "ALTER TABLE project ADD COLUMN rfid_tag TEXT",
        "ALTER TABLE project ADD COLUMN registration_number TEXT",
        "ALTER TABLE project ADD COLUMN scrapie_tag TEXT",
        "ALTER TABLE project ADD COLUMN coggins_date DATE",
        "ALTER TABLE project ADD COLUMN yqca_number TEXT",
        "ALTER TABLE project ADD COLUMN yqca_expiry DATE",
        "ALTER TABLE project ADD COLUMN initial_weight REAL",
        "ALTER TABLE project ADD COLUMN target_weight REAL",
        "ALTER TABLE project ADD COLUMN target_date DATE",
        "ALTER TABLE show_entry ADD COLUMN judge_notes TEXT",
        "ALTER TABLE feed_log ADD COLUMN feedings_per_day INTEGER DEFAULT 1",
        "ALTER TABLE health_record ADD COLUMN lot_number TEXT",
        "ALTER TABLE health_record ADD COLUMN administered_by TEXT",
        "ALTER TABLE show_compliance ADD COLUMN notes TEXT",
        "ALTER TABLE auction_sale ADD COLUMN flat_price REAL",
        "ALTER TABLE auction_sale ADD COLUMN buyer_business TEXT",
        "ALTER TABLE expense ADD COLUMN vendor TEXT",
        "ALTER TABLE expense ADD COLUMN receipt_url TEXT",
        "ALTER TABLE expense ADD COLUMN created_at DATETIME",
        "ALTER TABLE expense ADD COLUMN updated_at DATETIME",
        "ALTER TABLE project ADD COLUMN status TEXT DEFAULT 'active'",
        "ALTER TABLE project ADD COLUMN updated_at DATETIME",
        "ALTER TABLE project_activity ADD COLUMN hours REAL",
        "ALTER TABLE skills_checklist ADD COLUMN sort_order INTEGER DEFAULT 0",
        "ALTER TABLE project_material ADD COLUMN date_purchased DATE",
        "ALTER TABLE project_narrative ADD COLUMN how_i_improved TEXT",
        "ALTER TABLE project ADD COLUMN club_name TEXT",
        "ALTER TABLE project ADD COLUMN county TEXT",
        "ALTER TABLE project ADD COLUMN state TEXT DEFAULT 'Texas'",
        "ALTER TABLE project ADD COLUMN project_year INTEGER",
        "ALTER TABLE profile ADD COLUMN club_name TEXT",
        "ALTER TABLE profile ADD COLUMN county TEXT",
        "ALTER TABLE profile ADD COLUMN state TEXT DEFAULT 'Texas'",
        "ALTER TABLE profile ADD COLUMN years_in_4h INTEGER",
        "ALTER TABLE feed_log ADD COLUMN feed_inventory_id INTEGER REFERENCES feed_inventory(id)",
        "ALTER TABLE feed_log ADD COLUMN amount_unit TEXT DEFAULT 'lbs'",
        "ALTER TABLE feed_log ADD COLUMN task_id INTEGER REFERENCES task(id)",
        "ALTER TABLE show_day_check ADD COLUMN template_item_id INTEGER REFERENCES packing_list_item(id)",
        "ALTER TABLE show_day_check ADD COLUMN project_id INTEGER REFERENCES project(id)",
        "ALTER TABLE show_day_check ADD COLUMN show_id INTEGER REFERENCES show(id)",
        "ALTER TABLE show ADD COLUMN created_at DATETIME",
        "ALTER TABLE show_entry ADD COLUMN weight REAL",
        "ALTER TABLE placing ADD COLUMN placing TEXT",
        "ALTER TABLE placing ADD COLUMN created_at DATETIME",
        "CREATE TABLE IF NOT EXISTS timeline_entry (id INTEGER NOT NULL PRIMARY KEY, project_id INTEGER NOT NULL, type VARCHAR(40) NOT NULL, title VARCHAR(120) NOT NULL, description TEXT, date DATE NOT NULL, created_at DATETIME NOT NULL, FOREIGN KEY(project_id) REFERENCES project (id))",
        "CREATE TABLE IF NOT EXISTS media (id INTEGER NOT NULL PRIMARY KEY, project_id INTEGER, show_id INTEGER, show_day_id INTEGER, file_name VARCHAR(255) NOT NULL, url VARCHAR(255) NOT NULL, caption TEXT, created_at DATETIME NOT NULL, FOREIGN KEY(project_id) REFERENCES project (id), FOREIGN KEY(show_id) REFERENCES show (id), FOREIGN KEY(show_day_id) REFERENCES show_day (id))",
    ]

    with db.engine.connect() as conn:
        for statement in statements:
            try:
                conn.execute(text(statement))
            except Exception:
                pass
        try:
            conn.execute(text("CREATE TABLE IF NOT EXISTS placing (id INTEGER PRIMARY KEY, entry_id INTEGER NOT NULL REFERENCES show_entry(id), show_day_id INTEGER NOT NULL REFERENCES show_day(id), ring TEXT, placing TEXT NOT NULL, points REAL, judge TEXT, notes TEXT, created_at DATETIME)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS task_item (id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES project(id), title TEXT NOT NULL, due_date DATE, recurrence TEXT NOT NULL DEFAULT 'none', assigned_profile_id INTEGER REFERENCES profile(id), status TEXT NOT NULL DEFAULT 'open', priority TEXT NOT NULL DEFAULT 'normal', notes TEXT, created_at DATETIME, updated_at DATETIME, completed_at DATETIME)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS app_setting (id INTEGER PRIMARY KEY, family_name TEXT, allow_kid_task_toggle BOOLEAN NOT NULL DEFAULT 0)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS timeline_entry (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES project(id), type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, date DATE NOT NULL, created_at DATETIME NOT NULL)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY, project_id INTEGER REFERENCES project(id), show_id INTEGER REFERENCES show(id), show_day_id INTEGER REFERENCES show_day(id), file_name TEXT NOT NULL, url TEXT NOT NULL, caption TEXT, created_at DATETIME NOT NULL)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS expense_receipt (id INTEGER PRIMARY KEY, expense_id INTEGER NOT NULL REFERENCES expense(id), file_name TEXT NOT NULL, url TEXT NOT NULL, caption TEXT, created_at DATETIME NOT NULL)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS expense_allocation (id INTEGER PRIMARY KEY, expense_id INTEGER NOT NULL REFERENCES expense(id), project_id INTEGER NOT NULL REFERENCES project(id), amount_cents INTEGER NOT NULL, created_at DATETIME NOT NULL)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES project(id), title TEXT NOT NULL, due_date DATE, is_daily BOOLEAN NOT NULL DEFAULT 0, is_completed BOOLEAN NOT NULL DEFAULT 0, completed_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS weight_entries (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES project(id), recorded_at DATE NOT NULL, weight_lbs REAL NOT NULL, notes TEXT)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS health_entries (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES project(id), recorded_at DATE NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, cost_cents INTEGER, vendor TEXT, attachment_receipt_url TEXT)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS feed_entries (id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES project(id), recorded_at DATE NOT NULL, feed_type TEXT NOT NULL, amount REAL NOT NULL, unit TEXT NOT NULL, cost_cents INTEGER, notes TEXT)"))
            conn.execute(text("CREATE TABLE IF NOT EXISTS feed_inventory_item (id INTEGER PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, qty_on_hand REAL NOT NULL DEFAULT 0, updated_at DATETIME NOT NULL)"))
        except Exception:
            pass
        conn.commit()


def seed_if_empty() -> None:
    if Profile.query.count() != 0:
        return

    if AppSetting.query.count() == 0:
        db.session.add(AppSetting(family_name="", allow_kid_task_toggle=False))
        db.session.commit()

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


def seed_default_packing_lists(app) -> None:
    if PackingListTemplate.query.count() != 0:
        return
    parent = Profile.query.filter_by(role='parent').first()
    if not parent:
        return

    base_items = [
        ('Health papers / CVI', 'documents'), ('YQCA certificate', 'documents'),
        ('Entry confirmation / premium book', 'documents'), ('W-9 form', 'documents'),
        ('Emergency vet contact', 'documents'), ('Feed for show days', 'animal_care'),
        ('Water buckets (2)', 'animal_care'), ('Shavings / bedding (2 bags)', 'animal_care'),
        ('Feed scoop', 'animal_care'), ('Halter + lead rope', 'animal_care'),
        ('Grooming supplies bag', 'animal_care'), ('Hoof trimmer / brush', 'animal_care'),
        ('Show sheen / coat spray', 'animal_care'), ('Fly spray', 'animal_care'),
        ('First aid kit', 'animal_care'), ('Show box / tack box', 'show_supplies'),
        ('Show stick', 'show_supplies'), ('Zip ties + bailing twine', 'show_supplies'),
        ('Fan + extension cord', 'show_supplies'), ('Stall sign materials', 'show_supplies'),
        ('Thank you note cards + stamps', 'show_supplies'), ('Show clothes (washed + pressed)', 'clothing'),
        ('Show boots (polished)', 'clothing'), ('Belt', 'clothing'), ('Back number holder', 'clothing'),
    ]

    templates = [
        ('Livestock Show Essentials', None, list(base_items) + []),
        ('Pig Show', 'pig', list(base_items) + [
            ('Pig oil / show sheen', 'animal_care'), ('Show whip / cane', 'animal_care'),
            ('Ear tag pliers (backup)', 'animal_care'), ('Extra ear tags', 'animal_care'),
            ('Pig board / sorting panel', 'show_supplies'),
        ]),
        ('Goat Show', 'goat', list(base_items) + [
            ('Fitting stand + chains', 'animal_care'), ('Horn weights (if needed)', 'animal_care'),
            ('Blanket / coat (if clipped)', 'animal_care'), ('Leg/hoof paint (white)', 'animal_care'),
            ('Milk stand (if dairy)', 'show_supplies'), ('Bracing practice notes', 'show_supplies'),
        ]),
    ]

    for name, ptype, items in templates:
        tpl = PackingListTemplate(name=name, description='Default template', project_type=ptype, created_by_id=parent.id)
        db.session.add(tpl)
        db.session.flush()
        for idx, (item_name, category) in enumerate(items):
            db.session.add(PackingListItem(template_id=tpl.id, item_name=item_name, category=category, sort_order=idx))
    db.session.commit()
