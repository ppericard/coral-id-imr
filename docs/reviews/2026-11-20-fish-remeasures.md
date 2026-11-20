# Read-only measures of 2026-11-20: the fish re-measures, the family levels, proposition 2

Four read-only measures made on 2026-11-20, none of which changed the app, the sheet or the repository. Players are P1,
P2… (rule D2). The figures that describe the code in force are also in [LEARNING.md](../LEARNING.md); the open items are
in [ROADMAP.md](../ROADMAP.md) (rows "Re-measure the fish photo exposure…", "Remove the fish easy-photos bootstrap…",
"learnsim: long runs crash, and the genus share", "Independent review of the learning algorithm").

## R55: the fish photo exposure

Data: the sync sheet's Answers tab (6,653 rows, 2026-11-01 to 2026-11-20; fish 2,823, of which 2,816 scored, 9
players); players with 50 or more fish answers are read per player. The row declares no numeric threshold, so the
measures are descriptive, against the coral study (docs/reviews/2026-11-06-photo-exposure-study.md), the notebook's
fish simulations and `model.js` `RARE.SHARE` (10%, the cap on photos under ease 4 before Open Water, in force from
2026-11-08).

| Measure | Fish, 2026-11-20 | Comparator |
| --- | --- | --- |
| Observation repeats, all questions | 3.1% (2,816 questions) | corals 20.9%; fish simulation 4.3-8.7% |
| Observation repeats from a unit's 11th question | 2.4% (670 questions) | corals 38% (photos); simulation 4.8% |
| Photo repeats, all / from the 11th | 3.1% / 2.2% | corals 18.7% / 38% |
| Observation repeats per player (50+ answers) | 1.3% to 8.7% | |
| Never shown, today's pool (24,504 photos, 23,504 observations, 64 entries) | 92.4% of photos, 92.1% of observations | corals 18% |
| Questions per pool photo | 0.115 | corals 1.4-2.0 |
| Answers per photo shown (2,257 photos) | median 1, mean 1.25, max 6 | |
| Under ease 4 before Open Water, since the cap (family units, from 2026-11-08 13:05) | 14.1% (127 of 899, 95% [12.0, 16.6]) | before the cap 27.3% (270 of 990); simulation 35.7-37.2% |
| The same without the 13 units where `RARE.FEW` likely applies (after looking) | 9.1% (77 of 848, 95% [7.3, 11.2]) | cap 10% |
| Proxy: a unit's first 10 questions, since the cap | 24.7% (218 of 884, 95% [21.9, 27.6]) | not reconciled |

- **Repeats: clear, no problem.** The fish draw almost never shows an observation twice; every player is under 9%.
- **Never shown: a traffic figure.** The players gave 2,816 answers to a pool about 18 times the corals' of 2026-11-06
  (the raw `fish-game.json`, no curation applied, so an upper bound on the photos in play). It says nothing about the
  draw.
- **Under ease 4 before Open Water: above the cap by the declared rule** (lower bound above 10%; 2 of the 5 players
  with 20 or more such answers are well above it: 20% and 28%). The share did halve after the cap. 50 of the 127 sit on
  13 units where the log never showed three distinct photos judged 4 or better, where `RARE.FEW` lets the three easiest
  through by design (Stonefishes, Garden eels, Sea moths, Soles, Snake eels); without them the share cannot be told from
  10%. That split was chosen after looking. The bar is the replay's (no first-launch prior), so "before Open Water" is
  approximate, and "since the cap" ends at the switch to the served fish ratings (2026-11-19 19:53 Manila).
- **Next, read-only:** the cap check per answer with the unit's pool of the time (so `RARE.FEW` is the code's own, not
  a proxy) and a cross-tab of the replayed bar against the question index. If the share still exceeds 10% outside the
  `RARE.FEW` units, a bug report on `model.js` `rareCap`; if not, the row closes.

## R64 / R72: the fish judged ease against the served ratings

The measure Q351 (b) proposed (docs/reviews/2026-11-14-q351-refit.md), run on the real log only (rule L12). Arms: the
ease's weight 0.5 (today), 0.25 (Q351's refit) and 0; each arm rescales the ease's part of every row's logged
difficulty before the switch to the served ratings, 2026-11-19 19:53 Manila, and replays every player's abilities
through `core.js` `scoreAnswer`. The ease of the time is 4 minus twice the logged difficulty, on the 0.5 grid the log sits on. Rows after the switch
are counted, not measured. Primary (declared, fresh): per player with 20 or more answers after the 0.33 lead (after
2026-11-13 16:40), next-answer log-loss of 0.25 less 0.5, exact sign-flip over players; with n players the smallest p is
2 / 2^n, so under 6 players "Clear" is impossible.

