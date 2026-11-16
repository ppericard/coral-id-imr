# Sea slugs: the well-known species without a name (study, 2026-11-17)

Read-only study for the sea-slug subject (ROADMAP "More subjects"). **It changes no app code, data file, photo or
account.** Pierre, 2026-11-17 ~06:29 Manila, in French:

> "Pour ce qui est des limaces de mer, alors quelques petites spécificités, on va dire, de ces bestioles. Premièrement,
> c'est qu'en fait il y a beaucoup de nudibranches ou limaces de mer qui ne sont pas identifiées correctement à l'espèce.
> Alors j'entends par là que souvent ils savent que c'est une espèce, mais l'espèce elle n'a pas de nom, et en fonction
> des livres d'identification ça va être telle espèce, SSP, et puis après un numéro, numéro 1, numéro 2, numéro 3. Donc
> en gros on dit que c'est une espèce, c'est une subspecies de ce genre, mais on ne sait pas, on n'a pas de nom à lui
> donner en fait. Et donc typiquement dans une naturaliste, comment ça se représente? Ça se représente par des
> nudibranches qui sont assignées au niveau du genre, par plein de gens, mais pas au niveau de l'espèce. Alors que
> pourtant, c'est une espèce qui est bien identifiée. Donc ça, je ne sais pas comment résoudre complètement le problème.
> Donc ça, peut-être tu pourrais regarder comment on pourrait résoudre le problème. Mais du coup, si on se limite aux
> nudibranches au niveau de l'espèce dans Innaturalist, ben en fait on va passer à côté de plein d'espèces qui sont bien
> identifiées, bien connues, mais qui ne sont pas identifiées à l'espèce dans Innaturalist, parce qu'en fait
> Innaturalist ne sait pas gérer les espèces où on n'a pas de nom d'espèce."

In short: many sea slugs are well-known species with no name yet ("*Genus* sp. 1, sp. 2…" in the guides); on
iNaturalist they stay at the genus, so a subject built on species-level observations misses them. Then, on web searches
(~06:33): "Ben oui! Pourquoi t'as besoin de mon autorisation?"; ~06:34: "Typiquement pour les nudibranches il faut aller
chercher d'autres sources à mon avis."; ~06:37: "Sans oublier les autres sources généralistes bien sûr ?"

Labels (rule W11): **[measured]** = counted by a script today; **[read]** = taken from a page or a record;
**[search]** = only a search engine's summary, the page not read; **[guess]** = my judgement.

