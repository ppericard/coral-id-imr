# Analyses: the methods and their validation

The methods behind the admin's Analyses group: the models, the multiple-testing correction, the visualisation study
and how the results were validated. What the stored report is, where it computes and what the admin draws is in
[analyses.md](analyses.md).

## Multifactor analyses (`analysis.js`, admin Analyses)

Reports of the answer log for the admin's Analyses group (ARCHITECTURE.md "Analyses"): mixed models of right answers,
answer time, mix-ups and sessions. They measure; they change nothing in the app. Every value is the code's
(`analysis.js`, `tools/analyses.js`), and the code wins where this text and it differ. The methods come from the
statistical methods study and the multifactor visualisation study (docs/reviews/2026-11-05-stats-methods-study.md,
docs/reviews/2026-11-05-multifactor-viz-study.md). The section as first written, with its dates, its validation runs
and its measured runtimes, is in the notebook: [docs/archive/learning-notebook.md](../archive/learning-notebook.md).

- **One report per subject.** Every subject with `analyses` in `core.js` `SUBJECTS` (the corals, the fish, the sea
  slugs) has its own report, fitted on its own answers (`core.js` `subjRows`): the log's quiz rows, without the players
  and devices the admin left out of the statistics (`leftOut`). The answers a deleted account left stay in the pooled
  fits, never as a player or in a count of players. An answer time over 600 s counts as none.
- **Milestones.** A report holds one result per round thousand of the subject's answers (the first 1000, 2000, 3000,
  …; `STEP` 1000, none before). The hourly Action (`.github/workflows/analyses.yml`, `tools/analyses.js --sheet`) refits
  when the log reaches a round thousand the stored report lacks, when the code changed (`AV`) or when an account was
  removed, and stores the report in the sync sheet; a milestone with the same answers, photo features and code is
  reused, never refitted, unless an account was removed. The admin's **Recompute here** runs the same code in its tab.

Methods, shared by every analysis:

- **Crossed random effects.** Player, unit (a coral genus; a fish family, genus or species unit) and photo, a
  question's photos sharing its photo effect (weight 1/m each), fitted by alternating updates: each level's shrunk
  effect given the rest (a majorise-minimise step, exact when a row has one level), then the fixed effects, with EM
  updates of the variance components from the posterior second moments (REML-like shrinkage, without REML's exact
  determinant term). Gaussian for log answer time (`lmm`); logistic with each question's guess rate,
  P = g + (1 − g) σ(η), for right or wrong (`glmm`: penalised quasi-likelihood, Fisher scoring), g as the app's
  (`core.js` `guessOf`: 1/k on k plausible choices, ½ in the Duel tab, 0 typed).
