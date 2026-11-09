# Changelog

## 2.5.0 — Status workflow, responsive redesign, and performance
- Fixed the status-save form: delegated submit handling now reads the actual form element, so the report ID and selected status reach the PATCH request.
- Fixed public visibility of Approved sample tickets while keeping private report details hidden; once approved, their IDs remain visible as the status advances.
- Renewed the 24-hour Approved queue when an expired Approved ticket is approved again.
- Made report/status save responses independent of third-party SMS response time. SMS runs separately after data is saved.
- Reworked the authority detail sheet so status controls are near the top and easier to reach on mobile.
- Rebuilt the authority overview into a lightweight report-first dashboard; the map now loads only when the Map section or a mapped report detail is opened.
- Added a dedicated Approved Queue page in the authority workspace.
- Moved Contact Developer to its own `/contact` page and removed it from the report submission page.
- Lazy-loaded map libraries to improve initial loading on slower mobile connections.
- Added quiet automatic refresh of the public ticket directory every 15 seconds without replacing the list with a loading screen.
- Corrected the reporter's SMS message for background processing and hardened malformed approval-expiry handling.
- Added mobile width and overflow refinements.

## 2.4.0 - Responsive redesign, Approved queue and status SMS
- Redesigned the public reporter portal for desktop and phone use; mobile now uses an app-like bottom action bar and touch-friendly fields.
- Moved Contact the Developer directly below the Submit a Report panel.
- Highlighted that the contact number is OPTIONAL; reports can still be submitted without a phone number.
- Added the Approved status with a 24-hour authority quick-access queue. The temporary queue clears after 24 hours or when the authority page is refreshed/reopened; records remain in report history and ticket tracking.
- Expanded SMS status notifications to every changed status when the reporter has opted in and SMS is configured. SMS messages include the ticket ID and updated status.
- Improved the authority workspace cards, status controls, and report-detail layout on mobile.
- Updated project metadata and health endpoint to v2.4.0.


## 2.3.0 - Public ticket list, privacy and optional SMS
- Added a public list of active ticket IDs and an option to include resolved/closed tickets.
- Limited public ticket list and lookup to ticket ID, category, status and dates; detailed report fields remain authority-only.
- Made reporter name optional and added an optional Philippine mobile number with explicit SMS opt-in. The number is encrypted at rest with AES-256-GCM and decrypted only for authority responses. Older plain-text phone values are migrated after an encryption key is configured.
- Added optional Semaphore SMS notifications for receipt and any changed status. SMS requires the phone encryption key, provider API key, sender setup and available credits; failure does not prevent report storage or status updates.
- Added a per-connection report submission limit and Contact Developer email-preparation form.
- Added tests for ticket recovery, phone privacy, public response minimization and status/SMS workflows.


## 2.2.0 — 2026-11-03

- Reworked the authority report inbox into responsive cards with whole-card touch and keyboard activation.
- Added an explicit details cue and instant cache-first opening from the protected authority report list.
- Added duplicate-open protection, loading feedback, retry feedback, and capture-phase click delegation for touch/mouse/map popup events.
- Added a clear no-photo placeholder and improved no-coordinate map state.
- Replaced the generic browser sign-out prompt with a visible Yes/No confirmation and a return-to-public-page message.
- Improved the report list for phone, tablet, and desktop layouts.
- Added tests for authority-only report detail access and the updated UI flow.

## 2.1.0

- Added project introduction, public report portal, location selection, authority sign-in, report details, and status tracking.
