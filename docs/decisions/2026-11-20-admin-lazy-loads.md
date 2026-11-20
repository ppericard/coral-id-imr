# Admin opening on a phone: the scripts a visit to Activity does not need wait for their page

Date: 2026-11-20. PR: #1336. Rules or docs touched: A1 and A2 (unchanged); docs/spec/admin.md "What the first page waits for";
docs/ARCHITECTURE.md "Admin back-office"; ROADMAP "Admin opening on a phone, what is left". Follows
[2026-11-19-admin-opening.md](2026-11-19-admin-opening.md).

## Context

Pierre, 2026-11-19: «la page admin sur mon téléphone met de plus en plus de temps à s'ouvrir […] notamment la première
fois que je me connecte depuis un moment». After #1271 the ROADMAP row named what was left on the client: `analysis.js`,
`admin-demo.js` and the Analyses scripts (0.2 MB gzipped) fetched by every page though Activity needs none of them, the
fish auto-sort reading `fish-cand.json` (10 MB of JSON, 0.7 MB gzipped) and `fish.json` right after the first draw, and
the data files' revalidation in one call. The answer log, the largest wait left, is the sheet's and a later PR's.

## Decision

Integrator's call (an implementation detail of the admin, easy to correct; the backlog audit of 2026-11-20 marked it
decided, item 6b):
- `analysis.js`, `admin-analyses.js` and `admin-demo.js` become inert tags in `admin.html` and are fetched by `lazyLoad`
  when a page of their group is asked for (the Analyses pages; `?demo`, which boots only after its own). Inert tags, not
  a list in `admin.js`, so the version stamping, `tests/globalnames.test.js` and the order tests keep reading them from
  the page; all of them stand before `admin.js`, which may ask for a group while the page is still being parsed (a tag
  below it was not yet in the page when an Analyses address was opened straight: the smoke caught it). An Analyses address
  opened straight asks for its scripts at once, beside the data files, so it loses nothing; the Analyses pages need both
  files (a failed `analysis.js` with `admin-analyses.js` in draws nothing: the gate asks for the pair, and only the
  missing file is fetched again).
- **`admin-heatmap.js` stays a plain tag**, a cut from "the Analyses scripts": tried lazy, the smoke failed on a Journey
  ("heatLab is not defined": the file puts `heatLab`, `heatUp`… in the global scope from inside an IIFE and
  `admin-journey.js` names them), and it is 9 KB gzipped.
- **The fish auto-sort is not moved**: rule A1 has it populate the draft at each admin load, so it runs at every load,
  whatever page the admin stays on, as before this PR (once the first page is drawn and the page is idle; for an admin
  who opened on a Players page, after its suggestions are in). A first version of this PR held it back until a page past
  Players; Codex's review (P1) pointed at A1 and that was taken out. What is new is only that a Publish that comes before
  the idle time has run it (or while it runs) runs it, or waits for it, before it reads the draft (`asortDone`), so the
  proposals are in what is sent.
- **The lazy scripts load one after the other**: a file is inserted only once the one before it in its group has loaded
  (Codex, P2: with `async = false` alone, `admin-analyses.js` still ran after `analysis.js` failed, threw at its top level
  on `ANALYSIS.PRIMARY`, and the browser called it loaded, so it was cached as done and Analyses had no help until a full
  reload). A failed dependency rejects the group: the page says it could not be loaded, and the dependent is never run.
  The price is one round trip more for the second file of a group.
- **Not built: the data files' revalidation in one call.** Measured on a repeat visit with the HTTP cache on (the harness
  without Playwright's interception, which turns the cache off; one run per tree), the server answered 304 to the 10 data
  files and `admin.html` (300 bytes each on the wire), all done within 0.64 s of their start (the harness's HTTP/1.1
  connections pace them), while the answer log came at 6.1 s of the 7.8 s: the revalidations are off the critical path,
  and one call would need a manifest built at deploy (`tools/build_site.py`) for no wait gained. Left in the ROADMAP row,
  to be taken up only if a longer wait shows.

## Consequences

Measured as in the earlier record (Chromium, phone profile 390 px, CPU x4, 1.6 Mbps, 150 ms, gzip, cold, the real admin in
its token mode with GitHub and the sheet served by the harness from the demo's replies, a made-up log of 38,712 answers),
`origin/main` at a3e7310ae and this branch merged with it (main's later commits, to 15460f6ff, touch no admin file nor
`core.js`, so the figures stand), two batches of 3 runs in opposite orders (medians; the two
batches' figures). Read them as an order of magnitude, not the phone's. **They were measured with the first version of
this PR, where the fish auto-sort was held back for an admin on Players. It now runs at every load again, at idle after
the first draw, so the fish files (0.9 MB gzipped, 11 MB of JSON, about a second of main thread) are back in the "after"
column: what this PR takes off a visit to Activity is the three scripts alone, 0.14 MB gzipped and 0.44 MB decoded, off the
line and off the parse (not measured again: the harness is not in the repository). Which part of the first-content and long-task gains came from
the fish files held back, and which from the scripts, is not known.**

| Opening on Activity, cold | before | after |
|---|---|---|
| first Activity content | 16.3 s, 16.1 s | 15.2 s, 15.2 s |
| main-thread long-task time (TBT) | 4.1 s, 4.0 s | 2.9 s, 2.5 s |
| long tasks after the first content (9 s window) | 2.4 s in 5, 2.3 s in 5 | 0.7 s in 2, 0.7 s in 2 |
| fetched (gzipped, decoded), requests | 3,872 KB, 27.7 MB, 45 | 2,807 KB, 16.1 MB, 40 |
| `fish-cand.json` + `fish.json` (the first version) | 0.9 MB, 11 MB of JSON | not fetched (now fetched at idle) |
| opening straight on Analyses › Overview | 15.1 s, 15.1 s | 14.6 s, 14.4 s |
| repeat visit, cache on (one run) | 7.8 s | 7.8 s |

The first content moves little (-6%): the page still waits for the answer log, which comes at 6 s on this line. What the
lazy scripts take off a visit to Activity is 0.14 MB gzipped and 0.44 MB decoded (the table's larger figures include the
fish files, see above). A direct link to Analyses is not slower in the table (its two scripts now come one after the other:
one round trip more, not measured). On a repeat visit the scripts come from the cache either way, so nothing moves.
