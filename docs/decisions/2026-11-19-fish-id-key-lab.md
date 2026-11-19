# Fish ID Key for EventMeasure: every IMR PDF species, by key group, family and genus, in the Lab

Date: 2026-11-19. PR: #0. Rules or docs touched: S1, S2, S3, U13; docs/spec/fish.md "The Fish ID Key (Lab)" and
"A species record", docs/spec/basics.md "The Lab", ROADMAP "Fish ID Key for EventMeasure", rule W14's list of smoke parts.

## Context

The ROADMAP row "Fish ID Key for EventMeasure" (Pierre, 2026-11-03; named Fish ID Key on 2026-11-04) asked for an ID
helper for the EventMeasure annotation of the IMR survey videos, like the Coral ID Key for corals, holding every species
of the IMR reference PDF, unfiltered (those out of the game too: `fish.json` keeps them with `out`, `sec`, `pdf`).
Identify on the fish has shown "Fish ID Key, coming soon" since 2026-11-04.

## Decision

Decided with Pierre (the row, 2026-11-03 and 2026-11-04): the tool, its content (every PDF species, unfiltered), the
names (the PDF's with WoRMS beside them, rule S2), the groups (the regional key's, rule S3), the Lab until his OK (rule
U13).

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **Layout**: one page, the species under group, family and genus, with a sticky side index of families from tablet
  up (folded under the search on a phone), two columns of rows from desktop; no ranking by clues as in the Coral ID
  Key: `fish.json` holds no traits per species to rank on, and inventing them is ruled out (rule C2).
- **One search** over every name a user may know (PDF, WoRMS accepted and synonyms, common names, genus, family,
  PDF section), every typed word starting a word of them; the state (`f=`, `q=`) in the address.
- **Order**: the families' genera, then their commonness order (`fish.json`), the most often met first.
- **Rows**: a thumbnail by the game's cover rule (enlarging the species' photos with credits), the PDF name, WoRMS
  beside it when it differs, the common name, the PDF page, a link to the sheet. The one PDF species whose family has no
  record (a mullet, family in no circle) comes last under its PDF section, outside the groups, not placed in a group of
  the key by us.
- **Only the PDF's species**: the circle-3 species from other sources are not in it (the row names the PDF).
- **Wiring**: the subject is the one whose `UNITS` entry declares `emkey` (rule S1); Identify keeps "coming soon".

## Consequences

- `proto/fishkey.js` (in `LAB.files` and the service worker's Lab list), its styles in `proto/lab.css`, `app.js` `UNITS`
  `emkey`; `tests/fishkey.test.js` (the tree and the search on the real `fish.json`, the wiring, not graduated) and the
  pages smoke's `fishkey` part.
- No change to the game, the progress, the data or the sheet.
- Left for Pierre: his OK to graduate it into Identify on the fish (rule U13).
