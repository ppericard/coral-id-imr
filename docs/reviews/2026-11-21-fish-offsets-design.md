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
  2026-11-06 13:07 Manila), and all 168 sea slug rows. So switching the offsets on moves the scoring of answers to come,
  not the replay of answers already logged (section 4).

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
- **Sea slugs:** one trusted player; their offsets stay at the prior and 0 by the fit's own shrinkage.

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
   so a row without a scoring record is replayed as the app would score it now. Rows with a record are unchanged.
5. **Rules versions (rule D5):** one entry appended to `FISH_RVS` and one to `SEASLUG_RVS`, no card (rule D6). They
   change the scoring of answers to come. The replay they trigger changes only the 9 fish rows without a record.
6. **The admin** reads the same offsets for each subject (its Analyses show the fit already per subject); nothing to add.

Files: `core.js`, `sync.js`, `model.js`, `Code.gs` (with its `tools/sync/changes/<branch>.md`, the version assigned
at merge: rule D3), and tests: `tests/fishstats.test.js` (the subject's offsets read from its reply, the prior before
it), `tests/replay.test.js` (a row without a record replayed with the subject's offsets, one with a record unchanged).

## 4. What players will meet

- **The fish draw aims at harder photos.** The photo's aim takes the format offset (`aimOff(k, df)`). With the fish k4
  offset at about +0.7, the draw picks photos about 0.7 logit harder for the same aimed success. Fish players, who are
  right about 88% of the time where the app expects 82%, come back toward the aim the corals already play at.
- **Fish progress grows a little more slowly per right answer.** The ability step expects the question with its offset,
  so an answer the app now expects to be right counts for less, and a miss for more. Bars already reached do not move:
  every logged answer replays from its scoring record.
- **The sea slugs:** nothing changes until their data moves their offsets away from the prior and 0.

## 5. Risks and what the build checks

- **The k4 offset carries a calibration gap, not only a format effect.** Absorbing it through the format offset is the
  rule the corals already use (LEARNING.md "Per-format offsets"). An offset that large may instead point to the fish
  photos' difficulty prior (judged ease) being set too hard. That is a separate question (REE-10's componential model),
  not this design's. The format offset corrects the expectation either way, and comes back to 0 if the photo prior is
  fixed.
- **Check level 2** (rule L11: it changes what players see broadly, the draw's aim for every fish question): the rated
  world, fish, 10 seeds per profile at LEARNING.md's level-2 length, with the fish's fitted offsets on against off; the
  app world as level 1 (300 questions × 5 seeds, the fish profiles), since the photos shown change; every guardrail.
- **Real log (rule L12):** the leave-one-player-out table above, re-run on the build's day, by level band and format.

## 6. Step plan and what it waits for

- **This note** (docs only).
- **The build**, one PR: section 3, its tests, the level 2 checks, the real-log table, the rules versions. Its files
  are sensitive (rule W27). On 2026-11-21 `core.js` and `Code.gs` are held by #1385, and `sync.js` by REE-59's PR, so the
  build waits for both to merge.
- **One question for Pierre before the build** (section 7): fish questions get harder. That is a change players feel,
  and no answer of his covers this effect for the fish.

## 7. Question for Pierre (at his next window, Rule 0)

**The fish at the same aim as the corals.** Fish players answer right 88% of the time where the app expects 82%.
With their own format offsets, as the corals have since rules version 6, the fish draw would show photos a bit harder
and a right answer would count a little less, to come back to the aim. Bars already reached do not move.
- **A**: switch the fish (and the sea slugs, as their data comes) to their own offsets, as designed here.
- **B**: keep the fish on no offset until the photo difficulty prior is re-examined (REE-10).

*Recommendation: A.* It is the corals' rule applied to the fish (one engine, rule S1). It predicts the fish answers
better on the real log, and a rules version takes it back if needed.

## Integrator's calls (easy to correct, stated, not asked)

- `offsets` as a per-subject script version (rule D4), the sea slugs carried along at their prior, no card for the rules
  versions, the tests listed.
