# Placement test check: do 10-15 questions place a player? (2026-11-18)

Status: study, read-only. No app code, data file, photo or sheet cell was changed; the sheet was read through the Google
Sheets connector, every extract stayed in the session's scratchpad. Aggregates only: no name, no per-player row. Pierre's
choices are in the last section, as (a), (b)…; the integrator numbers the ones that need a number.

Why it exists. Pierre, 2026-11-18: would a short placement test work, a hidden one by default (the first 10-15
questions chosen to estimate the player's level) plus an explicit one players may take or skip? "Est-ce que 10 à 15
questions ça marche vraiment? Ou alors il faut qu'on ait des photos hyper calibrées?" Then, 10:17 Manila, his caveat:
most players began under a much less capable engine, so their first questions were not chosen as a test would choose
them: use the progress replayed under today's rules as the outcome, read the first-answers result as a lower bound, count
the first answers that fell on well-calibrated photos, and add a simulated check of a designed test if learnsim can run
one without code changes.

Labels (rule W11): **[measured]** = computed by a script on the Answers tab read 2026-11-18 about 10:20 Manila, with
`core.js` of `main` @08909990; **[model]** = computed from the game's own response model (the Elo's
g + (1 − g) sigmoid(level − difficulty)), not from players: a best case under its assumptions; **[read]** = read in a
file or a doc; **[guess]** = my judgement.

## Short answer

- **Ten to fifteen questions place the ends, not the middle.** On the real log, the level fitted on a player's first 10,
  15 and 20 answers put 6, 5 and 8 of 10 coral players in the band their replayed level reached at answer 100 (3 bands;
  "everyone in the commonest band" gets 5 of 10) [measured]. The fit's error after 15 answers is about 1.1 [measured].
  Even a well-designed test of 15 four-choice questions [model] places a player in the middle of the "IMR course" band
  (0.25 to 0.875, only 0.625 wide) right only 3 to 4 times in 10, while a beginner or a strong player lands in their
  band 7.5 to 9 times in 10.
- **Hyper-calibrated photos would not change that.** What limits 15 questions is the noise of 15 right-or-wrong answers:
  photos rated only to ±0.8 cost 0 to 0.13 of the right-band rate, and even exact ratings leave the middle band under
  0.45 [model]. Photos rated on 20 or more answers each are enough; what matters more is a spread of difficulty (hard
  formats for strong players) and units the player has not met.
- **But well-chosen questions are worth about twice the first real ones.** The players' first 15 answers carried a
  median 0.07 of information each about their level [measured], under half of the 0.155 a four-choice question at the
  player's level can carry [model] (easy choices, two-choice questions, photos far from the level). A designed
  15-question test would say about as much as the first 30-35 answers of today's game.
- **No subject has the photo pool for it today.** Corals: 39 photos rated on 10 or more answers from 3 or more players,
  none on 20. Fish: none on 10 (median one answer per photo). Sea slugs: no answer and no rated photo yet [measured].
- **Recommendation: no hidden test now.** It would bring a level as good as today's at answer 30-35 to answer 15, and
  the prior it sets fades within a few dozen answers; to beat the game's first answers it must ask units the player
  has not opened (rule L4) from a calibrated pool no subject has. An explicit opt-in test is possible later for the
  corals, with a calibration set built first, 20-25 questions rather than 10-15, and Pierre's choices (last section).

## What was measured, and how

**The log** [measured]. 6,207 rows: corals 3,491 answers (2,047 of them logged before the Subject column existed, blank
there: corals), 16 players, **10 with 100 answers or more**, 5 with 200 or more; fish 2,710 answers (6 surprise-card
rows left out, `core.js` `subjRows`), 9 players, **6 with 100 or more**, 5 with 200 or more; **sea slugs 0 answers**. No
row without a player. No player is in a "Stats excluded" tab (none exists).

**The outcome: the level at answer 100, replayed under today's rules** (Pierre's caveat (1)). Each player's first 100
answers of the subject go through `core.js` `replayProgress` exactly as the sheet's replay does: the rows built as
`Code.gs` `rowOf_` builds them (the scoring record of each row included), the units built as `subjRpl_` builds them
(the base file with the structure in force from `curation.json`; the fish's variant table), the corals' pooled photo
memory, confusions, format and genus offsets from the sheet's served statistics, and the player's first-launch record.
The outcome is the global level `~level.th` after the 100th answer (`docs/LEARNING.md` "What each number measures"),
not the copy saved at the time. Checked against the sheet's own replays [measured]: corals, 14 of 15 players with the
same row count within 0.03 of the "Replayed" tab's level (the 15th's tab row is older, fewer rows); fish, 9 of 9
identical to "Replayed Fish". Answer times come from the answer id's first eight base-36 characters (the device's
milliseconds), checked against the Time column. Secondary outcomes: the band at answer 200 (players with 200 answers),
the coral progress % at answer 100 (`pctOf`), and a level fitted on answers 21-100 only (independent of the first 20).

