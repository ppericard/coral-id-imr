# Fish species sheets: sourced adult ID marks, shown as drafts until Pierre validates them

Date: 2026-11-19. PR: #1232. Rules or docs touched: C1, C2, C3, C5, C6, S1; docs/spec/fish-sheets.md "The species
sheet", ROADMAP "Fish sheets at three levels".

## Context

The ROADMAP row "Fish sheets at three levels" (Pierre, 2026-11-05; 13 questions answered 2026-11-06) left "the genus
and species marks" and "the writing (agent drafts marked as drafts until Pierre validates, families first, then
genera, then species)". The family and genus marks were done. On 2026-11-19 15:37, after the juveniles were sent for
sourcing, Pierre asked: «Est-ce qu'on a seulement fait le même travail pour les adultes?». Three research agents then
sourced the adult species marks from FishBase, Fishes of Australia and Reef Life Survey, each quote checked against
the page as read.

## Decision

The species marks go in as the row says: agent drafts, shown and labelled as drafts until Pierre validates them.

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **One box for every level**: the species sheet shows its marks in the genus marks' box (`learn.js` `marksBox`),
  under its genus's, with each line's source numbers (rule S1).
- **The label**: "Draft, not yet reviewed" beside the heading while the data says draft (`fish.json` `mdraft`, from
  the source file's `draft`); validating them later is a one-field change.
- **Kept, not shown yet**: the look-alikes a source names and a source's words on how easy each species is to tell,
  in `tools/fish_species_marks.json`; look-alikes only of species confirmed in the Philippines (rule C6).
- **Left without marks** when the only mark found would contradict IMR (rule C1: a single tail plate on a unicornfish
  against IMR's two scalpels), described another species, rested on a tertiary source, was a juvenile's, or told the
  species only from one outside the game; each says why in `none`, and the disagreements are points for Pierre in
  `points.json` (rule C5).

## Consequences

- Each game species has 1 to 3 adult marks telling it from its genus's other game species, or a reason in `none`
  (`tools/fish_species_marks.json`, format in its `about`, each mark with the page's words it rests on); `add_families`
  builds them into `fish.json` species (`marks`, `msrc`, `mby`, `mdraft`; `--spmarks`: tests); `learn.js` `marksBox`,
  the genus marks' box, shows them with "Draft, not yet reviewed" while `mdraft`.
- `tools/build_fish.py` `species_marks` checks every line (a source and its words, no number, 80 characters, only
  game species of its genus named) and that every game species has marks or a reason; `tests/speciesmarks.test.js`.
- Six new points in `points.json` (names, sources, a trainer question), none settled.
- Left: Pierre's validation; showing the look-alikes; the species with no adult mark found yet.
