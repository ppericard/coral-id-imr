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

This section was committed and pushed (e3dc326cf) before any outcome below was computed; the only change since is this commit reference.

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

## 2. Short answer (run 2026-11-21 18:35-18:50 Manila)

- **Verdict, by the declared rule: not decidable on this log, so wait.** The genus-only error's interval runs from 0.16
  to 1.70 logits, across every tier; the point estimates point to "wait" too (s\* = 1.16 at the upper bound, about
  0.86 at the estimate, genus misfit included).
- **Photos do differ within a genus, probably by more than the gate allows**: the spread of photo difficulty within a genus
  is about **0.86** (profile interval 0.49 to 1.21) [measured], against 0.61 for the 20-answer gate. A test on genus
  offsets alone would be off by about **0.93** a photo (genus misfit 0.36 included).
- **The residual helps a little, the shrunk ones a little more**: on held-out log-loss, S5 and S10 beat genus-only
  (−0.0038 and −0.0031 per answer, intervals below 0); E (today's served form) and S2 do not clearly [measured].
- **Today's answer counts are too few for the residual to close the gap**: on the real design with a known spread of
  0.8, the best ratings on the 379 photos with 5+ answers are off by about 0.78, barely better than genus-only (0.83);
  at a spread of 0.61, about 0.62 [planted].
- **What it does to the test** [model]: at 20-25 adaptive questions, an error of 1.16 instead of the gate's 0.61 places
  the middle player right about 0.31-0.35 times in 10 instead of 0.35-0.40, and a strong player 0.74-0.76 instead of
  0.83-0.85.
- **Recommendation: wait for the calibration set; do not lower the bar.** Before it is used, rate its members with a
  direct fit rather than the Elo residual (section 5).

## 3. Results

### 3.1 Checks [measured]

- The study's replay reproduces `core.js` `eloOf` for all 1,439 photos (0 differing).
- The reimplemented band model reproduces the 11-18 study's adaptive cells within Monte Carlo error once each
  question's error sits, as in the study, on the rating the estimator reads (the question truly at the estimate):
  exact 0.77 / 0.31 / 0.82, 0.82 / 0.36 / 0.87, 0.86 / 0.44 / 0.89 at 15 / 20 / 25 questions (study 0.77 / 0.31 /
  0.83, 0.83 / 0.37 / 0.86, 0.87 / 0.42 / 0.89); ±0.8: 0.81 / 0.30 / 0.78, 0.86 / 0.35 / 0.81, 0.90 / 0.41 / 0.83
  (study 0.81 / 0.30 / 0.76, 0.86 / 0.35 / 0.80, 0.90 / 0.39 / 0.83), 3,000 tests a cell. The other reading (the
  question's true difficulty off, its rating at the estimate) did not reproduce them (beginners 0.07 lower, strong
  players 0.06 higher at ±0.8); it is not used.
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

- **G's σv is the figure the 11-18 study lacked**: photos of one genus differ in difficulty by about 0.86 for a new
  player. Its profile interval (0.49 to 1.21) excludes 0 but holds both 0.61 and 0.80.
- **E's and S's σv near 0 are not a precision**: the fit treats the held-out players of one photo as seeing the same
  prediction, but each saw a prediction made partly from the other's answer, which pulls their residuals apart and the
  photo variance to 0. That is why the declaration kept them out of the verdict (their true error is in 3.3).
- By the photo's answer count without the player, genus-only: 1-4 answers, σv 0.34 (1,726 answers); 5 or more, σv 1.41
  (475 answers). The photos the test would draw spread more within their genus than the rest, not less.
- The global shift μ is −0.16 for G (the held-out answers a little easier than predicted), −0.04 to −0.08 for the
  others.

### 3.3 The planted check on the real design [planted]

20 redrawn logs per spread τ; the fit of σv on the leave-one-player-out held-out answers, and the true error of each
predictor on the 379 photos with 5+ answers (ratings on the whole redrawn log, error centred).

| Planted τ | σv found: mean (5-95%) | G | E | S2 | S5 | S10 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.32 (0 to 0.68) | 0.25 | 0.45 | 0.38 | 0.32 | 0.29 |
| 0.4 | 0.58 (0 to 0.94) | 0.47 | 0.55 | 0.51 | 0.48 | 0.47 |
| 0.61 | 0.69 (0 to 1.10) | 0.64 | 0.66 | 0.63 | 0.62 | 0.62 |
| 0.8 | 0.87 (0.39 to 1.11) | 0.83 | 0.79 | 0.78 | 0.78 | 0.79 |
| 1.0 | 1.02 (0.66 to 1.39) | 1.01 | 0.92 | 0.93 | 0.94 | 0.96 |
| 1.207 | 1.25 (0.94 to 1.61) | 1.20 | 1.07 | 1.09 | 1.11 | 1.13 |

- **Recovery**: the fit finds τ within 0.08 on average at 0.61 and 0.8 (rule: within 0.15), a little high at small
  spreads (it cannot go below 0). But one log cannot tell 0.61 from 0.8: their 5-95% ranges overlap almost entirely.
- **The genus offsets carry their own error, about 0.25** (τ = 0 row, G): the floor of any rating here.
- **The residual buys little at today's counts**: the best predictor beats genus-only by 0.05 at τ = 0.8 and 0.13 at
  τ = 1.2, and does worse at small τ (E's raw residual adds noise: 0.45 against 0.25 at τ = 0). The 50 calibration
  members (48 with an answer) show the same within 0.03.
- So, whatever the true spread, today's best ratings on the test's pool are off by about the spread itself.

### 3.4 The verdict, as declared

- U, the upper bound of G's total error: 1.70 (the jackknife's; σv's profile bound gives 1.26).
- A residual predictor beats G (S5, S10), so s\* = the smaller of U and the planted error of the best of them on the
  pool at τ = 1.207 (σv's profile upper bound), σu added: S5, 1.105 → √(1.105² + 0.36²) = **1.16**. Tier: over 0.80,
  **wait**.
- And G's interval (0.16 to 1.70) spans every tier: **not decidable on this log**, which also says wait.
- At the point estimate instead of the upper bound (τ about 0.8, the fit running about 0.07 high), the pool's error
  would be about 0.78, 0.86 with the genus misfit: still over the gate's 0.61 and the 0.80 tier [planted, a reading,
  not the declared rule].

### 3.5 What it does to the test's right-band rate [model]

20,000 tests a cell, players at −0.5 / 0.56 / 1.5 (beginner / IMR course / knows well), adaptive, four choices.

| Rating error s | 20 questions | 25 questions |
| --- | --- | --- |
| 0 (exact) | 0.83 / 0.37 / 0.86 | 0.87 / 0.41 / 0.89 |
| 0.61 (the gate) | 0.85 / 0.35 / 0.83 | 0.89 / 0.40 / 0.85 |
| 0.80 | 0.86 / 0.35 / 0.80 | 0.89 / 0.39 / 0.82 |
| 0.93 (genus only, estimate) | 0.87 / 0.33 / 0.78 | 0.90 / 0.37 / 0.80 |
| 1.16 (s\*) | 0.88 / 0.31 / 0.74 | 0.91 / 0.35 / 0.76 |
| 1.70 (U) | 0.91 / 0.28 / 0.63 | 0.93 / 0.29 / 0.64 |

- Against the gate, today's ratings at s\* cost the middle player about 0.04-0.05 and the strong player about 0.09; the
  beginner's rate rises a little (as in the study's own ±0.8 column). The strong player loses most, and is the one
  the request behind REE-112's raised priority is about (a newcomer who already knows the corals, placed higher).
- These differences are the size the simulation-scope note warns about; they illustrate the verdict, they do not make
  it.

### 3.6 Sensitivity [measured]

- With each player's first 20 answers kept (2,654 answers): genus-only σv 0.99, σu 0.46, s 1.09.
- Date cut (fit before 6 November, held out after, 1,342 answers): genus-only σv 0.80, σu 0.89, s 1.20; E σv 0.76, s
  1.15; E's log-loss −0.0022 against G. The genus misfit grows when the fit stops early (offsets frozen at half the log).
- Leaving one player out moves a genus offset on 50+ weighed answers by up to 0.39: a few players carry much of the log.

## 4. What this can conclude (rule A5)

- It can say that coral photos differ within their genus by about as much as the gate allows or more (0.86, at least
  0.49), so a test on genus offsets alone would carry an error over the gate's; that today's residuals, at 1-17 answers
  a photo, recover little of it; and that one log of 3,920 answers from 15 players cannot pin the spread between 0.6 and
  1.2.
- It cannot say what the test would do on real players (none has taken one), nor whether the Elo residual reaches the
  gate's ±0.61 at 20 answers: the planted check only reaches today's counts (up to 17). The population is narrow (15
  players, IMR people and the owner's account).

## 5. Recommendation [guess, from the measures above]

- **Wait for the calibration set; do not lower the 20-answer bar.** Today's ratings on the photos that have 5+
  answers are off by about the within-genus spread itself (0.8 at the estimate, up to 1.2), over the gate's 0.61. A
  subset (the members nearest 20) would not change that: at 10-17 answers the residual still recovers little [planted].
- **Before the test uses the members, rate them with a direct fit**: each member's difficulty fitted by maximum
  likelihood on its answers with the players' levels known (as `core.js` `levelFit` does for a player), shrunk toward its
  genus by τ ≈ 0.86, and checked held-out as here. The Elo residual, damped by design for the game, uses the answers
  less fully: at τ = 0.8 its error on 5-17 answers is 0.78, where an efficient estimate would be about 0.6 at 10
  answers [model: 1 / √(1 / 0.8² + 10 × 0.135)]. Whether 20 answers then reach ±0.61 can be checked the same way when
  the members get there.
- **What brings the gate nearer is answers on the members**: REE-112's option of a coordinated RA playing week
  (about 30 member answers a day in the training week against 4.5-7.6 lately) is the lever; the photos' rating method
  is not. Pierre's call (REE-112 next action (3)).
- The genus-level part matters too (σu 0.36, 0.89 with an early cut): keep the test's members across many genera and
  refit the offsets at the time the test is built.
