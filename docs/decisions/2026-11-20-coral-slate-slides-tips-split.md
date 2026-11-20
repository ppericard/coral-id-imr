# Coral slate numbers, lecture slides and lecture ID tips: moved into the IMR instance's layer

Date: 2026-11-20. PR: #1309. Rules or docs touched: C1, C2, W16; docs/spec/data.md "The instance's layer"; ROADMAP
"Separate IMR-owned content from the core app".

## Context

Pierre, 2026-11-08: "les droits, ils me sont à moi à 100 %"; "quitte si besoin à licencier une version IMR à IMR ... ça me
garde l'ensemble des droits pour moi" (#737). The ROADMAP row built from it lists what still sat in the sources after
#984 and #1170 moved the lecture notes, mnemonics, groups and pairs: the ID tips `qt`, the slide numbers `sl` and `rsl`,
the slate number `n`. They are IMR's text or IMR's course structure, and an IMR edition would carry them.

## Decision

The same layer, the same pattern, extended: the integrator's calls below, each easy to undo (a tooling move, with the
built `data.json` unchanged byte for byte, nothing players see).

- **Fields moved.** Per genus, `coral.json` `gen` now holds `n`, `sl`, `rsl` and `qt` beside `ig`, `imr` and `mn`.
  `tools/instance.py` lays them back where `data.json` has always had them (`CORAL_AFTER` gives each its anchor: `n`
  after `tr`, `sl` after `lsrc`, `qt` and `rsl` after `sl`), so the key order, and so the file, is the same.
- **Which `qt` are the lecture's.** A genus's `qt` is the layer's unless the genus has a `tl` heading (Merulina,
  Cyphastrea, Halomitra): their tips are condensed from the Coral Finder, not the lecture (`apply_id_tips.py`), so they stay
  in the sources, as do the `x.gen` genera's. 36 genera have theirs in the layer. The layer giving `qt` to a `tl` genus
  stops the build.
- **`qt` is the IMR layer's although the sheet overlay design note calls it "ours".** The note says so about who may
  edit it (the tips are our condensation); the ROADMAP row, agreed by Pierre, lists it among the IMR text, and a
  condensation of the lecture notes is a derivative of them. Moving it back costs one edit of `CORAL_AFTER`.
- **The slate number `n`** (0 for the five starred genera) moves; the slate's structure (the starred genera's rule,
  Millepora, the bonus genera, `app.js` `slateGenera()`) does not: the design note keeps that for the step that comes
  with a second instance.
- **Writers.** `tools/apply_id_tips.py` writes the layer for the lecture's genera and `data.json` for the Coral Finder's;
  `dump()` refuses a `data.json` edit of any moved field, as it does for `ig`, `imr` and `mn`.

## Consequences

- The IMR edition, today's, is unchanged: `data.json` is byte for byte the same, and players see nothing. This is not a
  learning change.
- An edition without the IMR layer has no slate number, no lecture slide and no lecture ID tips for 36 genera, only the
  three Coral Finder tips. That edition does not run today: the app reads the slate number, so a second instance's slate
  needs its own layer.
- Left in the sources for later PRs: the fish `sl` (laid by `build_fish.py` `relay`), the IMR tag and names (`src:
  imr`, `sign`), the references of the lecture photos, `deploy`, and the slate's structure; `core.js` `ORG` waits for a
  PR that may touch `core.js`.
- Specified in docs/spec/data.md "The instance's layer"; checked by `tests/instance.test.js`.
