# The comeback after a break, on the real players (study, 2026-11-14)

Read-only study for the ROADMAP row "Recalibrate the comeback after a break with the players' data". It changes
nothing in the app. Pierre, 2026-11-12: worth its own study, starting from the first real case: P11 came back on 11-09
after three days, her comeback ended after 4 right answers, then a look-alike family, the fungiids, pulled her down.

**Questions asked:** is the comeback calibrated well for real players? In particular: its length after a break of N
days, how it chooses units, whether a 4-answer comeback is too short after 3 days, and what happens to look-alike
groups right after it.

## Headline

1. **P11's comeback was not too short on the evidence of her own answers.** She answered its 4 questions right at a
   mean expectation of 0.62. Under the model, 4 out of 4 had a 14% chance, and the comeback ended because of them, as
   its rule says. The evidence that it was long enough is what came next. In the 20 answers after it she scored 13/20
   against an expectation of 0.68: a surprise of −0.03, against her own +0.01 over all her answers. The model expected
   roughly what happened.
2. **The fungiid pull-down came on the pair's first recorded contrast; its cause is unresolved.** On 11-06, Ctenactis
   and Herpolitha were each asked twice and answered right every time, but never offered together. The first question
   that offered both (a 4-choice with Lobactis, Fungia, Ctenactis and Herpolitha, expectation 0.59) came 12 answers
   after the return. She gave Herpolitha, then gave it again on the two "Again: A or B?" questions that followed.
   - The log cannot say whether she never learned to tell the two apart or had forgotten what told them apart: there
     is no contrast trial of the pair before the break to compare with.
   - Neither cause can be ruled out.
3. **Her questions got harder right after the comeback.** Full 4-choice questions (every choice plausible, traps
   included) went from 2 of her 20 answers before the break to 9 of the 20 after the comeback. Her global level, resting
   on 54 answers, rose +0.26 on the 4 comeback answers (0.40 to 0.66) and fell to 0.10 by the 14th answer after them.
   That is the same size as her swings on her first day (up to 0.67 within 15 answers). LEARNING.md "What each number
   measures" applies: at 50-70 answers the Elo is not settled.
4. **After 2-9 days, real comebacks fell within the simulation's ranges for a player in the same state**: 1-19
   questions. **Around one day (0.95-1.06 days) they ran longer than simulated.** The 8 eligible returns ran 0, 1, 4,
   6, 7, 10, 17 and 40 questions (median 6.5), against a simulated median of 3 for every profile. The length follows
   the number of units at stake and how hard the questions are more than the length of the break.
5. **Rusty comeback questions were answered better than expected, but the comeback's stopping rule explains much of
   that.** On the 50 comeback answers with a logged recall under 0.97, players were right 42 times at a mean
   expectation of 0.67: a surprise of +0.17, against +0.06 on their ordinary answers.
   - The comeback stops early after successes, so its own answers lean positive by construction, even for a player
     the model rates exactly.
   - A rough replay of each real comeback, answers drawn at the logged expectation, puts that lean at about +0.03 to
     +0.16 a comeback (mean +0.09).
   - What is left is small and uncertain. No test is offered, and nothing here shows FSRS's forgetting to be wrong.
6. **Look-alike misses do not rise after a break in the pooled data.** After the 11 coral returns of a day or more,
   there were 18 look-alike misses in 213 answers (0.085 per answer), against 0.093 over all 3,308 coral answers. P11
   is the outlier: 6 in 20, on 3 distinct pairs.
7. **One comeback ran a whole visit.** P5, 11-06, after 1.03 days: 40 comeback questions, 27 right at a mean
   expectation of 0.75. Its sum of rust grew by about 3 and never reached 0. The comeback's sum has no allowance,
   unlike the opening hold's. A player slightly below expectation for any reason stays in the comeback, and no genus
   opens.

## Data and method

