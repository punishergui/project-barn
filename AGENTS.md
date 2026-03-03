# Project Barn — Agent Instructions

## What This Project Is
A private family web app for 4-H/FFA livestock and project management.
Family of 4. No multi-tenant. No paywall. Self-hosted on TrueNAS behind
Traefik + Cloudflare. Built and deployed via GitHub Actions to ghcr.io.

## Stack — Never Deviate From This
- Backend: Python 3.12 + Flask
- Database: SQLite via SQLAlchemy (path from BARN_DB_PATH env var)
- Templates: Jinja2 only — NO React, NO Vue, NO JS frameworks
- CSS: Vanilla CSS using CSS variables — NO Bootstrap, NO Tailwind
- JS: Vanilla JS only — NO npm frontend packages
- Icons: Inline SVG only — NO FontAwesome, NO icon libraries
- Container: Docker (python:3.12-slim base)
- Registry: ghcr.io/punishergui/project-barn
- CI/CD: GitHub Actions → push to main = build + push to ghcr.io

## Current Design System — Always Use These Exact Variables
:root {
  --dark-bg:     #0F0804;
  --dark-card:   #1E0F07;
  --dark-card-2: #2C1810;
  --barn-red:    #8B2814;
  --barn-red-2:  #B03520;
  --gold:        #D4920C;
  --gold-light:  #F0B020;
  --light-text:  #F5ECD8;
  --muted:       #B89070;
  --cream:       #FAF6ED;
  --divider:     rgba(255,255,255,.10);
  --radius: 14px;
  --radius-sm: 9px;
  --nav-h: 72px;
  --top-h: 62px;
}
[data-theme="light"] {
  --dark-bg:     #F5EFE4;
  --dark-card:   #EDE3D0;
  --dark-card-2: #E2D5BE;
  --light-text:  #1E0C04;
  --muted:       #6B4828;
  --divider:     rgba(0,0,0,.12);
}

- Fonts: Playfair Display (headings) + DM Sans (body) — Google Fonts
- Dark mode is default. App is dark-first. Light mode toggled via
  localStorage key "barn-theme", applied as data-theme="light" on <html>
- Cards are SLIMLINE — padding 13px 14px, never bulky
- Section labels: 11px, uppercase, letter-spacing .1em, color rgba(255,255,255,.65)
- Card borders always use var(--divider), never hardcoded rgba values
- Pending task cards have border-left: 3px solid var(--barn-red)
- Completed task cards have border-left: 3px solid transparent

## App Shell (Every Page)
- Top bar: fixed, 62px + safe-area-inset-top
  - Left: barn SVG logo + "PROJECT BARN" wordmark
  - Right: notification bell + avatar circle only
    - Parent avatar tap → /admin
    - Kid/grandparent avatar tap → /profiles
    - Parent avatar shows gear badge overlay
  - NO theme toggle in top bar
  - NO separate switch/admin icon in top bar
  - z-index: 40
- Notification panel: position fixed, z-index 35 (BELOW top bar),
  top: calc(var(--top-h) + env(safe-area-inset-top)),
  slides down with transform, hidden by default
- Bottom nav: fixed, 72px + safe-area-inset-bottom, 5 items:
  Dashboard / Reports / Expenses / Shows / Projects
  Active item = gold + underline bar. Inactive = 45% opacity.
  Has border-top: 1px solid var(--divider)
- All page content scrolls between top and bottom nav
- base.html provides the shell, pages use {% block content %}

## Current Models (do not remove any of these)
Profile: id, name, role (parent/kid/grandparent), pin_hash, avatar_path,
  color, created_at, archived (bool), birthdate (Date)
Project: id, name, type, owner_id, photo_path, breed, purchase_price,
  notes, created_at, start_date, purchase_date
Task: id, project_id, logged_by_id, task_type, notes, logged_at,
  weight_lbs, duration_minutes
Show: id, name, location, start_date, end_date, notes
ShowEntry: id, show_id, project_id, ring, class_name, placing,
  ribbon_color, day_number, notes, judge_notes
ShowDay: id, show_id, day_number, notes, date
ShowDayCheck: id, show_day_id, item_name, completed, completed_by_id,
  completed_at
Expense: id, project_id, logged_by_id, amount, category, date, notes
Photo: id, project_id, show_id, show_day_id, filename, caption,
  photo_type (photo/video/ribbon), uploaded_by_id, uploaded_at
Goal: id, project_id, text, completed, created_at, completed_at,
  completed_by_id
Notification: id, profile_id, title, body, type, read, created_at, link

## Current Routes (do not remove any of these)
Auth: GET/POST /profiles, POST /profiles/select,
  POST /profiles/<id>/avatar, POST /profiles/<id>/avatar/remove
Dashboard: GET /, POST /tasks/log, POST /projects/<id>/tasks/log
Projects: GET /projects, GET/POST /projects/add,
  GET /projects/<id>, GET/POST /projects/<id>/edit,
  POST /projects/<id>/photos/upload
Goals: POST /projects/<id>/goals/add,
  POST /projects/<id>/goals/<gid>/toggle
Shows: GET /shows, GET/POST /shows/add, GET /shows/<id>,
  GET /shows/<id>/day/<n>, POST /shows/<id>/day/<n>/checklist,
  POST /shows/<id>/day/<n>/result, POST /shows/<id>/day/add,
  POST /shows/<id>/day/<n>/photos/upload
Expenses: GET /expenses, GET/POST /expenses/add,
  GET/POST /projects/<id>/expenses/add
Reports: GET /reports, GET /reports/export/<id>
Timeline: GET /timeline
Notifications: POST /notifications/read/<id>,
  POST /notifications/read-all
Settings: GET /settings/profiles, GET/POST /settings/profiles/add,
  GET/POST /settings/profiles/<id>/edit,
  POST /settings/profiles/<id>/archive,
  POST /settings/profiles/<id>/delete
Admin: GET /admin
Profile Summary: GET /profiles/<id>/summary

## Auth Rules
- /profiles = profile switcher (full screen, no nav)
- All other routes require active session → redirect to /profiles if not set
- Session key: active_profile_id
- PINs stored as bcrypt hashes
- Parent role: always requires PIN
- Kid role: PIN optional (if no pin_hash, log in directly)
- Grandparent role: always requires PIN, view-only except task logging
- Parent only routes: /admin, /settings/profiles/*, profile delete

## File/Data Storage
- DB: /data/barn.db (mounted Docker volume)
- Uploads: /data/uploads (mounted Docker volume)
- Both paths come from env vars: BARN_DB_PATH, BARN_UPLOAD_DIR

## Migrations
- All schema changes go through run_migrations() in app/__init__.py
- Use try/except around each ALTER TABLE statement
- SQLite does not enforce CHECK constraints on existing rows
- Never drop or recreate tables — only ADD COLUMN

## DO NOT
- Do not use React, Vue, or any frontend framework
- Do not use Bootstrap or Tailwind
- Do not use FontAwesome or icon CDNs
- Do not use PostgreSQL or MySQL
- Do not add a paywall, subscription, or premium tier
- Do not make it look childish, pastel, or toy-like
- Do not use large padded bulky cards
- Do not add features not asked for in the current prompt
- Do not rewrite existing files — always read current state first,
  then use str_replace to make targeted additions only
- Do not create new branches — always commit to main
- Do not delete existing routes, models, or CSS rules
