# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 21:40 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since the 11/17 report, already handled).

## Now

Main: sheet script **v185** (#1113); the script updates from `release`, which only the train moves. Trains:
`tools/train.py`, one at a time. Agents: at most 4 that write code or run tests, studies on top; model per the table
(#1086); files only with Write/Edit; no scheduled reminders from agents (they land in the integrator's session).

- **Merged since 18:45**: #1108 Fish basics (v182; the deck's two picture slides, converted by Pierre, confirm the
  tails, markings and shapes), #1111, #1114 live lobby QR code, #1104 docs PR 1 (its three wordings confirmed by the
  integrator as factual), #1110 short feedback sheet (v183), #1112 sea slug achievements 60-100% (v184), #1118
  groups-carry-rights study, #1113 no "apart" groups (v185), #1120 docs PR 7, #1122, #1124 comment cleanup 2.
- **Merging, one chain at a time** (scratchpad q30, q31): #1125 inat test flake, #1127 comment cleanup tools/tests,
  then #1115 docs PR 2 (its train was red: the no-apart record lacked its PR line; fixed), #1123 docs PR 3 (history
  out of ARCHITECTURE, 760 → 659 KB), #1126 comment cleanup front rest. Then #1121 comment cleanup core.js + Code.gs
  (next version, assigned with #1123's tool), #1119 sourced tell-apart lines (merge main first: quiz.js, Code.gs),
  #1128, the admin.js cleanup. #1117 (hooks, from the analysis session) waits for its 6 Codex threads.
- **Agents running (3)**: coral calibration set (#1080, Opus), comment cleanup tests 2 (#1128), admin.js cleanup.
  After #1115 merges, every open PR's decision record needs "Date: YYYY-MM-DD. PR: #N." and an index row (docs test).
  Slips tonight: force-push (live agent), heredocs and pipes (docs and cleanup agents), `gh api` for PRs; a scheduled
  reminder from an agent fired here. The integrator queued an old head of #1113 once (50 min lost): queue only after
  the push shows on GitHub, and only one queue chain at a time.

## Night queue

Comment cleanup (Pierre, 19:20: "ok, lance le nettoyage cette nuit"): history out of the comments, code token-for-token
the same (checked with acorn); decisions found only in comments moved to records.
- core.js + Code.gs: #1121, ready (next sheet version at merge).
- model.js, app.js, quiz.js, sync.js: #1124, merged.
- The other front-end files (43): #1126, ready.
- tools/ and 6 tests: #1127, ready. The other tests: #1128, running. admin.js: running, PR to come.
- A second pass to shorten the long spec-style blocks (most comment lines are still there, now in the present
  tense): NOT STARTED, after these merge.
- Docs PR 3 (history out of ARCHITECTURE): #1123, ready. Docs PRs 4-6 (ARCHITECTURE as a map, LEARNING as a spec,
  ROADMAP and handovers, with the rules audit's points 1-5 and 8): NOT STARTED, after #1115 and #1123.
- Coral calibration set (#1080's first step): #1130, ready, waits for Pierre (Q412). Variant classes and mimicry
  (#1085's decided parts): running.
- Flaky inat test: #1125, ready (the test stub's ids, not the tool: real data unaffected).
- Typed answers, what is left: #1116, ready, waits for Pierre (Q411).

## Next

1. Versions one at a time: #1121 (Code.gs comments) after #1123; #1119 (tell-apart lines) after it.
2. Backlog (`docs/reviews/2026-11-18-backlog-inventory.md`): frames model; game formats; architecture steps 3-4;
   fish read their own stats; C12 photos. After Pierre: roles UI (#1098 + #1118), #1071, species step 2 (#1041).

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

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game (the lobby now shows a QR code: scan it once).
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages, #1085); the 8
  unsure fish candidates; a look at the 16 non-Philippine *A. pyroferus* juvenile photos.
- Check the "Coral ID analyses" token's type and the R2 token's scope; renew the admin GitHub token before late January
  2027.

## Parked after hours

- None (the Night queue holds the night's work).
## Last stop

2026-11-18 ~20:10 Manila: handover. Scratchpad: `pierre-msgs.jsonl` (Pierre's messages, real names: delete tomorrow)
and the player-data extracts (`placement/data/`): delete, never commit. Queue waiters: never `pgrep -f` a pattern your
own command line contains.
