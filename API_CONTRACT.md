# Project Barn API Contract (Phase 1)

This contract defines the read-only JSON endpoints consumed by the Next.js frontend.

## Global API Rules
- All `/api/*` endpoints return JSON.
- `/api/*` endpoints never redirect to HTML routes.
- Use HTTP status codes for success/failure (2xx/4xx/5xx).

## Endpoints

### GET `/api/health`
```json
{
  "status": "ok",
  "service": "project-barn-backend"
}
```

### GET `/api/session`
```json
{
  "active_profile": {
    "id": 1,
    "name": "Mom",
    "role": "parent",
    "avatar_url": "/uploads/avatar.png"
  },
  "family": {
    "id": null,
    "name": null
  }
}
```

### GET `/api/profiles`
```json
[
  {
    "id": 1,
    "name": "Mom",
    "role": "parent",
    "avatar_url": null
  }
]
```

### GET `/api/projects`
```json
[
  {
    "id": 1,
    "name": "Bluebonnet",
    "animal_type": "cow",
    "owner_profile": { "id": 3, "name": "Ava" },
    "hero_image_url": "https://placehold.co/1200x675/png?text=Steer+Hero",
    "updated_at": "2026-01-20T00:00:00",
    "total_cost": 107.5,
    "ribbon_count": 1
  }
]
```

### GET `/api/projects/<id>`
```json
{
  "id": 1,
  "name": "Bluebonnet",
  "animal_type": "cow",
  "owner_profile": { "id": 3, "name": "Ava" },
  "hero_image_url": "https://placehold.co/1200x675/png?text=Steer+Hero",
  "summary": {
    "total_cost": 107.5,
    "expenses_count": 2,
    "photos_count": 0,
    "shows_count": 1
  },
  "recent_activity": [
    {
      "id": 1,
      "date": "2026-01-19T00:00:00",
      "type": "Daily training and handling",
      "note": "Practiced showmanship fundamentals."
    }
  ]
}
```

### GET `/api/dashboard`
```json
{
  "counts": {
    "projects": 3,
    "profiles": 5,
    "expenses": 6,
    "shows": 1,
    "tasks": 4
  },
  "recent_activity": [
    {
      "kind": "expense",
      "label": "Expense: $72.50",
      "date": "2026-01-20T00:00:00",
      "project_id": 1
    }
  ],
  "upcoming": [
    {
      "kind": "show",
      "label": "White House Barn Spring Jackpot",
      "date": "2026-02-10T00:00:00",
      "project_id": null
    }
  ]
}
```

## Example curl
```bash
curl -sk https://barn.white-house.cc/api/projects
curl -sk https://barn.white-house.cc/api/dashboard
```
