# What should the progress bar measure, and how do we judge it? Research note

Written 2026-11-06 (Manila night) for Pierre. Research only: no code, no simulation. Code read on `main` at `5cecdeb3`;
the "proven against the field" rule of PR #611 (branch `claude/progress-coverage`, waiting for Pierre) read as a diff.

**Pierre's challenge.** We tuned the bar to zero "overclaim" = bar − pOpen (success on an *average* photo, open
question against all 40 genera), a yardstick of our own. He wants ONE simple, difficulty-indexed quantity (no bands,
no pile of thresholds) that rises fast for a strong player and never credits genera the player has not shown.

Source marks: **[full text]** read this session; **[abstract]** abstract or official summary read; **[secondary]**
through a summary, slides or search excerpt; **[memory]** not re-checked. "Our inference" marks what no source says.

## Summary

1. **The literature has the one number Pierre describes: the IRT *domain score*.** It is the expected share of right
   answers over all items of a domain, computed from the ability estimate and each item's difficulty (Bock, Thissen &
   Zimowski 1997). It does not need the items answered to be a random sample of the domain (fine under adaptive
   selection) and has a standard error. Anki's "estimated total knowledge" is the same idea over reviewed cards.
2. **Our current bar is not difficulty-indexed for right answers.** It is an exponential moving average (EMA) of
   answers (Pelánek & Řihák 2018). Misses are discounted by photo difficulty; right answers carry no difficulty weight
   (removed on purpose); the EMA "completely ignores item information" (Pelánek & Řihák). The game keeps players near
   75-85% right, so the EMA settles near the target whatever the ability: hence the entry at 0.8, and 10-15 right
   answers per genus for an expert as for anyone, the early under-claim Pierre fears.
3. **In voluntary practice the costly error is under-claiming.** Forced over-practice makes learners "lose interest and
   stop using the system" (Pelánek & Řihák 2018). Our yardstick, max(0, bar − truth), counted only over-claim.
4. **Thresholds per difficulty band are arbitrary.** Item mapping places items at a chosen response probability (RP .67
   or .80), and the cut scores change with that choice (Baldwin et al. 2020). An expected score over the photo pool
   needs no RP and no bands.
5. **Judge a rule across several learner models, then on real data.** Policies that won in one simulator lost with
   real students (Doroudi, Aleven & Brunskill 2017); exemplar models fitted to natural categories (rocks) fit well,
   with systematic misses (Nosofsky et al. 2018, 2019).
6. **A bar defined as a probability can be tested on real data**, as a forecast of later answers by photo difficulty
   (players as the unit). With about 2,000 answers from 10 players: overall and roughly by tercile, not per player.

**Proposal (section 5).** Bar of genus g = its domain score: the mean over its game photos of P(right, one view, no
guessing) at a cautious ability θ_g − z·SE_g, SE_g from the player's own answers on g only; the exam stays the
confirmation. Judge any bar as a forecast: signed error against the true domain score in simulation, calibration by
difficulty on real data.

## 1. Progress and mastery indicators (question A)

### 1.1 Mastery criteria (the bar we have)

- **Pelánek & Řihák (2018)**, *Analysis and design of mastery learning criteria*, New Review of Hypermedia and
  Multimedia 24(3), http://www.fi.muni.cz/~xpelanek/publications/nrhm-mastery.pdf **[full text]**.
  The data used and the threshold matter more than the learner model; an EMA is a suitable criterion. In voluntary
  online practice avoid false negatives ("if learners are forced to do unnecessary practice, they may lose interest");
  testing must avoid false positives instead. A logistic model "takes into account difficulty of items, whereas the EMA
  approach completely ignores item information". A bar should show how long is left, rise after a right answer, stall
  or fall after a miss, not punish a typo. Without ground truth: agreement between criteria, effort to mastery, score
  after mastery, minding attrition.
- **Pelánek (2018)**, *Conceptual issues in mastery criteria: differentiating uncertainty and degrees of knowledge*,
  AIED 2018, https://www.fi.muni.cz/~xpelanek/publications/mastery-modeling.pdf **[full text]**.
  A threshold mixes *degree* of knowledge and *uncertainty*; Elo and logistic models give a point estimate that
  "combines uncertainty and knowledge estimate into one number". Advice: keep the two apart ("average performance"
  and "number of attempts" may be enough).