- **Intervals.** 95%, the wider of two: the model's own (Wald, from the fixed effects' covariance marginal over the
  random effects, the inverse of the Schur complement of the joint precision, so an effect that is constant within a
  player, such as a player's habit, gets the players' spread, not the precision of their many answers; above `MAXM`
  2500 levels each level's block is taken alone) and, from `BOOT_MIN` 6 players, a cluster bootstrap over players (a
  player drawn twice counts twice). Draws: `BOOT` 999 for a report's latest milestone, read as percentiles; 199 for the
  earlier ones, newest first, while their answers add up to 60,000, and none beyond (the model's own interval only), so
  a whole report fits the Action's time as the log grows (`report`; the options `--boot` and `--boot-history`).
  Recompute here reuses the stored report's milestones for the very same answers, gives its newest milestone and a live
  point of every answer 199 draws read as a normal interval (the estimate ± 1.96 times the draws' standard deviation,
  never beyond the draws' range: `BSE`; some 200 draws pin a standard error, percentiles need about 1,000: Efron &
  Tibshirani 1993), and any other milestone the model's own interval only. Seeded: the same
  answers give the same intervals. Each bootstrap refit starts from the full fit of the same model (`WARM`: the same
  fit in fewer steps); a draw where no answer moves a column gives no value for it (`drawn`), never the full fit's or 0.
- **Verdicts** (`verdictOf`, final after `correct`). *Clear*: its adjusted p at most its family's level (below), so its
  interval at that level leaves the null value out (0, or the app's own guess rate). *No clear effect*: not clear, and
  its 95% interval lies within the smallest effect that would matter on each side of the null value: 0.1 on log time
  (about 10%), 0.25 logit, 5 points for a guess rate or a right − expected, 0.1 logit for the learning and forgetting
  slopes and for Time and difficulty's effects per log unit of time. *Not enough data yet*: with the answers that would
  carry it to either verdict, its interval at the level it faces leaving the null value out or its 95% interval inside
  the margin, whichever needs fewer (never fewer than it has), assuming the interval shrinks as 1/√n (slower when the
  players are few), rounded up to the hundred, or to 500 from 1,000 (`nice`); an interval wider than 20 gives no
  number. A spread (SD) never goes below 0: clear when its lower bound is above a tenth of its smallest effect, no
  clear effect when its upper bound is under that effect. *No such answers yet*: no answer moves the effect. *Not in
  the answer log*: what the log cannot measure.
- **Multiple testing** (`analysis.js` `PRIMARY`, `pOf`, `holm`, `bh`, `correct`). A milestone holds about 40 effects,
  each at 95%: about 2 would read clear by chance alone, and at least one would about 85% of the time. So each analysis
  declares the effects it exists to answer, chosen before looking at any result (**the primary effects**, below),
  tested together under **Holm** (`ALPHA` 0.05: the chance that even one of them reads clear by chance, whatever the
  dependence between them); every other effect is secondary, exploratory, tested together under **Benjamini-Hochberg**
  (`FDR` 0.05: among the exploratory effects read clear, about 5% at most are chance, on average; valid for independent
  or positively dependent tests), a lead to re-test on later answers before acting on it. An effect's p comes from its
  95% interval (the wider) read as a normal one on the side facing the null value, so p < 0.05 exactly when that
  interval leaves the null value out; an SD is tested against a tenth of its smallest effect, from its lower bound
  before the cut at 0. The estimate and its 95% interval stay as they are, the verdict uses the adjusted p, and the
  admin shows the adjusted p only in the verdict's tooltip (rule A2). Each tested effect stores its family (`fam` 1
  primary, 2 exploratory), `p`, the adjusted `pa`, and `alo` / `ahi`, its interval at the level its rank faces (it
  leaves the null value out exactly when the effect is clear). Typed
  answers in Learning curves are read as right answers against the typical question's, which has a guess floor they
  lack, so their null is the coefficient at which they are right as often (log 1.5 at 75% right with a ¼ guess floor),
  not 0 (`nul`). Not tested: the answers to reach 80% (a number, not a comparison), an effect with no estimate, and the
  descriptive views below; each interaction is one more exploratory test.
- **The primary effects** (`PRIMARY`): Response time, *right answers* and *the app's expected difficulty* (is answer
  time a signal the app could use, beyond right or wrong); Zoom, *enlarged, against the player's own habit* (does
  enlarging help); Photo factors, on the corals *poor quality* and *corallites instead of a colony* (the two rules the
  photo sets rest on: Poor photos feed the hard end, and the zoom levels go colony → corallites), on judged photos *the
  judged ease* (does the ease the draw starts from predict the right answers); Formats, *right − expected on 4 choices*
  and *on typed answers* (is the app's expected chance right on its main format and on the one with no guess floor);
  Confusions, *corallites shown* (do close views cut mix-ups); Learning curves, *the learning slope* and *Again after a
  miss* (does practice work; does Again help); Comeback, *the forgetting slope* and *comeback questions, right −
  expected* (do players forget over days; is the app's forgetting curve right); Sessions, *after a wrong answer* (do
  misses end sessions); Time and difficulty, *others answered the photo right slowly* (does the time others took on a
  photo say it is harder than the app thinks). 15 in all; a report tests those its subject has (a coral report at most
  14, one on judged photos at most 12). No spread (SD) is primary: an SD's estimate never reaches 0 (EM keeps it above,
  and its interval is not valid at that boundary), so a spread that is really 0 can read clear, with or without a
  correction (ROADMAP "Analyses: what the multiple-testing correction leaves open").
