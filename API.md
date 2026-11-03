# Pilar360 API — version 2.2 demo

All routes are served by the same Node.js server. Public submission and ID-based status tracking are separate from authority-only records.

## Public routes

### Health

```http
GET /api/health
```

### Submit a report

```http
POST /api/reports
Content-Type: application/json

{
  "reporter": "Sample Resident",
  "title": "Blocked drainage near the waiting shed",
  "category": "Drainage & Flooding",
  "description": "Water collects beside the road after heavy rainfall.",
  "barangay": "Marifosque",
  "address": "Near the waiting shed",
  "priority": "Normal",
  "lat": 12.9251,
  "lng": 123.674,
  "photoData": null
}
```

On success, the API returns a local demo report ID and initial status. Both `lat` and `lng` must be provided together, or both left blank. A submission must include either a nearby landmark (`address`) or both map coordinates.

### Track a report

```http
GET /api/track/PIL-2026-0001
```

Returns a limited public view: report ID, issue title/category, barangay/landmark, status, dates, and status timeline. It does not return the reporter's name, exact coordinates, photo, or full description.

## Authority routes

The authority must sign in using `POST /api/admin/login`. The server sets an HTTP-only, SameSite=Strict session cookie. Sessions expire after two hours of inactivity. Login attempts are rate-limited, and browser write requests carrying a different Origin are rejected. The login password must be configured in the server environment as `PILAR360_ADMIN_PASSWORD`.

```http
GET  /api/admin/session
POST /api/admin/login
POST /api/admin/logout
```

The following routes require a valid authority session:

```http
GET    /api/reports
GET    /api/reports?status=In%20Progress
GET    /api/reports?category=Streetlight&q=Marifosque
GET    /api/reports/PIL-2026-0001
PATCH  /api/reports/PIL-2026-0001
GET    /api/stats
GET    /api/export
POST   /api/demo/reset
```

### Update a report status

```http
PATCH /api/reports/PIL-2026-0001
Content-Type: application/json

{
  "status": "In Progress",
  "department": "Barangay Coordination",
  "note": "Status updated in the student demonstration."
}
```

Valid statuses: `Submitted`, `Under Review`, `Assigned`, `In Progress`, `Resolved`, `Closed`.

## Notes

- Public submission is intentionally open for this classroom prototype. The barangay field must contain Marifosque because that is the proposal demo area.
- Public tracking omits reporter identity and exact coordinates.
- Authority-only API restrictions are enforced by the server, not only by hiding UI controls.
- The session map is in memory and resets when the server restarts. Confirmed sign-out clears the session cookie and returns the browser to `/report`.
- This is not an official barangay reporting or dispatch service.

## Page routes

- `GET /` — project introduction page.
- `GET /report` — public reporting and tracking portal.
- `GET /admin` — authority sign-in and workspace.
