# Project Barn — Agent Instructions

## What This Project Is
A private family web app for 4-H/FFA livestock and project management.
Family of 4. No multi-tenant. No paywall. Self-hosted on TrueNAS behind
Traefik + Cloudflare. Built via GitHub Actions, deployed via Docker/Dockge.

## Stack — Never Deviate From This
- Backend: Python 3.12 + Flask
- Database: SQLite via SQLAlchemy (path from BARN_DB_PATH env var)
- Templates: Jinja2 only — NO React, NO Vue, NO JS frameworks
- CSS: Vanilla CSS with CSS variables — NO Bootstrap, NO Tailwind
- JS: Vanilla JS only — NO npm frontend packages
- Icons: Inline SVG only — NO FontAwesome, NO icon CDNs
- Container: Docker (python:3.12-slim base)
- Registry: ghcr.io/punishergui/project-barn
- CI/CD: GitHub Actions — push to main = build + push to ghcr.io

## Design System — Always Use These Exact Values
```css
:root {
  --dark-bg: #1C0E05;
  --dark-card: #2A1506;
  --dark-card-2: #341A08;
  --barn-red: #7B2415;
  --barn-red-2: #9B3020;
  --gold: #C4830A;
  --gold-light: #E8A020;
  --light-text: #FAF0E0;
  --muted: #A08060;
  --cream: #FAF6ED;
  --radius: 14px;
  --radius-sm: 9px;
  --nav-h: 72px;
  --top-h: 62px;
}
```
- Fonts: Playfair Display (headings) + DM Sans (body) via Google Fonts
- Dark mode is the default. The app is dark-first.
- Cards are SLIMLINE — padding 13px 14px, never bulky or over-padded
- Section labels: 11px, uppercase, letter-spacing .1em, color var(--muted)
- Headings use Playfair Display, everything else DM Sans

## App Shell (Every Page Except /profiles)
Every page extends base.html which provides:
- Top bar: fixed, height var(--top-h) + env(safe-area-inset-top)
  Left: barn SVG icon + PROJECT BARN wordmark
  Right: round avatar (user initial or photo), tap = /profiles
- Bottom nav: fixed, height var(--nav-h) + env(safe-area-inset-bottom)
  5 items: Dashboard / Reports / Expenses / Shows / Projects
  SVG icons, no emoji, no FontAwesome
  Active = gold (--gold-light). Inactive = white at 45% opacity.
- Page content scrolls in the space between top and bottom nav
- Meta tags: viewport-fit=cover, apple-mobile-web-app-capable=yes

## Auth Rules
- /profiles = full-screen profile switcher (no top bar, no bottom nav)
- All other routes: check session['active_profile_id'], redirect to
  /profiles if missing
- PINs stored as bcrypt hashes in Profile.pin_hash
- Parent role: always requires PIN entry
- Kid role: if pin_hash is None, tap logs in directly with no PIN
- PIN submit: JS fetch POST to /profiles/select
  Success → JSON {success: true, redirect: "/"}
  Failure → JSON {success: false, error: "Invalid PIN"}

## Data Storage
- DB: env var BARN_DB_PATH (default /data/barn.db)
- Uploads: env var BARN_UPLOAD_DIR (default /data/uploads)
- Both are Docker volume mounts from ./data on the host

## NEVER DO THESE THINGS
- Never use React, Vue, or any frontend JS framework
- Never use Bootstrap or Tailwind
- Never use FontAwesome or any icon CDN
- Never use PostgreSQL or MySQL
- Never add a paywall, subscription tier, or premium feature
- Never make it look childish, pastel, or toy-like
- Never use large padded bulky cards
- Never add unrequested features
