# Sea slugs, step 1: the species list, the stars and circle 1 (2026-11-15)

This is the first step of the sea-slug subject, after the [nudibranch study](2026-11-15-nudibranch-mode-study.md) (§9,
steps 1 and 3 started) and Pierre's answers to its questions (Q369, 2026-11-15). **It changes no app code.** It adds:
- a reproducible tool, `tools/build_seaslugs.py`;
- its hand-kept inputs, `tools/seaslug_source.json`;
- its output, `tools/seaslugs.json`.

Labels (rule W11): **[measured]** = counted by the tool; **[read]** = taken from a page or a record; **[guess]** = my
judgement.

## Pierre's decisions this builds on (Q369, 2026-11-15)

- **(a)** One subject, "sea slugs". Its circles are ordered by popularity, not by group. Circle 1 holds the stars and the
  most common species, from any group, sacoglossans included. Less popular species go in later circles.
- **(b)** A zone per subject. Sea slugs are ranked over the whole Philippines; fish keep Dauin. Dauin still gives the
  "seen near Dauin" tag.
- **(c)** A "stars" set from English Wikipedia pageviews, with an achievement. It never sets the opening order, and
  Pierre can edit it. Pierre added: "Can't we also use blog articles or others for that?" So a second signal, mentions on
  public pages, is combined with Wikipedia.
- **(d)** Scientific names only. English names and diver nicknames are shown on the sheets as information.
- Later the same day, on photos: "We probably won't need as many photos per species as for the fish. I'll let you make
  proposals. There can still be variations with age." (§5)

## Pierre's answers to this note (Q377, 2026-11-15 16:08 Manila: "oui à tout")

He accepted the six recommendations of §6, now applied in `tools/seaslug_source.json` and `tools/seaslugs.json`:
1. **20 stars by the score, without** *Janolus savinkini*, *Thorunna florens* and *Dendrodoris guttata* (they rested on
   one long list). The next three scores replace them: *Phyllidia varicosa*, *Hypselodoris apolegma*, *Chromodoris
   magnifica*.
2. ***Hexabranchus lacer* added as a star**, beside *H. sanguineus*, and the pair recorded as look-alikes in the source
   (`lookalikes`), for the subject's build. **21 stars** in all.
3. **Later circles by commonness alone**: 60, then 100, then the rest.
4. **Circle 1 of 45.**
5. **The photo target**: start 6, game cap 12, 20 candidates, +5 for a documented juvenile form, 30 at most. To revisit
   after the first judging pass. Recorded in the source (`photos`) and copied into the output (`photoTarget`).
6. **`tools/seaslugs.json` stays the tool's output.** The subject's build will write the app's own file from it.

The sections below give the numbers as decided. §6 keeps the questions as they were asked.

**Follow-up, the same day** ([2026-11-15-seaslug-sources](2026-11-15-seaslug-sources.md)): the "Juvenile" annotations were
checked photo by photo (all 97 of circle 1 show the animal, none an egg mass, so the counts below stand); the egg
ribbons are under the "Egg" annotations and in *H. sanguineus*'s photo supply (§5.1); egg ribbons and egg masses are
excluded from the candidates (`photos.exclude`, Pierre, 2026-11-15); and the reference sources for facts and photos.

**Circle 2's candidate photos**, fetched later the same day with circle 1's tool and rules: §7. **Circle 3's**, the
same way, that evening: §8.

## 1. Method

### 1.1 The tool and its data file

- **`tools/build_seaslugs.py`** has two stages:
  - **fetch**: network to raw signals, every reply cached in `tools/.cache/seaslugs.json` (git-ignored), so a rerun is
    offline and gives the same file;
  - **derive**: offline and pure, from the signals to the stars score, the stars set and the circles. `--check` reruns
    it on the committed file (`tests/seaslugs.test.js` runs it in CI, which has no cache).
- **`tools/seaslug_source.json`** is hand-kept, and the tool never writes it. It holds:
  - the roots: the study's five groups;
  - the area: iNaturalist place 6873, the Philippines (Q369 b);
  - the pageviews window;
  - the nicknames;
  - the pages read;
  - the stars size and Pierre's edits (`stars.add`, `stars.remove`);
  - the circles sizes.
- **Why `tools/seaslugs.json` and not a root file.**
  - The root's JSON files (`fish.json`, `data.json`…) are what the app serves and caches.
  - This file is not read by the app yet: the subject itself is a later step (study §9, step 5).
  - Kept under `tools/`, it is a build input like `tools/fish_source.json`, and nothing a player downloads grows.
  - When the subject is built, its build writes the app's own file from this one.
- **No observer id** is written anywhere, as in the study: observer counts are aggregates only.

### 1.2 The species list (country-wide)

- **iNaturalist**, through `tools/inat.py` (rule C7: 1 s between requests, the project's User-Agent, paced retries):
  - every Research Grade observation of each group in the Philippines, paged by id, 200 a request;
  - the taxa and places they name, 30 and 100 a request;
  - worldwide Research Grade counts per species with a photo of each licence class, and with the "Life Stage: Juvenile"
    annotation (`species_counts`, 100 taxa a request).
- **WoRMS** (0.3 s between requests):
  - the accepted name, the AphiaID, the order and the family (`AphiaRecordsByMatchNames`, 50 names a request);
  - the English vernaculars and the species-rank synonyms of each confirmed species.
- **Presence** is rule C8, from `tools/presence.py` (`ph_confirmed`, `near_dauin`, the instance centre). No sea-slug
  checklist exists, so the two routes are 3 or more Research Grade observers in the Philippines, or 2 or more within
  40 km of Dauin.
- **"Seen near Dauin"** (`near`) is rule C8's near test, within the radius of `tools/instance.json`, measured from each
  observation's public coordinates.
- **Commonness** is the study's: distinct Research Grade observers in the Philippines, ties broken by half-degree cells,
  then by observations.
- **Caching.** The iNaturalist observation pages, the taxa, the places, the WoRMS vernaculars and the Wikipedia
  pageviews are the study's own requests. They were served from the study's cache of 2026-11-15, 09:00-10:00 Manila
  (`--seed`), so the counts are the study's. The rest was asked on 2026-11-15, 12:40-12:52 Manila. Each reply's pull
  date is in the tool's cache, and the file's `pulls` gives the dates.

### 1.3 Popularity signal (i): English Wikipedia pageviews

- **The study's method.** Views of the species' English article over 12 months (2025-11 to 2026-10, users only, redirects
  followed). Titles are resolved 50 a request, then one pageviews request per article.
- **Rate limits.** `wikimedia.org` and `en.wikipedia.org` answer HTTP 429 to this machine. The tool gives them their own
  client: 3 s and 2 s between requests, retries after 1, 2, 5 and 10 minutes. The 320 pageview replies came from the
  study's cache. Only the title and nickname lookups were asked again (13 requests, two of them retried after a 429).
- **What counts.** The raw views are kept as measured. The stars rule counts them only for:
  - the species' own article (`kind: own`);
  - or an article of its own under another name (`named`, e.g. "Spanish dancer" for *Hexabranchus sanguineus*).
  - A genus or family article reached through a redirect (`higher`), or one article for two species (`shared`), counts
    0.

### 1.4 Popularity signal (ii): mentions on public pages

- **Discovery.** Web searches, by hand (9 searches): top lists, dive blogs, magazines, underwater photography sites,
  photo-contest results. The pages are kept in the source's `pages`: the study's nine plus new ones.
- **Reading.** The tool reads each page itself:
  - read only, one page every 2 s or more, no form, no login, no social network;
  - the User-Agent: the tool now sends a generic one (`PAGE_UA`, naming no project and no person). The 37 reads of
    2026-11-15 sent the project's iNaturalist one, `coral-id-imr/1.0 (IMR Reef ID)` (no personal detail either);
  - a page that refuses (403, 503, a redirect to another site) is recorded as not readable, never fetched another way.
- **The page's date** comes only from a publication field (`article:published_time`, a meta or JSON-LD
  `datePublished`), never from a `<time>` element or a modified date: xray-mag.com's pages carry the front page's latest
  note time, not the article's. A page without such a field is undated ("—").
- **Scopes.**
  - `ph`: about Philippine dive sites;
  - `general`: a reef or nudibranch page not tied to one place (top lists, photo contests);
  - `out`: about a place outside the Philippines (Mauritius, Bali; Lembeh would be one). Listed, never counted.
- **Matching.** On the page's visible text plus its photo captions (`img alt`; scripts and styles left out), a species
  is named when the page writes:
  - its iNaturalist name, its WoRMS accepted name or a WoRMS species synonym, in full (*Ceratosoma alleni* counts for
    *Miamira alleni*);
  - or the name abbreviated (*C. annae*), when the genus is written in full on the page and no other species whose genus
    is on the page abbreviates the same;
  - or a nickname, only when its English Wikipedia title redirects to that species' article: "sea bunny" → *Jorunna
    parva*; "leaf sheep", "sea sheep", "leaf slug" → *Costasiella kuroshimae*; "Pikachu" (title "Pikachu nudibranch")
    → *Thecacera pacifica*; "black-margined nudibranch" → *Doriprismatica atromarginata*.
  - Three nicknames are **not counted**, and are questions instead (§6): "Spanish dancer" (either *Hexabranchus*),
    "blue dragon" (often *Glaucus*, not a reef slug of ours) and "Shaun the Sheep" (no redirect).
  - English names ("Willan's Chromodoris") are **not counted**: iNaturalist's and WoRMS's disagree for most species
    (study §6.1).
  - A name claimed by two species is left out.
- **Unit.** A species counts once per **site**, not per page or per mention: two pages of one magazine are one site.
- **How this differs from the study's §4.2.** The study counted by eye the species a page named as a highlight tied to a
  Philippine site. The tool counts every species a page names, anywhere in its text, sidebars included. It is more
  reproducible and less selective.

### 1.5 The stars score and the stars set

