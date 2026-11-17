# Architecture and code review (2026-11-18)

An independent review of the whole code base, made at Pierre's request of 2026-11-18. He asked for a modular code base,
shared as far as possible between every part of the app and every game mode, with no unjustified exception, and one
that follows good development practice. He also said he was open to any feedback, complete redesigns included. This is
an open mission (rule W8): it questions our own choices and rules where they shape the code.

- **Base:** `main` at `b6e0d263` (#1060), 2026-11-18 ~06:40 Manila.
- **Read-only:** nothing in the app was changed. No simulation was run. The unit tests were run once, locally, to time
  them.
- **Labels (rule W11):**
  - **measured** means counted or timed in this checkout (commands in the appendix);
  - **read** means read from the code, not observed running;
  - **estimate** is a computation from measured inputs;
  - **judgement** is my opinion as a reviewer.
- **Earlier reviews this one builds on:**
  - [the code re-review of 2026-11-01](2026-11-01-code-re-review.md) (modules);
  - [the engine coherence review of 2026-11-06](2026-11-06-engine-coherence-review.md) (its F5 and F9 are still open,
    below);
  - [the professionalise study of 2026-11-14](2026-11-14-professionalise-study.md) (hosting, backend, accounts). Its
    analysis of hosting, costs and accounts is not redone here.

## Executive summary

**Verdict (judgement).** The product logic is better than the code that carries it. The core idea is right and rare in
a project this young: every answer is logged, and progress is a deterministic replay of that log. One pure engine
(`core.js`) runs on the phone and in the sheet, and the two agree by construction. The test volume and the shipping
discipline are well above the usual for a two-week-old app.

The code around that idea, though, grew by accretion, one decision at a time, and three structural debts now cost more
on every change than they save:

1. **Two engines hide behind one subject registry.** The corals run on one data path (`data.json`, `DATA`). The fish and
   the sea slugs run on a second one, still named after the fish (160 `fish*`/`FISH*` identifiers). The rule that the
   engine never names a subject (rule S1) is checked by a regular expression that this split passes.
2. **The app is about 1,100 global names in one browser scope, with no module system.** It holds one mutable "current
   subject" that functions swap in and out (`inSubject`). It needs 205 `typeof X === 'function'` guards because the
   scripts load in tiers.
3. **History is never deleted.**
   - 34 sheet-version gates (17 of them below v100, the live script is v167) still choose between today's rules and
     retired ones.
   - Migration layers from retired models remain, despite rule W3.
   - Comments carry the decision log: 54% of `core.js`'s bytes, 66% of `model.js`'s.
   - The docs reach about 2 MB, and `ARCHITECTURE.md` alone is 710 KB.

None of these is urgent for the players today. All of them slow every agent and every PR. They will decide whether a
fourth subject, a second organisation or a real backend is a week or a month of work.

### Top 10 findings (ranked by impact)

| # | Finding | Impact | Effort | Risk of the fix |
|---|---|---|---|---|
| R1 | Two engines behind one registry: the coral path and a "tree" path named after the fish, which also runs the sea slugs; corals are special-cased through flags (`replay`, `pool.files[0] === 'data.json'`) | High: every feature is built twice or branched; a fourth subject repeats the sea slugs' 44 commits | XL (in M steps) | Medium |
| R2 | Global mutable state and no modules: about 1,100 top-level names in the player app, `SUBJ`/`P`/`Q`/`FISH` swapped by `inSubject` and `treePull`/`treePush`, 205 `typeof` guards | High: hidden coupling, re-entrancy and async hazards, tests forced to cut source text | L | Medium |
| R3 | Retired paths still run: 34 version gates, and a new device has `sheetV() = 0` until its first reply, so it plays the corals on the pre-rules-9 progress model (`model.js` `domRules`); migration layers kept against rule W3 | High (correctness and size) | S-M | Low |
| R4 | No minification: the player's JS is 474 KB gzipped, about 181 KB minified (estimate: about 27 s less at the field's measured 86 kbit/s, first visit) | High for field RAs | S | Low |
| R5 | The sheet as a database: `Code.gs` is 374 KB of its own code beside the embedded engine, re-implements the Elo and trust of `core.js` (F5 of 2026-11-06, open), and works around cell, cache and lock limits (26 chunk, 21 `cacheBig`, 35 `CacheService` sites); it self-updates from `main` | High (growth, bus factor) | XL (first step M) | Medium |
| R6 | `core.js` is a god module: 7,194 lines and 368 exports; storage keys, subjects, licences, fish tree building, the content editor, merges, Elo, achievements, typing, routes, page telemetry, all in one IIFE loaded in tier 1 | Medium-high | M | Low |
| R7 | The subject configuration is two large registries with about 87 extension points (`SUBJECTS` 43 fields, `UNITS` 44): data, UI copy in HTML strings, server gates, admin page lists and analytics flags mixed | Medium-high | M | Low |
| R8 | Data formats: `data.json` patched in place by 23 one-shot `apply_*.py` (9 referenced nowhere) while fish and sea slugs are built from sources; `curation.json` (2.7 MB, rule A1) is mostly machine output; corals at its root, others under a key, aliased (`treeCur`); three id schemes, `s:` meaning two things | Medium (high when a second organisation comes) | L | High (costly to undo: questions for Pierre) |
| R9 | Tests tied to source text: 68 files cut source with `block()` (226 calls), 101 run code in `vm`, 73 read browser files; rule S1 checked lexically; 4 min 15 s locally for 1,864 tests, the slowest ones statistical | Medium | M | Low |
| R10 | Docs and comments as a changelog: `ARCHITECTURE.md` 710 KB and `LEARNING.md` 718 KB (each over 150k tokens, more than an agent reads in one pass); 294 of 682 commits touch `ARCHITECTURE.md`; 416 "Pierre, date" and 458 Q-number references in 8 code files | Medium | M | Low |

Lower ranks: R11 (admin.js, 11,720 lines, helpers duplicated with the app), R12 (per-subject Python pipelines), R13
(security: what changes with growth), R14 (rules that shape the code).

### The target in five lines

1. **One taxon-tree engine.** Every subject, corals included, is a tree of ranks with photos at the leaves, described by
   a manifest (data) and a few capability modules (code); the word "fish" leaves the engine.
2. **Native ES modules, no bundler in development.** One explicit `SubjectContext` object replaces `SUBJ`/`P`/`Q`/`FISH`
   and `inSubject`. The pure core is split into small modules, which the deploy concatenates for Apps Script and minifies
   for phones.
3. **The answer log is the only state that travels.** Sync exchanges answer events (a set union by answer id), and
   progress is the shared reducer's fold. Most of the merge, delta and legacy-key code goes.
4. **A versioned HTTP API between app and server.** It is implemented today by `Code.gs` and later by a Worker and D1
   from the same core modules. The deploy order (server first, then app) replaces the version gates.
5. **Data and docs:**
   - each data file has a schema and a version;
   - human curation sits apart from machine judgements;
   - one id scheme;
   - decisions live in short append-only ADRs, and docs and comments describe the present.

