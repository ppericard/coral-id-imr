# Find the X on a mimicry pair: the class's photo is the decoy tile, dormant until the class has tiles

Date: 2026-11-21. PR: #1412. Rules or docs touched: L11; docs/LEARNING.md "The mimicry class".

## Context

The mimicry pairs M1-M7 are drilled as a trap, a duel and an Again ([record](2026-11-19-mimicry-pairs-drilled.md)), with
their marks after a mix-up ([record](2026-11-19-mimicry-marks-feedback.md)). Find the X on the pair was left, to come
once the species are units ([record](2026-11-21-find-the-x-species.md), REE-45).

## Decision

Pierre, 2026-11-19, 06:58 Manila, Q416 (c), Find the X on the pair, on the question "a photo of the class would be the
decoy tile on Find the Angelfish" (#1162): «ok. Du coup à mettre dans la suite des trucs à faire».

Built as worded. Choices made while building, none decided with him, each easy to correct (integrator's calls):

- **The decoy takes the weakest trap's place** (`model.js` `mimTrap`), so the four keep the traps the draw gave.
- **The model's own tile is the species resembled** (`mimSide`, `drawHas`) while its draw holds one now, else any tile.
- **No wait for the pair's card**: as the 4-choice trap, the first question showing a photo of the class brings the card
  at the break at Next (`mimArm` reads the four tiles); the duel waits for it, a tile does not need to.
- **The decoy counts as a look-alike among the four** (`pgLook`, logged in `sc`) and a decoy tapped queues the pair's id
  with its Again, as the 4-choice trap does; a replay reads the log, so no rules version (rule D5).
- **Only the model's side**: a Find the X whose own photo is of the class (the resembling side) is not changed.

## Consequences

- **Dormant on today's data**: Find the X draws only photos with a tile, and on 2026-11-21 the resembling species of M1-M5
  and M7 have none (M6's two). It comes up as those photos are boxed (a judging pass, measured first, Q441).
- `tests/findxmim.test.js` (the real functions in a vm), `tests/fish.smoke.js` part 11b (the class's photos given a tile
  in the page: "Find the Angelfishes" always has the Surgeonfishes' juvenile as its decoy).
