# The species exams and the ultimate exam: design note (REE-27)

**Status: design only (docs).** Nothing is built and no simulation was run. Written on `origin/main` at dff87f4c,
2026-11-23 (Manila evening), for Linear REE-27 "Fish path: the species exams (Q395)", which blocks REE-30 (fpct100 with
the ultimate exam). Its build comes later, in the PRs of section 9. Section 8 lists the questions it leaves: the
integrator's calls, which are easy to correct, and Pierre's.

## 1. The decision this note carries out

Q395, Pierre, 2026-11-17 evening and 2026-11-18 morning ([ANSWERS.md](../ANSWERS.md) "Q395";
[species step 2 plan](2026-11-18-species-step2-plan.md) §3, which keeps the question as asked and his choice):

- **A family exam at species level, kept by a hidden checklist**, one box per species. A box is ticked in ordinary play
  by a right answer on a first-seen photo, once the species is at Advanced. The hidden exam asks only the remaining
  boxes, at least 3 questions. A miss unticks the species, which then needs 2 right in a row to tick again. No threshold
  on the number of boxes: «bonne idée».
- **An ultimate exam**: 100 to 200 questions, 95% to pass, hard but recognisable photos, the only way from 99% to 100%:
  «oui». It carries fpct100 "Fish god" (REE-30).
- **Exams may reuse seen photos when needed**, where the unseen ones run out.
- For the sea slugs the same exam runs per genus (their units' rank), and a species' box is per name kind it is learned
  by. The plan records this as the integrator's call, easy to correct.

The ledger quotes his two words only; the rest is the plan's paraphrase of his answers (marked "(paraphrase)" in the
ledger). Where this note reads more into it than those lines say, section 8 asks.

## 2. What is there today

- **The mastery exam** (rule L9; `model.js` `EXAM = {n: 5, gap: 8}`, `examOn`, `examReady`, `examSet`, `examTyped`,
  `examPassed`; `quiz.js` answer; `core.js` `examOpen`, `scoreOf`, `keepsMark`, `MX_EXAM`). It is per unit. It opens at
  `DOM.EX` (85%) with pair coverage and the confusion group met. It asks 5 questions, unannounced, `EXAM.gap` answers
  apart, as hard as the game gets: one photo alone, reserve first, then never shown, then least seen
  (`examSet`). At least 2 are typed. One right answer on each variant group is needed (Q391 b). A miss, shown or
  given, ends it. Passing sets `s.mx`, which makes the unit Learned (100%) and shows an Instructor toast.
  Questions are logged `|x`, reserved photos `|h`.
- **State**: `s.ex = {k, t, v, ts, at}` on the unit's record. `at` is the answer count today; #1484 (open) moves it to
  the answer clock `tally()`, which never goes down. `s.mx` is the time the unit was learned.
- **The replay never decides an exam** (`core.js` `replayedOf`). It keeps the device's `s.ex` and `s.mx`, and drops them
  when the log has a miss after them (`r.lx`, `r.lm`). `vl` (variant groups with no right answer) is computed from the
  log and kept on the record (`REPLAYED`). That is the precedent for a field the replay derives from the log.
- **Species units have no exam**: `app.js` gives every `cn:` and `sci:` species unit `noex: 1`, both subjects, so their
  bars stop at 95% (`model.js` `examOn` skips them). `noex` also keeps them out of the reserve's unit list
  (`core.js` `reserveOf`). Their observations are reserved through their family's or genus's unit and held in every
  unit's lists (`reserveSplit`), species units included.
- **Each species unit has `parent`**: its family for a common name (`cn:`), its genus for a scientific name
  (`sci:`, fish and sea slugs: two independent trees, Pierre, 2026-11-18).
- **The score**: `core.js` `treeScore` adds the units' bars up (`scoreOf`). The app, the sheet's board
  (`Code.gs` `CORE_.treeScore`) and the sheet's achievements all read it. Today a fish player cannot reach 100%, since
  no species passes 95%. Every subject's `pct` is rounded from `raw`.

## 3. The species exam (the checklist)

One rule for both subjects and both name kinds (rule S1). The exam's group is the species unit's `parent`. One box is
kept per species unit, so a species learned by both names has two boxes, one in each tree.

