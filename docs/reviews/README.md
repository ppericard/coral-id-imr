# Reviews and design studies

Every review and study was first written as a private Claude doc or artifact on claude.ai, in Pierre's original Claude account. **Those links do not open from another account.** The latest round of each review is copied here, with a status header saying what has been fixed since. Earlier rounds and studies are summarised below: their decisions are in `AGENTS.md`, their leftovers in `ROADMAP.md`.

## Copied in full (latest round, 2026-11-01; the algorithm review 2026-11-02)

| File | Review | Open items |
|---|---|---|
| [2026-11-01-code-re-review.md](2026-11-01-code-re-review.md) | Senior developer, second round (main @4f6df67) | `data.json` one genus per line, Prettier + modules, tests for `photoSet`/`distractors`, report rate limit if abused, repo size |
| [2026-11-01-admin-re-review.md](2026-11-01-admin-re-review.md) | A new admin, second round | Second-admin token steps untested; three low items |
| [2026-11-01-ra-re-review.md](2026-11-01-ra-re-review.md) | A first-time RA, second round | Phone hammer icon label, tablet name cut, red "!" on Review 0 (check), like-for-like wrong-answer photos |
| [2026-11-01-design-re-review.md](2026-11-01-design-re-review.md) | Expert UI designer, second round | p2, p9, p10, m5, m11 to verify |
| [2026-11-02-learning-algorithm-review.md](2026-11-02-learning-algorithm-review.md) | Independent review of the learning algorithm (Pierre: compare it with the guidelines and with what others do) | Its 8 proposals, one by one with Pierre (ROADMAP "Independent review"); progress as a weighted moving average agreed 2026-11-02 |
| [2026-11-05-governance-review.md](2026-11-05-governance-review.md) | Independent review of the governance documents (rule 27a, open mission) | Being applied: ROADMAP "Governance documents refonte" (PR A merged as #558; B, C, D next) |
| [2026-11-05-fish-sheets-study.md](2026-11-05-fish-sheets-study.md) | Study: what the fish sheets hold at each level (identification group / family, genus, species), photos, sources, order of work | 13 questions for Pierre, not asked yet: ROADMAP "Fish sheets at three levels" |
| [2026-11-05-coral-taxonomy-study.md](2026-11-05-coral-taxonomy-study.md) | Study: coral taxonomy as it stands (WoRMS, iNaturalist, Corals of the World, the IMR lecture), genus-level changes since about 2010, the Astrea case, a reference file for the tools | Its 7 questions answered by Pierre (Q45-Q51): the reference file `tools/taxonomy.json` and the watch list (Q49, Q51) and the *Plesiastrea peroni* mapping (Q50) in their PR, the file's wiring into the photo search and the admin flags next (ROADMAP "Next"); which corals IMR labels "Astrea" (Q45, Q47 waits on it) in the admin, To do › Points (`points.json` `astrea-reefcloud`); IMR survey records as presence evidence parked (Q46); Pachyseridae: nothing to do (Q48) |
| [2026-11-05-coral-photo-sources-study.md](2026-11-05-coral-photo-sources-study.md) | Study: photo sources beyond iNaturalist for the thin genera (Astrea and Anacropora first), their licences and what the presence rule allows | All answered by Pierre: the photo hunt and the pre-sort of the near-Dauin observations left above genus are his to-do (STATUS "Pierre's hands"); share-alike out of the coral candidates (Q35, queued); museum specimens as presence evidence and contacting other bodies (SeaLifeBase, Silliman University, Corals of the World) declined |
| [2026-11-05-url-scheme-study.md](2026-11-05-url-scheme-study.md) | Study: the URL scheme of the app and the admin, old → new table, migration, PR split | Decided by Pierre (Q53-Q56, filters as `?a=1&b=2`): the URL refonte, after governance PR C |
| [2026-11-05-stats-methods-study.md](2026-11-05-stats-methods-study.md) | Study: how adaptive quiz / Elo / IRT systems judge an effect, multiple-testing corrections, recipes for our three simulation tiers and for multifactor analyses (simulation designs, mixed models, GLMMs with crossed random effects) | Applied to the simulation rule (governance PR C, #572); open: per-player inference in `tools/abilityeval.js`, multiple-testing correction and bootstrap size in the admin's Analyses |
| [2026-11-05-multifactor-viz-study.md](2026-11-05-multifactor-viz-study.md) | Study: visualisations for the admin's multifactor Analyses (16 chart kinds, what our data supports) and player behaviour profiles | 8 questions for Pierre (Q70-Q77); ranked list of 8 views to build after his answers |
| [2026-11-05-progress-setsize-study.md](2026-11-05-progress-setsize-study.md) | Study: progress against the number of genera in mind (set size, closed vs open set, how other apps judge mastery), our model's four gaps, a "proven against the field" design, corals and fish | 13 questions for Pierre (Q101-Q113); simulation pieces first |
| [2026-11-05-deleted-accounts-audit.md](2026-11-05-deleted-accounts-audit.md) | Audit: what a deleted, merged or renamed account leaves in the sheet, the app, the admin and the reports; live / archived / deleted policy | Decided by Pierre (Q84-Q91, plus self-service deletion): being built |
| [2026-11-05-fish-release-plan.md](2026-11-05-fish-release-plan.md) | Plan: the public fish release by 2026-11-08 (what exists, the checklist, parallel PRs, the flip and its rollback) | Its decisions (a)-(i) are Q92-Q100 |
| [2026-11-05-stack-audit.md](2026-11-05-stack-audit.md) | Audit: every tool and service version against the latest stable, and how to keep them current | Done: #584, #586, #587; watch items in `tools/stack.json` |
| [../reference/genus-overview-2026-10-31.md](../reference/genus-overview-2026-10-31.md) | Pierre's first study doc on the 39 genera | Background only; `data.json` supersedes it |

## Summarised only (first rounds and studies, all closed or carried into ROADMAP)

| Doc (2026) | What it decided | Where it lives now |
|---|---|---|
| Code review, round 1 (10-31/11-01) | 18 findings; 17 fixed in PRs #247-#258 (token in sessionStorage, SW photo cache, Code.gs v6 hardening, `core.js` + tests + CI, CSP, `check_versions.py`) | AGENTS.md "How to make a change", ARCHITECTURE.md "Security model" |
| Admin review, round 1 (11-01, French) | 10 recommendations, all approved by Pierre and shipped (#246 Start here help + Needs tab, #253 Publish summary/confirm, wording, symbols legend) | ARCHITECTURE.md "Admin back-office"; second-admin idea in ROADMAP |
| First-time RA review, round 1 (11-01) | Fixes in #251 (help on genus sheet, learned rule in help, tour text) | Leftovers in ROADMAP "First-time RA review leftovers" |
| New-RA usability review (10-31) | Declutter #108-#122, adaptive levels #122, BKT + Elo #123, Auto level only #128 | AGENTS.md rules 12-17 |
| Expert design review, round 1 (11-01, French) | Lots 1-3 (#254, #256, #262): real italics, muted group tints, 12 px floor, tokens, one segmented control, SVG icons | docs/DESIGN.md |
| Desktop review (10-31) | #158, #161, #163, #206 (feedback always in the answer column) | AGENTS.md rules 17-18 |
| Phone review (10-31) | #152-#157, #160, #162, #166, #179 (finder on phone, compact chrome) | AGENTS.md rule 19-21 |
| Responsive report (10-31) | 3 size classes, mobile-first CSS (#168, #172), 44 px targets only for ? ⚙ ‹ › (#170) | AGENTS.md rule 19 |
| Fact-check (10-31) | #22, then #25/#26 reverted anything that contradicted the lecture; "Other sources" notes | AGENTS.md rule 1; open lecture points in the admin's To do › Points (`points.json`) |
| Photo usage per context (10-31) | IMR > Pierre > others in every context, games/sheet/finder sets (#96, #134, #171) | ARCHITECTURE.md "Photos per context" |
| Learning path + home study (10-31) | Learn > Practice > Identify, no daily-habit app; later two-door Home (#150) | AGENTS.md; leftovers in ROADMAP "Parked" |
| Look-alikes study (10-31) | Deck of ~20 classic montages + wrong-answer montage + rematch duel (#159) | ARCHITECTURE.md; copy of the study page in the project files folder (`lookalikes-study/`) |
| Corallite anatomy study (10-31) | One concept per card, rings on real macro photos (#15-#19, #177) | Tool stays in the Lab; next steps in ROADMAP |
| "Learning coral ID faster" study (10-31) | ReefCloud point drills, realistic mode, evening checks | ROADMAP "Parked" |
