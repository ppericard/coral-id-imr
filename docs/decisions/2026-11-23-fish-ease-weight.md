# Fish ease weight: the judged ease weighs 0.3 logit a point in a fish photo's prior, not 0.5

Date: 2026-11-23. PR: #1519. Rules or docs touched: L11, L12, D5; `core.js` `SUBJECTS` fish `calib.ease`;
docs/LEARNING.md "Fish: the starter core and judged photos", "The fish ease weight, measured"; judging/FISH.md "What
the app does with it".

## Context

A fish photo's prior difficulty is (3 − its judged ease) × `calib.ease`, which the fish inherited from the default 0.5
(one standard deviation of a coral photo's own difficulty around its genus). The REE-85 study
([reviews/2026-11-23-fish-ease-vs-answers.md](../reviews/2026-11-23-fish-ease-vs-answers.md)) found, on 3,349 fish
answers from 9 players, that the ease ranks photos within a family at about half that strength: 0.20–0.25 logit a
point with the players as they are, 0.33–0.40 once a player's own level is allowed for ("Experts and response time").
On held-out players 0.2–0.3 predicted best and 0.5 no better than no prior.

## Decision

Pierre, 2026-11-23 17:20 Manila, Q455: «ok» to the integrator's revised recommendation of 16:49, the ease weight to
«environ 0,3 (fourchette 0,2–0,4), sans urgence»; response time is the better signal for a photo's difficulty (REE-16).
0.3 is the centre of his range; the exact value within it is the integrator's call, easy to correct.

## Consequences

- The fish `SUBJECTS` `calib` sets `ease: 0.3`; `model.js` `photoDiff` and `genusDiff` and the admin's prior
  (`autosort.js` `photoPrior` through `calibOf`) read it. A fish photo at ease 5 starts at −0.6 instead of −1, ease 1 at
  +0.6 instead of +1, so the photos judged hard come a little more often in the targeting and get rated from answers
  sooner; the families' opening order (their mean judged prior) moves less with the ease. The cap under ease 4 before
  Open Water (`RARE`) reads the ease, not the weight, and is unchanged.
- The sea slugs keep the default 0.5: the measure was the fish's. The corals' photos carry no judged ease.
- No rules version (rule D5): the sheet's and the device's replays score each past answer with the difficulty it
  logged, and neither reads `calib.ease`, so no player's progress moves. Answers from now on log the new difficulty.
- Checked by rule L11 at level 2 and rule L12 on the real answer log: the tables are in the PR and in
  docs/LEARNING.md "The fish ease weight, measured".
