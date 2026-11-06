# Photo exposure: repeats, photos never shown, exploration (2026-11-06, no app change)

For Pierre, who asked on 2026-11-05 in the evening: players go round a genus's photos fast. He wants to raise the
per-genus photo caps a lot (he is photographing the frequent genera), to know how many photos are never shown, to have
an admin stat per player (photos seen against photos they could have seen), and to be sure the game tries new photos
often enough. This is the read-only measurement he asked for first. The changes come after his answers.

**Data.** The sheet's Answers tab, read-only through the connector at 15:10 Manila. 2,335 answers from 12 players (one
of them a device that never signed in), 2026-11-01 17:59 to 2026-11-06 15:04: 2,308 coral answers and 27 fish answers.
The players are P1-P12 here, in order of their first answer. The local copy was deleted after use, and the scripts are
outside the repository. **The game photo pool** is built with the app's own pipeline (`core.js` `applyCuration` +
`applySlots`, as `app.js` `build()`), at the end of each day from 11-01 to 11-05 (git history) and today. Today there
are 1,342 game photos of 1,011 colonies in 45 genera (slate, Millepora, bonus genera). A *colony* is one observation,
and one question shows one colony. **Statistics:** players are the unit (rule L11 tier 3). Comparisons are exact sign
tests over players. Everything else is descriptive. **Sources:** **[full text]** read this session, **(tool)** read
through a fetch-and-summarise tool, **[abstract]** abstract or bibliographic record only, **[secondary]** through a
citing text.

## Summary

1. **Repeats.** 18.7% of coral questions show a photo the player has already been shown. In colonies it is 20.9%. For
   the 8 players with 50+ answers the median is 17.5% (range 4-30%). Repeats rise with the questions asked on a genus:
   5% in its first 5 questions, 22% in questions 6-10, 38% in 11-20 and 44% in 21-40.
2. **Repeats start long before a genus runs out.** Every repeat came while the genus still had photos that player had
   never seen. When a colony came back, the player had seen a median of 38% of the genus's colonies (quartiles 23-59%).
   In the 32 genera with 40+ questions, the top 5 colonies took a median of 50% of the questions, where an even draw
   would give 21%.
3. **The main cause is the multi-view questions.** A beginner's question shows a colony at several zooms. Only 53 of
   the 1,011 colonies have every view, and 165 have at least two. A colony comes back in 35% of multi-view questions
   against 16% of single-view ones. That holds for all 8 players with 20+ of each (sign test p = 0.008).
4. **The pool size does not drive repeats yet.** Within each player, genera with fewer colonies than the median (23)
   show no more repeats in their first 20 questions than genera with more: 5 players one way, 4 the other. The Colony
   cap of 20 colonies (`admin.js` `CELL_MAX`) binds in 17 genera. No Close-up or Corallites cell is near it. Raising
   the cap adds single views of new colonies. That helps the strong players (single views) and the never-shown count
   grows. On its own it will not cut a beginner's repeats.
5. **Photos never shown:** 238 of 1,342 (18%) have never been shown to anyone, and 190 of the 1,011 colonies. All of
   them were in the game by 11-04. They are where there is little traffic: a genus's share never shown follows its
   questions per photo (Spearman −0.82 over 45 genera). The worst are Merulina (22 of 43), Dipsastraea 16/47,
   Diploastrea 15/43, Montipora 14/46, Goniopora 14/46, Leptoseris 13/25, Cyphastrea 11/26 and Isopora 11/21. By
   source, never shown: iNaturalist 23%, Pierre's own 3%, IMR 3%.
6. **Exploration.** 36% of photo slots went to photos nobody had answered yet. 39% went to photos with 1-2 answers and
   25% to rated photos (3+ answers), 10.5% of all to photos rated easy (90%+ right). Day by day, unrated slots fell
   from 52% to 22% while the unrated share of the genera drawn fell from 56% to 17%. Per player, the unrated share is
   above an even draw for 4 players and below it for 5. **The game explores about as much as a random draw, not more.**
   The worry that the game keeps serving the easy photos is not supported yet. Photos shown again are not easier than
   the photos new to the player (3 players one way, 3 the other; mean right rate against the genus −0.01 vs +0.01).
