# The slow test tag: eight statistical tests out of the pre-push fast tier

Date: 2026-11-19. PR: #0000. Rules or docs touched: W14, W24; tests/run.js, README "Test", CONTRIBUTING, docs/spec/deploy.md "Tests", docs/spec/sync.md "Tests".

## Context

Rule W14 says the fast tier runs `node tests/run.js` without the slow statistical tests tagged `slow` (Pierre's OK on
[Q414](2026-11-19-rules-wordings.md)), but no test carried a tag and `tests/run.js` ran every file. Agents waited in the
machine slot behind full runs, partly because of the statistical tests.

## Decision

The integrator's call (how the tag is built is not a choice for players or Pierre; the rule's wording is unchanged). A test file is
slow when its second line (after the slot guard) is `// @slow: <what it simulates>`; `tests/run.js` leaves those files out
unless given `--all`, prints which it left out, and still runs any file named on its command line. The threshold is the
time a file takes alone, measured one file at a time in the slot (233 files, 534 s of CPU in all): a statistical model
fit or a simulation that needs more than 10 s of CPU alone is tagged. Eight files qualify, 14.6 s to 37.9 s each; the next
statistical file is `analysis-ix.test.js` at 6.7 s. Four other files pass 10 s without being statistical (`fishcovers`,
`typednames`, `train`, `sheetversion`: the real data in a vm, git on throwaway repositories); the tag as Pierre approved it
is for the statistical tests, so they stay in the fast tier.

CI (`.github/workflows/checks.yml` runs `node --test --test-shard=k/2 tests/*.test.js`, never `tests/run.js`) and the
merge train (`tools/train.py` waits for the Checks and Smokes workflows on its push) run every file, tagged or not;
`tests/slot.test.js` checks that.

## Consequences

`node tests/run.js` is the fast tier, `node tests/run.js --all` the full suite. A new test that takes more than about 10 s
of CPU alone, and is a statistical fit or a simulation, carries the `// @slow` line (CONTRIBUTING).
