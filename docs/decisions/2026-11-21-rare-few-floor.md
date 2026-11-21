# Before Open Water a unit rotates at least its 12 easiest observations' worth, so an easy photo added never makes a cliff

Date: 2026-11-21. PR: #1391. Rules or docs touched: LEARNING.md "Rarely under ease 4 before Open Water".

## Context

Before Open Water a unit's photos under ease 4 make at most 10% of the draw (`model.js` `RARE`). A unit with fewer than
3 easy observations fell back on a bar at its 3rd easiest, and every observation at that ease rotated. That fallback
had a cliff (#1376, docs/reviews/2026-11-21-photo-diversity.md "The cliff"):

- A family with 2 easy adults rotated every observation at ease 3 or more: Remoras 12 after #1376.
- With exactly 3 it rotated only those 3: on the test harness the most drawn observation took 34%.

So judging a third easy adult for Remoras would have brought back the repeat an RA reported. The candidates of six such
families waited for a fix.

## Decision

`RARE.FEW` becomes a floor of 12 observations: a unit rotates every observation at ease 4 or more, and at least its 12
easiest.

- The observations at the last ease reached share what is left of the 12 equally. Each counts easy for that share and
  hard for the rest (`model.js` `rareHard`).
- So the rotation's weight is max(12, the easy observations) observations' worth, and an easy photo added never lowers it.
- The rule itself is unchanged: "No wall: before Open Water a photo under ease 4 may come, but rarely" (Pierre,
  2026-11-06 14:17), at most `RARE.SHARE` 0.1 (Pierre, 2026-11-08, Q252).

The fix of something plainly broken, integrator's call, easy to correct (one constant, one function). The context is
Pierre's words of 2026-11-21 18:12 on the RA's feedback: «Être sûr qu'on a assez de diversité dans les photos pour
certains genres ou familles qui typiquement sont couverts par très peu d'espèces».

**Why 12.** It is the rotation #1376 gave Remoras, the RA's case. The families with 12 easy observations or more showed
almost no near repeat in the log (Moorish Idol 1 of 61 answers, Requiem Sharks 0 of 27). It keeps the existing case
of 2 photos at ease 3 and 10 at ease 2, the ease-1 photos still held.

**What "never shrinks" can mean.** No rule keeps the drawn spread from ever narrowing while the families rotating many
ease-3 photos keep theirs. At 12 easy observations the unchanged rule rotates about 12; a family with 126 at ease 3 and
no easy adult rotates 126.

- Shared places: the spread narrows gradually as easy adults are added, down to about that of 12 easy observations,
  never over a cliff. Measured in the real app (effective observations: 1 / the sum of the squared draw shares):
  Snake Eels 120 on main, 98 with this rule, 70 with one easy adult; Soles 58, 48, 40.
- Exactly 12 (chosen by ease, then rating): the only form whose spread never narrows, but it cuts at merge Snake Eels
  (126 to 12), Garden Eels and Soles (58), Stingrays (26) and Jawfishes (19), with no new photo. Not taken: the words
  above ask for diversity, and it narrows families that are not at the cliff.

## Consequences

- Units it changes: those with fewer than 12 easy observations at full weight. With the whole pool and a new player,
  19 fish families and 12 sea slug genera.
  - A player's own reserve (`core.js` `RESERVE`: up to 15 observations a unit, never under 30 left) can take a unit under
    12 for that player. Estimated with the reserve taken at random: about 3 fish families more on average (Moorish
    Idol, Requiem Sharks, Scorpionfishes), up to 8 with an unlucky reserve, and no sea slug genus on average.
- In those units players see more photos under ease 4 before Open Water:
  - ease 3 where the family has some, ease 2 where it has too few (Stargazers);
  - up to (12 − its easy observations) / 12 of the draw, more once the easy ones are seen.
- Where many observations share the last places, their hard part fills the 10% share, so the photos under that ease come
  less often: ease 1-2 from 9% to 1% of the draws in a Snake Eels-like family.
- The figures are in the PR: the real app on the real data, the harness, and the level-1 run.
- More easy adults still come through the candidate pipeline (REE-189's second part). Each one now takes one place from
  the ease-3 observations and never collapses the rotation.
- The refill's `EASY_NEED` (3, `tools/fetch_fish.py`) is no longer tied to `RARE.FEW`. A species with 3 easy adults
  counts as supplied there, though the draw's floor is 12.
- Tests: `tests/rareease-floor.test.js`.
