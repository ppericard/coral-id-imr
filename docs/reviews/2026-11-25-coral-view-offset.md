# The single-view offset per view: colony, close-up and corallites on the real log (2026-11-25)

Status: study, read-only, docs only (Linear REE-255). No engine value, app code, data file, curation or sheet was
changed. The sync sheet was read, never written (rules D1, L12). Players are P1, P2… (rule D2); no per-player row is
committed. Choosing a new value is Pierre's (rule L11, level 3): section 6 gives the options and their costs.

Labels (rule W11): **[measured]** computed by a script in [tools/studies/ree255/](../../tools/studies/ree255/) on the
files of `main` @a2bdfb22 and the answer log; **[read]** read in a file, a rule or a doc; **[guess]** a judgement.

## Why

Pierre, 2026-11-23 21:05 Manila (REE-252, carried into REE-255): a genus can often be identified «de loin, avec une
photo en wide». The REE-252 study ([2026-11-23-photos-per-observation.md](2026-11-23-photos-per-observation.md) §3)
found players beat the app's expectation on a colony view alone by +7.5 points and on a close-up alone by +7.0, but
only by +2.4 on corallites alone, against +4.1 for several views. The app gives every view shown alone the same
offset: +0.5 logit of difficulty (`core.js` `DOM.SINGLE`, `model.js` `PICKD.SINGLE`) [read]. This study fits that
offset per view, with its uncertainty, at equal level, format and genus.

Earlier evidence: the Q351 refit ([2026-11-14-q351-refit.md](2026-11-14-q351-refit.md), 3,308 coral answers to
2026-11-14) estimated "a photo alone" at −0.05 against today's +0.5, one value for every view [read].

## 1. Summary

- **Pierre's hypothesis holds on the whole log, for the colony and the close-up.** At equal level band, format,
  player and genus, a colony view alone is answered better than several views of a colony by **+0.34 logit (95%
  interval over players +0.07 to +0.61)**, a close-up alone by +0.33 (−0.01 to +0.59), corallites alone by −0.02
  (−0.55 to +0.61). That is about **+4 points** of success for the colony and the close-up. The offset that would have
  fitted: colony 0.16, close-up 0.17, corallites 0.52, against 0.5 today [measured].
- **One shared offset or one per view: the log cannot tell them apart.** On a held-out player, per-view offsets
  predict no better than one shared offset (10 of 15 players, mean +0.0002 log-loss per answer, p 0.76). The
  corallites' own value has an interval over a logit wide (303 answers, 9 players with 10 or more) [measured].
- **A lower shared offset than 0.5 is favoured, but the declared test does not show it at 5%.** One shared offset
  fitted on the other players beat today's 0.5 for 9 of 15 held-out players (p 0.039, 0.078 after Holm over the three
  tests). The replay of the sheet's photo ratings agrees: 0 beats 0.5 for 14 of 15 players (p 0.0001) and brings
  every kind within 1.6 points of its success rate. So does the Q351 refit [measured; read].