- **Source:** the sync sheet's Answers tab, read through the Google Sheets connector on 2026-11-14 (5,668 answers, up
  to 2026-11-13 16:40 Manila, every subject), and P11's row of the Progress data tab (her opening record). Read-only:
  nothing was written to the sheet. The export holding names stays outside the repository (rule D2).
- **Players:** the labels P1-P14 follow LEARNING.md's 2026-11-09 table ("The log, the only reference for progress":
  the answer counts per account match). A1 and A2 are two devices that never signed in. The mapping to names is kept
  outside the repository, with the integrator.
- **Time:** the Time column, Manila, to the minute. Checked against the answer ids (`Date.now()` in base 36): Time is
  the client's time truncated to the minute, and sorting by Time then row gives the same order as the ids.
- **A return:** an answer of a subject whose previous answer in that subject is a day or more earlier. The app works
  per subject: its last answer (`P['~level'].at`) and its comeback state are the subject's own. A visit is the run of
  answers with no gap of 30 minutes (`SESSION.GAP`). Four returns at 0.95-0.99 days are listed beside them.
- **Comeback questions:** the answers logged with `|c` in Mode (`quiz.js`, "a comeback question after a break"). Their
  scoring record holds the recall `r` the app planned for the unit shown. The comeback's length is the number of `|c`
  answers in the return's visit. One comeback went on into the next visit: P5's of 11-06, 40 in the visit and 2 more
  five hours later. Her "20 after" window starts with those 2.
- **Accuracy and surprise:** right % and right − expected (column Expected), during the comeback, in the 20 answers
  before the break and in the 20 after the comeback's last question. Rule L12: the player is the unit, never the answer.
- **Look-alike misses:** a wrong answer whose given unit is a declared look-alike of the unit shown, either way round
  (`data.json` `look`; for fish, `core.js` `fishReplayGen`). A miss within the same family but not declared is counted
  apart.
- **The Elo path:** the global level replayed answer by answer with `core.js` `replayProgress` (the app's scorer: each
  answer with a scoring record is scored with what the game logged). The replay has no pooled photo memory, mix-ups or
  genus offsets beyond those logged, so it approximates the device's level. No answer before about 11-06 has a scoring
  record.
- **The app's rust is not in the log.** It lives on the device (`reefid-comeback`, one per device and subject). What the
  log does give is how much rust the comeback's answers paid back under its sum (`model.js` `comebackStep`: each answer
  takes away right − p + the rust the question repairs, with p the logged expectation). Since the comeback runs while
  rust is above 0, the app's starting rust lies between what was paid back before the last comeback question and what
  was paid back including it. My own estimate from the replayed abilities and the FSRS formulas did not match these
  bounds (P11: 2.04 against 1.16-1.62; P3 after 9 days: 2.65 against 6.3-6.7). It is not used below.
- **Simulation:** `tools/learnsim.js` on today's `main`, 5 seeds, the four profiles, `--breaks 1d,3d,1w --after 20`
  in three settings: 300 questions first, 50 questions first, and 50 questions with Open all at question 20 (the
  closest to P11). About 30 seconds each.
- **The stopping rule's lean:** a small replay outside the repository ("Accuracy and expectation" below). Each real
  comeback's questions are drawn right with their logged expectation, under `comebackStep`'s rule, 20,000 times.

## Every return after a day or more

Surprise = right − expected over the window. "Look" = look-alike misses (distinct pairs). Level = the replayed global
level before the break → at the comeback's end → 20 answers later. "Units" = units answered right before the break
(those a comeback can ask).

