# Sea slug ID marks for the genera in `none`: two revisions the sources study did not list, Ardeadoris and Caloria left

Date: 2026-11-19. PR: #1176. Rules or docs touched: tools/seaslug_cues.json, tests/seaslug-cues.test.js,
docs/reviews/2026-11-18-seaslug-cues-sources.md, docs/ROADMAP.md.

## Context

Seven sea slug genera had no ID marks (`tools/seaslug_cues.json` `none`): six of circle 1 and *Phyllidiopsis*. The
[sources study](../reviews/2026-11-18-seaslug-cues-sources.md) accepts original descriptions, revisions, field guides and
recognised databases, and its §5 named the papers to read next. Two papers not on its list each held a genus's visible
features, one of them with no DOI, while the cues test accepted only DOI links for papers.

## Decision

Integrator's call (a choice made while building, easy to correct):
- **Donohoo et al. 2023** (the *Halgerda* revision, *Marine Biodiversity* 53, read from its accepted manuscript on the
  NSF Public Access Repository) gives *Halgerda*'s marks. **Gosliner 1995** (the *Thuridilla* revision, which the study
  named) gives *Thuridilla*'s and *Elysia*'s. It has no DOI and is cited by its BioStor scan on the Internet Archive,
  the copy that was read; `tests/seaslug-cues.test.js` accepts `archive.org/details/biostor-N` for such a paper.
- *Coryphellina* (Korshunova et al. 2017's genus diagnosis) and *Phyllidiopsis* (Brunckhorst 1993's genus account and
  Table 6) get marks from sources already cited.
- *Ardeadoris* and *Caloria* stay in `none`. No source read gives a feature of either genus seen on a photo (Rudman
  1984 behind a paywall; *Caloria indica*'s genus unsettled), and a mark is never guessed (rule C2).

## Consequences

Five more genera show sourced ID marks on their sheets and in the quiz feedback (`seaslug.json` genera `marks`, `msrc`,
`mby`); `seaslug-game.json` is unchanged. Left for later (the sources study's §5): *Ardeadoris* and *Caloria*;
*Caloria indica*'s genus as a `points.json` nomenclature point. (The *Phyllidiella* / *Phyllidiopsis* tell-apart line,
which Brunckhorst's Table 6 sources, landed meanwhile in #1179.)
