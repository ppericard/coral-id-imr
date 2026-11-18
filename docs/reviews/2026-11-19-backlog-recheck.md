# Backlog re-check: the inventory's open rows against main (2026-11-19)

Read-only. [The backlog inventory](2026-11-18-backlog-inventory.md) is a snapshot of 2026-11-18 and stays as it is. Since
then it has sent two agents to work that was already done: the sea slugs' judging pass (S4, done by #1034, #1035 and
#1048 on 11-17) and LEARNING's player model. This note re-checks every row of its §4 whose state was "Decided, not
started", "Started" or "Partly done" (51 rows; none read "Started") against `main` at `25744eda` (2026-11-19 03:52
Manila). Read this note before you start a backlog item, and still check the row's own evidence first.

**Method.** For each row: the code or data it names, the tools' `--check` or `todo` output where one exists, the PRs
merged since 11-18 and the open PRs (their files, for the engine rows), and the ROADMAP row as fixed by #1165. Each row
got a quick look, not a deep dive. A row marked "done" may still have a later step under another ID. What this check
cannot see: the sheet (answer counts, versions in force) and Pierre's chat.

**Verdicts.** done (PR or evidence); partly (what is left); open (nothing built since, or a PR in review); blocked (on
what). "core.js/#1121" means the row changes `core.js`, which #1121 holds until its version is assigned; the other open
PRs on the engine files are #1093 (model.js, quiz.js), #1099 (core.js, model.js, quiz.js, sync.js), #1116 and #1148
(core.js), #1130 (model.js).

## Counts

| Verdict | Rows |
| --- | --- |
| done | 8 |
| partly | 9 |
| open | 26 |
| blocked | 8 |
| All | 51 |

## By row

