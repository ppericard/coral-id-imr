# A nudibranch game mode for the Philippines (preliminary study, 2026-11-15)

Read-only study for the ROADMAP row "More subjects". It changes no app code, data file, photo or account. Pierre, as relayed
on 2026-11-15 (translated from French): "a preliminary study on the potential of adding a game mode for nudibranchs, a mode
for nudibranchs in the Philippines in general rather than just Dauin. Starting by putting forward (1) the most common
nudibranchs and (2) the most sought-after nudibranchs."

The per-species data is in [`2026-11-15-nudibranch-mode-candidates.csv`](2026-11-15-nudibranch-mode-candidates.csv):
one row for each of the 452 sea-slug species that rule C8 confirms in the Philippines (the column list is in Appendix
C). It holds no observer id or name: observer counts are aggregates only.

Labels (rule W11): **[measured]** = counted by a script today; **[read]** = taken from a page, a record or a paper's
abstract; **[guess]** = my judgement, not checked.

**Data pulls, all on 2026-11-15, 09:00-10:00 Manila:**
- iNaturalist API (`api.inaturalist.org`, v1 and v2): every Research Grade observation in the Philippines (place 6873) of
  Nudibranchia (23,909), Sacoglossa (1,726), Pleurobranchida (481), Cephalaspidea (1,558) and Aplysiida (415). Paged by
  id, 200 a request, through `tools/inat.py` (rule C7: paced at 1 s, the project's User-Agent). Then the taxa, places,
  and worldwide licence counts per species (`species_counts`, 100 taxa a request). One two-row test request, to check
  the v2 field syntax, was sent with `curl` and the same User-Agent. Of the 28,089 observations pulled, 28,045 are
  identified to species or below: the per-species counts use those.
- WoRMS REST API (`marinespecies.org/rest`): the record of each of the 452 names, their English vernaculars, and the
  revised genera and species in §2.3.
- GBIF occurrence API (`api.gbif.org`): Nudibranchia (order key 980) in country PH, faceted by dataset and species.
- Wikimedia pageviews API: English Wikipedia views of each species' article, 2025-11-01 to 2026-10-31.
- Public web pages of Philippine dive operators, magazines and dive-travel sites (§4.2), each read once.
- Nothing was uploaded, no account was used, the sync sheet and `curation.json` were not touched.

## 1. Summary

1. **There is plenty of material.** **484 nudibranch species** have Research Grade observations in the Philippines. **352
   pass the presence rule C8**. **117 are confirmed near Dauin** (2 or more observers within 40 km). With the other sea slugs: 651 species, **452 confirmed** **[measured]**.
2. **The data is concentrated in Anilao.** Batangas holds 47% of the Philippine nudibranch observations. Romblon,
   Oriental Mindoro, Negros Oriental and Cebu hold 9-13% each. A ranking by **distinct observers** (the fish's iNat
   signal) is robust to this. A province-balanced ranking gives the same order (Spearman 0.95), with 41 of the top 50 the
   same **[measured]**.
3. **"Most common" and "most sought-after" differ most at the very top.** Among nudibranchs, 30 of the 50 most-viewed
   species (Wikipedia) are in the 50 most common. But the most sought-after are rarely met:
   - the "sea bunny" (*Jorunna parva*, 262nd by observers);
   - the "Pikachu" (*Thecacera pacifica*, 176th);
   - Coleman's ghost melibe (*Melibe colemani*, 83rd);
   - the "Shaun the Sheep" leaf slug (*Costasiella kuroshimae*), the most viewed of all, is not a nudibranch.

   The Spanish dancer is the exception once its two species are counted together: *H. sanguineus* is 144th, but *H.
   lacer*, the one mostly recorded here, is 42nd **[measured]**.
4. **Several sought-after slugs are not nudibranchs.** Sacoglossans (*Costasiella*, *Cyerce*, *Elysia*) are among the
   most viewed, faved and named on dive pages. The reference guide covers "nudibranchs and sea slugs" together. My
   recommendation is a **sea-slug subject**: nudibranchs first, the other groups later (§2.2) **[guess]**.
5. **Photos are not the bottleneck; open licences are scarce.** Only **3.7%** of Philippine observations carry a CC0 or CC
   BY photo; 61.5% carry CC BY-NC. Worldwide, every species of the common top 50 has 40 or more Research Grade
   observations with a CC0 / CC BY / CC BY-NC photo. 37 of the 50 have 30 or more with an open (CC0 / CC BY) photo
   alone **[measured]**.
6. **Few well-used English names.** iNaturalist gives an English name to 40 of the top 50. WoRMS gives one to 24.
   They **agree on 2** **[measured]**.
   - The fish rule as built would still name 45 of the 50: through its `single` fallback, one reference's main name
     when no name recurs in both.
   - But 43 of those 45 would rest on one reference alone, or on two that disagree.
   - So a common-name branch is possible under today's rule, built mostly on single-source names. Running this subject
     on **scientific names only** (families, then genera, then species) is a preference I recommend, not something the
     rules impose: question (d).
7. **Taxonomy is stable enough to build on.** For 450 of the 452 names, iNaturalist uses the name WoRMS accepts. WoRMS
   follows the Chromodorididae revision of Johnson & Gosliner (2012) and later papers (§2.3) **[measured]**.
8. **No IMR nudibranch content was found** in the repo's IMR material (§8). The mode would rest on WoRMS, the
   literature and iNaturalist alone.

## 2. Scope

### 2.1 Species recorded in the Philippines and near Dauin

iNaturalist, Research Grade (RG) and all verifiable (RG + Needs ID), on 2026-11-15 **[measured]**:

| Group (iNat taxon) | Species RG, PH | Obs. RG, PH | Species verifiable, PH | Confirmed PH (C8: ≥ 3 RG observers) | Species RG within 40 km of Dauin | Confirmed near Dauin (≥ 2 RG observers) |
|---|---|---|---|---|---|---|
| Nudibranchia (47113) | 484 | 23,909 | 520 | **352** | 173 | **117** |
| Sacoglossa (47801) | 56 | 1,726 | 58 | 35 | 23 | 16 |
| Cephalaspidea (49784) | 81 | 1,558 | 83 | 45 | 22 | 13 |
| Aplysiida, sea hares (775804) | 17 | 415 | 20 | 11 | 8 | 6 |
| Pleurobranchida (775833) | 13 | 481 | 13 | 9 | 8 | 5 |
| Umbraculida, Runcinida | 1, 0 | 2, 0 | 1, 0 | 0 | 0 | 0 |
| *Polycladida (flatworms, not sea slugs: §6.3)* | *55* | *1,052* | *69* | — | *32* | — |

- 683 distinct observers recorded a nudibranch in the Philippines **[measured]**.
- Rule C8's checklist route does not apply: `tools/presence_checklists.json` holds the FishBase and Corals of the World
  checklists only, and has none for sea slugs **[read]**. The IMR-list route has no sea-slug list either.
- So the two routes left are 3 or more Research Grade observers in the Philippines, or confirmed near Dauin (2 or more
  within 40 km). The confirmed totals apply both (`tools/presence.py` `ph_confirmed`).
- No sea-slug species is confirmed by the near-Dauin route alone: every species with 2 or more observers near Dauin also
  has 3 or more in the country **[measured]**. So "confirmed" and "3 or more Philippine observers" are the same 452
  species today.
- **GBIF** has 31,052 Nudibranchia occurrences in the Philippines under 592 species keys **[measured]**. By dataset:
  - iNaturalist RG: 17,071 (55%), 397 species;
  - Nudi Pixel: 6,844, 429 species;
  - California Academy of Sciences Invertebrate Zoology (specimens): 4,121, 431 species;
  - "A photographically-vouchered global citizen science dataset of sea slugs": 1,198, 241 species.

  195 GBIF species have no record in GBIF's iNaturalist dataset. The GBIF and iNat counts are not added together: GBIF
  re-publishes iNaturalist. GBIF's iNat copy (17,071) is smaller than iNat's own count (23,909). It probably holds only
  the openly licensed observations **[guess]**. Its species keys follow GBIF's backbone, not WoRMS.
  **Recommendation**: GBIF as a cross-check of the species list, not as a commonness signal (specimens and dedicated
  photo surveys are not encounter rates).

### 2.2 Which sea slugs belong

- **The groups.** Nudibranchia sits with Pleurobranchida in Nudipleura. Sacoglossa, Cephalaspidea (headshield slugs) and
  Aplysiida (sea hares) are other heterobranch orders. WoRMS lists "Opisthobranchia", the old umbrella, as an "abandoned
  concept" **[read: WoRMS 382226]**. So "sea slugs" is a common-language group, not a taxon.
- **The reference covers all of them.** The standard regional guide is Gosliner, Valdés & Behrens, *Nudibranch & Sea
  Slug Identification: Indo-Pacific*, 2nd ed., 2018 **[read: its title and publisher listings]**. It illustrates
  nudibranchs and the other sea slugs together. Dive operators and magazines use "nudibranch" loosely: they list the
  sacoglossans *Costasiella kuroshimae* and *Cyerce nigra* as nudibranch highlights (§4.2) **[read]**.
- **Recommendation** **[guess]**:
  - a **sea-slug subject**, named for what players say ("Nudibranchs & sea slugs");
  - **Nudibranchia** as its first and main circle (78% of the confirmed species, 85% of the observations);
  - **Sacoglossa, then Cephalaspidea, Pleurobranchida and Aplysiida** opening later, as the fish's circles 2 and 3 do:
    100 confirmed species in all.
  - Umbraculida and Runcinida stay out (no confirmed species).
  - Flatworms stay out of the units. They may come back as look-alikes (§6.3).
- This is question (a) for Pierre (§10).

### 2.3 The revisions, and how WoRMS handles them today

WoRMS records read on 2026-11-15 **[read]**: each name's status, accepted name and the source WoRMS cites for it.

| Name (as often found in older guides) | WoRMS today | WoRMS's cited source |
|---|---|---|
| *Risbecia* (genus) | unaccepted → *Hypselodoris* | Rudman 1984 (basis of record) |
| *Risbecia tryoni* | → *Hypselodoris tryoni* | Rudman 1984 |
| *Glossodoris atromarginata* | → *Doriprismatica atromarginata* | Richmond 1997 (basis of record) |
| *Doriprismatica*, *Ardeadoris*, *Mexichromis* | accepted | status source: Johnson & Gosliner 2012 |
| *Chromodoris*, *Hypselodoris*, *Glossodoris* | accepted, membership changed | Johnson & Gosliner 2012 |
| *Chromodoris geometrica*, *C. kuniei* | → *Goniobranchus geometricus*, *G. kuniei* | Gosliner et al. 2008 (basis) |
| *Ceratosoma alleni* | → *Miamira alleni* | Gosliner et al. 2008 |
| *Flabellina exoptata* | → *Coryphellina exoptata* | *Coryphellina*: Ekimova et al. (status source) |
| *Hexabranchus lacer* | accepted, beside *H. sanguineus* | Tibiriçá et al. 2023 ("A Spanish dancer…", status source) |
| *Pteraeolidia semperi* | accepted, beside *P. ianthina* | Wilson & Burghardt 2015 ("Here be dragons…") |
| *Phestilla* | accepted | Korshunova, Fletcher & Martynov 2025 (status source) |

- **What the 2012 revision did** **[read: Johnson & Gosliner 2012, PLoS ONE 7(4): e33479]**:
  - all 14 traditional non-monotypic chromodorid genera were non-monophyletic, or made another genus paraphyletic;
  - *Goniobranchus* was rescued from synonymy for the Indo-Pacific species then in *Chromodoris*;
  - *Risbecia* was put into *Hypselodoris*;
  - *Chromodoris* was kept for the black-lined clade;
  - the paper named *Doriprismatica* only "preliminarily". WoRMS now accepts it.
- **iNaturalist against WoRMS on our 452 names** **[measured]**:
  - **450 are the WoRMS accepted name, matched exactly**;
  - **2 differ**: iNaturalist's *Tenellia viei* and *T. goniophaga* are *Phestilla viei* and *P. goniophaga* in WoRMS.
    WoRMS gives "alternative representation" with the reason "controversed genus allocation".
- **The Spanish dancer is two species now.** In the Philippines, iNaturalist RG has *Hexabranchus lacer* (64 observers)
  and *H. sanguineus* (18). The dive pages say "Spanish dancer" for either (§4.2).
- **The "blue dragon" is *Pteraeolidia semperi*** (162 observers). *P. ianthina* has no RG record in the Philippines.
- **Consequence for the build.** The fish's name machinery carries over unchanged:
  - `tools/taxonomy.json`, a section per subject (ROADMAP "Taxonomy reference");
  - WoRMS beside the shown name, former names accepted when typed;
  - discrepancies to `points.json` (rule C5), such as the two *Tenellia* / *Phestilla* names.

## 3. "Most common"

### 3.1 The metric

- **Proposed: distinct Research Grade observers in the Philippines.** It is the iNaturalist signal the fish use
  (`tools/fish_commonness.py`: "more abundance-like than photo counts, which keen photographers of a rare species
  inflate"), over the whole country instead of the Dauin rings.
- **Ties**: the number of half-degree cells (about 55 km) with an observation, then the observations.
- **Shown beside it, never mixed in**:
  - provinces;
  - the half-degree cells;
  - the observations and distinct observers within 40 km of Dauin;
  - the share of a species' observations made by its single most active observer (an aggregate, no id).
- **Why not observations?** One observer makes 7.5% of all Philippine nudibranch observations. The top 5 make 26%, the
  top 10 make 36% **[measured]**. Observation counts would follow a few photographers.
- **Robustness check.** A province-balanced share was also computed: for Batangas, Romblon, Oriental Mindoro, Negros
  Oriental, Cebu and Bohol, the share of the province's nudibranch observers who recorded the species, averaged over the
  six. It ranks the 352 confirmed species almost alike (Spearman 0.95), and 41 of the top 50 are the same **[measured]**.
  The 9 it brings in are all over-represented in Romblon: 23% to 84% of their observations, against 13% for all
  nudibranchs; 5 of them above 40% **[measured]**. The cause is that it gives Romblon's 44 observers the same weight as
  Batangas's 220. Kept as a column (`balanced_share`), not as the
  ranking **[guess]**.

### 3.2 The ranked list

**Appendix A** has the top 50 nudibranchs, with counts. The CSV has all 452 sea slugs, each group ranked on its own.
Pulled on 2026-11-15.

- **The top 10** **[measured]**:
  1. *Chromodoris annae* (262 observers);
  2. *Nembrotha kubaryana* (251);
  3. *Chromodoris willani* (203);
  4. *Nembrotha chamberlaini* (180);
  5. *N. lineolata* (173);
  6. *Hypselodoris tryoni* (169);
  7. *Phyllidia varicosa* (165);
  8. *Halgerda batangas* (163);
  9. *Pteraeolidia semperi* (162);
  10. *Chromodoris lochi* (158).
- **The top 50 by family**: Chromodorididae 24, Phyllidiidae 10, Polyceridae 7, Facelinidae 3, Discodorididae 2, and
  Myrrhinidae, Flabellinidae, Hexabranchidae and Aegiridae 1 each.
- **The top species of the other groups**:
  - *Elysia marginata* (Sacoglossa, 120 observers);
  - *Chelidonura amoena* (Cephalaspidea, 120);
  - *Pleurobranchus forskalii* (Pleurobranchida, 95);
  - *Dolabella auricularia* (Aplysiida, 71).
- **Dauin against the country.** 47 of the Philippine top 50 are confirmed near Dauin. Of the 50 species with the most
  observers near Dauin, 33 are in the Philippine top 50. Some differences are strong **[measured]**:
  - *Chromodoris willani*: 3rd in the country, 6 observers near Dauin;
  - *Hypselodoris apolegma*: 26th, 4 observers near Dauin;
  - *H. variobranchia*: 34th, none near Dauin;
  - *Nembrotha cristata* and *N. milleri*: 3rd and 5th near Dauin, 18th and 19th in the country.

## 4. "Most sought-after"

Pierre's notion has no ready metric. Four proxies were tried, each on the 452 confirmed species; each one's weakness is
stated.

### 4.1 iNaturalist faves per observation: weak

- **27,243 of the 28,045 species-level Philippine sea-slug observations (97%) have no fave.** 714 have one **[measured]**.
- The rate rests on a handful of faves per species and follows who is active on the site.
- Its top, among species with 30 or more observations:
  1. *Costasiella kuroshimae* (0.24);
  2. *Miamira alleni* (0.23);
  3. *Pleurobranchus grandis*;
  4. *Nembrotha milleri*;
  5. *Hypselodoris infucata*;
  6. *Cyerce nigra*.
- Appendix B.3 has its top 20. **Use it as a tag at most.**

### 4.2 Named on dive operators' and dive media's pages: weak

- **What was read.** Public pages that present Philippine dive areas, each read once on 2026-11-15. Counted: species
  named as a highlight or a target, tied to a Philippine site. Nicknames were mapped to a species only where a page gives
  the scientific name beside them.
- **Pages with species named:**
  - **P1**: Blue Ribbon Divers, "What lives in Anilao" (Anilao);
  - **P2**: Atmosphere Resorts, "Meet our critters" (Dauin): "kuro sapsucking slug (otherwise known as the shaun the sheep
    nudi)";
  - **P4**: Dive The World, Anilao dive sites;
  - **P6**: X-Ray Mag, "Romblon macro magic";
  - **P7**: DAN, "Dauin Diversity" (2020), a photo caption only;
  - **P8**: DAN, "On the Hunt" (2017, Anilao);
  - **P9**: X-Ray Mag, "Romblon: mystical island of phantoms, ghosts and butterflies".
- **Genera or no species only**:
  - P3: scuba.com "Nudibranchs, 5 great sites": *Hypselodoris* and *Phyllidia* for Anilao; of its species, *Phyllidia
    varicosa* is tied to Bali and the others to no place;
  - P5: Dive The World, Dauin: *Chromodoris*, *Phyllidia*, *Nembrotha*, *Tambja*;
  - Atlantis Dauin and Puerto Galera "Top 5"; Bluewater "Anilao trip report 2018"; Sea Explorers Dauin.
- **Not readable**:
  - originaldiving.com, scubadiving.com: HTTP 403;
  - divephotoguide.com, wetpixel.com: HTTP 503;
  - the-three-p.com: empty page;
  - diveoclock.com: redirected away.
- **Result** **[measured on these pages]**:
  - named on 2 pages each: *Chromodoris willani* (P4, P8), *Costasiella kuroshimae* (P2, P9), *Cyerce nigra* (P6, P9),
    *Hexabranchus sanguineus* (P1, P4), *Melibe colemani* (P6, P9);
  - on 1 page: 16 more (Appendix B.4).
  - Two of the five pairs come from one magazine on one island (Romblon).
- **Why it is weak**: 7 usable pages, marketing that names few species, and nicknames ("Pikachu", "Shaun the Sheep")
  that a page rarely ties to one species.
- **What it shows all the same**: the species divers travel for are often not the common ones, and half are not
  nudibranchs.

### 4.3 English Wikipedia pageviews: the least weak

- **The measure.** Views of the species' English article over 12 months (2025-11 to 2026-10, users only, redirects
  followed). It is a public-interest proxy: what people look up.