### 1.2 Expected score over an item pool

- **Bock, Thissen & Zimowski (1997)**, *IRT estimation of domain scores*, J. Educational Measurement 34(3):197-211, doi
  10.1111/j.1745-3984.1997.tb00515.x, [record](https://consensus.app/papers/details/7052e22fbe845b428568d95be8f7229b/)
  **[abstract]**.
  The domain score is "the expected percent correct for all items in the domain", "the index of the proportion of the
  domain mastered". The IRT estimate "has the advantage of not requiring the test items to be a random sample of the
  domain, and of having a simple standard error"; on real data it predicted the domain score better than percent correct.
- **Anki manual, Statistics** (FSRS), https://docs.ankiweb.net/stats.html **[full text]**.
  "Estimated total knowledge is the total number of cards you are likely to currently remember" (retrievability, the
  "probability of recall", averaged × the cards reviewed at least once): **unseen cards count zero**.
- **Pelánek, Papoušek, Řihák, Stanislav & Nižnan (2017)**, *Elo-based learner modeling for the adaptive practice of
  facts*, UMUAI 27, http://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf **[full text]**.
  Hierarchical model P = σ(θ_global + θ_concept − d_item), the concept skill updated more slowly: our global level +
  genus Elo. Progress feedback every 10 questions, beside an open learner model whose formula is not given.

### 1.3 Criterion-referenced scales and thresholds

- **Item mapping / bookmark standard setting** places each item where a person has a chosen response probability (RP).
  The RP is a convention: Huynh's RP .67 (Huynh 2006, *EM:IP*,
  [record](https://consensus.app/papers/details/5a352ce5a847572db214f3e05e7568a8/)) **[abstract]** was disputed by
  Baldwin (2018, *APM*) **[abstract]**; experts given RP .67 or .80 set "substantially different cut scores" (Baldwin et
  al. 2020, *EM:IP*, [record](https://consensus.app/papers/details/53ba3f2e889c5e7ab1a2ed57cc10062a/)) **[abstract]**;
  also Wyse (2011, *EPM*) **[abstract]**. The formal version of an "easy / medium / hard band" bar: an RP per band.
- **Wright maps / construct maps** put persons and items on one logit scale (Wilson 2023, *Constructing Measures*, 2nd
  ed.) **[abstract]**. Our inference: a picture of the domain score, not another quantity.
- **Lexile** (MetaMetrics 2020, *Lexile Measures Overview*,
  https://metametricsinc.com/wp-content/uploads/2020/08/Lexile-Measures-Overview.pdf) **[full text]**: when reader
  and text match, the reader "is expected to have a 75 percent comprehension rate", higher on easier texts and lower
  on harder ones. A difficulty-indexed probability, one number.

### 1.4 What products do

| Product | What the bar shows | Difficulty-indexed? | Credits unseen? | Source |
|---|---|---|---|---|
| Math Garden | Elo ability and item difficulty updated every answer; items at about .75 success; progress tracking | ability scale | n/a | Klinkenberg, Straatemeier & van der Maas 2011, *Computers & Education* 57(2), [record](https://dare.uva.nl/id/de65bb65-d198-4dbc-ac7b-bc25ca23e627) **[abstract]** |
| Duolingo Score | a 160-point, CEFR-aligned score that rises as lessons and units are completed | yes, through calibrated content | no | blog, K. Yang, 2025-04-01, https://blog.duolingo.com/what-does-score-mean-on-duolingo/ **[full text, Korean]** |
| Khan Academy | skill = 100 points (Familiar 50, Proficient 80, Mastered 100); quizzes and unit tests can move a skill up two levels at once, and misses there can drop it | levels | no | https://support.khanacademy.org/hc/articles/115002552631-What-are-Course-and-Unit-Mastery- **[secondary, search excerpts]** |
| ALEKS | pie counter of topics "mastered and learned"; Mastered only through a Knowledge Check | no | no | [ALEKS FAQ](https://www.mheducation.com/support/aleks-support-center/knowledge/why-does-aleks-periodically-give-me-new-knowledge-checks.html) **[full text]** |
| Anki (FSRS) | Σ recall probability over the cards reviewed | per-card difficulty | no | Anki manual **[full text]** |

### 1.5 Three ways to map ability onto a bar (our inference; no source compares them for a bar)

- **Success on an average photo**, σ(θ − mean d): what pOpen used. It ignores the hard tail: above the middle σ is
  concave, so for a player above the average photo it reads *higher* than the expected success over the photos, and it
  says nothing about the hard photos Pierre wants the last stretch to mean.
- **Expected success over the photo distribution**, mean_p σ(θ − d_p): the domain score. It grows as θ passes each
  photo's difficulty, the first part on the easy photos, the last on the hard ones: Pierre's image, with no band
  written in. With difficulties spread about ±1 logit it differs from the first by a few points mid-scale, more at the top.
- **A threshold per band** ("easy photos at RP .8 = 35%"): band edges plus an RP each, and the result moves with the RP
  (1.3).

## 2. Difficulty, adaptive selection, and how fast the bar can rise (question B)

- **Targeted success.** Math Garden aims at .75; a Math Garden study of 60/75/90% found the easiest condition learned
  best, through more problems solved (Jansen et al. 2013, via Pelánek et al. 2017) **[secondary]**; harder questions
  were better for geography facts (Pelánek et al. 2017); learner-set difficulty had a small overall effect (Papoušek &
  Pelánek 2017, http://www.fi.muni.cz/~xpelanek/publications/difficulty-adjustment.pdf) **[full text]**. Our 85% → 75%
  by level (`core.js` `AIM`) sits in this range.
- **Adaptive data hide a model's quality.** In a system aiming at 75%, a constant 0.75 predicts almost as well as an
  excellent model. "The use of an incorrect student model may lead to a dataset that is insufficient for demonstrating
  that the model is incorrect" (Pelánek 2018, *The details matter*, UMUAI 28,
  http://www.fi.muni.cz/~xpelanek/publications/methodological.pdf) **[full text]**. Raw accuracy under adaptive
  selection says little; a difficulty-aware estimate does.
- **Elo under adaptive selection.** Ratings are generally not unbiased, and their variance inflates without converging;
  fix: two parallel chains (Bolsinova et al. 2025, *BJMSP*,
  [record](https://consensus.app/papers/details/0df184eea4655eca991fba40b169c6c7/)) **[abstract]**. Urnings give
  standard errors and correct for adaptive selection (Hofman et al. 2020, *J. Intelligence*) **[abstract]**. An adaptive
  K-factor speeds up convergence in a large Elo system (Vermeiren et al. 2025, *Comput. Educ. AI*,
  [record](https://consensus.app/papers/details/26665d8f5192561088454f0968e84826/)) **[abstract]**. So the bar's speed
  for a strong player depends on how fast the ability moves on informative photos.
- **Misspecified mastery rules treat fast and slow learners unequally** (BKT, N-consecutive-correct; Doroudi &
  Brunskill 2019, LAK, doi 10.1145/3303772.3303838) **[secondary, abstract excerpts]**.
- **Over-claim guards in practice.** Khan and ALEKS confirm the top level only on mixed tests; Kellman's modules retire
  a category only on a running d′ with false alarms (Kellman et al. 2023, CogSci; read for the
  [set-size study](2026-11-05-progress-setsize-study.md)); Anki counts only reviewed cards. All credit only what was
  shown, and confirm the top on a hard, mixed test.

## 3. Learner models for simulating category learning (question C)

- **Exemplar and similarity models.** GCM: P(category) ∝ summed similarity to stored exemplars, a Luce choice (Nosofsky
  1986, *JEP:General* 115:39) **[memory]**. ALCOVE adds error-driven learning and learned dimension attention (Kruschke
  1992, *Psych. Review*, [record](https://consensus.app/papers/details/16b1d528c1cd514bafeb5a514cfef54e/))
  **[abstract]**. Our field learner (Luce over the names held, pair skill learned by contrast) is a much simplified
  member of this family (our reading).
- **Fitted on natural categories.** A low-parameter exemplar model on a feature space of rock photos predicted item
  accuracy, category accuracy and confusions (Nosofsky, Sanders & McDaniel 2018, *JEP:General* 147(3):328-353,
  [profile](https://profiles.wustl.edu/en/publications/tests-of-an-exemplar-memory-model-of-classification-learning-in-a/))
  **[secondary]**. Used to design training, it predicted that broad example sets generalise best, and missed
  systematically on within-category similarity (Nosofsky, Sanders, Zhu & McDaniel 2019, *Psychon. Bull. Rev.* 26:48-76)
  **[abstract]**. Machine teaching helped humans most when its model was capacity-limited like them (Patil, Zhu, Kopeć
  & Love 2014, NIPS) **[abstract]**; teaching plans hinge on the student model assumed (Rafferty et al. 2016, *Cogn.
  Sci.*) **[abstract]**.
- **Blocked vs interleaved.**
  - Kornell & Bjork 2008, *Psych. Science* 19(6):585-592, https://www.gwern.net/docs/spaced-repetition/2008-kornell.pdf
    **[full text]**: 12 painters; induction .61 interleaved vs .35 massed (Exp. 1a); 78% still judged massing better.
  - Meta-analysis: g = 0.42, larger for categories similar to each other (Brunmair & Richter 2019, *Psych. Bulletin*,
    [record](https://consensus.app/papers/details/621345c33c1c5d6ab95c10b54896bbb1/)) **[abstract]**.
  - Blocking helps low-similarity categories (Carvalho & Goldstone 2014, *Mem. Cogn.*) **[abstract]**; blocked-then-
    interleaved does as well as pure interleaving (Yan et al. 2017, *JEP:Applied*) **[abstract]**.
  - For the Custom quiz (our inference): interleaving 8 genera teaches contrast only among those 8, the source of a
    drilled genus's over-claim.
- **Validating simulators.** Doroudi, Aleven & Brunskill 2017, *Robust Evaluation Matrix*, ACM L@S, doi
  10.1145/3051457.3051463 **[secondary: metadata, slides]**: a policy predicted at 9.1 on a simulated post-test scored
  4.9 (baseline 5.5); ranks flipped between student models. Remedy: judge across several plausible learner models.

## 4. Validating a progress measure on real data (question D)

- **Metrics.** Use proper scores (log-likelihood, RMSE); not MAE; AUC critically, because it ignores calibration
  (halving every prediction leaves AUC unchanged; Pelánek 2015, *JEDM* 7(2),
  http://www.fi.muni.cz/~xpelanek/publications/metrics.pdf) **[full text]**.
- **Details matter.** Answers per student, attrition and data splitting change verdicts (Pelánek 2018) **[full text]**.
- **Sample size.** A calibration slope with SE < 0.15 needs roughly 40-280 events (Pavlou et al. 2021, *SMMR*,
  [record](https://consensus.app/papers/details/6e5872c1adff5fc1abb8767ffcb2089d/)) **[abstract]**; the slope usually
  sets the minimum sample (Riley et al. 2021, *Stat. Med.*) **[abstract]**.
- **Our data (our inference).** About 1,933 coral answers from 10 players, roughly 300-400 misses: enough for
  calibration-in-the-large and roughly per difficulty tercile. Player clustering and the narrow spread of predictions
  under adaptive selection make slopes imprecise; nothing per player is conclusive. The most informative rows are those
  off target: exam questions, calibration photos, typed answers.

## 5. Proposal (ours, not from the sources)

### (i) What the bar should mean

> **Bar of genus g = the share of the genus's photos the player would name right, one photo alone, with no choices to
> guess from, as far as their own answers on g have shown.**

`bar_g = mean over p in photos(g) of σ(θ̃_g − d_p)`, with `θ̃_g = θ_g − z·SE_g` and
`SE_g = 1 / sqrt(I0 + Σ p_i(1 − p_i))`.

- **The pieces.** `d_p`: the pooled photo difficulty the sheet already serves, plus the single-view offset
  (`PICKD.SINGLE`); the pool is every game photo of g, hard ones included from the start, so 100% needs θ well above
  the hardest. No guessing floor (the open, typed-like task): a beginner starts near 0, not 25%. `θ_g`: the genus Elo
  the game keeps. `SE_g`: the Fisher information of the player's **own** answers on g (p_i the Elo chance at each
  answer), plus a small prior I0.
- **Speed and caution in one formula.** A right answer on a hard photo (p near 0.5) carries the most information, so a
  strong player shown hard photos rises fast. A drill of easy photos (p near 0.95) carries little, and the hard photos
  stay in the pool, so a drilled genus moves slowly and stays capped.
- **Spotty players** (some families known well, others barely, or 8 genera drilled). The global level and the
  lecture-group skills choose the photos and set θ_g's start, as now (the global + concept model), but never enter the
  bar's certainty: a genus with no answers has I = I0, a large SE and a bar near 0. A quick test that credited every
  genus with the overall level over-claimed unknown genera by about +0.59 (an internal test, not a source); the lower
  bound rules that out by construction. A strong player's *new* genus starts at a high θ_g, gets hard photos at once,
  and a handful of right answers lifts its bar (our expectation, to be measured).
- **What changes.** The EMA `s.pg` and its 0.8 entry stop being the bar; the EMA can stay as the game's internal "recent
  form" (draw, typed share, opening hold). The mastery exam stays the confirmation, as Khan's unit test, ALEKS's
  Knowledge Check and Kellman's false-alarm check do; its entry becomes "bar ≥ B_ex", in place of `PROG.M`.
- **One measure, one main constant**: z (how sure before crediting); I0 can be fixed at "one answer". Cost: one pass over
  the genus's photos (tens) per answer, or the closed form σ((θ̃ − mean d) / √(1 + 0.39 s²)), s the spread of photo
  difficulties, if they are about normal.
- **The field (set size) is not settled by this.** θ_g is guess-corrected but blind to *which* genera were offered.
  Two options, to test, not to decide here:
  - (a) pair coverage as an **exam-entry** condition only (the PALM / Larkwire practice): keeps the bar one number;
  - (b) coverage as a multiplier on the bar (PR #611): adds four constants (B, G, W, C).

### (ii) The metric to judge any candidate bar

The bar is a probability, so judge it as a forecast. Use the same logic in simulation and on real data.

- **Primary, in simulation: the signed bar error** `bar_g − D*_g`, D*_g the learner's *true* domain score on the same
  pool and task (from its true parameters), averaged over the genera met, per profile, at questions 25, 50, 100, 300,
  600. Signed, so under-claim (strong players early) and over-claim (spotty and drilled genera) both show.
- **Also report** mean |error| and **time-to-credit**: the questions until an expert's overall bar passes 50% and 80%.
- **Guardrails.** The precision of Learned (true D* at exam pass), the beginner's displayed bar at question 50, genera
  met by question 100.
- **On real data: calibration of the per-answer forecast by difficulty.** The bar averages P(right | θ̃_g, d_p), so
  test that on the next answers: leave one player out, predict each answer from the state before it, compare predicted
  and actual by tercile of θ_g − d_p (calibration-in-the-large and slope, log-loss per player), players as the unit with
  a sign-flip over players (as `tools/abilityeval.js`). The hard tercile and the exam and typed rows test the top.
- **On real data: the under-claim check.** Take player-genus pairs whose first 5 answers were all right. Compare their
  bar after 5 answers with their model-adjusted success on the later answers on that genus.
- With 10 players, expect "no clear difference" on many cuts, and say so.

### (iii) Simulation assumptions that need care

1. **The learner model.** Three worlds: item, field and an exemplar (GCM-like) learner. Keep a rule only if it wins or
   ties in all three; report the worst case (Doroudi et al. 2017).
2. **True photo difficulty.** Run with `--truth`, or a difficulty-indexed bar is judged against the app's own estimate.
3. **Transfer τ.** Bracket it at 0 / 0.5 / 0.8. A verdict that flips with τ waits for real data.
4. **Spotty profiles.** Today's RA profiles know every 5th genus, scattered. Add family-clustered profiles (3 lecture
   groups well, the rest barely), and the Custom-8 drill whose player never goes back to the Quiz (+0.22 over-claim).
5. **Elo speed.** The genus Elo under-estimated simulated experts by about 1.3 logits after 300 questions, and real
   players beat the app's expectation by 0.10-0.13 while 16 genera or fewer had been asked (LEARNING.md). A θ-based
   bar inherits that lag. Measure time-to-credit with today's K and a faster early K (Vermeiren et al. 2025) first.
6. **The learner never quits**, so under-claim costs nothing in simulation: report time-to-credit and early answers on
   photos far below the level (a boredom proxy).
7. **Check each world against the real log first**: right % by relative difficulty, curves on new genera, typed vs picked.

### (iv) Our current design against the literature

**How far today's bar already does what Pierre asks** (`core.js` `pgStep`, `pgMissW`, `pgRightW`, `scoreOf`):
- **Misses: yes.** A miss weighs the Elo chance of a right answer on *that* photo over the success aimed for: exactly
  P(right | photo difficulty). A miss on a hard photo costs less.
- **Right answers: no.** They weigh by choices and look-alikes only; a photo-difficulty factor was tried and dropped
  because "it only slowed everyone". A right answer on the hardest photo counts as one on the easiest.
- **The level reached: not indexed.** The EMA tracks recent success, which the game holds at its target, so the bar
  measures time held at the target on informative questions, not the share of photos mastered.
- **The top: yes, by the exam** (5 hardest-format questions, 2 typed). So difficulty enters at the two ends, not along
  the bar.

**Consistent:** Elo with an uncertainty function and global + genus skills (Pelánek 2016, 2017); a 75-85% target
(Math Garden .75, Lexile .75); misses discounted by difficulty; an exam with look-alike traps (Khan, ALEKS, Kellman);
two simulated worlds, pre-declared tests, players as the unit (Doroudi; Pelánek 2018); contrast-based pair learning.

**Inconsistent or untested:**
1. **Right answers ignore difficulty.** An EMA under adaptive selection settles near the target rate, the limit
   Pelánek & Řihák name. The 0.8 entry (= the target) and the ~10-15 right answers per genus for everyone follow from
   it, hence the expert's early under-claim (simulated 22% at question 100, 57% at 300).
2. **The yardstick was invented and one-sided.** pOpen (success on an average photo) is not a published measure and
   skips the hard tail. Over+ = max(0, bar − pOpen) counted only over-claim, while the practice literature says the
   false negative costs more.
3. **PR #611 was tuned to that yardstick.** Four constants were set to bring overclaim near 0 in one learner world.
   Its Custom-8 under-claim (−0.13 to −0.32) hangs on τ (as LEARNING.md says). This is the single-simulator risk of
   section 3.
4. **The bar is not a probability**, so it cannot be checked directly against real answers. A domain-score bar can.
5. **Spotty players: partly handled.** Today's bar does credit per genus only (no +0.59), but through counts of answers,
   not through what they proved about hard photos.
6. **Learnsim gaps.** RA profiles are not clustered by family, and no learner leaves when bored.

## 6. Questions for Pierre (each with a recommendation)

- **a. Meaning of 100%.** "Names every photo of the genus right, alone, without choices", with the bar the share of its
  photos named right? *Recommendation:* yes: one difficulty-indexed number by construction.
- **b. Own evidence only in the bar.** The global level and the lecture group choose the photos, never the bar's
  certainty? *Recommendation:* yes: the guard against crediting unknown genera.
- **c. The field.** Pair coverage as an exam-entry condition or as a bar multiplier (PR #611)? *Recommendation:* exam
  entry, then compare both in three learner worlds.
- **d. The yardstick.** Replace "overclaim vs pOpen" with the signed error against the true domain score, plus
  time-to-credit? *Recommendation:* yes, before any further tuning.
- **e. PR #611.** Hold its bar change until (d) has been run on it and on the domain-score bar? *Recommendation:* yes if
  (a) is agreed. Our inference: its typed-vocabulary part (`typedK`) does not depend on the bar.

## References

Full and secondary details, with URLs, in the sections above. **Full text:** Pelánek & Řihák 2018; Pelánek 2018 (AIED);
Pelánek et al. 2017; Pelánek 2018 (UMUAI); Pelánek 2015; Papoušek & Pelánek 2017; Kornell & Bjork 2008; Anki manual;
ALEKS FAQ; MetaMetrics 2020; Duolingo blog 2025. **Abstract:** Bock et al. 1997; Huynh 2006; Baldwin 2018; Baldwin et
al. 2020; Wyse 2011; Wilson 2023; Klinkenberg et al. 2011; Bolsinova et al. 2025; Hofman et al. 2020; Vermeiren et al.
2025; Kruschke 1992; Nosofsky et al. 2019; Patil et al. 2014; Rafferty et al. 2016; Brunmair & Richter 2019; Carvalho
& Goldstone 2014; Yan et al. 2017; Pavlou et al. 2021; Riley et al. 2021. **Secondary:** Nosofsky,
Sanders & McDaniel 2018; Doroudi et al. 2017 (slides); Doroudi & Brunskill 2019; Jansen et al. 2013; Khan Academy
help centre. **Memory:** Nosofsky 1986. **Read for the 2026-11-05 set-size study:** Kellman et al. 2023.
