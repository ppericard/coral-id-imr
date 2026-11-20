# Response time on right answers: how it splits between the photo and the player, by the player's strength

Read-only study, 2026-11-21 (Manila morning). Nothing in the app, the sheet or the tools changed. Players are P1, P2…
(rule D2), numbered as in the 2026-11-20 re-measure (LEARNING.md "Response time, re-measured over every subject"), by
timed answers over the whole log. The data extract, the scripts and their outputs stayed in the session's scratchpad and
are not in the repository; "rt-study" below is that 2026-11-20 re-measure, "rtchecks" its no-misses checks, and "the
design" the response-time design study behind Q449-Q452 (ROADMAP "Time in the photo rating").

Pierre, 2026-11-21 05:48 (the question): «tu mets tous les joueurs dans le même panier et je me demande dans quelle
mesure il faudrait pas arriver à différencier … de manière continue, … sans forcément faire des catégories. Des réponses
qui viennent de joueurs qui sont très forts … apportent un signal qui est forcément différent des joueurs débutants. …
quand un joueur débutant met du temps ou se trompe, … le plus probable c'est … sa propre connaissance … quand un joueur
qui est très fort hésite, … plutôt la difficulté propre de la photo. … C'est typiquement comparer les temps de réponse
par rapport au niveau des joueurs et la difficulté des photos.»

## 1. Declared before running (2026-11-21 05:55 Manila)

### Data

- The sheet's Answers tab, read-only. The extract (A:T, 6,653 rows, 2026-11-01 17:47 to
  2026-11-20 15:50) is current: a read of `Answers!A6650:T9000` at 05:52 returned no row after 15:50.
- Libraries: numpy and pandas only (no scipy, no statsmodels). So the suggested mixed model is **replaced by a
  method-of-moments estimator on pairs of answers** (the same family as rt-study Q2), with players as the statistical unit
  (delete-one-player jackknife). Why: crossed random effects with an ability-dependent loading need an REML or MCMC fit
  that would be home-made here; pair moments are a few lines, transparent, and checked below by a planted simulation on
  the real design.

### The answers analysed

Per subject (corals, fish; sea slugs counts only: one player, no photo answered by two players):
- **right** answers, **timed** (seconds > 0), **not typed**, **not enlarged**, not wink;
- **not** comeback (`|c`) or gentle restart (`|w`) questions: their Expected is recall-adjusted, so the question
  difficulty derived from it (below) would be wrong without column W;
