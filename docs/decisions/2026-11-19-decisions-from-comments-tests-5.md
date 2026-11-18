# Decisions found in the comments of tests/ (fifth pass)

Date: 2026-11-19. PR: #1153. Rules or docs touched: W19.

## Context

The comments of the test files carried dated quotes of Pierre and the decisions they made, beside the checks they
shaped. This fifth pass of the cleanup (after `2026-11-18-decisions-from-comments-tests-3.md` and the passes before it)
rewrote those comments to say what each test checks (rule W19: history stays in git and the PRs). Each quote whose words
are found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided, and where it lives.

## Decision

- 2026-11-09, of the curation the app downloads: "a smaller curation file for players, built at deploy". Decided the
  players' copy `curation-play.json`, written by `tools/curplay.py` at deploy without what the app never reads
  (docs/DATA.md, docs/spec/data.md). Checked by `tests/curplay.test.js`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
