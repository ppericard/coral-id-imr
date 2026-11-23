# One id scheme and one data structure for every subject: design note (2026-11-23)

Design note (docs only, read-only on code, data and the sheet) for
[REE-256](https://linear.app/reef-id/issue/REE-256), a child of [REE-28](https://linear.app/reef-id/issue/REE-28). It
reads `main` at `4a1aa353`.

The trigger was REE-249 (2026-11-23). The corals' units are keyed by their bare genus name (`Acropora`). The fish's and
the sea slugs' units are keyed by a prefixed id (`f:Damselfishes`, `g:Naso`, `sci:s091`). `tools/learnsim.js` worked for
the corals only because their id is their name (fixed in #1502). Pierre, 2026-11-23 21:31 Manila: «ça montre encore
qu'il y a des choses qui sont pas communes … dans les structures de données … je suis d'accord pour réécrire des
données à partir du moment où on vise à homogénéiser et à rendre plus simple l'ensemble.» The migration plan still goes
to him before it runs (players' records and the sheet are involved: rules D3-D5, D9).

**Status:** not built. The questions in §5 are for Pierre. This note was written after 17:30 Manila (Rule 0): the
questions are in this note and its PR only.

**Short answer.**

- **Ids.** Use one scheme for every subject: the rank prefixes the fish and the sea slugs already use (`core.js` `LEVELS`:
  `f:`, `g:`, `s:`, `sci:`). The coral genera become `g:<Genus>` (`g:Acropora`). The fish and the sea slugs keep their ids.
  So the corals are the only subject whose ids move. Display names and addresses stay as they are.
- **The switch.** Reuse the fish's 2026-11-06 migration (Q159; #653, #654, #656): `SUBJECTS` `renamed`, `renamedId`,
  `renameUnits`, `renameLogEntry` and a sheet one-shot (`ONCE_`).
- **The corals' rules version.** Add one coral rules version to `RVS` (`msg: null`, rules D5 and D6) and use it as the
  vehicle of the switch. Every player's coral progress then becomes the replay of their log under the new ids (rules D8
  and D9). This is the mechanism that already keeps old and new apps apart (`sync.js` `replayAdoptS` refuses a newer
  version). No other rule changes.
- **Order.** First, the sheet reads both forms (D4). Then the app switches, once that sheet is at `SHEET_FLOOR`, so no
  gate code is needed. After a waiting window, the stored data is rewritten once and the dual reads are removed (rule W3).
- **The rest of the data structure.** The corals as a tree, their curation part and the game files follow in a second
  phase, which gets its own plan (Q406).
- **Proof.** The rename is not proved by argument. Each player's replayed progress must be identical before and after
  the rename, checked on a pseudonymised extract of the log (§4).

## 0. Earlier decisions this note completes

Searched: `docs/ANSWERS.md`, `docs/decisions/`, `docs/reviews/`, `docs/ROADMAP.md`, and REE-256, REE-28 and their
comments.

- **Q159 (Pierre, 2026-11-06 13:39), [fish units plan](2026-11-06-fish-units-plan.md) §4.** This is the precedent. The
  fish entries `t01`… became the book's families (`f:Damselfishes`): "the rows already logged rewritten once, and any old
  id the sheet still receives mapped". It was built as #653 (data), #654 (the sheet, v69) and #656 (the switch, v84). The
  machinery is still in `core.js`: `FISH_RENAMED`, `SUBJECTS` `renamed`, `renamedId`, `renameUnits`, `renameLogEntry`;
  in `app.js` `unitsRenamed`, `sync.js` `mergeSubject` and `signIn`; and in `Code.gs` `logAnswers_` and the
  `fishunits` one-shot. This note reuses all of it for the corals and adds the one difference: the corals are replayed
  under rules versions, the fish were not then.
- **Q406 (Pierre, 2026-11-18), [architecture review](2026-11-18-architecture-code-review.md) questions (a) and (f).**
  Q406 reads: "The corals move onto the tree engine, their ids unchanged: the principle agreed, a detailed plan to him
  first." The review's (f), "One unit id scheme for every subject, migrated once in the log?", was recommended "yes,
  together with (a)". The ledger has no separate answer to (f). Pierre's words of 2026-11-23 allow rewriting data to
  homogenise. This note reads them as lifting "their ids unchanged" for this aim, but asks him to confirm, since they
  amend a recorded answer (§5, question A).
- **The review's id proposal, "`<rank>:<stable slug>` for every subject (`genus:acropora`)".** This note proposes the
  prefixes already in use instead, and says why in §2.1. The review's "`s:` means two things" (a species unit by its data
  id, a species sheet by its name) is listed in §1 and left for later.
- **Rule S1's wording (Pierre, 2026-11-19 06:58).** "A difference between subjects is declared and named in one place
  … never hidden in the shared code as a test on the subject." §1 marks which differences the S1 test declares.
- **The [one-engine audit](2026-11-19-one-engine-audit.md) §1 item 11 ("the corals' `data.json` is flat … Not now")
  and REE-28's comment of 2026-11-23** ("Worth checking whether other code relies on 'id = name' for corals"). §3 step 1
  is that check, made mechanical.
- **The [sheet overlay design](2026-11-14-sheet-overlay-design.md), "Node ids".** Old ids are resolved through one
  forwards table (`SUBJECTS` `renamed`), and an entry under an old id applies to the new one. The coral map is a second
  such table.
- **Rules.** W3: migrate the data once, then no permanent dual read; old app versions may break, but no real data may be
  lost. D4: the app never gets ahead of the sheet. D5, D6 and D8: rules versions, applied silently, and the
  leaderboards follow. D9: the log is the reference. A1: `curation.json` is Pierre's. D1 and D2: tests and names.

## 1. Inventory: where the subjects' data differ

"Declared" means listed by rule S1's test, `tests/subject-neutral.test.js`: the `FLAGS` (`flat`, `replay`, `offsets`,
`anonBase`, `achFeats`, `admin.autosort`, `admin.csrc`, `admin.target`) and the two `ALLOWED` lines (the first board
subject in `Code.gs` `boardCache_` and `board_`). That test flags a top-level `SUBJECTS` field only when it is `true` for
one subject, and a subject only when it is named in code. An object or a string that differs (`renamed`, `dev`, `admin.cur`,
`unitRank`), or a field a subject lacks (`sheets`), passes it unseen.

