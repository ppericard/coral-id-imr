# Sea slugs, step 1: the species list, the stars and a proposed circle 1 (2026-11-15)

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
- **The stars set** is the `stars.size` best scores, then Pierre's `add` and `remove`. Its own field (`star`), never an
  order: the opening order stays commonness (Q369 c).
- **A stability check**: the set is recomputed without each site in turn. The file lists the sites whose removal changes
  it, with how many species change (`leaveOneSiteOut`), and the stars that every such set keeps (`starsCore`).

### 1.6 The circles

- **Circle 1** = the stars, plus the most common species (all groups together) up to `circles.one`.
- **Later circles** = the rest, by commonness, in blocks of `circles.next`, and the remainder last.
- Written into the file as `proposal` with the status "proposal for Pierre's review (Q369); not used by the app", and
  per species as `circle`, `star` and `rank` (commonness rank over all groups).

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
  - iNaturalist's English name (`en`): 38 of the 45 species of the proposed circle 1;
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
| 8 | *Nembrotha lineolata* | Nudibranchia | 0.646 | 0.61 (1,673) | 0.68 (2) | 5 | ★ |
| 9 | *Goniobranchus kuniei* | Nudibranchia | 0.640 | 0.60 (1,428) | 0.68 (2) | 21 | ★ (core) |
| 10 | *Nembrotha chamberlaini* | Nudibranchia | 0.640 | 0.60 (1,422) | 0.68 (2) | 4 | ★ (core) |
| 11 | *Nembrotha milleri* | Nudibranchia | 0.616 | 0.55 (788) | 0.68 (2) | 19 | ★ |
| 12 | *Halgerda batangas* | Nudibranchia | 0.612 | 0.54 (730) | 0.68 (2) | 8 | ★ |
| 13 | *Phestilla melanobrachia* | Nudibranchia | 0.585 | 0.49 (376) | 0.68 (2) | 92 | ★ |
| 14 | *Janolus savinkini* | Nudibranchia | 0.581 | 0.48 (337) | 0.68 (2) | 140 | ★ |
| 15 | *Jorunna funebris* | Nudibranchia | 0.577 | 0.72 (6,682) | 0.43 (1) | 16 | ★ |
| 16 | *Nembrotha cristata* | Nudibranchia | 0.563 | 0.69 (4,685) | 0.43 (1) | 18 | ★ |
| 17 | *Thorunna florens* | Nudibranchia | 0.561 | 0.44 (207) | 0.68 (2) | 220 | ★ |
| 18 | *Chelidonura varians* | Cephalaspidea | 0.558 | 0.69 (4,181) | 0.43 (1) | 30 | ★ |
| 19 | *Melibe colemani* | Nudibranchia | 0.555 | 0.68 (3,851) | 0.43 (1) | 96 | ★ |
| 20 | *Dendrodoris guttata* | Nudibranchia | 0.551 | 0.42 (164) | 0.68 (2) | 223 | ★ |
| 21 | *Phyllidia varicosa* | Nudibranchia | 0.535 | 0.64 (2,376) | 0.43 (1) | 7 | — |
| 22 | *Hypselodoris apolegma* | Nudibranchia | 0.531 | 0.63 (2,162) | 0.43 (1) | 28 | — |
| 23 | *Chromodoris magnifica* | Nudibranchia | 0.515 | 0.60 (1,460) | 0.43 (1) | 11 | — |
| 24 | *Hypselodoris variobranchia* | Nudibranchia | 0.509 | 0.59 (1,257) | 0.43 (1) | 39 | — |

### 3.4 The stars set, and how stable it is

- **Proposed: the 20 best scores** (`stars.size`). 18 nudibranchs, 1 sacoglossan, 1 headshield slug **[measured]**.
- **Stable core.** 8 of the 20 stay in the set whichever single site is left out: *Costasiella kuroshimae*,
  *Hexabranchus sanguineus*, *Doriprismatica atromarginata*, *Thecacera pacifica*, *Chromodoris willani*, *Nembrotha
  kubaryana*, *Goniobranchus kuniei*, *N. chamberlaini*.
- **The other 12 depend on one site.**
  - Leaving out color-meanings.com changes 7 of the 20. *Janolus savinkini*, *Thorunna florens* and *Dendrodoris
    guttata* (few views, rarely met) are stars only through that list plus one other page.
  - Leaving out xray-mag.com changes 4, padi.com 2, and each other site at most 1.
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

