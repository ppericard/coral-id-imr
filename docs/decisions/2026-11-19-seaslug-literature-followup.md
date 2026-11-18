# Sea slug literature scan follow-up: two sourced species pairs recorded, judging hints in the rubric

Date: 2026-11-19. PR: #1164. Rules or docs touched: C2, C5, C6 (`docs/rules/content.md`), `judging/SEASLUG.md`,
ROADMAP ("More subjects"), `tools/seaslug_lookalikes_source.json`.

## Context

The literature scan of 2026-11-17 (§5.4, §5.5) proposed two sourced species look-alike pairs and some judging hints,
none applied. The sea slugs' units are genera (Pierre, 2026-11-16), and `tools/seaslug_game.py` `genus_looks` reads
only genus pairs; the species pairs wait for the species level (Q390 D).

## Decision

Integrator's call, easy to correct:
- *Thecacera pacifica* / *T. pikachu* and *Chromodoris alcalai* / *C. dianae* go into
  `tools/seaslug_lookalikes_source.json` as species literature sets, the format that file already has, each with the
  scan's source (seaslug.world's species pages, after Pola et al. 2026 and Gosliner 2021; the papers' full texts not
  read). Both lie inside one genus, so the game files do not change. *Phyllidia ovata* is not a pair (not confirmed
  in the Philippines, rules C6 and C8).
- The §5.5 hints go into `judging/SEASLUG.md`, the sea slug rubric, as notes for the judge: they change no code, keep
  or ease, and the label stays the iNaturalist identification (rule C5).

## Consequences

`tools/seaslug_lookalikes_cand.json` gains two `lit` entries and two groups; `seaslug.json` and `seaslug-game.json`
are unchanged. The pairs are there for the species level. The Pikachu nickname's owner stays a discrepancy for
`points.json` and a question for Pierre (scan §6), not settled here.
