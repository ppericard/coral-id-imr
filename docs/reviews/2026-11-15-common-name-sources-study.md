# Common names: which references rank them, and how to choose the main name (study)

**Status: for Pierre (2026-11-15).** Read-only study: no app code, no data file changed. The sample and every source's
first name per species are in [2026-11-15-common-name-sources-sample.csv](2026-11-15-common-name-sources-sample.csv).
The scripts and the cached downloads are in the study agent's scratchpad, outside the repository.

**Asked by Pierre (2026-11-15, translated):** "I'm not convinced the IMR (PDF) name is always the best main common
name. How could we determine which references are best for common names? Make a small study: find some examples, look at
what names people generally use in English sources, and where those names are found in the reference databases.
iNaturalist groups many different common names but doesn't necessarily order them. Do we have references that order
common names, saying 'this one is the most used'? Keep in mind that the day we localise (French names, or another
language), common names will change and move a lot again." And: "Common names also exist for families and genera
(perhaps fewer for genera, but some). More generally there are different groupings: in French and in English,
common-name groupings are made differently."

**Decided already (Q362, 2026-11-15):** one progress unit per species. How the unit is filled by its names comes later,
with this study as input.

**What the app does today** (`tools/fish_common.py`, FISH_PATH "Common names"): 1 to 3 English names per species. The
IMR PDF name comes first (rule C1). The FishBase main name and the iNaturalist default name follow, each only when both
references carry it, the most shared first.

Marks: **[measured]** counted by a script on the data named; **[read]** read today on the source's own page or file
(quoted where it matters); **[memory]** my own knowledge, not re-checked today; **[guess]** an inference, labelled.

---

## 0. The short version

1. **No reference ranks English names by usage.** FishBase's main name is chosen by a stated priority: the FAO name,
   then the AFS name, then another English name, "using the criteria in Robins et al. (1991a)" **[read]**. iNaturalist's
   default name is whatever curators put first: there is no usage count behind it. Of the game species' default English
   names, 507 of 658 carry no source at all **[measured]**. The Australian standard (AS 5300) and the AFS list are
   committee standards for their own countries. IUCN flags one "preferred" name with no stated basis. Wikipedia titles
   an article by "the English name that is most common", else by the scientific name **[read]**.
2. **The sources disagree a lot.** In the 40-species sample, a species gets 1 to 6 different first names across 11
   sources; only 7 of the 40 get a single name everywhere **[measured]**. Over the 639 game species that have all three,
   the IMR name, FishBase's main name and iNaturalist's default are the same name for 308 (48 %) **[measured]**.
3. **The IMR name follows iNaturalist more than FishBase.** On the 367 species named by the IMR PDF or slides, it
   matches iNaturalist's default for 260 (71 %) and FishBase's main name for 199 of 365 (55 %) **[measured]**. (The
   other 294 game species carry a name from circle 3's Dauin sources, not IMR's; 292 of them equal iNaturalist's
   default.) Against the plurality of the other source families, the IMR name agrees 14 times in 31. FishBase's main
   name agrees 18 in 28, iNaturalist's default 19 in 30 and FishBase's most-recorded name 19 in 25 **[measured, small
   sample]**.
4. **The sources are not independent.** ASFIS and FishBase's main name are the same for 18 of 19 sample species. The
   iNaturalist names that do cite a source cite the Catalogue of Life 2012 or ITIS **[measured]**, and those carried
   FishBase's names **[memory]**. Counting votes across all sources therefore over-counts FishBase. Below, each source
   family gets one vote.
5. **"General usage" is hard to measure honestly.** Google Books Ngram finds 17 of 113 candidate names at all, and only
   2 species have two names to compare **[measured]**. Wikipedia titles 25 of the 40 sample species by their
   scientific name (no consensus common name) **[measured]**. No dive or ID site gives counts. The proxies say which
   names exist, not which one people say most.
6. **French is worse, and its groups differ.** Of 27 sample species with 2+ French names, the sources agree on the
   first one for 7 **[measured]**. French groups cut across English ones (FishBase and iNaturalist records, section 4):
   - *marignan* covers both soldierfishes and squirrelfishes;
   - *vieille* covers groupers and wrasses;
   - *cocher* covers bannerfishes (*Heniochus*) and the Moorish idol;
   - *bourse* covers filefishes, tobies, triggerfishes and a boxfish;
   - *demoiselle* is the whole damselfish family in French but only some genera in English.
7. **Recommendation:**
   - Keep progress keyed by taxon (Q362) and treat names as a per-language display layer.
   - In English, accept every listed name, IMR's included.
   - Show first iNaturalist's default name in the player's language (FishBase's main name where iNaturalist has
     none). A three-reference majority rule did no better on the sample, so the simpler rule wins (rule L11). The same
     mechanism works for every language.
   - Where the IMR name sits is Pierre's choice (question (a)). Shown first to everyone, iNaturalist's default would
     replace the IMR name on 107 of the 367 IMR-named species, 99 of them in circle 1 **[measured]**.

---

## 1. The sample

