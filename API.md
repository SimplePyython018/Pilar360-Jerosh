# Pilar360 API — version 2.5 demo

All routes are served by the same Node.js server. The public portal offers report submission, a limited ticket directory and status-only lookup. Full report records are available only after authority sign-in.

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
  "phone": "09171234567",
  "smsConsent": true,
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

`reporter` and `phone` are optional. If a phone number is provided, the server requires `PILAR360_PHONE_ENCRYPTION_KEY` and encrypts the number before writing it to the JSON data file. `smsConsent` is optional and only requests SMS notifications; it does not guarantee delivery. Both `lat` and `lng` must be provided together, or both left blank. A submission must include either a nearby landmark (`address`) or both map coordinates.

### Public ticket directory

```http
GET /api/public/tickets
GET /api/public/tickets?includeResolved=1
```

The default response lists active resident-submitted tickets and sample ticket IDs that have been approved at least once. Once a sample ticket is approved, its ID remains in the public status directory as its status changes. The optional query includes resolved and closed tickets. Each public entry contains only the ticket ID, category, status, created date and updated date. It never returns the report title, description, reporter name, phone number, landmark, photo or coordinates.

### Track a report

```http
GET /api/track/PIL-2026-0001
```

Returns the ticket ID, category, current status, dates and status-only timeline. It does not return report details, reporter identity, phone number, note text, landmark, photo or exact coordinates.

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
  "status": "Resolved",
  "department": "General Services",
  "note": "Marked resolved in the student demonstration."
}
```

Valid statuses: `Submitted`, `Under Review`, `Approved`, `Assigned`, `In Progress`, `Resolved`, `Closed`. Saving `Approved` starts a 24-hour queue timer. The authority UI shows that temporary quick-access entry only during the current page session; refreshing or reopening the authority page clears the quick list, while the saved status and ticket history remain available.

## Optional SMS provider

When a number is provided and the reporter explicitly opts in, the server may send a receipt message and a status-update message whenever the authority changes the report status (for example, to `Approved`, `In Progress` or `Resolved`). This requires `PILAR360_PHONE_ENCRYPTION_KEY` and `SEMAPHORE_API_KEY` on the server. `SEMAPHORE_SENDERNAME` is optional if a default sender name is configured with the provider. A provider-accepted request does not guarantee that the handset receives the SMS. If SMS is not configured, the report is still saved and the reporter is asked to keep the ticket ID.

## Contact developer

The Contact Developer form uses a `mailto:` link to prepare an email addressed to the project developer. The visitor must review and send the email in their own email app. There is no server-side email endpoint and the website does not store contact messages.

## Notes

- Public submission is available for this classroom prototype and is limited to eight valid submissions per connection every 15 minutes. The barangay field must contain Marifosque because that is the proposal demo area.
- Public ticket IDs are visible in the directory and must not be treated as passwords or confidential credentials.
- Full report content and the optional decrypted phone number are returned only by authority-protected endpoints.
- Authority-only API restrictions are enforced by the server, not only by hiding UI controls.
- The session map is in memory and resets when the server restarts. Confirmed sign-out clears the session cookie and returns the browser to `/report`.
- JSON storage is for a small class demo. A persistent database, regular backups and approved privacy procedures are needed before any real-world use.
- This is not an official barangay reporting or dispatch service.

## Page routes

- `GET /` — project introduction page.
- `GET /report` — public reporting and tracking portal.
- `GET /admin` — authority sign-in and workspace.
- `GET /contact` — standalone Contact Developer page.
