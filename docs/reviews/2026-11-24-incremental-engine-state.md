# The engine's state, kept incrementally: inventory, causes, what others do, a design and a plan (2026-11-24)

Status: design study, docs only (Linear REE-265, its "Next action"; parent REE-263). No app code, data file, curation
or sheet was changed. The states measured are the simulator's (`tools/learnsim.js`), never the real sheet's (rule D1);
the real sheet was read once, read-only, for its Timings tab (operation times, no name). No player appears. Nothing here
is decided: section 6 lists what is Pierre's to choose.

Pierre, 2026-11-24 06:22 Manila, on an answer that re-reads everything: «c'est juste pas possible. On doit trouver un
autre moyen de faire ces calculs sans devoir ré-interroger l'historique entier à chaque réponse. C'est un vrai gros
problème de conception … comment font les autres apps qui font des choses similaires? Il faut vraiment creuser pour
trouver la/les causes originales, et penser comme un scientifique en développement logiciel / algorithmicien pour
trouver des solutions propres, simples et efficaces.»

Labels (rule W11): **[measured]** counted or timed by the scripts of section 7 on `main` @ae290fb0 (after #1520 and
#1521); **[read]** read in the code, a doc or a cited source; **[guess]** a judgement or an extrapolation.

Symbols: **H** the answers in the history; **U** the units with a record; **V** the units in play now (`app.js`
`pool`); **T** every unit the subject's tree builds (families, genera, species by each kind of name); **R** the pair
counts (the entries of every record's `off` and `conf`); **k** the choices of a question (at most 4); **G** the 21
points of the bar's grid.

## Answer first

- **The scorer is already incremental; what is not is everything read across the units.** One answer runs
  `core.js` `scoreAnswer` once and updates three records in place, in O(k + G) [measured: 1 call at every history
  length]. No answer re-reads the answer log to score. But nothing derived *across* units is kept: a unit's false-alarm
  rate, which units are in play, each unit's level and exam entry, the draw's weights, the global score, the
  achievements' counts are recomputed from the whole state by every function that needs one, and those functions call
  each other. On the fish at 3,000 answers one answer makes **8.7 million** function calls, of which 1.6 million are
  `model.js` `introduced` and 111,000 `core.js` `scoreOf`; on the corals at 3,000 answers, 35,000 [measured].
- **The cost grows with the state, not with the log**: with U, V and above all T (1,625 units in the fish tree against
  66 for the corals), multiplied together: units × units, parents × the whole level. The history enters through U, V
  and R, which grow with it, and through storage: signed out, the device's answer queue (two keys, up to 2,000
  answers and 0.8 MB each) is parsed six times and written twice per answer [measured].
- **Original causes** (section 2): values derived on read with no place to keep them; the pair counts stored by the
  unit shown while the false-alarm rate needs them by the unit given; no single "the state changed" signal, so seven
  caches each invented their own rule; settings read from storage at every use (10,000 reads of the sheet version per
  answer); loops written unit first, each unit asking a global question again. The corals (45 units, one rank) hid all
  of it; three fish features merged within a week multiplied it.
- **How others do it** (section 3): every comparable system keeps a small state per item and updates it with the
  answer (SuperMemo, Anki and FSRS, Duolingo's half-life regression and Birdbrain, Elo, knowledge tracing): we do that
  too. What we lack is what event-sourced systems and databases do around such a state: aggregates kept as counters
  updated by the change, views made once per version of the state, the log kept as the reference that can rebuild all
  of it.
- **Recommended design** (section 4), no data format change, no rules version, every value bit-identical: (1) the
  false-alarm counts **kept as two integers per unit, updated by the scorer** where it already increments the pair
  counts: O(k) per answer, O(1) per read, rebuilt from the records in one pass whenever the records are replaced
  [prototype measured: 0 differences over 408,000 reads; a pass over every unit 28 µs against 5,125 µs]; (2) **one
  state version and one view per version** for what is read across units (the units in play, bars, levels, exam entry,
  the tree's score), each computed once instead of once per reader; (3) settings and the answer queue **held in
  memory**, written through. Per answer: O(k + G) for the state, O(k) for the counters, one O(V) pass and one O(T) pass
  with O(1) reads for the views, a draw in O(V). The draw must still look at every unit met: every unit's weight moves
  with the global level at each answer, and that pass costs microseconds once its reads are O(1).
- **It stays the log's projection** (rule D9): the counters and the views are never saved, sent or merged; they are a
  function of the records alone and are dropped whenever the records are replaced (an adopted replay, a merge, a
  reset), so a full replay gives the same state by construction; a check mode compares every kept value with its
  recomputation in every smoke (as `FA_CHECK` does today), and the same simulator seed must give a byte-identical
  state before and after each PR.

## 1. Inventory: what one answer computes

### 1.1 Method

[measured] The page was opened in Chromium on saved states of one simulated player (`lectureRA`, seed 1; the fish at 50
to 3,000 answers, 16 states; the corals at 500, 1,500 and 3,000), signed out, as in the measurement note
([2026-11-24-per-answer-cost.md](2026-11-24-per-answer-cost.md)). It played 8 answers per state (three right, one
wrong, the page's own mix of formats) after 2 of warm-up, each through the tap, the feedback, the deferred planning,
Next and its top-up. V8's precise coverage counted the invocations of every named function of the app's files
(anonymous callbacks are left out, so the true totals are higher), divided by the 8 answers. These are
**work counts, not timings**: they do not depend on the machine's load. They do depend on the questions drawn: two
runs on the fish 3,000 state gave 8.74 and 9.42 million calls. `store.get` and `store.set` were wrapped to count calls
and characters. One call of a few whole-state readers was timed (median of 15) for scale. Limits: one simulated player
and seed; signed out (the signed-in path is read, not measured: 1.4); no photo served; the simulated page never sends
(rule D1), so its anonymous queue (`reefid-anonq`) stays full where a real device online empties it.

### 1.2 The work of one answer, by state size

| State | U | V | T | R | Calls per answer | `introduced` | `scoreOf` | `store.get` calls (chars parsed) | Chars written |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fish, 50 answers | 11 | 69 | 1,625 | 65 | 0.32 M | 23,000 | 16,000 | 4,400 (0.3 M) | 0.06 M |
| Fish, 500 | 63 | 93 | 1,625 | 546 | 0.92 M | 94,000 | 39,000 | 7,900 (2.2 M) | 0.46 M |
| Fish, 1,000 | 75 | 116 | 1,625 | 888 | 1.24 M | 173,000 | 23,000 | 7,100 (3.2 M) | 0.88 M |
| Fish, 2,000 | 96 | 257 | 1,625 | 1,367 | 5.91 M | 1,050,000 | 59,000 | 11,000 (6.5 M) | 1.71 M |
| Fish, 3,000 | 136 | 333 | 1,625 | 2,043 | 8.74 M | 1,570,000 | 111,000 | 13,000 (7.0 M) | 1.76 M |
| Corals, 500 | 45 | 45 | 66 | 402 | 0.037 M | 600 | 360 | 510 (1.6 M) | 0.37 M |
| Corals, 3,000 | 45 | 45 | 66 | 605 | 0.035 M | 800 | 320 | 240 (4.6 M) | 1.31 M |

Read [measured unless marked]:

- **The state update itself is constant**: `scoreStep` 1 call, `domUpdate` (the bar's posterior) 1 call, at every row.
- **The fish work grows 27 times from 50 to 3,000 answers** while U grows 12 times and V 5 times; the corals do not
  grow at all. The product is in the code paths of 1.3, not in the history.
- **At 50 fish answers an answer already makes 320,000 calls**, nine times the corals' at 3,000: `progress.js`
  `achSnap` reads the level of every unit of the tree's sets (`lvStep` 4,700 calls per answer at every history length),
  and `sync.js` `sheetV` is read 4,200 times. That part depends on T alone.
- **Storage**: the corals' work is almost only this (their answer costs about 60 ms at 1× in the measurement note).

### 1.3 Every computation of an answer on the device

"Calls" are per answer at fish 3,000 [measured]. "Kept" says whether the value is read from stored state or made
again from the whole state each time it is read.

| Step (where) | What it computes | Kept or made again | Cost today | Calls |
| --- | --- | --- | --- | --- |
| Score (`quiz.js` `recordAnswer` → `core.js` `scoreAnswer`) | The three records touched: counts, the bar's posterior (`s.dp`, `s.ds`), the ability and the level's, pair counts, photos seen, times | **Kept**: updated in place | O(k + G + photos shown) | `scoreStep` 1 |
| A unit's bar (`core.js` `barOf`, `scoreOf`; `model.js` `genScore`) | `s.ds` less the unit's false-alarm rate | `s.ds` kept; **the rate made again**: `faOf` sums every other record's `conf` and `off` for the unit | O(U) a read by the scan; O(1) after one O(R) pass while the table is held (#1520), rebuilt 5 times an answer; O(U) outside a held handler | `scoreOf` 111,000; `faOf` 36,000; `faTable` 5; `faScan` 428 |
| The units in play (`app.js` `bonusList`, `pool`, `sciUp`, `shareFree`; `model.js` `cbPlay`) | The slate plus what each set brings: genera of families at Advanced, species met and next (`sciOpen`, `spPlay`, `sciPlay`, `lvlNext`) | **Made again** by each reader | O(T) to group a level's units by parent, then O(parents at their threshold × the level's units) for `lvlNext`'s count | `bonusList` 22; `lvlNext` 2,300; `introduced` 1.57 M; `GX` 208,000 |
| Exam entry (`model.js` `examOn`, `examLooks`, `lookLeft`, `matesLeft`) | Bar at the entry, pair coverage, group partners met | **Made again** per unit per reader; the reverse look-alike index kept for one microtask (#1521) | O(look-alikes) a unit on the slate; a unit with a look-alike off the slate reads `bonusList` | `examOn` 476; `examLooks` 42 |
| Levels (`model.js` `lvStep`, `level`, `shaky`) | The diver's ladder step from the bar and the exam entry | **Made again** | O(1) plus `genScore` and `examOn` | `lvStep` 4,700 |
| The draw (`model.js` `nextTarget`, `weighted`, `weight`, `drawW`, `shareW`, `sharesNow`) | Each met unit's weight, the rank share's caps | Weights **made again** per draw (they must be: see 4.3); the shares kept per answer by a key of their own | O(units met) a draw, plus `examOn` per unit; `sharesNow` asks `mayOpen` per unit, which for a circle-3 unit computes the whole tree's score | `weight` 221; `treeScore` 54 |
| The global score (`model.js` `headScore`, `core.js` `treeScore`; `progress.js` `showProg`) | The weighted mean of every tree entry's bars | **Made again** by the header pill (at every `save` and every `route`), the circle-3 gate, the achievements | O(T) bars a call | `treeScore` 54 |
| Opening (`quiz.js` `planPhoto`; `model.js` `openFresh`, `openPick`, `openChance`, `openPace`, `groupsNow`) | Whether and which unit opens | Intro map kept (parsed once); groups kept by a key of their own; the rest **made again** per planned question | O(V) a question | `planPhoto` 2 |
| Choices and photos (`model.js` `distractors`, `trapsFor`, `photoSet`, `examSet`) | The wrong choices, the photos | **Made again** per question (random draws: nothing to keep) | O(V) for the choices, O(photos of the unit) for the photos; `examSet` reads every photo ever shown (`shownAll`) | 2 questions |
| Comeback (`model.js` `rustNow`, `comebackOf`) | The rust since the last answer | State kept (`CB`); the units asked **made again** (`cbPlay` → `bonusList`) | O(V) plus one `bonusList` | `rustNow` 4 |
| Achievements (`progress.js` `achAfter`, `achCheck`, `achSnap`) | Counts of units by level over the slate, the core, the circles, each set, each taxonomic group | **Made again** after every answer | O(T) levels, several `bonusList`, one `treeScore` | `achSnap` 1 |
| Typed answer (`quiz.js` `typeMatch`, `typeNames`; `core.js` `treeTypeNames`) | The names a player may type | Kept under a key (the genera in play); made at the first typed answer of a visit and again when that key changes, every short name compared with every name | O(names²) a build: about 0.5 s at 4× in the profile | A build: about 96,000 `typeDist` |
| Settings (`sync.js` `sheetV`; `model.js` `startV`, `imrSaid`; `quiz.js` `tipsLoad`) | The sheet's version, the first-launch record | **Read from storage and parsed at every use** | A `localStorage` read and a `JSON.parse` each | `sheetV` 10,400; the start record 2,200 reads (2.3 M chars) |
| The answer queue (`quiz.js` `logAnswer`; `reefid-log0`, `reefid-anonq`) | The answers the sheet has not confirmed | **The whole array parsed and written again** | O(queue), signed out: two keys of 0.79 MB each at 2,000 answers, `reefid-log0` parsed 5 times and `reefid-anonq` once (4.7 M chars), each written once (1.6 M chars) | 6 reads, 2 writes |
| The progress (`app.js` `save`) | The subject's records as one JSON | Written whole | O(size of P): 185,000 chars, about 1 ms at 1× | 1 |

The remaining un-held scans [measured, CPU profile at fish 3,000 × 4×: `faScan` still 4.4% of the busy time]: `app.js`
`route` → `prog` → `showProg` → `headScore` (every Next, outside `faHeld`), and a typed answer's submit → `typeMatch` →
`typeNames` → the sets' units. A cache scoped to named handlers leaks at every entry point nobody wrapped.

### 1.4 The signed-in path

[read, not measured: every state above is signed out] `sync.js` `syncSoon` runs at each answer and writes
`reefid-account`, which holds the queue and a copy of each subject's progress as last sent (`SUBJECTS` `base`) and the
copy of the saved data for the light saves: several times the size of P serialised per answer. The save that follows
(3 s after the last change) builds the whole synced data three times (`progress.js` `progData`), parses each subject's
progress, computes the delta, and on a reply that carries another device's copy merges every record
(`core.js` `mergeProgress`) and refills P in place. None of it blocks the tap, but it runs on the main thread. To
measure before `sync.js` is touched, with a stub sheet (rule D1: `window.SHEET_STUB`).

### 1.5 The sheet's side

| Step (`tools/sync/Code.gs`) | What it reads | Cost | Measured |
| --- | --- | --- | --- |
| A save with answers: `logAnswers_` | Every answer id of the Answers tab, to refuse a double | O(all players' answers) | 0.85 to 0.93 s for 7,600 rows × 1 column [real sheet, Timings tab] |
| The same save: `hold_` (the opening hold) | The whole Answers tab, every column, then the player's rows folded from the first | O(all players' answers + H); its cache is dropped by any new row | 1.2 to 2.6 s for 7,450 to 7,680 rows × 27 columns (one read 5.1 s) [real sheet] |
| The full replay: `replay_`, `rplMake_` → `core.js` `replayProgress` (only when the app's rules version or structure stamp is behind, or after a refused save) | The player's rows since their reset, scored one by one by the app's scorer | O(H × (k + G)), plus O(U) at each miss (`keepsMark` → `faOf`); kept in the Replayed tab and reused only while the row count is the same, started again from the first row otherwise | 3,000 fish answers: 67 ms in Node here, 12% of it the scan [measured]; Apps Script is slower by a factor not measured |
| The leaderboard: `board_`, `boardWarm_` → `pctOf_` | Each player's bars over the scale | O(U²) a player by the scan | 136 units: 7.7 ms by the scan, 0.2 ms with the table [measured in Node] |
| The pooled statistics: `stats_`, `statsFold_` | New rows folded into a snapshot | **Already incremental** (Q123 option j, 2026-11-14): settled part, pending part, rebuilt when what was settled no longer holds, equal to the full build run for run (`tests/statsfold.test.js`) | 2 to 16 s a fold step, most 5 to 10 [real sheet] |

[real sheet, Timings tab, 2026-11-22; the script logs every operation over 5 s and samples the others] In three play
sessions nearly every save took 5.6 to 16.4 s, most 8 to 12 s, with 1 to 5 answers each. The two reads above are 2 to
3.5 s of that [read: a save with answers makes both]; the tab does not break down the rest. A save never blocks the
player, but the app spaces its saves by the sheet's time (`sync.js` `saveWait`).

So the replay engine is linear and cheap; what grows on the sheet is reading every player's log to find one player's
rows. That is the storage question of the professionalise study (a database behind a Worker at a measured threshold,
Q352), not this study's subject; section 4.7 says what this design gives the sheet meanwhile.

## 2. The original causes

1. **Derived on read, with nowhere to keep a derived value** [read]. The engine's cross-unit facts are plain functions
   of the globals `P`, `Q`, the intro map and the data, called wherever a value is needed. With the corals that was
   right: 45 units, one rank, 35,000 calls an answer. Nothing in the structure says where a derived value would live,
   who would update it, or when it stops being true, so none was ever stored.
2. **The pair counts are stored by row and read by column** [read]. `scoreAnswer` counts an offer or a mix-up on the
   record of the unit *shown* (`P[t].off[n]`, `P[t].conf[n]`: what `pairConf` and `mergeProgress` read). Since rules
   version 9 (the bar's signal-detection correction, #646, 2026-11-06) a unit's bar needs the sums over every other
   record for the unit *given* (`core.js` `faOf`). The column sums were never stored: the bar went from one field read
   to a scan of every record, and every loop over the units became a loop over the units squared without changing.
3. **A global question asked once per unit** [read, measured]. `lvlNext` counts the met units of a whole level once
   per parent (2,300 calls, each over 660 species: the 1.57 million `introduced`); `examLooks` asked for the units in
   play once per unit (fixed for most units by #1521); `sharesNow` asks `mayOpen` per unit, and a circle-3 unit's gate
   computes the whole tree's score (`treeC3`: 54 `treeScore` an answer). Each is a product of two sizes that are both
   small for the corals.
4. **Three features multiplied the sizes within a week** [read: `git log`]: species by common name (#975, 2026-11-17),
   species by scientific name (#1273, 2026-11-20), a level opening as a group, `lvlNext` (#1331, 2026-11-21). The
   fish tree reached 1,625 units (237 scientific genera, 659 species by common name, 662 by scientific name, under 65
   families in play), and every product above grew with it. Each PR was checked on values, not on work.
5. **No one signal that the state changed** [read]. Seven caches exist, each with a rule of its own: `sharesNow` and
   `groupsNow` (a key made of the subject, the answer count and `JSON.stringify(Q)`), `genusDiff` (emptied when the
   statistics load), the intro map (parsed once, changed in place), `lookRev` (one microtask), `typeNames` (four
   identities and a key), the false-alarm table (one handler). A new reader cannot ask "is my last result still true?",
   so the safe choice was always to compute again.
6. **Rule D9 read as "trust nothing kept"** [read]. D9 says the answer log wins over the device *when a replay is
   adopted*; it does not forbid keeping derived values. But the bug behind it (answers counted twice and kept for good)
   made recomputation the cautious default, and `sync.js` refills `P` in place at two points (an adopted replay, a
   merged copy: «In place: other code holds P by name only»), so a cache keyed by the object cannot see the change.
   #1520 therefore scoped the table to one handler: correct, and the reason it is rebuilt five times an answer.
7. **Settings read through storage** [measured]. `sheetV()` is a `localStorage` read and a parse; the species level's
   gates call it for each unit (10,400 an answer). The answer queue is one JSON array: adding an answer rewrites all of
   it.
8. **Nothing measured work** [read]. The 2026-11-06 engine reviews and the 2026-11-19 one-engine audit do not mention
   cost per answer; the 2026-11-18 architecture review lists "runtime performance on a phone" under "Not measured",
   and proposes progress as `fold(log)` with "the device's cache of the fold as an optimisation". The answers ledger
   holds one decision on the theme, Q123 (2026-11-14: the sheet's pooled statistics «built incrementally, per
   subject»), and rule L13 («Compute once, not on every phone», 2026-11-02) covers what the sheet or the build can
   compute for the app, not what a phone computes again within one answer. The simulator's run times were the only
   signal (REE-262), and the corals, the routine subject, cannot show it.

Not a cause: the model. The bar's posterior, the Elo steps and the exam are each O(1) per answer already. And not the
history itself: the device does not hold it (a signed-in device keeps only the answers the sheet has not confirmed).

## 3. How comparable systems do it

| System | Kept per item | What an answer does | What needs the whole log | Source |
| --- | --- | --- | --- | --- |
| SuperMemo SM-2 | An E-factor, the repetition number, the interval | «After each repetition modify the E-Factor of the recently repeated item»: the old value and the grade only | Nothing | [SM-2](https://super-memory.com/english/ol/sm2.htm) |
| Anki | `cards`: `due`, `ivl`, `factor`, `reps`, `lapses`; beside it `revlog`: «a review history; it has a row for every review you've ever done» | Updates the card's row, appends one `revlog` row; the next card is found by `due` | Statistics; refitting FSRS | [AnkiDroid database structure](https://github.com/ankidroid/Anki-Android/wiki/Database-Structure) |
| FSRS | Stability and difficulty (FSRS-7: two stabilities and a difficulty); retrievability «is computed from that state and the elapsed time» | New state from the old state, the elapsed time and the grade | Optimising the parameters on the review logs [from memory: the page fetched names its benchmark, not the optimiser's input] | [FSRS, the algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) |
| Duolingo, half-life regression | «a set of counters summarizing each student's practice history with each word»: times seen, right, wrong | Increments the counters; recall is read from them and the lag. Chosen as features «available in the production Duolingo system, without adding latency» | Fitting the weights, offline | [Settles & Meeder 2016](https://aclanthology.org/P16-1174/) §3.4 |
| Duolingo, Birdbrain | A learner's ability (V2: a vector of 40 numbers) and each exercise's difficulty | «a generalization of the Elo rating system». V1 «updated its models only once every 24 hours»; V2 updates the learner's state «within minutes» of each exercise, at about 1 billion exercises a day <!-- effort-ok: a quoted fact about Duolingo, not an effort --> | Nothing at answer time | [IEEE Spectrum, 2023](https://spectrum.ieee.org/duolingo) |
| Elo in adaptive learning | A skill per learner (per concept), a difficulty per item | «each player is assigned a rating, this rating is updated after each match»; «it can be easily used in an online setting», against IRT's maximum-likelihood fits | Nothing | [Pelánek 2016](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf) §1, §2.2 |
| Knowledge tracing (BKT) | The probability the skill is known | Bayes' rule on that probability and the answer, then the learning step | Fitting the four parameters | [Bayesian knowledge tracing](https://en.wikipedia.org/wiki/Bayesian_knowledge_tracing) |

Deep knowledge tracing (Piech et al. 2015) keeps a network's hidden state per learner and updates it per answer
[from memory, not fetched].

Around such a state, three general techniques:

- **Event sourcing** [read: [Fowler](https://martinfowler.com/eaaDev/EventSourcing.html),
  [Microsoft's pattern page](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)]. The log
  is the system of record; «an application state is purely derivable from the event log, you can cache it anywhere you
  like». Because «it's costly to read and replay events», applications keep *materialized views*, updated by a handler
  as each event arrives, and *snapshots*: «Snapshots are an optimization, not a replacement for the eventstream … you
  can regenerate snapshots from it at any time». Handlers must be idempotent («Track the last processed event sequence
  number»): rule D9's double counts are exactly a projection that applied an event twice.
- **Incremental view maintenance** [read: [PostgreSQL wiki](https://wiki.postgresql.org/wiki/Incremental_View_Maintenance)].
  A view is updated from the change to its base rows instead of being recomputed: «sum and count are updated by simply
  adding or subtracting delta value»; minima and maxima may need the base rows again. Counts are the safe class.
- **Incremental computation by revision** [read: [Salsa](https://salsa-rs.github.io/salsa/reference/algorithm.html),
  the engine under rust-analyzer]. «Each time you set an input, the revision is incremented»; a derived function's
  value is kept with what it read, and computed again only if one of those changed since.

**What carries over.** (1) The per-item state: we have it (`P[n]`: ability, the bar's posterior, counts), updated as
Elo and BKT update theirs. The lesson is not a new model. (2) Aggregates as counters updated by the change: the
false-alarm rate is a count grouped by the unit given, the textbook incremental view. (3) One write path, a rebuild
from the source at any time, a check that both agree: the sheet's `statsFold_` already works this way (Q123). (4) One
revision for the inputs, views valid for a revision: what our seven caches each approximate. (5) The log kept for
refits: FSRS refits its parameters on the review log as our rules versions replay the answer log (rules D5, D9).

**What does not.** A spaced-repetition app finds its next card with an index on the due date. Rule L1 forbids
scheduling by time, and our draw is a weighted sample over every met unit, whose weights all move with the global
level at each answer (`core.js` `levelMove`): there is no index to keep, and the draw stays a pass over the units met.
At a few hundred units and O(1) per unit that is the right algorithm.

## 4. Proposed design

### 4.1 Three layers, one direction

```
answer log ──fold──▶ records P ──one pass──▶ kept counters ──read──▶ views of one state version
(the sheet;          (per unit; exists;      (per unit, integers;    (units in play, bars, levels,
 rule D9)             scoreAnswer)            new, in core.js)        exam entry, tree score; new, app)
```

Each layer is a function of the one before and nothing else. Only the records are saved, synced and merged, as today.
The two new layers live in memory, are rebuilt from the records, and are never a source.

### 4.2 The kept counters (`core.js`)

- **What**: per unit n, `fa` (times n was given for another unit's photo) and `op` (times n was offered beside
  another unit): the column sums of the records' `conf` and `off`. The typed chances stay where they are
  (`P[LEVEL].tyk`, `s.ty`). `faOf(P, n)` = min(1, fa / (typed chances + op)): the scan's formula on the same integers,
  so the same bits.
- **Updated** by `scoreStep` at the two lines that increment a row (`core/ability.js`: `s.off[x]`, `s.conf[q.c]`),
  the only writers of those fields outside a merge [read: search of every `conf`, `off`, `ty`, `tyk` write]. O(k) per
  answer.
- **Rebuilt** in one pass over the records (the pass `faTable` makes today) at the first read after the records were
  loaded or replaced. O(R): 0.2 ms at fish 3,000 [measured].
- **Dropped** by whoever writes the records without the scorer: `sync.js` `replayAdoptS` and `mergeSubject`, the two
  that empty and refill the same object, call one `core.js` function (today's `faDisarm`). A reset, a subject switch or
  a load brings another object, which has no counters until its first read.
- **Checked**: `FA_CHECK` as today, on in every smoke page (`tests/facheck.js`), in the unit tests and in
  `tools/learnsim.js --facheck`: each read compared with the scan, a difference throws.
- **What it replaces**: `faArm` around each handler (`app.js` `faHeld`, #1520) and its five rebuilds an answer; the
  un-held scans of 1.3; the scan in the sheet's replay and leaderboard.

[measured, prototype in Node against `core.js`, the simulated player's whole 3,000-answer log replayed through
`scoreAnswer`] After every answer, every unit's rate and bar from the counters against `faOf` (the scan) and `barOf`:
408,000 rate reads (177,724 not zero) and 407,995 bar reads, **0 differences**; the counters rebuilt from the records
every 250 answers equal the kept ones; the replayed log gives the page's own pair counts for all 136 records. One pass
reading every record's rate at 3,000 answers: 5,125 µs by the scan, 211 µs by the table (built, then read), **28 µs**
by the counters; their update costs a few µs an answer.

### 4.3 One state version, one view per version (`app.js`, `model.js`)

- **One counter**, bumped by every write of an input, and only by those. The inputs are a short declared list: the
  records `P`, the quiz settings `Q`, the intro map and its offer, the first-launch record, the sheet's version, the
  photo statistics, the data in force (the tree, the curation). Their writers: `store.set` for the keys of that list
  (one test on the key, in one place), the scorer's caller and its own writes to the record (`quiz.js`
  `recordAnswer`: the exam, the learned mark, the times), the device's recalculations, the two sync refills, a subject
  switch, a data load. The other keys written at each answer (the queue, the comeback, the pending question, the
  achievements) are not inputs and bump nothing: a counter bumped by every write would be made again after each of an
  answer's 13 writes.
- **Views**: values that are functions of those inputs alone, computed at their first read in a version and reused
  until the next: the units in play (`bonusList`, `pool`, `sciUp`, `shareFree`, `cbPlay`), the met count of a level
  (`lvlNext`'s), each unit's bar, exam entry and level (`genScore`, `examOn`, `lvStep`), the tree's score
  (`headScore`), and the two that already exist with a key of their own (`sharesNow`, `groupsNow`). Each keeps its
  code; only when it runs changes. Lists keep their order, so every random draw that reads them draws the same.
- **Never a view**: anything that reads the clock (`rustNow`, the recall), a random number (the choices, the photos),
  or the planner's own short memory (`lastQs` in `weight`).
- **Not incremental, on purpose**. A view is recomputed whole, once, from O(1) reads, in today's order: no running
  floating-point sum is kept (`treeC3` compares an unrounded mean with a threshold; a sum updated by differences would
  round differently). Updating views by difference was weighed and left out: a typed answer moves the false-alarm rate
  of every unit of its rank, and every answer moves every unit's ability through the global level, so "the units
  touched" is often all of them, for a gain of microseconds (alternative E).
- **Static indexes**, made once per data load: a level's units by parent (regrouped today at every `spPlay` and
  `sciPlay` call), each parent's species order (sorted per call), the reverse look-alike index (#1521's, kept longer).
- **Checked**: a `VIEW_CHECK` like `FA_CHECK`: in the tests every reused value is computed again and compared, order
  included; a difference throws. This is the guard for the one real risk here, an input written without a bump.

### 4.4 Settings and the answer queue in memory (`sync.js`, `model.js`, `quiz.js`)

- The sheet's version, the first-launch record and the tips' record become variables, written through to storage and
  refreshed by the `storage` event when another tab writes them (the storage fix in progress).
- The queue of unconfirmed answers is held as an array in memory. First step: written whole as today, never parsed
  again. Second step, if Pierre agrees (6 a): stored in blocks of 50 answers, so an answer writes one small block.

### 4.5 What an answer costs then

| Part | Today (fish 3,000) | With the design | Why it cannot be less |
| --- | --- | --- | --- |
| State update | O(k + G) | The same | The model's own step |
| False-alarm rates | O(R) a rebuild × 5, O(U) a read outside a handler | O(k) an answer, O(1) a read | A counter per unit named |
| Units in play | 22 × (O(T) + parents × level) | Once per version: O(T), or O(parents + their children) with the static index | The sets depend on every parent's bar |
| Bars, levels, exam entry | 111,000 bar reads | Once per unit per version: O(V) | Each value is shown or drawn from |
| Tree score | 54 × O(T) | Once per version: O(T) | A weighted mean over the tree |
| The draw | O(units met) a question, each asking the exam entry again | O(units met) a question, O(1) a unit | Every weight moves with the global level |
| Achievements | O(T) levels and several unit lists | The same counts from the views: O(T) cheap reads | Counts over the tree's sets |
| Settings | 12,600 storage reads | 0 | |
| Queue (signed out) | 4.7 M chars parsed, 1.6 M written | 0 parsed; the same written (first step), about 20,000 a key (second step) | An answer must be durable before the next |
| Progress write | 185,000 chars | The same | One atomic write, under 1 ms |

[measured, one call at 1× on this machine, the table held, fish 3,000] The passes the design keeps, each run once:
see section 5's table. [guess] The fish answer then costs about what a coral answer costs today plus those passes.

### 4.6 How it stays the log's projection

- **Nothing new is stored.** A saved copy, a progress file, the sheet's Data column, the Replayed tabs,
  `mergeProgress` and `replayedOf` are untouched. No data format changes (so nothing here is costly to undo), no gate
  on the sheet's version (rule D4), and **no rules version** (rule D5): no value moves. A value that moved would be a
  bug caught by the checks, never a version to add.
- **A replay gives the same state by construction.** The counters are a function of the records alone; an adopted
  replay, a merge, a reset or a sign-in replaces or refills the records, drops the counters and bumps the version, and
  the next read rebuilds them from what the replay gave.
- **Every writer of the records has its rule** [read: every assignment to `P` and every write of `conf`, `off`, `ty`,
  `tyk`, `dp`, `ds` in the app's files and `core/*.js`]:

  | Writer | How it writes | The counters | The version |
  | --- | --- | --- | --- |
  | `core.js` `scoreAnswer` (from `quiz.js` `recordAnswer`, which a live game's answers take too) | In place: the records of the unit shown, the unit given and the level | Updated | Bumped |
  | `quiz.js` `recordAnswer` after the scorer (`s.ex`, `s.mx`, `s.ro`, `s.cor`, `s.du`), `model.js` `answeredAt`, `varRight` | In place: fields the counters do not read | Untouched | Bumped |
  | `model.js` `memRecalcAll`, `domRecalcAll`, `mxRecalc` (`s.pg`, `s.dp`, `s.ds`, `s.mx`) | In place: the same | Untouched | Bumped |
  | `sync.js` `replayAdoptS` (an adopted replay), `mergeSubject` (a merged copy) | The same object emptied and refilled | Dropped | Bumped |
  | `sync.js` `mergeSubject` on another device's reset (`P = R`), `app.js`'s reset (`P = {}`), `subjectLoad` and `inSubject` (read from storage) | Another object | None yet | Bumped |

- **The proofs**, each a test:
  1. `FA_CHECK` and `VIEW_CHECK` on in every smoke page and in `tools/learnsim.js --facheck`.
  2. A property test: random streams of answers (units, choices, typed, wrong, smaller faults), cut by merges
     (`mergeProgress`), adoptions (`replayedOf`), resets and subject switches; after each operation, kept = rebuilt =
     scanned.
  3. The replay's equality: the counters after playing a log answer by answer equal those rebuilt from
     `replayProgress` of that log.
  4. End to end: the same simulator seed gives a **byte-identical** saved state and `--out` file before and after each
     PR (the app world, fish and corals; the rated world's `--out`), as #1514 and #1520 did. It covers every draw and
     the order of every random number.
  5. A work budget: the calls per answer on a fish state of 2,000 answers, counted as in section 1, under a ceiling in
     CI, so the next units × tree loop fails a check instead of reaching a phone.

### 4.7 The sheet

- With the embedded core the replay and the leaderboard read the counters: speed only (the replay about 12% less, the
  leaderboard's % 7.7 ms → 0.2 ms a player at 136 units [measured in Node]). A `core/*.js` change, so
  `tools/sync_core.py --fix` and a changes file (rule D3); the sheet computes the same values.
- The save path's reads (1.5) take the `statsFold_` pattern: the hold kept per player and folded over the save's own
  new rows; the ids checked against the player's recent ones; a replay continued from the Replayed row when only rows
  were added (`replayProgress` already takes `start` and `since`). Not designed further here: it belongs with the
  storage decision (Q352), since a database gives the per-player index these three work around.

### 4.8 Alternatives

| | Design | For | Against |
| --- | --- | --- | --- |
| A | Go on memoising per handler (#1516's fixes 2, 4, 5 as planned) | Small local PRs; already under way | A cache and a rule per fix (seven today); leaks at every entry nobody wrapped (4.4% of scans left); the work stays readers × passes |
| **B** | **Counters in the scorer, one version and its views, settings in memory (this section)** | **O(k) + one pass; one invalidation rule; no format change; every value checked** | The version must see every writer: the check mode is mandatory |
| C | Store the derived values in the saved progress (`fa`, `op` per record) | No rebuild at load | The rebuild costs 0.2 ms: nothing to gain. Changes the saved format, the merge, the replay and the sheet: costly to undo |
| D | Progress as `fold(log)` everywhere, sync by answers (the architecture review's question g) | Removes the record merges and rule D9's class of bugs | Changes what the sheet stores and what a device holds; the exam and the cards are not in the log; does nothing for the cost per answer, which is already a fold step |
| E | Views updated by difference (dirty sets per unit, a tree of weights) | O(units touched) | Most answers touch every unit (the level, a typed answer); floating sums no longer bit-equal; much more code for microseconds (rule L11) |
| F | The planning in a Web Worker | The tap never waits for the planning | Does not reduce the work; the state must be copied or shared |

**Recommendation: B**, in the order of section 5. It is the smallest change that removes the class of problem: A
treats each case, C to E change more than the problem asks.

## 5. Plan

Lanes (rule W27): `core.js` with `Code.gs`, `model.js`, `app.js`, `quiz.js`, `sync.js` take one PR at a time each.
`core.js` and `Code.gs` are held by #1519 (waiting for Pierre). Every step is level 0 (rule L11: the same answers, the
unit tests and the CI smokes, no simulation needed to judge it; the byte-identical simulator state is its proof, not a
statistic). No rules version, no sheet gate. Agent time by the measured PRs of the same kind: #1520 (engine, 904
lines) 2.4 h, #1521 (engine, 250 lines) 1.7 h, #1514 (tooling, 201 lines) 33 min.

| Step | PR | Files (lanes) | Tests that prove equality | After it, at fish 3,000 |
| --- | --- | --- | --- | --- |
| 0 | The measure committed: the work counts of section 1 as `tools/answercost.js` (a slot guard, rule W24) and the fish ladder's states made by `tools/learnsim.js`; the budget check of 4.6 (5), first as a report | `tools/`, `tests/` (no lane) | Its own unit test on a small state | Nothing changes; every later step is measured the same way (about #1514's 33 min) |
| 1 | `lvlNext` counts a level's met units once (in progress, #1516's fix 2) | `app.js` | `spPlay`, `sciPlay` equal on saved states | Calls per answer 9.4 M → 1.3 M; `introduced` 1.7 M → 0.1 M [measured on its worktree, the table below] |
| 2 | Storage reads once (in progress, fix 5): settings and the queue in memory, written through | `quiz.js`, `model.js`, `sync.js` | Another tab's write refreshes the copy; an answer survives a reload at any point | Storage reads 12,600 → about 0; chars parsed 7.0 M → about 0 [guess from 1.3] |
| 3 | The state version and the first view: the units in play once per version, the static parent index, `VIEW_CHECK` in every smoke | `app.js`, then `model.js`, `quiz.js`, `sync.js` for the bumps (after 1 and 2 merge) | `VIEW_CHECK`; same seed, same bytes | `bonusList` 22 → at most 2 an answer [measured: the versions an answer makes, below] |
| 4 | Bars, exam entry, levels and the tree score as views; `achSnap`, `showProg`, `sharesNow`, `groupsNow` read them | `model.js`, `progress.js` | The same | `scoreOf` 111,000 → a few hundred; `treeScore` 54 → about 2 [guess] |
| 5 | The kept counters in the scorer; `faHeld` and its four call sites removed; the comment «the app and the sheet never arm» and LEARNING.md "Long rated runs" rewritten | `core/score.js`, `core/ability.js`, `core.js`, `Code.gs` (embed, changes file; **after #1519**), then `app.js`, `quiz.js`, `progress.js` | `FA_CHECK` everywhere; the property test and the replay's equality (4.6: 2, 3); `tests/faheld.test.js` becomes the lifetime's test | `faTable` 5 rebuilds → 0; no scan left anywhere; the sheet's replay about 12% less |
| 6 | Measure the signed-in path with a stub sheet; then the queue in blocks if Pierre agrees (6 a) | `sync.js`, `quiz.js` | No answer lost or doubled at any kill point | Chars written 1.6 M → about 0.2 M [guess] |
| 7 | The sheet's hold and ids by fold | `Code.gs` | As `tests/statsfold.test.js`: the fold equals the full read | With the storage decision (Q352) |

Steps 3 to 5 are each about #1520's size (2 to 2.5 agent hours, #1520, #1521). Step 5 does not depend on 3 and 4: it
goes when the core lane is free.

**The passes the design keeps, each once** [measured: one call at 1× on this machine, the false-alarm table held, so
each read of a rate is already O(1); `main` and the worktree of step 1]:

| Tree, fish state | Calls per answer | `introduced` | Units in play, once | Bars of the units in play | Exam entry of each | Draw weights of the units met | Level of every tree unit | Tree score | Progress JSON |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `main`, 1,000 answers | 1.39 M | 195,000 | 4.4 ms | 0.1 ms | 0.1 ms | 0.5 ms | 0.9 ms | 0.5 ms | 0.2 ms |
| `main`, 2,000 | 5.56 M | 998,000 | 11.0 ms | 0.1 ms | 10.8 ms | 11.9 ms | 11.7 ms | 0.5 ms | 0.6 ms |
| `main`, 3,000 | 9.42 M | 1,708,000 | 7.4 ms | 0.2 ms | 15.7 ms | 15.7 ms | 15.1 ms | 0.5 ms | 0.5 ms |
| Step 1, 1,000 | 0.72 M | 59,000 | 2.8 ms | 0.1 ms | 0.1 ms | 0.5 ms | 0.7 ms | 0.5 ms | 0.2 ms |
| Step 1, 2,000 | 0.95 M | 79,000 | 3.5 ms | 0.1 ms | 3.9 ms | 4.7 ms | 4.8 ms | 0.9 ms | 0.3 ms |
| Step 1, 3,000 | 1.34 M | 103,000 | 2.0 ms | 0.2 ms | 3.8 ms | 4.6 ms | 4.5 ms | 0.5 ms | 0.5 ms |

"Step 1" is the worktree of the `lvlNext` fix in progress (its commit 166e5f8c, read only): **the calls per answer at
3,000 answers fall from 9.4 to 1.3 million** [measured; the corals' are 0.035 million].

Read: the bars of every unit in play cost 0.2 ms once a rate is one read. The exam entry, the weights and the levels
cost 11 to 16 ms on `main` at 2,000 and 3,000 answers against 0.1 to 0.9 ms at 1,000: the size of one or two more
computations of the units in play, which `examLooks` asks for when a look-alike is off the slate [guess, supported: on
the step-1 tree those three passes shrink as `bonusList` does, 15.7 → 3.8 ms for 7.4 → 2.0 ms]. With the view they
would cost about what they cost at 1,000 answers [guess]. So the engine's work for one state version is about one
computation of the units in play (2 to 3.5 ms after step 1) plus 2 to 3 ms [guess from these passes], against 22
computations of the units in play and the rest of 1.3 today.

**How many versions an answer makes** [measured: `store.set` and the scorer wrapped in the page, 12 answers on each of
the fish 1,000, 2,000 and 3,000 states and the corals' 3,000]: one scored answer and one write of an input (the
progress) per answer; an answer's 12 other writes are not inputs. So a view is computed at most twice an answer, where
`bonusList` runs 22 times today. Its value changed after 1 of the 36 fish answers and none of the 12 coral ones; the
headline % changed after none of the 48.

**The whole answer** [guess, to be re-measured at each step with step 0's tool]. Today at fish 3,000 an answer costs
the main thread about 0.5 s at 1× and 1.5 to 2.2 s at 4× (#1520's table before #1521; the profile run after it, median
of 6: 1.5 s at 4×). With steps 1 to 5 the engine's part is two versions of about 5 ms each at 1×; what is left is what
a coral answer costs today (60 ms at 1×, 300 ms at 4×: storage and the page's drawing), and step 6 takes most of the
storage out.

**What becomes of the memoisation fixes.**

| Fix | In the design |
| --- | --- |
| #1520 `faHeld` (the table held per handler) | **Replaced** at step 5 by the counters that live with the records; `FA_CHECK`, its smoke wiring and learnsim's `--facheck` are **kept** as the check mode |
| #1521 `examLooks`' reverse look-alike index | **Kept**; its one-microtask life becomes "once per data load" at step 3 |
| `lvlNext` counted once (in progress) | **Kept**, then absorbed at step 3: the count becomes a view of the version |
| Storage reads cached (in progress) | **Kept**: it is step 2 |
| #1516's fix 4 (one list of the units in play per task) | **Replaced** by step 3's view, whose rule is the version, not the task |
| `sharesNow`, `groupsNow`, `typeNames` keys | **Replaced** by the version at steps 3 and 4 (three private rules fewer) |

## 6. Questions for Pierre

Nothing in the recommended design needs his decision to start: no data format, no player's record, no rule, no visible
change but speed. These choices are his:

- **(a) The device's answer queue stored in blocks** (step 6). It holds answers not yet in the sheet, so it touches
  players' records and needs a one-time move of the queue on each device. Gain: the last megabyte written per answer.
  **Recommendation: yes, last and alone**, after the signed-in path is measured, with a test that kills the page at
  every point of the move. Not needed for the rest.
- **(b) The target.** #1516 used "about 100 ms". **Recommendation**: on the heaviest simulated state (fish, 3,000
  answers) at 4× CPU, the feedback within 100 ms of the tap and the whole answer's work under 400 ms, re-measured
  after each step; and the work budget of 4.6 (5) as the routine guard.
- **(c) The heavy subject in the routine checks** (suggested on REE-263, not decided): a long fish state checked in
  CI for work per answer. **Recommendation: yes**, as step 0's budget: the corals cannot show this class of problem.
- **(d) A real phone and a real history.** Everything here is one simulated player on a throttled desktop CPU. The
  real log holds about 7,600 answers in all [real sheet], so no real player is near 3,000 fish answers yet.
  **Recommendation**: the app times its own answers (tap to feedback, the planning) and sends one median per visit
  with the visit's summary it already sends: a number, no content. It is new data about a device, so his call.
- **(e) The sheet's save path** (step 7): fold it now in `Code.gs`, or leave it to the storage decision (Q352).
  **Recommendation: leave it**, unless saves over 10 s become a problem for players before then.

## 7. Scripts and what was not done

The scratch scripts stayed outside the repository (the per-answer note's harness and saved states, a call counter by
V8 coverage, a counter of the state versions, the counters' prototype against `core.js`, a replay timer): step 0
commits the useful part. Every Chromium run and timed Node run took the machine slot (rule W24), each under the
40-minute cap. Not done: a measure on a phone or on a real player's state; the signed-in path; a prototype of the
views (their gain is estimated from single passes and the versions counted, section 5); timings of a whole answer
after each step (the work counts are exact, the times are the per-answer note's); the sheet's time broken down beyond
its Timings tab.
