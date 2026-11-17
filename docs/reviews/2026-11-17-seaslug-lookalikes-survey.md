# Sea slugs: the look-alikes and confusion groups already published (survey, 2026-11-17)

Pierre, 2026-11-17 (about 06:30 Manila), on the sea slugs:

> "Et aussi un point qui manque sur les mini-branches [nudibranches], c'est est-ce que tu as regardé tout ce qui était
> SOSI [sosies: look-alikes] et potentiellement groupe de confusion déjà existant en ligne."

The answer he got then was "only partly": the study's §6.3 listed four sourced sets, and only the Spanish dancers' pair
is in the data (`tools/seaslugs.json` `lookalikes`, Q377). This note is the systematic survey launched then. A few
minutes later he widened it: web searches allowed ("Ben oui! Pourquoi t'as besoin de mon autorisation?", 06:33), the
specialist sources ("Typiquement pour les nudibranches il faut aller chercher d'autres sources à mon avis", 06:34) **in
addition to** the general ones ("Sans oublier les autres sources généralistes bien sûr ?", 06:37).

**Nothing enters the game.** The candidates are in a data file that neither the app nor the game tools read
(`tests/seaslug-lookalikes.test.js` holds it). `tools/seaslugs.json` `lookalikes` and `tools/seaslug_game.py` are
unchanged. §6 proposes how candidates could enter play, and ends with one question for Pierre.

Labels (rule W11): **[measured]** = counted by the tool from the replies; **[read]** = taken from a page or a paper;
**[search]** = only a search result's excerpt, the page itself not read; **[guess]** = my judgement.

## 1. What was asked, and how

### 1.1 The tool and its files

- **`tools/seaslug_lookalikes.py`**, in two stages, as `tools/build_seaslugs.py`:
  - `--pull` asks the network and writes the raw replies, reduced, to `tools/seaslug_lookalikes_pull.json`
    (`--pull inat`, `worms` or `text` re-asks one part and keeps the others);
  - the build is offline and pure: from the pull, the hand-kept `tools/seaslug_lookalikes_source.json`,
    `tools/seaslugs.json` (the 452 species rule C8 confirms in the Philippines) and `seaslug.json` (the subject: 205
    species, 78 genera) to `tools/seaslug_lookalikes_cand.json`. `--check` rebuilds it and fails when the committed file
    differs (`tests/seaslug-lookalikes.test.js`, in CI).
- **`tools/seaslug_lookalikes_source.json`** is hand-kept: the floors (below) and the **literature sets**, each with its
  source, a quote and what was read (rule C2). Where a source uses an older name, the set holds the list's name and says
  so in its `note` (*Chromodoris boucheti* is the list's *C. lochi*, *Risbecia tryoni* *Hypselodoris tryoni*); a
  synonym left in a set, or named in a text source, is read as the list's name all the same (the list's synonyms and
  WoRMS's accepted names; recorded in the group's `as`).
- **Kept (rules C6, C8)**: a pair whose two members are in the subject (`seaslug.json`) or confirmed in the Philippines
  (`tools/seaslugs.json`); at the genus rank, a genus of one of them. A partner outside both goes to `others`, with
  why: "a sea slug not confirmed in the Philippines (rule C8)", "not a sea slug", or another rank.
- **Listed**: a pair whose Philippine count reaches 2, or its world count 3 (`floor`), or that a literature set or a
  text source names. An **iNaturalist group** joins the species linked by pairs of 3 or more in the Philippines, or 10
  or more worldwide (`groupFloor`), when it holds 3 species or more. The floors are mine, to keep the file readable
  **[guess]**: every count is in the pull.

### 1.2 The general sources (asked by the tool)

