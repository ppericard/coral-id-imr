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

- **Verdict, by the declared rule: not decidable on this log, so wait.** The genus-only error's interval runs from 0.35
  to 1.51 logits, across every tier, and s\* (the error of the best rating on the test's pool, at the upper bound) is
  1.51, over 0.80. At the point estimates it would be about 0.86, still over 0.80.
- **This log cannot tell a within-genus spread of 0.4 from one of 1.2.** The fit finds photos of one genus differing in
  difficulty by **0.86** (profile interval 0.49 to 1.21) [measured]; but on the real design a log like this one gives
  0.86 or more in 1 draw in 8 when the true spread is 0.4, in 1 in 4 at 0.61, in 6 in 10 at 0.8 [planted]. The
  likeliest spread is about 0.8, over the gate's 0.61, but a spread under it is not excluded.
- **The photo's own residual does not clearly help**: on held-out log-loss every residual predictor does a little
  better than genus-only (−0.0019 to −0.0040 per answer), but no interval excludes 0 once a deleted player is removed
  everywhere (S5 −0.0092 to +0.0016, S10 −0.0069 to +0.0007) [measured].
- **Photo by photo, today's ratings are off by about the spread itself**: on the real design, the best ratings (Elo
  residual, shrunk, or a direct fit) on the 379 photos with 5+ answers are off by 0.78 at a spread of 0.8 (genus only
  0.83), 0.62 at 0.61 [planted]. A rating gains mainly from answers that show the same photo or the same set of views:
  59% of these photos' answers show them beside other views. **As shown** (the photo sets of the log), the 17 items
  answered 10+ times are off by about 0.57 at a spread of 0.8, under the gate's 0.61, but 17 items are far from the
  40-60 a test needs; the 183 answered 5-9 times, about 0.68 [planted].
