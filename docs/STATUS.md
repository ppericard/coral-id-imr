# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 20:10 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since the 11/17 report, already handled).

## Now

Main: sheet script **v184** (#1112); the script updates from `release`, which only the train moves. Trains:
`tools/train.py`, one at a time. Agents: at most 4 that write code or run tests, studies on top; model per the table
(#1086); files only with Write/Edit; no scheduled reminders from agents (they land in the integrator's session).

- **Merged since 18:45**: #1108 Fish basics (v182; the deck's two picture slides, converted by Pierre, confirm the
  tails, markings and shapes), #1111, #1114 live lobby QR code, #1104 docs PR 1 (its three wordings confirmed by the
  integrator as factual), #1110 short feedback sheet (v183), #1112 sea slug achievements 60-100% (v184).
- **Merging tonight**, in this order: #1117 (from the analysis session, Pierre "ok, lance les quatre": a PreToolUse
  hook refusing heredocs and inline code, train.py checks PR descriptions from #1117 on, `tools/night.py`; reviewed,
  its allowlist cut to read-only commands), #1115 docs PR 2 (decision records index), #1118 groups-carry-rights study,
  #1113 no "apart" groups + "Saving…" in Groups (v185), then #1119 sourced tell-apart lines and #1120 docs PR 7
  (CONTRIBUTING, glossary, data map, tools README) once Codex-clean.
- **Agents running (4/4)**: typed answers, what is left (Opus); comment cleanup 1, core.js + Code.gs (Opus); comment
  cleanup 2, model.js, app.js, quiz.js, sync.js (Opus); docs PR 3, the version history out of ARCHITECTURE (Sonnet).
  Slips tonight: the live agent force-pushed its own branch; the docs PR 2 agent used a heredoc; the tell-apart agent
  opened its PR with `gh api` and scheduled a reminder that fired here. Say it in every brief.

## Night queue

- Comment cleanup 1 (core.js, Code.gs): running, PR to come. Pierre, 19:20: "ok, lance le nettoyage cette nuit".
- Comment cleanup 2 (model.js, app.js, quiz.js, sync.js): running, PR to come.
- Comment cleanup 3 (admin.js, progress.js, autosort.js, learn.js, the rest by size): NOT STARTED, next free slot.
- Docs PR 3 rest (history out of ARCHITECTURE.md, sheet_version.py): running, PR to come.
- Docs PRs 4-6 (ARCHITECTURE as a map, LEARNING as a spec, ROADMAP and handovers), with the rules audit's approved
  points 1-5 and 8 folded in: NOT STARTED, after #1115.
- Typed answers, what is left: running, PR to come.

## Next

1. Versions one at a time: #1113 (v185 assigned) after #1117/#1115/#1118; then the comment cleanup 1 (Code.gs).
2. After the night queue, from the backlog (`docs/reviews/2026-11-18-backlog-inventory.md`, ROADMAP): variant classes
   with mimicry, cards, the out-of-region warning, pairs M1-M7 (#1085); frames model; game formats; coral calibration
   set then the placement test (#1080); architecture steps 3-4; fish read their own stats; C12 lecture photos.
   After Pierre: roles UI (#1098, now with #1118), What I learn card (#1071), species step 2 (#1041).
3. Infrastructure watch (R2, sheet cells, quotas, Pages); domain only when needed.

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

Still open: #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points (backup "three months" wording; audit
rows after deletion; the Notes tab); #1098 (a)-(f) (with #1118); genera opening vs the two trees (#1041 §6).

Last question number: Q410

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game (the lobby now shows a QR code: scan it once).
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages, #1085); the 8
  unsure fish candidates; a look at the 16 non-Philippine *A. pyroferus* juvenile photos.
- Check the "Coral ID analyses" token's type and the R2 token's scope; renew the admin GitHub token before late January
  2027.

## Parked after hours

- None (the night's work is the Night queue above).

## Last stop

2026-11-18 ~20:10 Manila: handover. Scratchpad: `pierre-msgs.jsonl` (Pierre's messages, real names: delete tomorrow)
and the player-data extracts (`placement/data/`): delete, never commit. Queue waiters: never `pgrep -f` a pattern your
own command line contains.
