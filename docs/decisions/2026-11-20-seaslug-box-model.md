# The sea slug box pass: Opus 5.5 medium, decided by a second sample, and the judging import takes the box

Date: 2026-11-20. PR: #1295. Rules or docs touched: S1, A1; judging/SEASLUG.md "The animal's box", tools/judging_fish.py, tests/seaslugjudge.test.js.

## Context

Find the X for the sea slugs (decision of 2026-11-20, PR #1284) needs the animal's box on each photo whose tags pass the
sea slugs' tile rule (2,132 of the 3,014 photos in play). Nothing carried one, and the judging import refused the field.
Which model and effort should box 2,132 photos, and how do the boxes come in?

## Decision

Pierre, 2026-11-20 06:42: «Il faut faire des tests et trouver le modèle/effort le plus léger qui permet de faire le job
proprement». Measured on a sample of 80 photos against a gold set (the two Opus 5.5 high runs and Sonnet 5.5 high run 1,
disagreements adjudicated), each configuration judged twice, box agreement = IoU >= 0.85 (or both no box):

| Configuration | Box vs gold | Tile vs gold | Serious errors (of 80) | Repeatability box / tile |
| --- | --- | --- | --- | --- |
| Opus 5.5 high (gold members: runs 1, 2) | 90.0, 93.8% | 91.2, 93.8% | 7, 6 | 93.8 / 95.0% |
| **Opus 5.5 medium** (runs 1, 2) | **91.2, 91.2%** | **92.5, 92.5%** | **6, 6** | **97.5 / 97.5%** |
| Sonnet 5.5 high (run 2) | 87.5% | 91.2% | 9 | 86.2 / 88.8% |
| Sonnet 5.5 medium (runs 1, 2) | 88.8, 87.5% | 91.2, 87.5% | 10, 12 | 90.0 / 91.2% |
| Haiku 5.5 medium (runs 1, 2) | 78.8, 80.0% | 83.8, 86.2% | 18, 16 | 90.0 / 92.5% |

The model of the bulk pass is decided by a rule written before the data, not by the first sample alone (integrator's process decision):

- **Sample 1 (80 photos, the table above).** The first bar (`THRESHOLD.md`: at most 2 serious errors in 80) is met by no
  configuration, the Opus high reference included (7 and 6), so it cannot tell a candidate from the reference. Opus 5.5
  medium's 91.2% box and 92.5% tile fall in `THRESHOLD.md`'s undecided band (88-93%), which calls for a second sample of 40
  photos, not a choice by a point.
- **Sample 2 (40 photos, drawn at random, seeded, disjoint from the first).** Its own bar, `THRESHOLD2.md`, was written
  before any of it was judged, replacing the serious-error bar by one the reference can meet. Opus 5.5 medium (two runs)
  passes if, for each run, box and tile agreement with gold are at least 90%, serious errors do not exceed the larger of
  the two Opus 5.5 high runs' plus 1, and its two runs agree with each other on at least 90% of boxes and of tiles.
- **Sample 2's result.** 40 photos, disjoint from sample 1; gold: 36 consensus, 4 adjudicated blind by Opus high. Opus 5.5
  medium run 1: box 100%, tile 100%, 1 serious error; run 2: box 97.5%, tile 97.5%, 3 serious errors. The serious-error cap
  is 3 (the larger of Opus high's runs, 2 and 1, plus 1). Repeatability of Opus medium: 97.5% on boxes and on tiles (Opus
  high's: also 97.5%). Sonnet 5.5 high: 92.5% and 4 serious errors (a gold member, not tested). Verdict under
  `THRESHOLD2.md`: **meets**. One photo (s31) was boxed by all five runs unlike the adjudicator's box.
- **Then.** Opus 5.5 medium does the bulk (2,132 photos), with a random 10% of every batch redone blind by Opus 5.5 high and
  any batch under 90% agreement looked at. No other reading of the figures is used.
- **The bulk result (2026-11-20).** All 22 batches (2,132 photos) were judged by Opus 5.5 medium, each passing
  `check_out.py`. Merged: 2,078 boxed, 2,064 of them with `tile` true (imported as `bb`), 14 boxed but with another slug in
  the tile's square (no `bb`), 53 no box (cut by the frame, two animals, hidden, outline not traceable), 1 photo never
  fetched (`seaslug-325414-cand-2557629`, batch 21: no box, no tile). Drift redo (Opus 5.5 high, blind, 213 photos, 10% of
  every batch, seeded): 205 of 213 agree (96.2%); batch 08 fell to 80% (8 of 10; in both disagreements medium said no box
  where high boxed), so, under `THRESHOLD2.md`'s "any batch under 90% looked at", Opus high redid all of batch 08 (its
  medium output is kept as `bulk-08-medium.json` in the bench); then 207 of 213 agree (97.2%) and no batch is flagged.
  The boxes are imported by the data PR that carries this paragraph (judging files, `suggest.json`, `seaslug-game.json`),
  and nowhere else (rule A1).

A 10% agreement audit against the reference checks consistency, not accuracy, which is why the model is decided by the
samples and the audit only catches drift. Only the photos judged `tile` true get a box in the game; a doubt is no box.

The judging import accepts the box as the fish's: `bb`, `[left, top, right, bottom]` fractions of the photo, in the judging
file, imported into `suggest.json` `"seaslug"` (where `tools/seaslug_game.py` already reads it); refused when not inside
the photo, narrower or shorter than 2% of it, or cut by the proposed crop.

## Consequences

- `judging/SEASLUG.md` has "The animal's box"; `tools/judging_fish.py` `--subject seaslug` takes `bb` and checks it (the
  2% floor holds for the fish too: their boxes are on a 0.05 grid, so none is affected).
- The boxes are in the judging files (2,064 photos, 265 species, 232 with four or more) and in `seaslug-game.json` as
  `bb`; the tiles (`xc`) are cut by the next R2 run (the Candidate photos workflow), and Find the X is drawn for the sea
  slugs as they exist.
- A doubt on the box alone (`unsure: ["bb"]`) withholds the tile only: `tools/seaslug_game.py` `sure()` uses the shared
  `fish_game.unsure()`, as the fish and `autosort.js` do, so the photo stays in the ordinary games.
- A box only ever comes through a judging file and `suggest.json`, never `curation.json` (rule A1).
