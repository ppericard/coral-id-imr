# Sea slugs: a literature scan for new names and revisions (2026-11-17)

Read-only study for the sea-slug subject, with a re-runnable tool. **It changes no game data** (`seaslug.json`,
`seaslug-game.json`, `tools/seaslugs.json` and its source are untouched): it adds `tools/seaslug_lit.py`, its hand-kept
input `tools/seaslug_lit_source.json`, its output `tools/seaslug_lit.json` and `tests/seaslug-lit.test.js`. The changes it
proposes (§5) are for the integrator to apply in a follow-up PR.

Pierre, 2026-11-17 06:50 Manila, answering Q389 (the unnamed "sp. N" species, [undescribed study](2026-11-17-seaslug-undescribed-species-study.md) §6):

> "C'est là où ça vaut le coup d'explorer la littérature scientifique parce que régulièrement ils séquencent des
> nudibranches et identifient des espèces."

Context: the 2018 guide (Gosliner, Valdés & Behrens, *Nudibranch & Sea Slug Identification – Indo-Pacific*, 2nd ed.) is
dated and DRM-protected, and is not used; an undescribed "sp. N" enters the game only once a paper gives it a name.

Labels (rule W11): **[measured]** = counted by a script today (the tool, or a scratch query listed in Appendix B);
**[read]** = taken from a page, a paper or a WoRMS record; **[search]** = only a search engine's summary, the page not
read; **[guess]** = my judgement.

