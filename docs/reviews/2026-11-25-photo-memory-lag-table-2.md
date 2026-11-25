# Photo memory against the time since the last show: the lag table at the milestone (REE-101, 2026-11-25)

Read-only study for Linear [REE-101](https://linear.app/reef-id/issue/REE-101) (Q317, Pierre 2026-11-09; ROADMAP
"Photo memory that fades with time"): the lag table of [2026-11-15](2026-11-15-photo-memory-lag-table.md) run again at
the subjects' next 1,000-answer milestone (corals 4,000, fish 3,000: the gate met on 2026-11-25, coral 4,021 and fish
3,527 answers by the integrator's count, REE-101's comment). Does a photo's memory fade with time, by how much, and
what does that mean for the app's photo-memory model? It changes nothing in the app, the sheet or any engine value.

## Plan, declared before looking at the data

Written and pushed before the Answers tab was read for this study (rule L11).

**The method is the 2026-11-15 plan, unchanged**: its data rules (subject rows, surprise cards and photo-less rows left
out, trusted players by `core.js` `trustOf`), the history replay (photos of the Photos column and a revealed corallites
hint `h` as shows; same-minute rows in sheet order), the five lag bands, the 1/n weighting of multi-photo questions, the
primary expectation (today's bucket model by the logit swap, on the rows with a scoring record, after the 0.01 / 95%
rebuild check), the secondary (the logged Expected on every row), the table and its player-cluster bootstrap (2,000
draws, seed 1), the minimum cell (20 answers, 3 players), the stop rule, the primary test (per-player short < 1 h <!-- effort-ok: a lag band -->
against long ≥ 1 day contrast D, stratified by bucket; t interval and exact sign-flip; 6 players needed), the declared <!-- effort-ok: a lag band -->
directions, the outcomes (Stop, Shown, Absent at the literature's size, Unclear, Opposite), the unit-recency control
and what the table can conclude. They are not repeated here; that note is the plan.

**Declared now, before the read** (what differs or is added):

1. **Scripts kept.** The 2026-11-15 script stayed in a scratchpad and is gone. It is rewritten from that note's
   description as `tools/studies/ree101/lag.js` (on this checkout's `core.js`), with `pseudo.py` (the REE-255
   pseudonymiser). Outputs kept there are aggregates only, with no player label.
2. **Reproduction first (blocking).** Before any new number is read, the script runs on this extract cut at the
   2026-11-15 read's last answer (2026-11-13 16:40 Manila), with that study's offsets (corals 0 / +0.35 / −0.68 / −1.17),
   and must give back its published counts: 5,668 answers, corals 3,308 of 15 players and fish 2,355 of 9, 139.7 and
   79.0 primary answers on a seen photo, the lag-band counts of its first table, and its "all seen, all lags" cells. A
   mismatch is found and explained before the fresh run (a row added later to that period, if any, is named).
3. **Offsets for the swap.** Corals: `photoMemOf` on this read's coral rows (what the sheet serves now). Fish:
   `MEM.PRIOR` (0 / −0.5 / −0.5 / −1.5), since the app still uses the prior for every subject but the corals
   (`model.js` `pmem`, `SUBJECTS` `offsets`; the fish offsets design, REE-55, is not built). The same for the sea
   slugs.
4. **Sea slugs.** Run the same way if their log has rows, exploratory as the fish were; no decision rides on them.
5. **Fish.** The 2026-11-15 plan made the fish exploratory "unless it passes the stop rule and the minimum players";
   kept as is: if the fish pass both, their test is read like the corals'.
6. **How much (exploratory, uncorrected).** Beside D in points, the same per-player contrast in logits (each answer's
   residual on the logit scale of x': right minus σ(x') divided by σ(x')(1 − σ(x')), averaged as D is), so a size can
   be set against the literature's 0.3-0.7 logits; and the "all seen" observed − expected per lag band, the table's own
   rows. Neither changes the verdict.
7. **The Photos column.** Shows are counted as the engine counts them (`eloReplay`: every photo of the Photos column,
   and the record's `h`). Before #1529 (2026-11-24) the column could hold a corallites hint that stayed closed; the
   engine counts it as a show, and so does this table (the bucket the app scored with is the logged `f`, and the
   bucket / `f` disagreement count of the plan reports how often they differ).
8. **Record fields added since.** The rebuild check reports how many records carry a format offset `o` or a slope `s`
   other than 1; the swap uses x' = x + s · (f − f') as the 2026-11-15 script did. If the check fails the 95% bar, the
   reason is found before the table is read.
