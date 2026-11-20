# A subject with no ID key built shows no Identify door and no Identify tab

Date: 2026-11-20. PR: #1340. Rules or docs touched: S1, U12, docs/spec/subjects.md "Identify per subject", docs/spec/seaslugs.md, docs/spec/front-end.md "Home", DESIGN.md "Subject switch", ROADMAP rows "Fish ID Key for EventMeasure" and "More subjects".

## Context

The new-RA phone review of 2026-11-20 found that Home's Identify door, and the Identify tab, of the fish and the sea slugs open a page that says "Coming soon" or "Not yet" (finding 3). A player who came to name an animal meets a page that is not there.

## Decision

- **Sea slugs: hidden.** No word of Pierre's fixes the sea slugs' Identify door (the 2026-11-15 study lists "no identification-group key yet" among what is not built; the door's "Not yet" page was written with the subject, #987). Integrator's call, easy to correct: `UNITS.seaslug` declares no `identify`. A subject with no key declares none, in that one place (rule S1): `app.js` `keyOf` reads it (`''` for none), Home draws the Learn door alone (`home.js`, `.hdoors.one` in `home.css`), `showSubj` hides `[data-tab=identify]`, and an Identify address opens the subject's Home (`subjPage`). The sea slugs' tour step on the doors says only what Learn & practise is. Rule U12 stands: Home is at most the two doors, and a subject with one key-less door shows the one.
- **Fish: unchanged.** Pierre decided "Fish ID Key, coming soon" in fish mode (2026-11-04, the fish UX study; ROADMAP "Fish ID Key for EventMeasure": «coming soon» stays until his OK to graduate the built Lab key, rule U13). His words fix it, so it stays; the options (graduate the key, hide the door the way the sea slugs' is, keep) wait for him in that ROADMAP row.

## Consequences

- Giving a subject a key later is one line in `UNITS` (`identify`), and the door and tab come back.
- `core.js` is untouched: `routeIn` still needs a name for an Identify address, so `app.js` hands it the corals' `idkey` for a subject with no key, and `subjPage` sends that address to the subject's Home.
- `tests/doors.test.js` (Home with no key: one door, no Identify word), `tests/seaslug.smoke.js` (no door, no tab, the address opens Home).