**Data pulls, 2026-11-17, 06:30-07:30 Manila** (scripts and data in the session's scratch space, not committed; no
observer id or name is written here, observer counts are aggregates):
- **iNaturalist API**, through `tools/inat.py` (rule C7: 1 s between requests, the project's User-Agent, paced
  retries): **62 requests to `api.inaturalist.org`** (34 of them the pages of 200 observations below; the rest counts,
  projects, taxa) and **5 to `www.inaturalist.org`** (observation fields' JSON).
- **WoRMS REST API**: 76 requests (0.3 s apart), the accepted species of 33 genera.
- **GBIF occurrence API**: 47 requests (1 s apart), the Philippine records of three specialist datasets.
- **Web** (allowed by Pierre at ~06:33; queries hold only public scientific names and general terms): 9 searches and 10
  page reads, listed in Appendix B. Pages that refused (HTTP 403) are listed and were not fetched another way.
- The subject's roots and area are `tools/seaslug_source.json`'s: Nudibranchia, Sacoglossa, Cephalaspidea,
  Pleurobranchida, Aplysiida; the Philippines (place 6873, Q369 b).

## 1. Summary

1. **The gap is real and large.** 6,764 verifiable sea-slug observations in the Philippines stop at the genus (Research
   Grade 44, Needs ID 6,720): **18% of the 38,034**, against 30,304 at the species or below **[measured]**.
2. **A fifth of them say which unnamed species they are.** **1,341 (20%)** carry a numbered label, "*Genus* sp. N", in
   their description, a comment, an identification remark or an observation field; 1,525 (23%) any informal mention
   (numbered, cf./aff., "undescribed", a guide cited). The labels name **337 informal species in 92 genera**; **60 are
   labelled by 3 or more distinct observers** (911 observations) **[measured]**.
3. **The guide is the shared reference.** 758 of the labelled observations cite Gosliner, Valdés & Behrens 2018
   ("NSSI2", the 2nd edition of *Nudibranch & Sea Slug Identification – Indo-Pacific*), 12 the 1st edition (2015), 46 the
   book without an edition **[measured]**. But **the numbers change between books and editions**: one *Gymnodoris* is
   sp. 51 in the 2018 guide, sp. 12 in the 2008 one, sp. 6 in Debelius & Kuiter 2007 and sp. 2 on the Sea Slug Forum
   **[read]** (§3.3).
4. **One unnamed species dominates: *Goniobranchus* sp. 5 of Soong et al. (2020)**, the red-reticulate *Goniobranchus*
   long called *G. reticulatus*. iNaturalist's identifiers mark it with a dedicated observation field: **462 Philippine
   observations, 180 distinct observers** (22 near Dauin), 951 worldwide; *G. reticulatus* itself keeps 1 Research Grade
   observation in the Philippines **[measured]**. By observers it would be about the 4th most common sea slug of the
   country (after *Chromodoris annae* 262, *Nembrotha kubaryana* 251, *C. willani* 203).
5. **Other causes keep observations at the genus too**, without any label: cryptic complexes split by DNA
   (*Phyllidiella*, 503 observations, 0 numbered; *Costasiella*, 320, 0 numbered) and plain disagreement (1,083 of the
   6,764 carry a current species-level identification that the community did not follow) **[measured]**.
6. **iNaturalist has no placeholder taxa for them** and its community keeps them at the genus by policy; the specialist
   datasets on GBIF (Nudi Pixel, seaslug.world, the California Academy's specimens) carry **no** "sp. N" name in the
   Philippines; Nudi Pixel shows its 6,422 "undescribed" photos as "*Genus* sp." without a number **[measured, read]**.
7. **Names do come, and iNaturalist follows fast.** Of 43 species described since 2019 in the 33 genera with labels
   used by 3 or more observers (WoRMS), 7 already have Philippine observations at species level, *Tenellia nakapila* (53
   Research Grade, "sp. 20 in NSSI2" according to an iNaturalist identifier), *T. bughaw* (50), *T. puti* (29) and
   *Goniobranchus fabulus* (28) among them, all four already in the subject's circle 3 **[measured]**.
8. **Today the game's units are genera** (Pierre, 2026-11-16), so the gap bites in two places now: the genus units'
   photos (candidates are species-level observations only: 2,686 well-agreed genus-level observations with a usable
   licence wait in 69 of the 78 genera) and **16 genera that never enter** because none of their species is confirmed
   (*Eubranchus*: 181 genus-level observations by 54 observers) **[measured]**. The unnamed species as units only matter
   once the species become units.
9. **Recommendation** (§5): photos of the genus units from agreed genus-level observations now; at the species level,
   *Goniobranchus* sp. 5 (Soong et al. 2020) first, through its observation field; the guide's numbered species only
   through a list Pierre checks against the book. Each needs Pierre's go (presence rule C8, the candidate rule): the
   question in §6.

## 2. Measuring the gap

### 2.1 Where the observations stop [measured]

| Verifiable sea-slug observations, the Philippines | Count |
|---|---|
| All (Research Grade + Needs ID) | 38,034 |
| At the species or below | 30,304 (Research Grade at the species: 28,062) |
| **At the genus** | **6,764** (Research Grade 44, Needs ID 6,720), 161 genera |
| Above the genus (family, order…) | 966 |

The 6,764 by group: Nudibranchia 5,416, Sacoglossa 1,037, Cephalaspidea 246, Aplysiida 53, Pleurobranchida 12. Research
Grade at the genus is rare: an observation reaches it only when the community votes that it cannot be improved.

### 2.2 What the genus-level observations say (method)

- **Pulled**: all 6,764 (34 pages of 200, ordered by id), with their description, tags, observation fields, comments,
  identification remarks and species guess.
- **A numbered label** is "*Genus* sp. N" ("sp. 5", "sp.5", "sp 5", "sp. #5", "Sp. 37, p. 78"), the genus written in the
  text or else the observation's own. Per observation, the label written most often, the observer's description first.
- **Its source**, from the same text: "NSSI2" / "2nd ed." / "2018" → the 2018 guide; "NSSI1" / "2015" → its 1st edition;
  "NSSI" or "Gosliner" alone → the book, edition not said; "Soong" → Soong et al. 2020; also the observation field of
  §3.1. Papers named in 10 or more observations: Soong et al. 2020 (447), Martín-Hervás et al. 2021 (*Thuridilla*, 15),
  Gosliner et al. 2015 (11); single ones (Papu et al. 2022 on *Phyllidiella*, Korshunova 2017, Cunha 2023…).
- **Hedged**: a label written with "?", "maybe", "possibly", "probably", "could", "similar", "cf.", "or 7". **562 of the
  1,341** are hedged. The counts below drop them unless said ("unhedged").
- The parser is approximate **[guess]**: a "sp. 2" written about another genus in a comment can be attributed to the
  observation's genus; a few labels may be read twice with different spellings. The order of magnitude holds; a list
  for the game would be checked by hand (§4).

### 2.3 Where the label is written [measured]

Observations whose informal mention sits in (one observation can count in several):

| Field | Observations |
|---|---|
| The observer's description | 763 |
| An observation field (§3.1) | 447 |
| An identification remark | 216 |
| A comment | 191 |
| A tag | 82 (mostly place tags; 6 "cf." tags) |
| The species guess (iNaturalist's "placeholder") | 4 |

### 2.4 Per genus: the 20 with the most genus-level observations [measured]

"Labelled" = a numbered label; "labels" = distinct informal species; "observers" = distinct owners of the observations
carrying the label; "species ID not followed" = a current species-level identification on the observation.

| Genus | At the genus | RG | Any informal mention | Labelled | Labels | Top labels (observations, observers) | Species ID not followed |
|---|---|---|---|---|---|---|---|
| *Goniobranchus* | 650 | 7 | 506 | 499 | 11 | sp. 5 (461, 180); sp. 42 (13, 8); sp. 32 (7, 4) | 224 |
| *Phyllidiella* | 503 | 2 | 11 | 0 | 0 | — (cf. *annulata* 4, cf. *pustulosa* 2) | 46 |
| *Tenellia* | 324 | 1 | 107 | 96 | 37 | sp. 6 (21, 4); sp. 18 (5, 4); sp. 64 (6, 2) | 17 |
| *Costasiella* | 320 | 1 | 7 | 0 | 0 | — | 62 |
| *Coryphellina* | 229 | 0 | 13 | 4 | 2 | sp. 2 (3, 1) | 70 |
| *Elysia* | 227 | 2 | 36 | 31 | 12 | sp. 37 (6, 4); sp. 2 (5, 3); sp. 21 (4, 3) | 35 |
| *Marionia* | 206 | 0 | 48 | 41 | 14 | sp. 6 (16, 4); sp. 13 (8, 3); sp. 15 (4, 3) | 15 |
| *Chromodoris* | 200 | 0 | 12 | 4 | 3 | sp. 19 (2, 1) | 88 |
| *Eubranchus* | 181 | 3 | 47 | 44 | 14 | sp. 23 (16, 8); sp. 28 (5, 5); sp. 10 (4, 4) | 3 |
| *Gymnodoris* | 175 | 2 | 42 | 40 | 25 | sp. 37 (4, 2); sp. 19 (3, 2) | 22 |
| *Aegires* | 170 | 5 | 51 | 46 | 6 | sp. 6 (16, 7); sp. 7 (19, 6); sp. 8 (7, 5) | 7 |
| *Nembrotha* | 146 | 0 | 11 | 8 | 3 | sp. 2 (4, 3); sp. 1 (3, 2) | 22 |
| *Glossodoris* | 142 | 0 | 17 | 9 | 3 | sp. 1 (7, 3) | 46 |
| *Hypselodoris* | 132 | 0 | 25 | 16 | 7 | sp. 12 (6, 2); sp. 4 (2, 2) | 53 |
| *Doto* | 127 | 2 | 28 | 24 | 6 | sp. 6 (8, 4); sp. 1 (4, 4); sp. 3 (6, 3) | 9 |
| *Thuridilla* | 119 | 0 | 17 | 13 | 4 | sp. 6 (5, 5); sp. 7 (5, 4) (both Martín-Hervás et al. 2021) | 37 |
| *Favorinus* | 109 | 1 | 23 | 23 | 7 | sp. 2 (12, 5); sp. 10 (3, 3) | 5 |
| *Stiliger* | 103 | 2 | 45 | 44 | 9 | sp. 1 (16, 9); sp. 5 (7, 5); sp. 9 (9, 4) | 13 |
| *Polycera* | 92 | 0 | 25 | 21 | 5 | sp. 3 (16, 4) | 6 |
| *Phyllidia* | 90 | 0 | 5 | 3 | 3 | single labels | 39 |

Three kinds of genus-level observation show up **[guess, from reading the comments]**:
- **an unnamed but recognisable species** (Pierre's case): *Goniobranchus* sp. 5, *Stiliger* sp. 1, *Aegires* sp. 6
  and 7, *Thordisa* sp. 11, *Eubranchus* sp. 23;
- **a cryptic complex split by DNA**, where photos no longer separate the species: *Phyllidiella* (a comment cites Papu
  et al. 2022 on the *P. pustulosa* complex), *Costasiella* (*kuroshimae*, *usagi*, *paweli* disputed; "We'll have news
  about this group soon");
- **plain uncertainty** (a poor photo, an identifier's disagreement): *Chromodoris*, *Coryphellina*, *Hypselodoris*.

### 2.5 The informal species, by how many people record them [measured]

| Distinct observers whose observation carries the label | Labels, all | Labels, unhedged | Of the unhedged: 6 or more observations with a CC0 / CC BY / CC BY-NC photo |
|---|---|---|---|
| 1 or more | 337 (1,341 obs.) | 301 (1,224 obs.) | — |
| 2 or more | 127 (1,087) | — | — |
| **3 or more** | **60 (911)** | **50 (837)** | **13** |
| 5 or more | 15 (629) | 12 (595) | 7 |

- With 2 or more observers near Dauin (40 km): 3 labels (*Goniobranchus* sp. 5 with 22, *Stiliger* sp. 1, *Doto* sp. 6).
- Without *Goniobranchus* sp. 5, the unhedged labels at 3 or more observers hold 376 observations: about 8 each.
- The 20 most recorded, and the cf./aff. labels: Appendix A.

## 3. How the community records them

### 3.1 On iNaturalist

- **No placeholder taxa.** iNaturalist's taxonomy holds published names only; undescribed species are recorded at the
  genus ("It is site policy to not include undescribed or unnamed taxa into its taxonomy database… they should be
  entered at the genus") **[search: iNaturalist forum threads; the Curator Guide answered 403]**. A name search for
  "*Goniobranchus* sp", "*Hypselodoris* sp", "*Thordisa* sp", "*Stiliger* sp" finds only described species
  **[measured]**. A name typed that matches no taxon becomes a "placeholder", lost once someone adds an identification
  **[search]**: 4 of our observations keep one.
- **Observation fields.** iNaturalist users' answer to undescribed species is a field holding the working name
  **[read: forum thread "How do people keep track of undescribed species?", 2024-02]**. For our sea slugs **one field
  exists and is used at scale**: "*Goniobranchus* sp. 5 in Soong et al., 2020?" (field 18499, created 2024-10-07, values
  Yes / No, "Answer if yes only") on 462 Philippine observations, 951 worldwide **[measured]**. Its observations sit at
  the genus, with an identifier's remark repeated on many: "*reticulatus* doesn't match the original description. It's an
  undescribed species, listed as *Goniobranchus* sp. 5 in Soong et al., 2020" **[read]**. No field names the guide: a
  field search for "NSSI" or "Gosliner" finds none; "undescribed" finds 24 generic or other-group fields, none used on our
  6,764 **[measured]**.
- **Projects.** "Seaslugs of the World" (625 of the 6,764; "the allowable species list is the same as the
  SeaslugForum's") and "Undescribed Species on iNaturalist" (21: "a global project dedicated to undescribed taxa observed
  on iNaturalist") **[read]**. A project search for "undescribed nudibranch", "NSSI" or "nudibranch sea slug
  identification" finds none **[measured]**.
- **Free text, mostly.** The guide's numbers live in descriptions ("*Gymnodoris* sp. 61 in NSSI2"), comments and
  identification remarks, often hedged ("Could it be *Phyllidia* sp. 3 in NSSI2?") and sometimes disputed in the thread
  ("No, it is not sp. 1 in NSSI2. Colors in some positions are different.") **[read]**.

### 3.2 The specialist sources

- **The guide.** Gosliner, Valdés & Behrens, *Nudibranch & Sea Slug Identification – Indo-Pacific*, 2nd ed., New World
  Publications, November 2018: "illustrates 2,138 Indo-Pacific nudibranchs and sea slugs, including many undescribed
  species" **[search: publisher and bookseller listings]**. The 1st edition is 2015; before it, *Indo-Pacific Nudibranchs
  and Sea Slugs* (Gosliner, Behrens & Valdés 2008). A bookseller says the 2nd edition "has sold out and become outdated"
  **[search]**. **No 3rd edition was found** **[search]**; 4 of our observations write "NSSI3", a slip or an edition the
  searches did not find: unresolved.
- **How the books number them.** Within a genus, in the book's order, renumbered from edition to edition. Examples:
  - *Doriprismatica balut* Matsuda & Gosliner, 2018 (holotype from Mabini, Batangas) was "*Glossodoris* sp. 1 Gosliner et
    al. 2008: p. 234", then "*Doriprismatica* sp. 1 Gosliner et al. 2015: p. 239" and "*Doriprismatica* sp. A Matsuda &
    Gosliner 2017" **[read: Plazi treatment of Matsuda & Gosliner 2018, Zootaxa 4444(5)]**;
  - *Hypselodoris variobranchia* was *Hypselodoris* sp. 6 in Gosliner et al. 2008 **[search: Plazi treatment's summary]**;
  - one *Gymnodoris*: sp. 51 (Gosliner et al. 2018), sp. 12 (2008), sp. 6 (Debelius & Kuiter 2007), sp. 2 (Sea Slug
    Forum) **[read: underwaterkwaj.com, "Seaslug species numbers"]**. That site gives up on book numbers and uses its own
    (a place letter and a number: "a" for Anilao).
- **Papers number their own clades**, unrelated to the guide's numbers: Soong, Wilson & Reimer 2020 (*Marine
  Biodiversity* 50: 25) found five species-level clades in the red-reticulate *Goniobranchus*, "none… matched exactly
  with the original descriptions of *G. tinctorius* or *G. reticulatus*" **[search: the abstract's summary]**; a 2021
  ZooKeys inventory (Koh Tao) cites "*Goniobranchus* sp. 5 (Soong et al. 2020)" from the Philippines, Indonesia, Japan and
  Australia **[search]**. *Thuridilla* sp. 6 and sp. 7 are Martín-Hervás et al. 2021's; *Phyllidiella* "sp. d" Papu et
  al. 2022's **[read: on the observations]**.
- **The Sea Slug Forum** (Rudman) named undescribed species "*Genus* sp. 1" on its own fact sheets ("*Nembrotha* sp. 1",
  "*Godiva* sp. 1"); a sheet later notes when the species "has now been named" **[search: its pages' summaries]**. Its
  numbers are the Forum's, not the guide's (the *Gymnodoris* above).
- **Nudi Pixel** has an "Undescribed Species" section: 6,422 photos, each "*Genus* sp.", no number and no guide reference
  **[read: nudipixel.net/pictures/undescribed]**.
- **New species from divers' photos.** *Phyllidia ovata* and *P. fontjei* (Wägele et al. 2025, ZooKeys 1245) were
  described with help from photos on iNaturalist, Nudi Pixel and the Sea Slug Forum; *P. ovata* "with most sightings in
  Taiwan, Indonesia, and the Philippines" **[search: press releases]**.
- **Scale.** A 2024 PeerJ paper on soft-sediment Fionidae estimates "approximately 105 of the 120 fionid species"
  undescribed **[search; the page answered 403]**: *Tenellia*, our 3rd genus by genus-level observations, is a fionid.

### 3.3 The general sources

- **WoRMS** holds described species only. In the 33 genera of the labels at 3 or more observers (*Doto* and *Marionia*
  did not resolve by name), **43 accepted species carry an authority of 2019 or later** **[measured]**.
- **iNaturalist picks the new names up**: 7 of the 43 have Philippine species-level observations: *Tenellia nakapila*
  53 Research Grade, *T. bughaw* 50, *T. puti* 29, *Goniobranchus fabulus* 28, *Elysia aowthai* 5, *Nembrotha lorosae*
  3, *Jorunna daoulasi* 1 **[measured]**. An identifier writes on one observation that "*Tenellia nakapila* is sp. 20 in
  NSSI2" **[read]**. Six of the seven are already in `tools/seaslugs.json` (*T. nakapila*, *T. bughaw*, *T. puti*
  and *G. fabulus* in circle 3, *E. aowthai* and *N. lorosae* in the rest): the build takes a species in as soon as it
  is named and observed.
- **GBIF**, the Philippine records of the specialist datasets: Nudi Pixel 6,844 (1,161 at the genus), the California
  Academy of Sciences' specimens 4,121 (1,374), seaslug.world 1,198 (191). **None** has "sp." in its verbatim name
  **[measured]**: the informal number does not travel to GBIF.
- **Wikipedia**, "*Goniobranchus reticulatus*", cites Soong et al. (2020): "The complex consists of at least 7 species";
  the species "has been widely reported from the Indo-West Pacific Ocean" but "many of these records are now believed to
  be of distinct species" **[read]**. It gives no "sp. N".

## 4. Options

Common to all: today the units are genera (Pierre, 2026-11-16), and species become units later. An unnamed species
matters as a **unit** only then; **now** it matters for the genus units' photos and for the genera that never enter.
"Photos" below = observations with a CC0, CC BY or CC BY-NC photo (rule P1), in the Philippines.

### (a) Units from the guide's numbers, mapped automatically from the observations' labels

- **What it needs**: a parser like §2.2 in the build; species units.
- **Numbers**: 50 unhedged labels at 3 or more observers (837 observations); 13 with the start of 6 photos; 12 at 5 or
  more observers.
- **Risks**: rule **C2**: the category is the guide's, but the mapping is the observers' free text, 42% hedged, across
  editions whose numbers differ (§3.2); merging "sp. 5" written for two editions would invent a species. **C5**: each
  disagreement (§3.1's disputes; *Goniobranchus* sp. 5 written for both Soong et al. and NSSI2, 15 observations) is a
  point to settle, many of them. **C8**: these observations are Needs ID, which confirms nothing; no informal species can
  reach Research Grade, so presence needs a rule of its own. **P4**: unchanged (one observation per question). **The
  judging** rates photos, not identity: identity would rest on one person's label.
- **Players see**: "*Stiliger* sp. 1 (Gosliner et al. 2018)". **Not recommended.**

### (b) Units from the guide, picked by a curator (Pierre)

- **What it needs**: the book (2nd edition) in hand; per species, Pierre confirms the label against the guide's page and
  ticks the observations to use (an admin list built from §2.5's candidates); species units.
- **Numbers**: the same supply as (a), 13 species ready at the start of 6 photos, more as Pierre adds observations.
- **Risks**: C2 holds (the guide's category and page cited per unit; nothing copied from the book: a number and a page
  are a citation **[guess]**, Pierre's call on rights); C5 points stay few (he settles them as he picks); C8 needs a rule
  for curator-confirmed species (Needs ID only); the cost is Pierre's time, about 13-50 species × 6-20 observations.
- **Players see**: "*Aegires* sp. 6 (Gosliner et al. 2018, p. N)"; the unit keeps a stable id and is renamed when the
  species is described (the Tree's "stable ids with a forwards table for renames").

### (c) Keep them out as units until named; their observations become photos of the genus units

- **What it needs**: `tools/fetch_seaslugs.py` taking, for a genus unit, genus-level observations agreed by 2 current
  identifications at or below the genus (or Research Grade at the genus), beside the species-level ones; the same judging.
- **Numbers**: **2,686 observations in 69 of the 78 genera** (*Goniobranchus* 404, *Phyllidiella* 314, *Costasiella*
  241, *Coryphellina* 145, *Tenellia* 140, *Elysia* 115, *Chromodoris* 110…). No species unit gained; named species
  enter at the next build as today (7 since 2019).
- **Risks**: C2, C5 none (the genus is the community's); C8 unchanged (a genus is in by its confirmed species); identity
  at the genus is weaker than Research Grade; variety: the genus's photos lean to its unnamed species, which is what
  divers meet (*Goniobranchus* sp. 5). It changes a decided candidate rule (Research Grade at the species): Pierre's go.
- **Players see**: no new name; more photos of the genus.

### (d) What the data suggests: a species defined by a paper and marked by iNaturalist's own field

- **What it needs**: a unit read from an observation field that iNaturalist's identifiers keep, when a published source
  defines the species. Today exactly one: ***Goniobranchus* sp. 5 (Soong et al. 2020)**, field 18499.
- **Numbers**: 462 Philippine observations, 180 observers, 321 with a usable photo, 22 observers near Dauin, 951
  worldwide: about the 4th sea slug of the country by observers. As a game unit only at the species level; until then,
  through (c), the 404 photos of *Goniobranchus* mostly show it.
- **Risks**: C2 low (a paper's species, the community's mapping); C5 one point (the guide's "sp. 5" written beside it on
  15 observations, and the *G. reticulatus* name the guides gave it); C8 needs the same rule as (b) (its observations are
  Needs ID); the field is a question ("…?") answered Yes by whoever sets it **[guess: its setters were not counted]**.
- **Players see**: "*Goniobranchus* sp. 5 (Soong et al. 2020)", with "formerly *G. reticulatus* in the guides" on its
  sheet (rule C1's "Other sources" style).

### (e) The genera that never enter

- 16 genera have genus-level observations by 3 or more observers and no confirmed species (509 observations):
  *Eubranchus* (181 observations, 54 observers), *Tritonia* (78, 21), *Facelina* (56, 22), *Lomanotus* (24, 17),
  *Godiva* (31, 12), *Mourgona* (25, 11)… **None has 3 Research Grade observers at the genus**, so rule C8 cannot confirm
  them; letting genus-level observers count for a genus is a change of C8, Pierre's **[measured]**.

| Option | Units gained | Photos, the Philippines | Pierre's go needed for |
|---|---|---|---|
| (a) automatic guide numbers | 13 at the start, up to 50 | 6-461 each | C8 rule; not recommended |
| (b) curated guide numbers | 13, more as Pierre adds | as (a), checked | C8 rule, his time, the book |
| (c) genus units' photos | 0 (photos only) | 2,686 in 69 genera | the candidate rule |
| (d) paper + iNat field | 1 now (*Goniobranchus* sp. 5) | 321 | C8 rule |
| (e) genera at genus level | 16 genera | 509 observations | C8 change |

## 5. Recommendation [guess]

1. **Now: (c)**, agreed genus-level observations as candidate photos of the genus units, on the same judging. It brings
   the unnamed species into play where players meet them (the genus) with no invented category.
2. **At the species level: (d) first**, *Goniobranchus* sp. 5 (Soong et al. 2020), then **(b)** for the guide's
   numbered species only if Pierre has the 2nd edition and wants to check them; never (a).
3. **Presence for (b) and (d)**: a rule of its own, as C8's spirit: 3 or more distinct observers whose observation
   carries the confirmed label (the field, or Pierre's tick), in the Philippines. (e) waits.
4. **Watch the names**: each rebuild of `tools/seaslugs.json` picks up the newly described species; a unit from (b) or
   (d) keeps its id and takes the name when it comes.

## 6. Question for Pierre (French-ready)

**Limaces sans nom.** Environ 6 800 observations iNaturalist des Philippines restent au genre ; une sur cinq porte un
numéro du livre (« *Stiliger* sp. 1 in NSSI2 ») ou d'un article. La plus fréquente de loin est *Goniobranchus* sp. 5
(Soong et al. 2020, l'ancien « *G. reticulatus* ») : 180 observateurs aux Philippines, marquée par un champ iNaturalist.
**Je propose : (1) dès maintenant, les observations au genre bien identifiées (2 identifications d'accord) deviennent des
photos des genres du jeu (+2 700 photos) ; (2) au niveau espèce, *Goniobranchus* sp. 5 d'abord, puis les « sp. N » du
Gosliner 2018 que tu vérifierais dans le livre, avec une règle de présence à part (3 observateurs avec l'étiquette),
puisque ces espèces ne peuvent pas atteindre le Research Grade. D'accord ? Et as-tu le livre (2e édition, 2018) ?**

What needs his go: the candidate rule (Research Grade at the species) for (1); a presence rule beside C8 for (2); his
time and the book for the guide's numbers (citing a number and a page, nothing copied).

## Appendix A. The 20 informal species recorded by the most observers (unhedged), and the cf./aff. labels [measured]

Observations with the label; distinct observers; observations with a usable photo; source as written.

| Label | Obs. | Observers | Usable photo | Source written |
|---|---|---|---|---|
| *Goniobranchus* sp. 5 | 461 | 180 | 321 | Soong et al. 2020 (445, field), NSSI2 (15) |
| *Stiliger* sp. 1 | 16 | 9 | 7 | NSSI2 |
| *Goniobranchus* sp. 42 | 12 | 8 | 4 | NSSI2 |
| *Thordisa* sp. 11 | 17 | 7 | 11 | NSSI2 (14), others |
| *Aegires* sp. 6 | 16 | 7 | 6 | NSSI2 |
| *Cratena* sp. 2 | 14 | 7 | 4 | NSSI2 |
| *Eubranchus* sp. 23 | 15 | 7 | 11 | NSSI2 |
| *Aegires* sp. 7 | 18 | 6 | 9 | NSSI2, NSSI |
| *Verconia* sp. 5 | 7 | 5 | 4 | NSSI2 |
| *Eubranchus* sp. 28 | 5 | 5 | 3 | NSSI2 |
| *Stiliger* sp. 5 | 7 | 5 | 6 | NSSI2 |
| *Aegires* sp. 8 | 7 | 5 | 2 | NSSI2 |
| *Thuridilla* sp. 6 | 4 | 4 | 2 | Martín-Hervás et al. 2021 |
| *Doto* sp. 6 | 8 | 4 | 2 | NSSI2 |
| *Marionia* sp. 13 | 9 | 4 | 7 | NSSI2 |
| *Aldisa* sp. 9 | 5 | 4 | 1 | NSSI2, NSSI |
| *Caloria* sp. 4 | 11 | 4 | 3 | NSSI2 |
| *Doto* sp. 1 | 4 | 4 | 3 | mixed |
| *Favorinus* sp. 2 | 8 | 4 | 2 | NSSI2 |
| *Stiliger* sp. 9 | 9 | 4 | 4 | NSSI2 |

Hedged labels left out of this table but recorded by many: *Tenellia* sp. 6 (21 observations, 4 observers), *Marionia*
sp. 6 (16, 4), *Polycera* sp. 3 (16, 4), *Ceratosoma* sp. 1 (14, 4). The cf. labels: *Tergiposacca* cf. *perspicua* 6,
*Phyllidiella* cf. *annulata* 4, *Chromodoris* cf. *striatella* 3, *Glossodoris* cf. *cincta* 3 (+2 spelled "cinta"),
*Goniobranchus* cf. *reticulatus* 3, *Ceratodoris* cf. *kendi* 3.

## Appendix B. Searches and pages (2026-11-17)

**Web searches** (9; public scientific names and general terms only):
1. iNaturalist undescribed species taxon placeholder curator policy
2. "Nudibranch & Sea Slug Identification" Indo-Pacific 3rd edition Gosliner undescribed species numbered
3. Soong 2020 Goniobranchus reticulatus complex "sp. 5"
4. new species nudibranch described "Gosliner et al. 2018" "sp." Philippines previously referred to as
5. Nudi Pixel undescribed species numbering "sp." Gosliner guide numbers
6. Nudibranch Sea Slug Identification Indo-Pacific third edition 2025 New World Publications
7. nudipixel "undescribed species" page sea slug
8. Sea Slug Forum Rudman undescribed species "sp. 1" naming convention
9. Phyllidia fontjei Phyllidia ovata 2025 ZooKeys described citizen science iNaturalist photos

**Pages read**:

| Page | Read |
|---|---|
| <https://www.underwaterkwaj.com/nudi/numbering.htm> (numbering across references) | yes |
| <https://tb.plazi.org/GgServer/xhtml/140387BF486AF00B0D88FA48FC42F841> (*Doriprismatica balut*) | yes |
| <https://tb.plazi.org/GgServer/xhtml/411BF606FFC9FF93FC74FB78FAAC6BE3> (*Hypselodoris rositoi*, Epstein et al. 2018) | yes; no earlier informal name in it |
| <https://tb.plazi.org/GgServer/html/140387BF486AF00B0D88FA48FC42F841> | a redirect page only |
| <https://nudipixel.net/>, <https://nudipixel.net/pictures/undescribed> | yes |
| <https://forum.inaturalist.org/t/how-do-people-keep-track-of-undescribed-species/48884> | yes |
| <https://en.wikipedia.org/wiki/Goniobranchus_reticulatus> | yes |
| <https://www.inaturalist.org/pages/curator+guide> | no: HTTP 403 |
| <https://peerj.com/articles/18517> (Fionidae, 2024) | no: HTTP 403 |

**Sources cited from search summaries only** (not read): the iNaturalist forum threads "Is there a way to denote an
undescribed species on iNat?" and "Adding undescribed taxa to the iNat taxonomy"; the bookseller listings of the guide
(Blackwell's, NHBS, REEF, Noonsite); the Sea Slug Forum fact sheets (`seaslugforum.net/find/nembsp1`, `godisp1`,
`hopksp`); the Plazi treatment of *Hypselodoris variobranchia*; Soong, Wilson & Reimer 2020 and the 2021 ZooKeys Koh
Tao inventory; the press releases on Wägele et al. 2025 (EurekAlert, Leibniz-LIB).

**API endpoints**: iNaturalist v1 `observations` (with `per_page=0` counts, `field:` filters), `observations/
species_counts`, `projects`, `projects/{ids}`, `taxa/autocomplete`, `taxa`; `www.inaturalist.org/observation_fields.json`
and `/observation_fields/18499.json`; WoRMS `AphiaIDByName`, `AphiaChildrenByAphiaID`; GBIF `occurrence/search`.
