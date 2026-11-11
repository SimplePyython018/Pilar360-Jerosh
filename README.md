# Pilar360 — Community Issue Reporting & Tracking Prototype

**Pilar360** is an independent Grade 12 ICT student project prototype by Jerosh Nevado. It focuses on Barangay Marifosque Pilar Sorsogon, and demonstrates a simple way to submit a community concern, receive a report ID, and view status updates saved in the demonstration system.

> **Important:** Pilar360 is a school project demonstration, not an official Barangay Marifosque or Municipality of Pilar service. Reports are saved by this demo server only. No barangay or municipal office is automatically notified, no official case number is issued, and no repair or response is guaranteed. Do not collect real residents' personal information or use it for public-service operations without school approval, barangay/LGU permission, and proper privacy/security review.

## Version 2.5 improvements

- Fixed the Authority **Save status** form so an administrator can actually save Approved, In Progress, Resolved, and other valid statuses.
- Public ticket directory now shows a ticket after it has been approved, and keeps that ID visible as its status advances. Public views still reveal only ticket ID, category, status and dates.
- Rebuilt the authority overview with a lighter report-first layout and separate Map page. The map library is not loaded just to show the dashboard.
- Added compact authority workspace data responses that leave photos, timelines and phone numbers for the single-report detail request, reducing initial data transfer.
- Added a standalone `/contact` page, separated from report submission.
- Made SMS processing asynchronous so a slow SMS provider does not delay the successful report/status save response.
- Added quiet public-ticket refresh and clearer SMS processing feedback.

## Version 2.4 improvements

- Reworked the reporter portal into a clearer desktop layout and an app-like mobile layout, with a compact mobile action bar and larger touch-friendly inputs.
- Moved Contact the Developer directly below the Submit a Report panel.
- Made the optional contact number label more visible; the field remains optional, and report submission works without a number.
- Added an **Approved** status and a dedicated 24-hour Approved queue in the authority workspace. The queue is temporary: it clears after 24 hours or when the authority page is refreshed/reopened. The report record, ticket ID, current status, and status history remain saved for tracking.
- Fixed status notifications so an opted-in reporter can receive an SMS after a status change (Approved, Assigned, In Progress, Resolved, etc.), not only when a report is marked Resolved. The message includes the ticket ID and the new status.
- Kept notifications opt-in and provider-dependent. A server encryption key and configured SMS provider are required; a queued message is not a guarantee of delivery.
- Improved the authority view for phones and tablets, including status controls and report detail panels.

## Version 2.3 improvements

- Added a public ticket directory for active reports so a resident can recover a forgotten ticket ID. The default list shows only ticket ID, category, status and update date; it does not show report descriptions, titles, reporter names, landmarks, photos, coordinates or contact numbers.
- Added an option to include resolved/closed tickets in the public directory so an old ticket ID can still be found.
- Changed public ticket lookup to show status history and dates only. Full report content and the full contact number remain authority-only.
- Added optional reporter name and Philippine mobile number fields. The full number is encrypted at rest with AES-256-GCM, never returned by public endpoints, and shown only after authority sign-in. A server encryption key is required before a number can be accepted.
- Added opt-in SMS notification hooks for report submission and each changed status. SMS is disabled unless the server encryption key and Semaphore API key are configured in the server environment. SMS delivery depends on the provider, account approval, credits and mobile network; the UI always tells the reporter to keep the ticket ID.
- Added a basic per-connection submission limit to reduce accidental or repeated demo spam.
- Added tests for public-ticket privacy, private phone access and the status notification workflow.

## Version 2.2 improvements

- Reworked the authority inbox into clear report cards that are easier to tap on phones and easier to scan on desktop.
- Added a visible **View report details** button on every report card and dashboard report preview.
- Fixed the report-opening interaction: report details now open immediately from the data already loaded in the protected authority inbox instead of waiting for an unnecessary second API request. A loading state and retry message appear only when a record must be fetched.
- Added safer click handling for touch, mouse, keyboard, and map-popup report links. Repeated taps on a report no longer start duplicate detail requests.
- Added a photo evidence placeholder when no photo was attached, so the detail page never appears to have a broken or missing section.
- Improved map-location empty states and the modal/map stacking on smaller screens.
- Replaced the browser's generic sign-out prompt with a clear Yes/No confirmation. Choosing Yes ends the session and returns to `/report`, with a short confirmation message; choosing No keeps the authority workspace open.
- Kept the project flow straightforward: introduction → public report portal → authority inbox → report detail → sign out → public report portal.
- Kept the design responsive for phones, tablets, laptops, and desktops. The project remains a student prototype and is not connected to an official LGU office.


