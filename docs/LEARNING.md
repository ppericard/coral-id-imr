# Learning model: research and choices

How the app decides what to ask, how hard, and when a genus counts as learned; and how the shared statistics rate the
photos. Each choice says where it comes from: published work, Pierre's decisions, or our own measurements (the
three-player simulation, `tests/profiles.smoke.js`). Keep this file in step with the code: a constant changed here is
changed there, with the reason.

Code: `model.js` (the player's own model, in the browser; `app.js` before 2026-11-02), `core.js` (shared helpers, also run by the admin), the sync
sheet script `tools/sync/Code.gs` (statistics pooled over every player, `stats_`). ARCHITECTURE.md describes the code;
this file explains why it works that way.

## What each number measures (read this first)

What each figure of the game and of the answer log says, and what it never says. Any analysis of players (rule L12)
starts from here, before it reads a success rate as a level.

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
  The sheet keeps its own chain `R` (the admin's level, the photo ratings' player term). Read a player's level from
  the global level **at that moment** (the log's answers replayed, as `tools/learnsim.js` and the full replay do),
  and from their **progress**, never from their success rate. **The Elo is not settled before many answers**: the game
  shows it only from `ELO_MIN` = 200 answers, and a level read earlier (or on a player back from a break, or right after
  many new units) is a rough guess: say how many answers it rests on, and lean on progress there. A rule keyed on the
  level (a threshold) must say what it does before the level is settled.
- **Ability per unit** (`P[genus].th`): the same Elo, per genus or family; a unit never answered starts from the
  global level (`playerStart`).
- **Progress**: per unit, the domain-score bar (the share of all its photos the player would name, one photo alone,
  from their own answers on it: "The domain-score bar"); the subject's % and score from the bars; units met and
  opened. With the global level, the only measure of how far a player has come.
- **Difficulty of a photo**: its rating in the sheet's photo Elo (`stats_`, pooled over every player), around its
  genus offset `gd` (**one genus difficulty**: "One genus difficulty"); a question's difficulty adds the photo memory,
  the mix-ups term and the format's offset. The success of one player on a photo says little about its
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

How the app models one player and chooses each question, as the code runs it today; every value is the code's, and the
code wins where this text and it differ. The studies, measurements and options weighed behind it, with their dates, are
in the notebook: [docs/archive/learning-notebook.md](archive/learning-notebook.md).

Code: `model.js` (the draw, the opening, the cards, the comeback), `core.js` (the scorer, the ability, the bar, shared
with the sync sheet's replay, which embeds it), `quiz.js` (the photo quiz: what a question is, what an answer does),
`app.js` (each subject's units and gates). One engine for every subject (rule S1): a *unit* is what a question asks (a
coral genus, a fish family, genus or species, a sea slug genus); the code says "genus" for any unit.

### Ability per genus (Elo) and the global level

- **The answer model.** `P[genus].th` is the player's ability on a unit, on the photo-difficulty scale (0 = an average
  photo). The chance of a right answer is g + (1 − g) · σ(ability − difficulty), g = 1 / k for k plausible choices
  (none for a typed answer). After each answer the ability moves by K · (result − expected), Pelánek's uncertainty
  function: K = `ELO.kmax` / (1 + answers / `ELO.n`), never below `ELO.kmin` for a unit, clamped to [`ELO.lo`,
  `ELO.hi`]. `core.js` `ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2}`; `core.js`
  `eloStep`, `abilityOf`.
- **Volatility** (after Glicko-2): `s.vr` is a moving average of the surprise (result − expected, rate `ELO.vr`); the
  step is multiplied by 1 + `ELO.vg` × |vr|, within `ELO.kmax`, so a skill that changes is caught up with.
- **Global level** `P['~level']` (`core.js` `LEVEL`): the same Elo over every answer of the subject, with no `kmin`
  floor (it settles as its answers build up) and kept to 4 decimals. It is made at the first answer from the player's
  history (`core.js` `levelSeed`). The players see one level, this one, as an Elo of 1000 + 200 × th (`progress.js`
  `eloScore`), and only from `ELO_MIN` = 200 answers (`progress.js` `ELO_MIN`): before, it is not settled. The
  leaderboard ranks by the subject's % and then by this level, read from each player's saved progress or from the replay
  their app will adopt (rule D8).
- **The sheet's own chain** (`core.js` `eloReplay`, run by the sync sheet's `stats_`): a separate player rating that
  starts every player at `PLAYER0` = −1 (`core.js` `PLAYER0`) and steps by 0.6 / (1 + n / 40), with no answer time, no
  mix-up term and no first-launch prior. It is the player term of the photo ratings and the admin's level (with
  `core.js` `levelMargin`, its 95% margin); players never see it.
- **A unit never answered** starts from the global level, shrunk towards the first-launch answer's level p
  (`core.js` `playerStart`): `START.W` × (m · level + `START.N` · p) / (m + `START.N`), m the answers so far, clamped to
  [`START.LO`, `START.HI`]; `core.js` `START = {W: 0.8, N: 10, LO: -0.5, HI: 1.5}`. A strong player's first question
  on a new unit has traps, single views and harder photos; never the hardest. A unit whose record names `from` (a fish
  species: its family) starts from that unit's ability once it has one.

**Global level and genus.** A unit already answered reads its own estimate plus the global level's move since its own
last step (`core.js` `levelMove`): (level now − `s.lt`) / (1 + its answers / `ELO.n`), the share its own Elo step would
give a new answer. A unit with few answers leans on the level, one with many on itself (the global + concept skill of
Pelánek et al. 2017, as a lazy update). The move is taken in at the unit's next own step.

### One surprise, counted once

After an answer the unit shown records `s.lt` = the global level as it stands **after** this answer's step on it
(`core.js` `scoreAnswer`), so `levelMove` carries only the level's moves from the other answers: an answer never moves
its unit once by its own step and again through the level.

### The genus wrongly given in the Elo

A wrong answer counts against both units (rule L2), but differently:

- **The unit shown**: an ordinary miss (ability, bar, recent results).
- **The unit given**: its recent results take a miss (`s.h`), its run resets (`s.streak`), its exam in progress ends,
  and a learned mark it holds is tested as after any miss. Its **ability does not move**: the Elo moves only on
  questions about the unit itself. On the bar it is a **false alarm**, not a miss on its photos (`core.js` `faOf`, in
  "The domain-score bar" below). A record still on the former moving average takes a miss on the photo shown, weighed
  by the chance the player had on it.

### One scorer

Every answer is scored by one function, `core.js` `scoreAnswer`, in the game (`quiz.js` `recordAnswer`) and in every
full replay of the answer log (the sheet's, the admin's, a device's: `core.js` `replayProgress`), so a rule is written
once and both give the same state. Its inputs, as the game had them:

- `t` the unit shown, `c` the unit given, `ok`, `k` the plausible choices (Infinity typed), `chs` the choices offered;
- `d0` the photo difficulty (the mean over the photos shown, + `PICKD.SINGLE` for one photo alone), `fam` the photo
  memory, `cf` the known mix-ups term, `look` (a confused unit among the choices), `R` and `Rc` the recall of a comeback
  question, `df` the format's offset, `p` the first-launch prior, `sec` the seconds, `mu` the unit's offset.

The question's difficulty is dm = d0 + fam + cf. The ability steps take dm − df; the logged expectation
e = 1/k + (1 − 1/k) · R · σ(th − dm) leaves the format offset out, so the format fit always reads the same quantity.
`scoreAnswer` also counts the offers and mix-ups (`s.off`, `s.conf`), the typed questions (`s.ty`, the level's `tyk`),
the photos seen and recognised (`s.ps`: [shown, right]), and the last 10 results of the unit (`s.h`) and of the
subject (`P['~level'].h`). Each answer is logged with its **scoring record** (`core.js` `scoreRec`, `scoreLog`; the
Answers column Scoring, index `LOG_SC`): the inputs a replay cannot rebuild from the log, to 3 decimals, so "replayed"
means what the game scored, wherever it is replayed. **A smaller fault** (Q394 A, Pierre, 2026-11-17: a common name
typed where a species' scientific name is asked, or its genus alone) is a miss whose steps are weighed down: the record
says its kind (`z`: `cn`, `g`), `core.js` `PART` its size (half, a quarter: starting values, read on the real answers
later), and `partOf` scales the miss's bar likelihood (a tempered one), its moving average and its two Elo steps (the
unit and the level); its counts and recent results take a miss, so it is never a gain. The kind is logged, not the size,
so a new size is one rules version and the whole log replays with it. What only the game knows (the exam, the cards, the
hold) is kept by one recorder, `quiz.js` `recordAnswer`, which every game's answer takes (`quiz.js` `answer`, `live.js`
`liveLog`).

### Response time

A right answer given faster than the player's usual is stronger evidence than a slow one (rule L1: time is evidence
about that answer, never a decay). Its two ability steps (the unit and the global level) are multiplied by
w = clamp(1 − K · z, LO, HI), z = log(seconds) − the median log(seconds) of the player's own earlier timed answers
(`core.js` `rtWeight`, `rtMedian`). `core.js` `RTIME = {K: 1.5, LO: 0.5, HI: 1.5, MIN: 10}`. w = 1 for a miss, an
answer without seconds, a typed answer, and before `RTIME.MIN` timed answers. The seconds are those logged (tenths, at
most 600); the earlier times live in the level's record (`P['~level'].rt`, a count per tenth of a second: `core.js`
`rtAdd`), so two devices' records add up and a replay rebuilds them. The answer's own time never changes its
expectation, only the step after it.

### Beginners and experts

The success every question aims for follows the global level (`core.js` `aimOf`): 85% up to a level of 0.5, 75% from
1.5, a straight line between, flat outside; `core.js` `AIM = [[0.5, 0.85], [1.5, 0.75]]`. `TARGET_P` (0.8) stays the
game's reference point. A beginner is not overwhelmed and a strong player is challenged quickly. Three rules read it:
the photo's aim (`model.js` `aimP`, `aimOff`), the miss weight of a record on the former moving average (`core.js`
`pgMissW`), and the **shaky** bar: a unit met and not learned is shaky while its expected success on an average photo
of it, 4 choices, 0.25 + 0.75 · σ(ability − genus offset), is under `OPEN.P` + aim − `TARGET_P`, so a beginner opens a
new unit only once those met are a little more solid (`model.js` `shaky`). A success rate is therefore not a level (see
"What each number measures").

### One difficulty controller

Two levers, one target (after Papoušek, Pelánek & Stanislav 2014):

1. **The format** follows the unit's ability (`model.js` `FORMAT`, `formatAt`, linear between the points
   [ability, look-alike traps, share of single-view questions] `[0, 0, 0]`, `[0.54, 3, 0]`, `[1.8, 3, 0.85]`, flat
   outside): no trap at an ability of 0 or below (a beginner's first question on a unit), then up to all three of the
   wrong choices as look-alike traps by an ability of 0.54 (about 5 right answers from 0), rounded at random between
   (`model.js` `trapsFor`); single-view questions
   from none at 0.54 to 85% at 1.8 (`model.js` `singleP`), so each view is learned on its own (rule L3). Typed questions
   are a third lever with their own rule ("Typed questions").
2. **The photo** makes up the rest: it is aimed `aimOff(k, df)` = logit((aim − 1/k) / (1 − 1/k)) − df below the
   ability (`model.js` `aimOff`), lower still by `PICKD.SINGLE` for one view alone, so that with the format's guess rate
   the question is right with the chance aimed for, whatever its format. `model.js`
   `PICKD = {P: TARGET_P, AIM, SIGMA: 0.7, VARIETY: 3, FLOOR: 0.05, SINGLE: DOM.SINGLE}` (`DOM.SINGLE` = 0.5).

**Plausible choices.** While traps are few (0 or 1), easy wrong choices from other growth forms are not plausible, so
the question counts as a 2- or 3-choice one for the expectation, the bar and the photo's aim (`model.js` `plausibleK`:
the target, the confusable units and those sharing a growth form, at least 2; logged `|kN`). From 2 traps on, every
choice counts. A typed question has no guess rate (`TYPED.k` Infinity).

**Easier questions when a run goes wrong.** While the opening hold is on ("First meeting with a genus"), the ability the
photo and the format aim at is lowered by how far the hold's sum has gone past its threshold, in logits (`model.js`
`holdEase` = min(0, `INTRO.HOLD` − h)): 0 at the threshold, 1 more for each answer's worth of misses beyond it. Never on
an exam question.

### Per-format offsets

The players find some formats easier than their guess rate 1/k explains (two plausible choices among four buttons) and
others harder (typed). Each format f gets an offset d_f in logits, added to the app's log-odds:
P(right) = 1/k + (1 − 1/k) σ(ability − difficulty + d_f), positive when easier than the app thought. The sheet fits it
(`core.js` `fmtOffsetsOf`, `fmtFit`; served as `?stats=1` `fmt`) on the trusted answers and their logged expectation e:
Newton's method on d_f with a normal prior N(0, `FMT.SD`²), for a format with `FMT.N` answers or more;
`core.js` `FMT = {N: 20, SD: 1}`. The guess rate stays 1/k (fitted together, the two are not identifiable). The format
of an answer comes from its mode and choices (`core.js` `fmtOf`: `k4`, `k3`, `k2`, `again`, `qduel`, `find`, `typed`, `exam`…;
a format absent counts 0, `core.js` `fmtOff`). The ability steps expect the question with its format's offset, and the
photo's aim takes it (`aimOff(k, df)`), so a 2-choice question that is right more often than 1 in 2 explains no longer
over-credits the ability. Each subject the sheet does not rate (`SUBJECTS` `offsets` false) scores and aims with every
offset at 0 (`model.js` `pfmt`).

### What a question shows

The photos of a question on unit n come from `model.js` `photoSet`:

- **One observation.** Every photo of a question comes from one colony or observation (rule P4); a colony with more of
  the views needed is favoured by the share of views it has. A colony with a single view gives a single-view question,
  never topped up from another.
- **Targeting.** Each photo weighs exp(−x²/2), x = (its difficulty − the target) / its spread, the target being
  ability + shift − `aimOff(k, df)` − `PICKD.SINGLE` (one view alone) − the start's lean. The spread is
  √(`PICKD.SIGMA`² + u / (1 + answers / `CAL.N`)), wider for a photo few players have answered (`model.js` `calSd`).
- **Photos never seen** get a bonus, bigger when the player is doing well on the unit (× (1 + 1.5 × the share right in
  its last 5 answers)) and a reference-level photo × the subject's `calib.ref`; never for who took the photo (rule
  P1). **Photos already shown** weigh e^offset of their photo-memory bucket (`core.js` `MEM`, `memBucket`), so the
  least remembered come first; a colony counts as seen whatever view of it was shown (`model.js` `colonyMem`).
- **Variety.** The colonies of the last 2 questions on the unit weigh × 0.15 (`s.ro`); the best `PICKD.VARIETY`
  colonies are lifted to at least half the top weight, and every colony keeps a floor of `PICKD.FLOOR` of it, shared
  over the subject's `calib.pool` observations in a big pool (`model.js` `drawFloor`).
- **No photo twice in a few questions.** A colony shown or planned in the session's last `RECENT` (10) questions waits
  while the unit has another to show (`model.js` `SEENQ`, `seenAdd`, `leastRecent`, read by `photoSet` and `examSet`;
  never leaving only colonies the draw holds back). In memory only. How and why: docs/decisions/2026-11-19-no-photo-twice.md.
- **Online calibration.** A photo with few answers from all the players is drawn more often, × (1 + `CAL.B` /
  (1 + answers / `CAL.N`)) (`model.js` `calBonus`), multiplying the targeting, never replacing it. A share `CAL.RATE` of
  the questions on a unit the player holds (met, not shaky), never in a comeback, are calibration questions: one view
  alone, drawn among the colonies the player has never seen, the view the players have answered least.
  `model.js` `CAL = {B: 2, N: 2, RATE: 0.3, U: 1}`; u, the prior's variance, is `CAL.U` for the corals and the subject's
  `calib.u` otherwise. Photo exposure, measured: "Photo exposure" below.
- **Views.** A coral question shows colony and close-up with the corallites as a hint, or one view alone; a two-level
  genus shows colony and close-up; the colony slot never shows a photo whose growth form is not visible, unless the
  genus has a single IMR growth form. A fish or sea slug question shows one photo.

**The wrong choices** (`model.js` `distractors`) come from the target's rank only and never repeat a label
(`model.js` `choiceApart`, `choiceNames`). The look-alike traps the format asks for are the units most confused with the
target (`model.js` `confOf`: this player's own record on the pair over every player's, over a prior; a little shuffle
among close scores), only among units the player has met; a player who confuses nothing still gets the pairs other
players confuse most, then the declared look-alikes, so experts keep hard choices. With few traps, the easy choices come
from units the player has met before any other, spread over other growth forms and other IMR lecture groups first
(three mushroom corals beside a massive target would give it away).

**Confusion scores** (`core.js` `confScore`): a pair's mix-up rate when offered together, from a prior worth `CONF.W`
offers: the declared look-alikes (IMR lecture, Coral Finder) `CONF.LOOK`, the same family `CONF.FAM`, a shared growth
form `CONF.FORM`, else `CONF.BASE`. A pair at `CONF.TRAP` or more is a trap. Pooled over every player first
(`model.js` `pooledConf`), then as the prior of this player's own record, worth `CONF.W` offers (`core.js` `pairConf`).
`core.js` `CONF = {W: 8, LOOK: 0.3, FAM: 0.12, FORM: 0.08, BASE: 0.03, TRAP: 0.2, N: 20}`. Performance only, never time.

### Known mix-ups

A question on t among choices that hold a unit this player mixes up with t more than everyone does is that much harder
for them: `core.js` `confGap`, the logit of the player's own score of the pair (shrunk to the pooled one) less the
logit of the pooled score, when higher; the most over the choices (`model.js` `confTerm`). Only with 3 or more
plausible choices. The expectation, the ability step, the bar and the photo's aim all take it (the `cf` of the scorer).
The pooled score is already in the photos' difficulty, so only the player's excess counts.

**Measured on the real log, 2026-11-20** (read-only; the Answers tab's scored rows since 2026-11-06, every subject; players
P1, P2…; the expectation without the term is the logged one with the term added back; one-step counterfactual). The
term acts on 17-20% of scored answers. Overall it cannot be told from no term: 12 players with 20 or more scored
answers, 4,593 answers (834 where the term acts), mean log-loss with the term less without +0.0022 [−0.0034, +0.0078],
sign-flip p 0.41 (corals +0.0032, 11 players; fish +0.0070 [+0.0004, +0.0137], 9 players, exploratory). Where it acts
(834 answers, 11 players), players are right 0.803 while the app expects 0.696 with the term and 0.805 without it
(corals 316 answers: right 0.756, 0.681, 0.751; fish 486: 0.831, 0.702, 0.835); the declared test, 8 players, gives
+0.046 [+0.002, +0.091] in favour of no term, sign-flip p 0.063, not clear; exploratory, against each player's own
baseline, the term's expectation is under by +0.082 [+0.053, +0.112] with the 8 players all the same way (p 0.008).
Zeroing the term on the corals' scored rows moves a unit's bar by +0.30 points on average (6 of 460 records by 5 points
or more, none across the exam threshold) and the global level by 0 to +0.16. This reverses the 88-answer measure of
2026-11-03 that led to the term; a guess, not measured: the per-format offsets and the Again and duels after a mix-up
now teach the pair faster than the term fades. Seeing an overall effect of this size at 95% would take about 24 players
with 20 or more scored answers. A check of the term off is a progress-rule change (rule D5): ROADMAP "After the fixes
of 2026-11-04".

