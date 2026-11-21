# The tree sheets' helpers of learn.js named tree*, not fish*

Date: 2026-11-21. PR: #0. Rules or docs touched: `tests/treenames.test.js`, `docs/spec/fish-sheets.md`,
`docs/spec/subjects.md`, `docs/spec/seaslugs.md`, `docs/spec/tools.md`, `docs/ARCHITECTURE.md`.

## Context

Architecture step 3 ([2026-11-18-architecture-steps-3-4.md](2026-11-18-architecture-steps-3-4.md)) renamed the tree
engine `tree*` and left, under (a), the `fish*` names of tree code elsewhere, first among them the `learn.js` helpers
that every tree subject's sheets run through (the fish's and the sea slugs'). An admin function shares several of those
names, which is why they were left.

## Decision

Integrator's call, under the review's migration path (Q406; a name inside the code, no behaviour change, easy to
correct): the `learn.js` helpers are renamed, `fishMine` → `treeMine`, `fishFamOf` → `treeFamOf`, `fishTile` →
`treeTile`, `fishSpecies` → `treeSpecies`, `fishMarks` → `treeMarks`, `viewFishSheet` → `viewTreeSheet`, with their
cites in the player app, the tests and the specs. The admin's own functions of the same names (`admin.js` `fishTile`,
`fishFamOf`; `autosort.js` `fishMine`, `fishSpecies`) are not these and keep their names here. The two comments that
still cited `viewFishList` (gone with the one Learn list) cite `viewList`. `tests/treenames.test.js` retires the six old
names in the player app's scripts.

## Consequences

- No player sees a change: a pure word substitution, checked reversible file by file against `origin/main`.
- `core.js` comments still cite `viewFishSheet` until the next `core.js` change (rule D3: it carries a sheet version),
  which is why `tests/treenames.test.js` leaves `core.js` out of this table's scope for now.
- Left of step 3 (a): the admin's names, `Code.gs`'s own, the Python library; (b) the `replay` capabilities.
