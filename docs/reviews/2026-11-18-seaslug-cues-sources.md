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
| Circle 1 (24) | 22: *Chromodoris*, *Goniobranchus*, *Hypselodoris*, *Doriprismatica*, *Phyllidia*, *Reticulidia*, *Jorunna*, *Nembrotha*, *Tambja*, *Thecacera*, *Pteraeolidia*, *Phyllodesmium*, *Chelidonura*, *Pleurobranchus*, *Hexabranchus*, *Costasiella*, *Phestilla*, *Melibe*; *Halgerda*, *Elysia*, *Thuridilla*, *Coryphellina* (2026-11-19) | 2: *Ardeadoris*, *Caloria* |
| Circle 2 (22) | 2: *Phyllidiella* (Brunckhorst's key), *Phyllidiopsis* (Brunckhorst's genus account and table, 2026-11-19) | |
| Circle 3 (32) | 29 (2026-11-19, §6): *Asteronotus*, *Atagema*, *Bornella*, *Bulbaeolidia*, *Cabangus*, *Colpodaspis*, *Cratena*, *Cyerce*, *Dendrodoris*, *Dermatobranchus*, *Doto*, *Euselenops*, *Gymnodoris*, *Janolus*, *Mariaglaja*, *Marioniopsis*, *Murphydoris*, *Notobryon*, *Notodoris*, *Odontoglaja*, *Pelagella*, *Philinopsis*, *Platydoris*, *Sclerodoris*, *Stylocheilus*, *Tenellia*, *Tomoberthella*, *Trapania*, *Tyrannodoris* | 3: *Baeolidia*, *Taringa*, *Verconia* |

Families with marks: Phyllidiidae, Plakobranchidae (the parapodia, which *Elysia* and *Thuridilla* share; Gosliner 1995
tells the two genera apart by where they live and their rhinophores), and Pleurobranchidae.

**Why the two left stay in `none`** (2026-11-19): *Ardeadoris* is defined by its DNA in Johnson & Gosliner 2012, and the
external descriptions read are of *A. egretta*, whose white, yellow-rimmed pattern SEASLUG.WORLD says other genera share
("internally it is clearly distinct"); Rudman 1984's diagnosis was not read. *Caloria*: the Sea Slug Forum's sheet for
*Caloria indica* (as *Phidiana indica*) says its genus "cannot be resolved at present"; no source read gives a feature of
the genus, and its type species is Mediterranean (rule C6).

## 3. The sources used

