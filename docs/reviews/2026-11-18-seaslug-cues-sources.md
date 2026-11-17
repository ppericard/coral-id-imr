# Sea slugs: the sources of the ID marks (2026-11-18)

The sources read for the sea slugs' ID marks (study [§9, step 7](2026-11-15-nudibranch-mode-study.md#9-step-plan-pr-sized-reusing-the-fish-tooling);
Pierre, 2026-11-17: "Tu peux compléter tout ce qui manque pour les nudibranches?"). The marks themselves are in
`tools/seaslug_cues.json`, each line with its sources; `tools/seaslug_cues.py` checks them and the build puts them on
`seaslug.json` (ARCHITECTURE "Tools").

Labels (rule W11): **[read]** = taken from the page or the PDF itself; **[not read]** = the page did not open.

## 1. What the marks are

- **A mark is a feature seen on a photo**: the rhinophores, the gills or the cerata, the mantle and its edge, the body
  shape, or the animal on its food. Never a count, never a feature seen only under the animal (the phyllidiids' oral
  tentacles) or inside it (the gut, the radula). Our own words, short (80 characters at most, rule C3), never copied.
- **At the genus first** (the game's units since 2026-11-16), at the family where the feature is the family's.
- **A species is named only when it is one of the genus's game species** (rule C6). The five named, each in
  `tools/seaslugs.json` and so confirmed in the Philippines by rule C8 (Research Grade observers in the Philippines):
  *Goniobranchus kuniei* (124 observers, near Dauin too), *G. geometricus* (155, near Dauin too), *Hypselodoris tryoni*
  (169, near Dauin too), *Thecacera pacifica* (14, near Dauin too), *Phestilla melanobrachia* (39).
- **A genus with no photo feature in the sources read gets no mark**, and its reason in `none`, never a guess.

## 2. Coverage

| | Genera with marks | In `none` |
|---|---|---|
| Circle 1 (24) | 18: *Chromodoris*, *Goniobranchus*, *Hypselodoris*, *Doriprismatica*, *Phyllidia*, *Reticulidia*, *Jorunna*, *Nembrotha*, *Tambja*, *Thecacera*, *Pteraeolidia*, *Phyllodesmium*, *Chelidonura*, *Pleurobranchus*, *Hexabranchus*, *Costasiella*, *Phestilla*, *Melibe* | 6: *Halgerda*, *Ardeadoris*, *Elysia*, *Thuridilla*, *Caloria*, *Coryphellina* |
| Circle 2 (22) | 1: *Phyllidiella* (Brunckhorst's key) | *Phyllidiopsis* (its key couplets are under the animal) |
| Circle 3 (32) | none yet | |

Families with marks: Phyllidiidae, Plakobranchidae (the parapodia, which *Elysia* and *Thuridilla* share), and
Pleurobranchidae.

## 3. The sources used

| Source | Read | What it gave | Note |
|---|---|---|---|
| **Brunckhorst 1993**, *The systematics and phylogeny of phyllidiid nudibranchs (Doridoidea)*, Records of the Australian Museum Supplement 16: 1-107, [doi:10.3853/j.0812-7387.16.1993.79](https://doi.org/10.3853/j.0812-7387.16.1993.79), free PDF from the Australian Museum | **[read]**: "General features" (p. 9) and the "Key to phyllidiid genera" (pp. 25-26) | Phyllidiidae: tough body, hard tubercles, no dorsal gill circlet, gills in the groove under the mantle, contrasting colours. Key couplets 3-5: *Phyllidiella* black rhinophores; *Reticulidia* orange rhinophores and a smooth network of ridges, no tubercles; *Phyllidia* cream to yellow rhinophores, tubercles often compound or in ridges | Couplets 1-2 (oral tentacles fused or separate) and every internal character are not photo features |
| **Johnson & Gosliner 2012**, *Traditional taxonomic groupings mask evolutionary history: a molecular phylogeny and new classification of the chromodorid nudibranchs*, PLoS ONE 7(4): e33479, [doi:10.1371/journal.pone.0033479](https://doi.org/10.1371/journal.pone.0033479) | **[read]**, first 100,000 characters | *Chromodoris*: "This clade includes all of the black-lined species" | Its genus entries are phylogenetic; no other external feature per genus |
| **Sea Slug Forum** (Rudman and contributors, Australian Museum, 1998-2010), the fact sheets at `https://www.seaslugforum.net/find/<code>`: `chroanna`, `chrowill`, `chrokuni`, `mantflap`, `risbtryo`, `glosatro`, `retihalg`, `jorufune`, `nembkuba`, `nembcham`, `tambmoro`, `pteriant`, `phylbria`, `chelamoe`, `pleufors`, `hexasang`, `meliviri`, `thurline` | **[read]**, one page every 2 s, a generic User-Agent | The colour groups of *Chromodoris*; the wide mantle overlap and the mantle flapping of today's *Goniobranchus*; the tall body and the trailing pairs of the former *Risbecia* (today's *Hypselodoris*); the black-rimmed wavy mantle of today's *Doriprismatica atromarginata*; *Reticulidia* against *Phyllidia*; the papillate back of *Jorunna*; the ascidian food of *Nembrotha*, the bryozoan food of every *Tambja*; the farmed zooxanthellae and white juveniles of *Pteraeolidia*; the soft-coral food and zooxanthellae of *Phyllodesmium*; the shields and parapodia of *Chelidonura*; the side gill of the pleurobranchs; the separate, non-retractile gills and the swimming of *Hexabranchus*; the oral veil of *Melibe*; the parapodia of *Thuridilla* | Its names predate the revisions: each line says the name today in its "where" (*Glossodoris atromarginata* now *Doriprismatica*, *Risbecia tryoni* now *Hypselodoris*, *Chromodoris kuniei* and *C. geometrica* now *Goniobranchus*). Its *Pteraeolidia ianthina* sheet (1998) covers the genus as then understood; the Philippine species is *P. semperi* (the literature scan's §4.7): the marks used are of the genus. The fact sheets read carry their original text and the Museum's copyright; no foreign content was seen on them |
| **SEASLUG.WORLD** (Kimoto Nobuhiko), species pages [*Thecacera pacifica*](https://en.seaslug.world/species/thecacera_pacifica), [*Phestilla melanobrachia*](https://en.seaslug.world/species/phestilla_melanobrachia), [*Elysia marginata*](https://en.seaslug.world/species/elysia_marginata) | **[read]** | The finger-like appendages beside the gills of *T. pacifica*; *Phestilla* a coral-feeding genus, *P. melanobrachia* on *Tubastraea*; the bordered parapodia of *E. marginata* | No genus page; its species pages say little of the genus |
| **Wikipedia**, [*Costasiella*](https://en.wikipedia.org/w/index.php?title=Costasiella&oldid=1384690062) (revision 1384690062) | **[read]** through the API | The smooth, simple rhinophores with dull tips, after Swennen 2007's diagnosis of the genus | Cited at a fixed revision; Swennen 2007 itself was not read |

## 4. Read, not used

- **Wikipedia**, Chromodorididae, Phyllidiidae, Polyceridae, *Hexabranchus*, *Melibe*, *Reticulidia*, *Thuridilla*
  **[read]**: genus lists, little on looks; Phyllidiidae's description says what Brunckhorst 1993 says, which is cited
  instead. The other genus pages asked (*Chromodoris*, *Nembrotha*, *Hypselodoris*, *Phyllidia*, *Halgerda*,
  *Pteraeolidia*, *Goniobranchus*, *Phyllodesmium*, *Jorunna*, *Ardeadoris*, *Chelidonura*, *Elysia*,
  *Doriprismatica*, *Caloria*, *Thecacera*, *Tambja*, *Pleurobranchus*, *Coryphellina*, *Phestilla*, Aglajidae,
  Plakobranchidae) **[not read]**: the API answered "too many requests" after 1.5 s between calls; not retried.
- **Sea Slug Forum** *Ardeadoris egretta* (`ardeegre`), *Chelidonura varians* (`chelvar`), *Thecacera picta*
  (`thecpict`), *Halgerda batangas* (`halgbata`), *Flabellina exoptata* (`flabexop`, now *Coryphellina*), *Costasiella
  kuroshimae* (`costkuro`), *Melibe digitata* (`melidigi`), *Phyllidia varicosa* (`phylvari`), *P. ocellata*
  (`phylocel`), *Chromodoris lineolata* (`chroline`), *Hypselodoris apolegma* (`hypsapol`), *Chromodoris geometrica*
  (`chrogeom`), the Aglajidae general page (`aglajidae`, its text in the messages) and Brunckhorst's book page
  (`brbrun1`) **[read]**: species colours, not a feature of the genus, or what another source above says.
- **SEASLUG.WORLD** blog, [*Phyllidiella pustulosa* vs *Phyllidiopsis fissurata*](https://en.seaslug.world/blog/phyllidiella-pustulosa-vs-phyllidiopsis-fissurata)
  (Kimoto, 2015) **[read]**: the rhinophores, black all along against black on the upper back only; a species pair,
  for the species level and the look-alikes (#1042), not a genus mark.
- **Identification Key to the Phyllidiids of the Indo-Pacific**, nudibranch.com.au (couplets 1 and 39) **[read]**: the
  same first couplet as Brunckhorst's; not followed further, Brunckhorst's key being the original.
- **Not read**: Pola, Cervera & Gosliner 2008, the *Nembrotha* revision (Scientia Marina, its PDF answered 503 to the
  fetch, and its certificate chain failed for a plain download); Sea Slugs of Hawaii, Phyllidiidae page (503); Rudman
  1984's review of the chromodorid genera (Zoological Journal of the Linnean Society, paywalled); Gosliner, Valdés &
  Behrens 2018, the field guide (not online).

## 5. What is left

- **The six circle-1 genera in `none`** and the circles 2 and 3: the 2018 field guide would settle many; Rudman 1984
  (the chromodorid genera), Gosliner 1995 (*Thuridilla*), Pola et al. 2008 (*Nembrotha*, *Tambja*, *Roboastra*) and
  Gosliner & Willan 1991 (Flabellinidae) are the papers to read next, each where it opens.
- **Marks that tell two species apart** (the look-alike pairs) wait for the species level and #1042's pairs.
- **SEASLUG.WORLD's species pages** give many more species cues (the *Thecacera* pair is in the literature scan, §4.1).

## Appendix. Requests (2026-11-17, 18:30-19:10 Manila)

- Sea Slug Forum: `general.htm`, `specieslist.htm`, `brbrun1.htm`, 33 fact sheets tried at `/find/<code>` (3 answered
  404: `elysmarg`, `caloindi`, `phessibo`), 2 s apart.
- Wikipedia API: 29 extract requests, 1.5 s apart, 8 answered, then 429.
- Australian Museum: one PDF (14 MB). PLoS ONE, SEASLUG.WORLD (4 pages), nudibranch.com.au (2 pages): one fetch each.
- Queries held only public terms (scientific names, general words); nothing of the project's data was sent.