7. **The ratings cannot converge photo by photo at this traffic.** The median shown photo has 2 answers, the most-shown
   13, and none has 25. At the game's 80% target with guessing, one answer carries about 0.08 units of information on a
   photo (logit⁻²). Rating one photo to ±0.5 logit takes about 50 answers, about 65,000 for the pool. At the current
   rate (627 photo slots a day) that is 3-4 months, if every slot went where it is needed. A photo's rating is its
   genus offset (hierarchical Elo, sheet v31) plus a residual that is mostly prior. Raising the caps lowers the
   answers per photo further. What exploration *can* deliver soon is 3-5 first answers per photo, enough to flag the
   photos far harder than their genus.
8. **The admin stat**, computed here (§5): photos seen ÷ the game photos of the genera met is 20-55% for the 5 players
   with 200+ answers. A second number, *spread*, is chronological: of the questions asked while the unit still had
   colonies the player had never seen, the share that showed one of them. It is 68-95% for those players and 66-96% for
   the others. Since no player has exhausted a genus yet, spread is 100% minus the colony repeat rate.
9. **Fish:** 27 answers from one player, with one repeat. Nothing can be concluded. These answers came while
   `easyFirst` was in force: below 50% on a unit, only its very easy photos were shown (402 of 1,740 fish game photos,
   a median of 7 per entry, under 3 for 12 of the 47 entries). On `main` since today, the gate is gone. The target leans
   1.5 logits easier on a unit with few answers, and reference-level photos never seen weigh × 3 (`SUBJECTS` `calib`).
   The fish draw is therefore no longer limited to a small set. It needs re-measuring once there are fish answers.

## 1. Repeats, per player and per genus

Per player (coral questions; repeat = at least one photo shown before; colony = the same observation shown before):

| Player | Questions | Genera | Photo repeat % | Colony repeat % | App logged "no new photo" % |
|---|---|---|---|---|---|
| P6 | 537 | 32 | 23.3 | 26.3 | 19.7 |
| P7 | 401 | 37 | 13.0 | 14.5 | 8.5 |
| P4 | 378 | 44 | 22.0 | 25.1 | 17.5 |
| P8 | 375 | 33 | 29.6 | 32.0 | 26.4 |
| P11 | 249 | 45 | 4.0 | 5.2 | 3.6 |
| P5 | 112 | 17 | 29.5 | 33.9 | 26.8 |
| P9 | 85 | 32 | 10.6 | 10.6 | 9.4 |
| P3 | 67 | 35 | 7.5 | 7.5 | 4.5 |
| P1, P2, P10, P12 | 49, 23, 20, 12 | | 4.1, 0, 10, 0 | | |

The app's own column (Answers "New photos" = 0) agrees with the log replay (all photos known vs at least one known).
Repeats per genus range from 0% (Isopora, Heliopora, Pleuractis: bonus genera, few questions) to 35-37% (Astrea with 9
colonies, Duncanopsammia, Fungia). Among the genera asked most: Turbinaria (116 questions, 9 players) 28%; Acropora (85)
8%; Pocillopora (85) 13%; Alveopora (84, 17 colonies) 16%; Halomitra (68) 25%; Danafungia (53, 13 colonies) 32%.
P11, who met 45 genera in 249 questions, almost never repeats. Repeats grow with depth on a
genus, not with the number of answers in total.

## 2. Why repeats come early: the draw, not the pool

`model.js` `photoSet` scores each colony and draws one. The parts that matter here:

- **Several zooms for beginners.** Below an ability of 0.54 on a genus every question shows every view (`FORMAT`). The
  colony score is multiplied by cov² (cov = share of the views the colony has): 1 with every view, 0.44 with two,
  0.11 with one. With a median of **1 colony per genus with every view** (none in 16 genera), a beginner's questions
  turn round a handful of colonies. The top 5 colonies hold every view in only 48 of 225 cases, so 2-view colonies and
  the single views of the strong players fill the rest.
- **Difficulty targeting** (Gaussian, sd 0.7, wider for photos with few answers via `CAL.U`). With per-photo ratings
  this noisy (§4), the targeting mostly sorts photos by noise. A photo 2 sd away from the target weighs 0.14 of one on
  target, which outweighs the memory penalty of a seen photo.
