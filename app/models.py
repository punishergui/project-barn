from datetime import date, datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint


db = SQLAlchemy()


class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(10), nullable=False)
    pin_hash = db.Column(db.String(255), nullable=True)
    avatar_path = db.Column(db.String(255), nullable=True)
    color = db.Column(db.String(20), nullable=False, default="#A08060")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    archived = db.Column(db.Boolean, default=False, nullable=False)
    birthdate = db.Column(db.Date, nullable=True)
    club_name = db.Column(db.String(120), nullable=True)
    county = db.Column(db.String(80), nullable=True)
    state = db.Column(db.String(40), nullable=True, default='Texas')
    years_in_4h = db.Column(db.Integer, nullable=True)

    __table_args__ = (CheckConstraint("role IN ('parent','kid','grandparent')", name="ck_profile_role"),)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=False)
    photo_path = db.Column(db.String(255), nullable=True)
    breed = db.Column(db.String(120), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    purchase_date = db.Column(db.Date, nullable=True)
    sub_type = db.Column(db.String(80), nullable=True)
    sex = db.Column(db.String(20), nullable=True)
    animal_dob = db.Column(db.Date, nullable=True)
    ear_tag = db.Column(db.String(40), nullable=True)
    tattoo = db.Column(db.String(40), nullable=True)
    rfid_tag = db.Column(db.String(40), nullable=True)
    registration_number = db.Column(db.String(80), nullable=True)
    scrapie_tag = db.Column(db.String(40), nullable=True)
    coggins_date = db.Column(db.Date, nullable=True)
    yqca_number = db.Column(db.String(40), nullable=True)
    yqca_expiry = db.Column(db.Date, nullable=True)
    initial_weight = db.Column(db.Float, nullable=True)
    target_weight = db.Column(db.Float, nullable=True)
    target_date = db.Column(db.Date, nullable=True)
    purchase_price = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    club_name = db.Column(db.String(120), nullable=True)
    county = db.Column(db.String(80), nullable=True)
    state = db.Column(db.String(40), nullable=True, default='Texas')
    project_year = db.Column(db.Integer, nullable=True)
    goal = db.Column(db.Text, nullable=True)
    materials_needed = db.Column(db.Text, nullable=True)
    competition_category = db.Column(db.String(120), nullable=True)
    completion_target_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="active")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "type IN ('cow','dairy','pig','goat','sheep','chicken','rabbit','horse','baking','sewing','shooting','garden','robotics','photography','other')",
            name="ck_project_type",
        ),
    )


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=False)
    task_type = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    logged_at = db.Column(db.DateTime, nullable=True)
    weight_lbs = db.Column(db.Float, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)

    __table_args__ = (
        CheckConstraint("task_type IN ('feed','water','walk','groom','weigh','show','note','other')", name="ck_task_type"),
    )


class Show(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)


class ShowEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    ring = db.Column(db.String(40), nullable=True)
    class_name = db.Column(db.String(120), nullable=True)
    placing = db.Column(db.String(40), nullable=True)
    ribbon_color = db.Column(db.String(40), nullable=True)
    day_number = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    judge_notes = db.Column(db.Text, nullable=True)
    division = db.Column(db.String(120), nullable=True)
    weight = db.Column(db.Float, nullable=True)


class ShowDay(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=False)
    day_number = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=True)
    label = db.Column(db.String(80), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ShowDayTask(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_day_id = db.Column(db.Integer, db.ForeignKey("show_day.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    task_key = db.Column(db.String(80), nullable=False)
    task_label = db.Column(db.String(120), nullable=False)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)


class Placing(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey("show_entry.id"), nullable=False)
    show_day_id = db.Column(db.Integer, db.ForeignKey("show_day.id"), nullable=True)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=True)
    class_name = db.Column(db.String(120), nullable=True)
    ring = db.Column(db.String(40), nullable=True)
    placing = db.Column(db.String(80), nullable=False)
    ribbon_type = db.Column(db.String(40), nullable=True)
    points = db.Column(db.Float, nullable=True)
    judge = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    placed_at = db.Column(db.DateTime, nullable=True)
    photo_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class TimelineEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    type = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class TaskItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    recurrence = db.Column(db.String(20), nullable=False, default="none")
    assigned_profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="open")
    priority = db.Column(db.String(20), nullable=False, default="normal")
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("recurrence IN ('none','daily','weekly')", name="ck_task_item_recurrence"),
        CheckConstraint("status IN ('open','done')", name="ck_task_item_status"),
        CheckConstraint("priority IN ('low','normal','high')", name="ck_task_item_priority"),
    )


