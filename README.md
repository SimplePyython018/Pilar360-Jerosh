# Pilar360 — Community Issue Reporting & Tracking Prototype

**Pilar360** is an independent Grade 12 ICT student project prototype by Jerosh Nevado. It focuses on Barangay Marifosque, Pilar, Sorsogon, and demonstrates a simple way to submit a community concern, receive a report ID, and view status updates saved in the demonstration system.

> **Important:** Pilar360 is a school project demonstration, not an official Barangay Marifosque or Municipality of Pilar service. Reports are saved by this demo server only. No barangay or municipal office is automatically notified, no official case number is issued, and no repair or response is guaranteed. Do not collect real residents' personal information or use it for public-service operations without school approval, barangay/LGU permission, and proper privacy/security review.

## Version 2.1 improvements

- Added a **project introduction page** at `/` that introduces Jerosh Nevado, Grade 12 ICT, and explains the project before visitors enter the portal.
- Moved the **public report portal** to `/report`.
- Changed the Barangay field from a pre-filled, read-only value to a required field where the user can select/type `Marifosque`. The prototype still accepts only Barangay Marifosque because that is the proposal's selected project area. Each submitted report must include either a nearby landmark or a map pin.
- Added an optional interactive location map. A reporter can tap the map, use device location, or type latitude and longitude. A nearby street/landmark can also be provided.
- Fixed the authority report-detail overlay so the map caption behind the modal no longer covers the report details.
- Added a map preview and an OpenStreetMap link inside each authority report detail when coordinates exist. Reports without coordinates clearly say that no map pin was provided.
- Added a Yes/No confirmation before authority sign-out. Confirmed sign-out ends the server session and returns to `/report`.
- Kept authority report data behind a server-side password session. The session cookie is `HttpOnly` and `SameSite=Strict`; login attempts are limited, passwords are compared using a timing-safe check, and browser write requests with a different Origin are rejected.
- Set the default server host to `0.0.0.0` for Render and other hosted environments.
- Expanded automated tests for the new landing page, report route, blank barangay input, map selector, and cross-origin request rejection.

## User flow

1. Visitor opens the project link at `/` and reads the short introduction.
2. Visitor taps **Explore Pilar360** to open `/report`.
3. Reporter fills in the required information and types/selects `Marifosque` as the barangay.
4. Reporter may tap the map, use device location, enter coordinates, or provide a nearby landmark.
5. The system saves the demonstration record and displays a report ID.
6. Reporter uses the report ID in **Check report status**.
7. The authority user opens `/admin`, signs in, reviews the report, checks the location map, and updates the demo status.
8. When signing out, the user confirms Yes or No. Choosing Yes ends the session and returns to `/report`.

## Quick start

**Requirements:** Node.js 18 or newer. The app uses Node.js built-in modules; no external npm package installation is required.

1. Extract the ZIP.
2. In the project folder, copy `.env.example` to `.env`.
3. Open `.env` and set a private demo password:

   ```env
   PILAR360_ADMIN_PASSWORD=choose-a-private-demo-password
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

Set the environment variable `PILAR360_ADMIN_PASSWORD` in the Render web service's **Environment** settings. Do not put the password in `public/admin-app.js`, HTML, or a committed GitHub file. The default server host is `0.0.0.0`; Render supplies the `PORT` value. After saving environment changes, allow Render to rebuild and deploy.

The JSON data file may not survive a host restart or redeploy when the platform uses an ephemeral filesystem. A persistent disk/database is needed to preserve records reliably; this prototype does not configure one. Use fictional records for a class demonstration.

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
│   ├── admin.html            # Authority workspace and sign-in gate
│   ├── admin-styles.css      # Authority workspace styles
│   ├── admin-app.js          # Authority views, report inbox, maps and updates
│   └── favicon.svg
├── data/reports.json         # Created automatically; ignored by Git
├── tests/smoke-test.js       # API, access-control and page-route tests
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
