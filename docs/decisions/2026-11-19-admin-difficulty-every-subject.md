# Photo stats › Difficulty for the fish: one page for every subject with ratings of its own

Date: 2026-11-19. PR: #1270. Rules or docs touched: S1, A4, D4; docs/spec/admin-photos.md "Difficulty", docs/spec/admin.md;
ROADMAP "Fish admin at parity with the corals".

## Context

The corals' Photo stats › Difficulty (recognised by N%, the genus lanes, the photos far harder than their genus) had no fish
twin: the sheet rated the corals' photos only. It serves the fish's own ratings since v189 (`?stats=1&s=fish`: 2,221 photos,
114 with 3 answers or more on 2026-11-19, none with 10) and the sea slugs' since v167 (served, still empty).

## Decision

- Pierre, 2026-11-08: "fish admin at parity" (ROADMAP "Fish admin at parity with the corals"). The page is built in shared code
  (rule S1), not as a fish copy: one renderer `diffHtml`, fed by each subject's numbers in one shape (`diffMain` the corals',
  `diffOwn` a subject with `SUBJECTS` `stats`, as `pstatsHtml` is fed by two adapters).
- Integrator's calls, each easy to correct (an admin page Pierre alone reads):
  - the page is every subject's (`EVERY`), the fish's and the sea slugs' from their own ratings, so `core.js` `SUBJECTS`
    `admin` `pages` and the sheet script's copy of `core.js` stay as they are;
  - a row is the photo's family (the sea slugs': its genus); a photo is rated at the rank each question asked, so the page
    swaps the offsets to the unit of its row, as the app does, and far harder than their unit reads each photo against the
    offset it carries (the gap is the same either way);
  - a photo the answers logged under both its game id and its candidate id (63 of 2,221) is one photo, its ratings merged;
  - a subject with one view has no Views card and no legend; a fish card by circle or phase beside the families waits in
    ROADMAP.

## Consequences

- The corals' page is unchanged: same numbers, same words. No `core.js` or `Code.gs` change, so no sheet version.
- An older script (a reply that does not name the subject) gives "needs v189" on the fish side, never the corals' numbers
  under the fish's name (rule D4).
- The one-engine ratchet (`tests/subject-neutral-admin.test.js`) holds: no proxy added, no subject-named function.
