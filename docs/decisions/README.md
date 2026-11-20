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

Newest first, every record, written by `python3 tools/decisions_index.py --fix`.

| Date | Record | PR |
|---|---|---|
| 2026-11-20 | [Cards per subject: the one-tap question's session is the subject's, and the sea slugs' all-met card before circle 3](2026-11-20-cards-per-subject.md) | #1318 |
| 2026-11-20 | [Coral slate numbers, lecture slides and lecture ID tips: moved into the IMR instance's layer](2026-11-20-coral-slate-slides-tips-split.md) | #1309 |
| 2026-11-20 | [Find the X's own offset: a format of its own, `find`, at 0 until its subject's format offsets are read](2026-11-20-find-the-x-own-offset.md) | #1299 |
| 2026-11-20 | [The admin corrects the fish name index in a family's Names box; a species' own list waits for a format](2026-11-20-fish-names-admin.md) | #1311 |
| 2026-11-20 | [A flag clears itself when its photo leaves play, and a flag on a photo that no longer exists is no task](2026-11-20-flags-clear-themselves.md) | #1294 |
| 2026-11-20 | [The Lab tools that ask a unit run on the subject on screen: Type the genus, Blur reveal, the Look-alike web](2026-11-20-lab-tools-every-subject.md) | #1280 |
| 2026-11-20 | [A unit's card on a Learn list opens its sheet, whole: no "Open the sheet", no marks heading or sources there](2026-11-20-learn-cards-open-the-sheet.md) | #1290 |
| 2026-11-20 | [The 86 Corals of the World screenshots are replaced by their originals, on R2](2026-11-20-lecture-originals.md) | #1292 |
| 2026-11-20 | [IMR lecture photos are never drawn larger than their own pixels](2026-11-20-lecture-photos-never-upscaled.md) | #1289 |
| 2026-11-20 | [A name root that echoes another unit's ID tip shows with a warning, never held back](2026-11-20-name-root-warning.md) | #1308 |
| 2026-11-20 | [A subject with no ID key built shows no Identify door and no Identify tab](2026-11-20-no-key-no-door.md) | #1333 |
| 2026-11-20 | [One admin for every subject: the fish parity row becomes the one-engine plan](2026-11-20-one-admin-every-subject.md) | #1288 |
| 2026-11-20 | [Report a problem: a line of its own on the answer's feedback, never behind More](2026-11-20-report-link-in-view.md) | #1319 |
| 2026-11-20 | [Sea slug basics: the basics module for the sea slugs, and Basics open for them](2026-11-20-seaslug-basics.md) | #1286 |
| 2026-11-20 | [The sea slug box pass: Opus 5.5 medium, decided by a second sample, and the judging import takes the box](2026-11-20-seaslug-box-model.md) | #1295 |
| 2026-11-20 | [Find the X for the sea slugs: the shared tile code in, no tile yet (no box on any photo)](2026-11-20-slug-find-the-x.md) | #1284 |
| 2026-11-20 | [The coral pairs with a bonus or Key-only genus: 24 tell-apart lines written, one kept without](2026-11-20-tellapart-bonus-pairs.md) | #1296 |
| 2026-11-19 | [Photo stats › Difficulty for the fish: one page for every subject with ratings of its own](2026-11-19-admin-difficulty-every-subject.md) | #1270 |
| 2026-11-19 | [Admin opening on a phone: curation.json read raw and kept by sha, suggest.json no longer holds a Players page back](2026-11-19-admin-opening.md) | #1271 |
| 2026-11-19 | [The admin's Taxa view: the taxa out of play and why, one page for every subject, read from what the admin holds](2026-11-19-admin-taxa-view.md) | #1169 |
| 2026-11-19 | [Every answer of Pierre's reaches its doc, and an append-only ledger of his answers](2026-11-19-answers-ledger.md) | #1188 |
| 2026-11-19 | [What the auto-sort proposed reads the newer judgement; a photo it set aside has a route back](2026-11-19-auto-proposals-newer-judgement.md) | #1259 |
| 2026-11-19 | [Auto-sort follow-up (c): the admin-only keys stay out of the players' copy, no second file](2026-11-19-autosort-followup.md) | #1183 |
| 2026-11-19 | [The check tools stop at 40 minutes, and level 3 waits for Pierre's go on a GitHub runner](2026-11-19-check-cap.md) | #1274 |
| 2026-11-19 | [CI speed, second step: the admin 1280 smoke in three groups balanced by the measured time of each part](2026-11-19-ci-admin-split.md) | #1243 |
| 2026-11-19 | [CI speed: the unit tests in two shards, the fish fresh players side by side](2026-11-19-ci-speed.md) | #1177 |
| 2026-11-19 | [The Coral Finder book is a source like any other, with no credit line of its own](2026-11-19-coral-finder-credit.md) | #1194 |
| 2026-11-19 | [Coral look-alike pairs: the IMR lecture's split from the Coral Finder's, into the IMR instance's layer](2026-11-19-coral-pairs-split.md) | #1170 |
| 2026-11-19 | [The custom quiz for every subject: one key per subject, the groups declared in `UNITS`](2026-11-19-custom-quiz-every-subject.md) | #1277 |
| 2026-11-19 | [Decisions found in the comments of tests/ (fifth pass)](2026-11-19-decisions-from-comments-tests-5.md) | #1153 |
| 2026-11-19 | [Decisions found in the comments of tests/ (sixth pass)](2026-11-19-decisions-from-comments-tests-6.md) | #1157 |
| 2026-11-19 | [Decisions found in the comments of tools/ and the workflows (third pass)](2026-11-19-decisions-from-comments-tools.md) | #1160 |
| 2026-11-19 | [Doc size marks: a warning to check the doc, never a wall; ROADMAP keeps its open items, the decisions index is whole](2026-11-19-doc-size-marks.md) | #1255 |
| 2026-11-19 | [The duel achievement counts a right Again like a right duel](2026-11-19-duel-ach-again.md) | #1227 |
| 2026-11-19 | [Fish photos: a full-size look when the judge doubts; the juvenile re-rate's tag doubts settled](2026-11-19-fish-full-size-look.md) | #1269 |
| 2026-11-19 | [The fish genus page's "Don't confuse with" lists sourced pairs only](2026-11-19-fish-genus-dont-confuse.md) | #1171 |
| 2026-11-19 | [Fish ID Key for EventMeasure: every IMR PDF species, by key group, family and genus, in the Lab](2026-11-19-fish-id-key-lab.md) | #1258 |
| 2026-11-19 | [Juveniles (fish and sea slugs): no ease cap; the judged ease is the starting point](2026-11-19-fish-juvenile-no-cap.md) | #1237 |
| 2026-11-19 | [The fish juveniles sourced per species: a class label for the analyses and a line on the species sheet](2026-11-19-fish-juveniles-sourced.md) | #1235 |
| 2026-11-19 | [Fish name roots, circles 2-3: every genus rooted or skipped](2026-11-19-fish-name-roots.md) | #1248 |
| 2026-11-19 | [The fish read their own pooled statistics in the app, merged with no further simulation](2026-11-19-fish-own-stats.md) | #1148 |
| 2026-11-19 | [Fish reference photos: one judgement, the level read from the photo](2026-11-19-fish-reference-from-photo.md) | #1045 |
| 2026-11-19 | [The admin's registry reads the structure and text in force, from the published curation](2026-11-19-fish-registry-content.md) | #1161 |
| 2026-11-19 | [Fish judging rubric: the gold set's corrections](2026-11-19-fish-rubric-gold-set.md) | #1218 |
| 2026-11-19 | [A fish photo with a look-alike near its edge plays once a crop takes it out](2026-11-19-fish-saving-crop.md) | #1223 |
| 2026-11-19 | [Fish species sheets: sourced adult ID marks, shown as drafts until Pierre validates them](2026-11-19-fish-species-marks.md) | #1232 |
| 2026-11-19 | [The fish species units are named on the admin's pages, in their genus's block on the Heatmap](2026-11-19-fish-units-named-admin.md) | #1159 |
| 2026-11-19 | [The corals' Photos › Genera tab is folded into the Tree, its photo curation one shared section for every subject](2026-11-19-genera-into-tree.md) | #1214 |
| 2026-11-19 | [Fish genera with IMR cues: our sourced ID marks under them, as the families](2026-11-19-genus-marks-beside-imr-cues.md) | #1231 |
| 2026-11-19 | [Fish genus marks from more sources: Reef Life Survey, FishBase, Fishes of Australia, an FAO catalogue](2026-11-19-genus-marks-more-sources.md) | #1260 |
| 2026-11-19 | [Groups carry an instance's rights; one Trainers group and per-cohort trainer lists; Admin outside the groups](2026-11-19-groups-carry-rights.md) | #1190 |
| 2026-11-19 | [The Journey lists the opt-in choices of every subject beside its steps](2026-11-19-journey-optin-steps.md) | #1166 |
| 2026-11-19 | [learnsim fish profiles: species known by the IMR cheatsheet and commonness, values assumed until fitted](2026-11-19-learnsim-fish-species.md) | #1251 |
| 2026-11-19 | [Live answers on units not opened count, opening nothing; answers before a card are never its question](2026-11-19-live-locked-units.md) | #1234 |
| 2026-11-19 | [Load order: learn.js after the quiz's tier, the Lab's stylesheet with the last tier](2026-11-19-load-order-b-d.md) | #1175 |
| 2026-11-19 | [The Look-alikes deck and Compare for every subject](2026-11-19-lookalikes-compare-every-subject.md) | #1278 |
| 2026-11-19 | [Matrix: a Lab prototype, four photos and five names, two taps, a free retry, untimed, no effect on progress](2026-11-19-matrix-lab.md) | #1262 |
| 2026-11-19 | [Mimicry pairs: their marks after a mix-up, as the feedback's line](2026-11-19-mimicry-marks-feedback.md) | #1247 |
| 2026-11-19 | [The mimicry pairs drilled: a photo of the class makes its model's unit a trap, the pair duels on its two species](2026-11-19-mimicry-pairs-drilled.md) | #1162 |
| 2026-11-19 | [Every game mode for every subject: the Duel tab first, a closed mode names its reason](2026-11-19-modes-every-subject.md) | #1265 |
| 2026-11-19 | [No photo twice in a few questions: the draw reads the questions planned and shown, the strong RA's shown score lags a little at 1,000 answers](2026-11-19-no-photo-twice.md) | #1093 |
| 2026-11-19 | [Odd one out: a Lab prototype, three of a unit and one intruder, untimed, no effect on progress](2026-11-19-odd-one-out-lab.md) | #1253 |
| 2026-11-19 | [One answer recorder for every game: the photo quiz and the live game record through quiz.js recordAnswer](2026-11-19-one-answer-recorder.md) | #1213 |
| 2026-11-19 | [One engine, step 2: replay's features named, the one-tap question and the notices the engine's](2026-11-19-one-engine-named-fields.md) | #1226 |
| 2026-11-19 | [Rule P1 for the corals: no photo placed, ordered or weighted for who took it](2026-11-19-p1-corals-no-source-boost.md) | #1195 |
| 2026-11-19 | [Per-player exam reserve, every subject; the corals keep theirs; the photos it takes read their qualities only](2026-11-19-per-player-reserve.md) | #1099 |
| 2026-11-19 | [The measured block: photo values computed once from the pixels, in measured.json](2026-11-19-photo-measured-block.md) | #1229 |
| 2026-11-19 | [Pikachu: a nickname shared by Thecacera pikachu and T. pacifica, T. picta mentioned as locally so called](2026-11-19-pikachu-nickname.md) | #1190 |
| 2026-11-19 | [The privacy page: a short notice, the points the law asks for, no internal detail](2026-11-19-privacy-short.md) | #1095 |
| 2026-11-19 | [The ROADMAP holds every decision: the backlog recount applied, the row details back in the rows, the check reads ROADMAP items](2026-11-19-roadmap-holds-every-decision.md) | #1264 |
| 2026-11-19 | [Rule 0: Pierre's day starts with his first message after 04:00](2026-11-19-rule0-first-message.md) | #1191 |
| 2026-11-19 | [The rules core: AGENTS.md cut to what every task holds, the index to docs/rules/, S1 and L6 merged](2026-11-19-rules-core.md) | #1217 |
| 2026-11-19 | [Rules, step 1: AGENTS.md loaded with CLAUDE.md; merge, never rebase or force-push; one PR per agent](2026-11-19-rules-step1.md) | #1198 |
| 2026-11-19 | [Rules tooling: a search before any question, the answers ledger checked, the decisions index generated](2026-11-19-rules-tooling.md) | #1199 |
| 2026-11-19 | [The rules core trial's harness, and a guard on agent launches: model and effort set, every launch logged](2026-11-19-rules-trial-harness.md) | #1209 |
| 2026-11-19 | [The 2026-11-19 rule wordings: one shared engine, code comments, the slow tier, L11 over LEARNING](2026-11-19-rules-wordings.md) | #1190 |
| 2026-11-19 | [Same or different?: a Lab prototype, declared pairs only, untimed, no effect on progress](2026-11-19-same-or-different-lab.md) | #1241 |
| 2026-11-19 | [Sea slug literature scan follow-up: two sourced species pairs recorded, judging hints in the rubric](2026-11-19-seaslug-literature-followup.md) | #1164 |
| 2026-11-19 | [Sea slug ID marks for the genera in `none`: two revisions the sources study did not list, Ardeadoris and Caloria left](2026-11-19-seaslug-marks-circle1.md) | #1176 |
| 2026-11-19 | [Sea slug ID marks for every circle-2 genus](2026-11-19-seaslug-marks-circle2.md) | #1238 |
| 2026-11-19 | [Sea slug ID marks for circle 3: 30 of 32 genera, a line from one game species written "as X. y"](2026-11-19-seaslug-marks-circle3.md) | #1236 |
| 2026-11-19 | [Sea slug species sheets: sourced ID marks, shown as drafts until Pierre validates them](2026-11-19-seaslug-species-marks.md) | #1263 |
| 2026-11-19 | [The slow test tag: eight statistical tests out of the pre-push fast tier](2026-11-19-slow-test-tag.md) | #1239 |
| 2026-11-19 | [Species by scientific name in the app: one set for both subjects, one gate, the kind beside the rank](2026-11-19-species-sci-app.md) | #1273 |
| 2026-11-19 | [Merulina, Cyphastrea and Halomitra get ID tips from the Coral Finder, under their own heading](2026-11-19-starred-genera-tips.md) | #1242 |
| 2026-11-19 | [The tell-apart pairs left without a line: four more written, five kept with their reason](2026-11-19-tellapart-none-pairs.md) | #1245 |
| 2026-11-19 | [The fish build reports the genera a circle edit brings into circle 1 with no name root](2026-11-19-tree-tab-step.md) | #1181 |
| 2026-11-19 | [Your tricky pairs on My progress: the player's own mix-ups, shown, with no weight change](2026-11-19-tricky-pairs.md) | #1210 |
| 2026-11-18 | [ARCHITECTURE as a map: each part's spec in docs/spec/, its cited names kept as stubs](2026-11-18-architecture-as-a-map.md) | #1134 |
| 2026-11-18 | [Architecture steps 3 and 4: the tree engine named tree*, the flat subject a capability; the core.js split waits](2026-11-18-architecture-steps-3-4.md) | #1146 |
| 2026-11-18 | [The coral calibration set: 50 photos drawn a little more often until each has 20 answers](2026-11-18-coral-calibration-set.md) | #1130 |
| 2026-11-18 | [Decisions from the admin's code comments: kept here when the comments were cleaned](2026-11-18-decisions-from-admin-comments.md) | #1132 |
| 2026-11-18 | [Decisions from the app's code comments: kept here when the comments were cleaned](2026-11-18-decisions-from-app-comments.md) | #1124 |
| 2026-11-18 | [Decisions kept from code comments: Pierre's words that were only in core.js and Code.gs](2026-11-18-decisions-from-code-comments.md) | #1121 |
| 2026-11-18 | [Decisions kept from the front-end comments: Pierre's words that only the code held](2026-11-18-decisions-from-comments-3.md) | #1126 |
| 2026-11-18 | [Decisions found in the comments of tests/ (second pass)](2026-11-18-decisions-from-comments-tests-2.md) | #1128 |
| 2026-11-18 | [Decisions found in the comments of tests/ (third pass)](2026-11-18-decisions-from-comments-tests-3.md) | #1131 |
| 2026-11-18 | [Decisions found in the comments of tools/ and tests/](2026-11-18-decisions-from-comments-tools-tests.md) | #1127 |
| 2026-11-18 | [Decisions found in the comments of the tools/ scripts](2026-11-18-decisions-from-comments-tools.md) | #1142 |
| 2026-11-18 | [The short feedback sheet: the verdict, one line, the rest behind More](2026-11-18-feedback-sheet.md) | #1110 |
| 2026-11-18 | [Guards rather than prose: what players see, the Bash guard, the night report](2026-11-18-guards-not-prose.md) | #1117 |
| 2026-11-18 | [Infrastructure health: an hourly check and the numbers to watch before the free tiers run out](2026-11-18-infrastructure-health.md) | #1101 |
| 2026-11-18 | [Live mode after version 1: a QR code of our own on the lobby screen](2026-11-18-live-after-v1.md) | #1114 |
| 2026-11-18 | [Player groups: no "apart" setting; group changes show at once](2026-11-18-no-apart-groups.md) | #1113 |
| 2026-11-18 | [The sheet script installs from a release branch only the merge train moves](2026-11-18-release-branch.md) | #1102 |
| 2026-11-18 | [The 2026-11-18 rule wordings](2026-11-18-rules-wordings.md) | #1086 |
| 2026-11-18 | [Sea slug achievements: the % ladder beyond 50%](2026-11-18-seaslug-achievements-high.md) | #1112 |
| 2026-11-18 | [Species by scientific name on the sheet: the sci: key, smaller faults by kind](2026-11-18-species-sci-sheet.md) | #1249 |
| 2026-11-18 | [The coral and sea-slug pairs' tell-apart lines: ours, in `ap` / `apsrc`, never in IMR's `lk`](2026-11-18-tellapart-lines.md) | #1119 |
| 2026-11-18 | [Typed answers, the rest: typed mix-ups in the pooled pairs, the typed text in admin Pairs](2026-11-18-typed-answers-rest.md) | #1116 |
| 2026-11-18 | [The mimicry class: look-alike species come in once their model is met, with a card](2026-11-18-variant-classes.md) | #1133 |
| 2026-11-18 | [The names choice on the What I learn card: Common names and Scientific names rows, each on or off](2026-11-18-what-i-learn-names-rows.md) | #1301 |
| 2026-11-04 | [Fish basics: the fish twin of Coral basics, on the same engine, from the IMR fish presentation](2026-11-04-fish-basics.md) | #1108 |

Older decisions are still in the notebook's "Decision log"
([docs/archive/learning-notebook.md](../archive/learning-notebook.md); LEARNING.md "Decision log" points there), the
rules' *Source* lines, ROADMAP source cells and the PRs; they move here when the docs that hold them are cut to what the code does now (the docs restructuring of 2026-11-18,
[docs/reviews/2026-11-18-docs-audit.md](../reviews/2026-11-18-docs-audit.md) section 6).