- **iNaturalist "similar species"** (`v1/identifications/similar_species`) **[read: the API's own description]**:
  "Returns species attached to IDs of observations of this taxon, or attached to observations identified as this
  species, ordered by combined frequency descending. This will only return species in the same iconic taxon, and will
  never return descendants of the chosen taxon." So a pair's count is the number of observations where one was
  identified as the other, from either side: the same count from both ends. Asked for a genus, it returns genera
  **[measured]**.
  - Asked for each of the 205 species and 78 genera, **in the Philippines** (`place_id=6873`) **and worldwide**: the
    Philippine counts are small (1,409 confusions in all, against 11,179 worldwide: §2), so the world's counts give the
    strength, the Philippine ones the local relevance.
  - With each taxon's observations in both scopes (every quality grade, as the counts), for the rates: the species
    batched 100 a request (`observations/species_counts`, `tools/inat.py` `leaf_counts`), each genus alone
    (`per_page=0`).
  - Two strength measures per side: **share**, the part of all its listed confusions that go to this partner; **rate**,
    the count over its observations.
  - "Same iconic taxon" means Mollusca: **a flatworm or a sea cucumber can never appear**, so the classic polyclad and
    holothurian mimics come only from the literature (§4).
- **WoRMS** (REST `AphiaSourcesByAphiaID`, every species and genus): the references it cites. WoRMS's REST service has
  no notes or remarks endpoint (its OpenAPI listing, read 2026-11-17), so the references are what it gives. A reference
  whose **title** names a colour group, mimicry, cryptic species or a species complex makes a set of the species that
  cite it: Rudman's "colour groups" papers above all. A title only: such a paper may treat several groups.
- **English Wikipedia** (the wikitext of each species with an article of its own, 50 a request) and **GBIF** (each
  species' descriptions, `species/{key}/descriptions`: the treatments Plazi and others extracted from papers): the
  sentences that compare ("similar", "resembles", "confused", "mimic", "differs", "distinguish"...) and name a species,
  up to the reference lists. The build keeps those about the look and pairs the species named on each side of the
  comparing word, the sentence quoted (how, and its limits: §5).

### 1.3 The specialist sources (read by hand, in the source file)

- **Nudi Pixel, "Nudibranch Look-Alikes"** (<https://nudipixel.net/similarities>) **[read]**: an index of 42
  comparison cards (its title says 46; 42 were on the page read), "X vs. Y" or a group of 3 to 6 species, made with
  "input from experts and the experiences of
  photographer friends". It is the closest thing to a published list of confusion groups. Copyrighted ("may not be
  reproduced ... without written permission"): cited, never copied beyond the names.
- **The Sea Slug Forum** (Bill Rudman, Australian Museum, 1998-2010) **[read]**: the fact sheets that name look-alikes,
  the colour-group and mimicry pages, and two messages. The domain may no longer be the Museum's (the sources note of
  2026-11-15 found an unrelated word on its home page): read only, nothing followed.
- **Papers**: Layton, Carvajal & Wilson 2020 (PMC, full text, its first 100,000 characters); Stoffels et al. 2016
  (PMC, the same); Epstein et al. 2019 (the California Academy's news release, and the abstract as search results give
  it); Ekimova et al. 2022 (the abstract, through Crossref); Pola, Cervera & Gosliner 2008 (the abstract, through
  Crossref: no look-alike statement in it; the paper's pages answered 503). Layton, Gosliner & Wilson 2018's abstract was
  read for the study (§6.3); Crossref holds none, the publisher's page was not reread.
- **The guide**, Gosliner, Valdés & Behrens 2018: no public page, review or excerpt found shows its "similar species"
  notes (one search, §7). Not read.

## 2. What came back [measured]

- **Requests** (2026-11-17, 06:36-07:00 Manila): iNaturalist 738 (similar species 566; taxa and observations 172),
  WoRMS 285, Wikipedia 5 (169 articles), GBIF 401 (205 species); one request a second to each host at most
  (`tools/inat.py`: Wikipedia answered HTTP 429 and was retried after its Retry-After). Besides the tool, to read the
  replies' shape: iNaturalist 6
  requests (one of them its API description), WoRMS 3, GBIF 4, Wikipedia 3, each paced by hand or by `tools/inat.py`,
  with the project's User-Agent; and Crossref 4 (§7).
- **iNaturalist**: 216 of the 283 taxa have at least one partner in the Philippines (582 partner rows, 1,409
  confusions in all); 275 worldwide (2,058 rows, 11,179 confusions).
- **Text sources**: 94 comparing sentences in 65 Wikipedia articles, 96 in the GBIF descriptions of 38 species, before
  the look filter (§1.2).
- **The file** (`tools/seaslug_lookalikes_cand.json`):
  - **186 species pairs**: 127 between two species of the game, 59 with one species confirmed but not in the game yet;
    29 across genera, 11 across families. 45 are named by a literature set (30 of them between two species of the
    game), 37 by a text source, and the WoRMS titles add more.
  - **176 genus pairs**, 87 across families; 114 of them have no species pair of the game under them (`genusOnly`, §3.5).
  - **81 groups**: 60 literature sets (33 keep two members or more once rule C6 is applied), 8 WoRMS sets, 13
    iNaturalist groups.
- **Left out** (`others`, rule C6), from the floor up or named by a text source: 230 partners. 129 sea-slug species
  and 93 genera not confirmed in the Philippines, 8 not sea slugs (a cowrie, *Ovula ovum*, taken for *Pleurobranchus
  forskalii*, among them). Among the species: *Chromodoris elisabethina* (with *C. lochi* PH 12, with *C. annae* PH
  4), *Elysia ornata* (with *E. marginata* PH 21, world 100), *Glossodoris cincta* (with *G. acosti* PH 7),
  *Pteraeolidia ianthina* (with *P. semperi* world 61).

## 3. The strongest candidates, by group

Counts are iNaturalist's: **PH** in the Philippines, **world** worldwide; a percentage is a share, the part of one
side's listed confusions that go to this partner (§1.2). The sources named are the literature sets and text sources
that name the pair (§1.3); every pair's full record is in the file. Every species named here is confirmed in the Philippines (rule C8) unless marked "not
confirmed", which is then context only (rule C6).

### 3.1 *Chromodoris*, the black-lined species

- **iNaturalist group** of six: *C. annae*, *C. colemani*, *C. lochi*, *C. magnifica*, *C. strigata*, *C. willani*
  (49 confusions in the Philippines, 138 worldwide), the same six that WoRMS cites under Rudman 1982's "*Chromodoris
  quadricolor*, *C. lineolata* and *Hypselodoris nigrolineata* colour groups".
- ***C. alcalai* / *C. dianae***: PH 12 (75% of each side's confusions), world 57 (88%, 89%). The strongest pair of
  the genus, **and no source names it** among those read. A dive photographer's page notes that "C. dianae has some
  orangish/brownish markings on the side of its body whereas C. alcalai does not" **[search]**: not a source for play.
- ***C. colemani* / *C. magnifica***: PH 11, world 19; ***C. annae* / *C. colemani***: PH 10, world 21; ***C. annae* /
  *C. lochi***: PH 10, world 19; ***C. magnifica* / *C. strigata***: PH 8, world 21.
- ***C. lochi* / *C. willani***: PH 4, world 43 (90% of *C. willani*'s confusions worldwide). Sources: Rudman's *C.
  willani* fact sheet ("Other species include Chromodoris lochi, Chromodoris boucheti and Chromodoris dianae"), Nudi
  Pixel's "*Chromodoris lochi* group" (*C. dianae*, *C. lochi*, *C. willani*), and Rudman 2007 on *C. dianae* against
  *C. lochi* ("the small white specks all over the mantle in C. dianae"). *C. dianae* / *C. lochi* is almost absent
  from iNaturalist's counts (world 1): **the literature and the data disagree there**.
- ***C. joshi* / *C. magnifica***: PH 2, world 3. Layton, Carvajal & Wilson 2020: "the 'magnifica' morph of C. joshi".
- ***C. annae* / *C. elisabethina*** (Rudman's fact sheet, Nudi Pixel, Layton et al. 2020) and ***C. lochi* / *C.
  elisabethina*** (PH 12, world 21): *C. elisabethina* is **not confirmed** in the Philippines by rule C8. Its 16
  Philippine confusions are probably misidentified *C. annae* or *C. lochi* **[guess]**: context only.

### 3.2 Phyllidiidae (*Phyllidia*, *Phyllidiella*, *Phyllidiopsis*)

- **The genera themselves**: ***Phyllidiella* / *Phyllidiopsis***: PH 28 (80% of both genera's genus-rank
  confusions), world 185; *Phyllidia* / *Phyllidiella*: PH 6, world 97; *Phyllidia* / *Phyllidiopsis*: PH 6, world
  18. These are in one family, so today's game already pairs them (§6.1); the counts say *Phyllidiella* /
  *Phyllidiopsis* first.
- **iNaturalist group** of five *Phyllidia*: *P. coelestis*, *P. elegans*, *P. picta*, *P. varicosa*, *P. willani*
  (31 PH, 181 world).
  - ***P. elegans* / *P. varicosa***: PH 11, world 46. Rudman's *P. elegans* fact sheet, after Brunckhorst 1993.
  - ***P. coelestis* / *P. varicosa***: PH 9, world 43. Rudman's *P. varicosa* fact sheet ("Phyllidia coelestis is a
    smaller species which has neither a foot stripe nor a median ridge") and Nudi Pixel's "*Phyllidia varicosa*
    group".
  - ***P. picta* / *P. varicosa***: PH 4, world 68; ***P. coelestis* / *P. picta***: PH 2, world 18, Stoffels et al.
    2016 ("already noticed the close similarity between the two species but still confused them").
- ***Phyllidiella nigra* / *P. pustulosa***: PH 4, world 36 (97% of *P. nigra*'s confusions worldwide). No source
  read names it.
- **Across genera**: *Phyllidiella pustulosa* / *Phyllidiopsis fissurata* PH 3, world 11; *P. pustulosa* /
  *Phyllidiopsis krempfi* world 6, Nudi Pixel's "*Phyllidiella pustulosa* group" (with *Phyllidiopsis burni*).
- **Stoffels et al. 2016's frame**: "many species cannot be identified based on colouration alone owing to their high
  intra-specific colour variation"; *P. pustulosa* may hold "multiple (cryptic) species". Rudman's *P. pustulosa*
  sheet names its closest look-alikes, *Phyllidiella annulata*, *P. zeylanica* and *P. granulata*: **none is confirmed
  in the Philippines**.

### 3.3 *Hypselodoris* and *Goniobranchus*, the colour sets

- ***Goniobranchus leopardus* / *Hypselodoris tryoni***: PH 6 (86% and 67%), world 24, **across genera**, and the best
  sourced pair of the survey: Rudman's *C. kuniei* fact sheet (with *G. kuniei*: "C. leopardus and C. kuniei can be
  distinguished from R. tryoni by the broad purple border ... and by the leopard-like multiple spots") and Nudi Pixel
  ("*Goniobranchus leopardus* vs. *Hypselodoris tryoni*"). *G. kuniei* / *H. tryoni*: PH 1, world 13. iNaturalist group:
  *G. kuniei*, *G. leopardus*, *H. tryoni*.
- **The genera**: *Goniobranchus* / *Hypselodoris*: PH 9, world 123, the strongest pair in Chromodorididae;
  *Chromodoris* / *Goniobranchus* world 64; *Chromodoris* / *Hypselodoris* world 22.
- ***Goniobranchus preciosus* / *G. verrieri***: PH 15 (71%, 94%), world 28; with *G. albonares* and *G. fabulus* an
  iNaturalist group of four (19 PH, 116 world); Nudi Pixel's "*Goniobranchus preciosus* group" (*G. albonares*, *G.
  preciosus*, *G. verrieri*).
- ***Hypselodoris decorata* / *H. maculosa***: PH 11, world 44; with *H. paradisa* an iNaturalist group. The text
  sources name all three: Wikipedia ("It can be distinguished from Hypselodoris decorata by having two instead of three
  rings on the rhinophores"), and Epstein et al. 2019's treatments, as GBIF holds them ("Johnson (2005) suggested that H.
  decorata has several distinguishing attributes of its colour pattern that separate it from H. maculosa, including the
  presence of three rather than two red rhinophoral rings"; of *H. paradisa*: "This species has similarity in its
  colour pattern to the sympatric species, H. maculosa and H. decorata"). WoRMS cites the same paper for *H. decorata*,
  *H. paradisa* and five more *Hypselodoris*.
- **The purple *Hypselodoris***: *H. apolegma* / *H. variobranchia* PH 6, world 10 (Wikipedia, of *H. variobranchia*:
  "frequently mistaken for Hypselodoris bullocki or Hypselodoris apolegma"); *H. apolegma* / *H. bullockii* PH 1,
  world 6, with Rudman ("See Hypselodoris apolegma, which may be a colour form"), Nudi Pixel and Wikipedia;
  *H. bullockii* / *H. iba* world 4, with Epstein et al. 2019 (the lavender *H. iba* "looked strikingly similar to
  another purple species common to the region", Müllerian mimicry).
- **The red-rimmed *Goniobranchus*** of the study (§6.3: *kuniei*, *geometricus*, *coi*, *fidelis*): **iNaturalist
  lists no confusion between any two of them**, in the Philippines or worldwide, and no source read groups them. Their
  look-alikes lie elsewhere: *G. kuniei* with *H. tryoni* (above), *G. geometricus* with the phyllidiids (§4). Nudi
  Pixel pairs *G. coi* with *G. gleniei* (not confirmed).

### 3.4 *Nembrotha*

- ***N. kubaryana* / *N. milleri***: PH 5, world 6; ***N. cristata* / *N. kubaryana***: PH 2, world 12, with Rudman ("A
  similarly coloured species, Nembrotha cristata lacks the orange border to the foot") and Nudi Pixel. iNaturalist
  group: *N. cristata*, *N. kubaryana*, *N. milleri*.
- Pola, Cervera & Gosliner 2008 revised the genus; its abstract holds no look-alike statement, and its pages did not
  open.

### 3.5 Aeolids and the other sea slugs

- **Aeolids**: few pairs at the species rank. *Caloria indica* / *Coryphellina exoptata*: world 7, across families.
  Nudi Pixel's "*Coryphellina exoptata* group" (with *C. delicata* and *Samla macassarana*, both confirmed; *C.
  rubrolineata* not). Ekimova et al. 2022: *C. rubrolineata* is, outside its type locality, "a complex of pseudocryptic
  species", so the Philippine records under that name are uncertain; WoRMS cites the paper for *C. flamma* and *C.
  lotos*. *Pteraeolidia semperi* / *P. ianthina*: world 61, but *P. ianthina* is not confirmed (the study's §6.3).
- **Genus pairs that are names, not looks** (`genusOnly`, no species pair under them): *Phestilla* / *Tenellia* (PH
  15, world 107: species moved between the two, Korshunova, Fletcher & Martynov 2025, study §2.3), *Coryphellina* /
  *Unidentia*, *Okenia* / *Pelagella*, *Marionia* / *Marioniopsis*, *Goniodoridella* / *Murphydoris*. And *Aplysia* /
  *Elysia* (PH 4, world 28), a sea hare against a sap-sucking slug, probably a slip on two similar names **[guess]**.
  iNaturalist's counts mix the three causes; the literature does not.
- **Same-genus pairs elsewhere**: *Hexabranchus lacer* / *H. sanguineus* PH 25, world 247 (decided, Q377; with *H.
  giganteus*, confirmed, an iNaturalist group of three); *Cyerce basi* / *C. elegans* PH 14, world 51; *Ceratosoma
  gracillimum* / *C. tenue* PH 10, world 29 (Nudi Pixel's *Ceratosoma* group of three); *Janolus flavoanulatus* / *J.
  savinkini* PH 8, world 14; *Thecacera pacifica* / *T. pikachu* world 27; *Plakobranchus ocellatus* / *P. papua*
  and *Costasiella kuroshimae* / *C. usagi* PH 3, world 7.

## 4. Across families: the mimics

- ***Phyllidiella pustulosa* and its mimics.** Rudman's "Mimicry" page: *Paradoris liturata* (then *Discodoris?
  liturata*) is "an almost perfect mimic of Phyllidiella pustulosa"; Nudi Pixel's "Mimics of *Phyllidiella pustulosa*"
  adds *Goniobranchus geometricus* and *Aldisa williamsi* (not confirmed). *P. liturata* is confirmed (9 observers);
  iNaturalist barely counts the pairs (world 1 each): the mimics are rarely misnamed, or rarely photographed
  **[guess]**. *G. geometricus* / *Phyllidia elegans*: PH 1, world 3. Rudman's *C. geometrica* sheet: "the
  characteristic dorsal colour pattern, which resembles a phyllidiid".
- **The juvenile Spanish dancer.** Rudman 1999, on a juvenile from Dauin: "a remarkable resemblance to some purple
  spotted chromodorids such as Hypselodoris maculosa, Thorunna australis and Chromodoris decora". *H. maculosa* and
  *T. australis* are confirmed, *C. decora* not. iNaturalist: *H. lacer* / *H. maculosa* world 1; the genus pair
  *Goniobranchus* / *Hexabranchus* PH 5, world 15 (whether those observations are juveniles was not checked). This one
  is about the juvenile only: a photo-level pair, for its juvenile photos (`ph` "juvenile" in `seaslug-game.json`).
- ***Chromodoris balat* / *Nembrotha lineolata***: PH 2, world 2. No source read names it.
- **Not sea slugs** (never in iNaturalist's counts, §1.2): a polyclad flatworm, *Pseudoceros imitatus*, beside
  *Phyllidiella pustulosa* (Rudman's "Mimicry" page; Newman, Cannon & Brunckhorst 1994, cited by Wikipedia, not read),
  an unnamed flatworm with *Chromodoris geometrica* "from Philippines" and another with *C. magnifica* (message titles
  only), and the juvenile sea cucumber *Pearsonothuria graeffei* (*Bohadschia graeffei*) mimicking *Phyllidia
  varicosa* (Rudman; Nudi Pixel; Wikipedia). The study's "is it a nudibranch?" decoy (§6.3) has its sources now; its
  presence in the Philippines would need checking (rule C8) before any use.

## 5. What the sources agree on, and where they part

- **Where they agree**: *H. lacer* / *H. sanguineus*; *Goniobranchus leopardus* / *Hypselodoris tryoni*; *Phyllidia
  coelestis* and *P. elegans* against *P. varicosa*; *Chromodoris lochi* / *C. willani*; *Nembrotha cristata* / *N.
  kubaryana*; *Ceratosoma gracillimum* / *C. tenue*; *Goniobranchus preciosus* / *G. verrieri*; *Hypselodoris
  decorata* / *H. maculosa* / *H. paradisa*; *H. apolegma* / *H. variobranchia*. Literature (or a text source) and
  data both name them: the safest candidates.
- **Data only**: *C. alcalai* / *C. dianae*, *C. annae* with *C. colemani* and *C. lochi*, *C. colemani* / *C.
  magnifica*, *Phyllidiella nigra* / *P. pustulosa*, *Cyerce basi* / *C. elegans*, *Janolus flavoanulatus* / *J.
  savinkini*, *N. kubaryana* / *N. milleri*. Strong counts, no source read.
- **Literature only**: the mimics (§4), *C. dianae* / *C. lochi* (Rudman, Nudi Pixel, Wikipedia: "the broken black
  lines"), *C. joshi* / *C. magnifica*, *H. bullockii* / *H. iba*.
- **Not usable here** (rule C6): Nudi Pixel's pairs of species not confirmed here (11 of its 42 keep no member, such as
  its Californian and South African pairs), the red-spotted
  Australian mimicry ring of Rudman's pages, and every pair whose partner is not confirmed in the Philippines (§2).
- **The guide** (Gosliner, Valdés & Behrens 2018) would likely settle many of the "data only" pairs **[guess]**; it is
  not online.
- **The text sources are read by a rule, not by a person.** A sentence counts when it compares, names a species of the
  list and speaks of the look (a colour or pattern word, or a body part without an anatomy word: radula, jaw,
  reproductive system...); the species named before the comparing word are paired with those after it (§1.2). Most of
  the 37 text pairs read well (the quotes are in the file), a few do not: Wikipedia's *H. paradisa* sentence goes on to
  "its closest relatives are Hypselodoris skyleri and Hypselodoris katherinae", which pairs relatives, not look-alikes.
  A text pair is a pointer to its quote, to be read before any use.

## 6. How candidates could enter play

### 6.1 What the game reads today

- **The units are genera** (`SUBJECTS` seaslug `unitRank: 'genus'`, Pierre, 2026-11-16). Each genus's look-alikes are
  **every other genus of its family**, from the data (`core.js` `fishGenUnits`: `look` = the family's other genera). So
  *Chromodoris* already meets *Hypselodoris*, *Goniobranchus*, *Glossodoris*... as traps and duels, and the players'
  confusions then decide which (rule L7).
- **A species pair inside one genus changes nothing in today's game**: both are the same unit. Most of the strongest
  pairs are of this kind (*Chromodoris*, *Phyllidia*, *Nembrotha*). They matter for the species level (the fish's
  #975 first) and for the photo-level traps of FISH_PATH.md "Look-alikes at any rank" (designed, not built).
- **What could change play now**: a pair of genera from **two families** (no family seed links them), and the order of
  the same-family seeds (a family of 6 genera seeds 5 traps each; the candidates say which ones players will in fact
  mix up first). Engine support for a declared genus pair across families would be a small, subject-neutral change
  (`look` read from the data beside the family's siblings; rule S1) **[guess]**.
- **The sourced pairs across families, among the game's genera**: *Goniobranchus* / *Phyllidiella* (*G. geometricus*,
  a mimic of *P. pustulosa*: Nudi Pixel, Rudman), *Hexabranchus* / *Hypselodoris* and *Hexabranchus* / *Thorunna* (the
  juvenile *H. lacer*: Rudman 1999), *Coryphellina* / *Samla* (Nudi Pixel's *C. exoptata* group). iNaturalist adds
  *Goniobranchus* / *Hexabranchus* (PH 5, world 15), *Goniobranchus* / *Phyllidia* (PH 2, world 6), *Chromodoris* /
  *Nembrotha* (PH 2), and the slips and renames of §3.5.
- The only decided sea-slug pair, the two Spanish dancers, is inside *Hexabranchus*: it seeds nothing at the genus rank
  either.

### 6.2 Options

- **(a) Automatic above a threshold.** A pair whose iNaturalist count reaches a threshold (say 5 in the Philippines, or
  20 worldwide with a share of 10% or more on one side) becomes a decided pair at each build.
  - For: no work for anyone; it follows the data as iNaturalist grows.
  - Against: iNaturalist's counts measure identifiers' mistakes, rare species and much-photographed places weigh more,
    and a threshold is ours (rule C2: "never invent categories"). Pairs would come and go between builds.
- **(b) Proposed in the admin, accepted by Pierre.** The candidates shown on a sea-slug Look-alikes page (the fish have
  one: Auto / Manual, Shown / Hidden), each with its sources and counts; Pierre accepts or hides.
  - For: his eye on every pair.
  - Against: hundreds of species pairs (§2) for a game whose units are genera; the page does not exist for the sea slugs
    yet. Rule W10: a reminder once, never a list in the chat.
- **(c) Literature only.** Only the pairs a specialist source states (the Sea Slug Forum, Nudi Pixel's look-alike
  groups, a paper), both members confirmed in the Philippines, enter, as declared pairs. iNaturalist's counts rank
  them and are kept as evidence.
  - For: rule C2 at its strictest, the same standard as the corals (IMR, Coral Finder) and the fish (Pierre's declared
    groups). Small and stable.
  - Against: misses what only the data shows; the sources are uneven (Nudi Pixel's list holds Californian and South
    African pairs, the Forum stops in 2010).
- **(d) Both, by kind (recommended).** The literature pairs of (c) enter on their own as **declared** seeds (they stay
  grouped whatever the data says, as a teacher's pair does under Q350). The iNaturalist-only pairs that pass a threshold
  enter as **data** seeds, which the players' pooled confusions may drop (rule L7; data pairs under Q350).
  Cross-family genus pairs of either kind are added beside the family seeds. The admin page of (b) comes later, only if
  Pierre wants to edit them.
  - For: every pair carries its source (rule C2), species confirmed in the Philippines only (rule C6), nothing for
    Pierre to tick one by one, and the players' answers keep the last word as for every subject.
  - Against: it treats the specialists' word like a teacher's, which is Pierre's to decide; and it needs the small
    engine change of §6.1 before the cross-family pairs mean anything in play.

**Recommendation: (d)**, built in two steps: the declared and data seeds as data first (the tool writes them where the
game reads them, `seaslug.json`), the engine's cross-family genus pairs next; species pairs wait for the species level.

## 7. Searches run and pages read

All on 2026-11-17, 06:35-07:00 Manila, after Pierre's go (06:33). The queries hold only public scientific names and
general terms: no photo, no observation of ours, nothing from the sheet or the repository.

**Web searches** (14):
1. Chromodoris mimicry Layton Gosliner Wilson 2018 colour pattern Indo-Pacific black-lined
2. Phyllidiidae mimicry complex nudibranch look-alike species identification tubercles
3. Sea Slug Forum Rudman "colour group" Chromodoris quadricolor lineolata mimicry
4. Layton Carvajal Wilson 2020 "Chromodoris" mimicry exon capture "joshi" OR "colemani" OR "annae" Ecology and Evolution
5. Gosliner Behrens 1990 "Special resemblance, aposematic coloration and mimicry in opisthobranch gastropods" mimetic
   complexes
6. Hypselodoris bullockii apolegma iba mimic Epstein Gosliner phylogeny colour pattern
7. Goniobranchus red-reticulate colour group geometricus kuniei mimicry phylogeny nudibranch
8. Epstein Hallas Johnson Lopez Gosliner 2019 "Reading between the lines" Hypselodoris Zoological Journal Linnean
   Society mimicry abstract
9. Coryphellina rubrolineata exoptata cryptic species complex Ekimova 2022 Flabellina colour
10. Nembrotha species identification similar kubaryana cristata milleri lineolata chamberlaini distinguish Pola
    Gosliner
11. "Nudibranch & Sea Slug Identification" Indo-Pacific Gosliner Valdés Behrens "similar" species look-alike review
    excerpt
12. nudipixel nudibranch identification similar species confused Philippines Anilao look-alikes guide
13. seaslugforum "Mimics of Phyllidiella pustulosa"
14. nudibranch look-alikes how to tell apart Chromodoris annae magnifica willani lochi dive guide Philippines

Search 5 found the classic paper on mimicry complexes (Gosliner & Behrens 1990, a symposium chapter) only through
secondary pages: not read. Searches 11 and 12 found no public excerpt of the guide's "similar species" notes.

**Pages read**:
- Sea Slug Forum (<https://www.seaslugforum.net/>): the fact sheets of *Chromodoris annae* (`find/chroanna`), *C.
  willani* (`find/chrowill`), *C. quadricolor* (`find/chroquad`), *C. kuniei* (`find/chrokuni`), *C. geometrica*
  (`find/chrogeom`), *Glossodoris atromarginata* (`find/glosatro`), *Hypselodoris bullocki* (`find/hypsbull`),
  *Jorunna funebris* (`find/jorufune`), *Nembrotha kubaryana* (`find/nembkuba`), *Phyllidia elegans*
  (`find/phyleleg`), *P. varicosa* (`find/phylvari`), *Phyllidiella pustulosa* (`find/phylpust`); the pages "Mimicry"
  (`mimicry.htm`), "Aposematic colouration" (`find/aposemat`), "Mimicry - red-spotted chromodorids" (`redspot.htm`),
  "Chromodoris decora Colour Group" (`find/chrodeco1`); the message "Chromodoris dianae vs. C. lochi" (`find/20016`).
  HTTP 404: `find/chromagn`, `find/glosinci`, `find/chrodian`.
- Nudi Pixel, "Nudibranch Look-Alikes", <https://nudipixel.net/similarities> (the index; no comparison page opened).
- PMC: Layton, Carvajal & Wilson 2020 (PMC7664011); Stoffels et al. 2016 (PMC4978068).
- The Western Australian Museum's blog, "Unreliable colour patterns in seaslugs" (Kara Layton): it names no mimic.
- EurekAlert!, the California Academy of Sciences' release of 2018-10-29 (Epstein et al.).
- Crossref API, the records of 4 DOIs: 10.3390/d14040294, 10.1016/j.ympev.2018.02.008, 10.1093/zoolinnean/zly048,
  10.3989/scimar.2008.72n1145.
- **Not readable**, not fetched another way: PubMed (asks for cookies), Wiley's *Ecology and Evolution* page, CORE,
  DOAJ, MDPI (HTTP 403), two Plazi treatment links (a redirect page only), ZooKeys' article page (its text not in the
  page), *Scientia Marina* (HTTP 503, twice).

## 8. Question for Pierre

Context: the survey found 30 look-alike pairs named by a specialist source (the Sea Slug Forum, Nudi Pixel, papers)
between two species of the game, and 56 more that only iNaturalist's confusions show. The game plays genera
today, so only a few would change it now: four pairs of genera from two families, *Goniobranchus* / *Phyllidiella*
(the phyllidiid mimic), *Hexabranchus* with *Hypselodoris* and *Thorunna* (the juvenile Spanish dancer), *Coryphellina*
/ *Samla* (§6.1). The rest wait for the species level.

**Question**: should the pairs a specialist source names enter the game on their own, as declared look-alikes (kept
whatever the players' answers say), and the pairs only iNaturalist's confusions show enter as data look-alikes that
the players' answers can drop? Or would you rather see each one first?

**Recommendation**: yes to the first, option (d) of §6.2.
