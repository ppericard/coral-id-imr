# Fish app-world simulations before the typed-answer fix: inventory and re-runs (REE-249)

**Status: review (docs only).** Written on 2026-11-23 (Manila night) on `origin/main` at `34a430b6`, just after #1502.
Nothing in the app or the tools changes here. Labels (rule W11): **[sim]** computed by `tools/learnsim.js`; **[read]**
read in a PR body, a doc or the code; **[guess]** my judgement.

**The bug** (#1502, [read]). On a typed question `tools/learnsim.js` typed the unit's id (`f:Damselfishes`) instead of
its name; only the species were typed by name (since 2026-11-17). The app read the id as a near spelling and answered
"So close!", taking nothing. A wrong typed answer (another family's id) and "I don't know" were taken. Corals were never
affected (a coral unit's id is its name), nor was the rated world (it does not use the page). Two eras:

- **Before #1375** (2026-11-06, #678, to 2026-11-21): each right typed answer was dropped. The learner was taught as if
  right; the app recorded nothing and moved on to the next question (the "quieter bias").
- **From #1375** (2026-11-21, the quiz keeps a question shown but not answered) **to #1502** (2026-11-23 22:05): the same
  question came back until the learner missed, hundreds of answers frozen (the "freezes").

## 1. The old bias, measured once

On `50f0744d`, the commit just before #1375, in a scratch worktree (never committed): `tools/learnsim.js` with a counter
around its answer (the app's `answersSoFar()` before and after each typed question), `--subject fish --seeds 1
--questions 600`, in a machine slot (rule W24) [sim]. The run asked by the issue, the lecture RA (`--choice new`, the
default): 600 questions shown, 568 answers recorded. **42 typed questions shown: 32 answered right, none recorded; 6
wrong and 4 "I don't know", all recorded.** The first dropped at question 112. Then every fish profile, 1 seed each
(`--choice auto`, as the profiles' truthful answers):

| Profile | Typed shown by q100 / q300 / q600 | Right typed recorded | Wrong and "I don't know" recorded | First dropped | Answers recorded of 600 |
| --- | --- | --- | --- | --- | --- |
| beginner | 0 / 0 / 6 | 0 of 5 | 1 of 1 | 305 | 595 |
| casual diver | 0 / 3 / 15 | 0 of 11 | 4 of 4 | 241 | 589 |
| lecture RA (imr) | 0 / 2 / 25 | 0 of 21 | 4 of 4 | 115 | 579 |
| strong RA | 2 / 8 / 63 | 0 of 61 | 2 of 2 | 35 | 539 |
| expert | 2 / 11 / 53 | 0 of 49 | 4 of 4 | 35 | 551 |

So in that era **the app saw every fish typed answer as wrong**: no right typed answer was ever recorded (0 of 179 in
these six runs), while the learner was taught each one as right. Within 300 questions it touched at most 11 questions
(the expert) and none for the beginner; by 600, about 1% to 10% of the questions. No fish unit could pass its mastery exam,
which asks at least 2 typed answers right (rule L9).

## 2. Inventory

**How it was searched** [read]: every PR merged from #678 to #1502 whose body names `learnsim` (73, through `gh api`
REST), kept when it ran `tools/learnsim.js --subject fish` in the app world; `docs/LEARNING.md`, the notebook
(`docs/archive/learning-notebook.md`), `docs/decisions/`, `docs/reviews/` and `docs/ANSWERS.md` searched for learnsim,
the app world and the fish. Left out as unaffected: the rated-world-only runs (#787, #789, #855, #998, #1020, #1371;
the rated legs of #822, #953, #1057, #1067, #1391), the coral-only ones (#852, #1116, #1195, #1357, #1414), the
tooling PRs whose fish runs only checked for page errors at 60 to 100 questions (#782, #783, #786; #1251 at 50), and
#685, whose fish figures came from a scratch harness, not learnsim. Open PR #1498 (REE-56) is included: its timing is
the one that found the bug.

**What the bug can change** [guess, from §1]: the learner's own measures (true knowledge, D\*, the right % learnsim
prints, the photo shares, `near`, the answers per photo) are untouched in their mechanism. The app's side is: a right
typed answer that never counts holds the bar, the Elo, the levels and the units met back, and **no fish unit can pass
its mastery exam** (it asks at least 2 typed answers right, rule L9). Typed questions come once a unit's level rises,
so a run's first hundred questions are nearly clean and the effect grows with the run's length. A paired comparison
ran both arms through the same bias: a difference is hit only where the change itself moves typed questions or the
exam, or where the bias swamps the measure (the freezes).

| # | Date | What (decided) | Fish app-world figure | Era, length | Could the bug change it? | Matters |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 11-07 to 11-09 | Fish achievements' timing, rule L8: #694 (the first list), #734 (the 24 around the global score, Q259-Q264), #769 (8,000 answers); notebook "Fish achievements, simulated" and "around the global score", which `docs/LEARNING.md` cites | beginner and lecture RA, 2 seeds x 2,500 and x 8,000 answers: the spread to about 2,000 answers; "no run passed a fish mastery exam in 8,000 answers", so flearn1-30 and flearncore far goals | bias, long | **Yes, for every learned one**: the exam could not pass in the sim. The levels' timings (fq50, fq80, fpct) too, later than real | **High**: re-run (§3) |
| 2 | 11-23 | REE-56 design note's timing (#1498, open) | lecture RA and strong RA, 2 x 4,000: no family at Advanced for the lecture RA, no species met, "a floor, not a timing" | freezes, long | **Yes**: 84-92% of those runs sat in frozen loops (#1502) | **High**: re-run (§3) |
| 3 | 11-20 | Fish welcome values (#1344, [review](2026-11-20-fish-welcome-values-check.md); `docs/LEARNING.md` "The fish values"): keep the shared `CHOICE.opts`, the fish's cards off | 5 profiles x 3 answers x 10 seeds x 300 questions; first 20 answers' surprise, the level at 20, 40, 60 | bias, read in the first 80 answers | Little: typed questions were under 1% of the first 60 answers there. The "true knowledge at 100 and 300" line is the learner's own | Medium (it rests on the decision to keep the shared values): re-run (§3) |
| 4 | 11-22 | Find the X on the species (#1410, REE-63) | strong RA and expert, 5 seeds x 3,000 questions, main against the branch: "every guardrail held, every difference 0.0 exactly", "the measure cannot tell about the species" | freezes, long | **Yes**: identical arms to the last digit is what two frozen runs give; the "held" says nothing | Low: the change rests on Pierre's format (FISH_PATH, Q321) and already said "cannot tell"; not re-run (20 runs of 3,000 questions an arm do not fit the cap) |
| 5 | 11-18 | Scientific genera of circles 2 and 3 (#1067) | 3 seeds x 600, then the lecture RA at 20 seeds (true knowledge at 600 held) | bias, mid | Little: paired; true knowledge is the learner's | Low |
| 6 | 11-18 | The held-out set in the game (#1057, Q385) | 3 seeds x 600: units at Open Water at 300 breached for the strong RA (families), left unclear in the rated world | bias, mid | Possibly in size (units at Open Water are the app's), not in kind | Low: the primary is the rated world's |
| 7 | 11-17 | Variants on their unit's mastery (#953, Q391, Q392 a); levels and shares [study](2026-11-17-levels-and-shares-study.md) | 5 x 600: `phOther` down in 50 of 50 pairs; the casual diver's first family at Open Water about 12 answers later (declared) and the beginner's E at 300 (Q392 a) | bias, mid | No for the primary and the first Open Water (both before typed questions); E a little (both arms) | Low |
| 8 | 11-09 | Fish format offsets (#809): E breached on every profile, accepted | 5 x 300 with `--stats` (typed offset −0.42) | bias, short | E is the app's bar: lost typed rights hold it down in both arms; the breach was the bar rising towards the truth | Low |
| 9 | 11-19 | The fish's own statistics (#1148, Q413) and reference photos (#1045, Q421): E breaches accepted, merged with no further simulation | 5 x 300 (#1148: 15 seeds) | bias, short | As row 8; Pierre's answers rest on the direction (the bar closer to the truth), not on the size | Low |
| 10 | 11-08 to 11-23 | Draw changes judged on a draw measure at 300 questions: RARE cap (#729, Q252; 29% → 9%), photo memory prior (#790, #805), stuck shaky (#857), Find the X families (#885, level 3 on 40 seeds), no photo twice (#1093), live answers (#1234), names rows (#1301, page errors), REE-189 (#1376), REE-197 (#1391, 10 seeds) | 5 profiles x 5-20 seeds x 300; primaries `hard`, `near`, `perPhoto`, `know`, page errors | bias, short | No for the primaries (the learner's or the draw's); the guardrails on levels and plateaus a little, in both arms | Low |
| 11 | 11-06, 11-09 | Fish draw in big pools (#678, Q186): nothing moves; families before genera (#822, Q208 A): app-world guardrails held | 4 x 5 x 600; 5 x 600 | bias, mid | Little: paired, the primaries elsewhere (#822's in the rated world) | Low |

No decision record (`docs/decisions/`) and no answer in `docs/ANSWERS.md` rests on a fish app-world figure beyond rows 8
and 9 (Q413, Q421) [read]; `docs/LEARNING.md` carries rows 1 (through the notebook) and 3.

## 3. Re-runs on today's main

Every run below took a machine slot (rule W24) and its own 40-minute budget (rule L11), on `34a430b6` in a sparse
worktree (no `img` needed: learnsim aborts every request outside the app). Today's main differs from the runs it
re-checks by more than the fix (211 commits since #1344's base, the draw before Open Water among them: #1376, #1391),
so a moved figure is not all the bug's.

### 3.1 The fish welcome values (#1344), re-run in full

The review's command, unchanged: `--subject fish --seeds 10 --questions 300 --choice new|imr|know --fallback keep`, the
five fish profiles, then `tools/fallbackeval.js` (three runs, 442, 470 and 355 s) [sim]. Under the truthful answer
(mean ± sd over 10 seeds; 2026-11-20 in brackets):

| Profile | Answer | Surprise, first 20 | Level at 20 / 60 | In the band at 20 / 40 / 60 |
| --- | --- | --- | --- | --- |
| beginner | new | −0.01 ± 0.08 (−0.01) | 0.05 / 0.83 (0.05 / 1.13) | 7 / 4 / 1 of 10 (0 at 60) |
| casual diver | new | 0.06 ± 0.05 (0.06) | 0.64 / 1.39 (0.64 / 1.35) | 1 / 0 / 0 |
| lecture RA | imr | 0.10 ± 0.04 (0.11) | 1.49 / 1.94 (1.50 / 1.98) | 1 / 1 / 0 (1 / 1 / 0) |
| strong RA | know | 0.11 ± 0.02 (0.11) | 2.13 / 2.64 (2.14 / 2.64) | 10 / 10 / 10 |
| expert | know | 0.12 ± 0.02 (0.12) | 2.21 / 2.71 (2.21 / 2.69) | 10 / 10 / 10 |

The fallback matrix: wrong answers caught in the right direction 84 of 100 (85); cards to truthful answers 12 of 50
(12): 5 casual divers and 6 lecture RAs "higher" (5 and 7), and one strong RA "lower" at answer 60 (none then); a
beginner who claimed the course or more gets "lower" in 19 of 20 runs (19), the casual diver in 16 of 20 (14); the
strong RAs and experts who under-claimed get "higher" in 38 of 40 (40). True knowledge at 100 and 300 stays within 0.02
of the truthful answer's under every wrong answer. The midpoints the review proposed for refitted bands come out the
same: 1.67 (new | imr, casual diver 1.39 and lecture RA 1.94) and 2.29 (imr | know).

One figure moved: the beginner's level at answer 60, 0.83 ± 0.41 against 1.13 ± 0.32. Not the bug's [sim, §1]: the
beginner met no typed question in its first 300 in the old run. Likely the draw changes since [guess, not isolated].

### 3.2 The fish achievements' timing (rule L8) and REE-56's

**What did not fit.** Two runs at the original lengths were cut at their 40-minute budget with no run finished: REE-56's
design (`--ach --profiles lectureRA,strongRA --seeds 2 --questions 4000 --beyond yes --choice auto`, 4 workers) and the
notebook's L8 design with the strong RA added (beginner, lecture RA, strong RA x 2 seeds x 2,500, same options, 6
workers). learnsim's plan had estimated them at 6.2 and 3.8 minutes [sim] (#1502 saw it too). Now that the fish
answers really go in, a
fish job's time grows much faster than its length: in the run below, 4 jobs of 1,500 answers side by side on the
shared 4-core machine, the first ended after 1,018 s and the last after 1,642 s. So the 2,500-, 4,000- and 8,000-answer timings cannot be re-run here
within the cap, split or not (one job is one run), and the beginner's was not re-run.

**What ran**: the same options at 1,500 answers, lecture RA and strong RA x 2 seeds (1,642 s) [sim]. The answer at
which each achievement first entered the record, seed 1 / seed 2 (median); the notebook's run of 2026-11-08 (lecture RA,
2,500 and 8,000 answers, the bug's era) and REE-56's of 2026-11-23 (freezes) beside it:

| Achievement | lecture RA, today | lecture RA, 2026-11-08 (2,500 / 8,000) | lecture RA, REE-56 | strong RA, today | strong RA, REE-56 |
| --- | --- | --- | --- | --- | --- |
| fpct10, fmet5 | 11 / 16; 21 / 19 | 10 / 11; 21 / 21 | 14; 20 | 6 / 6; 19 / 21 | 6; 20 |
| fq50a Certified | 78 / 151 (115) | 91 / 157 | 115 | 90 / 58 (74) | 244 |
| fmetcore Roll call | 177 / 163 (170) | 250 / 293 | 170 | 139 / 151 (145) | 1,325 |
| fpct30 Reef crest | 256 / 302 (279) | 284 / 538 | 301 | 185 / 150 (168) | 2,122 |
| fq50b School's in | 457 / 405 (431) | 725 / 1,084 | 1,687 | 278 / 359 (319) | > 4,000 |
| fmetall Full logbook | 561 / 625 (593) | > 8,000 | > 4,000 | 436 / 396 (416) | not reached |
| fsci5 Latin lessons | 396 / 991 (694) | 1,308 / 977; 713 / 941 | – | > 1,500 | – |
| fpct40 Down the wall | 679 / 794 (737) | 1,235 / 1,255; 1,066 / 947 | – | 840 / 729 (785) | – |
| fq80a Night diver | 699 / 938 (819) | 2,075 / 2,025; 978 / 1,111 | not reached | 628 / 740 (684) | not reached |
| **flearn1 First briefing** | **740 / 1,141 (941)** | **> 8,000** | not reached | **376 / 654 (515)** | not reached |
| fq95a Dive guide | 1,005 / 1,354 (1,180) | > 2,500; 1,531 / 1,945 | – | 1,067 / 1,056 (1,062) | – |
| fq80b Deep diver | 1,249 / 1,419 (1,334) | > 2,500; 1,962 / 2,006 | – | 1,001 / 1,015 (1,008) | – |
| fpct50 and beyond, flearn10, flearn30, flearncore, fcoreadv, fc2, fc3adv, fgen20, fgen60, fsp1 and every species one | > 1,500 | the 8,000 table | not reached | > 1,500 | not reached |

At 1,500 answers [sim]: units Learned 5 and 3 (lecture RA), 9 and 9 (strong RA); families at Advanced 22.5 and 27
(means); scientific genera at Open Water 6 and 3; species at Open Water 0.5 and 2, none at Advanced; every family met
(65) in every run; right % since the previous row 93 and 96.

## 4. What holds and what changes

**Holds:**

- **The fish welcome values** (row 3): every reading of the 2026-11-20 review comes out the same, its three
  recommendations included (keep the shared values, keep the fish's cards off, refit the bands on real fish players).
  One figure moved and is not the bug's (§3.1).
- **The first achievements come within a few dozen answers** (rule L8): fmet5 about 20, fpct10 6 to 16, unchanged.
- **The paired draw checks at 300 to 600 questions** (rows 5 to 11): not re-run. Their primaries are the learner's or
  the draw's own measures; the bug touched a few questions there (§1: none to 11 by question 300) and both arms alike
  [guess]. Pierre's Q413 and Q421 rested on the direction of the bar's change, which a dropped right answer does not
  reverse.

**Changes** (simulation only; the app was never wrong):

- **The fish mastery exam passes in the simulation.** "No run passed a fish mastery exam in 8,000 answers" (notebook,
  #769) was the bug: the exam asks typed answers, and none right was ever recorded. Today flearn1 comes at about 515
  (strong RA) and 940 (lecture RA) answers, and 3 to 9 units are Learned by 1,500.
- **Every level achievement comes earlier**, most by hundreds of answers: fmetall from never to about 400-600, fq50b
  from 725-1,084 (and REE-56's 1,687) to about 320-430, fq80a from about 1,000-2,000 to about 680-820, fq80b and fq95a
  from about 1,500-2,000 to about 1,000-1,350. The spread rule L8 asks for still holds, now a new one every 50 to 250
  answers up to about 1,350 [sim, 2 profiles x 2 seeds]. Engine changes since 2026-11-08 move these too; the bug's
  part is not isolated.
- **REE-56's timing (#1498, §7) does not stand**: its lecture RA does reach families at Advanced (22.5 by 1,500) and
  both profiles meet species units by 1,500 (none at Advanced yet). "A floor, not a timing" was right about the floor;
  the hunts' distance past 1,500 answers is still unmeasured.
- **#1410's "every difference 0.0 exactly"** is two frozen arms, not a held guardrail; its "the measure cannot tell"
  stays.

**Not measured, so "the measure cannot tell"** (rule L11): every fish achievement past 1,500 answers (fpct50 and up,
flearn10, flearn30, flearncore, fcoreadv, fc2, fc3adv, fgen20, fgen60, the species ones), and the beginner's timing.
They need fish jobs longer than the 40-minute cap allows on this machine (§3.2).

**For Pierre**: no changed conclusion touches what players see or how the game behaves. The achievements are built and
approved (Q259-Q264), and nothing proposed here changes them; the welcome values hold. So no "Decision for Pierre"
issue is opened. Before an achievement's timing is next relied on (REE-56's hunts, REE-30's fpct100), it is re-run on
a fixed learnsim; the budget's estimate for fish runs and the length a fish job can reach within the cap are a tooling
fix of their own (rule W27: a check longer than L11's cap is a tooling bug to fix).
