# Pilar360 — Community Issue Reporting Prototype

**Pilar360** is an independent Grade 12 project prototype for Barangay Marifosque, Pilar, Sorsogon. It demonstrates two separate experiences: a public portal for submitting and tracking a report, and a password-protected authority workspace for reviewing reports and recording demo status updates.

> **Important:** Pilar360 is a student demonstration, not an official Barangay Marifosque or Municipality of Pilar service. Reports are saved by this demo server only. No barangay or municipal office is automatically notified, no official case number is issued, and no repair or response is guaranteed. Do not collect real residents' personal information or use it for public-service operations without school approval, barangay/LGU permission, and proper privacy/security review.

## What changed in version 2.0

- Separate **Resident Portal** (`/`) from **Authority Workspace** (`/admin`).
- Residents can submit a concern, add a display name, landmark, optional photo, and optional location coordinates.
- A successful submission returns a report ID; residents can use that ID to check the public status timeline.
- The public tracker does not reveal reporter names, exact coordinates, photos, or the full report inbox.
- The authority workspace requires a server-side password sign-in. Report lists, statistics, exports, report details, status updates, and reset actions are protected by an HTTP-only session cookie.
- The authority inbox shows the reporter name and reported location. The Community Map displays records that include valid latitude and longitude.
- The map now handles page resizing and desktop/tablet/mobile layout changes more carefully. A readable fallback remains when map tiles cannot load.
- Report validation requires a name, a complete issue description, and either both coordinates or neither coordinate.
- Automated tests now cover public submission, private authority access, status tracking, and report updates.

## Quick start

**Requirements:** Node.js 18 or newer. No `npm install` is required.

1. Extract the ZIP.
2. In the project folder, copy `.env.example` to `.env`.
3. Open `.env` and set the authority password:

   ```env
   PILAR360_ADMIN_PASSWORD=choose-a-private-demo-password
   ```

4. Start the app:

   ```bash
   npm start
   ```

5. Open `http://127.0.0.1:4173` for the public report portal.
6. Open `http://127.0.0.1:4173/admin` for the authority workspace and enter the password configured in `.env`.

### Windows PowerShell alternative

If you do not want to create a `.env` file, set the password for the current terminal session and start the server:

```powershell
$env:PILAR360_ADMIN_PASSWORD="your-private-demo-password"
npm start
```

### Termux / Linux / macOS

```bash
cd Pilar360_Jerosh
cp .env.example .env
nano .env
npm start
```

To stop the server, press `Ctrl+C`.

## Hosting setup

For a hosted demo, set the environment variable `PILAR360_ADMIN_PASSWORD` in the hosting provider's server settings. Do not put the password in `public/admin-app.js`, HTML, or a committed GitHub file. The hosted server must support Node.js and serve the app and API from the same origin. If using Render, set the variable under the web service's **Environment** settings, then redeploy. Keep `HOST=0.0.0.0` if your service configuration requires it.

The JSON data file may not survive a host restart or redeploy when the platform uses an ephemeral filesystem. A persistent disk/database is needed to preserve real data reliably; this prototype does not configure one. Use fictional records for a class demonstration.

## Map and device support

The layouts adapt to mobile phones, tablets, laptops, and desktop browsers. The report forms and status tracker work without the map. Interactive map tiles use Leaflet and OpenStreetMap and require an internet connection. Browser location permission is optional; a landmark can be entered instead. Map coordinates are user-provided and are not automatically verified.

## Main files

```text
Pilar360_Jerosh/
├── server.js                 # Node.js API, report storage, authority sessions
├── package.json
├── .env.example              # Copy to .env and set the demo authority password
├── public/
│   ├── index.html            # Public resident portal
│   ├── reporter.css          # Resident portal responsive styles
│   ├── reporter.js           # Report submission and public status tracking
│   ├── admin.html            # Authority workspace and sign-in gate
│   ├── admin-styles.css      # Authority workspace styles
│   ├── admin-app.js          # Authority views, report inbox, map and updates
│   └── favicon.svg
├── data/reports.json         # Created automatically; ignored by Git
├── tests/smoke-test.js       # Automated API and access-control tests
├── API.md
├── ARCHITECTURE.md
└── DEFENSE_GUIDE.md
```

## Test the project

```bash
npm test
```

The test creates a temporary data file and checks the main user and authority workflows. It does not change the project's normal `data/reports.json` file.

## Project boundary

Pilar360 is an independent student-developed prototype. It is not officially owned, approved, or operated by a barangay or local government office. The authority workspace is a demonstration of restricted access, not a production-grade identity system. Production use would require formal LGU approval, individual authorized accounts, stronger password management, durable database and file storage, audit logging, privacy notice/consent, backup and retention rules, abuse protection, monitoring, and security testing.
