# Q315: Should a photo's response time (and enlarging) count as evidence of its difficulty? A review of the literature and of practice

> **Literature review for Q315, copied into the repo on 2026-11-09.** Written the same morning as a read-only review
> (nothing in the app changed). **Pierre's decision, 2026-11-09 (Q315)**: option (2), a time intensity per photo in
> the prior part of `photoDiff`, fading as the photo's own answers come in; option (1) only as the declared comparison,
> never stacked with (2); two variants tested, the time intensity from all answers or from right answers only (both
> with rapid-guess cut-offs), the one that predicts better kept, declared before the test; option (3), enlarging, waits
> for data; the seconds stay logged. Validation: rule L11 level 2, the real-log replay the primary, players the unit,
> corals primary and fish exploratory. **Measured the same morning** (the declared replay): option (1) clear, (2) A
> and B not; Pierre then kept **option (1) as the candidate** (Q315, 2026-11-09), (2) kept for a re-test with more
> players. Where it stands: [ROADMAP](../ROADMAP.md) "Time in the photo rating";
> [LEARNING.md](../LEARNING.md) "Response time as information on difficulty". Each reference says how it was checked.

Written 2026-11-09 (Manila). Read-only review. Nothing in the repo was changed. Sources are listed at the end with links. Where I could
not check a detail against the full text, the report says so.

## 0. Short answer

- **Using time as evidence about item difficulty is well established.** It is not something we would be inventing.
  There are two families, and our options map onto them:
  - **(a) The time enters the score that updates the item.** This is Math Garden / Prowise Learn (Klinkenberg et al. 2011;
    Maris & van der Maas 2012; Vermeiren et al. 2025) and MatMat (Řihák 2015). An item has a **single** parameter, and
    the time-weighted score moves both the person and the item. Our option (1), and the H2 photo-step weight it builds
    on, belongs to this family.
  - **(b) Time intensity is a separate item parameter.** The hierarchical speed-accuracy model (van der Linden 2006, 2007;
    Klein Entink et al. 2009) keeps it apart from difficulty. The two are linked through their correlation across
    items, and the response times then serve as **"collateral information"** for estimating difficulty (van der Linden,
    Klein Entink & Fox 2010). Our option (2) is a simplified, empirical-Bayes version of this.
- **Is time intensity usually a separate item parameter? Yes**, in psychometrics. It is estimated net of person speed
  and linked to difficulty only through a correlation, never merged into it. Merging it is the exception. It appears
  only in Math Garden-type systems, where a time limit is shown and the learner sees time counting (coins). Pelánek
  (2016) says that rule suits only interfaces that show timing, and that systems measuring time silently, like ours,
  need a different rule.
- **Is it used for selection and expectation, or only for scoring?** Both. In testing, response times are used:
  - for item selection (van der Linden 2008; Fan et al. 2012, information per unit of time);
  - to control speededness in test assembly (van der Linden, Scrams & Schnipke 1999);
  - as collateral information for the item and person parameters (2010).

  In Math Garden, the time-informed difficulty δ drives the item draw (a target of 0.75 success).

- **Enlarging** works like on-demand hint use. That literature says it is informative, but also that it carries a
  personal propensity uncorrelated with ability (Bolsinova et al. 2022, Duolingo data). Measuring it "against the
  player's own habit", as we do, is the right direction. It should be its own item feature, not an extra Elo step.
- **Recommendation: (2) is the best-supported option**, in the collateral-information form described in §4. (1) is
  also precedented, but it competes with (2) for the same signal: test them as alternatives, never stack them. (3)
  waits for data. In every case, the player-side z must be taken net of the photo's time intensity once that exists,
  so that one slow photo is not counted twice.

## 1. What the repo does today (read 2026-11-09)

- `model.js` `photoDiff(n, p)` = (o[1]·o[0] + PDIFF.W·prior) / (o[1] + PDIFF.W), where:
  - prior = the genus offset `PGD[n][0]` (+ the judged-ease term for fish);
  - o = the sheet's photo Elo `PSTAT[p.f]` = [rating, weighted answers];
  - PDIFF.W = 5.

  So the prior fades as a photo's own answers accumulate.

