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

Every answer is scored by one function, `core.js` `scoreAnswer`, in the live game (`quiz.js` `answer`) and in every
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
means what the game scored, wherever it is replayed. What only the game knows (the exam, the cards, the hold) stays in
`quiz.js` `answer`.

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
of an answer comes from its mode and choices (`core.js` `fmtOf`: `k4`, `k3`, `k2`, `again`, `qduel`, `typed`, `exam`…;
a format absent counts 0, `core.js` `fmtOff`). The ability steps expect the question with its format's offset, and the
photo's aim takes it (`aimOff(k, df)`), so a 2-choice question that is right more often than 1 in 2 explains no longer
over-credits the ability. Each subject the sheet does not rate (`SUBJECTS` `replay` false) scores and aims with every
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
  its last 5 answers)), the corals' IMR and Pierre's photos × 1.3 (`SUBJECTS` `tiers`), and a reference-level photo ×
  the subject's `calib.ref`. **Photos already shown** weigh e^offset of their photo-memory bucket (`core.js` `MEM`,
  `memBucket`), so the least remembered come first; a colony counts as seen whatever view of it was shown
  (`model.js` `colonyMem`).
- **Variety.** The colonies of the last 2 questions on the unit weigh × 0.15 (`s.ro`); the best `PICKD.VARIETY`
  colonies are lifted to at least half the top weight, and every colony keeps a floor of `PICKD.FLOOR` of it, shared
  over the subject's `calib.pool` observations in a big pool (`model.js` `drawFloor`).
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
answers has not been asked yet, nor once `OPEN.MAX` have opened in that window: about 3 new units per 15 answers at
most, whatever `openChance` says. A unit opened on its card and not asked yet is asked as soon as it is ready.

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
look-alike of …", `learn.js` `starNote`). Should every unit left wait, they all open, so nothing is blocked for good.

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
  `introReady`). Its record: `reefid-sync-<subject>-intro`, synced, {unit: [answers then, ready at once, time, kind]}.
  `model.js` `INTRO`: START 4, GAP 2, HOLD 1.5, SLACK 0.1.
