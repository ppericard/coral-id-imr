# Decisions found in the comments of tools/ and the workflows (third pass)

Date: 2026-11-19. PR: #1160. Rules or docs touched: W19.

## Context

The comments of the scripts in `tools/` and of the workflows carried dated quotes of Pierre and the decisions they
made, beside the code they shaped. This pass of the cleanup (after `2026-11-18-decisions-from-comments-tools.md` and
`2026-11-18-decisions-from-comments-tools-tests.md`) rewrote those comments to say what the code does (rule W19:
history stays in git and the PRs). A quote whose words are found nowhere in `docs/` is kept here.

## Decision

- 2026-11-01, of the app's speed: "everything must stay very fluid, on low-end phones and on the poor connections
  common in the Philippines". Decided the speed checks over a network and CPU grid and over the field link
  (`tools/perf.js`; docs/ARCHITECTURE.md "Speed on poor connections and low-end phones" holds the paraphrase).

## Consequences

None in the code: the comments now describe the code, and this line keeps the words.