### The first steps (cheap and safe; detail in "Migration path")

1. A minify step at deploy (R4): a day of work, about 27 s off a first visit in the field, with no behaviour change.
2. A gate floor and a deploy order (R3):
   - delete the gates the live script has long passed;
   - make the app deploy wait for the script's new version;
   - stop new devices from running retired rules.
3. A mechanical rename `fish*` to `tree*`, and `core.js` split into files that `tools/sync_core.py` concatenates
   (R1, R6). No behaviour change; it unblocks everything else.

## What is good, and should stay

These are judgements, each with its evidence. They are the parts the redesign below keeps.

- **The answer log as the reference, replayed by the same engine on both sides** (rule D9). `core.js` `replayProgress`
  (core.js:5977) and `scoreAnswer` (core.js:5328) are the only scorer. The app calls them per answer (quiz.js:770), and
  the sheet calls them in its replay through the embedded copy (`CORE_`). This is event sourcing done right, and it is
  the base of the target architecture.
- **Rules versions** (`RVS`, `FISH_RVS`, `SEASLUG_RVS`). They turn "we changed the algorithm" into a recorded,
  replayable event. Few production learning apps do this.
- **The tiered loader** in `index.html`, with retries per script and per stylesheet, built from field HAR data. It is a
  real answer to a real 86 kbit/s line.
- **Security basics** (docs/SECURITY.md):
  - the CSP with hashed inline scripts;
  - the token kept in `sessionStorage`, its vault encrypted;
  - strict input filtering in the sheet;
  - caps per window;
  - the trust filter that keeps bots and random clicking out of the statistics;
  - `spreadsheets.currentonly` as the only sheet scope.
- **The volume and intent of the tests**: 196 unit files, 1,864 tests, 7 Playwright smokes in 14 CI jobs. Rule D1 (tests
  never reach the real sheet) and `tests/gas.js`, an in-memory sheet, are mature choices.
- **Shipping mechanics**:
  - a worktree per agent;
  - the merge train;
  - the deploy stamping its own version numbers (rule W15), so PRs never conflict on them;
  - `curation-play.json` trimmed for players.
- **`home.js`, `tour.js`, `tips.js`, `home-art.js`** are already wrapped modules with no globals. They show the target
  style works in this code base.

## Measurements

| What | Value | How |
|---|---|---|
| Player JS (tiers 1-2: core, app, sync, home, tour, model, tips, quiz, learn, progress) | 1.39 MB raw, 474 KB gzip | measured, `gzip -9` |
| The same, minified with terser 5.36 (`-c -m`) | 501 KB raw, 180 KB gzip (tier 1: 294 → 108 KB; tier 2: 180 → 73 KB) | measured |
| Comment bytes (`//` lines) | core.js 54%, model.js 66%, Code.gs 56%, app.js 46%, quiz.js 47%, sync.js 49%, admin.js 25% | measured |
| Largest files | admin.js 11,720 lines / 704 KB; core.js 7,194 / 428 KB; analysis.js 4,793; app.js 4,208; quiz.js 2,839; Code.gs 10,698 / 802 KB (3,498 lines / 374 KB of its own, the rest the embedded core.js) | measured |
| Top-level declarations shared in the player page's global scope | 1,103 in app, sync, model, quiz, learn, progress, lab; plus 368 `core.js` exports | measured (regex on line starts; approximate) |
| `typeof X === 'function'` / `'undefined'` guards | 205 (app.js 42, sync.js 31, model.js 27, admin.js 26, quiz.js 14) | measured |
| Mutable top-level `let` in the player app | about 90 (app.js 35, model.js 13, quiz.js 11, sync.js 10…) | measured |
| `fish*`/`FISH*` identifiers defined in the front end | 160 distinct; `coral*` 2; `seaslug*` 5 | measured |
| `SUBJECTS` fields (union) / `UNITS` fields (union) | 43 / 44; coral 32 + 18, fish 36 + 39, sea slug 36 + 36 | measured (`node`, parsing `app.js`) |
| Sheet-version gates (`*_SHEET`) | 34 numeric, from v28 to v167; 17 below v100; `sheetV()` read 27 times | measured |
| Sea-slug commits / files they touched | 44 commits; app.js 10, Code.gs 9, core.js 9, learn.js 7, admin.js 6, sync.js 4, model.js 4, quiz.js 3, progress.js 3 | measured (`git log --grep`) |
| Unit tests | 196 files, 55,855 lines, 1,864 tests; 4 min 15 s wall locally (`node tests/run.js`), 702 s summed | measured |
| Tests cutting source text | `block()` in 68 files (226 calls); `vm` in 101; browser sources read in 73 | measured |
| Smokes | 7 files, 21,784 lines; 14 CI jobs, 25.5 job-minutes, about 4.5 min wall; last 100 runs: 82 success, 11 failure, 6 cancelled | measured (`gh run`) |
| Docs | ARCHITECTURE.md 710 KB (743 lines), LEARNING.md 718 KB, ROADMAP.md 197 KB, rules 132 KB; about 2 MB in `docs/` | measured |
| Commits touching each file (682 since the history rewrite) | ARCHITECTURE.md 294, ROADMAP.md 236, admin.js 117, Code.gs 117, app.js 102, core.js 97 | measured |
| Decision references in code | "Pierre, 20…" 416 times in core, app, model, quiz; Q-numbers 458 times in 8 files | measured |
| Python tools | 81 files, 19,325 lines; 23 `apply_*.py` (one-shot), 9 referenced nowhere | measured |

## Findings

