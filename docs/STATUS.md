# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-19, about 02:10 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since the 11/17 report, already handled).

## Now

Main: sheet script **v187** (#1146); the script updates from `release`, which only the train moves. Trains:
`tools/train.py`, one at a time. Agents: at most 4 that write code or run tests, studies on top; model per the table
(#1086); files only with Write/Edit; no scheduled reminders from agents (they land in the integrator's session).

- **Merged since 00:35**: #1144 docs PR 8 (a size and line budget on every living doc), #1145, #1143 + #1147 + #1151
  (ARCHITECTURE's Admin, Front end and Subjects into docs/spec/: ARCHITECTURE 760 KB at 18:00 → 156 KB), #1133 variant
  classes and mimicry (its choices 1-4 the integrator's call, 5 in Pierre's hands), #1149, #1150 (LEARNING 740 KB at
  18:00 → 220 KB), #1146 architecture step 3: 58 shared engine names `fish*` → `tree*` (v187; `tests/treenames.test.js`
  keeps the old names out).
- **Merging**: #1152 (LEARNING's Simulation section into a spec; LEARNING → 203 KB).
- **Agents running (4)**: ARCHITECTURE's remaining sections (the last of docs PR 4); LEARNING's next section (PR 5);
  the remaining small test files' comments; the mimicry pairs drilled in the look-alike formats (traps, duels).
- **Waiting**: #1121 core.js + Code.gs comments: two CodeQL false positives (Pierre's hands), then re-assign v188.
  #1117 (hooks, analysis session): its 6 Codex threads. #1116, #1130, #1148: Pierre's answers (Q411-Q413).
- Every new decision record: "Date: … PR: #N." and an index row; two PRs adding a row (or lowering the same budget line
  in `tests/docs.test.js`) conflict: merge one at a time, keep both rows (`scratchpad/union.py`) or the lower budget.
- Slips tonight: force-pushes on agents' own branches, heredocs and pipes, `gh api` for PRs, tests run on the
  integrator's copy (`slot.js` does not change directory: `env -C <worktree>`); the integrator queued an old head
  once and wrote queue waiters whose `pgrep -f` pattern matched their own command line.

## Night queue

Comment cleanup (Pierre, 19:20: "ok, lance le nettoyage cette nuit"): history out of the comments, code token-for-token
the same (checked with acorn); decisions found only in comments moved to records.
- Merged: #1124, #1126, #1127, #1128, #1131, #1132, #1139, #1142, #1137 (second pass: app, quiz, sync 26% → 21%).
  #1121 core.js + Code.gs: blocked (CodeQL). The remaining small test files: running. Second pass on core.js and
  Code.gs: after #1121.
- Docs: PRs 1, 2, 3, 5 (three sections), 6, 7, 8 merged; PR 4: five sections merged, the rest running; PR 5: the
  next section running.
- Architecture: step 3 merged (#1146); step 4 (core.js split, a `slow` test tag) waits for #1121 and Q414.
- Look-alike pairs: #1133 merged; the pairs in traps and duels: running.
- Waiting for Pierre: #1130 calibration set (Q412), #1116 typed answers (Q411), #1148 fish own stats (Q413).

## Next

1. Versions one at a time: #1121 (re-assign v188) once Pierre has dismissed its two CodeQL alerts.
2. Backlog (`docs/reviews/2026-11-18-backlog-inventory.md`): frames model; game formats; C12 photos.
   After Pierre: roles UI (#1098 + #1118), #1071, species step 2 (#1041).

## Questions for Pierre

Answered tonight: Apart removed (#1113); the comment cleanup; the rules audit (#1117's study): 1-5 and 8 ok, 6 and 7
dropped (the docs describe a coherent model in our words; no new manual step for Pierre), 9 parked.

- **Q407** Hide (Players › List) keeps a player off every leaderboard. Keep it so (recommended), or the general board
  only, their groups' boards kept? (#1113)
- **Q408** The groups-carry-rights study's 8 questions, each with a recommended answer: #1118 section 6.
- **Q409** The comment rule's wording, for the rules and a test on added lines (proposed): "A code comment says what
  the code does and why, in the present tense, in a few lines; a decision links its record in docs/decisions/; no
  version tags, dates, quotes or question numbers."
- **Q410** The five new sea slug achievement names (#1112): rename freely.
- **Q411** #1116 typed answers: a typed miss counts in the pooled pairs; Acropora's confusion group changes; simulated
  expert −3.0 points on answers 200-300 ("unclear"). Level-2 simulation first (recommended), merge, or drop that part?
- **Q412** #1130 coral calibration set: members drawn twice as often until 20 answers, on held genera only; simulated
  beginner −0.013 at question 300 ("unclear"), caught up by 600. Merge (recommended) or no boost for beginners?
- **Q413** #1148 fish read their own pooled stats in the app: the fish draw shifts slightly; level-1 simulation (Codex
  asks for level 2 with L12, which the rated world cannot model); the strong RA's bar error moves +0.034 (margin +0.030),
  closer to true knowledge. Merge (recommended), or level 2 first?
- **Q414** Architecture step 4: a `slow` tag takes the slow statistical tests out of the pre-push tier (CI and the
  train keep them); it changes rule W14's wording. Recommended: yes.

Still open: #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points (backup "three months" wording; audit
rows after deletion; the Notes tab); #1098 (a)-(f) (with #1118); genera opening vs the two trees (#1041 §6).

Last question number: Q414

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`); Security › Code scanning:
  dismiss as false positives the two "Incomplete URL substring sanitization" alerts of #1121 (core.js `photoFallback`
  and `photoRetry`, lines identical to main, moved up by the shorter comments; agents get 403 there).
- **Roles**: grant himself the trainer role to host a live game (the lobby now shows a QR code: scan it once).
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages); the 8 unsure
  fish candidates; the 16 non-Philippine *A. pyroferus* juvenile photos and `fbAcpyr_j0` (yellow form, #1133).
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None (the Night queue holds the night's work).

## Last stop

2026-11-19 ~02:10 Manila: handover. Scratchpad: `pierre-msgs.jsonl` (real names: delete tomorrow) and `placement/data/`
(player data): delete, never commit. Queue waiters: never `pgrep -f` a pattern your own command line contains.