- `core.js` `eloReplay` (and `Code.gs` `stats_`) work on every trusted answer. The residual d = ok − e moves the photo
  (step 0.8/(1+n/10)) and the genus offset (GENUS_K/(1+n/10)). **No time enters the photo or genus updates.**
- Player side: `rtWeight` scales a **right** answer's ability steps (global and genus) by clamp(1 − 1.5 z, 0.5, 1.5).
  Here z = log seconds minus the player's median over their earlier timed answers (`RTIME`, at least 10 timed answers;
  PR #431).
- Clock (`quiz.js` QCLOCK, using `performance.now()`):
  - it starts at the load event of the question's first photo, and restarts after a card closes;
  - it pauses while the app is hidden;
  - it is capped at 600 s;
  - time spent on an enlarged photo is included.
- LEARNING "Response time as information on difficulty" (2026-11-08):
  - H1: others' right-answer speed predicts success beyond the rating (Holm 0.003).
  - H2/H3: a time weight on the photo's own step is not significant.
  - A weight on the genus-offset step too: −1.56 × 10⁻³ (exploratory, BH 0.014).
  - Time intensity out of sample (corals): −6.1 × 10⁻³ (BH 0.094).
  - Correlation between time intensity and photo Elo: about +0.22 to +0.27.

## 2. What the literature and practice say

### 2.1 The hierarchical speed-accuracy framework (van der Linden; Klein Entink; Fox)

- **The lognormal response-time model** (van der Linden 2006, JEBS) is log T_ij = β_i − τ_j + ε, with:
  - person speed τ_j;
  - item **time intensity** β_i;
  - item time discrimination α_i.

  It is structured like the 2PL and fits skewed RT data far better than a normal model.

- **The hierarchical framework** (van der Linden 2007, Psychometrika) has:
  - separate first-level models for accuracy (IRT: θ_j, b_i) and for time (τ_j, β_i);
  - conditional independence given the parameters;
  - a second level that models the **joint distribution of the person parameters (θ, τ) and of the item parameters
    (b, β)**.

  So time intensity is a **separate item parameter**, and its link to difficulty is a correlation across items.
  Klein Entink, Fox & van der Linden (2009, Psychometrika) extend this to multilevel covariates.

- **Collateral information** (van der Linden, Klein Entink & Fox 2010, APM 34): through the second-level correlation,
  RTs improve the estimates of the IRT item parameters, and conversely. In this framework, "time says something about
  difficulty" means a prior for b_i given β_i, shrunk according to the item-level correlation. That is exactly what
  option (2) approximates.

  I did not read the full text; this summary rests on the abstract and on papers citing it. The gain is generally
  described as largest when accuracy data per item are sparse, which is our case: most photos have 1 to 5 answers.

- **Conceptual guidance** (van der Linden 2009, JEM 46): keep speed and ability, and time intensity and difficulty,
  conceptually distinct. Speed is a person trait chosen on a speed-accuracy trade-off, so raw times always need the
  person's speed removed.
- **Selection and assembly:**
  - van der Linden (2008, JEBS) uses RTs to improve ability estimation during adaptive item selection.
  - Fan, Wang, Chang & Douglas (2012, JEBS) select by Fisher information divided by expected time, which needs β_i
    and τ_j.
  - van der Linden, Scrams & Schnipke (1999, APM) use predicted times as constraints that control speededness.

  So time intensity is used for selection and expectation, not only for scoring, and always as its own parameter.

- **Conditional dependence** (Bolsinova, Tijmstra, Molenaar & De Boeck 2017, Frontiers): the conditional independence
  assumption often fails. The residual time of an answer predicts its accuracy beyond θ and b, and this has several
  possible sources (differences in strategy, fluctuating effort). This concerns the answer's own time. Our H1 uses
  **other players' times**, which is item-level evidence, the collateral-information channel.
- **The sign depends on the task** (Goldhammer et al. 2014, J. Educ. Psych., PIAAC):
  - routine tasks (reading): time on task is negatively related to success, more so for easy tasks and skilled people;
  - controlled problem solving: the relation is positive.

  Photo ID by trained players is mostly routine recognition, so "slow means harder" is the expected sign. A novice
  who checks the criteria deliberately could show the opposite, a person-level difference (see the pitfalls).

