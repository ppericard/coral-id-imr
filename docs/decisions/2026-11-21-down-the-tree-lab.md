# Down the tree: a Lab prototype, one photo named family, then genus, then species, each step a partial credit shown on screen only

Date: 2026-11-21. PR: #1387. Rules or docs touched: L4, S1, U13, P5, C3; docs/spec/basics.md "The Lab"; REE-21.

## Context

Down the tree is one of the four formats Pierre approved on 2026-11-18, as the multi-photo study (#1081) relays it (a paraphrase:
his own words are not in the repo): one photo, the question walks family, genus, species, each step a partial credit. It goes
in the Lab first; graduating needs his word (rule U13). Its scoring (a partial credit per step in the global score, the
sheet's replay, rules D3-D5) comes with graduation, not here.

## Decision

Built as the Lab prototype the issue describes (Tools › Down the tree, `proto/downtree.js`), nothing recorded, no rules
version, no sheet change. Choices made while building, none decided with Pierre, each easy to change (integrator's calls):

- **Rule L4 holds**: a step is asked only on a unit the player has unlocked (`unlocked()`), so the walk stops at the finest
  rank met; a player with the families alone gets the note "Meet a few in the quiz first" (the scientific genera and species
  open as the quiz opens them). The wrong names of a step may name any unit of the rank, as the quiz's do.
- **One engine (S1)**: the lineage is read from the records (`parent`, `rank`: the fish's family, genus, scientific species;
  the sea slugs' genus, species), never from a subject's name. The tool is offered to a subject whose tree has species
  units (`TREEU.ssl`): not to the corals, which have no rank below the genus.
- **The species step is the scientific species unit** (`sci:`), under its genus: the common-name species (`s:`) hang from the
  family, a second tree, so they cannot follow a genus step. Its common name stands small under the scientific name.
- **A wrong step does not end the walk**: the right name is ticked in its chip and the next step goes on under the true
  branch, so each step is a credit of its own. The end sheet is the quiz's own, headed "Yes", "Partly" or "No" with "N of M
  steps right"; a running tally of the steps (kept nowhere) sits under the names.
- **The photo**: drawn from an unlocked genus or species unit (so its species fixes the chain), the draw's own choice
  (`photoSet`). Nothing is named, no source shown, the enlarged view blind until the walk is over (rule P5).
- **Names per step**: 3 or 4 of one rank, no two of one label (`choiceNames`): the siblings under the same parent first
  (declared look-alikes before the others), then other units of the rank.

## Consequences

- Tests: `tests/downtree.test.js` (the lineage, the steps cut at the first unit not unlocked, the names, the recorder grep, no
  subject named, the registration) and `tests/downtree.check.js`, played by the fish smoke (rounds at 390 and 1280 px: one
  screen in every state, right and wrong steps, the partial credit, no progress, log or answer count changed, no unit opened).
- Left, for when Pierre has judged it by taps: the scoring of a step (its weight in the global score, how a wrong
  step is logged, the replay: ROADMAP "Down the tree"), whether a wrong step should end the walk, the sea slugs' walk once
  their species units are checked in a smoke, and whether the game should open to a player who has the families alone.
