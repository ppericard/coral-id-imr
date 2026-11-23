# Photo rules

Pierre's standing rules on photos: sources, views, what games may show, credits. Pierre's curation choices
(`curation.json`) are in [admin.md](admin.md) (rule A1). Specs: [ARCHITECTURE.md](../ARCHITECTURE.md) "Photos",
"Photos per context", "Share-alike coral photos"; [spec/photos.md](../spec/photos.md),
[spec/fish-photos.md](../spec/fish-photos.md). The index of every rule is in [README.md](README.md#the-index).

### P1

**A reference photo is chosen on its own objective qualities, for every subject: the reference look (profile, whole
animal, good light, true colours, sharp, large, one animal) and its judged ease.** Its source is a hint and a guarantee
of being evaluated for entry into the base, never a placement criterion: no source priority anywhere, the IMR lecture
photos and Pierre's own (iNat user `ppericard`) included. Reference-route photos (iNaturalist taxon photos, FishBase's
main picture) enter the base first. A photo that strong players cannot identify on its own is never used alone in a
question, in any mode; the answers decide it, never an a priori view rule.
- **No source priority.** A photo is never forced or boosted for who took it, Pierre's own included: the first photos
  a player meets, the covers, the cards and the sheets lead with the easiest, most reference-like photos (the judged
  ease, then the players' ratings), whoever took them; IMR lecture photos and his stay in the pool and come first only
  when they are themselves the easiest (`core.js` `easyRank`). IMR photos are never auto-rated Poor and never
  auto-excluded: they are always evaluated for entry. **A default cover** (a family's or a genus's, any node with leaves,
  when he has picked none) is a photo of its leaf **most seen around the instance's centre by distinct observers**, that
  leaf's easiest reference photo, never a juvenile (`app.js` `seenCover`, `autosort.js` `treeCoverOf`). **One exception for his own photos:** every photo of his that is
  compatible, i.e. a species we show and passing the rules (presence, quality, licence, the judging rubric), must be
  included in the fish photo pool. Never left out, never boosted (the candidates: `tools/fetch_fish.py` `select` takes his
  observations first, within the species' room, then the judging puts them in play; the stopgap's `tools/fish_photos.py`
  `his_ok` until 2026-11-15).
- **Sea slugs: the fish's rule**, his own photos included (Pierre, 2026-11-16, Q386; `tools/fetch_seaslugs.py`
  `--own`, then the judging rubric like any candidate).
- **Fish photos in play are hosted on R2, whatever their route in**: the photos Pierre adds in the admin, the candidates
  judged sure on the rubric and the reference photos judged sure on the same rubric, whatever their reference level, enter
  the same way (`tools/fish_game.py`,
  the Candidate photos workflow); his curation only removes or corrects them.
- **Reference photos first.** Every photo of reference quality, whoever took it, comes first: a reference
  source's own (iNaturalist's taxon cover and taxon-page photos, FishBase's main picture) judged very easy, or any photo
  judged very easy with the reference look (whole fish, side profile, true colours, sharp). They are each list's first
  photos and the covers (of the leaf a default cover shows: above) and the draw favours them, never exclusively (`core.js` `refLevel`, `model.js` `photoSet`).
  **FishBase photos enter the game automatically** when their licence allows (CC BY-NC as FishBase states it), with
  every other game photo rule; several good photos per species, from iNaturalist and FishBase, to complement the weaker
  ones (`tools/fish_refs.py`).
- **Corals, a caveat on the IMR lecture photos** (many are hard to find elsewhere and already curated, so they are
  always evaluated, never placed by their source): their provenance
  is uncertain: many are not IMR's own (from iNaturalist or the web without a proper source); trace them and credit or
  replace where the rights are unclear (ROADMAP). **Fish never use IMR slide photos** (most are not IMR's own, likely
  from ID books; photos with known rights abound); diagrams and figures are our own drawings.
- **Licences of candidates** (corals aligned with the fish): CC0, CC BY or CC BY-NC only, never share-alike (nor ND);
  the share-alike coral photos already on the site are Pierre's to keep or remove (admin To do › Share-alike), never
  removed automatically.
- **Licence, the last tie-break** (every subject): between photos otherwise equal (quality, ease, reference look,
  variety), CC0 / CC BY and Pierre's own come before CC BY-NC, own and open alike (`core.js`
  `rightsRank`, `tools/rights.py`): candidate fetching, the auto-sort's and the swiper's order, default covers and
  featured photos; never a reason to leave a photo out, never above quality, ease or variety (the fish fetch's licence
  came first from 2026-11-03; since 2026-11-08 it is this tie-break there too, `tools/fetch_fish.py` `select`).
- **Corals: trusted identifications**: in the Philippines tiers, an observation identified by iNaturalist user `thamnasteroid`
  (by far the top identifier of stony corals there) at the genus or below is accepted, like a genus-level community ID,
  when no other current identification disagrees (a coarser one on the same line, e.g. the observer's "Stony corals",
  does not); abroad stays Research Grade and the presence rule C8 (`tools/fetch_local.py` `LIC`, `EXPERTS`;
  ARCHITECTURE.md "Share-alike coral photos").

