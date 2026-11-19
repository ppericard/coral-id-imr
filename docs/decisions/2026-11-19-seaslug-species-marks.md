# Sea slug species sheets: sourced ID marks, shown as drafts until Pierre validates them

Date: 2026-11-19. PR: #0000. Rules or docs touched: C1, C2, C3, C5, C6, S1; docs/spec/seaslugs.md, docs/spec/tools.md,
ROADMAP "More subjects".

## Context

A coverage audit found no sea slug species sheet with a sourced mark. Pierre, 2026-11-19 15:35: «Il faut sourcer tous
les … qu'on peut … Surtout si ça peut aider notre app»; at 16:02 he said the sea slugs must reach the species level
(«Il faudra l'amener au niveau des espèces»). The fish species marks had just been built the same way (#1232,
[decision](2026-11-19-fish-species-marks.md)).

## Decision

Each sea slug species gets 1 to 3 marks, seen on a photo, that tell it from the other species of its genus in the
game, written from public specialist pages and shown on its sheet as agent drafts until Pierre validates them.

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **Sources**: SEASLUG.WORLD species pages (their Description and Remarks; colours in life only, never a preserved
  specimen's) and the Sea Slug Forum fact sheets, read once each on 2026-11-19, one request every 2 s. Every mark keeps
  the page's words it rests on, checked by script against the page as read, and a page is cited only for the species
  its own title names (a fact sheet filed under an older genus counts for the species WoRMS now places elsewhere).
- **Colour pattern counts**: for most of these slugs the colour pattern is the species' mark, so most marks are
  colours and their arrangement.
- **One box**: the species sheet shows the marks in `learn.js` `marksBox`, the box of every genus and of the fish
  species, with "Draft, not yet reviewed" (rule S1); the quiz does not read them.
- **Left in `none`, with why**: a species alone in its genus in the game (nothing to tell it from); *Hypselodoris
  decorata* and *H. maculosa*, which SEASLUG.WORLD says "cannot be reliably told apart by appearance alone"; a species
  no page read describes (*Phestilla sibogae*); *Goniobranchus* sp. 5, with no published description.

## Consequences

- `tools/seaslug_species_marks.json` (format in its `about`): 166 species with marks, 40 in `none` (36 alone in their
  genus, 4 for a reason of their own). `tools/seaslug_cues.py` `species_apply` checks it (a source and its words on
  every line, no number, 80 characters, a species named only within its genus, every species in marks or none, every
  source used) and `tools/seaslug_game.py` builds it into `seaslug.json` species (`marks`, `msrc`, `mby`, `mdraft`);
  `tests/seaslug-species-marks.test.js`.
- Some species pages describe names under revision (*Hypselodoris infucata*, *Plakobranchus ocellatus*, *Hexabranchus
  sanguineus*): their marks describe the look the pages give, which is what the photos in play show; the names stay
  WoRMS's (rule C5 if Pierre wants a point).
- Left: Pierre's validation; the species as game units.
