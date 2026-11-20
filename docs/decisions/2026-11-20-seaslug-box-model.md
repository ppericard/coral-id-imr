# The sea slug box pass: the model decided by a second sample, and the judging import takes the box

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

The model of the bulk pass (2,132 photos) is decided by a rule written before the data, not by the first sample alone:

- **Sample 1 (80 photos, the table above).** The first bar (`THRESHOLD.md`: at most 2 serious errors in 80) is met by no
  configuration, the Opus high reference included (7 and 6), so it cannot tell a candidate from the reference. Opus 5.5
  medium's 91.2% box and 92.5% tile fall in `THRESHOLD.md`'s undecided band (88-93%), which calls for a second sample of 40
  photos, not a choice by a point.
- **Sample 2 (40 photos, drawn at random, seeded, disjoint from the first).** Its own bar, `THRESHOLD2.md`, was written
  before any of it was judged, replacing the serious-error bar by one the reference can meet. Opus 5.5 medium (two runs)
  passes if, for each run, box and tile agreement with gold are at least 90%, serious errors do not exceed the larger of
  the two Opus 5.5 high runs' plus 1, and its two runs agree with each other on at least 90% of boxes and of tiles.
- **Then.** If it passes, Opus 5.5 medium does the bulk, with a random 10% of every batch redone blind by Opus 5.5 high and
  any batch under 90% agreement looked at; otherwise Opus 5.5 high does the bulk. No other reading of the figures is used.
  Sample 2's figures are added to this record when they are in; until then the model is not decided and no bulk runs.

A 10% agreement audit against the reference checks consistency, not accuracy, which is why the model is decided by the
samples and the audit only catches drift. Only the photos judged `tile` true get a box in the game; a doubt is no box.

The judging import accepts the box as the fish's: `bb`, `[left, top, right, bottom]` fractions of the photo, in the judging
file, imported into `suggest.json` `"seaslug"` (where `tools/seaslug_game.py` already reads it); refused when not inside
the photo, narrower or shorter than 2% of it, or cut by the proposed crop.

## Consequences

- `judging/SEASLUG.md` has "The animal's box"; `tools/judging_fish.py` `--subject seaslug` takes `bb` and checks it (the
  2% floor holds for the fish too: their boxes are on a 0.05 grid, so none is affected).
- No box is in this PR: the bulk comes later, from the bulk bench, through the judging files. Nothing changes for players
  until boxes are imported (no record has a tile before).
- A box only ever comes through a judging file and `suggest.json`, never `curation.json` (rule A1).
