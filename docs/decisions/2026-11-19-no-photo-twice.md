# No photo twice in a few questions: the draw reads the questions planned and shown, the strong RA's shown score lags a little at 1,000 answers

Date: 2026-11-19. PR: #1093. Rules or docs touched: L11; LEARNING.md "What a question shows".

## Context

A player reported (2026-11-17, corals, Practice > Quiz) the same photo twice in a row; the answer log showed one colony
on her 8th and 10th answers. The photo quiz plans up to three questions ahead, and both memories the draw reads (the photo
memory and the colonies held back) are written at an answer, so a question planned behind another on the unit was drawn
blind to it. The fix is in the shared draw: it reads the session's window of the last 10 questions shown and of those
planned, and a colony there waits while the unit has another. Its level-2 check (rule L11, the rated world, corals, 4
profiles x 3,000 answers, 20 seeds, normal and heavy-tailed photos) held the beginner plateau and true knowledge, but
breached one guardrail declared for no one: the strong RA's shown score at 1,000 answers (71.3 to 69.8 with heavy tails,
bound -2.4, margin -1.0), equal at 3,000 answers, true knowledge unchanged at +0.001. The player does not learn less: the
bar sits slightly further below true knowledge for a while (Q426).

## Decision

Pierre, 2026-11-19 09:09 Manila (Q426 A): keep the fix and accept its level-2 cost, "ok" to "garder le correctif et
accepter ce petit retard temporaire de la barre".

Choices made while building, not decided with Pierre, each easy to change: the window is `RECENT` (10) questions, the
game's own "recent"; when every colony is in the window the one shown longest ago is drawn; before Open Water and for
variants not yet released, a full-weight colony stays rather than a held-back one is forced (the standing `RARE` rule,
Pierre, 2026-11-06 14:17, Q252, and the variants' ramp, Q391 a, which the window must not undo).

## Consequences

- In a session, a colony (fish: an observation) shown or planned in the last 10 questions does not come again while its
  unit has another to show, in the quiz, the custom quiz, the Duel tab and the live game, for every subject. In memory
  only: nothing synced, the photo memory, the colonies held back, the expectation and the progress are unchanged.
- How (`model.js` `SEENQ`, `seenAges`, `leastRecent`): the draw reads the photos, by file and by observation, of the
  last `RECENT` questions shown (`seenAdd`, from `quiz.js` `question` and `live.js` `liveBuild`) and of those planned
  (the `NEXTQ` queue, read when drawing, so a dropped plan leaves nothing behind). In `photoSet` the filter comes after
  the calibration question's and before the variety, the floor and the cap, which then work on the others; with every
  colony in the window, the one shown longest ago is drawn. It never leaves only colonies the draw holds back: before
  Open Water the hard ones (`RARE`: `rareCap` would have nothing easy to cap against), the variants not released
  (`varOf`); then the full-weight colony shown longest ago stays, as the exploration share keeps the seen easy ones.
  `examSet` takes the same filter: a "never shown" photo planned one question earlier is not in `s.ps` yet.
- The shown score of a strong RA lags a little at 1,000 answers (about 1.5 points with heavy-tailed photos) and is equal
  at 3,000. A likely cause, exploratory: the window sends the draw to less-seen colonies, which lifts the bar a little
  more slowly mid-run.
- Where it is specified: LEARNING.md "What a question shows" (the window), its measure `near` in `tools/learncmp.js`, the
  test `tests/nophototwice.test.js`. The check's figures: the PR.
