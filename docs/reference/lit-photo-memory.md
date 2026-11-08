# Q317: photo memory, what is validated elsewhere

> **Literature review for Q317, copied into the repo on 2026-11-09.** Written the same morning as a read-only review
> (nothing in the app changed). **Pierre's decision, 2026-11-09 (Q317)**: keep #790's conservative prior for fish
> (§6); later, a memory model of §4's form, a lasting value per outcome plus a boost that decays with the time since
> the photo was last shown, its decay shape fixed from the literature and one fitted weight, validated by §5's steps
> (rules L11, L12; the read-only table first). Rule L1 gained its photo-memory exception the same day
> ([learning rules](../rules/learning.md#l1)). Where it stands: [ROADMAP](../ROADMAP.md) "Photo memory that fades with
> time"; [LEARNING.md](../LEARNING.md) "Photo memory". The last paragraph says how the references were checked.

Literature and practice review for the photo-memory term (`core.js` `MEM`, `memBucket`, `memFam`; `model.js` `pmem`/`PMEM`;
`memRecalc`; `photoSet` repeat spreading). Read-only, repo at 7abe007 (#790) plus PR #805's description. Written 2026-11-09.

Sign convention: in the code an offset is added to the photo's difficulty (negative = easier). Below, **"help"** = −offset,
in logits, so positive help = memory makes the answer easier.

## 1. What we do now (short)

- One term per answer: `σ(ability − b − memFam)`, memFam the mean over the question's photos of a **state bucket** of
  the player's history with that photo, `[shown, right]`: new (0, the reference), shown never right, right once, right
  2+. **No time**: the bucket is the same 1 minute or 3 months after the last show. The app's `s.ps` stores only counts;
  the sheet's log has each answer's time.
- Fitted in the same Elo replay as the ratings, shrunk to the prior `MEM.PRIOR` (help 0 / 0.5 / 0.5 / 1.5) by `MEM.N` = 10.
- Coral values have moved: about help 0 / 0.44 / 1.1 / 1.7 on 550 answers (2026-11-03), then the "shown never right"
  bucket at **help −0.43** (harder than new) on 2026-11-08. Fish (#790) use the prior; on the real fish log the 13
  "shown never right" answers were 92% right vs 86% expected with the prior (74% with coral offsets), the 31 "right once"
  97% vs 86%: memory looks real and at least as large as the prior says (#790, #805; small n, per-player test p 0.56).
- Uses: expectation (Elo steps, hold, CUSUM), progress discount `pgMemW`, repeat spreading in `photoSet` (× e^offset),
  `memRecalc` fallback. The exam uses photos never shown.

## 2. What the literature and other systems do

### 2.1 Every validated memory model has time since last exposure; most have outcome too

| Model                                                                                   | Item/history term                                                                        | Lag                                                                                                 | Prior outcome                                                                                   | Item vs skill                                              |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| ACT-R declarative memory, Pavlik & Anderson 2005/2008                                   | activation m = ln Σ t_j^−d_j over past exposures                                         | yes: power decay on each exposure's age; decay d_j grows with activation at that exposure (spacing) | weights b_j by trial type/correctness (as summarised by Pelánek 2015)                           | item only (vocabulary pairs)                               |
| MCM, Mozer et al. 2009                                                                  | traces at multiple time scales                                                           | yes, multi-scale exponential mix ≈ power law                                                        | not central                                                                                     | item only                                                  |
| PFA, Pavlik, Cen & Koedinger 2009                                                       | γ·successes + δ·failures                                                                 | no (order ignored)                                                                                  | yes, separate γ, δ                                                                              | skill (KC) counts                                          |
| R-PFA, Galyardt & Goldin 2015                                                           | exponentially decayed proportion of recent successes                                     | recency by attempt order                                                                            | yes                                                                                             | skill                                                      |
| LKT, Pavlik, Eglington & Harrell-Williams 2021                                          | framework of logistic features incl. recency t^−d and ACT-R-style spacing features       | yes                                                                                                 | yes                                                                                             | both, per feature                                          |
| PFAE (Elo + PFA), Papoušek, Pelánek & Stanislav 2014; Pelánek 2015; Pelánek et al. 2017 | per learner×item knowledge K, start = Elo prior θ − b, updated +γ(1−P) right / +δP wrong | yes: prediction uses P(K + f(t)), t = seconds since last attempt on that item                       | yes (γ ≈ 2.2-2.3, δ ≈ −0.9: a miss lowers the item knowledge)                                   | **two levels: global Elo skill/prior, then item-specific** |
| DASH, Lindsey, Shroyer, Pashler & Mozer 2014                                            | Σ_w θ·log(1+correct_w) − θ'·log(1+attempts_w) on the **same item**                       | yes: expanding windows (1 h, 1 d, 7 d, 30 d, ∞)                                                     | yes (correct vs attempts)                                                                       | student ability + item difficulty + item history           |
| DAS3H, Choffin et al. 2019                                                              | same window counts but per **skill**                                                     | yes, same windows                                                                                   | yes                                                                                             | ability, item difficulty, skill easiness, skill history    |
| HLR (Duolingo), Settles & Meeder 2016                                                   | p = 2^(−Δ/h), h = 2^(Θ·x), x incl. √ counts seen / right / wrong + word indicators       | yes, Δ = lag since last seen                                                                        | yes (right and wrong counts separately)                                                         | word (lexeme) features + interaction counts                |
| FSRS / DSR (Anki since 23.10; Ye, Su & Cao 2022)                                        | stability S, difficulty D, retrievability R = (1 + f·t/S)^−w (FSRS-6)                    | yes, power law in t/S                                                                               | yes: a lapse resets S to a much smaller post-lapse value; a success grows S more when R was low | per card only                                              |

Read-outs that matter for us:

- **Lag is never left out.** The closest system to ours (Elo per learner, multiple choice with guessing, item
  memory on top) is Pelánek's geography practice. Its fitted time effect (Pelánek 2015, Fig. 2, staircase over 10 lag
  bins, about 52,000 sequences per fold, stable over 10 folds) is about **+1.5 logits at 1 minute, +0.7 at 10 minutes to
  a few hours, +0.6 at 1 day, +0.4 at 3 days, near 0 at 30 days** (read from the figure, approximate). Simple analytic
  forms (w/t, a − b·log t) were miscalibrated; a fitted staircase did best, though all variants were close
  (RMSE 0.3377 for w/t vs 0.3363 for the staircase, predictions correlated 0.97).
- Those magnitudes bracket ours: our coral 0.4-1.7 help sits where Pelánek's curve is between "same session" and
  "a day later". **A time-free bucket averages over whatever lag mix the data happen to have**, so its value moves
  when the draw changes how soon photos come back (e.g. #670/Q188 exploration share, `VARIETY`), not only when memory
  changes.
- **Outcome is modelled as two different things**: (a) a _transient_ exposure boost that decays with lag, applied
  whatever the last outcome (after a miss the answer was revealed: Pelánek's f(t) is outcome-free); (b) a _persistent_
  evidence term: successes raise, failures **lower** the item-specific estimate (PFAE δ < 0; DASH's attempts term;
  FSRS lapse). A miss is evidence that _this_ item is hard _for this learner_.
- Counts enter as log(1+n) or √n (DASH, HLR): diminishing returns, no hard "2+" cap.

### 2.2 Item memory vs concept (genus) learning

- Episodic vs semantic memory (Tulving 1972): memory of _this picture_ vs knowledge of _the genus_. Picture memory is
  huge and detailed: 10,000 pictures recognised after one viewing each (Standing 1973); 2,500 objects with fine detail
  (Brady et al. 2008). So "the player remembers the photo" is expected, and it can last days.
- Category-learning studies separate the two by testing **old vs new exemplars**: old-item advantage fades faster with
  delay than prototype/category knowledge (Posner & Keele 1970 as cited; Homa, Sterling & Trepel 1981; modelled by
  Hintzman & Ludlam 1980 with exemplar traces that lose features). That is item memory that decays with lag on top of
  slower category learning, exactly the lag-dependent structure our buckets lack.
- Natural-category training studies (painters, Kornell & Bjork 2008; bird families, Wahlheim, Dunlosky & Jacoby 2011;
  butterfly genera with adaptive sequencing and "retirement", Mettler & Kellman 2014) **judge learning on new
  exemplars**. In Mettler & Kellman 2014 familiar images had no advantage over novel ones at post-test (novel was even
  slightly better in Exp. 1): with few repeats and spacing, item memory added little to category performance. This
  supports our choices: exam on unseen photos, progress discounted for what memory explains (`pgMemW`), colony as the
  unit of "seen" (Q190, near views of one exemplar transfer).
- DASH/DAS3H and PFAE give the model-side separation: ability (genus) + item difficulty (photo, rated on first meetings)
  - item-history term (memory of that photo). **Our design already has this structure** (the genus Elo is the skill, the
    photo rating is "difficulty when new", the bucket is the item-history term).

### 2.3 Repeated items in testing (IRT/CAT)

- Retest effects are real and bigger with **identical** items than alternate forms (ΔSMCR ≈ 0.15-0.20 SD), and shrink
  with the retest interval (Scharfen, Peters & Holling 2018; overall ≈ 0.26 SD, Hausknecht et al. 2007). Lag is weak at
  the scale of weeks-years in those tests (−0.0008 SD/week), which are not memorised item by item.
- CAT avoids the problem instead of modelling it: item exposure control (Sympson-Hetter and successors; review by
  Georgiadou, Triantafillou & Economides 2007). Not applicable to a practice app with small photo pools.

### 2.4 What practical Elo-like systems do with repeats

| System                                                                  | Repeats in the ratings                                                                                                                                     | Selection                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Math Garden / Oefenweb (Klinkenberg et al. 2011; Brinkhuis et al. 2018) | No memory term found in the publications: the Elo item and person ratings use every answer                                                                 | Items sampled at the chosen success level, **avoiding recently answered items** (Brinkhuis et al. 2018, p. 31) |
| slepemapy.cz geography (Papoušek et al. 2014; Pelánek 2016, 2017)       | **Item difficulty and global skill from first answers only**; later answers go to a per learner×item PFAE with a time effect                               | Target-item score penalises short time since last question on it and many previous questions on it             |
| Duolingo                                                                | HLR (2016): per word, lag + right/wrong counts; Birdbrain (2023): logistic ability-vs-difficulty, later an RNN over history (no published repeat/lag term) | Practice scheduled by predicted recall                                                                         |
| Anki                                                                    | SM-2 (no model), FSRS optional since 23.10: per-card D/S/R with lag                                                                                        | Reviews scheduled at a target retention                                                                        |

So the three practices exist: **exclude** (Pelánek: first answers for difficulty), **avoid** (Math Garden, CAT),
**model** (PFAE, DASH, HLR, FSRS). Ours is "model + soft avoid", which is the combination Pelánek's system uses.

## 3. How our PMEM maps, and where it departs

Matches established practice:

- New-photo reference + genus ability + item-history term = DASH/PFAE decomposition.
- Outcome-dependent state (right vs not), estimated from data with a prior (DASH/DAS3H use hierarchical priors; HLR
  went to interaction-only features to avoid overfitting and cold start).
- Soft down-weighting of remembered photos in the draw; novel exemplars for the exam.

Departs:

1. **No lag** (main gap). Every model above has it; the one closest to ours measured it as the largest part of the
   item effect, from ≈1.5 logits within a minute to ≈0 after a month.
2. **Transient and persistent effects in one number.** "Shown never right" mixes (a) the boost of having seen the answer
   (positive, decays) with (b) evidence that the photo is hard for this player (negative, persists), and (c) the Elo
   catch-up bias LEARNING.md already notes. The bucket also collects photos missed 2, 3… times (it keeps them until a
   right answer), so the longer the data run, the more it is enriched in persistent failures. That is a plausible
   reading of the coral drift from help +0.44 to −0.43, and of fish (fewer, perhaps sooner repeats) still showing a
   positive effect. **A hypothesis to check on the log, not a finding.**
3. Capped counts (4 buckets) where others use log/√ counts; minor given our data.
4. Photo difficulty is fitted on every answer with the memory offset in the expectation (like HLR/PFA), where Pelánek
   fits difficulty on first answers only. Both are defensible; first-answers-only is the simpler robustness check.

## 4. Recommended model form

Keep the decomposition; add a transient, lag-decaying term and let the bucket carry only the persistent part
(PFAE/DASH structure, the fewest parameters our data can carry):

```
logit P* = θ(player, genus) − b(photo when new) + help
help     = s[bucket] + h · D(Δ)          (mean over the question's photos/colony, as memFam)
```

- `s[bucket]`: persistent, outcome-based (shown never right may be ≤ 0; right once, right 2+ > 0). Same 3 numbers as now,
  same prior/shrinkage machinery.
- `h · D(Δ)`: transient boost after any show (the answer is revealed after a miss too), Δ = time since that colony was
  last shown to the player. One fitted number h; D fixed from the literature, not fitted, to stay within rule L11:
  either DASH-style bands (D = 1 under 1 h, then 1 d, 7 d, ≥ 30 d steps) with Pelánek's measured shape as the prior
  (≈ 1 : 0.45 : 0.4 : 0.25 : 0 relative to 1 minute), or a power law D = (1 + Δ/τ)^−0.5 with τ = 1 h. Optional later:
  scale h by last outcome (2 parameters) if the log supports it.
- Total 4 parameters (now 3), all with priors. Pelánek's finding that the exact form matters little (predictions
  correlated 0.97) argues for the fixed simple D.
- Genus learning stays entirely in θ (Elo on all answers with this expectation); the item term never feeds the genus
  bar except through `pgMemW`, which would read the same `help` (so a photo seen months ago counts almost as new: that
  is what the old-vs-new-exemplar studies show).
- Draw (`photoSet`): weight × e^−help as now, so a just-shown photo is held back strongly and returns after days:
  the spacing practice of Pelánek and Math Garden, with no new rule. Note today, with the coral +0.43, a photo shown and
  missed weighs × 1.54 (favoured over seen-right ones): defensible (retest the miss) but a side effect, not a decision.
- Plumbing if adopted: the sheet log already has times; the app needs a last-shown time per photo (a third field in
  `s.ps`, merged by max). Only worth doing if step 2 below shows a gain.

## 5. What to validate (rules L11, L12)

1. **Descriptive, read-only, no code (L12)**: on the sheet's Answers tab, for each answer on a colony already shown:
   lag since last show, last outcome, bucket, number of prior misses. Tabulate observed vs expected (current coral
   offsets; prior) by lag band × bucket, coral and fish, players as the unit. Declare before looking: success above
   expectation falls with lag; "shown never right" is above expectation at short lag and at or below it at long lag or
   after 2+ misses. If repeats nearly all sit in one lag band, a lag term cannot be estimated and should not be added.
2. **Recovery on simulated logs** (as `tests/core.test.js` already does for the buckets): synthetic answers with known
   s, h and D, through `eloReplay`, check the fit recovers them, including the catch-up bias.
3. **Model comparison on the real log (L12)**: time-ordered replay, next-answer log-loss and calibration on repeat
   answers (and all answers as guardrail), current buckets vs buckets + lag, paired per player, sign-flip test, a
   time-split hold-out. Adopt only if it is better per player, not just per answer.
4. **Simulation (L11)**: the learner in `tools/learnsim.js` has bucket memory without decay (it does not fade even across
   `--breaks`), so judging a lag model there would be circular. Give the learner a decaying item memory first (Pelánek's
   curve), then run the change at level 2 (it moves the draw, the bar and the score): app world and rated world,
   primary true knowledge @300, the usual guardrails (#805 shows the beginner's plateau guardrail is the sensitive one).
5. Robustness check (cheap): photo ratings fitted on first meetings only vs today's all-answers fit; if they agree, the
   memory term is not leaking into photo difficulty.

## 6. Fish: keep the conservative prior

Consistent with the literature and with Q317's answer:

- The coral numbers are a time-free average over coral's own lag mix and failure history; transferring them to fish has
  no support (and #790 showed they predict fish worse on the "shown never right" row).
- Fish repeats are rare (≈ 2% of the first 300 questions; 45 of 1,536 logged answers), so the term barely moves fish
  learning (#790/#805), and no fish-specific fit is possible yet.
- The prior (help 0.5 / 0.5 / 1.5) is modest next to measured item-memory effects (Pelánek: 0.4-1.5 logits within
  days), and the fish log so far under-predicts rather than over-predicts remembered photos: the prior errs on the
  side of crediting knowledge, the cheaper error for a beginner (#805's plateau guardrail).
- When a per-subject `?stats=1` exists: fit fish with the same form, shrunk to the prior (as `MEM.N` does), and only
  then consider a shared cross-subject prior for h and D (memory of a picture should not depend on corals vs fish; the
  persistent s[bucket] may).

## References

- Brady, T. F., Konkle, T., Alvarez, G. A., & Oliva, A. (2008). Visual long-term memory has a massive storage capacity
  for object details. _PNAS_, 105(38), 14325-14329. https://pmc.ncbi.nlm.nih.gov/articles/PMC2533687/
- Bicknell, K., Brust, C., & Settles, B. (2023). How Duolingo's AI learns what you need to learn. _IEEE Spectrum_.
  https://spectrum.ieee.org/duolingo
- Brinkhuis, M. J. S., Savi, A. O., Hofman, A. D., Coomans, F., van der Maas, H. L. J., & Maris, G. (2018). Learning as
  it happens: A decade of analyzing and shaping a large-scale online learning system. _Journal of Learning Analytics_,
  5(2), 29-46. https://learning-analytics.info/index.php/JLA/article/view/5796
- Choffin, B., Popineau, F., Bourda, Y., & Vie, J.-J. (2019). DAS3H: Modeling student learning and forgetting for
  optimally scheduling distributed practice of skills. _EDM 2019_. https://arxiv.org/abs/1905.06873
- Galyardt, A., & Goldin, I. (2015). Move your lamp post: Recent data reflects learner knowledge better than older data.
  _Journal of Educational Data Mining_, 7(2), 83-108. https://zenodo.org/records/3554672
- Georgiadou, E., Triantafillou, E., & Economides, A. A. (2007). A review of item exposure control strategies for
  computerized adaptive testing developed from 1983 to 2005. _Journal of Technology, Learning, and Assessment_, 5(8).
  https://ejournals.bc.edu/index.php/jtla/article/view/1647
- Hausknecht, J. P., Halpert, J. A., Di Paolo, N. T., & Moriarty Gerrard, M. O. (2007). Retesting in selection: A
  meta-analysis of coaching and practice effects for tests of cognitive ability. _Journal of Applied Psychology_, 92(2),
  373-385. https://doi.org/10.1037/0021-9010.92.2.373
- Hintzman, D. L., & Ludlam, G. (1980). Differential forgetting of prototypes and old instances: Simulation by an
  exemplar-based classification model. _Memory & Cognition_, 8(4), 378-382. https://doi.org/10.3758/BF03198278
- Homa, D., Sterling, S., & Trepel, L. (1981). Limitations of exemplar-based generalization and the abstraction of
  categorical information. _JEP: Human Learning and Memory_, 7(6), 418-439. Record:
  https://swov.nl/en/publicatie/limitations-exemplar-based-generalization-and-abstraction-categorical-information
  (abstract-level only)
- Klinkenberg, S., Straatemeier, M., & van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using
  a new item response model for on the fly ability and difficulty estimation. _Computers & Education_, 57(2),
  1813-1824. https://doi.org/10.1016/j.compedu.2011.02.003
- Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: Is spacing the "enemy of induction"?
  _Psychological Science_, 19(6), 585-592. https://pubmed.ncbi.nlm.nih.gov/18578849/
- Lindsey, R. V., Shroyer, J. D., Pashler, H., & Mozer, M. C. (2014). Improving students' long-term knowledge retention
  through personalized review. _Psychological Science_, 25(3), 639-647. https://doi.org/10.1177/0956797613504302
  (PDF: https://home.cs.colorado.edu/~mozer/Research/Selected%20Publications/reprints/LindseyShroyerPashlerMozer2014.pdf;
  DASH's form here is as restated by Choffin et al. 2019, the original PDF did not load)
- Mettler, E., & Kellman, P. J. (2014). Adaptive response-time-based category sequencing in perceptual learning.
  _Vision Research_, 99, 111-123. https://pmc.ncbi.nlm.nih.gov/articles/PMC6124487/
- Mozer, M. C., Pashler, H., Cepeda, N., Lindsey, R., & Vul, E. (2009). Predicting the optimal spacing of study: A
  multiscale context model of memory. _NIPS 22_, 1321-1329. https://www.yorku.ca/ncepeda/publications/MPCLV2009.pdf
- Open Spaced Repetition. The FSRS algorithm (FSRS-4.5 to FSRS-6 formulas). Wiki.
  https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm (FSRS in Anki from 23.10:
  https://forums.ankiweb.net/t/anki-23-10-beta-1-4/34912)
- Papoušek, J., Pelánek, R., & Stanislav, V. (2014). Adaptive practice of facts in domains with varied prior knowledge.
  _EDM 2014_. https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf
- Pavlik, P. I., & Anderson, J. R. (2005). Practice and forgetting effects on vocabulary memory: An activation-based
  model of the spacing effect. _Cognitive Science_, 29, 559-586. https://doi.org/10.1207/s15516709cog0000_14
- Pavlik, P. I., & Anderson, J. R. (2008). Using a model to compute the optimal schedule of practice. _JEP: Applied_,
  14(2), 101-117. https://doi.org/10.1037/1076-898X.14.2.101
- Pavlik, P. I., Cen, H., & Koedinger, K. R. (2009). Performance factors analysis: A new alternative to knowledge
  tracing. _AIED 2009_, 531-538. https://researchr.org/publication/PavlikCK09
- Pavlik, P. I., Eglington, L. G., & Harrell-Williams, L. M. (2021). Logistic knowledge tracing: A constrained framework
  for learner modeling. _IEEE Transactions on Learning Technologies_, 14(5), 624-639. https://arxiv.org/abs/2005.00869
- Pelánek, R. (2015). Modeling students' memory for application in adaptive educational systems. _EDM 2015_, 480-483.
  https://www.educationaldatamining.org/EDM2015/proceedings/short480-483.pdf
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. _Computers & Education_,
  98, 169-179. https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf
- Pelánek, R., Papoušek, J., Řihák, J., Stanislav, V., & Nižnan, J. (2017). Elo-based learner modeling for the adaptive
  practice of facts. _User Modeling and User-Adapted Interaction_, pp. 89-118, https://doi.org/10.1007/s11257-016-9185-7.
  Preprint: https://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf (volume: 27 by my recollection,
  26 in search snippets; check the DOI)
- Posner, M. I., & Keele, S. W. (1970). Retention of abstract ideas. _Journal of Experimental Psychology_, 83(2),
  304-308. (Not read; cited for differential forgetting of old exemplars vs prototype through later papers.)
- Scharfen, J., Peters, J. M., & Holling, H. (2018). Retest effects in cognitive ability tests: A meta-analysis.
  _Intelligence_, 67, 44-66. https://doi.org/10.1016/j.intell.2018.01.003
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. _ACL 2016_, 1848-1858.
  https://aclanthology.org/P16-1174/ (code and data: https://github.com/duolingo/halflife-regression)
- Standing, L. (1973). Learning 10,000 pictures. _Quarterly Journal of Experimental Psychology_, 25(2), 207-222.
  https://doi.org/10.1080/14640747308400340
- Tulving, E. (1972). Episodic and semantic memory. In E. Tulving & W. Donaldson (Eds.), _Organization of Memory_
  (pp. 381-403). Academic Press. (Standard citation, not re-read.)
- Wahlheim, C. N., Dunlosky, J., & Jacoby, L. L. (2011). Spacing enhances the learning of natural concepts: An
  investigation of mechanisms, metacognition, and aging. _Memory & Cognition_, 39, 750-763.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3085105
- Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling.
  _KDD 2022_, 4381-4390. https://dblp1.uni-trier.de/rec/conf/kdd/YeSC22.html

Read in full or in part for this review: Papoušek et al. 2014, Pelánek 2015, 2016, 2017, Settles & Meeder 2016, Choffin
et al. 2019, Brinkhuis et al. 2018, Scharfen et al. 2018, Mettler & Kellman 2014, the FSRS wiki, the IEEE Spectrum
article. The others were checked by bibliographic record or abstract only. Not found: any published memory/repeat
term in Math Garden's Elo, and the details of a "PFA with decay" by Gong, Beck & Heffernan (left out).