**The box** (`bx` on the species unit's record, from the log; section 6):

| State | `bx` | Ticks with |
| --- | --- | --- |
| never ticked | absent | 1 qualifying right answer |
| unticked by a miss | -2 | 2 qualifying right answers in a row |
| one of the two | -1 | 1 more |
| ticked | 1 | (a miss unticks: -2) |

- **A qualifying right answer** is an ordinary question on a photo this player was never shown, on any unit of the
  subject (`model.js` `shownAll`), with the unit's bar at Advanced (0.8) or above before the answer. It can also be an
  exam question (`|x`) answered right, whatever its photo, since Q395 lets the exam reuse seen photos.
- **A miss** unticks: the species shown and missed, or given as the answer for another species (rule L9's "giving it as
  the answer for another"). A wrong pick between the two name kinds cannot happen, since choices stay within one kind
  (`app.js` `kindRank`).

**The exam** (a group exam on the existing engine):

- **Its set**: the group's species units that are met, not learned, and at their exam's entry. The entry is today's
  `examOn` without `noex`: `DOM.EX`, pair coverage, the confusion group met. The set is read at each question, so a
  species that reaches its entry during the exam joins it.
- **It opens** when the set is not empty. It asks the unticked species of the set first, the least recently asked
  first. Every question uses today's `examSet`: one photo alone, reserve first, then never shown, then least seen,
  and a variant group still left comes first.
- **At least 3 questions** (`EXAM.min = 3`, new): the exam passes only once it holds 3 right exam answers or more
  across the group. When fewer than 3 boxes are left, the other questions go to ticked species of the set, oldest box
  first (section 8, question b).
- **Gap**: `EXAM.gap` answers apart within a group, on the answer clock: the group's latest `s.ex.at`, `tally()` after
  #1484.
- **Typed**: at least `TYPED.exam` (2) of the group's exam right answers are typed. This is `examTyped` with the
  group's counts, so rule L9's "at least 2 typed" holds per exam. Otherwise each question is typed at the unit's usual
  share.
- **State**: today's `s.ex` on each species of the set (`k` counts its right exam answers, `at` the clock). A miss
  drops that species' `s.ex` and unticks it. The rest of the exam goes on: there is no failing and restarting, since
  the checklist is the exam (no pass mark, Q395).
- **Passed** when every species of the set is ticked, has no variant group left (`varLeft`, Q391 b) and the group's
  `k` add up to 3 or more. Every species of the set then gets `s.mx` (Learned, 100%). `keepsMark` keeps each mark as
  for any unit. A species whose mark goes rejoins the next exam with its box unticked.
- **Not a new mechanism for the families**: a family unit keeps its own 5-question exam. The group exam replaces only
  the species units' `noex`.

## 4. The ultimate exam

A subject parameter, `SUBJECTS` `ultimate`, given to the fish only. This is a declared difference (rule S1, listed in
`tests/subject-neutral.test.js` with Q395 as its reason). The sea slugs and the corals already reach 100% through
their units' exams (section 8, question e).

- **Opens** when the subject's % before the cap is 99 or more (`treeScore` `pct`), and no ultimate exam is under way or
  waiting after a failure.
- **The cap**: without a passed ultimate exam, the % shown is at most 99 (`treeScore`, so the app, the board and the
  sheet's achievements agree). Once it is passed, the % is 100 while the rounded score stays at 99 or more, and it
  follows the score below that.
- **Questions**: 100 to 200, read as a sequential rule (section 8, question d). It passes as soon as 100 or more are
  answered with 95% or more right. It fails once misses pass 10, the most that can still reach 95% at 200. It stops at
  200.
- **What it asks**: every unit of the player's fish tree that is in play (families, scientific genera, species by
  each name they learn). Each family is asked at least once, and the rest are drawn by the score's weights
  (`rankWeights`, so the fish most seen near Dauin count most).
- **"Hard but recognisable" photos**: a photo the game may show (`gamePhotoOk`, judged for the fish). Its rated
  difficulty lies between the unit's median and its 90th percentile, so the photo is hard without being an outlier.
  Reserve first, then never shown, then least seen (Q395's reuse). These are starting values.
- **Typed** at each unit's usual share (`typedP`).
- **Each answer counts like any answer**, as exam answers do today. It is logged with a new suffix `|u`, read by
  `core.js` `fmtOf`, and a miss unticks a box or takes a mark as any miss does.
- **After a failure**, it opens again 100 answers later on the clock.
- **State**: on the level record (`P['~level']`): `ux = {k, ok, ts, at}` while under way, `um` (the time) once passed.
  `replayedOf`'s level branch keeps fields that are not the log's (`LEVEL_LOG`), so both survive a replay. The merge of
  two devices keeps the larger `um` and the later `ux` (to check and test in step 3).

## 5. The achievement (REE-30)

fpct100 "Fish god" is `s => s.pct >= 100` in `core.js` `FISH_ACH`, next to fpct70. With the cap, `pct` reaches 100
only once the ultimate exam is passed, so no other condition is needed. It is not in `ACH_LEARN`: the ultimate mark is
never recalculated, so nothing takes it back. Its timing is checked with the real game (rule L8) from a progress built
at 99%, since no player is near that. FISH_PATH's count becomes 33 of 33.

## 6. Progress rules versions and the sheet

- **The boxes come from the log** (`bx` computed in `replayProgress` at each answer on a species unit, added to
  `REPLAYED` as `vl` is). This follows rule D9: the log is the reference. Every device and the sheet agree, and a
  player's past qualifying answers tick their boxes at the replay, silently (rule D6). The device mirrors the same step
  (`quiz.js` answer, with one shared `core.js` `bxStep`, as `varRight` mirrors `vars`). This changes what the replay
  gives, so it needs a rules version for each subject with species units: a new entry in `FISH_RVS` and one in
  `SEASLUG_RVS`, each with `msg: null` (rule D5).
- **The exam and the learned marks stay the device's**, kept and dropped by `replayedOf` exactly as today: `s.ex`,
  `s.mx`, `r.lx`, `r.lm`. That code is generic, so a species unit's exam is kept like any unit's.
- **The sheet**: `Code.gs` embeds `core.js` (rule D3: `python3 tools/sync_core.py --fix`, a changes file, the version
  assigned at merge). Its replay then returns `bx`. Check its replay caches: step 2 moved `sgen3` and `stree2` when
  the replay's records changed.
- **Gate** (rule D4): the app's species exams wait for the sheet script that replays `bx` (`sync.js`, a new
  `EXAMS_SHEET`). An older script's replay would drop the boxes at the next adoption.
- **The ultimate exam** changes no replay. Its cap is in `treeScore`, which the sheet runs from the embedded `core.js`:
  a changes file, and no rules version (the replayed records do not move). It needs no gate: until the script
  updates, the board could show 100 instead of 99 for a player at 99.5% or more, and there is none.
- **The reserve does not change.** Species units keep out of `reserveOf`'s unit list (a test checks its output is the
  same), and their exams draw on the observations their family's or genus's reserve already holds for them.

## 7. What players see

- No box anywhere: the checklist is hidden, as the mastery exam's count is today. A species bar still fills to 95%.
  Each right exam answer then fills a fifth of what is left, as `scoreOf` does for any unit (at most 4). Learned makes
  it 100%: Instructor on the species tile.
- One toast per group passed, for example "Butterflyfishes: 7 species learned by their common names". This is the
  integrator's call, easy to correct, as are all the words below.
- The help texts: `app.js` (the fish and sea slug ledes), `progress.js`, `model.js` `missing` (what a species still
  needs: "a few hard questions on it, slipped unannounced into the Quiz").
- The ultimate exam, if announced (section 8, question c): a card on My progress when it opens ("The ultimate exam:
  100 to 200 hard questions on every fish you know, 95% to pass"), Start, a count on screen, stop and resume, and a
  result screen. A pass gives 100% and fpct100.

## 8. Open questions

**Pierre's** (each reads his Q395 words further than the ledger records, or is costly to undo):

- **(a) When the family exam comes.** Recommended: the rolling set of section 3. A family's species at their entry are
  examined together, and a species that reaches its entry joins. The alternative is to wait until every species of the
  family the player has met is at its entry, all learned together. That alternative could stall: one species opens
  at a time in a family at Advanced (`app.js` `spPlay`), so a family rarely has all of its met species at their entry.
- **(b) "At least 3 questions" when fewer than 3 boxes are left.** Recommended: the other questions go to ticked
  species of the set, oldest box first, and a miss unticks as anywhere. The alternative is to ask the remaining ones
  again, so with one box left that species is asked 3 times.
- **(c) The ultimate exam, announced or silent.** Recommended: announced, a session the player starts from My progress,
  which can stop and resume. A silent one, spaced like the mastery exam (`EXAM.gap` 8), would take about 800 to 1,600
  answers, and a 95% pass mark fits a session the player knows about.
- **(d) Its length.** Recommended: the sequential rule of section 4 (pass at 100 or more questions with 95% right, fail
  past 10 misses, at most 200). The alternative is a fixed number, such as 150.
- **(e) Which subjects get one.** Recommended: the fish only, as Q395 decided, through the `SUBJECTS` parameter, so
  another subject takes one line.
- **(f) The stored shapes** (formats that other code will follow): `bx` on unit records (-2, -1, 1), `ux` and `um` on
  the level record, the log suffix `|u`. Recommended as written.

**The integrator's calls, easy to correct** (recorded in the build PRs' Decisions):

- The group is the species unit's `parent`, one box per name kind. This extends Q395's sea slug line to the fish's
  scientific species, which hang from their genus (two independent trees).
- What qualifies, the miss shown or given, and an exam answer ticking whatever its photo (section 3). The step 2 plan's
  test line "never by an exam question" (§4) is read as the family unit's own mastery exam. An exam question on the
  species must tick its box, or the checklist could never complete.
- The boxes from the log, past answers included (section 6), rather than from the build onward.
- 2 typed per group exam, the gap on the answer clock, the variant groups as today.
- The ultimate exam's photo band, unit draw, typed share and wait after a failure; the % after a pass (section 4).
- Every word and the toast.

## 9. Build plan

Each step is one PR. The `core.js` lane (`core/*.js`, `core.js`, `tools/sync/Code.gs`) takes one PR at a time (rule
W27). Steps 2 and 4 also wait for #1484's answer clock in `model.js` and `quiz.js`. The sizes are estimates from the
cited PRs (`tools/effort.py --estimate`).

1. **The boxes in the replay (engine+sheet M)**: `core/replay.js` (`bx` in `replayProgress`, `REPLAYED`; the shared
   `bxStep`), `core/rules.js` (`FISH_RVS`, `SEASLUG_RVS`), `core.js` (built), `tools/sync/Code.gs` (embedded copy;
   caches), `tools/sync/changes/<branch>.md`, a new `tests/speciesbox.test.js` (each transition of the box, a
   first-seen right at Advanced, a miss given, an `|x` on a seen photo; bars unchanged by the replay; the reserve's
   output unchanged), docs/LEARNING.md "Full replay". Check level 0 (the bars do not move), plus a read-only count on
   the real log of the boxes it would tick (aggregates, rule L12). Comparable to #1187, #1265, #1346, #1369 and #1433:
   median 43 min (range 24 min to 45 min).
2. **The species exam in the app (engine L)**: `app.js` (species units: `exam: 'group'` instead of `noex`; the help
   texts), `model.js` (`examOn` and `examReady` for a group, the next species, `EXAM.min`, `examTyped` with the
   group's counts, `missing`), `quiz.js` (answer: the box mirror, the group's pass, the toast), `sync.js`
   (`EXAMS_SHEET`), `progress.js` (help), `tools/ratedworld.js` (the same rules), tests (`tests/groups.test.js` and a
   new `tests/speciesexam.test.js`: the set, at least 3 questions, typed, a miss unticking without ending the exam,
   learned all together). docs/rules/learning.md L9 (a species is learned through its group's exam, Q395), LEARNING.md,
   FISH_PATH.md, spec/quiz.md, spec/fish-game.md, and a decision record. This is level 2 (it moves the levels and the
   draw, rule L11): the rated world, fish, 10 seeds, within the 40-minute cap; primary declared first (the answers from
   a species' entry to Learned); then the app world. Comparable to #1267, #1277, #1279, #1301 and #1331: median 6.6 h
   (range 5.0 h to 13.0 h), the check included.
3. **The ultimate exam in `core.js` (engine+sheet S)**: `core/score.js` (`treeScore`'s cap), `core/subjects.js` (fish
   `ultimate`), `core/elo.js` (`fmtOf` reads `|u`), `core/merge.js` (`ux`, `um`), `core.js`, `Code.gs`, a changes file,
   `tests/subject-neutral.test.js` (the declared difference), tests of the cap on the board and in the app. Check level
   0 (nobody is at 99%). Comparable to #1187, #1227, #1299, #1369 and #1445: median 24 min (range 24 min to 5.4 h).
4. **The ultimate exam in the app (feature M)**: `progress.js` (its card), `quiz.js` (the session, `|u`, the result),
   `model.js` (its draw and photo band), `app.css`, tests, docs (LEARNING.md, spec/quiz.md, FISH_PATH.md). Check level
   1 from a progress built at 99%, and screenshots at 390 px (rule W17). Comparable to #1204, #1284, #1407, #1411 and
   #1423: median 1.7 h (range 84 min to 2.4 h).
5. **fpct100 (REE-30, engine+sheet S)**: `core/achievements.js` (`FISH_ACH`), `core.js`, `Code.gs`, a changes file,
   `progress.js` (if its achievement version moves), tests, LEARNING.md and FISH_PATH.md "33 of 33". Timing is checked
   with the real game (rule L8). Comparable to #1187, #1227, #1299, #1369 and #1445: median 24 min (range 24 min to
   5.4 h).

Step 1 needs (f) answered for `bx`, and nothing else. Step 2 also needs (a) and (b). Steps 3 to 5 need (c) through
(f).