**The bands.** The app's own, `core.js` `startBand`, from the first-launch priors: beginner below 0.25, IMR course 0.25
to 0.875, knows well above 0.875 [read]. They map one-to-one onto the first-launch answers (new, IMR course, know well),
so the comparison with today's baseline is direct. A fourth band for the request's "good / expert" split: good 0.875 to
1.625, expert from 1.625 (the midpoint between the "know well" prior 1.25 and the simulated expert's 2.0 [read]).

**The estimate from the first N answers** (N = 10, 15, 20): `core.js` `levelFit`, the app's own maximum-likelihood level
over [difficulty, guess rate, right], searched from −1.5 to 3. Each question's difficulty is the pooled photo Elo's own
(`core.js` `eloReplay` [read]): the mean of its photos' ratings (genus offset + photo residual), +0.5 for a photo shown
alone, plus the player's photo memory term; minus the format's offset as the game scored the answer (the scoring
record's `o`, else the served `fmt` for its format, `fmtOf`), so the fit sits on the same scale as the replayed level;
the guess rate 1/k of its format (`guessOf`). Two versions of the ratings: as served, and **refitted without the
player** (`core.js` `eloOf` on everyone else's answers; it reproduces the served ratings exactly on the full log, corals
and fish [measured]), so a player's own answers never rate the photos that estimate them. A photo no one else answered
takes its genus offset, as the Elo starts one. Below, the figures are the refitted version; the served one gives the
same band counts.

**Well rated.** The sheet keeps each photo's plain answer count (the fourth field of `?stats=1` photos). Main threshold:
**10 answers or more, from 3 players or more**; 5 and 20 shown too. What a count buys [model: one answer near 80% right
with 4 choices carries 0.135 of Fisher information]: a rating rests on about ±1.2 logits after 5 answers, ±0.86 after
10, ±0.61 after 20, ±0.38 after 50.

**The first-launch answer, today's baseline.** The player's first answer of their own (welcome tour or card), never an
inferred one (inferred from the level: circular), placed by its time among the player's logged answers (the record's
own count is the device's); its prior (0, 0.5, 1.25) is the estimate. Corals: 6 of the 10 players have one; 4 gave it
before their first or second logged answer, 1 at answer 49 (the card for existing players), 1 only after answer 160,
left out; the 4 others have only an inferred answer (at 112 answers or later). Fish: 6 of 6, all before their first
logged answer. Also "the answer in force at answer 100": the first answer plus the level card's moves (Pierre's admin
changes left out), that is the first-launch question and the level card as players met them.

## Results

### Corals: 10 players [measured]

Outcome: the replayed level at answer 100, 3 bands. At answer 100 the 10 players sit 3 / 2 / 5 in the three bands
(levels −0.69 to 2.37).

| Estimate | Players | Band right | One band off | Two off | Spearman (bootstrap 95%) |
| --- | --- | --- | --- | --- | --- |
| Level fitted on the first 10 answers | 10 | 6 | 2 | 2 | 0.63 (−0.02 to 0.91) |
| first 15 | 10 | 5 | 4 | 1 | 0.68 (−0.04 to 1.00) |
| first 20 | 10 | 8 | 1 | 1 | 0.75 (0.20 to 1.00) |
| Everyone in the commonest band | 10 | 5 | | | |
| First-launch answer, given before answer 60 | 5 | 2 | 3 | 0 | too small |
| Answer in force at answer 100 (with the level card) | 5 | 2 | 2 | 1 | too small |
| First 15 answers, on the same 5 players as the first-launch answer | 5 | 3 | | | too small |

- **4 bands** (good / expert split): first 15 answers 5 of 10 right, 4 one off, 1 two off (commonest band 3 of 10);
  first-launch answer 0 of 5 right ("know well", prior 1.25, falls in "good" and never says expert: the 2 who said it
  are experts at answer 100).
- **The first-launch answer's misses are all one band**: the 2 players who said "know well" are in the top band; of the
  3 who said "IMR course", 2 sit below 0.25 at answer 100 and 1 above 0.875. The band edges come from the priors and
  the simulation, not from real players; on 3 players this is a thing to watch, not a finding.
- **The level card** fired once among these 10 (upward); Pierre later set 2 of the 10 to "IMR course" from the admin
  (one after that card, one after an inferred "know well").
- **The fit's standard error** (median over players): 1.20 after 10 answers, 1.07 after 15, 0.82 after 20, against a
  middle band 0.625 wide. 3 of the 10 first-10 fits (2 at 15 and 20) sit at the top of the search range: all or nearly
  all right, so "at least know well" and no more.
- **Information**: the first 15 answers carried a median 1.05 of Fisher information about the player's level at answer
  100 (0.67 to 2.14), 0.07 an answer.
- **The yardstick moves too**: of the 5 players with 200 answers, 3 are in the same band at 100 and 200, 2 one band off.
- **Independent of the first 20 answers**: against a level fitted on answers 21-100 only, the Spearman of the first-N
  estimate is 0.64 / 0.60 / 0.66 (N 10 / 15 / 20; intervals from about −0.15 to 0.95), a little under the figures
  above: part of the agreement is the first answers counted on both sides. Against the coral progress % at answer 100
  (5% to 20%): 0.66 / 0.90 / 0.95.

### Fish: 6 players [measured]

At answer 100, 5 of the 6 sit in the top band (levels −0.24 to 2.64): too small and too uniform to judge a test.

| Estimate | Players | Band right | One band off | Two off | Spearman (bootstrap 95%) |
| --- | --- | --- | --- | --- | --- |
| first 10 answers | 6 | 4 | 0 | 2 | 0.76 (0 to 1) |
| first 15 | 6 | 4 | 0 | 2 | 0.41 (−0.80 to 1) |
| first 20 | 6 | 4 | 0 | 2 | 0.43 (−0.80 to 1) |
| Everyone in the commonest band | 6 | 5 | | | |
| First-launch answer | 6 | 1 | 4 | 1 | 0.68 (−0.14 to 1) |
| Answer in force at answer 100 (with the level card) | 6 | 2 | 4 | 0 | too small |

The first answers do worse than "everyone knows fish well"; the first-launch answer mostly under-claims (4 of the 5
in the top band said "IMR course" or "new"). Fit error: 1.43 / 0.91 / 0.80 (N 10 / 15 / 20); information of the first
15 answers, median 0.99 (0.066 an answer). Of the 5 with 200 answers, 4 are in the same band at 100 and 200.

### How many first answers fell on well-rated photos (Pierre's caveat (2)) [measured]

| Subject | Answers among the first 15 on photos rated on 10+ answers from 3+ other players | With the player's own answers counted |
| --- | --- | --- |
| Corals (10 players) | 0 for 8 players, 1 for 2 | 0 to 3 (median 1) |
| Fish (6 players) | 0 for all 6 | 0 for all 6 |

So the estimate cannot be redone on well-rated photos only: no player has 5 such answers among their first 15. At the
lower bar of 5 answers, 2 of the 10 coral players have 5 or more, both placed in the right band: too few to say anything.

### How to read these numbers

- **What lowers them** (Pierre's caveat): the first questions were drawn by older engines for learning, not for
  measuring; almost none fell on a well-rated photo, they carried half the information a chosen question carries, and 3
  of 10 coral first-10 fits hit the top of the scale for lack of hard questions. A designed test would do better.
- **What raises them**: the first answers are part of the level at answer 100 (against answers 21-100 the correlation
  is a little lower); the outcome replays the first-launch prior too (weight 10 answers in 110, `START.N`); and 10
  players spread from −0.7 to 2.4 are easy to rank. The leave-one-out ratings remove the in-sample photo ratings.
- **So the real-log figures are not a clean lower bound**, as Pierre's caveat asked them to be read: both effects are
  there. They say that 10-20 first answers rank these players roughly as answer 100 does, and that the n is too small
  for any accuracy figure to be trusted beyond ±2 players. The firmer answer to "do 10-15 questions work" is the
  error model below.

### A designed test, best case: placement probabilities [model]

**Pierre's caveat (3), the learnsim check, is skipped**: `tools/learnsim.js` drives the real photo quiz and has no
option that chooses the questions (its arguments: seeds, questions, profiles, choice, fallback, openall, custom, drill,
stats, truth, world…); a designed test would need new code there, which this read-only study does not build.

In its place, a finite-sample check on the game's own response model, with the app's own estimator (`core.js`
`levelFit`): the chance that a test of N questions puts a player in the right one of the 3 bands, for players at −0.5
(beginner), 0.56 (the middle of "IMR course") and 1.5 (knows well). Four designs: every question exactly at the
player's true level (an oracle; the number right enumerated exactly); the same with each photo's rating off by a normal
error of sd 0.8 (about 10 answers a photo); adaptive (each next question at the current estimate, starting at 0.5); and
adaptive with ratings off by 0.8. Monte Carlo, 3,000 tests a cell (±0.01-0.02).

| Questions | Format | At level, exact | At level, ratings ±0.8 | Adaptive | Adaptive, ratings ±0.8 |
| --- | --- | --- | --- | --- | --- |
| 10 | 4 choices | 0.79 / 0.25 / 0.69 | 0.80 / 0.23 / 0.68 | 0.72 / 0.26 / 0.79 | 0.73 / 0.24 / 0.74 |
| 15 | 4 choices | 0.87 / 0.41 / 0.84 | 0.84 / 0.28 / 0.71 | 0.77 / 0.31 / 0.83 | 0.81 / 0.30 / 0.76 |
| 20 | 4 choices | 0.92 / 0.35 / 0.82 | 0.88 / 0.32 / 0.74 | 0.83 / 0.37 / 0.86 | 0.86 / 0.35 / 0.80 |
| 15 | typed | 0.94 / 0.39 / 0.85 | 0.88 / 0.38 / 0.83 | 0.91 / 0.43 / 0.86 | 0.89 / 0.39 / 0.86 |
| 25 | 4 choices | 0.88 / 0.46 / 0.90 | 0.91 / 0.35 / 0.77 | 0.87 / 0.42 / 0.89 | 0.90 / 0.39 / 0.83 |
| 40 | 4 choices | 0.97 / 0.59 / 0.93 | 0.95 / 0.42 / 0.81 | 0.93 / 0.51 / 0.94 | 0.96 / 0.48 / 0.89 |

- **The middle band is the limit at every size**: 0.25 to 0.43 at 10-15 questions, under 0.5 at 25, whatever the
  design. The ends: 0.7 to 0.9 from 10-15 questions. (The exact column moves unevenly with N: with identical questions
  the estimate can only take N + 1 values.)
- **Photo ratings matter, but less than the number of questions**: ratings off by 0.8 take 0 to 0.13 off a cell, most
  at the top band (a strong player needs hard questions known to be hard). Photos rated on 20+ answers (±0.6) would cost
  less; nothing here needs "hyper-calibrated" photos.
- **The costly error is not rare with an adaptive start**: a beginner at −0.5 lands in the top band 8% of the time after
  15 adaptive four-choice questions (a lucky run pulls the next questions up). The level card guards against exactly
  that; a placement test would need the same guard.
- The asymptotic shortcut (error 1/√(N × information), at most 0.155 a four-choice question, 0.25 typed) gives about
  0.66 after 15 questions and about the same right-band rates; it understates the effect of rating errors and of the
  adaptive start, hence the table. At the information the real first answers carried (0.07 an answer), 15 answers give
  an error of about 1.0, close to the 1.07 measured above.

## The item pool per subject [measured]

| Subject | Photos rated | 5+ answers (3+ players) | 10+ answers (3+ players) | 20+ answers | Answers per photo | Genus / family offsets on 50+ weighed answers |
| --- | --- | --- | --- | --- | --- | --- |
| Corals | 1,405 | 314, in 39 genera | 39, in 16 genera | 0 | median 3, max 17 | 34 of 45 |
| Fish | 2,163 | 6 | 0 | 0 | median 1, max 5 | 20 of 81 |
| Sea slugs | 0 | 0 | 0 | 0 | none | 0 (no answer yet) |

- Corals, difficulty of the photos with 5+ answers: 10th percentile −0.72, median 0.01, 90th 0.87 (sd 0.62); with 10+:
  −0.26 / 0.28 / 0.91. Strong players (2 of the 10 above 1.6 at answer 100) need harder questions than that: single
  views, look-alike choices, typed names (the format offsets the game already has).
- The genus offsets are well rated for most coral genera (34 of 45 on 50+ weighed answers). How far a single photo
  sits from its genus is **not known** from this log: the fitted residuals spread by only 0.3-0.4, but they start at 0
  and move little on 1-5 answers, so that spread says how little they have moved, not how alike the photos are. A test
  built on genus offsets alone would carry an unmeasured error; a held-out check of photo predictions would measure it.
- **Sea slugs: not yet.** No answer in the log, the "Stats Sea slugs" tab holds no photo, and the "Replayed Sea slugs"
  tab 0 rows for every player.
- **Fish**: the pool is too large for its answers (2,163 photos for 2,710 answers): no photo will reach 20 answers
  without a fixed calibration set.

## Recommendation

**1. A hidden 10-15 question test: no, not now** [guess, from the measures above].

- What it would add is real but bounded: a level at answer 15 about as good as today's at answer 30-35 (the first real
  answers carry half the information a chosen question does). The level card's first checkpoint (answer 40) already
  sits about there.
- What it would set fades fast. The first-launch prior weighs 10 answers (`START.N`): 1/6 after 50 answers, under 5%
  after 200; the simulation found the right first-launch answer leaves learning outcomes within the spread and improves
  the fit of the first questions (`docs/LEARNING.md` "The first-launch question"). A better prior buys a better fit of
  roughly questions 15-50, no more.
- It meets the same limit as the level card for the middle band: 15 questions, however chosen, place a mid-band player
  right 3 to 4 times in 10, and an adaptive one puts a beginner in the top band about 1 time in 12.
- To be informative it must ask hard questions and units the player has not met (an expert's first answers come from
  the few opened genera, all easy). That draws outside `unlocked()`, against rule L4: Pierre's call (choice (b)). And it
  needs a calibrated pool, which no subject has.

**2. Cheaper, from today's tools** (proposals):
- Watch the band edges on real players: of the 3 coral players who said "IMR course" early, 2 sit below 0.25 at answer
  100. Once 20 or more players have both a first-launch answer and 100 answers, refit the edges (0.25 / 0.875) on them,
  as LEARNING already plans ("recalibrate on the first cohort that answers the question"). Nothing to do now: n = 3.
- Keep the first-launch question and the level card as they are.

**3. An explicit opt-in test, later, corals first.** What it needs:
- **An item pool**: about 40-60 coral photos rated on 20 or more answers from 5 or more players each, spread from about
  −1 to +2 with hard formats in it (single view, look-alike choices, typed), across the slate's common genera. Today 0
  photos have 20 answers; at the corals' pace (about 3,500 answers in 17 days over 1,405 photos) they come only if a
  fixed calibration set is shown more often (the photo exposure rule, Q187-Q190, would need to allow it). Fish: the same
  with a fixed set of a few photos per family. Sea slugs: wait for answers.
- **20-25 questions, adaptive** (each next photo near the current estimate), typed where the player can, with a guard
  against a lucky start: that places the ends 8-9 times in 10 and the middle about 4 times in 10. 10-15 questions place
  the ends 7.5-9 times in 10.
- **What its result sets**: variables only (rule L10: the prior p and Coral basics), never a path; its answers count
  like any answer in progress and photo ratings (rules D9, L3).
- **A check**: learnsim needs an option that runs a test before the quiz (rule L11 level 1, the app world), then the real
  log once players take it (L12).
- **Effort** [guess, agent time]: the calibration set and its exposure, about half an agent-day plus the players' time
  to answer (weeks); the test (engine, card, record, tests, the learnsim option and its check), about two agent-days.

## Choices for Pierre

- **(a)** No hidden placement test; the first-launch question and the level card stay as they are. Recommended.
- **(b)** If a test comes: may it ask about units the player has not opened yet (an exception to rule L4, one
  progression path)? Without it, a test cannot tell an expert from a good beginner on their first answers.
- **(c)** Start a coral calibration set now (a fixed set of about 50 photos shown a little more often until each has
  20 answers), so an opt-in test can be built later? Recommended only if (b) is yes.

## What this can conclude (rule A5)

- It can say how precise a level from 10, 15 or 20 answers can be (the placement check on the game's own model, independent of the sample), how
  much the real first answers said, how many photos each subject has well rated, and how the first answers and the
  first-launch answer compared with the level at answer 100 for these 10 coral and 6 fish players.
- It cannot give an accuracy rate for a designed test on real players (none has taken one, and no first answer fell on a
  calibrated photo), nor judge the fish or the sea slugs (6 players, nearly all in one band; no sea slug answer). Every
  count rests on 16 players in all, IMR people and the owner's account: a narrow population.
