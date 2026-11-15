# Sea slugs: the "juvenile" annotations, egg ribbons, and the reference sources (2026-11-15)

A follow-up to the [species list](2026-11-15-seaslug-list.md) (#950, Q377), after two remarks from Pierre on 2026-11-15
(16:49 Manila, translated):
1. On "*H. lacer* has the most 'juvenile' annotations (43), so the Spanish dancer probably has a different juvenile
   form": "No, those are the egg ribbons. Search online."
2. "Can you also look for reference sources for nudibranchs online? For factual information, and for photos?"

**It changes no app code.** It adds the egg rule to the photo target in `tools/seaslug_source.json` (copied into
`tools/seaslugs.json` `photoTarget`), corrects the list note where it rested on the annotations, and lists the sources.

Labels (rule W11): **[measured]** = counted from iNaturalist's public data or looked at on its photos; **[read]** = taken
from a page; **[search]** = only a search result's excerpt, the page not read; **[guess]** = my judgement.

## 1. The "Juvenile" annotations and the egg ribbons

### 1.1 Method

- **What the list counted.** iNaturalist's controlled annotation "Life Stage" (term 1) with the value "Juvenile"
  (value 8), on Research Grade observations, worldwide and in the Philippines (`tools/build_seaslugs.py`). The labels
  were checked against iNaturalist's `controlled_terms`: Life Stage values 2 Adult, 7 Egg, 8 Juvenile; the separate term
  22 "Evidence of Presence" has a value 30 "Egg" too.
- **Every observation, not a sample.** All 97 Research Grade observations of circle 1 annotated Life Stage: Juvenile
  (one request, the 45 taxa together; rule C7), the same 97 as the list's per-species sums. All their 144 photos were
  downloaded at medium size (about one a second, a generic User-Agent) and looked at on contact sheets of 12, each
  doubtful one again alone at medium size.
  Each observation was classed: animal only, egg mass only, animal with eggs, or cannot tell.
- **The egg annotations too.** The 181 circle-1 observations annotated Life Stage: Egg were counted, and the first photo
  of 32 of them looked at (all 20 that are not *H. sanguineus*, and 12 *H. sanguineus* drawn at random).
- **Both Spanish dancers in full.** Every Research Grade *Hexabranchus sanguineus* observation in the Philippines (25
  observations, 34 photos) was looked at, and the counts of both species were asked with and without the egg
  annotations.
- Pulled 2026-11-15, 16:55-17:10 Manila. Nothing was uploaded and no photo is committed.

### 1.2 What the "Juvenile" annotations show [measured]

**All 97 show the animal itself; none shows an egg ribbon or an egg mass, alone or beside the animal.**

| Species (circle 1) | Juvenile-annotated, world (Philippines) | Egg mass in the photos |
|---|---|---|
| *Hexabranchus lacer* | 43 (6) | 0 |
| *Pleurobranchus forskalii* | 15 (5) | 0 |
| *Jorunna funebris* | 10 (1) | 0 |
| *Pteraeolidia semperi* | 10 (0) | 0 |
| *Costasiella kuroshimae*, *Goniobranchus fidelis*, *Nembrotha kubaryana*, *N. milleri* | 2 each (1, 0, 0, 1) | 0 |
| 11 more species | 1 each (*Halgerda batangas*, *Hypselodoris tryoni* in the Philippines) | 0 |
| **Circle 1** | **97 (15)** | **0** |

- ***Hexabranchus lacer*: the 43 are small Spanish dancers in their juvenile colours.** A translucent white to pale
  pink body with a violet-blue edge and magenta or purple spots, orange rhinophores and gills: nothing like the large red
  or mottled adult **[measured: the photos]**. The observers' descriptions say so too: one gives "6mm", others "Still
  from video, juvenile ?" or "Juvenile. Probably." (the last one from Zamboanguita, next to Dauin). Two photos are poor (179191175: a small pale
  animal far off; 395170217: the first photo hard to read, the next two show the animal), neither is an egg mass.
- **The other 54** are small animals of their species (*P. forskalii* whitish or brown with the adult's raised polygonal
  pattern, *J. funebris* white with black rings, *P. semperi* small blue-purple aeolids).
- **So the list's juvenile counts stand**, and so do the counts in `tools/seaslugs.json` (`juv`): no correction is
  needed. What the list got wrong is elsewhere: the egg ribbons sit in the **photo supply** (§1.3), and the juvenile
  form of *Hexabranchus* now has a readable source (§1.5).