**Rule (fixed before any outside source was read; ranks by `fish.json` `cmi`, the commonness index, highest first,
then by id):**

| Stratum | Rule | n |
|---|---|---|
| A | circle 1, 3 names listed today | 5 |
| B | circle 1, 2 names, the IMR name a different name (not a spelling) from FishBase's main or iNaturalist's default | 10 |
| C | circle 1, 1 name, IMR = FishBase main = iNaturalist default (spellings allowed) | 5 |
| D | circle 1, 1 name, a main name left out today (`left` in `fish_common.json`) | 5 |
| E | circle 1, a spelling-only difference (Neon damsel / damselfish) | 2 |
| F | circle 2 | 3 |
| G | circle 3 | 6 |
| H | circle 1, most observed at Dauin (`present.dauin`), not yet taken | 4 |

That gives 40 species. Stratum H was added after the first draw of A-G, by the same kind of rule, to include the
best-known species. 36 of the 40 are named by the IMR PDF; 4 (*Pholidichthys*, *Labracinus*, *Elagatis*,
*Neochirus*) carry a Dauin-source name. The CSV's `own_name` and `own_src` columns say which, and the "IMR" figures
below count only the 36. "Same name" means `fish_common.py`'s `variant()` (2 letters apart at most, a trailing "fish",
or one name the other's first words), so Pearl-scaled / Pearlscale count as one name. The sample is chosen to hold
disagreements, so its agreement rates are lower than the whole game's. The whole-game rates are given beside them
wherever the data allows.

