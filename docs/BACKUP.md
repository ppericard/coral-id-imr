# Backup of the sheet to pCloud

The sync sheet ("IMR Coral ID – RA progress": accounts, the answer log, reports, events) has one copy, in Pierre's Google
account. Since sheet v139 the sheet script saves a second copy once a week in **Pierre's own pCloud**, server to server:
the data never passes through an agent, GitHub or this repository (Pierre, 2026-11-15: "OK, launch the pCloud backup
PR"; the professionalise study's question f, [reviews/2026-11-14-professionalise-study.md](reviews/2026-11-14-professionalise-study.md)
§3.6, with pCloud in place of R2).

It reaches pCloud one of two ways, set in the script's properties:

- **A pCloud upload link** (`PCLOUD_UPLOAD_CODE`, sheet v144; the way Pierre uses). Pierre, 2026-11-15: no pCloud
  OAuth app (making one needs pCloud's approval), a pCloud upload link instead ("Request files"), made on his account
  on pCloud's European servers. The link's code can only add files: it cannot read, list or delete anything, so **old
  backups are not pruned by the script** on this path; Pierre deletes them by hand. Setup: "Pierre's setup: upload
  link" below.
- **A pCloud OAuth token** (`PCLOUD_TOKEN`, sheet v139): the script makes its folder and keeps the 12 newest backups.
  Setup: "Other setup: an OAuth token" below. If both are set, the token is used and every log line says so.

## What it does

- **What**: every tab of the spreadsheet, as one `.xlsx` file, named `reef-id-sheet-YYYY-MM-DD.xlsx` (the day in Manila
  time). With an upload link it lands in the folder the link was made for (pCloud renames a second file of the same
  name, so a second run on one day adds a copy). With a token it lands in the pCloud folder
  `/IMR/reef-id-sheet-backups` (made if missing). The file is built by the script from the
  cell values: numbers, true/false and dates keep their type, text stays text (a text starting with `=` or `+` is never
  read as a formula). Formulas, colours, frozen rows and hidden columns are not kept: the script writes plain data.
- **When**: every Sunday at about 02:00 Manila time (a weekly trigger, `backupWeekly`), and whenever Pierre clicks
  **Reef ID > Back up to pCloud now** in the sheet's menu.
- **Kept**: with an upload link, **everything**: the script cannot delete through the link, so Pierre deletes old
  backups by hand (for example keeping the 12 newest, about three months). With a token, the **12 newest**
  backups of that folder; older ones are deleted, only files named as above, only in that folder, and only after the
  new file was uploaded. pCloud keeps a deleted file in its trash for a while (its own retention), then it is gone.
- **Log**: one line per run in the sheet's **Deploy log** tab, starting `pCloud backup:`. It gives the file name, or why
  nothing was saved:
  - upload link: `saved reef-id-sheet-….xlsx (upload link; old backups are not pruned)`, or `upload of … to the upload
    link failed (result N…)` where N is pCloud's error number, in words for the link's own errors (7002 deleted, 7004
    expired, 7007 full, 7008 file limit);
  - token: the size and how many old backups were deleted, or `pCloud refused the token or the folder (result N)`;
  - either: `not configured` (no token nor code, or one not valid), `needs authorisation`, `failed: …`; with both set,
    the line ends `[token path; PCLOUD_UPLOAD_CODE not used]`.

  The token and the code never appear there (they are scrubbed from any error text), nor pCloud's error text.
- **Is it recent?** The admin's To do › Alerts card says when the last backup saved (`readInfra`, sheet v180, admin token),
  flagged past 8 days; the hourly Health check ([PAGES.md](PAGES.md) "Infrastructure health") can fail on it once it is given
  the token. Nothing public exposes the Deploy log, so without the token the check says "not exposed" and passes.
- **Safety**: the backup runs on its own, never inside a player's request, never under the script's lock and never in
  the 15-minute trigger (`autoUpdate`). A missing token or code, or a refused one, only writes its log line: the app, the
  leaderboard and the self-update keep working. It needs **no new Google permission**: it reads the sheet with the
  permission the script already has and calls pCloud with the "external requests" permission it already has. (Google's
  own export of the file would have needed a Drive permission, and a permission added to the script's manifest is
  expected to stop the web app and its trigger until Pierre accepts it, which the self-update cannot undo: not tried,
  so avoided. The script builds the file itself instead.)

## Pierre's setup: upload link (about 5 minutes, on a computer)

The link's code is a secret (whoever has it can add files to that folder of your pCloud): it goes **only** into the
script's settings, never into a chat, an e-mail, GitHub or a file.

1. **The upload link** (done, 2026-11-15). Check in pCloud that it has **no expiry date, no file limit and no space
   limit**: when one is reached, pCloud refuses the upload and the Deploy log says `result 7004` (expired), `7007`
   (full) or `7008` (file limit).
2. **Paste its code into the script.** In the sheet: **Extensions > Apps Script > Project settings** (gear,
   "Paramètres du projet") **> Script properties > Add script property**: property `PCLOUD_UPLOAD_CODE`, value the
   `code=` value of your upload link (the part after `code=`, up to the end or to the next `&`). Optionally add the
   property `PCLOUD_HOST` = `eapi.pcloud.com` (it is the default for the upload link anyway). Save.
3. **The first backup.** Reload the sheet, then click **Reef ID > Back up to pCloud now** (the menu appears once the
   script version with the upload link is live, about 15 minutes after the merge). The first click makes the weekly
   trigger too. A note at the bottom right and the Deploy log's last line say what happened: `saved
   reef-id-sheet-YYYY-MM-DD.xlsx (upload link; old backups are not pruned)`, and the file is in the link's folder in
   pCloud. Not tried against pCloud before this first click (agents never call pCloud): if the line says `failed` or
   gives a `result`, send the line (it holds no secret) to an agent.
4. **Old backups are pruned by hand.** Every month or so, in the link's folder in pCloud, delete the
   `reef-id-sheet-….xlsx` files beyond the 12 newest.

To stop the backups: delete the property `PCLOUD_UPLOAD_CODE` (each run then only logs "not configured"), and in Apps
Script **Triggers** (clock icon) delete the `backupWeekly` trigger. To revoke the code itself: delete the upload link in
pCloud.

## Other setup: an OAuth token (not used: it needs a pCloud app, which pCloud must approve)

The token is a secret: it goes **only** into the script's settings, never into a chat, an e-mail, GitHub or a file.

1. **Make a pCloud app** (this gives a token that does not expire: pCloud's OAuth 2.0 documentation says "With the
   current implementation the access tokens given from pCloud API do not expire"). Signed in to pCloud, open "My Apps"
   in pCloud's API documentation (<https://docs.pcloud.com/my_apps/>) and create a new app (any name, for example "Reef
   ID backup"). If the form asks what the app may reach, the choice is yours: full access puts the backups in `/IMR` as
   planned; an access limited to the app's own folder (if pCloud offers it) is safer, since the token then reaches
   nothing else in your pCloud, but the backups land under that app's folder instead of `/IMR`. Not seen here: the form
   needs a pCloud sign-in. Note the app's **Client ID** and **Client secret**.
2. **Get the token.** In the browser, open (with your Client ID):
   `https://my.pcloud.com/oauth2/authorize?client_id=CLIENT_ID&response_type=code`
   Approve: pCloud shows a **code**. Then open (with your Client ID, Client secret and that code):
   `https://api.pcloud.com/oauth2_token?client_id=CLIENT_ID&client_secret=CLIENT_SECRET&code=CODE`
   If the reply says `"result": 0`, it holds `"access_token": "…"`: that is the token, and the account is on the US
   servers. If the reply is an error, open the same address with `eapi.pcloud.com` in place of `api.pcloud.com`: an
   account on pCloud's European servers answers there. A code may work only once and only for a few minutes (not
   checked here): if `eapi.pcloud.com` then says the code is invalid or expired, open the authorize address again for a
   new code and exchange it on `eapi.pcloud.com` first.
