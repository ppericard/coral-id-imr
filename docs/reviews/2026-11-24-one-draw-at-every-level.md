# One draw at every level: a photo's weight from its expected success, with no phase (REE-245)

**Status: design only (docs).** Nothing is built: `model.js` and `core.js` are unchanged. Written on 2026-11-24 (Manila
afternoon) on `origin/main` at `92822879`. Every file:line below is at that commit. This note replaces the proposal of
[2026-11-23-continuous-ease-draw.md](2026-11-23-continuous-ease-draw.md) (#1494, section 2). Its measurements of
today's draw still stand.

**The request.** Pierre, 2026-11-24 13:50 Manila, on the REE-245 design:

- On the rule of 2026-11-06 («avant Open Water, une photo sous facilité 4 peut venir, mais rarement»): «A mon avis, la
  règle est trop dure, et appelle des seuils en dur. Comme partout on veut un moteur dynamique et adaptatif, qui
  s'adapte au joueur et à la base de donnée».
- On no guaranteed 10% (3B-1): «ok».
- On where the effect ends, Open Water or Advanced (3B-2): «A nouveau ça me gène. Ca veut dire qu'on a une mécanique
  qui ne s'applique que pour une partie de la progression au lieu d'un mécanisme continue géré par le moteur quelque
  soit le niveau dans la progression du joueur. Est-ce qu'on peut faire mieux?»

Before that, on 2026-11-23 at 16:18: «je préfère beaucoup plus les solutions simples et continues que des choses avec
des catégories ou des bascules, des interrupteurs».

**The integrator's reading (REE-245, 2026-11-24):** the draw must have no phase. A photo's weight follows how well its
expected success for this player matches the success the engine aims for. A beginner meets easy photos because they are
the ones they can succeed on, not because of a rule "before Open Water".

**In one paragraph.** The engine already has that mechanism. Every photo is weighed by how close its difficulty is to
the target of the difficulty controller, at every level. `RARE` sits on top of it and carries Pierre's rule of
2026-11-06. The ablation of section 2 shows what it compensates for (my reading): two parts of the draw lift photos
whatever their difficulty, the floor and the variety lift, and each photo weighs on its own, so a unit's many hard
photos outweigh its few easy ones. This note proposes:

- removing `RARE` and the Open Water switch;
- removing the two lifts that ignore difficulty;
- drawing a level of difficulty first, then a photo at it, so the number of photos at a difficulty no longer decides
  how often that difficulty comes.

Variety then comes only from the photo memory, the last two observations and the session window. No constant is added.
Six are removed. A feasibility run (section 6, exploratory) shows what to expect, against today's draw:

- **The step at Open Water is gone.** The share of hard photos rises smoothly with the player, before and after 0.5.
- **An expert gets real challenges from a unit's first questions**, where today's cap holds them at 9% under ease 4.
- **A beginner gets more photos at ease 3 than today on units rich in easy photos**: 17% under ease 4 against 9% in a
  stationary draw with 12 easy adults, and 27% against 10% over a 15-question session.
- **A beginner gets about as many ease 1-2 photos as today**: 1-2% against 2-4%, within the run's noise.
- **Against the same draw with `RARE` simply removed** (#1494's "none"), the beginner's ease 1-2 share falls from
  7-16% to 1-2%.

## 1. What the draw does today, at every stage

Two choices make a question: which unit, then which photo.

### 1.1 Which unit

`quiz.js` `planPhoto` calls `nextTarget` (`quiz.js:3025`; the custom quiz at `quiz.js:3024`).

- `nextTarget` (`model.js:1596-1605`) draws with `weighted` (`model.js:1585-1594`). It never draws the same unit twice
  in a row while others exist, short of ten draws in a row falling on it (`model.js:1601`).
- `weight` (`model.js:613-617`) is `drawW` (`model.js:608-612`): 1 − σ(ability − genus offset) × m / (m + `ELO.n`),
  continuous in the ability.
  - A unit whose exam is ready weighs 1. One whose exam waits between two questions weighs × 0.05 (`examOn`,
    `examReady`, `model.js:1906-1911`, at the bar's `DOM.EX`).
  - One asked in the last 4 questions weighs × 0.1 (`lastQs`).

There is no Open Water switch here.

### 1.2 Which photo: `photoSet` (`model.js:181-358`)

`photoSet` is not in `app.js`. Its callers are:

- the photo quiz (`quiz.js:3083`);
- the Again question (`quiz.js:2976`), Find the X (`quiz.js:2927`) and the slipped duel (`quiz.js:3041`);
- the Duel tab (`quiz.js:3186`) and the live game (`live.js:727`).

The steps, in order:

| Step | Where | What it does | Keyed on the level? |
| --- | --- | --- | --- |
| Held, calibration question | `model.js:204-205` | On a unit the player holds (met, not shaky), `CAL.RATE` (0.3) of the questions draw only among observations never seen. | The `shaky` gate (`model.js:653-658`): expected success on an average photo under `OPEN.P` + aim − `TARGET_P`. |
| Single view | `model.js:206`, `singleP` `model.js:89` | `FORMAT` (`model.js:70-86`) on the unit's ability: no single view below 0.54, 85% from 1.8. | Ability, piecewise linear, flat outside. |
| The start's lean | `model.js:214` | The target sits `calib.early` (fish and sea slugs 1.5, corals 0) × `PDIFF.W` / (`PDIFF.W` + answers on the unit) lower. | Answers on the unit, continuous. |
| **The target** | `model.js:215` | ability + shift − `aimOff(k, df)` − `PICKD.SINGLE` (single view) − lean. `aimOff` (`model.js:63-66`) turns the aim into logits after the guess rate. | The aim follows the global level: `core.js` `AIM`, `aimOf` (`core.js:5699-5706`), 0.85 up to a level of 0.5, 0.75 from 1.5, linear between. |
| Variants | `model.js:221-224`, `varOf` `model.js:408` | Juveniles and phases weigh their ramp on the unit's bar, `core.js` `VAR_AT` (`core.js:1153-1157`): early juveniles from the start; other juveniles and phases from 0.5 to 0.8; late juveniles a step at 0.8. | The bar: the Open Water and Advanced values. |
| **The targeting** | `model.js:231-234` | Each photo weighs exp(−x²/2), with x = (`photoDiff` − target) / `calSd`. `photoDiff` (`model.js:1805-1811`) is the photo's estimate: its prior (genus offset + (`PDIFF.MID` − ease) × `calib.ease`) until answers take over at `PDIFF.W` (5) answers' weight. `calSd` (`model.js:106`) is √(`PICKD.SIGMA`² + u / (1 + answers / `CAL.N`)), u = `calib.u` (fish 0.25). | No. |
| Online calibration | `model.js:234`, `calBonus` `model.js:101`; `setBonus` `model.js:123` | Photos few players answered weigh up to × 3; the calibration set × 2, near the target, on held units. | No. |
| **The photo memory** | `model.js:240-241`, `colonyMem` `model.js:130-140` | A photo never seen weighs × (1 + 1.5 × the share right in the unit's last 5 answers), and × `calib.ref` (fish 3) when it is reference-level (`core.js` `refLevel` `core.js:1122`: ease 4-5 and the reference look). A photo shown weighs × e^offset of its memory bucket (`core.js` `MEM`). | No. |
| One observation | `model.js:267-277` | Observations score by their photos' weights. The last two observations on the unit weigh × 0.15 (`s.ro`, `model.js:275`). | No. |
| **`RARE`: how hard each photo counts** | `model.js:284-301` | `rareHard` (`model.js:29-36`): under ease 4, hard; a unit with fewer than `RARE.FEW` (12) easy observations rotates its 12 easiest, those at the last ease reached sharing the places left (#1391). | **`model.js:290`: `genScore(n) < LV_AT[0]`, only before Open Water**, and only on units of the subject's own rank (`rareOn`, `model.js:39`). |
| Calibration exception | `model.js:305-308` | Before Open Water, with every easy observation seen, the seen easy ones stay (`keep`, `model.js:306`). | Through `rare`. |
| The session window | `model.js:313-317`, `SEENQ` `model.js:146-175` | An observation shown or planned in the last `RECENT` (10) questions waits while another can be drawn. It never leaves only observations the draw holds back (`whole`, `model.js:315`: before Open Water the hard ones, and the variants). | Through `rare`. |
| **The variety lift** | `model.js:318-325` | The best `PICKD.VARIETY` (3) observations are lifted to at least half the top weight, whatever their difficulty. | No. |
| **The floor** | `model.js:326-329`, `drawFloor` `model.js:127` | Every observation keeps at least `PICKD.FLOOR` (0.05) of the top weight, shared over `calib.pool` (fish 30, sea slugs 20, corals all) observations in a big unit, whatever its difficulty. | No. |
| **`RARE`: the cap** | `model.js:331-334`, `rareCap` `model.js:43-48` | Last, so neither the lift nor the floor lifts hard photos back: they make at most `RARE.SHARE` (0.1) of the draw. | Through `rare`. |
| The draw | `model.js:335-338` | An observation by its score, then its photo by the photo weight. | No. |

The mastery exam draws with `examSet` (`model.js:548`), a photo never seen, at the bar's `DOM.EX` (rule L9). It is not
part of this design.

**There is no separate targeting after Open Water.** Past Open Water, `rare` is false, and the draw is the targeting,
the memory, `s.ro`, the window, the lift and the floor. That draw already runs at every level. `RARE` is the only part
of the photo draw that switches with the level.

**Target success rate.** `core.js` `TARGET_P` 0.8 (`core.js:5693`) is the reference. `AIM` sets the aim per player from
the global level, 85% to 75%, with no step. Nothing in the draw aims at a success rate per phase.

### 1.3 Everywhere the bar or the level changes behaviour

| Place | What it gates | In this design? |
| --- | --- | --- |
| `RARE` (`model.js:290`) with `keep` (`:306`), `whole`'s rare clause (`:315`), the cap (`:331-334`) | Hard photos before Open Water. | **Removed.** |
| `rareOn` (`model.js:39`) | `RARE` on the subject's own rank only. | **Removed**, with the cap it scopes. |
| `VAR_AT` (`core.js:1153`) | Juveniles and phases from Open Water to Advanced (late juveniles a step at 0.8). | Not changed: Pierre's rule on the variants (Q391 a). Question 4. |
| `TYPED` (`model.js:1839-1849`; `quiz.js:3073`) | Typed questions from a bar of 0.5, rising from 0 (no step). | Not changed: rule L9 ("never as an on/off mode"). |
| `examOn`, `examReady` (`model.js:1906-1911`) | The exam at `DOM.EX`. | Not changed: rule L9. |
| `held` / `calQ` (`model.js:204-205`) | Exploration only on units held. | Not changed: a state of the unit (shaky), not a phase of the progression. |
| `app.js` `sciOpen` (`app.js:1128-1132`) | A family's scientific genera at its Advanced (IMR genera at Open Water). | Not changed: which units open, not which photo. Question 4. |
| `app.js` `spPlay` (`app.js:1083-1092`) | A family's species at its Advanced. | Not changed. Question 4. |
| `app.js` `sciShow` (`app.js:1286-1293`) | Scientific names shown alone, rising from Open Water to Advanced. | Not changed: a display ramp. |
| `AIM` (`core.js:5699`), `FORMAT` (`model.js:70`) | The aim by global level, the format by ability. | Kept: continuous, every level. |

## 2. Why the targeting alone was not enough: the diagnosis

#1494 measured an arm "none": `RARE` removed, nothing in its place. A beginner (ability 0.5, bar 0.05) then drew 72%
under ease 4 on a family with one easy adult, and 43% on a big family. The targeting is the very mechanism Pierre asks
for, so the question is which part sends a beginner photos the targeting does not want. The code allows three causes:

1. **Counts.** Each observation weighs on its own, so 240 hard photos at a small weight each can outweigh 12 easy ones
   at a large weight. The draw then follows the pool's make-up, not the player.
2. **The two lifts that ignore difficulty.**
   - The variety lift raises the second and third best observations to half the top weight.
   - The floor gives every observation 5% of the top, shared over 30 observations in a bigger fish unit: 1.5 times the
     top weight in all on any fish unit of 30 observations or more.
   - Neither looks at difficulty. For a beginner whose target lies below the easiest photo, they are most of the hard
     photos' weight.
3. **The width.** For a fish photo nobody answered, `calSd` is 0.86 logit, against 0.5 logit for an ease point.

**The ablation** (section 6, exploratory) takes them out one at a time, `RARE` off in each arm:

- **The lifts.** Removing them takes the beginner's ease 1-2 share from 7-16% to 1-2%, for 1 to 12 easy adults.
  They do nothing for the player of #1391 (ability 2.2) or the expert (3.0): their rows are identical with and without
  them, because the lifts never bind when the target sits inside the pool.
- **Counts.** With the lifts already off, correcting them takes the beginner on a big family from 37% to 22% under
  ease 4, and on a family with one easy adult from 52% to 31%.
- **The width** is not a cause of its own. It is the photo's uncertainty, and it stays.

**What no weight can do.** A beginner's target is about 0.5 − 1.39 − 1.25 = −2.1 logits, with #1494's beginner and
fish values: ability, aim, then lean. The easiest fish photo's prior is −1 (ease 5). So on a family with no easy
photo, every photo is harder than the target, and the draw takes the nearest. Other levers protect a beginner there,
and all of them are continuous:

- the opening order: families with easy photos open first (`genusDiff` includes the ease prior, `easyWeights`
  `model.js:882`);
- the format: no look-alike trap at an ability of 0 or below, and fewer plausible choices (`plausibleK`);
- the unit's draw weight (`drawW`);
- content: the refill of easy photos (`EASY_NEED`, `tools/fetch_fish.py`).

## 3. The proposal: one draw

### 3.1 The weight

For a question on unit n, each observation k the draw can show weighs

> **w(k) = T(k) / ρ(k) × M(k)**

**T(k), the targeting: how well the expected success matches the aim.** T(k) = exp(−x²/2), with x = (d(k) − t) / s(k),
as today (`model.js:232-234`).

- d(k) is the photo's difficulty estimate (`photoDiff`): its judged-ease prior until answers take over.
- t is the target: the ability on the unit, less the aim in logits after the guess rate (`aimOff`), less the lean.
- s(k) is the estimate's uncertainty (`calSd`).

Written in expected success, x is the logit distance between this player's expected success on the photo,
1/k + (1 − 1/k) σ(ability − d(k)), and the success aimed for, measured in units of the estimate's uncertainty. A photo
on target weighs 1, and one far from it in either direction weighs little. The Gaussian on the logit scale is already
asymmetric in success: one logit harder costs more success than one logit easier gains near an 85% aim. That is the
asymmetry Papoušek, Pelánek and Stanislav (2014) build in by hand (section 4).

**ρ(k), the pool's density at that difficulty (new step, no new constant).** ρ(k) = Σ_j exp(−((d(k) − d(j)) /
s(k))² / 2) over the observations the draw can show (j = k included). Dividing by it means the draw chooses how hard
first, by the targeting alone, and then which observation at that difficulty.

- Twenty observations at ease 3 then weigh, together, what one observation at ease 3 would. They no longer weigh twenty
  times as much as a lone easy photo.
- This is what "adapts to the database" means here: the pool's make-up decides which photos come, never how hard they
  are.
- The bandwidth is the targeting's own s(k), so nothing is added. On a unit where every photo has the same estimate
  (a new coral genus, no answers), ρ is the same for all and nothing changes.

**M(k), variety, as today.**

- The never-seen bonus, with the reference-level × `calib.ref`.
- The photo memory: e^offset of its bucket.
- The last two observations × 0.15 (`s.ro`).
- The online calibration (`calBonus`, `setBonus`).
- The variants' ramp.
- The session window, which still makes a recent observation wait while another can be drawn.

Where a photo is read as new (the targeting) and where the memory acts (a factor) is today's split, kept here.
Question 2 asks about the other way.

The photo within the observation is drawn on the same photo weight, as today.

**Where it applies.** Every unit of every subject, at every bar and ability. There is no `rareOn` scope, no ease bar,
and no reference to Open Water.

### 3.2 What it replaces

| Goes | Kind | Its role, taken over by |
| --- | --- | --- |
| `RARE.E` (4), `RARE.FEW` (12, #1391's floor), `RARE.SHARE` (0.1) | 3 constants | The targeting with ρ. |
| `rareHard`, `rareCap`, `rareOn` | 3 functions | The same. |
| The switch `genScore(n) < LV_AT[0]` in the draw (`model.js:290`) | A phase | Nothing: there is no phase. |
| The calibration question's `keep` (`model.js:306`) and the `rare` clause of `whole` (`model.js:315`) | 2 exceptions | Not needed: nothing is capped. `whole` keeps its variants clause. |
| The variety lift (`model.js:318-325`): its 0.5 and its use of `PICKD.VARIETY` | A step, 1 constant | Variety by memory, `s.ro` and the window. `PICKD.VARIETY` stays for the variants (`model.js:425`). |
| The floor: `PICKD.FLOOR` (0.05), `drawFloor`, `calib.pool` (30, 20, all) | A step, 2 constants | Exposure by the online calibration (`CAL.B`, `CAL.RATE`, the calibration set), the memory and the never-seen bonus. |

Six constants go and none is added. The section "Rarely under ease 4 before Open Water" of LEARNING.md goes. "The fish
draw in big pools" keeps `calib.u` and loses `calib.pool`.

### 3.3 What remains, each with its meaning

| Constant | Value | Meaning |
| --- | --- | --- |
| `AIM`, `TARGET_P` (`core.js`) | 0.85 → 0.75 by global level, 0.8 | The success each question aims for (section 4). |
| `PICKD.SIGMA` | 0.7 | The targeting's width for a well-measured photo, in logits. |
| `calib.u`, `CAL.U`, `CAL.N` | 0.25 fish, 1 corals; 2 | How unsure an unanswered photo's estimate is, and how fast answers settle it. |
| `calib.ease`, `PDIFF.MID`, `PDIFF.W` | 0.5 (0.3 after #1519), 3, 5 | The judged ease as the photo's prior, and the weight of that prior against answers. |
| `calib.early` | 1.5 fish and sea slugs, 0 corals | The start's lean on a unit with few answers, fading as 5 / (5 + answers). Continuous at every level. |
| `PICKD.SINGLE` | 0.5 | A single view counts as harder. |
| `MEM` offsets, the never-seen bonus 1.5, `s.ro` × 0.15, `RECENT` 10 | | Variety. |
| `calib.ref` with `refLevel` (ease 4-5 and the reference look) | 3 | A reference-level photo never seen first. |
| `CAL.B`, `CAL.RATE`, `CSET` | 2, 0.3, {B: 2, N: 20} | Exposure for the photo ratings. |

**Ease levels left after this design:**

- **`refLevel` keys on ease 4 or more, and it stays in the draw**: a reference-level photo never seen weighs
  `calib.ref` (3) times more, in M(k). It is the one ease threshold this design leaves in the draw. It carries the
  reference look of Pierre's card order ("Fish: easy, reference-like photos first"), and his 13:50 answer on reference
  photos («une note de 5 … doit être donné pour les photos qui cochent toutes les cases») may redefine it. The
  mechanics study checks it as an arm (section 7.2), and question 5 asks about it.
- `EASY_NEED` (3) is the refill's count of easy photos (`tools/fetch_fish.py`), in the content pipeline, not the draw.
- The guardrail `hard` (share under ease 4 before Open Water, margin half of `RARE.SHARE`) loses its basis
  (question 3).

## 4. The learning-science basis (public sources, quotes checked against the texts)

- **Desirable difficulty, and when it stops being desirable.** E. L. Bjork and R. A. Bjork (2023), "Introducing
  desirable difficulties into practice and instruction: obstacles and opportunities":
  - «many difficulties are undesirable during instruction and forever after. Desirable difficulties, versus the array of
    undesirable difficulties, are desirable because they trigger encoding and retrieval processes that support learning,
    comprehension, and transfer. If, however, the learner does not have the background knowledge or skills to respond
    to them successfully, they become undesirable difficulties.»
  - «the appropriate level that is optimal may vary considerably based on a student's background and prior level of
    knowledge.»
  - The level of difficulty belongs to the player, not to a phase: that is what the targeting computes.
- **Selecting by expected success against a target.** Papoušek, Pelánek and Stanislav (EDM 2014), the adaptive
  practice of facts this engine follows ("One difficulty controller"):
  - «it is optimal to use questions with expected probability of a correct answer reaching 50%, because such question
    provide most information about students' knowledge. However, 50% success rate is rather low and for most students
    it would decrease motivation. Thus in our setting (adaptive practice) it is better to aim for a higher success
    rate. At the moment we aim at 75%».
  - Their score of a question compares the estimated success P_est with the target, divided by P_target below it and by
    1 − P_target above it, because «The distance from the probability for the difficult countries (nearly 0% chance of
    the correct answer) is higher than for easy ones (almost 100%), so it is necessary to normalize it.»
  - Their selection is one scoring at every moment: success, time since last asked, times asked. There is no phase.
- **How high the target.** Wilson, Shenhav, Straccia and Cohen (2019), *Nature Communications* 10, 4646, for «a broad
  class of learning algorithms in the context of binary classification tasks»: «the optimal error rate for training is
  around 15.87% or, conversely, that the optimal training accuracy is about 85%».
  - Scope: stochastic gradient-descent learners. It is a model result, not a measure on people.
  - Papoušek, Stanislav and Pelánek (2016), in a geography system with target error rates of 5%, 20%, 35% and 50%:
    «easy questions are better for short term engagement, whereas difficult questions are better for long term
    engagement and learning».
  - So the literature does not fix one number. `AIM` (85% for a beginner, 75% for a strong player) stays as decided.
    This design changes how the draw meets the aim, not the aim.
- **Elo for adaptive practice.** Pelánek (2016), *Computers & Education* 98: the ability and the photo difficulty on
  one scale, which is what makes "expected success for this player" computable for any photo at any level.

## 5. Against the four guiding aims

The aims are read from PR #1500, still open at the time of writing (branch `players-goals`, LEARNING.md "The players
we design for"; the digest «ok», Pierre, 2026-11-24 13:50).

1. **A complete beginner is never faced with what is too hard.** This is where the one draw costs something against
   today, and the simulation must weigh it.
   - Ease 1-2, the photos far too hard: 1-2% against 2-4% on main in a stationary draw, within the run's noise. Against
     "none", 7-16%. Not measured over a session.
   - Ease 3, harder but within reach (the model expects a beginner of ability 0.5 to get about 72% right): more than
     today on units rich in easy photos. Under ease 4, stationary: 17% against 9% with 12 easy adults, 23% against 19%
     with 6, and 22% against 9% on a big family. Over a 15-question session: 27% against 10% with 12 easy adults, 43%
     against 33% with 6.
   - On thin families (1 to 3 easy adults) it is about the same as today: 28-31% against 26-55% stationary, 60-77%
     against 57-80% over a session.
   - The model's own mean expected success on a beginner's stationary draws is 0.80-0.82 against 0.78-0.80 on main,
     against an aim of 0.85. This is the engine's estimate, not a measure of the player.
   - What raises the session share is the photo memory, not the window (table 5): once the easy photos are seen, the
     never-seen bonus makes a new harder photo outweigh a seen easy one. Question 2.
   - Today's cap held these at 10% whatever the player. The one draw lets the player's level and what they have seen
     decide.
2. **An expert meets real challenges early.**
   - Today `RARE` holds an expert on a new unit, before its bar reaches Open Water, at 9% under ease 4 on a big family
     or a family with 12 easy adults.
   - With the one draw: 87% and 69%, from the unit's first questions.
   - The expert of the harness (ability 3.0) still succeeds about 96% of the time at the model's estimates: the pools
     hold no photo hard enough for them. That is the content limit of aim 3, at the top.
3. **Content is scarce.** The draw no longer spends the scarce easy photos on players who do not need them: an expert's
   draw leaves them.
   - A beginner's draw concentrates on the few easy photos a thin family has: the most drawn observation goes from
     45% to 69% with one easy adult (stationary, nothing remembered).
   - In a session the memory, `s.ro` and the window spread it: 11.4-11.6 distinct observations in 15 questions with 1 to
     3 easy adults, against 11.0-12.0 on main. The worst run showed one observation 5 times in 15 (main: 4 to 5).
   - Pierre's aim 3 accepts a beginner seeing a photo again. What they learn is checked on photos never seen (the
     exams, the reserve).
4. **Variety.** Variety now comes from the memory and the window, which act on what the player has seen, not from
   lifting photos the targeting does not want. The player of #1391 sees 13.8-14.3 distinct observations in 15 (main
   11.8-13.6).

**The thin fish families.** A family with 1 to 3 easy adults has nothing near a beginner's target but those adults.

- The one draw shows them most of the time. Once they are seen (the memory) or recent (`s.ro`, the window), it takes
  the nearest harder ones, mostly ease 3.
- Over 15 questions in the run, a beginner saw 60-77% of their photos under ease 4 on such families, against 57-80% on
  main. That share is set by the content and the window, not by the rule.
- The fix is content: more easy photos (Pierre, 13:50: «on traine des pieds pour ajouter des photos»; REE-243, the
  refill).
- The draw cannot invent an easy photo. It does make sure the easy ones go to the players who need them.

## 6. The feasibility run (exploratory, small)

**What it is.** The harness of `tests/rareease.js` through `tools/studies/ree245/sim.js` (`model.js` `photoSet` in a
vm, the game stubbed, seeded draws), with `model.js`'s text patched in memory per arm. The script is not in the
repository, because this PR is docs only. Its arms are described exactly so it can be redone. The numbers are not
reproducible from the repository alone. It ran on the shared machine through `tests/slot.js` with `SMOKE_SLOTS=1`, in
two runs (tables 1-4, then table 5).

**Arms** (each with `RARE` off, `rare = false` at `model.js:290`, except main):

- **main**: `model.js` at `92822879`.
- **none**: nothing else changed.
- **none+dens**: after `sc` (`model.js:277`), each observation with a weight divides it by ρ(k) as in section 3.1:
  d(k) is the mean `photoDiff` of its photos, s(k) is `calSd` of its first photo, and the sum runs over the
  observations with a weight, each counted by its variants factor.
- **none−floor−lift**: the floor at 0 (`model.js:326`) and the lift off (`model.js:324`).
- **one draw**: none+dens, without floor and lift.

**Players** (fish, `calib.ease` 0.5; the harness has no global level, so every aim is 0.85):

- beginner: ability 0.5, bar 0.05, 1 answer;
- #1391's player: 2.2, 0.3, 6 answers;
- expert on a new unit: 3.0, 0.05, 1 answer.

**Pools** (#1391's families): n easy adults, an easy juvenile held back, 20 at ease 3, and 15 at ease 1-2. The big
family has 12 easy photos and 240 under ease 4.

**Draws and noise.** Stationary: 600 draws, nothing remembered. Sequence: 15 questions with 3 others between each, 100
runs, as #1494. At 600 draws a share near 30% has a standard error of about 2 points, so differences under 4 points
are noise.

**Expected success** is the model's own: 0.25 + 0.75 σ(ability − (3 − ease) × 0.5). It is the engine's estimate, not
the truth.

### Table 1. The beginner, stationary (columns: easy adults)

| | 0 | 1 | 2 | 3 | 6 | 12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Under ease 4: main | 100% | 55% | 38% | 26% | 19% | 9% |
| none | 100% | 71% | 57% | 44% | 34% | 24% |
| none+dens | 100% | 68% | 54% | 37% | 31% | 22% |
| none−floor−lift | 100% | 52% | 45% | 41% | 31% | 22% |
| **one draw** | 100% | 31% | 30% | 28% | 23% | 17% |
| Ease 1-2: main | 1% | 3% | 3% | 4% | 3% | 2% |
| none | 6% | 16% | 15% | 15% | 10% | 7% |
| none−floor−lift | 5% | 2% | 2% | 2% | 2% | 1% |
| **one draw** | 5% | 2% | 2% | 1% | 1% | 1% |
| Expected success: main | 0.72 | 0.78 | 0.79 | 0.80 | 0.80 | 0.80 |
| none | 0.71 | 0.74 | 0.75 | 0.76 | 0.77 | 0.78 |
| **one draw** | 0.71 | 0.82 | 0.81 | 0.81 | 0.81 | 0.80 |
| Most drawn: main | 7% | 45% | 42% | 38% | 30% | 23% |
| **one draw** | 7% | 69% | 62% | 56% | 43% | 29% |
| Effective observations: main | 19.7 | 4.2 | 4.4 | 4.7 | 6.7 | 10.1 |
| **one draw** | 21.2 | 2.1 | 2.5 | 3.1 | 4.7 | 9.0 |

### Table 2. The player and the expert, stationary, under ease 4 (columns: easy adults)

| | 0 | 1 | 2 | 3 | 6 | 12 | Big family |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Player: main | 100% | 91% | 83% | 75% | 52% | 9% | 9% |
| Player: none, and none−floor−lift | 100% | 96% | 91% | 87% | 78% | 66% | 91% |
| **Player: one draw** | 100% | 91% | 86% | 83% | 74% | 62% | 85% |
| Expert: main | 100% | 93% | 86% | 78% | 56% | 9% | 9% |
| **Expert: one draw** | 100% | 94% | 89% | 86% | 78% | 69% | 87% |

For the player and the expert the floor and the lift change nothing: "none" and "none−floor−lift" give identical
rows. Their model expected success is 0.91-0.98 in every arm: the pools hold few photos as hard as their targets.

### Table 3. A session: 15 questions on the unit (columns: easy adults)

| | 0 | 1 | 2 | 3 | 6 | 12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Beginner, distinct observations: main | 13.0 | 12.0 | 11.6 | 11.0 | 10.5 | 11.7 |
| **one draw** | 13.4 | 11.6 | 11.4 | 11.4 | 11.7 | 12.5 |
| Beginner, under ease 4: main | 100% | 80% | 69% | 57% | 33% | 10% |
| **one draw** | 100% | 77% | 68% | 60% | 43% | 27% |
| Beginner, worst repeats of one observation: main | 3 | 5 | 4 | 4 | 4 | 4 |
| **one draw** | 3 | 5 | 5 | 5 | 4 | 4 |
| Player, distinct observations: main | 13.2 | 13.3 | 13.4 | 13.4 | 13.6 | 11.8 |
| **one draw** | 13.9 | 13.8 | 13.8 | 13.8 | 13.9 | 14.3 |

### Table 4. A climbing player along the bar: under ease 4, stationary

The climbing player is #1494's hypothesis: ability 0.5 at bar 0, +3.4 per bar point up to 2.2, and 1 + 20 × bar
answers.

| Bar | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.49 | 0.5 | 0.6 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 easy adults: main | 26% | 42% | 55% | 65% | 72% | 77% | **89%** | 88% |
| **3 easy adults: one draw** | 28% | 45% | 60% | 72% | 79% | 86% | 86% | 86% |
| Big family: main | 9% | 9% | 9% | 9% | 9% | 9% | **92%** | 93% |
| **Big family: one draw** | 22% | 38% | 56% | 72% | 80% | 87% | 87% | 88% |
| Big family, effective observations: main | 11.2 | 12.9 | 13.9 | 14.4 | 14.1 | 13.4 | **155.7** | 164.7 |
| **one draw** | 12.4 | 20.4 | 44.8 | 77.0 | 115.2 | 146.2 | 146.7 | 151.3 |

### Table 5. What raises a beginner's session share (a second, smaller run)

The same sequence (15 questions, 100 runs, the beginner), one draw with parts of the variety switched off. "No memory"
sets both the never-seen bonus (`model.js:240`) and the memory factor (`model.js:241`) to 1. "No window" keeps every
observation of the window (`model.js:317`). Each cell is under ease 4 / distinct observations in 15 / most shows of one
observation in the worst run.

| Easy adults | 1 | 3 | 6 | 12 |
| --- | ---: | ---: | ---: | ---: |
| main | 80% / 12.0 / 5 | 57% / 11.0 / 4 | 33% / 10.5 / 4 | 10% / 11.7 / 4 |
| one draw | 77% / 11.6 / 5 | 60% / 11.4 / 5 | 43% / 11.7 / 4 | 27% / 12.5 / 4 |
| one draw, no window | 76% / 11.5 / 6 | 59% / 11.2 / 5 | 43% / 11.6 / 4 | 26% / 12.4 / 4 |
| one draw, no memory | 70% / 9.7 / 5 | 47% / 9.1 / 5 | 33% / 9.8 / 5 | 22% / 10.8 / 5 |
| one draw, neither | 60% / 8.6 / 9 | 44% / 8.6 / 8 | 31% / 9.3 / 7 | 21% / 10.5 / 6 |

In this harness the unit comes every fourth question, so the window covers only the last two or three questions on it,
which `s.ro` already holds back: the window changes nothing here. The memory and the never-seen bonus add 5 to 13 points
under ease 4 and about 2 distinct observations. The rest (21% with 12 easy adults) is the targeting's own width.

**Reading.**

- The step at Open Water is gone: the share rises with the player, the same way before and after 0.5.
- The floor and the lift make nearly all of a beginner's ease 1-2 share in "none".
- ρ removes most of the count effect for a beginner on a big family (37% → 22%) and on thin families (52% → 31% with
  one easy adult).
- Against main, a beginner gets more ease 3 on units rich in easy photos, from the targeting's width and from the
  memory. The concentration in a stationary draw on a thin family is higher, and in a session it is close to main's.

What this run cannot say: whether a beginner learns better on ease 3 than on the same easy photo again; whether ease
predicts real difficulty well enough (REE-85 measured −0.19 logit a point within a family, against the 0.5 the prior
assumes); the corals; and the sea slugs. The level-2 check below is for those, except how people learn, which is for
the real log (rule L11).

## 7. The simulation that decides the mechanics (rule L11, level 2)

Declared before any run. The level is **2**: the draw changes what every player sees, in every subject.

### 7.1 Tools first (level 0, its own PR)

- **The rated world logs, per question:**
  - the learner's true success q, as 1/k + (1 − 1/k) σ(gap), with the true logit `gap` of `tools/ratedworld.js:558-560`
    and k the plausible choices (typed: σ(gap));
  - the aim a then (`aimP`).
- **`tools/learncmp.js` gets two window measures:**
  - `zone`: the mean of |q − a| over the window;
  - `tooHard`: the share of questions with q < 0.5, more likely wrong than right.
- **A weak-ease world:** `--easenoise X` sets `RATED.EASE.NOISE` (0.35 today).
  - With a photo spread of 0.46, the regression of a photo's true difficulty on its judged ease has a slope of about
    −0.5 × 0.46² / (0.46² + X²): −0.32 a point at 0.35.
  - X = 0.6 gives about −0.19, REE-85's within-family figure (approximate, before rounding and clamping).
  - Without it, "never too hard" would only be shown in a world where ease is a better guide than it really is.

### 7.2 The mechanics, on the harness first (exploratory, as section 6, committed as a study script)

Arms, each against main:

- **one draw**;
- one draw without ρ;
- one draw keeping the floor;
- one draw with `calib.ref` at 1 (the ease-keyed reference bonus off, question 5);
- one draw whose targeting reads a photo with the player's memory of it, the memory factor gone (question 2, option b).

Measures as in section 6, plus `calib.ease` 0.3 (#1519) and the sea slugs' pools. They choose the arm the level-2
check runs. They decide nothing on their own.

### 7.3 The level-2 check: main against the chosen arm

- **Worlds:**
  - the rated world for the fish, 10 seeds per profile, 3,000 answers, normal photos and the heavy-tailed variant;
  - the corals, the same, because removing the floor and the lift touches them;
  - the app world for the fish (5 profiles × 5 seeds × 300 questions), since the change alters what players see.
- **The primary:** `zone` over answers 1-1,000, in the rated world for the fish with normal photos, pooled over the
  five profiles (beginner, casual diver, lecture RA, strong RA, expert), **down**. It is tested with the stratified
  sign-flip on the (profile, seed) pairs, then per profile under Holm.
  - It is phase-free: it reads how far each question's true success sits from the aim, at every level.
  - It counts too hard and too easy alike, and it weighs a question too hard more, because success falls faster on
    that side of an 85% aim.
  - Its limit: the rated world's beginner starts every unit at a know of 0.02, so its true success sits near the guess
    rate whatever the photo until it has learned a little. The beginner's share of the primary then comes from its
    later answers, and the other profiles carry the start.
- **A positive control first:** main against "none" (`RARE` removed, nothing in its place), a known harm for a
  beginner. `zone` and `tooHard` must see it, or they cannot judge the change. Three seeds per profile, reported as
  exploratory.
- **The sensitivity check:** the same pair in the weak-ease world (`--easenoise 0.6`), reported beside the primary.
  It is a second check, declared now, with its own cap.
- **The guardrails** (LEARNING.md's table, the one-sided 90% bound of the paired difference):
  - `know`, `over`, `score`, `firstOW`, `unitsOW`, `plateau`, `met` and `famAdv` at their margins;
  - three new ones, proposed under question 3 (margins are LEARNING.md's, set once there, each with its why):
    - `tooHard` over answers 1-300, per profile, margin **+0.02**: two questions in 100 a player more likely gets
      wrong than right, the scale of `know`'s margin;
    - `near` (repeats in a few questions), margin **+0.03**: three questions in 100 showing a recent observation
      again, a little over one a session;
    - answers per photo shown (`perPhoto`), as exposure, margin **+5%**: a twentieth more answers on the photos
      already shown;
  - in the population run: `rateErr` and `rateCorr`, the photo ratings against the truth. Removing the floor must not
    leave hard photos unrated; `rareOn`'s comment records that capping them held their ratings back.
- **The costs declared:**
  - `hard` (the share under ease 4 before Open Water) rises for the strong RA and the expert. That is aim 2, the
    intended effect. It is reported, not judged, since its margin's basis goes.
  - `perPhoto` may rise for a beginner on thin families. The bound accepted is its margin.
- **Looks:** two (10 seeds, then 20 if a result lands near a margin). Each reads the one-sided bound at 95% and the
  primary at 0.025. After that, "the measure cannot tell".
- **The cap:**
  - Each arm runs with `--budget 20`, so a paired check stays within rule L11's cap.
  - LEARNING.md's measured rated fish job is 56 seconds per 3,000 answers on a loaded 4-core machine. Fifty jobs per
    arm fit.
  - The heavy-tailed fish photos, the corals, the weak-ease pair, the app world and the positive control are five
    more checks, each within its own cap, one at a time on the machine slot (rule W24).

### 7.4 The real log (rule L12)

A replay cannot judge a draw: a different draw asks other questions. After a merge, per player (players are the
statistical unit):

- the gap between the logged expectation `e` and the aim;
- right − expected by ease band;
- near repeats per family, as in [2026-11-21-photo-diversity.md](2026-11-21-photo-diversity.md);
- the share under ease 4 by bar band, now as a description, not a rule.

## 8. Rules version and the sheet

- **No rules version (rule D5).** The draw chooses which photo a question shows. It does not change what an answer
  weighs, the ability step, the bar or the photo memory. #1376 and #1391 changed the same draw without one.
- **No `Code.gs` change, no changes file, no sheet version (rules D3, D4).** The replay (`Code.gs` `replay_`,
  `core.js` `replayProgress`) replays the logged answers and never draws. In `tools/sync/Code.gs`, `photoSet` appears
  only in comments on list order (`Code.gs:5684`, `:8566`, `:9591`), checked by search.

## 9. Build plan (after Pierre's answers)

1. **Tools** (level 0): section 7.1; LEARNING.md's guardrail table per question 3.
2. **The mechanics study** (section 7.2), committed as a study script, and its note.
3. **The engine** (`model.js`, tests, docs; level 2, section 7.3).
   - Code: ρ in `photoSet`. Remove `RARE`, `rareHard`, `rareCap`, `rareOn`, `keep`, `whole`'s rare clause, the lift,
     the floor, `drawFloor` and `calib.pool`.
   - Tests: rewrite `tests/rareease*.test.js` on the same harness. They check:
     - no step along the bar;
     - the share of a beginner's draws far from the target falls as easy photos are added;
     - an expert's draw on a new unit is not held to easy photos;
     - ρ is neutral on a unit whose photos share one estimate.
   - Also update `tests/nophototwice.test.js`, `tests/familyfloor.test.js`, `tests/phasepath.test.js` and
     `tests/fish.smoke.js`.
   - Docs:
     - LEARNING.md "What a question shows" and "The fish draw in big pools";
     - "Rarely under ease 4 before Open Water" replaced by a short "One draw at every level";
     - a decision record, and "Changed by:" on `docs/decisions/2026-11-21-rare-few-floor.md` and
       `docs/decisions/2026-11-21-rare-few-by-observation.md`.
4. **After merge:** section 7.4.

## 10. Questions for Pierre (asked by the integrator, under Rule 0)

1. **One draw at every level.** Today `RARE` is the only part of the photo draw that changes with the level. The rest
   (aim each photo at the success the engine wants for this player, then spread by what the player has already seen)
   already runs at every level. The proposal:
   - remove `RARE` and its Open Water switch;
   - remove the floor and the variety lift, which send photos whatever their difficulty;
   - draw a difficulty first, then a photo.

   Expected, from the small exploratory run of section 6:
   - no change at Open Water: the share of hard photos rises with the player, the same way before and after it;
   - real challenges for an expert from a unit's first questions (today 9% under ease 4 until Open Water);
   - for a beginner, about as many very hard photos (ease 1-2) as today, 1-2% against 2-4%;
   - for a beginner, more photos at ease 3 on families rich in easy photos: over a 15-question session, 27% under ease
     4 against 10% with 12 easy adults, 43% against 33% with 6; about the same on thin families. The model expects a
     beginner to get about 72% of ease-3 photos right.

   Options: (a) yes, subject to the simulation of section 7; (b) the same but keeping the floor, for exposure; (c)
   keep today's rule until the content is richer. **Recommendation: (a).** The floor is kept as an arm of the study
   (section 7.2) and comes back only if the photo ratings need it.
2. **Once a beginner has seen the easy photos of a unit, which comes next: one of them again, or a new harder one?**
   Today the targeting reads every photo as new, and the photo memory lowers the weight of a photo already shown (with
   a bonus for one never seen), so the new harder one wins. Before Open Water the cap hid that. With the cap gone, it
   is most of the beginner's extra ease 3 in a session (table 5: 43% against 33% with 6 easy adults). Options:
   - (a) keep today's split: the targeting reads a photo as new, the memory spreads the photos. A beginner sees more
     new photos, more of them at ease 3.
   - (b) the targeting reads a photo with the player's memory of it, which is literally its expected success for this
     player, and the memory factor goes. A seen easy photo is then easier still: close to a beginner's low target, so
     it comes back; far from an expert's, so it does not. A beginner sees more repeats of easy photos (your aim 3
     accepts a repeat for a beginner), and no constant is added.

   **Recommendation: (a) for this change**, with (b) as an arm of the mechanics study (section 7.2). It comes back to
   you if it holds the primary and the repeats guardrail.
3. **The guardrail on hard photos.** `hard` (the share under ease 4 before Open Water, margin half of `RARE.SHARE`)
   loses its basis. Options:
   - (a) replace it by `tooHard`, the share of questions a player more likely gets wrong than right, at every level,
     margin +0.02, and add `near` (+0.03) and answers per photo shown (+5%) as guardrails (section 7.3 gives each
     margin's why);
   - (b) keep `hard` as a description only, and no new guardrail.

   **Recommendation: (a)**, with `hard` still reported.
4. **The other rules keyed on a unit's level.** Juveniles and phases from Open Water to Advanced (late juveniles at
   Advanced, a step), the scientific genera and the species at a family's Advanced, and scientific names shown alone
   from Open Water. They decide which content comes, not how hard the photo is, and each was decided by you. Should
   they get the same review later? Options: (a) not now, a separate inventory issue; (b) in this change. **Recommendation:
   (a)**, so the draw is measured on its own.
5. **The reference bonus, the one ease threshold left in the draw.** A fish photo judged 4 or 5 with the reference look,
   never seen, weighs 3 times more (`calib.ref`, `refLevel`), for every player. It puts the card's kind of photo first
   for a beginner, and it also pulls easy photos into an expert's draw. Options:
   - (a) keep it for now, and check it as an arm of the mechanics study (section 7.2);
   - (b) remove it with `RARE`, so nothing in the draw keys on an ease level;
   - (c) redefine it after your 13:50 answer on reference photos (a 5 for photos that tick every box of an ID book's
     reference pose, per subject), then decide.

   **Recommendation: (a)**, then (c) when the reference poses are defined. It is a separate rule from `RARE` (the card
   order), and removing it on its own would move what a beginner sees first.

The constants of section 3.3 stay as they are: the integrator's call, under rule L11 (nothing recalibrated before the
simulation).

## References

- Bjork, E. L., Bjork, R. A. (2023). Introducing desirable difficulties into practice and instruction: obstacles and
  opportunities. In Overson, C. E., Hakala, C. M., Kordonowy, L. L., Benassi, V. A. (eds.), *In their own words: what
  scholars and teachers want you to know about why and how to apply the science of learning in your academic setting*.
  Society for the Teaching of Psychology (APA Division 2). Read in the copy at
  <https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-introducing-desirable-difficulties-into-practice-and-instruction-bjork-and-bjork.pdf>.
- Papoušek, J., Pelánek, R., Stanislav, V. (2014). Adaptive practice of facts in domains with varied prior knowledge.
  *EDM 2014*. <https://www.fi.muni.cz/~xpelanek/publications/EDM14-adaptive-facts.pdf> (section 5, read in full).
- Papoušek, J., Stanislav, V., Pelánek, R. (2016). Evaluation of the impact of question difficulty on engagement and
  learning. FI MU Report Series FIMU-RS-2016-02 (the extended version of the ITS 2016 paper).
  <https://www.fi.muni.cz/reports/files/2016/FIMU-RS-2016-02.pdf> (abstract and conditions, read).
- Pelánek, R. (2016). Applications of the Elo rating system in adaptive educational systems. *Computers & Education*
  98. <https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf>
- Wilson, R. C., Shenhav, A., Straccia, M., Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning.
  *Nature Communications* 10, 4646. <https://doi.org/10.1038/s41467-019-12552-4> (abstract, read through Europe PMC).
