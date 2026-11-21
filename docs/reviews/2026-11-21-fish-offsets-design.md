# Fish photo memory and format offsets in the app: design note (REE-55)

**Status: design only (docs).** Nothing is built. Written on `origin/main` 2026-11-21 (Manila evening). Read-only
checks on the real log are aggregates only; the extract and the scripts stayed in the session's scratchpad (rule D2).
ROADMAP "Fish confusion at several ranks" (REE-55), decided with the fish confusion study (Q123 a-o yes, Pierre,
2026-11-14), left this part for its own design: "the fish's photo memory and format offsets in the app (they move
progress, rule D5)". The same holds for the sea slugs, which run on the same engine (rule S1).

## 1. What is there today

- **The sheet already fits them per subject.** `Code.gs` `stats_(read, sid)` folds each subject's own answers
  (`subjRows_(sid)`, its own Stats tab) and serves `mem`, `memn` and `fmt` beside the photo ratings, unit offsets and
  pairs, for the fish and the sea slugs as for the corals (`?stats=1&s=fish`).
- **The app drops them.** `sync.js` `loadOwnStats` keeps `photos`, `conf` and `gd` of a subject's reply, not `mem` or
  `fmt`. `model.js` `pmem` and `pfmt` read the sheet's offsets only for a subject with `SUBJECTS` `offsets` (the
  corals), and the prior (`core.js` `MEM.PRIOR`) and no format offset (`PFMT0`) for every other subject.
- **The replay agrees with the app.** `Code.gs` `rplMake_` replays the corals with the served `mem`, `fmt` and `gd`, and
  every other subject with none. An answer logged with its scoring record (`core.js` `scoreRec`: `m` the memory term,
  `o` the format offset, among others) replays exactly as the game scored it, whatever the statistics.
- **The log holds the scoring record on almost every fish answer**: 3,348 of 3,357 fish rows (the first on
  2026-11-06 13:07 Manila), and all 168 sea slug rows. So switching the offsets on moves mainly the scoring of answers
  to come; the replay of answers already logged moves only for the fish players who hold one of the nine rows without a
  record (section 4; corrected after review: an earlier version said the replay did not move).

## 2. What the real log says (read-only, 2026-11-21)

The Answers tab to 2026-11-21 17:17 Manila (a live read found no later row), fitted with the sheet's own functions
(`core.js` `photoMemOf`, `fmtOffsetsOf`, as `stats_` runs them), per subject.

| Subject | Answers | Players (trusted) | Memory offsets fitted [new, shown never right, right once, right 2+] (trusted answers behind each) | Format offsets fitted (answers) |
| --- | --- | --- | --- | --- |
| Corals (in use today) | 3,920 | 15 (15) | 0, +0.42, −0.67, −1.19 (3,339; 143; 367; 72) | k4 +0.24 (1,918), k2 +1.19 (885), k3 +1.22 (117), again +0.29, duel +0.30, qduel +0.21, typed −0.37 (77) |
| Fish | 3,357 | 9 (9) | 0, −0.88, −0.41, −1.53 (3,257; 15; 81; 4) | k4 +0.71 (2,407), qduel +0.57 (200), k2 +0.53 (269), typed +0.47 (94), again −0.07 (340) |
| Sea slugs | 168 | 2 (1) | 0, −0.50, −0.71, −1.50 (160; 0; 5; 0) | k4 +0.13 (99), k2 −0.22 (29), again +0.09 (24) |

The prior is 0, −0.5, −0.5, −1.5. Format offsets need `FMT.N` = 20 answers and are shrunk toward 0 (`FMT.SD` = 1).

- **Fish memory:** repeats are rare (100 trusted answers outside "new"), so the fitted buckets barely leave the prior.
  Switching memory on changes little today, and nothing breaks as the data grows.
- **Fish formats:** the fish are answered right more often than the app expects, mostly on its plain 4-choice
  questions: observed 88.4% where the logged expectation says 82.1%. The k4 offset (+0.71) carries most of that gap.
  So the "format" offset here is largely the fish's general calibration gap, not a format effect. Section 5 says what
  that implies.
- **Sea slugs:** one trusted player, but the fit does not wait for more players: k4, k2 and again reach `FMT.N` (99, 29
  and 24 answers), so `fmtFit` returns their shrunk estimates (+0.13, −0.22, +0.09), and the right-once memory bucket
  fits −0.71 against the prior's −0.50. Small offsets, but not zero (corrected after review).

**Would the fish's own format offsets predict better? (rule L12, leave one player out).** Each trusted player's fish
answers were scored with offsets fitted on the other eight players only, against today's (none).

