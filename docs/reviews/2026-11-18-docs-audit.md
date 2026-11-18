# Documentation audit (2026-11-18)

A complete pass over the repository's documentation, made at Pierre's request of 2026-11-18, 11:26 Manila: "Ça serait
bien que tu fasses aussi un tour complet de la doc sur le repo. Je ne suis pas sûr que tout soit à jour ou complet ou
suive les best practices. À commencer par le README." This is an open mission (rule W8): it questions our own
documents and the rules that shape them.

- **Base:** `origin/main` at `7b260e35`, 2026-11-18 about 11:30 Manila. Line numbers are that commit's.
- **Docs only.** Nothing but the new `README.md`, this file and one row in [README.md](README.md) of this folder changed.
  Every fix named below is for a later PR (the plan, section 6).
- **Labels (rule W11):**
  - **measured**: counted in this checkout (`wc -c`, `git ls-files`, a search);
  - **read**: read in the file or the code, not run;
  - **judgement**: my opinion as the reviewer.
- **What I read and what I did not.** I read `AGENTS.md`, `CLAUDE.md`, the rules of `ship.md` that touch docs (W1-W3, W13,
  W14, W18, W19, W21, W24), `docs/STATUS.md`, `HANDOVER.md`, `INTEGRATOR.md`, the headings and the largest sections of
  `ARCHITECTURE.md`, `LEARNING.md` and `ROADMAP.md`, the openings of `SECURITY.md`, `PAGES.md`, `BACKUP.md`, `FORMATS.md`,
  `FISH_PATH.md` and `DESIGN.md`, the text of `privacy.html`, `tests/docs.test.js`, and the two 2026-11-18 reviews this
  builds on ([architecture and code](2026-11-18-architecture-code-review.md), [backlog inventory](2026-11-18-backlog-inventory.md)).
  No one can read the two 700 KB files in one pass (their size is the finding); I measured their sections and checked
  claims by search. The 53 dated studies were not re-read: their status comes from this folder's README rows, STATUS and
  the inventory.
- **Sizes are bytes from `wc -c`.** The architecture review's "710 KB" is a rounder figure for the same file; I make no
  claim about growth since.

## 1. Summary

The documentation is unusually complete for a project this young, and its governance is strong: stable rule IDs with
a source line each, a docs test that pins links, anchors, rule citations and code identifiers, a frozen archive, a size
budget on the constitution. Its weakness is not missing facts. It is that **history is kept inside the documents that
should describe the present**, so the two main references are unreadable, the player-facing texts lag the app, and the
decisions that matter are spread over six places.

