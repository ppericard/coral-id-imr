# Architecture steps 3 and 4: the tree engine named tree*, the flat subject a capability; the core.js split waits

Date: 2026-11-18. PR: #1146. Rules or docs touched: ARCHITECTURE "Subjects" (tree engine names and the flat subject),
ROADMAP "Architecture review, steps 3 and 4: what is left", `tests/treenames.test.js`.

## Context

The architecture review of 2026-11-18 ([review](../reviews/2026-11-18-architecture-code-review.md), R1, R6, R9) found
that the fish and the sea slugs run on one tree engine still named after the fish (`fishGen`, `FISH`…), and that the
engine told the corals apart by comparing a pool file's name (`pool.files[0] === 'data.json'`). Its migration path
lists step 3 (rename `fish*` to `tree*` where the code is the tree engine; capabilities instead of the proxies) and
step 4 (split `core.js` into `core/*.js`; a `slow` test tag), both marked "Needs Pierre: No (a name inside the code)".

## Decision

Integrator's calls, under the review's migration path (no behaviour change, easy to correct):

- The identifiers every tree subject runs through are renamed `tree*` / `TREE*`: the `core.js` tree engine everywhere
  (the admin, the sheet script's embedded copy and its calls, the tools, the tests, the docs), and the player app's tree
  state and builders outside the admin's files. `FISH` became `TREEU` (the units of the tree in force, as `DATA` is the
  corals'; `TREE` is an admin route); `fishOn` and `fishIn` became `treePhotoOn` and `treePhotoIn` (the admin has a
  `treeIn`); `fishTree`, the sheets' reader, became `treeSheets`. Names of what only the fish have keep `fish*`
  (`FISH_RVS`, `FISH_ACH`, `FISH_RENAMED`, the circle-3 offer, the winks). The rules versions' texts keep the names
  they were written with. Data, storage keys, file names, routes and the sheet's fields are untouched.
- `SUBJECTS` gains `flat` (the corals), which `app.js` asks in place of the pool file's name.
- `tests/treenames.test.js` holds the old and new names and fails when a retired one comes back, so a branch cut
  before the rename is caught on its train.

Not built now (ROADMAP row):

- (a) `fish*` names of tree code elsewhere: `learn.js` `fishMine`, `fishTile`, `fishSpecies`, `fishFamOf` (an admin
  function shares each name), `fishMarks`, `viewFishList`, `viewFishSheet`; the admin's (`FISHS`, `renderFishUnits`,
  `pstatsFish`, `autosort.js` `fishSure`…); `Code.gs`'s own (`fishGen_`…); the Python library the sea slugs import
  from the fish's (`fish_game`, `fetch_fish`) and the build notes the tools write into the data files.
- (b) The `SUBJECTS` `replay` flag means several things (the subject the sheet rates photos and holds the opening for,
  the reply's unprefixed `replay` slot, `sync.js` `rvKey`): it is split into named capabilities, each equal to today's
  value, once every site is classified; likewise a named capability for "has a tree" (`UNITS[id].get`).
- (c) Step 4, `core.js` split into `core/*.js` that `tools/sync_core.py` concatenates, moves every line of `core.js`:
  it waits for #1121 (the `core.js` and `Code.gs` comment pass) and the `core.js` second comment pass.
- (d) Step 4's `slow` test tag changes what the fast tier runs (rule W14): its wording goes to Pierre first.

## Consequences

- No player sees a change; nothing the sheet stores or replays changes; no gate and no rules version.
- Open PRs written against the old names conflict or fail `tests/treenames.test.js`; they rebase onto the new names
  (the table in the test is the rename's).
