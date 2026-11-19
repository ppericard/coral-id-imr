# Same or different?: a Lab prototype on the subject on screen, declared pairs only, untimed, no effect on progress

Date: 2026-11-19. PR: #1241. Rules or docs touched: L4, S1, U2, U13, C3, P4, P5; docs/spec/basics.md "The Lab",
docs/spec/quiz.md "What each mode counts", ROADMAP "Game modes".

## Context

Pierre approved the new game modes on 2026-11-18, "to build, most useful first" (ROADMAP "Game modes"). Same or different?
is the first: two photos, either of one taxon or of two look-alikes, the player taps Same or Different. The
[multi-photo study](../reviews/2026-11-18-multi-photo-study.md) gave its layout (the pair stacked on a phone) and the
rule for its photos (one view on both sides, two observations for Same). Lab prototypes graduate only with his OK (U13).

## Decision

Pierre, 2026-11-18: «to build, most useful first» (ROADMAP "Game modes"). The ROADMAP row's spec, built as it stands: two
photos, either of one taxon or of two declared look-alikes, untimed, the player taps Same or Different; both subjects
that have photos; declared pairs only; in the Lab until his OK (U13), with no effect on progress. It is
`proto/samediff.js` (Tools › Same or different?).

Choices made while building, none decided with Pierre, each easy to change (integrator's calls):

- **The draw** (`sdPlan`): a declared pair first (`UNITS` `pairs`, never the data's look-alikes, nor the mimicry class's),
  both units `unlocked()` (rule L4) and carrying two labels (`choiceNames`, as the duels), then a coin: Different shows
  its two units, Same two observations of one of them. So a unit is asked both ways: none is always "Same", and a unit with
  no unlocked look-alike is never asked. No pair unlocked (a new player): "Meet a few in the quiz first".
- **The photos** (`sdPhotos`): `photoSet(n, null, 0, 2, 'compare', keep)`, the draw's own choice aimed as a duel's (two
  plausible choices), the closest view it shows; one view on both sides (a colony beside a close-up gives the answer
  away); for Same a second observation (`keep` leaves out the first's `o`: rule P4's multi-photo case, which the study
  asked to word and which stays unchanged here, as nothing graduates); the last 8 photos shown are left out while
  others fit; a side with nothing to match draws another plan (12 tries).
- **The screen**: the quiz's own stage (`.q.sdq`, `.qstage.qvs`, `fitStage`), answers (`.ans`, keys 1 and 2) and feedback
  sheet (`#after`), so it fits one screen in every state (rule U2) as the quiz does: the pair stacked on a phone, side by
  side with a 4:3 box each from the tablet class, the sheet at the bottom of a phone. Nothing is named before the answer
  and the enlarged view is blind (rule P5); after it each photo carries its unit's name and source.
- **The feedback** (rule C3): the verdict with both names, then the quiz's `fbLine` (the pair's sourced line, else the
  first ID tip), the ID tips of the unit or units and the credits behind More, the report button (`m: 'samediff'`).

## Consequences

- No answer, log, progress, photo window or clock: the code never calls `question`, `answer` or the recorders
  (`tests/samediff.test.js`), so no rules version (rule D5) and no sheet change.
- Tests: `tests/samediff.test.js` (the drawing, on stubs); the pages smoke (`tools/samediff` route, one screen before and
  after the answer at 390 and 1280 px, nothing recorded, the games' unlocked-only check) and the fish smoke
  (`sameDifferent`).
- Left, for when Pierre has judged it by taps: slipping it into the quiz as a one-question format with its own scoring
  and log format (a 2-choice answer, an offset), the fish `subject` frames for its photos, the fish and sea slug stats.
