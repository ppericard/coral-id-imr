# Fish basics: the fish twin of Coral basics, on the same engine, from the IMR fish presentation

Date: 2026-11-04. PR: the one that built it. Rules or docs touched: C1, C2, P1, P5, S1, S3, U2; docs/FISH_PATH.md "Fish basics",
docs/ARCHITECTURE.md "Lab prototypes".

## Context

Coral basics (proto/basics.js) teaches a beginner the words the ID tips use, on real photos. Pierre decided on 2026-11-04 that the
fish get the same, so a player new to reef fish, or one the "lower" card finds struggling, has somewhere to start. The IMR fish
presentation (Lecture 10) holds the content: anatomy, tail shapes, markings and the identification groups.

## Decision

- Pierre, 2026-11-04 (docs/FISH_PATH.md "Fish basics"): the content from the IMR fish presentation, its wording kept; the groups the
  regional key's (rule S3), body shape first, the dorsal fin the second screen of Fins, never the slides' photos, our own drawings and
  photos with known rights, public sources cited; a local course only as inspiration, never named; same component and format as Coral
  basics.
- The integrator's calls (easy to correct): one engine, two contents (`BASICS.add`), the page key `basics` for both subjects with the
  module of the subject on screen, a record and a done feat per subject (`SUBJECTS` `basics`), six steps (shape, groups, fins, tails,
  markings, one feature), drawings for everything taught and the families' covers for the groups, and no achievement for it yet (its
  name and tier are Pierre's).
- Where the deck's slides are pictures (tail shapes, markings), the connector returned no text: the words its text uses are drawn,
  and the two slides are to be checked against the drawings (ROADMAP "Fish basics, the rest").

## Consequences

The fish have a first Learn tab, a "0 · Fish basics" block on the families page, a Home line and an offer for "new". Its "lower"
card is ready in the words (`UNITS` `basics`) but stays off with the fish's other level-change cards (`UNITS` fish `startFb: false`,
Pierre, 2026-11-08); the engine files name no subject (rule S1). `core.js` carries the record and feat (sheet script changes file, no
behaviour change). Specified in docs/FISH_PATH.md "Fish basics" and docs/ARCHITECTURE.md "Fish basics".