- **Held while the player falls behind** (`model.js` `holdStep`, `introHold`): no new card while a CUSUM of how far the
  answers fall below the success the game expected (each answer's e), less `INTRO.SLACK` an answer and never below 0, is
  `INTRO.HOLD` or more. A run of misses adds up however long it lasts; right answers pay it back by what they beat the
  expectation by; the slack keeps a player the game slightly overrates from being held for good. Kept on the device
  (`reefid-hold`) and, signed in, rebuilt by the sheet from every answer since the last reset (`model.js` `holdSync`,
  the sheet's `hold_`). While it is on the questions are easier ("Easier questions when a run goes wrong").
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
and opens none (rule L4); wrong choices may name any unit, as the quiz's do.

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

### Comeback after a break

Time is used here and only here (rule L1): progress, mastery and ability never decay. A break is expected to have cost
some recall, and the first answers after it measure how much.

- **Recall** t days after a unit's last answer (`s.at`), FSRS's power curve: R = (1 + F · t / S)^C (`model.js`
  `recallOf`). **Stability** S, in days: from `FSRS.S0` to `FSRS.S1`, log-linear in x = σ(ability − genus offset) (1
  once learned), times `FSRS.G` for each further day the unit was answered right (`s.dd`: spaced days count, not answers
  in one sitting; `model.js` `stability`). `model.js` `FSRS = {F: 19 / 81, C: -0.5, S0: 0.4, S1: 15.7, G: 2.5}`.
- **Rust**: the right answers the break is expected to have cost, summed over the units answered (`model.js`
  `rustOf`, `rustNow`). A comeback starts at a new visit (an answer `SESSION.GAP`, 30 minutes, after the last) whose gap
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
achievement as one in the Duel tab does.

### Find the X slipped into the fish quiz

One name, four photos: the player taps the one that shows it. Only for a subject whose units have tiles (the fish's
square crops around the fish, `UNITS` tiles; none for the corals) and only on units of the subject's own rank
(`quiz.js` `planFind`). It takes the contrast slot: the chance `FIND.P` (0.05), spaced as the contrast questions,
never with a card, in a comeback or with a mix-up queued. The unit and its three others are met and ready, the
look-alikes first (`model.js` `distractors` with every trap); each photo drawn as the quiz draws a unit's, among its
tiles. Scored as a quiz answer with 4 choices (the photo of another unit tapped counts as that unit given, rule L2),
logged `|f` with the photo tapped (`pa`). A subject or player with no tile draws exactly as without it.

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
and `PULSE.SESS_MS`, 5 minutes, into it). Only for the subject the sheet replays (the corals) and in the photo quiz or the
Duel tab. The out-of-game prompts (the sign-in card, this question, the cards about which units are in play) are at least
`PROMPT.GAP` (10) answers apart and never shown over a card (`quiz.js` `PROMPT`, `promptOk`). The answer goes to the sheet as an event with what the game knew then (mode, answers this visit, recent right
%, level, units met); the showing and "Not now" are logged too, for the response rate. Nothing in the game changes with
it.

### Logged for the admin's player journey

The mode of each answer says what the question was: `quiz` the photo quiz, `|s` its custom form, `|d` a duel slipped
in, `|f` a Find the X, `|c` a comeback question, `|h` a held-out photo, `|kN` fewer plausible choices than buttons,
`|t` typed, `|x` a mastery-exam question (`quiz.js` `answer`); the cards keep their kind and time; Open all and the
back card keep their choice. The admin's player journey reads them.

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
the hardest of its view, the views taking turns, 3 look-alike traps; a held-out photo never shown first, else a photo
never shown, else the least seen of those never answered right (`model.js` `examSet`). `TYPED.exam` of them are typed
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
  reaches `FISH_C3` (its Entries component at 55%, or, without the global score, the plain mean at 50%:
  `app.js` `FISH_C3 = {entries: 0.55, mean: 0.5}`), open on the player's yes (or in My progress any time), offered again
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
`easyRank`): reference-level photos first (`core.js` `refLevel`: a reference source's own photo judged easy, or any
photo judged 5 with the reference look: profile, whole, good light, true colours, sharp, one kind of fish), then by
ease, then the most reference-like (`core.js` `refScore`), then a fixed hash of the file name, never by who took it
(rule P1). In the draw a reference-level photo never seen weighs `calib.ref` (3) times more.

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
- **Not built yet** (ROADMAP "Look-alike pairs between species"): the pair drilled in the look-alike formats, family
  pairs, the Look-alikes deck for every subject, the admin's ⚠ badge and its lift, the feature frames' default.

Its level-1 check is in the [notebook](archive/learning-notebook.md) ("The mimicry class: the level-1 check").

### The held-out photos in the game

Some fish observations are kept out of practice for an honest mastery exam (rule L9): never shown in a game, a card, a
sheet or a list, asked only by the mastery exam, first, unannounced and counted like any answer, logged `|h`
(`core.js` `treeHeld`, `model.js` `examSet`). The set is `fish-holdout.json`, written by `tools/holdout.py`: per exam
unit (every family in play, and the scientific genera of the circle-1 families), 15 observations (three exams), never leaving a species with fewer
than 8 in practice, and only from a real surplus: a unit keeps at least 30 observations in practice, else holds back
nothing (learning first). Never Pierre's own photos, a reference source's or a reference-level one. Deterministic and
sticky. A unit's difficulty counts its held-out photos, so withholding them moves nothing.

### Fish: scientific genera, the first step of branch B

The scientific genera of every circle's families are units too (`core.js` `treeGenSets`, `app.js` `treeGenera`): a
photo, then genus names, the sibling genera as look-alikes. Offered to every player as an opt-in set; once on, each
genus opens once its family is at Advanced (`app.js` `sciOpen`). A player who ever answered "I'm at IMR" gets the IMR
genera without the offer, each once its family is at Open Water. **Families met first**: while a slate family may
still open, the genera wait (`model.js` `laterWaits`). Their share of the questions follows "The rank share".

### Fish: the species level, step 1, by common name

