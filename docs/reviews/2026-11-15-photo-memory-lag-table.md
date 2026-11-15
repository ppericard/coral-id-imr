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
