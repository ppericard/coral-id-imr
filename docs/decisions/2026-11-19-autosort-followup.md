# Auto-sort follow-up (c): the admin-only keys stay out of the players' copy, no second file

Date: 2026-11-19. PR: #1182. Rules or docs touched: A1; ROADMAP "Auto-sort follow-ups"; docs/spec/loading.md.

## Context

The ROADMAP row of 2026-11-03 proposed splitting the admin-only keys of `curation.json` (`seen`, `auto`, `retest`,
`flag`) into a file of their own, so players do not download them. Since then `tools/curplay.py` writes
`curation-play.json` at deploy (#818), without the auto log and the fish judging keys, and the app reads that copy.
What it still carried: the coral Candidates' reject marks (`seen['cand:<photo>']`, about 500), `retest` and `flag`.

## Decision

Integrator's call (an implementation detail, easy to correct): no second file. Splitting `curation.json` would change
what the admin's Publish merges (`merge3`, rule A1) for a gain the build-time copy already gives. Instead
`curplay.py` also leaves out `retest`, `flag` (here and in each tree subject's part) and the coral `seen` marks that
do not start with `rep:`. A tree subject's `seen` stays whole: the game reads it (`core.js` `treePhotoOn`, `treeGone`).

## Consequences

The app reads only keys the copy keeps, so a player's older cached copy, which still holds the dropped keys, works
unchanged. `curation.json` is untouched. Tests: `tests/curplay.test.js` (the dropped keys, and the scan that no player
script reads them). Follow-ups (a) sharpness on the original's tiles, (b) crops measured and (d) watching the Checks
stay open in the ROADMAP row.
