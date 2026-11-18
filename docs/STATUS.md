# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 14:40 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~10:40 Manila.

## Now

Main: sheet script **v177** (#1079). Trains: `tools/train.py`, one at a time (overlapping trains fail on "main moved").
Agents: at most 4 that write code or run tests, studies on top; model and effort per the table in #1086 (Opus for
design, engine, security; Sonnet for ordinary code and docs; Haiku for bulk work after a sample test); agents edit files
only with Write/Edit (no inline code in shell: it makes Pierre approve prompts). Estimates: `tools/effort.py` (#1087).

- **Today, merged** (50+): see `git log`. Since 13:10: #1096 (Code.gs line 1 short, history in tools/sync/HISTORY.md),
  #1086 rules, #1100, #1097 feedback study, #1085 look-alike pairs, #1041 species step 2 plan, #1103 (--assign tool fix).
- **Merging, one by one** (`queue.sh 1083 1092 1105 1078`): #1083 content version (v178 assigned; I fixed a docs test:
  `Code.gs floorRef_` allow-listed as history); #1092 fish grid (I fixed it: its Codex fix declared `boardUnits`, already
  sync.js's, and progress.js stopped loading: renamed `boardTiles`); #1105 a test that fails on such clashes between
  the app's scripts; #1078 seal (both Codex threads real, fixed with tests; no version needed).
- **Next versioned**, one at a time after #1083 (merge main, `--assign`, push, `@codex review`, queue): #1091 player
  groups (v179), #1101 infra health (INFRA_SHEET to reassign), #1102 release branch (then Pierre adds the `release`
  ruleset), #1099 per-player reserve (after Pierre).
- **Waiting for Pierre**: #1104 docs PR 1 (Codex-clean, green; OK on three factual rule wordings: A4 + ui "subject
  picker", W18 "rewrite done 08/11"; its agent holds PR 2 until it merges); #1099 (B floor 40? "never seen" by
  observation?); #1093 repeat-photo fix (A rec.); #1045 reference from traits (A rec.; then apply P1 strictly: no medium
  size, no schools in REF_LOOK); #1095 privacy page (3 points); #1098 one app by role study (a)-(f).
- **Agents running**: #1106 infra 4 (`tools/unminify.js`: error positions back through the source maps; Codex
  reviewing); short feedback sheet build (layout A + More counter, Sonnet).

## Next

1. The merge order above; versions: #1083 v178, #1091 v179, release branch and infra as they come.
2. Queue (task list): sourced tell-apart lines (40 coral, 9 sea slug pairs) after the feedback sheet; docs
   restructuring PRs 2+ (after #1104); roles UI and one app
   by role (after #1098's answers); Fish basics from the Drive decks; C12 lecture photos; sea slug achievements
   60-100%; small fixes; variant classes with mimicry, cards, the out-of-region warning, pairs M1-M7 (#1085); frames
   model; typed answers; live fixes and prep (#1077); What I learn card (#1071); game formats; coral calibration set
   then the explicit placement test (#1080); architecture steps 3-4; species step 2 build (#1041).
3. Infrastructure watch (R2, sheet cells, quotas, Pages); domain only when needed.

## Questions for Pierre

Answered today (in their PRs): Q400-Q406, W27, model table, estimates, no inline code, P1, P4, C2/D5, C3, L4, W19 +
docs plan, licence A (all rights reserved for now), security reporting (enabled), groups model, Trainer/Curator/
Manager/Admin names, one-app study, placement → calibration then explicit test, feedback sheet (a)-(f), multi-photo,
pairs, mimicry class, per-player reserve, infra 1-4.

Still open: #1104 three wordings; #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points (backup "three months" wording; audit rows after deletion; the
Notes tab); #1098 (a)-(f); genera opening vs the two independent trees (#1041 §6).

Last question number: Q406

## Pierre's hands

- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages, #1085); the 8
  unsure fish candidates; a look at the 16 non-Philippine *A. pyroferus* juvenile photos.
- Check the "Coral ID analyses" token's type and the R2 token's scope; renew the admin GitHub token before late January
  2027. (Done today: `main` protected; pCloud backup live, weekly.)

## Parked after hours

- None.

## Last stop

2026-11-18 ~14:40 Manila: handover. Scratchpad holds player-data extracts (`placement/data/`): delete, never commit.
Queue waiters: never `pgrep -f` a pattern your own command line contains (two waiters deadlocked on it today).
