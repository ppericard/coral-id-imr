# The exam's reserve

Each player has a reserve of their own, in every subject: per unit with a mastery exam, a few observations (a fish, a
colony: rule P4) that this player never sees in practice and that their exam asks first. This is the specification of
what the code does now; the rule is in [LEARNING.md › The reserve in the game](../LEARNING.md#the-reserve-in-the-game),
why it was decided in [docs/decisions/](../decisions/README.md) and the PRs; the exam itself in
[model.md › Progress and mastery](model.md#progress-and-mastery).

- **Whose and which**: `core.js` `reserveOf(X, id)` gives player `id`'s reserve over the units as built, a Set of
  species + ' ' + observation (`treeObs`; a unit with no species, a coral genus, by its key). The id (`reserveId`) is
  the account's name in lower case, else `~anon <id>`, the device's anonymous id as the sheet logs its answers (`app.js`
  `resId`). Within each species the eligible observations come in the order of `resHash` (FNV-1a with murmur3's
  finaliser) of the id, the species and the observation: the same on all of a player's devices, another order for
  another player.
- **Eligible** (`resOut`, `resCards`): an observation none of whose photos, game photo or not, is Pierre's own, of
  reference level (`refLevel`), or on a card (a unit's cover and ★ pick, its featured photos, the cover of a species or
  genus with no unit). Never by a photo's route or source (rule P1): an IMR lecture photo or a reference source's photo
  below reference level is reserved like any other.
- **How many** (`RESERVE`): up to `target` (15, three exams of `EXAM.n`) per unit with an exam (not `noex`), across its
  species in turn, never leaving a species fewer than `keep` (8) nor a unit with an exam fewer than `floor` (30) in
  practice; each such unit's floor bounds what the others take from its species. The units with the most observations
  first (a family before its genera), each topped up to the target. Only from a real surplus, learning first when
  photos are few: a thin genus inside a rich family keeps its photos, and a thinner unit reserves little or nothing (its
  exam asks the photos this player has not seen). Another player's order differs, so every photo is practised and rated
  by others.
- **Stateless**: a function of the player's id and the photos in play, so a photo added or gone moves the reserve at its
  margin only; an observation that comes into the reserve after it was seen waits behind the fresh ones in the exam.
  The sheet could compute a player's reserve the same way (the answer log's player, `reserveId`) and never needs to.
- **Out of practice**: `reserveSplit(X, R)` moves the reserved photos out of every unit's `views` and game lists (`sl`)
  into its `held` lists by view (copies marked `ho`), as new list objects; `heldOf(g, v)` reads them. `app.js`
  `reserveOn` runs both on the corals' `build` (after `applySlots`) and on every tree subject's `treeBuild` (after
  `treeCurate`, so the cards are known); `resSeen` makes the units again at the next page change when another account
  signs in without a reload. No game, card, sheet or list reads `held`.
- **The exam** (`model.js` `examPics`: the game photos and `heldOf` of each view; `examSet`): the hardest photo of the
  first pool that has one: the player's reserved observations never shown to them, then any observation never shown to
  them, then the least seen of those never answered right, then the least seen. Never shown means on no unit
  (`shownAll`) and by observation, whatever photo or view of it was shown (rule L3). `genusDiff` and the variant groups
  (`varUnitOf`) read the views and the held lists together, so a unit's difficulty and its variant table are the
  sheet's, which has no reserve (rules D8, D9).
- **Logged** `|h` (`quiz.js`, after `|c`, before `|kN`, `|t` and `|x`) and counted like any answer, in the sheet's
  photo statistics too. No replay reads `|h`, so the reserve needs no replay branch and no rules version.
- **The simulations**: `tools/learnsim.js` gives each profile and seed its own anonymous id (`simId`), so the app
  splits its reserve; `tools/ratedworld.js` `engine` splits one per simulated player (`id`), Pierre's ★ picks kept in
  practice as the app keeps them.
- Tests: `tests/reserve.test.js`; `tests/draw.smoke.js` plays an exam answer on a reserved photo (`quiz|h|x`).