| Player | Subject | Return | Gap (d) | Answers before | Units | Comeback | Right in it (mean e) | 20 after: right (mean e) | Surprise after | Look after | Level |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P2 | coral | 11-03 16:17 | 1.01 | 3 | 2 | none | – | 17/20 (0.73) | +0.12 | 0 | −0.64 → −0.64 → 1.37 |
| P2 | coral | 11-06 15:55 | 2.37 | 49 | 12 | 2 | 2/2 (0.89) | 17/20 (0.80) | +0.05 | 2 (2) | 1.59 → 1.63 → 1.71 |
| P2 | fish | 11-09 07:24 | 2.64 | 14 | 3 | 2 | 2/2 (0.73) | 7/9 (0.73) | +0.05 | 2 | −0.31 → −0.25 → −0.54 |
| P3 | coral | 11-12 20:14 | 9.09 | 378 | 44 | 19 | 17/19 (0.59) | 16/20 (0.71) | +0.09 | 4 (3) | 0.86 → 0.92 → 0.92 |
| P3 | fish | 11-12 19:43 | 6.18 | 204 | 34 | 5 | 5/5 (0.79) | 17/20 (0.87) | −0.02 | 3 | 2.43 → 2.46 → 2.36 |
| P5 | coral | 11-06 15:16 | 1.03 | 537 | 29 | 40, the whole visit | 27/40 (0.75) | 12/20 (0.70) | −0.10 | 0 (5 same family) | 1.60 → 1.40 → 1.29 |
| P6 | coral | 11-05 19:53 | 1.06 | 287 | 34 | 10 | 8/10 (0.74) | 17/20 (0.70) | +0.15 | 2 (1) | 0.81 → 0.82 → 0.89 |
| P6 | coral | 11-09 11:40 | 3.64 | 401 | 36 | 10 | 8/10 (0.70) | 10/13 (0.71) | +0.06 | 1 (1) | 0.81 → 0.81 → 0.83 |
| P6 | fish | 11-08 19:40 | 1.05 | 388 | 48 | 17 | 15/17 (0.87) | 19/20 (0.84) | +0.11 | 0 | 2.85 → 2.80 → 2.80 |
| P6 | fish | 11-13 16:39 | 4.06 | 720 | 65 | 5 | 5/5 (0.83) | 8/8 (0.87) | +0.13 | 0 | 2.90 → 2.91 → 2.92 |
| P7 | coral | 11-07 09:26 | 3.10 | 375 | 32 | 8 | 7/8 (0.73) | 16/20 (0.69) | +0.11 | 0 | 0.90 → 0.88 → 0.82 |
| P9 | coral | 11-05 07:13 | 1.40 | 1 | 0 | none (under 2 units) | – | 18/20 (0.81) | +0.09 | 2 (1) | −0.91 → −0.91 → 1.73 |
| P9 | coral | 11-08 21:59 | 3.61 | 20 | 5 | 1 | 1/1 (0.88) | 19/20 (0.88) | +0.07 | 1 (1) | 1.69 → 1.73 → 2.22 |
| **P11** | coral | 11-09 16:09 | 3.03 | 50 | 24 | **4** | 4/4 (0.62) | 13/20 (0.68) | −0.03 | **6 (3)** | 0.40 → 0.66 → 0.39 |
| P14 | coral | 11-06 16:41 | 4.95 | 6 | 4 | 2 | 2/2 (0.70) | 20/20 (0.78) | +0.22 | 0 | 0.09 → 0.20 → 1.58 |

15 returns from 8 players; 13 with a comeback. Beside them, at 0.95-0.99 days:

- P3, coral, 11-03 17:53: 7 comeback questions, 6 right (e 0.71).
- P5, coral, 11-04 20:25: 6 questions, 5 right (e 0.66).
- P12, coral, 11-07 14:32: 4 questions, 4 right (e 0.92).
- P9, fish, 11-08 21:14: 1 question, 1 right (e 0.67).

P2's return of 11-03 logged no comeback although the replay counts 2 units right. The device's own record, which the
log does not show, decides that.

## Length against the break

Comebacks per gap, every player and subject, counting only visits with at least 2 units answered right:

