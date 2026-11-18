# Species by their scientific names, fish and sea slugs: the plan of step 2

**Status: plan, docs only, every question answered (Q394-Q398), ready to build.** Written on 2026-11-17 in the
evening, Manila time, on `origin/main` at 444d4e61, the day #975 (step 1, sheet script v161) was merged. Pierre answered
on 2026-11-17 in the evening and on 2026-11-18 in the morning; the answers are recorded where each question stood
(section 3) and folded into the design (section 2), the check (section 4) and the order of PRs (section 5). No
simulation was run and nothing is built by this plan; its first build PR is the sheet PR of section 5. The few numbers
below are counts and sizes read from the data files in seconds, those of the fish genera updated for #1067 and #1074.

**Two independent trees** (Pierre, 2026-11-18 ~09:17: "Ce sont 2 arbres pédagogiques indépendants"): the common-name
tree (families → species) and the scientific tree (genera → species) are of equal rank, each with its own progress and
its own switch; neither is the base of the other. Every choice below keeps to that: a scientific species hangs from its
genus, a common-name species from its family, and what one tree shows of the other's names is information, never a
dependence.

**Step 2** is branch B of the fish path ([FISH_PATH.md](../FISH_PATH.md) "Levels"): a species asked by its
**scientific name**, the name-display schedule's steps 2 to 4. The sea slugs' species level is the same step: their
genera are already the units, they use scientific names only, and their species would hang under the genus units. So
one design serves both subjects, on the engine as it is (rule S1: no subject named in the code).

**Why it was planned before it was built, for the sea slugs either.** Built for the sea slugs first, it would have fixed
four choices that the fish then inherit, each costly to undo: the key that stores a scientific name's progress on
devices and in the log (Q398), what a species' scientific name hangs from (Q397), how a half-right typed answer counts
(Q394) and whether a species has an exam (Q395). All four are now decided, and the names choice (Q396) with them. The
check is planned here to fit Pierre's limit on machine time (section 4).

## 1. Decided already (not asked again, rule W7)

The French quotes are Pierre's own words; the English ones are FISH_PATH's and LEARNING's record of his decisions.

**The path and the names**
- **A tree** (Pierre, 2026-11-04, later): trunk the families; branch A the species by common name; branch B the
  scientific genus names, "then the species scientific names". A player goes along one branch or both, by the names
  they chose (FISH_PATH "Levels").
- **Latin comes in progressively, tied to the common name first** (2026-11-03): "start with family names, then common
  names, then scientific names" (his ReefRecall design, June 2026).
- **The name-display schedule** (2026-11-04), for a player learning both names: (1) common + scientific underneath, (2)
  scientific + common underneath, (3) scientific only, (4) typed scientific. "As a difficulty that rises with the
  species' progress, like the typed share, never as an on/off mode." A player learning one kind sees only that one. The
  thresholds start from simulation, and later, with many answers, are "computed automatically per species" from the
  measured difficulty of each name (open question 2, answered 2026-11-04).
- **The names choice** (2026-11-04): the player chooses "at the fish welcome and any time in ⚙: common names,
  scientific names, or both". "I'm at IMR" means both, scientific names early ("the adaptive difficulty still holds them
  back"). One score scale for everyone. Where it lives changed on 2026-11-18 (Q396, section 3): a per-subject "What I
  learn" card, no longer ⚙.
- **Wording** (2026-11-04): player-facing text says "scientific name", never "Latin".
- **A right genus is partial credit** (2026-11-04): typing only the right genus where a species' scientific name is
  asked "is genuine partial learning". How much: "by simulation".
- **A common name typed where the scientific name is asked** (2026-11-04, open question 3): "it counts, as half a
  fault"; "it must not be gameable": "typing common names must never advance the scientific-name progress". To study
  before building.
- **The exams** (2026-11-04, open question 5): "to be rethought": an exam per species or per family? His idea: "a
  family's exam is about 20 questions on only the hard fish of that family, answered directly with the scientific name".
  Answered on 2026-11-18 (Q395, section 3): a family exam at species level kept by a hidden checklist, and an ultimate
  exam.
