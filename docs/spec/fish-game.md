# The fish game

What a fish player gets, on the engine every subject shares ([subjects.md](subjects.md)): the units (the families of
the reef fish ID book, then the scientific genera and the species), the circles and their gate, the surprise cards, the
Learn page and My progress, and the global score. The fish content these read is in [fish.md](fish.md), the photos
(`fish-game.json`, the photos in play, included) in [fish-photos.md](fish-photos.md), the sheets in
[fish-sheets.md](fish-sheets.md); the plan behind the levels is [FISH_PATH.md](../FISH_PATH.md). This is the
specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and
the PRs.

## Fish players get

- **The photo quiz** on the families (one photo per question, from one observation), with the first-meeting cards and
  progressive opening, adaptive photos and choices (the identification key's groups first, then the look-alikes;
  confusion scores from the player's own answers), "Again" and look-alike duels slipped into the quiz (the look-alike
  pairs of the IMR fish presentation, `UNITS.fish.pairs`), progress per family with the levels and the silent mastery
  exam, typed questions accepting the family's names, and the comeback after a break. Fish basics is step 0 of the Learn
  path.
- **Learn** = the fish families page (`learn.js` `viewFishList`: by the groups of the identification key in force, in
  its order, only those holding a family, the key credited in full under the list; cues, look-alike lines; each family one
  card that opens its sheet, `app.js` `listCard`: [front-end.md](front-end.md)), and the sheets ([fish-sheets.md](fish-sheets.md)).