**Data pulls, 2026-11-17, 06:57-07:12 Manila** (the tool's replies cached in `tools/.cache/seaslug_lit.json`,
git-ignored; scratch queries in the session's scratch space, not committed; no observer id or name anywhere):
- **WoRMS REST API**, through `tools/inat.py` (0.3 s between requests, the project's User-Agent): **944 requests**.
- **iNaturalist API** (rule C7: 1 s between requests, the project's User-Agent, paced retries): **86 requests** by the
  tool, **39** by two scratch queries (Appendix B).
- The tool dates its pull by the machine's UTC day (`tools/seaslug_lit.json` `pulled`: 2026-11-16).
- **Web**: 31 searches and 28 page fetches (Appendix B); queries hold only public scientific names and general terms.
  A page that refused (HTTP 403, a login) is listed and was not fetched another way.

## 1. Summary: what to add, rename or watch, in priority order

1. **Nothing to add, nothing to rename today.** Of the **256 species described since 2018** that WoRMS accepts in our
   146 genera (and 3 watched ones), **59 are already in our list**, and **none is confirmed in the Philippines (rule C8)
   without being in it**: `tools/build_seaslugs.py` takes a species in as soon as it is named and observed **[measured]**.
   WoRMS renames none of our 452 species beyond the two known ones (*Tenellia viei*, *T. goniophaga*: *Phestilla* in
   WoRMS, "alternative representation"); no family or genus of ours has moved **[measured]**.
2. **Watch: the "Pikachu" is *Thecacera pikachu* (2026), not *T. pacifica*.** *T. pacifica* sits in circle 1 partly on
   the "pikachu" mentions that Wikipedia's redirect gives it; the 2026 paper and seaslug.world give the nickname to *T.
   pikachu* (31 observers, circle 3; "*Thecacera* sp. 8" of the 2018 guide). A point for `points.json` and a question for
   Pierre (§4.1, §6). **Answered (Q417, 2026-11-19)**: the nickname is shared; it counts for *T. pikachu* and *T.
   pacifica*, and *T. picta*, the one local divers tend to call Pikachu, is mentioned with a note that the name is not
   necessarily appropriate for it (§6).
3. **Watch: *Phyllidia ovata* (2025), "*Phyllidia* sp. 10" of the 2018 guide**, found among iNaturalist's *P. picta* and
   *P. coelestis* photos (both in circle 1); the paper cites a Dauin photo, but iNaturalist has no Philippine observation of
   it at species level (9 worldwide) **[measured]** (§4.2).
4. **Watch: *Chromodoris alcalai* (2021) was "*C. dianae*" until its description**: both in our list (66 and 52
   observers), a sourced look-alike pair; older *C. dianae* photos may be *C. alcalai* (§4.3). ***Chromodoris quagga***
   (2020, "*Chromodoris* sp. 11", holotype from Tingloy) has 6 Research Grade observations by 2 observers in the
   Philippines: **one more observer and it enters** (§3.4).
5. **The informal labels are still unnamed.** None of the 31 "sp. N" labels with 4 or more observers (undescribed study,
   Appendix A), *Goniobranchus* sp. 5 included, has a published name **[measured: WoRMS's new species in their 19
   genera are from elsewhere or are other species; iNaturalist's observations carrying a label stay at the genus]**. The named ones are labels with fewer observers: *Thecacera* sp. 8, *Tenellia* sp. 20, *Phyllidia* sp. 10,
   *Goniobranchus* sp. 43, *Chromodoris* sp. 11 and 12, *Nembrotha* sp. 5 (§3.2).
6. **Complexes, where a species-level photo is unsure** (§4): *Pteraeolidia semperi* (circle 1, "6 to 20 units", no
   name), *Coryphellina exoptata* (circle 1, two species), *Samla bicolor* (five groups), *Phyllidiella pustulosa*,
   the *Thuridilla gracilis* group (9 of 13 undescribed), *Costasiella kuroshimae* (circle 1), *Jorunna funebris* (circle
   1), *Plakobranchus ocellatus*. Each a nomenclature point (§5.3), none a change to the list.

## 2. Method and the tool

**`tools/seaslug_lit.py`** (docstring: how; `tests/seaslug-lit.test.js`):
- **WoRMS, our species**: each species' record by its AphiaID (status, accepted name, family, genus) and its sources;
  a source of 2018 or later that is not its original description is listed under `revised`.
- **WoRMS, our genera**: the 146 genera of `tools/seaslugs.json` and 3 watched ones (`extraGenera`: *Eubranchus*,
  *Aldisa*, *Facelina*, which hold Appendix A labels); every species child of each, and the original description of each
  accepted species whose authority year is 2018 or later (`since`).
- **iNaturalist**: the species of the five roots observed in the Philippines (Research Grade, verifiable) and within 40 km
  of Dauin (three `species_counts` queries for the five roots together), then the distinct observers of the new species
  only, and only where the count can reach rule C8's threshold. Presence is `tools/presence.py`'s rule (no sea-slug
  checklist: 3 observers in the Philippines, or 2 near Dauin).
- **Hand-kept input**, `tools/seaslug_lit_source.json`: `since`, the watched genera, the Appendix A labels, and the
  labels or old names that a paper now names (`named`, each with its paper and how the link is known).
- **Output**, `tools/seaslug_lit.json`: `look` (the lists below) and `raw` (the replies they derive from, with the
  species list they were pulled against). `python3 tools/seaslug_lit.py --check` derives `look` again from `raw`,
  offline, and fails on a difference (the unit tests run it); a later change to `tools/seaslugs.json` is reported, not a
  failure, and `--derive` follows it offline; a plain run refreshes from the network (cached, so a rerun is quick).

The `look` lists today **[measured]**:

| List | Count | What |
|---|---|---|
| `rename` | 2 | *Tenellia viei* → *Phestilla viei*, *T. goniophaga* → *P. goniophaga* (known; the mode study's point) |
| `placement`, `genus` | 0 | no species of ours in another family or genus in WoRMS; no genus of ours unaccepted |
| `add` | **0** | new, confirmed in the Philippines, not in our list |
| `watch` | 27 | new, observed in the Philippines, not confirmed (§3.4) |
| `inList` | 59 | new, already in our list (§3.3) |
| `revised` | 109 | species of ours whose WoRMS sources cite a 2018+ paper (§4) |
| `named` | 11 | the hand-kept links of §3.2, checked |
| `unnamed` | 31 | the Appendix A labels without a name (§3.5) |
| (elsewhere) | 170 | new species with no observation in the Philippines |

## 3. New descriptions since 2018

### 3.1 How many [measured]

- **256 accepted species** with an authority of 2018 or later in our 149 genera: 67 of 2018, 9 of 2019, 23 of 2020,
  13 of 2021, 29 of 2022, 48 of 2023, 14 of 2024, 35 of 2025, 15 of 2026 (as of 2026-11-16 in WoRMS). Most in
  *Halgerda* (20), *Hypselodoris* (17), *Trapania* (17), *Cyerce* (14), *Gymnodoris* (13), *Tenellia* (10),
  *Phanerophthalmus* (10).
- **59 in our list, 27 observed in the Philippines but not confirmed, 170 never observed there** at species level.

### 3.2 The informal labels and old names that a paper has named

From `tools/seaslug_lit.json` `named` (the paper, then how the link is known: `tools/seaslug_lit_source.json`). Presence
**[measured]** is rule C8 today; "RG" = Research Grade observations in the Philippines.

| Informal label or old name | Now | Paper | How we know | In our list | Philippines |
|---|---|---|---|---|---|
| *Thecacera* sp. 8 (2018 guide) | *Thecacera pikachu* | Pola et al. 2026, *Zootaxa* 5793(1) | seaslug.world's references **[read]**; the 8 observations described "*Thecacera* sp. 8" all *T. pikachu* now **[measured]** | yes (31 observers) | confirmed, 54 RG |
| *T. pacifica*, the "Pikachu nudibranch" | *Thecacera pikachu* | Pola et al. 2026 | seaslug.world **[read]**; Wikipedia still on *T. pacifica* | yes | confirmed |
| *Tenellia* sp. 20 (2018 guide) | *Tenellia nakapila* | Kim, Donohoo & Gosliner 2024, *PeerJ* 12: e18517 | 8 of the 9 observations described "*Tenellia* sp. 20" are *T. nakapila* **[measured]** | yes (27) | confirmed, 53 RG |
| *Phyllidia* sp. 10 (2018 guide; sp. 9 in 2015) | *Phyllidia ovata* | Wägele et al. 2025, *ZooKeys* 1245 | the paper's synonymy **[read]** | no | **no observation** (9 worldwide) |
| some *P. picta* / *P. coelestis* photos | *Phyllidia ovata* | Wägele et al. 2025 | the paper **[read]** | no | as above |
| *Goniobranchus* sp. 43 (2018 guide) | *Chromodoris kalawakan* | Bonomo & Gosliner 2020, *Zootaxa* 4819(3) | Plazi treatment **[read]** | yes (16) | confirmed, 40 RG |
| *Chromodoris* sp. 11 (2018 guide) | *Chromodoris quagga* | Bonomo & Gosliner 2020 | Plazi treatment **[read]** | no | 6 RG, 2 observers: not confirmed |
| *Chromodoris* sp. 12 (2018 guide) | *Chromodoris balat* | Bonomo & Gosliner 2020 | Plazi treatment **[read]** | yes (3) | confirmed, 7 RG |
| *Glossodoris* sp. 1 (2008) / *Doriprismatica* sp. 1 (2015) | *Doriprismatica balut* | Matsuda & Gosliner 2018, *Zootaxa* 4444(5) | Plazi treatment **[read]** | yes (13) | confirmed, 38 RG |
| *Nembrotha* sp. 5 (2018 guide) | *Nembrotha lorosae* | Pola et al. 2026 | seaslug.world's references **[read]** | yes (3) | confirmed, 3 RG |
| some *N. aurea* / *N. purpureolineata* records | *Nembrotha lorosae* | Pola et al. 2026 | seaslug.world **[read]** | yes | as above |

Also: *Chromodoris alcalai* (Gosliner 2021) was confused with *C. dianae* (§4.3; no guide number found); *Hypselodoris
variobranchia* (2018) was *Hypselodoris* sp. 6 of the 2008 guide **[search, undescribed study §3.2]**.

### 3.3 Already in our list (59) [measured]

By paper (observers in the Philippines in brackets): Epstein et al. 2018 (*Hypselodoris*): *H. variobranchia* (76), *H.
roo* (51), *H. paradisa* (28), *H. skyleri* (20), *H. katherinae* (15), *H. violacea* (15), *H. iba* (12), *H. lacuna*
(11), *H. confetti* (4), *H. perii* (3); Gosliner 2021: *Chromodoris alcalai* (66); Ekimova et al. 2022: *Coryphellina
flamma* (57); Matsuda & Gosliner 2018: *Glossodoris acosti* (50), *G. buko* (46), *Doriprismatica balut* (13); Fernández-
Simón & Moles 2023 (Cunha et al. 2023): *Longibranchus putnami* (37), *Costasiella fridae* (10), *Sakuraeolis marhe* (5);
Kim, Donohoo & Gosliner 2024: *Tenellia bughaw* (31), *T. nakapila* (27), *T. puti* (20), *Abronica payaso* (10); Pola et
al. 2026: *Thecacera pikachu* (31), *Nembrotha lorosae* (3); Moreno et al. 2025 (*Cyerce*): *C. blackburnae* (27), *C.
katiae* (25), *C. basi* (11), *C. goodheartae* (3); Pola, Hallas & Gosliner 2019 (*Janolus*): *J. flavoanulatus* (26),
*J. tricellariodes* (9), *J. incrustans* (8); Paz-Sedano et al. 2022 (*Murphydoris*): *M. adusta* (22), *M. cobbi* (13),
*M. maracabranchia* (7), *M. puncticulata* (5); Soong & Gosliner 2022: *Goniobranchus fabulus* (18); Bonomo & Gosliner
2020: *Chromodoris kalawakan* (16), *C. balat* (3); Paz-Sedano et al. 2023 (*Pelagella*): *P. longicornis* (15), *P.
albopunctata* (6); Smirnoff, Donohoo & Gosliner 2022 (*Trapania*): *T. lemnalioides* (14), *T. kahel* (7), *T.
tamaraw* (5), *T. kamagong* (4); Oskars & Malaquias 2020: *Lamprohaminoea evelinae* (12), *L. mikkelsenae* (4); Paz-Sedano
et al. 2023 / 2024: *Goniodoridella geminae* (10), *Naisdoris vitiligata* (10); De Souza-Canal & Valdés 2025:
*Gymnodoris feyae* (9); Medrano et al. 2018: *Polybranchia jannae* (9); Austin, Gosliner & Malaquias 2018:
*Phanerophthalmus anettae* (7); Krug, Berriman & Valdés 2018: *Oxynoe kylei* (6), *O. jordani* (5); Donohoo & Gosliner
2020: *Hoplodoris rosans* (5); Tibiriçá et al. 2018 / 2023: *Halgerda indotessellata* (4), *Hexabranchus giganteus* (4);
Mehrotra et al. 2020: *Elysia aowthai* (4); Carmona et al. 2026: *Novaeolidiella janae* (4); Korshunova et al. 2019:
*Unidentia aliciae* (4). Each species' full citation is in `tools/seaslug_lit.json` (`look.inList`, `description`).

### 3.4 Observed in the Philippines, not confirmed (27) [measured]

The closest to rule C8 first (RG = Research Grade observations, "all" = verifiable, observers asked when RG ≥ 3):

| Species | Paper | RG | All | Observers |
|---|---|---|---|---|
| *Chromodoris quagga* | Bonomo & Gosliner 2020, *Zootaxa* 4819(3) | 6 | 6 | 2 |
| *Trapania tigger* | Smirnoff, Donohoo & Gosliner 2022 | 3 | 3 | 2 |
| *Sacoproteus nishae* | Krug et al. 2018, *Zoologica Scripta* 47(6) | 4 | 7 | 1 |
| *Halgerda scripta* | Donohoo et al. 2023, *Marine Biodiversity* 53(3) | 3 | 3 | 1 |
| *Coryphellina pannae* | Ekimova et al. 2022, *Diversity* 14(4) | 2 | 2 | - |
| *Halgerda mango* | Donohoo et al. 2023 | 2 | 2 | - |
| *Hypselodoris rositoi* | Epstein et al. 2018 | 2 | 2 | - |
| *Naisdoris aurornata* | Paz-Sedano et al. 2024, *Zootaxa* 5443(4) | 2 | 2 | - |
| *Phanerophthalmus albotriangulatus* | Austin, Gosliner & Malaquias 2018, *Invertebrate Systematics* 32(6) | 2 | 2 | - |
| *Polybranchia jensenae* | Medrano et al. 2018, *Zool. J. Linn. Soc.* 186(1) | 2 | 2 | - |
| *Trapania stegodon* | Smirnoff et al. 2022 | 2 | 2 | - |
| *Coryphellina pseudolotos* | Ekimova et al. 2022 | 1 | 6 | - |
| 15 more with 1 or 0 RG | *Goniodoridella unidonta*, *Trapania tatsulok*, *T. undulata*, *Avaldesia tamatoa*, *Halgerda mesophotica*, *H. profunda*, *H. takipsilim*, *Jorunna daoulasi*, *Pelagella balanoyensis*, *Phanerophthalmus batangas*, *P. purpura*, *Plakobranchus noctisstellatus*, *Sclerodoris faninozi*, *Coryphellina aurora*, *C. iurmanovi* | ≤ 1 | 1-3 | - |

*Sacoproteus nishae* is also named on public pages we read (`tools/seaslugs.json` `unconfirmedMentioned`).

### 3.5 The Appendix A labels: still without a name [measured]

- **WoRMS**: the 19 genera of the 31 labels hold 43 species described since 2018; the only ones observed in the
  Philippines are *Tenellia bughaw*, *T. nakapila*, *T. puti*, *Goniobranchus fabulus* and *Elysia aowthai*: all already
  in our list, and none tied to an Appendix A label (*T. nakapila* is the guide's sp. 20, not sp. 6 or sp. 18). The others are from elsewhere (the
  Mediterranean, the Red Sea, California, Cape Verde, Europe …).
- **iNaturalist**: the observations whose description holds each label (37 labels asked, the 31 and six named ones):
  for the 31, **none is identified at species level** except one "*Verconia* sp. 5" now *Verconia laboutei* (one
  observation, an old name, not a new one). For the named ones: "*Thecacera* sp. 8" 8 of 8 *T. pikachu*; "*Tenellia* sp.
  20" 8 of 9 *T. nakapila*; "*Goniobranchus* sp. 43" 1 of 1 *C. kalawakan* (abroad).
- **Goniobranchus sp. 5** (Q389's species): no description found; the red-reticulate group holds "at least eleven
  distinct species" (Bonomo et al. 2022, an abstract) and none is named (§4.4). It stays recorded by its observation field
  until a paper names it.
- So the way in Pierre chose (a published name) has, today, **nothing new to bring in among the frequent labels**; the
  tool's `unnamed` list shrinks as `named` entries are added, and its `watch` list shows a new name once observed.

## 4. Molecular revisions of species already in our list

Each row: the paper (rule C2), what it found **[read]** unless marked, and what it changes for our list, our look-alikes
and our photos. "Observers" are distinct Research Grade observers in the Philippines, from `tools/seaslugs.json`
(2026-11-15). The game's units are genera today (Pierre, 2026-11-16), so none of these changes what players meet now: they
matter for the species sheets, the genus units' photos and the later species level.

### 4.1 Thecacera: the "Pikachu" is a species of its own (2026)

- **Pola, Paz-Sedano, Martín, Warren, Noble & Martín-Hervás (2026)**, "The most wanted! Gorgeous, delicate and
  surprising: description of three new polycerid species (Mollusca, Heterobranchia) from East Timor", *Zootaxa* 5793(1):
  193-217, doi:10.11646/zootaxa.5793.1.9 (abstract read): *Thecacera melkyi*, ***Thecacera pikachu*** and *Nembrotha
  lorosae* sp. nov., "three of these well-photographed species".
- **seaslug.world**, *T. pikachu* page: "internationally this species was the one known by the Pikachu nickname"; in
  Japan the nickname went to *Thecacera* cf. *darwini*; its references cite "*Thecacera* sp.8" of the 2018 guide. Its
  cue: "*T. pikachu* has black spots all over the body, and its tips are plain black"; "*T. pacifica* has no spots on the
  body, and its tips are blue-white with a black band below".
- **iNaturalist [measured]**: the 8 observations whose description says "*Thecacera* sp. 8" (all in the Philippines) are
  all identified *T. pikachu* now.
- **English Wikipedia** (read 2026-11-17): "Pikachu nudibranch" still redirects to *Thecacera pacifica*, "sometimes also
  nicknamed the Pikachu nudibranch".
- **For our list.** Both species are in it: *T. pikachu* (31 observers, circle 3) and *T. pacifica* (14 observers,
  **circle 1**). *T. pacifica* is a star partly because the build counts the "pikachu" mentions for it, through the
  Wikipedia redirect (`tools/seaslug_source.json` nicknames; `tools/seaslugs.json` `nicknames`). The 2026 paper and
  seaslug.world give the nickname to *T. pikachu*: a discrepancy between sources (rule C5, §5.3) and a question for
  Pierre (§6), since moving the nickname moves a star. Answered in §6: the nickname is shared.
- **Look-alikes.** *T. pacifica* / *T. pikachu* is a sourced pair (the cue above), both confirmed in the Philippines.
- **Photos.** A *T. pacifica* photo older than 2026 of a spotted animal may be *T. pikachu*: the judging can check the
  spots and the tips **[guess]**.

### 4.2 Phyllidiidae: *Phyllidia ovata* among the *P. picta* and *P. coelestis* photos (2025)

- **Wägele, Raubold, Papu, Undap & Yonow (2025)**, "On two new *Phyllidia* species (Gastropoda, Nudibranchia, Doridina)
  and some histology from the Coral Triangle", *ZooKeys* 1245: 1-18, doi:10.3897/zookeys.1245.153046 (the article's XML
  read): ***Phyllidia ovata*** and *P. fontjei* sp. nov. For *P. ovata*: "sp. 10: Gosliner et al. 2018: 217 (same
  individual in Gosliner et al. 2015 as *Phyllidia* sp. 9)"; "several images were located in files of *P. picta*
  Pruvot-Fol, 1957 and *P. coelestis* in both iNaturalist and NudiPixel"; its range is "a narrow band in the Western
  Pacific from Japan south to Taiwan, Indonesia, and the Philippines", the Philippine record a Dauin photo on Nudi Pixel.
  Its diagnosis: a white mantle "rarely with a tinge of blue", a black area on the central notum, "Large white conical
  tubercles have yellow apices", yellow rhinophores, a black line on the foot sole. *P. fontjei* is not recorded from the
  Philippines.
- **Papu, Bogdanov, Bara, Kehraus, König, Yonow & Wägele (2022)**, "Phyllidiidae (Nudibranchia, Heterobranchia,
  Gastropoda): an integrative taxonomic approach including chemical analyses", *Organisms Diversity & Evolution* 22:
  585-629, doi:10.1007/s13127-021-00535-7 (the publisher's page redirected to a login and was not read; its Plazi
  treatments read): *Phyllidiella pustulosa* is still a "species complex" problem to solve; the nominal name goes to one
  clade of 74 specimens; *Phyllidiella albonigra* resurrected; *Phyllidiopsis pipeki* a synonym of *P. krempfi*
  **[search: abstract]**. WoRMS cites it on 13 of our Phyllidiidae, as the status source for most
  (`tools/seaslug_lit.json` `revised`).
- **For our list.** *P. picta* (96 observers) and *P. coelestis* (154) are both in circle 1; *P. ovata*'s presence:
  §3. *Phyllidiella pustulosa* (61 observers) is a complex with no photo cue for its true form (the lectotype is "completely
  white"): its species-level photos are uncertain **[guess, from the treatment]**. *Phyllidiella albonigra* (3) and
  *Phyllidiopsis krempfi* (59) are already under their current names.
- **Look-alikes.** *P. ovata* / *P. picta* / *P. coelestis*: a sourced set (the diagnosis above: white against yellow-orange
  or blue ground, one oval black area against ridges), not usable until *P. ovata* is confirmed in the Philippines
  (rule C6, §5.4).
- **Photos.** *P. picta* and *P. coelestis* candidates showing a white animal with a single oval black area are
  *P. ovata* by the paper's diagnosis **[guess]**: a check for the judging.

### 4.3 *Chromodoris*: colour patterns unreliable, four new species, one pair named apart

- **Layton, Gosliner & Wilson (2018)**, *Mol. Phylogenet. Evol.* 124: 27-36, doi:10.1016/j.ympev.2018.02.008: "Only
  five of 39 taxa" with stable colour patterns; *C. colemani* and *C. joshi* mimic "locally abundant congenerics" (read
  for the [mode study](2026-11-15-nudibranch-mode-study.md) §6.3). WoRMS cites it as the status source of *C. dianae*.
- **Bonomo & Gosliner (2020)**, "Adding stars to the *Chromodoris* (Nudibranchia, Chromodorididae) galaxy with the
  description of four new species", *Zootaxa* 4819(3): 401-435, doi:10.11646/zootaxa.4819.3.1 (abstract and Plazi
  treatments read): "44 species level lineages"; *C. balat*, *C. baqe* (Red Sea), *C. kalawakan*, *C. quagga*. Their
  synonymies:
  - ***C. kalawakan***: "*Chromodoris* sp. 23 — Gosliner et al. 2008: 229", "*Goniobranchus* sp. 40 — Gosliner et al
    2015: 230", "*Goniobranchus* sp. 43 — Gosliner et al 2018: 160"; Romblon specimens; "the only *Chromodoris* species
    entirely devoid of black lines or dark brown to black spots" (summary of the treatment);
  - ***C. quagga***: "sp. 11 — Gosliner et al. 2018: 139"; "*Chromodoris burni* — Gosliner et al. 2015: 212 …
    misidentification"; holotype from Tingloy, Batangas;
  - ***C. balat***: "sp. 12 — Gosliner et al. 2018: 140"; "*Chromodoris striatella* — Gosliner et al. 2008: 225 …
    misidentification"; "only known from Matotonngil Point in the Philippines" (Mabini, Batangas).
- **Gosliner (2021)**, "Sleuthing cryptic chromodorids (Mollusca, Nudibranchia): adding to Philippine marine
  biodiversity", *Philippine Journal of Systematic Biology* 14(2), doi:10.26757/pjsb2020b14014 (WoRMS record; the
  paper not read: its DOI answered 503 on 2026-11-15): ***Chromodoris alcalai***. seaslug.world: "Morphologically very
  similar to *Chromodoris dianae*, with which it had been confused prior to formal description"; "separated by
  molecular evidence, external morphology, colour pattern, and internal anatomy" **[read]**.
- **Tibiriçá, Pola, Ortigosa & Cervera (2020)**, the East African "*Chromodoris quadricolor* group", *J. Zool. Syst.
  Evol. Res.* 58(1): 230-261, doi:10.1111/jzs.12334: WoRMS's basis of record for *C. lochi* (not read; East Africa,
  rule C6 keeps it out of our cues).
