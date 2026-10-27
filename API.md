# Pilar 360 REST API (local demo)

Base URL: `http://127.0.0.1:4173`

All API responses use JSON except static files. This API is intentionally unauthenticated and must remain local during a prototype demonstration.

## Health

```http
GET /api/health
```

## List reports

```http
GET /api/reports
GET /api/reports?status=In%20Progress
GET /api/reports?category=Streetlight&q=Banuyo
```

## Create a report

```http
POST /api/reports
Content-Type: application/json

{
  "title": "Broken streetlight near waiting shed",
  "category": "Streetlight",
  "description": "The light does not appear to turn on after dark.",
  "barangay": "Banuyo",
  "address": "Near the waiting shed",
  "priority": "Normal",
  "lat": 12.9251,
  "lng": 123.674,
  "reporter": "Community Member",
  "photoData": null
}
```

`title` must be at least 5 characters, `description` at least 15 characters, and category must match a known category. Coordinates and photos are optional. Photos must be PNG, JPEG, or WebP data URLs under the request limits.

## Get and update a report

```http
GET /api/reports/PIL-2026-0012
PATCH /api/reports/PIL-2026-0012
Content-Type: application/json

{
  "status": "In Progress",
  "department": "Municipal Engineering",
  "note": "Demo team recorded a status change."
}
```

Valid statuses: `Submitted`, `Under Review`, `Assigned`, `In Progress`, `Resolved`, `Closed`.

## Stats, export, reset

```http
GET /api/stats
GET /api/export
POST /api/demo/reset
Content-Type: application/json

{}
```

The reset endpoint deletes locally submitted demo records and restores the fictional sample dataset. Export any data you need before resetting.