Each finding gives the problem, the evidence, the proposal (incremental first, redesign where warranted), the effort
(S under a day, M a few days, L one to two weeks, XL more, all for one agent with reviews) and the risk. Where a step is
costly to undo (a data format, a structure other code follows, players' stored data), it says so and lists the question
for Pierre.

### R1. Two engines behind one subject registry (high)

**Problem.** Rule S1 says a subject differs only by a field of `SUBJECTS` or a function of `UNITS`. In practice there
are two engines.

1. **The coral engine.** It runs on `data.json`, the global `DATA`, `applyCuration`/`applySlots`, views (colony,
   close-up, corallites) and curation at the root of `curation.json`.
2. **The tree engine.** It runs on `fish.json`-shaped files, the globals `FISH`, `FISHP`, `FISHH`, `FISHRAW`, `FISHF`,
   `FISHST` and `FISHON`, `fishGen`, `fishGenera`, `fishCurate` and `fishPhotos`, with curation under a key.
   - The sea slugs were added by running them through this fish engine: `SUBJECTS` seaslug says "Read through the fish
     engine" (core.js:732).
   - Their curation is aliased under the fish's key so the fish code finds it:
     `treeCur = (S, cur) => ... {...cur, fish: cur[k]}` (core.js:1726).

The engine then tells the two apart without naming them, which the S1 test cannot see:

- `SUBJECTS.find(x => x.pool.files[0] === 'data.json')` finds "the corals" by their file name (app.js:675, app.js:1221);
- `S.replay` is true for the corals only and means "the subject the sheet rates photos and holds the opening from"
  (core.js:883, 46 uses);
- `UNITS[id].get` exists only for tree subjects (app.js:1181);
- `!SUBJ.replay` switches the progress rules (model.js:1436);
- 48 `FISH ?`/`FISH &&` tests read "is a tree subject loaded".

Other signs:

- `GX` (app.js:1131) looks a unit up in `DATA.gen`, then `DATA.x.gen`, then `FISH.gen`. The two engines share one
  namespace, kept apart only by the id prefixes.
- 102 direct `DATA.gen` reads remain in the front end.
- The Python side mirrors it. `tools/seaslug_game.py` imports `fish_game` three times, and `tools/fetch_seaslugs.py`
  imports a dozen names from `fetch_fish`. "fish" is the name of the generic library.

**Why it matters.**

- Every feature is written once per engine or branched:
  - Photo stats › Overview has `pstatsFish`;
  - the analyses have `photoMetaFish`;
  - the admin has `renderFishUnits`, `fishTile` and their coral twins.
- A reader cannot tell "fish-specific" from "any tree subject": `fishGate` gates the sea slugs' circles, and
  `fishTypeNames` reads the sea slugs' names.
- The third subject took 44 commits and touched every core file (Measurements). The registry did not make it
  configuration.

**Proposal.**

- **Incremental (M, behaviour-neutral, easy to correct):**
  - rename the tree engine's identifiers from `fish*`/`FISH*` to `tree*`/`TREE*`, keeping the fish-only parts (FishBase,
    the IMR fish presentation, winks) under `fish`;
  - replace the three proxies above with named capabilities (`S.flat`, `S.ratesPhotos`, `S.hasTree`), so the S1 test can
    check that the engine never compares a capability to a file name.
- **Redesign (XL, in steps; costly to undo):** make the corals a tree subject.
  - A coral tree is three ranks (family, genus; species where the photos know it) with photos at the leaves, carrying
    `view` as a photo attribute.
  - `tools/` builds `coral.json` in the `fish.json` shape from the same sources that build `data.json` today. The coral
    learn pages, the Coral ID Key and the Lab read the genus records through one accessor.
  - `applyCuration`/`applySlots` become the coral photo-selection capability of the shared engine.
  - When it is done, `DATA`, `GX`'s three-way lookup, `S.replay`'s double meaning and about half of the special cases go.
- **Order:** rename first; then the capability flags; then the coral tree behind a flag, compared answer by answer
  against the current engine on the real log (rule L12); then the switch.

**Risk.** Medium. The corals carry the players' oldest progress. A wrong unit id breaks their replay, so the coral tree
must keep the genus names as unit ids (see R8).

**Questions for Pierre (costly to undo):**

- (a) Corals as a tree subject, units unchanged (the genus name stays the id)?
- (b) The sheet's "photo ratings and opening" role (`replay: true`) extended to every subject, or kept for the corals?

### R2. Global mutable state, no module system (high)

**Problem.** The player app is about 12 classic scripts sharing one global scope:

- 1,103 top-level declarations, plus the 368 names `core.js` assigns to `window`;
- about 90 mutable `let` globals. The state that matters most is global and reassigned: `DATA`, `SUBJ`, `P` (progress),
  `Q` (quiz state), `FISH*`, `TREE_AT`, `CUR`, `PSTAT`, `PGD`, `PCONF`, `PMEM`, `NEXTQ`;
- 205 `typeof X === 'function'` guards, because a tier-1 script may run before the tier-2 script that defines what it
  calls (sync.js:118, 304, 313: `typeof treeWith === 'function' ? treeWith(...) : ...`).

**Dynamic scoping through globals:**

- `inSubject(id, fn)` (app.js:1399) saves `SUBJ`, `P`, `Q` and `TREE_AT`, loads another subject's progress from storage,
  runs `fn`, and restores them in `finally`.
- `treePull`/`treePush` (app.js:1172-1177) copy seven globals in and out of a per-subject object.
- `SUBJ_HOOKS` re-runs listeners on every swap.
- The code says "the corals have none: on them the globals stay the last tree subject's" (app.js:1145). A coral screen
  can therefore read a fish `FISH` by mistake.
- `inSubject` is synchronous. A `fn` that starts a promise sees the swapped globals only until its first `await`.
  Today's callers (progress.js:599-755, sync.js:88-578, quiz.js:129) look synchronous (read), but nothing enforces it.
- Rule S1 encodes this design: the engine works on "the current subject (`SUBJ`, `P`, `Q`)".

**Why it matters.**

- Any function may depend on any global. The dependency graph is invisible, so the tests cut functions out of the source
  and feed them fake globals in a `vm` (R9).
- Name clashes are avoided only by discipline. The admin and the app define `esc`, `img`, `photoIdx`, `hashNow`, `save`
  and `author` separately (app.js:8, admin.js:40…); `fishFamOf`, `sheetWord`, `rpOn` and `loadStats` exist in two files
  with different meanings.

**Proposal.**

- **Native ES modules (L, in steps).** `<script type="module">` and `import` work in every browser the RAs use, and need
  no bundler or npm.
  - Tiers stay: a tier is a dynamic `import()` of its entry module, and the loader keeps its retries.
  - The CSP already allows `'self'`.
  - The service worker caches modules like scripts.
  - Order:
    1. `core.js` becomes `core/*.js` modules (R6);
    2. leaf modules (`tips`, `home`, `tour`, already wrapped);
    3. `model.js` as pure functions over explicit inputs;
    4. `quiz`, `learn`, `progress`, `sync`;
    5. `app.js` last.
  - During the move, a module may still publish names on `window` for the scripts not yet converted.
- **A `SubjectContext` (M, after modules).** One object per subject holds its manifest, units, curation, progress `P`,
  quiz state `Q` and photo statistics. Functions take the context as an argument; the UI holds `ctx = contexts[current]`.
  - `inSubject(id, fn)` becomes `fn(contexts[id])`;
  - `treePull`/`treePush`/`TREE_OF` disappear;
  - the async hazard disappears;
  - two subjects can be computed at once (each leaderboard's tree, sync.js:118).

**Risk.** Medium. The change is wide but mechanical, and each step is testable. The smokes cover the user paths.

### R3. Retired paths that still run (high, cheap)

**Problem: gates.** Rule D4 says the app never gets ahead of the sheet script. It is implemented as 34 constants
`X_SHEET = N`, each `sheetV() >= N ? new : old`. None has ever been removed:

- `RV_SHEET = 28` (core.js:5677), `PGD_SHEET = 31` (model.js:1454), `RT_SHEET = 32`, `START_SHEET = 36`;
- 17 below v100, against a live script at v167.

The script updates itself from `main` within about 15 minutes of a merge, so it passed v100 days ago. The gates are not
dead, though:

- `sheetV()` reads a stored number that defaults to 0 (sync.js:1626);
- on a new device, or one that has not had a reply yet (offline first launch, a slow line), every gate reads "old
  script";
- `model.js` `domRules = () => !SUBJ.replay || sheetV() >= DOM_SHEET` (model.js:1436) then puts the corals on the
  moving-average progress rules retired at rules version 9;
- `scoreOn` (model.js:1776) shows the fish headline % without its tree score;
- `rtOn` (model.js:1431) leaves the response times out of the step weights;
- `structOn` (app.js:1214) builds the units without the editor's structure, then rebuilds them on the first reply
  (`structSeen`).
- So a new player's first answers are scored by a retired model and silently corrected later (read; not observed
  running).