- **Photo memory** (`PMEM`): a photo already shown weighs about × 0.64, × 0.33 or × 0.18 by memory bucket. A photo never
  shown weighs × (1 + 1.5 × recent success), and × 1.3 for IMR and Pierre's photos (corals). That favours a new photo by
  about 7-9 times at equal distance from the target, but per photo: a colony is scored by its best photo in each view.
- **`VARIETY` = 3**: the 3 best colonies are lifted to half the top score and every other one gets at least 5%
  (`FLOOR`). It guarantees 3 colonies in rotation. In practice it also concentrates draws on those 3.
- **The success target** (`PICKD.AIM`: 85% for beginners down to 75% for experts) sets where on the difficulty scale
  the targeting aims. The calibration questions (`CAL.RATE` 20%) come only on genera the player holds. Ease priors
  (judged ease, `p.e`) exist for fish only, since coral photos have none, so for corals the prior is the genus offset.

The pool size matters through the cap only for single views, which is what strong players get. Pierre's new photos
will widen the beginners' pool only if they are **whole observations** (colony + close-up + corallites of one colony).

## 3. Photos never shown, and the caps

| | Genera | Game photos | Never shown | Questions per photo |
|---|---|---|---|---|
| Colony cell at the cap (≥ 20 colonies) | 17 | 639 | 131 (21%) | 1.44 |
| Below the cap | 28 | 703 | 107 (15%) | 1.97 |

By view: Colony 156 of 756 never shown, Close-up 48 of 349, Corallites 34 of 237. Almost every one of Pierre's photos and
the IMR lecture photos has been shown (227 of 235, 112 of 116): the new-photo bonus × 1.3 and the featured-first order
reach them. iNaturalist photos wait longest (765 of 991 shown). Never shown is a traffic matter (questions per photo).
A genus asked 30-45 times with 45 photos cannot have shown them all. More photos per genus mean more never shown, which
is harmless for learning as long as each player's spread stays high (§5), and slower for calibration (§4).

## 4. How the photo ratings converge

Answers per game photo today: 0 for 238, 1-2 for 650, 3-9 for 445, 10-24 for 9, none at 25+ (max 13). With the logged
expectation e and the guess rate of each question format, the information one answer gives about a photo is
((e − c)² / (1 − c)²) × ((1 − e) / e), shared among the photos shown. At e = 0.8 with 4 choices that is about 0.13. The
mean per answer per photo is 0.082. Every photo shown so far still has a standard error of 1 logit or more on its own
answers. The hierarchical Elo makes this workable: the genus offset carries the level, the residual (sd about 0.3-0.6,
LEARNING.md) stays near its prior, and the photo memory offsets are pooled over every photo.

Operational adaptive tests calibrate a new item on 300 to 3,000 examinees and found the smaller samples hard to
calibrate with some methods (Ban et al. 2000 [full text]). Optimal designs pick *which* examinees see a pretest item to
gain information faster, with priors taken from the operational items (He & Chen 2020 [abstract]). With 12 players we
are two orders of magnitude below that. **Realistic goal:** every photo gets its first 3-5 answers, so a photo far
harder than its genus (unclear, mislabelled, wrong view) shows up for Pierre. Full per-photo ratings are out of reach,
so the prior (genus offset, view, source, quality) carries the rest.

## 5. The admin stat per player (as computed here)

Two numbers, corals (fish the same way once there are answers):

- **Seen**: distinct game photos the player has been shown ÷ game photos of the units they have met (first question
  here; in the app, `unlocked()` from the synced intro map). Colonies give almost the same figure.
- **Spread** (chronological): of the questions on a unit asked while it still had colonies the player had never seen,
  the share that showed one of them. 100% = no colony repeated while an unseen one remained. A count of the colonies
  seen against the questions would hide repeats (A, A, B scores 100% with two colonies).

| Player | Questions | Units met | Seen photos | Seen % | Spread % |
|---|---|---|---|---|---|
| P6 | 537 | 32 | 505 / 923 | 55 | 74 |
| P7 | 401 | 37 | 468 / 1,155 | 41 | 86 |
| P4 | 378 | 44 | 394 / 1,318 | 30 | 76 |
| P8 | 375 | 33 | 330 / 1,040 | 32 | 68 |
| P11 | 249 | 45 | 266 / 1,342 | 20 | 95 |
| P5 | 112 | 17 | 92 / 511 | 18 | 66 |
| P9, P3, P1 | 85, 67, 49 | 32, 35, 12 | | 10, 10, 14 | 89, 93, 96 |