- **Coverage.** 320 of the 452 confirmed species have an article; 47 of the common top 50 do **[measured]**.
- **Its biases** **[guess]**:
  - worldwide interest, not Philippine;
  - favours species with a nickname that went viral;
  - an article's existence depends on volunteer editors;
  - *Hexabranchus sanguineus*'s article is "Spanish dancer", which readers may use for *H. lacer* too;
  - 6 names reach their article through a redirect, such as *Cephalopyge trematoides* to its genus.
- **The top 10**:
  1. *Costasiella kuroshimae* (191,665);
  2. *Jorunna parva* (128,474);
  3. *Elysia marginata* (21,998);
  4. *Hexabranchus sanguineus* (18,433);
  5. *Thecacera pacifica* (10,983);
  6. *Chromodoris willani* (9,237);
  7. *C. annae*;
  8. *Jorunna funebris*;
  9. *Chromodoris lochi*;
  10. *Dolabella auricularia*.
- **Appendix B.1** has the top 40, with the other proxies beside each.

### 4.4 Rarity × charisma: an option, unstable

- **The measure**: Wikipedia views per Philippine observer.
- **Its top 5**: *Jorunna parva* (6 observers), *Costasiella kuroshimae*, *Hexabranchus sanguineus*, *Thecacera
  pacifica*, then *Tritoniopsis elegans*. The last has 3 observers and 899 views.
