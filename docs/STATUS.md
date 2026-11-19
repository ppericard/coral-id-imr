# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-19, about 16:30 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-19 ~14:25 Manila (no new report since 2026-11-17; one `old` event at 08:11).

## Now

Main: sheet script **v195** (#1227). The rules core is in (#1217: AGENTS.md cut to the core, topic files on demand; its
trial passed three runs out of three). No agent cap (Pierre, 14:42 «oui»). Merged since 13:50: #1099 (per-player
reserve, v194), #1220 (hooks without `origin/main`), #1222, #1223 (crops, Q430 B), #1224, #1221, #1225, #1227, #1217,
#1230 (sign-in smoke race). In a train at 16:25: #1218 (fish rubric from the gold set), #1228 (juvenile study).

- **Open, waiting on CI, Codex or a train**: #1226 (one engine step 2; being amended for Q436: the one-tap question for
  every subject, the apology and recalculation cards as subject-free templates, 15:54-15:56; then VERSION at merge);
  #1229 (the measured block, Q434; conflicts with main: bring up to date); #1231 (marks for the genera IMR describes;
  its `smoke (draw)` failed on a random coral draw check: a flake fix is running, then a new head).
- **Agents running**: fish species marks PR (601 species sourced, drafts on the sheets); fish juveniles PR (all 369
  species sourced: a line per sheet, the four classes as labels only, Q435); crop re-judge of the `k` candidates
  (Q430 B); modes step 3 (the `asked()` readers, then level 2); sea slug genus marks circles 2 and 3; coral tips for
  Merulina, Cyphastrea, Halomitra; Q416 b (a mimicry pair's marks after a mix-up); tell-apart lines for 9 pairs; the
  `slow` test tag (Q414); Lab "Same or different?"; the draw smoke flake.
- **Gold set 2** (42 new fish photos, each with one judge's view drawn at random, 14:44 and 14:50): the page was sent
  to Pierre at 15:36; his answers go into `scratchpad/gold2/pierre/answers.json`, then `gold2/score2.py`.

## Next

The night: no question to Pierre after 17:30.

1. Train every ready PR, one Code.gs PR per train (VERSION at merge). After #1218: the juvenile ease cap removed
   (Q431 «ok», Q435 «ok»: no cap at all), in its own PR.
2. After #1226: species by scientific name, the sheet PR (Q394-Q398 answered), then Find the X's own offset (Q371),
   then the level's answer count from the log (Q322, Q330); `core.js` one holder at a time.
3. Lab prototypes (U13: stay in the Lab): Odd one out, Matrix, the fish ID key for EventMeasure.
4. Name roots, fish circles 2-3 (Q124 d); CI: split `smoke (admin 1280 more)`; one engine admin PRs 2-3; P1 in the
   admin (`refLevel`); learnsim fish profiles; the fish Photo stats › Difficulty page (check the data first).
5. Fish genera with no photo-visible mark in FAO or FishBase (45 genera, 144 species): test a regional guide; Chromis,
   Pomacentrus, Ctenochaetus beside their IMR cues the same way.
6. The measured block's full run on a GitHub runner (about 2 h of compute, over L11's 40-minute local cap).

## Questions for Pierre

- **Q437** (asked 16:15): open Compare, pairs, the custom quiz and the duel to fish and sea slugs, in shared code.
  Rec. yes.
- Answered today and applied or in flight: Q427-Q436 (Q433 withdrawn, a re-ask of Q428); see ANSWERS.md.
- For the morning (from the ROADMAP scan, 16:15; check ANSWERS.md first): the Lab modes' graduation (U13); the fish
  basics achievement's name and tier; the trainer's set; TYPED values; the fish key's Clingfishes and label mappings;
  the fish families left out; species-level look-alike pairs (fish, sea slugs: Q390); one engine §6 formats (a)-(d);
  open questions (no new genus after a miss in the custom quiz and duel; tour step 3's Back; a later script failing to
  load; account-name look-alikes); Q351 (b), the fish ease weight.
- Still open in older reviews: the architecture review (a)-(g), (i); the app-gaps review (a)-(j); #1041 §6.

Last question number: Q437

## Pierre's hands

- **Gold set 2**: 42 photos to review (sent 15:36).
- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points (new tonight: Naso's single plate against IMR's
  "two scalpels", *Pomacentrus armillatus* / *P. opisthostigma*, juvenile and species source disagreements); the
  unsure fish candidates; the 16 non-Philippine *A. pyroferus* juvenile photos and `fbAcpyr_j0`.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-19 ~16:30 Manila: handover. Scratchpad: `prstate.sh`, `wait_ready.sh`, `train_queue.sh`, `uptodate.sh`,
`resolve_threads.sh`, `findmsg.py`, `goldset/`, `goldcheck/` (runs 1 and 2), `gold2/` (set 2, its key in `private/`),
`juvsrc/` and `marksrc/` (the sourcing shards), `contrast/` (the before/after series), `coverage/`. No real names.