class ProjectTask(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    title = db.Column(db.Text, nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    is_daily = db.Column(db.Boolean, nullable=False, default=False)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class WeightEntry(db.Model):
    __tablename__ = "weight_entries"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    recorded_at = db.Column(db.Date, nullable=False)
    weight_lbs = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text, nullable=True)


class HealthEntry(db.Model):
    __tablename__ = "health_entries"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    recorded_at = db.Column(db.Date, nullable=False)
    category = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=False)
    cost_cents = db.Column(db.Integer, nullable=True)
    vendor = db.Column(db.Text, nullable=True)
    attachment_receipt_url = db.Column(db.Text, nullable=True)


class FeedEntry(db.Model):
    __tablename__ = "feed_entries"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    recorded_at = db.Column(db.Date, nullable=False)
    feed_type = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    unit = db.Column(db.Text, nullable=False)
    cost_cents = db.Column(db.Integer, nullable=True)
    feed_inventory_item_id = db.Column(db.Integer, db.ForeignKey("feed_inventory_item.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)


class FeedInventorySimple(db.Model):
    __tablename__ = "feed_inventory_item"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=False)
    brand = db.Column(db.Text, nullable=True)
    category = db.Column(db.Text, nullable=True)
    unit = db.Column(db.Text, nullable=False)
    qty_on_hand = db.Column(db.Float, nullable=False, default=0)
    low_stock_threshold = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AppSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    family_name = db.Column(db.String(120), nullable=True)
    county = db.Column(db.String(80), nullable=True)
    state = db.Column(db.String(40), nullable=True)
    club_name = db.Column(db.String(120), nullable=True)
    default_project_year = db.Column(db.Integer, nullable=True)
    default_species = db.Column(db.String(80), nullable=True)
    default_checklist_template = db.Column(db.String(120), nullable=True)
    default_show_tasks = db.Column(db.Text, nullable=True)
    brand_logo_url = db.Column(db.String(255), nullable=True)
    brand_show_name = db.Column(db.Boolean, default=True, nullable=False)
    allow_kid_task_toggle = db.Column(db.Boolean, default=False, nullable=False)


class ShowDayCheck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_day_id = db.Column(db.Integer, db.ForeignKey("show_day.id"), nullable=True)
    show_id = db.Column(db.Integer, db.ForeignKey('show.id'), nullable=True)
    item_name = db.Column(db.String(80), nullable=False)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    completed_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    template_item_id = db.Column(db.Integer,
        db.ForeignKey('packing_list_item.id'), nullable=True)
    project_id = db.Column(db.Integer,
        db.ForeignKey('project.id'), nullable=True)


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, default=date.today, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    vendor = db.Column(db.String(120), nullable=True)
    receipt_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    receipts = db.relationship("ExpenseReceipt", backref="expense", cascade="all, delete-orphan", lazy="selectin")
    allocations = db.relationship("ExpenseAllocation", backref="expense", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        CheckConstraint(
            "category IN ('feed','hay','bedding','vet','entry_fee','supplies',"
            "'equipment','transportation','registration','grooming',"
            "'breeding_fee','insurance','other_expense')",
            name="ck_expense_category",
        ),
    )


class ExpenseReceipt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    caption = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class ExpenseAllocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Photo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=True)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=True)
    show_day_id = db.Column(db.Integer, db.ForeignKey("show_day.id"), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    caption = db.Column(db.Text, nullable=True)
    photo_type = db.Column(db.String(20), nullable=False, default="photo")
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("photo_type IN ('photo','video','ribbon')", name="ck_photo_type"),
    )



class Media(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=True)
    timeline_entry_id = db.Column(db.Integer, db.ForeignKey("timeline_entry.id"), nullable=True)
    placing_id = db.Column(db.Integer, db.ForeignKey("placing.id"), nullable=True)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=True)
    show_day_id = db.Column(db.Integer, db.ForeignKey("show_day.id"), nullable=True)
    helper_profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    kind = db.Column(db.String(40), nullable=False, default="project")
    media_type = db.Column(db.String(20), nullable=False, default="photo")
    mime_type = db.Column(db.String(120), nullable=True)
    original_filename = db.Column(db.String(255), nullable=True)
    size = db.Column(db.Integer, nullable=True)
    file_name = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    caption = db.Column(db.Text, nullable=True)
    tags_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    orphaned_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)


