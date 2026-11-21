# core.js split into parts: core/*.js joined by tools/sync_core.py into the core.js the pages load, byte for byte

Date: 2026-11-22. PR: #1452. Rules or docs touched: ARCHITECTURE "Front end" and "Progress sync", spec/loading.md
"Load order in tiers", spec/site.md "A static site", `tools/sync_core.py`, `tools/sheet_version.py`, `.gitattributes`,
`.prettierignore`.

## Context

Step 4 of the architecture review's migration path ([review](../reviews/2026-11-18-architecture-code-review.md), R6):
`core.js`, one function of about 7,700 lines and 368 exports, split into `core/*.js`, "first as plain scripts
concatenated in this order by `tools/sync_core.py`, into `core.js` for the browser and into `Code.gs`". It waited for the
two `core.js` comment passes ([2026-11-18-architecture-steps-3-4.md](2026-11-18-architecture-steps-3-4.md) (c)): both
have merged (#1121, #1449), so step 4 starts. Adopted under Q406 (REE-29); integrator's calls, no behaviour change.

## Decision

Integrator's calls (an implementation detail, easy to correct):

- **The parts are the source, `core.js` is built and committed.** `core/*.js` are slices of the one function's body, in
  the order `tools/sync_core.py` `PARTS` gives; the function's first three lines and its last live in the tool (`OPEN`,
  `CLOSE`), so each part parses on its own. `core.js` is the parts joined inside them, byte for byte, and Code.gs embeds
  `core.js` as before. `--check` (CI, the fast tier) refuses a `core.js` that is not its parts joined, a file of `core/`
  outside `PARTS`, and a part whose first line is not unique in `core.js`; `--fix` writes `core.js` from the parts, or
  carries an edit made in `core.js` back into its part (cut at each part's first line); `--where N` names the part
  holding `core.js` line N. `tools/sheet_version.py --assign` writes a gate in its part, then `core.js` and the embed.
- **The pages keep loading `core.js`, not one script per part.** Measured on today's `core.js` with the deploy's pinned
  terser and gzip -9: one file is 143.0 KB minified, 53.1 KB gzipped, one request; cut into 15 scripts, each minified
  alone, at least 59.1 KB gzipped (+6.0 KB, +11%, before the wrappers and the names each part would hand the next) and
  14 more requests in tier 1, on `index.html` and `admin.html` and in `sw.js` `SHELL`; on the field link of
  [spec/loading.md](../spec/loading.md) (about 86 kbit/s) that is over half a second more before Home. Separate scripts
  would also need each part to become a module of its own (the names it shares with the others passed explicitly), so
  the moved code would change. With the built file, the pages, the service worker, the deploy's stamps and minifying, and
  the about 200 tools and tests that load or read `core.js` by its path are unchanged, and so is every byte the browsers
  and the sheet run.
- **The first part**: `core/keys.js`, the app's name (`ORG`) and the storage keys (prefixes, the names before the rename,
  their migration); `core/rest.js` holds the rest until the next parts (R6's list: subjects, rights, tree, content,
  merge, elo, achievements, score, typing, rules, replay, routes, pages, pulse), each in a PR of its own, then the exports.
- `core/` is left out of the published site (`.gitattributes` export-ignore) and of Prettier (formatted through
  `core.js`); `core.js` is marked generated (collapsed in GitHub diffs).

## Consequences

- No player sees a change, and nothing the sheet runs changes: `core.js` and `Code.gs` are byte-identical to `main`, so
  no sheet version and no changes file (`tools/sheet_version.py` refuses one without a `Code.gs` change).
- A change to the engine is written in its part (`core/*.js`), then `python3 tools/sync_core.py --fix`, as before for
  `Code.gs`; `core/` is the same sensitive lane as `core.js` (rule W27).
- Tests: `tests/coreparts.test.js` (the join, each part parsing alone, `--fix` both ways, `--where`, `--check`'s
  refusals), `tests/sheetversion.test.js` (a gate assigned in its part).
