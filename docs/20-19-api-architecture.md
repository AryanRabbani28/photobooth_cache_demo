# 19. API Architecture

## 19.1 API Base URL

```
https://api.photobooth-system.com/v1
```

## 19.2 Authentication Endpoints

```
POST   /auth/login          — Login, returns JWT access + refresh tokens
POST   /auth/logout         — Invalidate current token
POST   /auth/refresh        — Refresh an expired access token
GET    /auth/me             — Get current user profile
```

## 19.3 Booth Endpoints

```
GET    /booths                    — List all booths (admin)
GET    /booths/{id}               — Get booth details
GET    /booths/{id}/status        — Get booth device status
POST   /booths                    — Register a new booth (admin)
PATCH  /booths/{id}               — Update booth info (admin)
DELETE /booths/{id}               — Deactivate a booth (admin)
```

## 19.4 Session Endpoints

```
POST   /sessions                  — Create a new session (operator)
GET    /sessions                  — List sessions (filterable by date, booth, operator, status)
GET    /sessions/{id}             — Get session details
GET    /sessions/{id}/photos      — Get all photos for a session
POST   /sessions/{id}/pause       — Pause active session (operator)
POST   /sessions/{id}/resume      — Resume paused session (operator)
POST   /sessions/{id}/add-time    — Add time to session (operator)
POST   /sessions/{id}/cancel      — Cancel session (operator)
POST   /sessions/{id}/restart     — Restart session (operator)
POST   /sessions/{id}/reprint     — Reprint last photo (operator)
```

## 19.5 Template Endpoints

```
GET    /templates                 — List active templates
GET    /templates/{id}            — Get template details + config JSON
POST   /templates                 — Create new template (admin)
PATCH  /templates/{id}            — Update template (admin)
DELETE /templates/{id}            — Deactivate template (admin)
POST   /templates/{id}/upload     — Upload template assets (admin)
```

## 19.6 LUT Endpoints

```
GET    /luts                      — List active LUTs
GET    /luts/{id}                 — Get LUT details
POST   /luts                      — Create new LUT (admin)
PATCH  /luts/{id}                 — Update LUT metadata (admin)
DELETE /luts/{id}                 — Deactivate LUT (admin)
POST   /luts/{id}/upload          — Upload .cube file (admin)
```

## 19.7 Package Endpoints

```
GET    /packages                  — List active packages
GET    /packages/{id}             — Get package details
POST   /packages                  — Create new package (admin)
PATCH  /packages/{id}             — Update package (admin)
DELETE /packages/{id}             — Deactivate package (admin)
```

## 19.8 Photo Endpoints

```
GET    /photos                    — List photos (filterable)
GET    /photos/{id}               — Get photo details
GET    /photos/{id}/download      — Download photo file
```

## 19.9 Operator Endpoints

```
GET    /operators                 — List operators (admin)
GET    /operators/{id}            — Get operator details
POST   /operators                 — Create operator (admin)
PATCH  /operators/{id}            — Update operator (admin)
DELETE /operators/{id}            — Deactivate operator (admin)
POST   /operators/{id}/assign     — Assign to booth (admin)
```

## 19.10 Synchronization Endpoints

```
POST   /sync/session              — Sync a session from booth to central
POST   /sync/photos               — Sync photos from booth to central
POST   /sync/status               — Report booth device status
GET    /sync/commands/{booth_id}   — Get pending commands for a booth
POST   /sync/commands/{id}/ack     — Acknowledge a command was processed
GET    /sync/templates/updates     — Check for template updates
GET    /sync/luts/updates          — Check for LUT updates
```

## 19.11 Analytics Endpoints (Admin)

```
GET    /analytics/overview                — Dashboard summary stats
GET    /analytics/sessions                — Session analytics (by date, booth, location)
GET    /analytics/booths/{id}/performance — Single booth performance
GET    /analytics/locations/comparison    — Compare locations
GET    /analytics/popular-templates       — Most used templates
GET    /analytics/popular-filters         — Most used filters
GET    /analytics/peak-hours              — Peak usage hours
```

---