**Sources pulled for every sample species** (pull dates in section 8). Each source's first name is a column in the
CSV. Two columns give the full order: `inat_en_ordered` (iNaturalist's English names with their `position`) and
`fb_en_top` (FishBase's six most-recorded English names with their record counts).

- the species' own name (`fish.json` `common`) and today's list;
- FishBase: its main name (FBname), its most-recorded English name (the most countries or references; a tie goes to
  FishBase's main name, then alphabetical), its FAO-type and AFS-type records, and its French records;
- FAO ASFIS;
- iNaturalist: the default English name, all its English names in their `position` order, the name under the
  Philippines, Australia and United States place preferences, and the French default;
- WoRMS vernaculars;
- GBIF vernaculars, which carry the IUCN Red List's "preferred" flag and TAXREF's names;
- Reef Life Survey and Fishes of Australia (main name);
- Wikipedia (the article the scientific name leads to, its redirects, 60-day pageviews) and Wikidata labels;
- Google Books Ngram.

### Examples (the full table is the CSV)

| Species | IMR | FishBase main | FishBase most recorded | iNat default | IUCN preferred | Fishes of Australia | Wikipedia title |
|---|---|---|---|---|---|---|---|
| *Thalassoma lunare* | Crescent wrasse | Moon wrasse | Moon wrasse (12) | Moon Wrasse | Crescent Wrasse | Moon Wrasse | Moon wrasse |
| *Amphiprion ocellaris* | False clown anemonefish | Clown anemonefish | False clown anemonefish (4) | Ocellaris Anemonefish | Clown Anemonefish | Western Clown Anemonefish | Ocellaris clownfish |
| *Amphiprion frenatus* | Tomato anemonefish | Tomato clownfish | Tomato anemonefish (5) | Tomato Clownfish | — | not found | Tomato clownfish |
| *Zebrasoma scopas* | Brushtail tang | Twotone tang | Brown tang (6) | Brown Tang | Brushtail Tang | Brown Tang | scientific |
| *Ctenochaetus striatus* | Lined bristletooth | Striated surgeonfish | Lined bristletooth (6) | Lined Bristletooth | Striped Bristletooth | Lined Bristletooth | scientific |
| *Dascyllus aruanus* | Humbug dascyllus | Whitetail dascyllus | Humbug dascyllus (6) | Humbug Dascyllus | Banded Humbug | Banded Humbug | Whitetail dascyllus |
| *Pseudanthias tuka* | Purple anthias | Yellowstriped fairy basslet | Purple queen (3) | Purple Queenfish | Yellowstriped Fairy Basslet | not found | none found |
| *Canthigaster valentini* | Black-saddled toby | Valentin's sharpnose puffer | Valentinni's sharpnose puffer (3) | Blacksaddle Toby | Valentini's Sharpnose Puffer | not found | Valentin's sharpnose puffer |
| *Aeoliscus strigatus* | Hinged shrimpfish | Jointed Razorfish | Razorfish (4) | Jointed Razorfish | Coral Shrimpfish | Jointed Razorfish | scientific |
| *Myripristis murdjan* | Blotcheye soldierfish | Pinecone soldierfish | Pinecone soldierfish (6, tied with Blotcheye soldierfish) | Crimson Soldierfish | Pinecone Soldierfish | Crimson Soldierfish | scientific |
| *Chromis ternatensis* | Ternate chromis | Ternate chromis | Ternate chromis (5) | Ternate Chromis | Ternate Chromis | Swallowtail Puller | none found |
| *Elagatis bipinnulata* | Rainbow runner (Dauin source, not IMR) | Rainbow runner | Rainbow runner (41) | Rainbow Runner | Rainbow Runner | Rainbow Runner | Rainbow runner |

(n) = the number of FishBase country or reference records of that name for the species; "scientific" = the article
is titled by the scientific name; "not found" = my search of that site did not return the species, which does not
prove it is absent.

What the examples show:

- **The IMR name is often the most-recorded name.** IMR = FishBase's most-recorded name for 19 of 35 IMR-named
  sample species. "False clown anemonefish" and "Tomato anemonefish" lead FishBase's own records, but are not its
  main name; "Blotcheye soldierfish" ties with it.
- **FishBase's main name is a standard, not usage.** It follows FAO first: *Coris gaimard* is "African coris" (FAO), a
  name with 1 record, against 9 for "Yellowtail coris" (the IMR name). *Aeoliscus strigatus* is "Jointed Razorfish"
  with 1 record, against 4 for "Razorfish".
- **The Australian standard names form their own family**: Swallowtail Puller, Headband Humbug, Threespot Humbug,
  Banded Humbug, Scarface Damsel, Western Clown Anemonefish. iNaturalist shows them under the Australia place
  preference: 9 of the 40 sample species read differently there **[measured]**.

---

## 2. The sources: what they designate, on what basis, coverage, terms, access

Coverage below is of the 664 game species (circles 1-3) or of the 40-species sample, as said.

| Source | What it designates | Basis | Coverage | Terms | API / bulk |
|---|---|---|---|---|---|
| **FishBase** (Froese & Pauly, eds.) | One "FishBase name" per species (FBname); a common-names table of records, each with language, country, type and rank | FBname: "an FAO name, or if not available, of an AFS name, or if not available, of another English name ... selected from amongst available names using the criteria in Robins et al. (1991a)" **[read: FishBase manual, COMMON NAMES table]**. Records: type = vernacular, market, aquarium, FAO or AFS; rank 1 = "name adapted by the AFS or the FAO", rank 2 = "name used in the national or official language of the country" **[read]**. A `PreferredName` flag exists in the table but is not described on that manual page **[read]** | English: 649 of 654 matched game species, 9,102 English records; French: 336 species, 1,282 records **[measured, v25.04]**. FBname is an FAO-type record (type FAO or FAO old) for 331 of 654, and the most-recorded English name for 479 of 654 **[measured]** | CC BY-NC (the rfishbase snapshot's terms as cited in `fish_common.py`) **[repo]** | No official REST API used; the rfishbase parquet snapshots on Hugging Face (`cboettig/fishbase`, v25.04) hold every table **[read]** |
| **iNaturalist** | A default name per locale; names can be tied to a place | "First, iNat looks for the default (top-ranked) name that is set to be used in your preferred name place", then "the top-ranked name in your Language/Locale setting"; "Only curators have access to the page that shows the name rankings and place associations" **[read: the forum's "Why don't I see my expected common name?" thread, 2021, a forum moderator's post, not staff documentation]**. No usage basis | English: 658 of 663 taxa; French: 470 of 663 **[measured]**. Sources in the taxonomy archive: of the 658 default English names, 507 have no source, 84 cite the Catalogue of Life (2012), 37 ITIS **[measured]**. Place-specific English names: 170, of which 139 are for Australia; none for the Philippines in the sample **[measured]**. French place names: 39 for New Caledonia **[measured]** | The taxonomy archive's `eml.xml`: "Taxonomic information should not represent creative work and thus may not be subject to intellectual property restrictions in many jurisdictions" **[read]** | API `/v1/taxa` (all names with lexicon and position, `preferred_place_id`); a DwC-A taxonomy archive (how often it is renewed was not checked) with `VernacularNames-<language>.csv` (source, locality, country columns; 81 MB, dated 2026-11-01) **[read]** |
| **WoRMS** | Vernaculars attached to a taxon, with a language | No order and no preferred flag in the REST answer (`AphiaVernacularsByAphiaID`: vernacular, language) **[read: the records]** | Sample: English for 19 of 40, French for 0 of 40 **[measured]**. Families: English for 57 of 70 scientific families **[measured]**. Genera: English for 1 of 42 queried **[measured]** | CC BY 4.0 **[memory]** | REST API **[read]** |
| **Australian Fish Names Standard AS 5300** (FRDC) and **Fishes of Australia** | One Standard Fish Name per species | The Fish Names Committee keeps the standard **[read: search result summaries; the FRDC page answered 403]**. Fishes of Australia: the 2007 Standard "prescribes a standard fish name for each species of fish produced or traded in Australia"; each species page "provides the Australian Standard Fish Name, along with other names" **[read: fishesofaustralia.net.au "What's in a Name?"]**. That the page's main name is the standard name is **[guess]** from that sentence | Nearly 5,000 Australian and imported species in the standard **[read: search summaries]**. Fishes of Australia found 31 of 40 sample species by its search **[measured]** | Fishes of Australia: "Creative Commons Attribution 3.0 Australia License" unless otherwise indicated **[read]**. The standard: free to view, sold as a document **[read: search summaries]** | Fishes of Australia: web pages, no API seen. The standard: an Excel download **[read: search summaries, not opened]** |
| **AFS / ASIH**, *Common and Scientific Names of Fishes from the United States, Canada, and Mexico*, 8th ed. (2023) | One English name per species, by committee | "Principles Governing Selection of Common Names", by the joint AFS-ASIH committee; 5,089 species; the 2023 edition covers the three countries' EEZs; English for all species, French for Canada's, Spanish for Mexico's **[read: search summaries; fisheries.org answered 403]**. Whether Hawaii's reef fish are included was not checked | FishBase holds AFS-type English records for 158 of 654 game species **[measured]**: the reef fish that reach US waters | A book, sold **[read]** | None seen |
| **FAO ASFIS** (2026.1) | One English, French, Spanish, Arabic, Chinese and Russian name per species | FAO's list for fishery statistics. Its English name equals FishBase's main name for 18 of 19 sample species **[measured]**; which one copies the other was not checked | 13,965 species; 327 of 664 game species, 318 with an English name, 189 with a French one; circle 1: 242 of 471 **[measured]** | FAO's terms, not re-checked **[memory: CC BY-NC-SA 3.0 IGO]** | A zip of CSV and XLSX, dated 2026-07-09 **[read]** |
| **Reef Life Survey** (Reef Species of the World) | A main name and a list of other names per species | Not stated on the pages read **[read]** | 37 of 40 sample species **[measured]** | Site "Copyright Reef Life Survey"; the survey data CC BY **[read: search summaries]**. No licence seen for the names | Web pages; survey data downloads **[read]** |
| **IUCN Red List** (through GBIF) | One English name flagged `preferred` | Not stated in the records **[read]** | 36 of 40 sample species have one **[measured]** | GBIF lists the dataset as CC BY 4.0 **[read]**; IUCN's own terms of use not checked | GBIF API, `species/{key}/vernacularNames` **[read]** |
| **Wikipedia (en)** | The article title | "the English name that is most common"; the scientific name "when there is no common name or no consensus can be reached on the most common name"; among competing names, "prefer the common name most used ... by international zoological nomenclature authorities" **[read: Wikipedia:Naming conventions (fauna)]**. No fish-specific rule there | Sample: 12 of 40 titled by a common name, 25 by the scientific name, 3 not found under their current name **[measured]** | CC BY-SA **[memory]** | API (rate-limited from this machine: one HTTP 429 today) |
| **Wikidata** | Labels and aliases per language | Editors' labels | Sample English label: a common name for 13, the scientific name for 24 **[measured]** | CC0 **[memory]** | API |
| **TAXREF** (MNHN, France) | French (and some English) vernaculars for taxa of metropolitan and overseas France | The national taxonomic reference "pour la faune, la flore et la fonge de France métropolitaine et d'outre-mer" **[read: its GBIF dataset description]**. Whether it marks one reference vernacular was not checked: INPN answered 403 | Through GBIF: a French name for 20 of 40 sample species, English for 23 **[measured]** | CC BY 4.0 on GBIF **[read]** | GBIF API; TAXREF's own API answered a Cloudflare challenge **[read]** |
| **DORIS** (FFESSM) | French diver-facing species sheets | Not reachable from this machine today (connection failure; WebFetch got 503) | Not checked | Not checked | Not checked |
| **Field guides** | One name per species, the author's | Author's choice | Not checked | Copyright | None |

The field guides are named as references only, with no content copied: Allen, Steene, Humann & DeLoach, *Reef Fish
Identification – Tropical Pacific* (the IMR course's book, rule S3); Allen & Erdmann, *Reef Fishes of the East Indies*;
Kuiter's guides.

**Answer to "Do we have references that order common names, saying this one is the most used?"**: no.

- **What comes closest is FishBase's records.** It is the only source with a count behind a name: how many countries
  or references record it. That count measures how widely a name has been recorded, not how often people say it.
- **iNaturalist does order its names** (the `position` field), but the order is a curator's choice with no stated
  basis. On a place, it is a regional choice.
- **The standards (FAO, AFS, AS 5300) each fix one name by committee** for trade or a country, never by usage.

---

## 3. Families and genera

| | Families (70 scientific names behind the 67 game families) | Genera (239 game genera) |
|---|---|---|
| iNaturalist English | 67, of which 31 have 2+ English names, ordered by curators **[measured]** | 71 (circle 1: 43 of 130) **[measured]** |
| iNaturalist French | 37 **[measured]** | 9 **[measured]** |
| FishBase | `families.CommonName` 60, `CommonName_French` 46 **[measured]** | `genera.GenComName` 14 **[measured]** |
| WoRMS English | 57 **[measured]** | 1 of the 42 queried **[measured]** |
| The app today | the book's label and IMR's name (rule S3) | 20 (`fish.json` genera `common`, #700) |

- **Nobody ranks names at these ranks either.** FishBase gives one string per family, sometimes a list ("Spadefishes,
  batfishes and scats"; "Emperors or scavengers"). iNaturalist lists several, its first is the default: Lethrinidae
  "Emperor Breams", then "Emperors", "Scavengers", "Pigface Breams". WoRMS lists several, unordered.
- **The names also follow the source's own taxonomy.** iNaturalist's Labridae is "Wrasses and Parrotfishes" (French
  "Labres et poissons-perroquets"), and its Lutjanidae in French is "Vivaneaux et Fusiliers". FishBase's French name of
  Lethrinidae is "Vivaneaux", the same as its Lutjanidae **[measured: the records]**.
- **The four genera without a name today:**
  - *Centropyge*: "Dwarf Angelfishes" (iNaturalist; French "Poissons-anges nains") and "Pygmy angelfishes" (FishBase).
  - *Dendrochirus*: "Zebra Lionfishes" (iNaturalist).
  - *Dascyllus*: "Humbugs", then "Humbugs and Dascylluses" (iNaturalist). That is the Australian word; the IMR names
    of its species use "dascyllus".
  - *Cephalopholis*: no name in iNaturalist, FishBase or WoRMS **[measured]**. The 2026-11-09 study found that 10 of
    the 20 grouper species in the game carry "hind" as their kind word, all of them *Cephalopholis*. That is evidence
    for "hinds", but no reference states it.
- **For the design**: a genus or family name should come from a reference, kept with its source, as for species. When
  none exists, the unit has a scientific name only (the Q247 pattern for species).

---

## 4. Groupings differ by language

Measured on FishBase's French records (1,282 records for 336 game species; by country: France 270, Maldives 194, global 187, New Caledonia 131, Mauritius 125, Seychelles 104, French Polynesia 97, Réunion 62) and on iNaturalist's French
defaults (470 species). "Global" is FishBase's country code for records with no country, mostly FAO names. The head word is the French name's first noun ("Poisson X" taken as one word). The script
cross-tabulates it against the game's family, which follows the English book (rule S3).

**French groups wider than the English ones:**

| French head word | Game families it spans | Records (FishBase, country) |
|---|---|---|
| *marignan* | Soldierfishes 6 + Squirrelfishes 9 records (iNaturalist: 3 + 3 species) | *Myripristis kuntee* "Marignan ardoisé" (global FAO, Europa I.); *Neoniphon sammara* "Marignan tacheté" (global FAO, Maldives); *Sargocentron rubrum* "Marignan rouget" (Djibouti) |
| *vieille* | Groupers 36 + Wrasses 10 + Soapfishes 2 records (iNaturalist: 5 groupers + 1 wrasse) | *Cephalopholis argus* "Vieille la prude" (global FAO); *Cheilinus trilobatus* "Vieille triple queue" (global FAO, Mauritius); *Cheilinus chlorourus* "Vieille tachetée" (New Caledonia); iNat *Pseudodax moluccanus* "Vieille ciseau" |
| *cocher*, *poisson-cocher* | Butterflyfishes (*Heniochus*, one *Chaetodon*) + Moorish Idol | *Zanclus cornutus* "Cocher blanc" (global FAO), "Poisson cocher" (French Polynesia); *Heniochus acuminatus* "Poisson cocher commun" (global FAO); FishBase's French name of Zanclidae is "Cochers" |
| *bourse* | Filefishes 7, Puffers 3, Triggerfishes 2, Boxfishes 1 | *Aluterus scriptus* "Bourse écriture" (global FAO); *Canthigaster valentini* "Bourse à selles" (Maldives); *Balistapus undulatus* "Bourse" (Seychelles); *Ostracion cubicus* "Bourse coffre" (Seychelles) |
| *perche* | Snappers 8, Emperors 5, Anthias, Fusiliers, Sweetlips | *Gnathodentex aureolineatus* "Perche à lignes d'or" (Mauritius, New Caledonia); *Lutjanus kasmira* "Perche à raies bleues" (French Polynesia); *Pseudanthias tuka* "Perche de mer pourpre" (Mauritius) |
| *loche* | Groupers 14, Sweetlips 2, Soapfishes 1 | *Cephalopholis argus* "Loche saumonée" (New Caledonia); *Plectorhinchus picus* "Loche casteix" (New Caledonia); *Grammistes sexlineatus* "Loche gingembre" (New Caledonia) |
| *picot* | Rabbitfishes 6 + one surgeonfish | *Siganus puellus* "Picot à lignes bleues" (New Caledonia); *Acanthurus mata* "Picot kanak" (New Caledonia) |

**A word whose scope differs between the languages.** In French, *demoiselle* names the whole damselfish family
(FishBase: Pomacentridae "Poissons demoiselles"; iNaturalist "Demoiselles et Poissons-clowns"). In English,
"demoiselle" is a kind word of a few damselfish genera only: 8 of the game's 66 damselfishes (2026-11-09 study). The
English "damsel" / "damselfish" covers the family.

**English groups the French name split differently:**

- surgeonfish / tang / unicornfish / bristletooth against *chirurgien* / *nason*;
- grouper / hind against *mérou* / *vieille* / *loche*, by region.

**What it means for the design:**

1. **The groups a player learns by name depend on the language.** A French player who learns *marignan* has learned
   one group; an English player has learned two families (soldierfishes, squirrelfishes). A French *vieille* is a
   grouper in records from the Seychelles, Réunion, Mauritius and Djibouti, and a wrasse in records from Mauritius and
   New Caledonia; FAO's French list uses it for both.
   So the name groups must never be the units.
2. **Progress stays keyed to taxa** (species, genus, family ids, Q362). Names are a per-language display and answer
   layer on top. A French layer may add its own name groups (*marignan*, *cocher*) as hints or typed-answer helpers,
   each pointing to its set of taxa. That is the same name index as the 2026-11-09 design (`vn`: a name and its
   owners), with a language key.
3. **French sources are regional** (New Caledonia, Polynesia, Réunion, Mauritius, metropolitan France), and they
   disagree more than the English ones: 7 of 27 sample species agree on the first name. A French source order needs
   its own study when French comes, starting from TAXREF (the national reference, overseas included), iNaturalist's
   French lexicon, FishBase's French records and ASFIS French.

---

## 5. Usage in general English: the proxies

| Proxy | What it gave | Strength |
|---|---|---|
| Wikipedia title | 12 of 40 sample species titled by a common name; 25 by the scientific name (the guideline's "no consensus"); 3 not found | Weak to medium: an editors' choice under a usage rule, often copied from FishBase. Where it is a common name it agrees with FishBase's main name 10 of 12 |
| Wikipedia redirects | Which candidate names exist as redirects to the article (CSV column `wikipedia_redirects`) | Weak: shows a name exists, not that it is used |
| Wikipedia pageviews (60 days, action API `prop=pageviews`) | From 41 (*Parapercis cylindrica*) to 7,900 (*Amphiprion ocellaris*, "Ocellaris clownfish") | It ranks species by interest, not names. Useful for which species are known, not for which name |
| Google Books Ngram (English corpus, 1980-2022, case-insensitive) | 17 of 113 candidate names above the corpus threshold; 2 species with two comparable names (*Chromis viridis*: "Green chromis" over "Blue-green chromis", which is 0; *Amphiprion ocellaris*: "Clown anemonefish" 1.7e-9 over "False clown anemonefish" 3.0e-10 over "Ocellaris clownfish" 1.3e-10). "Sergeant major" and "domino" are high only because they name other things | Too thin for reef fish: books rarely print these names |
| iNaturalist place preferences | Philippines: no place-specific English name in the sample (same as the default). Australia: 9 of 40 differ (the standard names) | Shows regional standards, not usage |
| Dive and ID sites | Reef Life Survey and Fishes of Australia main names recorded per species (CSV) | Each site's own choice; no counts. Search-engine hit counts were not used (not reproducible) |

**What can be concluded:** the proxies separate names that exist from names that do not. They cannot rank two
established names for most reef fish. For the few species where they can (Moon wrasse: FishBase, iNaturalist, WoRMS,
Reef Life Survey, Fishes of Australia, ASFIS and the Wikipedia title, and the only one of its two names Ngram finds),
the IMR name is the minority one.

---

## 6. Agreement on the first name

**Over all game species (the three sources in the repository)** **[measured]**. "IMR name" counts only the 367
species named by the IMR PDF or slides:

| Pair | Same name (spellings allowed) | Of which spelling only |
|---|---|---|
| IMR name and iNaturalist default | 260 of 367 (71 %); circle 1: 241 of 340 | 27 |
| IMR name and FishBase main | 199 of 365 (55 %); circle 1: 187 of 338 | 24 |
| FishBase main and iNaturalist default, every game species | 341 of 639 (53 %) | |
| All three, IMR-named species | 166 of 365 (45 %); 40 species have three different names | |

The 294 species with a Dauin-source name match iNaturalist's default for 292, so those names most likely come from
iNaturalist **[guess]**. They are left out of the IMR figures.

**In the sample, one vote per source family.** The families are:

- FishBase curated (FBname, ASFIS, WoRMS);
- FishBase records (most-recorded);
- iNaturalist;
- Australian (Fishes of Australia, Reef Life Survey);
- IUCN;
- Wikipedia title.

Leaving out the source's own family, this counts how often each source's first name is the plurality of the other
families, when that plurality is unique **[measured]**:

| Source | Agrees |
|---|---|
| FishBase most-recorded | 19 of 25 |
| iNaturalist default | 19 of 30 |
| FishBase main | 18 of 28 |
| Wikipedia title | 7 of 10 |
| IMR name | 14 of 31 |
| IUCN preferred | 13 of 26 |
| Fishes of Australia | 12 of 28 |
| Reef Life Survey | 9 of 33 |

**One yardstick for every candidate rule.** The plurality of the three families no candidate uses (Australian, IUCN,
Wikipedia), when unique **[measured]**:

| Candidate | Agrees |
|---|---|
| IMR name | 8 of 14 |
| FishBase main | 12 of 15 |
| FishBase most-recorded | 12 of 15 |
| iNaturalist default | 13 of 16 |
| Majority of {FishBase main, FishBase most-recorded, iNaturalist default}, split to iNaturalist | 14 of 16 |

**Reading:**

- **Which source matches the others best:** FishBase's most-recorded name, iNaturalist's default and FishBase's main
  name, about 2 in 3.
- **The IMR name matches less**, under 1 in 2. That is partly by design: the sample was chosen for species where the
  IMR name differs.
- **The Australian sources match least**, as expected of a regional standard.
- **The three-reference majority rule is no better than iNaturalist's default alone** (14 of 16 against 13 of 16).
- **The sample is small** (10 to 33 comparisons per source) and chosen for disagreement. These are directions, not a
  ranking with confidence.
- **There is no measured "usage" behind any of them** (section 5). "Matches usage best" can only be read as "matches
  the other references best".

---

## 7. Recommendation

### 7.1 A rule for the main English name

**Candidates** (unchanged): the names `fish_common.py` already finds: FishBase's main name and its records, and
iNaturalist's English lexicon. The IMR name is a candidate too, and always an accepted answer (rule C1: it is never
"corrected").

**Main name (shown first): iNaturalist's default English name** (the global English lexicon, no place), as fetched by
the build; FishBase's main name when iNaturalist has none.

Why this one:

- **It matches the other reference families as well as anything tried** (section 6). A majority of three references
  (FishBase main, FishBase most-recorded, iNaturalist default) did no better, so the simpler rule wins (rule L11).
  That majority rule would also count FishBase twice, the dependence §0 warns about.
- **It works the same way in every language.** iNaturalist keeps a lexicon per language and per place, so French or
  Tagalog later need no new mechanism, only a check of that lexicon's quality.
- **It is the name iNaturalist shows**, and most of the game's photos come from iNaturalist observations.
- **The IMR name and the Dauin names already follow it** (71 % and 292 of 294).

Its weakness: iNaturalist's names are curator-ordered and mostly unsourced, and they can change at any time. The
build already takes a snapshot (`fish_common_src.json`). A refetch that changes a main name should be listed in the
build's summary for a look, never applied silently.

**Over all game species** **[measured]**:

| Case | Species |
|---|---|
| Main name differs from the IMR name (367 IMR-named species) | 107, circle 1: 99 |
| Not in today's list at all (shown or as a spelling) | 15 |
| Dauin-named species whose name changes | 2 of 294 |
| For comparison, the three-reference majority rule: differs from the IMR name | 125, circle 1: 115 |

Examples of a different main name:

- Crescent wrasse → Moon wrasse;
- Brushtail tang → Brown tang;
- Purple anthias → Purple queenfish;
- Reticulated dascyllus → Reticulated damselfish;
- Longfin spadefish → Longfin batfish.

Spelling and capitals follow `fish_common.py`'s rules, as today (FishBase's form when it has the name).

**A risk: a name can move between species.** The IMR list calls *Forcipiger flavissimus* "Longnose butterflyfish".
iNaturalist calls *F. longirostris* "Longnose Butterflyfish" and *F. flavissimus* "Forceps Butterflyfish". A main name
that moves to another species must go through the shared-name rule (FISH_PATH, Q319) and be checked by hand.

**Where the IMR name fits** is question (a). The options:

- **A, IMR first always** (today);
- **B, IMR first for IMR players only** (the "I'm at IMR" setting), the rule's name first for everyone else, both
  accepted;
- **C, never forced first**: the IMR name is accepted and listed, and shown first only when the rule picks it.

I recommend **B**. RAs meet the course's names, so rule C1 holds where it matters. Other players see the reference
name. The IMR name is never wrong for anyone.

### 7.2 A design that stays stable as names move and languages are added

- **Progress is keyed by taxon id** (species `s091`, genus `g:…`, family `f:…`), one unit per species (Q362), never
  by a name or a slug of one. A renamed, reordered or added name moves no progress. This replaces the name-slug key
  of the species-step1 note's question (a), option A.
- **Names are a per-language layer.** One file per language: `names.<lang>.json`, written by the build like
  `fish_common.json` today. It gives, per taxon, its accepted names, each with its sources, and its main name.
  - The main name depends on the language. It may also depend on the player's profile (IMR, under option B).
  - Each language has its own source order:
    - English: §7.1;
    - French, later: iNaturalist's French lexicon by the same rule, checked first against TAXREF, FishBase French and
      ASFIS French (French sources agree far less, section 4);
    - another language: iNaturalist's lexicon for it, FishBase's records as the fallback.
- **Name groups that do not match a taxon** (*marignan*, *razorfish*, *goby*) live in that language's name index (the
  2026-11-09 `vn` design, with a language key). They point to taxa; they are never units.
- **How a species unit is filled by its names** (the open half of Q362) gets two inputs from this study:
  - the references disagree on a third or more of species, and no source ranks usage;
  - so requiring every listed name for a species' mastery (FISH_PATH today) makes the player learn the references'
    disagreement.

  I suggest the unit is filled by its main name. Any other listed name, typed or picked, counts as right (question (b)).
- **Corrections in use** (Q313) are stored per language and per taxon, as exceptions to the build. They belong in
  `curation.json`, written only by the admin (rule A1), as the ROADMAP row "Fish common names" plans.

### 7.3 What changes in `tools/fish_common.py` and the data (a later PR, after Pierre's answers)

- `select()`: the main name by §7.1 (iNaturalist's default, else FishBase's main). Keep the IMR name as an accepted
  name, first or not per question (a). Keep the at-most-3 cap and the shared-name rule. The order after the main
  name: the most shared first, as today.
- A refetch that changes a species' main name is listed in the summary, so it can be looked at before it ships.
- Store FishBase's records with their type (FAO, AFS, vernacular), not only the English counts: `fetch_fishbase`
  reads `NameType` and `Language` too. Keep French now: it costs nothing and prepares §7.2.
- Store iNaturalist's `position` and the archive's `source` per name (the `--inat` step). The Australia place name
  becomes an accepted alternative only if Pierre wants regional standards.
- Output: `fish_common.json` gains `main` per species (the name and its source), then becomes `names.en.json` when a
  second language arrives. `build_fish.py` writes `cn` with the main name first.
- No change to progress keys: Q362 keys by species already.

---

## 8. Sources and pull dates (2026-11-15, Manila morning, unless said)

- **FishBase**: rfishbase snapshot v25.04, Hugging Face `cboettig/fishbase`, tables `species`, `comnames`,
  `families`, `genera`, `countref`, downloaded 2026-11-15. The FishBase manual's "COMMON NAMES table" page, read
  2026-11-15.
- **iNaturalist**:
  - API `/v1/taxa`: all 663 game taxa with all names; the 40 sample taxa under `locale=en` and
    `preferred_place_id` 6873 (Philippines), 6744 (Australia) and 1 (United States), and under `locale=fr`; and 242
    genera and 109 families or subfamilies. About 1 request a second.
  - Taxonomy DwC-A archive, dated 2026-11-01.
  - `tools/fish_common_src.json` (the repository's copy, written 2026-11-08, #778) for the all-species agreement.
- **WoRMS REST** (`AphiaVernacularsByAphiaID`, `AphiaRecordsByName`): 40 species, 70 family names, 42 genera.
- **GBIF API** (`species/match`, `species/{key}/vernacularNames`; dataset metadata of TAXREF and the IUCN Red List).
- **FAO ASFIS** `ASFIS_sp_2026.1.csv` (zip dated 2026-07-09).
- **Reef Life Survey** species pages and **Fishes of Australia** search and species pages, 40 species, about 1
  request a second.
- **Wikipedia and Wikidata**:
  - one batched English Wikipedia query (titles, redirects, 60-day pageviews) in two pages, with one HTTP 429 waited
    out;
  - one Wikidata `wbgetentities`;
  - the guideline "Wikipedia:Naming conventions (fauna)", read through WebFetch.
- **Google Books Ngram** JSON, English corpus, 1980-2022, no smoothing, case-insensitive: 40 requests.
- **Not reachable from this machine today**:
  - DORIS (connection failure, WebFetch 503);
  - INPN / TAXREF site (Cloudflare challenge, 403);
  - FRDC AS 5300 page (403);
  - fisheries.org (403);
  - the iNaturalist help site (Cloudflare challenge).

  What those sources say is marked as from search-result summaries or not checked.

All requests: a generic User-Agent, no account, nothing sent but the queries.

---

## 9. Questions for Pierre

**(a) Where the IMR name sits.** Today it is always first.

- **A**: always first, as today.
- **B**: first for IMR players (the "I'm at IMR" setting); iNaturalist's default (§7.1) first for everyone else.
  Both are always accepted.
- **C**: never forced first; accepted and listed, first only when it is iNaturalist's default too.

*Recommendation: B.* 107 of the 367 IMR-named species would show another name first to non-IMR players, 99 in
circle 1.

**(b) How a species' one unit is filled by its names (Q362's open half).**

- **A**: by its main name only; every other listed name is accepted as right and credits the unit too.
- **B**: every listed name is needed, as FISH_PATH says today. The player then has to learn where the references
  disagree.

*Recommendation: A.*

**(c) Regional standard names.** Should the Australian standard names (Swallowtail Puller, Headband Humbug, Western
Clown Anemonefish) be accepted when typed?

- **Yes**: an accepted alternative, never shown first.
- **No**: as today.

*Recommendation: yes, accepted only.* An Australian diver would be told wrong for a name that is the standard in their
country.

**(d) Names for genera with no reference name** (*Cephalopholis*). Options:

- no common name (a scientific unit only, the Q247 pattern), until a reference gives one;
- "Hinds", inferred from its species' names, flagged as inferred, as `fish.json` does today for Tobies and
  Rabbitfishes.

*Recommendation: the inferred name, flagged, as today's practice for 2 genera.* *Centropyge*, *Dendrochirus* and
*Dascyllus* take iNaturalist's or FishBase's name: Dwarf (or Pygmy) angelfishes, Zebra lionfishes, Humbugs.
