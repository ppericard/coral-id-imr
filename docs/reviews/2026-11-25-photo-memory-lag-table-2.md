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
draws, seed 1), the minimum cell (20 answers, 3 players), the stop rule, the primary test (per-player short < 1 h
against long ≥ 1 day contrast D, stratified by bucket; t interval and exact sign-flip; 6 players needed), the declared
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

(After the read.)
