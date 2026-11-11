# Update Pilar360 to v2.6.0 using Termux

These steps update the existing project without intentionally replacing your `.env` or `data/reports.json` file. Make a backup first.

## 1. Download and prepare

1. Download `Pilar360_Jerosh_v2.6.0.zip` to your phone's **Downloads** folder.
2. Open Termux and allow storage access if you have not done so before:

```bash
termux-setup-storage
```

3. Check that the ZIP is visible:

```bash
ls -lh ~/storage/downloads/Pilar360_Jerosh_v2.6.0.zip
```

## 2. Back up your current project

```bash
cd ~/Pilar360
mkdir -p backups
cp -a Pilar360_Jerosh "backups/Pilar360_Jerosh_before_v2.6.0_$(date +%Y%m%d_%H%M%S)"
```

Do not delete the backup. It contains your previous source files and local project data.

## 3. Extract the update and copy the new files

```bash
mkdir -p ~/Pilar360/update
unzip -o ~/storage/downloads/Pilar360_Jerosh_v2.6.0.zip -d ~/Pilar360/update
cp -a ~/Pilar360/update/Pilar360_Jerosh/. ~/Pilar360/Pilar360_Jerosh/
```

The update archive does not include a live `data/reports.json` file or a real `.env` file. The copy command overlays the updated source files; it does not remove your existing local report file or `.env`.

## 4. Run the tests

```bash
cd ~/Pilar360/Pilar360_Jerosh
npm test
```

Expected result: **5 tests passed, 0 failed**.

## 5. Run Pilar360 on your phone

Stop an older server first with `CTRL + C`, then run:

```bash
cd ~/Pilar360/Pilar360_Jerosh
npm start
```

Open this address in your phone browser:

```text
http://127.0.0.1:4173
```

The home page should show the project title and the animated presenter line. Tap **Explore Pilar360** to open the report portal.

## 6. Publish the update to GitHub / Render (if your GitHub repository is connected to Render)

Check the changed files first:

```bash
cd ~/Pilar360/Pilar360_Jerosh
git status --short
```

Then commit and push:

```bash
git add -A
git commit -m "Upgrade Pilar360 to v2.6.0"
git push origin main
```

If Render is connected to that GitHub branch with automatic deploy enabled, it should deploy the committed update. Check the Render deploy log and confirm that the service is live before testing the public URL.

## Important safety notes

- Do not upload `.env`, passwords, API keys, phone-encryption keys, or actual resident phone numbers to GitHub or public chat.
- Do not run the **Restore sample dataset** action on a live demo unless you intend to replace its report dataset.
- The site remains a school prototype, not an official barangay reporting channel.
- A JSON file on an ephemeral hosting filesystem may be lost during a restart or redeploy. Use a properly configured persistent disk or database for durable live records.
