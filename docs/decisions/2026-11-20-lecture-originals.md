# The 86 Corals of the World screenshots are replaced by their originals, on R2

Date: 2026-11-20. PR: #1292. Rules or docs touched: `docs/spec/photos.md`, `docs/PAGES.md`, `docs/ROADMAP.md`,
`tools/imr_frames.json`, `tools/fetch_imr_originals.py`, `tools/apply_imr_originals.py`,
`.github/workflows/reefid-originals.yml`, `index.html` and `admin.html` (CSP), `tests/imrsources.test.js`.

## Context

The IMR lecture's coral photos are mostly screenshots of Corals of the World pictures (study 2026-11-15, 86 of 118). Pierre
decided on 2026-11-18 (inventory C12, "C12 A+D", ANSWERS "Lecture photos"): the screenshots are replaced by the original
images with their exact credit (the credit was applied after the study: `a`, `pg`). On 2026-11-20 he kept the 34
lecture photos with no source in play as "IMR", untouched.

## Decision

- **Same file name, new pixels.** Each record keeps its `f` (curation, calibration and the players' records key on it);
  its files are made from the original and uploaded to R2 under that name; `iv` +1 makes the app ask for the new ones.
- **Where it lives.** A photo with an online original lives on R2 only, never in git (rule: photos out of the repo,
  Pierre, 2026-11-05), so each record gets `src` (the original's address) and the screenshot's files leave `img/` (git
  history keeps them). Integrator's call, following that standing rule. The fallback when R2 fails is the original
  itself, as for iNaturalist and FishBase photos; coralsoftheworld.org joins the CSP's `img-src` (rule U5).
- **Framing.** The lecture's screenshots are crops of the pictures (79 of 86), one turned a quarter (`imr-p12_i8`),
  three stretched about 15 % wider than the original. Each screenshot was located in its original by matching
  (ORB features, RANSAC homography, at least 100 consistent points) and every pair was looked at side by side; `cr` and
  `ro` are that crop and turn, so a photo shows what the lecture showed, at the original's true proportions.
- **Pixels.** 81 of 86 originals give more pixels than the screenshot (often two to four times more); 5 give fewer
  (`imr-p51_i7`, `imrl-p28_i12`, `imrl-p28_i5`, `imrl-p38_i6`, `imrl-p58_i12`: the screenshot was blown up or kept a
  border). They are replaced like the others: the original is the true picture.
- **How it is fetched.** `tools/fetch_imr_originals.py`: public pages, one request every 2 s, a generic User-Agent, each
  picture once, host fixed to www.coralsoftheworld.org, size checked against the recorded cut. It runs in
  `reefid-originals.yml` (read only, R2 secrets only), which uploads with `tools/r2_sync.sh`.
- **Not touched.** The 34 untraced lecture photos, `curation.json`, the credits, `imr: true`, the rights class.