## 4. The proposed circle 1

### 4.1 Size: 45 species (the 20 stars + the 25 most common other species)

**[measured, then judged]**:
- **Coverage.** The 25 most common species hold 32% of the country's observer-species records; the proposed 45 hold 42%.
  The 45 most common would hold 45%, the 60 most common 53%. Around rank 45 each further species adds about 0.5%, and
  the curve keeps flattening.
- **Every star is in**, as Q369 (a) asks. 10 of the 20 stars are common species anyway (common rank 25 or better).
  Circle 1 is the 20 stars plus the 25 most common other species, so its common part runs to rank 36.
- **Breadth.** 16 families, 27 genera: enough families for a family level, and far smaller than the fish's circle 1 (28
  families, 98 genera, 469 species). A new subject starts small.
- **Photos.** 45 species × about 20 candidates is about 900 photos to judge, against the study's 1,500 estimate for 50
  species × 30 (§5).
- **Groups.** 39 nudibranchs, 3 sacoglossans (*Costasiella kuroshimae*, *Elysia marginata*, *Thuridilla lineolata*), 2
  headshield slugs (*Chelidonura amoena*, *C. varians*) and 1 sidegill slug (*Pleurobranchus forskalii*). No sea hare:
  the most common, *Dolabella auricularia*, opens in circle 2.
- **Near Dauin.** 40 of the 45 are seen near Dauin. The 5 that are not are all stars: *Jorunna parva*, *Phestilla
  melanobrachia*, *Janolus savinkini*, *Thorunna florens*, *Melibe colemani*.
- **Later circles** (`circles.next`): circle 2 holds the next 60 by commonness, circle 3 the next 100, circle 4 the last
  247. Each by commonness only, the rule this PR proposes (§6, question 3).

### 4.2 The table

