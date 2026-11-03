# Learning model: research and choices

How the app decides what to ask, how hard, and when a genus counts as learned; and how the shared statistics rate the
photos. Each choice says where it comes from: published work, Pierre's decisions, or our own measurements (the
three-player simulation, `tests/profiles.smoke.js`). Keep this file in step with the code: a constant changed here is
changed there, with the reason.

Code: `model.js` (the player's own model, in the browser; `app.js` before 2026-11-02), `core.js` (shared helpers, also run by the admin), the sync
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
  results keep surprising, so the rating catches up with a real change. The deviation also grows with the time a player
  has not played (Glickman 1999: RD² + c² t): after a break the rating is less certain, not lower, and the first results
  settle it; the comeback's rust works the same way (expected, then settled by the answers; the rating never decays).
- **Duolingo**: *Birdbrain* (2020; IEEE Spectrum) estimates exercise difficulty and learner ability together, an Elo
  generalisation updated after every exercise, every answer counted. *Half-life regression* (Settles & Meeder, ACL 2016)
  fits each word's difficulty beside the learner's own counters with that word (times seen, right, wrong): repeats count,
  against what the learner is expected to remember.
- **Bayesian Knowledge Tracing** (Corbett & Anderson 1994): probability that a skill is known, with guess and slip.
  Used for the progress bar until 2026-11-02, replaced by a moving average (below).
- **Mastery criteria** (Pelánek & Řihák, UMAP 2017; *New Review of Hypermedia and Multimedia* 2018): which answers feed
  the mastery decision and where its threshold sits matter more than the learner model; an exponential moving average of
  the answers is a simple, good criterion. The progress bar since 2026-11-02.
- **FSRS** (Free Spaced Repetition Scheduler; Ye, Su & Cao, KDD 2022, and the open-spaced-repetition FSRS-4.5/5
  releases used by Anki): the power-law forgetting curve R = (1 + 19/81 · t / S)^−0.5 (R 0.9 at t = S), first-review
  stabilities 0.4 / 1.2 / 3.2 / 15.7 days (Again / Hard / Good / Easy), and stability growing at each successful review
  the more the item had been forgotten (spaced reviews count, massed ones hardly). The comeback's recall model.
- **SM-2** (Wozniak 1990, SuperMemo, the algorithm Anki started from): intervals multiplied by an ease factor, 2.5 by
  default, at each successful spaced review.
- **Warm-up decrement** (Adams 1961, *Psychological Bulletin* 58; Irion 1948): after a rest, performance dips at first
  and comes back within a few trials, apart from what was forgotten; why a comeback starts on the genera the player is
  surest of, with photos a little easier.
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
- **Global level** `P['~level']`: the same Elo over every answer, without the `kmin` floor (since 2026-11-03: it
  settles as its answers build up). A genus already answered moves with it, weighed by its own uncertainty ("Global level
  and genus", below). A genus never answered starts from it
  (`core.js playerStart`: 0.8 × global × M / (M + 10), clamped to [−0.5, 1.5]), so a strong player gets traps, single
  views and harder photos on a new genus from its first question.
- **The genus wrongly given** (rule 13) counts in its progress, its recent results and its runs, not in its Elo ability
  (since 2026-11-03, below).

### The genus wrongly given in the Elo (2026-11-03)

Pierre, 2026-11-03: the app under-estimates strong players. A replay of a strong RA's 378 real answers put her global
level right (about 1.07) but her genus abilities at 0.12 on average, where a fit of the same answers gives about 0.7.
The main cause was the Elo step on the genus wrongly given: a full miss on an average photo (difficulty 0, whatever the
photo), with a step size that never shrank (the genus's answer count was not raised, so K stayed at its first value).
Over her answers it took 32.4 logits off the genera she picked against 51.8 added by her right answers: one wrong pick
cost about three right answers. Then a trap: a genus under 0 gets no look-alike choices (2 plausible, easy), its
photos cannot get easier, so right answers moved it little while the wrong picks kept pushing it down. Pierre: the
principle "when two genera are confused, both are affected" is fine, but how, and with what weight, must follow
standard practice.

**What standard practice does with the option a learner picked wrongly:**

- **Elo learner models of adaptive practice** (Pelánek et al., UMUAI 2017, the geography system outlinemaps.org, with
  multiple-choice questions of 2-6 options and distractors chosen from past confusions: "Kenya is most often confused
  with Tanzania (24%)"): only the item asked is updated. They state it: "we assume that learner's knowledge of an item i
  is not influenced by answering questions about other items – this is a simplification in the case of multiple-choice
  questions where the item i can occur as a distractor". Their current-knowledge model (PFAE) updates the item asked
  only, γ = 2.23 after a right answer and δ = −0.89 after a miss; guessing is 1/n; the uncertainty function a / (1 + b·n)
  shrinks with each update of the estimate it belongs to (a 1, b 0.05-0.06; Pelánek 2016).
- **Multivariate Elo** (Pelánek 2016 §2.4; Doebler et al. 2014): an answer moves related skills too, by their
  correlation c_ij × K × (the surprise on the item asked). For correlated skills of a domain, not for the distractor
  picked, and never as a full miss.
- **Duolingo's half-life regression** (Settles & Meeder 2016): each word's features are its own counters (seen,
  right, wrong) and its lexeme tags; nothing about the other words of the exercise.
- **The nominal response model** (Bock 1972; Thissen & Steinberg 1984) and **option tracing** (Ghosh, Raspat & Lan
  2021): the option chosen carries information, but as a parameter of the question's options (which wrong option draws
  which learners) and about the learner's skill or misconception on the question's own topic, not as a miss on the
  item named by that option.
- **Glicko** (Glickman 1999): the step is proportional to the rating's uncertainty, and every result used also lowers
  it. The old rule used each wrong pick at full strength and never counted it.

**Why the picked genus is not updated.** It feels natural that picking B for a photo of A shows the player does not
know B. But the Elo ability θ_B means one thing only: the chance to name B when a photo of B is shown. A wrong pick of
B is a false alarm (a photo of A taken for B), not a miss on a B photo; it tells about the A / B boundary, not about
recognising B photos. That information is kept where it belongs: in B's progress (rule 13: the pick counts as a miss
for B, weighed by `pgMissW`, so B cannot be learned on that run), in the pair's confusion (the player's own `s.conf` and
the pooled scores: the pair comes back as traps, look-alike duels and "Again: A or B?"), and in A's ability (the miss
on A). The data agree: on the real answers, the first question on a genus right after it was given wrongly for
another genus (141 answers) was answered right 81% of the time; with the old step the app expected 0.72 (log-loss
0.494), without it 0.81 (0.466). A false alarm on B did not make the next B photo harder for the player. Over every
genus the prediction improves too (log-loss 0.481 → 0.465, table below). A pair-level term (the chance on A lowered
when a genus the player confuses with A is among the choices) is the principled home for "they confuse A and B": to
study (ROADMAP).