**Look-alikes from the data** (`core.js` `dataLook`, `model.js` `isDataLook`, `dataLooks`): a pair no source declares,
offered together `CONF.N` times or more, whose pooled score reaches `CONF.TRAP`, joins the declared look-alikes in the
duels, the Again and the sheet's "Don't confuse with". A subject's data may seed such a pair (`model.js` `dataSeed`: the
sea slug genera iNaturalist's identifications show); it starts from the declared prior and, unlike a declared pair,
the players' answers can drop it.

### Typed questions

Now and then the player types the name instead of picking one of four: recall, not recognition. The chance is the
unit's typed share from its bar (`core.js` `typedShare`): none below `TYPED.from`, then linear between the points of
`TYPED.at`, flat after the last (`model.js` `typedP`, `TYPED`: from 0.5; [0.5, 0] → [0.8, 0.3] → [0.95, 0.5]). The
mastery exam needs `TYPED.exam` (2) typed right answers among its `EXAM.n`: an exam question is typed while the typed
answers it still needs fill the questions left, else with the unit's usual share, so the format gives nothing away
(`model.js` `examTyped`). A typed answer has no guess rate (`TYPED.k` Infinity; logged `|t`), so a right one moves the
ability more and a miss less. Never a comeback question, an Again or a duel. A name typed within the tolerance but not
exactly is right; the player retypes it once (the spelling step, `quiz.js`), which changes no grading.

### One draw weight

Which unit a question asks (`model.js` `drawW`, `weight`): drawW = 1 − x · c, x = σ(ability − genus offset) the chance
to recognise an average photo of it, c = m / (m + `ELO.n`) how sure the Elo is after m answers. Never asked: 1; badly
known or barely measured: near 1; known and measured: near 1 − x. A unit ready for its next exam question weighs 1, one
whose exam waits between two questions × 0.05; one asked in the last 4 questions × 0.1, and the same unit never twice
in a row while others exist, short of ten draws in a row falling on it (`model.js` `nextTarget`).

**"Review"** (`model.js` `level`, `shownLevel`): a shaky unit is marked Review, with an amber dot, only once it has
`REVIEW_MIN` (5) answers; before, it is still Learning, so a first session's misses do not read as failures. The game
gives a shaky unit more questions either way.

### Which genus comes next: the progressive path

New units open by the player's results, never by a coded track (rule L3). A photo-quiz question may open a unit (its
card) only when the path allows one (`quiz.js` `planPhoto`): no opening hold, not in the floor of a visit or a comeback
(`model.js` `noOpen`), the pace allows it (`model.js` `openPace`), the last graded answer was right
(`model.js` `openRight`), the unit's gates and the rank share allow it (`model.js` `mayOpen`, `shareRoom`). It then
opens one with the chance `openChance` ("One opening rule"), drawn by `model.js` `openPick` among those not met yet:

1. a unit of a set that opens after the slate (the fish scientific genera) waits while a slate unit may still open
   (`model.js` `laterWaits`), unless the player opened everything at once;
2. the starter core first (units whose record says `first`: the fish starter families), then, for a player who ever
   answered "I'm at IMR", the units the IMR course teaches (`imrName`; `model.js` `imrSaid`);
3. a ★ unit waits for its references ("Starred genera after their reference");
4. a group partner of a unit already met comes next ("Confusion groups"); otherwise a new group or lone unit is drawn,
   then its member, each with the weight exp(−`OPEN.T` × trust × (genus offset − the lowest)) × the commonness factor
   (`model.js` `easyWeights`): the easiest first, softly, and the most common first ("Common first").

**Trusted only as far as the data goes.** `model.js` `easyTrust`: the weighed answers behind the photo ratings, plus
`PDIFF.W` per judged photo, over `OPEN.DATA`, at most 1. Without data every genus offset is 0 and the order is random.

### One opening rule

`model.js` `openChance` = max(0, 1 − shaky units open / `OPEN.K`): a slope, and a work-in-progress limit (nothing opens
while `OPEN.K` units met are shaky). Only units open now take a place: one closed again by "One at a time" does not.
`model.js` `OPEN = {K: 8, P: 0.6, T: 3, DATA: 300, MAX: 3, WIN: 15, STUCK: 10, STUCK_FROM: 200}`.

**Opening pace** (`model.js` `openRecent`, `openPace`): no new unit while one opened on a card in the last `OPEN.WIN`
answers has not been asked since its card, nor once `OPEN.MAX` have opened in that window: about 3 new units per 15
answers at most, whatever `openChance` says. A unit opened on its card and not asked since is asked as soon as it is
ready (`openDue`). A level's group of `INTRO.START` (4, "A level opens in a group") counts as four cards: it fills the
window, so no other card comes until its four are asked and it is out of the window (15 answers), as wanted. "Asked since its card" (`askedOpen`: an answer at or after the card's time) is what every reader
waiting for a card's question reads (the pace, readiness, the fish circle 2, the bonus offer, the all-met card): answers
given before the card (a live game's, those before a card that reopens a unit) are evidence, never its question.

### A unit stuck shaky

Once the player has `OPEN.STUCK_FROM` answers in the subject, a unit still shaky after `OPEN.STUCK` answers of its own
stays shaky (marked Review, given more questions) but no longer takes a place among the `OPEN.K`: one hard unit does not
hold the rest of the path back. Every subject.

### One genus difficulty

One estimate of a unit's difficulty everywhere (`model.js` `genusDiff`: the draw weight, shaky, the comeback's
stability, the opening's order, the bar's population): the sheet's genus offset (`?stats=1` `gd`, the hierarchical photo
Elo's shared part of its photos' difficulty: "Hierarchical photo Elo" below), plus, for a unit with judged photos, the
mean of their judged-ease priors. Adding or curating out a photo never moves it; 0 before the sheet's first reply.

### Common first

The opening weight of each unit not met yet is multiplied by √((1 + cm) / (1 + the median cm of those units))
(`core.js` `commonFactor`), cm how common it is near Dauin (data.json `cm`, `tools/commonness.py` from iNaturalist;
for the fish, fish.json). No constant: the square root damps it, the median makes it relative to what is left; a unit
without cm counts as the median.

### Starred genera after their reference

