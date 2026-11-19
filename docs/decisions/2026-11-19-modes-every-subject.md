# Every game mode for every subject: the Duel tab first, a closed mode names its reason

Date: 2026-11-19. PR: #1265. Rules or docs touched: S1, L4, L11, D5; docs/spec/subjects.md (`pages`, `closed`),
docs/spec/quiz.md "What each mode counts", docs/spec/cards.md "The Duel tab's relief card", ROADMAP "Every game mode for
every subject".

## Context

Only the corals had the Duel tab, the custom quiz, Look-alikes (with Compare) and Memory; the fish and the sea slugs
had the quiz (duels slipped into it already) and their Learn pages. `SUBJECTS` `pages` closed a mode without saying
why. The plan that opens the rest, in order, is `docs/reviews/2026-11-19-modes-every-subject.md`.

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437, whether to open Compare, the pairs, the custom quiz and the duel to fish and sea
slugs): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui,
c'est du code commun.»

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **The Duel tab first**: its data path (each subject's look-alike pairs, `app.js` `UNITS` `pairs`) and its engine
  (`quiz.js` `quizDuel`, `planDuel`, `duelPick`) were already shared, so it opens with a field.
- **A closed mode names its reason in one place**: `SUBJECTS` `closed` {page: reason}; a mode neither open nor closed
  for a subject fails `tests/subjects.test.js`. Memory stays closed for the one-view subjects (it matches a colony with
  its corallites); a Memory for them is a new game, left to define.
- **The relief card** words its button in the subject's units ("Mix in other families") and offers Compare them only
  where the subject has that page.
- **The Duel tab's ? text** for a subject with its own help opens with one shared paragraph (`quiz.js` `duelLede`) naming
  where its pairs come from.

## Consequences

- The fish and sea slug players get a Duels tab under Practice (the Practice tab bar now shows on their quiz).
- No change to the scorer, the replay or any stored record: a Duel-tab answer was already a two-choice contrast question
  for every subject; no rules version (rule D5), no learning check (rule L11, level 0: a new door to an existing
  question type). The duels pair only units the player has met (rule L4).
