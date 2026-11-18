# The fish read their own pooled statistics in the app, merged with no further simulation

Date: 2026-11-19. PR: #1148. Rules or docs touched: L11; LEARNING.md "Each subject's own statistics", "Hierarchical
photo Elo"; docs/spec/sync.md; FISH_PATH.md; ROADMAP admin plan row 11, "Fish confusion at several ranks".

## Context

The sheet has rated the fish's photos, units and pairs since v137, but the app drew the fish on their priors alone
(admin plan PR 11, Pierre, 2026-11-04). This PR makes the app read them, as it reads the sea slugs'. Its level-1 check
(the app world, 75 pairs) held true knowledge on every profile, but one guardrail, the bar's error, was breached on the
side it was not declared for, and Codex asked for a level-2 check (Q413).

## Decision

Pierre, 2026-11-19 05:13 Manila (Q413): merge, no simulation; the change brings the fish in line with the corals. He set
the principle with it: the app's engine is one engine, common to every subject, each subject setting only small
parameters of its own (05:15 Manila; its rule wording is to come, with an audit of where the fish's or the sea slugs'
path still differs).

Choices made while building, not decided with Pierre, each easy to change: the fish's photo memory and format offsets
stay the prior and none (using them moves progress, a rules version of their own); a photo rated at several ranks takes
the offset of the unit asked (the sheet names the unit that rated it last; Codex review).

## Consequences

- The fish draw, traps and data look-alikes follow their players' answers from the script version that ships this
  (`core.js` `FISHST_SHEET`, rule D4); the corals' numbers are unchanged, but for a photo rated last under a genus it
  has since left, which takes its current genus's offset.
- The progress is not recalculated: the sheet replays a fish answer from the scoring record it logged.
- The measurements and the check: docs/archive/learning-notebook.md "The fish's own pooled statistics".