9. **The extract.** The Answers tab, columns Name, Time, Genus shown, Right, Mode, Photos, Expected, Ability, Choices,
   Subject and Scoring only, read through the Sheets connector (unformatted values), read-only, pseudonymised at once
   (P1, P2… by first appearance; the map never written); every raw copy deleted at the end. Its newest row time is
   reported, and its per-subject counts are set against the integrator's (coral 4,021, fish 3,527).

## Results

The plan above was pushed as `34c24a5f` (07:06 UTC, 15:06 Manila) before the tab was read (the connector's replies
came at about 15:07 Manila). The results below were computed after that, with the plan unchanged in substance. Two
`effort-ok` markers were added to its plan paragraph afterwards, so that the effort-figure check reads its two lag bands as
lag bands, not effort figures; the words are unchanged. One analysis was added after the results and is labelled post hoc.

### Verdict

- **Corals: Unclear.** The stop rule no longer holds: two lag bands now have 30 or more answers on a seen photo from 3
  or more players. Both are long lags: 1-7 days has 84.7 answers from 7 players, and over 7 days has 64.3 from 5. The
  primary test still cannot run. Only **2 players** have answers on a seen photo at both short lag (under 1 hour) and
  long lag (a day or more) within the same bucket, and the test needs 6. The plan's outcome is "Unclear": no lag term
  now, and the table runs again at the next milestone. <!-- effort-ok: lag bands -->
- **Fish: Stop.** Only one band qualifies (under 10 minutes: 54 answers from 8 players, 53% of the repeats). No lag
  term, and step 2 does not start. <!-- effort-ok: a lag band -->
- **Sea slugs: Stop.** There are 5 answers on a seen photo, all from one player and all under an hour.
- **Does a photo's memory fade with time?** The log still cannot say, either way. Nothing in it contradicts the
  literature. On the corals, answers on a seen photo beat the time-free expectation most at under 10 minutes
  (+15.6 points, 9 players). Days later they beat it about as much as new photos do. That pattern is what fading
  would produce, but it compares different players and different buckets, so it does not show a fade. <!-- effort-ok: a lag band -->
- **By how much?** This is post hoc, not declared, and exploratory. Pooled over players and stratified by bucket, coral
  answers at under 1 hour beat expectation by **+5.7 points** more than those at a day or more. The 95% player-cluster
  bootstrap interval is −10.6 to +15.8. The literature's effect (Pelánek 2015) is about 5 points at our success rates.
  This interval holds that size, no effect at all, and twice that size, so it cannot pin a size. The fish's +18.8
  points (−20.2 to +32.3) rests on 11 answers at a day or more and says nothing. <!-- effort-ok: a lag band -->

### Data

The Answers tab was read through the Google Sheets connector on 2026-11-25 at about 15:07 Manila. The sheet was found
by an exact-title Drive search, and the read was read-only. Three ranges were read: A:G, I:L and R:W. Only Name, Time,
Genus shown, Right, Mode, Photos, Expected, Ability, Choices, Subject and Scoring were kept; the other columns in those
ranges were blanked at once by `pseudo.py`, which also replaced the names. The extract holds 7,726 rows of 15 players,
and its **newest row is 2026-11-25 14:58 Manila**. By subject, with surprise cards left out:

- corals: 4,021 answers of 15 players, 1,968 of them with a scoring record (the primary rows, from 2026-11-06);
- fish: 3,527 answers of 9 players, every one with a scoring record;
- sea slugs: 168 answers of 2 players (1 trusted).

The coral and fish counts match the integrator's gate count. Every Time parses (0 failures), and it has minute
resolution. Every coral and fish player is trusted by `trustOf`.

### Checks

