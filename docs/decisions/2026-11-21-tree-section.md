# The builds write each subject's tree section, a file of its own the Tree tab reads

Date: 2026-11-21. PR: #1368. Rules or docs touched: S1; docs/spec/admin-tree.md "The tree section"; docs/spec/tools.md; ROADMAP "The Tree tab" (REE-12).

## Context

Pierre (2026-11-13, Q339-Q341) decided that the Tree tab works for any subject, each subject building its own tree from its own references; the row left "the builds' generic `tree` section per subject". Until now the admin built the trees itself, one adapter per data shape (`fuTreeOf`, `fuWormsOf`, `ctKeyOf`, `ctWormsOf`), so each subject's references were known to the admin's code.

## Decision

Each subject's build writes its two classifications (Key, WoRMS) as nodes `{id, name, rank, up, ...}` through one module, `tools/tree_section.py`, and the admin reads them with one function (`taxtree.js` `ttSection`). Integrator's calls, each easy to correct: the section is a file per subject, `data/<subject id>-tree.json`, admin only, rather than a key of `data.json`, `fish.json` or `seaslug.json` (players' downloads do not grow; no key of those files changes); what the photos give (genus-level leaves) stays computed at load, since the sources do not hold it; a section out of date is caught by a unit test running `--check`, not by a workflow change.

## Consequences

- `ctLeaves`, `ctKeyOf`, `ctWormsOf` and `fuGenusRef` leave the admin; their logic is the Python build, held to `core.js` `lectureGroup`, `slateOf` and to `autosort.js` `fishUnits`, `taxtree.js` `ttFromRef` by `tests/treesection.test.js` and `tests/coraltree.test.js` on the real data.
- A source change needs its section written again: the tools that write a source do it (`build_fish.py`, `seaslug_game.py`, `taxonomy.py`, `datajson.py` `dump`), or `python3 tools/tree_section.py`.
- Not built: each instance's own words for its circles; the coral Look-alikes page reading the pairs in force (still on the Tree row).
- Specified in [admin-tree.md](../spec/admin-tree.md#the-tree-section-toolstree_sectionpy).