**Problem: migration layers.** Rule W3 says "no backward compatibility … no permanent dual read". Yet the engine keeps:

- `LEGACY_KEYS`, `keyLegacy`, `withLegacy`: the app still sends the pre-rename key names to the sheet "for a device still
  on an app from before the rename" (sync.js:899, core.js:21-135);
- `DATA_KEYS_`, which reads both names in Code.gs (Code.gs:11);
- `FISH_RENAMED` (100 `t01`-style ids, core.js:291) "kept while old ids may still arrive";
- the retired-model branches listed as F9 on 2026-11-06, all still present: `s.lv` (core.js:5194, 5229), `PROG.OLD`
  (core.js:4202), `levelSeed` (core.js:3762), `memRecalc` (core.js:3139);
- in `replayProgress`, the option flags `dom`, `memory` and `time`, which re-run the rules before versions 9 and earlier
  inside one function (core.js:5977-5995).

**Proposal.**

1. **A deploy order instead of gates (M).**
   - The merge train already knows when `Code.gs` changes. Pages deploys after the train, so the deploy step can call the
     script's `autoUpdate` (or wait for `?v=` to report the new `VERSION`) before it publishes the app.
   - The app then never runs ahead of the script by construction, and rule D4 holds without a gate per feature.
   - What remains is a single `MIN_SHEET`: an app that gets a reply from an older script (a rollback) shows "updating"
     and keeps its answers queued, as it does on `busy`.
2. **A gate floor (S), now, even before the deploy order.**
   - Treat an unknown `sheetV()` as the version the app was built against: write `MIN_SHEET` into the app at deploy.
   - Delete every gate at or below it, with its old branch.
   - A test fails when a gate is more than N versions below `VERSION`.
   - This removes about 28 gates (those below v150) and their old branches, a few hundred lines (estimate).
3. **Migrations with an end date (S each, after one read of the sheet).**
   - Any agent may read the sheet (AGENTS.md "Data access"). Check that no saved copy holds `s.lv`, a non-numeric `pg`,
     an old key name or a `t01` id; rewrite the few that do once (`ONCE_`); then delete the readers.
   - `replayProgress` keeps only the rules in force. An old rules version is replayed by checking out its commit, not by
     a flag.

**Risk.** Low for the gates below the live version. The deploy order needs care on the train (the sheet's Apps Script
quota, a failed update), so keep the floor even then.

**Question for Pierre:** (c) May the app stop sending the pre-rename key names (`withLegacy`) and stop reading `t01`
fish ids, once a read of the sheet shows no device still uses them?

### R4. Phones download the comments (high for field RAs, cheap)

**Problem.** There is no minification. Tier 1 (what Home waits for) is 294 KB of gzipped JavaScript; tier 2 (the quiz)
adds 180 KB. Terser brings them to 108 KB and 73 KB (measured).

At the 86 kbit/s measured at the field station (ARCHITECTURE.md "Overview", about 10.7 KB/s), that is about 27 s less
on a first visit: about 17 s before Home and about 10 s before the first quiz (estimate). The CSS (app.css 174 KB raw,
41 KB gzip) would gain less.

Comments are about half of the player's JavaScript bytes, and they are written for agents, not for phones.

The "no build step" stance (AGENTS.md "The project in five lines") is already not true at deploy:
- `pages.yml` runs `tools/curplay.py`;
- it runs `tools/stamp_versions.py`;
- it computes the service-worker hash.

A minify step belongs there.

**Proposal (S).**

- In `pages.yml`, after staging, run terser (pinned, rule W9) on the root and `proto/` scripts, with source maps
  published beside them.
- `core.js` in `Code.gs` stays unminified (`tools/sync_core.py` reads the source).
- The inline scripts keep their CSP hashes; they are not touched.
- A smoke runs once on the staged, minified copy (the `pages main` part, on a `workflow_run` of the deploy, or the train
  stages and minifies too), so a minifier bug cannot reach players unseen.
- The error reports (`ev('err')`) gain a build id, so a stack can be mapped back.

**Later (with R2 and R6):** tier 1 need not load the replay, the content editor, the merges and the routes of every
page. With modules, the tiers become `import()` boundaries chosen by use.

**Risk.** Low. Terser's `-c -m` on ES2022 is mature. The one trap is code that reads `Function.prototype.name` or
`toString()`; a grep finds none in the player files (read, a quick check only).

### R5. The sheet as a database, and a second engine in `Code.gs` (high)

**Problem: a second engine.** `Code.gs` is 3,498 lines (374 KB) of its own code. The 2026-11-06 review's F5 ("Code.gs
should call the engine it embeds") is half done:

- done: `pctOf_` now delegates to `CORE_.pctOf` (Code.gs:2075);
- still separate: `stats_` keeps its own `MEM` (Code.gs:1110), `GENUS_K` (Code.gs:1121) and `trusted_` (Code.gs:1137)
  beside the embedded copies (Code.gs:6518, 6538);
- rule D3 asks to change both and keeps them in step with a test.

**Problem: the sheet's limits, paid in code.** The sheet's limits shape the code:

- progress JSON in 45,000-character chunks (Code.gs:110);
- trees in script-property chunks (Code.gs:2136);
- `cacheBig` (21 sites) around the 100 KB cache limit;
- 35 `CacheService` and 9 `LockService` sites;
- 123 `getRange` calls;
- a whole-tab read of `Answers` on every save (the professionalise study, item 5);
- a 15-minute trigger that warms the leaderboards within a consumer quota of 90 trigger minutes a day.

**Problem: a deploy pipeline in production code.**

- `autoUpdate` (Code.gs:3106) installs `Code.gs` and `appsscript.json` from `raw.githubusercontent.com/.../main` with the
  `script.projects` and `script.deployments` scopes.
- Every push to `main` is a production deploy of the backend, running as Pierre's Google identity (SECURITY.md "What is
  exposed" accepts it as "same trust as the site").
- That is acceptable now. It does not survive a second organisation or a second maintainer.

**Proposal.**

1. **Finish F5 (M):** `stats_` maps its rows to `eloReplay`'s shape and calls `CORE_`; delete the copies.
2. **Define the API contract now (M).** It is about a dozen calls today:
   - load, save, answers, stats, board, replays, reports, events, admin reads and writes;
   - describe each as JSON request and reply schemas, versioned, in one file (`api/contract.json` or a JS module with
     JSDoc types);
   - check both ends against it in tests;
   - this is what makes the move to D1 (Q352) a swap of implementation rather than a rewrite.