- **For our list.** *C. alcalai* (66 observers, circle 2), *C. kalawakan* (16) and *C. balat* (3) are in it; *C. quagga*:
  §3. **Before 2021 every *C. alcalai* was photographed and identified as *C. dianae*** (52 observers): a *C. dianae*
  photo from before the description may be *C. alcalai* **[guess]**.
- **Look-alikes.** *C. alcalai* / *C. dianae* is a sourced pair (seaslug.world, on the paper). The Appendix A label
  "*Chromodoris* cf. *striatella*" (3 observations) may be *C. balat*, which the 2008 guide figured as *C. striatella*
  **[guess]**.

### 4.4 *Goniobranchus*: the red-reticulate complex still unnamed; the white banded group revised

- **Soong, Wilson & Reimer (2020)**, *Marine Biodiversity* 50: 25: five species-level clades in the red-reticulate
  *Goniobranchus*, "none … matched exactly with the original descriptions of *G. tinctorius* or *G. reticulatus*"
  **[search, as in the undescribed study]**. Its "sp. 5" is the one Pierre took in (Q389).
- **Bonomo, Soong, Reimer & Gosliner (2022)**, "50 Shades of Red: the red-reticulate group of *Goniobranchus*", a
  World Congress of Malacology abstract (*Spixiana* 30A: 156; NSF repository record read): "at least eleven distinct
  species within this species complex"; it names none.
