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

This section was committed and pushed before any outcome below was computed.

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

## 2. Results

(to come)