3. **Paste it into the script, nowhere else.** In the sheet: **Extensions > Apps Script > Project settings** (gear,
   "Paramètres du projet") **> Script properties > Add script property**: property `PCLOUD_TOKEN`, value the token.
   Optional properties:
   - `PCLOUD_HOST`: `api.pcloud.com` or `eapi.pcloud.com`, the one that answered in step 2. Without it the script tries
     the US host first, then the European one, at each run (one extra request a week).
   - `PCLOUD_FOLDER_ID`: a pCloud folder id (digits only) in which `reef-id-sheet-backups` is made, instead of `/IMR`.
   Save. Close the browser tabs of step 2 (their addresses hold the secret) and clear them from the history if the
   computer is shared.
4. **The first backup.** Reload the sheet: the **Reef ID** menu appears in the menu bar once the script version with the
   backup is live (about 15 minutes after the merge). Click **Reef ID > Back up to pCloud now**. The first click makes
   the weekly trigger too. A note at the bottom right and the Deploy log's last line say what happened; the file is in
   pCloud under `/IMR/reef-id-sheet-backups`. No permission prompt is expected; if Google shows one, accept it (it is the
   script's own existing permissions).

To stop the backups: delete the property `PCLOUD_TOKEN` (each run then only logs "not configured"), and in Apps Script
**Triggers** (clock icon) delete the `backupWeekly` trigger. To revoke the token itself: delete the app in pCloud's My
applications.

## Restore

1. In pCloud, download the newest `reef-id-sheet-YYYY-MM-DD.xlsx` from the upload link's folder (with a token:
   `/IMR/reef-id-sheet-backups`).
