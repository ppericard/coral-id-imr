# The short feedback sheet: the verdict, one line, the rest behind More

Date: 2026-11-18. PR: this one (the build); the study, #1097. Rules or docs touched: C3 (reworded in #1097),
ARCHITECTURE "The short feedback sheet" and "The More counter", DESIGN "The short feedback sheet", ROADMAP "The feedback
sheet's decisive lines", `privacy.html`, SECURITY "Pages opened".

## Context

The answer's feedback sheet held up to eleven items (34-96 words after a miss) and covered a third to a half of a
phone's usable height, with its most useful line (the fish's "Tell them apart") often below the fold. The answer log
shows the players do not stop on it: a median 0.9 s after a right answer and about 3 s after a miss. Pierre, 2026-11-18,
10:42 Manila: "J'avoue que j'ai toujours trouvé la feuille d'explication trop chargée et illisible. Perso je ne la lit
jamais parce que ya trop de trucs et c'est pas hyper lisible." A study (docs/reviews/2026-11-18-feedback-sheet-study.md)
measured it and mocked up three layouts.

## Decision

Pierre, 2026-11-18, about 12:08 Manila: "ok pour les 6 recommandations" (the study's section 6):

- (a) layout A, the short bottom sheet: the verdict, the photo's species line, one line, then More and Next on one row;
- (b) after a right answer, the cue that tells the unit from a look-alike among the choices, else its first ID tip;
- (c) no pair line: the right unit's first ID tip; never a line made by comparing trait tags;
- (d) the sourced "tell them apart" lines written for the 40 coral slate pairs and the 9 sea-slug pairs, corals first (a
  later PR);
- (e) rule C3's new wording: one decisive line on the sheet, the ID tips behind More (done in #1097);
- (f) the More counter ships with the short sheet.

Integrator's calls made in the build (easy to correct): ⚑ Report a problem sits behind More (one tap after the answer, still
in every game); the fish's four undeclared pairs (`fish.json` `apart`) feed the same line, with the family's sources
(rule C2), never as look-alikes; the counter has no gate and no split by right or wrong (the study's four numbers).

## Consequences

The sheet is 130-280 px instead of 240-450 on a phone, the mix-up photos keep about twice their height and Find the X its
tiles. The line is read from record fields (`lk`, `ap`, `qt`), so a subject's later lines need no code (rule S1). Until the
coral and sea-slug lines exist, their line is the first ID tip. How often More is opened is counted in the pages summary
already sent (`fb`), so the next step can be chosen on numbers. Specified in ARCHITECTURE "The short feedback sheet".
