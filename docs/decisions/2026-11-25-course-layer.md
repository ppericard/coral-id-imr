# The lecture's photo references move into the IMR instance's layer, written by `datajson.dump()`; the coral slate is declared and checked

Date: 2026-11-25. PR: #1581 (REE-294, parts 2 and 3). Rules or docs touched: W16 (one sentence: where the IMR fields are
edited); docs/spec/data.md "The instance's layer", docs/spec/tools.md.

## Context

Pierre, 2026-11-08: "les droits, ils me sont à moi à 100 %" (#737). The corals' fields (#1309), the fish slides and tag
(#1328) and the fish names and PDF fields (#1578, #1580) went into the IMR instance's layer. The design note
[docs/reviews/2026-11-25-imr-layer-round-3.md](../reviews/2026-11-25-imr-layer-round-3.md) (REE-294) lists what is still in
the shared files: here the references of the lecture photos (`data.json` `course`, 118 records, and the lecture's `cmp`
record), and the IMR slate, which is written in the shape of `data.json` and in a constant of the core.

## Decision

The integrator's calls, each easy to undo (a tooling move: `data.json` and `fish.json` byte for byte the same, nothing
players see). The recommended defaults of the note's questions (a) and (b) are kept: the slate is declared and checked, not
read, and the lecture records stay laid into `data.json`.

- **The lecture's photo records** move to a new layer file, `tools/instances/imr/course.json` (`layer.course` in
  `tools/instance.json`): `course` (the 118 records over 34 genera, one genus per line) and `cmp` (the lecture's comparison
  record: the `cmp` records with `imr: true`). `tools/imr_sources.json` moves beside it, to
  `tools/instances/imr/imr_sources.json`: it is about IMR's photos. The photos stay in `img/` and on R2 (REE-93).
- **One writer instead of a check in each tool** (rule W27's model). About fifteen tools write `data.json`; refusing an edit,
  as `dump()` does for the genus fields, would break each of them. `datajson.dump()` takes the `course` and the lecture's
  `cmp` records it changes from the `data.json` on disk and writes them to the layer file, and `data.json` gets the same
  records; `load()` lays the layer on what it reads, and a tool that reads `data.json` itself and leaves the records alone
  does not undo an edit of the layer file made since; the rewrite and `--check` give `data.json` as the layer says. No tool
  changed except the three that name `imr_sources.json`. The Candidate photos workflow, which commits what its tools write
  (an excluded or restored lecture photo changes the layer file too), stages and allows `course.json` beside `data.json`. Data with no
  `course` or `cmp` is data that does not say, and gets the layer's. A `cmp` record without `imr: true` is the sources' and
  stays in `data.json`, after the lecture's.
- **The layer wins over `data.json`'s copy.** A hand edit of those records in `data.json` is replaced at the next load or
  rewrite, with a line on stderr; `--check` fails until the two agree. Rule W16 says where to edit (one sentence, mechanics
  only, the same move of place as S3's clause in #1578).
- **The coral slate** is declared in the coral layer, `slate: {order, benthic}`: the genera of `data.json` `gen` in the
  games' order (1 to 34, then the five starred genera) and the genera of `data.json` `x` that the core adds (`BENTHIC`).
  `data.json` does not carry it and nothing reads it at run time. `python3 tools/datajson.py --check` (and so the PR check)
  fails when `data.json` `gen` or the core's `BENTHIC` differ from it, or the numbers of the genera are not 1, 2, … then 0.
- **Curation skips an id it does not know.** Read: `core/curation.js` (`applyCuration`: exclude, single, out, add, hide,
  move, feat, cover, levels; `applySlots`: pins and hints through `find` and `filter(Boolean)`, quality, use) and the
  admin (`own`, `photos` and `KNOWN` are built from the data lists; `hidden`, `viewOf` and `outs` are asked of each photo
  listed, never of an id; `rowOf` finds its pins and `cover` its pick with `find`, then falls back; `missing()` lists the
  choices that name nothing). Each path drops the id or finds nothing, none stops, and the admin keeps the choice and
  lists it. `tests/coursecuration.test.js` checks it on the real
  files: ghost ids in every field change no list a player reads, and an edition with no lecture photo plays the real
  `curation.json` with no lecture photo in any list and the field photos unchanged. `curation.json` is not touched (rule A1).

## Consequences

- IMR's edition is unchanged: `data.json` and `fish.json` byte for byte the same (sha256 before and after, and
  `tests/instance.test.js`), and players see nothing. This is not a learning change.
- An edition without the layer has no lecture strip on the genus sheet, no lecture comparison, and smaller game pools by
  the photos the lecture gave each view; Pierre's choices naming those photos have nothing to apply to and are kept.
- Still left for a second edition (REE-37): the fish tree in the layer, the slate as data the core reads (question (a)), the
  lecture photos' own file that only an IMR edition loads (question (b)) and C8's wording (question (c)).
- Specified in docs/spec/data.md "The instance's layer" and docs/spec/tools.md; checked by `tests/instance.test.js`,
  `tests/imrsources.test.js` and `tests/coursecuration.test.js`.
