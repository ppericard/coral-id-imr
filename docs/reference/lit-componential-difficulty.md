# Q316: one difficulty per question, split into family, genus, species and photo components (literature and practice review)

> **Literature review for Q316 (with Q136), copied into the repo on 2026-11-09.** Written the same morning as a
> read-only review (nothing in the app changed). **Pierre's decision, 2026-11-09 (Q316)**: a componential difficulty
> model as an evolution of the current Elo engine, one difficulty per question = rank offset + family + genus +
> species + photo components, each shrunk toward its parent while it has few answers; the online update splits the
> surprise among the components by their uncertainty (the TrueSkill / simplified Kalman rule of §5); with only genus +
> photo it must reproduce today's v31 ratings within rounding; the genus and species parts count at family rank too
> (§8 point 1: yes); the order of §8 point 3 (the offline fit first, read-only, then the sheet, then the app); rule
> L11. **Q136** (§6) reopened for rework on today's multi-level engine and folded into this work: check on our data
> whether the per-genus player ability can be taken as centred on zero across players. Where it stands:
> [ROADMAP](../ROADMAP.md) "Engine coherence review"; [LEARNING.md](../LEARNING.md) "Hierarchical photo Elo". Each
> reference says how it was checked.

Read-only review, 2026-11-09 (Manila 06:03). Nothing in the repo was edited. Source marks: **[full text]** read,
**[abstract]** abstract or index record only, **[memory]** not re-fetched this session (a fetch failed), **[secondary]** as
another paper cites it.

## 1. Short answer