*Why:* the set of reference photos must rest on qualities anyone can check, not on who took the photo; a beginner's first
photos must be easy, near-reference ones, and source priority had filled them with Pierre's own or IMR's; among equals, an open licence grows the stock a later commercial version could use.
*Source:* Pierre, by 2026-11-01; caveat and fish, 2026-11-04; licences and `thamnasteroid`, 2026-11-05 (#568); no
source priority for fish, and every compatible photo of his in the fish pool, 2026-11-06 (Q148); subject-neutral wording, 2026-11-06; fish reference photos first and FishBase in automatically,
2026-11-06; fish photos in play by themselves once judged, hosted on R2 whatever their route in, 2026-11-06 (Q180, Q199); reference photos in like candidates, whatever their
level, 2026-11-08 (Q212); licence as the last tie-break, 2026-11-08 (Q270, Q283), the fish fetch's too, 2026-11-08 (Q284); a default cover from the
leaf most seen around the instance's centre, 2026-11-13 (Q339); his own photos through the candidates once the stopgap
was retired, 2026-11-15 (#931); no source priority for any subject, reference-route photos first, and a photo strong
players cannot identify alone never used alone, 2026-11-18.

### P2

**Corals: three views per genus: colony, close-up and corallites (macro).** Close-up is a 10-30 cm part of a colony (code
name `medium`, labelled "Closer" before 2026-11-01). A genus may have 2 levels: colony + close-up (its macro photos,
also labelled "Close-up"); never duplicate a photo to fill a view. Cover = mid-distance view, never macro.
*Source:* Pierre, by 2026-11-01 (2 levels, 2026-11-01); subject-neutral wording, 2026-11-06.

### P3

**Never use photos showing several organisms to identify in games**: several corals (`p.multi`; Pierre can clear a wrong mark with curation
`single`); fish, several species one could take for the subject (count `k`; other species in view with no risk of confusion, count `o`, may play). **Corals: no book photo anywhere** (the field-guide book's, © R. Kelley / BYOGUIDES): its crops left the app and the
repository on 2026-11-08 (`tests/nobook.test.js`); the book stays a cited source (pages, criteria, look-alikes: rule C2) and the
Coral ID Key's boxes are drawings of their criterion. **Corals: IMR lecture photos
are game photos** (since #227) and count in admin Coverage › Games. "Poor" means identifiable but low visual quality
(ReefCloud-like): Poor photos are in games, last in each view's list, and the players' answers rate how hard each one is
(the hand-made Easy / Medium / Hard sets went on 2026-11-03); unidentifiable photos are excluded, not rated Poor.
*Why:* a game question must have one right answer; the book's photos are copyrighted.
*Source:* Pierre, by 2026-11-01; subject-neutral wording, and several fish species, 2026-11-06 (Q167); no book photo
anywhere, 2026-11-08; fish: other species in view split by the risk of confusion, 2026-11-09 (Q323).

### P4

**A one-photo question shows one observation. A multi-photo format shows different observations, never two photos of
one observation as different choices.** Never top up a missing zoom level with another colony: a colony with one view
becomes a single-view question.
*Source:* Pierre, 2026-11-01; the wording, 2026-11-18 ("ok").

### P5

**Provenance tags never on thumbnails; credit in the lightbox.** In games, once the answer is out, every photo shows a
small clickable source pill (`photoSrc()` in `app.js`: observer + iNat link, or IMR lecture label), never
before the answer (it would give the answer away); hidden on phones, where the enlarged view carries the clickable
source. Before the answer the enlarged quiz photo credits its author by name only, no taxon and no link (`blindCredit()`
in `app.js`).
*Source:* Pierre, 2026-11-01; the blind credit, 2026-11-03; subject-neutral wording, 2026-11-06.

### P6

**Corals: no photo of a coral skeleton anywhere** (a bare skeleton or a specimen, often white on a table, a beach or a
plain background): not in the games, the comparisons, the genus sheets, the Coral ID Key, Memory or Coral basics. A
live colony that is only pale or bleached is not a skeleton. The photos judged by eye are listed in
`judging/skeletons.json`, marked `skel` in the data (`tools/apply_skeletons.py`) and dropped by every reader
(`tests/skeletons.test.js`).
*Why:* the features cannot be seen properly on a skeleton.
*Source:* Pierre, 2026-11-09.

### P7

**No large judging or re-judging pass by agents without Pierre's explicit OK.** A judging pass over many photos
(hundreds or more, or a re-judge of photos already in play) waits for his OK on that pass, with its size and an
estimate of its cost; what can be scripted from the recorded codes is scripted first. Until he says OK, judging
stays on hold and every other decided development work goes first. Small judging needed to finish a decided PR (a
handful of photos) is not a pass.
*Why:* judging by agents spends a large share of the quota, and part of it can often be scripted; he prefers the
quota to go to development and to decide himself when, and how much, judging is worth it.
*Source:* Pierre, 2026-11-23 19:26 Manila: «j'aimerais que tu évites de faire des grosses séries de jugements, de
rejugements sur des milliers, voire des dizaines de milliers de photos, sans mon accord explicite … ça prend
énormément de quotas … je préfère presque qu'on mette en stand-by du jugement jusqu'à ce que je dise OK, ou que je
recentre le jugement … et que par contre on puisse prioriser toutes les autres tâches de développement».