- Observation ids, for Pierre to check on iNaturalist (a few to start: 258228864 Zamboanguita, 70011835 Mabini,
  102564041, 154715215, 298921895): Appendix A.

### 1.3 Where the egg ribbons are: the "Egg" annotations and the photo supply [measured]

- **181 circle-1 observations are annotated Life Stage: Egg**, worldwide: *Hexabranchus sanguineus* 161, *H. lacer* 7,
  *Jorunna funebris* 3, *Nembrotha chamberlaini*, *Coryphellina exoptata*, *Pteraeolidia semperi* and *Costasiella
  kuroshimae* 2 each, *Hypselodoris bullockii* and *Tambja morosa* 1 each.
- **The annotation is used as meant.** Of the 32 first photos looked at, 31 show an egg mass and 1 cannot be told. In 4
  of the 31 the animal is in the frame too (*H. lacer* beside its red rosette, *Hypselodoris bullockii* beside its yellow
  coil, *Costasiella* twice).
- **For both Spanish dancers, "Evidence of Presence: Egg"** is on 43 observations, 39 of them also Life Stage: Egg: 172
  observations carry one egg annotation or the other.
- ***H. sanguineus* is where the eggs weigh.** About 30% of its Research Grade observations are its egg rosettes:

  | *H. sanguineus*, Research Grade | All | Life Stage: Egg | Without them |
  |---|---|---|---|
  | World, any photo | 544 | 161 | 383 |
  | World, a CC0 / CC BY photo | 36 | 12 | 24 |
  | World, a CC BY-NC photo | 360 | 109 | 251 |
  | Philippines, any photo | 25 | 6 | 19 |
  | Philippines, a CC0 / CC BY photo | 2 | 2 | **0** |
  | Philippines, a CC BY-NC photo | 11 | 3 | **8** |

  - In the Philippines exactly the 6 annotated observations show only an egg ribbon; the other 19 show the animal: no
    unannotated egg ribbon there.
  - So *H. sanguineus* has **8 usable observations from the Philippines, not 13** (all CC BY-NC), still above the start
    of 6 (§5.3 of the list) but below the 20 candidates: it will take photos from abroad, where 24 open and 251 NC
    remain.
  - *H. lacer* barely changes: 7 Egg of 1,269 worldwide, 0 of 129 in the Philippines.
  - The other circle-1 species lose at most 3 observations worldwide.
- Pierre's remark fits this side: the Spanish dancer's egg ribbons are many on iNaturalist (161 for *H. sanguineus*), but
  they are annotated "Egg", not "Juvenile".

### 1.4 The exclusion, as the candidate search will apply it

Pierre (2026-11-15): egg ribbons and egg masses are never candidate photos. Recorded in `tools/seaslug_source.json`
`photos.exclude` (and so in `tools/seaslugs.json` `photoTarget`), for the subject's candidate search:
- **Filter 1, the annotations.** An observation annotated Life Stage: Egg (term 1, value 7) or Evidence of Presence: Egg
  (term 22, value 30) is not a candidate.
  - **Read from each observation's own annotations, not with a request parameter.** No parameter removes them exactly
    **[measured on *H. sanguineus*, 544 observations, 161 Egg]**: `term_id=1&without_term_value_id=7` returns only
    observations that have another Life Stage (23); `without_term_value_id=7` alone is ignored (544);
    `without_term_id=1` also drops the observations annotated Adult or Juvenile (360).
  - The whole observation goes, even when the animal is in the frame too (4 of the 32 looked at): simple, and few
    photos lost **[guess]**.
- **Filter 2, the judging** (for egg masses nobody annotated). The judging rule:
  - **Excluded**: a photo whose subject is an egg mass (a ribbon, a coil, a rosette, a cluster of capsules) and where
    no whole animal can be recognised.
  - **Kept and judged as an animal photo**: the recognisable animal with its eggs beside it.
  - A photo that cannot be told apart (an egg mass or a small animal) is excluded.
  - Rule P4 holds: the egg-only photo is dropped, the observation's other photos stay.
- **Juveniles stay in.** They are the animal; the list's "+5 per documented juvenile form" is about them.

### 1.5 The juvenile form of *Hexabranchus*: a source