| Measure | Result | Reading |
| --- | --- | --- |
| Primary, fresh answers, weight 0.25 less 0.5 | 356 answers, 1 player with 20+: −0.0030, p 1.0 | Not enough data yet |
| Secondary, fresh, weight 0 less 0.5 | −0.0025, 1 player | Not enough data yet |
| Every pre-switch answer (2,711, 9 players), 0.25 less 0.5 | −0.0012 per player (5 of 9 lower), p 0.70 | in-sample; no difference |
| Every pre-switch answer, 0 less 0.5 | +0.0044 (3 of 9 lower), p 0.48 | dropping the prior is, if anything, worse |
| The ease's slope on the replayed log-odds (1 is the right scale) | 0.24, jackknife about [−0.05, 0.53]; fresh −0.18 (1 player) | consistent with Q351's 0.33 [0.08, 0.59] |
| After the switch | 105 answers, 2 players | counted only |
| R72: judged ease against the served residual (rating less unit offset), photos with 3+ answers | 73 photos, Spearman −0.155, permutation p 0.19 | Not enough data yet; the sign is right |
| Same, photos with 1+ answers | 1,855 photos, Spearman −0.265 | the sign only |
| The served ratings | 2,257 photos rated, median 1 weighed answer, none at 5 | a fish photo's served difficulty is still its prior |

