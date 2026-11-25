# The learning model in the app (`model.js`)

What the app does with a player's answers: the state it keeps per unit, which unit and which photos come next, how hard
a question is, the progress bar, the mastery exam and the comeback after a break. This is the specification of what the
code does now. The research, the simulations and the reasons behind each rule are in [LEARNING.md](../LEARNING.md)
(cited below by its headings); Pierre's rules are L1-L12 ([rules/learning.md](../rules/learning.md)). The scorer
shared with the sheet's replay is `core.js` `scoreAnswer` (LEARNING.md "One scorer"; the replay in
[sync.md](sync.md#full-replay)). The quiz's own formats, feedback and games are in [quiz.md](quiz.md); the cards around
a game in [cards.md](cards.md).

The model is written for every subject (rule S1): "genus" below is the corals' unit, the fish's families, genera and
species and the sea slugs' genera take the same rules unless a subject's `SUBJECTS` entry says otherwise.

## Per-unit state

In `localStorage` `reefid-sync-coral-progress` (per subject, `sKey('progress')`), `P[genus]`:

- `ok`, `ko`; `h`, the recent results string (the last 10);
- the progress bar: `dp` and `ds`, the domain score's log posterior and its expectation (`core.js` `DOM`, below); `pg`,
  the former moving average (`core.js` `PROG`), kept only by a record the domain-score rules have not rebuilt yet;
- `th`, the ability, and `lt`, the global level at its last step;
- `ps`, the photos seen, `{f: [shown, right]}`; `ro`, the recent colonies;
- `cor` / `du` milestones; `off` and `conf`, the choices shown beside it and the units answered instead (below);
- `ex`, the mastery exam under way; `mx`, mastered; `pm`, recalculated under photo memory;
- for the comeback after a break, `at` (the last answer, ms), `dd` (days answered right) and `dl` (the last of them, a
  local day number).

`P['~level']` (`core.js` `LEVEL`) is the pseudo-unit of the global level: `ok`, `ko`, `th` like a unit,
`P['~level'].at` the player's last answer, `h` the recent results over every game (which `model.js` `openRight`
reads), and `rt`, the player's answer times
([sync.md › Answer time and enlargement](sync.md#answer-time-and-enlargement)). It syncs and merges like a unit and
appears in the sheet's per-unit abilities under its key. `core.js` `mergeProgress` keeps the latest `at` / `dl`, the
larger `dd`, and takes `pg`, `ds`, `mx` and `ex` from the device that played.

**A wrong answer is a failed observation for the unit shown and the unit given** (rule L2): the unit wrongly given
counts it in its progress, recent results and runs, but gets no Elo step (below).

## The state version and its views

What is read across the units is computed once per version of the player's state, not by each reader
([the design](../reviews/2026-11-24-incremental-engine-state.md), section 4.3). `app.js` `STATE_V` is one counter,
bumped (`stateBump`) by every write of an input and only by those. The inputs are the records `P`, the quiz settings
`Q`, the intro map and its offer, the first-launch records, the sheet's version, the photo statistics, the data in force
(`DATA`, the tree `TREEU`, the curation) and the subject.

Their writers bump it:

- `store.set` of an input's key (`STATE_KEYS`: each subject's `progress`, `quiz`, `intro`, `intro-offer` and `start`,
  `reefid-sheet-v`, the photo statistics);
- the scorer's caller and its writes to the record (`quiz.js` `recordAnswer`, `model.js` `answeredAt`, `varRight`), and
  every recalculation (`model.js` `mxRecalc`);
- `sync.js`'s refills of `P` (`replayAdoptS`, `mergeSubject`);
- a subject switch or visit (`subjectLoad`, `inSubject`), a data or tree build (`build`, `treeBuild`, `treePull`,
  `rankPhotos`), the statistics joined (`statsJoin`), a record made (`st`) and a reset;
- `model.js` and `sync.js` once loaded, since the views read their functions.

A second counter, `DATA_V` (the data version), counts the writes of the inputs that do not move with the player's own
play. The writers of the player's records and settings bump the state version alone (`stateBump('rec')`): the scorer's
caller and its writes, the recalculations, `sync.js`'s refills of `P`, a record made, a reset, `store.set` of a
subject's `progress`, `quiz`, `intro`, `intro-offer` and `start` (`REC_KEYS`), and a first-launch record another tab
wrote. Every other bump moves both: the data and the tree in force, the subject, the sheet's version, the photo
statistics, a file loaded. A bump with no argument moves both, so a writer not sorted makes the data views again too.

**A visit keeps the data version** (REE-298). A signed-in player's sync visits the other subjects at each save and each
pull (`sync.js` `syncSummary`, `mergeSaved`; at the boot, `progress.js` `achPending`), and lends another tree for a
while (`app.js` `treeWith`, `sync.js` `boardUnits`, `stsAsk`). A swap of the subject or the tree in force
(`subjectLoad`, `inSubject`'s return, `treeAt`'s `treePull`) bumps both versions like any other writer (`swapBump`), so
the views read meanwhile are the visited one's, and is counted apart (`DATA_SW`). When the visit ends with the subject
and the tree in force back as they were and every data bump since its start was a swap (`dataMark`, `dataBack`), the
data views' inputs are the ones before it: the data version then reads as the one before (`dataKey`: `DATA_V`'s value
now is an alias, `DATA_AS`, of that version), so the subject on screen's data views kept for it hold, and the draw's
data is not filled again. Any other data bump meanwhile keeps the new version: a tree built on the way (a visited tree
not built yet or stale, `treeBuild`), the statistics, the sheet's version, new data, a stored text another tab changed
(`stateNow`); so does a tree the visit leaves in force (from the corals with no tree in force before). `DATA_V` only
goes up and an alias names an older version, so a version once left is never read again (a view read during the visit
is never served after it). The limits:

