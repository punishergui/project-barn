import os
import uuid
from datetime import date, datetime, timedelta

import bcrypt
from flask import Flask
from sqlalchemy import text

from app.models import AuctionSale, EquipmentItem, Expense, FeedInventory, FeedLog, Goal, HealthRecord, IncomeRecord, InventoryItem, Notification, PackingListItem, PackingListTemplate, Photo, Profile, Project, ProjectActivity, ProjectMaterial, ProjectNarrative, Show, ShowCompliance, ShowDay, ShowDayCheck, ShowEntry, SkillsChecklist, Task, db


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
    ]

    with db.engine.connect() as conn:
        for statement in statements:
            try:
                conn.execute(text(statement))
            except Exception:
                pass
        conn.commit()


def seed_if_empty() -> None:
    if Profile.query.count() != 0:
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
