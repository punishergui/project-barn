# Next.js Migration Guardrails (Phase 0+)

This file adds migration-specific rules for the new frontend workstream.

## Scope
- Applies to all incremental migration work that introduces or edits files under `/frontend`.

## Rules
1. Keep Flask + SQLAlchemy + SQLite backend as source of truth.
2. Keep all existing backend templates/routes during migration (legacy UI remains operational).
3. Next.js frontend must live in `/frontend`.
4. Frontend/backend integration must use JSON endpoints under `/api` (or `/api/v1`) on Flask.
5. No schema rewrites, no auth rewrites, and no "big-bang" replacement in Phase 0.
6. Keep changes Docker-first and compatible with Traefik host + path-prefix routing.
7. Do not commit secrets; use `.env.example` for config examples.
