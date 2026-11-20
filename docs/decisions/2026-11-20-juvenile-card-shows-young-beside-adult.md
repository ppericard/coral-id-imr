# The juvenile card shows the young beside an adult, only for species whose young are sourced as different

Date: 2026-11-20. PR: #1329. Rules or docs touched: spec/model.md, spec/fish-sheets.md "Juvenile card flags",
FISH_PATH.md, points.json.

## Context

The juvenile card came with the first juvenile photo a player met, whatever its species, and said in words "Careful: this
was a juvenile, it can look very different from the adult", with the family's IMR phase lines. Pierre met it on a
goatfish juvenile that looks like its adult (2026-11-20): «Je dis pas que c'était pas un juvénile. Mais la carte disait
explicitement qu'il fallait vraiment se méfier parce que les juvéniles pouvaient être très différents des adultes.
C'était l'un des pires exemples pour ça»; «C'est une remarque qui devrait entrainer une réflexion de ta part. Comment
faire pour que ça n'arrive plus? Est-ce qu'on doit ne faire apparaitre cette carte que sur certaines
espèces/genres/familles? Est-ce qu'on peut imaginer quelque chose d'autre.»; and on sub-adults: «On a dit juvenile, pas
forcément sub-adulte. Même si effectivement pour certaines espèces on a plusieurs phases graduelles».

## Decision

The integrator's design (integrator's call, easy to correct):

- **The card claims nothing in words.** It shows the young photo beside an adult photo of the same species, from that
  species' photos in play, its reference photos included; its title names the two ("Juvenile and adult", "Sub-adult and
  adult"); no IMR phase lines on it (the sex or colour phase card keeps them). The learner sees the difference (rule
  L14: side-by-side comparison).
- **One rule, where a source says so.** A young photo, judged juvenile or sub-adult (the phase intermediate, without
  the phase flag of a dimorph entry), brings the card whenever a source says its species' young look clearly different
  (`differs: true`). Never for `false` or unknown, and never without an adult of its species to show beside it. The
  first build also read a separate `sub` flag for sub-adults; Pierre, 2026-11-20 19:23: «Pourquoi tu fais une exception
  pour une espèce … Diagramma Pictum … pour les sous-adultes … soit on décide de mettre la carte seulement sur des
  juvéniles, soit on décide de le mettre aussi sur des formes qui ont des sous-adultes … Là, on a encore créé une
  exception basée sur une remarque hyper spécifique de ma part.» So no species-level exception: juveniles and sub-adults
  are one case (the integrator's call, easy to correct), all the more since very few photos are judged sub-adult at all
  (7 in play). `sub` stays in the data as information only.
- **Pierre's per-photo choice in the admin still wins** (rule A1): the photo's phase is his when he set one.
- **The reading** (2026-11-20, 381 species with juvenile photos): 82 sourced as different, 25 as alike, 274 unknown; 8
  with a sub-adult stage of its own (information only). Each value with its sources and quote (rule C2), in
  `tools/fish_juv_differs.json`, built into `fish.json` species `jd`. Three source conflicts are points (rule C5), none
  settled.

## Consequences

- On the photos in play as the judging gives them (#1323 merged: the goatfish lost its `j`, the sweetlips stays
  judged a sub-adult): 1,174 young photos bring the card (1,166 juveniles and the 8 sub-adults in play: 7 *Diagramma
  pictum* and the *Diagramma melanacrum* sweetlips, their young sourced as different), 1,948
  juveniles do not (no sub-adult left without); every photo sourced as different has
  an adult of its species in play. The sweetlips Pierre named brings it; the goatfish does not (no source either way).
- Only `quiz.js` reads `jd` (`juvCard`, `phaseCardFor`); the draw, the ease, the judging and the progress never do, so
  no rules version (rule D5). `core.js` is untouched: its `phaseKind` and `phaseCardOf` comments still describe the old
  trigger, a follow-up once `core.js` is free. A subject without the flags (the sea slugs) has no juvenile card.
- The once-per-kind token is unchanged: a player who saw the old juvenile card does not see the new one.
- Supersedes #1323's line that a sub-adult card would be a `core.js` change. Tests: `tests/fishjuvdiff.test.js`.