### 2.2 Elo-based learning systems that use time

- **Math Garden / Prowise Learn** (Klinkenberg, Straatemeier & van der Maas 2011; Maris & van der Maas 2012; Brinkhuis
  et al. 2018; Vermeiren, Kruis, Bolsinova, van der Maas & Hofman 2025). Full text of Vermeiren et al. read.
  - The original "high speed, high stakes" rule (Maris & van der Maas 2012) is S = (2x − 1)(d − t), with time limit
    d = 20 s.
  - The expected score E(S | θ − δ) follows from a model in which ΣS is sufficient for both θ and δ. **One item
    parameter δ governs both accuracy and time; there is no separate time intensity.**
  - Elo-style: the same residual S − E(S) updates the person and the item, so time moves item ratings directly.
  - Learners see the stakes: remaining coins, and a 20 s bar.
  - Vermeiren et al. 2025 report these changes and lessons:
    - (i) since 2019, a fixed-penalty rule (a wrong answer scores −ρ, ρ ≈ 0.1, whatever its time). They made it after
      teachers' feedback about motivation, and it also fits wrong-answer RTs better.
    - (ii) **paired item updates** to stop item ratings from drifting down as learners improve.
    - (iii) an adaptive K-factor.
    - They note that a single general scoring rule "views learners as a homogeneous group".
  - Item selection targets P(correct) of about 0.75 using the time-including δ.
