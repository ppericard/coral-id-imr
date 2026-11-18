# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-19, about 03:35 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work (Pierre, 11:08).

Last checked: reports and events: 2026-11-18 ~16:20 Manila (nothing new since the 11/17 report, already handled).

## Now

Main: sheet script **v187** (#1146); the script updates from `release`, which only the train moves. Trains:
`tools/train.py`, one at a time. Agents: at most 4 that write code or run tests, studies on top; model per the table
(#1086); files only with Write/Edit; no scheduled reminders from agents (they land in the integrator's session).

- **Merged since 02:10**: #1152, #1155; #1153, #1157, #1160 (comments of tests/, tools/, workflows); #1154
  (ARCHITECTURE a map: 760 KB at 18:00 → 36 KB); #1156, #1158, #1163 (LEARNING as the code runs, history in the
  notebook: 740 → 170 KB); #1162 (mimicry pairs drilled in traps, duels, Agains; level 1: guardrails held, primary
  "cannot tell", 3 class questions in 7,500); #1165 (ROADMAP and the reviews index hygiene).
- **Train queue**: #1164 (sea slug literature: two sourced species pairs, judging hints), #1159 (fish species units named
  in the admin; Prettier fixed after a merge), then #1161 (the admin's registry follows the published content) and
  #1166 (the fish Journey's opt-in choices), each with main merged first (both decision index rows kept).
- **Agents running (4)**: load order (b) and (d) (`learn.js` and `proto/lab.css` out of the quiz's tier); the fish
  genus page's "Don't confuse with" (F11); the taxonomy reference's monthly refresh (P10: the reference file only);
  the admin's read-only Taxa view (admin plan PR 12).
- **Waiting**: #1121 core.js + Code.gs comments: two CodeQL false positives (Pierre's hands), then re-assign v188.
  #1117 (hooks, analysis session): its 6 Codex threads. #1116, #1130, #1148: Pierre's answers (Q411-Q413).
- Every new decision record: "Date: … PR: #N." and an index row; two PRs adding a row (or lowering the same budget line
  in `tests/docs.test.js`) conflict: merge one at a time, keep both rows (`scratchpad/union.py`) or the lower budget.
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
   #1121); F15's rest; S4 the sea slugs' judging pass; C2 the coral lecture pairs apart from the Coral Finder's.

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

Still open: #1099 floor + "never seen"; #1093 A/B; #1045 A/B; #1095 three points; #1098 (a)-(f); #1041 §6.

Last question number: Q417

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
