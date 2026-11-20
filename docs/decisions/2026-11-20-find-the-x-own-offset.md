# Find the X's own offset: a format of its own, `find`, at 0 until its subject's format offsets are read

Date: 2026-11-20. PR: #1299. Rules or docs touched: L2, L11, D3, D4, D5; docs/LEARNING.md "Per-format offsets" and
"Find the X slipped into the fish quiz", docs/spec/quiz.md, docs/spec/sync.md "Mode", ROADMAP "Find the X".

## Context

Find the X (one name, four photos; fish only today) is logged `quiz|f` and scored as a 4-choice answer. `core.js`
`fmtOf` read it as `k4`, while `quiz.js` `planFind` already aimed its photos in format `find`, an offset nobody fitted:
the two would disagree as soon as the fish's format offsets are read (docs/reviews/2026-11-19-modes-audit.md, row 9). The
sheet's fish pass also fitted its answers into the fish's `k4` offset.

## Decision

The ROADMAP row "Find the X" (the format agreed by Pierre on 2026-11-03, first of the new formats in Q321, 2026-11-09)
named the next step: "its own offset (`core.js` `fmtOf` and `analysis.js` `FORMATS` reading `|f` as `find`) when the
fish formats get offsets (`model.js` `pfmt`)". It is built now, before the fish's offsets, because it moves nothing
alone (integrator's call, an implementation detail): when those offsets are switched on, Find the X already has its own,
fitted on its own answers. Switching the fish's offsets on stays a separate step with its rules version (D5; ROADMAP
"One engine for every subject, what is left").

## Consequences

- `core.js` `fmtOf` and `analysis.js` `fmtOf` read `|f` as `find` (`tests/analysis.test.js` checks both agree); the
  admin's Formats analysis has a Find the X row (no fit under 20 answers); each subject's pooled pass fits `fmt.find`.
- No progress moves, so no rules version: the corals never play it (no tile); the fish and the sea slugs score, aim and
  replay with every format offset at 0 (`model.js` `pfmt`, `Code.gs` `replay_`); and a row with its scoring record
  replays with the offset it logged. On the real log, 2026-11-20: 5 Find the X rows, all fish, all with their scoring
  record. `tests/fishformat.test.js` replays Find the X rows identically under a `fmt` whose `find` differs from `k4`.
- No gate (D4): no subject reads `find` yet. The sheet script takes the copied `core.js` (D3); its pooled snapshots
  rebuild on the new version, so old `k4` and new `find` points never mix.
