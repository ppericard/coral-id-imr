# A family the game covers with few species gets at least 90 candidate photos

Date: 2026-11-21. PR: #1379. Rules or docs touched: docs/spec/fish-photos.md "The cap, weighted by phases", "Automatic
refill"; the review docs/reviews/2026-11-21-photo-diversity.md.

## Context

An RA found many near-repeats on families covered by one or two species (remoras, Pierre also named the
scorpionfishes). The candidate cap is per species (Q36: 30, +10 a phase, at most 60), so a one-species family held
about 40 photos when the median family holds 181. iNaturalist still has hundreds of usable observations for most of
them: the cap was the limit.

## Decision

Pierre, 2026-11-21 18:12: «Être sûr qu'on a assez de diversité dans les photos pour certains genres ou familles qui
typiquement sont couverts par très peu d'espèces. Donc en fait, il faudrait rajouter dynamiquement des photos pour des
familles qui globalement ont très peu d'espèces.»

- The species of a teaching entry share at least `FAMILY_FLOOR` (90) photos: 90 for one species, 45 each for two, the
  cap of Q36 when larger. The value is the integrator's call, easy to correct: three species' base cap, one constant,
  and it only adds candidates.
- Two fixes that follow, also the integrator's call:
  - An exhaustion record keeps the cap it was made under, so a raised cap opens the species again.
  - The refill counts only adult photos as easy observations, as the draw does before Open Water (#1376).

## Consequences

- `tools/fetch_fish.py` `FAMILY_FLOOR`, `family_cap`, `pick_short`, `easy_obs`; test `tests/familyfloor.test.js`.
- The refill run of this PR brought 872 candidates for 17 species. 206 were judged here: 125 sure adds, 9 of them
  easy adults. The rest wait for the routine judging pass.
- A family with 2 easy adults or fewer rotates many photos before Open Water, one with exactly 3 only those 3 (the
  review's "The cliff"). The judging of the 2-easy families waits for the integrator's choice on `RARE.FEW`.
