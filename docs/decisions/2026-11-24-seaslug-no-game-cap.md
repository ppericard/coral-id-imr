# The sea slugs have no game cap: every photo judged sure plays, as the fish's

Date: 2026-11-24. PR: #1540. Rules or docs touched: S1 (cited, unchanged); docs/spec/seaslugs.md, docs/spec/admin-tree.md,
judging/SEASLUG.md; lifts the game cap of [Q377](../ANSWERS.md) (Pierre, 2026-11-15); follows
[the sea slugs' every photo](2026-11-24-seaslug-every-photo.md).

## Context

`tools/seaslug_game.py` put at most 12 photos a species or genus list in play (`photoTarget.gameCap`, Q377: «oui à
tout»), plus 5 juveniles for a species with a documented juvenile form. The fish have no such cap: every candidate judged
sure plays (`tools/fish_game.py` `in_play`). The photo capacity study (REE-272, PR #1535) found that 239 of the 271 sea
slug units sat exactly at 12 and that 2,074 photos, already judged sure, waited behind the cap; it asked Pierre (Q-a)
whether to remove it as for the fish. The difference was a per-subject value with no reason written down (rule S1).

## Decision

Pierre, 2026-11-24 14:47 Manila, on Q-a («Le plafond de 12 des nudibranches dans le jeu : le supprimer, comme pour les
poissons ?»): «oui» (REE-272).

- The sea slug game build has no cap: every candidate judged sure plays, for a species and for a genus-level list. Every
  other filter stays: the judgement (`best` or `alt`, no unsure field, never `dup`), egg and Dead rules, licences,
  Pierre's removals, exclusions and moves, `start` (a species with fewer than 6 photos has none in play yet).
- The documented juvenile form's limit stays as it was: a species with a documented juvenile form (only *Hexabranchus
  lacer* today) plays at most `perJuvenileForm` (5) juveniles; every other species plays all its sure juveniles, after
  the adults. Pierre's «oui» was on the study's option, which measured 2,074 photos with this limit kept; lifting it too
  would add 2 more photos. It is a per-subject difference left open, listed in the PR.
- Downloads to R2 happen in the project's normal workflow after the merge (Candidate photos, `SEASLUG_R2`), never from a
  session. That workflow's push trigger lists `curation.json`, `data/suggest.json` and the fish files, not
  `tools/seaslug_game.py` nor `seaslug-game.json`: the merge does not start it, so the new photos play from iNaturalist
  (`r: 1`) until its next run (a Publish, a judging merge, the weekly run, Wednesday 03:47 Manila, or a manual dispatch
  by the integrator).

## Consequences

- `tools/seaslug_game.py` `build` (`kept`), `seaslug-game.json` (3,014 photos in play, 5,088 after: +2,074; the first
  3,014 unchanged and in the same order), `tools/seaslug_source.json` and `tools/seaslugs.json` (`photoTarget.gameCap`
  removed), `tests/seaslug-game.test.js`, `tests/seaslugadmin.test.js`, `judging/SEASLUG.md`, `docs/spec/seaslugs.md`,
  `docs/spec/admin-tree.md`.
- The admin's Candidates target for the sea slugs (`SUBJECTS` `admin.target`, 12) was equal to the game cap. It stays 12
  as the queue's own target, as the fish's `TREET`, and no test ties it to the game any more. Its comment in `core/subjects.js`
  (and its copies in `core.js` and `Code.gs`) still says "the game's cap": corrected with the next change of
  those files, which carries the sheet script's version (rule D3).
- About +0.48 GB on R2 (232 kB a photo, the study's mean), to about 8 GB.
