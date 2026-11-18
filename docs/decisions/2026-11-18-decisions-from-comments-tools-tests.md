# Decisions found in the comments of tools/ and tests/

Date: 2026-11-18. PR: #1127. Rules or docs touched: W19.

## Context

The comments of `tools/` and `tests/` carried dated quotes of Pierre and the decisions they made, beside the code they
shaped. The cleanup rewrote those comments to say what the code does now (rule W19: history stays in git and the PRs).
Each quote or decision found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided,
and where it lives in the code.

## Decisions

- 2026-11-01: lighter photos for the slow connections common in the Philippines (paraphrased). Decided the four sizes of every
  site photo (1600, 960, 480, 240 px WebP), the app picking the smallest that covers each box; the app stays fluid on
  a poor connection. `tools/photos.py` `SIZES`; checked by `tests/net.smoke.js`.
- 2026-11-02: players never reload by hand. Decided that a new version, once it has taken over in the background,
  reloads the page at the next page change. Checked by `tests/net.smoke.js` (check 9).
- 2026-11-04: "a non-statistician must understand it at a glance". Decided the plain reading of every Analyses effect
  (`analysis.js` `plainOf`), checked by `tests/analysis.test.js`.
- 2026-11-08: "il faut faire tous les 1000, mais pour le nombre de réponses dans le mode de jeu". Decided that each
  subject's analyses are refitted every 1000 answers of that subject, counted apart in the sheet's head
  (`tools/analyses.js` `headCount`), checked by `tests/analysis.test.js`.
- 2026-11-06 14:02: "don't limit ourselves: the goal is a maximum of good photos to complement the weaker ones on
  iNaturalist". Decided no cap per species on the fish reference photos: the judging decides which play.
  `tools/fish_refs.py` `INAT_MAX`, `FB_MAX`.
- 2026-11-08: "4-5 very good reference photos" for a species met only on the surprise cards; extended on 2026-11-15
  (Q372) to the game data, not only the admin's target. `tools/fish_game.py` `WINK_KEEP`, `tools/fetch_fish.py`
  `WINK_CAP`.
- 2026-11-06, on #611: "a trainer who knows the Acroporidae but not the Merulinidae". Decided the `spotty` simulation
  profile (expert on some IMR lecture groups, hardly on the others), to check a rule that borrows from the global level
  on the genera the player does not know. `tools/learnprof.js` `spotty`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