- **No name yet for sp. 5.** No *Goniobranchus* of the red-reticulate group is described in WoRMS since 2018
  [measured: the tool's new species in *Goniobranchus*, §3], and no search found one (Appendix B). *Goniobranchus
  solitaryensis* (Nimbs & Smith, submitted to the *Australian Journal of Taxonomy* in 2026) is red-spotted, from New
  South Wales, the sister of *G. fidelis* **[search]**: not the Philippine sp. 5.
- **Soong, Bonomo, Reimer & Gosliner (2022)**, "Battle of the bands: systematics and phylogeny of the white
  *Goniobranchus* nudibranchs with marginal bands", *ZooKeys* 1083: 169-210, doi:10.3897/zookeys.1083.72939: *G.
  albonares*, *G. preciosus*, *G. rubrocornutus*, *G. sinensis*, *G. verrieri* and ***G. fabulus*** sp. nov.; the 2015 and
  2018 guides' *G. preciosus* photos were "misidentifications" **[search: the treatment's summary]**. WoRMS cites it as
  the basis of record of four of ours.
- **For our list.** *G. fabulus* (18 observers) is in; *G. verrieri* (57), *G. preciosus* (56), *G. albonares* (16) and
  *G. rubrocornutus* (10) are named as the paper delimits them. The white banded *Goniobranchus* photos identified before
  2022 are the least sure of the genus **[guess]**.

