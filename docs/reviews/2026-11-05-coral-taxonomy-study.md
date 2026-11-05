# Coral taxonomy as it stands (2026-11-05): sources, genus-level changes, the Astrea case, and a reference file for IMR Reef ID

Read-only study for Pierre. No repository file was changed. Written from the point of view of a scleractinian taxonomist who also builds biodiversity databases. Rule 1 holds throughout: where the IMR lecture differs from a reference, this study lists it as a question for an IMR trainer and never says the lecture is wrong.

## 0. Short answer

- **No synonym is hiding Astrea on iNaturalist.** iNaturalist moved *Montastrea curta* to *Astrea curta* and *Montastrea annuligera* to *Astrea annuligera* on 2016-08-08, and split *Plesiastrea* into *Astrea* and *Plesiastrea* on 2016-08-09. Each change cites Huang et al. 2014. A swap moves every observation automatically, so old names hold no observations. iNaturalist has **0 Astrea observations in the Philippines** in any grade, and no Philippine observation carries a current Astrea identification. The only Astrea identification found there had been withdrawn, on what is now a *Favites magnistellata* observation. There are 0 within 250 km of Dauin, and the nearest is in Sabah, 704 km away. All 480 Astrea observations worldwide were checked one by one.
- **Taxonomy does play a part, but through how far the genus reaches, not through its name.** The IMR lecture describes Astrea as "formerly Montastrea / Phymastrea", and slide 62 says "refer to Astrea / Phymastrea". WoRMS split Veron's Indo-Pacific *Montastraea* four ways in 2014: *Astrea* (curta, annuligera), *Favites* (colemani, valenciennesii, magnistellata, which had passed through *Phymastrea*), *Paramontastraea* (salebrosa) and *Micromussa* (multipunctata). The *Favites* species of that old group do occur in the Philippines on iNaturalist: 19 observations, 10 Research Grade, 2 within 40 km of Dauin. **The app already shows 4 *Favites colemani* photos under Favites.** If IMR trainers label these corals "Astrea" in ReefCloud, the app's Astrea and the IMR survey Astrea are not the same group of corals. Only a trainer can say (Q1).
- **Why the app gets no Astrea candidates at all.** `fetch_local.py` finds nothing for Astrea in the Philippines. Its last-resort tier (photos from abroad) only takes species the presence rule confirms in the Philippines, and *Astrea curta* is not confirmed: 0 Research Grade there, although Corals of the World lists it (`presence.json`: `ok: false, rg: 0, chk: true`). The candidate search did not get a name wrong. The Philippine observations simply are not there, or sit unidentified: 895 Philippine stony-coral observations are identified only to the order and 193 only to Merulinidae, of which 84 and 20 are within 40 km of Dauin.
- **The other thin genera (Anacropora, Alveopora, Cyphastrea, Duncanopsammia, Halomitra) have no name problem either.** Duncanopsammia gained *D. peltata* (formerly *Turbinaria peltata*). iNaturalist has followed this since 2021, so that genus is not thin on iNaturalist (68 Philippine observations, 67 Research Grade). The others are thin because few people identify them, or because the observations stop at genus level.
- **The reference for scleractinian names is WoRMS / the World List of Scleractinia.** Today it is edited by Hoeksema, Cairns and Samimi-Namin. iNaturalist follows it with a lag of 0 to 11 years for each change. Catalogue of Life copies it every month, and GBIF lags further behind. Corals of the World, the IMR lecture and Coral Finder each follow it only in part.
- **Proposal:** a small build-time file, `tools/taxonomy.json` (about 65 KB, about 95 genus records and about 140 species rows), refreshed by a `tools/taxonomy.py` built like `tools/build_fish.py`. It would drive photo searches and flags for Pierre, and would never change IMR wording.

## 1. What was checked, and how

All queries were run on 2026-11-05 (Manila 11:23 at the start), read-only, with User-Agent `coral-id-imr/1.0 (IMR Reef ID taxonomy study)`. Scripts and raw replies are kept in the scratchpad `tax/` folder (`/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/tax/`).

