from __future__ import annotations

from datetime import date, timedelta

import click
import bcrypt

from app.models import Expense, Profile, Project, ProjectActivity, Show, ShowDay, ShowEntry, db

SEED_MARKER = "[seed-dev]"


@click.command("seed-dev")
@click.option("--reset", is_flag=True, help="Clear existing seed-dev data before reseeding.")
@click.option("--family-name", default="White House Barn", show_default=True, help="Family/club display name for dev profiles.")
def seed_dev_command(reset: bool, family_name: str) -> None:
    """Seed local development data for Project Barn."""

    if reset:
        deleted = _delete_seed_data(family_name)
        click.echo(f"Removed existing seed-dev data (family '{family_name}'): {deleted} records")

    existing_profiles = Profile.query.filter_by(club_name=family_name).count()
    existing_projects = Project.query.filter(Project.notes.contains(SEED_MARKER)).count()
    if existing_profiles > 0 or existing_projects > 0:
        click.echo(
            "Seed data already exists for this family. "
            "Run with --reset to rebuild a clean development dataset."
        )
        return

    pin_hash = bcrypt.hashpw(b"1234", bcrypt.gensalt()).decode("utf-8")

    profiles = [
        Profile(name="Mom", role="parent", pin_hash=pin_hash, color="#5C2E00", club_name=family_name, county="Travis"),
        Profile(name="Dad", role="parent", pin_hash=pin_hash, color="#2D4A7A", club_name=family_name, county="Travis"),
        Profile(name="Ava", role="kid", pin_hash=None, color="#5A8F29", club_name=family_name, county="Travis", years_in_4h=3),
        Profile(name="Liam", role="kid", pin_hash=None, color="#A2562A", club_name=family_name, county="Travis", years_in_4h=2),
        Profile(name="Grandma", role="grandparent", pin_hash=None, color="#7A4F8E", club_name=family_name, county="Travis"),
    ]
    db.session.add_all(profiles)
    db.session.flush()

    owner_ava = next(profile for profile in profiles if profile.name == "Ava")
    owner_liam = next(profile for profile in profiles if profile.name == "Liam")
    parent_mom = next(profile for profile in profiles if profile.name == "Mom")

    today = date.today()
    projects = [
        Project(
            name="Bluebonnet",
            type="cow",
            owner_id=owner_ava.id,
            breed="Angus Cross",
            photo_path="https://placehold.co/1200x675/png?text=Steer+Hero",
            purchase_price=2150,
            start_date=today - timedelta(days=90),
            project_year=today.year,
            club_name=family_name,
            county="Travis",
            notes=f"{SEED_MARKER} Market steer project",
        ),
        Project(
            name="Daisy",
            type="goat",
            owner_id=owner_liam.id,
            breed="Boer",
            photo_path="https://placehold.co/1200x675/png?text=Goat+Hero",
            purchase_price=550,
            start_date=today - timedelta(days=75),
            project_year=today.year,
            club_name=family_name,
            county="Travis",
            notes=f"{SEED_MARKER} Market goat project",
        ),
        Project(
            name="Rosie",
            type="pig",
            owner_id=owner_ava.id,
            breed="Yorkshire",
            photo_path="https://placehold.co/1200x675/png?text=Pig+Hero",
            purchase_price=480,
            start_date=today - timedelta(days=60),
            project_year=today.year,
            club_name=family_name,
            county="Travis",
            notes=f"{SEED_MARKER} Market pig project",
        ),
    ]
    db.session.add_all(projects)
    db.session.flush()

    activities = []
    expenses = []
    for index, project in enumerate(projects):
        activities.extend(
            [
                ProjectActivity(
                    project_id=project.id,
                    logged_by_id=project.owner_id,
                    date=today - timedelta(days=14 - index),
                    title="Daily training and handling",
                    hours=1.0,
                    notes=f"{SEED_MARKER} Practiced showmanship fundamentals.",
                ),
                ProjectActivity(
                    project_id=project.id,
                    logged_by_id=parent_mom.id,
                    date=today - timedelta(days=7 - index),
                    title="Weight and condition check",
                    hours=0.5,
                    notes=f"{SEED_MARKER} Reviewed progress and adjusted feed plan.",
                ),
            ]
        )
        expenses.extend(
            [
                Expense(
                    project_id=project.id,
                    logged_by_id=parent_mom.id,
                    amount=72.50 + index,
                    category="feed",
                    date=today - timedelta(days=10 - index),
                    vendor="Co-op Feed Store",
                    notes=f"{SEED_MARKER} 50lb show ration bag",
                ),
                Expense(
                    project_id=project.id,
                    logged_by_id=parent_mom.id,
                    amount=35.00 + index,
                    category="supplies",
                    date=today - timedelta(days=5 - index),
                    vendor="Barn Supply",
                    notes=f"{SEED_MARKER} Grooming/pen supplies",
                ),
            ]
        )

    db.session.add_all(activities)
    db.session.add_all(expenses)

    show = Show(
        name=f"{family_name} Spring Jackpot",
        location="Travis County Expo",
        start_date=today + timedelta(days=12),
        end_date=today + timedelta(days=13),
        notes=f"{SEED_MARKER} Development show",
    )
    db.session.add(show)
    db.session.flush()

    show_days = [
        ShowDay(show_id=show.id, day_number=1, date=show.start_date, notes=f"{SEED_MARKER} Check-in and weigh-in"),
        ShowDay(show_id=show.id, day_number=2, date=show.end_date, notes=f"{SEED_MARKER} Classes and sale"),
    ]
    db.session.add_all(show_days)

    placing_entry = ShowEntry(
        show_id=show.id,
        project_id=projects[0].id,
        day_number=2,
        ring="Ring A",
        class_name="Market Steer Heavyweight",
        placing="2nd",
        ribbon_color="Blue",
        notes=f"{SEED_MARKER} Strong finish with good movement",
        judge_notes="Great structure and presentation.",
    )
    db.session.add(placing_entry)

    db.session.commit()

    click.echo(
        f"Seeded dev data for '{family_name}': "
        f"{len(profiles)} profiles, {len(projects)} projects, {len(activities)} timeline entries, "
        f"{len(expenses)} expenses, 1 show"
    )


def _delete_seed_data(family_name: str) -> int:
    project_ids = [row[0] for row in db.session.query(Project.id).filter(Project.notes.contains(SEED_MARKER)).all()]
    show_ids = [row[0] for row in db.session.query(Show.id).filter(Show.notes.contains(SEED_MARKER)).all()]

    deleted_total = 0

    if show_ids:
        deleted_total += ShowEntry.query.filter(ShowEntry.show_id.in_(show_ids)).delete(synchronize_session=False)
        deleted_total += ShowDay.query.filter(ShowDay.show_id.in_(show_ids)).delete(synchronize_session=False)
        deleted_total += Show.query.filter(Show.id.in_(show_ids)).delete(synchronize_session=False)

    if project_ids:
        deleted_total += Expense.query.filter(Expense.project_id.in_(project_ids), Expense.notes.contains(SEED_MARKER)).delete(
            synchronize_session=False
        )
        deleted_total += ProjectActivity.query.filter(
            ProjectActivity.project_id.in_(project_ids), ProjectActivity.notes.contains(SEED_MARKER)
        ).delete(synchronize_session=False)
        deleted_total += Project.query.filter(Project.id.in_(project_ids)).delete(synchronize_session=False)

    deleted_total += Profile.query.filter(
        Profile.club_name == family_name, Profile.name.in_(["Mom", "Dad", "Ava", "Liam", "Grandma"])
    ).delete(synchronize_session=False)

    db.session.commit()
    return deleted_total
