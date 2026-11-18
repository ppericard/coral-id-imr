# Open points: short, medium and long term, and what the integrator can do alone (2026-11-19)

**Status: study, read-only.** Nothing in the app, the data or the other docs was changed. Pierre asked on 2026-11-19:
"Refais-moi un point complet sur l'ensemble des points encore ouverts, à court, moyen et long terme, et ce que tu peux
traiter en autonomie", in the shape of [the backlog inventory](2026-11-18-backlog-inventory.md) and
[its re-check](2026-11-19-backlog-recheck.md). Those two stay as they are; this note supersedes them as the list to pick
work from.

Read from `origin/main` at `41fe7619` (#1179, 2026-11-19 06:32 Manila), the GitHub REST API (open PRs, their bodies and
checks; PRs merged since the inventory) between 06:30 and 07:00 Manila, and the integrator's state at 06:30.

**How to read the tables.**

- **Who**: `A` the integrator can do it alone under the merge contract (decided, or easy to correct); `P` it needs
  Pierre's decision first (the question is named); `H` it needs Pierre's hands. "A, then P" means an A step comes
  first and Pierre only if it does not settle the point. The counts use the first letter.
- **Est.**: agent time from the branch's first commit to green checks, as `python3 tools/effort.py --estimate TYPE BAND`
  prints it for the type and size band I read from the files the item touches (my reading); the PRs cited are the
  comparable ones it lists. For a series (engine L) it is one PR of the series. Bulk work run by a light model, a
  question, Pierre's hands and the integrator's own routine get none.
- Items done since the inventory are left out (the PR description names them); section 5 lists the records that
  still call some of them open.

## 1. Summary

### 1.1 Counts

| Horizon | A | P | H | All |
| --- | --- | --- | --- | --- |
| Short (today, the next few days) | 14 | 3 | 0 | 17 |
| Medium (the next weeks) | 20 | 10 | 0 | 30 |
| Long (later, ROADMAP's far rows) | 5 | 7 | 0 | 12 |
| **All** | **39** | **20** | **0** | **59** |

Rows marked "A, then P" count as A (ST8, ST11, MT8) and "P, then A" as P (ST15).

Pierre's hands are counted apart (section 4: 8 items). The questions (section 3): 9 numbered and open, 6 unnumbered in
STATUS, and 8 more recorded open in other docs but absent from STATUS. Contradictions and stale records: 12 (section 5).

### 1.2 The things to do next, in order

1. **The players' reports and events** since 2026-11-18 16:20 Manila, the morning duty (A, ST1).
2. **The merge queue**: #1170, #1176, #1130, #1148 brought up to date and merged one train at a time; then the WIP
   #1183, #1177 and #1181 finished, and #1175's red `smoke (net)` understood (A, ST2-ST4).
3. **The invisible feedback card** on fish/progress that Pierre asked to fix (A, ST5).
4. **The host check in `photoFallback`/`photoRetry`** (sheet v188), then #1121 (v189). It frees `core.js` for L2, the
   Matrix game, F4 and architecture step 4 (A, ST6).
5. **#1171 redone to option (b)** (Q418) (A, ST7).
6. **One batch of questions before 17:30**: first the rename's two gates (the professionalise study's (a) domain and
   who pays, (b) who owns the accounts). The rename is due "before December 2026" and nothing is built (P, ST14).
7. **The one-engine audit** Pierre asked for at 05:15, a read-only study; its rule wording then goes to him (A, then P,
   ST11).
8. **Level-2 runs on a GitHub runner** for #1093 and #1116, so they reach Pierre only if still unclear (A, ST8, ST9).
9. **The judging pass** on the 8 fish candidates in 7 species (A, ST12).
10. **The branch clean-up and the stale records** of section 5, in one docs PR, after Pierre's plain OK on the
    deletions (P, then A, ST15).
11. **`claude/tricky-pairs` gets its PR** (rule W6) (A, ST16).
12. Then the medium term in its order: L2 (MT1), the Matrix game (MT3), species step 2 (MT5).

## 2. The open points

### 2.1 Short term (today and the next few days)

