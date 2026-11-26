# Judged ease within its unit only: a photo's prior centred on its unit's mean ease, a unit's difficulty its offset

Date: 2026-11-26. PR: #1571. Rules or docs touched: S1, L11, L12, D5; `model.js` `photoDiff`, `genusDiff`, `easeMid`,
`easyTrust`; `autosort.js` `photoPrior`, `admin.js` `treePrior`, `treeEaseMids`; docs/LEARNING.md "The judged ease,
within its unit"; judging/FISH.md, judging/SEASLUG.md.

## Context

A judged photo's prior was (3 − its judged ease) × `calib.ease` on top of its unit's offset, and a unit's difficulty
added the mean of its photos' priors, so units opened in the order of their mean judged ease. The REE-85 study
([reviews/2026-11-23-fish-ease-vs-answers.md](../reviews/2026-11-23-fish-ease-vs-answers.md), 3,349 fish family
questions, 9 players) found that the ease ranks photos within a family (−0.22 logit a point) and predicts nothing
between families (−0.03 [−0.15, +0.04]). Q457 (Pierre, 2026-11-23 17:20 Manila: «ok») kept the ease within a family. A
first build centred each photo on its family's mean, so the ease still ranked the genera and species below a family.
The design note of PR #1610 (`docs/reviews/2026-11-26-judged-ease-scale.md`) showed
that the rubric judges a photo against its own taxon's look: the ease places a photo among its unit's photos and says
nothing about how units differ.

## Decision

Pierre, 2026-11-26 09:16 Manila, on #1610 (Linear REE-241):

- (1) «ok» to (a): the judged ease ranks a photo only among the photos of its own unit, never across units, for every
  subject and every rank (rule S1, no per-subject exception). A photo's prior = its unit's offset + (the unit's mean
  judged ease − the photo's ease) × the shared weight (0.3). A unit's difficulty (`genusDiff`) is its offset alone,
  learned from answers.
- (2) «ok» to (A): the level is the sheet's. Each unit starts at its offset; sea slug units start about 0.17 logit
  harder than before (their photos average ease 3.58), fish units 0.03 easier (2.89).
- No effect simulation: «on a tellement peu de données réelles sur les nudibranches que toutes les simulations du monde
  ne pourront pas savoir si c'est ok ou pas. Je propose de juste implémenter sans simuler. Et de revenir simuler une
  fois qu'on aura un nombre suffisant de réponses». Only regression checks run: the new prior's unit tests, same-seed
  runs, the fast tier and the smokes, the answer cost. A Data issue comes back to it once the sea slugs have enough
  real answers. This departs from rules L11 and L12 by his decision.

## Consequences

- `model.js` `easeMid(n)` is the mean judged ease of unit n's game photos, its reserve included; `PDIFF.MID` when none
  has one. Kept per unit record for the data version.
- `photoDiff`'s prior is the offset + (`easeMid` − ease) × `calib.ease`. A photo shared by a family and its genus is
  centred on the unit asked.
- `genusDiff` is the offset alone for every subject: units open by their offsets and commonness, never by their
  photos' ease. `easyTrust` counts answers only, since the ease no longer orders units (#1610's plan).
- The admin's prior on By difficulty follows (`treeEaseMids`: each unit's own photos in play).
- No rules version (rule D5): the bar and both replays read each answer's logged difficulty and offset, not the prior.