- **Rule** (`stars_scores`, simple on purpose):
  - W = log10(1 + views) / log10(1 + the best views): 1 for the most viewed species, about 0.5 for one with the square
    root of its views;
  - M = log(1 + sites) / log(1 + the most sites): 1 for the species named on the most sites;
  - **stars score = (W + M) / 2**: the two signals weigh the same.
  - Log scales, because both are heavy-tailed: the most viewed species has 191,665 views, the median species with an
    article 242.
- **The stars set** is the `stars.size` best scores among the species Pierre has not removed (`stars.remove`: the next
  scores replace them), then the species he adds (`stars.add`). It is its own field (`star`), never an order: the
  opening order stays commonness (Q369 c).
- **A stability check**: the set is recomputed without each site in turn. The file lists the sites whose removal changes
  it, with how many species change (`leaveOneSiteOut`), and the stars that every such set keeps (`starsCore`).

### 1.6 The circles

- **Circle 1** = the stars, plus the most common species (all groups together) up to `circles.one`.
- **Later circles** = the rest, by commonness, in blocks of `circles.next`, and the remainder last.
- Written into the file as `proposal`, with the status "decided by Pierre (Q377, 2026-11-15); not used by the app yet",
  and per species as `circle`, `star` and `rank` (commonness rank over all groups). The key keeps its name: it is what
  the subject's build will read.

## 2. The species list: counts, and the study's numbers

**[measured]**, Research Grade, the Philippines:

| Group | Species | Confirmed (C8) | Confirmed and seen near Dauin |
|---|---|---|---|
| Nudibranchia | 484 | 352 | 117 |
| Sacoglossa | 56 | 35 | 16 |
| Cephalaspidea | 81 | 45 | 13 |
| Aplysiida | 17 | 11 | 6 |
| Pleurobranchida | 13 | 9 | 5 |
| **All** | **651** | **452** | **157** |

- 28,045 species-level observations, from 28,089 pulled.
- **The study's numbers hold exactly.** Each of the 452 species was compared with the study's CSV on observers,
  observations, provinces, half-degree cells, observers near Dauin and Wikipedia views: **0 differences**. The totals
  are the study's §2.1 too. This is expected, since the observation pages and the pageviews are the same replies (§1.2).
  A rerun with `--refresh` will move with iNaturalist.
- **WoRMS** matched all 452 names:
  - 450 are the accepted name;
  - 2 are "alternative representation": iNaturalist's *Tenellia viei* and *T. goniophaga* are *Phestilla viei* and *P.
    goniophaga* in WoRMS, as in the study;
  - WoRMS gives **no order for the 35 sacoglossans**: it ranks Sacoglossa above order. The file keeps the iNaturalist
    group (`group`) beside WoRMS's `order`;
  - 2 families differ: iNaturalist puts *Unidentia sandramillenae* and *U. aliciae* in Unidentiidae, WoRMS in
    Piseinotecidae.
  - These discrepancies go to `points.json` once the subject exists (rule C5): the file's points are per subject, and the
    subject does not exist yet. Listed here so they are not lost.
- **Names, as information for the sheets** (Q369 d):
  - iNaturalist's English name (`en`): 39 of the 45 species of circle 1;
  - WoRMS's English vernaculars (`wormsEn`): 22 of the 45;
  - the nicknames (`nick`), where the source ties one;
  - 675 WoRMS species synonyms (`syn`), used to find the species on the pages. Four synonyms claimed by two species were
    dropped: *Aegires citrinus*, *Doris marginata*, *Doris sordida*, *Phyllidia tuberculata*.

## 3. The popularity signals

### 3.1 Wikipedia

- 320 of the 452 species have an English article, as in the study. The views are the study's, to the view.
- Article kinds: 314 own, 3 `named` (*Hexabranchus sanguineus* "Spanish dancer", *Pleurobranchus albiguttatus*
  "Mosaic pleurobranch", *Tenellia yamasui* "Trinchesia yamasui"), 3 `higher`, counted 0 (a genus or family article:
  *Cephalopyge trematoides*, *Doridomorpha gardineri*, *Pinufius rebus*). None is shared.

### 3.2 Mentions on public pages

- **37 pages, 31 readable.** 26 are about the Philippines, 9 general, and 2 elsewhere (Mauritius, Bali), listed and not
  counted. The full list, with each page's date and pull date, is in Appendix A.
- **Not readable**: scuba.com (HTTP 403), the WWF Coral Triangle blog and Wetpixel (no connection), diveoclock.com
  (redirected to another site). As in the study, none was fetched another way.
- **Thin.** 16 pages, from 12 sites, name at least one confirmed species: 74 species in all.
  - 58 species are named on one site, 13 on two, 2 on three, and 1 on four (*Hexabranchus sanguineus*).
  - Many readable pages name no species at all: contest results and travel pages say "nudibranchs", or use common
    names.
- **Biases** **[read on the pages]**:
  - Anilao and Romblon dominate the Philippine pages: macro photographers' destinations. Three of the most useful pages
    are from one magazine (X-Ray Mag), counted as one site.
  - Dauin pages name few species (the Atmosphere page names "the shaun the sheep nudi", a nickname not counted).
  - No page about Lembeh (Indonesia) was used. The two non-Philippine pages are listed as `out` and not counted.
  - One general page, color-meanings.com's "55 of the most colorful sea slugs in the world", names 34 confirmed species
    by itself (§3.4).
- **Named but not confirmed in the Philippines** (rule C8; never stars): *Chromodoris quadricolor* and *Nembrotha
  purpureolineata* (2 sites each), *Chelidonura livida*, *Cyerce kikutarobabai*, *Goniobranchus reticulatus*,
  *Hypselodoris pulchella*, *Platydoris formosa*, *Sacoproteus nishae* (1 each).
- **Against the study's Appendix B.4** (its hand count of the pages P1-P9):
  - On X-Ray Mag's "Romblon: mystical island" (P9) the tool finds all 8 of the study's species, 5 of them only in the
    photo captions.
  - On DAN's "On the hunt" (P8) it finds *Miamira alleni*, through the former name *Ceratosoma alleni*, but **not**
    *Chromodoris willani*: the page names it only as "Willan's Chromodoris", an English name, in a caption. A known
    under-count of the rule.
  - On Atmosphere's page (P2) *Costasiella kuroshimae* is not counted: the page says "shaun the sheep nudi" and "kuro
    sapsucking slug", neither a counted nickname.
  - scuba.com (the study's P3) now answers 403.

### 3.3 The stars score

The best scores **[measured]**: W is the Wikipedia part, M the mentions part (§1.5). "Core": a star that stays a star
whichever single site is left out (§3.4).

| # | Species | Group | Score | W (views) | M (sites) | Commonness rank | Star |
|---|---|---|---|---|---|---|---|
| 1 | *Costasiella kuroshimae* | Sacoglossa | 0.931 | 1.00 (191,665) | 0.86 (3) | 64 | ★ (core) |
| 2 | *Hexabranchus sanguineus* | Nudibranchia | 0.904 | 0.81 (18,433) | 1.00 (4) | 176 | ★ (core) |
| 3 | *Doriprismatica atromarginata* | Nudibranchia | 0.732 | 0.60 (1,524) | 0.86 (3) | 24 | ★ (core) |
| 4 | *Thecacera pacifica* | Nudibranchia | 0.724 | 0.76 (10,983) | 0.68 (2) | 213 | ★ (core) |
| 5 | *Chromodoris willani* | Nudibranchia | 0.717 | 0.75 (9,237) | 0.68 (2) | 3 | ★ (core) |
| 6 | *Jorunna parva* | Nudibranchia | 0.699 | 0.97 (128,474) | 0.43 (1) | 334 | ★ |
| 7 | *Nembrotha kubaryana* | Nudibranchia | 0.692 | 0.70 (5,046) | 0.68 (2) | 2 | ★ (core) |
| 8 | *Nembrotha lineolata* | Nudibranchia | 0.646 | 0.61 (1,673) | 0.68 (2) | 5 | ★ (core) |
| 9 | *Goniobranchus kuniei* | Nudibranchia | 0.640 | 0.60 (1,428) | 0.68 (2) | 21 | ★ (core) |
| 10 | *Nembrotha chamberlaini* | Nudibranchia | 0.640 | 0.60 (1,422) | 0.68 (2) | 4 | ★ (core) |
| 11 | *Nembrotha milleri* | Nudibranchia | 0.616 | 0.55 (788) | 0.68 (2) | 19 | ★ |
| 12 | *Halgerda batangas* | Nudibranchia | 0.612 | 0.54 (730) | 0.68 (2) | 8 | ★ |
| 13 | *Phestilla melanobrachia* | Nudibranchia | 0.585 | 0.49 (376) | 0.68 (2) | 92 | ★ |
| 14 | *Janolus savinkini* | Nudibranchia | 0.581 | 0.48 (337) | 0.68 (2) | 140 | removed (Q377) |
| 15 | *Jorunna funebris* | Nudibranchia | 0.577 | 0.72 (6,682) | 0.43 (1) | 16 | ★ |
| 16 | *Nembrotha cristata* | Nudibranchia | 0.563 | 0.69 (4,685) | 0.43 (1) | 18 | ★ |
| 17 | *Thorunna florens* | Nudibranchia | 0.561 | 0.44 (207) | 0.68 (2) | 220 | removed (Q377) |
| 18 | *Chelidonura varians* | Cephalaspidea | 0.558 | 0.69 (4,181) | 0.43 (1) | 30 | ★ |
| 19 | *Melibe colemani* | Nudibranchia | 0.555 | 0.68 (3,851) | 0.43 (1) | 96 | ★ |
| 20 | *Dendrodoris guttata* | Nudibranchia | 0.551 | 0.42 (164) | 0.68 (2) | 223 | removed (Q377) |
| 21 | *Phyllidia varicosa* | Nudibranchia | 0.535 | 0.64 (2,376) | 0.43 (1) | 7 | ★ (replaces one) |
| 22 | *Hypselodoris apolegma* | Nudibranchia | 0.531 | 0.63 (2,162) | 0.43 (1) | 28 | ★ (replaces one) |
| 23 | *Chromodoris magnifica* | Nudibranchia | 0.515 | 0.60 (1,460) | 0.43 (1) | 11 | ★ (replaces one) |
| 24 | *Hypselodoris variobranchia* | Nudibranchia | 0.509 | 0.59 (1,257) | 0.43 (1) | 39 | — |

### 3.4 The stars set, and how stable it is

- **Decided (Q377): 21 stars.** The 20 best scores without the 3 Pierre removed, plus *Hexabranchus lacer*. That makes
  20 nudibranchs and 1 sacoglossan **[measured]**. The 20 best by the rule alone held 18 nudibranchs, 1 sacoglossan and
  1 headshield slug.
- **Before Q377** (the rule alone, 20 stars): 8 stayed in the set whichever single site was left out. Leaving out
  color-meanings.com changed 7 of the 20: *Janolus savinkini*, *Thorunna florens* and *Dendrodoris guttata* (few views,
  rarely met) were stars only through that list plus one other page. Those three are the ones Pierre removed.
- **Stable core, as decided.** 9 stars by the rule stay in the set whichever single site is left out: *Costasiella
  kuroshimae*, *Hexabranchus sanguineus*, *Doriprismatica atromarginata*, *Thecacera pacifica*, *Chromodoris willani*,
  *Nembrotha kubaryana*, *N. lineolata*, *Goniobranchus kuniei* and *N. chamberlaini*. *H. lacer* is fixed by Pierre's
  add, so the file's `starsCore` lists it too.
- **The other 11 depend on one site.** Leaving out color-meanings.com still changes 6 of them, xray-mag.com 3, padi.com
  2, and each other site at most 1. That edge is Pierre's to adjust (`stars.add`, `stars.remove`).
- **What a mention does.** A single site lifts a species' score by 0.22, the gap between the 5th and the 25th scores.
  So the web signal decides most of the set's edge, and the edge moves with the pages read.
  - Variants were tried on the same data **[measured]**:
    - splitting each site's vote among the species it names: a page naming one species gives it a whole vote
      (*Phyllodesmium kabiranum* came 3rd);
    - counting only species named on 2 or more sites;
    - weighing Wikipedia 2/3.
  - None was more stable than the simple rule at 20: one site still moved 4 to 9 species. The simple rule is kept, with
    the stable core and the leave-one-site-out check in the file.
- **The most viewed species that are not stars**: *Elysia marginata* (21,998 views, no mention), *Chromodoris annae*,
  *C. lochi*, *Dolabella auricularia*, *Cyerce elegans*. *E. marginata* and *C. annae* are in circle 1 anyway, by
  commonness.

## 4. Circle 1 (decided, Q377)

### 4.1 Size: 45 species (the 21 stars + the 24 most common other species)

**[measured, then judged]**; the size was proposed for these reasons and decided by Pierre (Q377):
- **Coverage.** The 25 most common species hold 32% of the country's observer-species records; the decided 45 hold 43%.
  The 45 most common would hold 45%, the 60 most common 53%. Around rank 45 each further species adds about 0.5%, and
  the curve keeps flattening.
- **Every star is in**, as Q369 (a) asks. 12 of the 21 stars are common species anyway (common rank 25 or better).
  Circle 1 is the 21 stars plus the 24 most common other species, so its common part runs to rank 38.
- **Breadth.** 14 families, 24 genera: enough families for a family level, and far smaller than the fish's circle 1 (28
  families, 98 genera, 469 species). A new subject starts small.