- **My progress**: the photo wall, levels, review, mix-ups, the headline % with its three bars
  ([the global score](#the-fish-global-score)), the fish's own leaderboard and achievements (`core.js` `FISH_ACH`).
- **The Duel tab** (`#fish/practice/duels`), on the family look-alike pairs (`UNITS.fish.pairs`).
- **Look-alikes** (`#fish/learn/look-alikes`) and **Compare** (`#fish/learn/compare/A/B`): the declared family pairs
  (`UNITS.fish.deck`, each with its IMR presentation slide), one photo a side, the pair's tell-apart line from the
  families' IMR lines ([front-end.md](front-end.md)).
- **Not for fish yet**: the Custom quiz, the Memory tab (`SUBJECTS` `closed` says why; their
  addresses open the fish page of the section: `subjPage`); Identify is the Fish ID Key's "coming soon" page; timed
  mode and size estimation (video ID, EventMeasure) by design.

### Circles and the gate

**Every circle on the path and in the progress**: `UNITS.fish` `slate` = the families of circles 1, 2 and 3, `core`
= circle 1 (what Open all opens, `model.js` `introLeft`), `gate` = `treeGate` (`model.js` `mayOpen`): circle 2 may open
once every circle-1 family has been met and asked; circle 3 once `treeC3` holds (`SUBJECTS` `gate` `c3`: circle 1's
Entries component of the global score at 55%, else, without that score, circle 1's plain mean at 50%) and the player said yes to
its card or in My progress (`UNITS.fish` `opens`, the `beyond` choice); then the usual weighted opening (`openPick`, the
IMR-tagged families first for a player who answered "I'm at IMR"). There is no ⚙ row for the circles.

Once every unit in play is met and asked and none may open now, a calm card at the break at Next says so and what comes
next, once per reason (`quiz.js` `allMetDue`, `allMetNone`, `allMetArm`, `allMetShow`; `UNITS` `done`, absent for the
corals; `app.js` `fishNextOf`, the sea slugs' `slugNextOf` in their words: [seaslugs.md](seaslugs.md)): `c3`, circle 3 not reached; `beyond`, circle 3 declined, once its offer will not come
back (after a first "Not now" it comes back once, and no card is shown meanwhile); `all`, else: the families still
without a game photo and the Scientific names state, else the exams. It is seen on the device under
`reefid-fish-allmet-<k>` (cleared at sign-out and account deletion with the account's keys, `sync.js` `signOutClear`,
rule D7) and on the account as the told token `allmet:<subject>-<k>`. Tests: `tests/allmet.test.js`.

### Winks

**Winks**, for every fish player, circle 1 included: a rare, late surprise card in the photo quiz (`quiz.js` `WINK`,
`winkDue`, `winkShow`; `UNITS` `winks`: the wink families with a photo, in `fish.json`'s order, the whale shark then the
thresher sharks). Wink i is due from `WINK.AT[i]` answers of the player's record (200, then 400) and at least the gap
between the two after the last one shown, never over a card; each once per player across devices
(`reefid-sync-fish-wink`, merged as a union). The card shows `fish.json`'s absurd choices and lines; its photo is
Pierre's ★ Cover of the unit while in play (`coverP`), else one of the wink's chosen photos (`quiz.js` `winkPhoto`,
`fish.json` `wink.photos` from `tools/fish_wink_photos.json`), never a bad photo. Its answer is logged and never counted
([sync.md › Surprise cards' answers](sync.md#surprise-cards-answers)); docs/LEARNING.md "Winks".

## Fish scientific genera

`app.js` `treeGenera` adds one unit per genus of `fish.json` holding species of a family in play (key `g:<genus>`,
`rank: 'genus'`, `one: 'genus'`, `parent` its family, its family's group as `forms`, its sibling genera as `look`, the
IMR sub-entry's cues when one names it (else its own ID marks,
[fish-sheets.md](fish-sheets.md#genus-presentation-and-id-marks)), its species and the family's photos of them) to
`TREEU.gen`, and `TREEU.sci` lists them; the admin's `treeGen` is
unchanged. The genera of circles 2 and 3 are in the game once the sheet replays them (`sciNow`, `sync.js` `generaOn`,
rule D4). Tests: `tests/fishunits.test.js`.

- **An opt-in set** of the fish (`sci`, `SUBJECTS` fish `optin`): offered once a family is at Advanced, the What I
  learn card's Scientific names row any time ([below](#the-what-i-learn-card-names-rows)). `units()` is the genera of
  the families at Advanced plus those already met; `auto()` (played whatever the set's state but the card's Off:
  `app.js` `autoOf`, `bonusList`) an IMR player's IMR genera (`imrg`: the IMR sub-entry names that genus alone) from
  their family's Open Water plus those already met (`app.js` `sciOpen`; `model.js` `imrSaid`: ever answered "I'm at
  IMR"); `all()` every genus in the game (`setOf`). `units()` reads the families at Open Water instead for a record
  that has `Q.sciH` (turned on by hand before any family was at Advanced, from the former ⚙ row or My progress box;
  synced with the choice); the card never sets it (Q401 A). `rv` is the set's rules version, recorded with each choice as `Q.sciV` (synced with
  it, `sync.js` `mergeSubject`), and `back` the one-time card to a player who turned it on under earlier rules (`quiz.js`
  `bonusBackShow`).
- **Kept in their rank**: `app.js` `rankOf(n)` ('' at the subject's own unit rank): `model.js` `distractors` keeps a
  question's choices in the rank of the unit asked (for a ranked unit any unit of its rank may be a wrong choice:
  `rankUnits`, every genus of the set, met ones first), `quiz.js` `typeMatch(text, rk)` reads a typed answer among that
  rank's names (Chromis: the genus on a genus question, the Damselfishes otherwise), the prompt and the typed form use
  the unit's `one`. Genera are never duel pairs (`UNITS.fish.pairs`), never on the families page (`page: false`), never
  in the families' mean (`progPct`); they count in the fish global score (half a genus's bar is its species' scientific
  credit: `core.js` `treeScore`, [below](#the-fish-global-score)).

### The What I learn card: names rows

Pierre, 2026-11-18 (Q396, Q400 D, Q401 A, Q402 A, Q404 A); decision record
[2026-11-18-what-i-learn-names-rows](../decisions/2026-11-18-what-i-learn-names-rows.md). A subject declares its names rows in one
place, `app.js` `UNITS[id].learn`: `{name, line(), when(), self(), k}`, `k` the opt-in set the row switches (in
`SUBJECTS` `optin`, so the choice syncs and merges). The fish: Common names (`sp`, shown from `SPECIES_SHEET`) and
Scientific names (`sci`: the genera, and through `sciUp` their species); the sea slugs: Species (`ssp`, shown from
`SCI_SHEET`); the corals: none, so no card and no Home link. `learnRows()` keeps the rows whose `when()` holds (rule
D4).

- **A row's state** (`rowOn`): on while not turned off on the card (`Q[k + 'O']`) and either turned on (`Q[k]` true) or
  bringing its units by itself (`self()`: the species; an IMR player's scientific genera, "I'm at IMR" meaning both). A
  record no switch was tapped on reads as it plays: its pool is unchanged. `rowState` adds `'part'`: a row with a
  `part()` line whose set is not on while its `self()` brings some units (an IMR player who never turned the genera on,
  or said "Not now": the IMR genera alone); neither button is pressed, the line says what plays, and On turns the rest
  on.
- **Off** (`learnSet(k, false)`): `Q[k]` false and `Q[k + 'O']` true; `autoOf(S)` then returns nothing, so the units the
  set brings by itself stop too (Q404 A), at every reader (`bonusList`, `setLater`, `shareFree`, `sciUp`, the back
  card). A card's "Not now" or "Close them for now" writes `Q[k]` false alone and keeps them, as before. The units keep
  their bars and the score its one scale (Q402 A). Both fish rows off leaves the families, allowed (Q404 A).
- **On** (`learnSet(k, true)`): `Q[k]` true, `Q[k + 'O']` removed, never `Q.sciH`: a level turned on comes as its
  parent reaches the usual threshold, never sooner (Q401 A).
- **Sync and merge**: `O` travels with the choice (`sync.js` `mergeSubject`'s suffixes) and goes with a reset; `core.js`
  `mergeUsers` keeps it only where both accounts have it (on either stays on).
- **Where**: `progress.js` `learnCard`, right after the player's card on My progress: one line on phones that opens in
  place, open on desktop between the player's card and the side column; Home's Learn door has "What I learn ›" on its
  kicker row (`home.js`), which opens it (`window.WIL_ASK`, set in tier 1 and read by `learnCard`, so a tap before
  `progress.js` loads still counts; the link always navigates). ⚙ has no Scientific names row, and My progress no "Turn on
  scientific names" box. Tests: `tests/namesrows.test.js`, `tests/fish.smoke.js`.

## Fish species, step 1: by common name

docs/FISH_PATH.md "Unlock rules", docs/LEARNING.md "Fish: the species level, step 1, by common name".

- **Units**: `core.js` `treeSpUnits` lists one unit per species with a listed name, in a family in play (`s:` + its id,
  `s:s091`; its family's other species as `look`; `from` its family). `app.js` `treeGenera` builds each record:
  `rank: 'species'`, `one: 'species'`, `parent` and `from` its family, its family's group and forms, `decl: []`, `noex`,
  its family's photos of that species, `sci` its scientific name, `also` its listed names, `name` the player's first
  common name (a getter, `cnFirst`). `TREEU.spl` lists them.
- **Opening** (the species): the set `sp` in `UNITS` fish `sets` (`auto` only: no offer, no switch). `app.js` `spPlay`
  gives each family at Advanced its species met and the next one, in its commonness order. **The rank share**
  (docs/LEARNING.md "The rank share"): `model.js` `SHARE`, one rule for every unit with a `parent` (the fish scientific
  genera and species; no subject named, rule S1): `sharesNow` gives per parent level the share m of its units in play at
  their threshold (`shareAt` in a unit's record, else `LV_AT[SHARE.AT]`, Advanced) and the cap m^`SHARE.POW`; `shareW`
  (in `weighted`) scales the drawn weights of the units hanging from that level to at most the cap of the total;
  `shareRoom` lets one more of them open (`quiz.js` `planPhoto`'s `fresh`, `tools/ratedworld.js` the same) only while
  they take less of the draw (`drawW` of the units met) than the cap. A unit with no parent, or whose parent is no unit
  of the game, is never touched (the slate, the coral bonus genera, the sea slugs' genera, whose family is only their
  structure); nor are `app.js` `shareFree`'s (an IMR player's IMR genera; the set turned on by hand early). `model.js`
  `ability` and `quiz.js` `answer` pass `from`, so a species never answered starts from its family (`core.js`
  `abilityOf`); `model.js` `examOn` skips a `noex` unit.
- **Display and typing**: a choice shows its common name, the scientific name in small type under it (`quiz.js`
  `question`, `.csn`; `app.js` `uplain`: a unit with `sci` is upright). Typed answers read every listed and regional name
  as the unit's (`UNITS` fish `names`, `cnTypeNames`). `model.js` `choiceKeys` keeps a wrong choice off any listed name
  of the target.
- **Score and gate**: the tree with the species (`TREEU.treeSp`, `treeScoreTree(X, F, true)`) only when `app.js` `spOn`
  (`sync.js` `speciesOn`: `TREE_SHEET` and `SPECIES_SHEET`, rule D4). The sheet's replay lists the species units with
  their `from` (`core.js` `treeReplayGen`), so a species picked wrongly and a species' start replay as the game scores
  them.
- **Rest**: the first species card carries the milestone line (the set's `card`, a function of the unit). The
  achievements fsp1, fsp10 and fsp50 read `achSnap` `setsAdv.sp`. A species unit opens its species sheet (`treeSheets`
  `spOf` reads `s:s091`).

## Species by scientific name (step 2)

docs/reviews/2026-11-18-species-step2-plan.md, docs/LEARNING.md "Species by their scientific names (step 2)". Both tree
subjects, one code path (rule S1): `core.js` `SUBJECTS` `names` says which kinds of name a subject's species are asked by
(fish `['cn', 'sci']`, sea slugs `['sci']`).

- **Units**: `core.js` `treeSpUnits(F, X, 'sci')` (`sci:` + the species id in letters and digits: `sci:s091`,
  `sci:xgoniobranchussp5`; the other scientific species of its family as `look`; `from` its genus). `app.js`
  `treeGenera` builds each record for a subject with `sci` in its names (`X.kinds`): `kind: 'sci'`, `rank: 'species'`,
  `name` its scientific name, `parent` and `from` its genus, its genus's group and forms, `noex`, its genus's photos of
  that species (never a genus-level `gl` photo), `cn` the player's first common name (a getter; '' for the sea slugs),
  `names` its own and its WoRMS name. `TREEU.ssl` lists them. The common-name units carry `kind: 'cn'`; the app's units
  equal the sheet's replay units, both subjects (`tests/fishreplay.test.js`).
- **The class**: `app.js` `kindRank` (its rank and its kind) keeps a question's choices (`model.js` `distractors`,
  `rankUnits`), its typed names (`quiz.js` `typeMatch`, `typeKind`), its groups and its mimicry traps (`model.js`
  `rankKind`) in one class; the logged rank and the share's levels read `rankOf` alone.
- **Opening**: the set `ssp` (`app.js` `SCI_SP`, in both subjects' `sets`; `auto` only: no offer, no switch). `app.js`
  `sciPlay` gives each genus in play (`sciUp`: the slate and the other sets' units in play) at its threshold (`shareAt`,
  else Advanced) its species met and the next one in the genus's order; a genus out of play brings none (Q402 A). Share:
  the genus level (`model.js` `SHARE`, unchanged). Live answers on a locked one count, opening nothing (`model.js`
  `introLive`).
- **Display**: `app.js` `sciShow` on the unit's own bar: `sc` (the common name under each scientific name, upright,
  `.csn small.cnu`) below Open Water, `so` (scientific only) from Advanced, a chance rising from 0 to 1 between
  (`SCISHOW`); `so` always for a species with no common name and the sea slugs. Typed: the usual `TYPED` share. Logged
  in the mode, `|sc` or `|so`, before `|kN` (`quiz.js` `answer`, `SCIQ`).
- **Typed answers and Q394**: `app.js` `sciTypeNames` (its name and the WoRMS name). `app.js` `sciPart`, read by
  `quiz.js` `typeBind` (`o.part`) before the nudges and the spelling step: the species' own common name (`cn`, `cnr`)
  is `cn`, its genus alone or with a second word no game species has is `g`; the answer is a miss with that kind
  (`TYPEDQ.z`, the scoring record's `z`, `core.js` `PART`); the feedback says what was typed (`quiz.js` `partRead`).
  Another species' common name, a genus or a family is no answer: the nudge says which (`app.js` `sciSay`, `typeBind`
  `say`). On the other questions their scientific names stay out of `quiz.js` `typeKind` (the name index says them).
- **Sheet**: a unit opens its species' sheet (`core.js` `routeOut` `learn/species/sci:s091`, `treeSheets` `spOf`).
- **Score and gate**: `TREEU.treeSci` (`treeScoreTree(X, F, true, true)`, equal to `core.js` `treeBoardTree`) and the
  set's units only once `app.js` `sciSpOn` (`sync.js` `sciOn`: `SCI_SHEET`, rule D4), for both subjects.
- **Rest**: the first species' card (`SCI_SP` `card`, `UNITS` `sciCard`, in each subject's words). My progress shows the
  species met in their own section (`progress.js` `boardParts`, the set). The achievements fspsci1 (`achSnap`
  `setsAdv.ssp`), fboth25 (`achSnap` `both`, `achBoth`), fdauin20 (`achSnap` `top`, `UNITS` fish `top`, `app.js` `sciTop`)
  and fpct70. The admin's Pairs read them (`reports.js` `repReg` `spu`); the mimicry entries name them (`app.js`
  `mimLay`); a species by its scientific name has its family's variants (`model.js` `varHome` walks up to the unit rank).

## The fish global score

docs/FISH_PATH.md "My progress (fish)", docs/LEARNING.md "Fish: the global score, built". `core.js` `treeScore(P, T, K)`,
one computation over the subject's tree (`core.js` `treeScoreTree`, built with `TREEU`, `UNITS.fish.tree()`: the
families with their weight and circle, the species packed by genus while they have no unit of their own, `null` common
names for a species with none) with the subject's constants (`SUBJECTS` fish `score`, the one switch): the % shown
(`pct`), `raw`, the components (`entries`, `genera`, `common`, `scientific`, `S`, `credit`), the same per circle (`by`)
and every unit's own bar (`units`). Species weights: `core.js` `rankWeights` (1/√ of the rank by observers near Dauin,
`present.dauinU`, ties sharing their mean rank). The tree is sent to the sheet, which ranks the fish leaderboard by it.
`model.js` `headScore` and `headPct` give the headline (the header pill, My progress's ring and its three bars
`progress.js` `scoreBars`, the fish % achievements, the update card, the leaderboard); `progPct` stays the plain mean of
a list's bars. The circle-3 threshold reads its circle-1 Entries component (`core.js` `SUBJECTS` `gate`, `app.js` `treeC3`).
