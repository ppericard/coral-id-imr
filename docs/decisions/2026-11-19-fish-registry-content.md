# The admin's registry reads the structure and text in force, from the published curation

Date: 2026-11-19. PR: #1161. Rules or docs touched: A1; ROADMAP "Fish admin at parity"; docs/spec/admin.md.

## Context

`reports.js` `repReg` read `fish.json` as built, so a look-alike pair, a circle or an ID tip edited in the content editor
(`core.js` `contentApply`) would not show on Pairs' starts, the Heatmap's slate or the Journey, while the app and the
sheet's replay (`admin.js` `unitRpl`) already read them.

## Decision

Integrator's call (an implementation detail, easy to correct): the registry is built from the file with `contentApply`
laid over it under the published curation (`SAVED`), not the draft: the pages show what players get, as `unitRpl` does,
and a draft edit shows once published. A Publish (`rebase`) builds it again. No gate on the sheet version: the admin
reads the curation on `main`, as `unitRpl` does. `core.js` is untouched.

## Consequences

`repReg(f, first, gm, unit, S, cur)` takes the subject and the curation; `admin.js` `unitBuild` passes `SAVED`;
`registry.raw` stays the file as read (`unitRpl` applies the curation itself). Test:
`tests/registrycontent.test.js`, with made-up edits. The curation on `main` holds no structure edit today.
