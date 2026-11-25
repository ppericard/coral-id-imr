# Judged ease within a family only: a photo's prior centred on its family's mean ease, for every subject with a judged ease

Date: 2026-11-23. PR: #1571. Rules or docs touched: S1, L11, L12, D5; `model.js` `photoDiff`, `genusDiff`, `easeMid`;
`autosort.js` `photoPrior`, `admin.js` `treePrior`; docs/LEARNING.md "The judged ease, within a family".

## Context

A judged photo's prior was (3 − its judged ease) × `calib.ease` on top of its unit's offset. A unit's difficulty added
the mean of its photos' priors, so the families opened in the order of their mean judged ease. The REE-85 study
([reviews/2026-11-23-fish-ease-vs-answers.md](../reviews/2026-11-23-fish-ease-vs-answers.md)) used 3,349 fish answers
from 9 players. It found that the ease ranks photos within a family (−0.22 logit a point with a term per family) and
predicts nothing between families (−0.03 [−0.15, +0.04]). If anything, families judged harder were answered better.

## Decision

- Pierre, 2026-11-23 17:20 Manila, Q457: «ok» to the integrator's recommendation of 16:49: the judged ease used only
  within a family, later, with a simulation (docs/ANSWERS.md; Linear REE-241).
- The rule applies to every subject whose photos carry a judged ease: the fish and the sea slugs (rule S1). Pierre,
  2026-11-24 06:35, on the ease weight: «Ce que je te reproche c'est de ne pas avoir généralisé». The corals' photos
  carry no judged ease. A unit's family is the top of its parents: a fish family itself; for a fish genus or species,
  a sea slug genus or species, their family record.
- **Open, for Pierre (PR #1571):** the overall level.
  - (A) Centred on the family mean: a unit's mean prior is its offset alone. Sea slug units become about 0.17 logit
    harder, fish units 0.03 easier.
  - (B) Keep main's level: the centre + 3 − the subject's mean ease.
  - The integrator recommends B. The ranking alone breached no guardrail; the level alone caused the sea slug breaches.
    Q457 decided the ranking, not the level.

## Consequences

- `model.js` `easeMid` is the mean judged ease of the family's photos, kept per family and unit record.
- `photoDiff`'s prior is the offset + (`easeMid` − ease) × `calib.ease`.
- `genusDiff` adds that prior's mean over the unit's photos. It is constant across families, so families open by their
  offsets and commonness, and the units below a family open easiest first within it.
- The admin's prior on By difficulty follows (`treeEaseMids`).
- No rules version (rule D5): the bar and both replays read each answer's logged difficulty and offset (`sc` d, m), not
  the prior. Only a unit still on the former moving average (`domRecalcAll`) is rebuilt from today's.
- The checks are in docs/LEARNING.md "The judged ease, within a family": the exact opening order, the real-log replay
  (rule L12) and the simulation (rule L11, level 2). PR #1571 lists the guardrails breached without being declared
  before running, for Pierre.
