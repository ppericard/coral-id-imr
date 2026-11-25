# The IMR names and family spellings of the fish entries, and every entry's PDF sections: moved into the IMR instance's layer

Date: 2026-11-25. PR: #1580. Rules or docs touched: S1 and S3 (read only: the tree and the key are unchanged); docs/spec/data.md
"The instance's layer", docs/spec/fish.md.

## Context

Pierre, 2026-11-08: "les droits, ils me sont à moi à 100 %" (#737). The corals' part (#1309), the fish slides, the IMR tag
and the dive-sign mark (#1328) and the PDF's species fields (#1578) went into the IMR instance's layer. The design note
[docs/reviews/2026-11-25-imr-layer-round-3.md](../reviews/2026-11-25-imr-layer-round-3.md) (REE-294, section 1.1) lists
what remained in the shared fish source: the entries' names. This is the second half of its first PR, cut in two as rule
W27 asks after #1328's six rounds: the node names, `fam` and `pdf` (part 1b; part 1a was the species fields and `deploy`).

## Decision

The same pattern, the integrator's calls, each easy to undo (a tooling move: `fish.json` and `data.json` byte for byte
the same, nothing players see). The note's questions (a) to (d) are not touched.

- **What moved.** `tools/instances/imr/fish.json` `nodes` now holds, for the 27 entries the layer tags `imr`, `name` (as
  IMR names it) and `fam` (the family as IMR writes it), and the `name` of their 7 sub-entries; and `pdf`, the PDF's
  section tokens, for the 43 entries that have one, whatever their source (the PDF is IMR's list). The base keeps the
  entries of the other sources (circles 2 and 3), their `name` and `fam`, and for every entry the tree (ids, sub-entry
  ids, order) and the WoRMS mapping (`ref`, `not`), which identify the entries and place every species.
- **Mixed ownership, decided by the layer's tag.** The layer owns `name` and `fam` on an entry it tags, and only there.
  The base holding a `name` or `fam` for a tagged entry stops the build, even when the layer gives none; the layer giving
  `name` or `fam` to an entry it does not tag, or a `name` to a sub-entry of one, stops it too. `pdf` is the layer's on
  every entry: the base refuses it everywhere. This is the shape of #1578's `common`.
- **Fallback for an entry with no IMR name** (the note says: its family's label in the key in force). `tools/build_fish.py`
  `node_names`, the one place, used by the full build and by the offline modes, only fills what is missing: an entry takes
  the label of the key in force that its first reference falls under (as the group does), else its WoRMS family, else its
  first reference's name; a sub-entry, its first reference's name; `fam` is the WoRMS family when the references have one
  only (`null` otherwise, as an entry with no `fam` always gave). The note does not settle a node with several
  references (Groupers: three WoRMS families) or a sub-entry; this is the most literal reading, the integrator's call to
  confirm. Nothing of IMR's edition reads the fallback: the tag says "IMR's entry", so the layer must give a tagged entry
  its `name` and `fam` and its sub-entries their `name` (the build stops otherwise), and the fallback is only for an
  entry no layer tags (an edition without the layer), never written as an IMR name.
- **`relay_names`** takes `name` (and `fam`, `wfam`) off `fish.json` and lays them back from the composed source, where
  the build writes them (after `id`), recomputing `wfam` from `fish.json`'s own reference tree. An IMR name or family
  edited in the layer is therefore laid again by `--regroup` with no WoRMS call, and `--regroup --check` proves it.
  `pdf` is read only by the full build's cross-check report and is not in `fish.json`.
- **Genera tagged by a sub-entry.** `add_families` takes a genus's `imr` tag (and the `from: imr` genus names of
  `tools/fish_genus_names.json`) only from the sub-entries of an entry the tag marks, as the families' `imr` already was.
  For IMR's edition every sub-entry is under a tagged entry, so nothing moves.

## Consequences

- IMR's edition is unchanged: `fish.json` and `data.json` are byte for byte the same (`build_fish.py --regroup --check`
  and `--commonness --check`, and the composed source equal as data before and after), and players see nothing. This is
  not a learning change. The full build (WoRMS, iNaturalist) was not rerun; the change to it is the `node_names` fill
  before the units are built and the use of its result in `teach_out`.
- An edition without the IMR layer has no IMR name on the entries the tag marks (they take their family's label), no
  `families[].imr` and `genera[].imr`, no IMR names among the typed names that `fish.json` `vn` gathers, and no
  cross-check against the PDF's sections. The full build of such an edition still needs more than this (its genus marks
  need the presentation's words); its own tree and names are REE-37's.
- Specified in docs/spec/data.md "The instance's layer" and docs/spec/fish.md; checked by `tests/instance.test.js`.