### 4.5 *Hypselodoris*: 17 new species in 2018

- **Epstein, Hallas, Johnson, Lopez & Gosliner (2019; online 2018)**, "Reading between the lines: revealing cryptic
  species diversity and colour patterns in *Hypselodoris* nudibranchs", *Zool. J. Linn. Soc.* 186(1): 116-189,
  doi:10.1093/zoolinnean/zly048 (abstract read): "the distinctness of 17 new species of *Hypselodoris*"; colour pattern
  convergences put down to Müllerian mimicry. Philippine type localities for *H. perii*, *H. rositoi*, *H. skyleri*
  (Tingloy) and *H. violacea* (Palawan) **[search: Plazi treatments' summaries]**; *H. variobranchia* was *Hypselodoris*
  sp. 6 of the 2008 guide (undescribed study, §3.2).
- **For our list.** Ten of the 17 are in it already (§3.3), *H. variobranchia* (76 observers) the most observed; *H.
  rositoi* is seen in the Philippines, not confirmed (§3.4). Nothing to rename. Photos of the blue-and-purple *Hypselodoris* identified before 2018 are uncertain
  **[guess]**.

### 4.6 *Hexabranchus*: five species (2023)

- **Tibiriçá, Pola, Pittman, Gosliner, Malaquias & Cervera (2023)**, "A Spanish dancer? No! A troupe of dancers",
  *Organisms Diversity & Evolution* 23: 697-742, doi:10.1007/s13127-023-00611-0: *H. sanguineus* "is a complex of five
  species: four previously described and an undescribed species … *Hexabranchus giganteus* sp. nov." **[search: its
  abstract]**; Plazi treatments read for the [sources note](2026-11-15-seaslug-sources.md) §1.5.
- **For our list.** Already followed: *H. lacer* (64 observers), *H. sanguineus* (18) and *H. giganteus* (4) are in it,
  the *H. sanguineus* / *H. lacer* pair decided (Q377). Nothing new.

### 4.7 *Pteraeolidia*: the "blue dragon" is a complex, still one name

- **Wilson & Burghardt (2015)**, *Zool. J. Linn. Soc.* 175(1): 119-133: *P. semperi* reinstated beside *P. ianthina*
  (mode study §2.3).
- **Soon, Quek, Pohl & Wainwright (2023)**, *J. Molluscan Stud.* 89: eyad011, doi:10.1093/mollus/eyad011 (Singapore)
  **[search: Wikipedia's citation]**.
- **Meshik, Antokhina, Deart, Chichvarkhina & Ekimova (2026)**, "Dragons guard secrets: integrative systematics of
  *Pteraeolidia semperi* species complex …", *ZooKeys* 1293: 347-376, doi:10.3897/zookeys.1293.195366 (the article's
  XML read): two sympatric clades in Vietnam, "at least two species within a broader and highly diverse species
  complex"; species delimitation gives "about six and 20 units"; "it is not possible to reliably estimate the number of
  species"; no new name; the clades differ mainly in colour, which depends on light and symbionts; no Philippine
  specimen.
- **For our list.** *P. semperi* (162 observers, circle 1) stays as it is: no name to add. Its photos are of a complex
  (rule C5 point, §5.3), the colour of a photo not a reliable cue between its lineages.

### 4.8 *Nembrotha*: *N. lorosae* (2026)

- **Pola et al. (2026)**, as §4.1: ***N. lorosae*** sp. nov. (East Timor), and "a new color morphotype of *Nembrotha
  purpureolineata*". seaslug.world: it "has long been confused with *N. purpureolineata* (Australia), *N. aurea*
  (western Indian Ocean), and *N. megalocera* (Red Sea)"; "Many records previously attributed to *Nembrotha
  purpureolineata* or *N. aurea* are referable to this species"; its references cite "*Nembrotha* sp.5" of the 2018 guide;
  "*N. purpureolineata* lacks any trace of orange coloration" **[read]**.
- **For our list.** *N. lorosae* is in it (3 observers, circle 4). *N. purpureolineata* is named on public pages we read
  but not confirmed (`tools/seaslugs.json` `unconfirmedMentioned`, 2 pages): such a mention may be *N. lorosae*
  **[guess]**.

### 4.9 *Thuridilla*: a gracilis complex of 13 species

- **Martín-Hervás, Carmona, Malaquias, Krug, Gosliner & Cervera (2021)**, *Cladistics* 37(6): 647-676,
  doi:10.1111/cla.12465: 35 species supported, 13 of them a *T. gracilis* species complex with *T. gracilis*, *T.
  splendens*, *T. bayeri*, *T. ratna* "plus nine undescribed species" **[search: abstract summaries]**; its "*Thuridilla*
  sp. 6" is an Appendix A label (4 observers).
- **Martín-Hervás, Carmona, Krug, Gosliner, Cervera & Malaquias (2025)**, *J. Biogeogr.* e15171, doi:10.1111/jbi.15171:
  cited by WoRMS on 8 of ours (not read).
- **For our list.** *T. gracilis* (31), *T. bayeri* (3) and *T. ratna* (4) are in it; their species-level photos sit in a
  complex of mostly unnamed species: the least sure of the genus **[guess]**. No name to add.

### 4.10 Flabellinidae (*Coryphellina*, *Samla*): a global revision (2026)

- **Ekimova et al. (2022)**, "Stripes Matter: Integrative Systematics of *Coryphellina rubrolineata* Species Complex
  (Gastropoda: Nudibranchia) from Vietnam", *Diversity* 14(4): 294, doi:10.3390/d14040294 (WoRMS record): ***C. flamma***
  and the other new species of the complex.