class Goal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    text = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    completed_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=True)
    actor_profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.String(255), nullable=True)
    type = db.Column(db.String(40), nullable=False, default="reminder")
    read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    link = db.Column(db.String(255), nullable=True)


class ProjectReminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    type = db.Column(db.String(40), nullable=False, default="custom")
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    time_of_day = db.Column(db.String(10), nullable=True)
    frequency = db.Column(db.String(40), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    parent_locked = db.Column(db.Boolean, default=False, nullable=False)
    created_by_profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    updated_by_profile_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class FeedInventory(db.Model):
    """A bag/bale of feed purchased — reusable across feed logs."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer,
        db.ForeignKey('project.id'), nullable=False)
    logged_by_id = db.Column(db.Integer,
        db.ForeignKey('profile.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    brand = db.Column(db.String(120), nullable=True)
    feed_type = db.Column(db.String(20), nullable=False, default='grain')
    bag_size_lbs = db.Column(db.Float, nullable=True)
    cost_per_bag = db.Column(db.Float, nullable=True)
    cost_per_lb = db.Column(db.Float, nullable=True)
    purchase_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True, nullable=False)


class FeedLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey('profile.id'),
                             nullable=False)
    date = db.Column(db.Date, nullable=False)
    feed_brand = db.Column(db.String(120), nullable=True)
    feed_type = db.Column(db.String(20), nullable=False, default='grain')
    amount_lbs = db.Column(db.Float, nullable=False)
    feedings_per_day = db.Column(db.Integer, nullable=True, default=1)
    cost_per_bag = db.Column(db.Float, nullable=True)
    bag_size_lbs = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    feed_inventory_id = db.Column(db.Integer,
        db.ForeignKey('feed_inventory.id'), nullable=True)
    amount_unit = db.Column(db.String(20), nullable=True, default='lbs')
    task_id = db.Column(db.Integer,
        db.ForeignKey('task.id'), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "feed_type IN ('grain','hay','supplement','mineral',"
            "'pasture','complete','mixed','other')",
            name='ck_feedlog_type'),
    )


class HealthRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey('profile.id'),
                             nullable=False)
    date = db.Column(db.Date, nullable=False)
    record_type = db.Column(db.String(20), nullable=False)
    product_name = db.Column(db.String(120), nullable=False)
    dosage = db.Column(db.String(80), nullable=True)
    route = db.Column(db.String(20), nullable=True)
    lot_number = db.Column(db.String(80), nullable=True)
    administered_by = db.Column(db.String(80), nullable=True)
    withdrawal_days = db.Column(db.Integer, nullable=True)
    withdrawal_end_date = db.Column(db.Date, nullable=True)
    cost = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "record_type IN ('vaccination','medication','deworming',"
            "'vet_visit','observation','other')",
            name='ck_healthrecord_type'),
        CheckConstraint(
            "route IN ('IM','SQ','IV','oral','topical','pour-on','other')",
            name='ck_healthrecord_route'),
    )


class ShowCompliance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_entry_id = db.Column(db.Integer,
        db.ForeignKey('show_entry.id'), nullable=False)
    project_id = db.Column(db.Integer,
        db.ForeignKey('project.id'), nullable=False)
    cvi_date = db.Column(db.Date, nullable=True)
    cvi_vet = db.Column(db.String(120), nullable=True)
    cvi_expiry = db.Column(db.Date, nullable=True)
    yqca_verified = db.Column(db.Boolean, default=False, nullable=False)
    health_test_type = db.Column(db.String(80), nullable=True)
    health_test_date = db.Column(db.Date, nullable=True)
    health_test_result = db.Column(db.String(40), nullable=True)
    entry_fee_paid = db.Column(db.Boolean, default=False, nullable=False)
    weigh_in_time = db.Column(db.String(40), nullable=True)
    weigh_in_weight = db.Column(db.Float, nullable=True)
    weigh_in_official = db.Column(db.Boolean, default=False,
        nullable=False)
    notes = db.Column(db.Text, nullable=True)


class AuctionSale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_entry_id = db.Column(db.Integer,
        db.ForeignKey('show_entry.id'), nullable=True)
    project_id = db.Column(db.Integer,
        db.ForeignKey('project.id'), nullable=False)
    show_id = db.Column(db.Integer,
        db.ForeignKey('show.id'), nullable=True)
    sale_date = db.Column(db.Date, nullable=False)
    buyer_name = db.Column(db.String(120), nullable=False)
    buyer_business = db.Column(db.String(120), nullable=True)
    weight_at_sale = db.Column(db.Float, nullable=True)
    price_per_lb = db.Column(db.Float, nullable=True)
    flat_price = db.Column(db.Float, nullable=True)
    total_price = db.Column(db.Float, nullable=False)
    addon_amount = db.Column(db.Float, nullable=True, default=0)
    deductions = db.Column(db.Float, nullable=True, default=0)
    net_proceeds = db.Column(db.Float, nullable=False)
    thank_you_sent = db.Column(db.Boolean, default=False, nullable=False)
    thank_you_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)


class IncomeRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey('profile.id'),
                             nullable=False)
    date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('auction_sale','premium','add_on',"
            "'private_sale','prize','sponsorship','other')",
            name='ck_incomerecord_category'),
    )


class InventoryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    item_description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=1)
    unit_value = db.Column(db.Float, nullable=False)
    total_value = db.Column(db.Float, nullable=False)
    inventory_date = db.Column(db.Date, nullable=False)
    inventory_type = db.Column(db.String(10), nullable=False,
                               default='ending')

    __table_args__ = (
        CheckConstraint(
            "inventory_type IN ('beginning','ending')",
            name='ck_inventoryitem_type'),
    )


class ProjectActivity(db.Model):
    """Generic activity log with hours — used by all project types."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey('profile.id'),
                             nullable=False)
    date = db.Column(db.Date, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    hours = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)


