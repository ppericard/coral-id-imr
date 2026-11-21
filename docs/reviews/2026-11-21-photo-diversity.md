# Photo diversity per unit: distinct photos against how often the draw asks each unit (REE-189)

Status: study and figures for REE-189's second part; the repeat's fix is #1376. Read-only figures, with the tool change and
the refill of this PR. No real names (rule D2): "an RA" is the player who reported.

## Why

Pierre, 2026-11-21 18:12, relaying an RA's feedback: «elle trouvait qu'il y avait beaucoup de redondance dans les
photos pour certaines espèces, ou genres, ou familles. Typiquement … les rémoras, les scorpionfish … Être sûr qu'on a
assez de diversité dans les photos pour certains genres ou familles qui typiquement sont couverts par très peu
d'espèces. Donc en fait, il faudrait rajouter dynamiquement des photos pour des familles qui globalement ont très peu
d'espèces.» Her in-app report the same day: a remora photo «Seen this photo like 5 times in five minutes».

## How it was measured

- **The pool**: the real app on the real data (`photoSet`'s own lists, `gamePics` and `gamePhotoOk`, every view, the
  reserve included: the pool before any player's own reserve), for every unit of the three subjects, on a new player.
  - *Observations*: distinct observations (fish: one photo a question, so a second photo of one observation is no
    new picture to a player).
  - *Easy obs.*: observations with an adult photo of ease 4 or 5, at full weight in the draw.
  - *Rotated before Open Water*: the observations a player meets about 9 questions in 10 until the unit reaches Open
    Water. That is those at or above the bar `RARE` sets (ease 4, or the unit's 3rd easiest observation when it has
    fewer: #1376). The corals have no judged ease, so every photo rotates.
- **How often the draw asks it**: the sync sheet's Answers tab, read-only through the Sheets connector on 2026-11-21 at
  about 18:30 Manila, photo quiz answers only (mode `quiz…`), aggregated per unit. 7,445 rows in all: 3,920 corals,
  3,348 fish, 168 sea slugs.
- **Near repeats**: an answer on a photo the same player was shown on the same unit in the quarter of an hour before. The
  log names the first photo of a question, so a coral question's other views are not counted: the coral figure is a
  lower bound. Counts, not rates, where the answers are few.
- **Fetchable**: iNaturalist's API v2, Research Grade, wild, with photos, licences CC0, CC BY or CC BY-NC, in the
  Indo-West Pacific box of `tools/fetch_fish.py` (`IWP`), one count per species, paced at one request a second.
  - A count is observations, not usable photos: the pass sets some aside.
  - The yield is the share of judged candidates that end as sure adds, and as easy adults.

## The repeat (part 1, #1376)

- Remoras is one species with 43 game photos on 38 observations. Only 2 of them are easy adults; a third easy photo is
  a juvenile.
- The draw counted the 3 easiest by photo, so the juvenile it holds back until Open Water set the bar at 4. The two
  adults took about 90% of the family's questions.
- The RA's log on 2026-11-21: 7 Remoras questions from 14:53 to 15:07, one at ease 1, then the two adults 3 times each.
- Fixed in #1376: the 3 easiest are counted by observation the draw can show. Remoras now rotates 12 observations
  before Open Water.

## Fish families (the unit rank), thinnest rotation first

65 families. Median 181 photos, minimum 28. In the log: 3,184 answers on a family, 67 of them near repeats.

| Family | Species | Photos | Observations | Easy obs. | Rotated before Open Water | Answers | Near repeats |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flying Gurnards | 1 | 40 | 38 | 3 | 3 | 21 | 0 |
| Tunas & Mackerels | 2 | 41 | 41 | 3 | 3 | 14 | 3 |
| Trumpetfishes | 1 | 42 | 41 | 4 | 4 | 35 | 0 |
| Eel-tailed Catfishes | 1 | 48 | 46 | 4 | 4 | 13 | 0 |
| Cornetfishes | 1 | 43 | 39 | 5 | 5 | 17 | 2 |
| Shrimpfishes | 2 | 71 | 69 | 5 | 5 | 26 | 0 |
| Stargazers | 1 | 28 | 27 | 2 | 6 | 22 | 7 |
| Sea Moths | 1 | 44 | 43 | 2 | 6 | 21 | 1 |
| Convict Blennies | 1 | 47 | 43 | 2 | 7 | 9 | 1 |
| Morays | 15 | 540 | 520 | 8 | 8 | 25 | 1 |
| Stonefishes | 2 | 68 | 65 | 1 | 10 | 18 | 1 |
| Needlefishes | 1 | 33 | 32 | 2 | 11 | 14 | 1 |
| Waspfishes | 2 | 67 | 65 | 11 | 11 | 23 | 4 |
| Remoras | 1 | 43 | 38 | 2 | 12 | 14 | 6 |
| Moorish Idol | 1 | 40 | 40 | 12 | 12 | 61 | 1 |
| Requiem Sharks | 2 | 127 | 123 | 12 | 12 | 27 | 0 |
| Scorpionfishes | 5 | 167 | 150 | 13 | 13 | 23 | 0 |
| Sweepers | 1 | 32 | 30 | 15 | 15 | 28 | 1 |
| Barracudas | 4 | 140 | 125 | 18 | 18 | 42 | 3 |
| Ghost Pipefishes | 5 | 161 | 149 | 18 | 18 | 21 | 0 |

The other 45 families rotate 19 to 812 observations before Open Water; their near repeats are 0 to 5 each.

**Scorpionfishes are not thin by these figures**: 5 species, 150 observations, 13 easy, rotated 13; 23 answers and no
near repeat. In the harness of #1376 a player under Open Water saw 6.9 distinct photos in 7 Scorpionfish questions. The
RA may have meant Stonefishes or Waspfishes (65 observations each: 1 and 11 easy, 1 and 4 near repeats), or the
species level. Her species questions are few in the log, so this cannot be told from it.

Fish genera and species are never capped by `RARE` (only the family rank is), so every observation of theirs rotates.
Genera: median 68 photos, minimum 5. Species: median 36, a few with none in play (their genus or family shows them).

## Sea slugs (genera) and corals (genera)

- **Sea slugs**: 78 genera, median 26 photos (a cap of 12 to 26 per genus by design), and 168 quiz answers in the log.
  - The thinnest rotations before Open Water: Notobryon (4 easy observations), Dolabella (5), Colpodaspis and
    Pteraeolidia (7).
  - Near repeats: 5 in all, one each on 5 genera.
  - Nothing is added here. The genus cap is set by design (`tools/fetch_seaslugs.py`, a decided cap per genus), and
    the log shows almost no repeats. The judging tool is the same (`judging_fish.py --subject seaslug`), should one be
    wanted.
- **Corals**: 45 genera, median 32 photos, minimum 8 (Anacropora). The corals have no judged ease, so `RARE` never holds
  a photo back. 3,920 quiz answers, 234 near repeats (6%, a lower bound).
  - The highest counts: Turbinaria 22 of 166 answers, Duncanopsammia 19 of 102, Halomitra 16 of 93, Danafungia 14 of
    87, Astrea 11 of 80.
  - These are small pools drilled hard, not a miscount: 13 to 31 observations a genus.
  - The coral candidates go through Pierre's own curation (`tools/fetch_local.py`, the coral judging brief), not the
    fish route, so nothing is added here. The thin genera's photo hunt is already his to-do (the coral photo sources
    study, 2026-11-05).

## What a refill can still find, and the yield

Research Grade observations in the Indo-West Pacific box under the accepted licences, per thin species (2026-11-21):

| Species (family) | Fetchable (IWP) | Of them in the Philippines |
| --- | ---: | ---: |
| Echeneis naucrates (Remoras) | 803 | 109 |
| Uranoscopus bicinctus (Stargazers) | 67 | 24 |
| Tylosurus crocodilus (Needlefishes) | 676 | 24 |
| Eurypegasus draconis (Sea Moths) | 365 | 142 |
| Dactyloptena orientalis (Flying Gurnards) | 397 | 90 |
| Rastrelliger kanagurta (Tunas & Mackerels) | 295 | 45 |
| Thunnus albacares (Tunas & Mackerels) | 55 | 7 |
| Aulostomus chinensis (Trumpetfishes) | 2,076 | 233 |
| Plotosus lineatus (Eel-tailed Catfishes) | 1,482 | 351 |
| Pholidichthys leucotaenia (Convict Blennies) | 166 | 64 |
| Opistognathus randalli (Jawfishes) | 149 | 50 |
| Fistularia commersonii (Cornetfishes) | 1,754 | 124 |

So the binding limit is the cap per species (Q36: 30, +10 a phase, at most 60), not iNaturalist.

**The yield** of the judging pass on these 12 species so far: 739 candidates judged, 401 sure adds, 21 of them easy
adults (3% of judged). The refill takes photos in a neutral order on purpose: no votes order, no quality filter (Pierre,
2026-11-08, Q284: «je ne veux pas que ça soit au coût de la variété»). So more candidates bring many more photos after
Open Water, but only about 1 easy adult in 30 for before it.

## What this PR changes

- **A family floor** (`tools/fetch_fish.py` `FAMILY_FLOOR` = 90, `family_cap`). The species of a teaching entry (a family)
  share at least 90 photos: 90 for a one-species family, 45 each for a two-species one. A species keeps its own cap of
  Q36 when that is larger. From three species on, nothing changes.
  - The 90 is three species' base cap. It is the integrator's call, easy to correct: one constant, and it only adds
    candidates.
- **The refill sees the raised cap.** An exhaustion record now keeps the cap it was made under. A record made under a
  smaller cap no longer blocks the species until its re-check (`RECHECK_DAYS`): the room the floor opened was never searched.
- **Easy observations are adults** (`easy_obs`). A juvenile or a phase photo no longer counts toward the 3 easy
  observations a species needs, since the draw holds it back before Open Water (#1376's miscount, on the refill's
  side).
- **The refill run of this PR** (`python3 tools/fetch_fish.py --refill --circle 1 --circle 2 --circle 3`, 2026-11-21)
  fetched the 17 species the floor opened: **+872 candidates**. Thunnus albacares found nothing more. Seven species were
  searched to the end for now: Shrimpfishes (*Aeoliscus*), Sweepers, Sea Moths, Flying Gurnards, Stargazers, Tunas
  (*Thunnus*) and Convict Blennies.
- **The judging pass of this PR** (`judging/FISH.md`) took first the families whose rotation before Open Water is 3
  or 4 observations: each easy adult there widens it.

  | Family (species) | Judged | Sure adds (in play at merge) | Easy adults among them | Rotated before Open Water |
  | --- | ---: | ---: | ---: | --- |
  | Tunas & Mackerels (*Rastrelliger kanagurta*) | 21 | 7 | 0 | 3 → 3 |
  | Flying Gurnards | 59 | 44 | 5 | 3 → 8 |
  | Trumpetfishes | 61 | 43 | 3 | 4 → 7 |
  | Eel-tailed Catfishes | 65 | 31 | 1 | 4 → 5 |
  | **Total** | **206** | **125** | **9** | |

  - Every easy adult was checked at 1,024 px (`judging_fish.py big`), and every count `o` photo of these species was
    looked at again. That check lowered one easy adult to 3, a school of mackerels in soft, dim light. A hazy yellow
    trumpetfish also went to 3. A trumpetfish beside a large lionfish became `k`, unsure, so it stays out. Five fish
    boxes were tightened.
  - `tools/fish_game.py --plan`: 125 photos to download, 9 tiles with them.
  - None of the new sure adds is a Needs ID or Pierre's own observation: all are Research Grade.
  - The rotations are counted on the whole pool. Each player's reserve (up to 15 observations a unit) can take a few
    easy ones out of their practice.

  The other 666 new candidates wait for the routine judging pass (`python3 tools/judging_fish.py todo`). For Remoras,
  Stargazers, Sea Moths, Needlefishes, Convict Blennies and Jawfishes, see "The cliff" below before judging.

## Left open

- **The cliff before Open Water** (fixed by #1382: docs/decisions/2026-11-21-rare-few-floor.md, `RARE.FEW` a floor of
  12 observations' worth). A family whose bar falls to 3 (2 easy adults or fewer) rotates every observation at
  ease 3 or more, while one with exactly 3 easy adults rotates only those 3. Measured on the repository's harness
  (`tests/rareease.js`: 20 observations at ease 3, 15 under), a player under Open Water:

  | Easy adults | 2 | 3 | 4 | 6 | 8 | 12 |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: |
  | Draws on the easy adults | 9% | 90% | 90% | 90% | 90% | 90% |
  | Observations drawn 3% of the time or more | 21 | 3 | 4 | 6 | 8 | 12 |
  | The most drawn observation | 5% | 34% | 24% | 17% | 12% | 8% |

  - So judging a third easy adult for Remoras (12 rotated today, after #1376) would take it back to 3. At the yield
    measured here, it needs about 10 more easy adults to break even.
  - The same holds for Stargazers (6), Sea Moths (6), Needlefishes (11), Convict Blennies (7) and Jawfishes (19).
  - Their new candidates are left unjudged here. Whether `RARE.FEW` (3) rises first is the integrator's decision: a
    learning constant, checked at level 1 or 2 (rule L11).
- **Easy photos before Open Water.** More candidates in a neutral order raise easy adults slowly (3% of judged).
  - A route aimed at them would be a change to the decided process. Examples: the refill reading iNaturalist's most
    faved first for a species short of easy adults, or the reference route's taxon photos for these species.
  - It is a question for Pierre, not taken here.
- **Home's watermark pass** (`judging/FISH.md` "Watermark"): the photos this PR puts in play need the next refill
  watermark pass, as after any refill.
- **Corals**: the near repeats on small genera (above) are the coral photo hunt's, outside this issue's fish route.