- **Milestones are looks, not new studies.** Each milestone refits a larger copy of the same log, so a result that
  turns clear at one milestone is no new finding: the admin marks nothing as new since the previous milestone, charts
  no clear result over time, and keeps the milestones as history.
- **Runtimes.** The draws are capped (above, and the interactions' below) so that a whole report refitted from scratch
  stays inside the Action's limit of 2 hours (`.github/workflows/analyses.yml`); the latest milestone's 999 draws cost
  time in proportion to its answers. The measured times are in the notebook.

The analyses (`ANALYSES`, in this order; each says when it has too few answers, and how many it needs):

1. **Response time** (100 answers with a time and an expectation, from 2 players): log seconds ~ right + typed +
   enlarged + 2 choices + the app's expected difficulty + log position in the session (both centred) + (player) +
   (unit) + (photo). The variance shares; the units, the players, and the slowest and fastest photos (3 answers or
   more), shrunk.
2. **Zoom** (100 answers with the enlarged flag, 5 enlarged): right ~ offset (the app's log-odds) + enlarged relative to
   the player's own habit (0 or 1 minus the player's share) + the habit (centred) + (player), with each question's guess
   rate.
3. **Photo factors** (200 answers whose photos all have features): an explanatory IRT model (an LLTM with a photo random
   effect), right ~ the photo features + typed + (player) + (unit) + (photo), reported as difficulty (+ = harder); a
   question with several photos takes each feature's share. On the corals (`photoMeta`, from the public files, the same
   for the Action and the admin): the view as the games show it (close-up, corallites, against a colony: `core.js`
   `applyCuration` then `applySlots`), quality (fair, poor, against good: the admin's rating, else the automatic one, an
   IMR lecture photo never automatically Poor), sharpness (per SD of log sharpness, from `data/metrics.json`), source (the
   admin's own, other iNaturalist, against the IMR lecture) and one view alone. **On the fish**, and every subject whose
   photos are judged (`SUBJECTS` `analyses` `photos: 'judged'`; `photoMetaFish`, from the photos its game plays: the
   admin's ease and tags where he set them, else the judging pass's): judged ease per point (centred on 3), juvenile,
   another phase (male, female, intermediate), oblique, head-on / tail / from above (against profile) and part of the
   fish (against whole); a question shows one photo, so no "one view alone", and a feature no answer measured is left
   out. Beside the effects, the spreads of the photos beyond their features and of the units, and the 8 photos furthest
   above and below what their features predict (2 answers or more).
4. **Formats** (100 answers with an expectation; a format from 20): per format (`FORMATS`: 4 choices, 4 shown of which 3
   or 2 plausible, Again, a duel in the quiz, the Duel tab, an exam question, typed), P = c + (1 − c) σ(x + d), x the
   app's own log-odds before its guess floor (`fmtFit`: Gauss-Newton, a weak prior on c around the app's guess rate):
   the real guess rate c against the app's fixed one, the difficulty d the app misses (reported as −d, + = harder), and
   right − expected, the model-light check.
