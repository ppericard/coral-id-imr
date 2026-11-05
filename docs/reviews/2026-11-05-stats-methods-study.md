# Statistical methods for judging changes to IMR Reef ID's learning model

Study for Pierre, 2026-11-05. Read-only: nothing in the repository was changed. Written from the profile of a
biostatistician who has worked on adaptive learning systems (Elo / IRT, item difficulty, tutoring A/B tests).

**What I checked.** In the repository: `AGENTS.md` rules 14f (tiers 0-3) and 14g, `docs/LEARNING.md` (headings, "Research
we rely on", "Multifactor analyses", "Simulation", "Learning-outcome simulation", the response-time tables),
`tools/learnsim.js` (header, measures, mean ± sd summary), `tools/realcheck.js` (whole), `tools/abilityeval.js` (header,
`paired()`), `analysis.js` (header, `verdictOf`, `eff`, `sdEff`, bootstrap settings), `tools/analyses.js` (whole) and the
"Clear results" counters in `admin-analyses.js`. There is no `docs/rules/` folder. Literature: the references marked
**[checked]** were checked by web search this session (title, venue, year, the main claim from the abstract or a summary).
Those marked **[from memory]** are standard references I know well but did not re-open. Numbers in §3 and §5 were
computed this session with `scipy` (exact t and noncentral t, plus a 3,000-replicate Monte Carlo for Wilcoxon power).
Anything I infer without a source is marked **(my judgement)**.

---

## 0. The short version

1. The "mean larger than its SD" rule, applied to paired differences over 5 seeds, works out to a paired t of at least
   √5 ≈ 2.24 on 4 degrees of freedom. **Under no effect at all, a cell passes it 8.9% of the time.** Over 24 cells
   (4 profiles × 6 measures) about 2 cells pass by chance, and if the cells were independent the chance that at least one
   passes would be 89%. The cells are correlated, so the real figure is lower, but it is still far from 5%. If the rule
   was instead applied to the two arms' own SDs (unpaired), the per-cell false-positive rate is 15%.
2. **With 5 seeds, no rank or permutation test can reach p < 0.05 two-sided.** The exact sign-flip test and the Wilcoxon
   signed-rank test both have a minimum two-sided p of 2/32 = 0.0625. The paired t-test can get below 0.05, but only by
   leaning on normality. With a Bonferroni or Holm correction over 24 cells, the smallest p would have to be below
   0.0021, which takes a paired t of 7.1: a mean difference larger than 3.2 SDs of the differences. **Five seeds
   detect large effects, guard against breakage, and cannot support "small improvement" claims.** That is not a flaw.
   It is what tier 1 is for, and it matches Pierre's own scale (5 seeds for big changes, 30-40 for calibration).
3. Valid and simple: **declare one primary measure (and its direction) before running, judge the other measures as
   guardrails with a non-inferiority margin, and only ever claim a benefit on the primary.** With 5 seeds, the primary
   can be pooled over the four profiles with a stratified sign-flip permutation test: 20 paired (profile, seed) units
   give 2²⁰ sign patterns, so p can go far below 0.05 without assuming normality.
4. The real-log replay (`tools/abilityeval.js`) computes the standard error of the paired log-loss difference **as if
   answers were independent**. They are clustered within players: about 10 players with about 150 answers each. Even a
   tiny within-player correlation (ρ = 0.01) multiplies the variance by 1 + (m − 1)ρ ≈ 2.5, so the intervals are about
   1.6 times too narrow **(my estimate; ρ unknown)**. Fix: player-level differences, then a sign-flip test over players or
   a t on players − 1 degrees of freedom.
5. The admin's Analyses produce about 30-45 effects per milestone, each with a 95% interval and a "Clear" verdict, at
   every 1,000 answers. The page also counts "Clear results" and flags "new: Clear since the previous milestone". That
   is **multiplicity plus repeated looks (peeking)**: some "Clear" verdicts are expected by chance, and the "new" badge
   rewards exactly the fluctuation that peeking exploits. The models themselves (crossed random effects, explanatory
   IRT with a guess floor, cluster bootstrap) are the right family. What is missing is a confirmatory/exploratory split,
   a correction within the confirmatory family, more bootstrap draws, and a rule for the milestones.
6. §6 (added at the coordinator's request) covers multifactor designs and models in depth, with tools available in
   Python and a concrete recipe for the two cases: profile × parameter × seed in `learnsim`, and player × photo × time on
   the real log. §7 is the checklist for a PR.

**A point for Pierre to decide (my judgement):** rule 14f still says "no p-values wanted" (Pierre, 2026-11-03), while
his request of 2026-11-05 asks for valid tests with multiple-testing corrections. The recommendations below report
**intervals and verdicts in plain words**, with adjusted p-values only in a details column, which fits both. Changing
the wording of rule 14f is still his call.

---

## 1. How adaptive learning and quiz systems are evaluated

### 1.1 Outcomes

| Outcome | What it measures | Used by | Notes for us |
| --- | --- | --- | --- |
| **Next-answer prediction**: log-loss, RMSE (Brier), AUC, calibration | How well the learner model's probability matches the next answer | Knowledge tracing and Elo literature; Pelánek's systems; KDD Cup 2010 | Pelánek (2015) recommends RMSE or log-likelihood over AUC and says not to use MAE; AUC ignores calibration, which is exactly what a target-success controller needs. **[checked]** Our `realcheck.js` and `abilityeval.js` use log-loss, Brier and calibration by format and level band: the right choice. |
| **Learning gain**: post-test minus pre-test, retention after a delay | What the learner actually knows | Tutoring RCTs (ASSISTments, ALEKS evaluations, Cognitive Tutor) | Needs an outside test. Our simulation's `knowSlate` and `ref ≥ 0.9` play this role for synthetic learners only. |
| **Retention / forgetting**: recall after a lag | Memory durability | Duolingo half-life regression (Settles & Meeder 2016: MAE, AUC and correlation of half-life offline, plus live user experiments) **[checked: offline metrics; the live experiments are in the paper, not re-read]** | Our comeback analysis and the learner's FSRS curve. |
| **Engagement / attrition**: answers per session, return rate, session length | Whether learners keep playing | Papoušek & Pelánek (AIED 2015): how question difficulty and target success affect willingness to continue, in a geography practice system **[checked: abstract]** | Our "Sessions" analysis (Kaplan-Meier, discrete hazard). The simulation cannot measure this: its learner never quits (LEARNING.md says so). |
| **Mastery decision quality**: true knowledge when mastery is declared, answers to mastery | Whether "learned" means learned | Pelánek & Řihák (UMAP 2017, mastery criteria) **[from memory]** | Our `ref at entry` and `ref when learned`. |

### 1.2 Designs

- **A/B tests on real users** (randomised by learner): the gold standard for policy changes such as which question
  comes next, target success or opening pace. Pelánek's group ran many on their geography system. ASSISTments has an
  open platform for it (E-TRIALS; Heffernan & Heffernan 2014 **[from memory]**). Kohavi, Tang & Xu (2020, *Trustworthy
  Online Controlled Experiments*) is the practitioner's reference **[from memory]**. With ~10 players, a real A/B test
  has power for nothing but huge effects. **This app cannot rely on real A/B tests for now (my judgement)**, so the
  simulation and the replay have to carry the load, each within its own limits.
- **Offline replay of the log**: valid for **prediction models** (a different ability estimate scored on the same
  answers), not for **policies** (a different draw would have asked other questions). The two biases to know:
  - **Adaptive data collection bias.** The questions in the log were chosen by the current model. Pelánek, Řihák &
    Papoušek (LAK 2016) show that mastery attrition and adaptive item choice change how student models should be
    evaluated and read: a model shapes the data it is later evaluated on **[checked]**. Pelánek (UMUAI 2018, "The details
    matter") shows that data collection, the train/test split and the way metrics are averaged (per answer, per student,
    per item) can change which model wins **[checked: abstract]**.
  - **Policy replay needs randomisation.** The replay estimator for bandit policies (Li, Chu, Langford & Wang, WSDM 2011)
    is unbiased only because the logging policy chose at random: it keeps the logged events where the new policy would
    have made the same choice **[checked]**. Our draw is not uniformly random, and its probabilities are not logged, so
    inverse-propensity evaluation of a new draw is not available. `realcheck.js` already says "the draw and the
    opening cannot be replayed": correct.
- **Simulation with synthetic learners**: cheap, controllable, reproducible. The usual warning is that results depend on
  the simulated student model. Doroudi, Aleven & Brunskill (L@S 2017, "Robust Evaluation Matrix") show that offline
  evaluation can overestimate new teaching policies, and propose evaluating each policy under **several** student
  models, to see when a policy only wins under the model it was designed with **[checked]**. Their review (IJAIED 2019,
  "Where's the reward?") finds RL policies work best when constrained by learning-science theory **[checked: abstract]**.
  For us this means: **the four profiles are already a small robustness matrix; a change that wins only under one
  learner assumption (for example `--mem 0` vs the default photo memory) should be reported as fragile (my
  judgement).**

### 1.3 Tests and models for the effect of a variable

- **Paired designs** (the same seeds, the same answers) remove between-unit noise. Paired t-test, Wilcoxon signed-rank,
  exact sign-flip permutation, paired bootstrap.
- **Mixed-effects models / GLMMs** with crossed random effects for learners and items: the standard for answer-level data.
  This is explanatory IRT (De Boeck & Wilson 2004; De Boeck et al. 2011, IRT with `lme4`, *J. Stat. Softw.* 39(12))
  **[from memory]**, and the crossed-subjects-and-items analysis of Baayen, Davidson & Bates (2008) **[from memory]**.
  `analysis.js` implements this family (PQL, guess floor).
- **Cluster bootstrap / cluster-robust errors** when the unit of independence is the learner. With few clusters (≈ 5-30),
  ordinary cluster-robust tests over-reject; Cameron, Gelbach & Miller (2008, *Rev. Econ. Stat.* 90(3)) cut 10%
  rejection to the nominal 5% with a wild cluster bootstrap-t **[checked]**.
- **Seeds as replicates** (the ML and RL literature, the closest analogue of our `learnsim`): Colas, Sigaud & Oudeyer
  (2018, "How many random seeds?") give power analyses for the t-test and bootstrap tests, and recall that the deep RL
  papers Henderson et al. reviewed all used 5 seeds or fewer **[checked]**. Agarwal et al. (NeurIPS 2021, "Statistical
  precipice") recommend interval estimates via stratified bootstrap over tasks when runs are few (3-10) **[checked]**.
  Morris, White & Crowther (2019, *Stat. Med.* 38:2074) require the Monte Carlo standard error of every simulated
  quantity; 93 of 100 simulation papers they reviewed omitted it **[checked]**.

### 1.4 What the literature warns about

| Pitfall | What happens | Where it bites here |
| --- | --- | --- |
| **Multiple comparisons** | Among many cells, some cross any threshold by chance | The PR in question (24-30 cells); the admin's 30-45 effects per milestone |
| **Peeking / optional stopping** | Re-testing as data accumulate and stopping at the first success inflates the type I error. Johari, Pekelis & Walsh (KDD 2017; arXiv 1512.04922) give always-valid p-values (mSPRT), deployed at Optimizely **[checked]** | Milestones every 1,000 answers; re-running `learnsim` "with a few more seeds" until a difference shows |
| **Regression to the mean / winner's curse** | The best of many settings, or the most extreme photos, look better (or worse) than they are | Picking the best `OPEN.K` from a sweep; "photos furthest from what their features predict" |
| **Pseudo-replication** (Hurlbert 1984 **[from memory]**) | Treating answers within a run, or within a player, as independent replicates | Per-answer SE in `abilityeval.js`; any test that pools simulated answers instead of runs |
| **Replay bias** | The log reflects the policy that generated it | Replays cannot judge a new draw or opening rule (rule 14g already says so) |
| **Simulation validity** | Results are conditional on the synthetic learner | The learner is "a few round numbers, not fitted" (LEARNING.md, "Limits") |
| **Forking paths** (Gelman & Loken) **[from memory]** | Choosing the measure, checkpoint or subset after seeing the data | Choosing which of 6 measures × 4 checkpoints to headline |

---

## 2. Multiple-testing corrections in practice

**Families.** A correction applies to a *family*: the set of tests whose combined error rate you want to control. Define
the family before looking: "the primary measure in the four profiles" is a family of 4; "everything in the table" is a
family of 24-30.

| Method | Controls | Valid when | Power | Use it for |
| --- | --- | --- | --- | --- |
| **Bonferroni**: reject if p < α/m | FWER (any false claim) | Any dependence | Lowest | Quick bound; very small families |
| **Holm (1979)**: sort p ascending, compare p₍ᵢ₎ with α/(m − i + 1), stop at the first failure | FWER | Any dependence | Always ≥ Bonferroni | **Default for confirmatory families** (primary measure × profiles; confirmatory effects in the admin) |
| **Hochberg (1988)**: step-up, same thresholds as Holm | FWER | Independence or positive dependence (Simes) | Slightly > Holm | When tests are positively correlated (measures of the same runs usually are). Holm is safer and nearly as good |
| **Benjamini-Hochberg (1995)**: largest i with p₍ᵢ₎ ≤ iq/m | FDR (expected share of false claims among claims) | Independence or positive dependence (PRDS) | Much higher with many tests | **Exploratory screens**: many effects, where a few false leads are acceptable and get re-tested |
| **Benjamini-Yekutieli (2001)** | FDR | Any dependence | Lower than BH | When dependence may be negative |
| **Fixed-sequence (hierarchical) testing** | FWER | Any | Full α at each step until the first failure | A pre-declared order: primary, then key secondary |
| **Dunnett** (many settings vs one control); **Tukey** (all pairs) | FWER | Within a model | Better than Holm for its structure | Parameter sweeps vs the current value |

Sources: Holm 1979, Hochberg 1988, Benjamini & Hochberg 1995, Benjamini & Yekutieli 2001 **[from memory]**. FDA final
guidance "Multiple Endpoints in Clinical Trials" (October 2022): a primary / secondary / exploratory hierarchy, with
Bonferroni, Holm, Hochberg, prospective alpha allocation and fixed-sequence testing as the named tools **[checked through
summaries; PDF at fda.gov/media/162416/download not opened]**. The counterpoint: Gelman, Hill & Yajima (2012, *J. Res.
Educ. Effectiveness* 5:189) argue that multilevel models with partial pooling handle the multiple comparisons problem
for families of similar effects, such as per-genus or per-photo effects, and give more efficient estimates **[checked]**.
Rothman (1990) argues against routine adjustment in exploratory epidemiology **[from memory]**.

**Which to use when (my synthesis):**

1. **Confirmatory claims** ("this change improves learning"): few, declared before the run, Holm (or fixed-sequence).
2. **Guardrails** ("no profile gets worse"): the error to fear is *missing* a harm, so **do not tighten α for safety
   checks**. Clinical trials usually leave safety outcomes unadjusted **[from memory]**. Use a non-inferiority margin
   and a lenient one-sided level (0.10), and treat any breach as "investigate", never "proven harmless".
3. **Exploratory screens** (the admin's many effects, sweeps): BH at q = 0.10, labelled exploratory, re-tested on fresh
   data (new seeds, later answers) before anyone acts on them.
4. **Families of exchangeable effects** (genera, photos, players): random effects with shrinkage, no per-item tests.
5. **Pre-registration:** for an internal project, a short "declared before running" block at the top of the PR, with a
   commit timestamp earlier than the results, is enough **(my judgement)**.

Tools: `scipy.stats.false_discovery_control` (BH, BY), `statsmodels.stats.multitest.multipletests`
(`bonferroni`, `holm`, `simes-hochberg`, `hommel`, `fdr_bh`, `fdr_by`) **[from memory: API names]**. Holm and BH are
also about ten lines of JavaScript each, so `learnsim.js` or a compare script needs no dependency.

---

## 3. Tier 1: routine simulation checks (5 seeds, four profiles, a few measures)

### 3.1 What 5 paired seeds can and cannot do (computed)

| Quantity | Value |
| --- | --- |
| False-positive rate of "\|mean diff\| > SD of the paired diffs" (t ≥ √5, df 4) | **0.089** per cell, two-sided |
| Same rule unpaired (\|mean A − mean B\| > SD of one arm, 5 + 5) | 0.153 per cell |
| Expected chance passes over 24 / 30 null cells | 2.1 / 2.7 |
| P(at least one) if the cells were independent: 6 / 24 / 30 cells | 0.43 / 0.89 / 0.94 |
| Minimum two-sided p, exact sign-flip or Wilcoxon, n = 5 | 0.0625 (n = 6: 0.031) |
| Paired t needed, df 4, at α 0.05 / Holm over 4 / over 6 / over 24 | 2.78 / 4.31 / 4.85 / 7.10 |
| … as mean ÷ SD of the paired diffs | 1.24 / 1.93 / 2.17 / 3.17 |
| Effect detectable with 80% power (paired t, two-sided α 0.05), in SDs of the paired diffs: n = 5 / 10 / 20 / 30 / 40 | 1.68 / 1.00 / 0.66 / 0.53 / 0.45 |
| Same at α 0.0125 (Holm over 4 profiles) | 2.48 / 1.28 / 0.81 / 0.64 / 0.55 |
| Same at α 0.0021 (24 cells) | 3.96 / 1.69 / 1.00 / 0.78 / 0.66 |
| Simulated power (normal diffs), t vs Wilcoxon, n = 6, effect 1 SD | 0.51 vs 0.36 |
| … n = 10 / 20, effect 1 SD | 0.80 vs 0.79 / 0.99 vs 0.98 |

What it says:

- **The paired t-test is the only test with a non-trivial chance of significance at n = 5, and it rests on normality,
  which 5 points cannot check.** Wilcoxon and permutation tests are robust but cannot reach 0.05 two-sided at n = 5.
  From n ≈ 10 the Wilcoxon test loses almost nothing against t on normal data and protects against outlier seeds.
- **Pooling over profiles fixes the power problem without dropping exactness**: a stratified sign-flip test on the 20
  (profile, seed) pairs (below) has a minimum p of 2/2²⁰.
- **Pairing works only as far as the seeds stay coupled (my judgement, from the code).** `learnsim.js` seeds the app's
  `Math.random` and a separate learner generator from the seed. Once a change alters which question is drawn, the two
  streams fall out of step and the pair is coupled only by the learner's starting state. Rule: report the correlation r
  between the before and after values over seeds. Var(diff) = 2σ²(1 − r), so r near 0 means the pairing bought nothing,
  and an unpaired comparison (Welch) is just as valid.

### 3.2 The recommended tier-1 procedure

**Declare before running** (in the PR description, committed or written before the results):

1. **One primary measure, its checkpoint, its direction**, chosen for what the change is meant to do. Example:
   `knowSlate` at 300 questions, higher is better. A change meant to improve estimates would declare
   |θ − logit(know)| at 300, lower is better.
2. **The family**: pooled over the four profiles (recommended at 5 seeds), or each profile separately with Holm over 4.
3. **Guardrails with a margin** (non-inferiority): for example, no profile may lose more than 0.02 of `knowSlate` or more
   than 2 genera met at 100 and 300; the beginner's genera met at 100 stays ≤ 16 (the CI test). Margins are Pierre's
   "smallest change that matters", in the measure's own units, and should be fixed once in LEARNING.md, not per PR.
4. **The claim the PR hopes to make**, in one sentence.

**Compute** (the same seeds 1-5 before and after; this can live in a small compare script reading two `--out` files):

- Per profile × measure: before mean, after mean, **paired mean difference with its 95% t interval**, the 5 individual
  differences (or their sign count, e.g. "4 of 5 up"), the before/after correlation r.
- **Primary test, pooled over profiles: stratified sign-flip permutation.** Standardise each profile's 5 differences by
  their profile's SD (or use ranks within profile) so the expert's near-zero spread does not dominate. Take T = the sum
  over the 20 (profile, seed) units, and compare T with all 2²⁰ ≈ 10⁶ sign patterns (or 100,000 random ones). Valid under
  the null of "the change does nothing in any run" because before/after labels are exchangeable within a pair. That is
  the randomisation logic of Fisher, with no normality assumption **(my recommendation; standard randomisation
  inference)**.
- **Then per-profile claims, only if the pooled primary is significant** (closed testing / gatekeeping): per-profile
  paired t (or sign-flip) with Holm over the 4 profiles.
- **Guardrails**: one-sided 90% interval for the paired difference (paired t). "Held" if its bound is inside the margin;
  "breached" if the mean crosses the margin; "unclear" otherwise, which means run tier 2 on that profile.
- **Monte Carlo standard error** of every mean shown: SD/√n (Morris et al. 2019).

**Report** (a table like the one already in LEARNING.md, one more column):

| Profile | Primary: knowSlate @300, before → after | Paired diff [95% CI] | Seeds up | Verdict |
| --- | --- | --- | --- | --- |
| beginner | 0.627 → 0.651 | +0.024 [−0.03, +0.08] | 4/5 | within the noise |
| … | | | | |
| **Pooled (stratified sign-flip)** | | | | p = … → "clear" / "no clear difference" |

Guardrail rows: "held / breached / unclear". Any other cell goes in an "exploratory, not corrected" block.

**Allowed wording:**

- Pooled primary significant → "Clear improvement in true knowledge at 300 questions over the four profiles
  (stratified permutation p = 0.003); by profile: beginner +0.024 [+0.01, +0.04] (Holm-adjusted p = 0.02) …".
- Not significant → "**No clear difference** on the primary measure: +0.006 [−0.010, +0.022]. Effects as large as 0.02
  are not ruled out." Not "a small improvement".
- A secondary cell that looks good → "Exploratory: the beginner's genera met at 100 rose by 1.2 ± 0.9 (one of 24 cells,
  not corrected; about 2 such cells are expected by chance). Needs tier 2 to say more."
- Guardrails → "No profile lost more than the margin (all lower bounds above −0.02)", or "Unclear for the strong RA:
  tier 2".

---

## 4. Tier 2: fine calibration (30-40 seeds, sweeps)

**When:** choosing a value (`OPEN.K`, `START.W`, an Elo K), or when tier 1 was "within the noise" on the primary measure.

**Design:**

- **Common random numbers**: every configuration runs the same seeds, so seed is a blocking factor. Simulation textbooks
  (Law, *Simulation Modeling and Analysis*; Kleijnen, *Design and Analysis of Simulation Experiments*, 2nd ed. 2015)
  treat this as the standard variance-reduction device for comparing configurations **[from memory]**.
- **Number of seeds from a pilot, not by habit**: n ≈ ((z₁₋α/2 + z₁₋β)·σ_d / δ)² + 2, with σ_d the SD of the paired
  differences from tier 1 and δ the smallest effect that matters. From the table above: to see δ = 0.5 σ_d with 80%
  power at α 0.05 needs about 34 seeds. With Holm over 4 profiles, about 46. Colas et al. (2018) give the same reasoning
  for seeds **[checked]**.
- **Sweeps**: 4-6 levels of the parameter including the current one, all profiles, the same seeds.
- **Holdout seeds against the winner's curse**: choose the value on seeds 1-30, then confirm "chosen vs current" with a
  single pre-declared test on fresh seeds 31-60. The value chosen on the same seeds is biased toward looking good
  **(standard advice; my wording)**.
- **Sequential seeds only with a rule**: "start with 20, add 20 if the interval still straddles the margin, stop at 40".
  The final test then uses a stricter level, for example O'Brien-Fleming-like 0.005 at the first look and 0.048 at the
  second **[from memory: group-sequential designs]**. Never "keep adding seeds until it is significant".

**Analysis:**

- **Comparing settings with the current one**: per profile, paired differences vs current, with Dunnett-type or Holm
  correction over the k − 1 settings. Report all settings with intervals, not only the best.
- **Choosing a continuous value**: fit the response curve (outcome ~ level + level², seed as a block) and read the
  optimum and its interval from the curve rather than picking the highest cell mean. A curve borrows strength across
  levels and damps the winner's curse (§6.2).
- **Equivalence (TOST)** when the goal is "no worse": two one-sided tests against ±margin. "Equivalent" needs the 90% CI
  inside the margin.
- **Report Monte Carlo SEs**, and the sensitivity of the winner to the learner assumptions: rerun the top two settings
  with `--mem 0` and `--truth`, a mini robustness matrix (Doroudi et al. 2017).

---

## 5. Tier 3: real-log replays and the admin's multifactor analyses

### 5.1 What a replay can and cannot conclude

**Can:** whether ability estimate A predicts the answers that were really given better than B (log-loss, Brier,
calibration by format and level band), *on the questions this policy asked*. That is what `abilityeval.js` does, and
it is the right primary metric. **Cannot:** whether a new draw, opening rule or difficulty target would teach better,
because different questions would have been asked (§1.2). It also cannot validate the photo difficulty without an
outside reference, since the logged `Expected` came from the current model (Pelánek et al. 2016). Rule 14g's "where a
replay cannot judge a change, say what was measured instead" is the right instinct. Make it explicit in every report.

### 5.2 Inference fixes for `abilityeval.js` (concrete)

- `paired()` computes `se = sd(d)/√n` over **answers**. Answers are nested in players (≈ 10) and correlated within
  players and over time. **Use the player as the unit:** per player, the mean log-loss difference d_p (weighted by
  answers, or unweighted to give each player one vote: declare which). Then either:
  - a **sign-flip permutation over players** (10 players: 2¹⁰ = 1,024 patterns, minimum p 0.002), or
  - a t-interval on players − 1 df, or a wild cluster bootstrap (Cameron, Gelbach & Miller 2008).
  Keep the per-answer figure as a secondary column, so the change is visible.
- **Families of variants and groups**: the table "paired log-loss difference against rule a" has several variants × ~8
  groups (k = 2, 3-4, typed, level bands, false alarm). Declare "all answers" as primary for the main variant. Treat the
  group rows as exploratory (BH at q = 0.10, or no test at all, just intervals).
- **Grids chosen by leave-one-player-out** (already in `abilityeval.js`): good practice that avoids optimistic bias.
  Keep it for any tuned value.

### 5.3 The admin's Analyses (`analysis.js`, `admin-analyses.js`)

**What is already right:** crossed random effects for player, genus and photo; a guess floor P = g + (1 − g)·σ(η) per
format; intervals marginal over the random effects, so between-player effects get the players' spread (Codex #441);
the cluster bootstrap over players, from 6 players, taking the wider of bootstrap and Wald; validation on synthetic logs
with known truth; a smallest effect of interest (SESOI) behind the "within the margin" verdict. That is a defensible
explanatory-IRT setup.

**What to change (in order of importance, my recommendations):**

1. **Split confirmatory from exploratory.** Each of the 8 analyses names at most 1-2 *confirmatory* effects, the
   questions Pierre actually asked: for example "does response time carry information beyond correctness", "the
   learning slope", "the forgetting slope". Only those can be "Clear", under **Holm over the confirmatory family of the
   whole report (≈ 10-15 effects)**. All other effects are shown with intervals and an exploratory label. If a verdict
   is wanted there, use BH at q = 0.10 and the word "Lead" instead of "Clear".
2. **Milestones are looks, not new studies.** Each milestone re-analyses a superset of the previous data, so a "Clear"
   that appears at milestone 3 and holds at 4 is not a replication. Options, simplest first: (a) make one milestone the
   **decision milestone** per question (say 5,000 answers or 15 players) and label earlier ones "interim, descriptive";
   (b) alpha-spending (Lan-DeMets O'Brien-Fleming boundaries) over the planned milestones; (c) always-valid intervals
   (Johari et al.). Remove or relabel the "new: Clear since the previous milestone" badge and the "Clear results N / M"
   trend chart, which turn chance fluctuations into apparent findings **(my judgement)**.
3. **Bootstrap draws**: 40 draws cannot place a 2.5% or 97.5% percentile reliably (that is the 1st and 39th order
   statistic). Use ≥ 999 for percentile intervals offline, or at least 200 with a bootstrap-t / BCa. With fewer than
   about 10-15 players, prefer the **wild cluster bootstrap** to the pairs bootstrap (Cameron et al. 2008). The "never
   narrower than Wald" rule is a good safety net; keep it.
4. **"Answers needed" assumes 1/√n shrinkage in answers**, but for player-level effects the interval shrinks with
   *players*, not answers. Say "players needed" for those (the docs already note it is rough).
5. **Lists of extreme items** (photos furthest from their features, players most different from pooled confusions):
   rank on the **shrunk** estimates (BLUPs) and show their intervals. Never call one "Clear" from its raw residual: top-k
   out of hundreds is regression to the mean by construction. Gelman et al. (2012) is the argument for shrinkage over
   per-item tests.
6. **PQL bias**: PQL under-estimates variance components and shrinks fixed effects toward 0 for binary data with few
   answers per cluster **[from memory: Breslow & Clayton; Bolker et al. 2009]**. The docs note the photo SDs come out low.
   For confirmatory effects, cross-check once offline with a Laplace or Bayesian fit (§6.4).

---

## 6. Multifactor analyses: valid methods, costs, tools and pitfalls

*(Added at the coordinator's request: several factors and their interactions at once, for profile × parameter × seed
in `learnsim`, and player × photo × time on the real log.)*

**Tools available here.** The repository has no Python dependencies today: `tools/*.py` use the standard library, one
workflow installs Pillow, and the analyses run in JavaScript (`analysis.js`, in the admin and the Action). `pip` works
through the proxy. I installed `scipy` 1.18.1 in this session's container to compute the numbers above (the container
only, not the repo). Versions on PyPI now: `statsmodels` 0.15.0, `SALib` 1.6.0, `pyDOE3` 1.6.2, `bambi` 0.21.0 (needs
PyMC), `pymer4` 0.9.2. **R is not installed** (`which R` finds nothing), so `pymer4`, which wraps R's `lme4`, will not
work without installing R. The gold-standard R packages (`lme4`, `glmmTMB`, `emmeans`, `multcomp`, `DHARMa`, `simr`) are
therefore not available unless R is installed. Whether apt can install R here, I did not test. Adding a Python
dependency to an offline tool is cheap. Making the admin depend on Python would not be, since the admin and Action run
JS. **Recommendation (my judgement): keep production analyses in JS, and use Python only for offline cross-checks and
tier-2 analyses, outside CI.** That commits later work, so it is a choice for Pierre.

### 6.1 Designs for simulation experiments (factors you control)

| Design | When to use | Cost (runs) | Python | Pitfalls |
| --- | --- | --- | --- | --- |
| **Full factorial** (all combinations of a few levels) | 2-3 factors, few levels; you need every interaction | product of levels × seeds (4 profiles × 5 values × 30 seeds = 600 runs ≈ 45 min at the documented 9 min per 120 runs) | `itertools.product`; `pyDOE3.fullfact` | Grows fast; spend runs on seeds rather than on extra levels |
| **Fractional factorial 2^(k−p)**, resolution V | 5-10 two-level factors, screening plus two-factor interactions | 16-64 configurations × seeds | `pyDOE3.fracfact` | Aliasing: resolution III confounds main effects with interactions. Use V if interactions matter |
| **Morris elementary-effects screening** | Many (10-30) continuous parameters; find which matter | r × (k + 1) configurations (r ≈ 10-20) | `SALib` (`morris`) | Qualitative ranking only; follow up with a proper design |
| **Latin hypercube / nearly orthogonal LH** plus a metamodel | Continuous ranges, non-linear responses | 10 × k configurations or more | `pyDOE3.lhs`, `scipy.stats.qmc.LatinHypercube` | Needs a metamodel (regression or Gaussian process) to interpret |
| **Response-surface (central composite / Box-Behnken)** | Locating an optimum of 2-3 continuous parameters | 2^k + 2k + centre points | `pyDOE3.ccdesign`, `bbdesign` | Assumes a smooth, roughly quadratic surface near the optimum |
| **Variance-based sensitivity (Sobol)** | How much of the output variance each parameter and interaction explains | N × (k + 2), N ≈ 500-1,000 | `SALib` (`sobol`) | Expensive; noisy outputs need many seeds per point |

References: Kleijnen (2015); Sanchez & Wan, "Work smarter, not harder" (WSC tutorials); Saltelli et al., *Global
Sensitivity Analysis: The Primer* (2008); Montgomery, *Design and Analysis of Experiments* **[all from memory]**.

**For us (my judgement):** the profile is a fixed, crossed factor with 4 levels. The seed is the replicate and block
(CRN). Parameters are the design factors. With 1-2 parameters, a full factorial over 4-5 levels × 4 profiles × 30 seeds
is affordable and the most transparent. With 3 or more, screen first (fractional factorial or Morris), then run a
response surface on the 1-2 that matter, as Kleijnen recommends.

### 6.2 Models for the analysis

**A. Run-level outcomes in a simulation (one number per run: `knowSlate` at 300, genera met, θ error):**

- **Model:** y ~ profile × f(parameter) + (1 | seed) + (1 | seed:profile). f is a factor (comparisons) or a polynomial
  (response surface). The seed random intercept captures CRN pairing across configurations; seed:profile allows
  profile-specific seed effects. In a balanced design this is a repeated-measures ANOVA, and the per-profile paired
  differences of §3-4 are its special case.
- **Seeds: random or fixed?** Seeds are exchangeable draws, so random is natural. With balance, fixed seed blocks give
  the same fixed-effect tests. Either is valid.
- **Heteroscedasticity is the main trap here.** The expert's spread is near 0 (`knowSlate` 0.95 ± 0.00) while the
  beginner's is 0.04-0.05. One pooled residual variance is wrong. Use per-profile models (then Holm across profiles), or
  a model with a residual variance per profile (`glmmTMB` dispersion formula in R; in Python, per-profile fits or
  weighted least squares). **Bounded measures** near 0 or 1 (proportions): analyse on the logit scale or check that
  residuals behave.
- **Python:** `statsmodels.formula.api.mixedlm("y ~ C(profile)*C(K)", data, groups="seed",
  vc_formula={"sp": "0 + C(profile)"})`, which fits seed plus seed:profile as variance components. Or, simpler and
  equally valid when balanced: `statsmodels` OLS with seed blocks per profile, or `AnovaRM` **[from memory: API]**.
- **Do not model individual simulated answers** to compare configurations: answers within a run are not replicates
  (pseudo-replication). The run is the unit.

**B. Answer-level binary outcomes (the real log; also simulated logs, for checking the estimators):**

- **GLMM with crossed random effects** (explanatory IRT / LLTM + random item): logit P(right) ~ fixed factors (format,
  log practice, days since, enlarged, photo features, and their interactions) + (1 + log practice | player) +
  (1 | genus) + (1 | photo). With a **guess floor** P = g + (1 − g)·σ(η), which standard GLMM software does not provide
  directly (`analysis.js` does it by hand).
- **Implementation options:**
  - `analysis.js` (PQL, custom guess floor): production, fast, approximate.
  - **Python `statsmodels` `BinomialBayesMixedGLM`**: crossed random intercepts (variational Bayes or MAP), **logit link
    only, no guess floor** **[from memory: API]**. Usable on typed answers (g = 0), or as a rough cross-check that
    accepts slope attenuation.
  - **PyMC** (or `bambi`, which sits on PyMC): any likelihood, including the guess floor and random slopes, full
    posterior intervals. Minutes to tens of minutes for a few thousand answers. A heavier install. **The best Python
    cross-check for the confirmatory effects (my judgement).**
  - **R** `lme4::glmer` with the `psyphy::mafc.logit(k)` link (m-alternative forced choice), `glmmTMB`: the reference
    tools, if R gets installed **[from memory]**.
- **Random-effects structure:** Barr et al. (2013, "keep it maximal") warn that omitting random slopes for an effect that
  varies across players inflates type I error. Matuschek et al. (2017) show that maximal models lose power, and
  recommend models supported by the data, chosen by likelihood-ratio or AIC **[both from memory]**. With ~10 players: a
  random slope for player only on the effects tested at player level (practice, response time). Expect singular fits;
  report them.
- **Small number of players:** the denominator degrees of freedom for player-level effects are about players − 1, not
  answers. Use Satterthwaite or Kenward-Roger (Luke 2017, *Behav. Res. Methods* **[from memory]**), or a parametric or
  wild cluster bootstrap.
- **Time:** ability changes within the log. Include practice (log answers on the genus), days since, session position,
  and a player-specific practice slope. Answers inside one session are serially correlated beyond the random effects.
  Cluster-level resampling (by player, or by player-session) protects the intervals.

### 6.3 Interactions, model comparison and multiplicity inside the model

- **Testing an interaction** (does the best `OPEN.K` depend on the profile? does the time effect depend on the format?):
  first one **omnibus** test of the whole interaction block. Likelihood-ratio test with ML fits for nested fixed effects
  (REML only when fixed effects are identical), or a joint Wald/F test. Only if it rejects, look at simple effects
  (the parameter's effect within each profile) with Holm or simultaneous intervals (Hothorn, Bretz & Westfall 2008,
  `multcomp` **[from memory]**). This is closed testing in practice: it controls the error over the interaction and its
  follow-ups.
- **Interactions need much more data than main effects**: Gelman's rule of thumb is about 16 times the sample for an
  interaction half the size of the main effect **[from memory: Gelman's blog, 2018]**. Do not read "Clear for the
  beginner, not for the RA" as an interaction. Test the difference directly (Gelman & Stern 2006, "The difference
  between 'significant' and 'not significant' is not itself statistically significant" **[from memory]**). The PR that
  prompted this study is this pattern exactly.
- **Model comparison:** for prediction (which ability estimate), held-out log-loss by leave-one-player-out, as
  `abilityeval.js` does. For explanation, LRT for nested models, AIC/BIC for non-nested ones (marginal AIC, with care
  for random effects near zero), or PSIS-LOO for Bayesian fits **[from memory]**.
- **Multiplicity within the model:** one omnibus test per block of terms; Holm over the confirmatory contrasts;
  shrinkage (random effects) instead of tests for families of genera, photos and players.

### 6.4 Assumption checks (and what to do when they fail)

| Model | Check | Python | If it fails |
| --- | --- | --- | --- |
| LMM, run-level | Residuals vs fitted per profile; QQ; variance by profile | `matplotlib`, `statsmodels` residuals | Per-profile models; transform (logit); robust or permutation inference |
| LMM, log response time (`analysis.js` model 1) | Residual skew; heavy tails (fast or abandoned answers) | Same | Trim or winsorise declared in advance; robust SE |
| GLMM, binary | **Simulated residuals** (DHARMa's idea: simulate from the fit, compare quantiles); calibration plot of predicted vs observed per decile; random-effect QQ | Hand-written (≈ 30 lines with `numpy`); ArviZ posterior-predictive checks for PyMC | Missing term (time, format interaction); a guess rate other than 1/k (`analysis.js` model 4 estimates it) |
| All | Convergence; singular fits (variance at 0); separation (every answer right) | Warnings from the fitter | Simplify random effects; weakly informative priors (Bayesian) |
| All | Recover known effects from synthetic data (already done: `ANALYSIS.synth`) | Existing tests | Extend to the *interval coverage*: do 95% intervals contain the truth 95% of the time over 200 synthetic logs? This is the real test of the bootstrap and PQL choices (Morris et al. 2019) |

### 6.5 Effect sizes with intervals

- Report in the measure's units first: "+0.024 of true knowledge [−0.01, +0.06]", "+1.3 genera met", "−4 points of
  success", "odds ratio 0.41 per unit of log time [0.31, 0.55]". Standardised effects (d, η²) only as a secondary column:
  Pierre thinks in measure units, and the SESOI is defined in them.
- For GLMMs: odds ratios, plus the effect on the probability scale at typical values (the admin's `plainOf` already does
  this). Variance shares (ICC, Nakagawa & Schielzeth 2013 R² for GLMMs **[from memory]**) to say how much is player,
  genus or photo.
- Always the **Monte Carlo SE** for simulated quantities.

### 6.6 Power and number of seeds or players

- Simulation: from a pilot, σ_d per profile and the SESOI, then the formula in §4. Or **simulation-based power**: rerun
  the planned analysis on bootstrap-resampled pilot runs with an effect added. That is what R's `simr` does; in Python
  it is a loop.
- Real log: power depends on **players** for player-level questions and on answers for item-level ones. With ~10
  players, player-level effects need to be large. The verdict "Not enough data yet" should say "players" when that is
  the binding constraint.

### 6.7 Recommended recipes

**Case A: `learnsim`, profile × parameter × seed (for example `OPEN.K` ∈ {6, 8, 10, 12, 14} × 4 profiles)**

1. **Declare:** the primary measure and checkpoint; the guardrails and their margins; the parameter grid including
   the current value; seeds 1-30 for selection and 31-60 for confirmation; the analysis below.
2. **Run** the full factorial on seeds 1-30 (CRN: the same seeds in every cell); 600 runs, about 45 minutes on 4 cores.
3. **Model per profile** (the variances differ too much to pool): y ~ C(K) + C(seed), or with K numeric
   y ~ K + K² + C(seed). Then a pooled model y ~ C(profile) × K + K² + (1 | seed) + (1 | seed:profile) with per-profile
   weights, used **only for the omnibus profile × K interaction test** (LRT, ML fits): "does the best K depend on the
   profile?".
4. **Contrasts:** each K vs the current value per profile, Dunnett or Holm within profile; the primary family is Holm
   over the profiles. Report the fitted curve with a 95% band, every cell's mean ± MCSE, and the interaction test.
5. **Choose** the value from the curve, guardrails held in every profile. If the interaction is clear and the best K
   differs by profile, say so, and do not add a per-profile rule (rule 14f: one dynamic algorithm). Instead, bring Pierre
   the trade-off.
6. **Confirm** "chosen vs current" on seeds 31-60: one paired test on the primary (pooled stratified sign-flip), plus
   guardrails. Report this confirmation as the result. The sweep is the exploration.
7. **Robustness:** rerun chosen and current under `--mem 0` and with `--truth` (a learner-model robustness matrix). A
   winner that flips under another learner assumption is reported as fragile.
8. **Tools:** Node for the runs; the analysis in Python (`statsmodels` 0.15.0, `scipy`) as a one-off script outside
   the repo, or a small JS compare tool for the paired and permutation parts, which need no library.

**Case B: the real log, player × photo × time**

1. **Declare** the confirmatory questions (1-2 per analysis, ≈ 10-15 in total) and the decision milestone. Everything
   else is exploratory.
2. **Production model:** keep `analysis.js` (crossed player / genus / photo effects, guess floor, PQL). Add time
   explicitly: log practice on the genus, days since the last answer on it, session position, and a random practice
   slope per player when there are 8 or more players.
3. **Inference:** for player-level effects, the wild cluster bootstrap over players (≥ 999 draws offline, or 200 in
   the Action), or t on players − 1 df. For item-level effects, the model intervals marginal over random effects, as now.
4. **Multiplicity:** Holm over the confirmatory family of the report; BH (q = 0.10) for exploratory effects, labelled
   "lead"; shrinkage and no tests for per-genus, per-photo and per-player lists.
5. **Peeking:** verdicts only at the decision milestone, or with alpha-spending over the planned milestones. Interim
   milestones are descriptive. Drop the "new Clear" badge.
6. **Assumptions:** calibration by decile and simulated residuals per analysis; once, an offline cross-check of the
   confirmatory effects with a PyMC fit (guess floor, random slopes) or R `glmer` + `mafc.logit` if R is installed.
7. **Coverage check:** extend the synthetic-log tests (`ANALYSIS.synth`) to measure the 95% interval coverage over ~200
   synthetic logs with 6, 10 and 20 players. That shows whether the bootstrap-or-Wald rule is honest at our player
   counts.
8. **Replays for estimator changes** (`abilityeval.js`): player-level paired log-loss with a sign-flip test over players
   as the primary result. Groups (format, level band) are exploratory. Say explicitly that policy changes (draw, opening)
   are not judged by the replay.

---

## 7. Checklist for a PR that changes the learning algorithm

**Before running (write it in the PR description first):**

- [ ] Tier: 1 (5 seeds), 2 (30-40 seeds, sweep) or 3 (real log), and why.
- [ ] **Primary measure**, checkpoint and direction (one), and its family: pooled over profiles, or per profile with Holm.
- [ ] **Guardrails** with their margins (from LEARNING.md, not invented per PR).
- [ ] Seeds (1-5; for tier 2: selection 1-30, confirmation 31-60); profiles; flags (`--stats`, `--truth`, `--mem`).
- [ ] For a replay: primary = all answers, player-level paired log-loss; what the replay cannot judge.
- [ ] The one-sentence claim you hope to make.

**Compute:**

- [ ] Paired differences per (profile, seed): mean, 95% CI, signs, before/after correlation r, MCSE.
- [ ] Primary: stratified sign-flip over (profile, seed) (tier 1), or the declared tier-2 test; then Holm over profiles
      if the pooled test passes.
- [ ] Guardrails: one-sided 90% bound against the margin, giving held / breached / unclear.
- [ ] Replays: per-player differences, sign-flip over players; the per-answer SE only as a secondary column.
- [ ] Everything else: listed as exploratory, with the number of cells looked at.

**Word the conclusion:**

- [ ] "Clear" only for the declared primary (adjusted). Otherwise "no clear difference; the interval does not rule out ±X".
- [ ] Never "small improvement" from one cell among many. Write "exploratory, uncorrected, 1 of N cells; about N × 0.09
      would pass the old rule by chance".
- [ ] Never "A is clear, B is not, so the effect differs": test the difference directly.
- [ ] State the learner-model dependence (simulation), or the replay's limit (policy changes), in one line.
- [ ] If the primary is within the noise and the change matters: say "tier 2 needed", and do not add seeds until it
      becomes significant.

---

## 8. References

Checked this session (web search: title, venue, year and main claim):

- Pelánek, R. (2015). Metrics for evaluation of student models. *J. Educational Data Mining* 7(2), 1-19.
  <https://jedm.educationaldatamining.org/index.php/JEDM/article/view/JEDM087> ·
  PDF <https://www.fi.muni.cz/~xpelanek/publications/metrics.pdf>
- Pelánek, R., Řihák, J., Papoušek, J. (2016). Impact of data collection on interpretation and evaluation of student
  models. *LAK 2016*, 40-47. <https://www.fi.muni.cz/~xpelanek/publications/lak16-data-collection.pdf>
- Pelánek, R. (2018). The details matter: methodological nuances in the evaluation of student models. *UMUAI* 28(3),
  207-235. <https://link.springer.com/article/10.1007/s11257-018-9204-y>
- Papoušek, J., Pelánek, R. (2015). Impact of adaptive educational system behaviour on student motivation. *AIED 2015*,
  348-357. <https://muni.cz/en/research/publications/1301073>
- Settles, B., Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*.
  <https://aclanthology.org/P16-1174/> · code <https://github.com/duolingo/halflife-regression>
- Doroudi, S., Aleven, V., Brunskill, E. (2017). Robust Evaluation Matrix: towards a more principled offline exploration
  of instructional policies. *L@S 2017*. <https://doi.org/10.1145/3051457.3051463>
- Doroudi, S., Aleven, V., Brunskill, E. (2019). Where's the reward? A review of reinforcement learning for
  instructional sequencing. *IJAIED* 29(4), 568-620. <https://doi.org/10.1007/s40593-019-00187-x>
- Li, L., Chu, W., Langford, J., Wang, X. (2011). Unbiased offline evaluation of contextual-bandit-based news article
  recommendation algorithms. *WSDM 2011*. <https://arxiv.org/abs/1003.5956>
- Johari, R., Pekelis, L., Walsh, D. (2017). Peeking at A/B tests / Always valid inference. *KDD 2017*;
  <https://arxiv.org/abs/1512.04922>
- Colas, C., Sigaud, O., Oudeyer, P.-Y. (2018). How many random seeds? Statistical power analysis in deep RL experiments.
  <https://arxiv.org/abs/1806.08295>
- Agarwal, R. et al. (2021). Deep reinforcement learning at the edge of the statistical precipice. *NeurIPS 2021*.
  <https://arxiv.org/abs/2108.13264>
- Morris, T. P., White, I. R., Crowther, M. J. (2019). Using simulation studies to evaluate statistical methods.
  *Statistics in Medicine* 38(11), 2074-2102. <https://arxiv.org/abs/1712.03198>
- Cameron, A. C., Gelbach, J. B., Miller, D. L. (2008). Bootstrap-based improvements for inference with clustered
  errors. *Rev. Econ. Stat.* 90(3), 414-427. <https://www.nber.org/papers/t0344>
- Gelman, A., Hill, J., Yajima, M. (2012). Why we (usually) don't have to worry about multiple comparisons. *J. Res.
  Educ. Effectiveness* 5(2), 189-211. <https://arxiv.org/abs/0907.2478>
- U.S. FDA (2022). Multiple Endpoints in Clinical Trials, final guidance.
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/multiple-endpoints-clinical-trials>
  (content checked through summaries only).

From memory (standard references, not re-opened this session): Holm (1979) *Scand. J. Stat.*; Hochberg (1988)
*Biometrika*; Benjamini & Hochberg (1995) *JRSS B*; Benjamini & Yekutieli (2001) *Ann. Stat.*; Rothman (1990)
*Epidemiology*; Bender & Lange (2001) *J. Clin. Epidemiol.*; Hurlbert (1984) *Ecol. Monogr.*; Baayen, Davidson & Bates
(2008) *J. Mem. Lang.*; Barr, Levy, Scheepers & Tily (2013) *J. Mem. Lang.*; Matuschek et al. (2017) *J. Mem. Lang.*; De
Boeck & Wilson (2004) *Explanatory Item Response Models*; De Boeck et al. (2011) *J. Stat. Softw.* 39(12); Bolker et al.
(2009) *Trends Ecol. Evol.* (GLMM practical guide); Luke (2017) *Behav. Res. Methods*; Hothorn, Bretz & Westfall (2008)
*Biometrical J.*; Nakagawa & Schielzeth (2013) *Methods Ecol. Evol.*; Gelman & Stern (2006) *Am. Stat.*; Kleijnen (2015)
*Design and Analysis of Simulation Experiments*; Saltelli et al. (2008) *Global Sensitivity Analysis: The Primer*; Law,
*Simulation Modeling and Analysis*; Kohavi, Tang & Xu (2020) *Trustworthy Online Controlled Experiments*; Heffernan &
Heffernan (2014) *IJAIED* (ASSISTments); Pelánek & Řihák (2017) UMAP (mastery criteria); Pelánek (2016) *Computers &
Education* (Elo in education); Lan & DeMets (1983) *Biometrika* (alpha-spending).
