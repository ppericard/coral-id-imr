# The tell-apart pairs left without a line: four more written, five kept with their reason

Date: 2026-11-19. PR: #1245. Builds on [2026-11-18-tellapart-lines](2026-11-18-tellapart-lines.md) (#1119). Rules or
docs touched: C2, C5, C6; ROADMAP "The feedback sheet's decisive lines".

## Context

Study (d) of the feedback sheet, approved by Pierre on 2026-11-18 ("ok pour les 6 recommandations"), asks for a sourced
tell-apart line for every declared coral slate pair and sea-slug genus pair. After #1119, six coral pairs
(`tools/coral_apart.json` `none`) and three sea-slug pairs (`tools/seaslug_cues.json` `apartNone`) had no line. This
pass looked for a source for each of the nine.

## Decision

- **Written, sea slugs (2, both sides)**, from sources read on 2026-11-19:
  - *Chelidonura* / *Tubulophilinopsis*: the tail lobes. *Tubulophilinopsis* from its genus diagnosis (Zamora-Silva and
    Malaquias 2018, p. 40: short, rounded, symmetrical caudal lobes; a crest-like rise on the head shield);
    *Chelidonura* from the Sea Slug Forum's *Philinopsis gardineri* sheet (Rudman 1998: the genus's long, pointed
    tails) and *C. amoena*, a game species (Willan and Cattaneo-Vietti 1995, p. 11: both lobes long, the left far
    longer).
  - *Tambja* / *Tyrannodoris*: the oral tentacles and the sense slit before the rhinophores, both from the genera's
    definitions in Willan and Chang 2017 (*Tambja* p. 17, *Tyrannodoris* p. 18); the downward-pointing tentacles from the
    Sea Slug Forum's *Roboastra luteolineata* sheet (Rudman 1999), now *Tyrannodoris luteolineata*, a game species.
- **Written, corals (2)**, from the same sources as #1119 but judged again: the sides now describe the same feature on
  both genera (corallite size, and the walls for *Echinopora*), as the Coral Finder criteria in `data.json` `crit` and
  IMR slide 28 give them. *Astrea* / *Cyphastrea* and *Cyphastrea* / *Echinopora* were refused on 2026-11-18 because the
  difference was corallite size from the Coral Finder alone; *Cyphastrea* / *Turbinaria* already ships on the Coral
  Finder alone, and IMR's own *Duncanopsammia* / *Turbinaria* cue is size, so the refusal is reversed. The app's
  *Cyphastrea* photos are massive or encrusting colonies at Dauin, which the criteria fit.
- **Kept without a line, with the reason updated** (the feedback sheet shows the first ID tip):
  - *Acropora* / *Cyphastrea*: the sources disagree (the Coral Finder: an undifferentiated tip corallite; Corals of the
    World: Acropora-like axial corallites in *C. decadia*, the one *Cyphastrea* confirmed in the Philippines). Rule C5:
    a point for Pierre (`points.json` `cyphastrea-axial-corallite`), not a line.
  - *Anacropora* / *Montipora*, *Astreopora* / *Turbinaria*, *Duncanopsammia* / *Goniopora*: no source read describes
    the same feature on both sides (Corals of the World's similar-species sections were read and do not compare them).
  - *Hypselodoris* / *Thorunna*: the genus *Thorunna*'s features read are a movement (gills that wiggle as it crawls)
    and a size, neither a photo feature.

## Consequences

59 coral slate pairs: 55 with a line, 4 in `none`. 9 sea-slug genus pairs: 8 with a line, 1 in `apartNone`. Pierre
reviews the new lines in the files, as the others.
