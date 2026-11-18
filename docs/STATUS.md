# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 10:00 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-17 ~06:15 Manila (none needing action).

## Now

Main: sheet script **v172** (#1049). Every PR merges through a train, even alone (#1001). `npx --yes prettier@3.10.1`
(the machine's default is 3.8.1). At most 4 code agents at once (conflicts and machine load); read-only agents aside.

- **Merged 11-18**: #1051 fish out of beta, sea slugs open to all; #1060, #1061, #1062 sea slug stats, admin, WoRMS
  (v167-v169); #1053 (v170); #1050 staff and cohort boards (v171); #1049 live mode v1 (v172); #1069 minify at deploy
  (live: app.js 256 → 103 KB); #1072 `--assign` fold fix; #1074 presentations for all 107 circle 2-3 fish genera (77
  with ID marks); the three reviews #1064 gaps, #1065 [inventory](reviews/2026-11-18-backlog-inventory.md), #1066
  [architecture](reviews/2026-11-18-architecture-code-review.md).
- **In flight**: #1057 held-out set (v173 assigned; Codex threads being fixed) → #1067 genera c2-3 (its 40-min app-world
  recheck waits for a slot) ; #1076 gate floor (architecture step 2); #1075 sea slug Structure and look-alike line
  editor (needs a sheet version); admin sign-out seal model B (agent); #1073 smoke deflake; #1070 fish reference photos
  for every circle (review). Studies: live prep page, several photos on a phone (agents); #1071 What I learn (answered).
- **Queue for free slots** (in order): #1067's recheck; an anonymous viewport size in the pages-opened summary; Fish
  basics from the IMR decks (Pierre's Drive folder, `Fish Identification_2026`); lecture photos never upscaled and the
  86 Corals of the World captures replaced by their originals with exact credit (C12 A+D); sea slug achievements 60-100%;
  small fixes (tour, look-alike account names, About version line, Try again on a failed tier); a rules PR (below);
  #1045 `refLevel` from the photo's traits; the What I learn card; game modes as quiz formats in order (Same or
  different?, Odd one out, Down the tree, Life stages matched, then Sort them, Virtual dive); architecture steps 3-4,
  then the corals on the tree engine (plan to Pierre first).
- **Infrastructure watch** (Pierre: the domain becomes urgent "quand l'infrastructure qu'on utilise ne suivra plus";
  no December deadline): R2 size (6.3 of 10 GB on 11-15), the sheet's rows, quotas and timings, Pages size; alert early.
- Estimates are in agent time (Pierre, 2026-11-18: never human days or weeks).

## Next

1. The in-flight PRs and the queue above, four code agents at a time.
2. Rules PR, all approved 2026-11-18: Q405 (L11: a hard 40-min cap per check at every level; level 2 only the worlds
   the change touches; level 3 never on this machine, only with Pierre's go on GitHub runners; an unclear result is
   reported, never escalated); AGENTS.md "Estimates are in agent time…"; P1 (reference = intrinsic, objective
   qualities; a source is a hint and a guarantee of evaluation, never a placement criterion, every subject; reference
   sources enter the base first); C2 and D5 lines; the Coral Finder out of the rules (Q294).
3. Species step 2 (#1041) for fish and sea slugs: two independent teaching trees (common: families → species;
   scientific: genera → species), the `sci:` key, the family checklist exam, the ultimate exam.

## Questions for Pierre

Answered 2026-11-18 morning: #1057 A; #1067 C (content first); #1045 down, and P1's wording; Q400 D (card on My
progress, a Home line opens it); Q401 A; Q402 A; Q403 no switch (variants are required, only delayed); Q404 A (every
names row can be off, families only allowed; two independent trees); Q405; #1061 both built now; seal model B now;
Fish basics from his Drive; C1 (no source priority at all); D6 three wordings; D7 closed (no morning report); C12 A+D;
P2 B for now; sea slug achievements ok + 60-100%; seven modes built, most useful first; multi-photo study and viewport
measure; Q406 corals on the tree engine, ids unchanged (principle; detailed plan first).

Still open:

- **Professionalise** (no deadline now): (a)-(e) of the study, and B6 the sheet on an IMR Workspace account.
- **Architecture review's other questions** (b)-(i): curation split, one id scheme, sync by answers, D1; later.
- **Studies to come**: live prep page, several photos on a phone, the formats' frequency criteria.
- **To read, easy to undo**: #1043 achievements; #1048 gl 30; #1049 live answer on a locked unit counts in nothing,
  points 100+100; #1050 one cohort per player; #1052 cue wording; #1061 target 12; #1074 marks ≤ 3, looser bar.

Last question number: Q406

## Pierre's hands

- **Roles**: grant himself the trainer role (Players › Staff) to host a live game and be on the staff board.
- **pCloud backup**: Script properties › `PCLOUD_UPLOAD_CODE`; Reef ID › Back up to pCloud now (`docs/BACKUP.md`).
- **In the admin**: Light and Cover proposals, then Publish; Points (key labels, circles, the 7 literature points);
  the 8 unsure fish candidates; the Q354 points for an IMR trainer.
- Check the "Coral ID analyses" token's type and the R2 token's scope; protect `main`; renew the admin GitHub token
  before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-18 ~10:00 Manila: after the morning's question round. A design study's first run (~06:43) may have sent a few
page loads to the real sheet (Events tab); later runs block it. Old player-data extracts may remain in the session
scratchpad (`data/`): delete them, never commit them.
