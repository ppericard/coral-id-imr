# Fish genus marks from more sources: Reef Life Survey, FishBase, Fishes of Australia, an FAO catalogue

Date: 2026-11-19. PR: #TBD. Rules or docs touched: tools/fish_genus_marks.json, fish.json, docs/spec/fish-sheets.md,
tests/genusmarks.test.js.

## Context

45 fish genera in play (144 game species) had no ID marks: the FAO species guide for the Western Central Pacific splits
them by counts, teeth or scales, and FishBase had given no photo feature for them.

## Decision

Pierre, 2026-11-19 15:35 Manila: «Il faut sourcer tous les … qu'on peut et qui ont des sources externes qui les décrit
… Surtout si ça peut aider notre app». A genus may take marks from a feature that Reef Life Survey or FishBase species
pages, or Fishes of Australia, give for each of its game species, or an FAO species catalogue gives for the genus: seen on a photo, never a
count, beside IMR's cues and never against them (rules C1, C2, C6). Each ref's "where" is the page's words verbatim,
checked by script against the page as read, as in the species marks. A genus with no such feature keeps its reason in
`none`, now naming the sources read.

## Consequences

- 22 genera get marks; 23 stay in `none` with their updated reason.
- Several of the new marks are the look of a genus's only game species (as the circle 2-3 rule already allowed); the PR
  lists them apart, so they can be cut.
- Chromis, Pomacentrus and Ctenochaetus (IMR cues) get none: the sources read give no shared photo feature that the
  build could take before #1231.