| Gap | Visits | Comeback lengths | Median |
|---|---|---|---|
| 30 min - 8 h | 16 | 0, 1 ×12, 2, 5, 7 | 1 |
| 8 - 24 h | 17 | 0 ×3, 1 ×6, 2 ×3, 4 ×2, 6, 7, 14 | 1 |
| 1 - 2 d | 4 | 0, 10, 17, 40 (the whole visit) | 13.5 |
| 2 - 4 d | 6 | 1, 2, 2, 4, 8, 10 | 3 |
| 4 - 10 d | 4 | 2, 5, 5, 19 | 5 |

The simulation on today's `main` (comeback questions, median over 5 seeds):

| Break | First session | beginner | lecture RA | strong RA | expert |
|---|---|---|---|---|---|
| 1 d | 300 questions | 3 | 3 | 3 | 3 |
| 3 d | 300 questions | 11 | 7 | 6 | 5 |
| 1 w | 300 questions | 39 | 17 | 22 | 8 |
| 3 d | 50 questions | 2 | 2 | 2 | 2 |
| 3 d | 50, Open all at 20 | 15 | 15 | 4 | 3 |

- **The break alone does not set the length.** P5 had 40 after 1 day; P9 had 1 after 3.6 days. What matters is how
  many units are at stake and their stability: P9 had 5 units right on 20 answers, P3 had 44 units after 9 days. How
  hard the questions are matters too. A right answer at expectation p pays back 1 − p of rust, plus a little for the
  unit it reviews. P11's questions at 0.62 paid back about 0.4 each. P6's right fish answers at 0.87 paid back about 0.15,
  so her 17 questions after one day reflect easy questions on 48 units, not a big loss.
- **Against the simulation, real comebacks fall in its ranges** once the first session matches:
  - players with 375-401 answers before the break: P6 10 after 3.6 days, P7 8 after 3.1 days; simulated 5-11 after
    3 days with 300 questions first;
  - players with 6-50 answers: P2 2, P9 1, P14 2; simulated 2;
  - P11, 50 answers with every genus opened: 4; simulated with Open all, 3-15.
- **Around one day they ran longer.** The 8 eligible returns at 0.95-1.06 days ran 0, 1, 4, 6, 7, 10, 17 and 40
  questions (median 6.5); the simulation's median after 1 day is 3 for every profile with 300 questions first.
- Against LEARNING.md's table of 2026-11-03 (10 seeds, an older engine), today's simulated comebacks are shorter after
  3 days: beginner 11 against 13.5, lecture RA 7 against 12.5, strong RA 6 against 10, expert 5 against 9. After a week
  they are mixed: beginner 39 against 14, lecture RA 17 against 19.5, strong RA 22 against 15.5, expert 8 against 9.5.
  The engine has changed since (rules versions 4-10), and the runs differ (5 seeds here against 10 there, other
  seeds), so the differences are indicative only.

## How it chooses units

As intended (`model.js` `comebackOf`): units answered right; the surest half by recall until one is answered right in
the comeback, then the most rusted half. Its questions use the player's usual choices (`trapsFor`), no card, duel or
exam, and photos aimed at ability + ln R.

- **The order is mostly as designed.** In 7 comebacks of 2 or more questions where every question logged its recall
  and some rust showed, the questions up to the first right answer had a higher mean recall than the later ones in 6.
  P14 is the exception: 0.88 against 0.89. P11's first comeback question had the highest logged recall of her four
  (Mycedium, 0.94); the later ones were Hydnophora 0.89, Cyphastrea 0.92 and Lithophyllon 0.90.
- **A comeback reviews a minority of the units at stake:**

  | Player, return | Distinct units asked | Units at stake |
  |---|---|---|
  | P11, 3 days | 4 | 24 |
  | P7, 3.1 days | 8 | 32 |
  | P6, 3.6 days | 9 | 36 |
  | P3, 9 days | 18 | 44 |

  P5's 40 questions covered 23 of 29. The rust is one sum over the units, and the comeback ends when the answers have
  paid it back, not when each unit has been seen. After the comeback, a unit not reviewed is asked and scored at full
  recall: only comeback questions carry `r` in their scoring record.