**Not enough data yet on either row.** The gate (ratings served since #1148, species questions built) is met in the
code, not in the data. The fresh pre-switch window closed at the switch and cannot grow; every future fish answer is
post-switch, where the logged difficulty already holds the served rating. The re-run must rebuild the ease's share of
each post-switch `d` per row (`PDIFF.W` / (n + `PDIFF.W`) × (3 − ease) × 0.5, the photo's weighed answers and the ease
of the time, as `tools/studies/q351/refit.js check --ease` does) and rescale only that share. It needs at least 6
players with 20 or more post-switch fish answers (the test's floor, smallest p 0.031; today 2 players) and about 100
photos with 5 or more answers (today none). Q368's re-run mark, about 20 players, stands. The engine stays as it is:
nothing here supports a change or rules one out.

## The family levels and the genera

The ROADMAP row "learnsim: long runs crash, and the genus share" asked why, once the scientific genera are accepted, a
simulated player's family levels came late (fq80a at about 2,000 answers against 1,100): the simulated player or the
game? Worked on `main` 3eb5fa17c.

**Neither, today: the figure belonged to a rule since undone.** The 2,000-answer figure came from the first app-world
`--ach` timing table (2 seeds × 2,500 answers), where the genera's offer was accepted at answers 31-199: the rule of
#702 (Q205), genera at a family's Open Water, uncapped, about 60% of the questions. #720 moved the genera back to
Advanced; the notebook's second table, on that day's `main`, shows fq80a at 978-1,230 again; #975 (the rank share, Q382)
then capped everything below the families. That the first table ran under #702 is an inference from its offer timing
and date; that commit was not re-run.

**Rated world, today's head** (`tools/ratedworld.js`, fish, `--app truth`, learner `count`, 5,000 answers, a scratch
wrapper adding two profiles identical to beginner and lecture RA except that the offer is declined; paired by seed; 10
seeds were planned, the compute cap cut the run at 5 paired seeds, 21 runs). The answer at which the nth family reached
Advanced, median of the 5 seeds, accepted / declined, and the paired difference accepted less declined (mean, sd):

| nth family at Advanced | beginner acc. / dec. | paired difference | lecture RA acc. / dec. | paired difference |
| --- | --- | --- | --- | --- |
| 5th (fq80a) | 1,113 / 1,060 | +19 (98) | 728 / 927 | −67 (137) |
| 10th | 1,245 / 1,161 | −17 (87) | 825 / 1,077 | −62 (134) |
| 15th (fq80b) | 1,355 / 1,276 | +17 (60) | 1,097 / 1,108 | +5 (94) |
| 20th | 1,496 / 1,469 | +22 (45) | 1,209 / 1,268 | +55 (135) |
| 25th | 1,676 / 1,566 | +89 (119) | 1,832 / 1,688 | +13 (102) |
| 30th | 2,171 / 2,681 | −32 (687) | 2,525 / 2,474 | −284 (769, 4 pairs) |

Families at Advanced at answers 1,000, 3,000 and 5,000 (median): beginner 4 / 3, 31 / 30, 32 / 32 accepted / declined;
lecture RA 11 / 7, 30 / 29, 32 / 32. With 5 pairs and sd about 100, the 95% interval on the mean difference is about
±125 answers from the 5th to the 25th family (±1.24 sd per row, so ±55 to ±170; the widest, the beginner's 25th, runs
from −59 to +237): the intervals exclude a delay of the row's size (about 900) or #822's (2,300-3,300) and leave open a
smaller one, up to about 250 answers (an interval's half-width is not a bound on the delay); the 30th is too noisy. Exploratory, no primary declared, no correction. The arms
split before any genus question (the offer's answer changes the planner's lists), so seed-by-seed differences are mostly
noise from the split.

Share of questions by kind (f family, g scientific genus, a auto IMR genus, s species by common name, x species by
scientific name), mean over the runs:

| Answers | beginner acc. | beginner dec. | lecture RA acc. | lecture RA dec. |
| --- | --- | --- | --- | --- |
| 301-1,000 | f 99.5, s 0.5 | f 99.5, s 0.5 | f 81, a 15, g 3, s 2 | f 82, a 15, s 3 |
| 1,001-2,000 | f 64, g 24, s 12 | f 64, s 36 | f 47, g 30, a 9, s 13 | f 47, a 9, s 42, x 2 |
| 2,001-3,000 | f 20, g 52, s 28 | f 24, s 76 | f 18, g 48, a 4, s 30 | f 18, a 3, s 74, x 5 |

The genera and the species by common name hang from the same level and sit under one rank-share cap: accepting mostly
changes what fills the share below the families.

**What the figures cannot say.**

1. No app-world figure today: the row's own command was cut at its budget with 0 of 4 runs (cause not established); the
   latest app-world evidence is the notebook's 8,000-answer run (fq80a at 978-1,230).
2. "Simulated player or game?" is half answered: neither learner transfers a genus answer to its family (each unit has
   its own knowledge), so any delay seen is dilution. Whether a real player's genus answers also teach the family
   cannot be measured on the log, which holds no fish genus answers in quantity (rule L12).
3. **The auto IMR genera are not tested.** An IMR player gets them from their family's Open Water without the offer, and
   `app.js` `shareFree` leaves them outside the rank share (#975's reading). Q219 gives them their Open Water opening and
   says nothing of a share; Q382 came later. They take 15% of the lecture RA's answers 301-1,000 and 9% of 1,001-2,000,
   mostly before the 5th family is at Advanced (answers 600-1,242), where the rank share would allow a few %. No measure
   shows it costing anything (the lecture RA reaches its families before the beginner), and the arms do not vary it. A
   rated-world arm with `shareFree` empty would; only if it shows a cost does a question go to Pierre.
4. 5 paired seeds, not 10; the profiles' fish parts are assumptions, not fits (`tools/learnprof.js`).

The groups-of-4 opening plan (`opening-study.md`) does not change the answer for the offered genera (the batch opens
only when its 4 units fit under the cap), and may matter for the IMR player's uncapped genera: its level-2 check reports
the lecture RA's family Advanced timings against today's.

## Proposition 2 of the algorithm review

[Proposition 2](2026-11-02-learning-algorithm-review.md) (§4.2: enter the exam when the predicted success on a reference
hard question, difficulty +1, single view, 4 choices, is at least about 0.9 and K has fallen below a level; fill the bar
from that probability) was written against BKT. Since #646 the bar is the domain score and the exam opens at `DOM.EX`
0.85 of it; no BKT step is left. Pierre declined a model beyond BKT + Elo on 2026-11-08 (ROADMAP "Declined").

The review's gate was run as a shadow of today's: P_ref = 1/4 + 3/4 sig(θ − d_ref) at least 0.9, d_ref the unit's offset
+ 1 + 0.5 (single view), K below a level taken as 15 or more own answers.

- **It cannot open on most genera.** θ is capped at `ELO.hi` 3. Reading "+1" as above the unit's offset, P_ref tops out
  at 0.863 on a genus of offset 0, and only genera at −0.37 or lower can reach 0.9: 7 of the 45 coral genera with a
  logged offset. Read as an absolute difficulty of 1, it tops out at 0.863 on every genus.
- **Today's entry already meets the review's own criterion.** Rated world, corals, 4 profiles × 5 seeds × 3,000 answers,
  at each unit's first exam question (618 units examined; the true reference success is 1/4 + 3/4 sig(logit know + π − μ
  − 1 − 0.5)):

  | Profile | Units examined | True success at entry, mean [90% lower bound] | Share at 0.85 or more | Bar at entry | Shadow gate opened (units) |
  | --- | --- | --- | --- | --- | --- |
  | beginner | 105 | 0.991 [0.989] | 1.00 | 0.857 | 8 |
  | lecture RA | 150 | 0.985 [0.984] | 0.99 | 0.857 | 11 |
  | strong RA | 172 | 0.983 [0.979] | 1.00 | 0.858 | 13 |
  | expert | 191 | 0.939 [0.932] | 0.98 | 0.857 | 14 |
  | all | 618 | 0.975 [0.968] | 0.99 | 0.857 | 46 (7%) |

  The shadow gate opened on 46 units, never on one today's gate had not opened, on average 337 answers later. Needed:
  0.85. The entry looks late rather than early in the simulation (true success 0.985 against a bar of 0.857): that is the
  bar's calibration, not this proposition.
- **Real log:** 18 exam questions from 3 players (corals 4, 3 right; fish 14, 13 right): "Not enough data yet". A pass
  rate known to ±5 points needs about 70 exam questions from 10 or more players. The corals' replay runs without the
  sheet's served statistics for rows before the scoring record, so its gate figures are approximate.

**Proposition 2 stays overtaken.** Its substance is in today's engine (the exam opens on a threshold of a predicted
success that carries its own evidence); what it would still change is the source of the prediction.
