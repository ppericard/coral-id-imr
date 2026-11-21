# The fish box pass: Sonnet 5.5 medium, measured on 120 photos, the mimicry pairs first

Date: 2026-11-22. PR: #1426. Rules or docs touched: P1, A1; judging/FISH.md "The fish's box".

## Context

Find the X shows a fish photo as a square tile cut around the fish's box (`bb`, Q321 D4); a species with no boxed photo
cannot be asked there, nor be the mimicry decoy (#1412). On 2026-11-21, 170 of the 662 fish species in play had a tile
and 8,307 photos passing the tile rule waited for a box. REE-202: which model and effort boxes them, and in what order.

## Decision

Pierre, 2026-11-20 06:42 (Q441): «Il faut faire des tests et trouver le modèle/effort le plus léger qui permet de faire le
job proprement»; 06:48-06:50: the strong model is not the truth by itself. Measured without asking him (INTEGRATOR "A
large judging or boxing pass is measured first"), against bars written before any run:

- **Sample 1**: 80 photos whose box was already accepted (a live tile), stratified like the bulk (85% judged candidates,
  12% iNaturalist, 3% FishBase), no framed photo. The reference boxes were looked at by eye first: most are loose (drawn
  on 420 x 315 px sheets, rounded outward), 3 cut the fish (corrected here, below). So the reference is a sanity check
  (IoU >= 0.70), and the errors that matter, a cut fish, are found by a **blind eye check**: every flagged box (off the
  reference, or an edge more than 0.03 inside the runs' median) seen alone at full size, with no run name.
- **One read per photo**: the judge sees one picture, the photo at 1000 px with a labelled 10 x 10 grid, and writes
  `[left, top, right, bottom]` fractions.

| Configuration | Sample 1: agreement, serious (cut) | Sample 2 (40): agreement, serious |
| --- | --- | --- |
| Haiku 5.5 medium | 74/80, **4** (tail lobes, a soft dorsal fin), 2 wrong nulls | not run (failed) |
| **Sonnet 5.5 medium** (run 1, run 2) | **80/80, 0; 79/80, 1** (a tail lobe) | **40/40, 0** |
| Sonnet 5.5 high | 80/80, 0 | not run |
| Opus 5.5 medium | 80/80, 0 | not run |
| Opus 5.5 high | 80/80, 0 | 40/40, 0 |

Sonnet medium's two runs agree on 80 of 80 (IoU >= 0.80); Opus high and Sonnet medium on 79/80 and 40/40. The cap of
serious errors (at most 2 per 80 and at most Opus 5.5 high's count plus 1, i.e. 1) put Sonnet medium's run 2 exactly at
it, the written undecided band, so a second sample of 40 (disjoint, the same strata, its own bars written before) decided:
40/40 and no serious error. **Sonnet 5.5 medium does the bulk** (integrator's process decision, under Q441), the cheapest
that passed; a seeded 5% of each batch is redone blind by Opus 5.5 high, and a wave under 85% agreement is looked at.

**The order** (integrator's calls, easy to correct): the species of the mimicry pairs whose class can have a tile first
(M2, M3, M5: all their photos waiting, 89); then the species with no tile, in `fish.json` order, at most 4 photos each
(1,712 photos in 35 batches of 50, about 12 batches a PR).

**Not in this pass**: M1, M4 and M6's class is their juvenile photos, which the tile rule refuses (flag `j`, Q321 D4), and
M7's are schools (count `s`): no box can give them a tile. Whether the mimicry class's juveniles get tiles is Pierre's
question (REE-202), not decided here.

## Consequences

- `tools/fish_judge.json` `boxes` gets the bulk boxes, wave by wave, with a `passes` entry each; nothing else (no
  `curation.json`, rule A1; no `fish-game.json`: the Candidate photos workflow, which watches `tools/fish_judge.json`,
  gives the photos their `bb`, cuts the tiles `{f}-x.webp` and uploads them to R2).
- Wave 1 (#1426): 84 boxes for the six M2, M3 and M5 species (5 photos left without one: hidden, or cut by the frame);
  drift redo 4 of 4 agree. Three earlier boxes that cut the fish (found by the bench's eye check) are replaced by Opus 5.5
  high's, checked by eye: their tiles are cut again.
- Wave 2 (batches 03-14, #1440): 600 photos of 155 species with no tile, 567 boxed, 33 left without a box (5.5%, tiles
  lost); drift redo 24 of 24 agree.
- Wave 3 (batches 15-26, #1444): 600 photos of 157 species with no tile, 546 boxed, 54 left without a box (9.0%, tiles
  lost); drift redo 22 of 24 agree (both disagreements Sonnet's "no box" where Opus 5.5 high boxed).
- Wave 4 (batches 27-37, #1448): 512 photos of 142 species with no tile, 440 boxed, 72 left without a box (14.1%, tiles
  lost); drift redo 20 of 22 agree (both disagreements Sonnet's "no box" where Opus 5.5 high boxed).
- Recovery (#PR5): Opus 5.5 high redid the 159 photos of waves 2-4 left without a box, blind to Sonnet's answers, under a
  rule written before the run. It boxed 41 and left 118 without one: **on the hardest photos, Sonnet 5.5 medium's "no
  box" was right 74% of the time** (by Opus 5.5 high's answer). Every one of the 41 was looked at blind: 28 ok, 7 unsure,
  5 two fish, 1 cut. The rule's safeguard (more than a quarter failing) triggered at 13 of 41 (31.7%); the integrator
  shipped the 28 that passed (integrator's call, easy to correct), each having passed the blind check on its own.
- The bench, its threshold files and every run stay in the session's scratch folder; the figures are here and in the PR.