- **Photos.** 45 species × about 20 candidates is about 900 photos to judge, against the study's 1,500 estimate for 50
  species × 30 (§5).
- **Groups.** 39 nudibranchs, 3 sacoglossans (*Costasiella kuroshimae*, *Elysia marginata*, *Thuridilla lineolata*), 2
  headshield slugs (*Chelidonura amoena*, *C. varians*) and 1 sidegill slug (*Pleurobranchus forskalii*). No sea hare:
  the most common, *Dolabella auricularia*, opens in circle 2.
- **Near Dauin.** 42 of the 45 are seen near Dauin. The 3 that are not are all stars: *Jorunna parva*, *Phestilla
  melanobrachia*, *Melibe colemani*.
- **Later circles** (`circles.next`, decided Q377): circle 2 holds the next 60 by commonness, circle 3 the next 100,
  circle 4 the last 247. Each by commonness only. The 3 removed stars fall back to their commonness: *Janolus savinkini*
  in circle 3, *Thorunna florens* and *Dendrodoris guttata* in circle 4.

### 4.2 The table

Stars first (by score), then the common species (by commonness rank). Photos: Research Grade observations; in the
Philippines, each counted once by its best photo licence (open = CC0 / CC BY, NC = CC BY-NC); "world" (the Philippines
included) counts the observations with at least one photo of that licence, so an observation can count in both. Juvenile:
observations annotated "Life Stage: Juvenile"; every one shows the animal, none an egg mass (checked on their photos,
[sources note](2026-11-15-seaslug-sources.md) §1.2). The photo columns include the egg-annotated observations, which
matter for *H. sanguineus* only (§5.1). All **[measured]**.

| # | Species | Group | Family | Common rank | PH observers | Near Dauin (observers) | Star score | Open / NC, PH | Open / NC, world | Juvenile, PH / world |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | *Costasiella kuroshimae* | Sacoglossa | Costasiellidae | 64 | 53 | yes (13) | ★ 0.931 | 9 / 74 | 20 / 229 | 1 / 2 |
| 2 | *Hexabranchus sanguineus* | Nudibranchia | Hexabranchidae | 176 | 18 | yes (2) | ★ 0.904 | 2 / 11 | 36 / 360 | 0 / 0 |
| 3 | *Doriprismatica atromarginata* | Nudibranchia | Chromodorididae | 24 | 118 | yes (11) | ★ 0.732 | 6 / 178 | 146 / 3,704 | 0 / 0 |
| 4 | *Thecacera pacifica* | Nudibranchia | Polyceridae | 213 | 14 | yes (8) | ★ 0.724 | 0 / 15 | 8 / 259 | 0 / 0 |
| 5 | *Chromodoris willani* | Nudibranchia | Chromodorididae | 3 | 203 | yes (6) | ★ 0.717 | 24 / 539 | 73 / 966 | 0 / 1 |
| 6 | *Jorunna parva* | Nudibranchia | Discodorididae | 334 | 6 | no (1) | ★ 0.699 | 0 / 5 | 8 / 135 | 0 / 0 |
| 7 | *Nembrotha kubaryana* | Nudibranchia | Polyceridae | 2 | 251 | yes (79) | ★ 0.692 | 48 / 446 | 103 / 1,121 | 0 / 2 |
| 8 | *Nembrotha lineolata* | Nudibranchia | Polyceridae | 5 | 173 | yes (62) | ★ 0.646 | 28 / 283 | 44 / 514 | 0 / 0 |
| 9 | *Goniobranchus kuniei* | Nudibranchia | Chromodorididae | 21 | 124 | yes (16) | ★ 0.640 | 13 / 162 | 61 / 755 | 0 / 1 |
| 10 | *Nembrotha chamberlaini* | Nudibranchia | Polyceridae | 4 | 180 | yes (15) | ★ 0.640 | 34 / 413 | 45 / 583 | 0 / 0 |
| 11 | *Nembrotha milleri* | Nudibranchia | Polyceridae | 19 | 130 | yes (45) | ★ 0.616 | 26 / 244 | 31 / 417 | 1 / 2 |
| 12 | *Halgerda batangas* | Nudibranchia | Discodorididae | 8 | 163 | yes (17) | ★ 0.612 | 16 / 212 | 109 / 607 | 1 / 1 |
| 13 | *Phestilla melanobrachia* | Nudibranchia | Trinchesiidae | 92 | 39 | no (0) | ★ 0.585 | 4 / 63 | 19 / 262 | 0 / 0 |
| 14 | *Jorunna funebris* | Nudibranchia | Discodorididae | 16 | 153 | yes (42) | ★ 0.577 | 15 / 223 | 177 / 1,375 | 1 / 10 |
| 15 | *Nembrotha cristata* | Nudibranchia | Polyceridae | 18 | 143 | yes (53) | ★ 0.563 | 25 / 224 | 65 / 675 | 0 / 0 |
| 16 | *Chelidonura varians* | Cephalaspidea | Aglajidae | 30 | 98 | yes (12) | ★ 0.558 | 13 / 88 | 29 / 260 | 0 / 1 |
| 17 | *Melibe colemani* | Nudibranchia | Tethydidae | 96 | 38 | no (0) | ★ 0.555 | 2 / 80 | 7 / 102 | 0 / 0 |
| 18 | *Phyllidia varicosa* | Nudibranchia | Phyllidiidae | 7 | 165 | yes (31) | ★ 0.535 | 18 / 311 | 286 / 2,685 | 0 / 0 |
| 19 | *Hypselodoris apolegma* | Nudibranchia | Chromodorididae | 28 | 105 | yes (4) | ★ 0.531 | 11 / 118 | 46 / 287 | 0 / 1 |
| 20 | *Chromodoris magnifica* | Nudibranchia | Chromodorididae | 11 | 157 | yes (26) | ★ 0.515 | 21 / 268 | 52 / 742 | 0 / 0 |
| 21 | *Hexabranchus lacer* | Nudibranchia | Hexabranchidae | 48 | 64 | yes (9) | ★ added (Q377) | 0 / 89 | 26 / 901 | 6 / 43 |
| 22 | *Chromodoris annae* | Nudibranchia | Chromodorididae | 1 | 262 | yes (51) | — | 69 / 823 | 213 / 1,612 | 0 / 0 |
| 23 | *Hypselodoris tryoni* | Nudibranchia | Chromodorididae | 6 | 169 | yes (28) | — | 16 / 272 | 138 / 1,748 | 1 / 1 |
| 24 | *Pteraeolidia semperi* | Nudibranchia | Facelinidae | 9 | 162 | yes (38) | — | 30 / 312 | 267 / 3,283 | 0 / 10 |
| 25 | *Chromodoris lochi* | Nudibranchia | Chromodorididae | 10 | 158 | yes (12) | — | 11 / 301 | 178 / 1,324 | 0 / 0 |
| 26 | *Phyllidia ocellata* | Nudibranchia | Phyllidiidae | 12 | 155 | yes (20) | — | 21 / 230 | 204 / 1,781 | 0 / 0 |
| 27 | *Goniobranchus geometricus* | Nudibranchia | Chromodorididae | 13 | 155 | yes (30) | — | 22 / 289 | 81 / 1,379 | 0 / 1 |
| 28 | *Phyllidia coelestis* | Nudibranchia | Phyllidiidae | 14 | 154 | yes (17) | — | 30 / 243 | 100 / 1,054 | 0 / 0 |
| 29 | *Phyllodesmium briareum* | Nudibranchia | Myrrhinidae | 15 | 154 | yes (25) | — | 16 / 234 | 37 / 384 | 0 / 0 |
| 30 | *Phyllidia elegans* | Nudibranchia | Phyllidiidae | 17 | 149 | yes (17) | — | 17 / 201 | 166 / 1,063 | 0 / 0 |
| 31 | *Ardeadoris egretta* | Nudibranchia | Chromodorididae | 20 | 126 | yes (15) | — | 9 / 115 | 13 / 226 | 0 / 0 |
| 32 | *Chelidonura amoena* | Cephalaspidea | Aglajidae | 22 | 120 | yes (13) | — | 14 / 176 | 48 / 466 | 0 / 0 |
| 33 | *Elysia marginata* | Sacoglossa | Plakobranchidae | 23 | 120 | yes (24) | — | 22 / 213 | 61 / 904 | 0 / 1 |
| 34 | *Caloria indica* | Nudibranchia | Facelinidae | 25 | 113 | yes (37) | — | 18 / 184 | 144 / 1,079 | 0 / 1 |
| 35 | *Thecacera picta* | Nudibranchia | Polyceridae | 26 | 112 | yes (35) | — | 25 / 203 | 30 / 339 | 0 / 0 |
| 36 | *Goniobranchus coi* | Nudibranchia | Chromodorididae | 27 | 111 | yes (24) | — | 10 / 120 | 46 / 551 | 0 / 1 |
| 37 | *Tambja morosa* | Nudibranchia | Polyceridae | 29 | 100 | yes (14) | — | 9 / 137 | 70 / 944 | 0 / 1 |
| 38 | *Phyllidia picta* | Nudibranchia | Phyllidiidae | 31 | 96 | yes (14) | — | 13 / 133 | 92 / 809 | 0 / 0 |
| 39 | *Pleurobranchus forskalii* | Pleurobranchida | Pleurobranchidae | 32 | 95 | yes (22) | — | 3 / 130 | 53 / 666 | 5 / 15 |
| 40 | *Coryphellina exoptata* | Nudibranchia | Flabellinidae | 33 | 92 | yes (5) | — | 10 / 109 | 119 / 1,073 | 0 / 0 |
| 41 | *Hypselodoris bullockii* | Nudibranchia | Chromodorididae | 34 | 90 | yes (4) | — | 7 / 117 | 60 / 661 | 0 / 0 |
| 42 | *Thuridilla lineolata* | Sacoglossa | Plakobranchidae | 35 | 85 | yes (30) | — | 8 / 165 | 21 / 285 | 0 / 0 |
| 43 | *Reticulidia halgerda* | Nudibranchia | Phyllidiidae | 36 | 84 | yes (8) | — | 4 / 95 | 11 / 208 | 0 / 0 |
| 44 | *Goniobranchus fidelis* | Nudibranchia | Chromodorididae | 37 | 81 | yes (9) | — | 8 / 124 | 50 / 858 | 0 / 2 |
| 45 | *Chromodoris colemani* | Nudibranchia | Chromodorididae | 38 | 77 | yes (5) | — | 4 / 100 | 19 / 233 | 0 / 0 |

