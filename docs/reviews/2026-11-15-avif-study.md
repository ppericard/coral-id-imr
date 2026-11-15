# AVIF next to the WebP photos? (study, 2026-11-15)

Read-only study for the line "Later: AVIF copies next to the JPEGs can be tried" in the ROADMAP row "Photos out of the
repo". The copies would sit next to the WebP files; there are no JPEGs on R2. Pierre asked on 2026-11-15 where this
stands. Nothing had been done. This study changes no photo, file or setting; it uploads nothing and commits no
encoded image. The scripts are in [avif-study/](avif-study/README.md).

Labels (rule W11): **[measured]** = counted by a script today; **[computed]** = arithmetic on measured figures;
**[read]** = read in the repository or the sheet; **[recall]** = from memory, not checked online during this study (it
sent nothing to outside services); **[guess]** = a judgement.

## 1. Summary

- **The saving is real but small, and smallest where it matters most.** At equal visual quality (SSIMULACRA2), AVIF is
  smaller than today's WebP by a median of **23 % at 1600 px, 20 % at 960 px, 16 % at 480 px and 12 % at 240 px**
  **[measured, 103 photos]**. Counted in bytes over the whole sample, the saving is 22 %, 19 %, 12 % and **-4 %** (bigger)
  at 240 px. On the fish photos, which are 91 % of the bucket, it is 5 % at 480 px and -27 % at 240 px. At equal SSIM
  the 480 and 240 px savings shrink to 9 % and 0 % (median), 5 % and -18 % byte-weighted.
- **The sizes a slow Philippine line uses gain almost nothing.** A pipeline uses one fixed quality per size. The first
  AVIF quality on the grid that is at least as good as WebP for the median photo (q60) saves 5 % of the bytes at 480 px
  and costs 14 % more at 240 px. One step lower (q55) saves 21 % and 2 %, but leaves 50 % and 37 % of the photos worse by
  more than 2 points **[measured]**.
  A 480 px photo at 86 kbit/s, the field link of 2026-11-02, would load in 2.4 s instead of 2.6 s **[computed]**.
- **Every player's browser supports AVIF.** The app's logs show 27 devices since 2026-11-02, all on Chrome 138 or later,
  Edge 156-157, Samsung Internet 30, Safari 26-27 on iOS, or Chrome 156-157 on iOS (whose iOS version the log does not
  record) **[read]**. AVIF has been supported since Chrome 85, Safari/iOS 16 and Samsung Internet 14 **[recall]**.
- **The cost is not small.** AVIF in four sizes would add **about 5.4 GB** to a bucket that already holds **about 6.3 GB**
  of R2's 10 GB free tier. The one-off encoding of the 25,091 photos on R2 would take about 14 CPU-hours at libaom's
  default speed, about 3.5 h on a 4-core runner. The app, the service worker, the tools and the smokes would each need
  changes, and every player would download their offline photos again once **[measured, computed]**.
- **Recommendation: do not build AVIF now.** Keep WebP alone. If anything is built later, it should be AVIF for the 960
  and 1600 px files only, chosen once at start-up. That is question (a). The bucket's size is a finding in its own right:
  the ROADMAP row "Hosting capacity (watch)" expected about 2 GB (section 4).
- **JPEG XL is not worth it either.** Chrome, Edge and Firefox do not decode it by default **[recall]**, and those
  browsers made 80 % of the logged visits. At 240 px it is bigger than WebP **[measured]**.

## 2. How it was measured

- **The sample: 103 photos [measured].** 33 coral field photos, 19 IMR lecture photos (the "slides"), 51 fish photos
  (15 of them with a Find the X tile, `-x`). Each group was split in thirds, from plain to busy, by its 480 px WebP's
  bits per pixel, then sampled at random (seed 20261115).