- **MatMat** (Řihák 2015, EDM; Masaryk University group):
  - a correct answer's value decays from 1 with t/τ_i, where τ_i is a per-item target time;
  - the item difficulty is updated (only on a learner's first answer to the item) with the time-adjusted response.
  - The author lists two limitations: the approach "does not distinguish between accuracy and speed, which can be
    modelled separately", and it is unclear how to estimate τ_i. Even the merged approach needs a per-item time
    parameter.
- **Pelánek (2016, Computers & Education), a review of Elo in education:**
  - the time can be combined into the update, as in Math Garden;
  - that rule suits interfaces that show the timing and the deadline;
  - where time is measured silently, it "may still contain interesting information" (Papoušek et al. 2015), but a
    different scoring rule is needed.
- **Slepemapy, geography facts on maps** (Papoušek, Pelánek, Řihák & Stanislav 2015, EDM; 8 M answers):
  - It is the closest analogue to ours: visual identification, Elo, target success rate, multiple choice.
  - RTs are roughly lognormal. They depend on the item for reasons other than knowledge: small cities are harder to
    click, and Asia has more countries on the map. The authors normalise by **per-item percentiles**.
  - After a right answer, the next answer on the item goes from about 95% (very fast) to about 80% (slow) correct.
  - After a wrong answer the trend is weak and **reversed**: a slower wrong answer predicts better.
  - Very fast answers mix solid knowledge with guessing.
- **Umíme** (Pelánek 2018, L@S):
  - Within a knowledge component in mathematics, an item's median RT and its success rate correlate about 0.7, so time
    intensity and difficulty are closely related there. They can be "orthogonal", for instance for text-heavy items
    ("labour intensity").
  - For student modelling, wrong-answer content was more informative than RT. The most useful RT feature was "very
    fast" (5th to 15th percentile of the item), which flags guessing.
  - The paper warns that showing users that time counts would change their behaviour.
- **Duolingo.** Birdbrain (the official blog, Bicknell & Brust 2020) describes an ability-and-difficulty model in
  which an exercise's difficulty is a **sum of feature difficulties** (exercise type, words). It says nothing about
  response time. I found **no primary Duolingo source** that uses RT for difficulty; a third-party blog claims it, so
  treat that as unverified. Duolingo did collaborate on hint use (§2.4).

### 2.3 Knowledge tracing with response time

These works use time **on the student side**: as an input feature or a gate on the knowledge state. None I found uses
it as item-difficulty evidence.

- Wang & Heffernan (2012, EDM; ASSISTments) bin first response times **per problem** (5/50/95% cut points) and blend
  the result into BKT. They get a small but reliable gain (RMSE 0.4251 → 0.4213; student-level paired t-test,
  p = 0.039). They also treat extreme bins as gaming or off-task.
- LPKT (Shen et al. 2021, KDD) puts answer time and interval time into the learning cell.
- SAINT+ (Shin et al. 2021, LAK; EdNet) adds elapsed time and lag time, for +1.25 points of AUC.
- In the models I checked, time is normalised by item, or the model learns item embeddings alongside it.

### 2.4 Help-seeking (hints, which is what our enlarging is like)

- Feng, Heffernan & Koedinger (2009, UMUAI; ASSISTments): assistance metrics (hints, attempts, time) predict
  end-of-year scores better than correctness alone.
- **Bolsinova, Deonovic, Arieli-Attali, Settles, Hagiwara & Maris (2022, APM 46(3)); MARC 2018 slides read**, Duolingo
  data:
  - On-demand hint use is informative about ability, but it also loads on a **second person dimension (a hint-use
    propensity), uncorrelated with ability (r ≈ 0.05)**. Item slopes on that dimension are strong.
  - Models with item-specific parameters for the hint outcomes fit far better than a single δ.
  - Best fit: full credit for right without a hint, partial credit for right with a hint, zero for wrong.
  - So help-seeking needs a person-propensity correction and item-specific parameters, not a simple shift.

### 2.5 Timing on the web and on phones

- Browser timing of responses is accurate to roughly 10 ms in most setups. Laptops and phones are noisier, and the
  variation between OS and browser is real (Bridges et al. 2020, PeerJ; Anwyl-Irvine et al. 2021, BRM). This is
  negligible against our medians of 4 to 11 s.
- The real confound is **what the clock contains**: image loading and decoding, other views of a multi-view question
  still loading, the enlarged image loading, and interruptions.

## 3. How this maps onto our options

| Option                                               | Closest precedent                                                                                                                                                       | Form used elsewhere                                                                                                                                                                                                                                      | Fit with our data                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (1) Time weight on the genus-offset step too         | Math Garden, MatMat: the time-adjusted score updates the item. Birdbrain: the difficulty is a sum of features, all moved by one residual.                               | One score per answer. **All** difficulty components move with the same time-adjusted residual. Single item parameter. Usually with time visible to users and a deadline (Math Garden), or a per-item target time τ_i (MatMat).                           | The extension to a hierarchical genus offset is consistent: if the photo step uses time, the genus step should use the same score. Precedented in spirit. Our measured gain is −1.56 × 10⁻³ (exploratory). It merges time into difficulty, which Pelánek (2016) warns against when time is measured silently, and van der Linden's framework avoids. |
| (2) Per-photo time intensity (sheet), into photoDiff | van der Linden 2006/2007; Klein Entink et al. 2009; van der Linden, Klein Entink & Fox 2010 (collateral information); Pelánek 2018 (median RT against success, r ≈ 0.7) | **A separate item parameter** β_i, estimated net of person speed. It informs difficulty through the item-level correlation (a prior on b given β), which matters most when there are few accuracy answers. It is also used in selection and expectation. | The most direct match. Our TI is already computed net of player median and right/wrong, and shrunk. Its correlation with photo Elo, +0.22 to +0.27, is the second-level correlation. The out-of-sample test was the largest gain of all (−6.1 × 10⁻³, not clear after BH). Served by the sheet (rule L13).                                           |
| (3) Enlarging as a small extra                       | Hint use: Feng et al. 2009; Bolsinova et al. 2022 (Duolingo)                                                                                                            | Informative, but with its own person propensity (uncorrelated with ability) and item-specific parameters. Partial credit.                                                                                                                                | The "against own habit" measure handles the propensity. Data are thin: fish has 17 enlarged answers, and the corals result has BH 0.085. Enlarged time is inside the seconds, so it overlaps with (2).                                                                                                                                               |

Notes on the mapping:

- **(1) and (2) use the same signal**: other players' slow right answers on the photo, or on the genus. (2) uses it
  as a separate, shrunk parameter. (1) folds it into the running ratings. Adding both double-counts the signal, so they
  are alternatives to compare on one primary measure.
- **The fading form of (2) is the principled one.** In the hierarchical model, the prior from β_i weighs less as the
  item's own accuracy data grow. In our `photoDiff`, that means c·TI belongs in the **prior** term, beside the genus
  offset, which already fades as (o[1] + W)⁻¹. A permanent additive term in the expectation is what LEARNING (c)
  measured. That form is fine as a first test, but if TI still adds information after many answers, the reason is the
  conditional dependence of §2.1 rather than collateral information, and it should be checked. The two forms can be
  told apart by testing the gain against the photo's number of answers.
- **Separate parameter versus merged.** The psychometric standard is separate. Merging is used only where the
  interface makes time an explicit part of the task. That favours (2) over (1) for our app, which does not show time to
  players.

## 4. Pitfalls and how others guard against them

1. **Rapid guessing and disengagement.** These are very fast answers, mostly wrong or lucky.
   - Others' guards: response-time effort and effort-moderated IRT (Wise & Kong 2005; Wise & DeMars 2006), which flag
     answers under an item threshold; per-item extreme bins (Wang & Heffernan 2012: below the 5th percentile); "very
     fast" at the 5th to 15th percentile of the item (Pelánek 2018); the deadline and wrong-answer penalty (Math
     Garden).
   - Ours: the time intensity uses right answers only; there is a clamp at 0.5 to 1.5 on the player side. To add:
     exclude, from the time-intensity estimate, right answers below a per-photo or per-format fast threshold
     (2-choice questions especially).