## 5. Photos: can each species be played?

### 5.1 Supply for circle 1

**[measured]**, Research Grade observations with a CC0, CC BY or CC BY-NC photo (rule P4: the photos of one question come
from one observation). The world counts add the open and the NC columns, an upper bound since one observation can hold
both:
- **Every one of the 45 has 20 or more worldwide**; the fewest are *Melibe colemani* (7 open, 102 NC), *Jorunna parva*
  (8, 135) and *Reticulidia halgerda* (11, 208). Abroad is allowed: every species here is confirmed in the Philippines
  (rule C8).
- **From the Philippines alone** (each observation counted once): 44 of 45 have 12 or more, 42 of 45 have 20 or more.
  Below 20: *Jorunna parva* (5), *Hexabranchus sanguineus* (13), *Thecacera pacifica* (15).
- **Egg ribbons, counted afterwards** ([sources note](2026-11-15-seaslug-sources.md) §1.3): 5 of *H. sanguineus*'s 13
  Philippine observations, both open ones among them, are egg ribbons only (annotated "Life Stage: Egg"). Without them
  it has **8** (all CC BY-NC), so 43 of the 45 have 12 or more from the Philippines alone; and 24 open and 251 NC worldwide (36 and 360 above). 161 of its 544
  Research Grade observations worldwide are its egg rosettes. *H. lacer* loses 7 of 1,269 worldwide (0 in the Philippines), the other 43 species at most 3.
- **Open licences only (CC0 / CC BY)**, worldwide: 41 of 45 have 12 or more. Below 12: *Melibe colemani* (7), *Jorunna
  parva*, *Thecacera pacifica* (8 each), *Reticulidia halgerda* (11). Three of the four are stars: the sought-after
  species lean on CC BY-NC, as the study found.
- **So every species of circle 1 can be played** with CC BY-NC photos, the fish's licence set. With open licences only, 4
  would be thin (ROADMAP "The app as a generic product": NC photos cannot go into a paid product).

### 5.2 Age variation

- **iNaturalist's annotations are sparse.** Worldwide, only 225 Research Grade observations of the 452 species are
  annotated "Juvenile", out of about 147,000 **[measured]**.
  - In circle 1: 19 of the 45 species have at least one juvenile-annotated observation, and 4 have 10 or more:
    *Hexabranchus lacer* (43), *Pleurobranchus forskalii* (15), *Pteraeolidia semperi* (10), *Jorunna funebris* (10).
  - In the Philippines, 7 of the 45 have one or more (*H. lacer* 6, *P. forskalii* 5).
  - An annotation says a juvenile was photographed, not that it looks different.
  - **Checked afterwards on the photos** ([sources note](2026-11-15-seaslug-sources.md) §1.2): all 97 juvenile-annotated
    observations of circle 1 show the animal, none an egg ribbon. The 43 *H. lacer* are small pale animals with a
    violet edge and purple spots, unlike the red adult. The egg ribbons carry the "Egg" annotation instead (§5.1).
- **Public sources for a juvenile that looks different**: two leads, **neither verified** (one search; the papers were
  not read). Since then *Hexabranchus* has a readable source too, the Sea Slug Forum's "Juvenile Hexabranchus from
  Philippines" (1999, from Dauin; sources note §1.5). The two leads as first found:
  - ***Hexabranchus***: Tibiriçá et al. 2023 (*Organisms Diversity & Evolution*, doi:10.1007/s13127-023-00611-0), the
    revision that split the Spanish dancer. A search result's excerpt of it says "the ontogeny of color pattern is
    discussed" and "young juveniles are gray with a marginal white line", without saying which of its species
    **[read: a search excerpt only; the publisher's page asks for a login]**.
  - ***Jorunna funebris***: Kilburn & Fraser 2017, "The proposal that nudibranch *Jorunna funebris* 'juvenile' is
    precocious, a distinct phenotype or a new species" (Sheffield Hallam University repository). The title itself asks
    whether that form is a juvenile at all **[read: the title only]**.
  - Nothing was found for the other 43. That is not evidence that they have no distinct juvenile.
- **So at this note's merge: 0 species with a verified distinct juvenile, 2 leads** (*Hexabranchus*, *Jorunna
  funebris*). *Hexabranchus lacer*, the star added by Q377, has the most juvenile annotations of the 452 species (43).
  **Update (sources note §1.5)**: the *Hexabranchus* lead now has a readable source and 43 photographed juveniles; the
  +5 for *H. lacer* was proposed there, and applied since with the candidate photos (`photos.juvenile`,
  `tools/fetch_seaslugs.py`). The *P. forskalii* juveniles (15) look like small adults **[measured:
  their photos]**.

### 5.3 The photo target per species (decided, Q377; to revisit after the first judging pass)

The fish today (docs/FISH_PATH.md "Photos per species"): start at 8 observations a species (12 for the PDF's 24 most
sighted), game cap 20; candidates capped at 30 for a stable species, +10 per extra phase, at most 60.

**For sea slugs**: proposed from the counts above **[guess]**, decided by Pierre (Q377). Recorded in
`tools/seaslug_source.json` `photos`:

| | Fish (today) | Sea slugs (Q377) |
|---|---|---|
| Start (a species can be played) | 8 | **6** |
| Game cap | 20 | **12** |
| Candidates, stable species | 30 | **20** |
| Per distinct juvenile form | +10 per phase | **+5**, only where a source documents a different-looking juvenile (2 leads today, §5.2) |
| Egg ribbons, egg masses | — | **never candidates** (Pierre, 2026-11-15): the "Egg" annotations dropped, an egg-only photo dropped at judging (`photos.exclude`, sources note §1.4) |
| Most | 60 | **30** (very variable colours: *Chromodoris*, *Phyllidia*) |

Why fewer than the fish:
- **Fewer views.** A sea slug is photographed from above or from the side, crawling. A fish is photographed in profile,
  from the front, turning, partly hidden.
