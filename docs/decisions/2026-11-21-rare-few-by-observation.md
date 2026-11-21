# The draw's few easiest before Open Water are counted by observation the draw can show, not by photo

Date: 2026-11-21. PR: #0000. Rules or docs touched: LEARNING.md "Rarely under ease 4 before Open Water".

## Context

An RA reported a remora photo in the fish quiz, "Seen this photo like 5 times in five minutes" (Reports tab,
2026-11-21). The answer log shows 7 Remoras questions in 14 minutes, about 20 questions apart: one on an ease-1 photo,
then the same two photos in turn, 3 times each. Remoras is one species with 35 game photos, 2 adults at ease 4-5, a
juvenile at ease 4 and the rest at ease 3 or under. Before Open Water the photos under ease 4, or under the family's 3
easiest when it has fewer, make at most 10% of the draw (`RARE`). The 3 easiest were counted by photo, so the juvenile,
which the draw holds back until Open Water, set the bar at 4: the two adults took about 90% of the questions, however
often they had been seen, and the window of the last 10 questions (#1093) never held a photo shown 20 questions earlier.

## Decision

The `RARE.FEW` easiest are counted over the observations the draw can show at full weight, each by its easiest such
photo: a variant still held back and a second photo of one observation are no easy observation of their own. The rule
itself (Pierre, 2026-11-06 14:17, "No wall: before Open Water a photo under ease 4 may come, but rarely"; `RARE.SHARE`
0.1, Q252) is unchanged; this fixes how its fallback for a family with few easy photos counts them. Integrator's call,
easy to correct. Pierre, 2026-11-21 18:12, on the RA's feedback: «Être sûr qu'on a assez de diversité dans les photos
pour certains genres ou familles qui typiquement sont couverts par très peu d'espèces».

## Consequences

- With the whole pool, Remoras is the one unit whose bar moves (fish families, sea slug genera; the corals have no
  judged ease): from 4 to 3, its easy observations from 2 to 12. A player's own reserve can take an easy observation out
  of practice, so for some players other thin families move the same way.
- The real app, a player under Open Water asked Remoras once every 20 questions: 7 questions showed 2.8 distinct photos
  before (the most shown 3.9 times, the two adults 89%), 6.7 after (the most shown 1.3 times).
- Families with 3 or 4 easy observations still rotate those before Open Water (Flying gurnards, Tunas and mackerels,
  Trumpetfishes, Eel-tailed catfishes); more easy photos for them come through the candidate pipeline (REE-189's second
  part), not through the draw.
- Test: `tests/rareease.test.js` "the few easiest are observations the draw can show".
