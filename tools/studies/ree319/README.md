# REE-319: specimen overlap between practice and the reserve (study scripts)

Read-only study tools for Linear REE-319 (the study note: `docs/reviews/2026-11-27-specimen-overlap.md`). They change
nothing in the app, the sheet or the rules, fetch nothing and send nothing anywhere. Every input is a committed file;
none is private. The outputs hold counts and photo file names only (observer names are compared, never written).

- `units.js`: each subject's units as the app builds them. Inputs: `fish.json`, `fish-photos.json`, `fish-game.json`,
  `seaslug.json`, `seaslug-game.json`, `curation.json` (fish and sea slugs: `core.js` treeGen, treePhotos, `app.js`
  treeGenera, as `tests/reserve.test.js` builds them; Pierre's ★ covers and featured photos passed as covers, as
  `tools/ratedworld.js` does for the fish); `data.json`, `curation.json`, `forms.json`, `picks.json`, `quality.json`
  (corals: `tools/ratedworld.js` coralUnits, the `d` that `app.js` reserveOn splits).
- `overlap.js`: the reserve of 100 seeded player ids (`ree319-audit-0` … `-99`) through `core.js` reserveOf itself,
  and for each reserved observation the practice photos that share a file, a source picture, a near-duplicate pair
  (`data/dups.json`), an iNaturalist observation, a lecture slide, an observer's upload session, an observer or a
  generic source page; the reserved observations left clean at each tier. `--out` (outside the repository) writes the
  aggregates and the candidate pairs as JSON.
- `fixture.js`: the issue's controls on a synthetic unit of 45 specimens (identifier kept, identifier left out, unique
  files, a shared generic page), through `core.js` reserveOf.

Not reproduced: `app.js` treeCurate (the cards as the app chooses them; the covers here are Pierre's picks only), the
sheet's runtime overrides, player-specific data. Observation dates and places are not in the committed files, so the
session proxy reads the observation id's closeness instead.

    node tools/studies/ree319/fixture.js
    node tools/studies/ree319/overlap.js --seeds 100 --out /tmp/ree319.json
