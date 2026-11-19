# One engine for every game mode: where the modes are counted differently (2026-11-19)

Read-only audit of `main` at `e906e3915` (fetched 2026-11-19 08:04 Manila). Pierre, 2026-11-19 06:58 (ANSWERS, Q411):
"Je ne comprends pas pourquoi le moteur n'est pas homogène… Pourquoi on a des exceptions en fonction des modes de
jeux????"; his standing line (Q356, 2026-11-15): "quelque chose qui soit cohérent entre tous les modes de jeu". The
sister audit `docs/reviews/2026-11-19-one-engine-audit.md` covers the subjects; this one covers the modes and formats.

**Short answer.** The core is already shared: every counted answer goes through `core.js` `scoreAnswer` (one scorer),
the same log row, the same sheet pass (`Code.gs` `statsStep_`, no mode filter but the surprise card) and the same
replay (`core.js` `replayProgress`, no mode filter), and the leaderboards read progress, never modes. The differences
come from four places:
1. **A second copy of the answer pipeline**: `live.js` `liveLog` repeats `quiz.js` `answer` and has drifted from it.
2. **The format offsets stop half-way**: the app's ability and bar take them; the pooled photo ratings, the opening
   hold and the comeback do not, and `live` and Find the X have no key of their own.
3. **Small format-specific gaps**: typed questions, the exam, the time weight and the duel achievement.
4. **Games that count nowhere** (the Tools, Memory), with no sentence that says so.

