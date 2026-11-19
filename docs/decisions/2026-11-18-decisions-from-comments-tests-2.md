# Decisions found in the comments of tests/ (second pass)

Date: 2026-11-18. PR: #1128. Rules or docs touched: W19.

## Context

The comments of the test files carried dated quotes of Pierre and the decisions they made, beside the checks they
shaped. This second pass of the cleanup (after `2026-11-18-decisions-from-comments-tools-tests.md`) rewrote those
comments to say what each test checks (rule W19: history stays in git and the PRs). Each quote or decision whose words
are found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided, and where it lives.

## Decisions

- 2026-11-08 (Q289): "the covers I chose are all very visible and of reference level". Decided that the first-meeting
  card (`quiz.js` `introCard`) shows his ★ Cover even over a reference-level photo the automatic choice would take.
  Checked by `tests/fishcovers.test.js`.
- 2026-11-08 (Q290), of the Thresher sharks: "we can use my cover for the card". Decided that a wink's surprise card
  (`quiz.js` `winkPhoto`) shows his ★ Cover while in play. Checked by `tests/fishcovers.test.js`.
- 2026-11-08 (Q291): "the covers can go before the mosaic, but in landscape, it must fit well". Decided that Home's
  landscape tiles (`home.js` `tilePhoto`) show his cover only when its shape suits the tile and it shows the whole fish.
  Checked by `tests/fishcovers.test.js`.
- 2026-11-08: "the limit of 4 photos per observation must be lifted for every observation [...] weight the choice so
  as not to bring too many photos of one observation, but never blocking". Decided that every photo of an observation
  is a fish candidate, its first counting 1 against the cap and each further one half (`tools/fetch_fish.py`
  `obs_cost`, `EXTRA_W`; the former cap kept as `OLD_LIMIT` for `--topup`). Checked by `tests/fishphotos.test.js`.
- 2026-11-13: "il faut que tes propositions marchent aussi pour les coraux, ou les nudibranches ou les plantes". Decided
  that the ranks the admin's ★ Cover can set are read from the subject (`admin.js` `fuRanks`, `fuRankOf`), never fixed
  to the fish's. Checked by `tests/fishcovers.test.js`.
- 2026-11-15 (Q381): "the base name is the right one for everyone outside IMR". Decided that iNaturalist's default
  English name comes first whenever it exists, even when it is another species' name, and that no listed name is dropped
  as shared (`tools/fish_common.py`). Checked by `tests/fishcommon.test.js`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