- **Look-alike groups get no special treatment.** A comeback question has the usual traps for the player's level, and
  its units are chosen by recall alone. Which half P11's Ctenactis and Herpolitha fell in cannot be read from the log:
  the app's recall is logged only for the units it asked. A comeback question on either genus could have offered the
  pair, as any question with traps can.

## Accuracy and expectation during and after

| Answers | n | Right | Mean expected | Surprise |
|---|---|---|---|---|
| Every comeback question, corals | 143 | 118 | 0.735 | +0.09 |
| Every comeback question, fish | 56 | 52 | 0.824 | +0.10 |
| Comeback questions with logged recall < 0.97 | 50 | 42 | 0.67 (mean R 0.85) | +0.17 |
| Ordinary answers, every player | 5,464 | | | +0.06 |

Per player and subject, the surprise of the comeback questions minus that player's own surprise on ordinary answers
(n):

| Player | Subject | Recall < 0.97 | Recall ≥ 0.97 |
|---|---|---|---|
| P11 | coral | +0.37 (4) | – |
| P3 | coral | +0.22 (18) | +0.08 (8) |
| P3 | fish | +0.14 (5) | – |
| P2 | fish | +0.27 (2) | – |
| P14 | coral | +0.21 (2) | +0.01 (1) |
| P7 | coral | +0.11 (8) | +0.05 (7) |
| P6 | coral | +0.07 (4) | +0.05 (20) |
| P9 | coral | +0.06 (1) | – |
| P5 | coral | −0.43 (6) | −0.01 (57) |
| P6 | fish | – | −0.03 (38) |

Fresh units (recall ≥ 0.97) sit near each player's usual surprise. Rusty units sit above it for 7 of 8 players.

**These answers are not a fair sample: the comeback's stopping rule biases them upward.** The comeback ends when right
answers have paid its rust back (`model.js` `comebackStep`). A run that starts well stops after a few answers, mostly
right; a run that starts badly goes on until the answers come back to expectation. One run's mean surprise therefore
leans positive even for a player the model rates exactly, so a 50/50 sign test over players does not apply.

How big that lean is, roughly: each real comeback replayed 20,000 times with the same questions in the same order.

- Each answer is drawn right with exactly its logged expectation.
- The run starts from the middle of the rust bounds and stops by the app's rule, or at the visit's length.
- The mean surprise of one run on its rusty answers comes out at +0.03 to +0.16 a comeback (mean +0.09).

Against that, the players' own surprise minus their usual one:

| Player | Subject | Observed | Expected from the stopping rule alone |
|---|---|---|---|
| P11 | coral | +0.37 | +0.11 |
| P3 | coral | +0.22 | +0.03 |
| P3 | fish | +0.14 | +0.09 |
| P2 | fish | +0.27 | +0.13 |
| P14 | coral | +0.21 | +0.16 |
| P7 | coral | +0.11 | +0.08 |
| P6 | coral | +0.07 | +0.05 |
| P9 | coral | +0.06 | +0.10 |
| P5 | coral | −0.43 | +0.06 |

Six of the eight players sit above the stopping rule's lean (P3 counted once) and two below. That is no evidence, and
the replay is rough:

- the run starts from a midpoint of the rust bounds;
- questions beyond the real length repeat the last one;
- the expectation is taken as the truth.

A proper correction runs the stopping rule with a calibrated learner in `tools/learnsim.js`. Until then the honest
reading is: whether FSRS's forgetting fits these players cannot be told from comeback answers alone. A fit of the
stabilities is not possible yet: 50 answers, 23 of them P3's after 9 days, and two players with 1-2 answers each.