- **Reproduction (blocking, passed).** On this extract cut at 2026-11-13 16:40, with the offsets of 2026-11-15, the
  rewritten script gives back the earlier study's figures:
  - 5,668 rows; corals 3,308 answers of 15 players; fish 2,355 of 9;
  - 139.7 and 79.0 answers on a seen photo;
  - every lag-band count;
  - every cell's answers, players, right % and expected %;
  - the primary contrasts (+9.7 and +25.7 points, one player each);
  - the control (−0.8 points, −12.5 to +10.9, p 0.85);
  - the bucket / logged-offset disagreements (0 on the corals; 5 + 3 on the fish).

  The point estimates match exactly; the bootstrap interval ends do not always. On well-filled cells they agree within
  about half a point (new coral photos +2.0 to +9.6 here, +1.6 to +9.8 then). On cells with few players and skewed
  per-player values they differ by up to 9 points:
  - corals "shown never right, all lags": +0.2 to +35.0 here, +0.1 to +31.2 then;
  - corals "all seen, all lags": +0.8 to +21.3 here, +0.7 to +19.6 then;
  - fish "right once, 10 min-1 h": −42.8 to +7.6 here, −34.0 to +6.9 then. <!-- effort-ok: a lag band -->

  The seed alone moves those ends by up to 4 points here (seeds 1, 2 and 3, and 20,000 draws), so they are good only to
  a few points. The rest of the gap means the old script resampled somewhat differently. Its code is lost, so how it
  differed cannot be checked. No row has been added to that period since. Output:
  `tools/studies/ree101/out_repro.txt`.
- **Today's offsets, checked.** On the same cut without `--mem`, `photoMemOf` on the script's rows gives back
  0 / +0.35 / −0.68 / −1.17, the offsets of 2026-11-15. So the offsets of this read come from a path that has been
  checked.
- **Expectation rebuild.** The rebuild from the logged ability and the scoring record matches the logged Expected
  within 0.01 on every primary row: corals 1,968 of 1,968, fish 3,527 of 3,527, sea slugs 165 of 165. No row was
  skipped in the swap. 1,592 coral and 1,251 fish records carry a format offset `o`, and the rebuild matches without
  it, since the logged e is the expectation before the format offset. No record has a slope `s` other than 1.
- **Bucket against the logged offset.**
  - Corals: 7 rows logged no offset on a photo the log shows as seen.
  - Fish: 6 rows logged no offset on a photo the log shows as seen, and 3 logged one on a photo the log shows as new.
  - The app's `s.ps` and the log differ a little. Since 2026-11-15 there are 7 new coral rows of this kind, possibly
    a closed hint counted as a show before #1529 (a guess, not checked).
- **Today's offsets for the swap.**
  - Corals: 0 / +0.38 / −0.70 / −1.20, from `photoMemOf` on this read.
  - Fish and sea slugs: the prior, 0 / −0.5 / −0.5 / −1.5.

### Where the repeats fall (primary rows)

| Lag band | Corals: answers on a seen photo (share, players) | Fish: answers on a seen photo (share, players) |
| --- | --- | --- |
| < 10 min | 29.3 (14%, 9) | 54.0 (53%, 8) | <!-- effort-ok: a lag band -->
| 10 min-1 h | 17.5 (9%, 4) | 27.0 (27%, 8) | <!-- effort-ok: a lag band -->
| 1 h-1 day | 10.0 (5%, 3) | 9.0 (9%, 3) | <!-- effort-ok: a lag band -->
| 1-7 days | 84.7 (41%, 7) | 9.0 (9%, 3) | <!-- effort-ok: a lag band -->
| > 7 days | 64.3 (31%, 5) | 2.0 (2%, 2) | <!-- effort-ok: a lag band -->
| Total | 205.8 of 1,968 answers (10%) | 101.0 of 3,527 (3%) |
| Bands with ≥ 30 answers from ≥ 3 players | 2: the stop rule does not hold | 1: **stop** |

- Coral repeats have a median lag of 75 hours (25% under about a day, 10% under 6 minutes). Fish repeats have a median of
  9 minutes (75% under 19 minutes). <!-- effort-ok: lags -->
- Since 2026-11-15 the corals added 66 repeats, almost all at long lag. The over-7-days band grew from 1 player to 5.
  The short bands barely grew (under 1 hour: from 33.0 to 46.8). <!-- effort-ok: lag bands --> The draw mostly keeps a seen coral photo away for a day or more
