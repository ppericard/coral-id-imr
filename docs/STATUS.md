# Status

**The one place for where things stand.** Written by the integrator only (subagents report to it and never edit this
file), overwritten at each stop, never appended; at most about 100 lines (`tests/docs.test.js`). What can be computed
(open PRs and their checks, branches without a PR, the sheet script's live version) is printed by
`python3 tools/brief.py`, not written here. History: `git log`, the PR descriptions.

Written 2026-11-18, about 08:00 Manila, by the integrator. **A new integrator starts here, then reads
[INTEGRATOR.md](INTEGRATOR.md).**

Last checked: reports and events: 2026-11-17 ~06:15 Manila (none needing action).

## Now

Main: sheet script **v168** (#1061). Every PR merges through a train, even alone (#1001). Machine: `npx prettier` here is
3.8.1; CI uses 3.10.1: always `npx --yes prettier@3.10.1`. Local unit tests can wait long for a slot
(`tests/slot.js`) when agents run checks: CI runs the same suite.

- **Merged 11-18 morning**: #1051 fish out of beta, sea slugs open to all in beta, Remove all (v166); #1060 sea slug
  statistics and Analyses (v167); #1061 sea slug Candidates, tags, content editor, Health (v168); #1063 STATUS; the three
  reviews Pierre asked for (06:38): #1064 [app gaps](reviews/2026-11-18-app-gaps-review.md), #1065
  [backlog inventory](reviews/2026-11-18-backlog-inventory.md) (151 items, 17 doc contradictions, studies not fully acted
  on), #1066 [architecture and code review](reviews/2026-11-18-architecture-code-review.md) (target: one tree engine for
  every subject, ES modules, the log as the only state that travels, an API contract; 15 steps).
- **Version queue** (one at a time: merge `main`, `--assign`, CI, Codex, train): #1062 (v169 assigned: sea slug WoRMS
  view) → #1053 (log keeps "sp. 5") → #1050 (staff and cohort boards) → #1049 (live mode; fixing CodeQL).
- **#1057** held-out set: Pierre (06:48): "Si on n'a pas assez de photos, ben on privilégie l'apprentissage". A unit
  holds photos back only from a real surplus; the agent simulates two variants (practice ≥ 2× held; a practice floor
  per unit), 40 min cap, and keeps the one that clears both breaches.
- **Agents**: fish genera of circles 2-3 (Q397: units, then their content); the "What I learn" card study (Q396; with
  Pierre's note: no sea slug course, but an "open everything" control per subject, worded per subject); minify at deploy
  (architecture step 1).
- Branches: fish-todo-wip and photo-genus-ability superseded (can be deleted); admin-signout-seal waits for Pierre.

## Next

1. The version queue; the fish read their own statistics in the app (#1060's mechanism).
2. Architecture steps 2-4 (integrator's calls, no player-visible change) once the queue is empty, each alone on its
   train: a gate floor at a version **already confirmed live** (never the build's), `fish*` renamed `tree*`, `core.js`
   split. Then the 17 doc contradictions of the inventory (§3) in one docs PR.
3. Species step 2 (#1041; Q394-Q398 answered) built for fish and sea slugs together: the `sci:` key and one levels
   table, the family checklist exam, the ultimate exam, the "What I learn" card; its check ~40 min (Pierre: "6h de
   calcul ne devrait JAMAIS arriver").
4. Proposal owed to Pierre: keep every L11 check short (fewer profiles and seeds, the rated world only where it matters,
   no level 3 runs without his go), the power given up stated.

## Questions for Pierre

Answered 11-18 morning: #1057 exam only, no probes, reserve only from a surplus ("on privilégie l'apprentissage");
Q394 A; Q395 family checklist exam, ultimate exam 100-200 questions at 95%; Q396 a per-subject "What I learn" card;
Q397 genera of circles 2-3; Q398 integrator's call.

Still open:

- **Synthesis of the three reviews** (asked 07:00): (1) start with the domain and the professionalise study (the
  rename is planned before December 2026; signed-out players lose local progress without a hand-over)? (2) the target
  architecture in principle (corals on the tree engine, curation split, one id scheme, sync by answers, then D1)?
  The reviews' own questions (gaps a-j, architecture a-i, professionalise a-e) get numbers once he picks the direction.
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
- **In the admin**: Light and Cover proposals, then Publish; Points (47 open, incl. the 7 literature points of #1055);
  the Q354 points for an IMR trainer.
- Check the "Coral ID analyses" token's type and the R2 token's scope; protect `main`; renew the admin GitHub token
  before late January 2027.

## Parked after hours

- None.

## Last stop

2026-11-18 ~08:00 Manila: checkpoint after the three reviews. Old player-data extracts may remain in the session
scratchpad (`data/`): delete them, never commit them.
