# Photo capacity: what limits how many photos each subject takes in (2026-11-24)

Status: study, read-only, docs only (Linear REE-272, its "Next action" steps 1 to 4). Nothing was written to R2 or
deleted from it, no photo was judged (rule P7), no data file, curation or sheet was changed, and nothing was asked of
iNaturalist by the tools I ran (their `--plan` modes read the local cache only). Written on `origin/main` at 92822879.

Labels (rule W11): **[measured]** counted by a script on the R2 listing or on the files of `main`; **[read]** read in a
file, a rule, a decision or Linear; **[computed]** arithmetic on measured figures; **[guess]** a judgement or an
extrapolation; **[recall]** from memory, not checked here.

## Why

Pierre, 2026-11-24 13:50 Manila (REE-272): «J'ai l'impression qu'on traine des pieds pour ajouter des photos alors
qu'on a effectivement constaté qu'on en manquait. Est-ce que c'est parce qu'on est limité par le stockage en pratique?
Faut-il déjà commencé à faire évoluer une partie de nos solutions techniques?» And on his own photos: «en pratique
peut-être que les seuils eux-même ont besoin d'être relevés».

## 1. Answer first

**Storage is not what holds photos back today, for any subject.** R2 holds 7.5 GB (R2 dashboard screenshot shared by
Pierre, 2026-11-24 14:14), 7.29 GB in the object listing of 2026-11-21, against a 10 GB free tier: about 2.5 GB of
headroom, room for about 10,500 photos. It holds almost only photos in play. What binds differs by subject:

| Subject | What binds today | Evidence | Storage if lifted |
| --- | --- | --- | --- |
| Fish | **Supply under the source rules**, then judging (rule P7). Mostly not the caps: 421 species still have general room under their cap and their general searches found nothing more within the last month (`RECHECK_DAYS`), so a higher cap adds nothing for them. **Correction (REE-278):** for 216 of them iNaturalist holds enough to fill that room; the refill's records were wrong ([fish supply study](2026-11-24-fish-supply-past-cap.md), PR #1541, §5). For 221 others (91 whose open room is only a phase's, 130 not short) the supply past the cap is not measured. | Section 3.1 | About +0.3 GB (faved beyond the cap) to +0.9 GB (the `dup` extras that are another zoom or angle, findable from the codes) |
| Sea slugs | **The game cap of 12 photos a species** (Q377), then judging the 2,563 new extras (rule P7). 239 of the 271 units sit exactly at 12, and 2,074 judged photos wait behind the cap. | Section 3.2 | +0.42 GB at a cap of 20, +0.48 GB with no game cap |
| Corals | **The sorting in the admin and judging** (rule P7): candidates enter play only through Pierre's admin and Publish, and 445 of the 1,244 waiting are not judged yet. Then supply for the thin genera (Anacropora, Astrea). | Section 3.3 | At most +0.45 GB if every waiting candidate entered |

