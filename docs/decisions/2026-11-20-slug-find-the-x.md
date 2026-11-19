# Find the X for the sea slugs: the shared tile code in, no tile yet (no box on any photo)

Date: 2026-11-20. PR: #1284. Rules or docs touched: S1, P1, P4, L4; docs/spec/seaslugs.md, docs/spec/fish-photos.md
"The tiles", docs/LEARNING.md "Find the X", ROADMAP "Every game mode for every subject" and "Find the X",
docs/reviews/2026-11-19-modes-every-subject.md (PR 6).

## Context

Find the X (one name, four photos) is open for the fish and was closed for the sea slugs because
`seaslug-game.json` has no square tile crops (`xc`). The fish's tiles are cut around the animal's box (`bb`, judged
with the rubric: `judging/FISH.md` "The fish's box"). The plan asked first whether the sea slug photos carry a box.

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières,
à toutes les matières. Et oui, c'est du code commun.»

Checked on 2026-11-20: **no sea slug photo carries the animal's box** (0 of 3,014 photos in play have `bb`;
`judging/SEASLUG.md` says "no `bb`" and the judging import rejects the field: `tests/seaslugjudge.test.js`), and no photo carries a usable crop
either (one proposed crop among 5,163 judgements, on a photo not in play; Pierre's sea slug crops in `curation.json`:
none). A proposed crop is framing, not a box around the animal, so it would not have stood in for one.

Built, so that the format opens for the sea slugs as boxes arrive (integrator's calls, easy to change):

- `tools/seaslug_game.py` carries a judgement's `bb` on a record whose tags pass the fish's tile rule and cuts the tile
  with the fish's code (`tools/fish_game.py` `tile_crop`, `tile_write`, `tile_only`: imported, nothing copied) with the
  download, or alone for a photo already on R2 whose box is new or changed; the record then has `xc` or `xn`.
- `app.js` `UNITS` `tiles` is one declaration, `unitTiles`, for the fish and the sea slugs (S1).
- Nothing in `SUBJECTS` `closed` named Find the X, so `core.js` is unchanged; `planFind` already plays it only on a unit
  met and ready with three other units with a tile (L4).

Not built, and why: no box pass (a change of the sea slug judging rubric, decided process), no box invented from the
whole photo, nothing in `curation.json` (A1). The tile rule is the fish's (profile or slight oblique), so it keeps no
dorsal photo, the sea slugs' commonest good view: a sea slug tile rule is to decide with the box pass.

## Consequences

- No change for any sea slug player: no record has a tile, so `planFind` returns nothing and the draw is exactly as
  before (`tests/findx.test.js`).
- Left, in the ROADMAP row "Find the X": the box pass (rubric, then the boxes), a sea slug tile rule, and the R2 run that
  cuts the tiles.
- `tests/seaslug-game.test.js` (the tile made, made alone when the box changes, refused when too small, `--check` stable),
  `tests/findx.test.js` (the sea slugs on the shared engine, `unitTiles`).