2. To look at it or check one tab: open it in Google Sheets, Excel or LibreOffice.
3. To rebuild the sync sheet (the Google account or the sheet is lost): in Google Drive, **New > Google Sheets**, then
   **File > Import > Upload**, choose the file, **Replace spreadsheet**, **Import data**. Every tab comes back with its
   name and values. Then open **Extensions > Apps Script** in that sheet, paste `tools/sync/Code.gs` from `main` and
   `tools/sync/appsscript.json`, deploy it as a web app (HANDOVER.md "Code.gs (progress sync) and how to redeploy"), and
   point `SYNC_URL` in `app.js` at the new `/exec` address (a PR). The Script Properties (`ANON_SALT`, the code or the token) are not
   in the backup: `ANON_SALT` must be set again to its old value, or every anonymous player's admin id changes. Ask an
   agent to walk through it.
4. Partial restore (one tab damaged): import the file into a new spreadsheet, then copy the tab's rows into the live
   sheet by hand, or ask the integrator (writing to the sheet needs Pierre's explicit permission each time).

Not checked yet (rule W11): Google Sheets' import of a cell longer than 32,767 characters (Excel's cell limit; Google's
is 50,000). LibreOffice opens such a cell from this file whole. The tabs that hold such cells are rebuilt by the script
itself (the pooled stats' `Stats` snapshots, the `Replayed` tabs), and the answer log, which progress is rebuilt from
(rule D9), holds short cells only.

## Privacy and deleted accounts (rule D7)

A backup is a copy of the sheet as it was that day, names and answers included, in Pierre's pCloud only (privacy.html
says so). An account deleted, merged or archived in the admin stays in the backups made before, until they are deleted:
with the upload link, when Pierre prunes them by hand (the script cannot); with a token, when they age out (12 weeks).
Then pCloud's trash. No normal feature of the app reads them; they are opened only to restore.

Code: `tools/sync/Code.gs` `backup_`, `backupCode_`, `backupLink_`, `xlsx_`, `installBackup`, `backupNow`, `backupWeekly`, `onOpen`; tests
`tests/backup.test.js` (stubbed pCloud, in-memory sheet).