| | Answers | Log-loss, none (today) | Log-loss, fitted | Mean predicted, none → fitted | Observed |
| --- | --- | --- | --- | --- | --- |
| All fish quiz answers | 3,348 | 0.3596 | 0.3456 | 0.821 → 0.879 | 0.884 |
| k4 | 2,407 | 0.3394 | 0.3197 | 0.825 → 0.894 | 0.898 |
| qduel | 200 | 0.2831 | 0.2799 | 0.863 → 0.904 | 0.910 |
| typed | 94 | 0.3105 | 0.3090 | 0.865 → 0.910 | 0.915 |
| k2 | 269 | 0.5028 | 0.5030 | 0.747 → 0.807 | 0.818 |
| again | 340 | 0.4467 | 0.4505 | 0.824 → 0.819 | 0.812 |

Per player (players are the unit): 6 of 9 better, mean difference −0.0064 in log-loss, one-sided sign-flip p = 0.18.
With 9 players the per-player test cannot tell. Pooled, calibration moves from 6 points off to 0.5 point off, and
log-loss falls by 4%. This is a direction, not a proof, and it is the measure the build's PR repeats (section 6).

## 3. The design

One engine, no subject named (rule S1): every subject with its own pooled statistics reads its own memory and format
offsets, from the script that serves them, and its replay reads the same.

