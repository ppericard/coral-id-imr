# A unit's card on a Learn list opens its sheet, whole: no "Open the sheet", no marks heading or sources there

Date: 2026-11-20. PR: #0. Rules or docs touched: S1, P5, C2, U3, U4; docs/spec/front-end.md "Learn › Genera",
docs/DESIGN.md "Components", docs/spec/fish-sheets.md, docs/spec/fish-game.md.

## Context

On the Learn lists of the fish and the sea slugs, a unit's sheet opened only from a small "Open the sheet →" line under
its name; its photo enlarged in the photo viewer, and the cues came under an "ID MARKS (sources)" heading. Pierre found
the sheets hard to reach, on every subject.

## Decision

Pierre, 2026-11-20 06:02 Manila: «la photo doit être un lien. Vers la fiche. Et du coup, ça serait une exception sur le
fait que si on clique, on voit les crédits […] Et le titre du genre aussi devrait être un lien. […] ID Marks, ben, en
fait, on s'en fiche un peu, c'est redondant […] Les sources, c'est pas aussi utile que ça soit affiché à cet
endroit-là […] je me demande si peut-être toute la partie à gauche doit pas être cliquable, c'est-à-dire la photo, le
titre, tout ça, en dégageant le Open This Sheet qui sert à rien en fait et qui est pas intuitif. Par contre, il faudrait
rendre très clair le fait que bah, c'est cliquable et que du coup il y a une fiche à ouvrir derrière […] c'est vrai pour
toutes les matières du coup.»

Three variants were drawn at 390 px for every subject (the left part one link; the whole card one tappable surface; a big
card with the photo across the top). Built, the integrator's call (easy to correct): **the whole card**, one `--surface`
card with an accent chevron at its right edge, as the sheets' rows (`.frow`) and the corals' photo cards already read:
the largest target, plainly tappable, and the cues stay beside the photo, so a screen still holds about three units.
In shared code (`app.js` `listCard`) for the corals' ID tips view and the fish and sea slug lists (rule S1); the corals'
Photos view cards were whole-card links already. Also the integrator's calls: one link per card (the name, stretched over
it) so a screen reader reads a short name; the corals' "Don't confuse with" Compare links kept, above it; the look-alike
lines and "IMR names inside it" kept, without their sources.

## Consequences

- The photo on a Learn list opens the sheet, not the photo viewer; the sheet's photos still enlarge with their credits
  (rule P5 holds there; Pierre named this exception: the list's photo shows its credits once on the sheet). Checked
  on 2026-11-20: every coral genus's list photo is the sheet's; 11 of 65 fish families and 38 of 78 sea slug genera
  show another one on their sheet (ROADMAP "The Learn list's photo first on the sheet it opens"). The cues' heading
  and sources leave the list and stay on the sheet (rule C2).
- Not the admin one-engine study's step 9 (its acceptance is the same HTML as before); that refactor stays open.
- The look-alike cards on the sheets (`learn.js` `viewLookalikes`' list, the fish family sheet's "Don't confuse with")
  keep their "Open the sheet →" / "Compare side by side →" lines: not a Learn list, not in this change.
- Tests: `tests/learncard.test.js`; `tests/fish.smoke.js` (the families page), `tests/pages.smoke.js` (the ID tips view).
