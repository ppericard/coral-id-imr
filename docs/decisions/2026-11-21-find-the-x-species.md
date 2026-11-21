# Find the X on the species: both kinds of name, the same share, the units in play only

Date: 2026-11-21. PR: #1410. Rules or docs touched: S1, L4, L11; docs/LEARNING.md "Find the X slipped into the fish quiz", docs/spec/quiz.md, docs/FISH_PATH.md "Formats and their order", 5.

## Context

Find the X (one name, four photos) was asked on the units of a subject's own rank only (the fish families, the sea slug
genera). The species have been units since 2026-11-15 (by common name) and 2026-11-18 (by scientific name, the fish's and
the sea slugs'), and the format was meant to come to them: "the species once they are units" (FISH_PATH.md, Q321). REE-63.

## Decision

Pierre's decision is Q321 (2026-11-09), recorded in ANSWERS.md as a paraphrase: Find the X first, the format agreed on
2026-11-03; the species step is "once they are units". Built, with these choices made while building, none decided with
him, each easy to correct (integrator's calls):

- **Both kinds of name**: a species by its common name and a species by its scientific name each play it; the four units
  are of one kind (`rankKind`), so a question never stands a common-name species beside a scientific-name one, nor a
  family or a genus beside a species.
- **The scientific genera stay out**: a fish scientific genus keeps its usual questions (the format's notebook says so);
  opening them is one line (`findRank`).
- **The same share**: `FIND.P` stays 0.05 of the questions that could be one, in the contrast slot, so the format's share
  of a species-heavy draw is the one of the families'.
- **The units in play only**: `distractors` is called with `wide` false, so the unit rank's other units (not in the pool,
  not in the custom selection) never fill a place; fewer than three others in play, no question.
- **No common name under a scientific name's question**: the quiz's `sc` display labels a choice, and this format has
  none; its prompt is the one name.
- **No rules version** (rule D5): the draw, the scoring, the log (`quiz|f` at the rank `species`) and the exam are as
  before; the format offset `find` is the subject's, fitted on the families' and the species' answers together.

## Consequences

- A fish player at the species level meets Find the X on a species: 170 of the fish's 662 species with game photos have a
  tile (86 of them one only), so the format comes up for them first; 265 of the sea slugs' 271 have one (median 8). The
  fish's other species wait for a box pass (a judging pass, measured first: Q441).
- `tests/findx.test.js` (the classes, `wide` false), `tests/fish.smoke.js` part 11b (both kinds, the kept question).
- Left, for REE-45: the mimicry pair as the decoy tile.
