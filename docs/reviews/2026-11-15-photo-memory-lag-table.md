# Photo memory against the time since the last show: the read-only table (Q317 step 1, 2026-11-15)

Read-only study for step 1 of the ROADMAP row "Photo memory that fades with time" (Q317, Pierre 2026-11-09): before any
lag model is built, do the real answers show a lag effect at all? Today a photo's memory offset (`core.js` `MEM`,
`memBucket`, `memFam`) is the same a minute or a month after the photo was last shown. It changes nothing in the app.
The design follows the literature review's step 1 ([reference/lit-photo-memory.md](../reference/lit-photo-memory.md)
§5.1).

## Plan, declared before looking at the data

Written and pushed before the Answers tab was read for this study (rule L11). What was already known, from the docs
only: the 550-answer coral table of 2026-11-03 (LEARNING.md "Photo memory": 20 / 64 / 9 answers in the three seen
buckets, no lag), the 45 fish answers on a seen photo of 2026-11-08 (13 / 31 / 1), and the coral offsets of 2026-11-14
(+0.35 / −0.68 / −1.17, the Q351 refit study). No lag distribution has been looked at.

**Data.** The sync sheet's Answers tab, read through the Google Sheets connector (unformatted values), read-only:
nothing is written to the sheet. The copy holding names stays in the scratchpad, outside the repository, and is
deleted at the end (rule D2). Players are labelled P1, P2… by their number of answers in the subject, labels of this
study only; the mapping goes to the integrator, never into a committed file.

- **Rows.** One subject at a time (`core.js` `subjRows`: corals = Subject blank or `coral`; fish = `fish`), surprise
  cards left out (`winkRow`), rows without photos left out. Players: those `core.js` `trustOf` trusts on the subject's
  rows (as the photo ratings and the memory fit do; it leaves out bots and test runs).
- **History.** Replayed from the log per player and photo file, in time order (rows of one minute in sheet order): the
  photos of the Photos column, plus a corallites hint revealed after the answer (the scoring record's `h`) as a show,
  as `core.js` `scoreAnswer` counts it. Each photo's `[shown, right]` before the answer gives its bucket (`memBucket`:
  0 new, 1 shown never right, 2 right once, 3 right twice or more) and its **lag**: the time since that player was last
  shown that photo (any mode).
- **Lag bands**: < 10 min, 10 min-1 h, 1 h-1 day, 1-7 days, > 7 days (Time column; its resolution is checked first and
  reported).
- **Multi-photo questions**: the engine's convention (`eloReplay`'s `memn`): an answer of n photos weighs 1/n in each of
  its photos' (bucket, lag band) cells. "Answers" in a cell are these weights summed.

**Expected right %.** Primary: the expectation of **today's bucket model**, recomputed from the logged one by the logit
swap of #790 (LEARNING.md "Photo memory", per subject):

- x = logit(((e − g) / (1 − g)) / R), with e the logged Expected (column I), g = 1 / `core.js` `kOf(mode, choices)`
  (0 typed), R the scoring record's recall `r` (1 when absent);
- x' = x + f − f', with f the memory offset the game logged (the scoring record's `f`, 0 when absent from a record) and
  f' today's: `memFam` over the question's photos with the replayed buckets and today's offsets, for the corals the
  offsets the sheet serves now, computed offline by `core.js` `photoMemOf` on the coral rows of this read (what
  `?stats=1` `mem` computes), for the fish `MEM.PRIOR` (what the app uses for them, `model.js` `pmem`);
- e' = g + (1 − g) · R · σ(x').
- Rows covered: those with a scoring record (sheet v61, from 2026-11-06), so f is known. Before trusting the swap, the
  check: e rebuilt as g + (1 − g) · R · σ(θ − d − f − c) from the logged Ability θ and the record's d, f, c must match
  the logged e within 0.01 on at least 95% of these rows (reported; if it fails, the reason is found before any table is
  read). A row whose (e − g) / ((1 − g) R) falls outside (0, 1) is skipped and counted.