## User flow

1. Visitor opens the project link at `/` and reads the short introduction.
2. Visitor taps **Explore Pilar360** to open `/report`.
3. Reporter fills in the required report information, may leave the name and phone number blank, and types/selects `Marifosque` as the barangay.
4. Reporter may tap the map, use device location, enter coordinates, or provide a nearby landmark.
5. The system saves the demonstration record and displays a report ID.
6. Reporter can use the report ID in **Check report status** or find it in the public ticket directory. Resolved/closed tickets can be included with the filter.
7. The authority user opens `/admin`, signs in, taps a report card or **View report details**, checks the photo area and location map, and saves a status. **Approved** tickets enter a quick-access queue that clears after 24 hours; the record remains in report history and public ticket tracking.
8. When signing out, a clear Yes/No dialog appears. Choosing Yes ends the session and returns to `/report`; choosing No keeps the authority workspace open.

## Quick start

**Requirements:** Node.js 18 or newer. The app uses Node.js built-in modules; no external npm package installation is required.

1. Extract the ZIP.
2. In the project folder, copy `.env.example` to `.env`.
3. Open `.env` and set a private demo password. Phone numbers are optional and will stay disabled until you add a private encryption key of at least 32 characters:

   ```env
   PILAR360_ADMIN_PASSWORD=choose-a-private-demo-password
   # Optional phone encryption (only if you plan to collect contact numbers)
   # PILAR360_PHONE_ENCRYPTION_KEY=copy-a-64-character-random-hex-value-here
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open `http://127.0.0.1:4173/` for the project introduction.
6. Tap **Explore Pilar360** or open `http://127.0.0.1:4173/report` for the public report portal.
7. Open `http://127.0.0.1:4173/admin` for the authority workspace.

### Termux / Linux / macOS

```bash
cd Pilar360_Jerosh
cp .env.example .env
nano .env
npm start
```

To stop the server, press `Ctrl+C`.

## Hosting setup (Render)

Set `PILAR360_ADMIN_PASSWORD` in the Render web service's **Environment** settings. Do not put the password in frontend files or a committed GitHub file. If you plan to accept optional contact numbers, also set `PILAR360_PHONE_ENCRYPTION_KEY` to a private random value with at least 32 characters. Generate one in Termux with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep the same value permanently; changing or losing it prevents the server from decrypting old numbers. Add `SEMAPHORE_API_KEY` only after setting up an SMS provider account. The default server host is `0.0.0.0`; Render supplies the `PORT` value. After saving environment changes, allow Render to rebuild and deploy.

The JSON data file may not survive a host restart or redeploy when the platform uses an ephemeral filesystem. A persistent disk/database is needed to preserve records reliably; this prototype does not configure one. Use fictional records for a class demonstration.

### Optional SMS setup

Pilar360 can request SMS notifications through Semaphore only when the server administrator configures both `PILAR360_PHONE_ENCRYPTION_KEY` and `SEMAPHORE_API_KEY` in the hosting environment. `SEMAPHORE_SENDERNAME` may also be set if an approved sender name is available. Do not place these values in browser files or commit them to GitHub. The provider may require account approval and paid SMS credits. When SMS is not configured or cannot be queued, the report is still saved and the website asks the reporter to keep the ticket ID. Do not use real residents’ phone numbers in a school demo without permission and adviser approval.

### Ticket directory and privacy

The public directory lists ticket IDs, categories, statuses and update dates only. It does not reveal the full issue description, reporter name, phone number, photo, exact landmark or map coordinates. The public tracker follows the same limited view. Full report details and the optional decrypted contact number are available only after authority sign-in; the phone number is encrypted in the server data file. Public ticket IDs are visible to everyone, so use demo/test information and do not treat the ticket ID as a private password.

## Map and device support

