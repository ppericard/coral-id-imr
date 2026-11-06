# Independent review of the game engine's algorithms (2026-11-06)

For Pierre, who asked (2026-11-06) whether the engine's algorithms are coherent with each other and up to date with the
science, or bricks that do not talk, sit side by side for no reason, or were superseded long ago. Scope: the algorithms
and the state of the art, module by module (`core.js`, `model.js`, `quiz.js`, `learn.js`, `progress.js`, `sync.js`,
`tools/sync/Code.gs`, `analysis.js`, `tools/learnsim.js`), with `docs/LEARNING.md` read as claims to check. A separate
review covers global coherence and architecture. No code was changed. Code read on `main` at `2e8f6174`.

Source marks: **[full text]** read this session; **[abstract]** abstract, official summary or code read; **[secondary]**
through a citing paper or summary; **[memory]** standard result not re-checked. "Checked" = a number I computed or a
code path I ran; "inference" = my reasoning, not measured.

## Summary

| # | Module | Verdict | Priority |
|---|---|---|---|
| 1 | Photo difficulty (sheet photo Elo, genus offsets) | Adjust: rate photos against the player's genus ability, not one global level; then a periodic batch fit | P1 |
| 2 | Player level (genus Elo, global level, volatility, answer time) | Adjust: remove a double count; replace the K schedule and "volatility" by a Kalman/Glicko variance | P1 |
| 3 | Success target and difficulty control | Keep the target (85% → 75%); Adjust the guess model per format, which misses 2-choice questions by ~11 points | P1 |
| 4 | Wrong answers (traps, look-alikes, pooled confusion) | Keep the shrinkage; Adjust the per-offer confusion rate (not normalised by format) | P2 |
| 5 | Typed questions and grading | Keep the grading; Adjust: a typed format offset learned from data, not only "no guess floor" | P2 |
| 6 | Progress bar, mastery exam, Learned | Replace the bar (with corrections to PR #622, §14); Adjust the exam's photo choice | P1 |
| 7 | Forgetting and comebacks | Adjust: a superseded FSRS parameter set mixed with SM-2; refit on our own log | P3 |
| 8 | Next genus, opening new genera | Keep the core; Adjust: four "struggling" signals where one would do | P3 |
| 9 | Photo memory and repetition | Keep | P3 |
| 10 | Custom quiz and Duels effects | Adjust (through 3 and 4): their 2-choice answers bias ability, photo ratings and confusions | P1 |
| 11 | Admin Analyses statistics | Adjust: PQL and the pairs cluster bootstrap with ~10 players (already flagged 2026-11-05, still open) | P2 |
| 12 | Learning simulator `tools/learnsim.js` | Adjust: its learner shares the app's own model; judge across learner worlds, calibrate on the real log | P1 |
| 13 | Progress proposal of PR #622 (domain score) | Adopt the meaning (domain score over the photo population); change the estimator before building | P1 |

**The five findings that matter most**

1. **The photo ratings and the player model disagree, and adaptive selection turns that into a bias** (§1). The sheet
   rates each photo against one global level per player (`Code.gs` `stats_`, `core.js` `eloReplay`: one `R[player]`,
   start −1, K 0.6/(1 + n/40)), while the app picks the photo from the player's *genus* ability. Hard photos go to
   players strong on that genus, who beat their global level; easy photos to players weak on it. Inference: hard photos
   rated easier, easy ones harder, the scale compressed. Elo ratings calibrated on the fly under adaptive selection are
   biased, more so as the target success moves away from 0.5 (ours: 0.75-0.85), and their variance inflates (Bolsinova,
   Gergely & Brinkhuis 2025 **[full text]**). Every module downstream reads these ratings.
2. **The per-format guess model is wrong where it is used most** (§3, §10). On the real answers, 2-choice quiz
   questions were right 87% of the time where the app expected 76% (n 653), Duel-tab duels 93% against 82%
   (LEARNING.md "One contrast queue"). Each such answer adds a positive surprise to the genus ability, the global
   level and the photo ratings, and counts a miss in full as a "mix-up" of its pair. A choice-set model (Luce /
   nominal response: Bock 1972; nested logit, Suh & Bolt 2010 **[abstract]**) is already the simulator's field
   learner; the estimator still uses g + (1 − g)σ with a hand-made `plausibleK`.
3. **One answer moves a new genus twice** (§2, checked). `eloStep` steps the genus, then the global level; at the next
   answer `levelMove` adds the level's move, which already contains the same answer. Run on `core.js`: a first right
   answer moves the genus by 0.30, then by 0.27 more through the level (0.57 in all). A hierarchical model splits one
   surprise between level and genus by their variances (a Kalman/Glicko update: Szczecinski & Tihon 2023
   **[abstract]**); it does not add both. The same change gives the standard errors the new progress bar needs.
4. **The PR #622 bar is the right quantity with a fragile estimator** (§14, checked). θ̃ = θ − z·SE rises after an
   early *miss* (the SE shrinks faster than the Elo step lowers θ: −2.00 → −1.91 at z 1, numbers below), the opposite of
   what a bar must do (Pelánek & Řihák 2018 **[secondary, via #622]**); θ_g is not "own evidence only" (it starts
   from `playerStart` and moves with `levelMove`), against Pierre's Q128; an Elo point has no valid SE; and the bar
   means a *typed* task while θ is measured on picks. Fix: the posterior expected domain score of each genus, from a
   fixed population prior and the player's own answers on the genus only (a grid posterior, as `core.js` `levelFit`
   already does), with a typed format offset.
5. **The simulator that tuned most constants shares the app's own response model** (§12). The item learner answers
   with σ(logit(know) − d), the app's form, on the app's own photo difficulties unless `--truth` is passed, and the
   tier-1 verdicts are read against it. Policies that win in one simulated learner can lose with real students; judge
   across several learner models and keep a rule only if it wins in all (Doroudi, Aleven & Brunskill 2017
   **[abstract]**). A, OPEN.K, INTRO.HOLD, TYPED, the comeback were set this way.

## 1. Photo difficulty

1. **What it does.** The sheet replays every trusted answer: photo difficulty = genus offset G + photo residual P, both
   stepped by the surprise against one level per player; photo memory offsets estimated in the same pass; the app
   blends a photo's rating with G (W 5) and serves it to targeting, the Elo steps, the miss weight, the exam, the
   opening order (`genusDiff`).
2. **Method.** Elo for items (Pelánek 2016), partial pooling by item family (Glas & van der Linden 2003). Sound
   family; the hierarchical step (v31) was measured on the real log and helped.
3. **State of the art.** Bolsinova, Gergely & Brinkhuis (2025, *BJMSP*, https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335/)
   **[full text]**: with on-the-fly calibration and adaptive selection, Elo ratings do not settle ("the variance of the
   ratings across persons increases over time") because "item selection depends on the current value of the errors";
   bias grows with K and as the target moves away from 0.5; fix: two parallel chains, or Urnings for unbiased ratings.
   The deeper issue here is model mismatch (finding 1), which no chain trick fixes. For a few thousand answers, a
   batch fit of a logistic model with good features is the robust choice (Gervet et al. 2020, *JEDM* 12(3),
   https://jedm.educationaldatamining.org/index.php/JEDM/article/view/451 **[abstract]**: logistic regression best on
   moderate data, BKT-style models behind, deep models only on large data). The admin's `analysis.js` already fits
   crossed player/genus/photo effects with a guess floor.
4. **Verdict: adjust, then replace.** Step 1 (small): in `stats_`/`eloReplay`, take each answer's logged genus ability
   `th` (already in the log) as the person term instead of the single `R[player]`, so photos are rated against the
   ability the selection used. Step 2 (medium): refit photo and genus difficulties in batch at each Analyses milestone
   (the Action exists), served by the sheet (rule L13), Elo kept only between refits for new photos. Check both on the
   real log (rule L12: next-answer log-loss, spread of ratings by tercile).
5. **Risk if left.** A compressed difficulty scale: "hard" photos are not hard, the exam and the hard tail of the new
   bar mean less than they say, and photo difficulty drifts as players change.

## 2. Player level (genus Elo, global level, volatility, answer time)

1. **What it does.** Per genus θ_g on the photo scale, K = 0.8/(1 + m/15) ≥ 0.25, times (1 + 2|vr|) with vr a moving
   average of the signed surprise; a global level (same step, no floor); `levelMove` carries the level's moves into
   each genus at 1/(1 + m/15); `playerStart` starts a new genus from the shrunk level; a right answer's step × a time
   weight clamp(1 − 1.5z, 0.5, 1.5); clamped to [−1.5, 3].
2. **Method.** Elo with an uncertainty function and global + concept skills (Pelánek 2016; Pelánek et al. 2017,
   **[secondary]**, via LEARNING.md and #622). "Volatility (Glicko-2)" is a misnomer: Glicko-2's volatility is a variance
   updated by its own likelihood step; here it is a trend detector that enlarges K.
3. **State of the art.** Rating with uncertainty is now a solved, cheap problem: Elo, Glicko and TrueSkill are all
   instances of an approximate Kalman filter with one mean and one variance per skill (Szczecinski & Tihon 2023,
   *J. Quant. Anal. Sports* 19(4), https://arxiv.org/abs/2104.14012 **[abstract]**). Urnings give exact standard errors
   (Hofman et al. 2020, in LEARNING.md). Response time: our rule only weighs right answers; the signed residual time
   rule of Math Garden scores fast misses too (Maris & van der Maas 2012, in LEARNING.md **[memory]**). Ours was
   chosen by leave-one-player-out on the real log, which is the right test.
4. **Verdict: adjust.** (a) Fix the double count: give `levelMove` only the level's moves from *other* genera, or move
   to (b). (b) Replace kmax/kmin/n/vr/vg by a simplified Kalman filter on θ_g = level + δ_g: a variance per skill, a
   process noise per answer (learning), the update split by the variances. Fewer constants (rule L11), faster early
   convergence for strong players (simulated experts sit ~1.3 logits low after 300 questions, LEARNING.md via #622),
   and the SE the new bar needs. Keep the time weight. Cost: medium (core.js + its replay; RVS entry, rule D5).
5. **Risk if left.** New genera over-react (double step), strong players are under-rated early, and no consistent
   uncertainty exists for the bar or the exam.

## 3. Success target and difficulty control

1. **What it does.** Aims each question at a chance of 0.85 (global level ≤ 0.5) down to 0.75 (≥ 1.5), through the
   format (traps, single views, typed) and then the photo (`aimOff(k)`), easier while the opening hold runs.
2. **Method.** Difficulty targeting in adaptive practice (Papoušek, Pelánek & Stanislav 2014; Math Garden at 0.75,
   Klinkenberg et al. 2011).
3. **State of the art.** An error rate near 15% maximises learning speed for gradient-descent and perceptual-learning
   models of binary tasks (Wilson, Shenhav, Straccia & Cohen 2019, *Nat. Commun.* 10:4646,
   https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579 **[abstract]**); easier questions keep learners, harder ones teach
   more (Papoušek, Stanislav & Pelánek 2016, in LEARNING.md). Our 85 → 75% is inside this range. The weak link is that
   the target is a *model* probability: on 2-choice questions the model is off by ~11 points (finding 2), so their real
   success sits near 87-93%, not at the target.
4. **Verdict: keep the target, adjust the calibration.** Estimate each format's real guess rate and offset from the
   Analyses "Formats" model (it exists: P = c + (1 − c)σ(x + d)) and feed them back as data (served by the sheet), or
   move to the choice-set model of §4. Cost: small for the per-format offsets.
5. **Risk if left.** 2-choice questions are too easy and over-credited; every module that reads `e` inherits it.

## 4. Wrong answers (traps, look-alikes, pooled confusion)

1. **What it does.** Traps 0 → 3 with genus ability (`FORMAT`); pair confusion score = (mix-ups + 8 × prior) / (offers +
   8), prior from declared look-alikes, family, form; the player's own record shrunk to the pooled one; data look-alikes
   at 20 offers; `plausibleK` counts easy choices of other growth forms as implausible; `confTerm` adds the player's
   excess confusion in logits.
2. **Method.** Beta-binomial empirical Bayes for the rates (standard, sound); distractors from past confusions as in
   outlinemaps (Pelánek et al. 2017).
3. **State of the art.** Distractor plausibility drives item difficulty and should be analysed per option (Gierl,
   Bulut, Guo & Zhang 2017, *Rev. Educ. Res.* 87(6) **[abstract]**). Option-level IRT models the chosen option:
   nominal response (Bock 1972), nested logit (Suh & Bolt 2010, *Psychometrika* 75(3) **[abstract]**), option tracing
   (Ghosh et al. 2021, in LEARNING.md). A Luce choice over the offered set gives "harder with look-alikes, easier with 2
   choices" from one formula, with no `plausibleK` and no separate `confTerm`.
4. **Verdict: keep the shrinkage, adjust the rate.** The per-offer rate is not normalised: in a duel or an Again every
   miss lands on the one other genus, in a 4-choice question a miss splits over three, and a miss is likelier on a hard
   photo. Duels are drawn *because* a pair is confused, so this loops (inference). Count observed/expected per offer,
   expected = (1 − p) / (k − 1), as the Analyses "Confusions" model already does with log(wrong choices). Later (larger):
   one Luce model for the chance and the choice, which would also retire `plausibleK`, `confTerm` and the look factor of
   `pgRightW`.
5. **Risk if left.** Confusion scores inflated for duelled pairs, traps and "data look-alikes" partly self-made.

## 5. Typed questions and grading

1. **What it does.** Typed share 0 → 30 → 50% from 50 → 80 → 95% progress; 2 typed among the exam's 5; graded by
   optimal string alignment distance (1 edit up to 6 letters, 2 beyond), old names accepted, ties asked again; scored
   with no guess floor (k ∞) on the same θ.
2. **Method.** Retrieval practice (Roediger & Karpicke 2006); fuzzy matching (Damerau-Levenshtein family).
3. **State of the art.** Testing beats restudy (Rowland 2014, *Psych. Bull.* 140(6), g ≈ 0.50 **[abstract and
   secondary]**), so typed questions are well founded. But recall and recognition are different tasks, not the same task
   minus guessing: in IRT a format is a facet with its own difficulty (LLTM; the Analyses "Formats" model). Grading:
   checked on the 66 names the app accepts, the closest pairs are Acropora/Anacropora and Goniastrea/Montastrea (2
   edits), then many at 3; ties are asked again, so the risk is a typo nearer another genus (rare; measurable on `|t`).
4. **Verdict: keep the grading and the ramp; adjust the model.** Add a typed offset δ_t estimated from the `|t` answers
   (served by the sheet), used in the expectation, the photo aim and the bar (§14). Cost: small.
5. **Risk if left.** Typed questions aimed too hard or too easy, and a typed miss weighed on a wrong expectation.

## 6. Progress bar, mastery exam, Learned

1. **What it does.** Bar = 95% × min(1, s.pg/0.8), s.pg an EMA (A 0.15) of answers weighed by choices, look-alikes,
   photo memory and (misses) the chance the player had; then 5 exam questions, ≥ 8 answers apart, the hardest unseen
   photo of a view, 2 typed, any miss restarts; Learned survives one miss.
2. **Method.** EMA mastery criterion (Pelánek & Řihák 2017, 2018 **[secondary, via #622]**); the exam is an
   N-consecutive-correct rule (N-CCR).
3. **State of the art.** The EMA "completely ignores item information" (Pelánek & Řihák 2018), and under targeting at
   ~80% it settles near the target whatever the ability: it measures time held at target. N-CCR and BKT are vulnerable to
   misspecification and treat learners unequally (Doroudi & Brunskill 2019, LAK, doi 10.1145/3303772.3303838
   **[abstract]**). Pass chances (checked): a player right 90% of the time on exam questions passes 5 in a row 59% of
   the time, at 80% 33%. The exam's photo is the *maximum* difficulty among unseen photos: an extreme value that grows
   with a genus's pool size (genera hold very different numbers of photos) and favours photos whose few answers were
   misses (inference). That contradicts Pierre's Q127 rule that adding photos must not move the target.
4. **Verdict: replace the bar (§14); adjust the exam.** Exam photos at a fixed quantile of the genus's difficulty
   distribution (e.g. G + 1 τ_g, the hard tail #622 defines), not the max of the pool; L9's "all right" stays Pierre's.
   Cost: small for the exam.
5. **Risk if left.** Learned is harder on photo-rich genera and partly a lottery on noisy ratings.

## 7. Forgetting and comebacks

1. **What it does.** Recall R = (1 + 19/81 · t/S)^−0.5; S log-linear between 0.4 and 15.7 days in the genus's chance,
   × 2.5 per extra day answered right; rust and a CUSUM end the comeback.
2. **Method.** FSRS curve and first stabilities (LEARNING.md cites FSRS-4.5/5), SM-2's ease factor 2.5 (1990).
3. **State of the art.** FSRS-6 makes the decay a trained parameter (default 0.1542, factor 0.9^(1/−d) − 1) with new
   first stabilities 0.212 / 1.293 / 2.307 / 8.296 days (py-fsrs `scheduler.py`,
   https://github.com/open-spaced-repetition/py-fsrs **[full text, code]**); stability grows at a review by a factor that
   depends on difficulty, stability and recall, larger when recall was low (https://expertium.github.io/Algorithm.html
   **[full text]**). Our set is FSRS-5's stabilities with the older −0.5 curve, plus a constant SM-2 multiplier, a
   mix no FSRS version uses. Checked: for a weak genus after 30 days, our curve says recall 0.23, FSRS-6 defaults 0.47;
   both were fitted on Anki flashcards, not on photo categories.
4. **Verdict: adjust.** Either take FSRS-6's defaults as one coherent set, or (better, cheap) fit the decay and a
   stability scale on our own log with the Analyses "Comeback" model (it estimates the forgetting slope). Until then
   label the comeback lengths as an unvalidated prior. Separate, Pierre's call: rule L1 lets a genus be Learned in one
   sitting, while spacing is among the most robust findings (Carpenter, Pan & Butler 2022, *Nat. Rev. Psychol.* 1
   **[abstract]**); an exam spread over two visits would test durable recognition, which ReefCloud labelling needs.
5. **Risk if left.** Low: comebacks only plan questions; month-long comebacks may be too long for weak genera.

## 8. Next genus and opening new genera

1. **What it does.** Draw weight 1 − x·m/(m + 15), last 4 held back; a genus opens with chance 1 − shaky/8, easiest and
   most common first, ≤ 3 per 15 answers, only after a right answer, not during the CUSUM hold (1.5), the 10-answer visit
   floor or a comeback.
2. **Method.** Interleaved practice with a work-in-progress limit and easy-first opening.
3. **State of the art.** Interleaving helps category learning, most for visual material (g 0.67) and similar categories
   (Brunmair & Richter 2019, *Psych. Bull.* 145(11) **[abstract]**; Kornell & Bjork 2008 **[secondary]**). Our mixing is
   in line.
4. **Verdict: keep the core; adjust.** "Struggling" is read four ways: `shaky` count, the CUSUM hold, `openRight`,
   the pace cap; plus the visit floor. One signal (the hold's CUSUM, already in success units) could gate opening, with
   the shaky count as the WIP limit. Simplify only with a tier-1/3 check. Cost: medium.
5. **Risk if left.** Hard to calibrate; the next real-log surprise will be patched with a fifth rule.

## 9. Photo memory and repetition

1. **What it does.** Four buckets (new, shown never right, right once, right twice+) with offsets estimated by Newton
   steps in the sheet's replay; repeats down-weighted in the draw; a right answer on a known photo counts only what
   memory does not explain.
2. **Method.** Item-specific memory as an offset; consistent with exemplar accounts of category learning.
3. **State of the art.** Learned from our own answers, one rule for sheet and app: good practice. Memory decays with lag
   (spacing literature); the buckets ignore it.
4. **Verdict: keep.** Later, a lag term (answers since last shown, not time, rule L1). Cost: small.
5. **Risk if left.** Small.

## 10. Custom quiz and Duels: effects on the engine

1. **What it does.** Their answers move progress (up to 95%), ability, global level, photo ratings and confusions as
   quiz answers; no exam in the custom quiz; duels and Agains are 2-choice contrasts scored with g = 0.5.
2. **Method.** Same as the quiz.
3. **State of the art.** See §3-§4: the 2-choice model is miscalibrated on our data; drilling a small set teaches
   contrasts within it only (interleaving literature; #622's Custom-8 over-claim +0.22 in the field learner).
4. **Verdict: adjust, through §3, §4 and §14.** No separate patch needed once formats are calibrated and the bar is the
   domain score.
5. **Risk if left.** A player who uses the Duel tab or many Agains is over-rated; photos shown in duels look easier.

## 11. Admin Analyses statistics

1. **What it does.** Crossed random effects (player, genus, photo), Gaussian and logistic with a guess floor, fitted by
   PQL-type alternating updates; Wald and a pairs cluster bootstrap; Holm on 13 primary effects, BH on the rest;
   Kaplan-Meier, discrete hazard, residual PCA, a mix-up tree.
2. **Method.** GLMMs (a sound choice), multiple-testing corrections (sound and well documented).
3. **State of the art.** "PQL yields biased parameter estimates if the standard deviations of the random effects are
   large, especially with binary data" (Bolker et al. 2009, *TREE* 24(3) **[full text]**; Laplace, adaptive quadrature or
   MCMC recommended). With ~10 players, the wild cluster bootstrap is the reliable choice (MacKinnon & Webb 2017,
   *J. Appl. Econometrics* 32(2) **[abstract]**; Cameron et al. 2008, in LEARNING.md). Both were already raised by the
   2026-11-05 statistics study (§6) and are still open.
4. **Verdict: adjust.** Cross-check each milestone's primary effects with a Laplace or Bayesian fit in the Action (R
   `lme4`/`brms` run there); wild cluster bootstrap-t; the interval coverage test the study proposed. Cost: medium.
5. **Risk if left.** Effects shrunk toward 0 and intervals of the wrong width; decisions read "Clear" or "Not enough
   data" for the wrong reason.

## 12. Learning simulator (`tools/learnsim.js`) and how its results are used

1. **What it does.** Drives the real app with simulated learners (item learner: σ(logit(know) − d), exponential gains,
   memory buckets set to match the app; field learner: Luce over the names held, pair skills learned by contrast) over
   four profiles × seeds; tier 1 decides changes with a stratified sign-flip test.
2. **Method.** Simulation-based evaluation of instructional policies; the statistics are sound.
3. **State of the art.** Simulators built on the estimator's own model favour that estimator; rank reversals between
   learner models are common, hence the Robust Evaluation Matrix (Doroudi, Aleven & Brunskill 2017, L@S
   **[abstract]**). Exemplar models fitted to natural categories (Nosofsky et al. 2018, via #622) are the obvious third
   world.
4. **Verdict: adjust.** (a) `--truth` by default, with photo difficulties drawn independently of the app's estimate
   (spread from the real log); (b) every tier-1 decision across item, field and an exemplar learner, worst case
   reported; (c) fit the learners' RATE, MISS and transfer to the real log's learning curves (Analyses "Learning curves")
   before using them for calibration; (d) a learner that can quit (boredom proxy). Cost: medium.
5. **Risk if left.** Constants tuned to a world that agrees with the app by construction.

## 13. Cross-module contradictions met

- Sheet player model (one level, start −1, K 0.6/(1 + n/40)) vs app (genus + level, start 0, K 0.8/(1 + m/15), floor,
  volatility): two person models rate the same photos (§1). Raised on 2026-11-02 as "make them one model"; still open.
- The simulator's field learner uses a Luce choice; the estimator uses a guess floor with `plausibleK` (§4, §12).
- Pierre's Q127 (adding photos must not move 100%) vs the exam's hardest-of-pool photo (§6).
- Pierre's Q128 (bar from own answers only) vs θ_g built from `playerStart` and `levelMove` (§14).
- FSRS-5 stabilities, the FSRS-4.5 curve and SM-2's ease in one formula (§7).
- `|t` answers scored as "recognition minus guessing" while the new bar is defined on the typed task (§5, §14).

## 14. The progress proposal (PR #622, branch `claude/progress-metric-research`)

**Agreed.** The meaning: the bar of a genus = the expected share of its photo *population* the player names right, the
IRT domain score (Bock, Thissen & Zimowski 1997) over random items (De Boeck 2008; family expected response, Sinharay et
al. 2003), all as cited there. It replaces "time at target", gives a probability that real answers can test, and stays
put when photos are added. Pair coverage as an exam-entry condition (Q129) keeps it one number. The yardstick change
(signed error against the true domain score, time-to-credit) and the three learner worlds are right.

**To change before building.**

1. **θ̃ = θ − z·SE is not monotone.** Checked with #622's formula (I0 = 0.25, a new genus at θ 0, photo d 0, 4
   choices, K 0.8): before any answer SE 2.00, θ̃ −2.00 (z 1); after one *miss*, θ −0.50, SE 1.41, θ̃ −1.91: the bar
   rises after a miss (z 1.645: −3.29 → −2.83). A bar must stall or fall after a miss (Pelánek & Řihák 2018). Use the
   **posterior expected domain score** instead: E over θ_g's posterior of E over d of σ(θ_g − d). With a logistic
   likelihood a miss always shifts the posterior down (monotone likelihood ratio), so the bar always falls after a miss
   and rises after a right answer, while caution comes from the prior.
2. **Own evidence only needs its own estimate.** The game's θ_g starts from the global level and moves with it; the
   bar should not reuse it. Prior = one fixed population prior for a genus never answered (not this player's level),
   likelihood = the player's answers on that genus, each with its photo's difficulty, format and memory offset.
   Computed on a grid (`levelFit` does this for the level already): cheap, exact, an honest SE.
3. **No valid SE comes from Elo.** Elo is not a likelihood estimate and its floor K keeps it moving; Fisher information
   at the Elo point is not its standard error. Point 2 solves this; §2(b) would give the game the same property.
4. **Recall vs recognition.** "Named right, alone, without choices" is the typed task; most evidence is picks scored
   with a fixed guess floor that the real log contradicts (finding 2). The likelihood needs the per-format offsets of
   §3 and §5; otherwise the bar inherits their bias.
5. **μ_g and τ_g come from the biased photo ratings** (§1): fix §1 step 1 first, or the bar's hard tail is compressed.
6. **The exam must use the same population** (§6): exam photos at a quantile of N(μ_g, τ_g²), not the pool's max.

## 15. What I checked, and limits

Checked: the double count (a run of `core.js` `eloStep`/`abilityOf`); the FSRS curves (FSRS-5 vs FSRS-6 defaults); the
#622 bar after a miss; exam pass chances; edit distances between the 66 accepted names (`typeDist`). Read in code: the
sheet's single player level, the confusion counting of 2-choice answers, the exam's photo choice. Not done: no replay of
the real log (I had no export); the photo-rating bias (§1) and the confusion inflation (§4) are inferences to measure
with `tools/abilityeval.js` and the Analyses (rule L12). Full texts read: Bolsinova et al. 2025, Bolker et al. 2009,
py-fsrs code, the FSRS explainer, the #622 note; the rest from abstracts or summaries as marked.

## 16. Compared with earlier reviews (read after forming the above)

The 2026-11-02 algorithm review already asked to make the client's and the server's player models one (my §1 adds the
selection bias that the split causes). The 2026-11-05 statistics study already flagged PQL bias and the wild cluster
bootstrap (my §11 agrees; still open). The #622 note reached the domain score independently of me; my §14 keeps its
meaning and changes its estimator. The double count (§2), the 2-choice miscalibration as a cross-module bias (§3, §4,
§10), the FSRS version mix (§7) and the exam's extreme-value photo (§6) are not in those documents.

## Choices for Pierre (the integrator numbers them)

1. Rate photos against the player's genus ability (§1, step 1), measured on the real log first? Recommended: yes.
2. Fix the double count now (§2a), and plan the Kalman/Glicko variance (§2b) with the new bar? Recommended: yes, both.
3. Feed per-format guess rates and offsets (2-choice, typed) from the Analyses into the app (§3, §5)? Recommended: yes.
4. Build #622's bar as the posterior expected domain score on own answers (§14 points 1-4)? Recommended: yes.
5. Exam photos at a fixed hard quantile instead of the hardest of the pool (§6)? Recommended: yes.
6. Learnsim: three learner worlds and `--truth` by default before any further tuning (§12)? Recommended: yes.
7. Comeback: refit the forgetting curve on our own log, or at least FSRS-6 as one set (§7)? Recommended: refit, P3.
8. Rule L1 and an exam spread over two visits (§7)? Your call; noted for the science, not recommended now.

## References

Marks as in the text. Bock, Thissen & Zimowski 1997; De Boeck 2008; Sinharay, Johnson & Williamson 2003; Nosofsky et
al. 2018: as cited in the #622 note **[secondary]**. Bock 1972; Glas & van der Linden 2003; Pelánek 2016; Pelánek et al.
2017; Pelánek & Řihák 2017/2018; Papoušek et al. 2014/2016; Klinkenberg et al. 2011; Hofman et al. 2020; Maris & van der
Maas 2012; Roediger & Karpicke 2006; Ghosh et al. 2021; Cameron et al. 2008: in `docs/LEARNING.md` references.

- Bolker, B. M. et al. (2009). Generalized linear mixed models: a practical guide for ecology and evolution. *TREE* 24(3),
  127-135. https://pages.stat.wisc.edu/~larget/Stat998/Fall2015/Bolker-et-al-2009-TREE.pdf **[full text]**
- Bolsinova, M., Gergely, B., Brinkhuis, M. (2025). Keeping Elo alive. *BJMSP*.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335/ **[full text]**
- Brunmair, M., Richter, T. (2019). Similarity matters: a meta-analysis of interleaved learning and its moderators.
  *Psych. Bull.* 145(11), 1029-1052. https://pubmed.ncbi.nlm.nih.gov/31556629/ **[abstract]**
- Carpenter, S. K., Pan, S. C., Butler, A. C. (2022). The science of effective learning with spacing and retrieval
  practice. *Nat. Rev. Psychol.* 1, 496-511. https://www.nature.com/articles/s44159-022-00089-1 **[abstract]**
- Doroudi, S., Aleven, V., Brunskill, E. (2017). Robust Evaluation Matrix. *L@S 2017*, 3-12. doi 10.1145/3051457.3051463
  **[abstract]**
- Doroudi, S., Brunskill, E. (2019). Fairer but not fair enough: on the equitability of knowledge tracing. *LAK 2019*.
  https://cs.stanford.edu/~ebrun/papers/LAK2019_fairness.pdf **[abstract]**
- FSRS-6: open-spaced-repetition py-fsrs, `fsrs/scheduler.py` (default parameters, decay 0.1542).
  https://github.com/open-spaced-repetition/py-fsrs **[full text, code]**; Expertium, A technical explanation of FSRS.
  https://expertium.github.io/Algorithm.html **[full text]**
- Gervet, T., Koedinger, K., Schneider, J., Mitchell, T. (2020). When is deep learning the best approach to knowledge
  tracing? *JEDM* 12(3), 31-54. https://jedm.educationaldatamining.org/index.php/JEDM/article/view/451 **[abstract]**
- Gierl, M. J., Bulut, O., Guo, Q., Zhang, X. (2017). Developing, analyzing, and using distractors for multiple-choice
  tests in education: a comprehensive review. *Rev. Educ. Res.* 87(6), 1082-1116. doi 10.3102/0034654317726529
  **[abstract]**
- Kornell, N., Bjork, R. A. (2008). Learning concepts and categories: is spacing the "enemy of induction"? *Psych. Sci.*
  19, 585-592. https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Kornell_Bjork_2008_PsychScience.pdf
  **[secondary]**
- MacKinnon, J. G., Webb, M. D. (2017). Wild bootstrap inference for wildly different cluster sizes. *J. Appl.
  Econometrics* 32(2), 233-254. doi 10.1002/jae.2508 **[abstract]**
- Rowland, C. A. (2014). The effect of testing versus restudy on retention: a meta-analytic review of the testing
  effect. *Psych. Bull.* 140(6), 1432-1463. https://pubmed.ncbi.nlm.nih.gov/25150680/ **[abstract, secondary]**
- Suh, Y., Bolt, D. M. (2010). Nested logit models for multiple-choice item response data. *Psychometrika* 75(3),
  454-473. **[abstract]**
- Szczecinski, L., Tihon, R. (2023). Simplified Kalman filter for online rating: one-fits-all approach. *J. Quant. Anal.
  Sports* 19(4), 295-315. https://arxiv.org/abs/2104.14012 **[abstract]**
- Wilson, R. C., Shenhav, A., Straccia, M., Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning.
  *Nat. Commun.* 10, 4646. https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579 **[abstract]**