| Source | Read | What it gave | Note |
|---|---|---|---|
| **Brunckhorst 1993**, *The systematics and phylogeny of phyllidiid nudibranchs (Doridoidea)*, Records of the Australian Museum Supplement 16: 1-107, [doi:10.3853/j.0812-7387.16.1993.79](https://doi.org/10.3853/j.0812-7387.16.1993.79), free PDF from the Australian Museum | **[read]**: "General features" (p. 9), the "Key to phyllidiid genera" (pp. 25-26); on 2026-11-19 the *Phyllidiopsis* "External morphology" (p. 19) and Table 6, "External and internal features of phyllidiid genera" (p. 89) | Phyllidiidae: tough body, hard tubercles, no dorsal gill circlet, gills in the groove under the mantle, contrasting colours. Key couplets 3-5: *Phyllidiella* black rhinophores; *Reticulidia* orange rhinophores and a smooth network of ridges, no tubercles; *Phyllidia* cream to yellow rhinophores, tubercles often compound or in ridges. *Phyllidiopsis*: rhinophores of "various colours; bi- or multi-coloured" (Table 6), "may be bicoloured" (p. 19) | Couplets 1-2 (oral tentacles fused or separate) and every internal character are not photo features. Table 6 also gives *Phyllidiopsis* against *Phyllidiella* (black rhinophores): a source for that pair's line, still in `apartNone` |
| **Korshunova et al. 2017**, *Polyphyly of the traditional family Flabellinidae affects a major group of Nudibranchia*, ZooKeys 717: 1-139, [doi:10.3897/zookeys.717.21885](https://doi.org/10.3897/zookeys.717.21885) | **[read]**, the article's XML: the genus *Coryphellina* (diagnosis, remarks), 2026-11-19 | *Coryphellina*: narrow body, cerata in groups on low elevations, rhinophores as long as or shorter than the oral tentacles and densely papillate (diagnosis); "most of *Coryphellina* species are characterised by papillated rhinophores" (remarks). Its Samlidae and *Samla* diagnoses give the *Coryphellina* / *Samla* tell-apart line (#1119) | Ekimova et al. 2026 (literature scan §4.10) revise the family again; its *Coryphellina* diagnosis not read |
| **Donohoo, Villalobos, Hallas & Gosliner 2023**, *Hyperdiversity of the genus Halgerda Bergh, 1880 (Nudibranchia: Discodorididae) with descriptions of fourteen new species*, Marine Biodiversity 53(3): 42, [doi:10.1007/s12526-022-01334-9](https://doi.org/10.1007/s12526-022-01334-9) | **[read]**, the accepted manuscript on the NSF Public Access Repository ([par.nsf.gov/biblio/10422742](https://par.nsf.gov/biblio/10422742)), its XML, 2026-11-19 | *Halgerda*, after Bergh 1880 and Fahey & Gosliner 2001: "a semifirm, gelatinous body with ridges, tubercles, and no caryophyllidia; a low, smooth rhinophoral and branchial sheath" (Introduction) | Its other genus characters are internal (penis, labial cuticle, radula); a revision the literature scan lists (§4.12), not this study |
| **Gosliner 1995**, *The genus Thuridilla (Opisthobranchia: Elysiidae) from the tropical Indo-Pacific, with a revision of the phylogeny and systematics of the Elysiidae*, Proceedings of the California Academy of Sciences 49(1): 1-54, no DOI | **[read]**, the OCR of the BioStor scan on the Internet Archive ([archive.org/details/biostor-3282](https://archive.org/details/biostor-3282)), 2026-11-19; the Biodiversity Heritage Library's page answered a browser check | *Thuridilla* "brightly colored and are found crawling out in the open rather than being cryptic" (p. 1); its derived features include "elongate rhinophores", bright colour not in every species; most *Elysia* "intimately associated with their algal food and are usually cryptic upon their food", *Thuridilla* "generally observed crawling freely in the open" on shallow reefs (p. 45) | The paper the study's §5 named for *Thuridilla*; its other genus features are internal |
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
  for the species level and the look-alikes (#1042), not a genus mark. The genus pair's tell-apart line comes from
  Brunckhorst 1993 instead (read 2026-11-19): Table 6 (p. 89) gives *Phyllidiella* black rhinophores and
  *Phyllidiopsis* rhinophores of "various colours; bi- or multi-coloured", and the genus's "External morphology"
  (p. 19) says they "may be bicoloured".
- **Identification Key to the Phyllidiids of the Indo-Pacific**, nudibranch.com.au (couplets 1 and 39) **[read]**: the
  same first couplet as Brunckhorst's; not followed further, Brunckhorst's key being the original.
- **2026-11-19, read, not used**: Johnson & Gosliner 2012, the whole article fetched (its *Ardeadoris* entry gives the clade's members, no
  external feature); SEASLUG.WORLD's [*Ardeadoris egretta*](https://en.seaslug.world/species/ardeadoris_egretta) page
  (the species' looks, shared with other genera); the Sea Slug Forum's *Halgerda batangas* (`halgbata`, species
  colours) and *Phidiana indica* (`phidindi`, now *Caloria indica*: its genus unsettled) sheets; Plazi's *Ardeadoris*
  treatment (a stub, no text).
- **2026-11-19, not read**: the Australian Faunal Directory's *Ardeadoris* page (a CAPTCHA); the Biodiversity Heritage
  Library's text of Gosliner 1995 (a browser check; the same scan read on the Internet Archive); Wikipedia's API (429,
  "too many requests", on the one batched request; not retried); Furfaro et al. 2016 (*Caloria elegans*, Mediterranean:
  a search summary only).
- **Not read**: Pola, Cervera & Gosliner 2008, the *Nembrotha* revision (Scientia Marina, its PDF answered 503 to the
  fetch, and its certificate chain failed for a plain download); Sea Slugs of Hawaii, Phyllidiidae page (503); Rudman
  1984's review of the chromodorid genera (Zoological Journal of the Linnean Society, paywalled); Gosliner, Valdés &
  Behrens 2018, the field guide (not online).

## 5. What is left

- **The two circle-1 genera in `none`** (*Ardeadoris*, *Caloria*) and the circles 2 and 3: the 2018 field guide would
  settle many; Rudman 1984 (the chromodorid genera, *Ardeadoris* among them), Pola et al. 2008 (*Nembrotha*, *Tambja*,
  *Roboastra*) and Gosliner & Willan 1991 (Flabellinidae) are the papers to read next, each where it opens.
- ***Caloria indica*'s genus**: the Sea Slug Forum says it cannot be settled (also placed in *Learchis*, *Hervia*,
  *Facelina* and *Phidiana*): a nomenclature point for `points.json` (rule C5).
- **Marks that tell two species apart** (the look-alike pairs) wait for the species level and #1042's pairs.
- **SEASLUG.WORLD's species pages** give many more species cues (the *Thecacera* pair is in the literature scan, §4.1).
- **Circle 3**: a genus diagnosis read in the paper itself for the genera whose marks come from one game species (§6,
  tier B), where it opens: Gosliner & Fahey 2011 (*Dermatobranchus*), Gosliner & Fahey 2008 (*Trapania*), Dorgan et al.
  2002 (*Platydoris*), Moles et al. 2023 (*Tomoberthella*), Paz-Sedano et al. 2022 and 2023 (*Murphydoris*,
  *Pelagella*), Willan & Chang 2017 (*Tyrannodoris*), Zamora-Silva & Malaquias 2018 (*Mariaglaja*).

## 6. Circle 3 (2026-11-19)

Each line was sorted before it was written (rule W11, each source **[read]** unless said):

- **Tier A, said of the genus** by the source: a diagnosis, "typical of the genus", "like all species of", "as with other
  species of". Written as a plain mark.
- **Tier B, said of a game species**: a shape, an appendage, a texture, a habit or the food of one of the genus's game
  species, never its colour alone. Written "as *X. y*", as the circle-1 *Thecacera* and *Hypselodoris* marks are.
- **Not a mark**: one species' colour pattern alone, a feature under the animal (*Dendrodoris tuberculosa*'s spotted mantle
  underside), a count or a size in numbers, an internal organ. A genus with nothing else goes to `none`.

Every species named is a game species in `tools/seaslugs.json`, confirmed in the Philippines by rule C8 (its build
applies it; Research Grade observations in the Philippines from 23, *Verconia norba*, to 83, *Doto ussi*).

| Genus | Marks (tier) | Sources |
|---|---|---|
| *Asteronotus* | midline ridge flanked by knobs (B); grows very large, some plain (B) | SEASLUG.WORLD *A. cespitosus*; Sea Slug Forum `astecesp` |
| *Atagema* | rough spiculate tubercles (B); warty midline crest (B) | Sea Slug Forum `tripinte`; SEASLUG.WORLD *A. intecta* |
| *Bornella* | tall rhinophore sheaths with a sail (B); paired processes with gills inside (B); most swim side to side (A), *B. anguilla* like an eel (B) | SEASLUG.WORLD and Sea Slug Forum `bornangu` |
| *Bulbaeolidia* | bulb-like rhinophore swellings (A); club-shaped cerata in single rows (A); red line at the rhinophore base (B) | Carmona et al. 2013, the genus's description; Sea Slug Forum `aeolalba` |
| *Cabangus* | paired tree-like dorsolateral appendages (A); branched oral veil appendages (A) | Korshunova et al. 2020, the genus diagnosis (read in its Plazi treatment on Zenodo); SEASLUG.WORLD *C. regius* |
| *Colpodaspis* | shell hidden in the mantle (B); right-side siphon (B) | Sea Slug Forum `colpthom` |
| *Cratena* | smooth rhinophores and tentacles (B); cerata in an arch, then sloping rows (B) | Sea Slug Forum `cratsimb` |
| *Cyerce* | large leaf-like cerata, easily shed (A, "these sacoglossans"); split, rolled rhinophores (B) | Sea Slug Forum `cyereleg` |
| *Dendrodoris* | soft body with clustered knobs (B); mushroom-shaped rhinophore clubs (B) | Sea Slug Forum `dendtube`; SEASLUG.WORLD *D. tuberculosa* |
| *Dermatobranchus* | lengthwise ridges, oral veil with a coloured rim, wide-set rhinophores with lengthwise plates (B, both game species) | SEASLUG.WORLD *D. funiculus*, *D. caeruleomaculatus* (after Gosliner & Fahey 2011) |
| *Doto* | warty cerata (B); smooth rhinophores in cup-like sheaths (B) | SEASLUG.WORLD *D. ussi* |
| *Euselenops* | half-moon papillate oral veil (B); siphon (B); buried by day (B) | SEASLUG.WORLD *E. luniceps* |
| *Gymnodoris* | eats other sea slugs (A); most white with orange spots or lines (A) | Sea Slug Forum, Rudman's comments `/find/1867`, `/find/655` |
| *Janolus* | frilled crest between the rhinophores (B, both game species); swollen pointed cerata (B) | SEASLUG.WORLD *J. savinkini*, *J. flavoanulatus* |
| *Mariaglaja* | back shield in two unequal lobes (B) | SEASLUG.WORLD *M. tsurugensis* |
| *Marioniopsis* | tree-like gills along the sides (B); papillate front veil (B) | SEASLUG.WORLD *M. arborescens* (after Bergh) |
| *Murphydoris* | tiny, slender; *M. adusta* on colonial sea squirts (B) | SEASLUG.WORLD *M. adusta* |
| *Notobryon* | tail crest used as a paddle (A); lobes with feathery gills (A); algae-like (B) | Sea Slug Forum `notoward`; SEASLUG.WORLD *N. wardi* |
| *Notodoris* | spiculate tough skin, small smooth rhinophores (A, "as with other species of *Notodoris*"); gills half hidden by lobes (B) | Sea Slug Forum `notomino`, `notosere` |
| *Odontoglaja* | low pustules (B); tail from the left of the back shield (B) | SEASLUG.WORLD *O. guamensis* |
| *Pelagella* | very long rhinophores and oral tentacles (B); raised mantle rim, no papillae (B) | SEASLUG.WORLD *P. longicornis* (after Paz-Sedano et al. 2023) |
| *Philinopsis* | smooth body, long head shield (B); coloured parapodial edges (B) | SEASLUG.WORLD and Sea Slug Forum *P. speciosa* |
| *Platydoris* | flat body, broad stiff mantle (A, "like all species of *Platydoris*"); raised lobed gill rim (B) | Sea Slug Forum `platsang`; SEASLUG.WORLD *P. sanguinea* |
| *Sclerodoris* | the midline pit like a sponge pore (B) | Sea Slug Forum `scletube`; SEASLUG.WORLD *S. tuberculata* |
| *Stylocheilus* | small slim sea hare with dark lines (B); ringed eye spots (B); gathers in numbers (B) | Sea Slug Forum `stylstri`; SEASLUG.WORLD *S. striatus* |
| *Tenellia* | on rubble in soft sand or silt (B: the game's species are the article's soft-sediment ones) | Kim, Donohoo & Gosliner 2024 (read on PubMed Central, PMC11648685) |
| *Tomoberthella* | sheds parts of the mantle, lines mark the breaks, rolled rhinophores joined at the base (B) | Sea Slug Forum `bertmart` (as *Berthella martensi*); SEASLUG.WORLD *T. martensi* |
| *Trapania* | processes beside the rhinophores and the gills (B, three game species); foot corners as tentacles (B) | Sea Slug Forum `trappalm`, `trapscur`; SEASLUG.WORLD *T. vitta* |
| *Tyrannodoris* | large down-pointing oral tentacles (A for *Roboastra*, said of *T. luteolineata*); smooth tapering body (B) | Sea Slug Forum `robolute`; SEASLUG.WORLD *T. luteolineata* |

**In `none`** (the reasons in `tools/seaslug_cues.json`): *Baeolidia* (Carmona et al. 2014, Zootaxa 3802, its
abstract **[read]**: only the oral glands may set the genus apart; Carmona et al. 2013: its rhinophore and cerata shapes
evolved several times in the family); *Taringa* (its one game species looks like a *Halgerda*; only its anatomy places
it); *Verconia* (placed by DNA, Johnson & Gosliner 2012; its game species share the Sea Slug Forum's Noumea purpurea
colour group, `noumpur2`, which spans several genera).

**Read, not used**: the Sea Slug Forum's `bergjapo`, `borndoto`, `bornherm` (not game species, rule C6), `crataffi`,
`cyernigr` (*C. nigricans*, not *C. nigra*), `dendnigr`, `dendfuma`, `dermorna`, `dermnigr`, `dotoussi`, `gymnrubr`,
`janocris`, `janoexim`, `cheltsur`, `odonguam`, `noumalbo`, `noumnorb`, `vercverc`, `tarihalg`, `trapvitt`, `trapmilt`,
`teneadsp`, `platform`, `astemime`, `bertorna`, the Dotidae, Aglajidae, Aegiretidae, Onchidorididae and *Cuthona*
discussion pages; SEASLUG.WORLD's *Verconia*, *Taringa*, *Cyerce nigra*, *Notodoris minor*, *Colpodaspis thompsoni*,
*Cratena simba*, *Bulbaeolidia alba*, *Atagema intecta* pages beyond the lines cited. **Not read**: Paz-Sedano et al.
2023 (*Pelagella*; the University of Barcelona repository's PDF answered 404), Kim et al. 2024 on PeerJ itself (a
browser check; read on PubMed Central instead), the Plazi pages (a redirect; Zenodo's copy of the treatment read).

## Appendix. Requests (2026-11-17, 18:30-19:10 Manila)

- Sea Slug Forum: `general.htm`, `specieslist.htm`, `brbrun1.htm`, 33 fact sheets tried at `/find/<code>` (3 answered
  404: `elysmarg`, `caloindi`, `phessibo`), 2 s apart.
- Wikipedia API: 29 extract requests, 1.5 s apart, 8 answered, then 429.
- Australian Museum: one PDF (14 MB). PLoS ONE, SEASLUG.WORLD (4 pages), nudibranch.com.au (2 pages): one fetch each.
- Queries held only public terms (scientific names, general words); nothing of the project's data was sent.

**2026-11-19, 04:20-05:10 Manila** (the circle-1 genera left in `none`), each request one at a time, a generic
User-Agent:
- Web searches (6): *Halgerda* genus diagnosis (Donohoo 2023); *Ardeadoris* external features (Rudman 1984), twice;
  Gosliner 1995 *Thuridilla*; *Caloria* genus diagnosis (Facelinidae), twice.
- Sea Slug Forum: `halgerda` (404), `halgbata`, `general.htm`, `phidindi`. Zookeys (Korshunova et al. 2017, XML), NSF
  Public Access Repository (Donohoo et al. 2023, XML), PLoS ONE (Johnson & Gosliner 2012, XML), Internet Archive
  (Gosliner 1995, OCR text), Australian Museum (Brunckhorst 1993, PDF, its DOI page first), Plazi (2), SEASLUG.WORLD
  (1): one fetch each. Refused by the site: the Biodiversity Heritage Library (a browser check; BioStor's copy of the same
  scan on the Internet Archive was read instead), the Australian Faunal Directory (a CAPTCHA) and Wikipedia's API (429),
  neither tried again. No refusal came from the session's network proxy.

**2026-11-19, 16:15-17:00 Manila** (the circle-3 genera), each request one at a time, a generic User-Agent, no
iNaturalist request (rule C7: another agent ran at the same time):
- Sea Slug Forum, 2 s apart: `specieslist.htm`; 30 genus names tried as `/find/<genus>` and 9 guessed species codes
  (404); 52 fact sheets and pages (`/find/<code>`, `/showall/<code>` for the family discussions, the messages `655`,
  `1867`).
- SEASLUG.WORLD, 2 s apart: 34 species pages (one 404, *Gymnodoris crocea*).
- PLoS ONE (Carmona et al. 2013, Johnson & Gosliner 2012, XML), NCBI E-utilities (Kim et al. 2024, PMC XML), Zenodo
  (the *Cabangus* treatment, one search), Crossref (4 DOIs), Magnolia Press (one abstract), the University of Barcelona
  repository (404), PeerJ and Europe PMC (a browser check, no text): one fetch each. Web searches (6): *Bulbaeolidia*,
  *Pelagella*, *Cabangus*, *Tyrannodoris*, *Baeolidia* genus features, the *Cabangus* diagnosis.
