# Update Pilar360 to v2.1.0 using Termux

These steps replace the project code while preserving the existing Git repository, `.env`, `data/reports.json`, and the backup file `server.js.backup`.

1. Download `Pilar360_Jerosh_v2.1.0.zip` to your Android Downloads folder.
2. In Termux, run:

```bash
termux-setup-storage
pkg install unzip rsync -y
mkdir -p ~/Pilar360/update
unzip -o ~/storage/downloads/Pilar360_Jerosh_v2.1.0.zip -d ~/Pilar360/update
```

3. Copy the new app files into the existing repository. Do not remove the excludes:

```bash
rsync -av --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='data/reports.json' \
  --exclude='server.js.backup' \
  ~/Pilar360/update/Pilar360_Jerosh/ \
  ~/Pilar360/Pilar360_Jerosh/
```

4. Test the updated code:

```bash
cd ~/Pilar360/Pilar360_Jerosh
npm test
```

5. Commit and push the update:

```bash
git status
git add -A
git commit -m "Upgrade Pilar360 to v2.1.0"
git push origin main
```

If GitHub asks for a password over HTTPS, use your GitHub Personal Access Token at the password prompt. Never paste the token into a chat or save it in a project file.

6. Render should auto-deploy after the push. Wait until the latest commit shows **Live**. The existing Render environment variable `PILAR360_ADMIN_PASSWORD` should remain configured; do not add it to GitHub.

## New URLs

- `https://pilar360-jerosh.onrender.com/` — project introduction page
- `https://pilar360-jerosh.onrender.com/report` — public report and tracking portal
- `https://pilar360-jerosh.onrender.com/admin` — authority sign-in

The map tiles need an internet connection. If the map does not load, the reporter can still type coordinates or give a nearby landmark. Use fictional/sample data during a classroom demonstration.
