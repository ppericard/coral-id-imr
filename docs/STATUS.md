# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only; AGENTS.md "Every answer reaches its doc"): search it, the rules and
docs/decisions/ before asking him anything. This file only cites answers.

Written 2026-11-19, about 08:30 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-19 ~06:25 Manila (nothing new to report; the "empty card closed: feedback"
event was fixed by #1189).

## Now

Main: sheet script **v189** (#1148); #1121 carries v190. The container restarted at ~08:24: every agent and train
running then was relaunched (below). Trains: `tools/train.py`, one at a time; scratchpad helpers (lost on a new
session): `prstate.sh` (PR state line), `train_after_photos.sh` / `train_queue.sh` (wait for Candidate photos or the
running train, then train), `resolve_append.py` (append-only conflicts in ANSWERS.md: main's lines, then the branch's).

- **Merged 2026-11-19 morning**: #1179, #1170, #1175, #1185 (one-engine audit), #1177, #1130, #1188 (answers ledger
  and rule), #1187 (v188, photo host check), #1183, #1176, #1181, #1171 (Q418 b), #1189 (feedback card), #1148 (v189,
  fish pooled stats), #1190 (rule wordings S1, W19 comments, W14 slow tier, L11/L12; Pikachu and Q408 records).
- **In a train**: #1192 (docs pass: Pierre's decisions into ROADMAP, FISH_PATH, INTEGRATOR, studies) and #1121
  (comments of core.js and Code.gs, v190).
- **Waiting for Codex, then trains one at a time** (all append to ANSWERS.md: re-merge main with
  `resolve_append.py` after each): #1191 (Rule 0: Pierre's day starts with his first message after 04:00), #1194
  (README: the Coral Finder book a source like any other), #1193 (ANSWERS.md history 11-03 to 11-18; fix its "07:10"
  for #1171 to 07:59 and the stray "Q427").
- **Agents running**: #1195 (rule P1 applied to the corals' code: no source boost, no tag; L11 level 1); level-2
  checks for #1116 (Q411: merge unless a loss; is a rules version needed?) and #1093; #1117 (record the rules-audit
  answers, align its night guard with the new Rule 0) and #1186 (bring the open-points study in line); the study
  "long-term agentic development practices" (Pierre 08:24: options for a big edit of the rules, all options open).
- **Today's lesson**: answers recorded only in STATUS and PR descriptions never reached the living docs, so questions
  were asked again (the rename, Pikachu, the source weight). Fixed by ANSWERS.md (#1188, #1193) and the decisions pass
  (#1192, #1190). Three process changes (a search tool before any question, studies with no open questions, an
  automatic consistency check) wait for the agentic-practices study, which covers them with more options.

## Next

1. Trains as above; then the one-engine audit's steps 1-2 (`docs/reviews/2026-11-19-one-engine-audit.md` §3: S1 test
   hardening and a shared tree `UNITS` base; `replay` split into named parameters, `FISH_C3` declared), no progress
   moved.
2. The game-modes audit (scratchpad `modes-audit.md`; to commit as a study): one shared answer recorder for the quiz
   and live; live answers on locked units counted without opening them (rule L4, 2026-11-18); the duel achievement on
   the Again; a "what each mode counts" doc. Progress-moving rows (format term in the sheet's photo ratings, time
   median per format, hold/comeback with the offset) go to Pierre with level-2 and L12 figures.
3. The fish judging pass on the 8 new candidates; Pikachu in the data (both *Thecacera pikachu* and *T. pacifica*;
   *T. picta* mentioned as locally so called); a PR for branch `claude/tricky-pairs` (rule W6).

## Questions for Pierre

Answered this morning (ANSWERS.md 2026-11-19): Q407, Q408 (with 5 and 6 changed), Q409, Q410, Q414, Q415, Q416,
Q417, S1's wording, the ledger rule, Rule 0's end, #773 superseded, README's Coral Finder line.

- **Q411** #1116 typed mix-ups in the pooled pairs: level 2 running; the integrator merges unless it confirms a loss.
- Still open (unnumbered): #1045 items 4 and 6; #1099 item 1; #1093 (level 2 running); #1095 three points; #1098
  (a)-(f); #1041 §6; the architecture review (a)-(g), (i); the app-gaps review (a)-(j). Search ANSWERS.md first.

Last question number: Q418

## Pierre's hands

- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points; the 8 unsure fish candidates; the 16
  non-Philippine *A. pyroferus* juvenile photos and `fbAcpyr_j0`.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-19 ~08:30 Manila: handover after the container restart. Scratchpad: `ledger-status.md`, `ledger-prs.md`,
`reconcile-plan.md`, `answers-history.md` (the decisions pass), `modes-audit.md`; no real names in them.
