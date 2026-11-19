# Odd one out: a Lab prototype, three of a unit and one intruder, untimed, no effect on progress

Date: 2026-11-19. PR: #1253. Rules or docs touched: L4, S1, U2, U13, C3, P4, P5; docs/spec/basics.md "The Lab",
docs/spec/quiz.md "What each mode counts", ROADMAP "Game modes".

## Context

Pierre approved the new game modes on 2026-11-18, "to build, most useful first" (ROADMAP "Game modes"). Odd one out is the
second, after [Same or different?](2026-11-19-same-or-different-lab.md): four photos, three of one taxon and one intruder, the
player taps the intruder. The [multi-photo study](../reviews/2026-11-18-multi-photo-study.md) gave its layout (Find the X's
2 × 2 squares, a short sheet) and, for the corals, that one view for the four or mixed views both play (Pierre, 2026-11-18,
its answer (a)). Lab prototypes graduate only with his OK (U13).

## Decision

Pierre, 2026-11-18: «to build, most useful first» (ROADMAP "Game modes"). The ROADMAP row's spec, built as it stands: four
photos, three of one unit and one of another, untimed, the player taps the intruder; every subject on one engine; in the Lab
until his OK (U13), with no effect on progress. It is `proto/oddone.js` (Tools › Odd one out).

Choices made while building, none decided with Pierre, each easy to change (integrator's calls):

- **The draw** (`ooPlan`): the unit shown three times is drawn uniformly among the `unlocked()` units that have another unit
  to set against them; its intruder is one of its declared look-alikes (`UNITS` `pairs`, never the data's look-alikes nor
  the mimicry class's) when one is unlocked, else any other unlocked unit; in both cases the two units carry two labels
  (`choiceNames`, as the duels). So a new player with two units already plays, and the look-alikes come first without being
  the only ones. The intruder's place among the four is random. Fewer than two units: "Meet a few in the quiz first".
- **The photos** (`ooPhotos`, `labShots`): `photoSet(n, null, 0, 2, 'compare', keep)`, as Same or different?, three different
  observations of the shown unit (rule P4's multi-photo case) and one of the intruder, in the first photo's view, and framed
  alike: the fish's square cut (`xc`) on all four or on none, so the odd one never looks different from the three (a
  photo field, never the subject: S1); the last 12 photos shown are left out while others fit; a side with nothing to match
  draws another plan (12 tries), else "Not enough photos … for a set of four yet".
- **The screen**: Find the X's tiles (`.q.qfind`, `.qstage.qfx`, `.fxt`, `fitStage`, `tileSrc`), each tile the button of its
  photo (`data-c`, so the app's own handling of a photo that cannot load closes the answers, as in Find the X), with a
  blurred copy of the photo behind a photo shown whole (lab.css). Nothing is named before the answer, in an alt or a label
  either; the photo cannot be enlarged before it (a tap answers). After it each tile is named, the odd one ticked and a
  wrong tap crossed (never colour alone), and opens the four photos whole. Fits one screen (U2) as the quiz does; with More
  open on a short phone the tiles go into one row when two rows would sit behind the sheet.
- **The feedback** (rule C3): the verdict naming the intruder and the unit shown three times, then the quiz's `fbLine` (the
  pair's sourced line for the two, else the intruder's first ID tip), the ID tips of both units and the credits behind More,
  the report button (`m: 'oddone'`).
- **Shared with Same or different?** (`proto/lab.js`): `labShots` (the photo source, `not` a key or a list, view and framing
  filters), `labTips`, `labSheet`, so the two games are one engine and one sheet.

## Consequences

- No answer, log, progress, photo window or clock: neither game's code, nor the shared helpers, calls `question`, `answer`
  or the recorders (`tests/oddone.test.js`), so no rules version (rule D5) and no sheet change.
- Tests: `tests/oddone.test.js` (the drawing and `labShots` on stubs, the recorder grep, the registration); the pages smoke
  (`tools/oddone` route, `oddOneCheck`: six rounds at 390 and 1280 px, one screen before, after and with More open, nothing
  named before the answer, nothing recorded, the Tools games' unlocked-only check), the fish smoke (`oddOne`) and the sea slug
  smoke (section 4), the same on their own units.
- Left, for when Pierre has judged it by taps: slipping it into the quiz as a format with its own scoring and log (rule L2: a
  wrong tap counts against the odd one and the unit shown), the fish `subject` frames for its photos, the long press to
  enlarge before the answer (the study), a gate on the players' data per view.
