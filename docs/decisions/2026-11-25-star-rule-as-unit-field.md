# The ★ rule read from the unit's own record, for every subject

Date: 2026-11-25. PR: #1581. Rules or docs touched: S1, L5; docs/LEARNING.md "Starred genera after their reference";
docs/spec/front-end.md; docs/spec/model.md.

## Context

Pierre, 2026-11-19: one engine for every subject, a difference between subjects declared and named in one place (rule
S1, the wording he OK'd at 06:58). The [one-engine audit](../reviews/2026-11-19-one-engine-audit.md) §1 item 5 and §3
step 4: the shared opening (`model.js` `openPick`) asked `core.js` `starWaits(DATA, n, …)` for every subject's unit,
looking the unit id up in the corals' `data.json` by name. The fish and the sea slugs never waited only because their
prefixed ids match no coral genus: an undeclared difference, and one of the "id = name" reliances raised on REE-28
(2026-11-23).

## Decision

- The rule becomes data on the unit's record: `core.js` `starAfter(d)` writes on each starred genus the surveyed
  genera it opens after (`after`, exactly `starRefs`), and the opening reads `core.js` `afterWaits(GX(n), list, met)`
  for every subject. A tree unit has no `after` and never waits. `starWaits` goes. (The audit's step, adopted with it.)
- The field is written in memory by the corals' build (`app.js` `build`, last; `tools/ratedworld.js` `coralUnits`),
  not into `data.json`: the content editor's pairs change the look-alikes at build time, and a file field of bare coral
  ids would precede REE-256's id plan. Integrator's call, easy to correct.
- No rules version (rule D5): the opening is not replayed; the same seeds give the same openings (PR #1581's checks).

## Consequences

- The shared opening reads no subject's file; a subject whose builder writes `after` gets the same rule with no code.
- Nothing changes for players: same-seed simulations of the corals, the fish and the sea slugs, and the rated world of
  the corals, give the same runs.
- The sheet's copy of `core.js` follows (rule D3); the script calls neither function.
