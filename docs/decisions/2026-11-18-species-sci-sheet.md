# Species by scientific name on the sheet: the sci: key, smaller faults by kind

Date: 2026-11-18. PR: #1249. Rules or docs touched: docs/spec/sync.md, docs/LEARNING.md "One scorer", docs/SECURITY.md, docs/reviews/2026-11-18-species-step2-plan.md.

## Context

Step 2 of the fish path asks a species by its scientific name, for the fish and the sea slugs alike. The plan
([species step 2 plan](../reviews/2026-11-18-species-step2-plan.md)) puts the sheet first, so that the sync script
replays such answers before the app asks any (rule D4). Four choices are costly to undo once answers are logged: the
key, what the unit hangs from, how a half-right typed answer counts, and how the log says so.

## Decision

- **The key and the table** (Q398, Pierre, 2026-11-18: "C'est un détail d'implémentation", the integrator's call):
  `sci:` and the species id in letters and digits (`sci:s091`, `sci:xgoniobranchussp5`). One levels table in `core.js`
  (`LEVELS`) holds each level's prefix, rank, name kind and parent, and every builder of a species unit reads it.
- **The parent** (Q397 C, Pierre, 2026-11-18 ~06:32 Manila: "lance"; the two trees, ~09:17: "Ce sont 2 arbres
  pédagogiques indépendants"): its genus unit, never its common-name unit. Its look-alikes are the other scientific
  species of its family, for both subjects (the plan's §2.1; the integrator's call, easy to correct).
- **The smaller faults** (Q394 A, Pierre, 2026-11-17: "A"): a common name typed where the scientific name is asked
  counts as half a miss, the genus alone as a quarter, never a gain. The log carries the kind (`z`: `cn`, `g` in the
  scoring record), not the size. The size lives in `core.js` `PART`, and a miss is weighed by it in every step the miss
  takes. This is the integrator's call: a later size is one rules version, and the whole log replays with it.

## Consequences

- The sheet's replay units (`treeReplayGen`) and the fish leaderboard's tree (`treeBoardTree`) hold the `sci:` units.
  Their photo check walks up to the genus (`unitUp_`, `photoCheck_`). Fish rules version 5 and sea slug rules version 2
  replay every player once, with the same result for a log without such answers.
- The app opens these species only from the script version that replays them (`sync.js` `SCI_SHEET`), in its own PR.
  That PR also makes the app's units and tree equal to the sheet's again.
- A marked row still rates its photo as a miss in the pooled statistics. The app PR may change that.
