# Coral photo sources beyond iNaturalist: a study for the thin genera

IMR Reef ID, 2026-11-05. Read-only study: nothing in the repository was changed. Written for Pierre. It covers which sources could fill the thin genera (Astrea and Anacropora first), whether their licences fit, how far their identifications and locations can be trusted, and what the presence rule (AGENTS.md rule 6g) allows.

Labels used below: **[measured]** = I queried an API or a file today and give the number; **[read]** = taken from a terms page, a dataset record or a repo file; **[looked]** = I opened the image (rule 27d); **[guess]** = my judgement, not checked.

---

## 1. Summary

- **The gap for Astrea is on iNaturalist, not on the reef.** iNaturalist has **0** observations of the coral genus *Astrea* (taxon 503518) in the Philippines at any quality grade, and **0** identifications of it there, even as a minority opinion **[measured]**. The species is recorded in the Philippines elsewhere: Corals of the World lists *A. curta* and *A. annuligera* for the Philippine ecoregions **[read, `tools/presence_checklists.json`]**, and museum specimens identified by experts exist (USNM 90530 *A. annuligera*, Mariveles, Luzon, det. S. D. Cairns; QM *A. annuligera*, det. J. E. N. Veron; USNM 91344 *A. curta*, "Sea Horse Shoal, west of Palawan, Philippines", det. Cairns, whose record has no country code) **[measured, GBIF]**. Pierre's "we have it here" fits that evidence. My guess is that people at Dauin photograph it but label it Merulinidae, *Favites* or *Dipsastraea* (near Dauin there are 20 open family-level Merulinidae observations and 84 stony corals left at order level **[measured]**; whether any of them is *Astrea* is a **[guess]**).
- **No open-licence photo source holds a Philippine *Astrea* photo.** I checked GBIF (all datasets), Wikimedia Commons, EOL, ALA, SeaLifeBase, CoralNet, the Catlin Global Reef Record and Reef Life Survey. The only source that could give Dauin *Astrea* photos with a compatible licence is **people**: IMR staff, the RAs, Pierre, Apo Island and Dauin dive guides, Silliman University. The photos should go through iNaturalist, so the existing pipeline handles licence, coordinates and identification (Pierre now accepts `thamnasteroid` alone).
- **For Anacropora, iNaturalist plus that expert is nearly all there is.** In the Philippines there are 8 observations with photos (6 under an open licence, none Research Grade; the coordinator says most are already identified by `thamnasteroid`). SeaLifeBase has 2 Philippine *Anacropora* photos (Calumbuyan Island, Palawan, by N. Bailly; Cebu, by J. E. N. Veron), but no open licence is stated for them. They could be asked for.
- **The presence rule fails mainly because of iNaturalist, not because of the corals.** Of the 17 coral species it does not confirm, 14 are listed by Corals of the World for the Philippines and have **0** Research Grade observations there (`presence.json` **[read]**). Among them are *Anacropora puertogalerae*, described from Puerto Galera, Philippines, and *Cyphastrea serailia*, one of the most widespread Indo-Pacific corals. Section 5 proposes one addition, for Pierre to decide: a museum specimen from the Philippines, identified by an expert, could stand in for the "1 Research Grade observation" in clause (2). On today's data it would bring back **13 of the 31** flagged photos, or **20** if a specimen whose locality text says "Philippines" counts without a country code. It would leave *Alveopora catalai*/*gigas*, *Anacropora pillai*/*spinosa* and *Astreopora randalli* out of rule.
- **A licence inconsistency to settle.** `tools/fetch_local.py` and `tools/cand_gaps.py` accept `cc-by-sa` and `cc-by-nc-sa` for corals (`LIC`, line 37 of fetch_local.py). The fish pipeline excludes share-alike (`tools/fetch_fish.py` `OK = ("cc0", "cc-by", "cc-by-nc")`; ARCHITECTURE.md "Fish content": "never share-alike (it would block a later commercial reuse)"). The site has 5 `cc-by-sa` photos and 1 `cc-by-nc-sa` photo among its coral photos; the waiting candidates have 9 and 6 **[measured, data.json + cand.json]**.

