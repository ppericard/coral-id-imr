# The draw before Open Water: a continuous weight by ease instead of the RARE bar (REE-245)

**Status: design only (docs).** Nothing is built: `model.js` and `core.js` are unchanged. Written on 2026-11-23 (Manila
evening) on `origin/main` at `9c97c5af`, after #1391. The simulation reuses the harness of `tests/rareease.js` (`model.js`
`photoSet` in a vm, the game stubbed). The script is `tools/studies/ree245/sim.js`. It patches the text of `model.js` in
memory for each arm and writes nothing to the repository. Both runs took a machine slot (rule W24) and ran one at a time.

**What this simulation can decide** (rule L11, reworded 2026-11-23): the mechanics of the rule (cliffs, switches, how the
shares move with the pool and the bar, extremes) and rough starting values, labelled as hypotheses. It does not decide
whether harder photos earlier teach better or worse: real players and the answer log decide that.

**The request.** Pierre, 2026-11-23 16:18 Manila: «je préfère beaucoup plus les solutions simples et continues que des
choses avec des catégories ou des bascules, des interrupteurs». #1391 (the floor of 12 with shared places) merged the
same evening as a stop-gap (Pierre, 17:22: «ok»). REE-245 asks for a weight that rises smoothly with a photo's ease,
variety from the photo memory, an effect that fades with the player's level, and no bar, no floor, no cap and no switch.

## 1. What the draw does today

