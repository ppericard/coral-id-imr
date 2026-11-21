# Find the X for the sea slugs plays: the boxes and tiles are in, checked on the real tiles

Date: 2026-11-21. PR: #1411. Rules or docs touched: S1; docs/LEARNING.md "Find the X slipped into the fish quiz", docs/spec/seaslugs.md "Find the X".

## Context

REE-66 asked for the animal's box on the sea slug photos so that Find the X is drawn for them (the shared engine of
[2026-11-20-slug-find-the-x](2026-11-20-slug-find-the-x.md), the box pass of
[2026-11-20-seaslug-box-model](2026-11-20-seaslug-box-model.md)). The issue still read "0 of 3,014 in play".

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières,
à toutes les matières. Et oui, c'est du code commun.»

Nothing was left to build: the bulk box pass was imported (#1306: 2,064 photos with `bb`) and the Candidate photos
workflow's R2 run cut the tiles after it. Checked on 2026-11-21: 2,037 photos carry `xc`, in 79 genera (77 with two or more),
and 40 of 40 sampled tiles answer on R2. The engine draws the format as it is. Integrator's call, easy to correct: the
verification stays as a smoke part and a data test so a later change of the sea slug data cannot silently close it.

## Consequences

- `tests/seaslug.smoke.js` part 11 plays Find the X on the sea slug genera; `tests/findx.test.js` "the sea slug data" pins
  the boxes and their tiles (a tile never without a box).
- The docs that said "will play" say it plays. The species of the sea slugs (units by scientific name) are REE-63's.
