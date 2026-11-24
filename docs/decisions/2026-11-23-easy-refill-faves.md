# The refill takes the most-faved observations first for a species short of easy adults

Date: 2026-11-23. PR: #1476. Rules or docs touched: docs/spec/fish-photos.md "Candidates from iNaturalist", "Automatic
refill"; docs/spec/data.md "Photo rights"; amends the "no votes order" of Q284 for those species only.
Changed by: [2026-11-23-faved-beyond-cap.md](2026-11-23-faved-beyond-cap.md) (faved candidates beyond the cap).

## Context

Before Open Water the draw rotates a family's easy adult photos (ease 4 or more). Thin families hold few: 12 of the 15
single-species families have fewer than 12 easy observations (median 3). The refill takes candidates in a neutral order
on purpose (Q284): of 206 judged candidates in #1379, about 4% became easy adults
([the review](../reviews/2026-11-21-photo-diversity.md), "Left open").

## Decision

Pierre, 2026-11-23 16:34, to "launch REE-198, the easy-photo refill for families with 1 to 3 species": «oui,
définitivement». The question: for species short of easy adult photos only, may the refill fetch iNaturalist's
most-faved observations first (still Research Grade, still judged on the rubric), instead of the neutral order?

- A species is short of easy adults when it has fewer easy adult observations (`easy_obs`) than `easy_need`:
  `EASY_FAMILY` (12) shared over its family's species as the family floor is (12, 6, 4, then `EASY_NEED`, 3, from four
  species on). 12 is the integrator's reading of the question's context (families with 12 easy observations or more
  showed almost no near repeat); one constant, easy to correct.
- In a refill such a species takes the most-faved first (iNaturalist's `faves_count`), the neutral order only between
  equal faves. Pierre's own first, the presence and distance buckets, the licences, Research Grade, the cap and the
  judging rubric hold. Every other species keeps the neutral order.

## Consequences

- `tools/fetch_fish.py` `EASY_FAMILY`, `easy_need`, `trim` (`fv`), `select` (`faves`), `run`, `shortness`,
  `pick_short`; test `tests/easyrefill.test.js`.
- The order only decides what fills a species' room. On 2026-11-23 the thin species short of easy adults had no room
  left that iNaturalist could fill: each was at its cap (mostly unjudged candidates in the neutral order) or its open
  room was searched to the end. The faves order takes effect as the judging pass frees room, and at each re-check.
