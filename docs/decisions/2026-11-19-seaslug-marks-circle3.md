# Sea slug ID marks for circle 3: 29 of 32 genera, a line from one game species written "as X. y"

Date: 2026-11-19. PR: #1236. Rules or docs touched: tools/seaslug_cues.json, seaslug.json,
docs/reviews/2026-11-18-seaslug-cues-sources.md, docs/ROADMAP.md.

## Context

None of the 32 circle-3 sea slug genera had ID marks. The ROADMAP row "More subjects" listed them as left, and Pierre
asked whether the sea slugs had had the corals' sourcing work (2026-11-19 16:01). Most of these genera have no
diagnosis online; what the Sea Slug Forum and SEASLUG.WORLD give is often about the genus's one game species.

## Decision

Integrator's call (a choice made while building, easy to correct):
- A line comes from a statement about the genus (tier A) or about the shape, appendages, habit or food of one of the genus's
  game species (tier B), written "as *X. y*" as the circle-1 *Thecacera* and *Hypselodoris* marks are. One species'
  colour pattern alone, a feature under the animal, a count or an internal organ is never a mark. Each line's tier is in
  the [sources study, §6](../reviews/2026-11-18-seaslug-cues-sources.md#6-circle-3-2026-11-19).
- *Baeolidia*, *Taringa* and *Verconia* go to `none`: the sources read set each apart by anatomy or DNA only (rule C2).
- No iNaturalist request (rule C7: another agent ran at the same time); every species named is a game species, so
  confirmed in the Philippines (rules C6, C8).

## Consequences

29 more genera show sourced ID marks on their sheets and in the quiz feedback (`seaslug.json` genera `marks`, `msrc`,
`mby`); `seaslug-game.json` is unchanged. Left (study §5): the genus diagnoses in the papers themselves for the tier-B
genera, where they open, and the three genera in `none`.