Classes used below: **deliberate** (a rule, an ANSWERS entry, a decision record or a LEARNING/spec sentence gives the
why), **pending** (recorded as "not yet" or as a ROADMAP row, not decided either way), **undeclared** (no stated
reason). "Moves progress?" gives two facts, because rule D5 covers both "what an answer weighs" and what the replay
keeps:
- **replay**: does the same answer log replay to a different state? A value kept in the scoring record (`sc`: d, f, c,
  o, t, m, n) replays as scored, so a fix that changes it only for new answers moves no row logged with `sc`. Rows
  without `sc` (before #632) read today's pooled numbers. A change inside `scoreStep` or `rtWeight` moves everyone.
- **new answers**: are new answers scored differently?

Whether "new answers only" needs a rules version is row 17's open reading.

## 1. Table

Line numbers are approximate, at `e906e3915`.

| # | Mode | Step | How it differs | Where | Class (source) | Proposed fix | Moves progress? | Open PR |
|---|---|---|---|---|---|---|---|---|
| 1 | Typed (`\|t`) | pooled `conf` | A typed answer naming another unit counts as a mix-up in the player's own record (`s.conf`, `pairConf`) but not in the pooled pairs (the sheet counts only choices offered) | `core.js` `confusionOf` ~3401; `Code.gs` `statsStep_` ~1197 | pending (ROADMAP "Typed answers, what is left", Pierre 2026-11-03) | #1116: one rule, `core.js` `confAdd`, for the sheet and the admin | Replay: rows without `sc` move. #1116's own figures: 15 of 490 coral bars by up to 0.36 points. New answers: the traps move, and one coral confusion group changes (*Acropora* with *Anacropora*), which changes the opening order and the exam's wait for group partners. #1116 adds no rules version: row 17 | **#1116** (Q411 open: expert −3.0 points, "unclear") |
| 2 | Live (`live`) | own record, log | A live answer on a unit the student has not unlocked is skipped: never scored, **never logged**, so no replay can recover it. Rule L4 since 2026-11-18 says such answers may count without opening the unit (Pierre: live answers "count without unlocking", "ok") | `live.js` `liveLog` ~670; header ~7-10 | **undeclared: contradicts a decided rule.** L4 (rules/learning.md ~72), decisions/2026-11-18-rules-wordings.md; ROADMAP row "Live mode, after version 1" and the live design note ~141 still say "rule L4 keeps it out" (stale) | Remove the skip: score and log the answer and open nothing. First check what reads a record with answers on a locked unit (`asked`, `openPick`, `unlocked`, the bonus offer). The prep study (d) asked for a learning check on the bar of a unit not yet in play | No past row (none was logged); new answers only; L11 level 1 | none |
| 3 | Live | own record | `liveLog` is a second copy of `answer`, missing: `varRight` (a right live answer on a juvenile or a colour phase does not clear its variant group on the device until the next replay), `achAfter`/`achCheck` (no achievement check after live answers), `s.ro`, `s.cor`, the comeback (`R: 1`, no `rustNow`, no `comebackStep`), `dropPlans` | `live.js` ~664-745 vs `quiz.js` `answer` 626-960 | undeclared (the design note says "logged like normal answers… so the full replay counts them the same", which holds only for the logged fields) | One shared function, e.g. `quiz.js` `recordAnswer(q, ctx)` (the scorer call, exam and mark keeping, variant groups, the hold, the start check, `answeredAt`, log, save, achievements), called by `answer` and `liveLog`, as #1116's `confAdd` serves the sheet and the admin | No (device-side fields; the replay already rebuilds `vl`) | none |
| 4 | Live | format offset | Scored with the `k4` offset (`fmtOf('live', 4)` falls through to `k4`), but excluded from the fit (`fmtPoint` keeps modes starting with `quiz`), so live has an offset it never feeds | `live.js` ~700; `core.js` `fmtOf` ~3071, `fmtPoint` ~3107 | undeclared | `fmtOf` gives `live` its own key and `fmtPoint` accepts it, prior 0 until `FMT.N` answers. Or count live as `k4` both ways. | New answers only (`o` logged); D5 per row 17 | none |
| 5 | Every choice format, typed, comeback | pooled photo ratings | The sheet rates photos with g = 1/k, no format term and no recall, against its own player chain (`PLAYER0`). The app's served `fmt` (corals, read 2026-11-19: k2 +1.17, k3 +1.20, typed −0.44) is fitted on the app's logged `e`, not on the sheet's chain, so it is not the bias in the ratings. *Inference*: a photo asked mostly in a format the players find easier than 1/k allows is rated easier than it is, and one asked mostly typed is rated harder. | `Code.gs` `statsStep_` ~1213 (`e = g + (1 - g) * s`); `core.js` `eloReplay` | **pending**: notebook "Per-format offsets", "not yet: … the sheet's photo ratings (they keep 1/k)"; no ROADMAP row | A format term fitted in the sheet's own pass (jointly with the photos and its player chain, not the served `fmt` plugged in), and the comeback's logged recall `sc.r` | Replay: `gd` and the photo ratings move, so rows without `sc` move, and LEARNING "Full replay" calls it a rules version (D5). New answers: every photo difficulty. L11 level 2 + L12 | none |
| 6 | Again, duel, Duel tab, Find the X, live (any timed non-typed) | ability (time weight) | One answer-time median per player over every format (`P['~level'].rt`), so a 2-choice answer looks fast and a Find the X (four photos to look at) or a live answer (on a countdown) looks fast or slow against the 4-name questions' median. Typed answers are left out "slower by design". | `core.js` `rtTenths` ~5494, `rtWeight`, `rtAdd` | partly deliberate: typed excluded (notebook "Response time", 2026-11-04). Other formats undeclared: the 2026-11-03 measure saw the same slope on 2-choice and 3-4-choice questions but did not check a format's median shift; Find the X and live came later. ROADMAP "Matrix" plans its seconds "logged but unweighted" | Either a median per format family (`fmtOf`), or leave out of the weight the formats with another clock (Find the X, live, later Matrix), as typed is | Replay: yes, everyone (inside `rtWeight`), D5 and D6. New answers: yes. L11 level 1-2 + L12 (log-loss by format) | none |
| 7 | Typed | ability, bar, aim (known mix-ups `cf`) | A typed question gets no known-mix-ups term: `confTerm` reads the choices, and a typed question has none. LEARNING says the term applies "with 3 or more plausible choices", and a typed question has infinitely many. | `model.js` `confTerm` ~1710; `quiz.js` `planPhoto` ~2412 (`cf = typed ? 0`); `core.js` replay `confTermOf` ~6284 | undeclared (the 2-choice exclusion has its reason: "it made the prediction worse"; typed has none) | For a typed question, take the unit's confusable units in play (its traps) as the choices `confTerm` reads | Replay: rows with `sc` no (`c` logged); the replay's `confTermOf` for older rows yes. New answers: yes. Row 17; L11 level 1 | none |
| 8 | Exam (`\|x`) typed vs exam from choices | format offset | `fmtOf` tests `\|t` before `\|x`. A typed exam question takes the `typed` offset (fitted mostly on ordinary typed questions), a choice exam question takes `exam`. The corals serve no `exam` key yet (fewer than `FMT.N` answers), so it counts 0 there, next to `k4` +0.18. | `core.js` `fmtOf` ~3071 | undeclared | Decide one order: an `exam` key for both, or a `typed-exam` key. Small. | New answers only; D5 per row 17 | none |
| 9 | Find the X (`\|f`) | format offset, aim | Scored as `k4` (`fmtOf` has no `\|f` key) but its photo is aimed in format `find`, whose offset is absent (0). The two differ as soon as the fish format offsets are read. | `quiz.js` `planFind` ~2270; `core.js` `fmtOf` | **pending**: ROADMAP "Find the X" row: "its own offset… when the fish formats get offsets"; notebook "Find the X" | `fmtOf` reads `\|f` as `find`, as the ROADMAP row says, done with the fish offsets (sister audit, item 1.1) | Fish offsets: D5 (sister audit) | none (after #1148) |
| 10 | Find the X | photo memory, exam | The three other tiles are shown but not logged (`ph` holds the unit's own photo only), so they are neither in `s.ps` nor in the sheet's memory buckets. #1093 counts the four tiles as shown in its no-repeat window. *Guess, `examSet` not read*: since `model.js` `shownAll` reads only `s.ps`, the exam's "never shown" step could pick such a photo. | `quiz.js` `answer` ~757 (`ph`); `model.js` `shownAll` ~446; notebook "Find the X: the other photos are not in Photos" | partly deliberate: the log's reason (every reader takes a row's photos as photos of the unit shown). The effect on memory and the exam is undeclared. | A log field for the other tiles (rule D4 gate), read into each tile unit's `s.ps` as shown and not answered, and into the sheet's memory buckets | Replay: no. New answers: the memory term. A log field is a data format: integrator or Pierre | **#1093** (window only); **#1099** redefines "never shown" (STATUS: still open), body read only |
| 11 | Again (`\|k2` after a mix-up) | achievements | A right Again does not count for the duel achievement (`s.du`), a right duel does. LEARNING "One contrast queue" calls them "one kind of question… under one rule". | `quiz.js` ~736; `core.js` `replayProgress` ~6369 | undeclared | `s.du` on every right contrast question, Again included, in both places | Achievements only (`du` is kept "either" in `replayedOf`) | none |
| 12 | Duel tab, live | ability, bar (recall after a break) | The comeback runs only in the photo quiz and the custom quiz: there, the questions after a break are comeback questions scored with the unit's recall `R` (a miss the rust explains weighs less). A Duel-tab or live answer during the same comeback is scored with `R = 1`. | `quiz.js` `answer` ~666 (`warm` only in `photoQuiz`); `live.js` ~695 | undeclared (LEARNING "Comeback after a break" describes the quiz's questions; it gives no reason the other modes ignore the rust) | While a comeback runs (`rustNow`), every mode takes `recallAt(t)` as `R`; the question choice stays the quiz's | Replay: no (`r` logged). New answers: yes. Row 17; L11 level 1 | none |
| 13 | Opening hold, comeback CUSUM, every non-`k4` format | opening pace | Both read the logged `e`, which leaves the format offset out, so a run of 2-choice right answers pays the hold back more than the same run in 4 choices | `model.js` `holdStep`; `Code.gs` `hold_` ~572 | **pending**: notebook "not yet: … the opening hold and the comeback (they read the logged e)" | Log `e` with the offset, or have the hold read `e` + `o` from `sc` | Opening pace only (not the record); L11 level 2 (the opening) | none |
| 14 | Tools (Type the genus, Reveal, Zoom, Spot, Elimination, the anatomy quiz), Memory (a Practice tab), the fish basics checks | everything | Nothing is logged or scored: no progress, achievements or pooled statistics. Memory is a Practice game (Q302, from the answers-history draft: "Practice pages only (quiz, custom, duels, Memory)" count as a game in the admin's Visits; ROADMAP "Game modes": "Built already: … Memory"). Type the genus asks the same thing as a typed quiz question. | `proto/*.js` (local `score` only); `app.js` MODES ~2957 | Tools: deliberate in effect (rule U13: Lab/Tools prototypes graduate only with Pierre's approval, and counting would be graduating), not written as a counting rule. Memory: undeclared. | One sentence in LEARNING "One progression path for every game" saying what counts and what does not, and why | No | none |
| 15 | Live | achievements (runs) | Live answers neither extend nor break the run, by omission (no `achAfter`). The run counts "only in the normal photo quiz" (`achRunIn`). | `progress.js` `achRunIn` ~937 | deliberate in effect (Q82: the run only in the normal quiz), but not written for live | Say it with row 3's shared function (`achAfter(…, 'live')` keeps `achRunIn` false) | No | none |
| 16 | Docs | log modes | The `quiz.js` comment points to `docs/ARCHITECTURE.md` "Answers columns, its Mode suffixes", which no longer exists. The modes are listed twice, each list partial: spec/sync.md's Mode paragraph (~124) lacks `\|f`, `\|s` and `\|h`; LEARNING "Logged for the admin's player journey" has the suffixes but not `live` or `wink`. | `quiz.js` ~676; `docs/spec/sync.md` ~124; LEARNING ~545 | doc gap | One list of the modes and suffixes, with what each changes (this table's deliberate rows); the other place links to it | No | none |
| 17 | Every pooled change (rows 1, 4, 5, 8) | D5 | LEARNING "Full replay": "a change to how `Code.gs` `stats_` computes what the corals' replay reads from it (`mem`, `conf`, `fmt`, `gd`) is one [a rules version]". #1116 adds none (Codex flagged it; the PR answers: rows with `sc` replay the same). | LEARNING ~1074; #1116 "Decisions" | conflict between a doc and a PR | Reword the sentence to the test above: a rules version only when the replay of the same log changes, which for `conf` and `fmt` means only rows logged without `sc` (before #632) | n/a | **#1116** |

### Deliberate differences (each has its reason; not defects)

| Mode | Difference | Source |
|---|---|---|
| Exam (`\|x`) | Silent, counted nowhere on screen; never in the custom quiz | L9; LEARNING "Progress (moving average) and mastery", "Custom quiz" (no look-alike guaranteed) |
| Custom quiz (`quiz\|s`) | No exam, no opening, no run or Sharp eye | L9; LEARNING; Q82 ("only in the normal Quiz"); `progress.js` `achRunIn` |
| Duel tab (`quiz-duel`) | No run or Sharp eye; out of the admin's quiz success rate (`playSplit`) | `progress.js` ~934 ("make them easier"); `core.js` `playSplit` (Pierre, 2026-11-03) |
| Typed | No guess rate (k infinite); no time weight ("slower by design"); never a comeback, an Again or a duel ("2 choices by design") | LEARNING "Typed questions"; notebook "Response time"; spec/quiz.md |
| "I don't know" (typed) | A miss on the unit shown only; no pair offered | spec/quiz.md "Typed questions"; #1116's decision record |
| Typed, a unit's "possible answers" | The false-alarm denominator counts every unit of the rank; the pair counts take a typed mix-up as offered once | L2 and LEARNING "The domain-score bar" (FA); #1116 decision (pairs: "would bury the pairs under offers no player ever saw") |
| Find the X | Scored as 4 choices; the tapped photo's unit is the answer given | LEARNING "Find the X"; L2 |
| Surprise card (`wink`) | Counts nowhere (told to the player: "Just for fun") | `quiz.js` `winkShow`; `Code.gs` v98 (`replayed_`, `subjRows_`) |
| Every format | Its own fitted offset in the ability, the bar and the photo's aim | Q138, Q146 (LEARNING "Per-format offsets") |
| Known mix-ups term | None on 2-choice questions | `model.js` `confTerm` comment ("made the prediction worse") |
| Live | Its own points (speed bonus), separate from the leaderboards | Q393; live design note (b) |

### Traced, no difference found

Each item was traced through the log row, the record, the sheet's pass and the replay; it counts like a plain quiz answer
except where noted:
- **Retyped (`tr`), the spelling step:** logged only; grading never reads it (spec/quiz.md).
- **Calibration questions (`CAL.RATE`):** the draw only (one view alone, colonies never seen). Their answers count like
  any other and carry no mode flag, so the admin cannot tell them apart.
- **The coral calibration set (#1130, `calibration-set.json`):** a draw bonus only.
- **The corallites hint:** counted as seen only when opened before the answer, else "shown, not recognised" (`sc.h`).
  The device and the replay agree.
- **More:** the feedback panel after an answer; counted only in the pages tally.
- **Comeback (`|c`):** the quiz's questions after a break, its `e` and `R` logged. Only rows 5, 12 and 13 concern it.
- **Held-out photos (`|h`):** asked by the exam only; counted like any answer.
- **Custom quiz (`quiz|s`):** stored, rated and replayed as the photo quiz; its exceptions are in the deliberate table.
- **Duel tab (`quiz-duel`):** the same scorer with k 2, its own `duel` offset. A mix-up there queues no Again, since the tab
  already drills the pair.
- **The leaderboards (`Code.gs` `board_`):** read saved or replayed progress; no mode.
- **The sheet's opening hold (`hold_`):** every mode but the old `|w` rows, as the device's.

**Not on main:**
- The Matrix game (ROADMAP "Matrix": agreed, not built). `proto/matrix.js` is the Lab's "Feature matrix", a reference grid
  that scores nothing.
- The game modes of the 2026-11-18 decision (Same or different?, Odd one out, Down the tree, Life stages matched, Sort
  them, Virtual dive): no code on main.
- The placement test: not built.

When they come, the shared recorder (PR 3) and the format keys (PR 5) should be their only path in.

## 2. Undeclared or pending differences, by impact on players' learning

Impact is judged from the code and the served offsets. None of it was measured on the answer log.

1. **Row 5: the pooled photo ratings ignore the format offsets (pending, no ROADMAP row).** Every photo difficulty in
   every mode inherits it (aims, expectations, bar). It is the largest by reach. Its size and even its direction are
   *inferred*: the app's offsets (k2 +1.17, k3 +1.20, typed −0.44) show the formats differ a lot, but they are
   measured against the app's expectation, not the sheet's chain. Measure (rule L12): fit a format term inside the
   sheet's pass on the real log, then compare the app's next-answer log-loss and calibration by format, before and
   after.
2. **Row 2: live answers on locked units are dropped and never logged.** This contradicts L4 as decided on
   2026-11-18, and the evidence is lost for good. The size depends on live use (new since 2026-11-18). Prepared sets
   (species, families beyond the student's path) will make it common (prep study (d)).
3. **Row 6: one time median across formats.** The time weight moves the ability by ×0.5 to ×1.5 on right answers, so a
   systematic format shift is a systematic bias. *Guess*: largest for players with many Duel-tab answers (fast) and for
   Find the X answers (slow).
4. **Row 7: no known-mix-ups term on typed questions.** Typed questions are the exam's hardest and the player's own
   mix-ups matter most there. The term only adds a player's excess over the pooled score, so the size is modest.
5. **Row 3: live's copy of the pipeline.** Variant groups, the achievement check, the rust: each is small, but every
   future rule written in `answer` will miss live again.
6. **Row 1 (#1116), row 4, row 8, row 12, row 13.** Each is small and local (live volume, typed exam keys, rust in the
   Duel tab, hold pace).
7. **Row 10, row 11, row 14, row 15, row 16.** Memory and the exam on fish tiles, the duel achievement, the Tools, docs.

## 3. Proposed order of small PRs

1. **Docs, no behaviour change.** The deliberate table above becomes LEARNING "What each mode counts" (or a section
   of "One progression path for every game"). It also takes the Tools/Memory sentence (row 14), the mode list (row
   16), the stale lines on L4 in ROADMAP "Live mode, after version 1" and the live design note (row 2), and the D5
   sentence reworded (row 17). Level 0.
2. **Merge #1116** after Q411 (row 1).
3. **One answer recorder** for `quiz.js` `answer` and `live.js` `liveLog` (rows 3, 15): no replay change; level 0-1;
   tests that a live answer and a quiz answer on the same state give the same record.
4. **Live counts on locked units** (row 2), on top of 3: L11 level 1, checks of the opening and the bonus offer on a
   record with answers and no card.
5. **Format keys for every mode** (rows 4, 8, and row 9 when the fish offsets come): `core.js` `fmtOf`/`fmtPoint` plus
   the `Code.gs` copy (rule D3 changes file); new answers only.
6. **Typed known mix-ups** (row 7) and **recall in every mode** (row 12): scoring inputs, logged; L11 level 1.
7. **Duel achievement on the Again** (row 11): achievements only.
8. **Time median per format** (row 6): D5, L11 level 2, L12.
9. **Photo ratings with the format offset and the recall** (row 5): sheet `statsStep_` and `eloReplay`; D5; L11
   level 2 + L12; after 5, so the keys are final.
10. **Hold and comeback with the offset** (row 13): opening pace; level 2.
11. **Find the X's other tiles in the photo memory** (row 10): a log field (rule D4); after #1093.

Steps 1-4 and 7 move nobody's progress. Steps 5 and 6 change new answers only. Steps 8 and 9 move everyone (D5, D6
silent), and 10 changes the opening pace.

## 4. Questions for Pierre (only what his answers do not settle)

Searched first: `docs/ANSWERS.md`, the answers-history draft, `docs/rules/`, `docs/decisions/` (grep: Lab, Tools,
Memory, "count", typed, live, format, exam, duel).

- **Memory (optional, plain, no number).** Found:
  - Q302 (2026-11-08, from the answers-history draft, a paraphrase): "'A game': … Practice pages only (quiz, custom,
    duels, Memory); Lab visits count as without a game". This is about the admin's Visits filter, not about counting.
  - Rule U13 for the Tools (prototypes graduate only with his OK).

  Nothing says whether Memory counts. Recommendation: the integrator writes down today's behaviour as the rule (Memory
  pairs two photos of one genus and names no unit; the Tools are prototypes, U13), easy to correct. A question only if
  Pierre wants Memory or Type the genus to count: "Memory et les Outils ne comptent nulle part (ni progrès, ni stats
  communes) ; on le laisse ainsi ?"
