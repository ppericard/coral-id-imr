# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 05:50 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-17 ~06:15 Manila (none needing action).

## Now

Main: sheet script **v165** (#1047). Every PR merges through a train, even alone (#1001). Machine: `npx prettier` here is
3.8.1; CI uses 3.10.1: always `npx --yes prettier@3.10.1`.

- **Merged 11-17 evening** (Pierre: "Fais les choix tout seul si ils sont facile à revenir dessus", 18:49): #953
  variants on their unit's mastery, Learned asks each variant group (v162; Q391, Q392); #988 coral content in the editor
  (v163); #1043 sea slug leaderboard, 15 achievements, sheet replay (v164); #1047 sea slug admin photo pages (v165);
  #1040 sea slug curation reaches the game; #1042 sea slug look-alikes (Q390 D); #1046, #1048 the 30 ceiling, 148 photos
  judged; #1052 sourced cues; #1055 literature points; #1056, #1058, #1059 fish admin (pairs, Analyses by rank, Journey
  %); #1037, #1038, #1039, #1044, #1054.
- **The night stalled from 22:40**: the integrator ended a turn waiting on a background notification that never woke it.
  On a night of work, schedule a check-in (`send_later`, ~30 min) before ending a turn.
- **Version queue** (one at a time: merge `main`, `--assign`, CI, Codex, train): #1051 (v166 assigned: fish out of beta,
  sea slugs open to all in beta, Remove all; fixing Codex's smoke ask) → #1060 (sea slug stats and Analyses) → #1061
  (sea slug Candidates, tags, content editor, Health) → #1062 (sea slug WoRMS view) → #1053 (log keeps "sp. 5") → #1050
  (staff and cohort boards) → #1049 (live mode; fixing CodeQL).
- **Next after the queue**: the fish read their own statistics in the app (#1060's mechanism; ROADMAP admin plan PR 11).
- Branches: fish-todo-wip and photo-genus-ability superseded (can be deleted); admin-signout-seal waits for Pierre.

## Next

1. The version queue above; then the fish's own statistics.
2. On Pierre's answers: species step 2 (#1041) built for fish and sea slugs together, its check ~40 min (Pierre: "6h de
   calcul ne devrait JAMAIS arriver"); #1057 and #1045 as he decides.
3. Proposal owed to Pierre: keep every L11 check short (fewer profiles and seeds, the rated world only where it matters,
   no level 3 runs without his go), the power given up stated.

## Questions for Pierre

Answered 11-17 evening: Q390 D; Q392 a, b; L9; C8, D3, P1; #988; #942 A ("référence … déduit des caractéristiques de la
photo, pas un tag"); Learn page; Cladobranchia WoRMS; licences not now; Pikachu (shared, several species); Q393 live mode
(sheet, speed bonus, counts, trainer role, nickname + invite to sign in); Q399 staff = trainer role, cohort boards,
others' boards discreet; fish out of beta, sea slugs open to all, Remove all.

Still open:

- **Q394-Q398** species step 2 (#1041): half fault for a common name typed, species exams, the names choice, what a
  species' scientific name comes after, the progress key. Costly to undo: nothing built before the answers.
- **#1057** held-out set wired (Q385): beginners' families at Advanced at 1,000 answers 5.8 → 3.6 (−2.2, margin 2; none
  at 3,000). A keep (rec.), B no probe before Open Water, C probe chance 0.05; and confirm the `|h` tag in the log.
- **#1045** reference tag: the point removed for all reference photos (1,184, as built, rec.) or added to the
  candidates' (108); P1's new wording "reference = judged very easy with the reference look, whatever the route".
- **#1049** a live answer on a unit not unlocked: counts in nothing (as built, rec.) or opens it.
- **#1050** the admin's Staff toggle grants and revokes the trainer role: ok?
- **#1061** an editor for the sea slugs' look-alike lines (a new slot type)? Structure for the sea slugs (a pair edit
  replays every sea slug player)? Not built.
- **admin-signout-seal**: model B (draft in IndexedDB, ~1 week) when the editors relay comes (rec.), or now?
- **Fish basics**: where is the IMR fish presentation?
- **To read, easy to undo**: #1043 achievements (15); #1048 gl 30; #1049 points 100+100, sets; #1050 one cohort per
  player; #1052 cue wording; #1061 target 12, tag rows.

Last question number: Q399

## Pierre's hands

- **Roles**: grant himself the trainer role to host a live game (#1049) and to be on the staff board (#1050).
- **pCloud backup**: Script properties › `PCLOUD_UPLOAD_CODE`; Reef ID › Back up to pCloud now (`docs/BACKUP.md`).
- **In the admin**: Light and Cover proposals, then Publish; Points (the 7 literature points of #1055); the Q354
  points for an IMR trainer.
- Check the "Coral ID analyses" token's type and the R2 token's scope; protect `main`; renew the admin GitHub token
  before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-18 ~05:50 Manila: morning checkpoint after a night that stalled at 22:40. Old player-data extracts may remain in
the session scratchpad (`data/`): delete them, never commit them.
