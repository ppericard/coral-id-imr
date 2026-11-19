# Decisions found in the comments of tests/ (third pass)

Date: 2026-11-18. PR: #1131. Rules or docs touched: W19.

## Context

The comments of the test files carried dated quotes of Pierre and the decisions they made, beside the checks they
shaped. This third pass of the cleanup (after `2026-11-18-decisions-from-comments-tools-tests.md` and
`2026-11-18-decisions-from-comments-tests-2.md`) rewrote those comments to say what each test checks (rule W19: history
stays in git and the PRs). Each quote whose words are found nowhere in `docs/` is kept here, one line each: the date,
Pierre's words, what it decided, and where it lives.

## Decision

- 2026-11-05, of the machine's load: "up to about twice the cores is fine". Decided the load budget of every heavy run:
  a slot is given while the 1-minute load average is at most twice the cores (`tests/slot.js` `LOAD`; rule W24 states
  it). Checked by `tests/slot.test.js`.
- 2026-11-05 (Q49), of `tools/taxonomy.json`: "it must not weigh on the app". Decided that the reference of names is
  build time only: no app or admin file reads it and the service worker does not keep it (ROADMAP "Taxonomy
  reference"). Checked by `tests/taxonomy.test.js`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
