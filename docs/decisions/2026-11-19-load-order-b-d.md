# Load order: learn.js after the quiz's tier, the Lab's stylesheet with the last tier

Date: 2026-11-19. PR: #1175. Rules or docs touched: docs/spec/loading.md "Load order in tiers", docs/ARCHITECTURE.md
"Overview", docs/ROADMAP.md "Load order, further steps".

## Context

The load order sends the files in tiers so that what a player waits for never shares a slow line with the rest
(Pierre, 2026-11-02, the field station at about 86 kbit/s). Two steps were left in ROADMAP: the quiz's tier carried all
of `learn.js` (about 95 KB, 31 KB gzipped) for a few look-alike helpers, and Home's tier carried all of
`proto/lab.css` (about 83 KB, 16 KB gzipped) for a few rules My progress and the Genera page take. Both were built on
2026-11-09, never pushed, and lost; this rebuilds them from the ROADMAP row.

## Decision

Carried out as the ROADMAP row describes (Load order work, Pierre, 2026-11-02); the details are the integrator's call,
easy to correct (AGENTS.md "Working mode"), and nothing a player sees changes:

- `pairs`, `isClassic`, `mixedUp` and `photoPair` move to `model.js`, with what they need (`lsrcOf`, `ZOOM`) and the two
  helpers the quiz and My progress also read from `learn.js` (`shownGroup`, `starNote`: without them `learn.js` could
  not leave the quiz's tier). `learn.js` comes with tier 3, after the quiz's next photos; the Learn pages ask for tier 3
  (`pageTier`).
- The rules of `proto/lab.css` that the pages before tier 5 use (`.pgrid`, `.pgame` and `.gside`, `.ikn`, `.ikxtag`)
  move to the end of `app.css`, in their order; `proto/lab.css` is a bare `<link data-css="5">` in its old place, which
  `need(5)` makes a stylesheet and waits for, so the cascade and the Lab pages stay as they were. `.gside .chips` stays
  in `proto/lab.css` as well, so that in the Lab's games it still comes after `.lab .chips`.
- No stylesheet reads `data-page=lab` any more (the "full width" the row named): nothing to move there.

## Consequences

- Tier 1 (Home) is about 15 KB gzipped lighter and tier 2 (the quiz) about 30 KB; the Learn pages wait for tier 3 when
  opened before it, behind the loading bar, and the Tools wait for the Lab's stylesheet as they wait for its scripts.
- `tests/tiers.test.js` holds it: no script of the quiz's tier needs a name only a later tier declares, each page's tier
  holds the script that draws it, no rule of `proto/lab.css` matches the markup of the pages before tier 5, and the
  moved helpers keep their results; `tests/net.smoke.js` checks the order the files are asked in and the quiz with
  `learn.js` held.
- Specified in [docs/spec/loading.md › Load order in tiers](../spec/loading.md#load-order-in-tiers).
