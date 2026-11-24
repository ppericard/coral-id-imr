# Pierre's own observations come in whatever the room, for every subject

Date: 2026-11-24. PR: #1534. Rules or docs touched: P1, S1; docs/spec/tools.md, docs/spec/photos.md,
docs/spec/fish-photos.md; follows [the sea slugs' every photo](2026-11-24-seaslug-every-photo.md) (REE-252), which left
his own observations open, and Q386 (his photos judged like anyone's).

## Context

Rule P1 lets Pierre's own photos in without a boost and judges them like anyone's (Q386). What the fetchers gave them
differed (rule S1): the sea slugs kept room for his observations up to `max` (30) on a full list, the fish took them first
but only within the room the cap leaves (a full list took none), the corals had no search of his own (his observations
came only if they were in the votes-ordered page of a tier, within its cap). REE-252 asked which way to align.

## Decision

Pierre, 2026-11-24 13:50 Manila: «Oui. La seule exception que j'ai demandé pour mes photos c'est qu'elles soient
systématiquement intégrées à la base de données, et puis jugées comme les autres. Mais ça veut effectivement dire que
l'ensemble de mes photos qui remplissent les critères doivent être intégré à l'app et aux jeux, même si on dépasse les
seuils.»

- For every subject, every observation of his that meets the subject's usual criteria (licence, Research Grade or the
  subject's equivalent, egg and Dead filters, a taxon we show) is taken in as candidates with every usable photo, whatever
  the list's room, target or cap, with no ceiling: the sea slugs' `max` (30) does not limit him either.
- They are candidates like any other: unjudged and out of play until judged, then judged on the rubric like anyone's
  (Q386), never boosted.
- They count in the list's room, so a full list takes no other observer's photo.
- The criteria stay each subject's own (the fish and sea slugs take his photo without a licence, the corals only a
  licensed one; the corals' identification rule, Research Grade, a genus-level community ID or the trusted identifier's).
  Only the room is lifted.

## Consequences

- One shared code path: `fetch_fish.select` takes his observations first, free of room, with their cost off the room
  (`own_only`); `fetch_seaslugs.pick` calls it (species, genus-level and no-name lists), so `own_room` and the `max`
  ceiling for him are gone. `fetch_fish.own_prefetch` asks his search for every species, full or not, and `fetch_fish.py
  --own` (which `--refill` runs first) and `fetch_seaslugs.py --own` take his observations only. `fetch_local.py`
  reads his observations of every genus in one search (`own_pool`) and `own_take` takes them before the caps, the
  Key-only need and the `PER_OBS` guard.
- Rule P1 and the specs say it; the first run added the candidates counted in the PR (unjudged, out of play).
- The sea slug lists still have no scheduled refill: his new observations come in by `fetch_seaslugs.py --own` until one
  exists.
