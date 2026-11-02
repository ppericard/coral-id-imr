# Review of the IMR Coral ID adaptive learning algorithm

> Status (2026-11-02, copied into the repo): to discuss with Pierre one proposal at a time (ROADMAP "Independent review"). Agreed since: progress shown as a moving average weighted by what each answer proves (in the spirit of §Mastery criteria), simulated before shipping.

Reviewer: independent (Claude), 2026-11-02. Scope: `model.js`, `quiz.js` (planPhoto, duelPick, planDuel, introStart, answer), `core.js` (playerStart, levelSeed, eloOf, trustOf, guessOf, CONF), `tools/sync/Code.gs` `stats_`, `tests/profiles.smoke.js`, `docs/LEARNING.md`. Nothing in the repository was changed.

**Bottom line.** The core is sound and close to published practice: an Elo / 1PL model with a guessing floor, about 80% target success, and distractors chosen from confusion data. Around that core, though, the design has piled up patches: about 70 named constants and about 40 inline magic numbers. Two or three estimators measure the same per-genus knowledge, and three separate ramps set question difficulty. The simulation used to tune all this measures pacing, not learning, and runs one seed in CI. One concrete bug: with the hand-set guess and slip, BKT becomes degenerate on hard photos (a right answer lowers L). The best next step is to fix how the algorithm is evaluated. After that, most of the simplifications below can be tested safely.

---

## 1. Map of the algorithm as it stands

| Component | Decides | Where |
|---|---|---|
| Per-genus Elo θ (+ volatility) | photo difficulty target, single view or all views, trap count, "shaky" (opening of genera), calibration questions | `abilityStep`, `ability`, `ELO` |
| Global level (`~level`) | starting θ of a genus never answered (`playerStart`), the BKT start (`bktStart`), the "open all" offer | `core.js playerStart/levelSeed` |
| BKT knowledge L | entry to the mastery exam (L ≥ 0.95), genus draw weight, progress bar (`genScore`) | `bktStep`, `bktObs`, `knownP` |
| Recent history `h` (2 misses in last 5) | "Review" status → draw weight 3–5 | `level`, `weight` |
| Mastery exam | Learned = 5 hard single-view questions right, ≥ 8 answers apart | `EXAM`, `examSet` |
| Genus draw | status weights, exam, recency, bonus cap, share for unmet genera | `weight`, `weighted`, `nextTarget` |
| Progressive opening | new genus when < K genera are shaky; easiest first; cards | `OPEN`, `INTRO`, `introStart`, `planPhoto` |
| Photo choice | Gaussian around θ − 1.0, novelty, colony rotation, calibration bonus | `photoSet`, `PICKD`, `CAL` |
| Distractors | traps from θ (one per 0.18), confusion score (pooled + personal Beta prior), easy choices by growth form | `trapsFor`, `distractors`, `CONF`, `plausibleK` |
| Contrast questions | "Again: A or B?" after a mix-up; auto look-alike duels ~1 in 10 | `rematch`, `AUTO_DUEL`, `duelPick` |
| Server photo Elo | photo difficulty from trusted players, weighted by experience and adjusted for repeats | `stats_`, `eloOf`, `TRUST`, `PHOTO_W`, `PLAYER0` |

Each genus keeps 15 fields of state: ok, ko, streak, h, th, vr, L, ps, ro, off, conf, ex, mx, cor, du.

### Inventory of constants

