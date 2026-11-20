# The measured block of the game photos (`data/measured.json`)

Values computed once from each game photo's pixels (rule L13), for every subject. They feed the multivariate analyses of
the real answers and the calibration and checking of the judges. This is the specification of what the code does now;
why it was decided is in [the decision record](../decisions/2026-11-19-photo-measured-block.md). Contrast is part of a
photo's difficulty: the games correct nothing.

## The file

- **Where**: `data/measured.json`. It is for the admin and the tools only: players never download it and it is
  not in the `sw.js` shell. `data/metrics.json` ([data.md](data.md)) stays the coral auto-sort's.
- **Layout**: `{"v": 1, "mv": method version, "w": 960, "size": "-m", "about": …, "ms": {f: block}}`, one photo per
  line, sorted by `f`. The key `f` is the photo's file name: the key of the game files, of `analysis.js` `ph` and `fph`,
  and of an answer's photos (`a.ph`).
- **What is measured**: the photo's `-m` file (from R2, or a folder given with `--dir`; at most 960 px on its long
  side, Pierre's crop already cut), resampled to exactly 960 px on its long side so every value is on the same grid.
  A small original is upsampled. Everything is computed on the gamma-encoded sRGB values in [0, 1].

## A block

- `c`: RMS contrast, the standard deviation of the luminance (Rec. 709 weights).
- `sp`: the spread, the 2nd to the 98th percentile of the luminance.
- `l`: the mean luminance (brightness).
- `sa`: the mean HSV saturation.
- `ss`: the share of saturated pixels (saturation ≥ 0.25, value ≥ 0.2).
- `wa`: the **warm share**, the colour-loss estimate: the share of the saturated pixels whose hue is red to yellow
  (330°-70°). It is high when the warm colours are still there, and left out under 1% of saturated pixels.
- `sh`: sharpness, the variance of the luminance's Laplacian × 10⁴.
- `pk`: the sharpest part, independent of contrast: the 85th percentile, over an 8 × 8 grid, of each tile's Laplacian
  variance over its luminance variance (as `data/metrics.json` `peak`).

Values have 3 decimals; `sh` has 1. Besides the whole frame's block, a photo has:

- `px`: the `-m` file's long side. Under 960 means a small original, whose `sh` was read on an upsampled file.
- `b`: the same block (no `px`) on **the fish alone** when its box is known. The box is `fish-game.json` `bb`, the
  judging pass's box (`judging/FISH.md` "The fish's box"), mapped into the crop. There is none for a turned photo, or
  for a box the crop cuts by more than 30%.
- `h`: a 6-character tag of the crop, rewrite count, rotation and box (`cr`, `iv`, `ro`, `bb`), when any is set.

## Reading it

- `sh` grows with the square of contrast, so a sharp low-contrast photo reads soft. Take `pk`, or `sh / c²`, or `sh`
  with `c` beside it.
- The warm share also follows the animal's own colours: a silver or blue fish has few warm pixels in clear water.
- Boxes exist only for photos whose tags pass the tile rule (good light, colour loss 0-1, sharp, large or medium). The
  fish-alone values therefore say nothing about dim, colourless or blurred photos.
- The analyses do not read the block yet. An analysis joins it by `f` ([analyses.md](analyses.md)).

## The tool (`tools/photo_measure.py`)

- **Which photos**: every downloaded game photo of the subjects in `GAME` (`data.json`, `fish-game.json`,
  `seaslug-game.json`), the one place a subject is named, with how its file is read (the fish's short form given back
  whole) and where its records are (rule S1). A record still remote (`r`) waits.
- **Incremental**: it measures the photos not in the file, or whose `h` changed. A new `mv` (any change to a measure)
  measures every photo again. A photo that leaves the game keeps its entry, since past answers showed it.
- **Paced and resumable**: it reads each file into memory (nothing on disk), with 4 threads, at most 8 requests a
  second and three tries. It writes every 500 photos. `--minutes` (default 35) is checked before every photo and
  every request, which never waits past it; a rerun goes on. Any run with work takes the machine slot (rule W24),
  `--dir` included.
- **Options**:
  - `--subject`;
  - `--sample N`: the first N photos of a fixed hash order over every subject;
  - `--boxed`: the photos with a box;
  - `--only`;
  - `--dir D`: read `D/<f>-m.webp` (the photo workflow's `r2-upload/`, a test's fixtures);
  - `--out`, `--root`.
- **`--judges`** measures nothing. It prints Spearman's rho and the AUC (the better level against the rest) of each
  measure against the judges' light, colour-loss and clarity tags, plus rho against the ease, for the whole frame and
  the box; `--sample N` restricts it to that sample.
- Tests: `tests/photomeasure.test.js`, on made-up images with known values, the box in a crop, and an incremental run.

## Coverage

917 photos are measured:

- a fixed hash sample of 500 photos across every subject (33 corals, 405 fish, 62 sea slugs);
- the 425 fish photos with a box.

The other ~28,000 game photos (about 1.2 GB of `-m` files) take about 2 hours at 4-4.5 photos a second on the shared
agent machine, over rule L11's 40 minutes. Left (the list of record for this work: ROADMAP has no room for its row):

- the full run, on a GitHub runner or as resumed `--minutes 35` runs;
- the upkeep: the Candidate photos workflow runs `--dir r2-upload` on the photos it downloads, and its push job allows
  `data/measured.json`;
- the measures in the analyses' photo features (a refit of every milestone) and in the judging checks;
- the judge fields a measure could replace where it suffices (part of Q434), shown to Pierre with the figures.
