# Decisions found in the comments of tools/ and tests/

Date: 2026-11-18. PR: the comment cleanup of `tools/` and `tests/`. Rules or docs touched: W19.

## Context

The comments of `tools/` and `tests/` carried dated quotes of Pierre and the decisions they made, beside the code they
shaped. The cleanup rewrote those comments to say what the code does now (rule W19: history stays in git and the PRs).
Each quote or decision found nowhere in `docs/` is kept here, one line each: the date, Pierre's words, what it decided,
and where it lives in the code.

## Decisions

- 2026-11-06, on #611: "a trainer who knows the Acroporidae but not the Merulinidae". Decided the `spotty` simulation
  profile (expert on some IMR lecture groups, hardly on the others), to check a rule that borrows from the global level
  on the genera the player does not know. `tools/learnprof.js` `spotty`.

## Consequences

None in the code: the comments now describe the code, and these lines keep the why.
