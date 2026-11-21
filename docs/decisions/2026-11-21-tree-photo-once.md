# One tree-game builder: the sea slugs' photos in play are the fish's, one photo once across every list

Date: 2026-11-21. PR: #1405. Rules or docs touched: S1; P3; tools/fish_game.py `in_play`, `record`; tools/seaslug_game.py; docs/reviews/2026-11-19-admin-one-engine.md §5 step 13.

## Context

Step 13 of the admin one-engine study (Pierre, 2026-11-20 05:53: «l'admin doit être le même ou presque le même pour l'ensemble des matières») put `seaslug_game.py` on `fish_game.py`'s functions. Its first part (#1381) shared the photo rules; the photos in play and the records stayed the sea slugs' own, because the fish's `in_play` never plays the same photo twice across its candidate lists and the sea slugs' lists (a species' and a genus-level one) did not apply that rule, so moving them needed a choice.

## Decision

The sea slugs follow `in_play` (one engine, rule S1): integrator's call, easy to correct (REE-14). `in_play` and `record` serve every tree subject: the subject's part of the curation, its sure rule, its candidate lists in the order they are read and the units an add may name are parameters; the sea slugs add their own record fields (`gl`, `bb`, `r`), keep their cap and their R2 step. The species' lists are read first (by circle and rank), then the genus-level ones. The candidate route also keeps out, for both subjects, a photo whose count in force is other species one could take for its subject (`other_out`, Pierre's tag first: rule P3), as `core.js` `treePhotoIn` does "whatever the route".

## Consequences

- On the real inputs nothing changes: 3,014 sea-slug photos in play before and after, the same records, byte for byte (`--check`); no photo sits in more than one of the 272 candidate lists; the fish's `plan()` is identical.
- Edge cases, none present today (made-up inputs, old and new code): a photo in a species' list and a genus-level list plays once, for the species, or nowhere when that species has too few photos to play (the dedupe comes before the cap and the start); the genus's next photo takes its place. Pierre's phase choice on a sea-slug photo sets its phase, and a candidate's source life stage gives one when neither he nor the judge did (the fish's `phase`); the cap still counts juveniles by the juvenile flag of the tags. A photo he moves is still named after its new unit's own name (iNaturalist's, as the sea slugs' candidates and sheets; the fish's records take the WoRMS accepted name). A fish candidate he tagged k or m without deciding on it is no longer downloaded (the app never played it).
- Tests: `tests/treegame.test.js`.