- **The excess sits in the log's first five days.** Before 2026-11-05 20:05 a colony alone was +0.60 logit (SE
  0.18); from then on +0.03 (SE 0.22), close-up +0.12 (0.26). The hierarchical photo Elo arrived on 2026-11-04 (#422):
  genus ratings learned mostly on views shown alone, with +0.5 built in, may now carry the misfit [measured; the cause
  a guess].
- **Fish and sea slugs:** every question shows one photo, so the offset is a constant there and cannot be measured.
  The fish's judged framing shows no difference from a profile beyond two standard errors (exploratory). Nothing to
  declare under rule S1 [measured; read].
- **Recommendation (section 6):** no per-view offsets. Keep 0.5 for now, and measure again with the same scripts on
  about 2,000 new coral answers logged after the REE-254 fix. Lower the one shared offset only if the later answers
  still show the excess, with a level 2 check.

## 2. Data and method

The method was written down and committed before any model was fitted
([tools/studies/ree255/README.md](../../tools/studies/ree255/README.md), commit 0b68eaf1). It is **post hoc on the log
REE-252 already examined**: the same extract, a new model. The checks added after the fit are marked exploratory.

- **Data.** The Answers tab as REE-252 read it (Sheets connector, read-only, 2026-11-23 about 21:15 Manila; the last
  answer 2026-11-22 18:36), pseudonymised. About 20 later rows (one session on 2026-11-24 08:27-08:29) are not in it.
  They came before the REE-254 fix (#1529, merged 09:44), so **no row of the log has the fixed hint logging yet**.
- **Rows.** Coral photo-quiz answers with a logged expectation, Find the X left out: 3,958, as in REE-252. Typed
  answers (77) and exam questions (3) are left out of the primary fit: **3,878 answers, 15 players, 45 genera,
  2026-11-01 to 2026-11-22** [measured]. 1,893 of them (12 players, the later part of the log) carry a scoring record.
- **The kind of question.** One photo: its view alone (colony, close-up, corallites; the view from `data.json` and
  `curation.json`). Two or more: several views of one colony. A one-view question never has a hint, so the three
  single-view kinds are exact. The several-view rows may hide one-view answers (the hint logged as seen when it stayed
  closed, REE-254): two sensitivities take them out.
- **The model.** P(right) = g + (1 − g) R σ(x + δ_format + λ_band + β_kind + a_player + b_genus). x is the app's own
  log-odds from the logged expectation (it already holds the +0.5, the photo, the memory and the mix-ups), g the guess
  rate, R the comeback recall. δ_format is a fixed effect per format (4 choices the reference), λ_band one per band of
  the logged ability on the genus (under 0.5, 0.5 to 1.5, 1.5 and over), so a miscalibration by level is not read as a
  view effect. β_kind is each view alone against several views (0); **the offset that would have fitted is
  0.5 − β**. Player and genus are random intercepts; their SDs come from the Laplace marginal likelihood (player 0.5,
  genus 0.3) [measured].
- **The structures compared.** `today` (every β 0), `shared` (one β for every view alone), `two` (colony and close-up
  together, corallites apart) and `per-view` (three β).
- **Inference per player** (rule L11): the primary comparison is the log-loss on a held-out player, each structure
  fitted on the other 14, with an exact sign-flip test over the 15 players and Holm over the three tests declared.
  Intervals: 2,000 bootstrap draws over players.
- **The replay** (rule L12): the sheet's photo Elo (`core.js` `eloReplay`, the rules of `Code.gs` `statsStep_`)
  replayed over the coral answers with the offset as an input per view, checked first to give `eloReplay`'s ratings
  exactly at 0.5 (largest difference 0 over 1,442 photos) [measured]. Each answer's expectation before its own step
  gives the next-answer log-loss per player. It re-learns the photo and genus ratings under each offset, which the
  model above cannot. Its expectation is the sheet's (one level per player for every genus), not the app's.

## 3. The offset per view

**As REE-252 counted it** (logged expectation, no model) [measured]:

| Kind | Answers | Players (10+) | Right | Expected | Observed − expected |
| --- | ---: | ---: | ---: | ---: | ---: |
| Colony alone | 1,914 | 15 (14) | 82.2% | 74.7% | +7.5 |
| Close-up alone | 748 | 15 (11) | 82.6% | 75.6% | +7.0 |
| Corallites alone | 303 | 15 (9) | 83.2% | 80.8% | +2.3 |
| Several views | 913 | 14 (13) | 80.7% | 76.6% | +4.1 |

**The model** (β against several views, logits; 95% interval over players; the offset that would have fitted,
0.5 − β; the change in the expected success of that kind's answers if it had been used) [measured]:

| Structure | Kind | β | 95% interval | Offset that fits | Points |
| --- | --- | ---: | --- | ---: | ---: |
| per-view | Colony alone | +0.34 | +0.07 to +0.61 | 0.16 | +4.1 |
| per-view | Close-up alone | +0.33 | −0.01 to +0.59 | 0.17 | +4.0 |
| per-view | Corallites alone | −0.02 | −0.55 to +0.61 | 0.52 | −0.2 |
| two | Colony or close-up | +0.34 | +0.06 to +0.58 | 0.16 | +4.1 |
| two | Corallites | −0.02 | −0.55 to +0.60 | 0.52 | −0.2 |
| shared | Any view alone | +0.31 | +0.04 to +0.56 | 0.19 | +3.7 |

Per-view differences (bootstrap): colony − corallites +0.36 (−0.23 to +0.81), close-up − corallites +0.35 (−0.23 to
+0.80), colony − close-up 0.00 (−0.23 to +0.27). The format effects come out as the sheet's offsets do: 2 plausible
choices +0.96, 3 plausible +1.21, Again +0.14, Duel tab +0.12, a duel in the quiz +0.03. The level bands, against a
4-choice question on several views: under 0.5 +0.25, 0.5 to 1.5 −0.07, 1.5 and over −0.22 [measured].

**Sensitivities** (declared before the fit, uncorrected; β per view alone, SE in brackets) [measured]:

| Check | Answers | Colony | Close-up | Corallites |
| --- | ---: | ---: | ---: | ---: |
| The fit above | 3,878 | +0.34 (0.14) | +0.33 (0.17) | −0.02 (0.23) |
| Hint 1: several views without close-up + corallites | 3,794 | +0.35 (0.14) | +0.35 (0.17) | −0.01 (0.23) |
| Hint 2: several views without any corallites photo | 3,271 | +0.34 (0.21) | +0.35 (0.23) | +0.01 (0.28) |
| A photo intercept beside the genus's (within a photo) | 3,878 | +0.36 (0.15) | +0.38 (0.18) | −0.01 (0.24) |
| Typed answers kept | 3,955 | +0.35 (0.14) | +0.36 (0.17) | −0.03 (0.23) |
| Scoring-record rows, x + the game's format offset | 1,893 | +0.01 (0.22) | +0.17 (0.26) | +0.45 (0.42) |
| Scoring-record rows, x alone | 1,893 | +0.06 (0.22) | +0.22 (0.26) | +0.48 (0.42) |
| First half (to 2026-11-05 20:05), 11 players | 1,932 | +0.60 (0.18) | +0.49 (0.23) | −0.22 (0.28) |
| Second half, 12 players | 1,946 | +0.03 (0.22) | +0.12 (0.26) | +0.30 (0.40) |
| Ability under 0.5 | 1,653 | +0.35 (0.20) | +0.25 (0.26) | −0.11 (0.43) |
| Ability 0.5 to 1.5 | 1,417 | +0.52 (0.21) | +0.42 (0.25) | −0.03 (0.33) |
| Ability 1.5 and over (46 several-view answers) | 808 | −0.93 (0.78) | −0.57 (0.82) | −0.90 (0.84) |

Exploratory, added after the fit (uncorrected): photos with under 5 earlier answers, 3,443 answers: +0.44 (0.15),
+0.42 (0.18), +0.03 (0.24); 5 or more, 435 answers: −0.12 (0.41), +0.15 (0.47), +0.18 (0.93); the second half with a
photo intercept: +0.06 (0.22), +0.16 (0.27), +0.30 (0.41) [measured].

What it says:

- **The hint does not change it.** Taking out the several-view rows that may have been answered from one view leaves
  every value within 0.02.
- **Within one photo the result holds**: the same photo alone against with its other views, +0.36 and +0.38.
- **The time split matters most.** The excess is in the first half; the second half and the scoring-record rows
  (which are the later log) show none for the colony. The game's own format offsets change nothing within those rows
  (+0.01 against +0.06). [guess] The genus offsets of the hierarchical photo Elo (2026-11-04, #422) are learned mostly
  on views shown alone, with +0.5 built in, so a new photo of a genus may now start from a rating that already holds
  the misfit; the first days rated photos from 0. The log cannot separate that from the change of players and levels
  between the halves.
- **Strong players** (ability 1.5 or more) see almost only one view at a time, so their comparison rests on 46
  several-view answers: it cannot tell.

## 4. One shared offset or one per view

**Held-out players** (each structure fitted on the other 14 players, the held-out player's own intercept 0; mean
log-loss per answer; exact sign-flip over 15 players; Holm over the three declared tests) [measured]:

| Comparison | Mean difference | Players lower | p | Holm |
| --- | ---: | ---: | ---: | ---: |
| per-view − shared | +0.0002 | 10 of 15 | 0.76 | 0.76 |
| shared − today | −0.0017 | 9 of 15 | 0.039 | 0.078 |
| two − per-view | −0.0002 | 14 of 15 | 0.0001 | 0.0004 |

Mean log-loss: today 0.4289, shared 0.4272, two 0.4272, per-view 0.4274. The third test only shows that the
corallites' extra parameter costs a little out of sample: colony and close-up share one value as well as they hold
two. The Laplace marginal likelihoods rank the structures today, shared, two, per-view (−1,791.1, −1,792.9, −1,795.3,
−1,799.5): with their weak priors, each added fixed effect costs more than it gains [measured].

**The replay** (the sheet's photo and genus ratings re-learned under each offset; the setting chosen on the other
players, scored on the held-out one) [measured]:

| Grid | Best shared | Best per view | Shared against today | Per view against shared |
| --- | --- | --- | --- | --- |
| Declared, 0 to 0.5 by 0.125 | 0 (all 15 folds) | 0, 0, 0 | −0.0095, 14 of 15 lower, p 0.0001 | 0.0000, p 1 |
| Second half scored alone (exploratory) | 0 (all 12 folds) | 0, 0, 0 (11 folds) | −0.0082, 10 of 12 lower, p 0.077 | +0.0008, 0 of 12 lower |
| Wider, −1 to 0.75 (exploratory) | −1 (14 folds) | −1, −1, −1 (13 folds) | −0.0138, 9 of 15 lower, p 0.10 | +0.0009, 0 of 15 lower |

The replay's calibration, right against predicted:

| Kind | Right | Today 0.5 | Shared 0 | Shared −1 |
| --- | ---: | ---: | ---: | ---: |
| Colony alone | 82.2% | 79.9% | 81.4% | 84.5% |
| Close-up alone | 82.6% | 79.9% | 81.4% | 84.6% |
| Corallites alone | 83.2% | 82.6% | 83.9% | 86.7% |
| Several views | 80.7% | 82.3% | 79.1% | 72.2% |

- At 0, every kind is within 1.6 points of its success rate; at 0.5, a colony and a close-up alone are predicted 2.3
  and 2.7 points under theirs, several views 1.6 over.
- Below 0 the log-loss still falls, but several views drop 8.5 points under their success rate: the offset then
  stands in for another misfit of the sheet's model (one level per player for every genus, while views alone go to
  players further on), not for the view. Read as the edge of what this replay can say.
- **Per view never helps**: in every grid each view's best value is the same, and per-view offsets lose a little out
  of sample.

## 5. Fish and sea slugs

- **Fish**: 3,513 quiz answers (9 players), every question one photo [measured]. The +0.5 is then added to every
  question alike, both in the app's scoring and in the sheet's photo ratings (`Code.gs` line 1217, `core.js`
  `eloReplay`), so it is absorbed by the photo and unit ratings and cannot be measured (Q351 found the same: the term
  became the intercept) [read].
- **Exploratory, the fish's judged framing** (the game file's `jt`; 2,820 answers of 8 players with a tag; the same
  model, a profile of the whole fish the reference): oblique +0.01 (SE 0.21, 438 answers), from above +0.25 (0.46,
  104), part of the fish +0.88 (0.53, 105), head-on or tail +0.22 (0.76, 24) [measured]. No framing beyond two
  standard errors. A framing is a photo feature the photo ratings learn; it is not a view shown alone or with others.
- **Sea slugs**: 163 answers, 2 players. Nothing can be measured.
- **Rule S1**: one engine. The offset applies where a question can show a photo alone or beside its colony's other
  views; today only the corals have views (`model.js` `photoSet`). A per-view value would follow the photo's view in
  the data, not the subject, so no subject-specific exception would be needed [read].

## 6. What a change would touch, the options and their costs

**Where the offset acts** [read]:

- the draw's aim: a view alone gets a photo 0.5 easier (`model.js` `photoSet`, `PICKD.SINGLE`);
- the scoring: the question's difficulty d0 (`quiz.js` `recordAnswer`), so the expectation, the ability step and the
  bar's likelihood;
- the bar's reference: a unit's bar is the share of its photos named alone, at the genus offset + `DOM.SINGLE`
  (`core.js` `domScore`, `model.js` `domFromCounts`);
- the sheet's photo and genus ratings (`tools/sync/Code.gs` `statsStep_`, a literal 0.5; its `DOM` copy) and the
  admin's `core.js` `eloReplay` (a literal 0.5);
- the simulators' truth: `tools/learnsim.js` `LEARNER.SINGLE` and `tools/ratedworld.js` `RATED.SINGLE`, both 0.5.

**The options for Pierre** (the costs are rule L11's and LEARNING.md "Validating a learning change"; nothing was
run):

| Option | What it does | Checks and costs |
| --- | --- | --- |
| A. Keep 0.5, measure again (recommended) | Nothing changes. Rerun these scripts on a fresh extract once about 2,000 coral answers are logged after the REE-254 fix | Real log only: this study's scripts, a few minutes of compute. No simulation |
| B. One shared value lower (0.25, or the fitted 0.19) | Views alone get slightly harder photos; the scoring expects more of them; every coral bar rises a little (the bar's reference gets easier) | Level 2: it moves the draw, the score and the bar. The app world (coral profiles × 5 seeds × 300 questions) and the rated world (10 seeds per profile × 10,000 answers, normal and heavy-tailed photos), plus this replay. The simulators' truth must take the same value, or the check measures the engine against the old assumption; the simulation then checks the mechanics only. A rules version (rule D5: every player's bars and abilities replayed), a sheet script change (D3) and the app waiting for it (D4). Choosing the value itself is level 3: Pierre's go and GitHub runners |
| C. One value per view (colony, close-up lower, corallites 0.5) | As B for colony and close-up | As B, and a new rule for the bar's reference (which view's offset a unit's bar takes: a weighted mean by the unit's photos per view is one choice). Three values to choose at level 3 (each against today, Dunnett or Holm). The log does not support it (section 4) |
| D. The sheet fits the offset, as it fits the format offsets | One fitted value served with `?stats=1`, kept current by the log | A new served field (D3, D4), a fitted value moving the bar unless the bar keeps a fixed one; a design question before any check. Level 2 |

**Recommendation.** **A**, then **B** if the excess persists. Not **C**: per-view offsets predict no better than one
shared offset, they add two constants and a new rule for the bar (rule L11, the simplest algorithm that works), and
the corallites' value is the least known. **B** is not proposed now: the declared per-player test does not reach 5%
after Holm, the excess is in the first days of the log, and B moves every player's bar. The answers logged after the
REE-254 fix will also give clean several-view rows. [guess] If the next measure still finds a shared excess near
+0.3 logit in answers after 2026-11-05, B at 0.25 (half way, inside every interval of section 3 and 4) is the
smallest step to check at level 2.

## 7. What the figures cannot say

- **What players think they can do.** The log shows how they do against the app's expectation, not their own view of
  it.
- **Survey-distance photos.** The colony photos are curated so the growth form is visible (rule P2); ReefCloud's wide
  shots are not in the game.
- **The species rank**: corals are played at genus level only.
- **Who gets a view alone is not random**: strong players and calibration questions get more of them. The model holds
  the level band, the format, the player and the genus; within a band, the photo chosen for a view alone was aimed
  easier by the same 0.5 under test.
- **Several views at a high level**: 46 answers.
- **The cause of the time split** (section 3): a guess.
- **The replay** is the sheet's model, not the app's; beyond 0 it stands in for another misfit (section 4).
- **About 20 rows** from 2026-11-24 are not in the extract.

## Reproduce

Inputs outside the repository: the pseudonymised extract (`pseudo.py` on a fresh read of the Answers tab, columns A to
W) and a checkout of `main`. Every script is read-only.

| Command | Gives |
| --- | --- |
| `python3 -I tools/studies/ree255/prep.py answers.json . rows.json` | the rows (labels only) |
| `python3 -I tools/studies/ree255/fit.py rows.json out.json` | sections 3 to 5 ([out/fit.json](../../tools/studies/ree255/out/fit.json)); a few minutes of compute, in the machine slot |
| `node tools/studies/ree255/replay.js answers.json rows.json out.json` | section 4's replay ([out/replay.json](../../tools/studies/ree255/out/replay.json)); seconds |