- Secondary (robustness, every epoch): the logged e as it is, on every row with a logged e, whatever offsets the game
  had then (none before sheet v26, coral offsets on fish before #790).
- Also reported, no inference: how often the replayed bucket disagrees with the logged f (logged f 0 on a photo the
  log shows as seen, or the reverse), since the app's own history (`s.ps`) can differ from the log's.

**The table.** Per subject, lag band × bucket (buckets 1-3; bucket 0 as the reference row): answers, players, observed
right %, expected right %, observed − expected in points with a 95% interval from a player-cluster bootstrap (players
resampled, 2,000 draws, seed 1, percentiles).

**Minimum cell.** A cell's difference and interval are read only with at least 20 answers from at least 3 players;
otherwise the cell is shown and marked "too few", never read.

**Stop rule** (the ROADMAP's, per subject): no lag term can be estimated, and none is proposed, if one lag band holds
80% or more of the answers on a seen photo (buckets 1-3), or if fewer than two lag bands each hold at least 30 such
answers from at least 3 players.

**Primary test (corals; one test, no correction needed).** Per player, per bucket j in 1-3: the mean residual (right −
e') at short lag (< 1 h, the first two bands) minus that at long lag (≥ 1 day, the last two bands); the player's
contrast D is the mean of these differences over the buckets where both sides hold at least 2 answers, weighted by
the smaller side's answers (stratified by bucket, so a different bucket mix at short and long lag cannot pass for a
lag effect). A player counts with at least 3 such weighted answers. Mean D over players, a 95% t interval on players −
1 degrees of freedom, a two-sided exact sign-flip test over the players. At least 6 players are needed (with 5 the
smallest two-sided p is 0.0625); fewer: "cannot test".

**Directions declared** (the review's §5.1): success above expectation falls with lag (D > 0); "shown never right" is
above expectation at short lag and at or below it at long lag, or after 2 or more misses (descriptive rows: bucket 1
split by prior misses on the photo, 1 against 2+, short against long lag; exploratory, uncorrected).

**What counts as a lag effect, and the outcomes** (per subject):

- **Stop**: the stop rule holds. No lag term; step 2 does not start for that subject.
- **Shown**: mean D > 0 and sign-flip p < 0.05. A lag term is warranted for step 2 (subject to the control below).
- **Absent at the literature's size**: not shown, and the upper bound of D's 95% interval is under 5 points. The
  literature's short-against-long item effect is about 0.3-0.7 logits (Pelánek 2015: +0.7 from 10 minutes to a few
  hours, +0.4-0.6 at 1-3 days, about 0 at 30 days), about 5 points at our success rates (85-90% on seen photos). No
  lag term now.
- **Unclear**: neither. No lag term now; the table is run again when the subject's log reaches its next 1,000-answer
  milestone.
- A D below 0 with p < 0.05 is reported as the opposite of the literature, and no lag term follows.

**Control (exploratory; it qualifies the verdict).** Short against long lag can also be the session: warm-up, fatigue,
or the Elo's catch-up after a recent miss on the same unit. On answers whose photo is new to the player (bucket 0), the
same per-player contrast with the lag taken as the time since the player last answered the same unit (genus or fish
unit shown). If the primary is "shown" and the control's mean is at least half the primary's, with its 95% interval
excluding 0, the verdict becomes "a lag effect, not shown to be photo-specific": step 2 would then have to fit the
photo lag beside a unit-recency term, or explain the control first.

**Fish** run the same way, exploratory (few repeats: 45 of 1,536 answers on 2026-11-08); their test is reported, not
used for a decision unless it passes the stop rule and the minimum players.

**Scripts.** Kept in the scratchpad (single use: a parser of the connector's reply and one Node script on `core.js`),
described with the results; nothing added under `tools/`. Read-only; light (seconds), no machine slot needed.

**What the table can conclude (rule A5).** Whether answers on a seen photo beat today's time-free expectation more
soon after the last show than days later, per subject, with players as the unit. It cannot give the decay shape, the
weight h, or a gain in prediction (steps 2 and 3), and it cannot separate photo memory from session effects beyond the
control above.

## Results

The plan above was pushed as eb386fad before the tab was read (GitHub's activity log: branch created at eb386fad at
03:27:17 UTC; the connector's three replies saved at 03:27:32-35 UTC); the results below were computed after, with the
plan unchanged.

**Verdict: Stop, for both subjects**, by the stop rule's second clause (fewer than two lag bands with 30 or more answers
on a seen photo from 3 or more players; no band reaches 80%, so the first clause does not apply). On the corals only the
1-7 days band qualifies (50% of the repeats; the > 7 days band has 29.8 answers from 1 player, the < 10 min band 22.5
answers from 8 players, the others fewer); on the fish only the under-10-minutes band does (58%). The verdict holds on
the plan's primary rows (those with a scoring record). On every coral row (the secondary, below) four bands qualify and
the stop rule would not hold, but the primary test there has 4 players of the 6 needed, the plan's "Unclear": no lag
term either way. The primary test cannot run (1 player with answers at both short and long lag, on each
subject; 6 needed). **No lag term; step 2 does not start.** Nothing in the table contradicts the literature either: the
few short-lag cells sit above expectation, as Pelánek's curve predicts, but they are too few to be read.

**Data.** The Answers tab read through the Google Sheets connector on 2026-11-15 at 11:27 Manila: 5,668 answers
up to 2026-11-13 16:40 Manila (the same last row as the export of the Q351 studies: no answer logged since), read-only.
Corals 3,308 answers of 15 players, fish 2,355 of 9 (5 surprise-card answers left out). Every player is trusted
(`trustOf`). The Time column has minute resolution (two answers in the same minute have lag 0, in the first band).

**Checks.** The expectation rebuilt from the logged ability and scoring record matches the logged Expected within 0.01
on every row with a record (corals 1,255 / 1,255, fish 2,355 / 2,355), so the guess rate (`kOf`), the recall and the
logged memory offset are read as the game used them, and the logit swap needed no skipped row. The replayed bucket and
the logged offset agree on every coral row (0 disagreements); on the fish, 5 rows logged no offset on a photo the log
shows as seen and 3 logged one on a photo the log shows as new (8 of 2,355: the app's `s.ps` and the log differ a
little, likely answers from before sign-in or another device). The script also applies the record's scale `s` in the
swap (x' = x + s · (f − f')), which the declared formula leaves out; `s` is absent or 1 on all 3,610 records, so the
swap is the declared one. Today's offsets used for the swap: corals 0 / +0.35 /
−0.68 / −1.17 (`photoMemOf` on this read; the same as the Q351 studies), fish the prior 0 / −0.5 / −0.5 / −1.5.

**Primary rows: those with a scoring record** (corals from 2026-11-06 on; fish every row). Answers on a seen photo:
corals 139.7 of 1,255 (11%), fish 79.0 of 2,355 (3%). Their lag: corals median 48 hours (25% under 5 hours, 10% under
3 minutes), fish median 8 minutes (75% under 13 minutes).

| Lag band | Corals: answers on a seen photo (share, players) | Fish: answers on a seen photo (share, players) |
| --- | --- | --- |
| < 10 min | 22.5 (16%, 8) | 46.0 (58%, 7) |
| 10 min-1 h | 10.5 (8%, 3) | 21.0 (27%, 6) |
| 1 h-1 day | 7.0 (5%, 2) | 7.0 (9%, 2) |
| 1-7 days | 69.8 (50%, 6) | 5.0 (6%, 2) |
| > 7 days | 29.8 (21%, 1) | 0 |
| Bands with ≥ 30 answers from ≥ 3 players | 1: **stop** | 1: **stop** |

**The table, corals** (primary: today's bucket model; answers weighted 1/n per photo; differences in parentheses are
under the minimum cell and not read; intervals: player-cluster bootstrap, 2,000 draws):

| Lag band × bucket | Answers | Players | Right % | Expected % | Obs − exp (pts) | 95% interval |
| --- | --- | --- | --- | --- | --- | --- |
| new photo (reference) | 1,115.3 | 11 | 81.4 | 74.8 | +6.6 | +1.6 to +9.8 |
| shown never right, < 10 min | 12.5 | 6 | 92.0 | 62.0 | (+30.0) | too few |
| shown never right, 10 min-1 h | 3.0 | 2 | 66.7 | 67.8 | (−1.1) | too few |
| shown never right, 1 h-1 day | 3.0 | 1 | 66.7 | 64.4 | (+2.2) | too few |
| shown never right, 1-7 days | 24.0 | 6 | 71.5 | 65.5 | +6.1 | −7.5 to +38.1 |
| shown never right, > 7 days | 4.3 | 1 | 76.9 | 70.1 | (+6.8) | too few |
| shown never right, all lags | 46.8 | 8 | 76.9 | 65.0 | +11.8 | +0.1 to +31.2 |
| right once, < 10 min | 10.0 | 5 | 90.0 | 90.0 | (0.0) | too few |
| right once, 10 min-1 h | 7.5 | 3 | 86.7 | 78.8 | (+7.8) | too few |
| right once, 1 h-1 day | 3.0 | 2 | 100.0 | 79.7 | (+20.3) | too few |
| right once, 1-7 days | 37.8 | 5 | 82.4 | 80.9 | +1.4 | −7.2 to +24.9 |
| right once, > 7 days | 21.8 | 1 | 84.0 | 79.1 | (+4.8) | too few |
| right once, all lags | 80.2 | 8 | 84.8 | 81.3 | +3.5 | −3.0 to +16.9 |
| right 2+, all lags (none under 1 h) | 12.7 | 2 | 88.2 | 88.3 | (−0.1) | too few |
| all seen, < 10 min | 22.5 | 8 | 91.1 | 74.4 | +16.7 | −3.5 to +33.3 |
| all seen, 10 min-1 h | 10.5 | 3 | 81.0 | 75.7 | (+5.3) | too few |
| all seen, 1 h-1 day | 7.0 | 2 | 85.7 | 73.3 | (+12.4) | too few |
| all seen, 1-7 days | 69.8 | 6 | 80.7 | 77.0 | +3.7 | −2.9 to +30.1 |
| all seen, > 7 days | 29.8 | 1 | 79.9 | 78.0 | (+1.9) | too few |
| all seen, all lags | 139.7 | 9 | 82.5 | 76.5 | +6.0 | +0.7 to +19.6 |

**The table, fish** (exploratory, as declared):

| Lag band × bucket | Answers | Players | Right % | Expected % | Obs − exp (pts) | 95% interval |
| --- | --- | --- | --- | --- | --- | --- |
| new photo (reference) | 2,276.0 | 9 | 87.7 | 81.1 | +6.6 | +3.9 to +8.5 |
| shown never right, < 10 min | 11.0 | 4 | 90.9 | 84.0 | (+6.9) | too few |
| shown never right, 10 min-1 h | 1.0 | 1 | 100.0 | 88.8 | (+11.2) | too few |
| shown never right, 1 h-1 day | 1.0 | 1 | 100.0 | 84.2 | (+15.8) | too few |
| shown never right, 1-7 days | 1.0 | 1 | 100.0 | 91.1 | (+8.9) | too few |
| shown never right, all lags (none over 7 days) | 14.0 | 5 | 92.9 | 84.9 | (+8.0) | too few |
| right once, < 10 min | 34.0 | 7 | 97.1 | 86.8 | +10.2 | +5.9 to +11.9 |
| right once, 10 min-1 h | 20.0 | 6 | 85.0 | 89.9 | −4.9 | −34.0 to +6.9 |
| right once, 1 h-1 day | 5.0 | 1 | 100.0 | 89.6 | (+10.4) | too few |
| right once, 1-7 days | 4.0 | 2 | 75.0 | 82.6 | (−7.6) | too few |
| right once, all lags (none over 7 days) | 63.0 | 7 | 92.1 | 87.7 | +4.3 | −1.3 to +7.9 |
| right 2+, all lags (1 at < 10 min, 1 at 1 h-1 day) | 2.0 | 2 | 100.0 | 98.0 | (+2.0) | too few |
| all seen, < 10 min | 46.0 | 7 | 95.7 | 86.4 | +9.3 | +2.5 to +12.2 |
| all seen, 10 min-1 h | 21.0 | 6 | 85.7 | 89.8 | −4.1 | −32.5 to +7.5 |
| all seen, 1 h-1 day | 7.0 | 2 | 100.0 | 90.0 | (+10.0) | too few |
| all seen, 1-7 days | 5.0 | 2 | 80.0 | 84.3 | (−4.3) | too few |
| all seen, all lags | 79.0 | 7 | 92.4 | 87.5 | +4.9 | −2.5 to +8.7 |

**Primary test**: corals 1 player with answers on both sides of a bucket (P1, D +9.7 points on 10.3 weighted
answers), fish 1 (P2, +25.7 on 3.0): **cannot test** (6 needed). The declared directions, exploratory: the bucket "shown
never right" split by prior misses holds 6.7 coral answers after 2 or more misses (all at long lag, 50% right against 61%
expected), too few to read.

**Control** (new photos, by the time since the player last answered the same unit): corals 8 players, mean
short − long −0.8 points [−12.5, +10.9], sign-flip p 0.85; fish 4 players, cannot test. With the primary not run, the
control qualifies nothing; it says only that, on new photos, coral answers soon after the same unit are not clearly
better than expected compared with days later.

**Secondary (robustness, every epoch, the logged Expected as it is).** Corals 3,308 answers, 527.3 on a seen photo, in
four bands with 30 or more answers from 3 or more players (so the stop rule would not hold on these rows; < 10 min 35%, 10 min-1 h 13%, 1 h-1 day 16%, 1-7 days 30%, > 7 days 6% with 29.8 answers from 1 player): the
coral repeats at short lag are mostly from the first days (2026-11-01 to 11-05), before the exposure change of #685 and
before the scoring record. The primary contrast still has only 4 players (P1 +12.5, P2 −12.9, P3 +9.5, P4 −33.1
points): cannot test. "Right once" falls with lag (+13.4 / +13.0 / +9.1 / −0.2 points from < 10 min to 1-7 days, 12 /
8 / 6 / 6 players) as the literature predicts, but the logged Expected changed model over those days (no memory term
before sheet v26, 2026-11-03), so the short-lag rows carry an expectation without memory more often: not evidence of a
lag effect, only consistent with one.

**Other readings (exploratory, not part of the decision).**

- New photos beat their expectation by about 6.6 points on both subjects (corals +1.6 to +9.8, fish +3.9 to +8.5): the
  game's expectation is low for everyone, the known calibration gap (overconfidence diagnosis, Q147, Q351), so a seen
  photo's residual is better read against that +6.6 than against 0. Against it, "all seen, all lags" is +6.0 (corals) and
  +4.9 (fish): today's buckets leave nothing large on average.
- The coral "shown never right" offset (+0.35, harder than a new photo) is the only bucket whose answers clearly beat it
  (+11.8 points, interval +0.1 to +31.2, 8 players), the pattern the literature review's §3 point 2 put forward as a
  hypothesis (a time-free bucket mixing a transient boost with persistent difficulty).
- **Why the bands stay empty.** On the corals, the draw already keeps a seen photo from coming back soon (`photoSet`'s
  repeat spreading, and the exposure rules of #685 since 2026-11-06): since the scoring record, 29% of the coral repeats
  come under a day, half at 1-7 days. On the
  fish, repeats are rare and nearly all within the session. So the two subjects each fill one band, and the rows a lag term
  would change most (short lags on corals, long lags on fish) are the rarest.

## What step 2 would need

- **The stop rule cleared first**: at least two lag bands with 30 or more answers on a seen photo from 3 or more players
  each, and the primary test's 6 players with answers on both sides (under 1 h and over a day) of a bucket. At today's
  pace (corals about 140 answers on a seen photo in a week of scored rows, fish about 80) the corals reach 30 in a second
  band only if short repeats come back; the fish need long-lag repeats, which come when players return to a family after
  days.
- **When to look again (proposed after the results; the plan declared a re-run only for "Unclear")**: the same table,
  unchanged (this plan, these scripts' description), at each subject's next 1,000-answer milestone (corals 4,000
  answers, fish 3,000), the cadence of the Analyses report. Until then no lag term.
- Then, as the ROADMAP row has it: recovery on simulated logs with a known lag effect through `eloReplay` (including the
  catch-up bias on "shown never right"), and the real-log comparison buckets against buckets + lag, per player.

## How it was run

- The connector's reply (three ranges, A2:W5669) was saved by the session to its tool-results files, joined in the
  scratchpad, and the names replaced by P1-P15. One deviation from the plan: the labels follow each player's number of
  answers over both subjects (surprise cards left out), not within the subject; they are this study's labels only; the mapping of
  the labels named here (P1-P4) went to the integrator, never into a committed file. The joined copies were deleted after the first run;
  the connector's three reply files stayed in the session's tool-results until the re-run below, and were deleted then
  with every other copy.
- **Re-run**: a second agent rejoined the same three replies on 2026-11-15 (11:45 Manila) and ran the same script,
  primary and `--secondary`, on this branch's `core.js`, after checking that every Time parses (0 of 5,668 failed). Every
  number above came back the same; the fish table above is the full output (the first write-up had merged its sparse
  rows).
- One Node script (scratchpad, about 280 lines, single use, not kept under `tools/`) on this checkout's `core.js`:
  replays each player's history per photo (counts, misses, last show; a revealed hint as a show), builds the photo-cells
  (1/n per photo), rebuilds and swaps the expectation as declared, applies the stop rule, prints the cells with a
  player-cluster bootstrap (mulberry32, seed 1, 2,000 draws), and the per-player contrasts with an exact sign-flip test
  and a t interval. `--secondary` takes the logged Expected as it is.