---

## 2. Where the thin genera stand today

**Which genera are thin.** `python3 tools/cand_gaps.py` (run today) lists Anacropora and Astrea: "Short, but nothing more on iNaturalist near Dauin or in the Philippines". `presence.json` (2026-11-04) flags **31** site photos as "out of rule" **[measured]**:

| Genus | Out-of-rule photos | Species (site photos) | Field photos left in the Philippines (site + Pierre's added candidates) | IMR lecture photos |
|---|---|---|---|---|
| Anacropora | 8 | *puertogalerae* 2, *spinosa* 3, *forbesi* 1, *pillai* 1, *reticulata* 1 | 1 Dauin + 3 Philippines (Colony 3, Close-up 1); **no corallite photo** | 4 (2 Colony, 2 Close-up) |
| Astrea | 7 | *curta* 7 (New Caledonia 5 from 3 observations, Hong Kong 1, Terengganu, Malaysia 1) | **none** | 4 (3 corallites, 1 Close-up), **no Colony** |
| Cyphastrea | 7 | *microphthalma* 3, *serailia* 4 | about 25 Dauin/Philippines added + 10 waiting | 0 |
| Alveopora | 6 | *catalai* 5, *gigas* 1 | about 18 added + 8 waiting | 0 |
| Astreopora, Lithophyllon, Danafungia | 1 each | | not thin | |

How I counted: `data.json` views and `loc`, `curation.json` `add`, `cand.json`, `presence.json`. Places of the abroad observations come from the iNaturalist observations API. Coral Finder crops in `add` are excluded, since they never go in games (rule 10). Cyphastrea, Alveopora, Duncanopsammia, Halomitra and Leptoria have enough photos from the Philippines (`cand_gaps.py` does not list them). **The real problem is Astrea, then Anacropora.** If Pierre removes the out-of-rule photos, Astrea's game pool falls to its 4 IMR lecture photos with no Colony view, and Anacropora loses every corallite photo. (That is a consequence, not a recommendation: the choice is his, rule 27c.)

**iNaturalist, measured** (paced at 1.1 s per request, User-Agent `coral-id-imr/1.0 (...)`, `captive=false`; numbers in `coralsources/inat_counts.json`):

| | Astrea 503518 | Anacropora 86434 |
|---|---|---|
| World, all / Research Grade / open photo licence | 479 / 310 / 408 | 91 / 7 / 64 |
| Philippines, all (open licence) | **0** (0) | 8 (6), 0 Research Grade |
| Within 250 km of Dauin / 40 km | 0 / 0 | 3 / 1 |
| Any identification of the genus in the Philippines (`ident_taxon_id`) | **0** | 12 |
| Southeast Asia box (−11° to 26° N, 95° to 135° E), open licence / with a `thamnasteroid` identification | 25 / 19 (24 *A. curta*) | 54 / 28 |
| Research Grade species, world | *A. curta* 281, *A. rotulosa* 29 | 5 species, 1 or 2 each |

The 7 Astrea photos on the site come from Hong Kong, Terengganu (Malaysia) and New Caledonia. Seven of the 8 Anacropora photos are by T. Cedhagen (the observations I looked up are in Sabah and Maluku; 3 of his 6 observations were not looked up), and one is from North Sulawesi. All of them are Research Grade abroad, and some carry a `thamnasteroid` identification **[measured]**.

**Possible hidden pool near Dauin** **[measured counts; contents a guess]**: 20 observations left at the family Merulinidae within 40 km of Dauin (16 under an open licence, 2 of them Pierre's), 193 in the Philippines (155 open), and 84 stony corals left at the order Scleractinia within 40 km. *Astrea* is a small merulinid with plocoid corallites that people often take for *Favites* or *Dipsastraea*. If it lives at Dauin, this is where it would hide **[guess]**.

---

## 3. Sources, ranked

Ranked by what they can bring to the thin genera with a compatible licence and an honest location. "PH" = the Philippines.

| # | Source | Astrea / Anacropora in PH | Licence | Location | ID trust | Access | Effort | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **People at Dauin, posting to iNaturalist** (IMR staff and trainers, RAs, Pierre, Apo Island and Dauin dive guides, Silliman University) | Unknown; Pierre says Astrea is there | Chosen by the uploader: ask for CC BY or CC BY-NC (never SA) | Exact GPS, Dauin | `thamnasteroid` (accepted alone since today) and/or an IMR trainer | Existing pipeline (`fetch_local.py`, Dauin tier) | **No code**; human time: one targeted dive, uploads | **Best, and the only route to Dauin Astrea** |
| 2 | **iNaturalist hidden pool** (family- or order-level observations near Dauin) | 20 Merulinidae + 84 Scleractinia near Dauin **[measured]**; Astrea among them **[guess]** | As observed (mostly CC BY-NC) | Exact | Becomes genus-level only if an expert identifies them | Existing pipeline, once identified | No code; someone (Pierre, an IMR trainer) asks for expert identifications on iNaturalist | Worth a try, uncertain yield |
| 3 | **GBIF preserved specimens** (USNM, QM, UF, Naturalis) | Astrea: 2 PH records with country code + 1 without (Palawan); Anacropora: 26 PH records (*forbesi* 6, *puertogalerae* 4, *reticulata* 3...) | CC0 / CC BY / CC BY-NC (dataset licences) | Country, often locality | **Expert** (Veron, Hoeksema, Cairns, Nemenzo) | GBIF API, about 1 request per genus | Small (presence.py) | **No photos** (PH specimen records have no images); **strong presence evidence** (section 5) |
| 4 | **SeaLifeBase** (FishBase's sister database: same consortium, same data snapshot the fish tool reads) | Astrea 0; Anacropora 2 PH (Bailly, Palawan; Veron, Cebu) + 6 abroad (Veron, COTW photos) | **Not open as stated**: `Copyright` field empty for 524 of 535 coral photos (the fish tool's check, 2026-11-05: empty = page shows "ALL RIGHTS RESERVED"); 10 "permission required", 1 "non-commercial use" | Country code, often locality, some dates | Expert (Veron's are COTW photos; PH set "identified by Jeniffer Espedido") | rfishbase parquet snapshot on Hugging Face (`data/slb/v25.04/parquet/picturesmain.parquet`) | Low-medium: `tools/fetch_fishbase.py` already does this for fish | **Only with written permission.** 148 PH underwater photos of slate genera (Veron 66, Palomares 50, Bailly 17, Poppe 12), mostly *Acropora*, *Montipora*, mushroom corals |
| 5 | Wikimedia Commons | Astrea curta: 4 files, none PH (Moorea CC BY 2.0; American Samoa, public domain, 2 files; 1 CC BY-SA 4.0, incompatible); Anacropora: 1 file (Challenger report plate) | Per file | Per file; Moorea has GPS | Uploader's; not checked | MediaWiki API (it rate-limited us, HTTP 429, after a few calls) | Low | Nothing usable for the Philippines |
| 6 | GBIF occurrence media other than iNaturalist | 0 PH images for either genus. Astrea world images: iNat RG 267, Naturalis 92, NHM London 52, MNHN 33+5; Anacropora: Naturalis 25, NHM 9 | CC0 / CC BY / CC BY-NC | Country | Expert | API | — | **Not photos of corals**: the samples I opened are specimen labels and register pages **[looked]** |
| 7 | Encyclopedia of Life | Astrea curta: 29 media = 21 iNaturalist duplicates + 8 Smithsonian NMNH CC0 skeleton views (from the file names "wholecolony", "closeup"; not opened); Anacropora: 0 | Per item | From the source | From the source | API | — | Adds nothing beyond iNaturalist |
| 8 | Atlas of Living Australia | Out of region: 81 Astrea image records, 79 of them iNaturalist Australia; 1 non-iNat Anacropora (PNG, Queensland Museum) | Per item (includes CC BY-NC-SA) | Australia | iNat / museum | API | — | Reference only; duplicates iNaturalist |
| 9 | CoralNet public sources | Nearest public source 369 km away (Tubbataha, UQ Catlin, 990 images); PH public sources: Tubbataha ×3, Pangatalan (Palawan), Puerto Galera bleaching monitoring (labelset includes Anacropora, but only 14 confirmed images), UPMSI (functional groups only), Caramoan; all 6 sources within 205 km of Dauin are **private** **[measured, CoralNet map]** | **None stated**; public = viewable, not licensed **[read: no licence on the about page]** | Source coordinates | Point labels by survey teams, coarse labelsets | Web pages; no open bulk licence | High; top-down quadrats; permission per source | No help for Astrea or Anacropora |
| 10 | Catlin Seaview / Global Reef Record (UQ) | Philippines: Tubbataha (Guardian wreck source on CoralNet); labels coarse (no Astrea or Anacropora label) | Archive CC BY-NC 3.0 **[read, UQ record]** | Site level | Machine and point labels, not genus photos | UQ eSpace (DOI 10.48610/D7D5836) | High | Compatible licence, useless for these genera; maybe one day for the parked "ReefCloud view" idea |
| 11 | ReefCloud | Public: dashboards with aggregated cover; no public images found **[read]**; data.gov.au lists "licence not specified" | — | — | — | — | — | Nothing public to use (Pierre declined to share IMR's images for now) |
| 12 | Reef Life Survey | "Reef Life Survey Images" on GBIF: CC BY-NC, 0 occurrences indexed; corals scored in broad categories **[measured / read]** | CC BY-NC | Site | Coarse | — | — | No coral genus photos found |
| 13 | Corals of the World / Coral Geographic / CoralID (Veron et al.) | Probably photos of both genera **[guess]** | **Copyright**: "unaltered form for personal, non-commercial use only"; academic use with citation; other uses need written approval; "all other intellectual property rights are reserved" **[read, terms of use]** | — | Expert | — | — | **Excluded** (a "usage conditions" licence); permission possible but not CC |
| 14 | Flickr (CC search) | Not measured (the API needs a key); a web search found no *Astrea curta* or *Anacropora* Flickr pages | Per photo | EXIF GPS sometimes | Low (aquarium trade names, guesses) | API with a key | Medium | Low priority |
| 15 | Biodiversity Heritage Library | Old plates (e.g. Challenger report, Quelch 1886), skeletons and drawings | Mostly public domain | Type localities | Historic | API | — | Not field photos; no |
| 16 | Smithsonian Open Access, Bishop Museum | NMNH skeleton photos CC0 (via EOL); Bishop: not checked in depth | CC0 / ? | | Expert | | | Skeletons, not field photos |
| 17 | Philippine institutions (UPMSI, NFRDI/BFAR, Silliman IEMS/SUAKCREM, CRMP/CTI reports) | No open image repository found | Not open as far as found. Philippine IP Code s.176: no copyright in works of the Government, but approval needed to exploit them for profit (**[guess]** on whether a state university's survey photos count) | | Expert | — | Human | **Ask** (Silliman is next door in Dumaguete); route contributions through iNaturalist |

Notes on the table:
- **Museum images [looked]**: Naturalis RMNH.COEL.20237 (*A. puertogalerae*, Sumba) and RMNH.COEL.33434 (*Montastrea curta*, Ambon, det. B. W. Hoeksema) are scans of specimen labels with a ruler. NHM London media for *Anacropora spinosa* and *Astrea curta* (Rotuma) are pages of the accession register. None shows the coral. Files are in `coralsources/samples/`.
- **Commons [looked]**: `File:Astrea curta, Moorea.jpg` (CC BY 2.0) is an in-situ macro of a small pale colony beside a ruler, French Polynesia. The two public-domain American Samoa files did not download (an HTML error page came back), so I have **not** seen them.
- **SeaLifeBase**: its web pages sit behind a browser challenge (HTTP 403), so I read the data snapshot instead (`picturesmain`, `species`, v25.04). I could not open a photo page to confirm the licence shown there. The "empty = all rights reserved" reading comes from `tools/fetch_fishbase.py` (checked on FishBase photo pages, 2026-11-05).

---

## 4. What counts can be measured for Astrea and Anacropora (all sources)

| Source | Astrea, PH photos usable today | Anacropora, PH photos usable today |
|---|---|---|
| iNaturalist | 0 | 6 open-licence observations (8 with photos), several already candidates or added |
| GBIF other media | 0 | 0 |
| Wikimedia Commons | 0 | 0 |
| EOL / ALA | 0 | 0 |
| SeaLifeBase | 0 | 2 (permission needed) |
| CoralNet / Catlin / RLS / ReefCloud | 0 (no label) | 0 usable (1 Luzon source has an Anacropora label, 14 confirmed images, no licence) |
| **Total, compatible licence, in PH** | **0** | **≈6 observations** (iNaturalist only) |

Abroad, iNaturalist still has 25 open Astrea observations in Southeast Asia (19 with a `thamnasteroid` identification) and 54 Anacropora (28). Rule 6g blocks those of species not confirmed in the Philippines.

---

## 5. The presence rule and genus-level photos

### What the rule is for
Rule 6g (Pierre, 2026-11-04): "the same scientific rigour for everyone"; a photo from abroad is allowed only for a species confirmed in the Philippines; "a checklist alone never brings in a species nobody observed". The aim, as I read it: the app must never teach the look of something a Research Assistant cannot meet here.

### Where it bites today
- 14 of the 17 unconfirmed coral species are on Corals of the World's Philippine lists, with 0 Research Grade observations in the country. Coral species-level IDs rarely reach Research Grade, so the rule measures iNaturalist's coverage more than the reef.
- Two examples: *Anacropora puertogalerae* (type locality Puerto Galera, Philippines; 4 PH specimens identified by Hoeksema and Veron) and *Cyphastrea serailia* (22 PH records, 10 at USNM identified by Hoeksema). Both are "not confirmed" today.

### Option A: keep the rule as it is
- *For*: one simple, uniform rule; already coded and tested; no new data source; it is exactly what Pierre decided yesterday.
- *Against*: Astrea keeps no field photo until someone posts one from the Philippines; Anacropora loses its corallite view. The rule rejects species that the literature, museum specimens and COTW all place in the Philippines.

### Option B: accept an expert-identified museum specimen in place of the Research Grade observation in clause (2) (my recommendation)
New clause (2): at least 1 Research Grade observation in the Philippines **or at least 1 preserved specimen collected in the Philippines and identified by a named person** (GBIF `basisOfRecord=PRESERVED_SPECIMEN`, `country=PH`, `identifiedBy` present), **and** a Philippine checklist.
- *For*: a specimen is an observation, made by an expert, with the coral in hand, so "a checklist alone never brings in a species nobody observed" still holds. Expert-identified specimens are stronger evidence than a crowd-sourced Research Grade. One GBIF facet query per genus (`taxonKey=<genus>&country=PH&basisOfRecord=PRESERVED_SPECIMEN&facet=speciesKey`) gives every species at once, which is easy to cache like `tools/.cache/presence.json`.
- *Against*: specimens can be old (1899 to 1990s) and a few are misplaced; names need the same COTW/WoRMS mapping as the checklist. QM specimens identified by Veron are not fully independent of COTW, which is Veron's work too; USNM, UF and Naturalis specimens (Hoeksema, Cairns) are. Records without a country code (USNM 91344, *A. curta*, Palawan) would need a locality-text check or a manual entry.
- *Effect today* **[measured]**: brings back Anacropora *forbesi*, *puertogalerae*, *reticulata* (4 photos), Cyphastrea *microphthalma*, *serailia* (7), *Danafungia horrida* (1), *Lithophyllon repanda* (1) = **13 of 31**; **+7 Astrea curta** if the Palawan record is accepted = **20 of 31**. Still out: *Anacropora pillai* and *spinosa* (4), *Alveopora catalai* and *gigas* (6), *Astreopora randalli* (1).

### Option C: a genus-level rule for photos from abroad
"A photo from abroad is allowed when its genus is confirmed near Dauin and its species is on a Philippine checklist", or "when it is identified only to genus".
- *For*: the game teaches genera, and players never answer a species. For a genus whose regional species look alike, the risk of teaching a foreign look is small.
- *Against*: it brings back exactly the "checklist alone" that Pierre ruled out on 2026-11-04. The look of a genus varies by species (*Alveopora* polyps, *Anacropora* branch form), and the species shows in the photo's source link and on the genus sheet. A genus-level photo from abroad cannot even be checked against a checklist, so the rule gets weaker, not just different. For the Philippines tiers the question is already settled: genus-level IDs are accepted there (`fetch_local.py` `genus_ok`, coordinator's correction).
- *My view*: not recommended. Option B gets most of the scientific benefit while keeping Pierre's principle.

### What fits the rule's spirit best
Photos taken at Dauin by people who dive there (source 1). Two Research Grade observers within 40 km would also confirm the species near Dauin under clause (3). That makes the photos and the presence evidence one and the same.

---

## 6. Questions for Pierre (each with a recommendation)

1. **Organise a targeted "Astrea and Anacropora hunt" at Dauin and Apo Island**, with IMR staff, the RAs and willing dive guides photographing colony, close-up and macro, then posting to iNaturalist under CC BY or CC BY-NC? *Recommendation: yes, first.* It is the only source that can give Dauin *Astrea*, and it needs no code. Ask an IMR trainer where *Astrea* is seen (reef flat, shallow slope?) so the dives go to the right place.
2. **Ask for expert identifications of the near-Dauin family- and order-level observations** (20 Merulinidae, 84 Scleractinia)? It is a request on iNaturalist that only you can make (it is public and in your name), for example to `thamnasteroid` or an IMR trainer. *Recommendation: yes, after question 1*; the yield is uncertain.
3. **Add expert-identified Philippine museum specimens to clause (2) of the presence rule (option B)?** *Recommendation: yes.* One small change in `tools/presence.py`, with tests. Also decide whether a record without a country code but with "Philippines" in its locality counts (that decides the 7 *Astrea curta* photos).
4. **Keep "a checklist alone never confirms" for photos from abroad (reject option C)?** *Recommendation: yes, keep it.*
5. **Align coral licences with fish: drop `cc-by-sa` and `cc-by-nc-sa` from new coral candidates** (`LIC` in `tools/fetch_local.py` and `tools/cand_gaps.py`)? *Recommendation: yes*, for the reason already written for fish (share-alike blocks a later commercial reuse, and the brief excludes SA). What to do with the 6 share-alike photos already on the site and the 15 waiting is your curation call.
6. **Write to SeaLifeBase (M. L. D. Palomares, N. Bailly) asking whether their own Philippine coral photos may be used under CC BY-NC**, as FishBase states for fish photos? *Recommendation: yes, low effort.* 67 Philippine photos are theirs; the tool already exists for fish. This does not help *Astrea*. Veron's COTW photos in SeaLifeBase stay excluded unless Veron grants an open licence.
7. **Ask Silliman University (IEMS / SUAKCREM, Dumaguete) for coral photos or an identification contact?** *Recommendation: yes*, with photos going through iNaturalist under an open licence, so the location and identification stay checkable.
8. **Ask Corals of the World for permission?** *Recommendation: no*, unless you want an exception to the licence rule: their terms allow only personal, unaltered, non-commercial use.

---

## 7. Proposed plan

1. **Now, no code (Pierre and IMR):** questions 1, 2 and 7. Photos land on iNaturalist; `fetch_local.py` picks them up in the Dauin tier on the next run. With `thamnasteroid` accepted alone, one identification is enough.
2. **Small PR, if Pierre agrees to question 3:** add specimen evidence to `tools/presence.py`: one GBIF facet request per genus, cached, `basisOfRecord=PRESERVED_SPECIMEN`, `country=PH`, `identifiedBy` present, names mapped like the COTW list. Then re-run `tools/coral_presence.py`, and add a test with a fixture. Document it in AGENTS.md rule 6g and in ARCHITECTURE.md "Presence of coral species". The admin's "out of rule" tag updates by itself.
3. **Small PR, if Pierre agrees to question 5:** `LIC = 'cc-by,cc-by-nc,cc0'` in `tools/fetch_local.py` and `tools/cand_gaps.py` (keep them in step, as their comments say), with a sentence in ARCHITECTURE.md "Photos".
4. **If SeaLifeBase answers yes (question 6):** reuse `tools/fetch_fishbase.py`'s approach for corals (same snapshot, table `data/slb/.../picturesmain.parquet`): underwater photos only, the photographer's own photos only, the Philippines first, as candidates in `cand.json` and never in games without Pierre's curation.
5. **Not worth doing:** Commons, EOL, ALA, GBIF museum media, BHL, Smithsonian skeleton photos, CoralNet, Catlin, Reef Life Survey, Flickr, for these genera.

---

## 8. What I checked and how

- **Repo (read only):** AGENTS.md (rules 0, 6e to 6g, 7, 10, 11, 27c, 27d), ARCHITECTURE.md "Presence of coral species", "Photos", "Photos per context"; `tools/cand_gaps.py` (run), `tools/fetch_local.py`, `tools/presence.py`, `tools/presence_checklists.json`, `presence.json`, `data.json` + `cand.json` (via `tools/datajson.load_all`), `curation.json`, `tools/fetch_fish.py`, `tools/fetch_fishbase.py`.
- **iNaturalist API:** about 40 requests, 1.1 s apart, never parallel, User-Agent naming the app. Taxa 503518 (*Astrea*, under Scleractinia; *Astraea* the plant was excluded) and 86434; counts by place, quality, licence, `ident_taxon_id`, `ident_user_id=thamnasteroid`; species counts; the 9 source observations of the site's abroad photos.
- **GBIF API:** backbone keys 3245158 (*Astrea*, Merulinidae) and 2259993; facets by country, dataset, licence and basis of record; dataset titles and licences; specimen records for the 17 unconfirmed species (`coralsources/gbif_ph_specimens.txt`). GBIF's licence facet gives the record licence; I did not check each image's licence.
- **Wikimedia Commons API:** categories *Astrea curta*, *Montastraea curta*, *Astrea annuligera*, *Anacropora* (`coralsources/commons*.txt`). Full-text searches failed with HTTP 429.
- **EOL API, ALA biocache API, CoralNet** (source list, map coordinates, the nearest public source pages and labelsets; HTML in `coralsources/`), **SeaLifeBase** data snapshot (Hugging Face `cboettig/fishbase`, `data/slb/v25.04`, read with pyarrow installed in the scratchpad).
- **Web:** Corals of the World terms of use (fetched); UQ Global Reef Record record (fetched); searches on Reef Life Survey, ReefCloud, Catlin, Flickr and the literature. Openverse returned HTTP 500; Flickr was not queried through its API (it needs a key).
- **Images opened (rule 27d):** 4 museum media and 1 Commons photo, in `coralsources/samples/`. I did not open any iNaturalist photo or any SeaLifeBase photo, and I describe none of them.
- **Not checked:** Bishop Museum collections in depth; whether Nemenzo's Philippine monographs or CRMP reports carry an open licence; what the 20 + 84 hidden-pool observations show.

Paths: study `/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/coral-photo-sources-study.md`; working files `/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/coralsources/`; scripts `/tmp/claude-0/-home-user-coral-id-imr/fbf94b29-50f3-5d97-a1d3-07ea7e20888a/scratchpad/scripts/`.
