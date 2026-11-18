# The mimicry class: look-alike species come in once their model is met, with a card

Date: 2026-11-18. PR: #1133. Rules or docs touched: C2, C3, C6, P3, D5, D7; LEARNING.md "The mimicry class";
FISH_PATH.md "Juveniles and colour phases"; ARCHITECTURE.md "Front end" (the photo variants); ROADMAP "Look-alike
pairs between species"; tools/README.md.

## Context

The classic look-alike pairs study (docs/reviews/2026-11-18-classic-lookalike-pairs.md, #1085) listed 27 pairs seen
around Dauin, seven of them fish pairs where a source says one species resembles the other (M1-M7, after Randall 2005),
and designed a variant class for them, a card, and a warning on photos of a species whose look varies by region.

## Decision

Pierre, 2026-11-18, 10:22 Manila, approving the mimicry variant class: a juvenile or an adult that resembles another
species comes in once both units are met and at Open Water, with its explanation card, and the pair is then drilled in
the look-alike formats; "Il faudra prévoir des vrais cartes pour des paires de sosies classiques qu'on trouve ici
couramment." His answers to the study, about 10:54-10:55: (a) "ok", M1-M7 enter play now, C1-C12 with species step 2;
(c) "ok", one sourced mark is enough for a card; on the *Acanthurus pyroferus* photos, "Merci de mettre un warning sur
ces cas".

Built here:

- the pairs M1-M7 in a hand-kept, sourced file (`tools/fish_lookalikes.json`), each mark in our words with no digit and
  never the word "mimic" (a resemblance is a source's claim, FISH_PATH.md), built into `fish.json` `lookalikes`;
- the class in the draw: a photo of the resembling side comes from Open Water to Advanced once a unit of the species it
  resembles is met;
- its card at the first meeting, once per pair;
- the out-of-region flag (`fish.json` species `region`, with its reason and sources): such a species' photos taken
  outside the Philippines never show on the card.

Choices made while building, not decided with Pierre (the PR lists them for him, each easy to change):

- the ramp [0.5, 0.8], as for the other juveniles and the phases;
- while no unit of the model is met, the photos come at Advanced, the late class's timing, so a photo never waits on a
  unit the player may not open (circle 3 declined: M6's bream);
- the class is the draw only: its group for "Learned" stays its phase's (a resembling juvenile in the juveniles' group,
  an adult in none), so the sheet's replay and every learned mark are unchanged and no rules version is needed;
- a pair inside the unit asked (M5's two blennies, asked as their family) holds nothing back, and the unit asked never
  opens the gate by itself;
- the regional species: *A. pyroferus* (Pierre's case), and the cleaner wrasse and the false cleanerfish, whose South
  Pacific colour forms Randall describes (p. 323); on the card, a photo from near Dauin first.

The integrator's calls, easy to correct: the card's layout and words ("Careful: this juvenile resembles another
species", "Resembles" with its sources) and the marks' wording.

## Consequences

- *Acanthurus pyroferus* and *Scolopsis bilineata* juveniles (class B) now come from Open Water once their model is met,
  instead of at Advanced; the adults of *Paraluteres prionurus*, *Aspidontus taeniatus* and *Petroscirtes breviceps*
  now wait for Open Water.
- Not built yet (ROADMAP): the pair drilled in the look-alike formats (per-photo traps and duels), M7 as a family pair,
  the Look-alikes deck for every subject, the admin's ⚠ badge and its one-click lift, the feature frames' default.