So no standard model penalises the chosen distractor's own knowledge with a miss. The confusion itself is kept where
those systems keep it, on the pair: the player's own mix-ups (`s.conf`) bring the pair back as traps, duels and
"Again: A or B?", and the pooled confusions pick the traps (rule 14c). Rule 13 stays: a wrong answer counts against
both genera in the progress (`pgObs` with `pgMissW`, the photo against the genus's own ability), in its recent results
(`s.h`) and runs (`s.streak`), so the genus wrongly given still loses progress and cannot be learned on that run.

**Measured on the real answers** (`tools/abilityeval.js`, read-only export of the sheet's Answers tab of 2026-11-03
18:09, 1,270 answers; the 9 players with 20 answers or more, 1,183 answers with their logged expectation): each
player's answers replayed in time order (a stable sort of the logged times) with the app's own Elo (model.js `abilityStep`, core.js `playerStart`, the question's
difficulty recovered from the logged expectation and ability), each answer predicted from the replayed ability before
it. Rules for the genus wrongly given: **a** the old one; **b** a miss step at the photo's difficulty, counted in the
genus's own uncertainty (as the progress line does); **c** b at half weight; **d** a, with the genus ability planned as
the global level plus an offset (Pelánek et al.'s global + concept skill); **e** no step. **+W**: a genus never
answered starts from the full global level (`START.W` 1, not 0.8); **+L**: the global level's step without the floor
`ELO.kmin`.

| Rule | log-loss | Brier | mean predicted / right | 2 choices (727) | 4 choices (451) | level < 0 (203) | level 0-0.75 (363) | level ≥ 0.75 (617) | after a false alarm (141) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a (before) | 0.481 | 0.151 | 0.75 / 0.83 | 0.75 / 0.87 | 0.75 / 0.78 | 0.71 / 0.83 | 0.74 / 0.80 | 0.78 / 0.86 | 0.72 / 0.81 |
| b | 0.481 | 0.151 | 0.75 / 0.83 | 0.75 / 0.87 | 0.75 / 0.78 | 0.71 / 0.83 | 0.74 / 0.80 | 0.78 / 0.86 | 0.72 / 0.81 |
| c | 0.472 | 0.148 | 0.77 / 0.83 | 0.77 / 0.87 | 0.76 / 0.78 | 0.72 / 0.83 | 0.75 / 0.80 | 0.79 / 0.86 | 0.76 / 0.81 |
| d | 0.469 | 0.148 | 0.77 / 0.83 | 0.77 / 0.87 | 0.77 / 0.78 | 0.70 / 0.83 | 0.75 / 0.80 | 0.81 / 0.86 | 0.73 / 0.81 |
| **e (now)** | **0.465** | **0.145** | 0.79 / 0.83 | 0.80 / 0.87 | 0.77 / 0.78 | 0.74 / 0.83 | 0.77 / 0.80 | 0.81 / 0.86 | 0.81 / 0.81 |
| e + W | 0.467 | 0.146 | 0.79 / 0.83 | 0.80 / 0.87 | 0.78 / 0.78 | 0.74 / 0.83 | 0.78 / 0.80 | 0.82 / 0.86 | 0.81 / 0.81 |

Per player at the end (mean genus ability over the genera answered, weighed by answers; the static fit: maximum
likelihood per genus with a normal prior of sd 1 around the player's own fit over every answer):

| Player (answers) | global level | a | c | d | **e** | static fit, genus |
| --- | --- | --- | --- | --- | --- | --- |
| strong RA (378) | 1.07 | 0.11 | 0.33 | 0.54 | **0.59** | 0.73 |
| test account (164) | −0.35 | −0.42 | −0.29 | −0.45 | **−0.11** | −0.22 |
| player (186) | 1.32 | 0.96 | 1.17 | 0.76 | **1.40** | 1.77 |
| player (128) | 0.68 | 0.02 | 0.21 | 0.28 | **0.41** | 0.57 |
| player (112) | 1.47 | 0.46 | 0.62 | 1.09 | **0.82** | 1.29 |
| player (85) | −0.41 | 0.41 | 0.49 | −0.62 | **0.60** | 0.71 |
| anonymous (67) | 0.69 | 0.05 | 0.10 | 0.60 | **0.15** | 0.48 |
| Pierre (40) | 1.54 | 0.60 | 0.69 | 1.27 | **0.81** | 1.91 |
| player (23) | 0.78 | 0.19 | 0.21 | 0.52 | **0.23** | 1.06 |

- **b changes nothing** against a: the photo's difficulty (easy photos, below 0) makes the step larger while the
  shrinking K makes it smaller; the drag stays.
- **e predicts best** overall and in every level band, and moves the strong RA's genera from 0.11 to 0.59 (fit 0.73).
  The rest of the gap is the Elo's usual lag (a step that shrinks as answers come, on a player who learns).
- **2-choice questions stay under-predicted** (0.80 against 0.87 right with e; the Duel tab 0.85 / 0.93, quiz duels
  0.85 / 1.00 on 16): the 1/k guess rate under-credits a 2-choice question, where players also rule out the other
  name. On the questions with 4 plausible choices the app is calibrated (0.77 / 0.78). A separate question (ROADMAP).
- **+L** gives the global level alone a slightly better prediction (log-loss 0.467 → 0.464) and stops one player's
  level from collapsing (−0.41 against a fit of 0.56, after a run of misses following Open all: 0.02 with +L), but it
  changes nothing in the genus predictions (0.465) and nothing beyond the spread in the simulation: not adopted
  (ROADMAP).

**Simulated, comparing the rules** (`tools/learnsim.js`, 5 seeds × 600 questions, the four profiles, no `--stats`, the same seeds for
every rule; each cell: Elo ability − logit(true know) over the genera met (below 0: under-estimated) / |the same| /
right % since the previous row / genera met / learned / entered the exam / true knowledge of the slate; on `main` of 2026-11-03 before #402):

| Profile, question | a (before) | b | c | d | **e (now)** |
| --- | --- | --- | --- | --- | --- |
| beginner 100 | −0.43 / 1.39 / 88 / 16.0 / 0.0 / 0.0 / 0.25 | −0.73 / 1.38 / 85 / 15.2 / 0.0 / 0.0 / 0.25 | −0.51 / 1.31 / 84 / 15.6 / 0.0 / 0.0 / 0.25 | −0.97 / 1.45 / 77 / 16.6 / 0.0 / 0.0 / 0.26 | −0.20 / 0.99 / 81 / 18.2 / 0.0 / 0.0 / 0.27 |
| beginner 300 | −1.18 / 1.54 / 86 / 31.6 / 0.0 / 0.4 / 0.57 | −0.95 / 1.52 / 86 / 33.6 / 0.0 / 0.2 / 0.58 | −0.73 / 1.33 / 80 / 37.0 / 0.0 / 0.2 / 0.61 | −0.53 / 1.39 / 85 / 34.6 / 0.0 / 0.0 / 0.58 | −0.48 / 1.08 / 83 / 39.8 / 0.0 / 0.4 / 0.66 |
| beginner 600 | −1.85 / 2.04 / 89 / 40.0 / 0.6 / 3.4 / 0.85 | −1.88 / 1.98 / 87 / 40.0 / 0.4 / 2.2 / 0.85 | −1.74 / 1.79 / 87 / 40.0 / 0.0 / 2.2 / 0.86 | −0.92 / 1.20 / 87 / 40.0 / 0.4 / 3.4 / 0.85 | −1.41 / 1.46 / 87 / 40.0 / 0.2 / 3.4 / 0.87 |
| lecture RA 100 | −0.49 / 1.30 / 88 / 19.6 / 0.0 / 0.0 / 0.46 | −0.80 / 1.39 / 90 / 16.6 / 0.0 / 0.0 / 0.45 | −0.60 / 1.28 / 85 / 17.8 / 0.0 / 0.0 / 0.46 | −0.52 / 1.16 / 82 / 20.0 / 0.0 / 0.0 / 0.47 | −0.51 / 1.13 / 87 / 17.2 / 0.0 / 0.0 / 0.45 |
| lecture RA 300 | −0.93 / 1.29 / 87 / 38.2 / 0.0 / 0.6 / 0.73 | −0.99 / 1.38 / 86 / 38.8 / 0.0 / 0.4 / 0.73 | −0.76 / 1.21 / 83 / 40.0 / 0.0 / 0.2 / 0.74 | −0.89 / 1.16 / 85 / 39.8 / 0.0 / 0.2 / 0.75 | −0.60 / 1.02 / 86 / 40.0 / 0.0 / 0.0 / 0.75 |
| lecture RA 600 | −1.80 / 1.83 / 90 / 40.0 / 0.4 / 5.8 / 0.90 | −1.91 / 1.95 / 90 / 40.0 / 0.4 / 4.4 / 0.89 | −1.67 / 1.71 / 90 / 40.0 / 0.6 / 5.0 / 0.90 | −0.54 / 0.89 / 89 / 40.0 / 0.4 / 3.8 / 0.90 | −1.46 / 1.49 / 88 / 40.0 / 0.0 / 4.4 / 0.90 |
| strong RA 100 | −1.09 / 1.54 / 86 / 19.6 / 0.0 / 0.0 / 0.68 | −1.21 / 1.62 / 90 / 19.6 / 0.0 / 0.0 / 0.67 | −0.80 / 1.53 / 91 / 19.4 / 0.0 / 0.0 / 0.67 | −0.47 / 1.09 / 89 / 21.6 / 0.0 / 0.2 / 0.67 | −0.73 / 1.26 / 88 / 21.4 / 0.0 / 0.0 / 0.67 |
| strong RA 300 | −1.30 / 1.51 / 89 / 40.0 / 0.0 / 0.4 / 0.85 | −1.29 / 1.46 / 88 / 40.0 / 0.0 / 0.8 / 0.85 | −1.10 / 1.35 / 89 / 40.0 / 0.0 / 0.4 / 0.85 | −1.25 / 1.52 / 89 / 40.0 / 0.2 / 0.8 / 0.85 | −0.98 / 1.26 / 87 / 40.0 / 0.0 / 0.4 / 0.85 |
| strong RA 600 | −1.96 / 1.98 / 94 / 40.0 / 1.6 / 12.4 / 0.94 | −2.07 / 2.08 / 92 / 40.0 / 1.6 / 9.2 / 0.94 | −1.83 / 1.85 / 91 / 40.0 / 0.8 / 11.0 / 0.94 | −1.15 / 1.31 / 92 / 40.0 / 1.8 / 12.2 / 0.94 | −1.63 / 1.66 / 93 / 40.0 / 2.0 / 12.6 / 0.94 |
| expert 100 | −1.42 / 1.42 / 95 / 19.8 / 0.0 / 0.0 / 0.94 | −1.39 / 1.39 / 96 / 19.0 / 0.0 / 0.0 / 0.94 | −1.34 / 1.34 / 96 / 20.0 / 0.0 / 0.0 / 0.94 | −0.94 / 0.94 / 96 / 18.8 / 0.0 / 0.0 / 0.94 | −1.30 / 1.30 / 95 / 20.4 / 0.0 / 0.0 / 0.94 |
| expert 300 | −1.30 / 1.30 / 97 / 40.0 / 0.0 / 3.8 / 0.95 | −1.28 / 1.28 / 95 / 40.0 / 0.2 / 4.6 / 0.95 | −1.20 / 1.20 / 97 / 40.0 / 0.2 / 3.8 / 0.95 | −1.02 / 1.02 / 97 / 40.0 / 0.4 / 5.0 / 0.95 | −1.23 / 1.23 / 95 / 40.0 / 0.4 / 3.4 / 0.95 |
| expert 600 | −1.39 / 1.39 / 97 / 40.0 / 7.6 / 25.2 / 0.97 | −1.40 / 1.40 / 97 / 40.0 / 7.2 / 25.2 / 0.97 | −1.29 / 1.29 / 97 / 40.0 / 8.2 / 24.0 / 0.97 | −1.22 / 1.22 / 97 / 40.0 / 8.4 / 24.4 / 0.97 | −1.28 / 1.28 / 97 / 40.0 / 4.2 / 24.2 / 0.97 |

- **e reduces the error for every profile** at every checkpoint from question 300 (|θ − logit k| 1.54 → 1.08, 1.29
  → 1.02, 1.51 → 1.26, 1.30 → 1.23 at 300), the right % stays at the target (beginner 86 → 83% at 300) and the true
  knowledge is the same or higher (beginner 0.57 → 0.66 at 300). The remaining under-estimation at 600 is mostly the
  ceiling `ELO.hi` (3) against learners at 0.9-0.97 (logit 2.2-3.5), and the Elo's lag.
- **d** is the closest at 600 for the learners but the noisiest (±0.3-0.7 over the seeds), and the hardest start for a
  beginner (77% right by question 100); on the real answers it is worse than a for the players under 0. **c** halves
  the drag and its effect. **b** does nothing.
- **+W** (simulated beside e): the expert's error 0.05-0.07 lower, the beginner 0.07-0.14 higher and 77% right by
  question 100; worse on the real answers: not adopted. **+L**: within the spread of e everywhere.
- Expert genera learned by question 600, 7.6 → 4.2 (±3.4 / ±1.6 over 5 seeds; 7.8 and 6.6 with +W and +L, which share
  e's rule; 6.8 → 8.4 on the base below): noise of the exam's last steps, not a trend.

**The rule shipped, on the base it ships on** (`main` after #408: one contrast queue, one opening rule with `OPEN.K` 8,
one difficulty target `aimOff(k)`, one draw weight; same measures and seeds; a: before, e: now):

| Profile, question | a (before) | **e (now)** |
| --- | --- | --- |
| beginner 100 | −0.73 / 1.54 / 86 / 15.6 / 0.0 / 0.0 / 0.25 | −0.44 / 1.04 / 79 / 19.2 / 0.0 / 0.0 / 0.29 |
| beginner 200 | −1.30 / 1.59 / 84 / 22.0 / 0.0 / 0.0 / 0.40 | −0.37 / 1.28 / 82 / 30.4 / 0.0 / 0.2 / 0.47 |
| beginner 300 | −1.40 / 1.80 / 87 / 28.6 / 0.0 / 0.2 / 0.53 | −0.45 / 1.21 / 83 / 39.6 / 0.0 / 0.4 / 0.64 |
| beginner 600 | −1.92 / 1.97 / 87 / 40.0 / 0.2 / 3.2 / 0.83 | −1.44 / 1.50 / 88 / 40.0 / 0.6 / 5.0 / 0.87 |
| lecture RA 100 | −0.79 / 1.28 / 82 / 22.2 / 0.0 / 0.0 / 0.48 | 0.01 / 0.81 / 79 / 33.4 / 0.0 / 0.0 / 0.53 |
| lecture RA 200 | −0.91 / 1.39 / 85 / 31.4 / 0.0 / 0.2 / 0.62 | −0.48 / 0.79 / 80 / 40.0 / 0.0 / 0.0 / 0.69 |
| lecture RA 300 | −1.04 / 1.46 / 89 / 36.8 / 0.0 / 0.4 / 0.72 | −0.79 / 0.93 / 87 / 40.0 / 0.0 / 0.0 / 0.77 |
| lecture RA 600 | −1.90 / 1.94 / 90 / 40.0 / 0.4 / 4.6 / 0.89 | −1.45 / 1.47 / 91 / 40.0 / 1.0 / 8.4 / 0.90 |
| strong RA 100 | −0.89 / 1.47 / 86 / 27.8 / 0.0 / 0.0 / 0.69 | −0.48 / 1.31 / 84 / 30.6 / 0.0 / 0.0 / 0.70 |
| strong RA 200 | −1.15 / 1.45 / 87 / 40.0 / 0.0 / 0.0 / 0.80 | −0.82 / 1.28 / 87 / 40.0 / 0.0 / 0.0 / 0.80 |
| strong RA 300 | −1.46 / 1.60 / 92 / 40.0 / 0.0 / 0.6 / 0.86 | −1.10 / 1.30 / 91 / 40.0 / 0.0 / 0.2 / 0.86 |
| strong RA 600 | −2.12 / 2.13 / 94 / 40.0 / 1.8 / 13.2 / 0.94 | −1.71 / 1.72 / 93 / 40.0 / 1.8 / 16.4 / 0.94 |
| expert 100 | −1.36 / 1.36 / 96 / 27.4 / 0.0 / 0.0 / 0.94 | −1.26 / 1.26 / 96 / 27.8 / 0.0 / 0.0 / 0.94 |
| expert 200 | −1.26 / 1.26 / 97 / 40.0 / 0.0 / 1.2 / 0.95 | −1.19 / 1.19 / 96 / 40.0 / 0.0 / 0.6 / 0.95 |
| expert 300 | −1.33 / 1.33 / 95 / 40.0 / 0.4 / 3.2 / 0.95 | −1.20 / 1.20 / 96 / 40.0 / 0.0 / 2.6 / 0.95 |
| expert 600 | −1.41 / 1.41 / 98 / 40.0 / 7.6 / 25.4 / 0.97 | −1.25 / 1.25 / 97 / 40.0 / 6.2 / 26.2 / 0.97 |

- The error of the ability falls for every profile at every checkpoint (at 300: 1.80 → 1.21, 1.46 → 0.93, 1.60 → 1.30,
  1.33 → 1.20); right % 79-97, true knowledge the same or higher (beginner 0.53 → 0.64 at 300), exams entered the same
  or more (strong RA 13.2 → 16.4, lecture RA 4.6 → 8.4 by 600).
- **A watched effect: genera open faster** for the learners: the beginner meets 19.2 genera by question 100 (15.6;
  seeds 12-22 → 17-24) and 30.4 by 200 (22.0), at 79-82% right (84-86%); the lecture RA 33.4 by question 100 (22.2)
  and all 40 by 200 (31.4), at 79-80% right (82-85%). Both learn more (true slate knowledge at 200: 0.40 → 0.47, 0.62 →
  0.69). The opening rule is unchanged (#408: a card with the chance 1 − shaky / `OPEN.K`): the old drag had pushed
  many genera under `OPEN.P` (shaky), which held the opening, and `OPEN.K` was calibrated on it. Before #408 (the
  share-of-the-draw opening), recalibrating `OPEN.K` was measured and not adopted: K 8 changed nothing for the
  beginner, K 6 brought it partway back and slowed the lecture RA under its old pace. The opening hold (`introHold`)
  still stops new cards while a player falls behind. To decide on the players' answers (ROADMAP).
- `tests/profiles.smoke.js` (one seeded run, the same on every run): its beginner meets 12 genera by question 100
  with and without the change; its limit stays 17. (Before #408 the same seed read 13 → 19.) Since the candidate
  refill of 2026-11-03 (f9aae3a: 616 photos the auto-sort added joined `data.json`, so every draw changed), that one
  seed read 19 with no change to the code, so the limit now applies to the mean of 8 seeds (the first one, then 7
  more on the beginner's first 100 questions): 8 seeds before #413 8-12 (mean 9.8), after it 12-16 (13.9), after the
  refill 12-19 (14.5). The single seed sat inside the spread of the seeds; the mean moves with the opening rule.

Not changed: the sheet (`Code.gs` `stats_`) and `core.js` `eloReplay` rate the photos and the player's global level,
never the genus wrongly given, so they need nothing and the app does not wait for a sheet version. Abilities already
saved keep the drag they took until their genus is answered again (a replay of the sheet's log would correct them:
ROADMAP).

### Global level and genus (2026-11-03)

Pierre: strong players must find the app challenging quickly (IMR staff will try it once), and beginners must not be
overwhelmed. After the fix above, the genus abilities of strong players still sat 0.3-0.6 below the static fit of
their answers, while their global level was about right: each genus learns only from its own answers, a few dozen at
most, through an Elo that lags. The global level pools every answer.

**The rule** (`model.js` `ability`, `levelMove`, `abilityStep`): the ability of a genus already answered is its own
estimate plus the global level's move since its own last step,

  θ_g = s.th + (L − s.lt) / (1 + answers_g / `ELO.n`),

`s.lt` the level when the genus was last stepped (saved and merged with `th`, `core.js` `mergeProgress`; dropped when
two accounts are merged, `mergeUsers`). The weight is the genus's own uncertainty, the share its own Elo step gives a
new answer: a genus with 3 answers takes 83% of the level's move, one with 15 half, one with 45 a quarter. At the
genus's next own step the move is taken in (`s.th`) and `s.lt` resets. The global level's step loses its `kmin` floor
(it pools every answer and now moves every genus, so it settles as answers build up, Pelánek's uncertainty function;
the volatility still lets it catch up). No new constant. This is the global + concept skill model of Pelánek et al.
(UMUAI 2017, §4: P = σ(θ_global + θ_concept − d), both updated on every answer), as a lazy update. A genus never
answered still starts from `playerStart`; progress saved before has no `s.lt`, so nothing moves until the genus's next
answer (no recalculation).

**What was tried** (real answers, `tools/abilityeval.js --model`, paired log-loss difference against `main` per answer,
± its standard error; simulation 5 seeds):

- Level + offset with every move in full (`H0`): −0.0096 ± 0.0034 overall with the level's steadier step, but worse
  below level 0 and after a false alarm; in the simulation a beginner over-rated at first (+0.46 at question 50).
- Weighed by the level's certainty (M / (M + `START.N`), 1 − K_L / kmax, squared...): the same picture, the band below
  0 still worse (0.473-0.488 against 0.470).
- Rises only (the level's falls not passed on): the best on the real answers (0.455; below 0, −0.015 ± 0.006), but
  biased upward, since a level that fluctuates has a positive average rise: a simulated beginner rated +0.49 / +0.70 /
  +0.20 above the truth at questions 50 / 100 / 300, a synthetic weak player +1.1 (`tests/ability.test.js`). It only
  looked good because real players are under-rated. Rejected.
- Shrinking each genus toward its level-based start, (m θ + N0 start) / (m + N0): 0.464, below 0 worse (0.484-0.490).
- Why the band below 0 resists: there the level itself is wrong (players at 83% right with a level under 0, after
  early misses, the `kmin` floor and the volatility); as a predictor the level beats the genus abilities in most groups
  but loses badly there (0.511 against 0.470). A steadier level (no floor) closes most of the gap; without the
  volatility as well changed nothing more, so only the floor goes. Without the floor the level's steps fall under
  0.005 after a few hundred answers, so it is kept to 4 decimals (a genus to 2): rounded to 2, 1000 right answers left
  it where it was (Codex review #415; `tests/ability.test.js`).

**On the real answers** (1,183 answers, 9 players with 20 or more; mean predicted / right, log-loss; groups by one
reference level, `main`'s rule, the same answers in each group for both: `tools/abilityeval.js` `refStep`, Codex review
#415):

| Group (answers) | `main` | global level + genus | paired difference ± se |
| --- | --- | --- | --- |
| all (1183) | 0.79 / 0.83, 0.465 | 0.80 / 0.83, 0.457 | −0.0085 ± 0.0032 |
| 2 choices (727) | 0.80 / 0.87, 0.412 | 0.80 / 0.87, 0.410 | −0.0014 ± 0.0033 |
| 4 choices (451) | 0.77 / 0.78, 0.551 | 0.79 / 0.78, 0.531 | −0.0197 ± 0.0063 |
| Duel tab (86) | 0.85 / 0.93, 0.298 | 0.86 / 0.93, 0.286 | −0.0122 ± 0.0075 |
| level < 0 (203) | 0.74 / 0.83, 0.470 | 0.74 / 0.83, 0.476 | +0.0063 ± 0.0087 |
| level 0-0.75 (363) | 0.77 / 0.80, 0.524 | 0.77 / 0.80, 0.529 | +0.0050 ± 0.0063 |
| level ≥ 0.75 (617) | 0.81 / 0.86, 0.429 | 0.83 / 0.86, 0.408 | −0.0214 ± 0.0038 |
| after a false alarm (141) | 0.81 / 0.81, 0.466 | 0.81 / 0.81, 0.483 | +0.0168 ± 0.0084 |

- Better overall (2.7 standard errors) and clearly for the strong players' answers (level ≥ 0.75) and the 4-choice
  questions; every player's own log-loss is the same or better. The strong RA's genera 0.59 → 0.62 on average (fit
  0.73), the other strong players 0.82 → 1.21 and 0.81 → 1.37 (fits 1.29 and 1.91).
- Below level 0 and between 0 and 0.75: within the noise (+0.006 ± 0.009, +0.005 ± 0.006). After a false alarm,
  slightly worse (+0.017 ± 0.008): the level's fall after a miss now reaches the genus wrongly given too, a little, as
  it reaches every genus.

**Simulated** (`tools/learnsim.js`, 5 seeds × 600 questions, `main` after #413; cells: θ − logit(true know) / |θ −
logit k| / right % / genera met / learned / entered the exam / true knowledge; "rises only" for the record):

| Profile, question | `main` | **global level + genus** | rises only (rejected) |
| --- | --- | --- | --- |
| beginner 50 | 0.04 / 1.00 / 72 / 15.6 / 0.0 / 0.0 / 0.19 | 0.05 / 0.89 / 70 / 14.6 / 0.0 / 0.0 / 0.18 | 0.49 / 0.81 / 71 / 16.0 / 0.0 / 0.0 / 0.19 |
| beginner 100 | −0.44 / 1.04 / 79 / 19.2 / 0.0 / 0.0 / 0.29 | 0.13 / 0.87 / 80 / 22.4 / 0.0 / 0.0 / 0.30 | 0.70 / 0.98 / 76 / 27.0 / 0.0 / 0.0 / 0.33 |
| beginner 300 | −0.45 / 1.21 / 83 / 39.6 / 0.0 / 0.4 / 0.64 | −0.37 / 0.84 / 83 / 40.0 / 0.0 / 0.2 / 0.68 | 0.20 / 0.71 / 79 / 40.0 / 0.0 / 0.2 / 0.70 |
| beginner 600 | −1.44 / 1.50 / 88 / 40.0 / 0.6 / 5.0 / 0.87 | −1.06 / 1.12 / 88 / 40.0 / 0.2 / 3.8 / 0.88 | 0.09 / 0.62 / 87 / 40.0 / 0.2 / 3.8 / 0.88 |
| lecture RA 50 | 0.05 / 0.73 / 81 / 18.8 / 0.0 / 0.0 / 0.42 | 0.23 / 0.83 / 80 / 17.8 / 0.0 / 0.0 / 0.41 | 0.41 / 0.74 / 77 / 19.0 / 0.0 / 0.0 / 0.42 |
| lecture RA 100 | 0.01 / 0.81 / 79 / 33.4 / 0.0 / 0.0 / 0.53 | 0.07 / 0.86 / 79 / 30.8 / 0.0 / 0.0 / 0.51 | 0.24 / 0.76 / 77 / 31.8 / 0.0 / 0.0 / 0.53 |
| lecture RA 300 | −0.79 / 0.93 / 87 / 40.0 / 0.0 / 0.0 / 0.77 | −0.55 / 0.80 / 84 / 40.0 / 0.0 / 1.0 / 0.77 | 0.29 / 0.67 / 84 / 40.0 / 0.0 / 0.0 / 0.78 |
| lecture RA 600 | −1.45 / 1.47 / 91 / 40.0 / 1.0 / 8.4 / 0.90 | −1.27 / 1.29 / 89 / 40.0 / 1.0 / 8.2 / 0.91 | −0.15 / 0.58 / 90 / 40.0 / 0.2 / 9.2 / 0.91 |
| strong RA 50 | −0.59 / 1.37 / 89 / 17.4 / 0.0 / 0.0 / 0.63 | −0.41 / 1.22 / 85 / 19.0 / 0.0 / 0.0 / 0.64 | −0.18 / 1.13 / 86 / 18.6 / 0.0 / 0.0 / 0.63 |
| strong RA 100 | −0.48 / 1.31 / 84 / 30.6 / 0.0 / 0.0 / 0.70 | −0.46 / 1.15 / 86 / 32.6 / 0.0 / 0.0 / 0.71 | 0.04 / 1.04 / 86 / 32.0 / 0.0 / 0.0 / 0.71 |
| strong RA 300 | −1.10 / 1.30 / 91 / 40.0 / 0.0 / 0.2 / 0.86 | −0.92 / 1.14 / 88 / 40.0 / 0.0 / 1.2 / 0.86 | 0.11 / 0.64 / 90 / 40.0 / 0.0 / 0.6 / 0.86 |
| strong RA 600 | −1.71 / 1.72 / 93 / 40.0 / 1.8 / 16.4 / 0.94 | −1.43 / 1.47 / 94 / 40.0 / 2.4 / 14.4 / 0.94 | −0.56 / 0.82 / 92 / 40.0 / 2.4 / 15.0 / 0.94 |
| expert 50 | −1.47 / 1.47 / 98 / 14.6 / 0.0 / 0.0 / 0.94 | −0.96 / 0.96 / 98 / 15.2 / 0.0 / 0.0 / 0.94 | −0.89 / 0.89 / 98 / 15.0 / 0.0 / 0.0 / 0.94 |
| expert 100 | −1.26 / 1.26 / 96 / 27.8 / 0.0 / 0.0 / 0.94 | −0.94 / 0.94 / 96 / 27.6 / 0.0 / 0.2 / 0.94 | −0.87 / 0.87 / 95 / 27.8 / 0.0 / 0.4 / 0.94 |
| expert 300 | −1.20 / 1.20 / 96 / 40.0 / 0.0 / 2.6 / 0.95 | −1.08 / 1.08 / 97 / 40.0 / 0.4 / 4.0 / 0.95 | −0.72 / 0.72 / 97 / 40.0 / 0.6 / 3.0 / 0.95 |
| expert 600 | −1.25 / 1.25 / 97 / 40.0 / 6.2 / 26.2 / 0.97 | −1.25 / 1.25 / 97 / 40.0 / 8.6 / 24.6 / 0.97 | −0.72 / 0.72 / 98 / 40.0 / 7.6 / 27.0 / 0.97 |

- **Strong players recognised sooner**: the expert's error 1.47 → 0.96 at question 50 and 1.26 → 0.94 at 100; the
  strong RA 1.37 → 1.22, 1.31 → 1.15, 1.30 → 1.14, 1.72 → 1.47; the lecture RA 0.93 → 0.80 at 300.
- **The beginner is not over-rated**: θ − logit(know) +0.05 / +0.13 / −0.37 at questions 50 / 100 / 300 (`main` +0.04 /
  −0.44 / −0.45), |θ − logit k| lower at every checkpoint.
- **No path breaks**: right % within 3 points of `main` everywhere (beginner 70 / 80 / 83 / 88, `main` 72 / 79 / 83 /
  88; the expert's 96-98% and the first 50 questions' low 70s are `main`'s too); the beginner opens a little faster
  (22.4 genera by question 100 against 19.2, at 80% right), the lecture RA a little slower (30.8 against 33.4);
  exams within the spread (strong RA entered 14.4 ± 3.4 against 16.4 ± 2.3, expert learned 8.6 against 6.2). The
  remaining under-estimation at 600 is mostly the ceiling `ELO.hi` (3) against learners at 0.9-0.97.
- `tests/profiles.smoke.js`: its seed's beginner met 18 genera by question 100 (12) with this alone; with the target by
  level ("Beginners and experts", below) 13, the limit stays 17.
- Its opening pace for a beginner (22.4 genera by question 100) was too fast for Pierre: "Beginners and experts",
  below.

**The sheet and the admin**: `Code.gs` `stats_` and `core.js` `eloReplay` rate the photos and each player's own level
from the answer log, never from the app's genus abilities, so they do not change and the app waits for no sheet
version (AGENTS.md 7a). The Answers log's ability column is the ability the app used (with the level's move), so the
logged expectation and the sheet's opening hold stay consistent. The admin's per-genus abilities (`readStats`, from
the saved `th`) show each genus's own estimate without the level's move since its last answer: a little behind for a
player whose level is still rising (ROADMAP). `replayProgress` (PR #399, not merged) replays progress, not the Elo; if
it comes to replay the abilities, it must replay `s.lt` the same way.

### Beginners and experts (2026-11-03)

Pierre, on "Global level and genus": the gains for strong players and experts are what he wants, but 22 genera met by
question 100 is too many for a beginner, and many beginners are arriving now; with a success target that follows the
level, a beginner would be aimed at about 85% right, not 80%. Both must be calibrated, with the parameters that can
treat a beginner and an expert differently.

**The rule** (`model.js` `aimP`, `aimOff`, `pgMissW`, `shaky`):

- **The success aimed for follows the global level** (`PICKD.AIM`, points [level, success]): 85% up to a level of 0.5,
  75% from 1.5, a straight line between, flat outside, no cliff. In the simulation the levels reached are: a beginner
  −0.05 to 0.6 over its first 300 questions, a lecture-level RA 0.4-0.7, a strong RA 1.0-1.5, an expert 2.5-2.8; so a
  beginner and a lecture-level RA are aimed at about 85%, a strong RA at 75-80%, an expert at 75%. Papoušek, Stanislav
  & Pelánek (2016, the geography system, target error rates 5-50%): easy questions keep more learners at first, harder
  ones bring more of them back and teach more; "start with easy questions to hook learners up and then switch to more
  difficult questions". The photo's aim (`aimOff`), the miss weight (`pgMissW`: a miss weighs the chance the player had
  over the chance the game aimed for) and the comeback's rust (`rustOf`) follow it; `PICKD.P` (0.8, the middle) stays
  the reference.
- **A genus is shaky against the same target**: OPEN.P + (aimed − `PICKD.P`), so 0.65 for a beginner, 0.55 for a strong
  player. A beginner opens a new genus only once the genera met are a little more solid; nobody else is held back.
- No other constant. The global level's move on the genera ("Global level and genus") is unchanged.

**What was tried** (`tools/learnsim.js`, 5 seeds, the four profiles, 300 questions; T: the target from the level, 85% at
0 to 75% at 1.5; T2: 85% up to 0.5, 75% from 1.5 (the rule); O: the shaky bar moved with the target; K: the opening's
capacity `OPEN.K` × (1 − aimed) / (1 − `PICKD.P`); S: the level's move on the genera only while the level is above 0):

| Variant | beginner met q100 / q200 | beginner right % q50 / q100 / q200 / q300 | beginner θ − logit k q100 | strong RA \|θ − logit k\| q100 / q300 | expert q50 / q100 |
| --- | --- | --- | --- | --- | --- |
| `main` | 19.2 / 30.4 | 72 / 79 / 82 / 83 | −0.44 | 1.31 / 1.30 | 1.47 / 1.26 |
| level + genus alone (before) | 24.6 / 35.6 | 72 / 78 / 77 / 86 | +0.15 | 1.17 / 1.04 | 0.96 / 0.91 |
| T2 | 26.4 / 37.6 | 70 / 79 / 79 / 83 | +0.30 | 1.18 / 1.05 | 0.90 / 0.93 |
| T + O | 19.8 / 33.8 | 69 / 81 / 79 / 82 | −0.16 | 1.15 / 1.10 | 0.96 / 1.00 |
| T + O + K | 20.0 / 31.8 | 72 / 77 / 81 / 80 | −0.28 | 1.28 / 1.14 | 0.96 / 1.00 |
| T2 + O + K | 20.2 / 31.0 | 73 / 80 / 81 / 80 | −0.00 | 1.25 / 1.11 | 0.89 / 0.92 |
| T + O + S | 17.8 / 37.2 | 72 / 81 / 80 / 80 | −0.31 | 1.29 / 1.11 | 0.97 / 1.00 |
| **T2 + O (now)** | **20.2 / 28.0** | 73 / 78 / 80 / 83 | −0.11 | 1.20 / 1.10 | 0.89 / 0.92 |
| T2 + O + S | 19.4 / 30.8 | 75 / 80 / 80 / 82 | −0.09 | 1.22 / 1.17 | 0.88 / 0.93 |

- **The target alone does not slow a beginner** (T2: 26.4 genera by question 100): easier photos raise the abilities,
  fewer genera look shaky, more open, and the brand-new genera's near-guesses pull the right % down. The opening is
  what sets a beginner's pace and success; the shaky bar moved with the target (O) brings it back.
- **K** (the opening's capacity) adds little to O; **S** (no move below level 0) is better on the real answers (log-loss
  −0.0099 ± 0.0030 against `main`, below level 0 +0.004 ± 0.007) but has a step at level 0 (a genus stepped while the
  level was below 0 takes its whole move at once when the level crosses 0) and keeps less of the strong RA's gain.
- **T2 rather than T**: T lowers the target from level 0, where beginners and lecture-level RAs sit, so they get 80%
  and open faster (33.8 by question 200); T2 holds 85% for them.

**The rule shipped** (5 seeds × 600 questions; cells: θ − logit k / |θ − logit k| / right % / genera met / learned /
entered the exam / true knowledge):

| Profile, question | `main` | level + genus alone | **level + genus, target by level (now)** |
| --- | --- | --- | --- |
| beginner 50 | 0.04 / 1.00 / 72 / 15.6 / 0.0 / 0.0 / 0.19 | 0.05 / 0.89 / 70 / 14.6 / 0.0 / 0.0 / 0.18 | 0.30 / 1.00 / 73 / 14.0 / 0.0 / 0.0 / 0.18 |
| beginner 100 | −0.44 / 1.04 / 79 / 19.2 / 0.0 / 0.0 / 0.29 | 0.13 / 0.87 / 80 / 22.4 / 0.0 / 0.0 / 0.30 | −0.11 / 0.88 / 78 / 20.2 / 0.0 / 0.0 / 0.29 |
| beginner 200 | −0.37 / 1.28 / 82 / 30.4 / 0.0 / 0.2 / 0.47 | −0.07 / 0.91 / 79 / 37.0 / 0.0 / 0.2 / 0.53 | −0.43 / 0.98 / 80 / 28.0 / 0.0 / 0.2 / 0.47 |
| beginner 300 | −0.45 / 1.21 / 83 / 39.6 / 0.0 / 0.4 / 0.64 | −0.37 / 0.84 / 83 / 40.0 / 0.0 / 0.2 / 0.68 | −0.44 / 1.02 / 83 / 37.2 / 0.0 / 0.4 / 0.63 |
| beginner 600 | −1.44 / 1.50 / 88 / 40.0 / 0.6 / 5.0 / 0.87 | −1.06 / 1.12 / 88 / 40.0 / 0.2 / 3.8 / 0.88 | −1.22 / 1.27 / 87 / 40.0 / 0.2 / 6.0 / 0.87 |
| lecture RA 50 | 0.05 / 0.73 / 81 / 18.8 / 0.0 / 0.0 / 0.42 | 0.23 / 0.83 / 80 / 17.8 / 0.0 / 0.0 / 0.41 | 0.07 / 0.77 / 78 / 17.6 / 0.0 / 0.0 / 0.41 |
| lecture RA 100 | 0.01 / 0.81 / 79 / 33.4 / 0.0 / 0.0 / 0.53 | 0.07 / 0.86 / 79 / 30.8 / 0.0 / 0.0 / 0.51 | −0.07 / 0.73 / 82 / 26.4 / 0.0 / 0.0 / 0.50 |
| lecture RA 200 | −0.48 / 0.79 / 80 / 40.0 / 0.0 / 0.0 / 0.69 | −0.28 / 0.76 / 82 / 39.2 / 0.0 / 0.4 / 0.67 | −0.48 / 0.84 / 79 / 39.2 / 0.0 / 0.0 / 0.67 |
| lecture RA 300 | −0.79 / 0.93 / 87 / 40.0 / 0.0 / 0.0 / 0.77 | −0.55 / 0.80 / 84 / 40.0 / 0.0 / 1.0 / 0.77 | −0.50 / 0.78 / 87 / 40.0 / 0.0 / 0.4 / 0.76 |
| lecture RA 600 | −1.45 / 1.47 / 91 / 40.0 / 1.0 / 8.4 / 0.90 | −1.27 / 1.29 / 89 / 40.0 / 1.0 / 8.2 / 0.91 | −1.20 / 1.23 / 88 / 40.0 / 0.8 / 7.6 / 0.91 |
| strong RA 50 | −0.59 / 1.37 / 89 / 17.4 / 0.0 / 0.0 / 0.63 | −0.41 / 1.22 / 85 / 19.0 / 0.0 / 0.0 / 0.64 | −0.33 / 1.22 / 85 / 17.2 / 0.0 / 0.0 / 0.63 |
| strong RA 100 | −0.48 / 1.31 / 84 / 30.6 / 0.0 / 0.0 / 0.70 | −0.46 / 1.15 / 86 / 32.6 / 0.0 / 0.0 / 0.71 | −0.55 / 1.20 / 83 / 29.0 / 0.0 / 0.0 / 0.70 |
| strong RA 200 | −0.82 / 1.28 / 87 / 40.0 / 0.0 / 0.0 / 0.80 | −0.71 / 1.11 / 86 / 40.0 / 0.0 / 0.2 / 0.81 | −0.73 / 1.13 / 86 / 40.0 / 0.0 / 0.2 / 0.80 |
| strong RA 300 | −1.10 / 1.30 / 91 / 40.0 / 0.0 / 0.2 / 0.86 | −0.92 / 1.14 / 88 / 40.0 / 0.0 / 1.2 / 0.86 | −0.88 / 1.10 / 89 / 40.0 / 0.0 / 0.4 / 0.86 |
| strong RA 600 | −1.71 / 1.72 / 93 / 40.0 / 1.8 / 16.4 / 0.94 | −1.43 / 1.47 / 94 / 40.0 / 2.4 / 14.4 / 0.94 | −1.39 / 1.43 / 93 / 40.0 / 2.2 / 14.8 / 0.95 |
| expert 50 | −1.47 / 1.47 / 98 / 14.6 / 0.0 / 0.0 / 0.94 | −0.96 / 0.96 / 98 / 15.2 / 0.0 / 0.0 / 0.94 | −0.89 / 0.89 / 98 / 14.4 / 0.0 / 0.0 / 0.94 |
| expert 100 | −1.26 / 1.26 / 96 / 27.8 / 0.0 / 0.0 / 0.94 | −0.94 / 0.94 / 96 / 27.6 / 0.0 / 0.2 / 0.94 | −0.92 / 0.92 / 96 / 26.6 / 0.0 / 0.2 / 0.94 |
| expert 200 | −1.19 / 1.19 / 96 / 40.0 / 0.0 / 0.6 / 0.95 | −1.02 / 1.02 / 96 / 40.0 / 0.0 / 1.4 / 0.95 | −1.02 / 1.02 / 96 / 40.0 / 0.2 / 1.2 / 0.95 |
| expert 300 | −1.20 / 1.20 / 96 / 40.0 / 0.0 / 2.6 / 0.95 | −1.08 / 1.08 / 97 / 40.0 / 0.4 / 4.0 / 0.95 | −1.10 / 1.10 / 96 / 40.0 / 0.2 / 4.0 / 0.95 |
| expert 600 | −1.25 / 1.25 / 97 / 40.0 / 6.2 / 26.2 / 0.97 | −1.25 / 1.25 / 97 / 40.0 / 8.6 / 24.6 / 0.97 | −1.30 / 1.30 / 97 / 40.0 / 6.2 / 24.4 / 0.97 |

- **The beginner back to `main`'s pace or slower**: 14.0 / 20.2 / 28.0 / 37.2 genera met by questions 50 / 100 / 200 /
  300 (`main` 15.6 / 19.2 / 30.4 / 39.6), not over-rated (θ − logit k −0.11 / −0.43 / −0.44 at 100 / 200 / 300; +0.30
  ± 0.47 at 50, `main` +0.04), right 73 / 78 / 80 / 83 / 87% (`main` 72 / 79 / 82 / 83 / 88). The 83-86% Pierre asked
  for over questions 50-300 is reached from 300 only, in every variant and in `main`: in its first 100 questions this
  simulated beginner (2% at the start) answers genera it has just met mostly by guessing, at the easiest photos already;
  only a slower opening raises it, and the opening is already at `main`'s pace or slower.
- **The lecture-level RA opens more slowly** (26.4 genera by question 100 against 33.4; all 40 by 200 in both), at 82%
  right (79%).
- **The strong players' gains are kept**: the strong RA's error 1.22 / 1.20 / 1.13 / 1.10 / 1.43 at 50-600 (`main`
  1.37 / 1.31 / 1.28 / 1.30 / 1.72), the expert's 0.89 / 0.92 at 50 / 100 (`main` 1.47 / 1.26; equal from 300, the
  ceiling `ELO.hi`).
- **No path breaks**: exams within the spread (strong RA entered 14.8 ± 1.5 against 16.4 ± 2.3, beginner 6.0 against
  5.0), true knowledge the same.
- **On the real answers**: nothing changes (the target and the shaky bar choose questions, they do not change the Elo's
  prediction): log-loss 0.457 against `main`'s 0.465, below level 0 +0.006 ± 0.009 (within the noise), as in "Global
  level and genus". The real answers cannot judge a different draw (AGENTS.md 14g); they were played under `main`'s.
- `tests/profiles.smoke.js`: its beginner meets 13 genera by question 100 (`main` 12), the limit back to 17.

### What a question shows

- **Photos**: drawn around ability − `aimOff(k)`, so that the question is right with the chance `PICKD.P` = 0.8 in its
  format (one difficulty controller, below; until 2026-11-03 ability − `TARGET_OFF` 1.0 for every format).
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
- **Calibration questions only on a genus the player holds** (met, not shaky): a single, perhaps unusual, photo does
  not help on a genus still being learned (and a simulated beginner opened genera faster than intended with them).
- **A new photo's set is only a guess** (`CAL.U` = 1): the targeting's width grows to √(0.7² + U / (1 + answers / 2))
  for a photo with few answers, so a photo placed in Medium or Hard by hand is not kept away from a player whose target
  is lower; it narrows back to 0.7 as answers come.
- **Every kept photo is in the games** (`applySlots`, 2026-11-02): Medium and Hard were capped at 4 per genus and view,
  other observers' photos only filling a short set, so the candidates Pierre validates would have stayed out.
- All together, simulated as above: photos with an answer 449-461 → 509-519, with 3 or more 214-221 → 239-255,
  right rates unchanged.
- **Look-alike traps** among the wrong choices: from ability (`FORMAT`: one per 0.18 above 0, up to 3), chosen among the
  pairs most confused: pooled over every player and declared look-alikes (IMR lecture, Coral Finder) as a prior
  (`CONF`), then the player's own record on the pair (personal path).
- **Experts keep hard choices** (2026-11-02): when the player's own record clears every pair (an expert confuses
  nothing), the traps the level asks for come from the pairs other players confuse most, then the declared look-alikes,
  instead of easy genera. Simulated before this: an expert's traps fell from 1.8 to 0.1 a question.
- **Easy wrong choices come first from genera the player has met** (2026-11-02): a beginner is not asked to choose
  between names never seen.

### One difficulty controller (2026-11-03)

Since "Beginners and experts" (above, the same day) the success aimed for is not one 80% but follows the global level
(`aimP`, `PICKD.AIM`: 85% up to 0.5, 75% from 1.5); the controller below is unchanged otherwise.

The independent review's item 4: difficulty was set by three ramps on the genus ability (the photo aimed
`TARGET_OFF` = 1.0 below it, single views from `singleP` = (ability − 0.5) / 1.5 up to 0.85, traps from `TRAP` {start
0, step 0.18}), none tied to the 80% target once the choices changed the guess rate (the plausible choices `k` of
`plausibleK` already changed it for the Elo and the progress, not for the photo). Typed questions (2026-11-03) added a
fourth format with no guess at all. Now one controller (`model.js` `PICKD.P`, `aimOff`, `FORMAT`, `formatAt`), after
Papoušek, Pelánek & Stanislav (2014), who choose the format so the predicted success hits one target:

- **The format** of a question comes from the genus ability on one schedule, `FORMAT` = [ability, traps, single-view
  share] points [0, 0, 0] → [0.54, 3, 0] → [1.8, 3, 0.85], straight lines between: the traps first (Pierre, rule 14c:
  one after the first right answer, all three after about 5), then single views (rule 14). The same numbers as the two
  ramps (single views now start at 0.54 instead of 0.5, a hair steeper); `TRAP.start` (a zero offset) went. Typed
  questions are the third lever, with their own share (`typedP`, being made dynamic on another branch: it plugs in
  unchanged, its guess rate reaching the photo through `k`).
- **The photo** then makes up the rest: aimed `aimOff(k)` = logit((P − 1/k) / (1 − 1/k)) below the ability (and
  `PICKD.SINGLE` lower for one view alone), so that the question, in its format, is right with the chance P = 0.8:
  1.01 for 4 plausible choices (1.0 before), 0.81 for 3, 0.41 for 2 (easy choices, an Again, a duel), 1.39 for a typed
  answer. Before, the same photo aim gave about 87% expected success with 2 plausible choices and 73% typed.
- What read `TARGET_OFF` reads the target: a miss weighs the chance the player had over P (`pgMissW`; for 4 choices
  0.798 → 0.8, for 2 choices 0.866 → 0.8, typed 0.731 → 0.8), the comeback's rust and My progress's photo band use
  `aimOff(4)`.
- 6 numbers (`TARGET_OFF`, `TRAP` start and step, `singleP`'s 0.5, 1.5 and 0.85) → `P` and the schedule's 3 points
  (0.54, 1.8, 0.85; the 0s and the 3 traps are anchors): about the same count, but one target instead of three
  independent ramps, and the format's guess rate in the photo's aim. `plausibleK` stays: it measures the guess rate the
  aim needs.

Simulated (`tools/learnsim.js`, 5 seeds × 600 questions, after items 7 and 6, same seeds), before → after:

| Profile | right % 100 / 300 / 600 | true knowledge 300 / 600 | \|θ − logit k\| 600 | entered the exam by 600 | true ref. success at entry | learned 600 |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | 83 / 87 / 88 → 83 / 87 / 87 | 0.53 → 0.54; 0.84 → 0.85 | 2.07 → 1.94 | 2.0 → 2.2 | 0.86 → 0.87 | 0.4 → 0.6 |
| lecture RA | 85 / 86 / 91 → 87 / 86 / 90 | 0.74 → 0.73; 0.90 → 0.90 | 1.88 → 1.99 | 3.0 → 1.2 (±1.0) | 0.84 → 0.91 | 0.4 → 0 |
| strong RA | 84 / 89 / 94 → 85 / 89 / 95 | 0.85 → 0.86; 0.94 → 0.94 | 2.18 → 2.09 | 8.0 → 10.6 (±1.2) | 0.93 → 0.91 | 0.4 → 0.4 |
| expert | 94 / 95 / 97 → 97 / 97 / 97 | 0.95; 0.97 | 1.43 → 1.42 | 25.2 → 26.0 | 0.92 → 0.92 | 6.8 → 5.8 (±1.5) |

Outcomes within the spread: the learning, the Elo error and the exam's quality do not move beyond a standard error or
two (the lecture RA's and the strong RA's exam entries move in opposite directions). The right % does not come closer
to 80%, against the review's hope: on this learner the gap comes from the Elo's under-estimate of every profile (1.4 to
2.2 logits, "Learning-outcome simulation"), which no aim can correct; with real players the format's guess rate now
leaves the target where it is. The profiles test: an expert's traps at question 300 2.32 → 2.28 a question (CI seed).

**Real answers** (`node tools/realcheck.js answers.json`, the sheet's Answers tab read 2026-11-03: 1,270 answers of 10 players, 1,190 with the app's expectation logged; aggregates only): the expectation's formula is unchanged (only which photo is aimed at changes), so its log-loss is the same
(0.480 overall). What the real answers say about the aim, at the same expectation (the app expected 75-85%): 4 choices
right 77% (n 231), 2 choices 85% (n 288), duels 93% (n 40). Before, the format moved the target: the 2-choice
questions were expected about 87% on a photo aimed 1.0 below the ability; now they are aimed at 80%. On these answers a
2-choice question was right 83-84% whether the app expected 75-85% or 82-92%, so the harder aim should not lower the
real success much; the 4-choice questions, the bulk of the exam and of strong players' questions, are calibrated
(expected 76%, right 77%, n 496). Typed: 5 answers, too few.

### Logged for the admin's player journey (2026-11-02)

A mastery exam question is logged with mode `quiz|x` (exams have every trap, so never `|kN`; the sheet's guess rate and
mode split read it as `quiz`), and a passed exam keeps its time (`s.mx` = time, was 1; still truthy everywhere). A
custom-quiz answer (2026-11-03, below) is logged `quiz|s…`, the journey's "Custom quiz" row and Activity's "custom".

### "Again: A or B?" rated as 2 choices (2026-11-02)

Since 2026-11-01 (#251) a mix-up in the photo quiz comes back once as a 2-choice duel of the two genera, one question
later. It was logged plain `quiz`, so the sheet rated it with a 1 in 4 guess instead of 1 in 2 (a right answer looked
more convincing than it is): 59 of the first 552 answers, 11%. The app now logs it `quiz|k2`, and the sheet (v20) and
the admin (`core.js`) read the number of choices from the Choices column when the mode does not give it, which corrects
the answers already logged.

### Look-alike duels slipped into the photo quiz (2026-11-02)

(Their spacing rules became one contrast queue on 2026-11-03: "One contrast queue", below.)

The Duel tab had 13 answers in all (2 players); "Again: A or B?" only follows a mix-up. Pierre (1 in 10): from the 20th
answer on, about 1 photo-quiz question in 10 (`AUTO_DUEL.P` 0.1, `quiz.js`) is a duel on a look-alike pair, picked as the
Duel tab picks (`duelPick`: the player's own mix-ups first, then pairs players confuse, then the IMR / Coral Finder
look-alikes), both genera met and ready, never the same pair within 20 answers (`SAME`), at least 5 questions after the
last one (`GAP`) and 2 after an "Again" (`AGAIN`), never while an "Again" is due, and a mix-up in one of them brings no
"Again" (its pair comes back through the duel choice, mix-ups first; Codex review #352), and never on a question where the
path opens a genus (a card): opening comes first (Pierre, 2026-11-02; with the old order, a duel drawn at the wrong
time delayed a genus, and a weak RA met about 3 genera fewer by question 300). Prompt "Look-alikes: A or B?"; logged `quiz|d|k2` (rated 1 in 2, counted
apart in the player journey; a win counts for the Look-alike slayer achievement, as in the Duel tab). Simulated over 4 seeds, it does not slow the opening of genera (an expert met 27 genera
after 100 questions with duels, 26 without, seed 3333); the profiles test now checks an expert's traps at 300
questions (one or more a question) and more than a beginner's at 100, the mean of the two sitting at the threshold.

### Custom quiz: the photo quiz on the genera the player picks (2026-11-03)

Pierre: a game mode next to the quiz where the player selects the genera to work on, and the quiz is exactly the photo
quiz, all its formats included, limited to them. Code: `model.js` `CUSTOM`, `customOf`, `customDraw`, `customChoices`;
`quiz.js` `quizCustom`, `viewCustom`, `planPhoto(cur)`; tests `tests/custom.test.js`, `tests/pages.smoke.js`.

- **What changes** is only the genus asked and the wrong choices. Photos (level, calibration, memory, one colony),
  typed questions, "Again: A or B?" after a mix-up, the duels slipped in (`duelPick` among the selection), the comeback
  and every scoring rule are the photo quiz's. At least `CUSTOM.MIN` = 2 genera.
- **No mastery exam in the custom quiz** (Codex review #411, rule 14e; Pierre's decision, 2026-11-03: exams happen
  only in the normal quiz): an exam question has every look-alike trap, and the custom quiz's choices come from the
  selection, which may hold none of the genus's look-alikes, so a Learned earned there would not prove what the exam
  proves. So the custom quiz never asks an exam question (`planPhoto`: no `examSet` with a selection) and never credits
  the exam or `s.mx` from its answers (`answer`: `exq` is never true there). Its answers still move the progress bar,
  up to the exam's entry (95%); the exam then comes in the Quiz (the tab named "Photo → genus" until 2026-11-03). A genus ready for its exam is still drawn in the
  custom quiz, as a normal question, and a miss there still restarts an exam begun (any miss on the genus does, rule
  14e). The help says so (the selection screen and the quiz's ?). `tests/draw.smoke.js` plays a custom session on
  genera one exam question from Learned, all right: no exam question, no `s.mx`.
- **Scored with the choices really shown** (Codex review #411): the photo quiz counts every choice from 2 traps on,
  because it shows the traps its level asks for; a selection may not hold them (4 unrelated genera picked for a strong
  player), so in the custom quiz the look-alikes among the choices decide: fewer than 2 there, and the guess rate is
  1 / `plausibleK` (the target and the choices it could be taken for: look-alikes, confused or sharing a growth form),
  as for a beginner's easy choices. Measured on the real draw (`tests/draw.smoke.js`): *Acropora*, *Astreopora*,
  *Fungia*, *Alveopora* picked by a strong player were scored as 4-choice questions; `plausibleK` gives 2.
- **The genus asked** (`customDraw`): any genus of the selection, weighed by the photo quiz's `weight()` (`drawW`: what
  the model does not yet know the player holds; the last 4 held back). **No opening path**: no first cards,
  no opening chance (`openChance`, `openPick`), no opening hold, no visit floor, no ★ wait (rules for the order the game opens genera in, while the
  player chose these). A genus not met yet is asked at once, with its first-meeting card shown over that question (kind
  `c`, ready at once, the card's photo not reused: as the Duel tab does for a genus named on its buttons); the card is
  shown once, and the genus then counts as met in the photo quiz too. The offers about which genera are in play (open
  all, back to one at a time, bonus genera) are not made in the custom quiz.
- **The wrong choices** (`customChoices`): `distractors()` run on the selection, so its rules work inside it: traps by
  level among the pairs most confused, else easy genera of other growth forms, genera met first. A selection of
  look-alikes therefore drills itself (with nothing easier picked, its own look-alikes are the choices even at 0 traps,
  and `plausibleK` counts them: a right answer proves more). Only a selection of fewer than 4 genera is topped up from
  the other genera in play (the slate, and the bonus genera when on), by the same rules, asking for the traps the
  selection could not give (`traps` − the selection's own confusable choices). An "Again" after a mix-up with a genus
  outside the selection (a top-up choice, or a typed answer) asks the selected genus of the pair.
- **What counts**: every answer is a photo-quiz answer: progress, ability, the global level, photo ratings and
  confusions in the sheet, the opening hold (each answer with the expectation it had; a selection the player finds hard
  holds new cards in the photo quiz, as any run of misses would), achievements. Logged with the mode `quiz|s` before
  any other tag (`quiz|s|d|k2`, `quiz|s|k3`, `quiz|s|t`): the sheet's `guess_` reads `|kN`
  at the end and `|t` anywhere, and its mode split keeps `quiz`, so the deployed script (v27) stores and rates it as any
  photo-quiz answer, no new version needed (AGENTS.md 7a; `tests/custom.test.js` compares the two modes).
- **Comeback**: during a comeback the custom quiz asks the comeback's genera of its selection when at least 2 of them
  were answered right; otherwise it plays as usual and leaves the comeback (`CB`) to the photo quiz rather than ending
  it (`quiz.js` `cbIn`).
- **Picking** (Pierre, 2026-11-03: "not everyone knows the IMR lecture groups"; then "do not group genera by growth
  form": it is not genus-specific, many genera take 3-4 forms or more, only the mushroom corals keep one): every genus
  is in view as a small photo with its name, A-Z by default, the IMR lecture groups as the other view (for RAs, the
  genera in view inside each group); quick picks that need no knowledge, My weakest (genera answered, lowest progress
  first, 6), Recently missed (a miss in the last 5 answers, latest first, 8) and Look-alikes of … (a genus and its
  declared or confused look-alikes, `isLook`, `confusable`); a search box. The selection is saved at each change
  (`imr-coral-custom`, synced, the latest wins) and preselected next time.
- **Checked** (AGENTS.md 14g): `tools/learnsim.js --seeds 5 --questions 300`, the four profiles, `main` (ed0ee83)
  against this change, same seeds: every number of every table identical (true knowledge, |th-lk|, prog-know, progress,
  genera met, right %, look-alike accuracy, exams, first met), as expected: the photo quiz's path is the same code with
  no selection (`planPhoto('quiz')`), and learnsim plays the photo quiz only. The real answer log cannot judge it: no
  answer exists in the new mode yet, and a custom-quiz answer is scored by the photo quiz's own functions (expected
  success, Elo, progress weight, hold); to compare once players use it: the Expected against actual of `quiz|s…`
  answers beside plain `quiz` ones (a selection of look-alikes should come out harder, and `plausibleK` count it so).

### One contrast queue (2026-11-03)

The independent review's item 7: look-alikes were contrasted three ways (traps among the choices, "Again: A or B?" after
a mix-up, duels slipped into the quiz), the duels under five spacing rules (`AUTO_DUEL` P 0.1, FROM 20, GAP 5, AGAIN 2,
SAME 20, and never while an Again was due). Its dead knobs (`AUTO_DUEL.LO/HI/SHAKY`, `OPEN.SHAPE`) had already gone. The
Again and the duel are the same question, a 2-choice contrast of a look-alike pair, so they now follow one rule
(`quiz.js` `CONTRAST`, `planPhoto`); traps stay part of a question's format (item 4).

- **One queue, one slot**: every mix-up of the photo quiz queues its pair (`rematch`), a contrast question's too (an
  Again missed comes again, as before; a duel missed now brings its Again, where it used to come back only through the
  duel draw). The newest mix-up replaces one still waiting, as before.
- **One gap**: two contrast questions are at least `CONTRAST.GAP` = 2 questions apart, and a queued pair comes 2
  questions after its mix-up (one question in between, the Again's timing since #251). Counted on the answers at which
  each planned question will show (`planPhoto(at)`), so the plans made ahead no longer need the spacing reset when a
  question shows (Codex review #361).
- **With nothing queued**, a question becomes a duel with the chance `CONTRAST.P` = 0.1 (Pierre's 1 in 10), on a pair
  `duelPick` draws (own mix-ups first), both genera met and ready, never the pair of the previous contrast question
  (replaces `SAME`). Still never with a card (opening comes first), never in a comeback.
- **No first 20 answers without duels** (`FROM` dropped; Pierre, 2026-11-02: "duels help learning early too"). A
  first version let a genus into duels only from the ability where its questions get a trap for sure (a duel being a
  one-trap question): simulated, the beginner then had no duel before question 100 (3 before) and learned less (true
  knowledge of the slate at question 300 0.57 → 0.51, look-alike pairs told apart 0.83 → 0.80), so it went.
- 5 constants and 3 state variables (`againAt`, `duelLog`, the show-time patches) → 2 constants, one slot and the last
  contrast question.

Simulated (`tools/learnsim.js`, 5 seeds × 600 questions, the four profiles, the photo sets as in CI, same seeds),
before → after, mean of the seeds (± the standard error of the paired difference where it matters):

| Profile | duels by 600 | Agains by 600 | true knowledge 300 / 600 | look-alike pairs told apart 600 | genera met 300 | learned 600 | true ref. success at exam entry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | 21.8 → 32.6 | 66.6 → 68.4 | 0.57 → 0.55 (±0.02) / 0.85 → 0.82 (±0.02) | 0.945 → 0.937 | 31.6 → 29.6 (±1.2) | 0.6 → 0 | 0.82 → 0.83 |
| lecture RA | 21.2 → 33.4 | 62.2 → 66.0 | 0.73 → 0.72 / 0.90 → 0.90 | 0.965 → 0.964 | 38.2 → 37.8 | 0.4 → 0.2 | 0.84 → 0.89 |
| strong RA | 23.4 → 34.4 | 47.8 → 47.8 | 0.85 → 0.85 / 0.94 → 0.94 | 0.981 → 0.982 | 40 → 40 | 1.6 → 1.4 | 0.92 → 0.92 |
| expert | 28.0 → 46.4 | 15.4 → 14.4 | 0.95 → 0.95 / 0.97 → 0.97 | 0.989 → 0.989 | 40 → 40 | 7.6 → 7.8 | 0.92 → 0.92 |

- Duels come about half as often again (5-8% of the questions, was 4-5%): nearer Pierre's 1 in 10, since a duel no
  longer waits 5 questions after the last one. Right % unchanged (within 2 points at every checkpoint).
- The beginner's knowledge is 0.02-0.03 lower, about one standard error: more 2-choice questions raise the ability less
  (a right answer among 2 proves less), so genera stay shaky a little longer and open a little later (29.6 genera met by
  question 300 against 31.6). The opening itself is item 6 (below). Everyone else within the spread.

**Real answers** (`node tools/realcheck.js answers.json`, the sheet's Answers tab read 2026-11-03: 1,270 answers of 10 players, 1,190 with the app's expectation logged; aggregates only): a replay cannot say which questions the new queue would have asked, only how the contrast questions fare. The
2-choice questions of the quiz (Agains and easy choices) were right 87% of the time where the app expected 76% (n 653),
the duels in the quiz 16 of 16 (expected 82%), the Duel tab 93% (82%, n 86): contrast questions are easier for real
players than the 1-in-2 guess rate says, so more of them cost little success; the expectation itself is unchanged by
this item.

### Pierre's Easy / Medium / Hard sets against the players' answers (measured 2026-11-02)

The sets only give a photo's starting difficulty in the app (`photoDiff`: -1 / 0 / +1, weighing 5 answers); the sheet's
Elo never uses them. On the live data (552 answers, 438 photos rated): 342 of the 499 game photos in a set have answers;
Hard photos have 7 (they go to strong players); Easy and Medium are right 78% and 77% of the time. Rank correlation
between set and Elo: 0.00 for photos with 3 answers or more (121), 0.36 (p 0.01) with 5 or more (45: 39 Easy, 6 Medium,
Medium +0.35 against Easy -0.05). Too few answers to drop the sets or to trust them; to measure again once about 100
photos have 5 answers or more, Hard ones included.

### First meeting with a genus (2026-11-02)

Beginner RA review: the first quiz felt like an exam, asking genera the player had never seen. Pierre's design, the same
day: a player starting from zero first meets 4 genera on cards, is asked about those, and new genera then come one at a
time, each on its card, but never as the answer of the question right after its card ("too easy"). In model.js
(`INTRO`) and quiz.js (`introShow`, `planPhoto`):

- **Cards**: name, cover photo, ID tips, and for a ★ genus the surveyed look-alike it is on the slate for (rule 6b).
  The first `INTRO.START` (4) come one after the other ("1 of 4", Next, Start), picked by the progressive path's draw
  (easiest first); the first question is about one of them, never with that card's own photo (`photoSet(n, skip)`; a
  new-player walkthrough, 2026-11-02, got the very same photo twice in a row; same for a duel that brings a card).
- **When a genus opens** stays the progressive path's call (below): a draw that falls on a genus not met yet shows its
  card and asks about a genus already met. At least `INTRO.EVERY` (2) answers between two cards.
- **A ★ genus after the genera it is compared to** (Pierre, 2026-11-03): it opens, on a card of its own or among the
  first cards, only once the surveyed genera its card names are met ("Starred genera after their reference", below).
- **Held while the player falls behind** (`introHold`, Pierre, 2026-11-02): no new card while a running sum of how
  far the answers fall below the success the game expected for them (each answer's `e`), less an allowance
  `INTRO.SLACK` (0.1) an answer, never below 0, is `INTRO.HOLD` (1.5) or more. A CUSUM (Page 1954, the standard detector of a lasting drop): a run of misses adds up however long it
  lasts, a spell above expectation is not banked against a later drop, and right answers pay the debt back by what they
  beat the expectation by (an easy one, e 0.9, by 0.1). Kept on the device (`imr-hold`), so a player who left on a run
  of misses does not come back to new genera, and, for a signed-in player, synced through the sheet (sheet v23, Pierre
  2026-11-02: it follows the player from one device to another, and is rebuilt from the answers given before it
  existed, an RA having left on a run of misses before it was built): each load of the saved progress carries the same
  sum computed by the sheet over every answer it logged for the player, in time order, since their last progress reset
  (`Code.gs` `hold_`, same formula and allowance, `HOLD.SLACK` kept in step with `INTRO.SLACK` by
  `tests/sync.test.js`); the app adds the answers the sheet has not confirmed yet and takes that as its hold
  (`holdSync`): the same sum over the same answers on every device, so right answers on a phone pay back a hold started
  on a laptop. Players not signed in keep the device's only. Cleared with
  the progress. Every answer counts, the comeback's after a break too, each with the expectation it really had (below;
  the gentle restart's, logged `|w` from its start to the comeback, stay left out). Why: an RA from the previous month's programme
  (the lecture, a few ID dives and analyses: good, not an expert) at 86% right after 50 answers declined "open all"
  (Pierre: even trained RAs prefer to meet the genera progressively; experts must still be able to open them fast),
  then met 9 genera in 21 answers (one every 2, the `EVERY` floor), fell to 5 right in 10 where about 8 were expected,
  answered the one-tap question "too hard" and stopped. Tried first: a fixed wider gap (`EVERY` 5) and holding on any
  miss of a genus just met (both slowed the expert, 26-28 genera after 200 questions down to 22-24); the last 10 answers
  of the visit (forgot the misses at the next visit; a 20-answer window hid the drop behind the earlier good answers and
  never triggered on that RA). The allowance keeps a player the game slightly overrates (0.85 expected, 0.8 right) from
  ever being held: without it, the simulated expert was held for good. On that RA's answers it holds at answers 11-12
  (three misses in a row) and from answer 67, off and on. Simulated (6 seeds, 200 questions, genera met, without →
  with): beginner 15 → 13, lecture-level RA 14 → 13, strong RA 22 → 23, expert 27 → 28.
- **After a break** (Pierre, 2026-11-02): a new visit (30 minutes without an answer) opens no genus in its first 10
  answers, and a comeback planned from the time away and how solid each genus is comes first when the break left rust
  ("Comeback after a break", below). It replaced the gentle restart (`WARM`, the same day: 10 easy questions at every
  page load, left out of the hold).
- **Not right after**: a genus met on a card alone can be asked from `INTRO.GAP` (2) answers on (one question at least
  in between; the card says "It comes up in the questions a little later", and since 2026-11-03 its genus is not
  among that question's choices either: a beginner saw the name of the card just read as a choice behind it; simulated,
  `tools/learnsim.js`, 5 seeds x 300 questions, true knowledge of the slate before → after: beginner 0.57 → 0.55
  (±0.03 / ±0.06), lecture-level RA 0.73 → 0.74, strong RA 0.85 → 0.85, expert 0.95 → 0.95, all within the spread).
  The first 4 can be asked at once.
- **Choices among the genera met**: easy wrong choices and traps come from the genera met (a card or an answer); a
  look-alike already met beats a name never seen; genera never met only make up the three when too few are met.
- **Duels**: both genera are named on the buttons, so the cards of those not met yet come together before the duel.
- **"I've had the IMR lecture: open all genera"** (Pierre, same day: the first users are RAs who saw every genus in the
  lecture and have little time): a button on the first cards, and in My progress while genera are still unopened,
  opens every slate genus at once, without cards (`introAll`). The draw then asks first the genera never asked, with
  choices from the whole slate. A tinted box with a real button, not a chip (Pierre: white on white was easy to miss).
- **Offer to open all** (Pierre, same day: 10 answers on 4 genera are too few to decide): between the 50th and the
  150th answer (`INTRO.OFFER`), with 10 slate genera met or more and an overall level (Elo, `P[LEVEL].th`) of 0.5 or
  more, a card says "You seem to know your corals already" and offers Open all genera or Not now (`introOffer`), once.
  Simulated at 50 answers: a beginner -0.9, an RA who knows 60% of the genera -0.2, 80% +0.8, an expert +1.2. The
  correct-answer rate does not tell them apart (the game keeps everyone near 80%: 68%, 76%, 86%, 88%). A card, not an
  automatic opening, so a wrong guess costs a tap.
- **Back to one at a time** (Pierre, 2026-11-03; `backDue`, `introBack`, quiz.js `backShow`). A player had 46 right in
  51 (90%) on 13 genera opened one at a time, accepted the offer around answer 52, and on the ~27 genera that came at
  once fell to 21 right in 34 (62%), with a run of 1 right in 8 on look-alikes, where the game expected 0.70-0.88; the player
  then stopped. Pierre: "if the player then says no, I keep all genera, fine; but offer at least once the option to go
  back if we detect it really became too hard". So once after Open all (from the first cards, My progress or the offer),
  a card "Lots of new genera at once: Keep them all, or go back to one at a time?" offers One at a time (the main
  button) or Keep them all (also Escape). **When**: the record of Open all keeps `h`, the opening hold's own CUSUM
  (`holdNext`: each answer's expected success `e`, allowance `INTRO.SLACK`) over the answers since Open all, from 0;
  the card is due as soon as `h` reaches 2 × `INTRO.HOLD` (3.0: about three answers' worth of misses beyond the
  expected success and the allowance), with the usual prompt gating (`promptOk`: `PROMPT.GAP` answers after another
  prompt, never with a card, the tour or an achievement; `noOpen`: not in the floor of a visit or a comeback; shown
  over a new question, never over one being answered). No fixed answer count and no new constant: the hold's own
  threshold, doubled because undoing a choice needs more evidence than pausing new cards. Replayed on that player's
  answers (the hold's formula from 0 at Open all): 2.21 at the 7th answer after Open all (three misses in a row), back
  down, then above 1.5 from the 17th to the last (the 34th), peak 4.98 at the 23rd. A first draft ("30 answers since
  Open all and the hold on") would have shown the card at the 30th, 4 answers before the player quit; with 2 × HOLD it shows
  at the 21st (3.53), and the early blip (2.21) does not trigger it. **Keep them all**: nothing changes. **One at a
  time**: every genus opened by Open all (kind `a`), answered or not, right or not, is closed again (kind `b`, Pierre,
  same day: "they then reopen one at a time as the normal path's algorithm opens them"): out of the draw, the choices,
  the duels and the "Again" until the progressive path opens it again on its card (`introduced`, `introReady`: the mark
  wins over the answers already given); its answers, progress and ability are kept, and it comes back with them. The
  genera opened before (first cards, own cards) stay open; the question on screen is chosen again. My progress keeps
  its Open all genera button to reopen them any time; the card is never made again either way (`bk` in the record,
  kept by a later Open all). Simulated (5 seeds, Open all at about answer 50, see "Open all: the app's expectation
  against the truth" below): the card showed to a beginner in 5 runs of 5 (10-19 answers after Open all), a
  lecture-level RA in 2 of 5 (26 and 66), a strong RA and an expert never.
- Synced with the progress: the cards (`imr-coral-intro`: genus -> [answers when shown, 1 when ready at once (first cards, Open all,
  a duel's), time shown, kind: s first cards / c a card of its own / a Open all / b closed again by One at a time]) and the offer
  (`imr-coral-intro-offer`: {at, open, via: card / progress / offer, t, n genera opened at once, h the drop since; the
  back card's choice bk keep / one, after answer bat, bn genera closed, time bt}, also written by Open
  all genera, for the admin's player journey) are `imr-coral*` keys, which the sheet keeps; on a pull, the cards seen on another
  device join this one's (`introMerge`; between a closed mark and an opening of the same genus the later one wins, so a
  genus closed on one device is closed on the other, and one reopened since by its card is open on both), the offer record
  goes by its latest decision (`t` or `bt`; `h` counts each device's own answers), and a progress reset starts them over (`introReset`). A genus already asked
  counts as met; the bonus genera, once on, get a first-meeting card like the others. Checked in CI (`tests/draw.smoke.js`, first meetings, offer,
  sync; `tests/pages.smoke.js`, the 4 cards and My progress).

My progress no longer shows "Review" (weak) for a genus with fewer than 5 answers (`REVIEW_MIN`, `shownLevel` in
model.js): it shows "Learning" until there is enough evidence. The ring counts genera met ("6/40 met") until one is
learned, then genera learned. The model itself (`level`) is unchanged. ("Review" itself is shaky since 2026-11-03: "One draw weight", below.)

### Comeback after a break (2026-11-02)

Pierre: a player coming back after a night (6-8 h) already has some rust, after days or weeks much more; an expert needs
almost none even after a long absence; a 10-minute break needs none. The first version (the same day) was a fixed
**gentle restart**: 10 easy questions on genera already answered right at every page load (`WARM` in `quiz.js`), left out
of the opening hold. Replaced by a comeback planned from the time away and how solid each genus is, ended by the answers,
with no cap and no duration threshold (`model.js`, "Comeback after a break"; `quiz.js` `planPhoto`, `answer`).

**Time, only here** (AGENTS.md rule 12, exception approved by Pierre the same day: "the no-time rule was there because
the goal is not to bring people back every day like Duolingo; the goal is to learn as fast as possible, in a few hours
or days. But for the comeback, time must be taken into account"). Time plans the questions after a break; progress
(`s.pg`), mastery (`s.mx`) and the Elo ability (`s.th`) never decay, only answers move them (as Glicko keeps the rating
and only widens its uncertainty after inactivity).

- **Recall** of a genus t days after its last answer (`s.at`): the FSRS forgetting curve with its standard constants,
  R = (1 + 19/81 · t / S)^−0.5, S = the stability in days (R = 0.9 at t = S). `FSRS = {F: 19/81, C: −0.5, ...}`.
- **Stability** S: FSRS's first-review stabilities, Again 0.4 to Easy 15.7 days, log-linear in how solid the genus is,
  x = the chance to recognise an average photo of it, sig(ability − genusDiff) (what `shaky` reads), 1 once learned.
  FSRS's Hard 1.2 and Good 3.2 days fall at x 0.30 and 0.57: the four grades are evenly spread on that scale, so no
  other point was needed. Times 2.5 (SM-2's default ease factor; FSRS multiplies S by about 2 to 3.5 at a review when
  due) for each further **day** the genus was answered right (`s.dd`, `s.dl`): spaced days count, a hundred right
  answers in one sitting count as one day. The ability, not the progress, says how solid: it is the app's estimate of
  how well the genus is known from its first answer (an expert's genera start from their global level), while the
  progress needs many answers against look-alikes (what was proven, not what is known).
- **Rust**: the right answers the break is expected to have cost, summed over the genera answered (those in play: the
  slate, and the bonus genera when the player has them on): each loses
  (1 − 1/4)(1 − R)·sig(`aimOff(4)` − ln R), the success above chance lost on a usual 4-choice question at the photo a
  comeback shows. Only the gap since the last answer counts (play itself adds nothing). A comeback starts at a new
  visit (below) whose gap left rust: 30 minutes leave about 0.001 for any player (one easy question ends it), a night
  some tenths for a beginner, less for a strong player, a month several right answers. A first version started one
  when a gap's rust rounded to one right answer (0.5): then no break of 8 hours or less brought one in any profile (simulated, 10 seeds), and
  the visit already gives the moment, so that constant went.
- **Its questions**: genera answered right; the surest half (highest R) until one is answered right (a positive start:
  the warm-up decrement, Adams 1961), then the most rusted half; the player's usual choices (`trapsFor`: look-alikes
  for a strong player; Pierre, 2026-11-03: easy choices in the first version made a right answer prove so little that
  an expert stayed 22 questions after a month), no card, duel or exam (an "Again" after a miss still comes, as a
  comeback question); photos aimed at the rusty ability, ability + ln R. Rust
  multiplies the chance of recognising by R, which lowers its log-odds by at least −ln R, so the photos are a little
  easier, never more than the rust explains (R 0.9: 0.1 easier; 0.6: 0.5).
- **When it ends**: by the answers, a CUSUM like the opening hold's (`holdNext`, Page 1954): rust ← max(0, rust + p −
  right − l), p = 1/k + (1 − 1/k)·R·sig(ability − difficulty) the recall-adjusted chance of the question, l = (1 −
  1/k)(1 − R)·sig(ability − difficulty) the rust the question itself repairs (its genus is reviewed, its R back to 1). A
  player doing better than expected melts it fast, worse keeps it going; it ends at 0. A long break while the app stays
  open counts the same: the gap is checked whenever a question is planned or answered.
- **Fairness**: a miss in the comeback weighs what it proves with the recall-adjusted chance (`pgMissW(th, d, k, R)`): a
  miss the rust explains costs less progress. Its logged expectation `e` is the same recall-adjusted chance.
- **A new visit opens no genus at first** (Pierre, 2026-11-02: "reopening a new genus straight away would be a
  mistake"; his explicit choice, not a cap): a visit starts after `SESSION.GAP` = 30 minutes without an answer (Pierre,
  2026-11-02: the standard session timeout of web analytics, Google Analytics, also commonly used to cut learning logs
  into sessions), never at a page load, so a reload or an update is no new visit and an app left open overnight is one
  at the next question. From a new visit, and from the start of a comeback, the first `COMEBACK.FLOOR` = 10 answers open
  no genus (no card, no open-all or bonus genera offer: `noOpen`), and a comeback holds openings as long as it runs.
  The floor's questions are otherwise ordinary (duels, exams, traps) unless the rust makes them comeback questions.
- **The opening hold gets every answer** (Pierre, 2026-11-02: "so that the hold algorithm has the full information"),
  the comeback's too, with the expectation the question really had: the plausible choices k (`plausibleK`, as for any
  question: easy choices of other growth forms raise it, so an easy right answer pays back little) and the rust (it
  lowers it, so a miss the rust explains adds less). They are logged `|c` (before `|kN`): a distinct tag for the admin, which the sheet's `hold_`
  does not leave out (it leaves out `|w`, the gentle restart's answers of 2026-11-02, as before); the sheet replays the
  logged `e`, the adjusted one, so app and sheet stay in step without a sheet change.
- **Not for a newcomer**: neither the floor nor a comeback with fewer than 2 genera answered right, nor before any
  answer time is known (progress saved before this change: the last answer of the device's log, else nothing until the
  next answer).
- **Kept**: on the device, `imr-comeback` {r rust, t time accounted, ok right answers in the comeback, f the answer count
  until which no genus opens}, cleared with the progress; in the synced progress, `s.at` (last answer, ms), `s.dd`
  (days answered right), `s.dl` (the last of them, local day number), and `P['~level'].at` (the player's last answer);
  `core.js` `mergeProgress` keeps the latest `at` and `dl` and the larger `dd` of two devices.

Simulated with `tools/learnsim.js --breaks 30m,8h,3d,1w,1mo --after 20` (below), 10 seeds, 300 questions first, then
the comeback and 20 questions more after each break, the same seeds for every version. Each cell: comeback questions,
median [min-max]; right % during the comeback / in the 20 questions after it; in brackets the first version (easy
choices during the comeback, 2026-11-02).

| Break | beginner | lecture RA | strong RA | expert |
| --- | --- | --- | --- | --- |
| 30m | 1 [1-6], 95 / 86% (1 [1-16], 98 / 86%) | 1 [1-5], 98 / 88% (1 [1-21], 96 / 84%) | 1 [1-25], 97 / 90% (1 [1-1], 100 / 87%) | 1 [1-1], 100 / 96% (1 [1-10], 99 / 100%) |
| 8h | 2 [1-20], 94 / 88% (2 [1-8], 96 / 83%) | 4 [1-16], 92 / 86% (2.5 [2-9], 98 / 85%) | 2 [1-11], 97 / 86% (2 [2-6], 98 / 89%) | 1 [1-2], 100 / 97% (2 [1-3], 100 / 96%) |
| 3d | 13.5 [7-29], 83 / 80% (11.5 [6-29], 88 / 84%) | 12.5 [9-23], 87 / 84% (13.5 [7-23], 91 / 84%) | 10 [6-19], 92 / 82% (9.5 [7-15], 96 / 86%) | 9 [5-12], 94 / 96% (8 [6-16], 99 / 99%) |
| 1w | 14 [10-35], 88 / 82% (17 [9-44], 89 / 81%) | 19.5 [14-51], 85 / 82% (21 [10-38], 90 / 83%) | 15.5 [10-38], 89 / 86% (25.5 [12-31], 91 / 83%) | 9.5 [8-25], 96 / 95% (13 [12-19], 99 / 98%) |
| 1mo | 36.5 [19-62], 82 / 78% (48 [31-89], 80 / 79%) | 37 [22-63], 83 / 76% (49 [32-61], 84 / 80%) | 29 [20-39], 83 / 84% (34 [26-58], 88 / 84%) | 15 [13-18], 99 / 96% (22 [20-27], 99 / 97%) |

The gentle restart it replaced (10 easy questions at every page load, 10-13 with an Again, whatever the break), right %
during it / in the 20 questions after it, same seeds:

| Break | beginner | lecture RA | strong RA | expert |
| --- | --- | --- | --- | --- |
| 30m | 91 / 82% | 94 / 88% | 93 / 90% | 98 / 98% |
| 8h | 94 / 86% | 96 / 82% | 94 / 86% | 99 / 96% |
| 3d | 84 / 84% | 88 / 80% | 93 / 85% | 100 / 97% |
| 1w | 86 / 84% | 82 / 88% | 88 / 87% | 99 / 95% |
| 1mo | 78 / 72% | 79 / 74% | 87 / 82% | 98 / 98% |

- Openings held (the floor): 10 answers after every break of 30 minutes or more, the comeback's length when longer; none
  after 10 minutes (no new visit; the gentle restart held them 10 answers after any page load).
- With the usual choices the expert's comeback is shorter: 9 questions after 3 days (8 with easy choices), 9.5 after a
  week (13), 15 after a month (22), at 94-99% right; still more than "almost none" (Pierre's wish): one session gives at
  most FSRS's Easy stability (15.7 days, 0.80 recall after a month) to the genera not yet learned. The learners' month
  comebacks went from 34-49 to 29-37 questions, with their right % during them at 82-83%.
- **To recalibrate with the players' data** (Pierre, 2026-11-03: kept as they are for now, ROADMAP): the comeback after
  a night is 1-4 questions (the rust of a night is 0.1-0.25 right answers by the FSRS curve; the learner's true loss
  0.000-0.013 a genus met), the 10-answer floor covering the rest; after a month a learner's is about 30-40 questions
  (19-63). Both come from FSRS's standard curve and stabilities and from our simulated learner, not from real answers.
- The opening hold: on during the comeback in 0-3 runs of 10 (up to 0.8 answers on average), in the 20 questions after it
  in 0-4 runs of 10, about as often as after the gentle restart (after a month 1-4 against 3-6).
- After a month, the 20 questions after the comeback: beginner 78% (gentle restart 72%), lecture RA 76% (74%), strong RA
  84% (82%), expert 96% (98%); after shorter breaks within a few points of each other.

### Which genus comes next: the progressive path (2026-11-02)

Pierre: rather than spamming a beginner with 40 genera, focus on the easiest ones, opening new ones as they go,
everything estimated from the data. Before, a genus never seen weighed 10 against 1-4 for one being learned: a beginner
met the 39 slate genera almost at once.

- **Opening by results** (one rule since 2026-11-03, below): when the path allows a card (at least `INTRO.EVERY`
  answers since the last one, no opening hold, not in the floor of a visit or a comeback), the question opens a genus
  with the chance `openChance` = 1 − shaky / `OPEN.K` (8): the free share of K places for genera met and still
  *shaky*, a work-in-progress limit with a slope, not a switch. Until 2026-11-03 the genera not met yet shared
  `OPEN.READY` (35%) of the genus draw while no genus met was shaky, down in a straight line to `OPEN.TRICKLE` (3%) at
  `OPEN.K` (10) shaky genera or more (a slope since 2026-11-02; before, 35% below 6 shaky genera and 3% from 6, K 3,
  then 5, then 6: one genus more or less shaky flipped the pace, which made the opening a lottery, below).
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

### One opening rule (2026-11-03)

The independent review's item 6: the opening was throttled twice, by a share of the genus draw for the genera not met
yet (`OPEN.READY` 35% down to `OPEN.TRICKLE` 3% at `OPEN.K` 10 shaky genera, the share arithmetic in `weighted`) and by
`INTRO.EVERY` (2 answers between cards); since then the opening hold (`introHold`) and the floor after a break
(`noOpen`) joined them. The last three are rules about *when* a card may come; the share was a second way of saying
*how often*. Now one: when a card may come, the question opens a genus with the chance `openChance` = 1 − shaky /
`OPEN.K` (`model.js`), the genus drawn among those not met yet by `openPick` (easiest first as far as the data are
trusted, most common first: unchanged). The genus draw (`weighted`) only weighs the genera met. `READY`, `TRICKLE` and
the share arithmetic went; K was recalibrated, as the review expected (the chance to open with nothing shaky is now 1,
was 0.35).

Simulated (`tools/learnsim.js`, 5 seeds × 600 questions, after item 7, same seeds), genera met (cards and asked), true
knowledge of the slate, look-alike pairs told apart, genera learned; before → K 6 / K 8:

| Profile | met at 100 | met at 300 | true knowledge 300 / 600 | look-alike 300 | learned 600 |
| --- | --- | --- | --- | --- | --- |
| beginner | 15.0 → 14.8 / 15.6 | 29.6 → 28.0 / 29.0 | 0.55 → 0.51 / 0.53; 0.82 → 0.83 / 0.84 | 0.819 → 0.794 / 0.807 | 0 → 0.2 / 0.4 |
| lecture RA | 18.0 → 17.6 / 20.8 | 37.8 → 36.8 / 38.2 | 0.72 → 0.72 / 0.74; 0.90 → 0.89 / 0.90 | 0.895 → 0.890 / 0.900 | 0.2 → 0.2 / 0.4 |
| strong RA | 20.4 → 28.6 / 30.0 | 40 | 0.85 → 0.86 / 0.85; 0.94 | 0.951 → 0.954 / 0.952 | 1.4 → 0.2 / 0.4 |
| expert | 20.0 → 29.0 / 29.0 | 40 | 0.95; 0.97 | 0.984 | 7.8 → 6.8 / 6.8 |

**K 8**: the beginner keeps their pace (15.6 genera at question 100, the CI limit is 17) and the RAs open a little
faster (Pierre, 2026-11-02: "600 questions and only twenty-some genera open for the RAs may not be enough"), the
strong RA and the expert much faster (nothing stays shaky, so a card every `INTRO.EVERY` answers: all 40 met by about
question 100, was 200); true knowledge within ±0.02 of before everywhere, where K 6 cost the beginner 0.04 at question
300 (K 10, tried on the first version of item 7, opened 17 genera to the beginner by question 100, at the CI limit). Genera learned by 600 move by about one standard error (strong RA 1.4 → 0.4 ±
0.8, expert 7.8 → 6.8 ± 1.0): the genera opened sooner share the questions. The right % stays within 3 points except
the first 100 questions of a strong RA (93 → 84%: more new genera at once).

**Closed genera take no place** (Codex P1 on #408, 2026-11-03): after Open all, "One at a time" closes the genera
opened at once and keeps their answers and abilities; counted among the shaky genera, 8 or more badly known ones held
`openChance` at 0 for good, and being closed they are never asked, so they could never come back. Only the genera open
now (`introduced`) count. `tools/learnsim.js --openall 30 --back one`, 5 seeds × 300 questions: the 2 runs (of 20)
where the back card came and was taken went from stuck at 34 genera met to 37 by question 300 (beginner) and 37.8 →
38.6 (lecture RA); the other runs are unchanged to the decimal, and without Open all no genus is ever closed, so the
rule is the same as before.

**Real answers** (`node tools/realcheck.js answers.json`, the sheet's Answers tab read 2026-11-03: 1,270 answers of 10 players, 1,190 with the app's expectation logged; aggregates only): the log holds no record of when a card could have opened, so the opening cannot be replayed; the shaky signal it
counts is checked with item 8 ("One draw weight", below).

### One draw weight (2026-11-03)

The independent review's item 8, first half (Pierre, 2026-11-03: "one variable computed dynamically, as simple as
possible"; the second half, no longer updating the genus wrongly picked, came next: rule 13 kept, both genera affected,
the picked genus in its progress but not its Elo, "The genus wrongly given in the Elo"). Which genus a question asks was
drawn by status weights: never asked 10, learned 0.25, "Review" (2 misses in the last 5) 3 + 2u, learning 1 + 3u,
u = 1 − progress. Now one quantity (`model.js` `drawW`, `weight`):

- **drawW = 1 − x · c**: x = sig(ability − `genusDiff`), the player's chance to recognise an average photo of the genus
  (what `shaky`, the opening and the comeback read); c = m / (m + `ELO.n`), how sure the Elo is of that ability after
  m answers (the share of its uncertainty function, K = kmax / (1 + m / n), already gone). What the model does not yet
  know the player holds: never asked 1, the most (every genus comes up early, a card's genus soon after its card); badly
  known or barely measured near 1; known and measured near 1 − x. No new constant.
- Kept as they were: the exam (a genus ready for its next exam question weighs 1, as one never asked, was at least 3;
  between two exam questions × 0.05), the last 4 questions held back (× 0.1), the duel draw (`duelPick` adds the two
  genera's weights).
- **"Review"** on My progress and the genus sheet is now *shaky* (`level`): met, not learned, and the expected success
  on an average photo with 4 choices under `OPEN.P` 0.6, the same x. "2 misses in the last 5" was dropped: the game
  aims every question at 80%, where 2 misses in 5 come one time in four at any level (the reason it was already
  dropped for the opening). `REVIEW_MIN` (no "Review" under 5 answers) is kept; the sheet text says "Under 60%
  expected right on a typical photo of it". The sync summary's review list follows.
- Removed: 4 inline weights (10, 0.25, 3 + 2u, 1 + 3u), the exam's 3, the Review rule (`misses`).

Simulated (`tools/learnsim.js`, 5 seeds × 600 questions, after items 7, 6 and 4, same seeds), before → after (± the
standard error of the paired difference where it matters):

| Profile | true knowledge 100 / 300 / 600 | genera met 100 | entered the exam by 600 | true ref. success at entry | learned 600 | right % 600 |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | 0.26 → 0.27 / 0.54 → 0.55 / 0.85 → 0.86 | 15.2 → 15.8 | 2.2 → 3.0 | 0.87 → 0.86 | 0.6 → 0.8 | 87 → 87 |
| lecture RA | 0.46 → 0.49 / 0.73 → 0.74 / 0.90 → 0.90 | 19.0 → 23.4 | 1.2 → 5.2 (±1.0) | 0.93 → 0.85 (±0.04) | 0 → 0.6 | 90 → 90 |
| strong RA | 0.70 / 0.86 → 0.85 / 0.94 | 30.4 → 29.8 | 10.6 → 14.6 (±1.6) | 0.91 → 0.92 | 0.4 → 1.8 (±0.5) | 95 → 94 |
| expert | 0.94 / 0.95 / 0.97 | 27.8 → 27.0 | 26.0 → 25.8 | 0.92 → 0.92 | 5.8 → 7.4 (±1.3) | 97 → 97 |

- True knowledge the same or 0.01-0.03 higher everywhere; the progress bar's gap to the truth unchanged (±0.03).
- Genera reach the exam and pass it sooner: the RAs' genera close to the exam's entry were drawn less than before (the
  old 1 + 3u fell with the progress, u under 0.2), now as much as the model's doubt says. The lecture RA's genera now
  enter it at a true success of 0.85 on the hard reference question (0.93 before, but on 1.2 genera a run; the review
  asked for 0.85 or more); the exam then decides, unchanged.

**Real answers** (`node tools/realcheck.js answers.json`, the sheet's Answers tab read 2026-11-03: 1,270 answers of 10 players, 1,190 with the app's expectation logged; aggregates only): each signal computed before every answer on a genus the player had already answered (972 answers, 15% missed),
replayed per player in time order, the ability as logged, the genus difficulty the mean of what its real answers imply:

| Signal before the answer | flagged: answers, missed | not flagged: answers, missed | area under the ROC curve for a miss |
| --- | --- | --- | --- |
| old "Review" (2 misses in the last 5) | 331, 18% | 641, 14% | 0.561 (the count of misses in the last 5) |
| new "Review" (shaky) | 236, 17% | 736, 15% | |
| `drawW` | | | 0.561 |
| x alone (1 − x) | | | 0.498 |

The new weight tells a coming miss as well as the old rule (0.561 both, little above chance: the game aims each photo
at the player's level, which evens the chances out); by quarter of `drawW`, 13%, 12%, 16%, 19% missed. What carries it
is the uncertainty c (few answers on the genus), not x alone; "Review" (shaky) flags fewer answers (236 against 331)
for about the same miss rate. Neither moves the app's expectation.

### Common first (2026-11-03)

Pierre: open the genera "easy and common first". The genera RAs meet all the time on Dauin reefs and in ReefCloud
photos (*Acropora*, *Porites*, *Pocillopora*, *Montipora*, *Millepora*) should come earlier, with no list of
exceptions kept by hand. Until then how common a genus is played no part: once the photo stats passed `OPEN.DATA`,
the order was difficulty only.

- **The measure** (`tools/commonness.py`, run once offline, never on the phones: AGENTS.md rule 14g): for every game
  genus (the slate, Millepora and the bonus genera), iNaturalist's verifiable observations of the genus taxon (by
  name, inside Cnidaria) within 40 km of Dauin, and the distinct observers of the same. **`cm` = √(observations ×
  observers)**, the geometric mean, written to the genus's `data.json` record. Pierre's compromise: near Dauin the top
  observer makes 29% of the stony-coral observations and the top 10 make 70%, so observation counts follow a few
  systematic divers (abundance), and observer counts follow casual divers (who favour spectacular genera). A genus whose
  own `crit` / `imr` lines say "formerly X" also counts X near Dauin (one query over both taxa, so an observer of both
  counts once): one rule, no hand list ("refer to X" lines are not used: *Fungia* is still a valid genus).
- **The rule** (`commonFactor` in `core.js`, used by `model.js` `openPick`, `weighted` until the one opening rule): the opening weight of each genus not met
  yet, exp(−`OPEN.T` × trust × (difficulty − easiest)), is multiplied by √((1 + cm) / (1 + median cm of the genera not
  met yet)). No new constant: the square root damps it, the median makes it relative to what is left to open, and a
  genus without `cm` counts as the median (factor 1). Commonness applies fully from the first question (it does not
  depend on the players' answers), while difficulty fades in with them (`easyTrust`), as before. It weighs the first
  cards too (they are drawn by `openPick` among the genera not met).
- **Biases to keep in mind**: iNaturalist favours spectacular or easy-to-photograph genera (*Plerogyra* 30,
  *Tubastraea* 18, *Lobophyllia* 40 come out more common than an RA's transects would say) and underrates small,
  encrusting or hard-to-name ones; a genus renamed recently is undercounted unless its "formerly" line catches the old
  name (*Astrea* comes out at 0 even with *Montastraea* / *Phymastrea* counted: its observers near Dauin may file it
  under another genus, or none). 40 km of Dauin is a few hundred observations in all, so a difference of one or two
  between rare genera means little; the square root keeps such genera close.

Measured 2026-11-03 (iNaturalist, verifiable, 40 km of Dauin):

| Genus | Observations | Observers | cm |
| --- | --- | --- | --- |
| *Acropora* | 119 | 30 | 60 |
| *Lobophyllia* | 68 | 23 | 40 |
| *Porites* | 68 | 19 | 36 |
| *Plerogyra* | 37 | 24 | 30 |
| *Pocillopora* | 48 | 14 | 26 |
| *Montipora* | 41 | 16 | 26 |
| *Goniopora* | 35 | 16 | 24 |
| *Tubastraea* | 23 | 14 | 18 |
| *Platygyra* | 25 | 13 | 18 |
| *Millepora* | 22 | 13 | 17 |
| ... (median of the 40 slate genera: 8) | | | |
| *Pectinia* | 6 | 3 | 4 |
| *Lobactis* | 1 | 1 | 1 |
| *Astrea* (+ formerly *Montastraea*, *Phymastrea*) | 0 | 0 | 0 |

The whole table is printed by the tool. Effect, `tools/learnsim.js` with the live photo stats (`--stats`, the sheet's
`?stats=1` answer of 2026-11-03), 10 seeds × 300 questions, same seeds, median question at which a genus is first met
(card or asked; `--met`; ">300": not met in half the runs or more), before → after:

| Profile | *Acropora* | *Porites* | *Pocillopora* | *Montipora* | *Millepora* | *Pectinia* | *Lobactis* |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | 151 → 60 | 176 → 8 | 48 → 48 | 72 → 55 | 193 → 126 | 117 → 172 | >300 → >300 |
| lecture RA | 103 → 20 | 171 → 6 | 91 → 55 | 102 → 79 | 66 → 54 | 68 → 106 | 235 → 247 |
| strong RA | 132 → 11 | 115 → 6 | 83 → 101 | 100 → 69 | 86 → 92 | 51 → 79 | 105 → 203 |
| expert | 116 → 35 | 135 → 6 | 127 → 51 | 122 → 126 | 63 → 92 | 61 → 25 | 76 → 195 |

Over the 40 slate genera, the rank correlation between `cm` and the median question first met went from −0.18 / −0.34
/ −0.17 / +0.11 (beginner / lecture RA / strong RA / expert) to −0.66 / −0.73 / −0.59 / −0.56; the 10 most common were
first met at a median of question 50-60 (was 94-126). With 10 seeds a single genus's median moves by tens of questions
from noise (*Millepora* for the expert, *Pocillopora* for the strong RA). The outcomes held, at 300 questions: genera
met 29.9 / 38.7 / 40 / 40 (were 32.5 / 39.7 / 40 / 40), progress 31 / 41 / 52 / 65% (33 / 42 / 55 / 64%), true
knowledge of the slate 0.56 / 0.73 / 0.85 / 0.95 (0.58 / 0.74 / 0.85 / 0.95), right % 86 / 84 / 87 / 96 (84 / 84 / 87 /
96), true reference success at exam entry 0.82 (1 genus) / 0.85 (2) / 0.94 (5) / 0.92 (10) (was - / 0.85
(1) / 0.91 (4) / 0.92 (9)).

### Starred genera after their reference (2026-11-03)

Pierre, for everyone: a ★ genus (on the slate, not surveyed by IMR, there because it looks like surveyed genera,
AGENTS.md rule 6b) opens only once the genus its card compares it to has been met. A beginner had met *Duncanopsammia*
("Like *Turbinaria*, but corallites about 6 mm") and *Cyphastrea* ("neater than *Astreopora*") before ever seeing
*Turbinaria* or *Astreopora*: the card's comparison then teaches nothing.

- **The references, from the data** (`core.js` `starRefs`, no list in code): a starred genus is one of `data.json`
  `gen` without a slate number (`n` 0); its references are its Coral Finder look-alikes (`look`) that are surveyed
  (numbered) and in the lecture group it is shown in (`lectureGroup`, the app's `shownGroup`): exactly the genera of its
  card's "★ look-alike of …" line (`learn.js` `starNote`, which now reads `starRefs`). Today: *Duncanopsammia* →
  *Turbinaria*, *Tubastraea*; *Alveopora* → *Goniopora*; *Merulina* → *Hydnophora*; *Cyphastrea* → *Astreopora*,
  *Echinopora*; *Halomitra* → *Herpolitha*. All of them, not one: the card names them all, and its ID tips compare with
  the first.
- **The rule** (`core.js` `starWaits`, `model.js` `openPick`; in `weighted` until the one opening rule of the same day): in
  the opening pick, a ★ genus not met is left out while one of its references is in the list drawn from and not met (a
  card or an answer). The genera met, the pace (`OPEN`), the
  easy and common first order are unchanged; the ★ genus simply waits its turn behind its references. It applies
  wherever genera open one at a time: the first 4 cards (`introStart`: a reference drawn earlier among them counts as
  met, so its card shows first), a card of its own, a genus closed again by One at a time. A duel of the Duel tab that
  brings both cards shows the reference's first. **Open all** still opens everything at once (the rule only orders the
  one-at-a-time path), and the choices are unchanged (genera met).
- **Never blocked for ever**: a reference is always a surveyed genus, which never waits itself (no cycle, even if a ★
  genus listed another ★ genus as a look-alike); a reference not in the list (not in the game, no photos) never holds a
  genus back; should every genus left wait, they all open as before. No new constant.
- **Checked**: `tests/genera.test.js` (the references of the real data; not eligible before its references, eligible
  after, a missing reference never blocks); `tests/draw.smoke.js` (over a beginner's 120 questions and 200 first-card
  draws no ★ genus opens before its references; with every other genus met, no ★ genus drawn before its references, all
  of them once the references are met, and all of them when the references are out of the list).

Simulated (`tools/learnsim.js`, 5 seeds × 300 questions, the same seeds, before → after; the draws part ways at the first
★ genus held back, so the two runs differ by noise beyond that):

| Profile | genera met at 100 | met at 300 | true knowledge of the slate at 100 | at 300 | ★ met before a reference |
| --- | --- | --- | --- | --- | --- |
| beginner | 16.0 ± 2.0 → 13.4 ± 2.4 | 31.6 ± 3.6 → 36.0 ± 1.9 | 0.25 → 0.24 | 0.57 → 0.59 | 15 of 23 → 0 of 15 |
| lecture RA | 19.6 ± 1.5 → 18.4 ± 2.8 | 38.2 ± 3.5 → 36.8 ± 3.6 | 0.46 → 0.47 | 0.73 → 0.72 | 16 of 24 → 0 of 22 |
| strong RA | 19.6 ± 1.7 → 19.0 ± 1.7 | 40 → 40 | 0.68 → 0.67 | 0.85 → 0.85 | 11 of 25 → 0 of 25 |
| expert | 19.8 ± 1.3 → 20.0 ± 1.0 | 40 → 40 | 0.94 → 0.94 | 0.95 → 0.95 | 17 of 25 → 0 of 25 |

(★ met: the ★ genera met in the 5 runs, at most 25; "before a reference": met at an earlier question than one of its
references, or with a reference never met.) The genera met and the true knowledge move within the spread over the
seeds; before, 6 in 10 ★ genera came before a genus they are compared to, now none. The ★ genera come later (median
question first met, over the profiles, about 40-200 before, 150-270 after; a beginner met 15 of them in the 5 runs
instead of 23), which suits them: they are on the slate to be told apart from genera already known.

### Millepora and the bonus genera (2026-11-02)

Pierre: *Millepora* (fire coral) is everywhere at Dauin and in ReefCloud photos and is on the IMR **benthic** slate
(taught in the benthos lecture), though not on the IMR coral list, being a hydrozoan, not a hard coral. So it is now a
slate genus for everything (`slateGenera()` = the 39 + `BENTHIC`): the draw, the opening (by `genusDiff`, like the
others, from the start: no threshold, no opt-in), the progress (over 40 genera), My progress, the sync summary and the
leaderboard, achievements. Its first card and its sheet warn that it is not a hard coral and not on the IMR coral list.

The other 5 bonus genera (Isopora, Leptoseris, Heliopora, Sandalolitha, Pleuractis) became **opt-in**: a card offers
them once every slate genus has been asked at least once (`asked`, not only met), and ⚙ Bonus genera turns them on or off any time (`Q.bon`).
Once on they are simply genera not met yet: they open through the same progressive path (easiest first, the shaky
slope, the opening hold), one card at a time. The progress thresholds (`BONUS_AT`), the weight cap (`BONUS_W` 4) and
the 15% share (`BONUS_SHARE`) were removed (AGENTS rule 14f): they came after the slate, so the normal opening and
weights keep them in proportion. Simulated (`tools/learnsim.js`, 10 seeds × 600 questions, the simulated player
accepts the offer), share of the questions on bonus genera from the offer to question 600, per run: 9-16% (median 13%
for every profile), about the old cap with no cap at all.

When it happens, median question over the 10 seeds (all 10 runs each), and the progress over the slate (`prog%`,
mean ± sd) against `main` before the change (same seeds; 39 genera, bonus genera unlocked from 10% and capped at 15%):

| Profile | *Millepora* met / first asked (before: unlocked / first asked) | bonus genera offered | progress at 300: before → after | at 600: before → after |
| --- | --- | --- | --- | --- |
| beginner | 196 / 200.5 (93 / 95.5) | 465.5 | 28±2 → 31±2 | 54±3 → 58±2 |
| lecture RA | 153 / 161.5 (72.5 / 79.5) | 245.5 | 37±4 → 43±3 | 67±4 → 70±3 |
| strong RA | 124 / 133.5 (55 / 65.5) | 218 | 51±4 → 53±3 | 81±3 → 82±2 |
| expert | 147 / 167 (42 / 56) | 228 | 66±2 → 66±2 | 93±1 → 93±1 |

*Millepora* now comes when the opening reaches it (its `genusDiff` puts it in the second half), later than its old
10% unlock. The progress is a little higher at the same question count because the bonus genera no longer take
questions before the slate is met (up to 15% of them from 10% progress before), despite the 40th genus in the
denominator; without accepting the offer (first run, same seeds), 600 questions gave 61 / 75 / 87 / 95%.

### Progress (moving average) and mastery

Until 2026-11-02 the bar of a genus was Bayesian Knowledge Tracing (BKT: `P[genus].L`, `L0` 0.1, learning `T` 0.08,
guess and slip from the photo's difficulty, a start up to 0.5 for a strong player, `bktStart`). Pierre: it climbed far
too fast (from scratch about 7 right answers to 95%, 4 for a strong player), and a right answer among a few genera met
(easy choices, often only 2 plausible) counted almost as much as one against the genus's real look-alikes: "a genus
can't be confirmed as learned before it has been compared with the genera it gets confused with". He wanted progress
that slows down by itself, each point harder to earn than the last, with no hard cap. The independent review
([reviews](reviews/2026-11-02-learning-algorithm-review.md)) had also found BKT degenerate on hard photos (a right
answer lowered L above difficulty ~2, where exam photos sit) and suggested dropping it; Pelánek & Řihák (UMAP 2017)
find that the data used and the threshold matter more than the learner model, and that an exponential moving average
is a good mastery criterion.

- **The rule** (`core.js` `PROG`, `pgStep`, `pgOf`; `model.js` `pgWeight`, `pgObs`): `s.pg ← s.pg + A · w · (right −
  s.pg)`, `A` = 0.15. A right answer weighs `w` = what it proves, from what the question showed:
  - the plausible choices `k` (`plausibleK`: easy choices of other growth forms do not count): (1 − 1/k) / (1 − 1/4),
    so 4 weigh 1, 3 weigh 0.89, 2 weigh 0.67;
  - its look-alikes: in full when a genus it gets confused with is among the choices (pooled confusion ≥ `CONF.TRAP`,
    declared look-alikes as prior, or the player's own mix-ups: the traps' rule), `PROG.LOOK` = 0.5 when none is.
  
  A right answer between the genus and genera of other forms (k 2, no look-alike) weighs a third of one against three
  look-alikes. **A miss weighs what it proves too** (`model.js` `pgMissW`; Pierre, 2026-11-02: "a miss on a very hard
  photo doesn't mean the genus is badly known", and a miss must not cost more than it proves): the Elo chance the
  player had to get it right (ability against the photo's difficulty, k choices) over the chance the game aims for
  (`PICKD.P`, 0.8, whatever the format; a photo `TARGET_OFF` below the ability, about 80% with 4 choices, before 2026-11-03), at most 1. A photo at the player's level
  or easier: in full; 1 unit harder 0.78, 2 units 0.57, 3 units 0.43 (4 choices; with 2 choices less discount, a guess
  is 1 in 2). No new constant. The choices do not lighten a miss: missing among easy choices says as much about not
  knowing the genus as missing among look-alikes, and with the same light weight a genus answered only on easy
  choices would still climb to its success rate, only more slowly; this way such a run tops out below its success
  rate (90% right on easy choices: about 0.75, under the exam's entry). In the games look-alikes come in among the
  choices after the first right answers anyway (traps, rule 14c). A wrong answer counts against both genera (rule 13),
  each with its own ability against the photo.

  Is it fair? With look-alikes among 4 choices, a right answer and a miss at the player's level weigh the same and the
  average settles on the success rate: at 95% on the bar (0.8) a miss takes 4 times what a right answer adds because
  4 right answers to 1 miss is exactly that level. Simulated (`tools/learnsim.js`, 30 seeds × 4 profiles × 300
  questions, paired with misses in full): progress, genera met, look-alike accuracy and the true success of the genera
  entering the exam unchanged within the spread (strong RA 0.93 against 0.91, expert 0.92 both); as the photos are
  picked at the player's level, a miss weighs 0.90 on average and under 0.8 for about 1 miss in 5 (photos well above
  the level: calibration photos, the exam's hardest ones). The misses that say little cost less; the measure loses
  nothing.
- **The bar** = 0.95 × min(1, `s.pg` / `PROG.M`), `PROG.M` = 0.8 = the mastery exam's entry, shown as 95%; each exam
  question passed adds 1%, up to 99% (4 steps: an exam begun before typed questions can hold 5 right answers while it
  still waits for its typed ones; Codex review #393), and only the passed exam makes it 100% (`scoreOf`, `genScore`; the
  sheet's `pctOf_` is a copy, v22). The draw weight of a genus being learned uses 1 − `s.pg` where it used 1 − L.
- **The exam's entry is 0.8, not 0.95**: a moving average sits near the recent success rate, and the game keeps
  everyone near 80-88% right (difficulty targeting), so at 0.95 almost no genus ever reached the exam (table: an
  expert had 0 genera at 95% after 600 questions with A 0.1-0.2). 0.8 of what each answer proved, look-alikes in play,
  is reached by holding up against harder and harder questions; the 5 exam questions then decide, as before.
- **Mastery exam**: from `s.pg` ≥ `PROG.M`, `EXAM.n` = 5 hard questions on the genus alone, unannounced, at least
  `EXAM.gap` = 8 answers apart; all right = Learned. Any miss ends an exam in course (unchanged). **A learned genus
  survives one miss** (`mxKept`: lost below `PROG.M` × (1 − A), i.e. on a second miss before it is back up): a single
  miss takes 15% off, so losing it at once (the BKT rule, under which a miss at L 0.99 left the genus above 0.95)
  took learned genera from a simulated expert at every slip (learned genera lost by an expert in 1000 questions:
  2.5-8.5 depending on A and the entry, 0.5-3.3 with this rule). Progress and mastery never depend on time (rule 12;
  time only plans the questions after a break, "Comeback after a break").
- **Photo difficulty left out** of `w`: simulated as a third factor (0.5 on an easy photo to 1 on a hard one), it only
  slowed everyone (an expert mastered 5 genera in 1000 questions instead of 16), which `A` already sets, and the traps
  already come as a genus's photos get harder (both follow its Elo ability). One factor less (rule 14f). Only the part
  of a right answer that the player's memory of the photo explains is taken off (since 2026-11-03, `pgMemW`: "Photo
  memory", below); a right answer on a photo new to the player keeps its full weight.
- **Progress saved before `s.pg`** (`pgOf`, the same in the app, `core.js` and the sheet): BKT's L is ignored; the
  device holds no answer log, only the last 10 results of each genus (`s.h`), so those are replayed from 0, a right
  answer weighed `PROG.OLD` = 0.67 (what it proved is not known: the middle weight), a miss in full. Simulated (the
  replay against the live value after 1000 questions, genera with 10 answers or more, misses there weighed as right
  answers, so in full a little lower still): +0.03 for a beginner, −0.07 for
  a lecture-level RA, −0.11 a strong RA, −0.21 an expert (weight 1 would overstate a beginner by 0.15); 10 right in a
  row give 0.65, 77% on the bar: no genus enters the exam on old answers alone. A learned genus (`s.mx`) stays learned,
  at the exam's entry. The record is rewritten at the genus's next answer. On the base runs (BKT, 300 questions, 6
  seeds) this recalculation moves the overall %: beginner 21-30% → 23-28%, lecture-level RA 35-41% → 33-37%, strong
  RA 32-53% → 27-44%, expert 65-82% → 45-51%; genera at 95% or more before their exam all drop under it. A fuller
  recalculation for signed-in players could replay their whole answer log from the sheet's Answers tab (mode `|kN`,
  Choices): ROADMAP.
- **Removed**: `BKT` (7 constants), `bktStep`'s guess and slip formula, `bktStart`, the "a miss never raises L" patch,
  the photo familiarity offsets of `answer()` (`bk`: +0.5 for a new photo, −1 for one right twice; the sheet's `stats_`
  keeps its own copy for the photo ratings, `PHOTO_W`). They came back on 2026-11-03 as the photo memory estimated from
  the answers, the same in the sheet and the app ("Photo memory", below).

Simulation (6 seeds: 11, 222, 3333, 44444, 555, 6666; four profiles: a beginner, a lecture-level RA who knows 60% of
the genera, a quarter more half, a strong RA who knows 60% of the genera well, an expert; the scratch harness of
`tests/profiles.smoke.js`, 1000 questions). Means over seeds; each cell: genera at 50% or more / 80% / 95% / learned,
then the overall progress:

| Rule | Profile | after 100 | after 300 | after 600 | after 1000 |
| --- | --- | --- | --- | --- | --- |
| BKT (before) | beginner | 3.2 / 0.2 / 0 / 0, 11% | 10.5 / 1.7 / 0.3 / 0, 27% | 16.3 / 3.8 / 1.2 / 0.2, 40% | 25.3 / 10.3 / 2.8 / 1.3, 60% |
| | lecture RA | 5.3 / 0.8 / 0 / 0, 17% | 16.0 / 5.2 / 1.2 / 0, 39% | 27.7 / 11.8 / 3.8 / 1.2, 62% | 34.8 / 23.2 / 11.8 / 5.3, 79% |
| | strong RA | 6.7 / 1.7 / 0 / 0, 20% | 18.2 / 7.0 / 2.7 / 0.7, 46% | 32.0 / 18.0 / 7.8 / 2.5, 73% | 37.3 / 29.7 / 20.3 / 12.3, 88% |
| | expert | 14.3 / 3.7 / 0.2 / 0, 34% | 32.7 / 20.5 / 6.2 / 0.3, 74% | 38.0 / 32.7 / 24.3 / 10.0, 91% | 39 / 38.3 / 35.2 / 33.0, 98% |
| **A 0.15, entry 0.8 (now)** | beginner | 0.7 / 0 / 0 / 0, 8% | 6.2 / 0.3 / 0 / 0, 19% | 12.5 / 1.3 / 0.3 / 0, 34% | 22.5 / 4.5 / 2.0 / 1.0, 52% |
| | lecture RA | 2.5 / 0.2 / 0 / 0, 13% | 10.7 / 1.7 / 0.3 / 0, 33% | 23.0 / 7.0 / 2.2 / 0.5, 55% | 35.7 / 18.0 / 6.5 / 3.2, 76% |
| | strong RA | 3.2 / 0 / 0 / 0, 17% | 13.7 / 2.2 / 0 / 0, 40% | 28.2 / 11.5 / 2.2 / 0, 63% | 38.2 / 22.3 / 13.8 / 6.0, 82% |
| | expert | 5.0 / 0 / 0 / 0, 22% | 24.5 / 3.7 / 0.3 / 0, 57% | 38.7 / 25.7 / 9.0 / 0.7, 83% | 39 / 34.8 / 27.0 / 16.5, 94% |
| A 0.10, entry 0.8 | expert | 2.7 / 0 / 0 / 0, 18% | 17.8 / 0.3 / 0 / 0, 48% | 37.2 / 13.0 / 0.5 / 0, 72% | 38.7 / 32.7 / 14.2 / 3.2, 89% |
| A 0.20, entry 0.8 | expert | 8.8 / 1.0 / 0 / 0, 26% | 30.0 / 10.0 / 2.7 / 0, 66% | 38.5 / 30.7 / 17.7 / 3.5, 88% | 39 / 37.5 / 29.3 / 25.7, 97% |
| A 0.15, entry 0.85 | expert | 4.0 / 0 / 0 / 0, 22% | 25.5 / 2.2 / 0.2 / 0, 57% | 37.5 / 22.3 / 3.8 / 0.2, 80% | 39 / 34.7 / 19.0 / 9.8, 92% |
| A 0.15, entry 0.95 (first try, a miss weighed w) | expert | 3.7 / 0 / 0 / 0, 19% | 23.3 / 0.7 / 0 / 0, 52% | 38.3 / 11.7 / 0 / 0, 74% | |

Learned genera for the expert over 1500 questions (all 39 met by question 200): BKT 31.7 at 1000, 38.7 at 1500;
A 0.15: 16.3, 35.7; A 0.2: 24.0, 36.3; A 0.1: 4.0, 30.7. A miss at 90% or more on the bar now takes 11-14 points
off (BKT: 3-6).

Right answers to reach the exam's entry (95% on the bar):

- in a row, from 0 (`core.test.js`): 10 against look-alikes among 4 plausible choices (w 1); 16 with 2 plausible
  choices and a look-alike, or 4 without (w 0.67); 32 with 2 plausible choices and no look-alike (w 0.33). BKT: about
  7, 4 from a strong player's start.
- in the simulated games, misses included (mean right answers on the genus before it got there): beginner 29 (19 of
  them on easy 2-choice questions), lecture RA 17, strong RA 16, expert 15 (BKT: 19, 12, 12, 10).
- no genus reached it while 10 genera or fewer were met, nor before being asked beside a look-alike (in any profile or
  seed; `tests/profiles.smoke.js` now checks the second).

Why A 0.15 and the entry at 0.8: A 0.1 matched Pierre's "15-25 informative right answers" in a row (16 against
look-alikes) but left an expert with 4 genera learned after 1000 questions (rule 12: everything in a few hours); A
0.2 is close to BKT for the expert (8 right in a row) and drops 15-17 points on a miss. A 0.15 sits between: 10 in a
row, 15-17 right answers in a real game for players who know their genera, 29 for a beginner, an expert with every
genus at 50%+ by question 600 and nearly all learned by 1500. The entry: 0.85 kept more genera under it (an expert
learned 9.8 genera in 1000 questions instead of 16.5); 0.8 is the success the game aims at, held on questions that
prove something. To recalibrate with real answers: the per-genus success on look-alike questions of
RAs who then pass the exam.

### Typed questions (2026-11-03): why these settings

Recall (typing the genus from memory) instead of recognition (picking 1 of 4): what an RA does in front of a colony,
and the stronger exercise (retrieval practice: Roediger & Karpicke 2006; a desirable difficulty: Bjork 1994), but also
the more discouraging one when the genus is barely known. `model.js` `TYPED`, `core.js` `typedShare`. What each value is
and why; no player has answered a typed question yet: they are Pierre's brief turned into numbers, simulated below
before release:

- **`from` 0.5, `at` [0.5, 0] → [0.8, 0.3] → [0.95, 0.5]** (share of a genus's questions asked typed, from its progress
  as the bar shows it): none until the genus is half-way (below that the player still mostly recognises it with the
  choices' help, and a blank field teaches little); 30% at 80% on the bar, 50% at 95%, the exam's entry (the bar's 95%
  is `PROG.M`), so a genus about to take its exam is asked typed half of the time. Progressive and per genus, never a switch (Pierre: "introduced progressively by level, no
  switch"); a straight line between the points so no step is felt.
- **`exam` 2** typed right answers among the exam's 5: Pierre asked for 2 to 3; 2, the lower bound, until the data say
  typed exam questions are not much harder than picked ones.
- **`k` Infinity** (no guess rate): a name typed from memory is not found by chance, so the expected success has no 1/k
  floor; a right typed answer moves the ability and the photo ratings more than a pick, a miss less, and counts in full
  in the progress (every genus, its look-alikes included, was a possible answer).
- Never typed: comeback, "Again: A or B?" and duel questions (each has its own purpose: a quick check, a contrast).

Simulated before release (`tools/learnsim.js` with a recall learner, kept on its own branch for the dynamic version:
a typed question is answered right with the learner's recognition chance lowered by a recall gap; 30 seeds × 600
questions, the four profiles, the same seeds with and without typed questions). "Default" gap: 2 × (1 − know) logits
(recall close to recognition once a genus is known); "B": 1.5 logits for the beginner and the lecture-level RA, 0.5 for
the strong RA and the expert (recall much weaker than recognition for the weaker players). At 600 questions, without →
default → B (difference ± sd over the seeds where it matters):

| Profile | Progress % (default / B, vs without) | Genera entered in the exam | Genera learned | Typed right % (default / B) |
|---|---|---|---|---|
| beginner | −1 ± 4 / −2 ± 4 | 2.2 → 2.0 → 1.2 (−1.0 ± 1.4) | 0.2 → 0.2 → 0.1 | 90 / 78 |
| lecture-level RA | −0 ± 3 / −2 ± 3 | 4.0 → 3.8 → 2.9 (−1.1 ± 2.3) | 0.3 → 0.4 → 0.2 | 87 / 73 |
| strong RA | −0 ± 3 / −0 ± 3 | 11.2 → 10.9 → 11.0 | 1.4 → 1.7 → 1.5 | 93 / 91 |
| expert | −1 ± 1 / −1 ± 1 | 25.4 → 24.7 → 23.7 | 7.8 → 7.2 → 6.7 | 95 / 93 |

- With the default gap, typed questions change nothing beyond the spread; typed right % stays near picked right %.
- With B, the profiles part ways as Pierre expected: the beginner and the lecture-level RA reach the exam about one genus
  later by question 600 (typed right 71-77% in the 50-95% bands, overall right % down 1 point), the strong RA and the
  expert barely move.
- Typed share of all questions: 4 / 5 / 10 / 18% (beginner → expert); 10-15% of a genus's questions at 50-80%
  progress, about 35% at 80-95%, about 50% from 95%.
- Recall of the genera learned (the hard reference question, typed) does not drop: 0.87 / 0.88 / 0.93 / 0.89 with typed
  questions, 0.80 / 0.87 / 0.90 / 0.89 without. A typed question rarely gives its genus away (a 50% or better chance of
  guessing it from the context in 0.3-2.9% of them, mostly beginners early on).
- Limit: with 2 typed of 5 the exam screens weak recall only a little (few genera are learned by question 600 in the
  weak-recall runs, so this is noisy).

Pierre's decision (2026-11-03): release with these settings ("quickly in production") and adjust on the players' own
`|t` answers (typed right % against picked right % at the same progress). Next: the dynamic version (the typed share
following each player's measured recall, no fixed ramp), its variants simulated with 5 seeds (AGENTS.md 14f). Any change
is recorded here with its numbers.

## Pooled statistics: photo difficulty and confusions (sheet v17-v18, 2026-11-02; photo memory v26, 2026-11-03)

Photo difficulty feeds every player's game (which photos, how hard), and confusions pick the traps. They must reflect
real learners, not bots, random clicks or test runs (17 anonymous "players" turned out to be `tools/perf.js` runs).

- **Who counts** (`trusted_`, `TRUST`): players, signed in or not (v18; v17 left out devices that never signed in),
  with at least 10 answers (per player; a photo counts from its first answer) and a right rate clearly above chance (one-sided z ≥
  1.645 against each question's guess rate), judged on the whole history at each recompute: a beginner who gets out of
  chance then counts with all their answers. Every answer still moves the player's own level.
- **How much an answer weighs** (`PHOTO_W.N`; the sheet also returns the plain count of the answers, v18, which the
  admin's filters use): n / (n + 10) after n answers of the player (n + 30 in v17) (Glicko's idea: an uncertain
  player moves the items little). A beginner's random first answers weigh little, their informed later ones more.
- **Repeats**: every answer counts, against the player's own history with the photo, as in Duolingo's half-life
  regression and PFA. v17-v25: a fixed rule (`PHOTO_W.NEW`, `KNOWN`), a photo new to the player expected 0.5 harder, one
  already right twice 1 easier (the rule the app's BKT used until 2026-11-02), for the photo's step only (the player's
  level ignored it). Since v26 the photo memory is estimated from the answers and used by the app too ("Photo memory",
  below). Counts grow by the weight too (they damp later steps and are the app's confidence in a rating).
- **Everyone starts as a beginner** (`PLAYER0` = −1, about 45% right on an average photo with 4 choices): starting at 0
  (average), a beginner's misses made the photos look harder.
- A corallites hint left closed is not logged with the answer (not seen when answering). Names are matched case-blind.

### Photo memory (sheet v26, 2026-11-03)

Pierre: in a genus with few photos in the game, the same photos come back, players learn the photos rather than the
genus, and that skews both the photo difficulty and the player's progress. The number of game photos differs a lot
from one genus to another (and changes as photos are added): the genera with few photos are where repeats come first.

Measured on about 550 real photo-quiz answers, against the app's logged expectation (Answers column I, which ignored
memory):

| Photo state | Answers | Right | Expected |
| --- | --- | --- | --- |
| never shown to the player | 463 | 83% | 76% |
| shown, never right | 20 | 85% | 72% |
| right once before | 64 | 95% | 76% |
| right twice or more | 9 | 100% | 77% |

22% of the questions of the genera with few photos showed a photo already seen, 6% for the genera with many.
Over a photo new to the player, memory adds about +0.4 logits once shown and +1.4 once answered right (the 9 answers
right twice or more cannot say how much more). The app's expectation ignored it; the sheet's photo rating used a fixed
rule (a photo new to the player 0.5 harder, one right twice 1 easier, nothing for right once), for the photo's step only.

**One rule, measured from the data, in the sheet, the admin and the app** (`core.js` `MEM`, `memBucket`, `memFam`,
`eloReplay`; `Code.gs` `stats_` in step, checked by `tests/core.test.js`):

- **Buckets** of the player's history with a photo, [shown, right] (the sheet's `H`, the app's `s.ps`): new, shown
  never right, right once, right twice or more. A question's offset is the mean over its photos seen when answering (a
  corallites hint left closed is not). Four buckets, not a smooth function of the right count: the data have 9 answers
  beyond right once.
- **New is the reference** (offset 0): a photo's rating is its difficulty for a player meeting it the first time,
  which is what the game targets and what the exam shows. Before, the level step ignored memory while the photo step
  used the fixed rule, so the two pulled the ratings apart; now both move against the same expectation.
- **Estimated in the replay itself**, on the trusted answers weighed by experience as for the photos (`trusted_`,
  `PHOTO_W.N`): after each answer, each offset its photos fall in moves by the surprise (right − expected) over the
  information gathered so far plus the prior's, a Newton step on the log-likelihood (as Glicko moves a rating by what it
  learns over how sure it already is). **Prior**: the old rule as offsets from a new photo, 0 / −0.5 / −0.5 / −1.5
  (`PHOTO_W` kept for that only), weighing `MEM.N` = 10 answers at the game's usual chance (80%, 4 choices). Answers on
  a remembered photo are 90% right or more, where each says little, so the 64 "right once" answers move that bucket
  about two thirds of the way to what they show (N 30: half way). Tried first: Newton passes over the whole log, the
  ratings refitted each time. On simulated logs they needed 10 to 25 passes to converge, the photo ratings absorbing part
  of the offset between passes; the estimate inside the replay matched them in one pass, with no iteration count.
- **Checked on simulated logs** (`tests/core.test.js`; 12 players, 240 photos): a true memory of 0 / −0.4 / −1.5 / −2
  comes out −0.73 / −1.38 / −1.83 from 3,000 answers, −0.36 / −1.43 / −1.82 from 20,000; no memory at all gives
  −0.30 / 0.00 / −0.27. Limit: the "shown never right" bucket picks up about −0.3 of the Elo's own catch-up after a
  miss (a miss leaves the photo rated a little too hard and the player too low, so the next answer on that photo beats
  the expectation), and right twice keeps some of the prior while it has few answers.
- **On the current data** (estimated offline from the table above, every answer of a bucket at its mean expectation,
  shifted so the "new" row fits): about 0 / −0.44 / −1.1 / −1.7 (without the prior: −0.39 / −1.41 / unbounded). The
  sheet computes the real values from every answer and serves them in `?stats=1` (`mem`, with `memn`, the trusted
  answers behind each bucket); the app uses them (`model.js` `PMEM`), the prior with an older sheet or offline.

**In the app** (`quiz.js` `answer`, `model.js` `famOf`, `pgMemW`):

- **The expectation** of a question includes the offset of its photos as the player knew them before answering: the
  ability step and the global level's, the logged `e` (Answers column I, which the sheet's opening hold replays), the
  opening hold itself and the comeback's CUSUM all use it. So a right answer on a known photo raises the ability less,
  and the hold does not count a remembered photo as proof of a good run.
- **A right answer counts in the progress only for what memory does not explain** (`pgMemW`, the mirror of `pgMissW`,
  a ratio of chances like it): its weight is multiplied by the chance the player had on the same photos new over the
  chance they had with their memory, at most 1: the share of such right answers that would have come without the
  memory. A right answer on a new photo keeps its full weight (the photo-difficulty factor on every right answer only
  slowed everyone, above). At the game's target (ability 1 above the photo, 4 choices), with the offsets above: × 0.93
  shown never right, × 0.87 right once, × 0.84 right twice or more; more off where the photo is hard for the player
  (memory lifts a low chance more). Tried first: the room for surprise left, (1 − chance with memory) / (1 − chance
  new), × 0.71 / 0.41 / 0.23. Simulated (below, 30 seeds), it over-corrected: the progress of a learner who remembers
  photos fell 0.1 below that of a learner who does not (memory had lifted it by only 0.03-0.04), and the genera learned
  by question 600 fell by half (expert 7.6 → 3.6, strong RA entering the exam 12.5 → 5.2). Memory adds most where the
  chance is middling, and the app's ability, which under-rates the simulated players, put the chance there, so that
  rule took off far more than memory had added.
- **Misses on a known photo** (thought through as asked): the miss weight is the chance the player really had over the
  chance the game aims for, at most 1 (`pgMissW`, Pierre 2026-11-02: a miss must not cost more than it proves); with
  memory the chance was higher, so a miss on a known photo weighs more than the same miss on a new photo, in full from
  the target down. That is what it proves: the player had been shown the answer on that very photo (after a miss, the
  feedback shows the genus; after a right answer, they had found it) and still missed, which says the genus is not
  held. Lighter (the memory failed, not the genus) was rejected: memory only makes the photo easier, it never makes a
  miss likelier. Heavier than in full was rejected too (the cap stays). In the Elo the miss is a bigger surprise, so the
  ability drops more; over many answers the extra drops balance the smaller rises after right answers on known photos,
  which is what keeps the ability unbiased. The genus wrongly given (rule 13) gets no memory term: the player's memory of
  a photo is of the genus shown, it says nothing about the other one.
- **Spread the repeats** (`photoSet`): in ordinary questions a photo already shown weighs × e^offset of its bucket
  (the odds memory adds to a right answer on it, divided out), × 0.64 / 0.33 / 0.18 with the offsets above (before: × 0.6
  from right twice only, nothing before). A soft factor in the existing targeting, never a filter: a genus whose photos
  are all known still shows them, the least remembered first. The photos never shown keep their bonus (× (1 + 1.5 ×
  recent success), × 1.3 for IMR and Pierre's photos). The targeting distance stays on the photo's difficulty when new:
  aiming at a known photo's lower effective difficulty would hand a struggling player the photos they remember, the
  opposite of the point. Measured in the genera with the fewest photos (2026-11-03; 3 colonies of each tried, 1000
  draws), every photo already shown and right twice but one colony's, shown never right: that colony comes up × 1.45 as often as when all
  are known alike (median; 1.1-2.5), × 1.1 with the old rule (0.9-2.0); a colony never shown × 2.4 (1.3-4.5) against
  × 1.7 (1.3-3.2). The floor of 3 colonies in rotation (`VARIETY`) keeps it from more; `tests/draw.smoke.js` checks
  × 1.25 or more. The exam keeps its own rule (never shown first).
- **Saved progress recalculated once, silently** (Pierre, 2026-11-03: the replay of the real answer log moved the
  bars down 1-3 points, and one player lost Advanced on 2 genera, accepted; no pop-up, no message, an exception to
  AGENTS.md "How to make a change" 12). The device holds no answer log for a signed-in player, only each genus's record,
  so the correction comes from it (`core.js` `memRecalc`): a uniform factor f on the right answers' weights multiplies
  the moving average's balance odds by f, so `pg` becomes f·pg / (f·pg + 1 − pg), f the mean memory weight (`pgMemW` at
  the game's target) of the genus's right answers, read from its photos [shown, right] (`s.ps`: of a photo's r right
  answers in n shows, r / n count as its first show, the rest as repeats in the bucket the photo has now). It never
  raises a bar and leaves a learned genus alone (its exam showed photos never seen). Once per genus record: `s.pm`
  marks it, even when nothing changed, and travels with `s.pg` between devices and accounts (`mergeProgress`,
  `mergeUsers`), so no record is corrected twice; it runs at load and after each pull of the synced progress
  (`model.js` `memRecalcAll`, `sync.js`), and `quiz.js` `answer` marks a record before its first answer under the new
  rule, so a record made since is never corrected. Saved and synced when it changed something; the sheet's leaderboard
  % follows at the player's next sync. Approximate (no order, misses on known photos not redone): on a made-up log
  with 55-60% repeats it took off about half of what the full replay does (72% → 70% where the replay gives 68%); with
  the real repeat rates (6-22%) the difference is about a point. `tools/memreplay.js` prints both, per genus, on the
  real log. Checked by `tests/core.test.js` (once, never raised, learned left alone, the mark through both merges) and
  `tests/draw.smoke.js` (applied once at load, saved, no pop-up, not again at the next answer).
- **What it does to the current players**: `node tools/memreplay.js answers.json [--player id] [--mem ...]` replays
  the admin's answer log (`readAnswers`, saved to a file) under the old rule and the new one: the offsets these answers
  give, how far the photo ratings move, and per player the bar of each genus, their overall % and their opening hold,
  old -> new (each question's difficulty recovered from the expectation and ability the app logged; approximations
  listed at the top of the tool).

**Simulated** (`tools/learnsim.js`, its learner given a photo memory of 0 / +0.4 / +1.5 / +2 logits, "Learning-outcome
simulation" below; 30 seeds × 600 questions, the four usual profiles, the photo stats of 2026-11-03 with the offsets
above as a v26 sheet would serve them, the same seeds in every column). "Without memory" is the learner of before (`--mem
0`): what the app should read when memory explains nothing. Each cell: genera with few photos / with many (the tool's `LEARNER.FEW` and `MANY` thresholds).

Progress bar minus true knowledge, genera met, at question 600 (below 0: the bar under-claims, as it always has):

| Profile | learner without memory, app before | with memory, before | with memory, after | without memory, after |
| --- | --- | --- | --- | --- |
| beginner | −0.25 / −0.23 | −0.22 / −0.19 | −0.27 / −0.24 | −0.30 / −0.24 |
| lecture RA | −0.22 / −0.18 | −0.18 / −0.15 | −0.22 / −0.17 | −0.25 / −0.20 |
| strong RA | −0.13 / −0.12 | −0.10 / −0.09 | −0.14 / −0.11 | −0.15 / −0.13 |
| expert | −0.06 / −0.04 | −0.05 / −0.04 | −0.05 / −0.03 | −0.06 / −0.04 |

Elo ability minus logit(true knowledge), genera met, at question 600 (the Elo under-rates every simulated player,
"Learning-outcome simulation"):

| Profile | without memory, before | with memory, before | with memory, after | without memory, after |
| --- | --- | --- | --- | --- |
| beginner | −1.72 / −1.97 | −1.53 / −1.72 | −1.83 / −2.08 | −2.11 / −2.13 |
| lecture RA | −1.78 / −1.94 | −1.66 / −1.75 | −1.83 / −1.93 | −2.03 / −2.07 |
| strong RA | −1.95 / −2.16 | −1.79 / −2.01 | −2.05 / −2.21 | −2.13 / −2.28 |
| expert | −1.39 / −1.49 | −1.34 / −1.42 | −1.46 / −1.45 | −1.51 / −1.51 |

Questions showing a photo already shown to the player, by question 600 (the right % on those):

| Profile | without memory, before | with memory, before | with memory, after |
| --- | --- | --- | --- |
| beginner | 45 / 40% (92 / 93%) | 42 / 38% (97 / 97%) | 42 / 35% (97 / 97%) |
| lecture RA | 40 / 34% (92 / 95%) | 40 / 33% (97 / 97%) | 36 / 29% (97 / 98%) |
| strong RA | 36 / 26% (95 / 96%) | 35 / 25% (97 / 98%) | 31 / 21% (98 / 98%) |
| expert | 30 / 19% (98 / 97%) | 31 / 18% (100 / 99%) | 27 / 14% (99 / 99%) |

Mastery exam by question 600, per run: genera that entered it, and learned; in brackets their true success then on the
hard reference question (a photo never seen):

| Profile | without memory, before | with memory, before | with memory, after |
| --- | --- | --- | --- |
| beginner, entered / learned | 0.7 / 0.7, 0.0 / 0.1 (0.97) | 0.9 / 0.9, 0.1 / 0.1 (0.89 / 0.83) | 0.6 / 0.7, 0.0 / 0.1 (0.92) |
| lecture RA | 1.0 / 1.4, 0.1 / 0.1 (0.92 / 0.90) | 1.8 / 1.3, 0.2 / 0.2 (0.92 / 0.93) | 0.9 / 1.2, 0.1 / 0.1 (0.93) |
| strong RA | 3.6 / 3.1, 0.3 / 0.5 (0.97) | 4.4 / 3.8, 0.6 / 0.8 (0.95 / 0.97) | 3.0 / 3.4, 0.2 / 0.5 (0.95 / 0.97) |
| expert | 8.5 / 5.9, 2.0 / 2.0 (0.94) | 8.9 / 6.4, 2.5 / 2.4 (0.94) | 8.1 / 6.3, 2.3 / 1.9 (0.94) |

Over the slate, with memory, before → after (mean over the 30 seeds; the learner without memory on the old app in
brackets):

| Profile, question | genera met | learned | progress | true knowledge | right % | entered the exam | true ref. success at entry / learned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner 300 | 35.4 → 29.9 (32.0) | 0 → 0 | 35 → 31% (32) | 0.60 → 0.55 (0.57) | 85 → 87 | 0.2 → 0.0 | - |
| beginner 600 | 40 → 39.8 (40) | 0.2 → 0.2 (0.1) | 65 → 60% (61) | 0.86 → 0.84 (0.85) | 88 → 89 | 2.7 → 2.1 (2.2) | 0.85 → 0.85 / 0.87 → 0.92 |
| lecture RA 300 | 39.2 → 38.3 (39.2) | 0 → 0 | 43 → 41% (42) | 0.74 → 0.73 (0.74) | 85 → 86 | 0.4 → 0.2 | 0.85 → 0.86 / - |
| lecture RA 600 | 40 → 40 | 0.6 → 0.2 (0.3) | 73 → 70% (70) | 0.90 → 0.90 | 91 → 90 | 5.2 → 3.6 (3.9) | 0.87 → 0.88 / 0.92 → 0.93 |
| strong RA 300 | 40 → 40 | 0 → 0 | 54 → 53% (53) | 0.85 → 0.85 | 87 → 88 | 1.0 → 0.6 (1.0) | 0.92 → 0.93 / - |
| strong RA 600 | 40 → 40 | 1.8 → 1.2 (1.3) | 84 → 81% (82) | 0.94 → 0.94 | 94 → 93 | 12.5 → 9.9 (10.2) | 0.92 → 0.93 / 0.96 → 0.97 |
| expert 300 | 40 → 40 | 0.4 → 0.3 (0.5) | 65 → 65% (65) | 0.95 → 0.95 | 96 → 96 | 3.0 → 3.0 (3.3) | 0.92 → 0.92 / 0.93 → 0.93 |
| expert 600 | 40 → 40 | 7.6 → 6.3 (6.3) | 93 → 92% (92) | 0.97 → 0.97 | 98 → 98 | 24.2 → 23.1 (22.4) | 0.92 → 0.92 / 0.94 → 0.94 |

What it says, on this learner:

- **Memory inflated the app's reading before**: the progress by +0.03 to +0.04 over the genera met (expert +0.01),
  the ability by +0.05 to +0.25 logits, and the exam came sooner (strong RA 12.5 genera entered by question 600 against
  10.2 without memory, expert 7.6 learned against 6.3, lecture RA 5.2 / 0.6 against 3.9 / 0.3); a beginner opened
  genera faster (35 met by question 300 against 32), the inflated ability making fewer genera look shaky.
- **After, the progress and the exam match the learner without memory** (within 0.01-0.02 on the bar; exam entries,
  learned genera, overall progress within the spread): memory no longer counts as knowledge, and no one is slowed
  beyond that. The ability goes a little past it, up to 0.11 logits below the reference at question 600 (0.16 for
  the beginner at 300; the Elo step takes the full
  offset; the simulated players' abilities sit far below their truth, where memory seems to add more than it does),
  which also slows the beginner's opening a little (29.9 genera met by question 300 against 32.0).
- **The exam was never fooled**: the true success when learned is the same in every column (0.92-0.97, expert 0.94),
  because the exam shows photos never seen. What memory moved was when genera reached it.
- **Few against many photos**: in this simulation memory inflated the two groups about alike, because its own draws
  repeat photos almost as often in the genera with many photos (38% against 42% for the beginner) as in those with
  few, against 6% and 22% in the real answers (players have answered far fewer questions per genus than 600
  simulated questions over 40 genera). Spreading the repeats lowers them by 3 to 4 points in genera with many photos,
  0 to 4 in those with few (fewer new photos to show there; `tests/draw.smoke.js` checks the effect on one genus).
- **Cost for a player with no memory at all** (last column): the app still takes the measured memory off, so such a
  player's bar sits 0.01-0.05 lower and a beginner meets 27.7 genera by question 300 (32.0); real players do remember,
  which the offsets are measured from.
- **Soundness** (`tests/profiles.smoke.js`, 6 seeds each side): no genus at 95% before being asked beside a
  look-alike, every check passing; beginner genera met at question 100 11.5 → 11.3, expert genera half way at 300
  34.7 → 35.3, lecture RA progress at 300 27.8 → 25.5%. The CI seed's beginner went from 16 genera at question 100 (the
  limit) to 17, so the limit is 17 (one draw, not a faster opening: 30 learnsim seeds give 16.5 → 15.7).

## Considered and not adopted

- **First answer per photo only** (Papoušek 2014): standard for prior knowledge, where people already know the facts.
  Our players learn the corals in the app, so the first answer is the noisiest and later informed ones would be dropped.
  Tried in v17's first draft; Pierre rejected it, replaced by the experience weight and the history-aware repeats.
- **Urnings**: principled standard errors and robustness to adaptive selection; heavier to build and to run in the sheet
  script. To revisit if the photo ratings drift (the variance inflation "Keeping Elo alive" describes).
- **Coded tracks or tiers** (beginner / RA / expert modes, a fixed genus order, fixed difficulty per genus): ruled out by
  Pierre. Every threshold above is continuous or performance-driven.
- **Time criteria** for progress, mastery or ability (response time, spaced-repetition days, decay): ruled out
  (AGENTS.md rule 12). The one exception, time to plan the questions after a break, is the comeback above.

## Simulation (`tests/profiles.smoke.js`, CI)

Three players through the real quiz, 300 questions each (600 in the exploration). The learner model is ours, not the
app's: `know[g]` = chance to recognise genus g on an average photo (beginner 0.02, RA 0.55 on 2 genera in 5 and 0.1
on the others, expert 0.93), lowered on harder photos and single views; otherwise a guess among the plausible choices;
each answer teaches `rate` × (1 − know). The numbers show trends, not real players: recalibrate with real answers.

Until 2026-11-02 the quiz drew from the 39 genera of the IMR slate, and the 6 bonus genera (Millepora, Isopora,
Leptoseris, Heliopora, Sandalolitha, Pleuractis) opened one by one with the progress (at 10%, 15%, ... 35%, `BONUS_AT`)
and kept at most 15% of the draw. The tables below count the 39 (the first table of 2026-11-02 said "45", counting the
bonus genera by mistake). Since then Millepora is a slate genus (40) and the other 5 are opt-in: "Millepora and the
bonus genera" below.

Calibration of `OPEN.K` (Pierre, 2026-11-02: "600 questions and only twenty-some genera open for the RAs may not be
enough"), 600 questions, 3 seeds, genera met (beginner / RA / expert):

| `OPEN` | after 100 | after 300 | after 600 |
| --- | --- | --- | --- |
| K 3, P 0.6 (first) | 12-14 / 9-17 / 25-31 | 14-23 / 18-29 / 34-39 | 26-37 / 26-34 / 39 |
| **K 5, P 0.6** | 9-14 / 14-20 / 21-37 | 19-21 / 27-30 / 39 | 28-29 / 33-39 / 39 |
| **K 5, P 0.6 + online calibration (now)** | 11-15 / 10-15 / 29-31 | 18-25 / 22-23 / 39 | 30-36 / 32-38 / 39 |
| K 5, P 0.5 | 11-15 / 15-28 / 34-35 | 22-30 / 27-34 / 39 | 33-39 / 36-39 / 39 |
| K 6, P 0.5, READY 0.5 | all 39 by question 500 / all 39 by question 200-400 / 39 at 100 | | |
| K 5 + first-meeting cards (EVERY 3) | 12 / 8 / 17 | 15 / 14 / 37 | 25 / 26 / 39 (1 seed; genera asked) |
| **K 6 + first-meeting cards (EVERY 2, now)** | 12-15 / 12-14 / 25 | 18-20 / 17-19 / 39 | 26-28 / 28-35 / 39 (genera asked) |
| K 8 + first-meeting cards (EVERY 2) | 17-18 / 11-17 / 15-25 | 26 / 23 / 39 | 32 / 33 / 39 |

With the cards (2026-11-02) the choices are genera met, so a wrong answer no longer opens a genus never asked (before,
a beginner picking an unknown name as a wrong answer opened it: the earlier rows count those). K 6 brings the RA back
near the pace Pierre asked for while the beginner stays under 16 genera in 100 questions; the expert meets all 39 by
question 200-300 instead of 100 (one card every 2 answers at most). Runs vary by about 5 genera.

The switch to a slope (2026-11-02, Pierre: "35% with no shaky genus and 3% from 6, shouldn't that be better
calibrated? it deserves a test"; and "the simpler the algorithm, the better"). With the switch, a player sitting near
6 shaky genera flipped between 35% and 3% from one answer to the next, so the same player met 8 to 24 genera after 100
questions depending on the draws. Simulated with 6 seeds (11, 222, 3333, 44444, 555, 6666), genera met, mean ± sd
(beginner; weak RA; "lecture" RA, who knows 80% of the genera and a quarter of them only half; expert):

| `OPEN` | after 50 | after 100 | after 200 | after 300 | right at 100 |
| --- | --- | --- | --- | --- | --- |
| switch, K 6 (before) | 12.0 / 11.8 / 12.0 / 15.8 | 14.5±1.4 / 13.8±2.9 / 16.0±7.8 / 22.5±7.0 | 16.3 / 16.0 / 25.3 / 30.8 | 19.8 / 19.3 / 27.5 / 35.5 | 74-88% |
| slope, K 6 | 10.8 / 9.2 / 12.5 / 14.8 | 11.7±0.7 / 11.3±1.4 / 16.7±4.4 / 21.7±3.7 | 14.2 / 14.5 / 23.7 / 31.7 | 17.7 / 17.3 / 28.7 / 35.2 | 75-92% |
| slope, K 9 | 11.7 / 11.7 / 13.5 / 16.2 | 12.7±1.6 / 13.3±2.1 / 19.3±2.8 / 21.7±3.3 | 17.0 / 17.3 / 26.5 / 33.2 | 19.8 / 20.7 / 30.2 / 37.8 | 76-87% |
| slope, K 12 | 11.5 / 12.3 / 14.7 / 15.5 | 14.5±1.0 / 15.7±2.2 / 19.8±2.0 / 25.8±3.8 | 17.3 / 18.7 / 29.2 / 39 | 20.8 / 23.2 / 35.2 / 39 | 72-88% |
| slope, K 15 | 14.5 / 12.7 / 15.8 / 15.3 | 18.7±1.4 / 16.2±1.7 / 23.8±3.1 / 23.8±2.4 | 22.3 / 21.5 / 36.5 / 36.5 | 24.2 / 25.0 / 37.2 / 38.8 | 71-86% |

All rows also have no duel slipped into the quiz when the path opens a genus that question (below). On these data
K 12 kept the beginner where it was (14.5 at 100) and opened faster for those who learn. Then the photo candidates
added on `main` the same day changed the photo ratings the simulation draws on, and the same grid gave:

| `OPEN` (photos of 2026-11-02, after #352) | after 50 | after 100 | after 200 | after 300 | right at 100 |
| --- | --- | --- | --- | --- | --- |
| switch, K 6 (before) | 12.0 / 12.3 / 13.2 / 15.8 | 13.0±2.9 / 13.5±2.3 / 16.5±4.2 / 24.8±6.4 | 16.8 / 17.7 / 21.0 / 32.8 | 19.2 / 20.2 / 24.3 / 36.7 | 76-86% |
| slope, K 8 | 10.2 / 12.0 / 13.5 / 14.0 | 12.8±1.1 / 13.7±0.9 / 20.2±4.1 / 20.5±4.0 | 14.7 / 16.5 / 28.0 / 28.7 | 18.5 / 19.5 / 31.0 / 34.3 | 75-86% |
| **slope, K 10 (now)** | 10.8 / 10.8 / 11.8 / 16.0 | 13.2±1.5 / 12.2±2.0 / 17.3±3.2 / 24.8±3.1 | 17.0 / 16.5 / 25.8 / 38.3 | 20.8 / 20.5 / 29.3 / 39 | 74-86% |
| slope, K 12 | 11.7 / 12.7 / 14.5 / 16.2 | 15.7±1.9 / 15.5±2.9 / 23.3±3.4 / 23.7±2.5 | 18.3 / 19.7 / 33.7 / 36.3 | 23.8 / 23.7 / 37.2 / 39 | 72-84% |

K 12 now opened 16 genera on average to a beginner in 100 questions, at 72% right (18 on the CI seed, over the test's
16), so K 10: the beginner stays at the switch's pace (13.2) with half its spread, the lecture RA meets 29 genera by
question 300 instead of 24, and the expert all 39 by question 200. A change of photos moved the results by about 3
genera: 6 seeds are a minimum, and the order between K 8, 10 and 12 for the RA is within the noise (the independent
review's first point: a simulation over more seeds, ROADMAP). A coupling of the duel rate with the number of shaky
genera was tried as well (3 more settings) and dropped: no gain over the slope alone.

K 5 with P 0.6 is the small step Pierre asked for: the RA opens faster (one genus more every ~15 questions at first),
the beginner stays on about ten genera for the first 100 questions. Lowering P too made the beginner open faster as well (18 genera
in 100 questions in the CI test, which keeps that at 16 at most). Mastery is barely changed: an expert masters
10-17 genera in 600 questions (9-21 with K 3); the first ones come around question 300, after 95% and the 5 exam
questions at least 8 answers apart, so the CI test checked that an expert had genera ready for their exam (95% sure)
after 300 questions, not mastered ones. With the moving average (2026-11-02, above) the first genera reach the exam
around question 400: the test now checks an expert's progress at 300 (genera half way, far ahead of a beginner) and
that no genus reaches 95% before being asked beside a look-alike.

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

### Learning-outcome simulation (`tools/learnsim.js`)

The independent review's first point (docs/reviews/2026-11-02-learning-algorithm-review.md, §3-§4): the profiles test
above measures pacing (genera met, traps, genera ready for their exam) on one seed, not learning. `tools/learnsim.js`
drives the same real quiz (the app's draw, photos, traps, duels, Again, exam, Elo, knowledge model and progress, all
untouched; only the player is simulated) and measures what the simulated players really learn, and how far the app's
estimates are from that truth, as a mean ± sd over many seeds. Not in CI (minutes; numbers for reading).

- **Run**: `node tools/learnsim.js [--seeds 5] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
  [--workers 4] [--out file.json] [--stats stats.json] [--met Acropora,Porites,...] [--mem 0,0.4,1.5,2]
  [--openall offer|N] [--back keep|one]`. Each run (profile × seed) gets a fresh browser context; seeds
  are 1..N, the app's `Math.random` and the learner's own generator both seeded from it, so a run is reproducible and
  the same seeds before and after a change give paired comparisons. `--stats` loads a `?stats=1` answer of the sync
  sheet as the photo ratings (default: none, Pierre's Easy/Medium/Hard sets, as in CI; its `mem`, sheet v26, the app's
  photo memory offsets). `--out` writes every run and
  the summary as JSON. 30 seeds × 4 profiles × 300 questions: about 9 minutes on 4 cores (with the question planner running between answers, as in the app: Codex review #365).
- **Profiles**: beginner (knows every genus at 2%, learns 0.12 of the gap per exposure), lecture-level RA (the profiles
  test's RA: 55% on 2 genera in 5, 10% on the others, 0.12), strong RA (85% on 3 genera in 5, 10% on the others, 0.12),
  expert (93%, 0.05). The open-all offer is declined (the path is what is measured), unless `--openall`: `offer`
  accepts the offer card, N opens all at question N if the offer has not come by then; the back card is then answered
  `--back` (default `keep`); the tool prints, after Open all, the app's expected success against the learner's true
  chance (below).
- **Learner**: `know[g]` = chance to recognise genus g on an average photo with all its views; on a question it
  recognises the genus with σ(logit(know) − photo difficulty − 0.5 if one view alone), photo difficulty from the
  app's `photoDiff`. Not recognised, it picks a choice with weight (1 + 3 × s) × (1 − 0.5 × know of that choice), s = 1
  for the genus shown and min(1, `pooledConf` / `CONF.LOOK`) for another (about 1 for a declared look-alike, 0.1 for an
  unrelated genus): wrong answers fall on look-alikes, an unrecognised photo goes to the right genus about half the
  time among easy choices, a quarter among three look-alikes, and a genus the player knows is ruled out more often.
  After each answer the genus shown gains rate × (1 − know), 1.5 × that after a miss (the side-by-side montage), the
  genus wrongly picked 0.5 × that; a first-meeting card teaches like one answer. No forgetting, except across a break
  (`--breaks`, below).
- **Photo memory** (2026-11-03; `LEARNER.MEM`, `--mem`; `--mem 0` is the learner before): the learner remembers each
  photo it was shown when answering, [shown, right], and recognising gets `MEM` logits more, averaged over the photos
  shown: new 0, shown never right 0.4, right once 1.5, right twice or more 2. Our assumption, close to the real answers
  ("Photo memory" above: right once about +1.4 over a new photo, shown never right +0.4, right twice 9 of 9). Memory
  helps on that photo only: it teaches nothing more about the genus, and the hard reference question (a photo never
  seen) ignores it, so what memory adds to the answers is exactly what the app must not count as knowledge. It does not
  fade across `--breaks` (a limit).
- **Breaks** (`--breaks 10m,30m,1h,3h,8h,3d,1w,1mo [--after 20]`, optional; without it nothing changes): the app runs
  on a virtual clock (10 s an answer); after the first session (`--questions`) the player leaves for each break in turn,
  each from the same state (the generators seeded again per break), forgets, and comes back: the second session runs
  until the comeback is over (questions flagged warm: the comeback, or the gentle restart on an older version, which
  the tool starts at every second session), then `--after` questions more. The learner forgets on the FSRS curve
  towards its starting knowledge (prior knowledge stays): know' = k0 + (know − k0)(1 + 19/81 · t / S)^−0.5, S =
  `LEARNER.S0` 2 days × `LEARNER.G` 2.5 for each further day the genus was answered right (our learner; the app reads S
  from the Elo ability). Measured per profile and break: the comeback's length (median, quartiles, range), the answers
  with no genus opening, the success during the comeback and in the `--after` questions after it, how often the
  opening hold was on during them, the app's rust at the first question back and the learner's true loss.
- **Measures** at questions 50, 100, 200, 300: true mean `know` over the slate genera (`knowSlate`: 40 with Millepora
  since 2026-11-02; `know39` before) and over the genera met; the
  Elo estimate against the truth, |θ − logit(know)| and its sign, over the genera met; the progress bar against the
  truth, genScore − know over the genera met (below 0: it under-claims), and `progPct`; genera met, learned (`s.mx`),
  right % since the previous checkpoint; the true chance to tell each declared look-alike pair apart (2 choices,
  average photo, both ways); genera whose true success on a **hard reference question** (one photo alone, difficulty
  +1 plus the single view's 0.5, 4 choices: the genus and its 3 most confusable slate genera) is 0.9 or more; genera that
  entered the mastery exam (`examOn`, first time), and their true reference success at that moment and when learned.
  Per run, the question at which each genus was first met (`metAt`), printed as the median per profile for the genera
  of `--met` (default the five most common at Dauin; a run where it was not met counts as later than the last question).
  **By photo count** (photo memory): the slate genera with few game photos (at most `LEARNER.FEW`) against those with
  many (at least `MANY`), at each checkpoint: the questions so far showing a photo
  the learner had already been shown, the right % on all and on those repeats, progress minus know and θ − logit(know)
  over the genera met, genera learned; and, pooled over the runs, the genera that entered the exam or were learned, their
  true reference success then and the median question.
- **Limits**: the learner is ours, a few round numbers, not fitted to real answers; the photo difficulty it meets is the
  app's own estimate (so photo calibration cannot be judged); learning is per genus only (a duel or a montage teaches
  the two genera, not the pair as such); no forgetting (except across `--breaks`), no fatigue; the RA profiles know a fixed set of genera (every
  5th genus in data.json order), so the spread is that of the draws, not of who knows what. θ is clamped to
  `ELO.lo`..`hi` (−1.5..3), so a genus known at 2% always shows an error of about 2.4 there. Since the learner's
  guesses beat 1 in k (choices from other growth forms are ruled out), a θ that fits its answers would sit a little
  above logit(know): a negative θ − logit(know) is an under-estimate, not an artefact.

Baseline on `main` of 2026-11-02 (BKT knowledge, before the progress formula change), 30 seeds, 300 questions, no
`--stats`, mean ± sd over the seeds (ref@exam: mean over the runs where a genus entered the exam, their number in
brackets). 120 runs in 237 s on 4 cores.

| Profile, question | know39 | knowMet | \|θ − logit k\| | θ − logit k | genScore − know | met | learned | right % | look-alike | ref ≥ 0.9 | entered exam | ref at entry | ref when learned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner 100 | 0.25±0.01 | 0.62±0.04 | 1.38±0.21 | −0.82±0.42 | −0.22±0.07 | 15.2±1.6 | 0 | 83±5 | 0.65±0.01 | 0 | 0 | - | - |
| beginner 300 | 0.54±0.04 | 0.72±0.05 | 1.62±0.21 | −1.27±0.33 | −0.22±0.05 | 29.0±3.6 | 0 | 83±4 | 0.81±0.02 | 0.5±0.6 | 0.7±0.8 | 0.67±0.09 (17) | - |
| lecture RA 100 | 0.47±0.02 | 0.67±0.04 | 1.15±0.17 | −0.73±0.34 | −0.26±0.08 | 18.8±2.4 | 0 | 83±6 | 0.77±0.01 | 0 | 0.3±0.6 | 0.68±0.03 (8) | - |
| lecture RA 300 | 0.71±0.03 | 0.75±0.02 | 1.41±0.21 | −1.15±0.24 | −0.23±0.05 | 35.7±3.9 | 0.2±0.4 | 85±3 | 0.89±0.01 | 0.7±1.1 | 1.8±1.4 | 0.69±0.06 (26) | 0.82±0.04 (5) |
| strong RA 100 | 0.68±0.02 | 0.78±0.03 | 1.49±0.14 | −1.02±0.25 | −0.29±0.08 | 21.7±3.0 | 0 | 84±4 | 0.88±0.01 | 1.3±1.0 | 0.9±0.9 | 0.80±0.12 (18) | - |
| strong RA 300 | 0.85±0.01 | 0.85±0.02 | 1.59±0.16 | −1.42±0.23 | −0.16±0.06 | 38.8±1.3 | 0.6±0.8 | 89±3 | 0.95±0.01 | 5.8±1.4 | 5.5±2.4 | 0.84±0.05 (30) | 0.93±0.05 (15) |
| expert 100 | 0.94±0.00 | 0.95±0.00 | 1.39±0.13 | −1.39±0.13 | −0.19±0.03 | 21.1±1.5 | 0.1±0.3 | 97±3 | 0.98±0.00 | 3.5±1.1 | 4.7±1.8 | 0.89±0.00 (30) | 0.91±0.00 (2) |
| expert 300 | 0.95±0.00 | 0.95±0.00 | 1.30±0.10 | −1.30±0.10 | −0.03±0.02 | 39.0±0.0 | 6.1±2.5 | 96±2 | 0.98±0.00 | 12.6±1.8 | 23.4±2.5 | 0.89±0.00 (30) | 0.91±0.00 (30) |

What it says, on this learner: the Elo ability under-estimates every profile by 0.8 to 1.5 logits and the gap does not
close in 300 questions (so the photos stay easy: an expert answers 96% right, not 80%); the progress bar under-claims
by about 0.2 for the learners; a beginner's or lecture RA's genus enters the mastery exam (BKT 95%) while its true
success on a hard reference question is only about 0.7, an expert's about 0.9 (the review's item 2 asks for ≥ 0.85);
the exam then keeps the genera learned at 0.82-0.93 true reference success.

#### Open all: the app's expectation against the truth (measured 2026-11-03, no change made)

Why: the player of "Back to one at a time" (above) was expected 0.70-0.88 on the genera opened at once and got 62%.
A genus never answered starts from the player's global level (`core.js` `playerStart`: `START.W` 0.8 × the global
Elo, shrunk while the answers are few), and a player who earns the offer has a high global level from the genera met
one at a time. Measured with `node tools/learnsim.js --seeds 5 --questions 300 --openall 52` (seeds 1-5, no
`--stats`; the offer accepted at answer 50-51 when the level allowed it, else Open all forced at 51; about 28-29 genera
at once). Means over the pooled answers: e the app's expected success logged with the answer, p the learner's true
chance on that question, ok its answers.

| Profile | first question on a genus opened at once: e / p / ok | first 30 answers after Open all, genera opened at once: e / p (e − p) | same, genera met before: e / p (e − p) | back card (Keep them all) |
| --- | --- | --- | --- | --- |
| beginner (Open all forced) | 0.74 / 0.56 / 0.47 | 0.74 / 0.60 (+0.13) | 0.74 / 0.81 (−0.08) | 5 of 5 runs, answers 10-19 after Open all |
| lecture-level RA | 0.78 / 0.64 / 0.69 | 0.78 / 0.65 (+0.12) | 0.74 / 0.84 (−0.09) | 2 of 5, answers 26 and 66 |
| strong RA | 0.81 / 0.76 / 0.79 | 0.81 / 0.75 (+0.05) | 0.79 / 0.91 (−0.12) | 0 of 5 |
| expert | 0.86 / 0.95 / 0.93 | 0.85 / 0.95 (−0.11) | 0.82 / 0.96 (−0.15) | 0 of 5 |

What it says: the starting ability over-estimates the genera opened at once for a lecture-level RA by about 0.14 at
their first question (0.78 expected, 0.64 true; 13-15 points) and 0.12 over the first 30 answers, for a beginner by
0.13-0.18, a strong RA by 0.04-0.05; an expert is under-estimated (−0.10), as are the genera already met for everyone
(−0.08 to −0.15, the Elo's usual lag on this learner). The global level is earned on the genera met first (the
easiest and most common, opened by the path), so 0.8 of it carries too much to the harder genera that come at once;
the real player's drop (0.70-0.88 expected, 62% right) is of the same size as the lecture-level RA's. Kept as it is
(Pierre's brief: measure, do not change); the back card catches the players for whom it matters. With `--back one`
(the card answered One at a time), the lecture-level RA ends at 38 genera met and true slate knowledge 0.72 ± 0.05 at
question 300 (Keep them all: 40, 0.75 ± 0.01), and the beginner who opened all at 51 at 17 genera met, 0.42 ± 0.08
(Keep: 40, 0.66 ± 0.01, right 86% against 92%): this learner learns from every question and never gives up, so
seeing more genera always teaches it more; what the card guards against, a player who quits when it gets too hard,
is not in the simulation.

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
- 2026-11-02, Pierre (beginner RA review): first-meeting cards, kinder first My progress, plain words, a bar under
  "Loading…" (above and ARCHITECTURE); ★ genera stay in from the start, being there for comparison. Then: 4 cards to
  start and questions among those, new genera one at a time, never asked right after their card; `OPEN.K` 5 → 6 to
  keep the RA's pace (table above). For the RAs, a button opens all genera at once (on the first cards and in My
  progress), and a card offers it after about 50 answers at a high level; all of it synced.
- 2026-11-02, Pierre: OK to seed the photos nobody has answered into the games to calibrate them (`CAL`, above).
- 2026-11-02, Pierre: relax the arbitrary thresholds so new photos come in quickly (he is validating many candidates)
  and their answers inform the dynamic algorithm: games take every kept photo (no cap of 4 Medium / 4 Hard), and a
  photo with few answers gets a wider targeting (`CAL.U`). Three seeds vary by ±5 genera at a given question count:
  the opening table moved within that noise (a run without `CAL.U` gave the RA 19-21 genera at question 300).
- 2026-11-02, Pierre: the opening as a slope rather than a switch, `OPEN.K` 6 → 10 (tables above), and no duel slipped
  into the quiz on a question that opens a genus. No setting added: "the simpler the algorithm, the better; rethink or
  recalibrate the existing variables rather than add one to patch a problem". K 12 on the first grid, 10 once the
  new photos were in. An independent review of the algorithm against the literature (Pelánek, Papoušek, Duolingo,
  BKT, interleaving) is done (ROADMAP, "To discuss") and may revisit this.
- 2026-11-02, Pierre: the progress % climbed far too fast and a right answer among a few genera counted almost as much
  as one against the genus's look-alikes. Agreed: a moving average weighed by what each answer proves, simulated first
  (6 seeds, 4 profiles, up to 1500 questions). BKT dropped; `PROG` A 0.15, exam entry 0.8 shown as 95%, look-alike
  factor 0.5, misses in full, a learned genus survives one miss; old progress recomputed from its last 10 results
  ("Progress (moving average) and mastery"). Sheet v22 computes the leaderboard % the same way. A pop-up announcing the
  recalculation to the players is not built yet (ROADMAP).
- 2026-11-02, Pierre: *Millepora* joins the slate (on the IMR benthic slate; the progress goes over 40 genera, announced
  with a second `RECALC` note); the other bonus genera become opt-in, offered once every slate genus has been asked, and open
  like slate genera, without their thresholds, weight cap or share limit ("Millepora and the bonus genera").
- 2026-11-02, Pierre: the fixed gentle restart (10 easy questions at every visit, left out of the hold) becomes a
  comeback planned from the time away (FSRS forgetting curve, stability from how solid each genus is and the days it
  was answered right), ended by the answers (a CUSUM), with no cap or duration threshold; time is used for that only
  (AGENTS.md rule 12 exception), progress, mastery and ability never decay. Then: a new visit (30 minutes without an
  answer, the web-analytics session timeout) opens no genus in its first 10 answers, comeback or not; the comeback's
  answers feed the opening hold with the expectation they really had (logged `|c`, not left out like `|w`).
- 2026-11-03, Pierre: open the genera "easy and common first": `cm` from iNaturalist near Dauin (geometric mean of
  observations and observers, `tools/commonness.py`), one factor √((1 + cm) / (1 + median)) on the opening weight, no new
  constant ("Common first").
- 2026-11-03, Pierre: photo memory, points 1 and 2 of the proposal ("Photo memory"): one rule in the sheet (v26) and
  the app, estimated from the trusted answers with the old fixed rule as prior; the app's expectation includes it, a
  right answer on a known photo counts in the progress only for what memory does not explain (a ratio of chances, after
  the room-for-surprise version over-corrected in the simulation), misses weigh the chance the player had; ordinary
  questions weigh a photo already shown e^offset. Point 3 (more photos for the thinnest genera) stays with Pierre.
  Then, after the replay of the real log (bars down 1-3 points): everyone's saved progress recalculated once, silently.
- 2026-11-03, Pierre: after Open all, offer once to go back to one at a time when the answers fall clearly below
  expectation (a player at 90% on 13 genera fell to 62% on the ~27 opened at once): the opening hold's CUSUM counted
  from Open all, due at 2 × `INTRO.HOLD`, no answer count and no new constant (a replay of the answers: at the 21st
  after Open all; 30 answers + the hold would have come 4 answers before the player quit); One at a time closes every genus
  opened at once, answered or not, until its card reopens it, answers and progress kept ("First meeting with a genus").
  The starting ability of those genera measured, not changed ("Open all: the app's expectation against the truth").
- 2026-11-03, review item 7 (Pierre: do the review's simplifications still relevant): one contrast queue for the
  Again and the duels slipped into the quiz, `CONTRAST` {P 0.1, GAP 2} instead of `AUTO_DUEL` {P, FROM, GAP, AGAIN,
  SAME}; duels from the first answers ("One contrast queue").
- 2026-11-03, review item 8 (first half, Pierre the same day): one draw weight, `drawW` = 1 − x · c from the Elo's
  chance and its uncertainty, instead of the status weights; "Review" = shaky instead of 2 misses in the last 5. The
  wrong-pick update stayed (rule 13; its weight recalibrated in the next entry, which removed its Elo step) ("One draw
  weight").
- 2026-11-03, review item 4: one difficulty controller, the photo aimed so every question is right with the chance
  `PICKD.P` 0.8 in its format (`aimOff(k)`, typed included), the traps and single views on one schedule (`FORMAT`);
  `TARGET_OFF`, `TRAP` and `singleP`'s ramp removed ("One difficulty controller").
- 2026-11-03, review item 6: one opening rule, a card with the chance 1 − shaky / `OPEN.K` when the path allows one
  (`openChance`, `openPick`); `OPEN.READY`, `OPEN.TRICKLE` and the share of the draw removed; `OPEN.K` 10 → 8 ("One
  opening rule").
- 2026-11-03, Pierre: the app under-estimates strong players; the principle that a confusion affects both genera stays,
  its weight follows standard practice. The genus wrongly given no longer gets an Elo step (it counts in its progress,
  recent results and runs, as before), as in the Elo learner models of adaptive practice (Pelánek et al. 2017); on the
  real answers the next answer is predicted better (log-loss 0.481 → 0.465) and a strong RA's genera move from 0.11 to
  0.59 (fit 0.73); simulated, the error of the ability falls for every profile ("The genus wrongly given in the Elo").
- 2026-11-03, Pierre (strong players remain the priority): a genus moves with the global level since its own last
  step, weighed by its own uncertainty, both ways, and the level's step loses its `kmin` floor (Pelánek et al. 2017's
  global + concept skill). Real answers: log-loss 0.465 → 0.457, strong players' band −0.021; simulated, strong players
  recognised sooner and a beginner not over-rated. A one-way version (rises only) was rejected: biased upward ("Global
  level and genus").
- 2026-11-03, Pierre (22 genera by question 100 too many for a beginner; aim a beginner at about 85%): the success
  aimed for follows the global level, `PICKD.AIM` 85% up to 0.5 → 75% from 1.5, a straight line between; a genus is
  shaky against the same target (OPEN.P + aimed − 0.8). Simulated: the beginner back to `main`'s pace (20.2 / 28.0
  genera by questions 100 / 200), not over-rated, the strong players' gains kept; the opening's capacity by level and a
  sign gate on the level's move measured, not adopted ("Beginners and experts").

- 2026-11-03, Pierre (for everyone): a ★ genus opens only after the genus its card compares it to has been met (a
  beginner met *Duncanopsammia* and *Cyphastrea* before *Turbinaria* and *Astreopora*): the references read from the data
  (`core.js` `starRefs`, the genera of the card's "★ look-alike of …" line), a weight of 0 in the opening draw until
  they are met, Open all unchanged, no new constant ("Starred genera after their reference").
- 2026-11-03, Pierre: a custom quiz, the photo quiz on the genera the player picks: the genus asked drawn among them by
  the usual weights with no opening path (a genus not met yet is asked with its card), the choices from them first
  (the trap rules inside the selection), topped up from the slate only under 4 genera; every answer counts as a
  photo-quiz answer, logged `quiz|s…` ("Custom quiz: the photo quiz on the genera the player picks").

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
- Pelánek, R., Řihák, J. (2017). Experimental analysis of mastery learning criteria. *UMAP 2017*; Pelánek, R., Řihák, J.
  (2018). Analysis and design of mastery learning criteria. *New Review of Hypermedia and Multimedia* 24.
- Hofman, A. et al. (2020). Tracking with (un)certainty. *Journal of Intelligence* 8.
  <https://dspace.library.uu.nl/bitstream/1874/396191/1/jintelligence_08_00010_v2.pdf>; Bolsinova, M. et al. (2022).
  Urnings: a new method for tracking dynamically changing parameters in paired comparison systems.
- Doebler, P., Alavash, M., Giessing, C. (2014). Adaptive experiments with a multivariate Elo-type algorithm. *Behavior
  Research Methods* 47.
- Bock, R. D. (1972). Estimating item parameters and latent ability when responses are scored in two or more nominal
  categories. *Psychometrika* 37, 29-51. Thissen, D., Steinberg, L. (1984). A response model for multiple choice items.
  *Psychometrika* 49.
- Ghosh, A., Raspat, J., Lan, A. (2021). Option tracing: beyond correctness analysis in knowledge tracing. *AIED 2021*.
  <https://arxiv.org/abs/2104.09043>
- Bolsinova, M. et al. (2025). Keeping Elo alive. *British Journal of Mathematical and Statistical Psychology*.
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12784335/>
