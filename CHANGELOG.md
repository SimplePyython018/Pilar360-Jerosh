# Changelog

## 2.3.0 - Public ticket list, privacy and optional SMS
- Added a public list of active ticket IDs and an option to include resolved/closed tickets.
- Limited public ticket list and lookup to ticket ID, category, status and dates; detailed report fields remain authority-only.
- Made reporter name optional and added an optional Philippine mobile number with explicit SMS opt-in. The number is encrypted at rest with AES-256-GCM and decrypted only for authority responses. Older plain-text phone values are migrated after an encryption key is configured.
- Added optional Semaphore SMS notifications for receipt and transition to Resolved. SMS requires the phone encryption key, provider API key, sender setup and available credits; failure does not prevent report storage or status updates.
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