- **No sex phases.** Sea slugs are simultaneous hermaphrodites **[guess: textbook biology, not checked against a source
  here]**, so there are no male, female or terminal phases to fill. Juveniles are rarely photographed (§5.2).
- **The supply fits.** At 20 candidates, 42 of the 45 have enough from the Philippines alone, and all 45 with photos from
  abroad.

Why not lower: colour varies within some species. Layton et al. (2018) found stable colour patterns in only 5 of 39
*Chromodoris* taxa, and Stoffels et al. (2016) report "high intra-specific colour variation" in Phyllidiidae (both cited
in the study, §5.2 and §6.3). Those two genera hold 10 of the 45 (*Chromodoris* 5, *Phyllidia* 5), hence the higher cap
for them.

## 6. Questions for Pierre (all answered "oui", Q377, 2026-11-15)

As asked, each with the recommendation he accepted. What was applied is at the top of this note.

1. **The stars set.**
   - Is 20 the right size?
   - Should the 3 stars that rest on one long "most colorful" list (*Janolus savinkini*, *Thorunna florens*,
     *Dendrodoris guttata*) stay?
   - *Recommendation*: 20. Remove those 3 through `stars.remove`; the next scores are *Phyllidia varicosa*, *Hypselodoris
     apolegma* and *Chromodoris magnifica*, all already in circle 1. Then check the 8-species stable core against what
     divers ask for.
2. **The Spanish dancer.**
   - Wikipedia's "Spanish dancer" article is *H. sanguineus*, and 4 sites name *H. sanguineus*. But *H. lacer* is the one
     mostly recorded in the Philippines (64 observers against 18), and pages say "Spanish dancer" for either.
   - Which species is the star, or both?
   - *Recommendation*: add *H. lacer* as a star (`stars.add`), keep *H. sanguineus*, and teach the pair as look-alikes
     (study §6.3).
3. **Later circles.**
   - What order? Proposed: commonness alone (circle 2 the next 60, circle 3 the next 100, circle 4 the rest).
   - The stars score could order them instead, but Q369 (c) says the stars never set the opening order.
   - *Recommendation*: commonness alone, in those block sizes.
4. **The circle 1 size**: 45 (§4.1). *Recommendation*: 45.
5. **The photo target**: start 6, game cap 12, 20 candidates, +5 for a documented juvenile, 30 at most (§5.3).
   *Recommendation*: yes, revisited after the first judging pass.
6. **The format of `tools/seaslugs.json`**: other code will read it when the subject is built (a data format other code
   follows). *Recommendation*: keep it as the tool's output, and let the subject's build write the app's own file from
   it.

Also noted, not questions:
- The nicknames not counted ("blue dragon", "Shaun the Sheep") are shown on the sheets as information only (Q369 d).
- The *Tenellia* / *Phestilla* names and the *Unidentia* family go to `points.json` when the subject exists (§2).

## 7. Circle 2: the candidate photos fetched (2026-11-15)

Circle 2 is the 60 species after circle 1 by commonness (Q377; `circle: 2` in `tools/seaslugs.json`, common ranks 39
to 102, the circle-1 stars left out). Its candidate photos were fetched into `seaslug-cand.json` with
`python3 tools/fetch_seaslugs.py --circle 2`, the tool and the rules of circle 1, unchanged:
- the photo target's 20 candidates per species (`photoTarget.candidates`; start 6 and game cap 12 are for the game, §5.3);
- one photo per observation (rule P4), Research Grade at species level, never captive;
- CC0, CC BY or CC BY-NC only (rule P1), the licence the last tie-break;
- observations annotated Life Stage: Egg or Evidence of Presence: Egg dropped (`photos.exclude`, filter 1);
- the Philippines first, then the fish's Indo-West Pacific box only for a species still short.

Nothing was judged, downloaded or uploaded. Circle 1's 905 candidates are unchanged (compared record by record).

**Result [measured]** (pulled 2026-11-15, 20:02-20:03 Manila; 26 requests through `tools/inat.py`, rule C7: 59 species
asked together in 24 pages of 200, *Favorinus tsuruganus* on its own, one `species_counts`; a rerun with `--offline`
writes the same bytes):
- **1,200 candidates, 20 for each of the 60 species, all from the Philippines** (128 of them within 40 km of Dauin), none
  from abroad. **No species is short**: none below the 20 candidates, so none below the start of 6.
- Licences: 1,090 CC BY-NC, 82 CC BY, 28 CC0. 15 are Pierre's own, taken like anyone's (no priority, Research Grade only).
- Egg filter 1: 16 egg-annotated observations came back in the replies; none was taken.
- Life stage: 9 candidates are annotated Adult and 2 Juvenile (one each for *Goniobranchus hintuanensis* and *Ceratosoma
  tenue*), taken in the normal places.
- **No +5 juvenile places in circle 2.** `photoTarget.juvenile` names only *Hexabranchus lacer*: no source has been read
  for a different-looking juvenile of a circle-2 species. Leads for a later look, by their Juvenile annotations
  (Research Grade, world / Philippines): *G. hintuanensis* 9 / 3, *C. tenue* 5 / 2, *Jorunna rubescens* 4 / 0, *Armina
  scotti* 3 / 1, and 10 species with 1 each. *J. rubescens* also has 5 observations annotated Egg worldwide.
- **The thinnest, on open licences only**: 9 species have no CC0 or CC BY candidate (*Chromodoris strigata*,
  *Phyllidiopsis krempfi*, *Samla bicolor*, *Hypselodoris purpureomaculosa*, *Phyllidiopsis annae*, *Chromodoris joshi*,
  *Plakobranchus papua*, *Phyllodesmium crypticum*, *Reticulidia fungia*), and 25 of the 60 have fewer than 12 Research
  Grade observations with an open photo worldwide (`photos.worldOpen` in `tools/seaslugs.json`; the fewest *Chromodoris joshi*, *Miamira alleni* and
  *Phyllodesmium jakobsenae*, 1 each). This matters only for an open-licence product (§5.1).
- The ceiling of 30 for very variable genera is not applied, as in circle 1 (4 *Chromodoris* here, no *Phyllidia*).

Groups: 52 nudibranchs, 3 sacoglossans, 3 headshield slugs and the first 2 sea hares (*Dolabella auricularia*, *Aplysia
nigrocincta*). 43 of the 60 are seen near Dauin.