**After the comeback** (the 20 answers after its last question), the surprise was positive in 10 of the 13 comebacks.
The exceptions are P5 (−0.10), P11 (−0.03) and P3 fish (−0.02). Against the same player's 20 answers before the break,
the surprise was higher in 8 of 12. Nothing here says the model is too optimistic after a comeback ends.

## Look-alike groups after the comeback

- **Pooled, no rise.** After the 11 coral returns of a day or more: 18 look-alike misses in 213 answers (0.085 per
  answer), against 309 in 3,308 over every coral answer (0.093). About half of all coral misses (52%) are on declared
  look-alikes, and 65% with the same family included.
- **Per player, no consistent difference** between the 20 answers after a return of a day or more and those after
  shorter visits. P3: 0.20 against 0.10 per answer. P6 coral: 0.09 against 0.15. P7: 0 against 0.08. P14: 0 against
  0.15. P5: 0 against 0.08.
- **P11 alone:** 6 look-alike misses in 20, on 3 distinct pairs:
  - Ctenactis → Herpolitha, 3 times: the 4-choice question, then the two "Again: A or B?" questions that follow a mix-up;
  - Leptoria ↔ Platygyra, twice. Platygyra was asked for the first time 6 answers after the return. Its first-meeting
    card is not in the log, so whether she saw it on 11-06 is unknown;
  - Porites → Stylophora, once.

  Raw counts overstate this: the 6 misses are 3 confusions, one of them repeated by design.

## The Elo path

- In 10 of the 13 comebacks the replayed global level moved by 0.06 or less during the comeback. The three others:
  - P11, +0.26 on 4 answers, resting on 54 answers;
  - P14, +0.11 on 2 answers, resting on 8;
  - P5, −0.20 over 40 answers, of which 13 were misses.
- P11's path: 0.40 before the break, 0.66 after the comeback, a low of 0.10 at the 14th answer after it (after the
  three Ctenactis misses and the Platygyra/Leptoria pair), 0.39 at +20, −0.20 at the end of the visit (131 answers in
  all). Her swings before the break reached 0.67 within 15 answers. The players with 150-200 answers swing 0.13-0.93 in
  50 answers. Nothing in her path stands out from an Elo on 50-130 answers (shown in the game only from 200, `ELO_MIN`).

## P11's comeback, answer by answer

Context from her records:

- **Before the break:** she opened every genus at once on the Open all card (Progress data: 39 genera opened together
  on 11-04 13:01, before her first logged answer). She played one day, 11-06: 50 answers, 37 right, 28 genera asked,
  24 of them answered right, each on that day only. FSRS gives each the stability of a single day (`s.dd` = 1).
- **The return:** on 11-09 at 16:09, after 3.03 days, she played an 81-answer visit.
- **The back card:** its sum since Open all had reached its threshold, and it came at her 89th answer, during this
  visit. She answered Keep them all.

The visit's first 24 answers. "Look" marks a miss on a declared look-alike; the level is the replayed global level
after the answer.

