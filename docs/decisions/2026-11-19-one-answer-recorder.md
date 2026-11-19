# One answer recorder for every game: the photo quiz and the live game record through quiz.js recordAnswer

Date: 2026-11-19. PR: #1213. Rules or docs touched: LEARNING "One scorer", spec/quiz.md "What each mode counts", spec/achievements.md.

## Context

The modes audit ([2026-11-19-modes-audit](../reviews/2026-11-19-modes-audit.md), rows 3 and 15) found that `live.js`
`liveLog` repeated `quiz.js` `answer`'s pipeline and had drifted from it. Live answers missed:
- the variant groups;
- the photos recently shown;
- the corallites milestone;
- the achievement check;
- the planned questions dropped after a miss.

Pierre, 2026-11-19: "Je ne comprends pas pourquoi le moteur n'est pas homogène… Pourquoi on a des exceptions en fonction
des modes de jeux????".

## Decision

Integrator's call (easy to correct), carrying out Pierre's words above:
- One function, `quiz.js` `recordAnswer`, does what every counted answer does to the record and the log. `answer` and
  `liveLog` both call it, and a future game calls it too.
- Live answers check the achievements; runs and Sharp eye stay with the photo quiz (`achRunIn`, Q82).
- A live answer keeps `R = 1` and no mimicry trap, because the live game chose the question and its choices. Both are
  scoring inputs, so changing them changes how new answers weigh (audit row 12, its own step).

## Consequences

No one's progress moves: the scoring inputs are the same and `core.js` is unchanged. A rule added to the recorder holds
for every game.
