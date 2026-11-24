# The sea slugs take the fish's softened caps: a partial animal and a head-on or rear view at most 4, the typical look shared

Date: 2026-11-24. PR: #1524. Rules or docs touched: judging/SEASLUG.md "Ease" and "Caps"; `tools/fish_judge.py`
`RUBRICS` `"seaslug"` and `cap`; `tests/seaslugjudge.test.js`. Extends judging/FISH.md "Caps" (Q456, Q458, Linear
REE-242).

## Context

On 2026-11-23 the fish's caps were softened (Q458 step 1): a partial fish and a head-on, tail or top view went from at
most 3 to at most 4, and in a typical-look family a partial fish and camouflage cap nothing (Q456). The sea slugs kept
their caps at 3 and had no typical look, on the ground that «both came from fish answers» (judging/SEASLUG.md "Caps").
The same reason, "measured on the fish only", had kept the sea slugs' ease weight apart in #1519, and Pierre called
that a fault of rule S1 (Linear REE-267).

## Decision

Pierre, 2026-11-24 06:32 Manila, on #1519 keeping the sea slugs apart: «Et bien c'est un mauvais choix. C'est quoi nos
règles globales de développement?». 06:35: «C'est possible que les exemples viennent de sujet en particulier, mais il
faut toujours généraliser.» And: «La règle c'est qu'on peut faire des exceptions, des ajustements et des paramétrages
par sujet si ils sont justifiés.» (Linear REE-267.) Applying those words here is the integrator's call: a measure taken
on one subject is no reason for a difference, so:

- The sea slugs' partial animal (`0`) and head-on or rear view (`h`, `t`) are at most 4, as the fish's; their ease
  scale puts them under "4 easy".
- The typical look is a shared mechanism (`RUBRICS` `typical` `0c` for both). No sea slug genus is declared
  typical-look today: the declared rule (`typical_look`) reads the fish's teaching entries only, and no list was made
  by hand.
- Declared differences kept, each with its reason (rule S1): a dorsal view caps nothing (one of the sea slugs'
  field-guide views); a ventral view `v` stays at most 3 (their own code, no fish equivalent).
- Strong blur `b` still caps nothing for the sea slugs, as the integrator's brief asked. Its only recorded reason is
  that Pierre's review of 2026-11-19 was of fish photos, the kind of reason the words above reject, so it is left as it
  was and not presented as a justified difference.

## Consequences

- A cap only lowers the ease a judge typed, so no stored ease moves: re-applying the caps to the 5,155 judged sea slug
  codes changes none. 563 sea slug photos tagged `0`, `h` or `t` sit at ease 3; 562 of them were typed 3 under the old
  scale and keep it until judged again. That re-look is a pass under rule P7, requested in Linear REE-257 with the
  duplicate pass; nothing is judged again here.
- New sea slug judgements use the softened caps at once. Players see nothing until a pass or new judgements.

Changed by: [2026-11-24-sea-slug-blur-cap-as-the-fish.md](2026-11-24-sea-slug-blur-cap-as-the-fish.md) (strong blur
now caps at 2 for the sea slugs too).