5. **Confusions** (300 offers, 20 mix-ups): each wrong choice offered on a question with choices, picked or not ~ view
   shown (close-up, corallites, several views, against a colony; a view never shown, as on the fish, is no effect) +
   log(wrong choices) + (pair) + (player): the views that confuse more, the 15 pairs most mixed up (of each rank where
   ranks are told apart), and each player's mix-ups observed / expected from the pooled rates (its interval from the
   count's Poisson spread), with the player's own effect as an odds ratio beside it.
   **A common-name word shared with the option** (the name-confusion study's (h), Q124; `modWords`, `modMeta`, `mod`):
   where a tree subject's species units are asked by their common name (core.js `LEVELS` `cn`, `s:` + the species id;
   the options are the other species of the family), a column says whether the option shares a *modifier word* with the
   right answer: a word of its common name before the head noun (its last word), lower case, a hyphenated word as its
   parts ("Three-lined wrasse": three, lined), no possessive (an eponym, "Bleeker's"), no word of 2 letters or fewer or
   stop word ("Yellowtail", "Blackspot", "Bicolor" name a feature). It is exploratory (one test, Benjamini-Hochberg), read
   as the study's pre-declared first-letter test was: against the pair's visual similarity, which is what a name often
   describes, so a clear effect says the pairs that share a word are mixed up more, not that the name is the cause.
   Controls, each a column where it varies among those rows: the same genus (`sg`), the declared look-alike species
   (`lk`, fish.json `lookalikes`), and whether both units are such species units (`mo`); without them the effect reads
   negative on planted data, as the pairs sharing a word are never the declared look-alikes. The names come from the
   tree file (`meta.mod`: `tools/analyses.js` `metaOf`, the admin's Recompute here), in the report's fingerprint; none
   without them (the corals, the sea slugs while no species is asked by name).
6. **Learning curves** (200 answers; `lnFit`): right ~ log(1 + answers on the unit) + after a miss (on the unit shown or
   given wrongly, as the app counts it) + Again asked after it + typed + exam + comeback + (player) + (unit) +
   (0 + practice | player) + (0 + practice | unit): each player's and each unit's own learning slope around the common
   one, uncorrelated with its level, the practice centred on the answers' mean so each level is the level at typical
   practice (a slope is a factor with weights, `factor`, whose curvature `glmm` takes exactly); their spreads
   (`sd_gslope`, `sd_pslope`), read as the gain from twice as many answers either side of the common slope,
   exploratory as every SD. **Answers to reach 80%** beyond guessing (`MASTER` 0.8, `toMaster`): on a
   typical unit and per unit at its own slope (0 when the start is already there, 999 when a flat slope never gets
   there), its interval from 1,000 seeded draws of the intercept and the slope together and of the unit's own level and
   slope (`masterCI`), widened by the bootstrap's; *Clear* once the interval's top is under 999, else not enough data
   yet. The first-meeting card and the side-by-side comparison leave no row in the answer log: *Not in the answer log*.
7. **Comeback** (100 answers after a right one on the unit, 20 of them 30 minutes or more later): after a right answer
   on a unit, right ~ offset (that answer's expectation) + log(1 + days since) + (player): the forgetting slope; and
   over every comeback question (10 or more), right − expected, with its own bootstrap (the app's forgetting curve,
   "Comeback after a break"). Right answers by the time since, in bands from under 30 minutes to 10 days or more.
   **By genus** (`backGenus`, `stab`; descriptive, no verdict, outside the correction): a rusty comeback question
   carries the recall R the app gave it, logged in the scoring record (`prep` `R`; `r`, under 1 only), and the logged
   expectation e = g + (1 − g) R σ(ability part). Had the player's stability been κ times the app's, the recall would be
   (1 + (R^(1/C) − 1) / κ)^C with C = −0.5 (`model.js` `FSRS.C`): the days and the unit's own stability cancel, so only
   the logged R is needed. κ is fitted by maximum likelihood on log κ (`cbFit`: a grid over ±4, then a golden-section
   search), the ability part as the app had it, pooled, and for each genus with `CB.GEN` 5 questions or more under a
   normal prior of SD `CB.TAU` 1 on log κ centred on the pooled one (a genus with few questions is pulled in); the
   ranges are the cluster bootstrap's percentiles (from 6 players). It reads *clear* of the app only from `CB.MIN` 200
   questions and `CB.PLAYERS` 20 players (the comeback study's threshold) and says the answers the pooled range would
   need for ±30% (`need`). Biased towards less forgetting until the comeback's stopping rule is corrected for (about
   +0.09 on right − expected, the 2026-11-14 comeback study): an upper bound on remembering, said on the card.
8. **Sessions** (100 answers, 10 session ends; a session ends after 30 minutes without an answer, `GAP`):
   Kaplan-Meier of the length (a session still open, its last answer under 30 minutes before the log's end, censored)
   and a discrete-time hazard, stop after this answer ~ wrong + 2+ misses in a row + expected difficulty + slow (log
   seconds against the player's median) + log position + (player). Beside it, sessions in figures (`sessDesc`):
   counts and means, no model (ARCHITECTURE.md "Analyses").
9. **Player profiles** (`profiles`): a description of how each player plays, never named types (from about 30 players
   at the earliest: Dalmaijer et al. 2022). Each player's last `PROF_N` 300 answers (all when fewer); a player under
   `PROF_MIN` 100 is greyed and left out of the tree, the map and the groups, one under `PROF_LOW` 20 not shown; 3
   players of 100 answers are needed. Eight behaviours (`PROF_F`), each net of what the app decided (`profFeat`, which
   takes any set of answers, so a later trajectory analysis can run it window by window): answer time (the player's own
   effect in the Response time model on those answers, a fast fit), enlarging (the share enlarged minus everyone's rate
   for the views shown), right beyond the app's expectation (right − expected), stopping after misses (the chance to
   end a session after 2+ misses in a row within it minus after other answers, each shrunk towards the pooled rate by
   `PROF_K` 10 answers' worth; open sessions left out), the last three from 20 answers; session length (median answers;
   a session cut by the window's start left out unless it is the only one), sessions a week (over the window, at least
   a week), both on a log scale; evening play (the share of answers from 17:00 to midnight, Manila time); and the
   **learning slope**, the player's own slope in the Learning curves model fitted on all the answers (`slopeOf`, from
   200 answers and 3 players: a slope needs the whole range of practice). z-scores over the players with a profile (a
   behaviour every player shares reads 0: a spread under a billionth of its size counts as none); Ward's tree on them;
   the behaviours ordered by average linkage on 1 − r; a PCA of their correlations (Jacobi, `eigSym`), each axis's sign
   set so its largest loading is positive. Groups: the tree cut into 2 to 5 where the average silhouette is best
   (`cutK`, `silhouette`). Stability (Hennig 2007): each group's best Jaccard in every run with one player left out and
   its mean over 50 to 200 bootstrap draws of the players (each draw re-standardised and clustered with its
   multiplicities, the groups compared as distinct players); stable only when every leave-one-out run keeps every group
   at `PROF_STAB` 0.75 or more and each bootstrap mean reaches it; unknown, never "not stable", when no leave-one-out
   run can be grouped (3 players).
10. **Time and difficulty** (`tdiff`, `tdFeat`; 100 answers with others' answers on their photo, 2 players, 200 timed
    answers; "Response time as information on difficulty" above): the reverse of Response time and Zoom. Before each
    answer, the earlier answers of other players on its photo (the question's first photo): their right answers' z
    (log seconds minus that player's own median over their earlier timed answers, once they have `TD_MIN` 10; typed
    and enlarged answers out) and their enlarging minus their own share so far, each the photo's mean shrunk by `TD_K`
    3 answers' worth; right ~ offset (the app's log-odds, its photo rating included) + slow + enlarged + (player), with
    each question's guess rate: prequential, only earlier answers, as the app would have them. Then the time intensity
    beside difficulty (van der Linden 2006): log seconds ~ right + typed + enlarged + 2 choices + (player) + (unit) +
    (photo), and right ~ the photo's time intensity + typed + 2 choices + (player) + (unit) + (photo). Shown: the
    units' and the slowest and fastest photos' time intensity beside their difficulty from the accuracy alone (a third
    fit, no covariate), their correlation over the photos with 3 timed answers or more and the units with 5
    (descriptive; shrinkage lowers it), and right against expected by the others' speed (faster, about, slower than
    their usual: ±0.1, `TD_ZB`). The others' features are fixed in the bootstrap (it resamples the answers' players,
    not the features' sources). A unit's time intensity is not tested: beside the unit's own effect it is not
    identified with a few dozen units.
11. **Player trajectories** (`trajectories`, `TR`; Pierre, 2026-11-05, Q78: learning trajectories from the first answer
    to now): the behaviours of Player profiles but the learning slope, on successive windows of `TR.W` 100 answers of
    each player's whole history (a player needs two windows, 3 players in all; the newest `TR.MAXW` 40 windows a player,
    the `TR.SHOW` 60 players with the most answers in the report). `profFeat` runs once on every window of every player,
    each window a unit of its own (the answer time model, the stops' pooled rates), so a window is read against all the
    windows, not against the players of its own stage. The typical player: each behaviour's median over the players with a
    value at that window, from 3 players. Up, down or about the same: a player's last window against their first, beyond
    `TR.FLAT` 0.5 SD of the behaviour's windows. Descriptive, no verdict, outside the multiple-testing correction.

**The rank asked** (`rankOfUnit`, `rkLev`, `rankRef`). For a subject with a sheet per rank (`SUBJECTS` `sheets`: the
fish, the sea slugs), a question asks a family (`f:` ids), a genus (`g:`) or a species unit (`s:`); each answer's rank
is read from the unit's id prefix, else the log's Rank column, else the subject's own rank. The reference is the rank of
its game units from the start (`unitRank`, else `rank`: the fish's families, the sea slugs' genera), and each other rank
with `RK_MIN` 20 answers or more gets a 0/1 column, its questions against the reference's, in every model with a
unit-level term: Response time (log seconds), Photo factors (difficulty), Confusions (log-odds of a mix-up per offer; a
question's choices stay within its rank, so a pair has one rank) and Learning curves (log-odds of a right answer, with
the answers to reach 80% on a typical unit of each rank, `n_rk_*`). The unit's random effect then varies around its
rank's mean; where a view lists units (seconds by unit, answers to 80% by unit, the Wright map, each unit with practice,
the pairs most mixed up), each unit's own value carries its rank's coefficient, its variance added to the unit's
(`rkUnit`, `rkFold`), and the admin draws each rank's units apart. Formats (no unit-level term) adds each rank's
right − expected (`oe_rk_*`, every format together, once two ranks have 20 answers), as the app's Elo carries a rank
offset of its own. Unchanged: Zoom, Comeback and Time and difficulty's first part (the app's expected log-odds as an
offset, the rank's offset in it), Time and difficulty's second part (its question is the photos' time intensity; the
unit's random effect holds its rank's mean there), Sessions, and the profiles' behaviours but the answer time and the
learning slope (fitted with the ranks). The rank effects are exploratory, never primary. Assumptions: the rank is a
unit-level covariate (each unit has one rank), identified between units, so its precision follows the number of units
per rank, not the answers; the units' spread is the same in every rank (one variance component); the rank effect
compares the same players' questions at different points of their path (the other ranks' units open later), so a
player's growth between those points is in the player's effect only as an average: in Photo factors, which has no
practice term, a rank effect also holds what players learned meanwhile, and Learning curves (with practice) is its
cleaner reading; the bootstrap is over players, not units, so a rank effect's interval leans on the model's own (Wald)
part, which counts the units' spread. On the corals (one rank) no answer carries a rank.

