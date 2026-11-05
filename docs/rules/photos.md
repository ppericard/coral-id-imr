# Photo rules

Pierre's standing rules on photos: sources, views, what games may show, credits. Pierre's curation choices
(`curation.json`) are in [admin.md](admin.md) (rule A1). Specs: [ARCHITECTURE.md](../ARCHITECTURE.md) "Photos",
"Photos per context", "Share-alike coral photos". The index of every rule is in
[AGENTS.md](../../AGENTS.md#the-rules).

### P1

**Photo priority in every context: IMR lecture photos first, then Pierre's own (iNat user `ppericard`), then other
iNaturalist observers and Coral Finder book photos only to fill gaps.** Covers and the first 3 ("featured") photos per
view: IMR before Pierre's. IMR photos are never auto-rated Poor and never auto-excluded. Exception: the Coral ID Key
mixes sources on purpose for variety.
- **Corals only, with a caveat**: IMR lecture photos stay preferred for corals (few alternatives), but their provenance
  is uncertain: many are not IMR's own (from iNaturalist or the web without a proper source); trace them and credit or
  replace where the rights are unclear (ROADMAP). **Fish never use IMR slide photos** (most are not IMR's own, likely
  from ID books; photos with known rights abound); diagrams and figures are our own drawings.
- **Licences of candidates** (corals aligned with the fish): CC0, CC BY or CC BY-NC only, never share-alike (nor ND);
  the share-alike coral photos already on the site are Pierre's to keep or remove (admin To do › Share-alike), never
  removed automatically.
- **Trusted identifications**: in the Philippines tiers, an observation identified by iNaturalist user `thamnasteroid`
  (by far the top identifier of stony corals there) at the genus or below is accepted, like a genus-level community ID,
  when no other current identification disagrees (a coarser one on the same line, e.g. the observer's "Stony corals",
  does not); abroad stays Research Grade and the presence rule C8 (`tools/fetch_local.py` `LIC`, `EXPERTS`;
  ARCHITECTURE.md "Share-alike coral photos").

*Why (inferred):* the IMR course is the reference (rule C1); photos with clear rights where they abound.
*Source:* Pierre, by 2026-11-01; caveat and fish, 2026-11-04; licences and `thamnasteroid`, 2026-11-05 (#568).

### P2

**Three views per genus: colony, close-up and corallites (macro).** Close-up is a 10-30 cm part of a colony (code
name `medium`, labelled "Closer" before 2026-11-01). A genus may have 2 levels: colony + close-up (its macro photos,
also labelled "Close-up"); never duplicate a photo to fill a view. Cover = mid-distance view, never macro.
*Source:* Pierre, by 2026-11-01 (2 levels, 2026-11-01).

### P3

**Never use photos showing several corals in games** (`p.multi`; Pierre can clear a wrong mark with curation
`single`). **Coral Finder book photos** (© R. Kelley / BYOGUIDES, `gen[g].book`) are **never in games**; on a genus sheet
they appear only when Pierre pins one, or to fill a gap after every field photo; the Coral ID Key adds up to 3 approved
ones for variety; Pierre can switch them off site-wide (admin, curation `book: false`). **IMR lecture photos are game
photos** (since #227) and count in admin Coverage › Games. "Poor" means identifiable but low visual quality
(ReefCloud-like): Poor photos are in games, last in each view's list, and the players' answers rate how hard each one is
(the hand-made Easy / Medium / Hard sets went on 2026-11-03); unidentifiable photos are excluded, not rated Poor.
*Why (inferred):* a game question must have one right answer; the book's photos are copyrighted.
*Source:* Pierre, by 2026-11-01.

### P4

**All photos of one game question come from ONE observation (same colony).** Never top up a missing zoom level with
another colony: a colony with one view becomes a single-view question.
*Source:* Pierre, 2026-11-01.

### P5

**Provenance tags never on thumbnails; credit in the lightbox.** In games, once the answer is out, every photo shows a
small clickable source pill (`photoSrc()` in `app.js`: observer + iNat link, or IMR lecture / Coral Finder label), never
before the answer (it would give the genus away); hidden on phones, where the enlarged view carries the clickable
source. Before the answer the enlarged quiz photo credits its author by name only, no taxon and no link (`blindCredit()`
in `app.js`).
*Source:* Pierre, 2026-11-01; the blind credit, 2026-11-03.
