# The duel achievement counts a right Again like a right duel

Date: 2026-11-19. PR: #1221. Rules or docs touched: L8 (unchanged); docs/LEARNING.md "Look-alike duels slipped into the
photo quiz"; docs/spec/achievements.md (the first duel won).

## Context

Step 4 of the modes audit (docs/reviews/2026-11-19-modes-audit.md, row 11). LEARNING "One contrast queue" calls the Again
after a mix-up and the duels slipped into the quiz "one kind of question… under one rule", yet a right duel set the
duel achievement flag (`s.du`) and a right Again did not. Pierre, 2026-11-19 (ANSWERS, Q411): "Pourquoi on a des
exceptions en fonction des modes de jeux????".

## Decision

One predicate, `core.js` `contrastQ(mode, choices)`, says whether an answer is a contrast question: the formats `duel`,
`qduel` and `again` of a quiz answer, as `fmtOf` already reads them (the Duel tab, a duel slipped into the quiz, an Again
with two choices shown). The game (`quiz.js` `recordAnswer`) and the replay (`core.js` `replayProgress`) both call it,
so a right one grants `du` in both. A live answer, a typed one and a 4-choice question are never one. Integrator's call
(an implementation detail; the effect players see, the achievement earned by a right Again, is easy to correct).

No rules version: `du` is an achievement flag that moves no progress, mark, ability or leaderboard (rule D5 covers
progress), and `replayedOf` keeps it "either".

## Consequences

A player who won an Again but never a duel gets the first-duel achievement at their next right Again or at the next
replay of their log. `core.js` changed, so `tools/sync/Code.gs` takes it (`tools/sync_core.py`), with its entry in
`tools/sync/changes/claude-duel-ach-again.md`; no app gate (rule D4: the app grants `du` on its own). Specified in
docs/spec/achievements.md and docs/LEARNING.md "Look-alike duels slipped into the photo quiz"; tests in
`tests/replay.test.js` and `tests/liveclass.test.js`.
