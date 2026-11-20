# The sea slug box pass: Opus 5.5 at medium effort, and the judging import takes the box

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

Integrator's call (the lightest configuration that does as well as the reference): the bulk box pass runs on **Opus 5.5 at
medium effort**, as good as Opus high on every figure and the most repeatable, with a random 10% of every batch redone
blind by Opus 5.5 high, and a batch whose agreement falls under 90% looked at again (AGENTS.md "Model choice by
measurement"). Only the photos judged `tile` true get a box in the game; a doubt is no box.

**Open, said plainly:** the preset bar (`THRESHOLD.md`: at most 2 serious errors in 80) is met by no configuration, Opus 5.5
medium (6 and 6) and the Opus high reference itself (7 and 6) included, so the bar as set cannot separate them, and the
threshold file's own reading rules were not followed to the letter: Opus medium's 91.2% and 92.5% fall in its undecided
88-93% band (a second sample of 40 photos was to be drawn), and "none of the lighter ones passes" would have sent the bulk
to Opus high. A 10% agreement audit against the same reference checks consistency, not accuracy. This record therefore
chooses a model for the pass; it does not wave the bar through: the bulk is run and its boxes imported only on the
integrator's decision (the serious errors of the sample are the cases to read first), and nothing here imports a box.

The judging import accepts the box as the fish's: `bb`, `[left, top, right, bottom]` fractions of the photo, in the judging
file, imported into `suggest.json` `"seaslug"` (where `tools/seaslug_game.py` already reads it); refused when not inside
the photo, narrower or shorter than 2% of it, or cut by the proposed crop.

## Consequences

- `judging/SEASLUG.md` has "The animal's box"; `tools/judging_fish.py` `--subject seaslug` takes `bb` and checks it (the
  2% floor holds for the fish too: their boxes are on a 0.05 grid, so none is affected).
- No box is in this PR: the bulk comes later, from the bulk bench, through the judging files. Nothing changes for players
  until boxes are imported (no record has a tile before).
- A box only ever comes through a judging file and `suggest.json`, never `curation.json` (rule A1).