| ID | Verdict | Evidence |
| --- | --- | --- |
| L1 | open | Q316's offline fit not started: ROADMAP "Engine coherence review" still "Next"; `claude/photo-genus-ability` has no PR |
| L2 | blocked (core.js/#1121 and the open engine PRs above) | the inventory's own condition (no open PR on core.js, sync.js, model.js, quiz.js); ROADMAP row unchanged |
| L4 | done (#1057) | merged 2026-11-18: held-out set wired, exam only; the transfer analysis is a later step of ROADMAP "A held-out photo set" |
| L9 | blocked (on data: the next milestones, corals 4,000 and fish 3,000 answers) | ROADMAP "Photo memory": "the table again at the next milestone"; the answer counts are in the sheet, not read here |
| L13 | open | `model.js` `CAL` still `U: 1`; ROADMAP "`CAL.U`" row "Next" |
| L24 | open | no "tricky pairs" in the front end; ROADMAP "Name-similarity confusion": "Next: the re-test, (e), (f), (h)" |
| L27 | open | `tips.js` holds the one tip `zoom`; ROADMAP "Did you know?" "Not built; enable one by one" |
| L29 | blocked (core.js/#1121) | no Matrix code; STATUS "Next" 2: after #1121 |
| L30 | blocked (core.js/#1121) | `core.js` and `analysis.js` `fmtOf` have no Find the X format (`\|f`), so no offset |
| F1 | blocked (Pierre's Q413) | #1148 open, waiting for his answer (STATUS "Questions for Pierre") |
| F4 | blocked (core.js/#1121) | FISH_PATH "Feeding the families": "Not built"; it needs a fish rules version in `core.js` |
| F5 | partly | the mimicry pairs M1-M7 built and drilled (#1133, #1162); left: other species pairs in family questions, the admin's species pairs (plan PR 10) |
| F6 | open | ROADMAP "Fish confusion at several ranks": the fish confusion views wait for their design, with the species level |
| F7 | open | `app.js` still shows the Fish ID Key as "Coming soon" |
| F8 | open | `tools/learnsim.js` has no fish profiles (`--subject fish` plays the coral ones); ROADMAP "Fish welcome question" "Left" unchanged |
| F11 | partly | circles 2-3 genera have a presentation and marks (#1074); left: "Don't confuse with" cards, the marks as an editor slot, name roots |
| F12 | partly | unchanged: ROADMAP "Fish sheets at three levels" "Left": the genus and species marks, the phase model, the writing |
| F13 | open | unchanged: ROADMAP "Fish common names" "Left": Pierre's editor for a species' list, the name index |
| F14 | partly | unchanged: ROADMAP "Fish progress replayed" "Left": a never-signed-in device, the admin's Progress column, achievements recounted |
| F15 | partly | species units named (#1159), the registry under the editor's structure (#1161); the Journey opt-in (#1166) and Taxa (#1169) in review; Difficulty after F1 |
| F17 | partly | `judging_fish.py todo`: 8 candidates in 7 species not judged; the iNaturalist covers as candidates and a new rfishbase snapshot left |
| F19 | open | no fish photo exposure re-measure in `docs/reviews/` since the study of 2026-11-06 |
| C2 | open | #1170 (the IMR lecture's coral pairs split from the Coral Finder's) in review |
| C4 | blocked (Pierre's wording, Q294) | rule C2 (docs/rules/content.md) still names the Coral Finder's categories; the wording goes to Pierre (inventory D6) |
| C5 | open | ROADMAP "First-time RA review leftover": "Next (photo-dependent)" |
| C11 | open | ROADMAP rows "Growth form + quality guesses" ("on request") and the near-duplicate re-run ("Next") unchanged |
| S1 | done (#1061) | merged 2026-11-18: the sea slugs' Candidates, tag rows, text slots and Health |
| S2 | done (#1062) | merged 2026-11-18: the WoRMS reference tree and the admin Tree's WoRMS view |
| S3 | done (#1053) | merged 2026-11-18 with its sheet version: Species shown keeps *Goniobranchus* sp. 5 |
| S4 | done (#1034, #1035, #1046, #1048) | `judging_fish.py --subject seaslug todo`: 0 waiting; 795 genus-level and 20 sp. 5 candidates judged |
| S6 | open | `tools/seaslug_cues.json` `none` still holds 7 genera (*Halgerda*, *Ardeadoris*, *Elysia*, *Thuridilla*, *Caloria*, *Coryphellina*, *Phyllidiopsis*) |
| S7 | open | #1164 (the two sourced species pairs, the judging hints) in review |
| A2 | open | ROADMAP "Activity outside the quiz": (C1), (C2) "Next" unchanged |
| A7 | open | ROADMAP "Auto-sort follow-ups" (a)-(d) unchanged |
| A10 | open | ROADMAP "Alerts lines of a name taken again": not built; a `Code.gs` write-path change (a sheet version) |
| B2 | open | ROADMAP "The Tree tab": "Steps 1-5 and 8 built; the rest Next" |
| P1 | partly | begun (#984); the coral lecture pairs in #1170 (review); left: `qt`, `sl`/`rsl`, the lecture photos, IMR names and tags, the slate |
| P3 | open | ROADMAP "IMR lecture photos, second pass": "Later (second pass)" |
| P5 | blocked (on P3) | ROADMAP "About and credits": rewritten once the lecture photos are traced, replaced or moved to an IMR edition |
| P9 | open | no watermark pass since the third (ROADMAP "three passes made"); refills came in since (Candidate photos runs of 11-18, #1070) |
| P10 | open | #1168 (the monthly refresh of 2026-11-18) in review |
| T3 | partly | player groups built (#1091, #1113); left: cohorts joined with a code, the trainer view, the overlay, the relay, sign-in |
| I2 | open | no `data/` directory on main |
| I7 | open | ROADMAP "CI speed, what is left": "Next" unchanged |
| I8 | partly | watched by the infrastructure dashboard (#1101); the clean-up of unused R2 files not built |
| I11 | open | `learn.js` still defines `pairs` and `photoPair`; nothing moved to `model.js` |
| I15 | open | `optimistic-newton-b82nxm`, `stoic-ritchie-fp1ipu` (can go: #1053 merged) and `fish-todo-wip` still on origin |
| D1 | done (#1165) | ROADMAP hygiene merged 2026-11-19 |
| D2 | done (#1165) | the reviews README's missing row and stale cells, same PR |
| D3 | done (#1140) | INTEGRATOR "Where open work sits" now points to STATUS and ROADMAP and copies nothing |
| D4 | open | ROADMAP "Next round of independent reviews": planned after the complete fish experience |

## What this changes

- The ROADMAP row "Sea slugs without a species name" and its details said the judging pass was not built; both are fixed
  in the PR that adds this note.
- The rows marked done here can leave the next inventory. The blocked ones say what to wait for; the open ones with a PR
  in review (C2, S7, P10) and F1 belong to that PR, not to a new agent.
