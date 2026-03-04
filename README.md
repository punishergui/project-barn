# project-barn

Private family web app for 4-H/FFA livestock and project management.

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
2. Install deps: `npm install`
3. Run dev server: `npm run dev`

### Full stack with Docker Compose (Phase 0)
1. Copy env template: `cp .env.example .env`
2. Start both services: `docker compose up --build`
3. Open frontend at `http://localhost:3000`
4. Backend remains available at `http://localhost:5000`

Environment variables:

- `SECRET_KEY`
- `BARN_DB_PATH` (default: `/data/barn.db`)
- `BARN_UPLOAD_DIR` (default: `/data/uploads`)
- `BACKEND_ORIGIN` (default: `http://backend:5000`)


## API migration plan (Phase 1 target)

- API endpoints will be introduced under `/api` on the existing Flask backend.
- Proposed location: `app/routes/api.py` registered from `app/routes/__init__.py` as a dedicated blueprint (for example `api_bp`).
- Legacy Jinja routes/templates remain untouched during migration; frontend will call backend JSON APIs incrementally.
