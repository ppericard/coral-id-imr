# The fish genus page's "Don't confuse with" also lists the sibling genera that have only our marks

Date: 2026-11-19. PR: #1171. Rules or docs touched: C1, C2; docs/spec/fish-sheets.md "The genus page"; ROADMAP "Fish genera need a presentation and ID cues before they open widely".

## Context

The fish genus page listed, under "Don't confuse with", the sibling genera IMR gives cues for and the look-alikes a source
names or players mix up. The ROADMAP row (Pierre, 2026-11-08) left "cards for sibling genera that have only our marks"
not built, though 154 genera now have marks of our own, sourced in `tools/fish_genus_marks.json`.

## Decision

Built as the row says; the choices made while building are the integrator's calls (AGENTS.md "Working mode"), none
decided with Pierre, each easy to correct:

- **Which pairs**: the sibling genera of the same family (the tree's genus pairs) that have our marks and no IMR cues, a
  card each with its marks and the sources they rest on, labelled "ID marks", never as IMR's (rules C1, C2). No pair is
  invented: a genus whose siblings have neither cues nor marks shows no section.
- **Order and volume**: IMR-cue siblings first, then the marks-only ones, most species first; the first four at once, the
  others of the family behind "More" (a wrasse genus has 23 siblings).
- **Where**: the genus page only; the species or family sheet that a genus without a page of its own opens shows its
  look-alikes as before, not its siblings.
- **Sea slugs**: unchanged (`sibMarks: false` in their sheet words, rule S1: no subject named in the engine).
- **Not built**: the species mimicry pairs M1-M7 as genus cards (species-level claims, kept off whole ranks by #1162).

## Consequences

- 92 of the 99 fish genus pages show the section (828 cards); Lutjanus, Diagramma, Caesio, Pterocaesio, Parupeneus,
  Mulloidichthys and Cheilodipterus show none.
- Specified in docs/spec/fish-sheets.md "The genus page" (`learn.js` `treeGenusSibs`); tested in
  `tests/fishsheets.test.js` and the fish smoke.
