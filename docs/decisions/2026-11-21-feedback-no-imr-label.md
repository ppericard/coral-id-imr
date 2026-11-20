# The answer feedback no longer says "(IMR)" as its line's source

Date: 2026-11-21. PR: #1353. Rules or docs touched: docs/spec/quiz.md "The feedback sheet", docs/DESIGN.md "The short feedback sheet", docs/ANSWERS.md.

## Context

On a phone, after a wrong answer, the decisive line ("Angelfish: spine on the gill cover, iridescent blue · Butterflyfish: no opercular spine, no iridescent blue", or a coral's first ID tip) ended with its source in small type, `(IMR)`. At 390 px the line filled its width, so the source wrapped onto a line of its own and the sheet grew by a row for a three-letter credit.

## Decision

Pierre, 2026-11-21 05:53, looking at the feedback screenshots of #1351: «Alors tu vois sur les captures de réponses fausses que tu me montres, le fait que IMR entre parenthèses ça prenne une ligne entière, moi je trouve ça assez fou quoi. Donc faut le dégager en fait, ça n'a pas de sens. C'est pas grave qu'on ne dise pas que cette manière de l'identifier c'est lié à IMR, là ça prend trop de place en fait.»

`quiz.js` `fbLine` leaves "IMR" out of the sources it says (`noImr`), for every subject (the line is subject-neutral, rule S1). Only IMR's own name is dropped: any other source stays after the line (the editor's source, FishBase, a guide), as do the photo credits (rule P5) and the sources of a mimicry pair's marks.

## Consequences

Rule C2 still holds: the source is in the data and shown wherever the full cue is. Behind More, the tips box keeps its label ("ID tips (IMR)"), a mix-up's panel keeps the pair's own line with its sources, and the Compare page says the pair's source. A test holds both halves (`tests/fbsheet.test.js`; `tests/pages.smoke.js` names part: no "(IMR)" on the sheet's visible lines).
