# Why the app's forecasts are too spread: a diagnosis (2026-11-06, Q147)

For Pierre, who asked (Q147, 2026-11-06): yes, the forecasts need a separate correction, but nothing invented. It must
fit the whole engine and rest on real, existing methods. How do we correct it, how do we choose, and is it a problem of
method or of parameters? This is a diagnosis only. No app change. It builds on the Formats measurement (#638), the
judge's real-log calibration (#624), the photo ratings against the genus ability (#637) and the algorithms review
(`2026-11-06-engine-algorithms-review.md`).

Data: the sheet's Answers tab, read-only through the connector at 13:10 Manila. That is 2,047 coral answers with the
app's logged expectation, from 10 players, between 2026-11-01 and 2026-11-05 20:14 Manila (the same answers as #637
and #638). Players are P1-P10 here. The local copy was deleted after use. The analysis script is kept outside the
repository (no names in it). Marks: **[full text]** read this session (some through a fetch-and-summarise tool, marked
"(tool)"); **[abstract]**; **[secondary]** through LEARNING.md or a citing text; **[memory]** a standard result not
re-checked.

## Summary

1. **The overconfidence is real, but its size is uncertain.** Fitting one shared slope on the app's log-odds beats the
   app's slope of 1 (both with the format offsets) for 9 of 10 players: −0.021 log-loss per answer, sign-flip p 0.008 (#638 found the same). The
   slope itself is 0.39, but with players as the unit its standard error is 0.24, so anything from about 0 to 0.9 is
   possible. Replayed with today's rules (`core.js` on `main`), the slope is 0.53 (SE 0.16).
2. **It is not one slope. It depends on how much evidence an estimate rests on** (exploratory, found after the
   declared tests). On a genus the player has answered fewer than 10 times, the app's log-odds barely predict who is
   right: slope 0.33 ± 0.10 with today's rules, about 0.1 as logged. From 10 answers on, the slope is 1.02 ± 0.21: the
   model is right there. Photos show the same split: under 3 earlier answers the slope is 0.0-0.3, from 3 it is
   1.0-1.4. The split holds within players' experience bands and within the last two days alone. It rests on few
   players: 5 players reached 10+ answers on a genus, 3 of them most of those answers.
3. **Early misses carry most of it.** After a miss on a genus with fewer than 10 answers, the app expects 0.73 on the
   next question of that genus, and players get 0.81 right (+0.14 per player, p 0.016, exploratory). After a right
   answer the gap is +0.06. From 10 answers on, there is no such gap after a miss (+0.03). This is either learning from
   the feedback a miss shows, or a miss step that is too large early. This log cannot tell the two apart.
4. **Causes tested, pre-declared, 9 tests under Holm.** None passed. Every listed cause comes out small or absent at
   this data size:
   - (a) the Elo step sizes: K and the volatility are not the lever. K × 0.5 is worse, K × 1 is the best of the grid,
     volatility off changes nothing, and photo K × 0.5 changes nothing.
   - (b) adaptive selection bias of the photo ratings: not detected (H2, H9). It cannot be excluded.
   - (c) the double count (#643): no measurable effect (+0.0016, p 0.91).
   - (d) photos rated against the global level (#637): the log-loss gain is −0.0022, p 0.60. The slope goes 0.53 →
     0.48 on the photo replay.
   - (e) the guessing model per format: per-format slopes add nothing (p 0.84). Per-format offsets are real (#638:
     k2 +1.14, k3 +1.41, Again +0.44, typed −0.37 logits). The judge's tercile pattern (#624) is largely format mix:
     2-choice questions are 78% of its "hard" tercile and 23% of its "easy" one.
   - (f) a lower discrimination (2PL): genus-specific slopes add nothing (p 0.32). The slope of about 1 from 10
     answers on contradicts a global discrimination of 0.4. A 12% lapse rate with slope 1 fits exactly as well as one
     slope of 0.40, so the data cannot read 0.40 as a discrimination.
   - (g) genus ability mixed with the global level: separate slopes for the level and the genus deviation are equal
     (0.71, 0.73) and add nothing (p 0.057, toward worse).
5. **It is a problem of method, not of parameters.** An Elo point estimate carries no uncertainty, and the
   expectation, the photo aim and the bar use it as if exact. Its reliability changes with the evidence behind it, and
   no single parameter of the current Elo encodes that. Several changes were tried on the replay: K from × 0.25 to
   × 1.5, volatility off, a smaller step for misses (PFAE-like), and shrinking toward the level or toward the genus
   offset. None moves the early slope (0.20-0.38). The parameter part is the format offsets (#638, a real level effect
   per format). After the method change, its few variances must be estimated from the log, not chosen by hand.
6. **Recommendation.**
   1. Do **not** ship one global slope of 0.40 (temperature scaling). That is a calibration patch. It would flatten
      the forecasts exactly where they are right (genera with 10+ answers, the strong players and the exam). Inside
      the photo aim it would also put aimed photos about 2.5 times further from the ability. Keep #646's `q.S` = 1
      for now.
   2. Give each estimate a variance: Glicko / Kalman for the genus ability and the level (review §2b), and a variance
      for each photo rating. Use the Glicko-damped expectation, so `q.S` per question becomes g(v) = 1 / √(1 + 3v/π²)
      (#646 already takes it). Add a learning (process-noise) term for the early phase. Estimate the variances on the
      real log by next-answer likelihood, leaving one player out.
   3. Then a periodic batch refit of the photo and genus difficulties, with marginal or penalised random-effects
      likelihood (not JML), served by the sheet with their standard errors (review §1 step 2).
   4. Confirm with a pre-declared replay. The primary measure is the calibration slope on genera with fewer than 10
      answers, which should move toward 1, together with next-answer log-loss. Guardrails: the slope from 10 answers
      stays near 1, and the mean by format stays calibrated.
   5. **More data is needed** to size these effects and to test (b) and (f) properly: re-run this diagnosis when about
      20 players have 10+ answers on several genera.

## 1. What was measured, and how

`x` is the app's log-odds as logged: e = g + (1 − g) σ(x), with g = 1/k, so x = logit((e − g)/(1 − g)). The base
model M1 is P = g + (1 − g) σ(a_f + b x), with one intercept a_f per format (`analysis.js` `fmtOf`, the #638 formats)
and one shared slope b. Without the offsets (a single intercept) b is 0.26. Slopes come with player-cluster jackknife
standard errors.

**Declared before running** (13:14 Manila, after reading #624, #637 and #638, before computing any of these). One
family, Holm at α 0.05, players as the unit, exact two-sided sign-flip over the 10 players. Where a model is fitted,
the statistic is the leave-one-player-out (LOPO) log-loss difference per player. Replays use `tools/abilityeval.js`,
the app's rule `e+X+M+A`, with the photo difficulty as the app logged it.

| # | Cause | Test | Result | Holm |
|---|---|---|---|---|
| H1 | (a) genus step too large | lag-1 correlation of standardised residuals, same player and genus (1,780 pairs) | +0.008 [−0.15, +0.16], p 0.84 | no |
| H2 | (a/b) photo step, selection | the same on one photo, the next answer by another player ≥ 1 h later (760 pairs) | +0.063 [−0.05, +0.17], p 0.21 | no |
| H3 | (c) double count | replay with the #643 fix (+O) against without | +0.0016 [−0.008, +0.012], p 0.91 | no |
| H4 | (a) K | replay K × 0.5 against K × 1 | +0.0081 [−0.002, +0.018], p 0.086 (worse) | no |
| H5 | (e) formats | a slope per format against one shared slope | −0.0009 [−0.010, +0.008], p 0.84 | no |
| H6 | (f) or noise | slope × log(1 + answers on the genus) | −0.0031 [−0.014, +0.008], p 0.54; coefficient +0.33 (SE 0.15) | no |
| H7 | (f) 2PL by genus | a slope per genus (prior SD 0.5) against one slope | −0.0030 [−0.010, +0.004], p 0.32; SD of genus slopes 0.26 | no |
| H8 | (g) level vs genus | separate slopes on the level and on genus − level | +0.0008 [−0.000, +0.002], p 0.057 (worse); slopes 0.71, 0.73 | no |
| H9 | (b) photo evidence | photo-residual slope × log(1 + answers on the photo) | +0.0001 [−0.004, +0.004], p 0.99 | no |

With 10 players and 2,047 answers this family can show a large effect, not a small one. "No" means not shown, not
shown absent: no equivalence margin was declared (rule L11).

**Exploratory, uncorrected** (found after looking; read as leads to test, not verdicts):

| Slice | answers (players) | predicted / right | slope (SE) |
|---|---|---|---|
| logged, genus answers before 0-2 | 647 (10) | 0.76 / 0.78 | −0.02 (0.24) |
| logged, 3-9 | 801 (9) | 0.76 / 0.84 | 0.14 (0.14) |
| logged, 10+ | 599 (5) | 0.79 / 0.85 | 0.98 (0.27) |
| today's rules replayed, < 10 | 1,448 | 0.78 / 0.81 | 0.33 (0.10) |
| today's rules replayed, 10+ | 599 | 0.80 / 0.85 | 1.02 (0.21) |
| player intercepts, < 3 / 3-9 / 10+ | | | −0.17 / 0.15 / 0.59 |
| players' first 150 answers: m < 10 / m ≥ 10 | 879 (10) / 77 (5) | | −0.07 / 0.96 |
| after 150 answers: m < 10 / m ≥ 10 | 569 (4) / 522 (4) | | 0.23 / 0.90 |
| photo answers before 0-2 | 1,769 | 0.76 / 0.82 | 0.28 (0.23) |
| photo answers before 3+ | 278 (8) | 0.78 / 0.86 | 1.20-1.27 |
| by day, 11-02 → 11-05 | | | 0.11, 0.16, 0.48, 0.84 |

The days and the evidence move together, so the day trend is the same finding seen another way. Within the last two
days alone the split by genus evidence is still there: 0.24 under 10 answers, 0.89 from 10.

**The slope decomposition** (all answers, jackknife SE):

| Component | slope | SD |
|---|---|---|
| player's mean ability | 0.54 (0.22) | 0.34 |
| ability within player | 0.44 (0.29) | 0.75 |
| genus offset | 1.18 (0.66) | 0.16 |
| photo residual | 0.26 (0.22) | 0.53 |

Both the person side and the photo side are too steep. The genus offset is not.

## 2. Each candidate cause: real or not, and how big

- **(a) Step sizes (K, volatility).** Not the cause. On the replay with today's rules, the log-loss for K × 0.25 /
  0.35 / 0.5 / 0.75 / 1 / 1.5 is 0.481 / 0.479 / 0.472 / 0.469 / **0.4685** / 0.471. The slope does not rise as K
  falls; it falls (0.39 at × 0.25). Volatility off: 0.4685, the same. Photo and genus-offset K × 0.5 on the photo
  replay: +0.001, p 0.37. Smaller steps lag behind players who are learning, which costs more than the noise they
  remove (inference). A miss step at 0.75 of the Elo step (PFAE asymmetry, Papoušek, Pelánek & Stanislav 2014: γ 2.23 after a
  right answer, δ −0.89 after a miss **[secondary]**) gains −0.0017 (p 0.50). It mostly moves the mean, and leaves the
  early slope where it was (0.31).
- **(b) Adaptive selection bias.** Bolsinova, Gergely & Brinkhuis (2025) **[full text (tool)]**: when items are
  updated on the fly and selected adaptively, rating variance "artificially increases over time" and does not
  converge, "because item selection depends on current rating errors"; bias grows with K and away from p 0.5. Their
  remedies are two parallel Elo chains, each choosing from the other's ratings, or Urnings. Here it is not detected:
  photo residuals are not anti-correlated across successive players (H2), and the photo-residual slope does not rise
  with evidence in the declared test (H9). The photo-residual slope is low (0.26), which fits either selection bias or
  plain noise. This log cannot separate them, and the remedy is the same: estimates that carry their uncertainty, or a
  batch fit.
- **(c) Double count (#643).** No measurable effect on the forecasts (log-loss 0.4693 → 0.4685, slope 0.52 → 0.53).
  It was a coherence fix, and it stays right on those grounds.
- **(d) Photos against the global level (#637).** Reproduced exactly: log-loss 0.4846 → 0.4805, −0.0022, p 0.60. The
  slope on the photo replay goes 0.53 → 0.48. It moves the mean (predicted 0.756 → 0.790, real 0.822), not the
  spread. Halving the photo K on top does nothing.
- **(e) The guessing model per format (#638).** Real, but it is a level per format, not a slope. The offsets with slope
  1 bring each format's mean to its real success. A slope per format adds nothing (H5). With the offsets alone, the
  terciles still run 0.71 / 0.82 / 0.91 predicted against 0.80 / 0.80 / 0.86 real: the offsets fix the means and leave
  the spread. On LOPO log-loss per answer: the app 0.4856; offsets only 0.4754; offsets plus one slope 0.4673; a slope
  that grows with evidence 0.4611 (−0.0044 against one slope, 8 of 10 players, p 0.22).
- **(f) Lower photo discrimination (2PL / OPLM).** Not supported. Genus-specific slopes add nothing (H7). Where the
  estimates rest on 10+ answers the slope is about 1, so a global a of about 0.4 would be wrong there. A 4PL-style
  lapse rate (12%, slope 1) fits as well as one slope of 0.40 (LOPO −0.0014, p 0.61). "Flatter curve" and "lapses" are
  not distinguishable, and neither is identified as discrimination at this size.
- **(g) Genus ability mixed with the global level.** Not supported. Separate slopes on the level and on the genus
  deviation are equal (H8). Shrinking the genus deviation toward the level (θ = L + (θ̂ − L) m/(m + M), M 5 to ∞) makes
  the log-loss worse at every M.

**What is left:** early estimates. With fewer than 10 answers on a genus, or fewer than 3 on a photo, the log-odds carry
little information. That is the classic errors-in-variables pattern: the slope on a noisy predictor shrinks toward
reliability × true slope **[memory: Carroll et al. 2006]**. The early-miss gap (summary point 3) is where it shows most.

## 3. Method or parameters

**Method.** A forecast built from point estimates is calibrated only if those estimates are posterior means, which are
shrunk by their own uncertainty. Elo estimates are not: Elo "does not provide standard errors and … results in rating
variance inflation" (Hofman et al. 2020 **[abstract; full text (tool)]**). The miscalibration here follows the evidence
behind each estimate, and no constant of the current rule follows it (§2a, §2g: every variant tried leaves the early
slope at 0.20-0.38). A global slope cannot follow it either. A slope of 0.40 is an average of about 0.3 early and about
1 later, weighted by today's mix, so it would drift as players progress.

**Parameters**, two kinds:

- the format offsets (#638), which are real levels;
- once the method carries uncertainty, its few variances (prior variance of a new genus and of the level, a photo's
  prior variance, process noise for learning). These are estimated from the log, not set by eye. Glickman sets the
  first RD the same way: "can be determined through optimizing predictability of game outcomes" **[full text]**.

**Uncertainty alone is not the whole story.** Damping by the variance (Glicko's g) at plausible variances gives a factor
of 0.88 (SD 1 logit), 0.77 (SD 1.5) or 0.71 (SD 2). Early slopes of about 0.3 would need an SD near 4. The posterior
means must also move less on early answers: a learning, or process-noise, term that reads an early miss as partly
"learned from the feedback" rather than "lower ability". That is a hypothesis for the replay to test, not a result
(§5).

## 4. The established methods, and which fits the engine

| Method | What it is (source) | Fits the engine? | Verdict |
|---|---|---|---|
| **Glicko / simplified Kalman** | Each rating carries an SD (RD). The update is scaled by it. The expectation is damped: E = 1/(1 + 10^(−g(RD)(r − rj)/400)), g(RD) = 1/√(1 + 3q²RD²/π²). RD shrinks with games and grows with time (Glickman, *The Glicko system* **[full text]**). Elo, Glicko and TrueSkill are instances of one approximate Kalman filter (Szczecinski & Tihon 2023 **[abstract]**). | Yes. It is Elo with a variance: same scale, same `eloStep` shape, the K schedule replaced by the variance. #646's `q.S` is exactly g(v). The variances also feed the bar's posterior and the exam. In logits: g(v) = 1/√(1 + 3v/π²). Rule L1 holds if the time term is dropped (variance grows with answers given, never with days). | **Recommended (step 2)** |
| **Urnings** | Each person and item is an urn of n marbles. The update follows a simulated outcome, with a Metropolis-Hastings correction that "guarantees that match making resulting from the adaptive item selection does not lead to rating variance inflation"; urn size sets accuracy against tracking speed (Hofman et al. 2020 **[full text (tool)]**; Bolsinova et al. 2025 **[full text (tool)]**). | Partly. Known SEs and principled about adaptivity, but it replaces the continuous logit scale (photo aim, offsets, bar) with discrete urns and adds a design parameter per entity type. A larger change than the problem needs. | Not now |
| **Batch refit (MML / penalised)** | Fit person, genus and photo effects on all answers at once. JML (joint ML) is inconsistent: item estimates "inconsistent and biased in finite samples" (Rasch lecture notes, Hatzinger **[full text]**; Andersen's (k − 1)/k correction **[secondary]**). Marginal ML with a normal ability distribution (Bock & Aitkin 1981 **[memory]**) or a penalised random-effects fit gives shrunk estimates with SEs. | Yes, on the sheet (rule L13). The Analyses already fit crossed effects. It also removes the online chain's dependence of selection on its own current errors (Bolsinova's mechanism; inference). | **Recommended (step 3)**, review §1 step 2 |
| **2PL / OPLM** | Item-specific discrimination a_i (Birnbaum 1968 **[memory]**); OPLM imputes integer a_i and estimates the rest by CML (Verhelst & Glas 1995 **[memory]**). | Possible later as a format or genus slope inside the variance model. Not supported by this log (H7, slope about 1 with evidence). | Not now; re-test with more data |
| **Platt / temperature scaling** | Post-hoc recalibration: logit p' = a + b·logit p (Platt 1999 **[memory]**); temperature scaling is "a single-parameter variant of Platt Scaling" (Guo et al. 2017 **[abstract]**). Medicine treats a slope < 1 ("estimated risks are too extreme") as a sign of overfitting and calls for model updating (Van Calster et al. 2019 **[full text (tool)]**). | It is a calibration patch: it hides the symptom and fixes nothing in the estimates. Here it is also wrong in shape (the right slope depends on evidence). | **Flagged: do not use as the fix** |

## 5. What to implement, in order, and what to measure

1. **Now:** keep #638's offsets (merging). Keep `q.S` = 1 in #646, and no global slope in the expectation or the aim.
2. **Variance model** (review §2b, `core.js` + its replay, an `RVS` entry, rule D5). For each genus and the level:
   a mean and a variance, the update scaled by the variance (Kalman / Glicko), and a process noise per answer
   (learning) in place of `kmax`/`kmin`/`n`/`vr`/`vg`. For each photo rating, a variance from its weighed answers,
   served by the sheet. The expectation uses g(v_θ + v_d), and the photo aim inverts the same formula. **Measure
   first, on the real log** (rule L12), declared before running:
   - primary: the LOPO next-answer log-loss against today's rules, with the variances chosen by LOPO likelihood;
   - co-primary under Holm: the calibration slope on genera with fewer than 10 answers;
   - guardrails: the slope from 10 answers, the mean by format, the after-a-miss gap (+0.14 today).

   Then tier 1 in learnsim across the three learner worlds (review §12).
3. **Batch refit** of photo and genus difficulties with SEs at each Analyses milestone, Elo-style updates kept only
   between refits. Measure: next-answer log-loss and the photo-residual slope (0.26 today) on answers after each refit.
4. **Not now:** a global slope, Urnings, 2PL/OPLM, and separate parameter tweaks (K, volatility, miss asymmetry: §2a
   shows none moves the problem).
5. **More data.** The decisive cells rest on 5 players (genus 10+) and 278 answers (photo 3+). Re-run this diagnosis
   (the same declared family) when about 20 players have 10+ answers on several genera. That is the size at which (b)
   and (f) become testable.

## 6. Limits

- The answers are the same as #637 and #638's (none newer on corals), so this is not independent confirmation of
  their numbers.
- The replays change the abilities only. The photo each player met was chosen by the app at the time, so a replay
  cannot show what other photos a new rule would have chosen.
- The evidence split was found after the declared tests. H6, the declared test of it, did not pass on log-loss (its
  coefficient is +0.33, SE 0.15).
- Ten players: a few heavy players dominate the 10+ cells.
- Some sources were read through a summarising fetch tool, as marked.

## Choices for Pierre (the integrator numbers them)

1. Do not put a global slope of 0.40 (temperature scaling) in the expectation, the photo aim or the bar, and keep
   #646's `q.S` = 1 until the variance model lands. **Recommended: yes.**
2. Correct it with the variance model: Glicko / Kalman for the genus ability and the level, a variance for photo
   ratings, and a learning term. The variances are estimated on the real log, and the result is checked by the
   pre-declared replay above (§5.2) before any rule change. **Recommended: yes**, as the review's §2b.
3. Then the batch refit (marginal or penalised random effects, not JML) of photo and genus difficulties with standard
   errors, served by the sheet. **Recommended: yes, after 2.**
4. The early-miss gap (+0.14): test it inside the variance model (process noise), not as a separate miss rule.
   **Recommended: yes.**
5. Re-run this diagnosis when about 20 players have 10+ answers on several genera. **Recommended: yes**, as a
   ROADMAP row.

## References

- Bolsinova, M., Gergely, B., Brinkhuis, M. (2025). Keeping Elo alive. *BJMSP*.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335/ **[full text (tool)]**
- Glickman, M. E. *The Glicko system*. http://www.glicko.net/glicko/glicko.pdf **[full text]** (the model: Glickman
  1999, *Applied Statistics* 48, 377-394 **[secondary, via that text]**)
- Hofman, A. D., Brinkhuis, M. J. S., Bolsinova, M., Klaiber, J., Maris, G., van der Maas, H. L. J. (2020). Tracking
  with (un)certainty. *J. Intell.* 8(1), 10. doi 10.3390/jintelligence8010010, https://pmc.ncbi.nlm.nih.gov/articles/PMC7151223/
  **[abstract via PubMed; full text (tool)]**
- Szczecinski, L., Tihon, R. (2023). Simplified Kalman filter for online rating: one-fits-all approach. *J. Quant.
  Anal. Sports* 19(4). https://arxiv.org/abs/2104.14012 **[abstract]**
- Guo, C., Pleiss, G., Sun, Y., Weinberger, K. Q. (2017). On calibration of modern neural networks. ICML.
  https://arxiv.org/abs/1706.04599 **[abstract]**; Platt, J. (1999). Probabilistic outputs for SVMs **[memory]**
- Van Calster, B. et al. (2019). Calibration: the Achilles heel of predictive analytics. *BMC Med.* 17, 230.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC6912996/ **[full text (tool)]**
- Hatzinger, R. Psychometric Methods 2010/11, Rasch model estimation (JML, CML, MML).
  https://statmath.wu.ac.at/~hatz/psychometrics/10w/RM_handouts_3.pdf **[full text]**; Andersen (1980) (k − 1)/k
  correction **[secondary]**; Bock, R. D., Aitkin, M. (1981), *Psychometrika* 46 **[memory]**
- Papoušek, J., Pelánek, R., Stanislav, V. (2014). Adaptive practice of facts in domains with varied prior knowledge.
  EDM (PFAE, γ 2.23 / δ −0.89) **[secondary, LEARNING.md]**
- Birnbaum, A. (1968), the 2PL; Verhelst, N. D., Glas, C. A. W. (1995), OPLM; Barton, M. A., Lord, F. M. (1981), the
  upper asymptote; Carroll, R. J., Ruppert, D., Stefanski, L. A., Crainiceanu, C. (2006), *Measurement Error in
  Nonlinear Models* **[memory]**
