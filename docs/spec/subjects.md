# Subjects: the taxon model

A **subject** is what the games teach: the corals, the fish, the sea slugs. The engine (`model.js`, `quiz.js`,
`progress.js`) never names one; it works on the **current subject**, and each subject describes itself in two places:
`core.js` `SUBJECTS` (pure data, shared with the admin and the sheet script) and `app.js` `UNITS` (what the app reads its
units and pages through). This file describes that model: the registry, what reads a subject's data, a unit's record,
Identify, the switch, the sync and replay per subject, who sees a subject, and the card that introduces one. What the
fish players get is in [fish-game.md](fish-game.md), the fish sheets in [fish-sheets.md](fish-sheets.md), the sea slugs
in [seaslugs.md](seaslugs.md). This is the specification of what the code does now; why each part was decided is in
[docs/decisions/](../decisions/README.md) and the PRs. The rules that govern it are S1-S3
([rules/subjects.md](../rules/subjects.md)).

## The registry (`core.js` `SUBJECTS`)

Three subjects, tested in `tests/subjects.test.js` (and `tests/subject-neutral.test.js`, which keeps subject names and
tests on the subject out of the engine and the sync script's own code, but its listed exceptions, and lists each field
true for one subject only, with what it switches on and its ROADMAP row). Each record:

- `id` (`coral`, `fish`, `seaslug`) and `dev`, the prefix of its device keys (`''` for the corals, `fish-`,
  `seaslug-`);
- `base`, the sign-in record's fields for its progress as last sent and for a send on its way: `base` / `pending` for
  the corals, `fbase` / `fpending` for the fish, `sbase` / `spending` for the sea slugs;
- its words: `name` (Corals, Fish, Sea slugs), `one` and `many` (genus / genera, family / families, genus / genera),
  `what`, `several` (the report dialog's reason for a photo with more than one in frame), `card` (the kind of its
  cards), `lecture` (where its content comes from), `zoom` (what an enlarged photo shows); `pv` and `hash`, the prefix of
  its page-view names and of its addresses (`''` for the corals, `fish/`, `seaslug/`); `icon`, its icon in the subject
  switches, the app's and the admin's (one SVG set on a 24 px grid);
- `views`: the corals' colony, close-up and corallites (`wide`, `medium`, `macro`), one photo (`wide`) for the others;
- `optin`, the opt-in sets whose choices sync: the corals' `bon` (the bonus genera), the fish's `sci` (the scientific
  genera) and `beyond` (circle 3, by the player's choice); none for the sea slugs (`[]`). A stored `c2` / `c3` choice
  of the former opt-in circles is not read;
- `ach`, `achs` and `board`: every subject has its own achievements (`core.js` `ACH`, `FISH_ACH`, `SEASLUG_ACH`, in the
  shared record under ids of its own) and its own leaderboard; `achFeats` (the corals) keeps the shared record's feats
  (runs, corallites, hard photos); `boardSheet`, the sync script from which a subject's board is served (the sea slugs');