- **Ekimova, Carmona, Mikhlina, Grishina, Stanovova, Schepetov, Hoover, De Souza-Canal, Kuznetsov & Valdés (2026)**,
  "Neither 'lumpers' nor 'splitters': A global revision of Flabellinidae s.l. nudibranchs", *PLOS One* 21(5): e0347759,
  doi:10.1371/journal.pone.0347759 (read in part): "the *Coryphellina exoptata* species complex, represented by two
  species"; "the *Coryphellina rubrolineata* species complex is represented by at least nine species"; *Samla bicolor*
  specimens "split into five monophyletic groups"; *Samla rubropurpurata* moved to *Launsina* gen. nov. WoRMS cites it as
  the status source of 10 of ours.
- **For our list.** *C. exoptata* (92 observers, circle 1) is one name over two species; *C. flamma* (57), *C. lotos*
  (22) and *C. delicata* (11) are the rubrolineata complex's named members in it; *Samla bicolor* (49) is a complex of
  five groups. No rename; photos of *S. bicolor* and of *C. exoptata* are each of a complex (§5.3).

### 4.11 *Tenellia*, *Phestilla*, *Trinchesia*: new species and moving genera

- **Kim, Donohoo & Gosliner (2024)**, "Stirring up the muck: the systematics of soft-sediment Fionidae (Nudibranchia:
  Aeolidina) from the tropical Indo-Pacific", *PeerJ* 12: e18517, doi:10.7717/peerj.18517 (WoRMS records; the article
  answered 403 and was not fetched another way): ***Tenellia nakapila***, ***T. bughaw***, ***T. puti*** and *Abronica
  payaso*, among others; "approximately 105 of the 120 fionid species" undescribed **[search, undescribed study]**.
  *T. nakapila* = "*Tenellia* sp. 20" of the 2018 guide [measured: 8 of the 9 observations whose description says
  "*Tenellia* sp. 20" are identified *T. nakapila*].
- **Korshunova, Fletcher & Martynov (2025)**, "The endless forms are the most differentiated …", *Zool. J. Linn. Soc.*
  204(4): zlaf057, doi:10.1093/zoolinnean/zlaf057: WoRMS's status source for *Phestilla sibogae*, *P. melanobrachia*, *P.
  lugubris*, *Produnga rubropunctata* and *Annulorhina mandapamensis*; a Plazi treatment of it lists "'*Trinchesia*'
  *nakapila* (Kim and Gosliner, 2024) comb. nov." **[search: the treatment's summary]**.
- **For our list.** *T. nakapila* (27), *T. bughaw* (30), *T. puti* (20) are in it. WoRMS's status for them today: §3
  and `tools/seaslug_lit.json` (`rename`). iNaturalist's *Tenellia viei* and *T. goniophaga* are *Phestilla* in WoRMS
  ("alternative representation", the mode study's point): the genus allocation of the trinchesiids moves with each paper,
  a nomenclature point (§5.3).

### 4.12 Smaller revisions, for the record

| Genus | Paper (WoRMS record unless marked) | What it says | Ours in it |
|---|---|---|---|
| *Glossodoris* | Matsuda & Gosliner (2018), *Zootaxa* 4444(5): 501-529, doi:10.11646/zootaxa.4444.5.1 | The *G. cincta* complex split: *G. acosti*, *G. buko*, *G. bonwanga*, *G. andersonae*, a "*Glossodoris* sp. cf. *cincta*" left unnamed **[search]**; three *Doriprismatica* (*D. balut* = *Glossodoris* sp. 1 of 2008, *Doriprismatica* sp. 1 of 2015) | *G. acosti* (50), *G. buko* (46), *D. balut* (13); the Appendix A label "*Glossodoris* cf. *cincta*" (3+2) is that unnamed lineage or one of them **[guess]** |
| *Costasiella* | Jensen et al. (2014), *J. Molluscan Stud.* **[search]**; Cunha, Fernández-Simón, Petrula, Giribet & Moles (2023), *Diversity* 15(2): 219, doi:10.3390/d15020219 | *C. kuroshimae* "numerous distinct species that currently await description" (2014); ***C. fridae*** described from the Maldives (2023) | *C. kuroshimae* (53, circle 1, the "leaf sheep"), *C. usagi* (62), *C. fridae* (10): the leaf-sheep photos are of a complex |
| *Plakobranchus* | Meyers-Muñoz et al. (2016); Mehrotra et al. (2020), *ZooKeys* **[search]** | *P. ocellatus* was 10 candidate species; *P. papua* named 2016; a "*Plakobranchus* sp. 6: Gosliner et al. 2018: 434 (Philippines)" still unnamed **[search]** | *P. ocellatus* (30), *P. papua* (39) |
| *Jorunna* | Tibiriçá, Strömvoll & Cervera (2023), *J. liviae* **[search]**; Innabi, Stout & Valdés (2023), *ZooKeys* 1152, *J. daoulasi* | "*J. funebris* were retrieved as a species complex in all possible partitions" **[search]** | *J. funebris* (153, circle 1) |
| *Gymnodoris* | De Souza-Canal & Valdés (2025), *Zootaxa* 5710(1): 1-73; De Souza-Canal, Nakano & Valdés (2025), *Zoosystema* 47(17) | 11 new species in New Caledonia; "*Gymnodoris nigricolor* … is a species complex" (title) | *G. feyae* (9) is one of the 11; WoRMS cites the 2025 papers on 4 more of ours, *G. nigricolor* (3) among them |
| *Cyerce* | Moreno, Medrano, Gosliner, Wilson, Krug & Valdés (2025), *Zool. J. Linn. Soc.* 204: zlaf030 | nine new species | *C. blackburnae* (27), *C. katiae* (25), *C. basi* (11), *C. goodheartae* (3) are among them |
| Goniodorididae | Paz-Sedano, Moles, Smirnoff, Gosliner & Pola (2024), *Mol. Phylogenet. Evol.* 107990; Paz-Sedano et al. (2023), *Pelagella* resurrected | new combinations (*Ceratodoris*, *Naisdoris*, *Bermudella*, *Pelagella*) | already under the new names |
| *Halgerda* | Tibiriçá, Pola & Cervera (2018), *Invertebrate Systematics* 32: 1388-1421, doi:10.1071/is17095; Donohoo, Villalobos, Hallas & Gosliner (2023), "Hyperdiversity of the genus *Halgerda* …", *Marine Biodiversity* 53(3): 42, doi:10.1007/s12526-022-01334-9 | six new species (Mozambique); fourteen new species (2023) | *H. indotessellata* in it; five of the 2023 species seen in the Philippines, none confirmed (§3) |
| *Trapania* | Smirnoff, Donohoo & Gosliner (2022), "Extra-branchial processes manifest extra diversity …", *Zool. J. Linn. Soc.* 196(1): 270-313, doi:10.1093/zoolinnean/zlac009; their nomenclature revision (2022); Lam & Valdés (2026), New Caledonia | nine new species | *T. kahel*, *T. kamagong*, *T. tamaraw*, *T. lemnalioides* in it; four more seen, not confirmed (§3) |

## 5. Proposed changes, for the integrator (a follow-up PR; none applied here)

### 5.1 Additions to the species list

- **None today**: no species described since 2018 passes rule C8 without already being in `tools/seaslugs.json`
  (`look.add` is empty) **[measured]**.
- **Next in line** (`look.watch`): *Chromodoris quagga* (6 RG, 2 observers) and *Trapania tigger* (3 RG, 2 observers)
  each need one more observer; *Sacoproteus nishae* (4 RG, 1 observer) two more. `tools/build_seaslugs.py` takes them in
  on its next pull once they pass; `tools/seaslug_lit.py` then lists them under `inList`.
- *Phyllidia ovata* is not addable: no Philippine observation at species level on iNaturalist **[measured]**; the
  paper's Dauin record is a Nudi Pixel photo, which rule C8 does not count.

### 5.2 Renames

- **None.** WoRMS accepts 450 of our 452 names as written; the 2 others (*Tenellia viei*, *T. goniophaga*, *Phestilla*
  in WoRMS) are iNaturalist's names, kept by rule (the subject shows iNaturalist's name with WoRMS beside it, mode study
  §2.3) and a point below.