Seen % alone mostly grows with the questions answered (a heavy player looks good). Spread says whether the draw used
the room it had, and that is the one to act on. Computing it in the sheet (rule L13) for the admin's player list
(`users_`) needs only the Answers tab and `data.json`.

## 6. The literature on exploration and exposure

- **Exposure control in CAT** balances how often each item is used. It limits overexposure, wasted items and
  incomplete coverage (Zhuang et al., survey, §7.1 [full text]).
  - **Sympson-Hetter (1985)** passes each selected item through a probability filter set per item, which caps its
    exposure. The survey notes that it "may not effectively increase the usage rate of low-exposure questions" (Zhuang
    et al. [full text]; Sympson & Hetter [secondary]). It solves overexposure. Our problem is concentration within a
    player and under-use, which it does not solve.
  - **Randomesque and the progressive method**: pick at random among the best items, or add a random component whose
    weight fades as the test goes on. The progressive method reduced the number of unused items, the restricted
    method lowered maximum exposure, and the two combined keep exposure in check without a serious loss of precision
    (Revuelta & Ponsoda 1998 [abstract]; review by Georgiadou et al. 2007 [abstract], full text unreachable).
  - **a-stratification** splits the bank by discrimination: low-discrimination items early in the test, high ones
    later. That evens out exposure and lowered the average exposure rate against Sympson-Hetter in simulations (Chang &
    Ying 1999 [abstract]). Our analogue: the scarce "strong" items are the multi-view colonies, and beginners use them
    up.
- **Seeding new items (online calibration):** pretest items mixed at random among operational ones, calibrated on
  hundreds to thousands of responses (Ban et al. 2000 [full text]); our `CAL` bonus and questions, scaled down.
- **Exploration/exploitation in tutoring:** ZPDES samples activities with probability (1 − γ) × (normalised
  learning-progress weight) + γ × uniform. The fixed uniform share γ keeps every activity reachable. It beat an expert
  sequence for heterogeneous students (Clement et al. 2015, (tool)). Thompson sampling balances immediate performance
  against information gathering by sampling from the posterior (Russo et al. 2018 [abstract]). Our `calSd` widening is
  close to that.

Lesson for us: a **fixed exploration share drawn evenly among what the player has not seen**, ZPDES's γ or the
randomesque / progressive random part, is the standard, simple tool for under-use. Exposure ceilings (Sympson-Hetter)
are not what we need.

## 7. Proposed changes (constants for Pierre, nothing built)

1. **Colony cap** `CELL_MAX`: 20 → **40** (options 30 / 40 / 60 / no cap). It binds only Colony cells. A bigger pool
   helps the strong players (single views) and lowers the answers per photo. Labelled guess: I did not check whether
   his own uploads go through the cap; P1 says his photos are used in games uncapped.
2. **Exploration share** (rethinking `CAL.RATE`, rule L11: no new variable). Today 20% of questions are calibration
   questions, only on genera the player holds. Proposal: those questions draw the colony **among the colonies this
   player has never seen** (still weighted by the targeting and by `calBonus`, so the least-answered photos come first),
   on any genus met that has had at least about 5 questions. **γ = `CAL.RATE` ∈ {0.2, 0.3, 0.4}**. Recommend 0.3.
3. **Multi-view pool**: the cov² exponent → **cov** (options 2 now, 1, 0.5). 2-view colonies then weigh 0.67 instead of
   0.44 in a beginner's question, which spreads draws over about 4 colonies per genus instead of about 1-2. Pierre
   chose cov² so that beginners see colonies at every zoom, so this is his call. The other lever is his photos taken
   as whole observations.
4. **Colony-level memory**: score a colony already shown with its best-remembered photo whatever the view, so a new
   close-up of a seen colony does not count as new. This is a correction to the existing rule, with no constant.
5. **No Sympson-Hetter ceiling** (the literature: it does not raise under-used items). Keep `VARIETY` 3 as the floor.
6. **Calibration goal**: aim for 3-5 answers per photo, and an admin flag for photos whose residual after 5+ answers is
   beyond ±1.5 logit (threshold to set). Per-photo convergence is not reachable at this traffic.
