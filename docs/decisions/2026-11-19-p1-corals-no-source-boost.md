# Rule P1 for the corals: no photo placed, ordered or weighted for who took it

Date: 2026-11-19. PR: #N. Rules or docs touched: docs/spec/photos.md "Photos per context", docs/spec/basics.md,
docs/spec/data.md "Photo rights", docs/spec/subjects.md, docs/LEARNING.md "What a question shows", docs/ARCHITECTURE.md
"Photos per context", docs/ROADMAP.md (the corals' photo source priority row, closed).

## Context

Rule P1 says a photo is chosen on its own qualities, never by its source. The fish and the sea slugs followed it, but
the corals' code still ranked by source: IMR lecture photos, then Pierre's own, then other observers in the featured
photos, the sheet and the game lists; an IMR featured close-up as a genus's card photo; × 1.3 in the draw for a
never-seen IMR or own photo (`SUBJECTS` `tiers`); the Coral ID Key's extra photos from other observers only; IMR, then
his own, first in Coral basics' growth-form photos and the Coral ID Key's form photos. A ROADMAP row kept it "for
Pierre to decide".

## Decision

Pierre had decided it (2026-11-19 06:50, docs/ANSWERS.md: "J'ai déjà répondu plein de fois à cette question!!!! On
avait déjà fait des choix."):

- Rule P1 as reworded on 2026-11-18: "No source priority. A photo is never forced or boosted for who took it, Pierre's
  own included … IMR lecture photos and his stay in the pool and come first only when they are themselves the easiest
  (`core.js` `easyRank`)."
- #942 A (2026-11-17): "reference" is "déduit des caractéristiques de la photo, pas un tag": no tag or flag replaces the
  source ranking.

What stays, as P1 allows: an IMR lecture photo is never rated Poor automatically (always evaluated); the licence is the
last tie-break (`rightsRank`); Pierre's own photos are always included in the fish and sea slug pools, never boosted.
Kept too, being about whether an identification is trusted or a suggestion Pierre clicks, not about placement: an extra
genus's photo plays when Research Grade or his own (rule S2), the admin's retire suggestions and the duplicate finder's
"keep" suggestion.

## Consequences

- `core.js` `applySlots` (and its copy in `tools/sync/Code.gs`): one order per genus and view, by quality, Poor last,
  then `easyRank`'s ties (the licence where the order allows it, then a fixed hash of the file name, since `data.json`'s
  lists put his own photos first); the Coral ID Key's 5 extra photos follow it; the view's own list too. Every genus and
  view keeps the same game photos, so no player's progress moves.
- `model.js` `photoSet`: no × 1.3; `SUBJECTS` `tiers` and `app.js` `isCore` are gone.
- `app.js` `cover` and the admin's `coverOf`: Pierre's pick, `data.json`'s stored cover, then the first featured
  Closer photo whatever its source. 15 genera change from an IMR lecture photo to `data.json`'s stored cover: 4 from
  `tools/covers.txt`, 11 from the default an earlier builder stored (10 of them his own photos), an order the code
  cannot see.
- "By quality" is mostly the automatic rating for the IMR lecture photos (114 of 116 in the games, none rated Poor):
  they come first when that rating or Pierre's puts them there.
- The admin's automatic order (`autoOrder`, the featured fill, the Poor warning) mirrors the site's; Coral basics shows
  its growth-form photos in their listed order; the Coral ID Key's form photos follow the game lists' order.
- Specified in docs/spec/photos.md "Photos per context" and docs/LEARNING.md "What a question shows".