- One value a view (one Map a keyed view): a data view the visit reads for the visited subject holds the visited
  subject's values afterwards, so the subject on screen's are made again at their next read. A sync's visits read no
  data view (`tools/answercost.js --syncs`: no data view computed in a sync's window).
- The state version still moves at each visit (the records `P` and the settings `Q` are swapped), so the state views
  are made again after it, as before.
- The other memos a visit resets for the subject on screen stay reset: `model.js` `GDIFF` (each unit's difficulty,
  cleared by its subject hook), the intro map read again (`INTROS`), `quiz.js` `TYPEN` (the typed names).

`model.js`'s subject hook reads the intro map again with `stateBump('rec')`: the intro map is the player's
(`REC_KEYS`), an input of the state views alone.

The other keys an answer writes (its queue, the comeback, the pending question, the achievements) are no input. The
sheet's version and the first-launch records are read from storage at every use (`sync.js` `keptBy`): their stored text
is compared at the first read of a view in a task (`stateNow`), so another tab's write bumps the version at the next
task. This tab's writes of them (`store.set`, `store.drop`, `store.raw`) mark the comparison to be made again
(`storeWrote`, [storage.md](storage.md)).

A view (`stateView`) is a function of the inputs alone, computed at its first read in a version and read as it is until
the next; a list keeps its order, so every draw that reads it draws the same, and it is shared, never changed by its
readers. Nothing a view keeps is stored or synced: the records stay the only source, and a replay or a merge that
refills them bumps the version. A view of one argument (`stateViewBy`, `dataViewBy`) keeps one value per argument
(a unit, a class, a set) for the version. A data view (`dataView`, `dataViewBy`) is read the same way, kept for the data
version: it reads only the data inputs, so the player's answers do not make it again. The views now are:

- the units in play: `bonusList`, `pool`, `sciUp` and `shareFree` (their computations `bonusCalc`, `poolCalc`,
  `sciUpCalc`, `shareFreeCalc`), each set's own units and the units it brings by itself (`app.js` `setUnits`,
  `setAuto`, per set: `sciOpen`, `spPlay`, `sciPlay` once a version for the three views that read them);