### 5.3 Points for `points.json` (rule C5: listed, not settled)

Proposed entries, `subj: "seaslug"`, neutral wording; each with its sources as above:

| id (proposed) | kind | Title | The discrepancy | Sources |
|---|---|---|---|---|
| `seaslug-pikachu` | sources | Which species is the "Pikachu nudibranch"? | English Wikipedia redirects "Pikachu nudibranch" to *Thecacera pacifica*; Pola et al. 2026 named *T. pikachu*, and seaslug.world says "internationally this species was the one known by the Pikachu nickname" | §4.1 |
| `seaslug-tenellia-genera` | names | *Tenellia* or *Phestilla* / *Trinchesia*? | iNaturalist's *Tenellia viei* and *T. goniophaga* are *Phestilla* in WoRMS ("alternative representation"); Korshunova, Fletcher & Martynov 2025 recombine *T. nakapila* as "'*Trinchesia*' *nakapila*", which WoRMS still lists as *Tenellia nakapila* | §4.11 |
| `seaslug-ovata-in-picta` | content | *Phyllidia ovata* among the *P. picta* and *P. coelestis* photos? | Wägele et al. 2025 found *P. ovata* photos "in files of *P. picta* … and *P. coelestis* in both iNaturalist and NudiPixel"; our list holds the two, not *P. ovata* | §4.2 |
| `seaslug-alcalai-dianae` | content | *Chromodoris dianae* photos from before 2021 | *C. alcalai* "had been confused" with *C. dianae* before its 2021 description (seaslug.world, on Gosliner 2021) | §4.3 |
| `seaslug-complexes` | names | One name, several species | Papers show these names of ours to cover several species, none of them named yet: *Pteraeolidia semperi* (Meshik et al. 2026), *Coryphellina exoptata* and *Samla bicolor* (Ekimova et al. 2026), *Phyllidiella pustulosa* (Papu et al. 2022), *Thuridilla gracilis* (Martín-Hervás et al. 2021), *Costasiella kuroshimae* (Jensen et al. 2014), *Jorunna funebris* (Tibiriçá et al. 2023), *Plakobranchus ocellatus* (Meyers-Muñoz et al. 2016) | §4.2, §4.7, §4.9, §4.10, §4.12 |

### 5.4 Look-alike pairs with a source (for the look-alike survey, rule C2 and C6)

The [look-alike survey](2026-11-17-seaslug-lookalikes-survey.md) (#1029) found *C. alcalai* / *C. dianae* "the
strongest pair of the genus, and no source names it" (iNaturalist's similar species: 12 confusions in the Philippines,
57 worldwide), and *T. pacifica* / *T. pikachu* in its data only (27 worldwide). This scan gives each a written source,
both through seaslug.world's species pages, which restate the papers (the papers' full texts not read). Both species of
each pair are confirmed in the Philippines (rule C8), so each can serve as a cue's doubt:
- *Thecacera pacifica* / *T. pikachu*: spots on the body and plain black tips against no spots and blue-white tips with a
  black band (seaslug.world, after Pola et al. 2026).
- *Chromodoris alcalai* / *C. dianae*: confused until 2021; "separated by molecular evidence, external morphology,
  colour pattern, and internal anatomy" (seaslug.world, after Gosliner 2021); the cue itself is in the paper (not read).