Views of how effects and units relate, each descriptive unless it says otherwise:

- **Effects hard to tell apart** (`entOf`, every analysis with two effects or more from one model): the correlation of
  the estimates, from the fixed effects' covariance marginal over the random effects (`cov2cor(vcov(fit))` in R; signs
  as the effects are reported, so two difficulties keep theirs); the correlation of the conditions in the answers (the
  design matrix's columns) and each condition's variance inflation factor over every condition of the model (VIF, the
  diagonal of the inverse correlation matrix). Read in words past |r| = 0.6 for the estimates (read the two together:
  their sum is sure when r < 0, their difference when r > 0; each alone is not), 0.7 for the conditions (Dormann et al.
  2013) and a VIF of 5. Formats: each format's guess rate against its difficulty, fitted together (`fmtFit` `cr`). With
  `ENT_B` 200 bootstrap draws or more (the latest milestone's 999), `rb`: the correlations of the effects' values over
  the draws where every reported effect has one (`nb`), over the players, so it carries what the model's covariance,
  conditional on its random effects, leaves out; the admin reads it in place of the model's (the model's beside it in
  the table). Under 200 draws, the model's alone.
- **The mix-up map** (`mixMap`, in Confusions): the units mixed up at least once, as shown or as answered (3 or more).
  Similarity of two units = the lower end of the 95% range of their pair's shrunk effect in the Confusions model (how
  much more often, at the least, they are mixed up than a typical pair, per offer: offers, not counts, which mirror the
  app's traps), 0 for a pair not clearly above a typical one or never offered, so chance alone makes no family;
  distance = 1 − similarity / the largest; average linkage (`hclust`, Lance-Williams, deterministic ties); families =
  the groups of two or more left when the tree is cut at `MIX_CUT` 0.8 (`cutTree`). Each cell (shown → answered) carries
  its rate shrunk towards its pair's model rate by `MIX_K` 20 offers' worth, so a direction shows only with many offers.
  Across: the 3 cells most mixed up between two families, 2 mix-ups at least, above a typical pair's rate (a colony
  photo, 4 choices). **Its stability** (`mixStab`, `mixFams`): in each bootstrap draw of the Confusions model, the
  draw's own families (the same cut); each family's best Jaccard with one of them (0 when none shares a unit),
  averaged over the draws; stable from 0.75 (Hennig 2007, as the player profiles' groups). The admin names the stable
  families as found again when the players are drawn again, the others as not stable yet; without draws (the demo),
  not checked yet. The cut stays at 0.8: a stable height is read, not searched for.
- **The Wright map** (`wrightOf`, in Learning curves): players and units on the Learning model's one scale, the log-odds
  of recognising beyond guessing for a typical question. A player's place = the intercept + the practice slope at their
  own current practice (the median answers already given on the unit over their last 300 answers) + their own effect,
  at their own slope; a unit's difficulty = minus its own effect at the typical practice (the photos the app chose for
  it included). Level = about 50% beyond guessing; logit(0.8) above = the app's 80% target. Each place's likely range
  carries the intercept's and the slope's uncertainty with their covariance, beside the player's or unit's own effect; a
  unit's chance is read for the typical player (median current practice, own effect 0), with the lowest and highest the
  model gives any player. A snapshot of the bank's reach, not of the questions asked: the app aims near 80%, so it makes
  players and units meet.
