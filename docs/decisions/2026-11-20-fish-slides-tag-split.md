# Fish slides, IMR tag and dive-sign mark: moved into the IMR instance's layer

Date: 2026-11-20. PR: #1328. Rules or docs touched: C1, C2, S1; docs/spec/data.md "The instance's layer"; ROADMAP
"Separate IMR-owned content from the core app".

## Context

Pierre, 2026-11-08: "les droits, ils me sont à moi à 100 %" (#737). The ROADMAP row built from it lists what still sat in
the fish sources after the sheet overlay's step 5 and #1309 (the corals): the slide references `sl`, the IMR tag and the
IMR names. The fish part follows the corals' move: IMR's presentation, its slide numbers and its list of entries belong to
the IMR edition.

## Decision

The same layer, the same pattern, extended: the integrator's calls below, each easy to undo (a tooling move, with
`fish.json` unchanged byte for byte, nothing players see).

- **Fields moved.** `tools/instances/imr/fish.json` `nodes` now also holds, per teaching node, `src` (`"imr"`, the 27
  entries of the presentation) and `sign` (`false` for the one entry off its dive-sign list, Spadefish), and, per teaching
  node and sub-entry, `sl` (its slide numbers). A new map, `species`, holds each species' `sl` (the slide that names it,
  23 species). `tools/instance.py` `fish_compose` lays them on `tools/fish_source.json`; `tools/build_fish.py` reads the
  composed source in every mode, and the offline modes' `relay` takes them off `fish.json` and puts them back (`relay_head`
  for `src` and `sign`, `relay_node` for `sl`, `relay_species`), so the byte check covers them.
- **`src` is mixed.** A node's `src` is the IMR tag (`imr`) or the sources' (`pdf`, `diver`, `wink`). Only `imr` is the
  layer's; the others stay in the base, and the layer giving any other value, or a tag to a node the base already
  tags, stops the build. Without the layer a node has no tag: `teach_out` no longer defaults to `imr`, so an edition
  without the IMR layer has no IMR entries rather than an invented tag.
- **The IMR names stay with the entries.** A teaching node's `name` and `fam` (the IMR entry's name as IMR writes it) sit
  with its `id`, `ref` and `pdf`, which identify it and place its species; the layer holds fields of an entry the base
  names, never an entry, and `fish_compose` still stops on a layer node the base does not hold. What makes a name IMR's is
  the tag (`families[].imr` follows it), which moved. Moving the entries themselves (`teach` as a tree in the layer)
  changes the layer's format and is left for the step that comes with a second instance, as the corals' slate structure was.
- **Left in the sources** (listed in data.md "Not in the layer yet"): the teaching nodes' names, `fam`, `ref`, `pdf` and
  tree; the IMR PDF's common names and sections (`common`, `pdf`, `sec`, `cs`) and the species' `src: slides`;
  `juv`, `varAt`, `aka`, `often`, `dimorph` and `keyGroup` (ours or the key's); the references of the lecture photos;
  `deploy`; `core.js` `ORG`.

## Consequences

- The IMR edition, today's, is unchanged: `fish.json` is byte for byte the same (`build_fish.py --regroup --check` and
  `--commonness --check`, and the composed source equal as data before and after), and players see nothing. This is not a
  learning change.
- An edition without the IMR layer has no presentation slide, no IMR tag and no dive-sign mark on its entries, and the
  families carry no `imr` name and no look-alike line sourced "IMR fish presentation, slide N".
- Specified in docs/spec/data.md "The instance's layer"; checked by `tests/instance.test.js`.
