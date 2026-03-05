# Project Barn Architecture

This document defines the production architecture that must remain stable.

## System Diagram

```text
Browser
  ↓
Traefik
  ↓
Next.js Frontend
  ↓
Flask API
  ↓
SQLite
```

## Stack Summary

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Location: `/frontend`

### Backend
- Python
- Flask (served via Gunicorn)
- SQLite
- Location: `/app`

### Deployment
- Docker Compose
- Traefik reverse proxy
- Production domain: `barn.white-house.cc`

## Routing Rules
- `/` and non-API paths route to Next.js frontend.
- `/api/*` routes to Flask backend.
- Frontend calls backend only through `/api`.
- Backend `/api` endpoints return JSON responses only.

## Container Topology
Two containers are required and must remain separate:
- `barn-frontend`
- `barn-backend`

Never merge these services into one container.

## Responsibilities

### Frontend Responsibilities
- Render application UI.
- Handle client-side navigation and presentation.
- Consume backend data from `/api` endpoints.
- Never read/write database directly.

### Backend Responsibilities
- Own data access and business rules.
- Expose JSON API under `/api/*`.
- Manage sessions/auth logic and server-side validation.
- Serve consistent HTTP status codes for API consumers.

## Deployment Environment Notes
- Traefik handles edge routing and forwards to the correct container.
- Docker Compose defines the service split and networking.
- Any architecture updates must preserve:
  - split frontend/backend services,
  - Traefik routing behavior,
  - `/api` contract.

## Repository Structure (Canonical)

```text
/frontend
/app
/docker-compose.yml
```

These paths are architectural boundaries and should not be moved.