| Group | Constants (value) | Count |
|---|---|---|
| `PICKD` | TARGET_OFF 1.0, SIGMA 0.7, VARIETY 3, FLOOR 0.05, SINGLE 0.5 | 5 |
| `CAL` | B 2, N 2, RATE 0.2, U 1 | 4 |
| `ELO` | th0 0, kmax 0.8, kmin 0.25, n 15, lo −1.5, hi 3, vr 0.1, vg 2 | 8 |
| `BKT` | L0 0.1, T 0.08, MASTER 0.95, L0MAX 0.5, LV0 0.5, LVR 1.5, LVN 30 | 7 |
| `EXAM` | n 5, gap 8 | 2 |
| `OPEN` | K 6, P 0.6, READY 0.35, TRICKLE 0.03, T 3, CONF 2, DATA 300, SHAPE 0 | 8 |
| `INTRO` | START 4, GAP 2, EVERY 2, OFFER {AT 50, UNTIL 150, MET 10, TH 0.5} | 7 |
| `TRAP` | start 0, step 0.18 | 2 |
| `BONUS_W` 4, `BONUS_SHARE` 0.15, `BONUS_AT` 10 + 5i | | 4 |
| `RECENT` 10, `REVIEW_MIN` 5 | | 2 |
| `AUTO_DUEL` | P 0.1, LO 0.1, HI 0.1, FROM 20, GAP 5, AGAIN 2, SAME 20, SHAKY 1 | 8 |
| `CONF` (core) | W 8, LOOK 0.3, FAM 0.12, FORM 0.08, BASE 0.03, TRAP 0.2 | 6 |
| `START` (core) | W 0.8, N 10, LO −0.5, HI 1.5 | 4 |
| `TRUST`, `PHOTO_W`, `PLAYER0` | N 10, Z 1.645; N 10, NEW 0.5, KNOWN −1; −1 | 6 |
| **Named total** | | **73** |

Inline magic numbers (about 40), including:
- `singleP`: 0.85, 0.5, 1.5.
- `weight`: new 10, learned 0.25, review 3 + 2u, learning 1 + 3u, exam max 3, exam wait ×0.05, last-4 penalty ×0.1.
- `photoSet`: hot 1.5, core 1.3, right-twice ×0.6, recent colony ×0.15, variety lift 0.5, last-5 window, cov².
- `bktStep` guess and slip: 1/k, −2b−1, 0.1, 0.9, 2b−3.
- `answer` familiarity: +0.5 and −1, a copy of `PHOTO_W`.
- Review rule: 2 of 5. Prior weight in `photoDiff`: 5. `duelPick`: ×3 and ×2. Rematch wait: 1.
- `stats_`/`eloOf`: photo K 0.8/(1 + n/10), player K 0.6/(1 + n/40), single view +0.5.

**About 110 tunable numbers in all.** Some of the named constants do nothing:
- `OPEN.SHAPE` is 0, which switches its branch off.
- `AUTO_DUEL.P` is never read (comment only).
- `AUTO_DUEL.LO` equals `AUTO_DUEL.HI`, so the interpolation between them is a constant.
- `AUTO_DUEL.SHAKY` is 1, a multiply by one.
- `ELO.th0` and `TRAP.start` are both zero offsets.

The latest commit (103d3ab, "settings to calibrate (no change at the defaults)") added four of these knobs. That is exactly the pattern the owner wants to avoid.

---

## 2. Comparison with established approaches

**Elo in adaptive practice (Pelánek 2016; Papoušek, Pelánek & Stanislav, EDM 2014). Checked: full texts.**
- *What they do.* One skill per student and one difficulty per item. A shifted logistic handles guessing. The uncertainty function is U(n) = a/(1 + bn), with a = 1 and b = 0.05 found by grid search, and the paper notes that "many different choices of a, b provide very similar results". Pelánek's advice: "If the skill is expected to change quickly, K should stay large."
- *EDM 2014.* Prior knowledge θs − bc seeds current knowledge (PFAE), which then gets asymmetric γ/δ updates. The target country is chosen by a weighted sum of three scores (success near a 75% target, time since last asked, count asked; weights 10, 120, 10). The number of options is set so that predicted success hits the target. Distractors are "simply based on past answers": the countries most often confused.
- *Agreement.* The app agrees on almost every point: shifted logistic, uncertainty-function K, global level as the prior, ~80% target, distractors drawn from confusion data.
- *Departures.*
  1. The app adds a volatility term (`vr`, `vg`) where Pelánek would simply keep K large.
  2. It tunes K by simulation instead of fitting it to the log-likelihood of real answers.
  3. It uses three separate difficulty levers (photo target, single view, traps) where Papoušek uses one: the number of options, chosen to hit the target.
- The EDM paper also warns about the feedback loop between estimation and selection. The simulation shares that blind spot (see §3).

