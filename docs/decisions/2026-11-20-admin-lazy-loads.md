# Admin opening on a phone: the scripts a visit to Activity does not need, and the fish auto-sort, wait for their page

Date: 2026-11-20. PR: #1313. Rules or docs touched: A1 and A2 (unchanged); docs/spec/admin.md "What the first page waits for";
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
- The fish auto-sort of an admin who opened on a Players page waits for the first page that is not a Players one (the
  same line `suggest.json` already follows, `sugOwn`); opened on any other page it runs at idle as before. Its output
  is the same. As a fact of behaviour: a visit that stays on Players never reads `fish-cand.json`, and its Publish sends
  the fish proposals only once a page past Players has run the auto-sort (rule A1's "at each admin load" is not edited;
  how it reads this is the integrator's).
- **Not built: the data files' revalidation in one call.** Measured on a repeat visit with the HTTP cache on (the harness
  without Playwright's interception, which turns the cache off; one run per tree), the server answered 304 to the 10 data
  files and `admin.html` (300 bytes each on the wire), all done within 0.64 s of their start (the harness's HTTP/1.1
  connections pace them), while the answer log came at 6.1 s of the 7.8 s: the revalidations are off the critical path,
  and one call would need a manifest built at deploy (`tools/build_site.py`) for no wait gained. Left in the ROADMAP row,
  to be taken up only if a longer wait shows.

## Consequences

Measured as in the earlier record (Chromium, phone profile 390 px, CPU x4, 1.6 Mbps, 150 ms, gzip, cold, the real admin in
its token mode with GitHub and the sheet served by the harness from the demo's replies, a made-up log of 38,712 answers),
`origin/main` at a3e7310ae and this branch merged with it, two batches of 3 runs in opposite orders (medians; the two
batches' figures). Read them as an order of magnitude, not the phone's.

| Opening on Activity, cold | before | after |
|---|---|---|
| first Activity content | 16.3 s, 16.1 s | 15.2 s, 15.2 s |
| main-thread long-task time (TBT) | 4.1 s, 4.0 s | 2.9 s, 2.5 s |
| long tasks after the first content (9 s window) | 2.4 s in 5, 2.3 s in 5 | 0.7 s in 2, 0.7 s in 2 |
| fetched (gzipped, decoded), requests | 3,872 KB, 27.7 MB, 45 | 2,807 KB, 16.1 MB, 40 |
| `fish-cand.json` + `fish.json` | 0.9 MB, 11 MB of JSON | not fetched |
| opening straight on Analyses › Overview | 15.1 s, 15.1 s | 14.6 s, 14.4 s |
| repeat visit, cache on (one run) | 7.8 s | 7.8 s |

The first content moves little (-6%): the page still waits for the answer log, which comes at 6 s on this line. What the
lazy loads take off is the bytes and the main thread around it: 1.1 MB less on the line, 11.6 MB less to parse, and the
second of work right after the first draw. A direct link to Analyses is not slower. On a repeat visit the scripts come from
the cache either way, so nothing moves.