- the units met (`model.js` `introduced`, `metCalc`): one Set a version, made from the only units that can be met (a
  record's key or an intro map entry), so a read is one lookup; a loop with nothing written during it reads the view
  once (`introducedFn`: the sets' units in play, a level's need, the wrong choices, the openings' candidates in
  `planPhoto` and `introStart`, the rank share, the achievements' bonus count, `progress.js` `unlockN`);
- the units ready to be asked (`model.js` `introReady`, `readyCalc`): one Map a version over the same units, each
  one's part (`readyPart`): ready, or the mark on the answer clock from which it is (its card's gap), a unit absent
  being neither met nor ready. The clock itself (`tally`) is read at each read for a unit that waits, never kept: it
  follows the answer count, no input, and its first read after an answer may write the comeback's record. A loop reads
  the view once (`introReadyFn`: `unlocked`, the rank share's weights, `planPhoto`'s units met);
- the genera opened on a card, each with its mark (`model.js` `cardsNow`, `cardsCalc`), in the intro map's order:
  `openRecent` (the opening's pace) keeps those inside its window on the clock;
- circle 2's condition (`app.js` `c1Met`, `c1MetCalc`: every circle-1 unit asked since its card, and met), which
  `treeGate` reads for each circle-2 unit;
- each unit's bar and exam entry (`model.js` `genScore`, `genScoreCalc`; `examOn`, `examOnCalc`), per unit;
- the comeback's units (`model.js` `cbPlay`, `cbGenera`), the start's level (`startP`, read once per unit by
  `ability`) and whether the player said they are at IMR (`imrSaid`, read once per name shown);
- a level's need (`model.js` `lvlNeed`, `lvlNeedCalc`, per class): how many units it still needs before its questions
  stand among units opened;
- the tree's score (`model.js` `headScore`, `headScoreCalc`): the header pill, My progress, the circle-3 gate
  (`app.js` `treeC3`) and the achievements read one computation per version;
- the levels (`model.js` `lvTable`): the level of every unit with a record (`lvStepCalc`, so its bar and its exam
  entry), a unit with no record at 0. A loop over units reads one table (`lvSteps`: the achievements' `achSnap`, My
  progress), `lvStep` one unit.

The data views:

- the scientific genera in the game (`app.js` `sciNow`, `sciNowCalc`);
- the sets' units grouped by class (`app.js` `rankClasses`, `rankClassesCalc`: `rankUnits` is one lookup), each unit's
  class (`kindRank`, `kindRankCalc`) and set (`setOf`, `setMapCalc`);
- a class's units with a photo (`model.js` `lvlAll`, `lvlAllCalc`);
- the look-alike index (`model.js` `lookRev`, `lookRevCalc`): `examLooks` reads a unit's look-alikes from it in the
  order of the units in play, where it filtered every unit in play by its record;
- the photo draw's data per unit (`model.js` `drawPhotos`, `drawPhotosCalc`): the photos each view of the unit may
  show, and each photo's difficulty (`photoDiff`), its targeting's width (`calSd`), its calibration factors (`calBonus`,
  `setBonus`), whether it is a reference-level photo (`refLevel`), its variant kind and its mimicry entry. `photoSet`
  reads it once per draw and `varOf` takes its kinds; the player's part of a weight (the target, the memory, the
  variants' ramps, the window of recent photos) is computed at each draw. The inputs include the subject's calibration
  and the calibration set (`app.js` `build` bumps after it is read). The reads that are the same for every photo of the
  unit are made once for it (`calU`, `photoDiffOf`: its offset, the subject's ease, the time term of a photo with none;
  `setFiles`), and each photo's answers (`nAnswers`) once for its three factors, passed to `photoDiff`, `calSd`,
  `calBonus` and `setBonus`. **It is filled ahead in idle time** (`app.js` `drawFillSoon`, `drawFillStep`), so the
  answer that draws a unit finds it ready: about ten calls a photo, a fish family's thousands of photos otherwise on
  that answer. For the units in play (`pool`, those met first), in slices of at most `DRAW_FILL.CAP` photos that end
  with the idle period (`requestIdleCallback`; without it, a slice every 50 ms), each slice reading the view itself, so
  the values are the draw's. It is asked after the boot's first plan, after each plan (`quiz.js` `planNext`), after a
  visit to another subject (`inSubject`: nothing to fill when the visit kept the data version) and when the photo statistics arrive
  (`rankPhotos`); a data version already filled asks nothing, and a slice makes its queue again when the version moved.
  A unit not filled yet (one that came into play later in the version) is filled by its draw, as before;
- the units of a level's list by parent (`app.js` `kidsOf`, `kidsCalc`) and, for `sciPlay`, each parent's units in
  its species order (`sciKids`, `sciKidsCalc`): `spPlay` and `sciPlay` read them;
- the sets' units with a kind of name and a species (`progress.js` `achNamed`, `achNamedCalc`), which `achBoth`
  counts at Advanced;
- each unit's part of a pair's confusion prior (`model.js` `confUnit`, `confUnitCalc`: its declared and data
  look-alikes and its family) and its growth forms (`formsOf`): `pooledConf` reads them, where it read both records and
  computed both units' forms for every pair;
- each unit's part of a pair's group score (`model.js` `groupUnit`, `groupUnitCalc`: its declared look-alikes as
  `declaredOf` gives them, its data look-alikes and its family) and its growth forms (`formsOf`): `groupsOfRank` reads
  them once for its loop (`groupPairFn`), where every pair of a rank read both records and computed both units' forms,
  tens of thousands of pairs whenever the units in play or the pooled stats change. Only the pairs that may be an edge of
  the groups are scored up front (`groupPairFn` `pairs`): the declared and data look-alikes and the pairs the pooled
  stats count, since without a pooled count a pair scores its prior and only a look-alike's reaches `CONF.TRAP`; any
  other pair is scored when the average linkage reads it. Every pair is scored when that does not hold (a unit with no
  record, a name twice, a lower prior at `CONF.TRAP`);
- whether a unit has a game photo to show (`model.js` `photoAnyBy`, `photoAny`): the units in play (`app.js`
  `poolCalc`) read it once for their loop (`photoAnyFn`), where they asked `photoAny` of every unit at every answer;
- the choice labels (`model.js` `choiceKeyFn`), per unit and per IMR answer: a species named by its common name is
  labelled with the player's first common name (`app.js` `treeGenera` `name`, `cnFirst`), so the answer (`imrNow`,
  read once) is in the key and each key's label is computed under it. Only a subject that names its species by their
  common names (`SUBJECTS` names `cn`) reads the answer.

Each unit's difficulty (`model.js` `genusDiff`, memo `GDIFF`) is kept for the data version too, read from `DATA_V`
directly (`GDV`, no storage check: its inputs, the statistics joined and the units built, are written in this tab). So a
tree's new photos (`app.js` `treeBuild`, `treePull`) make it again, as the statistics, a new curation and a subject
switch do. Where `model.js` runs without `app.js` (the tools, the unit tests), the memo is cleared by hand.

A keyed view has a read for a loop with nothing written during it (`app.js` `keyView` `fn`, as `introducedFn`): the
version is read once, then a value kept in it is a lookup; any other read goes through the view (with `VIEW_CHECK` on,
every read). `distractors` reads each unit's class (`rankKindFn`), label (`choiceKeyFn`), pooled confusion
(`pooledConfFn`) and forms that way; `openFresh`, `levelTop`, `quiz.js` `planFind`, `typeMatch` and `typeKind` read the
classes that way. `quiz.js` `planPhoto` hands the wrong choices the units met read once (`knownNow`, through
`introducedFn`) at their call: `distractors` and `customChoices` write nothing.

A tool or a smoke that writes one of these inputs by hand (the photo statistics, the calibration's constants, the
subject's calibration) bumps after it with no argument (`stateBump()`): `tools/learnsim.js` (`--calib`, the made-up
photo difficulties), `tools/fish_draw_sim.js`, `tests/profiles.smoke.js`.

The first read of a view in a task compares the stored text of the sheet's version and the first-launch records
(`stateNow`: four storage reads); the task's other reads compare nothing. Where a part of these files runs alone (the
rated world, a unit test: no `stateView`), each value is computed where it is read, by the same code. With `VIEW_CHECK` on (every smoke page and `tools/learnsim.js --facheck`,
through `tests/facheck.js`), every read of a kept view computes it again and compares, order included (a list, a Set
or a Map item by item, a plain object key by key down to its leaves), and a `stateNow` that trusts its task's
comparison compares the stored texts again; a difference throws, and again in a task of its own. The units met are
checked value by value: each `introduced` read against `introducedCalc` (`model.js` `metCheck`), and each
`introReady` read's part against `readyPart` (`readyCheck`), so a record a smoke writes by hand for a key no read asks
about is no difference. A smoke that writes `P` or the intro map by hand
bumps after it (`stateBump('rec')`), as the app's writers do.
`tests/stateview.test.js` compares the units in play, the rank classes, each unit's set and class with the code before
them over rated-world runs and made-up states, and checks that every declared writer bumps the right versions;
`tests/levelview.test.js` compares the tree's score and the levels with the code before them over rated-world runs of
the fish, the corals and the sea slugs; `tests/modelviews.test.js` compares the units met, the bars, the exam entries,
the comeback's units, the start's level, the IMR answer, a class's units and its need over the same runs, and fails a version bump made
to move nothing or to forget the state version on an answer (mutation checks); `tests/examlooks.test.js` compares
`examLooks` with the filter of every unit in play. `tests/drawview.test.js` compares `photoSet` and `varOf` with the
code before the draw's data view, draw by draw from the same random numbers, on made-up units of every shape with the
player's records, the photo statistics, the calibration set and the subject's calibration written between draws, checks
each kept entry against the functions it keeps after every write, and fails the statistics written with the player's
bump alone; it also checks `kidsOf`, `sciKids` and `achNamed` against the code before them and fails a change of their
data under the player's bump alone; `tests/lvlnext.test.js` compares `spPlay` and `sciPlay`, and
`tests/levelview.test.js` the achievements' counts, with the code before them over many states.
`tests/choiceview.test.js` compares the pooled confusion, the labels, the classes and the wrong choices with the code
before them on made-up units, with the records, the IMR answer, the pooled answers and the units' records written
between reads, and fails a record, a unit's forms, a name or a class changed under the player's bump alone.
`tests/openview.test.js` compares the units ready, the cards' window, circle 2's gate, the units met in the openings'
loops and the comeback's rust (`rustNow`) with the code before them on made-up records and intro maps, the clock and
the time moving between reads, and fails the intro map or a record changed with no bump. `tests/poolview.test.js`
compares the units in play with the code before `photoAny`'s view, with the slate, the bonus units and the units' photos
written between reads, and fails a photo refused under the player's bump alone; `tests/groupview.test.js` compares every
pair's group score, its declared test and the groups with the code before them, with the pooled stats and the units'
look-alikes, families and forms written between reads, and fails a unit's look-alikes changed under the player's bump
alone.

