# Fish species sheets show their sexes or colour phases from the cited phase list, as a declared sheet part

Date: 2026-11-22. PR: #1434. Rules or docs touched: docs/spec/fish-sheets.md "The species sheet", docs/spec/front-end.md
(`sheetBody`)

## Context

The fish sheets study (docs/reviews/2026-11-05-fish-sheets-study.md) makes species phases first-class: each phase a
source names, with 1-2 photos (§5.1 S5, §5.2). Pierre answered its 13 questions on 2026-11-06 (§9): the photos
reference and easy first (Q3), the scientific terms the sources use (Q4), one sheet model with shared components for
corals and fish (Q12). Since then the cited phase list (`tools/fish_phases.json`, #1342) gives each species' sexes and
colour phases with sources, `fish.json` species `phs` carries the verdict and its sources (#1395), the photos are judged
for phases (#1395, #1421), and each sheet's sections are parts its subject declares (#1422). The species sheet showed
no phase.

## Decision

- **A declared species part, `phases`** (`app.js` `TREE_UNITS` `sheetParts`, after the juvenile line), drawn by
  `learn.js` `spPhases`, the same for every tree subject (rule S1): only a species whose `phs` has a source gets it.
- **It says what the list records, as the phase card does** (`quiz.js` `phaseShow`): "Males and females" or "Colour
  phases", "This species' … can look very different", then the list's sources in the card's own line (`phaseSrcs`, now
  shared). The list's sources are solid sources like IMR's (Pierre, 2026-11-20 19:28: «la parole d'IMR, c'est pas la
  vérité absolue. C'est une source solide parmi d'autres sources solides»).
- **Up to 2 photos of each judged phase** (intermediate, female, male, terminal), in the photos' order (reference and
  easy first, Q3), each captioned with the phase card's word. No phase of our own: only the phases judged on its photos.
- **`sheetBody`**: a builder that returns `null` gets no line, so every other sheet's HTML is byte for byte as before.

Integrator's call, easy to correct: the section's title, line and layout, 2 photos per phase, the phases' order.

**Left for Pierre or later, not built:** the study's per-species `phases` list (label, size, description line,
source per phase: §5.2, a data format other code would follow); a description line per phase (written content, Q7's
process); the sub-adult and juvenile verdicts in the section (the species sheet keeps its juvenile line and photos); the
rubric's finer juvenile stages (Q4 left it open); a source's own term for a phase (the judged phase is the rubric's
word: a *Halichoeres hortulanus* initial phase is judged `intermediate`).

## Consequences

- 97 species carry `phs` (89 sex, 8 colour phases only); 81 of them have judged phase photos in play on the build of
  2026-11-21. Species with male or female photos and no cited source (sharks, rays, the two IMR `dimorph` species the
  list does not flag) get no section (rule C2).
- The family sheet's "Juveniles and phases" and the phase card are unchanged.
- Specified in docs/spec/fish-sheets.md "The species sheet"; tested in tests/sheetparts.test.js.
