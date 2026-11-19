# Sea slug basics: the basics module for the sea slugs, and Basics open for them

Date: 2026-11-20. PR: #1286. Rules or docs touched: S1, C1, C2, C3, C5, C6, L14, P3, U2, D3; docs/spec/basics.md, docs/spec/seaslugs.md,
ROADMAP "Every game mode for every subject", docs/reviews/2026-11-19-modes-every-subject.md (PR 5).

## Context

Basics (step 0 of the Learn path) was open for the corals and the fish and closed for the sea slugs, with the reason "no
basics module written for this subject yet" (`core.js` `SUBJECTS` `closed`; the plan's PR 5).

## Decision

Pierre, 2026-11-19 20:34 Manila (Q437, whether to open the modes only some subjects have to every subject): «évidemment
oui, il faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui, c'est du code commun.»

Built on the shared engine (`proto/basics.js`), in the fish module's format, its content the sea slugs' own
(`proto/seaslugbasics.js`). The wording, the order of the steps and the drawings are the integrator's call, easy to correct:

- **Four steps**: a dorid part by part (rhinophores, the gill circlet, Phyllidia's gills along the sides, the mantle and its
  skirt, the oral tentacles), the aeolids' cerata (and the cnidosac at their tips), the other sea slugs (the sea hares'
  parapodia, a sacoglossan's, Chelidonura's headshield, the side-gilled slugs' gill), then the groups of the Learn page
  (`seaslug.json` `taxa`, WoRMS), each with up to six of its genera's covers and a sourced line.
- **Photos**: each view is a drawing of ours with, under it, the covers of up to three genera of the game that show the
  part (the Learn tiles' photo, `app.js` `cover`, enlarging with its credit, rule P5); a genus the game does not hold drops
  out. No book or slide photo (P3).
- **Sources** (rule C2), each line naming the one it rests on, the module's own `REF`; the sources' old group names
  (Notaspidea, Anaspidea) are said as theirs, the groups' names stay WoRMS's, nothing settled (C5). The genera named are
  the game's; no species is in a cue line; the only species on screen are the four in the source lines (the titles of the
  fact sheets read), each in `tools/seaslugs.json` (C6, C8).
- **Shared code** (S1): the pieces Fish basics had alone (a drawn check, a group's view and its photo check, the covers of a
  few units) move to `proto/basics.js` `BASICS_KIT`, and Fish basics and Sea slug basics both call them.
- **Open for the sea slugs**: `SUBJECTS` `seaslug` `pages` starts with `basics`, the `closed` reason goes, its done feat is
  `_sbasics`, its record `reefid-seaslug-basics` (cleared at sign-out with the others).

### Sources read for it (rule W11)

Each read on 2026-11-20 from its own page, one request every 2 s, a generic User-Agent, public terms only.

| Source | Read | What it gave |
|---|---|---|
| Sea Slug Forum, Rudman 1999, "Rhinophore in nudibranchs" (seaslugforum.net/find/rhinonud) | [read] | a pair at the front that smell; lamellae, papillae, folds; most withdraw into a pocket, often in a raised sheath |
| Sea Slug Forum, Rudman 1999, "The nudibranch head" (headeudo) | [read] | oral tentacles beside the mouth, for touch; the mouth hidden beneath the mantle skirt |
| Sea Slug Forum, Rudman 1998, "Torsion and detorsion" (torsion) | [read] | "the dorid gill circlet"; Phyllidia's secondary gills along each side between the mantle edge and the foot; in aeolids the gill lost, cerata in its place; the notaspideans' gill on the right side |
| Sea Slug Forum, Rudman 2000, "Digestive system of a dorid nudibranch" (dorigut) | [read] | "In dorid nudibranchs, the anus is found in the centre of the gills." |
| Sea Slug Forum, Rudman 1999, "Hexabranchus sanguineus" (hexasang) | [read] | Hexabranchus's gills have no pouch to retract into, unusual among the dorids |
| Sea Slug Forum, Rudman 2001, "How sea slugs crawl" (locomotion) | [read] | most nudibranchs have a muscular foot they crawl on |
| Sea Slug Forum, Rudman 1999, "Cerata (ceras) in aeolids" (ceras) | [read] | all aeolids have them; a duct of the digestive gland inside, colour that can change with the food; a gill's function; the cnidosac at the tip of most, none in Phyllodesmium |
| Sea Slug Forum, Rudman 1998, "Aeolid cnidosac" (defcnid) | [read] | the stinging cells of the prey kept for defence |
| Sea Slug Forum, Rudman 2004, "Anaspidea" (anaspidea) | [read] | the sea hares: enrolled rhinophores, large flattened enrolled oral tentacles, large parapodial lobes, algae eaters |
| Sea Slug Forum, Rudman 1998, "Solar-powered sea slugs" (solarpow) | [read] | sacoglossans suck the cell sap of algae; some keep its chloroplasts working |
| Sea Slug Forum, Rudman 2001, "Thuridilla lineolata" (thurline) | [read] | its body and parapodia |
| Sea Slug Forum, Rudman 1998, "Chelidonura amoena" (chelamoe) | [read] | its headshield, posterior shield and parapodia folding over the back |
| Sea Slug Forum, Rudman 1999, "Pleurobranchus forskalii" (pleufors) | [read] | the gill on the right side, between the mantle and the foot, in all notaspids; "Side-gilled Slugs" |
| Wikipedia, "Nudibranch", revision 1384921128 | [read], through the API | the two main kinds, dorid and aeolid; the dorid gill plume on the rear of the body around the anus; pockets and bumps on the mantle; aeolids' cerata across the back, no mantle; head tentacles; groups not related to nudibranchs |
| Sea Slug Forum "What is a slug?", "Detorsion", "Mantle flapping in Chromodoris", "Sacoglossa - general", "Sacoglossan feeding" | [read], not used | nothing a beginner sees on a photo beyond the pages above (the mantle flapping is a movement a still photo cannot show) |
| Wikipedia, "Sacoglossa", "Cephalaspidea" | [not read] | the API refused (rate limit, a shared address); the Forum's pages were used instead |
| SEASLUG.WORLD | [not read] | no glossary or group page found on its home page |

## Consequences

- The sea slug players find Basics as the first Learn tab, the "0" block of the genera page, and a Home line ("New to sea
  slugs? Basics in 5 min") while they have answered fewer than the first-launch count and have not done it. They have no
  first-launch question, so no offer card and no "lower" card.
- No change to the scorer, the replay or any progress record: no rules version (D5). The sheet script's copy of `SUBJECTS`
  changes (`tools/sync/changes/claude-q437-slugbasics.md`, D3): `_sbasics` is kept like every feat whose id starts with `_`.
- Tests: `tests/seaslugbasics.test.js` (content, sources, lengths, the genera, wiring), `tests/fishbasics.test.js` (the kit
  shared), `tests/start.test.js` (the record cleared at sign-out), `tests/seaslug.smoke.js` part 7 (390 and 1280 px).
