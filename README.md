# Pilar 360 — Jerosh's Community Reporting Prototype

**A modern civic issue-reporting demo for Pilar, Sorsogon. Designed & built by Jerosh.**

Pilar 360 is a responsive web prototype for recording community issues such as damaged roads, uncollected waste, blocked drainage, broken streetlights, and public-space concerns. Residents can create a report, attach a photo, add a barangay/landmark and optional coordinates, and receive a locally generated report ID. A demo coordinator can change the status and assignment, while the report keeps an activity timeline.

> **Important:** This is an independent student/developer prototype, not an official Municipality of Pilar application. The sample reports and coordinates are fictional/approximate. Submissions are saved only to the local project's JSON file. No report is delivered to an LGU, no official case number is issued, and this system must not be used for emergencies.

## Features

- Responsive civic dashboard with overview metrics and category breakdowns.
- Report creation with category, description, barangay, landmark, priority suggestion, optional image, and optional browser geolocation.
- Local report IDs, search, status/category filters, detail view, and activity timeline.
- Demo coordinator controls for status and department updates.
- Map pins using Leaflet + OpenStreetMap tiles when internet is available; the rest of the UI works locally if the map tiles cannot load.
- Insights, JSON data export, and sample-data reset.
- Native Node.js API, input validation, request-size limits, safe static file handling, and built-in smoke tests.
- No npm dependencies required.

## Quick start

**Requirements:** Node.js 18+ (Node.js 20 or 22 recommended). No `npm install` step is needed.

### Windows

1. Extract the ZIP.
2. Open the project folder.
3. Double-click `run.bat`, or open Command Prompt/PowerShell in this folder and run:

   ```bash
   npm start
   ```

4. Open <http://127.0.0.1:4173> in your browser.

### Linux / macOS / Termux

```bash
cd Pilar360_Jerosh
chmod +x run.sh
./run.sh
```

Or use `node server.js` / `npm start`. To stop the server, press `Ctrl+C` in the terminal.

If port 4173 is already in use:

```bash
PORT=4174 npm start
```

Then open <http://127.0.0.1:4174>.

## Test the API

Run the server in one terminal, then open another terminal in the project folder:

```bash
npm test
```

The smoke test starts an isolated temporary server and checks health, report listing, validation, create/update workflow, and JSON export. It does not modify the project's saved data.

## Project structure

```text
Pilar360_Jerosh/
├── server.js                 # Native Node.js HTTP server + REST API
├── package.json              # start/dev/test scripts; zero runtime dependencies
├── public/
│   ├── index.html            # App shell and navigation
│   ├── styles.css            # Responsive visual system
│   ├── app.js                # Frontend state, forms, filters, maps, API calls
│   └── favicon.svg
├── data/
│   ├── .gitkeep              # Keeps the data directory in Git
│   └── reports.json          # Generated on first launch; ignored by Git
├── tests/
│   └── smoke-test.js         # Automated API smoke test
├── ARCHITECTURE.md           # Architecture and route reference
├── API.md                    # REST API examples
├── run.sh
└── run.bat
```

## GitHub upload

1. Create a new repository on GitHub (for example, `pilar-360-jerosh`).
2. Extract this ZIP locally.
3. Upload the files **inside** the `Pilar360_Jerosh` folder to the repository root, or run these commands inside the extracted folder:

   ```bash
   git init
   git add .
   git commit -m "Build Pilar 360 community reporting prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/pilar-360-jerosh.git
   git push -u origin main
   ```

   Replace `YOUR-USERNAME` with your own GitHub username and use the actual repository URL from GitHub. Do not commit personal/real complaint data.

**GitHub Pages note:** This is a full-stack Node.js prototype, so simply enabling GitHub Pages will not run the API or save reports. Run it locally or deploy the backend to a trusted Node.js host after adding production-grade authentication, privacy controls, storage, monitoring, and LGU approval.

## Security and production boundary

This build is for local demonstration and learning only. It intentionally has **no authentication or role-based access control**, and the coordinator endpoints can be called by anyone who can access the server. The default host is `127.0.0.1`, limiting access to the same device. Do not expose this server to a public internet or collect real personal information. The local JSON store is not a substitute for a secured database, access-control policy, backup plan, or approved government case-management system.

For real deployment, work with the Municipality of Pilar and add authenticated accounts, least-privilege roles, audit logging, secure media storage, rate limiting, spam/abuse detection, data retention/deletion policy, backups, monitoring, verified department routing, HTTPS, incident response, and a formal privacy notice/consent flow. Remove fictional seed data before any controlled test with an authorized partner.

## Research and inspiration

The interaction model was informed by publicly described citizen-service/reporting concepts, without copying another application's code or claiming affiliation:

- [City of Naga — MyNaga app announcement](https://www2.naga.gov.ph/available-mynaga-app/) — city service access and community-issue reporting.
- [311 Philippines — overview](https://my311.ph/about/) — photos, location pins, non-emergency issue tracking, and service coordination.
- [Municipality of Pilar, Sorsogon — official website](https://www.pilarsor.gov.ph/) — official municipal online information.

**Project credit:** Designed and built by Jerosh as an independent prototype.
