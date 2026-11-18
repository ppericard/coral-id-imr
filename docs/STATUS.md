# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-19, about 04:50 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since the 11/17 report, already handled).

## Now

Main: sheet script **v187** (#1146); the script updates from `release`, which only the train moves. Trains:
`tools/train.py`, one at a time. Agents: at most 4 that write code or run tests, studies on top; model per the table
(#1086); files only with Write/Edit; no scheduled reminders from agents (they land in the integrator's session).

- **Merged since 03:35**: #1167, #1164, #1159, #1161, #1166, #1173 (admin smoke waits 60 s on Analyses: the cause of
  #1168's red train), #1168 (taxonomy refresh), #1172 (inventory recheck: `docs/reviews/2026-11-19-backlog-recheck.md`,
  pick work from it, not the 11-18 snapshot), #1174 (watermark pass 4), #1169 (admin Taxa view).
- **Train chain (scratchpad queue files q91-q93)**: #1178 (A. wallaceae presence) → #1180 (coral near-dups) → #1175
  (load order (b)+(d), already brought up to date). Then, each brought up to date first (`scratchpad/bring.sh WT BRANCH`,
  then `@codex review`, then queue): #1170 (coral pairs split, wt-c2), #1176 (sea slug marks, wt-s6), #1179 (after
  #1176, wt-s6b). Held: **#1171** (Q418).
- **Agents running (4)**: CI speed (I7, wt-ci); tricky pairs on My progress (L24 f, wt-tricky); circle-1 genera with no
  name root, a build report (wt-tree); auto-sort follow-up (A7, wt-autosort). Each reports a PR; queue it the same way.
- **Waiting**: #1121 core.js + Code.gs comments: two CodeQL false positives (Pierre's hands), then re-assign v188.
  #1117 (hooks, analysis session): its 6 Codex threads. #1116, #1130, #1148: Pierre's answers (Q411-Q413).
- Two PRs adding a decision index row conflict: bring each up to date just before its train (`bring.sh`).
- Slips tonight: agents' force-pushes (one `--force-with-lease`, #1164), `sed -i`, `&`, heredocs; the integrator
  committed conflict markers once (fixed next commit) and chained a queue on a waiter that did not wait (train refused).

## Night queue

Comment cleanup (Pierre, 19:20: "ok, lance le nettoyage cette nuit"): history out of the comments, code token-for-token
the same (acorn, `ast.dump`, parsed YAML); decisions found only in comments moved to records.
- Done: the front end, tests/ and tools/ with the workflows. Left: the files open PRs hold (they follow their merges);
  #1121 core.js + Code.gs (blocked: CodeQL), then a second pass on both.
- Docs restructuring: done for ARCHITECTURE and LEARNING; ROADMAP's hygiene done (#1165). Architecture step 4 (core.js
  split, a `slow` test tag): after #1121 and Q414.

## Next

1. Versions one at a time: #1121 (re-assign v188) once Pierre has dismissed its two CodeQL alerts.
2. Backlog (`docs/reviews/2026-11-18-backlog-inventory.md`): the Matrix fish game (decided; it needs core.js, so after
   #1121); the open rows of `docs/reviews/2026-11-19-backlog-recheck.md`.

## Questions for Pierre

Answered tonight: Apart removed (#1113); the comment cleanup; the rules audit (#1117's study): 1-5 and 8 ok, 6 and 7
dropped (the docs describe a coherent model in our words; no new manual step for Pierre), 9 parked.

- **Q407** Hide (Players › List) keeps a player off every leaderboard. Keep it so (recommended), or the general board
  only, their groups' boards kept? (#1113)
- **Q408** The groups-carry-rights study's 8 questions, each with a recommended answer: #1118 section 6.
- **Q409** The comment rule's wording (proposed): "A code comment says what the code does and why, in the present
  tense, in a few lines; a decision links its record in docs/decisions/; no version tags, dates, quotes or Q-numbers."
- **Q410** The five new sea slug achievement names (#1112): rename freely.
- **Q411** #1116 typed answers: simulated expert −3.0 points on answers 200-300 ("unclear"). Level-2 first
  (recommended), merge, or drop that part?
- **Q412** #1130 coral calibration set: simulated beginner −0.013 at question 300, caught up by 600. Merge
  (recommended) or no boost for beginners?
- **Q413** #1148 fish read their own pooled stats: level 1 only (the rated world cannot model L12); the strong RA's bar
  error +0.034 (margin +0.030), closer to true knowledge. Merge (recommended), or level 2 first?
- **Q414** Architecture step 4: a `slow` tag takes the slow statistical tests out of the pre-push tier (CI and the
  train keep them); it changes rule W14's wording. Recommended: yes.
- **Q415** Rule L11 and LEARNING's method differ on five points (#1163's description: level 2's worlds and length, the
  cap and level 3's go vs `learncheck.yml`, level 3's tests vs `learncmp.js`, L12's "four profiles"). Which is right?
- **Q416** The mimicry pairs (#1162), not built: a reverse trap (later, recommended); the pair's sourced marks after a
  mix-up between the two (yes, next, recommended); Find the X on the pair (after species units); duels kept at ×2.
- **Q417** The "Pikachu" nickname: to *Thecacera pikachu* (the species named for it), moving the star from
  *T. pacifica*? (the sea slug literature scan §6, #1164)
- **Q418** #1171 fish genus page "Don't confuse with": every sibling genus of the family with our marks (92 of 99
  pages, up to 23 cards, 4 then More). Merge as is, or only sourced look-alike pairs? (held until you answer)

Still open: #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points; #1098 (a)-(f); #1041 §6.

Last question number: Q418

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`); Security › Code scanning:
  dismiss as false positives the two "Incomplete URL substring sanitization" alerts of #1121 (core.js `photoFallback`
  and `photoRetry`, lines identical to main, moved up by the shorter comments; agents get 403 there).
- **Roles**: grant himself the trainer role to host a live game (the lobby now shows a QR code: scan it once).
- **In the admin**: Light and Cover proposals, then Publish; Points (incl. the Coral Finder 2022 pages); the 8 unsure
  fish candidates; the 16 non-Philippine *A. pyroferus* juvenile photos and `fbAcpyr_j0` (yellow form, tagged `ph`).
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None (the Night queue holds the night's work).

## Last stop

2026-11-19 ~03:35 Manila: handover. Scratchpad: `pierre-msgs.jsonl` (real names: delete tomorrow) and `placement/data/`
(player data): delete, never commit. Chaining trains: wait for the next queue file's `== #N` line, then while
`pgrep -f "mergewhen[.]sh N"` (a real process); a waiter's own command line is not one.
