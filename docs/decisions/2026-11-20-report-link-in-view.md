# Report a problem: a line of its own on the answer's feedback, never behind More

Date: 2026-11-20. PR: #0000. Rules or docs touched: rule U14 (docs/rules/ui.md), docs/spec/quiz.md "The feedback sheet", docs/spec/player-reports.md, docs/DESIGN.md "The short feedback sheet", ROADMAP.

## Context

The short feedback sheet (2026-11-18, `docs/decisions/2026-11-18-feedback-sheet.md`) put "⚑ Report a problem" at the end of the More panel, an integrator's call then ("one tap after the answer, still in every game"). Pierre reported from a sea slug practice quiz that it should not be hidden, and that it should work more than once on a page.

## Decision

Pierre, 2026-11-20 (Reports tab): «Report a problem doit pas être caché derrière "more"». The link moves out of the More panel to a line of its own under the decisive line, above the More / Next row: `quiz.js` `fbBody` for every subject and format, and `proto/lab.js` `labSheet` for the Lab's photo games (Same or different?, Odd one out, Matrix); the link's look and wording ("⚑ Report a problem", underlined, muted, `--fs-xs`) are the integrator's call, easy to correct. A phone's stage loses about 32 px (a 32 px tap target on a touch screen; a plain line with a mouse, because the Matrix's end sheet at 1280 x 800 has under 25 px to spare); every game keeps one screen at 360 x 640, 390 and 1280 (rule U2, measured on the corals, the fish and the sea slugs after a right and a wrong answer, light and dark).

Pierre, 2026-11-20 (Reports tab): «Report a problem doit pouvoir être utilisé plusieurs fois sur la même page». Not carried out here: the cause is in `sync.js` `reportDialog`, which disables the button for good after one report, and `sync.js` is held by an open PR (rule W27). ROADMAP "Report a problem again on the same page".

## Consequences

The More panel keeps the tips, the names, the criteria and the credits; the report link is always in view. Rule U14 says so. A test holds it (`tests/fbsheet.test.js`; `tests/pages.smoke.js` names part: in view and enabled with More closed, never inside it). The 2026-11-18 record's "behind More" call is replaced by this one; its other calls stand.