One unit per species (`core.js` `treeSpUnits`), named by its common names: the main name shown (the IMR name for a
player at IMR), any listed or regional name right when typed. For each family at Advanced, its species met and the next
one in the family's commonness order open (`app.js` `spPlay`; fish.json `cmi`), at the opening's usual pace and within
the rank share. A species never answered starts from its family's ability; it has no mastery exam (`noex`), so its bar
tops out at 95%. On only once the sheet replays the species units (`sync.js` `SPECIES_SHEET`, rule D4).

### The rank share

A unit that hangs from another (its record's `parent`: a fish genus or species from its family) may open and be asked,
but the units hanging from one level together take a share of the questions set by how much of that level the player
masters (`model.js` `sharesNow`, `shareW`, `shareRoom`): m, the share of the parent level's units in play at their
threshold (`shareAt`, else `LV_AT[SHARE.AT]`, Advanced), and cap = m^`SHARE.POW`. At most that share of the draw goes
to the units hanging from the level, and one more of them opens only while their share is under it. `model.js`
`SHARE = {AT: 1, POW: 2}`. Never capped: the slate, the coral bonus genera, a unit the subject frees (`app.js`
`shareFree`), a unit whose parent is no unit of the game.

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
corals' `ACH`): families met, families at each level, exams passed, the circles, the fish % every 10 points up to 60%,
the scientific genera, the species named by their common names. Only those that rest on learned marks (`core.js`
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
"Pooled photo statistics". `?stats=1` serves `photos`, `gd`, `mem`, `memn`, `conf` and `fmt`. They set how hard each
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
answers]}`) and the offsets in `gd` (`{unit: [offset, weighed answers]}`); 0 is an average photo met for the first
time.

**In the app** (`model.js` `photoDiff`): a photo's difficulty is (n × rating + `PDIFF.W` × prior) / (n + `PDIFF.W`), n
its weighed answers, the prior its unit's `gd` offset plus, for a judged photo, its judged-ease prior ("Fish photos
judged"); a photo nobody has answered is its prior, and every prior is 0 before the sheet's first reply. A unit's
difficulty is read from the same offsets ("One genus difficulty"). The real-log replay that dropped the former Easy /
Medium / Hard photo sets and set `GENUS_K`, and its simulation, are in the notebook. The planned next step, one
difficulty split into rank, family, genus, species and photo components, is in ROADMAP "Engine coherence review".

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
  with them (`SUBJECTS` `replay`: the corals), and the prior `MEM.PRIOR` for every other subject; the prior too with an
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

`conf` holds per pair of units (A before B alphabetically) [offered together, mixed up], counted on the trusted answers
that logged their choices: each wrong choice offered beside the unit shown is one offer, and a mix-up when it was the
answer given (`core.js` `confusionOf` counts the same, and also by direction for the admin). The app turns them into
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
- **Not the fish's**: the sheet rates them (each question at the rank it asked), but the app does not read them (no
  `SUBJECTS` `stats`), so a fish photo's difficulty is its judged-ease prior and every fish pair keeps its prior.

### Photo exposure

How a player's questions spread over a unit's colonies (the fish's observations), so they learn the unit and not a few
photos: the calibration share `CAL.RATE` drawn among the colonies never seen, a colony weighed by its share of the views
in a multi-view question, and a colony counting as seen whatever view of it was shown (`model.js` `colonyMem`), all in
"What a question shows". The admin's Colony view puts up to `admin.js` `CELL_MAX` (40) colonies of a coral genus in the
games, per view; the fish have no cap. The study and its simulations are in the notebook.

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

**Response time: genus and photo** and **Response time as information on difficulty**: the photo ratings, the unit
offsets and the opening order take no answer time; only a right answer's ability steps do ("Response time"). Two
studies measured what the time could add on the unit and the photo side, and one option was tried in three simulated
rounds and not adopted; their records are in the notebook, and the next step is ROADMAP "Time in the photo rating".

## Multifactor analyses (admin Analyses, 2026-11-04)

Pierre, 2026-11-04: multifactor reports of the answer log, refitted at every round thousand of answers (the first 1000, 2000, 3000, …: the milestones, Pierre 2026-11-05), in the admin (ARCHITECTURE.md "Analyses"; code `analysis.js`, tests `tests/analysis*.test.js`). They measure; they change nothing in the app. Methods, shared by every analysis:

- **Crossed random effects.** Player, genus and photo (a question's photos share its photo effect, weight 1/m each), fitted by alternating updates: each level's shrunk effect given the rest (a majorise-minimise step, exact when a row has one level), then the fixed effects, with EM updates of the variance components from the posterior second moments (REML-like shrinkage, without REML's exact determinant term). Gaussian for log response time (`lmm`); logistic with each question's guess rate, P = g + (1 − g) sig(eta), for right / wrong (`glmm`, penalised quasi-likelihood, Fisher scoring), g as the app's (`core.js` `guessOf`: 1/k, ½ for a duel, 0 typed).
- **Intervals.** 95%: the model's own (Wald, from the fixed effects' covariance marginal over the random effects, the inverse of the Schur complement of the joint precision: an effect that is constant within a player, such as a player's habit, gets the players' spread, not the precision of their many answers; Codex review #441) and, from 6 players, a cluster bootstrap over players, whichever is wider. Draws (Pierre, 2026-11-05: at least 999): **999** for the latest milestone in the Action (the percentiles of the draws), **199** for the earlier milestones, newest first, while their answers add up to 60,000, none beyond (the model's own interval only), so that a full recompute stays inside the Action's 2 hours as the log grows (`report`); **Recompute here** in the browser: 199 draws read as a normal interval, the estimate ± 1.96 times the draws' standard deviation, never beyond the draws' range (`boot`, `BSE`: some 200 draws pin a standard error, percentiles need about 1,000, Efron & Tibshirani 1993), earlier milestones not reused from the stored report with the model's own interval only. Seeded: the same answers give the same intervals. Each bootstrap refit starts from the full fit of the same model (`WARM`: the same fit in fewer steps); a draw with no answer moving a feature gives no value for it (`drawn`), never the full fit's or 0. Few players = rough intervals, said by the verdicts.
- **Verdicts** (`verdictOf`, then `correct` over the whole milestone), per effect: *Clear* (after the multiple-testing correction below: its adjusted p at most 5%, so its 95% interval excludes 0, or the app's value for a guess rate, with room to spare); *Within the margin of error* (it includes it and lies within the smallest effect that would matter: ±0.1 log time ≈ 10%, ±0.25 logit, ±5 points, ±0.1 logit for slopes); *Not enough data yet* with the answers needed for an interval as narrow as the current estimate (or that smallest effect), n × (half-width / target)², rounded up; after the correction, the answers for either verdict, whichever comes first: its interval at the level the correction asks of it leaving 0 out, or its 95% interval inside the margin (so it never says it needs fewer answers than it has): a rough power estimate that assumes the interval shrinks as 1/√n (it shrinks slower when the players are few).
- **Multiple testing** (Pierre, 2026-11-05, Q69; the statistical methods study of 2026-11-05, `docs/reviews/2026-11-05-stats-methods-study.md` §2, §5.3, §6.3; `analysis.js` `PRIMARY`, `pOf`, `holm`, `bh`, `correct`; `AV` 4). A milestone holds about 40 effects, each at 95%: about 2 would read clear by chance alone, and the chance that at least one does is about 85%. So each analysis declares the 1-2 **primary** effects it exists to answer, chosen before looking at any result (below), 15 in all (the fish's judged ease added on 2026-11-15), tested together under **Holm** (family-wise error 5%: the chance that even one of them reads clear by chance; valid whatever the dependence between them); every other effect is **secondary, exploratory**, tested together under **Benjamini-Hochberg** (false discovery rate 5%: among the exploratory effects read clear, about 5% at most are chance, on average; valid for independent or positively dependent tests), a lead to re-test on later answers before acting on it. An effect's p-value comes from its 95% interval (the wider of the model's and the bootstrap's) read as a normal one on the side facing the null value, so p < 0.05 exactly when that interval leaves the null value out; the estimate and its 95% interval stay as they were, the verdict uses the adjusted p, and the admin shows the adjusted p only in the verdict's tooltip (rule A2: no method detail on the admin page). Each effect stores its family (`fam` 1 or 2), `p`, adjusted `pa`, and `alo` / `ahi`, its interval at the level its rank faces (it leaves the null value out exactly when the effect is clear). Typed answers in Learning curves are read as right answers against the typical question's, which has a guess floor they lack, so they are tested, and corrected, on that contrast: their null is the coefficient at which they are right as often (log 1.5 at 75% right with a ¼ guess floor), not 0 (`correct` sets `nul`). Not tested: the answers to reach 80% (a number, not a comparison) and effects with no estimate. **The primary effects**, from the questions each analysis was built for (the list above): Response time, *right answers* and *the app's expected difficulty* (is answer time a signal the app could use: does it follow knowledge and difficulty beyond right or wrong; the question of `rtsignal`); Zoom, *enlarged, against the player's own habit* (does enlarging help: its whole question); Photo factors, *poor quality* and *corallites instead of a colony* (the two rules the games' photo sets rest on: Poor photos feed the hard end, and the zoom levels go colony → corallites), and on the fish *the judged ease* (does the ease the fish draw starts from predict the right answers; 2026-11-15, before any fish result was seen); Formats, *right − expected on 4 choices* and *on typed answers* (is the app's expected chance right on its main format and on the one with no guess floor; the model-light check, the most powerful of the three per format); Confusions, *corallites shown* (do close views cut mix-ups: the reason the app shows several views); Learning curves, *the learning slope* and *Again after a miss* (does practice work; does the app's Again help); Comeback, *the forgetting slope* and *comeback questions, right − expected* (do players forget over days; is the app's forgetting curve right); Sessions, *after a wrong answer* (do misses end sessions); Time and difficulty, *others answered the photo right slowly* (does the time others took on a photo say it is harder than the app thinks; Pierre, 2026-11-08). No spread (SD) is primary: an SD's estimate never reaches 0 (EM keeps it above, and its interval is not valid at that boundary), so a spread that is really 0 can read clear, with or without a correction; on a synthetic log with no photo or time spread, both still read clear (ROADMAP "Analyses: what the correction leaves open"). **Milestones are looks, not new studies**: each refits a larger copy of the same log, so a result that turns clear at one milestone is no new finding; the admin no longer marks results "new since the previous milestone" nor charts the clear results over time, and keeps the milestones as history. **Validated** (`tests/analysis-verdicts.test.js`): on 400 made-up milestones of 37 null effects on the analyses' own keys, 1.80 per milestone read clear at 95% before the correction and 0.125 after; a false clear among the primary effects in 5.25% of the milestones (Holm's 5%); a strong effect (6 standard errors), primary or exploratory, stays clear every time. On a synthetic answer log with every effect switched off but two (12 players, 5,400 answers, no bootstrap): 2 of 41 null fixed effects clear at 95% before, 1 after, no null primary effect clear, and the two real effects (the learning slope, typed answers taking longer) clear. A correction cannot remove a bias: a null effect the model gets wrong (here "one view alone", ±0.2 logit across seeds) can stay clear; the bootstrap widens such intervals.
- **Runtimes** (measured 2026-11-05 on a shared machine, one core; made-up logs of 10 players on the real photos; the Action's limit is 2 hours, `.github/workflows/analyses.yml`): 999 draws for the latest milestone cost about 1.7 minutes per 1,000 answers (5,000 answers: 8.5 minutes); a whole report from scratch at 5,000 answers (the latest at 999, the 4 earlier at 199): 10.7 minutes. Estimated: about 33 minutes at 10,000 answers, about 55 at 20,000 (the earlier milestones' draws are capped at 60,000 answers, about 20 minutes); the latest milestone alone reaches the 2 hours near 55,000 answers (ROADMAP "Analyses: what the correction leaves open"). Recompute here in Chromium at 5,000 answers (199 normal-interval draws for the latest, the earlier milestones without bootstrap): 1.9 minutes, where 999 percentile draws would take about 9; a phone is slower.
- **Validated** on synthetic answer logs whose true effects are known (`ANALYSIS.synth`, `TRUTH`): the fits give them back within the test tolerances (response time effects within 0.04-0.06 log units, photo features within 0.25 logit, learning slope within 0.15). Photo random-effect SDs come out a little low (PQL's known shrinkage), a guess rate is pinned only by the weakest answers (its interval stays wide).

The analyses:

1. **Response time**: log seconds ~ right + typed + enlarged + 2 choices + the app's expected difficulty + log position in the session + (player) + (genus) + (photo). Variance shares; genera, players, photos shrunk. Earlier measure: "Response time" (branch `rtsignal`), which found time informative beyond correctness.
2. **Zoom**: right ~ offset (the app's log-odds) + enlarged relative to the player's own habit + the habit + (player).
3. **Photo factors** (explanatory IRT, an LLTM with a photo random effect): right ~ view + quality + sharpness + source + one view alone + typed + (player) + (genus) + (photo); read as difficulty. The photos furthest from what their features predict are listed. **On the fish** (2026-11-15, `AV` 14; ROADMAP "Analyses for the fish"): the same model on the fish photos' judged features, right ~ judged ease (per point, centred on 3) + juvenile + another phase (male, female, intermediate) + oblique + head-on / tail / from above + part of the fish + typed + (player) + (family or genus asked) + (photo), from the photos the game plays (fish-game.json: Pierre's ease and tags where he set them, else the judging pass's); a fish question shows one photo, so no "one view alone"; a feature no answer measured is left out. The judged ease is its primary effect, chosen before any fish result was seen: does the ease the draw starts from (easy photos first) predict the right answers? On a made-up log with 0.6 logit per ease point and a juvenile 0.5 harder, the fit finds both (`tests/fishphotofactors.test.js`).
4. **Formats**: per format, P = c + (1 − c) sig(x + d), x the app's own log-odds: the real guess rate c against the app's fixed one, and the difficulty d the app misses.
5. **Confusions**: each wrong choice offered, picked or not ~ view shown + log(wrong choices) + (pair) + (player): views that confuse more, and how much each player differs from the pooled rates (observed / expected, with the player's own effect as an odds ratio beside it).
6. **Learning curves**: right ~ log(1 + answers on the genus) + after a miss (on the genus shown or given wrongly, as the app counts it) + Again asked after it + typed + exam + comeback + (player) + (genus) + (0 + practice | player) + (0 + practice | genus) (from `AV` 11: each player's and each genus's own learning slope around the common one, uncorrelated with its level, the practice centred on the answers' mean so each level is the level at typical practice; `lnFit`, `factor` with weights, `glmm` with the exact curvature of a slope's level; Pierre, 2026-11-04, ROADMAP "Analyses: next views", per-genus learning slopes; 2026-11-05, the profiles' learning slope); their spreads (`sd_gslope`, `sd_pslope`, read as the gain from twice as many answers either side of the common slope; exploratory, never primary as every SD); answers to reach 80% beyond guessing, overall and per genus, each genus at its own slope (0 when the start is already there; its interval from draws of the intercept and the slope together, and of the genus's own level and slope). The first-meeting card and the side-by-side comparison leave no row in the answer log: not measurable yet (ROADMAP).
7. **Comeback**: after a right answer on a genus, right ~ offset (that answer's expectation) + log(1 + days since) + (player): the forgetting slope; and the comeback questions' right − expected (the FSRS curve of "Comeback after a break").
8. **The rank asked** (the fish; the fish parity review, #1056; the integrator, 2026-11-17, after Pierre's "Fais les choix tout seul si ils sont faciles à revenir dessus": a rank effect in the models rather than one report per rank, which would add sheet tabs; `AV` 15; `analysis.js` `rankOfUnit`, `rkLev`, `rankRef`; tests `tests/analysis-ranks.test.js`). A fish question asks a family (`f:` ids), a scientific genus (`g:`) or, since v161, a species unit (`s:`); each answer's rank is read from the unit's id prefix, else the log's Rank column (sheet v60), else the subject's own rank. For a subject with a sheet per rank (`SUBJECTS` `sheets`: the fish; the sea slugs too once they have a report), the reference is the rank of its game units from the start (the fish's families), and each other rank with 20 answers or more gets a 0/1 column, its questions against the reference's, in every model with a unit-level term: **Response time** (log seconds), **Photo factors** (difficulty), **Confusions** (log-odds of a mix-up per offer; a question's choices stay within its rank, so a pair has one rank) and **Learning curves** (log-odds of a right answer, with **Answers to reach 80%** on a typical unit of each rank, `n_rk_*`). The unit's random effect then varies around its rank's mean; where a view lists units (seconds by unit, answers to 80% by unit, the Wright map, each unit with practice, the pairs most mixed up), each unit's own value carries its rank's coefficient (its variance added to the unit's), and the admin draws each rank's units apart under "Family / Genus / Species questions". **Formats** (no unit-level term: each format against the app's own log-odds) gains each rank's right answers against the app's expected chance (`oe_rk_*`, every format together), as the app's Elo carries a rank offset of its own. Not changed: Zoom, Comeback and Time and difficulty's first part (the app's expected log-odds as an offset, the rank's offset in it), Time and difficulty's second part (its question is the photos' time intensity; the unit's random effect holds its rank's mean there), Sessions, and the profiles' features but the player's pace and learning slope (fitted with the ranks). The rank effects are exploratory (Benjamini-Hochberg); none is primary, so the primary family is the one chosen before any result. Assumptions: the rank is a unit-level covariate (each unit has one rank), identified between units, so its precision follows the number of units per rank, not the answers; the units' spread is the same in every rank (one variance component); the rank effect compares the same players' questions at different points of their path (genus questions come later, once a player has opened them), so a player's growth between those points is in the player's effect only as an average: in Photo factors, which has no practice term, a rank effect also holds what players learned meanwhile, and Learning curves (with practice) is its cleaner reading; the bootstrap is over players, not units, so the interval for a rank effect leans on the model's own (Wald) part, which counts the units' spread. Checked on a made-up fish log with 16 units of each rank and a planted rank effect (0.8 and 1.4 logit harder, 0.3 and 0.5 log seconds slower): the time shift comes back within 0.15, the difficulty inside its 95% interval in the planted order, each rank's right − expected near 0 (the made-up app knows the rank); on the corals (one rank) every result is the same as before, also against `main` on a fixed made-up coral log (byte for byte, but `AV`).
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

**Long rated runs: the false-alarm table** (2026-11-15, after #975's 10,000-answer check could not end in the workflow's
6 hours: 34 minutes a run with the species in). Every unit's bar reads its false-alarm rate (`core.js` `faOf`), which
scanned every record of the player's progress, and the planner reads the bars of every unit in play several times an
answer: the cost grew with the units met times the units read, and the scan was the largest single part of a profile
(23-29% of the time on their own, 36-45% with the bar around them; fish, `main` and #975, 1,000-3,000 answers). The
rated world now arms a table for each answer (`core.js` `faArm`, `tools/ratedworld.js` `step`): the first read builds
every unit's false alarms and chances in one pass over the records, in the scan's own order, so each value is the
scan's to the last bit, and `scoreAnswer` empties it. The app and the sheet never arm it and scan as before. The same
seeds give byte-identical `--out` files (the date, commit and run time aside) and reports, and every read of a run can
be checked against the scan (`FA_CHECK`, `tests/faof.test.js`). On the shared machine a 3,000-answer fish run of the
expert (seed 1, without #975's species) took 35 s against 139 s with the scan.

**The rated world, built** (`tools/ratedworld.js`, `--world rated`; the distributions in its `RATED`, the one place they
are stated). The fish units are built as the app builds them (`core.js` `treeGen`, `treePhotos`, `app.js` `treeGenera`
cut out as `tests/rareease.js` cuts `model.js`): 65 families in three circles, the 237 scientific genera (every circle's since 2026-11-18; 130 before), every game photo.
A seed draws its world: each unit's μ and each photo file's ε (above), the photo's judged ease from ε, the player's π
(each genus's and species' μ on a stream of its own, keyed by its id, since 2026-11-18: a version with more or fewer
units plays the same photos and the same other units, so the arms stay paired);
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
learner's true logit + noise; `--times` sets β: `rho25`, `rho0`, `views`, `fast`, as the notebook's "Q315 option 1: what three
rounds showed" describes); every `--every` rounds `core.js` `eloOf`, `genusOffsetsOf` and `photoMemOf` are replayed on the log
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
| Fish families at Advanced (`famAdv`) | 300 and 600 questions; 1,000, 3,000 and 10,000 answers | −2 families or −5%, the larger | the families' pace while genera and species share the draw (#892, 2026-11-15); the margin of the units at Open Water |

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
`perPhoto` (answers per photo shown), `genShare` (the share of answers on the fish scientific genera, a fish run only: Q208, 2026-11-09), `famAdv` (the fish families at Advanced) and `spShare` (the share of answers on the fish species; both 2026-11-15, the species level), `right`, `prog`, `thErr`. The species units (kind `species`) are in both worlds
since the species level (step 1, by common name); the scientific species names do not exist yet. After the guardrails,
learncmp also prints, with no margin, the right %, `genShare` and `spShare` at each checkpoint (its `WATCH`), with the
one-sided bounds either side.

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
  N(0, NOISE²) (by default `JUDGE.NOISE` 0.3), as if 20 trusted answers had rated each photo.
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
  answers are kept as a trace for `tools/fallbackeval.js`.
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
  and their true reference success then and when learned; the exam, held-out, duel, Find the X and Again questions and
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
  difficulties of g's photos, its held-out ones included. learnsim keeps D\* and the bar shown per genus met.
- **The exemplar learner** (`--learner exemplar`, `LEARNER.EX`: K 8, R 0.6, D 8, B 0.03): a summed-similarity model
  after the GCM (Nosofsky 1986), with a background (guessing) term. Every photo shown is stored as an exemplar of the
  genus shown, a miss's montage stores a typical photo of the genus given, and prior know counts as know / (1 − know)
  typical exemplars (50 at most). A photo of difficulty d sits at atypicality R σ(d) (plus the single view's offset);
  its similarity to an exemplar of c is exp(−K √(D_tc² + r² + r_e²)), the very same photo exp(−K D_tc), with D_tc = D
  (1.1 − s(t, c)); P(t) = S_t / (Σ_V S_c + B), S_c the summed similarity to c's exemplars. It is the third world,
  beside item and field: a genus never stored does not compete, so a drilled genus is truly named right.
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

- 2026-11-17, Q391 (Pierre, 10:52 Manila: "Q391 a oui, b oui"), #953 rebuilt ("Juveniles and colour phases on their
  unit's mastery"): the fixed stage of 2026-11-15 replaced by a ramp of each unit's own bar per variant kind (`core.js`
  `VAR_AT`: early-class juveniles from the start, the other juveniles and the sexes and colour phases from Open Water to
  Advanced, late-class juveniles at Advanced; a family's own thresholds in `fish.json` `varAt`), and "Learned" asking a
  right answer on each variant group (fish rules version 3). Its level 2 check declared there, results pending.
- 2026-11-15, the ROADMAP row of 2026-11-07 (Pierre: "we must put back a progressive path that presents juveniles and
  sexual dimorphism"), built in #953 ("Juveniles and colour phases in stages"): phase photos held back from a unit's
  first `SUBJECTS` `calib` `phase` answers (fish 10), then in stages; two cards per subject. Checked at level 2: the
  primary as intended in both worlds; the app world's no-wall check fails at 300 questions (10 runs of 100 meet no phase
  photo), the rated world's heavy tails breach the lecture RA's wait for the first Open Water (+14 answers); N, the
  class-A juveniles and the breach go to Pierre with the PR.
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
  changed; back to Pierre (the notebook's "Above a level"). Q338, decided: "option a, B10 après 200 réponses": N 10 from 200 answers,
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
  a beginner who said "IMR course" from a lecture RA: a placement test is the follow-up (the notebook's "The rule since 2026-11-04").
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
