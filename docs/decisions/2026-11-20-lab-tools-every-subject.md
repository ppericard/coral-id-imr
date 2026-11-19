# The Lab tools that ask a unit run on the subject on screen: Type the genus, Blur reveal, the Look-alike web

Date: 2026-11-20. PR: #1280. Rules or docs touched: S1, L4, U2, U13, C3; docs/spec/basics.md "The Lab", docs/spec/subjects.md
"Identify per subject", ROADMAP "Every game mode for every subject", docs/reviews/2026-11-19-modes-every-subject.md (PR 4).

## Context

Same or different?, Odd one out and Matrix already run on the subject on screen. Type the genus, Blur reveal and the
Look-alike web did not: `proto/lab.js` `labPlay` and `labNames` forced the corals' units whatever the subject (the plan's
PR 4, `docs/reviews/2026-11-19-modes-every-subject.md`). They stay Lab prototypes (U13).

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437, whether to open the modes only the corals have to every subject): «évidemment oui, il
faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui, c'est du code commun.»

Built in shared code, nothing scored, logged or saved, the tallies on screen as before (integrator's calls, each easy to
change):

- **Type the genus** asks `unlocked()` units (L4) in the subject's unit word ("Type the family" for the fish), through the
  quiz's own typed-question calls (`typeForm`, `typeBind` with the rank asked, `typeUnit`, `typeRead`, `typeStep`), so a name
  several units share or a part's name reads as in the quiz and a fish family's id is never shown as its name. Its photo is
  the draw's own, aimed as a typed question's.
- **Blur reveal** asks `unlocked()` units with the quiz's own wrong choices (`distractors`: the unit's rank, no two of one
  label, look-alikes first) and the quiz's `fbLine` as the verdict's line. On phones, once answered, its photo shrinks to a
  strip so the verdict and Next stay on one screen (U2); before, on the corals too, they fell below it.
- **The Look-alike web** draws the subject's declared pairs (`UNITS` `pairs`, as the duels), the nodes the units of its slate
  in a pair, coloured as the subject declares (`UNITS` `webBy`, one place). The corals' web gains Millepora (a slate genus
  that counts like the others, rule L6); a pair's line is no longer thicker when both genera list each other (the pairs list
  each pair once); the side panel's photo is the unit's cover, not its corallite close-up, and its line of corallite traits
  shows for the corals only (the units that have them). The panel's photos link to the Compare page where the subject has
  it, else to their sheets. It is a reference page: it shows every unit of the pairs, not only the unlocked ones.
- **Stays coral-only, with the reason**: Spot the feature, the Zoom ladder (which also needs several views), Elimination,
  Anatomy and the reference tools read the corallite traits (`DATA.traits`), which no other subject has.

## Consequences

- The fish and sea slug players find Type the family/genus, Blur reveal and the Look-alike web in Tools, in their own words.
- No change to the scorer, the replay or any stored record: no rules version (D5), no `core.js` change, no learning check (L11,
  level 0: no algorithm, a new door to existing question types).
- `tests/labgames.test.js` (the draw, what the three files read), `tests/labgames.check.js` (played in the pages, fish and sea
  slug smokes at 390 and 1280 px).
