# Sheet script changes waiting for their version

A PR that changes `tools/sync/Code.gs` (a `core.js` change does too, through `tools/sync_core.py --fix`) never edits
`const VERSION`, line 1 nor `tools/sync/HISTORY.md` (rule D3, docs/rules/sheet.md). It adds **one file here**, named after
its branch (`claude/fish-score` → `claude-fish-score.md`): the history entry, one paragraph in English, what the
script now does and why, with Pierre's decision and its date, as the entries of `tools/sync/HISTORY.md` read (backticks
allowed: they are kept there). No version number in it.

The history of the versions lives in `tools/sync/HISTORY.md`, newest first, one `## v<N> (<date>)` entry per version;
line 1 of `Code.gs` only says the version and its date and points there (Pierre, 2026-11-18).

Where the PR's comments or docs name the new version, they write `vNEXT`; a new gate on the script's version
(`const X_SHEET = N;`, rule D4) takes main's `VERSION` + 1. At merge the integrator runs
`python3 tools/sheet_version.py --assign`: the next `VERSION`, the entry written at the top of HISTORY.md (only there),
line 1 set to the short form for the new version, every gate the PR adds and every bare `vNEXT` set to
it (main's gates stay as they are: a PR never changes one, it adds its own), this file removed.
`python3 tools/check_versions.py` checks it all; `main` never holds a file here but this README.
