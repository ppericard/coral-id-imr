# Tool and admin data in `data/`, what players load stays at the root

Date: 2026-11-20. PR: #1. Rules or docs touched: A1, W15, W16; docs/DATA.md, docs/ARCHITECTURE.md "Data files",
docs/spec/deploy.md, docs/spec/data.md, docs/PAGES.md, tools/README.md, ROADMAP "Tool and admin data into `data/`"
(row removed).

## Context

The repository root held about thirty JSON files, some downloaded by every player (`data.json`, `fish-game.json`), some
read only by the tools and the admin (the candidate lists, the judging passes' results). The root hid which was which.

## Decision

- Pierre, 2026-11-08 (ROADMAP row of PR #751, Q265): "Ok pour tes propositions". The proposals: move only the files
  players never download into `data/`; what players load stays at the root until the domain change, which also moves
  the code into `js/` and `css/`. (The ledger's Q265 line in docs/ANSWERS.md is a different, earlier answer; this
  decision is carried by the ROADMAP row it came from.)
- Integrator's calls made while building:
  - **Moved** (`git mv`, history kept): `cand.json`, `fish-cand.json`, `seaslug-cand.json`, `excluded.json`,
    `suggest.json`, `dups.json`, `names.json`, `presence.json`, `points.json`, `metrics.json`, `measured.json`.
  - **Stayed at the root**: everything a player's page, `sw.js` or `progress.js` loads (`data.json`, `fish*.json`,
    `seaslug.json`, `seaslug-game.json`, `forms.json`, `quality.json`, `picks.json`, `calibration-set.json`,
    `reports-handled.json`) and `curation.json` (the admin's Publish writes it at that path, rule A1).
  - **`data/` is published**: it is not `export-ignore`, because the admin reads these files from the site
    (`fetch('data/…')`); `tools/curplay.py` also reads two of them in the staged copy. The sheet script reads none.
  - **`cand.json` is the borderline case**: `app.js` fetches it only behind `?draft` (the admin's preview of an unsaved
    draft); no player's normal load does. It moved, and that one fetch follows.
  - `core.js` `SUBJECTS` `admin.files.cand` names the new paths, so `Code.gs` (its copy) changes with a changes file
    (rule D3); nothing the script computes changes.
  - `tools/apply_excluded_archive.py` reads old revisions, where `cand.json` is still at the root: it tries both paths.

## Consequences

A new tool or admin file goes into `data/`; a file a player's page loads stays at the root until the domain change.
Old revisions of the moved files are under their root names in git history.
