# Matrix: a Lab prototype, four photos and five names, two taps, a free retry, untimed, no effect on progress

Date: 2026-11-19. PR: #1262. Rules or docs touched: L4, S1, U2, U13, C3, P4, P5; docs/spec/basics.md "The Lab", docs/spec/quiz.md
"What each mode counts", ROADMAP "Matrix", FORMATS.md row 6, FISH_PATH.md.

## Context

Matrix was agreed on 2026-11-09 (Q321 D1-D7) to come after Find the X, which is built: four photos, five names, two taps (a
photo then its name), feedback per pair, a retry unscored, no timer, no move count, the same square tiles as Find the X, no
progress effect yet (ROADMAP "Matrix"). It follows [Same or different?](2026-11-19-same-or-different-lab.md) and
[Odd one out](2026-11-19-odd-one-out-lab.md) into the Lab, on the same helpers. Lab prototypes graduate only with Pierre's
OK (U13).

## Decision

The ROADMAP row's spec, built as it stands, in the Lab (Tools › Matrix, `proto/matrixgame.js`: the id `matrix` is the Feature
matrix's, a reference grid, so the hub shows both). It runs for every subject in shared code (S1): Pierre, 2026-11-19, Q437,
on opening the game modes to every subject: «il faut ouvrir tous les modes de jeu … à toutes les matières. Et oui, c'est du
code commun».

Choices made while building, none decided with Pierre, each easy to change (integrator's calls):

- **The draw** (`mxPlan`): four `unlocked()` units (rule L4), starting from a declared look-alike pair (`UNITS` `pairs`, never
  the data's) when one is unlocked, then each next one a declared look-alike of one already shown when one is left, else
  any unlocked unit; the five names carry five labels (`choiceNames`, as the duels). The fifth name is an unlocked unit that
  looks like a shown one when one is left (a real trap), else any other unlocked unit, else (a player with exactly four
  unlocked) a unit of the game never met, a look-alike first, as the quiz's wrong choices do when a beginner has met few
  (`distractors`). It is never photographed, so nothing is asked about a unit not unlocked. Fewer than four units: "Meet a few
  in the quiz first".
- **The photos** (`mxPhotos`, `labShots`): one photo of each of the four, by the draw's own choice (`photoSet`, as the duels),
  four different observations (P4), in the first photo's view and framed alike (the fish's square cut on all four or on none).
  A unit with nothing to match draws another plan (12 tries), else "Not enough photos … for a set of four yet".
- **The two taps**: a photo then a name, or a name then a photo (the second tap completes the pair). The tiles are Find the X's
  (`.qfind`, `fitStage`, `tileSrc`); the names are the quiz's answer buttons (`.ans`), lettered A-E, the tiles numbered 1-4 for the
  keyboard. The names are `data-n`, the tiles `data-c`: the app's tile-failure handling (`qAnswers`) opens and closes every
  `[data-c]`, so a late load can never reopen a name already matched.
- **The pair's feedback**: right, the tile is named (a tick, never colour alone), ringed, enlargeable and credited (P5: only
  now), its name ticked and closed, and the line is the quiz's `fbLine` (the line telling the unit from a look-alike among the
  names, else its first ID tip with its source; C3), inline under the names. Wrong, nothing is kept: a cross on the tile and on
  the name until the next tap, and the line is the tapped name's own first ID tip, so the player can look for it in the photos;
  the line of a miss would say what the photo is, and there is a retry. Nothing is counted: no tries, no moves, no time.
- **The end of a round**: the fourth right pair opens the quiz's own short sheet (`labSheet`: "all four matched", the last
  pair's line, the ID tips of the four and the credits behind More, the report button, `m: 'matrixgame'`) and Next draws four
  other photos. The sheet's `.done` stays off during the round, so on a phone no sheet covers the names.

## Consequences

- No answer, log, progress, photo window or clock: neither the game's code nor the shared helpers call `question`, `answer` or
  the recorders (`tests/matrixgame.test.js`), so no rules version (D5) and no sheet change.
- Tests: `tests/matrixgame.test.js` (the drawing on stubs, the recorder grep, nothing named before its pair, the
  registration); `tests/matrixgame.check.js`, played by the corals' pages smoke (route and rounds at 390 and 1280 px, the Tools
  games' unlocked-only check), the fish smoke and the sea slug smoke: a wrong pair keeps nothing, a retry is free, the end
  sheet, one screen (U2) fresh, with a tile taken, after a wrong pair, after a right pair, at the end and with More open, no
  progress, log or answer count changed, no unit opened.
- Left, for when Pierre has judged it by taps: scoring (each scored pair counting like a quiz answer with its number of names
  left, format `mx` with one offset, never in the exam, seconds logged but unweighted: rule L2), the sheet's `mx` logging, the
  thresholds of a unit that plays only with 6 eligible observations (family) or 3 (species), species units, the life stages
  variant (ROADMAP "Life stages matched"), and the `labFit` of the one-row-of-four layout that Odd one out and Matrix each carry.
