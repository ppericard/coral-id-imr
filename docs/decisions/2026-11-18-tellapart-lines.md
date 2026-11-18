# The coral and sea-slug pairs' tell-apart lines: ours, in `ap` / `apsrc`, never in IMR's `lk`

Date: 2026-11-18. PR: #1119. The short sheet that shows them: #1110; the study: #1097. Rules or docs touched: C2, C3,
C6; ARCHITECTURE "The short feedback sheet" and "Tools"; ROADMAP "The feedback sheet's decisive lines".

## Context

The short feedback sheet (#1110) shows one decisive line: after a mix-up of two units, the line that tells them apart,
"A: … · B: …", from the records' `lk` (IMR's lines, labelled "IMR") or `ap` (ours, with their sources). The fish had
such lines; the corals' slate pairs and the sea slugs' declared genus pairs had none, so their sheet fell back to the
shown unit's first ID tip. Pierre, 2026-11-18, about 12:08 Manila, on the feedback sheet study's question (d): "ok pour
les 6 recommandations" (write the sourced lines for the coral slate pairs and the 9 sea-slug pairs, corals first).

## Decision

- **Where they live: `ap` / `apsrc`, not `lk`.** The lines are in our words from several sources, so they take the
  fish's `apart` shape (`ap` and its sources `apsrc` on the other unit's record), which the sheet already reads with its
  sources; in `lk` they would be shown as IMR's (rules C1, C2). The ROADMAP row had said `lk`.
- **Corals**: `tools/coral_apart.json`, hand-kept, laid on `data.json` by `tools/apply_coral_apart.py` (Millepora's line
  on its `x.gen` record). Every declared slate pair (59, Millepora / Porites included) is either written (53) or listed
  in `none` with why (6: *Acropora* / *Cyphastrea*, *Anacropora* / *Montipora*, *Astrea* / *Cyphastrea*,
  *Astreopora* / *Turbinaria*, *Cyphastrea* / *Echinopora*, *Duncanopsammia* / *Goniopora*).
- **Sea slugs**: `tools/seaslug_cues.json` `apart`, laid by `tools/seaslug_cues.py` on `seaslug.json` genera, read by
  `app.js` `fishGenera` (any tree subject's genus, rule S1). Every declared genus pair (9) is written (5, three of them
  with one side) or in `apartNone` with why (4: *Chelidonura* / *Tubulophilinopsis*, *Hypselodoris* / *Thorunna*,
  *Phyllidiella* / *Phyllidiopsis*, *Tambja* / *Tyrannodoris*).
- **A one-sided line after a right answer**: the sheet's line after a right answer must say something of the unit shown,
  so `quiz.js` `fbLine` takes a look-alike among the choices only when its record holds a half on the unit shown; else
  the unit's first tip (a subject-neutral guard on #1110's chooser).
- **Short**: one side at most 64 characters (`tools/apply_coral_apart.py` `LONGEST`), so both sides and their source fit
  the phone sheet; the sea slugs keep their marks' 80.
- **What a line may say**: each side names and describes its own genus, from a source that says it of that genus; a pair
  is written only when the two sides really tell the genera apart on a photo. A side is left out rather than inferred
  (no "A has it, so B lacks it" unless a source says so). Never a line from the trait tags. The coral sources, in order:
  the IMR lecture (the genus's notes and slides as `data.json` `imr` and `sl` hold them), the Coral Finder (the genus's
  criteria as `crit` holds them, on its pages: the book itself was not reread), Corals of the World for the starred
  genera with no IMR notes (*Merulina*, *Halomitra*; read 2026-11-18). A number is allowed for the corals, since IMR's
  own deciding cue is one for *Alveopora* / *Goniopora* (12 against 24 tentacles); the sea slugs keep their marks' rule
  (no number).
- **Not done here**: *Echinopora* / *Turbinaria*, the most mixed-up coral pair in the answers, is not a declared pair (a
  declaration is a source's or Pierre's); the 25 pairs with a bonus genus; a slot to edit the lines in the admin.

For Pierre (content the IMR course stands behind, listed in the PR): every line's wording and its sources; the six coral
and four sea-slug pairs left with the first tip; the one-sided sea-slug lines; *Astrea* / *Favites*, where IMR itself
says Favites can have separate walls.

## Consequences

After a mix-up of two declared coral genera (53 pairs) or sea-slug genera (5), the sheet says what tells them apart,
with its source, instead of the first ID tip. `tests/tellapart.test.js` checks the lines against the real files through
`quiz.js` `pairText`; `tests/booktext.test.js` keeps the Coral Finder wording out of the coral lines. Pierre reviews
the lines in the files until the content editor has a slot for them (ROADMAP).
