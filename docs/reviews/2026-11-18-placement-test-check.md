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
`core.js` of `main` @08909990; **[read]** = read in a file or a doc; **[guess]** = my judgement.

## Short answer

- **Ten to fifteen questions place the ends, not the middle.** On the real log, the level fitted on a player's first 15
  answers put 7 of 10 coral players in the band their replayed level reached at answer 100 (3 bands), against 5 of 10
  for "everyone in the commonest band" [measured]. But the fit's standard error after 15 answers is about 1.1 [measured],
  and even a perfect test of 15 four-choice questions, each photo exactly at the player's level, leaves an error of
  about 0.66 [measured: the model's Fisher information, below]. The middle band ("IMR course", 0.25 to 0.875) is only
  0.625 wide: a player in its middle lands in it about 1 time in 3 after 15 such questions, while a beginner or a strong
  player lands in their band 8-9 times in 10.
- **Hyper-calibrated photos would not change that.** What limits 15 questions is the noise of 15 right-or-wrong answers,
  not the photos: with each photo's difficulty known only to ±0.8, the right-band rate of a mid-band player moves from
  0.37 to 0.35 at 15 questions [measured, same model]. Photos rated on 20 or more answers each are enough; what matters
  more is a spread of difficulty (hard formats for strong players) and units the player has not met.
- **No subject has such a photo pool today.** Corals: 39 photos rated on 10 or more answers from 3 or more players, none
  on 20. Fish: none on 10 (median one answer per photo). Sea slugs: no answer and no rated photo yet [measured].
- **Recommendation: no hidden test now.** The game's own global level already reads every answer as a test would, at
  nearly the most information an answer can carry, and the prior a hidden test would set fades within a few dozen
  answers. An explicit opt-in test is possible later for the corals, with a calibration set built first, 20-25
  questions rather than 10-15, and two decisions from Pierre (last section).

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
The outcome is the global level `~level.th` after the 100th answer (`docs/LEARNING.md` "What each number measures").
Checked against the sheet's own replays [measured]: corals, 14 of 15 players with the same row count within 0.03 of the
"Replayed" tab's level (the 15th's tab row is older, fewer rows); fish, 9 of 9 identical to "Replayed Fish". Answer times
come from the answer id's first eight base-36 characters (the device's milliseconds), checked against the Time column.
Secondary outcomes: the band at answer 200 (players with 200 answers), the coral progress % at answer 100 (`pctOf`), and
a level fitted on answers 21-100 only (independent of the first 20).

