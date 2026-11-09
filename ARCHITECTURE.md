# Pilar360 — architecture notes (version 2.3)

## System overview

```text
Resident browser (phone / tablet / PC)
  ├─ Public portal: submit report + track report ID
  └─ Authority portal: sign-in + private report inbox + map + updates
                 │ same-origin HTTPS/HTTP JSON API
                 ▼
            Node.js server
  ├─ Public report creation and limited tracking
  ├─ Authority password sign-in and session cookie
  ├─ Access checks for report list/details/stats/export/update/reset
  └─ Input validation and JSON persistence
                 │
                 ▼
          data/reports.json

Optional map layer: Leaflet + OpenStreetMap tiles (internet required)
```

## Roles

### Resident / Reporter

- Opens `/`.
- Submits the issue title, category, description, barangay, optional landmark, optional photo, and optional coordinates.
- May leave the reporter name blank and may optionally provide a contact number.
- Receives a local report ID.
- Can use the public ticket directory to find an active ID, or include resolved/closed tickets in the list.
- Uses an ID to view the limited public status timeline; public results do not show report details or personal contact information.
- Cannot browse all reports or see reporter names and exact coordinates.

### Authority / Demo Coordinator

- Opens `/admin` and signs in.
- Reviews all submitted records, including a reporter name if provided, optional contact number, reported landmark, coordinates, and optional photo.
- Uses the report list and filters to find an item.
- Uses Community Map to inspect valid coordinate pins.
- Opens a report detail to record a new demo status and note.
- Can export JSON or restore fictional seed data.

## Data and access controls

The Node.js server stores records in a JSON file for the small classroom prototype. The authority password is read from `PILAR360_ADMIN_PASSWORD`; it is never placed in frontend JavaScript. A successful login creates a random server-side session and an HTTP-only, SameSite=Strict cookie. The private report APIs verify that session on every request.

The public ticket directory and tracking endpoint return only ticket ID, category, status and dates/status history. They exclude reporter identity, phone number, report title and description, exact latitude/longitude, photo, and landmark. Authority endpoints return the full record only after authentication. An optional phone number is encrypted in the JSON data file with AES-256-GCM and decrypted only for authority responses when the same server encryption key is configured.

This is a demonstration-level control. Sessions are stored in server memory and are lost after restart. A production deployment needs individual staff accounts, secure password hashing and rotation, stronger session management, CSRF and abuse controls, audit logs, database/object storage, privacy and retention policies, monitoring, backups, and official LGU authorization.

## Map behavior

The map plots only records with both valid latitude and longitude. It fits map bounds to the submitted points and recalculates its size after layout changes to support desktop, tablet, and phone views. Map tiles are external and require internet. If Leaflet or map tiles cannot load, the map panel shows a fallback message while the report list, location text, and coordinate links remain available.

Coordinates are entered by the reporter or captured with browser location permission. They are not geocoded or independently checked. A reported pin should be treated as approximate unless verified.

## Known limitations

1. No connection to Barangay Marifosque or the Municipality of Pilar.
2. No official report number, dispatch, notification, or repair guarantee.
3. JSON storage is for a small demo; concurrent edits and large photo collections need a proper database and object storage.
4. Hosted filesystems may be temporary unless persistent storage is configured.
5. OpenStreetMap map tiles require internet and must be used according to the tile provider's policy.
6. No official privacy impact assessment or resident consent process has been completed. Do not collect real residents’ information without adviser approval and a proper privacy review.
7. Public report submission has a basic per-connection limit to reduce spam, but this is not a full abuse-prevention system.
8. SMS is optional and requires a configured provider account, private API key and credits. A provider accepting a message is not a guarantee of handset delivery.
9. Contact Developer prepares a mailto message; the visitor must send it from their own email app.