2. **Very long times** (off-task, interruptions).
   - Others' guards: upper bins (Wang & Heffernan: above the 95th percentile); a deadline (Math Garden).
   - Ours: a 600 s cap, a pause when the app is hidden, the log scale and shrinkage. Consider a robust mean (trimmed,
     or z winsorised at ±2) for the time intensity.
3. **Person speed and person speed-accuracy trade-off.**
   - Others' guards: a person speed parameter τ_j (van der Linden). Math Garden admits one rule treats learners as
     homogeneous (Vermeiren et al. 2025). Goldhammer et al. 2014 show the sign of time on task can change with skill.
   - Ours: z against the player's own earlier median, which handles the level. The slope (careful but accurate players)
     is not handled. Check the coefficient's sign per player (H1 was negative for most players) and that no player
     group has the opposite sign.
4. **Practice and drift.**
   - Players speed up with practice (our median z goes from +0.20 to −0.39 within a session), and Elo item ratings
     drift (Vermeiren et al. 2025: paired updates).
   - Ours: the median from earlier answers only. The time intensity should also be computed from answers of the same
     era, or be detrended by the player's answer count (log n is already a control in `rtdecomp.py`).
5. **Labour intensity is not difficulty** (Pelánek 2018; Papoušek et al. 2015: map click size).
   - Photos can be slow without being hard: multi-view questions, far colony shots, more choices, typed answers.
   - Guard: estimate the time intensity net of format covariates (2 choices, views, typed out, as LEARNING (c) does),
     and let an out-of-sample coefficient decide how much time intensity says about difficulty.