- **Why it is unstable**: dividing by a small observer count makes it jump with one more observation. The tail
  (Appendix B.2) is noise.
- **Use**: an idea for an achievement ("the rare stars"), not an order.

### 4.5 Field guides' covers: dropped

The cover species of the regional guides could not be checked from public pages. The proxy is dropped, not guessed.

### 4.6 The ranked candidate list, and its overlap with "common"

- **Proposed sought-after list**: Wikipedia pageviews (4.3) over the confirmed species, with the web mentions and the fave
  rate as tags only (Appendix B.1).
- **Overlap with "common"** **[measured]**:
  - like for like, nudibranchs only: 30 of the 50 most-viewed nudibranchs are in the common top 50. With every group
    ranked together, 26 of 50;
  - the divergence is at the top. None of the 5 most viewed is in the common nudibranch top 50:
    - two are sacoglossans: *Costasiella kuroshimae*, and *Elysia marginata*, the most common sacoglossan;
    - three are nudibranchs ranked 144th to 262nd;
  - the Spanish dancer caveat (§2.3): the pages and Wikipedia say "Spanish dancer" for either *Hexabranchus* species.
    Counted as one item, it is common (*H. lacer*, 42nd);
  - 35 of the all-group top 50 are nudibranchs.
- **What that means for the game**: "sought-after" is not a starting order. A beginner meets the common species first.
  The sought-after list could make:
  - a named set of "stars" with its own achievement;
  - or a later circle.
- Which proxy, and its use, is question (c) for Pierre.

## 5. Photos

### 5.1 Supply by licence

Licence classes as the app's rules use them (rule P1; `tools/fetch_fish.py` `OK`, `tools/rights.py` `OPEN`):
- **open**: CC0 or CC BY;
- **NC**: CC BY-NC;
- **excluded**: share-alike, no-derivatives, all rights reserved.

An observation counts in the best class among its photos. Counts are per observation, since all photos of a question come
from one observation (rule P4).

- **Philippines** (the 28,045 species-level sea-slug RG observations) **[measured]**:
  - open 1,039 (3.7%);
  - NC 17,253 (61.5%);
  - excluded 9,753 (34.8%).
- **The common top 50 in the Philippines alone**:
  - every species has 30 or more observations with an open or NC photo;
  - 31 have 8 or more with an open photo.
- **Worldwide** (RG, an observation with at least one photo of that licence):
  - every species of the common top 50 has **40 or more** observations with an open or NC photo;
  - **37 of the 50** have 30 or more with an open photo; the median is 50;
  - the 13 below 30 with an open photo are listed in the CSV. The fewest: *Diversidoris crocea* (6), *Favorinus
    tsuruganus* (8), *Reticulidia halgerda* and *Phyllidiopsis krempfi* (11).
  - Of the common top 100, all have 30 or more with open or NC photos.
- **Against the fish's needs** (FISH_PATH "Fish photos and the admin": 8 observations a species to start, 30-40 aimed
  for, a candidate cap of 30 for a stable species):
  - **every species of the top 100 reaches the cap with open + NC photos**, from the Philippines alone for 97 of them;
  - with open photos only, the top 50 reach 8 almost everywhere (49 of 50) but 30 only for 37.
  - **Presence rule.** A photo from abroad is allowed only for a species confirmed in the Philippines (rule C8). The 452
    confirmed species meet it by construction.
- **The sought-after species are thinner in open photos** **[measured]**:

  | Species | Open, worldwide | NC, worldwide |
  |---|---|---|
  | *Goniobranchus rubrocornutus* | 0 | 171 |
  | *Cyerce nigra* | 3 | 205 |
  | *Melibe colemani* | 7 | 102 |
  | *Jorunna parva* | 8 | 135 |
  | *Thecacera pacifica* | 8 | 259 |
  | *Costasiella kuroshimae* | 20 | 229 |

  With CC BY-NC they all reach the cap; open photos alone do not.
- **Rights.** CC BY-NC photos cannot go into a paid or licensed product (ROADMAP "The app as a generic product"). The licence
  tie-break (CC0 / CC BY first among equals) carries over unchanged.

### 5.2 What is different about nudibranch photos

- **Tiny animals, macro photos** **[guess]**. Many sea slugs are a few millimetres to a few centimetres long, so most
  good photos are macro shots with a flash on a dark background. The fish rubric already treats those as good light
  **[read: judging/FISH.md, rubric 6]**.
- **The views that matter differ by group** **[guess, to check against the guide before writing a rubric]**:
  - dorids (*Chromodoris*, *Hypselodoris*, *Phyllidia*): a dorsal or dorso-lateral view showing the rhinophores, the
    gill plume and the mantle's pattern and rim. Phyllidiids need the dorsal tubercles. Stoffels et al. (2016): "Structure
    and pattern of the notal tubercles are important characters for identification" **[read: full text,
    Introduction]**;
  - aeolids (*Pteraeolidia*, *Phyllodesmium*, *Coryphellina*): a lateral view showing the cerata and the oral tentacles;
  - an animal on its back, a ventral view through glass, or a curled-up or swimming animal hides the characters.
