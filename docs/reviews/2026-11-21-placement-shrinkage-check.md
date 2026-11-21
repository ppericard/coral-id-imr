# Placement test: are today's coral ratings, shrunk, precise enough without the 20-answer gate?

Read-only study, 2026-11-21 (Manila evening), Linear REE-112 part (2). Nothing in the app, the sheet or the tools changed.
Aggregates only; players are P1, P2… (rule D2) and no per-player figure is given. The extract, the label map, the scripts
and their outputs stayed in the session's scratchpad and are not in the repository.

**The question** (REE-112, next action (2)): the opt-in placement test decided by Pierre on 2026-11-18 (#1080) waits for
its pool: 50 coral calibration photos at 20 answers each; on 2026-11-21 18:15 none had 20 (max 12, median 4). Could the
test use **today's** ratings instead, with shrinkage (a photo's difficulty = its genus offset + its own residual shrunk
toward 0 by its answer count), and still place players about as well as the 20-answer pool would?

Labels (rule W11): **[measured]** computed by a script on the real answers; **[model]** computed on the game's own
response model (a best case under its assumptions); **[planted]** the real log's design with outcomes redrawn from the
model, known truth (a mechanics check: docs/reviews/2026-11-21-simulation-scope.md); **[read]** read in a file;
**[guess]** my judgement.

## 1. Declared before running (2026-11-21 18:30 Manila)

This section was committed and pushed (e3dc326cf) before any outcome below was computed; the only change since is
this commit reference.

### What I had seen before declaring

- The design only: the coral rows, players, photos per question and dates; the held-out set sizes by fit count (below).
  No held-out right/wrong outcome, no predictor's fit.
- A reproduction check: `core.js` `eloOf` on the coral rows of the extract gives the photo ratings `?stats=1` served at
  18:16 for all 1,439 photos (within 0.01, same answer counts) [measured]. So the replay below is the sheet's.

### Data

- The sync sheet's Answers tab, read-only (`Answers!A1:AA7446`, 7,445 rows, the integrator's read at about 18:15
  Manila), pseudonymised in the scratchpad. Corals: the rows with Subject blank or `coral`, surprise cards left out
  (`core.js` `subjRows`): **3,920 answers, 15 players, all trusted** (`core.js` `trustOf`), 2026-11-01 17:47 to
  2026-11-21 17:17; 1,439 photos; 3,017 questions show one photo, 626 two, 277 three.
- Rows built as `Code.gs` `rowOf_` builds them; time order, the tab's order between equal minutes.

### The held-out design: leave one player out

For each player p: the whole coral log replayed in time order under today's rules (`core.js` `eloReplay`, the same as
`Code.gs` `statsStep_`: hierarchical photo Elo, genus offsets, photo memory, weights by experience), except that **p's
answers move no photo residual, no genus offset and no memory offset**; p's own level moves on every answer, as in the
game. The ratings at the end of the log are "today's ratings without p". This is the test's own situation: a player whose
answers never rated the photos, on photos rated by everyone else.

**The held-out answers**: p's answers that are (i) the first time p sees the photo, (ii) a question showing that one
photo alone, (iii) after p's 20th coral answer (p's level has settled a little). Each carries p's level just before it
(θ), its guess rate (`core.js` `guessOf`), the photo and its genus. Sizes [measured, design only]: **2,464 answers on
1,139 photos, 706 photos answered by 2 or more players**; by the photo's answer count without p: 0 answers, 263; 1-2,
1,042; 3-4, 684; 5-9, 429; 10 or more, 46. A date cut (fit before 6 November, held-out after) gives half that (1,342
answers, 347 photos with 2+ players): sensitivity only.

### The predictors (each + 0.5 for a photo shown alone, as the Elo does)

- **G**: the genus offset only (fit without p).
- **E**: genus offset + the photo's residual as rated (today's served form; the Elo already damps a residual's first
  steps).
- **S2, S5, S10**: genus offset + the residual × m / (m + k), m the photo's plain answer count without p, k = 2, 5, 10.

### The model fitted on the held-out answers