**BKT (Corbett & Anderson, UMUAI 4, 1994 volume, often cited as 1995).**
- *What it does.* Four parameters per skill (L0, T, guess, slip), normally fitted to data by EM or grid search.
- *Known problems.* Beck & Chang (2007) showed that different parameter sets fit the same data equally well ("identifiability"). Baker, Corbett & Aleven (2008) describe "degenerate" parameters where knowing the skill makes a correct answer *less* likely. Doroudi & Brunskill (2017) argue BKT is identifiable under mild conditions. I verified these only through abstracts and secondary sources.
- *In Papoušek 2014*, BKT and PFAE tie on RMSE (0.262), and PFAE wins on log-likelihood.
- *The app.* L0 and T are hand-set, and guess and slip are functions of photo difficulty b. **This lands in the degenerate region.** I computed it with the app's own formulas:

  | Choices k | b where a right answer starts to lower L | Example |
  |---|---|---|
  | 4 | ≈ 2.0 | at b = 2.5, L 0.5 → 0.30 |
  | 2 ("Again" and duels) | ≈ 1.4 | at b = 2, L 0.5 → 0.33 |

  The b used is `bk` in `answer`: single view +0.5, unseen +0.5, plus the photo's difficulty. An unseen Hard photo shown alone (the exam's typical photo) is at exactly 2.0, so it carries no evidence at all. This contradicts the stated intent "right answers on hard photos count most". The `bktObs` patch ("a miss never raises L") hides only the miss side of this symptom.

**Mastery criteria (Pelánek & Řihák, UMAP 2017).** From the abstract: which data feed the mastery decision, and where the threshold sits, matter more than which learner model is used. A simple exponential moving average is a good enough criterion. This supports dropping BKT in favour of a threshold on the Elo prediction, with the exam kept as the data source.

**Duolingo.**
- *Half-life regression (Settles & Meeder 2016; full text checked).* Recall p = 2^(−Δ/h), with h = 2^(Θ·x). The features include counters of right and wrong answers and lexeme tags, and the weights are *fitted* on the log. It cut error versus Leitner by nearly half. In the A/B test, the variant without lexeme features raised daily retention by 12%.
  - The app borrows only the idea that repeats count against the learner's history, as two *fixed* offsets (`PHOTO_W.NEW` 0.5, `KNOWN` −1). It cannot take HLR's core, decay over time, because of the "no time criteria" rule.
- *Birdbrain (Duolingo blog, 2020; IEEE Spectrum).* Per IEEE Spectrum, version 1 is "a flavor of logistic regression inspired by item response theory" whose update is "a generalization of the Elo rating system": one SGD step per exercise. Version 2 represents ability as a 40-number vector. Duolingo's 2023 blog says its practice lessons pick review material using spacing "along with accuracy".
  - So the Elo-style core matches what Duolingo does in production.
  - The difference: Duolingo fits its parameters on its data; this app hand-tunes them.

**Spaced repetition (SM-2, FSRS).**
- SM-2 keeps an ease factor per card; Anki's default starting ease is 2.50. FSRS keeps a Difficulty, Stability and Retrievability state per card. Its parameters come from an optimizer run on the user's own reviews, with desired retention defaulting to 0.9 (Anki docs).
- Both run on elapsed time, which the owner has ruled out; the app counts in answers instead. A deliberate departure, but state it plainly: there is no forgetting model, so a Learned genus is lost only by a miss, never by disuse.

**IRT / computerized adaptive testing.**
- The app's model is a 3PL with discrimination fixed at 1 and guessing at 1/k.
- In CAT (Wikipedia overview checked):
  - the next item maximises information at the current ability;
  - a test stops when the standard error falls below a threshold;
  - new items are seeded as *unscored* pretest items, and calibrating one can take up to about 1,000 examinees.
- *Agreement.* The app's `CAL` follows the seeding idea.
- *Departures.*
  1. Calibration questions *are* scored, so the player's θ and L move on photos whose difficulty is unknown.
  2. No uncertainty is tracked: the answer count stands in for it.
  3. About 600 photos each get their own parameter while the log has about 550 answers. That is far more parameters than data.
- Bolsinova et al. (2025, "Keeping Elo alive") show that when items are selected adaptively while being calibrated, Elo rating variance inflates. Both happen here, so this applies to the photo ratings.

**ALEKS / knowledge-space theory.** Knowledge states are constrained by prerequisites; the "outer fringe" is what the student is ready to learn. Genera have no prerequisites, so this adds little. The opening rule (at most K shaky genera) is closer to a work-in-progress limit, like Anki's new-cards-per-day cap but gated on performance. Reasonable.

