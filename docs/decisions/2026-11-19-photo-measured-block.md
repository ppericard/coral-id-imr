# The measured block: photo values computed once from the pixels, in measured.json

Date: 2026-11-19. PR: #0. Rules or docs touched: L13, S1, A5; docs/spec/data.md "measured.json", docs/spec/tools.md,
docs/spec/analyses.md, docs/DATA.md, tools/README.md, ROADMAP "Measured photo block: the full run", "Contrast correction
on the Learn sheets' photos".

## Context

The contrast test series (Q429) showed photos side by side before and after a mild contrast filter. Pierre judged low
contrast to be part of a photo's difficulty, not a defect to correct in the games. The judges estimated contrast-like
qualities by eye (the light, colour loss and clarity tags) while the pixels can give them directly. An earlier machine
estimate of colour loss (the warm share of the saturated pixels) had agreed with the eye within one level on 98% of the
fish photos of the first pass (`judging/FISH.md` "Agreement with other sources"). Its code was not kept.

## Decision

- Pierre, 2026-11-19 15:01 Manila, on the series: contrast is information about difficulty, not a defect to correct in
  the games: «on ne peut plus s'entrainer sur des photos réalistes avec peu de contraste». A correction goes no further
  than the Learn sheets (the ROADMAP row).
- Pierre, 2026-11-19 15:02: «c'est aussi une variable qui se calcule plutôt que s'estime par un agent. Tout comme les
  questions des couleurs j'imagine?»
- Pierre, 2026-11-19 15:05 (Q434), «oui» to the integrator's proposal. Each photo gets a "measured" block, computed once
  by a script: contrast, brightness, saturation, colour loss and sharpness, on the whole frame and on the fish alone when
  its box is known. It serves the multivariate analyses of the real answers and calibrating and checking the judges, and
  may replace judge fields where the measure suffices. The judge keeps what needs a human look: camouflage, whether the
  subject is obvious, juvenile, ease.
- Integrator's calls made while building (the format is followed by other code, so it is described here and in
  data.md):
  - **A file of its own**, `measured.json` at the root, keyed by the photo's file name `f`, rather than a key in the
    game records. Players download `fish-game.json`: the block would have added about 1.5 MB to it for nothing they read.
    The photo workflow rewrites that file, and one key serves every subject.
  - **Short keys** in an object per photo (`c`, `sp`, `l`, `sa`, `ss`, `wa`, `sh`, `pk`, `px`, `b`, `h`), not a
    positional list as `metrics.json` has, so a field can be added without breaking a reader. The values are rounded to
    3 decimals and `mv` versions the method.
  - **One fixed size**: the `-m` file, resampled to 960 px on its long side, so values compare across photos.
  - **The warm share redefined** (saturation ≥ 0.25 and value ≥ 0.2; hue 330°-70°), since the first estimate's
    thresholds were lost: the 58% and 98% agreement figures do not carry over to it. The saturated share `ss` is
    stored beside it.
  - **Sharpness twice**: `sh`, the Laplacian variance, which grows with the square of contrast, and `pk`, the
    contrast-free sharpest part (as `metrics.json` `peak`).
  - **The box** comes from the judging pass's `bb` (`fish-game.json`, 425 photos; no machine detector, `judging/FISH.md`
    "The fish's box"), mapped into the crop. Q430's PR (#1223) adds no box data.
  - `metrics.json` stays as it is: it serves the coral auto-sort.

## Consequences

- `tools/photo_measure.py` writes `measured.json` (spec: [data.md](../spec/data.md) "measured.json"). It is
  incremental, resumable and paced, and keeps downloads in memory only. It covers the three subjects through one table,
  `GAME` (rule S1). `--judges` sets the measures against the judges' tags. Tests: `tests/photomeasure.test.js`.
- **Coverage now**: 917 photos, a fixed hash sample of 500 of every subject (33 corals, 405 fish, 62 sea slugs) and the
  425 fish photos with a box. The other ~28,000 photos would take about 2 hours here, over rule L11's 40 minutes: the
  full run and the workflow's upkeep are the ROADMAP row.
- **First figures** (the 405 fish of the sample; descriptive only, rule A5: the photos of one observation or species are
  not independent, and the first-pass judges saw a machine colour hint):
  - The warm share follows the colour-loss tag (Spearman's rho 0.61; AUC 0.80 for no loss against the rest).
  - The whole frame's mean luminance separates good light from dim (AUC 0.76; only 16 dim photos).
  - Sharpness follows clarity (`sh` AUC 0.71 for sharp against the rest, `pk` 0.60).
  - The ease rises with contrast (rho 0.26) and the warm share (0.24), and falls with brightness (-0.22).
  - The box photos all pass the tile rule (good light, sharp), so their values cannot be checked against dim or blurred
    judgements.
- The analyses do not read the block yet: an analysis joins it by `f` ([analyses.md](../spec/analyses.md)). No player
  sees any change, and the games correct no contrast.
