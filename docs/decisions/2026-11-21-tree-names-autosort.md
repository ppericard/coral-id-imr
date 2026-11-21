# The admin's auto-sort of the tree subjects named tree*, not fish*

Date: 2026-11-21. PR: #0. Rules or docs touched: `tests/treenames.test.js`, `tests/subject-neutral-admin.test.js`,
`docs/rules/admin.md`, `docs/rules/photos.md` (a name in a cite), `docs/spec/admin*.md`, `docs/spec/fish*.md`,
`docs/spec/content.md`, `docs/spec/data.md`, `docs/spec/player-reports.md`, `judging/FISH.md`.

## Context

Architecture step 3 ([2026-11-18-architecture-steps-3-4.md](2026-11-18-architecture-steps-3-4.md)) left, under (a),
the admin's `fish*` names of tree code, `autosort.js` among them: the auto-sort of the candidate photos of every tree
subject (the fish's and the sea slugs'), whose 71 per-subject names the S1 ratchet held as "named fish before the
rename".

## Decision

Integrator's call, under the review's migration path (Q406; a name inside the code, no behaviour change, easy to
correct): `autosort.js`'s tree names are renamed `fish*` → `tree*` and `FISH*` → `TREE*` (69 names), with their uses and
cites in the admin's files, the app's comments, the tests, the tools' comments and the specs. Seven take a longer name
where the plain one is another function already (`app.js` `treeSet`, `treeAt`, `treeRec`; `learn.js`'s sheet helpers;
`admin.js`'s own `fishState`; a test's `treeUnits`): `fishMine` → `treeKeepOf`, `fishSpecies` → `treeSpeciesOf`,
`fishState` → `treeStateOf`, `fishSet` → `treePhotoSet`, `fishAt` → `treePhotoAt`, `fishRec` → `treePhotoRec`,
`fishUnits` → `treeUnitsOf`. The fish's winks keep theirs (`fishWinkFold`). `tests/treenames.test.js` retires the old
names.

## Consequences

- No player sees a change and nothing the admin stores changes (`curation.json` keys and log codes are untouched): a
  pure word substitution, checked reversible file by file against `origin/main`.
- Not renamed: other files' own functions under one of the old names (`admin.js` `fishState`, `tools/ratedworld.js`
  `fishUnits`, `tools/fetch_fish.py` `FISH_TAGS`), the history (decision records, reviews, the archive), and `core.js`
  with its copy in `Code.gs`, whose comments cite some of these names until `core.js`'s next change (rule D3).
- Left of step 3 (a): `admin.js`'s own `fish*` names, most of them halves of the duplicates the admin one-engine study
  merges, and the Python library.
