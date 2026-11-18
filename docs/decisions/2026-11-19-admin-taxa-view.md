# The admin's Taxa view: the taxa out of play and why, one page for every subject, read from what the admin holds

Date: 2026-11-19. PR: #PR_NUM. Rules or docs touched: A3, A4, A5; docs/spec/admin.md, docs/spec/admin-photos.md "Taxa";
ROADMAP "Admin for every subject" row 12.

## Context

Row 12 of the admin plan (Photo stats, Taxa, Players columns) left one piece: a read-only view of the species and taxa
that are out of the game, and why. The reasons already exist as data (`out` in `fish.json`, the circles, the photos in
play), spread over pages that each show one slice.

## Decision

Integrator's call, easy to change, no choice that is costly to undo:

- **Where**: Photos › Photo stats › **Taxa** (`#photos/stats/taxa`), a third view of an existing tab (rule A3: no new tab,
  no new group; Photo stats is where the plan put it). One page for every subject (rule A4), listed in `EVERY` of
  `admin.js`, so `core.js` `SUBJECTS` `admin` `pages` is untouched (it waits for #1121); the code is `admin-taxa.js`, as the
  heatmap's and the journey's.
- **What it lists**: for the tree subjects, species with an `out` (each reason, one per part of "a; b"), species whose
  family has no circle in the draft, species in the game with no photo in play, and species under their target; for the
  corals, the Key-only genera and game genera with no photo in play. Under target is listed because the task named it,
  with the words "it still plays"; the chips keep it apart from what is out.
- **Every reason is a recorded field**: a known `out` text maps to its words, an unknown one is shown as written, and
  a taxon no field explains says "Reason not recorded". Nothing is inferred from a name or a count (rule A5 in spirit:
  the page says what it can conclude).
- **"Not confirmed"**, not "not in": `out` "not confirmed in the Philippines" and "not confirmed near Dauin" record that
  the presence rule (C8) found no confirmation; the page keeps the claim as small as the data.
- **Not listed, and why**: "waiting for the species level" has no field in any file (the sea slugs' genus-level photos
  are photos of a genus in play); a species the build dropped altogether is not in `fish.json`; coral species are photo
  labels, never curated, so only genera are listed.

## Consequences

- The corals' list is 21 Key-only genera on the demo, the fish's 22 taxa, the sea slugs' none, counted from the files by
  `tests/admin.smoke.js`, not fixed there.
- A new reason a build writes into `out` shows up as "Out as recorded" with its text until someone names it in
  `admin-taxa.js` `TAXA_WHY`.
- The page reads `fishCov` and `fuCircle`, the same as Coverage's Games and the Tree, so its numbers agree with them.