- **The reference [measured].** For the 84 field and fish photos, the reference is the online original (iNaturalist or
  FishBase, the `src` the tools download from, fetched one a second). Pierre's crop and rotation are applied with
  `tools/photos.py` `turn`, then the image is scaled with `thumbnail` as `save()` does. The tile is cut with `square`.
  - Re-encoding that reference with today's settings (`photos.SIZES`: q78, 72, 72 and 70, method 5; tile q72)
    reproduces **321 of the 351 files on R2 byte for byte**.
  - Of the 30 others, 26 are the 960 and 240 px files of 13 older coral photos. They were made from the 1600 px file
    (re-encoding that file reproduces all 26 byte for byte), as `tools/photos.py` filled those sizes on 2026-11-01. The
    other 4 are one photo whose files do not follow its record's crop.
  - So "today's WebP" below means that re-encode: the WebP the tools write today.
  - The lecture photos have no original outside `img/`, so their reference is the 1600 px WebP. Their 1600 px
    comparison is second-generation and is reported apart.
  - 40 of the 103 originals are under 1600 px and 9 are under 960 px, so their larger files are their original size.
- **The encoders [read].**
  - Pillow 13.0.0, the version `tools/requirements.txt` pins, with its own libwebp 1.6.0 and libavif 1.4.2 / libaom
    3.14.1.
  - AVIF at speed 6 (the default) with 4:2:0 colour, the same as WebP, on one thread.
  - The quality grid ran from 30 to 90 in steps of 5 (steps of 10 at 1600 px, so a fixed 1600 px quality below lands
    between 50, too low, and 60, above WebP).
  - Speeds 8 and 9, libaom's still-image tuning (`tune=iq`, on 42 photos) and JPEG XL (ffmpeg's libjxl, effort 7, on 42
    photos at 480 and 240 px) were tried as well.
