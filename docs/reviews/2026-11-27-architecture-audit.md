# Architecture audit, first Claude pass: the dependency map, the components and the checks per change (2026-11-27)

**Status: read-only study, docs only (REE-284).** Pierre's «ok» of 2026-11-26 17:51 Manila (REE-284 comment `a6022659`):
a docs-only audit, a dependency map of the code on `main`, and a short list of small PRs; an independent Astra view is
added if it proposes a structural change. It feeds REE-311 (a version per component) and REE-121 (less CI per change).
Nothing in the app, the tools, the workflows or the sheet was changed. No decision is made here: every choice is
marked for Pierre or for the integrator.

- **Base:** `main` at `7cbd5460` (#1621), read 2026-11-27 from about 06:20 Manila.
- **Independence.** Written without the two independent architecture audits that REE-284's mandate of 2026-11-27
  commissions (Astra's report and the Fable audit). Neither was read or cited, so their comparison stays clean.
- **Reused, not redone.** The Linear document "Fondations de ReefID et futur Reef Recall · frontières vérifiées dans le
  code" (its 13 code links were rechecked: `main` is the commit it cites, and every line still holds what it says),
  [the architecture review of 2026-11-18](2026-11-18-architecture-code-review.md) (its findings are history; the
  numbers below are new), [the CI compute study](2026-11-24-ci-compute-cost.md) (costs and options; not repeated), the
  [incremental engine state study](2026-11-24-incremental-engine-state.md) (REE-265; not repeated).
- **Labels (rule W11):** **measured** is counted in this checkout by the scripts in
  [2026-11-27-architecture-audit/](2026-11-27-architecture-audit/) ("Reproduce"); **read** is read in the code, not seen
  running; **judgement** is my opinion; **guess** is untested.

## 1. Summary

1. **The engine is a real seam; the page around it is not (measured).** `core.js` is pure and is reached by `require`
   in 162 unit test files and by the sheet script as `CORE_`. The player page is the opposite: 12 of its 17 scripts form
   one dependency cycle through shared globals, and `app.js` is read by 14 of them. 17 places assign a top-level variable
   that another file owns (the player's progress `P`, the account `SYNC`, the photo stats `PMEM` and `PFMT`, …).
2. **The answer's contract crosses six files and no single test (read).** One logged answer is built in `quiz.js`, cut
   by version in `core.js` `logOut`, sent by `sync.js`, validated column by column in `Code.gs` `logAnswers_`, replayed
   by `core.js` `replayProgress`, and imitated by the fixture `tests/anslog.js`. Its version signals are four different
   things: the sheet's `VERSION`, the `*_SHEET` gates, the rules versions and the content version.
3. **For REE-311: seven candidate components, and content does not share the sheet's lifecycle today (read).** Content
   ships with the app (same deploy, same service-worker cache); the sheet only reads it, from GitHub `main`, cached up to
   21,600 seconds, at replay time. Pierre's hypothesis that content and database are one component holds for the future design
   he described, not for today's code (section 4).
4. **For REE-121: a change can be scoped safely by file only at the seams that exist (judgement on measured map).**
   A `core/` part, an explicit-API module, a Python builder or the docs can be checked by the tests that name them. A
   player-page file cannot: the cycle and the 168 unit test files that cut source text with `block()` make a
   file-level test selection unproven there (section 5).
5. **Six small PRs, and one structural change that needs an independent Astra view before any decision (section 6).**
   The first two are tests and docs only: one executable contract for the logged answer, and a ratchet on cross-file
   writes.

## 2. What runs where: the deploy units

| Unit | What runs | Deployed by | Its files | Evidence |
| --- | --- | --- | --- | --- |
| Player page | `index.html` and 17 classic scripts in one global scope, loaded in tiers (1: `core`, `app`, `sync`, `home`…; 2: `model`, `quiz`, `progress`, `live`; 3: `learn`; 5: `flag`, the Lab) | Deploy Pages on every push to `main` (`tools/build_site.py`, stamps, minify) | root `*.js`, `proto/` | `index.html:45-62` (read) |
| Service worker | The offline shell: code **and** the player's data files in one cache, `reefid-shell-vN` | Same deploy; `V` stamped (rule W15) | `sw.js` | `sw.js:3`, `sw.js:25-62` (`data.json`, `fish.json`, `curation-play.json` in `SHELL`) |
| Admin page | `admin.html`, `core.js` and 20 scripts, 3 of them lazy | Same deploy | `admin*.js`, `autosort.js`, `analysis.js`, … | `admin.html:44-68` (read) |
| Sheet script | Apps Script web app: `doGet_` / `doPost_`, the answer log, replay, stats, rights, live games; `core.js` embedded whole | Self-update from the `release` branch the merge train moves | `tools/sync/Code.gs` (12,704 lines, 4,456 its own) | `Code.gs:69` `VERSION = 236`, `Code.gs:3959` `SELF_BRANCH`, `tools/sync_core.py` (measured lines) |
| Content pipeline | Python and Node builders, the Candidate photos workflow, R2 upload | Pull requests; the workflow after a Publish | `tools/*.py`, `approved-photos.yml` | [DATA.md](../DATA.md) "Three writers" |
| Admin's Publish | Writes `curation.json` to `main` through the GitHub API | Pierre's click | `admin.js` | `admin.js:8715` (read) |
| CI | Checks (format, syntax, JSON, `sync_core`, versions, unit tests in 2 shards), Smokes (17 jobs + answer cost), CodeQL | Every PR push and every train | `.github/workflows/` | `checks.yml`, `smokes.yml` (read) |

The engine therefore runs in two deploy units with two clocks: the app goes live within minutes of a merge, the sheet
script at its next self-update. Rule D4 and its gates exist for that window (`core/rules.js:235-268`, read).

## 3. The dependency map

### 3.1 The player page (measured)

Method: each script parsed (acorn), its unresolved global references collected (eslint-scope) and matched to the file
that declares the name at top level; `core.js` counts through its export list (`core/exports.js`). A name is counted
once per pair of files. Files wrapped in a function that publish `window.X` (`home.js`, `tour.js`, `home-art.js`) or
`root.X` (`tips.js`) are under-counted as providers.

| File | Lines | Top-level names | `let`/`var` | Reads names of (file:count) | Its names are read by (file:count) |
| --- | ---: | ---: | ---: | --- | --- |
| `core.js` | 8,248 | 421 exports | 0 | none | app 68, model 59, sync 56, quiz 45, progress 38, learn 9, 8 others ≤ 5 |
| `app.js` | 4,667 | 453 | 69 | core 68, model 28, quiz 20, progress 19, sync 18, learn 14, 6 others | quiz 109, learn 63, sync 56, progress 51, model 46, tour 28, home 25, lab 22, live 21, zoom 15, 4 others |
| `quiz.js` | 3,616 | 243 | 24 | **model 110, app 109**, core 45, sync 16, zoom 5, idtips 5, progress 4, gloss 2 | app 20, progress 8, learn 8, model 3, 4 others |
| `model.js` | 2,738 | 312 | 21 | core 59, **app 46**, sync 5, quiz 3, progress 3 | quiz 110, progress 29, app 28, sync 20, learn 16, live 4, lab 2, tour 1 |
| `sync.js` | 2,320 | 180 | 17 | app 56, core 56, model 20, progress 12, quiz 2 | app 18, quiz 16, progress 11, model 5, live 4, 6 others |
| `progress.js` | 1,859 | 154 | 14 | app 51, core 38, model 29, sync 11, quiz 8, zoom 1 | app 19, sync 12, quiz 4, model 3 |
| `learn.js` | 1,747 | 123 | 12 | app 63, model 16, core 9, idtips 8, quiz 8, zoom 4, sync 1 | app 14, idtips 1 |
| `live.js` | 940 | 71 | 6 | app 21, core 5, sync 4, model 4, zoom 2, quiz 2 | app 1 |
| 9 smaller files | 31 to 580 | 0 to 40 | 0 to 2 | mostly `app.js` | few |

- **One cycle (measured).** `app`, `sync`, `model`, `quiz`, `progress`, `learn`, `live`, `zoom`, `gloss`, `idtips`,
  `install` and `proto/lab.js` are one strongly connected set: from any of them, a chain of global reads reaches every
  other. `core.js` reads none of them.
- **The model reads the page (measured).** `model.js` reads 46 names of `app.js`, the first ones `rankOf` and `SUBJ`
  at `model.js:39` (`rareOn`), `P` at `model.js:60`, then `UNITS`, `DATA`, `store`, `save`, `stateView`… It also calls
  into `sync.js` (`keptGet`, `syncSoon`, `ev`), `quiz.js` (`NEXTQ`, `dropPlans`, `winkSeen`) and `progress.js`
  (`achRecheck`, `mxLostNotice`). This is the "ambient state" REE-284's spot-check named, now counted.
- **Writes into another file's variables (measured, 17 on the player page, 4 on the admin page):**

  | Writer | Variable (owner) | Lines |
  | --- | --- | --- |
  | `sync.js` | `P` (app.js), `SYNC` (app.js), `syncTimer`, `loadSent` (app.js) | 689; 1839, 1971; 1045; 1802 |
  | `sync.js` | `PMEM`, `PFMT` (model.js) | 123, 125 |
  | `quiz.js` | `session`, `QOPEN`, `last` (app.js); `lastQs`, `SEENQ` (model.js) | 3611; 379, 477; 2204, 2522, 3074; 2204, 2522, 3075; 2394 |
  | `app.js` | `NEXTQ` (quiz.js); `GDIFF`, `CALSET` (model.js) | 753, 922, 3518; 921; 4406 |
  | `progress.js` | `NEXTQ` (quiz.js) | 90, 314, 326 |
  | `model.js` | `last` (app.js) | 1845, 2718 |
  | `learn.js` | `wantSearch` (app.js) | 274 |

  A reader of `P` in `model.js` cannot see from its file that `sync.js:689` may replace the whole object after a
  replay adoption. That is the hidden coupling with the highest stakes: the progress itself.
- **Load order as a contract (measured, read).** The `typeof X === 'function'` / `!==` / `'undefined'` guards number
  72 in `app.js`, 66 in `model.js`, 39 in `sync.js`, 28 in `quiz.js` (my regex counts `!==` too, so the figures are not
  strictly comparable with the 2026-11-18 review's). Most guard a call into a later tier (`index.html:33-43`).
  `tests/globalnames.test.js` already protects the one global scope against duplicate names; nothing checks who reads
  or writes what.

### 3.2 The admin page (measured)

- `admin.js` is the hub: 13,794 lines, 915 top-level names, 141 of them `let`/`var`; 12 admin files read its names
  (`admin-journey.js` 61, `admin-nodephotos.js` 58, `admin-fish.js` 38, `admin-analyses.js` 31 …). Eleven admin
  files, `admin.js` among them, form one cycle.
- **The existing good seams.** Nine files are wrapped modules with an explicit API (`root.X` in the browser,
  `module.exports` in Node): `autosort.js`, `analysis.js`, `admin-draft.js`, `presence.js`, `points.js`, `taxtree.js`,
  `reports.js`, `admin-content.js` and, on the player page, `tips.js` (read: `autosort.js:22`, `analysis.js:11`,
  `admin-draft.js:23`…). They read `core.js` through `require` or `root`, and their tests `require` them (section 3.6).
  This is the pattern the rest could follow.
- **Contracts duplicated by hand (read).** `admin-demo.js:7`: «Keep the reply shapes in step with Code.gs (answers_,
  stats_, users_, reports_)». The demo, `tests/gas.js` and the live smoke's in-memory sheet each restate the sheet
  script's replies; nothing derives them from one description.

### 3.3 The shared engine, `core.js` (measured)

- 23 parts joined by `tools/sync_core.py` (`tools/sync_core.py:36`), 421 exports (368 on 2026-11-18).
- **Who reads what:** the player page reads 209 exports, the admin 108, `Code.gs` 60; 17 are read by all three
  (`SUBJECTS`, `subjKey`, `startKey`, `contentApply`, `subjectOf`, `subjGroup`, `slateOf`, `gameOf`, `CHOICE`, `keysIn`,
  `treeScore`, `pctOf`, `replayProgress`, `replaySubject`, `nameClean`, `reservedName`, `nameHidden`). 150 exports
  are read by none of the three directly: they are internal to the engine or read by tests only.
- **By part:** the sheet script reads mostly `subjects.js` (14), `content.js` (7), `replay.js` (6), `elo.js` (6),
  `apology.js` (5). It never reads `routes.js`, `pages.js`, `achievements.js`, `pulse.js` or `stats.js`, yet it embeds
  them, because `core.js` is one file (`tools/sync_core.py` docstring).
- **Not engine (read).** `core/keys.js` (the organisation's name `ORG` and the storage keys), `core/routes.js` (the
  app's addresses), `core/pages.js` and `core/visits.js` (the visit summary), `core/achievements.js` and
  `core/pulse.js` are product or infrastructure. The verified code map says the same; the numbers above say which
  consumer needs which.
- **The scorer's inputs are prepared outside the engine (read).** `quiz.js:769-807` builds the scorer's input `q`
  from `model.js` functions (`photoDiff`, `famOf`, `confTerm`, `pgLook`, `startP`, `pfmt`, `genusDiff`…) before
  `scoreAnswer(P, q)` (`quiz.js:808`, `core/ability.js:202`). The replay meets the same values through the logged
  scoring record `sc` (`core/replay.js:276`). So the calculation is testable without a browser, but what feeds it is
  not.

### 3.4 Sync, storage and the sheet (read)

- `sync.js` is the client of the sheet: it reads 56 names of `app.js` and 20 of `model.js`, and writes `P`, `SYNC`,
  `PMEM`, `PFMT` (above). The queue of answers is written by `quiz.js` `logAnswer` (`quiz.js:1354`: `SYNC.log`, or
  `LOG0` and `ANONQ` when not signed in, 2,000 entries at most) and sent by `sync.js:896`.
- `Code.gs`: `doGet_` (`Code.gs:211`: stats, board, achievements, load with replays) and `doPost_` (`Code.gs:287`:
  saves with answers, live mode, anonymous answers, reports, self-delete …); `logAnswers_` (`Code.gs:491`) writes the
  27 columns of `LOG` (`Code.gs:47`), deduplicating by answer id; rights through `can_` (`Code.gs:1789`).
- **Content read by the sheet (read):** `data.json` and each subject's files from `raw.githubusercontent.com/…/main/`
  (`Code.gs:708`, `Code.gs:885`, `Code.gs:3787`), cached up to 21,600 seconds (`Code.gs:714`, `Code.gs:879`). A replay
  therefore uses the content on `main` when it runs, not the content the answer was given under.

### 3.5 Content and builders (read; [DATA.md](../DATA.md) is the full table)

- Three writers besides a PR: the admin's Publish (`curation.json` only, rule A1), the Candidate photos workflow
  (`data.json`, the photo lists, `img/`), the merge train (the `release` branch).
- `tools/datajson.py` is imported by 42 tools, `tools/inat.py` by 20 (rule C7), `tools/instance.py` by 6 (measured,
  `import` lines). The instance's layer composes over the sources (`tools/instance.py:235` `fish_source`).
- The players never read `curation.json`: the deploy builds `curation-play.json` (`tools/curplay.py`), which the
  service worker keeps with the shell.

### 3.6 Tests and what they read (measured)

| What | Count |
| --- | ---: |
| Test files: unit / smoke / check (by hand) / helpers | 336 / 10 / 7 / 19; 15 unit files tagged `@slow` |
| Unit test files that `require('./block')` (cut a span of source text) | 168 |
| Unit test files that `require('vm')` | 184 |
| Unit test files that only `require()` modules (no source text) | 50 |

Root sources by the tests that name them (`require` = loaded as a module; text = read as text, then `vm`, `block()` or
a regex):

| Source | `require` | Text |
| --- | ---: | ---: |
| `core.js` | 162 | 51 |
| `app.js` | 0 | 105 |
| `admin.js` | 0 | 65 |
| `quiz.js` | 0 | 63 |
| `model.js` | 0 | 55 |
| `sync.js` | 0 | 36 |
| `autosort.js` | 27 | 4 |
| `progress.js` | 0 | 30 |
| `tools/sync/Code.gs` | 0 | 27 |
| `learn.js` | 0 | 24 |
| `analysis.js` | 13 | 8 |
| `sw.js` | 0 | 20 |

- Every player-page file is tested only as text. Every explicit-API module is tested mostly by `require`.
- Of the 212 unit files that name `core.js`, the median names exports of 3 parts, the largest 15; `subjects.js`
  exports appear in 135 of them, `tree.js` in 98 (measured by export names, so a part-level selection is possible
  there).
- The smokes load whole pages (`admin.html?demo`, the app on fixtures), so a smoke cannot be traced to one file.

### 3.7 The contracts that cross a boundary (read)

| Contract | Producer | Consumers | Version signal today | Where |
| --- | --- | --- | --- | --- |
| The logged answer (`id`, `t`, `g`, `a`, `ok`, `m`, `ph`, `ch`, `e`, `th`, `sc`, `nw`, `rt`, `zm`, `tz`, `ty`, `tr`, `rj`, `s`, `rk`, `tn`, `ta`, `sp`, `pa`, `cv`) | `quiz.js` `answer` (also for live games, ids from `live.js` `liveAid`) and `winkAnswer` | `core.js` `logOut`, `sync.js`, `Code.gs` `logAnswers_` and `LOG`, `replayProgress`, the admin's readers, `tests/anslog.js` | Fields gated by `PA_SHEET` 141 and `CV_SHEET` 178; columns appended | `quiz.js:857-916`, `core/rules.js:256`, `Code.gs:47`, `Code.gs:491` |
| The scoring record `sc` | `core.js` `scoreLog` | `replayProgress`; the sheet's Scoring column | Rules versions | `quiz.js:874`, `core/ability.js` |
| The answer id | `core.js` `answerId` | `Code.gs` dedup (`newIds_`) | None (format fixed: 16 characters) | `core/rules.js:274` |
| The content version `cv` | `app.js` `contentVer`, `core.js` `contentVersion` | Answers' Content version; analyses | Itself a hash of file versions, curation part and structure stamp | `app.js:953`, `core/rules.js:284` |
| Progress rules | `core.js` `RVS`, `FISH_RVS`, `SEASLUG_RVS` | Device (adoption), sheet (replay), boards | `v` per subject (rule D5) | `core/rules.js:33`, `:139`, `:193` |
| The sheet's API | `Code.gs` | `sync.js`, `admin.js`, `live.js`, `tools/analyses.js`, `admin-demo.js`, `tests/gas.js` | `VERSION` in every reply; app gates `*_SHEET`; floor `SHEET_FLOOR` 131 (rule D4) | `Code.gs:69`, `core/rules.js:235` |
| The device's storage | `core.js` `KEYS` and migrations | Every page; the saved copy in the sheet (`reefid-sync-*` travel) | Key names and legacy lists | `core/keys.js:33` |
| The app's version | Deploy (`stamp_versions.py`) | `sync.js` `appVer` → `Code.gs` `behind_` (Events) | `<build>-<hash>` | `sync.js:1565`, `Code.gs:2361` |
| The data files | Builders, Publish | App, admin, sheet, service worker | `?v=` stamps per file (W15); no schema version | [DATA.md](../DATA.md), `core/subjects.js` |

## 4. For REE-311: the candidate components and what each must stay compatible with

The SemVer question (REE-311 comment of 2026-11-26 17:08) needs each component's public contract first. This table is
that input; it recommends no scheme.

| Candidate component | Its public contract (what a breaking change would break) | Version signal today | Must stay compatible with |
| --- | --- | --- | --- |
| **A. Player app** (the page, the service worker) | Sync requests it sends; device storage keys; addresses (`core/routes.js`) | `<build>-<hash>` (`appVer`), `sw.js` `V` | Old shells kept offline by the service worker (`behind_` logs them); stored keys on devices (`core/keys.js` migrations); the live sheet script, which may be older (rule D4) |
| **B. Learning engine and rules** (`core.js` scorer, replay, rules) | The progress a log replays to; the scoring record `sc`; the rules version per subject | `RVS` / `FISH_RVS` / `SEASLUG_RVS` (D5), but no version of the engine code itself | Every stored answer since the first (replayed under today's rules, D9); old rows with absent fields; the same code in two deploy units |
| **C. Sheet script and sync protocol** | `doGet_`/`doPost_` request and reply shapes | `VERSION` (D3), gates, floor | Apps still offline with queued answers (up to 2,000 per queue); apps that send no `av` (`oldApp_`); the admin and the analyses job |
| **D. Activity data** (the Answers tab, saved progress copies, groups, rights) | The 27 `LOG` columns; the saved copy's format | Columns appended; none for the saved copy | All historical rows; restores from backup ([BACKUP.md](../BACKUP.md)) |
| **E. Published content per subject** (data files, `curation-play.json`) | Unit ids (REE-256), file formats, photo ids | `?v=` stamps; `cv` per answer | Answers that name old unit ids (`renameLogEntry`); offline devices holding the previous files in the shell cache |
| **F. Admin** (Studio-like operations: Publish, curation, groups) | `curation.json`'s format; the admin calls of the sheet API | `admin.js?v=` stamp | `curation.json` merged key by key; the sheet's rights (`can_`) |
| **G. Content pipeline** (tools, workflows) | The files it writes (DATA.md) | Git only | The formats E consumes; external sources (C7) |

**Do content and the database share a lifecycle today? No (read).** Content (E) is committed to git and deployed with
the app (A), in the same service-worker cache (`sw.js:25-62`). The database (C, D) holds activity, not content; it reads
content from GitHub `main` at replay time (`Code.gs:885`, cached up to 21,600 seconds). Pierre's understanding that "the
database and the content are one component in the new design" (REE-311, 2026-11-26 17:08 and 17:13: «A vérifier»)
describes a future store, not this code. Today's split matters for compatibility: the replay of an old answer uses
today's content, and `cv` names the content an answer saw without any table that maps it back to files (guess: the
mapping could be rebuilt from git history and the stamps, not tried).

**Questions the scheme must answer (for Pierre, through the integrator; not asked here):**
- whether B's code gets its own number beside the rules versions, or the rules versions are B's version;
- whether a new answer field is a minor change everywhere (today: yes, `Code.gs` keeps only the fields it knows,
  `quiz.js:873`) and a removed one a major change;
- whether E's unit ids are part of E's contract (REE-256 says they are moving to one scheme).

## 5. For REE-121: which checks each change needs

"Always" below is the Checks workflow on every PR (format, syntax, JSON, `data.json` layout, `sync_core --check`,
versions, every unit test in two shards). "Smokes" is the 17-job matrix plus the answer-cost job, skipped only for
docs-only PRs (W12). "Local" is what W14 asks before a push. "Scopable" says whether this map shows a narrower set to be
safe; none of it changes a rule.

| Change in | Unit tests that name it (measured) | Local smoke (W14) | What the coupling forces | Scopable by file? |
| --- | --- | --- | --- | --- |
| Docs only | `tests/docs.test.js` | none | Nothing | Yes. Checks still runs every unit test; narrowing it is the CI study's question (b) for Pierre |
| One `core/` part | Those naming its exports (e.g. `subjects.js` 135, `tree.js` 98, `stats.js` 2) plus `sync_core`, `coreparts` | draw or fish when the draw or `SUBJECTS` moves | `Code.gs` embeds it: a replay change also needs rule D5 and a learning check (L11) | Yes for unit tests, by export names (guess until a past-failure check, below) |
| An explicit-API module (`autosort`, `analysis`, `taxtree`, `presence`, `reports`, `points`, `admin-draft`, `admin-content`, `tips`) | Its `require` tests (`autosort` 27, `analysis` 13 …) | admin 1280 (W14) | The admin page that loads it | Yes for unit tests |
| A player-page file (`app`, `quiz`, `model`, `sync`, `progress`, `learn`, `live`, …) | 105 / 63 / 55 / 36 / 30 / 24 / 7 text readers | pages part, draw, profiles, pending, fish per W14 | The cycle (3.1): a global read or write reaches every other file | **No** at file level; smokes per page part stay |
| An admin-page file | `admin.js` 65 text readers; smaller files 2 to 11 | admin 1280 | `admin.js` hub | Partly: the wrapped files yes, `admin.js` no |
| `tools/sync/Code.gs` | 27 text readers; `sheetversion`, `gates` | none locally; `admin` and `live` smokes use in-memory sheets | D3, D4; `admin-demo.js` and `tests/gas.js` mirror its replies by hand | Yes for unit tests; the mirrors are the risk |
| A data file or builder (`tools/*.py`, root JSON) | The builder's own tests; `checkjson`, `datajson --check` | none for a tool; the pages read data, so data changes keep the smokes | Smokes read the data (`smokes.yml` comment) | Tools yes; data files no |
| `sw.js`, `index.html` loader | 20 text readers of `sw.js`; `tiers`, `versions` | net | Every page loads through them | No |

**What would make the narrower sets safe (judgement).** Before any check is skipped, the selection must have caught
the failures of past runs: replay the red unit-test runs of a past window against "the tests that name the changed
files" and count misses. That is measurable from the Actions API (the CI study's scripts already read it) and is not
done here. Skipping a test in CI changes W12, W14 or W26: Pierre's decision. Printing the impact set for information is
the integrator's call.

The two questions the verified map asked, answered on today's code (read):
- *Can a calculation change be verified without a server or a browser?* For the scorer and the replay, yes
  (`require('../core.js')`). For the scorer's inputs (`quiz.js:769-807` over `model.js`), only through `block()`
  extractions or the browser smokes.
- *Can a screen change be verified without re-examining the whole calculation?* Not by construction: the page files
  share the model's state, so W14's smoke parts stand in for a boundary that the code does not have.

## 6. Small PRs, ranked, and one structural change

Ranked by value for REE-311 and REE-121 over risk. None changes what players see. Each needs a check against the open
PRs and the files of REE-265, REE-338 and REE-343 before it starts (rule W27); on 2026-11-27 the open PRs were #1622
and #1554, neither on these files (measured, REST API).

1. **One executable contract for the logged answer.** A field table in `docs/spec/sync.md` and one test that the
   producers' keys (`quiz.js` `ans` at `quiz.js:857`, `winkAnswer` at `quiz.js:1408`), `core.js` `logOut`'s gates, `Code.gs` `LOG` and
   `logAnswers_`, and `tests/anslog.js` agree, and that a synthetic two-answer log replays to the expected counters.
   Files: one new test, `docs/spec/sync.md`. Risk: low (tests and docs). Before building, read
   `tests/contentver.test.js`, `tests/findxlog.test.js` and `tests/ansrows.test.js`, which cover parts of it. Feeds
   REE-311 (C and D) and the verified map's first step.
2. **A ratchet on cross-file writes.** A test that lists the 17 player and 4 admin writes of section 3.1 and fails on a
   new one, reading the page lists as `tests/globalnames.test.js` does. Files: one test; perhaps `checks.yml`. Risk:
   it needs a JavaScript parser (acorn and eslint-scope, about 4 packages) installed at test time like Prettier, a new
   pinned dependency (rule W9, `tools/stack.json`); a choice between that and a regex version with known misses is the
   integrator's.
3. **Remove the first writes, one owner at a time.** `sync.js:123,125` assign `model.js`'s `PMEM` and `PFMT`: a
   setter in `model.js` beside `statsJoin` (`model.js:1943`), with no change of value. Files: `sync.js`, `model.js`.
   Test: the stats tests that read both, then `draw.smoke.js` (W14). Risk: low to medium (two sensitive files).
4. **Document the content lifecycle the sheet sees.** In `docs/spec/sync.md` "Full replay": the replay reads `main`'s
   files, cached up to 21,600 seconds, never the content an answer saw (`Code.gs:879-885`). Docs only. Check first whether
   the spec says it already.
5. **An impact report for information.** A tool that prints, for the changed files, the unit tests that name them
   (section 3.6), in the brief or the PR body; nothing skipped. Files: one tool, its test. Risk: low. Measuring it on
   past red runs (section 5) comes with it.
6. **Name the scorer's input builder.** Move `quiz.js:769-807` into one function of `model.js` that returns `q`, so a
   test can call it with a stub state instead of cutting `quiz.js`. Files: `quiz.js`, `model.js`. Risk: medium; the
   same lines are where REE-338 and REE-343 would change the photo difficulty input, so it waits for them or goes with
   them (W27).

**Structural change (judgement). Needs an independent Astra view before any decision.**
*An explicit player state and an engine-only core.* (a) One module owns the player page's shared state (`P`, `SUBJ`,
`SYNC`, the photo statistics, the session and the question plans), with reads through it and the 21 cross-file writes
gone; the other files keep their globals until each is moved. (b) `core.js` is cut into the engine that `Code.gs`
embeds (subjects, tree, content, elo, ability, score, rules, replay, typing, delta, merge, curation) and an app part
(keys and `ORG`, routes, pages, visits, achievements, pulse, apology). (c) Later, ES modules for the page files, which
the static deploy and the service worker allow (guess: not checked against the minify step and the stamps).
Why it is structural: it changes how every page file is written and loaded, what `tools/sync_core.py` embeds, and the
source-text tests (168 files use `block()`). It is the condition for scoping player-page checks by file (section 5) and
for a second client of the engine (REE-283). What would decide it: the misses of a file-level test selection on past
red runs, the size of the diff of (b) alone, and whether REE-265's state views already give the owner of (a).

## 7. What I did not verify

- No test, smoke or app run beyond the docs tests: the map is static. A name read only inside a `typeof` guard counts
  as a read.
- Names published through `window.X` or `root.X` are not followed (`home.js`, `tour.js`, the wrapped modules), so
  their users are under-counted.
- The test map matches file names in test sources; a test that reads a file through a computed path is missed.
- No representative recent PR was traced through CI here; the CI study's per-run costs stand.
- Whether `seaslug.json` and `seaslug-game.json`, absent from `sw.js` `SHELL` while `app.js:3003` fetches them, are
  kept offline by another path: not checked.
- No player data, sheet or production service was read (rules D1, D2).

## 8. Reproduce

From the repository root at `7cbd5460`, with acorn 8.14.0 and eslint-scope 8.2.0 installed by npm in a temporary
folder (never in the repository):

```
NODE_PATH=<temporary folder>/node_modules node docs/reviews/2026-11-27-architecture-audit/depmap.js .
node docs/reviews/2026-11-27-architecture-audit/testmap.js .
node docs/reviews/2026-11-27-architecture-audit/corepart_tests.js .
```

The `typeof` guards: `grep -cE "typeof [A-Za-z_\$][A-Za-z0-9_\$]* *[!=]== *'(function|undefined)'" <file>`. The tool
imports: `grep -lE "^\s*(from M import|import M\b)" tools/*.py`.
