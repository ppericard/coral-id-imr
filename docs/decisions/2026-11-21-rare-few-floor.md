# Before Open Water a unit rotates at least its 12 easiest observations' worth, so an easy photo added never shrinks it

Date: 2026-11-21. PR: #1382. Rules or docs touched: LEARNING.md "Rarely under ease 4 before Open Water".

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
- So the rotation holds max(12, the easy observations) observations' worth.
- The rule itself is unchanged: "No wall: before Open Water a photo under ease 4 may come, but rarely" (Pierre,
  2026-11-06 14:17), at most `RARE.SHARE` 0.1 (Pierre, 2026-11-08, Q252).

The fix of something plainly broken, integrator's call, easy to correct (one constant, one function). The context is
Pierre's words of 2026-11-21 18:12 on the RA's feedback: «Être sûr qu'on a assez de diversité dans les photos pour
certains genres ou familles qui typiquement sont couverts par très peu d'espèces».

**Why 12.** It is the rotation #1376 gave Remoras, the RA's case. The families with 12 easy observations or more showed
almost no near repeat in the log (Moorish Idol 1 of 61 answers, Requiem Sharks 0 of 27). It keeps the existing case
of 2 photos at ease 3 and 10 at ease 2, the ease-1 photos still held.

**Why shared, not exactly 12.** Both were measured. Exactly 12 is the only form whose drawn spread never narrows, but it
cuts at merge the families rotating many observations at ease 3 with 0 or 1 easy adult: Snake Eels from 126 to 12,
Garden Eels and Soles from 58, Stingrays from 26, Jawfishes from 19. Shared, those keep their spread. As easy adults
are added, the draw narrows gradually to about the spread of 12 easy observations, never over a cliff.

## Consequences

- Units it changes, with the whole pool and a new player: 19 fish families and 12 sea slug genera with fewer than 12 easy
  observations. Their rotation before Open Water rises to 12 observations' worth, or holds when it was already larger.
- Players see more photos under ease 4 before Open Water in those units:
  - ease 3 where the family has some, ease 2 where it has too few (Stargazers);
  - up to (12 − its easy observations) / 12 of the draw, more once the easy ones are seen.
- The figures are in the PR: the real app on the real data, the harness, and the level-1 run.
- More easy adults still come through the candidate pipeline (REE-189's second part). Each one now takes one place from
  the ease-3 observations and never collapses the rotation.
- Tests: `tests/rareease-floor.test.js`.