| # | Species | Group | Common rank | Candidates | Near Dauin | CC0 / CC BY | CC BY-NC | Juvenile-annotated |
|---|---|---|---|---|---|---|---|---|
| 1 | *Hypselodoris variobranchia* | Nudibranchia | 39 | 20 | 0 | 4 | 16 | 0 |
| 2 | *Favorinus tsuruganus* | Nudibranchia | 40 | 20 | 0 | 1 | 19 | 0 |
| 3 | *Chromodoris strigata* | Nudibranchia | 41 | 20 | 0 | 0 | 20 | 0 |
| 4 | *Hypselodoris decorata* | Nudibranchia | 42 | 20 | 1 | 3 | 17 | 0 |
| 5 | *Goniobranchus hintuanensis* | Nudibranchia | 43 | 20 | 0 | 1 | 19 | 1 |
| 6 | *Dolabella auricularia* | Aplysiida | 44 | 20 | 5 | 4 | 16 | 0 |
| 7 | *Diversidoris crocea* | Nudibranchia | 45 | 20 | 0 | 1 | 19 | 0 |
| 8 | *Chromodoris alcalai* | Nudibranchia | 46 | 20 | 1 | 1 | 19 | 0 |
| 9 | *Phyllidiopsis shireenae* | Nudibranchia | 47 | 20 | 2 | 3 | 17 | 0 |
| 10 | *Phyllidiopsis xishaensis* | Nudibranchia | 49 | 20 | 2 | 5 | 15 | 0 |
| 11 | *Aegires villosus* | Nudibranchia | 50 | 20 | 0 | 1 | 19 | 0 |
| 12 | *Ceratosoma gracillimum* | Nudibranchia | 51 | 20 | 0 | 3 | 17 | 0 |
| 13 | *Costasiella usagi* | Sacoglossa | 52 | 20 | 8 | 2 | 18 | 0 |
| 14 | *Phyllidiella pustulosa* | Nudibranchia | 53 | 20 | 3 | 3 | 17 | 0 |
| 15 | *Hypselodoris emma* | Nudibranchia | 54 | 20 | 1 | 3 | 17 | 0 |
| 16 | *Phyllidiopsis krempfi* | Nudibranchia | 55 | 20 | 1 | 0 | 20 | 0 |
| 17 | *Glossodoris rufomarginata* | Nudibranchia | 56 | 20 | 5 | 3 | 17 | 0 |
| 18 | *Goniobranchus verrieri* | Nudibranchia | 57 | 20 | 1 | 4 | 16 | 0 |
| 19 | *Coryphellina flamma* | Nudibranchia | 58 | 20 | 3 | 3 | 17 | 0 |
| 20 | *Sagaminopteron psychedelicum* | Cephalaspidea | 59 | 20 | 1 | 3 | 17 | 0 |
| 21 | *Goniobranchus preciosus* | Nudibranchia | 60 | 20 | 1 | 2 | 18 | 0 |
| 22 | *Jorunna rubescens* | Nudibranchia | 61 | 20 | 1 | 1 | 19 | 0 |
| 23 | *Thorunna furtiva* | Nudibranchia | 62 | 20 | 1 | 3 | 17 | 0 |
| 24 | *Phestilla sibogae* | Nudibranchia | 63 | 20 | 0 | 2 | 18 | 0 |
| 25 | *Discodoris boholiensis* | Nudibranchia | 65 | 20 | 2 | 2 | 18 | 0 |
| 26 | *Chromodoris dianae* | Nudibranchia | 66 | 20 | 0 | 2 | 18 | 0 |
| 27 | *Hypselodoris whitei* | Nudibranchia | 67 | 20 | 1 | 1 | 19 | 0 |
| 28 | *Mexichromis multituberculata* | Nudibranchia | 68 | 20 | 5 | 2 | 18 | 0 |
| 29 | *Cadlinella ornatissima* | Nudibranchia | 69 | 20 | 0 | 2 | 18 | 0 |
| 30 | *Hypselodoris roo* | Nudibranchia | 70 | 20 | 4 | 4 | 16 | 0 |
| 31 | *Glossodoris acosti* | Nudibranchia | 71 | 20 | 4 | 2 | 18 | 0 |
| 32 | *Tubulophilinopsis pilsbryi* | Cephalaspidea | 72 | 20 | 4 | 3 | 17 | 0 |
| 33 | *Samla bicolor* | Nudibranchia | 73 | 20 | 4 | 0 | 20 | 0 |
| 34 | *Hypselodoris krakatoa* | Nudibranchia | 74 | 20 | 1 | 2 | 18 | 0 |
| 35 | *Hypselodoris purpureomaculosa* | Nudibranchia | 75 | 20 | 4 | 0 | 20 | 0 |
| 36 | *Phyllidiopsis annae* | Nudibranchia | 76 | 20 | 5 | 0 | 20 | 0 |
| 37 | *Mexichromis trilineata* | Nudibranchia | 77 | 20 | 0 | 1 | 19 | 0 |
| 38 | *Goniobranchus leopardus* | Nudibranchia | 78 | 20 | 7 | 2 | 18 | 0 |
| 39 | *Chromodoris joshi* | Nudibranchia | 79 | 20 | 2 | 0 | 20 | 0 |
| 40 | *Glossodoris buko* | Nudibranchia | 80 | 20 | 0 | 1 | 19 | 0 |
| 41 | *Miamira alleni* | Nudibranchia | 81 | 20 | 0 | 1 | 19 | 0 |
| 42 | *Thuridilla albopustulosa* | Sacoglossa | 82 | 20 | 2 | 3 | 17 | 0 |
| 43 | *Phyllodesmium rudmani* | Nudibranchia | 83 | 20 | 0 | 1 | 19 | 0 |
| 44 | *Armina occulta* | Nudibranchia | 84 | 20 | 13 | 5 | 15 | 0 |
| 45 | *Ceratosoma tenue* | Nudibranchia | 85 | 20 | 6 | 2 | 18 | 1 |
| 46 | *Nembrotha mullineri* | Nudibranchia | 86 | 20 | 8 | 3 | 17 | 0 |
| 47 | *Samla bilas* | Nudibranchia | 87 | 20 | 0 | 2 | 18 | 0 |
| 48 | *Roboastra gracilis* | Nudibranchia | 88 | 20 | 2 | 2 | 18 | 0 |
| 49 | *Armina scotti* | Nudibranchia | 89 | 20 | 5 | 1 | 19 | 0 |
| 50 | *Phyllodesmium jakobsenae* | Nudibranchia | 90 | 20 | 0 | 1 | 19 | 0 |
| 51 | *Plakobranchus papua* | Sacoglossa | 91 | 20 | 1 | 0 | 20 | 0 |
| 52 | *Phyllodesmium crypticum* | Nudibranchia | 93 | 20 | 1 | 0 | 20 | 0 |
| 53 | *Phyllidiella nigra* | Nudibranchia | 94 | 20 | 1 | 2 | 18 | 0 |
| 54 | *Chelidonura hirundinina* | Cephalaspidea | 95 | 20 | 3 | 1 | 19 | 0 |
| 55 | *Reticulidia fungia* | Nudibranchia | 97 | 20 | 0 | 0 | 20 | 0 |
| 56 | *Longibranchus putnami* | Nudibranchia | 98 | 20 | 4 | 1 | 19 | 0 |
| 57 | *Phyllodesmium koehleri* | Nudibranchia | 99 | 20 | 0 | 1 | 19 | 0 |
| 58 | *Bermudella brunneomaculata* | Nudibranchia | 100 | 20 | 0 | 2 | 18 | 0 |
| 59 | *Aplysia nigrocincta* | Aplysiida | 101 | 20 | 2 | 1 | 19 | 0 |
| 60 | *Samla riwo* | Nudibranchia | 102 | 20 | 0 | 1 | 19 | 0 |

"Near Dauin" here is the candidate's own place (`loc: dauin`, within 40 km), not the species' "seen near Dauin" (§1.2).

## 8. Circle 3: the candidate photos fetched (2026-11-15)

Circle 3 is the 100 species after circle 2 by commonness (Q377; `circle: 3` in `tools/seaslugs.json`, common ranks 103
to 203; rank 176, *Hexabranchus sanguineus*, is a circle-1 star). It was already marked: `tools/build_seaslugs.py`,
`tools/seaslugs.json` and `tools/seaslug_source.json` are unchanged, so circles 1 and 2 and the 21 stars are too (their
name lists compared with `origin/main`: deep-equal). *Janolus savinkini*, one of the 3 stars Pierre removed, is in it
by its commonness (§4.1). Its candidate photos were fetched into `seaslug-cand.json` with
`python3 tools/fetch_seaslugs.py --circle 3`, the tool and the rules of circles 1 and 2, unchanged (§7's list: 20
candidates per species, one photo per observation, Research Grade at species level, never captive, CC0 / CC BY /
CC BY-NC, the egg annotations dropped, the Philippines first, then the Indo-West Pacific box for a species still short).

Nothing was judged, downloaded or uploaded. The 105 lists of circles 1 and 2 (2,105 candidates) are unchanged (compared
with `origin/main`: deep-equal).

**Result [measured]** (pulled 2026-11-15, 21:44-21:45 Manila; 40 requests through `tools/inat.py`, rule C7: the 100
species asked together in 15 pages of 200 (3 batches), one `species_counts`, and 24 searches abroad, one per species
still short; a rerun with `--offline` writes the same bytes):
- **2,000 candidates, 20 for each of the 100 species.** **No species is short of the 20**, so none is below the start of
  6. 1,873 are from the Philippines (180 of them within 40 km of Dauin) and 127 from abroad.
- **The first circle to need photos from abroad**: 24 species have fewer than 20 usable observations in the Philippines,
  and were filled from the Indo-West Pacific box. The fewest from the Philippines: *Trapania scurra* 7 (13 abroad),
  *Hypselodoris katherinae* 9 (11), *Notodoris serenae* 12 (8). Every one has 6 or more from the Philippines alone.
- Licences: 1,870 CC BY-NC, 92 CC BY, 38 CC0. 11 are Pierre's own, taken like anyone's (no priority, Research Grade only),
  in 9 species.
- Egg filter 1: 18 egg-annotated observations came back in the replies, in 9 species (*Thorunna halourga* 6, *Doto ussi*
  and *Bulbaeolidia alba* 3 each, 1 each for 6 others); none was taken.
- Life stage: 21 candidates are annotated Adult and 4 Juvenile (*Miamira miamirana* 2, *Cyerce nigra* 1, *Trapania
  scurra* 1), taken in the normal places.
- **No +5 juvenile places in circle 3.** `photoTarget.juvenile` still names only *Hexabranchus lacer*: no source has been
  read for a different-looking juvenile of a circle-3 species. Leads for a later look, by their Juvenile annotations
  (Research Grade, world / Philippines; `juv` in `tools/seaslugs.json`): *Ceratosoma trilobatum* 8 / 0, *Hypselodoris
  zephyra* 7 / 0, *Pleurobranchus peronii* 7 / 0, *Aplysia argus* 6 / 0, *Stylocheilus striatus* 5 / 0, *Miamira
  miamirana* 4 / 3, *Pleurobranchus grandis* 3 / 1, *Melibe viridis* 2 / 0, and 9 species with 1 each.
- **The thinnest, on open licences only**: 36 species have no CC0 or CC BY candidate, and 71 of the 100 have fewer than
  12 Research Grade observations with an open photo worldwide (`photos.worldOpen`); 7 have none (*Cyerce elegans*,
  *Hypselodoris bollandi*, *Melibe digitata*, *Odontoglaja guamensis*, *Phyllidiopsis fissurata*, *Phyllodesmium
  tuberculatum*, *Sclerodoris tuberculata*). This matters only for an open-licence product (§5.1).
- The ceiling of 30 for very variable genera is not applied, as in circles 1 and 2 (2 *Chromodoris* and 2 *Phyllidia*
  here).
- **The weekly licence refresh** (`tools/licences.py`) asks every candidate's observation, 200 a request, pooled over all
  its files: these 2,000 observations add about 10 requests a week.

Groups: 78 nudibranchs, 8 sacoglossans, 6 headshield slugs, 5 sidegill slugs and 3 sea hares. 42 of the 100 are seen
near Dauin.

