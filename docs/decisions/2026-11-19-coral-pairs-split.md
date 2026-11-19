# Coral look-alike pairs: the IMR lecture's split from the Coral Finder's, into the IMR instance's layer

Date: 2026-11-19. PR: #1170. Rules or docs touched: C2, W16; docs/spec/data.md "The instance's layer"; ROADMAP "The
Tree tab…" and "Separate IMR-owned content from the core app".

## Context

The coral look-alike pairs from the IMR lecture sat in `data.json` `look` and `lsrc` with the Coral Finder's.
#984 had moved the IMR instance's other coral fields (`imrg`, `ig`, `imr`, `mn`) to
`tools/instances/imr/coral.json`, but it left the pairs out. Splitting them needs a stored order, because the game reads
the order of `look` (the traps, `core.js` `lectureGroup`'s ties). The sheet overlay design note v2 had already given the
pairs their owners: the Coral Finder's to the sources, the IMR lecture's to the IMR instance.

## Decision

The design note's split, built as #984 built the rest; the choices below are the integrator's calls, each easy to undo:

- **Which pairs are the lecture's.** A pair is the lecture's when its recorded `lsrc` line is the lecture's words
  (`IMR Lecture 6: …`, 6 pairs) or its groups (`Same IMR lecture group: …`, 7 pairs, derived from `ig`, already the
  layer's).
- **The pair cited as "IMR Lecture 6 and Coral Finder p. 18"** (Goniastrea and Leptoria) stays in the sources, because
  the book names it too.
- **Pairs that also share a Coral Finder box go whole to the layer.** The 6 pairs in the lecture's words also share a
  Coral Finder box. Their recorded source is the lecture, so they go to the layer whole: no base line `data.json` does
  not hold is made up for them.
- **The format.** `coral.json` `pairs` `{"A|B": {src, look}}`, one line per pair. `look` gives each side's place in its
  genus's `look`. `lsrc` lines go back in `gen` order, the order all of them follow. `data.json` keeps its copy, byte
  for byte, laid on by `tools/datajson.py`.

## Consequences

- An edition without the IMR layer plays the 71 Coral Finder pairs alone. The IMR edition, today's, plays all 84
  pairs as before: `data.json` is unchanged, and players see nothing. This is not a learning change.
- An edition without the layer still has some limits:
  - It loses the 6 lecture pairs that also share a Coral Finder box. Keeping them would need their box line in the
    sources and a layer line laid over it.
  - Galaxea and Lobactis have no look-alike left.
  - The Goniastrea–Leptoria line still cites the lecture.
- A lecture pair's line or direction is edited in the layer file, never in `data.json`: `dump()` refuses it. A pair
  taken out of the layer must be taken out of `data.json` too. `tests/instance.test.js` fails on a lecture line left in
  the sources.
- Specified in docs/spec/data.md "The instance's layer".
