# A species short of easy adults may take faved candidates beyond its cap

Date: 2026-11-23. PR: #1487. Rules or docs touched: docs/spec/fish-photos.md "Candidates from iNaturalist",
"Automatic refill"; extends [the most-faved-first refill](2026-11-23-easy-refill-faves.md); the cap of Q36 holds for
every other observation.

## Context

The most-faved-first order of the refill only decides what fills a species' room. The thin species short of easy
adults were at their cap, mostly with unjudged candidates in the neutral order, so the order changed nothing for them.
The first judging batch (#1483: Remoras and Stargazers, 140 photos) gave 3 easy adults.

## Decision

Pierre, 2026-11-23 17:22, on letting faved candidates past the cap: «Dans un deuxième temps si le jugement ne rempli
pas assez». 18:37: «on y est au "deuxième temps" c'était après la première étape.»

- In a refill run with `--beyond-cap` (below), a species short of easy adults (`easy_obs` < `easy_need`) may hold, beyond its cap, `BEYOND_PER` (3)
  room per easy adult observation it lacks, at most `BEYOND_MAX` (30, one base cap), counted as the cap counts
  (`obs_cost`): `beyond_cap`. Only faved observations (`faves_count` > 0) not annotated juvenile take it (`faved`),
  the most-faved first, with the same searches, buckets, licences, Research Grade and presence rules. Nothing is
  removed when the shortfall shrinks; a wink entry's species keeps `WINK_CAP`.
- Those candidates carry `bc: 1` and are counted apart (`species_room` `bonus`), so the bonus never eats the room under
  the cap nor a phase's reservation that FishBase or a later run may still fill (Codex review on #1487).
- 3 and 30 are the integrator's call, easy to correct: about one faved observation (a few photos) per missing easy
  adult, so the judging pass gets one or two tries at each, and a family that stays short never grows by more than
  one base cap.
- **An opt-in run, not a recurring one** (integrator's call under rule W27, easy to correct): the room beyond the cap
  is filled only by a refill run by hand, `fetch_fish.py --refill --beyond-cap`, when the integrator decides. The
  scheduled refill (the Candidate photos workflow) never takes it. It is never remembered as searched to the end:
  each `--beyond-cap` run searches it again (`pick_short` never skips a species with room beyond the cap in such a
  run). Pierre's words describe a second stage after the judging, not a standing loop.
- **Why the cut:** a first design kept the room beyond the cap in the weekly refill, with a `faves` part in the
  exhaustion memory so a species would not be searched again every week. Codex found a gap in that shortcut four
  rounds in a row (a `free` record standing for `faves` with phase room reserved, an allowance grown by an ease
  corrected down, room freed by a rejected `bc` candidate). Each fix added bookkeeping. Rule W27: the recurring part
  left the PR rather than being bounded further. The `faves` records made on 2026-11-23 were removed from
  `tools/fish_refill.json` (their `free` and phase parts kept).
- `--topup` never completes an observation taken beyond the cap (`bc`): those are fetched since the old limit of 4
  photos, and completing one would pass the bound and lose the mark.

## Consequences

- `tools/fetch_fish.py` `BEYOND_PER`, `BEYOND_MAX`, `beyond_cap`, `faved`, `species_room` (`bonus`), `record` (`bc`),
  `fill`, `run`, `shortness`, `pick_short`, `refill` (`--only`, `--beyond-cap`), `topup`; tests `tests/easyrefill.test.js`.
- The species short of easy adults keep their room beyond the cap until an integrator runs `--beyond-cap` again.
- The new candidates wait for the judging pass like any other.
