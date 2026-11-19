# The fish build reports the genera a circle edit brings into circle 1 with no name root

Date: 2026-11-19. PR: #1181. Rules or docs touched: A1; docs/spec/content.md "Structure: circles and look-alike pairs";
docs/spec/fish.md "Name roots of the fish genera"; ROADMAP "The Tree tab".

## Context

The build requires a name root (or a reason in `tools/fish_genus_roots.json` `skip`) only of the base's circle-1 fish
genera. The content editor may move a family into circle 1 in `curation.json` (design note
[2026-11-14-sheet-overlay-design](../reviews/2026-11-14-sheet-overlay-design.md), step 3); the genera it brings in may
have no root, and then show none on their sheet, with nothing said anywhere.

## Decision

The build reports them, and does not stop on them: a circle edit is the editor's, never the build's to refuse.
`tools/fish_inforce.py` `rootless` finds them (the circles in force, as the photo tools read them); `tools/build_fish.py`
`show_rootless` prints them after its other reports and after `--regroup`, alone with `--rootless`. Integrator's call,
each easy to change: report rather than stop, the print format, the `--rootless` and `--curation` options.

## Consequences

- `curation.json` is read, never written (rule A1); no `core.js` or `Code.gs` change.
- Only the fish have circles; the corals and the sea slugs need no such report.
- Not built: each instance's own words for its circles (still on the ROADMAP row).
