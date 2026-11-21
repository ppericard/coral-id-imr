# The content editor's edits

How the instance's content editor (today Pierre, through the admin's token) rewords a sheet's text and changes the
teaching structure (circles and look-alike pairs) without touching the built files. This is the specification of what
the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md), the
[design note](../reviews/2026-11-14-sheet-overlay-design.md) (v2) and the PRs. The data files the edits sit over are in
[data.md](data.md), [fish.md](fish.md) and [DATA.md](../DATA.md); the admin's editors in
[ARCHITECTURE.md](../ARCHITECTURE.md) "Admin back-office" (Photos › Tree, "Structure"); the replay under the structure
in [sync.md › Full replay](sync.md#full-replay).

## Three layers

The sources and the instance's layer are resolved at build into the built file (`fish.json`, `data.json`,
`seaslug.json`: the base; [data.md › The instance's layer](data.md#the-instances-layer)). The edits sit in the
instance's curation, `curation.json` `content`, and are applied after the base by one function, `core.js`
`contentApply(S, file, curation)`, which the app runs before the units are made (`treeBuild`, into `TREEF`, which
`learn.js` `ftree` reads too) and the admin runs on its draft. It returns the file itself when nothing applies, and
copies only the records it changes.

## Slots

Slots are declared per rank as subject data (`SUBJECTS` `content`: `at`, where the rank's records are; each slot `k`,
its name in the map, `t` `text` or `list`, `imr` for the IMR's words, `f` the record's field when it is not `k`).

- **The fish**: a family's `cues`, `phase`, `look/<id>`, `marks`, `life`, `apart/<id>`, `juv.note` and `note`; a
  genus's `cues` and `note`; a species' `note`. The free `note` is written to the record's `enote` (a wink family's
  `note` is its surprise card's line, read as its feedback summary) and shown on the sheet (`learn.js` `treeNote`). A
  keyed slot (`look/<id>`, `apart/<id>`) exists only where the base holds that line, and its edit changes the words
  only: the line is the pair, and pairs are structure. Names, presence, size and depth are not slots.
- **The corals** (design note step 8): one rank, the genus, its records in `data.json` `gen` and `x.gen` by name (`at`
  a list of paths; `core.js` `contentRecs`, `contentBox`): `plain`, `qt` (the ID tips), `mn` and `imr` (the IMR's
  words), `sum`, `crit` (the Coral ID Key criteria), `lsrc/<other genus>` (a look-alike line, its words and source as
  the sheet's Don't confuse with shows it), `check` and `info`. `keep` is set on `imr`, `sum` and `crit`, which every
  slate record holds and its readers read as such: hidden, the field stays, empty (`contentPut`). No free note (the
  genus sheet has its More details). The app lays them over `data.json` in `build()` before the curation and the units
  (`app.js` `DATAST`, `DATAON`): an edited tip's source becomes the genus's `qsrc` (`tipsList`; a bonus genus's tips
  then lose the Coral Finder label, `tipsLabel`), the other sources are shown with their slot on the genus sheet
  (`learn.js` `viewGenus`, `esrcIn`, `esrcP`), in the quiz's answer (`quiz.js` `fbBody`, `app.js` `esrcTag`) and on the
  Look-alikes deck's line (`learn.js` `lsrcEsrc`); edited criteria are cited by their source in place of the Coral Finder
  pages wherever they are shown (`app.js` `critRef`: the sheet, the answer, the Coral ID Key).
- **The sea slugs**: a family's and a genus's `marks`, the `note` on every rank, and a genus's `lsrc/<other genus>`, its
  look-alike line, of type `srcs`: a list of sources `{t, u}` replaced whole, as `tools/seaslug_game.py` `genus_looks`
  writes them (a specialist source's for a declared pair, iNaturalist's counts for a data one), shown under the other
  genus on the sheet's Don't confuse with (`learn.js` `treeGenusLooks`); hidden, the pair keeps an empty list. In the
  admin's Sheet box, one source a line, its words then `|` and its link (`admin-content.js` `sheetVal`, `srcsText`),
  with no Source and Link of the edit's own (the value is its sources). Every genus has the boxes, one the app opens as
  its family or its one species included (`sheetOwn`: a subject whose units are its genera).

## An entry and its states

An entry is `{v, was, src, t, by}`:

- `v` the value in force (a list is replaced whole; `null` hides the slot, a keyed line keeping its pair with blank
  words);
- `was` the base when edited (`null` for an add);
- `src` an optional source `{t, u}`, carried on the record as `esrc{slot: src}` and shown with the slot on the sheet;
- `t` when (ms); `by` who, from the editors' relay.

The node id is read through `SUBJECTS` `renamed` (`core.js` `renamedId`).

**States** (`contentEntries`, `contentState`): fresh (the base is still `was`), stale (the base changed since: the
players keep the editor's text), absorbed (the base now says `v`). Never applied but kept and listed: an unknown node,
a slot its rank does not declare or a line the base lacks, a value not of the slot's type, an old id's entry shadowed by
its new id's.

## Draft and Publish

- One Save is one draft step (`contentSet`). `contentDrop`, for ↺ Restore, keeps the node's map as `{}`, so a merge
  keeps a slot another device published on that node meanwhile. `merge3` leaves an emptied map out of its result, so the
  admin puts the draft's emptied node maps back after every merge (`admin-content.js` `contentShells`, in `admin.js`
  `mergeCur` and the two-tab merge): the guard outlives every rebase before Publish, two included, as Publish's retry
  after a SHA conflict runs.
- Publish writes the map sorted, with no empty map (`contentOut`, from `admin.js` `output` and `fishOut`), merges node by
  node and slot by slot (`merge3`), each entry whole (`wholeAt`: a hide on one device and a rewording on another
  conflict, mine wins, never mixed), and counts the edits per rank ("2 fish family sheet edits").
- **The players' copy** (`tools/curplay.py`) keeps each entry's `v` and `src` only.

## Sources reach the units too

Rule C2: every clue carries its source.

- An edited tip's source becomes the unit's `qsrc` (`treeGen`; `app.js` `treeGenera` for the marks that stand for
  missing tips and for a genus's tips), shown under the tips wherever they are (`app.js` `tipsList`: the quiz feedback,
  the cards, the ID tips view).
- An edited look-alike line's source goes after its own in `lsrc` (`treeLookSrc`) and, by the other family's id, in the
  unit's `lksrc` (`app.js` `treeGenera`), which the quiz feedback's decisive line says after "IMR;" (`quiz.js`
  `pairLine`; the IMR label stays).
- The phase lines' source becomes `psrc`, said under them in the feedback's More, and a wrong answer's tips name theirs
  after "would show".

## Structure: circles and look-alike pairs

Each instance's own, set by its content editor (design note v2 step 3); a change replays every player's progress,
silently. Stored in the same map: a node's `circle` slot (`v` one of the subject's circles, `null` for in no circle) and
`pairs` `{"a|b": {v: 1 or null, …}}`, a and b two node ids in code-point order, both read under the ids as stored.
Declared as subject data (`SUBJECTS` `structure`: `circle` {rank, of}, `pairs` {rank, slot}, and `apply`, the subject's
own writer).

- **Order**: `contentApply` lays the structure first (`structApply`: the entries that apply and change the base, stale
  ones included), then the text slots over it, so the words of an added pair land on its line and a withdrawn pair's
  words are orphaned, kept and not applied; `contentEntries` never lists a `circle` slot as text. `structEntries` gives
  each entry's state: orphaned for a node the base lacks (the editor moves or removes a family of the base, never brings
  one in: that needs a teaching node in the instance's layer, through a PR), a circle not declared, a pair key out of
  order, or a value not 1 or `null`.
- **The fish** (`core.js` `treeStructure`): a family's circle is written onto the family, its genera, its species and
  each teaching node holding its species (its families' smallest circle in force), and `start` keeps the circle-1
  teaching nodes. In no circle, the family and its genera are left out and its species are `out` ("family in no
  circle"), as the build leaves out a family no teaching node holds, with every look-alike line to it. A withdrawn pair
  loses its line on both sides (a pair the base declares one way only included); an added one gets a line with no words
  on both sides, its `lsrc` the editor's source or "Added by the content editor", never the IMR presentation.
- **The structure stamp** (`structStamp`) is `''` while the structure in force is the base's (no edit, or none that
  changes it), else a short hash (`hash53`) of the canonical circles and pairs in force (`structCanon`). The app, the
  admin and the sheet compute it with this one function (the players' copy gives the sheet's), and it is never stored
  in `curation.json`.
- **The app** lays the structure over its units only once a reply says the sync script replays under it (`core.js`
  `STRUCT_SHEET`, rule D4; `app.js` `treeBuild`, `TREEON`, `TREEST`; the units are made again at the next page change
  when a reply crosses it, `structSeen`); before, the text slots alone.
- **The sheet** replays under it ([sync.md › Other subjects' replays](sync.md#other-subjects-replays)).
- **The agents' photo tools** read the circles in force (`tools/fish_inforce.py` `in_force`, the circle part of
  `treeStructure`, read from `curation.json`, never written; `tests/structure.test.js` checks the two agree):
  `tools/fetch_fish.py` and `fetch_fishbase.py` (the species of their circles), `fish_judge.py` (circle 1's very easy
  photos), `fish_refs.py` (the genera the game has, every circle's; the species photographed stay `fish.json`'s, so a
  family out of the game keeps its reference photos) and `fish_game.py` (the download order only).
- **The admin's structure editor** (design note step 4): a family's circle and its look-alike pairs on its Tree page and
  in the Look-alikes filter, each click one draft step (`core.js` `contentSet` on the `circle` slot; `contentPairSet`,
  `contentPairDrop`, a pair's key `contentPairKey`; a pair added asks for a source once, never requires one; a restore
  that empties the pairs map keeps `{}` through every merge, `admin-content.js` `contentShells`), and a Publish that
  changes them confirms once that it changes every player's path and progress.
- **Photos › Look-alikes** lists the pairs in force on the draft (`admin-content.js` `montPairs`: `autosort.js`
  `fishPairs` over the file with the pairs laid over it, `sheetFile`, the circles left out as in the Tree's filter). A
  pair he added has its row, marked "(added)", its photo pair stored in `fish` `mont` under its pair key as a base
  pair's (`fishPairs` keys by `contentPairKey`); a withdrawn pair has none, and its photo pair stays in `mont`, unused,
  for its return.
- **The leaderboard's tree** follows the structure in force: the sheet makes it itself with the replay's units
  (`SUBJECTS` `replayed` `tree`, `core.js` `treeBoardTree`, the app's own `UNITS` tree;
  [sync.md › Other subjects' replays](sync.md#other-subjects-replays)).
- **The genera a circle edit brings into circle 1 with no name root**: the build requires a root or a reason in `skip`
  of every genus of `fish.json`, so such a genus shows none on its sheet for that reason. `tools/build_fish.py` reports
  them after its other reports (`show_rootless`, `tools/fish_inforce.py` `rootless`, over `curation.json` read, never
  written; also after `--regroup`, and alone with `--rootless`), each with its `skip` reason
  ([fish.md › Name roots of the fish genera](fish.md#name-roots-of-the-fish-genera)).
- **The words for the circles** (the design note's step 3, left for a second instance, built for the admin's Tree
  2026-11-21): `SUBJECTS` `admin.circles` `{circle: words}` on a subject that has circles (the fish: 1 IMR course, 2
  After the course, 3 Beyond the course, from what players already read, "the IMR course's families", "right after the
  IMR course's", "beyond the IMR course"; the sea slugs: Stars and most common, Next most common, Less common, from their circles' definition,
  Pierre, 2026-11-15, Q377), read by `admin-content.js` `circleWord` / `circleLab` ("1 · IMR course", the number alone where none are
  declared). The admin's Tree only: the app's own words (the circle-3 offer card, the achievements) are unchanged
  ([admin-tree.md › Structure](admin-tree.md#structure-circles-and-look-alike-pairs)). Another instance's words are a
  data field, not built: it waits for a second instance.

## The corals' structure: look-alike pairs only

The coral slate (the numbered and starred genera, Millepora and the bonus genera) is not the editor's (the design note's
section 6, "Not in this design"); the pairs are.

- `SUBJECTS` coral `structure` declares `pairs` at the genus rank in `look` (a list of genus names: `core.js` `pairIdOf`
  reads a row as `[id, words]` or as the id itself, so `structEntries`, `structCanon` and the admin's `pairRows` read
  both). The corals declare no circle.
- `core.js` `genStructure` writes the pairs in force on both records, in `gen` or `x.gen`: a withdrawn pair leaves both
  `look` lists and both `lsrc` lines (its words' slots then orphaned, kept); an added one joins both `look` lists after
  the base's, with an `lsrc` line on each side, the editor's source or `EDITOR_PAIR`.
- **The ★ rule kept** (rule L5): `SUBJECTS` structure `pairs` `hold` (`core.js` `starHold`), read by `structEntries`,
  refuses the withdrawals that would leave a starred genus with no surveyed look-alike to open after (`starRefs` empty:
  it would open at any time and show in no lecture group; Alveopora and Halomitra have one look-alike each). Additions
  first, then the withdrawals in key order, so two devices' withdrawals merged keep the first and hold the other
  whatever order they were made in. A held entry is orphaned with why `hold` (kept, never applied: the apply, the stamp,
  the admin and the sheet agree); the admin turns its Withdraw off. An added pair may give a starred genus another
  reference, or move it to another lecture group (the one most of its look-alikes are in): it still opens after the
  surveyed look-alikes its card names.
- **The coral replay** under the pairs in force: `SUBJECTS` coral `replayed` `gen` (`core.js` `genLooks`, the units the
  sheet built from `data.json` before) and its stamp, gated by `core.js` `PAIRS_SHEET` (`structSheet`; the fish keep
  `STRUCT_SHEET`): [sync.md › Other subjects' replays](sync.md#other-subjects-replays). The pairs count where an answer
  carries no scoring record (the rows from before sheet v61: the known mix-ups' look-alike prior and the look-alike test
  rebuilt from the units).

## The sea slugs' structure

Pairs only, between genera, their units (`SUBJECTS` seaslug `structure`: the genus `look` of `seaslug.json`, the pairs
a specialist source names).

- The apply is the corals' (`core.js` `lookStructure`, by id in the `genera` list: `srcsStructure`): a withdrawn pair
  leaves both `look` lists and both `lsrc` lines; an added one joins both `look` lists, leaves `dlook` (a data
  look-alike it was: never both, as in the build), and its line is the record's own for that genus (a data pair's
  iNaturalist counts) with the editor's source after it, else his source, else `EDITOR_PAIR` as its one source.
- **What a pair edit does to players**: the duels, the confusion groups' declared pairs and the sheet's Don't confuse
  with follow (`app.js` `treeGenera` `look`, `decl`; `UNITS` seaslug `pairs`), and every sea-slug player's progress is
  replayed under the pairs in force at their next sync (the structure stamp; their board follows, rule D8). A family's
  genera stay each other's look-alikes (traps, the replay's look) whatever is withdrawn (`treeGenUnits`); the data
  look-alikes stay the players' answers' to drop.
- No circles: a genus's circle is its best species', from the build.
- The app lays the pairs over its units and says their stamp (`UNITS` seaslug `st`, read with its own tree in force:
  `sync.js` `stNow`, `app.js` `treeWith`), gated by `core.js` `SEASLUGPAIRS_SHEET` (rule D4); the sheet's replay is the
  fish's (`Code.gs` `subjRpl_` over `seaslug.json`, its `SUBJECTS` `replayed` `file`).
- The admin's Structure box is on every genus page (no Circle), and Tag… › Any look-alike lists the genus pairs
  (`admin.js` `fuFilters`, the pair rows of the declared rank).
