# Admin opening on a phone: the scripts a visit to Activity does not need, and the fish auto-sort, wait for their page

Date: 2026-11-20. PR: #1311. Rules or docs touched: A1 and A2 (unchanged); docs/spec/admin.md "What the first page waits for";
docs/ARCHITECTURE.md "Admin back-office"; ROADMAP "Admin opening on a phone, what is left". Follows
[2026-11-19-admin-opening.md](2026-11-19-admin-opening.md).

## Context

Pierre, 2026-11-19: «la page admin sur mon téléphone met de plus en plus de temps à s'ouvrir […] notamment la première
fois que je me connecte depuis un moment». After #1271 the ROADMAP row named what was left on the client: `analysis.js`,
`admin-demo.js` and the Analyses scripts (0.2 MB gzipped) fetched by every page though Activity needs none of them, the
fish auto-sort reading `fish-cand.json` (10 MB of JSON, 0.7 MB gzipped) and `fish.json` right after the first draw, and the
data files' revalidation in one call. The answer log, the largest wait left, is the sheet's and a later PR's.

## Decision

Integrator's call (an implementation detail of the admin, easy to correct; the backlog audit of 2026-11-20 marked it
decided, item 6b):
- `analysis.js`, `admin-analyses.js` and `admin-demo.js` become inert tags in `admin.html` and are fetched by `lazyLoad`
  when a page of their group is asked for (the Analyses pages; `?demo`, which boots only after its own). The heatmap
  script stays a plain tag: tried lazy, the smoke failed on a Journey ("heatLab is not defined": `admin-heatmap.js` puts
  `heatLab`, `heatUp`… in the global scope and `admin-journey.js` names them), and it is 9 KB gzipped. Inert tags, not a list in `admin.js`, so the version stamping, `tests/globalnames.test.js` and the
  order tests keep reading them from the page. An address that opens on one of these pages asks at once, beside the data
  files, so a direct link to Analyses loses nothing.
- The fish auto-sort of an admin who opened on a Players page waits for the first page that is not a Players one (the
  same line `suggest.json` already follows, `sugOwn`); opened on any other page it runs at idle as before. Its output is
  the same, a visit that stays on Players never reads `fish-cand.json`, and its Publish sends the fish proposals only after
  a page past Players has run it. Rule A1's "at each admin load" speaks of the path it writes (the draft, undoable, sent by
  Publish), which does not change.
- **Not built: the data files' revalidation in one call.** Measured on a repeat visit with the HTTP cache on (the harness
  without Playwright's interception, which turns the cache off), the 13 conditional requests (304) all answer within 0.65 s
  of their start, in parallel, while the answer log comes at 6.1 s of 7.9 s: the revalidations are off the critical path,
  and one call would need a manifest built at deploy (`tools/build_site.py`) for no wait gained. Left in the ROADMAP row, to
  be taken up only if a longer wait shows.

## Consequences

Measured as in the earlier record (Chromium, phone profile 390 px, CPU x4, 1.6 Mbps, 150 ms, gzip, cold, the real admin in
its token mode with GitHub and the sheet served by the harness from the demo's replies, a made-up log of 38,712 answers),
2 batches of 3 runs each, `origin/main` and this branch in the opposite order in the second. Read them as an order of
magnitude, not the phone's.

| Opening on Activity, cold | before | after |
|---|---|---|
| first Activity content (median of 3, both batches) | 16.2 s, 16.2 s | 15.0 s, 15.0 s |
| main-thread long-task time (TBT) | 3.8 s, 3.8 s | 2.5 s, 2.3 s |
| long tasks after the first content (9 s window) | 2.1 s in 5 | 0.7 s in 2 |
| fetched (gzipped, decoded), requests | 3,870 KB, 27.6 MB, 45 | 2,796 KB, 16.1 MB, 39 |
| `fish-cand.json` + `fish.json` | 0.9 MB, 11 MB of JSON | not fetched |

The first content moves little (-7%): the page still waits for the answer log, which comes at 6 s on this line. What the lazy
loads take off is the bytes and the main thread around it: 1.1 MB less on the line, 11.6 MB less to parse, and the
second of work right after the first draw. A repeat visit with the cache on (13 conditional requests, all 304) draws at
7.9 s, the log still the wait.
