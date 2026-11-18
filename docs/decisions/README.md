# Decision records

A decision record keeps why something was decided, so the docs can say only what the code does now (rule W19, in
[docs/rules/ship.md](../rules/ship.md)). A PR that carries out a decision adds one. History of what shipped stays in git
and the PRs, never in the docs.

## Naming

`docs/decisions/YYYY-MM-DD-topic.md`: the date the decision was taken (Manila), then a short lowercase topic with
hyphens (`2026-11-18-model-table.md`). One decision per file; decisions taken together in one PR (a batch of rule wordings) may share a file, each under its own heading. A later decision that changes an earlier one gets its own
record and links to the first; the first is never rewritten.

## What a record holds

Short: a page at most, in English, no real names (rule D2).

- **Context**: what was the situation and the question, in two or three sentences.
- **Decision**: what was decided, with Pierre's words quoted and dated (in French where he spoke French), or the
  integrator's call marked as such (AGENTS.md "Working mode").
- **Consequences**: what changes in the code, the data, the rules or for the players; what it rules out; where it is
  specified now (the rule, the ARCHITECTURE or LEARNING section, the PR number).

## Template

```markdown
# Topic: the decision in one line

Date: YYYY-MM-DD. PR: #N. Rules or docs touched: ...

## Context

...

## Decision

... (Pierre, YYYY-MM-DD: "his words")

## Consequences

...
```