Stars first (by score), then the common species (by commonness rank). Photos: Research Grade observations; in the
Philippines, each counted once by its best photo licence (open = CC0 / CC BY, NC = CC BY-NC); "world" (the Philippines
included) counts the observations with at least one photo of that licence, so an observation can count in both. Juvenile:
observations annotated "Life Stage: Juvenile". All **[measured]**.

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
| 14 | *Janolus savinkini* | Nudibranchia | Janolidae | 140 | 26 | no (1) | ★ 0.581 | 1 / 35 | 2 / 85 | 0 / 0 |
| 15 | *Jorunna funebris* | Nudibranchia | Discodorididae | 16 | 153 | yes (42) | ★ 0.577 | 15 / 223 | 177 / 1,375 | 1 / 10 |
| 16 | *Nembrotha cristata* | Nudibranchia | Polyceridae | 18 | 143 | yes (53) | ★ 0.563 | 25 / 224 | 65 / 675 | 0 / 0 |
| 17 | *Thorunna florens* | Nudibranchia | Chromodorididae | 220 | 13 | no (0) | ★ 0.561 | 0 / 6 | 8 / 93 | 0 / 1 |
| 18 | *Chelidonura varians* | Cephalaspidea | Aglajidae | 30 | 98 | yes (12) | ★ 0.558 | 13 / 88 | 29 / 260 | 0 / 1 |
| 19 | *Melibe colemani* | Nudibranchia | Tethydidae | 96 | 38 | no (0) | ★ 0.555 | 2 / 80 | 7 / 102 | 0 / 0 |
| 20 | *Dendrodoris guttata* | Nudibranchia | Dendrodorididae | 223 | 12 | yes (2) | ★ 0.551 | 0 / 13 | 4 / 155 | 0 / 0 |
| 21 | *Chromodoris annae* | Nudibranchia | Chromodorididae | 1 | 262 | yes (51) | — | 69 / 823 | 213 / 1,612 | 0 / 0 |
| 22 | *Hypselodoris tryoni* | Nudibranchia | Chromodorididae | 6 | 169 | yes (28) | — | 16 / 272 | 138 / 1,748 | 1 / 1 |
| 23 | *Phyllidia varicosa* | Nudibranchia | Phyllidiidae | 7 | 165 | yes (31) | — | 18 / 311 | 286 / 2,685 | 0 / 0 |
| 24 | *Pteraeolidia semperi* | Nudibranchia | Facelinidae | 9 | 162 | yes (38) | — | 30 / 312 | 267 / 3,283 | 0 / 10 |
| 25 | *Chromodoris lochi* | Nudibranchia | Chromodorididae | 10 | 158 | yes (12) | — | 11 / 301 | 178 / 1,324 | 0 / 0 |
| 26 | *Chromodoris magnifica* | Nudibranchia | Chromodorididae | 11 | 157 | yes (26) | — | 21 / 268 | 52 / 742 | 0 / 0 |
| 27 | *Phyllidia ocellata* | Nudibranchia | Phyllidiidae | 12 | 155 | yes (20) | — | 21 / 230 | 204 / 1,781 | 0 / 0 |
| 28 | *Goniobranchus geometricus* | Nudibranchia | Chromodorididae | 13 | 155 | yes (30) | — | 22 / 289 | 81 / 1,379 | 0 / 1 |
| 29 | *Phyllidia coelestis* | Nudibranchia | Phyllidiidae | 14 | 154 | yes (17) | — | 30 / 243 | 100 / 1,054 | 0 / 0 |
| 30 | *Phyllodesmium briareum* | Nudibranchia | Myrrhinidae | 15 | 154 | yes (25) | — | 16 / 234 | 37 / 384 | 0 / 0 |
| 31 | *Phyllidia elegans* | Nudibranchia | Phyllidiidae | 17 | 149 | yes (17) | — | 17 / 201 | 166 / 1,063 | 0 / 0 |
| 32 | *Ardeadoris egretta* | Nudibranchia | Chromodorididae | 20 | 126 | yes (15) | — | 9 / 115 | 13 / 226 | 0 / 0 |
| 33 | *Chelidonura amoena* | Cephalaspidea | Aglajidae | 22 | 120 | yes (13) | — | 14 / 176 | 48 / 466 | 0 / 0 |
| 34 | *Elysia marginata* | Sacoglossa | Plakobranchidae | 23 | 120 | yes (24) | — | 22 / 213 | 61 / 904 | 0 / 1 |
| 35 | *Caloria indica* | Nudibranchia | Facelinidae | 25 | 113 | yes (37) | — | 18 / 184 | 144 / 1,079 | 0 / 1 |
| 36 | *Thecacera picta* | Nudibranchia | Polyceridae | 26 | 112 | yes (35) | — | 25 / 203 | 30 / 339 | 0 / 0 |
| 37 | *Goniobranchus coi* | Nudibranchia | Chromodorididae | 27 | 111 | yes (24) | — | 10 / 120 | 46 / 551 | 0 / 1 |
| 38 | *Hypselodoris apolegma* | Nudibranchia | Chromodorididae | 28 | 105 | yes (4) | — | 11 / 118 | 46 / 287 | 0 / 1 |
| 39 | *Tambja morosa* | Nudibranchia | Polyceridae | 29 | 100 | yes (14) | — | 9 / 137 | 70 / 944 | 0 / 1 |
| 40 | *Phyllidia picta* | Nudibranchia | Phyllidiidae | 31 | 96 | yes (14) | — | 13 / 133 | 92 / 809 | 0 / 0 |
| 41 | *Pleurobranchus forskalii* | Pleurobranchida | Pleurobranchidae | 32 | 95 | yes (22) | — | 3 / 130 | 53 / 666 | 5 / 15 |
| 42 | *Coryphellina exoptata* | Nudibranchia | Flabellinidae | 33 | 92 | yes (5) | — | 10 / 109 | 119 / 1,073 | 0 / 0 |
| 43 | *Hypselodoris bullockii* | Nudibranchia | Chromodorididae | 34 | 90 | yes (4) | — | 7 / 117 | 60 / 661 | 0 / 0 |
| 44 | *Thuridilla lineolata* | Sacoglossa | Plakobranchidae | 35 | 85 | yes (30) | — | 8 / 165 | 21 / 285 | 0 / 0 |
| 45 | *Reticulidia halgerda* | Nudibranchia | Phyllidiidae | 36 | 84 | yes (8) | — | 4 / 95 | 11 / 208 | 0 / 0 |

## 5. Photos: can each species be played?

### 5.1 Supply for the proposed circle 1

**[measured]**, Research Grade observations with a CC0, CC BY or CC BY-NC photo (rule P4: the photos of one question come
from one observation). The world counts add the open and the NC columns, an upper bound since one observation can hold
both:
- **Every one of the 45 has 20 or more worldwide**; the fewest are *Janolus savinkini* (2 open, 85 NC), *Thorunna florens*
  (8, 93), *Melibe colemani* (7, 102). Abroad is allowed: every species here is confirmed in the Philippines (rule C8).
