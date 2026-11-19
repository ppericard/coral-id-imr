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
| 2026-11-19 | [Auto-sort follow-up (c): the admin-only keys stay out of the players' copy, no second file](2026-11-19-autosort-followup.md) | #1183 |
| 2026-11-19 | [Every answer of Pierre's reaches its doc, and an append-only ledger of his answers](2026-11-19-answers-ledger.md) | #1188 |
| 2026-11-19 | [Coral look-alike pairs: the IMR lecture's split from the Coral Finder's, into the IMR instance's layer](2026-11-19-coral-pairs-split.md) | #1170 |
| 2026-11-19 | [The admin's Taxa view: the taxa out of play and why, one page for every subject, read from what the admin holds](2026-11-19-admin-taxa-view.md) | #1169 |
| 2026-11-19 | [The fish genus page's "Don't confuse with" lists sourced pairs only, the others later from the players' data](2026-11-19-fish-genus-dont-confuse.md) | #1171 |
| 2026-11-19 | [The Journey lists the opt-in choices of every subject beside its steps](2026-11-19-journey-optin-steps.md) | #1166 |
| 2026-11-19 | [Sea slug ID marks for the genera in `none`: two revisions the sources study did not list, Ardeadoris and Caloria left](2026-11-19-seaslug-marks-circle1.md) | #1176 |
| 2026-11-19 | [Sea slug literature scan follow-up: two sourced species pairs recorded, judging hints in the rubric](2026-11-19-seaslug-literature-followup.md) | #1164 |
| 2026-11-19 | [The admin's registry reads the structure and text in force, from the published curation](2026-11-19-fish-registry-content.md) | #1161 |
| 2026-11-19 | [Rule wordings: one shared engine (S1), code comments (W19), the slow tier (W14), L11 over LEARNING](2026-11-19-rules-wordings.md) | #1190 |
| 2026-11-19 | [The Coral Finder book is a source like any other, with no credit line of its own](2026-11-19-coral-finder-credit.md) | #1194 |
| 2026-11-19 | [Rules, step 1: AGENTS.md loaded with CLAUDE.md; merge, never rebase or force-push; one PR per agent](2026-11-19-rules-step1.md) | #1198 |
| 2026-11-19 | [No photo twice in a few questions: the draw reads the questions planned and shown, the strong RA's shown score lags a little at 1,000 answers](2026-11-19-no-photo-twice.md) | #1093 |
| 2026-11-19 | [Pikachu: a nickname shared by T. pikachu and T. pacifica, T. picta mentioned](2026-11-19-pikachu-nickname.md) | #1190 |
| 2026-11-19 | [Groups carry an instance's rights; one Trainers group, per-cohort trainer lists; Admin outside the groups](2026-11-19-groups-carry-rights.md) | #1190 |
| 2026-11-19 | [The fish species units are named on the admin's pages, in their genus's block on the Heatmap](2026-11-19-fish-units-named-admin.md) | #1159 |
| 2026-11-19 | [The fish build reports the genera a circle edit brings into circle 1 with no name root](2026-11-19-tree-tab-step.md) | #1181 |
| 2026-11-19 | [Rule 0: Pierre's day starts with his first message after 04:00](2026-11-19-rule0-first-message.md) | #1191 |
| 2026-11-19 | [CI speed: the unit tests in two shards, the fish fresh players side by side](2026-11-19-ci-speed.md) | #1177 |
| 2026-11-19 | [The mimicry pairs drilled: a photo of the class makes its model's unit a trap, the pair duels on its two species](2026-11-19-mimicry-pairs-drilled.md) | #1162 |
| 2026-11-19 | [Decisions found in the comments of tools/ and the workflows (third pass)](2026-11-19-decisions-from-comments-tools.md) | #1160 |
| 2026-11-19 | [The fish read their own pooled statistics in the app, merged with no further simulation](2026-11-19-fish-own-stats.md) | #1148 |
| 2026-11-19 | [Decisions found in the comments of tests/ (sixth pass)](2026-11-19-decisions-from-comments-tests-6.md) | #1157 |
| 2026-11-19 | [Decisions found in the comments of tests/ (fifth pass)](2026-11-19-decisions-from-comments-tests-5.md) | #1153 |
| 2026-11-19 | [Load order: learn.js after the quiz's tier, the Lab's stylesheet with the last tier](2026-11-19-load-order-b-d.md) | #1175 |
| 2026-11-18 | [Decisions kept from code comments: Pierre's words that were only in core.js and Code.gs](2026-11-18-decisions-from-code-comments.md) | #1121 |
| 2026-11-18 | [The coral calibration set: 50 photos drawn a little more often until each has 20 answers](2026-11-18-coral-calibration-set.md) | #1130 |
| 2026-11-18 | [Architecture steps 3 and 4: the tree engine named tree*, the flat subject a capability; the core.js split waits](2026-11-18-architecture-steps-3-4.md) | #1146 |
| 2026-11-18 | [The mimicry class: look-alike species come in once their model is met, with a card](2026-11-18-variant-classes.md) | #1133 |
| 2026-11-18 | [Decisions found in the comments of the tools/ scripts](2026-11-18-decisions-from-comments-tools.md) | #1142 |
| 2026-11-18 | [ARCHITECTURE as a map: each part's spec in docs/spec/, its cited names kept as stubs](2026-11-18-architecture-as-a-map.md) | #1134 |
| 2026-11-18 | [Decisions from the admin's code comments: kept here when the comments were cleaned](2026-11-18-decisions-from-admin-comments.md) | #1132 |
| 2026-11-18 | [Decisions found in the comments of tests/ (third pass)](2026-11-18-decisions-from-comments-tests-3.md) | #1131 |
| 2026-11-18 | [Decisions found in the comments of tests/ (second pass)](2026-11-18-decisions-from-comments-tests-2.md) | #1128 |
| 2026-11-18 | [The coral and sea-slug pairs' tell-apart lines: ours, in `ap` / `apsrc`, never in IMR's `lk`](2026-11-18-tellapart-lines.md) | #1119 |
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

Older decisions are still in the notebook's "Decision log"
([docs/archive/learning-notebook.md](../archive/learning-notebook.md); LEARNING.md "Decision log" points there), the
rules' *Source* lines, ROADMAP source cells and the PRs; they move here when the docs that hold them are cut to what the code does now (the docs restructuring of 2026-11-18,
[docs/reviews/2026-11-18-docs-audit.md](../reviews/2026-11-18-docs-audit.md) section 6).