| # | Item | Where | Next step | Who | Est. |
| --- | --- | --- | --- | --- | --- |
| ST1 | Players' reports and the app's events since 2026-11-18 16:20 | STATUS "Last checked"; AGENTS.md "Reports and events" | read the tabs Reports and Events (Sheets connector); a summary to Pierre in the chat | A | none (routine) |
| ST2 | Green and decided, to bring up to date and merge: #1170, #1176, #1130 (Q412), #1148 (Q413; 2 Codex threads) | open PRs (all four conflict with main) | merge `origin/main`, docs test, Codex, `tools/train.py`, one at a time | A | about 0.2 h each, fix S (#912, #1026, #1037) |
| ST3 | WIP to finish: #1183 (auto-sort c), #1177 (CI speed, I7), #1181 (circle-1 genera with no name root) | their "WIP, not reviewed" commits of 04:52 | docs, record, Codex, then the train | A | about 0.25 h each, tooling M (#960, #1040, #1144) |
| ST4 | #1175 (load order, I11 b and d): the train red on `smoke (net)` after the merge with main | #1175 | find the cause; never re-run (rule W23) | A | about 0.2 h, fix S (#912, #1026, #1037) |
| ST5 | The "Thank you / Your feedback helped" card on fish/progress is closed as empty by the safety net (event `empty card closed: feedback`, 2026-11-19) | Pierre's ask, 2026-11-19 | a test that reproduces it, then the fix | A | about 0.2 h, fix S (#912, #1026, #1037) |
| ST6 | CodeQL red on #1121: `photoFallback`/`photoRetry` check the host with `new URL(u).hostname` first | STATUS Next 1; #1121 | a small PR (sheet v188), then #1121 brought up to date (v189) | A | about 0.5 h, sheet S (#958, #971, #1053) |
| ST7 | #1171 (fish genus "Don't confuse with") to option (b): sourced pairs only | Q418, answered 05:13 | rebuild the PR | A | about 1 h, feature S (#909, #917, #1161) |
| ST8 | #1093 (no photo twice): red admin smoke (probably fixed by #1173 on main), 1 Codex thread, the corals' beginner plateau unclear | #1093 "Not ready to merge" | merge main; answer the thread; level 2 on a GitHub runner (the body's `learncheck.yml` command, within the cap of Q405, #1086); Pierre only if still unclear | A, then P | about 0.2 h, fix S (#912, #1026, #1037), plus the run |
| ST9 | #1116 (typed answers): the simulated expert −3.0 points on answers 200-300, unclear | Q411 | Q411 recommends level 2 first; the run can start while Q411 waits | P (Q411) | about 0.5 h, engine S (#873, #896, #938) |
| ST10 | #1117 (guards rather than prose): 1 Codex thread | #1117 | answer it, then the train | A | about 0.2 h, fix S (#912, #1026, #1037) |
| ST11 | One engine for every subject: where the fish and sea slug paths differ from the corals', each made shared code or a stated `SUBJECTS` parameter | Pierre, 2026-11-19 05:15; rule S1; architecture review (a), (b), (f) | a read-only study (Opus, high effort), then the rule's wording to Pierre (no number: the wording of a rule) | A, then P | about 0.7 h, study S (#979, #1064, #1097) |
| ST12 | The judging pass on the 8 new fish candidates in 7 species | `python3 tools/judging_fish.py todo`; ROADMAP backlog 3 | run it (a decided process) | A | none (bulk work) |
| ST13 | The questions of section 3 to Pierre, in one batch | STATUS; section 3 | before 17:30 (Rule 0); confirm the eight of 3.3 against the chat first | A | none (routine) |
| ST14 | Domain and repository rename "before December 2026": nothing built | ROADMAP "Domain and repository rename"; [professionalise study](2026-11-14-professionalise-study.md) (a), (b) | Pierre's answers to (a) and (b); then the move's plan | P (3.3) | none until answered |
| ST15 | Branches to delete: `optimistic-newton-b82nxm`, `stoic-ritchie-fp1ipu`, `admin-signout-seal`, `fish-todo-wip`; the stale records naming them | section 5, X1-X4 | Pierre's plain OK, then `clean.yml` "also_delete"; one docs PR fixes `KEEP`, INTEGRATOR and `ID_ALLOW` | P, then A | about 0.15 h, docs S (#949, #1014, #1145) |
| ST16 | `claude/tricky-pairs`: "Your tricky pairs" on My progress (L24 f), WIP with no PR (rule W6) | the branch (1 WIP commit) | open its PR and finish it | A | about 0.3 h, feature M (#899, #911, #986) |
| ST17 | #1121 itself: the comments of `core.js` and `Code.gs`, its 10 decisions only in comments moved to a record | #1121 "For Pierre" (information, not a question) | after ST6; tell Pierre the record is there | A | about 0.2 h, fix S (#912, #1026, #1037) |

### 2.2 Medium term (the next weeks)

| # | Item | Where | Next step | Who | Est. |
| --- | --- | --- | --- | --- | --- |
| MT1 | L2: the level's answer count follows the log (rule D9) | ROADMAP; [note](2026-11-09-level-count-checkpoints.md); branch `level-count-from-log` | one PR once no open PR holds `core.js`, `sync.js`, `model.js`, `quiz.js` (#1093, #1099, #1116, #1121, #1130 and #1148 do) | A | about 1 h, engine M (#873, #938, #951) |
| MT2 | L1: Q316's offline fit, read-only, Q136 folded in | ROADMAP "Engine coherence review" | the fit, written as a study | A | about 2.6 h per PR, engine L (#957, #1047, #1075) |
| MT3 | The Matrix fish game (L29, Q321) and Find the X's own format offset (L30) | STATUS Next 2 | after #1121 | A | about 2.6 h per PR, engine L (#957, #1047, #1133) |
| MT4 | F4: a wrong pick of another family's species counts against both families, with a fish rules version | FISH_PATH "Feeding the families" | after #1121 | A | about 1 h, engine M (#873, #938, #951) |
| MT5 | Species step 2, scientific names, fish and sea slugs (F3); the sea slug species units follow (S5) | [plan](2026-11-18-species-step2-plan.md) §5 (Q394-Q398 answered, #1041) | its PR order | A | about 2.6 h per PR, engine L (#957, #1047, #1075) |
| MT6 | After #1148: the fish judged-ease prior and `calib` refit, the class-C juvenile cap (F2); fish Photo stats › Difficulty; the fish memory and format offsets (a rules version) | #1148 "Choices"; ROADMAP "Fish admin at parity" | once #1148 is merged and the answers are enough | A | about 1 h, engine M (#873, #938, #951) |
| MT7 | Fish leftovers: F5 species pairs in family questions and the admin's species pairs; F6 confusion views; F7 Fish ID Key; F8 welcome values from fish learnsim profiles; F11 marks as an editor slot; F12 genus and species marks, phase model, writing; F13 names editor and index; F14 fish `rp` and a never-signed-in device | [re-check](2026-11-19-backlog-recheck.md) F5-F14 | one PR each, ROADMAP order | A | about 1 h per PR, feature S (#909, #917, #1161) |
| MT8 | Fish basics, the rest: the fish glossary; the `fbasics` achievement's name and tier (Pierre's) | ROADMAP "Fish basics, the rest" (the module is #1108) | the glossary PR; the name in the next batch | A, then P | about 1 h, feature S (#909, #917, #1161) |
| MT9 | Re-measures past their thresholds: F19 fish photo exposure, L9 photo memory lag table at the next milestones, L16 comeback, L22 the quiz pressing on one pair | ROADMAP; re-check | read-only studies | A | about 0.7 h each, study S (#979, #1064, #1097) |
| MT10 | L13 `CAL.U`; L24 (a, c) re-test and (h); L27 "Did you know?" tips one at a time | re-check | each with its rule L11 check | A | about 0.5 h each, engine S (#873, #896, #938) |
| MT11 | Sourced marks and lines: S6 *Caloria*, *Ardeadoris*, then circles 2-3 (#1176 is part one); the coral and sea slug pairs still in `none` / `apartNone` | ROADMAP "The feedback sheet's decisive lines"; `tools/seaslug_cues.json` | a source per pair (rule C2) | A | about 0.1 h per PR, content S (#1164, #1178, #1179) |
| MT12 | Corals: C5 like-for-like wrong-answer comparisons; C11 growth-form guesses (on request) | ROADMAP | as photos come | A | about 1 h, feature S (#909, #917, #1161) |
| MT13 | Admin and sheet: A2 (C1, C2) visits; A7 (a, b, d); A10 rewrite the ids on delete (a sheet version); B2 overlay steps 6-7 and the Tree tab's rest | ROADMAP | one PR each; versions one at a time | A | about 0.7 h, admin M (#908, #1059, #1166) |
| MT14 | IMR-owned content: P1 rest (`qt`, `sl`/`rsl`, names and tags, the slate; #1170 does the coral pairs); P3 lecture photos second pass; then P5 the calmer About text | ROADMAP | in that order | A | about 0.3 h, content+tooling S (#868, #894, #1011) |
| MT15 | Recurring: P9 watermark pass after each refill (pass 4: #1174); P10 monthly taxonomy refresh (last: #1168); C11 near-duplicate re-run (#1180) | ROADMAP | as refills come | A | none (bulk work) |
| MT16 | Infra: I2 tool and admin data into `data/` (Q265); I7's rest after #1177 | ROADMAP | one PR each | A | about 0.25 h, tooling M (#960, #1040, #1144) |
| MT29 | I8: the files left unused on R2 cleaned up (nothing deletes from the bucket today) | ROADMAP "Photos out of the repo" | list them read-only; deleting is data: Pierre's plain OK first (AGENTS.md "Always ask first") | P | about 0.25 h, tooling M (#960, #1040, #1144) |
| MT30 | C1: the corals' photo ranking still favours IMR and Pierre's own photos (`applySlots`, `cover`, `photoSet`) | ROADMAP:193 "for Pierre to decide"; rule P1 as reworded in #1086 | rule P1 now settles it (source a hint, never a placement criterion): the code follows P1, the row goes (section 5, X12) | A | about 1 h, engine M (#873, #938, #951) |
| MT17 | The admin draft's one-time move out of `localStorage` removed (`draftMove`, `migrate`), from 2026-12-18 | ROADMAP "Sign out keeps the draft" (#1078) | one PR on that date | A | about 0.7 h, admin S (#908, #1059, #1166) |
| MT18 | Architecture step 4: the `core.js` split and a `slow` test tag | ROADMAP "Architecture review, steps 3 and 4" | after #1121 and Q414 | P (Q414) | about 2.6 h per PR, engine L (#957, #1047, #1075) |
| MT19 | #1099 per-player reserve: two rule L11 breaches on the corals; "never seen" by observation | #1099 "Choices" | Pierre's answers (3.2) | P | about 0.2 h to finish, fix S (#912, #1026, #1037) |
| MT20 | #1045 one judgement per photo: items 1-3 and 5 the integrator's; 4 (117 held-out observations swap, exam photos change) and 6 (an `over` breach) | #1045 "Choices" | Pierre on items 4 and 6 (3.2) | P | about 0.2 h to finish, fix S (#912, #1026, #1037) |
| MT21 | Roles steps 2-5 (T3: cohorts joined by code, the trainer view) and groups that carry rights | [study](2026-11-18-groups-carry-rights-study.md) §6; #1098 (a)-(f) | after Q408 and #1098 | P (Q408) | about 0.5 h per PR, sheet S (#958, #971, #1053) |
| MT22 | The trainer's live prep page (`#live/prep`) | [study](2026-11-18-live-prep-study.md) §16 (a)-(e) | after the answers (3.3) | P | about 1 h, feature S (#909, #917, #1161) |
| MT23 | "What I learn" card | #1071 (a)-(e) | after the answers (3.3) | P | about 1 h, feature S (#909, #917, #1161) |
| MT24 | Privacy notice | #1095, `needs-pierre` | his reading and three points (3.2) | P | about 0.15 h, docs S (#949, #1014, #1145) |
| MT25 | The app gaps' questions: fish pairs and juvenile classes beyond circle 1, 5 very easy photos per family, practice games for fish and sea slugs, a sea slug glossary and Find the X, a sea slug held-out set, offline photos, mushroom coral close-ups, the starred genera's tips | [review](2026-11-18-app-gaps-review.md) §3 (a)-(j) | after the answers (3.3); its decided gaps (§1.1) are A | P | about 1 h per PR, feature S (#909, #917, #1161) |
| MT26 | Typed answers after #1116: `TYPED` tuned on the `\|t` answers, the typed near-miss re-test, rejected tries served | #1116 "For Pierre" (decided 2026-11-03) | when the typed answers suffice | A | about 0.5 h, engine S (#873, #896, #938) |
| MT27 | The mimicry pairs' follow-ups: sourced marks after a mix-up, a reverse trap, Find the X on the pair | Q416 | after Q416 | P (Q416) | about 0.5 h, engine S (#873, #896, #938) |
| MT28 | The placement test: the opt-in adaptive test of 20-25 questions, setting only the starting variables (rules L4, L10) | ROADMAP "Placement test" (decided by Pierre 2026-11-18, #1080); its step 1, the coral calibration set, is #1130 (ST2) | once #1130 is merged and its 50 photos have their answers | A | about 1 h, engine M (#873, #938, #951) |

### 2.3 Long term (later; ROADMAP's far rows, grouped)

Each row groups items of [the inventory's](2026-11-18-backlog-inventory.md) section 4 that are still open; their
figures are there.

| # | Items | Where | Next step | Who |
| --- | --- | --- | --- | --- |
| LT1 | Learning engine, waiting for data: L7 slope and per-format guess rates, L10 time in the photo rating, L11 response time and enlargement, L12 photo features, L15 level-dependent target, L17 first-launch recalibration, L20 fitted profiles, L21 lecture position | inventory 4.1 | re-measure at each row's threshold | A |
| LT2 | Q351 (a) hold the uncertainty model, re-run at about 20 players; (b) the fish ease weight | ROADMAP "The expectation's slope" | Pierre's answer (3.3) | P |
| LT3 | New modes and ideas: the seven modes of 2026-11-08 (L31, Pierre sets the order), L32-L35, L5 coral held-out set, L14 calibrated medium-size game photo sets, L18, L23, L25, L26, L28, L36 (its placement phase is decided: MT28), L38, L40 | inventory 4.1; ROADMAP "Game modes" | Pierre picks | P |
| LT4 | Fish: F10 achievements after the species level, F25 the families left out, F26 Reef Life Survey counts, F27 more photos, F28 a juveniles card per species | inventory 4.2 | on their trigger | A |
| LT5 | Corals: C3 Key photos as they come, C6 glossary, C7-C10, C12 small lecture photos, C13 *Astrea* in ReefCloud | inventory 4.3 | mostly an IMR trainer's or Pierre's input | P |
| LT6 | Sea slugs: S8 look-alikes' rest, S10 achievements beyond the ladder (#1112), S11 an ID key | inventory 4.4 | after species step 2 | A |
| LT7 | Analyses: A3 next views, A4 multiple testing's open items, A5 structure views, A6 sheet readers, A8, A9, A11 | inventory 4.5 | as the data comes | A |
| LT8 | Data structure, costly to undo: corals as a tree subject (a), `replay` for every subject (b), old keys dropped (c), the answer log to D1 (d, B1), `curation.json` split (e), one unit id scheme (f), sync by answers (g), rule D4 by deploy order (i); B3, B5, B7 | [architecture review](2026-11-18-architecture-code-review.md) "Questions for Pierre" | his answers (3.3) | P |
| LT9 | Content and rights: P4 Corals of the World, P6 a version line on About, P7 rights for a later split, P8 AVIF (a), P11 reuse in ReefRecall (only when he asks) | inventory 4.7 | Pierre | P |
| LT10 | Platform: professionalise (c) the sheet on an IMR Workspace, (d) a data agreement, (e) a second person with recovery; I6 PR previews | ROADMAP "Professionalise the platform" | Pierre (3.3) | P |
| LT11 | Infra ideas: I9 deploy after Candidate photos, I10 iNaturalist v2 (`inat_api` one version behind), I12-I14 | ROADMAP | one at a time | A |
| LT12 | Product and process: T4 a generic product, T6 survey organisations' training; D4 the next independent reviews; D5 feedback without asking; D7 the morning-report task (Q202) | ROADMAP | Pierre (D7 in 3.3) | P |

## 3. Questions waiting for Pierre

### 3.1 Numbered, open (STATUS)

| # | Context | Recommendation |
| --- | --- | --- |
| Q407 | Hide (Players › List) keeps a player off every leaderboard (#1113) | keep it so |
| Q408 | The groups-carry-rights study's 8 questions (#1118 §6): one concept, only additive, storage columns, … | each as the study recommends |
| Q409 | The comment rule's wording ("what the code does and why, present tense, a few lines; a decision links its record") | yes |
| Q410 | The five new sea slug achievement names (#1112) | information: rename freely |
| Q411 | #1116: the simulated expert −3.0 points on answers 200-300, unclear | level 2 first |
| Q414 | Architecture step 4: a `slow` tag takes the slow statistical tests out of the pre-push tier; rule W14's wording changes | yes |
| Q415 | Rule L11 and LEARNING's method differ on five points (#1163's description) | none yet: the integrator forms one per point before asking |
| Q416 | The mimicry pairs: reverse trap, marks after a mix-up, Find the X on the pair, duels ×2 | later; yes next; after species units; keep |
| Q417 | The "Pikachu" nickname to *Thecacera pikachu*, moving the star from *T. pacifica* (literature scan §6) | yes (Pola et al. 2026) |

### 3.2 Unnumbered, in STATUS "Still open"

| Where | Context | Recommendation | Number it? |
| --- | --- | --- | --- |
| #1099 | The corals' reserve costs two L11 breaches (score 30.2 → 27.2); "never seen" by observation changes the corals' exam | keep the cost as the honest exam's; "never seen" is the integrator's (rule P4) | yes: the players' exam, cited later |
| #1093 | The corals' beginner plateau unclear at level 1 | level 2 first (ST8); asked only if still unclear | no |
| #1045 | Items 4 (117 held-out observations swap) and 6 (an `over` breach) | accept both | no: one PR's cost |
| #1095 | Backup retention wording, what Delete leaves, live games' 6-hour keep <!-- effort-ok: a retention period, not an estimate --> | his reading | no |
| #1098 | One app by role (a)-(f) | as the study recommends, after Q408 | yes for (a)-(f) that set what each role reaches |
| #1041 §6 | What is not in species step 2 | confirm the list | no |

### 3.3 Recorded open elsewhere, absent from STATUS

No answer found in `docs/decisions/` nor in the merged PRs' bodies I read; the integrator checks the chat before asking.

| Where | Context | Recommendation | Number it? |
| --- | --- | --- | --- |
| [Professionalise](2026-11-14-professionalise-study.md) (a), (b) | a domain (about US$10-12 a year) and who pays; who owns the accounts. They gate the rename "before December 2026" | a domain at the rename; a free GitHub organisation and a project e-mail | yes: money, accounts, irreversible |
| Professionalise (c)-(e) | the sheet on an IMR Workspace; a data agreement with IMR; a second person with recovery | ask IMR; yes; yes | yes |
| [Architecture review](2026-11-18-architecture-code-review.md) (a)-(g), (i) | data formats and the engine's structure ((h) is done: #1102) | yes to each, (a) with (f), (d) with (g) | yes for (d), (e), (f), (g): stored formats |
| [App gaps](2026-11-18-app-gaps-review.md) (a)-(j) | scope extended beyond circle 1, subjects' practice games | yes to (a)-(c), (e), (j); Compare and Duels first (d); later (f); not now (g), (h); ask a trainer (i) | no: content, easy to correct |
| [Live prep](2026-11-18-live-prep-study.md) (a)-(e) | a difficulty band for trainers, saved sets, a deleted trainer's sets (rule D7) | option A for (a) and (b), option B for (c); (d), (e) as the study recommends | yes for (b), (c): a stored format, deletion |
| #1071 (a)-(e) | the "What I learn" card: where, levels on early, off, juveniles, names rows | as the study recommends | yes for (b), (c): they move progress |
| Q351 (a), (b), AVIF (a), fish key and fish mode points | ROADMAP rows "The expectation's slope", "Photos out of the repo", "Fish identification key", "Fish mode" | hold and re-run; measure; leave AVIF parked; the points in his admin | already numbered (Q351); the rest no |
| D7 | the morning-report scheduled task, disabled by Q202; the quota is fresh | re-enable | no: Q202 exists |

## 4. Pierre's hands

| # | What | Where |
| --- | --- | --- |
| H1 | A `release` ruleset (Restrict deletions, Block force pushes, as `main`) | GitHub settings |
| H2 | Grant himself the trainer role, to host a live game | admin, Roles |
| H3 | Light and Cover proposals, then Publish; Points (with the Coral Finder 2022 pages) | admin |
| H4 | The 8 unsure fish candidates (apart from the 8 new ones of ST12) | admin; ROADMAP "Species photos" |
| H5 | The 16 non-Philippine *A. pyroferus* juvenile photos and `fbAcpyr_j0` | admin |
| H6 | The analyses token's type and the R2 token's scope | Cloudflare, GitHub |
| H7 | R2 usage read again (63% is from 2026-11-15, `tools/infra.json`), or a read-only token so CI reads it | Cloudflare dashboard |
| H8 | Renew the admin GitHub token before late January 2027 | GitHub |

## 5. Contradictions and stale records

| # | Where | What it says | What is true |
| --- | --- | --- | --- |
| X1 | The integrator's state at 06:30 | `stoic-ritchie-fp1ipu` is a W6 slip | Superseded, my reading: #1053 shipped the same case (*Goniobranchus* sp. 5) as v170 with a narrower rule (`Code.gs` `SP`: a digit only in "sp. N"); the branch's broader `SP` (any digit) and its `tests/specieslog.test.js` exist only on the branch. The re-check's I15 says "can go". |
| X2 | INTEGRATOR "Branches without a PR"; `tests/docs.test.js` `ID_ALLOW` | the seal note and the level-count note live only on their branches | Both are on `main` (`docs/reviews/2026-11-09-*`); ROADMAP's seal row says so. |
| X3 | `clean.yml` `KEEP` | keeps `admin-signout-seal` and `fish-todo-wip` | The seal is built (#1078). `fish-todo-wip` was called superseded by STATUS and ROADMAP as of 2026-11-18 (inventory X14); today's STATUS, ROADMAP and INTEGRATOR do not name it. |
| X4 | origin | `optimistic-newton-b82nxm` | Its tip is an ancestor of `main` (#1109): nothing on it. |
| X5 | Re-check C4 | blocked on Q294's wording | Decided in #1086 ([record](../decisions/2026-11-18-rules-wordings.md) "The book (Q294)"). |
| X6 | Re-check F1 | blocked on Q413 | Q413 answered at 05:13: merge #1148. |
| X7 | STATUS "Still open" | six unnumbered points | Eight more are recorded open elsewhere (3.3), the rename's gates among them. |
| X8 | STATUS "Last checked" | reports and events read 2026-11-18 16:20 | AGENTS.md asks for every morning: due (ST1). |
| X9 | `tools/infra.json`, ROADMAP "Hosting capacity" | R2 6.3 GB on 2026-11-15 | The sea slug photos and the refills of 11-18 (#1070) came since: unmeasured (H7). |
| X10 | Inventory D8 | splitting LEARNING and ARCHITECTURE is an idea | Done as maps and specs by the docs restructuring (#1123 to #1163). |
| X11 | Inventory 1.3 "Basics" | Fish basics waits for the IMR presentation | #1108 built it from that presentation. |
| X12 | ROADMAP:193 | the corals' photo source priority is "for Pierre to decide" | Rule P1, reworded with his words in #1086, decides it (MT30); my reading. |

The inventory rows done since are named in this study's PR description, not here (rule W19).

## 6. What I checked and what I did not (rule W11)

Checked:
- The 19 open PRs: their bodies' "Choices", "For Pierre" and questions, labels, and their checks on the current head.
- The PRs merged since the inventory: 113, from pages 1-2 of the closed PRs by update time (pages 3-4 held none).
- `docs/decisions/` of 11-18 and 11-19.
- The 11-18 and 11-19 studies' question sections and the reviews README's "Open items".
- ROADMAP's rows by status.
- The remote branches against every PR's head (`train/*` aside: `clean.yml` removes them).
- `clean.yml` `KEEP`, `tools/infra.json` and `tools/brief.py`'s output at 06:31.

Not checked:
- The sheet (answer counts, the Reports and Events tabs) and Pierre's chat. The recorded-open questions of 3.3 may have
  been answered there.
- The Codex thread counts, taken from the integrator's state.
- The local clone is shallow, so its commit counts were not used.
- The inventory's rows not re-checked by #1172 (ideas, waiting) were carried over as they were, not re-verified.
- The mapping of the inventory's 151 rows onto these tables was not checked row by row. Codex's second round found
  three missing (C1, L14, I8), now added; a row found in none of these tables nor done is an omission.
- The estimates are my reading of each item's type and band.
