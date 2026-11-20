# Species by scientific name in the app: one set for both subjects, one gate, the kind beside the rank

Date: 2026-11-19. PR: #1273. Rules or docs touched: docs/spec/fish-game.md, docs/LEARNING.md, docs/FISH_PATH.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/reviews/2026-11-18-species-step2-plan.md.

## Context

The sheet replays the species by their scientific names since script v198 (#1249, `sync.js` `SCI_SHEET`). The species
step 2 plan's third step makes them the app's own for the fish and the sea slugs: their units, opening, choices, display,
typed answers, faults, card, achievements and My progress section. The plan's design and Pierre's answers (Q394-Q404,
2026-11-17 and 2026-11-18) say what players see; how it is built was left to the integrator.

## Decision

- **Two trees** (Pierre, 2026-11-18 ~09:17: "Ce sont 2 arbres pédagogiques indépendants"): a species by its scientific
  name hangs from its genus (Q397, "lance", 2026-11-18 ~06:32) and opens from the genus at Advanced, never from its
  common-name unit. A genus out of play brings none of its species, their bars kept (Q402 A).
- **Smaller faults** (Q394, Pierre, 2026-11-17: "A"): typed, the species' own common name is half a miss, its genus alone
  (or with a second word no game species has) a quarter. Another species' common name, or another genus, is no smaller
  fault: the usual nudge. That narrow reading is the integrator's call (easy to correct: the log keeps the text typed).
- **One gate, one set** (the integrator's call, rule S1): the sheet PR replayed both subjects' species in one script
  version, so `SCI_SHEET` opens both; `core.js` `SUBJECTS` `names` declares each subject's kinds of name, and one set
  (`app.js` `SCI_SP`) serves both. This follows main's shared engine where the plan expected the sea slugs to be gated
  by their own replay version.
- **The kind beside the rank** (the integrator's call): `app.js` `kindRank` keeps choices, typed names, groups and
  mimicry traps in one class; the rank logged and the share's levels stay the rank.
- **Display, card and words** (the integrator's call, easy to correct): the display schedule's starting values
  (`app.js` `SCISHOW`, the plan's §2.4); the first species' card, in each subject's words (the fish's names the
  milestone of 2026-11-04, "You've unlocked scientific names: questions of this kind start coming"); the four
  achievements' tiers and fdauin20 read on the scientific bars (the plan's §2.6; names Q299).

- **Their cost on the scientific genera** (Q440, Pierre, 2026-11-20 05:39: «Bien sûr qu'il faut accepter ce coup-là.
  Ne pas l'accepter, c'est ne pas faire le jeu, en fait.»): about 1.3 fewer genera at Advanced after 3,000 answers in
  the rated world, as they take their questions from the genus level, accepted.

## Consequences

- The app's species units equal the sheet's replay units for both subjects (`tests/fishreplay.test.js`); the fish's
  score tree with them is the board's (`core.js` `treeBoardTree`).
- `tools/ratedworld.js` plays them, and `tools/learncmp.js` holds the scientific genera at Advanced as a guardrail.
- Specified in docs/spec/fish-game.md "Species by scientific name (step 2)" and docs/LEARNING.md "Species by their
  scientific names (step 2)".