| # | Shown | Given | Format | Expected | Recall | Look | Level |
|---|---|---|---|---|---|---|---|
| 1 | Mycedium | Mycedium | comeback, 4 | 0.68 | 0.941 | | 0.51 |
| 2 | Hydnophora | Hydnophora | comeback, 2 plausible | 0.73 | 0.887 | | 0.53 |
| 3 | Cyphastrea | Cyphastrea | comeback, 4 | 0.51 | 0.916 | | 0.59 |
| 4 | Lithophyllon | Lithophyllon | comeback, 4 | 0.57 | 0.902 | | 0.66 |
| 5 | Millepora | Anacropora | 4 | 0.50 | | | 0.54 |
| 6 | Platygyra | Platygyra | 4 | 0.58 | | | 0.59 |
| 7 | Millepora | Millepora | 2 plausible | 0.67 | | | 0.66 |
| 8 | Porites | Stylophora | 4 | 0.80 | | look | 0.51 |
| 9-11 | Tubastraea, Stylophora ×2 | right | | 0.53-0.80 | | | 0.65 |
| 12 | Ctenactis | Herpolitha | 4 (Lobactis, Fungia, Ctenactis, Herpolitha) | 0.59 | | look | 0.56 |
| 13 | Plerogyra | Plerogyra | 4 | 0.83 | | | 0.61 |
| 14 | Ctenactis | Herpolitha | Again: A or B? | 0.74 | | look | 0.49 |
| 15 | Leptoria | Platygyra | 4 | 0.65 | | look | 0.37 |
| 16 | Ctenactis | Herpolitha | Again: A or B? | 0.66 | | look | 0.23 |
| 17 | Astreopora | Astreopora | 2 plausible | 0.74 | | | 0.26 |
| 18 | Platygyra | Leptoria | 2 plausible | 0.76 | | look | 0.10 |
| 19-24 | Platygyra, Herpolitha, Seriatopora, Platygyra, Echinopora, Danafungia | right | | 0.52-0.74 | | | 0.15-0.39 |

- **The comeback did its job by its own rule.** Recall 0.89-0.94 after 3 days on one-day units. Four right answers at
  0.51-0.73 paid back 1.62 of rust, so the app's rust at the return was between 1.16 and 1.62. Under the model, a
  player who had lost that much would have answered all four right 14% of the time.
- **What else changed after the comeback:**
  - Her 20 answers before the break were mostly 2-plausible-choice questions: 2 of 20 were full 4-choice questions.
  - Her 20 after the comeback held 9.
  - The level's +0.26 on the comeback is a plausible part of that step-up, not a proven one. Each genus's ability
    moves with the level (`core.js` `levelMove`), and the format schedule gives more traps as a genus's ability rises
    (`model.js` `trapsFor`: one from 0.18, all three from 0.54).
  - The first question to offer Ctenactis and Herpolitha together was hers at answer 12.
  - The misses that followed were scored at full recall, and the level fell 0.56 over the next 14 answers.

  The fall came on the pair's first recorded contrast and the harder format, on a level not yet settled. Whether the
  pair was never told apart or forgotten since 11-06, the log cannot say.

## What the model intends, and what happened

| The model intends (LEARNING.md "Comeback after a break") | On the real answers |
|---|---|
| A night leaves 1-4 questions; the 10-answer floor covers the rest | 8-24 h: median 1, 0-14 |
| Days to a week: about 9-20 questions, depending on the player | 2-4 d: 1-10; 4-10 d: 2-19. Shorter, with fewer units at stake than the simulation's 300-question players |
| It ends by the answers: better than expected melts it fast | Yes: P11 4/4 at 0.62 ended it in 4; P5 at 68% against 0.75 kept it on for 40 |
| Photos a little easier, by ln R | Comeback questions at mean e 0.67 when rusty; players beat it by +0.17, much of which the stopping rule explains |
| No genus opens during it and the floor | Not checkable: first-meeting cards are not in the log. By the code, P5's 40-question comeback held openings for the whole visit |
| A miss the rust explains costs less | Only inside the comeback. A unit not reviewed is scored at full recall after it |

## Limits: what this cannot conclude

- **Few players:**
  - 15 returns of a day or more from 8 players, mostly one or two each;
  - one return after more than 6 days (P3, 9 days);
  - none after a month.

  Whether comebacks are the right length in general, and how long after a week or a month, cannot be read from this.
  The gap, the answers before the break and the number of units are tangled: the longest breaks belong to players with
  many answers.
- **Rust:** the app's own rust at a return is not logged and cannot be rebuilt reliably from the log. The comeback
  state is per device, and the Device column is filled only from 11-08 evening.