7. **Admin stat**: Seen % and Spread % per player and subject in the player list, computed in the sheet.

**What to simulate** (rule L11 tier 1, then tier 2 on γ): `tools/learnsim.js`, four profiles × 5 seeds, before and
after on the same seeds. Primary measure, declared: **colony repeat rate over questions 1-300**, pooled, expected to
go down (stratified sign-flip test on the 20 pairs). Guardrails: true knowledge at 300 and 600, right % against the
target, genera met at 100, progress gap. Run it in the three learner worlds (item, field, **exemplar**: the one where
a variety of photos should pay; check first that a repeated photo adds little there). Add a draw-level check on the
real ratings (as LEARNING.md "Photo memory": 1000 draws in the thinnest and thickest genera). **Real log** (rule
L12): a replay cannot judge a draw change (other photos would be asked). After shipping, compare per player the colony
repeat at the same depth on a genus, and the share of slots on unrated photos, before against after (sign test over
players).

## 8. Limits

12 players, 6 days; the pool changed during the week (photos dated by end-of-day snapshots); "met" = first question on
a genus, not its card; colony = observation (an IMR lecture photo without one counts alone); the information numbers
assume one discrimination for every photo. The scripts live outside the repository and can be run again on request.

## Questions for Pierre (the integrator numbers them)

- **E1. Colony cap.** Raise `CELL_MAX` from 20 to 30, 40, 60, or remove it? *Recommendation: 40.* Taking each colony at
  three zooms is worth more than three extra colonies, for the beginners.
- **E2. Exploration share.** Turn the 20% calibration questions into questions that draw a colony the player has never
  seen, on any genus met (about 5+ questions), at γ = 0.2, 0.3 or 0.4? *Recommendation: 0.3, after the learnsim
  check.*
- **E3. Beginners' zooms.** Weigh 2-view colonies more in beginners' questions (cov² → cov), so they rotate over more
  colonies, or keep "every zoom first"? *Recommendation: cov, simulated with E2.*
- **E4. Colony-level memory.** Count a colony as seen whatever view was shown? *Recommendation: yes (a correction, no
  new constant).*
- **E5. Admin stat.** Add Seen % and Spread % per player (corals and fish) to the player list, computed by the sheet?
  Denominator: units unlocked now (`unlocked()`) or units met? *Recommendation: yes, unlocked now, colonies for
  Spread.*
- **E6. Calibration goal.** Accept that per-photo ratings stay mostly prior, aim for 3-5 answers per photo, and flag the
  photos far harder than their genus in the admin? *Recommendation: yes; threshold after a look at the first flags.*
- **E7. Fish.** `easyFirst` is already gone on `main` (the start's lean and the reference-photo weight replaced it).
  Re-run this study on the fish once there are about 500 fish answers? *Recommendation: yes.*

## Sources

- Zhuang, Liu et al., *Survey of Computerized Adaptive Testing: A Machine Learning Perspective*, arXiv 2404.00712 v4, §7.1 [full text].
- Ban, Hanson, Wang, Yi, Harris (2000), *On-line Pretest Item Calibration/Scaling Methods in CAT*, ACT RR 2000-11; J. Educ. Meas. 38 (2001) [full text].
- He & Chen (2020), Optimal online calibration designs for item replenishment in adaptive testing, *Psychometrika* 85 [abstract].
- Chang & Ying (1999), a-Stratified multistage computerized adaptive testing, *Appl. Psychol. Meas.* 23 [abstract].
- Revuelta & Ponsoda (1998), A comparison of item exposure control methods in CAT, *J. Educ. Meas.* 35 [abstract].
- Georgiadou, Triantafillou, Economides (2007), exposure control review 1983-2005, *JTLA* 5(8) [abstract; full text unreachable].
- Sympson & Hetter (1985), Controlling item-exposure rates in CAT [secondary, through Zhuang et al.].
- Clement, Roy, Oudeyer, Lopes (2015), Multi-armed bandits for intelligent tutoring systems, *JEDM* 7(2), arXiv 1310.3174 [full text, (tool)].
- Russo, Van Roy, Kazerouni, Osband, Wen (2018), A tutorial on Thompson sampling, arXiv 1707.02038 [abstract].
