# Learning model: research and choices

How the app decides what to ask, how hard, and when a genus counts as learned; and how the shared statistics rate the
photos. Each choice says where it comes from: published work, Pierre's decisions, or our own measurements (the
three-player simulation, `tests/profiles.smoke.js`). Keep this file in step with the code: a constant changed here is
changed there, with the reason.

Code: `model.js` (the player's own model, in the browser; `app.js` before 2026-11-02), `core.js` (shared helpers, also run by the admin), the sync
sheet script `tools/sync/Code.gs` (statistics pooled over every player, `stats_`). ARCHITECTURE.md describes the code;
this file explains why it works that way.

## What each number measures (read this first)

Pierre, 2026-11-12, after two agents read a player's success rate as their level: what each figure of the game and of
the answer log says, and what it never says. Any analysis of players (rule L12) starts from here.

- **Success rate** (right %, over any window): **not a level.** The engine holds it near its aim on purpose: each
  question's format and photo are chosen so its expected success hits the aim (the difficulty controller, "One
  difficulty controller" below), and the aim follows the global level, 85% up to a level of 0.5, 75% from 1.5
  (`core.js` `AIM`, `aimOf`; `TARGET_P` 0.8 the reference; "Beginners and experts"). A beginner and an expert both sit
  around 75-85%, the expert slightly **lower** by design. A success rate far from the aim says the questions are not
  as hard as the model thinks for this player right now (new units, a break, a look-alike family), never who is weak
  or strong.
- **Expected success** (`e` per answer, the answer log's Expected): the model's chance that this answer is right,
  from the genus ability, the photo's difficulty, the format and the mix-ups. **Right − expected** (the surprise,
  overall or over a window) is the figure that compares players and moments: below 0, the model is too optimistic.
- **The player's level**: the **global level** `P['~level'].th` (an Elo on the photo-difficulty scale, 0 = an average
  photo; shown as 1000 + 200 × th once `ELO_MIN` = 200 answers are in: "Ability per genus (Elo) and the global level").
  Simulated at 50 answers: a beginner about −0.9, an RA who knows 60% of the genera −0.2, 80% +0.8, an expert +1.2
  ("The first-launch question"). The sheet keeps its own chain `R` (the admin's level, the photo ratings' player term).
  Read a player's level from the global level **at that moment** (the log's answers replayed, as `tools/learnsim.js`
  and the full replay do), and from their **progress**, never from their success rate. **The Elo is not settled before
  many answers** (Pierre, 2026-11-12; "even 50 is not enough to settle the score", 2026-11-01): the game shows it only
  from `ELO_MIN` = 200 answers, and a level read earlier (or on a player back from a break, or right after many new
  units) is a rough guess: say how many answers it rests on, and lean on progress there. A rule keyed on the level
  (a threshold) must say what it does before the level is settled.
- **Ability per unit** (`P[genus].th`): the same Elo, per genus or family; a unit never answered starts from the
  global level (`playerStart`).
- **Progress**: per unit, the domain-score bar (the share of all its photos the player would name, one photo alone,
  from their own answers on it: "The domain-score bar"); the subject's % and score from the bars; units met and
  opened. With the global level, the only measure of how far a player has come.
- **Difficulty of a photo**: its rating in the sheet's photo Elo (`stats_`, pooled over every player), around its
  genus offset `gd` (**one genus difficulty**: "One genus difficulty"); a question's difficulty adds the photo memory,
  the mix-ups term and the format's offset (Q138). The success of one player on a photo says little about its
  difficulty alone: it depends on that player's level.
- **Shaky** (a unit holding new openings): its expected success on a typical photo of it is under `OPEN.P` (0.6),
  moved with the aim ("One opening rule"). It reads the ability and the genus offset, not the success rate. From 200
  answers (`OPEN.STUCK_FROM`), a unit still shaky after 10 of its own answers (`OPEN.STUCK`) stays shaky but holds no
  new opening ("A unit stuck shaky").

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
- **One player level shown** (Pierre, 2026-11-06, Q134; the engine coherence review's F4): the global level is the only
  level players see, as an Elo (`progress.js` `eloScore` = 1000 + 200 × th, from `ELO_MIN` = 200 answers of its record):
  My progress, the leaderboard (`Code.gs` `board_` reads `~level` from each player's saved progress, sheet v63; from
  v118, for a player whose copy is behind the rules, the replayed level their app will adopt, rule D8; the player's own
  row shows the device's level) and the Elo achievements. The header shows progress, not a level. The
  sheet's own chain `stats_` `R` (start `PLAYER0` −1, K 0.6 / (1 + n/40), no answer time, no mix-up term, no start prior)
  stays internal: it is the player term of the photo Elo (the expectation that rates the photos, their genus offsets and
  the photo memory) and the admin's level (`ras`, with `levelMargin`'s 95% margin; also the only level of a device that
  never signed in). Until v63 the board showed `R`, so My progress changed number when the board loaded.
- **The genus wrongly given** (rule L2) counts in its progress, its recent results and its runs, not in its Elo ability
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
recognising B photos. That information is kept where it belongs: in B's progress (rule L2: the pick counts as a miss
for B, weighed by `pgMissW`, so B cannot be learned on that run), in the pair's confusion (the player's own `s.conf` and
the pooled scores: the pair comes back as traps, look-alike duels and "Again: A or B?"), and in A's ability (the miss
on A). The data agree: on the real answers, the first question on a genus right after it was given wrongly for
another genus (141 answers) was answered right 81% of the time; with the old step the app expected 0.72 (log-loss
0.494), without it 0.81 (0.466). A false alarm on B did not make the next B photo harder for the player. Over every
genus the prediction improves too (log-loss 0.481 → 0.465, table below). A pair-level term (the chance on A lowered
when a genus the player confuses with A is among the choices) is the principled home for "they confuse A and B":
measured the same day, it predicts nothing more ("Second phase", below).

So no standard model penalises the chosen distractor's own knowledge with a miss. The confusion itself is kept where
those systems keep it, on the pair: the player's own mix-ups (`s.conf`) bring the pair back as traps, duels and
"Again: A or B?", and the pooled confusions pick the traps (rule L7). Rule L2 stays: a wrong answer counts against
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

### Second phase: the pair term, the 2-choice guess, the success target (2026-11-03, measured, nothing changed then)

Pierre, after the fix above: study, on the real answers and in the simulation (rule L12), (a) a pair-level
confusion term, the principled home for "picking B says something"; (b) a hierarchical ability, genus = global level +
offset; (c) a guess on 2-choice questions that lets the player rule out the names they know; (d) a success target that
depends on the level; (e) a short placement phase for a new player. Measured on that day's rules (before "Global level
and genus", the level-dependent target `AIM` and the answer-time weight of #444); the study's `tools/abilityeval.js`
options (P\<λ\>, X, h) and its `tools/learnsim.js` runs are in commit `7a4ccae` (branch `calib-study`), not on `main`.
What the later rules changed: (b) and (d) were adopted afterwards in other forms ("Global level and genus"; "The success
aimed for follows the global level"); (a), (c) and (e) were not, for the reasons below.

**What the literature says about the success target** (checked at the sources, 2026-11-03):

- Wilson, Shenhav, Straccia & Cohen (2019), "The Eighty Five Percent Rule for optimal learning", *Nature
  Communications* 10:4646: for learning by gradient descent on a binary classification with Gaussian noise, the optimal
  training error rate is 15.87%, accuracy about 85%. Shown on artificial neural networks and a model of perceptual
  learning, not on classroom or fact learning.
- Papoušek, Stanislav & Pelánek (ITS 2016; FI MU report FIMU-RS-2016-02), the geography system: target error rates 5,
  20, 35 and 50% (success 95, 80, 65, 50%). Easier questions kept more learners in the short term, harder ones brought
  more of them back and more learning (the main difference between the easiest condition and the others); survival
  after 100 answers 26.0-26.5% in every condition; most learners rated the difficulty "appropriate" at about 30% of
  their own answers wrong. Their conclusion: "start with easy questions to hook learners up and then switch to more
  difficult questions".
- Pelánek et al. (UMUAI 2017): 50% gives the most information about a learner, "however, a 50% success rate is rather
  low and for many learners it could decrease their motivation"; their system aims at 75%. They cite Jansen et al.
  (2013, Math Garden): targets 60, 75 and 90%, the easiest giving the best learning, through more problems solved.
- Duolingo publishes no target success rate (the Birdbrain post and the IEEE Spectrum article give none; "about 80%"
  appears only in unsourced secondary sites).
- Why it matters here: the Fisher information of an answer, ((1 − g) σ (1 − σ))² / (P (1 − P)), is largest near 50%
  (a little higher with a guess rate), so at the app's 80% a right answer moves the ability little: one reason strong
  players are recognised slowly.

**On the real answers** (`tools/abilityeval.js`, same log and players as above; P*λ*: the pair term, the question on A
made harder by λ × the player's own mix-up rate with the most confused genus among the choices, mixed up / (offered + 8);
X: the guess counts the names the player can rule out, each wrong choice ruled out with σ(θ_j − d); h: level + offset with
rule e). Mean predicted / right, log-loss:

| Rule | log-loss | 2 choices (727) | 4 choices (451) | level < 0 (203) | level ≥ 0.75 (617) | after a false alarm (141) |
| --- | --- | --- | --- | --- | --- | --- |
| e (that day) | 0.465 | 0.80 / 0.87, 0.412 | 0.77 / 0.78, 0.551 | 0.74 / 0.83, 0.470 | 0.81 / 0.86, 0.429 | 0.81 / 0.81, 0.466 |
| h | **0.458** | 0.81 / 0.87, 0.410 | 0.79 / 0.78, 0.535 | 0.72 / 0.83, 0.490 | 0.84 / 0.86, 0.408 | 0.80 / 0.81, 0.488 |
| e + P1 | 0.465 | 0.79 / 0.87, 0.412 | 0.77 / 0.78, 0.549 | 0.74 / 0.83, 0.470 | 0.81 / 0.86, 0.429 | 0.80 / 0.81, 0.465 |
| e + P2 | 0.466 | 0.79 / 0.87, 0.414 | 0.77 / 0.78, 0.548 | 0.73 / 0.83, 0.471 | 0.80 / 0.86, 0.430 | 0.80 / 0.81, 0.464 |
| e + P4 | 0.467 | 0.78 / 0.87, 0.417 | 0.76 / 0.78, 0.547 | 0.73 / 0.83, 0.473 | 0.80 / 0.86, 0.431 | 0.78 / 0.81, 0.465 |
| e + X | 0.465 | 0.87 / 0.87, 0.402 | 0.81 / 0.78, 0.565 | 0.80 / 0.83, 0.444 | 0.86 / 0.86, 0.432 | 0.86 / 0.81, 0.474 |
| h + X | 0.470 | 0.88 / 0.87, 0.410 | 0.84 / 0.78, 0.566 | 0.77 / 0.83, 0.460 | 0.90 / 0.86, 0.428 | 0.85 / 0.81, 0.501 |

- **(a) The pair term predicts nothing more** (0.465-0.467 for λ 1-4): on these answers, a genus the player has mixed
  up with A among the choices does not make A's question harder than its ability and photo already say. The mix-ups
  are already used where they help (traps, duels, Again); no term is needed in the ability.
- **(b) Level + offset** (h) predicted best overall (0.458) and for strong players, worse under 0 and after a false
  alarm: adopted later the same day in a different form, the global level's move weighted by the genus's own
  uncertainty ("Global level and genus", below).
- **(c) Ruling out known names** calibrates the 2-choice questions (0.87 / 0.87; the Duel tab 0.91 / 0.93) and the
  players under 0, but over-predicts the 4-choice questions (0.81 / 0.78): overall no better. And it credits the right
  answers to the ruling out, so the abilities fall (the strong RA's genera 0.59 → 0.23): the opposite of the goal. A
  guess between 1/k and this (players rule out some names, not all they know) may fit both; not tried (it needs a
  constant).
- **(e) A placement phase** (the first 20 answers aimed at 65%, then 80%) changed nothing in the simulation
  (`tools/learnsim.js`, 5 seeds × 600 questions) after the
  first 50 questions (strong RA |θ − logit k| 1.32 against 1.30 at question 300): 20 answers are too few for the genus
  abilities, which start from the level anyway.
- **(d) A level-dependent target**, as tried that day (85% at a level of 0 down to 72% at 1.5, alone), changed nothing
  beyond the spread; the rule adopted later moves the shaky bar and the photo's aim with it ("The success aimed for
  follows the global level").

### Global level and genus (2026-11-03)

Pierre: strong players must find the app challenging quickly (IMR staff will try it once), and beginners must not be
overwhelmed. After the fix above, the genus abilities of strong players still sat 0.3-0.6 below the static fit of
their answers, while their global level was about right: each genus learns only from its own answers, a few dozen at
most, through an Elo that lags. The global level pools every answer.

**The rule** (`core.js` `abilityOf`, `levelMove`, `eloStep`, which `model.js` `ability` and `abilityStep` call and
the sheet's full replay runs the same way, `tests/replay.test.js`): the ability of a genus already answered is its own
estimate plus the global level's move since its own last step,

  θ_g = s.th + (L − s.lt) / (1 + answers_g / `ELO.n`),

`s.lt` the level as it stood after the genus's last answer (since rules version 7, "One surprise, counted once" below;
before, the level before that answer's own step on it; saved and merged with `th`, `core.js` `mergeProgress`; dropped when
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
version (rule D4). The Answers log's ability column is the ability the app used (with the level's move), so the
logged expectation and the sheet's opening hold stay consistent. The admin's per-genus abilities (`readStats`, from
the saved `th`) show each genus's own estimate without the level's move since its last answer: a little behind for a
player whose level is still rising (ROADMAP). `replayProgress` (PR #399, not merged) replays progress, not the Elo; if
it comes to replay the abilities, it must replay `s.lt` the same way.

### One surprise, counted once (2026-11-06, Q137 part 1; rules version 7, sheet v62)

Pierre approved (2026-11-06) the algorithms review's §2a (`docs/reviews/2026-11-06-engine-algorithms-review.md`): one
answer moved its genus twice. `eloStep` stepped the genus, then the global level, and marked the genus with the level
*before* that level step (`s.lt`). At the genus's next question `levelMove` added the level's move since `s.lt`, which
contained the level's step on the very same answer. In `core.js`: a first right answer on a new genus (k 4, an average
photo, a player at level 0) moved it by 0.30 through its own step, then by 0.22 more through the level (the review
measured 0.27 under other settings), so 0.52 in all.

- **The rule** (`core.js` `scoreAnswer`, so the game and the replay alike): after the level's step, the genus shown takes
  the level as it now stands (`s.lt` = L after the step). Its `levelMove` then carries only the level's moves from the
  other answers, which is what the global + concept skill model means: the level's step on an answer reaches the
  genera that did not see it. The genus answered keeps its own step, and the level keeps its own. Nothing else changes:
  the level is still made at a player's first answer from their history (`levelSeed`), and every constant is the same.
  `tests/scorer.test.js`: the genus's ability at its next question is its own step and nothing more; another genus
  moves with the level; the replay keeps the same `s.lt`.
- **Measured on the real log** (rule L12, read-only, an extract of 2,047 answers of 10 players to 2026-11-05 20:14,
  outside the repo; `tools/abilityeval.js` `e+X+M+A` against `e+X+M+A+O`, the new `+O` option being this rule):
  next-answer log-loss 0.469 → 0.468, Brier 0.149 → 0.148. Paired per player (the primary measure, players as the
  unit): +0.002 [−0.008, +0.012], sign-flip p 0.91 (10 players): no change in prediction. By level band (exploratory,
  uncorrected): level 0-0.75 −0.018 [−0.033, −0.003], level ≥ 0.75 +0.010 [−0.007, +0.027]. At the end of the log the
  players' answer-weighted mean genus ability moves by +0.01 to −0.11 (less inflation of the genera answered once or
  twice), and their global levels do not move. Calibration is the same within 0.01 in every group. So the fix is about
  correctness (each answer's surprise counted once), not about a measured gain in prediction.
- **Simulated** (rule L11 tier 1, `tools/learnsim.js`, the four profiles × 5 seeds, rules version 6 against 7 on the
  same seeds and stats, 1 worker; declared before the runs: the primary measure |θ − true| at question 300, pooled,
  exact sign-flip): 0.838 → 0.845, +0.007 (90% bounds −0.034 / +0.048), p 0.82: no change. Guardrails: true knowledge
  over the slate at 300 +0.000 (−0.003 / +0.004), genera met at 200 +0.5 (−0.4 / +1.4), progress shown at 300 +0.05
  points (−0.7 / +0.8). Exploratory, uncorrected: the abilities sit a little lower against the truth (θ − true at 300
  −0.45 → −0.51, p 0.09), and right answers over questions 200-300 fall by 1.5 points (p 0.15). The simulated learners
  were already under-rated, and the second count was partly hiding that. Part 2 is the planned answer: the faster early
  convergence of a variance-weighted update.
- **Part 2, the Kalman / Glicko variance (§2b), comes with the new progress bar** (another track). How it plugs in:
  everything that steps an ability now sits in one place, `scoreAnswer` (Q132). Part 2 replaces the steps there,
  `eloStep` on the genus and on `LEVEL` together with `levelMove`, by one update of θ_g = L + δ_g. Each part keeps a mean
  and a variance (`s.th` and a new `s.tv` for δ_g, `P[LEVEL].th` and `.tv` for L). Each answer adds process noise
  (learning), and the surprise is split between L and δ_g by their variances (Szczecinski & Tihon 2023), so it is counted
  once by construction and `levelMove` and `s.lt` go. `ELO.kmax`, `kmin`, `n`, `vr`, `vg` give way to the prior variance
  and the process noise. The time weight `rtWeight` keeps scaling the step. The variances give the bar its SE. The new
  fields join `REPLAYED`, `replayedOf`, `replayBase` and `mergeProgress` (from the device that played, as `th`), with a
  rules version and the replay. The scoring record (`sc`) needs nothing new, since the variance is rebuilt from the log.

### Beginners and experts (2026-11-03)

Pierre, on "Global level and genus": the gains for strong players and experts are what he wants, but 22 genera met by
question 100 is too many for a beginner, and many beginners are arriving now; with a success target that follows the
level, a beginner would be aimed at about 85% right, not 80%. Both must be calibrated, with the parameters that can
treat a beginner and an expert differently.

**The rule** (`model.js` `aimP`, `aimOff`, `shaky`; `core.js` `AIM`, `aimOf`, `pgMissW`, which the full replay weighs the
misses with too, at the replayed level):

- **The success aimed for follows the global level** (`core.js` `AIM`, `PICKD.AIM`, points [level, success]): 85% up to a level of 0.5,
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
  level and genus". The real answers cannot judge a different draw (rule L12); they were played under `main`'s.
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
- **Since 2026-11-06 (Q188) the calibration questions are the exploration share**: 30% of the questions on a genus the
  player holds (20% before), each drawing a colony the player has never seen (any view of it), on the targeting and the
  bonus as before ("Photo exposure" below).
- **Calibration questions only on a genus the player holds** (met, not shaky): a single, perhaps unusual, photo does
  not help on a genus still being learned (and a simulated beginner opened genera faster than intended with them).
- **A new photo's prior is only a guess** (`CAL.U` = 1): the targeting's width grows to √(0.7² + U / (1 + answers /
  2)) for a photo with few answers, so a photo whose prior is off (its genus's offset since 2026-11-03; a set placed by
  hand before) is not kept away from a player whose target is lower; it narrows back to 0.7 as answers come. U was set
  for the Easy / Medium / Hard sets; the residual around the genus offset is smaller (sd about 0.3-0.6), so U could
  shrink, only after a `learnsim` check (ROADMAP).
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
  share] points [0, 0, 0] → [0.54, 3, 0] → [1.8, 3, 0.85], straight lines between: the traps first (Pierre, rule L7:
  one after the first right answer, all three after about 5), then single views (rule L3). The same numbers as the two
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

### Per-format offsets (sheet v77, rules version 8, 2026-11-06, Q138)

The independent review of 2026-11-06 (`docs/reviews/2026-11-06-engine-algorithms-review.md` §3, §5, §10): the
expectation's guess model g + (1 − g) σ(θ − d), g = 1/k, misses the 2-choice questions (right 87-93% where the app
expected 76-82%), so each such answer over-credits the ability, the level and the photos, and typed questions need an
offset of their own. Pierre (2026-11-06, Q138): estimate per-format guess rates and offsets from the data (the Analyses
"Formats" model, P = c + (1 − c) σ(x + d)), serve them from the sheet, use them in the expectation, the photo aim and
later the bar. Approved for the app on 2026-11-06 (Q146), the guess rates kept at 1/k as below.

**Measured first** (tier 3, rule L12; read-only, the sheet's Answers tab read 2026-11-06 07:30 Manila: 2,047 answers of
10 players, 2026-11-01 to 11-05, all trusted; aggregates only). Declared before any comparison was run, one family
under Holm (α 0.05), players as the unit, an exact sign-flip test over the 10 players' mean per-answer differences:
**P1**, the leave-one-player-out next-answer log-loss of e′ = c_f + (1 − c_f) σ(x + d_f) (`analysis.js` `fmtFit` on the
other players, the 8 formats of `analysis.js` `FORMATS`, a format with fewer than 20 training answers keeping the app's
value) against the app's logged expectation, x the app's log-odds from the logged e; **P2**, the photos rated against
the genus ability (Q136: "Photos rated against the genus ability").

| Format | answers | players | right | app expected | P1 model (LOPO) | offset only (LOPO, as shipped) | offset d_f (all, SE) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 choices (k4) | 832 | 9 | 0.780 | 0.775 | 0.779 | 0.776 | 0.00 (0.10) |
| 4 shown, 3 plausible (k3) | 77 | 7 | 0.896 | 0.706 | 0.913 | 0.874 | +1.41 (0.37) |
| 4 shown, 2 plausible (k2) | 553 | 9 | 0.873 | 0.739 | 0.869 | 0.853 | +1.14 (0.15) |
| Again (2 choices) | 278 | 10 | 0.820 | 0.775 | 0.824 | 0.822 | +0.44 (0.22) |
| duel in the quiz | 55 | 7 | 0.818 | 0.816 | 0.808 | 0.813 | +0.06 (0.45) |
| Duel tab | 197 | 4 | 0.843 | 0.795 | 0.753 | 0.735 | +0.30 (0.25) |
| typed | 55 | 3 | 0.764 | 0.825 | 0.806 | 0.808 | −0.37 (0.32) |
| exam | 0 | | | | | | |

- **P1 passed**: −0.0269 per answer [−0.0433, −0.0105], better for 8 of 10 players, p 0.008 (Holm: P2 p 0.60 did not).
- **Re-run on the log of 2026-11-06 13:15 Manila** (2,048 answers, one more; for the port onto the one scorer, #632):
  the same within rounding: P1 −0.0269 [−0.0433, −0.0105], p 0.008; offset only −0.0012, p 0.89, with the prior
  −0.0036, p 0.62; the offsets served unchanged (k2 +1.14, k3 +1.41, Again +0.44, Duel tab +0.30, duel in the quiz +0.06,
  k4 0.00, typed −0.37); the shared slope 0.40, −0.0233, p 0.018. The table above stands.
- **But the two-parameter fit is not a guess rate.** On all the answers it gives c 0.67 with d −1.68 for 4 choices,
  c 0.87 with d running off to minus infinity for k2 (the app's log-odds then carry no information), the estimates of c
  and d correlated −0.86 to −0.95 in every format: c absorbs a slope, not a guess. Put into the Elo, a guess rate of 0.87
  would leave right answers almost no surprise and aim no photo (the target sits under the floor). Not shippable.
- **The gain is a slope, not a format** (exploratory, uncorrected): one shared slope on the app's log-odds plus an
  offset per format, fitted the same way, keeps most of it (−0.0236 [−0.0401, −0.0072], 7 of 10 better, p 0.016), its
  slope 0.40: the app's log-odds are about 2.5 times too steep (the photos rated either way, Q136: 0.30-0.35). Its
  confident predictions are too confident, in every format; that belongs to the person model with a variance (review
  §2b, the Kalman / Glicko update), not to the formats.
- **Offset only** (c = 1/k, d_f fitted; secondary): no log-loss gain (−0.0012 [−0.0195, +0.0171], p 0.89; with the
  shipped prior N(0, 1): −0.0036, p 0.62), but each format's mean comes to its real success (k2 0.74 → 0.85 against
  0.87, k3 0.71 → 0.87 against 0.90, typed 0.83 → 0.81 against 0.76). The Duel tab is the exception: 4 players, one of
  them most of its answers, so left out it is predicted from the other three (0.74 against 0.84). By level (the logged
  genus ability, descriptive): under 0.5 right 0.83, app 0.72, offsets 0.80; 0.5-1.5 0.81, 0.79, 0.79; 1.5 and over
  0.84, 0.87, 0.87.

**The rule** (the part of Q138 the data can carry): each format f gets an offset d_f on the app's log-odds,
P(right) = 1/k + (1 − 1/k) σ(θ − d + d_f), the guess rate kept at 1/k. `core.js` `fmtOffsetsOf` fits it (Newton's
method on d_f with a prior N(0, `FMT.SD`² = 1), from `FMT.N` = 20 trusted answers with their logged expectation;
`fmtOf`, the formats of `analysis.js`); the sheet serves it in `?stats=1` `fmt` (`Code.gs` `stats_`, v77), the app
reads it from a sheet that reports v ≥ 68 (`model.js` `PFMT`, `core.js` `FMT_SHEET`, `fmtsOf`; rule D4: before, every
offset is 0). Where it acts:
- **the expectation of the ability steps**, the genus's and the global level's, in the one scorer (`core.js`
  `scoreAnswer`'s `df`, from `quiz.js` `answer`: the question's difficulty taken d_f easier), so a right 2-choice
  answer the format explains no longer raises the ability as a surprise. **Logged with the answer**: the scoring
  record keeps the offset the game used (`scoreRec` `o`, left out at 0), and the replay takes it from there, so a
  replayed answer is the one the game scored (Q132), whatever the offsets served later; a row logged without a scoring
  record (before #632) takes the offsets served now, as its memory and mix-ups term (`replayProgress` `fmt`), and a row
  scored before this version has no `o`, so it replays without an offset, as it was played. Rules version 8, the sheet
  replays everyone. On today's log (descriptive, the rows have no `o` yet so they take today's offsets): every
  player's global level falls, by 0.01 to 0.65 (median 0.26), their genus abilities by 0.01 to 0.47 on average, the
  most for the players with the most 2-choice answers; the progress % moves by at most 1 point (no recalculation card,
  `RV_CARD` `min` 5), the progress weights not taking the offsets yet;
- **the photo's aim** (`model.js` `aimOff(k, df)`, `photoSet`'s format): logit((P − 1/k) / (1 − 1/k)) − d_f, so a
  format the players find easier gets a harder photo (k2 on today's offsets, at the 80% aim: the photo about 0.7
  above the ability rather than 0.4 below) and the question still sits at the aimed success; typed a little easier;
- **not yet**: the progress weights (`pgMissW`, `pgMemW`, `pgRightW`: the bar, being rebuilt elsewhere, "later the bar"),
  the opening hold and the comeback (they read the logged e), the sheet's photo ratings (they keep 1/k). The logged
  Expected stays the expectation before the offset, so the sheet always fits the same quantity.

Tier 1 (`tools/learnsim.js`) could not judge it until 2026-11-09: the simulator seeded the app's photo statistics
without `fmt`, so every offset was 0 there; it now seeds them as the app stores them (`--stats` with the sheet's `fmt`).
The guess rates the data could not identify wait for the slope, whose diagnosis runs apart (Q147; ROADMAP "The
expectation's slope").

**Per subject** (Pierre, 2026-11-09: the same kind of leak as the photo memory's, #790, fixed the same way). The sheet
fits `fmt` on the corals' answers only (`Code.gs` `stats_` reads the replayed subject's rows), yet until this change the
app aimed and scored fish answers with it too: every fish scoring record logged `o` 0.18 (k4) and `t` −0.42 (typed),
the ability steps took the corals' k2 +1.04, and the bar (`core.js` `domF`, `domBar`) both the question's offset and the
typed one. Every use now reads `model.js` `pfmt()`: the sheet's offsets for the subject it rates (`SUBJECTS` `replay`:
the corals, the very `PFMT` object, so nothing changes for them), and for any other subject **no offset, every format
at 0** (the prudent value, put to Pierre in the PR): the app's own expectation before any fit (the fit's prior mean,
`core.js` `FMT`, and what an older sheet gives, rule D4), which corrects nothing rather than by another subject's
numbers, until a per-subject `?stats=1` fits the fish formats (ROADMAP admin plan PR 11). Checked by
`tests/fishformat.test.js` (a fish expectation, scoring record and draw run with a `PFMT` that throws on any read; the
corals read `PFMT` itself; `PFMT` read only through `pfmt`). **No fish rules version**: every fish answer since the
scorer carries its scoring record and the replay (the sheet's, `Code.gs` `replay_`, and the device's, `sync.js`) reads
its `o` and `t` as logged, a row without one taking the replay's `fmt`, which for fish is none (`st = {}`): the change
picks the offsets of future fish answers and moves no saved progress (the same test pins it).

- **Learning outcomes** (rule L11 level 1: one subject, one input). `tools/learnsim.js --subject fish --stats` with the
  live `?stats=1` of 2026-11-09 07:11 Manila (k4 +0.15, k2 +1.11, k3 +1.23, Again +0.29, typed −0.42), the five fish
  profiles × 5 seeds × 300 questions, before (main afb5701, the learnsim seeding above applied) and after on the same
  seeds, judged by `tools/learncmp.js`; declared before running: primary `know@300:up` (no gain expected: a leak fix,
  judged no worse by its guardrail), every guardrail, no cost declared, a second look on seeds 6-15 for a profile left
  unclear (taken for the strong RA's share under ease 4; `--looks 2`). Paired difference after − before [one-sided 90%
  bound on the side of harm, look 1], beginner / casual diver / lecture RA / strong RA / expert:

  | Guardrail | Margin | Difference [bound] | Verdict |
  | --- | --- | --- | --- |
  | True knowledge @300 (primary: no clear difference, p 0.32, 20 of 25 pairs up) | −0.02 | +0.035 [+0.020] / +0.017 [+0.012] / −0.001 [−0.004] / −0.002 [−0.007] / 0 [0] | held |
  | E = bar − D\* @300 | +0.03 | +0.098 [+0.124] / +0.098 [+0.118] / +0.116 [+0.131] / +0.091 [+0.109] / +0.090 [+0.113] | **breached for every profile** (−0.445 → −0.346, −0.415 → −0.317, −0.403 → −0.287, −0.417 → −0.327, −0.429 → −0.339) |
  | Answers to the first family at Open Water | +23 / +30 / +18 / +10 / +10 | −18 [+13] / −64 [−22] / −47 [−23] / −16 [−9] / −16 [−12] | held |
  | Families at Open Water @300 | −2 | +4.6 / +4.6 / +8.0 / +6.8 / +8.8 (bounds ≥ +2.4) | held |
  | Longest plateau of the shown score | +11 / +9 / +11 / +8 / +8 | 0 [+9] / −2 [+6] / −9 [+5] / +3 [+5] / +1 [+5] | held |
  | Share under ease 4 before Open Water @300 | +0.05 | +0.016 [+0.027] / −0.011 [0] / +0.009 [+0.022] / +0.033 [+0.054] / −0.005 [+0.026] | held (the strong RA unclear at look 1, held on the second look: 15 seeds, 95% bound, +0.017 [+0.035]) |
  | Families met @100, @300 | −2 | +6.4 to +0.4 at 100; 32 at 300 in every run but the beginner's (30.8 → 32.0) | held |

  What it says: the corals' offsets held the fish bar down (a 4-choice right answer counted 0.15 logits easier, the bar
  measured against a typed format 0.42 harder), so without them every fish profile's bar rises by about 0.1 and its
  families reach Open Water much sooner (the lecture RA's first at 42 answers instead of 89; 15 families at Open Water at
  300 instead of 7). The bar stays well under the learner's true knowledge (E −0.29 to −0.35 after, −0.40 to −0.45
  before): it still does not over-claim, it under-claims less. But the guardrail is one-sided and its margin was
  crossed, a cost not declared before running, so it goes to Pierre (rule L11). **The corals, identical**: the same
  runs on `--subject coral` (4 profiles × 5 seeds, the same stats with their `fmt`, afb5701 → this change) give the same
  record in every run, its 300 answers included (genus, answer, photos, choices, expectation, scoring record with its
  `o` and `t`; only the answer id and the wall-clock time differ), and the same summary (knowSlate 0.645 / 0.819 / 0.856
  / 0.954, met 36.6 / 40 / 40 / 40).
- **On the real log** (rule L12, read-only, the Answers tab read 2026-11-09 07:18 Manila: 1,734 scored fish answers of 9
  players, 2026-11-06 to 11-08, every one with its scoring record; 1,240 of 6 players scored with a coral offset `o` other
  than 0; the step's expectation with the offset as logged against the logged `e`, the expectation before any offset, the
  value now used; declared before computing: per player, sign-flip):

  | Format | Answers | Right | Expected, no offset | Expected, coral offset as logged | Log-loss none → coral |
  | --- | --- | --- | --- | --- | --- |
  | 4 choices (k4) | 1,249 | 88.9% | 80.7% | 82.2% | 0.362 → 0.355 |
  | 2 plausible of 4 (k2) | 155 | 83.2% | 73.0% | 83.3% | 0.493 → 0.463 |
  | Again | 192 | 77.1% | 80.9% | 83.3% | 0.499 → 0.508 |
  | duel in the quiz | 95 | 91.6% | 86.3% | 86.5% | 0.266 → 0.265 |
  | typed | 34 | 85.3% | 86.0% | 82.4% | 0.410 → 0.405 |
  | 3 plausible of 4 (k3) | 9 | 55.6% | 35.0% | 38.5% | 0.771 → 0.741 |

  On the 1,240 answers scored with a coral offset the log-loss is 0.405 with none against 0.396 with the corals' (per
  player +0.004 for the corals' side, 5 of 6 players, sign-flip p 0.75); with today's coral offsets on every scored fish
  answer, 9 players, the same (−0.010, p 0.63). The log cannot tell the two apart, and where it leans it leans to the
  corals' offsets, not because they are the fish's but because the fish answers run above the app's expectation in
  every frequent format but Again (4 choices: 89% right against 81% expected), which any positive offset partly
  absorbs. The fix rests on its reason (no coral number on a fish answer), not on the log; the fish formats' own fit
  waits for a per-subject `?stats=1`. The fish answers logged before it keep their coral `o` and `t`, which the replay
  reads as logged.

### What the players say about the difficulty (one-tap questions, 2026-11-03)

Why: the success target is moving to one that depends on the player's level. Papoušek, Stanislav & Pelánek (2016;
geography practice, conditions aiming at 5, 20, 35 and 50% errors) found that easier questions keep learners
answering at first while harder ones bring them back and teach more. After 30 answers their system asked "What is the
difficulty of asked questions?" (Too Easy / Appropriate / Too Difficult; over 40,000 ratings): most learners answered
Appropriate when their own error rate was around 30%, the 35% condition had the most Appropriate ratings (66%), yet at
least a third still wanted easier or harder questions, and they name changing the target from the learners' ratings
as future work (extended report FIMU-RS-2016-02, section "Explicit Feedback"). Whether that holds for a given level here is what the
players can tell us, as they play (Pierre, 2026-11-03: "all the more important to ask from time to time whether it's
too hard or not hard enough … am I having fun, is it too frustrating, too easy, too hard … slightly different questions
about roughly the same concept"). The main players are IMR RAs: the challenge must suit strong players without
overwhelming beginners, and the answers are read by level band for that reason.

**The bank** (`core.js` `PULSEQ`; when and how it is asked: ARCHITECTURE.md "One-tap questions"). Six single items,
three answers each, one tap; each answer is put on one or two common scales (`pulseScore`): **felt difficulty** d (−1
too easy, 0 right, +1 too hard) and **feel** f (−1 bad, 0 neutral, +1 good).

| Item | Answers (d / f) | Construct | Source |
| --- | --- | --- | --- |
| These questions are | Too easy −1 · About right 0 · Too hard +1 (d) | perceived difficulty | the app's item since sheet v19; the same three answers as Papoušek, Stanislav & Pelánek's (2016) "What is the difficulty of asked questions?" (Too Easy / Appropriate / Too Difficult); one question on difficulty is a usable measure: Sauro & Dumas (2009) compared three one-question post-task ratings, and the 7-point "Overall, this task was: Very Easy … Very Difficult" (later named the Single Ease Question) was as sensitive as the best of them and correlated with task time and the SUS |
| Right now I feel | Bored −1 · In the zone 0 · Struggling +1 (d) | challenge-skill balance, as a state | flow's three channels, boredom (skill above challenge), flow, anxiety (challenge above skill) (Csikszentmihalyi 1975); the words are ours, no published item. The same balance as item 16 of the flow short scale (FKS, Rheinberg, Vollmeyer & Engeser 2003: "Für mich persönlich sind die jetzigen Anforderungen…", "zu wenig" · "gerade richtig" · "zu hoch", 9 points), which the first version used as "For me, the challenge is: Too low · Just right · Too high"; replaced before release (Pierre, 2026-11-03): non-native speakers could not tell whether "low" meant easy or hard. No feel value: being in the zone is not the same as having fun, which "Having fun?" asks |
| Want harder photos? | Yes −1 · Keep it 0 · Easier +1 (d) | challenge-skill balance, asked as a wish | the same balance phrased as what to change (a design choice, no published item); a wish and a judgement can differ, so its own counts stay visible |
| Having fun? | Not really −1 · It's OK 0 · Yes! +1 (f) | enjoyment | positive affect of the in-game GEQ (items 11 "I felt content" and 14 "I felt good"; IJsselsteijn, de Kort & Poels 2013; 14 items, two per component, "not at all" 0 to "extremely" 4, made to be asked several times during play) |
| Frustrating? | Not at all 0/0 · A bit +0.5/−0.5 · Very +1/−1 (d, f) | frustration | tension of the in-game GEQ (items 6 "I felt frustrated" and 8 "I felt irritable"); flow's anxiety channel, challenge above skill |
| Getting boring? | Not at all 0/0 · A bit −0.5/−0.5 · Yes −1/−1 (d, f) | boredom | negative affect of the in-game GEQ (items 3 "I felt bored" and 7 "I found it tiresome"); flow's boredom channel, skill above challenge |

Choices: three answers, never a 5- or 7-point scale (one tap on a phone row, Pierre: "people answer a tap"); words, not
emoji faces (DESIGN.md: no pictographs as icons). The two one-sided items say nothing on the other side: a "not at all"
is 0 (not too hard, not too easy), and as both come equally often (rounds), they pull a band's mean towards 0 without
tilting it; read each item's own counts beside the mean. PENS (Ryan, Rigby & Przybylski 2006) was considered: its
competence and autonomy items measure need satisfaction over a session, not whether the difficulty suits the player
now. Varied wording costs strict comparability (experience sampling usually repeats one item: Csikszentmihalyi & Larson
1987); it is the price of not wearing the players out, and why every item is mapped to a common scale and still shown
alone, and why the first item ever is the plain one, the same as the v19 answers. "Right now I feel" shares a word with
"Getting boring?" (Bored): one picks a state among three, the other rates boredom alone; the rounds never put them
next to each other.

**Seen, then answered** (Pierre, 2026-11-03, from the first screenshots: a row inside the feedback card was easy to
miss and a big Next was tapped without reading it; then, after a long run the same day: "in a flow state, chaining
questions, used to clicking Next, I don't see them": 3 of his first 4 prompts, a block of its own before Next by then,
ended with Next and no tap). The question is now a card shown at Next, before the next question: a natural break that
does interrupt, without ambushing the reflex tap (its buttons take no tap for 600 ms, Enter answers nothing; ARCHITECTURE.md
"One-tap questions"). One tap answers, "Not now" closes. Each prompt logs its showing, so the admin knows the
**response rate** by item, level band and mode (shown, answered, Not now, no answer). A low rate in one band would bias
that band's answers towards the players who care to answer: read it next to the answers. Rates from before the card
(2026-11-03) are lower by design: compare like with like.

**How the answers will be used for the level-dependent target** (not built: ROADMAP "Level-dependent target"). Admin
To do › Errors shows, for each level band (the overall level when they answered: below −0.5, −0.5 to +0.5, above +0.5)
and each mode, the mean felt difficulty and feel, the answers and devices behind them, the response rate and the right
% of the last 10 answers. The target is right for a band when its mean felt difficulty sits near 0 with feel not
negative. The rule, **approved by Pierre on 2026-11-03**, to build once the data exists: read a band only from about 20
answers from 5 devices or more (one talkative device must not decide: compare with the mean of each device's mean); a
band whose felt difficulty stays beyond ±0.25 moves its target success by 0.05 at a time (towards easier for "too
hard", towards harder for "too easy", the research's ~70% for strong players as the likely end), each move checked in
`tools/learnsim.js` and on the real answer log as for any change to the algorithm (rule L12); a harder target
for strong players stands only if their feel does not drop. The duels are easier by design (2 choices): read the photo
quiz first. Pierre's caution with the approval: felt difficulty is subjective, so no move before a band reaches those
thresholds, and the answers check the target, they never steer it answer by answer. The prompt every 40 answers was
approved the same day.

**Never early in a session** (Pierre, 2026-11-05, on his phone: "Getting boring?" came when he had barely started his
session). Asked in the first minutes, "Getting boring?" or "Frustrating?" make no sense, and the other items measure the
first questions of a warm-up rather than the difficulty: a prompt shows only once the current session has 15 answers and
has lasted 5 minutes (a session = answers less than 30 minutes apart, the admin's definition); one due sooner waits for
that, and the spacing in answers is unchanged (ARCHITECTURE.md "One-tap questions"). Answers from before this change
include some given at the very start of a session.

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
quiz, all its formats included, limited to them (since 2026-11-04, Pierre: one path for every game, the genera the
player has unlocked only: `model.js` `unlocked`; it opens none). Code: `model.js` `CUSTOM`, `customOf`, `customDraw`, `customChoices`;
`quiz.js` `quizCustom`, `viewCustom`, `planPhoto(cur)`; tests `tests/custom.test.js`, `tests/pages.smoke.js`.

- **What changes** is only the genus asked and the wrong choices. Photos (level, calibration, memory, one colony),
  typed questions, "Again: A or B?" after a mix-up, the duels slipped in (`duelPick` among the selection), the comeback
  and every scoring rule are the photo quiz's. At least `CUSTOM.MIN` = 2 genera.
- **No mastery exam in the custom quiz** (Codex review #411, rule L9; Pierre's decision, 2026-11-03: exams happen
  only in the normal quiz): an exam question has every look-alike trap, and the custom quiz's choices come from the
  selection, which may hold none of the genus's look-alikes, so a Learned earned there would not prove what the exam
  proves. So the custom quiz never asks an exam question (`planPhoto`: no `examSet` with a selection) and never credits
  the exam or `s.mx` from its answers (`answer`: `exq` is never true there). Its answers still move the progress bar,
  up to the exam's entry (95%); the exam then comes in the Quiz (the tab named "Photo → genus" until 2026-11-03). A genus ready for its exam is still drawn in the
  custom quiz, as a normal question, and a miss there still restarts an exam begun (any miss on the genus does, rule
  L9). The help says so (the selection screen and the quiz's ?). `tests/draw.smoke.js` plays a custom session on
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
- **A reminder of the path, once** (Pierre, 2026-11-12: a player drilled 417 answers over two days there, on purpose,
  with 13 genera still not open: "un petit rappel [...] qu'on fait qu'une fois, et quand quelqu'un passe beaucoup de
  temps dans le custom quiz"). After `LEFTN.AT` = 100 custom-quiz answers since the last photo-quiz answer, while units
  of the path may still open and the opening hold is off (during the hold the Quiz opens nothing new, so the card
  waits for it to end: Pierre, 2026-11-12), a card at Next says how many are waiting in the Quiz, with Go to the Quiz and Keep
  drilling; once ever per subject, nothing changes in the draw (ARCHITECTURE.md "The custom quiz's reminder of the units
  waiting in the Quiz"). The threshold: in the answer log (read 2026-11-12, answers to 2026-11-09), one player used the
  custom quiz, in runs of 229, 148 and 40 answers before going back to the Quiz, at about 5 answers a minute; 100 is
  about 20 minutes of drilling.
- **The wrong choices** (`customChoices`): `distractors()` run on the selection, so its rules work inside it: traps by
  level among the pairs most confused, else easy genera of other growth forms, genera met first. A selection of
  look-alikes therefore drills itself (with nothing easier picked, its own look-alikes are the choices even at 0 traps,
  and `plausibleK` counts them: a right answer proves more). Only a selection of fewer than 4 genera is topped up from
  the other genera in play (the slate, and the bonus genera when on), by the same rules, asking for the traps the
  selection could not give (`traps` − the selection's own confusable choices). An "Again" after a mix-up with a genus
  outside the selection (a top-up choice, or a typed answer) asks the selected genus of the pair.
- **What counts**: every answer is a photo-quiz answer: progress, ability, the global level, photo ratings and
  confusions in the sheet, the opening hold (each answer with the expectation it had; a selection the player finds hard
  holds new cards in the photo quiz, as any run of misses would), achievements, except the runs of right answers (On a
  roll, Unstoppable) and Sharp eye (Pierre, 2026-11-05, Q82: "only in the normal Quiz"; the genera are the player's pick
  and the choices come from them, so runs and "a photo most players miss" come easier): a custom-quiz answer neither
  extends nor breaks the run and earns no hard photo (`progress.js` `achAfter`, `achRunIn`; the Duel tab's answers
  likewise, while the duels slipped into the photo quiz count as Quiz answers). Logged with the mode `quiz|s` before
  any other tag (`quiz|s|d|k2`, `quiz|s|k3`, `quiz|s|t`): the sheet's `guess_` reads `|kN`
  at the end and `|t` anywhere, and its mode split keeps `quiz`, so the deployed script (v27) stores and rates it as any
  photo-quiz answer, no new version needed (rule D4; `tests/custom.test.js` compares the two modes).
- **Comeback**: during a comeback the custom quiz asks the comeback's genera of its selection when at least 2 of them
  were answered right; otherwise it plays as usual and leaves the comeback (`CB`) to the photo quiz rather than ending
  it (`quiz.js` `cbIn`).
- **Picking** (Pierre, 2026-11-03: "not everyone knows the IMR lecture groups"; then "do not group genera by growth
  form": it is not genus-specific, many genera take 3-4 forms or more, only the mushroom corals keep one): every genus
  is in view as a small photo with its name. Three views (Pierre, the same day: "nobody picks genera alphabetically;
  you usually know you make mistakes around these kinds of genera, so you go there"):
  - **IMR groups**, the default: the lecture's groups, their genera in the IMR order, All / None per group;
  - **My mix-ups**: the genera the player confuses, in clusters, the most confused first, each with its mix-up count
    (`model.js` `mixEdges`: each pair the player mixed up, both ways, from `s.conf`, the genus given instead of the one
    shown; `mixClusters`: greedy, the heaviest pair first, two genera in no cluster start one, a genus joins its
    partner's cluster when it is paired with at least half of it and it has fewer than `CUSTOM.CLUSTER` = 6, clusters
    never merge, so a chain A like B like C like D does not make one cluster of genera that do not look alike). A player
    with no mix-up yet gets the same clusters from the declared look-alikes (`lookEdges`: `look`, IMR lecture and Coral
    Finder, weighed by how much every player confuses each pair, `pooledConf`), and a line says so. It generalises the
    Look-alikes of … pick, which stays for one genus;
  - **Progress**: To review, Learning, Not seen yet, Learned (`shownLevel`, the names of My progress).
  No A-Z view (the search finds a name; it was the default for a few hours on 2026-11-03: a device that kept it, under
  the old key `reefid-custom-view`, opens on IMR groups once, the choice now in `reefid-custom-view2`). Quick picks that need no knowledge, My weakest (genera answered, lowest progress
  first, 6), Recently missed (a miss in the last 5 answers, latest first, 8) and Look-alikes of … (a genus and its
  declared or confused look-alikes, `isLook`, `confusable`); a search box. The selection is saved at each change
  (`reefid-sync-coral-custom`, synced, the latest wins) and preselected next time.
- **Checked** (rule L12): `tools/learnsim.js --seeds 5 --questions 300`, the four profiles, `main` (ed0ee83)
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
  duel draw). The newest mix-up replaced one still waiting, as before; since 2026-11-04 the queue holds up to
  `CONTRAST.Q` = 3 pairs, oldest first ("After the collapsed runs of 2026-11-03", below).
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

(Superseded on 2026-11-03: measured again on 1,262 trusted answers, the sets predicted the answers worse than no prior
at all, and they were removed: "Hierarchical photo Elo", below.)

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

- **Cards**: name, cover photo, ID tips, and for a ★ genus the surveyed look-alike it is on the slate for (rule L5).
  The first `INTRO.START` (4) come one after the other ("1 of 4", Next, Start), picked by the progressive path's draw
  (easiest first); the first question is about one of them, never with that card's own photo (`photoSet(n, skip)`; a
  new-player walkthrough, 2026-11-02, got the very same photo twice in a row; same for a duel that brings a card).
- **When a genus opens** stays the progressive path's call (below): a draw that falls on a genus not met yet shows its
  card and asks about a genus already met. No new card while one is still to be asked (`openPace`), so two cards are at
  least `INTRO.GAP` (2) answers apart (`INTRO.EVERY`, 2 answers between cards, went on 2026-11-14: it never bound,
  Q350 j, "Confusion groups").
- **A ★ genus after the genera it is compared to** (Pierre, 2026-11-03): it opens, on a card of its own or among the
  first cards, only once the surveyed genera its card names are met ("Starred genera after their reference", below).
- **Held while the player falls behind** (`introHold`, Pierre, 2026-11-02): no new card while a running sum of how
  far the answers fall below the success the game expected for them (each answer's `e`), less an allowance
  `INTRO.SLACK` (0.1) an answer, never below 0, is `INTRO.HOLD` (1.5) or more. A CUSUM (Page 1954, the standard detector of a lasting drop): a run of misses adds up however long it
  lasts, a spell above expectation is not banked against a later drop, and right answers pay the debt back by what they
  beat the expectation by (an easy one, e 0.9, by 0.1). Kept on the device (`reefid-hold`), so a player who left on a run
  of misses does not come back to new genera, and, for a signed-in player, synced through the sheet (sheet v23, Pierre
  2026-11-02: it follows the player from one device to another, and is rebuilt from the answers given before it
  existed, an RA having left on a run of misses before it was built): each load of the saved progress carries the same
  sum computed by the sheet over every answer it logged for the player, in time order, since their last progress reset
  (`Code.gs` `hold_`, same formula and allowance, `HOLD.SLACK` kept in step with `INTRO.SLACK` by
  `tests/sync.test.js`); the app adds the answers the sheet has not confirmed yet and takes that as its hold
  (`holdSync`): the same sum over the same answers on every device, so right answers on a phone pay back a hold started
  on a laptop. Players not signed in keep the device's only. Cleared with
  the progress. In the Duel tab its crossing also brings a relief card, once a run ("The Duel tab when the hold sets
  in", below). Every answer counts, the comeback's after a break too, each with the expectation it really had (below;
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
- **Only after a right answer** (Pierre, 2026-11-03; `openRight`): no card of the path on the question after a
  miss, nor until the player answers right again ("An opening only after a right answer", below).
- **Not right after**: a genus met on a card alone can be asked from `INTRO.GAP` (2) answers on (one question at least
  in between; the card says "It comes up in the questions a little later", and since 2026-11-03 its genus is not
  among that question's choices either: a beginner saw the name of the card just read as a choice behind it; simulated,
  `tools/learnsim.js`, 5 seeds x 300 questions, true knowledge of the slate before → after: beginner 0.57 → 0.55
  (±0.03 / ±0.06), lecture-level RA 0.73 → 0.74, strong RA 0.85 → 0.85, expert 0.95 → 0.95, all within the spread).
  The first 4 can be asked at once.
- **Choices among the genera met**: easy wrong choices and traps come from the genera met (a card or an answer); a
  look-alike already met beats a name never seen; genera never met only make up the three when too few are met.
- **Duels** (changed 2026-11-04, Pierre: one path for every game): the Duel tab draws only look-alike pairs of genera
  the player has unlocked (`model.js` `unlocked`), and so does "Drill this pair" (shown only for an unlocked pair); it
  opens no genus. Until then both genera were named on the buttons and the cards of those not met came together before
  the duel: a beginner who declined Open all went from 8 to 28 genera in 15 duels.
- **"I've had the IMR lecture: open all genera"** (Pierre, same day: the first users are RAs who saw every genus in the
  lecture and have little time): a button on the first cards (not for a player who answered "I'm new to corals", Pierre
  2026-11-04), and in My progress while genera are still unopened,
  opens every slate genus at once, without cards (`introAll`). The draw then asks first the genera never asked, with
  choices from the whole slate. A tinted box with a real button, not a chip (Pierre: white on white was easy to miss).
- **Offer to open all** (Pierre, same day: 10 answers on 4 genera are too few to decide): between the 50th and the
  150th answer (`INTRO.OFFER`), with 10 slate genera met or more and an overall level (Elo, `P[LEVEL].th`) of 0.5 or
  more, a card says "You seem to know your corals already" and offers Open all genera or Not now (`introOffer`), once.
  Simulated at 50 answers: a beginner -0.9, an RA who knows 60% of the genera -0.2, 80% +0.8, an expert +1.2. The
  correct-answer rate does not tell them apart (the game keeps everyone near 80%: 68%, 76%, 86%, 88%). A card, not an
  automatic opening, so a wrong guess costs a tap. **Removed on 2026-11-12** (Pierre, Q337 (a): "Q337, moi je pense qu'on
  va la supprimer. Donc option A."), for every subject: on the real log the card came about answer 50, after the 10
  easiest genera, and 4 of the 9 players who accepted it fell clearly over the next 30 answers (right % −13.5 points;
  the burst study of 2026-11-12, read-only). Open all stays, instant and unchanged, on the first cards and in My
  progress; the back card below stays for an Open all chosen there; records with `via` 'offer' (and a declined offer,
  `open` 0) are still read (the admin's player journey). Simulated, what a player who would have taken it now gets:
  "A unit stuck shaky" below.
- **Back to one at a time** (Pierre, 2026-11-03; `backDue`, `introBack`, quiz.js `backShow`). A player had 46 right in
  51 (90%) on 13 genera opened one at a time, accepted the offer around answer 52, and on the ~27 genera that came at
  once fell to 21 right in 34 (62%), with a run of 1 right in 8 on look-alikes, where the game expected 0.70-0.88; the player
  then stopped. Pierre: "if the player then says no, I keep all genera, fine; but offer at least once the option to go
  back if we detect it really became too hard". So once after Open all (from the first cards or My progress; until 2026-11-12 also the offer),
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
- Synced with the progress: the cards (`reefid-sync-coral-intro`: genus -> [answers when shown, 1 when ready at once (first cards, Open all,
  a duel's), time shown, kind: s first cards / c a card of its own / a Open all / b closed again by One at a time]) and the offer
  (`reefid-sync-coral-intro-offer`: {at, open, via: card / progress (offer before 2026-11-12), t, n genera opened at once, h the drop since; the
  back card's choice bk keep / one, after answer bat, bn genera closed, time bt}, also written by Open
  all genera, for the admin's player journey) are `reefid-sync*` keys, which the sheet keeps; on a pull, the cards seen on another
  device join this one's (`introMerge`; between a closed mark and an opening of the same genus the later one wins, so a
  genus closed on one device is closed on the other, and one reopened since by its card is open on both), the offer record
  goes by its latest decision (`t` or `bt`; `h` counts each device's own answers), and a progress reset starts them over (`introReset`). A genus already asked
  counts as met; the bonus genera, once on, get a first-meeting card like the others. Checked in CI (`tests/draw.smoke.js`, first meetings, no offer card,
  sync; `tests/pages.smoke.js`, the 4 cards and My progress).

My progress no longer shows "Review" (weak) for a genus with fewer than 5 answers (`REVIEW_MIN`, `shownLevel` in
model.js): it shows "Learning" until there is enough evidence. The ring counts genera met ("6/40 met": a card or an
answer, since 2026-11-04, so it agrees with "N not open yet"; a genus met on a card but not asked yet reads "Met, not
asked yet", and the level legend's first step "Not asked yet") until one is learned, then genera learned. The model itself (`level`) is unchanged. ("Review" itself is shaky since 2026-11-03: "One draw weight", below.)

### One progression path for every game (2026-11-04)

Pierre (2026-11-04, after a walkthrough of a brand-new player: 15 duels took a beginner who had declined Open all from 8
to 28 genera, ★ genera before their references): "one progression path for every game: the quiz, the Duel tab, Memory
and any future game or mode, no exceptions". The photo quiz is the path: it opens genera one at a time (its cards, the
opening rule, the ★ rule after their reference, Open all). Every other game draws only from the genera the player has
unlocked, `model.js` `unlocked(list)`, the one source for it (met on the path and ready, `introReady`), and opens none:

- the Duel tab (`quiz.js` `planDuel`): look-alike pairs of unlocked genera; `#practice/duels/A/B` only when both are
  unlocked (else a normal duel); "Drill this pair" shown only for an unlocked pair (`learn.js` `drillOk`); before any
  look-alike pair is unlocked, a line sends the player to the quiz;
- Memory (`proto/pairs.js` `memoryGenera`): only genera unlocked, fewer pairs than the level holds when fewer are
  unlocked (fewer rows), a line before two are;
- the custom quiz (`quiz.js` `viewCustom`, `customSel`): only genera unlocked are offered and kept;
- the Tools' games (`proto/lab.js` `labPlay`, same day): Blur reveal, Spot the feature, Type the genus, the Zoom ladder's
  game, the Elimination board's mystery photo and the anatomy photo drill ask only about genera unlocked (a line sends
  a player with none to the quiz); their wrong choices may name any genus, as the quiz's do (`model.js` `distractors`),
  and the reference tools (map, matrix, gallery, Coral ID Key, the board itself, sizes, the zoom explorer) keep every
  genus. Checked: `onePath` reads the genus of every game photo over 6 rounds each (failed before: Porites, Ctenactis,
  Duncanopsammia… for the beginner with 4 genera met).
The relief card of the Duel tab is unchanged (it speaks of the pair on screen); the false trigger came from the hold that
the genera opened by duels pushed up. Not measured with `tools/learnsim.js` or the replay (rules L11/L12): both play the
photo quiz, which this does not change. Checked: `tests/pages.smoke.js` `onePath` (a beginner with 4 genera met: 15 duels
from those 4 only, no card, no ★; a link to a pair not unlocked; Memory deals 8 cards; the custom quiz offers 4), which
failed before (13 other genera and 3 ★ genera in the duels, 20 Memory cards, 40 custom-quiz genera); `tests/pairs.test.js`.

### The first-launch question (2026-11-03)

Pierre, 2026-11-03: a forced choice among three before the first question, "I'm new to corals", "I had the IMR coral
course" (IMR specifically), "I know corals well" (IMR or not), which **initialises a few variables, not hard-coded
paths** (the three players of "The players we design for" stay one algorithm: decision log 2026-11-02). Asked as the
welcome tour's first step, or on a card before the quiz for a player who skipped the tour; existing players with fewer
than 50 answers are asked once, those with 50 or more are never asked, their answer inferred from their global level
(Pierre's call the same day). Code: `core.js` `CHOICE`, `playerStart`, `startCheck`, `startNext`, `startInfer`;
`model.js` `startSet`, `startV`, `startStep`, `startDue`; `quiz.js` `startAskShow`, `startFbShow`; `tour.js`.

**Per subject** (2026-11-04, the fish welcome question, Pierre: "works exactly like the coral one"): each subject asks
its own question in its own words (`core.js` `SUBJECTS` `start`), with these answers and, for now, these variables
(`CHOICE.opts`), in its own record (`startKey`). Fish: "How well do you know reef fish?", *I'm new to reef fish*, *I'm at
IMR (Research Assistant programme)*, *I know reef fish well*. The fish values are the corals' until learnsim has fish
profiles (docs/FISH_PATH.md "Checks before release"); the fish prior applies at once (fish answers are not replayed).

**The variables, all of the existing model** (`CHOICE.opts[i][1]`):

| Answer | `p`: the level the answers are shrunk towards | `at`: the open-all offer from answer (not read since 2026-11-12, Q337) | Coral basics first |
| --- | --- | --- | --- |
| I'm new to corals | 0 (as before: a new player is a beginner) | 50 (as before, `INTRO.OFFER.AT`) | yes (tour's last button, the card's follow-up) |
| I had the IMR coral course | 0.5 | 30 | no |
| I know corals well | 1.25 | 20 | no |

- **`p`**: `playerStart` used to shrink the global level towards 0 with the weight `START.N` (10 answers): W × t × m /
  (m + N). Now towards the level said: W × (m t + N p) / (m + N), the same weight, no new constant; p 0 is the rule as
  it was (the "new" runs below are identical to the baseline, seed for seed). With no answers a genus starts at W × p
  (0, 0.4, 1.0); after 50 answers the prior weighs 1/6, after 200 under 5%. It is the one entry point of what Papoušek
  et al. call prior knowledge: through `ability()` it sets the photos, traps, single views and typed questions of a
  genus's first questions (one difficulty controller), the shaky signal that paces the opening (`openChance`), and the
  draw weight's x. The values follow the levels the profiles reach on their own: the global level after 20 answers with
  p 0 is 0.08 (beginner), 0.52 (lecture RA), 0.78 (strong RA), 2.0 (expert) (`tools/learnsim.js`, below); "I know
  corals well" covers both a strong RA and an expert, so 1.25 (start 1.0), between them, and a wrong answer must stay
  cheap. 0.3 / 0.8 and 0.8 / 1.875 were tried (table).
- **`at`** (not read since the offer card went, 2026-11-12, Q337; it stays in `core.js` `CHOICE` until the next change
  to that file, ROADMAP): the offer to open all genera came from answer 50 for everyone; a player who says they know the genera can be
  offered it sooner. The offer still needs 10 slate genera met and a global level of 0.5 (`introOffer`), so the answers
  decide; `at` only lets it come earlier. Simulated with the offer accepted (`--openall offer`): opened at answer 30-56
  (lecture RA) and 30-36 (strong RA, expert) instead of 50-58 and 50-51; true knowledge at 300 unchanged (0.76, 0.84-0.85,
  0.95), the over-estimate of the genera opened at once at their first question 0.13 → 0.12 (lecture RA), 0.05 → 0.08
  (strong RA).
- **Coral basics first** ("new"): offered, never forced (about 5 minutes, then the quiz). The simulated learner does not
  read Coral basics (it learns genera from questions and cards only), so its effect is not in the tables: ROADMAP.

Simulated (`node tools/learnsim.js --seeds 5 --questions 300 --choice …`, no `--stats`, same seeds 1-5; "today" = the
code before, the same as the answer "new"), the right answer per profile: true knowledge of the slate at 100 / 300
questions, genera met, right % over the first 20 answers and over 51-100, the error of the Elo ability |θ − logit(know)|
over the genera met at 50 / 100, look-alike pairs told apart, genera truly at 0.9 on the hard reference question, and
the mean surprise over the first 20 answers (right − the app's expected success):

| Profile | Answer (p imr / know) | know 100 / 300 | met 100 / 300 | right % 1-20 / 51-100 | Elo error 50 / 100 | look 300 | ref ≥ 0.9 at 300 | surprise 1-20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | today = new | 0.29 / 0.60 | 18.8 / 34.6 | 73 / 74 | 0.99 / 0.96 | 0.84 | 0.4 | +0.01 |
| lecture RA | today | 0.48 / 0.74 | 21.8 / 39.2 | 78 / 80 | 0.80 / 0.81 | 0.90 | 0.4 | +0.06 |
| lecture RA | imr (0.5) | 0.47 / 0.75 | 21.6 / 39.2 | 81 / 81 | 0.73 / 0.87 | 0.90 | 1.4 | +0.07 |
| lecture RA | imr (0.8) | 0.47 / 0.74 | 22.0 / 38.6 | 81 / 82 | 0.76 / 0.86 | 0.90 | 1.6 | +0.04 |
| lecture RA | imr (0.3) | 0.48 / 0.74 | 21.0 / 39.4 | 74 / 77 | 0.93 / 1.01 | 0.91 | 1.6 | +0.01 |
| strong RA | today | 0.68 / 0.85 | 22.8 / 39.6 | 83 / 86 | 1.40 / 1.28 | 0.95 | 10.2 | +0.10 |
| strong RA | know (1.25) | 0.67 / 0.85 | 21.4 / 39.4 | 87 / 86 | 1.20 / 1.27 | 0.96 | 10.0 | +0.09 |
| strong RA | know (1.875) | 0.66 / 0.84 | 20.8 / 40.0 | 88 / 86 | 1.09 / 1.09 | 0.95 | 10.6 | +0.05 |
| strong RA | know (0.8) | 0.67 / 0.85 | 20.8 / 39.0 | 87 / 87 | 1.23 / 1.04 | 0.95 | 10.4 | +0.11 |
| expert | today | 0.94 / 0.95 | 19.8 / 39.8 | 99 / 94 | 1.33 / 1.23 | 0.98 | 17.2 | +0.25 |
| expert | know (1.25) | 0.94 / 0.95 | 20.0 / 39.0 | 97 / 96 | 1.16 / 1.11 | 0.98 | 17.8 | +0.17 |
| expert | know (1.875) | 0.94 / 0.95 | 20.2 / 39.4 | 97 / 98 | 1.09 / 1.06 | 0.98 | 17.4 | +0.13 |
| expert | know (0.8) | 0.94 / 0.95 | 20.2 / 39.8 | 97 / 96 | 1.24 / 1.16 | 0.98 | 16.6 | +0.19 |

What it says: the right answer **keeps the learning outcomes** (true knowledge, genera met, look-alikes, genera at the
reference level: all within the spread over the seeds, ±0.01-0.02 on knowledge) and **improves the app's estimate of
the player at the start** (Elo error at 50 answers: lecture RA 0.80 → 0.73, strong RA 1.40 → 1.20, expert 1.33 → 1.16;
the expert's first-20 surprise +0.25 → +0.17: the questions fit better). It does not open genera faster: the pace is
held by `INTRO.EVERY`, the opening hotfix (`OPEN.MAX`, `OPEN.UNASKED`) and the hold, not by the starting level (met at
100 within ±1.4 genera). 0.3 for the course made the lecture RA's estimate worse (0.93); 1.875 for "know well" fits the
strong RA and the expert best but costs more when the answer is wrong, so 0.5 / 1.25.

**A wrong answer** (same runs, the fallback card kept, i.e. ignored; "today" rows above):

| Profile | Answer | know 100 / 300 | met 100 / 300 | right % 1-20 / 51-100 | Elo error 50 / 100 | surprise 1-20 |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | know | 0.29 / 0.63 | 20.2 / 36.8 | 60 / 74 | 0.92 / 0.97 | −0.15 (−0.17 to −0.13) |
| beginner | imr | 0.27 / 0.62 | 17.4 / 37.0 | 67 / 79 | 0.74 / 1.06 | −0.05 (−0.15 to +0.06) |
| lecture RA | know | 0.48 / 0.75 | 21.4 / 40.0 | 75 / 79 | 0.76 / 0.83 | −0.02 (−0.17 to +0.19) |
| strong RA | imr | 0.68 / 0.84 | 20.8 / 38.4 | 85 / 86 | 1.29 / 1.14 | +0.10 (−0.03 to +0.22) |
| strong RA | new | (today) | | 83 / 86 | 1.40 / 1.28 | +0.10 (+0.07 to +0.12) |
| expert | imr | 0.94 / 0.95 | 20.0 / 39.0 | 98 / 97 | 1.28 / 1.16 | +0.22 (+0.17 to +0.24) |
| expert | new | (today) | | 99 / 94 | 1.33 / 1.23 | +0.25 (+0.22 to +0.27) |

The cost of the worst case, a beginner who says "I know corals well", is a rougher start, **60% right over the first 20
answers instead of 73%** (harder photos, traps and single views on genera they do not know), then the Elo pulls their
level down within a few dozen answers: 74% right over answers 51-100 as before, and no loss of true knowledge (0.29 at
100, 0.63 at 300 against 0.60: the genera opened a little sooner). Under-claiming (an expert who says "new") costs what
it cost every expert before: a slow start (Elo error 1.33). In both cases the fallback card below comes at the 20th
answer (the 30th when the sign-in card, also due at 20, takes the prompt slot: `PROMPT.GAP`).

**Checked again after #415** (genus ability follows the global level, `levelMove`, merged the same day: the tables
above were run before it). `main` with #415 against this change, same seeds, right answers (and two wrong ones):

| Profile | Run | know 100 / 300 | met 100 / 300 | right % 1-20 / 51-100 | Elo error 50 / 100 | surprise 1-20 | card |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | main = new | 0.27 / 0.63 | 18.6 / 37.2 | 68 / 79 | 0.83 / 0.98 | −0.03 | none |
| lecture RA | main | 0.47 / 0.74 | 19.4 / 39.2 | 88 / 81 | 0.82 / 0.88 | +0.11 | |
| lecture RA | imr | 0.47 / 0.74 | 19.4 / 38.4 | 78 / 81 | 0.78 / 0.87 | +0.02 | none |
| strong RA | main | 0.67 / 0.84 | 21.0 / 39.4 | 89 / 87 | 1.23 / 1.09 | +0.14 | |
| strong RA | know | 0.66 / 0.84 | 20.0 / 39.0 | 86 / 84 | 0.96 / 1.12 | +0.05 | none |
| expert | main | 0.94 / 0.95 | 20.8 / 40.0 | 100 / 94 | 0.72 / 0.91 | +0.22 | |
| expert | know | 0.94 / 0.95 | 19.8 / 38.8 | 99 / 96 | 0.78 / 0.88 | +0.14 | none |
| beginner | know (card taken) | 0.28 / 0.60 | 18.8 / 34.8 | 72 / 75 | 0.99 / 0.91 | −0.06 | 2 of 5, → imr |
| expert | new (card taken) | 0.94 / 0.95 | 20.2 / 39.0 | 100 / 96 | 0.89 / 0.87 | +0.22 | 5 of 5, → imr |

With #415 the genus abilities follow the global level, so a wrong prior is corrected within a few answers: the right
answer still keeps the outcomes (knowledge within ±0.01, met within ±1 genus, sd 1.1-2.4) and brings the first-20
surprise close to 0 (lecture RA +0.11 → +0.02, strong RA +0.14 → +0.05, expert +0.22 → +0.14; strong RA's Elo error at
50 answers 1.23 → 0.96), and the worst wrong answer now costs almost nothing on this learner (a beginner who says "know
well": 72% right over the first 20, as 68% before; knowledge at 300 0.60 ± 0.05 against 0.63 ± 0.04). The per-run
surprises: consistent answers −0.10 to +0.18 (the only one under −0.08 is a beginner with "new", whose card only brings
Coral basics; strong RA with "know": −0.08 to +0.12), beginner with "know" −0.12, −0.12, −0.03, −0.02, 0.00 (2 of 5
flagged), expert with "new" +0.20 to +0.24 (5 of 5), strong RA with "new" +0.06 to +0.22 (2 of 5): LO 0.1 and HI 0.18
kept.

**Checked again after #425** (opening pace, easier questions while the hold is on; merged the same day), `main` with
#425 against this change, same seeds:

| Profile | Run | know 100 / 200 / 300 | met 200 / 300 | right % 1-20 / 51-100 | Elo error 50 / 100 | surprise 1-20 | card |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | main = new | 0.28 / 0.48 / 0.67 | 29.6 / 39.8 | 77 / 75 | 0.98 / 0.82 | +0.06 | none |
| beginner | know (card taken) | 0.28 / 0.47 / 0.62 (±0.01) | 27.0 / 34.8 | 73 / 76 | 1.19 / 0.91 | −0.02 | 1 of 5, → imr |
| lecture RA | main | 0.46 / 0.63 / 0.75 | 33.8 / 40.0 | 88 / 80 | 0.72 / 0.74 | +0.12 | |
| lecture RA | imr | 0.47 / 0.63 / 0.75 | 33.6 / 39.2 | 79 / 80 | 0.90 / 0.75 | +0.06 | none |
| strong RA | main | 0.67 / – / 0.85 | – / 40.0 | 88 / 88 | 0.99 / 1.00 | +0.14 | |
| strong RA | know | 0.68 / – / 0.86 | – / 40.0 | 83 / 84 | 0.86 / 0.89 | +0.04 | none |
| strong RA | new (card taken) | 0.67 / – / 0.85 | – / 40.0 | 88 / 86 | 1.07 / 1.06 | +0.14 | 2 of 5, → imr |
| expert | main | 0.94 / 0.95 / 0.95 | 37.8 / 40.0 | 98 / 95 | 0.78 / 0.88 | +0.19 | |
| expert | know | 0.94 / 0.95 / 0.95 | 38.2 / 40.0 | 98 / 97 | 0.84 / 0.84 | +0.12 | none |
| expert | new (card taken) | 0.94 / – / 0.95 | – / 40.0 | 98 / 96 | 0.78 / 0.90 | +0.19 | 4 of 5, → imr |

The right answers still keep the outcomes (knowledge within ±0.01, genera met within one) and bring the first-20
surprise towards 0 (lecture RA +0.12 → +0.06, strong RA +0.14 → +0.04, expert +0.19 → +0.12); the Elo error at 50
answers is better for the strong RA (0.99 → 0.86), worse for the lecture RA (0.72 → 0.90: its prior lifts the genera it
does not know; equal from 100 answers). **What #425 changed for a wrong answer**: a beginner who says "I know corals
well" now loses some knowledge by question 300 (0.62 against 0.67, sd 0.01; 35 genera met against 40): the harder start
sets the opening hold off more often, which slows the opening. And the fallback card catches it in 1 run of 5 only:
with the hold on, #425 eases the questions, so the expected success falls with the answers and the surprise stays near
0 (−0.11 to +0.03, against −0.03 to +0.11 for a beginner who said "new"). The surprise no longer tells this case apart;
open question then, answered on 2026-11-04 by the redesigned fallback test below (the first answers on each genus and
the hold during the window); the prior of "know well" kept.

**The fallback test, redesigned (2026-11-04)**, Pierre on the first rule (below): "a really weak player shows quickly
in 20 answers, but maybe re-assess at 40-50. An expert (better than declared): 20 answers isn't enough; with few genera
unlocked, even a mediocre player can get everything right by chance. How do we tell a beginner who claimed expert and is
failing from a real expert whose difficulty the game raises quickly?" The mean surprise could not: the game adapts
(the Elo moves fast since #415, and #425 eases the questions while the opening hold is on), so the expectation follows
the answers and the surprise stays near 0 for a beginner who claimed "know well" (caught in 1 run of 5). What tells
them apart is in the traces of the first 80 answers (`tools/learnsim.js` records them; profiles × answers, 5 seeds):

- **The first answer on each genus** (before the game has adapted to that genus, after its card): real experts 91-100%
  right, beginners 25-75%, whatever they declared. Fitted on the scale of the ability with each question's difficulty
  and guess rate (`core.js` `levelFit`: the level that best explains those answers, over `ELO.lo..hi`, and its
  standard error 1 / √information), it is the level of what the player knew before the game taught them.
- **The global level** (`P[LEVEL].th`, the Elo over every answer, difficulty allowed for): a beginner's climbs above
  the "new" band within 40-60 answers on the few easy genera they have learned (Pierre's "mediocre player gets
  everything right"); an expert's is far above every band.
- **The opening hold** fired during the window: it marks the run of misses that #425's easier questions then hide from
  the expectation.

**The rule** (the redesign's first version, replaced the same day by "The rule since 2026-11-04" below; `core.js` `startCheck`; `model.js` `startStep` keeps the window, `startDue` the verdict until its card):

- Each answer predicts a **band** of levels around its prior, the edges midway between the priors: "new" under 0.25,
  "IMR course" 0.25 to 0.875, "know well" above 0.875 (`startBand`; no new number).
- The window: the answers after the answer, up to 3 × `CHOICE.N` (60), as [difficulty, guess rate, right, first answer
  on its genus]; the verdict is taken at 20, 40 and 60 answers.
- **Lower** (Coral basics, or the lower answers, nearest first): the first-answer level is below the band's floor with
  95% confidence (level + 1.96 × its standard error < floor), or below the floor at all while the opening hold has
  fired in the window and the global level is not clearly above the floor (global level < floor + 1.96 × its standard
  error). From 20 answers: a weak player shows quickly.
- **Higher** (the higher answers): only from 40 answers and `CHOICE.MET` = 10 slate genera met (the same evidence as the
  open-all offer asked, until it went on 2026-11-12), the global level above the band's ceiling with 95% confidence and the
  first-answer level above the ceiling too: a player who does well only on the genera they have learned does not count.
- 1.96: the admin's 95% level margin (`levelMargin`). No new constant (`CHOICE.LO` and `CHOICE.HI` are gone); unchanged
  as they were: once per answer and direction, never with a card or the tour, never for an inferred answer, "Keep my
  answer" always. "New" has no floor: a struggling new player has Coral basics offered first and on Home already.
- Tried and dropped (same traces): the global level alone against the band (a beginner's climbs; 24/40 wrong answers
  caught, 3/20 cards to truthful answers, "higher" to 2 of 5 truthful beginners); the global level with the hold
  (31/40, 4/20); a level fitted on the whole window (24/40, 3/20); the first-answer level alone (1/40; too few first
  answers for 95% confidence without the hold) or with the hold (14/40, 4/20); the minimum of first answers and the
  bounds of the fit change nothing. The first rule (mean surprise over 20, below): 10/40, 0/20.

**Confusion matrix** (`node tools/fallbackeval.js <dir> answers.json`: the app's own `startCheck` on the traces of `tools/learnsim.js --seeds 5
--questions 300 --choice new|imr|know --fallback keep`, every profile; the truthful answers: beginner new, lecture RA
IMR course, strong RA and expert know well). "At answer": the checkpoint of the verdict; the card itself shows at the
next question the prompt spacing allows. True knowledge of the slate with the card kept, the truthful answer's in
brackets:

| Profile (truthful) | Declared | "lower" card | "higher" card | at answer | right direction | knowledge q100 / q300 (truthful) |
|---|---|---|---|---|---|---|
| beginner (new) | new (truthful) | 0/5 | 0/5 | – | – | 0.28 / 0.65 |
| beginner (new) | imr | 5/5 | 0/5 | 20, 20, 40, 40, 60 | 5/5 lower | 0.26 / 0.63 (0.28 / 0.65) |
| beginner (new) | know | 4/5 | 0/5 | 20, 20, 40, 60 | 4/5 lower | 0.28 / 0.67 (0.28 / 0.65) |
| lecture RA (imr) | new | 0/5 | 4/5 | 40, 60, 60, 60 | 4/5 higher | 0.46 / 0.76 (0.46 / 0.75) |
| lecture RA (imr) | imr (truthful) | 1/5 | 0/5 | 40 | – | 0.46 / 0.75 |
| lecture RA (imr) | know | 5/5 | 0/5 | 20, 20, 40, 60, 60 | 5/5 lower | 0.48 / 0.76 (0.46 / 0.75) |
| strong RA (know) | new | 0/5 | 4/5 | 60, 60, 60, 60 | 4/5 higher | 0.67 / 0.85 (0.67 / 0.85) |
| strong RA (know) | imr | 0/5 | 3/5 | 60, 60, 60 | 3/5 higher | 0.67 / 0.85 (0.67 / 0.85) |
| strong RA (know) | know (truthful) | 2/5 | 0/5 | 20, 40 | – | 0.67 / 0.85 |
| expert (know) | new | 0/5 | 5/5 | 60 (×5) | 5/5 higher | 0.94 / 0.95 (0.94 / 0.95) |
| expert (know) | imr | 0/5 | 5/5 | 60 (×5) | 5/5 higher | 0.94 / 0.95 (0.94 / 0.95) |
| expert (know) | know (truthful) | 0/5 | 0/5 | – | – | 0.94 / 0.95 |

Wrong answers caught in the right direction: **35 of 40** (the first rule: 10); cards to truthful answers: **3 of 20**
(the first rule: 0): one "lower" to a lecture RA, two to strong RAs, who know 60% of the genera well and the others at
10%: on their first answers they are an IMR-course player, so "I had the IMR coral course" is not a wrong suggestion.
No "higher" to a truthful player. An expert's "higher" waits for 10 genera met, so it comes at 60 answers. The wrong
answer itself costs this learner little (true knowledge within 0.02 of the truthful answer's when the card is kept):
it learns from every question and never gives up; what a wrong answer costs a real player (a discouraging start, or a
slow and boring one) is what the card is for.

**Checked again after #437** (an opening only after a right answer, merged the same day; the same traces re-run on the
merged code, same seeds): wrong answers caught in the right direction 31 of 40, cards to truthful answers 5 of 20. The
changes: a beginner who said "IMR course" caught 3 of 5 (was 5), "know well" 5 of 5 (was 4); a lecture-level RA who
said "new" moved up 2 of 5 (was 4), a strong RA who said "IMR course" 2 of 5 (was 3); a truthful beginner got "higher"
once (at 60 answers) and a truthful lecture-level RA "lower" twice (at 40). Within the spread of 5 seeds for one
profile, but the false "higher" to a beginner is the case Pierre warned about: to watch on the first real answers
(ROADMAP). The real log is unchanged (it replays the logged answers).

**Checked again after #422-#444** (hierarchical photo Elo, answer time in the ability, the rename, fish; the same traces
re-run on the merged code, same seeds): wrong answers caught in the right direction **32 of 40**, cards to truthful
answers **3 of 20**, none of them "higher" to a beginner (the false one of the #437 run is gone): two "lower" (at 20 and
40) and one "higher" (at 60) to truthful lecture-level RAs. By cell: beginner who said "IMR course" 3/5 lower (at 20),
"know well" 3/5 lower (20-40); lecture RA who said "new" 4/5 higher, "know well" 5/5 lower; strong RA who said "new"
5/5 higher, "IMR course" 2/5; expert who said "new" or "IMR course" 5/5 higher (all at 60); no card to a truthful
beginner, strong RA or expert. True knowledge with the card kept within 0.03 of the truthful answer's. The real log is
unchanged.

**With the card taken** (`--fallback accept`: the first answer the card offers, the nearest; the same seeds, the cards
shown live through the prompt spacing, so at 30 rather than 20 when the sign-in card takes the 20th answer). A change
made on a fallback card is never followed by a card the other way (`startBack`): with it allowed, 3 of 4 lecture-level
RAs who had said "new" were moved up at 60 answers and told to go back down on the next window (their first answers on
the harder genera opened next are an IMR-course player's at best, as they know 40% of the genera), a contradiction:

| Profile (truthful) | Declared | first card (taken) | at answer | answer at q300 | knowledge q100 / q300, taken | kept | truthful |
|---|---|---|---|---|---|---|---|
| beginner (new) | new (truthful) | 0/5 | – | new ×5 | 0.28 / 0.65 | 0.28 / 0.65 | 0.28 / 0.65 |
| beginner (new) | imr | 5/5 lower | 30, 30, 40, 40, 60 | new ×5 | 0.26 / 0.64 | 0.26 / 0.63 | 0.28 / 0.65 |
| beginner (new) | know | 4/5 lower | 30, 31, 40, 60 | new ×4, know ×1 | 0.28 / 0.65 | 0.28 / 0.67 | 0.28 / 0.65 |
| lecture RA (imr) | new | 4/5 higher | 40, 60, 60, 60 | imr ×3, know ×1, new ×1 | 0.47 / 0.75 | 0.46 / 0.76 | 0.46 / 0.75 |
| lecture RA (imr) | imr (truthful) | 1/5 lower | 40 | imr ×4, new ×1 | 0.46 / 0.75 | 0.46 / 0.75 | 0.46 / 0.75 |
| lecture RA (imr) | know | 5/5 lower | 30, 30, 40, 60, 60 | new ×3, imr ×2 | 0.48 / 0.76 | 0.48 / 0.76 | 0.46 / 0.75 |
| strong RA (know) | new | 4/5 higher | 60 (×4) | know ×4, new ×1 | 0.66 / 0.85 | 0.67 / 0.85 | 0.67 / 0.85 |
| strong RA (know) | imr | 3/5 higher | 60, 60, 61 | know ×3, imr ×2 | 0.67 / 0.85 | 0.67 / 0.85 | 0.67 / 0.85 |
| strong RA (know) | know (truthful) | 2/5 lower | 30, 40 | know ×3, imr ×2 | 0.67 / 0.85 | 0.67 / 0.85 | 0.67 / 0.85 |
| expert (know) | new | 5/5 higher | 60, 60, 60, 61, 61 | know ×5 | 0.94 / 0.95 | 0.94 / 0.95 | 0.94 / 0.95 |
| expert (know) | imr | 5/5 higher | 60, 60, 60, 61, 61 | know ×5 | 0.94 / 0.95 | 0.94 / 0.95 | 0.94 / 0.95 |
| expert (know) | know (truthful) | 0/5 | – | know ×5 | 0.94 / 0.95 | 0.94 / 0.95 | 0.94 / 0.95 |

Of the 40 wrong answers, 31 end at the truthful answer (every expert at "know well", every beginner who said "IMR
course" at "new"), 5 keep their answer (no card), and 4 lecture-level RAs overshoot by one ("know well" or "new": on
their first answers they sit between the two bands, knowing 40% of the genera). The knowledge moves within 0.02 either
way (this learner learns from every question whatever it said).

**On the real log** (the export of 2026-11-03, read-only): the 8 players whose first 20 answers carry the logged
expectation, each one's first 60 answers replayed under each answer (the global level by `replayProgress` with the
answer's prior; the genera met counted as the genera answered so far, fewer than the app's, which also counts cards; the
hold recomputed from the logged e as the sheet's `hold_`):

| Player | Answers | first answers right (first 60) | as "new" | as "IMR course" | as "know well" |
|---|---|---|---|---|---|
| 1 | 378 | 9/14 | none | lower at 40 | lower at 40 |
| 2 | 230 | 7/8 | none | none | none |
| 3 | 159 | 11/14 | none | none | lower at 20 |
| 4 | 112 | 8/10 | none | none | none |
| 5 | 85 | 16/20 | higher at 40 | none | lower at 60 |
| 6 | 67 | 28/33 | none | none | none |
| 7 | 40 | 7/8 | none | none | none |
| 8 | 23 | 18/20 | none | none | none |

All are IMR people (RAs after the course, and the owner's own account: row 7, 40 answers). Under "IMR course", the answer they would
give, 1 of 8 gets a card ("lower" at 40: 9 of their first 14 answers on a genus right); under "know
well" 3 of 8 get "lower"; under "new" 1 of 8 gets "higher". These answers predate the first-meeting cards (2026-11-02)
for most of them: a first answer without its card is harder, so the real log is a pessimistic test of the first-answer
level. The first rule (surprise) would have shown "higher" to 3 of 8 as "new", 2 of 8 as "IMR course".

**The rule since 2026-11-04 (Pierre's error costs; variant "Ba80H")**. On the real log the redesign above sent a
fast-learning lecture-level RA (row 1: 9 of her first 14 first answers right, then 83-90% right in every block of 40, her
global level 0.45-1.33 over 378 answers, inside or above the IMR band) "lower" at 40 answers as "IMR course": a burst
of first-meeting misses between look-alikes she had just met, at about 6 s an answer, counted twice (in the
first-answer level and in the opening hold) while her global level (0.73 ± 0.46) sat inside the band. Pierre then set
the error costs: **a true beginner left on the harder path (pressed "IMR course" or "know well") is the costliest
error**; a false "higher" to a true beginner costs a lot; a false "lower" to a truthful RA is made cheap by the card's
wording; an RA's or an expert's misclick costs little. The variants compared (same traces, checkpoints 40 and 60, 5
seeds; "caught" = the 40 wrong answers, "false" = cards to the 20 truthful answers):

| Variant | "lower" | caught / 40 | false / 20 | beginner said IMR | beginner said know | false "lower" to a truthful lecture RA |
|---|---|---|---|---|---|---|
| C (the redesign above, at 40/60) | first-answer level (95%), or the hold with the first-answer level under the floor | 28 | 2 | 1/5 | 3/5 | 1/5 |
| Cf (C, the hold on non-first answers only) | as C | 25 | 1 | 0/5 | 2/5 | 0/5 |
| Bh (the global level, 95%, or under the floor with the hold) | global level | 25 | 1 | 0/5 | 4/5 | 0/5 |
| **Ba80H (shipped)** | global level under the floor at one-sided 80%, or the hold alone | **36** | **7** | **5/5** | **5/5** | 4/5 |

"Higher" is the same in all four (the global level above the ceiling at 95%, from 40 answers and 10 genera met, the
first-answer level above it too as a guard only). Earlier checkpoints (20/40/60) or a later one (80) moved the totals
by 1-3; a direct fit of the level at first meeting and a learning speed (theta + beta log(1 + exposures)) caught 5-20
of 40 with no false card: too wide on 40-60 answers.

**What 40-60 adaptive answers cannot tell apart**: a true beginner who pressed "IMR course" and a truthful lecture-level
RA look the same on every signal the rule can read (5 seeds each, at 40 and 60 answers): the global level (beginner
1.0-1.9, mean 1.5; lecture RA 0.8-2.6, mean 1.5), the first-answer level (both from -1.5 up), the right answers (65-80%
against 73-85%), the opening hold (fired in 5 of 5 against 4 of 5), the mean surprise (about 0 for both). The game aims
its questions at the player's level, so their results converge; their true success differs (about 0.54 against 0.68)
but the window is too short to show it. Lowering the margin alone (90%, 80%) catches no beginner who said "IMR course":
their global level is far above the IMR floor (0.25). Only the hold alone does, and it fires as often for truthful
lecture RAs: catching the first costs about one false "lower" to the second. Pierre took that trade, because the
"lower" card is now a gentle offer (below). The robust fix is a placement test (ROADMAP).

**The rule** (`core.js` `startCheck`, `CHOICE.AT` [40, 60], `CHOICE.ZL` 0.84; `model.js` `startStep` keeps the window up
to 60 answers, `startDue` the verdict until its card):

- No verdict before 40 answers, in either direction; checkpoints at 40 and 60.
- **Lower** (only for "IMR course" and "know well": "new" has no floor): the global level is under the band's floor with
  one-sided 80% confidence (level + 0.84 × its standard error < floor), or the opening hold has fired in the window.
- **Higher**: as before (95%, 10 genera met, the first-answer level above the ceiling as a guard, never a trigger).
- Unchanged: once per answer and direction, never with a card or the tour, never for an inferred answer, no move back
  after a change (`startBack`; the silent move below counts as a move down).

**The "lower" card is a gentle offer** (`quiz.js` `startFbShow`; Pierre, 2026-11-04: an RA or an expert who gets it by
mistake must not feel judged): 💡 "A tip", "The first genera feel hard?", "They do for most people. Coral basics shows,
on real photos, the few words the ID tips use: corallites, septa, walls. About 5 minutes." (for a player who opened every
genus at once, Pierre 2026-11-04: "All the genera at once is a lot" and "Coral basics in 5 minutes? …", from the subject's
words, never a number of genera); two buttons of equal weight
(both outlined): **Coral basics in 5 minutes** and **No thanks, I know the basics** (Escape). Nothing says what the
player answered or that their level is low. "No thanks" changes nothing (the answer, the variables and the progress
stay) and the card never comes back in that direction for that answer. **Coral basics** opens Coral basics and, silently,
moves the start variables one band down (`model.js` `startEase`: know well → the IMR course's, IMR course → new's: the
prior p, and until 2026-11-12 the open-all offer's `at`), kept apart from the answer given (an ease event in the record's history, `reefid-sync-coral-start` h, applied from its time to that
answer only; the answer is never relabelled; the admin's journey shows "Eased"; the full replay applies it
from its time, `startPriorAt`; the live game applies the prior, eased or not, only once the sheet runs v36, `START_SHEET`, so a replay never takes it back). Coral basics already done: no "lower" card (it is the Coral basics offer).

**The honest size of the silent move**: p only sets the starting ability of a genus never answered (`playerStart`:
W (m t + N p) / (m + N), W 0.8, N 10, m the answers in the global level). The prior's weight N / (m + N) is 0.20 at 40
answers and 0.14 at 60, so the first question of each genus opened afterwards starts lower by W × weight × Δp: know →
IMR course (Δp 0.75) 0.12 logit at 40, 0.09 at 60; IMR course → new (Δp 0.5) 0.08 at 40, 0.06 at 60: about 1-2 points
of expected success on a 4-choice question, on new genera only (genera already answered and the global level do not
move). The open-all offer (until 2026-11-12): know → IMR course moved its earliest answer from 20 to 30, already passed at 40; IMR course →
new from 30 to 50: an offer not made yet by answer 40 waits up to 10 more answers; none at 60. Small by design: the
substance of the card is Coral basics itself, which learnsim does not model.

**Matrix on the shipped code** (`tools/fallbackeval.js`, the traces re-run with `tools/learnsim.js --seeds 5
--questions 300 --choice new|imr|know --fallback keep`):

| Profile (truthful) | Declared | "lower" card | "higher" card | at answer | right direction | knowledge q100 / q300 (truthful) |
|---|---|---|---|---|---|---|
| beginner (new) | new (truthful) | 0/5 | 0/5 | – | – | 0.25 / 0.62 |
| beginner (new) | imr | 5/5 | 0/5 | 40 (×5) | 5/5 lower | 0.26 / 0.62 (0.25 / 0.62) |
| beginner (new) | know | 5/5 | 0/5 | 40 (×5) | 5/5 lower | 0.26 / 0.65 (0.25 / 0.62) |
| lecture RA (imr) | new | 0/5 | 4/5 | 60 (×4) | 4/5 higher | 0.46 / 0.76 (0.45 / 0.75) |
| lecture RA (imr) | imr (truthful) | 4/5 | 0/5 | 40, 40, 40, 60 | – | 0.45 / 0.75 |
| lecture RA (imr) | know | 5/5 | 0/5 | 40 (×5) | 5/5 lower | 0.46 / 0.76 (0.45 / 0.75) |
| strong RA (know) | new | 0/5 | 5/5 | 60 (×5) | 5/5 higher | 0.66 / 0.85 (0.67 / 0.85) |
| strong RA (know) | imr | 1/5 | 2/5 | 60 | 2/5 higher | 0.67 / 0.85 (0.67 / 0.85) |
| strong RA (know) | know (truthful) | 3/5 | 0/5 | 60 (×3) | – | 0.67 / 0.85 |
| expert (know) | new | 0/5 | 5/5 | 60 (×5) | 5/5 higher | 0.94 / 0.95 (0.94 / 0.95) |
| expert (know) | imr | 0/5 | 5/5 | 60 (×5) | 5/5 higher | 0.94 / 0.95 (0.94 / 0.95) |
| expert (know) | know (truthful) | 0/5 | 0/5 | – | – | 0.94 / 0.95 |

Wrong answers caught in the right direction **36 of 40** (every beginner who claimed the course or more, at 40 answers);
cards to truthful answers **7 of 20**, all gentle "lower" offers (4 lecture RAs, 3 strong RAs), none "higher" to a
beginner; one strong RA who said "IMR course" got "lower" instead of "higher". The knowledge stays within 0.03 of the
truthful answer's whether a wrong answer is corrected at 40, at 60 or never (switch runs at 20-80 answers, same seeds):
a later correction costs no measurable knowledge in this learner.

**On the real log** with the shipped rule (the 7 players with 40 answers or more; row 8 has 23): as "IMR course" rows 1
and 3 get the gentle "lower" offer at 40, row 5 at 60; as "know well" the same three; as "new" row 5 gets "higher" at 40;
rows 2, 4, 6 and 7 nothing. No player started under today's regime (the newest first answer predates #425 and #437)
and three windows predate the first-meeting cards: a sanity check, not a measure.

**The first rule (2026-11-03, replaced on 2026-11-04)**:

Fallback for everyone (Pierre: "also for those who answered, since they may have picked wrong"). Not the right %:
the game aims every question at about 80% right, so the right % hardly tells the players apart (it never did: "Offer to
open all", above). What tells whether the answer fits is how far the answers beat or miss **what the app expected from
that answer**: the mean surprise (right 1 / wrong 0 − the logged expected success `e`) over the first `CHOICE.N` = 20
answers after the choice (Pierre: 15-20), summed by `startStep` from `holdStep`, the opening hold's own feed. Below
−`LO` = −0.1: clearly harder than predicted (`lo`); above `HI` = +0.18: clearly easier (`hi`). Asymmetric because the
app under-estimates every simulated player at first (consistent answers average +0.01 to +0.17, never below −0.09):

| First-20 surprise per run (5 seeds) | consistent answer | wrong answer |
| --- | --- | --- |
| beginner | new: −0.09, −0.03, +0.03, +0.03, +0.14 | know: −0.17, −0.17, −0.14, −0.13, −0.13; imr: −0.15, −0.13, −0.03, −0.02, +0.06 |
| lecture RA | imr: −0.04, +0.01, +0.03, +0.15, +0.22 | know: −0.17, −0.07, −0.05, −0.01, +0.19; new: −0.04 to +0.12 |
| strong RA | know: +0.07 to +0.10 | imr: −0.03 to +0.22; new: +0.07 to +0.12 |
| expert | know: +0.14 to +0.21 | imr: +0.17, +0.22, +0.22, +0.23, +0.24; new: +0.22 to +0.27 |

LO 0.1 flags the beginner who said "know well" in 5 runs of 5 and "IMR course" in 2 of 5, and no run of a consistent
answer that has a lower one (the beginner's −0.09 with "new" would only bring Coral basics, which suits a struggling
beginner); HI 0.18 flags the expert who said "new" in 5 of 5 and "IMR course" in 4 of 5, a lecture RA who said "IMR
course" in 1 of 5 (its 0.22: that run knew its genera well; the card then costs a tap). The card: "Harder than
expected?" with the lower answers (nearest first) and a Coral basics link, "Corals are new to you?" with Coral basics
for "new", or "You know more than you said" with the higher answers; "Keep my answer" always. **Once per inconsistency**:
once per answer and direction (`fb['know-lo']`), marked when shown; a player who moved one answer down and still
struggles is told once more, never twice about the same answer. Never with a card, the tour or an achievement
(`promptOk`), never in the floor of a visit (`noOpen`), never for an inferred answer. Picking an answer re-initialises
the variables (startSet: the next genera start from the new level; until 2026-11-12 the open-all offer from its `at`); answers,
abilities and progress are kept.

With the card taken (`--fallback accept`: the first answer it offers, the nearest; the final code, same seeds): the
beginner who said "know well" got it at the 30th answer in 5 runs of 5 (the sign-in card took the 20th) and moved to
"IMR course"; true knowledge 0.29 / 0.61 (kept: 0.29 / 0.63, today 0.29 / 0.60). The beginner who said "IMR course":
2 of 5 moved to "new" (0.27 / 0.61). The expert who said "new": 5 of 5 moved up (one run twice, to "know well", after
the second card for "IMR course"), 0.94 / 0.95, Elo error 1.35 / 1.23; who said "IMR course": 4 of 5 to "know well".
On this learner, taking the card changes the outcomes within the spread: what it repairs is the fit of the questions
(the first-20 right % and the Elo error above), and, for a real player, the feeling the game is too hard or too slow,
which the learner does not have.

**On the real answer log** (`answers_fresh.json`, the sheet's Answers tab read 2026-11-03, read-only, aggregates only):
the 8 players whose first 20 answers carry the logged expectation (all of them IMR people: RAs after the course and the
owner's own account), first-20 surprise as logged (the answer "new", which was everyone's start) and re-expressed
under each answer's prior (each answer's expectation moved by W × p × N / (m + N) logits on the m-th answer, the
prior's weight in `playerStart`; an approximation: with a higher prior the questions themselves would have been harder,
so these are upper bounds):

| Real player (first 20 right) | as "new" | as "IMR course" | as "know well" |
| --- | --- | --- | --- |
| 1 (19) | +0.22 hi | +0.19 hi | +0.14 |
| 2 (18) | +0.16 | +0.13 | +0.08 |
| 3 (15) | +0.03 | 0.00 | −0.04 |
| 4 (17) | +0.12 | +0.09 | +0.05 |
| 5 (19) | +0.22 hi | +0.18 hi | +0.14 |
| 6 (16) | +0.01 | −0.02 | −0.06 |
| 7 (19) | +0.20 hi | +0.17 | +0.13 |
| 8 (18) | +0.10 | +0.07 | +0.04 |

The app's own replay of the log (`node tools/abilityeval.js`, next-answer log-loss and calibration) is identical before
and after, to the digit: the logged players never answered the question, so they keep the default (p 0); the prior can
only be judged on the log once players have answered it. No real player would have met a `lo` card under any answer (the lowest −0.06); with "IMR course", the answer RAs are
expected to give, 2 of 8 (19 right in 20) would have been offered "I know corals well"; none with "know well". The 3 of
8 flagged as "new" all answered 19 of 20 right. The thresholds are a first calibration: recalibrate on the first
cohort that answers the question (the log will then hold who said what; ROADMAP).

**Inferred for existing players** (50 answers or more, `startInfer`): the answer whose starting level W × p is nearest
the player's global level (under 0.2 new, under 0.7 IMR course, else know well). On the real log, the global level
backed out of the logged starting ability of each new genus (`playerStart` with p 0), the 7 players with 50 answers or
more come out know well 3, IMR course 2, new 2 (the estimate is rough: one test account answered at random for a while).
It changes little for them: at 50+ answers the prior weighs a sixth or less, the offer window has opened, and no
fallback card comes for an inferred answer; it is shown as "inferred" in the admin's player journey.

**Changed by Pierre** (2026-11-08, Q228: a fallback card had moved a player who is no expert from "IMR course" to "know
well"): the admin's Players changes a player's answer for one subject (`core.js` `startAdminSet`, sheet v99
`userStart`). It is a choice event appended to the record's history, via `admin`, at the time of the change: the answers
before it keep the prior they had (`startPriorAt`), the next ones take the new one, and every device merges it at its
next sync (`startUnion`: the latest answer wins). The fallback window restarts from the change, as after an answer given
in the app (`startSet`: its answers, hold, epoch and pending verdict go; the cards shown stay), so the level card is still
offered (Pierre, 2026-11-08: "if the player then turns out much better than I thought, the level card must still be
offered"), on the answers given after the change only: at 40 and 60 of them.

**Rules version 3** (2026-11-04, after the full replay #399): the prior moves the ability of a genus's first answers,
hence the progress, so the replay applies it: `core.js` `replayProgress` takes each player's `reefid-sync-coral-start` record
(`starts`) and, at each answer, the prior of the answer then in force (`startPriorAt`, from its history `h`; 0 before the
first, the player then played as the default player); `abilityOf` and `eloStep` take the prior. The sheet (v29) reads it
from the saved data or an anonymous device's send, the admin from the saved copy, the app from its store. RVS v3 with
the standard card (`RV_CARD`).

### Comeback after a break (2026-11-02)

Pierre: a player coming back after a night (6-8 h) already has some rust, after days or weeks much more; an expert needs
almost none even after a long absence; a 10-minute break needs none. The first version (the same day) was a fixed
**gentle restart**: 10 easy questions on genera already answered right at every page load (`WARM` in `quiz.js`), left out
of the opening hold. Replaced by a comeback planned from the time away and how solid each genus is, ended by the answers,
with no cap and no duration threshold (`model.js`, "Comeback after a break"; `quiz.js` `planPhoto`, `answer`).

**Time, only here** (rule L1, exception approved by Pierre the same day: "the no-time rule was there because
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
- **Kept**: on the device, `reefid-comeback` {r rust, t time accounted, ok right answers in the comeback, f the answer count
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

- **Opening by results** (one rule since 2026-11-03, below): when the path allows a card (no opening hold, not in the floor of a visit
  or a comeback, the opening's pace, the right-answer rule; `INTRO.EVERY` went on 2026-11-14), the question opens a genus
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
  behind the photo ratings, over `OPEN.DATA` = 300 (weighed), up to 1. Before real answers, the photo sets (removed
  2026-11-03) and declared look-alikes put Acropora and Galaxea among the hardest and Alveopora first, against Pierre's
  experience: the opening order stays random (still a few genera at a time) until the answers can say.
- **Genus difficulty from the data** (`genusDiff`), never set by hand: since 2026-11-06 (Q133, "One genus difficulty"
  below) the sheet's genus offset `gd` (the hierarchical photo Elo's genus term, learned from every trusted answer on
  the genus, "Hierarchical photo Elo"), plus, for a unit with judged photos (the fish), the mean of their judged-ease
  priors. Until then: the mean difficulty of its game photos + `OPEN.CONF` (2) × its two highest pooled confusion
  scores above `CONF.TRAP`. With no answers every coral genus is 0 and the opening order is random (and `easyTrust` is
  0 anyway); the answers take over as they come. On the answers of 2026-11-03 the genus offsets put Acropora (−0.54)
  and Galaxea (−0.56) among the easiest, as Pierre expected.

### One genus difficulty (2026-11-06, Q133)

Pierre approved (2026-11-06) the coherence review's F3 (PR #664): the app
had its own estimate of a genus's difficulty (`model.js` `genusDiff`: the mean `photoDiff` over today's game photos +
`OPEN.CONF` × the confusion above `CONF.TRAP`), beside the sheet's genus offset `gd` that measures the same quantity.
The confusion term counted the misses a second time, since the photo ratings already come from them, and the mean
moved whenever photos were added or curated out (the effect Pierre asked the new bar to avoid).

- **The rule** (`model.js` `genusDiff`): `gd` (`PGD`, `?stats=1` from sheet v31) everywhere the app reads a genus's
  difficulty: the draw (`drawW`), shaky (Review, the opening's work-in-progress limit), the comeback's `stability` and the
  opening order (`openPick`). A unit with judged photos (the fish, whose answers are not logged yet) adds the mean of
  their judged-ease priors, so the fish still open easiest first. `OPEN.CONF` is gone. Adding or removing a photo never
  moves a coral genus's difficulty now.
- **Measured with the real stats** (rule L12, read-only: `?stats=1` of 2026-11-05, 1,033 rated photos, 45 genus
  offsets; the app's own `genusDiff`, `photoDiff` and `pooledConf` in the real page): over the 40 game genera the
  confusion term was above 0 for 21 (mean 0.09, at most 0.52: *Fungia* 1.01 → 0.48, *Lithophyllon* 0.75 → 0.39,
  *Favites* 0.50 → 0.15, *Dipsastraea* 0.36 → 0.05, *Lobactis* 0.37 → 0.07, *Goniastrea* 0.52 → 0.27); old against new:
  mean difference 0.10, Spearman rank 0.97, the 8 easiest genera the same. Under the old rule, 3 new photos added
  moved a genus by up to 0.02 and the most-answered photo curated out by up to 0.05 (median 0.00 both: the photo
  ratings already lean on the offset), and now by 0. On the real players (2,047 answers, 10 players, each player's
  replayed abilities): of the 258 (player, genus met) pairs, 8 stop being shaky and none becomes shaky (the genera the
  confusion term made look harder), and the draw weight moves by a median 0.00 (90th percentile 0.01).
- The single-view offset (+0.5, `PICKD.SINGLE` in the app, a literal in `Code.gs` `stats_` and `core.js` `eloReplay`) is
  left as it is for now (F3's third point: a refactor that changes nothing).

- **Simulated** (rule L11 tier 1: `node tools/learnsim.js --seeds 5 --stats <the same ?stats=1>`, the four profiles ×
  5 seeds, `main` against this rule on the same seeds; the primary measure declared before the second run: true
  knowledge over the slate at question 300, pooled, exact sign-flip over the 20 pairs). Primary: 0.810 → 0.808, −0.002
  (90% bounds −0.004 / 0.000), p 0.24: no change. Guardrails (one-sided 90% bounds of the paired difference): genera
  met at question 200 −0.3 (−1.0 / +0.4), progress shown at 300 −0.1 points (−0.9 / +0.7), |θ − true| at 300 +0.03
  (−0.00 / +0.05). Exploratory, uncorrected: right answers over questions 200-300 83.9% → 82.4% (−1.6 points, p 0.04),
  a little closer to the success aimed at; genera met at 100 −0.5 (p 0.08). No measured reason to keep the confusion
  term, so it goes (rule L11).

### One opening rule (2026-11-03)

The independent review's item 6: the opening was throttled twice, by a share of the genus draw for the genera not met
yet (`OPEN.READY` 35% down to `OPEN.TRICKLE` 3% at `OPEN.K` 10 shaky genera, the share arithmetic in `weighted`) and by
`INTRO.EVERY` (2 answers between cards); since then the opening hold (`introHold`) and the floor after a break
(`noOpen`) joined them. The last three are rules about *when* a card may come; the share was a second way of saying
*how often*. Now one: when a card may come, the question opens a genus with the chance `openChance` = 1 − shaky /
`OPEN.K` (`model.js`), the genus drawn among those not met yet by `openPick` (easiest first as far as the data are
trusted, most common first; since 2026-11-14 by confusion group first: "Confusion groups"); since 2026-11-12, from 200 answers, a genus still shaky after 10 of its own
answers takes no place ("A unit stuck shaky"). The genus draw (`weighted`) only weighs the genera met. `READY`, `TRICKLE` and
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

### A unit stuck shaky (2026-11-12, Q337, Q338)

**Adopted** (Pierre, 2026-11-12, Q338, after the two calibrations below: "option a, B10 après 200 réponses"): a unit
still shaky after `OPEN.STUCK` = 10 of its own answers (its `ok` + `ko`) takes no place among the `OPEN.K` places of
`openChance`, once the player's answers so far are `OPEN.STUCK_FROM` = 200 or more (`model.js`). Before 200 answers the
rule is off and every shaky unit takes its place, as before; no level condition ("Above a level" showed that no
threshold on the global level spares the simulated beginner, whose level is past every L of the grid from about answer
200). The unit stays shaky (Review, the draw, its bar): it only stops holding the others back.

- **The count**: `answersSoFar()`, the subject's global level record `P['~level']` `ok` + `ko`, the count the game
  reads against `ELO_MIN` (200, `progress.js`) before it shows the Elo and counts its achievements ("What each number
  measures"). A progress reset clears it, so the rule is off again for the next 200 answers.
- **Every subject**: the engine is shared, so the fish units are covered too, each subject on its own record's count
  (the fish answers for the fish, the coral answers for the corals). Calibrated on the corals; the fish rated world,
  which "Above a level" never reached (no arm was left in), was run in the PR that adopted it (below): every guardrail
  held.
- **The cost Pierre accepted**: the rule is "Above a level"'s arm "N 10, floor alone". In the rated world the simulated
  beginner's shown score at 1,000 answers is lower, −0.8 points on seeds 301-310 and −1.9 (bound −3.6) on 301-320, with
  0.8 to 2.3 fewer units at Open Water by then (N 10 with no floor: −1.2 to −4.7 points on the seeds of both
  calibrations). True knowledge is not lower (D\* +0.005 at 1,000 answers, +0.015 at 300, seeds 301-320). The two real
  players held by stuck genera get their first new genus 4 and 7 answers into their stretches (the median), where the
  opening as it was gave none in the first stretch and the median at 42 answers in the second.
- **Checked in the PR that adopted it** (rule L11 level 2 as a regression check, the value decided; no new calibration):
  unit tests (`tests/pace.test.js`: before 200 answers unchanged; from 200, a unit shaky after 10 of its own answers
  takes no place, one with 9 keeps it); `tools/learnsim.js`, 5 seeds × 300 questions, the four coral profiles and the
  five fish profiles, against the same code with the rule off (`OPEN.STUCK_FROM` ∞), `tools/learncmp.js`: every
  guardrail held for every profile of both subjects. The coral lecture RA, strong RA and expert gave the base's rows to
  the decimal, the fish profiles too but one figure (the casual diver's openings held in expectation, 18.9 → 19.0): the
  rule is live only from answer 200 here. The coral beginner: units at Open Water at 300 2.4 → 2.2, one run of 5 with
  its first unit at Open Water after answer 300 (before, about 275), true knowledge 0.681 → 0.682, the longest plateau
  59 → 60: the cost above, small in 100 answers. `tests/profiles.smoke.js` and `tests/draw.smoke.js` pass. The real
  log, the two stretches replayed through `model.js`'s own `openChance` and `OPEN` (stubs for the shaky units and their
  answers): first opening at answer 4 (P1) and 7 (P2), the median, as the calibration's "floor alone" row; the same
  rows with the answers counted under 200 give the base's (P1 none, P2 42).
- **The rated world** (the same PR; 1,000 answers, seeds 301-310, the count learner, normal photos, `tools/learncmp.js`
  `--looks 2`): the corals gave "Above a level"'s "N 10, floor alone" rows seed for seed (every profile), so the cost
  above is the rule as shipped. The fish, the five profiles against the rule off: every guardrail held but the
  beginner's E at 300, unclear on the first look (+0.002, bound +0.031); on 20 seeds (311-320 added, the beginner) held
  (+0.007, bound +0.025), and every other beginner cell held too: shown score at 1,000 34.3 → 34.1 (bound −0.6), units at
  Open Water at 1,000 24.1 → 24.6, longest plateau 99 → 96, true knowledge 0.464 → 0.466. The casual diver and the
  lecture RA held every cell (shown score within 0.2 points, units at Open Water within 0.3; the lecture RA's longest
  plateau 144 → 152, inside its margin of 29); the strong RA and the expert gave the base's rows to the decimal. The
  fish beginner pays none of the coral beginner's cost here.

The two calibrations that led there, kept as they were run:

#### Calibrated, not adopted (Q338 (a), 2026-11-12)

Pierre, 2026-11-12, Q338 (a): "Ok pour essayer B10, calibré avant la pull request": a unit still shaky after
`OPEN.STUCK` of its own answers (its `ok` + `ko`) stops taking a place among the `OPEN.K` places of `openChance`; N
calibrated among 8 / 10 / 12 / 15 before the PR. Why: two coral players past 200 answers (their global level
0.64-0.95 then; their 75-83% right says nothing of a level: "What each number measures") were held 63-147 answers with
no new genus by 8 or more genera that stayed shaky for good (the shaky study of 2026-11-12, read-only, on the real log).

**Plan, declared before the runs** (rule L11; committed before any output):

- **Level 2** (the opening, for everyone), 10 seeds; choosing a value is level 3 in L11's table, so the four N against
  the base are read with Holm for the primary and `--looks 2` for the bounds (10 seeds, then 20 on an unclear cell only).
- **Arms**: base = `main` at a68f8abe; N 8, 10, 12, 15 = this branch with `OPEN.STUCK` set to N (one scratch copy,
  patched in turn). Checked first: the branch with N = Infinity gives the base's answers, seed for seed (2 seeds), so
  the offer's removal and the learnsim change are no-ops in the simulation (it declines the offer by default).
- **The app world**: `tools/learnsim.js`, corals, the four profiles, seeds 201-210 (`--seed0 200`; the studies used
  1-5), 300 questions, `--stats` the shaky study's genus offsets (`gd` as last logged), the item learner and
  `--learner field`.
- **Primary** (app world): the answers to meet 36 of the 40 slate genera (90%; 301 when not by question 300), lecture
  RA and strong RA, pooled over both learners (40 pairs per N), down; the stratified sign-flip of `tools/learncmp.js`,
  Holm over the four N. Expected near zero (the study's simulated RAs rarely had 8 shaky genera); the pick below does
  not depend on it.
- **Guardrails** (each N against the base, each learner): beginner genera met by question 100, the mean over the seeds
  at most 17 (the CI limit, `tests/profiles.smoke.js`, which must also pass on the N chosen); beginner right % over
  answers 1-100, the one-sided bound of the paired difference above −3 points; `tools/learncmp.js`'s guardrails at
  the checkpoints the run reaches (true knowledge, E, genera met, plateau), every profile. Cost accepted: the beginner
  may meet more genera by question 100, up to the limit.
- **The rated world**: `--world rated`, corals, the four profiles, seeds 201-210, the count learner, 1,000 answers
  (the largest checkpoint its guardrails read once the opening is over), `tools/learncmp.js` base against each N.
- **The real log** (rule L12): the shaky study's replay of the two real stretches (P1, P2), for each N: the chance of no
  opening in the stretch and the median answer of the first opening. A replay cannot judge the questions a different
  draw would ask; it says when the first card could have come.
- **The pick**: among the N whose every guardrail holds in both worlds and both learners (and the CI profile test), the
  largest (the least change from today) whose first opening comes, as the median, within `OPEN.WIN` (15) answers in
  both real stretches. The study's replay numbers were known when this rule was written (B8 1 / 3, B10 7 / 4, B12 7 /
  28, B15 38 / 34); `OPEN.WIN` is the existing window of the opening pace, not tuned to them. The new evidence is the
  simulations on fresh seeds. No N left: no value ships, the question goes back to Pierre.
- **The offer's removal** (Q337, exploratory): `main` with the offer accepted (`--openall offer`) against `main`
  declining it, the same seeds, the item learner: what a player who would have accepted it gets now.
- **Added after the first look** (rated world, before running it): every N breached a rated-world beginner guardrail
  (the shown score at 1,000 answers), so no N passes and the breach stands; N 10 against the base on 10 more seeds
  (211-220), the beginner only, sizes that cost for Pierre and decides nothing.

**Results** (2026-11-12; the branch with N = Infinity gave the base's rows seed for seed in both worlds, so only N
differs).

The app world, means over seeds 201-210 (lecture RA and expert: the same to the decimal for every N, both learners;
item learner: every profile within 0.4 genus and 0.001 of knowledge of the base):

| Arm | to90 RA, pooled (Δ, p) | item beginner: to90 / met 100 | field beginner: met 100 / met 300 / know 300 / right % 1-100 | field strong RA: to90 |
| --- | --- | --- | --- | --- |
| base | | 228.6 / 18.3 | 15.9 / 30.6 / 0.591 / 68.9 | 212.0 |
| N 8 | −1.7, p 0.47 | 239.3 / 18.2 | 16.3 / 32.9 / 0.618 / 67.9 | 205.2 |
| N 10 | −1.0, p 0.50 | 225.0 / 18.3 | 16.0 / 32.4 / 0.606 / 68.9 | 208.0 |
| N 12 | −0.8, p 0.50 | 228.6 / 18.3 | 15.9 / 29.8 / 0.585 / 68.9 | 208.7 |
| N 15 | −0.2, p 1.00 | 228.6 / 18.3 | 15.9 / 30.6 / 0.589 / 68.9 | 211.4 |

The primary is not shown for any N (Holm; 1 to 7 of the 40 pairs differ at all: the simulated RAs rarely hold 8 shaky
genera). `tools/learncmp.js`, `--looks 2`: every guardrail cell held for every N and both learners, except the field
learner's beginner with N 8 (the first unit at Open Water and the longest plateau unclear; not looked at again, it
cannot change the pick). The beginner limit as declared (a mean of 17 genera by question 100) cannot judge here: the
base itself is at 18.3 with the item learner on these seeds and these genus offsets (the CI test's own setting has no
`--stats`), and no N moves it by more than 0.4.

The rated world, 1,000 answers, the beginner (the other profiles: held, but for three unclear cells within a point:
N 8 lecture RA's score, N 15 strong RA's score and N 15 beginner's knowledge at 300):

| Arm | score at 1,000 | longest plateau | first unit at Open Water | units at Open Water 1,000 | D* 1,000 |
| --- | --- | --- | --- | --- | --- |
| base | 46.2 | 66 | 134.9 | 21.4 | 0.895 |
| N 8 | 42.1, breached | 97, breached | 152.0, unclear | 18.4, breached | 0.911 |
| N 10 | 43.1, breached | 95, breached | 142.4, unclear | 19.6, unclear | 0.903 |
| N 12 | 43.4, breached | 74, unclear | 162.1, breached | 20.0, unclear | 0.902 |
| N 15 | 45.1, breached | 68 | 134.7 | 21.4, unclear | 0.901 |
| N 10, 20 seeds | 43.2 → 38.5 (−4.7, bound −6.7) | 78 → 119 | 150.9 → 197.2 | 20.1 → 17.0 | 0.859 → 0.882 |

A beginner whose genera stay shaky is opened more genera: it knows as much or a little more (D\*), but its answers
spread over more of them, so fewer reach Open Water by 1,000 answers, the shown score is 3-5 points lower and its
longest stretch without a new point is a third to a half longer. A cost the plan did not declare.

The real log, the two stretches (P1: 63 answers, 46 with every other gate open; P2: 117 answers, 78): the median
answer of the first opening, and the chance of none in the stretch:

| Arm | P1 | P2 |
| --- | --- | --- |
| base | none (1.0) | 42 (0.15) |
| N 8 | 3 | 1 |
| N 10 | 4 | 7 |
| N 12 | 28 | 7 |
| N 15 | 34 | 38 |

A third player's stretch (101 answers after many genera met at once) had 19-24 shaky genera, most with fewer than 8
answers of their own: no N opens anything there.

**The pick: none.** N 12 and N 15 do not open both stretches within `OPEN.WIN`; N 8 and N 10 do, but breach the
rated-world beginner's guardrails. So no value ships (the plan's last line) and Q338 goes back to Pierre with these
tables: N 10 frees both real stretches within 4-7 answers and costs nothing measurable in the app world, but in the
rated world a beginner sees a lower score and longer plateaus (knowledge not lower). The patch for N 10 is kept off
the repository, ready if he accepts that cost.

**The offer's removal** (Q337; seeds 201-210, item learner; `main` taking the offer against declining it, which is now
every player): the offer came at answer 50-53 in all 40 runs. Over the 30 answers after it, right % taking it against
declining: beginner 61.3 against 77.7 (−16.3), lecture RA 73.0 against 84.0 (−11.0), strong RA 75.3 against 87.7
(−12.3), expert 94.0 against 95.0; true knowledge at 300 within 0.006 either way; the back card came in 7 of 10
beginner runs and 3 of 10 lecture RA runs. The same dip the real log showed (4 of 9 who took it, −13.5 points), for
no gain in knowledge: removing the card costs those players nothing measured.

#### Above a level (Q338 (b), 2026-11-12)

Pierre, 2026-11-12, Q338: "option b, B10 au-dessus d'un niveau Elo", and "le niveau Elo n'est pas stable avant un
paquet de réponses". The rule: a unit still shaky after `OPEN.STUCK` = 10 of its own answers takes no place in
`openChance` only while the player's global level `P['~level'].th` is at least `OPEN.LEVEL` (L) and rests on at least
`OPEN.SETTLED` answers; below L, or before that many answers, the opening is as today.

**The floor, not calibrated**: `OPEN.SETTLED` = 200, the game's own `ELO_MIN` (`progress.js`: the Elo is shown, and the
Elo achievements count, only from 200 answers; Pierre, 2026-11-01, "even 50 is not enough to settle the score"). The
global level's step is then 0.8 / (1 + 200 / 15) ≈ 0.06 logit an answer, a fourteenth of its first ("Ability per genus
(Elo) and the global level"). Before it the rule is off, the simplest choice: no second level read on an unsettled
Elo. Both real stretches are past 200 answers (P1 from answer 384, P2 from 265).

**Plan, declared before the runs** (rule L11; committed before any output):

- **Level 2** (the opening), choosing a value level 3: the arms against the base with Holm for the primary and
  `--looks 2` for the bounds (10 seeds, 20 on an unclear cell), as #852; the value picked confirmed on fresh seeds.
- **Known when this was written**: the global levels of #852's app-world runs (seeds 201-210, base): the beginner
  0.6-1.4 from answer 200 (item learner 0.67-1.35 at 200, 0.76-1.15 at 300; field learner 0.58-0.73, 0.57-0.90), the
  lecture RA 0.9-1.7; the two real stretches replayed, P1 0.64-0.87, P2 0.74-0.95. So in the app world no L of the
  grid is expected to keep the rule off for the simulated beginner past answer 200; the rated world, where #852's cost
  showed, has kept no level so far (`tools/ratedworld.js` now writes it: `level` at each checkpoint, `lv` every 25
  answers).
- **Arms**: base = `main` at 02e5e010; N 10, floor 200, L ∈ {0.25, 0.5, 0.75} (the grid; L 1.0 would be over both real
  stretches); two references, N 10 ungated (#852's rule: floor 0, L −∞) and N 10 with the floor alone (L −∞), so the
  floor's share of any effect is seen apart from L's. N 8 and N 12 are not run: N 12 already opens P1 only at answer 28
  ungated, and a gate can only delay it; N 8 costs at least as much as N 10 wherever the gate is on.
- **Checked first**: L = ∞ gives the base's rows seed for seed (2 seeds, both worlds).
- **Order**: the real log, then the rated world, then the app world for the arms still in (an arm out at one step is
  not run at the next).
- **The real log** (rule L12): the shaky study's replay of P1 and P2, each answer with the replayed global level and the
  answers before it; for each arm, the median answer of the first opening and the chance of none in the stretch. In:
  the median within `OPEN.WIN` (15) in both stretches.
- **The rated world**: corals, the four profiles, seeds 301-310, the count learner, normal photos, 1,000 answers;
  `tools/learncmp.js` base against each arm, `--looks 2`, every guardrail at every checkpoint, every profile (#852's
  breach was the beginner's score at 1,000 and its longest plateau). An unclear cell: 10 more seeds (311-320) for that
  arm; still unclear: out. A breach: out.
- **The app world**: `tools/learnsim.js`, corals, the four profiles, seeds 301-310, 300 questions, `--stats` the shaky
  study's genus offsets (as #852), the item learner and `--learner field`. **Primary**: the answers to meet 36 of the
  40 slate genera (301 when not by 300), lecture RA and strong RA, both learners pooled, down; stratified sign-flip,
  Holm over the arms run (expected near zero: the pick does not read it). **Guardrails**: `tools/learncmp.js`
  `--looks 2`, every profile, both learners; the beginner's right % over answers 1-100, the bound of the paired
  difference above −3 points; `tests/profiles.smoke.js` passes on the pick.
- **Descriptive** (decides nothing): per profile, the base's global level over the answers (rated world every 100,
  app world at its checkpoints), and for each L the share of answers past the floor with the level at L or more; the
  runs identical to the base, per arm.
- **The pick**: the largest L of the grid whose arm is in at every step (both stretches, every guardrail in both worlds
  and both learners). None: nothing ships and Q338 goes back to Pierre with these tables.
- **Confirmation** (level 3): the pick against the base on fresh seeds 321-330 in the rated world, normal and tail
  photos (`--dist tail`), the four profiles: every guardrail held (an unclear cell taken to 20 seeds, 331-340). A breach,
  or a cell still unclear: nothing ships.
- **Fish** (the rule is the engine's, so it reaches the fish, whose level scale differs: L is calibrated on corals): the
  rated world, fish, its profiles, seeds 301-310, 1,000 answers, the pick against the base, `--looks 2`; a breach goes to
  Pierre with the PR.

**Results** (2026-11-12). Checked first: the arm with L = ∞ gave the base's runs seed for seed in the rated world (8
of 8 runs, seeds 301-302).

The real log, the median answer of the first opening in each stretch (the chance of none):

| Arm | P1 (63 answers, 46 with every other gate open) | P2 (117 answers, 78) |
| --- | --- | --- |
| base | none (1.0) | 42 (0.15) |
| N 10 ungated | 4 | 7 |
| N 10, floor alone | 4 | 7 |
| L 0.25 | 4 | 7 |
| L 0.5 | 4 | 7 |
| L 0.75 | 4 | 7 |

Every arm is in: both players were past 200 answers, and their level was 0.25 or more on every answer of the
stretches (P1 under 0.75 on 28% of its answers with the other gates open, which did not move its median).

The rated world, the beginner (the lecture RA, the strong RA and the expert: the base's rows in 10 of 10 runs, every
arm). `tools/learncmp.js` `--looks 2`: before → after, the difference [its one-sided 95% bound]:

| Arm | score at 1,000 | longest plateau | first unit at Open Water | units at Open Water 1,000 | D* 300 / 1,000 |
| --- | --- | --- | --- | --- | --- |
| base, seeds 301-310 | 48.2 | 81 | 122.1 | 22.9 | 0.462 / 0.918 |
| N 10 ungated | 47.0, −1.2 [−3.4] breached | 94, unclear | 137.0, unclear | 20.9, unclear | 0.482 / 0.921 |
| N 10, floor alone | 47.4, −0.8 [−2.6] unclear | 89, unclear | 122.1 | 22.1, unclear | 0.483 / 0.921 |
| L 0.25 | 48.0, −0.2 [−2.7] unclear | 89, unclear | 122.1 | 22.1, unclear | 0.483 / 0.919 |
| L 0.5 | 47.6, −0.6 [−3.6] unclear | 89, unclear | 122.1 | 23.2 | 0.480 / 0.921 |
| L 0.75 | 46.7, −1.5 [−4.1] breached | 78 | 122.1 | 21.6, unclear | 0.474 / 0.919 |
| base, seeds 301-320 | 46.2 | 77 | 141.2 | 22.2 | 0.446 / 0.903 |
| N 10, floor alone | 44.4, −1.9 [−3.6] breached | 81 | 142.9 | 19.9, −2.3 [−3.6] breached | 0.461 / 0.908 |
| L 0.25 | 45.1, −1.1 [−2.9] breached | 82 | 142.7 | 20.0, −2.2 [−3.6] breached | 0.462 / 0.908 |
| L 0.5 | 44.6, −1.6 [−3.6] breached | 82 | 141.2 | 20.8, unclear | 0.460 / 0.909 |

Every other cell held, but E (bar − D\*) at 300, unclear in every arm on both looks (up by about 0.02, towards
over-claiming: inside its margin of 0.03, its bound past it). L 0.75 breached on the first look and was not run again; L
0.25, L 0.5 and the floor alone were unclear and breached on 20 seeds. True knowledge is not lower anywhere (D\* +0.004
to +0.005 at 1,000, +0.014 to +0.016 at 300, every bound above 0 on 20 seeds); the shown score is lower (at 1,000
answers, the gated arms −1.1 to −1.9 points on seeds 301-320; N 10 ungated −1.2 on 301-310, against −3.1 on #852's
201-210 and −4.7 on 201-220).

The global level of the base's runs (rated world, seeds 301-310; min / mean / max over the seeds):

| Answers | 100 | 200 | 300 | 400 | 500 | 700 | 1,000 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | −0.24 / 0.27 / 0.80 | 0.02 / 0.56 / 0.99 | 0.54 / 0.74 / 0.92 | 0.73 / 0.89 / 1.08 | 0.90 / 1.09 / 1.35 | 0.82 / 1.21 / 1.50 | 1.40 / 1.71 / 1.96 |
| lecture RA | 1.01 / 1.61 / 2.27 | 1.07 / 1.35 / 1.88 | 0.86 / 1.21 / 1.42 | 1.05 / 1.40 / 1.83 | 1.26 / 1.67 / 2.05 | 1.69 / 2.04 / 2.31 | 2.17 / 2.42 / 2.63 |

The beginner's answers past 200 with its level at L or more: 98% (L 0.25), 96% (L 0.5), 88% (L 0.75); every answer of
the three other profiles.

**The pick: none.** No arm holds the rated-world beginner's guardrails, so no value ships (the plan's line) and Q338
goes back to Pierre. Not run, as the plan's order says: the app world (and its L = ∞ check), the confirmation on
seeds 321-340 and the fish (no arm left in). What the tables show:

- **No level separates them.** The simulated beginner's global level passes 0.5 by about answer 200 and 1.0 by about
  answer 500, while P1 and P2 were at 0.64-0.95 past answers 265-384: at the same number of answers the two real
  players held by stuck genera were inside the simulated beginner's range (P1 under its mean, P2 about at it). A
  threshold low enough to free them is
  on for nearly all of the beginner's answers past 200; the arms differ from the floor alone on 2-12% of them, so their
  differences are noise, not an order.
- **The rule reaches only the beginner here**: the three other profiles never hold 8 shaky genera long enough, with or
  without it.
- **The cost is the shown score, not the knowledge**: a beginner opened more genera spreads its answers over more of
  them, knows a little more of the slate, and has fewer at Open Water by 1,000 answers.
- **An observation, not checked**: the simulated worlds' level scale has not been compared with the real players'
  (the rated beginner is at 0.27 after 100 answers); read the two real players' levels against it with that in mind.

The patch (`OPEN.STUCK` 10, `OPEN.LEVEL`, `OPEN.SETTLED` 200, `stuckFree`, with its unit tests) is kept off the
repository. `tools/ratedworld.js` keeps the global level since this calibration (`level` in the rows, `lv` every 25
answers).

### Confusion groups (2026-11-14, Q350)

Decided by Pierre on 2026-11-14 (Q350, "oui à tout" to the [study](reviews/2026-11-06-confusion-group-opening-study.md)'s
questions a-j, f changed: "je pense qu'il faut quand même forcer les paires déclarées. Si elles sont déclarées par des
enseignants, c'est qu'il y a un intérêt à les voir ensemble, même s'ils sont faciles à distinguer"). Look-alike units
open close together, so they are in play at the same time (interleaving pays most for similar categories, and only
while they are juxtaposed: the study's §2).

**Plan, declared before the runs** (rule L11; committed before any output):

- **Level 2** (the opening, for every player; a regression check of decided values: G_MAX 3 and the trap level are the
  study's and Pierre's, the declared-pairs change needs no new constant, so no calibration).
- **Arms**: base = `main` at e0e019a5; this branch. The `INTRO.EVERY` removal alone was checked first: `main` and the
  branch without the groups gave the same questions, seed for seed (seeds 401-402, the four coral profiles, 300
  questions, the field learner and the rated world).
- **The app world**: `tools/learnsim.js`, corals (the four profiles) and fish (the five), seeds 501-510 (`--seed0 500`;
  the study used 1-30), 300 questions, the item learner and `--learner field`, `--stats` the sheet's `?stats=1` of
  2026-11-14 (v128: 904 coral pairs pooled, no fish pair yet).
- **Primary** (app world, corals): **partners closer**, per run the median over a fixed set of pairs of the answers
  between the first meetings of the two units (a unit not met counts 301), down; the set: the 59 declared coral pairs
  and the 4 pairs from the data alone at `CONF.TRAP` or more on those stats (63 pairs, the same in both arms, not the
  new groups' own); pooled over the profiles and both learners (80 pairs of runs), the stratified sign-flip of
  `tools/learncmp.js`. **Second, in a Holm family of two**: look-alike accuracy at question 300 (`look`, the learner's
  true 2-choice accuracy on the declared pairs), up; expected small (+0.006 in the study on 120 pairs), so also read
  as "no worse": the one-sided 90% bound of the paired difference above −0.02.
- **Guardrails**: `tools/learncmp.js`'s at 100 and 300 (true knowledge, E, units met, units at Open Water, first unit
  at Open Water, longest plateau), every profile of both subjects, each learner; the beginner's units met by question
  100 at most 17 (the CI limit, `tests/profiles.smoke.js`, which must pass); the beginner's right % over answers 1-100,
  the one-sided bound of the paired difference above −3 points.
- **Costs expected** (declared): the first openings are less "easy and common first" (the free draw picks only the
  first unit; the rest follows the groups and the declared pairs: the order check below), and a look-alike arrives as a
  trap sooner, so the right % of the first 100 answers may drop up to the bound above (the study: −0.4 to −0.9
  points), and the first unit at Open Water may come later, within its margin.
- **The rated world**: `--world rated`, corals (four profiles) and fish (five), seeds 501-510, the count learner, 1,000
  answers, `tools/learncmp.js` base against the branch, every guardrail. Its units have no pooled confusions and its
  learner no pair skill, so it checks the guardrails on groups built from the priors alone (the declared pairs), not
  the gain.
- **The real log** (rule L12): a replay cannot judge the opening (a different draw asks other questions). Measured
  instead, read-only: how far apart the real players met the partners of the new groups under today's rule (the gap
  the change closes), and how many units entered the exam with a group partner not met (where the exam gate would
  have bitten).

**Added after the first look** (declared before running; exploratory, uncorrected): the corals' app world breached
guardrails at the start of the path (the beginner's first unit at Open Water about 45 answers later, the right % of
answers 1-50 of the beginner and the lecture RA 3-8 points lower). To show Pierre where the cost comes from, three
arms on one scratch copy of this branch patched in turn, the same world and seeds (501-510, 300 questions, both
learners), the beginner, the lecture RA and the strong RA, each against the base: **S** the study's rule before f
changed (groups by average linkage alone, no declared pair forced, no pull of a pair the cap split); **F** this branch
with the first cards (`INTRO.START`) drawn as on `main` (the groups from the first card after them); **N** this branch
without the pull of a declared pair the cap split (tier 2). F and N together only if neither alone holds. Read: the
partners' gap, the look-alike accuracy at 300 and `tools/learncmp.js`'s guardrails, as above. No constant moves.

**The groups today** (the sheet's stats of 2026-11-14; the declared coral pairs join all 40 slate genera into one
connected graph, so the cap of 3 decides which of them share a group, the most confused first): 13 coral groups,
Acropora–Montipora–Porites; Pocillopora–Seriatopora–Stylophora; Duncanopsammia–Tubastraea–Turbinaria;
Astreopora–Cyphastrea–Echinopora; Mycedium–Pectinia; Lobophyllia–Plerogyra; Leptoria–Pavona–Platygyra;
Hydnophora–Merulina–Pachyseris; Alveopora–Goniopora–Heliofungia; Danafungia–Fungia–Lithophyllon;
Ctenactis–Herpolitha–Lobactis; Diploastrea–Dipsastraea; Astrea–Favites–Goniastrea; 4 lone genera (Anacropora,
Galaxea, Halomitra, Millepora). 32 of the 59 declared coral pairs are split by the cap (as built first, they pulled their partner instead; not in B, below). Fish families (no pooled answers
yet): Butterflyfishes–Angelfishes–Moorish Idol, Snappers–Coral Breams–Emperors, Parrotfishes–Wrasses,
Soldierfishes–Squirrelfishes–Cardinalfishes, Triggerfishes–Filefishes, Lizardfishes–Sandperches; fish genera: IMR's
Surgeonfish (Acanthurus, Ctenochaetus, Zebrasoma). Before the runs, the order alone (`openPick` 200 times from zero,
the stats above, descriptive): coral group partners opened a median 1 place apart (main: 9), declared pairs 2 (11);
after the very first unit every coral opening is a group partner (23 of 40) or a declared partner (16): the free draw
picks the first unit only, so the first 10 units are a little less easy (mean `gd` −0.33, main −0.49). Fish: partners
1 place apart (17), the free draw still picks 56 of 65 openings.

**Results** (the app world, seeds 501-510, 300 questions; `tools/learncmp.js` and the plan's script):

- **Primary, passed**: partners closer, the median answers between the first meetings of the 63 pairs, 61-102 → 13-17
  by profile (pooled sign-flip p ≤ 1e-5, 100,000 draws, 80 pairs of runs); look-alike accuracy at 300, 0.940 → 0.945
  (p 1e-4; Holm passes both). Fish, the 11 declared family pairs: 38-52 → 6-8 answers apart; look-alike accuracy
  0.961 → 0.963 (p 0.07, no worse).
- **Fish: every guardrail held** (both learners, the five profiles; a few unclear cells, none breached); right % of
  answers 1-100 within −1.3 points.
- **Corals: guardrails breached at the start of the path** (to Pierre, rule L11):

  | Coral cell, base → branch (item learner / field learner) | beginner | lecture RA |
  | --- | --- | --- |
  | right %, answers 1-100 (bound −3 points) | 80.3 → 77.2 / 76.3 → 72.2 | 89.1 → 85.1 / 86.7 → 81.4 |
  | right %, answers 1-50 | 81.8 → 76.6 / 76.6 → 69.4 | 89.4 → 86.0 / 90.2 → 82.6 |
  | first unit at Open Water (margin +10-18 answers) | 62 → 112 / 93 → 135, breached | 45 → 45 / 39 → 43 |
  | units at Open Water at 300 | 4.5 → 3.1 / 3.6 → 2.5 | 8.0 → 6.3 / 6.7 → 5.5 |
  | true knowledge at 300 | 0.660 → 0.647 / 0.558 → 0.582 | 0.816 → 0.824 / 0.824 → 0.827 |

  The strong RA's item-learner true knowledge (−0.024) and E (+0.049) were breached too; no other arm or learner
  repeats them (its first unit at Open Water comes sooner), so they were not chased with more seeds. The expert holds
  everything. Units met by question 100 (the beginner, read against the base: the base's item learner already
  exceeds the smoke's limit of 17 on these seeds): 18.0 → 17.1 / 14.9 → 15.3; `tests/profiles.smoke.js`, which holds
  that limit on its own 8 seeds, passes (12-17).
- **Where the coral cost comes from** (the arms declared above; beginner, lecture RA and strong RA):

  | Arm | partners apart (beginner item / field) | right % 1-100, beginner (item / field) | lecture RA | breached |
  | --- | --- | --- | --- | --- |
  | this branch | 74 → 17 / 102 → 17 | −3.1 / −4.1 | −4.0 / −5.3 | beginner's first Open Water, right % |
  | S, the study's rule (no pair forced) | 74 → 66 / 102 → 62 | −2.0 / −0.1 | −0.4 / 0.0 | beginner's first Open Water (item) |
  | F, first cards as on `main` | 74 → 20 / 102 → 25 | −1.5 / −2.6 | −3.4 / −4.1 | beginner's first Open Water and knowledge (item) |
  | N, no pull of a pair the cap split | 74 → 37 / 102 → 31 | −2.5 / −2.3 | −3.0 / −3.2 | beginner's first Open Water (item) |
  | F and N | 74 → 32 / 102 → 39 | −1.0 / −2.1 | −3.4 / −3.9 | lecture RA's units at Open Water at 300 (item) |

  The start cost follows the declared pairs: every arm that forces them costs the lecture RA 3-5 points of right % in
  its first 100 answers (S, which lets the data split them, costs nothing there, but brings partners much less close);
  the beginner's late first Open Water comes from the first cards being a look-alike group and from the pulls (F and N
  together bring it back to the base). No arm holds every guardrail; the decision is Pierre's (the PR).
- **Pierre's choice: B** (2026-11-14 16:48, Q355: "ok pour B"): declared pairs stay forced inside the groups and a
  group's members open in a row; the first cards (`INTRO.START`) are drawn unit by unit as before the groups
  (`openPick` `first`); a declared pair the cap split pulls nothing. **B shipped, checked again** (the same plan, seeds
  501-510; its rows equal the arm "F and N" above, seed for seed, with the expert added): partners closer, the 63 coral
  pairs 61-102 → 25-39 answers apart (p ≤ 1e-5), look-alike accuracy at 300 0.940 → 0.944 (p 0.002), Holm passes both.

  | Coral cell, base → B (item / field learner) | beginner | lecture RA | strong RA | expert |
  | --- | --- | --- | --- | --- |
  | partners apart (median answers) | 74 → 32 / 102 → 39 | 61 → 25 / 68 → 31 | 64 → 27 / 66 → 26 | 61 → 27 / 58 → 26 |
  | right %, answers 1-100 | −1.0 / −2.1 | **−3.4 / −3.9** | +0.9 / +0.3 | −0.4 / −0.1 |
  | first unit at Open Water | 54 → 53 / 93 → 83 | 45 → 45 / 39 → 42 | 30 → 27 / 28 → 29 | 21 → 22 / 21 → 21 |
  | units at Open Water at 300 | 4.5 → 3.1 / 3.6 → 3.1 | **8.0 → 5.9 breached** / 6.7 → 5.8 | 11.1 → 11.7 / 9.6 → 10.9 | 16.3 → 16.4 / 18.2 → 18.3 |
  | true knowledge at 300 | 0.660 → 0.667 / 0.558 → 0.564 | 0.816 → 0.819 / 0.824 → 0.828 | 0.861 → 0.851 / 0.864 → 0.864 | 0.954 → 0.953 / 0.953 → 0.953 |

  The two cells in bold are the costs shown to Pierre with B, accepted with his choice; every other cell held or was
  unclear. **Fish under B (new, not in the table shown to Pierre; waits for the integrator)**: partners 38-52 → 6-8
  answers apart as before (p ≤ 1e-5); right % of answers 1-100 within −1.6 points; but cells that held as first built
  are breached now: the app world, the casual diver's first unit at Open Water 65 → 81 (item) and 85 → 105 (field), the
  beginner's units met at 100 17.1 → 14.3 (field); the rated world, the lecture RA's first unit at Open Water 57 → 71
  and units met at 100, the expert's units at Open Water at 1,000. For the fish, B differs from the first build only in
  the order of the four starter-core cards (the first cards are the starter core either way; no fish declared pair is
  split by the cap), so these may be the noise of 10 seeds on run-level measures. **Second look** (seeds 511-520, base
  against B, the profiles of those cells, `--looks 2`): the app world's cells held or unclear (casual diver's first unit
  at Open Water 87 → 68 item, 93 → 91 field; beginner's units met at 100 17.2 → 16.0 field, held); the rated world's
  two breaches repeat: the lecture RA's first unit at Open Water 70 → 89 (+19, margin +14), the expert's units at Open
  Water at 1,000 57.3 → 54.1 (−3.2, margin −2.9); the lecture RA's units met at 100 unclear (18.1 → 16.8). To Pierre.
- **B'** (prepared for Pierre's morning answer, commit "Variant B'"): B, but a subject whose first cards are its
  starter core (the fish) draws them in the group order, as first built; the corals keep B's unit-by-unit first cards.
  Checked against the same bases: the corals give B's runs exactly (app and rated world, seeds 501-510); the fish give
  the first build's (A's) rows exactly on 501-510. On 511-520 the two rated-world fish breaches come back under B' too
  (so under A as well): the lecture RA's first unit at Open Water 70 → 116, the expert's units at Open Water at 1,000
  57.3 → 53.5. They come from the groups in the fish rated world (or its noise on these seeds), not from B's first
  cards; the app world's fish cells hold or are unclear under B' on both seed sets.

  | Fish cell (base → arm) | seeds | A | B | B' |
  | --- | --- | --- | --- | --- |
  | app, casual diver's first unit at Open Water, item | 501-510 | 65 → 63 held | 65 → 81 **breached** | 65 → 63 held |
  | same | 511-520 | (as B') | 87 → 68 held | 87 → 94 unclear |
  | app, casual diver's first unit at Open Water, field | 501-510 | 85 → 74 held | 85 → 105 **breached** | 85 → 74 held |
  | same | 511-520 | (as B') | 93 → 91 unclear | 93 → 81 held |
  | app, beginner's units met at 100, field | 501-510 | 17.1 → 15.4 unclear | 17.1 → 14.3 **breached** | 17.1 → 15.4 unclear |
  | same | 511-520 | (as B') | 17.2 → 16.0 held | 17.2 → 16.3 unclear |
  | rated, lecture RA's first unit at Open Water | 501-510 | 57 → 65 unclear | 57 → 71 **breached** | 57 → 65 unclear |
  | same | 511-520 | (as B') | 70 → 89 **breached** | 70 → 116 **breached** |
  | rated, expert's units at Open Water at 1,000 | 501-510 | 59.2 → 58.1 held | 59.2 → 55.6 **breached** | 59.2 → 58.1 held |
  | same | 511-520 | (as B') | 57.3 → 54.1 **breached** | 57.3 → 53.5 **breached** |
  | rated, lecture RA's units met at 100 | 501-510 | 19.8 → 18.8 unclear | 19.8 → 17.6 **breached** | 19.8 → 18.8 unclear |
  | same | 511-520 | (as B') | 18.1 → 16.8 unclear | 18.1 → 16.8 unclear | **The rated world, corals under B**: the beginner's shown score at 1,000 41.2 → 39.9 (−1.3, margin −1),
  breached as first built; the other cells held or unclear.
- **The real log** (the Answers tab as read on 2026-11-12, 2,047 + 983 coral answers of 12 players with 50 or more;
  read-only, players pseudonymised): under today's rule, the 10 players on the path met the two genera of a pair of the
  new groups a median 51 answers apart (213 pairs, 23% within 15), the declared pairs 48 (378 pairs, 22%); in 92 of the
  363 group pairs one genus was met and the other never. No coral exam question is in the log yet, so the exam gate
  could not have bitten (and cannot be judged there).
- **The rated world**: seeds 501-510, 1,000 answers, the count learner, `tools/learncmp.js`. Its units have no
  pooled confusions and its learner no pair skill: the groups come from the declared pairs, and it reads guardrails,
  not the gain. **Corals**: breached for the beginner, E at 300 (−0.506 → −0.470, +0.036) and the shown score at 1,000
  (41.2 → 39.9, −1.3; margin −1); the others held or unclear (true knowledge held everywhere, at 300 and 1,000; units met
  at 300 up, 25.9 → 28.8 for the beginner). **Fish**: no breach; unclear cells only (the beginner's first unit at Open
  Water 177 → 206, units met at 100), every shown score at 1,000 within 0.4 points.

### After the collapsed runs of 2026-11-03 (2026-11-04)

Two players' runs collapsed on the evening of 2026-11-03, after #408 (one opening rule, merged 11:34 UTC) and #413 (no
Elo step on the genus wrongly given). A strong player, right after a comeback ended, was opened 7 new genera in 16
answers (nearly every `INTRO.EVERY` slot: with few genera shaky, `openChance` = 1 − shaky / `OPEN.K` was near 1, and
#413 left fewer genera looking shaky), then fell from 83% right to 50% while the expected success `e` stayed about 0.76:
each new genus was asked once or twice, so its misses never lowered `e` on its next question; the global level fell
from 1.49 to −0.08 but then only seeded the genera not met; the opening hold only stopped the cards; the "Again" kept
one pair, the newest mix-up replacing the waiting one, so a real two-way mix-up (5 misses) never came back as a drill;
and since #413 picking the wrong genus lowered nothing. A second player's run after the same deploy fell to 48% right
where 70% was expected. The hotfix #421 capped the opening chance at 0.5 and held the opening while 3 genera opened
were unasked; this is the full fix, approved by Pierre ("I validate all your proposals"), and it replaces the hotfix.
#415 (the global level moves every genus, the success aimed for follows the level) was already part of the answer: with
it, the falling level would have lowered `e` on every genus.

**1. Opening pace** (`model.js` `openRecent`, `openPace`, `OPEN.MAX` 3, `OPEN.WIN` 15; `quiz.js` `planPhoto`):

- No new genus while a genus opened on a card (the first cards or one of its own) in the last `OPEN.WIN` answers has not
  been asked yet, and none once `OPEN.MAX` of them have opened in that window: about 3 new genera per 15 answers at
  most. The question already on screen or planned before counts as asked (`soon`), else planning ahead (3 questions)
  would hold every card two questions longer. Open all and a genus closed again ("One at a time") take no place.
- A genus carded in the window and not asked yet is asked as soon as it is ready (after its `INTRO.GAP`): the block
  alone, waiting for the weighted draw to come round to it among 20-40 genera met, slowed every profile to about one
  card per 8-12 answers (genera met by question 100: strong RA 33.4 → 14.0, expert 27.2 → 12.8) and cost knowledge
  (strong RA at 300: 0.86 → 0.78). With it the pace is the ceiling's.
- An "Again" never asks a genus not met yet: a genus never met, offered to make up the three wrong choices and picked,
  was asked by its Again with no card (the second player met a bonus genus that way): it asks the genus shown instead.
- `openChance` (1 − shaky / `OPEN.K`) and the level-tied shaky bar of #415 are kept; the hotfix's cap (0.5) and
  `OPEN.UNASKED` (3) go: measured against both below.
- `OPEN.MAX` 4 was tried: nothing changed for the expert (15.4 genera by question 100 either way) and little for the
  others; the window's unasked rule and the planning set the pace below the ceiling, which binds in bursts (the
  `open/15` column: 3.0, the most in any 15 answers).

**2. Easier questions while the opening hold is on** (`model.js` `holdEase`; `quiz.js` `planPhoto`): the ability the
photos and the format (traps, single views: `trapsFor(t, shift)`, `formatAt`) aim at is lowered by h − `INTRO.HOLD`
logits while the hold's sum h is past `INTRO.HOLD` (1.5): 0 at the threshold (no cliff), one logit for each answer's
worth of misses beyond it, back to 0 as right answers pay h back. Every question but an exam (the Again and the duels
too; the Duel tab's own duels only since 2026-11-04, "The Duel tab when the hold sets in" below: `planDuel` still aimed
them at the plain ability). No new constant: h is already in success units, on the scale the Elo steps the ability on. On the real answers
(read-only replay of the logged `e`) the strong player's h crossed 1.5 at the 27th answer of the collapsed run (44 answers) and
peaked at 3.22, the second player's at the 13th of 31, peaking at 4.31; the ease would have been 0.8-0.9 logits on average
over the 17-18 answers held (a 4-choice question aimed at 80% right is then aimed at about 88% for the same ability).
A replay cannot say how those players would have answered easier photos (rule L12).

**3a. Known mix-ups** (`core.js` `confGap`; `model.js` `confTerm`; `quiz.js` `answer`, `planPhoto`): on a question
whose choices hold a genus the player mixes up with the one asked more than everyone does, the question counts that much
harder for them: c = logit(confOf) − logit(pooledConf), the player's own score of the pair (`pairConf`, shrunk toward
the pooled score with `CONF.W` offers, as for the traps) against the pooled one, the most over the choices, 0 when
lower. The expected success, the Elo steps (genus and level), the miss weight of the progress, the logged `e`, the
opening hold and the photo's aim (`photoSet` shift − c) all take it: the signal the wrong pick's Elo step gave before
#413, now on the pair, without stepping the genus wrongly given. Scored before the answer updates anything (the offers
of this question are counted after). **Only on a question with 3 or more plausible choices**: on the real answers the
2-choice contrast questions of the pair (the Again right after the side-by-side montage, a duel) and the questions with
easy choices were right more often than expected, not less. The sheet's full replay applies the same term (`core.js`
`replayProgress`, rules version 2): from the player's record as replayed (offers and mix-ups per pair) and the pooled
pairs it is given; from `CF_LOGGED` (2026-11-03 15:35 UTC, #425 live; `abilityeval` `CF_FROM`) the logged `e` already holds the app's term, taken out
first. One difference: the replay's pooled score starts from the pair's prior without `CONF.FORM` (the sheet does not know
the genera's growth forms), 0.03 instead of 0.08 for two genera sharing a form and nothing closer, so its term is larger
on such a pair while its pooled offers are few, and the same as the game's once they are many; on every other pair it is
the game's (`tests/replay.test.js` replays a log with mix-ups to the live game's ability, level and progress).

Real answers (`node tools/abilityeval.js answers.json --variants e,e+X,e+X+M --priors priors.json`, the sheet's
Answers tab read 2026-11-03, read-only: 1,258 answers of 9 players with 20 or more; `e` the app with #415; the pooled
score from the other players' answers on the app's own priors; paired log-loss difference per answer, ± its standard
error, 95% interval):

| Group (answers) | app (#415) mean p / right, log-loss | term on every question | **term, 3+ plausible choices (shipped)** |
| --- | --- | --- | --- |
| all (1258) | 0.79 / 0.82, 0.4728 | +0.0053 ± 0.0026 [+0.0002, +0.0105] | −0.0009 ± 0.0019 [−0.0047, +0.0028] |
| term > 0, 3-4 choices (88) | 0.78 / 0.67, 0.6974 | p 0.72, −0.0061 ± 0.0236 | p 0.71, −0.0098 ± 0.0264 [−0.062, +0.042] |
| term > 0, 2 plausible (226) | 0.79 / 0.83, 0.4288 | p 0.73, +0.0369 ± 0.0093 | (not applied) |
| 4 choices (487) | 0.79 / 0.76, 0.5489 | +0.0018 ± 0.0046 | −0.0008 ± 0.0048 |
| level ≥ 0.75 (645) | 0.83 / 0.85, 0.4189 | +0.0052 ± 0.0037 | −0.0010 ± 0.0031 |

- Where it applies (88 answers) the expectation moves from 0.78 to 0.71 for 0.67 right: calibration clearly better, the
  log-loss better on average but within its noise (few answers). Overall within the noise of the app's (−0.0009 ±
  0.0019): it does not move the estimates away from what players do, and corrects the one place where they were too
  high.
- On every question (as first proposed) it was worse (+0.0053 ± 0.0026), all of it from the 2-choice questions: right
  83% where it predicted 73%. Kept off there. Also measured: the term on the prediction only, not the steps (`+Y`), and
  summed over the choices (`+Z`): the same picture.
- The level bands come from the reference level stepped with the difficulty before the term, the same answers for every
  rule; and from the release on (live 2026-11-03 15:35 UTC, 23:35 in the sheet's clock, Asia/Taipei: `tools/abilityeval.js`
  `CF_FROM`) the logged `e` already holds the app's term, which the replay takes out of the recovered difficulty before a
  rule adds its own (Codex review #425). The log has no app version per answer, so an app not yet updated after that
  time is taken for the new one (a few answers).

**3b. The Again queue** (`quiz.js` `CONTRAST.Q` 3, `rematchAdd`): up to 3 pairs wait, oldest first, each still
`CONTRAST.GAP` after its mix-up and after the last contrast question; a newer mix-up never pushes an older one out (with
the queue full it waits for its next miss); a pair already waiting is not queued twice. The player of 2026-11-03 mixed
two genera up both ways 5 times; with one slot each newer mix-up replaced the pair, so it never came back as a drill.

**4. Look-alikes from the data** (`core.js` `dataLook`, `CONF.N` 20; `model.js` `isDataLook`, `dataLooks`): Pierre: "if
the data says people constantly confuse two genera, they become look-alikes by force; that was the point of the
confusion data: to find look-alikes the courses never named". A pair no source declares is a look-alike from the data
once offered together `CONF.N` times or more with a pooled score (`pooledConf`: the players' mix-ups on the pair's own
prior, same family 0.12, a shared growth form 0.08, else 0.03, worth `CONF.W` 8 offers) of `CONF.TRAP` (0.2) or more:
the prior's weight makes it clear (at 20 offers two unrelated genera need 6 mix-ups, 30%; the declared look-alikes were
mixed up 13% of the times they were offered, other pairs 5%). Such pairs join the declared ones in the duels slipped
into the quiz and the Duel tab (`duelPick`), on the genus sheet's "Don't confuse with" (labelled "Often mixed up by
players"), and in admin Confusions ("look-alike from the data"); the traps and the progress's look-alike weight
(`pgWeight`) already followed the same pooled score, and any mix-up already queued its Again. The declared look-alikes
stay the prior (`isLook`): a pair from the data does not raise its own prior. On the real answers (2026-11-03, trusted
players, as `?stats=1` computes it) one pair qualifies: *Alveopora* and *Tubastraea*, offered together 30 times and mixed
up 8 (27%; 3 of 18 one way, 5 of 12 the other), pooled score 0.227; it is the diagnosis's two-way pair. Close, with
too few offers yet: *Heliopora* / *Isopora* (15 offers, 6 mix-ups), *Merulina* / *Millepora* (18, 5), *Herpolitha* /
*Lobactis* (16, 4); *Millepora* / *Pachyseris* has 34 offers but scores 0.18.

**5. The apology card**: "The apology card" in ARCHITECTURE.md; the rule (`core.js` `sorryFelt`), at Pierre's request,
goes only to the players who felt it: 20 answers or more in the window and the opening hold's sum at 3 or more (2 ×
`INTRO.HOLD`, the evidence the back-to-one-at-a-time card asks for) when the fixed version first runs, or 1.5 with 4
genera or more carded within 15 answers in the window. On the real answers it selects the two collapsed runs (44
answers, 68% right where 76% was expected, the hold at 3.22, 7 cards in 16 answers; 31 answers, 48% against 70%, the
hold at 4.31) and no other player (they were the only two who answered in the window). A run at its expected success
ends with the hold at 3 or more about 2-5% of the time (simulated, 20-80 answers at e 0.7-0.9); a right % 10 points
under `e` alone would have missed the first run (8 points).

**Simulated** (`tools/learnsim.js`, 5 seeds × 600 questions, the same seeds; cells: true knowledge of the slate /
genera met / right % since the previous row / the most genera carded in any 15 answers / learned / entered the exam;
`hier` = this branch's base, #415 before the hotfix; `hotfix` = #415 with #421; `now` = this change on #415 with main
merged, the hotfix replaced):

| Profile, question | `hier` | `hotfix` | **now** |
| --- | --- | --- | --- |
| beginner 50 | 0.17 / 10.8 / 70 / 4.8 / 0.0 / 0.0 | 0.17 / 11.0 / 73 / 4.8 / 0.0 / 0.0 | 0.16 / 10.6 / 76 / 3.0 / 0.0 / 0.0 |
| beginner 100 | 0.28 / 18.8 / 78 / 5.4 / 0.0 / 0.0 | 0.27 / 18.0 / 79 / 4.8 / 0.0 / 0.2 | 0.28 / 18.2 / 75 / 3.0 / 0.0 / 0.0 |
| beginner 200 | 0.46 / 27.2 / 77 / 5.4 / 0.0 / 0.0 | 0.45 / 28.2 / 81 / 4.8 / 0.0 / 0.2 | 0.48 / 29.4 / 78 / 3.0 / 0.0 / 0.0 |
| beginner 300 | 0.61 / 36.4 / 81 / 5.6 / 0.0 / 0.6 | 0.62 / 37.4 / 81 / 4.8 / 0.0 / 1.0 | 0.66 / 38.8 / 78 / 3.0 / 0.0 / 0.2 |
| beginner 600 | 0.87 / 40.0 / 84 / 5.6 / 0.4 / 4.8 | 0.87 / 40.0 / 84 / 4.8 / 0.8 / 5.8 | 0.87 / 40.0 / 85 / 3.0 / 0.2 / 3.6 |
| lectureRA 50 | 0.40 / 16.0 / 81 / 5.6 / 0.0 / 0.0 | 0.39 / 13.2 / 82 / 4.0 / 0.0 / 0.0 | 0.37 / 10.6 / 85 / 3.0 / 0.0 / 0.0 |
| lectureRA 100 | 0.49 / 24.8 / 81 / 5.8 / 0.0 / 0.0 | 0.47 / 19.2 / 80 / 4.2 / 0.0 / 0.0 | 0.45 / 19.0 / 84 / 3.0 / 0.0 / 0.4 |
| lectureRA 200 | 0.65 / 38.4 / 80 / 6.0 / 0.0 / 0.0 | 0.62 / 31.0 / 79 / 4.2 / 0.0 / 0.4 | 0.63 / 34.4 / 80 / 3.0 / 0.0 / 0.4 |
| lectureRA 300 | 0.76 / 40.0 / 80 / 6.4 / 0.0 / 0.0 | 0.75 / 40.0 / 83 / 4.2 / 0.0 / 0.4 | 0.75 / 40.0 / 80 / 3.0 / 0.0 / 1.0 |
| lectureRA 600 | 0.91 / 40.0 / 88 / 6.4 / 0.4 / 6.4 | 0.91 / 40.0 / 87 / 4.2 / 1.0 / 7.6 | 0.90 / 40.0 / 87 / 3.0 / 1.0 / 6.0 |
| strongRA 50 | 0.62 / 19.0 / 88 / 6.8 / 0.0 / 0.0 | 0.62 / 14.4 / 85 / 5.0 / 0.0 / 0.0 | 0.61 / 10.2 / 87 / 3.0 / 0.0 / 0.0 |
| strongRA 100 | 0.69 / 33.4 / 85 / 7.0 / 0.0 / 0.2 | 0.67 / 21.0 / 88 / 5.2 / 0.0 / 0.0 | 0.67 / 19.2 / 86 / 3.0 / 0.0 / 0.4 |
| strongRA 200 | 0.81 / 40.0 / 80 / 7.0 / 0.0 / 0.4 | 0.76 / 32.6 / 89 / 5.2 / 0.0 / 0.4 | 0.80 / 37.4 / 83 / 3.0 / 0.0 / 0.4 |
| strongRA 300 | 0.86 / 40.0 / 88 / 7.0 / 0.0 / 0.8 | 0.84 / 40.0 / 87 / 5.2 / 0.0 / 2.4 | 0.86 / 40.0 / 86 / 3.0 / 0.2 / 1.2 |
| strongRA 600 | 0.94 / 40.0 / 92 / 7.0 / 2.6 / 14.2 | 0.94 / 40.0 / 90 / 5.2 / 4.2 / 16.0 | 0.94 / 40.0 / 92 / 3.0 / 1.8 / 12.2 |
| expert 50 | 0.94 / 15.0 / 98 / 4.6 / 0.0 / 0.0 | 0.93 / 12.0 / 98 / 3.8 / 0.0 / 0.0 | 0.93 / 10.8 / 96 / 3.0 / 0.0 / 0.0 |
| expert 100 | 0.94 / 27.2 / 96 / 5.0 / 0.0 / 0.2 | 0.94 / 20.4 / 94 / 4.0 / 0.0 / 0.6 | 0.94 / 19.4 / 96 / 3.0 / 0.0 / 0.4 |
| expert 200 | 0.95 / 40.0 / 96 / 5.4 / 0.0 / 1.4 | 0.95 / 31.4 / 95 / 4.0 / 0.4 / 2.4 | 0.95 / 37.8 / 95 / 3.0 / 0.0 / 1.6 |
| expert 300 | 0.95 / 40.0 / 97 / 5.4 / 0.2 / 3.2 | 0.95 / 39.4 / 96 / 4.0 / 0.8 / 5.8 | 0.95 / 40.0 / 95 / 3.0 / 0.6 / 2.8 |
| expert 600 | 0.97 / 40.0 / 96 / 5.4 / 5.6 / 24.0 | 0.97 / 40.0 / 96 / 4.2 / 7.0 / 24.6 | 0.97 / 40.0 / 97 / 3.0 / 6.6 / 22.0 |

- **The pace is bounded**: never more than 3 genera carded in 15 answers (`hier` up to 5-7, the hotfix up to 4-5);
  genera met by question 100: beginner 18.2 (`hier` 18.8, hotfix 18.0), lecture RA 19.0 (24.8, 19.2), strong RA 19.2
  (33.4, 21.0), expert 19.4 (27.2, 20.4); every profile meets all 40 by about question 230-300, the hotfix's strong RA
  and expert later (32.6 and 31.4 by question 200, now 37.4 and 37.8).
- **Nobody learns less**: true knowledge of the slate as `hier` or better at every checkpoint (beginner 0.48 / 0.66 at
  200 / 300 against 0.46 / 0.61; strong RA 0.80 / 0.86 against 0.81 / 0.86), above the hotfix's at 200 for the strong
  RA (0.80 against 0.76); equal at 600 everywhere. Right % within the seeds' spread of `hier` (the strong RA 83-87%
  over 100-300 where `hier` dipped to 80% at 200, its burst of openings).
- **Genera learned by 600** (the mastery exam passed) are fewer than the hotfix's for the strong RA (1.8 ± 0.8 against
  4.2 ± 2.0; `hier` 2.6 ± 2.1) and within the spread elsewhere: the hotfix, slower to open, puts more answers on fewer
  genera early. Neither the Again queue (`CONTRAST.Q` 1: 2.2 ± 0.8) nor the confusion term (off: 1.8 ± 1.3) explains
  it; the knowledge, the measure that decides (rule L11), is the same at 600.
- The hotfix's cap of the chance at 0.5 on top of this rule (5 seeds × 300) slowed the strong players further (strong RA
  32.0 genera by question 200, knowledge 0.76 instead of 0.80): not kept. `OPEN.UNASKED` 3 is subsumed by the
  window's rule (no card while any genus carded in it waits for its question, asked as soon as ready).
- The Elo's error |θ − logit k| is a little lower than both at 600 (strong RA 1.25 against 1.35 / 1.43, beginner 1.03
  against 1.20 / 1.19).

After a break (the diagnosis's situation: `--profiles strongBack,strongRA,lectureRA --questions 60 --breaks 8h --after
40`; `strongBack` a strong player who knows 80% of the genera well and the rest hardly, so few genera stay shaky; right %
in the 40 answers after the comeback; genera opened on their cards in the first 15 of them / the most in any 15 / in all
40):

| Profile | `hier` right % / opened | `hotfix` | **now** |
| --- | --- | --- | --- |
| strongBack | 90 / 1.8 · 5.0 · 8.4 | 95 / 1.6 · 3.4 · 5.2 | 94 / 1.2 · 3.0 · 6.0 |
| strong RA | 87 / 1.8 · 4.8 · 8.2 | 89 / 1.2 · 3.4 · 4.2 | 86 / 1.6 · 3.0 · 6.0 |
| lecture RA | 84 / 1.6 · 5.2 · 8.2 | 83 / 1.0 · 3.0 · 5.0 | 80 / 1.4 · 3.0 · 5.8 |

- The simulated learner does not collapse as the real players did (it is right 87-90% after the comeback with the old
  pace too): new genera are learned from their card and their easy first questions, faster than real players learn
  them. So learnsim measures the pace (5 genera in 15 answers before, 3 now) and that nobody learns less; whether the
  easier questions would have saved those runs, it cannot say (ROADMAP).
- On the collapsed runs' logged sequences (`scratchpad` replay, read-only): with the strong player's own cards (the
  device's record of when each opened), 6 of the 7 cards of answers 199-215 would not have opened when they did (the
  first, at 199, waited for its question, which the run never asked: under the new rule it is asked two answers later
  and holds the next card until then); over the whole log 17 of its 34 cards would have waited. The second player's
  cards are not on record; inferred from the first question on each genus (a card `INTRO.GAP` before), 3 of the 5
  genera new in the collapsed run would have waited (one more came through an Again on a genus never met, which the
  new rule also stops).

### The Duel tab when the hold sets in (2026-11-04)

The Duel tab (`#practice/duels`, and `#practice/duels/A/B` from "Drill this pair" on a comparison) is a 2-choice drill the player
chooses. Pierre approved two changes on 2026-11-04, from a read-only look at the sheet's answers: a player (P1) drilled
*Pocillopora* / *Stylophora* from "Drill this pair", 10 right, then missed 6 of the next 13 while the app still expected
about 80%; the opening hold's sum crossed `INTRO.HOLD` at his 25th duel answer and nothing changed in the duel. Over all
players, in the 10 answers after the hold sets in: the photo quiz, since the easing shipped, 84% right for 77% expected;
the Duel tab 68% for 77%.

**1. The easing reaches the Duel tab** (`quiz.js` `planDuel`): its photo is now drawn with `photoSet(t, …, holdEase(), 2)`,
as the photo quiz's duels and Again (it passed 0, so the Duel tab never got point 2 above). `photoSet`'s shift lowers the
photo aimed and the chance of a single view (`singleP`, `formatAt`), and skips the calibration question, as for the photo
quiz; a duel has its two choices and no traps, so `trapsFor` has nothing to do there, and the player's own mix-ups term
(`confTerm`) is 0 on a 2-choice question. The expectation logged (`e`) and fed to the hold is computed in `answer` from
the photo really shown (its difficulty, one view alone harder by `PICKD.SINGLE`), so it stays the expectation of the photo
aimed. Measured in the app on the real data (Chromium, seeded, 400 draws a setting): *Pocillopora* / *Stylophora*
for a player at ability 1 on both genera, the difficulty the answer counts falls from 0.39 to 0.26 with h at
`INTRO.HOLD` + 3, *Acropora* / *Montipora* 0.40 → 0.27, *Favites* / *Dipsastraea* 0.35 → 0.20; on `main` it stayed
within ±0.01 (noise). Mostly fewer single views (78% → 52% of the duels on the first pair): a local run has no photo
ratings from the sheet. `tests/pages.smoke.js` `duelReliefCheck` checks the drop (300 draws each way).

**2. A relief card** (`quiz.js` `reliefNote`, `reliefDue`, `reliefArm`, `reliefShow`): the first time in a duel run an
answer takes the hold's sum h from below `INTRO.HOLD` to `INTRO.HOLD` or more, the next break at Next shows a card
(💡, kind `tip`): kicker "Tough pair today", title "Take a step back?", "These two are hard right now. Mixing in other genera for
a while, or seeing these two side by side, often helps more than more of the same." (Pierre, 2026-11-04: the line
first spoke of the comparison only, the second choice since the order changed) and three choices, in Pierre's order: **Mix in other genera** (the main button,
the photo quiz, `#practice/quiz`), **Compare them** (the side-by-side comparison of the duel's two genera, `#learn/compare/A/B`, as
`learn.js` links it), **Keep drilling** (the next duel; Escape too). No numbers on it (Pierre's rule for these cards).
Compare them does not end the drill for good (Pierre, 2026-11-04): the comparison it opens shows **Back to the duel**
(in view however far the page scrolls: a floating button at the bottom centre on phones and tablets, a light "Duel paused" band under the page bar on desktop), which, like the browser's Back, returns to the same pair's duel and continues the same run (no second
card in it; the easing applies as usual). The comparison opened any other way is unchanged.

- **The same detector**: the opening hold's CUSUM (`holdStep`), no new one and no new constant. The crossing is read in
  `answer` (h before and after `holdStep`), only for a Duel-tab answer.
- **A duel run** (`DUELRUN`): the Duel tab's answers from the moment its page is opened (from another page, a reload, a
  link to another pair: `app.js` `route` passes `quizDuel` whether the page was just opened, and the page left) until it
  is left; Next, Keep drilling and the way back from the card's comparison (`DUELBACK`: Back to the duel or the
  browser's Back, straight from that comparison) stay in it, a switch of subject starts a new one. At most one card a
  run. A run that starts with the hold already on (the player comes from the photo quiz held, or opens the duel again
  from another page) gets no card until the hold falls under `INTRO.HOLD` and crosses it again.
- **When**: at Next, never with the answer (`breakArm`), as an out-of-game prompt: never with another card, the tour or
  an achievement toast (`promptOk`), `PROMPT.GAP` answers from the other prompts (its showing calls `promptMark`), never
  right before a genus card (`nextCards`). It takes the break before the one-tap question, the sign-in card and the
  tips, which wait for a later break. A break it cannot take passes it to the next one of the run while the hold is
  still on; if the hold falls back first, nothing shows.
- **Logged** as the tips: `ev('pulse', {r, src: 'tip:duelhold', m, n})`, r `shown`, then `mix`, `cmp`, `keep` or `none`
  (the page left with it up), and `back` when the player returns to the duel from the comparison. The sheet keeps a pulse row's `r` and `src` as sent: no sheet change. The admin counts it
  with the tips (To do › Errors, `tipsView`: Compare, Mix in, Keep drilling, Back to the duel columns).
- Not simulated: `tools/learnsim.js` and `tests/profiles.smoke.js` play the photo quiz only, whose draw this does not
  touch; a replay of the real answers cannot say how the Duel tab's players would have answered easier photos or what
  they would have picked on the card (rule L12). What to measure once players have met it: the Duel tab's right share
  against `e` in the 10 answers after the hold sets in (68% for 77% before), which choice the card gets, and how often
  Compare them comes back to the duel.

### An opening only after a right answer (2026-11-03)

Pierre, after playing: "I was surprised that new genera open right after a wrong answer. Unlocking a new genus feels
like a reward, and it came on a wrong answer." The rule agreed: **the path opens a genus only after a right answer**.
When the last graded answer was a miss, no genus opens; it stays that way until the player answers right again, so a
second miss keeps it closed. The opening is put off, not cancelled: the first question after a right answer can open
it as usual. Nothing else about the pace changes (`openChance`, `openPace` `OPEN.MAX` 3 / `OPEN.WIN` 15, the hold,
`INTRO.EVERY`).

- **One place** (`model.js` `openRight`): the last of the conditions that let `planPhoto` open a genus (with
  `INTRO.EVERY`, the hold, the floor of a visit or a comeback, `openPace`). It reads `P['~level'].h`, a new field on the
  global record: the last 10 results over every game, newest last, written by `answer` and synced and merged with the
  progress like a genus's `h` (`core.js` `mergeProgress`). A player who has never answered, or whose progress was
  saved before this field existed, counts as "no miss".
- **Every graded answer counts**, whatever the game: the photo quiz, an Again, a duel slipped into the quiz, the Duel
  tab, the custom quiz, a typed question (a typed "I don't know" is a miss). They all go through `answer` and the global
  record, so a miss in the Duel tab followed by a switch to the photo quiz also holds the first question there.
- **Questions planned ahead** (`planNext`, up to 3): a question planned while the answer just before it is still to
  come cannot know that answer, so `openRight(at)` lets it through (`at` > the answers so far). A miss already drops
  every question planned (`answer`, `dropPlans`), and `quizPhoto` checks again when it shows a question with a card of
  the path: one planned before a miss is planned again (the same check as the hold's), so a card planned earlier never
  shows after a miss.
- **Not openings by the path, unchanged**: the first cards (fewer than `INTRO.START` slate genera met: the game cannot
  ask anything without them) and Open all. The Again and the duels slipped into the quiz never ask a genus not met.
  Changed 2026-11-04 (Pierre: one path for every game): the custom quiz offers only the genera unlocked and the Duel
  tab draws only them, so neither brings cards any more ("One progression path for every game", below).

Simulated (`tools/learnsim.js`, 5 seeds × 300 questions, the four profiles, `main` and the rule on the same seeds;
mean ± sd over the seeds): genera met (cards and asked) and true knowledge of the slate:

| Profile | | met q50 | met q100 | met q200 | met q300 | know q50 | know q100 | know q200 | know q300 | right % (1-300) | open/15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner | main | 10.6 ± 0.5 | 18.4 ± 2.7 | 27.4 ± 3.8 | 38.8 ± 2.2 | 0.16 ± 0.00 | 0.28 ± 0.01 | 0.46 ± 0.04 | 0.65 ± 0.02 | 77.4 ± 0.6 | 3.0 ± 0.0 |
| | rule | 9.8 ± 0.4 | 16.2 ± 0.8 | 28.0 ± 2.0 | 37.8 ± 2.5 | 0.15 ± 0.00 | 0.26 ± 0.01 | 0.47 ± 0.02 | 0.64 ± 0.02 | 78.5 ± 0.8 | 3.0 ± 0.0 |
| lecture RA | main | 11.2 ± 0.4 | 20.6 ± 0.5 | 35.6 ± 3.4 | 40.0 ± 0.0 | 0.37 ± 0.01 | 0.46 ± 0.01 | 0.65 ± 0.01 | 0.76 ± 0.01 | 79.7 ± 1.2 | 3.0 ± 0.0 |
| | rule | 10.8 ± 0.4 | 18.6 ± 1.7 | 33.4 ± 2.2 | 40.0 ± 0.0 | 0.37 ± 0.01 | 0.47 ± 0.02 | 0.63 ± 0.02 | 0.76 ± 0.01 | 79.8 ± 0.8 | 3.0 ± 0.0 |
| strong RA | main | 10.4 ± 0.9 | 19.8 ± 0.8 | 38.0 ± 1.6 | 40.0 ± 0.0 | 0.61 ± 0.01 | 0.67 ± 0.00 | 0.79 ± 0.01 | 0.85 ± 0.01 | 86.4 ± 1.2 | 3.0 ± 0.0 |
| | rule | 10.0 ± 0.7 | 18.6 ± 0.5 | 35.6 ± 1.1 | 40.0 ± 0.0 | 0.61 ± 0.01 | 0.66 ± 0.03 | 0.78 ± 0.01 | 0.85 ± 0.01 | 84.9 ± 1.3 | 3.0 ± 0.0 |
| expert | main | 10.6 ± 0.5 | 19.6 ± 0.5 | 38.0 ± 1.0 | 40.0 ± 0.0 | 0.93 ± 0.00 | 0.94 ± 0.00 | 0.95 ± 0.00 | 0.95 ± 0.00 | 96.0 ± 0.5 | 3.0 ± 0.0 |
| | rule | 10.6 ± 0.5 | 19.6 ± 0.5 | 37.6 ± 0.9 | 40.0 ± 0.0 | 0.93 ± 0.00 | 0.94 ± 0.00 | 0.95 ± 0.00 | 0.95 ± 0.00 | 95.6 ± 1.0 | 3.0 ± 0.0 |

Questions until 10 / 20 / 30 / 40 slate genera are met (40: the runs that met all of them by question 300):

| Profile | main | rule |
| --- | --- | --- |
| beginner | 44.6 / 119.6 / 211.0 / 278.3 (3 of 5) | 49.4 / 122.6 / 229.8 / 294.5 (2 of 5) |
| lecture RA | 41.6 / 94.4 / 157.2 / 231.8 | 43.2 / 106.0 / 168.0 / 245.2 |
| strong RA | 45.6 / 98.4 / 152.8 / 208.0 | 47.4 / 105.6 / 165.2 / 223.0 |
| expert | 45.4 / 100.8 / 155.0 / 209.4 | 45.4 / 100.8 / 155.6 / 210.4 |

How often the rule held an opening (per run, means ± sd; "held": questions where every other condition allowed a card
and a genus was left to open, so only the rule stopped it; "expected": those questions' `openChance` summed, the
openings they would have brought on average; "wait": questions from the first held question of a spell of misses to
the next card):

| Profile | own cards, main / rule | cards right after a miss, main / rule | held | expected | wait (mean, median) |
| --- | --- | --- | --- | --- | --- |
| beginner | 36.2 / 34.0 | 7.4 ± 3.0 / 0 | 18.0 ± 3.6 | 5.8 ± 1.9 | 10.6, 5 (89 spells) |
| lecture RA | 41.0 / 40.8 | 8.4 ± 0.9 / 0 | 12.4 ± 4.9 | 8.8 ± 4.3 | 3.5, 2 (62 spells) |
| strong RA | 41.0 / 41.0 | 7.4 ± 1.5 / 0 | 8.6 ± 3.1 | 8.2 ± 3.3 | 2.5, 2 (43 spells) |
| expert | 41.0 / 41.0 | 1.0 ± 1.0 / 0 | 0.8 ± 0.4 | 0.8 ± 0.4 | 2.0, 2 (4 spells) |

On `main` about one card in five (beginner and RAs) came on the question right after a miss; with the rule none. The
expected slowdown: one to two genera fewer by question 100 for the beginner and the RAs (beginner 18.4 → 16.2, lecture
RA 20.6 → 18.6, strong RA 19.8 → 18.6), 3 to 19 questions more to reach 20, 30 and 40 genera, nothing for the expert
(rarely wrong). True knowledge by question 200 and 300 within the seeds' spread for every profile; at question 100 the
beginner's is 0.02 lower (0.28 → 0.26, sd 0.01: it has met two genera fewer), equal again from question 200. Right %
within the spread. The beginner's waits are longer (median 5 questions, a long tail): its misses come in runs, and
its `openChance` is lower. No other constant was touched.

Real answers (rule L12; a read-only count, by a script kept outside the repo, on the sheet's Answers tab exported 2026-11-03: 1,345 answers of 10
players, read-only, aggregates only): a replay cannot judge this rule (it changes which question comes, not any
estimate), and the log records no cards; measured instead how often a genus's first meeting followed a miss. A first
meeting is a player's first question on a genus (the log's "New photos" column counts photos new to the player, not
genera), in the photo quiz, after their first 4 genera (the first cards), within the same visit (under 30 minutes
after the answer before), leaving apart the first questions that come in bursts (two or more others within two
questions: Open all asks the genera never asked first). Of the 130 first meetings on the path, 22 (17%) came on the
question right after a miss, and, assuming each genus was asked as soon as ready (its card `INTRO.GAP` questions
before), 21 of the 130 cards (16%) were shown on the question after a miss: about the players' miss rate (19%), as
expected when nothing ties the opening to the last answer. Per player (P1-P10 by number of answers; first meetings on
the path, right after a miss / estimated card after a miss): P1 36, 6 / 8; P2 8, 0 / 2; P3 25, 5 / 5; P4 24, 5 / 5; P5
13, 2 / 0; P6 11, 1 / 0; P7 9, 3 / 1; P8 4, 0 / 0; P9 and P10 none on the path. So about one opening in six that real
players met would have been put off until their next right answer.

### One draw weight (2026-11-03)

The independent review's item 8, first half (Pierre, 2026-11-03: "one variable computed dynamically, as simple as
possible"; the second half, no longer updating the genus wrongly picked, came next: rule L2 kept, both genera affected,
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

- **The measure** (`tools/commonness.py`, run once offline, never on the phones: rule L13): for every game
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
rule L5) opens only once the genus its card compares it to has been met. A beginner had met *Duncanopsammia*
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
  met, so its card shows first), a card of its own, a genus closed again by One at a time. **Open all** still opens
  everything at once (the rule only orders the one-at-a-time path), and the choices are unchanged (genera met). Changed
  2026-11-04 (Pierre: one path for every game): the Duel tab, Memory and the custom quiz draw only genera unlocked, so a
  ★ genus reaches them only after the path opened it behind its references (until then a duel could bring a ★ genus's
  card before its reference's: *Cyphastrea*, *Duncanopsammia*, *Merulina* in a beginner's walkthrough).
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
the 15% share (`BONUS_SHARE`) were removed (rule L11): they came after the slate, so the normal opening and
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

*The bar until rules version 9 (2026-11-06): replaced by "The domain-score bar" below; kept for the records not
rebuilt yet.*

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
  choices after the first right answers anyway (traps, rule L7). A wrong answer counts against both genera (rule L2),
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
  2.5-8.5 depending on A and the entry, 0.5-3.3 with this rule). Progress and mastery never depend on time (rule L1;
  time only plans the questions after a break, "Comeback after a break").
- **Photo difficulty left out** of `w`: simulated as a third factor (0.5 on an easy photo to 1 on a hard one), it only
  slowed everyone (an expert mastered 5 genera in 1000 questions instead of 16), which `A` already sets, and the traps
  already come as a genus's photos get harder (both follow its Elo ability). One factor less (rule L11). Only the part
  of a right answer that the player's memory of the photo explains is taken off (since 2026-11-03, `pgMemW`: "Photo
  memory", below); a right answer on a photo new to the player keeps its full weight.
- **Progress saved before `s.pg`** (`pgOf`, the same in the app, `core.js` and the sheet): BKT's L is ignored; the
  device holds no answer log, only the last 10 results of each genus (`s.h`), so those are replayed from 0, a right
  answer weighed `PROG.OLD` = 0.67 (what it proved is not known: the middle weight), a miss in full. Simulated (the
  replay against the live value after 1000 questions, genera with 10 answers or more, misses there weighed as right
  answers, so in full a little lower still): +0.03 for a beginner, −0.07 for
  a lecture-level RA, −0.11 a strong RA, −0.21 an expert (weight 1 would overstate a beginner by 0.15); 10 right in a
  row give 0.65, 77% on the bar: no genus enters the exam on old answers alone. A genus learned on such a record passed
  its exam under BKT and loses it (below, "Learned under the former model"); until then it counts at the exam's entry. The record is rewritten at the genus's next answer. On the base runs (BKT, 300 questions, 6
  seeds) this recalculation moves the overall %: beginner 21-30% → 23-28%, lecture-level RA 35-41% → 33-37%, strong
  RA 32-53% → 27-44%, expert 65-82% → 45-51%; genera at 95% or more before their exam all drop under it. The full
  recalculation replays each player's whole answer log from the sheet's Answers tab (mode `|kN`, Choices): "Full
  replay", below (2026-11-03).
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
look-alikes) but left an expert with 4 genera learned after 1000 questions (rule L1: everything in a few hours); A
0.2 is close to BKT for the expert (8 right in a row) and drops 15-17 points on a miss. A 0.15 sits between: 10 in a
row, 15-17 right answers in a real game for players who know their genera, 29 for a beginner, an expert with every
genus at 50%+ by question 600 and nearly all learned by 1500. The entry: 0.85 kept more genera under it (an expert
learned 9.8 genera in 1000 questions instead of 16.5); 0.8 is the success the game aims at, held on questions that
prove something. To recalibrate with real answers: the per-genus success on look-alike questions of
RAs who then pass the exam.

### The domain-score bar (2026-11-06, Q127-Q129, Q135; rules version 9, sheet v87)

**What the bar means** (Pierre, Q127, Q128): the bar of a genus is the share of **all its possible photos**, easy to
hard, the player would name right, one photo alone with no choices to guess from (100% = every photo named), as far as
**their own answers on that genus** have shown. Never the global level, never another genus: a genus never answered
shows 0. This is the IRT domain score (Bock, Thissen & Zimowski 1997) over the genus's photo *population* (random-item
IRT, De Boeck 2008): a photo's difficulty d ~ N(μ_g, τ²), μ_g the sheet's genus offset `gd` (one genus difficulty, Q133),
so adding photos moves no bar (Pierre's refinement; docs/reviews/2026-11-06-progress-metric-research.md §7).

**The estimator** (docs/reviews/2026-11-06-engine-algorithms-review.md §14, Q135): the **posterior expected** domain
score, on a grid of abilities (`core.js` `DOM`, `domStep`):

- prior: one fixed population prior N(`M0` −2, `SD0` 1.5) for a genus never answered (most players start a genus not
  knowing it; broad enough that an expert's first right answers on hard photos lift it within a handful);
- each own answer on the genus: likelihood g + (1 − g)·R·σ(S·(θ − d)), g = 1/k the guess rate (none typed), R the recall
  of a comeback question, d the question's difficulty as the game scores it (photo, memory, mix-ups term: `scoreAnswer`'s
  `dm`) less this format's offset (`q.df`, Q138 / Q146: the offsets PR #638 fits; 0 until the game passes them, so a
  2-choice question, right more often than a 1 in 2 guess explains, will prove less when right and cost less when
  missed); S the shared slope (kept at 1);
- the domain score of the posterior: E over θ of E over d of σ(S·(θ − d)), the inner one in closed form,
  σ(S(θ − μ′)/√(1 + π S²τ²/8)), μ′ = μ_g + 0.5 (one view alone, `PICKD.SINGLE`) + the typed format's offset;
- learners change: before each own answer the posterior **drifts** by `Q` 0.1 (the process noise of a Kalman filter,
  Glicko's growing deviation), so old answers fade and a genus learned late is credited;
- stored per genus: `s.dp`, the log posterior on 21 points (θ from −4 to 6 by 0.5, relative to its top, 2 decimals,
  clipped at −30; under 200 bytes), and `s.ds`, the bar, recomputed at each own answer. The bar moves only when the
  player answers on the genus (or a replay rebuilds it), never when the photo stats change; the genus offsets the game
  used are logged with the answer (`sc` m, n) so the replay meets the same ones.

**The genus wrongly given: a false alarm, not a miss** (Pierre, 2026-11-06, Q163, Q174; rule L2). Naming B for a photo
of another genus says the player answers B too readily (a response bias), not that they fail to name B's own photos.
As a full miss in B's posterior it took genera a real player knew well to 0 (21 right answers in 26 on a genus they
had named 13 times for others: 0%; Pierre: "0 means you know nothing, and that's not true"). Signal detection theory
separates the two (Green & Swets 1966; Macmillan & Creelman 2005): B's bar is its domain score from B's own photos (H)
less B's false-alarm rate FA, the two-high-threshold corrected recognition Pr = H − FA (Snodgrass & Corwin 1988, J.
Exp. Psychol. Gen. 117(1)) (`core.js` `faOf`, applied by `barOf`, `examOpen`, `keepsMark`). FA = the times B was given
for another genus's photo (the other records' `conf[B]`) over the questions where B was a possible answer: offered
among the choices (the other records' `off[B]`) or any typed question on another genus (`P[LEVEL].ty − s.ty`; the
typed questions are counted, `ty`, merged and replayed like the counts). Measured before the change:

| | Worst over-claim, path cells | Custom-8 drilled genera | Busiest real player's progress (main 38%) |
|---|---|---|---|
| L2 as a full miss | −3 | +10 | 23% |
| false-alarm correction | +3.2 | +14 | 31% |
| no false-alarm effect | +6.1 | +16 | 33% |

The ability is untouched; B's recent results and runs still take the miss (rule L2). A false alarm never raises a bar:
B's falls by its new rate. A question that offers B without B being given lowers B's rate a little (a correct
rejection), so B's bar can rise a hair without an answer on B: evidence, not time (rule L1).

**A miss never raises the bar** (the review's §14 point 1: θ − z·SE rose after a miss). With a logistic likelihood a miss
shifts the posterior down (monotone likelihood ratio) and a right answer up, so the expectation follows; the drift alone
can move it a hair either way between answers, so the stored bar moves the answer's way only (a right answer never
lowers it, a miss never raises it). Tested over random histories (`tests/dombar.test.js`). A miss says the same about the
ability among 2 choices, 4 or typed (the guess rate only explains right answers); what a right answer proves grows with
the choices, typed most, and with the photo's difficulty.

**Zero for a genus never answered.** The prior's own domain score D0 is not 0 (about 0.15 on an average genus), and Pierre
wants nothing credited before it is shown. The bar is the domain score itself from a knee up and a straight ramp from 0
at D0 below (`domBar`); the knee is 2·D0, or halfway from D0 to 1 for a very easy genus (D0 over 1/3), so every value up
to 1 stays reachable. An increasing map, so a miss from a fresh genus leaves 0 and the property above holds.

**Display and the exam** (Pierre's decisions of 2026-11-06): the dynamic bar runs from 0 to 95% (`barOf`, at most 0.95);
the mastery exam opens at a domain score of `DOM.EX` 0.85 (Divemaster) and only the exam takes the genus to 100%, each
exam question passed filling a fifth of what is left (1% a question from 95%, as before). A learned genus keeps its mark
while its domain score stays at `DOM.KEEP` 0.8 or above, about one miss below the entry (simulated: one miss at that level
takes 2-4 points). `EX` and `KEEP` are choices for Pierre.

**Pair coverage at the exam's entry** (Q129; Pierre's rule of 2026-11-02: "a genus can't be confirmed as learned before
it has been compared with the genera it gets confused with"). The bar no longer weighs look-alikes, so the exam does:
a genus takes its exam only once it has been asked beside each of its declared look-alikes the player can be asked
(the slate and the bonus genera turned on), either way, or mixed up with one of them (`core.js` `looksLeft`, model.js
`examOn`, `examLooks`). Until then it can sit at 85% or more without the exam; its sheet says which look-alikes it
still needs ("Still needed"), and Divemaster waits for it too. The exam photos at a fixed hard quantile (Q139) and the
exam over two visits (Q143) are part 3.

**The recalculation** (rules version 9). The sheet replays every player once. The players whose % went down by a point or more see an
apology card (a rise of 5 points or more gets the standard card, `RV_SORRY` `down`) (`RV_SORRY`, PR #611's card, Q109; the text Pierre approved, Q172: "Sorry: we recalculated your progress", the % on a line of its own). In a jump
through several versions it replaces the standard card. Its PS is a line of the sheet's Notes tab (key `card.rv8.ps`,
served as `notes` with every load and save reply, Code.gs `notes_`), which may name a player and so is never written in
the repo (rule D2). The learned marks passed since 2026-11-02 are kept unless a miss logged after the exam takes the
genus under `DOM.KEEP` (the replay's `lm`); the marks passed under BKT are dropped (`afterBkt`).

**One reading for every consumer** (the coherence review's F2, F5): `barOf`, `examOpen`, `keepsMark`, `scoreOf` and `pctOf`
in `core.js`; the game (model.js `examOn`, `mxKept`, `missing`, `lvStep`, `typedP`), the full replay (lm), the admin and
the sheet's leaderboard (Code.gs `pctOf_` now calls `core.js` `pctOf`, no copy) go through them.

**The learned-mark protection** (the coherence review's F8, F9): a mark passed under Bayesian Knowledge Tracing (before
2026-11-02) is recognised by a record with neither the moving average `s.pg` nor the domain-score bar `s.ds`
(`afterBkt`), no longer by `typeof s.pg !== 'number'`, which would have dropped every mark of the new rules.

**The transition (rule D4).** The moving average `s.pg` is no longer the bar. A record the new rules have not rebuilt
(saved with `s.pg`) keeps it, and the former rule with it, until the sheet's full replay under rules version 9 reaches
the device; a genus first answered in the app takes the new bar only once the sheet replies v ≥ 87 (`DOM_SHEET`,
model.js `domRules`), and the app's own replay of its queued answers follows the same version. The fish are not
replayed: a fish unit first answered takes the new bar at once, and one answered before is rebuilt on the device, silently
(Pierre, 2026-11-06, Q200; no card, the apology is the corals' only). The device keeps no log of the answers the sheet has
confirmed, and players cannot read the sheet's log, so the rebuild works from what every copy of the record holds
(`core.js` `domFromCounts`, model.js `domRecalcAll`, at load once the data is in, at a subject switch and after a pull): its right and wrong
answers and the order of its last 10. The earlier answers are spread evenly, then the last 10 in order, each on a photo of
the unit's average difficulty (`genusDiff` with one view alone) among 4 choices. It is approximate but the same on every
device, done once per record, and a learned mark is kept (`afterBkt`). Simulated, a unit at 71% after 6 right answers
falls to about 60% (on an average photo; less on easy units). The `pgStep` code
remains only for those records and can be deleted once none is left.

**The shared slope (Q147, pending Pierre).** One input, `q.S` (logged `s`), used in the expectation (the ability step,
the logged e) and in the bar's posterior; 1, the Elo's own, until the sheet estimates it (#638 measured about 0.4 on the
real log). The per-format offsets (Q138) enter the same way (`q.fo`, `q.ft`, logged `o`, `t`), 0 until the sheet serves
them.

**Tuning (Q155, Pierre 2026-11-06; pre-declared in PR #646 before any tuning run).** Pierre: *"I prefer progress that
doesn't move fast enough, even if we speed it up later, rather than too fast, because every time we lower it people
feel they go backwards."*

- **Target (asymmetric):**
  - over-claim at most +3 points in every cell;
  - then the least under-claim;
  - the expert at q100 and q300 as the main secondary measure.
- **Cells:**
  - the field (τ 0.5), exemplar and item worlds;
  - five profiles, all genera met, at questions 100, 300, 600 and 1,000;
  - the spotty player's unknown genera;
  - Custom-8's drilled genera at the end of the drill.
- **Grid:** Q ∈ {0.1, 0.15, 0.2, 0.3, 0.4, 0.5} × SD0 ∈ {1, 1.5, 2, 2.5}, with the knee at 2. A knee of 1.5 or 3 is tried only if no setting meets the constraint.
- **Tuning data:** seeds 1-30, the bar replayed on PR #624's runs.
- **Confirmation:** live on seeds 61-90. One Holm family of six primaries:
  - per world, the constraint as an intersection-union of one-sided t-tests;
  - per world, less under-claim than the untuned bar, paired by run.
- **Result (seeds 1-30):** no setting meets the constraint. All 72 were tried: the grid, then the knee at 1.5 and 3.
  - The cell that fails every time is the field world's beginner on the 8 genera drilled in Custom-8. They really name
    68% of those genera's photos; main shows 92%, #646 as opened 78%, and the most cautious setting still +5 points.
  - The drill only offers the 8 genera, so a right answer there proves less than one against the whole slate, and no
    constant of the bar can see it. Pair coverage at the exam's entry (above) is where it is handled.
  - Pierre's decision (2026-11-06): keep the cautious constants as opened (Q 0.1, SD0 1.5). Rule L2 in the bar became
    the false-alarm correction below (Q174).
  - The plain numbers are in the PR.

**Constants** (set from principle, not tuned; Q141: no tuning before the three-world judge): the grid, the prior (M0, SD0),
τ 0.5 (a photo's own spread around its genus, the hierarchical photo Elo study; `PDIFF.EASE`), Q 0.1. A toy check (a
learner of fixed ability shown photos near the game's target, 4 choices, 60 answers): the bar settles within 0.03 of the
true domain score on average over five abilities. The judge of PR #624 (three learner worlds, the real log) measures it
before any change.

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
- **The spelling step** (a player's idea, approved by Pierre 2026-11-05: "Good idea!"): a typed name of the genus asked
  that the tolerance accepts but is not exact is retyped once (a warm nudge, "So close! Right genus: just fix the
  spelling and try once more"; exact: the plain "✓ Yes, it's X"; still wrong: "✓ Yes, but not quite: it's spelled X",
  the letters missed marked), so the player learns the spelling instead of moving on.
  **No learning value changes**: the answer is graded on the first reading as before (the genus was recognised; a
  retype is a spelling step, not a second chance at the genus), so progress, Elo, the exam and the replay are untouched
  and no rules version is added; a close typo of another genus stays a wrong answer. The raw text and the step's
  outcome are logged (sheet v59, Typed and Retyped right) so typed near-misses can be studied (the name study's
  question g, [reviews/2026-11-05-name-confusion-study.md](reviews/2026-11-05-name-confusion-study.md)). So are the
  texts refused before the answer (sheet v100, Rejected tries; Pierre, 2026-11-08, Q237), logged only: no learning value
  reads them. On a fish genus question, a common name or a family name typed is told so ("is a common name" / "is a
  family: this question needs a genus's scientific name"), never which genus; the rule stands: a genus question needs
  the scientific name.

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
following each player's measured recall, no fixed ramp), its variants simulated with 5 seeds (rule L11). Any change
is recorded here with its numbers.

### Fish on the same model (2026-11-03)

Pierre, 2026-11-03: fish on the same engine as corals (docs/ARCHITECTURE.md "Subjects"). Nothing of the model above changes for fish: the same Elo per unit and global level, progress moving average, mastery exam, typed questions, opening of units, comeback, photo memory, confusion scores. What a fish entry brings in place of a genus's data, and the few settings of its own:

- **Unit** = a level-1 teaching entry of fish.json (the 27 IMR entries of the presentation; since 2026-11-06 the book's families, #656, docs/reviews/2026-11-06-fish-units-plan.md; species, level 2, later). Its progress is kept apart from the corals' (`reefid-sync-fish-progress`): a strong coral player starts fish at the global level of their fish answers, not of their coral ones.
- **Easy wrong choices first**: the coral rule "choices sharing no IMR growth form" uses the entry's **identification group** in the regional key in force (since 2026-11-04, rule S3: for the Indo-Pacific, the 20 groups of the reef fish ID book the IMR course follows, instead of the presentation's 10 shape groups), a grouping by shape and way of life; the look-alike traps come from the IMR look-alikes (`look`), then the player's own mix-ups. No new rule: the group is the entry's "form". Where the book splits an IMR shape group (Parrotfish 8 / Wrasse 9, Soldierfish and Squirrelfish 10 / Cardinalfish 11, Lionfish 16 / the other odd-shaped swimmers 17), the two can now come as easy wrong choices for each other while their look-alike pairs, declared or confused, still make them traps.
- **One photo per question**: fish have no zoom levels (one view), so every question is a single-photo one; the single-view offset (`PICKD.SINGLE`) applies to all of them alike, so it cancels out between entries.
- **Common first**: `cm` = √(Research Grade observations of its species within 40 km of Dauin), the same scale as the corals' (small integers), read by `commonFactor`.
- **Circles** (`app.js` `UNITS.fish` `slate`, `gate`: `fishGate`): every circle is on the path and counts in the progress (Pierre, 2026-11-06, Q175: the opt-in sets "SVS video extras" and "Beyond IMR" are gone, so the fish % is further from 100% and dropped once for every fish player; no rules version: no unit's record moves and fish is not replayed). Circles 2 and 3 open after the IMR course's families, at the thresholds their offers had, now automatic (Q177): circle 2 (seen now and then on SVS video) may open once every circle-1 family has been asked; circle 3 (beyond IMR, Pierre: "once the player is good on the IMR ones") once the progress on circle 1 reaches **`FISH_C3` = 0.5** (the average IMR family at Open Water): a learning milestone, never time (rule L1). Until a circle's threshold its families are out of the opening's candidates (`model.js` `mayOpen`, in `quiz.js` `introStart` and `planPhoto`); past it, they join the usual weighted opening (`openPick`). Open all opens circle 1 only (`UNITS.fish` `core`, `introLeft`). `FISH_C3` is a placeholder to watch with real players. **Checks (rules L11-L12, 2026-11-06, #669)**: the thresholds are the opt-in offers' of 2026-11-03, unchanged, and now accepted automatically. For the corals nothing runs differently (no `gate`, `core` = the slate). `tools/learnsim.js`, the four profiles × 5 seeds, before (#656's head, 2cb9a608) and after on the same seeds gives the same summary at question 300 (knowSlate 0.67 / 0.75 / 0.85 / 0.95, prog% 40 / 45 / 53 / 65, met 38.8 / 40 / 40 / 40, right% 77 / 78 / 84 / 94, beginner / lecture RA / strong RA / expert). There is no fish simulator yet: learnsim is coral-only, and fish profiles come with the species level (FISH_PATH). A replay of the real log cannot judge an opening change either, because a different draw asks other questions, and the fish answers are logged only since 2026-11-06 (v60) and not replayed. What was measured instead is the path itself, in `tests/fish.smoke.js`: circle 1 alone opens while a circle-1 family is unasked, circle 2 next, circle 3 only from 50% on circle 1, and every circle moves the %. Watch the fish log once players reach circle 1's end. **Circle 3 by choice** (Pierre, 2026-11-07 08:50; Q204): at the same threshold a card asks instead of opening circle 3 (`UNITS.fish` `opens`, `quiz.js` `openOfferShow`, the open-all offer's "step" card, "Not now" on top); until the player says yes (the card's "Open them" or My progress's button) its families stay out of the opening's candidates (`model.js` `mayOpen` → `app.js` `openShut`), then open one at a time like any family. "Not now" is asked again once, **`OPEN_AGAIN` = 200 answers** later (`core.js` `openState`: about a few sessions of play, long enough not to nag, short enough to come while the player is still on the IMR families), then never. A player whose circle 3 already opened by itself (from #669 to this change: a circle-3 family on a card) is on, never asked. The % is unchanged: circle 3 counts whether open or not (Q204), so a "no" leaves room. **Checks (rules L11-L12)**: the corals have no `opens` and the opening of fish circles 1 and 2 is untouched, so no learnsim before/after (learnsim is coral-only and nothing it runs changes); the choice is checked in `tests/subjects.test.js` (`openState`) and `tests/fish.smoke.js` (the card at the threshold, "Not now" keeps circle 3 closed, once more then never, My progress opens it).
- **Winks** (`quiz.js` `WINK` = {AT [200, 400]}, `winkAt`, `winkDue`, `winkMerge`): a surprise card for every fish player, circle 1 included (Pierre, 2026-11-03: "ça sera rigolo" for the people working on the IMR course), late and **once per player** (Pierre, 2026-11-06, after his second fish question was the whale shark: the first only after at least 300 fish answers, the next after about 600-700; 13:31: each surprise once per player, and that's all, across devices). Earlier since 2026-11-08 (Pierre): whale shark from 200, thresher sharks from 400. The whale shark is due at the first photo-quiz question from 200 answers of the player's own fish record (`answersSoFar`, so a reload or a sign-in keeps the count; never the visit's count), the thresher sharks from 400 and at least 200 answers after the whale shark (a player already past both meets them apart, never back to back); a wink beyond `WINK.AT` (none yet) would come the same gap later. The winks shown travel with the player (`reefid-sync-fish-wink` {wink id: answer count when shown}, saved with the progress and merged by union at every sync, `sync.js` `mergeSubject` → `winkMerge` → `core.js` `winkUnion`, whatever a reset, and at an account merge, `mergeUsers`; cleared at sign-out with the other account keys, `signOutClear`), so another device of the same account never shows one again. Never over a card. Never counted: no progress, ability, photo rating, confusion, statistic or analysis; its answer is logged like any other (Pierre, 2026-11-08: "il faut l'enregistrer bien sûr"), Mode `wink` in the sheet's Answers tab (`core.js` `WINK_MODE`, `quiz.js` `winkAnswer`), which every reader of the log leaves out (ARCHITECTURE "Surprise cards' answers"). The corals have none (`UNITS.coral.winks` is empty).
- **Logged, not replayed**: fish answers are logged to the sheet since v60 (#630), but the sheet computes nothing from them yet (`SUBJECTS` `replay: false`): the pooled photo difficulty and confusions start from their priors only for fish (the judged-ease prior, the IMR look-alikes) until a per-subject `?stats=1` (ROADMAP, admin plan PR 11).
- **No timed mode, no size estimation**: video ID and EventMeasure measurement are other tools (ROADMAP).

### Fish: the starter core and judged photos (2026-11-04)

Pierre tried the fish beta and pulled it back (2026-11-04): the first families opened were not the right ones, and the
first photos were too hard. Fish answers were not logged to the sheet then (logged since sheet v60, but `SUBJECTS` `replay: false`), so no photo had a
rating and no entry a difficulty: every fish photo sat at 0, and the opening order was commonness and chance. Three
changes, all data the engine reads generically (the corals have none of these fields, so nothing moves for them):

- **The starter core** (`fish.json` `start`, from `tools/fish_source.json`; Pierre's fish-ID design: four easy, readable
  families first): Butterflyfish, Angelfish, Damselfish, Surgeonfish & Unicornfish. `fishGen` marks their records
  `first`; `openPick` opens a `first` unit before any other while one is left, so the `INTRO.START` (4) first cards are
  exactly these four. The rest then opens by the existing rule, easiest and most common first: an entry's difficulty
  (`genusDiff`) is its genus offset (none yet for the fish) plus the mean of its photos' judged-ease priors (since
  2026-11-06, "One genus difficulty"; before, the mean of its photos' difficulty, which the judged ease set).
- **Every circle-1 photo judged** (648 photos, then 37 added, `judging/FISH.md`, `tools/fish_judge.json`): an agent
  looked at each one and gave it tags (view, whole fish, light, colour loss, clarity, size, count, juvenile, camouflage;
  the sex / colour phase flag for the entries the presentation says change, `dimorph`: Parrotfish, Anthias) and an ease
  from 1 to 5, capped by rule (a juvenile or a monochrome photo at most 2; the night livery, a strong colour loss, a head-on
  or tail view, a partial fish or camouflage at most 3), plus a proposed crop for 140 of them (a proposal for the admin,
  never applied). The photos of circles 2 and 3 and the winks were judged the same way next (475 photos, 48 crops;
  judging/FISH.md). **The phase flag caps nothing** (Pierre, 2026-11-04): a sex or colour phase is a species-level
  difficulty (an Anthias is easy to call an Anthias, a parrotfish a parrotfish: its family-level difficulty is the
  wrasse); the flag stays for the species questions and the explanation cards. **The juvenile cap follows the
  juvenile classes** (2026-11-04, a research note with sources, classes and rules approved by Pierre; `tools/fish_source.json`
  `juv`, judging/FISH.md): no cap for the juveniles of the class-A entries (Spadefish, Sweetlips, Boxfish) and of the
  show-early genera (*Dascyllus*, *Pomacanthus*, *Macolor*, *Coris gaimard*, *Novaculichthys*, *Arothron stellatus*),
  which help learn the family early; capped for class B (Parrotfish, Emperor) and the look-alike juveniles (*Acanthurus
  pyroferus*, *Scolopsis bilineata*, *Plectropomus laevis*, *Halichoeres*, *Thalassoma*), which come later with an
  explanation card; capped provisionally for the rest (class C, no source), until the bootstrap goes. Very easy photos
  after the classes: Spadefish 8, Sweetlips 10, Boxfish 7, Wrasse 9. The juvenile tag stays on every photo.
- **At least 5 very easy photos per circle-1 entry** (Pierre's target, 2026-11-04): 11 entries had fewer (Spadefish 0,
  Fusilier 0, Sandperch 1, Emperor 2, Anthias 2, Lizardfish 3, Moorish Idol, Goatfish, Triggerfish, Filefish, Lionfish
  4). 214 research-grade candidates of `fish-cand.json` (PR #463: CC0, CC BY or CC BY-NC, Indo-West Pacific) were looked
  at and judged with the same rubric, and 37 very easy ones added (`tools/fish_judge.json` `add`, to 6 per entry; Fusilier
  5): every circle-1 entry now has 5 to 13, and 24 to 30 photos in all. **The same 5 decide when Pierre's curated photos
  replace the stopgap** (admin plan PR 7, `core.js` `FISHPH`, `fishPhotos`; docs/ARCHITECTURE.md "Curated game photos"):
  an entry with 5 very easy photos in play plays on them alone, so its first questions always have 5 to take turns
  among; with fewer, the stopgap's photos (minus those Pierre rejected) join its curated ones. Their ease is Pierre's
  (`fish.ease`, written with the pass's value when he or the auto-sort adds a photo), so the prior and `easyFirst` read
  it unchanged.
- **Reference photos one ease point easier** (2026-11-05, Pierre: a photo a reference source uses to represent the
  species, FishBase's main picture or iNaturalist's taxon cover, "is easy to identify, so it should come early in the quiz
  for a beginner"): such a candidate carries `rep`, and its judged ease gets `REP_BONUS` = 1 (`tools/fish_judge.py`
  `cap`, the flag `r` in its tags), the caps applied after it (a juvenile or a fish in its night livery stays capped). Why one point:
  it lifts a medium photo (3) into the very easy ones (ease 4-5: the gate of an entry's first questions, `easyFirst`, until 2026-11-06) and makes a
  very easy one more likely the card's cover, without passing over the visual rubric (a hard reference photo stays
  hard). It reached the game only through Pierre's curation (candidates) at first; since 2026-11-06 (Q180, Q199) a candidate
  judged sure, or a reference photo judged at the reference level (since 2026-11-08, Q212: any reference photo judged sure like a candidate), is in play by itself, with that ease, hosted on R2
  (judging/FISH.md "What a sure judgement does"); no learnsim run (the fish profile does not exist yet, ROADMAP). A draw that prefers `rep` photos inside the very
  easy set is not built (ROADMAP).
- **The photo prior** (`photoDiff`): a judged photo's prior is its unit's offset + (`PDIFF.MID` 3 − ease) × its
  subject's calibration `ease` (`SUBJECTS` `calib`, `core.js` `calibOf`, default `CALIB.ease` 0.5), so ease 5 starts at −1 and ease 1 at +1. 0.5 logit an ease point is one standard deviation of a
  photo's own difficulty around its genus (the hierarchical photo Elo study, above), so the scale spans the spread real
  photos show and no more. Like every prior it weighs `PDIFF.W` (5) answers once ratings come. The judged prior also
  counts in `easyTrust` (each judged photo as `PDIFF.W` answers), so the fish entries open easiest first from the first
  card even on a device that has not loaded the sheet's stats. **The coral lesson applies**: Pierre's Easy / Medium /
  Hard sets predicted the answers worse than no prior ("Hierarchical photo Elo"), because they encoded featured and
  quality, not what the players find hard. This rubric judges what a beginner must see to tell the family (profile,
  whole fish, its colours), which is closer to that, but it is a judgement: once fish answers are logged, compare the
  ease with the photos' ratings and drop or refit the prior if it does not predict them (ROADMAP).
- **The first questions on an entry**: no wall since 2026-11-06 (Pierre, 14:17: "NO WALL"). From 2026-11-04 to then,
  until an entry reached Open Water only its very easy photos (ease 4-5) could be drawn (`easyFirst`, a temporary
  bootstrap gate). Now every photo can be drawn from the first question: its judged ease sets its prior difficulty
  (above), the draw aims at the player's level with the success target as for any unit, and the players' ratings
  replace the prior as they come. At the start the easy photos are strongly favoured through the prior and the aim, a
  harder one comes rarely; until Open Water a cap keeps it rare whatever the pool (`RARE`, "Rarely under ease 4 before
  Open Water", below). **One engine, a calibration per subject** (Pierre, 14:18): the constants that differ live
  in `SUBJECTS` `calib`, read through `core.js` `calibOf` (defaults `CALIB`): `ease` (the prior's logits per ease point,
  0.5 for both), `ref` (the draw weight of a never-seen reference-level photo: fish 3, corals 1) and `early` (the start's
  lean: the draw aims `early` logits lower on a unit with no answer, fading as `PDIFF.W` / (`PDIFF.W` + its answers):
  fish 1.5, corals 0). The corals keep the defaults, so their draw is unchanged (their photos carry no judged ease and
  no reference level, and their target has no lean). Why a lean: without it, on the entries that open later, the target
  (the player's level) sat above the easy photos and the harder ones came more often than their share (the fish smoke
  saw 64-79% of draws under ease 4 on Wrasse, Groupers, Sweetlips, Filefish, Lionfish); 1.5 logits is the span of the
  judged prior from ease 5 to ease 2. Measured with it (the real app in Chromium, a fresh fish player, 400 draws of each
  opening entry's first question, `photoSet`, seeded): the share of photos under ease 4 is 5% on Damselfish (39% of its
  pool), 8% on Butterflyfish (49%), 10% on Angelfish (57%), 29% on Spadefish (69%, no reference-level photo yet);
  reference-level photos make 88%, 76% and 77% of the first three's draws (42%, 25% and 20% of their pools). The fish
  smoke checks that a harder photo can come early and that every circle-1 entry draws its harder photos less often than
  their share before Open Water.

Constants: `CALIB.ease` 0.5 (the measured photo spread, above; `SUBJECTS` `calib` may set another per subject),
`PDIFF.MID` 3 (the scale's middle); no new threshold (`PDIFF.W`, `INTRO.START` exist).

**Measured** (rule L11). `tools/learnsim.js` has no fish profile yet (its learners and world are the coral genera), so
the outcome simulation cannot judge this change; what was measured instead: the real app in Chromium, a brand-new fish
player, 30 questions, right 4 times in 5, the same 5 seeds before (main) and after, every photo shown scored with the
judged ease (rubric 3, the 37 added photos included; main had moved to #428 for this run):

| | before | after |
| --- | --- | --- |
| first cards | 4 of the 27 at random (e.g. Soldierfish, Bream, Groupers, Moorish Idol) | the starter core, every seed |
| questions 1-15 on a starter entry | 21 / 75 | 75 / 75 |
| questions 1-30 on a starter entry | 36 / 150 | 124 / 150 |
| ease of the 150 photos shown (1 / 2 / 3 / 4 / 5) | 11 / 31 / 54 / 40 / 14, mean 3.10 | 0 / 1 / 2 / 98 / 49, mean 4.30 |
| very easy (4-5) in questions 1-15 | 39% | 100% |
| juvenile photos shown | 9 | 0 |
| phase photos shown (no longer kept back) | 11 | 3 (very easy Anthias, opened at answer 22 or 27) |
| the starter cards' photo (ease) | 4 / 5 / 4 / 4 | 5 / 5 / 5 / 5 (`fishGen` `cover`: the easiest judged photo of the highest source tier, Pierre's own first) |

The 5th to 7th entries opened at answers 17-28 in both, as before (`OPEN.WIN` and `OPEN.MAX` unchanged). The real-log
replay (rule L12) cannot judge it either: the sheet holds no fish answer.

### Fish: easy, reference-like photos first, whoever took them (2026-11-06)

Pierre, 2026-11-06, after his fish tests: a beginner saw mostly his own photos. They are good identification material
because their difficulty varies a lot, but few are reference photos (good colours, a clean side profile, the whole fish
seen). "The first photos a player sees, by whatever mechanism, must be easy, near-reference photos"; his photos stay in
the database, never forced or boosted, in the games or on the sheets. What had forced them, each removed for fish:

- **The photo list** (`tools/fish_photos.py`, the stopgap the quiz reads): his observations came first, up to the 24 of
  an entry, so the four starter entries (Damselfish, Butterflyfish, Angelfish, Surgeonfish) showed his photos alone
  (since 2026-11-03, #442). Now (Pierre, Q148) every compatible photo of his is in the list, beside the other
  observers' 24 per entry, at its own difficulty (573 of 1,740 photos; ARCHITECTURE.md "Photos, stopgap"); the order
  below decides which are met first.
- **The card's photo** (`core.js` `fishGen` `cover`; `app.js` `fishGenera` for a genus card): the easiest judged photo
  within the highest source tier, his first even at ease 2 against another observer's 5 (#461, 2026-11-04; #526).
- **The draw's bonus for a photo never seen** (`model.js` `photoSet`): × 1.3 for IMR and Pierre's photos (2026-11-01),
  which for fish meant his. Now `SUBJECTS` `tiers` (the corals) only.
- **The fish auto-sort** (`autosort.js` `fishRun`, admin): his candidates filled each species' target first (#479,
  2026-11-04), whatever their ease.

One order instead (`core.js` `easyRank`): the easiest first by the photo's difficulty, which is its judged ease
(judging/FISH.md; the curated ease once the game reads Pierre's curation) until fish answers are logged, then
`photoDiff`'s rating as the answers come (`app.js` `rankPhotos`, run at load and with each photo stats reply); among
equals the most reference-like (`refScore`: the reference flag `r` first, then a point for each field-guide trait:
profile, whole fish, good light, no colour loss, sharp, large, one fish; a point off for a juvenile, camouflage or out of
water); then a fixed hash of the photo's name (the list's order, Pierre's photos first, never decides). It decides the card's photo, the first photo of each list (the families list, Home) and
the order the auto-sort fills a species. The draw itself is unchanged: the very easy photos of an entry's first
questions (`easyFirst`), then the difficulty targeting, now with no source factor. No new threshold (`REF` only breaks
ties between photos of the same ease).

**Reference photos first** (Pierre, 2026-11-06, the same day: after #635 a fresh player's first 10 photos were still 5
of his, easy but his; a new entry should start on reference photos; 14:02: every photo of reference quality, not only a
source's cover, and never an exclusive rule that would show one photo again and again). The units' reference photos
(`tools/fish_refs.py`, judging/FISH.md "Reference photos": iNaturalist's cover and taxon-page photos passing the game
photo rules, FishBase's photos) join the game photos once judged. **Reference level** (`core.js` `refLevel`): a source's
reference photo (`rep`) judged very easy, or any photo judged 5 with the reference look in its tags (profile, whole, good
light, true colours, sharp, large or medium, one fish or a school; no juvenile, camouflage, out of water), whoever took it; in both cases one kind of fish (rule P3).
It comes before every other photo in `easyRank` (`refFirst`), so it is the card's photo and each list's first, and a
never-seen one weighs 3 times more in the draw (fish `SUBJECTS` `calib.ref`; `model.js` `photoSet`, beside the never-seen bonus): first
in priority, never alone. Why 3: a reference-level photo then wins most first draws on an entry with a few of them among
twenty-odd very easy photos, while the others still come (a measured first-10 below). Still no source rule.

### The fish draw in big pools (2026-11-06, Q186)

Pierre, 2026-11-06 15:16 (Q180): the fish candidates judged on the rubric enter the game automatically, about 6,600
photos at once, most of them judged ease 1-3; the four starter entries go from 452 to 2,051 photos. His rule of 14:17
stands (no wall; the easy photos strongly favoured through the prior and the aim; a photo under ease 4 rarely before
Open Water). It failed in big pools: an unanswered photo's targeting is wide (sd √(0.7² + `CAL.U` 1) = 1.22 logits,
against 0.5 an ease point), so the weights of ease 5 and ease 3 differ little, and every observation keeps
`PICKD.FLOOR` (5%) of the best one's weight, so a thousand hard observations outweigh a few hundred easy ones; the draw
followed the photo counts. 15:33 (Q186): a per-subject calibration, the corals unchanged. Two `SUBJECTS` `calib` fields
(`core.js` `CALIB`, `calibOf`), read by `model.js`:

- **`u`** (`calU`, `calSd`): how unsure an unanswered photo's difficulty is (variance). The corals keep `CAL.U` (1: their
  prior was only the genus's offset when it was set); the fish take **0.25**, one ease step's spread (0.5², `CALIB.ease`
  squared): every fish photo carries a judged ease, so the prior leads until answers come, as `CAL.N` fades it.
- **`pool`** (`drawFloor`): the floor is shared over this many observations when a unit has more (each keeps
  `PICKD.FLOOR` × pool / observations), so the floor's total weighs what a pool-sized unit's does. The corals keep it
  unbounded (every observation the whole floor, as before); the fish take **30** (a species' candidate cap, about an
  entry's stopgap pool).

Simulated in the real app (`node tools/fish_draw_sim.js [--photos FILE] [--calib JSON]`: `model.js` `photoSet` drawn 300
times per entry and stage on a new fish player, the share of photos shown under ease 4). Stages: a new entry, then 10,
25, 60 and 120 answers with the ability 0.5, 1.2, 2, 2.8. Before → after Q186:

| Pool | Start: worst / mean | 10 answers: worst | 120 answers: share under ease 4 (range) |
|---|---|---|---|
| Today's (1,935 photos) | 41% / 18% → 31% / 10% | 59% → 42% (Groupers: 11 very easy photos) | 26-81% → 43-89% |
| With the candidates (8,561) | 45% / 27% → 17% / 7% | 48% → 32% (Groupers) | 53-79% → 64-88% |

The four starters at the start, with the candidates: Damselfish 17% → 1%, Butterflyfish 16% → 2%, Angelfish 14% → 3%,
Surgeonfish 37% → 8%. The hard photos are not starved: as the ability rises the target rises past them, and at 60 answers
half or more of the photos shown are under ease 4 (the distinct photos shown grow with each stage, e.g. Damselfish 136
at the start to 264 at 120 answers). Swept: u 0.25 with an unbounded pool (start worst 61%: narrowing alone hands the
floor even more weight), u 0.1 with pool 20 (start worst 13%, close to the chosen pair, a sharper prior than the measure
behind `CALIB.ease`). `tests/drawcalib.test.js` checks the corals keep `CAL.U` and the whole floor for every pool size;
`tests/fish.smoke.js` keeps its bound (at most 1/3 under ease 4 before Open Water).

**Learning outcomes** (rules L11-L12; `tools/learnsim.js --subject fish`, today's pool, 4 profiles × 5 seeds, 600
questions, 1 worker; before = `--calib '{"u":1,"pool":1e9}'`, the draw of before Q186; `tools/barjudge.js` for E and
the time to credit). Nothing moves beyond the seeds' noise:

| Profile | True knowledge q600 | Right % q600 | Judge \|E\| q600 | Mean bar 50% (question) |
|---|---|---|---|---|
| beginner | 0.90 → 0.90 | 73 → 75 | 0.195 → 0.172 | not reached → not reached |
| lectureRA | 0.91 → 0.88 ± 0.06 | 76 → 76 | 0.205 → 0.193 | 269 (5/5) → 287 (3/5) |
| strongRA | 0.93 → 0.92 | 76 → 76 | 0.234 → 0.217 | 281 → 236 |
| expert | 0.96 → 0.96 | 96 → 95 | 0.224 → 0.216 | 228 → 233 |

The real-log check (L12) cannot judge it: fish answers are not replayed by the sheet and only 27 are logged, so what
was measured instead is the simulated learner above and the draw's easy share (`tools/fish_draw_sim.js`). The smoke's
"after Open Water" check now sets the entry as a player reaches Open Water (its bar at 60% with 12 answers, 10 right, and
the ability 0.5), not the bar alone: with the bar alone and the start's ability, the narrower targeting drew the harder
photos about 3% of the time (10% before), a state no player reaches; at that Open Water state they come about a third
of the time.

### Rarely under ease 4 before Open Water (2026-11-08)

Pierre's rule of 2026-11-06 14:17 ("No wall: before Open Water a photo under ease 4 may come, but rarely") was left to
the prior and the aim, and they do not hold it. The fish smoke failed on one seed of five (6 of 15 photos under ease 4,
its bound a third) on a PR that changed nothing in the draw. What was measured (the real app in Chromium, a brand-new
fish player answering right, 15 questions on the starter families, every photo shown before its family reaches Open
Water scored on its judged ease; 20 seeds):

| | under ease 4 before Open Water | seeds over the smoke's bound |
|---|---|---|
| `main` before the judging batches of 2026-11-08 (8ff76f9) | 64 / 300 = 21.3% | 2 of 20 |
| `main` after them (77cecab) | 66 / 300 = 22.0% | 2 of 20 |
| with `RARE` | 25 / 300 = 8.3% (at most 3 of 15) | 0 of 20 |

So the batches did not cause it (the starter families already held about two thirds of their photos under ease 4 before
them: Damselfishes 65% of 1,029 photos then, 67% of 1,100 now); they only moved the seeded sequence onto a failing seed. The cause is in the
draw: a family's ability passes 1 after two or three right answers while its progress is still under Open Water, the
start's lean fades with those answers (`calib.early`, `PDIFF.W`), so the target sits between ease 4 and ease 3, where
the Gaussian targeting tells them apart little; and a photo's chance is its weight times the number of photos like it,
so the share under ease 4 follows the pool's counts. In a pool dominated by hard photos (12 easy against 240, the unit
test) the draw gave 68% under ease 4 before Open Water.

**`model.js` `RARE`, `rareCap`** (Pierre, 2026-11-08, Q252: the share 0.1; Q271: families only): until a unit of the
subject's own rank (`rareOn`: the fish families; a fish genus, `app.js` `rankOf`, is drawn as before) reaches Open
Water (`LV_AT[0]`), its photos under ease `RARE.E` (4; for a unit with fewer than `RARE.FEW` (3) photos at 4 or more, under
its third easiest, as the smoke's per-entry check reads it) make at most `RARE.SHARE` (0.1) of the photos drawn,
whatever their number. Each observation's hard part is the share of its photos' draw weight that is under the bar; the
hard photos take one factor, `share / (1 − share)` × the easy part's total / the hard part's, both in the choice of the
observation (its weight × (1 − hard part + factor × hard part)) and in the choice of its photo, so an observation with
one easy photo among twenty hard ones counts as mostly hard (Codex review #729: counted as easy it let 91% through).
Exact for a question showing one photo, as the fish do. Why families only (Pierre, Q271: "le plafond pour les
familles seulement ... c'est là que le débutant a besoin de photos faciles"): every new genus starts under Open Water
too, and capping it as well cut the answers on photos under ease 4 by about 30% over 10,000 simulated answers (a study
of 2026-11-08), slowing their rating, while a player meeting a genus already knows its family. Applied last (after the variety and the floor, so neither lifts
them back). When they already weigh less (a new unit, whose lean keeps them near 2-9%), nothing changes; past Open
Water nothing changes. No wall: they still come, about one in ten at most, and among them the least answered still come
first (the factor is the same for all of them, so `calBonus`'s lean towards unrated photos is kept). An exploration
question (`CAL.RATE`, among the observations never seen) stays within the cap: before Open Water, once every easy
observation of the unit has been seen, only the seen hard ones are left out, the seen easy ones stay (Codex review #729:
otherwise the exploration drew only hard photos, 36% under ease 4 over all questions in the unit test). A photo with no
judged ease (every coral photo) is never one of them, so the corals' draw is unchanged. `tests/rareease*.test.js` run
`photoSet` in Node on hard-dominated and mixed pools; `tests/fish.smoke.js` keeps its bound (a third over 15 photos: with
the share at most a tenth, a seed fails about once in a thousand).

Every circle-1 family (`photoSet` drawn 600 times per stage on a fresh fish player, 4 plausible choices; the stages a
new family, 3 right answers with the ability 1.2, 6 answers with 1.5, all under Open Water), share under ease 4, worst
and mean over the 28 families: before 22% / 10%, 38% / 21%, 54% / 32% (Lizardfishes, Spadefishes, Fusiliers: 79-86%
of their pools under ease 4); with `RARE` 11% / 7%, 12% / 10%, 12% / 10%. The start barely moves: the lean already
holds it there, except on the families with few easy photos (Moorish Idol 22% → 10%, Triggerfishes 21% → 10%). Past
Open Water (the bar at 60%, 70%, 85% with 12, 25, 60 answers and the ability 0.5, 1.2, 2) nothing moves: worst / mean
33% / 18%, 53% / 35%, 79% / 61% before, 34% / 18%, 55% / 35%, 82% / 60% after (seeded noise).

**Learning outcomes** (rule L11 tier 1: `tools/learnsim.js --subject fish`, the four profiles × 5 seeds × 300
questions, `main` f83f91e against this change (families only, Q271) on the same seeds; the run now logs each
question's `preOW`, whether its unit was under Open Water and the lowest judged ease shown). Declared before the runs:
primary, the share of photos under ease 4 among the questions on a family drawn under Open Water, questions 1-300,
pooled, down; guardrails, true knowledge of the slate at 300 (margin 0.02) and units met at 100 and 300 (margin 2), the
stats study's margins (one-sided 90% bound of the paired difference, per profile).

| Measure | beginner | lectureRA | strongRA | expert |
|---|---|---|---|---|
| **Under ease 4 on a family before Open Water** (primary) | 29.0% → 9.1% | 34.4% → 10.1% | 35.5% → 7.8% | 48.9% → 9.3% |
| True knowledge, slate, q300 (bound) | 0.362 → 0.363 (−0.001) | 0.529 → 0.523 (−0.009) | 0.690 → 0.697 (+0.002) | 0.944 → 0.943 (−0.001) |
| Units met, q100 (bound) | 17.8 → 17.6 (−1.3) | 18.6 → 18.6 (−0.7) | 18.2 → 18.4 (−0.7) | 19.4 → 19.2 (−0.5) |
| Units met, q300 (bound) | 29 → 29 (0) | 29 → 29 (0) | 29 → 29 (0) | 29 → 29 (0) |
| Right %, q300 | 86.8 → 88.4 | 88.4 → 89.8 | 85.8 → 91.6 | 96.2 → 96.2 |
| Progress shown, q300 | 15.2 → 14.0 | 19.0 → 19.4 | 21.8 → 22.8 | 28.0 → 27.0 |

The primary falls in 20 of 20 pairs (stratified exact sign-flip, standardised per profile: p = 2 × 10⁻⁶ two-sided).
Every guardrail is held in every profile (the bound inside its margin; at 300 every player had met all 29 families
either way). Tier 1 is conclusive and the value was Pierre's (Q252), not a calibration chosen here, so no tier 2. On
this `main` the share before Open Water had risen to 29-49% (the families of #727 and the judged candidates), so the
change matters more than the 20-seed replay above suggests. No genus came in the first 300 questions (genera open at
Advanced since #720), so the simulation does not exercise the families-only scope; `tests/rareease-rank.test.js` does. A
first tier-1 run of 2026-11-08 with the cap on every unit (genera too) and `main` 77cecab is superseded: there the
units met at 300 fell for the expert (26.0 → 23.2), which this run, families only, does not reproduce.

**Getting unrated photos rated** (Pierre's worry with Q252). Every trusted answer rates its photo on the sheet
(`Code.gs` `stats_`: the same Elo for the corals' and the fish's photos, whatever the unit's level, a player's answer
weighing n / (n + `PHOTO_W.N` 10) after their n answers), and the app reads the ratings for every subject (`PSTAT`,
`photoDiff`, `calBonus`). The cap is one factor on all the hard photos of a family, so among them the never-answered
still weigh up to 3 times more (`calBonus`), and the exploration questions (`CAL.RATE`, among the observations never
seen) still reach them, capped before Open Water and not after; genera are not capped (Q271). In the runs above, 60-95%
of a player's first 300 questions are under Open Water; the answers on photos under ease 4 in those 300 fall from
93-178 to 35-101 per player (almost all on photos never answered before), while past Open Water their share is
unchanged within noise (54-74% after, 61-76% before). With about 1,400 fish answers a week (about 6,000 a month) and
some 7,300 photos under ease 4 in play, that is roughly 0.3 answers per hard photo per month before and 0.1 after, if
every answer came from players under Open Water: either way the pool is far larger than the traffic, and the hard
photos get rated where players meet them, past Open Water. A separate exploration share before Open Water (1%) would
add at most 1% of those answers, a tenth of what the cap already lets through, so none was added.

### Fish: scientific genera, the first step of branch B (2026-11-04 night; merged #526, back at Advanced on 2026-11-08)

Pierre, 2026-11-04 (docs/FISH_PATH.md "Levels"): the path is a tree, and branch B starts with the scientific genus names, "a
photo, then 4 genus names". Built on its own branch for his review (admin-only beta), on the engine as it is: a genus is one
more unit (`app.js` `fishGenera`), with its own Elo, progress, mastery exam, typed share, opening and comeback; no new
constant. What is new is structural: a unit has a rank (`rankOf`), and a question's choices and typed answers stay within the
rank of the unit asked (`model.js` `distractors`, `quiz.js` `typeMatch`). Its wrong choices follow rule L7 as an entry's do:
genera of other identification groups first (the entry's group as the genus's form), then its sibling genera in the same IMR
entry as traps (`look`), then the player's own mix-ups. A family's genera came into play at Advanced, the level at which its
species open (FISH_PATH "Unlock rules"), at Open Water from 2026-11-07 (Q205, #702: Advanced came far too late under #646's bar), and back at Advanced since 2026-11-08 (Pierre, after a regular player found them "too early, too strong", with no presentation and no ID cues), as an opt-in set ("Scientific names"), and open one at a time by the usual rule.

**The IMR genera of an IMR player** (Pierre, 2026-11-08, Q219-Q221): for a player who ever answered "I'm at IMR" to the fish
first-launch question (Q227: `model.js` `imrSaid`, from the synced `reefid-sync-fish-start` history `h` or its fallback trail
`fb` 'imr-…', whatever the answer in force now; an inferred answer does not count), the genera the IMR course names alone (`imrg`: Chromis,
Dascyllus, Pomacentrus, Amphiprion as Anemonefish, Heniochus as Bannerfish, Naso as Unicornfish; not IMR's "Surgeonfish",
which names three genera, Q220) join the units in play without the offer once their family is at Open Water (`app.js`
`sciOpen`, the set's `auto`, played whatever the set's state: `bonusList`), and open by the usual rule (their card, then
`openPick`, `openPace`). Nothing else changes: a genus question's choices are genera, a family question's families, so a
photo of a genus not opened (Abudefduf, Acanthurus) or of one opened, asked at family level, is right as its family (Q221;
a Naso photo is right as Surgeonfishes). It applies to every player with that answer, existing ones included (Pierre,
2026-11-08): it reads the current scores, so the IMR genera of a family already past Open Water become candidates at once,
one card at a time at the opening's pace. Counted in the fish global score through the genus credit (#730), as the other genera. A player who turned the set on
before 2026-11-08 gets a one-time card offering to close it (`quiz.js` `bonusBackShow`, the set's `rv` recorded with the
choice as `Q.sciV`). Turned on by hand (⚙, My progress) while no family is at Advanced, a family's genera join from its Open
Water (Pierre, 2026-11-08, Q240: `Q.sciH`, synced with the choice); by the offer, from its Advanced. The IMR-families-first
opening order (`openPick`) reads the same "ever answered" rule (Q238).

**Families met first** (Pierre, 2026-11-09, Q208 A; #822): once the offer is accepted, no new genus card opens while a family
in play is still not met. "In play" means a family that may open now (`model.js` `mayOpen`: circle 1; circle 2 once every
circle-1 family has been asked, `app.js` `fishGate`; circle 3 once the player said yes). When every family in play has been
met, the genera open as before, each from its family's Advanced, one card at a time by the usual rule. `model.js` `openPick`
(`laterWaits`) takes them out of the draw while `fresh` (the units not met that may open now) still holds a slate unit. Which
units wait is `app.js` `setLater`: the units of a set marked `after` (the fish `sci` set only; the coral bonus genera do not
have it). Exempt:
- the IMR genera of an IMR player (the set's `auto` units, Q219), which keep coming from their family's Open Water during the
  family phase;
- the set turned on by hand before it was due (`Q.sciH`, Q240);
- Open all (`openedAll`: a unit opened by Open all and not closed again by "One at a time").

Nothing else changes: the pace (`openChance`, `openPace`), the units in play, and the share of the questions genera take
once they are in. Option C, a ceiling on the genus share while the families are not solid, was left for later, if the data
justify it. No progress rule moves (no `RVS` entry: the order of opening moves no unit's record, and the sheet does not
replay it). Tests: `tests/familiesfirst.test.js`, `tests/fish.smoke.js` (sci part).

**Checked** (#822, rule L11 level 2, declared before running):
- **The declaration**: the primary is `genShare@300` (the share of answers 1-300 on scientific genera), down. World: rated, normal photos, app told the truth. The 5 fish profiles × 10 seeds × 10,000 answers. 2 looks, so bounds at 95% and the primary at 0.025.
- **Primary: not clear.** Pooled sign-flip p 0.38, and only 3 of the 50 pairs moved: lecture RA 0.085 → 0.084, expert 0.078 → 0.075. The beginner, the casual diver and the strong RA came out the same, seed for seed.
- **Guardrails: every one held** (table in #822):
  - in the rated world, normal photos (heavy tails: see #822);
  - in the app world (5 seeds × 600 questions, `--choice auto`), where every run is the same except the strong RA's.
- **Why so small.** Simulated players meet every family in play early. Circles 1 and 2 hold 32 families, met by about 160-340 answers in the rated world. That is before, or about when, a family first reaches Advanced. So the rule rarely binds. The strong RA meets all 32 by about 160, and its first genus comes at 180-260 either way.
- **The real log.** A replay cannot judge a change in what opens, so this was read instead: 4,760 answers, 9 fish players, read on 2026-11-09. 3 of the 9 met genera while a circle-1 family was still not met: 2, 4 and 7 genera. Two of those genera are IMR genera, which stay exempt. Those openings are what the rule changes.

**Offer accepted against declined** (the measurement the Q208 study proposed; main, no code change):
- **How it was run.** Rated world, normal photos, 10 seeds × 10,000 answers, the beginner, lecture RA, strong RA and expert. Read two ways: a paired run on the learning-check Action, with every profile declining in the second arm, and a scratch reader of the same seeds for the families alone. In the scratch reader the strong RA's accepted arm reached 4 seeds and the expert's none.
- **Once accepted, genera take most of the questions** (the accepted arm):

| Answers | Share on genera |
| --- | --- |
| 301-1,000 | 15-49% |
| 1,001-3,000 | 70-78% |
| 3,001-10,000 | 82-84% |

  Declined, the share is 0, except the lecture RA, whose IMR genera come anyway: 16-17%.
- **The family levels come much later**:
  - families at Advanced at 1,000 answers: −2.8 for the beginner, −7.4 for the lecture RA, −11.8 for the strong RA;
  - at 3,000 answers: −5 to −7;
  - every circle-1 family at Advanced: at 4,050-4,500 answers accepted against 1,200-1,700 declined, so 2,300 to 3,300 answers later;
  - the fifth family at Advanced: 40 to 107 answers later.
- **The end state is the same.** At 10,000 answers, 31-32 of the 32 families are at Advanced and have passed their mastery exam in both arms. In this world the exams are passed; the app world found none passed in 8,000 answers.
- **Small other effects.** Declining leaves the families' true knowledge (D\*) a little higher at 1,000 answers: +0.016 to +0.020. The score shown at 1,000 answers is 1.3-1.7 points higher declined for the beginner and lecture RA, and 1.9-3.4 points lower for the strong RA and expert. From 3,000 answers on, accepting is ahead: by 2.6-12.3 points at 3,000 and 13.6-18.3 at 10,000. The declined player stops at 42-46%, with no credit left to earn.
- **What it says.** Accepting delays the family levels a lot, not where they end. By the study's own criterion ("if the delay is large, C is worth designing") this goes to Pierre for C. It is a simulation: the learner learns by the number of answers, and no measure exists yet of how hard a genus question is against a family question on the real log.

Measured (rule L11: no learnsim fish profile exists; the real app in Chromium instead, a scratch run, one seed): an admin
player with the four starter entries at Advanced, answering right, 300 more answers: 130-144 genus questions and 154-168
entry questions, 27-37 genera met (the Parrotfish and Wrasse genera joining when those entries reached Advanced), every genus
question's choices genera and every entry question's entries. Not measured: what players learn (no fish answers are logged);
how the genus share of the questions should be paced against the entries (the draw weighs every unit alike, so many genera
take many questions). To check with learnsim fish profiles once they exist.

### Fish: species order, the commonness index (2026-11-04)

Pierre, 2026-11-04: inside an entry, species open **most commonly met around Dauin first**: the point is to identify what one
will meet underwater, and "common beats easy" for the start; the players' answers adjust the difficulty later (the Elo, as
for every unit). The order is data (`fish.json`: each entry's `species` list, species `cmi`), computed once offline
(rule L12) by `tools/fish_commonness.py`; nothing in the engine changes and no constant enters the model.

- **Signals and weights** (approved by Pierre, strongest first): standardised field counts near Dauin **3** (CCEF Siquijor
  2025 census, presence per MPA; Ferrandis 2021 Dauin stereo-video counts of the fisheries species), the IMR PDF's 24 most
  sighted **2**, iNaturalist distinct observers in three rings (40 km, 250 km, the Philippines) **1**, each scaled 0-1
  within the entry; index = their weighted mean. Distinct observers rather than observations: a keen photographer of a
  rare species inflates the photo count, not the observer count. Needs ID observations count (more data; some
  misidentifications among look-alikes).
- **Shrinkage, M = 5 pseudo-observers per step**, from the entry's mean to the Philippines to 250 km to 40 km
  (docs/FISH_PATH.md "Species order: the commonness index" has the formulas): a species with few observers anywhere is
  pulled toward its family's mean, a local count toward the regional share. M = 5 barely moves an entry with hundreds of
  local observers (Damselfish: 735, summed over its species) and lets the wider rings carry a thin one. **The log scale (2 decades)**: the iNat
  and the count scores are 1 + log10(value / the entry's top) / 2, floored at 0; ratios rather than ranks, so a
  two-species entry is not forced to 0 and 1 (Anthias: 24 and 25 local observers).
- **Why these choices, and what was not done**: no fit (there is no ground truth of abundance at Dauin to fit to); the
  weights follow the order of trust Pierre gave. The field signal is relative to the entry's best, so families the census
  under-records (cardinalfish: best 3 of 11 MPAs) still spread. Not used: the Liloan (Cebu) 2016 census (one place, one
  year, ~140 km), sources with family-level data only (west Leyte, Muallil et al. 2019, Russ's Apo series). Reef Life
  Survey's Siquijor 2025 counts are not published yet (checked on the AODN portal and GBIF, 2026-11-04): one more field
  record when they are (ROADMAP).
- **Checked by Pierre** on photo cards of every family (top 10 and bottom 10, the disagreements flagged), 2026-11-04:
  "very coherent; the criterion isn't crazy at all". His remarks: unicornfish probably lifted by what photographers
  shoot; the blue-and-yellow fusilier perhaps a bit more common than shown (maybe his own spotting bias); the red-tooth
  triggerfish rare at Dauin (very common at Puerto Galera), so its low local rank is right.
- **Effect now**: the order of the species lists in `fish.json`; species questions (level 2) are not built yet, so no
  player sees a change until they are. No learnsim run: no fish profile exists and nothing the simulation reads moved.

### Fish achievements, simulated (2026-11-06; the list approved by Pierre, Q203, 2026-11-07)

Rule L8: each achievement's timing checked with the real game before it is added. `tools/learnsim.js --subject fish --ach` (the real
fish game in a browser, the answer at which each achievement first enters the record), profiles beginner (choice "new") and lecture RA
("imr"), 2 seeds x 2,500 answers, plus 1 seed x 1,200 for Open Water: 20 families. Median answer:

| Achievement | beginner | lecture RA |
|---|---|---|
| First families (5 met) | 22 | 21 |
| The IMR line-up (every IMR course family met) | 157 | 156 |
| Open Water: 5 families | 230 | 107 |
| A quarter of the reef (25%) | 366 | 275 |
| Open Water: 20 families | 640 | 469 |
| Whole reef (every family met) | 739 | 458 |
| Half the reef (50%) | 970 | 731 |
| Advanced: 5 families | 1,108 | 1,128 |
| Advanced: 15 families | 1,836 | 1,618 |
| Divemaster: 5 families | 1,895 | 1,794 |
| First fish Instructor, Instructor: 10, IMR fish master | > 2,500 | > 2,500 |
| Genus names (5 scientific genera at Open Water) | not simulated (an opt-in the simulated player declines) | |

- The first comes within a few dozen answers, then a steady spread to about 1,900 answers; the mastery ones are far goals (no family
  passed its exam within 2,500 simulated answers: 10-13 families were in their exam by then).
- **Dropped: a fish Elo achievement.** The simulated fish level is already about 1.5-2.2 (Elo 1,300-1,440) when it first shows at 200
  answers (`ELO_MIN`), so "Fish Elo 1200" came at exactly the 200th answer for every run: an answer count, not a milestone (rule L8).

### Fish achievements, around the global score (2026-11-08, Q259-Q264; record version 3)

**Decided** (Pierre, 2026-11-08), on the proposal of the same day (33 learning achievements), once the global score was built
(Q255: "the fish achievements to be redesigned around the global score"):
- **Q259**: the score's ladder every 10 points; fpct25 retired.
- **Retired or no longer valid, removed from everyone**: "Pour les succès retirés, on le retire au jeu, à tout le monde ... on
  est en mode bêta, les gens le savent"; **Q260**, no silent keep: "Si les succès sont plus bons, on les retire et on les
  remplace". Then the principle: "il faut recalculer tous les progrès pour tous les joueurs à partir de leurs réponses, et
  ensuite recalculer leurs succès aussi".
- **Q261**: "Dauin's top 20" = circle-1 species only for now (another top with circle 3 later); and frequency-based ones ("je
  sais reconnaître les X poissons les plus fréquents", and for fun "les X poissons les moins fréquents à Dauin").
- **Q262**: a species is "named in Latin" once its scientific name's bar reaches Advanced (the My progress counter too).
- **Q263**: 33 is fine. **Q264**: the removal is silent ("le retrait il est fait en silence").
- Names: "n'hésite pas à réfléchir au nom des succès aussi, pour mettre des noms sympas, rigolos, pour varier": every fish
  achievement has a short diver-flavoured name, its description stays plain and exact. The list below approved (Pierre, 2026-11-08): "pour
  les succès, oui, je valide l'esprit, ça me va".

**The list** (`core.js` `FISH_ACH`; tier 1 bronze, 2 silver, 3 gold). Built, 24:

| Id | Name | Condition | Tier |
|---|---|---|---|
| fpct10, fpct20 | Giant stride, Bubble trail | the global fish score (`treeScore`'s %) at 10%, 20% | 1 |
| fpct30, fpct40 | Reef crest, Down the wall | 30%, 40% | 2 |
| fpct50 | Family reunion | 50%: what knowing every family for sure is worth (the families' anchor) | 3 |
| fpct60 | Blue water | 60% | 3 |
| fmet5 | Meet the neighbours | 5 families met | 1 |
| fmetall | Full logbook | every family in the game met | 2 |
| fq50a, fq50b | Certified, School's in | 5, 20 families at Open Water or above | 1, 2 |
| fq80a, fq80b | Night diver, Deep diver | 5, 15 families at Advanced or above | 1, 2 |
| fq95a | Dive guide | 5 families at Divemaster or above | 2 |
| flearn1, flearn10, flearn30 | First briefing, Course director, Fish whisperer | 1, 10, 30 families' mastery exams passed | 2, 3, 3 |
| fsci5 | Latin lessons | 5 scientific genera at Open Water or above | 2 |
| fgen20, fgen60 | Name dropper, Walking field guide | 20, 60 scientific genera at Advanced or above | 2, 3 |
| fmetcore | Roll call | every family of the IMR course met | 2 |
| fcoreadv | House reef | every family of the IMR course at Advanced or above | 2 |
| fc2 | Supporting cast | every circle-2 family (those that open right after the IMR course's) at Advanced or above | 2 |
| fc3adv | Muck diver | 20 families beyond the IMR course (circle 3) at Advanced or above | 3 |
| flearncore | Transect master | every family of the IMR course learned (its exam passed) | 3 |

flearn30 joins `ACH_LEARN` (taken back with a learned mark, as the other Instructor ones). The circles read `UNITS` fish
`circles` (`progress.js` `achSnap` `circ`), the genera at Advanced `achSnap` `setsAdv`; the % reads the global score from the
device's progress (`treeScore` over `UNITS` tree), whatever the sheet's version (the achievements need nothing from it).

**Waiting, 9** (documented, not built: no "dormant" achievement exists in the app, and one shown but out of reach would only
confuse; names proposed for when they are built):
- fpct70 "Twilight zone" and fpct100 "Fish god" (every name of every species): today's score tops out at 67% (families and
  every genus), the species level brings the rest.
- At the species level: fsp1 "First name terms", fsp10 "Name tags", fsp50 "Fish ID nerd" (species named by a common name at
  Advanced); fspsci1 "Binomial" (a first species named in Latin, Q262); fboth25 "Bilingual" (25 species with both names at
  Advanced); fdauin20 "Local legend" ("Dauin's top 20": the 20 circle-1 species most seen near Dauin, Q261).
- Fish basics: fbasics, with the module.
- Also for the species level (Q261, counted beyond the 33): "Usual suspects", the X fish most often seen (circle 1, then
  every circle), and "Rare finds", the X least often seen at Dauin, by the rank of observers near Dauin (`present.dauinU`,
  the score's own weights); X chosen with the species level.
- The contributions are unchanged.

**The recount** (`progress.js` `ACH_V` 3, `achMigrate`): every device, at its first start-up on this version, tests every
achievement of every subject again on that subject's current progress (`inSubject`, `core.js` `achRecount`): those met keep
their date (the earliest held), the others go, fpct25 with them since no list holds it; every fish % achievement is thus
re-evaluated on the global score (an fpct50 earned on the families' mean leaves a player under 50%), and the new ones the
progress already meets come in. Silent (Q264), no card, no toast. The fish data is loaded only when the fish are needed
(`app.js` `fishLoad`): until then the fish achievements wait on the device (`reefid-ach-old`, outside the synced record),
then are recounted the same way (`achPending`, from `fishLoad` and before each check). A device not updated yet: its record
keeps version 2, and `core.js` `mergeAch` takes no achievement from a record of another version (only its feats), so it never
brings back what the recount removed, and an updated device's record never reaches it either (the same rule on its side).
The progress itself is not recounted here: the corals' is replayed from the answer log by the sheet (`Code.gs` `replay_`,
rule D5); the fish's is not replayed (`SUBJECTS` fish `replay: false`), its bars rebuilt once on the device from their counts
(`core.js` `domFromCounts`, Q200). Checked by `tests/core.test.js` (each condition at its threshold, fpct25 retired,
`achRecount`) and `tests/adopt.test.js` (the recount on a corals + fish record of version 2, the fish waiting for their data,
a merge with a stale device).

**Timing** (rule L8; `tools/learnsim.js --subject fish --ach`, the real fish game in a browser; `--beyond yes` answers circle
3's offer with yes): profiles beginner (choice "new") and lecture RA ("imr"), 2 seeds x 2,500 answers each, one process per run; the answer at
which each achievement first enters the record (seed 1 / seed 2). The simulated player accepts the scientific genera's
offer (at answer 31-199), and from then on about 60% of its questions are genera: the families' levels come later than
in the run of 2026-11-06 (fq80a about 2,000 against 1,100; fq80b and fq95a past 2,500 against 1,600-1,900).

| Achievement | beginner | lecture RA |
|---|---|---|
| fpct10 Giant stride | 82 / 21 | 10 / 11 |
| fmet5 Meet the neighbours | 20 / 22 | 21 / 21 |
| fpct20 Bubble trail | 228 / 122 | 34 / 91 |
| fq50a Certified | 258 / 310 | 91 / 157 |
| fmetcore Roll call | 155 / 171 | 250 / 293 |
| fpct30 Reef crest | 598 / 513 | 284 / 538 |
| fq50b School's in | 761 / 1,279 | 725 / 1,084 |
| fsci5 Latin lessons | 793 / 943 | 1,308 / 977 |
| fpct40 Down the wall | 1,437 / 1,349 | 1,235 / 1,255 |
| fq80a Night diver | 1,978 / 2,264 | 2,075 / 2,025 |
| fpct50 Family reunion | > 2,500 / > 2,500 | 2,421 / > 2,500 |
| fq80b, fq95a, flearn1-30, fpct60, fgen20, fgen60, fcoreadv, fc2, fc3adv, fmetall, flearncore | > 2,500 | > 2,500 |

Longer runs to time the far ones did not finish then: the page of the tool crashed ("Target crashed") in every run of
4,500 and 8,000 answers. Fixed on 2026-11-08 ("Learning-outcome simulation", "Long runs"); the same command over 8,000
answers (2 seeds each, `main` of that day, which the table above predates; the answer at which each first enters the
record, seed 1 / seed 2):

| Achievement | beginner | lecture RA |
|---|---|---|
| fpct40 Down the wall | 1,092 / 1,011 | 1,066 / 947 |
| fq80a Night diver | 1,230 / 1,083 | 978 / 1,111 |
| fsci5 Latin lessons | 1,589 / 1,448 | 713 / 941 |
| fq80b | 1,658 / 1,811 | 1,962 / 2,006 |
| fq95a | 2,699 / 1,981 | 1,531 / 1,945 |
| fpct50 Family reunion | 2,868 / 2,460 | 2,503 / 2,469 |
| fcoreadv | 3,853 / 4,275 | 6,249 / 6,943 |
| fgen20 Name dropper | 6,225 / 6,274 | 5,105 / 5,220 |
| fpct60 Blue water | 7,420 / 7,541 | 7,453 / 7,032 |
| flearn1-30, flearncore, fgen60, fmetall, fc2, fc3adv | > 8,000 | > 8,000 |

No run passed a fish mastery exam (flearn1) in 8,000 answers. Over the 8,000 answers about half the questions are
scientific genera once their offer is accepted (beginner 54%, from answer about 690; lecture RA 50%, from about 55),
highest at answers 1,000-3,000 for the beginner (57-71%), then falling to 41-46% by answer 8,000.

- The first comes within a dozen answers for a lecture RA: fpct10 rides on the √ display (one or two of the most common
  families at Open Water read about 10%), together with fmet5 at about 20: the first within a few dozen answers, as rule
  L8 asks, then a steady spread (a new one every 100-700 answers to about 2,000).
- `tools/learnsim.js` taught nothing on the units of an opt-in set before this change (the scientific genera were not in the
  learner's knowledge, so their questions stayed at chance, the genera stayed shaky and held the families' openings: in a
  first run the player was stuck at 27 families met from answer 200 on). Fixed here: they are learned like any unit from
  the profile's low start.

### Fish: the global score, simulated (2026-11-04)

The global fish score's formula (Pierre, 2026-11-04; docs/FISH_PATH.md "My progress (fish)", unchanged here): per species
C = the mean mastery of its listed common names, S = max(species mastery, ½ × genus mastery), credit = a·C + b·S +
(1 − a − b)·C·S with b = 0.80 and a = 11/15 ≈ 0.733 (so 1 − a − b ≈ −0.533: the second name of a species adds less than the
first); global = 25% × the entries' mean mastery + 75% × the mean credit over circle 1. The design asked for a simulation
before it ships (rule L11): the anchors, the entries' 25% share, the genus's half credit, no long plateau. `tools/fishscore.js` ran it
(about 2 minutes; retired on 2026-11-08 for the rated world, `tools/learnsim.js --world rated`, "Validating a learning
change"). The species level is not built,
so `tools/learnsim.js`, which drives the real app, cannot play it: the tool has a deliberately simple model of the path
instead (the tree of FISH_PATH "Levels": species names and scientific genera of an entry from Advanced, a species'
scientific name from its genus's Advanced, and for a player learning both names from its common names half-way; one unit
opened at a time while fewer than 3 are shaky; weak units drawn first; a learner with a true chance per unit that each
answer's feedback raises, scientific names learned more slowly than common ones), and the app's own progress engine on
each unit (`core.js` `pgStep`, `scoreOf`, the exam). Its learning rates are assumptions (no fish species answer exists),
so the answer counts below are a scale, not a forecast; what the formula does with them (shares, ratios, where the
curve flattens) is the result. World: the 27 circle-1 entries, 94 scientific genera, 340 species of circle 1 (an IMR entry's Dauin species of circle 3 never count), one common name each
(the curated lists of 1 to 3 names are not chosen yet; `--names` reads a proposal file).

**Fixed states** (every unit of a set at mastery 1, the rest 0; exact):

| What the player knows | Score |
| --- | --- |
| Entries only | 25.0% |
| Entries + every genus | 55.0% |
| Every common name | 80.0% |
| Every scientific name | 85.0% |
| Every common name + every genus | 90.0% |
| Both names of every species | 100.0% |
| Every unit at the exam's entry (bar 95%), no exam passed | 96.9% |
| Entries + common names of the IMR 24 most sighted | 28.9% |
| Entries + both names of the IMR 24 most sighted | 30.3% |
| Entries + common names of the most common half of each entry | 53.3% |
| Entries + both names of the most common half | 76.5% |
| Entries + every genus + scientific names of the most common half | 70.4% |
| Every common name + scientific names of the most common half | 90.3% |

The anchors hold exactly. Because the interaction term is negative, partial mastery of both names scores more than its
mean (every unit at 95% on the bar: 96.9%).

**Simulated players** (5 seeds, 120,000 answers; the answer at which the score first reaches each level, mean over the seeds,
the spread under 2% of it):

| Profile | 25% | 50% | 75% | 80% | 85% | 95% |
| --- | --- | --- | --- | --- | --- | --- |
| Common names only | 910 | 9,560 | 25,120 | 33,840 (ceiling) | | |
| Scientific names only | 780 | 11,950 | 33,410 | 38,040 | 51,790 (ceiling) | |
| Both names, side by side (an IMR RA) | 720 | 18,670 | 54,310 | 64,400 | 74,020 | 97,320 |
| Both, scientific names at half the rate | 760 | 25,110 | 73,310 | 87,130 | 100,750 | not by 120,000 |
| Common names, then scientific names | 910 | 9,560 | 25,120 | 28,960 | 44,210 | 85,750 |
| Scientific names, then common names | 780 | 11,950 | 33,410 | 38,040 | 45,740 | 87,660 |
| Scientific names only, without the genus's half credit | 1,030 | 13,920 | 34,270 | 39,700 | 51,790 (ceiling) | |

What it shows:

- **The entries' 25% share**: every entry reaches Advanced around answer 750-930, and the score is then 25-26%, 93-96% of
  it from the entries. So the first ~1,000 answers (about 3% of a common-names path, under 1% of a both-names path) earn a
  quarter of the score: the fast start Pierre asked for ("fast at the start"), with no step: the score rises about 4 points
  per 100 answers while the entries are learned, then about 1 point per 500-700 answers.
- **The genus's half credit**: with it, the scientific-names player reaches 25% at 780 answers instead of 1,030, 50% at
  11,950 instead of 13,920, and the longest point (below) falls from 2,320 answers to 1,760: without it, the answers
  spent on the genera earn nothing until their species come, a flat stretch at 49% in every seed. The ceiling is the same
  (85% at the same answer). The half credit does what it was meant to do.
- **Plateaus** (the answers each point of the score takes, from 26% to 95% of the profile's ceiling; median / longest):
  common names only 500 / 850; scientific only 650 / 1,760; both side by side 1,260 / 3,500; both, slow scientific 1,670 /
  4,610 (a run that ends below 95% of its ceiling counts its last, unfinished point; the point that reaches the cutoff counts too). No long plateau for a player on one branch, nor for one learning both names side by side (the longest point
  takes 2-3 times the median, at 85-94%, where the last species of the largest entries finish).
- **One branch, then the other: the pace drops by 7 to 12 times** (common then scientific: median 580, longest 7,010 answers,
  at 90-93%; scientific then common: 760 / 5,120 at 92-94%). Once one kind of names is complete (80% or 85%), the other
  kind is worth 20 or 15 points for as many units as the first kind's 55 or 60: each species' scientific name adds
  0.267 × 75 / 340 ≈ 0.06 points to a player who knows its common names (0.18 to one who does not). This follows from the
  anchors (80 / 85 / 100%), not from a or b: any formula with these three points gives the second kind of names
  15-20 points. With the half credit, the second half of a species' scientific progress is also hidden until its bar
  passes its genus's half (S = max(...)): the longest points come right after the genera (90%).
- **At the same effort, a player learning both names scores lower for a long time**: at 30,000 answers, common names only
  80%, scientific only 72%, both side by side 62%; the both-names player catches up only near the end (96% at 100,000,
  100% by 120,000). The fish leaderboard ranks by this score (FISH_PATH), so mid-path an RA learning both names sits below a diver
  learning common names only with the same answers.
- The three bars FISH_PATH proposes under the headline % (Entries, Common names, Scientific names) are the means the tool
  prints (entries, C, S); on the side-by-side path both rise together, so the bars show progress where the headline moves
  slowly.

Not changed: the formula, a and b, the 25% share (nothing here argues against them). Questions it left for Pierre were put to
him on the morning of 2026-11-05 (open questions now live in docs/STATUS.md): whether the slow second branch and the leaderboard order at equal effort
are what he wants. Rerun when a constant of the formula changes, when the curated common names are chosen (`--names`),
and with the real app (`tools/learnsim.js` fish profiles) once the species level exists.

### Fish: the global score, built (2026-11-08, Q242; sheet v101)

**Decided** (Pierre, 2026-11-08). It started with "il faut qu'on attaque la question du score global ... Le score global, il
faut commencer à l'intégrer. Donc à le calculer", because the scientific genera counted nowhere in the fish %. Re-simulated on
today's bar and world (below), he chose **Q242: the formula of 2026-11-04 with each species weighted by how common it is near
Dauin (A), and the % shown as the square root of the raw score (B); not the circle weights (C)**, to honour "le score avance
vite au début et lentement après". Then: every score from one computation, decomposed ("il y a un score global ... et après
il faut qu'il y ait des scores par famille, par genre, par espèce ... par espèce à la fois sur le nom scientifique et sur le
nom commun ... qu'on arrive à découper les scores sur des composantes"; "il nous faut un progrès par composante ... essentiel
de savoir à combien de pourcentage il est d'apprentissage pour tel genre ou telle espèce ou telle famille"); thresholds may
read a component ("c'est pas déconnant de calculer des seuils sur des scores qui touchent que les familles ou que les genres
ou que les espèces"); the path follows the new scores ("il faut qu'on trouve une manière de caler le parcours sur nos
nouvelles manières de calculer les progrès et les scores"); a species with no common name stays out of that branch (Q247:
"elles ne participeront pas à la branche nom commun").

**The rule** (`core.js` `treeScore`, `rankWeights`, `fishScoreTree`; `SUBJECTS` fish `score`; docs/FISH_PATH.md "My
progress (fish)"):

- Every unit keeps its own bar (`scoreOf`: the domain-score bar, 1 once its exam is passed), which drives its levels and
  exam as before. The app shows the score, and sends its tree to the sheet, from a sheet reply with v ≥ `SCORE_SHEET`
  (101; rule D4: the leaderboard and My progress on one scale), the families' mean before. Nothing about a unit changes; no rules version (rule D5: no unit's record changes, as for Q175).
- Species weight w = 1/√(rank by observers near Dauin, `present.dauinU`: distinct Research Grade observers within 40 km,
  not observations, so a few keen photographers of one species do not weigh; Codex review #730), ties sharing their mean rank; a family weighs the
  sum of its species' weights, a genus too.
- Per species: C = the mean of its common names' bars, S = max(its scientific name's bar, ½ × its genus's bar); credit =
  a·C + b·S + (1 − a − b)·C·S, a = 11/15, b = 0.8; a species with no common name: credit = S, out of the Common names
  component (Q247).
- raw = 0.25 × Entries + 0.75 × the weighted mean credit; shown = 100 √raw.
- Components, from the same call: Entries, Genera, Common names, Scientific names (own, and S with the genus credit),
  species credit, each a weighted mean from 0 to 1; the same per circle; every unit's bar.
- Today the species units do not exist: C = 0 and a species' own scientific bar is 0, so the species terms come from the
  genus credit alone, for the genera a player has (circle 1 only: families and every genus of the game reach 67%).

**Why the 62% at 30,000 answers was not a flaw of `tools/fishscore.js`** (that tool, since retired, kept the formula of 2026-11-04,
unweighted and linear, on circle 1 and the old moving-average bar). The size of the job (fish.json after #727): 67 families,
130 genus units, 664 species, 951 common names, about 1,800 units. Under today's bar a unit already known perfectly needs
about 24 answers to reach Advanced and 43 to pass its exam (`core.js` `domStep` with the app's adaptive photos, 200 runs), a
unit being learned 46-95 and 69-124. Before #727 (1,238 units), a player who already knew every fish scored about 69-72%
(old formula) at 30,000 answers.

**Re-simulation of today** (scratch scripts, not committed; fish.json after #727). The world is fully rated and synthetic, on
the Elo scale:
- photo difficulty Normal around its taxon, sd 0.46 (the coral photo spread of the Analyses tab);
- taxa around their parent: family sd 0.37, +0.5 for the declared look-alike groups; genus and species sd 0.3, +0.3 with
  siblings;
- a player offset, sd 0.5, 6 players;
- the app's mechanics mimicked from `model.js` (`aimOff`, the early lean, the Gaussian photo choice, `TYPED`, `drawW`,
  `shaky` with `OPEN.K` 8, at most 3 openings per 15 answers) and the real `core.js` `domStep`;
- species as FISH_PATH designs them; species weights by observers near Dauin; the learning curves assumed.

Checked against the real app (`tools/learnsim.js --subject fish`, 1,000 answers, family phase, before #727): the fish %
41% (lecture RA) and 37% (beginner), against 40% and 28% here. Right rate: 75-81% there, 77-86% here, 78-87% in the real
log. Heavier photo tails (15% of photos 1.5 harder, or a t distribution with 3 degrees of freedom) move the score by −2 to
+1 points; photos shaped by the judged ease change it by about 2 points.

IMR RA (both names, the IMR families taught, the IMR genera at Open Water). Columns:
- Fam OW, Fam Adv: families at Open Water and at Advanced, of 67;
- Genera: genera at Advanced, of 130;
- Sp. common, Sp. sci: species at Advanced by common and by scientific name, of 664;
- Current: the % under the formula of 2026-11-04;
- A (commonness weights), B (√), C (the IMR circle × 3), and A+B (decided).

| Answers | Fam OW | Fam Adv | Genera | Sp. common | Sp. sci | Current | A | B | C | A+B |
|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 2 | 0 | 0 | 0 | 0 | 1.6% | 3.7% | 13% | 2.6% | 19% |
| 300 | 9 | 0 | 0 | 0 | 0 | 4.2% | 7.3% | 21% | 6.7% | 27% |
| 1,000 | 22 | 5 | 0 | 0 | 0 | 8.7% | 12% | 30% | 12% | 35% |
| 3,000 | 57 | 19 | 0 | 1 | 0 | 19% | 19% | 43% | 20% | 44% |
| 10,000 | 67 | 50 | 11 | 2 | 0 | 31% | 31% | 56% | 33% | 55% |
| 30,000 | 67 | 63 | 70 | 9 | 0 | 42% | 42% | 65% | 47% | 65% |
| 100,000 | 67 | 64 | 99 | 105 | 49 | 56% | 55% | 75% | 63% | 74% |

Casual diver (common names only):

| Answers | Fam OW | Fam Adv | Sp. common | Current | A | B | C | A+B |
|---|---|---|---|---|---|---|---|---|
| 100 | 1 | 0 | 0 | 0.6% | 1.5% | 7.9% | 1.0% | 12% |
| 300 | 5 | 0 | 0 | 1.9% | 4.2% | 14% | 3.1% | 21% |
| 1,000 | 15 | 4 | 0 | 5.9% | 9.4% | 24% | 9.1% | 31% |
| 3,000 | 47 | 13 | 1 | 16% | 17% | 40% | 17% | 41% |
| 10,000 | 67 | 51 | 8 | 25% | 24% | 50% | 25% | 49% |
| 30,000 | 67 | 62 | 34 | 31% | 31% | 56% | 33% | 56% |
| 100,000 | 67 | 64 | 172 | 48% | 47% | 69% | 54% | 68% |

The fish % shown until now (the families' mean) at 100 / 300 / 1,000 / 3,000 / 10,000 / 30,000 answers:
- IMR RA: 6 / 17 / 34 / 69 / 90 / 97%;
- casual diver: 3 / 8 / 23 / 61 / 90 / 97%.

**The curves compared**:
- The formula of 2026-11-04 rises about 1 point per 100 answers at the start, and 0.3-0.6 per 1,000 past 10,000.
- A adds 1-4 points early (the common families open first and weigh more) and nothing late.
- C adds 1-7 points.
- B and A+B read fast at the start (19-27% after 100-300 answers, 35% after 1,000 for the RA) and slower and slower after:
  the shape asked for, at the cost of the 80% / 85% anchors (now 89% / 92%).

**The path on the new scores.** This covers every rule that reads a global fish %. Unchanged:
- the per-unit levels: a family's own Open Water or Advanced, which opens its genera and its species;
- the counts: every circle-1 family asked, for circle 2.

Answer at which each rule fires, median over the 6 simulated players [range], before and after:

| Rule | Reads, before | Reads, after | IMR RA, before / after | Casual, before / after |
|---|---|---|---|---|
| Circle 3's offer (`app.js` `FISH_C3`, `fishC3`, `UNITS` fish `opens`) | mean of the circle-1 families ≥ 50% | circle-1 Entries component ≥ 55% | 600 [400-800] / 600 [400-850] | 1,000 [800-1,100] / 1,100 [1,000-1,250] |
| fpct25 "A quarter of the reef" (`core.js` `FISH_ACH`; retired since, Q259) | the families' mean ≥ 25% | the global % ≥ 25% | 700 / 300 | 1,150 / 550 |
| fpct50 "Half the reef" | the families' mean ≥ 50% | the global % ≥ 50% (every family known, or genera and species on top) | 1,800 / 5,900 | 2,500 / 12,300 |
| The fish leaderboard (Code.gs `board_`, v101) | the families' mean | the global % | | |
| The header pill, My progress's ring, the update card | the families' mean | the global % | | |

**Other thresholds weighed for circle 3:**
- The global % ≥ 33%, where the families' 50% falls. It fires at about 750 / 1,350 answers (between the 32% and 34% runs),
  and genera and later species would bring circle 3 sooner.
- 15 circle-1 families at Open Water: about 550 / 1,050 answers (between the 14 and 16 runs).

The circle-1 Entries component keeps the order "the IMR course's families first", whatever else the player learns.

**Pierre's answers** (2026-11-08, Q253-Q258): no card, the switch is silent and the ? text explains it (Q253); circle 3 at
55% of the circle-1 Entries component (Q254); fpct25 and fpct50 kept as built for now, the fish achievements to be
redesigned around the global score in a proposal of their own (Q255; since done: "Fish achievements, around the global
score"); the bar labels (Q256); the weighted bars with the
genus credit in Scientific names (Q257), provided genera alone never pass a set level: S = max(the species' own bar, ½ ×
its genus's), so genera alone keep Scientific names at 50% at most and the global % at the "families and every genus"
anchor (74%) at most (`tests/treescore.test.js`); credit = S for a species with no common name (Q258).

**What a player sees change** (the families' bars as they are):

| The player's families | Fish % until now | Global score |
|---|---|---|
| Every circle-1 family at 50% | 21% | 29% |
| Every circle-1 family at 80% | 33% | 37% |
| Every circle-1 family at 80%, their genera at 50% | 33% | 49% |
| Every family of every circle at 80% | 80% | 45% |
| Every family learned | 100% | 50% |
| Every family and every genus learned | 100% | 67% |

### Fish: the progress replayed from the answer log (2026-11-08, Q298, Q310; fish rules version 1, sheet v112)

Pierre, 2026-11-08: "recalculate every player's progress from their answers, then their achievements too". Until then no
replay reached a fish player: the sheet replayed the corals only, so a fish bar lived on the device (rebuilt once from its
counts under the domain-score bar, Q200). Fish answers are logged only since sheet v60 (2026-11-06), so a replay of the
log alone would lose what was played before. Q298: measure the gap in the admin's way first; Q310: if it is small (the
recomputed bar within ±5 points of the saved one for about 90% of fish players, nobody more than 10 below), build it with
today's bar as a floor; if large, build nothing.

**Measured** on the real log (rule L12), read-only, on an export of the sheet: the 1,292 fish answers logged from
2026-11-06 13:07 to 2026-11-07 21:37 (every one with its scoring record) and the saved copies of the 8 fish players (all
signed in). The admin's replay (`admin.js` `progOf`: `replayProgress` over each player's fish rows with the app's fish
units, then `replayedOf` with the saved copy) against the saved copy as the player's app shows it at its next open (old
unit ids renamed, `renameUnits`; records still under the moving average rebuilt from their counts, `domRecalcAll`). The
per-player table stays outside the repository; the counts and distributions (the player is the unit, rule L11):

| Measure | Within ±5 points | Changes (points, sorted) | Worst |
|---|---|---|---|
| Headline (`treeScore`, the fish global score) | 8 of 8 | −3, −1, −1, −1, −1, 0, 0, 0 | −3 |
| Families' mean (`pctOf` over the slate) | 8 of 8 | −2, 0, 0, 0, 0, 0, 0, 0 | −2 |
| Learned units | | 0 saved, 0 replayed for every player | |

Small by Q310's measure. Per unit the replay moves more: of 203 unit bars, 122 unchanged, 183 within ±5, 10 more than 10
points down (the lowest −21), the highest +3. Why the units differ while every row carries its scoring record was not
checked; a guess: the device bars rebuilt from their counts on 2026-11-06 (Q200, an approximation the replay replaces).
One player has 17 answers from before sheet v60, not in the log: `replayedOf` keeps a unit whose saved record has more
answers than the log.

**Built.** The sheet replays the fish progress as the corals' (`Code.gs` `replays_`: the fish rows, the fish units from
`fish.json`, `core.js` `fishReplayGen`; none of `stats_`'s photo numbers, which are the corals'), under the fish rules
versions of their own (`core.js` `FISH_RVS`, `rvOf`; the integrator, 2026-11-08: a fish replay must never replay the
corals again, so no coral player gets a card for it), asked by the app with the fish rules version it applied
(`reefid-sync-fish-rv`), adopted by `sync.js` `replayAdoptS` from sheet v112 (`core.js` `REPLAYS_SHEET`, rule D4).
**The floor** (until fish rules version 2: removed on 2026-11-09, Q330, the log the only reference, "The log, the only reference for progress" below; `core.js` `replayFloor`), applied by the sheet to the replay itself (`Code.gs` `replay_`), so every
device of the account adopts the same record and keeps it as their shared merge baseline (Codex review #779: floored on
each device, two devices disagreed and a recovered refused save counted its answers twice): against the account's saved
copy, its units that came from no replay yet, a unit whose replayed bar reads below its saved bar keeps the replay's
record (its answers the log's) with its domain score lifted to the saved bar, allowing for the false alarms the replay
counts on it (a unit the log has nothing on keeps its saved record). So no unit's bar, and so no %, goes down at the
first replay; a right answer never lowers the lifted score (`domStep`), a miss moves it as any bar. The reference is
kept with the record, so a later replay of the same rules version (more answers, a version applied again) floors
against the same bars; under a later fish rules version there is none (once, the integrator, 2026-11-08). Checked on
the same data with the floor applied to the device's records: no unit and no headline down; one headline 1 point up,
one families' mean 1 point up, the rest equal. Its card: fish rules version 1 takes the standard card (`RV_CARD`: only a move of 5 points or
more; none on this data), told under the subject's id (`progress.js` `rvId`, `fish:1`), never as a coral version.

What was checked (rule L11): the engine is unchanged (no learning rule moves), so no `tools/learnsim.js` run; the change is
where a fish bar is computed, checked on the real log as above and by `tests/fishreplay.test.js` (the replay's units are
the app's; the floor on fixed and random records, no unit or headline down) and `tests/fishadopt.test.js` (the app
adopts it from `REPLAYS_SHEET` only, with the floor, its own rules version, no coral replay asked for, the reset cutoff
and the refused-save flag). Not adopted yet by a device that never signed in (the sheet can serve it, `sreset`,
`sstart`; ROADMAP).

### The log, the only reference for progress (2026-11-09, Q322, Q330; rules version 10, fish rules version 2, sheet v127)

Pierre, 2026-11-09 (Q322, Q330; rule D9): the answer log is the reference for progress, trust it rather than the device.
Found with the lost-reply double count (#824): a device could hold some answers twice, and the replay kept the device's
record of a unit whenever it held more answers than the log (`core.js` `replayedOf`, written to keep the answers played
before the log), so a double count, once in the progress, stayed for good. Now the replay's record of each unit the log
has answers on wins over the device's also when the device holds more; a unit the log has no answer on loses the answers
the device counts on it; the level takes the replay's ability (none when the log has no answer of the player at all), its answer count keeping
the larger of the two as before: the app keeps its checkpoints (the units met, the exams, the comeback, the prompts) at
absolute answer counts, so a count going down would strand them; the log's count there is a follow-up
(branch `claude/level-count-from-log` and its design note) (`replayedOf`, `replayBase`; so the leaderboard too, `Code.gs`
`board_`, rule D8). No exception for answers played before a subject's log began (Q330: the log is the only reference),
and no floor: the fish replay is no longer floored against the saved bars of its first replay (`replayFloor`, `Code.gs`
`floorRef_` removed), so a fish bar may go down. No card for the recalculation (rule D5): rules version 10 and fish rules
version 2 carry none, and a jump to them shows none. An app never adopts a replay of a rules version newer than its own
(`sync.js` `replayAdoptS`, `rvOf`): four accounts' devices had adopted rules version 9 on an app from before it, without
the domain-score bar, and marked it applied for good.

**Measured** on the real log (rule L12), read-only, 2026-11-09: the sheet's tabs (Answers, Progress data, RAs, Replayed
Fish) loaded into the test sheet (`tests/gas.js`), each account replayed by main's script and by this one (coral replays
made again in both), adopted over its saved copy as the app does (`replayAdopted`), the % over the slate (`pctOf`).
Counts only; accounts by their row in the Progress data tab (P1 = row 2):

| Account | Subject | Answers saved / logged / after | % now (saved copy) | % main's replay | % after |
|---|---|---|---|---|---|
| P1 | coral | 23 / 23 / 23 | 6 | 2 | 2 |
| P2 | coral | 81 / 81 / 81 | 12 | 12 | 12 |
| P2 | fish | 25 / 25 / 25 | 1 | 1 | 1 |
| P3 | coral | 378 / 378 / 378 | 49 | 22 | 22 |
| P3 | fish | 204 / 204 / 204 | 23 | 23 | 21 |
| P4 | coral | 112 / 112 / 112 | 10 | 9 | 9 |
| P5 | coral | 691 / 691 / 691 | 26 | 26 | 26 |
| P6 | coral | 424 / 424 / 424 | 26 | 27 | 27 |
| P6 | fish | 650 / 633 / 633 | 52 | 52 | 51 |
| P7 | coral | 447 / 447 / 447 | 19 | 20 | 20 |
| P7 | fish | 233 / 233 / 233 | 6 | 6 | 6 |
| P8 | coral | 170 / 85 / 85 | 14 | 14 | 10 |
| P8 | fish | 63 / 63 / 63 | 0 | 0 | 0 |
| P9 | coral | 234 / 197 / 197 | 12 | 12 | 12 |
| P9 | fish | 459 / 423 / 423 | 17 | 17 | 17 |
| P11 | coral | 50 / 50 / 50 | 10 | 4 | 4 |
| P12 | coral | 284 / 284 / 284 | 26 | 44 | 44 |
| P12 | fish | 103 / 103 / 103 | 9 | 9 | 9 |
| P13 | coral | 22 / 22 / 22 | 4 | 6 | 6 |
| P13 | fish | 97 / 97 / 97 | 12 | 13 | 10 |
| P14 | coral | 68 / 68 / 68 | 12 | 12 | 12 |
| P14 | fish | 27 / 27 / 27 | 4 | 4 | 4 |

The rule itself (main's replay against this one, the same rows): the counts come down to the log for three accounts, the
two that held answers counted twice (P8 coral 170 to 85, every unit exactly twice, its % 14 to 10; P9 coral 234 to 197
and fish 459 to 423, its % unchanged) and P6's fish (650 to 633: its 17 answers from before the fish log, 52% to 51%);
the floor gone takes P3's fish % 23 to 21 and P13's 13 to 10; every other % equal. The rest of the "now" to "after" column
is the new rules version itself, which every device adopts: P1 (no rules version applied) and P13 (corals at 8) adopt
rules version 9 at their next sync on main too; P3, P11 and P12 hold rules version 9 without its domain-score bar
(adopted by an app from before it, above; their counts equal the log on every unit), so their device shows a % from the
former records until a new version makes them adopt again: 49 to 22, 10 to 4, 26 to 44. No card for any of them.

**Simulated** (rule L11, level 1, declared before running: the app world, corals and fish, the four profiles × 5 seeds
× 300 questions, primary `prog@300:down`, no cost expected: `tools/learnsim.js` plays one device and adopts no replay,
so the rule cannot act there): `tools/learncmp.js` main (a285c1b) against the first version of this change (the replay's
counts winning, the floor kept), every pair equal: the primary no clear difference (corals 20 pairs, fish 25, T 0, p 1),
every guardrail measured held at a difference of 0; the floor and the card, which this version also takes away, act
only at a replay's adoption too, which learnsim does not run (the reason the runs were not repeated).

### Response time (measured 2026-11-03; in the ability since 2026-11-04, rules version 4)

Pierre, 2026-11-03: "the time I take to answer goes with the difficulty, either the photo is hard or the genus is hard
for me. If I take long, it was harder, even when I got it right. If I enlarge, it is usually the photo (far colony
shots). Response time is a real indicator; analyse it as a weak signal." Every answer logs its seconds (from the
question's photos in view to the answer, any time spent on an enlarged photo included) and whether a photo was enlarged
first since sheet v23 (2026-11-02). Measured in sections 1-4 (2026-11-03); since 2026-11-04 the seconds weigh a right
answer's ability steps (section 5, Pierre's decision); the enlarged mark is still logged only.

**Data** (the sheet's Answers tab read 2026-11-03, read-only, 1,474 rows; players anonymised P1-P5 by number of timed
answers): 1,386 answers of 9 players with 20 or more scored by `tools/abilityeval.js`; 662 of them timed, all from 5
players (229, 133, 131, 85, 84 timed answers; median 4.5-11.5 s by player). z = log(seconds) minus the player's median
log(seconds); typed questions left out (slower by design). The expectation compared is the replay of the app as it is
(`abilityeval` rule `e+X+M`: global level + genus, the known mix-ups term), and the `Expected` the app logged. 95%
intervals by bootstrap, over answers and over players (5 players: the second is rough).

**1. The answer's own time says how it went, beyond the expectation** (654 timed, not typed):

| Speed (z) | answers | right | expected (replay / logged) | right − replay expected [answers] [players] |
| --- | --- | --- | --- | --- |
| fast (z < −0.3) | 238 | 0.92 | 0.82 / 0.79 | +0.103 [+0.066, +0.135] [+0.065, +0.138] |
| mid | 185 | 0.84 | 0.80 / 0.76 | +0.040 [−0.014, +0.088] [−0.027, +0.089] |
| slow (z > 0.3) | 231 | 0.71 | 0.78 / 0.75 | −0.076 [−0.136, −0.021] [−0.166, +0.010] |
| slow, no photo enlarged | 191 | 0.69 | 0.78 / 0.75 | −0.091 [−0.154, −0.025] [−0.186, +0.004] |

- As a logistic term on top of the replay's expectation: −0.88 per unit of log time [−1.17, −0.59] (players
  [−1.29, −0.45]): an answer 2.7 times slower than the player's usual has about 0.4 times the odds of being right. The
  same with the photo's logged difficulty and the position in the session as controls (−0.92 [−1.24, −0.66]), with the
  median from the player's earlier answers only, as an app would have it (−0.79 [−1.12, −0.48]), on 2-choice
  (−0.75 [−1.27, −0.32]) and on 3-4-choice questions (−0.92 [−1.35, −0.52]).
- **The same sign for all five players**: P1 −1.42 [−2.19, −0.87], P2 −0.40 [−1.11, +0.55], P3 −0.42 [−1.11, +0.23],
  P4 −1.52 [−2.78, −0.69], P5 −1.02 [−2.24, −0.04]; clear for three, within the noise for two.
- Time mostly follows the outcome: z = 0.55 − 0.41 × right − 0.08 × logit(expected), residual sd 0.72. The photo's
  expected difficulty explains little of it (correlation with logit `Expected` −0.17).
- **No fatigue**: the position in the session (a session ends after 30 minutes without an answer) does not move the
  success beyond the expectation (−0.01 per log position [−0.25, +0.18]); players get faster as a session goes on
  (median z +0.20 over its first 20 answers, −0.39 after 100).

**2. What it says about the next answer**, the one an Elo step has to predict:

| Previous answer on the same genus | answers | right | expected | right − expected [answers] [players] |
| --- | --- | --- | --- | --- |
| right, fast | 174 | 0.91 | 0.83 | +0.073 [+0.029, +0.117] [+0.030, +0.104] |
| right, mid | 118 | 0.86 | 0.81 | +0.051 [−0.016, +0.109] [+0.012, +0.116] |
| right, slow | 121 | 0.79 | 0.81 | −0.023 [−0.100, +0.052] [−0.097, +0.041] |
| missed (fast / mid / slow) | 15 / 18 / 50 | 0.80 / 0.83 / 0.78 | 0.73 / 0.75 / 0.75 | too few to read |

- A fast right answer is stronger evidence than the Elo's step gives it, a slow right one weaker: the logistic term of
  the previous right answer's z on the next one on its genus is −0.39 [−0.80, −0.00] (players [−0.70, +0.11]), less
  than half its weight on the answer itself, and not yet clear across players.
- **The next answer overall** (any genus, same session): nothing (+0.10 [−0.17, +0.40]): speed tells about the genus,
  not about a passing state of the player.

**3. Enlarged photos: not usable yet.** 41 timed answers had a photo enlarged, 35 of them from two players, and the
habit differs hugely by player (P2 25/130, P5 10/84, P1 4/229, P4 2/85, P3 0/126). The visible enlarge mark and its
one-time hint came at 2026-11-03 20:24 (sheet clock), and too few answers came after it (P1 1/44, P5 3/31; their apps
may not have updated yet). An enlarged answer is slow (mean z +0.98: the time spent enlarged is in the seconds), and,
with its time as a control, it went neither better nor worse than expected (+0.68 [−0.13, +1.85]); one player's were
right more often than expected (P2 +0.08), another's less (P5 −0.21, 10 answers). It can only ever be read against the
player's own rate of enlarging, and from that release on, never as an absolute signal. The time rules below were also
replayed with no time effect on an enlarged answer (`+N`): the same result.

**4. Time as a weak signal in the Elo** (`tools/abilityeval.js`, options with a number; the prediction of an answer
never uses its own time, only the step after it does). z against the median of the player's own earlier timed answers
(from their 11th; an answer without time, a typed one or one of the first 10: factor 1, as the 4 players without any
timed answer):

- `+Tk`: a right answer's genus step times w = clamp(1 − k z, 0.5, 1.5) (fast > 1, slow < 1), misses unchanged;
  `+Sk` the same w on misses (a fast miss steps further down); `+G` the level's step too.
- `+Hh`: the speed-accuracy score of Math Garden (Klinkenberg et al. 2011, "high speed, high stakes"; Maris & van der
  Maas 2012): s = (2x − 1)(1 − t/D), whose expectation is coth(c) − 1/c with P(right) = σ(c), step K h (s − E s). The app
  has no time limit: D is taken as e times the player's median (z capped at 1). It fits the shape roughly (by speed
  quintile: right 0.93 / 0.88 / 0.83 / 0.83 / 0.64; the score's own expectation given the time 0.86 / 0.84 / 0.82 /
  0.77 / 0.69; the Elo's 0.82-0.79 throughout).
- `+Uc`: every right answer's genus step times c, whatever the time: a control, since the app's expectation runs a
  little low (0.79 for 0.82 right) and any rule that makes the steps up bigger could look good for that alone.
- k, h and c chosen by **leave one player out**: each player is scored with the value best on the other players
  (`--grid`), never fitted on the answers scored; each fold replays the other players again with pooled mix-up scores
  that leave out the held-out player's answers too, and the level bands' reference is seeded the same way whatever the
  rule (Codex review #431).

Paired log-loss difference per answer against the app (`e+X+M`, log-loss 0.4695 on 1,386 answers), × 10⁻³, ± its
standard error [95%]:

| Group (answers) | `+T`, k by player out | **`+T+G`** | `+S` (misses too) | `+H` (speed-accuracy) |
| --- | --- | --- | --- | --- |
| all (1386) | −1.58 ± 0.60 [−2.75, −0.41] | **−2.15 ± 0.72 [−3.57, −0.73]** | +0.62 ± 0.70 | −2.41 ± 2.37 [−7.05, +2.23] |
| 5 timed players (1020) | −2.15 ± 0.81 | −2.93 ± 0.98 [−4.85, −1.01] | | |
| 2 choices (808) | −1.65 ± 0.57 | −2.22 ± 0.69 | +0.19 ± 1.01 | −6.74 ± 2.65 |
| 3-4 choices (570) | −1.58 ± 1.20 | −2.15 ± 1.45 | +0.92 ± 0.86 | +2.96 ± 4.28 |
| level < 0 (222) | −0.31 ± 0.54 | −0.03 ± 0.50 | +1.56 ± 1.07 | +6.91 ± 4.22 |
| level 0-0.75 (398) | −1.69 ± 0.81 | −2.43 ± 1.08 | +0.27 ± 0.56 | −1.91 ± 2.47 |
| level ≥ 0.75 (766) | −1.89 ± 0.98 | −2.63 ± 1.17 | +0.53 ± 1.19 | −5.36 ± 3.90 |
| after a false alarm (175) | −1.93 ± 2.75 | −2.59 ± 3.18 | +1.25 ± 2.66 | +4.24 ± 7.09 |
| after a fast right (141) | −6.34 ± 2.93 | −8.09 ± 3.51 | −2.35 ± 3.18 | −13.75 ± 15.85 |
| after a slow right (133) | −4.73 ± 3.97 | −6.13 ± 4.74 | +3.06 ± 4.28 | −9.71 ± 11.86 |

- **`+T+G` is the best**: k chosen 1.5 for 8 of the 9 players left out, 2 for one (the weight then mostly sits at its bounds: 1.5 for
  an answer about 1.3-1.4 times faster than usual or more, 0.5 for one as much slower), the mean expectation unchanged
  (0.79), no group worse, and all five timed players better (P1 −10.0 ± 3.7, P4 −3.9 ± 2.4, P5 −1.8 ± 1.1, P2
  −0.3 ± 2.2, P3 −0.1 ± 0.8; bootstrap over players [−5.35, −0.20]). A fixed small k does part of it: k 0.25 −1.09 ±
  0.31, 0.5 −1.72 ± 0.51, 1 −2.13 ± 0.67.
- **It is the time, not bigger steps up**: the constant boost alone (`+U`, c 1.5-2 chosen) is within its noise (−2.22 ±
  2.15) and worse after a slow right (+15.4 ± 11.3); time on top of it still gains −2.02 ± 0.81 [−3.61, −0.44].
- Scaling the misses too (`+S`) is worse: a fast miss is no stronger evidence (few of them: about 1 in 6 timed
  misses). The speed-accuracy score (`+H`) helps the 2-choice questions but costs the players below level 0 (+6.9 ±
  4.2) and is no better overall: kept as a measure, not a candidate.
- **Small**: −0.0022 per answer is 0.5% of the log-loss, a quarter of the global level + genus change (−0.0085,
  "Global level and genus"). Several rule families were tried on the same answers, so the best one's interval is a
  little optimistic.

**Simulation** (2026-11-03): `tools/learnsim.js` had no response time then; it has one since 2026-11-04 (section 5).

**Conclusion of the measure (2026-11-03).** Time is informative beyond correctness: on the answer itself clearly and for every player; on the next
answer on the genus weakly (fast right answers are under-credited). As a weak signal in the Elo step (right answers'
genus and level steps times clamp(1 − k z, 0.5, 1.5)) it would improve the next-answer prediction by about 0.002 per
answer (0.5%), carried mostly by two players, on 662 timed answers of 5 players. Not shipped: too few timed answers and
players, no way to simulate it yet, and the ability would then depend on time, which rule L1 and "Considered
and not adopted" rule out today (Pierre's call). Next (ROADMAP "Response-time signal"): measure again at about 5,000
timed answers (Pierre's threshold for weak photo signals), with at least 10 players of 100 timed answers each: ship
`+T+G` (k by leave one player out, likely 0.5-1 then) only if the gain holds (95% interval below 0 by answers and by
players, no level band or format worse), after the learnsim time model above, and with Pierre's OK on rule L1.
Enlargement: re-read then, against each player's own rate, from the 2026-11-03 20:24 release. Pierre decided
otherwise the next day (section 5).

Reproduce: `node tools/abilityeval.js answers.json --variants 'e+X+M,e+X+M+T*,e+X+M+T*+G,e+X+M+S*,e+X+M+H*,e+X+M+U*'
--grid '0,0.1,0.2,0.3,0.5,0.75,1,1.5,2,3'` (the `+H` row with grid 0-1.5, the `+U` row with 1-2; the answer-level
tables in sections 1-3 come from a read-only script kept outside the repo).

**5. In the ability (2026-11-04, rules version 4).** Pierre, 2026-11-04: "the signal is already very clear on few
players; the question is how to integrate it", and rule L1 was about the time between sessions (days, a
Duolingo-style decay), not the seconds an answer takes: reworded, those seconds are evidence about that answer and
may weigh how much it moves the ability, never a decay nor a penalty for being slow on its own.

- **The rule** (`core.js` `RTIME`, `rtWeight`, `rtAdd`; `quiz.js` `answer`; `replayProgress`): `+T+G` as measured. A
  right answer's two Elo steps, on the genus shown and on the global level, are taken times w = clamp(1 − K z, 0.5,
  1.5) (`eloStep`'s new weight; the volatility follows the plain surprise). z = log(seconds) − the median log(seconds)
  of the player's own earlier timed answers. w = 1 for a miss, an answer without seconds (an app before sheet v23, a
  clock that never started), a typed question (slower by design; `k` infinite) and the player's first 10 timed
  answers (`RTIME.MIN`). Exam questions are weighed like any other: the exam is scored on its right answers, which
  the weight does not touch (it moves only the ability, so the difficulty of later questions). The answer's own time
  never enters its prediction.
- **K = 1.5**: the value leave one player out chose on the real answers for 8 of the 9 players (2 for one; grid 0-3,
  `abilityeval` `+T*+G` after the Codex review fixes of #431), a round number in the selected range 1.5-2. No other
  new constant: 0.5, 1.5 and 10 are #431's rule as measured.
- **Where the median lives**: in the global level's record, `P['~level'].rt` = {tenths of a second: how many timed
  answers took that long}, e.g. `{"45": 3, "52": 1}`. The seconds are those the app logs (to the tenth, at most 600:
  `quiz.js` `qclockRead`, `Code.gs` `secs_`), so the median is exact (`rtMedian`: the middle one, or the mean of the
  two middle logs), the record compact (a few hundred keys at most: the real players have 60-111 distinct values over
  84-229 timed answers, under 1 KB), and deterministic from the answer log: the sheet's replay rebuilds it answer by
  answer (`replayProgress` reads the seconds at row index 12; `Code.gs` v32 reads the Seconds column, `rowOf_`), and
  so reproduces the app's steps exactly (`tests/replay.test.js`: a device's log of picked, typed and untimed answers
  replayed from scratch and on top of an earlier replay gives the same abilities, volatilities and record as the app
  stepped live). Two devices' records add up (`mergeProgress`, like the mix-ups), two accounts merged too
  (`mergeUsers`), and the replay's record goes with the level's answer count (`replayedOf`, `replayBase`). The times
  are recorded whatever the sheet's version.
- **The app never gets ahead of the sheet** (rule D4): the weight is on only once the sync script's replies say
  v ≥ `RT_SHEET` (32; `sync.js` `sheetV`, the last reply's `v` kept on the device as `reefid-sheet-v`; `model.js`
  `rtOn`); before it every weight is 1, exactly as before, and so in the device's own answers replayed on top of an
  adopted replay (`sync.js` `replayAdopt` passes `time` from the reply's `v`; Codex review #444). A device then adopts the v32 replay of its whole log under
  rules version 4 (standard card `RV_CARD`).

**Real answers, the app's implementation against main** (`tools/abilityeval.js`, `e+X+M` on main's `core.js` through
`--model` against `e+X+M+A` on this one: `+A` replays `core.js` `rtWeight` / `rtAdd` as the app runs them, and gives
exactly `+T1.5+G`'s predictions; the same export as above, 1,386 answers of 9 players, 662 timed from 5; paired
log-loss per answer × 10⁻³, ± its standard error [95%]; mean predicted main / this / right; the level bands are the
same answers in both):

| Group (answers) | this − main | mean p main / this / right |
| --- | --- | --- |
| all (1386) | −2.20 ± 0.72 [−3.61, −0.78] | 0.793 / 0.793 / 0.820 |
| 5 timed players (1020) | −2.98 ± 0.98 [−4.90, −1.06] | 0.798 / 0.798 / 0.824 |
| 2 choices (808) | −2.24 ± 0.69 [−3.60, −0.89] | 0.805 / 0.806 / 0.855 |
| 3-4 choices (570) | −2.21 ± 1.45 [−5.05, +0.62] | 0.776 / 0.775 / 0.772 |
| typed (8) | +3.79 ± 12.67 | 0.775 / 0.786 / 0.750 |
| level < 0 (222) | −0.03 ± 0.50 | 0.739 / 0.739 / 0.797 |
| level 0-0.75 (398) | −2.41 ± 1.08 [−4.52, −0.30] | 0.774 / 0.773 / 0.781 |
| level ≥ 0.75 (766) | −2.71 ± 1.17 [−5.01, −0.42] | 0.819 / 0.820 / 0.847 |
| Duel tab (86) | −13.39 ± 2.07 | 0.859 / 0.870 / 0.930 |
| after a false alarm (175) | −2.64 ± 3.18 | 0.800 / 0.798 / 0.789 |
| after a fast right (141) | −8.05 ± 3.50 | 0.832 / 0.845 / 0.908 |
| after a mid right (96) | −8.98 ± 4.71 | 0.822 / 0.823 / 0.844 |
| after a slow right (133) | −6.28 ± 4.74 | 0.811 / 0.800 / 0.789 |

Log-loss 0.4695 → 0.4673; the mean expectation unchanged; every timed player better (P1 −10.0 ± 3.7, P4 −3.9 ± 2.4,
P5 −1.8 ± 1.1, P2 −0.6 ± 2.1, P3 −0.1 ± 0.8); no group worse beyond its noise (the 8 typed answers, whose own steps
are not weighed, +3.8 ± 12.7). K was chosen on these same answers (by leave one player out: −2.15 ± 0.72 with each
player's own fold value), so the fixed K's figure is a little optimistic.

**learnsim's time model** (`tools/learnsim.js` `LEARNER.RT`, rule L11): the learner takes t seconds, log t =
log 7 − 0.15 × right − 0.3 × logit(pTrue) + 0.6 × N(0, 1), pTrue its true chance on the question, drawn from a
generator of its own (the answers do not depend on it), to the tenth, handed to the app's question clock. Calibrated
on main's simulated logs (4 profiles × 5 seeds × 300 questions, 6,000 answers; the seconds recomputed for each
candidate from each answer's pTrue and noise, `--rtlog`) so that `abilityeval --rtfit` gives back the real measures:

| Measure (against `e+X+M`'s expectation) | real answers | simulated (B 0.15, C 0.3, SD 0.6) |
| --- | --- | --- |
| logistic term of z on the answer itself | −0.88 ± 0.16 (654) | −0.88 ± 0.06 (5,760) |
| logistic term of a genus's last right answer's z on its next one | −0.39 ± 0.21 (413) | −0.38 ± 0.07 (4,153) |
| linear fit z = a + b right + c logit(expected), residual sd | 0.55 − 0.41 right − 0.08, 0.72 | 0.48 − 0.39 right − 0.10, 0.68 |

Other values fit one measure but not all: with noise sd 0.7 (the first guess) both terms need B 0.2-0.25, C 0.45, and
the residual sd is 0.84; with B 0.4, C 0.1 the next-answer term is −0.04. T0 only sets the scale (z is against the
player's own median). No zoom model: the learner never enlarges a photo (41 real enlarged answers, too player-specific
to model yet). The run of `main` with #437 below, with these constants, gives −0.87 ± 0.06 and −0.42 ± 0.07 again.
On the simulated logs the app's rule gains less than on the real ones (−0.8 ± 0.5 × 10⁻³ per answer replayed from
main's logs, −0.5 ± 0.5 with #437; leave one player out would choose K 0.5-1 there) and costs after a slow right answer
(+4.0 ± 1.2, against −6.3 ± 4.7 on the real answers): the learner's time carries its knowledge only through pTrue.

**learnsim, main against this** (`main` with #437, the opening only after a right answer; 5 seeds, the four
profiles, 300 questions, the same seeds; mean main → this, (paired difference ± its sd over the seeds); right % over
the answers since the previous checkpoint; |th − lk| the Elo error over the genera met; the beginner and the expert
again with 15 seeds, where the 5-seed Elo error moved by about its spread):

| Profile | q | knowSlate | met | right % | \|th − lk\| | learned |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | 100 | 0.263 → 0.265 (+0.002 ± 0.023) | 16.2 → 17.2 (+1.0 ± 3.7) | 75.2 → 77.2 (+2.0 ± 8.2) | 0.83 → 1.01 (+0.18 ± 0.11) | 0.0 → 0.0 |
| beginner | 300 | 0.636 → 0.665 (+0.029 ± 0.036) | 37.8 → 39.0 (+1.2 ± 3.3) | 81.4 → 76.2 (−5.2 ± 3.8) | 1.00 → 0.88 (−0.12 ± 0.12) | 0.0 → 0.0 |
| lecture RA | 100 | 0.465 → 0.461 (−0.004 ± 0.007) | 18.6 → 17.8 (−0.8 ± 1.9) | 77.2 → 79.2 (+2.0 ± 5.1) | 0.77 → 0.73 (−0.04 ± 0.15) | 0.0 → 0.0 |
| lecture RA | 300 | 0.759 → 0.752 (−0.008 ± 0.009) | 40.0 → 40.0 (+0.0 ± 0.0) | 78.8 → 81.2 (+2.4 ± 3.0) | 0.81 → 0.80 (−0.01 ± 0.09) | 0.0 → 0.0 |
| strong RA | 100 | 0.659 → 0.656 (−0.003 ± 0.017) | 18.6 → 19.0 (+0.4 ± 1.1) | 85.2 → 88.8 (+3.6 ± 4.3) | 1.01 → 1.00 (−0.01 ± 0.19) | 0.0 → 0.0 |
| strong RA | 300 | 0.854 → 0.848 (−0.007 ± 0.007) | 40.0 → 40.0 (+0.0 ± 0.0) | 85.0 → 86.6 (+1.6 ± 7.4) | 1.17 → 1.08 (−0.09 ± 0.26) | 0.4 → 0.0 (−0.4 ± 0.9) |
| expert | 100 | 0.939 → 0.939 (+0.000 ± 0.000) | 19.6 → 19.6 (+0.0 ± 1.0) | 96.4 → 95.2 (−1.2 ± 3.6) | 0.81 → 0.94 (+0.13 ± 0.11) | 0.0 → 0.0 |
| expert | 300 | 0.954 → 0.954 (−0.000 ± 0.000) | 40.0 → 40.0 (+0.0 ± 0.0) | 94.6 → 95.8 (+1.2 ± 2.9) | 0.99 → 0.96 (−0.03 ± 0.14) | 0.0 → 0.2 (+0.2 ± 0.4) |
| beginner, 15 seeds | 100 | 0.267 → 0.269 (+0.002 ± 0.015) | 17.0 → 17.3 (+0.3 ± 2.6) | 76.5 → 75.2 (−1.3 ± 7.0) | 0.85 → 0.87 (+0.03 ± 0.22) | 0.0 → 0.0 |
| beginner, 15 seeds | 300 | 0.627 → 0.651 (+0.025 ± 0.048) | 36.1 → 37.4 (+1.3 ± 4.4) | 80.0 → 77.1 (−2.9 ± 3.5) | 0.96 → 0.86 (−0.10 ± 0.15) | 0.1 → 0.0 (−0.1 ± 0.3) |
| expert, 15 seeds | 100 | 0.939 → 0.939 (+0.000 ± 0.000) | 19.3 → 19.3 (−0.1 ± 0.7) | 96.8 → 96.0 (−0.8 ± 2.9) | 0.83 → 0.89 (+0.06 ± 0.10) | 0.0 → 0.0 |
| expert, 15 seeds | 300 | 0.954 → 0.954 (−0.000 ± 0.000) | 40.0 → 40.0 (+0.0 ± 0.0) | 94.9 → 95.7 (+0.8 ± 2.5) | 1.00 → 0.98 (−0.02 ± 0.12) | 0.3 → 0.4 (+0.1 ± 0.6) |

No profile learns less: knowledge and genera met move by less than their spread everywhere (the beginner +0.025 of
true knowledge by 300 questions with 15 seeds, within it). The Elo error is within its spread or lower: with 15 seeds
the beginner +0.03 at 100 questions and −0.10 at 300, the expert +0.06 at 100 (its level climbs a little more slowly
early: in the simulated learner a slow right answer is the one with the lower true chance, the most surprising, so its
step is the one shrunk) and −0.02 at 300. The same comparison against `main` before #437 gave the same picture (the
strong RA and the expert with 15 seeds: Elo error +0.01 and +0.06 at most). Learned genera by 300 questions: too few
in any profile to compare (0-0.5 a run). Reproduce: `node tools/learnsim.js --seeds 5 --rtlog log.json` on each version (main's learnsim has no time model: run this one's `tools/learnsim.js`
from a main checkout, its app ignoring the seconds), `node tools/abilityeval.js log.json --variants e+X+M,e+X+M+A
--rtfit`; real answers: `node tools/abilityeval.js answers.json --variants e+X+M --model main-core.js` against
`--variants e+X+M+A` (paired by a short script; the two runs score the same answers in the same order).

### One scorer (2026-11-06, Q132; rules version 6, sheet v61)

Pierre approved (2026-11-06) the coherence review's F1 and F6 (PR #664):
the same answer was scored twice, live in `quiz.js` `answer` and again in `core.js` `replayProgress`, and the replay
worked the photo difficulty back out of the rounded `e` the app logged.

- **One function.** `core.js` `scoreAnswer(P, q)` scores an answer: the offers and the mix-up on the pair, the counts
  and the run, the progress weight (`pgRightW`, `pgMemW`, `pgMissW`) and `pgStep`, the genus's Elo step and the global
  level's (`eloStep`, `levelSeed`, `rtWeight`, `rtAdd`), the photos seen, the recent results, and the miss on the genus
  given (rule L2). `q` is what the question was: the genus shown and given, the choices and `k`, the photos seen and the
  corallites hint revealed after the answer, and the inputs the game had then, `d0` (photo difficulty), `fam` (photo
  memory), `cf` (known mix-ups), `look` (a genus the player confuses it with among the choices), `R` and `Rc` (recalls on
  a comeback), the first-launch prior, the seconds. `quiz.js` `answer` builds `q` from the device's model and calls it;
  `replayProgress` builds `q` from a log row and calls it. What only the game knows stays in `answer` (the exam, the
  days answered, the last observations); what only the log knows stays in the replay (the last misses `lx` / `lm`).
- **Logged, so the replay needs no inversion.** Each answer carries its scoring record `sc` (`core.js` `scoreRec`,
  `scoreLog`: `d`, `f`, `c`, `l`, `r`, `g`, `h`, defaults left out, numbers to 3 decimals; the game rounds them before it
  scores, `scoreIn`, so the replay meets exactly what it used). The sheet keeps it in a new last Answers column,
  **Scoring** (sheet v61, read by its name), `readAnswers` serves it at index 22 (column W), the replay rows carry it at index 22 too
  (`Code.gs` `rowOf_`, `core.js` `logRow`, both through `core.js` `LOG_SC`). An older script ignores the field: no gate needed (rule D4).
- **"Replayed" has one meaning** (F6, option c): for every answer logged with its record, the replay gives the state the
  game had, field by field, wherever and whenever it runs (the device's replay of its unsent answers, the sheet's
  `replay_`, the admin's `replayedAll_` and Journey), whatever pooled stats each one holds; only the rules (`core.js`)
  can change it. `tests/scorer.test.js` replays recorded sessions (3 seeds × 160 answers: comebacks, hints left closed,
  typed answers, "I don't know", 2-choice questions, photos seen again, the device's stats changing every 25 answers)
  through `quiz.js`'s own question code and compares every field of every genus and of the global level, from scratch,
  going on from an earlier replay, and from the sheet's JSON cells, with other stats than the device's: identical.
  Option (b) (stamping the stats each replay used) is not needed for these rows; rows logged before v61 keep the
  inversion against the sheet's current stats (below), a dependence that fades as new answers come.
- **One fix on the way** (integrator's call): a corallites hint left closed is revealed after the answer and counts as
  shown, never as recognised, as the code's own comment said; it counted as recognised when the question also showed a
  close-up. The global level now keeps its recent results (`h`) in the replay too (`replayedOf` keeps the device's).
- **Measured on the real log** (rule L12, read-only, an extract of 2,047 answers of 10 players to 2026-11-05 20:14,
  kept outside the repo): replayed with `main`'s `core.js` and this one, every numeric field identical (max difference
  0) and no player's % moves: these rows carry no scoring record, so they replay by their `e` exactly as before (the only
  new field is the global level's `h`). What the logged `d0` removes: within the rounding of `e` (±0.005) the recovered
  difficulty spans a median 0.08 logits, 0.12 at the 90th percentile, up to 0.53; 360 of 2,047 rows span more than 0.1
  and 33 more than 0.2. The live game itself does not change (the inputs rounded to 0.001 logits; the hint fix).

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

**Per subject** (2026-11-08, the re-check of #664's F8; the integrator's call, a leak fix). The sheet fits `mem` on the
corals' answers only (`Code.gs` `stats_` reads the replayed subject's rows), yet until this change the app drew,
scored and recalculated fish answers with it too: on 2026-11-08 the corals' shown-never-right offset was +0.43, so a
fish photo shown and missed was taken as harder than a new one, where the prior says −0.5. Every use now reads
`model.js` `pmem()`: the sheet's offsets for the subject it rates (`SUBJECTS` `replay`: the corals, the very `PMEM`
array, so nothing changes for them), the prior (`core.js` `MEM.PRIOR`) for any other, until a per-subject `?stats=1`
rates fish photos (ROADMAP admin plan PR 11). Checked by `tests/fishmemory.test.js` (a fish draw, expectation and
recalculation run with a `PMEM` that throws on any read; the corals' read `PMEM` itself).

- **Learning outcomes** (rule L11 level 1: one subject, the offsets of the few answers on a photo already seen).
  `tools/learnsim.js --subject fish --stats` with the live `?stats=1` of 2026-11-08, the five fish profiles × 5 seeds ×
  300 questions, before (main 71b6b42) and after (3ca9f0c) on the same seeds, judged by `tools/learncmp.js`; declared
  before running: primary `know@300:up` (none expected: a leak fix, its guardrail the non-inferiority check). Look 1
  (25 pairs) left the answers to the first family at Open Water breached for the beginner (+39) and the casual diver
  (+22), each from one seed (61 → 261 and 62 → 170 answers; the other 8 pairs equal or better), and the families at Open
  Water unclear for three profiles, so, one step up, a second look declared before it ran: beginner, casual diver and
  lecture RA on seeds 6-15 (55 pairs in all, `--looks 2`: 95% bounds, the primary at 0.025). Paired difference after −
  before [bound on the side of harm], beginner / casual diver / lecture RA / strong RA / expert:

  | Guardrail | Margin | Difference [bound] | Verdict |
  | --- | --- | --- | --- |
  | True knowledge @300 (primary: no clear difference, p 0.036) | −0.02 | +0.003 [0.000] / −0.001 [−0.002] / +0.001 [0.000] / 0 [−0.001] / 0 [0] | held |
  | E = bar − D\* @300 | +0.03 | −0.024 [−0.005] / −0.001 [+0.016] / −0.001 [+0.004] / −0.001 [+0.002] / 0 [+0.001] | held |
  | Answers to the first family at Open Water | +19.5 / +12 / +10 / +10 / +10 | +10.5 [+37.5] / +9.1 [+22.0] / 0 / 0 / 0 | unclear for the beginner and the casual diver, else held |
  | Families at Open Water @300 | −2 | −0.6 [−1.8] / −0.2 [−1.1] / −0.1 [−0.8] / 0 [−0.7] / 0 | held |
  | Longest plateau of the shown score | +10 / +10 / +9 / +10 / +9 | +11 [+17] / +2 [+8] / +1 [+2] / −3 [+2] / 0 | **breached for the beginner** (50 → 61 answers), else held |
  | Share under ease 4 before Open Water @300 | +0.05 | −0.002 to +0.001, bounds ≤ +0.005 | held |
  | Families met @100, @300 | −2 | +0.3 to 0; 32 at 300 in every run | held |

  What it says: the beginner's bar runs a little lower (E −0.336 → −0.360), its longest flat stretch of the shown score
  about 11 answers longer and its first Open Water later on average: the corals' +0.43 for a photo shown and missed made
  a later right answer on it count as a hard question, the prior's −0.5 counts it as the easier question memory makes
  it (in this learner's world memory adds +0.4 there, and on the real log below such photos were 92% right against 74%
  expected with the corals' offset, 86% with the prior's). A cost the change brings, not declared before running, so
  it goes to Pierre (rule L11). **The corals, identical**: the same runs on `--subject coral` (4 profiles × 5 seeds,
  71b6b42 → 3ca9f0c; and before on e62256e) give the same 300 answers in every run (genus, answer, photos, choices,
  expectation, scoring record; only the answer id and the wall-clock time differ) and the same rows and summary
  (knowSlate 0.686 / 0.814 / 0.859 / 0.954, met 40).
- **On the real log** (rule L12, read-only, the Answers tab read 2026-11-08 20:57 Manila: 1,536 scored fish answers of
  9 players, 45 of them on a photo already seen, bucket from the logged `f`; the expectation recomputed with the
  prior's offset in place of the logged one):

  | Bucket | Answers | Right | Expected, coral offsets | Expected, prior | Log-loss coral → prior |
  | --- | --- | --- | --- | --- | --- |
  | shown, never right | 13 | 92% | 74% | 86% | 0.396 → 0.311 |
  | right once | 31 | 97% | 88% | 86% | 0.122 → 0.146 |
  | right twice or more | 1 | 100% | 94% | 95% | 0.062 → 0.052 |
  | all | 45 | 96% | 84% | 86% | 0.200 → 0.192 |

  Per player (6 with such answers) the mean log-loss difference is +0.002, sign-flip p 0.56: the log cannot tell the
  two apart yet, and both under-predict remembered photos. The fix rests on its reason (no coral number on a fish
  answer), not on the log. The fish answers logged before it keep their coral `f` in their scoring record, which the
  sheet's fish replay (#776) reads as logged.

**Decided by Pierre, 2026-11-09 (Q317)**, on #805's breached guardrail and a literature review
([reference/lit-photo-memory.md](reference/lit-photo-memory.md): every validated memory model has a lag term, Pelánek
2015's item effect about +1.5 logits a minute after a show and near 0 after a month): **keep #790's conservative prior
for fish**. Later, a memory model with two parts: a lasting value per outcome (today's buckets) plus a boost that
decays with the time since the photo was last shown, its decay shape fixed from the literature and one fitted weight.
Rule L1 gained the matching exception the same day (rule L1, "Second exception, photo memory"). Validation (rules L11,
L12) in the review's order, the read-only table first (lag band × bucket, observed against expected, players the unit);
ROADMAP "Photo memory that fades with time".

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
  which is what keeps the ability unbiased. The genus wrongly given (rule L2) gets no memory term: the player's memory of
  a photo is of the genus shown, it says nothing about the other one.
- **Spread the repeats** (`photoSet`; per colony since 2026-11-06, Q190: every photo of a colony takes the bucket of
  its most remembered photo, "Photo exposure" below): in ordinary questions a photo already shown weighs × e^offset of its bucket
  (the odds memory adds to a right answer on it, divided out), × 0.64 / 0.33 / 0.18 with the offsets above (before: × 0.6
  from right twice only, nothing before). A soft factor in the existing targeting, never a filter: a genus whose photos
  are all known still shows them, the least remembered first. The photos never shown keep their bonus (× (1 + 1.5 ×
  recent success), × 1.3 for IMR and Pierre's photos, corals only: `SUBJECTS` `tiers`; never for fish since 2026-11-06). The targeting distance stays on the photo's difficulty when new:
  aiming at a known photo's lower effective difficulty would hand a struggling player the photos they remember, the
  opposite of the point. Measured in the genera with the fewest photos (2026-11-03; 3 colonies of each tried, 1000
  draws), every photo already shown and right twice but one colony's, shown never right: that colony comes up × 1.45 as often as when all
  are known alike (median; 1.1-2.5), × 1.1 with the old rule (0.9-2.0); a colony never shown × 2.4 (1.3-4.5) against
  × 1.7 (1.3-3.2). The floor of 3 colonies in rotation (`VARIETY`) keeps it from more; `tests/draw.smoke.js` checks
  × 1.25 or more. The exam keeps its own rule (never shown first).
- **Saved progress recalculated once, silently** (Pierre, 2026-11-03: the replay of the real answer log moved the
  bars down 1-3 points, and one player lost Advanced on 2 genera, accepted; no pop-up, no message, an exception to
  rule D6). The device holds no answer log for a signed-in player, only each genus's record,
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
  `tests/draw.smoke.js` (applied once at load, saved, no pop-up, not again at the next answer). Since the sheet's full
  replay (below) reaches the devices, this is only the fallback for a device that never reached the sheet: a record
  adopted from the replay carries `s.pm` and is never corrected here.
- **Learned under the former model** (Pierre, 2026-11-03, doubting that one player's two learned genera really were):
  a genus learned on a record without `s.pg` passed its exam under BKT (before 2026-11-02). BKT's estimate reached 95%
  after about 4 right answers, so the exam came at once and mostly against easy choices. Replayed with today's rules
  (`tools/memreplay.js` on the sheet's log), the only two such genera on the sheet stand at 78% and 83%, under the
  exam's entry. `memRecalc` drops their `s.mx` (and any `s.ex`) at every call (load, pull, answer), so a copy pulled
  from another device loses it too; the genus keeps its bar from its record and takes the exam again under today's
  rules. An exam passed since (`s.pg` beside `s.mx`) is left alone. The sheet's Learned column and leaderboard %
  follow at the player's next sync. The sheet's full replay (below), adopted by the app, keeps a learned mark only on a record with `s.pg` (`core.js` `replayedOf`); the admin shows the replayed numbers and marks "↻ saved …" where the sheet's copy still counts it. **Silent since 2026-11-09** (Pierre, ~15:40 Manila, Q332: every recalculation silent, the learned-mark card too; `mxRecalc` no longer calls `mxLost`, and the learned-based achievements are kept, as for a mark lost in play). Until then the
  app saw the mark go (`model.js` `mxRecalc`, which wraps any recalculation and reports every genus whose `s.mx` it
  removed, to `mxLost`; a mark lost by misses in play never goes through it) and tells the player once, by an
  announcement card (`progress.js` `mxLostNotice`; Pierre, 2026-11-03: never held, rule D6): at start-up once
  the first page is drawn and the progress is in, and right after a pull or an answer that drops a mark, on whatever page
  is open, even in the floor of a visit or a comeback and with no prompt spacing; it only waits for another card or the
  tour already on screen: "You passed the mastery exam on *X* under the beta's first rules, which brought the exam too early.
  This genus is back on its progress bar, and its exam will come again. Until then, the badge earned with it is taken
  back." (plural forms for several genera or badges). Once per mark on a device (`reefid-mx-lost`, device only: a drop
  that happens through a pull on a second device is told there too). The achievements that rest on genera learned
  (`core.js` `ACH_LEARN`: Instructor 1/5/10/20, Coral master, Group complete) and that the progress no longer meets
  are taken back (`progress.js` `achRecheck`, `core.js` `achRevoke`), only then (everywhere else achievements are only
  added); each removal is dated in the record's `_gone`, so a copy earned before it (the sheet's, another device's)
  never comes back through a merge (`core.js` `mergeAch`); earned again, it carries a newer date and stays. The
  removals are saved and synced even when the device's record held none of them (`achMigrate` dropped them at
  start-up, or they were earned on another device; Codex review #399). Checked by
  `tests/core.test.js` and `tests/draw.smoke.js` (the card at start-up over Home, before any answer and in a new
  visit's floor, once; the mark and the badge gone, not brought back by the sheet's older copy, nothing again after a
  reload or answers; a drop at a pull shown at once, after a card already open; learned with `s.pg`: nothing).
- **What it does to the current players**: `node tools/memreplay.js answers.json [--player id] [--mem ...]` replays
  the admin's answer log (`readAnswers`, saved to a file) under the old rule and the new one: the offsets these answers
  give, how far the photo ratings move, and per player the bar of each genus, their overall % and their opening hold,
  old -> new (each question's difficulty recovered from the expectation and ability the app logged; approximations
  listed at the top of the tool).
- **Full replay** (Pierre, 2026-11-03: "why recalculate on the phones when the phone doesn't have the full log?
  Recalculate from all the results"; then: automatically, never by a human click, now and whenever the progress engine
  changes): **the reference** for a player's progress is the replay of their whole answer log, in time order, with
  today's rules (`core.js` `replayProgress`), **done by the sync sheet itself and pushed to the app**. Each answer is
  weighed as the app weighs it now (`pgRightW` with the app's look-alike test, `pgMemW` with the photo memory from the
  player's own history in the log and the sheet's offsets, `pgMissW`, `pgStep`), and the ability steps as the app's
  (`eloStep`, moved from `model.js` into `core.js` for this), as if every answer had been played under these rules. The
  weights and the step live in `core.js`, and `model.js` / `quiz.js` call the same functions, so a rule changed for the
  app is changed for the replay. Since rules version 6 both score through one function, `scoreAnswer`, and an answer
  logged with its scoring record is replayed from it ("One scorer" above). For a row logged before, each question's
  difficulty is recovered from what the app logged (`e`, `th`, the choices; since the photo memory, `MEM_LOGGED`, the
  logged `e` includes it and the replay takes it out again).
  **Typed answers** (`quiz|t`, `quiz|t|x` in the exam; "Typed questions" above) are replayed as the app scores them:
  no guess rate (`core.js` `kOf` gives k infinite, as `model.js` `TYPED.k`; `e` = sig(th − d)), a right one in full
  (`pgRightW`: every genus was a possible answer), no choices offered, "I don't know" a miss for the genus shown
  only; `tests/replay.test.js` replays a device's log of typed and picked answers, exam included, and finds the record
  the app scored live. The genus wrongly given is weighed, as in the app, by the chance the player had on it: its
  own ability as replayed so far, after the global level's step (`quiz.js` `answer` order); it gets a miss in its
  recent results and its run reset, and no Elo step (as the app since 2026-11-03, "The genus wrongly given in the
  Elo": the replay would otherwise put that penalty back on every player; `tests/replay.test.js` checks its ability
  does not move while its progress drops).
  Approximations for the rows logged before rules version 6, listed with the function: the abilities and photos are those the app logged (other rules would have
  drawn other photos; the weights use the logged ability, the replayed ability is the app's step over the recovered
  difficulties), a comeback answer's recall is taken as 1, the look-alike prior leaves out the IMR growth forms, the
  ability of the genus wrongly given is the replayed one (the app's own at that moment is not logged; the same as the
  app's when the replay goes on from the device's record), answers logged before sheet v5 (no `e`, `th`) count in the
  counts only. The mastery exam is not replayed: it comes from the device's copy (below), so an exam still waiting for
  its `TYPED.exam` typed right answers stays at 99% at most (`scoreOf`) until the device has passed it.
  - **Rules versions** (`core.js` `RVS`, `RV`): every change to a progress rule appends `{v, at, why, msg}` (AGENTS.md
    rule D5), each with the standard recalculation card (`msg: RV_CARD`, Pierre 2026-11-03, a
    standing rule; below). A version is not a frozen engine: the sheet always replays with the code's current rules
    (`core.js`, embedded in `Code.gs`), and a new version only makes every device take that replay again. So v1
    (2026-11-03, not deployed yet when these were added) replays with every rule merged before it goes live: the miss
    weighed against the success aimed for at the player's global level (`aimOf`, 85% to 75%), no Elo step on the genus
    wrongly given, a genus's ability moving with the global level (`levelMove`, `lt`; the level's step without a floor,
    4 decimals; Calibration step 2, #415), a learned mark kept unless a miss logged after its exam takes it away as the
    game does. v2 (2026-11-04): the opening pace and known mix-ups (#425): the mix-ups term in the question's difficulty
    for the ability, the global level and a miss's weight ("Known mix-ups" above). v3 (2026-11-04): the hierarchical
    photo Elo (sheet v31) puts the genus offset into the expectation the photo memory offsets (`mem`) are fitted
    against, and `replay_` replays with the sheet's `mem`, so the same log gives other bars (Codex P1 on #422;
    `tests/replay.test.js` "RVS v3": on a synthetic log with repeated photos the offsets go from 0.47 / −0.79 / −1.66
    to 0.41 / −0.77 / −1.60 and the replayed progress moves with them). A change to `stats_` that moves what the replay
    reads from it needs a rules version too. v4 (2026-11-04): answer time weighs right answers
    ("Response time": a right answer's genus and level steps times clamp(1 − 1.5 z, 0.5, 1.5); the sheet replays it from
    v32, which reads the Seconds column). v5 (2026-11-04): the first-launch question's prior. v6 (2026-11-06, sheet
    v61): one scorer, and the rows logged with their scoring record replayed from it ("One scorer"). v7 (2026-11-06,
    sheet v62): one surprise counted once ("One surprise, counted once"). v8 (2026-11-06, sheet v77): per-format
    offsets ("Per-format offsets"). v9 (2026-11-06, sheet v87): the domain-score bar ("The domain-score bar"), the genus
    offsets `gd` of `stats_` given to the replay for the rows logged without them; its card is the apology (the
    Notes key `card.rv8.ps`, named before the renumbering). v10 (2026-11-09, sheet v127; fish rules version 2): the
    log the only reference, no floor, no card ("The log, the only reference for progress" below). A device that skips several versions sees the standard card once, at the
    last of them, with its progress before and after the whole jump (`core.js` `rvMsgs`).
  - **The sheet replays, by itself** (`Code.gs` `replay_`, sheet v28): `core.js` is embedded in `Code.gs` (between
    `// BEGIN core.js` and `// END core.js`, kept identical by `tools/sync_core.py`, checked in CI; its own `module`
    object keeps its names out of the script's globals, reached as `CORE_`), so the self-updater installs the engine
    with the script. In the reply to a sign-in, a load or a save whose app applied an older version than `RV` (the
    request's `rv`), it replays the player's rows of the Answers tab since their last progress reset, with the photo
    memory offsets and pooled confusions of `stats_` (cached) and the look-alikes and families of `data.json` (fetched
    from GitHub, cached 6 hours). A device that never signed in gets the same in the reply to its anonymous answers,
    under its anonymous id, since the progress reset its request carries (`reset`, its `reefid-sync-coral-reset`; Codex review
    #399). The result is kept in the **Replayed** tab (one row per player: Name, Rules, Rows, Since,
    Updated, Record JSON in 45,000-character chunks), reused while the rules version, the number of the player's rows
    and the reset are unchanged, replayed again otherwise. The player's own saved copy (Progress data, RAs Data) is never
    rewritten there (no race with a device's save). The reply carries `replay: {rv, n, rec, ids}`; `ids` are the
    replayed rows' answer ids from the time of the oldest answer the device still queues (the request's `pt`; at least
    the last 500), so a lost reply that left up to 2,000 answers already logged in its queue never counts them twice
    (Codex review #399).
  - **The app adopts it** (`sync.js` `replayAdopt`), once per version, and only from a script that reports `v` >= 28
    (`core.js` `RV_SHEET`; rule D4: the app never gets ahead of the sheet script; before, it does exactly what it did,
    and the `rv` its requests carry is ignored by an older script): when a reply carries a replay newer than the one
    this device applied (`reefid-sync-coral-rv`, in the progress data: a device that signs in to the account takes it with
    the account, whose progress is the adopted one, and 0 when the account's data has none, never the version of an
    anonymous replay adopted on the device (Codex review #399); a device already signed in keeps its own and adopts the replay
    itself once, with its own unsent answers on top), the progress becomes the replayed record, with this device's answers the sheet has not counted
    yet (the unsent log or the anonymous queue, minus the ids the sheet replayed and the answers before a reset)
    replayed on top by the same engine; then saved and sent. A replay whose request went out before a progress reset
    made on the device while it was on its way is not adopted (it still counts the answers the reset discarded): the
    next reply brings it again from the new reset (Codex review #399). Two devices on one account: the merge baseline
    (`SYNC.base`, `mergeSaved`) becomes the shared history and nothing else (`core.js` `replayBase`): the sheet's replay
    itself (`rec`, as the app holds it), never mixed with this device's counts; this device's answers the sheet has not
    counted yet stay the difference between its progress and the baseline, so the next three-way merge puts them on top
    of whatever another device saved (Codex review #399, the third case on the baseline: 2 logged answers and 1 unsent
    gave a baseline of 3, and the next merge with another device's replay of the 2 lost the third). Per genus kept from
    the device (the log has fewer answers on it), the baseline stays the shared copy's record; the photos shown take,
    per photo, the larger of the replay's and the shared copy's (exposure the log leaves out that was already synced),
    never this device's own. When another device saves its own adoption of the same log, this one adds only its own new
    answers to it, never the replayed ones a second time. A copy that may lack answers in the log makes the device ask
    for the replay again (its rules version back to 0; the next save brings it): a reset made on this device that the
    sheet's copy does not have yet (other devices, an older app among them, may have answered after the reset time), a
    reset from another device while this one has answers after it not sent yet, a copy with that reset under older
    rules than this device applied. `tests/adopt.test.js` plays two devices, refused saves, unsent answers, an older
    app and a reset in flight at random (40 runs; 600 more with other seeds while building it) and checks that every
    device and the saved copy end with exactly the answers in the log since the reset. A saved copy under older rules than the device applied (its `reefid-sync-coral-rv`) is not
    merged (it may predate the replay, whose counts it would undo), but it may hold answers saved since by a device on
    an app from before the replay, which never adopts one: so the device's applied version goes back to the copy's and
    its next save (asked for at once after a pull) brings the replay of the whole log again, every device's answers
    counted once (Codex review #399: 2 answers adopted, 1 saved by an older app, gave 2 again). A copy under newer
    rules than the device applied (another device adopted them) is merged, but a learned mark it lacks is not taken
    away by the merge: the device's own adoption of the same replay decides it, with this device's card (Codex review
    #399: the merge took the mark first, so no card here). A replay is adopted only if every answer the device still
    queues is newer than the replay's last one: answers played offline before answers another device logged since
    would count after them, out of time order (Codex review #399: 20 right answers then 10 misses gave pg 0.96 and ten
    right answers last, instead of 0.19 and ten misses); the device then adopts nothing and marks no version applied,
    and the save that logs them brings the replay of the whole log in time order. Likewise for answers played before
    signing in to an existing account (queued, or sent under the anonymous id): the sign-in leaves the account's rules
    version unapplied and nothing is adopted until the first save has moved them into the account's log; its reply
    brings the replay of the whole of it (Codex review #399: 20 right answers played before an account's 10 misses kept
    pg 0.9 and ten right answers last). Answers the sheet logged from a refused save (logged, their progress not saved:
    `SYNC.lg`) are missing from the device's merge baseline, so a copy another device saved from its replay of the log
    may already count them, and the merge would add them again as the device's own (Codex review #399: 3 answers, a
    baseline of 2, a saved replay of the 3: 4, kept for good): until a save succeeds, the device's requests ask for the
    replay (rv 0) and a replay of the same version is adopted in place of the merge. An admin merge of two accounts
    (`core.js` `mergeUsers`, `Code.gs` `users_`) saves the merged copy with no rules version: it is no replay of the two
    logs together, so every device of the account asks for the replay of both histories in time order (Codex review
    #399: 20 older right answers and 10 newer misses kept the merged model, pg 0.79-0.96, for 0.20). Except the copy this
    device saved or loaded last, unchanged since (the sheet's revision, which every save bumps, an older app's
    included, is still the one this device holds, `sync.js` `mergeSaved` `mine`): it is already part of the device's
    progress, so it is not merged, whatever its rules version. A save carries the rules version applied when it was
    sent, so a replay adopted from a save's reply leaves the copy one version behind with nothing the replay lacks;
    asking for the replay again then looped, at every sync, the save of version 0, its reply's replay, the same copy at
    the next load (Codex review #399: four saves in a row, the saved version 0 throughout, a full replay in every save's
    reply); and merged against the baseline the replay set, a copy behind the log read as answers taken away. A replay
    adopted from a save's reply is followed at once by one more save (`syncOnce`), which brings the adopted version to
    the copy: otherwise the other device took that copy for an older app's, asked for the replay again and left its
    own copy so, each in turn. The random test also checks that, after the devices have synced, the saved copy and
    every device are at the rules version and no reply carries a replay any more, saves and loads in any order. A reply to anonymous
    answers is ignored once the device has signed in, or changed anonymous id, while it was on its way (Codex review
    #399: it replaced the account's progress that sign-in had just stored).
    What is taken from where (`core.js` `replayedOf`): **from
    the replay**, per genus the log has answers on: `pg`, `ok`, `ko`, `h`, `off`, `conf`, `th`, `lt`, `vr`, `streak`,
    `at` (the later), `du` (either side's), the photos seen `ps` per photo the larger [shown, right] of the replay and
    the device (the device also counts as shown a corallites hint revealed after the answer, which the log leaves out:
    it must not become new again for the mastery exam, `model.js` `examSet`; Codex review #399), plus `pm` 1 (under the photo memory rule: `memRecalc` never corrects it) and
    `rv` (so `mergeProgress` keeps it over an older copy of the same answers); the global level `~level`: `th`, `vr`,
    the larger answer count, the later `at`. **From the device**, what the log cannot give: the mastery exam passed
    (`mx`) or in course (`ex`; dropped when passed under the former model, a record without `s.pg`: that genus takes the
    exam again), the passed exam also dropped when the log has a miss after it that leaves the replayed progress below
    the keep rule, the game's own (`core.js` `mxKeeps`, `model.js` `mxKept`: the replay records `lm`, the time of the
    last such miss, and a mark passed before it goes, reason `rules`; Codex review #399: 10 misses logged by a save
    refused after a passed exam left the genus at 100%, its exam never coming back, at a bar of 0.19), so a
    recalculation alone keeps it; the exam in course likewise ends at any miss on the genus, shown or given, logged
    after it began (`lx`, the time of the last miss, against `s.ex.ts`, or the genus's last answer `s.at` for an exam
    saved before it had a start time), as the game ends it (Codex review #399: a miss over 4 questions passed kept
    them), the days answered right (`dd`, `dl`: the device's calendar days, for the comeback), the last
    observations shown (`ro`: the log keeps photo files, not observations), right with the corallites in view (`cor`:
    the log does not say which view a photo was in); but no longer the record of a genus the log has fewer answers
    on than the device (rule D9, rules version 10, "The log, the only reference for progress" below): the replay's record and counts win, also when the device holds more answers, and a genus the log has no answer on loses the answers the device counts on it. The opening hold is not in the
    record: the sheet already replays it from the same log (`hold_`, "Held while the player falls behind"). The
    adoption runs through `model.js` `mxRecalc`: since 2026-11-09 a learned mark it takes away is not told (Pierre,
    ~15:40 Manila, Q332: every recalculation silent), and from rules version 10 no version has a card (Q330, rule D5);
    before, the mark was told with the card above (reason `bkt`, or `rules` for a later rules version), and at once
    came the announcement card of every version skipped that has a `msg`
    (`progress.js` `rvNotice`, an update card of `app.js` `cardShow` with the progress ring before and after: once per
    version per device, `reefid-rv-msg`; never held, one after another, after
    `recalcNotice` and `mxLostNotice`; only to a device that had answers). Every version has the standard card
    (`core.js` `RV_CARD`; Pierre, 2026-11-03, a standing rule: "only to the players whose progress the replay moves a
    lot; if it moves everyone a lot, everyone gets it"): "Your progress was recalculated with the improved model",
    saying the % before and after, shown only when the adoption moved the player's progress % by 5 points or more,
    either way (`msg.only: 'changed'`, `msg.min: 5`, `progress.js` `rvNoticeAdd`); a player whose % moved less sees
    nothing. Pierre is asked only when a version needs a different text.
  - **The device's own recalculations** (`memRecalc` from `s.ps`, `pgOf` from the last 10 results `s.h`) only
    approximate it from what a device keeps: they stay as the fallback for a device that never reached the sheet (a
    device offline, or a local copy), and a record adopted from the replay is never corrected by them.
  - **The admin** shows the same replay, computed in the browser once per data load (about 10 ms for the demo's 1200
    answers): Players (Progress, Learned, the player's bar) and Journey (Progress, Learned, each genus's bar, the
    learned genera), and "↻ saved 44%" beside one when the sheet's saved copy says otherwise (a player who has not
    opened the app since a recalculation, or whose last answers are not saved yet).
  - Checked by `tests/replay.test.js` (the weights, the ability and level steps against the app's order, a replay
    going on from another, what `replayedOf` takes from where, the merge), `tests/sync.test.js` (the embedded engine is
    `core.js`; a player replayed once and stored; replayed again on a new rules version and on new rows; the reset;
    anonymous devices; the saved copy untouched) and `tests/pages.smoke.js` (a stale device adopts the replay with its
    own unsent answer on top, sends it, does not adopt it twice; a version with a `msg` shows its card once at load,
    one without shows nothing). `tools/memreplay.js` prints the same replay under the old rule and the new one.

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

### Photo exposure (2026-11-06, Q187-Q190; fish too)

Pierre's answers to the photo exposure study (docs/reviews/2026-11-06-photo-exposure-study.md, PR #670: 19% of the coral
questions showed a photo the player had already been shown, 38% from a genus's 11th question; the multi-view questions
turned round the few colonies with every view), 2026-11-06 15:35; and at 15:36, "we must not end up with the same problem
for the fish": every change works for every subject, the observation being the fish's colony.

- **Q187, the Colony cap** (`admin.js` `CELL_MAX`): 20 → 40 colonies per genus in the Colony view (the Auto pass fills a
  view up to it). Corals only: fish have no cap.
- **Q188, the exploration share** (`model.js` `CAL.RATE`, `photoSet`): the calibration questions become 30% of the
  questions on a unit the player holds (20% before), and each draws among the colonies (fish: observations) the player
  has never seen, while one remains, on the difficulty targeting and the calibration bonus as before: at the difficulty
  aimed for, the least answered first, never a random hard one. Pierre asked for it only after simulation, deciding
  nothing the simulation contradicts. The study had proposed it on any genus met with about 5 answers: simulated, that
  variant cut the repeats less (colony repeats 15.4% → 17.5% for the beginner, item learner), took 0.005 off the true
  knowledge at question 300 in the exemplar world (−0.008 / −0.002) and met 3.8 fewer fish units in 300 questions (5 of 5
  seeds), so the unit held stays the condition.
- **Q189, beginners' zooms** (`photoSet` `cov`): a colony's weight in a beginner's multi-view question is its share of
  the views, cov, not cov²: a colony with two views of three weighs 0.67 of a complete one (0.44 before). Corals only by
  design: a fish question has one view, so cov is the same for every observation and changes nothing.
- **Q190, a colony counts as seen whatever view was shown** (`model.js` `colonyMem`): in the draw, every photo of a
  colony takes the memory of its most remembered photo (`memBucket`, then the most shown), so a close-up never shown of a
  colony already met is no new photo and loses the never-seen bonus. Fish: an observation's other photos of the same fish.
  The expectation of an answer and the progress still read each photo's own record (`famOf`, `pgMemW`); the mastery
  exam keeps its own rule (a photo never shown).

**Simulated** (rule L11 tier 1: `tools/learnsim.js` `--stats` (the sheet's ratings of 2026-11-06 15:39) `--truth gen`,
the four profiles × 5 seeds × 600 questions, 1 worker, `main` against the four changes on the same seeds, item and
exemplar learners; the run logs each question's colony and photos, `expo`, and each genus's game photos, `pool`).
Declared before the second run: primary, the colony repeat rate over questions 1-600 (a question showing a colony shown
before), pooled, down; guardrails, true knowledge over the slate at 300 and 600 (margin 0.02) and genera met at 100
and 300 (margin 2), the stats study's margins; the judge's E and D\* and the time to credit reported with their bounds.

| Measure (pooled over the profiles) | Item learner | Exemplar learner |
| --- | --- | --- |
| **Colony repeats, questions 1-600** (primary) | 20.2% → 14.5% (p < 0.001; 20 of 20 runs down) | 19.7% → 13.5% (p < 0.001; 20 of 20) |
| Photo repeats, 1-600 | 16.4% → 12.7% | 15.1% → 11.2% |
| Colony repeats from a genus's 11th question | 37.5% → 28.5% | 38.2% → 28.2% |
| Photo repeats from a genus's 11th question | 30.3% → 24.0% | 29.6% → 22.6% |
| Spread (questions showing a colony never seen while one remained) | 80.2% → 86.3% | 81.0% → 87.1% |
| True knowledge, slate, 300 / 600 | +0.005 (bound +0.002) / +0.000 (−0.001) | −0.002 (−0.005) / −0.000 (−0.002) |
| Genera met, 100 / 300 | −0.05 (−0.39) / +0.15 (−0.05) | +0.15 (−0.29) / 0 |
| Judge: D\* over the genera met at 600 | −0.001 (−0.003) | −0.002 (−0.003) |
| Judge: E = bar − D\* at 600 | −0.142 → −0.139 | −0.162 → −0.159 |
| Genera with the bar at 80% by 600 | 14.8 → 14.7 (−1.2) | 16.9 → 16.5 (−1.6) |
| Time to credit, the known genera's mean bar at 50% | +1.9 questions (+9.4) | −2.6 (+4.9) |

(In brackets, the one-sided 90% bound of the paired difference on the side of harm.) Every guardrail held. By profile,
the colony repeats fell in 5 of 5 seeds for each profile in both worlds (5 seeds cannot give a per-profile p under
0.06). Exploratory: the median questions from a genus's first answer to its bar at 80% moved +16 (item) and −13
(exemplar), opposite ways, a median over the genera that got there. Pooled over the 20 runs as one cohort, the photos
never shown after 115 questions each (about the 2,300 answers of the study): 40% → 42% of the photos, 38% → 39% of the
colonies (a question shows fewer photos when it picks a two-view colony); after 600 each, 2%. As the study said, the
photos never shown follow the traffic; what the draw changes is how each player's questions use the room they have.

**Fish** (no learnsim fish mode on `main` yet, #678 adds one; a scratch harness played the real fish quiz with an item
learner, a beginner learning 0.12 of the gap per answer, 300 questions, the units met by the path). With the judged
candidates of #674 (8,561 photos) and the draw calibration of #678 (Q186), 20 seeds, before → after: observation repeats
4.3% → 4.3%, from a unit's 11th question 4.8% → 4.8%; **photos under ease 4 before Open Water 22.8% → 21.1%** (−1.7
points, sign test p 0.12), in a unit's first 10 questions 22.1% → 19.9%, reference-level photos there 24.7% → 25.8%;
right 74.0% → 74.4%. The same pool **without** #678: under ease 4 before Open Water 38.0% → 39.6% (+1.5 points, 15 of
20 seeds up, p 0.04), reference-level photos in the first 10 questions 19.3% → 17.1%: a seen observation's other photos
lose the never-seen bonus, and in that draw the bonus then goes to unseen observations, mostly harder; #678's narrower
targeting removes it. So this goes in after #678. Today's pool (1,935 photos, 5 seeds): under ease 4 before Open Water
37.2% → 35.7%, repeats 8.7% → 8.0%. With pools this big the fish repeats are low already; the re-measure at about 500
fish answers is in ROADMAP (Q193).

### Hierarchical photo Elo (sheet v31, 2026-11-03)

Pierre asked whether part of a photo's difficulty can be shared, so that a new photo starts from what similar photos
already show. A read-only study of the answer log (1,262 trusted answers, 9 players, 2026-10-31 to 11-03) answered:

- **The Easy / Medium / Hard sets were worse than no prior at all.** As the app used them (−1 / 0 / +1, weighing 5
  answers in `photoDiff`), they predicted held-out answers worse than a constant: cold-start log-loss +0.016 [+0.008,
  +0.024] by colony, cross-validated; rank correlation with the photos' Elo 0.04 (295 photos with 3+ answers). They
  were made automatically (featured = Easy, other good = Medium, Poor = Hard), so they encoded "featured" and "quality",
  neither of which says how hard a photo is for the players. Pierre: "drop the Easy/Medium/Hard classification, it's
  useless; if it isn't relevant, don't keep it at all: it simplifies the code and the model." `applySlots` now gives
  each view one game list (`game`: the same photos in the same order as the three sets one after the other, checked on
  the real data: 198 genus × view lists, 1,706 photos, identical), `gamePics` returns it, `LEVELS` and `photoLvl` went.
- **The genus carries about half of a photo's difficulty**: pooling by genus was the only grouping that helped out of
  sample (−0.006 [−0.011, −0.001]); view, quality, sharpness, source, growth form and colony views explained nothing
  measurable yet (ROADMAP: refit offline at about 5,000 trusted answers).
- **The rule**: the player rule "global level + genus" (Pelánek et al. 2017) applied to the photos, partial pooling of
  an item family (Glas & van der Linden 2003; Mislevy 1988). A photo's difficulty = its genus's offset G + its own
  residual P. Each trusted answer, with its surprise d = right − expected and its weight w (as before), moves both:
  P by 0.8 / (1 + n_photo / 10) / photos shown × d × w (unchanged), G by `GENUS_K` / (1 + n_genus / 10) × d × w, n the
  weighed answers. G starts at 0, so does P: a photo nobody has answered sits at its genus's offset. In `Code.gs`
  `stats_` and `core.js` `eloReplay` (`tests/core.test.js` compares them); `?stats=1` serves each photo's total G + P in
  `photos` (so everything reading it, the admin included, reads it as before) and the offsets in `gd` (`{genus:
  [offset, weighed answers]}`; `core.js` `genusOffsetsOf`). The genus of a photo is the genus shown (one colony a
  question, rule P4), so no data file and no per-genus code.
- **The app** (`model.js` `photoDiff`): (n × rating + 5 × gd[genus]) / (n + 5), and gd[genus] for a photo nobody has
  answered; `gd` is read only from a sheet that reports v ≥ 31 (`PGD_SHEET`, rule D4, stored with the stats and
  their `v`). With an older sheet, or for a genus with no offset, the prior is 0, which the replay below shows is
  already better than the sets. The genus difficulty that orders the opening (`genusDiff`, the mean `photoDiff` of a
  genus's photos) becomes data-driven through it with no code of its own.
- **`GENUS_K` 0.4**: on the real log, 0.2 and 0.4 score alike and both beat the photo-only Elo; 0.8 moves too fast
  (below). 0.4 learns a new genus's offset sooner (a few answers) at the same accuracy.
- **Blend weight 5 kept**: 2, 5, 10 and 20 score within 0.0004.
- **Rules version 3** (`core.js` `RVS`; v2 is #425's known mix-ups): the genus offset also enters the expectation the photo memory offsets are fitted
  against, and the sheet's full replay uses those offsets, so every player is replayed again once v31 is live ("Full
  replay").

**Real answers** (read-only replay of the sheet's Answers tab read on 2026-11-03, 1,346 rows: the study's export plus
76 rows read with the connector; 1,338 trusted answers scored, 9 players, each scored before it moves anything; the
expectation g + (1 − g) σ(level − difficulty − memory), the sheet's player level and photo memory; the replay
reproduces `core.js` `eloOf` before and after to the hundredth). Log-loss, lower is better:

| Rule | all | photo with < 3 earlier answers (1,058) | without Pierre (1,054) | mean expected (right 81.2%) |
| --- | --- | --- | --- | --- |
| sheet v28 (photos start at 0) | 0.4853 | 0.4972 | 0.4640 | 79.3% |
| **app before** (blend with the set prior, W 5) | **0.4976** | 0.5100 | 0.4740 | 83.9% |
| app new with a v28 sheet (prior 0) | 0.4864 | 0.4981 | 0.4643 | 79.2% |
| sheet v31, `GENUS_K` 0.2 | 0.4819 | 0.4932 | 0.4614 | 79.3% |
| sheet v31, `GENUS_K` 0.4 | 0.4814 | 0.4925 | 0.4620 | 79.3% |
| sheet v31, `GENUS_K` 0.8 | 0.4837 | 0.4950 | 0.4664 | 79.4% |
| **app new** (v31, `GENUS_K` 0.4, gd prior, W 5) | **0.4812** | 0.4922 | 0.4610 | 79.3% |
| app new, W 2 / 10 / 20 | 0.4811 / 0.4814 / 0.4815 | | | |

Paired differences, 95% bootstrap over blocks of 25 answers in time order:

- app new vs app before: −0.0164 [−0.0284, −0.0060]; photos with < 3 answers −0.0178 [−0.0330, −0.0043]; without
  Pierre −0.0130 [−0.0275, −0.0000].
- app new with a v28 sheet (prior 0) vs app before: −0.0112 [−0.0223, −0.0021] (the gate's fallback is safe).
- sheet v31 vs sheet v28: −0.0039 [−0.0087, +0.0009]; photos with < 3 answers −0.0046 [−0.0100, +0.0004]. The online
  offsets start at 0 and learn as the log runs, so this is a lower bound over this history; for photos added from now
  on, with offsets learned from about 1,300 answers, the study's out-of-fold estimate puts the gain between −0.004 and
  −0.012.
- `GENUS_K` 0.2 vs 0.4: +0.0005 [−0.0016, +0.0027]; 0.8 vs 0.4: +0.0022 [−0.0010, +0.0058].

By format and level band (app before → app new; expected before / new / right): 4 choices 0.609 → 0.577 (n 549; 81% /
76% / 74%); 2 choices 0.419 → 0.414 (766; 86% / 82% / 86%); 3 choices 0.379 → 0.405 (18); typed 0.679 → 0.661 (5);
sheet level < 0 0.548 → 0.582 (136; 70% / 62% / 79%); 0-1 0.532 → 0.505 (562; 82% / 77% / 79%); ≥ 1 0.457 → 0.439
(640; 88% / 85% / 84%). The set prior over-expected (83.9% for 81.2% right), mostly on 4-choice questions; the new rule
is close overall and under-expects players below 0 (n 136, not explained yet; worth a look as the log grows). Calibration (expected / right, n): before 54/84 (31), 66/76
(90), 76/77 (257), 85/80 (562), 93/87 (398); new 54/69 (77), 66/81 (179), 75/74 (348), 85/85 (549), 93/90 (185).
Genus offsets at the end of the log: 45 genera, sd 0.40, easiest Plerogyra −0.98, Lobophyllia −0.89, Galaxea −0.56,
Acropora −0.54; hardest Isopora +0.53, Leptoseris +0.54, Favites +0.65, Heliopora +0.85.

**Simulated** (`node tools/learnsim.js --seeds 5 --questions 600 --truth truth.json`, the four profiles, the same seeds
before and after). The learner's photos must not change with the app's estimate, so this run gives the learner a fixed
world (`--truth`, new): each game photo's true difficulty = its genus's offset learned from the real log + a residual
drawn once per photo (sd 0.5, the study's measure), the same before and after. Before: the app of PR #399 with its sets.
After: the new app with a v31 sheet serving those genus offsets and no photo ratings (cold start), and with an older
sheet (prior 0). Mean ± sd over 5 seeds, before / after v31 / after with an older sheet:

| Profile, question | knowSlate | \|th−lk\| | prog−know | prog% | met | exam | learned | ref ≥ .9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beginner, 300 | 0.64 / 0.63 / 0.63 | 1.12 / 1.30 / 1.23 | −0.31 / −0.27 / −0.26 | 35 / 37 / 38 | 37.2 / 38.6 / 37.6 | 0.0 / 0.6 / 0.4 | 0 / 0 / 0 | 0.6 / 0.8 / 0.2 |
| beginner, 600 | 0.87 / 0.88 / 0.88 | 1.62 / 1.45 / 1.35 | −0.24 / −0.21 / −0.20 | 64 / 66 / 67 | 40 / 40 / 40 | 3.2 / 3.8 / 4.8 | 0.2 / 0.4 / 0.2 | 5.8 / 6.4 / 7.2 |
| lecture RA, 300 | 0.76 / 0.76 / 0.76 | 1.11 / 1.00 / 0.92 | −0.32 / −0.32 / −0.27 | 44 / 45 / 49 | 39.0 / 39.4 / 39.8 | 0.0 / 0.4 / 0.2 | 0 / 0 / 0 | 0.2 / 1.0 / 0.2 |
| lecture RA, 600 | 0.91 / 0.91 / 0.91 | 1.64 / 1.44 / 1.29 | −0.22 / −0.17 / −0.14 | 70 / 74 / 76 | 40 / 40 / 40 | 4.6 / 5.0 / 7.6 | 0.4 / 0.4 / 0.4 | 8.2 / 9.6 / 9.4 |
| strong RA, 300 | 0.86 / 0.86 / 0.86 | 1.28 / 1.21 / 1.10 | −0.31 / −0.30 / −0.27 | 55 / 56 / 59 | 40 / 40 / 40 | 1.4 / 0.0 / 0.6 | 0 / 0 / 0 | 7.6 / 8.8 / 9.0 |
| strong RA, 600 | 0.94 / 0.95 / 0.94 | 1.71 / 1.62 / 1.52 | −0.13 / −0.10 / −0.10 | 81 / 85 / 84 | 40 / 40 / 40 | 11.2 / 14.2 / 12.6 | 1.6 / 0.4 / 1.6 | 24.4 / 24.8 / 24.2 |
| expert, 300 | 0.95 / 0.95 / 0.95 | 1.14 / 1.17 / 1.09 | −0.26 / −0.26 / −0.27 | 69 / 69 / 69 | 40 / 40 / 40 | 4.0 / 3.8 / 3.6 | 0.2 / 0 / 0 | 14.8 / 14.8 / 15.8 |
| expert, 600 | 0.97 / 0.97 / 0.97 | 1.20 / 1.23 / 1.17 | −0.05 / −0.06 / −0.06 | 92 / 91 / 91 | 40 / 40 / 40 | 24.8 / 23.2 / 22.8 | 7.0 / 6.4 / 7.2 | 38.8 / 38.2 / 38.6 |

What the learners really know (knowSlate) does not move, no path breaks (no page error in 60 runs), and the app's
ability is nearer the truth at 600 questions for the three learning profiles (|th − lk| 1.62-1.71 → 1.35-1.62), its
progress bar a little less pessimistic. The strong RA's learned genera at 600 (1.6 → 0.4, sd 0.5) differed by more than
the spread, so beginner and strong RA were run again on 15 seeds: learned 1.5 ± 0.7 → 1.2 ± 1.2 (strong RA) and
0.3 → 0.5 (beginner), knowSlate 0.95 → 0.94 and 0.87 → 0.87, |th − lk| 1.70 → 1.65 and 1.56 → 1.43: within the spread.
The simulated world is built on the same genus offsets the v31 app is given, so it says the rule is safe, not how
much it gains; the real-log replay above is the measure of that.

**Next: one difficulty in components** (decided by Pierre, 2026-11-09, Q316; the coherence review's F8, C1), after a
literature review ([reference/lit-componential-difficulty.md](reference/lit-componential-difficulty.md): the linear
logistic test model with random items, nested item families, TrueSkill's split of one result among additive parts). An
evolution of this Elo engine: one difficulty per question = a rank offset + the family, genus, species and photo
components, each shrunk toward its parent while it has few answers; the online update splits the surprise among the
components by their uncertainty (TrueSkill / the simplified Kalman rule); with only genus + photo it must reproduce
today's v31 ratings within rounding; the genus and species parts count at family rank too. Order: the offline fit
first (read-only), then the sheet, then the app; rule L11. **Q136** (photos rated against the genus ability) is
reopened for rework on today's multi-level engine and folded into this work: check whether the per-genus player
ability can be taken as centred on zero across players on our data (the literature's condition, review §6), with more
literature if needed. ROADMAP "Engine coherence review".

### Response time: genus and photo (measured 2026-11-04, no change made)

Pierre, 2026-11-04: "response time informs on several things at once: the player's knowledge of this genus, the
intrinsic difficulty of the genus, and the intrinsic difficulty of the photo. It's the combination of the three that
makes the time longer or shorter. So we need to see how we can use it in each of these three factors, or not." The
first factor (a right answer's Elo step weighted by its speed against the player's own median) is "Response time"
(PR #431, 2026-11-03). This section splits the time into its parts and asks whether the other two can use it.
Nothing in the app changes.

**Data and model** (`tools/rtprep.js`, then `tools/rtdecomp.py`; the sheet's Answers tab read 2026-11-03, read-only,
the same 654 timed answers, not typed, of the 5 timed players as PR #431, P1-P5 in the same order; the 41 with a photo
enlarged left out, since the time spent enlarged is in the seconds: 613 answers). log(seconds) = μ + fixed terms +
u_player + a_genus + b_photo (+ c_player×genus + e_player×photo) + ε, crossed random effects fitted by REML (van der
Linden's lognormal response-time model, 2006, with the item's time intensity split into genus and photo). The photo is
the question's first one (the colony view of a multi-view question). Fixed terms: "controls" = 2 choices, number of
views, share of the photos new to the player, log of the player's answer number (practice); then right; then the gap,
the logged ability minus the question's difficulty (th − d, from Expected and Ability). Intervals: parametric bootstrap
(100 refits on data simulated from the fit; 20 for the five-effect model) and, beside them, each player left out.

**1. The decomposition** (share of the variance of log(seconds)):

| Model | fixed | player | genus | photo | player × genus | player × photo | residual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| controls | 0.05 | 0.28 [0.02, 0.55] | 0.06 [0.00, 0.10] | 0.18 [0.09, 0.30] | | | 0.44 |
| controls + right + gap | 0.12 | 0.26 [0.03, 0.42] | 0.04 [0.01, 0.10] | 0.15 [0.07, 0.24] | | | 0.43 |
| controls, five effects | 0.04 | 0.26 | 0.02 [0.00, 0.07] | 0.16 [0.06, 0.29] | 0.11 [0.05, 0.17] | 0.01 [0.00, 0.12] | 0.40 |
| controls + right + gap, five effects | 0.11 | 0.25 | 0.01 [0.00, 0.05] | 0.15 [0.05, 0.23] | 0.08 [0.01, 0.13] | 0.00 [0.00, 0.13] | 0.41 |

- **The player** comes first: medians from 3.9 to 11.2 seconds. With five players its share is very uncertain (one
  player left out: 0.04 to 0.33). This is why every time rule reads z, the time against the player's own median.
- **Correctness and the expectation**: a right answer takes 0.67 times as long (−0.40 ± 0.07 in log), and −0.22 ±
  0.04 per logit of the gap. With th and d apart: −0.25 per logit of ability on the genus, +0.18 ± 0.06 per logit of
  the question's difficulty. Together they explain 7 points of the variance (fixed share 0.05 → 0.12; plain
  regression R² 0.095). Most of the time is not correctness.
- **The genus**: 4-6% with three effects, but 1-2% once the player × genus term is in. That term, the player's own
  knowledge of the genus (8-11%), takes most of what looked like a genus effect: Pierre's first factor, PR #431's.
  The 62 Duel tab answers (two fixed pairs, fast) also make part of it (without them the genus sd is 0.155, not 0.194).
- **The photo**: 15-18%, a photo one sd slower takes 1.4 times as long (sd 0.35 [0.27, 0.43] in log). It is
  shared by the players: player × photo is about 0 (a photo slow for one player is slow for the others).
- So, of what varies inside a player beyond the outcome: photo about a quarter, the player's own knowledge of the
  genus about a sixth, the genus itself a few percent, the rest noise (about 60%).

**2. Genus: not useful.** The genus effect (BLUP, controls) against what the app uses for the opening order:

- **Correlation over 45 genera** (28 with 10 timed answers or more): with `genusDiff` +0.14 (its photo part −0.07, its
  confusion part +0.21), with the pooled miss rate +0.46 (+0.51 on the 28), with the miss rate beyond Expected +0.42.
  A slow genus is a missed one; `genusDiff` itself goes with the miss rate only +0.25. Fastest: *Lobophyllia*,
  *Ctenactis*, *Acropora*, *Plerogyra*, *Danafungia*; slowest: *Astreopora*, *Montipora*, *Leptoseris*, *Stylophora*.
- **Not stable across players**: the effect from two players against the other three, over the 10 splits, +0.14 on
  average (−0.35 to +0.37; +0.07 with right and gap); first half against second half of each player's answers +0.09;
  odd against even answers of the same players +0.42. What repeats is each player's own genus, not the genus.
- **Out of sample** (each player's 1,012 scored answers, timed or not, predicted with coefficients fitted on the other
  players; every genus measure from answers the fold has not seen: the held-out player's from the other four, each
  training player's from the other three, Codex review #443; log-loss difference per answer × 10⁻³):

| Added to the player's level | all answers | on top of the app's expectation | first answer on each genus (166) |
| --- | --- | --- | --- |
| `genusDiff` | +2.8 ± 2.4 | +3.9 ± 2.4 | +3.5 ± 11.8 |
| genus time effect | +3.0 ± 1.2 | +4.3 ± 1.4 | +1.7 ± 7.1 |
| time effect on top of `genusDiff` | +3.0 ± 1.0 | +3.9 ± 1.2 | +2.4 ± 5.7 |
| pooled miss rate of the others | −1.1 ± 2.5 | +0.7 ± 2.4 | +3.9 ± 8.9 |

  The time effect makes every prediction worse (its sign is right: a slower genus is missed more, −0.32 per log
  unit, but it carries no more signal than noise; before the review's fix, which left each training player's features
  holding the held-out player's answers, it read +1.1 ± 0.6 on all answers). Nothing measured on four players predicts the fifth player's
  success on a genus: `genusDiff` neither, and the others' miss rate only within its noise. The part of genus
  difficulty that players share is small next to each player's own, and time adds nothing to it yet.
- **When**: the reliability of a genus time effect over m players with n timed answers each (genus sd 0.12, player ×
  genus 0.27, residual 0.51): 0.38 for 5 players × 5 answers (today), 0.65 for 15 × 5, 0.71 for 20 × 5, 0.76 for 20
  × 10. So about 15-20 timed players with 5 or more timed answers on most genera (about 4,000-5,000 timed answers),
  and then only if the out-of-sample test above turns negative.

**3. Photo: not usable yet, the most promising of the two.** The photo effect is the larger and is shared, but:

- **Too few repeats**: 428 photos; 117 with 2 timed answers or more, 50 with 3, 4 with 5; 85 answered by 2 players or
  more. The reliability of a photo's time effect with n timed answers is 0.26 (1), 0.51 (3), 0.63 (5), 0.77 (10).
- **Against the photo difficulty**: correlation with the photo Elo (core.js `eloOf`, the sheet's rating) +0.25 on the
  photos with 2 timed answers or more, +0.33 with 3 (+0.24 with right in the model), with the app's `photoDiff` +0.01.
  As a covariate of time, the photo Elo is clearly there (+0.52 ± 0.08 log per unit, +0.36 with right) but explains
  only a fifth of the photo variance (photo sd 0.35 → 0.31): most of what makes a photo slow is not what makes it
  missed (a far colony, a busy scene, several views to look at).
- **Cross-player** (419 answers on a photo another player answered with a time): the others' photo time effect makes
  the prediction worse, +7.4 ± 5.0 × 10⁻³ (on top of `photoDiff` +4.3 ± 5.1; on top of the app's expectation and
  `photoDiff`, −0.5 ± 6.1): noise.
- **In the sheet's photo Elo** (`tools/rtprep.js`: core.js `eloReplay` replayed with time on the photo's step, each
  answer scored before it updates anything, 1,466 trusted answers, 183 of them on a photo timed before): a right
  answer's photo step × w = clamp(1 − k z, 0.5, 1.5) as PR #431's player rule, k 0.25 / 0.5 / 1 / 2: −0.05 / −0.07 /
  −0.07 / −0.10 ± 0.05-0.10 × 10⁻³ (nothing, within noise; on the 183, −0.4 to −0.8 ± 0.4-0.8; z against the
  median of the player's earlier timed answers, the two middle ones averaged for an even count, as
  `tools/abilityeval.js`); an additive time step instead (the photo harder by c × K × z beyond the player's mean z for
  the same outcome), c 0.25 / 0.5 / 1: +0.2 / +0.5 / +1.6 ± 0.4-1.5 × 10⁻³ (worse).
- **When**: to tell a correlation of 0.25 from none (80% power, 5%) takes about 120 photos with a reliable time effect
  (5 timed answers or more from 2 players or more); with today's spread of the draw (an effective pool of about 800
  photos, Poisson) that is about 2,500 timed answers, 3,000-3,500 if the draw spreads over all 1,404 game photos, so
  within Pierre's ~5,000 timed answers for weak photo signals ("Response time" above). Then run the replay again.

**4. What each factor could do with time**

| Factor | Verdict | When | How |
| --- | --- | --- | --- |
| Player × genus (knowledge) | usable now | now | PR #431's rule, the other work |
| Genus (intrinsic difficulty) | not useful now | 15-20 timed players × 5+ timed answers per genus (~4,000-5,000 timed answers), and only if out-of-sample helps | a term in `genusDiff` (below) |
| Photo (intrinsic difficulty) | not usable yet | ~120 photos with 5+ timed answers from 2+ players (~3,000 timed answers) | the photo's Elo step (below) |

- **Photo, if the replay says so**: in `Code.gs` `stats_` and its copy `core.js` `eloReplay` (tests check they agree),
  a right answer's photo step × w = clamp(1 − k_P z, 0.5, 1.5), z the time against the median of the player's earlier
  timed answers (from their 11th; typed or enlarged answers, or none: w 1). The same z and the same form as the
  player's rule, so a fast right answer says "easy photo" and "known genus" at once, Elo-style (Pelánek 2016: one
  surprise moves both sides). No new state per photo, no constant per photo or genus; k_P one number chosen by the
  replay (leave one player out, as PR #431's k). The additive form (a separate time rating, T_f = Σ residual z /
  (n_f + 3), 3 = residual variance / photo variance, added to the Elo with a weight) was worse today.
- **Genus, if it ever helps**: the sheet (compute once, rule L13) would serve each genus's time effect, the
  shrunk mean over players of each player's mean residual z on it, â_g = Σ_p w_p z̄_pg / (Σ_p w_p + 1/τ_g²), w_p =
  1 / (τ_pg² + σ² / n_pg), the variances refitted by `tools/rtdecomp.py` (today τ_g 0.12, τ_pg 0.27, σ 0.51), and the
  app would add `OPEN.TIME` × â_g to `genusDiff` only from that sheet version (rule D4); `OPEN.TIME` one number
  chosen by the out-of-sample test (0 until it helps). With the hierarchical photo Elo (PR #422, a genus offset G in
  the photo difficulty), the same term would go into G's prior instead.
- **For the player rule** (PR #431): its z also holds the photo's part (a quarter of the variance inside a player), so
  a slow right answer on a slow photo now counts as weaker knowledge. Once photos have reliable time effects, z −
  b̂_photo (the photo's shrunk time effect, from the sheet) would give each factor its own part; today b̂ is shrunk to
  a third or less (reliability 0.26-0.51), so it would change nothing.

### Response time as information on difficulty (measured 2026-11-08, no change to the app)

Pierre, 2026-11-08: the earlier analyses asked how variables change the response time; he asked the other way round:
what the speed of an answer says about how hard the question was, "even when they got it right: an answer where
people took long, or even clicked to enlarge, means the question or the photo was harder than if the person answers at
once". Today the seconds weigh only a right answer's steps on the player's ability ("Response time" section 5); the
photo ratings (`Code.gs` `stats_`, `core.js` `eloReplay`) do not use them, and "Response time: genus and photo" found
no use for them on 613 answers of 5 players.

**Data** (the sheet's Answers tab read 2026-11-08, read-only; 4,021 rows: corals 2,729 (2,159 timed, 14 players, 11
with timed answers on a photo another player answered), fish 1,292 (1,251 timed, 8 players); players P1… only; a
script kept outside the repo). z = log seconds minus the median of the player's own earlier timed answers (from their
11th; typed answers out). **Declared before reading the data** (rule L11, the multiple-testing rules of "Multifactor
analyses"): three primary tests under Holm (family-wise 5%), the players the unit (stratified sign-flip over players,
exact), one-sided: **H1**, others' earlier right-answer speed on a photo predicts a player's success on it beyond the
app's rating (corals and fish pooled); **H2** (corals) and **H3** (fish), the sheet's photo Elo with a right answer's
photo step × clamp(1 − k z, 0.5, 1.5) (k by leave one player out, grid 0.25-3) predicts the next answers better
(paired log-loss). Everything else secondary under Benjamini-Hochberg (FDR 5%, 28 tests); the rest exploratory.

| Primary | estimate [95%] | players | p | Holm |
| --- | --- | --- | --- | --- |
| H1: others' right-answer speed on the photo (logit per log unit, beyond the photo Elo) | −2.66 [−3.63, −2.17] (920 answers) | 11 | 0.001 | **0.003, clear** |
| H2: corals, time on the photo's Elo step (log-loss × 10⁻³ per answer, mean of players) | −0.41 [−0.87, −0.02] (2,729) | 14 (8 better) | 0.057 | 0.114 |
| H3: fish, the same | −0.10 [−0.29, +0.10] (1,278) | 7 (4 better) | 0.20 | 0.20 |

- **(a) A slow right answer says the photo is harder, and the rating does not know it yet.** By how fast other
  players had answered the photo right (their shrunk mean z), the next answer on it (corals): faster than their usual
  91% right against 79% expected (295 answers), about usual 83% / 78% (284), slower 76% / 77% (202). Corals alone
  −2.87 [−4.67, −2.18] (BH 0.014, clear); fish −1.13 [−4.99, +3.21] (139 answers on a photo answered before: too few).
- **(b) Enlarged**: others' enlarging of the photo against their own habit, −3.59 per unit share [−4.89, −1.43]
  (corals and fish, 1,185 answers; BH 0.085, not clear after the correction); fish has 17 enlarged answers.
- **(c) Time intensity, out of sample** (van der Linden's lognormal model: each photo's time intensity from the other
  players' answers, net of right or wrong and of each player's median, shrunk by 3 answers' worth, added to the
  answer's expectation; coefficients fitted on the other players, each player predicted in turn): corals −6.1 × 10⁻³
  per answer [−11.9, −1.0] (9 of 14 players better; BH 0.094, not clear), fish −0.5 [−2.7, +0.9]. The photos' time
  intensity and their final Elo agree, +0.22 [0.12, 0.32] over 466 coral photos with 2 timed answers or more, +0.27
  [0.12, 0.42] with 3.
- **The photo Elo with time, replayed**: the k grid chose 0.5 or 1.5 by fold; fixed k 0.25 −0.19 ± 0.07 × 10⁻³ per
  answer, 0.5 −0.29 ± 0.12 (both BH 0.027, clear): small, about 0.1% of the log-loss (0.456). On the answers to a photo
  another player had answered right with a time: −0.86 ± 0.52 (BH 0.085). The enlarged mark as a slow answer, or as
  its own factor on the step: nothing (BH 0.29-1). The same weight on the **genus offset's** step too (the
  hierarchical photo Elo's G): −1.56 ± 0.36 × 10⁻³ per answer, 11 of 14 players better (BH 0.014, clear;
  exploratory, 3 values of k tried); fish −0.58 ± 0.35 (BH 0.18).
- So: the time other players took carries real information on a photo's difficulty (H1, large and for most players),
  but a weight on the photo's own Elo step, the form the earlier study proposed, takes little of it (a photo has few
  answers, and the step it scales is small); the genus offset's step takes more. Fish: too few repeated photos yet
  (152 photos with 2 timed answers or more, 1 with 5).

**Options, not built** (ROADMAP "Time in the photo rating"): (1) the weight on the genus offset's step too (`Code.gs`
`stats_` and `core.js` `eloReplay` together, k chosen by leave one player out); (2) a time-intensity term in
`photoDiff` from the sheet (rule L13: each photo's shrunk time intensity served with `photos`, × a coefficient chosen
out of sample); (3) the enlarged mark as a small extra once it is clear. Risks: player speed (z is against the
player's own median), typed questions (out), practice (z drifts as players speed up: the median from earlier answers
only), pauses (the 600 s cap; the weight's clamp at 0.5), and the player-side weight already taken on the same z
(PR #431): a slow right answer would then lower both the player's step and the photo's, which is what Elo does with
one surprise (Pelánek 2016), but the two must be tuned together, not stacked. Validation (rule L11): level 2 (it moves
every photo's rating, so the draw), both worlds, the real-log replay as the primary. The view below measures it at
every milestone: Analyses › Difficulty › Time.

**Decided by Pierre, 2026-11-09 (Q315)**, after a literature review
([reference/lit-response-time.md](reference/lit-response-time.md): time intensity as its own item parameter, the
response times as collateral information on difficulty, van der Linden 2007; van der Linden, Klein Entink & Fox 2010):
option (2), each photo's time intensity in the **prior** part of `photoDiff`, so it fades as the photo's own answers
come in; option (1) only as the declared comparison, never stacked with (2); two variants of (2) tested, the time
intensity from all answers or from right answers only (both with rapid-guess cut-offs), the one that predicts better
kept, declared before the test; option (3), enlarging, waits for data; the seconds stay logged. Validation: rule L11
level 2, the real-log replay the primary (players the unit; corals primary, fish exploratory). Next steps: ROADMAP
"Time in the photo rating".

### Q315 option 1: what three rounds showed (2026-11-09, PR #808, closed unmerged)

**The outcome: three level-2 rounds, and none passed as declared.** Option (1) weighed a right answer's photo-Elo step
and its genus-offset step by its response time. Pierre chose on 2026-11-09 (Q335) to close #808 without merging it and
to keep its conclusions here. Nothing in the engine changed. What was kept:
- the rated world's sheet mode with its simulated response times (`--app sheet`, `--times`, `--gap`);
- learncmp's population measures;
- an admin fix found on the way (#808's salvage).

**The real-log replay** (the sheet's Answers tab read 2026-11-09, read-only; corals 2,906 answers of 14 players).
- The protocol was declared before computing. Each answer was predicted before it moved anything, with the app's own
  scorer, and the players were the unit. Three primaries went under Holm.
- **Variants A and B of option (2)**, the time intensity in `photoDiff`'s prior: A from right answers only, B from all
  answers. A gave −4.05 × 10⁻³ log-loss per answer [−9.16, +1.07], B −3.53 [−8.26, +1.20]. Neither was clear (Holm
  0.107).
- **Option (1), the raw form**: z = log seconds minus the median of every earlier timed answer of the player, k 2. It gave
  −1.97 × 10⁻³ [−3.14, −0.80], 10 of 14 players better, Holm 0.003, clear.
- **Option (1), the net form** (Q318, after round 1): z against the median of the player's earlier right answers only. It
  gave −1.03 × 10⁻³ [−1.71, −0.34], 10 of 14 players, p 0.0015, k 1.5 the commonest choice (the curve flat from 1 to 3).
- The raw form beat the net form by +0.94 [+0.23, +1.65], which is at most the part the step asymmetry took. The
  right/wrong photo step ratio was 0.219 under today's rule, 0.231 with the raw z, and 0.219 with the net z.
- Fish: nothing clear in any variant.

**What was built** (on #808's branch only): `core.js` `photoTimeW` and `RTIME.PK`, called by both `Code.gs` `stats_` and
`eloReplay`. A right answer's photo and genus-offset steps were multiplied by clamp(1 − k z, 0.5, 1.5). A miss, a typed
answer, an enlarged photo and an untimed answer weighed 1. The change was rules version 10. The stats cache was keyed by
the rules version.

**The level-2 protocol, the same in all three rounds and declared in the PR before each run.**
- **The world.** The rated world, corals, `--app sheet`: one player per coral profile, 3,000 answers each (12,000
  pooled). The sheet's photo Elo was replayed on the population's own log every 100 answers and served to every player's
  app.
- **The arms.** Before was k 0 (today's rule), after the k under test.
- **The time cases.**
  - `rho25`: β_photo correlated 0.25 with the true difficulty d.
  - `rho0`: unrelated.
  - `views`: unrelated, each view beyond the first 0.3 log slower, so time runs against difficulty.
  - `fast`: fast photos easy, slow ones uninformative.
  - All four with normal photos, plus `rho25` and `rho0` with heavy tails.
- **The primary**: the photo ratings' centred root mean square error against the true difficulty at 3,000 answers per
  player (`rateErr@3000`, `rho25` normal, down; one value per seed, an exact sign-flip).
- **The key secondary**: the ratings' correlation with the truth.
- **"Nothing breaks"**: the rating error at most +0.01 with `rho0`, `views` and `fast`.
- **The guardrails** of the table above, per profile.
- **The app world**: 4 profiles × 5 seeds × 300 questions, served one population's ratings with k 0 and with the k under
  test.

**The three rounds:**

| Round | The rule tested | The simulated seconds | Seeds | Primary (rating error, after − before) | Breached |
| --- | --- | --- | --- | --- | --- |
| 1 | raw z, k 2 | log t = log 6.5 + β_photo − τ (sd 0.44) − 0.4 if right + log 1.5 if typed + N(0, 0.57²) | 101-120 | −0.0018 [+0.0126], p 0.83 | "nothing breaks" with views (+0.014); the strong RA's plateau (fast); app world: E, first Open Water and plateaus for the early profiles |
| 2 | net z, k 1.5 | the same | 121-140 | −0.0031 [+0.0085], p 0.65 | "nothing breaks" with views (+0.017); the lecture RA's score at 1,000 (views, fast); app world: the beginner's E and first Open Water |
| 3 | net z, k 1.5 | the same − 0.22 × (θ − d), the real log's knowledge-gap term (Q324) | 121-140 | **+0.0105** [+0.0210], p 0.10 | "nothing breaks" with rho0 (+0.015) and views (+0.013); app world: the beginner's first Open Water (40 → 100 answers) |

**What the rounds showed:**
- **The ranking gets better while the spread gets worse.** The weight orders the photos better whenever time carries
  difficulty. In round 3 the correlation with the truth rose +0.020 to +0.069 in every case.
- But the error does not fall, and in round 3 it rises. The truth's own choice of k is 0 in most seeds. The weight spreads
  the ratings more than it informs them.
- **The raw z mixes in an asymmetry.** Right answers are faster than misses, so against every answer's median they
  weigh more than 1 on average. That makes a right answer's step larger than a miss's whatever the photo.
  - In round 1 the log-loss chose k > 0 even with uninformative times, and an exploratory check with right answers as
    fast as misses removed it.
  - The net z removes the asymmetry: in round 2 the log-loss chose k 0 with uninformative times.
- **The real log's signature needs the knowledge-gap term.**
  - Without it (round 2) the planted world could not produce the real log's gain: with rho25 the log-loss chose k 0.
  - With it (round 3) the log-loss gain at k 1.5 is −0.64 to −1.10 × 10⁻³ in every case, matching the real log's −1.03.
  - So a log-loss gain on the real log is expected from time tracking the knowledge gap. It does not show that the
    ratings get closer to the truth.
- **Every app-world check put the beginner's first Open Water later**: +38, +20 and +60 answers. These are noisy, from one
  pair of rating sets each.

**What a future variant must do:**
- Keep the ratings' spread in check. The weight's mean must stay at 1 for right answers (the net z does that), and its
  extra variance must be paid for, for instance with a smaller k or by also damping the step.
- Pass the same primary, in the same rounds, with the gap term on (`--gap -0.22`).
- Wait for more players, and more varied ones. The real-log figures come from 14 coral players, a few of them with most
  of the answers.

**Options (2) A and B** (the time intensity in `photoDiff`'s prior, Pierre's first choice of Q315) were measured once on
the real log, not clearly, and never built or simulated. They are kept for the same re-test.

**When to come back:**
- the corals have about 20 timed players and about 5,000 timed answers ("Response time: genus and photo" sized it);
- the real-log replay is run again with both forms of option (1) and options (2) A/B under the same declared protocol;
- only a variant clear there goes into level 2, starting from the rated world's sheet mode with `--gap`.
ROADMAP "Time in the photo rating".

## Multifactor analyses (admin Analyses, 2026-11-04)

Pierre, 2026-11-04: multifactor reports of the answer log, refitted at every round thousand of answers (the first 1000, 2000, 3000, …: the milestones, Pierre 2026-11-05), in the admin (ARCHITECTURE.md "Analyses"; code `analysis.js`, tests `tests/analysis*.test.js`). They measure; they change nothing in the app. Methods, shared by every analysis:

- **Crossed random effects.** Player, genus and photo (a question's photos share its photo effect, weight 1/m each), fitted by alternating updates: each level's shrunk effect given the rest (a majorise-minimise step, exact when a row has one level), then the fixed effects, with EM updates of the variance components from the posterior second moments (REML-like shrinkage, without REML's exact determinant term). Gaussian for log response time (`lmm`); logistic with each question's guess rate, P = g + (1 − g) sig(eta), for right / wrong (`glmm`, penalised quasi-likelihood, Fisher scoring), g as the app's (`core.js` `guessOf`: 1/k, ½ for a duel, 0 typed).
- **Intervals.** 95%: the model's own (Wald, from the fixed effects' covariance marginal over the random effects, the inverse of the Schur complement of the joint precision: an effect that is constant within a player, such as a player's habit, gets the players' spread, not the precision of their many answers; Codex review #441) and, from 6 players, a cluster bootstrap over players, whichever is wider. Draws (Pierre, 2026-11-05: at least 999): **999** for the latest milestone in the Action (the percentiles of the draws), **199** for the earlier milestones, newest first, while their answers add up to 60,000, none beyond (the model's own interval only), so that a full recompute stays inside the Action's 2 hours as the log grows (`report`); **Recompute here** in the browser: 199 draws read as a normal interval, the estimate ± 1.96 times the draws' standard deviation, never beyond the draws' range (`boot`, `BSE`: some 200 draws pin a standard error, percentiles need about 1,000, Efron & Tibshirani 1993), earlier milestones not reused from the stored report with the model's own interval only. Seeded: the same answers give the same intervals. Each bootstrap refit starts from the full fit of the same model (`WARM`: the same fit in fewer steps); a draw with no answer moving a feature gives no value for it (`drawn`), never the full fit's or 0. Few players = rough intervals, said by the verdicts.
- **Verdicts** (`verdictOf`, then `correct` over the whole milestone), per effect: *Clear* (after the multiple-testing correction below: its adjusted p at most 5%, so its 95% interval excludes 0, or the app's value for a guess rate, with room to spare); *Within the margin of error* (it includes it and lies within the smallest effect that would matter: ±0.1 log time ≈ 10%, ±0.25 logit, ±5 points, ±0.1 logit for slopes); *Not enough data yet* with the answers needed for an interval as narrow as the current estimate (or that smallest effect), n × (half-width / target)², rounded up; after the correction, the answers for either verdict, whichever comes first: its interval at the level the correction asks of it leaving 0 out, or its 95% interval inside the margin (so it never says it needs fewer answers than it has): a rough power estimate that assumes the interval shrinks as 1/√n (it shrinks slower when the players are few).
- **Multiple testing** (Pierre, 2026-11-05, Q69; the statistical methods study of 2026-11-05, `docs/reviews/2026-11-05-stats-methods-study.md` §2, §5.3, §6.3; `analysis.js` `PRIMARY`, `pOf`, `holm`, `bh`, `correct`; `AV` 4). A milestone holds about 40 effects, each at 95%: about 2 would read clear by chance alone, and the chance that at least one does is about 85%. So each analysis declares the 1-2 **primary** effects it exists to answer, chosen before looking at any result (below), 14 in all, tested together under **Holm** (family-wise error 5%: the chance that even one of them reads clear by chance; valid whatever the dependence between them); every other effect is **secondary, exploratory**, tested together under **Benjamini-Hochberg** (false discovery rate 5%: among the exploratory effects read clear, about 5% at most are chance, on average; valid for independent or positively dependent tests), a lead to re-test on later answers before acting on it. An effect's p-value comes from its 95% interval (the wider of the model's and the bootstrap's) read as a normal one on the side facing the null value, so p < 0.05 exactly when that interval leaves the null value out; the estimate and its 95% interval stay as they were, the verdict uses the adjusted p, and the admin shows the adjusted p only in the verdict's tooltip (rule A2: no method detail on the admin page). Each effect stores its family (`fam` 1 or 2), `p`, adjusted `pa`, and `alo` / `ahi`, its interval at the level its rank faces (it leaves the null value out exactly when the effect is clear). Typed answers in Learning curves are read as right answers against the typical question's, which has a guess floor they lack, so they are tested, and corrected, on that contrast: their null is the coefficient at which they are right as often (log 1.5 at 75% right with a ¼ guess floor), not 0 (`correct` sets `nul`). Not tested: the answers to reach 80% (a number, not a comparison) and effects with no estimate. **The primary effects**, from the questions each analysis was built for (the list above): Response time, *right answers* and *the app's expected difficulty* (is answer time a signal the app could use: does it follow knowledge and difficulty beyond right or wrong; the question of `rtsignal`); Zoom, *enlarged, against the player's own habit* (does enlarging help: its whole question); Photo factors, *poor quality* and *corallites instead of a colony* (the two rules the games' photo sets rest on: Poor photos feed the hard end, and the zoom levels go colony → corallites); Formats, *right − expected on 4 choices* and *on typed answers* (is the app's expected chance right on its main format and on the one with no guess floor; the model-light check, the most powerful of the three per format); Confusions, *corallites shown* (do close views cut mix-ups: the reason the app shows several views); Learning curves, *the learning slope* and *Again after a miss* (does practice work; does the app's Again help); Comeback, *the forgetting slope* and *comeback questions, right − expected* (do players forget over days; is the app's forgetting curve right); Sessions, *after a wrong answer* (do misses end sessions); Time and difficulty, *others answered the photo right slowly* (does the time others took on a photo say it is harder than the app thinks; Pierre, 2026-11-08). No spread (SD) is primary: an SD's estimate never reaches 0 (EM keeps it above, and its interval is not valid at that boundary), so a spread that is really 0 can read clear, with or without a correction; on a synthetic log with no photo or time spread, both still read clear (ROADMAP "Analyses: what the correction leaves open"). **Milestones are looks, not new studies**: each refits a larger copy of the same log, so a result that turns clear at one milestone is no new finding; the admin no longer marks results "new since the previous milestone" nor charts the clear results over time, and keeps the milestones as history. **Validated** (`tests/analysis-verdicts.test.js`): on 400 made-up milestones of 37 null effects on the analyses' own keys, 1.80 per milestone read clear at 95% before the correction and 0.125 after; a false clear among the primary effects in 5.25% of the milestones (Holm's 5%); a strong effect (6 standard errors), primary or exploratory, stays clear every time. On a synthetic answer log with every effect switched off but two (12 players, 5,400 answers, no bootstrap): 2 of 41 null fixed effects clear at 95% before, 1 after, no null primary effect clear, and the two real effects (the learning slope, typed answers taking longer) clear. A correction cannot remove a bias: a null effect the model gets wrong (here "one view alone", ±0.2 logit across seeds) can stay clear; the bootstrap widens such intervals.
- **Runtimes** (measured 2026-11-05 on a shared machine, one core; made-up logs of 10 players on the real photos; the Action's limit is 2 hours, `.github/workflows/analyses.yml`): 999 draws for the latest milestone cost about 1.7 minutes per 1,000 answers (5,000 answers: 8.5 minutes); a whole report from scratch at 5,000 answers (the latest at 999, the 4 earlier at 199): 10.7 minutes. Estimated: about 33 minutes at 10,000 answers, about 55 at 20,000 (the earlier milestones' draws are capped at 60,000 answers, about 20 minutes); the latest milestone alone reaches the 2 hours near 55,000 answers (ROADMAP "Analyses: what the correction leaves open"). Recompute here in Chromium at 5,000 answers (199 normal-interval draws for the latest, the earlier milestones without bootstrap): 1.9 minutes, where 999 percentile draws would take about 9; a phone is slower.
- **Validated** on synthetic answer logs whose true effects are known (`ANALYSIS.synth`, `TRUTH`): the fits give them back within the test tolerances (response time effects within 0.04-0.06 log units, photo features within 0.25 logit, learning slope within 0.15). Photo random-effect SDs come out a little low (PQL's known shrinkage), a guess rate is pinned only by the weakest answers (its interval stays wide).

The analyses:

1. **Response time**: log seconds ~ right + typed + enlarged + 2 choices + the app's expected difficulty + log position in the session + (player) + (genus) + (photo). Variance shares; genera, players, photos shrunk. Earlier measure: "Response time" (branch `rtsignal`), which found time informative beyond correctness.
2. **Zoom**: right ~ offset (the app's log-odds) + enlarged relative to the player's own habit + the habit + (player).
3. **Photo factors** (explanatory IRT, an LLTM with a photo random effect): right ~ view + quality + sharpness + source + one view alone + typed + (player) + (genus) + (photo); read as difficulty. The photos furthest from what their features predict are listed.
4. **Formats**: per format, P = c + (1 − c) sig(x + d), x the app's own log-odds: the real guess rate c against the app's fixed one, and the difficulty d the app misses.
5. **Confusions**: each wrong choice offered, picked or not ~ view shown + log(wrong choices) + (pair) + (player): views that confuse more, and how much each player differs from the pooled rates (observed / expected, with the player's own effect as an odds ratio beside it).
6. **Learning curves**: right ~ log(1 + answers on the genus) + after a miss (on the genus shown or given wrongly, as the app counts it) + Again asked after it + typed + exam + comeback + (player) + (genus) + (0 + practice | player) + (0 + practice | genus) (from `AV` 11: each player's and each genus's own learning slope around the common one, uncorrelated with its level, the practice centred on the answers' mean so each level is the level at typical practice; `lnFit`, `factor` with weights, `glmm` with the exact curvature of a slope's level; Pierre, 2026-11-04, ROADMAP "Analyses: next views", per-genus learning slopes; 2026-11-05, the profiles' learning slope); their spreads (`sd_gslope`, `sd_pslope`, read as the gain from twice as many answers either side of the common slope; exploratory, never primary as every SD); answers to reach 80% beyond guessing, overall and per genus, each genus at its own slope (0 when the start is already there; its interval from draws of the intercept and the slope together, and of the genus's own level and slope). The first-meeting card and the side-by-side comparison leave no row in the answer log: not measurable yet (ROADMAP).
7. **Comeback**: after a right answer on a genus, right ~ offset (that answer's expectation) + log(1 + days since) + (player): the forgetting slope; and the comeback questions' right − expected (the FSRS curve of "Comeback after a break").
Two views show how effects and genera relate (the multifactor visualisation study of 2026-11-05, `docs/reviews/2026-11-05-multifactor-viz-study.md`, Pierre's Q70-Q77; tested on planted structure in `tests/analysis-verdicts.test.js`):

- **Effects hard to tell apart** (`entOf`, every analysis with two effects or more from one model): the correlation of the estimates, from the fixed effects' covariance marginal over the random effects (the model's own, `cov2cor(vcov(fit))` in R; signs follow the effects as reported, so two difficulties keep their sign); the correlation of the conditions in the answers (the design matrix's columns) and each condition's variance inflation factor over every condition of the model (VIF, the diagonal of the inverse correlation matrix). Read in words past |r| = 0.6 for the estimates (read the two together: their sum is sure when r < 0, their difference when r > 0; each alone is not), 0.7 for the conditions (Dormann et al. 2013) and VIF 5. Formats: each format's guess rate against its difficulty, fitted together (`fmtFit` `cr`). With few players the Wald covariance understates the between-player part; the correlation of the bootstrap draws would include it (ROADMAP). From `AV` 13 (the study's later item for this view, "once there are 200 draws or more"), with 200 bootstrap draws or more (the latest milestone's 999), `rb`: the correlations of the effects' values over the draws, on the draws where every reported effect has one (`nb`): over the players, so it carries what the model's covariance, conditional on its random effects, leaves out; the admin reads it in place of the model's (the model's beside it in the table). `boot` keeps each draw's values from 200 draws (`ENT_B`). Tested on made-up draws (−0.894 planted, given back within 0.05; under 200 draws, the model's alone).
- **The mix-up map** (`mixMap`, in Confusions): similarity of two genera = the lower end of the 95% range of their pair's shrunk effect in the Confusions model (how much more often, at the least, they are mixed up than a typical pair, per offer: offers, not counts, which mirror the app's traps), 0 for a pair not clearly above a typical one or never offered, so chance alone makes no family; distance = 1 − similarity / the largest; average linkage (`hclust`, Lance-Williams, deterministic ties); families = the groups of two or more left when the tree is cut at 0.8 (`MIX_CUT`, `cutTree`). Each cell (shown → answered) carries its rate shrunk towards its pair's model rate by 20 offers' worth (`MIX_K`), so a direction shows only with many offers. Across: the 3 cells most mixed up between two families, 2 mix-ups at least, above a typical pair. The synthetic log plays look-alikes as mix-ups (`TRUTH.mix`: a look-alike offered is picked 4 times as often as another genus when the answer is wrong), so the demo's map has families. **Its stability** (`AV` 13, `mixStab`, `mixFams`; the study's later item: "bootstrap over players, cut only at a stable height"): in each bootstrap draw of the Confusions model, the draw's own families (the same cut); each family's best Jaccard with one of them (0 when none shares a genus), averaged over the draws; stable from 0.75 (Hennig 2007, as the player profiles' groups). The admin names the stable families as found again when the players are drawn again, the others as not stable yet; without draws (the demo) it says they are not checked yet. The cut stays at 0.8 (a stable height is read, not searched for: another cut is a choice for Pierre). Tested on the planted families (`tests/analysis-verdicts.test.js`: 3 strong families each found in all 30 draws; weak ones under 0.75).

**The Wright map** (`wrightOf`, in Learning): players and genera on the Learning model's one scale, the log-odds of recognising beyond guessing for a typical question: a player's place = the intercept + the practice slope at their own current practice (the median answers already given on the genus over their last 300 answers) + their own effect; a genus's difficulty = minus its own effect (the photos the app chose for it included). Level = about 50% beyond guessing; logit(0.8) above = the app's 80% target. Each place's likely range carries the intercept's and the slope's uncertainty with their covariance, beside the player's or genus's own effect (Codex review #620); a genus's chance is read for the typical player (median current practice, own effect 0). A snapshot of the bank's reach, not of the questions asked (the app aims near 80%, so it makes players and genera meet). **A second skill?** (`resOf`, Pierre's Q77: residuals, never a PCA of raw right / wrong answers): the genus × player table of standardised residuals after the Learning model (sum(right − P) / sqrt(sum P(1 − P) + 2) per cell, 0 when never met; players with 100 answers or more, genera met by 2 of them or more; each player's column centred), a PCA of the players' columns (genera as points, players as arrows). The first axis's share of the spread is set against the same share in 99 tables built from answer logs simulated from the fit itself (Linacre 1998, Raîche 2005; a share, as the simulated logs are not refitted). Descriptive, no verdict, outside the multiple-testing correction (a single check; making it a tested effect is a question for Pierre). Tested on a planted second skill (odd players better on odd genera, 0.8 on the log-odds: share 0.73-0.80 against at most 0.31 in the simulations; one skill: within them).

**Does it depend on …?** (interactions, `ixTest`, `AV` 10; the study's §5 item 6, and ROADMAP "Analyses: next views", confusions by view with a pair × view interaction): three interactions, each one omnibus test of its product coefficients. (1) **Enlarging × view** (`zoomIx`, in Zoom): the Zoom model plus each view's own level and its own effect of enlarging, against a colony photo (views with 30 answers and 5 enlarged or more); (2) **pair × view** (`confIx`, in Confusions): among the questions missed with choices only (`missRows`), each wrong genus offered is a chance to be the one picked, ~ view + log(choices − 1) + (pair) + (player) + the own effect of each view for the 6 pairs most offered on a colony and on another view (20 offers each); asked on every offer instead, a pair often mixed up shows a pair × view "effect" from the log-odds scale alone, since misses rise on harder views (on the synthetic log with no such effect: p = 0.001 on every offer, 0.68 on missed questions); (3) **format × practice** (`lnIx`, in Learning): the Learning model plus a two-choice level (Again, duels) and the practice slope of two-choice and typed questions apart from four choices' (formats with 100 answers or more). Each test: the Wald chi-square of the product coefficients from the model's covariance and, from 50 draws, from the cluster bootstrap's over players (199 draws at the latest milestone, 50 for the earlier ones and Recompute here: a covariance, not percentiles); the larger p of the two, as the wider interval elsewhere. **Exploratory**: each is one more test in the Benjamini-Hochberg family (`correct`, `settleIx`; not primary: Pierre's primary effects are those of Q69). Verdict: *clear* at its adjusted p; *within the margin* when every product coefficient's 95% interval (the wider) lies inside ±0.25 logit; else *not enough data yet*, with the answers that would carry it to either if the pattern held (the chi-square grows with the answers; the intervals shrink as 1/√n). Each level's prediction (a linear combination of the fixed effects with its interval from the model's covariance, plus the pair's own effect and its conditional variance) is drawn level by level. Tested in `tests/analysis-ix.test.js`: planted (enlarging −1.5 on corallites; a look-alike's pull −3 on corallites for half the genera; typed answers' slope −0.6) each comes back below 1%, with the planted level the lowest; with none, each stays above 1%. Runtime: about a sixth more at the latest milestone (estimated from 60 draws on 7,200 synthetic answers, 2026-11-09: the three tests' fits took 28 s against 38 s for everything else). Not on the fish side for (1) and (2) while its photos have one view.

**Each genus with practice** (`gcurveOf`, in Learning, `AV` 11; the study's §5 item 7): per genus, right answers by the answers already given on it (the bins of the main curve) against the model's own prediction of the same answers; its own slope (common + its own, with the common slope's variance and its own conditional variance); its chance of recognising it beyond guessing for the typical player at their current practice (as the Wright map), the genera sorted by it. **Flat**: one-sided test that its slope reaches the smallest that matters (0.1 logit per unit of log practice), corrected over the genera by Benjamini-Hochberg at 5%: a lead (two forms to teach apart?), descriptive, outside the milestone's correction. Tested (`tests/analysis-slopes.test.js`): 4 of 16 genera planted with no learning (16 players of 900 answers): their slopes the 4 lowest (each under 0.3, the others' 0.55 planted), the genus slope spread clear (0.12 or more, under 0.06 without them); a spread planted on 30 groups (SD 0.3) comes back within 0.08. The spreads share the boundary problem of every SD (ROADMAP "Analyses: what the correction leaves open" (a)): with none planted they still read clear on some seeds (players: 0.05-0.09 on two). Not flagged on that log: a flat genus needs its slope's whole likely range under 0.1, which 900 answers a player did not give (the planted ones' upper bounds 0.2-0.56).

**Can we trust this model?** (model checks, `checkOf`, `checkLmm`, `AV` 12; the study's §5 item 8, and ROADMAP "Analyses: next views", leave-one-player-out paired log-loss): for each binary model (Enlarging, What makes a photo hard, Mix-ups, Learning, After a break, Sessions), each player with 20 answers or more left out in turn (their rows weigh nothing in the fit, `HOLD`, `predictOut`, which starts from 0, not from the full fit, so a coefficient only their answers move learns nothing from them: Codex review #831; their chance is averaged over the fitted players' own effects, level and slope, as for a player drawn from them, not read at the average player: averaged over the normal of the fitted spread instead, it over-predicted the generator's own mix-ups by 2-6 points in every band, this fit's spreads and intercepts being shrunk, ROADMAP "what the correction leaves open" (e)), from 3 players: the predictions of their answers in 5 bands of equal counts against what they answered (calibration); the randomized quantile residuals (Dunn & Smyth 1996: uniform when the predictions are right) at 11 probabilities; and, for the two models built on the app's own expected chance as their offset (Enlarging, After a break: the app's chance plus their corrections), the paired log-loss of the model against the app's chance with the players as the unit (each player's mean difference, their mean, a 95% t interval on players − 1 degrees of freedom, a sign-flip p: "Real-answer replay" below). A model without that offset knows nothing of a new player's level, which the app does, so it gets no comparison (on the synthetic log the photo model lost to the app by +0.039 per answer even with the app blind to the photos). Answer time: its standardized residuals in the fit at the normal's quantiles. Descriptive, outside the multiple-testing correction, as the Wright map. Tested (`tests/analysis-checks.test.js`): on the generator's own log every band within 6 points and every residual quantile within 0.03; enlarging planted at +1.5 (which the app's expectation leaves out) predicts new players clearly better than the app (the range below 0, p < 0.01), with no effect not; a player's predictions when left out are the same whatever they answered. Runtime: one fast refit per player per model, about the cost of 12 bootstrap draws each.

**Player profiles** (`profiles`, Pierre's Q70-Q73): a description of how each player plays, never named types (from about 30 players at the earliest: Dalmaijer et al. 2022). Each player's last 300 answers (all when fewer, `PROF_N`; under 100 the row is greyed and left out of the tree, the map and the groups, `PROF_MIN`; under 20 left out, `PROF_LOW`), and from `AV` 11 an eighth behaviour, the **learning slope**: the player's own slope in the Learning model (random slopes) fitted on all the answers (`slopeOf`: a slope needs the whole range of practice; fitted on the last 300 answers alone it did not follow the planted slopes, correlation 0.03 and 0.47 on two seeds, against 0.90 and 0.98 on all the answers). Seven behaviours, each net of what the app decided (`profFeat`, which takes any set of answers so a later trajectory analysis can run it window by window): answer time (the player's own effect in the Answer time model on those answers, a fast fit), enlarging (the share enlarged minus everyone's rate for the views shown), right beyond the app's expectation (right − expected), stopping after misses (the chance to end a session after 2+ misses in a row within it minus after other answers, each shrunk towards the pooled rate by 10 answers' worth, `PROF_K`; open sessions left out), session length (median answers, log; a session cut by the window's start left out unless it is the only one), sessions a week (log, over the window, at least a week), evening play (share of answers from 17:00 Manila). The learning slope (Q72, "when fitted"): from `AV` 11, the eighth behaviour above. z-scores over the players with a profile (a behaviour every player shares reads 0, its spread taken as none under a billionth of its size: Codex review #604, the rounding of the mean read ±1 SD); Ward's tree on them; the behaviours ordered by average linkage on 1 − r; a PCA of their correlations (Jacobi, `eigSym`), each axis's sign set so its largest loading is positive. Groups: the tree cut into 2 to 5 where the average silhouette is best (`cutK`, `silhouette`); stability (Hennig 2007): each group's best Jaccard in every run with one player left out ("kept" counts the runs where every group reaches 0.75, `PROF_STAB`) and its mean over 50-200 bootstrap draws of the players (each draw re-standardised and clustered with its multiplicities, the groups compared as distinct players); stable only when every leave-one-out run keeps every group and each bootstrap mean reaches 0.75 (Codex review #604: the leave-one-out means alone hid runs that changed the groups); unknown, never "not stable", when no leave-one-out run can be grouped (3 players). Tested on two planted styles (`tests/analysis-views.test.js`).

8. **Sessions** (30 minutes without an answer ends one): Kaplan-Meier of the length (open sessions censored) and a discrete-time hazard, stop after this answer ~ wrong + 2+ misses in a row + expected difficulty + slow (against the player's usual) + log position + (player).
9. **Time and difficulty** (Pierre, 2026-11-08; `tdiff`, `tdFeat`, `AV` 9; "Response time as information on difficulty" above): the reverse of Response time and Zoom. Before each answer, the earlier answers of other players on its photo (the question's first photo): their right answers' z (log seconds minus their own median over their earlier timed answers, from the 11th; typed and enlarged answers out) and their enlarging minus their own habit so far, each the photo's mean shrunk by `TD_K` = 3 answers' worth; right ~ offset (the app's log-odds, its photo rating included) + slow + enlarged + (player), with each question's guess rate. Then the time intensity beside difficulty: log seconds ~ right + typed + enlarged + 2 choices + (player) + (genus) + (photo), and right ~ the photo's time intensity + typed + 2 choices + (player) + (genus) + (photo). The genera's and the slowest and fastest photos' time intensity beside their difficulty from the accuracy alone (a third fit, no covariate), their correlation over the photos with 3 timed answers or more and the genera with 5 (descriptive; shrinkage lowers it); right against expected by the others' speed (faster, about, slower than their usual: ±0.1). The others' features are fixed in the bootstrap (it resamples the answers' players, not the features' sources). The genus's time intensity is not tested: beside the genus's own effect it is not identified with a few dozen genera. Tested on a planted link (`TRUTH.td`: `link`, the photo's time per logit of its own difficulty; `blind`, the share of that difficulty the app's expectation misses): both effects come back, none without the link, and others' time adds nothing when the app already knows the photo. Corals only, as every analysis (the replayed subject).

## Considered and not adopted

- **First answer per photo only** (Papoušek 2014): standard for prior knowledge, where people already know the facts.
  Our players learn the corals in the app, so the first answer is the noisiest and later informed ones would be dropped.
  Tried in v17's first draft; Pierre rejected it, replaced by the experience weight and the history-aware repeats.
- **Urnings**: principled standard errors and robustness to adaptive selection; heavier to build and to run in the sheet
  script. To revisit if the photo ratings drift (the variance inflation "Keeping Elo alive" describes).
- **Coded tracks or tiers** (beginner / RA / expert modes, a fixed genus order, fixed difficulty per genus): ruled out by
  Pierre. Every threshold above is continuous or performance-driven.
- **Time between sessions** for progress, mastery or ability (spaced-repetition days, decay, a "refresh"): ruled out
  (rule L1). Two exceptions: time to plan the questions after a break (the comeback above), and photo memory (Pierre,
  2026-11-09, Q317: the time since a photo was last shown may set how much a new answer on it is expected to owe to
  memory of that photo, never a decay of progress, mastery or ability, never a delay or gate; "Photo memory"). The seconds
  taken to answer are not time between sessions (Pierre, 2026-11-04, rewording rule L1): they are evidence about that
  answer, and since rules version 4 they weigh how much a right answer moves the ability ("Response time"); never a
  decay, never a penalty for being slow on its own.
- **Answer time compared within the same question format** (2026-11-04, not adopted). A Duel-tab run (P1) where the
  time weight raised two genera's ability fast (fast 2-choice answers against a 4 s overall median) prompted it. On the
  real log (1,580 answers, 10 players, `tools/abilityeval.js`, paired next-answer log-loss against no time weight,
  ×10⁻³ ± SE): the current pooled rule −2.59 ± 0.98; split 2-choice / 3+-choice −1.40 ± 0.67 (with a fallback to the
  pooled median −1.76 ± 0.70); split Duel tab / rest −1.44 ± 0.55; weight capped at 1 −1.22 ± 1.04; no weight on
  2-choice questions −0.71 ± 0.36. Against the current rule every variant is worse (+0.8 to +1.9). In the quiz a
  2-choice question is not answered faster than a 4-choice one (4 of 6 players slower); only the Duel tab is fast. No
  variant predicted the run's collapse (all expected 0.76-0.80 on the photos given). Kept: the pooled median (`RTIME`,
  `rtWeight`).

## Real-answer replay (`tools/abilityeval.js`): judging a paired difference (2026-11-05)

The replay's last table compares each rule with the first one on the same answers: the paired difference of next-answer
log-loss (negative: the rule predicts better). The answers cluster in players (about 10 players, about 150 answers
each), and a player's answers are correlated (same person, same habits, a learning path over time), so a standard error
that treats the answers as independent is too narrow: the stats study (`docs/reviews/2026-11-05-stats-methods-study.md`,
PR #580, §0 point 4 and §5.2) estimates about 1.6 times too narrow with even a tiny correlation within a player (its
estimate; the correlation is unknown). **Players are the unit of inference** since 2026-11-05:

- each player's own mean difference d_p over their answers in the row, then the plain mean of the d_p (each player one
  vote: a player with 400 answers weighs as much as one with 20);
- a 95% t interval on players − 1 degrees of freedom (the standard error of the d_p over the players);
- the two-sided p of a sign-flip test over the players (each d_p's sign flipped at random; exact, every pattern, up to 16
  players, else 9999 draws from a fixed seed, so a run gives the same p every time). With 10 players the smallest
  possible p is 2/1024 ≈ 0.002; with 5 it is 2/32 = 0.0625, so 5 players can never give p < 0.05.

The 'all' row is the primary measure; the group rows (number of choices, level bands, response time, after a false
alarm) are exploratory: many rows, no correction for their number. The former figure per answer (the mean over the
answers, which is the answer-weighted mean of the d_p, ± a standard error that treats the answers as independent) stays
as a second, descriptive table, so the two can be compared; it is not a test. A percentile bootstrap over players was not
chosen for the interval: with about ten players it under-covers (Cameron, Gelbach & Miller 2008), and the wild cluster
bootstrap of a mean with Rademacher weights is the sign-flip test above. `tests/ability.test.js` checks it on a made-up
log with one dominant player (400 answers better with the second rule, five small players worse): per answer the
interval is [−0.0148, −0.0120] (a clear gain), with the players as the unit [−0.008, +0.020], sign-flip p 0.34.

Figures recorded in this file before 2026-11-05 as "paired log-loss difference per answer ± its standard error" (and
"× 10⁻³ ± SE") are the per-answer figure: read their intervals as too narrow, and "n standard errors" as fewer.

## Validating a learning change (rule L11; validated by Pierre on 2026-11-08, #735)

Pierre, 2026-11-08: the engines and the simulations moved a lot these last days, so the way a change is validated must
still fit what was built, and follow his suggestion: a fully rated world where photos, players and every unit (coral
genera; fish families, genera, species) have continuous Elo difficulties or abilities drawn from stated distributions,
with the engine running on them. What the check was until now, and where it no longer fits (each point checked in the
code or the docs unless marked *inferred*):

- **One world, the real data's.** `tools/learnsim.js`'s learner reads each photo's difficulty from the app's own
  estimate (`photoDiff`; for the fish, the judged-ease prior) unless `--truth` is given, so a change to the estimate
  changes the world too ("Limits" below). No unit difficulty unless `--stats` carries the sheet's offsets; no player
  ability spread (each profile is one fixed player; the spread is the draws'). `--truth gen` gives photos a normal spread
  around their genus, the corals only (*inferred* from its code: it reads the coral views).
- **Profiles built for the corals.** The four profiles know every 5th unit in data order (`i % 5 < m`); `--subject fish`
  plays the same four on the fish units. No casual diver (common names only), no IMR RA who knows the IMR families, no
  lecture RA for fish, no names choice.
- **Learners whose teaching ignores the photo.** The item learner gains `rate × (1 − know)` after a right answer and
  1.5 times that after a miss (`MISS`; the genus wrongly picked 0.5 times, `PICKED`), whatever the photo: a photo
  diet changes what it learns only through which units are asked and how often it misses, so easier photos, fewer
  misses, teach it a little less, never because the photo itself was clearer. The scratch rated world of 2026-11-08
  ("Fish: the global score, built") learns by the number of answers alone, so there only which units are asked
  counts.
- **Measures of the old yardsticks.** `knowSlate` (success on an average photo among choices), `progGap` (bar − that
  know: the judge's D\* replaced it for the bar), `prog` (the fish % as the families' mean, not the global score of
  Q242), units met. Nothing on the per-unit levels (Open Water, Advanced), the global score and its components, plateaus,
  the hard-photo share before Open Water (a run field since #729 only) or the photo exposure that rates the photos.
- **A horizon of the families only.** 300 questions; a fish run takes about 1 minute per worker (checked on 2026-11-08:
  30 runs of 300 questions in 867 s on 2 workers), so the tree (genera from a family's Open Water or Advanced, species,
  circle 3 at 55% of the circle-1 Entries) and the score's later shape (10,000-100,000 answers) are out of its reach.
  `tools/fishscore.js` kept the formula of 2026-11-04 on the old moving-average bar (retired since: the rated world gives
  the score's shape on today's engine).
- **Margins never set.** Rule L11 asks for guardrail margins "set once in LEARNING.md"; PRs have used the statistics
  study's examples (true knowledge 0.02, genera met 2, §3.2 "for example"). A pacing measure the change is meant to move
  then reads as a breach (#729: units met at 300, expert −2.8).

**The two worlds.**

| | The app world | The rated world |
| --- | --- | --- |
| Tool | `node tools/learnsim.js [--subject fish]`, the real app in Chromium | `node tools/learnsim.js --world rated [--subject fish]` (`tools/ratedworld.js`) |
| Photos | the real pools, the app's estimate or `--truth` | d = μ(unit) + ε, ε ~ N(0, 0.46²) (the coral photo spread of the Analyses tab); heavy tails: 15% of the photos +1.5, or a scaled t with 3 degrees of freedom; judged ease e = round(3 − (ε + N(0, 0.35²)) / 0.5) on 1-5 |
| Units | the sheet's offsets with `--stats`, else 0 | fish: family μ ~ N(0, 0.37²), +0.5 in a declared look-alike group; genus and species μ ~ parent + N(0, 0.3²), +0.3 with siblings; corals: genus μ ~ N(0, σ²), σ the spread of the sheet's `gd` (to measure) |
| Players | one fixed player per profile | an ability offset π ~ N(0, 0.5²) per run |
| The app's estimates | its own | told the truth ("fully rated"), or its own Elo |
| Learner | item (default), field, exemplar | by the number of answers, and one whose gain depends on the answer and its feedback (as the item learner's) |
| Horizon | 300 questions (600 when the change acts later) | 3,000 answers at level 2 (10,000 when it touches genera, species or the score's shape), 30,000 at level 3 |
| Speed (checked 2026-11-08) | about 1 minute per 300-question fish run per worker | about 4 s per 300 answers and 80-160 s per 3,000 per worker on a loaded machine (the app's own `photoSet` on pools of up to 1,600 photos); the scratch harness, which did not run it, took under a minute for 4 × 20 × 2 × 3,000 |

The rated world mimics `model.js` (the aim, the start's lean, the Gaussian photo choice, typed questions, `drawW`,
`OPEN.K`, a card every 2 answers, at most 3 openings in 15, `RARE`) and runs the real `core.js` (`domStep`,
`treeScore`); its learnsim mode loads `model.js` `photoSet` in Node as `tests/rareease.js` does, so the draw is the
app's own. It is anchored on the app world where both reach: at 1,000 fish answers the fish % and the right rate within
a few points (2026-11-08: 41% and 37% against 40% and 28%; 75-81% right against 77-86%).

**The rated world, built** (`tools/ratedworld.js`, `--world rated`; the distributions in its `RATED`, the one place they
are stated). The fish units are built as the app builds them (`core.js` `fishGen`, `fishPhotos`, `app.js` `fishGenera`
cut out as `tests/rareease.js` cuts `model.js`): 65 families in three circles, the 130 scientific genera, every game photo.
A seed draws its world: each unit's μ and each photo file's ε (above), the photo's judged ease from ε, the player's π;
the same seed gives the same world, so two versions of the app compare on it. `model.js` runs whole in a Node vm, with
the app's globals it reads written around it (the units, the photos, `pool`, the circles' gates, the scientific
genera's set, an in-memory store), and `core.js` `scoreAnswer` scores each answer as the game does (the Elo, the
domain-score bar, the global level, rule L2), so the aim, the start's lean, `photoSet` (Gaussian choice, `RARE`, the
floor), typed questions, `drawW`, `shaky`, `openChance`, `openPace`, `openRight`, `openPick`, the opening hold and the
exam are the app's own. Only the planner is written there, as `quiz.js` `planPhoto` reads: the first cards, a card when
the path allows one, a unit opened on a card asked once ready, the target by `nextTarget`, the choices by
`distractors` with the traps `trapsFor` asks (the plausible choices `plausibleK` count while the traps are fewer than 2,
every choice after), the photo aimed lower by the opening hold's ease and the player's own mix-ups (`holdEase`,
`confTerm`), the last two observations held back (`s.ro`), the exam questions by `examSet` and `examTyped`. Not in it: the Again after a miss, the
duels slipped into the quiz, the comeback and breaks, the surprise cards. `--app truth`: `photoDiff` gives each photo's
true difficulty and the unit offsets make `genusDiff` give each unit's μ; `--app own`: the judged-ease prior alone (no
photo statistics, as the fish today); `--app sheet` (2026-11-09, `runPop`; the corals only: a fish photo is shared by a family's and a genus's questions,
with two true difficulties): the sheet's photo Elo simulated. The profiles' players, one each, play the seed's world in turn; their answers are logged with simulated seconds (`RT`:
log t = log 6.5 + the photos' time intensity β − the player's speed τ − 0.4 if right + log 1.5 if typed + `--gap` × the
learner's true logit + noise; `--times` sets β: `rho25`, `rho0`, `views`, `fast`, as "Q315 option 1: what three rounds
showed" describes); every `--every` rounds `core.js` `eloOf`, `genusOffsetsOf` and `photoMemOf` are replayed on the log
and served to every player's app (`PSTAT`, `PGD`, `PMEM`), and the file's `pop` holds, per seed, the served ratings
against the truth at each checkpoint (`rateErr`, the centred root mean square error; weighed by answers; the
correlation; the genus offsets' `gdErr`), which learncmp reads as population measures, one value per seed (an exact
sign-flip over the seeds). `--dist normal|tail|t3`. Circle 3 stays
closed unless `--beyond yes`, as in the app world (its offer left unanswered). The scientific names' offer, once a family
is at Advanced, is accepted, except by the casual diver. The learner: the profile's know per unit (`tools/learnprof.js`,
as the app world), the run's π, recognition sig(logit know + π − d − 0.5) on the true difficulty d of the photo shown,
else a guess among the choices (typed: "I don't know" half the time); it learns by the number of answers (rate × (1 −
know) per answer on the unit and per card). D\*: its mean chance on each of the unit's game photos alone. Rows hold what
learncmp reads (`dStar`, `knowSlate`, `met`, `right`, `prog`, `f`, `kinds`, `score`, `plateau`; per run `owAt`, `advAt`,
`c3`, `expo`, `preOW`), at the guardrails' checkpoints (100, 300, 1,000, 3,000, 10,000, 30,000) up to the horizon.

**The corals** (2026-11-08, step 5): the coral units as the app builds them (`core.js` `applyCuration` and `applySlots`,
`app.js` `applyForms` and `imrFormsOf` cut out the same way; the extra genera, Millepora and the bonus genera, too): the
40 genera of the slate and the bonus genera, their game photos in their three views (a question shows those
`photoSet` picks; one view alone is the single-view case). Each genus's μ ~ N(0, `RATED.CORAL_GD`²), **0.286: the SD of the
sheet's genus offsets `gd` as #637 measured them with the photos rated against the genus ability (Q136); 0.370 with
today's rating against the level, the sensitivity variant (`--coralsd 0.37`)**; no photo has a
judged ease, so the share under ease 4 is not measured there. The bonus genera are offered once every slate genus is
met and accepted, as in the app world; there is no global score, so the shown score is the units' mean (`progPct`).
**The learners**: `--learner count` (the default), by the number of answers, as above; `--learner item`, whose gain
depends on the answer and its feedback, as learnsim's item learner: a right answer teaches rate × (1 − know), a miss
1.5 times that (`ITEM.MISS`), the unit wrongly given 0.5 times (`ITEM.PICKED`), a card as one right answer.

```
node tools/learnsim.js --world rated --subject fish --seeds 10 --questions 3000 --out before.json [--dist tail] [--app own]
node tools/learncmp.js before.json after.json --primary score@3000:up
```

**The anchor** (2026-11-08, fish, at 1,000 answers; the rated world told the truth, normal photos, 5 seeds, π −1.26 to
0.25; the app world on main with the same profiles, 2 seeds, `--choice auto`; #787, #789):

| Beginner / lecture RA | Rated, count learner | Rated, item learner | App world (item learner) |
|---|---|---|---|
| Score shown | 31.6% / 36.6% | 33.6% / 38.2% | 37.0% / 41.0% |
| Families at Open Water | 17.8 / 24.6 | 23.0 / 28.0 | 32 / 32 (every circle-1 and circle-2 family) |
| Families at Advanced | 2.6 / 5.4 | 4.2 / 7.2 | 14 / 16 |
| Right %, answers 301-1,000 | 77% / 77% | 79% / 81% | 93-95% |

The score agrees within 3-5 points, on the low side; the levels and the right rate lag in the rated world (its learner has
no photo memory, the world adds the units' μ and the player's π, a guess is uniform among the choices; the causes not
measured one by one). So the rated world compares two arms within itself, as the protocol pairs them; its levels and
right rates are not read against the app world's.

**The score's shape** (2026-11-08, the rated world, fish, told the truth, normal photos, count learner, `--beyond yes`, 2
seeds, π −1.26 and 0.05; the shown %, families and genera at Advanced):

| Answers | Lecture RA (both names) | Casual diver (common names only) |
|---|---|---|
| 100 | 10.5% | 9.0% |
| 300 | 21.0% | 18.5% |
| 1,000 | 35.5% (2 families) | 31.5% (2.5 families) |
| 3,000 | 48.5% (31 families) | 46.5% (40.5 families) |
| 10,000 | 63.0% (60.5 families, 53.5 genera) | 50.0% (64.5 families) |

Fast at the start, slower after, as Q242 asked. The casual diver stops at 50%, the families' share once every family is
mastered: with no species or common-name unit yet, a player who declines the scientific names has no credit left to
earn, so the last 6,000 of its 10,000 answers are one plateau (6,277 answers). The lecture RA's genera carry it to 63%.
This replaces `tools/fishscore.js` (the formula of 2026-11-04 on the old moving-average bar).

**Profiles** (the same list for both subjects where it applies; in the rated world each run also draws π). The two IMR
levels are those used so far (learnsim's `lectureRA` and `strongRA`, the first-launch answer "IMR course", the
re-simulation's IMR RA):

| Profile | Who | Corals | Fish |
| --- | --- | --- | --- |
| Beginner | knows nothing of the subject | every genus at 2% | every family at the floor; both names |
| Casual diver | a diver who knows the common fish by sight, wants their common names | - | the common families a little; common names only |
| Lecture RA | an RA who has just had the IMR lecture: knows the course's names and groups, has practised little | the lecture's genera at 55%, the others 10% | the IMR families half known; both names; the IMR genera from Open Water (#720) |
| Strong RA | an RA with practice behind the lecture | 3 genera in 5 at 85%, the others 10% | the IMR families and their genera well known; both names |
| Expert | knows nearly everything | every genus at 93% | families and genera well known, species partly; both names |

Built in `tools/learnprof.js` (one list, loaded by learnsim in Node and in the page; the rated world reads the same list),
never by data order. The default list of a subject is every profile with a part for it (`--profiles` picks others;
`strongBack` and `spotty` stay by name). Corals: the lecture RA knows the 34 genera numbered on the IMR slate at 0.55;
the strong RA the IMR lecture groups in the course's order until 60% of the slate is covered (groups 1 to 7, 26
genera with their starred look-alikes) at 0.85; the others 0.1. Fish: the lecture RA knows the circle-1 families at
0.5 and their IMR genera too (`imrg`); the strong RA the circle-1 families and every genus of theirs at 0.85; the others
0.1; the expert every family and genus at 0.93; the beginner everything at 0.02; the casual diver, at 0.3, the most
common families near Dauin (their weights in the global score's tree) until they carry half of the weight, the rest at
0.02, and declines the scientific names (Not now on the set's offer). First-launch answer with `--choice auto`: the
casual diver "new". Learning rate as before (0.12; the expert 0.05).

**Measures** every run reports (the guardrails among them in the table below):

- per-unit knowledge: the judge's D\* (one photo alone, no choices, over the unit's photo distribution), by kind of unit
  (families, genera, species by common and by scientific name), and the bar against it, E = bar − D\*;
- the global score as shown and its components (`core.js` `treeScore`: Entries, Genera, Common names, Scientific
  names, credit; by circle), at each checkpoint;
- the levels: the answers to the first unit at Open Water, units at Open Water and at Advanced by kind at each
  checkpoint, the answer at which circle 3 opens;
- plateaus: the longest stretch of answers without one more point of the shown score;
- the photos: the share under ease 4 among the questions on units under Open Water, and the photo exposure that rates
  them (answers per photo, answers on photos under ease 4);
- right %, the Elo error against D\*, units met, `open/15`.

**Guardrails and margins** (Pierre's "smallest change that matters", in each measure's units; one-sided 90% bound of the
paired difference on the side of harm; validated with #735):

| Guardrail | Checkpoints | Margin | Why this margin |
| --- | --- | --- | --- |
| True knowledge (D\*, or `knowSlate` in the app world) | 300 and 600 questions; 1,000 and 3,000 answers | −0.02 | 2 photos in 100 named less well: the statistics study's scale, and below what a player can feel |
| E = bar − D\*, the over-claim side | the same | +0.03 | the bar must not promise more than the player can do; 3 points of a bar is about the smallest step a player reads |
| The global score as shown | 1,000 and 3,000 answers (rated world) | −1 point | the % is shown rounded to the point: one point is the smallest change a player sees |
| Answers to the first unit at Open Water | the run | +20% or +10 answers, the larger | the first level is the hook; a wait a fifth longer is felt, 10 answers is a short session's worth |
| Units at Open Water | 300 questions; 1,000 answers | −2 units or −5%, the larger | two families or genera fewer is what a player sees on My progress; 5% scales it to a large set |
| Longest plateau of the shown score | the run | +20% | Pierre's "fast at the start, slow after", without a flat stretch a fifth longer |
| Share under ease 4 before Open Water | questions 1-300; answers 1-1,000 | +0.05 | half of the 0.1 Pierre set (Q252): a change must not undo half of it unnoticed |
| Units met | 100 and 300 questions | −2 units or −5%, the larger (corals: −2 genera, as before) | the pace of new units, as the CI test reads it; two units is a card or two a session |

None comes from the seeds' spread, which only sizes the seeds. A change meant to move one of them declares that cost
and its accepted bound before running (rule L11).

**Levels and runtimes** (rule L11: the PR declares the level, the integrator checks it):

| Level | App world | Rated world | Time (checked 2026-11-08 unless marked) |
| --- | --- | --- | --- |
| 0 | - | - | the CI |
| 1 | the subject touched, its profiles × 5 seeds × 300 questions | - | corals about 2 minutes on 4 cores; fish about 5 minutes per arm (*inferred*) |
| 2 | as level 1 | 10 seeds per profile (20 if a result is near a margin) × 3,000 answers (10,000 when the change reaches genera, species or the score's shape), normal photos and one heavy-tailed variant | the rated world under a minute |
| 3 | 30-40 seeds, sized from the spread seen | 40 seeds × 30,000 answers, both distributions | fish app world about an hour for both arms on 2 workers, so a manual GitHub Action; rated world about half an hour on 4 cores (*inferred* from a 10,000-answer run) |

A large expected effect (several times its margin) is read at the level's fewest seeds; more seeds only when a result is
near a margin. Neither world belongs in the hourly analyses Action (its 2 hours serve the real log).

**Commands.** Each arm runs on the same seeds, then `tools/learncmp.js` pairs the two files and judges them (offline,
under a second; `--list` prints its measures and guardrails):

```
node tools/learnsim.js --subject fish --out before.json          # on main; the change's branch: --out after.json
node tools/learncmp.js before.json after.json --primary hard@300:down [--cost met@100:-3] [--looks 2] [--json r.json]
```

It pairs the runs by (profile, seed) and prints, ready for the PR: the primary (`MEASURE@CHECKPOINT:up|down`, declared
before running), the stratified sign-flip pooled over the profiles (each pair's difference over its profile's root mean
square difference, a scale a sign flip leaves unchanged so the test stays exact; T the sum; two-sided p, exact up to 20
pairs, else 100,000 draws from seed 1, as #729 read it), clear when p ≤ 0.05 / looks and T goes the declared way, and
only then each profile's paired t under Holm; then every guardrail of the table above at the checkpoints both files
reach, per profile: before → after, the paired difference and its one-sided bound at 1 − 0.10 / looks on the side of
harm (paired t), held, unclear or breached, and the before/after correlation r in `--json`. A guardrail is judged against
its margin ("the larger" against the before mean of that profile; the corals' units met against 2 genera), or against
the bound a `--cost` declares. Settings that differ between the files are printed, runs in one file only are left out.
A guardrail with no valid pair (the share under ease 4 on the corals, whose photos have no judged ease) is listed as not
measured, never held.

What learnsim measures for it (each run's rows at the checkpoints, `tools/learnsim.js` header): `kinds`, per kind of
unit (the subject's rank for its slate, `rankOf` for a set's units such as the fish scientific genera, the corals' bonus
genera apart) the units, those met, at Open Water and at Advanced, D\* and E = bar − D\* over those met; `score`, the
shown score (`headPct`) and, for the fish, its components (`treeScore`: entries, genera, common, scientific, S, credit,
raw, by circle); `plateau`, the longest stretch so far without a new high of the shown score; per run `owAt` and `advAt`
(the answer at which each unit first reached each level) and `c3` (circle 3 offered, met); with `expo` and `preOW`, the
photo exposure. learncmp's measures (`--list`): `know`, `over`, `met`, `hard`, `score`, `entries`, `credit`, `firstOW`
(the first unit at Open Water, the corals' bonus genera left out; a run where none got there drops its pair), `unitsOW`,
`unitsAdv` (every kind but the bonus genera), `plateau`, `c3`, `hardAns` (answers on photos under ease 4, any level),
`perPhoto` (answers per photo shown), `genShare` (the share of answers on the fish scientific genera, a fish run only: Q208, 2026-11-09), `right`, `prog`, `thErr`. The species and name units of the fish tree do not
exist yet, so their kinds are empty until they do.

**On a GitHub runner** (tier 2 and level 3, too long for the shared machine): Actions › "Learning check (tier 2)" › Run
workflow (`.github/workflows/learncheck.yml`, manual dispatch only), with the version with the change (`after`: its
branch), the one to compare it with (`before`, `main` by default), the subject, the world (`both`, `app` or `rated`; the
rated world from the version that has it, ROADMAP "Validation tools", step 4), the seeds, the questions (app world) and
answers (rated world), the primary declared before running (`hard@300:down`, empty for guardrails only) and the world it is read in when both run
(`primary_world`; the other world reports its guardrails), the looks and
any other learnsim option (`--profiles beginner,expert --dist tail`). It runs learnsim on both versions with the same
seeds (4 workers), then `tools/learncmp.js` of the version with the change, and puts its report in the run's summary;
it commits nothing and keeps no artifact. With `gh`: `gh workflow run learncheck.yml -f after=<branch> -f subject=fish
-f primary=hard@300:down`. Inputs are checked against narrow patterns before any command reads them.

**First run: the cap under ease 4 before Open Water** (#729, `RARE.SHARE` 0.1; level 2: it changes the fish draw for every
unit under Open Water; exploratory, the protocol not yet
approved; the rated world by the scratch harness with the cap mimicked as `rareCap` does, 4 profiles × 20 seeds × 3,000
answers, told the truth; the app world re-read from #729's own 5-seed runs, 5 seeds × 300 questions). Paired
difference, in brackets its one-sided 90% bound on the side of harm:

| Measure | Rated world, normal photos | Rated world, heavy tails (15% +1.5) | App world (#729's runs) |
| --- | --- | --- | --- |
| **Under ease 4 before Open Water** (primary) | 27-51% → 9-10%, 80 of 80 pairs down | 30-53% → 9-10%, 80 of 80 | 20-40% → 9-10%, 19 of 20 |
| Answers to the first family at Open Water | −2.1 to −0.6 (+8.0 worst) | −10.7 to +9.9 (+17.9 worst, IMR RA) | −6.0 pooled (−0.5) |
| Families at Open Water, 1,000 answers / 300 questions | −0.6 to +0.5 (−2.1 worst, expert) | −1.0 to +0.9 (−2.6, expert) | +0.05 pooled (−0.49) |
| Global score shown, 3,000 answers | −0.2 to +0.4 points (−0.6) | −0.4 to +0.3 (−0.7) | not measured (no genus bars in the runs) |
| Circle-1 Entries component, 1,000 answers / 300 questions | +0.002 to +0.007 | −0.009 to +0.010 | **−0.041 pooled (−0.063)** |
| True knowledge D\* of the families, 3,000 answers | −0.010 to 0 (−0.022) | −0.008 to +0.002 (−0.016) | (knowledge at 300: unclear, #729) |
| Longest plateau of the shown score | −13 to +33 answers (+53, about +16%) | −18 to +25 (+48) | - |
| Answers on photos under ease 4, answers 1-3,000 | −39% to −46% | −37% to −47% | - |

What it says: the primary moves as intended in every world and profile; the levels, the score and the plateaus hold
within the proposed margins, except the expert's families at Open Water at 1,000 answers with heavy tails (bound −2.6
against −2.1 for 5% of 42: unclear) and the IMR RA's wait for the first Open Water with heavy tails (bound +17.9 answers
against +12: unclear); in the app world the families' bars run lower (a right answer on an easier photo proves less to
the domain-score bar), about −0.04 of the Entries component at 300 questions. And one thing the families-only check
could not see: in the tree, every unit opened later (a genus, a species, a name) starts under Open Water, so 50-54% of
a player's first 10,000 answers are on such units (rated world, 10 seeds, the IMR RA and the casual diver), and the cap
cuts the answers on photos under ease 4 by about 30% over those 10,000 (IMR RA 5,582 → 3,904), not only in the first 300
questions: the rating of the hard photos (Q252) slows for as long as the tree keeps opening units. In the rated world
the learner learns by the number of answers, so its unchanged knowledge says nothing about whether easier photos teach less.

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

Known limits: with little real data, the genus difficulty is mostly the declared look-alikes (and the photo sets until
2026-11-03; since then the genus offsets of the sheet's photo Elo, v31), so "easiest first" is weak until answers come
in. Learners are still rated cautiously (abilities around −0.5 at 80-90% right in the
simulation); recalibrate `ELO` and `OPEN` once a few RA cohorts have played.

### Learning-outcome simulation (`tools/learnsim.js`)

The independent review's first point (docs/reviews/2026-11-02-learning-algorithm-review.md, §3-§4): the profiles test
above measures pacing (genera met, traps, genera ready for their exam) on one seed, not learning. `tools/learnsim.js`
drives the same real quiz (the app's draw, photos, traps, duels, Again, exam, Elo, knowledge model and progress, all
untouched; only the player is simulated) and measures what the simulated players really learn, and how far the app's
estimates are from that truth, as a mean ± sd over many seeds. Not in CI (minutes; numbers for reading).
How a comparison is read (the primary measure declared in advance, an exact stratified sign-flip test pooled over the
profiles, Holm, guardrail margins, tier 2's Dunnett / TOST and fresh seeds): docs/rules/learning.md, rule L11, and
docs/reviews/2026-11-05-stats-methods-study.md.

- **Run**: `node tools/learnsim.js [--seeds 5] [--questions 300] [--profiles beginner,lectureRA,strongRA,expert]
  [--workers 4] [--out file.json] [--stats stats.json] [--met Acropora,Porites,...] [--mem 0,0.4,1.5,2]
  [--openall N] [--back keep|one] [--rt off] [--rtapp off] [--rtlog log.json] [--choice new|imr|know|auto] [--fallback keep|accept] [--vars JSON]
  [--learner item|field] [--tau 0.5] [--custom 8] [--drill 200]` (the learner and the Custom-N scenario: "Field learner and
  the Custom-8 scenario" below; the
  first-launch answer, its fallback card and, for calibration only, other values of its variables: "The first-launch
  question"; each run's first 80 answers are kept as a trace for `tools/fallbackeval.js`). Each run (profile × seed) gets a fresh browser context; seeds
  are 1..N, the app's `Math.random` and the learner's own generator both seeded from it, so a run is reproducible and
  the same seeds before and after a change give paired comparisons. `--stats` loads a `?stats=1` answer of the sync
  sheet as the photo ratings (`--stats live` reads it at start with `av=learnsim`; a file fetched by hand needs an `av`
  too, `curl "<SYNC_URL>?stats=1&av=tool"`, or the sheet logs the read as an old app) (default: none, every photo's difficulty 0, as in CI; Pierre's Easy/Medium/Hard sets until
  2026-11-03; its `mem`, sheet v26, the app's photo memory offsets; its `gd` and `v`, sheet v31, the genus offsets).
  `--truth truth.json` (2026-11-03) gives the learner each photo's true difficulty (`{photos: {file: d}, gd: {genus:
  d}}`), independent of the app's estimate; without it the learner takes the app's own `photoDiff`, so a change to the
  app's photo difficulty would change the learner's world too. `--out` writes every run and
  the summary as JSON. 30 seeds × 4 profiles × 300 questions: about 9 minutes on 4 cores (with the question planner running between answers, as in the app: Codex review #365).
- **Long runs** (2026-11-08, ROADMAP "learnsim: long runs crash"): a run is one synchronous `page.evaluate`, so the
  page's event loop never turns until it ends. Every `localStorage` write goes through the browser, and its traffic back
  queued in the renderer until the run ended; the app writes its answer log twice an answer (`sync.js` `LOG0` and `ANONQ`,
  up to 2,000 answers, about 290,000 characters each): the renderer grew by about 1.5 MB an answer, 3.6 MB once the logs
  were full (one run alone: 1.4 GB at 1,000 answers, 4.2 GB at 2,000, 9.6 GB at 3,500, then "Target crashed"; its V8 heap
  stayed at 13-18 MB, so the memory was outside JavaScript). The tool now keeps the page's `localStorage` in the page's
  own memory (`tools/memstorage.js`, installed before anything writes: the same values, own properties and quota as the
  browser's, 5,242,880 characters as measured on the tools' Chromium; checked by `tests/memstorage.test.js`): 0.4 GB at 1,000 answers, 0.55 at 2,000, 1.1 at
  8,000, with 4 runs side by side. About 0.1 MB an answer is left (V8 heap 12 → 25 MB, the rest outside it), not
  identified: not the app's pending timers, MutationObserver records or promise reactions (each taken away in a
  diagnostic run, the same growth), nor the photos (aborted, the same); far from a crash at 8,000 answers (fish: 0.93-1.06
  GB). 8,000 answers with 4 runs side by side took 10 minutes for the corals and 3 hours for the fish on a loaded
  machine: the fish draw itself (`model.js` `photoSet`, `core.js` `faOf`, `calibOf`) costs about 0.3 s an answer there. The same seeds give the same runs as before (1,500 answers, corals and fish, beginner and
  lecture RA: every measure identical; only 2 of 6,000 logged answer times differ by 0.1 s, the wall-clock time between
  the tool setting the question clock and the app reading it, which a slower page added before). 8,000 answers peak at
  about 2.24 million characters of storage (corals) and 2.76 million (fish), under the quota.
- **Opening pace** (2026-11-04): `open/15`, the most genera opened on their own cards in any 15 consecutive questions so
  far; with `--breaks`, the genera opened in the first 15 answers after the comeback, the most in any 15 and in all the
  `--after` ones. Profile `strongBack` (not in the default list): a strong player who knows 80% of the genera well and
  the rest hardly (few genera stay shaky), for `--profiles strongBack --questions 60 --breaks 8h --after 40`, the
  situation of the run that collapsed on 2026-11-03.
- **Response time** (2026-11-04, "Response time" section 5): the learner takes log t = log 7 − 0.15 × right − 0.3 ×
  logit(its true chance) + 0.6 × N(0, 1) seconds (`LEARNER.RT`, calibrated so that its logs give back the two real
  measures), handed to the app's question clock; the app weighs its steps by it (the sheet version it sees is set to
  one that replays the time). `--rtapp off`: the app as with an older script (weights 1); `--rt off`: no seconds;
  `--rtlog`: the app's answer log of every run, with the learner's chance and time noise, for `tools/abilityeval.js`.
- **Openings after a miss** (2026-11-03): per profile, the genera opened on their own cards, those on the question
  right after a miss (0 with `openRight`), the questions where that rule alone held the opening and the openings they
  would have brought (`openChance` summed), and the questions from each spell of them to the next card; each run's
  `opens`, `afterMiss` and `blocked` are in `--out`.
- **Profiles**: beginner (knows every genus at 2%, learns 0.12 of the gap per exposure), lecture-level RA (the profiles
  test's RA: 55% on 2 genera in 5, 10% on the others, 0.12), strong RA (85% on 3 genera in 5, 10% on the others, 0.12),
  expert (93%, 0.05). The player never opens all (the path is what is measured), unless `--openall N`: all open at
  question N, as My progress's button (`offer`, which accepted the offer card, went with it on 2026-11-12); the back card is then answered
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
- **Photo exposure** (2026-11-06, in `--out` only): each question's genus, colony and photos (`expo`) and each genus's
  game photos with their colony (`pool`), for the repeat rates, the photos never shown and the answers per photo
  ("Photo exposure").
- **Limits**: the learner is ours, a few round numbers, not fitted to real answers; the photo difficulty it meets is the
  app's own estimate (so photo calibration cannot be judged), unless `--truth` gives it a fixed world (2026-11-03); learning is per genus only (a duel or a montage teaches
  the two genera, not the pair as such; the field learner, below, adds pairs and the size of the set); no forgetting (except across `--breaks`), no fatigue; the RA profiles know a fixed set of genera (every
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

#### Field learner and the Custom-8 scenario (measured 2026-11-05, no rule changed)

Why (Pierre, 2026-11-05, the progress and set-size study): a genus at 100% should mean the player can tell a photo of it
from *any* slate genus, whatever they have unlocked. The learner above cannot see what that asks: it recognises a genus
whatever the competitors, so drilling 8 genera raises its knowledge exactly as drilling 40 would. This adds a second
learner and Pierre's scenario, and measures today's rules with them. Validation tools only: no game rule, constant or
rules version changed; the progress rule is Pierre's decision.

- **Field learner** (`--learner field --tau T`; `tools/learnsim.js` "The field learner", constants `LEARNER.FIELD`,
  provisional). It keeps `know[g]` and its teaching, and adds a contrast skill x per pair of genera, learned only when
  the pair is contrasted: both among a question's choices, or side by side in the montage after a miss. A question on t
  among the set V (its choices; for a typed question the genera the learner has met, the names it holds in mind) is
  answered with the Luce choice P = 1 / (1 + e^(d + 0.5·single − memory) · Σ_{c∈V, c≠t} r(t, c)), r(t, c) =
  (1 + 3 s(t, c))(1 − 0.5 know[c] g)/4 · (1 − know[t])^(1.6 g), g = τ + (1 − τ) x(t, c), s from `pooledConf` as for the
  item learner. Every genus held in mind adds its own odds of a mix-up, look-alikes most (set size, and pooled
  confusion); τ (transfer) is the share of what the learner knows of t, in log odds, that works against a genus it was
  never contrasted with. A (1.6): with every pair contrasted at know 0.5 and 4 easy choices it answers 0.75 as the item
  learner; an expert (know 0.93 on every genus and pair) about 0.85 against the whole slate. The item learner stays the
  default and its runs are unchanged (same seeds, identical answers to `main`): two worlds, as the statistics study asks
  (a rule that helps only in the world it was designed for is suspect).
- **Custom-N scenario** (`--custom 8 --drill 200`): the player plays the Quiz until 8 genera are unlocked, picks those 8
  in the custom quiz, plays 200 questions there (the real custom quiz: its draw, choices, typed questions, Again, duels;
  no exam), then goes back to the Quiz.
- **Measures** (`tools/fieldeval.js`, pre-declared before the runs; rule L11 tier 2). The truth is pOpen(t), each
  learner's own success on an average photo of t with every slate genus a possible answer (Luce over the 40 for the
  field learner; for the item learner its guess among the 40, about its know).
  - **Primary 1, overclaim**: per run, the mean over the genera met of (bar shown, `genScore`) − pOpen, at question 600.
    Above 0: the bar claims more than the player can do against the whole slate.
  - **Primary 2, precision of Learned**: per run, the share of Learned genera with pOpen ≥ 0.8 (`LEARNER.PREC`), at
    question 1000 (runs with no Learned genus have none: their number is given).
  - Secondary, descriptive: over+ = mean of max(0, bar − pOpen) (the study's form), and at the end of the drill the
    selection's own bar, pOpen and overclaim.
  - Inference: mean and 95% t interval over the 30 seeds; Custom-8 against the path on the same seeds (paired), sign-flip
    p over the seeds and Holm over the four profiles for each primary. Everything else exploratory.
- Run: seeds 1-30, 1000 questions, the four profiles, no `--stats`; `node tools/learnsim.js --seeds 30 --questions 1000
  --learner field --tau 0.5 [--custom 8 --drill 200] --out f.json`, then `node tools/fieldeval.js path.json custom.json`.

Results, field learner τ 0.5, today's rules (`main` at 0760aa60, the learner at c7d23d1e; 240 runs; mean [95% interval
over the 30 seeds]). The item learner and τ 0 / 0.8 runs (robustness) come in a later commit.

| Profile | over at 600, path | over at 600, Custom-8 | Custom-8 − path (paired) | over at 1000, path | precision of Learned at 1000, path (pooled) | the same, Custom-8 |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | +0.108 [0.098, 0.118] | +0.070 [0.060, 0.080] | −0.038 [−0.049, −0.027] | +0.112 [0.103, 0.121] | 0.90 [0.81, 0.99], 22 runs (37/44) | 1.00, 30 runs (74/74) |
| lecture-level RA | +0.084 [0.071, 0.097] | +0.036 [0.027, 0.046] | −0.048 [−0.062, −0.034] | +0.080 [0.071, 0.088] | 0.93 [0.85, 1.00] (108/115) | 0.99 [0.97, 1.00] (114/116) |
| strong RA | +0.034 [0.022, 0.046] | −0.033 [−0.042, −0.024] | −0.067 [−0.080, −0.054] | +0.044 [0.039, 0.050] | 0.98 [0.97, 1.00] (300/305) | 1.00 (239/239) |
| expert | −0.034 [−0.038, −0.030] | −0.113 [−0.118, −0.108] | −0.079 [−0.085, −0.073] | +0.014 [0.012, 0.016] | 1.00 (980/980) | 1.00 (754/754) |

Paired Custom-8 − path at 600: sign-flip p < 0.001 for every profile, Holm-adjusted 0.0004. Precision at 1000, Custom-8 −
path on the seeds where both runs had a Learned genus: beginner +0.10 [0.02, 0.19], lecture-level RA +0.06 [−0.02, 0.14],
strong RA +0.02 [0.00, 0.03], expert 0; Holm-adjusted p 0.24 for the first three: no clear difference.

At the end of the drill (Custom-8, question 235-238; secondary, descriptive): the 8 genera drilled.

| Profile | right % in the drill | bar of the 8 | their true whole-slate success | overclaim of the 8 | of the 8, at 95% or more | the 8 at question 300 / 600: bar, true |
| --- | --- | --- | --- | --- | --- | --- |
| beginner | 93 | 0.92 | 0.70 | +0.22 [0.21, 0.23] | 5.9 | 0.89, 0.79 / 0.85, 0.93 |
| lecture-level RA | 95 | 0.93 | 0.81 | +0.12 [0.12, 0.13] | 6.3 | 0.90, 0.88 / 0.88, 0.95 |
| strong RA | 97 | 0.95 | 0.90 | +0.04 [0.03, 0.05] | 7.3 | 0.94, 0.94 / 0.92, 0.97 |
| expert | 99 | 0.95 | 0.99 | −0.04 | 7.6 | - |

What it says, on this learner (provisional constants; to be read with the item world and τ when they come):

- **Pierre's scenario reproduces**: 200 custom-quiz questions on 8 genera bring 6 of them (beginner) to 7-8 (strong RA)
  to the exam's entry, the 8 shown at 92-95% while a beginner names them right 70% of the time against the whole slate,
  a lecture-level RA 81%: overclaims of +0.22 and +0.12 on exactly the genera drilled.
- **It does not last in this world**: the exam is left to the Quiz, and by the time it passes, the drilled genera have been
  set against the genera met afterwards (each question contrasts its choices). Their true success reaches 0.79-0.94 by
  question 300 and 0.93-0.97 by 600, and every Learned genus of the Custom-8 runs but two (of 1,183) clears 0.8. At 600
  the Custom-8 runs overclaim *less* than the natural path, over the genera met (the drill slowed the opening: fewer
  genera met, fewer new bars). A player who drills and never goes back to the Quiz keeps the +0.22.
- **The standing overclaim is the natural path's**: +0.11 for a beginner and +0.08 for a lecture-level RA at question
  600, the same at 1000 (+0.03 to +0.04 for a strong RA, about 0 for an expert, whose bars under-claim early). It is
  where the precision of Learned falls short too: 7 of a beginner's 44 Learned genera and 7 of a lecture-level RA's 115
  are under 0.8 against the whole slate.
- **Limits**: one learner, its constants chosen by hand (A, the contrast rate PAIR 1, τ), not fitted to real answers;
  the pooled confusions are the priors (no `--stats`); the learner never quits and always goes back to the Quiz.

**Real answer log** (tier 3, rule L12; `node tools/fieldeval.js --log answers.json`, the sheet's Answers tab read
2026-11-05 through the Sheets connector, read-only, kept outside the repo; 1,933 coral answers of 10 players, all with the
app's logged expectation e). Does the number of genera a player had been asked so far (x = log2 of it; the log records
no cards, so a genus opened but not yet asked is left out) predict right or wrong beyond e? Pre-declared: M1 = logit e +
a + b x against M0 = logit e + a, each fitted on the other players and scored on the player left out; players are the
unit (each one vote), sign-flip over players, declared direction M1 lower with b < 0.

| | Result |
| --- | --- |
| Log-loss M1 − M0 per player (primary) | +0.001 [−0.008, 0.011], sign-flip p 0.73 (exact); M1 better for 5 of 10 players: **no clear difference** |
| b on every player | −0.21 logit per doubling of the genera asked (the declared direction) |
| The players' own b (8 players with 30+ answers) | −0.14 [−0.54, 0.27], negative for 5 of 8, sign-flip p 0.45 |
| Expected e against right, by genera asked so far | 1-4: 0.76 / 0.88 (89 answers); 5-8: 0.77 / 0.90 (216); 9-16: 0.78 / 0.88 (328); 17-32: 0.77 / 0.79 (870); 33+: 0.75 / 0.81 (430) |
| Typed answers only (exploratory) | 55 answers of 3 players: too few to read |

The players beat the app's expectation by 0.10-0.13 while they had been asked 16 genera or fewer, and by 0.02-0.06 after:
the shape a set-size effect predicts, but also that of the Elo's early under-estimate (the ability lags most on few
answers, "Learning-outcome simulation" above), which this log cannot tell apart. With 10 players, the held-out test sees no
clear difference. A replay cannot judge what a new progress rule would teach (other questions would be asked).

#### The judge: the domain score D* (2026-11-06, part 1 of the new progress bar; no rule changed)

Why (Pierre, 2026-11-06, Q127-Q131 on the research note `docs/reviews/2026-11-06-progress-metric-research.md`): the bar
was tuned against a yardstick of our own (overclaim against pOpen, success on an *average* photo). 100% is to mean
"names right every photo of the genus, alone, without choices", over the genus's theoretical photo distribution, easy to
hard. A new yardstick comes first, and every candidate bar is judged by it in several learner worlds.

- **D\*(g)** (`tools/learnsim.js`, `JUDGE`): the learner's true success naming a photo of g alone (one view, so the
  single-view offset), with no choices, averaged over N(μ_g, SD²) by Gauss-Hermite with 7 points.
  - Item learner: its recognition, no guess.
  - Field and exemplar learners: every slate genus is a possible answer.
  - `--truth gen` draws every game photo's true difficulty from the same distribution, by a hash of its file name. μ_g
    is the sheet's genus offset (`--stats` gd); SD is 0.8 (an assumption). The app is told the truth plus N(0, 0.3²).
- **The exemplar learner** (`--learner exemplar`, `LEARNER.EX`): a summed-similarity model after the GCM (Nosofsky
  1986), with a background (guessing) term; four constants. It is the third world, beside item and field. Its
  difference: a genus never stored does not compete, so a drilled genus is truly named right.
- **The spotty profile** knows the genera of IMR lecture groups 1-5 as an expert and the rest hardly (5%).
- **`tools/barjudge.js`** reports:
  - the error E(g) = bar − D\*(g), signed, per profile at q100 / 300 / 600 / 1000, over the genera met;
  - E split into the genera the profile knows and the others, and at the end of a Custom-N drill into the drilled genera
    and the others;
  - the time to credit (questions until the bar reaches 50% and 80% on the genera the profile knows);
  - with `--bar field --core <#611's core.js>`, another rule's bar on the same answers, replayed;
  - with `--log`, the real-log calibration of the app's predicted success by tercile of ability − photo difficulty
    (players as the unit, leave one player out).
- The primaries and their Holm family are pre-declared in PR #624. The baseline results are added there and here.

## Decision log

- 2026-11-14, Pierre (Q350, "oui à tout" to the confusion-group study's a-j, f changed: declared pairs forced): look-alike
  units open by confusion group, the exam waits for the group, `INTRO.EVERY` removed ("Confusion groups"). Built and
  checked: partners 4-5 times closer, fish every guardrail held; the corals' start of the path breached guardrails
  (the beginner's first unit at Open Water, the first answers' right %), back to Pierre with options before it ships.
- 2026-11-12, Pierre (Q337 (a)): the card that offered to open all genera goes, for every subject; Open all stays on the
  first cards and in My progress, the back card stays ("First meeting with a genus"). Q338 (a), "a unit still shaky
  after N of its own answers stops holding the opening": calibrated among 8 / 10 / 12 / 15, none passed the plan
  declared before the runs (N 8 and N 10 free the real stretches but lower a rated-world beginner's score and lengthen
  its plateaus; N 12 and N 15 do not free them), so nothing changed; back to Pierre ("A unit stuck shaky",
  "Calibrated, not adopted"). Q338 (b), N 10 only above a global level L (0.25, 0.5 or 0.75) once it rests on 200
  answers: calibrated, none passed (the simulated beginner's level is past every L from about answer 200, so it pays the same cost), nothing
  changed; back to Pierre ("Above a level"). Q338, decided: "option a, B10 après 200 réponses": N 10 from 200 answers,
  no level (the arm "N 10, floor alone"), the beginner's shown-score cost accepted; adopted ("A unit stuck shaky").
- 2026-11-08, Pierre (Q242, Q247; "Fish: the global score, built"): the fish global score is the formula of 2026-11-04
  with each species weighted 1/√ of its rank by observers near Dauin (ties sharing their mean rank) and each family by its
  species' weights, shown as 100 √raw (anchors 50 / 74 / 89 / 92 / 95 / 100%), not the circle weights; one computation
  with its components (per family, genus, species × common / scientific name, per circle); a species with no common name
  has no common branch (credit = S); the rules that read a global fish % read the new scores (circle 3: the circle-1
  Entries component at 55%).
- 2026-11-06, Pierre (Q187-Q190, after the photo exposure study; fish too, 15:36): the Colony cap 40 colonies per genus
  (corals; fish no cap); the calibration questions are an exploration share of 30% drawing colonies (observations)
  never seen, on a unit held (simulated); a beginner's multi-view question weighs a colony by cov, not cov² (corals); a
  colony counts as seen whatever view was shown ("Photo exposure").
- 2026-11-06, Pierre (Q127-Q129, Q135; PR "domain-score bar"): the bar is the posterior expected domain score of the
  genus from the player's own answers on it (grid, fixed population prior, format-aware, a drift per answer), 0 to 95%,
  the exam from 85% to 100%; the moving average `s.pg` retired as the bar (kept for records not rebuilt, rule D4); the
  learned-mark guard made explicit (`afterBkt`); the shared slope and the per-format offsets as inputs (Q147, Q138).

- 2026-11-04, Pierre (approved after review of every family's ranking): the fish species inside an entry open in
  commonness order, the index of field counts near Dauin (weight 3), the IMR 24 most sighted (2) and iNaturalist distinct
  observers in three rings (1), shrunk toward the entry's mean with M = 5, log scale over 2 decades
  (`tools/fish_commonness.py`, `fish.json` `cmi`; "Fish: species order, the commonness index").
- 2026-11-04, Pierre (approved; design only, docs/FISH_PATH.md "My progress (fish)"): the global fish score's formula. Per species,
  C = mean mastery of its listed common names, S = max(species mastery, ½ × genus mastery), credit = a·C + b·S + (1 − a − b)·C·S
  with b = 0.80, a ≈ 0.73; global = 25% × mean entry mastery + 75% × mean species credit over circle 1. Entries only 25%, every
  common name 80%, every scientific name 85%, both 100%. The entries' share and the genus's half credit are checked by simulation
  (rule L11) before it ships.
- 2026-11-04, Pierre (latest; design only, docs/FISH_PATH.md): the fish path is a **tree** (trunk: families; branch A: species
  by common name; branch B: scientific genus names, then species scientific names), and the players choose common, scientific
  or both names; the global fish score reaches 100% only with both names of every species, about 80% with every common name
  and no scientific one, about 85% with every scientific name and no common one, non-linear per species (credit a < b < 1, the
  genus partial credit inside b; a, b and the families' share set by simulation, rule L11), never additive. Replaces the 80 / 20
  split below.
- 2026-11-04, Pierre (later the same day; design only, docs/FISH_PATH.md): the global fish score is **non-linear**, fast
  at the start, 80% for every entry and species known by common name, scientific names filling the last 20% slowly (the curve set by simulation), the Elo level kept alongside; the half fault must not be gameable (common
  names never advance the scientific-name progress; options listed, none chosen); the fish exams to rethink (per
  species or per family, e.g. about 20 hard questions answered with the scientific name); milestone cards for species
  names and scientific names; juveniles, colour phases and dimorphism introduced with an explanation card.
- 2026-11-04, Pierre (fish beta feedback; decided in principle, nothing built, docs/FISH_PATH.md): on a species question
  that asks for Latin, a typed common name counts **as half a fault** (a graded outcome 0.5: its effect on `eloStep`,
  `pgStep`, the expected success, the all-Latin exam and the replay to study first, starting values from
  `tools/learnsim.js`); **one global fish progress score** from 0 to every species in Latin (entries, species named,
  species in Latin as stages of one scale, the weights set by simulation), used by the fish leaderboard; the
  name-display thresholds start from learnsim, then are computed per species from the measured difficulty of the
  common against the Latin name; the first fish entries are a starter core of easy families and the first photos
  very easy (no juveniles or colour phases at the very start).
- 2026-11-04, Pierre (after a player's "Drill this pair" run fell to 6 misses in 13 with the hold on and nothing
  changed in the duel): the hold's easing reaches the Duel tab (`planDuel`), and a relief card the first time a duel
  run's answer takes the hold across `INTRO.HOLD`: Mix in other genera / Compare them (with Back to the duel, the same
  run) / Keep drilling, at most once a run, logged as a tip (`tip:duelhold`). Same detector, no new constant ("The Duel tab when the hold sets in").
- 2026-11-04: answer time compared within the same question format (2-choice apart, or the Duel tab apart) **not
  adopted**: every variant scored worse than the pooled median on the real log ("Considered and not adopted").
- 2026-11-04, Pierre ("the signal is already very clear on few players; the question is how to integrate it"; rule L1
  was about days between sessions, not the seconds an answer takes): **answer time weighs right answers** (rules
  version 4, sheet v32): a right answer's genus and level steps times clamp(1 − 1.5 z, 0.5, 1.5), z its log seconds
  against the median of the player's own earlier timed answers (kept exactly in `P['~level'].rt`, replayed from the
  log); misses, typed, untimed and the first 10 timed answers unchanged; on in the app only once the script is v32.
  Real answers: −2.20 ± 0.72 × 10⁻³ log-loss per answer against main, every timed player better, no group worse.
  learnsim (a time model calibrated on the two real measures, −0.88 and −0.39): no profile learns less, Elo error
  lower or within its spread ("Response time", section 5). rule L1 reworded.
- 2026-11-03, Pierre ("new genera open right after a wrong answer: it feels like a reward for it"): an opening only
  after a right answer (`model.js` `openRight`, `P['~level'].h`): after a miss no genus opens until the player answers
  right again, in any game; a card planned before the miss is planned again. Nothing else in the pace changes.
  Simulated (5 seeds x 300 questions): one to two genera fewer by question 100 for the beginner and the RAs (beginner
  18.4 → 16.2, lecture RA 20.6 → 18.6, strong RA 19.8 → 18.6), the expert unchanged, true knowledge within the spread
  from question 200 (beginner 0.28 → 0.26 at 100); on `main` about one card in five came right after a miss. Real
  answers: 22 of 130 first meetings on the path (17%) came on the question right after a miss ("An opening only after
  a right answer").

- 2026-11-04, Pierre ("I validate all your proposals", after the collapsed runs of 2026-11-03): the opening's pace
  (`openPace`: no card while a genus carded in the last 15 answers waits for its question, at most 3 in any 15, a
  carded genus asked as soon as ready; replaces the hotfix's cap and `OPEN.UNASKED`), easier questions while the hold
  is on (`holdEase`, h − `INTRO.HOLD` logits), the player's own mix-ups in the expectation (`confTerm`, on 3 or more
  plausible choices only: worse on the 2-choice questions on the real answers), the Again queue of 3 pairs, look-alikes
  from the data (`dataLook`: 20 offers, pooled score 0.2; one pair today, *Alveopora* / *Tubastraea*), an Again never
  on a genus not met, and a one-time apology card, only to the players who felt it (Pierre: not to a player of a
  single answer; 20 answers in the window and the hold at 3). Simulated: the pace bounded, knowledge as before or
  better, genera learned by 600 within the spread except the strong RA against the hotfix; real answers: the
  confusion term neutral overall (−0.0009 ± 0.0019) and better calibrated where it applies ("After the collapsed runs
  of 2026-11-03").

- 2026-11-03, Pierre (hotfix): two strong players' runs collapsed after #408 and #413 (one met 7 new genera in 16
  answers, three of them never asked, then fell from 83% to 50% right): `openChance` is capped at `OPEN.MAX` 0.5, and
  no genus opens while `OPEN.UNASKED` (3) genera opened earlier are still unasked. A stopgap until the full fix (opening
  pace per window, easier questions while the hold is on, the pair confusion term, data look-alikes).
  `tools/learnsim.js`, 5 seeds x 300 questions, true knowledge of the slate / genera met at questions 100 and 300:

  | Profile | `main` q100 | hotfix q100 | `main` q300 | hotfix q300 |
  | --- | --- | --- | --- | --- |
  | beginner | 0.31 / 23.2 | 0.29 / 18.8 | 0.65 / 38.2 | 0.60 / 34.6 |
  | lecture RA | 0.49 / 24.2 | 0.48 / 21.8 | 0.76 / 40.0 | 0.74 / 39.2 |
  | strong RA | 0.69 / 32.2 | 0.68 / 22.8 | 0.86 / 40.0 | 0.85 / 39.6 |
  | expert | 0.94 / 26.4 | 0.94 / 19.8 | 0.95 / 40.0 | 0.95 / 39.8 |

  Right %: within the seeds' spread (beginner 74 / 83 at 100 / 300, main 73 / 80). Tried first: no genus while any
  opened genus is unasked (`OPEN.UNASKED` 1): genera met by question 300 fell to 24-25 for every profile and true
  knowledge with them (strong RA 0.77, beginner 0.48): rejected; 2: 33-35 genera, strong RA 0.81: rejected; the cap
  alone: knowledge as `main`, but nothing stops a run of openings whose genera are never asked. Real log (rule L12):
  the rule only changes which question comes, not the Elo's predictions, so the log's log-loss is unchanged by
  construction; measured instead on the collapsed run's logged sequence: of its 7 cards in 16 answers, 4 pass the
  unasked rule (each then at a chance of at most 0.5) and 3 are blocked, 2 of them genera the run never asked.
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
  (rule L1 exception), progress, mastery and ability never decay. Then: a new visit (30 minutes without an
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
  wrong-pick update stayed (rule L2; its weight recalibrated in the next entry, which removed its Elo step) ("One draw
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

- 2026-11-03, Pierre: the Easy / Medium / Hard photo sets removed (one game list per view, the same photos), and the
  photo difficulty made hierarchical: a genus offset learned from every answer on the genus + the photo's own residual
  (sheet v31, `GENUS_K` 0.4, `?stats=1` `gd`), the app's prior for a photo with few answers the genus offset (0 with an
  older sheet). On the real log the app's next-answer log-loss goes from 0.4976 to 0.4812 (−0.016 [−0.028, −0.006]);
  simulated, no learning path changes beyond the seeds' spread ("Hierarchical photo Elo").
- 2026-11-03, Pierre (for everyone): a ★ genus opens only after the genus its card compares it to has been met (a
  beginner met *Duncanopsammia* and *Cyphastrea* before *Turbinaria* and *Astreopora*): the references read from the data
  (`core.js` `starRefs`, the genera of the card's "★ look-alike of …" line), a weight of 0 in the opening draw until
  they are met, Open all unchanged, no new constant ("Starred genera after their reference").
- 2026-11-03, Pierre: the first-launch question (new to corals / had the IMR coral course / know corals well), forced,
  in the welcome tour; it initialises variables of the model only (`playerStart` shrinks towards p 0 / 0.5 / 1.25, the
  open-all offer from answer 50 / 30 / 20, Coral basics offered first for "new"); existing players under 50 answers are
  asked once, the others inferred silently; a fallback card once per answer and direction when the first 20 answers'
  surprise is below −0.1 or above +0.18 ("The first-launch question").
- 2026-11-04, Pierre (on #428, after the variants compared): the fallback rule weighs the errors: a true beginner on
  the harder path is the costliest, so "lower" is sensitive (checkpoints 40 and 60 only; the global level under the
  band's floor at one-sided 80%, or the opening hold alone; "IMR course" and "know well" only) and its card a gentle
  offer (Coral basics or "No thanks, I know the basics"; Coral basics also moves the start variables one band down,
  silently, the answer given kept); "higher" unchanged; the open-all offer card shows the step as a big one ("Not now"
  on top). 36 of 40 wrong answers caught, 7 of 20 gentle offers to truthful answers; 40-60 adaptive answers cannot tell
  a beginner who said "IMR course" from a lecture RA: a placement test is the follow-up ("The rule since 2026-11-04").
- 2026-11-04, Pierre (on #428): the fallback test redesigned: checked at 20, 40 and 60 answers; "lower" from the level
  of the first answers on each genus (or the opening hold fired), "higher" only from 40 answers and 10 genera met, from
  the global level and the first answers together; no move back after a change made on its card; 35 of 40 wrong answers
  caught instead of 10 ("The fallback test, redesigned"). The full replay applies the first-launch prior (RVS v3).
- 2026-11-03, Pierre: a custom quiz, the photo quiz on the genera the player picks: the genus asked drawn among them by
  the usual weights with no opening path (a genus not met yet is asked with its card), the choices from them first
  (the trap rules inside the selection), topped up from the slate only under 4 genera; every answer counts as a
  photo-quiz answer, logged `quiz|s…` ("Custom quiz: the photo quiz on the genera the player picks").

- 2026-11-03, Pierre: the one-tap question varies (six items on felt difficulty, fun, frustration and boredom, in
  rounds, never twice in a row) and comes every 40 answers instead of 60 (twice that after a "Not now"), so the
  level-dependent target can be checked by level band; logged in the existing v19 events, no new sheet version; nothing
  in the game reads the answers yet ("What the players say about the difficulty").
- 2026-11-03, Pierre (reviewing that PR): every 40 answers approved; the rule that turns the answers into the
  level-dependent target approved, with the caution that felt difficulty is subjective (no move before the thresholds;
  built later, once data exists); "For me, the challenge is: Too low / Too high" replaced by "Right now I feel: Bored /
  In the zone / Struggling"; the question made a block of its own before Next; the response rate logged.
- 2026-11-05, Pierre (a bug seen on his phone: the one-tap question came when he had barely started his session): it
  never shows early in a session; the thresholds, 15 answers and 5 minutes into the current session (answers less than
  30 minutes apart), the integrator's call ("What the players say about the difficulty").

## References

- Literature reviews with their own reference lists, each reference marked with how it was checked (2026-11-09):
  [response time and difficulty](reference/lit-response-time.md) (Q315), [componential
  difficulty](reference/lit-componential-difficulty.md) (Q316, Q136), [photo memory](reference/lit-photo-memory.md)
  (Q317).
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
- van der Linden, W. J. (2006). A lognormal model for response times on test items. *Journal of Educational and
  Behavioral Statistics* 31, 181-204; van der Linden, W. J. (2007). A hierarchical framework for modeling speed and
  accuracy on test items. *Psychometrika* 72, 287-308.
- Bock, R. D. (1972). Estimating item parameters and latent ability when responses are scored in two or more nominal
  categories. *Psychometrika* 37, 29-51. Thissen, D., Steinberg, L. (1984). A response model for multiple choice items.
  *Psychometrika* 49.
- Ghosh, A., Raspat, J., Lan, A. (2021). Option tracing: beyond correctness analysis in knowledge tracing. *AIED 2021*.
  <https://arxiv.org/abs/2104.09043>
- Papoušek, J., Stanislav, V., Pelánek, R. (2016). Impact of question difficulty on engagement and learning. In
  *Intelligent Tutoring Systems (ITS 2016)*, LNCS 9684, pp. 267-272. Springer. <https://doi.org/10.1007/978-3-319-39583-8_28>;
  extended version: Evaluation of the impact of question difficulty on engagement and learning, FI MU Report Series
  FIMU-RS-2016-02, Masaryk University, March 2016 (the difficulty question and its results).
  <https://www.fi.muni.cz/reports/files/2016/FIMU-RS-2016-02.pdf>
- Rheinberg, F., Vollmeyer, R., Engeser, S. (2003). Die Erfassung des Flow-Erlebens [The flow short scale, FKS]. In
  Stiensmeier-Pelster, J., Rheinberg, F. (eds.), *Diagnostik von Motivation und Selbstkonzept* (pp. 261-279).
  Göttingen: Hogrefe. Items in Rheinberg, Vollmeyer & Engeser (2019), FKS. Flow-Kurzskala [Verfahrensdokumentation],
  Open Test Archive, ZPID. <https://doi.org/10.23668/psycharchives.4488>
- IJsselsteijn, W. A., de Kort, Y. A. W., Poels, K. (2013). *The Game Experience Questionnaire*. Technische Universiteit
  Eindhoven (FUGA project; section 3, In-game GEQ, and its scoring guidelines).
  <https://pure.tue.nl/ws/files/21666907/Game_Experience_Questionnaire_English.pdf>
- Ryan, R. M., Rigby, C. S., Przybylski, A. (2006). The motivational pull of video games: a self-determination theory
  approach (PENS). *Motivation and Emotion* 30.
- Csikszentmihalyi, M. (1975). *Beyond boredom and anxiety*. Jossey-Bass (the flow channel between boredom and
  anxiety; 25th anniversary edition 2000, *Beyond boredom and anxiety: experiencing flow in work and play*).
- Csikszentmihalyi, M. (1990). *Flow: the psychology of optimal experience*. Harper & Row; Csikszentmihalyi, M., Larson,
  R. (1987). Validity and reliability of the experience-sampling method. *Journal of Nervous and Mental Disease* 175.
- Sauro, J., Dumas, J. S. (2009). Comparison of three one-question, post-task usability questionnaires. *CHI 2009*,
  pp. 1599-1608. ACM. <https://doi.org/10.1145/1518701.1518946>
- Bolsinova, M. et al. (2025). Keeping Elo alive. *British Journal of Mathematical and Statistical Psychology*.
  <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12784335/>
- Klinkenberg, S., Straatemeier, M., van der Maas, H. L. J. (2011). Computer adaptive practice of Maths ability using a
  new item response model for on the fly ability and difficulty estimation. *Computers & Education* 57(2), 1813-1824.
  <https://doi.org/10.1016/j.compedu.2011.02.003>
- Maris, G., van der Maas, H. (2012). Speed-accuracy response models: scoring rules based on response time and
  accuracy. *Psychometrika* 77(4), 615-633. <https://doi.org/10.1007/s11336-012-9288-y>
- Cameron, A. C., Gelbach, J. B., Miller, D. L. (2008). Bootstrap-based improvements for inference with clustered
  errors. *Rev. Econ. Stat.* 90(3), 414-427. <https://www.nber.org/papers/t0344>
