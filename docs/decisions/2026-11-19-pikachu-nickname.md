# Pikachu: a nickname shared by Thecacera pikachu and T. pacifica, T. picta mentioned as locally so called

Date: 2026-11-19. PR: #1190. Rules or docs touched: none in this PR (the data follows: `points.json`
`seaslug-name-pikachu`, the sea slug species' names).

## Context

The sea slug literature scan ([the review](../reviews/2026-11-17-seaslug-literature-scan.md) §6) asked which species
owns the "Pikachu" nickname: *Thecacera pacifica* (its nickname on iNaturalist, Wikipedia and among Japanese divers) or
*T. pikachu* (described in 2026 and named after it). The follow-up record
([2026-11-19-seaslug-literature-followup.md](2026-11-19-seaslug-literature-followup.md)) left it a discrepancy for
`points.json` and a question for Pierre; it was asked again as Q417.

## Decision

Pierre answered on 2026-11-17 (as [docs/ANSWERS.md](../ANSWERS.md) records it: shared, several species), and again on
2026-11-19 at 06:50: "On en a déjà parlé. En pratique les plongeurs utilisent Pikachu pour plus qu'une seule espèce." At
06:58, on *Thecacera picta*: "ici c'est celle que les plongeurs ont tendance à appeler Pikachu. Donc il faut au moins
le mentionner, même si on indique que ce n'est pas forcément approprié."

- The nickname counts for *T. pikachu* and *T. pacifica*, neither alone.
- *T. picta* is mentioned as the one divers locally call Pikachu, with a note that the name is not necessarily
  appropriate for it.

## Consequences

The point `seaslug-name-pikachu` is answered; the species data carries the nickname as above (applied in the data PR
that follows #1190). No question about the nickname goes to Pierre again. `curation.json` is Pierre's (rule A1), so the
point's "Resolved" is his to press in the admin; the point's context says it is answered.

Applied:

- **Counting** (`tools/seaslug_source.json` `nicknames`, `tools/build_seaslugs.py`): the "pikachu" entry keeps its
  redirect (*T. pacifica*) and gains `also: ["Thecacera pikachu"]`, counted by this decision and not by the redirect;
  `build_seaslugs.py --nicknames` applies it to the recorded pages offline (there is no page cache to read them again).
  The four pages that say "Pikachu" all write *T. pacifica* in full, so the nickname added no site to it: **no star and
  no circle changes** (*T. pacifica* keeps its star and circle 1; *T. pikachu* gains 2 sites, a stars score of 0.34 and
  stays out of the stars, circle 3; *T. picta*, circle 1, is untouched). A "Pikachu" with no species written would
  belong to the genus *Thecacera*; the list counts species only and no page is in that case, so nothing counts a genus
  (a genus count would be new machinery for no page).
- **Names** (`tools/seaslug_names_src.json`): "Pikachu" was already a nickname of *T. pikachu* and *T. pacifica*;
  *T. picta* gains it, as a nickname with a note ("often called so by divers here; not necessarily appropriate"),
  shown beside the name on the sheets (`learn.js` `vernName`). Its source is Pierre's own word (rule C2: the content
  editor's words carry a source), so that source has no page (`app.js` `vernSrcs` shows its title, not a link).

## Follow-up, 2026-11-19 (14:50 Manila): T. picta as a cousin

On that note Pierre asked: «Ou alors il faut le citer comme un cousin de l'espèce appelée Pikachu?»

- *T. picta* is cited as a **cousin of the species called Pikachu**; it keeps no nickname of its own. The entry stays in
  its names (so the divers' use is recorded, with Pierre as the source), without `nick`: the sheet reads "Pikachu (a
  cousin of the species called Pikachu, T. pacifica and T. pikachu; divers here often call it so too)", where it read
  "Pikachu (nickname: often called so by divers here; not necessarily appropriate)". His 06:58 point stays: divers here
  often call it Pikachu too. The integrator's call, easy to correct (the wording is `note` in
  `tools/seaslug_names_src.json`).
- "Cousin" is accurate: WoRMS lists *T. picta* Baba, 1972 (AphiaID 527538), *T. pacifica* (Bergh, 1884) (420618) and
  *T. pikachu* Pola et al., 2026 (1883897) as accepted species of the genus *Thecacera*, Polyceridae (REST
  `AphiaRecordsByName`, read 2026-11-19; rule C2).
- `learn.js` `vernName` shows a name's note with or without `nickname`. Nothing is counted differently (*T. picta* was
  never counted).
