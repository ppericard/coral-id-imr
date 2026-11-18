# Fish basics: the fish twin of Coral basics, on the same engine, from the IMR fish presentation

Date: 2026-11-04. PR: #1108. Rules or docs touched: C1, C2, P1, P5, S1, S3, U2; docs/FISH_PATH.md "Fish basics",
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
- Choices made while building, for Pierre's eye (listed in the PR, not decided with him): one engine, two contents
  (`BASICS.add`), the page key `basics` for both subjects with the module of the subject on screen, a record and a done feat per
  subject, six steps (shape, groups, fins, tails, markings, one feature), seven body-shape silhouettes named from the presentation's
  groups by shape, drawings for everything taught and the families' covers for the groups, and no achievement for it yet (its name
  and tier are his).
- Where the deck's slides are pictures (tail shapes, markings), the connector returned no text: the words its text uses are drawn.
  Checked on 2026-11-18 once Pierre converted the decks to Google Slides (Lecture 10, light version, slides 5 and 6): the tails
  slide ("Tails of fishes", Koaw.org) shows pointed, rounded, truncate (square), emarginate (notched), forked, deeply forked and
  lunate; the markings slide shows stripes, bar, blotches, saddle blotch, band, spots, dots and maxillary streak. The six tails
  and six markings taught are all in the deck: "heart-shaped" is the deck's own word for *Dascyllus* (slide 8), the eye band
  and the false eye are in its text. The seven body shapes are the deck's groups by shape (its other groups, "swim with
  pectoral fins" and "reddish / big eyes", are not shapes). Step 6 ("one feature to look for") is kept; dropping it is a
  one-line change if Pierre prefers.

## Consequences

The fish have a first Learn tab, a "0 · Fish basics" block on the families page, a Home line and an offer for "new". Its "lower"
card is ready in the words (`UNITS` `basics`) but stays off with the fish's other level-change cards (`UNITS` fish `startFb: false`,
Pierre, 2026-11-08); the engine files name no subject (rule S1). `core.js` carries the record and feat (sheet script changes file, no
behaviour change). Specified in docs/FISH_PATH.md "Fish basics" and docs/ARCHITECTURE.md "Fish basics".
