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
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

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


class ShowDay(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=False)
    day_number = db.Column(db.Integer, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=True)


class ShowDayCheck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    show_day_id = db.Column(db.Integer, db.ForeignKey("show_day.id"), nullable=False)
    item_name = db.Column(db.String(80), nullable=False)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    completed_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    logged_by_id = db.Column(db.Integer, db.ForeignKey("profile.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, default=date.today, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    vendor = db.Column(db.String(120), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('feed','hay','bedding','vet','entry_fee','supplies',"
            "'equipment','transportation','registration','grooming',"
            "'breeding_fee','insurance','other_expense')",
            name="ck_expense_category",
        ),
    )


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
    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.String(255), nullable=True)
    type = db.Column(db.String(20), nullable=False, default="reminder")
    read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    link = db.Column(db.String(255), nullable=True)


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
    notes = db.Column(db.Text, nullable=True)
    date_purchased = db.Column(db.Date, nullable=True)


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
