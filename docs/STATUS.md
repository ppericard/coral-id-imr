# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-20, about 08:20 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-20 ~03:50 Manila (no new report since 2026-11-17).

## Now

Main: sheet script **v202**. Merged since 03:55: #1280 (Lab tools on the subject on screen), #1282 (his morning
answers: A1 for hand choices, the model/effort strategy, Rule 0's practice, no command for him, P2), #1277 (custom
quiz, v201), #1283 (learncheck.yml under the cap), #1278 (Look-alikes and Compare, v202), #1287 (a large judging pass is
measured first), #1284 (Find the X tile code for sea slugs), #1288 (admin one engine step 3: `reg(S)`). Q437: only
sea slug Basics and Find the X (boxes) left.

- **Queue**: #1291 (calibration note, rewritten to his scope after Codex), #1273 (species by scientific name, app;
  Q440 accepted; L12 passed; v203), #1279 (Memory for fish and sea slugs; re-assign after #1273), #1285 (rights PR 1;
  assign after), #1286 (sea slug Basics; being brought up to date).
- **Fixing**: #1290 (Learn cards: the whole card opens the sheet; red, being fixed; variants for Pierre to pick),
  #1289 and #1292 (lecture photos never upscaled; Corals of the World originals), the admin flags (a flag clears
  itself when its photo leaves play; "missing" flags clear themselves).
- **Sea slug boxes** (Find the X): the bench (scratchpad `slugbox/`, 80 photos) after a tightened box definition:
  14 of 80 disputed (31 before); an adjudicator is deciding them; the lighter candidates (Opus and Sonnet medium,
  Haiku, two runs each) are judging. Then the cheapest passing configuration does the 2,132 photos the tile rule keeps.
- A container restart at ~07:40 stopped every agent: the work on disk was resumed; branches never pushed (the
  `data/` move, tell-apart lines for 25 bonus pairs) are relaunched from their worktrees.

## Next

Decided, not started (the backlog, in launch order):

1. Rights: groups carry an instance's rights, PRs 2-4 after #1285; then cohorts joined with a code (roles step 2), the
   Curators' relay; the IMR content split's rest.
2. Engine, one `core.js` holder at a time: Find the X's own offset (Q371); the level's answer count from the log (Q322,
   Q330); one engine, what is left; Q316's offline fit; `CAL.U` after the hierarchical photo Elo.
3. One admin for every subject (Pierre, 05:53): the study's steps 4-13 (one Tree, one Candidates swiper, one band
   review, one montage and coverage, one tile, Learn's one list and one sheet).
4. Fish: common names (admin correction, species level); the fish welcome question; fish basics, the rest; where the
   reference route is still read.
5. Content and photos: tell-apart lines for 25 bonus pairs (relaunched); About and credits, a calmer text (after the
   C12 PRs); contrast correction on the Learn sheets; name roots' IMR-cue warning and epithets; the watermark pass
   after each refill; the measured block's full run on a runner.
6. Admin and tools: the Tree tab's steps 6-7; the admin opening, what is left; activity outside the quiz C1-C3; tool
   and admin data into `data/` (relaunched); CI speed, what is left; the monthly taxonomy refresh; the auto-sort
   follow-ups and #1259's two follow-ups.
7. New formats: Sort them, Down the tree (with the species level), Life stages matched, Virtual dive.
8. Subjects: the species level everywhere; then benthos.

## Questions for Pierre

- **Q439**: the Lab prototypes Same or different?, Odd one out, Matrix and the fish ID key: which graduate (U13)?
  Rec. he plays each on his phone first; those he likes go to Practice for every subject.
- **Remove vs ×** (06:58-07:00, the admin's two removals): options A-D sent at 07:00. Rec. A: one Remove, one click,
  never proposed again, Undo and a list of removed photos to restore.
- The Learn card variants (#1290): screenshots to send once its agent reports.
- Still open from earlier: Q351 (b), the fish ease weight; the species photos' 8 unsure candidates; the fish key's
  points; species-level look-alike pairs (Q390); one engine §6 formats (a)-(d); where each cohort's trainer list is
  stored (a format: before roles step 2); the ROADMAP "Open question" rows.

Last question number: Q441

## Pierre's hands

- **Gold set 2**: 42 photos to review (sent 2026-11-19 15:36).
- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: "Juvenile: confirm as cover?" on Boxfishes (#1275); Light and Cover proposals, then Publish;
  Points; 5 likely aquarium photos marked unsure (#1269); the unsure fish candidates.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-20 ~08:20 Manila: handover. Scratchpad: `nightq.sh`, `chainq.sh` (the queue; log `nightq.log`; a restart
stops it), `assignver.sh` (a Code.gs PR's version at merge), `uptodate.sh`, `prstate.sh`, `failjobs.sh`, `thr.py`,
`rowdiff.py`, `bothsides.py`, `findmsg.py`, `slugbox/` (the box bench), `l12/` (real-log export: real names, never
committed), `gold2/`, `q438/`, `k159/`, `tagdoubts/`. No real names.
