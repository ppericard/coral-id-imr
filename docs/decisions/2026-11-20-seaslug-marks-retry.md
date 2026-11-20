# Sea slug ID marks: Caloria and Taringa from a game species' own description, Ardeadoris and Verconia left

Date: 2026-11-20. PR: #1325. Rules or docs touched: tools/seaslug_cues.json, seaslug.json, points.json,
docs/reviews/2026-11-18-seaslug-cues-sources.md, docs/ROADMAP.md.

## Context

Four sea slug genera had no ID marks, each with a reason in `tools/seaslug_cues.json` `none`: *Ardeadoris* and
*Caloria* (circle 1), *Taringa* and *Verconia* (circle 3). The ROADMAP row "More subjects" listed them as left. A wider
search (regional guides, the Sea Slug Forum, publishers, WoRMS, papers, iNaturalist) looked again.

## Decision

Integrator's call, on the decided process of the circle-3 marks ([record](2026-11-19-seaslug-marks-circle3.md)): a line
from the shape, appendages or texture of one of the genus's game species (tier B), written "as *X. y*".
- *Taringa*: two tier-B marks from Gosliner and Behrens 1998, the description of *T. halgerda* from Batangas (its
  low, flat tubercles with short papillae; the largest, mid-back, club-shaped).
- *Caloria*: two tier-B marks from the CIESM Atlas's description of *C. indica* (long tapering oral tentacles, longer
  than the rhinophores; smooth rhinophores and a long pointed tail).
- *Ardeadoris* and *Verconia* stay in `none`: no source read gives a feature of the genus or a non-colour feature of a
  game species that is not shared (the wavy mantle edge is *Glossodoris*'s mark; the colour patterns span genera).
- Both species' genus is held as uncertain by some sources (the Sea Slug Forum for *C. indica*, the authors themselves
  for *T. halgerda*) while WoRMS accepts it: a point, `seaslug-genus-caloria-taringa` (rule C5), not settled here.

## Consequences

*Caloria* and *Taringa* show sourced marks on their sheets and in the quiz feedback (`seaslug.json` genera `marks`,
`msrc`, `mby`); `seaslug-game.json` is unchanged. Circle 1 has marks on 23 of 24 genera, circle 3 on 31 of 32. Left:
*Ardeadoris* and *Verconia* (Rudman 1984 and Rudman 1986's colour-group reviews, behind a paywall, and the 2018 field
guide, not online, would be the places to look).