P(right) = g + (1 − g) σ(θ − b̂ − μ − u − v), with b̂ a predictor, μ a global shift, **u ~ N(0, σu²) one per genus** (the
genus-level misfit) and **v ~ N(0, σv²) one per photo** (the photo's own error within its genus), fitted by maximum
likelihood (nested Gauss-Hermite, 12 × 12 nodes). Reported: σv, σu and the **total error s = √(σu² + σv²)**, the error
the 11-18 study's model calls "ratings off by sd s".

- For **G**, σv is the spread of photo difficulty within a genus, the figure the 11-18 study called "not known", and s
  is the error of a test built on genus offsets alone. A properly shrunk rating cannot do worse than that.
- For E and S_k the same fit is an approximation (each held-out player's prediction rests on slightly different
  answers); reported, not used for the verdict except through the planted check.
- **Does the residual help?** Mean held-out log-loss of E and of each S_k minus G's, paired by answer.

**Uncertainty: players are the unit.** Delete-one-player jackknife (15 replicates, t with 14 degrees of freedom) for σv,
σu, s and the log-loss differences. For σv also the profile-likelihood upper bound (a drop of 1.92), since an estimate
near 0 makes a jackknife unreliable. **The upper bound U of s** = the larger of the jackknife upper bound of s and
√(σu² + (σv's profile upper bound)²).

### The planted check on the real design [planted]

The real log's questions, players, formats and order kept; every outcome redrawn from the model, with each answer's true
level = the real replay's level at that answer, a photo's true difficulty = its served genus offset + vf, **vf ~ N(0,
τ²) planted, τ = 0, 0.4, 0.61, 0.8, 1.0**, the memory offsets at their prior, 20 replicates each; the whole pipeline
(the leave-one-player-out replays, the fit) rerun on each. It reports (a) whether the fit recovers τ (mean, 5-95% range)
and (b) the true error of G, E and each S_k against the planted truth on the test's pool, the ratings fitted on the whole
redrawn log.

**The test's pool today**: the photos rated on **5 or more answers** (379 photos today; the 50 calibration members
reported apart). A photo on fewer would not be drawn by a test that wants rated photos.

### The verdict rule

- **s\*** = U if no residual predictor beats G on held-out log-loss (jackknife interval of the difference not below 0);
  else the smaller of U and the planted true error of the best residual predictor on the pool at τ = σv's upper bound
  (with σu added in quadrature).
- **s\* ≤ 0.61** (the error 20 answers a photo buy, the decided gate): **use today's ratings now**.
- **0.61 < s\* ≤ 0.80** (the error the 11-18 study tabulated): **lowering the bar is defensible**, Pierre's choice.
- **s\* > 0.80**: **wait** for the calibration set.
- **Not decidable on this log** (then: wait, and say so): the interval of s spans every tier (lower bound under 0.61,
  upper bound over 0.80), or the planted check misses τ by more than 0.15 on average at τ = 0.61 or 0.80.

### What it does to the test's right-band rate [model], a consequence, not the threshold

The 11-18 study's model, reimplemented: an adaptive test (each next question at the current estimate, starting at 0.5),
four choices, the app's estimator (`core.js` `levelFit`), players at −0.5, 0.56 and 1.5, bands at 0.25 and 0.875, each
question's rating off by N(0, s²). First **validated** against the study's adaptive cells (exact and ±0.8, at 15, 20 and
25 questions) within Monte Carlo error; then 20,000 tests a cell, the same random draws across errors, at 20 and 25
questions and s = 0, 0.61, 0.80, the estimate, U and s\*. Why not the threshold: the study's cells move by at most 0.06
between exact and ±0.8 at 20-25 questions, inside the model's own uncertainty (the simulation-scope note).

### Sensitivity (reported, not deciding)

The held-out set with the first 20 answers kept; the date cut (G only); the genus offsets' largest move when a player is
left out.

### Compute

Node, under the machine slot (`node tests/slot.js --`), well under the 40-minute cap (rule L11).

## 2. Short answer (run 2026-11-21 18:35-19:20 Manila, within the compute cap)

- **Verdict, by the declared rule: not decidable on this log, so wait.** The genus-only error's interval runs from 0.16
  to 1.70 logits, across every tier, and s\* (the error of the best rating on the test's pool, at the upper bound) is
  1.16, over 0.80. At the point estimates it would be about 0.86, still over 0.80.
- **This log cannot tell a within-genus spread of 0.4 from one of 1.2.** The fit finds photos of one genus differing in
  difficulty by **0.86** (profile interval 0.49 to 1.21) [measured]; but on the real design a log like this one gives
  0.86 or more in 1 draw in 8 when the true spread is 0.4, in 1 in 4 at 0.61, in 6 in 10 at 0.8 [planted]. The
  likeliest spread is about 0.8, over the gate's 0.61, but a spread under it is not excluded.
- **The photo's own residual helps only a little**: on held-out log-loss, S5 and S10 beat genus-only (−0.0038 and
  −0.0031 per answer, intervals below 0); E (today's served form), S2 and a direct fit (D, added after the run) do not
  clearly [measured].
- **At today's answer counts no rating method closes the gap**: on the real design, the best ratings (Elo residual,
  shrunk, or a direct fit) on the 379 photos with 5+ answers are off by about the spread itself: 0.78 at a spread of
  0.8 (genus only 0.83), 0.62 at 0.61, and the same on the 50 photos with 10 to 17 answers [planted].
- **What it does to the test** [model]: at 20-25 adaptive questions, an error of 1.16 instead of the gate's 0.61 places
  the middle player right about 3.1 to 3.5 times in 10 instead of 3.5 to 4.0, and a strong player 7.4 to 7.6 times
  instead of 8.3 to 8.5 (the study's placement of the error; the other placement costs the strong player 0.3 in 10).
- **Recommendation: wait for the calibration set; do not lower the bar, and a subset of the members would not help.**
  When the members reach 20 answers, check their error held-out as here before the test reads them: today's counts
  gain far less than the gate's arithmetic assumes (section 5).

## 3. Results

### 3.1 Checks [measured]

- The study's replay reproduces `core.js` `eloOf` for all 1,439 photos (0 differing).
- The reimplemented band model reproduces the 11-18 study's adaptive cells within Monte Carlo error once each
  question's error sits, as in the study, on the rating the estimator reads (the question truly at the estimate):
  exact 0.77 / 0.31 / 0.82, 0.82 / 0.36 / 0.87, 0.86 / 0.44 / 0.89 at 15 / 20 / 25 questions (study 0.77 / 0.31 /
  0.83, 0.83 / 0.37 / 0.86, 0.87 / 0.42 / 0.89); ±0.8: 0.81 / 0.30 / 0.78, 0.86 / 0.35 / 0.81, 0.90 / 0.41 / 0.83
  (study 0.81 / 0.30 / 0.76, 0.86 / 0.35 / 0.80, 0.90 / 0.39 / 0.83), 3,000 tests a cell. The other reading (the
  question's true difficulty off, its rating at the estimate) did not reproduce them (beginners 0.07 lower, strong
  players 0.06 higher at ±0.8); it is shown apart in 3.5.
- The 12-node quadrature integrates N(0, 1) exactly to the 4th moment.

### 3.2 The held-out answers [measured]

2,464 answers on 1,139 photos (leave one player out, after each player's 20th answer). Ratings without the player;
the fit of section 1 on the held-out answers; ± the jackknife over the 15 players.

| Predictor | σv (photo, within genus) | σu (genus) | total s | s, 95% interval | Log-loss vs G, per answer (95%) |
| --- | --- | --- | --- | --- | --- |
| **G**, genus offset only | **0.86** (profile 0.49 to 1.21) | 0.36 | **0.93** | 0.16 to 1.70 | (reference, 0.460) |
| E, + residual as rated | 0 (profile to 0.35) | 0.13 | 0.13 | 0 to 0.95 | −0.0019 (−0.0095 to +0.0058) |
| S2 | 0 | 0.21 | 0.21 | 0 to 0.91 | −0.0040 (−0.0091 to +0.0011) |
| S5 | 0.21 | 0.25 | 0.32 | 0 to 1.48 | **−0.0038 (−0.0073 to −0.0003)** |
| S10 | 0.50 | 0.29 | 0.58 | 0 to 1.71 | **−0.0031 (−0.0055 to −0.0008)** |
| D, direct fit (added after the run, 3.7) | 0 | 0.21 | 0.21 | 0 to 0.92 | −0.0027 (−0.0083 to +0.0029) |

- **G's σv is the figure the 11-18 study lacked**: photos of one genus differ in difficulty by about 0.86 for a new
  player. Its profile interval (0.49 to 1.21) excludes 0 but holds both 0.61 and 0.80, and the planted runs (3.7) show
  that even its lower end is not firm.
- **E's, S's and D's σv near 0 are not a precision**: the fit treats the held-out players of one photo as seeing the same
  prediction, but each saw a prediction made partly from the other's answer. The planted runs confirm it: at every
  known spread from 0.4 to 1.0, the same fit returns 0 for E (3.7). That is why the declaration kept them out of the
  verdict; their true error is in 3.3 and 3.7.
- By the photo's answer count without the player, genus-only: 1-4 answers, σv 0.34 (1,726 answers); 5 or more, σv 1.41
  (475 answers); no interval was computed for these two.
- The global shift μ is −0.16 for G (the held-out answers a little easier than predicted), −0.02 to −0.08 for the
  others.

### 3.3 The planted check on the real design [planted]

20 redrawn logs per spread τ; the fit of σv on the leave-one-player-out held-out answers, and the true error of each
predictor on the 379 photos with 5+ answers (ratings on the whole redrawn log, error centred).

| Planted τ | σv found: mean (lowest to highest of 20) | G | E | S2 | S5 | S10 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.32 (0 to 0.68) | 0.25 | 0.45 | 0.38 | 0.32 | 0.29 |
| 0.4 | 0.58 (0 to 0.94) | 0.47 | 0.55 | 0.51 | 0.48 | 0.47 |
| 0.61 | 0.69 (0 to 1.10) | 0.64 | 0.66 | 0.63 | 0.62 | 0.62 |
| 0.8 | 0.87 (0.39 to 1.11) | 0.83 | 0.79 | 0.78 | 0.78 | 0.79 |
| 1.0 | 1.02 (0.66 to 1.39) | 1.01 | 0.92 | 0.93 | 0.94 | 0.96 |
| 1.207 | 1.25 (0.94 to 1.61) | 1.20 | 1.07 | 1.09 | 1.11 | 1.13 |

- **Recovery**: the fit finds τ within 0.08 on average at 0.61 and 0.8 (rule: within 0.15), a little high at small
  spreads (it cannot go below 0). But one log cannot tell 0.4 from 1.2: the ranges overlap widely (3.7 has the shares).
- **The genus offsets carry their own error, about 0.25** (τ = 0 row, G): a floor under any rating here.
- **The residual buys little at today's counts**: the best predictor beats genus-only by 0.05 at τ = 0.8 and 0.13 at
  τ = 1.2, and does worse at small τ (E's raw residual adds noise: 0.45 against 0.25 at τ = 0). The 50 calibration
  members (48 with an answer) show the same within 0.03.

### 3.4 The verdict, as declared

- U, the upper bound of G's total error: 1.70 (the jackknife's; σv's profile bound gives 1.26).
- A residual predictor beats G on held-out log-loss (S5, S10), so s\* = the smaller of U and the planted error of the
  best of them on the pool at τ = 1.207 (σv's profile upper bound), σu added: S5, 1.105 → √(1.105² + 0.36²) = **1.16**.
  Tier: over 0.80, **wait**.
- And G's interval (0.16 to 1.70) spans every tier: **not decidable on this log**, which also says wait.
- Readings made after the run, none of which changes the tier: "the best of them" taken as the one with the lowest
  planted error (S5 1.105, S10 1.127); E, the lowest of all (1.069) but not better than G on held-out, gives 1.13;
  the jackknife drops a player's held-out answers only (the replays keep that player's answers rating the photos for
  the others); at the point estimate instead of the upper bound (τ about 0.8), the pool's error is about 0.78, 0.86
  with the genus misfit [planted].

### 3.5 What it does to the test's right-band rate [model]

20,000 tests a cell, players at −0.5 / 0.56 / 1.5 (beginner / IMR course / knows well), adaptive, four choices; the
error placed as in the study (validated in 3.1, a choice made after the run).

| Rating error s | 20 questions | 25 questions |
| --- | --- | --- |
| 0 (exact) | 0.83 / 0.37 / 0.86 | 0.87 / 0.41 / 0.89 |
| 0.61 (the gate) | 0.85 / 0.35 / 0.83 | 0.89 / 0.40 / 0.85 |
| 0.80 | 0.86 / 0.35 / 0.80 | 0.89 / 0.39 / 0.82 |
| 0.93 (genus only, estimate) | 0.87 / 0.33 / 0.78 | 0.90 / 0.37 / 0.80 |
| 1.16 (s\*) | 0.88 / 0.31 / 0.74 | 0.91 / 0.35 / 0.76 |
| 1.70 (U) | 0.91 / 0.28 / 0.63 | 0.93 / 0.29 / 0.64 |

- Against the gate, today's ratings at s\* cost the middle player about 0.04-0.05 and the strong player about 0.09; the
  beginner's rate rises a little (as in the study's own ±0.8 column).
- **The other placement of the error** (the question's true difficulty off, its rating at the estimate): gate 0.81 /
  0.34 / 0.85 and 0.85 / 0.39 / 0.87, s\* 0.77 / 0.30 / 0.82 and 0.81 / 0.33 / 0.84 at 20 and 25 questions: every
  band loses 0.03-0.05. Which player loses most depends on that modelling choice; that the middle and strong players
  lose 0.03-0.09 against the gate does not.
- These differences are the size the simulation-scope note warns about; they illustrate the verdict, they do not make
  it.

### 3.6 Sensitivity [measured]

- With each player's first 20 answers kept (2,654 answers): genus-only σv 0.99, σu 0.46, s 1.09.
- Date cut (fit before 6 November, held out after, 1,342 answers): genus-only σv 0.80, σu 0.89, s 1.20; E σv 0.76, s
  1.15; E's log-loss −0.0022 against G. The genus misfit grows when the fit stops early (offsets frozen at half the log).
- Leaving one player out moves a genus offset on 50+ weighed answers by up to 0.39: a few players carry much of the log.

### 3.7 Added after the results (not declared)

Three questions the results raised, run on the same design after section 3.3: how often a log like this one gives 0.86
whatever the true spread; whether the photos with 10+ answers (a subset of the pool) are rated better; and whether a
**direct fit** (D: each photo's residual fitted by maximum likelihood on its answers, the players' levels and memory
terms from the replay, a N(0, 0.86²) prior toward the genus offset) does better than the Elo residual. 40 redrawn logs
per spread; D also on the real held-out answers (3.2). Errors on the pool, by the photo's answer count today (329
photos with 5-9 answers, 50 with 10-17):

| Planted τ | σv found: mean (10-90%) | Share of logs with σv ≥ 0.86 | E's σv found | 5-9 answers: G / best S / D | 10-17 answers: G / best S / D |
| --- | --- | --- | --- | --- | --- |
| 0.4 | 0.54 (0.15 to 0.87) | 0.13 | 0 | 0.47 / 0.47 / 0.52 | 0.44 / 0.45 / 0.49 |
| 0.61 | 0.71 (0.43 to 1.04) | 0.23 | 0 | 0.65 / 0.62 / 0.64 | 0.64 / 0.62 / 0.63 |
| 0.8 | 0.88 (0.70 to 1.08) | 0.58 | 0 | 0.83 / 0.78 / 0.78 | 0.82 / 0.78 / 0.77 |
| 1.0 | 1.03 (0.85 to 1.27) | 0.85 | 0 | 1.01 / 0.93 / 0.92 | 0.99 / 0.92 / 0.91 |

- **The real 0.86 is not rare under a spread of 0.4 or 0.61** (1 log in 8, 1 in 4); the spread is likeliest near 0.8.
- **The photos with 10-17 answers are rated no better than those with 5-9**: within 0.02 at every spread.
- **A direct fit does no better than the shrunk Elo residual**: within 0.01 at 0.8 and 1.0, worse at 0.4 and 0.61; on the real
  held-out answers its log-loss gain over genus-only is not clear (−0.0027, −0.0083 to +0.0029).
- So the little the ratings gain over the genus offset is a matter of information, not of method: 5 to 17 answers a
  photo say little about it here. Why so much less than the textbook figure behind the gate (0.135 of information an
  answer, ±0.61 at 20 answers in the 11-18 study) [guess]: the counts include each player's repeat answers on a photo, which say
  little about it for a new viewer; the players' levels are themselves uncertain; and the genus offsets carry their
  own 0.25.

## 4. What this can conclude (rule A5)

- It can say that coral photos differ within their genus, most likely by about 0.8 (a spread under 0.61 is not
  excluded), so a test on genus offsets alone would most likely carry an error over the gate's; that at today's 5 to
  17 answers a photo no rating method recovers much of it; and that one log of 3,920 answers from 15 players cannot
  pin the spread between 0.4 and 1.2.
- It cannot say what the test would do on real players (none has taken one), nor whether 20 answers a photo reach
  the gate's ±0.61: the planted check only reaches today's counts (up to 17). The population is narrow (15 players,
  IMR people and the owner's account).

## 5. Recommendation [guess, from the measures above]

- **Wait for the calibration set; do not lower the 20-answer bar.** Today's ratings on the photos that have 5+
  answers are most likely off by 0.8 or more, over the gate's 0.61, and a better rating method would not change that.
- **A subset would not help**: the photos with 10 to 17 answers are rated no better than those with 5 to 9 [planted].
- **Check the gate itself before the test reads the members**: the 11-18 study's ±0.61 at 20 answers is the textbook
  figure, and at today's counts the real gain is far below it. When the members reach 20 answers, measure their error
  held-out as here (first-time answers of players who did not rate them); if it is still over 0.61, the members need
  more answers from new players, or the test more questions.
- **What brings the gate nearer is answers on the members, from players seeing them for the first time**: REE-112's
  option of a coordinated RA playing week (about 30 member answers a day in the training week against 4.5-7.6 lately)
  is the lever. Pierre's call (REE-112 next action (3)).
- The genus-level part matters too (σu 0.36, 0.89 with an early cut): keep the test's members across many genera and
  refit the offsets at the time the test is built.