- **The milestone** (2026-11-04): a card at the first scientific name ("You've unlocked scientific names: questions of
  this kind start coming").

**Units, shares and levels**
- **One unit per species** (Q362, 2026-11-15) for its common names; the main name fills it (Q376 (b)); two species may
  share a common name (Q381).
- **The rank share** (Q382, 2026-11-16 ~15:05): "je serais plutôt ouvert à une stratégie qui règle finalement la
  répartition des questions, soit au niveau de la famille, du genre ou de l'espèce, en fonction de la maîtrise justement
  des niveaux précédents" (`model.js` `SHARE`, docs/LEARNING.md "The rank share").
- **One mechanism** (Q384, 2026-11-16 ~15:10): "un mécanisme global ... une répartition des questions en fonction des
  niveaux et du niveau de maîtrise".
- **One rule for ranks and variants** (Q391, 2026-11-17 10:52: "Q391 a oui, b oui"): whatever depends on something
  comes as that thing is mastered (C0: #975's cap for the ranks, each unit's juveniles and phases on its own mastery);
  "Learned" needs a right answer on each variant group, done by the exam
  ([levels-and-shares study](2026-11-17-levels-and-shares-study.md) §10; #953 rebuilt on it).

**The score** (Q242, Q257, Q258, Q262, 2026-11-08)
- A species' scientific value S = max(its scientific name's bar, ½ × its genus's bar); its credit a·C + b·S + (1 − a −
  b)·C·S; a species with no common name has credit S (Q258), so 100% stays reachable.
- "A species is named in Latin once its scientific name's bar reaches Advanced" (Q262).
- The achievements waiting for this step (Q259-Q264): fspsci1, fboth25, fdauin20, fpct70 and fpct100 ("Fish god").

**The sea slugs**
- **Scientific names only** (Q369, 2026-11-15); the English names are information, "never as a choice" (2026-11-17).
- **The genera are the units** (2026-11-16: "c'est au niveau des genres"); the species "after the fish species level"
  (ROADMAP "More subjects").
- **Q389** (2026-11-17): (1) a genus-level photo plays for its genus ("les observations au genre bien identifiées ...
  deviennent des photos des genres du jeu"); (2) *Goniobranchus* sp. 5 yes, the other "sp. N" wait for a published name.
- **Q390** (the sea slugs' look-alikes) is still open; this design reads its answer and does not ask it again.

**Machine time** (2026-11-17): the 10,000-answer check was dropped (10:40, after Pierre asked what long simulations add
on subjects with little or no real data), and "6h de calcul ne devrait JAMAIS arriver".

## 2. The design

### 2.1 One kind of unit: a species by its scientific name

One unit per species in a family in play, every species (a scientific name always exists, unlike a common name), built
from one list for both subjects: `core.js` `fishSpUnits` generalised with a kind (`'cn'` today, `'sci'` new), read by
`app.js` (the units) and the sheet (`fishReplayGen`), as step 1 does. The kinds, their key prefixes, ranks and parent
levels sit in **one central levels table in `core.js`** (Q398, the integrator's call), which the units, the share, the
replay and the score tree all read, so a level is data and no reader repeats a test on a prefix. Each record:

| Field | Value |
| --- | --- |
| id | `sci:` + the species id in letters and digits only (Q398): `sci:s091`, `sci:s119434`, `sci:xgoniobranchussp5` |
| rank | `species` (logged as such); a field for the name kind keeps a question's choices and typed answers among the units of its rank **and** kind, so a scientific question never shows a common-name label, nor the reverse |
| parent | its genus unit, in the scientific tree (Q397, now that every circle's genera are units) |
| from | its parent: a species never answered starts from that unit's ability (`core.js` `abilityOf`, as step 1) |
| look | the other species units of its family, same kind (its traps once answered right, rule L7) |
| name / sci | the PDF name (fish) or the WoRMS name (sea slugs); the typed names: it, the WoRMS name `now` and the synonyms (rule S2) |
| views | its family's photos of that species (fish), its genus's (sea slugs); never a genus-level photo (`gl`) |

Counts: fish 662 species in play (471 of them under a circle-1 scientific genus, 191 in circles 2-3, 3 with no common
name); the genus units are now 237 (130 of circle 1, 107 added for circles 2 and 3 in #1067, their content in #1074), so
every species in play has a genus unit above it (Q397; the two surprise-card families' species are never asked). Sea
slugs: 206 species (205 named and *Goniobranchus* sp. 5) under 78 genera.

### 2.2 `core.js` `SUBJECTS`: what a subject says

- **`names`** (new): the kinds of name its species are asked by: fish `['cn', 'sci']`, sea slugs `['sci']`. A kind not
  listed has no units: the sea slugs get no common-name branch from data, not from a test on their id.
- **Its gate** (rule D4): a subject whose sheet replays its progress and ranks its board (`replayed`: the fish) opens the
  scientific species only once the sheet replays them (a `SCI_SHEET` version in `sync.js`, beside `SPECIES_SHEET`). A
  subject with no replay and no board (the sea slugs: `replay: false`, no `replayed`, no `board`) needs no gate.
- Nothing else is new: `unitRank` already says where the units start (the sea slugs' genera), `sheets` already names
  the species sheet's prefix.

### 2.3 Opening and the share (C0)

- **When**: a species' scientific name may open once its parent, its genus, is at Advanced (C0's step for the ranks; a
  lower or higher threshold per taxon is data, `shareAt`), through the usual opening: rule L4, `OPEN`, its card,
  `introHold`. It never waits on the common-name tree (two independent trees). A turned-on level comes the same way, by
  C0 and no sooner (Q401 A, section 3). **Evidence on a locked unit**: live answers and the placement test count as
  evidence on a scientific species still locked, without opening it (rule L4's new line, rules PR #1086).
- **Which next**: its parent's species met, then the next one, in order: the fish's family list (commonness, `cmi`)
  filtered to the parent; the sea slugs' genus list (`seaslug.json` genera `species`, the circles' popularity order).
  `app.js` `spPlay` already does this for a family; it reads the parent instead.
- **How often**: `model.js` `SHARE` unchanged. The new units hang from their parent's level: the fish's from the
  `genus` level (every circle, Q397), the sea slugs' from their genus units' level. That level's
  children take at most m² of the questions, m the share of its units in play at Advanced. Measured in the code, not
  run: `shareLv` already reads a sea slug genus as a level (its rank is the subject's unit rank), so the sea slugs need no
  change there; their genera themselves still hang from nothing.
- **Which players**: the fish's through the names row of the "What I learn" card (Q396, Q404 A): the scientific species
  come with the scientific-names row on, as the genera do; a row turned off keeps its bars and the same score scale
  (Q402 A). An IMR player's IMR genera stay free of the share (`app.js` `shareFree`, Q219), their species do not.
  Every sea slug player.
- **Juveniles and phases** of a species (C0's variant part, the #953 rebuild): on its scientific unit as on any unit. One
  sea slug species has juvenile photos (*Hexabranchus lacer*, 5).

### 2.4 The question

- **Choices**: four scientific species names, wrong ones harder gradually (rule L7): other groups or families first,
  then the same family, then the same genus, then the player's own mix-ups. Never two of one label (`model.js`
  `choiceApart`).
- **Display** (the schedule, on two units): step 1 is the common-name unit's question as built in step 1 (the
  scientific name in small type). Steps 2-4 are the scientific unit's, by **its own bar**:
  - below Open Water: the scientific names with the common name underneath (fish, a player learning both; the common
    name is information there, the scientific tree does not wait on it);
  - from Open Water to Advanced: the share of "scientific only" rises from 0 to 1;
  - typed: the usual typed share (`TYPED`) on the scientific unit's bar.
  A player learning scientific names only, and every sea slug player, sees the scientific names alone. These are
  starting values (the integrator's, easy to change in data); the per-species values come later from real answers, as
  decided.
- **Feedback**: both names for the fish; for the sea slugs the scientific name, with the English name as information
  after the answer, as on a genus question today.
- **Typed answers**: the accepted names above, the usual spelling tolerance (`core.js` `typeMatchIn`); a common name or
  the genus alone: Q394 A.
- **The log**: the unit asked (`sci:s091`), rank `species`, the name shown in "Taxon shown", and the display in the
  mode's suffix (for example `|sc` scientific with common, `|so` scientific only) and Q394's mark. Read against
  `tools/sync/Code.gs` `logAnswers_`: its patterns for the unit, the Choices and the mode take letters, digits and
  colons, so `sci:s091`, `sci:s1263433` and `sci:xgoniobranchussp5` should pass them with no sheet change; the sheet
  PR's test checks it (section 4).

### 2.5 What an answer feeds (rule L2)

As step 1: a wrong pick inside the same family counts against both species' scientific units, never against the family
or the genus; a right answer counts on the species' scientific unit only. A scientific answer never moves the
common-name unit, nor the reverse (one answer, one unit). A wrong pick in another family counting against both families
stays out, as in step 1 (#892), for both kinds.

### 2.6 Score, replay and leaderboard (the fish only)

- **Score**: `core.js` `fishScoreTree` with the scientific level on puts each species' `sci:` unit in the scientific place
  of its entry (today `''`), and gives every species its own entry, the 3 with no common name included (names `null`,
  credit S, Q258).
- **Measured**: the leaderboard's tree is 25,753 characters today with the common-name units (660 entries); with an
  `sci:` unit in every entry, 29,707 (measured before the 107 genera of #1067 joined the tree, which add their own
  entries: re-measured in the sheet PR, with its test): under the sheet's limit of 50,000 (`Code.gs` `BOARD_TREE_MAX_`, kept in chunks since
  v143) and its 1,500 entries. No change to the board's storage.
- **Replay**: `core.js` `fishReplayGen` lists the `sci:` units (look, family line, from), so the sheet replays them and
  makes the board's tree with them (`fishBoardTree`); new cache keys (as v161 moved to `sgen3`, `stree2`). Q394's mark,
  if it changes how an answer counts, is read by the replay under a new fish rules version (`FISH_RVS`).
- **Achievements**: fspsci1, fboth25 and fdauin20 on the scientific bars at Advanced (Q262), fpct70 on the score;
  fpct100 needs the ultimate exam (Q395). My progress's "Scientific name: M" counters and the third bar are already in place.
- **The sea slugs** have no score tree, replay, board or achievements: their species level touches nothing on the sheet,
  and their progress merges per device as today.

### 2.7 Where the sea slugs differ

1. **No common-name branch** (Q369): `names` `['sci']`; their English names stay information.
2. **The species with no name yet**: *Goniobranchus* sp. 5 (`tools/seaslug_informal.json`, id `x:goniobranchus-sp5`,
   Soong et al. 2020). Its key drops the hyphen and the inner colon (`sci:xgoniobranchussp5`), so it stays a plain run of
   letters and digits after the prefix. Its label is the data's, so when it is described only the label changes, never
   its progress. Typed: "Goniobranchus sp. 5", "sp 5" and "sp5" forms. The log's "Species shown" pattern (`Code.gs`
   `logAnswers_` `SP`) refused digits, so an answer on one of its 12 photos logged that column blank; that was fixed
   apart from this plan, in sheet script v170 (#1053).
3. **Genus-level photos** (`gl`, 537 in `seaslug-game.json`): they name no species, so they stay the genus unit's photos
   only, never a species unit's, and no species line follows the verdict (`app.js` `fishTaxon`, as today).
4. **Species pairs**: `tools/seaslug_lookalikes_cand.json` holds 186 species-rank candidate pairs (29 across genera, 87
   with a literature source) and 81 species groups, candidates only. They enter by Q390's answer (its option D: the
   specialist-sourced ones declared, the iNaturalist-only ones as data). Until then a species' traps are its family's
   other species, as the fish's.
5. **One-species genera**: 36 of the 78 genera hold one species in the game. Their species stay units: what the player
   learns is the second word, which the typed share tests; their traps come from the family's other genera.
6. **No sheet gate**, so the sea slugs can be on as soon as the app PR merges, before the fish's sheet version.

## 3. Questions for Pierre, answered

All five are answered (2026-11-17 evening and 2026-11-18 morning, Manila time). Each keeps its context and options as
asked, then its decision with his words.

### Q394. A common name, or the genus alone, typed where a scientific name is asked

**Decision: A** (Pierre, 2026-11-17 evening: "A"). Both are smaller faults on the species' scientific name, never a
gain. The sizes (half a miss, a quarter) are starting values, read on the real answers later.

**Context.** Decided 2026-11-04: a common name typed there is half a fault and must not be gameable; the right genus
alone is partial credit, its size "by simulation". The engine reads every answer as right or wrong (`core.js`
`eloStep`, `pgStep`). A half that counts as a result of 0.5 would raise the bar whenever the app expected less than
0.5, so typing genera or common names would advance the species. And the simulated players never type a common name or
a genus alone: no simulation can size either.

- **A**: both are smaller faults on the species' scientific name, never a gain: a common name is half a miss, the
  genus alone (or with a second word no game species has) a quarter of a miss. Another species' full name of the same
  genus is a mix-up, a full miss, as a wrong pick. The feedback shows the scientific name. The sizes are starting
  values, read on the real answers later.
- **B**: A, and the genus alone also counts as a right answer for that genus's own question. More credit, but one
  answer then moves two units, and the log and the replay must say so.
- **C**: graded results (for example 0.5 for the genus alone) on the species. Closest to "partial credit", but
  gameable without one more limit.

*Recommendation was A, and A it is.* It can never raise a scientific bar, and the genus is already credited by its own
questions and by the score (S counts half the genus's bar).

### Q395. Species exams (open question 5)

**Decision: neither A, B nor C as proposed: species exams of two kinds** (Pierre, 2026-11-17 evening and 2026-11-18
morning).

1. **A family exam at species level**, kept by a **hidden checklist**, one box per species.
   - A box is **ticked in ordinary play** by a right answer on a first-seen photo, once the species is at Advanced.
   - The hidden exam asks **only the remaining boxes**, **at least 3 questions**.
   - A miss **unticks** the species, which then needs **2 right in a row** to tick again.
   - **No threshold** on the number of boxes (Pierre: "bonne idée").
   - For the sea slugs the same exam runs per genus (their units' rank), and a species' box is per name kind it is
     learned by: the integrator's call, easy to correct.
2. **An ultimate exam**: **100 to 200 questions, 95% to pass, hard but recognisable photos**; it is **the only way from
   99% to 100%** (Pierre: "oui"). It carries fpct100 ("Fish god").
3. **Exams may reuse seen photos when needed**, where the unseen ones run out.

This replaces the per-species exam of option A and the 20-question family exam of option B; Q391 (b)'s variant photo
rides on the same exams. The exams are built after the #953 rebuild (section 5).

**Context as asked.** A species unit has no exam today, so its bar stops at 95%. Without an exam, no species is ever "Learned",
100% fish ("Fish god") cannot be reached, and Q391 (b) ("Learned" needs each variant group, done by the exam) has no
exam to work through. This holds for the common names already in play, and for the sea slugs' species.

- **A**: per species, the exam every unit already has: 5 hard photos never seen, slipped in unannounced, at least 2
  typed, a miss restarts it; one for each name the species is learned by (the scientific one all scientific), with Q391
  (b)'s variant photo. No new mechanism.
- **B**: per family (sea slugs: per genus), your idea: about 20 questions on its hardest species, typed scientific
  names. A new mechanism: one exam deciding many units, and what it gives a species not yet at Advanced.
- **C**: no species exam: a species at the top of its bar counts as learned. Simplest, but "Learned" rests on the bar
  alone.

*Recommendation was A*, and his family exam later as one of the harder "hunt" achievements (2026-11-04); he chose his
own family exam, at species level, with the checklist above.

### Q396. The names choice: for players who already play

**Decision: neither A nor B as asked: the choice becomes a per-subject "What I learn" card, not a ⚙ setting** (Pierre,
2026-11-18, on where it lives: "il faudra que ça soit facilement visible et accessible pour les joueurs"). The card's
study is #1071 (docs, answered), and its answers rule here:
- **Q400 D**: the card lives on My progress, and a Home line opens it.
- **Q401 A**: a row turned on means allowed; each part comes as its parent reaches the usual threshold (C0), never
  sooner.
- **Q402 A**: a row turned off is kept: the level stops being asked, its units keep their bars, the score keeps one scale.
- **Q403**: no switch for juveniles and phases (variants are required, only delayed).
- **Q404 A**: every names row can be turned off, a families-only player allowed; the two trees are independent.

So the names rows (common names, scientific names; "I'm at IMR" still both) live on the card of the fish subject, the
sea slugs' card has its scientific row only, and ⚙ loses its "Scientific names" row. Players who already play keep what
they have (common names on, scientific names as now), with no new card: the card is how they reach the rest.

**Context as asked.** Decided: the choice at the fish welcome and in ⚙ (common, scientific, both; "I'm at IMR" = both). The plan:
one setting with those three answers, turning on or off the species by common name (on for every fish player today)
and "Scientific names" (today's set: the genera, now their species too). At the welcome it is a second step after "How
well do you know reef fish?", skipped for "I'm at IMR". In ⚙ it replaces the "Scientific names" row. The card at
Advanced still offers scientific names to a common-names player, and never locks the setting (2026-11-08).

- **A**: players who already play keep what they have (common names on, scientific names as now), with no new card.
- **B**: they are asked once, with one card at their next visit.

*Recommendation was A*: the Advanced card and ⚙ already reach them. The sea slugs have no choice (scientific names
only).

### Q397. What a species' scientific name comes after

**Decision: C, done** (Pierre, 2026-11-18 ~06:32 Manila: "lance"): the scientific genera of circles 2 and 3 are added
first. **Built and merged in #1067** (107 genera, 237 in all; sheet script v176, the app's gate `GENERA_SHEET`), **their
content in #1074** (a presentation for all 107, ID marks for 77). A species' scientific name therefore hangs from its
genus for every fish species in play and every sea slug, and with two independent trees (Pierre, 2026-11-18 ~09:17) the
common name is never its parent. Option A's "the two stay tied" and option B's table are dropped.

**Context as asked.** Q391's rule: a level comes as the unit it depends on is mastered. The study's table had, for the fish, "its
common-name unit (both names) or its genus (scientific names only)". Measured: the fish's scientific genera exist for
circle 1 only (130 genera, 471 species); the 191 species of circles 2 and 3 have no genus unit. The sea slugs have
genus units only.

- **A**: the nearest unit above it in the game, for every player: its genus where the game has one (fish circle 1,
  every sea slug), else its family (fish circles 2 and 3). A player learning both names sees the common name under
  the scientific ones, so the two stay tied.
- **B**: the study's table: after the common name for a player learning both, after the genus for a scientific-only
  one. The unit it depends on then changes with the player's setting, and the sea slugs need A anyway.
- **C**: A, after first adding the scientific genera of circles 2 and 3 (up to 109 more genera, a step and a check of
  their own).

*Recommendation was A.* Its cost, which stays: a player learning both may meet a species' scientific name before its
common name, when its genus is mastered first.

### Q398. The key of a scientific name's progress (plain OK)

**Decision: the integrator's call** (Pierre, 2026-11-18: "C'est un détail d'implémentation"), made as follows: the key is
**`sci:<species id>`** (letters and digits after the prefix: `sci:s091`, `sci:xgoniobranchussp5`) and **one central
levels table in `core.js`** says each level's prefix, rank and parent, read by every part that builds or reads a unit.
It is option A's idea with the prefix `sci:` in place of `l:`, which reads at a glance as the scientific name and cannot
be mistaken for a common-name `s:` key.

**Context as asked.** The key is stored on devices and in the log, the replay and the leaderboard, so a later change is a
migration. `s:s091` is taken by the common names.

- **A**: `l:` and the species id in letters and digits: `l:s091`, `l:s119434`, `l:xgoniobranchussp5`. It passes every
  pattern of the log and the board (measured).
- **B**: `s:s091:sci`. It reads as the species, but the code that reads `s:` as the common-name unit (the score tree,
  the board) would need a second test everywhere.

*Recommendation was A* (as `l:`); the integrator settled on `sci:`, above.

## 4. The check plan (rule L11)

**The level**: 2 for the build PR (it changes the opening, the draw and the score of every fish player with scientific
names on). The PR declares it, then trims the level-2 recipe to fit **about 40 minutes of machine time in all**, as
below. Every cut is stated with the power it gives up.

| Part | What runs | Runs | Machine time |
| --- | --- | --- | --- |
| Unit tests and smokes | both subjects (below) | the CI | the CI's usual |
| Identity | the corals, and the fish with the scientific level off, give byte-identical runs to `main` (app world, 1 seed × the profiles × 300 questions) | about 10 | 3 minutes |
| Rated world | fish, 3 profiles (lecture RA, strong RA, expert) × 10 seeds × 3,000 answers, normal photos, `main` and the branch on the same seeds | 60 | about 30 minutes on 2 workers (35 s a run measured without the species, 2026-11-15; the first run is timed, and if it takes over a minute the seeds go to 8 before any run is read) |
| App world | fish, the same 3 profiles × 3 seeds × 600 questions, both arms (a GitHub runner, `learncheck.yml`) | 18 | about 6 minutes |
| Real log (rule L12) | a log with no `sci:` row replays exactly as before; the species rows of step 1, read per player | - | 2 minutes |

- **Declared before running**: the primary is the scientific genera at Advanced at 3,000 answers in the rated world
  (the level the new units take questions from), a claim of no harm read as a guardrail with the families' margin (−2 or
  −5%, the larger). Guardrails: the families at Advanced at 1,000 and 3,000, the fish % shown (−1 point), the right %
  (±3 points), E = bar − D\*, the plateau, every other learncmp guardrail. Reported: the scientific species met, at Open
  Water and at Advanced, and their share of the answers. One look at 90%; a cell unclear gets one second look of its own
  (10 more seeds, about 5 minutes), one cell at most, else it goes to Pierre. In all: about 41 minutes, 46 with a
  second look.
- **Unit tests** (the sea slugs' whole check): the units of each kind from `names`; the parent and the share level; the
  opening order; a scientific question's choices and typed answers among its own kind; *Goniobranchus* sp. 5's key and
  typed forms; no `gl` photo on a species; Q394's step never positive on a scientific bar over a grid of states; the
  score tree with and without the level, and its size under the board's limit; `fishReplayGen` against the app's units;
  the log's patterns accepting `sci:` keys; a locked scientific species taking evidence from a live answer or the
  placement test without opening (rule L4's new line). The exams' PR adds the checklist's: a box ticked only by a right
  answer on a first-seen photo at Advanced, never by an exam question; a miss unticking and 2 right in a row ticking
  again; the hidden exam asking only the unticked boxes, never fewer than 3 questions; the ultimate exam's 95% and its
  being the only way from 99% to 100%.

**What is given up, plainly**
- **The beginner and the casual diver are not run.** The casual diver declines scientific names (the identity runs show
  its path unchanged); the beginner has about one genus at Advanced by 3,000 answers (the share study's runs), so the new
  units barely open. Any effect on slow players is not measured.
- **No 10,000-answer runs** (dropped for C0 on 2026-11-17): the long run, where scientific species matter most, is not
  measured; what happens after 3,000 answers is read on the real answers once live.
- **No heavy-tailed photos**: the share study found its largest cost there (a slow player's first family at Open Water
  66-96 answers later). That risk stays unmeasured for this step.
- **3 seeds in the app world** instead of 5: it checks that the real app does what the rated world assumes; read as
  exploratory, it sees only effects several times a margin.
- **No value is chosen by simulation** (level 3): the display thresholds, the sizes of Q394's faults and the share's
  threshold stay starting values. The simulated players never type a common name or a genus alone, and know nothing of
  the two names' relative difficulty, so a run could not choose them anyway. They are read on the real answers after
  release, per player (rule L12).
- **The sea slugs get no simulation at all**: no profile exists, and their real answers come from a small beta group, too
  few to infer from. Their species level shares the fish's code path, which the fish runs check; how it moves the sea
  slugs' own genera is not known before release.
- **No "scientific names only" profile**: that choice is checked by unit tests only.

## 5. The order of PRs, with their size

Every figure is the measured agent time (first commit to green checks) of the comparable merged PRs, from
`tools/effort.py --estimate` (the tool of PR #1087; its list of merged PRs read on 2026-11-18). The check of section 4
runs on top: about 41 minutes of machine time, outside these figures.

1. **Done**: this note, with the answers; the scientific genera of circles 2 and 3 (Q397: #1067, their content #1074);
   the log's "Species shown" pattern accepting a species with no name yet's number (sheet script v170, #1053).
2. **Sheet PR (fish)**: the `sci:` units and the central levels table in `core.js` (`fishSpUnits` with a kind,
   `fishReplayGen`, `fishScoreTree`), new cache keys, Q394's mark under a fish rules version (A: smaller faults, so the
   replay reads them); a sheet script version (`SCI_SHEET`). Nothing changes in the app until it is assigned (rule D4).
   Level 0: the replay identity and the tree tests. **Size engine+sheet M, about 45 minutes**: comparable to #812, #835,
   #938, #958 and #1051, median 45 min (range 29 min to 58 min).
3. **App PR (both subjects)**: `SUBJECTS` `names`, the units, the parent (the genus, Q397), the opening and the share
   (C0, with live answers and the placement test counting on a locked unit), the choices by kind, the display, typed
   answers and Q394's faults, the log's suffixes, the milestone card, fspsci1-fpct70, the species tiles of My progress
   (the sea slugs' too). The fish behind `SCI_SHEET`; the sea slugs on at merge. The check of section 4. **Size engine XL,
   about 6 hours**: comparable to #839, #954, #987, #1062 and #1076, median 6.4 h (range 1.6 h to 9.6 h); if it splits
   into the units and the display, each part is engine L, comparable to #861, #885, #957, #1047 and #1075, median 2.9 h
   (range 1.6 h to 3.2 h).
4. **The "What I learn" card's names rows** (Q396, Q404 A), in the card's own build from #1071's study (Q400 D: on My
   progress, a Home line opens it): the fish's common and scientific rows, the sea slugs' scientific row, the welcome's
   "I'm at IMR" = both, ⚙ losing its "Scientific names" row. Level 1 (it chooses which sets are on), the app world at 300
   questions. **Size feature M for the names rows, about 20 minutes**: comparable to #832, #899, #911, #986 and #1056,
   median 18 min (range 5 min to 30 min); the card as a whole is the #1071 plan's to size, feature L, comparable to
   #823, #826, #829, #858 and #1058, median 53 min (range 47 min to 60 min).
5. **Exams PR** (Q395): the species checklist and its hidden family exam, with Q391 (b)'s variant photo, after the #953
   rebuild. **Size engine L, about 3 hours**: comparable to #861, #885, #957, #1047 and #1075, median 2.9 h (range 1.6 h to
   3.2 h).
6. **Ultimate exam and fpct100** (Q395): 100 to 200 questions, 95%, the only way to 100%. **Size engine M, about 45
   minutes**: comparable to #820, #822, #828, #873 and #938, median 45 min (range 29 min to 1.6 h).
7. **Sea slugs' species pairs** by Q390's rule: data, once Pierre answers it.

## 6. Not in step 2

The cross-family count of a wrong species pick (#892), fish species look-alike pairs and their cues, "Super Hyper Mega
Danger Zone", the per-species display thresholds from real answers, Find the X and Matrix on species, an ID key for sea
slugs. The scientific genera of circles 2 and 3 are no longer here: they are built (Q397, #1067 and #1074).

**For the integrator, not decided here.** The fish genera open today at their family's Advanced (#1067), which ties the
scientific tree to the common-name tree at its roots; Pierre's "2 arbres pédagogiques indépendants" (2026-11-18 ~09:17)
may mean the genera should open on their own rule. This plan follows the species' own opening (from their genus, never
the common name) and leaves the genera's opening as built; the question belongs to the "What I learn" card's plan.
