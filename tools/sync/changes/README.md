# Sheet script changes waiting for their version

A PR that changes `tools/sync/Code.gs` (a `core.js` change does too, through `tools/sync_core.py --fix`) never edits
`const VERSION` nor the header's history line (rule D3, docs/rules/sheet.md). It adds **one file here**, named after
its branch (`claude/fish-score` → `claude-fish-score.md`): the history entry, one paragraph in English, what the
script now does and why, with Pierre's decision and its date, as the header's entries read (backticks allowed, they
are kept in ARCHITECTURE.md's version history and dropped from the header). No version number in it.

Where the PR's comments or docs name the new version, they write `vNEXT`; a new gate on the script's version
(`const X_SHEET = N;`, rule D4) takes main's `VERSION` + 1. At merge the integrator runs
`python3 tools/sheet_version.py --assign`: the next `VERSION`, the entry folded into the header line and ARCHITECTURE.md,
every gate the PR adds or changes and every bare `vNEXT` set to it, this file removed. `python3 tools/check_versions.py` checks it all;
`main` never holds a file here but this README.
