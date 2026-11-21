# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-21, about 09:00 Manila, by the integrator, **at Pierre's stop** (06:25: «ne lances plus de nouvelles PR
ou ouvre de nouvelles taches … Tu termines tout ce que t'as démarré. Tu fait une passation propre»; he is preparing a
change of method from a study). **A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-21 ~04:30 Manila (no new report since his 17 of 11-20, all handled).

## Now

Main: sheet script **v212** (#1354, a screenshot attached to a report). Merged since 11-20 17:30: about 45 PRs (the
list: `python3 tools/night.py`, `git log`). Nothing runs: no agent, no queue (the last one in flight is named below).

- **The backlog's reference is the inventory** [docs/reviews/2026-11-20-backlog-inventory.md](reviews/2026-11-20-backlog-inventory.md)
  (#1326, refreshed 2026-11-21): every open point against Pierre's words; §1.3 "Ready to launch now" is where the next
  work comes from; §1.4 the questions still open.
- **Open points per day** (his ask, 06:27), counted as the inventories count (Done and Obsolete rows left out):
  - 2026-11-18: 148 open (151 items, 3 obsolete; no Done state; blocked rows inside "Decided"; some sources not
    counted, its §1.1).
  - 2026-11-20: 188 open (196 rows: 3 done, 5 obsolete); its scope is wider (rows outside the ROADMAP, sub-items),
    so 148 → 188 is not all new work.
  - 2026-11-21: 173 open (207 rows: 28 done, 6 obsolete). From 11-20 to 11-21: 25 closed, 11 created, net −15.
  - Why the count rises despite the merges: a cut PR leaves a row (W27), a study opens a question, each of his reports
    is a row; 89 rows are ideas or wait on data or a third party. Count again from the inventory's own script (§6).
- **Stopped at his word (06:26), not started; relaunch from the inventory when he says**: R32 the R2 unused files (list
  shown to him before deleting; his yes 05:40), R102 Q316's fit on the real log, R31 learnsim's `shareFree` arm, R46
  the Tree tab's build section, R49 tip (b), R94 one-admin steps 9-10, R76 Fish basics.
- **The one open PR**: #1357, the response-time step 1 (Q449-Q451, option A «ok» 06:20), green and Codex-clean,
  `needs-pierre`: a rated-world guardrail was breached (the strong RA's shown score at 1,000 answers about 1-1.4 lower,
  the beginner's -2.4 with heavy-tailed photos and a later first Open Water; all recovered by 3,000; cause unknown; the
  term moves a question by about 0.03 logits). Asked 08:29 (question below). Its gate `PTIME_SHEET` 213: `--assign` at
  merge (rule D3).

## Next

From the inventory §1.3 once he restarts work (rule W27: no two open PRs on the same sensitive file, `Code.gs`,
`core.js`, `sync.js`, `model.js`; a part whose findings keep coming back leaves the PR, #1355), oldest decisions first:
the seven stopped items above; Q445's 45-genus coral scale with the "IMR slate" score (rule L6 changes; a rules
version); Remove vs ×, option A (05:48); rights 2a then 2c with Q447/Q448; Admin: Undo vs the background auto-run (a
design note first: the run carried into every Undo and Redo snapshot, maps a click created kept, startup imports not
counted; ROADMAP); the response-time step 2 (Q452, after step 1); fish photos re-judged on `tools/fish_phases.json`
(measured first); R118 the level's answer count from the log.

## Questions for Pierre

- **#1357's breached guardrail** (asked 2026-11-21 08:29): rec. hold the merge, a short diagnosis of the cause first
  when work restarts (no measurable benefit yet, a small visible score dip); or accept now (the term turns off with one
  constant).
- **The species order** (Q445's follow-up): he did not follow it; find what it settled before asking again, or drop it.
- **Q439**: which Lab prototypes graduate, and the Fish ID Key into Identify; with the new-RA review's two options (My
  progress "Next step" line; the quiz photo's visible Colony / Close-up switch). He has not tested the Lab yet.
- **One choice to confirm when he looks at #1354**: "Delete, keep answers" also deletes the account's report images
  (a screenshot can show its owner): integrator's call, easy to correct.
- Probably settled, to confirm before asking: Q351 (b) (ran read-only, #1341: not enough data yet), Q390 (answered D on
  11-17), one engine §6 (a)-(d) (not re-checked).
- Reminded once (W10), not asked again: the tell-apart lines; the draft species marks (fish, sea slugs).
- Answered 2026-11-21 (#1350, #1355; ANSWERS.md): L4, Q444, Q445 (A), Q446 (a sheet tab), Q447, Q448 (A), Q449-Q452
  (option A), benthos (long term, maybe never), Remove vs × (A), R2 deletion (yes, list first), the R2 CI token
  (withdrawn), the compared photos (stacked on phones, then dynamic), the "(IMR)" line (removed), W27 (no fixed number
  of Codex rounds).

Last question number: Q452

## Pierre's hands

- **Gold set 2**: 42 photos to review (sent 2026-11-19 15:36).
- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`); the stray branch
  `claude/autosort-followups` (identical to main) can be deleted.
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: "Juvenile: confirm as cover?" on Boxfishes (#1275); Light and Cover proposals, then Publish;
  Points (four fish phase conflicts and P. vittatus, #1342); 5 likely aquarium photos marked unsure (#1269); the unsure
  fish candidates.
- Renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-21 ~09:00 Manila, at Pierre's stop. The queue tooling is `tools/queue/` (README there; #1315); the session's
scratch copies and their log are gone with the container. No real names.
