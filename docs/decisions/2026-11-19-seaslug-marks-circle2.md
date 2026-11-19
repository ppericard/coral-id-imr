# Sea slug ID marks for the circle-2 genera: genus revisions and Sea Slug Forum sheets, every circle-2 genus marked

Date: 2026-11-19. PR: #1238. Rules or docs touched: tools/seaslug_cues.json, seaslug.json,
docs/reviews/2026-11-18-seaslug-cues-sources.md, docs/spec/tools.md, docs/ROADMAP.md.

## Context

Pierre, 2026-11-19 16:01: «On a fait le même travail de sourcing pour les coraux et les nudibranches?». An audit found
24 of the 78 sea slug genera with ID marks: circle 1 22 of 24, circle 2 2 of 22, circle 3 0 of 32. The ROADMAP row
"More subjects" lists the marks for circles 2 and 3 as left. This record covers the 20 circle-2 genera without marks;
circle 3 is a separate PR.

## Decision

Integrator's call (a choice made while building, easy to correct):
- **Marks of the genus, from a genus-level source**: a genus diagnosis or revision (Willan 1983 for *Favorinus*,
  Fahey & Gosliner 2004 for *Aegires*, Gosliner 1996 for *Ceratosoma*, Matsuda & Gosliner 2018 for *Glossodoris*,
  Gosliner 1989 for *Sagaminopteron*, Zamora-Silva & Malaquias 2018 for *Tubulophilinopsis*, Ardila & Valdés 2004 for
  *Armina*, Korshunova et al. 2025 for *Longibranchus*, Korshunova et al. 2017 for *Samla*), or a Sea Slug Forum page
  that says the feature of the genus (*Dolabella*, *Aplysia*, *Roboastra*, the horn of *Ceratosoma*).
- **A feature a source gives of one or two game species only** is a mark that names them ("as in *C. tenue* and
  *C. trilobatum*", "*D. boholiensis*: …"): a structural feature (a shape, a fold, a ridge, the tubercles) or the animal
  on its food or in its place. A movement a still photo cannot show is not a mark (Codex on this PR: the gill waving of
  *Thorunna* gave way to the body shape of *T. daniellae*). So *Miamira*, *Thorunna*, *Discodoris*, *Cadlinella*, *Plakobranchus*, *Bermudella*, *Diversidoris* and
  *Mexichromis* have marks that name their species. A species' colour pattern alone is never a mark.
- **No sheet of a species outside the game is used** (rule C6): the *Diversidoris aurantionodulosa* and *Armina
  semperi* sheets were read and left out.
- `none` may hold a genus of any circle; every circle-1 genus still has marks or a reason (the `about` text and
  docs/spec/tools.md say so). *Ardeadoris* and *Caloria* stay in `none`: one more search found no source.

## Consequences

Every circle-2 genus now shows sourced ID marks on its sheet and in the quiz feedback (`seaslug.json` genera `marks`,
`msrc`, `mby`); `seaslug-game.json` is unchanged. Left: *Ardeadoris* and *Caloria* in `none`, and circle 3. Seen while
reading, not built: Zamora-Silva & Malaquias 2018 (the short, rounded tail lobes of *Tubulophilinopsis*) and the Sea
Slug Forum's *Philinopsis gardineri* sheet (the long pointed tails of *Chelidonura*) could give the *Chelidonura* /
*Tubulophilinopsis* pair, now in `apartNone`, its tell-apart line.
