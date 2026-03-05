# Project Barn — Agent & Contributor Guardrails

## Project Vision
Project Barn is a family-focused livestock and project management application. The architecture is intentionally split so the UI and API can evolve independently while remaining stable in production.

## Architecture
- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
- Backend: Python + Flask + Gunicorn + SQLite.
- Reverse proxy/routing: Traefik.
- Domain: `barn.white-house.cc`.
- Required split services:
  - `barn-frontend`
  - `barn-backend`

## Frontend Rules
- Frontend code must live in `/frontend`.
- Use Next.js App Router with TypeScript.
- Keep styling in Tailwind/shadcn-compatible patterns.
- Frontend must **never** access SQLite or any database directly.
- Frontend must communicate with backend **only** through `/api` endpoints.
- Do not move backend/domain business logic into frontend components.

## Backend Rules
- Backend code must live in `/app`.
- Flask is the required backend framework; do not replace it.
- Backend owns business logic, validation, session logic, and data access.
- `/api/*` endpoints must always return JSON.
- `/api/*` endpoints must never redirect to HTML pages.
- Use proper HTTP status codes for success and failure responses.

## Deployment Rules
- Deployment remains Docker Compose + Traefik.
- Keep two-container architecture (`barn-frontend` and `barn-backend`).
- Never collapse into one service.
- Never remove or break Traefik labels/routing behavior.
- Keep compatibility with existing production host `barn.white-house.cc`.

## Data Model Overview
- Source of truth is SQLite managed by Flask backend.
- SQLAlchemy models and migrations stay in backend scope.
- Any schema evolution must be handled by backend migration patterns.

## Profile Switching Model
- Session/profile switching is backend-owned behavior.
- Frontend may render state from API responses but must not implement alternate auth/session sources.
- Profile/session reads and updates must flow through backend endpoints.

## UI Layout Rules
- Route `/` is owned by Next.js frontend rendering.
- API route space `/api/*` is owned by Flask backend.
- Do not introduce mixed HTML/API behavior under `/api`.
- Preserve App Router conventions in `/frontend/app`.

## API Rules
- API base path is `/api`.
- Response format for `/api/*` is JSON only.
- No HTML error pages for API consumers.
- Return explicit status codes (2xx/4xx/5xx) and machine-readable JSON payloads.

## Development Rules
- Do not move folders `/frontend` or `/app`.
- Do not alter working runtime architecture unless explicitly requested.
- Do not change Docker/Trafik routing semantics when making feature work.
- Keep changes scoped and backwards compatible.
- Prefer additive changes over destructive rewrites.

## Development Phases
- Phase 1: Stable split-stack operation with API-first integration.
- Future phases: expand frontend features by consuming backend `/api` only.
- At every phase, preserve the same routing contract and container boundaries.

## Expected Output From Agents
When completing a task, agents should:
1. State which files were changed and why.
2. Confirm architecture constraints were respected.
3. Confirm no forbidden structural changes were made (framework swap, folder moves, container merge, Traefik routing edits).
4. Provide verification commands/tests run.
