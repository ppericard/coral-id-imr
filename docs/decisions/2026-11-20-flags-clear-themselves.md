# A flag clears itself when its photo leaves play, and a flag on a photo that no longer exists is no task

Date: 2026-11-20. PR: #1294. Rules or docs touched: A2, S1; docs/spec/admin.md "Each subject's admin part", the admin's
`triage` help.

## Context

To do › Flagged on the site kept a flag after its photo was removed: the fish tools cleared it only from a flag's own
tile, the coral tools never, and a flag on a photo no longer in any data (an old iNaturalist id) showed as a "missing"
card to Done one at a time. The published curation holds fish flags on photos already excluded.

## Decision

Pierre, 2026-11-20 06:58 Manila: «Si je supprime une photo, pourquoi je dois encore cliquer sur Done pour évacuer le
warning? D'ailleurs, je ne comprend toujours pas bien la différence entre cliquer sur la croix ou cliquer sur Remove. ça me
gonfle qu'il y ait 2 mécanismes pas bien différenciés» (the second part, one removal mechanism, waits for his choice: his
07:00 reply refused a two-click removal).

- One predicate, `autosort.js` `flagGone` (the photo left play: hide, exclude, Not this; a subject's out, exclude, seen),
  plus "no longer in the subject's data" once read (`admin.js` `flagStale`). The list, the counts and the draft all use it.
- `saveDraft` sweeps the stale flags of the subject on screen in the same step as the click, so every tool of every page clears the flag, Undo
  brings both back, and nothing is written outside a click (A1: no automatic write of a choice; a flag is a task marker).
- Not built: an automatic Done for a report that carries a photo (Done thanks the player, a decision for Pierre).

Integrator's call, easy to correct (admin only): clearing at the next click rather than at once for a flag already stale
in the draft (it is not listed or counted meanwhile).