A ★ genus (a look-alike on the slate that the IMR surveys do not track: rule L5) opens only once the surveyed genera its
card compares it to are met (`core.js` `starWaits`, `starRefs`, from data.json `look`); its card names them ("★
look-alike of …", `model.js` `starNote`). Should every unit left wait, they all open, so nothing is blocked for good.

### Confusion groups

Look-alike units open close together (`model.js` `groupsOfRank`, `groupsNow`). The units of one rank in play are
grouped the same way for every player, recomputed with the pooled statistics: first the declared look-alike pairs
merge, the most confused first, while a group stays at `GROUP.MAX` (3) units or fewer; then average linkage on the
pooled confusion score, while the two groups' mean is `CONF.TRAP` or more and the group stays at `GROUP.MAX`. Once a
group has a member open, its other members are the next openings, one at a time. A unit's mastery exam waits until its
group partners that can open are met (`model.js` `matesLeft`, `examOn`).

### An opening only after a right answer

A new unit must not feel like a reward for a miss: the path opens one only when the last graded answer of the subject,
in any game, was right, or there was none (`model.js` `openRight`, reading `P['~level'].h`). The opening is deferred,
not lost. A miss drops the questions planned ahead (`quiz.js` `dropPlans`), and a planned question is checked again when
it shows.

### First meeting with a genus

- **Cards.** A player starting from zero first meets `INTRO.START` units on cards (name, cover photo, ID tips) and is
  asked about those (`quiz.js` `introStart`); then new units come one at a time, each on its card, never as the answer of
  the question right after it: a unit met on a single card can be asked from `INTRO.GAP` answers on (`model.js`
  `introReady`). A level below the subject's own (species, scientific genera) starts the same way, with `INTRO.START`
  close units on cards together ("A level opens in a group"). Its record: `reefid-sync-<subject>-intro`, synced, {unit: [answers then, ready at once, time, kind]}.
  `model.js` `INTRO`: START 4, GAP 2, HOLD 1.5, SLACK 0.1.
- **Held while the player falls behind** (`model.js` `holdStep`, `introHold`): no new card while a CUSUM of how far the
  answers fall below the success the game expected (each answer's e), less `INTRO.SLACK` an answer and never below 0, is
  `INTRO.HOLD` or more. A run of misses adds up however long it lasts; right answers pay it back by what they beat the
  expectation by; the slack keeps a player the game slightly overrates from being held for good. One per subject, kept
  on the device (`reefid-hold`, `reefid-fish-hold`…) and, signed in, rebuilt by the sheet from every answer of that
  subject since its last reset (`model.js` `holdSync`, the sheet's `hold_`; every subject from `sync.js` `HOLDS_SHEET`,
  the real-log check in [its record](decisions/2026-11-20-one-hold-path-app.md)). While it is on the questions are easier ("Easier questions when a run goes wrong").
- **"I've had the IMR lecture": Open all** (`model.js` `introAll`): on the first cards and in My progress, one tap
  opens every unit the lecture teaches (`UNITS` core: the corals' slate, the fish circle 1) without cards; the bonus
  genera and the later fish circles still open one at a time.
- **Back to one at a time** (`model.js` `backDue`, `introBack`): after Open all the same CUSUM runs from 0; once it
  reaches 2 × `INTRO.HOLD`, a card offers "Keep them all" or "One at a time", which closes every unit Open all opened
  until the path opens it again on its card, its progress kept. Offered once.
- **After a break**: no unit opens during the floor of a new visit or a comeback ("Comeback after a break").
- **Choices among the units met**: the wrong choices come from units met first ("What a question shows"). The Duel tab
  and the other games open nothing ("One progression path for every game").

### One progression path for every game

Only the photo quiz opens units (its cards, the ★ rule). Every other game (the Duel tab, the custom quiz, Learn's
drills and lab games) draws from the units the player has unlocked, met on the path and ready (`model.js` `unlocked`),
and opens none (rule L4); wrong choices may name any unit, as the quiz's do. A live game asks the trainer's set; its
answers on units not unlocked count and open nothing (rule L4): the unit is marked closed (`model.js` `introLive`: the
mark of One at a time with no time) until the path opens it on its card, with its answers.

### The first-launch question

One forced choice per subject (`SUBJECTS` `start`: its words), in the welcome tour before the first question, or on a
card before the next quiz question for a player who skipped the tour. It sets a few variables of the model, never a
path (rule L10): `core.js` `CHOICE.opts` new {p: 0, basics: 1}, imr {p: 0.5, basics: 0}, know {p: 1.25, basics: 0}.
p is the level the answers are shrunk towards in `core.js` `playerStart` (hence the first questions on each new unit
and, through shaky, the pace of the opening); basics offers the subject's basics module first. "new" is the default
player (a new player is a beginner). A player with `CHOICE.ASK` (50) answers or more is not asked: the answer is
inferred from the global level, the option whose `START.W` × p is nearest (`core.js` `startInfer`). Kept per subject in
`reefid-sync-<subject>-start` (`core.js` `startKey`), synced, with its history, so a replay uses the answer in force at
each answer (`model.js` `startSet`, `startMerge`; `core.js` `startUnion`).

**The fallback test, redesigned around the global level** (`core.js` `startCheck`, `model.js` `startStep`, `startDue`).
Everyone may have picked wrong, so the answers after the choice are checked, at `CHOICE.AT` = 40 and 60 answers only.
Each answer predicts a band of levels, its edges midway between the priors (`core.js` `startBand`: new under 0.25, IMR
course 0.25 to 0.875, know well above). With the global level and its standard error over the window:

- **Lower** ('lo', only for the answers with a floor): the level is below the floor with one-sided 80% confidence
  (`CHOICE.ZL` = 0.84), or the opening hold fired in the window. Its card is a gentle offer: the basics module (taking
  it moves the variables one band down silently, the answer kept: `model.js` `startEase`), or a lower answer.
- **Higher** ('hi'): with `CHOICE.MET` (10) slate units met, the level is above the ceiling with 95% confidence
  (`CHOICE.Z` = 1.96) and, as a guard, the level fitted on each unit's first answer alone is above it too (`core.js`
  `levelFit`): a player who did well only on the few units met is not moved up.

A card shows once per answer and direction, never the opposite of the last move made on a fallback card, never for an
inferred answer, and never for a subject whose units say `startFb` false (the fish and the sea slugs, until their
level is better calibrated).

**The fish values** (checked 2026-11-20, simulation only: [review](reviews/2026-11-20-fish-welcome-values-check.md)):
the fish use the corals' `CHOICE.opts`. On the fish profiles of `tools/learnprof.js` (assumptions, not fits), the first
20 answers' surprise under the truthful answer: "new" holds (beginner −0.01; corals 0.08); "imr" and "know"
under-predict the lecture RA, strong RA and expert (0.11 to 0.12), as much as on the corals (0.09 to 0.14). The bands
do not fit the levels in either subject; on the fish, at answer 60 the beginner is at 1.13 (corals 0.76) and the
lecture RA at 1.98, so with today's bands the cards would offer "higher" to 7 of 10 truthful lecture RAs. Recommended
(not built): keep the shared values and the fish's cards off; refit the bands on real fish players before turning the
cards on.

### Comeback after a break

Time is used here and only here (rule L1): progress, mastery and ability never decay. A break is expected to have cost
some recall, and the first answers after it measure how much.

- **Recall** t days after a unit's last answer (`s.at`), FSRS's power curve: R = (1 + F · t / S)^C (`model.js`
  `recallOf`). **Stability** S, in days: from `FSRS.S0` to `FSRS.S1`, log-linear in x = σ(ability − genus offset) (1
  once learned), times `FSRS.G` for each further day the unit was answered right (`s.dd`: spaced days count, not answers
  in one sitting; `model.js` `stability`). `model.js` `FSRS = {F: 19 / 81, C: -0.5, S0: 0.4, S1: 15.7, G: 2.5}`.
- **Rust**: the right answers the break is expected to have cost, summed over the units answered and not closed
  (`model.js` `rustOf`, `rustNow`, `cbPlay`: a live game's units before their card start no comeback). A comeback starts at a new visit (an answer `SESSION.GAP`, 30 minutes, after the last) whose gap
  left rust.
- **Its questions** (`model.js` `comebackOf`): units answered right, the surest half until one is right in this
  comeback, then the most rusted half; the player's usual choices; photos aimed at ability + ln R; no card, duel, exam
  or calibration question; logged `|c`. The answer's expectation and miss weight take the recall.
- **It ends by the answers** (`model.js` `comebackStep`): a CUSUM like the opening hold's, each answer allowed the rust
  it repairs plus `INTRO.SLACK`. **The comeback's tolerance**: that slack keeps a player slightly below expectation
  from staying in it for good.
- **A new visit opens nothing at first**: during the first `COMEBACK.FLOOR` (10) answers of a new visit, and during a
  comeback, no unit opens (`model.js` `noOpen`). Neither applies with fewer than 2 units answered right. The opening hold
  counts every comeback answer with the expectation it really had.

Kept on the device (`reefid-comeback`); the times per unit (`s.at`, `s.dd`, `s.dl`) are in the synced progress.

### One contrast queue

The "Again: A or B?" after a mix-up and the look-alike duels slipped into the photo quiz are one kind of question, a
2-choice contrast of a look-alike pair, under one rule (`quiz.js` `CONTRAST = {P: 0.1, GAP: 2, Q: 3}`):

- A mix-up in the photo quiz queues its pair (`quiz.js` `rematchAdd`: up to `CONTRAST.Q` pairs, the oldest first; a pair
  already waiting is not queued twice; with the queue full a new mix-up waits for its next miss). Its **Again** comes
  `CONTRAST.GAP` questions after the mix-up, on a unit of the pair met and ready.
- With nothing queued, a question becomes a **duel** with the chance `CONTRAST.P`, on a pair picked as the Duel tab picks
  (`quiz.js` `duelPick`: the player's own mix-ups still made weigh × 3, pairs players often confuse and the classic
  look-alikes × 2), both units met and ready, never the pair of the previous contrast question. Not when the question
  opens a unit, not in a comeback. Logged `quiz|d|k2`.
- Two contrast questions are at least `CONTRAST.GAP` questions apart. Duels come from the first answers on.

**"Again: A or B?" rated as 2 choices**: an Again or a duel is scored with k = 2 (logged `|k2`), its photo aimed for the
target with 2 choices, in its own format (`again`, `qduel`).

### Look-alike duels slipped into the photo quiz

The duel of "One contrast queue": a pair from the subject's look-alike pairs (`UNITS` pairs: for the corals the
declared look-alikes, Millepora's and the bonus genera's with the slate look-alike the Coral Finder names) and the
look-alikes from the data, never two units of one label (`model.js` `choiceNames`). A right answer counts for the duel
achievement as one in the Duel tab or a right Again does (`core.js` `contrastQ`).

### Find the X slipped into the fish quiz

One name, four photos: the player taps the one that shows it. Only for a subject whose units have tiles (the fish's
square crops around the fish, `UNITS` tiles; none for the corals; the sea slugs declare the same `tiles` and will play it
once their photos carry the animal's box, Q437) and only on units of the subject's own rank
(`quiz.js` `planFind`). It takes the contrast slot: the chance `FIND.P` (0.05), spaced as the contrast questions,
never with a card, in a comeback or with a mix-up queued. The unit and its three others are met and ready, the
look-alikes first (`model.js` `distractors` with every trap); each photo drawn as the quiz draws a unit's, among its
tiles. Scored as a quiz answer with 4 choices (the photo of another unit tapped counts as that unit given, rule L2),
logged `|f` with the photo tapped (`pa`). A subject or player with no tile draws exactly as without it.
It is a format of its own, `find` (`core.js` `fmtOf`, `analysis.js` `FORMATS`): its photo is aimed with the `find`
offset and the answer scored with it, and the sheet fits that offset on Find the X answers alone, never in `k4`. Today
it counts 0 wherever it is played, as every format offset does for a subject the sheet does not rate (`model.js`
`pfmt`); it applies once that subject's format offsets are read.

### The Duel tab when the hold sets in

The photo quiz eases its questions while the opening hold is on; the Duel tab keeps drilling the same pair, but eases
its photos the same way (`model.js` `holdEase`). The first time in a duel run that an answer takes the hold's sum from
below `INTRO.HOLD` to `INTRO.HOLD` or more (`quiz.js` `reliefNote`, `reliefDue`), the next break at Next offers a step
back: compare the two side by side, mix in other units (the photo quiz), or keep drilling. At most once a run (from the
page's opening until it is left), no numbers on it, an out-of-game prompt like the others (`quiz.js` `reliefArm`).

### Custom quiz: the photo quiz on the genera the player picks

The photo quiz limited to the units the player picks among those unlocked (`model.js` `customOf`, `CUSTOM`; at least
`CUSTOM.MIN` (2); `quiz.js` `quizCustom`), with every rule of the photo quiz but these:

- **The unit asked** (`model.js` `customDraw`): any selected unit, weighed as the quiz weighs the units met; no opening.
- **The wrong choices** (`model.js` `customChoices`): from the selection first, with the quiz's rules, so a selected
  look-alike group drills itself; under 4 units, topped up from the other unlocked units. Scored with the choices really
  shown: the look-alikes among them decide the plausible k.
- **No mastery exam** (rule L9): the selection may hold none of a unit's look-alikes, so passing there would prove
  nothing; the exam comes in the photo quiz.
- **A comeback** runs there only when at least 2 of its units were answered right.
- **A reminder of the path, once**: after `LEFTN.AT` (100) custom answers since the last photo-quiz answer, while units
  may still open and the hold is off, a card says how many new units wait in the Quiz (`quiz.js` `LEFTN`).
- **Picking**: by IMR group, or **My mix-ups** (`model.js` `mixClusters`: the player's own confusions clustered, the
  heaviest pair first, at most `CUSTOM.CLUSTER` (6) units a cluster; the declared look-alikes weighed by the pooled
  score for a player with no mix-up yet). Logged `quiz|s`, rated as any photo-quiz answer.

### What the players say about the difficulty

Now and then, at a natural break between an answer and the next question, a one-tap question (`quiz.js` `pulseAsk`,
`PULSE`; its bank `core.js` `PULSEQ`: too easy or too hard, the flow channels, harder photos, fun, frustration,
boredom; asked in rounds, never the same wording twice in a row). First after `PULSE.FIRST` (35) answers, then every
`PULSE.EVERY` (40), twice that after a "Not now"; never early in a session (at least `PULSE.SESS_N`, 15 answers,
and `PULSE.SESS_MS`, 5 minutes, into it). In every subject (an engine feature, Pierre, 2026-11-19), in the photo quiz or the Duel tab;
the admin reads each subject's answers apart, by the page each was given on. The out-of-game prompts (the sign-in card, this question, the cards about which units are in play) are at least
`PROMPT.GAP` (10) answers apart and never shown over a card (`quiz.js` `PROMPT`, `promptOk`). The answer goes to the sheet as an event with what the game knew then (mode, answers this visit, recent right
%, level, units met); the showing and "Not now" are logged too, for the response rate. Nothing in the game changes with
it.

### Logged for the admin's player journey

The mode of each answer says what the question was ([spec/sync.md](spec/sync.md) "Mode"; what each counts:
[spec/quiz.md](spec/quiz.md#what-each-mode-counts)); the cards keep their kind and time; Open all and the back card
keep their choice. The admin's player journey reads them.

### Millepora and the bonus genera

Millepora (fire coral, not a hard coral but on the IMR benthic slate: `core.js` `BENTHIC`) counts like a slate genus in
the games and the progress. The bonus genera (`core.js` `BONUS`: Coral Finder genera common at Dauin with a look-alike
on the slate) are opt-in: offered once, by a card, when every slate genus has been asked; ⚙ Bonus genera turns them on
or off any time (off keeps their progress). Once on they open like the others, one at a time, and never count in the
progress (rule L6).

### The domain-score bar

A unit's bar is the share of all its possible photos, easy to hard, the player would name right, one photo alone and
typed, as far as **their own answers on that unit** have shown: never the global level, never another unit. It is the
IRT domain score over the unit's photo population (a photo's difficulty d ~ N(the genus offset, `DOM.TAU`²), so adding
photos moves no bar), estimated as the posterior expectation on a grid of abilities (`core.js` `domStep`, `domUpdate`,
`domScore`, `domBar`):

- **The prior**: N(`DOM.M0`, `DOM.SD0`²) for a unit never answered: most players start a unit not knowing it.
- **Each own answer** multiplies in its likelihood, format-aware (guess rate 1/k, none typed; the format's offset), with
  the photo's difficulty, memory and mix-ups as the game scored them, and the recall after a break. With a logistic
  likelihood a miss can only move the posterior down. Before each own answer the posterior drifts by `DOM.Q` (the
  process noise of a Kalman filter), so old answers fade and a unit learned late is credited.
- **Stored** at each own answer: the log posterior on the grid (`s.dp`, relative to its top, clipped at −`DOM.CLIP`) and
  the bar (`s.ds`). The bar moves only when the player answers or a replay rebuilds it, never when the photo statistics
  change, and only the answer's way: a right answer never lowers it, a miss never raises it.
- **Zero for a unit never answered**: below a knee at `DOM.KNEE` × the prior's own domain score (or halfway to 1 for a
  very easy unit) the bar is a straight ramp from 0 at the prior's score, so it reaches every value up to 1.
- **The unit given in a mix-up is a false alarm** (`core.js` `faOf`): naming n for another unit's photo says the player
  answers n too readily, not that they fail on n's photos. The bar reads Pr = H − FA (two-high-threshold corrected
  recognition): H the domain score, FA the times n was given for another unit's photo over the questions where n was a
  possible answer (offered, or any typed question of its rank). `core.js` `barOf` = min(0.95, max(0, `s.ds` − FA)).

`core.js` `DOM = {LO: -4, STEP: 0.5, N: 21, M0: -2, SD0: 1.5, TAU: 0.5, SINGLE: 0.5, Q: 0.1, EX: 0.85, KEEP: 0.8, CLIP: 30, KNEE: 2}`.
The dynamic bar runs from 0 to 95%; every consumer reads it through `core.js` `barOf`, `examOpen` and `keepsMark`.

**The levels** (`model.js` `MASTERY`, `LV_AT`, `lvStep`): named points on the bar, a diver's ladder: Snorkeler under
50%, Open Water from 50%, Advanced from 80%, Divemaster from the exam's entry (`DOM.EX`, 85%, with pair coverage),
Instructor once the exam is passed (learned, `s.mx`). `model.js` `LV_AT = [0.5, 0.8, DOM.EX]`.

### Progress (moving average) and mastery

**The mastery exam** (rule L9; `model.js` `EXAM = {n: 5, gap: 8}`, `examOn`, `examReady`, `examSet`). It opens on a
unit once its bar (H − FA) reaches `DOM.EX`, it has been compared with each of its declared look-alikes the player can be
asked, either way, offered together or mixed up (pair coverage: `core.js` `looksLeft`, `model.js` `examLooks`), and its
confusion-group partners that can open are met; a unit whose record says `noex` (a fish species) has none. Then
`EXAM.n` questions on it are slipped into the photo quiz, unannounced and counted nowhere on screen, at least
`EXAM.gap` other answers apart (recognition, not short-term memory). Each is as hard as the game gets: one photo alone,
the hardest of its view, the views taking turns, 3 look-alike traps; an observation of the player's reserve never shown
to them first, else an observation never shown, else the least seen of those never answered right (`model.js`
`examSet`; "The reserve in the game"). `TYPED.exam` of them are typed
("Typed questions"). All right, with a right answer on each variant group the unit has (`model.js` `examPassed`,
`varLeft`): the unit is learned, 100%. Any miss on the unit, or the unit given for another, ends the exam; it starts
again from the entry. On the bar, each exam question passed fills a fifth of what is left to 100%, at most four of them
before the exam is passed (`core.js` `scoreOf`). Never in the custom quiz. The sheet's replay keeps the same counts
(`core.js` `MX_EXAM = {n: 5, typed: 2}`, checked against `EXAM` and `TYPED` by the tests).

**Keeping the mark** (`core.js` `keepsMark`, `model.js` `mxKept`): a learned unit stays learned while its bar stays at
`DOM.KEEP` or above after a miss (about one miss below the entry): a single slip does not take it away, a second one
before right answers bring it back up does, and the exam comes back. Tested only at a miss, in the game and in the
replay alike.

**The former moving average** (`core.js` `PROG = {A: 0.15, M: 0.8, LOOK: 0.5, OLD: 0.67}`, `pgStep`, `pgOf`): a
record not yet rebuilt under the domain-score rules (no `s.dp`) keeps `s.pg`, an exponential moving average of its
answers weighed by what each proves (`core.js` `pgRightW`, `pgMissW`, `pgMemW`): a right answer s.pg += A · w · (1 −
s.pg), a miss s.pg −= A · w · s.pg. Its bar is 95% × s.pg / `PROG.M`, its exam opens at `PROG.M` and its mark keeps
while s.pg ≥ `PROG.M` × (1 − `PROG.A`). A replay under the current rules rebuilds such a record; for a subject the sheet
does not replay on the device, the record is rebuilt from its own counts, silently, once (`model.js` `domRecalcAll`,
`core.js` `domFromCounts`). A learned mark passed under the model before the moving average (Bayesian Knowledge
Tracing, a record with neither `s.pg` nor `s.ds`) is dropped (`core.js` `afterBkt`).

### The log, the only reference for progress

The answer log is the reference (rule D9). The sheet replays each player's whole log under the rules in force
(`core.js` `replayProgress`, `replayedOf`; "Full replay" below), whenever a rules version is added (`core.js` `RVS`, the
fish's `FISH_RVS`, the sea slugs' `SEASLUG_RVS`; rule D5), and every device adopts the replay once (`sync.js`
`replayAdopt`). The replay's record of a unit and its answer count win over the saved copy, also when the copy holds
more answers; a unit the log has no answer on loses the answers the copy counts. There is no floor: a bar may go down.
A recalculation is silent, a learned mark taken away included (rule D6), and every leaderboard follows at once (rule D8).

### Fish on the same model

The fish run on the same engine, with no fish-specific code (rules L6, S1); what differs is data and `SUBJECTS` and
`UNITS` settings.

- **Unit**: a family of the reef fish identification book (`f:Damselfishes`), IMR's name shown beside its own; later the
  scientific genera and the species. The wrong choices start in other groups of the identification key (as coral growth
  forms) and the look-alikes come in as a family is learned. One photo per question.
- **Circles** (fish.json, a family's best species' circle; `app.js` `treeGate`): 1, the families the IMR course teaches;
  2, open once every circle-1 family has been asked; 3, the families beyond the course, offered by a card once circle 1
  reaches its gate (its Entries component at 55%, or, without the global score, the plain mean at 50%:
  `core.js` `SUBJECTS` `gate`, `TREE_GATE = {c3: {entries: 0.55, mean: 0.5}}`; `app.js` `treeC3`), open on the player's yes (or in My progress any time), offered again
  `OPEN_AGAIN` (200) answers after a "Not now", then never. Every circle counts in the progress, open or not.
- **Winks**: an unmistakable fish (a whale shark) as a rare surprise card in the photo quiz, its name among 3 absurd
  choices: never counted anywhere (logged with the mode `WINK_MODE`, which every reader of the log leaves out). Wink i is
  due from `WINK.AT[i]` answers and at least the gap between the first two after the last one (`quiz.js`
  `WINK = {AT: [200, 400]}`, `winkDue`), once per player across devices.
- **No level-change card** at 40 and 60 answers (`startFb` false), and no one-tap difficulty question.

### Fish: the starter core and judged photos

- **The starter core**: the families whose record says `first` (fish.json `start`: the Butterflyfishes, Angelfishes,
  Damselfishes and Surgeonfishes) open before any other (`model.js` `openPick`).
- **Fish photos judged**: every fish photo carries a judged ease from 1 (hard) to 5 (very easy) (judging/FISH.md). It is
  the photo's prior before any answer: its genus offset + (`PDIFF.MID` − ease) × the subject's `calib.ease`
  (`core.js` `CALIB`, ease 0.5: one standard deviation of a photo's own difficulty around its unit), fading as answers
  come, weighing `PDIFF.W` answers (`model.js` `photoDiff`, `PDIFF = {W: 5, MID: 3}`). The same prior gives each unit its
  difficulty, so judged units open easiest first from the first card, and no photo is ever walled off.
- **The first questions on a unit** lean towards its easy photos: the target sits `calib.early` logits lower, fading as
  `PDIFF.W` / (`PDIFF.W` + the answers on it) (`model.js` `photoSet`). The fish's and the sea slugs' `calib` =
  {ref: 3, early: 1.5, u: 0.25, pool: 30} (pool 20 for the sea slugs); the corals keep `core.js`
  `CALIB = {ease: 0.5, ref: 1, early: 0, pool: Infinity}`.

### Fish: easy, reference-like photos first, whoever took them

The order a unit's photos are met in, where an order matters (the card's photo, the lists, the sheets: `core.js`
`easyRank`): reference-level photos first (`core.js` `refLevel`: judged 4-5 with the reference look: profile, whole,
good light, true colours, sharp, one kind of fish; never its route in), then by ease, then the most reference-like
(`core.js` `refScore`), then a fixed hash of the file name, never by who took it (rule P1). In the draw a
reference-level photo never seen weighs `calib.ref` (3) times more.

### The fish draw in big pools

A fish family may have hundreds of photos. A photo nobody has answered is trusted to one ease step's spread
(`calib.u` 0.25 instead of `CAL.U`), so the judged ease leads the targeting while answers are few, and the draw's floor is
shared over `calib.pool` (30) observations (`model.js` `drawFloor`), so a pool of 1,000 photos favours its easy ones as a
pool of 30 does.

### Rarely under ease 4 before Open Water

Until a unit reaches Open Water (`LV_AT[0]`), its photos judged under `RARE.E` (or its `RARE.FEW` easiest when it has
fewer) make at most `RARE.SHARE` of the photos drawn, whatever their number (`model.js` `rareCap`, applied last, to the
choice of the observation and of its photo): no wall, they still come, rarely. `model.js`
`RARE = {E: 4, FEW: 3, SHARE: 0.1}`. Only on units of the subject's own rank (the fish families, the sea slug genera:
`model.js` `rareOn`); photos with no judged ease (every coral photo) are never capped.

### Juveniles and colour phases on their unit's mastery

A variant is a slice of a unit's photos that asks the same name: its juveniles, its sexes and colour phases. It has no
progress of its own: it comes as the unit asked is mastered.

- **The kinds** (`core.js` `varKindOf`, `VAR_KINDS`): `jE` an early-class juvenile (its family's class A, or named in its
  early list), `j` any other juvenile, `jL` a late-class one (class B, or named late), `ph` a sex or colour phase.
- **The ramp** (`core.js` `varRamp`, `VAR_AT`): a variant photo weighs 0 in the draw below its kind's `from` on the
  unit's bar, then rises in a straight line to full weight at `full`. `core.js`
  `VAR_AT = {jE: [0, 0], j: [0.5, 0.8], jL: [0.8, 0.8], ph: [0.5, 0.8]}`; a family may override a kind on its record
  (fish.json `varAt`). Weights only: the prior and the scoring are untouched.
- **Never a wall**: nothing is held back on a unit with fewer than `PICKD.VARIETY` (3) observations at full weight
  (`model.js` `varOf`; `core.js` `VAR_FULL`).
- **"Learned" asks each variant group** (`core.js` `VAR_GROUPS`: juveniles, sexes and colour phases): the exam is passed
  only once each group the unit has, released by its mastery, has a right answer; while one is left the exam draws that
  group's photo (`model.js` `varLeft`, `examSet`). The sheet's replay applies the same rule from the log (`core.js`
  `varLeftOf`, `treeVarTable`), so a learned mark whose unit has a group with no right answer is taken away for every
  player at once (rules D8, D9), silently.

**Juveniles and colour phases in stages** was the first build of this path, replaced by the ramp above; its measured
record is in the [notebook](archive/learning-notebook.md).

### The mimicry class

A photo of a species a source says resembles another one comes in once the player has met the species it resembles,
so the trap arrives with its explanation. Why and who decided: the
[decision record](decisions/2026-11-18-variant-classes.md).

- **The pairs** (`tools/fish_lookalikes.json`, hand-kept; `tools/build_fish.py` `lookalikes` checks it and writes
  `fish.json` `lookalikes`): two species of the game, the kind (`resembles` where a source says one resembles the other;
  `confused` for a plain confusion), the stage of each side that resembles (`juvenile` or `all`), the sources that state
  the resemblance (their quotes kept in the hand-kept file) and the marks that tell them apart on a photo: our words, at
  most 80 characters, no digit, never the word "mimic" (a resemblance is a source's claim, FISH_PATH.md), each with its
  sources. The build stops on a mark with no source or quote, a digit, the word mimic, a species out of the game or a
  source never used.
- **In the draw** (`app.js` `mimLay`; `model.js` `MIM_AT`, `mimIn`, `mimOf`, `mimAt`, in `varOf`): the family of each
  resembling species carries its entries (`mim`); a photo of that species at the stage that resembles weighs a ramp on
  the bar of the unit asked: `MIM_AT.met` [0.5, 0.8] once a unit of the species it resembles (its species unit
  `s:<id>`, its genus or its family) is met (`introduced`), `MIM_AT.alone` [0.8, 0.8] while none is, so the photo never
  waits on a unit the player may never open. It replaces the photo's class timing. A pair inside the unit asked holds
  nothing back (two blennies asked as their family: the photo asks the same name as its model), and the unit asked and
  its home never count as the model met. The variety fallback holds as for every variant.
- **The draw only**: the photo's kind and its group for "Learned" stay its phase's (`core.js` `varKindOf`, `varUnit`,
  `varLeftOf`): a resembling juvenile is in the juveniles' group, a resembling adult in none. The sheet's replay and the
  learned marks do not read the class; at the exam's bar every photo of the class is in.
- **The card** (`quiz.js` `mimArm`, `mimShow`, `mimPics`, `mimCardOf`): the first question that shows a photo of the
  class brings its pair's card at the break at Next, before the juvenile card, on the same conditions: the two species
  side by side (named as the player sees them first, `cnFirst`), the marks with their sources, "Resembles" with the
  sources that state it, the credits. Once per pair and subject (`subjDev` `mim`, `TOLD` `mim:<subject>-<pair>`),
  cleared at sign-out (rule D7).
- **The out-of-region warning** (`fish.json` species `region`: why and its sources; `tools/fish_lookalikes.json`
  `regional`): a photo of a species whose look varies by region, taken outside the Philippines (`loc` `world`), never
  shows on the card; the card takes the form met here first (near Dauin, then the Philippines, the larger views first),
  or waits. Every card photo shows one subject and no watermark (the judged flag `w`). The photo stays in play.
- **The pair drilled** (FISH_PATH.md "Look-alikes at any rank", view 2; the build's choices:
  [decision](decisions/2026-11-19-mimicry-pairs-drilled.md)), per photo, never a declared pair of the two whole units
  (no `look`, no confusion prior, no opening group); a mix-up there counts in the player's own record of the two units,
  as any mix-up does:
  - **A trap** (`model.js` `mimUnit`, `mimTrap`; `quiz.js` `planPhoto`): a question whose photo is of the class puts the
    unit of the species it resembles at the rank asked (its family, genus or species unit) among the choices, met and in
    play (in the custom quiz, selected), in the place of its weakest trap, so the question keeps the traps `trapsFor`
    gave; only on a question with a trap at all (the exam's included), never typed or with its unit's own card. It
    counts as plausible there (`plausibleK`, the logged `|kN`) and as a look-alike among the choices (`pgLook`).
  - **Its duel** (`model.js` `mimPairs`; `quiz.js` `duelPick`): the two families, once the pair's card was shown, with
    the classic look-alikes' weight (× 2), in the duels slipped into the photo quiz and the Duel tab.
  - **Its Again**: a mix-up of a photo of the class with the unit it resembles queues the pair's id with its Again
    (`quiz.js` `rematchAdd` `mim`).
  - **The pair's species**: a duel of the pair or that Again shows, on the resembling side, a photo of the class, on the
    other the species resembled at its stage (`model.js` `mimSide`, `mimKeep`), never, as on the card, a photo taken
    outside the region of a species flagged regional; only while that side's draw holds one now (`drawHas`), else any
    photo of the unit.
- **Its marks after a mix-up** ([decision](decisions/2026-11-19-mimicry-marks-feedback.md)): a miss that takes a photo
  of one species of the pair, at the stage that resembles, for the other species' unit at the rank asked, either way
  (`model.js` `mimMix`; in Find the X, the photo tapped taken for the name asked), makes the feedback sheet's one line
  ([spec/quiz.md](spec/quiz.md) "The feedback sheet") from the pair's marks (`quiz.js` `mimMarks`, `fbLine`): the first
  mark of each side, the photo's species first, each species by the name the player sees first, as on the card, "(juvenile)"
  after it when the pair names that side's juveniles (its `st`, never the mark's words): "Pacific mimic surgeon
  (juvenile): A scalpel on the tail base, as every surgeonfish · Pearl-scaled angelfish: A large spine at the lower edge
  of the cheek", their sources small after it (`mimSrc`); a side with no mark left out, a pair with no marks keeps
  the usual line. More opens on the pair's other marks, then the units' own pair line. The feedback only: the draw, the
  scoring, the Again and the log stay as above (no rules version). Any tree subject's pairs take this path (`mimLay`).
- **Not built yet** (ROADMAP "Look-alike pairs between species"): the reverse trap, Find the X on the pair, family
  pairs, the Look-alikes deck for every subject, the admin's ⚠ badge and its lift, the feature frames' default.

Its level-1 checks are in the [notebook](archive/learning-notebook.md) ("The mimicry class: the level-1 check", "The
mimicry pairs drilled: the level-1 check").

### The reserve in the game

Each player has a reserve of their own, in every subject, for an honest mastery exam (rule L9): per unit with an exam,
up to 15 observations this player never sees in practice, asked by their exam first, counted like any answer, logged
`|h`; others practise on them ([spec/reserve.md](spec/reserve.md)). Only from a real surplus (at least 8 per species
and 30 per unit left in practice), never Pierre's own photos, a reference-level one or a card's, never by route or
source (rule P1). The unit's difficulty counts them. Checks: the [notebook](archive/learning-notebook.md).

### Fish: scientific genera, the first step of branch B

The scientific genera of every circle's families are units too (`core.js` `treeGenSets`, `app.js` `treeGenera`): a
photo, then genus names, the sibling genera as look-alikes. Offered to every player as an opt-in set; once on, each
genus opens once its family is at Advanced (`app.js` `sciOpen`). A player who ever answered "I'm at IMR" gets the IMR
genera without the offer, each once its family is at Open Water. **Families met first**: while a slate family may
still open, the genera wait (`model.js` `laterWaits`). Their share of the questions follows "The rank share".

**Do the genera delay the families?** Measured read-only on 2026-11-20 (rated world, fish, `--app truth`, learner
`count`, 5,000 answers; the offer accepted against declined, paired by seed; docs/reviews/2026-11-20-fish-remeasures.md
"The family levels and the genera"). The old delay of about 900 answers is excluded: from the 5th family at Advanced to the
25th, the mean paired differences run from −67 to +89 answers, and no row's 95% interval (5 paired seeds, about ±1.24 sd, so ±55
to ±170) reaches past +240. A smaller delay, up to about 250 answers, is not excluded: an interval's half-width is not a bound on
the delay. The paired differences, in answers, mean (sd):

| nth family at Advanced | beginner | lecture RA |
| --- | --- | --- |
| 5th (fq80a) | +19 (98) | −67 (137) |
| 10th | −17 (87) | −62 (134) |
| 15th (fq80b) | +17 (60) | +5 (94) |
| 20th | +22 (45) | +55 (135) |
| 25th | +89 (119) | +13 (102) |

The 30th family is too noisy to read (sd about 700). Accepting changes what fills the share below the families (genera
in place of species by common name), not the families' own share (64% against 64% at answers 1,001-2,000, beginner).
Beyond reach of these runs: whether a real player's genus answers also teach the family (each simulated unit has its own
knowledge, so any delay seen is dilution) and the app world (the run was cut at its budget). An IMR player's genera
without the offer sit outside the rank share (`app.js` `shareFree`); they take 15% of the lecture RA's answers 301-1,000
and 9% of 1,001-2,000, mostly before the 5th family is at Advanced. Against an arm with `shareFree` empty (10 paired
seeds x 3,000 answers), they delay the lecture RA's 10th family at Advanced by 99 answers [59, 139], the 15th-25th by
about 150-200, consistent with their taking those answers (other effects not ruled out), the shown score unchanged;
where both arms got there by 3,000 answers, the IMR genera reach Open Water 500-850 answers earlier
(docs/reviews/2026-11-21-sharefree-arm.md).

### Fish: the species level, step 1, by common name

One unit per species (`core.js` `treeSpUnits`), named by its common names: the main name shown (the IMR name for a
player at IMR), any listed or regional name right when typed. For each family at Advanced, its species met and the next
one in the family's commonness order open (`app.js` `spPlay`; fish.json `cmi`; the next four while the level opens its
group: "A level opens in a group"), at the opening's usual pace and within the rank share. A species never answered starts from its family's ability; it has no mastery exam (`noex`), so its bar
tops out at 95%. On only once the sheet replays the species units (`sync.js` `SPECIES_SHEET`, rule D4).

### Species by their scientific names (step 2)

The fish and the sea slugs (`core.js` `SUBJECTS` `names`; docs/reviews/2026-11-18-species-step2-plan.md): one unit per
species by its scientific name (`sci:s091`), a tree of its own beside the common names' (Pierre, 2026-11-18: "2 arbres
pédagogiques indépendants"). It hangs from its genus (Q397): for each genus in play at Advanced, its species met and the
next one in the genus's order open (`app.js` `sciPlay`; the next four while the level opens its group), within the rank
share at the genus level; a genus out of play
brings none, their bars kept (Q402 A). A species never answered starts from its genus's ability; no exam yet (`noex`, Q395
comes later). A question's choices and typed names stay among the scientific names (`app.js` `kindRank`). The display
schedule on the unit's own bar: the common name under each scientific name below Open Water, the share of scientific
names alone rising from 0 to 1 up to Advanced, then alone; typed, the usual typed share (`app.js` `sciShow`; starting
values). Typed, the species' own common name or its genus alone is a smaller fault (Q394 A: `app.js` `sciPart`, `core.js`
`PART`), never a gain. On only once the sheet replays them (`sync.js` `SCI_SHEET`, rule D4), both subjects.