Counts are from the files on `main` (a script in the scratchpad, not committed).

| # | Area | Corals | Fish | Sea slugs | Where; who reads and writes | Declared? |
|---|---|---|---|---|---|---|
| 1 | **Unit ids** | The bare genus name, `Acropora` (66 genera: `data.json` `gen` 39, `x.gen` 27) | `f:<label>` families, from the key's English label (67, `f:Damselfishes`, `f:Anthias`); `g:<Genus>` (239); species units `s:<id>` by common name and `sci:<id>` by scientific name (`s:s091`, `sci:s091`) | `f:<Family>`, scientific names (33, `f:Chromodorididae`); `g:` (78); `sci:s<iNat taxon>` (`sci:s119434`) | `core.js` `LEVELS`, `spUnitId`, `levelOf` (`''` for a coral genus), `sheetIdOf` (a subject with no `sheets` takes any id); `app.js` `GX` (reads `DATA.gen[n]` first, then `TREEU`), `unitName` (`''` "for a coral genus (its id is its name)"), `unameT`, `rankOf`; `Code.gs` `logAnswers_` (the id patterns). Written by the builders (fish, sea slugs) or used as is (the corals' keys). | No. `flat` declares the corals' data layout, not their ids. `levelOf`'s `''` and `unitName`'s `''` are implicit coral cases. |
| 2 | **Old ids still read** | None | `FISH_RENAMED` (`t01` → `f:Damselfishes`, 47 old ids, a `split` table for 3 entries that went to two families), read at every load, at every merge and at logging; the game files are still keyed by the old teaching ids (row 4) | None | `core.js` `renamedId`, `renameUnits`, `renameLogEntry`, `POOLS` (exposure under "the ids its answer log holds"); `app.js` `unitsRenamed`; `sync.js` `mergeSubject`, `signIn`; `Code.gs` `logAnswers_`, the `fishunits` one-shot, `unitUp_` | No (`renamed` is an object, so the test does not see it) |
| 3 | **Content files** | `data.json`, one file that is both the source and the built file. Genera are keyed by name (`gen`, `x.gen`, `course`, `cand`), cross-references are by name (`look`, `lsrc`, `ap`, `apsrc`, `x.leaf`, `x.groups`), and there are three views and no `e`, `sp` or `circle`. Written by `tools/datajson.py` `dump()` and the `apply_*` tools; the instance's layer is `tools/instances/imr/coral.json` | `fish.json`: lists of records with ids (`teach`, `families`, `genera`, `species`), built by `tools/build_fish.py` from `tools/fish_source.json` and the instance's layer | `seaslug.json`: the same lists without `teach`, built by `tools/seaslug_game.py`, which shares no code with `build_fish.py` (audit item 11) | Readers: `app.js` `build` and `treeBuild`, `core.js` `genLooks` and `treeGen`/`treeReplayGen`, the admin, `proto/lab.js`, the tools. The corals' slate rules are names in code: `core.js` `BENTHIC` (Millepora), `BONUS` (5 genera), `slateOf`, `gameOf`, `starRefs` (`n`, `ig`; audit item 5) | `flat` (FLAGS). The names in code are not declared. |
| 4 | **Game data (photos in play)** | Inside `data.json` `gen` `views{wide, medium, macro}`, under the curation (`core.js` `applySlots`) | `fish-game.json` `photos{teaching id: [photo]}` (64 keys `t01`…, not families) and `fish-photos.json` (the first photos, same keys) | `seaslug-game.json` `photos{family id: [photo]}` (33 keys `f:…`) | `core.js` `POOLS` (`slots` and `entries`), `treePhotos` ("{teaching id: [photo]}"), `treeCur`; `Code.gs` `pools_` reads them from `main`. Writers: `tools/fish_game.py`, `tools/fish_photos.py`, `tools/seaslug_game.py` | No. Two tree subjects, two keyings. |
| 5 | **Photo ids** | `<genus>-<view>-<n>`, `<genus>-cand-<n>` | `fish-<species id>-cand-<n>`; flags `i<n>` | `seaslug-<iNat taxon>-cand-<n>` | They key the curation (`quality`, `gf`, `exclude`, `crop`, `seen`, `tags`, `ease`), the photo memory, the pooled statistics' `photos`, the log's Photos column, the R2 objects and `data/suggest.json` | One shape (an opaque string); the values differ. Kept (§2.5). |
| 6 | **Candidates** | `data/cand.json` `cand{Genus: [photo]}` (`tools/datajson.py` `dump_all`, `tools/fetch_local.py`) | `data/fish-cand.json` `{v, cand{s091: [photo]}}` (`tools/fetch_fish.py`) | `data/seaslug-cand.json` `{v, cand{119434: [photo]}}`: the bare iNaturalist taxon, while `seaslug.json` writes `s119434` (`tools/fetch_seaslugs.py`) | Readers: the admin's Candidates, `tools/fish_game.py`, `tools/seaslug_game.py`, `tools/licences.py`. Admin and tools only | No |
| 7 | **Judging records** | `judging/cand/<Genus>.json`; `data/suggest.json` `by{Genus}` (the genus pass) and `cand{photo}`; `judging/manifest.json` `genera{Genus}` | `judging/fish/<s091>.json`; `data/suggest.json` `fish{photo}` | `judging/seaslug/<119434>.json` (bare taxon); `data/suggest.json` `seaslug{photo}` | `tools/judging_cand.py`, `tools/judging_import.py`, `tools/judging_fish.py` (`--subject seaslug`); read by the admin, `tools/fish_game.py`, `tools/seaslug_game.py`. Admin and tools only | No |
| 8 | **Curation keys** | At the top level, mixed with the shared keys: `genera{Genus}` (62), `mont{"A\|B"}` by names (8), the content editor's `content` at the top (its `nodes` by genus name and `pairs` `"A\|B"`; none published yet), and the shared `exclude`, `seen` (`cand:`, `rep:`, `rule:`, `sa:`), `quality`, `gf`, `crop`, `auto`, `flag`, `points`, `reps` | Under `fish`: `genera{f:…}` (28, by ids), `add{photo: species id}`, `tags`, `ease`, `phase`, `seen`, `exclude`, `crop`, `rot`, `auto`, `flag{i<n>}` | `seaslug{flag}` only (its photos in play come from its game file) | `SUBJECTS` `admin.cur` (`''` for "the top level", `fish`, `seaslug`); `core.js` `treeCur` passes the sea slugs' part under the fish's key; `applyCuration`, `contentApply`; `tools/curplay.py`. Written only by the admin's Publish (rule A1) | No. The value `''` hides a different shape (the architecture review: "the subject layout is asymmetric") |
| 9 | **The answer log's columns** | The same 27 columns for every subject (`Code.gs` `LOG`). But in coral rows: Genus shown, Answered, Choices and a duel's Mode hold bare names; Subject and Rank are blank in the oldest rows; Taxon shown and Taxon answered are blank (id = name); Species shown is blank (genus photos) | `f:`, `g:`, `s:`, `sci:` ids, with Taxon shown and Taxon answered filled; a `t01` from an old app is renamed at logging | `g:`, `sci:` ids, with the taxa filled | Readers by position: `Code.gs` `answers_`, `stats_`, `hold_`, `replay_`, `users_`, `live_`; the admin's `ANS`; the tools' `normalise` (`tools/abilityeval.js`, and `memreplay.js`, `realcheck.js`, `rtprep.js`, `fallbackeval.js`, `analyses.js`, `learnsim.js`). The Reports tab's Expected, Answered and Suggested genus hold unit ids too | Partly: "the subject of an unlabelled row" is one meaning of `replay` (FLAGS) |
| 10 | **The progress JSON and its keys** | The keys follow one pattern for every subject (`subjKey`: `reefid-sync-coral-progress`, `-intro`, `-custom`, `-rv`, `-st`, `-reset`, `-start`), and so does the record (`{unit: {ok, ko, streak, conf, off, …}, '~level'}`). In the corals' it is the unit keys that differ (bare), the `conf` and `off` maps inside each record too | Prefixed keys | Prefixed keys | Other stores of coral unit ids: the first-meeting cards (`-intro`), the custom quiz's genera (`-custom`), the pending question (`reefid-pending`), the queues (the account's log, `LOG0`, the anonymous queue), the sign-in record's copies (`SUBJECTS` `base`: `base`/`pending`, `fbase`/`fpending`, `sbase`/`spending`), the pooled statistics kept on the device (`reefid-photo-stats`, `PGD`, `PCONF`; the others' are `reefid-photo-stats-<id>`) and `calibration-set.json` `coral{Genus}` (`tools/calibset.js`). Device-only prefix `SUBJECTS` `dev` (`''`, `fish-`, `seaslug-`). Achievement ids: `met10`, `fmet5`, `ssmet5`; basics feats `_basics`, `_fbasics`, `_sbasics`; the feats `_run`, `_best`, `_hard`, `_cor` exist for the corals only. Readers and writers: `app.js`, `model.js`, `sync.js` `mergeSubject`, `progress.js`, `core.js` `mergeProgress`, `mergeUsers`; `Code.gs` `dataKey_` (`DATA_KEYS_`: the coral progress and reset under their pre-rename names too) | `achFeats` (FLAGS). The rest: no |
| 11 | **The sheet's tabs and replay** | The first path: tabs `Replayed` (`RPL.TAB`) and `Stats`, property `STATS_FOLD`, caches `gen1`, `slate1`, `scale1`, `stats17`, `board14`; the `By genus` tab (its header is the genus names, `scale_`; the board of the first board subject reads it); a request's `rv`, `reset`, `start`; the reply's `replay`, `hold`, `holdIds`; `answerRows_` | `Replayed Fish`, `Stats Fish` (`rplTab_`, `statsTab_`), `STATS_FOLD_fish` (`statsProp_`), `sgen…:fish`, `board14:fish`; `rvs`, `sreset`, `sstart`, `rv_fish`; `replays.fish`, `holds.fish`; `subjRows_` | The same as the fish under its own name | `Code.gs` `replay_`, `replays_`, `subjRpl_`, `rplMake_`, `boardWarm_`, `board_`, `boardUnits_`, `statsFold_`; `sync.js` `replayAdopt`, `replaysAdopt`, `holdAdopt` (one-engine audit 1.3 and 6) | Yes: `replay` (FLAGS) and the two `ALLOWED` board lines |
| 12 | **Rules versions and structure stamps** | `RVS`, `reefid-sync-coral-rv`, `reefid-sync-coral-st` | `FISH_RVS` | `SEASLUG_RVS` | `core.js` `rvsOf`, `rvOf`; one shape for every subject | The same shape for every subject: nothing to declare |

**Summary.**

- **Declared and tracked by REE-28:** the corals' flat data (row 3), their first replay path and tabs (row 11), the
  feats (row 10), the admin's three fields, and the two board lines.
- **Not declared:**
  - the corals' bare ids (row 1), the root of the class REE-249 met;
  - the fish's teaching-id game files and their forwards table (rows 2 and 4);
  - the candidates' and judging keys (rows 6 and 7);
  - the curation's layout (row 8);
  - the coral slate's names in code (row 3).
- **Same shape, different values (§2.9):** the photo ids, the `dev` prefix, the sign-in record's field names, the
  achievement ids and the basics feats.

## 2. The common shape proposed, and the migration of each

### 2.1 Unit ids: the rank prefixes, `g:<Genus>` for a coral genus

One scheme for every subject: `core.js` `LEVELS`, a rank prefix and the subject's own stable id (`f:`, `g:`, `s:`,
`sci:`). For a coral genus that is `g:<Genus>` (`g:Acropora`). When the corals become a tree, their families take
`f:<Family>` by scientific name, as the sea slugs' do. The name shown stays the record's `name`.

**Addresses stay as they are.** A genus sheet stays `#learn/genus/Acropora`, with the corals given `sheets`
`{genus: 'g:'}` as the tree subjects have, so `routeIn` and `routeOut` translate. `sheets` does not cover the pair pages
(Codex on #1508). Today `routeOut` would turn the page key `cmp-g:Acropora|g:Porites` into
`learn/compare/g%3AAcropora/g%3APorites`, and `routeIn` passes a pair's parameters through unchanged, so an old
Compare, look-alike or duel bookmark would bring bare names that no unit answers to. So step 4 also translates the
units of a pair page both ways: the name in the address, the id in the page key, an old bare name taken as the unit it
names. This covers Compare, the look-alike pairs and the duels, with round-trip tests on every such route (§4 A9).

Why this scheme:

- **The smallest move.** Two subjects of three already use it, and the log holds their rows under it. Only the corals
  migrate.
- **The prefix is the rank, and the engine reads it.** `levelOf`, `sheetIdOf`, the `LEVELS` parents and `Code.gs`
  `unitUp_` all use it. A tree needs its ranks apart: the fish's family `f:Anthias` (the key's label) and the genus
  *Anthias* would collide as bare names.
- **One form in every store.** After the move no code asks whether an id is its name: `unitName`, `levelOf`'s `''` and
  `GX`'s first read stop being coral cases.

Rejected:

- **The architecture review's `genus:acropora`.** Every subject would migrate, and the fish a second time, for no
  gain over `g:`.
- **Bare names everywhere.** Ranks collide inside a tree, and the fish and the sea slugs would migrate.
- **Numeric taxon ids (`g:206485`).** Unreadable in the log, the sheet and the admin. A taxonomic rename is already
  handled by a forwards table (`renamed`).

**Across subjects.** No genus name is shared between the corals (66), the fish (239) and the sea slugs (78), and no
family or species id between the fish and the sea slugs (checked on `main`). The app joins every subject's pooled
statistics into one map (`model.js` `statsJoin` into `PSTAT`, `PGD`, `PCONF`), keyed by unit ids. Prefixing the corals
puts them in the `g:` space the others share, so a test should assert that no unit id belongs to two subjects (a
guard; zoological names of one rank are unique, but labels are not).

### 2.2 The migration of the ids

**The table.** A coral forwards table in `core.js`, beside `FISH_RENAMED`: `{ids: {Acropora: 'g:Acropora', …}}` for
every genus of `data.json` `gen` and `x.gen`, one to one, with no `split`. It is checked against `data.json` by a test
(as `tests/fishrename.test.js` does for the fish). It covers every genus that `look`, `lsrc`, `mont`,
`calibration-set.json`, `BONUS` and `BENTHIC` name. Because it is one to one, it also has an inverse (`g:Acropora` →
`Acropora`), which the waiting window needs (below). Keys that are not units (`~level`, `_`-feats, an empty "I don't
know") are never in the table, so they never move.

**Why a coral rules version carries the switch.** The fish's switch renamed each device's records at load and relied
on `renameUnits` keeping "the busier record" when both ids were present. The corals cannot rely on that, for two
reasons:

- `core.js` `mergeProgress` adds deltas against the merge baseline (`out.ok = r.ok + l.ok − b.ok`). A baseline under
  one form against copies under the other counts answers twice or drops them. That is why `sync.js` `mergeSubject`
  renames the saved copy and the baseline before merging.
- An old app and a new app on one account would save the two forms in turn. The fish were in beta then and not
  replayed. The corals are the main subject, and a lost delta would stay until their next rules version.

A coral `RVS` entry (the next `v`, `msg: null`, its `why` saying "the coral genera keyed `g:<Genus>`; no rule changes")
makes the sheet replay every player's coral log under the new ids. Each device adopts the replay once, silently (D5,
D6). The boards follow for players who never reconnect (D8, `boardWarm_`). The log is the reference (D9). This is the
path every rules version already takes, and it keeps the two apps apart without new code:

- an old app refuses a replay newer than its rules (`sync.js` `replayAdoptS`: "Never a version newer than this app's own
  rules");
- a new app that meets a copy saved under an older rules version does not merge it: it takes its version back and
  adopts the replay of the whole log (`sync.js` `mergeSaved`; `docs/spec/sync.md` "Full replay", Adopting).

No fish or sea slug rules version is needed: their ids do not move.

**What players see: nothing.** Names, addresses and colours are unchanged. The bars are unchanged too, which the check
in §4 must prove: the replay under the new ids equals today's replay with its keys renamed, player by player. A player
whose device holds answers the log lacks would see the log's value. That is already what every rules version does (D9),
and §4 counts those players before the switch.

**Old app, old script (D4).** The order in §3 keeps both working:

- The sheet first reads both forms (step 2). A new app sending `g:` ids to that script is understood: its rows,
  its saved copy and its summary are taken to one internal form.
- The app switch (step 4) merges once step 2's version is at `SHEET_FLOOR`, three days or more after its merge. So no
  gate code is needed (D4 by order, as the review's (i) proposed).
- During the waiting window the sheet gives an app that does not say it reads `g:` ids its saved copy and its pooled
  statistics in bare names. A new request field says it (named in the PR; `gid: 1` here). Without it, an old app on an
  account that a new device has already moved would show only its own recent answers until it updates itself (W3
  allows that, but the issue asks for nothing visible). Its answers keep landing in the log either way, mapped at read.
- The replay is translated too, in both directions (Codex on #1508). An old app refuses step 4's replay by its
  version. But during step 4's deploy window an updated app can still reach step 2's script, whose rules version is
  the old one. An app whose applied version is below it would then take that script's replay, under bare keys: a
  fresh device, or after a reset or a sign-in. So step 2 gives the replay too in the asker's form (`gid`). As a second
  guard, the updated app passes every replay record it adopts through `renameUnits`, as `Code.gs` already does for the
  board, so a bare record can never reach its `g:` units.

**The stored data rewritten once (step 6).** After the window, one sheet one-shot rewrites the coral rows of the
Answers tab:

- Genus shown, Answered, Choices and a duel's Mode, with one map per row as `fishunits` does;
- the blank Subject and Rank cells filled with `coral` and `genus`;
- Taxon shown and Taxon answered filled with the genus names.

The same one-shot rewrites:

- the Reports tab's Expected, Answered and Suggested genus;
- every saved copy's coral progress, cards and custom keys (Progress data and `RAs` column H), under the lock;
- the corals' Replayed rows, dropped (a cache, made again).

It also marks the pooled statistics dirty, so the fold rebuilds from row 1 (`statsDirty_`). Then the read-time
mapping of stored data is removed. As for the fish, only the mapping of what still arrives stays (an old queue sent
late), until the review's (c) is decided.

### 2.3 Content files: one tree layout, in a second phase

The common shape is the tree subjects' one: a built file of lists of records with ids (`families`, `genera`, `species`;
`{id, name, …}`), built by one tool from sources plus the instance's layer. The corals reach it when they become a tree
(REE-28 "later, corals as a tree"; Q406: "a detailed plan to him first"):

- a `coral.json` with families and genera;
- `BENTHIC`, `BONUS` and the slate order as data;
- `flat` and `genLooks` retired, so `GX` has one read;
- the two builders' shared code (`build_fish.py` and `seaslug_game.py` share none today).

That is a design note of its own. In the first phase `data.json` keeps its genus names as keys, so none of the coral
tools that write it change. The app makes the coral units by id when it loads them (`app.js` `build`: the unit `g:X`
from the record `gen[X]`, with `look` and the other cross-references mapped), as `core.js` `treeGen` makes the fish's.
The sheet does the same in `genLooks`.

### 2.4 Game data: keyed by family id

Common shape: `<subject>-game.json` `photos{family id: [photo]}`, as the sea slugs' file is. The fish's `fish-game.json`
and `fish-photos.json` move from teaching ids (`t01`) to family ids (`f:Damselfishes`). That takes the last old ids out
of the fish's data, and the forwards table out of `POOLS`.

The sheet reads these files from `main` (`Code.gs` `pools_`), so this is D4 the other way round: a file the sheet reads
changes shape only after the live script reads the new shape. First a sheet release where `core.js` `treePhotos` and
`POOLS` read both keyings, then the files rebuilt by `tools/fish_game.py` and `tools/fish_photos.py`. The corals' game
file comes with phase 2. Nobody's progress moves (the units are already families). No rules version.

### 2.5 Photo ids: kept

Photo ids are opaque, stable keys in every store: the curation, the photo memory, the pooled statistics, the log's
Photos column, the R2 objects, the reports and the judging. One shape already (a string); only their spelling differs
per subject. Renaming them would touch every store and the photo files, for no change anyone sees. Not proposed. A
coral photo's stem names its genus at the time it was added, and a photo moved to another genus keeps it: harmless,
since nothing parses it.

### 2.6 Candidates and judging records: keyed by the subject's node id

Common shape: `data/<subject>-cand.json` `{v, cand{node id: [photo]}}` and `judging/<subject>/<node id>.json`, where
the node id is the id the subject's built file uses:

- the sea slugs: `s119434`, not `119434`. One tool pass rewrites `data/seaslug-cand.json`'s keys and renames the
  `judging/seaslug/` files, and its readers (`tools/fetch_seaslugs.py`, `tools/seaslug_game.py`,
  `tools/judging_fish.py`, the admin) take the new key;
- the corals: their `g:` ids, in phase 2, with `data/cand.json` moving out of `data.json`'s layout.

Admin and tools only. No player and no sheet is involved, so this is easy to correct and the integrator's call.

### 2.7 Curation keys: unchanged in the first phase

`curation.json` is Pierre's (rule A1): a pull request never writes it. In the first phase the corals' part stays at the
top level, keyed by genus names. The app finds a coral unit's curation by its record's name, as it finds its content.
The common shape is each subject's part under its own key (`coral`, `fish`, `seaslug`), keyed by the subject's ids, with
the shared keys (`exclude`, `seen`, `points`, `reps`) apart. It comes in phase 2, together with the review's question
(e) (his decisions apart from the machine's judgements), as one rewrite he publishes from the admin (§5, question C).

### 2.8 The answer log: the same columns, coral rows rewritten once

No column moves or is renamed. The columns are read by position, and some by name (`Code.gs` `C('Genus shown')`), so
"Genus shown" keeps its header. The coral rows' content is rewritten once (§2.2, step 6).

Species shown stays blank for coral rows. Filling it from each photo's `t` is possible but changes what the column
records for the corals; it is not proposed here.

### 2.9 The progress JSON: the coral unit keys renamed, the rest kept

Renamed at load, as the fish's were (`app.js` `unitsRenamed`, `sync.js` `mergeSubject`, `signIn`), and replaced by
the replay (§2.2):

- the progress record and its inner `conf` and `off`;
- the first-meeting cards;
- the custom quiz's genera;
- the pending question;
- the sign-in record's `base` and `pending`;
- the queues, read through `renameLogEntry`.

`reefid-photo-stats` is fetched again under the new ids. `calibration-set.json` is rewritten by `tools/calibset.js`.

Kept, because they are one shape with different values, and renaming them moves records for nothing anyone sees:
`SUBJECTS` `dev` (the corals' device keys `reefid-hold` against `reefid-fish-hold`), the `base` field names, the
achievement ids and the basics feats. The coral-only feats are the audit's step 7 (REE-28), not part of the ids.

### 2.10 The sheet's tabs and replay: one path, under REE-28

The id switch needs no change to the tabs. The corals' first path (`replay`, `hold`, `holdIds`, `Replayed`, `Stats`,
`By genus`, `answerRows_`) becomes one per-subject path in the one-engine audit's step 9 (REE-28): `replays.coral`,
`rvs.coral` and `holds.coral`, with the unprefixed slots kept for old apps until the floor passes them. Once that is
done, the two cache tabs could take their subject's name like the others, and `By genus` would have no reader left
(§5, question D).

## 3. Order of PRs, smallest risk first

Lanes: `core.js` (with its `core/*.js` parts), `tools/sync/Code.gs`, `sync.js`, `model.js` and `app.js` take one open PR
at a time each (rule W27). Every `core.js` change is a sheet release (D3: a changes file, `VERSION` assigned at merge).
REE-28's other steps on those files queue with these. Each PR gets its estimate from `tools/effort.py` when it is
planned.

| Step | PR | Files (lanes) | Sheet release | Waits for | Players see | Proof |
|---|---|---|---|---|---|---|
| 0 | This note | `docs/reviews/` | No | Nothing | No | `tests/docs.test.js` |
| 1 | **The app reads coral units through their record.** No code reads `DATA.gen[n]` with a unit id or uses a unit id as a name (the REE-249 class): names via `GX(n)`, `unameT`, the record's `name`; `slateOf`/`gameOf` results mapped to units in one place. A test harness builds the coral units under a throw-away prefix and plays the quiz, duels, Learn and My progress, and fails on any `GX` miss. No id changes | `app.js`, `model.js`, `quiz.js`, `learn.js`, `progress.js`, `home.js`, `proto/lab.js`; `tools/learnsim.js` (cut in two if `app.js` and `model.js` are busy: REE-64) | No | Nothing | No | The harness; every existing test unchanged |
| 2 | **The sheet reads both forms.** The coral table and its inverse in `core.js`; `Code.gs` takes every coral row, saved copy and summary to one internal form (bare for now); a request field (`gid`) and the replies that carry coral unit keys (the saved copy on load, the replay, the pooled statistics) in the asker's form; `By genus` columns by name. Current apps send no `gid`: their replies are byte for byte as today | `core.js`, `Code.gs` | Yes | Nothing | No | §4 A1-A3 |
| 3 | **The admin and the tools read both forms** (idempotent: each row through `renameLogEntry`, each record through `renameUnits`) | `admin*.js`, `analysis.js`, `tools/analyses.js`, `tools/abilityeval.js` `normalise` and its users, `tools/calibset.js` | No | Step 2 (the table) | No | Their tests on mixed fixtures |
| 4 | **The switch.** `SUBJECTS` coral `renamed` and `sheets`; the coral `RVS` entry; the app's coral units `g:`; the device's stores renamed at load (§2.9), and every adopted replay record too; the pair pages' routes translated (§2.1); `gid` sent; `Code.gs` computes the corals in `g:` and replays at the new version under `g:` (down-mapped for `gid`-less apps); `calibration-set.json` rewritten | `core.js`, `Code.gs`, `app.js`, `sync.js`, `model.js` (alone on all five) | Yes | Step 2's version at `SHEET_FLOOR`; steps 1 and 3 merged; Pierre's OK (questions A, B) | No (proved) | §4 A3-A7, A9, B1-B4 run before the merge |
| 5 | **The waiting window.** The sheet counts requests without `gid` (as `oldApp_` counts those without `av`) | Nothing to merge | No | Step 4 live | No | The count stays at zero for 14 days <!-- effort-ok: a waiting window, not an estimate --> |
| 6 | **The stored data rewritten once.** `ONCE_` `coralunits` (§2.2): Answers, Reports, saved copies, the corals' Replayed rows dropped, the statistics rebuilt; the stored form is `g:` (step 4 already computes in it); the read-time mapping of stored data removed | `core.js`, `Code.gs` | Yes | Step 5; Pierre's OK (question B) | No | §4 B5, A8; the Deploy log's counts; a fresh extract checked again |
| 7 | **Clean-up** (W3): the `gid` translation and the admin's and tools' dual reads removed; only the mapping at logging of late old ids stays, as the fish's | `Code.gs`, `core.js`, `admin*.js`, `tools/` | Yes | Step 6 and an extract with no bare coral id | No | The S1 test: `levelOf`'s `''` and `unitName`'s coral case gone |
| 8 | **Fish game files by family id** (§2.4): first the reading of both keyings (a sheet release), then the files rebuilt | `core.js`, `Code.gs`, then `tools/fish_game.py`, `tools/fish_photos.py` and the data files | Yes, then no | Independent of steps 1-7 (a lane free) | No | `POOLS` and `treePhotos` give the same units and photos from both keyings |
| 9 | **Sea slug candidates and judging by node id** (§2.6) | `tools/`, `data/seaslug-cand.json`, `judging/seaslug/`, the admin | No | Independent | No | The admin's Candidates and the judging tools on the renamed files |
| 10 | **Phase 2: the corals as a tree** (§2.3, §2.7; Q406's plan): its own design note first | — | — | Steps 1-7 | — | — |

Steps 1 to 3 change nothing for any player or any device, and each can be reverted on its own. Step 4 is the only one
that moves records, and it moves them through the existing rules-version path. Step 6 is the only irreversible one: it
rewrites the sheet's rows and saved copies, after a backup (§5, question B).

## 4. Tests that prove nothing is lost

Rule D1: no test reaches the real sheet. Rule D2: real names never enter the repository.

**A. In the repository (CI, synthetic data, the in-memory sheet of `tests/sync.test.js`):**

1. The table covers every genus of `data.json` (`gen`, `x.gen`) and every name `look`, `lsrc`, `mont`,
   `calibration-set.json`, `BONUS` and `BENTHIC` hold. It is one to one, its inverse round-trips, and no unit id belongs
   to two subjects.
2. `renameUnits` and its inverse on progress records (with `conf`, `off`, `~level`, the feats) and on the cards seen:
   identity after a round trip; non-unit keys untouched.
3. Step 2 is dormant: every existing sync test passes unchanged. A request without `gid` gets byte-identical replies.
   A fake app with `gid` gets the same content under `g:` keys (its saved copy, its replay, its statistics), and its
   `g:` rows, copy and summary are stored as an old app's would be. The deploy window is also tested: an app of step 4
   with an applied version below step 2's, talking to step 2's script, gets a `g:` replay. Fed a bare replay instead,
   it renames it before adopting.
4. `renameLogEntry` on coral rows: a duel's Mode `quiz-duel|A|B`, Choices, a typed answer (`|t`, Answered is the unit
   read, Choices empty), "I don't know" (empty), a surprise card's row (untouched).
5. The replay: `replayProgress` on a multi-player synthetic log, (i) bare and renamed after, and (ii) renamed rows, and
   (iii) a log mixing both forms at random: the same records, `~level`, abilities, %, learned marks and `lm`.
6. Mixed apps on one account through the switch: an old app and a new app saving and loading in turn, a sign-in merge,
   an anonymous claim, a reply lost and its answers resent. The end state equals the replay of the log (D9), and no
   answer is counted twice or dropped.
7. The structure stamp (`reefid-sync-coral-st`) is unchanged by the switch, so no extra replay wave. The board's %, the
   `By genus` cells and each subject's hold are unchanged.
8. Step 6's one-shot: idempotent (run twice); only the renamed columns written, so no cell turns into a formula (as
   #654's Codex finding); the Reports cells; the corals' Replayed rows dropped; `statsDirty_` set.
9. Addresses: every coral page key and address round-trips through `routeOut` and `routeIn`, the genus sheet and the
   pair pages (Compare, the look-alike pairs, the duels) included. An address of today with bare names opens the same
   page after the switch.

**B. On a pseudonymised extract of the real log (read-only, outside the repository).** The integrator exports the
Answers tab and the saved copies through the read-only connector, replaces each name with a pseudonym (P1, P2…, the
mapping kept outside the repository), and keeps the files in a scratch folder deleted after use (rule D2; a real-data
check under rule L12). A script committed without data (for example under `tools/studies/ree256/`) runs, for every
player and every subject:

1. **The coral replay.** Today's replay of the bare rows with its keys renamed, against the step 4 sheet's replay of
   the same rows. Deep equality per unit and for `~level`; the same %, level, learned set and achievements derived from
   them. Any difference stops step 4: it is a bug, not a rules version.
2. **The fish and the sea slugs.** Their replays byte for byte unchanged.
3. **The pooled statistics** (`stats_`, per subject): `photos`, `gd`, `conf`, `mem`, `fmt` equal after the key mapping.
   The hold of each subject equal. The board's order and % equal.
4. **The saved copies.** Each copy's coral keys are either a table entry or a known non-unit key (the list of unknown
   keys is empty). Also counted: the players whose saved copy differs from today's replay of their log, those whose bars
   any rules version would already move (D9).
5. **Step 6's one-shot.** Its row function on the extract gives rows whose replay equals 1's. After it runs on the
   sheet, a fresh extract is checked again, and the Deploy log's counts are read.

## 5. Questions for Pierre

These are unnumbered here: the integrator numbers the ones that pass the two tests (AGENTS.md "Working mode").

- **(A) The ids.** Do your words of 2026-11-23 lift Q406's "their ids unchanged" (2026-11-18)? If so, should every
  subject use the rank prefixes the fish and the sea slugs already use, with the coral genera becoming `g:Acropora`?
  This is a data format that all the other code follows. Options:
  1. `g:<Genus>` for the corals only; the fish and sea slugs unchanged.
  2. The review's `genus:acropora` for all three subjects; the fish and the sea slugs migrate too.
  3. Bare names kept, declared as an S1 exception: nothing migrates, and the difference stays.

  *Recommendation:* 1. It is the smallest move, it reads the rank the engine already uses, and nothing changes on
  screen.
- **(B) The migration plan (§2.2, §3 steps 4-6).** May the corals' progress be moved by a coral rules version with no
  rule change (every player's coral progress replayed once from the log, silently, the boards following)? And, after
  the 14-day <!-- effort-ok: a waiting window, not an estimate --> window, may the sheet's records be rewritten once:
  the coral rows of the Answers tab (their units prefixed, the blank Subject, Rank and taxon cells filled), the Reports
  cells, every saved copy's coral keys, and the corals' Replayed rows dropped?

  Before the rewrite, a copy of the Answers tab goes into the pCloud backup. Two checks run first: the pseudonymised
  extract (§4 B) and the old-app count at zero.

  What you would see: the Answers tab shows `g:Acropora` where it shows `Acropora` today, and the admin shows names as
  before.

  *Recommendation:* yes to both. It is the fish's Q159 path, plus the replay that the corals' rules versions already
  use.
- **(C) The curation.** Leave the corals' part of `curation.json` at the top level, keyed by names, through phase 1?
  Then, in phase 2, move it under `coral` and key it by ids, together with the review's question (e)? That would be one
  rewrite the admin prepares as a draft and you publish (rule A1).

  *Recommendation:* yes. Phase 1 does not need it, and doing it twice would cost two rewrites of your file.
- **(D) The sheet's tabs, with REE-28 step 9 (not needed for the ids).** Once the corals run through the per-subject
  replay path:
  - rename the corals' cache tabs `Replayed` and `Stats` to `Replayed Corals` and `Stats Corals`, like the others;
  - retire `By genus` (no reader left, its rows kept and no longer written).

  *Recommendation:* yes, in that step. They are caches and a summary, rebuilt from the log; renaming them removes the
  first-subject special case.

## 6. What was checked and how, what was not (rule W11)

**Checked.**

- Read: REE-256 (no comments), REE-28 and its comment of 2026-11-23; the [one-engine audit](2026-11-19-one-engine-audit.md);
  the [architecture review](2026-11-18-architecture-code-review.md)'s ids and layout sections and its questions; the
  [fish units plan](2026-11-06-fish-units-plan.md) §4; the [sheet overlay design](2026-11-14-sheet-overlay-design.md)'s
  node ids; `docs/ANSWERS.md` (Q159 context, Q406, S1's wording), `docs/decisions/2026-11-18-architecture-steps-3-4.md`;
  rules S1, D1-D9, W3, W27, A1; `docs/spec/data.md`, `subjects.md`, `sync.md` (tabs, the Answers tab, the hold, the full
  replay, other subjects' replays, the pooled statistics), `storage.md`; `tests/subject-neutral.test.js`.
- In the code on `main`: `core.js` `SUBJECTS`, `FISH_RENAMED`, `LEVELS`, `renamedId`, `sheetIdOf`, `renameUnits`,
  `renameLogEntry`, `keepSubjectKeys`, `mergeProgress`, `BENTHIC`, `BONUS`, `slateOf`, `gameOf`, `treeCur`; `app.js`
  `GX`, `rankOf`, `unitName`, `uname`, `unitsRenamed`, `subjectLoad`; `sync.js` `replayAdopt`, `replayAdoptS`,
  `mergeSubject` (its renames); `Code.gs` `logAnswers_`, `answerRows_`, `subjRows_`, `gen_`, `dataJson_`, `replay_`,
  `rplTab_`, `statsTab_`, `statsProp_`, `boardCache_`, `DATA_KEYS_`, `REP`, the `fishunits` one-shot; #654's diff stat
  and message.
- The data files' shapes and the counts in §1 (unit ids, game-file keys, candidates, judging, curation, the
  calibration set), and the absence of shared genus, family and species ids across subjects, with read-only scripts in
  the scratchpad.

**Not checked.**

- The real sheet (never read here). How many coral rows, saved copies and old-app requests there are is for the
  extract.
- Every reader of a coral unit id in the app's, the admin's and the Lab's files and in `tools/` (counted by grep only:
  `DATA.gen` is read about 75 times across `app.js`, `model.js`, `quiz.js`, `progress.js`, `learn.js`, `home.js`,
  `sync.js`, `admin.js` and `proto/lab.js`, 42 of them in `admin.js`, and `GX` about 180 times). Step 1's harness is
  meant to find them mechanically.
- The Events, Pages and live-game tabs, and whether they hold coral unit ids (the live game's questions; a page key
  `g-Acropora`). Step 2 lists them.
- Whether the queue (`SYNC.log`) and the sign-in record's `pending` reach `renameUnits` today for the fish.
  `mergeSubject` renames the saved copy and the baseline; step 4 checks the rest.

**Guesses (labelled):**

- The 14-day window is enough. The service worker updates an app at its next opening; a device left closed longer
  sends its queue late, and that is mapped at logging anyway.
- The structure stamp does not change with the ids, because it is computed from the curation's pair keys, which stay
  names. §4 A7 must confirm it.
- Line references are to function names; their line numbers move.
