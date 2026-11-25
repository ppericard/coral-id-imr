# The PDF's species fields and `src: slides`: moved into the IMR instance's layer; `deploy.key` into `tools/instance.json`

Date: 2026-11-25. PR: #PRNUM (REE-294, part 1a). Rules or docs touched: S3 (mechanics clause), C8 (read only: the list
still confirms presence for IMR); docs/spec/data.md "The instance's layer", docs/spec/fish.md.

## Context

Pierre, 2026-11-08: "les droits, ils me sont à moi à 100 %" (#737). The corals' part (#1309) and the fish slides, the IMR
tag and the dive-sign mark (#1328) went into the IMR instance's layer; the design note
[docs/reviews/2026-11-25-imr-layer-round-3.md](../reviews/2026-11-25-imr-layer-round-3.md) (REE-294) lists what is still
in the shared fish source. This is the first half of its first PR, cut in two as rule W27 asks after #1328's six rounds:
the species fields and `deploy`. The node names, `fam` and `pdf` are part 1b.

## Decision

The same pattern, the integrator's calls, each easy to undo (a tooling move: `fish.json` and `data.json` byte for byte
the same, nothing players see).

- **The PDF's species fields.** `tools/instances/imr/fish.json` `species` now holds, per species of the IMR reference
  PDF (the EventMeasure list, 366 species), `common` (its common name, never corrected), `sec` (its section), `pdf` (its
  pages) and, for the 24 of the cheatsheet, `cs`. A species' `pdf` is what marks it as the PDF's: the other three fields
  are allowed only with it. The base keeps our `common` for the 305 species of the other sources (`dauin`, `wink`,
  `slides`) and their `src`. A species that gets `common` from both stops the build.
- **`src: slides`.** The layer holds that one value for the two species only the presentation names (`s367`, `s368`),
  as it holds `imr` for the nodes. A species with a `pdf` cannot also be `slides`, and a species the base gives a
  `src` (`dauin`, `wink`) cannot be the PDF's. A missing `src` in the base keeps its old reading (`needs_near` asks
  near-Dauin confirmation only of `dauin` and `wink` species and of circle 3), so no build decision moves.
- **`relay_species`** takes `common`, `src`, `sec`, `pdf`, `cs` and `sl` off `fish.json` and lays them back from the
  composed source where the build writes them (`common` after the name, the rest after `present`), so `--regroup
  --check` covers them. A change of a species' `pdf` or `cs` in the layer stops the offline modes, as a circle does: the
  IMR list confirms the species near Dauin (rule C8) and the cheatsheet ranks it, and only the full build moves them.
- **`deploy.key` into `tools/instance.json`** as `key`: the key in force is the deployment's choice, like its `centre`,
  not IMR's content. `tools/instance.py` `fish_source` lays it on the composed source as `deploy.key`, where
  `key_in_force` has always read it; the base refuses a `deploy`. `deploy.region` is dropped: nothing read it, and it
  repeated `centre`.
- **Rule S3's mechanics clause** names where the key in force is (`tools/instance.json` `key`, no longer the source's
  `deploy.key`). The rule's substance is unchanged: the keys are data, every family in a circle attaches to a group of
  the key in force, a region with no key has no such rule.

## Consequences

- IMR's edition is unchanged: `fish.json` and `data.json` are byte for byte the same (`build_fish.py --regroup --check`
  and `--commonness --check`, and the composed source equal as data before and after, `deploy.region` aside), and
  players see nothing. This is not a learning change.
- An edition without the IMR layer has no PDF name, section, pages or cheatsheet rank on its species, and its fish score
  tree packs those species apart (they have no common name). The IMR list no longer confirms a species near Dauin there:
  a species only the list confirmed then needs two Research Grade observers near the centre, or it leaves the game
  (rule C8). Whether another edition's own list counts the same way is for REE-37.
- Specified in docs/spec/data.md "The instance's layer" and docs/spec/fish.md; checked by `tests/instance.test.js` and
  `tests/fish.test.js`.
