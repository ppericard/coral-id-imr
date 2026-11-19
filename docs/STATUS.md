# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions. **Pierre's answers live in
[ANSWERS.md](ANSWERS.md)** (append-only, history since 2026-11-03): search it, the rules and docs/decisions/ before
asking him anything (`tools/asked.py` also searches the open PR branches' copies since #1225). This file only cites
answers.

Written 2026-11-20, about 01:10 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).** Handovers about every 90 minutes of work.

Last checked: reports and events: 2026-11-19 ~14:25 Manila (no new report since 2026-11-17; one `old` event at 08:11).

## Now

Main: sheet script **v200** in the repository (#1249 v198, #1267 v199, #1265 v200); the live script follows once
deployed. The night runs a merge queue, one PR per train (scratchpad `nightq.sh`, `chainq.sh`). Merged since 22:20:
#1249 (species by scientific name, the sheet part), #1268, #1260 (19 fish genus marks), #1236 (sea slug genus marks,
circle 3), #1266 (ledger), #1267 (admin rubric declared once), #1269 (351 juvenile photos re-judged at full size:
277 retagged, 8 aquarium or screen photos out), #1256 (Q437 plan), #1264 (Pierre's decisions written into ROADMAP
rows; `answers_check` fails an answer not applied), #1262 (Matrix, Lab), #1259 (Q438: the route back; the build reads
newer proposals over accepted ones: 9 photos back in play), #1275 (main red after #1259's rebuild: the admin read a
copied adult tag on the Boxfishes cover as Pierre's; fixed forward), #1265 (the Duel tab for fish and sea slugs),
#1271 (admin opens faster on phones: 19.5 s to 16 s cold in a simulated phone), #1261, #1270 (Photo stats ›
Difficulty for every subject).

- **In the queue**: #1272 (85 set-aside fish photos back in play, cropped, judged at full size), #1238 (sea slug genus
  marks, circle 2), #1274 (L11 check tools stop at 40 minutes; level 3 waits for Pierre's go), #1258 (fish ID key,
  Lab), then #1263 (sea slug species marks) after #1238.
- **Held**: #1273 (species by scientific name, the app part, gated on v198): its L11 primary is unclear for the strong
  RA and the expert (-1.6 and -1.1 scientific genera at Advanced at 3,000 answers, 8 seeds); a second look and the app
  world are running on GitHub runners; merge only on their verdict.
- **Agents working**: #1273's runner checks; Q437 PR 2 (custom quiz for every subject) and PR 3 (Look-alikes and
  Compare for every subject); the merger of the PRs that conflict after the ROADMAP rewrite.

## Next

The night: no question to Pierre after 17:30. Only decided work (20:42-20:43: few agents, no filler study).

1. Train the queue; #1263 after #1238; #1273 on its checks' verdict (VERSION at merge: v201).
2. Q437's next PRs from the plan: the Lab tools that ask a unit, sea slug basics, sea slug Find the X; Memory for
   one-view subjects as two photos of one unit (integrator's call, easy to correct).
3. Find the X's own offset (Q371); the level's answer count from the log (Q322, Q330); `core.js` one holder at a time.
4. IMR lecture photos never upscaled; the Corals of the World captures replaced by their originals (ROADMAP).

## Questions for Pierre

For the morning (after his first message after 04:00; each checked against ANSWERS.md):
- **Q439**: the Lab prototypes Same or different?, Odd one out, Matrix and the fish ID key: which graduate (U13)?
  Rec. he plays each on his phone first (rule W4: he judges by taps); those he likes go to Practice for every subject.
- The wording of rule A1 (20:57, 20:59: A1 protects his hand decisions, one by one; accepted agent proposals can be
  replaced by a better proposal that goes into the game). The counts (#1259): 831 values set by his hand (an upper
  bound; fish: 28), 31,362 agent proposals let through, 44 that cannot be told. Not numbered (a rule's wording).
- The AGENTS.md bullet on models and effort, from #1257's table. Not numbered (a rule's wording).
- The admin's opening: the answer log is now its biggest wait (1 MB gzipped); reading only the rows since his last
  visit needs a browser copy of players' data, which he declined on 2026-11-04. Rec. keep declining unless the admin
  is still too slow on his phone after #1271; measure there first.
- #1273's two built readings, easy to change: Q394's smaller faults count only the species' own common name (half) and
  its own genus (a quarter); `fdauin20` counts scientific names only, as the plan says (rec. accept either name).
- P2: what "B for now" (2026-11-18) meant for the 34 untraced lecture photos. A fact, not numbered.
- The trainer's set: his 11-18 answer says "seven modes" and names six. A fact, not numbered.
- Gold set 2 (42 photos, sent 2026-11-19 15:36): his answers, then `gold2/score2.py`.
- Still open from earlier: Q351 (b), the fish ease weight; the species photos' 8 unsure candidates; the fish key's
  points; species-level look-alike pairs (Q390); one engine §6 formats (a)-(d); the ROADMAP "Open question" rows; the
  architecture review (a)-(g), (i); the app-gaps review (a)-(j); #1041 §6.

Last question number: Q439

## Pierre's hands

- **Gold set 2**: 42 photos to review (sent 2026-11-19 15:36).
- **The main checkout**: an agent's tool rewrote 653 `at` dates in `suggest.json` there by mistake (no PR carries
  it; trains build from GitHub); restoring it was refused to the agent and left to him:
  `git -C /home/user/coral-id-imr checkout -- suggest.json`.
- **GitHub**: a `release` ruleset (Restrict deletions + Block force pushes, as `main`).
- **Roles**: grant himself the trainer role to host a live game.
- **In the admin**: "Juvenile: confirm as cover?" on Boxfishes (#1275); Light and Cover proposals, then Publish;
  Points (*H. infucata* / *H. obscura*, *Phyllidia polkadotsa*'s range, Naso's single plate, the juvenile and species
  source disagreements); 5 likely aquarium photos marked unsure (#1269); the unsure fish candidates.
- Check the analyses token's type and the R2 token's scope; renew the admin GitHub token before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-20 ~01:10 Manila: handover. Scratchpad: `nightq.sh`, `chainq.sh` (the queue; log `nightq.log`), `uptodate.sh`,
`prstate.sh`, `failjobs.sh`, `rowdiff.py` and `bothsides.py` (conflict helpers), `findmsg.py`, `gold2/`, `recount/`,
`q438/`, `k159/`, `tagdoubts/`. No real names.