(`photoSet`'s repeat spreading and the exposure rules of #685): 28% of coral repeats come within a day. So the
short-lag side of the test fills slowly. On the
fish, almost every repeat comes within a session.

### The table, corals

The expectation is today's bucket model. Answers are weighted 1/n per photo. A difference in parentheses is under the
minimum cell and is not read. Intervals come from a player-cluster bootstrap with 2,000 draws.

| Lag band × bucket | Answers | Players | Right % | Expected % | Obs − exp (pts) | 95% interval |
| --- | --- | --- | --- | --- | --- | --- |
| new photo (reference) | 1,762.2 | 12 | 81.4 | 74.9 | +6.5 | +3.0 to +8.8 |
| shown never right, < 10 min | 14.5 | 8 | 93.1 | 61.9 | (+31.2) | too few | <!-- effort-ok: a lag band -->
| shown never right, 10 min-1 h | 6.0 | 3 | 66.7 | 65.1 | (+1.6) | too few | <!-- effort-ok: a lag band -->
| shown never right, 1 h-1 day | 4.0 | 2 | 50.0 | 62.4 | (−12.4) | too few | <!-- effort-ok: a lag band -->
| shown never right, 1-7 days | 26.8 | 7 | 74.5 | 64.7 | +9.8 | −2.9 to +39.4 | <!-- effort-ok: a lag band -->
| shown never right, > 7 days | 14.3 | 4 | 72.1 | 59.3 | (+12.8) | too few | <!-- effort-ok: a lag band -->
| shown never right, all lags | 65.7 | 9 | 75.9 | 62.8 | +13.1 | +6.1 to +25.6 |
| right once, < 10 min | 14.8 | 6 | 86.5 | 86.2 | (+0.3) | too few | <!-- effort-ok: a lag band -->
| right once, 10 min-1 h | 11.5 | 4 | 91.3 | 80.9 | (+10.4) | too few | <!-- effort-ok: a lag band -->
| right once, 1 h-1 day | 5.0 | 3 | 100.0 | 79.8 | (+20.2) | too few | <!-- effort-ok: a lag band -->
| right once, 1-7 days | 49.8 | 6 | 84.6 | 82.1 | +2.5 | −5.7 to +21.2 | <!-- effort-ok: a lag band -->
| right once, > 7 days | 44.3 | 5 | 87.6 | 82.5 | +5.1 | +2.0 to +9.9 | <!-- effort-ok: a lag band -->
| right once, all lags | 125.5 | 10 | 87.1 | 82.5 | +4.6 | −1.1 to +11.4 |
| right 2+, all lags (none under 1 h) | 14.7 | 3 | 89.8 | 87.0 | (+2.7) | too few | <!-- effort-ok: a lag band -->
| all seen, < 10 min | 29.3 | 9 | 89.8 | 74.2 | +15.6 | −0.1 to +29.9 | <!-- effort-ok: a lag band -->
| all seen, 10 min-1 h | 17.5 | 4 | 82.9 | 75.5 | (+7.4) | too few | <!-- effort-ok: a lag band -->
| all seen, 1 h-1 day | 10.0 | 3 | 80.0 | 73.0 | (+7.0) | too few | <!-- effort-ok: a lag band -->
| all seen, 1-7 days | 84.7 | 7 | 82.9 | 77.6 | +5.3 | −1.9 to +25.4 | <!-- effort-ok: a lag band -->
| all seen, > 7 days | 64.3 | 5 | 82.9 | 77.1 | +5.8 | +1.5 to +22.7 | <!-- effort-ok: a lag band -->
| all seen, all lags | 205.8 | 11 | 83.7 | 76.5 | +7.2 | +2.5 to +14.9 |

### The table, fish

Exploratory, as declared. Cells with no answers are left out; the full output is in `out_primary.txt`.

| Lag band × bucket | Answers | Players | Right % | Expected % | Obs − exp (pts) | 95% interval |
| --- | --- | --- | --- | --- | --- | --- |
| new photo (reference) | 3,426.0 | 9 | 87.8 | 81.8 | +6.1 | +4.1 to +7.7 |
| shown never right, all lags | 16.0 | 7 | 93.8 | 84.7 | (+9.0) | too few |
| right once, < 10 min | 40.0 | 8 | 97.5 | 88.0 | +9.5 | +5.7 to +11.5 | <!-- effort-ok: a lag band -->
| right once, 10 min-1 h | 25.0 | 7 | 88.0 | 90.5 | −2.5 | −26.4 to +7.5 | <!-- effort-ok: a lag band -->
| right once, 1 h-1 day | 7.0 | 2 | 100.0 | 87.9 | (+12.1) | too few | <!-- effort-ok: a lag band -->
| right once, 1-7 days | 8.0 | 3 | 75.0 | 84.4 | (−9.4) | too few | <!-- effort-ok: a lag band -->
| right once, > 7 days | 1.0 | 1 | 0.0 | 91.5 | (−91.5) | too few | <!-- effort-ok: a lag band -->
| right once, all lags | 81.0 | 9 | 91.4 | 88.5 | +2.9 | −3.7 to +6.7 |
| right 2+, all lags | 4.0 | 3 | 100.0 | 98.3 | (+1.7) | too few |
| all seen, < 10 min | 54.0 | 8 | 96.3 | 87.8 | +8.5 | +2.9 to +11.8 | <!-- effort-ok: a lag band -->
| all seen, 10 min-1 h | 27.0 | 8 | 88.9 | 90.0 | −1.1 | −19.6 to +8.4 | <!-- effort-ok: a lag band -->
| all seen, 1 h-1 day | 9.0 | 3 | 100.0 | 88.6 | (+11.4) | too few | <!-- effort-ok: a lag band -->
| all seen, 1-7 days | 9.0 | 3 | 77.8 | 85.2 | (−7.4) | too few | <!-- effort-ok: a lag band -->
| all seen, > 7 days | 2.0 | 2 | 50.0 | 89.8 | (−39.8) | too few | <!-- effort-ok: a lag band -->
| all seen, all lags | 101.0 | 9 | 92.1 | 88.2 | +3.8 | −2.5 to +7.4 |

### Tests

**Primary test.**

- Corals: 2 players have both sides, with per-player D of +5.9 points (12.0 weighted answers) and +9.6 points (10.3).
  **Cannot test**, since 6 are needed. Both values are positive, in the literature's direction.
- Fish: 1 player (+25.7 points on 3.0 answers). Cannot test.
- Sea slugs: 0 players.

**Declared directions** (exploratory, corals). The "shown never right" bucket at 1 earlier miss is 22.6 points above
expectation at under an hour (20.5 answers, 8 players). At a day or more it is 13.5 points above (33.0 answers, 8
players). After 2 or more misses there are 8.2 answers, all at a day or more, at +0.3 points. The short-lag excess
is larger, as the literature predicts, but these are pooled cells, not a per-player test.

**Control** (new photos, by the time since the player last answered the same unit):

- Corals: 9 players, mean short − long +0.5 points (−4.0 to +5.1), sign-flip p 0.78.
- Fish: 6 players, −0.2 points (−15.4 to +15.1), p 0.97.

With the primary test unable to run, the control qualifies nothing. It does say that on new photos a recent answer on
the same genus brings no measurable boost. A session or catch-up effect of the unit is not visible at the size the
test can see (about ±5 points on the corals).

### Secondary (robustness: every row, the logged Expected as it is)

On the corals, 593.5 answers fall on a seen photo, and all five bands qualify. Here the primary contrast has **6
players**: D mean **−10.6 points** (−34.1 to +12.9), sign-flip p 0.31. The individual values, with weighted answers,
are −38.2 (3.5), −33.1 (9.8), −19.0 (10.5), +4.8 (12.0), +9.5 (47.0) and +12.5 (44.0). The two players with the most
answers are both positive. This is neither shown nor absent at the literature's size, so it is Unclear too. Its sign is
the opposite of the literature's, but well inside its uncertainty.

The coral short-lag repeats of these rows are mostly from the first days (2026-11-01 to 11-05). The logged
expectation changed model then: there was no memory term before sheet v26. As on 2026-11-15, these rows cannot carry
the verdict.

"Right once" falls with lag here: +12.9, +13.3, +9.6, +0.6 and +5.9 points from the shortest band to the longest.
"Shown never right" does not: −1.4 in the shortest band, +7.9 in the 1-7 days band. <!-- effort-ok: a lag band -->
The fish rows are the primary rows (all
scored), apart from the expectation used.

### Other readings (exploratory, not part of the decision)

- **New photos beat their expectation by about 6 points** on both subjects (corals +6.5, fish +6.1), the known
  calibration gap. A seen photo's residual is better read against that than against 0. Against it, coral "all seen,
  all lags" (+7.2) and fish (+3.8) leave little on average.
- **The coral "shown never right" bucket may be expected too hard.**
  - Today's offset of +0.38 makes such a photo harder than a new one. Answers on it beat the expectation by +13.1
    points (+6.1 to +25.6, 9 players). On 2026-11-15 it was +11.8 (+0.1 to +31.2, 8 players), but that is not a
    second sample: about 47 of today's 65.7 answers were already in it.
  - Net of the new-photo gap (+6.5) the excess is about 6.6 points. The interval's lower end (+6.1) is below that gap,
    so the excess is not shown (a rough reading: the two intervals are not a proper interval of the difference).
    It appears at long lags too (1-7 days +9.8, over 7 days +12.8, with 4 players in the latter, too few to read), so
    if it is real it is not a lag effect. <!-- effort-ok: lag bands -->
  - The offset is fitted by the sheet's replay against the sheet's own expectation (one level per player). The app's
    logged expectation, which this table swaps, uses the per-genus ability. A misfit between the two would look like
    this. That is a guess, not checked.

## What it means for the app's photo-memory model (recommendation; choosing values is Pierre's, rule L11 level 3)

1. **Keep the time-free buckets; add no lag term now**, on any subject. Every subject's verdict is Stop or Unclear,
   and no engine value changes.
2. **The limit is the draw, not only the volume.** The coral test needs players with repeats of the same photo both
   under an hour and a day or more later. The draw mostly keeps a seen coral photo away for a day or more (28% of
   repeats come within a day), so in twelve days and 700 more answers that went from 1 player to
   2. The fish rarely see a photo again after the session.
   - At this pace the coral test is unlikely to reach 6 players by the next milestone (corals 5,000, fish 4,000).
   - A lag term would change mostly the short-lag coral rows and the long-lag fish rows, which are the rarest. Its
     effect on what the app expects would therefore be small today.
3. **Options for Pierre.**
   - (a) Run the same table at the next milestone. This is cheap, and it is what the plan says for "Unclear".
   - (b) Close step 1 as "not testable under today's draw". The lag table would then be re-run only when the draw
     brings photos back within a session again, for example the short lessons of REE-137.
   - (c) Accept a between-player design for step 2 (buckets against buckets + lag, compared on next-answer log-loss
     per player), which does not need one player on both sides. That is a change to the 2026-11-15 condition for step
     2, so it is his call.

   **My recommendation is (b) with (a) as its cheap check.** Close the lag question for now, keep the scripts, and
   re-run them at the next milestone or after a draw change that brings short repeats back. Whichever comes first
   decides whether the question is reopened.
4. **Separate from lag, weak:** the coral "shown never right" offset may be too hard against the app's own
   expectation (about +6.6 points beyond the new-photo gap, not shown, and largely the same answers as on
   2026-11-15). If it persists at the next milestone, it could be its own small study (rule L12 replay: the offset fitted against the app's
   expectation). It is an input, not a proposal to change `MEM` or the served offsets.

## How it was run

- `tools/studies/ree101/pseudo.py` joined the connector's three replies (saved by the session to its tool-results
  files) into one pseudonymised extract in the scratchpad. It labels players P1, P2… by first appearance and never
  writes the name map. The three reply files were deleted at once.
- `tools/studies/ree101/lag.js`, run on this branch's `core.js`, produced each output file:
  - with `--until 2026-11-13 16:40 --mem coral=0,0.35,-0.68,-1.17 --subjects coral,fish`: `out_repro.*`;
  - with no option: `out_primary.*`;
  - with `--secondary`: `out_secondary.*`.

  The outputs are aggregates only, with per-player contrasts as unlabelled values. The run is read-only and light (a
  few seconds), so no machine slot was needed.
- Deviations from the plan:
  - The size in logits (declared item 6) could not be computed, because the primary contrast had 2 players. The
    script converts a contrast to logits by the mean slope of the expectation, not by the per-answer residual the plan
    named: that residual is unstable where σ(x') is near 1. Logits were reported for the control only (corals +0.05,
    −0.34 to +0.43).
  - The pooled short − long contrast was added after the results (post hoc).
- The pseudonymised extract and every copy were deleted from the scratchpad at the end.