- **A second skill?** (`resOf`: residuals, never a PCA of raw right / wrong answers): the unit × player table of
  standardised residuals after the Learning model, sum(right − P) / sqrt(sum P(1 − P) + `RES_K` 2) per cell, 0 when
  never met (players with 100 answers or more, units met by 2 of them or more, from 3 players and 5 units; each
  player's column centred), and a PCA of the players' columns (units as points, players as arrows). The first axis's
  share of the spread is set against the same share in `RES_SIMS` 99 tables built from answer logs simulated from the
  fit itself (Linacre 1998, Raîche 2005; a share, as the simulated logs are not refitted). No verdict, outside the
  multiple-testing correction.
- **Does it depend on …?** (interactions, `ixTest`): three interactions, each one omnibus test of its product
  coefficients. (1) **Enlarging × view** (`zoomIx`, in Zoom): the Zoom model plus each view's own level and its own
  effect of enlarging, against a colony photo (views with `IX_N` 30 answers and 5 enlarged or more). (2) **pair × view**
  (`confIx`, in Confusions): among the questions missed with choices only (`missRows`), each wrong unit offered is a
  chance to be the one picked, ~ view + log(choices − 1) + (pair) + (player) + each view's own effect for the
  `IX_PAIRS` 6 pairs most offered, each with `IX_NM` 20 offers on a colony and on another view; on missed questions
  only, as on every offer a pair often mixed up would show a pair × view "effect" from the log-odds scale alone, misses
  rising on harder views. (3) **format × practice** (`lnIx`, in Learning curves): the Learning model plus a two-choice
  level (Again, duels) and the practice slope of two-choice and typed questions apart from four choices' (formats with
  100 answers or more, at more than one practice count). Each test: the Wald chi-square of the product coefficients
  from the model's covariance and, with `BIX_MIN` 50 draws or more, from the covariance of the cluster bootstrap over
  players (`BIX` 199 draws at the latest milestone, 50 for the earlier ones and Recompute here: a covariance, not
  percentiles); the larger p of the two, as the wider interval elsewhere. **Exploratory**: one more test each in the
  Benjamini-Hochberg family (`correct`, `settleIx`). Verdict: clear at its adjusted p; no clear effect when every
  product coefficient's 95% interval (the wider) lies inside ±0.25 logit; else not enough data yet, with the answers
  that would carry it to either if the pattern held (the chi-square grows with the answers; the intervals shrink as
  1/√n). Each level's prediction (a linear combination of the fixed effects with its interval from the model's
  covariance, plus the pair's own effect and its conditional variance) is drawn level by level. (1) and (2) need the
  corals' views: none on the fish or the sea slugs.