- *Phyllidia ovata* / *P. picta* / *P. coelestis* (Wägele et al. 2025's diagnosis) **cannot be used yet**: *P. ovata* is
  not confirmed in the Philippines, and rule C6 keeps a species from elsewhere out of our cues.

### 5.5 For the photo judging (sea-slug candidates)

- *T. pacifica*: a spotted animal is *T. pikachu* by the cue above.
- *P. picta*, *P. coelestis*: a white animal with one oval black area and yellow-tipped tubercles is *P. ovata* by the
  paper's diagnosis.
- The complexes of §5.3: a species-level photo of them is a photo of the complex; at the genus level (today's units) it
  is sure.

## 6. Question for Pierre (answered, Q417)

**Le surnom « Pikachu ».** Depuis avril 2026, le « Pikachu » des plongeurs a son propre nom, *Thecacera pikachu* (Pola
et al. 2026 ; 31 observateurs aux Philippines, déjà dans notre liste). Wikipedia renvoie encore « Pikachu nudibranch »
vers *T. pacifica*, et c'est ce renvoi qui donne les mentions « pikachu » à *T. pacifica*, une des stars du cercle 1
(14 observateurs). **Je propose de compter le surnom pour *T. pikachu*** (*T. pacifica* peut alors sortir des stars ;
le genre *Thecacera* reste au cercle 1 grâce à *T. picta*) et de noter le désaccord dans les Points de l'admin.
D'accord ?

**Answer** (Pierre, already given on 2026-11-17: shared, several species; again on 2026-11-19, Q417, ANSWERS.md): at
06:50, "En pratique les plongeurs utilisent Pikachu pour plus qu'une seule espèce."; at 06:58, on *T. picta*: "ici c'est
celle que les plongeurs ont tendance à appeler Pikachu. Donc il faut au moins le mentionner, même si on indique que ce
n'est pas forcément approprié." So the proposal above is not taken as written: the nickname counts for *T. pikachu*
and *T. pacifica*, and *T. picta* is mentioned as the one local divers tend to call Pikachu, with a note that the name
is not necessarily appropriate for it.

Context for the integrator: the nicknames are counted by a rule decided with Pierre (Q377: a nickname counts for the
species its English Wikipedia redirect lands on); this would be an exception to it, so it waited for him (answered
above). Nothing in the
game changes now: the units are genera (Pierre, 2026-11-16).

## Appendix A. The tool's files and commands

- `tools/seaslug_lit.py`: `python3 tools/seaslug_lit.py` (refresh, cached), `--derive` (rewrite `look` from the committed
  `raw`, offline), `--check` (offline; run by `tests/seaslug-lit.test.js`).
- `tools/seaslug_lit_source.json`: `since` (2018), `ignoreSources` (one regional field guide that WoRMS cites on most
  of our species), `extraGenera` (3), `labels` (31), `named` (11).
- `tools/seaslug_lit.json`: `look` (the lists of §2) and `raw` (our species' WoRMS records and their 2018+ sources, the
  genera, the new species with their original description, iNaturalist's counts for the new and named names).

## Appendix B. Searches, pages and requests (2026-11-17, 06:53-07:15 Manila)

**Web searches** (31; public scientific names and general terms only):
1. Phyllidiella pustulosa species complex molecular cryptic species new species Papu 2022
2. Chromodoris new species described 2020 2021 2022 2023 molecular Indo-Pacific black-lined
3. Tenellia nakapila bughaw puti new species Philippines description
4. Goniobranchus reticulatus complex Soong Wilson Reimer 2020 "sp. 5" new species name described
5. Hypselodoris new species Epstein Gosliner 2018 2019 molecular phylogeny Philippines
6. Pteraeolidia ianthina semperi cryptic species Wilson Burghardt 2015 "Here be dragons" Philippines
7. Wägele 2025 ZooKeys Phyllidia ovata Phyllidia fontjei new species iNaturalist
8. "50 shades of red" Goniobranchus Bonomo Soong Reimer Gosliner 2022 species complex
9. Martín-Hervás 2021 Thuridilla molecular phylogeny new species "sp. 6" Indo-Pacific
10. Costasiella kuroshimae cryptic species complex molecular new species Costasiella 2020 2023
11. Aegires new species 2022 2023 2024 Indo-Pacific Gosliner undescribed "Aegires sp."
12. Goniobranchus new species red reticulate 2024 OR 2025 OR 2026 Zootaxa OR ZooKeys description tinctorius reticulatus
13. Glossodoris cincta species complex new species described molecular 2022 2023 2024
14. Plakobranchus ocellatus species complex cryptic species new species described 2020 2023 Philippines
15. Jorunna funebris cryptic species complex molecular new species Jorunna 2021 2022
16. Korshunova Fletcher Martynov 2025 Phestilla Tenellia revision Trinchesiidae new species Indo-Pacific
17. Tenellia bughaw Kim Gosliner sp. nov. PeerJ 2024 soft sediment Fionidae new species Tenellia nakapila
18. "Chromodoris kalawakan" OR "Chromodoris balat" OR "Chromodoris baqe" Plazi treatment Gosliner et al. 2018 "Chromodoris sp."
19. Nembrotha lorosae new species description Timor-Leste Nembrotha molecular phylogeny
20. Hexabranchus lacer sanguineus Tibiriçá 2023 Organisms Diversity Evolution Spanish dancer species complex Philippines
21. "Thecacera pikachu" new species 2026 pikachu nudibranch previously Thecacera pacifica OR "Thecacera sp."
22. "Goniobranchus sp. 42" OR "Goniobranchus sp. 32" Gosliner 2018 new species
23. "Stiliger sp. 1" OR "Thordisa sp. 11" OR "Aegires sp. 6" OR "Cratena sp. 2" nudibranch Gosliner 2018 named
24. "Ceratosoma sp. 1" OR "Marionia sp. 6" OR "Polycera sp. 3" OR "Verconia sp. 5" nudibranch
25. Goniobranchus new species 2026 nudibranch described
26. Thuridilla new species described 2022 2023 2024 2025 gracilis complex sacoglossa
27. "Phyllidiidae (Nudibranchia, Heterobranchia, Gastropoda): an integrative taxonomic approach including chemical analyses" abstract
28. Plazi "Tenellia nakapila" Kim Gosliner 2024 treatment
29. Pteraeolidia new species OR revision 2020 … 2025 "Pteraeolidia semperi" complex
30. Meshik 2026 ZooKeys 1293 Pteraeolidia semperi species complex Vietnam integrative systematics
31. "Chromodoris alcalai" Gosliner 2021 "Sleuthing cryptic chromodorids" Philippine Journal of Systematic Biology

**Pages read**:

| Page | Read |
|---|---|
| <https://www.mapress.com/zt/article/view/39300> (Bonomo & Gosliner 2020, abstract) | yes |
| <https://www.mapress.com/zt/article/view/57331> (Pola et al. 2026, abstract) | yes |
| <https://tb.plazi.org/GgServer/xhtml/03CFFA0FFFFAFF9699D0FF663C50AD38> (*C. kalawakan*), `…/03CFFA0FFFF7FF9B99D0FE473BEDABAF` (*C. quagga*), `…/03CFFA0FFFE3FF9199D0FF663881AD38` (*C. balat*) | yes (their `/html/` addresses: a redirect page only) |
| <https://tb.plazi.org/GgServer/xhtml/E60487942A01FFCDFCBEFC81685B522C> (*Phyllidiella pustulosa*, Papu et al. 2022) | yes |
| <https://publication.plazi.org/GgServer/html/0E8F6F238C245C27B1E0BAB94EC7F4ED> | a redirect page only |
| <https://zookeys.pensoft.net/article/153046/> (Wägele et al. 2025) | metadata only; its `/download/xml/` read |
| <https://zookeys.pensoft.net/article/195366/download/xml/> (Meshik et al. 2026) | yes (the first 100,000 characters) |
| <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0347759> (Ekimova et al. 2026) | yes (in two parts) |
| <https://academic.oup.com/zoolinnean/article/186/1/116/5126854> (Epstein et al., abstract) | yes |
| <https://par.nsf.gov/biblio/10349310> (Bonomo et al. 2022, abstract record) | yes |
| <https://en.seaslug.world/blog/phyllidia-ovata-fontjei-new-species-2025>, `/species/thecacera_pikachu`, `/species/nembrotha_lorosae`, `/species/chromodoris_alcalai` | yes |
| <https://leibniz-lib.de/en/news/28082025-snails.html> | yes |
| <https://en.wikipedia.org/wiki/Pikachu_nudibranch>, <https://en.wikipedia.org/wiki/Pteraeolidia> | yes |
| <https://nautil.us/check-out-this-new-colorful-sea-slug-the-size-of-a-sesame-seed-1281752> | yes (about *Thecacera sesama*, Taiwan, not ours) |
| <https://peerj.com/articles/18517/> (Kim et al. 2024) | no: HTTP 403 |
| <https://link.springer.com/article/10.1007/s13127-021-00535-7> (Papu et al. 2022) | no: redirected to a login, not followed |

**Sources cited from search summaries only** (not read): Soong, Wilson & Reimer 2020; the Plazi summaries of the
*Hypselodoris* treatments; Matsuda & Gosliner 2018's abstract; Mehrotra et al. 2020; Tibiriçá, Strömvoll & Cervera 2023;
Jensen et al. 2014; the Korshunova et al. 2025 Trinchesiidae treatment; Soon et al. 2023; Nimbs & Smith's submission
record (*G. solitaryensis*); the Martín-Hervás et al. 2021 abstract summaries.

**API endpoints**:
- WoRMS REST (944 requests): `AphiaRecordsByAphiaIDs`, `AphiaSourcesByAphiaID`, `AphiaRecordsByNames`,
  `AphiaChildrenByAphiaID`.
- iNaturalist v1, the tool (86): `observations/species_counts` (the five roots; Philippines Research Grade and
  verifiable, Research Grade within 40 km of Dauin), `observations/observers`.
- iNaturalist v1, scratch (39): `observations?q="<label>"&search_on=description&verifiable=true` for 37 labels; `taxa?q=`
  and `observations?taxon_name=` for *Phyllidia ovata*.
