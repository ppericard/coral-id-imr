# Learning model: research and choices

How the app decides what to ask, how hard, and when a genus counts as learned; and how the shared statistics rate the
photos. Each choice says where it comes from: published work, Pierre's decisions, or our own measurements (the
three-player simulation, `tests/profiles.smoke.js`). Keep this file in step with the code: a constant changed here is
changed there, with the reason.

Code: `model.js` (the player's own model, in the browser; `app.js` before 2026-11-02), `core.js` (shared helpers, also run by the admin), the sync
sheet script `tools/sync/Code.gs` (statistics pooled over every player, `stats_`). ARCHITECTURE.md describes the code;
this file explains why it works that way.

## What each number measures (read this first)

Pierre, 2026-11-12, after two agents read a player's success rate as their level: what each figure of the game and of
the answer log says, and what it never says. Any analysis of players (rule L12) starts from here.

- **Success rate** (right %, over any window): **not a level.** The engine holds it near its aim on purpose: each
  question's format and photo are chosen so its expected success hits the aim (the difficulty controller, "One
  difficulty controller" below), and the aim follows the global level, 85% up to a level of 0.5, 75% from 1.5
  (`core.js` `AIM`, `aimOf`; `TARGET_P` 0.8 the reference; "Beginners and experts"). A beginner and an expert both sit
  around 75-85%, the expert slightly **lower** by design. A success rate far from the aim says the questions are not
  as hard as the model thinks for this player right now (new units, a break, a look-alike family), never who is weak
  or strong.
- **Expected success** (`e` per answer, the answer log's Expected): the model's chance that this answer is right,
  from the genus ability, the photo's difficulty, the format and the mix-ups. **Right − expected** (the surprise,
  overall or over a window) is the figure that compares players and moments: below 0, the model is too optimistic.
- **The player's level**: the **global level** `P['~level'].th` (an Elo on the photo-difficulty scale, 0 = an average
  photo; shown as 1000 + 200 × th once `ELO_MIN` = 200 answers are in: "Ability per genus (Elo) and the global level").
  Simulated at 50 answers: a beginner about −0.9, an RA who knows 60% of the genera −0.2, 80% +0.8, an expert +1.2
  ("The first-launch question"). The sheet keeps its own chain `R` (the admin's level, the photo ratings' player term).
  Read a player's level from the global level **at that moment** (the log's answers replayed, as `tools/learnsim.js`
  and the full replay do), and from their **progress**, never from their success rate. **The Elo is not settled before
  many answers** (Pierre, 2026-11-12; "even 50 is not enough to settle the score", 2026-11-01): the game shows it only
  from `ELO_MIN` = 200 answers, and a level read earlier (or on a player back from a break, or right after many new
  units) is a rough guess: say how many answers it rests on, and lean on progress there. A rule keyed on the level
  (a threshold) must say what it does before the level is settled.
- **Ability per unit** (`P[genus].th`): the same Elo, per genus or family; a unit never answered starts from the
  global level (`playerStart`).
- **Progress**: per unit, the domain-score bar (the share of all its photos the player would name, one photo alone,
  from their own answers on it: "The domain-score bar"); the subject's % and score from the bars; units met and
  opened. With the global level, the only measure of how far a player has come.
- **Difficulty of a photo**: its rating in the sheet's photo Elo (`stats_`, pooled over every player), around its
  genus offset `gd` (**one genus difficulty**: "One genus difficulty"); a question's difficulty adds the photo memory,
  the mix-ups term and the format's offset (Q138). The success of one player on a photo says little about its
  difficulty alone: it depends on that player's level.
- **Shaky** (a unit holding new openings): its expected success on a typical photo of it is under `OPEN.P` (0.6),
  moved with the aim ("One opening rule"). It reads the ability and the genus offset, not the success rate. From 200
  answers (`OPEN.STUCK_FROM`), a unit still shaky after 10 of its own answers (`OPEN.STUCK`) stays shaky but holds no
  new opening ("A unit stuck shaky").

## The players we design for

Pierre, 2026-11-02: three typical paths, handled by one dynamic algorithm, **never by coded tracks, tiers or
exceptions**:

1. **A complete beginner** who finds the game and starts from nothing.
2. **An IMR Research Assistant (RA)**, who plays from the first day of their course: light, patchy knowledge after one
   lecture.
3. **An expert** who already knows the corals and wants to see how far they can go, up to the hardest levels.

We are closer to Duolingo (bring people who know nothing to knowledge, bringing items back until they are mastered)
than to an exam on people who already know (Pierre). A new player is a beginner, not an average player.

## Research we rely on

- **Elo rating in education** (Pelánek 2016, *Computers & Education*): a student's answer is a match between student
  and item; both ratings move after each answer, by K × (result − expected). An *uncertainty function* (K shrinking with
  the number of answers, e.g. a / (1 + b·n)) gives fast first estimates and stable later ones; different uncertainty
  for students and items is advised. "If the skill is expected to change quickly, K should stay large." Our photo and
  ability ratings are this model.