**The storage limit comes into view with this round of intake, not before.** The intake already decided or pending (the
2,563 sea slug extras, the fish refills, Pierre's own photos, the waiting corals) adds at most about 1.4 GB, to about
8.9 GB; with the sea slug game cap lifted and the fish `dup` extras found from the codes, about 2.8 GB, to about 10.3 GB
[computed, section 4]. We cross 10 GB only if nearly all of it lands; past 10 GB the cost is $0.015 per GB-month, cents a month
(section 5). The operations (writes and reads) are far under their free allowances (section 5.1). So a technical change to storage is not
needed to lift today's limits, but one choice (pay a few cents a month, or slim the 1600 px files) should be made before
the fish `dup` pass and the sea slug cap both land. Section 5 gives the options and their costs; any spending is
Pierre's decision.

## 2. R2 today (step 1)

### 2.1 How it was measured

- **The listing [measured].** The read-only workflow "R2 unused files" (run 44893917673, 2026-11-21 10:21 UTC, on
  main@bca4422; `tools/r2_list.sh`, `rclone lsjson`) lists every object of the bucket with its size. Agents never hold the
  R2 keys (they live only in GitHub Actions), so I downloaded that run's artifact `r2-unused` (read-only, `gh run
  download`) and counted it with a scratch script. The artifact expires on about 2026-12-05 (`retention-days` in the workflow). The
  workflow can be dispatched again by hand for a fresh figure.
- **The R2 dashboard [measured].** Pierre shared a screenshot of the bucket's Metrics (last day) on 2026-11-24 14:14
  Manila: storage, data retrieved and operations (section 2.4 and 5.2).
- **The data files [measured].** `tools/photos.py` `records`, `online` and `tiles` on today's `main` give which photo
  lives on R2 and in which file.
- **The tools' plans [measured].** `python3 tools/fish_game.py --plan`, `python3 tools/seaslug_game.py --plan`,
  `python3 tools/fetch_fish.py --refill --plan --circle 1 --circle 2 --circle 3` (with and without `--beyond-cap`) and
  `python3 tools/fetch_local.py --plan`. Each reads the cache and writes nothing (`git status` stayed clean).
  `python3 tools/cand_gaps.py` ignored `--help` and ran its normal report, which may have asked iNaturalist live
  through `tools/inat.py` (paced, rule C7); its output is only cited for the two exhausted coral genera.
- **Sea slug game caps [measured].** A scratch script called `tools/seaslug_game.py` `build` on the real inputs with
  `photoTarget.gameCap` set to 16, 20, 30 and none, in memory, nothing written: the real rule for what is in play.

### 2.2 The bucket on 2026-11-21 [measured]

121,597 objects, **7,293,499,400 bytes: 7.29 GB, or 6.79 GiB**. Cloudflare's page does not say which "GB" its free tier
counts (section 5.1), so it is 68% or 73% of the free 10 GB.

| Subject | Photos (4 sizes each) | Tiles (`-x`) | Bytes | Mean per photo, 4 sizes |
| --- | ---: | ---: | ---: | ---: |
| Fish | 24,947 | 450 | 5.910 GB | 237 kB |
| Sea slugs | 3,140 | 2,037 | 0.766 GB | 232 kB |
| Corals (iNaturalist, Corals of the World) | 1,571 | 0 | 0.565 GB | 360 kB |
| Corals, IMR lecture photos (mirrored from `img/`) | 120 | 0 | 0.052 GB | 436 kB |
| **All** | **29,778** | **2,487** | **7.293 GB** | |

By file kind, all subjects: the 1600 px files are **4.49 GB (61.6%)**, 960 px 1.88 GB (25.8%), 480 px 0.67 GB (9.1%),
240 px 0.21 GB (2.9%) and tiles 0.05 GB (0.6%). The 1600 px share matches the AVIF study's 62-64%
([2026-11-15-avif-study.md](2026-11-15-avif-study.md) §4).

### 2.3 What is on R2 but not in play [measured]

- The listing's own report: 2 unused objects (two stale fish tiles, 36 kB), and 2,417 "doubtful" objects (109 MiB)
  kept off the unused list because a file still names them (judging files, docs, tests, curation) or Restore needs
  them. That is REE-6's list, waiting for Pierre's answer there.
- Against today's records, about 615 photos on R2 are in no game file: 176 fish photos named only as candidates, 276 fish
  photos no data file names, 126 sea slug photos named only as candidates, 37 coral photos no data file names. At the
  means above that is about 0.15 GB [computed].
- So **"store only the photos in play" is already what the pipeline does**: candidates stay remote on iNaturalist and
  FishBase (`r: 1`), and only photos put in play are downloaded (`tools/fish_game.py`, `tools/seaslug_game.py`,
  `tools/fetch_approved.py`) [read]. Cleaning up can free at most about 0.15-0.26 GB.

### 2.4 Since the listing, and today's estimate

- Since 2026-11-21: `fish-game.json` gained 736 photos on R2 and `fish-photos.json` 65; the tiles went from 2,487 to
  4,196 [measured]. At 237 kB a photo and 17 kB a tile, about +0.22 GB [computed].
- **Today: 7.5 GB [measured]**, R2 dashboard screenshot shared by Pierre, 2026-11-24 14:14 (bucket `coral-id-photos`,
  Metrics, the last day): average storage 7.5 GB, all Standard, 0 B Infrequent Access, flat from Nov 23 16:00 to Nov 24
  12:00 (GMT+8); data retrieved 0 B. It matches the listing plus the photos added since (7.29 + 0.22 = 7.51 GB
  [computed]), so the dashboard's GB are most likely decimal [guess]. Headroom: about 2.5 GB, about 10,500 more photos
  at 237 kB [computed].
- The path so far [read and measured]: about 6.3 GB on 2026-11-15 (AVIF study §4, a sample), 6-7 GB on 2026-11-16
  (Pierre, Q387), 7.29 GB on 2026-11-21 (listing), 7.5 GB on 2026-11-24 (dashboard).
- `tools/infra.json` still says 6.3 GB on 2026-11-15. The measured 7.29 GB is past the dashboard's 70% warning line
  (`tools/health.py`, `tools/brief.py`), which therefore does not warn [read]. Nothing in the upload pipeline stops at
  10 GB: `tools/r2_sync.sh` copies whatever is in play [read].
- `tools/fish_game.py` `KB_PER_PHOTO = 361` (a 24-photo sample) overstates a photo's four files by about half: the
  listing gives 237 kB for the fish and 232 kB for the sea slugs, and `tools/seaslug_game.py --plan` uses the same 361.
  So the plans' volume lines (8,895 MB for the fish, 1,063 MB for the sea slugs) are too high by about 50% [measured].

## 3. Caps, targets and what each subject's photos run into (step 3)

### 3.1 Fish

**Where each cap comes from [read]:**

| Cap or target | Value | Source |
| --- | --- | --- |
| Candidates per species (`fetch_fish.py` `cap_of`) | 30, +10 per extra phase, at most 60 | Q36 (Pierre, 2026-11-05) |
| A thin family's floor (`FAMILY_FLOOR`) | 90 photos shared over its species | Pierre, 2026-11-21 18:12 («rajouter dynamiquement des photos pour des familles qui globalement ont très peu d'espèces»), REE-189 |
| Extra photo of an observation (`EXTRA_W`) | weighs 0.5 against the cap | Q226 |
| Easy adults a species needs (`EASY_NEED`, `EASY_FAMILY`) | 3, or 12 shared over a thin family | REE-198 (integrator's choice, `fetch_fish.py`) |
| Faved observations beyond the cap (`BEYOND_PER`, `BEYOND_MAX`) | 3 per missing easy adult, at most 30 | REE-243, Pierre 2026-11-23 («Dans un deuxième temps si le jugement ne rempli pas assez»); the numbers are the integrator's call |
| Surprise-card species (`WINK_CAP`) | 5 | Q372 |
| In play | every candidate judged sure, no separate game cap | Q180, Q199 (`fish_game.py` `in_play`) |
| A refill re-searches an exhausted species | after a month (`RECHECK_DAYS`) | "No more candidates is no more candidates" (spec/photos.md; Q171) |

**What the photos run into [measured]:**

- In play: 25,230 photos over 662 species (5,772 of Pierre's adds, 17,312 candidates judged sure, 2,146 reference
  photos); a median of 36 per species (10th percentile 28, 90th 54).
- Candidates: 34,957; 34,718 judged, 239 waiting on 26 species. Of the judged ones 66.5% are in play. The rest: 9,284
  judged `dup` (the largest single filter), 2,280 `best` and 70 `alt` that are not sure (an unsure field, other species
  in view, out of the water...).
- The refill's own count (`--refill --plan`): 532 species are "short" (room under the cap, or short of easy adults).
  Without the faved route, **none can be refilled now: all 512 with room had every open part searched to the end
  within the last month.** That is not the same thing for all of them (`pick_short` remembers exhaustion per open part,
  and a raised cap voids the record):
  - **421 have general room left** (1,771 room units in all) and the general searches found nothing more: their supply
    under the source rules is exhausted below their cap. 65 of them are short of easy adults.
    **Correction (REE-278):** "found nothing more" overstates it. The [fish supply study](2026-11-24-fish-supply-past-cap.md)
    (PR #1541, §5) measured enough usable observations on iNaturalist to fill the open room of 216 of the 268 species
    whose room fits a new observation (the other 153 hold half a unit); only 52 are exhausted. The cause, checked on
    *Amphiprion clarkii*: the refill took a part that got nothing (half a unit of room, which no new observation fits)
    for one searched to the end, and kept the record when the judging pass and Pierre's rejections freed room since.
  - **91 have only a phase's room open** (82 juvenile, 11 female, 10 male: some have more than one): their general
    room is full, so how much iNaturalist holds past their cap is not known. 8 of them are short of easy adults.
  With `--beyond-cap`, 88 species short of easy adults get 627 room units for faved observations, 40 species a run.
- The real shortage is **93 species short of easy adults** (255 easy adult observations missing; 29 have none at all).
  65 of them have general room left that their general searches could not fill: raising the cap gives them nothing. 8
  have only a phase's room open; their supply past the cap is not measured.

**What raising a cap would add:**

- `BASE_CAP` or `MAX_CAP`: nothing for the 421 species whose general searches found nothing more under their cap. For
  the 221 others (91 with only a phase's room open, 130 not short), how much iNaturalist holds past the cap is not in
  the cache, so it is not measured here. Measuring it is one batched read of
  `observations/species_counts` over the 662 taxa (a handful of requests at one a second, rule C7) [guess on the count].
- The faved route (already decided, REE-243): at most 627 room units, so 627 to 1,254 photos (an extra photo weighs
  0.5) [computed bound]. Storage: at most +0.30 GB. Judging: those photos, under P7 per pass (the first 134 got his
  OK on 2026-11-24 06:45).
- The `dup` extras under the new definition (Pierre, 2026-11-24 06:45, «ok»: another zoom, framing, angle or pose is an
  `alt`; [decision](../decisions/2026-11-24-what-a-duplicate-is.md)): about 5,240 of the 9,284 are another zoom or
  angle, 3,844 of them findable from the recorded codes with no agent
  ([2026-11-23-what-a-duplicate-is.md](2026-11-23-what-a-duplicate-is.md) §1). Storage: +0.91 GB for the 3,844, +1.24 GB
  for 5,240 [computed]. The pass's P7 request is in REE-257.

**Judging cost [read].** The earlier fish batches of 130-390 candidates took one to two agent sessions each (REE-243's
P7 request); the sea slug box pass read about 8,000 images, about half a morning's quota (INTEGRATOR.md "Quota",
2026-11-20). Rule P7 asks Pierre's OK for any pass over 100 photos, scripting first.

### 3.2 Sea slugs

**Where each cap comes from [read]:**

| Cap or target | Value | Source |
| --- | --- | --- |
| Candidates per species (`photoTarget.candidates`) | 20 | Q377 (Pierre, 2026-11-15: «oui à tout»), "revisit after the first judging pass" (`tools/seaslugs.json` `why`) |
| Documented juvenile form (`perJuvenileForm`) | +5 | Q377 |
| Ceiling, and very variable genera (`max`, `maxGenera`) | 30 (Chromodoris, Phyllidia) | Q377; genus-level lists the integrator's call (2026-11-17) |
| **In play per species (`gameCap`)** | **12** | Q377 |
| Fewest to play (`start`) | 6 | Q377 |
| Every photo of an observation | extras weigh 0.5 | Pierre, 2026-11-24 06:45 ([decision](../decisions/2026-11-24-seaslug-every-photo.md)) |

**What the photos run into [measured]:**

- In play: 3,014 photos on 271 units (species and genus-level lists), all on R2. **239 units sit exactly at the game cap
  of 12.**
- Candidates: 7,726. 5,163 are judged (one photo per observation, before 2026-11-24); 2,149 judged photos are not in
  play, most of them behind the game cap. 2,563 are the extras the every-photo change added today, none judged.
- REE-272 notes 203 of 205 species lists over their candidate target, so the candidate target does not bind either.

**What raising the game cap would add [measured with `seaslug_game.build`; storage computed at 232 kB]:**

| Game cap | Photos in play | Added | Units at the cap | Easy (ease 4-5) in play | Storage added |
| --- | ---: | ---: | ---: | ---: | ---: |
| 12 (today) | 3,014 | | 239 | 2,555 | |
| 16 | 3,958 | +944 | 233 | 2,839 | +0.22 GB |
| 20 | 4,835 | +1,821 | 196 | 2,928 | +0.42 GB |
| 30, or none | 5,088 | +2,074 | 18 / 0 | 2,950 | +0.48 GB |

- **No judging is needed**: these photos are already judged sure. The fish have no game cap (every sure candidate
  plays), so the sea slugs' 12 is a per-subject value from Q377, not a shared rule.
- The reserve design measured that a sea slug species can lose 4 of its about 12 observations to the per-player
  reserve ([2026-11-23-reserve-from-species-up.md](2026-11-23-reserve-from-species-up.md) §2) [read]: the cap is what
  makes them the thinnest subject.
- Judging the 2,563 extras: at 130-390 photos a session, about 7 to 20 agent sessions [computed from the fish batches;
  guess for the sea slugs]. Storage at most +0.59 GB if all entered, much less in practice (16% of the fish extras
  reached play under the old `dup` reading) [computed bound].

### 3.3 Corals

**Where each cap comes from [read]:**

| Cap or target | Value | Source |
| --- | --- | --- |
| Observations waiting per genus near Dauin (`DAUIN_CAP`) | 15 | `tools/fetch_local.py` since #181 (2026-10-31); its stated reason: "so the pile to sort stays small". No decision record found. |
| Elsewhere in the Philippines (`PH_CAP`), while a genus has fewer than `POOR` (15) Dauin photos | 6 | the same |
| Abroad, species confirmed in the Philippines (`WORLD_CAP`) | 6 | the same; rule C8 |
| Photos per observation (`PER_OBS`) | 12, a guard | the same |
| A Key-only genus (`CAP.sheet`) | 6 colonies per view | #390 |
| In play | only what Pierre adds in the admin; the auto-sort puts the pass's sure adds in his draft, his Publish sends them | rule A1, spec/photos.md "The Candidate photos workflow" |

**What the photos run into [measured]:**

- On R2: 1,620 coral photos named by `data.json` (1,176 added candidates, 279 genus photos, 86 lecture originals, 79
  Key-only genus photos), plus 120 IMR lecture photos mirrored from `img/`. 230 Key-only photos are shown straight from
  iNaturalist and never stored.
- 39 game genera, a median of 34 photos each in `data.json` (genus photos and added candidates); the thinnest are Anacropora (4), Astrea (7), Lobactis (10), Danafungia
  (12).
- Waiting: 1,244 candidates on 894 observations. By the auto-sort's rule (`autosort.js` `autoSure`): 134 sure adds and
  414 sure rejects that his next admin load applies, 251 his to decide (unsure, another angle, excluded), and **445 not
  judged yet**.
- Supply: `fetch_local.py --plan` shows most genera near their 15 waiting observations, so new fetches wait for the pile
  to shrink; `cand_gaps.py` reports Anacropora and Astrea with nothing more on iNaturalist near Dauin or in the
  Philippines.
- If every waiting candidate entered play: at most +1,244 photos, +0.45 GB [computed bound].

## 4. The pending intake, and when we cross 10 GB [computed]

Each line is an upper bound: it assumes every photo enters play, at the measured means (237 kB a fish photo, 232 kB a
sea slug, 360 kB a coral). Real yields are lower: 66.5% of judged fish candidates are in play.

**Pierre's own photos [measured]** (iNaturalist user `ppericard`, rule P1's exception, Q386): fish, 856 candidates on
729 observations, all judged, 753 in play; sea slugs, 203 candidates, 180 judged, 107 in play (the rest behind the game
cap or not judged: the extras of today); corals, 246 photos in `data.json` and 98 waiting, none of those judged. So at
most about 300 of his photos are not in play yet. The fish and sea slug fetchers already search all his observations
(their own search, any place); whether he has coral observations the coral fetcher has not taken is not measured here.

| Step, in a likely order | Photos | Storage | Bucket after | Needs |
| --- | ---: | ---: | ---: | --- |
| Today (dashboard) | about 30,600 | | 7.5 GB | |
| Pierre's own photos not in play (fish 103, sea slugs 96, corals 98) | ≤ 300 | ≤ +0.08 GB | 7.6 GB | the sea slug cap, the corals' judging (P7 if over 100 with the rest) |
| Sea slugs, the 2,563 extras judged | ≤ 2,563 | ≤ +0.59 GB | 8.2 GB | P7 |
| Fish refills: faved beyond the cap (REE-243) | ≤ 1,254 | ≤ +0.30 GB | 8.5 GB | P7 per pass |
| Fish refills under the cap | 0 now | 0 | 8.5 GB | none: every species with room had its open parts searched to the end within the last month; re-searched a month later |
| Corals, every waiting candidate | ≤ 1,244 | ≤ +0.45 GB | 8.9 GB | his sorting, P7 for the 445 unjudged |
| Raised cap: sea slugs, no game cap | +2,074 | +0.48 GB | 9.4 GB | Pierre (Q377 is his) |
| Fish `dup` extras findable from the codes (REE-257) | ≤ 3,844 | ≤ +0.91 GB | **10.3 GB** | P7 request in REE-257 |
| Raised cap: fish `BASE_CAP` +10 | ≤ 2,210 for the 221 species whose supply past the cap is unmeasured [guess: the supply may be much lower] | ≤ +0.52 GB | 10.8 GB | Pierre (Q36 is his), a measure of the supply first |

**When we cross 10 GB.** Not with today's pending intake alone: the decided and pending steps (his own photos, the sea
slug extras, the fish refills, the corals) end at most at about 8.9 GB. The bucket crosses 10 GB only when the fish `dup`
pass lands on top of the raised sea slug cap, or with the other `dup` extras (the 3,852 needing a look, up to +0.91 GB
more) or AVIF copies next to the WebP files (REE-177: +5.4 GB, AVIF study §4). Over the last nine days the bucket grew by
about 1.2 GB (6.3 to 7.5 GB), but in steps, one per judging pass, and it was flat over the dashboard's last day; at that
average pace the remaining 2.5 GB would last about three weeks [guess: the pace follows Pierre's P7 approvals, not the
calendar].

**The cost past 10 GB** [computed from the pricing quoted in section 5.1]: at 10.3 GB, 0.3 GB-month over the free tier,
rounded up to 1 GB-month: $0.015 a month; at 10.6 GB, the same; at 15 GB, $0.075 a month; at 20 GB, $0.15 a month.

## 5. Storage options and their costs (step 2)

### 5.1 Cloudflare's R2 pricing [read]

From Cloudflare's public page <https://developers.cloudflare.com/r2/pricing/> (fetched 2026-11-24, page dated
2026-10-30):

- Standard storage: «$0.015 / GB-month»; Class A operations «$4.50 / million requests»; Class B «$0.36 / million
  requests».
- Free tier: «You can use the following amount of storage and operations each month for free.» Storage «10 GB-month /
  month», Class A «1 million requests / month», Class B «10 million requests / month».
- «A GB-month is calculated by averaging the *peak* storage per day over a billing period (30 days).» <!-- effort-ok: Cloudflare's own words, not an effort figure --> «Cloudflare rounds
  up your usage to the next billing unit.» «If you have used 1.1 GB-month, you will be billed for 2 GB-month.»
- Egress: «There are no charges for egress bandwidth for any storage class.»
- «The free tier only applies to Standard storage, and does not apply to Infrequent Access storage.»
- The page says nothing of a tier to subscribe to: past the free amounts, usage is billed at the rates above. It does
  not say whether GB means 10^9 or 2^30 bytes, nor what happens on an account with no payment method. I recall that R2
  asks for a payment method before a bucket can be created [recall, not verified]; whether Pierre's account would then
  be billed silently is a question for him (Q-b below).

### 5.2 The options

| Option | Effect on the bucket | Cost or effort | What players notice |
| --- | --- | --- | --- |
| A. Do nothing yet | about 7.5 GB, room for about 10,500 photos | none | nothing |
| B. Store only photos in play | already the case (section 2.3) | none | nothing |
| C. Delete the unused files (REE-6) | −36 kB now; −0.15 to −0.26 GB at most with the doubtful and out-of-play files | his OK on the list (REE-6) | nothing, or Restore failing for the deleted excluded photos |
| D. Pay past 10 GB | 15 GB: 5 GB-month billed, about $0.08 a month; 20 GB: about $0.15; 30 GB: about $0.30 [computed] | money, Pierre's account; the professionalise study notes a monthly cost needs settling with IMR ([2026-11-14-professionalise-study.md](2026-11-14-professionalise-study.md) row 7) | nothing |
| E. Smaller 1600 px files (e.g. 1280 px, or a lower quality) | the 1600 px files are 4.49 GB; about −1.5 GB at 1280 px [guess: about a third of their bytes] | re-encode from the originals (re-download, paced) or from today's WebP (loses quality: AVIF study §4); a few runner hours | the enlarged view a little less sharp on large screens |
| F. Drop the 1600 px files, enlarge from 960 px | −4.49 GB | a code change in the app's size picking (`app.js` `fit`), a delete under his OK | the enlarged view clearly less sharp |
| G. AVIF in place of WebP | about −1.05 GB [computed from the AVIF study's byte ratios: 0.86 at 1600 px, 0.78 at 960, 0.95 at 480, 1.14 at 240] | a backfill of hours; every player's offline photos fetched again once (AVIF study §4-5) | nothing, if every browser decodes AVIF |
| H. AVIF next to WebP (REE-177 as studied) | +5.4 GB | crosses 10 GB on its own | faster loading on some phones |

**Operations against the free tier.** The dashboard (screenshot shared by Pierre, 2026-11-24 14:14, one day of Metrics)
shows 5.45k Class A operations, 3.67k Class B operations and a request distribution of 5.15k [measured]. Taken as a
typical day, a 30-day month is about 164,000 Class A (16% of the free «1 million requests / month») and about 110,000
Class B (1.1% of the free «10 million requests / month») [computed; one day is a thin sample, and the Class A side
grows with each upload run]. Uploading 10,000 photos adds about 50,000 writes (four or five files each) [computed].
Data retrieved 0 B fits: retrieval is charged only for Infrequent Access («Data Retrieval (processing)»: «None» for
Standard). So operations are not a limit. Players' reads go through the `r2.dev` address, which Cloudflare limits and does not cache (the
professionalise study, row 1); that is a separate matter from storage.

## 6. Recommendations (step 4)

- **Overall: no change to the storage technology now.** Two cheap steps first: correct `KB_PER_PHOTO` to the measured
  means and update `tools/infra.json` to 7.5 GB (2026-11-24, the R2 dashboard), so the infrastructure check warns as it should; and re-run the
  read-only listing workflow after each large intake. Choose option D or E before the bucket passes about 9 GB (Q-b).
- **Fish: the limit is supply, so caps are not the lever.** Go on with the decided routes: the faved route beyond the
  cap (REE-243) and the `dup` pass (REE-257), its scripted part first (3,844 photos from the codes, no agent), both under
  P7. Raising `BASE_CAP` brings nothing to the 421 species whose general searches found nothing more; for the 221 others,
measure the supply past the cap first if
  Pierre wants to know (Q-c). The fish `dup` pass is the largest storage user (up to +0.9 GB for the scripted part).
- **Sea slugs: the game cap is the limit.** Q377 planned to revisit it after the first judging pass, which is done.
  Recommended: no game cap, as the fish (+2,074 photos already judged, +0.48 GB, no judging). Then the P7 request for the
  2,563 extras, with the count.
- **Corals: the limit is the sorting and judging, then supply.** Storage is negligible. Recommended: the P7 request for
  the 445 unjudged candidates, then his admin load to apply the 548 sure decisions waiting. The waiting caps (15
  observations near Dauin) only bind once he has sorted.

## 7. Questions for Pierre

Not asked again here (they are open in their own issues): REE-6's list of unused files, REE-257's P7 request for the
`dup` pass, REE-243's further batches.

- **Q-a. Sea slugs, the game cap of 12 (Q377).** 239 of 271 units are at it; 2,074 judged photos wait behind it.
  Options: (1) keep 12; (2) 16 (+944 photos, +0.22 GB); (3) 20 (+1,821, +0.42 GB); (4) no game cap, as the fish
  (+2,074, +0.48 GB). Recommended: (4). No judging is needed for any of them.
- **Q-b. Storage past 10 GB.** The bucket is at about 7.5 GB and this round of intake could bring it to 9-10 GB.
  Options: (1) pay past 10 GB on your Cloudflare account (about $0.08 to $0.30 a month for 15 to 30 GB; does the account
  have a payment method, and would it be billed without notice?); (2) smaller 1600 px files (about −1.5 GB, a little
  less sharp when enlarged); (3) AVIF in place of WebP (about −1.05 GB, a backfill of hours); (4) decide when the bucket
  reaches 9 GB. Recommended: (4), with (1) as the simplest when it comes, since the amounts are cents; whether IMR is
  involved is yours to say.
- **Q-c. Fish, the supply past the cap.** Options: (1) measure it (one batched iNaturalist read, rule C7) before any cap
  change; (2) leave the caps and the source rules as they are. Recommended: (1) only if you want to raise the caps;
  the species short of easy adults are already covered by REE-243.

## 8. Sources

- R2 listing: GitHub Actions run 44893917673 ("R2 unused files", 2026-11-21), artifact `r2-unused` (expires about
  2026-12-05).
- R2 dashboard screenshot shared by Pierre, 2026-11-24 14:14 (bucket `coral-id-photos`, Metrics).
- Cloudflare R2 pricing: <https://developers.cloudflare.com/r2/pricing/> (fetched 2026-11-24).
- Code: `tools/fetch_fish.py`, `tools/fish_game.py`, `tools/fetch_seaslugs.py`, `tools/seaslug_game.py`,
  `tools/seaslugs.json` `photoTarget`, `tools/fetch_local.py`, `tools/photos.py`, `tools/r2_sync.sh`,
  `tools/r2_list.sh`, `tools/r2_unused.py`, `tools/infra.json`, `autosort.js` `autoSure`.
- Rules and decisions: P1, P7, A1, C7, C8, S1; Q36, Q171, Q180, Q199, Q226, Q372, Q377, Q387; docs/decisions
  2026-11-24-what-a-duplicate-is.md and 2026-11-24-seaslug-every-photo.md.
- Studies: [2026-11-15-avif-study.md](2026-11-15-avif-study.md), [2026-11-14-professionalise-study.md](2026-11-14-professionalise-study.md),
  [2026-11-23-what-a-duplicate-is.md](2026-11-23-what-a-duplicate-is.md),
  [2026-11-23-photos-per-observation.md](2026-11-23-photos-per-observation.md),
  [2026-11-21-photo-diversity.md](2026-11-21-photo-diversity.md),
  [2026-11-23-reserve-from-species-up.md](2026-11-23-reserve-from-species-up.md).
- Linear: REE-272, REE-6, REE-177, REE-243, REE-252, REE-257.
