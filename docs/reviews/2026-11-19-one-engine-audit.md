# One engine for every subject: where the subjects differ today (2026-11-19)

Read-only audit of `main` at `41fe761`. Pierre, 2026-11-19 05:15 Manila: the app's engine is one engine for every
subject, with only small per-subject parameters. Rule S1 already says "One engine, never naming a subject" and rule L6
"No unit-specific code". This note lists where the fish and sea slug paths still differ from the corals', proposes
how to make each difference shared code or a stated `SUBJECTS` parameter, an order of small PRs, and a rule wording
for Pierre.

**Status (2026-11-19):** answered. Item 7 is settled by rule P1 and #942 A (remove the source boost, no `rep` tag); S1's
wording is the one Pierre OK'd at 06:58, not §4's (see §4).

**Short answer.** The shared learning model is already one engine: the draw, Elo, the exam, typed questions, the
unlock order and the look-alike traps. Most of the divergence runs through one corals-only flag, `SUBJECTS.replay`
(the sheet's replay, the pooled statistics, the opening hold, the sign-in baseline), plus a few one-subject features
(feats, the source weight in the draw), one hardcoded threshold (`FISH_C3`) and duplicated tree `UNITS` entries.

No effort is estimated here: each PR gets its estimate from `tools/effort.py` when it is planned. "D5" means the change moves players' progress (a rules version, and rule
D6's silent recalculation).

## 1. Differences today

| # | Difference | Where (main 41fe761) | Kind | Proposed resolution | Moves progress? |
|---|---|---|---|---|---|
| 1.1 | The pooled photo memory and format offsets are read for the corals only | `model.js` ~1353, ~1361 (`pmem`, `pfmt`); `sync.js` ~36-39; `Code.gs` ~799 (`rplMake_`: `st = main ? stats : {}`) | subject test through the `replay` flag | Shared: every subject reads `mem` and `fmt` from its own `?stats=1&s=` reply, in the app and in the sheet's replay | **Yes: D5, one rules version per subject** (#1148 says so) |
| 1.2 | Three ways to load the pooled statistics: the corals from the plain `?stats=1`, the sea slugs through `SUBJECTS.stats`, the fish not at all | `sync.js` ~18-62; `model.js` ~1384 | subject test, duplicated logic | One `loadStats(S)` for every subject with a `pool`; `stats` stays each subject's sheet-version gate; #1148 brings the fish in | No (#1148: the replay reads no pooled number) |
| 1.3 | Two sheet replay paths. Corals: `answerRows_`, `gen_`, `dataJson_`, `slate_`, tab `Replayed`, `RVK`, the unprefixed `replay` slot. Others: `subjRows_`, `subjRpl_`, `replays_`, their own tabs | `Code.gs` ~600-615, ~655-800, ~805+; `sync.js` ~213-285, ~353, ~378 | duplicated logic | One per-subject path; today's coral tab and key names become stated parameters (or are migrated) | Should not if the replay is the same: prove it on the log; D5 if any number moves |
| 1.4 | The sheet's opening hold counts coral rows only (`hold_` reads `answerRows_`); the fish and sea slugs hold on the device only | `Code.gs` ~572-590, ~600-607; `sync.js` ~554 | subject test | `hold_(sid)` per subject; the app adopts each subject's own | No (guess: the hold paces openings, it is not in the record); check level 1 |
| 1.5 | The anonymous baseline at sign-in (`ANONB`) is the corals' only; the other subjects use `mergeProgress({}, here, R)` | `quiz.js` ~633; `sync.js` ~1569-1570 | subject test | `ANONB` per subject (`subjKey`) | Touches the sign-in merge: careful tests; no rules version |
| 1.6 | The one-tap question (pulse), the apology card and the recalculation notice are coral-only (the last is S1's only listed exception) | `quiz.js` ~1652; `progress.js` ~1548, ~1301 | subject test | Pulse shared; the apology and the notice name their subject in their data | No |
| 2 | `domRecalcAll` (the old `pg` to `ds` migration) is skipped for the corals | `model.js` ~1408 | legacy migration | Delete it once no record holds `pg` (rule W3; guess: none left) | Only if records remain |
| 3 | Feats (runs, Sharp eye, corallites) are kept only on coral answers (`achFeats`); `_run`, `_best`, `_hard`, `_cor` sit in the shared record without a subject | `progress.js` ~943-957 | one-subject feature | Feats per subject (namespaced, a one-time migration); each subject's achievement list may then hold the run and hard-photo achievements; the corallites feat keys on the subject's close-up view | Achievements record only; recount silently; rule L8 timing check |
| 4 | `FISH_C3` {entries 0.55, mean 0.5} is hardcoded and read by `treeGate` for the fish **and** the sea slugs | `app.js` ~2046-2056, ~2553 | value hardcoded for one subject | A named parameter, `SUBJECTS.gate: {c3: {entries, mean}}`; fish and sea slugs keep today's values; corals none | No (same values) |
| 5 | The starred-genus rule reads the coral file directly (`starWaits(DATA, …)`); `starRefs` keys on the coral-only fields `n` and `ig` | `model.js` ~783; `core.js` ~4945-4965 | subject-shaped data in the engine | The build writes a field (e.g. `after: [unit ids]`) and the engine reads `GX(n).after` for every subject (a plain swap of `DATA` for `GX` would wrongly star tree units) | No; tests show the coral opening order unchanged |
| 6 | The leaderboard: the first board subject reads the "By genus" tab and the old Progress column; the others read `boardUnits_` and the tree; `syncSummary` serves the first board subject only | `Code.gs` ~2596-2625, ~2451; `sync.js` ~70-75 | duplicated logic | One board path per subject; "By genus" kept as the corals' stated legacy, or one tab per subject | Ranks only (rule D8), not progress |
| 7 | `isCore`: IMR's and Pierre's own photos weigh x1.3 in the draw, corals only (`tiers`) | `app.js` ~1476; `model.js` ~165 | one-subject feature | Settled by rule P1 (no source priority anywhere) and #942 A (a reference comes from the photo's own qualities, not a tag): remove the source boost, add no `rep` tag (Pierre, 2026-11-19 06:50) | No (the draw only) |
| 8 | The fallback card after the first-launch question is on for the corals only (`startFb: false` elsewhere), because `CHOICE` was calibrated on corals | `model.js` ~1052; `app.js` ~2324, ~2547 | stated parameter (temporary) | Per-subject `start` values once calibrated, then on for every subject | Possibly (the prior): D5 then |
| 9 | The fish and sea slug `UNITS` entries repeat about 15 members word for word (`slate`, `core`, `circles`, `gen`, `st`, `gate`, `species`, `photo`, `norm`, `typeOther`, `pairs`, `list`, `sheet`, `bar`) | `app.js` ~2325-2421 vs ~2552-2608 | duplicated logic | One shared tree base spread into both; per subject only words and real differences | No |
| 10 | `tests/subject-neutral.test.js` scans neither `Code.gs` nor `tools/`, and cannot see proxy flags (`replay`, `flat`, `achFeats`, `tiers`) | `tests/subject-neutral.test.js` ~13-16 | test gap | Scan `Code.gs` too; a field true for exactly one subject must be listed with its ROADMAP row, as today's exceptions are | No |
| 11 | The corals' `data.json` is flat and hand-curated (`apply_*.py`, `datajson.py`): genera keyed by name, three views, the star in `n`, no `e`/`sp`/`circle`; the fish and sea slugs are built into a tree with ids (`build_fish.py` + `fish_game.py`; `build_seaslugs.py` + `seaslug_game.py`, which share no code) | `core.js` `POOLS`; `app.js` `GX`, `flat`; `Code.gs` `gen_`, `dataJson_` | data side | Not now: this asymmetry is why `flat`, `GX`'s two reads and 1.3 exist; later, build the corals into the tree layout | No |
| 12 | #1130's coral calibration set: the engine side is shared (`CALSET[SUBJ.id]`); only the content and `tools/calibset.js` are coral-only | PR #1130 (`model.js`, `app.js`) | content | Fine as is; later `calibset.js --subject` | No |

## 2. Legitimate parameters versus engine divergence

**Legitimate (content or stated parameters).** Already parameters: `views` (corals 3, others 1; rule P2), `calib`,
`score`, `optin`, `sets` and `opens`, `achs`, `start`, `pages`, `progress`, `typeDrop`, `renamed`, `unitRank`, `pool`,
`structure`, `content`, `admin`, the `RVS` lists, `open`, `beta`. Data-driven and fine: the starred genera and
Millepora (`BENTHIC`, `BONUS`; rules L5, L6), the fish's starter `first`, the `imrName` tags, `cm`, variant groups, data
look-alikes (`dlook`). Fine but could be fields rather than functions: `mystery`, and the Tools running as corals
(`proto/lab.js` ~100).

**Engine divergence.** Every use of `replay` beyond "the default subject for unlabelled legacy rows" (1.1-1.6);
`achFeats` (3), `tiers` (7), `FISH_C3` (4), the starred-genus rule reading `DATA` (5), the two board paths (6), the
duplicated tree entries (9). ROADMAP's "Architecture review, steps 3 and 4" row already plans to split `replay` into
named capabilities at today's values: a useful first step, but a capability true for one subject only is still a
subject test; the end state is every subject doing the same thing.

## 3. Order of work, as small PRs

1. Harden the S1 test (10) and the shared tree `UNITS` base (9): app and tests only, no sheet change, no progress move.
2. Split `replay` into named parameters at today's values (the ROADMAP row), `FISH_C3` into `SUBJECTS.gate` (4), and
   the pulse, apology and notice by subject (1.6): core.js, so the Code.gs copy and a changes file (rule D3), no logic
   change; one sheet release.
3. Merge #1148 (the fish's pooled statistics), then fold the corals into the same `loadStats(S)` (1.2): a sheet gate
   only, no progress move.
4. The starred-genus rule as a build field (5): `data.json` and `model.js`, no progress move.
5. The opening hold per subject (1.4): a sheet version, a rule D4 gate.
6. `ANONB` per subject (1.5): `sync.js` only, with sign-in tests.
7. Feats per subject (3): an achievements record migration and recount.
8. Memory and format offsets per subject (1.1): **a rules version (D5) for the fish and the sea slugs**, check level 2
   and rule L12; wait for enough answers, as #1148 recommends.
9. `Code.gs`: one replay path and one board path for every subject (1.3, 6): a sheet version, a replay-equivalence check
   on the log, D5 only if a number moves.
10. `isCore` / `tiers` (7) removed with the corals' other source boosts (ROADMAP "Corals: remove the photo source
    priority"); `startFb` (8) after a calibration.

Steps 1 to 6 move nobody's progress and are easy to correct; step 7 moves the achievements record; steps 8 and 9 may
move progress (rule D5) and get the checks of rules L11 and L12.

## 4. Proposed rule wording (superseded)

Pierre refused this wording as too conservative (2026-11-19 06:50: "On pourrait envisager des bouts de codes
spécifiques (des 'patch') ou des features activées seulement pour une matière") and OK'd another at 06:58, recorded in
[ANSWERS.md](../ANSWERS.md) (2026-11-19, "rule S1's wording"): a difference between subjects is declared and named in
one place, whatever its form (data, a parameter, a feature switched on for some subjects, or a patch). The proposal as
it was:

It amends S1's first sentence rather than adding a rule; S1's beta and group part stays.

- **Line:** "Every subject runs on the one engine: a subject differs only by its data and a few named parameters in
  `core.js` `SUBJECTS` (each subject's value stated), never by a code path of its own."
- *Why:* corals, fish, sea slugs and benthos next learn the same way, and a new subject should cost data, not code.

S1 today also allows "a function of `app.js` `UNITS`", which is how the duplicated tree entries (9) got in; the
suggestion is to keep `UNITS` for words and pages only (said in the PR that does it, not in the rule). Unifying the
data pipelines (11), the admin and the Learn pages are outside Pierre's scope and not proposed.

## 5. What was checked and what was not (rule W11)

Checked: `SUBJECTS` in full; `UNITS` (corals, fish, sea slugs); `model.js`'s opening, pooled-statistics and
recalculation code; `progress.js`'s achievements; `sync.js`'s statistics, hold and sign-in merge; in `Code.gs`
`answerRows_`, `subjRows_`, `hold_`, `replay_`, `rplMake_`, the start of `board_`, `statsSubjects_`; `starRefs`,
`POOLS`/`unitPool`, each subject's data keys, the subject-neutral test, rules S, L, D5/D6, the ROADMAP rows on
architecture, statistics and more subjects; #1148 and #1130 (descriptions and their `core.js`/`model.js`/`app.js`
diffs). Not checked: `admin*.js`, `analysis.js`, `live.js` beyond a grep; the bodies of `learn.js` and `home.js`
(grep only), `proto/`, `learnsim.js`, the coral `apply_*` tools, `build_seaslugs.py`; the rest of `Code.gs` (grepped
regions only) and `sw.js`. Guesses: that the hold does not move progress (1.4), that no record
still holds `pg` (2), that `isCore` predates rule P1 (7). Line numbers are approximate.
