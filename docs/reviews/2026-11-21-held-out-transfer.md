# The held-out photos and transfer: where the analysis stands (REE-58)

Read-only study, 2026-11-21 (Manila evening). Nothing in the app, the sheet or the tools changed. Aggregates only;
the extract and the scripts stayed in the session's scratchpad (rule D2). It follows the design note
[2026-11-15-held-out-photo-set-design.md](2026-11-15-held-out-photo-set-design.md) ("the note" below) and the decision
record [2026-11-19-per-player-reserve.md](../decisions/2026-11-19-per-player-reserve.md).

**Result in one line:** the analysis cannot run yet. Since the per-player reserve shipped, 10 exam answers were asked on
a reserved photo, from 3 players who all played fish before it, so none of them is clean by the rule below. The primary
waits for its stop rule, which today's players cannot reach on their own: it needs players who start fish after
2026-11-19.

## 1. What changed since the note, and why its plan cannot run as written

- **Exam only, no probes.** The note's primary contrast compared *probes* (ordinary quiz questions slipped onto a
  held-out photo) with practice photos at their first exposure, at every stage of a unit. Pierre, 2026-11-18 ~06:02
  Manila: «J'avais pas compris qu'on faisait ça. Je pensais qu'on gardait des photos pour la fin.» (ANSWERS.md
  2026-11-18, "Exam reserve: exam only"). So the reserve feeds the mastery exam only, and `|h` appears on exam answers
  only (`quiz|h|x`, spec/reserve.md). An exam sits at one stage (the unit about to be learned), asks the hardest photo
  first, and is partly typed (`TYPED.exam`).
- **A reserve per player, not one fixed set.** #1099 (2026-11-19, the decision record) replaced #1057's fixed fish set
  by a reserve per player, in every subject, recomputed from the photos in play. The note's "clean" rule (`since`,
  `was` on each held-out record) has no record to read any more, so it is restated below.

## 2. The plan, declared before any right/wrong was read (2026-11-21 21:40 Manila)

Written to the scratchpad before the outcome column was read; only counts had been seen. Integrator's call, easy to
correct (the note already classes the clean rule, the stop rule and the primary as such).

- **Data:** the sheet's Answers tab, read-only, rows to 2026-11-21 17:17 Manila; a live read of the rows after the
  extract's last at about 21:35 returned none. Tokens read by splitting Mode on `|` (`h` reserved, `x` exam, `t` typed).
- **Regimes:** before #1057 (merged 2026-11-18 10:05 Manila), no held-out photo; #1057's fixed set until #1099 (merged
  2026-11-19 15:12 Manila); the per-player reserve after. Each reported apart.
- **Clean** (per-player reserve): a reserved exam answer whose observation (the photo's `o` in `fish-game.json`, rule
  L3) has no earlier logged quiz exposure for that player, **and** whose player's first answer in that subject came
  after the reserve shipped. The second condition stands for the exposures nobody logs (sheets, cards, Home, Memory),
  as the note's `since` did. A row that fails it is reported apart as a sensitivity row; it never enters the primary or
  the stop rule.
- **Primary contrast (adapted to exam only):** among exam answers, clean reserved against not reserved, matched on
  subject and typed or not; players as the unit, a sign-flip test over players, one-sided 5%. Confounds that remain and
  are named, not removed: a not-reserved exam answer happens only once the player's reserve for that unit is spent or
  the unit is too thin to hold one (later exams, or smaller units), and both pools take their hardest photo first.
- **Secondary:** clean reserved exam answers against the same players' practice answers at a photo's first quiz
  exposure, same subject, matched on typed or not and the number of choices. Exploratory: an exam photo is the hardest
  of its pool, so this contrast reads a difficulty gap as well as transfer.
- **Stop rule (restated for the exam):** the primary runs once 20 players each have 10 clean reserved exam answers or
  more (two exams' worth, `EXAM.n` = 5). Before that, pooled counts only, read as descriptive: no test, no interval,
  no per-player table.

## 3. What the log holds (aggregates)

| | Reserved exam answers (`\|h\|x`) | Not reserved exam answers |
| --- | --- | --- |
| Before #1057 | 0 | 26 (fish 22 across 2026-11-08 to 11-12, corals 4 on 11-12) |
| #1057's fixed set (11-18 10:05 to 11-19 15:12) | 0 | 0 |
| Per-player reserve (from 11-19 15:12) | 10 (fish, 3 players, 4 families, 3 typed) | 3 (fish, 2 players, 2 families, 1 typed) |
| of which with a logged earlier exposure of the observation | 0 | 0 |
| of which from a player who started the subject after the reserve | 0 | 0 |
| **Clean (the primary's rows)** | **0** | – |

- No coral or sea slug answer carries `|h` yet: no coral or sea slug exam has been asked since the reserve shipped.
- The 10 reserved answers are the sensitivity row (logged-unexposed, but their players met fish before the reserve).
  Descriptively, 9 of them were right, and 3 of the 3 not-reserved exam answers since the reserve. Three players and 13
  answers: this says nothing about transfer either way, and is shown only because the plan allows a pooled count.
- **Accrual:** 10 reserved exam answers between 2026-11-19 15:12 and 2026-11-21 17:17 Manila (about 33 a week), from the 3 players who answered anything since
  the reserve shipped.

## 4. How far the stop rule is

- Clean rows need players who start a subject after 2026-11-19 15:12 Manila. There are none yet. Every current player
  adds only sensitivity rows, for good, in the subjects they had already played.
- 20 such players with 10 clean reserved exam answers each means 200 clean exam answers, at least 40 exams. With 3
  active players today, it is reached only with a new intake of RAs (or by starting a subject they have not played:
  their first sea slug or coral answers after the reserve would make those subjects' rows clean).
- The note's power table still applies in spirit: with fewer players, only a large gap (about 10 points or more) could
  show, and exam answers sit near the top of a unit's curve, where a gap is narrower than at a probe's first questions.

## 5. What would make it run, and when to look again

- **Re-run trigger:** once any player who started a subject after the reserve has 10 clean reserved exam answers,
  re-count (the same declared plan); the primary runs only at the stop rule.
- **The #944 photo-memory table's next run** (each subject's next 1,000-answer milestone) can add the reserved exam
  answers as a descriptive "never shown" row, apart, as the note planned for probes.
- Nothing here asks to reopen the exam-only decision. If a transfer result is wanted sooner than an RA intake allows,
  that is a different design (practice probes), which Pierre turned down on 2026-11-18; it is noted, not proposed.
