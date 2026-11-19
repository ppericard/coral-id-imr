# The fish juveniles sourced per species: a class label for the analyses and a line on the species sheet

Date: 2026-11-19. PR: #1235. Rules or docs touched: C2, C5, C6, S1; docs/spec/fish-sheets.md
"Juveniles per species"; ROADMAP "Remove the fish easy-photos bootstrap" row.

## Context

The juvenile difficulty study (2026-11-19, PR #1228) proposed four juvenile classes, Off, Finer rank, Bold and Like, and
found that sources rate few juveniles. Pierre answered Q435 «ok» (15:35): no juvenile ease cap a priori; the four
classes become a per-species label for the analyses, with no effect on the game; the players' answers will decide which
classes are hard. At 15:35 he added: «Il faut sourcer tous les juvéniles qu'on peut et qui ont des sources externes qui
les décrit ou parlent d'eux. Surtout si ça peut aider notre app». Three agents read the sources for the 369 species with
juvenile photos in the game (FishBase, Fishes of Australia, Reef Life Survey, the Australian Museum, Wikipedia and a few
others); every quote kept is found verbatim in the pages they saved (checked again on the merged file).

## Decision

- **One record per species** in `tools/fish_juveniles.json`: the class label, one plain line on the juvenile, how it
  differs from the adult, a look-alike a source names (a game species present in the Philippines, rule C6), a source's
  words on how easy it is, and the sources with their quotes (rule C2). A file of its own, not `tools/fish_source.json`
  `juv` as the study suggested: `juv` is per IMR entry and feeds the draw and the judging's caps, so a per-species label
  there would sit one key away from the game (integrator's call).
- **The class**, by the study's section 4 words, harmonised across the three agents (integrator's call, easy to correct):
  the species' own sources first, else its IMR entry's class; a class needs a source that says it. Off when a source
  says the juvenile resembles another family, an object or another animal, except where Pierre's class A or early list
  names it (the Spadefish, Novaculichthys, the Sweetlips stay Bold, as the study's section 2.2 reads them); Finer rank
  when a source says it is nearly identical to, or confused with, a congener's or a same-family juvenile, or lacks its
  genus's or species' mark; Bold only when a source calls it distinctive, easily recognised or unmistakable (a vivid
  pattern alone is described, not rated); Like when a source says it is like the adult or names only differences of
  degree or a small added mark. "Lacks its species' mark", "differences of degree" and "a small added mark" are this
  PR's readings of section 4, not its words. The entry classes map: A and early Bold, B Off, the late *Halichoeres* and *Thalassoma* Finer rank ("alike
  across species"), the late mimics Off, C Like.
- **The species sheet** shows the line under the photos, "Juvenile:" first, its sources numbered (Players see, from
  Pierre's 15:35 words). One helper with the family sheet's juvenile note (rule S1).
- **No effect on the game**: the build writes `fish.json` species `jv`; nothing in the draw, the ease or the judging
  reads it, which `tests/fishjuv.test.js` checks.
- **Every contradiction between sources** found on the way goes to `points.json` (rule C5): ten points. The wrong
  Fishes of Australia link of the Damselfish entry's juvenile note (359, *Neoglyphidodon melas*) is now 349, *Dascyllus
  trimaculatus*.

## Consequences

- 246 species have a record: 189 a class (Off 38, Finer rank 40, Bold 32, Like 79), 190 a line, 57 a line without a
  class (described, never rated); 123 species have no source found on how their juvenile looks, listed in `none`.
- The cap's removal in the judging (`tools/fish_judge.py` `cap`) is another PR.
- Whether *Halichoeres* and *Thalassoma* juveniles are Finer rank (the study's section 8 (b)) is applied here as a label
  only; the draw keeps their late list.