- **What it does to the test** [model]: at 20-25 adaptive questions, an error of 1.51 instead of the gate's 0.61 places
  the middle player right about 2.9 to 3.1 times in 10 instead of 3.5 to 4.0, and a strong player 6.6 to 6.8 times
  instead of 8.3 to 8.5 (the study's placement of the error; the other placement costs every band 0.6 to 0.8 in 10).
  At the point estimate (0.93, genus only), 3.3 to 3.7 and 7.8 to 8.0.
- **Recommendation: wait for the calibration set; do not lower the bar; a subset of today's best-answered items is too
  small for a test.** Count the members' answers, and measure their error held-out, **as the test will show them**
  (one view alone or the same set of views): an answer showing a member beside other views rates the colony, not the
  member (section 5).

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
the fit of section 1 on the held-out answers. Intervals: the delete-one-player jackknife over the 15 players, **each
replicate with the deleted player removed everywhere** (as a rater of every prediction and as a held-out player), t
with 14 degrees of freedom.

| Predictor | σv (photo, within genus) | σu (genus) | total s (95%) | Log-loss vs G, per answer (95%) |
| --- | --- | --- | --- | --- |
| **G**, genus offset only | **0.86** (0.34 to 1.37; profile 0.49 to 1.21) | 0.36 (0 to 0.79) | **0.93 (0.35 to 1.51)** | (reference, 0.460) |
| E, + residual as rated | 0 (profile to 0.35) | 0.13 | 0.13 | −0.0019 (−0.0141 to +0.0104) |
| S2 | 0 | 0.21 | 0.21 | −0.0040 (−0.0117 to +0.0037) |
| S5 | 0.21 | 0.25 | 0.32 | −0.0038 (−0.0092 to +0.0016) |
| S10 | 0.50 | 0.29 | 0.58 | −0.0031 (−0.0069 to +0.0007) |
| D, direct fit (added after the run, 3.7) | 0 | 0.21 | 0.21 | −0.0027 (−0.0115 to +0.0061) |

The first push of this review used a lighter jackknife (a player's held-out answers dropped, their answers still
rating the photos for the others); Codex pointed out on #1380 that it leaves out each player's influence on the
ratings. With it, G's s ran from 0.16 to 1.70 and S5 and S10 beat G (−0.0073 to −0.0003, −0.0055 to −0.0008). The
full version above replaces it; the verdict's tier is the same (3.4).

- **G's σv is the figure the 11-18 study lacked**: photos of one genus differ in difficulty by about 0.86 for a new
  player. Its profile interval (0.49 to 1.21) excludes 0 but holds both 0.61 and 0.80, and the planted runs (3.7) show
  that even its lower end is not firm.
- **E's, S's and D's σv near 0 are not a precision**: the fit treats the held-out players of one photo as seeing the same
  prediction, but each saw a prediction made partly from the other's answer. The planted runs confirm it: at every
  known spread from 0.4 to 1.0, the same fit returns 0 for E (3.7). That is why the declaration kept them out of the
  verdict; their true error is in 3.3 and 3.7.
- By the photo's answer count without the player, genus-only: 1-4 answers, σv 0.34 (1,726 answers); 5 or more, σv 1.41
  (475 answers); no interval was computed for these two, and the gap is not explained here (the planted world gives
  every photo the same spread).
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

- U, the upper bound of G's total error: 1.51 (the jackknife's; σv's profile bound gives √(0.36² + 1.21²) = 1.26).
- No residual predictor beats G on held-out log-loss (every interval reaches above 0), so **s\* = U = 1.51**. Tier:
  over 0.80, **wait**.
- And G's interval (0.35 to 1.51) spans every tier: **not decidable on this log**, which also says wait.
- With the first, lighter jackknife (3.2), S5 and S10 beat G and the rule gave s\* = the planted error of the best of
  them (S5) on the pool at τ = 1.207 (σv's profile upper bound), σu added: √(1.105² + 0.36²) = 1.16, the same tier
  (reading made after the run: "the best" taken as the lowest planted error; E, 1.069 but not better than G on
  held-out, would give 1.13).
- At the point estimate instead of the upper bound (τ about 0.8), the pool's error is about 0.78, 0.86 with the genus
  misfit [planted, a reading made after the run]. The pool's error is scored photo by photo, as declared; per item as
  shown (3.7) it is lower for the items that show several views, without changing the tier at τ = 1.207 (S5 0.97 on
  the items answered 5-9 times, 1.03 with σu).

### 3.5 What it does to the test's right-band rate [model]

20,000 tests a cell, players at −0.5 / 0.56 / 1.5 (beginner / IMR course / knows well), adaptive, four choices; the
error placed as in the study (validated in 3.1, a choice made after the run).

| Rating error s | 20 questions | 25 questions |
| --- | --- | --- |
| 0 (exact) | 0.83 / 0.37 / 0.86 | 0.87 / 0.41 / 0.89 |
| 0.61 (the gate) | 0.85 / 0.35 / 0.83 | 0.89 / 0.40 / 0.85 |
| 0.80 | 0.86 / 0.35 / 0.80 | 0.89 / 0.39 / 0.82 |
| 0.93 (genus only, estimate) | 0.87 / 0.33 / 0.78 | 0.90 / 0.37 / 0.80 |
| 1.16 (s\* with the lighter jackknife) | 0.88 / 0.31 / 0.74 | 0.91 / 0.35 / 0.76 |
| 1.51 (s\* = U) | 0.90 / 0.29 / 0.66 | 0.93 / 0.31 / 0.68 |

- Against the gate, today's ratings at s\* cost the middle player about 0.06-0.08 and the strong player about 0.17
  (0.04-0.05 and 0.09 at 1.16); the beginner's rate rises a little (as in the study's own ±0.8 column).
- **The other placement of the error** (the question's true difficulty off, its rating at the estimate): gate 0.81 /
  0.34 / 0.85 and 0.85 / 0.39 / 0.87, s\* 0.74 / 0.28 / 0.79 and 0.77 / 0.31 / 0.81 at 20 and 25 questions: every
  band loses 0.06-0.08. Which player loses most depends on that modelling choice; that the middle and strong players
  lose against the gate does not.
- These differences are the size the simulation-scope note warns about; they illustrate the verdict, they do not make
  it.

### 3.6 Sensitivity [measured]

- With each player's first 20 answers kept (2,654 answers): genus-only σv 0.99, σu 0.46, s 1.09.
- Date cut (fit before 6 November, held out after, 1,342 answers): genus-only σv 0.80, σu 0.89, s 1.20; E σv 0.76, s
  1.15; E's log-loss −0.0022 against G. The genus misfit grows when the fit stops early (offsets frozen at half the log).
- Leaving one player out moves a genus offset on 50+ weighed answers by up to 0.39: a few players carry much of the log.

### 3.7 Added after the results (not declared)

Four questions the results raised, run on the same design after section 3.3: how often a log like this one gives 0.86
whatever the true spread; whether the photos with 10+ answers (a subset of the pool) are rated better; whether the
answers that show a photo beside other views explain it; and whether a **direct fit** (D: each photo's residual fitted by maximum likelihood on its answers, the players' levels and memory
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
- **By the plain count, the photos with 10-17 answers are rated no better than those with 5-9** (within 0.02 at every
  spread), **because those answers mostly show them beside other views**: a question with several views of one colony
  rates the mean of its views (the Elo divides its step among them), so it says little about one view. Of the 50
  photos with 10-17 answers, 22% of the answers show them alone (5-9 answers: 47%; the calibration members: 50%); 71%
  of the pool's answers are a player's first sight of the photo [measured, design only].
- **Counted by the answers that show the photo alone, or scored per item as shown, the ratings do gain with answers**
  (40 more redrawn logs per spread, errors only, the direct fit's prior also set at the true spread, Dt):

| Planted τ | Photos shown alone 0-4 times (239): G / best | 5-9 times (131) | 10+ times (9) | Items as shown, 5-9 answers (183): G / best | 10+ answers (17) |
| --- | --- | --- | --- | --- | --- |
| 0.61 | 0.65 / 0.63 | 0.64 / 0.60 | 0.59 / 0.50 | 0.60 / 0.56 | 0.53 / 0.47 |
| 0.8 | 0.84 / 0.81 | 0.82 / 0.72 | 0.75 / 0.61 | 0.76 / 0.68 | 0.66 / 0.57 |
| 1.0 | 1.02 / 0.96 | 1.00 / 0.84 | 0.91 / 0.73 | 0.92 / 0.79 | 0.81 / 0.66 |

  "Best" is the lowest of E, S2, S5, S10, D and Dt (mostly Dt or E). An item is a photo set the log shows (28% of the
  5-9 items and 47% of the 10+ items show several views); its truth is the mean of its views. The groups of 9 and 17
  are small (their error reads a few percent low).
- **A direct fit is as good as the best shrunk residual when its prior is right** (Dt, within 0.02 of the best
  everywhere, often the best); with its prior fixed at 0.86 (D) it is worse at small spreads, a mis-set prior. On the
  real held-out answers its log-loss gain over genus-only is not clear (−0.0027, −0.0083 to +0.0029).
- So the ratings gain with the answers that rate the item the test will show, and the plain count overstates what a
  photo has: at a spread of 0.8, an item answered 10+ times as shown sits near the gate, an item answered 5-9 times
  does not. Today 17 items have 10+ such answers.

## 4. What this can conclude (rule A5)

- It can say that coral photos differ within their genus, most likely by about 0.8 (a spread under 0.61 is not
  excluded), so a test on genus offsets alone would most likely carry an error over the gate's; that photo by photo,
  today's ratings recover little of it, because most of a photo's answers show it beside other views; that items
  answered 10+ times as shown come near the gate, and only 17 exist; and that one log of 3,920 answers from 15 players
  cannot pin the spread between 0.4 and 1.2. That agrees with the same day's Q316 offline fit
  ([2026-11-21-q316-offline-fit.md](2026-11-21-q316-offline-fit.md)), which found the coral photo SD not estimable on
  today's log by its own acceptance test.
- It cannot say what the test would do on real players (none has taken one), nor what 20 answers a member buy: the
  planted check only reaches today's counts (up to 17). The population is narrow (15 players, IMR people and the
  owner's account).

## 5. Recommendation [guess, from the measures above]

- **Wait for the calibration set; do not lower the 20-answer bar.** Today's ratings on the photos that have 5+
  answers are most likely off by 0.8 or more, photo by photo, over the gate's 0.61; a better rating method would not
  change that (a direct fit does as well as the best shrinkage, no better).
- **A subset of today's best-answered items is too small**: the 17 items answered 10+ times as shown sit near the
  gate if the spread is 0.8 or less, but a test needs 40-60 [planted].
- **Count and check the members as the test will show them**: the calibration set counts every answer that showed a
  member (`model.js` `nAnswers`, the plain count), half of them beside other views, which rate the colony rather than
  the member. Either the test shows each member as its answers showed it (the same set of views), or the members'
  gate counts the answers that show them alone. A proposal for the test's build (REE-112 step 1), not decided here.
  When the members reach the gate, measure their error held-out as here before the test reads them.
- **What brings the gate nearer is answers on the members, from players seeing them for the first time**: REE-112's
  option of a coordinated RA playing week (about 30 member answers a day in the training week against 4.5-7.6 lately)
  is the lever. Pierre's call (REE-112 next action (3)).
- The genus-level part matters too (σu 0.36, 0.89 with an early cut): keep the test's members across many genera and
  refit the offsets at the time the test is built.
