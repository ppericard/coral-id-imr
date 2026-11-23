# Judged ease weight: one shared value, 0.3 logit a point, for every subject whose photos carry a judged ease

Date: 2026-11-23. PR: #1519. Rules or docs touched: S1, L11, L12, D5; `core.js` `CALIB.ease`; docs/LEARNING.md "Fish:
the starter core and judged photos", "The judged ease weight, measured"; judging/FISH.md "What the app does with it".

## Context

A photo's prior difficulty is (3 − its judged ease) × the weight of an ease point, `calib.ease`, which every subject
read from the shared default 0.5 (one standard deviation of a coral photo's own difficulty around its genus). The
REE-85 study ([reviews/2026-11-23-fish-ease-vs-answers.md](../reviews/2026-11-23-fish-ease-vs-answers.md)) found, on
3,349 fish answers from 9 players, that the ease ranks photos within a family at about half that strength: 0.20–0.25
logit a point with the players as they are, 0.33–0.40 once a player's own level is allowed for ("Experts and response
time"). On held-out players 0.2–0.3 predicted best and 0.5 no better than no prior. The first version of this PR set
0.3 for the fish alone and kept the sea slugs at 0.5 because only fish answers had been measured (Linear REE-267).

## Decision

- Pierre, 2026-11-23 17:20 Manila, Q455: «ok» to the integrator's revised recommendation of 16:49, the ease weight to
  «environ 0,3 (fourchette 0,2–0,4), sans urgence»; response time is the better signal for a photo's difficulty
  (REE-16). 0.3 is the centre of his range.
- Pierre, 2026-11-24 06:32 Manila, on the sea slugs kept at 0.5: «Et bien c'est un mauvais choix. C'est quoi nos
  règles globales de développement? ça mérite une issue de non respect à la règle ça» (REE-267); 06:33, relayed by the
  integrator: «idem pour les coraux ou tout autre sujet à venir»; 06:35, relayed: «Tu sur-interprète la règle
  maintenant! La règle c'est qu'on peut faire des exceptions, des ajustements et des paramétrages par sujet si ils sont
  justifiés. Ce que je te reproche c'est de ne pas avoir généralisé, et juste décidé de ne traiter les poissons que
  parce que c'était l'exemple de départ.»
- So the weight is one shared default, 0.3, which every subject with a judged ease reads, today's and future ones. A
  subject may still set its own in its `SUBJECTS` `calib`, only as a declared exception with its reason (rule S1);
  none has one today. Measured on one subject's answers is no reason for another subject to differ.

## Consequences

- `core.js` `CALIB.ease` is 0.3; no subject sets its own. `model.js` `photoDiff` and `genusDiff` and the admin's prior
  (`autosort.js` `photoPrior` through `calibOf`) read it. A fish or sea slug photo at ease 5 starts at −0.6 instead of
  −1, ease 1 at +0.6 instead of +1, so the photos judged hard come a little more often in the targeting and get rated
  from answers sooner; the units' opening order (their mean judged prior) moves less with the ease. The cap under ease
  4 before Open Water (`RARE`) reads the ease, not the weight, and is unchanged. The corals' photos carry no judged ease
  (none in `data.json` or the curation, quality and calibration files), so their prior has no ease term.
- No rules version (rule D5): the sheet's and the device's replays score each past answer with the difficulty it
  logged, and neither reads `calib.ease`, so no player's progress moves. Answers from now on log the new difficulty.
- Checked by rule L11 at level 2 (the fish; `tools/learnsim.js` has no sea slug subject) and rule L12 on the real
  answer log (the fish; the sea slugs' 168 answers from 2 players are too few): the tables are in the PR and in
  docs/LEARNING.md "The judged ease weight, measured".