| # | Species | Group | Common rank | Candidates | Philippines / abroad | Near Dauin | CC0 / CC BY | CC BY-NC | Juvenile-annotated |
|---|---|---|---|---|---|---|---|---|---|
| 1 | *Melibe viridis* | Nudibranchia | 103 | 20 | 20 / 0 | 3 | 0 | 20 | 0 |
| 2 | *Bornella anguilla* | Nudibranchia | 104 | 20 | 20 / 0 | 2 | 1 | 19 | 0 |
| 3 | *Gymnodoris crocea* | Nudibranchia | 105 | 20 | 20 / 0 | 19 | 2 | 18 | 0 |
| 4 | *Tubulophilinopsis gardineri* | Cephalaspidea | 106 | 20 | 20 / 0 | 6 | 0 | 20 | 0 |
| 5 | *Cyerce nigra* | Sacoglossa | 107 | 20 | 20 / 0 | 0 | 1 | 19 | 1 |
| 6 | *Phyllidiopsis fissurata* | Nudibranchia | 108 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 7 | *Hypselodoris reidi* | Nudibranchia | 109 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 8 | *Taringa halgerda* | Nudibranchia | 110 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 9 | *Thuridilla gracilis* | Sacoglossa | 111 | 20 | 20 / 0 | 3 | 1 | 19 | 0 |
| 10 | *Ceratosoma trilobatum* | Nudibranchia | 112 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 11 | *Phyllodesmium colemani* | Nudibranchia | 113 | 20 | 20 / 0 | 3 | 1 | 19 | 0 |
| 12 | *Thecacera pikachu* | Nudibranchia | 114 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 13 | *Plakobranchus ocellatus* | Sacoglossa | 115 | 20 | 20 / 0 | 2 | 1 | 19 | 0 |
| 14 | *Doto ussi* | Nudibranchia | 116 | 20 | 20 / 0 | 0 | 2 | 18 | 0 |
| 15 | *Tenellia bughaw* | Nudibranchia | 117 | 20 | 20 / 0 | 6 | 5 | 15 | 0 |
| 16 | *Phyllodesmium tuberculatum* | Nudibranchia | 118 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 17 | *Tomoberthella martensi* | Pleurobranchida | 119 | 20 | 20 / 0 | 1 | 2 | 18 | 0 |
| 18 | *Phyllodesmium poindimiei* | Nudibranchia | 120 | 20 | 20 / 0 | 3 | 2 | 18 | 0 |
| 19 | *Hypselodoris infucata* | Nudibranchia | 121 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 20 | *Colpodaspis thompsoni* | Cephalaspidea | 122 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 21 | *Cabangus regius* | Nudibranchia | 123 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 22 | *Halgerda tessellata* | Nudibranchia | 124 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 23 | *Miamira miamirana* | Nudibranchia | 125 | 20 | 20 / 0 | 0 | 1 | 19 | 2 |
| 24 | *Phyllodesmium opalescens* | Nudibranchia | 126 | 20 | 20 / 0 | 0 | 2 | 18 | 0 |
| 25 | *Miamira sinuata* | Nudibranchia | 127 | 20 | 20 / 0 | 3 | 1 | 19 | 0 |
| 26 | *Hypselodoris paradisa* | Nudibranchia | 128 | 20 | 20 / 0 | 0 | 2 | 18 | 0 |
| 27 | *Halgerda willeyi* | Nudibranchia | 129 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 28 | *Aplysia argus* | Aplysiida | 130 | 20 | 20 / 0 | 5 | 0 | 20 | 0 |
| 29 | *Tenellia nakapila* | Nudibranchia | 131 | 20 | 20 / 0 | 13 | 4 | 16 | 0 |
| 30 | *Asteronotus cespitosus* | Nudibranchia | 132 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 31 | *Trapania vitta* | Nudibranchia | 133 | 20 | 20 / 0 | 2 | 2 | 18 | 0 |
| 32 | *Cyerce blackburnae* | Sacoglossa | 134 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 33 | *Phyllidia exquisita* | Nudibranchia | 135 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 34 | *Elysia pusilla* | Sacoglossa | 136 | 20 | 20 / 0 | 4 | 2 | 18 | 0 |
| 35 | *Tambja olivaria* | Nudibranchia | 137 | 20 | 20 / 0 | 1 | 2 | 18 | 0 |
| 36 | *Hypselodoris maculosa* | Nudibranchia | 138 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 37 | *Mexichromis pusilla* | Nudibranchia | 139 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 38 | *Janolus savinkini* | Nudibranchia | 140 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 39 | *Janolus flavoanulatus* | Nudibranchia | 141 | 20 | 20 / 0 | 2 | 0 | 20 | 0 |
| 40 | *Phyllidiella rudmani* | Nudibranchia | 142 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 41 | *Favorinus mirabilis* | Nudibranchia | 143 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 42 | *Cyerce katiae* | Sacoglossa | 144 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 43 | *Notodoris minor* | Nudibranchia | 145 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 44 | *Pleurobranchus grandis* | Pleurobranchida | 146 | 20 | 20 / 0 | 3 | 0 | 20 | 0 |
| 45 | *Ardeadoris angustolutea* | Nudibranchia | 147 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 46 | *Ardeadoris averni* | Nudibranchia | 148 | 20 | 13 / 7 | 0 | 2 | 18 | 0 |
| 47 | *Nembrotha livingstonei* | Nudibranchia | 149 | 20 | 20 / 0 | 3 | 2 | 18 | 0 |
| 48 | *Goniobranchus albopunctatus* | Nudibranchia | 150 | 20 | 16 / 4 | 1 | 3 | 17 | 0 |
| 49 | *Hypselodoris zephyra* | Nudibranchia | 151 | 20 | 20 / 0 | 6 | 2 | 18 | 0 |
| 50 | *Melibe digitata* | Nudibranchia | 152 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 51 | *Verconia alboannulata* | Nudibranchia | 153 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 52 | *Baeolidia moebii* | Nudibranchia | 154 | 20 | 20 / 0 | 4 | 1 | 19 | 0 |
| 53 | *Philinopsis speciosa* | Cephalaspidea | 155 | 20 | 20 / 0 | 1 | 2 | 18 | 0 |
| 54 | *Sagaminopteron nigropunctatum* | Cephalaspidea | 156 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 55 | *Sclerodoris tuberculata* | Nudibranchia | 157 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 56 | *Coryphellina lotos* | Nudibranchia | 158 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 57 | *Murphydoris adusta* | Nudibranchia | 159 | 20 | 20 / 0 | 2 | 1 | 19 | 0 |
| 58 | *Pleurobranchus weberi* | Pleurobranchida | 160 | 20 | 20 / 0 | 5 | 2 | 18 | 0 |
| 59 | *Stylocheilus striatus* | Aplysiida | 161 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 60 | *Pleurobranchus peronii* | Pleurobranchida | 162 | 20 | 20 / 0 | 2 | 0 | 20 | 0 |
| 61 | *Cratena simba* | Nudibranchia | 163 | 20 | 20 / 0 | 5 | 1 | 19 | 0 |
| 62 | *Phyllodesmium pinnatum* | Nudibranchia | 164 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 63 | *Trapania palmula* | Nudibranchia | 165 | 20 | 20 / 0 | 5 | 0 | 20 | 0 |
| 64 | *Euselenops luniceps* | Pleurobranchida | 166 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 65 | *Tenellia puti* | Nudibranchia | 167 | 20 | 17 / 3 | 2 | 2 | 18 | 0 |
| 66 | *Hypselodoris skyleri* | Nudibranchia | 168 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 67 | *Dendrodoris tuberculosa* | Nudibranchia | 169 | 20 | 19 / 1 | 4 | 1 | 19 | 0 |
| 68 | *Thorunna daniellae* | Nudibranchia | 170 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 69 | *Hypselodoris bollandi* | Nudibranchia | 171 | 20 | 16 / 4 | 0 | 0 | 20 | 0 |
| 70 | *Phyllodesmium kabiranum* | Nudibranchia | 172 | 20 | 15 / 5 | 1 | 3 | 17 | 0 |
| 71 | *Dermatobranchus funiculus* | Nudibranchia | 173 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 72 | *Mariaglaja tsurugensis* | Cephalaspidea | 174 | 20 | 13 / 7 | 3 | 2 | 18 | 0 |
| 73 | *Dermatobranchus caeruleomaculatus* | Nudibranchia | 175 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 74 | *Marioniopsis arborescens* | Nudibranchia | 177 | 20 | 20 / 0 | 3 | 0 | 20 | 0 |
| 75 | *Goniobranchus setoensis* | Nudibranchia | 178 | 20 | 20 / 0 | 1 | 1 | 19 | 0 |
| 76 | *Trapania miltabrancha* | Nudibranchia | 179 | 20 | 19 / 1 | 9 | 4 | 16 | 0 |
| 77 | *Goniobranchus fabulus* | Nudibranchia | 180 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 78 | *Tyrannodoris luteolineata* | Nudibranchia | 181 | 20 | 13 / 7 | 0 | 4 | 16 | 0 |
| 79 | *Odontoglaja guamensis* | Cephalaspidea | 182 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 80 | *Favorinus japonicus* | Nudibranchia | 183 | 20 | 20 / 0 | 1 | 0 | 20 | 0 |
| 81 | *Chromodoris michaeli* | Nudibranchia | 184 | 20 | 13 / 7 | 1 | 1 | 19 | 0 |
| 82 | *Glossodoris hikuerensis* | Nudibranchia | 185 | 20 | 14 / 6 | 2 | 5 | 15 | 0 |
| 83 | *Cyerce elegans* | Sacoglossa | 186 | 20 | 16 / 4 | 4 | 0 | 20 | 0 |
| 84 | *Thorunna halourga* | Nudibranchia | 187 | 20 | 19 / 1 | 0 | 0 | 20 | 0 |
| 85 | *Phyllidia polkadotsa* | Nudibranchia | 188 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 86 | *Notobryon wardi* | Nudibranchia | 189 | 20 | 13 / 7 | 8 | 4 | 16 | 0 |
| 87 | *Notodoris serenae* | Nudibranchia | 190 | 20 | 12 / 8 | 2 | 6 | 14 | 0 |
| 88 | *Thuridilla carlsoni* | Sacoglossa | 191 | 20 | 14 / 6 | 1 | 2 | 18 | 0 |
| 89 | *Trapania scurra* | Nudibranchia | 192 | 20 | 7 / 13 | 1 | 5 | 15 | 1 |
| 90 | *Verconia norba* | Nudibranchia | 193 | 20 | 17 / 3 | 2 | 1 | 19 | 0 |
| 91 | *Chromodoris kalawakan* | Nudibranchia | 194 | 20 | 20 / 0 | 0 | 1 | 19 | 0 |
| 92 | *Goniobranchus albonares* | Nudibranchia | 195 | 20 | 13 / 7 | 0 | 2 | 18 | 0 |
| 93 | *Melibe engeli* | Nudibranchia | 196 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 94 | *Atagema intecta* | Nudibranchia | 197 | 20 | 15 / 5 | 1 | 4 | 16 | 0 |
| 95 | *Hypselodoris violacea* | Nudibranchia | 198 | 20 | 16 / 4 | 0 | 2 | 18 | 0 |
| 96 | *Bulbaeolidia alba* | Nudibranchia | 199 | 20 | 17 / 3 | 0 | 4 | 16 | 0 |
| 97 | *Platydoris sanguinea* | Nudibranchia | 200 | 20 | 17 / 3 | 1 | 3 | 17 | 0 |
| 98 | *Hypselodoris katherinae* | Nudibranchia | 201 | 20 | 9 / 11 | 0 | 7 | 13 | 0 |
| 99 | *Pelagella longicornis* | Nudibranchia | 202 | 20 | 20 / 0 | 0 | 0 | 20 | 0 |
| 100 | *Aplysia reticulata* | Aplysiida | 203 | 20 | 20 / 0 | 6 | 0 | 20 | 0 |

