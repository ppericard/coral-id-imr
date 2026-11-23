# Fast learners: what their first answers say, and when hard questions reach them (REE-191, 2026-11-23)

**Status: read-only study (docs).** Nothing in the app, the sheet, the data files or Linear changed. Written on
2026-11-23 (Manila evening) on `origin/main` at `1ef2300c`. Players are P1, P2… (rule D2): the labels of the REE-85
study, so P7, P14 and P4 are the same players as in
[2026-11-23-fish-ease-vs-answers.md](2026-11-23-fish-ease-vs-answers.md) (its experts section on PR #1499 until it
merges). No photo was judged (rule P7), no simulation
was run, and iNaturalist was not asked.

**What this note completes.** REE-191's study already exists: the Google Doc "Pace for fast learners — study
(2026-11-22)" (Drive Reef_ID, linked from REE-191; its scripts in `tools/studies/ree191/`). It measured how fast the
shown % moves for players who start fast and right, found what holds it back (weak evidence per right answer in corals,
the score's structure in fish), and recommended typed questions keyed on the unit's ability ("lever 1"). This note does
not redo that. It adds what REE-191's comments of 2026-11-23 ask for:

- Pierre, 20:40 (the guiding aims, LEARNING.md "The players we design for", #1500): experts should «assez rapidement …
  retrouver des vrais challenges». So: how many answers until a fast player meets questions that resist her?
- Pierre, 20:49: fast right answers on the first easy families do not reveal an expert. A beginner with a good eye
  does the same, even with ten families open. Only hard photos, look-alikes and lower ranks tell them apart. So: split
  the first answers by the difficulty actually asked, and say where each lever's informative questions come from.
- The sea slugs, which had no answers when the Doc was written.

## Summary

- **A fast, right start did not mean expert in corals** [measured]. Four coral players had a replayed level of 1.9 or
  more at answer 50. Two of them ended under 0.7. Their first 50 answers were as right as those of the two who stayed
  high (92-98%), and P8's as fast (2.3 seconds a median answer, against 2.0-2.5). Under the game's own one-level
  model, their first 50 answers favoured "expert (level 2.0)" over "good eye (0.875)" by 3.3 to 6.7 nats. That is 27
  to 800 to 1 odds, as strong as for the real experts. The model was wrong because those answers came from 6 to 11
  units. The gap showed when many units were in play:
  - P10's units met went from 8 to 31 between answers 50 and 100. His right answers on informative questions fell from
    94% to 55%.
  - P8's evidence reversed between answers 200 and 300, at 25 to 33 units met.
  - In corals, the level at answer 50 says nothing about the level reached later: Spearman 0.05 over 8 players.
  - In fish it did (0.86 over 7 players). But one fish player looked like an expert for 200 answers and ended at 1.11.
- **The game's aim for strong players comes early; questions that resist them come late or rarely** [measured]:
  - **The aim reaches 75% early.** The replayed level reaches 1.5, where the aim reaches 75%, at answer 10-30 in corals
    (3 fast starters) and 10-15 in fish (4).
  - **The questions served stayed easier than the aim.** The game expected 0.78-0.86 success on them. They answered
    89-97% right, except corals at answers 201-300 (81%).
  - **Corals:** look-alike questions start to resist at answers 51-100 (88% right) and reach 82% at 201-300.
  - **Fish:**
    - Photos judged under ease 4 do not resist them: 346 of 369 right (94%, 4 players). The other players: 82%.
    - What resists them is the lower ranks (genus, species): 16 of 23 right (70%). But those were only 1-5% of their
      first 300 answers.
  - **Sea slugs:** one player with 165 answers met 5 photos under ease 4. Only 15% of the sea slug pool is under
    ease 4, and 4 of its 33 families have none.
- **Where informative questions come from.**
  - **The model's best question.** One four-choice question at the right difficulty gives at most 0.09 nats between
    those two levels, and a typed one 0.155 [model]. That is 19 typed or 33 four-choice questions for 20 to 1 odds.
  - **What the opening gave.** The game's own early questions gave 0.03-0.06 nats each, all on the few units open.
  - **The opt-in placement test (REE-112).** It is the one place where hard questions about many units, opened or
    not, can be asked early, at no cost to those who skip it. 25 questions spread over 25 units give the breadth that
    took the game 100-300 answers here.
- **Recommendation.**
  - **REE-112 first, as decided.** Its question set should be built from what separated the players here: many units,
    look-alike pairs, the hard genera and families, lower ranks in fish, and typed questions where possible. The
    opening's easy units do not separate them.
  - **Inside the game,** the Doc's lever 1 (typed questions keyed on the unit's ability) is still the lever. Typed
    questions are also the most informative format, and lever 1 claims knowledge of one unit only, so Pierre's
    objection does not apply to it.
  - **Finer ranks earlier, for every subject whose path goes through several ranks** (one rule, rule S1; Pierre,
    2026-11-23 21:22: «La règle doit être générale»). Measured in fish, where for the fast-right starters the only
    questions that resist are the lower ranks: the Doc's option 2 (Q382) comes back to Pierre with this evidence.
  - **No evidence-only harder questions inside the quiz now** (the integrator's idea). They are slower than the test
    and cost a beginner with a good eye a miss every 15-22 answers. Pierre keeps the concept for other contexts
    (2026-11-23 21:22; Linear REE-253).
  - **Response time.** It is not a pace lever today. A replay without it moves the group's median level by 0.1 at
    most. As a signal, it separated the coral experts from two slower players, but not in fish.

## 1. Data and method

**The log.**

- **Source.** The sync sheet's Answers tab, read-only through the Sheets connector. It is the extract the REE-85
  study read and pseudonymised on 2026-11-23 at about 16:26 Manila: 7,676 rows, the last answer 2026-11-22 18:36.
- **Checked live.** At about 21:00 Manila, rows 7,670-7,677 of the live tab matched the extract (the same answer ids)
  and the tab had no later row (rule D1: read only).
  - **Corals:** 3,971 answers, 15 players, 11 with 100 or more.
  - **Fish:** 3,537 answers, 9 players, 8 with 100 or more.
  - **Sea slugs:** 168 answers, 2 players, 1 with 100 or more.
- **Next to the Doc's extract.** The Doc read 7,445 rows to 2026-11-21 17:17. The 231 rows added since change no
  group.

**The groups.**

- **Fast-right starters.** The Doc's "strong" rule, kept as it was declared: 94% or more right in the first 50
  answers of the subject and a median of 2.6 seconds or less. This is "fast and right from the start", which Pierre's
  20:49 words say is not "expert". The note calls them fast-right starters and asks how many were experts.
  - Corals: 3 (P8, P11, P14).
  - Fish: 4 (P4, P7, P13, P14). P13 has only 97 fish answers.
  - Sea slugs: none. The one player with 100+ answers, P7, was 94% right at 2.7 seconds.
- **Others:** every other player with 100+ answers in the subject. Corals 8, fish 5, sea slugs 1. Most are IMR staff
  and RAs, not beginners (as in the Doc).
- Where a player matters by name, the note gives the P label and figures from the replay, never a real name.

**The replay.**

- Each player's answers in time order go through `core.js` `replayProgress`, as the Doc's `pace.js` does: every 5
  answers to 300, then every 10 to 600.
- **Three variants:**
  - as the game runs today;
  - `time: false`: response time left out;
  - a first-launch answer "I know corals well" from the first answer (`know`, prior 1.25, the highest start the
    first-launch question sets).
- **Check.** The replay gives the Doc's group medians: coral % at answer 200, 24 for the fast-right starters; fish 30.

**What was asked, answer by answer** (the first 300 answers):

- **rank:** fish families, sea slug genera, against lower ranks (genus, species);
- **format** (`core.js` `kOf`):
  - typed;
  - a look-alike format: 3 or more plausible choices, which from an ability of 0.54 means look-alike traps, or the
    scoring record's look-alike test `l` = 1;
  - a Duel-tab or quiz duel;
  - otherwise, 2 plausible choices;
- **judged ease** (fish: the ease at the time of the answer, from the REE-85 study's snapshots; sea slugs: today's
  `seaslug-game.json`, all their answers being from 2026-11-22); corals have no judged ease;
- **the unit's bar** at the replay's checkpoint just before the answer (under or over 50%, "past half").

"Informative" below means a lower rank, typed, a look-alike format or a photo under ease 4. "Easy" means none of these.

**How much an answer can tell an expert from a good eye** [model].

- **The two levels.** An expert at 2.0, the simulated expert of the placement study. A beginner with a good eye at
  0.875, the floor of the "know well" band (`core.js` `startBand`); 0.5 and 1.25 are shown as sensitivities.
- **The question as asked.** Its effective difficulty comes from what the row logged: expected success `e`, ability
  `th`, and guess rate `g` (`core.js` `guessOf`), with e = g + (1 − g) σ(th − d).
- **Per answer:**
  - the expected evidence, a Kullback-Leibler divergence in nats, is what a question can tell;
  - the observed log-likelihood ratio of the actual answer is what it did tell.
- **The scale.** 3 nats is 20 to 1.
- This assumes one level across units, the game's own model. Section 2 tests that assumption.

**Labels:**

- **[measured]**: computed on the real answers.
- **[model]**: computed on the game's response model.
- **[inference]**: my reading.

**Intervals.**

- Proportions pooled over answers carry a Wilson 95% interval. It treats answers as independent, so it is too narrow
  when one player gives many of them.
- With 3-4 players a group, a group figure is a median with its range, and the number of players is given with each.
- Nothing here is a test.

## 2. A fast, right start against the level reached later [measured]

Coral players with 150 or more answers. "Evidence" is the observed log-likelihood ratio, expert (2.0) against good eye
(0.875), summed over the answers so far: positive favours expert.

| Player | Group | First 50: right, median s | Units met by 50 | Level at 50 / 100 / 200 / last | Evidence at 50 / 100 / 200 / 300 |
| --- | --- | --- | --- | --- | --- |
| P11 | fast-right | 98%, 2.5 | 10 | 2.47 / 2.31 / 2.40 / 2.51 (284 answers) | +6.7 / +11.1 / +23.2 / - |
| P14 | fast-right | 98%, 2.0 | 11 | 2.10 / 1.84 / 1.73 / 1.77 (447) | +5.9 / +8.9 / +15.3 / +21.2 |
| P8 | fast-right | 96%, 2.3 | 6 | 1.95 / 1.73 / 1.61 / 0.68 (447) | +3.3 / +4.4 / +5.0 / −14.5 |
| P10 | other | 92%, 6.8 | 8 | 2.33 / 0.24 / - / 0.29 (197) | +5.3 / −3.6 / - / - |
| P7 | other | 90%, 5.7 | - | 1.34 / 1.68 / 1.05 / 0.87 (450) | +1.3 / +3.5 / −2.1 / −10.4 |

Of the three other coral players with 150+ answers, P6 and P4 had negative evidence from answer 50 on, and P3 stayed
near 0 (+0.4 at 50, +0.6 at 100) until it turned negative by answer 200.

- **What they were asked.**
  - P8's first 50 answers held 13 informative questions; P11 and P14 had 49 and 39. Most of P8's other early answers
    were duels (two look-alikes, the Duel tab or in the quiz), which this note counts apart.
  - At answers 51-100, P8 got 84% of 37 informative questions right, P14 89% of 45, P11 90% of 48.
  - At answers 201-300, P8 got 48% of 23 right, P14 82% of 97, P11 94% of 78.
- **When the evidence turned.**
  - P10: when the units met went from 8 (answer 50) to 31 (answer 100). His right answers on informative questions
    fell from 94% to 55%. [inference] Such a jump looks like Open all; the Events tab was not read to confirm it.
  - P8: between answers 200 and 300, at 25 to 33 units met.
- **Corals: the early level does not predict.** Spearman correlations with the last level, 8 players: level at answer
  50, 0.05; at answer 100, 0.55; right in the first 50, 0.33; median seconds in the first 50, −0.49 (6 players with
  times).
- **Fish: it did predict, with one exception.** The same correlations were 0.86 for the level at 50 and for the
  first-50 accuracy, and −0.86 for the median seconds (faster, higher; 7 players). P10's fish evidence stayed positive
  to answer 200 (+8.7). His level was 1.90 at answer 50, and he ended at 1.11 with 74% right on informative questions
  at answers 151-300.
- **Reading** [inference].
  - The game's level treats a player as one number across units. Early on, the answers cover 6-11 units, mostly the
    easy, distinctive ones the opening brings first. What they prove about those units is real. What they suggest
    about the units not yet met is what fails, as Pierre said.
  - In this log, the answers that separated a good eye from an expert came from many units in play (25-31 and more),
    after 100-300 answers.

## 3. When questions start to resist a fast-right starter [measured]

**The aim reaches 75% early.** Answers until the replayed level first reaches 1.5, where `core.js` `aimOf` reaches 75%:

| Subject | Fast-right starters | Others with 100+ answers |
| --- | --- | --- |
| Corals | 30, 10, 30 (3 players) | 10-25 for 5 of 8; 480 for one; never for 2 |
| Fish | 15, 10, 10, 15 (4) | 20-100 for 4 of 5; never for 1 |
| Sea slugs | none in the group | P7: 30 |

**But the questions served stay easier than the aim** (fast-right starters; logged expected success against actual,
pooled answers):

| Answers | Corals: expected / right (3 players) | Fish: expected / right (4, then 3 from answer 101) |
| --- | --- | --- |
| 1-50 | 0.83 / 0.97 | 0.86 / 0.96 |
| 51-100 | 0.83 / 0.89 | 0.85 / 0.89 |
| 101-200 | 0.82 / 0.89 | 0.86 / 0.94 |
| 201-300 | 0.78 / 0.81 | 0.85 / 0.93 |

The others were at 0.72-0.78 expected and 0.76-0.86 right in both subjects.

**By what was asked** (right / asked, Wilson 95%):

| What was asked | Fast-right starters | Others |
| --- | --- | --- |
| Corals, look-alike format, answers 1-50 | 98/100 (0.93-0.99) | 180/213 (0.79-0.89) |
| Corals, look-alike, 51-100 | 113/129 (0.81-0.92) | 171/244 (0.64-0.75) |
| Corals, look-alike, 101-200 | 206/238 (0.82-0.90) | 180/265 (0.62-0.73) |
| Corals, look-alike, 201-300 | 160/194 (0.77-0.87) | 158/206 (0.70-0.82) |
| Fish, photo under ease 4, answers 1-300 | 346/369 (0.91-0.96) | 178/216 (0.77-0.87) |
| Fish, lower rank (genus, species), 1-300 | 16/23 (0.49-0.84) | 45/66 (0.56-0.78) |
| Fish, typed, 1-300 | 27/29 (0.78-0.98) | 9/10 |

- **Share of easy questions.** Fast-right starters get the look-alike format almost at once: easy questions were 5%
  of their first 200 coral answers (16% of answers 201-300) and 0-2% of their fish answers. For the others: 37-50%
  (corals) and 15-33% (fish).
- **Corals.** Look-alike questions begin to resist the fast-right starters at answers 51-100. They reach about the
  aim's neighbourhood (82%) only at answers 201-300, when 33-45 genera are in play.
- **Fish families.**
  - Judged-hard photos separate the groups (94% against 82%) but do not resist the fast-right starters. This matches
    the REE-85 study: the experts answer the photos judged 1-2 better than the app expects.
  - What resists them is the lower ranks, about 70% right in both groups. They made 0% of the fast-right starters'
    answers 1-50, 5% of 51-100, 1% of 101-200 and 3% of 201-300. The others had more, 1-11%. [inference] Probably
    through their IMR genera, which come outside the rank share (`model.js` `shareFree`).
- **Hard photos past half (fish).**
  - On families with a bar under 50%, 28% of the fast-right starters' answers were on photos under ease 4 (717
    answers).
  - On families at 50% or more, 65% were (209 answers), 90% of them right.
  - The others: 15% (1,035 answers) and 57% (92).
  - Their first photo under ease 4 came at answer 5-31. In their first 200 answers they had 13-99 such photos
    (4 players).
  - Most of these answers predate the cap of `RARE` and its floor (#1391), so the share before Open Water was higher
    than the draw gives today.
- **Sea slugs** (one player, 165 answers, so a description, not a figure):
  - The replayed level reached 1.5 at answer 30 and was 0.74 at the end.
  - The player met 5 photos under ease 4: 2 before half, 3 past it.
  - The pool is thin there: 15% of the 3,014 sea slug photos are under ease 4, and 4 of 33 families have none. Fish:
    71% of 25,148.
  - [inference] This is guiding aim 3 (content is the binding constraint): an expert cannot be challenged with photos
    that do not exist.

## 4. Where informative questions come from

**What one question can tell** [model]. Expert (2.0) against good eye (0.875), at the best difficulty for each format:

| Format | Best evidence per question | At that difficulty | On an easy question (difficulty −0.5) | Questions for 3 nats at best |
| --- | --- | --- | --- | --- |
| Typed | 0.155 | 1.63 | 0.061 | 19 |
| 4 choices | 0.090 | 1.22 | 0.044 | 33 |
| 3 plausible | 0.075 | 1.14 | 0.038 | 40 |
| 2 plausible | 0.051 | 1.02 | 0.028 | 59 |

**What the game's own questions told** [measured, under the one-level model].

- **Per answer.** Answers 1-100 gave the fast-right starters 0.034 nats per easy question and 0.057-0.060 per
  informative one. That is about two thirds of the best four-choice question, and under 40% of a typed one.
- **The total.**
  - Expected evidence reached 3 nats at answers 51-67 (corals, 3 players) and 49-51 (fish, 4 players).
  - With the good eye at 1.25, it took 110-147 answers (one fish player not within 300).
  - With the good eye at 0.5, 27-39 answers.
- **The catch.** Section 2 shows what these early nats are worth when they all come from a few units.

**The levers, by where their informative questions come from:**

- **The opt-in placement test (REE-112).**
  - **Where its questions come from:** 20-25 adaptive questions, typed where the player can. It may ask units not
    opened (decided 2026-11-18, choice (b)), so each question can be a different unit, a look-alike pair, a hard genus
    or family, or, in fish, a lower rank.
  - **What it would tell:** 25 four-choice questions at the right difficulty give about 2.3 nats, typed ones about 3.9
    [model]. That is what took the game 50-60 answers in expectation. And it comes from 20-25 units, the breadth that
    took the game 100-300 answers to reach in section 2.
  - **What its result sets:** only the starting variables (rule L10). The replay with "know well" from the first
    answer, the highest start today, brings the aim to 75% 5-25 answers sooner in corals and 5-10 sooner in fish. The
    median level from answer 100 on moves by 0.1 at most, and the shown % does not move: the bar uses only the
    player's own answers on a unit (Q128).
  - **So:** the test brings the challenge sooner, not the %. Its answers count as evidence on locked units (rule L4),
    but 25 answers over 40 coral genera barely move a bar (as the Doc said).
  - **Cost to a beginner:** none for those who skip it. A beginner with a good eye who takes it would get about 56% of
    the hard four-choice questions right, and about 32% of the typed ones [model].
  - **What it waits for:** its calibration set (#1080, decided). The shrinkage check of 2026-11-21 found that today's
    ratings cannot stand in for it.
- **Typed questions keyed on the unit's ability** (the Doc's lever 1; it completes REE-78, the TYPED tuning).
  - **Where its questions come from:** typed questions on the units the player answers right, from her second right
    answer on a unit.
  - **What it would tell:** typed is the most informative format, 0.155 nats at best against 0.09 for four choices. It
    also moves the bar faster: 3 right answers to 50% instead of 5 (the Doc).
  - **Against Pierre's objection.** It claims knowledge of one unit only, from that unit's own answers. A good eye on a
    few distinctive units earns typed questions on those units, and a typed question asks recall, not recognition.
    That is exactly where a good eye and an expert differ.
  - **Cost to a beginner:** a beginner with a good eye meets typed questions on units she knows by sight, and may miss
    the names. A miss on a harder question costs little progress (`core.js` `pgMissW`). A player whose units stay
    under the threshold sees no change (the Doc's trigger counts).
- **Finer ranks sooner, in every subject with several ranks** (the Doc's option 2: a finer level's share counted from
  Open Water for a settled high level; one rule for every subject, rule S1; it touches Q382; measured in fish).
  - **Where its questions come from:** genus and species questions, the only ones that resisted the fish fast-right
    starters (16/23, 70%).
  - **What it would tell:** they are where the fish experts' challenge and the separating evidence both are. Today
    they make 1-5% of these players' answers, because the rank share is m², m being the share of families at Advanced.
  - **Cost to a beginner:** none if keyed on a settled level of 1.5 or more after 200 answers. Unkeyed, every player
    would meet species sooner (the Doc).
- **The opening pace** (rule L4, LEARNING.md "One opening rule"; Open all, Q181).
  - **Where its questions come from:** more units in play, which is what revealed P10 and P8.
  - **What it would change:** the Doc measured it at about 4 points of % before 150 answers and nothing after.
  - **Cost to a beginner:** more units sooner is P10's stretch at 55% right, under every aim, which a good-eye beginner
    would feel as failure.
  - **So:** Open all already lets a player choose it. Nothing to change [inference].
- **Response time** (REE-16; Q449-Q452: a continuous weight by the player's strength; step 2 decided).
  - **Where its evidence comes from:** a hesitation on a right answer, no new question.
  - **What it changes today:** the replay without time moves the fast-right starters' median level by 0.1 at most,
    at answers 25-300. The answers until the aim reaches 75% change by 0-5. So today's `core.js` `rtWeight` adds
    little pace.
  - **As a signal of expertise.** Take the median time of right answers on questions the game expected to be harder
    (expected 0.8 or less) over easy ones (over 0.9), first 200 answers, duels left out:
    - corals: 1.04-1.05 for the two experts (P11, P14), 1.95-2.41 for P3 and P10;
    - P8 cannot be measured: 2 easy questions;
    - fish: 1.04-1.24 for the three experts, 0.83-1.18 for three of the four others and 1.79 for one: no
      separation.
  - It fits Pierre's point that time matters on hard questions (and the REE-85 study's +4% a point for the top fish
    players). It needs the hard questions first. Measure it again when 6 players per subject have 200 answers.
- **Harder questions inside the quiz, counted only as evidence** (the integrator's idea in REE-191's comment of
  20:49; not decided).
  - **Where its questions come from:** a harder question slipped in now and then.
  - **A limit of the rules.** Rule L4 asks no question on a locked unit in the photo quiz ("no question before" a unit
    opens). So inside the quiz they could only be harder questions on open units, unless Pierre makes an exception.
  - **What it would tell:** at 0.09-0.155 nats each, 19-33 of them give 3 nats. At one in 10 answers that is 190-330
    answers, no sooner than the game separated the players here.
  - **Cost to a beginner:** a beginner with a good eye would miss about 45% of the four-choice ones and 68% of the
    typed ones: at one in 10 answers, a miss every 15-22 answers. It duplicates what the placement test does at no
    cost to those who skip it.
  - **Not recommended** [inference].

## 5. What the figures cannot say

- **Few players.** Corals: 3 fast-right starters, among 8 players with 150+ answers. Fish: 4, among 7. Sea slugs:
  1. Every figure is descriptive. The correlations rest on 6-8 players and carry no test.
- **The groups.** The fast-right rule was set by the Doc after seeing first-50 figures. "Expert" here means a high
  level reached late in the replay, not the Notes tab's experts, which were not matched (rule D2).
- **The engine changed during the log.** Formats, the photo ratings (fish served ratings from 2026-11-19), RARE and
  its floor: the questions these players were asked were chosen by the game of their day. Their logged `e` and `th`
  are that game's. The replay scores them with today's.
- **One level, two values.** The evidence figures assume one level per player and the two values 2.0 and 0.875. The
  sensitivities (0.5, 1.25) move the counts, not the reading. The model's assumption is what section 2 shows failing
  early.
- **Ease.** The fish ease is the ease at the time, the sea slug ease today's. Corals have none. "Look-alike format"
  covers most questions from an ability of 0.54 on, so it separates little at the top.
- **No true beginner.** As in the Doc, the log holds almost none, so "the cost to a beginner" is argued from the rules
  and the model, not measured.
- **Hard but identifiable.** Whether a hard photo is a fair challenge (one photo of a multi-photo observation shown
  alone) is not measured here: see the follow-up below.

## 6. Follow-up: one photo of a multi-photo observation (not run)

REE-191's comment of 20:44 asks for a first measure, with no judging:

- each in-play observation's photo count on iNaturalist, and our photo's position;
- then single-photo observations against secondary photos in the answer log, the strong players' misses included.

It needs iNaturalist and was not run here.

- **The cost is small.** `tools/photo_recheck.py` already asks every in-play observation's `photos.id` (iNaturalist v2,
  200 observations a request, paced by `tools/inat.py`, rule C7) in its weekly run (`photo-recheck.yml`, Thursdays
  04:17 Manila).
  - **Option 1:** add the observation's photo count and our photo's position to its `report.json`. No new request.
  - **Option 2:** one read of its own, about 140 batched requests for about 28,000 observations, at about one request
    a second: a few minutes.
  - In play today: fish 23,664 observations (968 hold 2 or more of our photos), sea slugs 3,014, and the corals' 1,764
    photos with an observation (the 2026-11-21 audit).
- **The join** is a read-only script on the answer log, like this note's.
- **What it would say:**
  - whether strong players miss single-photo observations' photos less than secondary photos;
  - what share of the hard photos are secondary views. A secondary view may be identifiable only with its siblings.
- **Related:** REE-194 (photos other players also miss).

## 7. Recommendation and questions for Pierre

**Recommendation** [inference, from sections 2-4]:

1. **The opt-in placement test (REE-112) stays first.** It is the only lever that asks hard questions about many units
   early, at no cost to those who skip it. This study adds a design target for its question set: many units,
   look-alike pairs, the hard genera and families, lower ranks in fish, typed where possible. The opening's easy units
   did not separate the players. It also adds an expectation: the test brings challenge sooner, not a higher %. That
   is consistent with its decided scope (variables only, rule L10).
2. **Inside the game, the Doc's lever 1 (typed questions keyed on the unit's ability, with its guard) stays the
   recommended trial.** This study adds two arguments: typed questions are the most informative format, and a
   per-unit trigger is not fooled by a good eye on a few units.
3. **The finer ranks** are where experts meet resistance (measured in fish). The Doc's option 2, as one rule for
   every subject whose path goes through several ranks, comes back as a question below.
4. **No evidence-only probes inside the quiz now** (the concept kept as an idea, REE-253), and no change to the
   opening pace or the response-time weight for this purpose.
5. **Measure again** when 6 players per subject have 200 answers: the section 2 table, and the response-time ratio of
   section 4.

**Questions for Pierre** (after 04:00, Rule 0; player-facing and not yet decided):

- **(a) The Doc's three questions on lever 1 still stand, unchanged.** Typed questions before a 50% bar as a reversible
  trial; rule L9's "level on a unit" read as the unit's ability; the threshold, 1.5 recommended. Nothing to add but the
  two arguments above.
- **(b) Finer-rank questions sooner for a player whose level is settled high, in every subject whose path goes
  through several ranks?** (One general rule, never a fish exception: Pierre, 2026-11-23 21:22.)
  - **Context.** The fish fast-right starters answered 94% of the photos judged hard right, and only the lower ranks
    resisted them (70%). Those made 1-5% of their first 300 answers, because a finer rank's share follows the families
    at Advanced (Q382).
  - **Options.**
    - (1) As today.
    - (2) For a player whose level is settled at 1.5 or more (200 answers), count the next rank's share from the
      families at Open Water instead of Advanced.
    - (3) The same for every player.
  - **Recommendation: (2) as a reversible trial,** after lever 1's first measure if both are taken. It touches Q382's
    «maîtrisés», so it is Pierre's choice.
- **(c) For the record, no answer needed unless he wants it:** the integrator's idea of evidence-only harder questions
  inside the quiz is not recommended (section 4). Rule L4 would need an exception to ask about locked units, and the
  placement test does the same job at no cost to those who skip it.

**What should change in the Google Doc** (for the integrator; the Doc is not edited here):

- A line at its top pointing to this note.
- "Strong" renamed "fast-right starters", with Pierre's 20:49 caution.
- Its placement-test row: add "brings the aim to 75% 5-25 answers sooner; no %".
- Its response-time row: add the `time: false` replay figure (median level within 0.1).

## Reproduce

The scripts and their outputs stay in the session's scratchpad (`ree191/` there), not in the repository. The input
holds pseudonymous labels only. The name map was never written (REE-85's `pseudo.py`, the same as
`tools/studies/ree112/pseudo.py`).

1. Read the Answers tab read-only and pseudonymise it: `python3 -I pseudo.py <get_values.json> answers.json`. Here the
   REE-85 study's extract, checked against the live tab.
2. The replay and the per-answer table. It reads the REE-85 study's `rows.json` for the fish ease at the time, and
   took a few seconds in the machine slot (rule W24):
   `node tests/slot.js --name ree191-study -- node study.js answers.json <origin/main worktree> rows.json`
   → `study-out.json`.
3. Group figures: `python3 -I summary.py study-out.json` (`summary.txt`).
4. Section 2: `python3 -I transfer.py study-out.json`, `python3 -I llr_players.py study-out.json` and
   `python3 -I windows.py study-out.json coral P8 P14 P11 P10`.
5. Response time: `python3 -I rt_early.py study-out.json`.
6. The photo pools: `node pool.js <origin/main worktree>`.
