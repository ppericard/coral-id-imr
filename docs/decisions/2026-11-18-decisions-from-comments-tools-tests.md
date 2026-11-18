# Decisions found in the comments of tools/ and tests/

Date: 2026-11-18. PR: the comment cleanup of `tools/` and `tests/`. Rules or docs touched: W19.

## Context

The comments of `tools/` and `tests/` carried dated quotes of Pierre and the decisions they made, beside the code they
shaped. The cleanup rewrote those comments to say what the code does now (rule W19: history stays in git and the PRs).
Each quote or decision found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided,
and where it lives in the code.

## Decisions

- 2026-11-01: "lighter photos for the slow connections common in the Philippines". Decided the four sizes of every
  site photo (1600, 960, 480, 240 px WebP), the app picking the smallest that covers each box. `tools/photos.py` `SIZES`.
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
