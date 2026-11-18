# Decisions from the app's code comments: kept here when the comments were cleaned

Date: 2026-11-18. PR: the comment clean-up of `model.js`, `app.js`, `quiz.js` and `sync.js`. Rules or docs touched: none
(rule W19: history stays in git and the PRs, decisions in `docs/decisions/`).

## Context

The comments of the four app scripts carried Pierre's dated words as a changelog. The clean-up keeps in the code what it
does and why; a dated decision whose words were in no doc moves here, one line each, so it survives. Decisions already
documented (docs/LEARNING.md, docs/ARCHITECTURE.md, the rules, ROADMAP, the reviews) are not repeated.

## Decision

Each line: the date, Pierre's words as written (French where he spoke French), what it decided, where in the code.

- 2026-11-08 (Q227): "il faut garder cette information de un jour il a cliqué sur je suis à IMR". A player who ever
  answered "I'm at IMR" to a subject's first-launch question keeps that fact, whatever the answer in force now (the
  record's history, merged as a union across devices). `model.js` `imrSaid`.
- 2026-11-02, after an RA at 86% right met 9 genera in 21 answers and dropped to 5 right in 10: "when many genera have
  just opened and the answers suddenly get worse, space the new ones; an expert keeps opening regularly". The opening
  hold: no new card while the answers fall clearly below the expected success (a CUSUM). `model.js` `introHold`,
  `holdNext`; docs/LEARNING.md "First meeting with a genus".
- 2026-11-01: "an ultimate test to go from 95% to 100%". The silent mastery exam: questions slipped into the quiz
  unannounced, its count shown nowhere, all right to reach Learned. `model.js` `EXAM`, `examSet`.
- 2026-11-01: "at the very start it must be simple", then look-alike traps come in little by little, since look-alikes
  are how genera are learned. The number of traps among the wrong choices follows the genus's ability. `model.js`
  `FORMAT`, `trapsFor`, `distractors`.

## Consequences

The code comments point here in a few words where they once quoted these decisions.
