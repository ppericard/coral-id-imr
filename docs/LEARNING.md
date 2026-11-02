# Learning model: research and choices

How the app decides what to ask, how hard, and when a genus counts as learned; and how the shared statistics rate the
photos. Each choice says where it comes from: published work, Pierre's decisions, or our own measurements (the
three-player simulation, `tests/profiles.smoke.js`). Keep this file in step with the code: a constant changed here is
changed there, with the reason.

Code: `app.js` (the player's own model, in the browser), `core.js` (shared helpers, also run by the admin), the sync
sheet script `tools/sync/Code.gs` (statistics pooled over every player, `stats_`). ARCHITECTURE.md describes the code;
this file explains why it works that way.

## The players we design for

Pierre, 2026-11-02: three typical paths, handled by one dynamic algorithm, **never by coded tracks, tiers or
exceptions**:

1. **A complete beginner** who finds the game and starts from nothing.
2. **An IMR Research Assistant (RA)**, who plays from the first day of their course: light, patchy knowledge after one
   lecture.
3. **An expert** who already knows the corals and wants to see how far they can go, up to the hardest levels.

We are closer to Duolingo (bring people who know nothing to knowledge, bringing items back until they are mastered)
than to an exam on people who already know (Pierre). A new player is a beginner, not an average player.

## Research we rely on

- **Elo rating in education** (Pelánek 2016, *Computers & Education*): a student's answer is a match between student
  and item; both ratings move after each answer, by K × (result − expected). An *uncertainty function* (K shrinking with
  the number of answers, e.g. a / (1 + b·n)) gives fast first estimates and stable later ones; different uncertainty
  for students and items is advised. "If the skill is expected to change quickly, K should stay large." Our photo and
  ability ratings are this model.
- **Prior vs current knowledge** (Papoušek, Pelánek & Stanislav, EDM 2014; Pelánek et al., UMUAI 2017): split into
  prior knowledge (item difficulty and global skill, from each student's first answer per item), current knowledge
  (repeated answers, learning, with asymmetric updates: PFA / "PFAE") and question choice. Designed for geography, where
  people already know some facts.
- **Glicko and Glicko-2** (Glickman 1999, 2012), used in education by Coursera (EDM 2019) and Park (EDM 2021): a rating
  carries its uncertainty (rating deviation); an uncertain rating moves its opponents little; **volatility** grows when
  results keep surprising, so the rating catches up with a real change.
- **Duolingo**: *Birdbrain* (2020; IEEE Spectrum) estimates exercise difficulty and learner ability together, an Elo
  generalisation updated after every exercise, every answer counted. *Half-life regression* (Settles & Meeder, ACL 2016)
  fits each word's difficulty beside the learner's own counters with that word (times seen, right, wrong): repeats count,
  against what the learner is expected to remember.
- **Bayesian Knowledge Tracing** (Corbett & Anderson 1994): probability that a skill is known, with guess and slip.
- **Urnings** (Hofman et al. 2020; Bolsinova et al. 2022): an Elo alternative with explicit standard errors, robust to
  adaptive item selection, used in Math Garden. **Keeping Elo alive** (Bolsinova et al. 2025): with adaptive selection,
  Elo ratings' variance inflates over time; two parallel chains help. Not adopted (see below), kept in mind.

## The player's own model (app)

### Ability per genus (Elo) and the global level

- `P[genus].th`, on the photo-difficulty scale (0 = average photo). P(right) = g + (1 − g) · σ(ability − difficulty),
  g = 1 / plausible choices. Step K = `ELO.kmax` / (1 + answers / `ELO.n`), never below `ELO.kmin` (Pelánek's
  uncertainty function). `ELO = {kmax: 0.8, kmin: 0.25, n: 15, lo: −1.5, hi: 3, vr: 0.1, vg: 2}`.
- **Volatility** (2026-11-02, Glicko-2): `s.vr` is the moving average of the surprise (result − expected, rate
  `ELO.vr`); the step grows by up to `ELO.vg` × |vr|, within kmax. Why: simulated, a beginner or an RA at 80-87% right
  stayed rated as a beginner, because a shrinking step assumes a stable skill. A first version (vr 0.2, vg 3) made the
  global level swing; softened.
- **Global level** `P['~level']`: the same Elo over every answer. A genus never answered starts from it
  (`core.js playerStart`: 0.8 × global × M / (M + 10), clamped to [−0.5, 1.5]), so a strong player gets traps, single
  views and harder photos on a new genus from its first question.

### What a question shows

- **Photos**: drawn around ability − `PICKD.TARGET_OFF` (1.0), about 80% expected success.
- **Online calibration** (`CAL`, Pierre 2026-11-02: about half the 600 game photos had never been shown to anyone, so
  they could not be rated). Adaptive tests seed new items among the calibrated ones to calibrate them (pretest items,
  online calibration in computerized adaptive testing). Here a photo with few answers from all players (the sheet's
  plain count) weighs × (1 + `CAL.B` / (1 + answers / `CAL.N`)), B 2, N 2: × 3 with none, × 2 after 2, × 1.5 after 6,
  on top of the difficulty targeting. That alone hardly changed which photos came up: most photos never shown are single
  views of a colony (256 of the 340 unrated), which the colony choice scores down so that beginners see colonies at
  every zoom, and corallite photos of complete colonies only show as the hint (not counted unless opened). So `CAL.RATE`
  = 20% of the questions are calibration questions: one view alone (as for strong players), the colony chosen on the
  targeting and the bonus only, the view the players have answered least. Simulated (3 players, 1200 questions, the
  real ratings of 2026-11-02 as start, counts updated as the sheet does): photos with at least one answer 426-435 →
  465-510, with 3 or more ~200 → 225-234, right rates unchanged (73-87%). The bonus fades by itself as the photos get
  answers.
- **Look-alike traps** among the wrong choices: from ability (`TRAP`: one per 0.18 above 0, up to 3), chosen among the
  pairs most confused: pooled over every player and declared look-alikes (IMR lecture, Coral Finder) as a prior
  (`CONF`), then the player's own record on the pair (personal path).
- **Experts keep hard choices** (2026-11-02): when the player's own record clears every pair (an expert confuses
  nothing), the traps the level asks for come from the pairs other players confuse most, then the declared look-alikes,
  instead of easy genera. Simulated before this: an expert's traps fell from 1.8 to 0.1 a question.
- **Easy wrong choices come first from genera the player has met** (2026-11-02): a beginner is not asked to choose
  between names never seen.

### Which genus comes next: the progressive path (2026-11-02)

Pierre: rather than spamming a beginner with 40 genera, focus on the easiest ones, opening new ones as they go,
everything estimated from the data. Before, a genus never seen weighed 10 against 1-4 for one being learned: a beginner
met the 39 slate genera almost at once.

- **Opening by results**: while fewer than `OPEN.K` (5; 3 at first) genera met are *shaky*, the genera not met yet share
  `OPEN.READY` (35%) of the draw; otherwise `OPEN.TRICKLE` (3%), so a new one still comes now and then. A share, not a
  weight, so the pace holds as the genera met add up.
- **Shaky** = met, not mastered, and the player's expected success on an average photo of the genus (4 choices, at its
  difficulty) under `OPEN.P` = 0.6, from the genus ability. That ability allows for how hard the questions were and
  starts from the global level, so the signal is what the player knows, at any level, from the first answer. Tried and
  dropped, all in the simulation (Pierre spotted the first): recent misses (2 in the last 5): the game keeps everyone
  near 80% right, where that happens about one time in four at any level, so an RA opened fewer genera than a complete
  beginner; BKT knowledge alone: climbs too slowly on a beginner's easy photos; a minimum of answers per new genus: held
  an expert back, each new genus waiting to be drawn again.
