# Fish sheets

The fish have a sheet per family, genus and species (`SUBJECTS` fish `sheets`; study
[docs/reviews/2026-11-05-fish-sheets-study.md](../reviews/2026-11-05-fish-sheets-study.md), option B): `learn.js`
`viewFishSheet`, read from `fish.json` alone (`core.js` `fishTree`: families, genera, species by id; the families in the
key's order; `go(id)`, the sheet an id opens), so they stand whatever the game's units are. The sea slugs read the same
sheets in their own words ([seaslugs.md](seaslugs.md)). The content the sheets show is built into `fish.json` by
`tools/build_fish.py` ([fish.md](fish.md)); the content editor's edits are laid over it ([content.md](content.md)). This
is the specification of what the code does now; why each part was decided is in
[docs/decisions/](../decisions/README.md) and the PRs. Tests: `tests/fishsheets.test.js`, `tests/fish.smoke.js`.

## The family sheet

**One family sheet per family of the identification key** (`fish.json` `families`, `#fish/learn/family/<id>`), reached
from the families page (each family's name opens its sheet; its photo enlarges) and from My progress:

- the English name, the scientific name or names and IMR's name below, its group in the key;
- my progress on it once the game asks the families (`myProg`);
- the hero photo: Pierre's ★ Cover of the family while in play (`coverP`), else its default cover (`nodeCover`: the
  easiest reference photo, not a juvenile, of its species most seen around the instance's centre, whoever took it;
  [fish.md › The default cover of a node with leaves](fish.md#the-default-cover-of-a-node-with-leaves));
- the IMR cues verbatim with their slides, then its ID marks and lines ([below](#family-id-marks-and-behaviour-habitat-size-lines));
- "Don't confuse with" (`.lrow`, the corals' look-alike cards): IMR's look-alike lines with their source, our lines for
  the pairs IMR gives no words for, then the families players mix it up with (`dataLooks`), with the mix-up count;
- **the genera as rows** (up to 4 photos, one per species most common first, the genus's ★ Cover first when one is
  picked, each species by its ★ cover else its first photo, `spPhoto`; the species count and how many are "opened for
  me", the IMR entry name), each opening its **short genus page** ([below](#the-genus-page)); a family with one genus
  lists its species there;
- the juveniles and phases (IMR's phase lines, the sourced juvenile note, up to 4 juvenile-tagged photos);
- a report link.

Every species list has the **"Opened for me" filter, on each time a sheet opens** (`fishTiles`, a `.seg`, `fishMine`):
a species counts as opened once its family is at Advanced, its scientific genus is met, or its own species unit is met
(`spOpen`). The page bar's previous / next go through the families the families page shows (`fishShown`: every family
on the path, circles 1 to 3, both families of an entry renamed into two; never a wink). A species without a photo shows
the one "No photo yet" drawing (`NOFISH`, `.nofish`).

## The genus page

`fishGenus`, `#fish/learn/genus/<name>`: the genus, its common name when it has one, its family and IMR entry name; my
progress once met; the IMR sub-entry's cues, else its ID marks and presentation; the species WoRMS now puts in another
genus; every species with the filter; "Don't confuse with": the sibling genera IMR gives cues for, then the look-alikes
a source names and those players mix it up with, each with its source (`fishGenusLooks`). The page bar's previous / next
go through its family's genus pages. A genus with one species opens its species' sheet, and the only genus of a family
its family's (`fishTree` `go`); its marks and look-alikes are then shown there.

## The species sheet

`fishSpecies`, `#fish/learn/species/<name>`, opened from a species tile (the whole tile is the link) or a
single-species genus row:

- the scientific name first (the PDF name), its common name, "now … in WoRMS" when WoRMS renamed it;
- its family and genus, "★ IMR most sighted #n", "On the IMR reference list" and "Confirmed near Dauin" or "Not
  confirmed near Dauin" (`present.near`, rule C8's words); its size and depth ([below](#size-and-depth));
- its rank in its family by the commonness index (`cmi`);
- its photos, in `easyRank` order (`fishSpPhotos`, the sheet-only photos included): the first large (its ★ cover, else
  its first adult photo: `spPhoto`; never a juvenile while it has an adult photo), then two more adults, the
  juvenile-tagged ones apart (up to 2), the rest behind "N more photos", each with its credit;
- the other species of its genus; the iNaturalist, WoRMS and FishBase links; previous / next through its genus's
  species.

No photo: the drawing and those links. Not on a species sheet yet: ID marks of its own, phase sections, look-alike
cues of its own.

## Family ID marks and behaviour, habitat, size lines

`tools/fish_sheets.json` (`families` {id: {marks, life, apart {family id: a line}, src [{t, u}]}}), in our own words
from the sources each family lists (the FishBase family summaries for circle 1) and faithful to the IMR cues shown beside
them, is built into `fish.json` families by `tools/build_fish.py` `add_families` (`marks`, `life`, `apart`, `msrc`;
`--regroup` applies an edit offline). The sheet shows them under the IMR tips with their sources and a "Report or correct
a line" link (`learn.js` `fishMarks`), and the `apart` lines on the look-alike cards for the pairs IMR gives no words
for. Where a source differs from IMR, a point goes to `points.json` (rule C5).

**A family IMR gives no cue for** (circles 2 and 3, the Soapfishes) has 1 to 3 ID marks of its own, what to look at on a
photo, each checked against two sources at least (its `src`: FishBase, Fishes of Australia, Reef Life Survey,
iNaturalist, the Australian Museum), in our own words. `app.js` `fishGenera` makes them the family unit's tips (`qt`)
under a label naming those sources (`tl`, "ID marks (FishBase, Fishes of Australia)", never IMR's), so the feedback, the
first-meeting card, the families page and the cards show them where they show IMR's cues.

## Size and depth

`tools/fish_facts.py` reads each species' Reef Life Survey page ("Max Size", "Depth"; a generic User-Agent, one request
every 1.2 s, cached in `tools/.cache/rls/`), then fills the gaps from the FishBase snapshot (`species.parquet`: Length and
its type, the depth range; never its web pages), into `tools/fish_facts.json`; `add_families` builds them into
`fish.json` species (`size` {len, lt, src}, `depth` {m, src}, each `src` the page the value comes from). The species
sheet shows "Up to 10 cm · 1-36 m deep" with the source (`spFacts`; a length type other than total length in words), the
family sheet the range of its species' largest sizes (`famSizes`); nothing is shown for a species neither source gives.

## Genus common names

`tools/fish_genus_names.json` (`genera` {id: {common, from, word}}), only where a widely used one exists: `from: imr`,
the IMR sub-entry naming that genus alone (Anemonefish, Bannerfish, Unicornfish; not Surgeonfish, which names three
genera), or `from: species`, inferred from its species' common names (every one of 2 or more ends in `word`, no species
of another genus of its family does; the page says "inferred from its species' names"), never the genus name itself
(Chromis, Dascyllus). `add_families` checks each and builds it into `fish.json` genera (`common`, `csrc`: its source in
words). Shown under the genus page's scientific name (the source under More details), on the family sheet's genus rows
and on the species sheet's genus chip; the game's typed answers do not read it.

## Genus presentation and ID marks

Every scientific genus in play has a short presentation and its ID cues, sourced. `tools/fish_genus_marks.json` (`src`
{key: {t, u}}, `families` done, `genera` {name: {plain [words, refs], marks [[words, refs]] 1 to 3}}, a ref
`[src key, where in it]`, `none` {name: why no marks}), in our own words, for every genus in play IMR gives no cues for, in every
circle (the surprise cards' families aside), written from the FAO species identification guide for the Western Central
Pacific (vols 3 to 6, 1999 and 2001: each family's key to the genera, or its key to the species where it has none, and the species
accounts) and FishBase species pages (where the guide splits genera by counts only, a visible feature FishBase gives for
the genus's only game species, or for each of them); only features seen on a photo, never a count.

`add_families` (`genus_marks`) builds them into `fish.json` genera (`plain`, `marks`, `msrc` each source once, `mby`
{plain: [msrc indexes], marks: [[…] per mark]}) and stops on a line without a source, a genus with IMR cues (rule C1:
they stay apart), a mark with a number, a line too long, a species named that is not one of its own, or a genus in play
of any circle without a presentation, or with neither marks nor a reason (`--marks`, a hidden flag, points the build at
another file for `tests/genusmarks.test.js`). `app.js` `fishGenera` makes the marks a genus unit's tips (`qt`) under "ID
marks (FAO species guide, FishBase)" (`tl`) and the presentation its card's plain sentence (`plain`, `plainLine`);
`learn.js` `genMarks` shows both, each line with its sources' numbers, on the one sheet the genus opens (as `fishRoot`).