- **Sea Slug Forum, message "Juvenile Hexabranchus from Philippines"** (6 July 1999, <http://www.seaslugforum.net/find/1013>)
  **[read]**: a diver sent a photo of "a juvenile specimen of *Hexabranchus sanguineus* taken at Dauin, Negros Oriental";
  Bill Rudman answered: "Yes its a juvenile *Hexabranchus sanguineus* ... It has a remarkable resemblance to some purple
  spotted chromodorids such as *Hypselodoris maculosa*, *Thorunna australis* and *Chromodoris decora*." In 1999 every
  Spanish dancer was called *H. sanguineus*; WoRMS now accepts *H. lacer* beside it (Tibiriçá et al. 2023), and the
  juveniles of §1.2 are identified *H. lacer*. Which name the Dauin animal takes today is a point for `points.json`
  once the subject exists (rule C5), not settled here.
- **Tibiriçá et al. 2023** (the *Hexabranchus* revision): its full text is behind a login on the publisher's site and
  was not read. Its Plazi treatments are public (CC0) and hold the synonymy and the figure captions **[read]**:
  - "Fig. 3 Ontogeny, color, and variation in *Hexabranchus lacer* (morphotype 1: Pacific) ... A early juvenile, B
    juvenile, C early transitional, D mild-transitional, E late transitional, F mature"; Fig. 4 the same for its
    morphotype 2 ("Eastern and Western Pacific");
  - under *H. marginatus* var. *moebii*: "they are all variations of *H. lacer*: a typical light morphotype with a
    mottled notum, a darker morphotype ... and a juvenile".
  - The description of the juvenile colours themselves is in the paper's text, not in the treatments read.
- **So *Hexabranchus* has a documented juvenile that looks different from the adult**: Rudman's answer on a Dauin
  animal (named *H. sanguineus* in 1999) and the revision's ontogeny figures for *H. lacer*. The 43 juveniles of §1.2
  are *H. lacer* by their iNaturalist identifications. Under the decided rule ("+5 only where a source documents a
  different-looking juvenile", Q377), *H. lacer* would get 5 more candidates: proposed, not applied
  (`tools/seaslug_source.json` holds the rule, no per-species list yet).

## 2. Reference sources for sea slugs

Each source was opened on 2026-11-15, one page every 2 s or more with a generic User-Agent, read only; a page that
refused is listed as not readable and was not fetched another way. **Reuse** follows rule P1 for photos (candidates:
CC0, CC BY or CC BY-NC only, never share-alike or no-derivatives) and rule C2 for facts (every cue carries its source;
citing a fact is not copying a text).

### 2.1 The sources

| Source | What it is | Philippines / Indo-Pacific | Facts | Photos and their terms | Reuse | API or bulk |
|---|---|---|---|---|---|---|
| **Gosliner, Valdés & Behrens 2018**, *Nudibranch & Sea Slug Identification: Indo-Pacific*, 2nd ed., New World Publications | The regional field guide **[read: the REEF shop page, Scuba Diving's announcement]**: "illustrates 2,138 Indo-Pacific nudibranchs and sea slugs, including many undescribed species"; "185 new species, additional photos and an up-to-date classification"; an identification key **[search]** | The whole Indo-Pacific, "from the Indian Ocean coast of southern Africa and the Red Sea to ... Hawaii, Easter Island and the Marquesas"; its Philippine coverage was not checked (the book was not read) | ID features per species, as a field guide gives them; what else each entry holds (size, depth, food) was not checked | The authors' and contributors' photos, in a copyrighted book | **Cite only** (a page or species number per cue) | None; also sold as an e-book |
| **Sea Slug Forum** (Bill Rudman, Australian Museum) | Species fact sheets and dated questions answered by Rudman and other specialists, footer "1998-2010" **[read]** | Indo-West Pacific; messages from the Philippines, one from Dauin (§1.5) | ID remarks, look-alikes, juveniles and egg masses in the answers (the Spanish dancer's: "a large frilly pink egg mass"); distribution in broad terms ("Tropical Indo-West Pacific") and sizes ("recorded at over 40cm") on the fact sheets | By the named contributors; footer "Copyright © Australian Museum, 1998-2010"; no open licence | **Cite only** (author, date, message URL, as the site asks) | None. Its names predate the revisions (§1.5). The home page now carries an unrelated word ("strattera"), a sign the domain may no longer be the Museum's: no link followed, read only |
| **SeaLifeBase** | A species database built like FishBase, for life other than fish **[read: the *H. sanguineus* page]** | Indo-Pacific; its *H. sanguineus* is the broad, pre-2023 species ("from East Africa to Red Sea, east to French Polynesia") | Depth ("1 - 50 m ..., usually 10 - 20 m"), maximum length ("25.0 cm TL", Marshall Islands), food ("a sponge that it eats", *Halichondria*), eggs ("coiled rosettes on rocks and coral rubble"), each with its reference number | "The copyright remains with the photographers/institutes. Click on the image to see individual license"; for *H. sanguineus* all 20 picture pages of its own pictures (15 of the animal, 5 of early life, Philippine ones among them) say "© ALL RIGHTS RESERVED"; the 3 photos uploaded by users were not opened | **Cite the facts with their reference**; a photo only if its own page gives an open licence (none for this species; other species not checked) | No API checked; its citation page answered 404 on the mirror read |
| **WoRMS** | The world register of marine species names **[read: Terms of use]** | Global | Accepted names, synonyms, status and the source of each; distribution records sparse (*H. lacer*: two, Hawaii and South Africa) | "Images are by default open-access under the terms of the CC BY-NC-SA license": share-alike, out of rule P1 | **Reuse the names** (text CC BY: "The text on the WoRMS pages is open-access under ... (CC-BY)"); no photos | REST API, already used by `tools/build_seaslugs.py` |
| **iNaturalist** | Observations with photos, identified by the community | 28,045 species-level Research Grade sea-slug observations in the Philippines (list §2) | Presence, place, date, life stage (§1); no ID text | Each observation and photo carries its own licence; "By default ... CC BY-NC"; or "all rights reserved" **[read: iNaturalist Help, "What are licenses?"]**. The terms page answered 403 | **Photos: CC0, CC BY, CC BY-NC** (rule P1), as for the fish; presence by rule C8 | API v1/v2 through `tools/inat.py` (rule C7); also on GBIF as the dataset "iNaturalist Research-grade Observations" (CC BY-NC) |
| **Wikimedia Commons** and **Wikipedia** | Free media and the encyclopedia | Mixed; the category *Hexabranchus sanguineus* likely holds both dancers, as it predates the split **[guess]** | Wikipedia: summaries with references, e.g. the egg ribbons "range in color from bright red to pink" | Commons, category *Hexabranchus sanguineus*, 95 files **[measured]**: 53 share-alike (out), 32 CC0 or CC BY (22 CC BY 4.0, 4 CC BY 3.0, 3 CC BY 2.0, 3 CC0), 10 "Public domain" | **Commons: CC0 / CC BY files only**, each file's licence and author checked; **Wikipedia text: cite only** (CC BY-SA 4.0, share-alike) | MediaWiki API (it answered 429 to a second request here; pace it like the list's Wikipedia client) |
| **seaslug.world** (世界のウミウシ) | A Japanese contributed atlas: 648 contributors, 2,224 species and 60,061 photos on its home page; search by colour, place, contributor or paper **[read; translated from Japanese]** | Mostly Japan; its GBIF dataset holds 43,770 records, 1,467 in the Philippines **[measured]** | Presence records with a photo voucher | Footer: "All Rights Reserved" (in English), and in Japanese that reproducing its images or other content without permission is strictly prohibited **[translated]** | **Cite only**; its records are on GBIF under CC BY 4.0 (records, not photos) | GBIF dataset "A photographically-vouchered global citizen science dataset of sea slugs ... from the SEASLUG.WORLD platform since 2015" (CC BY 4.0) |
| **Sea Slugs of Hawaii** | "The culmination of 47 years of our study", first meant as a book **[read]** | Hawaii only | Species pages, maps, references, a glossary | "All photos are copyright of the credited photographer" | **Cite only**, and only for species also confirmed in the Philippines (rule C6) | None |
| **Nudi Pixel** | A photo identification site, Indonesia-based, 2007, relaunched in August 2024 as a community platform with expert votes **[read: About]** | Indo-Pacific; its GBIF dataset holds 45,272 records, 8,118 in the Philippines **[measured]** | Species, place, date per photo | "Copyright © 2007-2026 by Nudi Pixel. All materials may not be reproduced ... without written permission ... All photographs ... copyrighted to the respective photographers" | **Cite only**; its records are on GBIF under CC BY 4.0 (the media there carry no licence) | GBIF dataset "Nudi Pixel Nudibranch and Sea Slug Observations" (CC BY 4.0), shared through OBIS |
| **California Academy of Sciences, Verde Island Passage** | Expeditions; the 2015 one "the third such Academy-led expedition to the Philippines since 2011" **[read: the Academy's 2015 expedition page]**: in spring 2015 "nearly 50 scientists", seven weeks, "more than 100 species that are completely new to science" | Batangas and Mindoro, the Philippines | The specimens are in the CAS Invertebrate Zoology collection, on GBIF (CC0): e.g. 5 preserved *H. lacer* from the Philippines **[measured]** | The Academy's own photos, "© California Academy of Sciences" | **Cite**; specimen records CC0 | GBIF API |
| **Gosliner and colleagues on Philippine sea slugs** | Papers from those expeditions **[search: titles only]**: new Aglajidae from Anilao and Tingloy (Proceedings of the CAS); the bat-winged slugs (Gastropteridae) of the Verde Island Passage (Ong, Hallas & Gosliner); "Sleuthing cryptic Chromodorids ... adding to Philippine marine biodiversity" (Philippine Journal of Systematic Biology 2020, its DOI resolver answered 503) | The Philippines | Descriptions, diagnostic features, distribution of the species they treat | Each paper's own terms (not checked) | **Cite**, one cue per paper and page | None. Gosliner, in a 2016 Rappler interview: "about 6,000 known species of sea slugs worldwide. About 1,000 of them could be found in the Philippines" **[read]** |
| **Other: Plazi, GBIF** | Plazi: treatments extracted from papers (the *Hexabranchus* revision's among them); GBIF: the occurrence aggregator behind the rows above | Global | Plazi: the treatment text and figure captions; GBIF: occurrences per dataset | Plazi: "No known copyright restrictions apply", the site CC0; GBIF: each dataset's licence | Plazi: **reuse with the citation**; GBIF: per dataset | Both have public APIs (GBIF's used here) |

### 2.2 Which source for which fact (rule C2: every cue carries its source)

Proposals **[guess]**, to settle when the sheets are written (study §9):
- **Names, ranks, synonyms**: WoRMS, with iNaturalist's name beside it (as in the list; rule S2's spirit).
- **ID features (the cues and the tips)**: the original description or revision of the species (through Plazi where it
  is there), then Gosliner, Valdés & Behrens 2018 (page cited), then the Sea Slug Forum's answers (message cited). Never
  a cue from a photo site. Every look-alike and doubt only with species confirmed in the Philippines (rule C6).
- **Size, depth, food, eggs**: SeaLifeBase with its reference, where the species page has it; the guide otherwise.
  SeaLifeBase still describes some species in their pre-revision sense (*H. sanguineus*): such a fact is listed as a
  point for `points.json`, not settled (rule C5).
- **Distribution and presence**: rule C8 as today (iNaturalist, `tools/presence.py`). The GBIF records of Nudi Pixel,
  seaslug.world and the CAS collection can be cited as context; using them in the presence rule would change rule C8,
  which is Pierre's.
- **Juveniles and egg masses** (sheet notes): the Sea Slug Forum and the papers; SeaLifeBase's "Eggs" field.

### 2.3 Where the photos come from

- **iNaturalist, as for the fish**: CC0, CC BY or CC BY-NC (rule P1), the licence as the last tie-break, eggs excluded
  (§1.4). Enough for every species of circle 1 (list §5.1).
- **Wikimedia Commons as a complement for thin species** **[guess]**: only CC0 and CC BY files, each checked for its
  licence, author and species, never share-alike. Its "Public domain" files are not in rule P1's list: Pierre's to
  decide.
- **SeaLifeBase only where a picture page gives an open licence**, as the FishBase route does for the fish (rule P1);
  none of *H. sanguineus*'s 20 does, other species not checked.
- **No photos from** the book, the Sea Slug Forum, Nudi Pixel, seaslug.world or Sea Slugs of Hawaii: all are the
  photographers' own, with no open licence.

## Appendix A. The circle-1 observations annotated "Life Stage: Juvenile" (pulled 2026-11-15)

Research Grade, worldwide; * = in the Philippines. Each is <https://www.inaturalist.org/observations/ID>. All 97 show
the animal (§1.2).

- *Hexabranchus lacer* (43): 26663221, 33305200, 33420805, 35281790, 70011835*, 101819887, 102564032, 102564041,
  110523828, 119945495*, 141095422, 147092756, 147094072, 150149034*, 150149231*, 154715215, 154997456, 155145569*,
  160492998, 160492999, 172116141, 172126521, 172316924, 175200746, 179191175, 179813911, 181514062, 183052136,
  195059204, 219066352, 219687844, 230044148, 234659852, 234837289, 238883349, 239176602, 242478654, 258228864*,
  298921895, 298921898, 313671867, 314056845, 395170217.
- *Pleurobranchus forskalii* (15): 9282083, 91004209, 109292132, 150061382, 153545115*, 164755860, 179883824, 181895819,
  201318197*, 233271583, 234484158*, 239344436*, 239344440*, 239353140, 247292871.
- *Jorunna funebris* (10): 107184788, 107626040, 108407992, 112817888, 183972269, 198008775, 207887286*, 333687617,
  351136410, 353319854.
- *Pteraeolidia semperi* (10): 7504154, 33420816, 35967276, 58314605, 61846809, 109349711, 119995536, 329135128,
  351137037, 365321661.
- Two each: *Costasiella kuroshimae* 208440821, 306175115*; *Goniobranchus fidelis* 233714076, 296175264; *Nembrotha
  kubaryana* 103292945, 189662714; *N. milleri* 293039169*, 407638125.
- One each: *Caloria indica* 94072824; *Chelidonura varians* 253860387; *Chromodoris willani* 123692120; *Elysia
  marginata* 380945816; *Goniobranchus coi* 183473261; *G. geometricus* 184094348; *G. kuniei* 148799984; *Halgerda
  batangas* 149660389*; *Hypselodoris apolegma* 59743204; *H. tryoni* 315427780*; *Tambja morosa* 74904395.

The 6 *H. sanguineus* observations from the Philippines that show only an egg ribbon (all annotated Egg): 34893847,
144033893, 149906909, 150063448, 334004044, 388506586.

## Appendix B. Pages read (2026-11-15)

| Source | Page | Read |
|---|---|---|
| Sea Slug Forum | <http://www.seaslugforum.net/>, `/factsheet/hexasang`, `/find/1013`, `/find/2976` | yes; `/about` HTTP 404 |
| SeaLifeBase | <https://www.sealifebase.se/summary/Hexabranchus-sanguineus.html>, its thumbnails page and its 20 picture pages | yes; `/summary/citation.php` HTTP 404 |
| WoRMS | <https://www.marinespecies.org/about.php>; REST `AphiaDistributionsByAphiaID` for 220381 and 1571927 | yes |
| iNaturalist | API v1 `observations`, `controlled_terms`, `taxa`; <https://help.inaturalist.org/en/support/solutions/articles/151000175695> | yes; `/pages/terms` HTTP 403 |
| Wikimedia | Commons API, category *Hexabranchus sanguineus*; <https://en.wikipedia.org/wiki/Spanish_dancer> | yes; a second Commons category HTTP 429, not retried |
| seaslug.world | <https://seaslug.world/> | yes |
| Sea Slugs of Hawaii | <https://seaslugsofhawaii.com/> | yes |
| Nudi Pixel | <https://nudipixel.net/>, `/about_us` | yes |
| GBIF | API `occurrence/search` (facets), `dataset/{key}` for 4 datasets | yes |
| The guide | <https://www.reef.org/products/nudibranch-sea-slug-identification-indo-pacific-2nd-edition>, <https://www.scubadiving.com/new-nudibranch-id-book-released-by-new-world-publications> | yes |
| CAS | <https://docent.calacademy.org/learn-explore/scientific-expeditions/2015-philippine-biodiversity-expedition> | yes |
| Rappler | <https://www.rappler.com/environment/141040-nudibrachs-sea-slugs-new-discoveries/> (2016-07-31) | yes |
| Plazi | three treatments of Tibiriçá et al. 2023: `706C87DEFFF1C23119D5695B4FA9F394` and `706C87DEFFF3C2301A6D6A244839F138` (*H. lacer*), `706C87DEFFD3C21319D569104891F724` (*H. marginatus* var. *moebii*), each at <https://tb.plazi.org/GgServer/xhtml/ID> | yes |
| Springer | the Tibiriçá et al. 2023 PDF | no: redirected to a login, not fetched another way |
| PJSB | <https://doi.org/10.26757/pjsb2020b14014> | no: HTTP 503 |
