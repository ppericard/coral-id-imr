# Visualisations for the admin's multifactor analyses

Study for Pierre, 2026-11-05. Read-only: nothing in the repository was changed, no branch, no PR.

**What I read in the repository.** `admin-analyses.js` (the views, every chart helper: `divBars`, `dotRange`, `forest`,
`lines`, `sharesBar`, `bars`, `anSpark`, `anConv`, `anThumbs`), `analysis.js` (header, `prep` and the answer log's
columns, `lmm` / `glmm` and the fixed effects' covariance `margV`, `boot`, `eff`, the confusion analysis, `report`,
`compact`), `tools/analyses.js` (what the Action logs, the 2.4 MB cap, 40 bootstrap draws), `docs/LEARNING.md`
"Multifactor analyses", `docs/DESIGN.md` (the "Admin chart" row), `docs/ARCHITECTURE.md` (the Analyses tabs, the live
Answer log page with its calibration card, Pairs), `docs/ROADMAP.md` ("Analyses: next views"), `AGENTS.md` (Rule 0,
rules 20 and 20f), and the stats-methods study on `origin/claude/stats-methods-study` (§0, §5.3, §6). I tried to
screenshot `admin.html?demo#~an` with headless Chrome; the page stayed on "Loading…" (the demo report is computed in a
Web Worker, which headless virtual time does not wait for), so what follows is from the code, not from a screenshot.

**Sources.** Marked **[checked]** when I opened a page about it by web search this session (title, venue, the claim);
**[from memory]** when it is a standard reference I know but did not re-open. My own reasoning is marked **(my
judgement)**. Full list with links in §8.

---

## 0. The short version

1. The Analyses already draw the classic *one effect at a time* plots well: coefficient plots (diverging bars and
   dot-and-range), compact forest plots of genera and players (caterpillar plots in all but name), the share of
   variance, the fitted learning curve, Kaplan-Meier for sessions, and small multiples of each effect over the
   milestones. **What is missing is everything that shows how effects, genera and players relate to each other**: maps
   (PCA / MCA / biplots), matrices (correlations, confusions), groupings (dendrograms, clusters), joint scales (a Wright
   map), interactions, and checks that the models fit (calibration, residuals).
2. **PCA on the raw right / wrong answers is the wrong tool** (binary data, adaptive draw, difficulty artefacts). The
   valid "PCA on our data" is a PCA of a *model-based* table: player × genus residuals after the model (the Rasch
   world's residual PCA), or player × behaviour features. Both give a biplot.
3. **With about 10 players, anything about players is a description, not a finding.** A cluster analysis needs about
   20-30 players per group to find groups that really are there, and only when the groups are well apart (Dalmaijer et
   al. 2022). So a player map and a dendrogram are worth drawing now, as a picture of these ten people, with a
   stability check; named "types" of players are for when there are dozens.
4. **Genus-level and photo-level structure is well supported now**: a few thousand answers, many thousand offered wrong
   choices, 40 genera. The confusion heatmap ordered by a dendrogram ("families of mix-ups") is the strongest new view.
5. **Ranked short list** (§5): (1) mix-up map: confusion heatmap + dendrogram of genera; (2) player profiles: a players ×
   behaviour heatmap ordered by a dendrogram, plus a biplot on wide screens; (3) Wright map: players and genera on one
   scale; (4) "entangled effects": the correlation of the estimates and of the predictors, per analysis; (5) genus ×
   player residual biplot (is there a second skill?); (6) interaction and marginal-effect plots for the questions
   already on the ROADMAP; (7) per-genus learning curves as small multiples; (8) model checks: calibration by decile and
   simulated residuals.
6. Everything listed can be done in our stack: the computation is small linear algebra in `analysis.js` (an eigen
   solver of about 40 lines, hierarchical clustering and PAM of about 60 each), the drawing is hand-written SVG like the
   current helpers. The 40 × 40 matrices and biplots need a phone fallback (a list or one block at a time).

---

## 1. Where we are

**Data** (from the docs and the code): about 10 players, a few thousand quiz answers, each with the genus shown and the
genus answered, right / wrong, the app's expected chance `E`, seconds, enlarged or not, the photos (with view, quality,
sharpness, source from the curation), the choices offered, the format (4 choices, 3 or 2 plausible, Again, duel in the
quiz, Duel tab, exam, typed), comeback flag, the time stamp. Milestones every 1000 answers; the report is computed by
the GitHub Action (hourly cron, recomputes only at a new milestone) or in a Web Worker on the page, and stored in the
sheet (cap 2.4 MB). Player keys in the report are anonymous ids; the admin page puts the names back from the player list
(`anWho`). The Action log prints counts only.

