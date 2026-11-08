# Photo rules

Pierre's standing rules on photos: sources, views, what games may show, credits. Pierre's curation choices
(`curation.json`) are in [admin.md](admin.md) (rule A1). Specs: [ARCHITECTURE.md](../ARCHITECTURE.md) "Photos",
"Photos per context", "Share-alike coral photos". The index of every rule is in
[AGENTS.md](../../AGENTS.md#the-rules).

### P1

**Coral photo priority in every context: IMR lecture photos first, then Pierre's own (iNat user `ppericard`), then
other iNaturalist observers only to fill gaps.** Covers and the first 3 ("featured") photos
per view: IMR before Pierre's. IMR photos are never auto-rated Poor and never auto-excluded. Exception: the Coral ID Key
mixes sources on purpose for variety.
- **Fish: no source priority.** A fish photo is never forced or boosted for who took it, Pierre's own included: the
  first photos a player meets, the cards and the sheets lead with the easiest, most reference-like photos (the judged
  ease, then the players' ratings), whoever took them; his photos stay in the pool and come first only when they are
  themselves the easiest (`core.js` `easyRank`). **One exception for his own photos:** every photo of his that is
  compatible, i.e. a species we show and passing the rules (presence, quality, licence, the judging rubric), must be
  included in the fish photo pool. Never left out, never boosted (`tools/fish_photos.py` `his_ok`).
- **Fish photos in play are hosted on R2, whatever their route in**: the photos Pierre adds in the admin, the candidates
  judged sure on the rubric and the reference photos judged sure on the same rubric, whatever their reference level, enter
  the same way (`tools/fish_game.py`,
  the Candidate photos workflow); his curation only removes or corrects them.
- **Fish reference photos first.** Every photo of reference quality, whoever took it, comes first: a reference
  source's own (iNaturalist's taxon cover and taxon-page photos, FishBase's main picture) judged very easy, or any photo
  judged very easy with the reference look (whole fish, side profile, true colours, sharp). They are the covers and each
  list's first photos and the draw favours them, never exclusively (`core.js` `refLevel`, `model.js` `photoSet`).
  **FishBase photos enter the game automatically** when their licence allows (CC BY-NC as FishBase states it), with
  every other game photo rule; several good photos per species, from iNaturalist and FishBase, to complement the weaker
  ones (`tools/fish_refs.py`).
- **Corals only, with a caveat**: IMR lecture photos keep a slight priority for corals (many are hard to find elsewhere
  and they are already curated), but their provenance
  is uncertain: many are not IMR's own (from iNaturalist or the web without a proper source); trace them and credit or
  replace where the rights are unclear (ROADMAP). **Fish never use IMR slide photos** (most are not IMR's own, likely
  from ID books; photos with known rights abound); diagrams and figures are our own drawings.
- **Licences of candidates** (corals aligned with the fish): CC0, CC BY or CC BY-NC only, never share-alike (nor ND);
  the share-alike coral photos already on the site are Pierre's to keep or remove (admin To do › Share-alike), never
  removed automatically.
- **Licence, the last tie-break** (every subject): between photos otherwise equal (quality, ease, reference look, the
  source order above, variety), CC0 / CC BY and Pierre's own come before CC BY-NC, own and open alike (`core.js`
  `rightsRank`, `tools/rights.py`): candidate fetching, the auto-sort's and the swiper's order, default covers and
  featured photos; never a reason to leave a photo out, never above quality, ease or variety (the fish fetch's licence
  came first from 2026-11-03; since 2026-11-08 it is this tie-break there too, `tools/fetch_fish.py` `select`).
- **Corals: trusted identifications**: in the Philippines tiers, an observation identified by iNaturalist user `thamnasteroid`
  (by far the top identifier of stony corals there) at the genus or below is accepted, like a genus-level community ID,
  when no other current identification disagrees (a coarser one on the same line, e.g. the observer's "Stony corals",
  does not); abroad stays Research Grade and the presence rule C8 (`tools/fetch_local.py` `LIC`, `EXPERTS`;
  ARCHITECTURE.md "Share-alike coral photos").

*Why:* for corals, many IMR lecture photos are hard to find elsewhere and are already curated (good quality), hence a
slight priority; for fish, the IMR slides' photos were taken from elsewhere, while well-sourced photos with clear rights
abound; a beginner's first fish photos must be easy, near-reference ones, and source priority had filled them with
Pierre's own; among equals, an open licence grows the stock a later commercial version could use.
*Source:* Pierre, by 2026-11-01; caveat and fish, 2026-11-04; licences and `thamnasteroid`, 2026-11-05 (#568); no
source priority for fish, and every compatible photo of his in the fish pool, 2026-11-06 (Q148); subject-neutral wording, 2026-11-06; fish reference photos first and FishBase in automatically,
2026-11-06; fish photos in play by themselves once judged, hosted on R2 whatever their route in, 2026-11-06 (Q180, Q199); reference photos in like candidates, whatever their
level, 2026-11-08 (Q212); licence as the last tie-break, 2026-11-08 (Q270, Q283), the fish fetch's too, 2026-11-08 (Q284).

### P2

**Corals: three views per genus: colony, close-up and corallites (macro).** Close-up is a 10-30 cm part of a colony (code
name `medium`, labelled "Closer" before 2026-11-01). A genus may have 2 levels: colony + close-up (its macro photos,
also labelled "Close-up"); never duplicate a photo to fill a view. Cover = mid-distance view, never macro.
*Source:* Pierre, by 2026-11-01 (2 levels, 2026-11-01); subject-neutral wording, 2026-11-06.

### P3

**Never use photos showing several organisms to identify in games**: several corals; fish, several species (`p.multi`; Pierre can clear a wrong mark with curation
`single`). **Corals: no Coral Finder book photo anywhere** (© R. Kelley / BYOGUIDES): its crops left the app and the
repository on 2026-11-08 (`tests/nobook.test.js`); the book stays a cited source (pages, criteria, look-alikes) and the
Coral ID Key's boxes are drawings of their criterion. **Corals: IMR lecture photos
are game photos** (since #227) and count in admin Coverage › Games. "Poor" means identifiable but low visual quality
(ReefCloud-like): Poor photos are in games, last in each view's list, and the players' answers rate how hard each one is
(the hand-made Easy / Medium / Hard sets went on 2026-11-03); unidentifiable photos are excluded, not rated Poor.
*Why:* a game question must have one right answer; the book's photos are copyrighted.
*Source:* Pierre, by 2026-11-01; subject-neutral wording, and several fish species, 2026-11-06 (Q167); no book photo
anywhere, 2026-11-08.

### P4

**All photos of one game question come from ONE observation (same colony).** Never top up a missing zoom level with
another colony: a colony with one view becomes a single-view question.
*Source:* Pierre, 2026-11-01.

### P5

**Provenance tags never on thumbnails; credit in the lightbox.** In games, once the answer is out, every photo shows a
small clickable source pill (`photoSrc()` in `app.js`: observer + iNat link, or IMR lecture label), never
before the answer (it would give the answer away); hidden on phones, where the enlarged view carries the clickable
source. Before the answer the enlarged quiz photo credits its author by name only, no taxon and no link (`blindCredit()`
in `app.js`).
*Source:* Pierre, 2026-11-01; the blind credit, 2026-11-03; subject-neutral wording, 2026-11-06.