6. **Double counting with the player-side weight** (PR #431).
   - In the hierarchical model, time enters the likelihood once, and the person's residual time is log t − (β_i − τ_j).
   - Math Garden avoids double counting with one score per answer feeding both sides symmetrically.
   - Our version: once photo time intensity exists, compute the player's z **net of the photo's time intensity**
     (z − β̂_photo; ROADMAP already notes this), and re-tune the player-side k together with the photo coefficient.
     Otherwise a slow photo both shrinks the player's step and raises the photo's difficulty for the same seconds.
7. **Users reacting to time counting.**
   - Pelánek 2018 and 2016 warn that showing it changes behaviour; Math Garden makes it explicit on purpose.
   - Ours is silent: keep it so, and never show players a "speed" score.
8. **Latency and the device.**
   - `performance.now()` precision is fine. The risk is the clock's start: it starts at the first photo's load, so a
     multi-view question can include the other views' load time, and enlarging can include the large image's load
     time. I did not check whether enlarging fetches a larger file.
   - Guard: per-player medians absorb the device. For the time intensity, exclude enlarged answers (H1 already does)
     or include enlarged as a covariate. Possibly also log the image load delay.
9. **Adaptive selection.** Who sees a photo depends on its rating. Net-of-player residuals remove most of this, and
   the shrinkage handles small n. The Urnings note in LEARNING ("Considered and not adopted") is the long-term answer
   if ratings drift.

## 5. Recommendation and what to validate (rule L11)

**Recommend (2), in the collateral-information form**, as the one best supported by the psychometric literature:

- The sheet serves each photo's shrunk time intensity: residual log time from right, non-typed, non-enlarged answers,
  net of player median, practice and format.
- It enters `photoDiff` through one coefficient c chosen out of sample, leave-one-player-out.
- The primary form puts c·TI into the **prior** (fading with the photo's own answers). The secondary form is the
  permanent additive term, which LEARNING (c) already measured.
- At the same time, compute the player-side z net of the photo's time intensity.

Keep (1) as the declared **alternative**, compared head to head on the same primary measure. Do not stack it with (2).
Defer (3) until enlarged answers allow it. If it is ever used, make it an item feature in the same sheet fit, measured
against the player's own habit (Bolsinova et al. 2022), not an Elo step.

What we would need to validate:

- **Level 2** (it moves every photo's rating, so the draw):
  - the app world: profiles × 5 seeds, 300 questions;
  - the rated world: 10 seeds per profile, then 20 if unclear. The world needs **simulated times**: log t =
    β_photo − τ_player + noise, with corr(β, b) = ρ planted. Three cases: ρ ≈ 0.25 (our estimate), ρ = 0 (a null:
    c should go to about 0 and nothing should break), and labour intensity (β tied to the number of views, not to b).
    `TRUTH.td` in the Analyses already plants a link and can serve as the template.
- **The real-log replay as the declared primary**: paired next-answer log-loss, players as the unit, stratified
  sign-flip, one-sided, declared before running. Corals are primary; fish are exploratory (152 photos with 2 or more
  timed answers).
- **Secondary checks:**
  - the gain against the photo's number of answers (a collateral-information gain should shrink with n);
  - calibration;
  - per-player signs;
  - guardrails;
  - the player-side k re-tuned with the net-of-TI z (no double count);
  - fast and slow trims.
- **Implementation order:** `Code.gs` `stats_` and `core.js` `eloReplay` together; the app reads the time intensity
  only from the sheet version that serves it (rule D4).

## References

Each entry was checked by search unless marked otherwise: venue, year and link confirmed. **Full text read** means I
read the paper itself rather than its abstract.

1. van der Linden, W. J. (2006). A lognormal model for response times on test items. _Journal of Educational and
   Behavioral Statistics_, 31(2), 181–204. https://doi.org/10.3102/10769986031002181 ·
   https://research.utwente.nl/en/publications/a-lognormal-model-for-response-times-on-test-items/
2. van der Linden, W. J. (2007). A hierarchical framework for modeling speed and accuracy on test items.
   _Psychometrika_, 72(3), 287–308.
   https://www.cambridge.org/core/journals/psychometrika/article/hierarchical-framework-for-modeling-speed-and-accuracy-on-test-items/E5DD5CFD7A054EC76D0A066FB7541363
3. van der Linden, W. J. (2008). Using response times for item selection in adaptive testing. _Journal of Educational
   and Behavioral Statistics_, 33(1), 5–20. https://doi.org/10.3102/1076998607302626 ·
   https://research.utwente.nl/en/publications/using-response-times-for-item-selection-in-adaptive-testing/
4. van der Linden, W. J. (2009). Conceptual issues in response-time modeling. _Journal of Educational Measurement_,
   46(3), 247–272. https://stat.cmu.edu/~brian/463-663/project-part-two/JEM%202009,%20247-272.pdf
5. van der Linden, W. J., Klein Entink, R. H., & Fox, J.-P. (2010). IRT parameter estimation with response times as
   collateral information. _Applied Psychological Measurement_, 34(5), 327–347. Abstract and citing papers only; the
   issue number is from memory. https://doi.org/10.1177/0146621609349800 (DOI from memory, unverified)
6. Klein Entink, R. H., Fox, J.-P., & van der Linden, W. J. (2009). A multivariate multilevel approach to the modeling
   of accuracy and speed of test takers. _Psychometrika_, 74(1), 21–48. Volume and pages from memory.
   https://www.cambridge.org/core/services/aop-cambridge-core/content/view/69197E766E8D5A34DCC5509233050E85/S0033312300021670a.pdf/a-multivariate-multilevel-approach-to-the-modeling-of-accuracy-and-speed-of-test-takers.pdf
7. van der Linden, W. J., Scrams, D. J., & Schnipke, D. L. (1999). Using response-time constraints to control for
   differential speededness in computerized adaptive testing. _Applied Psychological Measurement_, 23(3), 195–210.
   Volume and pages from memory.
   https://research.utwente.nl/en/publications/using-response-time-constraints-to-control-for-differential-speed/
8. Fan, Z., Wang, C., Chang, H.-H., & Douglas, J. (2012). Utilizing response time distributions for item selection in
   CAT. _Journal of Educational and Behavioral Statistics_, 37(5), 655–670.
   https://ideas.repec.org/a/sae/jedbes/v37y2012i5p655-670.html
9. Maris, G., & van der Maas, H. L. J. (2012). Speed-accuracy response models: Scoring rules based on response time and
   accuracy. _Psychometrika_, 77(4), 615–633. https://doi.org/10.1007/s11336-012-9288-y ·
   https://dare.uva.nl/id/257c9569-e69c-466b-b813-c48c1e65942c
10. van Rijn, P. W., & Ali, U. S. (2018). A generalized speed–accuracy response model for dichotomous items.
    _Psychometrika_, 83(1), 109–131. https://doi.org/10.1007/s11336-017-9590-9
11. Klinkenberg, S., Straatemeier, M., & van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using
    a new item response model for on the fly ability and difficulty estimation. _Computers & Education_, 57(2),
    1813–1824. https://dare.uva.nl/id/de65bb65-d198-4dbc-ac7b-bc25ca23e627
12. Brinkhuis, M. J. S., Savi, A. O., Hofman, A. D., Coomans, F., van der Maas, H. L. J., & Maris, G. (2018). Learning as
    it happens: A decade of analyzing and shaping a large-scale online learning system. _Journal of Learning
    Analytics_, 5(2), 29–46. Citation only. https://www.prowise.com/en/product/prowise-learn/prowise-learn-research/
13. Vermeiren, H., Kruis, J., Bolsinova, M., van der Maas, H. L. J., & Hofman, A. D. (2025). Psychometrics of an
    Elo-based large-scale online learning system. _Computers and Education: Artificial Intelligence_, 8, 100376. Full
    text read. https://doi.org/10.1016/j.caeai.2025.100376 ·
    https://pure.uva.nl/ws/files/271920922/1-s2.0-S2666920X25000165-main.pdf
14. Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. _Computers & Education_,
    98, 169–179. Full text read (accepted manuscript). https://doi.org/10.1016/j.compedu.2016.03.017 ·
    https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf
15. Řihák, J. (2015). Use of time information in models behind adaptive system for building fluency in mathematics.
    _Proc. EDM 2015_, 642–644. Full text read.
    https://www.educationaldatamining.org/EDM2015/proceedings/dc642-644.pdf
16. Papoušek, J., Pelánek, R., Řihák, J., & Stanislav, V. (2015). An analysis of response times in adaptive practice of
    geography facts. _Proc. EDM 2015_, 562–563. Full text read.
    https://www.educationaldatamining.org/EDM2015/proceedings/poster562-563.pdf
17. Pelánek, R. (2018). Exploring the utility of response times and wrong answers for adaptive learning. _Proc. Learning
    @ Scale 2018_, 18:1–18:4. Full text read. https://doi.org/10.1145/3231644.3231675 ·
    https://www.fi.muni.cz/~xpelanek/publications/las18-observational-data.pdf
18. Pelánek, R., & Jarušek, P. (2015). Student modeling based on problem solving times. _International Journal of
    Artificial Intelligence in Education_, 25(4), 493–519. https://doi.org/10.1007/s40593-015-0048-x
19. Wang, Y., & Heffernan, N. T. (2012). Leveraging first response time into the knowledge tracing model. _Proc. EDM
    2012_ (short paper). Full text read.
    https://educationaldatamining.org/EDM2012/uploads/procs/Short_Papers/edm2012_short_13.pdf
20. Shen, S., Liu, Q., Chen, E., Huang, Z., Huang, W., Yin, Y., Su, Y., & Wang, S. (2021). Learning process-consistent
    knowledge tracing. _Proc. KDD 2021_. The author list is from memory beyond the first author.
    https://dm.ustc.edu.cn/paper_pdf/2021/Shuanghong-Shen-KDD.pdf
21. Shin, D., Shim, Y., Yu, H., Lee, S., Kim, B., & Choi, Y. (2021). SAINT+: Integrating temporal features for EdNet
    correctness prediction. _Proc. LAK 2021_. The co-authors are from memory. https://arxiv.org/abs/2010.12042
22. Feng, M., Heffernan, N. T., & Koedinger, K. R. (2009). Addressing the assessment challenge with an online system that
    tutors as it assesses. _User Modeling and User-Adapted Interaction_, 19(3), 243–266.
    https://www.sri.com/publication/education-learning-pubs/digital-learning-pubs/addressing-the-assessment-challenge-in-an-online-system-that-tutors-as-it-assesses/
23. Bolsinova, M., Deonovic, B., Arieli-Attali, M., Settles, B., Hagiwara, M., & Maris, G. (2022). Measurement of ability
    in adaptive learning and assessment systems when learners use on-demand hints. _Applied Psychological
    Measurement_, 46(3), 219–235. Abstract read, plus the 2018 MARC slides "Modeling hint use and response accuracy in
    learning environments": https://education.umd.edu/media/11330/download.
    https://research.tilburguniversity.edu/en/publications/measurement-of-ability-in-adaptive-learning-and-assessment-system/
24. Bolsinova, M., Tijmstra, J., Molenaar, D., & De Boeck, P. (2017). Conditional dependence between response time and
    accuracy: An overview of its possible sources and directions for distinguishing between them. _Frontiers in
    Psychology_, 8, 202. https://doi.org/10.3389/fpsyg.2017.00202
25. Goldhammer, F., Naumann, J., Stelter, A., Tóth, K., Rölke, H., & Klieme, E. (2014). The time on task effect in
    reading and problem solving is moderated by task difficulty and skill. _Journal of Educational Psychology_, 106(3),
    608–626. https://doi.org/10.1037/a0034716 ·
    https://www.pedocs.de/volltexte/2019/17967/pdf/Goldhammer_etal_2014_time_on_task_effect_in_reading_and_problem_solving_A.pdf
26. Wise, S. L., & Kong, X. (2005). Response time effort: A new measure of examinee motivation in computer-based tests.
    _Applied Measurement in Education_, 18(2), 163–183. Volume and pages from a citing reference list.
27. Wise, S. L., & DeMars, C. E. (2006). An application of item response time: The effort-moderated IRT model. _Journal of
    Educational Measurement_, 43(1), 19–38. https://doi.org/10.1111/j.1745-3984.2006.00002.x ·
    https://commons.lib.jmu.edu/gradpsych/15
28. Bicknell, K., & Brust, C. (2020, Oct 7). Learning how to help you learn: Introducing Birdbrain. Duolingo blog.
    https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain
29. Bridges, D., Pitiot, A., MacAskill, M. R., & Peirce, J. W. (2020). The timing mega-study: Comparing a range of
    experiment generators, both lab-based and online. _PeerJ_, 8, e9414. https://peerj.com/articles/9414
30. Anwyl-Irvine, A., Dalmaijer, E. S., Hodges, N., & Evershed, J. K. (2021). Realistic precision and accuracy of online
    experiment platforms, web browsers, and devices. _Behavior Research Methods_, 53(4), 1407–1425.
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8367876/

Not verified, and so not relied on: any Duolingo use of response time (one third-party blog only); the exact size of
the collateral-information gains in van der Linden et al. 2010.