- **Easiest first, softly**: among the genera not met, weight exp(−`OPEN.T` × (difficulty − easiest)), `OPEN.T` = 3 (1.5 was too weak to show with the narrow spread of difficulties before real data).
- **Trusted only as far as the data goes** (`easyTrust`): the easy-first preference is scaled by the players' answers
  behind the photo ratings, over `OPEN.DATA` = 300 (weighed), up to 1. Before real answers, the photo sets and declared
  look-alikes put Acropora and Galaxea among the hardest and Alveopora first, against Pierre's experience: the opening
  order stays random (still a few genera at a time) until the answers can say.
- **Genus difficulty from the data** (`genusDiff`), never set by hand: the mean difficulty of its game photos
  (`photoDiff`: Pierre's Easy/Medium/Hard photo sets at first, the players' answers as they come) + `OPEN.CONF` (2) ×
  how much it gets confused (its two highest pooled confusion scores above `CONF.TRAP`). With little data the photo sets
  and declared look-alikes decide; the answers take over as they come (Pierre expects Acropora and Galaxea to come out
  easy: the data will say).

### Knowledge (BKT) and mastery

- `P[genus].L` from BKT (`BKT.L0` 0.1, learning `T` 0.08), guess and slip depending on the photo's difficulty: right
  answers on hard photos count most. **A miss never raises L** (2026-11-02: on the hardest photos slip passed guess and
  a miss lifted the genus).
