# Reviews and design studies

Every review and study was first written as a private Claude doc or artifact on claude.ai, in Pierre's original Claude account. **Those links do not open from another account.** The latest round of each review is copied here, with a status header saying what has been fixed since. Earlier rounds and studies are summarised below: their decisions are in `AGENTS.md`, their leftovers in `ROADMAP.md`.

## Copied in full (latest round, 2026-11-01)

| File | Review | Open items |
|---|---|---|
| [2026-11-01-code-re-review.md](2026-11-01-code-re-review.md) | Senior developer, second round (main @4f6df67) | `data.json` one genus per line, Prettier + modules, tests for `photoSet`/`distractors`, report rate limit if abused, repo size |
| [2026-11-01-admin-re-review.md](2026-11-01-admin-re-review.md) | A new admin, second round | Second-admin token steps untested; three low items |
| [2026-11-01-ra-re-review.md](2026-11-01-ra-re-review.md) | A first-time RA, second round | Phone hammer icon label, tablet name cut, red "!" on Review 0 (check), like-for-like wrong-answer photos |
| [2026-11-01-design-re-review.md](2026-11-01-design-re-review.md) | Expert UI designer, second round | p2, p9, p10, m5, m11 to verify; Goniastrea cover (Pierre) |
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
| Fact-check (10-31) | #22, then #25/#26 reverted anything that contradicted the lecture; "Other sources" notes | AGENTS.md rule 1; open lecture points in ROADMAP "Waiting on Pierre" |
| Photo usage per context (10-31) | IMR > Pierre > others in every context, games/sheet/finder sets (#96, #134, #171) | ARCHITECTURE.md "Photos per context" |
| Learning path + home study (10-31) | Learn > Practice > Identify, no daily-habit app; later two-door Home (#150) | AGENTS.md; leftovers in ROADMAP "Parked" |
| Look-alikes study (10-31) | Deck of ~20 classic montages + wrong-answer montage + rematch duel (#159) | ARCHITECTURE.md; copy of the study page in the project files folder (`lookalikes-study/`) |
| Corallite anatomy study (10-31) | One concept per card, rings on real macro photos (#15-#19, #177) | Tool stays in the Lab; next steps in ROADMAP |
| "Learning coral ID faster" study (10-31) | ReefCloud point drills, realistic mode, evening checks | ROADMAP "Parked" |