- **Each genus with practice** (`gcurveOf`, in Learning curves): per unit, the right answers by the answers already
  given on it (the bins of the main curve, `LN_BINS`) against the model's own prediction of the same answers; its own
  slope (common + its own, with the common slope's variance and its own conditional variance); its chance of
  recognising it beyond guessing for the typical player at their current practice (as the Wright map), the units
  sorted by it. **Flat**: a one-sided test that its slope reaches the smallest that matters (0.1 logit per unit of log
  practice), corrected over the units by Benjamini-Hochberg at 5%: a lead (two forms to teach apart?), outside the
  milestone's correction. A unit reads flat only when its slope's whole likely range lies under 0.1.
- **Can we trust this model?** (model checks, `checkOf`, `checkLmm`): for each binary model (Zoom, Photo factors,
  Confusions, Learning curves, Comeback, Sessions), each player with 20 answers or more left out in turn (their rows
  weigh nothing in the fit: `HOLD`, `predictOut`, which starts from 0, not from the full fit, so a coefficient only
  their answers move learns nothing from them; their chance is averaged over the fitted players' own effects, level and
  slope, as for a player drawn from them, not read at the average player), from 3 such players and 200 rows: the
  predictions of their answers in `CHK_BANDS` 5 bands of equal counts against what they answered (calibration); the
  randomized quantile residuals (Dunn & Smyth 1996: uniform when the predictions are right) at 11 probabilities
  (`CHK_Q`); and, for the two models built on the app's own expected chance as their offset (Zoom, Comeback: the app's
  chance plus their corrections), the paired log-loss of the model against the app's chance with the players as the
  unit (players with 10 such answers, from 3: each player's mean difference, their mean, a 95% t interval on players − 1
  degrees of freedom, a sign-flip p, exact up to 16 players, else 9,999 draws: "Real-answer replay" below). A model
  without that offset knows nothing of a new player's level, which the app does, so it gets no comparison. Response
  time: its standardized residuals in the fit at the normal's quantiles. Outside the multiple-testing correction. One
  fast refit per player per model.

**Tests.** Synthetic answer logs whose true effects are known (`synth`, `TRUTH`) check that the fits give them back
within the tests' tolerances (`tests/analysis.test.js`), the correction and the structure views on planted nulls and
effects (`tests/analysis-verdicts.test.js`), the interactions (`tests/analysis-ix.test.js`), the per-unit slopes and
their spreads (`tests/analysis-slopes.test.js`), the model checks (`tests/analysis-checks.test.js`), the profiles and
Time and difficulty on a planted link between a photo's time and its difficulty (`TRUTH.td`;
`tests/analysis-views.test.js`), the rank effects (`tests/analysis-ranks.test.js`) and the judged photo features
(`tests/fishphotofactors.test.js`). The admin demo (`demoLog`) plays the same generator on the real photos; it plays
look-alikes as mix-ups (`TRUTH.mix`: a look-alike offered is picked 4 times as often as another unit when the answer is
wrong), so the demo's map has families. Known limits: the photo SDs come out a little low (PQL's known shrinkage); a
guess rate is pinned only by the weakest answers (its interval stays wide); and a correction cannot remove a bias: a
null effect the model gets wrong can stay clear, which the bootstrap's wider intervals only soften.