- **From the Philippines alone** (each observation counted once): 43 of 45 have 12 or more, 40 of 45 have 20 or more.
  Below 20: *Jorunna parva* (5), *Thorunna florens* (6), *Hexabranchus sanguineus* (13), *Dendrodoris guttata* (13),
  *Thecacera pacifica* (15).
- **Open licences only (CC0 / CC BY)**, worldwide: 38 of 45 have 12 or more. Below 12: *Janolus savinkini* (2),
  *Dendrodoris guttata* (4), *Melibe colemani* (7), *Jorunna parva*, *Thecacera pacifica*, *Thorunna florens* (8 each),
  *Reticulidia halgerda* (11). Six of the seven are stars: the sought-after species lean on CC BY-NC, as the study found.
- **So every species of circle 1 can be played** with CC BY-NC photos, the fish's licence set. With open licences only, 7
  would be thin (ROADMAP "The app as a generic product": NC photos cannot go into a paid product).

### 5.2 Age variation

- **iNaturalist's annotations are sparse.** Worldwide, only 225 Research Grade observations of the 452 species are
  annotated "Juvenile", out of about 147,000 **[measured]**.
  - In circle 1: 18 of the 45 species have at least one juvenile-annotated observation, and 3 have 10 or more:
    *Pleurobranchus forskalii* (15), *Pteraeolidia semperi* (10), *Jorunna funebris* (10).
  - In the Philippines, 6 of the 45 have one or more (*P. forskalii* 5).
  - An annotation says a juvenile was photographed, not that it looks different.
- **Public sources for a juvenile that looks different**: two leads, **neither verified** (one search; the papers were
  not read):
  - ***Hexabranchus***: Tibiriçá et al. 2023 (*Organisms Diversity & Evolution*, doi:10.1007/s13127-023-00611-0), the
    revision that split the Spanish dancer. A search result's excerpt of it says "the ontogeny of color pattern is
    discussed" and "young juveniles are gray with a marginal white line", without saying which of its species
    **[read: a search excerpt only; the publisher's page asks for a login]**.
  - ***Jorunna funebris***: Kilburn & Fraser 2017, "The proposal that nudibranch *Jorunna funebris* 'juvenile' is
    precocious, a distinct phenotype or a new species" (Sheffield Hallam University repository). The title itself asks
    whether that form is a juvenile at all **[read: the title only]**.
  - Nothing was found for the other 43. That is not evidence that they have no distinct juvenile.
- **So today: 0 species with a verified distinct juvenile, 2 leads** (*Hexabranchus sanguineus*, *Jorunna funebris*),
  and *Pleurobranchus forskalii* worth a look (the most juvenile annotations).

### 5.3 A photo target per species (a proposal)

The fish today (docs/FISH_PATH.md "Photos per species"): start at 8 observations a species (12 for the PDF's 24 most
sighted), game cap 20; candidates capped at 30 for a stable species, +10 per extra phase, at most 60.

**Proposed for sea slugs** **[guess, from the counts above]**:

| | Fish (today) | Sea slugs (proposed) |
|---|---|---|
| Start (a species can be played) | 8 | **6** |
| Game cap | 20 | **12** |
| Candidates, stable species | 30 | **20** |
| Per distinct juvenile form | +10 per phase | **+5**, only where a source documents a different-looking juvenile (2 leads today, §5.2) |
| Most | 60 | **30** (very variable colours: *Chromodoris*, *Phyllidia*) |

Why fewer than the fish:
- **Fewer views.** A sea slug is photographed from above or from the side, crawling. A fish is photographed in profile,
  from the front, turning, partly hidden.
- **No sex phases.** Sea slugs are simultaneous hermaphrodites **[guess: textbook biology, not checked against a source
  here]**, so there are no male, female or terminal phases to fill. Juveniles are rarely photographed (§5.2).
- **The supply fits.** At 20 candidates, 40 of the 45 have enough from the Philippines alone, and all 45 with photos from
  abroad.

Why not lower: colour varies within some species. Layton et al. (2018) found stable colour patterns in only 5 of 39
*Chromodoris* taxa, and Stoffels et al. (2016) report "high intra-specific colour variation" in Phyllidiidae (both cited
in the study, §5.2 and §6.3). Those two genera hold 9 of the 45 (*Chromodoris* 4, *Phyllidia* 5), hence the higher cap
for them.

## 6. Open questions for Pierre

Only what is his; each with a recommendation.

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
