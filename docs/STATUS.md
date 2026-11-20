# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-20, about 21:30 Manila, by the integrator, during the night queue (Rule 0: the questions below wait for
Pierre's first message after 04:00). **A new integrator starts here, then reads [INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-20 ~03:50 Manila (no new report since 2026-11-17): read them at 04:00.

## Now

Main: sheet script **v208** (#1298, tool and admin data into `data/`). Merged this evening: #1313 (auto-sort
follow-ups), #1321 (INTEGRATOR: the next task comes from the ROADMAP), #1298. Running: #1279 (Memory for fish and sea
slugs) takes v209, then the oldest-first wave (`afterall.sh`), then #1315 (queue tools) and #1342 (fish phases list).

- **Closed by measurement tonight**: R55 (the rare-photo cap works: 8.7% [7.0, 10.7] of 899 rows under the code's own
  bar; the 14.1% under ease 4 is `RARE.FEW` by design); R71b (every FishBase main picture already carries `rep`, 68/68
  candidates, 136/136 in play; the others stay untagged by spec, so the "FishBase `rep`" question is withdrawn).
- **Fish phases sourced** (#1342, read-only data `tools/fish_phases.json`, 662 species): sourced sub-adult 16, juvenile
  that differs 104, initial/terminal 37, sex colours 89; Pierre's three examples: sweetlips (D. pictum, P.
  chaetodonoides, P. vittatus) and P. batavianus yes; parrotfish "subadult" is the initial phase (Bellwood & Choat 1989).
  Three source conflicts went to Points.
- **Held**: #1310 (Q316 fit: cut side check 2B into a follow-up with a Gibbs sampler; not done), #1331 (needs Pierre).
- A stray branch `claude/autosort-followups` (identical to main, re-created by a late push) could not be deleted by the
  integrator (auto mode refused): harmless.

## Next

Decided and ready, launched at once unless a real dependency holds one back (rule W27: no agent cap; no two open PRs on
the same sensitive file, `Code.gs`, `core.js`, `sync.js`, `model.js`; heavy runs share `tests/slot.js`). The next task
comes from the ROADMAP and the inventory (`docs/reviews/2026-11-20-backlog-inventory.md`, #1326), oldest PRs first.

1. Running: R77 learnsim fish profiles (figures only, the fish welcome values unchanged).
2. One-admin step 7 after #1337, then 8 and 13; Learn steps 9-11 after #1324.
3. `core.js`, one holder at a time once the version queue is in: the level count from the log; Fish basics; one engine
   steps 3-6, 9; #892; Q395 exams. Then rights 2a (the audited-write path, `Code.gs`), 2c after Q447.
4. Fish phases: re-judge the photos on `tools/fish_phases.json`, measured on a sample first.
5. Q316: after #1310, the fit on the real log (outside the repo), then the 2B / Gibbs follow-up.
6. Leads, not decided: `confTerm` predicts 0.696 against 0.80 actual on the 834 answers it touches (exploratory);
   11 iNaturalist taxon covers may lack `rep` (the `--rep` route, network).

## Questions for Pierre

Asked in French, after 04:00 (Rule 0).

- **#1331 / rule L4**: "a level opens in a group of at least 4 close units; no question before". Rec. yes, and accept
  the one breached guardrail (lecture RA plateau 467 → 614 answers, 4 pairs), re-read on a runner before merge.
- **Q445** bonus coral genera count: (A) one 45-genus scale for all, today's % kept as the "IMR slate" score. Rec. A.
  With it, the species order question: rec. no.
- **Q446** a screenshot attached to a report: stored on his pCloud (shrunk, no GPS, deleted with the account and 90
  days after the report is handled). Rec. pCloud.
- **Q447** a group's scope: in the existing Rights column (`content@subject:fish`), no new column. Rec. yes.
- **Q448** each cohort's trainer list: lines in the Groups tab (`t:<cohort>`, name, code hash). Rec. A.
- **Q449-Q452** response time as a difficulty signal (design `scratchpad/rt-design.md`, figures `rt-study.md`): Q449 a
  separate photo time term fading by information, not by count (rec. yes); Q450 validate without wrong answers
  (inter-player agreement +0.108 [0.037, 0.195] corals, test-retest +0.285, experts' time vs others' misses +0.171
  corals, +0.445 fish), prediction kept as a guardrail (rec. yes); Q451 the enlargement as its own term (rec. yes);
  Q452 step 2, the player's time net of the photo's, a silent replay (rec. yes, after step 1).
- **B1** the benthic slate and benthos lecture in the IMR Drive folder; **Q442** (rec. A), **Q443** (rec. C).
- **Q444** a species' own common-name list as a `curation.json` `fish` key (rec. yes, after the `core.js` holder).
- **Remove vs ×** (rec. A, one Remove, Undo and a list). **R2**: delete files nothing uses (list shown first)? A
  read-only R2 token for CI?
- **Q439** Lab prototypes to graduate (U13), now with the Fish ID Key into Identify (rec. graduate it; #1340 hides the
  sea slugs' empty Identify). RA review (#1332): My progress, a "Next step" line above the slate; the quiz photo, a
  visible Colony / Close-up switch. Earlier still open: Q351 (b), Q390, one engine §6 (a)-(d).
- Not asked, on purpose: contrast on the Learn sheets (his "plus tard"), the fish starting values (log too small).

Last question number: Q452

## Pierre's hands

- **Gold set 2**: 42 photos to review (sent 2026-11-19 15:36).
- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: "Juvenile: confirm as cover?" on Boxfishes (#1275); Light and Cover proposals, then Publish;
  Points (three new fish phase conflicts after #1342); 5 likely aquarium photos marked unsure (#1269); the unsure fish
  candidates.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- The questions above (Rule 0).

## Last stop

Not stopped: the night queue runs. Queue scripts in the scratchpad (a restart loses them; #1315 ports them to
`tools/queue/`): `nightq.sh`, `afterall.sh`, `afterwave.sh`, `afterver.sh` → `seqver.sh` → `assignver.sh` (Code.gs
PRs one at a time, `mainver.py`), `pushwait.sh`; log `nightq.log`. No real names.