3. **Build `Code.gs` from parts (M):**
   - `tools/sync_core.py` already concatenates `core.js`. Extend it so the backend's own code lives in `server/*.js`
     modules (storage adapter, handlers, auth, caches), concatenated into the single `Code.gs` that Apps Script needs;
   - the same handlers can run in a Worker later, with a D1 storage adapter instead of the sheet one.
4. **Move the answer log to D1 earlier than the measured threshold (XL; Pierre's call).**
   - Q352 decided D1 at a measured threshold. The threshold measures speed, but the cost is already paid in code: the
     chunking, caching and locking layers would mostly disappear with a database.
   - The sheet can stay as Pierre's view: a nightly export of the tabs he reads, or a connected sheet.
5. **Self-update from a release, not from `main` (S):**
   - `autoUpdate` reads a `release/sheet` branch or a tag that only the train moves, after green checks;
   - a bad commit on `main` then never reaches the backend by itself.

**Risk.** Medium for the API and D1: it is the players' data. Low for 1, 3 and 5.

**Question for Pierre:** (d) Reopen Q352: move the answer log to D1 when the API contract is done, rather than at the
measured threshold?

### R6. `core.js` is a god module (medium-high, cheap to split)

**Problem.** `core.js` is "pure functions shared by the app, the admin and the tests". Its 7,194 lines and 368 exports
cover:

- storage keys and their migration;
- data hashing and deltas;
- the subject registry (455 lines of configuration, core.js:411-865);
- photo rights and licences;
- the fish tree build (`fishGen` and about 40 `fish*` functions);
- the content and structure editor overlay (core.js:2021-2470);
- account and progress merges (core.js:2525-2842);
- Elo, photo memory, confusion and trust;
- the apology texts and reserved names;
- curation and slots;
- the first-launch question;
- three achievement lists;
- the domain score;
- typing and fuzzy matching;
- rules versions and every version gate;
- start-up events;
- the replay;
- routes and page names;
- page telemetry ("pulse").

It is one IIFE, so nothing in it is private, and it loads in tier 1 whole.

**Proposal (M, behaviour-neutral).**

- Split it into about 15 files under `core/`: `keys`, `subjects`, `rights`, `tree`, `content`, `merge`, `elo`,
  `achievements`, `score`, `typing`, `rules`, `replay`, `routes`, `pages`, `pulse`.
- First as plain scripts concatenated in this order by `tools/sync_core.py`, into `core.js` for the browser and into
  `Code.gs`. Then as ES modules (R2).
- The tests `require` the files they test.
- Rule D3 is unchanged: any change under `core/` still means a `Code.gs` change.

**Risk.** Low.

### R7. The subject configuration model (medium-high)

**Problem.** A subject is described in two places.

| Registry | Size | Fields | What it mixes |
|---|---|---|---|
| `SUBJECTS` (core.js) | 455 lines | 43 (coral 32, fish 36, sea slug 36); 10 used by one subject only (`tiers`, `achFeats`, `typeDrop`, `renamed`, `score`, `beta`, `sheet`, `unitRank`, `boardSheet`, `stats`) | data (ranks, files, calibration), words, SVG icons, server gates (`sheet`, `boardSheet`, `stats` are script versions), admin page lists of up to 30 routes, functions (`achs`, `structure.apply`, `replayed.gen`) |
| `UNITS` (app.js:2263-2726) | 464 lines | 44 (coral 18, fish 39, sea slug 36) | behaviour, plus long HTML copy (`hello`, `about`, `tour`, `door`, `achHelp`, `progHelp`, `help`) |

So about 87 extension points per subject. Many are a sign of R1 rather than of real variation: the sea slugs repeat
most of the fish's functions verbatim (`slate`, `core`, `circles`, `gen`, `photo`, `list`, `sheet`, `bar`).

Two smaller problems:
- the admin's page list per subject is a hand-kept list of routes. A capability-derived list (a page appears when the
  subject has what it shows) would not drift;
- the UI copy in JS objects (HTML strings with `<a>`, `<b>`, `<p class="note">`) cannot be edited or translated without
  a code change.

