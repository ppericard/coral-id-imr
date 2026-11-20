# The juvenile card shows the young beside an adult, only for species whose young are sourced as different

Date: 2026-11-20. PR: #NNNN. Rules or docs touched: spec/model.md, spec/fish-sheets.md "Juvenile card flags",
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
- **It fires only where a source says so.** A juvenile photo, only for a species whose young a source says look clearly
  different (`differs: true`); a sub-adult photo (the phase intermediate, without the phase flag of a dimorph entry),
  only where a source names a sub-adult stage with its own look (`sub: true`). Never for `false` or unknown, and never
  without an adult of its species to show beside it.
- **Pierre's per-photo choice in the admin still wins** (rule A1): the photo's phase is his when he set one.
- **The reading** (2026-11-20, 381 species with juvenile photos): 82 sourced as different, 25 as alike, 274 unknown; 8
  with a sub-adult stage of its own. Each value with its sources and quote (rule C2), in `tools/fish_juv_differs.json`,
  built into `fish.json` species `jd`. Three source conflicts are points (rule C5), none settled.

## Consequences

- On the photos in play as the judging gives them (with #1323's two corrections): 1,174 young photos bring the card
  (1,167 juveniles and 7 sub-adults of *Diagramma pictum*), 1,948 juveniles do not; every photo sourced as different has
  an adult of its species in play. The sweetlips Pierre named brings it; the goatfish does not (no source either way).
- Only `quiz.js` reads `jd` (`juvCard`, `phaseCardFor`); the draw, the ease, the judging and the progress never do, so
  no rules version (rule D5). `core.js` is untouched: its `phaseKind` and `phaseCardOf` comments still describe the old
  trigger, a follow-up once `core.js` is free. A subject without the flags (the sea slugs) has no juvenile card.
- The once-per-kind token is unchanged: a player who saw the old juvenile card does not see the new one.
- Supersedes #1323's line that a sub-adult card would be a `core.js` change. Tests: `tests/fishjuvdiff.test.js`.