### The rank share

A unit that hangs from another (its record's `parent`: a fish genus or species from its family) may open and be asked,
but the units hanging from one level together take a share of the questions set by how much of that level the player
masters (`model.js` `sharesNow`, `shareW`, `shareRoom`): m, the share of the parent level's units in play at their
threshold (`shareAt`, else `LV_AT[SHARE.AT]`, Advanced), and cap = m^`SHARE.POW`. At most that share of the draw goes
to the units hanging from the level, and one more of them opens only while their share is under it. `model.js`
`SHARE = {AT: 1, POW: 2}`. Never capped: the slate, the coral bonus genera, a unit the subject frees (`app.js`
`shareFree`), a unit whose parent is no unit of the game.

### A level opens in a group

Pierre, 2026-11-20 (sea slugs: «aucun intérêt de n'ouvrir qu'une seule espèce et puis demander de l'identifier parmis
d'autres espèces pas ouvertes. Au minimum 4 espèces proches ouvertes»; fish: «il faut au moins 4 items ouverts avant de
commencer à poser des questions. Sinon c'est juste trop facile»; rule L4). A level below the subject's own (its class,
`model.js` `rankKind`: a fish scientific genus, a species by its common or by its scientific name, a sea slug species)
starts as the subject does: `INTRO.START` (4) units on cards together, the question right after on one of them, the
others asked next (`openDue`), so its first questions stand among units opened, never one unit among three never seen.
One engine, no subject named (rule S1); the base (the families, the coral and sea slug genera, the coral bonus genera)
is unchanged.

- **Close units in play** (`app.js` `lvlNext`, in `spPlay` and `sciPlay`): while the level holds fewer than
  `INTRO.START` units met, a parent at its threshold brings its next `INTRO.START` units in its order, not the next one
  alone (a family's scientific genera all come at its Advanced already: `sciOpen`).
- **None before the group can open** (`model.js` `lvlNeed`, `openFresh`): the level needs `INTRO.START` less those met,
  never more than it has with a photo (a level of fewer opens them all: none waits for good). While fewer than that are
  ready to open, each within the rank share as before (`shareRoom`), none of it opens. **The bound on the delay**
  (integrator's call, declared before measuring): the first unit of a level asked no more than 2x later, in answers,
  than before. Waiting also for the share's room for all four at once breached it (rated world, fish, one seed per
  profile, 3,000 answers: the first species 1.2x to 6.9x later, the strong RA's 215 → 1,473 answers), so the declared
  fallback holds: the four open together as soon as each would have had room alone.
- **The group** (`openGroup`): the unit the opening draws (`openPick`), then the units of its class nearest to it, its
  parent's first, then its grandparent's, then any, each drawn as the first cards are (easiest and most common first).
  Shown as first cards (`quiz.js` `introShow`: "The next questions are about these 4", no Open all), recorded as first
  cards (kind `s`, ready at once: no new stored value), and held as a card of the path (`q.lvl`: the opening hold, a right
  answer first, the visit's floor). It fills the opening's window ("Opening pace"); the milestone card (the first species)
  shows on its first card. Every other game sees the four at once through `unlocked()` (rule L4).
- **The rest at once** (`model.js` `levelTop`, from `quiz.js` `introStart`): a level holding units met but fewer than it
  needs (a group left half-way by a reload, a record from before the groups) gets the rest at once, as the subject's
  first cards are completed, from what is ready to open.
- Then the level goes on as before: one unit at a time, at the rank share; the wrong choices of its questions come from
  the units met first (`distractors`), so from the group's.
- Read per level, not per parent: a later parent's first unit is asked among units met of other parents. The other
  reading (each parent opening four of its own) is in ROADMAP.

### Fish: species order, the commonness index

Within a family the species come most-met-first: fish.json `cmi`, a weighted mean of field counts near Dauin, the IMR
cheatsheet's most sighted and iNaturalist's distinct observers around Dauin, shrunk ring by ring
(`tools/fish_commonness.py`; method and sources: docs/FISH_PATH.md "Species order: the commonness index").

### Fish: the global score, built

The fish headline % is one score over the whole path (`core.js` `treeScore`, `treeScoreTree`; `SUBJECTS` fish `score`):
the families on the trunk, every species of those families on the branches, each species weighted by how common it is
near Dauin (`core.js` `rankWeights`: 1/√ of its rank by distinct observers within 40 km), a family by the sum of its
species'. Per species: C = the mean of its common names' bars, S = max(its scientific name's bar, `half` × its genus's
bar), credit = a C + b S + (1 − a − b) C S; raw = `entries` × the families' weighted mean + (1 − `entries`) × the mean
credit; shown as 100 × raw^`pow`. `core.js` `score: {entries: 0.25, a: 11 / 15, b: 0.8, half: 0.5, pow: 0.5}`. A species
with no common name at all counts its scientific value alone. Every unit keeps its own bar; this only adds them up. The
leaderboard ranks by it, and the circle-3 gate reads its circle-1 Entries component.

**Fish: the global score, simulated**: the simulations that set its entries' share and its pace are in the
[notebook](archive/learning-notebook.md).

### Fish: the progress replayed from the answer log

The sheet replays each fish player's progress from their fish answers with the same engine (`SUBJECTS` fish
`replayed`: `core.js` `treeReplayGen`, the units and look-alikes from fish.json, and `treeVarTable`), under the fish's
own rules versions (`core.js` `FISH_RVS`), so a fish change never replays the corals; the sea slugs the same way
(`SEASLUG_RVS`). The log is the only reference ("The log, the only reference for progress").

### Fish achievements, around the global score

Learning milestones only, never time (rule L8), in each subject's own list (`core.js` `FISH_ACH`, `SEASLUG_ACH`; the
corals' `ACH`): families met, families at each level, exams passed, the circles, the fish % every 10 points up to 70%,
the scientific genera, the species named by their common names, and by their scientific names (fspsci1 "Binomial";
fboth25 "Bilingual", 25 species by both names; fdauin20 "Local legend", Dauin's top 20 of circle 1, Q261; at Advanced,
Q262), and fbasics "Fin to tail" (Fish basics done, one 📖 bronze like the corals' Coral basics; earned when the last of the
module's six steps is seen (27 screens, 21 taps on Next, measured on the real page at 390 and 1280 px), never after a
number of answers or an amount of time; its name, tier and words are the
integrator's call, easy to correct). Still to come: fpct100 (with the ultimate exam, Q395). Only those that rest on learned marks (`core.js`
`ACH_LEARN`) are ever taken back, and only when a recalculation takes the mark away. **Fish achievements, simulated**:
their timing was simulated with the real game; the runs are in the [notebook](archive/learning-notebook.md).

**Sea slug achievements**: the same kinds over the sea slugs' genera, families, taxonomic groups and first circle, and
their % every 10 points up to 100% (`core.js` `SEASLUG_ACH`).

## Pooled statistics: photo difficulty and confusions

What the sync sheet learns from every player's answers together, and how the app reads it, as the code runs it today;
every value is the code's, and the code wins where this text and it differ. The studies and measurements behind it,
with their dates, are in the notebook: [docs/archive/learning-notebook.md](archive/learning-notebook.md).

Code: `Code.gs` `stats_` (one pass over a subject's answers, oldest first) and `statsStep_` (one answer), run whole or
a few rows at a time by `statsFold_`; the browser's copy for the admin and the tests is `core.js` `eloReplay`
(`trustOf`, `eloOf`, `genusOffsetsOf`, `confusionOf`), kept in step with the sheet (`tests/core.test.js` compares them).
How the statistics are built, cached and served (the fold, the snapshot, one fold per subject): docs/spec/sync.md
"Pooled photo statistics". `?stats=1` serves `photos` (with each photo's time term: "The photo's time term"), `gd`,
`mem`, `memn`, `conf` and `fmt`. They set how hard each
photo is in every player's game and which choices are traps, so they count only players who really play.

### Who counts and how much an answer weighs

- **Who counts** (`Code.gs` `trusted_`, `TRUST = {N: 10, Z: 1.645}`; `core.js` `trustOf`): a player, signed in or a
  device that never signed in, with `TRUST.N` answers or more whose right answers beat chance with a one-sided z of at
  least `TRUST.Z`, against each question's guess rate (`core.js` `guessOf`: 1/k, ½ in a duel, 0 typed). Trust is judged
  on the player's whole log at each build, and a trusted player's every answer counts. The players and devices the admin
  leaves out of the statistics (`Code.gs` `sxSet_`) count as untrusted, and an answer whose photos belong to another unit
  (`Code.gs` `photoCheck_`) rates no photo. Only trusted answers move the photos, the unit offsets, the memory offsets,
  the confusions and the format offsets.
- **How much an answer weighs**: n / (n + `PHOTO_W.N`) after n answers of the player (`PHOTO_W.N` 10), so a player whose
  level is still uncertain moves the items little (Glicko's idea). The counts the sheet keeps are weighed the same way;
  each photo also carries its plain answer count, for the admin's filters.
- **Everyone starts as a beginner**: the sheet's own player rating starts at `PLAYER0` = −1 (about 45% right on an
  average photo with 4 choices) and moves after every answer, trusted or not, by 0.6 / (1 + n / 40) × the surprise; it
  is the player term of the ratings below, never the app's ability ("Ability per genus (Elo) and the global level").
- **One expectation for everything**: e = g + (1 − g) σ(player − difficulty − memory), the difficulty being the unit's
  offset plus the mean of the question's photo residuals, + 0.5 for a photo shown alone, and the memory the mean offset
  of the question's photos for this player. The photos, the unit offset and the memory offsets all move by the same
  surprise d = right − e.
- **What an answer is**: the photos seen when answering (a corallites hint left closed is not logged with the answer),
  the unit shown, the unit given and the choices offered. Names are matched case-blind.

### Hierarchical photo Elo

A photo's difficulty is its unit's offset G, shared by every photo of the unit, plus its own residual P (the player rule
"global level + genus" of Pelánek et al. 2017, applied to the photos). Each trusted answer, of weight w, moves both:

- P down by 0.8 / (1 + n_photo / 10) / (photos shown) × d × w;
- G down by `GENUS_K` / (1 + n_unit / 10) × d × w, `GENUS_K` 0.4 (`Code.gs` and `core.js` in step);

n being the weighed answers so far (a right answer beyond expectation makes the photo and its unit easier). Both start
at 0, so a photo nobody has answered sits at its unit's offset. A photo's unit is the unit shown (every photo of a
question is of one colony, rule P4), so no data file or per-unit code is needed. `?stats=1` serves each photo's total G + P in `photos` (`{file: [difficulty, weighed answers, weighed right,
answers, unit]}`, the unit whose offset G is in that total, from v189) and the offsets in `gd` (`{unit: [offset,
weighed answers]}`); 0 is an average photo met for the first time. When the unit asked is not the one that last rated
the photo (a fish photo shown at several ranks; a coral genus moved or renamed), the app swaps in the asked unit's
offset and keeps the photo's own P (`model.js` `photoDiff`).

**In the app** (`model.js` `photoDiff`): a photo's difficulty is (n × rating + `PDIFF.W` × prior) / (n + `PDIFF.W`), n
its weighed answers, the prior its unit's `gd` offset plus, for a judged photo, its judged-ease prior ("Fish photos
judged"); a photo nobody has answered is its prior, and every prior is 0 before the sheet's first reply. The photo's
time term is added on top of that blend ("The photo's time term", below). A unit's difficulty is read from the same
offsets ("One genus difficulty"). The real-log replay that dropped the former Easy /
Medium / Hard photo sets and set `GENUS_K`, and its simulation, are in the notebook. The planned next step, one
difficulty split into rank, family, genus, species and photo components, is in ROADMAP "Engine coherence review"; its
offline fit on the real log and the replay of the step-2 candidates (2026-11-21) are in
[reviews/2026-11-21-q316-offline-fit.md](reviews/2026-11-21-q316-offline-fit.md): the coral genus SD and the fish family
SD measured (about 0.8 logits each), the photo, the fish genus and species and Q136's τ not estimable yet; whether the
shared chain predicts the fish answers better or worse than today: the measure cannot tell.

### The photo's time term

Pierre, 2026-11-20: the time of an answer carries difficulty, experts included, even when the answer is right; 2026-11-21
(Q449-Q451): a separate time term per photo that fades by the information of its answers, not by their number, checked
without wrong answers, the enlargement its own term; 06:20, option A: each answer weighs by how steady the times of
players of its level are. Decision record: docs/decisions/2026-11-21-photo-time-term.md. Code: `core.js` `PTIME`,
`ptimeStep`, `ptimeOut`, `ptimeInto`, `ptimeOff` (one implementation, called by `Code.gs` `statsStep_` and by `eloReplay`).

- **z** of a right answer: its log seconds against the player's own median as `rtWeight` takes it ("Response time"), but
  over their earlier timed right answers only (a player who misses often has slow misses in an all-answer median, which
  would make every right answer of theirs look fast: a bias that follows the level), less the mean z of the earlier
  right answers of the same format (`core.js` `fmtCell`: the game, `fmtOf`, the photos shown,
  the rank asked; a fish genus question is slower than a family one), clipped at ±1 (`PTIME.CLIP`). Only right, timed,
  not typed, not enlarged answers of a player who rates the photos ("Who counts and how much an answer weighs").
- **Each answer's weight** is its trust weight over V(L), the variance of z at the player's level L (the sheet's own
  rating before the answer), fitted on the subject's answers so far: V(L) = V̄ exp(β (L − L̄)), β the slope of z² on L
  over its mean, shrunk by its own uncertainty with the players as clusters (max(0, 1 − se² / b²)); β is 0 with fewer
  than 5 players or 500 answers (`PTIME.MIN_P`, `MIN_N`), and the weights' spread is capped at 3 either way (`BMAX`). So
  a steadier player's hesitation weighs more, continuously, with no categories; where the data show no slope the weights
  are equal. One code path for every subject.
- **The time term** = Σ w z / V(L) over (Σ w / V(L) + 1 / `TAU2`), `TAU2` 0.06: the photo's share of the variance, set so
  that a player's own z regresses on the other players' term with a slope near 1 (below).
- **The enlargement term**: enlarged (0/1) less the player's own rate so far ((enlarged + 0.1 × 10) / (answers + 10)), any
  rating answer that logged the mark, right or wrong, weighed by trust, shrunk by 10 answers (`PTIME.E0`, `EM`, `NE`): a
  player who enlarges every photo says little about one, one who never does says more (Bolsinova et al. 2022: a personal
  propensity to take a hint).
- **The fade** (`ptimeOff`): the app adds `PTIME.C` (0.5 logit) × (time term + enlargement term) × I₀ / (I + I₀) to the
  photo's difficulty (`model.js` `photoDiff`, after the blend), I the Fisher information the photo's rating has gathered
  (every rating answer, on the photo Elo's own expectation), I₀ = `PDIFF.W` answers at the game's target. An expert's
  right answer brings almost no information, so a photo answered only by players who never miss keeps its term; a photo
  whose rating has learned from misses lets it go.
- **Served** as the 6th to 8th numbers of the photo's `?stats=1` entry, from sheet `PTIME_SHEET` (rule D4; docs/spec/sync.md
  "Pooled photo statistics"). The draw's targeting, the scoring's d0 (logged in each answer's scoring record), the mastery
  exam's hardest photo and the fish cards' photo order read it through `photoDiff`; the counts (`nAnswers`, the hard-photo
  achievement) do not. The progress replay never reads it (rule D5: no rules version; `tests/ptime.test.js`).

**The checks** (declared before running; the real log read-only, the Answers tab to 2026-11-20 15:50, no row after it on
2026-11-21 06:45; the branch's own `core.js` run in Node on it; players as the unit, per-player means, 95% t, sign-flip
p). W: as built; EQ: the slope forced to 0 (equal weights); NONE: no term. The third run is the one reported; between
the first two, diagnostics changed `TAU2` (0.03 over-shrank: slope 1.95 corals, 1.45 fish; 0.06 gives 1.15 and 0.94),
the fit's support (5 players, 500 answers: the corals' slope swung to −0.41 at 300 answers, then to 0), the rank in the
format cell, and served only the photos with a term; before the third, the rated world (below) led to the habit over
right answers only (`TAU2` 0.06 still gives 1.10 and 0.96). `PTIME.C` stayed at 0.5 (below).

| Check | Corals (12 players) | Fish (9 players) |
| --- | --- | --- |
| The fit: β at the end (weights at L's 10th / 50th / 90th percentile) | 0 after shrinking (raw −0.042): equal weights, the fallback | −0.239 (0.76 / 1 / 1.21) |
| Guardrail G, the app's logged Expected with the term, online, W − NONE (log-loss) | −0.00034 [−0.00071, +0.00004], 11 of 12 better, p 0.076: held | −0.00016 [−0.00041, +0.00008], 5 of 8 better: held |
| C1 agreement: r of a player's own z with the other players' term, W | +0.162 [+0.097, +0.228], 10 of 10 | +0.142 [+0.063, +0.222], 7 of 7 |
| C1, W − EQ | at its fallback (β 0) | +0.0006 [−0.0148, +0.0161]: no worse, the measure cannot tell better |
| C2 the others' term on a player's misses beyond Expected, W − NONE (log-loss) | −0.00093 [−0.00128, −0.00057], 12 of 12 | −0.00023 [−0.00052, +0.00005], 6 of 8 |
| C2, W − EQ | at its fallback (β 0) | +0.00004 [−0.00002, +0.00009]: no worse (bound +0.00007 under +0.002), the measure cannot tell |
| C3 stability, first half of a photo's answers against the second (photos with 4+) | +0.19 [+0.04, +0.31], 201 photos | +0.31 [−0.17, +0.69], 13 photos |

- **What it can conclude.** A photo's time is shared by the players (C1) and carries the misses the other players make
  beyond today's Expected (C2, corals clearly: the others' term, from their right answers only, predicts a player's
  misses in all 12 players), and adding it to what the app predicted does not make the next answer worse (G). This is
  Pierre's fact measured the way Q450 asked, without counting the experts' own misses. Exploratory: fed only by the
  answers at or above the median level, the term still predicts the corals' misses (−0.00068, 11 of 12).
- **What it cannot.** Whether weighing by the level helps: the corals' slope shrinks to 0 (their variance does not fall
  clearly with the level, as in the multifactor study), and the fish's weights move 0.8 to 1.2, too little to show in 9
  players; both "the measure cannot tell", no worse. Sea slugs: one player, "Not enough data yet" (their term is served,
  from that player's answers, shrunk).
- **The size.** At C 0.5 the term moves a question's difficulty by about 0.03 logits (sd over the answers): players will
  hardly meet it yet. Exploratory, after the first run: G keeps improving up to C 6-8 in the mean, but less consistently
  over the players, and a C chosen by leaving one player out is not clear (corals p 0.28, fish p 0.77): C stays 0.5, its
  re-fit in ROADMAP "Time in the photo rating".
- The term's mean over the answers is about 0 (corals −0.0009, fish −0.0004 logits), so no Expected shifts as a whole.

**The rated world** (rule L11 level 2: the draw changes; `--app sheet`, the corals, the four profiles as one population,
3,000 answers; before = `main`, after = the term; declared before running). The world's time noise is the same for every
player, so the weighting sits at its fallback there: these runs test the term and its fade, not option A's weighting. A
first run (A) had the habit over all answers; its guardrails led to the habit over right answers (above), and run B is
the one reported, against the same `main` files.

| Case | Primary: rating error with the term, at 3,000 (down) | Guardrails not held |
| --- | --- | --- |
| `--times rho25` (time intensity correlated 0.25 with difficulty), normal photos, 20 seeds, two looks | 0.6670 → 0.6673, p 0.96: no clear difference | the strong RA's shown score at 1,000: −1.1 points [bound −1.8], breached; held at 3,000 (+0.1) |
| `--times rho0 --gap -0.22` (the time says only the knowledge gap), 20 seeds, two looks; declared cost: rating error +0.02 at most | +0.0064 [+0.0153]: within the declared cost | the strong RA's score at 1,000: −1.4 [−2.6], breached; three other profiles there unclear; all held at 3,000 |
| `--times rho25`, heavy-tailed photos, 10 seeds (declared: guardrails only) | 0.8003 → 0.7832, 9 of 10 seeds down, p 0.033 (exploratory, uncorrected; run A 0.066) | the beginner's score at 1,000: −2.4 [−3.5] and first Open Water, breached; held at 3,000 |

- **What it can conclude.** With normal photos the term neither helps nor harms the ratings, and when the time says only
  the player's knowledge gap, the cost stays inside the bound declared. Exploratory: with heavy-tailed photos the rating
  error went down in 9 of 10 seeds.
- **What it costs.** The strong RA's shown score at 1,000 answers is 1.1 to 1.4 points lower (cases 1 and 2, which share
  one `main` arm: one finding seen twice), and the beginner's 2.4 points lower with heavy-tailed photos; back by 3,000
  answers; every other guardrail holds. The cause is not known. A breach goes to Pierre (rule L11). Run A, with the
  habit over all answers, had the strong RA's breach at −1.8.
- C1 and C2 (above) use the other players' whole log, before and after the answer (a lasting difficulty); only G is
  online, as the app would have read it.

**The app world** (level 1's leg; `node tools/learnsim.js --stats` (the corals' statistics rebuilt from the real log with
the terms, at `PTIME_SHEET`) `--truth gen`, the four profiles, 300 questions; before = `main`). 5 seeds: nothing
breached, 7 cells unclear; one step up to 20 seeds (two looks): nothing breached, 4 cells unclear (the beginner's true
knowledge at 300, −0.011 [−0.024]; the beginner's first Open Water, +15 answers [+49]; the lecture and strong RAs'
longest plateau, +3 and +1 answers): "the measure cannot tell". The fish cannot run there: learnsim feeds only the
corals' statistics, so the fish rest on the real log's guardrail G and the unit tests.
- Compute: about 5 minutes a run of 10 seeds; within the 40-minute cap per case.

### Photo memory

A photo a player has already been shown is easier for them than for a player meeting it the first time. One rule, in the
sheet, the admin and the app (`core.js` `MEM`, `memBucket`, `memFam`, `eloReplay`; `Code.gs` `stats_` in step):

- **Buckets** of the player's history with a photo, [shown, right] (the sheet's `H`, the app's `s.ps`): new, shown never
  right, right once, right twice or more. A question's memory is the mean offset of its photos seen when answering.
- **New is the reference** (offset 0): a photo's rating is its difficulty for a player meeting it the first time, which
  is what the game targets and what the mastery exam shows.
- **Estimated in the same pass** as the photos, on the trusted answers weighed as for the photos: after each answer,
  each bucket its photos fall in moves by the surprise over the information gathered so far plus the prior's (a Newton
  step on the log-likelihood). The prior, `MEM.PRIOR` = [0, −0.5, −0.5, −1.5] (from `PHOTO_W.NEW` 0.5 and
  `PHOTO_W.KNOWN` −1), weighs `MEM.N` = 10 answers at the game's usual chance (80%, 4 choices). Served as `mem`, with
  `memn`, the trusted answers behind each bucket.
- **Per subject** (`model.js` `pmem`): the app reads the sheet's offsets (`PMEM`) for the subject the sheet replays
  with them (`SUBJECTS` `offsets`: the corals), and the prior `MEM.PRIOR` for every other subject; the prior too with an
  older sheet or offline (`core.js` `memOf`).
- **The offsets do not depend on time.** Rule L1's second exception (photo memory) would allow a lag term; none is in
  until the lag table shows enough answers per lag band (ROADMAP "Photo memory that fades with time").

The measurements behind the buckets, the offsets fitted on the real log, and the simulations that chose the weights
below (the corals and the fish) are in the notebook.

**In the app** (`quiz.js` `answer`, `model.js` `famOf`):

- **The expectation** of a question includes the memory of its photos as the player knew them before answering: the
  ability steps and the global level's, the logged `e`, the opening hold and the comeback's CUSUM, and the domain-score
  bar's likelihood (the question's difficulty d0 + memory + mix-ups, "One scorer"). A right answer on a remembered
  photo therefore raises the ability less, and a miss on one lowers it more: the player had been shown that very photo
  and its answer.
- **A record on the former moving average** weighs a right answer on a remembered photo by what memory does not explain
  (`core.js` `pgMemW`): the chance the player had on the same photos new over the chance they had with their memory, at
  most 1 (× 0.93, 0.87 and 0.84 for the three buckets at the game's target with the offsets first fitted). The unit
  wrongly given takes no memory term: the memory is of the unit shown.
- **Spread the repeats** (`model.js` `photoSet`): in the draw a photo already shown weighs × e^offset of its colony's
  bucket (`model.js` `colonyMem`), so the least remembered come first; a soft factor, never a filter ("What a question
  shows"). The targeting reads the photo's difficulty as new. The mastery exam keeps its own rule (a photo never shown
  first).
- **Saved progress recalculated once, silently** (`core.js` `memRecalc`, `model.js` `memRecalcAll`): a record of the
  former moving average not yet under this rule (no `s.pm`) is corrected from its photos [shown, right]: its `pg` takes
  f · pg / (f · pg + 1 − pg), f the mean memory weight of its right answers at the game's target (of a photo's r right
  answers in n shows, r / n count as its first show, the rest as repeats in the photo's bucket now). It never raises a
  bar and leaves a learned unit alone; `s.pm` marks the record, which travels with it between devices and accounts
  (`mergeProgress`, `mergeUsers`), so no record is corrected twice. It runs at load, after each pull of the synced
  progress and before a record's first answer (`quiz.js` `answer`). A record adopted from the sheet's replay carries
  `pm` 1 and is never corrected here: this is the fallback for a device that never reached the sheet.
- **Learned under the former model**: a learned mark on a record with neither `s.pg` nor `s.ds` was passed under
  Bayesian Knowledge Tracing (`core.js` `afterBkt`), whose exam came too early. `memRecalc` drops its `s.mx` and any
  `s.ex` at every call (load, pull, answer), and the replay never keeps it (`core.js` `replayedOf`); the unit keeps its
  bar and takes the exam again. Silent: `model.js` `mxRecalc` tells nothing and the achievements stay
  (`MXL.QUIET`, rule D6).

### Confusions

`conf` holds per pair of units (A before B) [offered together, mixed up], counted on the trusted answers (`core.js`
`confAdd`): each wrong choice offered beside the unit shown is one offer, and a mix-up when it was the answer given; a
typed answer naming another unit is one offer and one mix-up. `core.js` `confusionOf` counts the same, and by
direction (choices only) for the admin. The app turns them into
confusion scores for the traps, the look-alikes from the data and the known mix-ups term (`model.js` `pooledConf`,
`core.js` `confScore`: "What a question shows", "Known mix-ups").

**Format offsets**: `fmt` is fitted in the same pass on the trusted answers (`core.js` `fmtPoint`, `fmtFit`;
"Per-format offsets").

### Each subject's own statistics

Every subject with a game photo pool (`SUBJECTS` `pool`: the corals, the fish, the sea slugs) has its own pass over its
own answers under the same rules, served by `?stats=1&s=<subject>` with the subject named in the reply (the corals
without `s`). The app reads:

- **The corals'** (`sync.js` `loadStats`): photos, unit offsets, pairs, memory and format offsets.
- **The sea slugs' own pooled statistics** (`SUBJECTS` `stats`; `sync.js` `loadOwnStats`, kept only from a script that
  serves them and a reply naming the subject; `model.js` `statsJoin` joins their photo ratings, unit offsets and pairs to
  the corals' in `PSTAT`, `PGD`, `PCONF`, keyed by the subjects' own ids). Their draw, traps and data look-alikes
  follow their players' answers: a pair seeded from iNaturalist's identifications (`model.js` `dataSeed`) that is offered
  together often and seldom mixed up falls under `CONF.TRAP` and stops being a look-alike. Their memory and format
  offsets stay the prior and none (`pmem`, `pfmt`), as the sheet's replay of them reads none.
- **The fish's** (`SUBJECTS` `fish` `stats`, from sheet v189: `core.js` `FISHST_SHEET`), the same way. Rows are rated
  at the rank each question asked, so `PGD` holds one offset per unit id (`f:`, `g:`, `s:`). Their memory and format
  offsets stay the prior and none (`pmem`, `pfmt`): using them would move the replayed progress (rule D5). The sheet
  replays a fish answer from its logged scoring record (`core.js` `scoreRec`), whatever the statistics
  (`tests/fishstats.test.js`). Measures: the notebook, "The fish's own pooled statistics".

### Photo exposure

How a player's questions spread over a unit's colonies (the fish's observations), so they learn the unit and not a few
photos: the calibration share `CAL.RATE` drawn among the colonies never seen, a colony weighed by its share of the views
in a multi-view question, and a colony counting as seen whatever view of it was shown (`model.js` `colonyMem`), all in
"What a question shows". The admin's Colony view puts up to `admin.js` `CELL_MAX` (40) colonies of a coral genus in the
games, per view; the fish have no cap. The study and its simulations are in the notebook.

### The calibration set (corals, 2026-11-18)

The first step before an explicit placement test: a fixed set of about 50 coral photos, each drawn a little more often
in normal play until it has 20 or more answers, never as a hidden probe; a test of 20-25 adaptive questions needs about
40-60 photos of measured difficulty. Decision record: docs/decisions/2026-11-18-coral-calibration-set.md.

- **Which photos** (`tools/calibset.js`, `calibration-set.json`): game photos of the slate genera (the bonus genera are
  opt-in: few players meet them), in the views every question shows (colony and close-up; a two-level genus's colony
  and close-up), never several corals, a photo rated Poor or a Colony photo whose growth form is not visible. One each
  for every slate genus, the rest of the 50 to the genera with the most eligible colonies; within a genus, the views
  alternate and the photo is the first of a fixed hash order, one per colony. Never by source, licence, observer or the
  answers a photo already has (rule P1). The genera span the slate's difficulty, so the set does: on the sheet's ratings
  of 2026-11-18, the 48 members already rated sit from −1.14 (10%) to 0.67 (90%), median −0.03, and 4 answers each
  (median; 0 to 11, 212 in all). The hard end of a test comes from its formats (a single view, look-alike choices, a
  typed name: the format offsets), not from a set of hard photos.
- **Sticky**: a member stays while it is in play, even when its genus's share of the 50 falls (the set may then hold a
  few more); a genus whose member left play (Pierre removed it, rated it Poor,
  excluded it) takes the next photo of the same order when the tool runs again (`node tools/calibset.js`; `--check`
  says when it would); until then it is never drawn. No redraw: it would waste the members' answers.
- **The draw** (`model.js` `CSET`, `setBonus`): a member weighs `CSET.B` = 2 times as much in `photoSet` while the
  sheet's plain count of its answers (`nAnswers`, every player, repeats included) is under `CSET.N` = 20, on top of the
  online calibration's bonus (`calBonus`); then 1. Only on a unit the player holds (met, not shaky: the calibration
  questions' condition) and for a photo within one width of the question's target (|x| ≤ 1 in the targeting's
  Gaussian): the set never pulls a photo that does not suit the player. It multiplies the photo's weight and nothing
  else: targeting, photo memory, variety, format and scoring are any photo's, so the question is a normal one. A subject with no set, or a device where the
  file did not come, draws as before.
- **Reserves**: a member may fall in a player's reserve ("The reserve in the game"; about 4 of the 50 per player), out
  of that player's practice only.
- **Progress**: `node tools/calibset.js --progress STATS`, on a saved `?stats=1` reply (`curl "<SYNC_URL>?stats=1&av=tool"`),
  lists each member's answers, the members at 20, the least answered, and the difficulty spread of the rated ones.

**The check, declared before running** (rule L11 level 1, the app world: `tools/learnsim.js --stats` (the sheet's
reply of 2026-11-18) `--truth gen`, the four profiles × 5 seeds × 600 questions, item learner; `--set none` (no set, the
draw of `main`) against the set, on the same seeds):
- primary: the share of questions 1-600 showing a member, pooled over the 20 pairs, up;
- guardrails: `tools/learncmp.js`'s (true knowledge at 300 and 600, units met at 100 and 300, E = bar − D\* at 300 and
  600), with their margins; and the colony repeat rate over questions 1-600 (a question showing a colony shown before in
  the run), margin +1 point;
- reported: the questions that showed each member, pooled over the 20 runs as one cohort (minimum, quartiles, members
  never shown), before and after.

**What the check found.**
- **The run as declared** (`--truth gen`) and **two earlier variants** are in the notebook: "The calibration set: the
  declared run and the dropped variants". The built version is below.
- **Built version, the four profiles × 5 seeds** (seeds 1-5, 600 questions): members' share 4.17% → 5.35% (19 of 20
  up; beginner +1.5 points, strong RA +1.4, lecture RA +1.1, expert +0.7); questions showing each member, pooled over
  the 20 runs: minimum 1 → 3, quartiles 7 / 9 / 12 → 8 / 11 / 17, total 500 → 642, none never shown either way. Colony
  repeats 10.2% → 10.5% (+0.36 points; margin 1 point). `learncmp`'s guardrails on 5 seeds: true knowledge and units
  met held for every profile; the run-level ones swung both ways, as they did between the variants, so they were run
  again on fresh seeds.
- **Fresh seeds** (rule L11, one step up on the unclear and breached cells): the beginner on 45 (seeds 6-50; 6-20 to
  600 questions, 21-50 to 300), the lecture and strong RAs on 15 (6-20, 600). Every guardrail held but one: first Open
  Water −0.5 answers [bound +5.3], units met at 300 −1.2 [−1.8]; the lecture and strong RAs held on all.
  **The one left: the beginner's true knowledge at 300 questions.** The within-one-width condition was chosen
  after the held-only result on seeds 6-20, so only seeds 21-50 confirm it: there −0.013 [bound −0.023], past the
  margin's bound though the mean is inside it (unclear); on seeds 6-20 −0.012 [−0.023]; pooled over the 45, −0.012
  [−0.020]. At 600 questions +0.003 (seeds 1-5 and 6-20; seeds 21-50 stopped at 300). The simulated beginner meets about
  one genus fewer by question 300 and has caught up by 600. A cost Pierre accepted (Q412, 2026-11-19: merge as is).
- Compute: about 30 minutes (rule L11's cap 40), level 1 only. The real log cannot judge it (rule L12): its answers
  were played under the draw before.
- **Pace** [guess, from the sheet's counts of 2026-11-18]: the members hold 212 answers (median 4); at the study's
  traffic (about 3,500 coral answers in 17 days) and the share above (+28%), the median member reaches 20 in roughly 7
  weeks, the least shown quarter in 10 weeks or more, the slowest in several months (the starred genera among them: they
  open after their look-alikes, rule L5). The factor buys about two weeks on the median (simulated 9 → 11 showings).
  The check measures the share, not real players' pace: `--progress` tells.

### Full replay

The reference for a player's progress is the replay of their whole answer log, in time order, under today's rules
(`core.js` `replayProgress`; rule D9, "The log, the only reference for progress"), done by the sync sheet itself and
adopted by every device: how it is asked for, kept in the Replayed tabs, adopted and merged is docs/spec/sync.md "Full
replay".

- **One engine.** The sheet embeds `core.js` (`tools/sync_core.py`), and every answer is scored by `core.js`
  `scoreAnswer`, the game's own scorer ("One scorer"), with the sheet's photo memory offsets and pooled pairs for the
  corals and none for the other subjects. An answer logged with its scoring record replays exactly as the game scored
  it. An older row has its question's difficulty recovered from what the app logged (`e`, `th`, the choices; the
  memory and the mix-ups term taken out of the logged `e` from `MEM_LOGGED` and `CF_LOGGED`, the replay's own put
  back); a comeback answer's recall counts as 1, and a row with no `e` and `th` counts in the counts only.
- **What the replay gives and what the device keeps** (`core.js` `replayedOf`): per unit the log has answers on, the
  replay's record (the bar, counts, recent results, typed questions, photos seen, offers and mix-ups, ability, its level
  move and volatility, run, variant groups left; the photos seen per photo the larger of the two sides), `pm` 1 and the
  rules version; for the global level, the replay's ability and the larger answer count. From the device, what the log
  cannot give: the mastery exam passed or in course (the exam is not replayed), dropped when a miss logged after it
  takes it away as the game would (`core.js` `keepsMark`), a passed exam turned back into one in course while a variant
  group has no right answer in the log; and the days answered right, the last colonies shown and the corallites seen
  (`dd`, `dl`, `ro`, `cor`). A unit the log has no answer on keeps the device's record only if it counts no answer
  either.
- **Rules versions** (`core.js` `RVS` for the corals, `FISH_RVS`, `SEASLUG_RVS`; rule D5): every change to a progress
  rule appends `{v, at, why, msg}`; a change to how `Code.gs` `stats_` computes what the corals' replay reads from it
  (`mem`, `conf`, `fmt`, `gd`) is one. A version is not a frozen engine: the sheet always replays with the code's
  current rules, and a new version only makes every device take the replay once. The latest version of each list has no card (`msg` null; the cards of
  the earlier versions stay for the record, and `core.js` `rvMsgs` shows none for a jump that ends on a version without
  one), and a learned mark the replay takes away is not told (rule D6).
- **The device's own recalculations** (`memRecalc`, above; `model.js` `domRecalcAll`, a unit record of a subject other
  than the corals still on the former moving average) only approximate the replay from what a device keeps, for a
  device that never reached the sheet; a record adopted from the replay is never corrected by them.
- **The admin** shows the replayed numbers: Players from the sheet's own replay (`Code.gs` `replayedAll_`), the Journey
  replayed in the browser (`core.js` `replayProgress`), and "↻ saved" beside a value the saved copy still says
  otherwise.

### What the photo ratings do not use

**Response time: genus and photo** and **Response time as information on difficulty**: the photo Elo's ratings, the
unit offsets and the opening order take no answer time; a right answer's ability steps do ("Response time"), and a
photo's difficulty in the app takes its time term beside its rating ("The photo's time term"). Two studies measured what
the time could add on the unit and the photo side, and one option (time inside the photo Elo's step) was tried in three
simulated rounds and not adopted; their records are in the notebook, and the next step is ROADMAP "Time in the photo
rating".

### Response time, re-measured over every subject

Pierre, 2026-11-20: response time carries difficulty, experts included, even when the answer is right (either the
photo's or the question's difficulty for that player); a fact to integrate, not a hypothesis. How the engine takes it:
"The photo's time term" (step 1) and ROADMAP "Time in the photo rating" (step 2). This is the read-only re-measure of the same day, on the
sheet's Answers tab (6,653 rows, 2026-11-01 to 2026-11-20; players P1, P2…; the subject from `core.js` `rowSubject`; z
exactly as `rtWeight`; players are the statistical unit; the plan was declared before the runs). Nothing in the game
changed. Timed answers are those with seconds, not typed:

| Subject | Rows | Timed | Enlarged (players) | Timed players with 20+ | Photos timed by 2+ players | Photos with 5+ timed answers from 2+ players |
| --- | --- | --- | --- | --- | --- | --- |
| Corals | 3,662 | 3,020 | 284 (10) | 12 | 747 | 134 (107 by `tools/rtdecomp.py`'s definition) |
| Fish | 2,816 | 2,694 | 27 (4) | 9 | 361 | 5 |
| Sea slugs | 168 | 164 | 0 | 1 | 0 | 0 |

The ROADMAP thresholds (photo term about 120 photos, genus term 15-20 players, the player rule and enlargement about
5,000 timed answers and 10+ players): none met; the photo term is the closest, 107 of about 120 for corals.

- **A right answer's time and the next miss on the same unit, beyond today's Expected: no residual signal.** Mean z
  slope per player on the next answer's miss residual (the next format and the time since as covariates): corals
  +0.001 [−0.020, +0.022] (4 of 10 players positive, sign-flip p 0.91), fish −0.006 [−0.055, +0.043] (3 of 7, p 0.80);
  sea slugs "Not enough data yet". For corals this rules out an effect above about 1.5 points of next-miss probability for
  an answer twice as slow as the player's usual. It cannot tell an absent signal from one `rtWeight` already absorbs; the
  corals' dates hint at the second (to 2026-11-04, before the weight: +0.051 [−0.015, +0.116], 5 of 6 positive; from
  2026-11-05: −0.020 [−0.042, +0.001], 1 of 9; exploratory, neither half clear). On wrong answers: corals −0.010
  [−0.128, +0.108], fish −0.098 [−0.193, −0.004] (0 of 6, uncorrected: a slow miss is followed by fewer misses than
  predicted).
- **The answer's own time and its own miss** (descriptive: the time is known only after the answer). A slower answer is
  more often wrong beyond its Expected: corals +0.073 [+0.045, +0.101], 9 of 10 players, p 0.004; fish +0.102
  [+0.055, +0.150], 8 of 8, p 0.008.
- **Who carries the time** (shares of the variance of log seconds, after the number of choices, views, right or wrong
  and practice):

  | Subject | Player | Unit | Photo | Player × unit | Residual |
  | --- | --- | --- | --- | --- | --- |
  | Corals (12 players, 1,150 photos) | 4.7% [0.4, 11.9] | 3.2% [−0.7, 8.4] | 3.9% [0.1, 9.7] | 11.9% [−0.8, 22.2] | 76% |
  | Fish (9 players, 2,151 photos) | 12.7% [0.5, 24.2] | −0.5% [−10.8, 1.9] | 13.6% [−3.6, 24.3] | 11.0% [5.5, 22.3] | 63% |

  Most of the time is noise within an answer; the player's knowledge of the unit is the largest stable part in both. The
  corals' photo share is below the 15-18% of 2026-11-04 (a different method: REML and other fixed effects).
- **The photo's time from the other players predicts a miss, for corals** (exploratory; leave-player-out; Expected, the
  format and the others' time on the unit's other photos as covariates). From the others' right answers only,
  +0.086 [+0.039, +0.133], 10 of 12 players, p 0.002 (without the unit control +0.101 [+0.062, +0.140], 12 of 12); from
  all their answers +0.065 [+0.008, +0.122], p 0.031. A photo others answer right 1.6 times slower than their usual
  (z = 0.5) carries about 4 points more miss than its rating predicts. It uses the photo's answers from before and
  after: a lasting difficulty, where ROADMAP "Response time, photo term"'s replay is the online test. Fish +0.125
  [−0.230, +0.480], 5 players, 185 answers: "Not enough data yet". The others' enlargement rate of the photo (corals)
  +0.163 [−0.049, +0.375], p 0.093: not clear.
- **`rtWeight` (K 1.5, LO 0.5, HI 1.5) against no weight and a per-player K** (`tools/abilityeval.js`, a subject switch
  in a scratchpad copy identical to the repo tool on corals; the per-player K by leaving one player out over 0-3):
  corals 15 players, no time against today's `e` − `e+A` +0.000 [−0.001, +0.002], p 0.66, a per-player K +0.001
  [−0.000, +0.002] (worse, p 0.016); fish 9 players −0.000 [−0.003, +0.002], p 0.77 and +0.000 [−0.002, +0.003], p 0.99,
  K 0 for 8 of 9. By the declared test no K is clearly better than 1.5, and today's weight is not clearly better than
  none. Fish, exploratory: the weight helps after a fast right answer (removing it costs +0.007 [+0.003, +0.011]) and
  hurts after a slow one (removing it gains −0.010 [−0.018, −0.001]); after a slow right answer `e+A` predicts 0.81
  where players get 0.89, which hints that the slow side (`RTIME.LO`) is too harsh, to re-measure and not build until it
  holds in corals and fish together.
- Expected is under-confident in both subjects (the next answer predicted 0.79, actual 0.82 for corals; 0.81 and 0.87
  for fish); each player's own intercept takes it out of the slopes. The fish replay runs a tool built for corals (no
  false-alarm or mix-up rows, no format offsets), so its group rows are rougher.

## Multifactor analyses (`analysis.js`, admin Analyses)

The methods of the admin's Analyses (the models, the multiple-testing correction, the validation, the visualisation
study) are in [spec/analyses-method.md](spec/analyses-method.md); the stored report, in
[spec/analyses.md](spec/analyses.md).

## Considered and not adopted

What the code does instead of what was weighed and left out; the options, their figures and their dates are in the
notebook: [docs/archive/learning-notebook.md](archive/learning-notebook.md) (the section of the same name).

- **First answer per photo only**: not used. Every trusted answer of a player counts, weighted by the player's
  experience (`PHOTO_W`; "Photo memory" for what a repeat owes to memory).
- **Urnings**: not used. The photo ratings are Elo, with the drift the references describe ("Keeping Elo alive").
- **Coded tracks or tiers**: none. Every threshold is continuous or performance-driven; nothing is coded per kind of
  player.
- **Time between sessions** never changes progress, mastery or ability (rule L1). The exceptions are told where they
  act: the comeback after a break, photo memory ("Photo memory"), and the seconds an answer takes ("Response time"),
  which are evidence about that answer, never a decay.
- **Answer time compared within the same question format**: not used. One pooled median of the player's own timed
  answers (`RTIME`, `rtWeight`).
- **A narrower targeting for the corals' unanswered photos** (`CAL.U` 0.25, the photo spread around the genus offset):
  not adopted. `CAL.U` stays 1: in the rated world the shown score lagged about a point at 1,000 answers (a guardrail
  breached) and the sheet's photo ratings came out a little worse, true knowledge unchanged (notebook, "`CAL.U` 1 → 0.25
  for the corals").

## Real-answer replay (`tools/abilityeval.js`): judging a paired difference

The replay's last table compares each rule with the first one on the same answers: the paired difference of next-answer
log-loss (negative: the rule predicts better). The answers cluster in a few players, and a player's answers are
correlated (same person, same habits, a learning path over time), so a standard error that treats the answers as
independent is too narrow: the stats study (`docs/reviews/2026-11-05-stats-methods-study.md`, §0 point 4 and §5.2)
estimates about 1.6 times too narrow with even a tiny correlation within a player (its estimate; the correlation is
unknown). **Players are the unit of inference** (`paired`, `signFlip` and `SIGN` in `tools/abilityeval.js`):

- each player's own mean difference d_p over their answers in the row, then the plain mean of the d_p (each player one
  vote: a player with 400 answers weighs as much as one with 20);
- a 95% t interval on players − 1 degrees of freedom (the standard error of the d_p over the players);
- the two-sided p of a sign-flip test over the players (each d_p's sign flipped at random; exact, every pattern, up to 16
  players, else 9999 draws from a fixed seed, so a run gives the same p every time). With 10 players the smallest
  possible p is 2/1024 ≈ 0.002; with 5 it is 2/32 = 0.0625, so 5 players can never give p < 0.05.

The 'all' row is the primary measure; the group rows (number of choices, level bands, response time, after a false
alarm) are exploratory: many rows, no correction for their number. The figure per answer (the mean over the answers,
which is the answer-weighted mean of the d_p, ± a standard error that treats the answers as independent) is a second,
descriptive table, so the two can be compared; it is not a test. A percentile bootstrap over players is not used for the
interval: with about ten players it under-covers (Cameron, Gelbach & Miller 2008), and the wild cluster bootstrap of a
mean with Rademacher weights is the sign-flip test above. `tests/ability.test.js` checks it on a made-up log with one
dominant player (400 answers better with the second rule, five small players worse): per answer the interval is narrow
and clear, with the players as the unit it is wide, reaches both sides of 0, and the sign-flip p is well above 0.05.

## Validating a learning change (rule L11)

A change to what players see or learn is checked in proportion to its possible effect, in simulated worlds where the
truth is known, and on the real answer log (rule L12, "Real-answer replay"). Rule L11 (`docs/rules/learning.md`) states
the requirements; this section is the method behind them: the levels, the two worlds, the profiles, the measures, the
margins and the commands.

**Levels.** The PR declares its level with one line of why; the integrator checks it and may raise it; in doubt, the
higher one. Every level keeps the unit tests and the CI smokes; from level 1, the real log too (rule L12).

| Level | The change | App world | Rated world |
| --- | --- | --- | --- |
| 0 | no effect on learning: a wording, the UI, a test, code that gives the same answers | - | - |
| 1 | small and local: one kind of unit, a rare situation, a constant nudged | the subject touched, its profiles × 5 seeds × 300 questions | - |
| 2 | changes what players see or learn broadly: the draw, the bar, the opening, the levels, the score | as level 1 | 10 seeds per profile (20 if a result is near a margin) × 3,000 answers (10,000 when the change reaches genera, species or the score's shape), normal photos and one heavy-tailed variant |
| 3 | choosing a value | 30-40 seeds, sized from the spread seen | 40 seeds × 30,000 answers, both distributions |

At level 3, each setting is compared with the current value (or a fitted curve) with Dunnett or Holm, TOST judges "no
worse", and the value chosen is confirmed on fresh seeds (`--seed0`); a close level 1 or 2 result is "the measure
cannot tell", never a level 3 by itself.

**The cap.** Every check has a hard cap of 40 minutes of compute, at every level; when an agent reaches it, it stops
and returns what it has. Level 3 never runs on this machine: only with Pierre's explicit go, on GitHub runners ("On a
GitHub runner" below), with its duration announced first. An unclear result is reported as "the measure cannot tell",
never escalated automatically. A guardrail breached, or a cost not declared, goes to Pierre.

The tools enforce it (`tools/checkbudget.js`, built into `node tools/learnsim.js` in both worlds; Pierre, Q405 and Q415):

- **One wall-clock budget, 40 minutes at every level and on every machine.** `--budget MIN` asks for less and never more.
  The clock starts when the compute does (the machine slot held), calibration included.
- **Plan, then run.** The run counts its jobs (profiles × seeds) and estimates their time on the workers: from one short
  calibration run (the first job, at most 1,000 answers or 100 questions, its time scaled in a straight line to the full
  length), or from `--per-job SEC`, a job's time at the full length measured before (its `seconds` in an earlier
  `--out`, divided by the waves). Over the budget it **refuses to start** (exit 2) and says which options would fit: fewer
  seeds, a shorter run, fewer profiles. The estimate is a straight line, so it can under-estimate a long run (measured on
  a loaded 4-core machine, rated fish: 1,000 answers 11 s, 3,000 answers 56 s; corals 4 s and 13 s): the stop below is
  the cap, the estimate only spares a run that would be cut.
- **The calibration cannot be stopped once begun**, so a budget under 1 minute needs `--per-job`; if the calibration
  still ends past the budget, nothing more runs and the result is marked cut.
- **Stop cleanly.** At the budget the run stops sending jobs, ends the ones in flight (closes the browser, ends the
  threads) and prints and writes what it has, **marked cut**: a banner in the printout, `cut` and `budgetMin` in `--out`
  (`planned`, `done`, `elapsedMin`). Jobs go seed by seed, so a cut leaves whole seeds first. `tools/learncmp.js` repeats
  the mark in its report and compares the complete pairs only. A cut result that is clear stands; one short of the level's
  seeds is "the measure cannot tell", never read as no effect. A run cut before any job finished still writes its
  `--out`, with the cut and no runs, and exits 3.
- **Level 2's figures stay the minimum** (rule L11): the defaults are not lowered to fit. When they do not fit in 40
  minutes, the check is split or its worlds narrowed to the ones the change touches, never shortened below them.
- **Level 3** (more than 20 seeds, or more than 10,000 answers in the rated world: level 2's ceilings above) **refuses to
  run** unless `--pierre-go "Q number or message, date"` (the reference of his go) is given **and**
  `GITHUB_ACTIONS=true`. Anywhere else it prints the `gh workflow run learncheck.yml …` command that dispatches it, and
  exits 2 before the slot or a browser. The 40-minute budget holds on
  the runner too, so a level-3 design at the table's sizes (40 seeds of 30,000 answers) does not fit one run: it is
  split into several checks, or Pierre decides otherwise (a constant, `MAX_MIN`).
- **A budget is per run; a paired check is two runs.** Before and after each get their own 40 minutes: on this machine
  an agent running both arms for one check gives each `--budget 20` so that the check's total stays within the cap. The
  workflow does it itself: one deadline for the whole check ("On a GitHub runner").

**Progressive, with valid statistics.** A large expected effect needs no high sensitivity: a check starts with the
level's fewest seeds and adds seeds only when a result lands near a margin (unclear), by the rule declared before
running (at level 2, the rated world 10 seeds, then 20; then "the measure cannot tell"). The error is split over the
looks declared, k of them: each look reads the one-sided bound at 1 − 0.10/k (two looks: 95%) and the primary at 0.05/k
(Bonferroni), so stopping on a result keeps the 90%.

- Before running, the PR declares one primary measure, its world, its checkpoint and its direction, and any cost the
  change is expected to bring (a guardrail it will move, with the bound accepted).
- The primary is tested pooled over the profiles with a stratified sign-flip test on the (profile, seed) pairs (exact
  up to 20 pairs, else 100,000 draws from a fixed seed); only if that passes, per profile under Holm.
- A guardrail ("Guardrails and margins" below) is held when the one-sided 90% bound of the paired difference stays
  inside its margin; unclear goes one step up within the cap, then is reported "the measure cannot tell"; breached,
  or a cost not declared, goes to Pierre.
- Anything else is labelled exploratory, uncorrected. A mean larger than its spread is never a verdict (it passes about
  9% of cells with no effect).
- On real data (rule L12) the inference is per player, never per answer. A multifactor design (profile × parameter ×
  seed) gets the method suited to it, found before running (a mixed-effects model with seeds as random effects and the
  interactions in the model rather than many pairwise tests); the PR states the model and its assumptions and checks
  them. The statistics study behind all of this: `docs/reviews/2026-11-05-stats-methods-study.md` §0, §3.2, §4, §6.

**Limits.** What the worlds do not cover, so the PR says what it measured instead:

- **One world, the real data's.** The app world's learner reads each photo's difficulty from the app's own estimate
  (`photoDiff`; for the fish, the judged-ease prior) unless `--truth` gives a true one (`gen[:SD[:NOISE]]`: a normal
  spread around the genus's offset; or a file), so a change to the estimate changes the world too. A unit has a
  difficulty only when `--stats` carries the sheet's offsets. Each profile is one fixed player; the spread between
  players is the draws'.
- **Learners whose teaching ignores the photo.** The item learner: a right answer gains `rate × (1 − know)`, a miss 1.5 times that
  (`LEARNER.MISS`), the genus wrongly picked 0.5 times (`LEARNER.PICKED`), whatever the photo. A photo diet changes what
  it learns only through which units are asked and how often it misses; easier photos, fewer misses, teach it a
  little less, never because the photo itself was clearer. The rated world's count learner learns by the number of
  answers alone, so there only which units are asked counts. Whether easier photos teach less is for the real log.
- The app world's horizon is 300 questions (600 when the change acts later), so what comes later (genera from a
  family's Open Water or Advanced, species, circle 3, the score's shape at 10,000 answers and beyond) is judged in
  the rated world.
- Not in the rated world: the Again after a miss, the duels slipped into the quiz, the comeback and breaks, the
  surprise cards.
- `tools/learncmp.js` has the primary's sign-flip test, the guardrails' paired bounds and Holm over the profiles; the
  level 3 tests (Dunnett, TOST) are not in it. It reads a file cut by the budget and says so ("The cap" above); for an arm cut before any run finished (no run, only `cut`: the file the tool writes, or the workflow's stub) it reads no primary, whatever its kind (population ones included), and says it was not read.

**The two worlds.**

| | The app world | The rated world |
| --- | --- | --- |
| Tool | `node tools/learnsim.js [--subject fish]`, the real app in Chromium | `node tools/learnsim.js --world rated [--subject fish]` (`tools/ratedworld.js`) |
| Photos | the real pools, the app's estimate or `--truth` | d = μ(unit) + ε, ε ~ N(0, 0.46²) (the coral photo spread of the Analyses tab); heavy tails: 15% of the photos +1.5, or a scaled t with 3 degrees of freedom; judged ease e = round(3 − (ε + N(0, 0.35²)) / 0.5) on 1-5 |
| Units | the sheet's offsets with `--stats`, else 0 | fish: family μ ~ N(0, 0.37²), +0.5 in a declared look-alike group; genus and species μ ~ parent + N(0, 0.3²), +0.3 with siblings; corals: genus μ ~ N(0, σ²), σ `RATED.CORAL_GD`, the spread of the sheet's genus offsets `gd` |
| Players | one fixed player per profile | an ability offset π ~ N(0, 0.5²) per run |
| The app's estimates | its own | `--app truth`: told the truth ("fully rated"); `own`: its judged-ease prior alone; `sheet` (the corals): the sheet's photo Elo simulated on the players' own answers |
| Learner | item (default), field, exemplar | by the number of answers, and one whose gain depends on the answer and its feedback (as the item learner's) |
| Horizon | 300 questions (600 when the change acts later) | 3,000 answers at level 2 (10,000 when it touches genera, species or the score's shape), 30,000 at level 3 |

The rated world runs the app's own engine (`model.js` whole and the real `core.js`, below). **The anchor.** It was
checked against the app world on the fish: the shown score agreed, while the rated world's levels and right rates ran
lower (its learner has no photo memory, the world adds the units' μ and the player's π, and a guess is uniform among
the choices). So the rated world compares two arms within itself, as the protocol pairs them; its levels and right
rates are never read against the app world's. The figures are in the notebook.

**Long rated runs: the false-alarm table.** Every unit's bar reads its false-alarm rate (`core.js` `faOf`), which scans
every record of the player's progress, and the planner reads the bars of every unit in play several times an answer, so
the cost of a long run grows with the units met times the units read. The rated world arms a table for each answer
(`core.js` `faArm`, `tools/ratedworld.js` `step`): the first read builds every unit's false alarms and chances in one
pass over the records, in the scan's own order, so each value is the scan's to the last bit, and `scoreAnswer` empties
it. The app and the sheet never arm it and scan as before. The same seeds give byte-identical `--out` files (the date,
commit and run time aside) and reports, and every read of a run can be checked against the scan (`FA_CHECK`,
`tests/faof.test.js`).

**The rated world, built** (`tools/ratedworld.js`, `--world rated`; the distributions in its `RATED`, the one place they
are stated). The fish units are built as the app builds them (`core.js` `treeGen`, `treePhotos`, `app.js` `treeGenera`
cut out as `tests/rareease.js` cuts `model.js`): the families in three circles, their scientific genera, every game
photo. A seed draws its world: each unit's μ and each photo file's ε (above), the photo's judged ease from ε, the
player's π (each genus's and species' μ on a stream of its own, keyed by its id: a version with more or fewer units
plays the same photos and the same other units, so the arms stay paired); the same seed gives the same world, so two
versions of the app compare on it. `model.js` runs whole in a Node vm, with
the app's globals it reads written around it (the units, the photos, `pool`, the circles' gates, the scientific
genera's set, an in-memory store), and `core.js` `scoreAnswer` scores each answer as the game does (the Elo, the
domain-score bar, the global level, rule L2), so the aim, the start's lean, `photoSet` (Gaussian choice, `RARE`, the
floor), typed questions, `drawW`, `shaky`, `openChance`, `openPace`, `openRight`, `openPick`, the opening hold and the
exam are the app's own. Only the planner is written there, as `quiz.js` `planPhoto` reads: the first cards, a card when
the path allows one, a unit opened on a card asked once ready, the target by `nextTarget`, the choices by
`distractors` with the traps `trapsFor` asks (the plausible choices `plausibleK` count while the traps are fewer than 2,
every choice after), the photo aimed lower by the opening hold's ease and the player's own mix-ups (`holdEase`,
`confTerm`), the last two observations held back (`s.ro`), the session's window (`seenAdd`), the exam questions by `examSet` and `examTyped`. Not in it: the Again after a miss, the
duels slipped into the quiz, the comeback and breaks, the surprise cards. `--app truth`: `photoDiff` gives each photo's
true difficulty and the unit offsets make `genusDiff` give each unit's μ; `--app own`: the judged-ease prior alone (no
photo statistics, as the fish today); `--app sheet` (`runPop`; the corals only: a fish photo is shared by a family's and a genus's questions,
with two true difficulties): the sheet's photo Elo simulated. The profiles' players, one each, play the seed's world in turn; their answers are logged with simulated seconds (`RT`:
log t = log 6.5 + the photos' time intensity β − the player's speed τ − 0.4 if right + log 1.5 if typed + `--gap` × the
learner's true logit + noise; `--times` sets β: `rho25`, `rho0`, `views`, `fast`); every `--every` rounds `core.js` `eloOf`, `genusOffsetsOf` and `photoMemOf` are replayed on the log
and served to every player's app (`PSTAT`, `PTM`, `PGD`, `PMEM`), and the file's `pop` holds, per seed, the served ratings
(each with its photo's time term as the app adds it, `core.js` `ptimeOff`) against the truth at each checkpoint
(`rateErr`, the centred root mean square error; weighed by answers; the
correlation; the genus offsets' `gdErr`), which learncmp reads as population measures, one value per seed (an exact
sign-flip over the seeds). `--dist normal|tail|t3`. Circle 3 stays
closed unless `--beyond yes`, as in the app world (its offer left unanswered). The scientific names' offer, once a family
is at Advanced, is accepted, except by the casual diver. The learner: the profile's know per unit (`tools/learnprof.js`,
as the app world), the run's π, recognition sig(logit know + π − d − 0.5) on the true difficulty d of the photo shown,
else a guess among the choices (typed: "I don't know" half the time); it learns by the number of answers (rate × (1 −
know) per answer on the unit and per card). D\*: its mean chance on each of the unit's game photos alone. Rows hold what
learncmp reads (`dStar`, `knowSlate`, `met`, `right`, `prog`, `f`, `kinds`, `score`, `plateau`; per run `owAt`, `advAt`,
`c3`, `expo`, `preOW`), at the guardrails' checkpoints (100, 300, 1,000, 3,000, 10,000, 30,000) up to the horizon.

**The corals**: the coral units as the app builds them (`core.js` `applyCuration` and `applySlots`,
`app.js` `applyForms` and `imrFormsOf` cut out the same way; the extra genera, Millepora and the bonus genera, too): the
40 genera of the slate and the bonus genera, their game photos in their three views (a question shows those
`photoSet` picks; one view alone is the single-view case). Each genus's μ ~ N(0, `RATED.CORAL_GD`²), **0.286: the SD of the
sheet's genus offsets `gd` measured with the photos rated against the genus ability; 0.370 with the rating against the
level, the sensitivity variant (`--coralsd 0.37`)**; no photo has a
judged ease, so the share under ease 4 is not measured there. The bonus genera come into play once their offer is on,
as in the app world; there is no global score, so the shown score is the units' mean (`progPct`).
**The learners**: `--learner count` (the default), by the number of answers, as above; `--learner item`, whose gain
depends on the answer and its feedback, as learnsim's item learner: a right answer teaches rate × (1 − know), a miss
1.5 times that (`ITEM.MISS`), the unit wrongly given 0.5 times (`ITEM.PICKED`), a card as one right answer.

**Profiles** (the same list for both subjects where it applies; in the rated world each run also draws π). The two IMR
levels are learnsim's `lectureRA` and `strongRA` (the first-launch answer "IMR course"):

| Profile | Who | Corals | Fish |
| --- | --- | --- | --- |
| Beginner | knows nothing of the subject | every genus at 2% | every family at the floor; both names |
| Casual diver | a diver who knows the common fish by sight, wants their common names | - | the common families a little, and the commonest species of each; common names only |
| Lecture RA | an RA who has just had the IMR lecture: knows the course's names and groups, has practised little | the lecture's genera at 55%, the others 10% | the IMR families half known; the cheatsheet's 24 species a little less; both names; the IMR genera from Open Water |
| Strong RA | an RA with practice behind the lecture | the IMR lecture groups, in the course's order, until 60% of the slate is covered, at 85%; the others 10% | the IMR families and their genera well known; the cheatsheet's species and the 3 commonest of each IMR family a little less; both names |
| Expert | knows nearly everything | every genus at 93% | every family, genus and species at 93%; both names |

Built in `tools/learnprof.js` (one list, loaded by learnsim in Node and in the page; the rated world reads the same list),
never by data order. The default list of a subject is every profile with a part for it (`--profiles` picks others;
`strongBack` and `spotty` stay by name). Corals: the lecture RA knows the 34 genera numbered on the IMR slate at 0.55;
the strong RA the IMR lecture groups in the course's order (a starred genus in the group of its look-alikes) until 60%
of the slate is covered, at 0.85; the others 0.1. Fish: the lecture RA knows the circle-1 families at 0.5 and their IMR
genera too (`imrg`); the strong RA the circle-1 families and every genus of theirs at 0.85; the others 0.1; the expert
every family, genus and species at 0.93; the beginner everything at 0.02; the casual diver, at 0.3, the most common
families near Dauin (their weights in the global score's tree) until they carry half of the weight, the rest at 0.02,
and declines the scientific names (Not now on the set's offer). The species units (by common name), in both worlds
(`sp`, `knownSpecies`): the lecture RA knows the 24 most sighted of the IMR course PDF's cheatsheet (`fish.json` `cs`)
at 0.4; the strong RA those and the first 3 of each circle-1 family in its order (the commonness order they open in)
at 0.7; the casual diver the first of each family it knows at 0.3; the expert all at 0.93; the others start at the
profile's low value, so a species starting from its family's ability is still met. `--spknow off`: every species at
the low value, as before (a paired run against a version without them passes it to both arms). These fish values are
assumptions, not fits: on 2026-11-19 the real log had no species answer, 5 players with 200 fish answers or more, and
right rates set by the draw's target (ROADMAP "Simulated profiles fitted to real players"). First-launch answer
(`learnprof.js` `choice`, with `--choice auto` and in the rated world): the beginner and the casual diver "new", the
lecture RA "imr", the others "know". Learning rate 0.12; the expert 0.05. Two more profiles, run by name only (`--profiles`): `strongBack`
(knows 4 genera in 5 well, the rest hardly) and `spotty` (knows the genera of some IMR lecture groups as an expert does,
the others hardly).

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

**Guardrails and margins** (the smallest change that matters, in each measure's units; one-sided 90% bound of the
paired difference on the side of harm; `GUARDRAILS` in `tools/learncmp.js`):

| Guardrail | Checkpoints | Margin | Why this margin |
| --- | --- | --- | --- |
| True knowledge (`know`: D\*, or `knowSlate` in the app world) | 300 and 600 questions; 1,000 and 3,000 answers | −0.02 | 2 photos in 100 named less well: the statistics study's scale, and below what a player can feel |
| E = bar − D\*, the over-claim side (`over`) | the same | +0.03 | the bar must not promise more than the player can do; 3 points of a bar is about the smallest step a player reads |
| The global score as shown (`score`) | 1,000 and 3,000 answers (rated world) | −1 point | the % is shown rounded to the point: one point is the smallest change a player sees |
| Answers to the first unit at Open Water (`firstOW`) | the run | +20% or +10 answers, the larger | the first level is the hook; a wait a fifth longer is felt, 10 answers is a short session's worth |
| Units at Open Water (`unitsOW`) | 300 questions; 1,000 answers | −2 units or −5%, the larger | two families or genera fewer is what a player sees on My progress; 5% scales it to a large set |
| Longest plateau of the shown score (`plateau`) | the run | +20% | fast at the start, slow after: no flat stretch a fifth longer |
| Share under ease 4 before Open Water (`hard`) | questions 1-300; answers 1-1,000 | +0.05 | half of the 0.1 share the cap sets (`RARE.SHARE`): a change must not undo half of it unnoticed |
| Units met (`met`) | 100 and 300 questions | −2 units or −5%, the larger (corals: −2 genera) | the pace of new units, as the CI test reads it; two units is a card or two a session |
| Fish families at Advanced (`famAdv`) | 300 and 600 questions; 1,000, 3,000 and 10,000 answers | −2 families or −5%, the larger | the families' pace while genera and species share the draw; the margin of the units at Open Water |

None comes from the seeds' spread, which only sizes the seeds. A change meant to move one of them declares that cost
and its accepted bound before running (rule L11). Neither world belongs in the hourly analyses Action (its 2 hours serve
the real log).

**Commands.** Each arm runs on the same seeds, then `tools/learncmp.js` pairs the two files and judges them (offline,
under a second; `--list` prints its measures and guardrails):

```
node tools/learnsim.js --subject fish --out before.json          # on main; the change's branch: --out after.json
node tools/learncmp.js before.json after.json --primary hard@300:down [--cost met@100:-3] [--looks 2] [--json r.json]
# the rated world (level 2 and 3): the same, with
node tools/learnsim.js --world rated --subject fish --seeds 10 --questions 3000 --out before.json [--dist tail] [--app own]
node tools/learncmp.js before.json after.json --primary score@3000:up
```

It pairs the runs by (profile, seed) and prints, ready for the PR: the primary (`MEASURE@CHECKPOINT:up|down`, declared
before running), the stratified sign-flip pooled over the profiles (each pair's difference over its profile's root mean
square difference, a scale a sign flip leaves unchanged so the test stays exact; T the sum; two-sided p, exact up to 20
pairs, else 100,000 draws from seed 1), clear when p ≤ 0.05 / looks and T goes the declared way, and
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
photo exposure. The measures learncmp reads (`--list` prints them; any may be the primary): the ones above (`know`,
`over`, `met`, `hard`, `score`, `entries`, `credit`, `firstOW`, `unitsOW`, `unitsAdv`, `plateau`, `c3`, `hardAns`,
`perPhoto`, `right`, `prog`, `thErr`), `near` (repeats within 9 questions), `learned` (units whose exam was passed), the fish's `genShare`, `famAdv` and
`spShare` (the shares of answers on the scientific genera and on the species, the families at Advanced), `unopen`
(the rated world's `uo`: the share of the questions below the base level, among choices, naming a unit never opened),
`firstGen` and `firstSp` (the question that first asked a scientific genus, a species), the phase
photos' shares (`phEarly`, `phLate`, `phEasy`, `phOther`, `phAns`), the measures after a break (`learnsim --breaks`:
`cbLen`, `cbLong`, `cbRight`, `afterRight`, `held`, `holdAfter`, `open15`, read per break and per profile with their
one-sided bounds, no margin) and the population measures of `--app sheet` (`rateErr`, `rateErrW`, `rateCorr`, `gdErr`:
one value per seed, an exact sign-flip over the seeds). `firstOW` and `unitsAdv` leave the corals' bonus genera out, and
a run where no unit reached Open Water drops its pair. After the guardrails, learncmp also prints, with no margin, the
right %, `genShare` and `spShare` at each checkpoint (its `WATCH`), with the one-sided bounds either side.

**On a GitHub runner** (the checks too long for the shared machine, level 3 among them, which also needs Pierre's go):
Actions › "Learning check (tier 2)" › Run workflow (`.github/workflows/learncheck.yml`, manual dispatch only; the job's
limit is 90 minutes: the setup, the 40 of compute, the report). **The workflow carries the cap and the go itself**, not
left to the compared checkouts (rule L11; Pierre, Q405 and Q415): a check is 40 minutes of compute **in total**, however
many runs (two arms, one or both worlds: two or four runs). One deadline is set before the first run; each run gets
the equal share of it (10 minutes a run with both worlds, 20 with one) or the `budget` input (minutes per run, `runs x
budget` at most 40, refused otherwise), less where the deadline is nearer; learnsim's `--budget` stops a minute before
the hard limit, and `timeout` ends the run at that limit whatever its checkout does (an older `before` ignores
`--budget`), never past the deadline. A run that leaves no file (killed, or cut before its first job) gets a stub marked
cut with no runs, which `tools/learncmp.js` reads: it compares what exists and says the primary was not read, never
reading the cut as no effect. A run that overruns takes the next one's time, never the cap. Under 2 minutes left, the
run is not started. A check that does not fit (the defaults, fish in both worlds, are an hour) is split, one world at a
time, or narrowed, never lowered below the figures above. **Level 3** (over 20 seeds, or over 10,000 answers when the
rated world runs) needs `pierre_go`, the reference of Pierre's go (a Q number or message, and the date): the first step
refuses without it, before either checkout is read, and `args` cannot carry `--seeds`, `--questions`, `--budget`,
`--per-job`, `--pierre-go`, `--world`, `--subject` or `--out`. With the version with the change (`after`: its branch),
the one to compare it with (`before`, `main` by default), the subject, the world (`both`, `app` or `rated`), the seeds,
the questions (app world) and answers (rated world), the primary declared before running (`hard@300:down`, empty for
guardrails only) and the world it is read in when both run (`primary_world`; the other world reports its guardrails),
the looks, the budget, the go and any other learnsim option (`--profiles beginner,expert --dist tail`). It runs learnsim
on both versions with the same seeds (4 workers), then `tools/learncmp.js` of the version with the change, and puts its
report in the run's summary; it commits nothing and keeps no artifact. With `gh`: `gh workflow run learncheck.yml -f after=<branch> -f subject=fish
-f primary=hard@300:down`. Inputs are checked against narrow patterns before any command reads them.

**Figures.** The anchor's figures and the speeds measured, **The score's shape** (the fish global score in the rated
world: fast at the start, slower after) and the **First run: the cap under ease 4 before Open Water** (`RARE.SHARE`, the
first change checked with this protocol) are in the notebook (`docs/archive/learning-notebook.md`, "Validating a
learning change").

## Simulation (`tests/profiles.smoke.js`, `tools/learnsim.js`)

Simulated players driven through the real app, as the code runs them today: a pacing test in CI and a learning-outcome
simulation for reading. Every value is the code's, and the code wins where this text and it differ. The calibrations,
baselines and studies made with them, with their dates, are in the notebook:
[docs/archive/learning-notebook.md](archive/learning-notebook.md). How a learning change is validated with them (the
app world and the rated world, the profiles, the measures and their guardrails, `tools/learncmp.js`, the workflow):
"Validating a learning change" above.

In both, the app runs untouched and only the player is simulated, by a learner of ours: a few round numbers, neither
the app's model nor fitted to real answers. Their numbers show trends and compare two versions of the app on the same
seeds; they say nothing of a real player's level.

### The pacing test (CI)

`tests/profiles.smoke.js`, run by the smokes workflow (`.github/workflows/smokes.yml`, job `profiles`; locally
`node tests/profiles.smoke.js`).

- **Three players** through the real photo quiz, 300 questions each, from a fresh start (no opening hold, no comeback,
  no Open all), the first-meeting cards read through: a beginner (every slate genus known at 0.02), an RA after one
  lecture (0.55 on 2 slate genera in 5, in data order, and 0.1 on the others) and an expert (0.93). Nothing in the app
  is set per profile. The app's `Math.random` and the player's own generator are seeded, so a run repeats.
- **The player** (the test's own): it recognises the genus shown with σ(logit know − d − 0.5 for a photo shown alone),
  d the mean `photoDiff` of the photos shown. Not recognised, it is still right 1 time in k on a question with k
  plausible choices, and never on a typed one, where it answers "I don't know" half the time and else one of the
  draw's wrong choices. Each answer teaches rate × (1 − know), rate 0.12 (the expert 0.05).
- **What it checks** (any failure fails the run):
  - a focused beginner: over 8 seeds (the run's and 7 more), at most 17 genera met on average by question 100;
  - the beginner and the RA still open genera between questions 100 and 300; the expert meets more genera than the
    beginner at 100 and at 300, gets look-alike traps (on the 4-choice questions: more than the beginner at 100, at
    least 1 a question at 300), has 10 genera or more at 50% after 300 questions and a % more than 10 points above the
    beginner's;
  - no genus at its exam's entry before it was offered beside a look-alike (or answered right typed);
  - every genus answered is under the domain-score bar;
  - easiest first: with made-up ratings (one genus easy, one hard), `openPick` draws the easy one more than 3 times as
    often as the hard one; with no ratings and their commonness made equal, no order (neither drawn more than twice as
    often as the other);
  - the bonus genera: with every slate genus half way and nothing shaky, the opening chance is 1 and the opening picks a
    bonus genus; switched off, none is in the pool;
  - online calibration: on a genus the player holds, a photo nobody has answered comes up more than 1.3 times as often
    as with the calibration off (and more than 13 times in 3,000 draws);
  - no page error.

### Learning-outcome simulation (`tools/learnsim.js`)

What the simulated players really learn in the real quiz, and how far the app's estimates are from that truth, as a
mean ± sd over many seeds; not in CI (minutes to hours). The app's draw, photos, traps, duels, Again, exam, Elo,
progress and cards run untouched. How a comparison is read (a primary measure declared in advance, an exact stratified
sign-flip test pooled over the profiles, Holm, the guardrails): rule L11 and
docs/reviews/2026-11-05-stats-methods-study.md. The same tool runs the rated world (`--world rated`): "Validating a
learning change".

- **Run**: `node tools/learnsim.js` with the options its header lists: `--seeds` (5), `--questions` (300), `--profiles`
  (the subject's default list), `--workers` (up to 4), `--subject coral|fish`, `--out` (every run and the summary as
  JSON) and those below. Each run (profile × seed) gets a fresh browser context; seeds are 1..N (`--seed0` shifts them,
  for fresh seeds), and the app's `Math.random` and the learner's own generator are both seeded from the seed, so a run
  repeats and two versions of the app compare on paired seeds. The fish's surprise questions are left out of the path.
- **Photo ratings**: `--stats` loads a `?stats=1` reply of the sync sheet, a file (fetched with an `av`, or the sheet
  logs the read as an old app) or `live` (read at start with `av=learnsim`); without it every photo's difficulty is 0,
  as in CI. The learner meets the app's own `photoDiff` unless `--truth` fixes its world: a file
  (`{photos: {file: d}, gd: {genus: d}}`), or `gen[:SD[:NOISE]]`, each photo's true difficulty drawn from N(μ_g, SD²) by
  a hash of its file name (μ_g the sheet's genus offset, SD by default `JUDGE.SD` 0.8), the app told the truth plus
  N(0, NOISE²) (by default `JUDGE.NOISE` 0.3), as if 20 trusted answers had rated each photo. `--set FILE` serves FILE
  as `calibration-set.json`, `--set none` an empty set (the draw without the calibration set), for a paired comparison
  on one tree ("The calibration set"); `--truth gen` tells the app every photo has 20 answers, so the set's factor is off
  in that world.
- **Long runs**: a run is one synchronous `page.evaluate`, so the page's `localStorage` lives in its own memory
  (`tools/memstorage.js`, installed before anything writes: the browser's behaviour and its quota of 5,242,880
  characters, checked by `tests/memstorage.test.js`); the browser's storage traffic would otherwise queue in the
  renderer until it crashed. Each run reports the most characters its storage held.
- **Profiles**: `tools/learnprof.js`, one list for both subjects and both worlds ("Profiles" in "Validating a learning
  change"); `strongBack` and `spotty` run by name only.
- **Learner** (the item learner, the default; its constants in `LEARNER`): `know[g]` is its chance to recognise genus g
  on an average photo with all its views. It recognises the genus shown with σ(logit know − d − 0.5 if one photo
  alone, plus its photo memory), d the photos' mean difficulty. Not recognised, it picks a choice with weight (1 + 3 s),
  times (1 − 0.5 × its know) for a wrong one (`LEARNER.LOOK`, `ELIM`), s = 1 for the genus shown and
  min(1, `pooledConf` / `CONF.LOOK`) for another: about 1 for a declared look-alike, 0.4 within a family, 0.1
  otherwise. A typed question has no guess: "I don't know" half the time, else a genus by the same weights. After each
  answer the genus shown gains rate × (1 − know), `LEARNER.MISS` 1.5 times that after a miss (the side-by-side
  montage), the genus wrongly picked `LEARNER.PICKED` 0.5 times that; a first-meeting card teaches like one right
  answer. No forgetting, but across `--breaks`.
- **Photo memory** (`LEARNER.MEM` [0, 0.4, 1.5, 2], `--mem`; `--mem 0` turns it off): each photo the learner was shown
  when answering keeps [shown, right], and recognising gains the mean, over the photos shown, of their bucket's logits:
  new, shown never right, right once, right twice or more. It helps on that photo only: it teaches nothing more about
  the genus, and the hard reference question ignores it, so what memory adds to the answers is what the app must not
  count as knowledge.
- **Response time**: the learner takes log t = log 7 − 0.15 × right − 0.3 × logit(its true chance) + 0.6 × N(0, 1)
  seconds (`LEARNER.RT`), from a generator of its own, between 0.1 and 600 s, handed to the app's question clock; the
  app weighs its steps by it ("Response time"). `--rt off`: no seconds; `--rtlog`: the app's answer log of every run,
  with the learner's chance and time noise, for `tools/abilityeval.js`.
- **Breaks** (`--breaks 10m,30m,1h,3h,8h,3d,1w,1mo`, `--after` 20): the app runs on a virtual clock, 10 s an answer.
  After the first session the player leaves for each break in turn, each from the same state with the generators
  seeded again, forgets, and comes back: it plays until the comeback is over (the questions flagged warm), then
  `--after` questions more (200 at most a break). It forgets on the FSRS curve towards its starting knowledge:
  know′ = k0 + (know − k0)(1 + 19/81 · t / S)^−0.5, S = `LEARNER.S0` 2 days × `LEARNER.G` 2.5 for each further day
  the genus was answered right (the learner's own stability, not the app's). Its photo memory and pair skills do not
  fade. Per break: the comeback's length and success, the questions that held the openings on coming back, the success
  and the hold in the `--after` questions and the genera opened there, the app's rust at the first question back and
  the learner's true loss.
- **Openings**: per run, the questions that opened a genus on its own card (`opens`; `open/15`, the most in any 15
  consecutive questions), those right after a miss (`afterMiss`), and the questions where the rule "an opening only
  after a right answer" (`model.js` `openRight`) alone held it, with the opening chance it held back (`blocked`).
- **The first-launch answer** (`--choice new|imr|know|auto`, default `new`; `auto`: the beginner and the casual diver
  new, the lecture RA imr, the strong RA and the expert know; `--fallback keep|accept`, the answer to the card that comes when the
  answers do not fit the choice; `--vars`, for calibration only, other values of its variables): per run the first 20
  answers' mean surprise (right − e), their right % and the global level then, and the fallback card; the first 80
  answers are kept as a trace for `tools/fallbackeval.js` (either subject: the verdicts per profile and declared answer,
  each profile's truthful answer from `learnprof.js`, and the prior's fit, the surprise and the global level at 20, 40
  and 60 answers against the answer's band).
- **Open all** (`--openall N`): every genus opens at question N, as My progress's button; the back card that may follow
  is answered `--back keep|one` (default `keep`). Per run: when all opened, when the back card showed, and after it each
  answer's expected success e against the learner's true chance and its answer, for the genera opened at once and
  those met before.
- **Measures** at questions 50, 100, 200 and 300, then every 300 and at the last: true mean know over the slate
  (`knowSlate`) and over the genera met; the Elo against the truth over the genera met, |θ − logit know| and θ − logit
  know; the bar against the truth, `genScore` − know over the genera met (below 0: it under-claims), and the subject's
  %; genera met and learned; right % since the previous checkpoint; the most openings in 15 questions; the true chance
  to tell each declared look-alike pair apart (2 choices, average photo, both ways); the genera whose true success on a
  **hard reference question** (one photo alone, difficulty + 1 plus the single view's 0.5, 4 choices: the genus and its
  3 most confusable slate genera; `LEARNER.REF_D`) is `LEARNER.REF_OK` 0.9 or more; the genera that entered the exam,
  and their true reference success then and when learned; the exam, reserved-photo, duel, Find the X and Again questions and
  the cards so far; the field row ("Field learner and the Custom-8 scenario") and rule L11's levels, score and plateau
  ("Validating a learning change"). Per run: the question at which each genus was first met (`metAt`, printed as the
  median per profile for the genera of `--met`, by default Acropora, Porites, Pocillopora, Montipora and Millepora; a
  run where one was not met counts as later than the last question), the time to credit, and with `--ach` the answer at
  which each achievement first came.
- **By photo count**: the slate genera with at most `LEARNER.FEW` 14 game photos against those with at least
  `LEARNER.MANY` 20, at each checkpoint: the share of questions showing a photo the learner had already been shown, the
  right % on all and on those repeats, bar − know and θ − logit know over the genera met, genera learned; and, pooled
  over the runs, the genera that entered the exam or were learned, their true reference success then and the median
  question.
- **Photo exposure** (in `--out` only): each question's unit, colony and photos (`expo`), each unit's game photos with
  their colony (`pool`, in seed 1's run) and, for each question, whether its unit was under Open Water, the lowest
  judged ease, a phase and the variant kind shown (`preOW`): the repeat rates, the photos never shown and the answers
  per photo ("Photo exposure").
- **Limits**: the learner is ours (above); the photo difficulty it meets is the app's own estimate, so photo
  calibration cannot be judged, unless `--truth` fixes the world; the item learner learns per genus only (a duel or a
  montage teaches the two genera, not the pair as such; the field learner below adds pairs and the size of the set); no
  forgetting but across `--breaks`, no fatigue, and a learner that never quits; each profile is one fixed player, so the
  spread over the seeds is the draws', not who knows what. θ is clamped to `ELO.lo`..`hi` (−1.5..3), so a genus known
  at 2% always shows an error of about 2.4 there. Since the learner's guesses beat 1 in k (it rules out the choices it
  knows), a θ that fits its answers sits a little above logit know: a negative θ − logit know is an under-estimate, not
  an artefact.

### Field learner and the Custom-8 scenario

A second learner and a scenario, for what a bar at 100% asks: telling a photo of the genus from any slate genus,
whatever the player has unlocked. The item learner recognises a genus whatever the competitors, so drilling 8 genera
raises its knowledge exactly as drilling 40 would.

- **Field learner** (`--learner field --tau T`, τ 0.5 by default; `LEARNER.FIELD`): it keeps `know[g]` and its
  teaching, and adds a contrast skill x per pair of genera, starting at the lower starting know of the two and learned
  only when the pair is contrasted: each other wrong choice shown beside the genus asked gains rate ×
  `LEARNER.FIELD.PAIR` 1, the genus wrongly given rate × 1.5 (the montage). A question on t among the set V (its
  choices; on a typed question the genera met, the names it holds in mind) is right with the Luce choice
  P = 1 / (1 + e^(d + 0.5·single − memory) · Σ_{c∈V, c≠t} r(t, c)),
  r(t, c) = (1 + 3 s(t, c))(1 − 0.5 know[c] g)/4 · (1 − know[t])^(A g), g = τ + (1 − τ) x(t, c), s as for the item
  learner, A = `LEARNER.FIELD.A` 1.6. Every genus held in mind adds its own odds of a mix-up,
  look-alikes most (set size, and pooled confusion); τ (transfer) is the share of what the learner knows of t, in log
  odds, that works against a genus it was never contrasted with. A is set so that, with every pair contrasted at know
  0.5 and 4 easy choices, it answers 0.75 as the item learner. Wrong, it names c in proportion to r(t, c) (typed: "I
  don't know" half the time). The item learner stays the default and its runs are unchanged.
- **Custom-N scenario** (`--custom N --drill D`, D 200 by default): the player plays the Quiz until N genera are
  unlocked, picks the first N it met in the custom quiz, plays D questions there (the real custom quiz: its draw,
  choices, typed questions, Again, duels; no exam), then goes back to the Quiz. A row at the end of the drill gives the
  selection's own bar, truth and overclaim.
- **Measures** (`tools/fieldeval.js`, declared before the runs; rule L11 tier 2; checkpoints `--at` 300, 600 and 1000
  by default). The truth is pOpen(t), each learner's own success on an average photo of t with every slate genus a
  possible answer.
  - **Primary 1, overclaim** (`over`): per run, the mean over the genera met of (bar shown, `genScore`) − pOpen, at
    question 600. Above 0: the bar claims more than the player can do against the whole slate.
  - **Primary 2, precision of Learned** (`precL`): per run, the share of Learned genera with pOpen ≥ `LEARNER.PREC`
    0.8, at question 1000 (a run with no Learned genus has none: their number is given).
  - Secondary, descriptive: over+ = mean of max(0, bar − pOpen), pOpen over the genera met, the bar, the genera
    learned, and with `--custom` the selection's own bar, pOpen and overclaim at the end of the drill.
  - Inference: mean and 95% t interval over the seeds; each file against the first on the same seeds (paired), the
    sign-flip p over the seeds and Holm over the profiles for each primary. Everything else is exploratory.
- **Real answer log** (`node tools/fieldeval.js --log answers.json`; tier 3, rule L12, read-only): does the number of
  genera a player had been asked so far (x = log2 of it, this one included; the log records no cards, so a genus opened
  but not yet asked is left out) predict right or wrong beyond the app's logged expectation e? M1 = logit e + a + b x
  against M0 = logit e + a, each fitted on the other players and scored on the player left out; players are the unit
  (each one vote), sign-flip over players, declared direction M1 lower with b < 0. Descriptive: b on every player, the
  players' own b (those with `--min` 30 answers or more), typed answers apart.

### The judge: the domain score D\*

The yardstick a progress bar is judged by (docs/reviews/2026-11-06-progress-metric-research.md): 100% means naming
right every photo of the unit, alone, without choices, over the unit's photo distribution, easy to hard. Every candidate
bar is judged by it in several learner worlds.

- **D\*(g)** (`tools/learnsim.js` `JUDGE`): the learner's true success naming a photo of g alone (one view, so the
  single-view offset), with no choices, averaged over N(μ_g, SD²) by Gauss-Hermite with 7 points. Item learner: its
  recognition, no guess. Field and exemplar learners: every slate genus is a possible answer (for a unit outside the
  slate, the units of its own kind). μ_g and SD: with `--truth gen`, the sheet's genus offset and `JUDGE.SD` 0.8 (an
  assumption); with a truth file, its `gd` and its `sd` (else 0.8); otherwise the mean and the spread of the app's own
  difficulties of g's photos, the player's reserved ones included. learnsim keeps D\* and the bar shown per genus met.
- **The exemplar learner** (`--learner exemplar`, `LEARNER.EX`: K 8, R 0.6, D 8, B 0.03): a summed-similarity model
  after the GCM (Nosofsky 1986), with a background (guessing) term. Every photo shown is stored as an exemplar of the
  genus shown, a miss's montage stores a typical photo of the genus given, and prior know counts as know / (1 − know)
  typical exemplars (50 at most). A photo of difficulty d sits at atypicality r = R σ(d + 0.5 if shown alone), a
  typical one at R σ(0); its similarity to an exemplar of c (atypicality r_e) is exp(−K √(D_tc² + r² + r_e²)), with
  D_tc = 0 for c the genus shown and D (1.1 − s(t, c)) for another genus; the very same photo, stored as an exemplar
  of the genus shown, has similarity 1. P(t) = (S_t + B / |V|) / (Σ_V S_c + B), S_c the summed similarity to c's
  exemplars and the background B spread evenly over the possible answers (a wrong answer goes the same way). It is the
  third world, beside item and field: a genus never stored does not compete, so a drilled genus is truly named right.
- **The spotty profile** (`spotty`): knows the genera of IMR lecture groups 1-5 as an expert (0.93) and the rest
  hardly (0.05), learning rate 0.08: a rule that borrows from the global level is checked on the genera it does not
  know.
- **`tools/barjudge.js`** (offline, reads learnsim's `--out` files) reports:
  - the error E(g) = bar − D\*(g), signed, per profile at questions 100, 300, 600 and 1000, over the genera met, and
    mean |E|;
  - E split into the genera the profile knows and the others, and at the end of a Custom-N drill into the drilled
    genera and the others;
  - the time to credit (the questions from a genus's first answer until its bar reaches 50% and 80%, median over the
    genera the profile knows, and the question at which their mean bar does);
  - with `--bar field|scoreOf --core <core.js>`, another rule's bar replayed on the same answers (an approximation: the
    run's own answers, its own learned marks);
  - with `--log`, the real log's calibration of the app's predicted success by tercile of ability − photo difficulty
    (players as the unit, leaving one player out).

### What was measured with them

In the notebook, with their dates: the calibration of the opening's pace (`OPEN.K` and `OPEN.P`, the slope that
replaced the switch, the first-meeting cards) and its first exploration; the first learning-outcome baseline; the long
runs' memory; **Open all: the app's expectation against the truth** (the starting ability of the genera opened at once,
measured, not changed); the field learner's results and Pierre's Custom-8 scenario; the real-log test of the set size;
and the judge's first design.

## Decision log

This file says what the code does now, so it holds no log. Each decision, with its context and Pierre's
words, is a record in [docs/decisions/README.md](decisions/README.md); the ones taken before the records began, with
their dates and question numbers, are in the notebook's section of the same name:
[docs/archive/learning-notebook.md](archive/learning-notebook.md). The rules in force are in
[docs/rules/learning.md](rules/learning.md), the algorithms in the sections above.

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
