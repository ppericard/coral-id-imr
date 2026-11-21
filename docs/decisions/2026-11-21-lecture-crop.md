# The admin's Crop works on an IMR lecture photo traced to its original

Date: 2026-11-21. PR: #1400. Rules or docs touched: `docs/spec/photos.md`, `admin.js`, `autosort.js`, `tools/photos.py`,
`tools/fetch_approved.py`, `tools/fetch_imr_originals.py`, `tools/apply_imr_originals.py`, `tests/rotate.test.js`,
`tests/imrsources.test.js`, `tests/admin.smoke.js`.

## Context

The 86 lecture photos traced to Corals of the World were replaced by their originals on R2 (#1292, [record](2026-11-20-lecture-originals.md)),
each cut and turned as the lecture framed it (`cr`, `ro`). The admin's Crop was left off on them: a crop published for
one would never reach its R2 file (`tools/fetch_approved.py` did not visit `course`), and the lecture's framing, itself
a crop, could not be undone with "Full photo". Pierre decided the originals and left the Crop to follow ("C12 A+D",
2026-11-18, paraphrase; ROADMAP "IMR lecture photos never upscaled").

## Decision

- **The usual `curation.json` keys, one rule for the framing in force** (integrator's call, easy to correct): a lecture
  photo's `crop` entry replaces the lecture's framing, with its rotation from `rot` alone; with no `crop` entry the
  lecture's `cr`, `ro` stand. The editor always writes a `crop` entry for a lecture photo (`[0, 0, 1, 1]` for Full photo),
  so no new value is added to `rot` (it holds no 0) and an absent `rot` entry is "no turn", the lecture's turn included.
  One function in two languages, `autosort.js` `lectureFrame` (admin) and `tools/photos.py` `lecture_frame` (workflows),
  checked against each other in `tests/rotate.test.js`.
- **The files follow the framing** (integrator's call): `tools/fetch_approved.py` remakes a lecture photo from its original
  when the framing in force differs from the record's `cr`, `ro` (`photos.stale`), through `fetch_imr_originals.make`:
  `www.coralsoftheworld.org` only, one request every 2 s, the size of the lecture's cut checked first (the picture is still
  the one Pierre sees in the editor), then written with his crop. It records `cr`, `ro`, `ar` and bumps `iv`.
- **The lecture tools leave his crop alone**: `tools/apply_imr_originals.py` skips a record already applied;
  `tools/fetch_imr_originals.py` (run by `reefid-originals.yml` on a change of the frames file) writes the framing in force,
  not the lecture's.
- **A lecture crop saved as it was opened writes nothing**, so rounding never makes the workflow download an original for
  the same picture. The 34 untraced lecture photos (no original online) keep no Crop: nothing to cut from.

## Consequences

The Crop button shows on the 86 tiles in the genus pages. A crop published for one reaches its R2 file at the next
`approved-photos.yml` run, like any crop, and `data.json` follows (`cr`, `ro`, `ar`, `iv`). Undo before Publish
brings the lecture's framing back; once published, going back to it is a crop by hand (the admin does not hold the frames
file). `tests/imrsources.test.js` accepts a record cut as the lecture framed it or as his crop says.
