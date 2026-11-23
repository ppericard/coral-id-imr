# A species short of easy adults may take faved candidates beyond its cap

Date: 2026-11-23. PR: #PRNUM. Rules or docs touched: docs/spec/fish-photos.md "Candidates from iNaturalist",
"Automatic refill"; extends [the most-faved-first refill](2026-11-23-easy-refill-faves.md); the cap of Q36 holds for
every other observation.

## Context

The most-faved-first order of the refill only decides what fills a species' room. The thin species short of easy
adults were at their cap, mostly with unjudged candidates in the neutral order, so the order changed nothing for them.
The first judging batch (#1483: Remoras and Stargazers, 140 photos) gave 3 easy adults.

## Decision

Pierre, 2026-11-23 17:22, on letting faved candidates past the cap: «Dans un deuxième temps si le jugement ne rempli
pas assez». 18:37: «on y est au "deuxième temps" c'était après la première étape.»

- In a refill, a species short of easy adults (`easy_obs` < `easy_need`) may hold, beyond its cap, `BEYOND_PER` (3)
  room per easy adult observation it lacks, at most `BEYOND_MAX` (30, one base cap), counted as the cap counts
  (`obs_cost`): `beyond_cap`. Only faved observations (`faves_count` > 0) not annotated juvenile take it (`faved`),
  the most-faved first, with the same searches, buckets, licences, Research Grade and presence rules. Nothing is
  removed when the shortfall shrinks; a wink entry's species keeps `WINK_CAP`.
- 3 and 30 are the integrator's call, easy to correct: about one faved observation (a few photos) per missing easy
  adult, so the judging pass gets one or two tries at each, and a family that stays short never grows by more than
  one base cap.
- The room beyond the cap is a part of the exhaustion memory (`faves`); a fresh `free` record covers it, since it reads
  the same general searches (read to their end, every usable observation is already a candidate).

## Consequences

- `tools/fetch_fish.py` `BEYOND_PER`, `BEYOND_MAX`, `beyond_cap`, `faved`, `fill`, `run`, `ends`, `exhausted`,
  `shortness`, `pick_short`, `refill` (`--only`); tests `tests/easyrefill.test.js`.
- The new candidates wait for the judging pass like any other.
