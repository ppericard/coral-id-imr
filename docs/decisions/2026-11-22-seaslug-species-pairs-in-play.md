# Sea slug species look-alikes: the decided species pairs in play as declared look-alikes

Date: 2026-11-22. PR: this one. Rules or docs touched: S1, D4, D5, L11, L12; `core.js` `treeSpUnits` (`spDecl`),
`app.js` `treeGenera`, LEARNING.md "Confusion groups", spec/tools.md, spec/fish-game.md; Linear REE-20 (step 2 of
[2026-11-21](2026-11-21-seaslug-species-pairs.md)).

## Context

`seaslug.json` holds three decided species pairs as each species' `look`: the two Spanish dancers, *Hexabranchus lacer*
/ *H. sanguineus* (Q377, Pierre, 2026-11-15), and *Thecacera pacifica* / *T. pikachu* and *Chromodoris alcalai* /
*C. dianae* (Q390 D, Pierre, 2026-11-17, paraphrase: the specialist-sourced species pairs declared; recorded in #1394).
Nothing read a species record's `look`: every species unit had `decl: []`.

## Decision

Carrying out Q390 D and Q377: one path for every subject (rule S1), `core.js` `treeSpUnits` gives each species unit, at
both levels (`cn`, `sci`), `decl`: the species its record's `look` names that have a unit at the same level; its `look`
is the other species of its family, then those. `app.js` `treeGenera` copies `decl` into the unit's record, which
`model.js` `declaredOf` reads (no `model.js` edit).

Integrator's call, easy to correct, made by the agent and listed for the integrator: **no rules version and no gate.**
Each decided pair lies inside one family, so a species unit's `look` is the same set as before; the confusion prior
(`model.js` `isLook`, `confPrior`) and the sheet's replay (`core.js` `treeReplayGen`, `replayProgress` `prior`) read
`look`, never `decl`. `treeReplayGen` is byte-identical to `main`'s on `seaslug.json` and `fish.json`
(`tests/seaslug-looks.test.js`), so every replay, leaderboard and variant table is unchanged: an RVS entry would replay
every player to the same numbers. What `decl` changes is live only: the confusion groups (the two species of a pair open
close together), and the custom quiz's "My mix-ups" view before a player's own mix-ups. A future pair across two families
would change `look` and the replay: that PR appends a rules version (rule D5) and gates on the script (rule D4).

## Consequences

- The fish species carry no `look`: their units' `decl` stays empty, the fish replay is unchanged (no `FISH_RVS` entry).
- Rule L11: level 1 (one kind of unit, the sea slug species). `tools/learnsim.js` plays the corals and the fish only, so
  the app world cannot measure the sea slugs: the measure cannot tell. Rule L12: the replay's inputs are identical, so
  the real log replays to the same numbers by construction.
- Still not built (Linear): a surface that shows a species pair with its words (a species sheet's "Don't confuse with",
  a deck card).