- **Things to exclude or tag.** A nudibranch rubric needs its own tags (the fish's `view` values do not apply):
  - **egg ribbons** with no adult, to exclude;
  - **juveniles**, which can differ in colour;
  - **mating pairs or groups**, several of one kind: fine, like the fish's `s`;
  - **two species in frame**, such as a nudibranch on its prey sponge or hydroid: fine unless the other could be taken
    for the subject (rule P3);
  - **camouflage**: a slug matching the soft coral or seaweed it lives on **[guess]**.
- **The annotations cannot do the filtering.** Of the 28,045 species-level observations, only 19 are annotated "egg", 32 "juvenile" and
  192 "adult" **[measured]**. Eggs and juveniles must be caught by the judging pass, as for the fish.
- **Identification risk in the labels themselves.** Layton, Gosliner & Wilson (2018) delimited 39 *Chromodoris* taxa
  (18 undescribed). "Only five of 39 taxa" showed "stable colour patterns and distinct morphotypes" **[read: abstract]**.
  A Research Grade *Chromodoris* photo is identified from its colours, so some labels will be wrong at species level. The
  same holds for *Phyllidia* cf. *babai* (Stoffels et al. 2016). Rule C5 applies: flag, never settle.

## 6. Names and the learning path

### 6.1 English common names

- **Coverage** **[measured]**:

  | Species set | Has an iNat English name | Has a WoRMS English vernacular | Has both | Same name in both |
  |---|---|---|---|---|
  | Common top 50 | 40 | 24 | 19 | **2** |
  | Common top 100 | 65 | 39 | 27 | **2** |
  | All 452 confirmed sea slugs | 151 | 162 | 67 | **7** |

- **The two in the top 50**:
  - *Phyllidia picta*, "Painted Phyllidia";
  - *Phyllidiella pustulosa*, "Pustulose Wart Slug".
- **Why the references disagree.** Most iNat names are a patronym or the genus spelled out: "Anna's Chromodoris",
  "Willan's Chromodoris", "Tryon's Hypselodoris". The WoRMS English vernaculars of these species follow a systematic
  scheme instead: "Rainbow Dorid" for *Goniobranchus*, "Wrinkle Dorid" for *Nembrotha*, "Split-tooth Dorid" for
  *Hypselodoris* **[read: the records]**. I did not check where WoRMS's vernaculars come from.
- **What divers actually say** is a handful of nicknames ("Spanish dancer", "Pikachu", "Shaun the Sheep", "sea bunny",
  "blue dragon"). These are not names of single species in every source.
- **Meaning for the common-name branch** **[measured]**. The fish rule as built (FISH_PATH "Common names",
  `tools/fish_common.py`) keeps a name found in both references, at most 3. When none recurs, it gives the species one
  reference's main name (`single`). A species no reference names has none (Q247). With iNaturalist and WoRMS as the two
  references:

  | Species set | Gets a common-name unit | Of which: a name both references give | Of which: one reference only, or two that disagree (`single`) | No name (Q247) |
  |---|---|---|---|---|
  | Common top 50 | 45 | 2 | 43 | 5 |
  | Common top 100 | 77 | 2 | 75 | 23 |
  | All 452 confirmed | 246 | 7 | 239 | 206 |

  So **the rules do not make the branch empty**: it would hold about half the species, nearly all on a single
  reference's name. For the fish, `single` is a rare exception (two species in 664). Here it would be the norm, and
  Pierre asked for "well-used" names.
- **Recommendation** **[guess]** (a preference, question (d)):
  - no common-name branch for this subject;
  - the **scientific path only**: families, genera, species, like the fish's branch B;
  - iNat's English name shown on the sheet as information, with its source;
  - the nicknames on the sheets where a source ties them to the species.
- This is question (d) for Pierre.

### 6.2 Families, genera, species: how the fish path maps

- **Sizes** **[measured]**:
  - **common top 50**: 9 families, 24 genera;
  - **common top 100**: 18 families, 41 genera;
  - **all 352 confirmed nudibranchs**: 34 families, 102 genera. The biggest: *Hypselodoris* 26, *Phyllodesmium* 17,
    *Goniobranchus* 16, *Trapania* 14, *Chromodoris* 13, *Dermatobranchus* 13.
  - For comparison, the fish's circle 1 has 28 families, 98 genera and 469 species.
- **The fish path maps one to one**: family → genus → species. Chromodorididae alone is 24 of the top 50, so its genera
  carry most of the early game.
- **Circles.** The fish's circle 1 is the IMR course. With no IMR content (§8), the circles could be:
  1. the most common nudibranchs;
  2. the rest of the confirmed nudibranchs;
  3. the other sea-slug groups (§2.2).

  The fish's commonness ordering inside a family already does that job **[guess]**.
- **Identification groups (rule S3).** The fish follow a regional key's groups. "A region with no key has no such rule"
  (S3) **[read]**. A sea-slug key could be the Indo-Pacific guide's own sections. I have not read that book's index,
  so this is open. Until then the WoRMS classification is the tree (the Tree's WoRMS view).

### 6.3 The classic look-alike sets

**Sourced** (rule C2):
- ***Chromodoris*, the black-lined species.** Layton et al. (2018) found colour patterns unreliable in the genus. They
  give "the first evidence for regional mimicry": *C. colemani* and *C. joshi* match "locally abundant congenerics"
  **[read: abstract, doi:10.1016/j.ympev.2018.02.008]**. 13 *Chromodoris* species are confirmed in the
  Philippines. Nine of them are in the common top 70: *C. annae*, *C. willani*, *C. lochi*, *C. magnifica*, *C.
  colemani*, *C. strigata*, *C. alcalai*, *C. dianae*, *C. joshi*. It is the strongest look-alike set, and the one where photo labels are least sure.
- **Phyllidiidae** (*Phyllidia*, *Phyllidiella*, *Phyllidiopsis*, *Reticulidia*): 10 of the top 50. Stoffels et al.
  (2016) **[read: abstract and Introduction, doi:10.3897/zookeys.605.7136]**:
  - "Structure and pattern of the notal tubercles are important characters for identification"; "many species cannot be
    identified based on colouration alone owing to their high intra-specific colour variation";
  - COI confirms the boundaries of the variable *Phyllidia elegans*, *P. varicosa* and *Phyllidiopsis krempfi*;
  - *Phyllidia* cf. *babai* hides 2 to 3 species.
- ***Hexabranchus sanguineus* / *H. lacer*** (the two Spanish dancers): WoRMS cites Tibiriçá et al. 2023 **[read:
  WoRMS]**.
- ***Pteraeolidia ianthina* / *P. semperi***: WoRMS cites Wilson & Burghardt 2015 **[read: WoRMS]**. Only *P. semperi*
  is recorded in the Philippines.

**Candidates, unsourced** (a source is needed before any is used):
- the *Nembrotha* species (*kubaryana*, *cristata*, *milleri*, *lineolata*, *chamberlaini*: 5 of the top 50);
- the blue-and-purple *Hypselodoris*;
- the red-rimmed *Goniobranchus* (*kuniei*, *geometricus*, *coi*, *fidelis*);
- **polyclad flatworms**, the classic "is it a nudibranch?" trap. There are 55 species in the Philippines, but they are
  not sea slugs. This would be a cross-group decoy, and needs a source.

### 6.4 What carries over unchanged, and what is new

**Carries over** (rule S1: one engine, a subject is data):
- a `core.js` `SUBJECTS` entry and its `UNITS` functions, opened to a group first (`open: 'group'`, S1);
- the generic Tree `taxtree.js`. On the admin's covers by node, ARCHITECTURE ("Fish content") already says: "Another
  subject (a nudibranch or plant key, or the corals at more than one rank) needs only data: its ranks in `SUBJECTS`
  `sheets`, its tree on its unit page (…), and its covers read by node id at build";
- the photo pipeline: candidates, judging, R2, the licence tie-break;
- presence (`tools/presence.py`: one rule, `kind` per subject);
- `tools/inat.py`;
- the species ordering by commonness;
- typed scientific names with WoRMS beside them (rule S2's spirit), and `points.json` for discrepancies.

**New**:
- a nudibranch judging rubric (§5.2);
- a per-subject area for commonness and presence (§7);
- no IMR tag, no IMR welcome answer, no circle 1 = IMR course;
- no common-name branch (if Pierre agrees);
- no identification-group key yet;
- family and genus cues from the literature and the guide, each sourced (rule C2).

The fish tools hard-wire "fish" names and paths: `fish_game.py`, `fetch_fish.py`, `fish_commonness.py`. They need
generalising or copying, which is the bulk of the work (§9).

## 7. The instance question: "the Philippines in general" against Dauin

- **Today.** The instance has one centre (`tools/instance.json`: Dauin, 40 km). It decides presence "near" (C8), the
  fish's local commonness rings and the default covers (the leaf "most seen around the instance's centre"; ARCHITECTURE
  "The instance's centre").
- **What Pierre asked.** A sea-slug mode "for the Philippines in general", so the order cannot come from 40 km around
  Dauin. That area has 173 RG nudibranch species and 2,401 observations, a tenth of the country's.
- **The options**:
  - **A. The instance centre as it is.** Order and covers by observers near Dauin. Simple, but it is the Dauin mode
    Pierre did not ask for.
  - **B. A per-subject area** (recommended) **[guess]**:
    - the subject declares the area its commonness and photo search use (iNaturalist place 6873, the Philippines);
    - the instance centre stays Dauin for what is local: the "seen near Dauin" tag on a species, near-Dauin
      confirmation, and a cover tie-break;
    - fish keep their rings, sea slugs rank by the country.
    - It is a new field read by the tools: a data format other code would follow, hence a question for Pierre.
  - **C. The fish's rings with the weights reversed**: the country strongest, then 250 km, then 40 km. A variant of B.
    Not needed while one country-wide signal ranks well (§3.1).
  - **D. A second instance for the Philippines.** The instance model is one per organisation (ROADMAP "The app as a
    generic product"): too heavy for one subject.
- **Related.** ROADMAP "Partial transfer between regions" asks whether knowing a species from photos taken elsewhere
  counts near Dauin. A country-wide subject takes its photos country-wide (and abroad, for confirmed species) from the
  start, so it is a natural first test of that question.
- This is question (b).

## 8. IMR content

**Searched**:
- the IMR material the repository holds: the coral Lecture 6 content in `data.json`, the fish presentation and the
  EventMeasure reference list in `fish.json` and `tools/fish_source.json`, `judging/`, and `docs/` (ARCHITECTURE,
  HANDOVER "External resources");
- searched for "nudibranch", "sea slug", "opisthobranch", "mollus", "gastropod".

**Nothing about nudibranchs was found in the repository's IMR material.** The only mention is a fish note on sweetlips
juveniles: "A resemblance to flatworms or nudibranchs has been suggested, not established". Whether IMR teaches sea slugs
elsewhere is a question for an IMR trainer (rule C5), not a conclusion. No one was contacted.

**What a mode without IMR content means:**
- rule C1 has nothing to protect;
- C2, C5 and C6 apply fully: every cue and pair sourced; discrepancies to `points.json`; cues from species present in the
  Philippines;
- no "I'm at IMR" path;
- the mode is not part of the RAs' survey training: ReefCloud labels benthos, EventMeasure tags fish. It serves divers
  and the generic product more than IMR's programme **[guess]**;
- the ROADMAP row "The app as a generic product" has it among an organisation's own choices of taxa.

## 9. Step plan (PR-sized, reusing the fish tooling)

**Since then** (2026-11-15): Pierre answered (a)-(d) (Q369). Step 1 and the photo counts of step 3 are done in
[2026-11-15-seaslug-list.md](2026-11-15-seaslug-list.md): `tools/build_seaslugs.py` → `tools/seaslugs.json`, the
stars set and circle 1 (decided, Q377).

Sizes are rough, for one agent **[guess]**.

1. **Species list and presence**: about 1 day.
   - A `tools/slug_source.json` with the root taxa (§2.2), and a build reusing `tools/presence.py` with a new `kind`.
   - Writes `slugs.json`: species, genus, family, WoRMS id and name, presence; the commonness of §3.1, and the near-Dauin
     counts as a tag.
   - A `tools/taxonomy.json` section, and the two *Tenellia* / *Phestilla* points in `points.json`.
2. **The per-subject area** (§7, once Pierre answers (b)): half a day.
   - `tools/instance.json` or the subject's source file gains the area; the tools read it.
   - The fish keep Dauin's rings.
3. **Candidate photos**: about 1 day.
   - `tools/fetch_fish.py`'s search, generalised to a subject: the same licence set and rule C8 abroad.
   - About 30 observations a species for the first circle.
4. **The rubric and the first judging pass**: 1-2 days.
   - `judging/SLUGS.md`: the views, frame fill, eggs, juveniles, mating, camouflage, other species (§5.2).
   - Judge the first circle's candidates (about 50 species × 30 = 1,500 photos).
5. **The subject in the app**: 1-2 days.
   - A `SUBJECTS` entry (`open: 'group'`, beta), `UNITS` for family, genus and species, scientific names only.
   - A `core.js` change, so a `tools/sync/changes/` file (rule D3), and the sheet's replay where needed.
   - Smoke tests in the slot.
   - **Built** (2026-11-15, PR "Sea slugs in the app"): `core.js` `SUBJECTS` `seaslug` ("Sea slugs", `open: 'group'`,
     beta; its group managed on its admin Players page once the sheet script knows it, `SEASLUG_SHEET`), and `app.js`
     `UNITS.seaslug`, read through the fish engine: `tools/seaslug_game.py` writes `seaslug.json` (circle 1 in
     `fish.json`'s shape: 14 families, 24 genera, 45 species, scientific names only, no key, commonness over the
     Philippines) and `seaslug-game.json` (the judged candidates that are sure, start 6, cap 12, +5 for *H. lacer*'s
     juvenile form). Families are the game's units, genera the opt-in set as the fish's branch B; species have their
     sheets but no game unit yet (the fish species level, #975, comes first). Not replayed by the sheet, no leaderboard,
     no achievements. The photos are still read from iNaturalist (`r: 1`) until step 6. ARCHITECTURE.md "Subjects".
6. **The R2 game photos**: about 1 day. `tools/fish_game.py` generalised (paths, prefixes) for a second photo subject.
   - **Built, off until Pierre's go** (2026-11-16, PR "Sea slugs: R2 game photos (off), circles 2 and 3 in the game"):
     `tools/seaslug_game.py --r2` downloads the sea-slug photos in play with the fish's pipeline (`tools/fish_game.py`
     `download`: the four sizes, the judge's crop) into `r2-upload/` and lists them without `r`, the original kept as the
     fallback; `--plan` says what a run would upload. The Candidate photos workflow runs it once its `SEASLUG_R2` is
     `on`; until then the photos stay read from iNaturalist (`r: 1`). Circles 2 and 3 joined circle 1 in the game data in
     the same PR (33 families, 205 species), opening at the fish's thresholds. ARCHITECTURE.md "Tools".
7. **Tree and sheets**: about 1 day, then content as it comes.
   - The build writes the generic tree section; the admin's Tree shows the subject.
   - Family and genus sheets with sourced cues.
8. **Look-alikes**: half a day, then as data comes.
   - The sourced sets of §6.3 as declared pairs.
   - Then the players' confusions once answers exist.

Steps 1, 3 and 4 can start without the app work. Steps 2 and 5 wait for Pierre's answers.

## 10. Questions for Pierre

Only decisions that are his. Each comes with a recommendation.

- **(a) Scope of the subject.**
  - Nudibranchs only? Or nudibranchs first, with the other sea slugs (Sacoglossa, then headshield slugs, sidegill slugs,
    sea hares) as later circles?
  - Two of the five most-viewed species, the most viewed of all among them, are sacoglossans, and the reference guide
    covers all the groups together.
  - *Recommendation*: a sea-slug subject, nudibranchs first (§2.2).
- **(b) Country against instance.**
  - Should a subject declare its own area for commonness and photo searches (the Philippines here), while the instance
    centre (Dauin) stays for what is local?
  - It is a new field that other code would follow.
  - *Recommendation*: yes, option B (§7).
- **(c) "Sought-after": which metric, and for what?**
  - Wikipedia pageviews (the least weak, worldwide interest), the dive pages (thin), faves (97% zero), or his own list?
  - Used as a named set with an achievement, a later circle, or a tag only?
  - *Recommendation*: pageviews for a "stars" set and its achievement, never the starting order; Pierre edits the set
    (§4.6).
- **(d) Names.**
  - Only 2 of the 50 most common species have an English name that two references agree on.
  - The fish rule's fallback would still name 45 of them, 43 from a single reference or from two that disagree (§6.1).
  - Should this subject run on scientific names only (families, genera, species), with iNat's English names and the
    dive nicknames shown on the sheets as information? Or should it keep a common-name branch on those single-source
    names, as the fish rule allows?
  - *Recommendation*: yes (§6.1).

Decided here as implementation details:
- the commonness metric (distinct observers, §3.1);
- the licence classes (unchanged);
- the rubric's tags;
- GBIF as a cross-check only;
- the order of the step plan.

## 11. Sources

- **iNaturalist API**, read 2026-11-15:
  - `api.inaturalist.org/v2/observations` (taxa 47113, 47801, 775833, 49784, 775804; place 6873; Research Grade);
  - `v1/observations/species_counts`, `v1/taxa`, `v1/places`.
- **WoRMS REST API**, read 2026-11-15: `AphiaRecordsByMatchNames`, `AphiaRecordsByName`, `AphiaVernacularsByAphiaID`,
  `AphiaSourcesByAphiaID`. Nudibranchia AphiaID 1762; Opisthobranchia 382226.
- **GBIF occurrence API**, read 2026-11-15: `occurrence/search?country=PH&taxonKey=980` faceted by dataset and species;
  `dataset/{key}` for the dataset titles.
- **Wikimedia pageviews API**, read 2026-11-15: `metrics/pageviews/per-article/en.wikipedia/all-access/user/…/monthly`;
  titles resolved through `en.wikipedia.org/w/api.php`, redirects followed. Some answers were HTTP 429 and were retried
  after paced waits.
- **Papers** (abstracts read through PubMed, or the paper's page):
  - Johnson R.F. & Gosliner T.M. (2012). Traditional taxonomic groupings mask evolutionary history: a molecular phylogeny
    and new classification of the chromodorid nudibranchs. *PLoS ONE* 7(4): e33479. <https://pmc.ncbi.nlm.nih.gov/articles/PMC3323602>
  - Layton K.K.S., Gosliner T.M. & Wilson N.G. (2018). Flexible colour patterns obscure identification and mimicry in
    Indo-Pacific *Chromodoris* nudibranchs. *Mol. Phylogenet. Evol.* 124: 27-36. <https://doi.org/10.1016/j.ympev.2018.02.008>
  - Stoffels B.E.M.W. et al. (2016). Phylogenetic relationships within the Phyllidiidae. *ZooKeys* 605: 1-35.
    <https://doi.org/10.3897/zookeys.605.7136>
  - Cited through WoRMS only, not read: Tibiriçá et al. 2023 (*Hexabranchus*); Wilson & Burghardt 2015
    (*Pteraeolidia*); Korshunova, Fletcher & Martynov 2025 (*Phestilla*); Ekimova et al. (*Coryphellina*).
- **Guide**: Gosliner T.M., Valdés Á. & Behrens D.W. (2018). *Nudibranch & Sea Slug Identification: Indo-Pacific*, 2nd
  ed. New World Publications. Its title and listings only (e.g. <https://reef.org/node/10590>); the book was not read.
- **Dive pages** (§4.2), read 2026-11-15:
  - P1 <https://blueribbondivers.com/what-lives-in-anilao-a-field-guide-to-the-richest-reef-on-earth/>
  - P2 <https://atmosphereresorts.com/scuba-diving/meet-our-critters/>
  - P3 <https://www.scuba.com/blog/nudibranchs/>
  - P4 <https://www.dive-the-world.com/diving-sites-philippines-batangas-anilao.php>
  - P5 <https://www.dive-the-world.com/diving-sites-philippines-dumaguete-dauin.php>
  - P6 <https://xray-mag.com/content/romblon-macro-magic>
  - P7 <https://dan.org/?p=11672>
  - P8 <https://dan.org/?p=14694>
  - P9 <https://xray-mag.com/content/romblon-mystical-island-phantoms-ghosts-butterflies>
  - No species named: <https://www.atlantishotel.com/?p=19071>, <https://www.atlantishotel.com/?p=19860>,
    <https://www.bluewaterdivetravel.com/article/anilao-trip-report-dec-2018>, <https://sea-explorers.com/dive-sites/dauin>
- **Repository**: AGENTS.md; docs/FISH_PATH.md; docs/ROADMAP.md; docs/ARCHITECTURE.md ("Subjects", "Fish content",
  "The instance's centre"); docs/rules/photos.md, content.md, subjects.md; judging/FISH.md; `tools/instance.json`,
  `tools/presence.py`, `tools/inat.py`, `tools/fetch_fish.py`, `tools/rights.py`, `tools/fish_commonness.py`,
  `tools/fish_game.py`, `tools/presence_checklists.json`.

## Appendix A. The 50 most common nudibranchs in the Philippines (pulled 2026-11-15)

Ranked by distinct Research Grade observers in the Philippines, then half-degree cells, then observations (§3.1).
- **Prov.**: provinces with an observation.
- **Cells**: half-degree cells with an observation.
- **Near Dauin**: within 40 km.
- **Top observer**: the share of the species' observations made by its single most active observer (an aggregate).
- **Open / NC (world)**: worldwide Research Grade observations with a CC0 or CC BY photo / with a CC BY-NC photo.

| # | Species | Family | Observers | Obs. | Prov. | Cells | Near Dauin obs. (observers) | Top observer | iNat English name | Open / NC obs. (world) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | *Chromodoris annae* | Chromodorididae | 262 | 1175 | 19 | 38 | 144 (51) | 6% | Anna's Chromodoris | 213 / 1612 |
| 2 | *Nembrotha kubaryana* | Polyceridae | 251 | 646 | 18 | 29 | 174 (79) | 4% | Dusky Nembrotha | 103 / 1121 |
| 3 | *Chromodoris willani* | Chromodorididae | 203 | 788 | 18 | 33 | 11 (6) | 3% | Willan's Chromodoris | 73 / 966 |
| 4 | *Nembrotha chamberlaini* | Polyceridae | 180 | 585 | 12 | 18 | 26 (15) | 4% | Chamberlain's Nembrotha | 45 / 583 |
| 5 | *Nembrotha lineolata* | Polyceridae | 173 | 434 | 17 | 27 | 113 (62) | 5% | Lined Nembrotha | 44 / 514 |
| 6 | *Hypselodoris tryoni* | Chromodorididae | 169 | 396 | 14 | 22 | 56 (28) | 7% | Tryon's Hypselodoris | 138 / 1748 |
| 7 | *Phyllidia varicosa* | Phyllidiidae | 165 | 432 | 21 | 35 | 92 (31) | 8% | Varicose Wart Slug | 286 / 2685 |
| 8 | *Halgerda batangas* | Discodorididae | 163 | 320 | 15 | 21 | 30 (17) | 8% | Batangas Halgerda | 109 / 607 |
| 9 | *Pteraeolidia semperi* | Facelinidae | 162 | 474 | 18 | 31 | 81 (38) | 6% | Blue Dragon | 267 / 3283 |
| 10 | *Chromodoris lochi* | Chromodorididae | 158 | 442 | 14 | 25 | 16 (12) | 4% | Loch's Chromodoris | 178 / 1324 |
| 11 | *Chromodoris magnifica* | Chromodorididae | 157 | 413 | 15 | 25 | 43 (26) | 4% | Magnificent Chromodoris | 52 / 742 |
| 12 | *Phyllidia ocellata* | Phyllidiidae | 155 | 345 | 19 | 30 | 43 (20) | 5% | Ocellate Phyllidia | 204 / 1781 |
| 13 | *Goniobranchus geometricus* | Chromodorididae | 155 | 435 | 14 | 24 | 58 (30) | 7% | Geometric Goniobranchus | 81 / 1379 |
| 14 | *Phyllidia coelestis* | Phyllidiidae | 154 | 357 | 18 | 30 | 36 (17) | 5% | Sky Blue Phyllidia | 100 / 1054 |
| 15 | *Phyllodesmium briareum* | Myrrhinidae | 154 | 339 | 15 | 21 | 31 (25) | 5% | Yellow-tipped Phyllodesmium | 37 / 384 |
| 16 | *Jorunna funebris* | Discodorididae | 153 | 334 | 15 | 33 | 89 (42) | 8% | Mourning Dorid | 177 / 1375 |
| 17 | *Phyllidia elegans* | Phyllidiidae | 149 | 309 | 18 | 32 | 24 (17) | 5% | Elegant Phyllidia | 166 / 1063 |
| 18 | *Nembrotha cristata* | Polyceridae | 143 | 308 | 10 | 16 | 117 (53) | 13% | Crested Nembrotha | 65 / 675 |
| 19 | *Nembrotha milleri* | Polyceridae | 130 | 356 | 10 | 16 | 118 (45) | 8% | Miller's Nembrotha | 31 / 417 |
| 20 | *Ardeadoris egretta* | Chromodorididae | 126 | 195 | 15 | 23 | 20 (15) | 11% | — | 13 / 226 |
| 21 | *Goniobranchus kuniei* | Chromodorididae | 124 | 247 | 15 | 23 | 19 (16) | 6% | — | 61 / 755 |
| 22 | *Doriprismatica atromarginata* | Chromodorididae | 118 | 265 | 12 | 21 | 25 (11) | 6% | Black-margined Nudibranch | 146 / 3703 |
| 23 | *Caloria indica* | Facelinidae | 113 | 276 | 14 | 18 | 92 (37) | 6% | Indian Caloria | 144 / 1079 |
| 24 | *Thecacera picta* | Polyceridae | 112 | 319 | 12 | 17 | 53 (35) | 7% | — | 30 / 339 |
| 25 | *Goniobranchus coi* | Chromodorididae | 111 | 186 | 15 | 20 | 25 (24) | 8% | Coi's Goniobranchus | 46 / 551 |
| 26 | *Hypselodoris apolegma* | Chromodorididae | 105 | 195 | 13 | 18 | 4 (4) | 5% | Giant Hypselodoris | 46 / 287 |
| 27 | *Tambja morosa* | Polyceridae | 100 | 193 | 12 | 19 | 29 (14) | 6% | Gloomy Nudibranch | 70 / 944 |
| 28 | *Phyllidia picta* | Phyllidiidae | 96 | 206 | 13 | 20 | 29 (14) | 8% | Painted Phyllidia | 92 / 809 |
| 29 | *Coryphellina exoptata* | Flabellinidae | 92 | 177 | 13 | 17 | 6 (5) | 6% | Desirable Flabellina | 119 / 1073 |
| 30 | *Hypselodoris bullockii* | Chromodorididae | 90 | 183 | 14 | 19 | 4 (4) | 15% | Bullock's Hypselodoris | 60 / 661 |
| 31 | *Reticulidia halgerda* | Phyllidiidae | 84 | 135 | 11 | 14 | 8 (8) | 4% | Chocolate Mango Nudibranch | 11 / 208 |
| 32 | *Goniobranchus fidelis* | Chromodorididae | 81 | 205 | 12 | 18 | 13 (9) | 11% | Faithful Sea Slug | 50 / 858 |
| 33 | *Chromodoris colemani* | Chromodorididae | 77 | 156 | 12 | 17 | 5 (5) | 8% | — | 19 / 233 |
| 34 | *Hypselodoris variobranchia* | Chromodorididae | 76 | 146 | 8 | 15 | 0 (0) | 8% | — | 26 / 148 |
| 35 | *Favorinus tsuruganus* | Facelinidae | 76 | 243 | 10 | 11 | 8 (7) | 14% | — | 8 / 404 |
| 36 | *Chromodoris strigata* | Chromodorididae | 74 | 175 | 11 | 14 | 4 (4) | 12% | Streaked Chromodoris | 31 / 332 |
| 37 | *Hypselodoris decorata* | Chromodorididae | 73 | 156 | 12 | 15 | 10 (8) | 12% | — | 22 / 351 |
| 38 | *Goniobranchus hintuanensis* | Chromodorididae | 72 | 181 | 10 | 11 | 1 (1) | 6% | Bus Stop Nudibranch | 30 / 491 |
| 39 | *Diversidoris crocea* | Chromodorididae | 69 | 151 | 10 | 16 | 3 (3) | 15% | — | 6 / 155 |
| 40 | *Chromodoris alcalai* | Chromodorididae | 66 | 113 | 8 | 15 | 1 (1) | 6% | Alcala's Chromodoris | 38 / 384 |
| 41 | *Phyllidiopsis shireenae* | Phyllidiidae | 65 | 103 | 14 | 19 | 6 (4) | 5% | Shireen's Phyllidiopsis | 21 / 245 |
| 42 | *Hexabranchus lacer* | Hexabranchidae | 64 | 129 | 13 | 15 | 13 (9) | 12% | Decumbent Spanish Dancer | 26 / 901 |
| 43 | *Phyllidiopsis xishaensis* | Phyllidiidae | 63 | 98 | 13 | 17 | 12 (10) | 9% | Striped Phyllidiopsis | 23 / 413 |
| 44 | *Aegires villosus* | Aegiridae | 63 | 188 | 9 | 13 | 2 (2) | 15% | — | 18 / 392 |
| 45 | *Ceratosoma gracillimum* | Chromodorididae | 63 | 149 | 8 | 13 | 4 (2) | 14% | Slender ceratosoma nudibranch | 53 / 467 |
| 46 | *Phyllidiella pustulosa* | Phyllidiidae | 61 | 123 | 13 | 18 | 27 (10) | 11% | Pustulose Wart Slug | 163 / 1409 |
| 47 | *Hypselodoris emma* | Chromodorididae | 60 | 96 | 9 | 10 | 4 (4) | 9% | Emma's Hypselodoris | 33 / 320 |
| 48 | *Phyllidiopsis krempfi* | Phyllidiidae | 59 | 89 | 13 | 17 | 3 (3) | 7% | Krempf's Phyllidiopsis | 11 / 215 |
| 49 | *Glossodoris rufomarginata* | Chromodorididae | 59 | 109 | 10 | 12 | 15 (12) | 12% | Caramel Nudibranch | 49 / 947 |
| 50 | *Goniobranchus verrieri* | Chromodorididae | 57 | 127 | 11 | 15 | 6 (6) | 13% | — | 18 / 392 |

## Appendix B. "Sought-after" proxies (pulled 2026-11-15)

### B.1 English Wikipedia pageviews, the top 40 among the 452 confirmed sea slugs

12 months, 2025-11 to 2026-10, users only. The rank in group is the species' commonness rank within its own group. "In common top 50" means the nudibranch top 50 of Appendix A.

| # | Species | Group | Wikipedia views, 12 months | PH observers (rank in group) | Faves per obs. | Web mentions | In common top 50 |
|---|---|---|---|---|---|---|---|
| 1 | *Costasiella kuroshimae* | Sacoglossa | 191,665 | 53 (4) | 0.242 | P2 P9 | no |
| 2 | *Jorunna parva* | Nudibranchia | 128,474 | 6 (262) | 0.111 | — | no |
| 3 | *Elysia marginata* | Sacoglossa | 21,998 | 120 (1) | 0.01 | — | no |
| 4 | *Hexabranchus sanguineus* | Nudibranchia | 18,433 | 18 (144) | 0.0 | P1 P4 | no |
| 5 | *Thecacera pacifica* | Nudibranchia | 10,983 | 14 (176) | 0.083 | — | no |
| 6 | *Chromodoris willani* | Nudibranchia | 9,237 | 203 (3) | 0.029 | P4 P8 | yes |
| 7 | *Chromodoris annae* | Nudibranchia | 7,271 | 262 (1) | 0.032 | — | yes |
| 8 | *Jorunna funebris* | Nudibranchia | 6,682 | 153 (16) | 0.024 | — | yes |
| 9 | *Chromodoris lochi* | Nudibranchia | 5,401 | 158 (10) | 0.018 | — | yes |
| 10 | *Dolabella auricularia* | Aplysiida | 5,152 | 71 (1) | 0.008 | — | no |
| 11 | *Nembrotha kubaryana* | Nudibranchia | 5,046 | 251 (2) | 0.039 | P4 | yes |
| 12 | *Cyerce elegans* | Sacoglossa | 4,921 | 17 (13) | 0.122 | — | no |
| 13 | *Nembrotha cristata* | Nudibranchia | 4,685 | 143 (18) | 0.019 | — | yes |
| 14 | *Chelidonura varians* | Cephalaspidea | 4,181 | 98 (2) | 0.019 | — | no |
| 15 | *Melibe viridis* | Nudibranchia | 4,015 | 34 (89) | 0.052 | — | no |
| 16 | *Melibe colemani* | Nudibranchia | 3,851 | 38 (83) | 0.087 | P6 P9 | no |
| 17 | *Phyllidia varicosa* | Nudibranchia | 2,376 | 165 (7) | 0.012 | — | yes |
| 18 | *Hypselodoris apolegma* | Nudibranchia | 2,162 | 105 (26) | 0.041 | — | yes |
| 19 | *Nembrotha lineolata* | Nudibranchia | 1,673 | 173 (5) | 0.025 | — | yes |
| 20 | *Notodoris minor* | Nudibranchia | 1,597 | 24 (121) | 0.0 | — | no |
| 21 | *Doriprismatica atromarginata* | Nudibranchia | 1,524 | 118 (22) | 0.034 | — | yes |
| 22 | *Hypselodoris bullockii* | Nudibranchia | 1,516 | 90 (30) | 0.049 | — | yes |
| 23 | *Chromodoris magnifica* | Nudibranchia | 1,460 | 157 (11) | 0.01 | — | yes |
| 24 | *Goniobranchus kuniei* | Nudibranchia | 1,428 | 124 (21) | 0.028 | — | yes |
| 25 | *Nembrotha chamberlaini* | Nudibranchia | 1,422 | 180 (4) | 0.07 | — | yes |
| 26 | *Plakobranchus ocellatus* | Sacoglossa | 1,310 | 30 (9) | 0.0 | — | no |
| 27 | *Hypselodoris variobranchia* | Nudibranchia | 1,257 | 76 (34) | 0.041 | — | yes |
| 28 | *Chromodoris dianae* | Nudibranchia | 1,228 | 52 (57) | 0.038 | — | no |
| 29 | *Phyllidiella pustulosa* | Nudibranchia | 1,188 | 61 (46) | 0.024 | — | yes |
| 30 | *Hypselodoris tryoni* | Nudibranchia | 1,088 | 169 (6) | 0.013 | — | yes |
| 31 | *Biuve fulvipunctata* | Cephalaspidea | 1,050 | 4 (40) | 0.0 | — | no |
| 32 | *Goniobranchus coi* | Nudibranchia | 1,014 | 111 (25) | 0.038 | — | yes |
| 33 | *Dolabrifera dolabrifera* | Aplysiida | 981 | 5 (10) | 0.0 | — | no |
| 34 | *Dendrodoris nigra* | Nudibranchia | 942 | 14 (170) | 0.036 | — | no |
| 35 | *Elysia pusilla* | Sacoglossa | 924 | 26 (11) | 0.0 | — | no |
| 36 | *Tritoniopsis elegans* | Nudibranchia | 899 | 3 (321) | 0.286 | — | no |
| 37 | *Tambja morosa* | Nudibranchia | 858 | 100 (27) | 0.021 | — | yes |
| 38 | *Phyllodesmium poindimiei* | Nudibranchia | 858 | 29 (101) | 0.039 | — | no |
| 39 | *Aplysia argus* | Aplysiida | 853 | 27 (3) | 0.0 | — | no |
| 40 | *Phyllodesmium briareum* | Nudibranchia | 792 | 154 (15) | 0.015 | P9 | yes |

### B.2 Rarity × charisma (Wikipedia views per Philippine observer), the top 20

Unstable for small observer counts (§4.4).

| # | Species | Group | Views per observer | Views | PH observers |
|---|---|---|---|---|---|
| 1 | *Jorunna parva* | Nudibranchia | 21412 | 128,474 | 6 |
| 2 | *Costasiella kuroshimae* | Sacoglossa | 3616 | 191,665 | 53 |
| 3 | *Hexabranchus sanguineus* | Nudibranchia | 1024 | 18,433 | 18 |
| 4 | *Thecacera pacifica* | Nudibranchia | 784 | 10,983 | 14 |
| 5 | *Tritoniopsis elegans* | Nudibranchia | 300 | 899 | 3 |
| 6 | *Cyerce elegans* | Sacoglossa | 289 | 4,921 | 17 |
| 7 | *Biuve fulvipunctata* | Cephalaspidea | 262 | 1,050 | 4 |
| 8 | *Dolabrifera dolabrifera* | Aplysiida | 196 | 981 | 5 |
| 9 | *Elysia marginata* | Sacoglossa | 183 | 21,998 | 120 |
| 10 | *Lamprohaminoea cymbalum* | Cephalaspidea | 128 | 383 | 3 |
| 11 | *Aegires citrinus* | Nudibranchia | 121 | 364 | 3 |
| 12 | *Melibe viridis* | Nudibranchia | 118 | 4,015 | 34 |
| 13 | *Hypselodoris confetti* | Nudibranchia | 115 | 460 | 4 |
| 14 | *Aplysia oculifera* | Aplysiida | 115 | 459 | 4 |
| 15 | *Kalinga ornata* | Nudibranchia | 105 | 524 | 5 |
| 16 | *Cephalopyge trematoides* | Nudibranchia | 103 | 309 | 3 |
| 17 | *Melibe colemani* | Nudibranchia | 101 | 3,851 | 38 |
| 18 | *Halgerda okinawa* | Nudibranchia | 93 | 279 | 3 |
| 19 | *Chromodoris lineolata* | Nudibranchia | 92 | 370 | 4 |
| 20 | *Bulla ampulla* | Cephalaspidea | 86 | 513 | 6 |

### B.3 iNaturalist faves per observation, the top 20 (species with 30 or more observations)

97% of observations have no fave (§4.1).

| # | Species | Group | Faves per obs. | Obs. | In common top 50 |
|---|---|---|---|---|---|
| 1 | *Costasiella kuroshimae* | Sacoglossa | 0.242 | 120 | no |
| 2 | *Miamira alleni* | Nudibranchia | 0.232 | 69 | no |
| 3 | *Pleurobranchus grandis* | Pleurobranchida | 0.189 | 37 | no |
| 4 | *Nembrotha milleri* | Nudibranchia | 0.138 | 356 | yes |
| 5 | *Hypselodoris infucata* | Nudibranchia | 0.13 | 46 | no |
| 6 | *Cyerce nigra* | Sacoglossa | 0.123 | 130 | no |
| 7 | *Tenellia bughaw* | Nudibranchia | 0.122 | 49 | no |
| 8 | *Taringa halgerda* | Nudibranchia | 0.122 | 49 | no |
| 9 | *Cyerce elegans* | Sacoglossa | 0.122 | 41 | no |
| 10 | *Nembrotha livingstonei* | Nudibranchia | 0.114 | 35 | no |
| 11 | *Janolus savinkini* | Nudibranchia | 0.106 | 47 | no |
| 12 | *Phyllodesmium rudmani* | Nudibranchia | 0.102 | 88 | no |
| 13 | *Melibe colemani* | Nudibranchia | 0.087 | 160 | no |
| 14 | *Coryphellina lotos* | Nudibranchia | 0.086 | 35 | no |
| 15 | *Pleurobranchus weberi* | Pleurobranchida | 0.086 | 35 | no |
| 16 | *Doriprismatica balut* | Nudibranchia | 0.079 | 38 | no |
| 17 | *Miamira miamirana* | Nudibranchia | 0.078 | 64 | no |
| 18 | *Phyllodesmium opalescens* | Nudibranchia | 0.077 | 65 | no |
| 19 | *Reticulidia fungia* | Nudibranchia | 0.071 | 56 | no |
| 20 | *Nembrotha chamberlaini* | Nudibranchia | 0.07 | 585 | yes |

### B.4 Species named on the dive pages read (§4.2)

| Species | Pages | Group | PH observers | In common top 50 |
|---|---|---|---|---|
| *Chromodoris willani* | P4, P8 | Nudibranchia | 203 | yes |
| *Costasiella kuroshimae* | P2, P9 | Sacoglossa | 53 | no |
| *Cyerce nigra* | P6, P9 | Sacoglossa | 33 | no |
| *Hexabranchus sanguineus* | P1, P4 | Nudibranchia | 18 | no |
| *Melibe colemani* | P6, P9 | Nudibranchia | 38 | no |
| *Ardeadoris egretta* | P4 | Nudibranchia | 126 | yes |
| *Cyerce basi* | P6 | Sacoglossa | 11 | no |
| *Cyerce blackburnae* | P6 | Sacoglossa | 27 | no |
| *Cyerce katiae* | P6 | Sacoglossa | 25 | no |
| *Doto ussi* | P6 | Nudibranchia | 30 | no |
| *Goniobranchus geometricus* | P9 | Nudibranchia | 155 | yes |
| *Goniobranchus rubrocornutus* | P6 | Nudibranchia | 10 | no |
| *Halgerda batangas* | P1 | Nudibranchia | 163 | yes |
| *Hypselodoris violacea* | P9 | Nudibranchia | 15 | no |
| *Melibe engeli* | P9 | Nudibranchia | 15 | no |
| *Miamira alleni* | P8 | Nudibranchia | 46 | no |
| *Nembrotha kubaryana* | P4 | Nudibranchia | 251 | yes |
| *Nembrotha milleri* | P7 | Nudibranchia | 130 | yes |
| *Phestilla melanobrachia* | P9 | Nudibranchia | 39 | no |
| *Phyllodesmium briareum* | P9 | Nudibranchia | 154 | yes |
| *Sacoproteus nishae* | P6 | Sacoglossa | 1 | no |

*Sacoproteus nishae* has one Philippine observer, so it is not in the CSV. *Miamira alleni* is P8's "*Ceratosoma
alleni*" (WoRMS: original combination).

## Appendix C. The CSV's columns

[`2026-11-15-nudibranch-mode-candidates.csv`](2026-11-15-nudibranch-mode-candidates.csv): the 452 sea-slug species that
rule C8 confirms in the Philippines. Today that is the same set as the species with 3 or more distinct Research Grade
observers there (§2.1). Nudibranchs come first, each group in commonness order.

- **Taxonomy**:
  - `group`, `family`, `genus`, `species`: iNaturalist's taxonomy;
  - `worms_status`, and `worms_valid` when WoRMS accepts another name;
  - `inat_en`: iNaturalist's English name;
  - `worms_en`: WoRMS's English vernaculars.
- **Commonness**:
  - `rank_common_in_group`;
  - `ph_rg_obs`, `ph_observers`, `provinces`, `cells_half_degree`;
  - `main_provinces_of_6`: Batangas, Romblon, Oriental Mindoro, Negros Oriental, Cebu and Bohol;
  - `balanced_share` (§3.1);
  - `top_observer_share`.
- **Near Dauin and presence**:
  - `near_dauin_obs`, `near_dauin_observers`: within 40 km;
  - `c8_ph_3_observers`, `c8_near_2_observers`: rule C8's tests, 1 = passes.
- **Sought-after proxies**: `faved_obs`, `faves_per_obs`, `wiki_views_12m`, `web_mentions` (pages P1-P9 of §4.2).
- **Photos**:
  - `ph_obs_open_photo`, `ph_obs_nc_photo`: Philippine observations by their best photo licence;
  - `world_rg_obs`, `world_rg_obs_open_photo`, `world_rg_obs_nc_photo`: worldwide, Research Grade;
  - `egg_annot`, `juv_annot`: iNaturalist life-stage annotations.
