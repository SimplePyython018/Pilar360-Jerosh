# Pilar 360 — Architecture Notes

## 1. System view

```text
┌───────────────────────────────────┐
│ Browser / Mobile browser          │
│ index.html + styles.css + app.js  │
│ Dashboard · Reports · Map         │
│ Insights · Workspace              │
└─────────────────┬─────────────────┘
                  │ same-origin JSON/HTTP
                  ▼
┌───────────────────────────────────┐
│ Node.js native HTTP server         │
│ server.js                         │
│ Routing · validation · size limit │
│ report lifecycle · static assets  │
└─────────────────┬─────────────────┘
                  │ atomic JSON-file rewrite
                  ▼
┌───────────────────────────────────┐
│ data/reports.json                 │
│ demo seed records + local reports │
│ optional photo data URLs          │
└───────────────────────────────────┘

External map tiles (optional): Leaflet + OpenStreetMap; no map tiles are served by this project.
```

## 2. Design choices

- **Zero runtime dependencies:** The server uses Node.js built-in `http`, `fs`, `path`, and `crypto` modules. This reduces setup friction and makes the demo easy to inspect.
- **Separation of concerns:** `server.js` handles data validation and persistence; `public/app.js` handles client state and presentation; `public/styles.css` defines design tokens and responsive behavior.
- **Local persistence:** The JSON repository is intentionally simple for a prototype. Updates write to a temporary file and rename it to reduce partial-write risk.
- **Progress visibility:** Each report has a status and timeline events. This models a review/assignment/progress/resolution workflow, but no real municipal office is notified.
- **Graceful map degradation:** The interface still works if map assets are offline. Location values are optional, and demo coordinates should not be interpreted as verified boundaries or accurate incidents.
- **Default local binding:** The server listens on `127.0.0.1`. This avoids exposing the unauthenticated coordinator endpoints to other devices by default.

## 3. Domain model

A report record contains:

| Field | Purpose |
|---|---|
| `id` | Local prototype identifier (`PIL-YYYY-NNNN`) |
| `title`, `description` | Issue summary and user-provided details |
| `category`, `priority` | Issue classification and suggested priority |
| `barangay`, `address` | User-provided area and landmark |
| `lat`, `lng` | Optional numeric coordinates |
| `photoData` | Optional validated PNG/JPEG/WebP data URL |
| `status` | Submitted → Under Review → Assigned → In Progress → Resolved/Closed |
| `department` | Demo assignment, not an official routing destination |
| `createdAt`, `updatedAt` | ISO timestamp values |
| `timeline` | Append-only-style list of demo status notes |
| `reporter`, `source` | Demo display label and origin indicator |

## 4. API route summary

- `GET /api/health` — service health and demo mode.
- `GET /api/reports` — all reports; optional `q`, `status`, and `category` query filters.
- `GET /api/reports/:id` — one report.
- `POST /api/reports` — validate and save a new report.
- `PATCH /api/reports/:id` — update status, department, and add a timeline note (demo coordinator control).
- `GET /api/stats` — counts by status and category.
- `GET /api/export` — JSON download.
- `POST /api/demo/reset` — restore the fictional sample records.

See `API.md` for request examples.

## 5. Known limitations / next architecture stage

1. No authentication, user sessions, or role permissions.
2. JSON storage is not designed for concurrent production traffic or large photo libraries.
3. No official LGU integration, SMS/email notifications, service-level agreements, or assigned-office guarantees.
4. No automated geocoding or barangay boundary validation.
5. No moderation workflow for abusive reports or privacy-sensitive imagery.
6. Map tiles need internet access; OpenStreetMap tile usage must follow their current usage policy.
7. No production monitoring, backup/restore automation, or data retention enforcement.

Before a real pilot, obtain written LGU approval and implement production identity/security, a database, object storage, access controls, audit logs, a privacy notice, retention/deletion controls, observability, backup/restore testing, and emergency-report disclaimers appropriate to the municipality.
