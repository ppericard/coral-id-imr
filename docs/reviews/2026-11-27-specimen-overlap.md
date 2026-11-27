# Specimen overlap between practice and the reserve (REE-319)

**Status: study, docs only,** on `origin/main` at `b8044b70`. From the repository's committed data files alone, through
the app's own allocation (`core.js` reserveOf) for 100 seeded player ids. No sheet read, no outside request, no image
search. Scripts and their inputs: [tools/studies/ree319/](../../tools/studies/ree319/README.md). Context: REE-58 (the
transfer analysis inside ReefID), REE-320 (the external comparison on unfamiliar specimens).

**The question.** A reserved observation (a player's held-out exam photo) is keyed by species and observation
(`treeObs`: the iNaturalist observation, else the `o` as written, else the file name). Where that key is missing or
does not name the specimen, another photo of the same specimen can stay in practice. How often, per subject, under
which overlap rule, and how many reserved items stay clean?

**Labels.** *Measured*: counted by the scripts on the committed files. *Inferred*: a reading of a measured proxy, not
checked on the images.

## 1. Identifiers in the pools (measured)

| Subject | Game files | Observation keys in exam units | iNaturalist id | Other `o` (a page) | No `o` (file name) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fish | 25,287 | 24,175 | 23,750 | 425 (FishBase pages) | 0 |
| Sea slugs | 5,088 | 5,088 | 5,088 | 0 | 0 |
| Corals | 1,541 | 1,143 | 1,026 | 1 | 116 (IMR lecture files) |

This confirms the issue's count and the Red Team note's point (every fish and sea slug file has an `o`; coral lecture
files may not). The Red Team note itself was not found in the repository; the counts were checked here instead.

## 2. Reserved observations and their practice partners (measured, 100 seeds)

Per seed, a reserved observation is *flagged* by a signal when a photo under another key, left in practice, shares it.

| Signal | What it compares | Fish | Sea slugs | Corals |
| --- | --- | ---: | ---: | ---: |
| Reserved per seed | | 2,444 | 689 | 117 |
| of which no `o` / a page `o` | | 0 / 23.4 | 0 / 0 | 8.0 (2–14) / 0 |
| file | same photo identity (`treePid`) | 0 | 0 | 0 |
| obs | same iNaturalist observation under another species | 0 | 0 | 0 |
| pic | same source picture (iNaturalist photo id or `src`) | 0 | 0 | 0 |
| dup | a near-identical pair in `data/dups.json` | 0 | 0 | 0.96 (0–2) |
| slide | coral lecture file, same deck page, same genus | – | – | 5.9 (1–11) |
| sess100 | same observer and species, observation ids ≤ 100 apart | 131 (111–156) | 29.5 (18–38) | 9.6 (4–16) |
| sess10k | the same, ≤ 10,000 apart | 207 | 34.6 | 29.5 |
| page | same Corals of the World factsheet, same genus | – | – | 1.1 (0–3) |
| observer | same observer and species, any time | 1,002 | 104 | 62 |

Means per seed (min–max). Over the 100 seeds, 40 distinct coral files with no `o` were reserved at least once (the
issue's figure, reproduced); 33 of them had a same-slide or same-factsheet partner in practice in some seed. The two
`dup` pairs (one *Acropora*, one *Plerogyra*) are the only image-judged near-duplicates that crossed. Of the fish
`sess100` pairs, 257 of 1,906 are consecutive observation ids; of the sea slugs', 82 of 252.

## 3. Reserved items left clean, per rule (measured)

Clean: no practice partner under any signal of the tier or below. Mean per seed, share of the reserve.

| Tier | Signals | Fish | Sea slugs | Corals |
| --- | --- | ---: | ---: | ---: |
| T0, the key in force | file, obs | 2,444 (100%) | 689 (100%) | 117 (100%) |
| T1, same picture | + pic, dup | 2,444 (100%) | 689 (100%) | 116.0 (99.2%) |
| T2, specimen proxies | + slide, sess100 | 2,313 (94.6%) | 659.6 (95.7%) | 100.5 (85.9%) |
| T3, loose | + sess10k, page | 2,237 (91.5%) | 654.4 (95.0%) | 81.5 (69.6%) |
| T4, any shared observer | + observer | 1,442 (59.0%) | 584.6 (84.8%) | 48.8 (41.7%) |

**Reading (inferred).** T0 and T1 overlap is nil for fish and sea slugs: their keys are iNaturalist observations and
no source picture is reused. The confirmed coral crossings are the two near-duplicate pairs. T2 is the likely range of
real same-specimen crossings: a lecture slide's crops and an observer's consecutive observations of one species are
often one colony or animal, but not always (a school, two colonies on one slide). T3 and T4 nominate review pairs; a
shared observer certifies nothing. The FishBase page keys group every photo of a page under one key, so they are never
split across the pools (conservative); they cannot be checked further from the files.

**Controls (measured, `fixture.js`).** On one unit of 45 specimens with a wide and a macro file each: with the
identifier, 15 reserved, 0 with a practice sibling; without it, 15 reserved, all 15 with one (the issue's failure);
unique files without identifiers, 15 reserved, 0; two specimens sharing a FishBase page stay under one key.

## 4. What a transfer test on new specimens can use today, and what it needs

- **Today (measured basis):** fish and sea slug reserved answers at T1 are clean of the same observation and the same
  picture. Coral reserved answers with an iNaturalist key (about 109 of 117 per seed) are too, except the two `dup`
  pairs. REE-58's primary analysis can run on those, with the coral filename-keyed items (about 8 per seed) left out or
  analysed apart.
- **Sensitivity (inferred):** dropping the T2-flagged items removes about 5% of fish and sea slug reserved items and
  14% of corals; the analysis should report it beside the primary. A T4 drop is too coarse to be a primary rule.
- **What it needs:** a specimen key for the 116 coral lecture files (the slide grouping is a ready candidate, a curator
  confirms it), the `dup` pairs resolved (Keep/Exclude in the admin), and observation dates and places for the session
  proxy (not in the committed files; fetching them is a separate decision). An image near-duplicate pass over fish and
  sea slugs is not possible from the repository (their photos are not in it; `tools/find_dups.py` runs on the corals).
  Truly unfamiliar specimens for REE-320 need a manifest drawn outside every game pool, not the reserve.

## 5. Limits and what is left

Not reproduced: `app.js` treeCurate's cards (Pierre's picks stand in), the sheet's runtime overrides, real players'
ids. The candidate pairs (file names) are in the `--out` file for a private curator review; none is classified here.
Options after that review (REE-319's own list): backfill a verified key, mark unverifiable items for sensitivity or
exclusion in the analysis, or keep the selection and qualify the conclusion. A change to reserve rules or progress is a
separate product decision.
