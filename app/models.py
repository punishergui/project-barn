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
    purchase_price = db.Column(db.Float, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "type IN ('cow','pig','goat','sheep','chicken','rabbit','baking','welding','other')",
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

    __table_args__ = (
        CheckConstraint("category IN ('feed','bedding','vet','entry_fee','supplies','other')", name="ck_expense_category"),
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
