# Comeback by genus: a stability multiplier fitted from the logged recall, descriptive, an upper bound

Date: 2026-11-21. PR: #1398. Rules or docs touched: A5; docs/spec/analyses.md, docs/spec/analyses-method.md.

## Context

The ROADMAP row "Analyses: next views" (Pierre, 2026-11-04) ends its list of views with "the comeback fit against the
FSRS stability per genus". The comeback study (2026-11-14, (c)) said not to recalibrate the app's stabilities yet: the
comeback's stopping rule biases the rusty questions towards right answers (about +0.09 on right − expected), and about 200
rusty answers from 20 players were wanted first.

## Decision

Build the view, not the recalibration. REE-41, Pierre, 2026-11-04 (paraphrase, the row).

- A rusty comeback question's logged recall R fixes what the app assumed; a stability multiplier κ (×1 = the app's)
  gives the recall (1 + (R^(1/C) − 1) / κ)^C, in which the days and the unit's own stability cancel, so no replay is
  needed. Fitted by maximum likelihood, pooled and per genus (shrunk towards the pooled one), ranges by the player
  bootstrap. Integrator's call, easy to correct.
- Descriptive, no verdict, outside the multiple-testing correction: the card says "Not enough data yet" below the study's
  200 questions and 20 players, the answers its range would need, and that the estimate is an upper bound on remembering
  until the stopping rule is corrected for (rule A5).
- Not done: logging when a player saw a card or compared two genera. It needs a sheet format (an Events kind in
  `Code.gs`, or a column of the Answers tab: ask first); left to Pierre with a recommendation in the PR.

## Consequences

`analysis.js` `backGenus` (`stab` in the Comeback result), `prep` reads the scoring record's `r` (`A.R`), `AV` 16;
`admin-analyses.js` `anBackGenus`. Tests: `tests/analysis-comeback.test.js`. Nothing changes in the app or for players.
