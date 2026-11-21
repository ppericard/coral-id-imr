# Name modifiers in Confusions: a shared common-name word as an exploratory effect, with the genus and look-alikes held

Date: 2026-11-21. PR: #1403. Rules or docs touched: S1, A5; docs/spec/analyses.md, docs/spec/analyses-method.md.

## Context

The name-confusion study (2026-11-05) found no clear name effect on the corals and, for the fish, noted that common names
share modifier words across families (Yellowtail, Blackspot, Bicolor…), often naming the very feature two species share.
Its question (h) asked whether to include them in the analyses from the start, analysis only.

## Decision

Build (h). REE-24, Pierre, 2026-11-14, Q124: «Je suis tes recommandations pour tout» (the study's §6, (a)-(h)); the
recommendation of (h): "yes, analysis only (no game change): log the options shown, then test 'shared modifier word' the
same way". The options shown are already logged (`Choices`).

- A column of Confusions' per-offer model: the option shares a modifier word of its common name (before the head noun, a
  hyphenated word as its parts, no possessive, no word of 2 letters or fewer) with the right answer, for species units
  asked by their common name. One exploratory test, never primary. Integrator's call, easy to correct.
- Controls, the study's FAM and LOOK: the same genus and the declared look-alike species. Found on planted data: without
  them the effect reads negative, since the pairs that share a word are never the declared look-alikes.
- A clear result says pairs sharing a word are mixed up more, not that the name causes it (the study's §3.3 reading of the
  first letter).
- The names are read from the tree file (`meta.mod`), generic for any tree subject (rule S1), in the report's fingerprint.

## Consequences

`analysis.js` `modWords`, `modMeta`, `confRows`, `confFit` (columns `mo`, `mod`, `sg`, `lk`), the generator's `share`,
`AV` 18; `tools/analyses.js` `metaOf`; `admin-analyses.js` `anMods`. Tests: `tests/analysis-names.test.js`,
`tests/analysis-names-fit.test.js`. The re-test of the study waits for data and is its own issue.
