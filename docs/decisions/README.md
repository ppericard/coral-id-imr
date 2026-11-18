# Decision records

A decision record keeps why something was decided, so the docs can say only what the code does now (rule W19, in
[docs/rules/ship.md](../rules/ship.md)). A PR that carries out a decision adds one. History of what shipped stays in git
and the PRs, never in the docs. To find what was decided about a subject, read the index below, then the record.

## Naming

`docs/decisions/YYYY-MM-DD-topic.md`: the date the decision was taken (Manila), then a short lowercase topic with
hyphens (`2026-11-18-release-branch.md`). There is no running number: the date and the topic are the identity, and a
list sorted by name is the order of the decisions. One decision per file; decisions taken together in one PR (a batch of
rule wordings) may share a file, each under its own heading. A later decision that changes an earlier one gets its own
record and links to the first; the first is never rewritten, except to add a line "Changed by:" naming the newer record.
A record is added by the PR that carries the decision out, and its row is added to the index below in the same PR.

## What a record holds

Short: a page at most, in English, no real names (rule D2). The first line is the title: the topic and the decision in
one line. The second is `Date: YYYY-MM-DD. PR: #N. Rules or docs touched: ...`; the date is the file name's, and the
PR is the one that carries the decision out (the `PR` field is how the index finds it).

- **Context**: what was the situation and the question, in two or three sentences.
- **Decision**: what was decided, with Pierre's words quoted and dated (in French where he spoke French), or the
  integrator's call marked as such (AGENTS.md "Working mode"). A choice made while building and not decided with him
  says so.
- **Consequences**: what changes in the code, the data, the rules or for the players; what it rules out; where it is
  specified now (the rule, the ARCHITECTURE or LEARNING section, the PR number).

`tests/docs.test.js` checks that every record has its date (the same as its file name's), its PR, its three sections,
links that resolve, and a row in the index.

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

A record that gathers several decisions of one PR (like the rule wordings) keeps the date and PR line and gives each
decision its own heading with its context, decision and consequences in a short paragraph.

## Index

Newest first.

| Date | Record | PR |
|---|---|---|
| 2026-11-18 | [Decisions kept from the front-end comments: Pierre's words that only the code held](2026-11-18-decisions-from-comments-3.md) | #1126 |
| 2026-11-18 | [Decisions found in the comments of tools/ and tests/](2026-11-18-decisions-from-comments-tools-tests.md) | #1127 |
| 2026-11-18 | [Decisions from the app's code comments: kept here when the comments were cleaned](2026-11-18-decisions-from-app-comments.md) | #1124 |
| 2026-11-18 | [Player groups: no "apart" setting; group changes show at once](2026-11-18-no-apart-groups.md) | #1113 |
| 2026-11-18 | [Live mode after version 1: a QR code of our own on the lobby screen](2026-11-18-live-after-v1.md) | #1114 |
| 2026-11-18 | [Sea slug achievements: the % ladder beyond 50%](2026-11-18-seaslug-achievements-high.md) | #1112 |
| 2026-11-18 | [The short feedback sheet: the verdict, one line, the rest behind More](2026-11-18-feedback-sheet.md) | #1110 |
| 2026-11-18 | [The sheet script installs from a release branch only the merge train moves](2026-11-18-release-branch.md) | #1102 |
| 2026-11-18 | [Infrastructure health: an hourly check and the numbers to watch before the free tiers run out](2026-11-18-infrastructure-health.md) | #1101 |
| 2026-11-18 | [The 2026-11-18 rule wordings](2026-11-18-rules-wordings.md) | #1086 |
| 2026-11-04 | [Fish basics: the fish twin of Coral basics, on the same engine, from the IMR fish presentation](2026-11-04-fish-basics.md) | #1108 |

Older decisions are still in LEARNING.md "Decision log", the rules' *Source* lines, ROADMAP source cells and the PRs; they
move here when the docs that hold them are cut to what the code does now (the docs restructuring of 2026-11-18,
[docs/reviews/2026-11-18-docs-audit.md](../reviews/2026-11-18-docs-audit.md) section 6).
