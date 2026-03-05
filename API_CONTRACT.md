# Project Barn API Contract (Phase 1)

This contract defines baseline `/api` behavior for the split frontend/backend architecture.

## Global API Rules
- All `/api/*` endpoints return JSON.
- No HTML redirects for API requests.
- Errors must return appropriate HTTP status codes.
- Frontend must consume these endpoints and must not bypass backend data access.

## Endpoints

### GET `/api/health`
**Purpose:** Liveness/health check for backend API.

**200 OK**
```json
{
  "status": "ok",
  "service": "barn-backend",
  "version": "phase-1"
}
```

### GET `/api/session`
**Purpose:** Return active session/profile context.

**200 OK**
```json
{
  "authenticated": true,
  "active_profile": {
    "id": 1,
    "name": "Mom",
    "role": "parent"
  }
}
```

**401 Unauthorized**
```json
{
  "error": "unauthorized",
  "message": "No active session"
}
```

### GET `/api/profiles`
**Purpose:** List available profiles for switching/sign-in UI.

**200 OK**
```json
{
  "profiles": [
    {
      "id": 1,
      "name": "Mom",
      "role": "parent",
      "avatar_path": "/uploads/avatars/mom.png"
    },
    {
      "id": 2,
      "name": "Ava",
      "role": "kid",
      "avatar_path": "/uploads/avatars/ava.png"
    }
  ]
}
```

### GET `/api/projects`
**Purpose:** Return projects visible to the active profile.

**200 OK**
```json
{
  "projects": [
    {
      "id": 101,
      "name": "Spring Steer",
      "type": "beef",
      "owner_id": 2,
      "breed": "Angus"
    },
    {
      "id": 102,
      "name": "Market Lamb",
      "type": "sheep",
      "owner_id": 3,
      "breed": "Hampshire"
    }
  ]
}
```

### GET `/api/projects/{id}`
**Purpose:** Return detailed data for a single project.

**200 OK**
```json
{
  "project": {
    "id": 101,
    "name": "Spring Steer",
    "type": "beef",
    "owner_id": 2,
    "breed": "Angus",
    "purchase_price": 1200.0,
    "notes": "Focus on halter training this month."
  }
}
```

**404 Not Found**
```json
{
  "error": "not_found",
  "message": "Project not found"
}
```

### GET `/api/dashboard`
**Purpose:** Aggregate summary cards/data for the main dashboard.

**200 OK**
```json
{
  "summary": {
    "active_projects": 4,
    "open_tasks": 7,
    "upcoming_shows": 2,
    "monthly_expenses": 642.5
  },
  "recent_tasks": [
    {
      "id": 9001,
      "project_id": 101,
      "task_type": "weight",
      "logged_at": "2026-01-20T18:42:00Z"
    }
  ]
}
```

## Error Envelope Guidance
Use consistent JSON errors with HTTP status codes, for example:

```json
{
  "error": "validation_error",
  "message": "Invalid request payload",
  "details": {
    "field": "name"
  }
}
```

## Non-Negotiable Contract Constraints
- `/api` is the only backend interface used by frontend.
- Backend must never return template-rendered HTML for `/api` routes.
- Backend must never redirect `/api` requests to non-API routes.
