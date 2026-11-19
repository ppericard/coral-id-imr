# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything. This file only cites answers.

Written 2026-11-19, about 09:55 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-19 ~06:25 Manila (nothing new to report; the "empty card closed: feedback"
event was fixed by #1189).

## Now

Main: sheet script **v190** (#1121); #1116 carries v191 (in a train). CLAUDE.md loads AGENTS.md (#1198). **No agent
cap** (rules audit decision 1, Pierre's "ok" of 2026-11-18 evening; `tests/slot.js` guards the machine). A Bash guard
(#1117) refuses heredocs, here-strings, `python -c`, `sed -i`, `node -e`. Scratchpad helpers: `prstate.sh`,
`train_queue.sh` (waits for the running train and Candidate photos, then trains), `resolve_append.py` (append-only
conflicts: main's lines, then the branch's).

- **Priority (Pierre, 09:04): the rules overhaul**, Q425 B step by step. Done: #1198 (AGENTS.md loaded; merge never
  rebase; one PR per agent), #1117 (the approved rules audit, its guards). Running: rules tooling (`tools/asked.py`,
  the ledger check, fewer index conflicts); a **substance review** of every rule (Pierre 09:46: "les règles ne
  méritent pas d'être revues globalement ?"), then the core (#1200, placement proposal, waits for the review: both go
  to Pierre together, as one batch "ok sauf X").
- **Merged today (34)**: from #1179 to #1198, the decisions pass (#1192), the ledger and its history (#1188, #1193),
  the rule wordings (#1190), Rule 0's first-message start (#1191), studies #1185, #1186, #1197, #1071, #1098, fish
  pooled stats (#1148, v189), comments of core.js/Code.gs (#1121, v190).
- **Agents running**: #1099 port (Q420 A; P1: no exclusion by route or source), #1045 port (Q421 A), #1095 rebuild
  (privacy page: screenshots to Pierre for his reading), one-engine steps 1-2, #1195 level-2 check (P1 on the corals:
  level 1 breached three cells; merge if level 2 shows no loss, else a question with figures), fish judging (8
  candidates), Pikachu data then the `tricky-pairs` PR, the modes-audit PRs (docs, one answer recorder, live answers
  on unopened units per L4, the duel achievement on the Again).
- **Ready, waiting for Codex then a train**: #1093 (Q426 A).

## Next

1. Trains as PRs become ready, one at a time; Code.gs PRs get their VERSION at merge (`tools/sheet_version.py`).
2. The rules: the substance review's batch and the core's list to Pierre together; then the core trial and PRs (#1200
   §3-§4).
3. LEARNING.md is at its size budget: trim history to the notebook in the next docs PR, never raise the budget by
   habit.
4. The progress-moving rows of the modes audit (format term in the sheet's photo ratings, time median per format,
   hold/comeback offset) go to Pierre with level-2 and L12 figures.

## Questions for Pierre

Answered today (ANSWERS.md 2026-11-19): Q407-Q426 except Q419 (number skipped: a re-ask withdrawn), S1's wording, the
ledger rule, Rule 0's end, the order of work (his only input is raising priorities), #773 superseded, README's Coral
Finder line, the pCloud backups (started 2026-11-18).

- Pending his reading: #1095's privacy page (screenshots once rebuilt).
- Pending the substance review: the rules batch and the core's list (#1200).
- Still open in older reviews (check ANSWERS.md first, ask only what is not there): the architecture review (a)-(g),
  (i); the app-gaps review (a)-(j); #1041 §6.

Last question number: Q426

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points; the unsure fish candidates; the 16 non-Philippine
  *A. pyroferus* juvenile photos and `fbAcpyr_j0`.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-19 ~09:55 Manila: handover. Night report given at 09:46 (53 PRs merged in the night, 5 red trains fixed).
Scratchpad: ledgers, reconcile plan, modes audit, closing pack, practices study; no real names.
