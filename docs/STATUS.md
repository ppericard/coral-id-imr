# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-19, about 00:35 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since the 11/17 report, already handled).

## Now

Main: sheet script **v186** (#1138); the script updates from `release`, which only the train moves. Trains:
`tools/train.py`, one at a time. Agents: at most 4 that write code or run tests, studies on top; model per the table
(#1086); files only with Write/Edit; no scheduled reminders from agents (they land in the integrator's session).

- **Merged since 18:45**: #1108 Fish basics (v182; the deck's two picture slides, converted by Pierre, confirm the
  tails, markings and shapes), #1111, #1114 live lobby QR code, #1104 docs PR 1 (its three wordings confirmed by the
  integrator as factual), #1110 short feedback sheet (v183), #1112 sea slug achievements 60-100% (v184), #1118
  groups-carry-rights study, #1113 no "apart" groups (v185), #1120 docs PR 7, #1122, #1124, #1125 inat test flake,
  #1127, #1126, #1115 docs PR 2 (decision records index + a docs test on every record), #1123 docs PR 3 (history out
  of ARCHITECTURE, 760 → 659 KB), #1129, #1119 sourced tell-apart lines, #1128, #1131, #1132, #1135, #1136 (LEARNING
  740 → 296 KB), #1134 + #1141 (ARCHITECTURE → 406 KB, docs/spec/), #1137, #1138 Divemaster texts at 85% (v186),
  #1139, #1142, #1140 (ROADMAP 201 → 113 KB, HANDOVER 48 → 22 KB).
- **Merging**: #1144 docs PR 8 (budgets on every living doc). #1133 variant classes and mimicry: its agent merges
  main (LEARNING restructured); its choices 1-4 shipped as the integrator's call (easy to change), 5 in Pierre's hands.
  #1121 core.js + Code.gs comments: blocked by two CodeQL alerts (Pierre's hands); re-assign v187 after (#1138 took v186).
  #1117 waits for its 6 Codex threads (analysis session).
- **Agents running**: fish read their own stats (admin plan PR 11), architecture steps 3-4, docs PR 4c (ARCHITECTURE's
  Admin section into a spec), #1133's merge. New decision records: "Date: … PR: #N." and an index row; PRs adding a
  row conflict in the index: one at a time (`scratchpad/union.py` keeps both rows).
  Slips tonight: force-push (live agent), heredocs and pipes, `gh api` for PRs, tests run on the integrator's copy
  (`slot.js` does not change directory: `env -C <worktree>`); the integrator queued an old head once and wrote four
  queue waiters whose `pgrep -f` pattern matched their own command line (they would have waited for ever).

## Night queue

Comment cleanup (Pierre, 19:20: "ok, lance le nettoyage cette nuit"): history out of the comments, code token-for-token
the same (checked with acorn); decisions found only in comments moved to records.
- Merged: #1124, #1126, #1127, #1128, #1131, #1132, #1139, #1142 (code identical; front end, admin, tests, tools).
  #1121 core.js + Code.gs: blocked (CodeQL, Pierre's hands). Second pass, long blocks shortened: #1137 merged (app,
  quiz, sync: 26% → 21% comments); core.js/Code.gs after #1121; the small remaining test files: NOT STARTED.
- Docs: PRs 1, 2, 3, 5, 6, 7 merged; PR 4 Progress sync (#1134) and Data files (#1141) merged, Admin running; PR 8
  #1144 merging. Left: ARCHITECTURE's other sections, LEARNING's other sections.
- Coral calibration set: #1130, waits for Pierre (Q412). Variant classes and mimicry: #1133, merging.
- Typed answers, what is left: #1116, waits for Pierre (Q411). Flaky inat test: #1125, merged (stub ids only).

## Next

1. Versions one at a time: #1121 (re-assign v187) once Pierre has dismissed its two CodeQL alerts.
2. Backlog (`docs/reviews/2026-11-18-backlog-inventory.md`): frames model; game formats; C12 photos. After Pierre: roles UI (#1098 + #1118), #1071, species step 2 (#1041).

## Questions for Pierre

Answered tonight: Apart removed (#1113); the comment cleanup; the rules audit (#1117's study): 1-5 and 8 ok, 6 and 7
dropped (the docs describe a coherent model in our words; no new manual step for Pierre), 9 parked.

- **Q407** Hide (Players › List) keeps a player off every leaderboard. Keep it so (recommended: simplest, right for test
  accounts), or hide from the general board only, their groups' boards kept? (#1113)
- **Q408** The groups-carry-rights study's 8 questions, each with a recommended answer: #1118 section 6.
- **Q409** The comment rule's wording, for the rules and a test on added lines (proposed): "A code comment says what
  the code does and why, in the present tense, in a few lines; a decision links its record in docs/decisions/; no
  version tags, dates, quotes or question numbers."
- **Q410** The five new sea slug achievement names (Gill and frill, Muck magnet, Slug savant, Nudibranch nerd, Every
  last slug): rename freely (#1112).
- **Q411** #1116 (typed answers, what is left; green, Codex-clean but one thread left for Pierre): a typed miss counts
  as one offer and one mix-up in the pooled pairs. On the real log 12 coral and 5 fish pairs move; Acropora's
  confusion group becomes Anacropora's (was Astreopora and Cyphastrea), which shifts the opening order there; in the
  level-1 simulation the expert's right % on answers 200-300 falls 95.2 → 92.2 (bounds −5.1 to −0.9), verdict
  "unclear: one step up". Merge as is, run the level-2 simulation first (recommended), or drop the pooled part?
- **Q412** #1130 coral calibration set (50 photos): a member drawn twice as often until 20 answers, on held genera
  only. Simulated beginner −0.013 at question 300 ("unclear"), caught up by 600; members rated ~2 weeks sooner. Merge
  (recommended), or no boost for beginners? Its points 2-3 (repeats, members alone): recommended no, not built.

Still open: #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points (backup "three months" wording; audit
rows after deletion; the Notes tab); #1098 (a)-(f) (with #1118); genera opening vs the two trees (#1041 §6).

Last question number: Q412

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`); Security › Code scanning:
  dismiss as false positives the two "Incomplete URL substring sanitization" alerts of #1121 (core.js `photoFallback`
  and `photoRetry`, lines identical to main, moved up by the shorter comments; agents get 403 there).
- **Roles**: grant himself the trainer role to host a live game (the lobby now shows a QR code: scan it once).
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages, #1085); the 8
  unsure fish candidates; a look at the 16 non-Philippine *A. pyroferus* juvenile photos.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None (the Night queue holds the night's work).
## Last stop

2026-11-19 ~00:35 Manila: handover. Scratchpad: `pierre-msgs.jsonl` (Pierre's messages, real names: delete tomorrow)
and the player-data extracts (`placement/data/`): delete, never commit. Queue waiters: never `pgrep -f` a pattern your
own command line contains.