**Charts today** (DESIGN.md "Admin chart"): `divBars` (diverging effect bars by outcome, coloured by verdict),
`dotRange` (spreads, guess rates against the app's), `forest` (genera, players), `lines` (learning curve, after a
break, Kaplan-Meier, milestones), `sharesBar` (variance shares), `anConv` (each effect over the milestones, small
multiples), photo thumbnails for the extreme photos, and a table of exact numbers beside every chart. The live page
Learning › Answer log also has a calibration card (the app's expected chance against the real success, four bands).

**What this means for the catalogue below** (my judgement): items 2.1, 2.9 (partly), 2.14 and 2.15 exist; the gain is in
the multivariate views (2.2-2.7, 2.10, 2.11), the interaction and curve views (2.8, 2.9), and the checks (2.12, 2.13).

---

## 2. The catalogue

For each: what it answers; which of our analyses it fits; whether our data supports it now; pitfalls; cost in our
stack. "Cost" counts computation in `analysis.js` and drawing in `admin-analyses.js`; S = an afternoon, M = a day or
two, L = more.

### 2.1 Coefficient plot / forest plot (exists)

- **Answers:** which factors move the outcome, which way, how much, how sure. The standard replacement for a table of
  coefficients (Gelman, Pasarica & Dodhia 2002 **[checked]**; the `dotwhisker` vignette **[checked]**).
- **Fits:** every analysis (it is the "What changes the result" card and the Overview).
- **Data:** yes.
- **Pitfalls:** effects on different scales side by side (we already split by outcome and translate to a chance or
  seconds: good); 30-45 intervals on one page invite reading the "Clear" ones as findings (multiplicity, peeking: study
  §5.3). Sorting by size exaggerates the top ones.
- **Cost:** done. Small addition: a light mark for the *confirmatory* effects once Pierre names them (study §5.3).

### 2.2 Correlation matrix of the estimated effects

- **Answers:** "Can the data tell these two effects apart?" Computed from the covariance of the estimates
  (`cov2cor(vcov(fit))` in R; the "Correlation of Fixed Effects" block of `lme4`'s summary). A correlation near ±1
  between two estimates means that if one were a bit higher the other would be a bit lower and the fit would be almost
  as good: their separate values are fragile, their sum is not. It is a property of the *estimates*, not a correlation
  in the data, and not the same as collinearity (UVA Library, "Correlation of Fixed Effects in lme4" **[checked]**;
  `lme4` `summary.merMod` docs **[checked]**).
- **Fits:** where effects compete for the same answers: Zoom (enlarged against the player's own habit), Learning (log
  practice, after a miss, Again, exam, comeback), Photo factors (view, quality, source, "one view alone": iNaturalist
  photos may be both lower quality and wider), Formats (guess rate c and shift d are estimated together and are known to
  trade off), Answer time (right, expected difficulty, typed).
- **Data:** yes; `analysis.js` already computes the matrix `V` (`margV`) and keeps only the standard errors. Export the
  correlations (p ≤ 12 per analysis, 66 numbers). A better version for our few players: the correlation of the
  *bootstrap draws* (it includes the between-player spread), once there are enough draws (40 is thin; study §5.3 says
  ≥ 200).
- **Pitfalls:** the intercept is correlated with everything unless predictors are centred (hide the intercept row);
  readers take it for "these factors are related in the world" (word it as "hard to tell apart"); with few players the
  Wald covariance understates the between-player part.
- **Cost:** S. Computation: already there, export it. Drawing: a small lower-triangle heatmap (rects, diverging,
  numbers in the cells), at most 8-10 rows: fits 360 px with the names as row labels only (the columns numbered). Or,
  simpler and more readable on a phone: a one-line note under the effects card, "Hard to tell apart: *enlarged* and
  *the habit* (r = −0.82)", listing only pairs with |r| > 0.6.

### 2.3 Correlation heatmap of the predictors (collinearity), with VIF

- **Answers:** the data-side twin of 2.2: which conditions occur together in the answers (e.g. iNaturalist photos and
  "Colony" view, typed questions and strong players, exams and late practice). Strongly correlated predictors make
  effects unstable; the common rule of thumb is to worry above |r| = 0.7 (Dormann et al. 2013, *Ecography*, a review
  with a simulation **[checked]**), or a variance inflation factor (VIF) above 5-10 **[from memory]**.
- **Fits:** Photo factors (photo features are correlated by how photos were collected), Answer time, Learning, Sessions.
- **Data:** yes (answer-level, thousands of rows). Binary × binary pairs give a phi coefficient; fine.
- **Pitfalls:** correlation only sees pairs, VIF sees one predictor against all others: show VIF as one number per
  effect next to its name; app-made correlations (the app chooses formats from the level) are real and expected, not a
  bug.
- **Cost:** S. A p × p correlation from the design matrix `X` (already built per model) and VIF = diagonal of the inverse
  correlation matrix (`inverse` exists). Same heatmap helper as 2.2.

### 2.4 PCA with a biplot and a correlation circle

- **Answers:** a map: which rows (players, genera, photos) look alike over many columns at once, and which columns
  (features, genera) go together. A biplot draws rows as points and columns as arrows on the same map (Gabriel 1971,
  via Greenacre, *Biplots in Practice*, 2010, free online **[checked]**); a correlation circle draws each standardised
  variable as an arrow inside a unit circle, its length showing how well the two axes represent it.
- **On which table?** This decides whether it is valid:
  - **Raw answers (answers × anything binary): no.** Classical PCA assumes roughly linear, Gaussian variables; on binary
    items it produces "difficulty factors" (easy items load together because they are easy) and the axes are hard to
    read. For binary tables, logistic PCA (Landgraf & Lee, *J. Multivariate Analysis* 2020 **[checked]**) or the
    nonparametric Gifi / MCA family are the recommended alternatives (comparison in *Briefings in Bioinformatics*, 2019
    **[checked]**). And our answers are drawn adaptively (the app picks genera and photos from the player's level), so a
    raw player × item table is full of holes that are not random.
  - **Player × genus residuals after the model: yes, this is the valid "PCA on our data".** Fit the model, take each
    player's right − expected on each genus (standardised, or as a shrunk player × genus random effect), and run PCA on
    that table. If the model's single ability per player and single difficulty per genus explain everything, the
    residual PCA shows only noise; if one axis stands out, there is a *second skill* (for example some players do
    better on massive and encrusting genera, others on branching ones). This is the Rasch world's standard
    dimensionality check (Linacre 1998, "Detecting multidimensionality: which residual data-type works best?"
    **[checked]**; simulated critical eigenvalues to decide what is more than noise, Raîche 2005 in *Rasch Measurement
    Transactions* **[checked]**).
  - **Player × behaviour features:** yes (see §3, player profiles).
  - **Genus × features** (mean right, time, zoom rate, mix-up rate, learning slope, photos available, growth forms): yes,
    40 rows, a useful "genus map" for teaching.
- **Fits:** Learning (residual PCA), player profiles, a genus overview.
- **Data:** the genus tables (40 rows) and the residual table (40 genera as rows × 10 players as columns) are usable now,
  read with care; a PCA with players as rows and 40 genera as columns has more columns than rows (rank ≤ 9): use genera
  as rows. Empty cells (a player who never met a genus) must be filled by the model's shrunk value, not by 0.
- **Pitfalls:** the sign of an axis is arbitrary and can flip from one milestone to the next (align each new milestone's
  axes to the previous one, or the map jumps); "% of variance" on 10 players overstates structure; arrows of variables
  poorly represented (short arrows) must not be read; the first axis of any table of abilities is often just "overall
  level", which we already know: centre each player's row (remove the player's mean) to see what is left.
- **Cost:** M. Computation: centre, scale, a symmetric eigen solver (Jacobi, about 40 lines) on a ≤ 40 × 40 matrix:
  milliseconds; a bootstrap over players for the stability of the axes (S more). Drawing: a square scatter with labels
  and arrows; at 360 px it holds about 10-15 labelled points (players) but not 40 genus names: on a phone, label only
  the 8 points furthest from the centre and list the rest under the map.

### 2.5 MCA (multiple correspondence analysis)

- **Answers:** the PCA of categorical variables: which categories go together. For us: the photos' categorical features
  (view, quality 1-3, source, sharpness band, single or multi-view): which feature combinations co-occur, which is the
  reason why some photo effects are hard to separate.
- **Fits:** Photo factors (as a collinearity view for categories, better than a phi heatmap when there are many
  levels); possibly genera described by categorical traits (growth form, family, look-alike group).
- **Data:** yes for photos (hundreds); the catalogue is the unit, not the answers.
- **Pitfalls:** binning a continuous variable changes the map; the first axes' "inertia" percentages are pessimistic by
  construction (Benzécri / Greenacre corrections) **[from memory]**; rare categories pull the map.
- **Cost:** M. An SVD of the indicator or Burt matrix (the same eigen solver), a map of category points. Probably lower
  value than 2.3 for Pierre (my judgement).

### 2.6 FAMD (factor analysis of mixed data)

- **Answers:** PCA for tables with both numbers and categories (numbers treated as in PCA, categories as in MCA), with a
  correlation circle for the numbers and category points at the centroid of the rows that have them (FactoMineR `FAMD`
  docs and STHDA guide **[checked]**; Wikipedia "Factor analysis of mixed data" **[checked]**).
- **Fits:** player profiles if they mix numbers (pace, zoom rate) and categories (prefers the Duel tab, plays mostly in
  the evening); photos with features plus difficulty.
- **Data:** for 10 players, no gain over a PCA on standardised numbers (turn the categories into shares, which are
  numbers). Worth it only for photos or for many players.
- **Pitfalls:** as PCA; the weighting between number and category blocks is a choice.
- **Cost:** M. Skip for now (my judgement).

### 2.7 Item-person map (Wright map)

- **Answers:** are the questions pitched at the players? Players' abilities and genera's (or photos') difficulties on one
  vertical logit scale: a histogram of players on one side, items on the other; an item level with a player means about
  50% beyond guessing for that player (Wright & Stone 1979, cited by the WrightMap, ShinyItemAnalysis and `mirt`
  plotting tools **[checked]**; MetricGate's explainer, which also notes it shows location only **[checked]**).
- **Fits:** Photo factors and Learning (the `glmm` already puts player, genus and photo effects on the same logit scale
  beyond guessing). It answers questions Pierre has asked in other forms: which genera are beyond every player today,
  which genera every player finds easy (no longer worth drilling), where the starred look-alikes sit.
- **Data:** yes for genera (40) and players (10); photos (hundreds) as a density on the item side.
- **Pitfalls:** abilities change with practice: the map is a snapshot (use the latest window, or the end of the fit's
  practice curve); the app aims at ~80% right, so it *makes* items and players meet: the map shows the bank's reach, not
  the questions asked; the scale is "beyond guessing", which must be said in words; the genus difficulty here includes
  the photos chosen for it.
- **Cost:** S-M. Computation: the effects exist. Drawing: a vertical axis is ideal on a phone (it scrolls down, labels
  run sideways): players as dots on the left (names on hover / tap), genera as labels on the right, a dashed line at the
  typical player.

### 2.8 Interaction plots and estimated marginal means (emmeans-style)

- **Answers:** "Does the effect of A depend on B?" Predicted outcome for each level of A, one line per level of B,
  averaged over the other factors at typical values (`emmip` in R's emmeans; the emmeans "Interaction analysis"
  vignette warns against reading averaged effects when interactions are strong **[checked]**).
- **Fits:** the ROADMAP's pair × view (does a pair get mixed up more on a Colony view?), view × enlarged (does enlarging
  help more on Colony photos?), format × practice (does typing get easier faster?), expected difficulty × time.
- **Data:** partly. Interactions need far more data than main effects (about 16 times for an interaction half the size
  of a main effect: Gelman's rule, study §6.3 **[from memory]**). Pair × view: only for the 5-10 most offered pairs.
- **Pitfalls:** "Clear for Colony, not for Close-up" is not an interaction: test the difference (study §6.3); lines
  crossing by noise; one omnibus test first. Draw intervals always.
- **Cost:** M. Computation: refit with an interaction term and predict at typical values (the models are generic);
  drawing: `lines` with dots and bands already exists: 2-4 lines, a legend (allowed with 2+ series).

### 2.9 Partial dependence / marginal-effect curves (and individual curves)

- **Answers:** the shape of a continuous effect: chance of a right answer against practice on the genus, days since the
  last answer, position in the session, expected difficulty; with a band. The individual version draws one thin curve
  per player under the average one, showing who differs (ICE curves, Goldstein et al., *JCGS* 2015 **[checked]**; in a
  mixed model these are the per-player curves from random slopes).
- **Fits:** Learning (the fitted curve exists, but without a band and without per-player lines), After a break
  (forgetting curve), Sessions (stop hazard against position), Answer time.
- **Data:** the average curve yes; per-player curves need the random practice slope (ROADMAP "per-genus learning slopes
  (random slopes)"; study §6.7 says from 8 players).
- **Pitfalls:** curves extend beyond where the data are (show a rug or grey the thin part); with correlated predictors
  an average over impossible combinations (PDP's known flaw **[checked]**); spaghetti overload past ~15 players (then
  show the 10%-90% range).
- **Cost:** S for the band (draws of intercept and slope exist for "answers to 80%"), M for per-player curves.

### 2.10 Caterpillar plots of random effects (players, genera, photos, pairs)

- **Answers:** how each player, genus, photo or pair differs from typical, after shrinkage, sorted, with its interval
  (`lme4`'s `dotplot(ranef(fit, condVar = TRUE))`; Bolker's caterpillar-plot notes **[checked]**); with a QQ plot of the
  same effects to check they look normal.
- **Fits:** all mixed models. We have forests for genera (Answer time, Learning) and players (Mix-ups, as a table for
  Answer time). Missing: photos (hundreds: a dense strip of dots, the extreme ones linked to their thumbnails), pairs
  (the pair random effect of Mix-ups), genera in Photo factors.
- **Data:** yes; photo intervals are wide (PQL shrinks photo SDs, the docs say).
- **Pitfalls:** the dots are shrunk, intervals crossing 0 are normal; never call the top-k "Clear" from a caterpillar
  (study §5.3, Gelman, Hill & Yajima 2012 **[from memory]**); intervals are conditional on the variance estimates
  (too narrow with few players).
- **Cost:** S (the `forest` helper exists; for hundreds of photos a strip without labels plus thumbnails).

### 2.11 Confusion-matrix heatmap, clustering and dendrogram of genera mixed up

- **Answers:** which genera form "families of mix-ups", whether these families follow the IMR slate's look-alike groups,
  growth forms or taxonomy, and which mix-ups fall outside any family (unexpected: a label error or a bad photo?). Build
  a similarity from the off-diagonal confusion rates, symmetrise, turn into a distance (d = 1 − similarity), cluster
  (average linkage or Ward), and reorder the heatmap's rows and columns by the dendrogram: families appear as blocks on
  the diagonal (as in the R `mlearning` package's sorted confusion plot and the CNN class-hierarchy literature
  **[checked]**). A 2-D map of genera by multidimensional scaling of the same distances is the classic alternative
  (Rothkopf's Morse-code confusions, 1957; Shepard **[from memory]**).
- **Fits:** Genera mixed up (`#~an-conf`) and the live Pairs page.
- **Data:** yes, the best-supported new view: every wrong answer and every offered-but-not-picked choice is a data point.
  Use rates per *offer* (the model's pair effect, shrunk), not raw counts: the app offers likely traps more often, so
  counts mirror the app's choices.
- **Pitfalls:** sparse cells (many pairs never offered: leave them blank, not 0); direction (A taken for B vs B for A:
  show the asymmetric matrix, cluster on the symmetric one); the dendrogram's exact shape is unstable at the top
  (bootstrap it, or cut only at a stable height); a 40 × 40 heatmap is 9 px a cell at 360 px.
- **Cost:** M. Computation: a 40 × 40 matrix from the pair effects (already fitted), agglomerative clustering (O(n³) on
  40 genera: trivial), leaf order. Drawing: heatmap rects + dendrogram path. Phone: show the dendrogram alone as a
  vertical tree with the genus names (readable at 360 px), and one family's block heatmap at a time on tap; desktop:
  the whole matrix.

### 2.12 Calibration plots

- **Answers:** do a model's predicted chances match what happens? Predicted vs observed by decile, a 45° line, and the
  calibration intercept and slope; the flexible (smoothed) version is now preferred (Van Calster et al. 2016, "A
  calibration hierarchy for risk models", *J Clin Epidemiol* **[checked]**).
- **Fits:** each logistic analysis (Photo factors, Formats, Learning, Mix-ups, After a break, Sessions' stop model), by
  format and by player. The app's own calibration exists live (Answer log, four bands).
- **Data:** yes by decile overall (hundreds of answers a bin); by player or by format, rough.
- **Pitfalls:** in-sample calibration looks better than it is (use leave-one-player-out predictions, as `abilityeval.js`
  does for the app); deciles of a narrow prediction range (our answers sit around 70-90%) give bins that differ little:
  use bins of equal width over the range that exists.
- **Cost:** S. Predictions exist in each fit; draw with `lines` (dots + diagonal).

### 2.13 Residual and diagnostic plots

- **Answers:** does the model miss a pattern? For log answer time: residuals against fitted, a QQ plot (skew, very slow
  answers). For right / wrong: raw residuals are useless (0 / 1); simulated quantile residuals are the standard
  (simulate answers from the fit, place each real answer among them; uniform if the model is right: DHARMa vignette and
  reference manual **[checked]**), plotted as a uniform QQ and against time, session position, player.
- **Fits:** every model; mostly for us (agents) and for trust, not for daily reading.
- **Data:** yes.
- **Pitfalls:** with thousands of answers every formal test rejects: judge the plot, not the p-value; checks conditional
  on the random effects see only the last level.
- **Cost:** S-M in the Action (simulate 100-250 answers per row: a few seconds); a folded "Checks" card with two small
  charts per analysis.

### 2.14 Effects over milestones (exists)

- **Answers:** whether an estimate settles as answers come in (`anConv`, small multiples, band per milestone).
- **Pitfalls:** repeated looks (study §5.3): a "Clear" that appears at one milestone is not a replication. Suggestion:
  mark the decision milestone (if Pierre adopts one) with a vertical line and draw earlier ones lighter.
- **Cost:** done.

### 2.15 Small multiples

- **Answers:** the same small chart for each genus, player or format, on shared axes, so the eye compares shapes
  (Tufte **[from memory]**). The learning-curve version is a standard tool of intelligent-tutoring research: error rate
  against practice opportunity for each skill, where a flat or erratic curve suggests the skill is really two things and
  a curve still high says more practice is needed (CMU DataShop learning curves and Koedinger's case study
  **[checked]**).
- **Fits:** Learning (40 mini curves, one per genus: a genus whose curve stays flat may hide two growth forms that need
  separate teaching, for instance encrusting and massive colonies of one genus; a hypothetical example, not measured), After a break (per genus
  family), Answer time (per format).
- **Data:** per genus, 50-200 answers each now: rough but readable with the fitted curve as a guide.
- **Pitfalls:** the DataShop caveat: curves can rise because the weaker players get more questions (selection);
  per-genus noise.
- **Cost:** S-M. `anConv`'s grid pattern already does small multiples (1 column on phones, 2 on tablets, 3 on desktop).

### 2.16 Others relevant to learning, quiz and IRT data

- **Variance shares** (exists for answer time): extend to right / wrong on the latent logit scale (residual variance
  π²/3), how much is player, genus, photo (Nakagawa & Schielzeth 2013 R² for GLMMs **[from memory]**). S.
- **Format curves** (item characteristic curves): chance right against the app's expected chance, one curve per format,
  with each format's floor (guess rate c) and shift d visible: the Formats analysis's model drawn as curves instead of
  only dots. S.
- **Funnel plot** of per-player or per-photo success against the number of answers, with the 95% and 99.8% limits around
  the overall rate: shows that the extreme rates are the ones with few answers (Spiegelhalter 2005 **[from memory]**).
  Good antidote to over-reading small counts on the Health and Photos pages. S.
- **Hazard ratios** for Sessions as a forest (exists as effects) and a cumulative stop curve by condition (after 2
  misses in a row vs not). S.
- **Sequence plots** of sessions (each session a row of coloured cells: right, wrong, slow, enlarged), sorted, as in
  sequence analysis (TraMineR; Penn's learning-analytics module **[checked]**). For player profiles later (§3). M.

---

## 3. Player behaviour profiles (Pierre: classify players by behaviour)

### 3.1 What it can answer

Which players play alike (pace, care, persistence, when and how long), and whether these styles go with learning
better. With 10 players today it is a picture of these ten people; with 30-100 it can become a typology.

### 3.2 Features we can compute per player from the answer log

Each feature should be **the player's own habit, net of what the app decided**: the app chooses the format, the
difficulty and the genus from the player's level, so a raw share (e.g. typed questions) mostly measures the level. Where
the app decides, use the player's result *given* the app's choice; where the player decides, use the choice itself.

| Group | Feature | How | Player's choice or app's? |
| --- | --- | --- | --- |
| Pace | Typical answer time | the player's random effect in the Answer time model (already fitted: seconds net of right / wrong, format, difficulty, genus, photo) | player |
| Pace | Speed-accuracy trade-off | slope of right on (log time − player's usual), per player | player |
| Care | Enlarging habit | share of photos enlarged (the Zoom model's habit term) | player |
| Care | Benefit from enlarging | right − expected when enlarged minus when not (Zoom table) | player |
| Accuracy | Ability beyond the app | the player effect in Photo factors / Learning (right − expected, shrunk) | both |
| Accuracy | Accuracy by difficulty | right − expected on the app's hard questions (E < 0.7) vs easy ones (E > 0.85) | both |
| Learning | Learning slope | player random slope on log practice (when added) | player |
| Learning | Recovery after a miss | right on the next question of the same genus after a miss, vs expected | player |
| Memory | Forgetting | the comeback questions' right − expected; days between visits of a genus | player |
| Mix-ups | Mix-up tendency | observed / expected mix-ups (Mix-ups model, exists) | player |
| Mix-ups | Mix-up spread | how many different pairs account for half the player's mix-ups (concentrated on a few pairs vs scattered) | player |
| Sessions | Session length | median answers per session; Kaplan-Meier per player | player |
| Sessions | Rhythm | sessions per active day, active days per week, longest break | player |
| Sessions | Persistence | stop hazard after 2+ misses in a row (the Sessions model's term, per player) | player |
| When | Time of day | share of answers in the morning / work hours / evening (Manila time) | player |
| Games | Game mix | share of answers in the Duel tab, custom quiz, exams taken (where the player chooses) | player |
| Breadth | Genera met per 100 answers | from the log | mostly app |

Model-based features (random effects) are better than raw rates for few answers: they are shrunk toward typical, so a
player with 40 answers does not land at the edge of the map by chance. Every feature is standardised (z-score over
players) before mapping.

### 3.3 Ways to map and group players

- **Heatmap of players × features** (rows players, columns features, colour = z-score, the number on hover / tap),
  rows and columns ordered by hierarchical clustering. The most readable form; works at 10 players and at 100.
- **PCA biplot of players** (points = players, arrows = features; correlation circle beside it): which features go
  together (e.g. slow ↔ enlarges ↔ more accurate beyond expectation), who sits where. Valid on standardised features;
  with 10 players and 15 features, keep 6-8 features or the map is fitting noise.
- **Hierarchical clustering with a dendrogram** (Ward on z-scores, or average linkage on Gower's distance when features
  mix numbers and categories **[checked]**: Gower handles mixed types and pairs with k-medoids): who is closest to whom.
- **k-means / PAM (k-medoids) with silhouettes** (Rousseeuw 1987; Kaufman & Rousseeuw 1990 **[checked via the
  Wikipedia summary and Batool & Hennig]**): pick k by the highest average silhouette width; rule-of-thumb bands > 0.7
  strong, > 0.5 reasonable, > 0.25 weak (Wikipedia, source of the bands not confirmed **[checked]**). PAM's medoids are
  real players, the natural "example" of each group.
- **Latent class / latent profile analysis (LCA / LPA):** a model-based typology with a probability of membership per
  player. Simulations put adequate samples in the hundreds (Nylund et al. 2007: about 500 for the usual criteria;
  separation between classes matters most, Peugh & Fan **[checked, via PMC summaries]**). **Not before a few hundred
  players.**
- **Sequence analysis of sessions:** each session as a sequence of states (right / wrong / slow / enlarged / stop),
  distances between sequences (optimal matching), clustering (TraMineR, LAK methods book's transition networks
  **[checked]**). For MOOCs, clustering learners' engagement trajectories found four recurring patterns (Kizilcec, Piech &
  Schneider, LAK 2013 **[checked]**). Needs many sessions per player; a later step.
- **Player random effects as features:** already in the table: they are the cleanest features because the models remove
  what the app decided.

### 3.4 What is valid with about 10 players, and as numbers grow

- **Now (10 players):** a heatmap and a dendrogram are honest descriptions; a PCA map of 6-8 features is fine as a
  picture. **No named types, no "cluster 2 learns faster"**: Dalmaijer, Nord & Astle (2022, *BMC Bioinformatics*,
  simulations **[checked]**) found that cluster analysis has adequate power only when groups are well separated, with
  about 20-30 people per expected group, and recommend fuzzy clustering or mixture models when groups overlap. Ten
  players is below one group's worth.
- **Stability check, always:** bootstrap the players (and, with few players, leave one out) and redo the clustering;
  report for each group the mean Jaccard similarity with its best match in the resamples (Hennig 2007, `fpc::clusterboot`
  **[checked]**: ≥ 0.75 stable, ≤ 0.5 dissolved; the docs warn that stable is not the same as valid). With 10 players,
  expect most groups to be unstable: say so on the page ("these groups change when one player is left out").
- **Leave one feature out:** a grouping that rests on one feature is that feature, not a profile.
- **Confounding by experience:** features drift with practice (beginners are slow and enlarge more). Compute each
  feature on a comparable window: the player's last N answers (e.g. 300) or the last 30 days, and show the number of
  answers behind each player's row; grey the rows under a minimum (e.g. 100 answers).
- **30+ players:** PAM with silhouettes and a bootstrap stability score per group becomes meaningful; a profile can be
  related to an outcome (learning slope by group) as an exploratory result.
- **Several hundred players:** LPA / LCA with fit criteria; sequence clustering of sessions.

### 3.5 How it would look

- **Phone (360-390 px):** a heatmap with players as rows (names cut to `--cut`) and 6-8 feature columns of 24-28 px,
  each column headed by an icon-free short word ("Pace", "Zoom", "Accuracy+", "Learning", "Sessions", "Evening"), a
  small vertical dendrogram on the left of the names; a tap on a row opens the player's Journey; a legend "▲ above
  typical / ▼ below" with the number in each cell (colour only helps, DESIGN.md). Under it, in words: "Closest pairs:
  *A* and *B* (pace, zoom)", "Most different from everyone: *C* (sessions)". The biplot is folded on phones, with the 8
  labelled points.
- **Desktop:** the heatmap and the biplot side by side; hovering a player highlights them in both; the stability line
  ("groups stable in 7 of 10 leave-one-out runs") under the dendrogram.
- **Where:** a new view, Analyses › Players › Profiles (e.g. `#~an-who`), next to the per-player cards already spread
  over Answer time, Enlarging and Mix-ups; the Journey page could show the player's own column of z-scores as a strip.

### 3.6 Privacy

- Per-player features and groups are stored in the report in the sheet only, keyed by **anonymous ids**; names are put
  back in the admin page from the player list (`anWho`), as today. Nothing per player in the repository, in an Action
  log or in a workflow artifact: the Action keeps printing counts only (`tools/analyses.js` already does); tests and the
  demo use synthetic players. Rule 20f covers committed and published text.
- Who sees it: Pierre (admin token) only. Profiles describe play; they are not a judgement of an RA. Whether players
  ever see their own profile is a question (§6 d).

---

## 4. Fit with our analyses, at a glance

| View | Answer time | Enlarging | Photo hard | Formats | Mixed up | Practice | After a break | Sessions | Players |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2.2 Correlation of estimates | ● | ● | ● | ● | ○ | ● | ○ | ○ | |
| 2.3 Predictor correlations / VIF | ● | ○ | ● | | ○ | ● | | ● | |
| 2.4 PCA / biplot | | | ○ (genus map) | | | ● (residual) | | | ● |
| 2.5 MCA | | | ● | | | | | | |
| 2.7 Wright map | | | ● | | | ● | | | ○ |
| 2.8 Interactions | ○ | ● | ● | ● | ● (pair × view) | ● | | | |
| 2.9 Marginal curves | ● | | | | | ● | ● | ● | ○ |
| 2.10 Caterpillar | ● | | ● | | ● | ● | | | ● |
| 2.11 Confusion heatmap / dendrogram | | | | | ● | | | | |
| 2.12 Calibration | | ● | ● | ● | ● | ● | ● | ● | |
| 2.13 Residuals | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | |
| 2.15 Small multiples | ○ | | | ○ | | ● | ○ | | ○ |

● good fit now, ○ possible or later.

---

## 5. Ranked short list: what would add the most for Pierre

Ranked by insight for Pierre against data support and cost (my judgement).

1. **Mix-up map: confusion heatmap ordered by a dendrogram** (joins Difficulty › Mix-ups, `#~an-conf`; M). On desktop a
   40 × 40 heatmap of mix-up rates per offer (shrunk pair effects), rows "shown", columns "answered", ordered so that
   families of mix-ups sit as blocks on the diagonal, the dendrogram on top; cells of the IMR slate's declared
   look-alikes outlined, so a block without an outline says "a family the slate doesn't name". On a phone: the
   dendrogram as a vertical tree with the genus names, each family a tappable band that opens its own small block
   heatmap and the pairs table filtered to it. Below, in words: "Families: *A · B · C*; …; mixed up across families: *X* → *Y*
   (look at its photos)" (placeholder names: the real families come from the data). Strongest data, direct teaching use (which genera to teach side
   by side, which look-alike group is missing), cheap.
2. **Player profiles** (new view Analyses › Players › Profiles; M). The heatmap of players × 6-8 behaviour features of
   §3, ordered by a dendrogram, with the stability line and the number of answers per player; on desktop the biplot
   beside it. Words: closest pairs, the most distinctive player and what makes them distinctive. No named types until
   about 30 players. Pierre asked for it; it is the only view that shows players as whole people rather than one effect
   at a time.
3. **Wright map** (joins Learning › Practice, or Difficulty › Photos; S-M). One vertical logit scale: players as dots on
   the left (latest ability beyond guessing), the 40 genera as labels on the right, photos as a grey density behind
   them, the starred look-alikes marked. Words: "Beyond every player today: …; below every player: …". Reads naturally
   at 360 px because it is vertical.
4. **Entangled effects** (a folded card in every analysis view; S). The correlations between estimates (from the `V`
   already computed, later from the bootstrap draws) and the VIF of each predictor; on a phone only the pairs above
   |r| = 0.6 in one sentence each ("*Enlarged* and *the habit* are hard to tell apart: read their sum"); on desktop a
   small lower-triangle heatmap. It answers Pierre's "correlations between effects" exactly and prevents over-reading
   two fragile effects.
5. **Second skill? Genus × player residual biplot** (joins Learning › Practice, or a "Structure" card on the Overview;
   M-L). Residual PCA of the player × genus table after the Learning model (needs a player × genus random effect, cheap
   to add to `glmm`): genera as points, players as arrows. If the first residual axis is no bigger than in simulated
   data, say "one skill explains it"; if it is, show which genera sit at each end (e.g. massive vs branching). The
   honest version of "PCA on the data".
6. **Interaction and marginal-effect plots** for questions already on the ROADMAP (joins Mix-ups, Enlarging, Learning;
   M): pair × view for the most offered pairs, view × enlarged, format × practice; each a `lines` chart of predicted
   chance with bands, one line per level, and one sentence from the omnibus test ("the effect of enlarging does / does
   not clearly depend on the view").
7. **Per-genus learning curves as small multiples** (joins Learning › Practice; S-M). 40 mini curves (observed dots, the
   fitted curve with the genus's own effect), sorted by how far they are from 80% beyond guessing; flat curves flagged
   ("not improving with practice: two forms to teach apart?").
8. **Model checks** (a folded "Can we trust this model?" card per analysis; S-M): calibration by bin (predicted vs
   observed, leave-one-player-out) and a simulated-residual QQ plot; one line of words ("predictions match within 3
   points in every band"). Mostly for us, but it is what tells Pierre the other charts are worth reading.

Not on the list (my judgement): MCA and FAMD (little over 2.3 and 3 for our sizes), LCA / sequence clustering (need far
more players and sessions), photo caterpillar (a quick add to Photo factors whenever convenient).

---

## 6. Open questions for Pierre

a. **Player profiles: a map, or named types?** With 10 players, groups are not stable enough to name. *Recommendation:*
   show the heatmap, dendrogram and biplot as a description with a stability line; name types only from about 30
   players, when PAM groups pass a bootstrap stability check.

b. **Over which answers is a profile computed?** The whole history mixes beginner and current habits. *Recommendation:*
   each player's last 300 answers (whole history when fewer), with the count shown and rows under 100 answers greyed.

c. **Which behaviours matter to you?** The table in §3.2 has 17 candidates; a map stays readable with 6-8.
   *Recommendation:* pace, enlarging, accuracy beyond expected, learning slope (when fitted), persistence after misses,
   session length, rhythm (sessions per week), time of day. Tell us which to add or drop.

d. **Should a player ever see their own profile?** *Recommendation:* admin only for now (privacy, and a 10-player
   picture can feel like a judgement); revisit if a "your style" card for players is ever wanted.

e. **Phone or desktop for the dense views?** The 40 × 40 mix-up heatmap and the biplots do not fit 360 px as they are.
   *Recommendation:* every view has a readable phone form (the dendrogram as a list, one family's block on tap, the
   biplot with 8 labelled points), the full matrix from tablet width up.

f. **Computed by the Action (in the milestone report) or live from the answer log, like Pairs?** *Recommendation:* in
   the report, so the views share the milestones, the bootstrap and the checks; the mix-up dendrogram could also be
   drawn live on Pairs later if wanted.

g. **Add a player × genus effect to the Learning model** (needed for the residual biplot, item 5, and a cleaner Wright
   map)? It commits later work (a data format in the report). *Recommendation:* yes, once item 4 shows the current
   Learning effects are not too entangled.

h. **PCA on the raw right / wrong answers:** we recommend *not* doing it (binary, adaptive draw); the residual and
   feature PCAs replace it. Confirm this is what you meant by "PCA on the data", or say what table you had in mind.

---

## 7. Notes on cost in our stack

- **Computation (`analysis.js`, pure functions, run by the Action every 1000 answers or in the Web Worker):** a Jacobi
  eigen solver for symmetric matrices up to 40 × 40 (≈ 40 lines); agglomerative clustering with Ward / average linkage
  and a leaf order (≈ 60); PAM and silhouettes (≈ 60); a bootstrap Jaccard stability (≈ 40, reusing `boot`'s player
  resampling); simulated residuals (≈ 30 per model). All run in milliseconds to seconds at our sizes. Each gets a
  synthetic test in `tests/analysis.test.js` with known structure (planted clusters, a planted second skill, planted
  correlated predictors), like the current `ANALYSIS.synth`.
- **Report size:** correlation matrices (≤ 66 numbers per analysis), a 40 × 40 sparse confusion matrix (a few kB), a
  players × features table (10 × 8) and coordinates for the maps: well under the 2.4 MB cap; older milestones can drop
  them in `compact` like the other tables.
- **Drawing (`admin-analyses.js`, hand-written SVG at the page's real width):** new helpers `heat()` (rects with a
  diverging fill from the accent and `--bad` at a few strengths, the number in the cell or on hover), `dendro()` (a
  path, vertical on phones), `biplot()` (points, arrows, labels with a simple collision skip), `wright()` (vertical
  axis). Each ≈ 50-90 lines, tokens only, `<title>` and a table of exact numbers beside every chart (DESIGN.md).
- **Phone:** every new chart needs its 360 px form designed, not shrunk (the rule that text stays 12 px).

---

## 8. Sources

Checked this session (web search, title, venue and the claim):

- Gelman, Pasarica & Dodhia (2002), "Let's practice what we preach: turning tables into graphs", *The American
  Statistician* 56: 121-130. [IDEAS/RePEc](https://ideas.repec.org/a/bes/amstat/v56y2002mmayp121-130.html);
  [dotwhisker vignette](https://repo.miserver.it.umich.edu/cran/web/packages/dotwhisker/vignettes/dotwhisker-vignette.html)
- University of Virginia Library, "Correlation of Fixed Effects in lme4".
  [data.library.virginia.edu](https://data.library.virginia.edu/correlation-of-fixed-effects-in-lme4); `lme4`
  [summary.merMod](https://rdrr.io/pkg/lme4/man/summary.merMod.html); Bates et al., "Fitting linear mixed-effects
  models using lme4" [arXiv:1406.5823](https://arxiv.org/pdf/1406.5823)
- Dormann et al. (2013), "Collinearity: a review of methods to deal with it and a simulation study evaluating their
  performance", *Ecography* 36: 27-46.
  [University of Twente record](https://research.utwente.nl/en/publications/collinearity-a-review-of-methods-to-deal-with-it-and-a-simulation/)
- Greenacre (2010), *Biplots in Practice* (BBVA Foundation, free), appendices on Gabriel (1971).
  [PDF appendix](https://fbbva.es/wp-content/uploads/2017/05/dat/greenacre_ap0B_2010.pdf)
- Landgraf & Lee, "Dimensionality reduction for binary data through the projection of natural parameters" (logistic
  PCA), arXiv 2015, *J. Multivariate Analysis* 2020. [arXiv:1510.06112](https://arxiv.org/abs/1510.06112)
- "Principal component analysis of binary genomics data", *Briefings in Bioinformatics* (2019).
  [UvA record](https://dare.uva.nl/id/83a73fff-8903-4244-9016-dc3405c30a57); R-help thread on PCA for binary data
  [stat.ethz.ch](https://stat.ethz.ch/pipermail/r-help/2007-June/134019.html)
- Linacre (1998), "Detecting multidimensionality: which residual data-type works best?"
  [winsteps.com PDF](https://winsteps.com/a/Linacre-multidimensionality-residuals.pdf); Raîche, "Critical eigenvalue
  sizes in standardized residual PCA", *Rasch Measurement Transactions*
  [rasch.org](https://www.rasch.org/rmt/rmt191h.htm)
- FactoMineR `FAMD` [CRAN reference](https://search.r-project.org/CRAN/refmans/FactoMineR/html/FAMD.html); STHDA, "FAMD
  in R: essentials"
  [sthda.com](https://www.sthda.com/english/articles/31-principal-component-methods-in-r-practical-guide/115-famd-factor-analysis-of-mixed-data-in-r-essentials/);
  [Wikipedia, Factor analysis of mixed data](https://en.wikipedia.org/wiki/Factor_analysis_of_mixed_data)
- Wright maps: [WrightMap `wrightMap`](https://rdrr.io/cran/WrightMap/man/wrightMap.html),
  [ShinyItemAnalysis `ggWrightMap`](https://rdrr.io/cran/ShinyItemAnalysis/man/ggWrightMap.html),
  [ggmirt `itempersonMap`](https://rdrr.io/github/masurp/ggmirt/man/itempersonMap.html),
  [MetricGate explainer](https://metricgate.com/blogs/wright-map-irt-visualization/)
- emmeans `emmip` and the interactions vignette. [emmip](https://rdrr.io/cran/emmeans/man/emmip.html);
  [vignette source](https://archlinux.nic.cz/R/web/packages/emmeans/vignettes/interactions.Rmd)
- Goldstein et al., "Peeking inside the black box: visualizing statistical learning with plots of individual
  conditional expectation", *JCGS* 24(1), 2015. [arXiv:1309.6392](https://arxiv.org/abs/1309.6392);
  [scikit-learn PDP/ICE guide](https://scikit-learn.org/1.1/modules/partial_dependence.html)
- Caterpillar plots: [lme4 `ranef`](https://rdrr.io/cran/lme4/man/ranef.html);
  [Bolker, caterpillar_plots.Rmd](https://www.github.com/bbolker/mixedmodels-misc/blob/master/caterpillar_plots.Rmd);
  [MetricGate, reading a caterpillar plot](https://metricgate.com/blogs/reading-a-caterpillar-plot/)
- Confusion-matrix clustering and seriation: [mlearning `confusion`](https://rdrr.io/rforge/mlearning/man/confusion.html);
  "Do convolutional neural networks learn class hierarchy?" [arXiv:1710.06501](https://arxiv.org/pdf/1710.06501)
- Van Calster et al. (2016), "A calibration hierarchy for risk models was defined: from utopia to empirical data",
  *J Clin Epidemiol* 74: 167-176, via [CalibrationCurves](https://rdrr.io/cran/CalibrationCurves/man/val.prob.ci.2.html);
  [PMC6771733](https://pmc.ncbi.nlm.nih.gov/articles/PMC6771733)
- DHARMa (Hartig), simulated residuals for GLMMs.
  [CRAN reference manual](https://cran.r-project.org/web/packages/DHARMa/refman/DHARMa.html);
  [vignette](https://ftp.eenet.ee/pub/cran/web/packages/DHARMa/vignettes/DHARMa.html)
- Learning curves in DataShop: [Koedinger case study](https://datashop.phzh.ch/about/case-studies/koedinger-geometry-script-for-web.htm);
  [CMU DataLab key concepts](https://www.cmu.edu/datalab/getting-started/key-concepts.html)
- Dalmaijer, Nord & Astle (2022), "Statistical power for cluster analysis", *BMC Bioinformatics* 23: 205.
  [PMC9158113](https://pmc.ncbi.nlm.nih.gov/articles/PMC9158113)
- Hennig (2007), "Cluster-wise assessment of cluster stability", *CSDA* 52: 258-271, via
  [fpc `clusterboot`](https://search.r-project.org/CRAN/refmans/fpc/html/clusterboot.html)
- Silhouettes (Rousseeuw 1987; Kaufman & Rousseeuw 1990): [Wikipedia](https://en.wikipedia.org/wiki/Silhouette_(clustering));
  Batool & Hennig [arXiv:1910.11339](https://arxiv.org/pdf/1910.11339v4.pdf)
- Latent profile sample size (Nylund et al. 2007; Peugh & Fan; no consensus):
  [PMC7328230](https://pmc.ncbi.nlm.nih.gov/articles/PMC7328230); [PMC3904803](https://pmc.ncbi.nlm.nih.gov/articles/PMC3904803)
- Gower distance + PAM + silhouette: [R-bloggers, "Clustering mixed data types in R"](https://www.r-bloggers.com/clustering-mixed-data-types-in-r/)
- Sequence analysis: [Penn learning analytics, exploratory analysis of sequence data](https://learninganalytics.upenn.edu/IES/m13-1.html);
  [LAK methods book, transition network analysis clusters](https://lamethods.github.io/book2/chapters/ch17-tna-clusters/ch17-tna-clusters.html)
- Kizilcec, Piech & Schneider (2013), "Deconstructing disengagement: analyzing learner subpopulations in MOOCs", LAK
  2013: 170-179. [PDF](https://web.stanford.edu/~cpiech/bio/papers/deconstructingDisengagement.pdf)

From memory (standard references, not re-opened this session): Gabriel (1971), "The biplot graphic display of matrices",
*Biometrika*; Wright & Stone (1979), *Best Test Design*; De Boeck & Wilson (2004), *Explanatory Item Response Models*;
Le, Josse & Husson (2008), "FactoMineR", *J. Statistical Software*; Greenacre (2017), *Correspondence Analysis in
Practice* (MCA inertia corrections); Rothkopf (1957) Morse-code confusions and Shepard's multidimensional scaling;
Tufte (1983/1990) on small multiples; Nakagawa & Schielzeth (2013), R² for GLMMs; Gelman, Hill & Yajima (2012), "Why we
(usually) don't have to worry about multiple comparisons"; Spiegelhalter (2005), "Funnel plots for comparing
institutional performance", *Statistics in Medicine*; Gabadinho et al. (2011), "TraMineR", *J. Statistical Software*;
VIF thresholds of 5-10; Gelman's "interactions need 16 times the sample" (also in the stats-methods study §6.3).