**Interleaving and discrimination.**
- *The research.*
  - Kornell & Bjork (2008): interleaving painters beat massing them, although most learners believed the opposite.
  - Kang & Pashler (2012): the benefit comes from discriminative contrast, not from time spacing.
  - Birnbaum et al. (2013): interleaving helps through discrimination; time spacing helped only when it did not interrupt that contrast.
  - Carvalho & Goldstone (2014): interleaving helps *highly similar* categories, blocking helps dissimilar ones.
- *Agreement.* The app fits all four well:
  - genera are interleaved (the last-4 penalty, never the same genus twice in a row);
  - a mix-up shows the two photos side by side, which is exactly the juxtaposition this research credits;
  - look-alikes are contrasted through traps and duels.
- *What could be tightened.* Look-alikes are contrasted by **three** overlapping mechanisms: traps, Again, and auto-duels. Starting with 4 easy genera fits Carvalho & Goldstone only if those 4 are *mutually dissimilar*. The opening draw picks by `genusDiff` (easy) but not by dissimilarity among the first cards.

---

## 3. Over-engineering, redundancy and gaps

**Redundant estimators.**
- **Three per-genus knowledge signals:**
  - Elo θ drives difficulty and opening;
  - BKT L drives the exam, the draw and the progress bar;
  - the 2-of-5 recent-miss rule drives "Review".
  
  Each was patched separately:
  - θ got volatility;
  - L got `bktStart` (4 constants) and the min-patch;
  - the recent-miss rule got `REVIEW_MIN`.
  
  The decision log itself records that "recent misses" were tried and dropped for opening because the game holds everyone near 80%. The same flaw applies to the Review status, which still uses that rule.
- **Two global player ratings:**
  - The client `~level` uses `ELO` K (0.8, n 15, volatility) and starts at 0 (`playerStart` returns 0 with no answers).
  - The server `R` uses K 0.6/(1 + n/40) and starts at `PLAYER0` = −1.
  - They are on the same scale but disagree on what "a beginner" is.
- **Familiarity handled three ways:**
  - in `answer`, the BKT difficulty `bk` gets +0.5/−1, but the Elo difficulty `d0` does not;
  - the server applies the adjustment to photo updates but not to player updates.
- **Double shrinkage of photo difficulty.** The sheet starts every photo at 0 and damps its steps. `photoDiff` then shrinks the result again towards the Easy/Medium/Hard prior, weighted as 5 answers. The doc measured a rank correlation of 0.00 between those sets and the ratings for photos with 3 or more answers.
- **Confusion counted twice in `genusDiff`.** Photo difficulty learned from real misses already includes how confusable the genus is. `OPEN.CONF` × the confusion score adds it again.
- **Commission errors counted twice.** A wrong pick c updates `s.conf` (the pair) *and* runs `abilityStep(c, …, false, 0, k)` and `bktObs(c, …)`, as if c had been shown on an average photo and missed. c was not shown, and the pair model already holds the information.

**Overlapping rules.**
- **Difficulty is set by three ramps in θ:**
  - the photo target θ − `TARGET_OFF`;
  - `singleP` (θ − 0.5)/1.5, capped at 0.85;
  - `trapsFor`, one trap per 0.18, with `plausibleK` then changing the guess floor.
  
  None of these is tied to the 80% goal once traps and k change. The simulation shows 68–88% right.
- **Opening is throttled twice.** The `OPEN.READY`/`TRICKLE` share limits it, and so does `INTRO.EVERY`. The table in the doc shows the coupling: changing EVERY from 3 to 2 forced K from 5 to 6.
- **Contrast is done three ways:** traps, Again (`rematch`), and `AUTO_DUEL` with 5 live spacing rules (FROM, GAP, AGAIN, SAME, never-before-Again).
- **`weight()` is partly overridden.** Its status weights (10, 0.25, 3 + 2u, 1 + 3u) are replaced for unmet genera by the share arithmetic in `weighted()`, then rescaled again by the bonus cap.

