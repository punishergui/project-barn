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

Environment variables:

- `SECRET_KEY`
- `BARN_DB_PATH` (default: `/data/barn.db`)
- `BARN_UPLOAD_DIR` (default: `/data/uploads`)
- `BACKEND_ORIGIN` (default: `http://backend:5000`)


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
