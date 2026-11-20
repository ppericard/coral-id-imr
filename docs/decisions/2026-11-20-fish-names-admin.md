# The admin corrects the fish name index in a family's Names box; a species' own list waits for a format

Date: 2026-11-20. PR: #1311. Rules or docs touched: A1, A2, A3; docs/spec/admin-tree.md "Names", docs/spec/fish.md "The name
index", docs/FISH_PATH.md "Common names", ROADMAP "Fish common names".

## Context

The curated fish common names were published without Pierre's prior check, to be corrected in use (Q313). The game already
reads his exceptions to the name index from `curation.json` `fish` `names` (`{name: {family id: on | often | off}}`,
`core.js` `treeNameIndex`), but nothing in the admin wrote them. A species' own list of names (`fish.json` `cn`, `cni`,
`cnr`) is read by the game from the build alone, with no curation override.

## Decision

Pierre, 2026-11-08, Q313, #778: «Publie, je corrige à l'usage». The admin therefore gets the correction of the name
index: a **Names** box on a family's Tree page (folded) listing each shared name the family carries (a name two families
carry, every kind word) with **Accepted | Often | Off**, and a **Shared names** filter in Tag…. Integrator's call, easy to
correct: the layout, the three words, the box folded by default. It writes the existing `names` format through the
draft and Publish only (rule A1), one click and one Undo step each (rule A2), inside the Tree's existing page (rule A3).

Not built, integrator's call to wait: the editor of a species' own list (remove, reorder, add a name). It needs a new
stored format other code follows (a curation key read by `app.js` `cnList`, `cnTypeNames` and `cnAlso`, and `core.js`),
which is costly to undo; the question goes to Pierre. The 2026-11-15 study (§7.2) suggests exceptions to the build, per
taxon.

## Consequences

`admin-content.js` `namesRows`, `namesPut`, `namesFams`, `namesBox`, `namesBind`; `admin.js` `fuFilters` (the filter),
`renderTree` (the box), `treeSummary` (Publish counts "N fish name exceptions"); no change to the game, the data or the
sheet script. Specified in [admin-tree.md › Names](../spec/admin-tree.md#names-the-shared-names-of-the-name-index).
Tests: `tests/namesedit.test.js`, the admin smoke's Shared names block.