- with a z (the player's 11th timed answer on), z exactly as `core.js` `rtWeight`: log(seconds, tenths, capped 600) −
  the median log seconds of the player's earlier timed non-typed answers in the subject;
- of **trusted** players, reproduced from `core.js` `trustOf` on the whole log of the subject: 10+ answers and right
  answers beating the guess rate (1/k, ½ duel, 0 typed) with a one-sided z ≥ 1.645. The admin's exclusions (`sxSet_`)
  are not in the extract: not applied (named proxy);
- the photo is the question's first photo (the colony view of a multi-view question), as in rt-study.

**Primary outcome**: ẑ = z clipped at ±1 (the design's winsorised z, what a photo time term would consume).
**Declared sensitivity**: z unclipped (the 600 s cap only), because the clip trims beginners' larger spread more.

### The moderator (the player's strength), continuous

- **L, primary: the player's level at the time**: the mean of the player's logged Ability (column J, the unit ability
  the app scored with) over their previous 30 answers in the subject (all answers, any format; at least 10, else the
  answer is left out). A proxy for the global level, which the log does not carry. It is "how strong this player is now",
  not "how well they know this unit".
- **Δ = θ − L, secondary**: the logged unit ability against the player's level ("knows this unit better or worse than
  their level").
- **θ, secondary**: the logged unit ability itself.
- **dq, the question's difficulty as the engine saw it**: θ − logit((e − g) / (1 − g)), e the logged Expected, g = 1/k
  (`core.js` `kOf`). It holds the photo rating, the memory, the mix-ups term and the format offset: a question
  difficulty, not a photo difficulty. (e − g)/(1 − g) clipped to [0.02, 0.98].

**Which one w() would use**: L. The sheet can compute it in its own pass from the logged Ability column; it is what
Pierre's words name (the player's level). Δ and θ are reported to show whether the unit knowledge, not the level, is what
moves the share.

### Part A. The fixed effects: time against the player's level and the question's difficulty (exploratory)

Pooled least squares of ẑ on: L, Δ, dq, L × dq, the format cell (k, single view, photos shown capped at 3), the share of
the question's photos new to the player (New photos / photos shown), log(1 + the player's earlier answers on the unit),
log(the player's answer number in the subject), and one intercept per player. Coefficients with delete-one-player
jackknife 95% t intervals (df = players − 1). Exploratory, uncorrected: it describes "comparer les temps de réponse par
rapport au niveau des joueurs et la difficulté des photos", it does not decide anything.

### Part B. The split, as a continuous function of L (the key quantity)

Residuals r = ẑ − the Part A fit (player intercepts in). Three kinds of pairs of answers, each pair weighted 1/(m − 1),
m the number of analysed answers on that photo (or unit, for unit pairs), so a much-answered photo does not dominate:

- **C(L)**: pairs by **two different players on the same photo**. E[r₁ r₂] = the photo's shared part (photo + its unit).
  Weighted least squares of r₁r₂ on [1, (L₁ + L₂)/2 − L_ref, (dq₁ + dq₂)/2] (the dq term controls the adaptive draw:
  strong players meet harder photos). C(L) is the fitted line at dq = its mean.
- **V(L)**: E[r²] by weighted least squares of r² on [1, L − L_ref, dq] (each answer weighted 1).
- **s(L) = C(L) / V(L)**: the share of one right answer's time variance that is the photo's (its reliability as a
  measure of the photo's time). C, V and s are reported separately, at L = the 10th, 25th, 50th, 75th and 90th
  percentiles of L among the analysed answers. L_ref = the median.
- **Secondary splits (exploratory)**: U(L), pairs by two different players on **different photos of the same unit** (the
  unit's part); C − U the photo's own part net of the unit. K(L), pairs by **the same player on different photos of the
  same unit**, minus U: the player's knowledge of the unit (rt-study's player × unit). Shares K/V and (V − C − K)/V.
- **Moderators Δ and θ**: the same C, V, s with Δ (resp. θ) in place of L; exploratory.

**Primary statistic** (one per subject): **Δs = s(L₇₅) − s(L₂₅)**, the photo share at the 75th percentile of L minus at
the 25th. Pierre's hypothesis predicts Δs > 0.

**Intervals**: delete-one-player jackknife (the Part A fit refitted without the player, then every pair holding that
player dropped), 95% t interval with df = players − 1; the leave-one-out range shown beside it.

**Decision thresholds**:
- **"Clear, the share rises with the level"**: the jackknife interval of Δs is above 0, and its Holm-adjusted p (two
  subjects, two-sided t) < 0.05, with at least 8 players contributing cross-player pairs, **and** the planted simulation
  (below) passes for that subject.
- **"Clear, it falls"**: the same, below 0.
- Otherwise **"Not clear"**, stated with the smallest slope the simulation shows the data could have detected (power
  ≥ 80%): "the data exclude a rise larger than X", never "no effect".
- Bins of L (thirds) are computed as a check of the line's shape only, never as the design.

**Anchors, run first** (the estimator must reproduce the known pooled figures before any slope is read): the pooled
cross-player correlation on a photo (rtchecks C1, corals +0.108; here as C/V pooled and as the rtchecks formula on the
same rows) and the pooled shares (rt-study Q2: corals photo 3.9%, unit 3.2%, player × unit 11.9%; with a different set of
fixed effects and enlarged answers kept, so "close", not equal, is expected). A gap larger than a factor of 2 is
explained before any slope is reported.

**Support at the strong end**: the number of cross-player same-photo pairs where both answers have L above the 75th
percentile, and where both have θ ≥ 2. Under 50 such pairs, s at the 90th percentile is reported as extrapolation.

### The planted simulation (validates the estimator and gives the detectable effect)

On the real design (the same answers: players, photos, units, L, dq; the same pairs and weights), simulated residuals
r = λ(L)·(b_photo + u_unit) + k_(player, unit) + e, with b, u, k, e normal, their variances set to the pooled estimates
of this run (C − U, U, K, V − C − K), and λ(L) = exp(γ x / 2), x = (L − L_ref)/sd(L), γ ∈ {0, 0.25, 0.5, 1} (the
photo's variance scales by exp(γ x): always positive). 200 data sets per γ
per subject (seeded), each through the same estimator and the same jackknife.
- **Pass rule**, per subject: at γ = 0, Δs is "clear" in ≤ 10% of the data sets (nominal 5%) and the mean Δs is within
  ±0.02 of 0; at each γ > 0, the mean estimated Δs is within 25% (or ±0.02) of the planted Δs (computed from the planted
  variances). A subject that fails the pass rule gets no verdict ("the estimator is not reliable on this design").
- **Detectable effect**: the smallest planted Δs with power ≥ 80%; the "Not clear" verdict quotes it.

### What it implies for the design (declared before the result)

- If **clear rise**: w(L) = s(L)/s(L_ref) with the fitted line, its parameters (c₀, c₁, v₀, v₁) quoted; the photo term's
  precision weight per answer ω(L) = s(L)/(1 − s(L)), i.e. a per-answer shrinkage N₀(L) = 1/ω(L) in place of one N₀.
- If **not clear** (expected, given 12 and 9 players): the simplest defensible form, **a constant weight** (today's
  trust weight n/(n + 10) and one N₀ = (1 − s̄)/s̄ from the pooled share), plus the continuous form as a declared
  parameter at its null (γ = 0), and the re-measure threshold from the simulation's power curve (how many players /
  cross-player pairs the data need to detect the effect size Pierre's words imply).
- Step 2 (the player's side): 1 − w(L) of the answer's photo-explained time stays with the photo; the player's z net of
  the photo term, z − ŝ(L)·TI_f, only once TI exists.

### Compute

A few minutes of numpy on this machine (no browser, no replay); under the 40-minute cap (L11). The simulation is
vectorised over the precomputed pairs.

### Changed after the first run (declared here)

- The first run with the simulation (run 1) is the declared one. The second (run 2) adds three
  **exploratory** outputs: jackknife intervals on the C and V slopes alone; a fifth planted value γ = 2 to extend the
  power curve; and the power of a test calibrated on the simulated null's spread instead of the jackknife. All
  non-simulated figures are identical between the two runs. The simulation's random draws for fish differ between the
  runs because γ = 2 was added; the declared verdicts below come from run 1.
- Run 3 (exploratory, after a review) uses 2,000 sets per γ and prints the mean jackknife SE. It
  settles the fish pass rule, which differed between runs 1 and 2 within Monte Carlo noise. It also compares the
  planted world's jackknife SE with the real data's.
- Run 4 (after Codex's review of #1352) puts each simulated outcome through the same Part A fit as the log. That means
  the player intercepts and fixed terms, refitted in each jackknife sample without the player. It also uses 2,000 sets
  per γ. Runs 1-3 had planted the residuals directly. The figures barely move (below).
- Correction (Codex's review of #1352): the step 2 line above, z − ŝ(L)·TI_f, shrinks the photo term twice. TI_f is
  already a shrunk estimate of the photo's contribution, so step 2 subtracts it with the answer's loading, z − λ(L)·TI_f
  (λ = 1 while γ = 0). Section 4 uses the corrected form.
- The actual compute was about 10 s per run, not minutes.

## 2. Results

Every interval is a delete-one-player jackknife 95% t interval unless marked otherwise.

### Counts

| Subject | Right answers analysed | Photos | Units | Trusted players | Cross-player pairs on one photo | Same player, same unit, other photo |
| --- | --- | --- | --- | --- | --- | --- |
| Corals | 2,060 | 1,029 | 45 | 12 | 1,708 | 8,686 |
| Fish | 2,169 | 1,822 | 79 | 9 | 382 | 9,758 |
| Sea slugs | 128 | 125 | 27 | 1 | 0 | n/a |

- All corals and fish players with timed answers pass the trust rule.
- Sea slugs: **Not enough data yet**. There is one player and no photo answered by two players.
- **Support at the strong end.** Corals have 56 cross-player pairs where both answers sit above the 75th percentile of
  L, but only 5 pairs where both answers have θ ≥ 2. Fish have 6 pairs above the 75th percentile of L: under the
  declared 50, so **the fish's strong end is extrapolation**. For both subjects, "experts" in Pierre's sense (θ ≥ 2 on
  both sides of a pair) are almost absent from the cross-player data.

### Anchors: the estimator reproduces the known figures

- Pooled cross-player share C/V for corals: **0.106**. The rtchecks C1 formula on the same rows gives +0.107 (C1 was
  +0.108). Fish: 0.060, and the C1 formula gives +0.097.
- Corals' pooled shares of the variance against rt-study Q2 (moments, other fixed effects):
  - unit: 4.1% here, 3.2% there;
  - photo net of the unit: 6.5% here, 3.9% there;
  - player × unit: 9.7% here, 11.9% there.

  All are within a factor of 2, as declared.
- The jackknife is wider than rtchecks' player bootstrap. The corals' pooled C/V is 0.106 [−0.025, +0.238] here,
  against C1's [+0.037, +0.195]. The simulation below shows why: the jackknife over-covers on this design.

### Part A. Time against the player's level and the question's difficulty (exploratory, uncorrected)

Coefficients on ẑ (clipped log time against the player's own median), right answers, player intercepts:

| Term | Corals (12 players) | Fish (9 players) |
| --- | --- | --- |
| L (level at the time), per logit | −0.042 [−0.203, +0.119] | −0.098 [−0.190, −0.006], p 0.040 |
| Δ = θ − L (knows this unit above their level), per logit | **−0.191 [−0.305, −0.078], p 0.003** | **−0.142 [−0.244, −0.041], p 0.012** |
| dq (question difficulty as the engine saw it), per logit | +0.125 [+0.005, +0.246], p 0.042 | **+0.120 [+0.090, +0.149], p < 0.001** |
| L × dq | −0.044 [−0.217, +0.129] | −0.030 [−0.090, +0.029] |
| New photos share, earlier answers on the unit, answer number | none clear | none clear |

- **What it says.** In both subjects, a right answer is faster when the player knows **this unit** better than their
  own level (Δ), and slower when the question is harder for the engine (dq). Each logit of Δ takes about 17% off the
  time (corals), and each logit of dq adds about 13%. This is Pierre's two factors, «la difficulté de la question pour
  le joueur» and «la difficulté de la photo», seen in the same model. The player's level alone (L) adds little beyond
  their own median, which z already removes.
- **The interaction.** Pierre's hypothesis predicts L × dq > 0: a strong player's time follows the difficulty more.
  Both point estimates are negative and neither is clear. So this model gives no support for it, and does not rule it
  out.
- **Caveat.** dq is built from the photo rating, which learns from misses, so it is not a time-based difficulty. The
  table describes the data; it decides nothing.

### Part B. The split as a continuous function of the level L (primary)

**Corals** (L percentiles 10/25/50/75/90 = +0.01, +0.35, +0.71, +1.40, +1.70):

| L | C (shared by players on the photo) | V (one answer's variance) | s = C/V (photo + unit share) | Knowledge share (K − U)/V |
| --- | --- | --- | --- | --- |
| +0.01 | +0.027 [−0.043, +0.096] | 0.313 [0.225, 0.402] | 0.086 [−0.145, +0.316] | 0.156 [−0.148, +0.460] |
| +0.35 | +0.029 | 0.303 | 0.094 [−0.084, +0.272] | 0.130 |
| +0.71 | +0.030 [−0.008, +0.069] | 0.293 [0.225, 0.360] | 0.104 [−0.037, +0.245] | 0.103 |
| +1.40 | +0.034 | 0.272 | 0.125 [−0.070, +0.319] | 0.042 |
| +1.70 | +0.036 [−0.033, +0.104] | 0.263 [0.205, 0.321] | 0.135 [−0.125, +0.394] | 0.013 [−0.090, +0.117] |

**Fish** (L percentiles = +0.59, +0.96, +1.50, +1.87, +2.10):

| L | C | V | s | Knowledge share |
| --- | --- | --- | --- | --- |
| +0.59 | +0.009 | 0.289 [0.244, 0.335] | 0.032 [−0.174, +0.238] | 0.139 [+0.083, +0.196] |
| +0.96 | +0.012 | 0.263 | 0.044 | 0.129 |
| +1.50 | +0.015 | 0.224 | 0.066 [−0.283, +0.416] | 0.108 |
| +1.87 | +0.017 | 0.198 | 0.086 | 0.090 |
| +2.10 | +0.018 [−0.123, +0.160] | 0.181 [0.121, 0.242] | 0.102 [−0.643, +0.846] | 0.076 [−0.080, +0.232] |

**The primary statistic**, Δs = s(75th) − s(25th):

| Subject | Δs [95% jackknife t] | p | Holm | Leave-one-player-out range | Verdict |
| --- | --- | --- | --- | --- | --- |
| Corals | +0.031 [−0.222, +0.283] | 0.80 | 1.00 | −0.045 … +0.067 | **Not clear** |
| Fish | +0.042 [−0.469, +0.553] | 0.85 | 1.00 | −0.155 … +0.129 | **Not clear**; the estimator also failed its pass rule (below) |

**The secondary and sensitivity results are mixed. Most point estimates lean Pierre's way, some do not, and none is
clear:**
- **Δs over L in all six versions.** The sensitivities are unclipped z and answers with 3+ earlier answers on the unit.
  - Corals: +0.031, +0.069, +0.060.
  - Fish: +0.042, +0.026, +0.134.
- **The knowledge share falls with L.** Corals −0.088 [−0.319, +0.143]; fish −0.039 [−0.156, +0.078].
- **Where the rise comes from.** It comes mostly from **V falling** (strong players' right-answer times are less
  scattered). The shared part C stays flat: its slope per logit of L is +0.005 [−0.063, +0.074] for corals and +0.006
  for fish. V's slope:
  - corals −0.030 [−0.074, +0.015], p 0.17;
  - fish **−0.072 [−0.112, −0.032], p 0.003** (exploratory, uncorrected).

  For corals, V's direction **flips without the clip** (+0.029), so it is not robust there.
- **Other moderators.** With Δ (the unit's knowledge) in place of L, Δs is −0.009 for corals (against the
  hypothesis) and +0.084 for fish. With θ, it is +0.010 for corals and +0.092 for fish. None is clear.
- **Against the hypothesis.** Part A's L × dq is negative in both subjects, and the bins below are not monotone.
- **Bins (shape check only).** Thirds of L give s = 0.12, 0.08 and 0.15 for corals, and 0.06, 0.01 and 0.16 for fish.
  The shape is not monotone, so it does not tell a line from a step or from flat.

### The planted simulation (run 1, declared)

Each planted world has the real design and the pooled variances. λ(L) = exp(γx/2). There were 200 data sets per γ.

| γ | Corals: planted Δs | estimated (sd) | jackknife "clear" | coverage | Fish: planted | estimated (sd) | "clear" | coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0 | −0.011 (0.073) | 1% | 99% | 0 | −0.005 (0.106) | 0% | 100% |
| 0.25 | +0.042 | +0.039 (0.075) | 1% | 98% | +0.019 | +0.028 (0.105) | 0% | 100% |
| 0.5 | +0.089 | +0.087 (0.079) | 6% | 98% | +0.038 | +0.027 (0.110) | 1% | 99% |
| 1 | +0.202 | +0.187 (0.082) | 22% | 98% | +0.074 | +0.043 (0.116) | 2% | 98% |

- **Corals pass the declared rule.** False "clear" is 1%, the null mean is within 0.02, and the bias is within 25%.
  But **no planted value reaches 80% power under the jackknife**. Even the exploratory γ = 2 (Δs +0.48) is "clear" only
  20% of the time. The jackknife is very conservative here, with coverage 98-100%.
- **Through the full pipeline** (run 4, 2,000 sets, the Part A fit and its jackknife refits included), the corals
  still pass.
  - Null mean 0.000, false "clear" 1%, coverage 99%.
  - Δs +0.042, +0.089, +0.202 and +0.485 are estimated as +0.041, +0.083, +0.182 and +0.466, a bias of 10% or less.
  - The jackknife "clear" rate at those values is 1%, 4%, 17% and 21%.
- **Calibrated on the simulated null's spread** (exploratory, run 4): the power is 9%, 20%, 67% and 100% at Δs +0.04,
  +0.09, +0.20 and +0.48 (null sd 0.076). So **the smallest rise these data could detect is a Δs of about
  0.2 to 0.25**: the photo share would have to go from about 0.09 at the 25th percentile of the level to about 0.3 at
  the 75th. Against that spread, the real corals Δs (+0.031) gives an approximate 95% range of [−0.12, +0.18].
- **Caveat on these calibrated figures.** The planted world has identical players. Real players may differ in noise,
  and that noise may vary with L, so the figures are optimistic, a lower bound on the true uncertainty. One check fits
  the planted world, though: its mean jackknife SE at γ = 0 is 0.116, and the real corals' is 0.115.
- **Fish fail the pass rule**, confirmed in runs 3 and 4 (2,000 sets, Monte Carlo SE about 0.002). In run 4, γ = 1
  gives +0.050 against +0.074 planted, beyond 25% and ±0.02, and γ = 2 gives +0.085 against +0.153. Runs 1 and 2 had
  differed within Monte Carlo noise. There is no power at any planted value (≤ 11%). **The estimator is not reliable on the fish design
  today.** There are too few photos answered by two players (382 pairs for 1,822 photos), so the fish verdict is "Not
  enough data yet" rather than "Not clear".

## 3. What the data can and cannot say

**Can say:**
- In both subjects, most of a right answer's time is within-answer noise: about 80% for corals and 85% for fish, after
  the format and the player's own speed are removed.
- **Corals: the part shared by players on a photo** (unit included) is about 10% of one answer's variance. This
  estimate is 0.106 [−0.025, +0.238] under the conservative jackknife; the support that it is above 0 comes from
  rtchecks' player bootstrap (C1 +0.108 [+0.037, +0.195]) and rt-study's predictive test.
- The player's knowledge of the unit, relative to their level, clearly moves the time (Part A's Δ) in both subjects.
  So does the question's difficulty (dq). Fish's knowledge share is 0.102 [+0.052, +0.153]; the corals' 0.097 includes
  0 under the jackknife.
- **Point estimates, mostly in Pierre's direction, none clear:**
  - the photo share rises with the level (corals 0.09 → 0.14 from the 10th to the 90th percentile; fish 0.03 → 0.10);
  - the knowledge share falls (corals 0.16 → 0.01; fish 0.14 → 0.08).

  Against them: L × dq is negative in Part A, the corals' Δs with Δ as moderator is −0.009, and the bins are not
  monotone.
- **If the rise is real, the data suggest how it works**: strong players' times are **less scattered**, while the
  photo's shared part stays about the same. That would be "a strong player's hesitation is more likely the photo,
  because there is less else in it".
  - Fish: V's slope is clear (exploratory).
  - Corals: V's slope flips sign without the ±1 clip, so the mechanism is not established there.

**Cannot say:**
- Whether the share really rises with the level. Corals: neither confirmed nor excluded below a Δs of about 0.2 to 0.25
  (a tripling, roughly), an optimistic bound. Fish: the estimator does not work yet on its design.
- **The fish photo share itself**: 0.060 [−0.128, +0.247], with a leave-one-out range crossing 0. Anything built on it
  (its N₀) is a placeholder.
- What happens at the expert end (θ ≥ 2). There are 5 coral and 9 fish cross-player pairs there, so anything above the
  75th percentile of L is extrapolation.
- Anything from 12 and 9 players about a between-player form. Players' levels overlap little within a subject, and L
  moves mostly between players and over days.
- Anything about sea slugs.

## 4. What it implies for the design

1. **The form to build: continuous, with its parameter at today's null.** Each trusted right answer enters the photo's
   time term with a precision weight ω(L) = s(L)/(1 − s(L)) relative to the photo's prior:
   - The model: ẑ_a = λ(L_a)·b_f + noise, b_f the photo's latent time effect. λ² = exp(γ x), x = (L − L_ref)/sd_L
     (the simulation's λ, so its γ is this γ). Hence s(L) = s₀e^{γx} / (s₀e^{γx} + 1 − s₀), about s₀e^{γx} while s is
     small.
   - The photo term is the posterior mean of b_f, each answer divided by its loading:
     TI_f = Σ ω(L_a)·(ẑ_a / λ(L_a)) / (Σ ω(L_a) + 1). ω already holds λ², so leaving out the division would scale the
     estimate by the answers' typical λ (Codex's review of #1352).
   - Step 2 subtracts λ(L)·TI_f from the player's z. At γ = 0 both reduce to the plain weighted mean and z − TI_f;
   - L is the player's level at the answer (the running mean of the logged Ability, or the global level if the sheet
     carries it);
   - **γ = 0 today** (the declared fallback): one ω for everyone, i.e. one N₀ = 1/ω.
   - Pooled values: corals s₀ ≈ 0.106 (photo + unit), N₀ ≈ 8, or 0.065 (photo net of unit), N₀ ≈ 14. The corals'
     net-of-unit N₀ ≈ 14 sits between the 11-04 REML (≈ 3) and rt-study (≈ 20); all intervals are wide.
   - Fish: s₀ ≈ 0.06 (N₀ ≈ 16) or 0.037 (N₀ ≈ 26). **Placeholders only**: the fish share's interval includes 0.
   - This is one code path for every subject (S1): no categories, no tiers, and Pierre's continuous dependence
     designed in as a single number re-fitted at each re-measure.
2. **What Pierre's 1 − w means here.** At the level of one answer, the player's side (1 − s(L)) is about 90% today. It
   splits into the player's knowledge of the unit (about 10%, perhaps falling from about 15% for beginners to near 0
   for the strongest: point estimates, not clear) and noise.
   - Step 2 (candidate C) takes the photo term itself out of the player's z: z − λ(L)·TI_f, with λ = 1 while γ = 0. It
     must not use s(L)·TI_f, because TI_f is already shrunk.
   - Its effect is bounded by the photo's share of one answer's variance: about 10% for corals, i.e. a photo term's
     spread about a third of one answer's z spread (√0.1 ≈ 0.32). It is smaller while a photo has few answers, since
     TI_f is shrunk toward 0.
   - So step 2 moves a player's z modestly, on well-answered photos only. It stays second.
   - The player-side signal that **is** clear is the knowledge of the unit (Part A's Δ, rt-study's player × unit),
     which `rtWeight` already reads.
3. **A cheaper first step toward Pierre's point, to measure, not build.** The data's mechanism is V(L), and V can be
   estimated from **one player's own answers**, with no cross-player pairs:
   - weight each answer by the inverse of its noise variance at its level, ω ∝ 1/V(L), with C held constant;
   - for fish this is the one clear slope (V −0.072 per logit, p 0.003, exploratory);
   - for corals it is not robust to the clip.

   This is the form to test first at the re-measure. It needs the same single parameter, the slope of log V on L.
4. **How to measure it once more data exists** (the re-measure, to declare as is):
   - **The test.** The jackknife over-covers here (98-100%) and cannot reach 80% power even at a Δs of 0.48. The
     re-measure should therefore add a test calibrated by simulation on the real design, with **players who differ** in
     noise and loading (fitted per player), so the calibration is not optimistic. The jackknife is kept beside it.
   - **Threshold (rough, optimistic).** Detecting a Δs of 0.09 (planted γ = 0.5, the photo variance × 1.65 per sd of
     level) at 80% power needs the null sd to fall from 0.076 to about 0.032. That is roughly 6 times the corals'
     cross-player same-photo pairs: about 10,000 instead of 1,708, assuming sd ∝ 1/√pairs. More players would also
     help the jackknife; 12 is few.
   - Fish need photos answered by several players first. Their draw rarely repeats a photo across players: 382 pairs on
     1,822 photos.
   - **The check that needs no misses** (the design's C2): give the strong players' answers a weight ω(L) with γ > 0 in
     the photo's time term, and see whether that term predicts **other** players' misses better than with γ = 0.
5. **No change to Q449-Q452's direction.** This is consistent with candidate A (form A2, fading by information). A
   continuous ω(L) is compatible with it: an expert's right answer brings little accuracy information and keeps its time
   weight ω(L).

## 5. Method notes and what was checked

- **Data and code.**
  - The extract is current: the 05:52 read found no new row.
  - z, k and trust follow `core.js` `rtWeight`, `kOf` and the trust rule in LEARNING.md "Who counts" (read).
  - P numbering is the same code as rt-study and rtchecks.
- **The estimator.**
  - It reproduces the C1 anchor (+0.107 against +0.108) and the Q2 shares within a factor of 2.
  - The planted simulation, through the full Part A fit (run 4), recovers the corals' slope with a bias of 10% or less,
    and attenuates the fish's.
  - Pair weights are 1/(m − 1). dq enters the pair regression to control the adaptive draw; its coefficient is small,
    about +0.005 in C.
- **Not done.**
  - No REML, mixed model or MCMC: there is no library for it, and the moments approach was declared instead.
  - No replay of the global level: L is a proxy, the running mean of the logged unit ability over 30 answers.
  - The admin's exclusions were not applied.
  - The corals' comeback and restart rows (`|c`, `|w`) are left out.
- **Compute**: about 10 s for each of runs 1 and 2 and for the run without simulation; 78 s for run 3 and 108 s for run 4 (2,000 sets each).
  Machine time (not an effort figure), well under L11's compute cap.
- **Files**: the extract (which holds real names), the scripts and their outputs (P numbers only) stayed in the
  session's scratchpad; nothing of them is committed. The method above is enough to redo the study. At the re-measure,
  the scripts should go into `tools/studies/` (as `tools/studies/q351/`).
- **What is still open**: the integrator's recommendation to Pierre (ROADMAP "Time in the photo rating").