- **Prior vs current knowledge** (Papoušek, Pelánek & Stanislav, EDM 2014; Pelánek et al., UMUAI 2017): split into
  prior knowledge (item difficulty and global skill, from each student's first answer per item), current knowledge
  (repeated answers, learning, with asymmetric updates: PFA / "PFAE") and question choice. Designed for geography, where
  people already know some facts.
- **Glicko and Glicko-2** (Glickman 1999, 2012), used in education by Coursera (EDM 2019) and Park (EDM 2021): a rating
  carries its uncertainty (rating deviation); an uncertain rating moves its opponents little; **volatility** grows when
  results keep surprising, so the rating catches up with a real change. The deviation also grows with the time a player
  has not played (Glickman 1999: RD² + c² t): after a break the rating is less certain, not lower, and the first results
  settle it; the comeback's rust works the same way (expected, then settled by the answers; the rating never decays).
- **Duolingo**: *Birdbrain* (2020; IEEE Spectrum) estimates exercise difficulty and learner ability together, an Elo
  generalisation updated after every exercise, every answer counted. *Half-life regression* (Settles & Meeder, ACL 2016)
  fits each word's difficulty beside the learner's own counters with that word (times seen, right, wrong): repeats count,
  against what the learner is expected to remember.
- **Bayesian Knowledge Tracing** (Corbett & Anderson 1994): probability that a skill is known, with guess and slip.
  Used for the progress bar until 2026-11-02, replaced by a moving average (below).
- **Mastery criteria** (Pelánek & Řihák, UMAP 2017; *New Review of Hypermedia and Multimedia* 2018): which answers feed
  the mastery decision and where its threshold sits matter more than the learner model; an exponential moving average of
  the answers is a simple, good criterion. The progress bar since 2026-11-02.
- **FSRS** (Free Spaced Repetition Scheduler; Ye, Su & Cao, KDD 2022, and the open-spaced-repetition FSRS-4.5/5
  releases used by Anki): the power-law forgetting curve R = (1 + 19/81 · t / S)^−0.5 (R 0.9 at t = S), first-review
  stabilities 0.4 / 1.2 / 3.2 / 15.7 days (Again / Hard / Good / Easy), and stability growing at each successful review
  the more the item had been forgotten (spaced reviews count, massed ones hardly). The comeback's recall model.
- **SM-2** (Wozniak 1990, SuperMemo, the algorithm Anki started from): intervals multiplied by an ease factor, 2.5 by
  default, at each successful spaced review.
- **Warm-up decrement** (Adams 1961, *Psychological Bulletin* 58; Irion 1948): after a rest, performance dips at first
  and comes back within a few trials, apart from what was forgotten; why a comeback starts on the genera the player is
  surest of, with photos a little easier.
- **Urnings** (Hofman et al. 2020; Bolsinova et al. 2022): an Elo alternative with explicit standard errors, robust to
  adaptive item selection, used in Math Garden. **Keeping Elo alive** (Bolsinova et al. 2025): with adaptive selection,
  Elo ratings' variance inflates over time; two parallel chains help. Not adopted (see below), kept in mind.

## The player's own model (app)

SPEC-PLACEHOLDER

## Pooled statistics: photo difficulty and confusions (sheet v17-v18, 2026-11-02; photo memory v26, 2026-11-03)

Photo difficulty feeds every player's game (which photos, how hard), and confusions pick the traps. They must reflect
real learners, not bots, random clicks or test runs (17 anonymous "players" turned out to be `tools/perf.js` runs).

- **Who counts** (`trusted_`, `TRUST`): players, signed in or not (v18; v17 left out devices that never signed in),
  with at least 10 answers (per player; a photo counts from its first answer) and a right rate clearly above chance (one-sided z ≥
  1.645 against each question's guess rate), judged on the whole history at each recompute: a beginner who gets out of
  chance then counts with all their answers. Every answer still moves the player's own level.
- **How much an answer weighs** (`PHOTO_W.N`; the sheet also returns the plain count of the answers, v18, which the
  admin's filters use): n / (n + 10) after n answers of the player (n + 30 in v17) (Glicko's idea: an uncertain
  player moves the items little). A beginner's random first answers weigh little, their informed later ones more.
- **Repeats**: every answer counts, against the player's own history with the photo, as in Duolingo's half-life
  regression and PFA. v17-v25: a fixed rule (`PHOTO_W.NEW`, `KNOWN`), a photo new to the player expected 0.5 harder, one
  already right twice 1 easier (the rule the app's BKT used until 2026-11-02), for the photo's step only (the player's
  level ignored it). Since v26 the photo memory is estimated from the answers and used by the app too ("Photo memory",
  below). Counts grow by the weight too (they damp later steps and are the app's confidence in a rating).
- **Everyone starts as a beginner** (`PLAYER0` = −1, about 45% right on an average photo with 4 choices): starting at 0
  (average), a beginner's misses made the photos look harder.
- A corallites hint left closed is not logged with the answer (not seen when answering). Names are matched case-blind.

### Photo memory (sheet v26, 2026-11-03)

Pierre: in a genus with few photos in the game, the same photos come back, players learn the photos rather than the
genus, and that skews both the photo difficulty and the player's progress. The number of game photos differs a lot
from one genus to another (and changes as photos are added): the genera with few photos are where repeats come first.

Measured on about 550 real photo-quiz answers, against the app's logged expectation (Answers column I, which ignored
memory):

| Photo state | Answers | Right | Expected |
| --- | --- | --- | --- |
| never shown to the player | 463 | 83% | 76% |
| shown, never right | 20 | 85% | 72% |
| right once before | 64 | 95% | 76% |
| right twice or more | 9 | 100% | 77% |

22% of the questions of the genera with few photos showed a photo already seen, 6% for the genera with many.
Over a photo new to the player, memory adds about +0.4 logits once shown and +1.4 once answered right (the 9 answers
right twice or more cannot say how much more). The app's expectation ignored it; the sheet's photo rating used a fixed
rule (a photo new to the player 0.5 harder, one right twice 1 easier, nothing for right once), for the photo's step only.

**One rule, measured from the data, in the sheet, the admin and the app** (`core.js` `MEM`, `memBucket`, `memFam`,
`eloReplay`; `Code.gs` `stats_` in step, checked by `tests/core.test.js`):

- **Buckets** of the player's history with a photo, [shown, right] (the sheet's `H`, the app's `s.ps`): new, shown
  never right, right once, right twice or more. A question's offset is the mean over its photos seen when answering (a
  corallites hint left closed is not). Four buckets, not a smooth function of the right count: the data have 9 answers
  beyond right once.
- **New is the reference** (offset 0): a photo's rating is its difficulty for a player meeting it the first time,
  which is what the game targets and what the exam shows. Before, the level step ignored memory while the photo step
  used the fixed rule, so the two pulled the ratings apart; now both move against the same expectation.
- **Estimated in the replay itself**, on the trusted answers weighed by experience as for the photos (`trusted_`,
  `PHOTO_W.N`): after each answer, each offset its photos fall in moves by the surprise (right − expected) over the
  information gathered so far plus the prior's, a Newton step on the log-likelihood (as Glicko moves a rating by what it
  learns over how sure it already is). **Prior**: the old rule as offsets from a new photo, 0 / −0.5 / −0.5 / −1.5
  (`PHOTO_W` kept for that only), weighing `MEM.N` = 10 answers at the game's usual chance (80%, 4 choices). Answers on
  a remembered photo are 90% right or more, where each says little, so the 64 "right once" answers move that bucket
  about two thirds of the way to what they show (N 30: half way). Tried first: Newton passes over the whole log, the
  ratings refitted each time. On simulated logs they needed 10 to 25 passes to converge, the photo ratings absorbing part
  of the offset between passes; the estimate inside the replay matched them in one pass, with no iteration count.
- **Checked on simulated logs** (`tests/core.test.js`; 12 players, 240 photos): a true memory of 0 / −0.4 / −1.5 / −2
  comes out −0.73 / −1.38 / −1.83 from 3,000 answers, −0.36 / −1.43 / −1.82 from 20,000; no memory at all gives
  −0.30 / 0.00 / −0.27. Limit: the "shown never right" bucket picks up about −0.3 of the Elo's own catch-up after a
  miss (a miss leaves the photo rated a little too hard and the player too low, so the next answer on that photo beats
  the expectation), and right twice keeps some of the prior while it has few answers.
- **On the current data** (estimated offline from the table above, every answer of a bucket at its mean expectation,
  shifted so the "new" row fits): about 0 / −0.44 / −1.1 / −1.7 (without the prior: −0.39 / −1.41 / unbounded). The
  sheet computes the real values from every answer and serves them in `?stats=1` (`mem`, with `memn`, the trusted
  answers behind each bucket); the app uses them (`model.js` `PMEM`), the prior with an older sheet or offline.

**Per subject** (2026-11-08, the re-check of #664's F8; the integrator's call, a leak fix). The sheet fits `mem` on the
corals' answers only (`Code.gs` `stats_` reads the replayed subject's rows), yet until this change the app drew,
scored and recalculated fish answers with it too: on 2026-11-08 the corals' shown-never-right offset was +0.43, so a
fish photo shown and missed was taken as harder than a new one, where the prior says −0.5. Every use now reads
`model.js` `pmem()`: the sheet's offsets for the subject it rates (`SUBJECTS` `replay`: the corals, the very `PMEM`
array, so nothing changes for them), the prior (`core.js` `MEM.PRIOR`) for any other, until a per-subject `?stats=1`
rates fish photos (ROADMAP admin plan PR 11). Checked by `tests/fishmemory.test.js` (a fish draw, expectation and
recalculation run with a `PMEM` that throws on any read; the corals' read `PMEM` itself).

- **Learning outcomes** (rule L11 level 1: one subject, the offsets of the few answers on a photo already seen).
  `tools/learnsim.js --subject fish --stats` with the live `?stats=1` of 2026-11-08, the five fish profiles × 5 seeds ×
  300 questions, before (main 71b6b42) and after (3ca9f0c) on the same seeds, judged by `tools/learncmp.js`; declared
  before running: primary `know@300:up` (none expected: a leak fix, its guardrail the non-inferiority check). Look 1
  (25 pairs) left the answers to the first family at Open Water breached for the beginner (+39) and the casual diver
  (+22), each from one seed (61 → 261 and 62 → 170 answers; the other 8 pairs equal or better), and the families at Open
  Water unclear for three profiles, so, one step up, a second look declared before it ran: beginner, casual diver and
  lecture RA on seeds 6-15 (55 pairs in all, `--looks 2`: 95% bounds, the primary at 0.025). Paired difference after −
  before [bound on the side of harm], beginner / casual diver / lecture RA / strong RA / expert:

  | Guardrail | Margin | Difference [bound] | Verdict |
  | --- | --- | --- | --- |
  | True knowledge @300 (primary: no clear difference, p 0.036) | −0.02 | +0.003 [0.000] / −0.001 [−0.002] / +0.001 [0.000] / 0 [−0.001] / 0 [0] | held |
  | E = bar − D\* @300 | +0.03 | −0.024 [−0.005] / −0.001 [+0.016] / −0.001 [+0.004] / −0.001 [+0.002] / 0 [+0.001] | held |
  | Answers to the first family at Open Water | +19.5 / +12 / +10 / +10 / +10 | +10.5 [+37.5] / +9.1 [+22.0] / 0 / 0 / 0 | unclear for the beginner and the casual diver, else held |
  | Families at Open Water @300 | −2 | −0.6 [−1.8] / −0.2 [−1.1] / −0.1 [−0.8] / 0 [−0.7] / 0 | held |
  | Longest plateau of the shown score | +10 / +10 / +9 / +10 / +9 | +11 [+17] / +2 [+8] / +1 [+2] / −3 [+2] / 0 | **breached for the beginner** (50 → 61 answers), else held |
  | Share under ease 4 before Open Water @300 | +0.05 | −0.002 to +0.001, bounds ≤ +0.005 | held |
  | Families met @100, @300 | −2 | +0.3 to 0; 32 at 300 in every run | held |

  What it says: the beginner's bar runs a little lower (E −0.336 → −0.360), its longest flat stretch of the shown score
  about 11 answers longer and its first Open Water later on average: the corals' +0.43 for a photo shown and missed made
  a later right answer on it count as a hard question, the prior's −0.5 counts it as the easier question memory makes
  it (in this learner's world memory adds +0.4 there, and on the real log below such photos were 92% right against 74%
  expected with the corals' offset, 86% with the prior's). A cost the change brings, not declared before running, so
  it goes to Pierre (rule L11). **The corals, identical**: the same runs on `--subject coral` (4 profiles × 5 seeds,
  71b6b42 → 3ca9f0c; and before on e62256e) give the same 300 answers in every run (genus, answer, photos, choices,
  expectation, scoring record; only the answer id and the wall-clock time differ) and the same rows and summary
  (knowSlate 0.686 / 0.814 / 0.859 / 0.954, met 40).
- **On the real log** (rule L12, read-only, the Answers tab read 2026-11-08 20:57 Manila: 1,536 scored fish answers of
  9 players, 45 of them on a photo already seen, bucket from the logged `f`; the expectation recomputed with the
  prior's offset in place of the logged one):

  | Bucket | Answers | Right | Expected, coral offsets | Expected, prior | Log-loss coral → prior |
  | --- | --- | --- | --- | --- | --- |
  | shown, never right | 13 | 92% | 74% | 86% | 0.396 → 0.311 |
  | right once | 31 | 97% | 88% | 86% | 0.122 → 0.146 |
  | right twice or more | 1 | 100% | 94% | 95% | 0.062 → 0.052 |
  | all | 45 | 96% | 84% | 86% | 0.200 → 0.192 |

  Per player (6 with such answers) the mean log-loss difference is +0.002, sign-flip p 0.56: the log cannot tell the
  two apart yet, and both under-predict remembered photos. The fix rests on its reason (no coral number on a fish
  answer), not on the log. The fish answers logged before it keep their coral `f` in their scoring record, which the
  sheet's fish replay (#776) reads as logged.

**Decided by Pierre, 2026-11-09 (Q317)**, on #805's breached guardrail and a literature review
([reference/lit-photo-memory.md](reference/lit-photo-memory.md): every validated memory model has a lag term, Pelánek
2015's item effect about +1.5 logits a minute after a show and near 0 after a month): **keep #790's conservative prior
for fish**. Later, a memory model with two parts: a lasting value per outcome (today's buckets) plus a boost that
decays with the time since the photo was last shown, its decay shape fixed from the literature and one fitted weight.
Rule L1 gained the matching exception the same day (rule L1, "Second exception, photo memory"). Validation (rules L11,
L12) in the review's order, the read-only table first (lag band × bucket, observed against expected, players the unit);
ROADMAP "Photo memory that fades with time". **Step 1, 2026-11-15** ([the lag table](reviews/2026-11-15-photo-memory-lag-table.md),
declared before reading the log): the stop rule holds on both subjects (on the log to 2026-11-13, only one lag band
each holds 30 answers on a seen photo from 3 players or more: corals 1-7 days, half of their repeats; fish under 10
minutes, 58%), so no lag term is added and step 2 waits; proposed: the same table again at each subject's next
1,000-answer milestone.

**In the app** (`quiz.js` `answer`, `model.js` `famOf`, `pgMemW`):

- **The expectation** of a question includes the offset of its photos as the player knew them before answering: the
  ability step and the global level's, the logged `e` (Answers column I, which the sheet's opening hold replays), the
  opening hold itself and the comeback's CUSUM all use it. So a right answer on a known photo raises the ability less,
  and the hold does not count a remembered photo as proof of a good run.
- **A right answer counts in the progress only for what memory does not explain** (`pgMemW`, the mirror of `pgMissW`,
  a ratio of chances like it): its weight is multiplied by the chance the player had on the same photos new over the
  chance they had with their memory, at most 1: the share of such right answers that would have come without the
  memory. A right answer on a new photo keeps its full weight (the photo-difficulty factor on every right answer only
  slowed everyone, above). At the game's target (ability 1 above the photo, 4 choices), with the offsets above: × 0.93
  shown never right, × 0.87 right once, × 0.84 right twice or more; more off where the photo is hard for the player
  (memory lifts a low chance more). Tried first: the room for surprise left, (1 − chance with memory) / (1 − chance
  new), × 0.71 / 0.41 / 0.23. Simulated (below, 30 seeds), it over-corrected: the progress of a learner who remembers
  photos fell 0.1 below that of a learner who does not (memory had lifted it by only 0.03-0.04), and the genera learned
  by question 600 fell by half (expert 7.6 → 3.6, strong RA entering the exam 12.5 → 5.2). Memory adds most where the
  chance is middling, and the app's ability, which under-rates the simulated players, put the chance there, so that
  rule took off far more than memory had added.
- **Misses on a known photo** (thought through as asked): the miss weight is the chance the player really had over the
  chance the game aims for, at most 1 (`pgMissW`, Pierre 2026-11-02: a miss must not cost more than it proves); with
  memory the chance was higher, so a miss on a known photo weighs more than the same miss on a new photo, in full from
  the target down. That is what it proves: the player had been shown the answer on that very photo (after a miss, the
  feedback shows the genus; after a right answer, they had found it) and still missed, which says the genus is not
  held. Lighter (the memory failed, not the genus) was rejected: memory only makes the photo easier, it never makes a
  miss likelier. Heavier than in full was rejected too (the cap stays). In the Elo the miss is a bigger surprise, so the
  ability drops more; over many answers the extra drops balance the smaller rises after right answers on known photos,
  which is what keeps the ability unbiased. The genus wrongly given (rule L2) gets no memory term: the player's memory of
  a photo is of the genus shown, it says nothing about the other one.
- **Spread the repeats** (`photoSet`; per colony since 2026-11-06, Q190: every photo of a colony takes the bucket of
  its most remembered photo, "Photo exposure" below): in ordinary questions a photo already shown weighs × e^offset of its bucket
  (the odds memory adds to a right answer on it, divided out), × 0.64 / 0.33 / 0.18 with the offsets above (before: × 0.6
  from right twice only, nothing before). A soft factor in the existing targeting, never a filter: a genus whose photos
  are all known still shows them, the least remembered first. The photos never shown keep their bonus (× (1 + 1.5 ×
  recent success), × 1.3 for IMR and Pierre's photos, corals only: `SUBJECTS` `tiers`; never for fish since 2026-11-06). The targeting distance stays on the photo's difficulty when new:
  aiming at a known photo's lower effective difficulty would hand a struggling player the photos they remember, the
  opposite of the point. Measured in the genera with the fewest photos (2026-11-03; 3 colonies of each tried, 1000
  draws), every photo already shown and right twice but one colony's, shown never right: that colony comes up × 1.45 as often as when all
  are known alike (median; 1.1-2.5), × 1.1 with the old rule (0.9-2.0); a colony never shown × 2.4 (1.3-4.5) against
  × 1.7 (1.3-3.2). The floor of 3 colonies in rotation (`VARIETY`) keeps it from more; `tests/draw.smoke.js` checks
  × 1.25 or more. The exam keeps its own rule (never shown first).
- **Saved progress recalculated once, silently** (Pierre, 2026-11-03: the replay of the real answer log moved the
  bars down 1-3 points, and one player lost Advanced on 2 genera, accepted; no pop-up, no message, an exception to
  rule D6). The device holds no answer log for a signed-in player, only each genus's record,
  so the correction comes from it (`core.js` `memRecalc`): a uniform factor f on the right answers' weights multiplies
  the moving average's balance odds by f, so `pg` becomes f·pg / (f·pg + 1 − pg), f the mean memory weight (`pgMemW` at
  the game's target) of the genus's right answers, read from its photos [shown, right] (`s.ps`: of a photo's r right
  answers in n shows, r / n count as its first show, the rest as repeats in the bucket the photo has now). It never
  raises a bar and leaves a learned genus alone (its exam showed photos never seen). Once per genus record: `s.pm`
  marks it, even when nothing changed, and travels with `s.pg` between devices and accounts (`mergeProgress`,
  `mergeUsers`), so no record is corrected twice; it runs at load and after each pull of the synced progress
  (`model.js` `memRecalcAll`, `sync.js`), and `quiz.js` `answer` marks a record before its first answer under the new
  rule, so a record made since is never corrected. Saved and synced when it changed something; the sheet's leaderboard
  % follows at the player's next sync. Approximate (no order, misses on known photos not redone): on a made-up log
  with 55-60% repeats it took off about half of what the full replay does (72% → 70% where the replay gives 68%); with
  the real repeat rates (6-22%) the difference is about a point. `tools/memreplay.js` prints both, per genus, on the
  real log. Checked by `tests/core.test.js` (once, never raised, learned left alone, the mark through both merges) and
  `tests/draw.smoke.js` (applied once at load, saved, no pop-up, not again at the next answer). Since the sheet's full
  replay (below) reaches the devices, this is only the fallback for a device that never reached the sheet: a record
  adopted from the replay carries `s.pm` and is never corrected here.
- **Learned under the former model** (Pierre, 2026-11-03, doubting that one player's two learned genera really were):
  a genus learned on a record without `s.pg` passed its exam under BKT (before 2026-11-02). BKT's estimate reached 95%
  after about 4 right answers, so the exam came at once and mostly against easy choices. Replayed with today's rules
  (`tools/memreplay.js` on the sheet's log), the only two such genera on the sheet stand at 78% and 83%, under the
  exam's entry. `memRecalc` drops their `s.mx` (and any `s.ex`) at every call (load, pull, answer), so a copy pulled
  from another device loses it too; the genus keeps its bar from its record and takes the exam again under today's
  rules. An exam passed since (`s.pg` beside `s.mx`) is left alone. The sheet's Learned column and leaderboard %
  follow at the player's next sync. The sheet's full replay (below), adopted by the app, keeps a learned mark only on a record with `s.pg` (`core.js` `replayedOf`); the admin shows the replayed numbers and marks "↻ saved …" where the sheet's copy still counts it. **Silent since 2026-11-09** (Pierre, ~15:40 Manila, Q332: every recalculation silent, the learned-mark card too; `mxRecalc` no longer calls `mxLost`, and the learned-based achievements are kept, as for a mark lost in play). Until then the
  app saw the mark go (`model.js` `mxRecalc`, which wraps any recalculation and reports every genus whose `s.mx` it
  removed, to `mxLost`; a mark lost by misses in play never goes through it) and tells the player once, by an
  announcement card (`progress.js` `mxLostNotice`; Pierre, 2026-11-03: never held, rule D6): at start-up once
  the first page is drawn and the progress is in, and right after a pull or an answer that drops a mark, on whatever page
  is open, even in the floor of a visit or a comeback and with no prompt spacing; it only waits for another card or the
  tour already on screen: "You passed the mastery exam on *X* under the beta's first rules, which brought the exam too early.
  This genus is back on its progress bar, and its exam will come again. Until then, the badge earned with it is taken
  back." (plural forms for several genera or badges). Once per mark on a device (`reefid-mx-lost`, device only: a drop
  that happens through a pull on a second device is told there too). The achievements that rest on genera learned
  (`core.js` `ACH_LEARN`: Instructor 1/5/10/20, Coral master, Group complete) and that the progress no longer meets
  are taken back (`progress.js` `achRecheck`, `core.js` `achRevoke`), only then (everywhere else achievements are only
  added); each removal is dated in the record's `_gone`, so a copy earned before it (the sheet's, another device's)
  never comes back through a merge (`core.js` `mergeAch`); earned again, it carries a newer date and stays. The
  removals are saved and synced even when the device's record held none of them (`achMigrate` dropped them at
  start-up, or they were earned on another device; Codex review #399). Checked by
  `tests/core.test.js` and `tests/draw.smoke.js` (the card at start-up over Home, before any answer and in a new
  visit's floor, once; the mark and the badge gone, not brought back by the sheet's older copy, nothing again after a
  reload or answers; a drop at a pull shown at once, after a card already open; learned with `s.pg`: nothing).
- **What it does to the current players**: `node tools/memreplay.js answers.json [--player id] [--mem ...]` replays
  the admin's answer log (`readAnswers`, saved to a file) under the old rule and the new one: the offsets these answers
  give, how far the photo ratings move, and per player the bar of each genus, their overall % and their opening hold,
  old -> new (each question's difficulty recovered from the expectation and ability the app logged; approximations
  listed at the top of the tool).
- **Full replay** (Pierre, 2026-11-03: "why recalculate on the phones when the phone doesn't have the full log?
  Recalculate from all the results"; then: automatically, never by a human click, now and whenever the progress engine
  changes): **the reference** for a player's progress is the replay of their whole answer log, in time order, with
  today's rules (`core.js` `replayProgress`), **done by the sync sheet itself and pushed to the app**. Each answer is
  weighed as the app weighs it now (`pgRightW` with the app's look-alike test, `pgMemW` with the photo memory from the
  player's own history in the log and the sheet's offsets, `pgMissW`, `pgStep`), and the ability steps as the app's
  (`eloStep`, moved from `model.js` into `core.js` for this), as if every answer had been played under these rules. The
  weights and the step live in `core.js`, and `model.js` / `quiz.js` call the same functions, so a rule changed for the
  app is changed for the replay. Since rules version 6 both score through one function, `scoreAnswer`, and an answer
  logged with its scoring record is replayed from it ("One scorer" above). For a row logged before, each question's
  difficulty is recovered from what the app logged (`e`, `th`, the choices; since the photo memory, `MEM_LOGGED`, the
  logged `e` includes it and the replay takes it out again).
  **Typed answers** (`quiz|t`, `quiz|t|x` in the exam; "Typed questions" above) are replayed as the app scores them:
  no guess rate (`core.js` `kOf` gives k infinite, as `model.js` `TYPED.k`; `e` = sig(th − d)), a right one in full
  (`pgRightW`: every genus was a possible answer), no choices offered, "I don't know" a miss for the genus shown
  only; `tests/replay.test.js` replays a device's log of typed and picked answers, exam included, and finds the record
  the app scored live. The genus wrongly given is weighed, as in the app, by the chance the player had on it: its
  own ability as replayed so far, after the global level's step (`quiz.js` `answer` order); it gets a miss in its
  recent results and its run reset, and no Elo step (as the app since 2026-11-03, "The genus wrongly given in the
  Elo": the replay would otherwise put that penalty back on every player; `tests/replay.test.js` checks its ability
  does not move while its progress drops).
  Approximations for the rows logged before rules version 6, listed with the function: the abilities and photos are those the app logged (other rules would have
  drawn other photos; the weights use the logged ability, the replayed ability is the app's step over the recovered
  difficulties), a comeback answer's recall is taken as 1, the look-alike prior leaves out the IMR growth forms, the
  ability of the genus wrongly given is the replayed one (the app's own at that moment is not logged; the same as the
  app's when the replay goes on from the device's record), answers logged before sheet v5 (no `e`, `th`) count in the
  counts only. The mastery exam is not replayed: it comes from the device's copy (below), so an exam still waiting for
  its `TYPED.exam` typed right answers stays at 99% at most (`scoreOf`) until the device has passed it.
  - **Rules versions** (`core.js` `RVS`, `RV`): every change to a progress rule appends `{v, at, why, msg}` (AGENTS.md
    rule D5), each with the standard recalculation card (`msg: RV_CARD`, Pierre 2026-11-03, a
    standing rule; below). A version is not a frozen engine: the sheet always replays with the code's current rules
    (`core.js`, embedded in `Code.gs`), and a new version only makes every device take that replay again. So v1
    (2026-11-03, not deployed yet when these were added) replays with every rule merged before it goes live: the miss
    weighed against the success aimed for at the player's global level (`aimOf`, 85% to 75%), no Elo step on the genus
    wrongly given, a genus's ability moving with the global level (`levelMove`, `lt`; the level's step without a floor,
    4 decimals; Calibration step 2, #415), a learned mark kept unless a miss logged after its exam takes it away as the
    game does. v2 (2026-11-04): the opening pace and known mix-ups (#425): the mix-ups term in the question's difficulty
    for the ability, the global level and a miss's weight ("Known mix-ups" above). v3 (2026-11-04): the hierarchical
    photo Elo (sheet v31) puts the genus offset into the expectation the photo memory offsets (`mem`) are fitted
    against, and `replay_` replays with the sheet's `mem`, so the same log gives other bars (Codex P1 on #422;
    `tests/replay.test.js` "RVS v3": on a synthetic log with repeated photos the offsets go from 0.47 / −0.79 / −1.66
    to 0.41 / −0.77 / −1.60 and the replayed progress moves with them). A change to `stats_` that moves what the replay
    reads from it needs a rules version too. v4 (2026-11-04): answer time weighs right answers
    ("Response time": a right answer's genus and level steps times clamp(1 − 1.5 z, 0.5, 1.5); the sheet replays it from
    v32, which reads the Seconds column). v5 (2026-11-04): the first-launch question's prior. v6 (2026-11-06, sheet
    v61): one scorer, and the rows logged with their scoring record replayed from it ("One scorer"). v7 (2026-11-06,
    sheet v62): one surprise counted once ("One surprise, counted once"). v8 (2026-11-06, sheet v77): per-format
    offsets ("Per-format offsets"). v9 (2026-11-06, sheet v87): the domain-score bar ("The domain-score bar"), the genus
    offsets `gd` of `stats_` given to the replay for the rows logged without them; its card is the apology (the
    Notes key `card.rv8.ps`, named before the renumbering). v10 (2026-11-09, sheet v127; fish rules version 2): the
    log the only reference, no floor, no card ("The log, the only reference for progress" below). A device that skips several versions sees the standard card once, at the
    last of them, with its progress before and after the whole jump (`core.js` `rvMsgs`).
  - **The sheet replays, by itself** (`Code.gs` `replay_`, sheet v28): `core.js` is embedded in `Code.gs` (between
    `// BEGIN core.js` and `// END core.js`, kept identical by `tools/sync_core.py`, checked in CI; its own `module`
    object keeps its names out of the script's globals, reached as `CORE_`), so the self-updater installs the engine
    with the script. In the reply to a sign-in, a load or a save whose app applied an older version than `RV` (the
    request's `rv`), it replays the player's rows of the Answers tab since their last progress reset, with the photo
    memory offsets and pooled confusions of `stats_` (cached) and the look-alikes and families of `data.json` (fetched
    from GitHub, cached 6 hours). A device that never signed in gets the same in the reply to its anonymous answers,
    under its anonymous id, since the progress reset its request carries (`reset`, its `reefid-sync-coral-reset`; Codex review
    #399). The result is kept in the **Replayed** tab (one row per player: Name, Rules, Rows, Since,
    Updated, Record JSON in 45,000-character chunks), reused while the rules version, the number of the player's rows
    and the reset are unchanged, replayed again otherwise. The player's own saved copy (Progress data, RAs Data) is never
    rewritten there (no race with a device's save). The reply carries `replay: {rv, n, rec, ids}`; `ids` are the
    replayed rows' answer ids from the time of the oldest answer the device still queues (the request's `pt`; at least
    the last 500), so a lost reply that left up to 2,000 answers already logged in its queue never counts them twice
    (Codex review #399).
  - **The app adopts it** (`sync.js` `replayAdopt`), once per version (sheet v28): when a reply carries a replay newer
    than the one
    this device applied (`reefid-sync-coral-rv`, in the progress data: a device that signs in to the account takes it with
    the account, whose progress is the adopted one, and 0 when the account's data has none, never the version of an
    anonymous replay adopted on the device (Codex review #399); a device already signed in keeps its own and adopts the replay
    itself once, with its own unsent answers on top), the progress becomes the replayed record, with this device's answers the sheet has not counted
    yet (the unsent log or the anonymous queue, minus the ids the sheet replayed and the answers before a reset)
    replayed on top by the same engine; then saved and sent. A replay whose request went out before a progress reset
    made on the device while it was on its way is not adopted (it still counts the answers the reset discarded): the
    next reply brings it again from the new reset (Codex review #399). Two devices on one account: the merge baseline
    (`SYNC.base`, `mergeSaved`) becomes the shared history and nothing else (`core.js` `replayBase`): the sheet's replay
    itself (`rec`, as the app holds it), never mixed with this device's counts; this device's answers the sheet has not
    counted yet stay the difference between its progress and the baseline, so the next three-way merge puts them on top
    of whatever another device saved (Codex review #399, the third case on the baseline: 2 logged answers and 1 unsent
    gave a baseline of 3, and the next merge with another device's replay of the 2 lost the third). Per genus kept from
    the device (the log has fewer answers on it), the baseline stays the shared copy's record; the photos shown take,
    per photo, the larger of the replay's and the shared copy's (exposure the log leaves out that was already synced),
    never this device's own. When another device saves its own adoption of the same log, this one adds only its own new
    answers to it, never the replayed ones a second time. A copy that may lack answers in the log makes the device ask
    for the replay again (its rules version back to 0; the next save brings it): a reset made on this device that the
    sheet's copy does not have yet (other devices, an older app among them, may have answered after the reset time), a
    reset from another device while this one has answers after it not sent yet, a copy with that reset under older
    rules than this device applied. `tests/adopt.test.js` plays two devices, refused saves, unsent answers, an older
    app and a reset in flight at random (40 runs; 600 more with other seeds while building it) and checks that every
    device and the saved copy end with exactly the answers in the log since the reset. A saved copy under older rules than the device applied (its `reefid-sync-coral-rv`) is not
    merged (it may predate the replay, whose counts it would undo), but it may hold answers saved since by a device on
    an app from before the replay, which never adopts one: so the device's applied version goes back to the copy's and
    its next save (asked for at once after a pull) brings the replay of the whole log again, every device's answers
    counted once (Codex review #399: 2 answers adopted, 1 saved by an older app, gave 2 again). A copy under newer
    rules than the device applied (another device adopted them) is merged, but a learned mark it lacks is not taken
    away by the merge: the device's own adoption of the same replay decides it, with this device's card (Codex review
    #399: the merge took the mark first, so no card here). A replay is adopted only if every answer the device still
    queues is newer than the replay's last one: answers played offline before answers another device logged since
    would count after them, out of time order (Codex review #399: 20 right answers then 10 misses gave pg 0.96 and ten
    right answers last, instead of 0.19 and ten misses); the device then adopts nothing and marks no version applied,
    and the save that logs them brings the replay of the whole log in time order. Likewise for answers played before
    signing in to an existing account (queued, or sent under the anonymous id): the sign-in leaves the account's rules
    version unapplied and nothing is adopted until the first save has moved them into the account's log; its reply
    brings the replay of the whole of it (Codex review #399: 20 right answers played before an account's 10 misses kept
    pg 0.9 and ten right answers last). Answers the sheet logged from a refused save (logged, their progress not saved:
    `SYNC.lg`) are missing from the device's merge baseline, so a copy another device saved from its replay of the log
    may already count them, and the merge would add them again as the device's own (Codex review #399: 3 answers, a
    baseline of 2, a saved replay of the 3: 4, kept for good): until a save succeeds, the device's requests ask for the
    replay (rv 0) and a replay of the same version is adopted in place of the merge. An admin merge of two accounts
    (`core.js` `mergeUsers`, `Code.gs` `users_`) saves the merged copy with no rules version: it is no replay of the two
    logs together, so every device of the account asks for the replay of both histories in time order (Codex review
    #399: 20 older right answers and 10 newer misses kept the merged model, pg 0.79-0.96, for 0.20). Except the copy this
    device saved or loaded last, unchanged since (the sheet's revision, which every save bumps, an older app's
    included, is still the one this device holds, `sync.js` `mergeSaved` `mine`): it is already part of the device's
    progress, so it is not merged, whatever its rules version. A save carries the rules version applied when it was
    sent, so a replay adopted from a save's reply leaves the copy one version behind with nothing the replay lacks;
    asking for the replay again then looped, at every sync, the save of version 0, its reply's replay, the same copy at
    the next load (Codex review #399: four saves in a row, the saved version 0 throughout, a full replay in every save's
    reply); and merged against the baseline the replay set, a copy behind the log read as answers taken away. A replay
    adopted from a save's reply is followed at once by one more save (`syncOnce`), which brings the adopted version to
    the copy: otherwise the other device took that copy for an older app's, asked for the replay again and left its
    own copy so, each in turn. The random test also checks that, after the devices have synced, the saved copy and
    every device are at the rules version and no reply carries a replay any more, saves and loads in any order. A reply to anonymous
    answers is ignored once the device has signed in, or changed anonymous id, while it was on its way (Codex review
    #399: it replaced the account's progress that sign-in had just stored).
    What is taken from where (`core.js` `replayedOf`): **from
    the replay**, per genus the log has answers on: `pg`, `ok`, `ko`, `h`, `off`, `conf`, `th`, `lt`, `vr`, `streak`,
    `at` (the later), `du` (either side's), the photos seen `ps` per photo the larger [shown, right] of the replay and
    the device (the device also counts as shown a corallites hint revealed after the answer, which the log leaves out:
    it must not become new again for the mastery exam, `model.js` `examSet`; Codex review #399), plus `pm` 1 (under the photo memory rule: `memRecalc` never corrects it) and
    `rv` (so `mergeProgress` keeps it over an older copy of the same answers); the global level `~level`: `th`, `vr`,
    the larger answer count, the later `at`. **From the device**, what the log cannot give: the mastery exam passed
    (`mx`) or in course (`ex`; dropped when passed under the former model, a record without `s.pg`: that genus takes the
    exam again), the passed exam also dropped when the log has a miss after it that leaves the replayed progress below
    the keep rule, the game's own (`core.js` `mxKeeps`, `model.js` `mxKept`: the replay records `lm`, the time of the
    last such miss, and a mark passed before it goes, reason `rules`; Codex review #399: 10 misses logged by a save
    refused after a passed exam left the genus at 100%, its exam never coming back, at a bar of 0.19), so a
    recalculation alone keeps it; the exam in course likewise ends at any miss on the genus, shown or given, logged
    after it began (`lx`, the time of the last miss, against `s.ex.ts`, or the genus's last answer `s.at` for an exam
    saved before it had a start time), as the game ends it (Codex review #399: a miss over 4 questions passed kept
    them), the days answered right (`dd`, `dl`: the device's calendar days, for the comeback), the last
    observations shown (`ro`: the log keeps photo files, not observations), right with the corallites in view (`cor`:
    the log does not say which view a photo was in); but no longer the record of a genus the log has fewer answers
    on than the device (rule D9, rules version 10, "The log, the only reference for progress" below): the replay's record and counts win, also when the device holds more answers, and a genus the log has no answer on loses the answers the device counts on it. The opening hold is not in the
    record: the sheet already replays it from the same log (`hold_`, "Held while the player falls behind"). The
    adoption runs through `model.js` `mxRecalc`: since 2026-11-09 a learned mark it takes away is not told (Pierre,
    ~15:40 Manila, Q332: every recalculation silent), and from rules version 10 no version has a card (Q330, rule D5);
    before, the mark was told with the card above (reason `bkt`, or `rules` for a later rules version), and at once
    came the announcement card of every version skipped that has a `msg`
    (`progress.js` `rvNotice`, an update card of `app.js` `cardShow` with the progress ring before and after: once per
    version per device, `reefid-rv-msg`; never held, one after another, after
    `recalcNotice` and `mxLostNotice`; only to a device that had answers). Every version has the standard card
    (`core.js` `RV_CARD`; Pierre, 2026-11-03, a standing rule: "only to the players whose progress the replay moves a
    lot; if it moves everyone a lot, everyone gets it"): "Your progress was recalculated with the improved model",
    saying the % before and after, shown only when the adoption moved the player's progress % by 5 points or more,
    either way (`msg.only: 'changed'`, `msg.min: 5`, `progress.js` `rvNoticeAdd`); a player whose % moved less sees
    nothing. Pierre is asked only when a version needs a different text.
  - **The device's own recalculations** (`memRecalc` from `s.ps`, `pgOf` from the last 10 results `s.h`) only
    approximate it from what a device keeps: they stay as the fallback for a device that never reached the sheet (a
    device offline, or a local copy), and a record adopted from the replay is never corrected by them.
  - **The admin** shows the same replay, computed in the browser once per data load (about 10 ms for the demo's 1200
    answers): Players (Progress, Learned, the player's bar) and Journey (Progress, Learned, each genus's bar, the
    learned genera), and "↻ saved 44%" beside one when the sheet's saved copy says otherwise (a player who has not
    opened the app since a recalculation, or whose last answers are not saved yet).
  - Checked by `tests/replay.test.js` (the weights, the ability and level steps against the app's order, a replay
    going on from another, what `replayedOf` takes from where, the merge), `tests/sync.test.js` (the embedded engine is
    `core.js`; a player replayed once and stored; replayed again on a new rules version and on new rows; the reset;
    anonymous devices; the saved copy untouched) and `tests/pages.smoke.js` (a stale device adopts the replay with its
    own unsent answer on top, sends it, does not adopt it twice; a version with a `msg` shows its card once at load,
    one without shows nothing). `tools/memreplay.js` prints the same replay under the old rule and the new one.

**Simulated** (`tools/learnsim.js`, its learner given a photo memory of 0 / +0.4 / +1.5 / +2 logits, "Learning-outcome
simulation" below; 30 seeds × 600 questions, the four usual profiles, the photo stats of 2026-11-03 with the offsets
above as a v26 sheet would serve them, the same seeds in every column). "Without memory" is the learner of before (`--mem
0`): what the app should read when memory explains nothing. Each cell: genera with few photos / with many (the tool's `LEARNER.FEW` and `MANY` thresholds).

Progress bar minus true knowledge, genera met, at question 600 (below 0: the bar under-claims, as it always has):

| Profile | learner without memory, app before | with memory, before | with memory, after | without memory, after |
| --- | --- | --- | --- | --- |
| beginner | −0.25 / −0.23 | −0.22 / −0.19 | −0.27 / −0.24 | −0.30 / −0.24 |
| lecture RA | −0.22 / −0.18 | −0.18 / −0.15 | −0.22 / −0.17 | −0.25 / −0.20 |
| strong RA | −0.13 / −0.12 | −0.10 / −0.09 | −0.14 / −0.11 | −0.15 / −0.13 |
| expert | −0.06 / −0.04 | −0.05 / −0.04 | −0.05 / −0.03 | −0.06 / −0.04 |

Elo ability minus logit(true knowledge), genera met, at question 600 (the Elo under-rates every simulated player,
"Learning-outcome simulation"):

| Profile | without memory, before | with memory, before | with memory, after | without memory, after |
| --- | --- | --- | --- | --- |
| beginner | −1.72 / −1.97 | −1.53 / −1.72 | −1.83 / −2.08 | −2.11 / −2.13 |
| lecture RA | −1.78 / −1.94 | −1.66 / −1.75 | −1.83 / −1.93 | −2.03 / −2.07 |
| strong RA | −1.95 / −2.16 | −1.79 / −2.01 | −2.05 / −2.21 | −2.13 / −2.28 |
| expert | −1.39 / −1.49 | −1.34 / −1.42 | −1.46 / −1.45 | −1.51 / −1.51 |

Questions showing a photo already shown to the player, by question 600 (the right % on those):

| Profile | without memory, before | with memory, before | with memory, after |
| --- | --- | --- | --- |
| beginner | 45 / 40% (92 / 93%) | 42 / 38% (97 / 97%) | 42 / 35% (97 / 97%) |
| lecture RA | 40 / 34% (92 / 95%) | 40 / 33% (97 / 97%) | 36 / 29% (97 / 98%) |
| strong RA | 36 / 26% (95 / 96%) | 35 / 25% (97 / 98%) | 31 / 21% (98 / 98%) |
| expert | 30 / 19% (98 / 97%) | 31 / 18% (100 / 99%) | 27 / 14% (99 / 99%) |

Mastery exam by question 600, per run: genera that entered it, and learned; in brackets their true success then on the
hard reference question (a photo never seen):

| Profile | without memory, before | with memory, before | with memory, after |
| --- | --- | --- | --- |
| beginner, entered / learned | 0.7 / 0.7, 0.0 / 0.1 (0.97) | 0.9 / 0.9, 0.1 / 0.1 (0.89 / 0.83) | 0.6 / 0.7, 0.0 / 0.1 (0.92) |
| lecture RA | 1.0 / 1.4, 0.1 / 0.1 (0.92 / 0.90) | 1.8 / 1.3, 0.2 / 0.2 (0.92 / 0.93) | 0.9 / 1.2, 0.1 / 0.1 (0.93) |
| strong RA | 3.6 / 3.1, 0.3 / 0.5 (0.97) | 4.4 / 3.8, 0.6 / 0.8 (0.95 / 0.97) | 3.0 / 3.4, 0.2 / 0.5 (0.95 / 0.97) |
| expert | 8.5 / 5.9, 2.0 / 2.0 (0.94) | 8.9 / 6.4, 2.5 / 2.4 (0.94) | 8.1 / 6.3, 2.3 / 1.9 (0.94) |

Over the slate, with memory, before → after (mean over the 30 seeds; the learner without memory on the old app in
brackets):

| Profile, question | genera met | learned | progress | true knowledge | right % | entered the exam | true ref. success at entry / learned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner 300 | 35.4 → 29.9 (32.0) | 0 → 0 | 35 → 31% (32) | 0.60 → 0.55 (0.57) | 85 → 87 | 0.2 → 0.0 | - |
| beginner 600 | 40 → 39.8 (40) | 0.2 → 0.2 (0.1) | 65 → 60% (61) | 0.86 → 0.84 (0.85) | 88 → 89 | 2.7 → 2.1 (2.2) | 0.85 → 0.85 / 0.87 → 0.92 |
| lecture RA 300 | 39.2 → 38.3 (39.2) | 0 → 0 | 43 → 41% (42) | 0.74 → 0.73 (0.74) | 85 → 86 | 0.4 → 0.2 | 0.85 → 0.86 / - |
| lecture RA 600 | 40 → 40 | 0.6 → 0.2 (0.3) | 73 → 70% (70) | 0.90 → 0.90 | 91 → 90 | 5.2 → 3.6 (3.9) | 0.87 → 0.88 / 0.92 → 0.93 |
| strong RA 300 | 40 → 40 | 0 → 0 | 54 → 53% (53) | 0.85 → 0.85 | 87 → 88 | 1.0 → 0.6 (1.0) | 0.92 → 0.93 / - |
| strong RA 600 | 40 → 40 | 1.8 → 1.2 (1.3) | 84 → 81% (82) | 0.94 → 0.94 | 94 → 93 | 12.5 → 9.9 (10.2) | 0.92 → 0.93 / 0.96 → 0.97 |
| expert 300 | 40 → 40 | 0.4 → 0.3 (0.5) | 65 → 65% (65) | 0.95 → 0.95 | 96 → 96 | 3.0 → 3.0 (3.3) | 0.92 → 0.92 / 0.93 → 0.93 |
| expert 600 | 40 → 40 | 7.6 → 6.3 (6.3) | 93 → 92% (92) | 0.97 → 0.97 | 98 → 98 | 24.2 → 23.1 (22.4) | 0.92 → 0.92 / 0.94 → 0.94 |

What it says, on this learner:

- **Memory inflated the app's reading before**: the progress by +0.03 to +0.04 over the genera met (expert +0.01),
  the ability by +0.05 to +0.25 logits, and the exam came sooner (strong RA 12.5 genera entered by question 600 against
  10.2 without memory, expert 7.6 learned against 6.3, lecture RA 5.2 / 0.6 against 3.9 / 0.3); a beginner opened
  genera faster (35 met by question 300 against 32), the inflated ability making fewer genera look shaky.
- **After, the progress and the exam match the learner without memory** (within 0.01-0.02 on the bar; exam entries,
  learned genera, overall progress within the spread): memory no longer counts as knowledge, and no one is slowed
  beyond that. The ability goes a little past it, up to 0.11 logits below the reference at question 600 (0.16 for
  the beginner at 300; the Elo step takes the full
  offset; the simulated players' abilities sit far below their truth, where memory seems to add more than it does),
  which also slows the beginner's opening a little (29.9 genera met by question 300 against 32.0).
- **The exam was never fooled**: the true success when learned is the same in every column (0.92-0.97, expert 0.94),
  because the exam shows photos never seen. What memory moved was when genera reached it.
- **Few against many photos**: in this simulation memory inflated the two groups about alike, because its own draws
  repeat photos almost as often in the genera with many photos (38% against 42% for the beginner) as in those with
  few, against 6% and 22% in the real answers (players have answered far fewer questions per genus than 600
  simulated questions over 40 genera). Spreading the repeats lowers them by 3 to 4 points in genera with many photos,
  0 to 4 in those with few (fewer new photos to show there; `tests/draw.smoke.js` checks the effect on one genus).
- **Cost for a player with no memory at all** (last column): the app still takes the measured memory off, so such a
  player's bar sits 0.01-0.05 lower and a beginner meets 27.7 genera by question 300 (32.0); real players do remember,
  which the offsets are measured from.
- **Soundness** (`tests/profiles.smoke.js`, 6 seeds each side): no genus at 95% before being asked beside a
  look-alike, every check passing; beginner genera met at question 100 11.5 → 11.3, expert genera half way at 300
  34.7 → 35.3, lecture RA progress at 300 27.8 → 25.5%. The CI seed's beginner went from 16 genera at question 100 (the
  limit) to 17, so the limit is 17 (one draw, not a faster opening: 30 learnsim seeds give 16.5 → 15.7).

### The sea slugs' own pooled statistics (2026-11-17, sheet v167)

Pierre, 2026-11-17: "Tu peux compléter tout ce qui manque pour les nudibranches?". Until then the sea slugs had no game
photo pool on the sheet (`core.js` `SUBJECTS` `pool`), so the sheet pooled nothing of their answers and the app read the
corals' statistics for them, which hold no sea slug photo or genus: every sea slug photo drew on its judged-ease prior,
every genus offset was 0 and every pair kept its prior, so a **data look-alike** seeded from iNaturalist's
identifications (`model.js` `dataSeed`, Q390 D: a genus pair across families no specialist source names) could never be
dropped by the players' answers.

- **Built**: the sea slugs get a pool (`seaslug.json`, `seaslug-game.json`, their part of `curation.json`; their genera the
  units) and so their own fold on the sheet, by the same rules as the corals' and the fish's (`Code.gs` `stats_`,
  `statsFold_`: trusted players only, the hierarchical photo Elo with a genus offset per genus, the pair counts `conf`,
  photos checked against their pool); `?stats=1&s=seaslug` serves them, the reply naming its subject. The app reads them
  (`SUBJECTS` `stats`, `sync.js` `loadOwnStats`, `model.js` `statsJoin`): `photoDiff` takes their photo ratings and genus
  offsets, `pooledConf` (the traps, the progress's look-alike weight, `confTerm`) and `isDataLook` their pair counts, so a
  seeded pair offered together often and seldom mixed up falls under `CONF.TRAP` and stops being a look-alike, as any
  data look-alike (`CONF`, `confScore`). The photo memory and the format offsets stay the prior and none for them (`pmem`,
  `pfmt`), as the sheet's replay of a subject other than the corals reads no pooled statistics: no change to how a sea
  slug answer is replayed.
- **Checks (rule L11, level 1: one subject, one input; the sea slugs have almost no answers yet)**: unit tests on the
  in-memory sheet and the app's code (`tests/seaslugstats.test.js`: the pool is the game's genera; `?stats=1&s=seaslug`
  rates their photos and counts their pairs, the corals' and the fish's replies the same with or without sea slug answers;
  the app keeps a reply naming the sea slugs only, from the script that serves them; a seeded pair offered together 30
  times and never mixed up is no longer a look-alike, the corals' numbers untouched), the sea slug smoke and the admin
  smoke's Analyses part. No learning simulation: with no sea slug answers the pooled numbers are their priors, so the draw
  is the one of before until answers come (Pierre, 2026-11-17, against a simulation of a subject with no data). To watch
  once they come: the seeded pairs that drop (`dataLooks`), the genus offsets against the judged ease.
- **The fish** keep their statistics on the sheet only (no `SUBJECTS` `stats`): reading them in the app is the admin
  plan's PR 11 (ROADMAP), a change of their draw to check on their log (rule L12).

### Photo exposure (2026-11-06, Q187-Q190; fish too)

Pierre's answers to the photo exposure study (docs/reviews/2026-11-06-photo-exposure-study.md, PR #670: 19% of the coral
questions showed a photo the player had already been shown, 38% from a genus's 11th question; the multi-view questions
turned round the few colonies with every view), 2026-11-06 15:35; and at 15:36, "we must not end up with the same problem
for the fish": every change works for every subject, the observation being the fish's colony.

- **Q187, the Colony cap** (`admin.js` `CELL_MAX`): 20 → 40 colonies per genus in the Colony view (the Auto pass fills a
  view up to it). Corals only: fish have no cap.
- **Q188, the exploration share** (`model.js` `CAL.RATE`, `photoSet`): the calibration questions become 30% of the
  questions on a unit the player holds (20% before), and each draws among the colonies (fish: observations) the player
  has never seen, while one remains, on the difficulty targeting and the calibration bonus as before: at the difficulty
  aimed for, the least answered first, never a random hard one. Pierre asked for it only after simulation, deciding
  nothing the simulation contradicts. The study had proposed it on any genus met with about 5 answers: simulated, that
  variant cut the repeats less (colony repeats 15.4% → 17.5% for the beginner, item learner), took 0.005 off the true
  knowledge at question 300 in the exemplar world (−0.008 / −0.002) and met 3.8 fewer fish units in 300 questions (5 of 5
  seeds), so the unit held stays the condition.
- **Q189, beginners' zooms** (`photoSet` `cov`): a colony's weight in a beginner's multi-view question is its share of
  the views, cov, not cov²: a colony with two views of three weighs 0.67 of a complete one (0.44 before). Corals only by
  design: a fish question has one view, so cov is the same for every observation and changes nothing.
- **Q190, a colony counts as seen whatever view was shown** (`model.js` `colonyMem`): in the draw, every photo of a
  colony takes the memory of its most remembered photo (`memBucket`, then the most shown), so a close-up never shown of a
  colony already met is no new photo and loses the never-seen bonus. Fish: an observation's other photos of the same fish.
  The expectation of an answer and the progress still read each photo's own record (`famOf`, `pgMemW`); the mastery
  exam keeps its own rule (a photo never shown).

**Simulated** (rule L11 tier 1: `tools/learnsim.js` `--stats` (the sheet's ratings of 2026-11-06 15:39) `--truth gen`,
the four profiles × 5 seeds × 600 questions, 1 worker, `main` against the four changes on the same seeds, item and
exemplar learners; the run logs each question's colony and photos, `expo`, and each genus's game photos, `pool`).
Declared before the second run: primary, the colony repeat rate over questions 1-600 (a question showing a colony shown
before), pooled, down; guardrails, true knowledge over the slate at 300 and 600 (margin 0.02) and genera met at 100
and 300 (margin 2), the stats study's margins; the judge's E and D\* and the time to credit reported with their bounds.

| Measure (pooled over the profiles) | Item learner | Exemplar learner |
| --- | --- | --- |
| **Colony repeats, questions 1-600** (primary) | 20.2% → 14.5% (p < 0.001; 20 of 20 runs down) | 19.7% → 13.5% (p < 0.001; 20 of 20) |
| Photo repeats, 1-600 | 16.4% → 12.7% | 15.1% → 11.2% |
| Colony repeats from a genus's 11th question | 37.5% → 28.5% | 38.2% → 28.2% |
| Photo repeats from a genus's 11th question | 30.3% → 24.0% | 29.6% → 22.6% |
| Spread (questions showing a colony never seen while one remained) | 80.2% → 86.3% | 81.0% → 87.1% |
| True knowledge, slate, 300 / 600 | +0.005 (bound +0.002) / +0.000 (−0.001) | −0.002 (−0.005) / −0.000 (−0.002) |
| Genera met, 100 / 300 | −0.05 (−0.39) / +0.15 (−0.05) | +0.15 (−0.29) / 0 |
| Judge: D\* over the genera met at 600 | −0.001 (−0.003) | −0.002 (−0.003) |
| Judge: E = bar − D\* at 600 | −0.142 → −0.139 | −0.162 → −0.159 |
| Genera with the bar at 80% by 600 | 14.8 → 14.7 (−1.2) | 16.9 → 16.5 (−1.6) |
| Time to credit, the known genera's mean bar at 50% | +1.9 questions (+9.4) | −2.6 (+4.9) |

(In brackets, the one-sided 90% bound of the paired difference on the side of harm.) Every guardrail held. By profile,
the colony repeats fell in 5 of 5 seeds for each profile in both worlds (5 seeds cannot give a per-profile p under
0.06). Exploratory: the median questions from a genus's first answer to its bar at 80% moved +16 (item) and −13
(exemplar), opposite ways, a median over the genera that got there. Pooled over the 20 runs as one cohort, the photos
never shown after 115 questions each (about the 2,300 answers of the study): 40% → 42% of the photos, 38% → 39% of the
colonies (a question shows fewer photos when it picks a two-view colony); after 600 each, 2%. As the study said, the
photos never shown follow the traffic; what the draw changes is how each player's questions use the room they have.

**Fish** (no learnsim fish mode on `main` yet, #678 adds one; a scratch harness played the real fish quiz with an item
learner, a beginner learning 0.12 of the gap per answer, 300 questions, the units met by the path). With the judged
candidates of #674 (8,561 photos) and the draw calibration of #678 (Q186), 20 seeds, before → after: observation repeats
4.3% → 4.3%, from a unit's 11th question 4.8% → 4.8%; **photos under ease 4 before Open Water 22.8% → 21.1%** (−1.7
points, sign test p 0.12), in a unit's first 10 questions 22.1% → 19.9%, reference-level photos there 24.7% → 25.8%;
right 74.0% → 74.4%. The same pool **without** #678: under ease 4 before Open Water 38.0% → 39.6% (+1.5 points, 15 of
20 seeds up, p 0.04), reference-level photos in the first 10 questions 19.3% → 17.1%: a seen observation's other photos
lose the never-seen bonus, and in that draw the bonus then goes to unseen observations, mostly harder; #678's narrower
targeting removes it. So this goes in after #678. Today's pool (1,935 photos, 5 seeds): under ease 4 before Open Water
37.2% → 35.7%, repeats 8.7% → 8.0%. With pools this big the fish repeats are low already; the re-measure at about 500
fish answers is in ROADMAP (Q193).

### Hierarchical photo Elo (sheet v31, 2026-11-03)

Pierre asked whether part of a photo's difficulty can be shared, so that a new photo starts from what similar photos
already show. A read-only study of the answer log (1,262 trusted answers, 9 players, 2026-10-31 to 11-03) answered:

- **The Easy / Medium / Hard sets were worse than no prior at all.** As the app used them (−1 / 0 / +1, weighing 5
  answers in `photoDiff`), they predicted held-out answers worse than a constant: cold-start log-loss +0.016 [+0.008,
  +0.024] by colony, cross-validated; rank correlation with the photos' Elo 0.04 (295 photos with 3+ answers). They
  were made automatically (featured = Easy, other good = Medium, Poor = Hard), so they encoded "featured" and "quality",
  neither of which says how hard a photo is for the players. Pierre: "drop the Easy/Medium/Hard classification, it's
  useless; if it isn't relevant, don't keep it at all: it simplifies the code and the model." `applySlots` now gives
  each view one game list (`game`: the same photos in the same order as the three sets one after the other, checked on
  the real data: 198 genus × view lists, 1,706 photos, identical), `gamePics` returns it, `LEVELS` and `photoLvl` went.
- **The genus carries about half of a photo's difficulty**: pooling by genus was the only grouping that helped out of
  sample (−0.006 [−0.011, −0.001]); view, quality, sharpness, source, growth form and colony views explained nothing
  measurable yet (ROADMAP: refit offline at about 5,000 trusted answers).
- **The rule**: the player rule "global level + genus" (Pelánek et al. 2017) applied to the photos, partial pooling of
  an item family (Glas & van der Linden 2003; Mislevy 1988). A photo's difficulty = its genus's offset G + its own
  residual P. Each trusted answer, with its surprise d = right − expected and its weight w (as before), moves both:
  P by 0.8 / (1 + n_photo / 10) / photos shown × d × w (unchanged), G by `GENUS_K` / (1 + n_genus / 10) × d × w, n the
  weighed answers. G starts at 0, so does P: a photo nobody has answered sits at its genus's offset. In `Code.gs`
  `stats_` and `core.js` `eloReplay` (`tests/core.test.js` compares them); `?stats=1` serves each photo's total G + P in
  `photos` (so everything reading it, the admin included, reads it as before) and the offsets in `gd` (`{genus:
  [offset, weighed answers]}`; `core.js` `genusOffsetsOf`). The genus of a photo is the genus shown (one colony a
  question, rule P4), so no data file and no per-genus code.
- **The app** (`model.js` `photoDiff`): (n × rating + 5 × gd[genus]) / (n + 5), and gd[genus] for a photo nobody has
  answered; `gd` comes with the photo statistics (sheet v31, stored with them). Before the first reply, or for a genus
  with no offset, the prior is 0, which the replay below shows is
  already better than the sets. The genus difficulty that orders the opening (`genusDiff`, the mean `photoDiff` of a
  genus's photos) becomes data-driven through it with no code of its own.
- **`GENUS_K` 0.4**: on the real log, 0.2 and 0.4 score alike and both beat the photo-only Elo; 0.8 moves too fast
  (below). 0.4 learns a new genus's offset sooner (a few answers) at the same accuracy.
- **Blend weight 5 kept**: 2, 5, 10 and 20 score within 0.0004.
- **Rules version 3** (`core.js` `RVS`; v2 is #425's known mix-ups): the genus offset also enters the expectation the photo memory offsets are fitted
  against, and the sheet's full replay uses those offsets, so every player is replayed again once v31 is live ("Full
  replay").

**Real answers** (read-only replay of the sheet's Answers tab read on 2026-11-03, 1,346 rows: the study's export plus
76 rows read with the connector; 1,338 trusted answers scored, 9 players, each scored before it moves anything; the
expectation g + (1 − g) σ(level − difficulty − memory), the sheet's player level and photo memory; the replay
reproduces `core.js` `eloOf` before and after to the hundredth). Log-loss, lower is better:

| Rule | all | photo with < 3 earlier answers (1,058) | without Pierre (1,054) | mean expected (right 81.2%) |
| --- | --- | --- | --- | --- |
| sheet v28 (photos start at 0) | 0.4853 | 0.4972 | 0.4640 | 79.3% |
| **app before** (blend with the set prior, W 5) | **0.4976** | 0.5100 | 0.4740 | 83.9% |
| app new with a v28 sheet (prior 0) | 0.4864 | 0.4981 | 0.4643 | 79.2% |
| sheet v31, `GENUS_K` 0.2 | 0.4819 | 0.4932 | 0.4614 | 79.3% |
| sheet v31, `GENUS_K` 0.4 | 0.4814 | 0.4925 | 0.4620 | 79.3% |
| sheet v31, `GENUS_K` 0.8 | 0.4837 | 0.4950 | 0.4664 | 79.4% |
| **app new** (v31, `GENUS_K` 0.4, gd prior, W 5) | **0.4812** | 0.4922 | 0.4610 | 79.3% |
| app new, W 2 / 10 / 20 | 0.4811 / 0.4814 / 0.4815 | | | |

Paired differences, 95% bootstrap over blocks of 25 answers in time order:

- app new vs app before: −0.0164 [−0.0284, −0.0060]; photos with < 3 answers −0.0178 [−0.0330, −0.0043]; without
  Pierre −0.0130 [−0.0275, −0.0000].
- app new with a v28 sheet (prior 0) vs app before: −0.0112 [−0.0223, −0.0021] (the gate's fallback is safe).
- sheet v31 vs sheet v28: −0.0039 [−0.0087, +0.0009]; photos with < 3 answers −0.0046 [−0.0100, +0.0004]. The online
  offsets start at 0 and learn as the log runs, so this is a lower bound over this history; for photos added from now
  on, with offsets learned from about 1,300 answers, the study's out-of-fold estimate puts the gain between −0.004 and
  −0.012.
- `GENUS_K` 0.2 vs 0.4: +0.0005 [−0.0016, +0.0027]; 0.8 vs 0.4: +0.0022 [−0.0010, +0.0058].

By format and level band (app before → app new; expected before / new / right): 4 choices 0.609 → 0.577 (n 549; 81% /
76% / 74%); 2 choices 0.419 → 0.414 (766; 86% / 82% / 86%); 3 choices 0.379 → 0.405 (18); typed 0.679 → 0.661 (5);
sheet level < 0 0.548 → 0.582 (136; 70% / 62% / 79%); 0-1 0.532 → 0.505 (562; 82% / 77% / 79%); ≥ 1 0.457 → 0.439
(640; 88% / 85% / 84%). The set prior over-expected (83.9% for 81.2% right), mostly on 4-choice questions; the new rule
is close overall and under-expects players below 0 (n 136, not explained yet; worth a look as the log grows). Calibration (expected / right, n): before 54/84 (31), 66/76
(90), 76/77 (257), 85/80 (562), 93/87 (398); new 54/69 (77), 66/81 (179), 75/74 (348), 85/85 (549), 93/90 (185).
Genus offsets at the end of the log: 45 genera, sd 0.40, easiest Plerogyra −0.98, Lobophyllia −0.89, Galaxea −0.56,
Acropora −0.54; hardest Isopora +0.53, Leptoseris +0.54, Favites +0.65, Heliopora +0.85.

**Simulated** (`node tools/learnsim.js --seeds 5 --questions 600 --truth truth.json`, the four profiles, the same seeds
before and after). The learner's photos must not change with the app's estimate, so this run gives the learner a fixed
world (`--truth`, new): each game photo's true difficulty = its genus's offset learned from the real log + a residual
drawn once per photo (sd 0.5, the study's measure), the same before and after. Before: the app of PR #399 with its sets.
After: the new app with a v31 sheet serving those genus offsets and no photo ratings (cold start), and with an older
sheet (prior 0). Mean ± sd over 5 seeds, before / after v31 / after with an older sheet:

| Profile, question | knowSlate | \|th−lk\| | prog−know | prog% | met | exam | learned | ref ≥ .9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner, 300 | 0.64 / 0.63 / 0.63 | 1.12 / 1.30 / 1.23 | −0.31 / −0.27 / −0.26 | 35 / 37 / 38 | 37.2 / 38.6 / 37.6 | 0.0 / 0.6 / 0.4 | 0 / 0 / 0 | 0.6 / 0.8 / 0.2 |
| beginner, 600 | 0.87 / 0.88 / 0.88 | 1.62 / 1.45 / 1.35 | −0.24 / −0.21 / −0.20 | 64 / 66 / 67 | 40 / 40 / 40 | 3.2 / 3.8 / 4.8 | 0.2 / 0.4 / 0.2 | 5.8 / 6.4 / 7.2 |
| lecture RA, 300 | 0.76 / 0.76 / 0.76 | 1.11 / 1.00 / 0.92 | −0.32 / −0.32 / −0.27 | 44 / 45 / 49 | 39.0 / 39.4 / 39.8 | 0.0 / 0.4 / 0.2 | 0 / 0 / 0 | 0.2 / 1.0 / 0.2 |
| lecture RA, 600 | 0.91 / 0.91 / 0.91 | 1.64 / 1.44 / 1.29 | −0.22 / −0.17 / −0.14 | 70 / 74 / 76 | 40 / 40 / 40 | 4.6 / 5.0 / 7.6 | 0.4 / 0.4 / 0.4 | 8.2 / 9.6 / 9.4 |
| strong RA, 300 | 0.86 / 0.86 / 0.86 | 1.28 / 1.21 / 1.10 | −0.31 / −0.30 / −0.27 | 55 / 56 / 59 | 40 / 40 / 40 | 1.4 / 0.0 / 0.6 | 0 / 0 / 0 | 7.6 / 8.8 / 9.0 |
| strong RA, 600 | 0.94 / 0.95 / 0.94 | 1.71 / 1.62 / 1.52 | −0.13 / −0.10 / −0.10 | 81 / 85 / 84 | 40 / 40 / 40 | 11.2 / 14.2 / 12.6 | 1.6 / 0.4 / 1.6 | 24.4 / 24.8 / 24.2 |
| expert, 300 | 0.95 / 0.95 / 0.95 | 1.14 / 1.17 / 1.09 | −0.26 / −0.26 / −0.27 | 69 / 69 / 69 | 40 / 40 / 40 | 4.0 / 3.8 / 3.6 | 0.2 / 0 / 0 | 14.8 / 14.8 / 15.8 |
| expert, 600 | 0.97 / 0.97 / 0.97 | 1.20 / 1.23 / 1.17 | −0.05 / −0.06 / −0.06 | 92 / 91 / 91 | 40 / 40 / 40 | 24.8 / 23.2 / 22.8 | 7.0 / 6.4 / 7.2 | 38.8 / 38.2 / 38.6 |

What the learners really know (knowSlate) does not move, no path breaks (no page error in 60 runs), and the app's
ability is nearer the truth at 600 questions for the three learning profiles (|th − lk| 1.62-1.71 → 1.35-1.62), its
progress bar a little less pessimistic. The strong RA's learned genera at 600 (1.6 → 0.4, sd 0.5) differed by more than
the spread, so beginner and strong RA were run again on 15 seeds: learned 1.5 ± 0.7 → 1.2 ± 1.2 (strong RA) and
0.3 → 0.5 (beginner), knowSlate 0.95 → 0.94 and 0.87 → 0.87, |th − lk| 1.70 → 1.65 and 1.56 → 1.43: within the spread.
The simulated world is built on the same genus offsets the v31 app is given, so it says the rule is safe, not how
much it gains; the real-log replay above is the measure of that.

**Next: one difficulty in components** (decided by Pierre, 2026-11-09, Q316; the coherence review's F8, C1), after a
literature review ([reference/lit-componential-difficulty.md](reference/lit-componential-difficulty.md): the linear
logistic test model with random items, nested item families, TrueSkill's split of one result among additive parts). An
evolution of this Elo engine: one difficulty per question = a rank offset + the family, genus, species and photo
components, each shrunk toward its parent while it has few answers; the online update splits the surprise among the
components by their uncertainty (TrueSkill / the simplified Kalman rule); with only genus + photo it must reproduce
today's v31 ratings within rounding; the genus and species parts count at family rank too. Order: the offline fit
first (read-only), then the sheet, then the app; rule L11. **Q136** (photos rated against the genus ability) is
reopened for rework on today's multi-level engine and folded into this work: check whether the per-genus player
ability can be taken as centred on zero across players on our data (the literature's condition, review §6), with more
literature if needed. ROADMAP "Engine coherence review".

### Response time: genus and photo (measured 2026-11-04, no change made)

Pierre, 2026-11-04: "response time informs on several things at once: the player's knowledge of this genus, the
intrinsic difficulty of the genus, and the intrinsic difficulty of the photo. It's the combination of the three that
makes the time longer or shorter. So we need to see how we can use it in each of these three factors, or not." The
first factor (a right answer's Elo step weighted by its speed against the player's own median) is "Response time"
(PR #431, 2026-11-03). This section splits the time into its parts and asks whether the other two can use it.
Nothing in the app changes.

**Data and model** (`tools/rtprep.js`, then `tools/rtdecomp.py`; the sheet's Answers tab read 2026-11-03, read-only,
the same 654 timed answers, not typed, of the 5 timed players as PR #431, P1-P5 in the same order; the 41 with a photo
enlarged left out, since the time spent enlarged is in the seconds: 613 answers). log(seconds) = μ + fixed terms +
u_player + a_genus + b_photo (+ c_player×genus + e_player×photo) + ε, crossed random effects fitted by REML (van der
Linden's lognormal response-time model, 2006, with the item's time intensity split into genus and photo). The photo is
the question's first one (the colony view of a multi-view question). Fixed terms: "controls" = 2 choices, number of
views, share of the photos new to the player, log of the player's answer number (practice); then right; then the gap,
the logged ability minus the question's difficulty (th − d, from Expected and Ability). Intervals: parametric bootstrap
(100 refits on data simulated from the fit; 20 for the five-effect model) and, beside them, each player left out.

**1. The decomposition** (share of the variance of log(seconds)):

| Model | fixed | player | genus | photo | player × genus | player × photo | residual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| controls | 0.05 | 0.28 [0.02, 0.55] | 0.06 [0.00, 0.10] | 0.18 [0.09, 0.30] | | | 0.44 |
| controls + right + gap | 0.12 | 0.26 [0.03, 0.42] | 0.04 [0.01, 0.10] | 0.15 [0.07, 0.24] | | | 0.43 |
| controls, five effects | 0.04 | 0.26 | 0.02 [0.00, 0.07] | 0.16 [0.06, 0.29] | 0.11 [0.05, 0.17] | 0.01 [0.00, 0.12] | 0.40 |
| controls + right + gap, five effects | 0.11 | 0.25 | 0.01 [0.00, 0.05] | 0.15 [0.05, 0.23] | 0.08 [0.01, 0.13] | 0.00 [0.00, 0.13] | 0.41 |

- **The player** comes first: medians from 3.9 to 11.2 seconds. With five players its share is very uncertain (one
  player left out: 0.04 to 0.33). This is why every time rule reads z, the time against the player's own median.
- **Correctness and the expectation**: a right answer takes 0.67 times as long (−0.40 ± 0.07 in log), and −0.22 ±
  0.04 per logit of the gap. With th and d apart: −0.25 per logit of ability on the genus, +0.18 ± 0.06 per logit of
  the question's difficulty. Together they explain 7 points of the variance (fixed share 0.05 → 0.12; plain
  regression R² 0.095). Most of the time is not correctness.
- **The genus**: 4-6% with three effects, but 1-2% once the player × genus term is in. That term, the player's own
  knowledge of the genus (8-11%), takes most of what looked like a genus effect: Pierre's first factor, PR #431's.
  The 62 Duel tab answers (two fixed pairs, fast) also make part of it (without them the genus sd is 0.155, not 0.194).
- **The photo**: 15-18%, a photo one sd slower takes 1.4 times as long (sd 0.35 [0.27, 0.43] in log). It is
  shared by the players: player × photo is about 0 (a photo slow for one player is slow for the others).
- So, of what varies inside a player beyond the outcome: photo about a quarter, the player's own knowledge of the
  genus about a sixth, the genus itself a few percent, the rest noise (about 60%).

**2. Genus: not useful.** The genus effect (BLUP, controls) against what the app uses for the opening order:

- **Correlation over 45 genera** (28 with 10 timed answers or more): with `genusDiff` +0.14 (its photo part −0.07, its
  confusion part +0.21), with the pooled miss rate +0.46 (+0.51 on the 28), with the miss rate beyond Expected +0.42.
  A slow genus is a missed one; `genusDiff` itself goes with the miss rate only +0.25. Fastest: *Lobophyllia*,
  *Ctenactis*, *Acropora*, *Plerogyra*, *Danafungia*; slowest: *Astreopora*, *Montipora*, *Leptoseris*, *Stylophora*.
- **Not stable across players**: the effect from two players against the other three, over the 10 splits, +0.14 on
  average (−0.35 to +0.37; +0.07 with right and gap); first half against second half of each player's answers +0.09;
  odd against even answers of the same players +0.42. What repeats is each player's own genus, not the genus.
- **Out of sample** (each player's 1,012 scored answers, timed or not, predicted with coefficients fitted on the other
  players; every genus measure from answers the fold has not seen: the held-out player's from the other four, each
  training player's from the other three, Codex review #443; log-loss difference per answer × 10⁻³):

| Added to the player's level | all answers | on top of the app's expectation | first answer on each genus (166) |
| --- | --- | --- | --- |
| `genusDiff` | +2.8 ± 2.4 | +3.9 ± 2.4 | +3.5 ± 11.8 |
| genus time effect | +3.0 ± 1.2 | +4.3 ± 1.4 | +1.7 ± 7.1 |
| time effect on top of `genusDiff` | +3.0 ± 1.0 | +3.9 ± 1.2 | +2.4 ± 5.7 |
| pooled miss rate of the others | −1.1 ± 2.5 | +0.7 ± 2.4 | +3.9 ± 8.9 |

  The time effect makes every prediction worse (its sign is right: a slower genus is missed more, −0.32 per log
  unit, but it carries no more signal than noise; before the review's fix, which left each training player's features
  holding the held-out player's answers, it read +1.1 ± 0.6 on all answers). Nothing measured on four players predicts the fifth player's
  success on a genus: `genusDiff` neither, and the others' miss rate only within its noise. The part of genus
  difficulty that players share is small next to each player's own, and time adds nothing to it yet.
- **When**: the reliability of a genus time effect over m players with n timed answers each (genus sd 0.12, player ×
  genus 0.27, residual 0.51): 0.38 for 5 players × 5 answers (today), 0.65 for 15 × 5, 0.71 for 20 × 5, 0.76 for 20
  × 10. So about 15-20 timed players with 5 or more timed answers on most genera (about 4,000-5,000 timed answers),
  and then only if the out-of-sample test above turns negative.

**3. Photo: not usable yet, the most promising of the two.** The photo effect is the larger and is shared, but:

- **Too few repeats**: 428 photos; 117 with 2 timed answers or more, 50 with 3, 4 with 5; 85 answered by 2 players or
  more. The reliability of a photo's time effect with n timed answers is 0.26 (1), 0.51 (3), 0.63 (5), 0.77 (10).
- **Against the photo difficulty**: correlation with the photo Elo (core.js `eloOf`, the sheet's rating) +0.25 on the
  photos with 2 timed answers or more, +0.33 with 3 (+0.24 with right in the model), with the app's `photoDiff` +0.01.
  As a covariate of time, the photo Elo is clearly there (+0.52 ± 0.08 log per unit, +0.36 with right) but explains
  only a fifth of the photo variance (photo sd 0.35 → 0.31): most of what makes a photo slow is not what makes it
  missed (a far colony, a busy scene, several views to look at).
- **Cross-player** (419 answers on a photo another player answered with a time): the others' photo time effect makes
  the prediction worse, +7.4 ± 5.0 × 10⁻³ (on top of `photoDiff` +4.3 ± 5.1; on top of the app's expectation and
  `photoDiff`, −0.5 ± 6.1): noise.
- **In the sheet's photo Elo** (`tools/rtprep.js`: core.js `eloReplay` replayed with time on the photo's step, each
  answer scored before it updates anything, 1,466 trusted answers, 183 of them on a photo timed before): a right
  answer's photo step × w = clamp(1 − k z, 0.5, 1.5) as PR #431's player rule, k 0.25 / 0.5 / 1 / 2: −0.05 / −0.07 /
  −0.07 / −0.10 ± 0.05-0.10 × 10⁻³ (nothing, within noise; on the 183, −0.4 to −0.8 ± 0.4-0.8; z against the
  median of the player's earlier timed answers, the two middle ones averaged for an even count, as
  `tools/abilityeval.js`); an additive time step instead (the photo harder by c × K × z beyond the player's mean z for
  the same outcome), c 0.25 / 0.5 / 1: +0.2 / +0.5 / +1.6 ± 0.4-1.5 × 10⁻³ (worse).
- **When**: to tell a correlation of 0.25 from none (80% power, 5%) takes about 120 photos with a reliable time effect
  (5 timed answers or more from 2 players or more); with today's spread of the draw (an effective pool of about 800
  photos, Poisson) that is about 2,500 timed answers, 3,000-3,500 if the draw spreads over all 1,404 game photos, so
  within Pierre's ~5,000 timed answers for weak photo signals ("Response time" above). Then run the replay again.

**4. What each factor could do with time**

| Factor | Verdict | When | How |
| --- | --- | --- | --- |
| Player × genus (knowledge) | usable now | now | PR #431's rule, the other work |
| Genus (intrinsic difficulty) | not useful now | 15-20 timed players × 5+ timed answers per genus (~4,000-5,000 timed answers), and only if out-of-sample helps | a term in `genusDiff` (below) |
| Photo (intrinsic difficulty) | not usable yet | ~120 photos with 5+ timed answers from 2+ players (~3,000 timed answers) | the photo's Elo step (below) |

- **Photo, if the replay says so**: in `Code.gs` `stats_` and its copy `core.js` `eloReplay` (tests check they agree),
  a right answer's photo step × w = clamp(1 − k_P z, 0.5, 1.5), z the time against the median of the player's earlier
  timed answers (from their 11th; typed or enlarged answers, or none: w 1). The same z and the same form as the
  player's rule, so a fast right answer says "easy photo" and "known genus" at once, Elo-style (Pelánek 2016: one
  surprise moves both sides). No new state per photo, no constant per photo or genus; k_P one number chosen by the
  replay (leave one player out, as PR #431's k). The additive form (a separate time rating, T_f = Σ residual z /
  (n_f + 3), 3 = residual variance / photo variance, added to the Elo with a weight) was worse today.
- **Genus, if it ever helps**: the sheet (compute once, rule L13) would serve each genus's time effect, the
  shrunk mean over players of each player's mean residual z on it, â_g = Σ_p w_p z̄_pg / (Σ_p w_p + 1/τ_g²), w_p =
  1 / (τ_pg² + σ² / n_pg), the variances refitted by `tools/rtdecomp.py` (today τ_g 0.12, τ_pg 0.27, σ 0.51), and the
  app would add `OPEN.TIME` × â_g to `genusDiff` only from that sheet version (rule D4); `OPEN.TIME` one number
  chosen by the out-of-sample test (0 until it helps). With the hierarchical photo Elo (PR #422, a genus offset G in
  the photo difficulty), the same term would go into G's prior instead.
- **For the player rule** (PR #431): its z also holds the photo's part (a quarter of the variance inside a player), so
  a slow right answer on a slow photo now counts as weaker knowledge. Once photos have reliable time effects, z −
  b̂_photo (the photo's shrunk time effect, from the sheet) would give each factor its own part; today b̂ is shrunk to
  a third or less (reliability 0.26-0.51), so it would change nothing.

### Response time as information on difficulty (measured 2026-11-08, no change to the app)

Pierre, 2026-11-08: the earlier analyses asked how variables change the response time; he asked the other way round:
what the speed of an answer says about how hard the question was, "even when they got it right: an answer where
people took long, or even clicked to enlarge, means the question or the photo was harder than if the person answers at
once". Today the seconds weigh only a right answer's steps on the player's ability ("Response time" section 5); the
photo ratings (`Code.gs` `stats_`, `core.js` `eloReplay`) do not use them, and "Response time: genus and photo" found
no use for them on 613 answers of 5 players.

**Data** (the sheet's Answers tab read 2026-11-08, read-only; 4,021 rows: corals 2,729 (2,159 timed, 14 players, 11
with timed answers on a photo another player answered), fish 1,292 (1,251 timed, 8 players); players P1… only; a
script kept outside the repo). z = log seconds minus the median of the player's own earlier timed answers (from their
11th; typed answers out). **Declared before reading the data** (rule L11, the multiple-testing rules of "Multifactor
analyses"): three primary tests under Holm (family-wise 5%), the players the unit (stratified sign-flip over players,
exact), one-sided: **H1**, others' earlier right-answer speed on a photo predicts a player's success on it beyond the
app's rating (corals and fish pooled); **H2** (corals) and **H3** (fish), the sheet's photo Elo with a right answer's
photo step × clamp(1 − k z, 0.5, 1.5) (k by leave one player out, grid 0.25-3) predicts the next answers better
(paired log-loss). Everything else secondary under Benjamini-Hochberg (FDR 5%, 28 tests); the rest exploratory.

| Primary | estimate [95%] | players | p | Holm |
| --- | --- | --- | --- | --- |
| H1: others' right-answer speed on the photo (logit per log unit, beyond the photo Elo) | −2.66 [−3.63, −2.17] (920 answers) | 11 | 0.001 | **0.003, clear** |
| H2: corals, time on the photo's Elo step (log-loss × 10⁻³ per answer, mean of players) | −0.41 [−0.87, −0.02] (2,729) | 14 (8 better) | 0.057 | 0.114 |
| H3: fish, the same | −0.10 [−0.29, +0.10] (1,278) | 7 (4 better) | 0.20 | 0.20 |

- **(a) A slow right answer says the photo is harder, and the rating does not know it yet.** By how fast other
  players had answered the photo right (their shrunk mean z), the next answer on it (corals): faster than their usual
  91% right against 79% expected (295 answers), about usual 83% / 78% (284), slower 76% / 77% (202). Corals alone
  −2.87 [−4.67, −2.18] (BH 0.014, clear); fish −1.13 [−4.99, +3.21] (139 answers on a photo answered before: too few).
- **(b) Enlarged**: others' enlarging of the photo against their own habit, −3.59 per unit share [−4.89, −1.43]
  (corals and fish, 1,185 answers; BH 0.085, not clear after the correction); fish has 17 enlarged answers.
- **(c) Time intensity, out of sample** (van der Linden's lognormal model: each photo's time intensity from the other
  players' answers, net of right or wrong and of each player's median, shrunk by 3 answers' worth, added to the
  answer's expectation; coefficients fitted on the other players, each player predicted in turn): corals −6.1 × 10⁻³
  per answer [−11.9, −1.0] (9 of 14 players better; BH 0.094, not clear), fish −0.5 [−2.7, +0.9]. The photos' time
  intensity and their final Elo agree, +0.22 [0.12, 0.32] over 466 coral photos with 2 timed answers or more, +0.27
  [0.12, 0.42] with 3.
- **The photo Elo with time, replayed**: the k grid chose 0.5 or 1.5 by fold; fixed k 0.25 −0.19 ± 0.07 × 10⁻³ per
  answer, 0.5 −0.29 ± 0.12 (both BH 0.027, clear): small, about 0.1% of the log-loss (0.456). On the answers to a photo
  another player had answered right with a time: −0.86 ± 0.52 (BH 0.085). The enlarged mark as a slow answer, or as
  its own factor on the step: nothing (BH 0.29-1). The same weight on the **genus offset's** step too (the
  hierarchical photo Elo's G): −1.56 ± 0.36 × 10⁻³ per answer, 11 of 14 players better (BH 0.014, clear;
  exploratory, 3 values of k tried); fish −0.58 ± 0.35 (BH 0.18).
- So: the time other players took carries real information on a photo's difficulty (H1, large and for most players),
  but a weight on the photo's own Elo step, the form the earlier study proposed, takes little of it (a photo has few
  answers, and the step it scales is small); the genus offset's step takes more. Fish: too few repeated photos yet
  (152 photos with 2 timed answers or more, 1 with 5).

**Options, not built** (ROADMAP "Time in the photo rating"): (1) the weight on the genus offset's step too (`Code.gs`
`stats_` and `core.js` `eloReplay` together, k chosen by leave one player out); (2) a time-intensity term in
`photoDiff` from the sheet (rule L13: each photo's shrunk time intensity served with `photos`, × a coefficient chosen
out of sample); (3) the enlarged mark as a small extra once it is clear. Risks: player speed (z is against the
player's own median), typed questions (out), practice (z drifts as players speed up: the median from earlier answers
only), pauses (the 600 s cap; the weight's clamp at 0.5), and the player-side weight already taken on the same z
(PR #431): a slow right answer would then lower both the player's step and the photo's, which is what Elo does with
one surprise (Pelánek 2016), but the two must be tuned together, not stacked. Validation (rule L11): level 2 (it moves
every photo's rating, so the draw), both worlds, the real-log replay as the primary. The view below measures it at
every milestone: Analyses › Difficulty › Time.

**Decided by Pierre, 2026-11-09 (Q315)**, after a literature review
([reference/lit-response-time.md](reference/lit-response-time.md): time intensity as its own item parameter, the
response times as collateral information on difficulty, van der Linden 2007; van der Linden, Klein Entink & Fox 2010):
option (2), each photo's time intensity in the **prior** part of `photoDiff`, so it fades as the photo's own answers
come in; option (1) only as the declared comparison, never stacked with (2); two variants of (2) tested, the time
intensity from all answers or from right answers only (both with rapid-guess cut-offs), the one that predicts better
kept, declared before the test; option (3), enlarging, waits for data; the seconds stay logged. Validation: rule L11
level 2, the real-log replay the primary (players the unit; corals primary, fish exploratory). Next steps: ROADMAP
"Time in the photo rating".

### Q315 option 1: what three rounds showed (2026-11-09, PR #808, closed unmerged)

**The outcome: three level-2 rounds, and none passed as declared.** Option (1) weighed a right answer's photo-Elo step
and its genus-offset step by its response time. Pierre chose on 2026-11-09 (Q335) to close #808 without merging it and
to keep its conclusions here. Nothing in the engine changed. What was kept:
- the rated world's sheet mode with its simulated response times (`--app sheet`, `--times`, `--gap`);
- learncmp's population measures;
- an admin fix found on the way (#808's salvage).

**The real-log replay** (the sheet's Answers tab read 2026-11-09, read-only; corals 2,906 answers of 14 players).
- The protocol was declared before computing. Each answer was predicted before it moved anything, with the app's own
  scorer, and the players were the unit. Three primaries went under Holm.
- **Variants A and B of option (2)**, the time intensity in `photoDiff`'s prior: A from right answers only, B from all
  answers. A gave −4.05 × 10⁻³ log-loss per answer [−9.16, +1.07], B −3.53 [−8.26, +1.20]. Neither was clear (Holm
  0.107).
- **Option (1), the raw form**: z = log seconds minus the median of every earlier timed answer of the player, k 2. It gave
  −1.97 × 10⁻³ [−3.14, −0.80], 10 of 14 players better, Holm 0.003, clear.
- **Option (1), the net form** (Q318, after round 1): z against the median of the player's earlier right answers only. It
  gave −1.03 × 10⁻³ [−1.71, −0.34], 10 of 14 players, p 0.0015, k 1.5 the commonest choice (the curve flat from 1 to 3).
- The raw form beat the net form by +0.94 [+0.23, +1.65], which is at most the part the step asymmetry took. The
  right/wrong photo step ratio was 0.219 under today's rule, 0.231 with the raw z, and 0.219 with the net z.
- Fish: nothing clear in any variant.

**What was built** (on #808's branch only): `core.js` `photoTimeW` and `RTIME.PK`, called by both `Code.gs` `stats_` and
`eloReplay`. A right answer's photo and genus-offset steps were multiplied by clamp(1 − k z, 0.5, 1.5). A miss, a typed
answer, an enlarged photo and an untimed answer weighed 1. The change was rules version 10. The stats cache was keyed by
the rules version.

**The level-2 protocol, the same in all three rounds and declared in the PR before each run.**
- **The world.** The rated world, corals, `--app sheet`: one player per coral profile, 3,000 answers each (12,000
  pooled). The sheet's photo Elo was replayed on the population's own log every 100 answers and served to every player's
  app.
- **The arms.** Before was k 0 (today's rule), after the k under test.
- **The time cases.**
  - `rho25`: β_photo correlated 0.25 with the true difficulty d.
  - `rho0`: unrelated.
  - `views`: unrelated, each view beyond the first 0.3 log slower, so time runs against difficulty.
  - `fast`: fast photos easy, slow ones uninformative.
  - All four with normal photos, plus `rho25` and `rho0` with heavy tails.
- **The primary**: the photo ratings' centred root mean square error against the true difficulty at 3,000 answers per
  player (`rateErr@3000`, `rho25` normal, down; one value per seed, an exact sign-flip).
- **The key secondary**: the ratings' correlation with the truth.
- **"Nothing breaks"**: the rating error at most +0.01 with `rho0`, `views` and `fast`.
- **The guardrails** of the table above, per profile.
- **The app world**: 4 profiles × 5 seeds × 300 questions, served one population's ratings with k 0 and with the k under
  test.

**The three rounds:**

| Round | The rule tested | The simulated seconds | Seeds | Primary (rating error, after − before) | Breached |
| --- | --- | --- | --- | --- | --- |
| 1 | raw z, k 2 | log t = log 6.5 + β_photo − τ (sd 0.44) − 0.4 if right + log 1.5 if typed + N(0, 0.57²) | 101-120 | −0.0018 [+0.0126], p 0.83 | "nothing breaks" with views (+0.014); the strong RA's plateau (fast); app world: E, first Open Water and plateaus for the early profiles |
| 2 | net z, k 1.5 | the same | 121-140 | −0.0031 [+0.0085], p 0.65 | "nothing breaks" with views (+0.017); the lecture RA's score at 1,000 (views, fast); app world: the beginner's E and first Open Water |
| 3 | net z, k 1.5 | the same − 0.22 × (θ − d), the real log's knowledge-gap term (Q324) | 121-140 | **+0.0105** [+0.0210], p 0.10 | "nothing breaks" with rho0 (+0.015) and views (+0.013); app world: the beginner's first Open Water (40 → 100 answers) |

**What the rounds showed:**
- **The ranking gets better while the spread gets worse.** The weight orders the photos better whenever time carries
  difficulty. In round 3 the correlation with the truth rose +0.020 to +0.069 in every case.
- But the error does not fall, and in round 3 it rises. The truth's own choice of k is 0 in most seeds. The weight spreads
  the ratings more than it informs them.
- **The raw z mixes in an asymmetry.** Right answers are faster than misses, so against every answer's median they
  weigh more than 1 on average. That makes a right answer's step larger than a miss's whatever the photo.
  - In round 1 the log-loss chose k > 0 even with uninformative times, and an exploratory check with right answers as
    fast as misses removed it.
  - The net z removes the asymmetry: in round 2 the log-loss chose k 0 with uninformative times.
- **The real log's signature needs the knowledge-gap term.**
  - Without it (round 2) the planted world could not produce the real log's gain: with rho25 the log-loss chose k 0.
  - With it (round 3) the log-loss gain at k 1.5 is −0.64 to −1.10 × 10⁻³ in every case, matching the real log's −1.03.
  - So a log-loss gain on the real log is expected from time tracking the knowledge gap. It does not show that the
    ratings get closer to the truth.
- **Every app-world check put the beginner's first Open Water later**: +38, +20 and +60 answers. These are noisy, from one
  pair of rating sets each.

**What a future variant must do:**
- Keep the ratings' spread in check. The weight's mean must stay at 1 for right answers (the net z does that), and its
  extra variance must be paid for, for instance with a smaller k or by also damping the step.
- Pass the same primary, in the same rounds, with the gap term on (`--gap -0.22`).
- Wait for more players, and more varied ones. The real-log figures come from 14 coral players, a few of them with most
  of the answers.

**Options (2) A and B** (the time intensity in `photoDiff`'s prior, Pierre's first choice of Q315) were measured once on
the real log, not clearly, and never built or simulated. They are kept for the same re-test.

**When to come back:**
- the corals have about 20 timed players and about 5,000 timed answers ("Response time: genus and photo" sized it);
- the real-log replay is run again with both forms of option (1) and options (2) A/B under the same declared protocol;
- only a variant clear there goes into level 2, starting from the rated world's sheet mode with `--gap`.
ROADMAP "Time in the photo rating".

## Multifactor analyses (admin Analyses, 2026-11-04)

Pierre, 2026-11-04: multifactor reports of the answer log, refitted at every round thousand of answers (the first 1000, 2000, 3000, …: the milestones, Pierre 2026-11-05), in the admin (ARCHITECTURE.md "Analyses"; code `analysis.js`, tests `tests/analysis*.test.js`). They measure; they change nothing in the app. Methods, shared by every analysis:

- **Crossed random effects.** Player, genus and photo (a question's photos share its photo effect, weight 1/m each), fitted by alternating updates: each level's shrunk effect given the rest (a majorise-minimise step, exact when a row has one level), then the fixed effects, with EM updates of the variance components from the posterior second moments (REML-like shrinkage, without REML's exact determinant term). Gaussian for log response time (`lmm`); logistic with each question's guess rate, P = g + (1 − g) sig(eta), for right / wrong (`glmm`, penalised quasi-likelihood, Fisher scoring), g as the app's (`core.js` `guessOf`: 1/k, ½ for a duel, 0 typed).
- **Intervals.** 95%: the model's own (Wald, from the fixed effects' covariance marginal over the random effects, the inverse of the Schur complement of the joint precision: an effect that is constant within a player, such as a player's habit, gets the players' spread, not the precision of their many answers; Codex review #441) and, from 6 players, a cluster bootstrap over players, whichever is wider. Draws (Pierre, 2026-11-05: at least 999): **999** for the latest milestone in the Action (the percentiles of the draws), **199** for the earlier milestones, newest first, while their answers add up to 60,000, none beyond (the model's own interval only), so that a full recompute stays inside the Action's 2 hours as the log grows (`report`); **Recompute here** in the browser: 199 draws read as a normal interval, the estimate ± 1.96 times the draws' standard deviation, never beyond the draws' range (`boot`, `BSE`: some 200 draws pin a standard error, percentiles need about 1,000, Efron & Tibshirani 1993), earlier milestones not reused from the stored report with the model's own interval only. Seeded: the same answers give the same intervals. Each bootstrap refit starts from the full fit of the same model (`WARM`: the same fit in fewer steps); a draw with no answer moving a feature gives no value for it (`drawn`), never the full fit's or 0. Few players = rough intervals, said by the verdicts.
- **Verdicts** (`verdictOf`, then `correct` over the whole milestone), per effect: *Clear* (after the multiple-testing correction below: its adjusted p at most 5%, so its 95% interval excludes 0, or the app's value for a guess rate, with room to spare); *Within the margin of error* (it includes it and lies within the smallest effect that would matter: ±0.1 log time ≈ 10%, ±0.25 logit, ±5 points, ±0.1 logit for slopes); *Not enough data yet* with the answers needed for an interval as narrow as the current estimate (or that smallest effect), n × (half-width / target)², rounded up; after the correction, the answers for either verdict, whichever comes first: its interval at the level the correction asks of it leaving 0 out, or its 95% interval inside the margin (so it never says it needs fewer answers than it has): a rough power estimate that assumes the interval shrinks as 1/√n (it shrinks slower when the players are few).
- **Multiple testing** (Pierre, 2026-11-05, Q69; the statistical methods study of 2026-11-05, `docs/reviews/2026-11-05-stats-methods-study.md` §2, §5.3, §6.3; `analysis.js` `PRIMARY`, `pOf`, `holm`, `bh`, `correct`; `AV` 4). A milestone holds about 40 effects, each at 95%: about 2 would read clear by chance alone, and the chance that at least one does is about 85%. So each analysis declares the 1-2 **primary** effects it exists to answer, chosen before looking at any result (below), 15 in all (the fish's judged ease added on 2026-11-15), tested together under **Holm** (family-wise error 5%: the chance that even one of them reads clear by chance; valid whatever the dependence between them); every other effect is **secondary, exploratory**, tested together under **Benjamini-Hochberg** (false discovery rate 5%: among the exploratory effects read clear, about 5% at most are chance, on average; valid for independent or positively dependent tests), a lead to re-test on later answers before acting on it. An effect's p-value comes from its 95% interval (the wider of the model's and the bootstrap's) read as a normal one on the side facing the null value, so p < 0.05 exactly when that interval leaves the null value out; the estimate and its 95% interval stay as they were, the verdict uses the adjusted p, and the admin shows the adjusted p only in the verdict's tooltip (rule A2: no method detail on the admin page). Each effect stores its family (`fam` 1 or 2), `p`, adjusted `pa`, and `alo` / `ahi`, its interval at the level its rank faces (it leaves the null value out exactly when the effect is clear). Typed answers in Learning curves are read as right answers against the typical question's, which has a guess floor they lack, so they are tested, and corrected, on that contrast: their null is the coefficient at which they are right as often (log 1.5 at 75% right with a ¼ guess floor), not 0 (`correct` sets `nul`). Not tested: the answers to reach 80% (a number, not a comparison) and effects with no estimate. **The primary effects**, from the questions each analysis was built for (the list above): Response time, *right answers* and *the app's expected difficulty* (is answer time a signal the app could use: does it follow knowledge and difficulty beyond right or wrong; the question of `rtsignal`); Zoom, *enlarged, against the player's own habit* (does enlarging help: its whole question); Photo factors, *poor quality* and *corallites instead of a colony* (the two rules the games' photo sets rest on: Poor photos feed the hard end, and the zoom levels go colony → corallites), and on the fish *the judged ease* (does the ease the fish draw starts from predict the right answers; 2026-11-15, before any fish result was seen); Formats, *right − expected on 4 choices* and *on typed answers* (is the app's expected chance right on its main format and on the one with no guess floor; the model-light check, the most powerful of the three per format); Confusions, *corallites shown* (do close views cut mix-ups: the reason the app shows several views); Learning curves, *the learning slope* and *Again after a miss* (does practice work; does the app's Again help); Comeback, *the forgetting slope* and *comeback questions, right − expected* (do players forget over days; is the app's forgetting curve right); Sessions, *after a wrong answer* (do misses end sessions); Time and difficulty, *others answered the photo right slowly* (does the time others took on a photo say it is harder than the app thinks; Pierre, 2026-11-08). No spread (SD) is primary: an SD's estimate never reaches 0 (EM keeps it above, and its interval is not valid at that boundary), so a spread that is really 0 can read clear, with or without a correction; on a synthetic log with no photo or time spread, both still read clear (ROADMAP "Analyses: what the correction leaves open"). **Milestones are looks, not new studies**: each refits a larger copy of the same log, so a result that turns clear at one milestone is no new finding; the admin no longer marks results "new since the previous milestone" nor charts the clear results over time, and keeps the milestones as history. **Validated** (`tests/analysis-verdicts.test.js`): on 400 made-up milestones of 37 null effects on the analyses' own keys, 1.80 per milestone read clear at 95% before the correction and 0.125 after; a false clear among the primary effects in 5.25% of the milestones (Holm's 5%); a strong effect (6 standard errors), primary or exploratory, stays clear every time. On a synthetic answer log with every effect switched off but two (12 players, 5,400 answers, no bootstrap): 2 of 41 null fixed effects clear at 95% before, 1 after, no null primary effect clear, and the two real effects (the learning slope, typed answers taking longer) clear. A correction cannot remove a bias: a null effect the model gets wrong (here "one view alone", ±0.2 logit across seeds) can stay clear; the bootstrap widens such intervals.
- **Runtimes** (measured 2026-11-05 on a shared machine, one core; made-up logs of 10 players on the real photos; the Action's limit is 2 hours, `.github/workflows/analyses.yml`): 999 draws for the latest milestone cost about 1.7 minutes per 1,000 answers (5,000 answers: 8.5 minutes); a whole report from scratch at 5,000 answers (the latest at 999, the 4 earlier at 199): 10.7 minutes. Estimated: about 33 minutes at 10,000 answers, about 55 at 20,000 (the earlier milestones' draws are capped at 60,000 answers, about 20 minutes); the latest milestone alone reaches the 2 hours near 55,000 answers (ROADMAP "Analyses: what the correction leaves open"). Recompute here in Chromium at 5,000 answers (199 normal-interval draws for the latest, the earlier milestones without bootstrap): 1.9 minutes, where 999 percentile draws would take about 9; a phone is slower.
- **Validated** on synthetic answer logs whose true effects are known (`ANALYSIS.synth`, `TRUTH`): the fits give them back within the test tolerances (response time effects within 0.04-0.06 log units, photo features within 0.25 logit, learning slope within 0.15). Photo random-effect SDs come out a little low (PQL's known shrinkage), a guess rate is pinned only by the weakest answers (its interval stays wide).

The analyses:

1. **Response time**: log seconds ~ right + typed + enlarged + 2 choices + the app's expected difficulty + log position in the session + (player) + (genus) + (photo). Variance shares; genera, players, photos shrunk. Earlier measure: "Response time" (branch `rtsignal`), which found time informative beyond correctness.
2. **Zoom**: right ~ offset (the app's log-odds) + enlarged relative to the player's own habit + the habit + (player).
3. **Photo factors** (explanatory IRT, an LLTM with a photo random effect): right ~ view + quality + sharpness + source + one view alone + typed + (player) + (genus) + (photo); read as difficulty. The photos furthest from what their features predict are listed. **On the fish** (2026-11-15, `AV` 14; ROADMAP "Analyses for the fish"): the same model on the fish photos' judged features, right ~ judged ease (per point, centred on 3) + juvenile + another phase (male, female, intermediate) + oblique + head-on / tail / from above + part of the fish + typed + (player) + (family or genus asked) + (photo), from the photos the game plays (fish-game.json: Pierre's ease and tags where he set them, else the judging pass's); a fish question shows one photo, so no "one view alone"; a feature no answer measured is left out. The judged ease is its primary effect, chosen before any fish result was seen: does the ease the draw starts from (easy photos first) predict the right answers? On a made-up log with 0.6 logit per ease point and a juvenile 0.5 harder, the fit finds both (`tests/fishphotofactors.test.js`).
4. **Formats**: per format, P = c + (1 − c) sig(x + d), x the app's own log-odds: the real guess rate c against the app's fixed one, and the difficulty d the app misses.
5. **Confusions**: each wrong choice offered, picked or not ~ view shown + log(wrong choices) + (pair) + (player): views that confuse more, and how much each player differs from the pooled rates (observed / expected, with the player's own effect as an odds ratio beside it).
6. **Learning curves**: right ~ log(1 + answers on the genus) + after a miss (on the genus shown or given wrongly, as the app counts it) + Again asked after it + typed + exam + comeback + (player) + (genus) + (0 + practice | player) + (0 + practice | genus) (from `AV` 11: each player's and each genus's own learning slope around the common one, uncorrelated with its level, the practice centred on the answers' mean so each level is the level at typical practice; `lnFit`, `factor` with weights, `glmm` with the exact curvature of a slope's level; Pierre, 2026-11-04, ROADMAP "Analyses: next views", per-genus learning slopes; 2026-11-05, the profiles' learning slope); their spreads (`sd_gslope`, `sd_pslope`, read as the gain from twice as many answers either side of the common slope; exploratory, never primary as every SD); answers to reach 80% beyond guessing, overall and per genus, each genus at its own slope (0 when the start is already there; its interval from draws of the intercept and the slope together, and of the genus's own level and slope). The first-meeting card and the side-by-side comparison leave no row in the answer log: not measurable yet (ROADMAP).
7. **Comeback**: after a right answer on a genus, right ~ offset (that answer's expectation) + log(1 + days since) + (player): the forgetting slope; and the comeback questions' right − expected (the FSRS curve of "Comeback after a break").
8. **The rank asked** (the fish; the fish parity review, #1056; the integrator, 2026-11-17, after Pierre's "Fais les choix tout seul si ils sont faciles à revenir dessus": a rank effect in the models rather than one report per rank, which would add sheet tabs; `AV` 15; `analysis.js` `rankOfUnit`, `rkLev`, `rankRef`; tests `tests/analysis-ranks.test.js`). A fish question asks a family (`f:` ids), a scientific genus (`g:`) or, since v161, a species unit (`s:`); each answer's rank is read from the unit's id prefix, else the log's Rank column (sheet v60), else the subject's own rank. For a subject with a sheet per rank (`SUBJECTS` `sheets`: the fish; the sea slugs too once they have a report), the reference is the rank of its game units from the start (the fish's families), and each other rank with 20 answers or more gets a 0/1 column, its questions against the reference's, in every model with a unit-level term: **Response time** (log seconds), **Photo factors** (difficulty), **Confusions** (log-odds of a mix-up per offer; a question's choices stay within its rank, so a pair has one rank) and **Learning curves** (log-odds of a right answer, with **Answers to reach 80%** on a typical unit of each rank, `n_rk_*`). The unit's random effect then varies around its rank's mean; where a view lists units (seconds by unit, answers to 80% by unit, the Wright map, each unit with practice, the pairs most mixed up), each unit's own value carries its rank's coefficient (its variance added to the unit's), and the admin draws each rank's units apart under "Family / Genus / Species questions". **Formats** (no unit-level term: each format against the app's own log-odds) gains each rank's right answers against the app's expected chance (`oe_rk_*`, every format together), as the app's Elo carries a rank offset of its own. Not changed: Zoom, Comeback and Time and difficulty's first part (the app's expected log-odds as an offset, the rank's offset in it), Time and difficulty's second part (its question is the photos' time intensity; the unit's random effect holds its rank's mean there), Sessions, and the profiles' features but the player's pace and learning slope (fitted with the ranks). The rank effects are exploratory (Benjamini-Hochberg); none is primary, so the primary family is the one chosen before any result. Assumptions: the rank is a unit-level covariate (each unit has one rank), identified between units, so its precision follows the number of units per rank, not the answers; the units' spread is the same in every rank (one variance component); the rank effect compares the same players' questions at different points of their path (genus questions come later, once a player has opened them), so a player's growth between those points is in the player's effect only as an average: in Photo factors, which has no practice term, a rank effect also holds what players learned meanwhile, and Learning curves (with practice) is its cleaner reading; the bootstrap is over players, not units, so the interval for a rank effect leans on the model's own (Wald) part, which counts the units' spread. Checked on a made-up fish log with 16 units of each rank and a planted rank effect (0.8 and 1.4 logit harder, 0.3 and 0.5 log seconds slower): the time shift comes back within 0.15, the difficulty inside its 95% interval in the planted order, each rank's right − expected near 0 (the made-up app knows the rank); on the corals (one rank) every result is the same as before, also against `main` on a fixed made-up coral log (byte for byte, but `AV`).
Two views show how effects and genera relate (the multifactor visualisation study of 2026-11-05, `docs/reviews/2026-11-05-multifactor-viz-study.md`, Pierre's Q70-Q77; tested on planted structure in `tests/analysis-verdicts.test.js`):

- **Effects hard to tell apart** (`entOf`, every analysis with two effects or more from one model): the correlation of the estimates, from the fixed effects' covariance marginal over the random effects (the model's own, `cov2cor(vcov(fit))` in R; signs follow the effects as reported, so two difficulties keep their sign); the correlation of the conditions in the answers (the design matrix's columns) and each condition's variance inflation factor over every condition of the model (VIF, the diagonal of the inverse correlation matrix). Read in words past |r| = 0.6 for the estimates (read the two together: their sum is sure when r < 0, their difference when r > 0; each alone is not), 0.7 for the conditions (Dormann et al. 2013) and VIF 5. Formats: each format's guess rate against its difficulty, fitted together (`fmtFit` `cr`). With few players the Wald covariance understates the between-player part; the correlation of the bootstrap draws would include it (ROADMAP). From `AV` 13 (the study's later item for this view, "once there are 200 draws or more"), with 200 bootstrap draws or more (the latest milestone's 999), `rb`: the correlations of the effects' values over the draws, on the draws where every reported effect has one (`nb`): over the players, so it carries what the model's covariance, conditional on its random effects, leaves out; the admin reads it in place of the model's (the model's beside it in the table). `boot` keeps each draw's values from 200 draws (`ENT_B`). Tested on made-up draws (−0.894 planted, given back within 0.05; under 200 draws, the model's alone).
- **The mix-up map** (`mixMap`, in Confusions): similarity of two genera = the lower end of the 95% range of their pair's shrunk effect in the Confusions model (how much more often, at the least, they are mixed up than a typical pair, per offer: offers, not counts, which mirror the app's traps), 0 for a pair not clearly above a typical one or never offered, so chance alone makes no family; distance = 1 − similarity / the largest; average linkage (`hclust`, Lance-Williams, deterministic ties); families = the groups of two or more left when the tree is cut at 0.8 (`MIX_CUT`, `cutTree`). Each cell (shown → answered) carries its rate shrunk towards its pair's model rate by 20 offers' worth (`MIX_K`), so a direction shows only with many offers. Across: the 3 cells most mixed up between two families, 2 mix-ups at least, above a typical pair. The synthetic log plays look-alikes as mix-ups (`TRUTH.mix`: a look-alike offered is picked 4 times as often as another genus when the answer is wrong), so the demo's map has families. **Its stability** (`AV` 13, `mixStab`, `mixFams`; the study's later item: "bootstrap over players, cut only at a stable height"): in each bootstrap draw of the Confusions model, the draw's own families (the same cut); each family's best Jaccard with one of them (0 when none shares a genus), averaged over the draws; stable from 0.75 (Hennig 2007, as the player profiles' groups). The admin names the stable families as found again when the players are drawn again, the others as not stable yet; without draws (the demo) it says they are not checked yet. The cut stays at 0.8 (a stable height is read, not searched for: another cut is a choice for Pierre). Tested on the planted families (`tests/analysis-verdicts.test.js`: 3 strong families each found in all 30 draws; weak ones under 0.75).

**The Wright map** (`wrightOf`, in Learning): players and genera on the Learning model's one scale, the log-odds of recognising beyond guessing for a typical question: a player's place = the intercept + the practice slope at their own current practice (the median answers already given on the genus over their last 300 answers) + their own effect; a genus's difficulty = minus its own effect (the photos the app chose for it included). Level = about 50% beyond guessing; logit(0.8) above = the app's 80% target. Each place's likely range carries the intercept's and the slope's uncertainty with their covariance, beside the player's or genus's own effect (Codex review #620); a genus's chance is read for the typical player (median current practice, own effect 0). A snapshot of the bank's reach, not of the questions asked (the app aims near 80%, so it makes players and genera meet). **A second skill?** (`resOf`, Pierre's Q77: residuals, never a PCA of raw right / wrong answers): the genus × player table of standardised residuals after the Learning model (sum(right − P) / sqrt(sum P(1 − P) + 2) per cell, 0 when never met; players with 100 answers or more, genera met by 2 of them or more; each player's column centred), a PCA of the players' columns (genera as points, players as arrows). The first axis's share of the spread is set against the same share in 99 tables built from answer logs simulated from the fit itself (Linacre 1998, Raîche 2005; a share, as the simulated logs are not refitted). Descriptive, no verdict, outside the multiple-testing correction (a single check; making it a tested effect is a question for Pierre). Tested on a planted second skill (odd players better on odd genera, 0.8 on the log-odds: share 0.73-0.80 against at most 0.31 in the simulations; one skill: within them).

**Does it depend on …?** (interactions, `ixTest`, `AV` 10; the study's §5 item 6, and ROADMAP "Analyses: next views", confusions by view with a pair × view interaction): three interactions, each one omnibus test of its product coefficients. (1) **Enlarging × view** (`zoomIx`, in Zoom): the Zoom model plus each view's own level and its own effect of enlarging, against a colony photo (views with 30 answers and 5 enlarged or more); (2) **pair × view** (`confIx`, in Confusions): among the questions missed with choices only (`missRows`), each wrong genus offered is a chance to be the one picked, ~ view + log(choices − 1) + (pair) + (player) + the own effect of each view for the 6 pairs most offered on a colony and on another view (20 offers each); asked on every offer instead, a pair often mixed up shows a pair × view "effect" from the log-odds scale alone, since misses rise on harder views (on the synthetic log with no such effect: p = 0.001 on every offer, 0.68 on missed questions); (3) **format × practice** (`lnIx`, in Learning): the Learning model plus a two-choice level (Again, duels) and the practice slope of two-choice and typed questions apart from four choices' (formats with 100 answers or more). Each test: the Wald chi-square of the product coefficients from the model's covariance and, from 50 draws, from the cluster bootstrap's over players (199 draws at the latest milestone, 50 for the earlier ones and Recompute here: a covariance, not percentiles); the larger p of the two, as the wider interval elsewhere. **Exploratory**: each is one more test in the Benjamini-Hochberg family (`correct`, `settleIx`; not primary: Pierre's primary effects are those of Q69). Verdict: *clear* at its adjusted p; *within the margin* when every product coefficient's 95% interval (the wider) lies inside ±0.25 logit; else *not enough data yet*, with the answers that would carry it to either if the pattern held (the chi-square grows with the answers; the intervals shrink as 1/√n). Each level's prediction (a linear combination of the fixed effects with its interval from the model's covariance, plus the pair's own effect and its conditional variance) is drawn level by level. Tested in `tests/analysis-ix.test.js`: planted (enlarging −1.5 on corallites; a look-alike's pull −3 on corallites for half the genera; typed answers' slope −0.6) each comes back below 1%, with the planted level the lowest; with none, each stays above 1%. Runtime: about a sixth more at the latest milestone (estimated from 60 draws on 7,200 synthetic answers, 2026-11-09: the three tests' fits took 28 s against 38 s for everything else). Not on the fish side for (1) and (2) while its photos have one view.

**Each genus with practice** (`gcurveOf`, in Learning, `AV` 11; the study's §5 item 7): per genus, right answers by the answers already given on it (the bins of the main curve) against the model's own prediction of the same answers; its own slope (common + its own, with the common slope's variance and its own conditional variance); its chance of recognising it beyond guessing for the typical player at their current practice (as the Wright map), the genera sorted by it. **Flat**: one-sided test that its slope reaches the smallest that matters (0.1 logit per unit of log practice), corrected over the genera by Benjamini-Hochberg at 5%: a lead (two forms to teach apart?), descriptive, outside the milestone's correction. Tested (`tests/analysis-slopes.test.js`): 4 of 16 genera planted with no learning (16 players of 900 answers): their slopes the 4 lowest (each under 0.3, the others' 0.55 planted), the genus slope spread clear (0.12 or more, under 0.06 without them); a spread planted on 30 groups (SD 0.3) comes back within 0.08. The spreads share the boundary problem of every SD (ROADMAP "Analyses: what the correction leaves open" (a)): with none planted they still read clear on some seeds (players: 0.05-0.09 on two). Not flagged on that log: a flat genus needs its slope's whole likely range under 0.1, which 900 answers a player did not give (the planted ones' upper bounds 0.2-0.56).

**Can we trust this model?** (model checks, `checkOf`, `checkLmm`, `AV` 12; the study's §5 item 8, and ROADMAP "Analyses: next views", leave-one-player-out paired log-loss): for each binary model (Enlarging, What makes a photo hard, Mix-ups, Learning, After a break, Sessions), each player with 20 answers or more left out in turn (their rows weigh nothing in the fit, `HOLD`, `predictOut`, which starts from 0, not from the full fit, so a coefficient only their answers move learns nothing from them: Codex review #831; their chance is averaged over the fitted players' own effects, level and slope, as for a player drawn from them, not read at the average player: averaged over the normal of the fitted spread instead, it over-predicted the generator's own mix-ups by 2-6 points in every band, this fit's spreads and intercepts being shrunk, ROADMAP "what the correction leaves open" (e)), from 3 players: the predictions of their answers in 5 bands of equal counts against what they answered (calibration); the randomized quantile residuals (Dunn & Smyth 1996: uniform when the predictions are right) at 11 probabilities; and, for the two models built on the app's own expected chance as their offset (Enlarging, After a break: the app's chance plus their corrections), the paired log-loss of the model against the app's chance with the players as the unit (each player's mean difference, their mean, a 95% t interval on players − 1 degrees of freedom, a sign-flip p: "Real-answer replay" below). A model without that offset knows nothing of a new player's level, which the app does, so it gets no comparison (on the synthetic log the photo model lost to the app by +0.039 per answer even with the app blind to the photos). Answer time: its standardized residuals in the fit at the normal's quantiles. Descriptive, outside the multiple-testing correction, as the Wright map. Tested (`tests/analysis-checks.test.js`): on the generator's own log every band within 6 points and every residual quantile within 0.03; enlarging planted at +1.5 (which the app's expectation leaves out) predicts new players clearly better than the app (the range below 0, p < 0.01), with no effect not; a player's predictions when left out are the same whatever they answered. Runtime: one fast refit per player per model, about the cost of 12 bootstrap draws each.

**Player profiles** (`profiles`, Pierre's Q70-Q73): a description of how each player plays, never named types (from about 30 players at the earliest: Dalmaijer et al. 2022). Each player's last 300 answers (all when fewer, `PROF_N`; under 100 the row is greyed and left out of the tree, the map and the groups, `PROF_MIN`; under 20 left out, `PROF_LOW`), and from `AV` 11 an eighth behaviour, the **learning slope**: the player's own slope in the Learning model (random slopes) fitted on all the answers (`slopeOf`: a slope needs the whole range of practice; fitted on the last 300 answers alone it did not follow the planted slopes, correlation 0.03 and 0.47 on two seeds, against 0.90 and 0.98 on all the answers). Seven behaviours, each net of what the app decided (`profFeat`, which takes any set of answers so a later trajectory analysis can run it window by window): answer time (the player's own effect in the Answer time model on those answers, a fast fit), enlarging (the share enlarged minus everyone's rate for the views shown), right beyond the app's expectation (right − expected), stopping after misses (the chance to end a session after 2+ misses in a row within it minus after other answers, each shrunk towards the pooled rate by 10 answers' worth, `PROF_K`; open sessions left out), session length (median answers, log; a session cut by the window's start left out unless it is the only one), sessions a week (log, over the window, at least a week), evening play (share of answers from 17:00 Manila). The learning slope (Q72, "when fitted"): from `AV` 11, the eighth behaviour above. z-scores over the players with a profile (a behaviour every player shares reads 0, its spread taken as none under a billionth of its size: Codex review #604, the rounding of the mean read ±1 SD); Ward's tree on them; the behaviours ordered by average linkage on 1 − r; a PCA of their correlations (Jacobi, `eigSym`), each axis's sign set so its largest loading is positive. Groups: the tree cut into 2 to 5 where the average silhouette is best (`cutK`, `silhouette`); stability (Hennig 2007): each group's best Jaccard in every run with one player left out ("kept" counts the runs where every group reaches 0.75, `PROF_STAB`) and its mean over 50-200 bootstrap draws of the players (each draw re-standardised and clustered with its multiplicities, the groups compared as distinct players); stable only when every leave-one-out run keeps every group and each bootstrap mean reaches 0.75 (Codex review #604: the leave-one-out means alone hid runs that changed the groups); unknown, never "not stable", when no leave-one-out run can be grouped (3 players). Tested on two planted styles (`tests/analysis-views.test.js`).

8. **Sessions** (30 minutes without an answer ends one): Kaplan-Meier of the length (open sessions censored) and a discrete-time hazard, stop after this answer ~ wrong + 2+ misses in a row + expected difficulty + slow (against the player's usual) + log position + (player).
9. **Time and difficulty** (Pierre, 2026-11-08; `tdiff`, `tdFeat`, `AV` 9; "Response time as information on difficulty" above): the reverse of Response time and Zoom. Before each answer, the earlier answers of other players on its photo (the question's first photo): their right answers' z (log seconds minus their own median over their earlier timed answers, from the 11th; typed and enlarged answers out) and their enlarging minus their own habit so far, each the photo's mean shrunk by `TD_K` = 3 answers' worth; right ~ offset (the app's log-odds, its photo rating included) + slow + enlarged + (player), with each question's guess rate. Then the time intensity beside difficulty: log seconds ~ right + typed + enlarged + 2 choices + (player) + (genus) + (photo), and right ~ the photo's time intensity + typed + 2 choices + (player) + (genus) + (photo). The genera's and the slowest and fastest photos' time intensity beside their difficulty from the accuracy alone (a third fit, no covariate), their correlation over the photos with 3 timed answers or more and the genera with 5 (descriptive; shrinkage lowers it); right against expected by the others' speed (faster, about, slower than their usual: ±0.1). The others' features are fixed in the bootstrap (it resamples the answers' players, not the features' sources). The genus's time intensity is not tested: beside the genus's own effect it is not identified with a few dozen genera. Tested on a planted link (`TRUTH.td`: `link`, the photo's time per logit of its own difficulty; `blind`, the share of that difficulty the app's expectation misses): both effects come back, none without the link, and others' time adds nothing when the app already knows the photo. Corals only, as every analysis (the replayed subject).

## Considered and not adopted

- **First answer per photo only** (Papoušek 2014): standard for prior knowledge, where people already know the facts.
  Our players learn the corals in the app, so the first answer is the noisiest and later informed ones would be dropped.
  Tried in v17's first draft; Pierre rejected it, replaced by the experience weight and the history-aware repeats.
- **Urnings**: principled standard errors and robustness to adaptive selection; heavier to build and to run in the sheet
  script. To revisit if the photo ratings drift (the variance inflation "Keeping Elo alive" describes).
- **Coded tracks or tiers** (beginner / RA / expert modes, a fixed genus order, fixed difficulty per genus): ruled out by
  Pierre. Every threshold above is continuous or performance-driven.
- **Time between sessions** for progress, mastery or ability (spaced-repetition days, decay, a "refresh"): ruled out
  (rule L1). Two exceptions: time to plan the questions after a break (the comeback above), and photo memory (Pierre,
  2026-11-09, Q317: the time since a photo was last shown may set how much a new answer on it is expected to owe to
  memory of that photo, never a decay of progress, mastery or ability, never a delay or gate; "Photo memory"). The seconds
  taken to answer are not time between sessions (Pierre, 2026-11-04, rewording rule L1): they are evidence about that
  answer, and since rules version 4 they weigh how much a right answer moves the ability ("Response time"); never a
  decay, never a penalty for being slow on its own.
- **Answer time compared within the same question format** (2026-11-04, not adopted). A Duel-tab run (P1) where the
  time weight raised two genera's ability fast (fast 2-choice answers against a 4 s overall median) prompted it. On the
  real log (1,580 answers, 10 players, `tools/abilityeval.js`, paired next-answer log-loss against no time weight,
  ×10⁻³ ± SE): the current pooled rule −2.59 ± 0.98; split 2-choice / 3+-choice −1.40 ± 0.67 (with a fallback to the
  pooled median −1.76 ± 0.70); split Duel tab / rest −1.44 ± 0.55; weight capped at 1 −1.22 ± 1.04; no weight on
  2-choice questions −0.71 ± 0.36. Against the current rule every variant is worse (+0.8 to +1.9). In the quiz a
  2-choice question is not answered faster than a 4-choice one (4 of 6 players slower); only the Duel tab is fast. No
  variant predicted the run's collapse (all expected 0.76-0.80 on the photos given). Kept: the pooled median (`RTIME`,
  `rtWeight`).

## Real-answer replay (`tools/abilityeval.js`): judging a paired difference (2026-11-05)

The replay's last table compares each rule with the first one on the same answers: the paired difference of next-answer
log-loss (negative: the rule predicts better). The answers cluster in players (about 10 players, about 150 answers
each), and a player's answers are correlated (same person, same habits, a learning path over time), so a standard error
that treats the answers as independent is too narrow: the stats study (`docs/reviews/2026-11-05-stats-methods-study.md`,
PR #580, §0 point 4 and §5.2) estimates about 1.6 times too narrow with even a tiny correlation within a player (its
estimate; the correlation is unknown). **Players are the unit of inference** since 2026-11-05:

- each player's own mean difference d_p over their answers in the row, then the plain mean of the d_p (each player one
  vote: a player with 400 answers weighs as much as one with 20);
- a 95% t interval on players − 1 degrees of freedom (the standard error of the d_p over the players);
- the two-sided p of a sign-flip test over the players (each d_p's sign flipped at random; exact, every pattern, up to 16
  players, else 9999 draws from a fixed seed, so a run gives the same p every time). With 10 players the smallest
  possible p is 2/1024 ≈ 0.002; with 5 it is 2/32 = 0.0625, so 5 players can never give p < 0.05.

The 'all' row is the primary measure; the group rows (number of choices, level bands, response time, after a false
alarm) are exploratory: many rows, no correction for their number. The former figure per answer (the mean over the
answers, which is the answer-weighted mean of the d_p, ± a standard error that treats the answers as independent) stays
as a second, descriptive table, so the two can be compared; it is not a test. A percentile bootstrap over players was not
chosen for the interval: with about ten players it under-covers (Cameron, Gelbach & Miller 2008), and the wild cluster
bootstrap of a mean with Rademacher weights is the sign-flip test above. `tests/ability.test.js` checks it on a made-up
log with one dominant player (400 answers better with the second rule, five small players worse): per answer the
interval is [−0.0148, −0.0120] (a clear gain), with the players as the unit [−0.008, +0.020], sign-flip p 0.34.

Figures recorded in this file before 2026-11-05 as "paired log-loss difference per answer ± its standard error" (and
"× 10⁻³ ± SE") are the per-answer figure: read their intervals as too narrow, and "n standard errors" as fewer.

## Validating a learning change (rule L11; validated by Pierre on 2026-11-08, #735)

Pierre, 2026-11-08: the engines and the simulations moved a lot these last days, so the way a change is validated must
still fit what was built, and follow his suggestion: a fully rated world where photos, players and every unit (coral
genera; fish families, genera, species) have continuous Elo difficulties or abilities drawn from stated distributions,
with the engine running on them. What the check was until now, and where it no longer fits (each point checked in the
code or the docs unless marked *inferred*):

- **One world, the real data's.** `tools/learnsim.js`'s learner reads each photo's difficulty from the app's own
  estimate (`photoDiff`; for the fish, the judged-ease prior) unless `--truth` is given, so a change to the estimate
  changes the world too ("Limits" below). No unit difficulty unless `--stats` carries the sheet's offsets; no player
  ability spread (each profile is one fixed player; the spread is the draws'). `--truth gen` gives photos a normal spread
  around their genus, the corals only (*inferred* from its code: it reads the coral views).
- **Profiles built for the corals.** The four profiles know every 5th unit in data order (`i % 5 < m`); `--subject fish`
  plays the same four on the fish units. No casual diver (common names only), no IMR RA who knows the IMR families, no
  lecture RA for fish, no names choice.
- **Learners whose teaching ignores the photo.** The item learner gains `rate × (1 − know)` after a right answer and
  1.5 times that after a miss (`MISS`; the genus wrongly picked 0.5 times, `PICKED`), whatever the photo: a photo
  diet changes what it learns only through which units are asked and how often it misses, so easier photos, fewer
  misses, teach it a little less, never because the photo itself was clearer. The scratch rated world of 2026-11-08
  ("Fish: the global score, built") learns by the number of answers alone, so there only which units are asked
  counts.
- **Measures of the old yardsticks.** `knowSlate` (success on an average photo among choices), `progGap` (bar − that
  know: the judge's D\* replaced it for the bar), `prog` (the fish % as the families' mean, not the global score of
  Q242), units met. Nothing on the per-unit levels (Open Water, Advanced), the global score and its components, plateaus,
  the hard-photo share before Open Water (a run field since #729 only) or the photo exposure that rates the photos.
- **A horizon of the families only.** 300 questions; a fish run takes about 1 minute per worker (checked on 2026-11-08:
  30 runs of 300 questions in 867 s on 2 workers), so the tree (genera from a family's Open Water or Advanced, species,
  circle 3 at 55% of the circle-1 Entries) and the score's later shape (10,000-100,000 answers) are out of its reach.
  `tools/fishscore.js` kept the formula of 2026-11-04 on the old moving-average bar (retired since: the rated world gives
  the score's shape on today's engine).
- **Margins never set.** Rule L11 asks for guardrail margins "set once in LEARNING.md"; PRs have used the statistics
  study's examples (true knowledge 0.02, genera met 2, §3.2 "for example"). A pacing measure the change is meant to move
  then reads as a breach (#729: units met at 300, expert −2.8).

**The two worlds.**

| | The app world | The rated world |
| --- | --- | --- |
| Tool | `node tools/learnsim.js [--subject fish]`, the real app in Chromium | `node tools/learnsim.js --world rated [--subject fish]` (`tools/ratedworld.js`) |
| Photos | the real pools, the app's estimate or `--truth` | d = μ(unit) + ε, ε ~ N(0, 0.46²) (the coral photo spread of the Analyses tab); heavy tails: 15% of the photos +1.5, or a scaled t with 3 degrees of freedom; judged ease e = round(3 − (ε + N(0, 0.35²)) / 0.5) on 1-5 |
| Units | the sheet's offsets with `--stats`, else 0 | fish: family μ ~ N(0, 0.37²), +0.5 in a declared look-alike group; genus and species μ ~ parent + N(0, 0.3²), +0.3 with siblings; corals: genus μ ~ N(0, σ²), σ the spread of the sheet's `gd` (to measure) |
| Players | one fixed player per profile | an ability offset π ~ N(0, 0.5²) per run |
| The app's estimates | its own | told the truth ("fully rated"), or its own Elo |
| Learner | item (default), field, exemplar | by the number of answers, and one whose gain depends on the answer and its feedback (as the item learner's) |
| Horizon | 300 questions (600 when the change acts later) | 3,000 answers at level 2 (10,000 when it touches genera, species or the score's shape), 30,000 at level 3 |
| Speed (checked 2026-11-08) | about 1 minute per 300-question fish run per worker | about 4 s per 300 answers and 80-160 s per 3,000 per worker on a loaded machine (the app's own `photoSet` on pools of up to 1,600 photos); the scratch harness, which did not run it, took under a minute for 4 × 20 × 2 × 3,000 |

The rated world mimics `model.js` (the aim, the start's lean, the Gaussian photo choice, typed questions, `drawW`,
`OPEN.K`, a card every 2 answers, at most 3 openings in 15, `RARE`) and runs the real `core.js` (`domStep`,
`treeScore`); its learnsim mode loads `model.js` `photoSet` in Node as `tests/rareease.js` does, so the draw is the
app's own. It is anchored on the app world where both reach: at 1,000 fish answers the fish % and the right rate within
a few points (2026-11-08: 41% and 37% against 40% and 28%; 75-81% right against 77-86%).

**Long rated runs: the false-alarm table** (2026-11-15, after #975's 10,000-answer check could not end in the workflow's
6 hours: 34 minutes a run with the species in). Every unit's bar reads its false-alarm rate (`core.js` `faOf`), which
scanned every record of the player's progress, and the planner reads the bars of every unit in play several times an
answer: the cost grew with the units met times the units read, and the scan was the largest single part of a profile
(23-29% of the time on their own, 36-45% with the bar around them; fish, `main` and #975, 1,000-3,000 answers). The
rated world now arms a table for each answer (`core.js` `faArm`, `tools/ratedworld.js` `step`): the first read builds
every unit's false alarms and chances in one pass over the records, in the scan's own order, so each value is the
scan's to the last bit, and `scoreAnswer` empties it. The app and the sheet never arm it and scan as before. The same
seeds give byte-identical `--out` files (the date, commit and run time aside) and reports, and every read of a run can
be checked against the scan (`FA_CHECK`, `tests/faof.test.js`). On the shared machine a 3,000-answer fish run of the
expert (seed 1, without #975's species) took 35 s against 139 s with the scan.

**The rated world, built** (`tools/ratedworld.js`, `--world rated`; the distributions in its `RATED`, the one place they
are stated). The fish units are built as the app builds them (`core.js` `fishGen`, `fishPhotos`, `app.js` `fishGenera`
cut out as `tests/rareease.js` cuts `model.js`): 65 families in three circles, the 237 scientific genera (every circle's since 2026-11-18; 130 before), every game photo.
A seed draws its world: each unit's μ and each photo file's ε (above), the photo's judged ease from ε, the player's π
(each genus's and species' μ on a stream of its own, keyed by its id, since 2026-11-18: a version with more or fewer
units plays the same photos and the same other units, so the arms stay paired);
the same seed gives the same world, so two versions of the app compare on it. `model.js` runs whole in a Node vm, with
the app's globals it reads written around it (the units, the photos, `pool`, the circles' gates, the scientific
genera's set, an in-memory store), and `core.js` `scoreAnswer` scores each answer as the game does (the Elo, the
domain-score bar, the global level, rule L2), so the aim, the start's lean, `photoSet` (Gaussian choice, `RARE`, the
floor), typed questions, `drawW`, `shaky`, `openChance`, `openPace`, `openRight`, `openPick`, the opening hold and the
exam are the app's own. Only the planner is written there, as `quiz.js` `planPhoto` reads: the first cards, a card when
the path allows one, a unit opened on a card asked once ready, the target by `nextTarget`, the choices by
`distractors` with the traps `trapsFor` asks (the plausible choices `plausibleK` count while the traps are fewer than 2,
every choice after), the photo aimed lower by the opening hold's ease and the player's own mix-ups (`holdEase`,
`confTerm`), the last two observations held back (`s.ro`), the exam questions by `examSet` and `examTyped`. Not in it: the Again after a miss, the
duels slipped into the quiz, the comeback and breaks, the surprise cards. `--app truth`: `photoDiff` gives each photo's
true difficulty and the unit offsets make `genusDiff` give each unit's μ; `--app own`: the judged-ease prior alone (no
photo statistics, as the fish today); `--app sheet` (2026-11-09, `runPop`; the corals only: a fish photo is shared by a family's and a genus's questions,
with two true difficulties): the sheet's photo Elo simulated. The profiles' players, one each, play the seed's world in turn; their answers are logged with simulated seconds (`RT`:
log t = log 6.5 + the photos' time intensity β − the player's speed τ − 0.4 if right + log 1.5 if typed + `--gap` × the
learner's true logit + noise; `--times` sets β: `rho25`, `rho0`, `views`, `fast`, as "Q315 option 1: what three rounds
showed" describes); every `--every` rounds `core.js` `eloOf`, `genusOffsetsOf` and `photoMemOf` are replayed on the log
and served to every player's app (`PSTAT`, `PGD`, `PMEM`), and the file's `pop` holds, per seed, the served ratings
against the truth at each checkpoint (`rateErr`, the centred root mean square error; weighed by answers; the
correlation; the genus offsets' `gdErr`), which learncmp reads as population measures, one value per seed (an exact
sign-flip over the seeds). `--dist normal|tail|t3`. Circle 3 stays
closed unless `--beyond yes`, as in the app world (its offer left unanswered). The scientific names' offer, once a family
is at Advanced, is accepted, except by the casual diver. The learner: the profile's know per unit (`tools/learnprof.js`,
as the app world), the run's π, recognition sig(logit know + π − d − 0.5) on the true difficulty d of the photo shown,
else a guess among the choices (typed: "I don't know" half the time); it learns by the number of answers (rate × (1 −
know) per answer on the unit and per card). D\*: its mean chance on each of the unit's game photos alone. Rows hold what
learncmp reads (`dStar`, `knowSlate`, `met`, `right`, `prog`, `f`, `kinds`, `score`, `plateau`; per run `owAt`, `advAt`,
`c3`, `expo`, `preOW`), at the guardrails' checkpoints (100, 300, 1,000, 3,000, 10,000, 30,000) up to the horizon.

**The corals** (2026-11-08, step 5): the coral units as the app builds them (`core.js` `applyCuration` and `applySlots`,
`app.js` `applyForms` and `imrFormsOf` cut out the same way; the extra genera, Millepora and the bonus genera, too): the
40 genera of the slate and the bonus genera, their game photos in their three views (a question shows those
`photoSet` picks; one view alone is the single-view case). Each genus's μ ~ N(0, `RATED.CORAL_GD`²), **0.286: the SD of the
sheet's genus offsets `gd` as #637 measured them with the photos rated against the genus ability (Q136); 0.370 with
today's rating against the level, the sensitivity variant (`--coralsd 0.37`)**; no photo has a
judged ease, so the share under ease 4 is not measured there. The bonus genera are offered once every slate genus is
met and accepted, as in the app world; there is no global score, so the shown score is the units' mean (`progPct`).
**The learners**: `--learner count` (the default), by the number of answers, as above; `--learner item`, whose gain
depends on the answer and its feedback, as learnsim's item learner: a right answer teaches rate × (1 − know), a miss
1.5 times that (`ITEM.MISS`), the unit wrongly given 0.5 times (`ITEM.PICKED`), a card as one right answer.

```
node tools/learnsim.js --world rated --subject fish --seeds 10 --questions 3000 --out before.json [--dist tail] [--app own]
node tools/learncmp.js before.json after.json --primary score@3000:up
```

**The anchor** (2026-11-08, fish, at 1,000 answers; the rated world told the truth, normal photos, 5 seeds, π −1.26 to
0.25; the app world on main with the same profiles, 2 seeds, `--choice auto`; #787, #789):

| Beginner / lecture RA | Rated, count learner | Rated, item learner | App world (item learner) |
|---|---|---|---|
| Score shown | 31.6% / 36.6% | 33.6% / 38.2% | 37.0% / 41.0% |
| Families at Open Water | 17.8 / 24.6 | 23.0 / 28.0 | 32 / 32 (every circle-1 and circle-2 family) |
| Families at Advanced | 2.6 / 5.4 | 4.2 / 7.2 | 14 / 16 |
| Right %, answers 301-1,000 | 77% / 77% | 79% / 81% | 93-95% |

The score agrees within 3-5 points, on the low side; the levels and the right rate lag in the rated world (its learner has
no photo memory, the world adds the units' μ and the player's π, a guess is uniform among the choices; the causes not
measured one by one). So the rated world compares two arms within itself, as the protocol pairs them; its levels and
right rates are not read against the app world's.

**The score's shape** (2026-11-08, the rated world, fish, told the truth, normal photos, count learner, `--beyond yes`, 2
seeds, π −1.26 and 0.05; the shown %, families and genera at Advanced):

| Answers | Lecture RA (both names) | Casual diver (common names only) |
|---|---|---|
| 100 | 10.5% | 9.0% |
| 300 | 21.0% | 18.5% |
| 1,000 | 35.5% (2 families) | 31.5% (2.5 families) |
| 3,000 | 48.5% (31 families) | 46.5% (40.5 families) |
| 10,000 | 63.0% (60.5 families, 53.5 genera) | 50.0% (64.5 families) |

Fast at the start, slower after, as Q242 asked. The casual diver stops at 50%, the families' share once every family is
mastered: with no species or common-name unit yet, a player who declines the scientific names has no credit left to
earn, so the last 6,000 of its 10,000 answers are one plateau (6,277 answers). The lecture RA's genera carry it to 63%.
This replaces `tools/fishscore.js` (the formula of 2026-11-04 on the old moving-average bar).

**Profiles** (the same list for both subjects where it applies; in the rated world each run also draws π). The two IMR
levels are those used so far (learnsim's `lectureRA` and `strongRA`, the first-launch answer "IMR course", the
re-simulation's IMR RA):

| Profile | Who | Corals | Fish |
| --- | --- | --- | --- |
| Beginner | knows nothing of the subject | every genus at 2% | every family at the floor; both names |
| Casual diver | a diver who knows the common fish by sight, wants their common names | - | the common families a little; common names only |
| Lecture RA | an RA who has just had the IMR lecture: knows the course's names and groups, has practised little | the lecture's genera at 55%, the others 10% | the IMR families half known; both names; the IMR genera from Open Water (#720) |
| Strong RA | an RA with practice behind the lecture | 3 genera in 5 at 85%, the others 10% | the IMR families and their genera well known; both names |
| Expert | knows nearly everything | every genus at 93% | families and genera well known, species partly; both names |

Built in `tools/learnprof.js` (one list, loaded by learnsim in Node and in the page; the rated world reads the same list),
never by data order. The default list of a subject is every profile with a part for it (`--profiles` picks others;
`strongBack` and `spotty` stay by name). Corals: the lecture RA knows the 34 genera numbered on the IMR slate at 0.55;
the strong RA the IMR lecture groups in the course's order until 60% of the slate is covered (groups 1 to 7, 26
genera with their starred look-alikes) at 0.85; the others 0.1. Fish: the lecture RA knows the circle-1 families at
0.5 and their IMR genera too (`imrg`); the strong RA the circle-1 families and every genus of theirs at 0.85; the others
0.1; the expert every family and genus at 0.93; the beginner everything at 0.02; the casual diver, at 0.3, the most
common families near Dauin (their weights in the global score's tree) until they carry half of the weight, the rest at
0.02, and declines the scientific names (Not now on the set's offer). First-launch answer with `--choice auto`: the
casual diver "new". Learning rate as before (0.12; the expert 0.05).

**Measures** every run reports (the guardrails among them in the table below):

- per-unit knowledge: the judge's D\* (one photo alone, no choices, over the unit's photo distribution), by kind of unit
  (families, genera, species by common and by scientific name), and the bar against it, E = bar − D\*;
- the global score as shown and its components (`core.js` `treeScore`: Entries, Genera, Common names, Scientific
  names, credit; by circle), at each checkpoint;
- the levels: the answers to the first unit at Open Water, units at Open Water and at Advanced by kind at each
  checkpoint, the answer at which circle 3 opens;
- plateaus: the longest stretch of answers without one more point of the shown score;
- the photos: the share under ease 4 among the questions on units under Open Water, and the photo exposure that rates
  them (answers per photo, answers on photos under ease 4);
- right %, the Elo error against D\*, units met, `open/15`.

**Guardrails and margins** (Pierre's "smallest change that matters", in each measure's units; one-sided 90% bound of the
paired difference on the side of harm; validated with #735):

| Guardrail | Checkpoints | Margin | Why this margin |
| --- | --- | --- | --- |
| True knowledge (D\*, or `knowSlate` in the app world) | 300 and 600 questions; 1,000 and 3,000 answers | −0.02 | 2 photos in 100 named less well: the statistics study's scale, and below what a player can feel |
| E = bar − D\*, the over-claim side | the same | +0.03 | the bar must not promise more than the player can do; 3 points of a bar is about the smallest step a player reads |
| The global score as shown | 1,000 and 3,000 answers (rated world) | −1 point | the % is shown rounded to the point: one point is the smallest change a player sees |
| Answers to the first unit at Open Water | the run | +20% or +10 answers, the larger | the first level is the hook; a wait a fifth longer is felt, 10 answers is a short session's worth |
| Units at Open Water | 300 questions; 1,000 answers | −2 units or −5%, the larger | two families or genera fewer is what a player sees on My progress; 5% scales it to a large set |
| Longest plateau of the shown score | the run | +20% | Pierre's "fast at the start, slow after", without a flat stretch a fifth longer |
| Share under ease 4 before Open Water | questions 1-300; answers 1-1,000 | +0.05 | half of the 0.1 Pierre set (Q252): a change must not undo half of it unnoticed |
| Units met | 100 and 300 questions | −2 units or −5%, the larger (corals: −2 genera, as before) | the pace of new units, as the CI test reads it; two units is a card or two a session |
| Fish families at Advanced (`famAdv`) | 300 and 600 questions; 1,000, 3,000 and 10,000 answers | −2 families or −5%, the larger | the families' pace while genera and species share the draw (#892, 2026-11-15); the margin of the units at Open Water |

None comes from the seeds' spread, which only sizes the seeds. A change meant to move one of them declares that cost
and its accepted bound before running (rule L11).

**Levels and runtimes** (rule L11: the PR declares the level, the integrator checks it):

| Level | App world | Rated world | Time (checked 2026-11-08 unless marked) |
| --- | --- | --- | --- |
| 0 | - | - | the CI |
| 1 | the subject touched, its profiles × 5 seeds × 300 questions | - | corals about 2 minutes on 4 cores; fish about 5 minutes per arm (*inferred*) |
| 2 | as level 1 | 10 seeds per profile (20 if a result is near a margin) × 3,000 answers (10,000 when the change reaches genera, species or the score's shape), normal photos and one heavy-tailed variant | the rated world under a minute |
| 3 | 30-40 seeds, sized from the spread seen | 40 seeds × 30,000 answers, both distributions | fish app world about an hour for both arms on 2 workers, so a manual GitHub Action; rated world about half an hour on 4 cores (*inferred* from a 10,000-answer run) |

A large expected effect (several times its margin) is read at the level's fewest seeds; more seeds only when a result is
near a margin. Neither world belongs in the hourly analyses Action (its 2 hours serve the real log).

**Commands.** Each arm runs on the same seeds, then `tools/learncmp.js` pairs the two files and judges them (offline,
under a second; `--list` prints its measures and guardrails):

```
node tools/learnsim.js --subject fish --out before.json          # on main; the change's branch: --out after.json
node tools/learncmp.js before.json after.json --primary hard@300:down [--cost met@100:-3] [--looks 2] [--json r.json]
```

It pairs the runs by (profile, seed) and prints, ready for the PR: the primary (`MEASURE@CHECKPOINT:up|down`, declared
before running), the stratified sign-flip pooled over the profiles (each pair's difference over its profile's root mean
square difference, a scale a sign flip leaves unchanged so the test stays exact; T the sum; two-sided p, exact up to 20
pairs, else 100,000 draws from seed 1, as #729 read it), clear when p ≤ 0.05 / looks and T goes the declared way, and
only then each profile's paired t under Holm; then every guardrail of the table above at the checkpoints both files
reach, per profile: before → after, the paired difference and its one-sided bound at 1 − 0.10 / looks on the side of
harm (paired t), held, unclear or breached, and the before/after correlation r in `--json`. A guardrail is judged against
its margin ("the larger" against the before mean of that profile; the corals' units met against 2 genera), or against
the bound a `--cost` declares. Settings that differ between the files are printed, runs in one file only are left out.
A guardrail with no valid pair (the share under ease 4 on the corals, whose photos have no judged ease) is listed as not
measured, never held.

What learnsim measures for it (each run's rows at the checkpoints, `tools/learnsim.js` header): `kinds`, per kind of
unit (the subject's rank for its slate, `rankOf` for a set's units such as the fish scientific genera, the corals' bonus
genera apart) the units, those met, at Open Water and at Advanced, D\* and E = bar − D\* over those met; `score`, the
shown score (`headPct`) and, for the fish, its components (`treeScore`: entries, genera, common, scientific, S, credit,
raw, by circle); `plateau`, the longest stretch so far without a new high of the shown score; per run `owAt` and `advAt`
(the answer at which each unit first reached each level) and `c3` (circle 3 offered, met); with `expo` and `preOW`, the
photo exposure. learncmp's measures (`--list`): `know`, `over`, `met`, `hard`, `score`, `entries`, `credit`, `firstOW`
(the first unit at Open Water, the corals' bonus genera left out; a run where none got there drops its pair), `unitsOW`,
`unitsAdv` (every kind but the bonus genera), `plateau`, `c3`, `hardAns` (answers on photos under ease 4, any level),
`perPhoto` (answers per photo shown), `genShare` (the share of answers on the fish scientific genera, a fish run only: Q208, 2026-11-09), `famAdv` (the fish families at Advanced) and `spShare` (the share of answers on the fish species; both 2026-11-15, the species level), `right`, `prog`, `thErr`. The species units (kind `species`) are in both worlds
since the species level (step 1, by common name); the scientific species names do not exist yet. After the guardrails,
learncmp also prints, with no margin, the right %, `genShare` and `spShare` at each checkpoint (its `WATCH`), with the
one-sided bounds either side.

**On a GitHub runner** (tier 2 and level 3, too long for the shared machine): Actions › "Learning check (tier 2)" › Run
workflow (`.github/workflows/learncheck.yml`, manual dispatch only), with the version with the change (`after`: its
branch), the one to compare it with (`before`, `main` by default), the subject, the world (`both`, `app` or `rated`; the
rated world from the version that has it, ROADMAP "Validation tools", step 4), the seeds, the questions (app world) and
answers (rated world), the primary declared before running (`hard@300:down`, empty for guardrails only) and the world it is read in when both run
(`primary_world`; the other world reports its guardrails), the looks and
any other learnsim option (`--profiles beginner,expert --dist tail`). It runs learnsim on both versions with the same
seeds (4 workers), then `tools/learncmp.js` of the version with the change, and puts its report in the run's summary;
it commits nothing and keeps no artifact. With `gh`: `gh workflow run learncheck.yml -f after=<branch> -f subject=fish
-f primary=hard@300:down`. Inputs are checked against narrow patterns before any command reads them.

**First run: the cap under ease 4 before Open Water** (#729, `RARE.SHARE` 0.1; level 2: it changes the fish draw for every
unit under Open Water; exploratory, the protocol not yet
approved; the rated world by the scratch harness with the cap mimicked as `rareCap` does, 4 profiles × 20 seeds × 3,000
answers, told the truth; the app world re-read from #729's own 5-seed runs, 5 seeds × 300 questions). Paired
difference, in brackets its one-sided 90% bound on the side of harm:

| Measure | Rated world, normal photos | Rated world, heavy tails (15% +1.5) | App world (#729's runs) |
| --- | --- | --- | --- |
| **Under ease 4 before Open Water** (primary) | 27-51% → 9-10%, 80 of 80 pairs down | 30-53% → 9-10%, 80 of 80 | 20-40% → 9-10%, 19 of 20 |
| Answers to the first family at Open Water | −2.1 to −0.6 (+8.0 worst) | −10.7 to +9.9 (+17.9 worst, IMR RA) | −6.0 pooled (−0.5) |
| Families at Open Water, 1,000 answers / 300 questions | −0.6 to +0.5 (−2.1 worst, expert) | −1.0 to +0.9 (−2.6, expert) | +0.05 pooled (−0.49) |
| Global score shown, 3,000 answers | −0.2 to +0.4 points (−0.6) | −0.4 to +0.3 (−0.7) | not measured (no genus bars in the runs) |
| Circle-1 Entries component, 1,000 answers / 300 questions | +0.002 to +0.007 | −0.009 to +0.010 | **−0.041 pooled (−0.063)** |
| True knowledge D\* of the families, 3,000 answers | −0.010 to 0 (−0.022) | −0.008 to +0.002 (−0.016) | (knowledge at 300: unclear, #729) |
| Longest plateau of the shown score | −13 to +33 answers (+53, about +16%) | −18 to +25 (+48) | - |
| Answers on photos under ease 4, answers 1-3,000 | −39% to −46% | −37% to −47% | - |

What it says: the primary moves as intended in every world and profile; the levels, the score and the plateaus hold
within the proposed margins, except the expert's families at Open Water at 1,000 answers with heavy tails (bound −2.6
against −2.1 for 5% of 42: unclear) and the IMR RA's wait for the first Open Water with heavy tails (bound +17.9 answers
against +12: unclear); in the app world the families' bars run lower (a right answer on an easier photo proves less to
the domain-score bar), about −0.04 of the Entries component at 300 questions. And one thing the families-only check
could not see: in the tree, every unit opened later (a genus, a species, a name) starts under Open Water, so 50-54% of
a player's first 10,000 answers are on such units (rated world, 10 seeds, the IMR RA and the casual diver), and the cap
cuts the answers on photos under ease 4 by about 30% over those 10,000 (IMR RA 5,582 → 3,904), not only in the first 300
questions: the rating of the hard photos (Q252) slows for as long as the tree keeps opening units. In the rated world
the learner learns by the number of answers, so its unchanged knowledge says nothing about whether easier photos teach less.

## Simulation (`tests/profiles.smoke.js`, CI)

Three players through the real quiz, 300 questions each (600 in the exploration). The learner model is ours, not the
app's: `know[g]` = chance to recognise genus g on an average photo (beginner 0.02, RA 0.55 on 2 genera in 5 and 0.1
on the others, expert 0.93), lowered on harder photos and single views; otherwise a guess among the plausible choices;
each answer teaches `rate` × (1 − know). The numbers show trends, not real players: recalibrate with real answers.

Until 2026-11-02 the quiz drew from the 39 genera of the IMR slate, and the 6 bonus genera (Millepora, Isopora,
Leptoseris, Heliopora, Sandalolitha, Pleuractis) opened one by one with the progress (at 10%, 15%, ... 35%, `BONUS_AT`)
and kept at most 15% of the draw. The tables below count the 39 (the first table of 2026-11-02 said "45", counting the
bonus genera by mistake). Since then Millepora is a slate genus (40) and the other 5 are opt-in: "Millepora and the
bonus genera" below.

Calibration of `OPEN.K` (Pierre, 2026-11-02: "600 questions and only twenty-some genera open for the RAs may not be
enough"), 600 questions, 3 seeds, genera met (beginner / RA / expert):

| `OPEN` | after 100 | after 300 | after 600 |
| --- | --- | --- | --- |
| K 3, P 0.6 (first) | 12-14 / 9-17 / 25-31 | 14-23 / 18-29 / 34-39 | 26-37 / 26-34 / 39 |
| **K 5, P 0.6** | 9-14 / 14-20 / 21-37 | 19-21 / 27-30 / 39 | 28-29 / 33-39 / 39 |
| **K 5, P 0.6 + online calibration (now)** | 11-15 / 10-15 / 29-31 | 18-25 / 22-23 / 39 | 30-36 / 32-38 / 39 |
| K 5, P 0.5 | 11-15 / 15-28 / 34-35 | 22-30 / 27-34 / 39 | 33-39 / 36-39 / 39 |
| K 6, P 0.5, READY 0.5 | all 39 by question 500 / all 39 by question 200-400 / 39 at 100 | | |
| K 5 + first-meeting cards (EVERY 3) | 12 / 8 / 17 | 15 / 14 / 37 | 25 / 26 / 39 (1 seed; genera asked) |
| **K 6 + first-meeting cards (EVERY 2, now)** | 12-15 / 12-14 / 25 | 18-20 / 17-19 / 39 | 26-28 / 28-35 / 39 (genera asked) |
| K 8 + first-meeting cards (EVERY 2) | 17-18 / 11-17 / 15-25 | 26 / 23 / 39 | 32 / 33 / 39 |

With the cards (2026-11-02) the choices are genera met, so a wrong answer no longer opens a genus never asked (before,
a beginner picking an unknown name as a wrong answer opened it: the earlier rows count those). K 6 brings the RA back
near the pace Pierre asked for while the beginner stays under 16 genera in 100 questions; the expert meets all 39 by
question 200-300 instead of 100 (one card every 2 answers at most). Runs vary by about 5 genera.

The switch to a slope (2026-11-02, Pierre: "35% with no shaky genus and 3% from 6, shouldn't that be better
calibrated? it deserves a test"; and "the simpler the algorithm, the better"). With the switch, a player sitting near
6 shaky genera flipped between 35% and 3% from one answer to the next, so the same player met 8 to 24 genera after 100
questions depending on the draws. Simulated with 6 seeds (11, 222, 3333, 44444, 555, 6666), genera met, mean ± sd
(beginner; weak RA; "lecture" RA, who knows 80% of the genera and a quarter of them only half; expert):

| `OPEN` | after 50 | after 100 | after 200 | after 300 | right at 100 |
| --- | --- | --- | --- | --- | --- |
| switch, K 6 (before) | 12.0 / 11.8 / 12.0 / 15.8 | 14.5±1.4 / 13.8±2.9 / 16.0±7.8 / 22.5±7.0 | 16.3 / 16.0 / 25.3 / 30.8 | 19.8 / 19.3 / 27.5 / 35.5 | 74-88% |
| slope, K 6 | 10.8 / 9.2 / 12.5 / 14.8 | 11.7±0.7 / 11.3±1.4 / 16.7±4.4 / 21.7±3.7 | 14.2 / 14.5 / 23.7 / 31.7 | 17.7 / 17.3 / 28.7 / 35.2 | 75-92% |
| slope, K 9 | 11.7 / 11.7 / 13.5 / 16.2 | 12.7±1.6 / 13.3±2.1 / 19.3±2.8 / 21.7±3.3 | 17.0 / 17.3 / 26.5 / 33.2 | 19.8 / 20.7 / 30.2 / 37.8 | 76-87% |
| slope, K 12 | 11.5 / 12.3 / 14.7 / 15.5 | 14.5±1.0 / 15.7±2.2 / 19.8±2.0 / 25.8±3.8 | 17.3 / 18.7 / 29.2 / 39 | 20.8 / 23.2 / 35.2 / 39 | 72-88% |
| slope, K 15 | 14.5 / 12.7 / 15.8 / 15.3 | 18.7±1.4 / 16.2±1.7 / 23.8±3.1 / 23.8±2.4 | 22.3 / 21.5 / 36.5 / 36.5 | 24.2 / 25.0 / 37.2 / 38.8 | 71-86% |

All rows also have no duel slipped into the quiz when the path opens a genus that question (below). On these data
K 12 kept the beginner where it was (14.5 at 100) and opened faster for those who learn. Then the photo candidates
added on `main` the same day changed the photo ratings the simulation draws on, and the same grid gave:

| `OPEN` (photos of 2026-11-02, after #352) | after 50 | after 100 | after 200 | after 300 | right at 100 |
| --- | --- | --- | --- | --- | --- |
| switch, K 6 (before) | 12.0 / 12.3 / 13.2 / 15.8 | 13.0±2.9 / 13.5±2.3 / 16.5±4.2 / 24.8±6.4 | 16.8 / 17.7 / 21.0 / 32.8 | 19.2 / 20.2 / 24.3 / 36.7 | 76-86% |
| slope, K 8 | 10.2 / 12.0 / 13.5 / 14.0 | 12.8±1.1 / 13.7±0.9 / 20.2±4.1 / 20.5±4.0 | 14.7 / 16.5 / 28.0 / 28.7 | 18.5 / 19.5 / 31.0 / 34.3 | 75-86% |
| **slope, K 10 (now)** | 10.8 / 10.8 / 11.8 / 16.0 | 13.2±1.5 / 12.2±2.0 / 17.3±3.2 / 24.8±3.1 | 17.0 / 16.5 / 25.8 / 38.3 | 20.8 / 20.5 / 29.3 / 39 | 74-86% |
| slope, K 12 | 11.7 / 12.7 / 14.5 / 16.2 | 15.7±1.9 / 15.5±2.9 / 23.3±3.4 / 23.7±2.5 | 18.3 / 19.7 / 33.7 / 36.3 | 23.8 / 23.7 / 37.2 / 39 | 72-84% |

K 12 now opened 16 genera on average to a beginner in 100 questions, at 72% right (18 on the CI seed, over the test's
16), so K 10: the beginner stays at the switch's pace (13.2) with half its spread, the lecture RA meets 29 genera by
question 300 instead of 24, and the expert all 39 by question 200. A change of photos moved the results by about 3
genera: 6 seeds are a minimum, and the order between K 8, 10 and 12 for the RA is within the noise (the independent
review's first point: a simulation over more seeds, ROADMAP). A coupling of the duel rate with the number of shaky
genera was tried as well (3 more settings) and dropped: no gain over the slope alone.

K 5 with P 0.6 is the small step Pierre asked for: the RA opens faster (one genus more every ~15 questions at first),
the beginner stays on about ten genera for the first 100 questions. Lowering P too made the beginner open faster as well (18 genera
in 100 questions in the CI test, which keeps that at 16 at most). Mastery is barely changed: an expert masters
10-17 genera in 600 questions (9-21 with K 3); the first ones come around question 300, after 95% and the 5 exam
questions at least 8 answers apart, so the CI test checked that an expert had genera ready for their exam (95% sure)
after 300 questions, not mastered ones. With the moving average (2026-11-02, above) the first genera reach the exam
around question 400: the test now checks an expert's progress at 300 (genera half way, far ahead of a beginner) and
that no genus reaches 95% before being asked beside a look-alike.

Exploration of the first setting (K 3), 600 questions, 4 seeds:

| | Beginner | RA | Expert |
| --- | --- | --- | --- |
| Genera met after 100 questions (before: all 39) | 11-14 | 8-16 | 11-31 (31 in 2 seeds of 4) |
| Genera met after 600 | 26-33 | 26-35 | 37-39 (39 by question 200 in 2 seeds) |
| Traps a question, end (before: ~0.1 for all) | 0.3-0.5 | 0.2-0.6 | 1.5-1.7 |
| Genera mastered after 600 (before: expert 7) | 0-1 | 0-4 | 5-21 |

The beginner and the RA open at about the same pace here because the learner model's RA knows its genera only at 55%,
near the `OPEN.P` threshold, and its beginner learns fast; with real players, recalibrate.

Known limits: with little real data, the genus difficulty is mostly the declared look-alikes (and the photo sets until
2026-11-03; since then the genus offsets of the sheet's photo Elo, v31), so "easiest first" is weak until answers come
in. Learners are still rated cautiously (abilities around −0.5 at 80-90% right in the
simulation); recalibrate `ELO` and `OPEN` once a few RA cohorts have played.

### Learning-outcome simulation (`tools/learnsim.js`)

The independent review's first point (docs/reviews/2026-11-02-learning-algorithm-review.md, §3-§4): the profiles test
above measures pacing (genera met, traps, genera ready for their exam) on one seed, not learning. `tools/learnsim.js`
drives the same real quiz (the app's draw, photos, traps, duels, Again, exam, Elo, knowledge model and progress, all
untouched; only the player is simulated) and measures what the simulated players really learn, and how far the app's
estimates are from that truth, as a mean ± sd over many seeds. Not in CI (minutes; numbers for reading).
How a comparison is read (the primary measure declared in advance, an exact stratified sign-flip test pooled over the
profiles, Holm, guardrail margins, tier 2's Dunnett / TOST and fresh seeds): docs/rules/learning.md, rule L11, and
docs/reviews/2026-11-05-stats-methods-study.md.

- **Run**: `node tools/learnsim.js [--seeds 5] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
  [--workers 4] [--out file.json] [--stats stats.json] [--met Acropora,Porites,...] [--mem 0,0.4,1.5,2]
  [--openall N] [--back keep|one] [--rt off] [--rtlog log.json] [--choice new|imr|know|auto] [--fallback keep|accept] [--vars JSON]
  [--learner item|field] [--tau 0.5] [--custom 8] [--drill 200]` (the learner and the Custom-N scenario: "Field learner and
  the Custom-8 scenario" below; the
  first-launch answer, its fallback card and, for calibration only, other values of its variables: "The first-launch
  question"; each run's first 80 answers are kept as a trace for `tools/fallbackeval.js`). Each run (profile × seed) gets a fresh browser context; seeds
  are 1..N, the app's `Math.random` and the learner's own generator both seeded from it, so a run is reproducible and
  the same seeds before and after a change give paired comparisons. `--stats` loads a `?stats=1` answer of the sync
  sheet as the photo ratings (`--stats live` reads it at start with `av=learnsim`; a file fetched by hand needs an `av`
  too, `curl "<SYNC_URL>?stats=1&av=tool"`, or the sheet logs the read as an old app) (default: none, every photo's difficulty 0, as in CI; Pierre's Easy/Medium/Hard sets until
  2026-11-03; its `mem`, sheet v26, the app's photo memory offsets; its `gd` and `v`, sheet v31, the genus offsets).
  `--truth truth.json` (2026-11-03) gives the learner each photo's true difficulty (`{photos: {file: d}, gd: {genus:
  d}}`), independent of the app's estimate; without it the learner takes the app's own `photoDiff`, so a change to the
  app's photo difficulty would change the learner's world too. `--out` writes every run and
  the summary as JSON. 30 seeds × 4 profiles × 300 questions: about 9 minutes on 4 cores (with the question planner running between answers, as in the app: Codex review #365).
- **Long runs** (2026-11-08, ROADMAP "learnsim: long runs crash"): a run is one synchronous `page.evaluate`, so the
  page's event loop never turns until it ends. Every `localStorage` write goes through the browser, and its traffic back
  queued in the renderer until the run ended; the app writes its answer log twice an answer (`sync.js` `LOG0` and `ANONQ`,
  up to 2,000 answers, about 290,000 characters each): the renderer grew by about 1.5 MB an answer, 3.6 MB once the logs
  were full (one run alone: 1.4 GB at 1,000 answers, 4.2 GB at 2,000, 9.6 GB at 3,500, then "Target crashed"; its V8 heap
  stayed at 13-18 MB, so the memory was outside JavaScript). The tool now keeps the page's `localStorage` in the page's
  own memory (`tools/memstorage.js`, installed before anything writes: the same values, own properties and quota as the
  browser's, 5,242,880 characters as measured on the tools' Chromium; checked by `tests/memstorage.test.js`): 0.4 GB at 1,000 answers, 0.55 at 2,000, 1.1 at
  8,000, with 4 runs side by side. About 0.1 MB an answer is left (V8 heap 12 → 25 MB, the rest outside it), not
  identified: not the app's pending timers, MutationObserver records or promise reactions (each taken away in a
  diagnostic run, the same growth), nor the photos (aborted, the same); far from a crash at 8,000 answers (fish: 0.93-1.06
  GB). 8,000 answers with 4 runs side by side took 10 minutes for the corals and 3 hours for the fish on a loaded
  machine: the fish draw itself (`model.js` `photoSet`, `core.js` `faOf`, `calibOf`) costs about 0.3 s an answer there. The same seeds give the same runs as before (1,500 answers, corals and fish, beginner and
  lecture RA: every measure identical; only 2 of 6,000 logged answer times differ by 0.1 s, the wall-clock time between
  the tool setting the question clock and the app reading it, which a slower page added before). 8,000 answers peak at
  about 2.24 million characters of storage (corals) and 2.76 million (fish), under the quota.
- **Opening pace** (2026-11-04): `open/15`, the most genera opened on their own cards in any 15 consecutive questions so
  far; with `--breaks`, the genera opened in the first 15 answers after the comeback, the most in any 15 and in all the
  `--after` ones. Profile `strongBack` (not in the default list): a strong player who knows 80% of the genera well and
  the rest hardly (few genera stay shaky), for `--profiles strongBack --questions 60 --breaks 8h --after 40`, the
  situation of the run that collapsed on 2026-11-03.
- **Response time** (2026-11-04, "Response time" section 5): the learner takes log t = log 7 − 0.15 × right − 0.3 ×
  logit(its true chance) + 0.6 × N(0, 1) seconds (`LEARNER.RT`, calibrated so that its logs give back the two real
  measures), handed to the app's question clock; the app weighs its steps by it. `--rt off`: no seconds;
  `--rtlog`: the app's answer log of every run, with the learner's chance and time noise, for `tools/abilityeval.js`.
- **Openings after a miss** (2026-11-03): per profile, the genera opened on their own cards, those on the question
  right after a miss (0 with `openRight`), the questions where that rule alone held the opening and the openings they
  would have brought (`openChance` summed), and the questions from each spell of them to the next card; each run's
  `opens`, `afterMiss` and `blocked` are in `--out`.
- **Profiles**: beginner (knows every genus at 2%, learns 0.12 of the gap per exposure), lecture-level RA (the profiles
  test's RA: 55% on 2 genera in 5, 10% on the others, 0.12), strong RA (85% on 3 genera in 5, 10% on the others, 0.12),
  expert (93%, 0.05). The player never opens all (the path is what is measured), unless `--openall N`: all open at
  question N, as My progress's button (`offer`, which accepted the offer card, went with it on 2026-11-12); the back card is then answered
  `--back` (default `keep`); the tool prints, after Open all, the app's expected success against the learner's true
  chance (below).
- **Learner**: `know[g]` = chance to recognise genus g on an average photo with all its views; on a question it
  recognises the genus with σ(logit(know) − photo difficulty − 0.5 if one view alone), photo difficulty from the
  app's `photoDiff`. Not recognised, it picks a choice with weight (1 + 3 × s) × (1 − 0.5 × know of that choice), s = 1
  for the genus shown and min(1, `pooledConf` / `CONF.LOOK`) for another (about 1 for a declared look-alike, 0.1 for an
  unrelated genus): wrong answers fall on look-alikes, an unrecognised photo goes to the right genus about half the
  time among easy choices, a quarter among three look-alikes, and a genus the player knows is ruled out more often.
  After each answer the genus shown gains rate × (1 − know), 1.5 × that after a miss (the side-by-side montage), the
  genus wrongly picked 0.5 × that; a first-meeting card teaches like one answer. No forgetting, except across a break
  (`--breaks`, below).
- **Photo memory** (2026-11-03; `LEARNER.MEM`, `--mem`; `--mem 0` is the learner before): the learner remembers each
  photo it was shown when answering, [shown, right], and recognising gets `MEM` logits more, averaged over the photos
  shown: new 0, shown never right 0.4, right once 1.5, right twice or more 2. Our assumption, close to the real answers
  ("Photo memory" above: right once about +1.4 over a new photo, shown never right +0.4, right twice 9 of 9). Memory
  helps on that photo only: it teaches nothing more about the genus, and the hard reference question (a photo never
  seen) ignores it, so what memory adds to the answers is exactly what the app must not count as knowledge. It does not
  fade across `--breaks` (a limit).
- **Breaks** (`--breaks 10m,30m,1h,3h,8h,3d,1w,1mo [--after 20]`, optional; without it nothing changes): the app runs
  on a virtual clock (10 s an answer); after the first session (`--questions`) the player leaves for each break in turn,
  each from the same state (the generators seeded again per break), forgets, and comes back: the second session runs
  until the comeback is over (questions flagged warm: the comeback, or the gentle restart on an older version, which
  the tool starts at every second session), then `--after` questions more. The learner forgets on the FSRS curve
  towards its starting knowledge (prior knowledge stays): know' = k0 + (know − k0)(1 + 19/81 · t / S)^−0.5, S =
  `LEARNER.S0` 2 days × `LEARNER.G` 2.5 for each further day the genus was answered right (our learner; the app reads S
  from the Elo ability). Measured per profile and break: the comeback's length (median, quartiles, range), the answers
  with no genus opening, the success during the comeback and in the `--after` questions after it, how often the
  opening hold was on during them, the app's rust at the first question back and the learner's true loss.
- **Measures** at questions 50, 100, 200, 300: true mean `know` over the slate genera (`knowSlate`: 40 with Millepora
  since 2026-11-02; `know39` before) and over the genera met; the
  Elo estimate against the truth, |θ − logit(know)| and its sign, over the genera met; the progress bar against the
  truth, genScore − know over the genera met (below 0: it under-claims), and `progPct`; genera met, learned (`s.mx`),
  right % since the previous checkpoint; the true chance to tell each declared look-alike pair apart (2 choices,
  average photo, both ways); genera whose true success on a **hard reference question** (one photo alone, difficulty
  +1 plus the single view's 0.5, 4 choices: the genus and its 3 most confusable slate genera) is 0.9 or more; genera that
  entered the mastery exam (`examOn`, first time), and their true reference success at that moment and when learned.
  Per run, the question at which each genus was first met (`metAt`), printed as the median per profile for the genera
  of `--met` (default the five most common at Dauin; a run where it was not met counts as later than the last question).
  **By photo count** (photo memory): the slate genera with few game photos (at most `LEARNER.FEW`) against those with
  many (at least `MANY`), at each checkpoint: the questions so far showing a photo
  the learner had already been shown, the right % on all and on those repeats, progress minus know and θ − logit(know)
  over the genera met, genera learned; and, pooled over the runs, the genera that entered the exam or were learned, their
  true reference success then and the median question.
- **Photo exposure** (2026-11-06, in `--out` only): each question's genus, colony and photos (`expo`) and each genus's
  game photos with their colony (`pool`), for the repeat rates, the photos never shown and the answers per photo
  ("Photo exposure").
- **Limits**: the learner is ours, a few round numbers, not fitted to real answers; the photo difficulty it meets is the
  app's own estimate (so photo calibration cannot be judged), unless `--truth` gives it a fixed world (2026-11-03); learning is per genus only (a duel or a montage teaches
  the two genera, not the pair as such; the field learner, below, adds pairs and the size of the set); no forgetting (except across `--breaks`), no fatigue; the RA profiles know a fixed set of genera (every
  5th genus in data.json order), so the spread is that of the draws, not of who knows what. θ is clamped to
  `ELO.lo`..`hi` (−1.5..3), so a genus known at 2% always shows an error of about 2.4 there. Since the learner's
  guesses beat 1 in k (choices from other growth forms are ruled out), a θ that fits its answers would sit a little
  above logit(know): a negative θ − logit(know) is an under-estimate, not an artefact.

Baseline on `main` of 2026-11-02 (BKT knowledge, before the progress formula change), 30 seeds, 300 questions, no
`--stats`, mean ± sd over the seeds (ref@exam: mean over the runs where a genus entered the exam, their number in
brackets). 120 runs in 237 s on 4 cores.

| Profile, question | know39 | knowMet | \|θ − logit k\| | θ − logit k | genScore − know | met | learned | right % | look-alike | ref ≥ 0.9 | entered exam | ref at entry | ref when learned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner 100 | 0.25±0.01 | 0.62±0.04 | 1.38±0.21 | −0.82±0.42 | −0.22±0.07 | 15.2±1.6 | 0 | 83±5 | 0.65±0.01 | 0 | 0 | - | - |
| beginner 300 | 0.54±0.04 | 0.72±0.05 | 1.62±0.21 | −1.27±0.33 | −0.22±0.05 | 29.0±3.6 | 0 | 83±4 | 0.81±0.02 | 0.5±0.6 | 0.7±0.8 | 0.67±0.09 (17) | - |
| lecture RA 100 | 0.47±0.02 | 0.67±0.04 | 1.15±0.17 | −0.73±0.34 | −0.26±0.08 | 18.8±2.4 | 0 | 83±6 | 0.77±0.01 | 0 | 0.3±0.6 | 0.68±0.03 (8) | - |
| lecture RA 300 | 0.71±0.03 | 0.75±0.02 | 1.41±0.21 | −1.15±0.24 | −0.23±0.05 | 35.7±3.9 | 0.2±0.4 | 85±3 | 0.89±0.01 | 0.7±1.1 | 1.8±1.4 | 0.69±0.06 (26) | 0.82±0.04 (5) |
| strong RA 100 | 0.68±0.02 | 0.78±0.03 | 1.49±0.14 | −1.02±0.25 | −0.29±0.08 | 21.7±3.0 | 0 | 84±4 | 0.88±0.01 | 1.3±1.0 | 0.9±0.9 | 0.80±0.12 (18) | - |
| strong RA 300 | 0.85±0.01 | 0.85±0.02 | 1.59±0.16 | −1.42±0.23 | −0.16±0.06 | 38.8±1.3 | 0.6±0.8 | 89±3 | 0.95±0.01 | 5.8±1.4 | 5.5±2.4 | 0.84±0.05 (30) | 0.93±0.05 (15) |
| expert 100 | 0.94±0.00 | 0.95±0.00 | 1.39±0.13 | −1.39±0.13 | −0.19±0.03 | 21.1±1.5 | 0.1±0.3 | 97±3 | 0.98±0.00 | 3.5±1.1 | 4.7±1.8 | 0.89±0.00 (30) | 0.91±0.00 (2) |
| expert 300 | 0.95±0.00 | 0.95±0.00 | 1.30±0.10 | −1.30±0.10 | −0.03±0.02 | 39.0±0.0 | 6.1±2.5 | 96±2 | 0.98±0.00 | 12.6±1.8 | 23.4±2.5 | 0.89±0.00 (30) | 0.91±0.00 (30) |

What it says, on this learner: the Elo ability under-estimates every profile by 0.8 to 1.5 logits and the gap does not
close in 300 questions (so the photos stay easy: an expert answers 96% right, not 80%); the progress bar under-claims
by about 0.2 for the learners; a beginner's or lecture RA's genus enters the mastery exam (BKT 95%) while its true
success on a hard reference question is only about 0.7, an expert's about 0.9 (the review's item 2 asks for ≥ 0.85);
the exam then keeps the genera learned at 0.82-0.93 true reference success.

#### Open all: the app's expectation against the truth (measured 2026-11-03, no change made)

Why: the player of "Back to one at a time" (above) was expected 0.70-0.88 on the genera opened at once and got 62%.
A genus never answered starts from the player's global level (`core.js` `playerStart`: `START.W` 0.8 × the global
Elo, shrunk while the answers are few), and a player who earns the offer has a high global level from the genera met
one at a time. Measured with `node tools/learnsim.js --seeds 5 --questions 300 --openall 52` (seeds 1-5, no
`--stats`; the offer accepted at answer 50-51 when the level allowed it, else Open all forced at 51; about 28-29 genera
at once). Means over the pooled answers: e the app's expected success logged with the answer, p the learner's true
chance on that question, ok its answers.

| Profile | first question on a genus opened at once: e / p / ok | first 30 answers after Open all, genera opened at once: e / p (e − p) | same, genera met before: e / p (e − p) | back card (Keep them all) |
| --- | --- | --- | --- | --- |
| beginner (Open all forced) | 0.74 / 0.56 / 0.47 | 0.74 / 0.60 (+0.13) | 0.74 / 0.81 (−0.08) | 5 of 5 runs, answers 10-19 after Open all |
| lecture-level RA | 0.78 / 0.64 / 0.69 | 0.78 / 0.65 (+0.12) | 0.74 / 0.84 (−0.09) | 2 of 5, answers 26 and 66 |
| strong RA | 0.81 / 0.76 / 0.79 | 0.81 / 0.75 (+0.05) | 0.79 / 0.91 (−0.12) | 0 of 5 |
| expert | 0.86 / 0.95 / 0.93 | 0.85 / 0.95 (−0.11) | 0.82 / 0.96 (−0.15) | 0 of 5 |

What it says: the starting ability over-estimates the genera opened at once for a lecture-level RA by about 0.14 at
their first question (0.78 expected, 0.64 true; 13-15 points) and 0.12 over the first 30 answers, for a beginner by
0.13-0.18, a strong RA by 0.04-0.05; an expert is under-estimated (−0.10), as are the genera already met for everyone
(−0.08 to −0.15, the Elo's usual lag on this learner). The global level is earned on the genera met first (the
easiest and most common, opened by the path), so 0.8 of it carries too much to the harder genera that come at once;
the real player's drop (0.70-0.88 expected, 62% right) is of the same size as the lecture-level RA's. Kept as it is
(Pierre's brief: measure, do not change); the back card catches the players for whom it matters. With `--back one`
(the card answered One at a time), the lecture-level RA ends at 38 genera met and true slate knowledge 0.72 ± 0.05 at
question 300 (Keep them all: 40, 0.75 ± 0.01), and the beginner who opened all at 51 at 17 genera met, 0.42 ± 0.08
(Keep: 40, 0.66 ± 0.01, right 86% against 92%): this learner learns from every question and never gives up, so
seeing more genera always teaches it more; what the card guards against, a player who quits when it gets too hard,
is not in the simulation.

#### Field learner and the Custom-8 scenario (measured 2026-11-05, no rule changed)

Why (Pierre, 2026-11-05, the progress and set-size study): a genus at 100% should mean the player can tell a photo of it
from *any* slate genus, whatever they have unlocked. The learner above cannot see what that asks: it recognises a genus
whatever the competitors, so drilling 8 genera raises its knowledge exactly as drilling 40 would. This adds a second
learner and Pierre's scenario, and measures today's rules with them. Validation tools only: no game rule, constant or
rules version changed; the progress rule is Pierre's decision.

- **Field learner** (`--learner field --tau T`; `tools/learnsim.js` "The field learner", constants `LEARNER.FIELD`,
  provisional). It keeps `know[g]` and its teaching, and adds a contrast skill x per pair of genera, learned only when
  the pair is contrasted: both among a question's choices, or side by side in the montage after a miss. A question on t
  among the set V (its choices; for a typed question the genera the learner has met, the names it holds in mind) is
  answered with the Luce choice P = 1 / (1 + e^(d + 0.5·single − memory) · Σ_{c∈V, c≠t} r(t, c)), r(t, c) =
  (1 + 3 s(t, c))(1 − 0.5 know[c] g)/4 · (1 − know[t])^(1.6 g), g = τ + (1 − τ) x(t, c), s from `pooledConf` as for the
  item learner. Every genus held in mind adds its own odds of a mix-up, look-alikes most (set size, and pooled
  confusion); τ (transfer) is the share of what the learner knows of t, in log odds, that works against a genus it was
  never contrasted with. A (1.6): with every pair contrasted at know 0.5 and 4 easy choices it answers 0.75 as the item
  learner; an expert (know 0.93 on every genus and pair) about 0.85 against the whole slate. The item learner stays the
  default and its runs are unchanged (same seeds, identical answers to `main`): two worlds, as the statistics study asks
  (a rule that helps only in the world it was designed for is suspect).
- **Custom-N scenario** (`--custom 8 --drill 200`): the player plays the Quiz until 8 genera are unlocked, picks those 8
  in the custom quiz, plays 200 questions there (the real custom quiz: its draw, choices, typed questions, Again, duels;
  no exam), then goes back to the Quiz.
- **Measures** (`tools/fieldeval.js`, pre-declared before the runs; rule L11 tier 2). The truth is pOpen(t), each
  learner's own success on an average photo of t with every slate genus a possible answer (Luce over the 40 for the
  field learner; for the item learner its guess among the 40, about its know).
  - **Primary 1, overclaim**: per run, the mean over the genera met of (bar shown, `genScore`) − pOpen, at question 600.
    Above 0: the bar claims more than the player can do against the whole slate.
  - **Primary 2, precision of Learned**: per run, the share of Learned genera with pOpen ≥ 0.8 (`LEARNER.PREC`), at
    question 1000 (runs with no Learned genus have none: their number is given).
  - Secondary, descriptive: over+ = mean of max(0, bar − pOpen) (the study's form), and at the end of the drill the
    selection's own bar, pOpen and overclaim.
  - Inference: mean and 95% t interval over the 30 seeds; Custom-8 against the path on the same seeds (paired), sign-flip
    p over the seeds and Holm over the four profiles for each primary. Everything else exploratory.
- Run: seeds 1-30, 1000 questions, the four profiles, no `--stats`; `node tools/learnsim.js --seeds 30 --questions 1000
  --learner field --tau 0.5 [--custom 8 --drill 200] --out f.json`, then `node tools/fieldeval.js path.json custom.json`.

Results, field learner τ 0.5, today's rules (`main` at 0760aa60, the learner at c7d23d1e; 240 runs; mean [95% interval
over the 30 seeds]). The item learner and τ 0 / 0.8 runs (robustness) come in a later commit.

| Profile | over at 600, path | over at 600, Custom-8 | Custom-8 − path (paired) | over at 1000, path | precision of Learned at 1000, path (pooled) | the same, Custom-8 |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | +0.108 [0.098, 0.118] | +0.070 [0.060, 0.080] | −0.038 [−0.049, −0.027] | +0.112 [0.103, 0.121] | 0.90 [0.81, 0.99], 22 runs (37/44) | 1.00, 30 runs (74/74) |
| lecture-level RA | +0.084 [0.071, 0.097] | +0.036 [0.027, 0.046] | −0.048 [−0.062, −0.034] | +0.080 [0.071, 0.088] | 0.93 [0.85, 1.00] (108/115) | 0.99 [0.97, 1.00] (114/116) |
| strong RA | +0.034 [0.022, 0.046] | −0.033 [−0.042, −0.024] | −0.067 [−0.080, −0.054] | +0.044 [0.039, 0.050] | 0.98 [0.97, 1.00] (300/305) | 1.00 (239/239) |
| expert | −0.034 [−0.038, −0.030] | −0.113 [−0.118, −0.108] | −0.079 [−0.085, −0.073] | +0.014 [0.012, 0.016] | 1.00 (980/980) | 1.00 (754/754) |

Paired Custom-8 − path at 600: sign-flip p < 0.001 for every profile, Holm-adjusted 0.0004. Precision at 1000, Custom-8 −
path on the seeds where both runs had a Learned genus: beginner +0.10 [0.02, 0.19], lecture-level RA +0.06 [−0.02, 0.14],
strong RA +0.02 [0.00, 0.03], expert 0; Holm-adjusted p 0.24 for the first three: no clear difference.

At the end of the drill (Custom-8, question 235-238; secondary, descriptive): the 8 genera drilled.

| Profile | right % in the drill | bar of the 8 | their true whole-slate success | overclaim of the 8 | of the 8, at 95% or more | the 8 at question 300 / 600: bar, true |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | 93 | 0.92 | 0.70 | +0.22 [0.21, 0.23] | 5.9 | 0.89, 0.79 / 0.85, 0.93 |
| lecture-level RA | 95 | 0.93 | 0.81 | +0.12 [0.12, 0.13] | 6.3 | 0.90, 0.88 / 0.88, 0.95 |
| strong RA | 97 | 0.95 | 0.90 | +0.04 [0.03, 0.05] | 7.3 | 0.94, 0.94 / 0.92, 0.97 |
| expert | 99 | 0.95 | 0.99 | −0.04 | 7.6 | - |

What it says, on this learner (provisional constants; to be read with the item world and τ when they come):

- **Pierre's scenario reproduces**: 200 custom-quiz questions on 8 genera bring 6 of them (beginner) to 7-8 (strong RA)
  to the exam's entry, the 8 shown at 92-95% while a beginner names them right 70% of the time against the whole slate,
  a lecture-level RA 81%: overclaims of +0.22 and +0.12 on exactly the genera drilled.
- **It does not last in this world**: the exam is left to the Quiz, and by the time it passes, the drilled genera have been
  set against the genera met afterwards (each question contrasts its choices). Their true success reaches 0.79-0.94 by
  question 300 and 0.93-0.97 by 600, and every Learned genus of the Custom-8 runs but two (of 1,183) clears 0.8. At 600
  the Custom-8 runs overclaim *less* than the natural path, over the genera met (the drill slowed the opening: fewer
  genera met, fewer new bars). A player who drills and never goes back to the Quiz keeps the +0.22.
- **The standing overclaim is the natural path's**: +0.11 for a beginner and +0.08 for a lecture-level RA at question
  600, the same at 1000 (+0.03 to +0.04 for a strong RA, about 0 for an expert, whose bars under-claim early). It is
  where the precision of Learned falls short too: 7 of a beginner's 44 Learned genera and 7 of a lecture-level RA's 115
  are under 0.8 against the whole slate.
- **Limits**: one learner, its constants chosen by hand (A, the contrast rate PAIR 1, τ), not fitted to real answers;
  the pooled confusions are the priors (no `--stats`); the learner never quits and always goes back to the Quiz.

**Real answer log** (tier 3, rule L12; `node tools/fieldeval.js --log answers.json`, the sheet's Answers tab read
2026-11-05 through the Sheets connector, read-only, kept outside the repo; 1,933 coral answers of 10 players, all with the
app's logged expectation e). Does the number of genera a player had been asked so far (x = log2 of it; the log records
no cards, so a genus opened but not yet asked is left out) predict right or wrong beyond e? Pre-declared: M1 = logit e +
a + b x against M0 = logit e + a, each fitted on the other players and scored on the player left out; players are the
unit (each one vote), sign-flip over players, declared direction M1 lower with b < 0.

| | Result |
| --- | --- |
| Log-loss M1 − M0 per player (primary) | +0.001 [−0.008, 0.011], sign-flip p 0.73 (exact); M1 better for 5 of 10 players: **no clear difference** |
| b on every player | −0.21 logit per doubling of the genera asked (the declared direction) |
| The players' own b (8 players with 30+ answers) | −0.14 [−0.54, 0.27], negative for 5 of 8, sign-flip p 0.45 |
| Expected e against right, by genera asked so far | 1-4: 0.76 / 0.88 (89 answers); 5-8: 0.77 / 0.90 (216); 9-16: 0.78 / 0.88 (328); 17-32: 0.77 / 0.79 (870); 33+: 0.75 / 0.81 (430) |
| Typed answers only (exploratory) | 55 answers of 3 players: too few to read |

The players beat the app's expectation by 0.10-0.13 while they had been asked 16 genera or fewer, and by 0.02-0.06 after:
the shape a set-size effect predicts, but also that of the Elo's early under-estimate (the ability lags most on few
answers, "Learning-outcome simulation" above), which this log cannot tell apart. With 10 players, the held-out test sees no
clear difference. A replay cannot judge what a new progress rule would teach (other questions would be asked).

#### The judge: the domain score D* (2026-11-06, part 1 of the new progress bar; no rule changed)

Why (Pierre, 2026-11-06, Q127-Q131 on the research note `docs/reviews/2026-11-06-progress-metric-research.md`): the bar
was tuned against a yardstick of our own (overclaim against pOpen, success on an *average* photo). 100% is to mean
"names right every photo of the genus, alone, without choices", over the genus's theoretical photo distribution, easy to
hard. A new yardstick comes first, and every candidate bar is judged by it in several learner worlds.

- **D\*(g)** (`tools/learnsim.js`, `JUDGE`): the learner's true success naming a photo of g alone (one view, so the
  single-view offset), with no choices, averaged over N(μ_g, SD²) by Gauss-Hermite with 7 points.
  - Item learner: its recognition, no guess.
  - Field and exemplar learners: every slate genus is a possible answer.
  - `--truth gen` draws every game photo's true difficulty from the same distribution, by a hash of its file name. μ_g
    is the sheet's genus offset (`--stats` gd); SD is 0.8 (an assumption). The app is told the truth plus N(0, 0.3²).
- **The exemplar learner** (`--learner exemplar`, `LEARNER.EX`): a summed-similarity model after the GCM (Nosofsky
  1986), with a background (guessing) term; four constants. It is the third world, beside item and field. Its
  difference: a genus never stored does not compete, so a drilled genus is truly named right.
- **The spotty profile** knows the genera of IMR lecture groups 1-5 as an expert and the rest hardly (5%).
- **`tools/barjudge.js`** reports:
  - the error E(g) = bar − D\*(g), signed, per profile at q100 / 300 / 600 / 1000, over the genera met;
  - E split into the genera the profile knows and the others, and at the end of a Custom-N drill into the drilled genera
    and the others;
  - the time to credit (questions until the bar reaches 50% and 80% on the genera the profile knows);
  - with `--bar field --core <#611's core.js>`, another rule's bar on the same answers, replayed;
  - with `--log`, the real-log calibration of the app's predicted success by tercile of ability − photo difficulty
    (players as the unit, leave one player out).
- The primaries and their Holm family are pre-declared in PR #624. The baseline results are added there and here.

## Decision log

- 2026-11-17, Q391 (Pierre, 10:52 Manila: "Q391 a oui, b oui"), #953 rebuilt ("Juveniles and colour phases on their
  unit's mastery"): the fixed stage of 2026-11-15 replaced by a ramp of each unit's own bar per variant kind (`core.js`
  `VAR_AT`: early-class juveniles from the start, the other juveniles and the sexes and colour phases from Open Water to
  Advanced, late-class juveniles at Advanced; a family's own thresholds in `fish.json` `varAt`), and "Learned" asking a
  right answer on each variant group (fish rules version 3). Its level 2 check declared there, results pending.
- 2026-11-15, the ROADMAP row of 2026-11-07 (Pierre: "we must put back a progressive path that presents juveniles and
  sexual dimorphism"), built in #953 ("Juveniles and colour phases in stages"): phase photos held back from a unit's
  first `SUBJECTS` `calib` `phase` answers (fish 10), then in stages; two cards per subject. Checked at level 2: the
  primary as intended in both worlds; the app world's no-wall check fails at 300 questions (10 runs of 100 meet no phase
  photo), the rated world's heavy tails breach the lecture RA's wait for the first Open Water (+14 answers); N, the
  class-A juveniles and the breach go to Pierre with the PR.
- 2026-11-14, Pierre (Q350, "oui à tout" to the confusion-group study's a-j, f changed: declared pairs forced): look-alike
  units open by confusion group, the exam waits for the group, `INTRO.EVERY` removed ("Confusion groups"). Built and
  checked: partners 4-5 times closer, fish every guardrail held; the corals' start of the path breached guardrails
  (the beginner's first unit at Open Water, the first answers' right %), back to Pierre with options before it ships.
- 2026-11-12, Pierre (Q337 (a)): the card that offered to open all genera goes, for every subject; Open all stays on the
  first cards and in My progress, the back card stays ("First meeting with a genus"). Q338 (a), "a unit still shaky
  after N of its own answers stops holding the opening": calibrated among 8 / 10 / 12 / 15, none passed the plan
  declared before the runs (N 8 and N 10 free the real stretches but lower a rated-world beginner's score and lengthen
  its plateaus; N 12 and N 15 do not free them), so nothing changed; back to Pierre ("A unit stuck shaky",
  "Calibrated, not adopted"). Q338 (b), N 10 only above a global level L (0.25, 0.5 or 0.75) once it rests on 200
  answers: calibrated, none passed (the simulated beginner's level is past every L from about answer 200, so it pays the same cost), nothing
  changed; back to Pierre ("Above a level"). Q338, decided: "option a, B10 après 200 réponses": N 10 from 200 answers,
  no level (the arm "N 10, floor alone"), the beginner's shown-score cost accepted; adopted ("A unit stuck shaky").
- 2026-11-08, Pierre (Q242, Q247; "Fish: the global score, built"): the fish global score is the formula of 2026-11-04
  with each species weighted 1/√ of its rank by observers near Dauin (ties sharing their mean rank) and each family by its
  species' weights, shown as 100 √raw (anchors 50 / 74 / 89 / 92 / 95 / 100%), not the circle weights; one computation
  with its components (per family, genus, species × common / scientific name, per circle); a species with no common name
  has no common branch (credit = S); the rules that read a global fish % read the new scores (circle 3: the circle-1
  Entries component at 55%).
- 2026-11-06, Pierre (Q187-Q190, after the photo exposure study; fish too, 15:36): the Colony cap 40 colonies per genus
  (corals; fish no cap); the calibration questions are an exploration share of 30% drawing colonies (observations)
  never seen, on a unit held (simulated); a beginner's multi-view question weighs a colony by cov, not cov² (corals); a
  colony counts as seen whatever view was shown ("Photo exposure").
- 2026-11-06, Pierre (Q127-Q129, Q135; PR "domain-score bar"): the bar is the posterior expected domain score of the
  genus from the player's own answers on it (grid, fixed population prior, format-aware, a drift per answer), 0 to 95%,
  the exam from 85% to 100%; the moving average `s.pg` retired as the bar (kept for records not rebuilt, rule D4); the
  learned-mark guard made explicit (`afterBkt`); the shared slope and the per-format offsets as inputs (Q147, Q138).

- 2026-11-04, Pierre (approved after review of every family's ranking): the fish species inside an entry open in
  commonness order, the index of field counts near Dauin (weight 3), the IMR 24 most sighted (2) and iNaturalist distinct
  observers in three rings (1), shrunk toward the entry's mean with M = 5, log scale over 2 decades
  (`tools/fish_commonness.py`, `fish.json` `cmi`; "Fish: species order, the commonness index").
- 2026-11-04, Pierre (approved; design only, docs/FISH_PATH.md "My progress (fish)"): the global fish score's formula. Per species,
  C = mean mastery of its listed common names, S = max(species mastery, ½ × genus mastery), credit = a·C + b·S + (1 − a − b)·C·S
  with b = 0.80, a ≈ 0.73; global = 25% × mean entry mastery + 75% × mean species credit over circle 1. Entries only 25%, every
  common name 80%, every scientific name 85%, both 100%. The entries' share and the genus's half credit are checked by simulation
  (rule L11) before it ships.
- 2026-11-04, Pierre (latest; design only, docs/FISH_PATH.md): the fish path is a **tree** (trunk: families; branch A: species
  by common name; branch B: scientific genus names, then species scientific names), and the players choose common, scientific
  or both names; the global fish score reaches 100% only with both names of every species, about 80% with every common name
  and no scientific one, about 85% with every scientific name and no common one, non-linear per species (credit a < b < 1, the
  genus partial credit inside b; a, b and the families' share set by simulation, rule L11), never additive. Replaces the 80 / 20
  split below.
- 2026-11-04, Pierre (later the same day; design only, docs/FISH_PATH.md): the global fish score is **non-linear**, fast
  at the start, 80% for every entry and species known by common name, scientific names filling the last 20% slowly (the curve set by simulation), the Elo level kept alongside; the half fault must not be gameable (common
  names never advance the scientific-name progress; options listed, none chosen); the fish exams to rethink (per
  species or per family, e.g. about 20 hard questions answered with the scientific name); milestone cards for species
  names and scientific names; juveniles, colour phases and dimorphism introduced with an explanation card.
- 2026-11-04, Pierre (fish beta feedback; decided in principle, nothing built, docs/FISH_PATH.md): on a species question
  that asks for Latin, a typed common name counts **as half a fault** (a graded outcome 0.5: its effect on `eloStep`,
  `pgStep`, the expected success, the all-Latin exam and the replay to study first, starting values from
  `tools/learnsim.js`); **one global fish progress score** from 0 to every species in Latin (entries, species named,
  species in Latin as stages of one scale, the weights set by simulation), used by the fish leaderboard; the
  name-display thresholds start from learnsim, then are computed per species from the measured difficulty of the
  common against the Latin name; the first fish entries are a starter core of easy families and the first photos
  very easy (no juveniles or colour phases at the very start).
- 2026-11-04, Pierre (after a player's "Drill this pair" run fell to 6 misses in 13 with the hold on and nothing
  changed in the duel): the hold's easing reaches the Duel tab (`planDuel`), and a relief card the first time a duel
  run's answer takes the hold across `INTRO.HOLD`: Mix in other genera / Compare them (with Back to the duel, the same
  run) / Keep drilling, at most once a run, logged as a tip (`tip:duelhold`). Same detector, no new constant ("The Duel tab when the hold sets in").
- 2026-11-04: answer time compared within the same question format (2-choice apart, or the Duel tab apart) **not
  adopted**: every variant scored worse than the pooled median on the real log ("Considered and not adopted").
- 2026-11-04, Pierre ("the signal is already very clear on few players; the question is how to integrate it"; rule L1
  was about days between sessions, not the seconds an answer takes): **answer time weighs right answers** (rules
  version 4, sheet v32): a right answer's genus and level steps times clamp(1 − 1.5 z, 0.5, 1.5), z its log seconds
  against the median of the player's own earlier timed answers (kept exactly in `P['~level'].rt`, replayed from the
  log); misses, typed, untimed and the first 10 timed answers unchanged; on in the app only once the script is v32.
  Real answers: −2.20 ± 0.72 × 10⁻³ log-loss per answer against main, every timed player better, no group worse.
  learnsim (a time model calibrated on the two real measures, −0.88 and −0.39): no profile learns less, Elo error
  lower or within its spread ("Response time", section 5). rule L1 reworded.
- 2026-11-03, Pierre ("new genera open right after a wrong answer: it feels like a reward for it"): an opening only
  after a right answer (`model.js` `openRight`, `P['~level'].h`): after a miss no genus opens until the player answers
  right again, in any game; a card planned before the miss is planned again. Nothing else in the pace changes.
  Simulated (5 seeds x 300 questions): one to two genera fewer by question 100 for the beginner and the RAs (beginner
  18.4 → 16.2, lecture RA 20.6 → 18.6, strong RA 19.8 → 18.6), the expert unchanged, true knowledge within the spread
  from question 200 (beginner 0.28 → 0.26 at 100); on `main` about one card in five came right after a miss. Real
  answers: 22 of 130 first meetings on the path (17%) came on the question right after a miss ("An opening only after
  a right answer").

- 2026-11-04, Pierre ("I validate all your proposals", after the collapsed runs of 2026-11-03): the opening's pace
  (`openPace`: no card while a genus carded in the last 15 answers waits for its question, at most 3 in any 15, a
  carded genus asked as soon as ready; replaces the hotfix's cap and `OPEN.UNASKED`), easier questions while the hold
  is on (`holdEase`, h − `INTRO.HOLD` logits), the player's own mix-ups in the expectation (`confTerm`, on 3 or more
  plausible choices only: worse on the 2-choice questions on the real answers), the Again queue of 3 pairs, look-alikes
  from the data (`dataLook`: 20 offers, pooled score 0.2; one pair today, *Alveopora* / *Tubastraea*), an Again never
  on a genus not met, and a one-time apology card, only to the players who felt it (Pierre: not to a player of a
  single answer; 20 answers in the window and the hold at 3). Simulated: the pace bounded, knowledge as before or
  better, genera learned by 600 within the spread except the strong RA against the hotfix; real answers: the
  confusion term neutral overall (−0.0009 ± 0.0019) and better calibrated where it applies ("After the collapsed runs
  of 2026-11-03").

- 2026-11-03, Pierre (hotfix): two strong players' runs collapsed after #408 and #413 (one met 7 new genera in 16
  answers, three of them never asked, then fell from 83% to 50% right): `openChance` is capped at `OPEN.MAX` 0.5, and
  no genus opens while `OPEN.UNASKED` (3) genera opened earlier are still unasked. A stopgap until the full fix (opening
  pace per window, easier questions while the hold is on, the pair confusion term, data look-alikes).
  `tools/learnsim.js`, 5 seeds x 300 questions, true knowledge of the slate / genera met at questions 100 and 300:

  | Profile | `main` q100 | hotfix q100 | `main` q300 | hotfix q300 |
  | --- | --- | --- | --- | --- |
  | beginner | 0.31 / 23.2 | 0.29 / 18.8 | 0.65 / 38.2 | 0.60 / 34.6 |
  | lecture RA | 0.49 / 24.2 | 0.48 / 21.8 | 0.76 / 40.0 | 0.74 / 39.2 |
  | strong RA | 0.69 / 32.2 | 0.68 / 22.8 | 0.86 / 40.0 | 0.85 / 39.6 |
  | expert | 0.94 / 26.4 | 0.94 / 19.8 | 0.95 / 40.0 | 0.95 / 39.8 |

  Right %: within the seeds' spread (beginner 74 / 83 at 100 / 300, main 73 / 80). Tried first: no genus while any
  opened genus is unasked (`OPEN.UNASKED` 1): genera met by question 300 fell to 24-25 for every profile and true
  knowledge with them (strong RA 0.77, beginner 0.48): rejected; 2: 33-35 genera, strong RA 0.81: rejected; the cap
  alone: knowledge as `main`, but nothing stops a run of openings whose genera are never asked. Real log (rule L12):
  the rule only changes which question comes, not the Elo's predictions, so the log's log-loss is unchanged by
  construction; measured instead on the collapsed run's logged sequence: of its 7 cards in 16 answers, 4 pass the
  unasked rule (each then at a chance of at most 0.5) and 3 are blocked, 2 of them genera the run never asked.
- 2026-11-02, Pierre: anonymous answers do not rate photos; sign in to count (reversed the same day, below); stats only from players above chance;
  developer test answers deleted (admin anonDelete); first-answer-only rejected; experience weight and history-aware
  repeats; players start as beginners.
- 2026-11-02, Pierre: three player paths, nothing coded per path; progressive opening of genera, easiest first, from
  the data; experts keep hard traps; adaptive step (volatility); BKT start from the global level (point 3).
- 2026-11-02, Pierre: genera should open a little more easily for the RAs: `OPEN.K` 3 → 5 (table above); to
  recalibrate with real answers.
- 2026-11-02, Pierre: devices that never signed in count again for photo difficulty and confusions (sheet v18), under
  the same rule as everyone (clearly above chance, weighed by experience): the rule, not the
  sign-in, is what tells a real player from a bot or a test run. Signing in still saves the progress, for the trainer
  and on any device, and puts the player on the leaderboard.
- 2026-11-02, Pierre: the photo ratings must move quickly, the first players being RAs and experts who all bring real
  information (Pierre, Emmy, and an anonymous player who is probably IMR staff): `PHOTO_W.N` 30 → 10 (sheet v18). The
  10th answer of a player now weighs 0.5, the 30th 0.75 (were 0.25 and 0.5). `TRUST.N` stays 10: it counts a player's
  answers, which every real player passes quickly (lowered to 5 for a moment, when it read as answers per photo; there
  is no minimum per photo: one answer moves it, the app blending it with the photo's set as 5 answers' worth). To
  revisit if beginners or bots arrive in numbers.
- 2026-11-02, Pierre (beginner RA review): first-meeting cards, kinder first My progress, plain words, a bar under
  "Loading…" (above and ARCHITECTURE); ★ genera stay in from the start, being there for comparison. Then: 4 cards to
  start and questions among those, new genera one at a time, never asked right after their card; `OPEN.K` 5 → 6 to
  keep the RA's pace (table above). For the RAs, a button opens all genera at once (on the first cards and in My
  progress), and a card offers it after about 50 answers at a high level; all of it synced.
- 2026-11-02, Pierre: OK to seed the photos nobody has answered into the games to calibrate them (`CAL`, above).
- 2026-11-02, Pierre: relax the arbitrary thresholds so new photos come in quickly (he is validating many candidates)
  and their answers inform the dynamic algorithm: games take every kept photo (no cap of 4 Medium / 4 Hard), and a
  photo with few answers gets a wider targeting (`CAL.U`). Three seeds vary by ±5 genera at a given question count:
  the opening table moved within that noise (a run without `CAL.U` gave the RA 19-21 genera at question 300).
- 2026-11-02, Pierre: the opening as a slope rather than a switch, `OPEN.K` 6 → 10 (tables above), and no duel slipped
  into the quiz on a question that opens a genus. No setting added: "the simpler the algorithm, the better; rethink or
  recalibrate the existing variables rather than add one to patch a problem". K 12 on the first grid, 10 once the
  new photos were in. An independent review of the algorithm against the literature (Pelánek, Papoušek, Duolingo,
  BKT, interleaving) is done (ROADMAP, "To discuss") and may revisit this.
- 2026-11-02, Pierre: the progress % climbed far too fast and a right answer among a few genera counted almost as much
  as one against the genus's look-alikes. Agreed: a moving average weighed by what each answer proves, simulated first
  (6 seeds, 4 profiles, up to 1500 questions). BKT dropped; `PROG` A 0.15, exam entry 0.8 shown as 95%, look-alike
  factor 0.5, misses in full, a learned genus survives one miss; old progress recomputed from its last 10 results
  ("Progress (moving average) and mastery"). Sheet v22 computes the leaderboard % the same way. A pop-up announcing the
  recalculation to the players is not built yet (ROADMAP).
- 2026-11-02, Pierre: *Millepora* joins the slate (on the IMR benthic slate; the progress goes over 40 genera, announced
  with a second `RECALC` note); the other bonus genera become opt-in, offered once every slate genus has been asked, and open
  like slate genera, without their thresholds, weight cap or share limit ("Millepora and the bonus genera").
- 2026-11-02, Pierre: the fixed gentle restart (10 easy questions at every visit, left out of the hold) becomes a
  comeback planned from the time away (FSRS forgetting curve, stability from how solid each genus is and the days it
  was answered right), ended by the answers (a CUSUM), with no cap or duration threshold; time is used for that only
  (rule L1 exception), progress, mastery and ability never decay. Then: a new visit (30 minutes without an
  answer, the web-analytics session timeout) opens no genus in its first 10 answers, comeback or not; the comeback's
  answers feed the opening hold with the expectation they really had (logged `|c`, not left out like `|w`).
- 2026-11-03, Pierre: open the genera "easy and common first": `cm` from iNaturalist near Dauin (geometric mean of
  observations and observers, `tools/commonness.py`), one factor √((1 + cm) / (1 + median)) on the opening weight, no new
  constant ("Common first").
- 2026-11-03, Pierre: photo memory, points 1 and 2 of the proposal ("Photo memory"): one rule in the sheet (v26) and
  the app, estimated from the trusted answers with the old fixed rule as prior; the app's expectation includes it, a
  right answer on a known photo counts in the progress only for what memory does not explain (a ratio of chances, after
  the room-for-surprise version over-corrected in the simulation), misses weigh the chance the player had; ordinary
  questions weigh a photo already shown e^offset. Point 3 (more photos for the thinnest genera) stays with Pierre.
  Then, after the replay of the real log (bars down 1-3 points): everyone's saved progress recalculated once, silently.
- 2026-11-03, Pierre: after Open all, offer once to go back to one at a time when the answers fall clearly below
  expectation (a player at 90% on 13 genera fell to 62% on the ~27 opened at once): the opening hold's CUSUM counted
  from Open all, due at 2 × `INTRO.HOLD`, no answer count and no new constant (a replay of the answers: at the 21st
  after Open all; 30 answers + the hold would have come 4 answers before the player quit); One at a time closes every genus
  opened at once, answered or not, until its card reopens it, answers and progress kept ("First meeting with a genus").
  The starting ability of those genera measured, not changed ("Open all: the app's expectation against the truth").
- 2026-11-03, review item 7 (Pierre: do the review's simplifications still relevant): one contrast queue for the
  Again and the duels slipped into the quiz, `CONTRAST` {P 0.1, GAP 2} instead of `AUTO_DUEL` {P, FROM, GAP, AGAIN,
  SAME}; duels from the first answers ("One contrast queue").
- 2026-11-03, review item 8 (first half, Pierre the same day): one draw weight, `drawW` = 1 − x · c from the Elo's
  chance and its uncertainty, instead of the status weights; "Review" = shaky instead of 2 misses in the last 5. The
  wrong-pick update stayed (rule L2; its weight recalibrated in the next entry, which removed its Elo step) ("One draw
  weight").
- 2026-11-03, review item 4: one difficulty controller, the photo aimed so every question is right with the chance
  `PICKD.P` 0.8 in its format (`aimOff(k)`, typed included), the traps and single views on one schedule (`FORMAT`);
  `TARGET_OFF`, `TRAP` and `singleP`'s ramp removed ("One difficulty controller").
- 2026-11-03, review item 6: one opening rule, a card with the chance 1 − shaky / `OPEN.K` when the path allows one
  (`openChance`, `openPick`); `OPEN.READY`, `OPEN.TRICKLE` and the share of the draw removed; `OPEN.K` 10 → 8 ("One
  opening rule").
- 2026-11-03, Pierre: the app under-estimates strong players; the principle that a confusion affects both genera stays,
  its weight follows standard practice. The genus wrongly given no longer gets an Elo step (it counts in its progress,
  recent results and runs, as before), as in the Elo learner models of adaptive practice (Pelánek et al. 2017); on the
  real answers the next answer is predicted better (log-loss 0.481 → 0.465) and a strong RA's genera move from 0.11 to
  0.59 (fit 0.73); simulated, the error of the ability falls for every profile ("The genus wrongly given in the Elo").
- 2026-11-03, Pierre (strong players remain the priority): a genus moves with the global level since its own last
  step, weighed by its own uncertainty, both ways, and the level's step loses its `kmin` floor (Pelánek et al. 2017's
  global + concept skill). Real answers: log-loss 0.465 → 0.457, strong players' band −0.021; simulated, strong players
  recognised sooner and a beginner not over-rated. A one-way version (rises only) was rejected: biased upward ("Global
  level and genus").
- 2026-11-03, Pierre (22 genera by question 100 too many for a beginner; aim a beginner at about 85%): the success
  aimed for follows the global level, `PICKD.AIM` 85% up to 0.5 → 75% from 1.5, a straight line between; a genus is
  shaky against the same target (OPEN.P + aimed − 0.8). Simulated: the beginner back to `main`'s pace (20.2 / 28.0
  genera by questions 100 / 200), not over-rated, the strong players' gains kept; the opening's capacity by level and a
  sign gate on the level's move measured, not adopted ("Beginners and experts").

- 2026-11-03, Pierre: the Easy / Medium / Hard photo sets removed (one game list per view, the same photos), and the
  photo difficulty made hierarchical: a genus offset learned from every answer on the genus + the photo's own residual
  (sheet v31, `GENUS_K` 0.4, `?stats=1` `gd`), the app's prior for a photo with few answers the genus offset (0 with an
  older sheet). On the real log the app's next-answer log-loss goes from 0.4976 to 0.4812 (−0.016 [−0.028, −0.006]);
  simulated, no learning path changes beyond the seeds' spread ("Hierarchical photo Elo").
- 2026-11-03, Pierre (for everyone): a ★ genus opens only after the genus its card compares it to has been met (a
  beginner met *Duncanopsammia* and *Cyphastrea* before *Turbinaria* and *Astreopora*): the references read from the data
  (`core.js` `starRefs`, the genera of the card's "★ look-alike of …" line), a weight of 0 in the opening draw until
  they are met, Open all unchanged, no new constant ("Starred genera after their reference").
- 2026-11-03, Pierre: the first-launch question (new to corals / had the IMR coral course / know corals well), forced,
  in the welcome tour; it initialises variables of the model only (`playerStart` shrinks towards p 0 / 0.5 / 1.25, the
  open-all offer from answer 50 / 30 / 20, Coral basics offered first for "new"); existing players under 50 answers are
  asked once, the others inferred silently; a fallback card once per answer and direction when the first 20 answers'
  surprise is below −0.1 or above +0.18 ("The first-launch question").
- 2026-11-04, Pierre (on #428, after the variants compared): the fallback rule weighs the errors: a true beginner on
  the harder path is the costliest, so "lower" is sensitive (checkpoints 40 and 60 only; the global level under the
  band's floor at one-sided 80%, or the opening hold alone; "IMR course" and "know well" only) and its card a gentle
  offer (Coral basics or "No thanks, I know the basics"; Coral basics also moves the start variables one band down,
  silently, the answer given kept); "higher" unchanged; the open-all offer card shows the step as a big one ("Not now"
  on top). 36 of 40 wrong answers caught, 7 of 20 gentle offers to truthful answers; 40-60 adaptive answers cannot tell
  a beginner who said "IMR course" from a lecture RA: a placement test is the follow-up ("The rule since 2026-11-04").
- 2026-11-04, Pierre (on #428): the fallback test redesigned: checked at 20, 40 and 60 answers; "lower" from the level
  of the first answers on each genus (or the opening hold fired), "higher" only from 40 answers and 10 genera met, from
  the global level and the first answers together; no move back after a change made on its card; 35 of 40 wrong answers
  caught instead of 10 ("The fallback test, redesigned"). The full replay applies the first-launch prior (RVS v3).
- 2026-11-03, Pierre: a custom quiz, the photo quiz on the genera the player picks: the genus asked drawn among them by
  the usual weights with no opening path (a genus not met yet is asked with its card), the choices from them first
  (the trap rules inside the selection), topped up from the slate only under 4 genera; every answer counts as a
  photo-quiz answer, logged `quiz|s…` ("Custom quiz: the photo quiz on the genera the player picks").

- 2026-11-03, Pierre: the one-tap question varies (six items on felt difficulty, fun, frustration and boredom, in
  rounds, never twice in a row) and comes every 40 answers instead of 60 (twice that after a "Not now"), so the
  level-dependent target can be checked by level band; logged in the existing v19 events, no new sheet version; nothing
  in the game reads the answers yet ("What the players say about the difficulty").
- 2026-11-03, Pierre (reviewing that PR): every 40 answers approved; the rule that turns the answers into the
  level-dependent target approved, with the caution that felt difficulty is subjective (no move before the thresholds;
  built later, once data exists); "For me, the challenge is: Too low / Too high" replaced by "Right now I feel: Bored /
  In the zone / Struggling"; the question made a block of its own before Next; the response rate logged.
- 2026-11-05, Pierre (a bug seen on his phone: the one-tap question came when he had barely started his session): it
  never shows early in a session; the thresholds, 15 answers and 5 minutes into the current session (answers less than
  30 minutes apart), the integrator's call ("What the players say about the difficulty").

## References

- Literature reviews with their own reference lists, each reference marked with how it was checked (2026-11-09):
  [response time and difficulty](reference/lit-response-time.md) (Q315), [componential
  difficulty](reference/lit-componential-difficulty.md) (Q316, Q136), [photo memory](reference/lit-photo-memory.md)
  (Q317).
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. *Computers & Education*
  98. <https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf>
- Papoušek, J., Pelánek, R., Stanislav, V. (2014). Adaptive practice of facts in domains with varied prior knowledge.
  *EDM 2014*. <https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf>
- Pelánek, R., Papoušek, J., Řihák, J., Stanislav, V., Nižnan, J. (2017). Elo-based learner modeling for the adaptive
  practice of facts. *UMUAI* 27. <https://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf>
- Glickman, M. (1999). Parameter estimation in large dynamic paired comparison experiments. *Applied Statistics* 48;
  Glickman, M. (2012). Example of the Glicko-2 system.
- Park, Y. (2021). Glicko-2 for student ability and problem difficulty. *EDM 2021*.
  <https://educationaldatamining.org/EDM2021/virtual/static/pdf/EDM21_paper_8.pdf>
- Settles, B., Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*.
  <https://aclanthology.org/P16-1174> · code and data: <https://github.com/duolingo/halflife-regression>
- Duolingo, Birdbrain: <https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain>;
  IEEE Spectrum, How Duolingo's AI learns what you need to learn: <https://spectrum.ieee.org/duolingo>
- Corbett, A., Anderson, J. (1994). Knowledge tracing. *UMUAI* 4.
- Pelánek, R., Řihák, J. (2017). Experimental analysis of mastery learning criteria. *UMAP 2017*; Pelánek, R., Řihák, J.
  (2018). Analysis and design of mastery learning criteria. *New Review of Hypermedia and Multimedia* 24.
- Hofman, A. et al. (2020). Tracking with (un)certainty. *Journal of Intelligence* 8.
  <https://dspace.library.uu.nl/bitstream/1874/396191/1/jintelligence_08_00010_v2.pdf>; Bolsinova, M. et al. (2022).
  Urnings: a new method for tracking dynamically changing parameters in paired comparison systems.
- Doebler, P., Alavash, M., Giessing, C. (2014). Adaptive experiments with a multivariate Elo-type algorithm. *Behavior
  Research Methods* 47.
- van der Linden, W. J. (2006). A lognormal model for response times on test items. *Journal of Educational and
  Behavioral Statistics* 31, 181-204; van der Linden, W. J. (2007). A hierarchical framework for modeling speed and
  accuracy on test items. *Psychometrika* 72, 287-308.
- Bock, R. D. (1972). Estimating item parameters and latent ability when responses are scored in two or more nominal
  categories. *Psychometrika* 37, 29-51. Thissen, D., Steinberg, L. (1984). A response model for multiple choice items.
  *Psychometrika* 49.
- Ghosh, A., Raspat, J., Lan, A. (2021). Option tracing: beyond correctness analysis in knowledge tracing. *AIED 2021*.
  <https://arxiv.org/abs/2104.09043>
- Papoušek, J., Stanislav, V., Pelánek, R. (2016). Impact of question difficulty on engagement and learning. In
  *Intelligent Tutoring Systems (ITS 2016)*, LNCS 9684, pp. 267-272. Springer. <https://doi.org/10.1007/978-3-319-39583-8_28>;
  extended version: Evaluation of the impact of question difficulty on engagement and learning, FI MU Report Series
  FIMU-RS-2016-02, Masaryk University, March 2016 (the difficulty question and its results).
  <https://www.fi.muni.cz/reports/files/2016/FIMU-RS-2016-02.pdf>
- Rheinberg, F., Vollmeyer, R., Engeser, S. (2003). Die Erfassung des Flow-Erlebens [The flow short scale, FKS]. In
  Stiensmeier-Pelster, J., Rheinberg, F. (eds.), *Diagnostik von Motivation und Selbstkonzept* (pp. 261-279).
  Göttingen: Hogrefe. Items in Rheinberg, Vollmeyer & Engeser (2019), FKS. Flow-Kurzskala [Verfahrensdokumentation],
  Open Test Archive, ZPID. <https://doi.org/10.23668/psycharchives.4488>
- IJsselsteijn, W. A., de Kort, Y. A. W., Poels, K. (2013). *The Game Experience Questionnaire*. Technische Universiteit
  Eindhoven (FUGA project; section 3, In-game GEQ, and its scoring guidelines).
  <https://pure.tue.nl/ws/files/21666907/Game_Experience_Questionnaire_English.pdf>
- Ryan, R. M., Rigby, C. S., Przybylski, A. (2006). The motivational pull of video games: a self-determination theory
  approach (PENS). *Motivation and Emotion* 30.
- Csikszentmihalyi, M. (1975). *Beyond boredom and anxiety*. Jossey-Bass (the flow channel between boredom and
  anxiety; 25th anniversary edition 2000, *Beyond boredom and anxiety: experiencing flow in work and play*).
- Csikszentmihalyi, M. (1990). *Flow: the psychology of optimal experience*. Harper & Row; Csikszentmihalyi, M., Larson,
  R. (1987). Validity and reliability of the experience-sampling method. *Journal of Nervous and Mental Disease* 175.
- Sauro, J., Dumas, J. S. (2009). Comparison of three one-question, post-task usability questionnaires. *CHI 2009*,
  pp. 1599-1608. ACM. <https://doi.org/10.1145/1518701.1518946>
- Bolsinova, M. et al. (2025). Keeping Elo alive. *British Journal of Mathematical and Statistical Psychology*.
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12784335/>
- Klinkenberg, S., Straatemeier, M., van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using a
  new item response model for on the fly ability and difficulty estimation. *Computers & Education* 57(2), 1813-1824.
  <https://doi.org/10.1016/j.compedu.2011.02.003>
- Maris, G., van der Maas, H. (2012). Speed-accuracy response models: scoring rules based on response time and
  accuracy. *Psychometrika* 77(4), 615-633. <https://doi.org/10.1007/s11336-012-9288-y>
- Cameron, A. C., Gelbach, J. B., Miller, D. L. (2008). Bootstrap-based improvements for inference with clustered
  errors. *Rev. Econ. Stat.* 90(3), 414-427. <https://www.nber.org/papers/t0344>