## Which unit next

`weight()` draws the unit to ask (LEARNING.md "One draw weight"): `drawW` = 1 − x·c, x the chance to recognise an average
photo of the unit (`sig(ability − genusDiff)`), c = m / (m + `ELO.n`) how sure the Elo is after m answers. A unit never
asked weighs 1; badly known or barely measured, near 1; known and measured, near 1 − x. A unit ready for its next exam
question weighs 1 and is held back (× 0.05) between two; one asked in the last 4 questions is mostly held back (× 0.1).
Bonus genera weigh like any other ([quiz.md › Bonus genera](quiz.md#bonus-genera)).

**Review** = shaky: the player's expected success on an average photo of the unit under `OPEN.P` (0.6), the quantity
the draw weighs.

**The progressive opening** (LEARNING.md "Which genus comes next: the progressive path", "First meeting with a genus"):
there are no coded tracks; the player's own answers set the pace.

- A question may open a unit (its first-meeting card) when the path allows one, with the chance `openChance` = 1 − shaky
  / `OPEN.K`; a unit still shaky after `OPEN.STUCK` (10) of its own answers takes no place among the K once the
  player's answers so far (`answersSoFar`) are `OPEN.STUCK_FROM` (200) or more (LEARNING.md "A unit stuck shaky").
- The unit opened (`openPick`, from `OPEN`, `genusDiff`, `shaky`) is drawn by confusion group (`GROUP`,
  `groupsOfRank`, `groupsNow`): a group's other members first, then a new group or a lone unit on the groups' means, the
  first cards drawn unit by unit; among the units not met yet the easiest first (softly, `OPEN.T`) and the most common
  near Dauin first (`commonFactor` in `core.js`, from `data.json` `cm`). A unit's exam waits for its group partners
  (`matesLeft`). A fish genus's declared look-alikes are in `decl`, its IMR sub-entry.
- The pace (`openPace`): no card while a unit carded in the last `OPEN.WIN` (15) answers waits for its question, at most
  `OPEN.MAX` (3) carded in any 15; it is asked once ready, after its card (`openDue`, `askedOpen`).
- An opening only after a right answer (`openRight`): no card while the last graded answer in any game was a miss; a
  card planned before the miss is planned again.
- Easier questions while the opening hold is on (`holdEase`): the photos and the format aim `h − INTRO.HOLD` logits
  lower, on every question but an exam, the Duel tab's too (`quiz.js` `planDuel`).
- A unit opens only once the units its record says it opens after are met (`after`: a starred genus's references,
  [front-end.md](front-end.md#shared-helpers-appjs); `core.js` `afterWaits`, read for every subject).
- The draw is simulated by `tests/profiles.smoke.js`, the learning outcomes over many seeds by `tools/learnsim.js`.

**First-meeting cards, Open all and back to one at a time** (`model.js` `INTRO`, `introAdd`, `introduced`, `introReady`,
`introAll`, `backDue`, `introBack`, `introMerge`; `quiz.js` `introShow`, `backShow`): a player starting from zero first
meets `INTRO.START` units on cards and is asked about those; new units then come one at a time, each on its card, never
as the answer of the question right after it (`INTRO.GAP`). A level below the subject's own opens the same way, a group
of `INTRO.START` close units on cards together, none of it before (`model.js` `lvlNeed`, `openFresh`, `openGroup`,
`levelTop`; `app.js` `lvlNext`; LEARNING.md "A level opens in a group"), recorded as first cards (`s`). `reefid-sync-coral-intro` (per subject) maps a unit to
[answers when shown, 1 when ready at once, time, kind: `s` the first cards, `c` a card of its own, `a` Open all, `b`
closed again]; `reefid-sync-coral-intro-offer` is {at, open, via, t, n, h, bk, bat, bn, bt}: Open all (offered from the
first cards or My progress; `via` 'offer' and `open` 0 only in older records), then `h`, the opening hold's CUSUM since
Open all (`holdStep`), and the back card's choice. The back card is due once after Open all when `h` reaches 2 ×
`INTRO.HOLD`, as a prompt (`promptOk`, `noOpen`): "One at a time" marks every `a` unit `b` (out of the draw, the choices,
duels and "Again" until its card opens it again; its answers and progress kept), "Keep them all" changes nothing. Both
keys are `reefid-sync*` (synced; `introMerge`: per unit the later of a `b` mark and an opening wins, the record by its
latest decision `t` / `bt`); the admin's player journey shows the choice (`admin-journey.js`). The cards themselves:
[cards.md](cards.md).

## Difficulty and ability

**Continuous difficulty** (Elo as in Pelánek 2016): the per-unit ability `P[n].th` sits on the photo-difficulty scale,
updated in `core.js` `scoreAnswer` (`eloStep` with `ELO`; `quiz.js` `answer` and the sheet's full replay both score
through it) with P(right) = g + (1 − g)·sigmoid(ability − difficulty), g = 1 / choices, K shrinking with the answers but
at least `ELO.kmin` (0.25), volatility in `ELO.vr` / `vg`. A wrong answer moves the Elo of the unit shown only
(LEARNING.md "The genus wrongly given in the Elo"; `tools/abilityeval.js` replays the real answer log under such rules).
A unit already answered also moves with the global level since its own last step (`core.js` `levelMove`: the level's
move since `s.lt`, the level then, saved and merged with `th`, over 1 + its answers / `ELO.n`; both ways; the level's own
step has no `kmin` floor; LEARNING.md "Global level and genus").

**The global level**: the same Elo step runs over every answer into `P['~level']`, so strong players meet look-alike
traps early. A unit never answered starts from `playerStart(P, n)` (`core.js`, `START`): `START.W` (0.8) × the
global ability × M / (M + `START.N`) (M = its answers), clamped to [`START.LO`, `START.HI`] = [−0.5, 1.5];
progress saved before the level falls back on the answer-weighted mean of the units' abilities, and the record is made
at the next answer from that history (`levelSeed()`), so earlier answers keep counting. Taken once: the first answer
saves the unit's own `th`. The progress itself is not carried over: each unit is proven by its own answers.

**The aim.** The success the photos aim for follows the global level (`aimP`, `core.js` `aimOf` and `AIM`: 85% up to a
level of 0.5, 75% from 1.5, linear between), and so does the shaky bar of the opening (`OPEN.P` + aimed − `PICKD.P`;
LEARNING.md "Beginners and experts"). `photoSet()` draws the photos weighted around the target ability − `aimOff(k)`,
so the question is right with the chance aimed for in its format (`PICKD.P` = 0.8 at the reference: 1.01 below with 4
plausible choices, 0.41 with 2, 1.39 typed), less the format's offset from the sheet (`aimOff(k, df)`, which the
ability steps' expectation takes too, `scoreAnswer` `df`: `model.js` `PFMT`, read through `pfmt()`, which gives a subject
the sheet does not rate no offset, every format 0; LEARNING.md "Per-format offsets"). Never-seen photos get a bonus (for
the corals IMR's and Pierre's first), photos answered right twice weigh less, the last colonies are held back and at
least `PICKD.VARIETY` (3) colonies stay in rotation (`VARIETY`).

**Answer choices** follow the same ability: `trapsFor(t)` = how many of the 3 wrong choices are look-alikes of the target
(`look` both ways): 0 on a unit's first question (ability 0), then one more per 0.18 (`FORMAT`, `formatAt`), rounded at
random in between, all 3 from 0.54 (one look-alike after the first right answer, all three after about 5). While traps
are 0-1 the other wrong choices are units sharing no IMR growth form with the target (`imrFormsOf`), other lecture
groups first and each in a different growth form (so the answer is not the odd one out); from 2 traps the last choice
is from the family first, then any unit. With 0-1 trap, the Elo (and the progress weight) use g = 1 / k with k = the
target and the plausible wrong choices (`plausibleK()`: confusable or a shared growth form, at least 2), and the answer
log records the mode as `quiz|kN`, so the sheet's `stats_` and `core.js` `eloOf()` rate the photo with the same guess
rate (a script without it treats it as 4 choices). The met units come first as the easy wrong choices.

**Confusion scores**: the look-alike traps are the units with the highest `confOf(t, n)` = `confScore()` (`core.js`):
mixed up / offered together for the pair, pooled over every player (`?stats=1` `conf`), from a prior worth `CONF.W` = 8
offers (declared look-alike 0.3, same family 0.12, a shared IMR growth form 0.08, other 0.03). A pair is a trap
(`confusable`) from `CONF.TRAP` = 0.2, so a declared pair nobody confuses fades and an undeclared one players do confuse
becomes a trap; scores are shuffled ±20% so close pairs all get tried; `plausibleK()` counts the confusable choices.
Every answer logs the choices offered (`ch`, the Answers tab's `Choices` column); with no pooled `conf` the priors alone
apply. Look-alikes from the data (`core.js` `dataLook`, `model.js` `dataLooks`: `CONF.N` 20 offers and a pooled score of
`CONF.TRAP`) serve the duels, the Again, the genus sheets and the admin's Confusions; the pooled traps for experts are
`pooledConf`; the player's own mix-ups enter the expectation (`confTerm`, `core.js` `confGap`, for questions with 3 or
more plausible choices).

**The personal path**: the pooled score is the prior for the player's own record on the pair, `pairConf(P, a, b)`
(`core.js`) = [offered together, mixed up] in both directions from `P[g].off` (each wrong choice shown beside `g`,
counted in `answer()`) and `P[g].conf` (the unit answered instead), again worth `CONF.W` offers, so the player's weight
is offers / (offers + 8). A pair a player keeps mixing up becomes their trap even if others do not confuse it; one they
now tell apart sinks back. Duels weigh a pair ×3 when the player mixed it up and still confuses it, ×2 when
`confusable` or a classic, else ×1. My progress "Your tricky pairs" reads the own record alone, no pooled prior
([front-end.md](front-end.md#the-pages)). `mergeProgress()` adds `off` up across devices like `conf`. The contrast
queue for the Again and the duels slipped into the quiz is `quiz.js` `CONTRAST` (up to `CONTRAST.Q` 3 pairs,
`rematchAdd`, oldest first; an Again never asks a unit not met).

**One colony per question** (rule P4): photos are grouped by observation (`p.o`); a question shows the views of one
colony only, never topped up from another. Beginners favour colonies shot at several zooms; `singleP()` raises the
share of single-view questions (up to 85%) as the ability rises (`FORMAT`, one schedule with the traps); a single view
counts as +0.5 harder (`SINGLE`). The other views show after the answer.

**Photo difficulty** `photoDiff()`: the sheet's hierarchical photo Elo (`?stats=1`, all players, cached in
`reefid-photo-stats` with the sheet's `v`): a photo's rating is its unit's offset plus its own residual (`core.js`
`GENUS_K`), shrunk towards the unit's offset (`?stats=1` `gd`, `model.js` `PGD`) by `PDIFF.W` = 5 answers; a photo
nobody has answered is its unit's offset (with a fish photo's judged ease), 0 before the first reply. It is the
difficulty of a photo met for the first time (LEARNING.md "Hierarchical photo Elo").

**Online calibration** (`CAL`, `calBonus` in `model.js`): a photo with few answers from all the players (the `?stats=1`
count) is drawn more often, and `CAL.RATE` (30%) of the quiz questions are calibration questions (one view alone, the
colony and view chosen on the difficulty targeting and that bonus only), so photos nobody had seen get rated. They come
only on a unit the player holds (met, not shaky), never in a comeback, and the targeting is wider for a photo with few
answers (`CAL.U`: its prior is only its unit's offset; a subject may set its own, `SUBJECTS` `calib` `u`, the fish's
0.25, whose photos all carry a judged ease, and share the draw's floor over a pool of observations, `calib` `pool`, the
fish's 30; LEARNING.md "The fish draw in big pools").

**Photo memory** (`PMEM`, `famOf`, `pgMemW` in `model.js`; `core.js` `MEM`, `memBucket`, `memFam`, `memOf`): a question
on photos the player has already been shown (`s.ps`: [shown, right]) is expected easier by the offset of their memory
bucket (new 0, shown never right, right once, right twice or more), estimated by the sheet (`?stats=1` `mem`; the fixed
prior with a script that does not serve it). Those offsets are the subject the sheet replays (`SUBJECTS` `offsets`):
every use reads them through `model.js` `pmem()`, which gives any other subject the prior, so no coral offset touches a
fish answer. The ability step, the global level, the logged `e`, the opening hold and the comeback all use that
expectation; a right answer counts in the progress only for what memory does not explain (`pgMemW`); the photo draw
weighs a photo already shown e^offset (`photoSet`). Progress saved before it is recalculated once, silently (`core.js`
`memRecalc`, `model.js` `memRecalcAll`; unit records marked `s.pm`, kept with the progress by `mergeProgress` and
`mergeUsers`). `tools/memreplay.js` replays a saved answer log under the old and the new rule (LEARNING.md "Photo
memory"). The admin "Without me" switch recomputes it without Pierre's answers for Stats only; the games still use
everyone's.

**Juveniles and colour phases on their unit's mastery**: a photo with a judged phase (`core.js` `phaseOf`: its `ph`
word, else the juvenile tag) is a variant of its kind (`varKindOf`: an early-class, late-class or other juvenile by its
family's `fish.json` `juv`, or a sex or colour phase) and weighs its kind's ramp on the bar of the unit asked (`VAR_AT`,
`varRamp`; a family's `varAt` overrides; `model.js` `varOf`, `photoSet`: weights only, the variety and the floor lifting
such an observation by its best photo's factor); nothing is held back on a unit with fewer than `PICKD.VARIETY`
observations at full weight. "Learned" asks a right answer on each variant group a unit has (`model.js` `varLeft`,
`examSet`, `examPassed`); the sheet's replay from the answer log applies the same rule to every player, the leaderboards
included (`core.js` `treeVarTable`, `replayProgress` `vars`, `replayedOf`, `Code.gs` `subjVar_`). The first juvenile and
the first sex or colour phase a player meets bring a card at Next (`quiz.js` `phaseArm`, `phaseCardFor`, `juvCard`,
`phaseShow`: the photo beside one of its species in another phase, `core.js` `phasePair`; once per kind and subject,
`TOLD` `phase:<subject>-<kind>`). The juvenile card has no words of its own (its title names the two photos, "Juvenile and
adult"): one rule for a young photo, juvenile or sub-adult (the phase intermediate, no phase flag), which brings it only
where a source says its species' young look clearly different (`fish.json` species `jd.d`; `jd.sub` is information
only), and only with an adult of its species among its unit's photos; no flag, no card
([fish-sheets.md](fish-sheets.md) "Juvenile card flags").
LEARNING.md "Juveniles and colour phases on their unit's mastery".

**The mimicry class**: a photo of a species a source says resembles another (`fish.json` `lookalikes`, from
`tools/fish_lookalikes.json`; `app.js` `mimLay` puts the entries on the resembling species' family) weighs its own ramp
in the draw (`model.js` `mimOf`, `mimAt`, `MIM_AT`: from Open Water once a unit of the species it resembles is met, at
Advanced while none is); the draw only, its kind and group for "Learned" stay its phase's, so the replay is unchanged.
Its first meeting brings its pair's card before the phase card (`quiz.js` `mimArm`, `mimShow`, `mimPics`: both species,
the sourced marks, the sources of the resemblance; once per pair, `TOLD` `mim:<subject>-<pair>`, device key `mim`),
never with a photo taken outside the region of a species whose look varies by region (its `region`). The pair
drilled: such a photo makes the unit it resembles, at the rank asked, a trap counted plausible (`mimUnit`,
`mimTrap`); once its card is shown the families duel (`mimPairs`), and a duel or an Again after its mix-up shows the
pair's species (`mimKeep`); a mix-up shows its marks (`mimMix`). LEARNING.md "The mimicry class".

## Progress and mastery

**The bar** (LEARNING.md "The domain-score bar"): the share of all the unit's photos, easy to hard, the player would
name right alone with no choices, as far as their own answers on it have shown (`core.js` `DOM`, `domStep`, `domBar`,
`barOf`): the posterior expected domain score over a grid of abilities, each own answer's likelihood with the photo's
difficulty, memory and format, a drift before each answer so old answers fade. It moves only when the player answers
(a right answer never lowers it, a miss never raises it), and runs from 0 to 95%. A record the domain-score rules have
not rebuilt yet keeps its former moving average `s.pg` (`core.js` `PROG`, `pgStep`, `pgOf`; `model.js` `pgWeight`,
`pgRightW`, `pgMissW`), filling 95% at `PROG.M` = 0.8: a right answer weighs (1 − 1/k) / (3/4) with k plausible
choices, by `PROG.LOOK` (a half) when none of its look-alikes is among the choices; a miss weighs the Elo chance of a
right answer over the chance aimed for, at most 1 (in full at the player's level, less on a harder photo). Progress
saved before `pg` is recomputed from its last 10 results (`pgOf`, as the sheet's `pctOf_`).

**Learned** = the **silent mastery exam** passed (`s.mx`). The exam opens (`examOn`) once the bar reaches `DOM.EX`
(85%; `core.js` `examOpen`; `PROG.M` for a record not rebuilt), the unit has been asked beside each of its declared
look-alikes the player can be asked, or mixed up with it (`lookLeft`, `core.js` `looksLeft`), and its confusion-group
partners are met (`matesLeft`). Then `EXAM.n` = 5 questions on it are slipped unannounced into the photo quiz
(`quizPhoto` → `examSet`), at least `EXAM.gap` = 8 answers apart (`examReady`, counted in answers, never time), each as
hard as the game gets: one photo alone, the player's [reserve](reserve.md) first, else never shown (else the least
seen), the hardest of its view, the views taking turns, 3 look-alike traps (`s.ex = {k, v, at, ts}`, `ts` its start,
for the full replay); `TYPED.exam` of them typed ([quiz.md › Typed questions](quiz.md#typed-questions)).
All right, with a right answer on each variant group (`examPassed`): `s.mx = 1` and a pop-up. The exam's count is shown
nowhere: only the unit's %, which creeps up from 95% (each exam question passed fills a fifth of what is left) and falls
back on a miss. Any miss on the unit (exam or not) and any time it is given as the answer for another unit drops
`s.ex`; it starts again at the entry. A learned unit keeps its mark through one miss and loses it on a second one before
right answers bring it back up (`mxKept`, `core.js` `keepsMark`: the bar at `DOM.KEEP` or above; `PROG.M` × (1 −
`PROG.A`) for a record not rebuilt), and the exam comes back. A unit whose record says `noex` (a fish species) has no
exam: its bar tops out at 95%. `tests/draw.smoke.js` plays an exam through the real quiz.

A recalculation that takes a learned mark away (`model.js` `mxRecalc`: a mark passed under BKT, a record with neither
`s.pg` nor `s.ds` (`core.js` `afterBkt`), dropped by `core.js` `memRecalc`, the unit then taking the exam again) is
silent while `MXL.QUIET` holds: it does not call `mxLost`, so no card, the achievements kept
([achievements.md](achievements.md#achievements); LEARNING.md "Learned under the former model").

## Progress scale and mastery levels

`genScore` (`core.js` `scoreOf`) = the bar (at most 95%), plus a fifth of what is left per exam question passed, 1 once
mastered. `progPct` (the mean over the slate) drives the header ring. `lvStep` gives 6 steps, the **mastery levels**
(`model.js` `MASTERY`, `lvIcon`, a diver's ladder every player knows, one icon each): 0 not seen, 1 Snorkeler (under
50%), 2 Open Water (from 50%), 3 Advanced (from 80%), 4 Divemaster (from the exam's entry, `examOn`), 5 Instructor (the
exam passed, `s.mx`). The thresholds `LV_AT` only name points on the %; the game never reads them. The levels are
coloured by the palette's learning-level ramp; the legend shows each level's icon and count, the player's card the two
highest levels reached (`lvSummary`: "2 Instructor · 3 Advanced"), the genus sheet its level and icon; the tiles on My
progress (Photos / Slate / Groups views) show a mini ring and %; review is a small amber dot on a surface ring
(`--review`). **No time between sessions anywhere** (rule L1): the seconds an answer took weigh only a right answer's
ability step ([sync.md › Answer time and enlargement](sync.md#answer-time-and-enlargement)).

## Comeback after a break

LEARNING.md "Comeback after a break". `model.js` `rustNow` (run when a question is planned or answered) starts a new
visit after `SESSION.GAP` = 30 minutes without an answer: the next `COMEBACK.FLOOR` = 10 answers open no unit (`noOpen()`
blocks the cards in `planPhoto`, the open-all and bonus genera offers in `quizPhoto`; bonus genera, once on, open by
cards like slate genera). From the FSRS recall per unit (`recallAt`, `stability`) it adds the gap's rust (`rustOf`,
summed by `rustAdd`, each unit's stability read once for its two times) at a new visit and during a comeback, the only
times the sum is read; between them it sums nothing (`rustSkip` still makes the `genusDiff` values the sum would read,
so the memo holds what the sum would leave in it; the values follow the data version either way). A
comeback runs while that is above 0 (`comebackOf`: units answered right, the surest half first, then the most rusted;
the usual choices, `trapsFor`; photos aimed at ability + ln R through `photoSet(n, skip, shift)`; no card, duel or exam;
`q.warm`, and `q.cb`, the unit's recall) and ends by a CUSUM on its answers (`comebackStep`, with the opening hold's
tolerance `INTRO.SLACK` an answer). Neither applies with fewer than 2 units answered right. State in `reefid-comeback`
{r, t, ok, f} (device only, cleared with the progress). Its answers are logged `|c` with the recall-adjusted `e` and
count in the opening hold.