The layouts adapt to phones, tablets, laptops, and desktop browsers. Report submission and status tracking do not require a map. Interactive map tiles use Leaflet and OpenStreetMap and require an internet connection. Browser location permission is optional. If map tiles or location permission are unavailable, the user can type coordinates or provide a landmark. Map coordinates are user-provided and are not automatically verified. Sample report coordinates are illustrative demo data, not verified official locations.

## Main files

```text
Pilar360_Jerosh/
├── server.js                 # Node.js API, report storage, authority sessions
├── package.json
├── .env.example              # Copy to .env and set the demo authority password
├── public/
│   ├── index.html            # Project introduction / landing page
│   ├── intro.css             # Landing page styles
│   ├── report.html           # Public report and tracking portal
│   ├── reporter.css          # Public portal and map selector styles
│   ├── reporter.js           # Report submission, location picker and status tracking
│   ├── contact.html          # Standalone Contact Developer page
│   ├── contact.css           # Contact page styles
│   ├── contact.js            # Email-draft preparation
│   ├── admin.html            # Authority workspace and sign-in gate
│   ├── admin-styles.css      # Authority workspace styles
│   ├── admin-app.js          # Authority views, report inbox, maps and updates
│   └── favicon.svg
├── data/reports.json         # Created automatically; ignored by Git
├── tests/smoke-test.js       # API, access-control and page-route tests
├── tests/privacy-notifications-test.js # Ticket privacy, phone encryption and SMS flow tests
├── API.md
├── ARCHITECTURE.md
└── DEFENSE_GUIDE.md
```

## Test the project

```bash
npm test
```

The tests create a temporary data file and check the main user and authority workflows. They do not change the project's normal `data/reports.json` file.

## Project boundary

Pilar360 is an independent student-developed prototype. It is not officially owned, approved, or operated by a barangay or local government office. The authority password gate is a restricted classroom demo control, not a production-grade identity system. The in-memory authority sessions end when the server restarts. Production use would require formal LGU approval, individual authorized accounts, durable database and file storage, audit logging, privacy notice/consent, backup and retention rules, abuse protection, monitoring, and professional security testing.


## Contact developer

The standalone `/contact` page has a simple concern form for the project developer. Submitting the form opens the visitor's default email app with a message addressed to the developer; the visitor must review and press Send. The website does not automatically send or store this message. A direct server-side email form would need a configured email provider and private credentials.

## Phone number privacy

The contact number is optional. If a number is entered, the server requires `PILAR360_PHONE_ENCRYPTION_KEY` and stores the number encrypted with AES-256-GCM. Generate a long random key on a trusted device, set it as a private environment variable on the hosting service, and keep the same key for as long as saved phone numbers need to be read. If the key is lost or changed, previously encrypted numbers cannot be recovered. Never put the real key in GitHub, `.env.example`, browser JavaScript, screenshots, or public messages. Do not collect real residents' numbers for a class demonstration without permission and adviser approval.

### Optional SMS setup

After phone encryption is configured, SMS can be enabled by setting `SEMAPHORE_API_KEY` in the server environment. `SEMAPHORE_SENDERNAME` is optional when a default sender name is already registered on the Semaphore account. SMS requests are sent from the server to Semaphore; the API may return queued, pending or sent status. A request being accepted by the provider does not guarantee immediate delivery to the handset. Account setup, sender-name requirements and SMS credits are managed by the provider. When SMS is not configured or cannot be queued, the report is still saved and the user is told to keep the ticket ID.


## v2.5.0 update notes

This version fixes the Approved public-ticket workflow, renews expired approvals, moves Contact Developer to `/contact`, delays map-library loading until needed, and returns save responses without waiting for SMS provider delivery. See `CHANGELOG.md` for details.


## v2.6.0 update notes

- The home page now presents the full project proposal title and a short typing introduction for **Jerosh Nevado, Grade 12-ICT**.
- Mobile Submit / Check Status tabs no longer cover the report form or map.
- Authority report details return the text and metadata first; photo evidence is loaded only when requested.
- The photo endpoint is protected by authority sign-in, while the authority export still includes the attached photo.
- Admin API requests time out after 15 seconds and display a retry-friendly error instead of leaving the loading modal spinning indefinitely.

The current data file remains `data/reports.json` on the server's configured filesystem. A free hosting instance may use an ephemeral filesystem; configure durable storage or a database before relying on long-term records. See `UPDATE_INSTRUCTIONS_TERMUX_v2.6.0.md` before replacing an existing local copy.
