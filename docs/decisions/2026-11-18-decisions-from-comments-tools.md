# Decisions found in the comments of the tools/ scripts

Date: 2026-11-18. PR: #1142. Rules or docs touched: W19.

## Context

The comments of the `tools/` scripts carried dated quotes of Pierre and the decisions they made, beside the code they
shaped. The cleanup rewrote those comments to say what the code does now (rule W19: history stays in git and the PRs).
Each quote or decision found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided,
and where it lives in the code.

## Decision

- 2026-10-31: Pierre chose the 7 IMR Lecture 6 growth forms (the AIMS lifeforms, Wilkinson & Baker 1997) for the
  photos, in place of the Coral Finder letters. `tools/apply_imr_forms.py`, `forms.json`.
- 2026-11-01: "a judging agent that pre-sorts by looking at the zoom level, the quality, with the aim of keeping real
  diversity", run on demand, never automatically. Decided the candidate pass of the judging agent: suggestions only, the
  admin still swipes every photo. `tools/judging_cand.py`.
- 2026-11-03, review of the plain sentences: Pierre has seen pale Seriatopora at Dauin, so the IMR "black corallites"
  becomes "neat rows"; of the lecture's mnemonic "Serius Black" he is "not a fan, a better one or none". Decided the
  mnemonic from the name itself (Latin *seriatus*, in rows). `tools/apply_imr_corrections.py` `SERIA_MN`.
- 2026-11-03: "objective metrics to break ties". Decided the photo metrics (sharpness, size, colour cast) as
  tie-breakers and sanity flags only, never to decide alone. `tools/photo_metrics.py`, `admin.js` `autoPlan`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