- `pages`, its Learn and Practice pages: the corals' `basics`, `genera`, `sheet` (a genus sheet), `cmp`, `quiz`,
  `quiz-custom`, `quiz-duel`, `pairs`; the fish's `basics`, `genera`, `sheet` (its family, genus and species sheets),
  `cmp`, `quiz`, `quiz-custom`, `quiz-duel` and `pairs`; the sea slugs' `genera`, `sheet`, `cmp`, `quiz`, `quiz-custom`, `quiz-duel`, `pairs`. `closed`: each `MODES` Learn or
  Practice page a subject lacks, with its reason (`tests/subjects.test.js`; ROADMAP "Every game mode for every
  subject"). `basics` names the basics module's feat (`_basics`, `_fbasics`, `_sbasics`);
- `sheets` (the fish and the sea slugs): the address word of each rank of its sheets and the prefix of their ids,
  `{family: 'f:', genus: 'g:', species: 's:'}`, so `#fish/learn/family/Damselfishes`, `#fish/learn/genus/Chromis` and
  `#fish/learn/species/Chromis%20ternatensis` (as `#fish/learn/family/<id>`, `#fish/learn/genus/<name>`,
  `#fish/learn/species/<name>`). `core.js` `routeOut` and `routeIn` translate a page key and an address; `core.js`
  `sheetIdOf(S, id)` gives a sheet id in its one spelling (an old unit id renamed first: t01 is `f:Damselfishes`), and
  null for an id that names none of the subject's sheets, so a coral genus sheet linked with Fish chosen stays the
  corals' (`app.js` `subjHas`, `hr`);
- `rank`, the rank its records are at (`genus`, `family`, `family`), and `unitRank`, the rank its game units are at when
  not its `rank` (the sea slugs' `genus`; `core.js` `unitRankOf`), logged with each answer; a tree subject's top rank,
  the family, is what the admin reads as its tree's;
- `renamed` (the fish: `FISH_RENAMED`, old unit ids to new), `typeDrop` (the fish: a word a typed name may leave out);
- `replay` (the corals: the subject of the first replay, asked as `rv`; an answer row with no subject is theirs) and
  `replayed` (the fish and the sea slugs: replayed by the sheet from their own answers,
  [Sync and replay per subject](#sync-and-replay-per-subject));
- features of their own, the corals' (rule S1): `offsets` (the sheet's photo memory and format offsets: `model.js`
  `pmem`, `pfmt`), `anonBase` (the sign-in baseline `ANONB`); `offsets` stays on `replay`'s subject while the sheet
  computes them for it alone (`tests/subject-neutral.test.js`). The opening hold is no such field: every subject adopts
  its own from the sheet ([sync.md › The opening hold](sync.md#the-opening-hold));
- `gate` (the fish and the sea slugs: `TREE_GATE`): circle 3 at circle 1's Entries component `c3.entries` (0.55), or
  with no global score its plain mean `c3.mean` (0.5) (`app.js` `treeC3`);
- `pool` (the files the sheet's pooled photo statistics read for it: every subject's photo ratings and confusions are
  its own, [sync.md › Pooled photo statistics](sync.md#pooled-photo-statistics)), `stats` (the sea slugs': the script
  from which the app reads theirs), `calib` (the draw's calibration), `analyses` (its Analyses report), `score` (the
  fish's global score, [fish-game.md › The global score](fish-game.md#the-fish-global-score)), `content` and
  `structure` (what the content editor may change, [content.md](content.md)), `start` (its first-launch question,
  [cards.md › One per subject](cards.md#one-per-subject));
- `progress`, its My progress views (the corals' `slate`, `photos`, `groups`; `photos` for the others);
- `open` and `beta`, who sees it and its label ([Who sees a subject](#who-sees-a-subject)); `sheet`, the sync script
  that knows a subject newer than the player groups (the sea slugs');
- `admin`, its part of the admin: `cur` (its part of `curation.json`), `pages`, `todo`, `files`, `origins` (where its
  photos come from, `[key, name, short name]`: the corals' IMR lecture, Pierre, iNat Dauin / Philippines / elsewhere;
  the others the same without IMR), `csrc` (its Candidates sources) and the rest:
  [admin.md › Each subject's admin part](admin.md#each-subjects-admin-part-subjects-admin).

**Keys.** `subjKey(id, name)` = `reefid-sync-<id>-<name>` (`progress`, `quiz`, `intro`, `intro-offer`, `reset`,
`wink`, `start`, `rv`, `st`: they travel with the player); `subjDev(id, name)` = `reefid-<dev><name>` (`hold`,
`comeback`, `basics`, the cards' seen marks: they stay on the device; the corals' `dev` is empty, so their keys are
`reefid-<name>`). The choice of subject: `SUBJECT_KEY` = `reefid-sync-subject`, synced.

### Tree engine names and the flat subject

The code every tree subject runs through (the fish, the sea slugs) is named `tree*`: `core.js` `treeGen`, `treePhotos`,
`treeReplayGen`, `treeSheets`…; `app.js` `TREEU` (the units of the tree in force, as `DATA` is the corals'), `TREERAW`,
`treeBuild`, `treeGenera`; `learn.js` `treeGenus`, `treeTiles`…. `fish*` names stay for what only the fish have (the
IMR fish presentation, FishBase, the winks, `core.js` `FISH_RVS` and `FISH_ACH`)
and, for now, for the admin's own names. `tests/treenames.test.js` holds the old and new names and fails when a retired
one comes back. The corals are the one flat subject (`SUBJECTS` `flat`: their units a flat list in `data.json`, read by
`app.js` `build` and `structSeen`); the engine asks that field, never a pool file's name.

## What reads the subject's data (`app.js` `UNITS`)

`UNITS[id]` holds what the engine and the pages read for each subject. The tree subjects' entries start from
`TREE_UNITS`, the members that read the tree in force the same way for each (`load`, `slate`, `core`, `circles`,
`gate`, `gen`, `st`, `mystery`, `species`, `photo`, `norm`, `typeOther`, `list`, `sheet`, `bar`); each entry adds only
its words, its files and its own settings and differences. The Look-alikes deck and Compare read `deck` (the pairs of
the deck), `inGame` (a unit Compare may show) and `cmp` (`src`, `clues`, `tag`, `line`, `more`: what each says of a unit
beside its tips) from every subject ([front-end.md](front-end.md) › Learn › Look-alikes). Home reads `named` (true where
the units have names of their own: set once in `TREE_UNITS`, so for the fish and the sea slugs) to draw its Learn band
from the slate's units and to say the subject's words (`home.js`; the corals' band reads data.json's genera), and My
progress' Groups view and the custom quiz's first view read `group(k)` (the corals': the IMR lecture group `k`, `{n, t}`,
from `data.json` `imrg`) instead of reading the corals' data themselves.

- **Loading.** `load()`, its data before its pages open (the corals' is in from start-up; a tree subject's is `treeLoad`:
  its tree, its first photos and its game photos), and `home()`, what start-up waits for when it differs: the fish's is
  `treeHome` (`fish.json` and `fish-photos.json`), Home's photos on the first photos of `fish-photos.json`, on R2; then
  `fish-game.json` comes with tier 2, which `need(2)` holds for the subject's `load()`, so the quiz and the Learn pages
  open on the curated photos and the units are built again with them. A device whose service worker already holds
  `fish-game.json` (`fishCached`) waits for it at start-up. Meanwhile `dataPartial` (`UNITS` `partial`) holds `model.js`
  `domRecalcAll`, the one-time rebuild of an old record's bar, which reads the units' photo difficulties, until the whole
  data is in (`tests/fishhome.test.js`). `get` lists a tree subject's files (`f` its tree, `ph` its first photos, `gm` its
  game photos); the fish's three are in the `sw.js` shell, the sea slugs' are not. A
  file that does not come (`json()` answers `{}`) is refused (`treeHome`, `treeLoad`), so nothing empty is kept and the
  app opens on the corals until a later try. `treeBuild` makes `TREEU` again whenever `build()` applies a new curation.
- **The units.** `slate()`, the units the games teach and the progress counts (the corals' `slateOf(DATA)`; a tree
  subject's circles 1 to 3); `core()`, what Open all opens (`model.js` `introLeft`; the slate if absent); `gate(n)`,
  whether unit n may open now (`model.js` `mayOpen`; the fish's and the sea slugs' `treeGate`); `opens`, slate parts
  opened on a yes (the fish's circle 3); `done()`, the card once every unit is met
  ([fish-game.md](fish-game.md#circles-and-the-gate)); `circles()`, for the achievements.
- **Opt-in sets** (`sets`): each set's units, when its offer is due, the card's words and its ⚙ row; `bonusList`,
  `setOf`, `isBonus`, `bonusOfferDue`, `bonusOfferShow` and `bonusSet` are generic. The corals' `bon`, the fish's `sci`
  and `sp` ([fish-game.md](fish-game.md#fish-scientific-genera)); none for the sea slugs.
- **Typed names**: `names()` and `norm`. The corals: `typeNamesOf` and `typeNorm`, the first word. The fish:
  `treeTypeNames` and `typeNormAll`, the whole name: the unit's names (`core.js` `treeNames`: the IMR name, its parts,
  families, sub-entries, the curated other names `aka` of `tools/fish_source.json`, such as Tang, and its names in common
  use `often`, such as Clownfish, right but corrected gently in the verdict line: `fishOften`, `oft`, `quiz.js`
  `typeStep`), the name index, and the species units' names (`cnTypeNames`); with `SUBJECTS` `typeDrop` (`fish`), each
  name without "fish" (Trigger, Damsel, Clown), its plural, and the name's own plural or singular, left out when within
  the spelling tolerance of another unit's name or short form. `typeOther`, a genus question's typed text that names no
  genus of the game (`treeTypeOther`).
- **The photo's taxon** (`taxon(p, n)`): the photo's own taxon, finer than the unit n asked, said in one short line
  under the verdict after every answer, right or wrong (`app.js` `photoTaxon`, `taxonLine`, `.fbsp`). The fish:
  `treeTaxon`, the species the photo is in play for (`sp`, `TREEU.sps`), its first common name for the player and its PDF
  name with the WoRMS name beside it (rule S2). The corals: `coralTaxon`, the photo's iNaturalist species, only inside
  the genus asked and only when Research Grade or Pierre's own, else nothing. The sea slugs: [seaslugs.md](seaslugs.md).
  Tests: `tests/answertaxon.test.js`, `tests/fish.smoke.js`. `species(p)` gives the species logged with an answer.
- **Pages.** `memory` (how a Memory pair is made: `views` for the corals, `photos` for the tree subjects, in
  `TREE_UNITS`; `proto/pairs.js` `MEMORY`), `pairs()` (the duels), `winks()` (the surprise cards), `tiles(n)` (Find the X), `list()` (the Learn page:
  `viewList`, one page for every subject), `sheet(id)` (a sheet: `viewGenus` / `viewFishSheet`), `bar(id)` (a tree subject's page
  bar on its sheets, `learn.js` `treeBar`; the corals' is `ctxBar`'s own), `identify` (its Identify tool), `help`,
  `progHelp` and `achHelp` (the ? texts of the quiz, My progress and the achievements; the corals keep theirs inline),
  `hello` (the cards that introduce the subject, [below](#the-subjects-card)), `about` (its lines in About and credits,
  shown only to a player it is open to, `subjMine`), `door` and `land` (Home's words and tiles), `pick` and `tour` (the
  welcome tour's words), `basics` (its basics module), `mystery` (who sees the ? tiles), `startFb` (false: no
  level-change card), `photo(f)` (a photo by its name, for the admin's "Bad photo" flag), `gen`, `vars` and `st` (its
  units, variant table and structure stamp for the sheet's replay).

## Records

Every unit is read through `GX(n)`: coral genera by name (`DATA.gen`, `DATA.x.gen`), a tree subject's units by id
(`TREEU.gen`, built by `core.js` `treeGen` for the tree in force; ids and genus names never meet). A fish family record
has the fields the engine reads on a genus: `look` (its look-alikes' ids), `lsrc` (the IMR fish presentation), `qt` (the
IMR cues), `forms` (its group in the identification key in force, so the first wrong choices come from other groups as
coral ones come from other growth forms: `imrFormsOf` returns a record's own `forms`), `group` and `ig` (that group),
`fam`, `cm` (how common: the square root of its species' Research Grade observations near Dauin), `views.wide`,
`levels: 1`, plus `name` (shown: `uname()` gives a genus in italics and a fish family by its name; `unameT()` the plain
text), `lk` (IMR's words to tell each look-alike apart), `sub`, `phase`, `names` (accepted when typed: the name, the
parts of a double name, the IMR and WoRMS families, the sub-entries; a family two units share, Holocentridae or
Serranidae, is "which one?") and `wink`. The ranks below the family add their own fields
([fish-game.md](fish-game.md#fish-scientific-genera)).

## Identify per subject

Identify shows the current subject's tool only, `UNITS[id].identify`: the corals' `idkey` (the Coral ID Key), the fish's
`fishkey` (the Fish ID Key, coming soon: `home.js` `viewFishKey`; Pierre's call of 2026-11-04); each is one entry of
`MODES` `identify`. **A subject with no key built declares none** (the sea slugs: no `identify`; `app.js` `keyOf` reads
it, `''` for none): Home is the Learn door alone (`.hdoors.one`), it has no Identify tab (`showSubj` hides
`[data-tab=identify]`), and an Identify address opens its Home, so a player never meets a page that says "coming soon"
or "not yet" ([decision](../decisions/2026-11-20-no-key-no-door.md)). `subjPage` sends a bare Identify address to the subject's own tool (a subject
switched on Identify shows its own), and `route` hands a link into another subject's tool with its clues
(`#identify/key?form=…`) to that subject, as it does a genus sheet. Home's Identify door follows the subject (for the
fish a fish photo, "Identify a fish", the Fish ID Key). `tests/fish.smoke.js` checks both ways. The Tools that ask about
a unit, or draw the look-alikes, follow the subject on screen (Same or different?, Odd one out, Matrix, Type the genus, Blur
reveal, the Look-alike web: [the Lab](basics.md#the-lab-protolabjs)); the ones that read the corallite traits stay the
corals' whatever the subject (Spot the feature, the Zoom ladder, Elimination, Anatomy, and the reference tools).

## Switching

`setSubject`: two places, one state (docs/DESIGN.md "Subject switch"), both `[data-subj]` buttons built by `subjBtns`:

- a full-width row with one button per subject the player can open (`subjMine`) at the top of Home (`home.js`
  `.hsubj`);
- the header control next to the logo on every page but Home, `#subjc`. On Home `route` sets `data-home` on it: hidden
  with its room kept, its menu closed, a focus on it or on Home's row given to Home's row once drawn. `showSubj` draws it
  as `subjCtl` says: with two subjects a one-click switch `.subjsw`, shown as one chip `[data-flip]` where its two sides
  do not fit (under 380 px beside the Sign in pill); with three or more the subject chip `#subjb` with its small menu
  `#subjmenu`, opened and closed by `subjMenu` (a choice, Escape or a tap elsewhere closes it). A switch used from the
  keyboard keeps the focus once redrawn. Each subject's icon is its `SUBJECTS` `icon`.

Both show only while the player has two subjects or more: `subjMine()` = `SUBJECTS.filter(subjOpen)`. A switch loads
the subject's data, then `subjectLoad`: `SUBJ`, its tree in force (`treeAt`), `P` and `Q` from its keys, and every
file's per-subject state through `SUBJ_HOOKS` (`model.js`: cards seen, opening hold, comeback, unit difficulty, last
asked, the photo memory recalculation; `quiz.js`: typed names, questions planned ahead, duel spacing, the visit's trail).
The winks shown travel with the player (`reefid-sync-fish-wink`). A page the new subject does not have opens its
section's page for that subject (`subjPage`); the address is rewritten with the new subject's prefix.

`inSubject(id, fn)` runs `fn` as if `id` were current and comes back (synchronous; the hooks reload only what is on the
device): the sync's summary and merge, sign-in, sign-out. While a visit runs (`SUBJ_VISIT`), nothing redraws the page.

## Sync and replay per subject

- **Sync** (`sync.js`): every `reefid-sync-*` key travels already (`progData`), so each subject's progress, quiz
  settings and cards go to the sheet's Data column and the progress files. `mergeSaved` merges each subject on its own
  (`mergeSubject`, inside `inSubject`: reset, opt-in choices with their times, cards, hold, the three-way
  `mergeProgress` against its `base`). A saved copy without a subject's keys (saved by an app that did not know it) is
  not an empty record: `mergeSaved` leaves that subject alone (a reset is an empty record with a reset time, never an
  absent key), and the sheet keeps the saved copy's keys of a subject the saving app does not know (`core.js`
  `keepSubjectKeys`). `syncSummary` (the leaderboard %, "By genus") is the first board subject's, the corals', whatever
  the subject on screen; each other board's units travel beside it (`boards`, `boardUnits`; the fish send their score
  tree). Signing in to a known account: the corals (`anonBase`) add only the delta since the device's first anonymous
  answer (`ANONB`); another subject adds everything on the device (`mergeProgress({}, here, sheet)`). Sign-out clears every
  subject's keys. `core.js` `mergeUsers` (the admin's account merge) merges each subject's progress and opt-ins on its
  own. Every subject's answers are logged to the sheet's Answers tab with their subject
  ([sync.md › Every subject's answers](sync.md#every-subjects-answers)). Reports (`repBtn`) from a fish or sea-slug
  question carry the unit's id and the remote photo id (`Code.gs`
  `logReports_` accepts digits in a unit); the admin's To do › Reports names the unit and shows its photo (`admin.js`
  `fishAdmin`, `repUnit`).
- **Full replay**: the corals are the subject of the first replay (`SUBJECTS` `replay`; `core.js` `RVS`); `sync.js`
  `replayAdopt` always runs as that subject (`inSubject`), whatever the subject on screen, and `mergeSubject` compares
  rules versions (`RVK`, `reefid-sync-coral-rv`) for it. The fish and the sea slugs
  are replayed from their own answers with their own rules versions and keys (`SUBJECTS` `replayed`, `FISH_RVS`,
  `SEASLUG_RVS`; `reefid-sync-fish-rv`): [sync.md › Other subjects' replays](sync.md#other-subjects-replays). The
  sheet computes every replayed subject's opening hold (`holds`) and the app adopts each subject's own (`sync.js`
  `holdOf`, `holdAdopt`, as that subject; from `HOLDS_SHEET`, before it the corals' alone). The
  one-tap question, the apology card and the update notes are the engine's, in every subject (a note about one subject
  names it, `RECALC.L` `subj`). At sign-in every subject takes the account's copy as its merge baseline, played on
  the device or not. A wink is decided before a question is taken or chosen (`quizPhoto`), so planned questions and
  the Again / duel spacing wait.
- **Sheets across subjects**: a genus sheet or comparison (`#learn/genus/…`, `#cmp-…`) opened with a subject that has
  none (from the Coral ID Key with Fish chosen) switches to the subject that has it (`route`, `setSubject`); the other
  way, a subject chosen by the player on such a page opens its section's page for that subject (`setSubject`,
  `subjPage`), not the hand-off back.

## Who sees a subject

- **Beta**, the label (`SUBJECTS` `beta` {kick, line}): the sea slugs carry it, the corals and the fish do not. It puts a
  small *beta* tag on the subject's switch buttons and on its pick in the welcome tour, and keeps its `hello.all` card
  ([below](#the-subjects-card)); `beta.kick` and `beta.line` hold its words, which no page shows now; ⚙ has no subject
  row. The label is apart from who may open the subject (`open`, next).
- **Opening** (`SUBJECTS` `open`, `core.js` `subjGroup`): `open: 'group'` opens the subject to the admin and to the
  players of a group that opens it ([the beta group](#the-beta-group)); no field or `open: 'all'` (all three subjects
  now) opens it to every player, signed out included. `subjGroup(S)` (`S.open === 'group'`) is what `app.js`
  `subjOpen`, `sync.js` `groupsSeen`, `admin.js` `groupOn`, `admin-demo.js` and `Code.gs` `groupIds_` read. Opening a
  subject to everyone is the one field `open: 'all'`, the *beta* label kept or not on its own; the sheet then stops
  reporting that subject's group and refuses to change it, its rows kept in the Groups tab, so a return to `'group'`
  finds the same members. A player who may not open a subject (`subjOpen(S)` = not `subjGroup(S)`, or `IS_ADMIN`, or in
  its group) is never in it: at start-up a saved choice of it opens the corals (`subjAt`, its files not even fetched),
  `setSubject` and `route`'s hand-off never pick it; the saved choice (`reefid-sync-subject`) and its progress stay as
  they are (still synced and merged through `inSubject`), back on screen once the player may open it. A tree subject has
  addresses of its own (`#fish/learn/families`, `#fish/practice/quiz`: ARCHITECTURE "Pages and routing"), so a link
  opens it for the players who may. Tests: `tests/subjects.test.js`, `tests/sync.test.js` and `tests/adopt.test.js` (the
  groups and the app's replies, on a subject set back to `'group'`), `tests/fish.smoke.js` (a signed-out player
  switches to Fish, plays, reloads, signs in in no group and switches back; `core.js` served with fish set back to
  `'group'` for the group's own checks), `tests/seaslug.smoke.js` (both sides of the gate), `tests/admin.smoke.js`.

### The beta group

A subject with `open: 'group'` opens to the admin **and to the players of a group whose Beta setting names it**: player
groups are rows of the sheet's Group settings tab, and a group's Beta is `''` or the subject it opens
([sync.md › Player groups](sync.md#player-groups)). The members are in the **Groups** tab (`Code.gs` `groupSet_`,
`groupMap_`); every reply to a signed-in load or save says which subjects the player's groups open (`groups: [ids]`, `[]`
for none), and the app keeps that list on the device under the account's name (`app.js` `GROUPS_KEY` `reefid-groups`
`{n, g}`; `sync.js` `groupsSeen`, also at sign-in before the reload; cleared at sign-out; another account on the device is
in no group); `subjGroups()` reads it. A script that sends no `groups` changes nothing: the subject stays the admin's only
(rule D4, the field is the gate). A change shows at once: a player taken out while on that subject reloads on the corals
(`subjAt`), the saved choice and the progress kept. Signed out, nobody is in a group. Players who sign up later are not
in a group until added.

The admin sets the groups on Players › Groups ([admin-players.md › Groups](admin-players.md#groups)). Before the script
with group settings, the Players list of a subject that opens to a group (`groupOn`) shows a **Beta** column (In / –),
"In the Fish beta · Remove" / "Not in the Fish beta · Add" on the row's bar (one click, no confirmation) and above the
table "Fish beta: N of M players · Add all K · Remove all J" (each confirmed: a bulk action); a subject newer than the
groups (`SUBJECTS` `sheet`: the sea slugs) gets a note until the script knows it. Tests: `tests/sync.test.js` (the tab,
the replies, rename / merge / delete carrying the memberships), `tests/playergroups.test.js`, `tests/fish.smoke.js`
(the app with a sheet stub), `tests/admin.smoke.js` (the Players pages).

## The subject's card

`progress.js` `subjHello`, `helloMode`, `helloDue`: one card per way a subject opens, its words in `UNITS[id].hello`
(`hello.group`, `hello.all`). A proper card the player closes, shown once, at a calm moment, never a toast:

- `hello.group`: a `cardShow` card (kind: the subject's `SUBJECTS` `card`; kicker "Invitation", title "Test the fish
  beta" or "Test the sea slug beta", buttons "Try fish" / "Try sea slugs", which switches to the subject and opens its
  quiz, and "Later"; Escape is Later), shown only while the subject opens to a group (`subjGroup`) and only to a player
  in that group (`subjGroups()`: not the admin's own access, `IS_ADMIN`);
- `hello.all`: the same invitation ("Try fish, now in beta: …"), to whoever `subjOpen` lets in, only while the subject
  keeps its `beta` label (`subjHello` `card`). The fish, out of beta, show it to nobody now; the sea slugs show theirs.

Each card once per device under its own mark (`reefid-<dev>hello-<mode>`: `reefid-fish-hello-group`,
`reefid-fish-hello-all`, the sea slugs' alike) and once per account (the token `hello:<subject>-<mode>` in the account's
told notices), so the invitation never hides a later card; never in the admin's browser (`HAS_ADMIN_TOKEN`); only to a
player with at least `HELLO.MIN` (10) answers on the subject on screen; a player who has played the subject already (on
screen, its welcome question answered, or any progress in it) is marked seen without a card (`helloDue`, pure,
unit-tested in `tests/hello.test.js`). The calm moment: Home, `HELLO.WAIT` (1.5 s) after it is drawn (`route` and the
start-up's `SETUP` 2 call it), still on Home, with no tour, card, toast, ? help, ⚙ or enlarged photo on screen and the
prompt spacing met (`quiz.js` `promptOk`; it then pushes the other prompts back, `promptMark`); otherwise it waits for
the next Home. Leaving the page closes it unseen. `tests/fish.smoke.js` checks it, `open: 'all'` included.
