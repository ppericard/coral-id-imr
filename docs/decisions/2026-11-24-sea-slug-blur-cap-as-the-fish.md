# The sea slugs take the fish's strong-blur cap: a strongly blurred photo is at most 2

Date: 2026-11-24. PR: #1532. Rules or docs touched: judging/SEASLUG.md "Caps"; `tools/fish_judge.py` `RUBRICS`
`"seaslug"` (`blur2`) and `cap`; `tests/seaslugjudge.test.js`; `data/suggest.json` and `seaslug-game.json` (re-applied).
Extends [the sea slugs' caps as the fish's](2026-11-24-sea-slug-caps-as-the-fish.md) and judging/FISH.md "Strong blur"
([the fish gold set](2026-11-19-fish-rubric-gold-set.md)).

## Context

The fish rubric caps a photo with strong blur (clarity `b`, the outline or pattern smeared) at ease 2, and keeps it in
play (Pierre's review of the fish gold set, 2026-11-19). The sea slug rubric kept strong blur uncapped. The only reason
written for it was that Pierre's review was of fish photos. The previous record
(2026-11-24-sea-slug-caps-as-the-fish.md) left it as it was, noted that the reason was not a justified difference, and
Linear REE-267 announced the alignment by Pierre's default.

## Decision

Pierre, 2026-11-24 06:32–06:35 Manila, on a per-subject value that had no reason (Linear REE-267): «Et bien c'est un
mauvais choix. C'est quoi nos règles globales de développement?»; «C'est possible que les exemples viennent de sujet en
particulier, mais il faut toujours généraliser.»; «La règle c'est qu'on peut faire des exceptions, des ajustements et des
paramétrages par sujet si ils sont justifiés.» At 06:45: «D'accord pour que par défaut on fasse partout pareil !».

"The review was of fish" is no justification, so the default applies, as the integrator's call (AGENTS.md "Working
mode", easy to correct): the sea slugs take the fish's blur cap, `RUBRICS["seaslug"]["blur2"] = "b"`, the same wording
in both rubrics. A strongly blurred sea slug photo is at most ease 2 and stays in play. A declared difference for the
sea slugs would need its own evidence and record (rule S1).

## Consequences

- The caps were re-applied to the stored sea slug codes with the project's script
  (`python3 tools/judging_fish.py --subject seaslug codes`), then `python3 tools/seaslug_game.py`. No agent looked at a
  photo and nothing was judged again (rule P7): a cap only lowers an ease the code already carries.
- Of 5,155 judged sea slug photos, 119 carry `b`: 112 were already at most 2 and 7 were at 3. Those 7 went to 2, 3 of
  them in play (one each in *Melibe*, *Asteronotus* and *Elysia*, the last two at genus level). The 4 others are
  candidates not in play (*Goniobranchus* 2, *Gymnodoris*, *Hypselodoris*). Players meet the 3 photos as harder ones.
- `codes` dates the pass of each species it changed, so the 7 species' `by` date in `data/suggest.json` is 2026-11-24.
  The sea slugs have no auto-sort yet, so nothing reads it.
- New sea slug judgements take the cap at once.