**What may be missing.**
1. **An outcome measure.** `profiles.smoke.js` reports genera met, traps, "sure" and learned: pacing, not learning. Yet its learner model *is* the app's measurement model (pk = σ(logit(know) − diff − 0.5·single), guessing at 1/k). It could therefore report the error of θ against logit(know) directly, and it does not.
2. **A credible learner model.**
   - The simulated learner gains the same amount on every exposure: no learning from feedback or cards, no forgetting.
   - Its wrong answers are uniform among the choices, so look-alike traps are no harder for it than easy choices.
   - So the simulation cannot judge traps, duels, Again, interleaving or the opening pace in terms of learning.
   - The photo difficulties it uses are the app's own `photoDiff`, so it cannot test photo calibration either.
3. **Statistical power.** CI runs one seed (`Math.random` seeded 12345, learner seed 7). The doc says runs vary by about ±5 genera, yet several decisions (K 5 → 6, `CAL.U`) were taken on differences of that size across 1–4 seeds.
4. **Real-data fitting.** Each answer logs its predicted chance `e`, and the admin already has a calibration view. Nobody uses this to fit K by log-likelihood, which is what Pelánek recommends and Duolingo does.
5. **Uncertainty on photo ratings** under adaptive selection (Bolsinova 2025), and no hierarchy: a photo's rating should borrow from its genus and its view.

---

## 4. Prioritised changes (8)

**1. Make the simulation measure learning and noise first.**
- *What.* Run the model in Node without the browser so that 30–50 seeds are cheap. Add:
  - the error between θ and logit(know), per profile, over time;
  - true success on a fixed "hard reference question" when a genus enters its exam;
  - final mean `know` over the 39 genera.
  
  Give the learner a confusion matrix built from the `CONF` priors, so that wrong answers fall on look-alikes, and a small gain from feedback.
- *Effect.* Later deletions can be judged on outcomes, with confidence intervals. *Risk.* Low (test only). *Validate.* Report the seed spread next to every LEARNING.md table.

**2. Replace BKT with an Elo-based mastery gate.**
- *What.* Enter the exam when the predicted success on a reference hard question (difficulty +1, single view, 4 choices) is at least about 0.9 *and* K has fallen below a level (enough evidence). Fill the progress bar from that probability. Keep the exam itself.
- *Removes.* `BKT` (7), the inline guess/slip formula (~5), `bktStart`, the min-patch and the `knownP` replay: about 15 numbers. It also removes the degenerate-BKT bug.
- *Fallback.* If Pierre wants to keep BKT, at least use guess = 1/k and a constant slip.
- *Risk.* Mastery pace and progress % change for existing players, so a migration from θ is needed.
- *Validate.* Simulation: true reference success at exam entry ≥ 0.85, with mastery counts per profile. Real data: exam pass rate against the predicted rate.

**3. Drop volatility and fit K.**
- *What.* Remove `ELO.vr` and `vg`, and set `kmin`/`n` by grid search on log-loss. Use the replayed log, as Pelánek recommends. Raising `kmin` is the textbook answer for skills that change.
- *Risk.* Slower catch-up if the fitted K is small.
- *Validate.* Simulation: θ error over time for the RA and the beginner. Real data: log-loss on the next answers.

**4. One difficulty controller.**
- *What.* Set the format (trap count, single view or all) from θ on one schedule. Then pick the photo so that the predicted success, *including that format's guess rate*, is near one target P\* (Papoušek's approach).
- *Removes.* `TARGET_OFF` (replaced by P\*), the 3 constants of `singleP`, `TRAP.step`, and the separate `plausibleK` reasoning.
- *Risk.* The early-game feel changes.
- *Validate.* Simulation: the right rate per profile sits near P\* with a narrower spread than today's 68–88%, and the expert's trap count does not fall.

**5. Hierarchical photo difficulty; align client and server.**
- *What.* Model photo difficulty = genus effect + view effect + photo residual, shrunk once, in `stats_`/`eloOf`.
  - Seed each photo from that prior instead of 0, and drop the client-side prior weight of 5.
  - Use the genus effect as `genusDiff` and drop `OPEN.CONF`.
  - Make the client's `playerStart`/`ELO` and the server's `PLAYER0`/K one model.
- *Risk.* Needs a Code.gs redeploy by Pierre, with `eloOf` kept in step. The simulation cannot validate this, because it uses `photoDiff` as the truth.
- *Validate.* Real data: held-out log-loss of per-photo against hierarchical ratings on the answer log.

