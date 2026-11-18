# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 13:10 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~10:40 Manila.

## Now

Main: sheet script **v177** (#1079). Trains: `tools/train.py`, one at a time (overlapping trains fail on "main moved").
Agents: at most 4 that write code or run tests, studies on top; model and effort per the table in #1086 (Opus for
design, engine, security; Sonnet for ordinary code and docs; Haiku for bulk work after a sample test); agents edit files
only with Write/Edit (no inline code in shell: it makes Pierre approve prompts). Estimates: `tools/effort.py` (#1087).

- **Today, merged** (40+): see `git log`. Since 11:15: #1070, #1081, #1084 (Mycedium mnemonic), #1082, #1087 effort
  tool, #1088, #1089 docs audit + new README, #1094 (main was red: a refill broke two data-dependent tests), #1079.
- **Merging, one by one**: #1090 estimates, #1092 fish grid fix, #1097 feedback study, #1080, #1085, #1077, #1041, then
  #1096 (Code.gs line 1 short, history in tools/sync/HISTORY.md), then #1083 (content version, assign v178 with the new
  tool). #1086 rules: 2 Codex threads being fixed.
- **Waiting for Pierre**: #1093 repeat-photo fix (a coral beginner's plateau unclear: A merge rec. / B level 2); #1045
  reference from traits (bar−knowledge breach for casualDiver while the bar stays under knowledge: A rec.); #1095
  privacy page (3 points); #1098 one app by role study (a)-(f); #1091 player groups (ready; needs a version); #1078
  seal (2 Codex threads).
- **Agents running**: per-player exam reserve (Opus; replaces #1057's global set: Pierre "la réserve doit être définie
  par joueur"); infra health check + limits dashboard; release branch for the sheet's self-update.

## Next

1. The merge order above; versions: #1083 v178, #1091 v179, release branch and infra as they come.
2. Queue (task list): infra 4 (error stacks through source maps); short feedback sheet (layout A) + its counter, then
   sourced tell-apart lines (40 coral, 9 sea slug pairs); docs restructuring PRs (after #1086); roles UI and one app
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

Still open: #1093 A/B; #1045 A/B; #1095 three points (backup "three months" wording; audit rows after deletion; the
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

2026-11-18 ~13:10 Manila: handover. Scratchpad holds player-data extracts (`placement/data/`): delete, never commit.
