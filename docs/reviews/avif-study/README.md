# Scripts of the AVIF study (2026-11-15)

The scripts behind [../2026-11-15-avif-study.md](../2026-11-15-avif-study.md), kept to re-run the study. Nothing here
runs in CI, and none of them writes to the repository, R2 or the sheet. Every script takes the repository root
(`WT`) and a data folder outside the repository (`DATA`). They read photos from R2's public address and from the
originals the tools already download (iNaturalist, FishBase), one a second. Their outputs (encoded images, JSON) stay
in `DATA`: never commit them.

Python 3 with Pillow 13.0.0 (as `tools/requirements.txt`), numpy, scipy and `ssimulacra2` 0.3.0, in a virtual
environment outside the repository; `jxl.py` also needs ffmpeg with libjxl. Run each heavy step in the machine slot
(rule W24): `node tests/slot.js -- python3 -I docs/reviews/avif-study/measure.py WT DATA`.

| Order | Script | What it does |
|---|---|---|
| 1 | `bucket.py WT DATA/bucket.json` | HEAD sample of today's R2 files (300 coral, 400 fish photos, 150 tiles) |
| 2 | `bucket_sum.py DATA/bucket.json WT/img` | The bucket's size from that sample, scaled to the counts |
| 3 | `sample.py WT DATA` | Picks the 103 photos (groups, thirds by bits per pixel) and downloads their originals and R2 files |
| 4 | `verify.py WT DATA` | Re-encodes the WebP files from the originals and compares them with R2 byte for byte |
| 5 | `measure.py WT DATA` | WebP and the AVIF grid per photo and size, SSIMULACRA2 and SSIM, times (about 1 h on 3 workers) |
| 6 | `analyse.py DATA` | The tables of the study |
| 7 | `jxl.py WT DATA`, `tune.py WT DATA`, `extra.py DATA` | JPEG XL and AVIF `tune=iq` on 42 photos at 480 and 240 px |
| 8 | `checks.py WT DATA` | The metric's monotony over the grid, a 240 px crop of the 480 px pair, the files not reproduced byte for byte |
| - | `git show <commit>:fish-game.json \| python3 -I count_fish.py WT/tools` | The fish photos on R2 at a commit |