- **P5's 40-question comeback** (11-06): its sum grew by about 3. Five hours later, 2 more comeback questions ended
  it, which the logged answers cannot explain. By the code, the comeback state is kept per device and cleared only by
  a progress reset (here or on another device) or a sign-out. Adopting a new rules version, as several shipped that
  afternoon, does not clear it. The candidates are another device, a sign-out, or cleared browser storage. None can be
  checked: the Device column is empty for her.
- **The simulation with Open all** opened every genus at question 20. P11 opened them before her first answer.
- **Recall:** 50 rusty comeback answers, biased upward by the comeback's stopping rule (above). No test of them is
  valid without a correction. A per-answer fit of the stabilities leans towards less forgetting, but it ignores the
  stopping rule, is dominated by P3 and ignores who answered. Rusty units are
  also, by construction, the least established. If the model underrates the ability on them, the surprise has the same
  sign as recall that is too pessimistic. The fresh-unit control cannot tell the two apart.
- **Cards:** first-meeting cards and the opening are not in the answer log (ROADMAP "Analyses: next views"). Whether
  P11 saw Platygyra's card before the break is unknown.
- **Simulation:** the simulated learner forgets by its own rule (`tools/learnsim.js`, "Forgetting learner"), not by the
  players' rule. Its lengths say what the app does with such a learner, not what is right.

## Questions for Pierre

Lettered; the integrator numbers them.

**(a) P11's comeback: keep 4 questions after 3 days as the model gave them?** Her 20 answers after it matched the
model's expectation (surprise −0.03 against her usual +0.01). The fungiid misses came on the pair's first recorded
contrast. Her 4/4 inside the comeback says less, since the comeback ends on right answers.
*Recommendation:* keep. No change to the comeback's length from this case.

**(b) Should the comeback ask look-alike groups on purpose** (units answered right whose look-alike is also in play)?
*Recommendation:* no, not on this data.

- Pooled over every coral return of a day or more, look-alike misses after the comeback do not rise: 0.085 an answer
  against 0.093 over all answers.
- No player shows a consistent rise against their own shorter visits.
- The one case, P11's, is a pair with no contrast trial before the break, so it cannot show that forgetting the
  contrast is the problem a comeback should fix.
- Measure it before deciding. Take pairs a player was offered together before a break, and compare their misses after
  it with misses on pairs offered together within a day. Do it once enough returns exist.

**(c) Recalibrate FSRS's stabilities now?** Rusty comeback questions were answered better than the recall discount
predicts (+0.17 against +0.06), but the comeback's stopping rule alone accounts for much of that (about +0.09). What
remains is no evidence either way.
*Recommendation:* not yet.

- First, a learnsim run that measures the stopping rule's bias with a learner the model rates exactly (rule L11).
- Then wait for about 20 players with returns of 2 days or more, or about 200 rusty comeback answers.
- Fit one stability multiplier with players as the unit (rule L12), correcting for the stopping rule. The answers in
  the 20 after a comeback are free of that bias and may serve better.

**(d) Give the comeback's sum the opening hold's allowance (`INTRO.SLACK`, 0.1 an answer)?** Without it, P5 was 0.075
an answer below expectation and stayed in a comeback for a whole 40-answer visit, with no genus opening. The hold
added that allowance for the same reason: without it, the simulated expert was held for good.
*Recommendation:* yes, as a measured change: a learnsim run first (rule L11), then its own PR. Around one day, real
comebacks already run longer than simulated (median 6.5 against 3), so the allowance would bring them closer. It would
not change P11's case.

**(e) Log the comeback's rust at its start** (a field in the scoring record of its first question), so that the
recalibration this row waits for can read the app's own rust, not rebuild it?
*Recommendation:* yes. It is small, changes nothing players see, and makes the next study exact.

**(f) After a comeback, keep the recall discount on the units it did not review** until each is answered once?
*Recommendation:* no, for now. After the comeback, the surprise was positive in 10 of 13 cases, so nothing shows the
model being too optimistic there. Revisit with (c).