What Pierre describes, one difficulty made of the sum of the taxon levels' components plus the photo's own, has a name
and a 50-year literature. Fischer's **linear logistic test model** (LLTM, 1973) splits a Rasch item difficulty into a
sum of component difficulties. Its **random-item** versions add an error term and treat the components as random
effects shrunk toward their parent group: the LLTM with an error term (Janssen, Schepers & Peres 2004; De Boeck 2008),
hierarchical item families and item cloning (Janssen et al. 2000; Glas & van der Linden 2003; Sinharay, Johnson &
Williamson 2003; Geerlings, Glas & van der Linden 2011), and cross-classified multilevel IRT (Van den Noortgate, De Boeck
& Meulders 2003). For a nested taxonomy, the fitting model is therefore a **nested random item model** (photo inside
species inside genus inside family) with the rank asked as a **facet** (Linacre's many-facet Rasch model). It is
estimated offline as a GLMM and online as an Elo or Kalman-style update that splits each surprise among the additive
components. Pelánek's hierarchical Elo (Nižnan, Pelánek & Řihák 2015; Pelánek et al. 2017) is the person-side twin, and
TrueSkill, with Szczecinski & Tihon's simplified Kalman filter, gives the rule for updating several additive components
from one result.

Our sheet already runs the two-level special case: since v31, a photo's difficulty is its genus offset `gd` plus the
photo's own residual. The proposal below adds levels and a rank offset to that same equation. It is not a new invention.

I found **no published taxonomic (family / genus / species) difficulty model in a species-ID learning app**. The parts
are established; putting them together for a taxonomy is ours to validate.

## 2. What the code does today (read in the repo)

- **Expectation**: P = g + (1 − g)·σ(θ − b − mem), with g = 1/k plausible choices, the per-format offsets (sheet v77),
  and +0.5 for a single view (`Code.gs` `stats_`, `core.js` `eloReplay`, kept in step by `tests/core.test.js`).
- **Photo Elo (v31, "Hierarchical photo Elo")**: b = G[genus shown] + P[photo]. Each trusted answer, with surprise d
  and trust weight w = n/(n+10), moves the photo residual by 0.8/(1 + n_photo/10)/photos·d·w and the genus offset by
  `GENUS_K` 0.4/(1 + n_genus/10)·d·w. The **person term is the sheet's own single chain `R`**: PLAYER0 −1,
  K 0.6/(1 + n/40). It is not the player's genus ability that the app used to pick the photo. That is Q136.
- **App** (`model.js`): `photoDiff` = (n·rating + 5·prior)/(n + 5), with prior = gd[unit] + (3 − ease)·calib for
  judged fish photos. `genusDiff` = gd[unit] (+ the mean judged-ease prior for fish), read by the draw, shaky, the
  comeback and `openPick`.
- **Fish**: every answer has been logged since sheet v60, with the columns Subject, Rank (family / genus, later
  species), Taxon shown, Taxon answered and Species shown. The sheet now replays the fish _progress_ (v111-v112), but
  no fish photo statistics are computed yet: there is no per-subject `?stats=1` (ROADMAP admin plan row 11, "keyed by
  rank"). Fish photos start from their judged ease. The coherence review's F8 says: "photo difficulty must be keyed by
  (photo, rank) or carry a rank offset"; photo memory is per unit, so a photo seen as Damselfish is new as `g:Chromis`.
- **Q136 already measured once**: P2 in "Per-format offsets" (photos rated against the genus ability) gave no log-loss
  gain (Holm, p 0.60). With that rating, #637 found the SD of `gd` falling from 0.370 to 0.286 (`RATED.CORAL_GD`).
- **The rated world** (`tools/ratedworld.js` `RATED`) already draws this generative model for fish: family
  μ ~ N(0, 0.37²), genus and species μ = parent + N(0, 0.3²), photo ε ~ N(0, 0.46²), player π ~ N(0, 0.5²). It has no
  explicit rank offset: a genus unit's photo is μ_genus + ε.

## 3. The established models, and what each brings

| Family of models                                 | Key sources                                                                                                                                                                                                                                                                     | What it gives us                                                                                                                                        | Fit for us                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LLTM** (fixed components)                      | Fischer 1973                                                                                                                                                                                                                                                                    | b_i = Σ_k q_ik·η_k: item difficulty as a weighted sum of component difficulties                                                                         | The structure, yes. Fixed components with no residual are too rigid: in Fischer's own data the LLTM fit the Rasch difficulties "only approximately" (r 0.87)                     |
| **LLTM + error / random items; explanatory IRT** | De Boeck & Wilson 2004 (book); Janssen, Schepers & Peres 2004 (item and item-group predictors, LLTM-R); De Boeck 2008 (random item IRT); Mislevy 1988 (collateral item information, empirical Bayes)                                                                            | b_i = predicted part + ε_i, ε_i ~ N(0, σ²): each item is **shrunk toward what its group and features predict**                                          | **Yes, the core.** Our photo residual is ε_i. The judged ease enters as an item covariate, Mislevy's "auxiliary information"                                                     |
| **Nested item families / item cloning**          | Janssen, Tuerlinckx, Meulders & De Boeck 2000 (items nested in criteria); Glas & van der Linden 2003; Sinharay, Johnson & Williamson 2003 (family expected response functions); Geerlings, Glas & van der Linden 2011 (rule-based generation + cloning, crossed random effects) | Items vary randomly around a family mean; families vary around a higher mean                                                                            | **Yes.** A photo is a "clone" of its species, a species of its genus, and so on. Geerlings et al. combine rules (features) with clone variation, which is our ease plus taxonomy |
| **Cross-classified multilevel IRT / GLMM**       | Van den Noortgate, De Boeck & Meulders 2003; Baayen, Davidson & Bates 2008; De Boeck et al. 2011 (lme4)                                                                                                                                                                         | Persons and items as crossed random effects, item groups as nested random effects; variance components say _how much_ each level explains               | **Yes, for the offline fit** and for Pierre's "why is this photo hard": the variance shares                                                                                      |
| **Many-facet Rasch**                             | Linacre 1989                                                                                                                                                                                                                                                                    | logit = θ − b_item − c_facet (rater, task, occasion)                                                                                                    | **Yes, for the rank asked**: a rank offset r_k, the same family as our per-format and single-view offsets                                                                        |
| **Testlets**                                     | Bradlow, Wainer & Wang 1999; Wainer, Bradlow & Wang 2007                                                                                                                                                                                                                        | A random person × item-group effect γ_{p,t} ~ N(0, σ_t²) for items sharing a stem                                                                       | **The person side of Q136**: a player's genus deviation is a testlet effect, which must be random and centred on 0                                                               |
| **Componential / conjunctive and sequential**    | Whitely (Embretson) 1980 (MLTM, product of component probabilities); Embretson 1984 (GLTM); Tutz 1990 (sequential model)                                                                                                                                                        | P(species right) = P(family)·P(genus given family)·P(species given genus); partial credit when the family was right                                     | **Later, not now.** It needs step-level responses. Our "Taxon answered" makes a species question scorable step by step once species exist; too many parameters for 1,500 answers |
| **AFM / PFA (knowledge tracing)**                | Cen, Koedinger & Junker 2006 (LFA/AFM); Pavlik, Cen & Koedinger 2009 (PFA)                                                                                                                                                                                                      | logit = θ_p + Σ_{KC in item}(β_KC + γ_KC·opportunities): **several knowledge components add up in one logit**                                           | Same additive idea on the skill side. Supports summing the taxon levels' components; AFM fits offline by logistic regression                                                     |
| **Hierarchical / multivariate Elo**              | Pelánek 2016 §2.4; Nižnan, Pelánek & Řihák 2015; Pelánek et al. 2017 §4.3; Doebler, Alavash & Giessing 2014/15; Abdi et al. 2019 (M-Elo); Park et al. 2019 (M-ERS)                                                                                                              | Global skill + concept skill, **the item updated against the combined prediction**                                                                      | The online form, and the answer to Q136 (§6)                                                                                                                                     |
| **Several additive components from one result**  | Herbrich, Minka & Graepel 2007 (TrueSkill); Szczecinski & Tihon 2023 (Elo, Glicko and TrueSkill as approximate Kalman filters)                                                                                                                                                  | Team performance = sum of the players' performances; **each player's mean moves in proportion to its own variance**                                     | **The update rule**: one surprise split among family, genus, species, photo and rank by their uncertainties                                                                      |
| **Elo under adaptive selection**                 | Bolsinova, Gergely & Brinkhuis 2025 **[full text]**                                                                                                                                                                                                                             | Online calibration with adaptive selection inflates the rating variance and does not converge; larger K is worse; the fix is parallel chains or Urnings | A caution for any online version. Remedy: periodic offline refits as priors                                                                                                      |

**Practice.** Pelánek's geography systems use concepts on the _person_ side, with one Elo difficulty per item. Math
Garden uses one Elo per item (Klinkenberg et al. 2011), plus Urnings. Santos-Fernandez & Mengersen (arXiv 2020) fit
Bayesian IRT to citizen-science species identification, with species-level and site-level difficulty but no taxonomic
nesting. The iNat Quiz lets users pick the rank asked, and difficulty by rank is only a forum suggestion there. A 2025
_Ecological Informatics_ bird-song quiz paper tunes how often each species is asked; I did not verify its authors.
Cognitive science says the rank effect depends on expertise. Experts name at the subordinate level as fast as at the
basic level (Tanaka & Taylor 1991; Johnson & Mervis 1997; basic level: Rosch et al. 1976 **[memory]**). So the rank
offset may shrink as ability grows. That is a rank × ability interaction to _test_, not to build.

## 4. Which model fits our case

Our constraints: online (the sheet replays the log), few answers per photo (about 1,500 fish answers from 9 players,
thousands of photos, mostly 0-1 answers each), 65 families, about 130 genera, species not yet asked.

1. **Random (shrunk) components, not fixed effects.** With 0-1 answers per photo, a fixed-effect LLTM or a per-photo
   Rasch overfits. The random-item LLTM-R and nested-family models exist for exactly this case.
2. **Additive (compensatory), not conjunctive.** The product model (MLTM) needs step-level responses and doubles the
   parameters.
3. **Rank as a facet with shared components**, not separate (photo, rank) ratings. Keying by (photo, rank), F8's
   first option, splits already sparse cells three ways. A rank offset pools them.
4. **The size of the data limits what can be learned.** The information in one answer at about 80% right with 4
   choices is h ≈ 0.15. A component with prior SD σ gets as much weight from its own data as from the prior after
   n ≈ 1/(h·σ²) answers: about **50 per family** (σ 0.37), **75 per genus or species** (σ 0.3) and **30 per photo**
   (σ 0.46), using the rated world's SDs. With about 1,500 fish answers, family offsets are partly learned, genus and
   species ones barely, and photo residuals are almost all prior (judged ease). **Expect only the family and photo
   variances to be separable today.** That is no argument against the model: shrinkage makes the extra levels harmless
   (they stay near 0) and lets them grow as answers come.

## 5. Proposed model

**Expectation** (unchanged in form):

    P(right) = g_q + (1 − g_q) · σ(η_q),        g_q = 1 / plausible choices
    η_q = θ_p + δ_{p,u(q)} − b_q − f_format(q) − mem_{p,photo}

**One difficulty per question, decomposed:**

    b_q = r_{rank(q)} + b_F + b_G + b_S + b_I            ("shared chain", recommended)

- r_rank: rank offset (family = 0 as the reference, genus and species fitted). A facet, like `f_format` and the +0.5
  single view.
- b_F ~ N(0, σ_F²), b_G ~ N(0, σ_G²), b_S ~ N(0, σ_S²): the family's, genus's and species's own parts, each a residual
  around its parent. Sum to the parent; start at 0, i.e. at the parent.
- b_I ~ N(β·(3 − ease_I), σ_I²): the photo's own part, its prior mean from the judged ease (Mislevy's collateral
  information; today's (3 − e)·calib).
- **All components count whatever the rank asked.** A photo of a species atypical of its family is hard at family
  rank too, which is Pierre's "hard because the species is hard". It also pools all the family-rank answers, almost
  the whole log, into genus and species estimates.
- **Unit difficulty** (what `gd` / `genusDiff` serve): D(u) = r_rank(u) + the components from the family down to u.
  Photo difficulty = D(species) + b_I. Corals: b_q = b_G + b_I (+ single view): exactly v31.
- **Candidate extension, only if the data ask for it**: a "tell it from its siblings" term asked only at deeper ranks,
  b_q += 1[rank ≥ genus]·c_G + 1[rank = species]·c_S. Chromis is easy to see as a damselfish and hard to tell from
  _Pomacentrus_. This is the nested-by-rank, sequential view. Add it when the offline fit shows σ_c clearly above 0
  and leave-one-player-out (LOPO) log-loss improves on genus-rank answers.
- **Person side** (Q136, §6): θ_p global + δ_{p,u} per unit, δ ~ N(0, τ²), **centred on 0 across players**.

**Online update on the sheet** (a Kalman / TrueSkill-style split, one pass over the log as `stats_` does now). Each
component c on the question's path keeps a mean m_c and a variance v_c (prior σ_level²). For a trusted answer:

    s = σ(η), e = g + (1−g)s, d = ok − e
    a = (1−g)·s(1−s) / (e(1−e))           # gradient of the log-likelihood in η, per unit of d
    h = (1−g)²·s²(1−s)² / (e(1−e))        # Fisher information (core.js infoAt)
    V = Σ_{c on path} v_c
    for each c:  m_c ← m_c − w·v_c·a·d / (1 + w·V·h)
                 v_c ← v_c − w·v_c²·h / (1 + w·V·h)

- **What it does.** The surprise goes mostly to the uncertain parts: a new photo or a rarely asked species takes
  most of it, a well-known family little. Shrinkage toward the parent needs no rule of its own. A component with no
  answers sits at its prior.
- **Today's rule as a special case.** v31 is this update with v_photo : v_genus fixed at 2 : 1 (0.8 vs `GENUS_K` 0.4)
  and count-based decay 1/(1 + n/10).
- **Fewer hand-set constants (rule L11).** `GENUS_K`, 0.8, the two dampings of 10 and the app's blend W 5 become one
  prior SD per level, fitted offline. The app's blend then double-shrinks, since the sheet's mean is already a
  posterior mean, and goes.
- **Cost.** O(levels) per answer and two numbers per component, well within `stats_`'s full replay.
- **What it assumes.** It is approximate: diagonal, ignoring the correlations between parent and child estimates, and
  order-dependent. Bolsinova et al. warn that online calibration under adaptive selection inflates the ratings.
  Remedy: an **offline refit at each Analyses milestone**, served as the priors and starting means (the algorithms
  review's step 2). The online pass then only carries what happened since.

**Offline fit (the reference and the source of the σ's).**

- The GLMM above with a per-answer guess floor, players crossed with the nested taxonomy and rank as a fixed effect.
- Where to fit it: the admin's `analysis.js`, which already fits crossed player / genus / photo effects with a guess
  floor, extended to the nested levels; or Stan / brms with a nonlinear formula and g as data.
- Plain `lme4` cannot take a per-row guess floor. psyphy's `mafc.logit` takes one fixed number of choices and is
  documented for `glm` only. Untested with `glmer`.
- Outputs: σ_F, σ_G, σ_S, σ_I, r_genus, τ, with intervals. **The variance shares are the decomposition Pierre asked
  for**: how much of photo difficulty is family, genus, species or the photo itself. On today's data, report them with
  their intervals and expect wide ones.

**Data needed**: in the log already since v60 (Subject, Rank, Taxon shown, Species shown). Family and genus come from
fish.json through the species. Photo memory must be keyed by photo across ranks (F8).

## 6. Q136: rate each photo against the player's genus-specific ability?

**The literature supports it, with one condition.**

- Nižnan et al. 2015 and Pelánek et al. 2017 (§4.3) predict with σ((θ_global + θ_concept) − d) and update d against
  **that same prediction**. Park et al. 2019 (M-ERS) and Abdi et al. 2019 (M-Elo) update several abilities at once
  and predict better than one ability when the data are multidimensional (Park: simulated, random selection). Testlet
  models (Bradlow et al. 1999) give the statistical form: a person × group effect.
- **The condition: the person × unit term must be random with mean 0 across players.** Otherwise it is confounded with
  the unit's difficulty: "everyone is weak on _Favites_" and "_Favites_ is hard" cannot be told apart. The drop in the
  `gd` SD from 0.370 to 0.286 that #637 saw is this confound: some genus difficulty moved into the players' genus
  abilities.
- **Prediction gains are small everywhere.** Nižnan et al.: RMSE 0.4076 → 0.4053, AUC 0.748 → 0.755. Pelánek 2016:
  "only small improvement". Our own P2: p 0.60. The case for Q136 is consistency, not log-loss: the photo is rated
  against the expectation that chose it, so the difficulty scale is less compressed.
- **Bolsinova et al. 2025 does not cover it.** They do not analyse multidimensional abilities, or rating items against
  a different ability than the selection used (checked in the full text; only a footnote mentions MIRT). Their
  inflation comes from selection depending on the current errors, which matching dimensions does not remove.

**Recommendation**: fold Q136 into Q316. Use η = θ_p + δ_{p,u} − b_q with δ centred, for example its population mean
per unit subtracted before the item update, or kept at prior mean 0 with its own variance. Validate both as below.

## 7. What to validate (rules L11-L12)

- **Level**: 2 at least. It changes photo and unit difficulty, so the draw, the aim, `genusDiff` and the opening, for
  fish and corals. **Level 3** for any σ or rank offset _chosen_ rather than estimated. Fitted values are confirmed on
  held-out players instead.
- **Real log** (L12, players as the unit, scored before the answer moves anything, LOPO). Compare four models:
  1. today's fish prior (judged ease only);
  2. a v31-style unit + photo keyed by the unit shown;
  3. the shared chain (§5);
  4. the shared chain + c_G.

  Declare the primary before running: next-answer log-loss on **fish answers to photos with fewer than 3 earlier
  answers** (where pooling should help), exact sign-flip test over the players. Report, as exploratory: genus-rank
  answers (cross-rank transfer), calibration by rank, format and level band, and the variance shares with intervals.

- **Corals: no-regression parity.** With the levels collapsed (genus + photo, no rank), the new update must reproduce
  v31 within rounding where the variances mimic its K's (`tests/core.test.js`: `Code.gs` against `core.js`).
- **Rated world** (`ratedworld.js` draws the same generative model). Add an explicit r_genus and the species level,
  then run 10 seeds per profile, 3,000-10,000 answers, under adaptive selection, and check:
  1. **parameter recovery** per level: correlation and RMSE of the estimated against the true component;
  2. **compression**: the slope of estimated b on true b, 1 = none;
  3. **the spread of the ratings over time** (Bolsinova's inflation);
  4. Q136: rating against θ, against θ + δ and against θ + centred δ.
- **Guardrails**: the usual L11 table (true knowledge, units met, progress gap), since `photoDiff` feeds the draw.

## 8. Open points for Pierre (answered 2026-11-09, Q316: see the note at the top)

1. **Do the genus and species components also count when the question is asked at family rank?** Recommended: yes
   (the shared chain), with the sibling term c_G only if the data show it.
2. **Fold Q136 into this change**, with the person × unit term centred? Recommended: yes.
3. **Order of work.** Recommended:
   1. the offline fit first (variance shares on today's fish log; read-only, no app change);
   2. then the sheet's per-subject `?stats=1` with the shared chain;
   3. then the app reads the unit difficulty D(u) in place of `gd`.

## References

- Abdi, S., Khosravi, H., Sadiq, S., Gašević, D. (2019). A multivariate Elo-based learner model for adaptive
  educational systems. _EDM 2019_. https://arxiv.org/abs/1910.12581 **[abstract]**
- Baayen, R. H., Davidson, D. J., Bates, D. M. (2008). Mixed-effects modeling with crossed random effects for subjects
  and items. _Journal of Memory and Language_ 59(4), 390-412. https://doi.org/10.1016/j.jml.2007.12.005 **[abstract]**
- Bolsinova, M., Gergely, B., Brinkhuis, M. J. S. (2025). Keeping Elo alive: evaluating and improving measurement
  properties of learning systems based on Elo ratings. _British Journal of Mathematical and Statistical Psychology_
  79(1), 95-110. https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335/ **[full text]**
- Bradlow, E. T., Wainer, H., Wang, X. (1999). A Bayesian random effects model for testlets. _Psychometrika_ 64(2),
  153-168. https://doi.org/10.1007/BF02294533 **[abstract]**
- Cen, H., Koedinger, K., Junker, B. (2006). Learning Factors Analysis: a general method for cognitive model evaluation
  and improvement. _ITS 2006_, LNCS 4053, 164-175. https://link.springer.com/doi/10.1007/11774303_17 **[abstract]**
- De Boeck, P. (2008). Random item IRT models. _Psychometrika_ 73(4), 533-559. https://doi.org/10.1007/s11336-008-9092-x
  **[abstract]**
- De Boeck, P., Bakker, M., Zwitser, R., Nivard, M., Hofman, A., Tuerlinckx, F., Partchev, I. (2011). The estimation of
  item response models with the lmer function from the lme4 package in R. _Journal of Statistical Software_ 39(12).
  https://www.jstatsoft.org/v039/i12 **[abstract]**
- De Boeck, P., Wilson, M. (Eds.) (2004). _Explanatory Item Response Models: A Generalized Linear and Nonlinear
  Approach_. Springer. https://link.springer.com/book/10.1007/978-1-4757-3990-9 **[abstract]**
- Doebler, P., Alavash, M., Giessing, C. (2014, cited so by Pelánek 2016; Behavior Research Methods, volume not
  verified). Adaptive experiments with a multivariate Elo-type algorithm. **[secondary]**
- Embretson, S. E. (1984). A general latent trait model for response processes. _Psychometrika_ 49, 175-186.
  **[secondary]**, cited with Whitely 1980
- Fischer, G. H. (1973). The linear logistic test model as an instrument in educational research. _Acta Psychologica_
  37(6), 359-374. https://doi.org/10.1016/0001-6918(73)90003-6 **[abstract]**
- Geerlings, H., Glas, C. A. W., van der Linden, W. J. (2011). Modeling rule-based item generation. _Psychometrika_
  76(2), 337-359. https://doi.org/10.1007/s11336-011-9204-x **[abstract]**
- Glas, C. A. W., van der Linden, W. J. (2003). Computerized adaptive testing with item cloning. _Applied Psychological
  Measurement_ 27(4), 247-261 (the Twente record says 249-263). https://doi.org/10.1177/0146621603027004001 **[abstract]**
- Herbrich, R., Minka, T., Graepel, T. (2007). TrueSkill: a Bayesian skill rating system. _NIPS 19 (2006)_.
  https://papers.nips.cc/paper_files/paper/2006/file/f44ee263952e65b3610b8ba51229d1f9-Paper.pdf **[memory]** for the
  sum-of-performances model and the variance-weighted update (the PDF returned 503 this session)
- Janssen, R., Schepers, J., Peres, D. (2004). Models with item and item group predictors. In De Boeck & Wilson (Eds.),
  _Explanatory Item Response Models_, ch. 6, 189-212. https://doi.org/10.1007/978-1-4757-3990-9_6 **[abstract]**
- Janssen, R., Tuerlinckx, F., Meulders, M., De Boeck, P. (2000). A hierarchical IRT model for criterion-referenced
  measurement. _Journal of Educational and Behavioral Statistics_ 25(3), 285-306.
  https://doi.org/10.3102/10769986025003285 **[abstract]**
- Johnson, K. E., Mervis, C. B. (1997). Effects of varying levels of expertise on the basic level of categorization.
  _Journal of Experimental Psychology: General_ 126(3), 248-277. https://doi.org/10.1037/0096-3445.126.3.248 **[abstract]**
- Klinkenberg, S., Straatemeier, M., van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using a
  new item response model for on the fly ability and difficulty estimation. _Computers & Education_ 57(2), 1813-1824.
  https://doi.org/10.1016/j.compedu.2011.02.003 (in LEARNING.md)
- Linacre, J. M. (1989). _Many-Facet Rasch Measurement_. Chicago: MESA Press. **[abstract]** (catalogue records)
- Mislevy, R. J. (1988). Exploiting auxiliary information about items in the estimation of Rasch item difficulty
  parameters. _Applied Psychological Measurement_ 12(3), 281-296. https://doi.org/10.1177/014662168801200306 **[abstract]**
- Nižnan, J., Pelánek, R., Řihák, J. (2015). Student models for prior knowledge estimation. _EDM 2015_, 109-116.
  https://www.educationaldatamining.org/EDM2015/proceedings/full109-116.pdf **[full text]** (§2.3 equations, Table 1)
- Park, J. Y., Cornillie, F., van der Maas, H. L. J., Van den Noortgate, W. (2019). A multidimensional IRT approach for
  dynamically monitoring ability growth in computerized practice environments. _Frontiers in Psychology_ 10, 620.
  https://doi.org/10.3389/fpsyg.2019.00620 **[full text]**
- Park, J. Y., Joo, S.-H., Cornillie, F., van der Maas, H. L. J., Van den Noortgate, W. (2019). An explanatory item
  response theory method for alleviating the cold-start problem in adaptive learning environments. _Behavior Research
  Methods_ 51(2), 895-909. https://doi.org/10.3758/s13428-018-1166-9 **[abstract]** (person covariates)
- Pavlik, P. I., Cen, H., Koedinger, K. R. (2009). Performance Factors Analysis: a new alternative to knowledge tracing.
  _AIED 2009_, FAIA 200, 531-538. https://researchr.org/publication/PavlikCK09 **[abstract]**
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. _Computers & Education_ 98,
  169-179. https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf **[full text]** (§2.4 multivariate extension)
- Pelánek, R., Papoušek, J., Řihák, J., Stanislav, V., Nižnan, J. (2017). Elo-based learner modeling for the adaptive
  practice of facts. _User Modeling and User-Adapted Interaction_ 27 (LEARNING.md; one index says 26(1)), 89-118.
  https://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf **[full text]** (§4.3 hierarchical model)
- Pliakos, K., Joo, S.-H., Park, J. Y., Cornillie, F., Vens, C., Van den Noortgate, W. (2019). Integrating machine
  learning into item response theory for addressing the cold start problem in adaptive learning systems. _Computers &
  Education_ 137, 91-103. https://doi.org/10.1016/j.compedu.2019.04.009 **[abstract]** (item features for new items)
- Rosch, E., Mervis, C. B., Gray, W. D., Johnson, D. M., Boyes-Braem, P. (1976). Basic objects in natural categories.
  _Cognitive Psychology_ 8, 382-439. **[memory]**
- Santos-Fernandez, E., Mengersen, K. (2020). Bayesian item response models for citizen science ecological data.
  arXiv:2003.06966. https://arxiv.org/abs/2003.06966 **[abstract]** (journal version not verified)
- Sinharay, S., Johnson, M. S., Williamson, D. M. (2003). Calibrating item families and summarizing the results using
  family expected response functions. _Journal of Educational and Behavioral Statistics_ 28(4), 295-313.
  https://ideas.repec.org/a/sae/jedbes/v28y2003i4p295-313.html **[abstract]**
- Szczecinski, L., Tihon, R. (2023). Simplified Kalman filter for on-line rating: one-fits-all approach. _Journal of
  Quantitative Analysis in Sports_ 19(4). https://doi.org/10.1515/jqas-2021-0061 ; https://arxiv.org/abs/2104.14012
  **[abstract]**
- Tanaka, J. W., Taylor, M. (1991). Object categories and expertise: is the basic level in the eye of the beholder?
  _Cognitive Psychology_ 23(3), 457-482. https://doi.org/10.1016/0010-0285(91)90016-H **[abstract]**
- Tutz, G. (1990). Sequential item response models with an ordered response. _British Journal of Mathematical and
  Statistical Psychology_ 43(1), 39-55. https://doi.org/10.1111/j.2044-8317.1990.tb00925.x **[abstract]**
- Van den Noortgate, W., De Boeck, P., Meulders, M. (2003). Cross-classification multilevel logistic models in
  psychometrics. _Journal of Educational and Behavioral Statistics_ 28(4), 369-386.
  https://doi.org/10.3102/10769986028004369 **[abstract]**
- Wainer, H., Bradlow, E. T., Wang, X. (2007). _Testlet Response Theory and Its Applications_. Cambridge University
  Press. **[abstract]**
- Whitely, S. E. (1980). Multicomponent latent trait models for ability tests. _Psychometrika_ 45(4), 479-494.
  https://doi.org/10.1007/BF02293610 **[abstract]**
- Practice, not peer-reviewed or not verified: the iNat Quiz forum thread,
  https://forum.inaturalist.org/t/inat-quiz-website-to-train-on-species-identification/76794 ; "Optimizing the
  frequency of question items for bird species in quiz-style online training", _Ecological Informatics_ (2025),
  https://doaj.org/article/e0a3a14fc4824219bde0723f431a5bc6 (authors not verified).
