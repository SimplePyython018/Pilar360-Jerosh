# Update Pilar360 to v2.5.0 using Termux

These steps replace the project code while preserving your existing Git repository, `.env`, report data file and `server.js.backup`.

1. Download `Pilar360_Jerosh_v2.5.0.zip` to your Android Downloads folder.
2. In Termux, prepare storage and the required tools:

```bash
termux-setup-storage
pkg update
pkg install nodejs-lts git unzip rsync -y
node -v
npm -v
```

3. Back up the current project before replacing files:

```bash
mkdir -p ~/Pilar360/backups
cp -a ~/Pilar360/Pilar360_Jerosh \
  ~/Pilar360/backups/Pilar360_Jerosh_before_v2.5.0
```

4. Extract the downloaded ZIP:

```bash
mkdir -p ~/Pilar360/update
unzip -o ~/storage/downloads/Pilar360_Jerosh_v2.5.0.zip -d ~/Pilar360/update
```

5. Copy the new app files into the existing repository. Do not remove the excludes:

```bash
cd ~/Pilar360/Pilar360_Jerosh
rsync -av --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='data/reports.json' \
  --exclude='server.js.backup' \
  --exclude='node_modules/' \
  ~/Pilar360/update/Pilar360_Jerosh/ \
  ~/Pilar360/Pilar360_Jerosh/
```

6. Run the tests:

```bash
npm install
npm test
```

7. Review the Git changes, then commit and push:

```bash
git rm --cached server.js.backup 2>/dev/null || true
git status
git add -A
git commit -m "Upgrade Pilar360 to v2.5.0"
git push origin main
```

If GitHub asks for a password over HTTPS, use your GitHub Personal Access Token at the password prompt. Never paste the token into a chat or save it in a project file.

8. Render should auto-deploy after the push. Wait until the latest commit shows **Live**. Keep `PILAR360_ADMIN_PASSWORD` configured in Render Environment settings. Do not add it to GitHub.

## Optional phone and SMS setup

Phone numbers are optional. To accept one, first generate a private encryption key in Termux:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value directly into the Render Environment settings as `PILAR360_PHONE_ENCRYPTION_KEY`. Keep it private and do not send it in chat or commit it to GitHub. Keep the same key permanently; changing or losing it prevents the server from decrypting previously saved phone numbers.

SMS also needs a Semaphore account and API key. Add the API key to Render as `SEMAPHORE_API_KEY`. Add `SEMAPHORE_SENDERNAME` only if you need to select a registered sender name. Never put either value in browser files, screenshots, or GitHub. SMS can use paid credits and provider approval. Do not use real residents' numbers for a class demo without permission and adviser approval.

## New URLs

- `https://pilar360-jerosh.onrender.com/` — project introduction page
- `https://pilar360-jerosh.onrender.com/report` — public report, ticket list, status tracking and Contact Developer
- `https://pilar360-jerosh.onrender.com/admin` — authority sign-in and private report workspace

The map tiles need an internet connection. If the map does not load, the reporter can still give a nearby landmark. Use fictional/sample information during a classroom demonstration.
