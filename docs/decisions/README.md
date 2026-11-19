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

Newest first, the newest 40 rows only (the size stays bounded); [OLDER.md](OLDER.md) lists the rest in the same format.
Both are written by `python3 tools/decisions_index.py --fix`.

| Date | Record | PR |
|---|---|---|
| 2026-11-19 | [The admin's Taxa view: the taxa out of play and why, one page for every subject, read from what the admin holds](2026-11-19-admin-taxa-view.md) | #1169 |
| 2026-11-19 | [Every answer of Pierre's reaches its doc, and an append-only ledger of his answers](2026-11-19-answers-ledger.md) | #1188 |
| 2026-11-19 | [Auto-sort follow-up (c): the admin-only keys stay out of the players' copy, no second file](2026-11-19-autosort-followup.md) | #1183 |
| 2026-11-19 | [CI speed: the unit tests in two shards, the fish fresh players side by side](2026-11-19-ci-speed.md) | #1177 |
| 2026-11-19 | [The Coral Finder book is a source like any other, with no credit line of its own](2026-11-19-coral-finder-credit.md) | #1194 |
| 2026-11-19 | [Coral look-alike pairs: the IMR lecture's split from the Coral Finder's, into the IMR instance's layer](2026-11-19-coral-pairs-split.md) | #1170 |
| 2026-11-19 | [Decisions found in the comments of tests/ (fifth pass)](2026-11-19-decisions-from-comments-tests-5.md) | #1153 |
| 2026-11-19 | [Decisions found in the comments of tests/ (sixth pass)](2026-11-19-decisions-from-comments-tests-6.md) | #1157 |
| 2026-11-19 | [Decisions found in the comments of tools/ and the workflows (third pass)](2026-11-19-decisions-from-comments-tools.md) | #1160 |
| 2026-11-19 | [The duel achievement counts a right Again like a right duel](2026-11-19-duel-ach-again.md) | #1227 |
| 2026-11-19 | [The fish genus page's "Don't confuse with" lists sourced pairs only](2026-11-19-fish-genus-dont-confuse.md) | #1171 |
| 2026-11-19 | [The fish read their own pooled statistics in the app, merged with no further simulation](2026-11-19-fish-own-stats.md) | #1148 |
| 2026-11-19 | [Fish reference photos: one judgement, the level read from the photo](2026-11-19-fish-reference-from-photo.md) | #1045 |
| 2026-11-19 | [The admin's registry reads the structure and text in force, from the published curation](2026-11-19-fish-registry-content.md) | #1161 |
| 2026-11-19 | [Fish judging rubric: the gold set's corrections](2026-11-19-fish-rubric-gold-set.md) | #1218 |
| 2026-11-19 | [A fish photo with a look-alike near its edge plays once a crop takes it out](2026-11-19-fish-saving-crop.md) | #1223 |
| 2026-11-19 | [The fish species units are named on the admin's pages, in their genus's block on the Heatmap](2026-11-19-fish-units-named-admin.md) | #1159 |
| 2026-11-19 | [The corals' Photos › Genera tab is folded into the Tree, its photo curation one shared section for every subject](2026-11-19-genera-into-tree.md) | #1214 |
| 2026-11-19 | [Groups carry an instance's rights; one Trainers group and per-cohort trainer lists; Admin outside the groups](2026-11-19-groups-carry-rights.md) | #1190 |
| 2026-11-19 | [The Journey lists the opt-in choices of every subject beside its steps](2026-11-19-journey-optin-steps.md) | #1166 |
| 2026-11-19 | [Load order: learn.js after the quiz's tier, the Lab's stylesheet with the last tier](2026-11-19-load-order-b-d.md) | #1175 |
| 2026-11-19 | [The mimicry pairs drilled: a photo of the class makes its model's unit a trap, the pair duels on its two species](2026-11-19-mimicry-pairs-drilled.md) | #1162 |
| 2026-11-19 | [No photo twice in a few questions: the draw reads the questions planned and shown, the strong RA's shown score lags a little at 1,000 answers](2026-11-19-no-photo-twice.md) | #1093 |
| 2026-11-19 | [One answer recorder for every game: the photo quiz and the live game record through quiz.js recordAnswer](2026-11-19-one-answer-recorder.md) | #1213 |
| 2026-11-19 | [One engine, step 2: replay's features named, the one-tap question and the notices the engine's](2026-11-19-one-engine-named-fields.md) | #1226 |
| 2026-11-19 | [Rule P1 for the corals: no photo placed, ordered or weighted for who took it](2026-11-19-p1-corals-no-source-boost.md) | #1195 |
| 2026-11-19 | [Per-player exam reserve, every subject; the corals keep theirs; the photos it takes read their qualities only](2026-11-19-per-player-reserve.md) | #1099 |
| 2026-11-19 | [Pikachu: a nickname shared by Thecacera pikachu and T. pacifica, T. picta mentioned as locally so called](2026-11-19-pikachu-nickname.md) | #1190 |
| 2026-11-19 | [The privacy page: a short notice, the points the law asks for, no internal detail](2026-11-19-privacy-short.md) | #1095 |
| 2026-11-19 | [Rule 0: Pierre's day starts with his first message after 04:00](2026-11-19-rule0-first-message.md) | #1191 |
| 2026-11-19 | [The rules core: AGENTS.md cut to what every task holds, the index to docs/rules/, S1 and L6 merged](2026-11-19-rules-core.md) | #1217 |
| 2026-11-19 | [Rules, step 1: AGENTS.md loaded with CLAUDE.md; merge, never rebase or force-push; one PR per agent](2026-11-19-rules-step1.md) | #1198 |
| 2026-11-19 | [Rules tooling: a search before any question, the answers ledger checked, the decisions index generated](2026-11-19-rules-tooling.md) | #1199 |
| 2026-11-19 | [The rules core trial's harness, and a guard on agent launches: model and effort set, every launch logged](2026-11-19-rules-trial-harness.md) | #1209 |
| 2026-11-19 | [The 2026-11-19 rule wordings: one shared engine, code comments, the slow tier, L11 over LEARNING](2026-11-19-rules-wordings.md) | #1190 |
| 2026-11-19 | [Same or different?: a Lab prototype, declared pairs only, untimed, no effect on progress](2026-11-19-same-or-different-lab.md) | #1241 |
| 2026-11-19 | [Sea slug literature scan follow-up: two sourced species pairs recorded, judging hints in the rubric](2026-11-19-seaslug-literature-followup.md) | #1164 |
| 2026-11-19 | [Sea slug ID marks for the genera in `none`: two revisions the sources study did not list, Ardeadoris and Caloria left](2026-11-19-seaslug-marks-circle1.md) | #1176 |
| 2026-11-19 | [Merulina, Cyphastrea and Halomitra get ID tips from the Coral Finder, under their own heading](2026-11-19-starred-genera-tips.md) | #1242 |
| 2026-11-19 | [The fish build reports the genera a circle edit brings into circle 1 with no name root](2026-11-19-tree-tab-step.md) | #1181 |

Older decisions are still in the notebook's "Decision log"
([docs/archive/learning-notebook.md](../archive/learning-notebook.md); LEARNING.md "Decision log" points there), the
rules' *Source* lines, ROADMAP source cells and the PRs; they move here when the docs that hold them are cut to what the code does now (the docs restructuring of 2026-11-18,
[docs/reviews/2026-11-18-docs-audit.md](../reviews/2026-11-18-docs-audit.md) section 6).
