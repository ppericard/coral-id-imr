# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-20, about 11:25 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-20 ~03:50 Manila (no new report since 2026-11-17).

## Now

Main: sheet script **v203**. Merged since 08:20: #1290 (Learn cards: the whole card opens the sheet), #1289 (lecture
photos never upscaled), #1296 (tell-apart lines, 24 bonus coral pairs), #1297 (a hand-added candidate removed stays
rejected), #1295 (sea slug `bb` import and the box model record), #1300 (admin one engine step 4: one Tree), #1302
(Visits smoke), #1303 (backlog audit docs fixes), #1305 (no-upscale smoke pinned to one player id).

- **Queue, ordinary**: #1306 (sea slug boxes: 2,064 `bb` on 265 species; tiles cut by the next R2 run), #1304 (`CAL.U`
  stays 1: the level-2 check breached a guardrail), then #1294 (admin flags clear themselves; settling an `admin.js`
  conflict) and #1292 (Corals of the World originals; pages smoke red, 3 threads, being looked at).
- **Queue, sheet versions, one at a time** (`afterver.sh`): #1285 (rights PR 1, holds v204), #1286 (sea slug Basics),
  #1279 (Memory, fish and sea slugs; holds a stale v204: re-assign), #1298 (tool and admin data into `data/`), #1299
  (Find the X's own offset; moves nothing today), #1301 (the "What I learn" card: names rows for fish and sea slugs).
- **Agents**: the Q316 offline-fit tool (estimator tested on simulated data first; the real log comes from the
  integrator, never committed); the name roots' IMR-cue warning; #1294's conflict; #1292's pages smoke.
- **Sea slug boxes** (Find the X), measured as Pierre asked (06:42-06:50): sample 1 (80) left Opus medium undecided;
  sample 2 (40, THRESHOLD2 written first): Opus medium meets (100/100 and 97.5/97.5, serious 1 and 3, cap 3). Bulk: 22
  batches on Opus medium; a blind Opus high redo of 213 photos agreed 96.2%, batch 08 (80%) redone on Opus high, then
  97.2%. Record: docs/decisions/2026-11-20-seaslug-box-model.md.
- **Backlog audited** (58 items against Pierre's own words, scratchpad `backlog-audit.md`): 9 were built, 13 were wishes
  or the integrator's prose (contrast on the Learn sheets, C3, Sort them, Virtual dive…), 3 "later"; #1303 fixed the
  docs. The list below holds only what his words decide.

## Next

Decided and ready, in launch order (one `core.js` holder and one `admin.js` holder at a time; at most four code agents):

1. Watermark pass 5, then the measured block's full run on a runner (after #1298).
2. #1259's two follow-ups (after #1294, #1298); then one admin step 5 (Candidates swiper), 6, 7, 8, 13; Learn steps 9-11
   after #1286.
3. The level's answer count from the log (first `core.js` holder once the version queue is in); then the "Fish basics"
   achievement (its name and tier: integrator's call); one engine steps 3, 4, 6, then 5 and 9; #892 (a wrong pick
   counts against both families, fish rules version); the species exams (Q395).
4. Fish common names: the admin correction (`admin.js`); the admin opening's lazy loads, then the leaner log reply.
5. The IMR content split, the rest; About and credits, a calmer text (after #1292).
6. Down the tree, then Life stages matched, as Lab prototypes; the benthos study (read-only).
7. Rights PRs 2-4 after #1285 (Groups page first); then the Curators' relay (its token: Pierre's hands, ask first).
8. Activity outside the quiz C2 (the page tally kept across a killed page: integrator's call, design first).

## Questions for Pierre

- **Q439**: the Lab prototypes Same or different?, Odd one out, Matrix and the fish ID key: which graduate (U13)?
  Rec. he plays each on his phone first; those he likes go to Practice for every subject.
- **Remove vs ×** (06:58-07:00): options A-D sent at 07:00, with the measure since (85 × against 1 Remove since
  2026-11-01). Rec. A: one Remove, one click, never proposed again, Undo and a list of removed photos to restore.
- **With rights PR 2**: where each cohort's trainer list is stored. Rec. A, lines in the Groups tab marked trainer
  (check against roles step 2's design and #1050 first).
- Still open from earlier: Q351 (b), the fish ease weight; the species photos' 8 unsure candidates; the fish key's
  points; species-level look-alike pairs (Q390); one engine §6 formats (a)-(d); the ROADMAP "Open question" rows.
- Not asked, on purpose: the contrast correction (his "plus tard", 2026-11-19 15:07); the fish starting values (the log
  is too small to fit them); `CAL.U` (kept at 1, nothing changes).

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

2026-11-20 ~11:25 Manila: handover. Scratchpad: `nightq.sh`, `chainq.sh` (the queue; log `nightq.log`; a restart
stops it), `afterver.sh` → `seqver.sh` → `assignver.sh` (Code.gs PRs one at a time; assignver keeps the branch's
`Code.gs` and takes only main's line 1 and `VERSION` since it wiped #1285's code once), `uptodate.sh`, `prstate.sh`,
`failjobs.sh`, `thr.py`, `resolve_block.py`, `slugbox/` (bench, `s2/`, `bulk/`), `backlog-audit.md`, `q316-study.md`,
`l12/` (real-log export: real names, never committed). No real names.