**6. Merge the opening throttles.**
- *What.* Use one rule: show a new card when fewer than `OPEN.K` genera are shaky and at least `INTRO.EVERY` answers have passed since the last card, picking the easiest (and least confusable with the genera already met).
- *Removes.* `READY`, `TRICKLE`, `SHAPE` and the share arithmetic in `weighted()`.
- *Risk.* The opening pace shifts, so `K` needs a retune.
- *Validate.* The genera-met table across 30+ seeds should stay inside today's bands.

**7. Merge the contrast questions; delete the dead knobs.**
- *What.*
  - Delete `AUTO_DUEL.P`, `LO`/`HI`, `SHAKY` and `OPEN.SHAPE` now. This is zero-risk.
  - Then use one contrast queue: a mix-up enqueues its pair, otherwise insert a `duelPick` pair at rate p, with a single minimum gap. This replaces `FROM`, `AGAIN` and `SAME`.
- *Risk.* Low for the deletion. The merge changes how often duels come.
- *Validate.* A simulation with the confusion learner from item 1 (accuracy on look-alike pairs). Real data: right rate on a pair after Again versus without it. The data is still small.

**8. Draw genera from one quantity; drop the commission-error update.**
- *What.* Replace the status weights (10 / 0.25 / 3 + 2u / 1 + 3u) and the 2-of-5 Review rule with a weight that rises as predicted success on the reference question falls. Keep the recency and bonus caps. Stop updating θ and L of the genus wrongly picked; leave that to `pairConf`.
- *Removes.* About 8 inline weights and one estimator.
- *Risk.* Review emphasis shifts, and the "Review" label needs a new definition.
- *Validate.* Simulation: coverage per genus and mean final `know`. Real data: no rise in repeated misses.

Items 2, 3, 4, 6 and 7 together remove about 35–40 numbers and leave a single knowledge estimator.

---

## 5. Claims I could not verify

- **I did not run the simulation.** Playwright is not installed, and I did not install it in a read-only review. Every simulation figure quoted comes from LEARNING.md.
- I did not check live photo ratings, so I do not know how often real questions reach the degenerate b ≥ 2 (k = 4) or b ≥ 1.4 (k = 2). The prior alone puts an unseen Hard single view at exactly 2.0.
- Checked from abstracts or search summaries only, not full texts:
  - Kang & Pashler 2012;
  - Birnbaum et al. 2013 (stimulus details unverified);
  - Carvalho & Goldstone 2014;
  - Pelánek & Řihák 2017;
  - Beck & Chang 2007, Baker et al. 2008, Doroudi & Brunskill 2017;
  - Bolsinova et al. 2025.
- The SuperMemo SM-2 page returned 503. Details of SM-2 beyond Anki's default starting ease of 2.50 (for example, a minimum ease of 1.3) are from memory.
- I don't know whether Duolingo still uses HLR in production. Birdbrain v2 details come from IEEE Spectrum, not from Duolingo's own documentation.
- The year for Corbett & Anderson: UMUAI volume 4 is dated 1994, and the paper is often cited as 1995.

## Sources checked

- Pelánek 2016, *Applications of the Elo rating system…* (full text): https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf
- Papoušek, Pelánek, Stanislav, EDM 2014 (full text): https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf
- Settles & Meeder, ACL 2016 (full text): https://aclanthology.org/P16-1174.pdf
- Duolingo Birdbrain blog: https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/
- IEEE Spectrum on Birdbrain: https://spectrum.ieee.org/duolingo
- Duolingo spaced repetition blog (2023): https://blog.duolingo.com/spaced-repetition-for-learning
- Anki deck options (FSRS, SM-2): https://docs.ankiweb.net/deck-options.html
- van de Sande, *Properties of the BKT model*, JEDM: https://jedm.educationaldatamining.org/index.php/JEDM/article/view/35
- Pelánek & Řihák 2017 (record): https://is.muni.cz/publication/1392193/en
- Computerized adaptive testing: https://en.wikipedia.org/wiki/Computerized_adaptive_testing
- Knowledge space: https://en.wikipedia.org/wiki/Knowledge_space
- Bolsinova et al. 2025: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12784335/
- Kornell & Bjork 2008: https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Kornell_Bjork_2008_PsychScience.pdf
- Carvalho & Goldstone 2014: https://pmc.ncbi.nlm.nih.gov/articles/PMC4141442
