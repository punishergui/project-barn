# project-barn

Private family web app for 4-H/FFA livestock and project management.

## Project Architecture

Project Barn uses a split production architecture:
- **Next.js frontend** in `/frontend` (App Router, TypeScript, Tailwind, shadcn/ui).
- **Flask backend** in `/app` (Python, Gunicorn, SQLite access).
- **Docker deployment** with separate `barn-frontend` and `barn-backend` services.
- **Traefik routing** with `/` to frontend and `/api/*` to backend on `barn.white-house.cc`.

Architecture references:
- [AGENTS.md](AGENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [API_CONTRACT.md](API_CONTRACT.md)

## Phase 0 migration status

This repo now contains:
- Existing Flask backend (legacy HTML + business logic) at repo root.
- New Next.js frontend scaffold at `./frontend` for incremental migration.

No backend models or legacy templates were removed.

## Local development

### Backend only (legacy UI)
1. Create a Python 3.12 virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Run the app with `python app.py`.


### Frontend only
1. From repo root: `cd frontend`
2. Copy env template: `cp .env.example .env.local`
3. Install deps: `npm install`
4. Run dev server: `npm run dev`

### Full stack with Docker Compose + Traefik (split stack)
1. Copy env template: `cp .env.example .env`
2. Ensure external Docker network exists: `docker network create proxy` (one-time).
3. Start both services: `docker compose up -d --build`
4. Route traffic through Traefik host rules for `barn.white-house.cc`:
   - `/api` -> `barn-backend` (Flask on port 5000 inside container)
   - all other paths -> `barn-frontend` (Next.js on port 3000 inside container)

Rollback option: `docker compose -f docker-compose.legacy.yml up -d`


### Docker volumes

Uploads must persist in a mounted volume for the backend container.

- Recommended mount: `barn_uploads:/data/uploads`
- Database mount: `barn_data:/data`

This keeps media files and SQLite data across restarts.

### Recommended deploy flow

Use this sequence for stable deployments:

1. `git pull --ff-only`
2. `docker compose build`
3. `docker compose up -d`

### WHS server pull/build/restart CLI

Run these exact commands on `barn.white-house.cc` from the repository root:

1. `cd /path/to/project-barn`
2. `git pull --ff-only`
3. `docker compose build`
4. `docker compose up -d`

Environment variables:

- `SECRET_KEY`
- `BARN_DB_PATH` (default: `/data/db.sqlite`)
- `BARN_UPLOAD_DIR` (default: `/data/media`)
- `BACKEND_ORIGIN` (default: `http://backend:5000`)
- `INTERNAL_API_BASE_URL` (frontend server-to-server proxy base, default: `http://barn-backend:5000/api`)


## API migration plan (Phase 1 target)

- API endpoints will be introduced under `/api` on the existing Flask backend.
- Proposed location: `app/routes/api.py` registered from `app/routes/__init__.py` as a dedicated blueprint (for example `api_bp`).
- Legacy Jinja routes/templates remain untouched during migration; frontend will call backend JSON APIs incrementally.

## Dev Seeding

Use the Flask CLI command to create a reusable development dataset in the backend database:

- `docker compose exec barn-backend flask seed-dev`
- `docker compose exec barn-backend flask seed-dev --reset`

Idempotency behavior:
- Default run is safe to repeat: if seeded data for the selected family already exists, the command exits without duplicating records.
- `--reset` removes previously seeded dev records (tagged by the seed command) and recreates them.
- Optional family override: `--family-name "Your Barn Name"`.

## Frontend routes (App Router)

- `/dashboard`
- `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`
- `/projects/[id]/tasks`, `/projects/[id]/weights`, `/projects/[id]/health`, `/projects/[id]/feed`
- `/expenses`, `/expenses/new`, `/expenses/[id]/edit`, `/expenses/categories`
- `/feed`, `/inventory`, `/income`, `/auctions`, `/reports`, `/family`, `/more`
- `/shows`, `/shows/new`, `/shows/[id]`, `/shows/[id]/edit`, `/shows/[id]/day` (use `?dayId=<id>` for preselected day)
- `/settings`, `/settings/profiles`, `/settings/profiles/[id]`, `/profile-picker`

Parent admin actions are protected by backend PIN unlock endpoints under `/api/auth/*`.


### Full stack local dev quickstart

1. `cp .env.example .env`
2. `docker compose up --build`
3. Open `http://localhost` or your configured Traefik host.
4. Frontend calls only same-origin `/api/*` via `frontend/app/api/[...path]/route.ts`.


## Data durability + backup paths

Project Barn stores persistent data outside the Git checkout so it survives rebuilds:

- Database file: `/data/db.sqlite`
- Media root: `/data/media/`
  - `/data/media/profiles/`
  - `/data/media/projects/`
  - `/data/media/receipts/`
  - `/data/media/ribbons/`
  - `/data/media/gallery/`
  - `/data/media/videos/`

Recommended backup set:

- `tar -czf barn-backup-$(date +%F).tar.gz /data/db.sqlite /data/media`

Restore by placing both paths back in the same locations before starting containers.