1. **`core.js` `SUBJECTS`:** `offsets` becomes a script version per subject instead of a flag, as `stats` is
   (`FISHST_SHEET`, the version that serves the subject's statistics). The corals keep theirs. A subject without it
   keeps the prior and none.
2. **`sync.js` `loadOwnStats`:** also keeps `mem`, `memn` and `fmt` of the reply (only from a reply at or above the
   subject's `offsets` version: rule D4).
3. **`model.js` `pmem`, `pfmt`:** a subject with `offsets` reads its own, kept per subject (`OWN_STATS` + id), through
   `memOf` and `fmtsOf` as the corals' are. Before a reply, or offline, it uses the prior and none, as today.
4. **`Code.gs` `rplMake_`:** a subject with `offsets` replays with its own served `mem` and `fmt` (`statsServed_(sid)`),
   so a row without a scoring record is replayed as the app would score it now. Rows with a record keep their logged
   inputs (their outcome can still follow an earlier row's change: section 4).
5. **Rules versions (rule D5):** one entry appended to `FISH_RVS` and one to `SEASLUG_RVS`, no card (rule D6). They
   change the scoring of answers to come. The replay they trigger re-scores only the 9 fish rows without a record, and
   what follows from them for their players (section 4). The sea slugs' 168 rows all have one: their replay does not
   move.
6. **The admin, wired to the same offsets** (corrected after review: an earlier version said nothing to add). Its
   Players (`admin.js` `progOf`) and Journey (`admin-journey.js` `sessProg`) replay each player on the page with
   `statsFor(S)` (`admin.js:10630`), which returns `{}` for every subject without `SUBJECTS` `replay` (the fish, the sea
   slugs), and `loadStats` (`admin.js:10139`) reads `?stats=1` without `&s=`, the corals' statistics alone. Built as
   items 1-5 only, the admin would replay a fish history holding one of the nine rows differently from the sheet. So:
   `ownRead` and `loadOwnStats` (`admin.js:13087`, today the photos and `gd` for the Analyses) also keep `mem` and `fmt`
   of a reply at or above the subject's `offsets` version; `statsFor(S)` gives a subject with `offsets` exactly what
   `rplMake_` passes it (its own `mem` and `fmt`, nothing of the corals'); Players and Journey load the subject's
   statistics before they replay, and the `progOf` and `sessProg` memos key on them (today on `SMEM`, the corals').

Files: `core.js`, `sync.js`, `model.js`, `Code.gs` (with its `tools/sync/changes/<branch>.md`, the version assigned
at merge: rule D3), `admin.js`, `admin-journey.js`, and tests: `tests/fishstats.test.js` (the subject's offsets read
from its reply, the prior before it), `tests/replay.test.js` (a row without a record replayed with the subject's
offsets, one with a record unchanged), `tests/adminreplay.test.js` and `tests/journeyscore.test.js` (the admin's
Players and Journey replay a fish history with a row without a record as `rplMake_` does: the parity test).

## 4. What players will meet

- **The fish draw aims at harder photos.** The photo's aim takes the format offset (`aimOff(k, df)`). With the fish k4
  offset at about +0.7, the draw picks photos about 0.7 logit harder for the same aimed success. Fish players, who are
  right about 88% of the time where the app expects 82%, come back toward the aim the corals already play at.
- **Fish progress grows a little more slowly per right answer.** The ability step expects the question with its offset,
  so an answer the app now expects to be right counts for less, and a miss for more.
- **Progress already reached moves only for the players with a fish answer logged without its scoring record**
  (corrected after review: an earlier version said bars already reached do not move). A player whose every fish answer
  has its record replays as before. Each of the nine rows without one is re-scored with today's offsets if it carries
  the logged expectation and ability (`replayProgress` rebuilds such a row only then, `core.js:6834`): its format
  offset (`core.js:6863`) enters the unit's bar step and the ability steps (`dm − df`, `core.js:6102`, `6113`); its
  memory offset only for a row logged before 2026-11-03 (`MEM_LOGGED`: after it the logged expectation already holds
  the memory, `core.js:6861`). From that row on, the player's abilities (unit and level Elo, which also order the
  leaderboard after the %) carry the change into every later answer, whose record keeps its inputs but not the ability
  it starts from (`core.js:6096`); the bar of the unit answered in that row carries it through that unit's later
  answers. The other units' bars read no ability (`barOf`, `core.js:5274`). How far it goes is not measured: the build
  replays every fish player with the offsets off and on and reports the difference before it merges (section 5).
- **The sea slugs change at once too, a little:** their fitted offsets are already nonzero (section 2: k4 +0.13, k2
  −0.22, again +0.09, right once −0.71), so switching them on moves their scoring and draw from the first answer, by
  less than a quarter logit except the right-once bucket (corrected after review: an earlier version said nothing
  changed until their data moved). Their progress already reached does not move: all 168 of their rows have a record.

## 5. Risks and what the build checks

- **The k4 offset carries a calibration gap, not only a format effect.** Absorbing it through the format offset is the
  rule the corals already use (LEARNING.md "Per-format offsets"). An offset that large may instead point to the fish
  photos' difficulty prior (judged ease) being set too hard. That is a separate question (REE-10's componential model),
  not this design's. The format offset corrects the expectation either way, and comes back to 0 if the photo prior is
  fixed.
- **Check level 2** (rule L11: it changes what players see broadly, the draw's aim for every fish question): the rated
  world, fish, 10 seeds per profile at LEARNING.md's level-2 length, with the fish's fitted offsets on against off; the
  app world as level 1 (300 questions × 5 seeds, the fish profiles), since the photos shown change; every guardrail.
- **Real log (rule L12):** the leave-one-player-out table above, re-run on the build's day, by level band and format;
  and the before/after replay (corrected after review): every fish player's answers replayed as `rplMake_` does, with
  the offsets off (today) and on, each player's %, learned units and level Elo compared, the players who move listed by
  anonymous id with how much. The admin's replay (section 3, item 6) gives the same figures as the sheet's.

## 6. Step plan and what it waits for

- **This note** (docs only).
- **The build**, one PR: section 3 (the admin included), its tests, the level 2 checks, the real-log table and the
  before/after replay, the rules versions. Its files are sensitive (rule W27). On 2026-11-22 (02:55 Manila) `model.js`
  is held by #1391 and `sync.js` by #1436 (`core.js` and `Code.gs` are free since #1385 merged), so the build waits for
  both to merge.
- **One question for Pierre before the build** (section 7): fish questions get harder. That is a change players feel,
  and no answer of his covers this effect for the fish.

## 7. Question for Pierre (at his next window, Rule 0)

**The fish at the same aim as the corals.** Fish players answer right 88% of the time where the app expects 82%.
With their own format offsets, as the corals have since rules version 6, the fish draw would show photos a bit harder
and a right answer would count a little less, to come back to the aim. Progress already reached does not move, except
for the players who have one of the nine fish answers logged without their scoring record: theirs may move a little,
measured and listed in the build's PR before it merges (section 4, corrected after review).
- **A**: switch the fish and the sea slugs to their own offsets, as designed here (the sea slugs' are small but already
  nonzero, section 2).
- **B**: keep the fish on no offset until the photo difficulty prior is re-examined (REE-10).

*Recommendation: A.* It is the corals' rule applied to the fish (one engine, rule S1). It predicts the fish answers
better on the real log, and a rules version takes it back if needed.

## Integrator's calls (easy to correct, stated, not asked)

- `offsets` as a per-subject script version (rule D4), the sea slugs carried along with their own small fitted
  offsets, no card for the rules versions, the admin's replay wired to the same offsets, the tests listed.