- **The metrics.**
  - **SSIMULACRA2** (the `ssimulacra2` 0.3.0 Python package; 100 = identical) is the main metric. It was built to
    compare image codecs. It scored 100 on identical pairs, and rose with the AVIF quality in 4,499 of the 4,506 grid
    steps **[measured]**.
  - Thumbnails score lower than the other sizes (WebP's median 49 at 240 px, about 71 elsewhere). That is the
    thumbnails' own density of detail, not the metric's handling of small images: a 240 px crop of the 480 px photo and
    its WebP scores 71.8, like the whole 480 px photo (21 photos) **[measured]**.
  - **SSIM** on luma is reported as a cross-check. No butteraugli tool was available.
  - For each photo and size, the AVIF bytes that give the WebP's score are interpolated between the two grid points
    around it (log-bytes). No point fell outside the grid.
- **Encode times** come from this 4-core machine with three workers running, one thread per encode; CI runners differ
  **[guess]**.
- **The players' browsers and lines** come from the sync sheet's `Events` tab (`load` events, sheet v21) and its `Pages`
  tab, read once, read-only. Only counts are kept here: no device id, no name.

## 3. Size and quality

**At equal SSIMULACRA2, AVIF bytes against today's WebP** (positive = AVIF smaller) **[measured]**:

| Size | Photos | Median saving | Middle half | 10th-90th percentile | Byte-weighted | WebP's median score |
|---|---|---|---|---|---|---|
| 1600 px | 84 | 23 % | 19 to 30 % | 14 to 33 % | 22 % | 72.8 |
| 960 px (`-m`) | 103 | 20 % | 17 to 25 % | 13 to 31 % | 19 % | 70.8 |
| **480 px (`-s`)** | 103 | **16 %** | 11 to 21 % | 0 to 25 % | **12 %** | 71.4 |
| **240 px (`-t`)** | 103 | **12 %** | -11 to 23 % | -48 to 30 % | **-4 %** | 49.2 |
| 360 px tile (`-x`) | 15 | 19 % | -2 to 20 % | -18 to 29 % | 9 % | 67.5 |

- **By group, at 480 and 240 px:** coral field photos 17 % and 4 % (median); lecture photos 18 % and 20 %; **fish 15 %
  and 9 % by median but 5 % and -27 % byte-weighted**. The busy, heavy fish photos are where AVIF does worst.
- **By background:** at 480 px, plain 18 %, middle 16 %, busy 15 %. At 240 px, 17 %, 13 % and 8 %, all with a wide spread.
- **The lecture photos at 1600 px:** a 2 % median saving, but the reference there is the WebP itself (section 2).
- **SSIM agrees at the large sizes and is less kind at the small ones:** 22 %, 19 %, 9 % and 0 % (median), 19 %, 14 %,
  5 % and -18 % byte-weighted. It confirms that the small sizes gain little or nothing.

**A fixed AVIF quality per size** (what a pipeline would ship) against today's WebP **[measured]**:

| Size | AVIF quality | Median score difference | Photos worse by more than 2 points | Byte-weighted saving |
|---|---|---|---|---|
| 1600 px | 60 | +3.4 | 4 % | 14 % |
| 960 px | 55 / 60 | +0.6 / +4.9 | 27 % / 6 % | 22 % / 5 % |
| 480 px | 55 / 60 | -2.1 / +3.2 | 50 % / 6 % | 21 % / 5 % |
| 240 px | 55 / 60 | -1.1 / +2.3 | 37 % / 5 % | 2 % / -14 % |
| tile | 55 / 60 | +0.4 / +4.8 | 33 % / 7 % | 14 % / -2 % |

- One fixed setting either loses a little quality on many photos (q55) or loses most of the saving (q60).
- At 240 px AVIF is never clearly smaller at a fixed quality, and on the fish photos it is bigger at both (-26 % at q55,
  -43 % at q60, byte-weighted) **[measured]**.
- **Faster or tuned AVIF does not help.** Speed 8 adds 1.7-2.3 % bytes for -0.3 to -0.5 points (480/240 px). `tune=iq`
  saved 14 % at 480 px and 7 % at 240 px (median, 42 photos), the same as the default **[measured]**.

**What a player would feel** (the median photo; one file, line speeds from the `load` events) **[computed]**:

| File | 86 kbit/s (field link, 2026-11-02) | 729 kbit/s (10th percentile of logged lines) | 6.7 Mbit/s (median) |
|---|---|---|---|
| 480 px: WebP 27.7 KB → AVIF q60 | 2.6 → 2.4 s | 0.30 → 0.29 s | 0.03 s either way |
| 960 px: WebP 75.4 KB → AVIF q55 | 7.0 → 5.7 s | 0.83 → 0.67 s | 0.09 → 0.07 s |

- A slow line gets the 480 px file (Saver, `app.js` `fit`), where AVIF gains about 0.1 s per photo. The 960 and 1600 px
  files, where AVIF gains most, go to lines above 500 kbit/s (`LINK.SLOW`).
- The quiz already fetches the next questions' photos ahead (`AHEAD`), and 96 % of the logged visits were served by the
  service worker **[read]**.

## 4. Cost

**Today's bucket [measured]:** HEAD requests on a random 300 coral and 400 fish photos (4 files each) and 150 tiles,
scaled to the counts in the data files:

| | Photos | Mean per photo (4 files) | Total |
|---|---|---|---|
| Coral, R2 only | 1,534 | 351 KB | 0.55 GB (0.53-0.58) |
| Fish, R2 only | 23,557 | 237 KB | 5.72 GB (5.36-6.06) |
| Tiles | 422 | 16 KB | 7 MB |
| `img/` (mirrored on R2) | 124 | | 40 MB |
| **All** | | | **about 6.3 GB** |

- The 1600 px files are 62-64 % of these bytes.
- The bucket also holds files no data file names any more (excluded photos, never deleted). The HEAD sample cannot see
  them, so 6.3 GB is a lower bound.
- `fish-game.json` held 10,078 R2 photos on 2026-11-08, 15,471 on 11-09, 16,965 on 11-14 and 23,557 on 11-15 (git history
  **[measured]**). The 662 species hold a median of 34 photos; the candidate cap is 30-60 per species (`cap_of`)
  **[read]**.
- **A finding for the integrator, not a question:** the "Hosting capacity (watch)" row expected about 2 GB with the fish
  in play. If every species reached the highest cap (60), the bucket would hold about 10.2 GB, just past the free tier;
  at today's median it is 6.3 GB **[computed]**. No cost today. This PR updates that row's figures.

**AVIF copies [computed]**, from today's means and the byte ratios at the fixed qualities above: q60 at 1600, 480 and
240 px (0.86, 0.95 and 1.14 of WebP's bytes), q55 at 960 px and for the tile (0.78 and 0.86):

| Option | Added to R2 | Bucket after | Files added |
|---|---|---|---|
| All four sizes + tiles | +5.4 GB | about 11.7 GB: over the 10 GB free tier | +100,000 |
| 960 + 1600 px only | +4.6 GB | about 10.9 GB: over | +50,000 |
| 480 + 240 px + tiles only | +0.8 GB | about 7.1 GB | +50,000 |

- Over 10 GB, R2 charges $0.015 per GB-month (professionalise study), a few cents a month. Any monthly cost needs
  settling with IMR (Q353).

**Encoding [measured per photo; computed for the bucket]:**

| | Per photo (one thread) | 25,091 R2 photos, one thread | On a 4-core runner |
|---|---|---|---|
| WebP today, four sizes | 0.28 s | 2 h | |
| AVIF, four sizes, speed 6 | 2.0 s (90th percentile 3.2 s) | 14 h | about 3.5 h |
| AVIF, four sizes, speed 8 | 0.8 s | 5.4 h | about 1.4 h |
| AVIF 960 + 1600 px, speed 6 / 8 | 1.7 s / 0.7 s | 12 h / 4.7 h | about 3 h / 1.2 h |
| AVIF 480 + 240 px, speed 6 | 0.23 s | 1.6 h | about 0.4 h |

- A GitHub-hosted runner on a public repository has 4 cores and a 6 h job limit **[recall]**. So a backfill fits in one
  job, or two to be safe.
- New photos then cost about 2 s more each in the Candidate photos workflow. That is minutes a day.

**The backfill's source [measured].** The tools keep no originals:
- Either download the 25,091 originals again from iNaturalist and FishBase (hours at a paced rate, several GB),
- or encode from today's 1600 px WebP, which costs quality. Against the original, that loses a median 4.7 points at
  960 px (q60), 1.3 at 480 px and 0.6 at 240 px. At 960 px that is more than the whole margin.

**Upload [computed and guess].**
- About 50,000-100,000 new objects. R2's free tier counts about a million writes a month **[recall]**.
- With `tools/r2_sync.sh`'s 32 parallel transfers: minutes for the bytes and about 5-15 min for the objects **[guess]**.
- `r2_sync.sh` copies and checks only `*.webp` (`--include`). The `Content-Type` rclone gives `.avif` would need
  checking after a first upload **[guess: image/avif]**.

**Players' offline photos [read].** `sw.js` keeps photos by address in `imr-photos-v1`, up to 2,500 entries.
- A switch to `.avif` addresses misses every one of them, so each player downloads their offline photos again once.
- Until then, an offline player loses them, unless the worker also looks up the `.webp` twin on a miss (`twinOf` already
  pairs R2 and site addresses).

## 5. Browser support and how the app would serve AVIF

**The players' browsers [read, 2026-11-02 to 2026-11-15].**
- `Events`: 774 rows, 564 of them `load` events, from 27 devices: 14 iOS (Safari 26-27, Chrome iOS 156-157), 8 desktop
  Chromium (Chrome 155-157, Edge 156-157) and 5 Android (Chrome 138-157, Samsung Internet 30). The `Pages` tab shows the
  same browsers.
- Loads by family: Android 275, desktop 175, iOS 114.
- Lines: 273 loads measured the line. The 10th percentile was 729 kbit/s and the median 6.7 Mbit/s; 12 were under
  500 kbit/s. The first quiz photo showed after a median 4.1 s (90th percentile 23 s; 133 loads). Saver was on in 25 of
  564 loads.
- **AVIF:** supported since Chrome 85 (2020), Safari 16 / iOS 16 (2022), Firefox 93, Edge 121 and Samsung Internet 14
  **[recall]**. Every logged browser is newer, so no logged player would need the WebP fallback. A fallback should still
  stay, for an unknown in-app browser.

**`<picture>` with a `type` source does not fit this app [read].**
- A photo address is a string built by `loc()` and used in many places that are not an `<img>`'s own choice:
  - `data-lo` (the 480 px step under a game photo);
  - the game backdrop's inline `url()` (`--qbg`);
  - the quiz's preloads, which use `fetch()` (`quiz.js` `pfUrls`, `pump`): a `<picture>` would show the AVIF while the
    preload had fetched the WebP, so the photo would be downloaded twice;
  - `upsizeImg` / `resized()`, which rewrite `src`;
  - the fallback, which rewrites `src`, `srcset`, `data-lo` and the style (`core.js` `photoFallback`), and the rotation
    fix (`turnSet`).
- Each place would need a second, AVIF-aware path.

**Detection once at start-up fits [read; nothing built].**
- Decode a tiny AVIF `data:` image (the CSP's `img-src` allows `data:`) and keep the answer in `localStorage`.
- `loc()` (and `tileSrc`) then writes `.avif` instead of `.webp`. Saver and `fit` choose sizes, not formats, so they
  stay as they are.
- What would change with it:
  - `app.js` `resized()` and `tierOf` and `core.js` `photoFileOf` match `\.webp` only.
  - `photoAway` sends a git photo (lecture, page art) to the site's `img/`, which would keep WebP only, so `.avif` must
    map back to `.webp` there. A photo with an online original falls back to its JPEG original as today.
  - `sw.js`: its photo route is format-blind. Its cache needs the `.webp`-twin lookup above.
  - `tools/photos.py` (`SIZES`, `save`, `--check`, `--r2-list`: four files per photo), `tools/fish_game.py` `tile_write`
    and `tools/r2_sync.sh` (`--include '*.webp'`, its bucket check).
  - `tests/net.smoke.js` routes `\/img\/.*\.webp` (aborts, never-answer and size checks such as `-t\.webp`).
    `tests/photostub.js` serves `.webp` stand-ins as `image/webp`. The smokes' `TYPES` have no `.avif`.
  - The admin (`admin.js` `img()`) and Home's ReefCloud art can stay on WebP.
- Serving by the `Accept` header instead is not possible on `r2.dev` without a Worker **[recall]**.

## 6. JPEG XL

- **Browser support [recall].** Safari 17 and later decode JPEG XL, and so does every iOS browser, since they all use
  WebKit: 14 of the 27 logged devices. Chrome removed it in version 110 (2023), and Edge with it. Late in 2025 the
  Chromium team said it would accept a Rust decoder, but whether Chrome ships it by default today was not checked.
  Firefox has it only in Nightly. The Chromium browsers made 450 of the 564 logged loads.
- **Measured on 42 photos [measured]** (40 at 480 px and 37 at 240 px fell inside the distance grid). At 480 px, JPEG XL
  at equal SSIMULACRA2 saved a median 21 % (byte-weighted 18 %), against 15 % for AVIF on the same photos. A fixed distance of 3.0 saved 19 %, but a third of the photos came out
  worse by more than 2 points. At 240 px it was bigger than WebP: median -11 %, byte-weighted -26 %.
- **Verdict.** It would serve only the iOS players, need a WebP fallback for everyone else, and do nothing for
  thumbnails. Not worth it now. Look again if Chrome ships it by default.

## 7. Recommendation

1. **Do not add AVIF now.** The gain is 0.1 s per photo on a slow line, and nothing at 240 px. The cost: about 5 GB on
   R2, past the free tier with every size; a multi-hour backfill; changes across the app, the worker, the tools and the
   smokes; and one more download of every player's offline photos.
2. **If it is ever built**, build AVIF at 960 and 1600 px only (q55-60, speed 8), next to WebP, with start-up detection
   and the `.webp` twin lookup in the worker. At a fixed quality that gains about 14 % at 1600 px and 5-22 % at 960 px
   (20 % and 23 % with per-photo tuning) on the larger files that fast lines and desktops load. It needs the storage
   settled first (question (a)).
3. **Point the ROADMAP line here and update the "Hosting capacity (watch)" figures** (both done in this PR).

## 8. Questions for Pierre

One question, because building AVIF has a real cost.

- **(a) AVIF: leave it parked, or build it for the large files?**
  - Context: at a fixed quality, AVIF saves about 14 % on the 1600 px photos and 5-22 % on the 960 px ones, but almost
    nothing on the 480 and 240 px ones that slow lines load.
  - Building it for the large files adds about 4.6 GB to R2. The bucket would be about 10.9 GB, past the 10 GB free tier:
    a few cents a month, which needs IMR (Q353). The one-off encoding takes about 1-3 h of CI.
  - Recommendation: **leave it parked**.