- **Mastery exam**: at L ≥ 0.95, `EXAM.n` = 5 hard questions on the genus alone, unannounced, at least `EXAM.gap` = 8
  answers apart; all right = Learned. No time criteria anywhere (rule).
- **Where L starts** (2026-11-02, Pierre's point 3): `BKT.L0` for everyone, except a player whose global level is
  clearly high and rests on `BKT.LVN` (30) answers or more: then up to `BKT.L0MAX` (0.5), growing continuously from
  level `BKT.LV0` (0.5) to `LV0 + LVR` (2.0). An empirical-Bayes prior, as the Elo start of a new genus already uses the
  global level. The exam is unchanged: an expert still proves each genus with its own 5 hard questions. Simulated: an
  expert mastered 7 genera in 600 questions before, 5-21 after (4 seeds).

## Pooled statistics: photo difficulty and confusions (sheet v17-v18, 2026-11-02)

Photo difficulty feeds every player's game (which photos, how hard), and confusions pick the traps. They must reflect
real learners, not bots, random clicks or test runs (17 anonymous "players" turned out to be `tools/perf.js` runs).

- **Who counts** (`trusted_`, `TRUST`): players, signed in or not (v18; v17 left out devices that never signed in),
  with at least 10 answers (per player; a photo counts from its first answer) and a right rate clearly above chance (one-sided z ≥
  1.645 against each question's guess rate), judged on the whole history at each recompute: a beginner who gets out of
  chance then counts with all their answers. Every answer still moves the player's own level.
- **How much an answer weighs** (`PHOTO_W.N`; the sheet also returns the plain count of the answers, v18, which the
  admin's filters use): n / (n + 10) after n answers of the player (n + 30 in v17) (Glicko's idea: an uncertain
  player moves the items little). A beginner's random first answers weigh little, their informed later ones more.
- **Repeats** (`PHOTO_W.NEW`, `KNOWN`): every answer counts, against the player's own history with the photo, as in
  Duolingo's half-life regression and PFA: a photo new to the player is expected 0.5 harder, one already right twice 1
  easier (the app's own rule). Counts grow by the weight too (they damp later steps and are the app's confidence in a
  rating).
- **Everyone starts as a beginner** (`PLAYER0` = −1, about 45% right on an average photo with 4 choices): starting at 0
  (average), a beginner's misses made the photos look harder.
- A corallites hint left closed is not logged with the answer (not seen when answering). Names are matched case-blind.

## Considered and not adopted

- **First answer per photo only** (Papoušek 2014): standard for prior knowledge, where people already know the facts.
  Our players learn the corals in the app, so the first answer is the noisiest and later informed ones would be dropped.
  Tried in v17's first draft; Pierre rejected it, replaced by the experience weight and the history-aware repeats.
- **Urnings**: principled standard errors and robustness to adaptive selection; heavier to build and to run in the sheet
  script. To revisit if the photo ratings drift (the variance inflation "Keeping Elo alive" describes).
- **Coded tracks or tiers** (beginner / RA / expert modes, a fixed genus order, fixed difficulty per genus): ruled out by
  Pierre. Every threshold above is continuous or performance-driven.
- **Time criteria** (response time, spacing in days): ruled out (AGENTS.md rule: no time criteria anywhere).

## Simulation (`tests/profiles.smoke.js`, CI)

Three players through the real quiz, 300 questions each (600 in the exploration). The learner model is ours, not the
app's: `know[g]` = chance to recognise genus g on an average photo (beginner 0.02, RA 0.55 on 2 genera in 5 and 0.1
on the others, expert 0.93), lowered on harder photos and single views; otherwise a guess among the plausible choices;
each answer teaches `rate` × (1 − know). The numbers show trends, not real players: recalibrate with real answers.

The quiz draws from the 39 genera of the IMR slate; the 6 bonus genera (Millepora, Isopora, Leptoseris, Heliopora,
Sandalolitha, Pleuractis) open one by one with the progress (at 10%, 15%, ... 35%, `BONUS_AT`) and keep at most 15% of
the draw. The tables count the 39 (the first table of 2026-11-02 said "45", counting the bonus genera by mistake).

Calibration of `OPEN.K` (Pierre, 2026-11-02: "600 questions and only twenty-some genera open for the RAs may not be
enough"), 600 questions, 3 seeds, genera met (beginner / RA / expert):

| `OPEN` | after 100 | after 300 | after 600 |
| --- | --- | --- | --- |
| K 3, P 0.6 (first) | 12-14 / 9-17 / 25-31 | 14-23 / 18-29 / 34-39 | 26-37 / 26-34 / 39 |
| **K 5, P 0.6 (now)** | 9-14 / 14-20 / 21-37 | 19-21 / 27-30 / 39 | 28-29 / 33-39 / 39 |
| K 5, P 0.5 | 11-15 / 15-28 / 34-35 | 22-30 / 27-34 / 39 | 33-39 / 36-39 / 39 |
| K 6, P 0.5, READY 0.5 | all 39 by question 500 / all 39 by question 200-400 / 39 at 100 | | |

K 5 with P 0.6 is the small step Pierre asked for: the RA opens faster (one genus more every ~15 questions at first),
the beginner stays on about ten genera for the first 100 questions. Lowering P too made the beginner open faster as well (18 genera
in 100 questions in the CI test, which keeps that at 16 at most). Mastery is barely changed: an expert masters
10-17 genera in 600 questions (9-21 with K 3); the first ones come around question 300, after 95% and the 5 exam
questions at least 8 answers apart, so the CI test checks that an expert has genera ready for their exam (95% sure)
after 300 questions, not mastered ones.

Exploration of the first setting (K 3), 600 questions, 4 seeds:

| | Beginner | RA | Expert |
| --- | --- | --- | --- |
| Genera met after 100 questions (before: all 39) | 11-14 | 8-16 | 11-31 (31 in 2 seeds of 4) |
| Genera met after 600 | 26-33 | 26-35 | 37-39 (39 by question 200 in 2 seeds) |
| Traps a question, end (before: ~0.1 for all) | 0.3-0.5 | 0.2-0.6 | 1.5-1.7 |
| Genera mastered after 600 (before: expert 7) | 0-1 | 0-4 | 5-21 |

The beginner and the RA open at about the same pace here because the learner model's RA knows its genera only at 55%,
near the `OPEN.P` threshold, and its beginner learns fast; with real players, recalibrate.

Known limits: with little real data, the genus difficulty is mostly the photo sets and declared look-alikes, so "easiest
first" is weak until answers come in. Learners are still rated cautiously (abilities around −0.5 at 80-90% right in the
simulation); recalibrate `ELO` and `OPEN` once a few RA cohorts have played.

## Decision log

- 2026-11-02, Pierre: anonymous answers do not rate photos; sign in to count (reversed the same day, below); stats only from players above chance;
  developer test answers deleted (admin anonDelete); first-answer-only rejected; experience weight and history-aware
  repeats; players start as beginners.
- 2026-11-02, Pierre: three player paths, nothing coded per path; progressive opening of genera, easiest first, from
  the data; experts keep hard traps; adaptive step (volatility); BKT start from the global level (point 3).
- 2026-11-02, Pierre: genera should open a little more easily for the RAs: `OPEN.K` 3 → 5 (table above); to
  recalibrate with real answers.
- 2026-11-02, Pierre: devices that never signed in count again for photo difficulty and confusions (sheet v18), under
  the same rule as everyone (clearly above chance, weighed by experience): the rule, not the
  sign-in, is what tells a real player from a bot or a test run. Signing in still saves the progress, for the trainer
  and on any device, and puts the player on the leaderboard.
- 2026-11-02, Pierre: the photo ratings must move quickly, the first players being RAs and experts who all bring real
  information (Pierre, Emmy, and an anonymous player who is probably IMR staff): `PHOTO_W.N` 30 → 10 (sheet v18). The
  10th answer of a player now weighs 0.5, the 30th 0.75 (were 0.25 and 0.5). `TRUST.N` stays 10: it counts a player's
  answers, which every real player passes quickly (lowered to 5 for a moment, when it read as answers per photo; there
  is no minimum per photo: one answer moves it, the app blending it with the photo's set as 5 answers' worth). To
  revisit if beginners or bots arrive in numbers.
- 2026-11-02, Pierre: OK to seed the photos nobody has answered into the games to calibrate them (`CAL`, above).

## References

- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. *Computers & Education*
  98. <https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf>
- Papoušek, J., Pelánek, R., Stanislav, V. (2014). Adaptive practice of facts in domains with varied prior knowledge.
  *EDM 2014*. <https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf>
- Pelánek, R., Papoušek, J., Řihák, J., Stanislav, V., Nižnan, J. (2017). Elo-based learner modeling for the adaptive
  practice of facts. *UMUAI* 27. <https://www.fi.muni.cz/~xpelanek/publications/umuai-adaptive-practice.pdf>
- Glickman, M. (1999). Parameter estimation in large dynamic paired comparison experiments. *Applied Statistics* 48;
  Glickman, M. (2012). Example of the Glicko-2 system.
- Park, Y. (2021). Glicko-2 for student ability and problem difficulty. *EDM 2021*.
  <https://educationaldatamining.org/EDM2021/virtual/static/pdf/EDM21_paper_8.pdf>
- Settles, B., Meeder, B. (2016). A trainable spaced repetition model for language learning. *ACL 2016*.
  <https://aclanthology.org/P16-1174> · code and data: <https://github.com/duolingo/halflife-regression>
- Duolingo, Birdbrain: <https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain>;
  IEEE Spectrum, How Duolingo's AI learns what you need to learn: <https://spectrum.ieee.org/duolingo>
- Corbett, A., Anderson, J. (1994). Knowledge tracing. *UMUAI* 4.
- Hofman, A. et al. (2020). Tracking with (un)certainty. *Journal of Intelligence* 8.
  <https://dspace.library.uu.nl/bitstream/1874/396191/1/jintelligence_08_00010_v2.pdf>; Bolsinova, M. et al. (2022).
  Urnings: a new method for tracking dynamically changing parameters in paired comparison systems.
- Bolsinova, M. et al. (2025). Keeping Elo alive. *British Journal of Mathematical and Statistical Psychology*.
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12784335/>