| Source | What | Calls |
|---|---|---|
| WoRMS REST (`marinespecies.org/rest`) | `AphiaRecordsByName`, `AphiaChildrenByAphiaID` (paged), `AphiaSynonymsByAphiaID`, `AphiaSourcesByAphiaID` for the 66 app genera (data.json `gen` + `x.gen`) and about 50 former or related genera. Then synonyms and sources for about 40 key species and 10 families. Pause 0.2-0.4 s, sequential. `worms.jsonl` (118 names). Children of *Acropora*, *Montipora* and *Porites* were not listed (too many species, and not needed at genus level). | about 600 |
| iNaturalist API v1 | `taxa` (active and inactive, ancestry, children). Observation counts: Philippines (`place_id=6873`) total, Research Grade, within 40 km of Dauin, and at genus rank only, for 109 genus taxa. `observations/species_counts` batched over several taxa at once. Every Astrea observation worldwide (480). Philippine observations of the old-*Montastraea* species. Observers. Free-text search (`q=`). Paced at 1.1 s or more, sequential, retrying on 429/5xx (rule 6f). | about 520 |
| iNaturalist web `taxon_changes.json?taxon_id=` and `sources/{id}.json` | The taxon changes (swap, split, merge) of 67 taxa, with their dates and cited sources. | about 80 |
| GBIF `species/match` | 30 names. | 30 |
| Catalogue of Life (ChecklistBank, latest release `3LR`) | 5 names. | 6 |
| Literature | Consensus search (2020 onward) for recent genus-level revisions, plus the WoRMS "source" records, which name the paper behind each change. | 1 search |
| Repository | `AGENTS.md` (rules 0-6g), `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `data.json` (families, `info` notes, IMR cues, photo `t` names), `cand.json`, `presence.json`, `tools/presence_checklists.json` (the COTW Philippine list with its WoRMS names), `tools/fetch_local.py`, `tools/genera.py`, `tools/apply_favites.py`, `core.js` `BENTHIC` / `BONUS`. | |

Statements are marked **[verified]** when an API reply or a WoRMS source record backs them, and **[guess]** or "not verified" when they rest on my own knowledge. Unmarked literature statements are well known in the field and match the WoRMS sources record.

## 2. The sources and their standing

| Source | What it is | How it is updated | Standing for the app |
|---|---|---|---|
| **WoRMS / World List of Scleractinia (WLS)** | The global register of marine names. The Scleractinia part is the WLS, cited in 2026 as "Hoeksema, B. W.; Cairns, S.; Samimi-Namin, K. (2026). World List of Scleractinia" **[verified]**, citation string in the API reply. Each name has a status (accepted, junior synonym, superseded combination, misspelling...), a valid name, a classification, its sources (original description, basis of record, new-combination reference) and a `modified` date. | Editors update it continuously, usually within months of a revision being published, sometimes years later. A free REST API. Records were edited as recently as 2026-10-25 (Dipsastraea, Alveopora, Montastraea and others) **[verified]**. | **The reference.** It is the most complete and the most up to date, and it feeds Catalogue of Life, GBIF and iNaturalist. It does not follow every suggestion: *Cyphastrea agassizi* stays in *Cyphastrea* although Chukaew et al. 2023 suggest moving it back to *Leptastrea* **[verified]**. It also sometimes adopts names published outside peer review: Plerogyridae and Leptastreidae come from Rowlett 2020, a self-published book **[verified]**. Above family, WoRMS now ranks Hexacorallia as a class (record modified 2024-02-29) **[verified]**, while iNaturalist, GBIF and Catalogue of Life keep the class Anthozoa. |
| **Literature** (the primary source) | The genus-level revisions since 2011: Gittenberger, Reijnen & Hoeksema 2011 (Fungiidae); Budd et al. 2012 (Mussidae → Lobophylliidae, new Merulinidae, Dipsastraea, Phymastrea); Huang et al. 2014 (Merulinidae, Montastraeidae, Diploastraeidae: Astrea, Coelastrea, Paragoniastrea, Paramontastraea; Phymastrea and Barabattoia sunk); Kitano et al. 2014 (Alveopora → Acroporidae); Huang et al. 2016 (Lobophylliidae: Symphyllia, Australomussa and Parascolymia → Lobophyllia); Kitahara et al. 2016 (a review chapter, "The new systematics of Scleractinia", in *The Cnidaria, Past, Present and Future*); Luzon et al. 2017 (Fimbriaphyllia); Arrigoni et al. 2021 (Astraeosmilia), 2023 (Euphylliidae); Quek et al. 2023 (Pachyseridae); Juszkiewicz et al. 2022 (Plesiastrea peroni); Kishi et al. 2024, 2025 (Paragoniastrea, Favites). | Continuous. | It decides, but it has to be read: WoRMS is the digest of it. |
| **Corals of the World (COTW)**, Veron, Stafford-Smith, Turak & DeVantier (coralsoftheworld.org; built on Veron 2000) | The morphology-based taxonomy and distribution maps by ecoregion. | Irregular, partial updates. The online version has been "Version 0.01" since about 2016 **[guess]**. Veron argued against hasty molecular renaming (Veron 2013, *ZJLS* 169) **[guess, not re-read]**. | **Lags on purpose and in part.** Its Philippine lists keep *Favia*, *Symphyllia*, *Phymastrea*, *Fungia* in the broad sense, *Euphyllia* including *ancora*, *Turbinaria peltata*, *Coscinaraea columna* and *Plesiastrea versipora*. They adopted *Astrea curta* and *A. annuligera*, *Isopora* and *Paramontastraea salebrosa* **[verified in `tools/presence_checklists.json`: 128 of 585 COTW names differ from WoRMS]**. Still the best source for regional presence and species characters. |
| **Coral Finder 2022** (Kelley, BYOGUIDES) | The field key used by IMR and the app. | Editions. | Mostly modern genera: Fimbriaphyllia separate, Plerogyridae (p. 10), *D. peltata* (p. 50) **[verified in data.json]**. |
| **IMR lecture** | The course. | IMR's own. | It follows the 2011-2016 revisions: Dipsastraea "formerly Favia", Astrea "formerly Montastrea / Phymastrea", Lobophyllia "now includes former Symphyllia", Danafungia, Lobactis, and *Coelastrea aspera* in the instructor's notes. It keeps two family placements that predate 2020 and 2023 (Plerogyra in Euphylliidae, Pachyseris in Agariciidae) and the spelling "Diploastreidae" **[verified in data.json]**. In effect the lecture matches WoRMS as it stood around 2016-2019. That is close, and fine for genus-level ReefCloud work. |
| **Catalogue of Life** (ChecklistBank, monthly releases) | Its Scleractinia comes from WoRMS (WLS), with its own classification above family (class Anthozoa). | Monthly. | Matches WoRMS for the genera checked (Astrea, Pachyseridae, Catalaphyllia in Merulinidae, *Turbinaria peltata* a synonym) **[verified]**. Adds nothing for the app. |
| **GBIF Backbone** | Built mostly from Catalogue of Life plus other lists. | Rebuilt irregularly; GBIF is moving its backbone to the Catalogue of Life extended release **[guess on timing]**. | **Lags and leaves stale entries**: the genus *Symphyllia* is still "accepted" while all its species are synonyms of *Lobophyllia* species **[verified]**. Not a reference. |
| **iNaturalist** | Taxa edited by volunteer curators through recorded "taxon changes". A swap or split moves observations and identifications automatically. | Whenever a curator acts. | **Follows WoRMS, late.** Each of the about 45 coral taxon changes read cites WoRMS or the paper WoRMS follows: Huang et al. 2014 (source 11113), Budd et al. 2012 (11112), Huang et al. 2016 (11485), Benzoni et al. 2012 (11115) **[verified]**. Whether a formal "taxon framework" ties iNaturalist's Scleractinia to WoRMS was not checked. The lag varies a lot (table below). Remaining differences: spellings (*Favites valenciennesi*, *Fimbriaphyllia yaeyamensis* and *Echinopora pacificus* on iNaturalist against *valenciennesii*, *yaeyamaensis* and *pacifica* in WoRMS) and new taxa not yet added (*Favites irregularis*, Kishi et al. 2025) **[verified]**. |

**When iNaturalist followed WoRMS** (dates of the taxon changes) **[verified]**:

| Change | Paper | On iNaturalist | Lag |
|---|---|---|---|
| *Fungia scutaria* → *Lobactis* | 2011 | 2016-08-20 | 5 y |
| *Montastrea curta / annuligera* → *Astrea*; *Plesiastrea* split; *Barabattoia* and *Favia* (Indo-Pacific) → *Dipsastraea* | 2012-2014 | 2016-08-08/09 | 2-4 y |
| *Symphyllia* → *Lobophyllia* / *Parascolymia* → *Lobophyllia* | 2016 | 2016-12-16 / 2017-05-17 | < 1 y |
| *Euphyllia ancora* → *Fimbriaphyllia* | 2017 | 2018-12-23 | 1 y |
| *Verrillofungia* → *Lithophyllon* | 2011 | 2020-01-31 | 9 y |
| *Goniastrea aspera* → *Coelastrea* | 2014 | 2020-01-25 | 6 y |
| *Fungia paumotensis* → *Pleuractis* | 2011 | 2020-05-04 | 9 y |
| *Coscinaraea columna* → *Psammocora* | 2012 | 2020-11-11 | 8 y |
| Plerogyridae (Physogyra, Blastomussa, Nemenzophyllia moved) | 2020 | 2020-11-16 | 0 y |
| *Turbinaria peltata* → *Duncanopsammia* | 2018 | 2021-01-31 | 3 y |
| *Caulastraea curvata* → *Astraeosmilia* | 2021 | 2021-03-16 | 0 y |
| *Scapophyllia*, *Paraclavarina* → *Merulina* | 2014 | 2022-04-26 | 8 y |
| *Fungia horrida* → *Danafungia*; *Favites russelli* → *Paragoniastrea* | 2011; 2014 | 2022-05-16 | 11 y; 8 y |
| *Plesiastrea versipora* split (*P. peroni*, tropical) | 2022 | 2022-06-03 | 0 y |
| Pachyseris → Pachyseridae | 2023 | done (date not read) | |
| *Favites irregularis* | 2025 | not yet | |

So today, **at genus level, iNaturalist and WoRMS agree for every app genus**, families included (§3.3). The differences are at species level and are mostly spellings.

## 3. Genus-level history since about 2010

Families: "IMR" is `data.json` `fam`, kept verbatim. WoRMS and iNaturalist families come from the API **[verified]**. Species "in" and "out" come from WoRMS children and synonyms **[verified]** unless marked otherwise. "Recent" means the last five years (2021 onward). "COTW" says whether Corals of the World's Philippine list uses the current name.

### 3.1 The 34 numbered slate genera

| # | Genus | IMR family | WoRMS (accepted species) | What changed since ~2010 (source, date) | iNaturalist | COTW | Flags |
|---|---|---|---|---|---|---|---|
| 1 | Acropora | Acroporidae | accepted, Acroporidae | Genus unchanged. *Isopora* is a separate genus since Wallace et al. 2007 (*A. meridiana* of COTW = *Isopora brueggemanni* in WoRMS). Heavy species-level churn: Rassmussen et al. 2025 (*A. hyacinthus* complex: 9 names taken out of synonymy, 5 new species); other complexes under revision. | same | species names old | Species only; none at genus level. |
| 2 | Pocillopora | Pocilloporidae | accepted (23) | Genus unchanged. Species redefined by genetics (Schmidt-Roach et al. 2014: *P. eydouxi* = *P. grandis*, *P. danae* = *P. verrucosa*; Oury et al. 2023; *P. tuahiniensis* Johnston & Burgess 2023). | same | old species names | Species only. |
| 3 | Stylophora | Pocilloporidae | accepted (10) | Unchanged genus; species complex around *S. pistillata* **[guess on details]**. | same | | |
| 4 | Anacropora | Acroporidae | accepted (8) | Unchanged. | same | same | Thin (§4.4), not taxonomic. |
| 5 | Seriatopora | Pocilloporidae | accepted (9) | Unchanged genus; WoRMS species list edited 2025-12-07. | same | | |
| 6 | Porites | Poritidae | accepted | Unchanged genus (*Synaraea* sunk long ago); species megadiversity under genomic study (Terraneo et al. 2021, 2024); WoRMS record edited 2026-10-05. | same | | Species only. |
| 7 | Tubastraea | Dendrophylliidae | accepted (17) | Gained *T. stimpsonii* (formerly *Balanophyllia*; Mehrotra et al. 2023). | same | | |
| 8 | Echinopora | Merulinidae | accepted (12) | Faviidae → **Merulinidae** (Budd et al. 2012; Huang et al. 2014). Gained *E. taylorae* (formerly *Echinophyllia*). | Merulinidae (2016 swap) | | |
| 9 | Astreopora | Acroporidae | accepted (18) | Unchanged genus; new species 2011 (Wallace, Turak & DeVantier). | same | | |
| 10 | Galaxea | Euphylliidae | accepted (11) | Oculinidae → **Euphylliidae** (molecular work from Fukami et al. 2008; adopted in the 2010s **[guess on the exact date and paper]**); confirmed by Arrigoni et al. 2023. | Euphylliidae (2016) | | IMR = WoRMS. |
| 11 | Turbinaria | Dendrophylliidae | accepted (13) | **Lost *T. peltata* → *Duncanopsammia peltata*** (new combination by Baird & Thomson 2018; WoRMS record 2021-04-11). | swap 2021-01-31 | **still *T. peltata*** | Photos named *T. peltata* before 2021 are now under Duncanopsammia on iNaturalist; COTW and older field guides disagree. |
| 12 | Mycedium | Merulinidae | accepted (6) | Pectiniidae → **Merulinidae** (Budd 2012; Huang 2014). | Merulinidae (2016) | | |
| 13 | Lobophyllia | Lobophylliidae | accepted (20) | Mussidae → **Lobophylliidae** (Budd 2012). **Absorbed *Symphyllia*, *Australomussa*, *Parascolymia* (part)** and *Acanthastrea ishigakiensis / erythraea* (Huang et al. 2016; Arrigoni et al. 2014, 2016). *L. pachysepta* → *Acanthastrea*. *L. wellsi* → *Oulophyllia* (2021). | swaps 2016-12-16, 2017-05-17 | **still *Symphyllia*** | IMR follows ("now includes former Symphyllia"). The app note is right. |
| 14 | Pavona | Agariciidae | accepted (21) | Unchanged genus; *P. giannii* Benzoni 2025. | same | | |
| 15 | Pachyseris | **Agariciidae** | accepted, **Pachyseridae** | **Family Pachyseridae Benzoni & Hoeksema, in Quek et al. 2023** (WoRMS 2023-06-24). | **Pachyseridae** | Agariciidae | **Recent.** IMR and COTW keep Agariciidae; the app already has an "Other sources" note. Q4. |
| 16 | Pectinia | Merulinidae | accepted (10) | Pectiniidae → **Merulinidae** (Budd 2012; Huang 2014). *P. ayleni* → ***Physophyllia*** (Huang 2014); gained *P. maxima* (formerly *Echinophyllia*). | Merulinidae | *P. ayleni* | |
| 17 | Platygyra | Merulinidae | accepted (10) | Faviidae → Merulinidae (Budd 2012). Quek et al. 2023 found misidentified specimens and conflicts inside the genus. | same | | |
| 18 | Leptoria | Merulinidae | accepted (2) | Faviidae → Merulinidae. | same | | |
| 19 | Goniopora | Poritidae | accepted (30) | Genus unchanged; species revised (Kitano et al. 2014); gained *G. diminuta* (formerly *Micromussa*). WoRMS edited 2025-12-14. | same | | |
| 20 | Plerogyra | **Euphylliidae** | accepted, **Plerogyridae** | **Family Plerogyridae Rowlett 2020** (with Physogyra, Blastomussa, Nemenzophyllia). | **Plerogyridae** (2020-11) | Euphylliidae | Already in ROADMAP; Coral Finder 2022 uses Plerogyridae. |
| 21 | Montipora | Acroporidae | accepted | Unchanged genus. | same | | |
| 22 | Hydnophora | Merulinidae | accepted (6) | Unchanged genus (already Merulinidae). | same | | |
| 23 | Fungia | Fungiidae | accepted (2: *fungites*, *puishani*) | **Split** by Gittenberger, Reijnen & Hoeksema 2011: former *Fungia* species now in *Danafungia*, *Lobactis*, *Pleuractis*, *Lithophyllon*, *Cycloseris*, *Heliofungia* (*fralinae*) and *Cantharellus* (*doederleini*). *F. hexagonalis* → *Sinuorota* (date not verified). Oku et al. 2020: *F. fungites* hides a second species in an **unnamed genus** (not yet formally named, as far as found). | swaps 2016-2022 | ***Fungia* s.l.** (17 "Fungia" names) | Old *Fungia* names abound in guides; iNaturalist and WoRMS agree. A future new genus may take some "F. fungites". |
| 24 | Lithophyllon | Fungiidae | accepted (6) | Gained *Fungia concinna, repanda, scabra, spinifer* and *Verrillofungia* (Gittenberger et al. 2011); *L. mokai* → *Cycloseris*. | *Verrillofungia* swap 2020 | partly | |
| 25 | Danafungia | Fungiidae | accepted (2) | **Raised from a *Fungia* subgenus** (2011): *horrida*, *scruposa*. | swap 2022-05-16 | still *Fungia* | |
| 26 | Ctenactis | Fungiidae | accepted (3) | Gained *Herpetoglossa* (junior synonym) and *C. crassa* (formerly *Herpolitha*). | same | | |
| 27 | Lobactis | Fungiidae | accepted (1) | **Raised from *Fungia*** (2011): *L. scutaria*. | swap 2016 | still *Fungia scutaria* | |
| 28 | Herpolitha | Fungiidae | accepted (1) | *H. weberi* = *H. limax*. | same | lists *weberi* | |
| 29 | Heliofungia | Fungiidae | accepted (2) | Gained *H. fralinae* (formerly *Fungia*, 2011). | same | | |
| 30 | Dipsastraea | Merulinidae | accepted (24) | **Revived by Budd et al. 2012 for the Indo-Pacific *Favia***; ***Barabattoia* sunk** into it (Huang 2014); gained *Acanthastrea faviaformis*; ***D. maxima* → *Astraeosmilia*** (Arrigoni et al. 2021). Kishi et al. 2025 suggest some *Favites valenciennesii* forms belong here. | swaps 2016 (*Favia* split, *Barabattoia*) | **still *Favia*** | Old name in COTW and older guides; *Favia* on iNaturalist is now Atlantic only (0 Philippine observations). |
| 31 | **Astrea** | Merulinidae | accepted (4: *annuligera, curta, devantieri, rotulosa*) | **Revived by Huang et al. 2014.** *A. curta*: Montastraea → Phymastrea (Budd 2012) → Astrea; *A. annuligera* likewise; *A. devantieri* formerly *Plesiastrea*; *A. rotulosa* (western Indian Ocean) formerly *Favia*. | swaps 2016-08-08/09 | **Astrea** (curta, annuligera) | §4. |
| 32 | Diploastrea | **Diploastreidae** | accepted, **Diploastraeidae** | Faviidae → Diploastraeidae (Budd 2012; Huang 2014). | Diploastraeidae | | A spelling only; already in ROADMAP and the app's `spell`. |
| 33 | Goniastrea | Merulinidae | accepted (9) | Huang 2014: ***aspera*, *palauensis* → *Coelastrea***; ***australensis*, *deformis* → *Paragoniastrea***; gained ***G. stelligera*** (formerly *Favia*). | *Coelastrea* 2020, *Paragoniastrea* 2022 | still old names | Already in ROADMAP (how RAs label these). |
| 34 | Favites | Merulinidae | accepted (21) | Huang 2014: **gained the *Phymastrea* species *colemani*, *valenciennesii*, *magnistellata*** (Veron's *Montastraea*) and *Favia rotundata*; ***F. russelli* → *Paragoniastrea***; *F. bennettae* → *Oulophyllia*. Still not a natural group (Huang 2014; Quek 2023). **Kishi, Johnson & Fukami 2025: *F. irregularis*** split from *F. valenciennesii*. | follows, but ***F. irregularis* missing**; spelling *valenciennesi* | ***Phymastrea*** for the three | **Recent (2025) and central to the Astrea question (§4).** |

### 3.2 Starred genera, Millepora, bonus and Key-only genera

| Genus (role) | IMR / app family | WoRMS | What changed since ~2010 | iNaturalist | COTW / flags |
|---|---|---|---|---|---|
| Duncanopsammia ★ | Dendrophylliidae | accepted (*axifuga*, *peltata*) | **Gained *D. peltata*** (Baird & Thomson 2018). | swap 2021 | COTW: *Turbinaria peltata*. |
| Alveopora ★ | Acroporidae | accepted (15), Acroporidae | **Poritidae → Acroporidae** (Kitano et al. 2014); WoRMS record edited 2026-10-25. | Acroporidae (2016) | |
| Merulina ★ | Merulinidae | accepted (6) | **Absorbed *Scapophyllia* and *Paraclavarina*** (Huang 2014). | swap 2022-04-26 | COTW keeps *Scapophyllia cylindrica*. |
| Cyphastrea ★ | Merulinidae | accepted (12) | Faviidae → Merulinidae. New species *C. magna*, *C. salae* (eastern Australia), *C. kausti* (Red Sea), *C. zhongjianensis* (authors and dates not verified). **Chukaew et al. 2023: *C. agassizi* belongs with *Leptastrea*; WoRMS has not followed.** | same | Recent; species level. |
| Halomitra ★ | Fungiidae | accepted (*clavator*, *pileus*) | Genus stable; *Zoopilus gomezi* and *Podabacia philippinensis* are synonyms of *H. pileus*; close to *Danafungia* (Oku et al. 2020). WoRMS edited 2025-12-02 (reason not read). | same | |
| Millepora (benthic) | Milleporidae | accepted (16) | Unchanged (Hydrozoa). WoRMS last edited 2017. | same | |
| Isopora (bonus) | Acroporidae | accepted (6) | Raised from an *Acropora* subgenus (Wallace et al. 2007). | same | |
| Leptoseris (bonus) | Agariciidae | accepted (18) | Unchanged genus; much undescribed deep-water diversity (Gijsbers et al. 2023). | same | |
| Heliopora (bonus) | Helioporidae | accepted (*coerulea*, *hiberniana*) | *H. hiberniana* described 2018. Octocoral orders revised (McFadden et al. 2022): Helioporidae now in order Scleralcyonacea **[guess on the order name]**. | same | |
| Sandalolitha (bonus) | Fungiidae | accepted (3) | Unchanged. | same | |
| Pleuractis (bonus) | Fungiidae | accepted (7) | **Raised from *Fungia*** (2011). | swaps 2020 | COTW: *Fungia*. |
| Euphyllia (Key) | Euphylliidae | accepted (5) | **Lost *ancora, divisa, paraancora, paradivisa, yaeyamaensis* to *Fimbriaphyllia*** (Luzon et al. 2017). | 2018 | COTW: *Euphyllia* for all. |
| Fimbriaphyllia (Key) | Euphylliidae | accepted (5) | **Subgenus raised to genus** (Luzon et al. 2017). | 2018; spelling *yaeyamensis* | |
| Zoopilus (Key) | Fungiidae | accepted (1) | Unchanged. | same | |
| Polyphyllia (Key) | Fungiidae | accepted (2) | Unchanged. | same | |
| Tubipora (Key) | Tubiporidae | accepted (7) | Octocoral order revision (McFadden et al. 2022); **Macrina et al. 2026 find 15 lineages where one species, *T. musica*, was used; a formal revision is pending.** | same | Recent; species level. |
| Oxypora (Key) | Lobophylliidae | valid (status "nomen novum") | Pectiniidae → Lobophylliidae (Budd 2012); swapped species with *Echinophyllia* (*E. echinata* → *O. echinata*; *O. glabra* → *E. glabra*). | same | |
| Physogyra (Key) | Plerogyridae | accepted (1) | Euphylliidae → Plerogyridae (Rowlett 2020). | 2020 | |
| Trachyphyllia (Key) | Merulinidae | accepted (1) | Trachyphylliidae → Merulinidae (Budd 2012; Huang 2014). | same | |
| Caulastraea (Key) | Merulinidae | accepted (2) | **Lost *curvata, tumida, connata* to *Astraeosmilia*** (Arrigoni et al. 2021); spelling *Caulastrea* → *Caulastraea*. | 2020, 2021 | COTW: *Caulastrea curvata*. |
| Catalaphyllia (Key) | Merulinidae | accepted, Merulinidae | Euphylliidae (COTW) → Merulinidae (source not verified here). | Merulinidae | |
| Cynarina (Key) | Lobophylliidae | accepted (2) | Mussidae → Lobophylliidae; gained *C. macassarensis* (formerly *Indophyllia*). | same | |
| Cycloseris (Key) | Fungiidae | accepted (14) | Absorbed *Diaseris* and several *Fungia* (2011); gained *Psammocora explanulata* and *Coscinaraea wellsi*; lost *C. hexagonalis* → *Sinuorota*. | same | |
| Gardineroseris (Key) | Agariciidae | accepted (2) | Unchanged. | same | |
| Oulophyllia (Key) | Merulinidae | accepted (4) | Gained *O. wellsi* (= *Erythrastrea*, Arrigoni et al. 2021) and *O. bennettae*. | same | |
| Plesiastrea (Key) | Plesiastreidae | accepted (*peroni*, *versipora*) | Faviidae → Plesiastreidae (family from Dai & Horng 2009). ***P. peroni* revived for the tropical populations** (Juszkiewicz et al. 2022): Philippine "*P. versipora*" = *P. peroni*. | split 2022-06-03 | **COTW lists *P. versipora* for the Philippines**; the presence checklist does not map it (`presence.json`: *P. peroni* `chk: false`). |
| Podabacia (Key) | Fungiidae | accepted (5) | Unchanged. | same | |
| Echinophyllia (Key) | Lobophylliidae | accepted (11) | Pectiniidae → Lobophylliidae. | same | |
| Leptastrea (Key) | Leptastreidae | accepted (8) | Family Leptastreidae Rowlett 2020; species work by RAD-seq (Arrigoni et al. 2020). | same | |
| Stylocoeniella (Key) | Astrocoeniidae | accepted (5) | Unchanged. | same | |
| Acanthastrea (Key) | Lobophylliidae | accepted (7) | Lost species to *Homophyllia*, *Micromussa*, *Lobophyllia*, *Sclerophyllia* and *Dipsastraea* (Huang 2016, Arrigoni 2016); gained *L. pachysepta* and *Micromussa minuta*. | same | |
| Psammocora (Key) | Psammocoridae | accepted (10) | Siderastreidae → Psammocoridae (Benzoni et al. 2010); gained *Coscinaraea columna* and *exesa* (Benzoni et al. 2012). | 2020 | COTW: *Coscinaraea columna*. |

Neighbours seen during the checks, not in the app: *Coeloseris* moved Agariciidae → **Euphylliidae** (Arrigoni et al. 2023; 6 Philippine observations). WoRMS sank **Siderastreidae into Rhizangiidae** (record 2025-10-15; the paper was not identified), which affects *Pseudosiderastrea* (5 Philippine observations). New *Paragoniastrea variabilis* (Kishi et al. 2024, Japan and Taiwan).

### 3.3 Where the IMR lecture's families differ from WoRMS and iNaturalist (questions, not corrections)

The 39 slate genera were checked. WoRMS and iNaturalist agree with each other on every family. The IMR lecture differs in three places, all already known to the app:

1. Pachyseris: IMR Agariciidae; WoRMS and iNaturalist Pachyseridae (2023). Recent.
2. Plerogyra: IMR Euphylliidae; WoRMS, iNaturalist and Coral Finder 2022 Plerogyridae (2020). Already in ROADMAP.
3. Diploastrea: IMR "Diploastreidae"; WoRMS "Diploastraeidae". A spelling, already in ROADMAP and `spell`.

The Key-only families (`x.gen`) all match WoRMS.

### 3.4 Changes from the last five years that some source does not follow yet

| Change | Year | WoRMS | iNaturalist | COTW | IMR lecture | App |
|---|---|---|---|---|---|---|
| *Favites irregularis* (from *F. valenciennesii*) | 2025 | yes (2026-03) | **no** | no | n/a | in the Favites note |
| *Cyphastrea agassizi* → *Leptastrea*? | 2023 | **not followed** | no | no | n/a | – |
| Pachyseridae | 2023 | yes | yes | no | **no (Agariciidae)** | note |
| Coeloseris → Euphylliidae | 2023 | yes | yes | n/a | n/a | not in app |
| *Tubastraea stimpsonii* | 2023 | yes | not checked | no | n/a | – |
| *Plesiastrea peroni* | 2022 | yes | yes | **no** | n/a | presence checklist not mapped |
| *Astraeosmilia* (*Caulastraea* split, *Dipsastraea maxima*) | 2021 | yes | yes | no | n/a | – |
| *Duncanopsammia peltata* | 2018/2021 | yes | yes (2021) | **no** | yes (per app crit) | yes |
| Siderastreidae → Rhizangiidae | 2025 | yes | yes | no | n/a | not in app |
| *Pavona giannii*, *Pocillopora tuahiniensis*, Acropora *hyacinthus* complex | 2023-2025 | yes | partly | no | n/a | species only |
| Tubipora 15 lineages (no names yet) | 2026 | pending | pending | no | n/a | – |
| Unnamed genus inside "*Fungia fungites*" | 2020 | pending | pending | no | n/a | – |
| Plerogyridae (6 years old) | 2020 | yes | yes | no | **no** | note |

## 4. The Astrea case

### 4.1 What *Astrea* holds today

WoRMS (Astrea Lamarck 1801; record 2022-11-25; basis of record Huang et al. 2014) **[verified]**:

| Species | Former names (WoRMS synonyms, abridged) | Range (general knowledge) | In COTW's Philippine ecoregions | iNaturalist (worldwide / Philippines) |
|---|---|---|---|---|
| *A. curta* (Dana 1846) | *Montastraea curta*, *Montastrea curta*, *Phymastrea curta*, *Plesiastraea curta*, *Orbicella curta*, *Favia solidior*, *Favia wakayana*, *Astrea coronata*... (44 synonyms) | Indo-Pacific, common on exposed upper slopes **[guess]** | **yes** | 412 / **0** |
| *A. annuligera* Milne Edwards & Haime 1849 | *Montastraea annuligera*, *Phymastrea annuligera*, *Orbicella annuligera* (the last name is also listed as a synonym of *Plesiastrea peroni*) | Indo-Pacific | **yes** | 1 / **0** |
| *A. devantieri* (Veron 2000) | *Plesiastrea devantieri* | western Pacific **[guess]** | no | 0 / 0 |
| *A. rotulosa* (Ellis & Solander 1786) | *Favia rotulosa*, *Favia hululensis* | western Indian Ocean | no | 35 (Kenya, Seychelles...) / 0 |

The history of *A. curta* (Montastraea → Phymastrea in 2012 → Astrea in 2014) matches word for word the IMR line "formerly Montastrea / Phymastrea". The lecture's statement agrees with WoRMS for *Astrea* proper.

### 4.2 iNaturalist evidence

- **Taxon changes** **[verified]**: *Montastrea curta* → *Astrea curta* (2016-08-08, source Huang et al. 2014); *Montastrea annuligera* → *Astrea annuligera* (2016-08-08); *Plesiastrea devantieri* → *Astrea devantieri* (2016-08-09); *Plesiastrea* split into *Astrea* and *Plesiastrea* (2016-08-09). The old taxa are inactive with 0 observations. Searching "Montastraea curta", "Montastraea annuligera" or "Plesiastrea curta" finds no taxon at all. Old observations were moved.
- **Astrea in the Philippines**: `taxon_id=503518&place_id=6873` gives 0 in total, 0 Research Grade and 0 at genus rank. Within 40 km and 250 km of Dauin: 0. `ident_taxon_id=503518` (any current identification of Astrea) in the Philippines: 0. **[verified]**
- **All 480 Astrea observations worldwide** (310 Research Grade): the nearest to Dauin are Pulau Pom Pom, Sabah (704 km, 2 observations), Palau (1,174 km), Raja Ampat, Maluku, Hong Kong, Hainan, Taiwan, Okinawa. Most come from Norfolk Island, Fiji, French Polynesia, New Caledonia, Guam, the Northern Marianas and Kenya. In other words, iNaturalist has almost none from the Coral Triangle core. **[verified]**
- **The old-*Montastraea* species now in other genera, in the Philippines** (`species_counts`, verifiable / Research Grade / within 40 km of Dauin) **[verified]**:

| Species (former name) | Philippines, verifiable | Research Grade | Observers | ≤ 40 km of Dauin | ≤ 250 km |
|---|---|---|---|---|---|
| *Favites colemani* (*Montastraea / Phymastrea colemani*) | 12 | 6 | 4 | 1 (Pierre's, Needs ID) | 3 |
| *Favites valenciennesi* (iNaturalist spelling; *Montastraea / Phymastrea valenciennesi*) | 4 | 2 | 4 | 1 | 2 |
| *Favites magnistellata* (*Montastraea / Phymastrea magnistellata*) | 3 | 2 | 2 | 0 | 1 |
| *Paramontastraea salebrosa* (*Montastraea salebrosa*) | 1 | 1 | 1 | 0 | 1 |
| *Micromussa multipunctata* (*Montastraea multipunctata*) | 0 | 0 | | 0 | 0 |
| *Plesiastrea peroni* (look-alike, formerly tropical "*P. versipora*") | 12 | 10 | 6 | **3** (Apo Island, Dauin) | 6 |

  Several of these observations carry identifications that disagree with the community: *Favites magnistellata* 150441789 had an "Astrea" identification, two *Plesiastrea peroni* had "*Montastraea cavernosa*" (a Caribbean species), and others had *Dipsastraea*, *Cyphastrea* or *Favia*. Observers clearly hesitate between exactly these genera.
- A free-text search for "Montastrea" in the Philippines returns the *Favites colemani* and *valenciennesi* observations, because iNaturalist keeps the old combinations as alternative names on those taxa. So **the old names already lead to the current taxa on iNaturalist; they do not lead to Astrea.** **[verified]**
- **Unresolved pool**: the Philippines hold 8,519 stony-coral observations, of which 895 are identified only to order Scleractinia and 193 only to family Merulinidae. Within 40 km of Dauin: 1,041, of which 84 are at order and 20 at Merulinidae. Pierre's own observations include 2 at family rank. Any Astrea photographed around Dauin and posted would most likely sit here, and the genus search cannot see it. **[verified counts; that Astrea hides there is a guess]**
- Corals of the World lists *A. curta* and *A. annuligera* for the Philippine ecoregions **[verified]**, and IMR surveys Astrea at Dauin. So the genus is present and expected, and iNaturalist simply lacks identified records. That is a gap in who identifies, not in names.

### 4.3 Does the app's candidate search miss Astrea because of names?

**No.** `tools/fetch_local.py` searches the iNaturalist genus taxon (`taxon_id=503518`), which includes every descendant. iNaturalist agrees with WoRMS on Astrea, and no inactive Astrea or Montastraea taxon holds observations. The search misses three things, none of them a synonym:

1. **Observations not identified to genus** (§4.2, about 104 near Dauin at order or family rank). Only identification work can recover them: Pierre, other identifiers on iNaturalist, or an IMR trainer.
2. **Corals that IMR may call "Astrea" but WoRMS and iNaturalist place in *Favites* (and *Paramontastraea*)**: the former *Phymastrea*. They are fetched today as **Favites** candidates. The app has 4 *F. colemani* photos under Favites, and Favites candidates include *F. colemani* and *F. magnistellata*. Whether that is right for the IMR survey slate is Q1.
3. **Photos from abroad**: the world tier only takes species confirmed in the Philippines (rule 6g). *A. curta* has 0 Research Grade there, so it fails rule (2) despite the COTW listing, and nothing is fetched. The app's 7 Astrea photos are all `loc: world` *A. curta* and are therefore "out of rule" in the admin. **This is the direct reason Astrea gets no candidates.** It is a consequence of Pierre's rule 6g, not a bug. Q2.

### 4.4 The other thin genera, same check

Counts from iNaturalist; "usable" means open-licence photos that pass `fetch_local.py`'s filter (Research Grade, or a genus-level community identification with at least 2 agreeing identifications). The app counts come from data.json `views` and `cand.json` **[verified]**.

| Genus | Name history that could hide photos | Philippines on iNaturalist (total / Research Grade / genus-rank only / ≤ 40 km of Dauin) | Usable (Research Grade + genus-level community IDs / rejected) | App now (photos / candidates waiting) | Finding |
|---|---|---|---|---|---|
| Anacropora | none (stable genus) | 8 / 0 / 7 / 1 | 0 + 5 / 1 | 8 (all `world`) / 3 | **Truly scarce on iNaturalist** (7 observers in the whole country). No species confirmed in the Philippines (0 Research Grade), so no world candidates either. |
| Alveopora | family Poritidae → Acroporidae (2014; iNaturalist 2016). Names unaffected. | 47 / 0 / 46 / 4 | 0 + 33 / 5 | 8 / 8 | Observations stop at genus level (species are hard to identify); 33 usable. Not a name problem. |
| Cyphastrea | *C. agassizi* may move to *Leptastrea* (2023, not followed) | 33 / 1 / 32 / 5 | 1 + 29 / 1 | 9 / 10 | Same pattern: genus level only. A *Leptastrea* look-alike issue at species level, irrelevant for photos. |
| Duncanopsammia | **gained *D. peltata* from *Turbinaria*** (2018; iNaturalist 2021) | 68 / 67 / 0 / 5 | 55 + 0 / 1 | 7 (`ph`) / 20 | Not thin on iNaturalist since the 2021 swap. All Philippine records are *D. peltata* plates, which matches ROADMAP "Duncanopsammia at Dauin = D. peltata plates". Watch the reverse case: COTW and older guides call these *Turbinaria*. |
| Halomitra | none relevant (*Zoopilus gomezi* and *Podabacia philippinensis* = *H. pileus*, old synonyms) | 38 / 34 / 0 / 18 | 31 + 0 / 4 | 6 / 17 | Not thin on iNaturalist: 18 near Dauin, 17 candidates waiting. |

Conclusion: for these five, scarcity or genus-level identifications explain the gaps, together with the caps in `fetch_local.py` (Philippine candidates only while a genus has fewer than `POOR` Dauin photos, `PH_CAP` 6). Names explain nothing. Only Astrea's gap is partly about which corals count as Astrea.

## 5. A reference file for the app

### 5.1 Purpose

One maintained place that says, for each genus the app touches: the name IMR uses; the name each authority accepts now; the former names and moves with their dates and sources; the iNaturalist taxa to search; and what changed since the last refresh. Tools read it. Players never download it, and it never rewrites IMR wording (rule 1). It mirrors the fish side's design (`fish.json` `ref`: WoRMS AphiaID, `syn`, `inat`, `iname`; ARCHITECTURE.md "Two trees"), so corals and fish share one approach.

### 5.2 Proposed file: `tools/taxonomy.json`

One genus per line (the `tools/datajson.py` `dump` layout), keyed by the name the app uses:

```json
{
  "v": 1,
  "refreshed": {"worms": "2026-11-05", "inat": "2026-11-05", "cotw": "2026-11-04"},
  "refs": {
    "huang2014": "Huang D, Benzoni F, Fukami H, Knowlton N, Smith ND, Budd AF (2014) Zool J Linn Soc 171: 277-355",
    "budd2012": "Budd AF, Fukami H, Smith ND, Knowlton N (2012) Zool J Linn Soc 166: 465-529",
    "kishi2025": "Kishi D, Johnson KG, Fukami H (2025) Zoologica Scripta 55: 349-367"
  },
  "gen": {
    "Astrea": {
      "role": "slate",
      "imr": {"name": "Astrea", "fam": "Merulinidae", "says": "formerly Montastrea / Phymastrea", "sl": [62, 63]},
      "worms": {"id": 517592, "name": "Astrea", "status": "accepted", "fam": "Merulinidae", "mod": "2022-11-25",
                "spp": ["annuligera", "curta", "devantieri", "rotulosa"]},
      "inat": {"id": 503518, "name": "Astrea", "fam": "Merulinidae", "ph": {"obs": 0, "rg": 0, "dauin": 0}},
      "cotw": {"names": ["Astrea curta", "Astrea annuligera"]},
      "moves": [
        {"sp": "curta", "from": "Montastraea curta", "via": "Phymastrea curta", "year": 2014, "ref": "huang2014", "inat": "2016-08-08"},
        {"sp": "annuligera", "from": "Montastraea annuligera", "year": 2014, "ref": "huang2014", "inat": "2016-08-08"},
        {"sp": "devantieri", "from": "Plesiastrea devantieri", "year": 2014, "ref": "huang2014", "inat": "2016-08-09"}
      ],
      "kin": [
        {"sp": "Favites colemani", "from": "Montastraea colemani", "via": "Phymastrea colemani", "why": "same former genus as IMR's 'formerly Montastrea / Phymastrea'", "inat": 503661},
        {"sp": "Favites valenciennesii", "iname": "Favites valenciennesi", "inat": 503663},
        {"sp": "Favites magnistellata", "inat": 503662},
        {"sp": "Paramontastraea salebrosa", "inat": 503532}
      ],
      "search": [503518],
      "flags": ["no iNaturalist record in the Philippines (2026-11-05)", "Q1: IMR concept vs WoRMS Astrea"]
    },
    "Pachyseris": {
      "role": "slate",
      "imr": {"name": "Pachyseris", "fam": "Agariciidae"},
      "worms": {"id": 206073, "status": "accepted", "fam": "Pachyseridae", "mod": "2023-06-24"},
      "inat": {"id": 520308, "fam": "Pachyseridae"},
      "fam_change": {"from": "Agariciidae", "to": "Pachyseridae", "year": 2023, "ref": "quek2023"},
      "flags": ["IMR family differs (ROADMAP question)"]
    }
  },
  "old": {
    "Phymastrea": {"worms": "Favites", "status": "junior subjective synonym", "year": 2014, "ref": "huang2014", "inat": "inactive"},
    "Symphyllia": {"worms": "Lobophyllia", "year": 2016, "ref": "huang2016", "inat": "2016-12-16"},
    "Favia": {"worms": "Favia (Atlantic only); Indo-Pacific species -> Dipsastraea", "year": 2012, "ref": "budd2012", "inat": "2016-08-09"}
  },
  "log": [
    {"date": "2026-11-05", "what": "first build"}
  ]
}
```

Field rules:
- `imr` is copied from `data.json` (`fam`, and the lecture's own "formerly…" lines quoted), never edited by the tool. That keeps rule 1 mechanical.
- `worms` and `inat` are written by the refresh. `iname` appears only when iNaturalist's spelling differs from WoRMS's.
- `moves`: species that came in or went out, at **species level only when the move crosses app genera or concerns a species present in the Philippines** (rule 6e). `kin`: species in other genera that a source, IMR included, may count with this genus. They are written in **only with Pierre's decision** (rule 2: no Claude-made groupings); until then they are candidates for a question.
- `search`: the iNaturalist taxa `fetch_local.py` queries for this genus. It defaults to the genus taxon and grows only by Pierre's decision (for example after Q1).
- `old`: every former or synonymous genus name (about 30), so a name typed or read anywhere resolves.
- `log`: the change log, one line per change detected or decided, with its date and source.

### 5.3 Size

- Genera: 66 app genera (39 slate + 27 `x`, including Millepora and the 5 bonus genera), at about 400-600 bytes each, gives about 35 KB.
- Former genera (`old`): about 30 short records, about 4 KB.
- Species rows: about 140. These are the 128 COTW-to-WoRMS differences already in `tools/presence_checklists.json` (they could be derived from it, or replace that mapping), plus about 10 `kin` and new-taxon rows. About 25 KB.
- Total **about 65 KB**, about 250 lines. Species rows outside these cases (for example the hundreds of *Acropora* names) do not pay and stay out.

### 5.4 Upkeep: `tools/taxonomy.py`

Built like `tools/build_fish.py` (`NET.get` with a cache in `tools/.cache/`, WoRMS pause 0.3 s, iNaturalist 1 s, User-Agent, retries):

1. **WoRMS**: for each genus AphiaID, `AphiaRecordByAphiaID` (status, valid name, family, `modified`). Only when `modified` is newer than the last run: `AphiaChildrenByAphiaID` (accepted species; non-accepted species with a valid name in another genus = moves), `AphiaSynonymsByAphiaID`, `AphiaSourcesByAphiaID` (the paper behind it). About 100 calls a run, and few after the first.
2. **iNaturalist**: one batched `GET /v1/taxa/{id,id,…}` (30 ids per call, so 3-4 calls) for active status, name, family and children; `taxon_changes.json?taxon_id=` only for taxa whose iNaturalist record changed; Philippine counts with `observations/species_counts?taxon_id=<family ids>&place_id=6873`, batched by family (rule 6f).
3. **Diff and print** for Pierre, writing `log` entries: a genus's WoRMS status, valid name or family changed; WoRMS and iNaturalist disagree (name, spelling, placement, a missing taxon such as *Favites irregularis*); IMR family ≠ WoRMS family (goes to ROADMAP "Questions for an IMR trainer", wording neutral); a COTW name with no WoRMS mapping (for example *Plesiastrea versipora* → *P. peroni* for the Philippines); a new species in an app genus confirmed in the Philippines (rule 6g).
4. **When**: monthly, and before any content PR that touches names or families. Optionally a scheduled GitHub Action that only prints. Never auto-commits anything that changes what players see.
5. **Test** (`tests/taxonomy.test.js`): every `data.json` genus has a record; every `inat.id` is active; `imr` equals `data.json`.

### 5.5 What the app and the tools would use it for

- **Photo searches** (`fetch_local.py`): read `search` instead of looking up the genus by name each run. That avoids the name search and its homonym guard (the Astrea snail and plant). It also lets Pierre add taxa when IMR's concept is wider than WoRMS's, for example the *F. colemani* group under Astrea if Q1 says so. It never adds taxa by itself.
- **Admin flags**: a photo or candidate whose `t` (iNaturalist name at fetch time) is now a synonym, has moved genus, or is a `kin` species of another slate genus. Today that would flag the 4 *F. colemani* Favites photos as "kin of Astrea (Q1)". In `data.json`/`cand.json` there are 286 distinct photo names; only iNaturalist spellings differ from WoRMS (*Echinopora pacificus*, *Favites valenciennesi*, *Fimbriaphyllia yaeyamensis*, *Acropora valenciennesi*). No photo carries an outdated genus.
- **The presence rule** (`tools/presence.py`): match COTW names through `moves`/`old` (including splits like *Plesiastrea peroni*), so the checklist test sees the current names.
- **"Other sources" notes**: the `info` notes keep their own wording, but their dates and sources can be checked against the file (for example "Pachyseridae since 2023 (Quek et al. 2023)" matches WoRMS).
- **Questions for Pierre**: the refresh writes neutral question drafts. It never edits the lecture text.

## 6. Questions for Pierre (each with a recommendation)

None of these needs the app to change now. All follow rule 1 (the IMR wording stays) and rule 6 (open questions go to ROADMAP "Questions for an IMR trainer").

1. **Which corals does IMR label "Astrea" in ReefCloud?** Only *A. curta* and *A. annuligera* (Astrea in WoRMS and iNaturalist), or also the former "*Phymastrea*" corals, now *Favites colemani*, *F. valenciennesii* and *F. magnistellata* in WoRMS and iNaturalist (and perhaps *Paramontastraea salebrosa*)? Slide 62's "refer to Astrea / Phymastrea" suggests the second, but only a trainer can say. *Recommendation*: show an IMR trainer three or four photos (an *A. curta* from abroad, a *F. colemani* from Dauin or the Philippines, a *Plesiastrea peroni* from Dauin, Pierre's *F. colemani* observation 406194912) and ask which ReefCloud label each gets. Add it to ROADMAP "Questions for an IMR trainer" under the existing Favites block. Until the answer comes, change nothing; the app's 4 *F. colemani* photos stay under Favites.
2. **Astrea photos, given the presence rule.** *A. curta* is not confirmed in the Philippines (0 Research Grade), so the app's 7 Astrea photos (all from abroad) are "out of rule" and no new candidate can come in. *Recommendation*: (a) look for Astrea among the unresolved Merulinidae and Scleractinia observations near Dauin (20 + 84), or post Dauin photos of IMR "Astrea" colonies and ask expert identifiers. Two independent Research Grade observers near Dauin would confirm the species under rule 6g (3). (b) Decide whether IMR's surveys, as "the IMR reference list", count for a coral genus the way the EventMeasure PDF does for fish (rule 6g, clause 3). That is your call on the rule, not mine. Until then keep the 7 photos as they are; the admin already shows them as out of rule.
3. **Pierre's own *F. colemani* near Dauin (Needs ID).** *Recommendation*: if Q1 says IMR calls these "Astrea", that observation and similar ones are your best local "Astrea" photos (rule 6a: your species-level photos stay usable as photos). Otherwise leave them under Favites.
4. **Families that have changed recently** (Pachyseridae 2023, Plerogyridae 2020). *Recommendation*: keep the current "Other sources" notes. Add Pachyseridae to ROADMAP "Questions for an IMR trainer" next to Plerogyra, with neutral wording ("WoRMS and iNaturalist place Pachyseris in Pachyseridae since 2023; does IMR keep Agariciidae?").
5. **Build the reference file?** *Recommendation*: yes, in the small form of §5 (genus level plus about 140 species rows, about 65 KB). Start with a read-only `tools/taxonomy.py` that only prints and writes `tools/taxonomy.json`. Wire it into `fetch_local.py` (`search`) and the admin flags in a second PR. A ROADMAP "Next" row if you agree.
6. **Fix the COTW-to-WoRMS mapping for splits.** *Plesiastrea versipora* in COTW's Philippine lists is *P. peroni* (Juszkiewicz et al. 2022). *Recommendation*: map it, as a data-only change to `tools/presence_checklists.json`, or let the reference file do it. Effect: *P. peroni* gets `chk: true`; it is already confirmed by observers, so nothing changes for players.
7. **Watch list** (no action now): *Favites* is still being revised (Kishi et al. 2025; *F. irregularis* is not on iNaturalist yet); the unnamed genus inside *Fungia fungites* (Oku et al. 2020); Tubipora's 15 lineages (Macrina et al. 2026); *Cyphastrea agassizi*. *Recommendation*: let the refresh in §5.4 report when WoRMS or iNaturalist moves on these. Do nothing in the app before IMR does.

## 7. Limits of this study

- The WoRMS child lists were not fetched for *Acropora*, *Montipora* and *Porites* (species level only).
- The "moves in" lists cover the genera queried (the app genera plus about 50 former or related genera), not every name in WoRMS.
- iNaturalist taxon changes were read for 67 taxa, not all. The date of the Pachyseridae move on iNaturalist was not read.
- The COTW site, the Coral Finder book and the IMR slides were not re-read; their names come from the repository (`presence_checklists.json`, `data.json`).
- ReefCloud's IMR label set was not seen. Q1 depends on it.
- Dates and authors marked **[guess]** or "not verified" (Galaxea's move, Catalaphyllia's source, *Sinuorota*'s date, the *Cyphastrea* new-species authors, the octocoral order name, the COTW version) should be checked before any of them is cited in the app.
