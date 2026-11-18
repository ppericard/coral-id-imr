# Every answer of Pierre's reaches its doc, and an append-only ledger of his answers

Date: 2026-11-19 (Manila). PR: #1188. Rules or docs touched: AGENTS.md "Working mode", `docs/ANSWERS.md` (new),
README's documentation map.

## Context

Pierre's answers were recorded in `docs/STATUS.md`, which the integrator overwrites at every handover and keeps to about
100 lines. Answers written only there left it at a later handover without ever reaching ROADMAP, the rules or the
studies, so the living docs still showed them as open and a new integrator asked them again: on 2026-11-19 the domain
rename (answered 2026-11-18: "Not now"), the "Pikachu" nickname (answered 2026-11-17: shared, several species) and the
corals' source weight (rule P1, 2026-11-18).

## Decision

Each answer of Pierre's is applied to the document it changes (a ROADMAP row, a rule, a study, a decision record) in the
PR that records it, and added to the append-only ledger `docs/ANSWERS.md`; STATUS only cites it. Before any question,
the integrator searches the ledger, the rules and the decision records; an answer found there is applied, never asked
again. Pierre's OK, 2026-11-19 07:05 Manila, on the wording proposed in the chat.

Integrator's calls, easy to correct: the ledger lives at `docs/ANSWERS.md` (the chat said `docs/decisions/answers.md`;
files in `docs/decisions/` are dated records with their own budget and checks); it starts with the answers of
2026-11-19, and the earlier ones are gathered by the same day's pass over STATUS's history, the PRs' Decisions
sections, the records and the rules' *Source* lines.

## Consequences

The ledger only grows (its size budget in `tests/docs.test.js` says so). A PR that records an answer touches the ledger
and the doc the answer changes; STATUS's "Questions for Pierre" keeps only open questions.