class SkillsChecklist(db.Model):
    """Skills checklist item per project."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    skill_name = db.Column(db.String(255), nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    completed_by_id = db.Column(db.Integer,
        db.ForeignKey('profile.id'), nullable=True)
    sort_order = db.Column(db.Integer, default=0, nullable=False)


class ProjectMaterial(db.Model):
    """Materials, ingredients, components — used by all project types."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey('profile.id'),
                             nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(40), nullable=True)
    unit_cost = db.Column(db.Float, nullable=True)
    total_cost = db.Column(db.Float, nullable=True)
    category = db.Column(db.String(80), nullable=True)
    inventory_item_id = db.Column(db.Integer, db.ForeignKey('family_inventory_item.id'), nullable=True)
    status = db.Column(db.String(20), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    date_purchased = db.Column(db.Date, nullable=True)


class FamilyInventoryItem(db.Model):
    __tablename__ = "family_inventory_item"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(60), nullable=False, default="general")
    quantity = db.Column(db.Float, nullable=False, default=1)
    unit = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(120), nullable=True)
    condition = db.Column(db.String(40), nullable=True)
    assigned_project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    low_stock = db.Column(db.Boolean, nullable=False, default=False)
    archived = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ProjectNarrative(db.Model):
    """Record book narrative / story sections per project."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'),
                           nullable=False, unique=True)
    project_goals_narrative = db.Column(db.Text, nullable=True)
    what_i_did = db.Column(db.Text, nullable=True)
    what_i_learned = db.Column(db.Text, nullable=True)
    how_i_improved = db.Column(db.Text, nullable=True)
    skills_learned = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime,
        default=datetime.utcnow, nullable=False,
        onupdate=datetime.utcnow)


class EquipmentItem(db.Model):
    """Reusable equipment/asset tracked across years."""
    id = db.Column(db.Integer, primary_key=True)
    logged_by_id = db.Column(db.Integer,
        db.ForeignKey('profile.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(30), nullable=False,
        default='equipment')
    description = db.Column(db.Text, nullable=True)
    purchase_date = db.Column(db.Date, nullable=True)
    purchase_price = db.Column(db.Float, nullable=True)
    useful_life_years = db.Column(db.Integer,
        nullable=True, default=5)
    current_value = db.Column(db.Float, nullable=True)
    vendor = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, default=True,
        nullable=False)
    created_at = db.Column(db.DateTime,
        default=datetime.utcnow)


class PackingListTemplate(db.Model):
    """A reusable packing list (e.g. 'Pig Show Checklist')."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    project_type = db.Column(db.String(20), nullable=True)
    created_by_id = db.Column(db.Integer,
        db.ForeignKey('profile.id'), nullable=False)
    created_at = db.Column(db.DateTime,
        default=datetime.utcnow)


class PackingListItem(db.Model):
    """One item in a packing list template."""
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer,
        db.ForeignKey('packing_list_template.id'),
        nullable=False)
    item_name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(40), nullable=True)
    quantity = db.Column(db.String(20), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text, nullable=True)
