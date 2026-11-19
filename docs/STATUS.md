# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-19, about 22:20 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-19 ~14:25 Manila (no new report since 2026-11-17; one `old` event at 08:11).

## Now

Main: sheet script **v197** (#1234, live answers). The night runs a merge queue, one PR per train (a scratchpad
script: bring up to date, wait for CI and Codex on the head, train). Merged since 16:30: #1226 (one engine step 2,
v196; it also carried Q436: the one-tap question for every subject), #1240 (17 cropped photos), #1241 (Same or
different?), #1242, #1235 (juveniles sourced), #1247, #1250, #1252 (two smoke flakes), #1237 (no juvenile cap), #1243,
#1245, #1248, #1232 (fish species marks), #1229 (the measured block, Q434), #1253 (Odd one out), #1239 (slow tests),
#1251, #1255 (doc size marks warn only, ROADMAP whole again), #1257 (model and effort study), #1231, #1254 (juvenile
re-rate), #1234.

- **In the queue, in order**: #1266 (ledger 20:42-20:59), #1249 (species by scientific name, the sheet part: v198
  assigned, `SCI_SHEET` 198), #1264 (Pierre's decisions written into ROADMAP rows; `answers_check` fails an answer not
  applied), #1262 (Matrix, Lab), #1260 (19 more fish genus marks), #1236 and #1238 (sea slug genus marks, circles 3
  and 2), #1263 (sea slug species marks, 165 of 206).
- **Then**: #1259 (Q438 route back; the build reads newer proposals over accepted ones, 20:57-20:59: 9 photos back
  in play, 1 out, 351 records retagged), #1267 (admin rubric declared once; touches `core.js`, so v199 at merge, after #1249); #1256 (Q437 plan;
  its agent builds the next PRs); #1261 (admin fish reference level, P1).
- **Agents working**: Q437 modes for every subject; Q438 route back (#1259: two jobs red and five Codex threads, being
  fixed; it also counts hand curation against accepted proposals); the fish key for EventMeasure (#1258: two
  threads); admin fish Difficulty page; the 351 juvenile tag doubts re-judged at full size (PR after #1254, now in);
  the admin's slow opening on phones (20:55: measure first, then fix).

## Next

The night: no question to Pierre after 17:30. Only decided work (20:42-20:43: few agents, no filler study).

1. Train the queue above; #1267 after #1249 (one `Code.gs` PR per train, VERSION at merge).
2. The species-by-scientific-name app PR after #1249; then Find the X's own offset (Q371); then the level's answer
   count from the log (Q322, Q330); `core.js` one holder at a time.
3. Q437's PRs from #1256's plan; one engine admin step 3 after #1267 and the admin PRs.
4. New ROADMAP rows from #1264: L11's check tool under the 40-minute cap; IMR lecture photos never upscaled (the
   Corals of the World captures replaced by their originals).
5. The measured block's full run on a GitHub runner (about 2 h of compute, over L11's local cap).

## Questions for Pierre

For the morning (after his first message after 04:00; each checked against ANSWERS.md):
- **Q439**: the Lab prototypes Same or different?, Odd one out, Matrix and the fish ID key: which graduate (U13)?
  Rec. he plays each on his phone first (rule W4: he judges by taps); those he likes go to Practice for every subject.
- The wording of rule A1 (20:57, 20:59: A1 protects his hand decisions, one by one; accepted agent proposals can be
  replaced by a better proposal that goes into the game). The counts (#1259): 831 values set by his hand (an upper
  bound; fish: 33), 31,362 agent proposals let through, 44 that cannot be told. Not numbered (a rule's wording).
- The AGENTS.md bullet on models and effort, from #1257's table. Not numbered (a rule's wording).
- P2: what "B for now" (2026-11-18) meant for the 34 untraced lecture photos. A fact, not numbered.
- The trainer's set: his 11-18 answer says "seven modes" and names six. A fact, not numbered.
- Gold set 2 (42 photos, sent 15:36): his answers, then `gold2/score2.py`.
- Still open from earlier: Q351 (b), the fish ease weight; the species photos' 8 unsure candidates; the fish key's
  points; species-level look-alike pairs (Q390); one engine §6 formats (a)-(d); the ROADMAP "Open question" rows
  (no new genus after a miss outside the path; credits; short lessons; tour leftovers; photo → trait; "0 to 2
  correct" or "None"); the architecture review (a)-(g), (i); the app-gaps review (a)-(j); #1041 §6.

Last question number: Q439

## Pierre's hands

- **Gold set 2**: 42 photos to review (sent 15:36).
- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: Light and Cover proposals, then Publish; Points (new tonight: *Hypselodoris infucata* /
  *H. obscura*, *Phyllidia polkadotsa*'s range, Naso's single plate, the juvenile and species source disagreements);
  the unsure fish candidates; the 16 non-Philippine *A. pyroferus* juvenile photos and `fbAcpyr_j0`.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-19 ~22:20 Manila: handover. Scratchpad: `nightq.sh` and `chainq.sh` (the queue; log `nightq.log`),
`uptodate.sh`, `prstate.sh`, `wait_ready.sh`, `waitmerged.sh`, `findmsg.py`, `gold2/` (set 2, its key in
`private/`), `recount/` (the backlog recount), `rerate/` (the juvenile tag doubts). No real names.