**Proposal (M, after R1's rename).**

- **A subject manifest in JSON** (`subjects/<id>.json`): id, words, ranks, files, views, opt-in sets, calibration,
  circles, start question, origins, open/beta. Pure data, schema-checked.
- **Capabilities as code**, each a small module the manifest names: `tree` (the default), `coralViews` (three views per
  observation), `winks`, `imrCourse`, `tiles`. The engine asks `has(ctx, 'tiles')`, never `S.id`.
- **Copy in one strings file** per subject (`subjects/<id>.strings.json`), keyed. Translation becomes possible; the
  admin's content editor could edit it later.
- **Server needs** (the minimum script version) go away with R3's deploy order.
- **The admin's pages** are derived from capabilities.

**Risk.** Low. It is a reorganisation; the values do not change.

### R8. Data formats, ids and the curation file (medium; costly to undo)

**Problem: two kinds of build.**

- **Corals.** `data.json` is a served artifact that is patched in place. 23 one-shot `tools/apply_*.py` scripts each
  rewrote parts of it (`apply_name_roots.py`, `apply_plain_sheets.py`, `apply_skeletons.py`…). 9 of them are referenced
  by no code, test or workflow. Nothing can rebuild `data.json` from its sources; only `datajson.py` keeps its layout.
- **Fish and sea slugs.** They are built from sources by `tools/build_fish.py` and `tools/build_seaslugs.py`.
- So the same kind of fact (a look-alike's source, a plain sentence) is a hand-applied patch for one subject and a build
  input for the others.

**Problem: `curation.json`.** Rule A1 protects it as Pierre's choices (2.7 MB). Most of it is machine output written
through the admin:

- in `fish`: `add` 5,851, `ease` 5,852 and `tags` 5,852 judging records, and `seen` 10,556;
- at the root: `quality` 951, `gf` 828, `crop` 319;
- against `genera` 62 and `fish.genera` 28 of Pierre's covers and features (measured).

Two consequences:
- the file every Publish rewrites is big, so `curation-play.json` must strip it for players (`tools/curplay.py`);
- the line between "Pierre decided" and "the judging agent proposed" is a convention inside one file.

**Problem: the subject layout is asymmetric.**

- The corals' curation is the top level; the fish's is under `fish`; the sea slugs' is under `seaslug`.
- The engine reads the sea slugs' as the fish's through `treeCur` (core.js:1726).
- `SUBJECTS` admin `cur: ''` means "the top level".

**Problem: ids.** There are three schemes.

| Units | Id scheme | Example |
|---|---|---|
| Coral units | The bare genus name | `Acropora` |
| Fish and sea slug families and genera | A rank prefix and a name | `f:Damselfishes`, `g:Chromis` |
| Species units | `'s:' + fish.json id`, built in `fishSpUnits` (core.js:1437) | `s:s091` |
| Species sheets | The species name | `s:Chromis ternatensis` (learn.js:1135, `hr('g-s:' + o.name)`) |

So `s:` means two things: a species unit by its data id, and a species sheet by its name (learn.js:935 reads
`GX('s:' + s.id)` beside routes built from `'s:' + s.name`). Old ids are mapped forever (`FISH_RENAMED`).

**Problem: field names.** They are terse and undocumented in the files: `tr`, `trs`, `ig`, `sl`, `rsl`, `qt`, `cm`,
`gf`, `mont`, `cni`, `cnr`, `cmi`, `sec`. They are documented only in ARCHITECTURE.md prose.

**Proposal.**

- **(S)** A JSON Schema per served file (`schemas/*.json`), checked in CI (`tools/check_json.py` already parses them
  all). The schema is the field glossary. A `v` in every file (fish.json has one, data.json not).
- **(M)** Archive the one-shot scripts under `tools/archive/` (the folder exists) and make the coral build reproducible:
  `tools/build_corals.py` from `tools/` sources to `data.json`, as the fish's.
- **(L, costly to undo)** Split `curation.json`:
  - `curation/<subject>.json` holds Pierre's decisions only: covers, features, exclusions, verdicts, content edits;
  - `judgements/<subject>.json` holds machine output that the admin confirms: ease, tags, seen, auto-sort logs.
  - The admin writes both. Rule A1 then covers exactly what Pierre decides. The players' copy is the decisions plus
    what the game reads.
- **(L, costly to undo)** One unit id scheme, `<rank>:<stable slug>` for every subject, corals included
  (`genus:acropora`), with display names apart. This must come with R1 and one migration of the log (rule W3: migrate
  the data once, then forget the old ids).

**Questions for Pierre:**

- (e) Split `curation.json` into decisions and machine judgements, one file per subject?
- (f) One unit id scheme for every subject, migrated once in the log?

### R9. Tests coupled to source text (medium)

**Problem.** Without modules, a unit test can reach a browser function only by reading the file and cutting it out:

- `block(src, from, to)`: 68 files, 226 calls;
- or by running the whole file in a `vm` with stubbed globals: 101 files.

Two tests show the cost:
- `tests/block.js` exists because silent mis-cuts happened;
- rule S1's guard (`tests/subject-neutral.test.js`) scans for string literals like `'fish'` and `SUBJ === SUBJECTS[k]`.
  It passes on `x.pool.files[0] === 'data.json'` and on 160 `fish*` names (R1), so it holds the letter of S1, not its
  intent.

Timing:
- the fast tier (rule W24) takes 4 min 15 s locally for 1,864 tests;
- the twelve slowest tests (10-32 s each) are statistical model checks and synthetic-log analyses;
- the smokes are fine: 25.5 job-minutes in parallel, about 4.5 min wall.

The failure rate of the last 100 smoke runs (11) is an upper bound on flakiness. Some of those failures were real.

**Proposal.**

- **(M, with R2)** Tests import modules. `block()` and `vm` retire file by file as each file becomes a module.
- **(S)** A `slow` tag. The statistical checks (`analysis*`, model checks, synthetic logs) run in CI and in the train,
  not in the pre-push fast tier. The fast tier should then take well under a minute.
- **(M)** A **subject conformance suite**: the same engine tests (draw, scoring, exam, replay, sync round trip) run for
  every subject in `SUBJECTS` on a small fixture tree. This tests S1's intent (same behaviour through the same code)
  rather than its spelling, and makes the fourth subject's tests free.
- **(S)** Replace the literal scan with a structural one. The engine may read capabilities (`has(ctx, x)`), never compare
  a subject's file name, id or position.

**Risk.** Low.

### R10. Docs and comments as a changelog (medium)

**Problem: the size.**

- `docs/ARCHITECTURE.md` is 710 KB in 743 lines (average line about 950 characters); `docs/LEARNING.md` is 718 KB.
- Each is well over 150k tokens: no agent can read either in one pass, and a human cannot either.
- AGENTS.md sends every task to them ("Read on demand").

**Problem: the conflicts.** 294 of the 682 commits since the history rewrite touch ARCHITECTURE.md, and 236 touch
ROADMAP.md. Rule W19 (docs in the same PR) makes most PRs edit them, so they are the conflict hot spots of parallel PRs.

**Problem: the code comments are the decision log.**

- 416 "Pierre, <date>" citations and 458 Q-number references in 8 code files;
- comments that tell the history of a value ("v116: …", "Codex review #442: …", "named when this was rules version 8,
  before PR #638 took that number");
- 54% of `core.js`'s bytes and 66% of `model.js`'s are comments;
- the comments are accurate and well written. But a reader must read three sentences of history to find one sentence of
  meaning, and every change edits the history too.

**Problem: the docs are locked to the code.** The docs test pins every backticked identifier in the docs. A rename (R1)
must therefore touch the docs in the same PR. That is right in principle, but costly with 2 MB of docs.

**Proposal (M, mostly mechanical, can be done by agents).**

- **Decisions as ADRs:** `docs/decisions/NNNN-title.md`, one short file per decision (context, decision, Pierre's words
  and date, consequences), append-only, so it never conflicts.
  - The Q numbers become ADR links.
  - Code comments cite an ADR id at most, and say what the code does and why, in the present tense.
- **ARCHITECTURE.md as a map:** at most about 50 KB of module boundaries, data flow, file formats (pointing to the
  schemas, R8) and runbooks.
  - Each module gets a short README beside its code.
  - LEARNING.md becomes a spec of the algorithms in force (about 50-100 KB); its history moves to ADRs and
    `docs/archive/`.
- **Size budgets in `tests/docs.test.js`**, as AGENTS.md already has (30 KB).
- **A one-off comment pass** per file: history moves to the ADR and the git log, and the meaning stays.

**Risk.** Low, if the old text is archived rather than deleted. Context is never lost: it moves.

### R11. The admin (medium)

**Problem.**

- `admin.js` is 11,720 lines (704 KB), with 641 top-level declarations, 84 `innerHTML` writes and 183 handlers.
- Its helpers duplicate the app's (`esc`, `img`, `photoIdx`, `hashNow`, `allPhotos`, `author`, `modeOf`, `zoom`), and
  some share a name with an app function but mean something else (`fishFamOf`, `sheetWord`, `rpOn`, `loadStats`).
- `analysis.js` (4,793 lines) and `autosort.js` (1,518) are shared with tools and are better bounded.
- HTML is built by string templates with a manual `esc` on every interpolation. That holds today (read, spot checks
  only), but one forgotten `esc` is an XSS in the page that holds the GitHub token.

**Proposal (M-L, with R2).**

- **One `ui/` module set shared by the app and the admin:** escaping, photo URLs, routes, lightbox, filter bar.
- **An `html` tagged template** that escapes every interpolation by default (`html\`<b>${name}</b>\``), with `raw()` for
  the rare trusted markup. It is about 30 lines, and removes the class of bug.
- **One module per admin page**, imported on route (the admin's pages are independent; most visits open two or three).

**Risk.** Low-medium. The admin smokes cover every page on demo data.

### R12. Per-subject Python pipelines (medium-low)

**Problem.**

- 81 Python files (19,325 lines) and 18 JS tools.
- The fish pipeline is about 4,300 lines across `fetch_fish`, `fish_game`, `build_fish`, `fish_judge` and `fish_*`
  helpers; the sea slugs' is about 3,800 (`fetch_seaslugs`, `seaslug_game`, `build_seaslugs`, `seaslug_*`).
- The sea slugs' tools import from the fish's in places. The rest is parallel code for the same steps: fetch candidates,
  judge, choose game photos, crop, upload, build the tree.
- The corals have a third, older pipeline (`fetch_local.py`, `datajson.py`, the `apply_*` patches).

**Proposal (L).** One `taxa` pipeline package, parametrised by the subject manifest (R7): `fetch → judge → select →
build → publish`. Each stage is a module with a per-subject hook where the subject really differs (FishBase for the
fish, Corals of the World and IMR lecture photos for the corals, WoRMS groups for the sea slugs). Keep Python: the tools
are good Python, and moving them to JS would gain nothing.

**Risk.** Low (offline tools, checked by their `--check` modes).

### R13. Security and privacy as the project grows (medium-low today)

The current model is sound for one organisation and one admin (SECURITY.md). The professionalise study covers accounts,
recovery and the bus factor. What this review adds:

- **Deploy on merge to the backend** (R5): move `autoUpdate` to a release branch only the green train moves.
- **The 4-digit code** stops accidents, not attackers. Five tries per 10 minutes over 10,000 codes is about 14 days to
  try them all for one name, 7 on average (estimate). That is fine while progress is the only stake. It is not fine once a second organisation's RAs
  or roles depend on it. The API move (R5) is the moment for real sign-in: passkeys or e-mail links (Cloudflare Access is
  free under 50 users, as the study notes).
- **The token as the admin's identity** (checked with GitHub by the script) is clever, but ties admin rights to write
  access on the repository. A second organisation's admin should not need push access to the code. Roles step 1 (sheet
  v156) has started this; the target is roles in the backend, independent of GitHub.
- **XSS** (R11): the `html` tagged template.
- **Privacy:** answer logs keyed by a chosen name, and the sheet copied weekly to pCloud. These are the professionalise
  study's IMR agreement questions; nothing to add.

### R14. Rules that shape the code (judgement)

Pierre's rules are mostly good engineering and should stay. Five of them, as written or as applied, push the code
toward the problems above. Their wording is Pierre's to change; this is input, not a request.

- **Rule S1 encodes the design it should prevent.** "The engine works on the current subject (`SUBJ`, `P`, `Q`)" makes
  global current-subject state the rule, and the literal-string test lets two engines pass (R1, R2, R9). Suggested
  intent: "every subject runs through the same code paths; a subject differs by its manifest and named capabilities";
  checked by the conformance suite.
- **Rule D4 is implemented as gates that never end** (R3). The deploy order gives the same guarantee with no gate.
- **Rule W3 is not applied to the code.** The rule is right; the code keeps legacy keys, renamed ids, retired models and
  gates. Suggested addition: every migration or gate carries an end condition, checked by a test (as the S1 exceptions
  already carry a ROADMAP row).
- **"No build step"** is no longer true at deploy (rule W15 stamps versions there). Allowing a deploy-only build (minify,
  concatenate, stamp) keeps the no-build development loop and fixes R4.
- **Comments as the record of Pierre's words** (the rules' *Source* lines are the right place, and so would be ADRs).
  A comment policy, "what and why, now; history in the ADR", would shrink the code by about a third (estimate from the
  comment share) and its churn with it.
- **Rule L13** ("compute once, not on every phone") is right for the photo statistics. If the target's sync by events
  (below) is adopted, the device folds its own log, as it already does answer by answer. This is not a recomputation of
  the pooled statistics, but it is worth checking with Pierre that he reads L13 the same way.

## Algorithms, briefly

The 2026-11-06 algorithm and coherence reviews covered the learning model in depth. Most of their high findings are
built: one scorer, one genus difficulty, per-format offsets, the domain-score bar. On structure only:

- **The draw and the progress are sound but not isolated.** `model.js` mixes the mathematics (photo weights, the
  controller aiming at `TARGET_P`, rare caps, variety) with module globals read from storage (`PSTAT`, `PGD`, `PCONF`,
  `PMEM`, `PFMT`, `PBASE`, model.js:1449-1504). The draw cannot be called with explicit inputs. Make `draw(ctx, state,
  rng)` and `photoSet(unit, ctx, rng)` pure, with a seeded rng. Simulation tools and tests then call the code the app
  runs, without `vm` or a browser.
- **Knob count.** 109 upper-case constants in `core.js`, 27 in `model.js` and 20 in `quiz.js`. Many are justified, and
  each carries its source. A single `PARAMS` table per subject (`calib` already exists for four of them), versioned with
  the rules versions, would show at a glance what rule L11 is protecting. It would also make each subject's tuning data,
  not code.
- **Replay options as flags** (`dom`, `memory`, `time`, `vars`): see R3. Keep only the rules in force.
- **Exams, confusion pooling, Elo:** no structural issue found in this pass.

## Readiness for growth

| Growth | Today (read and measured) | With the target |
|---|---|---|
| A fourth subject | About 44 commits across 9 core files, a new Python pipeline, new sheet gates, new admin page lists | A manifest, a strings file, a data build through the shared pipeline, the conformance suite green; capability modules only for real differences |
| A second organisation (instance) | `ORG`, `tools/instance.py`, one sheet per organisation (Q343), `SALT` shared, admin rights from GitHub push access, curation in the app's repository | The instance is a config (data repository or bucket, API base URL, roles); the code is shared; admins are backend roles |
| A real backend | Q352: D1 behind a Worker at a measured threshold; `Code.gs` is the API without a contract | The API contract first, then a second implementation from the same core modules (R5) |
| A native app | The PWA works offline; the global-script app can only be wrapped (Capacitor-like) as it is | ES modules and the API contract let a native shell reuse the core and the server; the PWA stays the main client |
| More players | The sheet's read of `Answers` on every save and the trigger quota (professionalise study) | D1; pooled stats built incrementally (Q123 j, already queued) |

## Target architecture

```
app/                          (served as native ES modules; no dev build)
  core/                       pure, no DOM, shared by app, admin, server, tools, tests
    ids.js tree.js photos.js rights.js
    draw.js elo.js memory.js confusion.js score.js exam.js
    replay.js  (the reducer: fold(answers, rules, units) -> progress)
    rules.js   (RVS per subject, PARAMS per rules version)
    sync.js    (answer-set union, no record merge)
    typing.js achievements.js routes.js
  subjects/
    coral.json fish.json seaslug.json          manifests (schema-checked)
    coral.strings.json …                       the copy players read
    caps/ coralViews.js winks.js tiles.js …    the capabilities that really differ
  client/
    context.js   SubjectContext {manifest, units, curation, P, Q, stats}
    store.js net.js boot.js (tiers = import() boundaries)
    pages/ home.js learn/ quiz/ progress/ about.js
  admin/ pages/*.js (one per route), shared ui/
  ui/ html.js (escaping template) photo.js lightbox.js filterbar.js
data/
  <subject>/tree.json game.json cand.json        built by tools/taxa, versioned, schema
  curation/<subject>.json                         Pierre's decisions (rule A1)
  judgements/<subject>.json                       machine output the admin confirms
server/
  contract.json                                   versioned request and reply schemas
  handlers/*.js  auth.js  storage/sheet.js  (later storage/d1.js)
  build: concat core/ + server/ -> Code.gs (Apps Script) | worker.js (Cloudflare)
tools/taxa/   fetch, judge, select, build, publish (Python, per-subject hooks)
deploy        stamp versions, minify + source maps, curplay; server first, then app
docs/         ARCHITECTURE (a map, ~50 KB), decisions/NNNN-*.md (ADRs), module READMEs
```

**Data flow:**

1. An answer is appended to the device's log and folded into `ctx.P` (the same reducer as the server's).
2. Sync sends the new answers and receives the answers this device lacks (union by answer id) and the server's pooled
   statistics.
3. Progress is always `fold(log)`. The record merges (`mergeProgress`, `mergeUsers`, `dataDelta`, `dataPatch`,
   `keysIn`, `withLegacy`: in core.js:84-290 and core.js:2525-2842, several hundred lines) become a set union, with the device's cache of
   the fold as an optimisation.
4. The device's settings travel as a small separate document, last writer wins.

This redesign is optional, and the biggest one here. It removes the class of bugs where a device and the sheet disagree
(the reason rule D9 exists), but it changes what the sheet stores per player.

**Question for Pierre:** (g) Sync by answers instead of by progress record (the record becomes a cache of the replay)?

## Migration path

Each step leaves `main` shippable, runs through the train, and can stop there. The first five change no behaviour that
players see and are integrator's calls under the merge contract. The later ones carry Pierre's questions.

| Step | What | Effort | Risk | Needs Pierre |
|---|---|---|---|---|
| 1 | Minify at deploy, source maps, a smoke on the staged copy (R4) | S | Low | No (deploy detail) |
| 2 | Gate floor: unknown `sheetV()` = the build's `MIN_SHEET`; delete gates below it; a ratchet test (R3) | S | Low | No: it fixes new devices playing retired rules |
| 3 | Rename `fish*` → `tree*` where the code is the tree engine; capability flags instead of the `data.json` and `replay` proxies (R1) | M | Low | No (a name inside the code) |
| 4 | Split `core.js` into `core/*.js`, concatenated by `tools/sync_core.py` (R6); a `slow` test tag (R9) | M | Low | No |
| 5 | Finish F5: `stats_` calls `CORE_`; `autoUpdate` from a release branch the train moves (R5) | M | Low-medium | (h) the release branch is a change to his setup: tell him |
| 6 | ES modules, leaf first; `SubjectContext` replaces `inSubject`; tests import modules (R2, R9) | L | Medium | No |
| 7 | Subject manifests and strings files; capabilities; admin pages derived (R7); `html` template, shared `ui/` (R11) | M | Low | No |
| 8 | Deploy order (server first, then app) and the end of per-feature gates (R3) | M | Medium | Rule D4's implementation: (i) tell him, it keeps his intent |
| 9 | Schemas for every served file; coral build from sources; one-shot scripts archived (R8) | M | Low | No |
| 10 | Remove migration layers after one read of the sheet (R3) | S each | Low | (c) |
| 11 | ADRs; ARCHITECTURE and LEARNING cut to maps and specs; comment pass per module (R10) | M | Low | His OK on the doc structure (rule wording) |
| 12 | Corals as a tree subject (R1) | XL | Medium | (a), (b) |
| 13 | Curation split; one id scheme, migrated once (R8) | L | High | (e), (f) |
| 14 | API contract; then D1 (R5); sync by answers (target) | XL | Medium | (d), (g) |
| 15 | Shared `taxa` pipeline (R12) | L | Low | No |

Steps 1-4 take about one to two weeks of agent work in parallel. Steps 2 and 3 each touch many lines, so they go alone
on their train. After them, every later step is smaller than it is today.

## Questions for Pierre (collected)

These are unnumbered here: the integrator numbers them if they pass the two tests (AGENTS.md "Working mode").

- (a) Corals as a tree subject, with their unit ids unchanged? Recommendation: yes, after steps 1-7.
- (b) Extend the sheet's photo ratings and opening data (`replay: true`) to every subject, or keep it for the corals?
  Recommendation: every subject, once its stats are pooled (the sea slugs already are).
- (c) Stop sending the pre-rename key names and stop reading `t01` fish ids, once a read of the sheet shows no device
  uses them? Recommendation: yes (rule W3).
- (d) Move the answer log to D1 once the API contract exists, rather than at the measured threshold? Recommendation:
  yes. The threshold measures speed; the code already pays the sheet's cost.
- (e) Split `curation.json` into his decisions and the machine's judgements, one file each per subject? Recommendation:
  yes. Rule A1 then covers exactly his choices.
- (f) One unit id scheme for every subject, migrated once in the log? Recommendation: yes, together with (a).
- (g) Sync by answers, with progress always the replay of the log? Recommendation: yes, with (d), as one project.
- (h) The sheet script updates from a release branch the green train moves, not from `main`? Recommendation: yes;
  nothing changes for him.
- (i) Rule D4 kept by deploy order (server first, then app) instead of per-feature gates? Recommendation: yes; same
  guarantee, no lasting code.

## Appendix: how the numbers were taken

Every command below ran from the worktree at `b6e0d263`.

- **Sizes:** `wc -l -c` on each file; `gzip -9c | wc -c` for gzip; terser `5.36.0` with `-c -m` for the minified
  sizes (in the scratchpad, nothing committed).
- **Comment share:** the bytes of lines starting with `//` over the file's bytes. Trailing comments are not counted, so
  the true share is higher.
- **Top-level declarations:** lines starting with `function`, `async function`, `const`, `let` or `var`. A multi-name
  `let a, b` counts once, so this is a floor.
- **Subject identifiers:** distinct names after `function|const|let|var` starting with `fish`/`FISH`, `coral`,
  `seaslug`/`SEASLUG`.
- **`SUBJECTS` fields:** `Object.keys` of each entry, loaded with `require('./core.js')`. **`UNITS` fields:** the keys at
  four-space indent between `const UNITS = {` and `treeAt(SUBJ.id);` in app.js.
- **Gates:** every `const X_SHEET = N`.
- **Tests:**
  - `node tests/run.js`: `# tests 1864`, wall time from `time`, 4 min 15 s on this machine, with the slot free;
  - smoke timings from the GitHub API for run 44191385369;
  - the failure counts from the last 100 runs of `smokes.yml`.
- **Commits:** `git log --oneline -- <file>` and `git log --grep "sea slug|seaslug" -i`.
- **Not measured:**
  - runtime performance on a phone;
  - the sheet's live timings (the professionalise study has some);
  - the actual frequency of the `sheetV() = 0` path in the field (the Events tab could tell).
