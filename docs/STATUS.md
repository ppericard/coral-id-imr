# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-20, about 14:05 Manila, by the integrator, **at Pierre's "stop everything. Prepare passation"**: the
merge queue and every agent are stopped; nothing runs. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-20 ~03:50 Manila (no new report since 2026-11-17).

## Now

Main: sheet script **v204** (#1285). Merged since 11:25: #1306 (sea slug boxes: 2,064 `bb`; 2,037 Find the X tiles cut
and live), #1304 (`CAL.U` stays 1), #1307 (STATUS), #1294 (admin flags clear themselves), #1285 (rights PR 1: groups
carry an instance's rights), #1308 (name roots' IMR-cue warning, 12 genera), #1309 (IMR content split: the corals'
slate number, slides and lecture tips into the IMR layer).

**Open PRs, where each stands** (none is being worked on; resume each from its branch):

- **Sheet version needed, one at a time** (rule D3; the integrator assigns at merge, `scratchpad/assignver.sh`, which
  keeps the branch's `Code.gs` and takes only main's line 1 and `VERSION`): #1286 (sea slug Basics), #1279 (Memory, fish
  and sea slugs), #1299 (Find the X's own offset), #1298 (tool and admin data into `data/`), #1301 (the "What I learn"
  card: names rows). All four first were brought up to date at ~13:00 and waited for `VERSION`; #1301 fixed its Codex
  round 3 (Home link before tier 2) and holds no version. Each needs main merged again before its assignment.
- **Ordinary**: #1311 (fish Shared names box in the admin; Codex clean), #1312 (one-admin step 5: one Candidates swiper;
  Codex requested on 9914bc5), #1292 (Corals of the World originals: a turned lecture photo waits for its `src` in the
  one-path check; Codex requested on 51b2060; after merge, confirm `reefid-originals.yml` ran green), #1313 (#1259's
  two auto-sort follow-ups; opened as its agent was stopped: read its body and Codex before anything).
- **Held**: #1310 (Q316 offline-fit tool). Codex round 3 found three P2 in side check 2B (shared-arm replay). Decided
  (W27): cut 2B out of the PR (keep the fit, its recovery test and check 2C) and move it to a follow-up that replays
  through `core.js`'s own `eloReplay`/`replayProgress` (with `starts`), together with a Gibbs sampler for the photo SD
  and τ, which the Laplace fit cannot estimate on today's cluster sizes. The cut is not done; the 3 threads are open.
- **Branch without a PR**: `claude/admin-lazy-loads` (the admin opening's lazy loads, Pierre 2026-11-19 «la page admin
  sur mon téléphone met de plus en plus de temps à s'ouvrir»; 3 commits, pushed at the stop; finish its record, then
  tests, PR, Codex).

## Next

Decided and ready, launched at once unless a real dependency holds one back (rule W27: no agent cap; no two open PRs on
the same sensitive file, `Code.gs`, `core.js`, `sync.js`, `model.js`; heavy runs share `tests/slot.js`):

1. Rights PR 2 (Groups page) once no open PR holds `Code.gs`. It starts with one audited-write path for every
   authorization change (join, leave, grant, revoke, rights edit), as answered on #1285's last thread.
2. One-admin steps 6, 7, 8, 13 after #1312; Learn steps 9-11 after #1286.
3. `core.js`, one holder at a time once the version queue is in: the level's answer count from the log; the "Fish
   basics" achievement; one engine steps 3, 4, 6, then 5 and 9; #892 (a wrong pick against both families); Q395 exams.
4. Watermark pass 5 and the measured block's full run (after #1298); About and credits, a calmer text (after #1292).
5. Q316: after #1310, run the fit on the real log (Answers tab via the Sheets connector, outside the repo; never
   committed), then the follow-up above.
6. Activity outside the quiz C2 (integrator's call, design first). A `core.js` comment (~line 1005) still names
   `renderFishCand`.

## Questions for Pierre

- **B1** (a request, 12:10): the benthic slate and the benthos lecture in the IMR Drive folder (neither is there; rule
  C2 blocks the benthos units until then). Study: scratchpad `benthos-study.md`.
- **Q442** (12:10): what goes into Benthos. Rec. A, the slate's categories plus "hard coral"; coral genera stay in Corals.
- **Q443** (12:10): photos of sand, rubble, rock and turf. Rec. C, public top-down archives first, his Dauin photos later.
- **Q444** (13:16): a fish species' own common-name list (remove, reorder, add) as a new `curation.json` `fish` key of
  per-species exceptions (study 2026-11-15 §7.2). Rec. yes, after the `core.js` holder.
- **Remove vs ×** (07:00, reminded 13:16): rec. A, one Remove, one click, never proposed again, Undo and a list.
- **With rights PR 2**: where each cohort's trainer list is stored. Rec. A, lines in the Groups tab marked trainer.
- **Q439**: which Lab prototypes graduate (U13). Earlier still open: Q351 (b), Q390, one engine §6 (a)-(d).
- Not asked, on purpose: contrast on the Learn sheets (his "plus tard"), the fish starting values (log too small).

Last question number: Q444

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

2026-11-20 ~14:05 Manila: stopped at Pierre's word. Queue scripts in the scratchpad (a restart loses them): `nightq.sh`
(one PR: bring up to date, wait for CI and Codex, `tools/train.py`), `afterall.sh` / `afterver.sh` → `seqver.sh` →
`assignver.sh` (Code.gs PRs one at a time), `pushwait.sh`, `prstate.sh`, `failjobs.sh`, `thr.py`, `resolve_block.py`;
log `nightq.log`. Studies: `backlog-audit.md`, `q316-study.md`, `benthos-study.md`, `slugbox/`. No real names.