- `docs/` holds 4,156,076 bytes in 98 files. `ARCHITECTURE.md` and `LEARNING.md` are 1,469,456 of them: 35%. One line of
  `ARCHITECTURE.md` (the sheet script's version history, line 642) is 93,791 bytes: 12.8% of the file (measured).
- The 2026-11-18 backlog inventory listed 17 contradictions between the docs. Re-checked today: 15 still stand, one is
  fixed (X1) and one is half fixed (X17). Section 4 adds eight more.
- The three player-facing texts (`privacy.html`, `index.html`'s description, the old README) still say fish are in beta,
  none names the sea slugs (`privacy.html` and `index.html`), and `privacy.html` does not mention the live mode.

### Top 10 findings (ranked by impact)

| # | Finding | Where | Evidence | Fix (PR in section 6) |
|---|---|---|---|---|
| 1 | The two main references are changelogs, not references: no agent or newcomer can read them, and 294 of 682 commits touch `ARCHITECTURE.md` (the review's count) | ARCHITECTURE 731,467 B, LEARNING 737,989 B | measured: 464 dated or numbered references in ARCHITECTURE's "Progress sync" alone (204,493 B); LEARNING's "The player's own model" is 497,059 B (67%) | PRs 3-6 |
| 2 | The sheet script's version history sits in `ARCHITECTURE.md` as one 93,791-byte line (115 entries), duplicating the header of `Code.gs`, and `tools/sheet_version.py --assign` writes it there | ARCHITECTURE:642; `tools/sheet_version.py` (the entry goes to "ARCHITECTURE.md's version history") | measured, read | PR 3 (the cheapest large cut) |
| 3 | The privacy notice is behind the app and says things players rely on: "reef fish, in beta" (line 30), leaderboards "(corals, fish)" (line 62), photos from "Cloudflare (the coral photos…)" and iNaturalist "the fish photos" (line 71, but fish and sea-slug photos are on R2 too), no sea slugs, no live mode (a nickname session is kept up to 6 hours, per its design note) | `privacy.html` | read; the live mode's data from [its design note](2026-11-18-live-mode-design.md) "Data kept" | A separate privacy PR (`claude/privacy-1118`; Pierre's OK, shown to him before it publishes) |
| 4 | The constitution's first bullet is stale: "corals now, fish and benthos next", "no build step" (the deploy minifies and stamps versions: #1069) | AGENTS.md:9 | read; ARCHITECTURE's own "Run and deploy" says the deploy minifies | PR 1 |
| 5 | No decision records. A decision is in a code comment (the review counted 416 "Pierre, date" citations in 4 files), a ROADMAP row's source cell, a rule's *Source* line, LEARNING's "Decision log" (27,052 B), or a PR description. A reader cannot list "what was decided about X" | everywhere | measured (178 lines in 57 files cite an ARCHITECTURE or LEARNING section by name) | PR 2 |
| 6 | ROADMAP's "Next (agreed, not started)" is 138,364 B (68% of the file) and still holds rows whose own status cell says Built or Done; 22 lines of the file exceed 2,000 characters | ROADMAP | measured; X2-X12 re-checked | PRs 1 and 6 |
| 7 | Two handover documents say different things and both lag: `HANDOVER.md` (2026-11-01, "a new Claude account", coral-only first prompt, a repository map that duplicates three other places) and `INTEGRATOR.md` (written 2026-11-07, four dated "Handover of…" sections, an "Open work" list that names merged PRs as waiting, X14) | HANDOVER, INTEGRATOR | read | PRs 1 and 5 |
| 8 | Rule W19 makes every PR edit `ARCHITECTURE.md` and `ROADMAP.md` (the two conflict hot spots) and `tests/docs.test.js` pins their section names, so the structure cannot change without changing the rule and the test first | `docs/rules/ship.md` W19; `tests/docs.test.js:329` | read | PR 2 (rule wording is Pierre's) |
| 9 | Missing docs a project of this size should have: a contributing guide, a glossary, decision records, a data-files map, a security reporting channel, a tools map (section 5) | the repository | measured (glob found none) | PR 7 |
| 10 | Small facts that disagree: `SECURITY.md` says 20 million cells in one place and 10 million in another; rule W18 still says the history rewrite "is planned" (done 2026-11-08); rule A4 and several docs still say "Corals \| Fish" for a switch that now has three subjects | section 4 | read | PR 1 |

## 2. The inventory of files

**98 files** under `docs/` (26 outside `reviews/`, 68 in it), plus `AGENTS.md`, `CLAUDE.md`, `privacy.html` and `README.md`
(`git ls-files docs AGENTS.md CLAUDE.md privacy.html README.md`, measured). There is no `HANDOVER.md` outside `docs/`. The
tables below hold exactly these 98 files: 4 root + 12 top level + 9 rules + 1 archive + 4 reference + 68 in `reviews/`.

**Audience:** P = Pierre, A = agents (the integrator and its subagents), D = a new developer, U = players.
**Status:** up to date; stale (the lines); duplicate of; missing (section 5).

### 2.1 Root files

| File | Bytes | Purpose | Audience | Status |
|---|---|---|---|---|
| `README.md` | 7,151 before, rewritten in this PR | The front page: what the app is, how it is built, run, tested and worked on, the docs map, rights | D, U | Was stale (fish "in beta", "both subjects", no live mode, one smoke of nine); **up to date** as rewritten |
| `AGENTS.md` | 20,200 | The constitution: Rule 0, the merge contract, the rule index, the ship checklist | A, P | **Stale in line 9** ("corals now, fish and benthos next"; "no build step"). Otherwise up to date; under its 20 KB target |
| `CLAUDE.md` | 786 | Entry point for Claude Code: Rule 0, then AGENTS, STATUS, INTEGRATOR | A | Up to date |
| `privacy.html` | 11,285 | The privacy notice linked from the app and from the Google Cloud project | U, P | **Stale**: lines 30, 62, 71 (finding 3); no live mode |

### 2.2 `docs/` top level

| File | Bytes | Purpose | Audience | Status |
|---|---|---|---|---|
| `STATUS.md` | 6,220 | Where things stand; the integrator's only file | A, P | Not mine to edit. It prints a computed fact its own header says it must not: "sheet script **v172**" (line 15) while `Code.gs` `VERSION` is 176 at the base (read) |
| `INTEGRATOR.md` | 25,784 | How the integrator works day to day, merge mechanics, open work | A | **Stale**: "Open work and where it sits" (line 238 on) names #793 and #800 as waiting (merged 11-09) and a branch superseded; written 2026-11-07, with dated "Handover of…" sections. Duplicate heading "Working with Pierre" with HANDOVER |
| `HANDOVER.md` | 45,713 | Picking the project up in a new Claude account (2026-11-01): where things are, setups outside GitHub | A, D | **Stale and duplicate**: title and "First prompt" say "the IMR coral genera"; its repository map duplicates README's old layout table, AGENTS "Read on demand" and ARCHITECTURE "Tools"; one-time setups (history rewrite, protect main) are history. Its truths (external resources, sheet redeploy) have no other home |
| `ARCHITECTURE.md` | 731,467 | Files, data, admin, sync, photos, deploy | A, D | **Stale and a changelog** (section 3.1) |
| `LEARNING.md` | 737,989 | The learning model and its research | A, P | **A changelog around a spec** (section 3.2) |
| `ROADMAP.md` | 202,666 | Ideas not built, open questions, declined ideas | A, P | **Stale**: 15 of the inventory's 17 contradictions stand (section 4) |
| `FISH_PATH.md` | 79,951 | The fish naming path: a design spec | A | Partly stale: "Open questions for Pierre" (line 702, item 1 settled at line 449), "Checks before release" (line 732, the release is done), "Both subjects in one app" (line 667) says two |
| `FORMATS.md` | 19,314 | Question formats evaluated for IMR, with the research | A, P | Stale and a study: a 2026-11-04 snapshot with a "Status for IMR" column (Later, Parked, Built) that the formats queue in STATUS has overtaken; overlaps FISH_PATH "Formats and their order" and ROADMAP "Game modes". Candidate for `reviews/` |
| `DESIGN.md` | 40,541 | Design tokens and components | A, D | Up to date (read: every backticked token resolves in the CSS except `--ctx-h`, `--pp` and `--cut`, which are set in code or in `admin.css`); two "fish beta invitation" lines (40, 87) describe a card shown only while a subject has the beta label |
| `SECURITY.md` | 27,270 | What is exposed, what protects it, what to do | A, P | Up to date (names v171 boards); two flaws: 20 vs 10 million cells (lines 13, 253), and no way to report a vulnerability although GitHub shows this file as the security policy (measured: no "report" text) |
| `PAGES.md` | 16,508 | Pages deploy, recovery, the build at deploy | A, P | Up to date (its workflow inventory is test-enforced); the 2026-11-01 incident diagnosis (lines 3-64) is history inside a runbook |
| `BACKUP.md` | 11,918 | The weekly sheet backup to pCloud | P, A | Up to date (read) |

### 2.3 `docs/rules/`

| File | Bytes | Purpose | Audience | Status |
|---|---|---|---|---|
| `README.md` | 728 | The words the rules use (unit, taxon) | A | Up to date. A glossary of one paragraph: see section 5 |
| `ship.md` | 33,925 | W1-W27: working with Pierre, shipping, the merge train | A | **Stale in W18** (line 250: the history rewrite "is planned, not declined"; done 2026-11-08, HANDOVER). W19 needs rewording (finding 8). Largest rule file: 33,925 of 99,409 |
| `learning.md` | 20,159 | L1-L15 | A | Up to date (IDs test-enforced; text not re-read) |
| `sheet.md` | 12,277 | D1-D9 | A | Up to date (not re-read) |
| `photos.md` | 9,369 | P1-P6 | A | Up to date; P1's wording is queued in STATUS "Next" |
| `ui.md` | 7,415 | U1-U14 | A | Up to date (not re-read) |
| `content.md` | 7,181 | C1-C8 | A | Up to date; "the Coral Finder out of the rules" (Q294) is queued |
| `subjects.md` | 4,238 | S1-S3 | A | Up to date; S1 is questioned by the architecture review (R14), Pierre's to word |
| `admin.md` | 4,117 | A1-A5 | A | **Stale in A4**: "One subject switch (Corals \| Fish)"; the admin's subjects come from `SUBJECTS` (three) |

### 2.4 Archive and reference

| File | Bytes | Purpose | Audience | Status |
|---|---|---|---|---|
| `archive/DONE-until-2026-11-04.md` | 99,416 | The frozen done list | A | Frozen on purpose (its hash is pinned in `tests/docs.test.js`) |
| `reference/genus-overview-2026-10-31.md` | 15,123 | Pierre's first study of the genera | P | Superseded by `data.json` (its own header says background only) |
| `reference/lit-componential-difficulty.md` | 34,417 | Literature review, 2026-11-09 | A | Frozen record; its decision (Q316) is built |
| `reference/lit-photo-memory.md` | 28,503 | Literature review, 2026-11-09 | A | Frozen record; step 2 waits on data |
| `reference/lit-response-time.md` | 36,081 | Literature review, 2026-11-09 | A | Frozen record; decided (Q315) |

### 2.5 `docs/reviews/` (68 files, 1,897,786 bytes)

All are dated records. Their status comes from this folder's README, STATUS and the inventory (judgement; not re-read).
"Frozen" means decided and built: its substance belongs in a decision record and the file stays as the evidence.
"Live" means something in it is still open or being built.

| File | Bytes | Kind | Status |
|---|---|---|---|
| `README.md` | 26,432 | Index of the reviews | **Stale**: no row for 4 files (X16); about 15 "Open items" cells name questions since answered (X15) |
| `2026-11-01-admin-re-review.md` | 8,783 | Review | Frozen |
| `2026-11-01-code-re-review.md` | 10,950 | Review | Frozen |
| `2026-11-01-design-re-review.md` | 12,850 | Review | Frozen |
| `2026-11-01-ra-re-review.md` | 7,753 | Review | Frozen |
| `2026-11-02-learning-algorithm-review.md` | 24,500 | Review | Frozen (its proposals overtaken: inventory) |
| `2026-11-05-coral-photo-sources-study.md` | 26,886 | Study | Frozen |
| `2026-11-05-coral-taxonomy-study.md` | 50,717 | Study | Frozen |
| `2026-11-05-deleted-accounts-audit.md` | 25,000 | Audit | Frozen (built, #600, #603) |
| `2026-11-05-fish-confusion-study.md` | 40,907 | Study | Frozen (Q123) |
| `2026-11-05-fish-release-plan.md` | 23,940 | Plan | Frozen (fish are open) |
| `2026-11-05-fish-sheets-study.md` | 48,561 | Study | Frozen (built) |
| `2026-11-05-governance-review.md` | 31,244 | Review | Frozen (applied) |
| `2026-11-05-multifactor-viz-study.md` | 52,054 | Study | Live in part (ROADMAP "Analyses: structure views") |
| `2026-11-05-name-confusion-study.md` | 57,415 | Study | Frozen |
| `2026-11-05-photos-step3-plan.md` | 17,232 | Plan | Frozen (done 2026-11-08) |
| `2026-11-05-progress-setsize-study.md` | 54,215 | Study | Frozen |
| `2026-11-05-stack-audit.md` | 28,836 | Audit | Frozen |
| `2026-11-05-stats-methods-study.md` | 52,454 | Study | Frozen (applied) |
| `2026-11-05-url-scheme-study.md` | 29,937 | Study | Frozen (built) |
| `2026-11-06-confusion-group-opening-study.md` | 27,627 | Study | Frozen (Q350) |
| `2026-11-06-engine-algorithms-review.md` | 33,501 | Review | Frozen (built, #638, #642, #643, #646) |
| `2026-11-06-engine-coherence-review.md` | 29,842 | Review | Live: F5 and F9 still open (architecture review) |
| `2026-11-06-fish-units-plan.md` | 17,152 | Plan | Frozen (built) |
| `2026-11-06-overconfidence-diagnosis.md` | 25,667 | Diagnosis | Frozen (Q351) |
| `2026-11-06-photo-exposure-study.md` | 21,469 | Study | Frozen (built, #685) |
| `2026-11-06-progress-metric-research.md` | 34,381 | Research | Frozen (answered) |
| `2026-11-09-level-count-checkpoints.md` | 4,661 | Design note | Live (decided, not built) |
| `2026-11-09-shared-common-names.md` | 24,979 | Study | Frozen (built) |
| `2026-11-14-comeback-study.md` | 29,650 | Study | Frozen (Q367) |
| `2026-11-14-professionalise-study.md` | 43,078 | Study | Live: questions (a)-(e) open (STATUS) |
| `2026-11-14-q351-refit.md` | 31,528 | Study | Frozen (nothing shown) |
| `2026-11-14-q351-step2.md` | 24,208 | Study | Frozen (nothing shown) |
| `2026-11-14-sheet-overlay-design.md` | 62,436 | Design note | Live: wordings owed (C2, D5 lines), questions (h), (j), (k) |
| `2026-11-14-species-step1.md` | 11,280 | Design note | Frozen (built) |
| `2026-11-15-avif-study.md` | 18,868 | Study | Parked (recommendation: do not build now) |
| `2026-11-15-common-name-sources-study.md` | 41,466 | Study | Frozen (Q376) |
| `2026-11-15-held-out-photo-set-design.md` | 33,981 | Design note | Live (#1057 in flight) |
| `2026-11-15-imr-lecture-photo-sources-study.md` | 11,646 | Study | Live (C12 A+D queued) |
| `2026-11-15-nudibranch-mode-study.md` | 63,383 | Study | Frozen (Q369) |
| `2026-11-15-photo-memory-lag-table.md` | 21,053 | Study | Live (re-run at each 1,000-answer milestone) |
| `2026-11-15-seaslug-list.md` | 66,635 | Study | Frozen (Q377) |
| `2026-11-15-seaslug-sources.md` | 25,079 | Source list | No README row (X16) |
| `2026-11-17-levels-and-shares-study.md` | 44,199 | Study | Frozen (built, #975, #953); no README row (X16) |
| `2026-11-17-seaslug-literature-scan.md` | 48,790 | Study | Live (follow-up points) |
| `2026-11-17-seaslug-lookalikes-survey.md` | 31,918 | Survey | Live (one question: how candidates enter play) |
| `2026-11-17-seaslug-undescribed-species-study.md` | 34,804 | Study | No README row (X16) |
| `2026-11-18-app-gaps-review.md` | 29,665 | Review | Live (gaps being launched) |
| `2026-11-18-architecture-code-review.md` | 57,595 | Review | Live; **partly overtaken**: its R4 (no minification) was built in #1069 and its R3 step 2 (gate floor) in #1076 |
| `2026-11-18-backlog-inventory.md` | 115,060 | Inventory | Live until its §3 and D1-D3 are acted on (largest review) |
| `2026-11-18-live-mode-design.md` | 10,960 | Design note | Frozen once built (live mode v1 is on `main`) |
| `2026-11-18-multi-photo-study.md` | 37,341 | Study | Live (answered; building) |
| `2026-11-18-seaslug-cues-sources.md` | 9,655 | Source list | No README row (X16) |
| `2026-11-18-docs-audit.md` | this file, not in the 98 | Audit | Live |
| `2026-11-15-common-name-sources-sample.csv`, `2026-11-15-nudibranch-mode-candidates.csv` | 2 files | Data of two studies | Frozen |
| `avif-study/` | 12 files (a README and 11 Python scripts) | Scripts of the AVIF study | Frozen with it |
| `step3/rewrite.sh` | 1 file | The 2026-11-08 history rewrite script | Frozen (done) |

Row check: at the base, `docs/reviews/` holds 68 files: the README, 52 dated reviews (52 rows above), 2 CSV files, the 12
files of `avif-study/` and the 1 script: 1 + 52 + 2 + 12 + 1 = 68.

Other Markdown outside `docs/` (not asked, listed for completeness): `judging/BRIEF.md` (23,116), `judging/FISH.md` (45,226),
`judging/SEASLUG.md` (16,025), `judging/PROMPT.md` (2,717) brief an outside photo-judging agent; `.github/pull_request_template.md`
(1,194); `tools/sync/changes/README.md` (1,183); `tools/archive/README.md` (749). All read as up to date.

## 3. The two documents that read as changelogs

### 3.1 `ARCHITECTURE.md` (731,467 bytes, 774 lines, 15 `##` sections; measured)

| Section | Bytes | Share | What is in it |
|---|---|---|---|
| Progress sync (Google Sheet) | 204,493 | 28.0% | The spec of the sync, then **line 642: the version history, 93,791 B** (115 entries, v2 to v176) |
| Data files | 149,831 | 20.5% | One subsection per file, fish content 62,150 B, fish candidates 34,471 B, the content editor |
| Admin back-office | 119,908 | 16.4% | The admin, page by page |
| Front end | 81,930 | 11.2% | Routing, learning model summary, service worker, load tiers |
| Subjects | 48,206 | 6.6% | The taxon model; bullets that tell the beta label's dates as they changed |
| Tools | 40,245 | 5.5% | Every script |
| Analyses, Overview, Photos, Names, Players' reports, Security model, and three small ones | 86,705 | 11.9% | |

The average line is 944 bytes; 5 lines exceed 10,000 bytes (lines 642, 549, 562, 49, 441). Dated or numbered references
(a date, a Q number or a PR number) number 464 in "Progress sync" and 289 in "Data files". A map of module boundaries,
data flow, file formats and runbooks (the architecture review's target: at most about 50 KB) is a small part of this;
the rest is the present-tense behaviour of each feature mixed with the story of how it got there.

Specific stale or contradictory lines (read):

- Line 5-12, the Overview diagram: only `data.json`, `curation.json` and the sync; no fish, sea slugs, R2 or the minify step.
- Line 15: "No framework, no bundler, no npm" and, in "Run and deploy", "The deploy minifies the scripts" (same file).
- "Subjects" (lines 188-215): the registry's `id` is "(`coral`, `fish`)"; the sea slugs have their own bullet far below.
- "Players' reports": "suggestions from the 39 genera" (rule U8: never hardcode the number of units; it is 40 in the games).

### 3.2 `LEARNING.md` (737,989 bytes, 7,386 lines, 12 `##` sections; measured)

| Section | Bytes | Share |
|---|---|---|
| The player's own model (app), all `###` subsections | 497,059 | 67.4% |
| Pooled statistics: photo difficulty and confusions | 95,258 | 12.9% |
| Simulation | 37,134 | 5.0% |
| Multifactor analyses | 33,439 | 4.5% |
| Validating a learning change (rule L11) | 28,072 | 3.8% |
| Decision log | 27,052 | 3.7% |
| the other six | 19,247 | 2.6% |

Its biggest subsections are one-feature histories: Photo memory 48,111 B, the first-launch question 41,496 B,
a unit stuck shaky 22,918 B, response time 22,190 B. The headings carry dates and Q numbers ("(2026-11-12, Q337, Q338)").
Several are explicitly not the spec: "Considered and not adopted", "Calibrated, not adopted", "Q315 option 1: what three
rounds showed (closed unmerged)", "Response time: genus and photo (measured 2026-11-04, no change made)", "Open all: the
app's expectation against the truth (measured…, no change made)". The spec of the algorithms in force is in there, but a
reader cannot find it without reading the studies around it (judgement).

The docs test checks that an `ARCHITECTURE.md` section cited by name exists, not a `LEARNING.md` one, although code and
tests cite both by name: 178 lines in 57 files (`core.js` 28, `Code.gs` 32, `model.js` 20, the tools and tests the rest; measured, the two
documents together).

### 3.3 `ROADMAP.md` (202,666 bytes, measured)

"Next (agreed, not started)" is 138,364 B (68%); the file has 166 table lines and 22 lines over 2,000 characters. It still holds rows whose
status cell says **Built** or **Done** (lines 66, 67, 104, 34, 75, 79: X5), against its own opening rule that a shipped row
is deleted. Its text also says, three times, "corals now, fish and benthos next" (line 237, ARCHITECTURE:219, AGENTS:9).

## 4. Contradictions and stale records

### 4.1 The inventory's §3, re-checked at `7b260e35`

A grep miss is not "fixed": for each I read the row's status cell or the cited line.

| # | Still stands? | Evidence today |
|---|---|---|
| X1 STATUS "A, B or C" on #1057 | **Fixed** | STATUS (about 10:00) lists "#1057 A" under answered |
| X2 ROADMAP "Show the species after a family or genus answer" | Stands | Row at line 32: status "Built; wording and layout Waiting on Pierre" (merged #828; wording is the integrator's call since 11-14) |
| X3 "Fish genera need a presentation…" | Stands | Row at line 88: "circles 2-3 in review"; STATUS lists #1074 (presentations for all 107 circle 2-3 genera) merged |
| X4 "learnsim: long runs crash" | Stands | Row at line 31: "C for Pierre", while STATUS says C was built (Q382) |
| X5 Seven rows say Done or Built | Stands | Status cells read: Machine slot follow-up (line 34) Done; Q230 (41) "Done: nothing to build"; Juveniles path (66) Built (#953); Levels and shares (67) Built (#975, #953); Surprise-only (75) Done; Watermark (79) "Done (3 passes)"; Open by confusion group (104) Built (#871) |
| X6 admin plan PRs 9 and 12 | Stands | Line 157 still says "By difficulty Next" |
| X7 "Analyses for the fish" | Stands | Line 49 still carries "Left: the live views" |
| X8 "Coral Finder out of the rules too" | Stands | The row (line 222) still says "the R2 copies wait on Pierre"; ROADMAP:17 says they went on 2026-11-09. STATUS "Next" queues the rule wording (Q294) |
| X9 "Load order, further steps" | Stands | Line 213 points to "STATUS 'Next'" for (b) and (d); STATUS "Next" has three items, neither is one |
| X10 "Separate IMR-owned content" | Stands | Line 123 status "Agreed direction, not started" (the row's text says begun 2026-11-15) |
| X11 Malformed "Sea slug achievements" row | Stands | Line 125 has one cell: no source, no status |
| X12 ROADMAP fsp1, fsp10, fsp50 as waiting | Stands | ROADMAP:77 lists them as "next, with the species level"; LEARNING:4636 says they came with step 1 |
| X13 FISH_PATH "Twospot wrasse" asks IMR | Stands | FISH_PATH:704 open question; settled at :449 (Q319, Q381) |
| X14 INTEGRATOR "Open work" | Stands | Lines 250 and 260 still name `claude/fish-todo-wip` and #793 as waiting |
| X15 Reviews README "Open items" cells | Stands | Cells still read "Questions a-o for Pierre", "a-j", "a-h" for studies since answered |
| X16 Four reviews with no row | Stands | `seaslug-sources`, `levels-and-shares-study`, `seaslug-undescribed-species-study`, `seaslug-cues-sources` (measured); this audit adds its own row |
| X17 Code comments | Half fixed | `learn.js:756` "a later project" stands; `core.js:656` "profiles later" stands; the `app.js` comment is gone |

### 4.2 New, found in this pass

| # | Where | What it says | What is true |
|---|---|---|---|
| N1 | `docs/SECURITY.md:13` and `:253` | "20 million cells per spreadsheet" and "the 10-million-cell limit" | One limit, stated twice with different numbers; ROADMAP:227 says 10 million. Check Google's figure, then fix one |
| N2 | `docs/rules/ship.md:250` (W18) | "A history rewrite to shrink `.git` is planned, not declined… ask Pierre for the go" | Done 2026-11-08 (HANDOVER "Photos out of the repo, step 3"). The rule's other half (never rewrite history without Pierre's go) stands |
| N3 | `AGENTS.md:9`, `docs/HANDOVER.md:57`, `docs/ARCHITECTURE.md:15` | "no build step", "no bundler" | The deploy minifies and stamps versions (`tools/build_site.py`, `tools/stamp_versions.py`, #1069); development has no build step (PAGES.md:107 says it right) |
| N4 | `docs/rules/admin.md` A4; `docs/DESIGN.md`, `docs/ARCHITECTURE.md` (7 lines in all) | "the Corals \| Fish switch" | `SUBJECTS` has three subjects and `admin.js` lists the sea slugs |
| N5 | `docs/STATUS.md:15` | "Main: sheet script v172" | `Code.gs` `VERSION` is 176 at the base. STATUS says what can be computed is not written there (`tools/brief.py` prints it) |
| N6 | `index.html:10,15` (description and Open Graph) | "Reef fish in beta"; names corals and fish only | Fish left beta on 2026-11-17 (`SUBJECTS` fish has no `beta`); sea slugs exist. Players and link previews see this text |
| N7 | `privacy.html:30,62,71` | See finding 3 | |
| N8 | `docs/HANDOVER.md` title and "First prompt"; `AGENTS.md:9` "It teaches the 39 coral genera" | A coral-only project | Three subjects; AGENTS' sentence is about corals and is true, but nothing nearby says the app teaches more |

### 4.3 Duplicates

- **The sheet script's history, twice:** `Code.gs`'s header line and ARCHITECTURE:642, written together by `--assign`.
- **"Where things are", four times:** HANDOVER "Where things are" and "Repository map"; AGENTS "Read on demand"; ARCHITECTURE "Tools"; README (the old layout table, now a docs map).
- **"Working with Pierre", twice:** HANDOVER and INTEGRATOR; plus AGENTS "Working mode" and `rules/ship.md` W1-W11.
- **Question formats, three times:** FORMATS, FISH_PATH "Formats and their order", ROADMAP "Game modes".
- **The admin workflow, three times:** HANDOVER, ARCHITECTURE "Admin back-office", `rules/admin.md`.
- **Redeploying the sheet script:** HANDOVER "Code.gs", ARCHITECTURE "Progress sync", SECURITY.

## 5. Missing documents

Measured by search: none of these exists in the repository.

| Missing | Why a project of this size needs it | Where its material is today |
|---|---|---|
| **Decision records** (`docs/decisions/NNNN-*.md`) | "What was decided about X, when, by whom" must be answerable without reading code or six documents | Code comments, ROADMAP source cells, rules' *Source* lines, LEARNING "Decision log", PR descriptions |
| **A contributing guide** (`CONTRIBUTING.md`, short) | A human newcomer, and every outside agent, expects it at the root; today the way in is AGENTS (written for Pierre's agents), HANDOVER and a 34 KB `ship.md` | AGENTS "Ship checklist", `ship.md` W12-W27 |
| **A glossary** | Words with project meanings: unit, circle, slate, wink, phase, gate, rules version, slot, train, integrator, Open Water, Advanced. Only `unit` and `taxon` are defined (`rules/README.md`) | Scattered through ARCHITECTURE and LEARNING |
| **A data-files map** | About 35 JSON files at the root; which are Pierre's (`curation.json`), machine-written, built, served, in the players' copy; which tool writes each; the terse field names (`tr`, `ig`, `sl`, `qt`, `cm`…) | ARCHITECTURE "Data files" (149,831 B of prose); the architecture review R8 proposes schemas |
| **A security reporting channel** | GitHub shows `docs/SECURITY.md` as the security policy; it has no "how to report" and no contact | `privacy.html` says "ask Pierre, or open an issue" for data, not for vulnerabilities. GitHub's private vulnerability reporting is enabled (Pierre, 2026-11-18); the `SECURITY.md` line is made in the privacy PR |
| **A tools map** (`tools/README.md`) | 81 Python and 18 JS tools (the review's count), 23 one-shot `apply_*.py`, 9 referenced nowhere | ARCHITECTURE "Tools" (40,245 B) |
| **Module notes** | A short note beside each area of code: what it owns, what it must not touch | Code comments; ARCHITECTURE |
| **An issue template for rights holders** | README, `LICENSE` and the app ask rights holders to "open an issue"; a template tells them what to include | None |
| **A code licence decision** | See the question below | `LICENSE` |

**Licence (decided for now: Pierre, 2026-11-18, "A pour l'instant", all rights reserved kept; see 6.3 (b)).** A `LICENSE` exists: "All rights reserved… No licence is granted on its code, on
the data Pierre Pericard compiled…"; the hosted app is free to use. The new README says exactly that, and keeps the
heading "Content and rights" that `LICENSE` points to. The brief asked for an "open project" front page; Pierre keeps the
code all rights reserved for now (ROADMAP:123 records that the rights to his code, data and photos are his, and that
IMR-owned content is to be separated first).

## 6. Restructuring plan

This follows step 11 of the architecture review (decision records; ARCHITECTURE and LEARNING cut to maps and specs;
history out of the docs), ROADMAP's own idea (inventory D8, "Split LEARNING.md and ARCHITECTURE.md into short topic
files plus a notebook of studies"), and the order the couplings below allow. **Step 11 needs Pierre's OK on the
structure and on the wording of rule W19: Pierre agreed to both on 2026-11-18 (6.3 (a)), so the plan is approved.** Sizes: "to be sized with tools/effort.py"
(`tools/effort.py` is not on `origin/main` at `7b260e35`; re-check before sizing).

### 6.1 The couplings that set the order

1. `tools/sheet_version.py --assign` writes each sheet version entry into ARCHITECTURE.md's version history
   (and its tests). The history cannot move before the tool does.
2. `tests/docs.test.js` pins every `ARCHITECTURE.md "X"` citation to an existing section, the backticked identifiers
   the governing docs cite, links and anchors, rule citations, AGENTS.md's size and STATUS's length. Moving a section
   fails it until the test learns the new homes.
3. About 180 lines in 57 code and test files cite ARCHITECTURE or LEARNING sections by name; AGENTS "Read on demand"
   cites them too. Keep each cited heading (as a short stub that links to the new home) until its citers are updated.
4. Rule W19 tells every PR to update ARCHITECTURE and ROADMAP. Until it is reworded, a split creates the conflicts it
   should end.
5. `tools/sync_core.py` embeds `core.js` in `Code.gs` verbatim (no comment stripping: read). A comment-only pass on
   `core.js` is therefore a sheet-script change under rule D3 (a changes file, a version at merge). Comment passes on
   `core.js` go in their own PRs, one at a time; other files are free of this.
6. `docs/archive/DONE-until-2026-11-04.md` is hash-pinned: new archive material goes in new files.
7. The architecture review's own steps (minify, gate floor, renames, `core.js` split) change identifiers the docs cite:
   each of those PRs updates the docs it breaks, so the doc cut should not run in parallel with a rename of the same names.

### 6.2 The PRs

| PR | Content | Needs Pierre | Size |
|---|---|---|---|
| **0** (this one) | README rewritten; this audit; one row in the reviews README | No (docs only) | done |
| **1: hygiene** | Fix section 4 (X2-X17, N1-N8): ROADMAP's Built and Done rows deleted and its malformed row fixed, INTEGRATOR "Open work" rewritten from today's state, AGENTS line 9, `ship.md` W18, `admin.md` A4 wording, SECURITY's cell limit, FISH_PATH's stale questions, the reviews README (four rows and the stale cells), the code comments of X17. STATUS stays the integrator's | `index.html` wording (integrator's call, easy to correct, but tell him); rule wordings (A4, W18) are his to OK. `privacy.html` is the separate privacy PR (6.3 (d)) | to be sized with tools/effort.py |
| **2: decision records** | `docs/decisions/` with a template (context, decision, Pierre's words and date, consequences), numbering, an index; W19 reworded (decisions go to a record, not into ARCHITECTURE); AGENTS "Where decisions live"; `tests/docs.test.js` checks (every record has its source and date, links resolve) and `LEARNING.md` section citations; first records seeded from LEARNING "Decision log" and the Q-number references | Answered: structure approved; W19's new wording goes in rules PR #1086, so this PR follows its merge | to be sized with tools/effort.py |
| **3: version history out** | The sheet script's history leaves ARCHITECTURE:642 (93,791 B) for an append-only file (new, not the frozen archive); `tools/sheet_version.py` and its tests write there; `Code.gs`'s header line unchanged | No (follows PR 2's structure) | to be sized with tools/effort.py |
| **4: ARCHITECTURE as a map** | One section per PR, largest first (Progress sync, Data files, Admin, Front end, Subjects, Tools): the spec of the present moves to a spec file or stays, the history moves to a decision record or `docs/archive/`; each cited heading kept as a stub; ARCHITECTURE ends at about 50 KB (the review's figure) | The structure (once, in PR 2) | to be sized with tools/effort.py, per section |
| **5: LEARNING as a spec** | The spec of the algorithms in force (the review: about 50-100 KB); one-feature histories, "not adopted" and "no change made" measurements move to a notebook of studies (`docs/reviews/` or `docs/archive/`); the Decision log becomes records | Same | to be sized with tools/effort.py |
| **6: ROADMAP and the handovers** | ROADMAP's "Next" cut into rows of a bounded length with links to a record or study; HANDOVER reduced to what has no other home (external resources, one-time setups, the redeploy steps) and INTEGRATOR's dated handovers folded into habits | No | to be sized with tools/effort.py |
| **7: missing documents** | `CONTRIBUTING.md`, a glossary, a data-files map, `tools/README.md`, an issue template, a root or `.github` security policy with a reporting channel | No: licence unchanged, security contact answered (6.3) | to be sized with tools/effort.py |
| **8: keep it from drifting** | Size and line-length budgets in `tests/docs.test.js` for every living doc (it has them for AGENTS and STATUS only); a check that README's and `privacy.html`'s subject names match `SUBJECTS`; a one-off comment pass per module for the "what and why, now; history in the record" policy (code PRs, `core.js` last: coupling 5) | The comment policy | to be sized with tools/effort.py |

PRs 1, 2 and 7 (except the policy) can start now and in parallel; 3-6 follow PR 2; 8 follows 4 and 5.

### 6.3 Questions for Pierre, and his answers (2026-11-18, 11:42-11:44 Manila)

- (a) **The structure of step 11** (decision records in `docs/decisions/`, ARCHITECTURE as a map of about 50 KB, LEARNING
  as a spec, history in records and `docs/archive/`) **and a new wording of rule W19.** Answered "ok" to the new W19
  (a PR updates the docs that describe what it changes and adds a short decision record in `docs/decisions/` for a
  decision; history stays in git and the PRs), which goes in the rules PR #1086, and "ok" to the restructuring plan of
  6.2. **The plan is approved.** The integrator launches its PRs in order after #1086 merges.
- (b) **The licence of the code** (section 5). Answered "A pour l'instant": `LICENSE` stays all rights reserved for now;
  the README says so.
- (c) **A contact for reporting a vulnerability.** GitHub's private vulnerability reporting is already enabled. The line in
  `docs/SECURITY.md` that points to it is made in the privacy PR (`claude/privacy-1118`), not here.
- (d) **The wording of `privacy.html`** for three subjects, the live mode and where the photos come from (finding 3).
  Answered "ok" to an update checked against the code and shown to him before it publishes: a separate PR
  (`claude/privacy-1118`).

In 6.2, PR 7's two Pierre items are therefore settled (licence: unchanged; security contact: GitHub's private reporting,
the `SECURITY.md` line in the privacy PR), and PR 1's `privacy.html` change moves to that PR.

## 7. What I checked and what I did not

- **Checked:** the file count against `git ls-files` (98); the sizes with `wc -c`; section sizes of the three big files by a
  script over their headings; the 17 contradictions by reading the cited cell or line; every claim in the new README
  against `core.js` `SUBJECTS` (`pages`, `beta`, `open`), `app.js` `MODES` and `UNITS`, `live.js`, `index.html`,
  `manifest.webmanifest`, the workflows and `tests/slot.js`; `tests/docs.test.js` and `tools/rename_app.py --check` pass.
- **Not checked:** each study's status (README rows only); the text of rules other than those named; LEARNING's and
  ARCHITECTURE's individual claims against the code beyond the ones cited; Google's real cell limit (N1); any real
  names in the docs beyond INTEGRATOR "Real people" (clean: it names no one), because rule D2 has no mechanical check;
  runtime behaviour (nothing was run in a browser).
