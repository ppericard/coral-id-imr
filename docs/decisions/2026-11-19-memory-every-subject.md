# Memory for every subject

Date: 2026-11-19. PR: #1. Rules or docs touched: S1, L4, L14, P3, P4; docs/spec/front-end.md "The pages" (Practice ›
Memory), docs/spec/subjects.md, `docs/reviews/2026-11-19-modes-every-subject.md` (PR 7), ROADMAP "Every game mode for
every subject".

## Context

Memory matched a coral colony with its corallites, two views of one unit. The fish and the sea slugs have one view per
unit (`SUBJECTS` `views`), so `CLOSED_TREE` closed it for them. The plan (`docs/reviews/2026-11-19-modes-every-subject.md`)
held it back as a game to define.

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières,
à toutes les matières. Et oui, c'est du code commun.»

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **What a pair is for a one-view subject**: two photos of the same unit that show it differently, the first the draw's
  own choice (`labShots`), the second by this order: another species of the unit, a juvenile beside an adult (or the
  reverse), any other observation. Never one observation twice (rule P4). A unit plays only with two observations in play.
- **Declared per subject, in one place**: `UNITS` `memory` names how a pair is made (`views` for the corals, `photos` in
  `TREE_UNITS` for the fish and the sea slugs); `proto/pairs.js` `MEMORY` holds each kind. The page never tests the
  subject (rule S1). The coral Memory is unchanged.
- **The units** are `unlocked()` (rule L4), never two of one label (`choiceNames`: a family and its own genus would be one
  answer twice); the Look-alikes set follows the subject's declared pairs (`UNITS` `pairs`).
- **Nothing named before the pair**: a card shows the photo only; the name band (and the photo's species) appears when the
  pair is found, with one ID tip and its source and the report button.
- **Records**: Memory records nothing for any subject (the audit's row 14), so no rules version (rule D5); `core.js`
  changes only `pages` and `CLOSED_TREE`.
- **The tab's hint** reads "Match photos of the same genus" (the subject's own word), not "Match colony and corallites".

## Consequences

- Fish and sea slug players get a Memory tab under Practice; the corals' is as before.
- `tests/pairs.test.js` (the units' set, the pairing's order, no recorder), `tests/memory.check.js` run by
  `tests/fish.smoke.js` and `tests/seaslug.smoke.js` (one screen at 390 and 1280 px, no progress change).
- To change: the pairing's order is `memoryPhotos` alone; a subject with another way of pairing adds a kind to `MEMORY`.