Before Open Water, `model.js` `photoSet` applies four thresholds to the fish families and the sea slug genera (`rareOn`:
units of the subject's own rank). Corals have no judged ease and are never touched.

| Threshold | Where | What it does |
| --- | --- | --- |
| The ease bar | `RARE.E` 4 | A photo counts as hard under ease 4, easy at 4 or more. |
| The floor | `RARE.FEW` 12, `rareHard` | A unit with fewer than 12 easy observations rotates its 12 easiest. Those at the last ease reached share the places left (#1391). |
| The cap | `RARE.SHARE` 0.1, `rareCap` | Hard photos make at most 10% of the draw, whatever their number. |
| The switch | `genScore(n) < LV_AT[0]` | All of this stops when the unit's bar reaches Open Water (0.5). |

Two exceptions in `photoSet` exist only for this rule. A calibration question keeps the seen easy observations
(`keep`). The session window never leaves only observations the cap holds back (`whole`).

Other parts of the draw already favour easy photos, and they are all continuous:

- **The targeting.** It uses each photo's ease prior, 0.5 logit a point (`calib.ease`; about 0.3 after REE-240).
- **The start's lean.** The target sits 1.5 logits lower on a new unit and fades as 5 / (5 + answers) (`calib.early`).
- **The reference bonus.** A reference-level photo never seen weighs 3 times more (`calib.ref`).
- **The photo memory.** A photo already shown weighs e^offset of its memory bucket (LEARNING.md "Photo memory").

**The switch, measured.** A climbing player is a hypothesis for this reading only: ability 0.5 at bar 0, rising to 2.2
at bar 0.5. On main, at bar 0.49 a family with 12 easy photos and 240 harder ones draws 9% under ease 4 and rotates
about 14 observations. At bar 0.50 it draws 93% under ease 4 and rotates 182 (table 6).

## 2. The rule proposed

Before mastery, each photo with a judged ease e (1 to 5) has its weight multiplied by

> **f(e, bar) = exp(−λ · (5 − e)), with λ = K · max(0, 1 − bar / S)**

where bar is the unit's bar (`genScore(n)`, the domain score the player sees).

- **K, the strength at the start.** At bar 0, each ease point below 5 multiplies the weight by e^−K.
- **S, the bar where the effect ends.** The factor fades linearly from K at bar 0 to 1 (no effect) at bar S.
- **Starting values (recommended): K = 1, S = 0.5.** S = 0.5 is Open Water, where the rule ends today. This is not a
  switch: λ reaches 0 smoothly. These values are a hypothesis. Real answers decide later.

| Factor at bar 0 | Ease 5 | Ease 4 | Ease 3 | Ease 2 | Ease 1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| K = 0.5 | 1 | 0.61 | 0.37 | 0.22 | 0.14 |
| **K = 1** | 1 | 0.37 | 0.14 | 0.05 | 0.018 |
| K = 1.5 | 1 | 0.22 | 0.05 | 0.011 | 0.002 |
| K = 2 | 1 | 0.14 | 0.018 | 0.002 | 0.0003 |

At bar 0.25 with S = 0.5, λ is half of K. At bar 0.5 it is 0.

**Where it applies.** It applies last, where `rareCap` applies today: after the variety lift and the floor, so neither
lifts a hard photo back. It weighs the observation by the mean factor of its photos, weighted as the draw weighs them,
and it weighs the photo within the observation. Only units of the subject's own rank, as today (`rareOn`: a fish
genus's player already knows its family). Photos with no judged ease (every coral photo) get a factor of 1.

**What goes.** `RARE`, `rareHard`, `rareCap`, the calibration question's `keep` and the window's `rare` clause.

**What stays.** Variety comes from the parts already there: the photo memory (e^offset by bucket), the last two
observations at × 0.15 (`s.ro`), the session window (`SEENQ`), the variety lift and the floor. None of them changes.

**Why a factor in ease, not a shift of the target.** The start's lean already moves the target. A second lean would
act through the targeting's Gaussian, whose effect depends on the player's ability. A factor in ease acts the same way
at any ability, and the bar alone fades it.

## 3. Simulation

**Setup.** Each arm patches `model.js` in memory. The arms:

- **main:** `model.js` as merged with #1391.
- **none:** the RARE step taken out, nothing in its place.
- **Continuous:** K 0.5, 1, 1.5 and 2 with S 0.5, and K 1 with S 0.8.

Families are #1391's (tests/rareease-floor.test.js): n easy adults (ease 5, then 4), an easy juvenile its ramp holds
back, 20 observations at ease 3 and 15 at ease 1-2. The big family is `tests/rareease.js` `pool`: 12 easy photos and
240 harder ones.

**Players** (fish, `calib.ease` 0.5 as on main):

- **Player:** #1391's, ability 2.2 and bar 0.3.
- **Beginner:** ability 0.5, bar 0.05, 1 answer.
- **Climbing player:** a hypothesis for reading the fade only. Ability 0.5 at bar 0, +3.4 per bar point up to 2.2.
  Answers: 1 + 20 × bar.

**Measures:**

- **Stationary:** 1,000 draws of one state, nothing remembered between draws, as in #1391's table. Effective number of
  observations = 1 / the sum of the squared shares.
- **Sequence:** 15 questions on the unit, with 3 other questions between each, 200 runs. The memory (`s.ps`, right
  with chance 0.85), `s.ro` and the window are updated as an answer does.

The draws are seeded. Differences under about 1 effective observation or 2 points of share are noise.

**Commands:** `node tools/studies/ree245/sim.js --draws 1000 --runs 200` and `node tools/studies/ree245/sim.js --only
climb --draws 1000`.

### Table 1. The player of #1391 (ability 2.2, bar 0.3), stationary

Effective observations:

| Easy adults | 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| main (#1391) | 21.2 | 21.6 | 21.4 | 21.4 | 21.7 | 20.1 | 18.8 | 16.4 | 14.4 | 18.9 |
| none | 29.5 | 30.2 | 31.7 | 32.1 | 33.1 | 34.8 | 37.2 | 39.0 | 39.6 | 44.3 |
| K 0.5, S 0.5 | 28.0 | 28.7 | 29.0 | 29.6 | 29.9 | 32.6 | 34.0 | 35.1 | 37.4 | 40.8 |
| **K 1, S 0.5** | 26.2 | 25.3 | 25.8 | 26.3 | 27.2 | 28.7 | 30.1 | 32.1 | 34.0 | 37.2 |
| K 1.5, S 0.5 | 24.9 | 21.0 | 21.4 | 22.1 | 23.0 | 24.7 | 26.5 | 28.1 | 30.0 | 33.9 |
| K 2, S 0.5 | 23.6 | 16.6 | 17.3 | 18.9 | 19.4 | 20.4 | 21.7 | 23.7 | 25.8 | 29.3 |
| K 1, S 0.8 | 24.5 | 20.7 | 20.9 | 21.6 | 22.8 | 24.6 | 25.9 | 27.7 | 29.3 | 32.9 |

The most drawn observation, and the share under ease 4:

| Easy adults | 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| main: most drawn | 7% | 8% | 9% | 9% | 9% | 9% | 9% | 8% | 9% | 8% |
| **K 1: most drawn** | 6% | 9% | 9% | 8% | 8% | 7% | 6% | 6% | 5% | 5% |
| K 2: most drawn | 6% | 18% | 17% | 15% | 14% | 13% | 12% | 11% | 10% | 9% |
| main: under ease 4 | 100% | 92% | 83% | 76% | 69% | 53% | 39% | 24% | 9% | 9% |
| none: under ease 4 | 100% | 97% | 91% | 87% | 85% | 79% | 75% | 71% | 68% | 61% |
| **K 1: under ease 4** | 100% | 91% | 85% | 80% | 76% | 71% | 64% | 59% | 55% | 48% |
| K 2: under ease 4 | 100% | 82% | 76% | 71% | 67% | 58% | 51% | 47% | 43% | 36% |
| main: ease 1-2 | 4% | 4% | 4% | 3% | 3% | 3% | 3% | 3% | 2% | 2% |
| **K 1: ease 1-2** | 17% | 16% | 14% | 14% | 13% | 11% | 10% | 10% | 9% | 8% |

### Table 2. The beginner (ability 0.5, bar 0.05), stationary

| Easy adults | 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| main: under ease 4 | 100% | 57% | 41% | 27% | 24% | 19% | 15% | 11% | 9% | 9% |
| none: under ease 4 | 100% | 72% | 58% | 46% | 43% | 37% | 32% | 29% | 25% | 22% |
| K 0.5: under ease 4 | 100% | 48% | 37% | 25% | 23% | 21% | 18% | 16% | 14% | 11% |
| **K 1: under ease 4** | 100% | 26% | 19% | 12% | 11% | 10% | 9% | 8% | 8% | 6% |
| K 1.5: under ease 4 | 100% | 11% | 9% | 6% | 5% | 5% | 4% | 4% | 4% | 3% |
| main: effective | 20.0 | 4.4 | 4.6 | 5.0 | 5.6 | 7.0 | 8.1 | 9.3 | 10.6 | 14.1 |
| none: effective | 21.8 | 8.2 | 8.4 | 8.5 | 9.1 | 10.4 | 11.9 | 13.3 | 14.9 | 18.0 |
| **K 1: effective** | 20.2 | 1.8 | 2.1 | 2.4 | 2.8 | 3.3 | 4.0 | 4.8 | 5.7 | 7.5 |
| K 1.5: effective | 20.0 | 1.3 | 1.5 | 1.7 | 1.9 | 2.3 | 2.7 | 3.2 | 3.6 | 4.6 |
| main: most drawn | 7% | 43% | 40% | 37% | 33% | 29% | 26% | 24% | 22% | 19% |
| **K 1: most drawn** | 7% | 74% | 67% | 61% | 57% | 52% | 47% | 42% | 38% | 33% |

Big family (12 easy, 240 harder), under ease 4, beginner: main 9%, none 43%, K 0.5 22%, **K 1 10%**, K 1.5 4%,
K 2 2%. For the player of table 1: main 9%, none 91%, **K 1 83%**.

### Table 3. With the photo memory: 15 questions in a session

Distinct observations in 15 questions:

| Easy adults | 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Player, main | 13.2 | 13.3 | 13.4 | 13.4 | 13.4 | 13.4 | 13.2 | 12.7 | 11.8 | 12.9 |
| **Player, K 1** | 13.6 | 13.7 | 13.6 | 13.7 | 13.7 | 13.8 | 13.9 | 14.0 | 14.1 | 14.1 |
| Player, K 2 | 13.4 | 13.2 | 13.3 | 13.4 | 13.4 | 13.6 | 13.7 | 13.8 | 13.8 | 13.8 |
| Beginner, main | 13.0 | 12.1 | 11.6 | 11.0 | 10.7 | 10.5 | 10.8 | 11.2 | 11.6 | 12.7 |
| Beginner, none | 13.2 | 12.8 | 12.5 | 12.3 | 12.2 | 12.3 | 12.7 | 12.9 | 13.1 | 13.5 |
| **Beginner, K 1** | 13.1 | 11.0 | 10.4 | 10.0 | 9.8 | 10.1 | 10.6 | 11.3 | 11.7 | 12.3 |
| Beginner, K 1.5 | 13.0 | 10.5 | 9.5 | 8.9 | 8.8 | 9.1 | 9.8 | 10.5 | 11.1 | 11.8 |
| Beginner, K 2 | 13.0 | 10.3 | 9.1 | 8.2 | 7.9 | 8.2 | 9.0 | 9.9 | 10.5 | 11.5 |

Under ease 4 over the 15:

| Easy adults | 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Beginner, main | 100% | 81% | 68% | 57% | 47% | 32% | 23% | 15% | 10% | 10% |
| **Beginner, K 1** | 100% | 72% | 60% | 49% | 41% | 29% | 23% | 18% | 15% | 10% |
| Beginner, K 1.5 | 100% | 68% | 54% | 42% | 33% | 22% | 16% | 12% | 10% | 7% |
| Player, main | 100% | 94% | 87% | 81% | 74% | 61% | 47% | 30% | 10% | 10% |
| **Player, K 1** | 100% | 94% | 89% | 84% | 80% | 73% | 68% | 62% | 58% | 50% |

In the worst of 200 runs for the player, one observation was shown at most 3 times in 15 with K 1. It was shown 4 times
on main with 10 easy adults, with K 1 and S 0.8 with 1, and with K 2 with 1 to 6.

### Table 4. Along the bar, ability fixed at 2.2 (stationary), share under ease 4

| Bar | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.45 | 0.49 | 0.5 | 0.6 | 0.8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Big family, main | 9% | 9% | 9% | 9% | 9% | 9% | 9% | **91%** | 91% | 91% |
| **Big family, K 1** | 64% | 73% | 78% | 83% | 87% | 89% | 91% | 91% | 91% | 91% |
| Big family, K 2 | 21% | 37% | 56% | 73% | 83% | 87% | 91% | 91% | 91% | 91% |
| 3 easy adults, main | 76% | 76% | 76% | 76% | 76% | 76% | 76% | **87%** | 87% | 85% |
| **3 easy adults, K 1** | 64% | 71% | 76% | 80% | 85% | 86% | 87% | 87% | 87% | 85% |

At ability 2.2 the targeting itself aims at ease 3. So once the fade is weak, the hard share is high whatever the rule:
"none" reads 85-91% at every bar.

### Table 5. A climbing player (hypothesis): the share under ease 4

| Bar (ability) | 0 (0.5) | 0.1 (0.8) | 0.2 (1.2) | 0.3 (1.5) | 0.4 (1.9) | 0.45 (2.0) | 0.49 (2.2) | 0.5 (2.2) | 0.6 (2.2) | 0.8 (2.2) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 easy adults, main | 27% | 44% | 57% | 67% | 73% | 76% | 78% | 90% | 89% | 88% |
| 3 easy adults, none | 46% | 62% | 73% | 79% | 86% | 87% | 89% | 90% | 89% | 88% |
| **3 easy adults, K 1** | 10% | 28% | 50% | 71% | 82% | 87% | 89% | 90% | 89% | 88% |
| 3 easy adults, K 1.5 | 4% | 16% | 39% | 63% | 79% | 86% | 88% | 90% | 89% | 88% |
| 3 easy adults, K 1, S 0.8 | 10% | 25% | 46% | 62% | 75% | 79% | 83% | 84% | 86% | 88% |
| 12 easy adults, main | 9% | 9% | 9% | 9% | 9% | 9% | 9% | **72%** | 72% | 73% |
| **12 easy adults, K 1** | 6% | 14% | 26% | 42% | 57% | 64% | 71% | 72% | 72% | 73% |
| 12 easy adults, K 1.5 | 3% | 9% | 20% | 36% | 53% | 63% | 71% | 72% | 72% | 73% |
| Big family, main | 9% | 9% | 9% | 9% | 9% | 9% | 9% | **93%** | 94% | 95% |
| Big family, none | 43% | 61% | 74% | 83% | 88% | 91% | 93% | 93% | 94% | 95% |
| **Big family, K 1** | 9% | 24% | 49% | 72% | 85% | 90% | 93% | 93% | 94% | 95% |
| Big family, K 1.5 | 3% | 12% | 35% | 64% | 83% | 88% | 93% | 93% | 94% | 95% |
| Big family, K 1, S 0.8 | 9% | 22% | 43% | 62% | 78% | 83% | 87% | 87% | 90% | 95% |

### Table 6. The same climbing player: effective observations

| Bar | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.45 | 0.49 | 0.5 | 0.6 | 0.8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 easy adults, main | 5.0 | 7.8 | 11.7 | 16.6 | 20.3 | 21.5 | 22.4 | **33.9** | 34.8 | 36.2 |
| **3 easy adults, K 1** | 2.2 | 3.5 | 8.4 | 18.3 | 28.1 | 31.4 | 33.4 | 33.9 | 34.8 | 36.2 |
| 12 easy adults, main | 10.6 | 12.5 | 13.6 | 14.1 | 14.4 | 14.5 | 14.5 | **42.0** | 42.7 | 43.9 |
| **12 easy adults, K 1** | 5.1 | 9.4 | 15.7 | 25.3 | 35.1 | 39.2 | 41.8 | 42.0 | 42.7 | 43.9 |
| Big family, main | 11.0 | 12.7 | 13.9 | 14.4 | 14.3 | 14.0 | 13.7 | **181.6** | 187.5 | 187.0 |
| **Big family, K 1** | 8.5 | 14.1 | 32.6 | 82.0 | 140.7 | 167.7 | 182.0 | 181.6 | 187.5 | 187.0 |

### Table 7. REE-240's ease weight (`calib.ease` 0.3), player of table 1

| Easy adults | 0 | 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12 | 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| main: effective | 21.7 | 21.2 | 21.1 | 21.0 | 21.0 | 19.7 | 18.3 | 16.2 | 14.4 | 19.0 |
| **K 1: effective** | 28.5 | 25.7 | 26.6 | 27.0 | 27.5 | 29.8 | 31.3 | 32.8 | 34.6 | 38.6 |
| main: under ease 4 | 100% | 90% | 82% | 74% | 68% | 52% | 39% | 23% | 9% | 9% |
| **K 1: under ease 4** | 100% | 89% | 85% | 80% | 76% | 71% | 65% | 60% | 56% | 48% |

Every cell is within 2 points and 2.5 observations of the 0.5 run: the rule does not depend on that prior.

### Reading

- **No switch.** On main the share under ease 4 jumps at bar 0.5: the big family goes from 9% to 93% and from 14 to 182
  observations (tables 5-6). Every continuous arm moves smoothly and meets main beyond Open Water. With S = 0.5 they
  meet at 0.5; with S = 0.8 at 0.8.
- **No cliff in the number of easy photos.**
  - From one easy adult upward, every continuous arm is monotone: the effective number of observations only rises as
    easy adults are added (tables 1-2). The step from 0 to 1 dips for the player, as the first easy photo takes weight:
    by 0.9 with K 1 (26.2 → 25.3), by 7 with K 2.
  - Main is not monotone for the player: 21.7 at 4 easy adults falls to 14.4 at 12, then rises to 18.9 at 16. This is
    #1391's "narrows gradually".
  - For the beginner, the first easy photo takes most of the draw in every arm, main and "none" included (main 20.0 →
    4.4 effective). The targeting and the lean cause it, not the rule. The memory then spreads it. With 1 to 4 easy
    adults, 15 questions show 9.8-11.0 distinct observations with K 1, against 10.7-12.1 on main (table 3).
- **The cost: "rarely" becomes "less often, fading".** Today hard photos make at most 10% of the draw before Open Water,
  whatever the family. With the continuous rule the share depends on the pool and on the bar:
  - **At the start (beginner) it is lower than today** for the thin families: 12% against 27% with 3 easy adults,
    26% against 57% with 1. It is the same for a big family: 10% against 9%.
  - **Between bar 0.1 and Open Water it is higher than today**, rising with the bar. For the big family on the
    climbing player: 24% at 0.1, 49% at 0.2, 72% at 0.3, where main stays at 9% until the switch.
  - **Ease 1-2** for the player at bar 0.3: 8-17% with K 1, against 2-4% on main.
- **K and S.** A larger K keeps the easy phase longer: the big family crosses half its draws under ease 4 at bar about
  0.2 with K 1, and about 0.25 with K 1.5. It also concentrates a beginner on fewer photos: 8.8 distinct in 15 with 4
  easy adults at K 1.5, 7.9 at K 2, against 10.7 on main. S 0.8 slows the late part of the fade and carries a rule meant
  for before Open Water past it.
- **Why K = 1, S = 0.5 to start.** At the start it matches today's cap on a big family (10% against 9%) and is below it
  for thin families. It keeps a beginner's distinct photos within about 1 of main's. It ends where today's rule ends.
  The simulation cannot say whether the fade is too fast; the real log can (section 6).

## 4. Rules version and the sheet

- **No rules version (rule D5).** The draw chooses which photo a question shows. It does not change what an answer
  weighs, the moving average, the ability step or the photo memory. #1376 and #1391 changed the same draw without one.
- **The replay does not read the draw.** The sheet's replay (`Code.gs` `replay_`) and `core.js` `replayProgress`
  replay the logged answers with their scoring records. In `Code.gs`, `photoSet` appears only in comments about list
  order (checked by search). No `Code.gs` change, no changes file (rule D3) and no sheet version (rule D4).
- **What changes in the tools:**
  - The guardrail "share under ease 4 before Open Water" (`hard`, `tools/learncmp.js`, LEARNING.md's table) has a
    margin of +0.05, set as half of `RARE.SHARE`. That basis goes.
  - `tools/learnsim.js`, `tools/ratedworld.js` and `tools/learncmp.js` mention `RARE` in comments.
  - `tests/fish.smoke.js` checks "rarely" against the cap.

## 5. What players see

- **Fish families and sea slug genera, before Open Water.** The easiest photos come first. Harder ones come more and
  more as the unit's bar rises. Nothing changes suddenly at Open Water.
- **Thin families** (few easy photos): fewer hard photos at the very start than today, and more between a bar of about
  0.1 and Open Water.
- **Big families:** about the same at the very start, then harder photos gradually from a bar of about 0.1, instead
  of all at once at Open Water.
- **Corals and units below the subject's rank:** nothing changes.

## 6. Risks

- **A beginner concentrated on the easiest photos.** With K 1, a beginner on a family with 1-3 easy adults draws mostly
  those (table 2). The memory, `s.ro` and the window spread a session (table 3). Main does the same at a lower level. Check after merge on the real log: near repeats per family, as in
  docs/reviews/2026-11-21-photo-diversity.md.
- **Harder photos before Open Water, for players between bar 0.1 and 0.5.** This is the intended effect of the fade.
  The level 2 check will see it as `hard` rising, so it is declared as the expected cost (section 7). Whether those
  photos teach well or badly is for the real answers.
- **The factor trusts the judged ease within a unit.** REE-85's study found ease ranks photos within a family, though
  weakly (−0.19 logit a point), and predicts nothing between families. The factor only compares photos of one unit, so
  the between-family finding does not touch it. Families whose usual look is buried or camouflaged are uncapped since
  REE-242. Their photos are re-judged in REE-246.
- **Ease counted twice.** The targeting reads the ease prior and the factor reads the ease. Both are continuous and
  their roles differ: the factor fades with the bar, the prior stays. With the prior at 0.3 (REE-240), the results move
  by at most 2 points (table 7).
- **The sea slugs** run on the same engine (rule S1) but are not simulated here: the harness plays fish. The build
  measures them in the real app, as #1391 did.

## 7. Build plan (PR-sized steps, after Pierre reads this note)

1. **The guardrail first** (tools and docs, no app change). Redefine `hard`'s margin in `tools/learncmp.js` and
   LEARNING.md's table without `RARE.SHARE`, for example as a margin of its own on the share under ease 4 while the unit
   is under Open Water. Level 0.
2. **The rule** (`model.js`, tests, docs).
   - Code: the factor, with its two constants in one object (for example `EASE_LEAN = {K: 1, S: 0.5}`). Remove `RARE`,
     `rareHard`, `rareCap` and the two exceptions.
   - Tests: rewrite `tests/rareease*.test.js` with a harness that stays shared. They check:
     - no step at the bar's Open Water;
     - the effective number never falls when an easy adult is added, from one upward;
     - the corals untouched;
     - the `rareOn` scope;
     - the variants still held back.
   - Also update `nophototwice`, `phasepath`, `familyfloor` and `fish.smoke.js`.
   - Docs: LEARNING.md "Rarely under ease 4 before Open Water" rewritten and renamed, and a decision record. #1391's
     record gets its "Changed by:" line.
   - Check: level 2 (rule L11: the draw), the rated world for fish, 10 seeds. Declare the primary before running (for
     example answers per photo shown, down) and `hard` up as the expected cost. Add the real-app pools as #1391 did
     (`tools/fish_draw_sim.js`). Rule L12: a replay cannot judge a draw, so the real pools are measured instead.
3. **After merge:** in the real log, near repeats per family and the share under ease 4 before Open Water per player.
   K and S are adjusted from there.

`EASY_NEED` (3) in the refill is its own count since #1391 and stays. REE-198 (a refill of easy photos for small
families) loses its tie to `RARE.FEW`.

## 8. Questions for Pierre (asked by the integrator, under Rule 0)

1. **"Rarely" without a guaranteed 10%.** Your rule of 2026-11-06 ("No wall: before Open Water a photo under ease 4 may
   come, but rarely") and Q252's 0.1 set a ceiling. The continuous weight has none: hard photos start rarer than today
   on thin families and come gradually more often as the bar rises, about half the draws by a bar of 0.2-0.3.
   **Recommendation: yes.** It is the continuity you asked for on 2026-11-23. The fade's speed is one constant (K), easy
   to correct after the real log.
2. **Where the effect ends.** At Open Water (S = 0.5), where today's rule ends, or later (S = 0.8, Advanced), which keeps
   some easy lean after Open Water. **Recommendation: Open Water.** The rule stays a "before Open Water" rule, and
   everything after Open Water is unchanged.

K = 1 as a starting value is the integrator's call (rule L11: a rough starting value from a simulation, labelled as a
hypothesis), easy to correct.