"Near Dauin" here is the candidate's own place (`loc: dauin`, within 40 km), as in §7.

## 9. Pierre's own photos: the fish's rule (2026-11-16)

Pierre, 2026-11-16 (Q386): his own sea slug photos follow the fish's rule (rule P1's fish exception, rule S2). §7 and §8
took his like anyone's, Research Grade only and with no priority; since then `tools/fetch_seaslugs.py` reads his
observations with the fish's own function (`fetch_fish.usable_obs`): identified to the species they are usable even when
Needs ID (`ni`), and they are taken first, so none is left out: on top of a list already full, up to the ceiling of 30.
Never boosted: they wait for the judging pass on the rubric like any candidate.

**Result [measured]** (pulled 2026-11-16, about 15:20 Manila; `python3 tools/fetch_seaslugs.py --own --circle 1 --circle 2
--circle 3`, his search only: 8 requests through `tools/inat.py`, rule C7, 3 `species_counts` and 5 searches of up to 50
species together; nothing else asked):
- His search returned 174 observations of the 205 species with candidates, all identified at species level; 57 were
  already candidates (Research Grade, taken like anyone's).
- **116 added, 5 of them Needs ID** (one each: *Goniobranchus geometricus*, *Phyllidia elegans*, *Chromodoris strigata*,
  *Phyllidiella pustulosa*, *Phyllidiopsis fissurata*). The other 111 are his Research Grade observations that the
  variety order (the least represented observer first) had left out of full lists. 39 species gain at least one; the
  most: *Nembrotha chamberlaini* and *Phyllidia coelestis* +10 each (both at the ceiling of 30; one usable observation of
  his of *N. chamberlaini* stays out for want of room), *Chromodoris annae* and *Goniobranchus geometricus* +9,
  *Phyllidia elegans* +7. 8 are from abroad inside the Indo-West Pacific; every one carries a licence.
- None is judged yet: `python3 tools/judging_fish.py --subject seaslug todo` lists them for the next judging pass.

## Appendix A. The pages read (pulled 2026-11-15)

Date = the page's own publication date and the field it came from (§1.4), else "—". Species = confirmed species named.

| Id | Page | Scope | Place | Kind | Date | Pulled | Readable | Species |
|---|---|---|---|---|---|---|---|---|
| w01 | <https://blueribbondivers.com/what-lives-in-anilao-a-field-guide-to-the-richest-reef-on-earth/> | ph | Anilao | dive operator | 2026-02-21 (article:published_time) | 2026-11-15 | yes | 2 |
| w02 | <https://atmosphereresorts.com/scuba-diving/meet-our-critters/> | ph | Dauin | dive operator | 2024-02-11 (JSON-LD datePublished) | 2026-11-15 | yes | 0 |
| w03 | <https://www.dive-the-world.com/diving-sites-philippines-batangas-anilao.php> | ph | Anilao | dive travel | — | 2026-11-15 | yes | 4 |
| w04 | <https://www.dive-the-world.com/diving-sites-philippines-dumaguete-dauin.php> | ph | Dauin | dive travel | — | 2026-11-15 | yes | 0 |
| w05 | <https://xray-mag.com/content/romblon-macro-magic> | ph | Romblon | magazine | — | 2026-11-15 | yes | 12 |
| w06 | <https://xray-mag.com/content/romblon-mystical-island-phantoms-ghosts-butterflies> | ph | Romblon | magazine | — | 2026-11-15 | yes | 8 |
| w07 | <https://xray-mag.com/content/anilao-revisted> | ph | Anilao | magazine | — | 2026-11-15 | yes | 18 |
| w08 | <https://dan.org/?p=11672> | ph | Dauin | magazine | 2020-02-01 (JSON-LD datePublished) | 2026-11-15 | yes | 1 |
| w09 | <https://dan.org/?p=14694> | ph | Anilao | magazine | 2017-08-01 (JSON-LD datePublished) | 2026-11-15 | yes | 1 |
| w10 | <https://dan.org/alert-diver/article/the-philippines/> | ph | Philippines | magazine | 2011-08-01 (JSON-LD datePublished) | 2026-11-15 | yes | 0 |
| w11 | <https://coraltriangle.blogs.panda.org/biodiversity/nudibranchs-of-anilao-batangas-philippines> | ph | Anilao | blog | — | 2026-11-15 | no: no connection | — |
| w12 | <https://diveoclock.com/destinations/Asia/Philippines/Anilao_nudibranchs> | ph | Anilao | top list | — | 2026-11-15 | no: redirected to another site | — |
| w13 | <https://wetpixel.com/articles/mike-bartick-slugfest> | ph | Anilao | underwater photography | — | 2026-11-15 | no: no connection | — |
| w14 | <https://www.divephotoguide.com/underwater-photography-special-features/article/going-nudi--anilao/> | ph | Anilao | underwater photography | — | 2026-11-15 | yes | 0 |
| w15 | <https://www.divephotoguide.com/underwater-photography-travel/article/dauin-negros-visayas-philippines> | ph | Dauin | underwater photography | — | 2026-11-15 | yes | 0 |
| w16 | <https://uwphotographyguide.com/node/1775> | ph | Dauin | underwater photography | 2016-03-29 (article:published_time) | 2026-11-15 | yes | 0 |
| w17 | <https://divernet.com/content-marketing/critters-galore-at-muck-diving-hotspot-dauin/> | ph | Dauin | magazine | 2025-02-13 (article:published_time) | 2026-11-15 | yes | 0 |
| w18 | <https://divernet.com/scuba-diving/explore-the-bounty-of-dumaguete-in-the-philippines/> | ph | Dumaguete | magazine | 2023-04-29 (article:published_time) | 2026-11-15 | yes | 1 |
| w19 | <https://divernet.com/photography/anilao-underwater-shootout/> | ph | Anilao | photo contest | 2021-12-15 (article:published_time) | 2026-11-15 | yes | 0 |
| w20 | <https://www.wheninmanila.com/photos-these-are-the-winners-of-the-anilao-underwater-shootout/> | ph | Anilao | photo contest | 2022-01-06 (article:published_time) | 2026-11-15 | yes | 0 |
| w21 | <https://www.bluewaterdivetravel.com/article/dumaguete-trip-report-2024> | ph | Dumaguete | dive travel | 2024-07-30 (article:published_time) | 2026-11-15 | yes | 0 |
| w22 | <https://www.bluewaterdivetravel.com/article/visayas-philippines-trip-recap> | ph | Visayas | dive travel | 2016-04-23 (article:published_time) | 2026-11-15 | yes | 0 |
| w23 | <https://daimarsadventures.blogspot.com/2013/07/nudibranchs-of-puerto-galera-philippines.html> | ph | Puerto Galera | blog | 2013-07-13 (JSON-LD datePublished) | 2026-11-15 | yes | 5 |
| w24 | <https://www.nigelmarshphotography.com/blog-posts/puerto-galera-dl2024> | ph | Puerto Galera | magazine | — | 2026-11-15 | yes | 1 |
| w25 | <https://scandidivers.com/category/puerto-galera-marine-life> | ph | Puerto Galera | dive operator | — | 2026-11-15 | yes | 2 |
| w26 | <https://the-three-p.com/butterfly-seaslugs/> | ph | Romblon | dive operator | — | 2026-11-15 | yes | 1 |
| w27 | <https://www.scuba.com/blog/nudibranchs/> | general | — | top list | — | 2026-11-15 | no: HTTP 403 | — |
| w28 | <https://blog.padi.com/top-nudibranchs/> | general | — | top list | 2026-09-07 (article:published_time) | 2026-11-15 | yes | 6 |
| w29 | <https://blog.padi.com/5-facts-sea-bunny-slug/> | general | — | blog | 2016-01-25 (article:published_time) | 2026-11-15 | yes | 2 |
| w30 | <https://www.color-meanings.com/colorful-sea-slugs> | general | — | top list | 2022-07-26 (article:published_time) | 2026-11-15 | yes | 34 |
| w31 | <https://australiangeographic.com.au/?p=20663> | general | — | magazine | 2017-09-08 (article:published_time) | 2026-11-15 | yes | 4 |
| w32 | <https://livingoceansfoundation.org/small-things-nudibranches> | general | — | blog | 2014-11-21 (article:published_time) | 2026-11-15 | yes | 0 |
| w33 | <https://hakaimagazine.com/videos-visuals/nudibranchs-armed-and-fabulous/> | general | — | magazine | — | 2026-11-15 | yes | 0 |
| w34 | <https://www.uwphotographyguide.com/?p=11241> | general | — | photo contest | 2025-01-16 (article:published_time) | 2026-11-15 | yes | 0 |
| w35 | <https://mymodernmet.com/2024-ocean-art-photography-contest> | general | — | photo contest | 2025-01-20 (article:published_time) | 2026-11-15 | yes | 0 |
| x01 | <https://panoramadivers.com/en/blog/15-emblematic-nudibranchs-of-mauritius-part-1-3> | out | Mauritius | top list | — | 2026-11-15 | yes (not counted) | 3 |
| x02 | <https://nusapenida.org/bali-nusa-penida-diving-guide/nudibranchs-in-bali/> | out | Bali | dive guide | 2024-07-31 (JSON-LD datePublished) | 2026-11-15 | yes (not counted) | 6 |

The species each page names, and how (a name, an abbreviation, a nickname), are in `tools/seaslugs.json` `pages`.