**The bands.** The app's own, `core.js` `startBand`, from the first-launch priors: beginner below 0.25, IMR course 0.25
to 0.875, knows well above 0.875 [read]. They map one-to-one onto the first-launch answers (new, IMR course, know well),
so the comparison with today's baseline is direct. A fourth band for the request's "good / expert" split: good 0.875 to
1.625, expert from 1.625 (the midpoint between the "know well" prior 1.25 and the simulated expert's 2.0 [read]).

**The estimate from the first N answers** (N = 10, 15, 20): `core.js` `levelFit`, the app's own maximum-likelihood level
over [difficulty, guess rate, right], searched from −1.5 to 3. Each question's difficulty is the pooled photo Elo's own:
the mean of its photos' ratings (genus offset + photo residual), +0.5 for a photo shown alone, plus the player's photo
memory term, with the guess rate 1/k of its format (`guessOf`) [read: `core.js` `eloReplay`]. Two versions of the
ratings: as served, and **refitted without the player** (`core.js` `eloOf` on everyone else's answers; it reproduces the
served ratings exactly on the full log, corals and fish [measured]), so a player's own answers never rate the photos
that estimate them. A photo no one else answered takes its genus offset, as the Elo starts one. Below, the figures are
the refitted version; the served one differs by at most one player per cell.

**Well rated.** The sheet keeps each photo's plain answer count (the fourth field of `?stats=1` photos). Main threshold:
**10 answers or more, from 3 players or more**; 5 and 20 shown too. Rule of thumb for what a count buys [measured on the
model: one answer near 80% right with 4 choices carries 0.135 of Fisher information]: a rating rests on about ±1.2
logits after 5 answers, ±0.86 after 10, ±0.61 after 20, ±0.38 after 50.

**The first-launch answer, today's baseline.** The player's first answer of their own (welcome tour or card), never an
inferred one (inferred from the level: circular); its prior (0, 0.5, 1.25) is the estimate. Corals: 6 of the 10 players
have one (4 others were inferred at 112 answers or later); 5 gave it at answer 0-1, one at 49 (the card for existing
players). Fish: 6 of 6 (one at answer 16). Also "the answer in force at answer 100" (first answer plus the level card's
moves, Pierre's admin changes left out): the first-launch answer plus the level card as players met them.

## Results

### Corals: 10 players [measured]

Outcome: the replayed level at answer 100, 3 bands. At answer 100 the 10 players sit 3 / 2 / 5 in the three bands
(levels −0.69 to 2.37).

| Estimate | Players | Band right | One band off | Two off | Spearman (bootstrap 95%) |
| --- | --- | --- | --- | --- | --- |
| Level fitted on the first 10 answers | 10 | 6 | 2 | 2 | 0.75 (0.17 to 0.98) |
| first 15 | 10 | 7 | 2 | 1 | 0.74 (0.09 to 1.00) |
| first 20 | 10 | 7 | 2 | 1 | 0.81 (0.25 to 1.00) |
| Everyone in the commonest band | 10 | 5 | | | |
| First-launch answer | 6 | 2 | 4 | 0 | 0.83, 3 values only |
| Answer in force at answer 100 (with the level card) | 5 | 2 | 2 | 1 | 0.58 (−0.40 to 1.00) |
| First 15 answers, on the same 6 players as the first-launch answer | 6 | 4 | 1 | 1 | 0.93 (0.50 to 1.00) |

- **4 bands** (good / expert split): first 15 answers 6 of 10 right, 2 one off, 2 two off (commonest band 3 of 10);
  first-launch answer 0 of 6 right, 6 one off ("know well", prior 1.25, falls in "good"; it never says expert).
- **The first-launch answer's misses are all one band, and all but one in the same direction**: 3 of the 4 players who
  said "IMR course" sit below 0.25 at answer 100; the 2 who said "know well" are in the top band. The band edges come
  from the priors and the simulation, not from real players; on 4 players this is a thing to watch, not a finding.
- **The level card** fired once among these 10 (upward); Pierre later set 2 of the 10 to "IMR course" from the admin
  (one after that card, one after an inferred "know well").
- **The fit's standard error** (median over players): 1.20 after 10 answers, 1.07 after 15, 0.82 after 20, against a
  middle band 0.625 wide. 3 of the 10 first-10 fits (2 at 15 and 20) sit at the top of the search range: all or nearly
  all right, so "at least know well" and no more.
- **The yardstick moves too**: of the 5 players with 200 answers, 3 are in the same band at 100 and 200, 2 one band off.
- **Independent of the first 20 answers**: against a level fitted on answers 21-100 only, the Spearman of the first-N
  estimate falls to 0.67 / 0.53 / 0.66 (N 10 / 15 / 20; intervals from about −0.2 to 0.97): part of the agreement above
  is the first answers counted on both sides. Against the coral progress % at answer 100 (5% to 20%): 0.75 / 0.93 / 0.95.

### Fish: 6 players [measured]

At answer 100, 5 of the 6 sit in the top band (levels −0.24 to 2.64): too small and too uniform to judge a test.

| Estimate | Players | Band right | One band off | Two off | Spearman (bootstrap 95%) |
| --- | --- | --- | --- | --- | --- |
| first 10 answers | 6 | 4 | 0 | 2 | 0.76 (0 to 1) |
| first 15 | 6 | 4 | 0 | 2 | 0.64 (−0.46 to 1) |
| first 20 | 6 | 4 | 0 | 2 | 0.43 (−0.80 to 1) |
| Everyone in the commonest band | 6 | 5 | | | |
| First-launch answer | 6 | 1 | 4 | 1 | 0.68 (−0.14 to 1) |
| Answer in force at answer 100 (with the level card) | 6 | 2 | 4 | 0 | 0.83 |

The first answers do worse than "everyone knows fish well"; the first-launch answer mostly under-claims (4 of the 5
in the top band said "IMR course" or "new"). Fit error: 1.43 / 0.91 / 0.79 (N 10 / 15 / 20). Of the 5 with 200
answers, 4 are in the same band at 100 and 200.

### How many first answers fell on well-rated photos (Pierre's caveat (2)) [measured]

| Subject | Answers among the first 15 on photos rated on 10+ answers from 3+ other players | With the player's own answers counted |
| --- | --- | --- |
| Corals (10 players) | 0 for 8 players, 1 for 2 | 0 to 3 (median 1) |
| Fish (6 players) | 0 for all 6 | 0 for all 6 |

So the estimate cannot be redone on well-rated photos only: no player has 5 such answers among their first 15. At the
lower bar of 5 answers, 2 of the 10 coral players have 5 or more, both placed in the right band: too few to say anything.

### How to read these numbers

- **What lowers them** (Pierre's caveat): the first questions were drawn by older engines for learning, not for
  measuring; almost none fell on a well-rated photo, nor spread in difficulty (3 of 10 coral first-10 fits hit the top
  of the scale for lack of hard questions). A designed test would do better on that count.
- **What raises them**: the first answers are part of the level at answer 100 (against answers 21-100 the correlation
  drops by 0.1 to 0.2); the outcome replays the first-launch prior too (weight 10 answers in 110, `START.N`); and 10
  players spread from −0.7 to 2.4 are easy to rank. The leave-one-out ratings remove the in-sample photo ratings.
- **So the real-log figures are neither a clean lower nor a clean upper bound**: they say 10-20 first answers rank
  these players roughly as answer 100 does, and that the n is too small for any accuracy figure to be trusted beyond
  ±2 players. The firmer answer to "do 10-15 questions work" is the error model below.

### A designed test, best case: the error model [measured on the model; not a simulation]

**Pierre's caveat (3), the learnsim check, is skipped**: `tools/learnsim.js` drives the real photo quiz and has no
option that chooses the questions (its arguments: seeds, questions, profiles, choice, fallback, openall, custom, drill,
stats, truth, world…); a designed test would need new code there, which this read-only study does not build.

In its place, the bound any test meets: each question at the player's own level carries at most 0.155 of Fisher
information with 4 choices (at about 80% right: 0.135, what the game's aim gives already), 0.25 typed. The standard
error after N questions is 1/√(N × information), plus each photo's own rating error divided by √N. Chance of placing a
player in the right one of the 3 bands (players at −0.5, mid-band 0.56, and 1.5):

| Questions | Format | Error (perfect photos) | Right band: −0.5 / 0.56 / 1.5 | Same, photos rated ±0.8 |
| --- | --- | --- | --- | --- |
| 10 | 4 choices | 0.80 | 0.82 / 0.30 / 0.78 | 0.81 / 0.29 / 0.77 |
| 15 | 4 choices | 0.66 | 0.87 / 0.37 / 0.83 | 0.86 / 0.35 / 0.82 |
| 20 | 4 choices | 0.57 | 0.91 / 0.42 / 0.86 | 0.90 / 0.40 / 0.85 |
| 15 | typed | 0.52 | 0.93 / 0.45 / 0.89 | 0.91 / 0.43 / 0.87 |
| 40 | 4 choices | 0.40 | 0.97 / 0.56 / 0.94 | 0.96 / 0.54 / 0.93 |

A best case (every photo exactly at the player's level, an adaptive test): a fixed test does worse. A beginner at −0.5
is put in the top band 2% of the time after 15 four-choice questions: the costly error the level card guards against is
rare; the frequent one is the middle band, whatever the photos.

## The item pool per subject [measured]

| Subject | Photos rated | 5+ answers (3+ players) | 10+ answers (3+ players) | 20+ answers | Answers per photo | Genus / family offsets on 50+ weighed answers |
| --- | --- | --- | --- | --- | --- | --- |
| Corals | 1,405 | 314, in 39 genera | 39, in 16 genera | 0 | median 3, max 17 | 34 of 45 |
| Fish | 2,163 | 6 | 0 | 0 | median 1, max 5 | 20 of 81 |
| Sea slugs | 0 | 0 | 0 | 0 | none | 0 (no answer yet) |

- Corals, difficulty of the photos with 5+ answers: 10th percentile −0.72, median 0.01, 90th 0.87 (sd 0.62); with 10+:
  −0.26 / 0.28 / 0.91. Strong players (2 of the 10 above 1.6 at answer 100) need harder questions than that: single
  views, look-alike choices, typed names (the format offsets the game already has).
- A photo's rating spreads around its genus offset by about 0.3-0.4 (sd of the residuals, corals and fish), and the
  offsets themselves are well rated for most coral genera: a question's difficulty is already known to roughly ±0.4-0.6
  from its genus, which is enough for a test (table above). The photo pool is thin; the genus level is not.
- **Sea slugs: not yet.** No answer in the log, the "Stats Sea slugs" tab holds no photo, and the "Replayed Sea slugs"
  tab 0 rows for every player.
- **Fish**: the pool is too large for its answers (2,163 photos for 2,710 answers): no photo will reach 20 answers
  without a fixed calibration set.

## Recommendation

**1. A hidden 10-15 question test: no, not now** [guess, from the measures above].

- The game already does it. The global level reads every answer, difficulty allowed for; with the aim at about 80%
  right, each answer carries 0.135 of information, 87% of the most a 4-choice question can carry. A hidden test changes
  which photos are asked, not how much 15 answers can say.
- What it would set fades fast. The first-launch prior weighs 10 answers (`START.N`): 1/6 after 50 answers, under 5%
  after 200; the simulation found the right first-launch answer leaves learning outcomes within the spread and improves
  the fit of the first questions (`docs/LEARNING.md` "The first-launch question"). A better prior buys a better fit of
  roughly questions 15-50, no more.
- It meets the same limit as the level card. The card waits for 40 and 60 answers because 20 are not enough (Pierre,
  2026-11-04); 15 test questions do not escape it for the middle band.
- What a test could add that the game cannot: questions on units the player has not met (an expert's first answers come
  from the few opened genera, all easy). That draws outside `unlocked()`, against rule L4: Pierre's call (choice (b)).

**2. Cheaper, from today's tools** (each a proposal, the check level of rule L11 in brackets):
- Watch the band edges on real players: 3 of 4 coral players who said "IMR course" sit below 0.25 at answer 100. Once
  20 or more players have both a first-launch answer and 100 answers, refit the edges (0.25 / 0.875) on them, as LEARNING
  already plans ("recalibrate on the first cohort that answers the question"). [L11 level 1; nothing now: n = 4.]
- Keep the first-launch question and the level card as they are.

**3. An explicit opt-in test, later, corals first.** What it needs:
- **An item pool**: about 40-60 coral photos rated on 20 or more answers from 5 or more players each, spread from about
  −1 to +2 with hard formats in it (single view, look-alike choices, typed), across the slate's common genera. Today 0
  photos have 20 answers; at the corals' pace (about 3,500 answers in 17 days over 1,405 photos) they come only if a
  fixed calibration set is shown more often (the photo exposure rule, Q187-Q190, would need to allow it). Fish: the same
  with a fixed set of a few photos per family. Sea slugs: wait for answers.
- **20-25 questions, adaptive** (each next photo near the current estimate), typed where the player can: that places the
  ends 9 times in 10 and the middle about 4-5 times in 10. 10-15 questions place the ends 8-9 times in 10.
- **What its result sets**: variables only (rule L10: the prior p and Coral basics), never a path; whether its answers
  count in progress and photo ratings (they should count like any answer: rules D9, L3).
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

- It can say how precise a level from 10, 15 or 20 answers is (the error model, independent of the sample), how many
  photos each subject has well rated, and how the first answers and the first-launch answer compared with the level at
  answer 100 for these 10 coral and 6 fish players.
- It cannot give an accuracy rate for a designed test on real players (none has taken one, and no first answer fell on a
  calibrated photo), nor judge the fish or the sea slugs (6 players, nearly all in one band; no sea slug answer). Every
  count rests on 16 players in all, IMR people and the owner's account: a narrow population.