- **Not asked, already decided:**
  - live answers on locked units: L4, 2026-11-18, "count without unlocking", "ok", which reversed the prep study's
    recommendation A;
  - the exam's silence: L9;
  - the custom quiz's exceptions: Q82, L9;
  - the format offsets themselves: Q138, Q146.
- **Q356 is not a general mandate.** #871's description shows he said "quelque chose qui soit cohérent entre tous les
  modes de jeu" about fish against corals (confusion groups). His 2026-11-19 06:58 words ("Pourquoi on a des
  exceptions en fonction des modes de jeux????") ask for the coherence, but no answer of his was found on the specific
  changes:
  - Rows 3, 4, 7, 8, 11 and 12 change only new answers or device-side fields, and are easy to correct: the integrator's
    call under the merge contract.
  - Rows 5 and 6 move everyone's progress through a rules version, and row 13 the opening pace: whether to ask him is
    the integrator's call (the replay can undo them, but they change every player's record at once).
- **For the integrator:**
  - Row 17 (LEARNING's D5 sentence against #1116) is a reading of rule D5. Settle it before #1116 merges (Q411).
  - Row 10's log field is a data format: the integrator's call, or Pierre's if judged costly to undo.

## 5. What was checked and what was not (rule W11)

**Checked** (read at `origin/main` `e906e3915`):
- **Rules and docs:**
  - AGENTS.md: Rule 0 (08:03 Manila: before 17:30), the merge contract, the rules index;
  - `docs/rules/learning.md` L1-L15; rules D5 and D6;
  - `docs/LEARNING.md`: "The player's own model", "One scorer", "Response time", "Per-format offsets", "Typed questions", "One contrast queue", the duels, Find the X, "Custom quiz", "Logged for the admin's player journey", the bar, the exam, "Pooled statistics" (all), "Full replay";
  - `docs/spec/quiz.md`, `docs/spec/model.md`, the Mode paragraph of `docs/spec/sync.md`, `docs/FORMATS.md`;
  - `docs/ANSWERS.md`, the answers-history draft (grep), `docs/STATUS.md` questions;
  - the notebook sections "Response time" and "Per-format offsets"/"Find the X";
  - the live design note and the live prep study (d);
  - decisions/2026-11-18-rules-wordings.md; the ROADMAP rows on typed answers, Find the X, Matrix, Live, the engine coherence review and the fish stats;
  - the sister audit;
  - the engine coherence review (grep).
- **Code:**
  - `quiz.js`: `answer` in full, `planPhoto`, `planFind`, `planDuel`, `duelPick`, `winkAnswer`/`winkShow`, `typeNames`/`typeMatch`, `modeBase`;
  - `live.js`: header, `liveLog`, `liveBuild`;
  - `core.js`: `guessOf`, `fmtOf`, `fmtPoint`, `fmtFit`, `playSplit`, `trustOf`, `confusionOf`, `pairConf`, `faOf`, `rt*`, `scoreAnswer`/`scoreStep`, `replayProgress`, `kOf`, `WINK_MODE`;
  - `model.js`: `confTerm`, `varRight`, `pfmt`/`pmem`, the `photoSet` calibration flag;
  - `progress.js`: `achAfter`, `achRunIn`;
  - `Code.gs`: `answerRows_`, `subjRows_`, `hold_`, `guess_`, `trusted_`, `statsStep_`, `stats_`, the start of `board_` (no mode read);
  - `proto/*.js` (grep for any write: only local scores); `app.js` MODES.
- **Open PRs:**
  - #1116: body and `core.js` diff (`confAdd`);
  - #1093: body.
- **Live data, read-only:** the public `?stats=1` (corals) and `?stats=1&s=fish`, read once each. The corals' `fmt`: duel 0.30/204, k2 1.17/846, again 0.24/540, k3 1.20/115, k4 0.18/1685, qduel 0.11/118, typed −0.44/70 (no `exam` key). The fish's: k4 0.71/1929, qduel 0.44/159, again −0.11/296, k2 0.58/250, typed 0.33/61. Coral `mem` [0, 0.36, −0.64, −1.17]. Nothing was written.

**Not checked:**
- `admin*.js` and `analysis.js` beyond `FORMATS` (the admin's own per-mode splits);
- `learnsim.js`, `ratedworld.js`, `abilityeval.js`;
- `Code.gs` `rplMake_`/`replay_` bodies (covered by the sister audit), `lv_` (the live points);
- `sync.js` beyond a grep for mode tests (none found);
- the bodies of #1148, #1099, #1045, #1098 (titles only);
- the answer log itself: no row counts of live, Find the X or exam answers, so every impact size above is a guess;
- whether a live student's record of a locked unit would trip `asked()` or the opening (row 2's check is left to its PR);
- `model.js` `examSet`'s body: row 10's exam claim rests on the `shownAll` comment only.

Also read: #871's description (the Q356 wording), rule U13, ROADMAP "Game modes", `proto/matrix.js`, `model.js`
`shownAll`, #1099's description (grep).

**Guesses, labelled:**
- the impact order in section 2;
- that live volume is small today;
- that a format shifts the answer-time median (row 6);
- that the exam has no `exam` key because few exam questions are not typed (row 8).
