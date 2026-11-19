# Live answers on units not opened count, opening nothing; answers before a card are never its question

Date: 2026-11-19. PR: #1234. Rules or docs touched: L4, D5; LEARNING "Opening pace", "One progression path for every game";
spec/model.md, spec/quiz.md "What each mode counts", ROADMAP "Live mode, after version 1", the live design note.

## Context

The modes audit ([2026-11-19-modes-audit](../reviews/2026-11-19-modes-audit.md), row 2, step 4 of its order) found that
`live.js` `liveLog` skipped a live answer on a unit the student had not opened: never scored, never logged. Rule L4 says
since 2026-11-18 that such answers count without opening the unit. Building it showed a second flaw: the readers that
wait for a card's own question (`openPace`, the question drawn among the cards', `introReady`, the fish circle 2's gate,
the bonus offer, the all-met card) read "answered at all", so a unit answered live before its card counted as asked
the moment its card showed.

## Decision

Pierre, 2026-11-18, rule L4: live answers "count without unlocking", "ok". Carried out as the integrator's calls, easy
to correct:
- A live answer on a unit the path has not opened is recorded like any answer (`quiz.js` `recordAnswer`), and the unit
  gets One at a time's closed mark with no time (`model.js` `introLive`), so it stays out of every game until its card.
- Answers given before a unit's card are evidence, never the card's question: the readers above read `model.js`
  `askedOpen` (an answer at or after the card's time, the unit's `s.at`), no new field. The same holds for a card that
  reopens a unit One at a time closed.
- A closed mark opens no part of the slate opened by choice (`app.js` `openOf`: circle 3 waits for the player's yes).
- A coral rules version (rule D5, 12), with no card.

## Consequences

A student's live answers on units not opened now reach the progress and the log. The card's question comes
`INTRO.GAP` answers after the card, as for any unit, and the opening's pace waits for it. The rated world runs on a clock
of its own so the check reads the same on every run.

The rule L11 check (levels 1 and 2, figures in the PR) found two costs, read by the integrator as consequences of decided
rules, under Pierre's words on #1099 (2026-11-19 14:50: «Il n'y avait aucune raison que ça ne soit pas une
amélioration»): after 20 mostly-missed live answers the first unit reaches Open Water later (rule L4: they count, and the
adaptive engine of rule L3 sees a weaker player); with One at a time, a reopened unit waits for its card's question like
every card (a beginner met 2.4 units fewer at 300 questions in the app world).
