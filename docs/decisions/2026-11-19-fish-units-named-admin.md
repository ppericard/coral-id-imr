# The fish species units are named on the admin's pages, in their genus's block on the Heatmap

Date: 2026-11-19. PR: #1159. Rules or docs touched: A4, S1; ROADMAP "Fish admin at parity"; docs/spec/admin-players.md.

## Context

The species level asks units like `s:s091` (`core.js` `treeSpUnits`). The admin's registry (`reports.js` `repReg`) knew
them only as a family and look-alikes, so Pairs, the Heatmap, every page naming a unit through `admin.js` `repUnit`, the
Journey's titles and the Analyses report's text showed the bare id, and the Heatmap's Species rank had no genus blocks.

## Decision

Integrator's call (easy to correct; the ROADMAP row of 2026-11-08 asked for the units to be named on the pages): a
species unit is named by its scientific name in italics, as a genus is, linked to its family's page, and sits in its
genus's block on the Heatmap. `repReg` `spu` carries the name and the genus.

## Consequences

`repUnit`, `admin-heatmap.js` `heatLab` / `heatUp`, `admin-journey.js` `jName` and `admin-analyses.js` `anWords` read
`spu`. Tests: `tests/fishunitnames.test.js`, the admin smoke's fish Heatmap and Pairs. Left of the ROADMAP row: the
registry under the content editor's structure, the Journey's opt-in steps, Photo stats > Difficulty, the Taxa view.
