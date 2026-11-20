# A report can carry a screenshot or photo, reduced on the phone and kept in a tab of the sheet

Date: 2026-11-21. PR: #1354. Rules or docs touched: U14, D3, D4, D7; docs/spec/sync.md "Report images"; docs/spec/player-reports.md; docs/SECURITY.md; privacy.html.

## Context

Players could only describe a problem in words. Pierre asked to attach a photo or a screenshot to the feedback form
(2026-11-20). The study offered pCloud, Google Drive, a private R2 bucket; the queue of reports (`localStorage`) cannot
hold images and a sheet cell holds 50,000 characters.

## Decision

Pierre, 2026-11-21 05:48 (Q446): «question 446, capture d'écran en simple. Là, réduit la capture. Ok. Environ 800 pixels
en JPEG léger. Oui, quelques dizaines de kilos, moi ça me va. Elle envoie avec le rapport et le script la range
directement dans la feuille, dans un onglet à part. Là, j'en la lis quand il traite le rapport, puis on l'efface. Oui, ça
me va, c'est très bien. On va pas se faire pourrir de toute façon, et on va pas stocker éternellement des trucs dans la
feuille, donc ça me va. C'est pas lourd et ça me va.»

Integrator's calls (easy to correct): the input's wording ("Screenshot or photo (optional)"), the 200,000-byte cap on the
sheet and 180 kB on the device, the quality steps (800 px at 0.6, then 640 and 480 if too large), the tab's layout (one
row an image, the base64 text in 45,000-character chunks), the caps (6 a player and 120 in all per 6 hours), a picture
held in memory only so a report sent offline goes without it and says so, the deletion of the images when an account is
deleted keeping its answers (the report stays, the picture could show its owner), and the integrator's deletion by the
Sheets connector with `tools/report_image.js`.

## Consequences

- `sync.js`: `reportDialog` offers the input from script vNEXT (`REPIMG_SHEET`, rule D4); `repImgReduce` re-encodes
  on a canvas (EXIF and GPS dropped); `repBatch` sends a report with a picture alone in its request.
- `Code.gs`: `logReports_` keeps an `img` in the `Report images` tab, the Reports tab gets a last `Image` column (a new
  column at the end, the tab's layout rule), refusals leave the report logged; an image never outlives its report
  (rule D7: `repImgSweep_`, `anonReports_`, `repImgRelabel_`).
- Reading and deleting: `tools/report_image.js` and [spec/sync.md › Report images](../spec/sync.md#report-images).
- Not built: showing the picture in the admin's report card (the integrator reads it from the tab for now).
