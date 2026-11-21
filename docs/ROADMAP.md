# Roadmap: orientation and pointers to Linear

Open work and ideas not built are tracked in **Linear** (team REE; rule W19, [INTEGRATOR.md › Linear](INTEGRATOR.md#linear)): views [active](https://linear.app/reef-id/team/REE/active), [backlog](https://linear.app/reef-id/team/REE/backlog), [all](https://linear.app/reef-id/team/REE/all), and the [projects](https://linear.app/reef-id/projects/all). A new idea discussed and not built goes into a Linear issue, not here. This file keeps orientation: the backlog order Pierre set, where the content questions live, one pointer for each subject transferred to Linear (its status, details and what is left are in the issue), the subjects not transferred yet ("Not transferred yet" below: their rows as they were, with why, until they move; ship = delete the row, or update its status), and the Declined list. The rows as they stood when they moved: [ROADMAP.md at 7e28f51b2](https://github.com/ppericard/coral-id-imr/blob/7e28f51b2/docs/ROADMAP.md). **No "done" list here or anywhere**: what shipped is in `git log` (squash titles end with ` (#N)`) and the PR descriptions (Pierre, 2026-11-04); the list kept until 2026-11-04 is archived, frozen, in [archive/DONE-until-2026-11-04.md](archive/DONE-until-2026-11-04.md).

Sources: "thread X" = a Claude project thread with Pierre (in the original Claude account); dates are 2026. Design docs on claude.ai are private to Pierre and **not reachable from the new account** (handover 2026-11-01): the latest reviews are copied in [`reviews/`](reviews/README.md), and the decisions of the others are in AGENTS.md, docs/rules/ and below.

## Backlog in priority order (Pierre, 2026-11-08)

Set by Pierre after the 11-08 drain of open PRs and reset after the history rewrite (2026-11-08 afternoon); details of each item are in the rows below.

1. **Everything that speeds up development, before anything else** (Pierre, 2026-11-08): done, merged 2026-11-08 (#757, #756, #758: the sheet `VERSION` assigned at merge, the merge train, docs-only PRs skip the smokes, the unit-test and smoke speed-ups).
2. **Then the rest**: done 2026-11-08 (the admin Visits page #777; the fish judging flash or lamp bias #759, #766; the install nudge #768; the #664 re-check, row "Engine coherence review").
3. **Fish photo judging**: done; every candidate of circles 1-3 is judged (`python3 tools/judging_fish.py todo` lists any new one; 8 in 7 species on 2026-11-19).
4. **One admin for every subject** (until 2026-11-20 "Fish admin at parity with the corals, Analyses first"; Pierre: nearly short term, he needs the tools to keep going; 2026-11-20: one admin adapted to each subject, the sea slugs and any later one too), with the per-subject refit of the analyses: the admin one-engine study's steps, one PR each (row "One engine for every subject, what is left").
5. **Rights**: done; the Coral Finder crops are out of the app, `img/`, the git history and R2 (#748; Q121, Q300, Q294), no GitHub Support purge (his choice, 2026-11-08). The book stays a cited source (rule C2).
6. **Rule L11's tools** (comparator, fish profiles, the rated world): done, 7 merged on 2026-11-08.
7. **Medium term**: IMR-owned content separated from the core app (an IMR edition if needed); the calmer About text; the **"Professionalise the platform"** study.
8. Everything under "Parked" stays parked until Pierre brings it up.

## Content questions for Pierre, and questions for an IMR trainer

They live in the admin since 2026-11-05 (Pierre: he settles most of them himself and never reads a text list): **Inbox › To do › Points**, from [`data/points.json`](../data/points.json) (written by agents; most important first; neutral wording, rule C1), each with its page and Resolved / Stand-by / Dismiss; his status, notes and the trainers' answers are his curation (`curation.json` `points`). Add a new trainer question, nomenclature point, discrepancy between sources or content question there, not here ([spec/admin-players.md](spec/admin-players.md) "Points to handle").

## Next (agreed, not started)

- **Where simulations decide**: [REE-71](https://linear.app/reef-id/issue/REE-71)
- **Attach a photo or a screenshot to a report**: [REE-159](https://linear.app/reef-id/issue/REE-159)
- **Opening: at least four units open before a level is asked**: [REE-162](https://linear.app/reef-id/issue/REE-162)
- **learnsim: long runs crash, and the genus share**: [REE-11](https://linear.app/reef-id/issue/REE-11)
- **Photos out of the repo: top priority**: [REE-6](https://linear.app/reef-id/issue/REE-6), [REE-161](https://linear.app/reef-id/issue/REE-161), [REE-177](https://linear.app/reef-id/issue/REE-177)
- **CI speed, what is left**: [REE-121](https://linear.app/reef-id/issue/REE-121)
- **Deploy right after Candidate photos**: [REE-25](https://linear.app/reef-id/issue/REE-25)
- **Admin opening on a phone, what is left**: [REE-39](https://linear.app/reef-id/issue/REE-39)
- **Admin: Undo vs the background auto-run**: [REE-53](https://linear.app/reef-id/issue/REE-53)
- **Typed answers, what is left**: [REE-38](https://linear.app/reef-id/issue/REE-38), [REE-78](https://linear.app/reef-id/issue/REE-78)
- **IMR lecture photos never upscaled; the Corals of the World captures replaced by their originals**: [REE-60](https://linear.app/reef-id/issue/REE-60)
- **Analyses: structure views**: [REE-23](https://linear.app/reef-id/issue/REE-23)
- **iNaturalist API v1 to v2**: [REE-122](https://linear.app/reef-id/issue/REE-122)
- **More good fish photos we missed**: [REE-123](https://linear.app/reef-id/issue/REE-123)
- **The feedback sheet's decisive lines**: [REE-61](https://linear.app/reef-id/issue/REE-61)
- **About and credits: a calmer rights text**: [REE-51](https://linear.app/reef-id/issue/REE-51)
- **Coral ID Key: photos in place of the drawings**: [REE-79](https://linear.app/reef-id/issue/REE-79)
- **The Tree tab: covers and sheets at any level, for any subject**: [REE-12](https://linear.app/reef-id/issue/REE-12), [REE-124](https://linear.app/reef-id/issue/REE-124)
- **Analyses: next views**: [REE-41](https://linear.app/reef-id/issue/REE-41)
- **Analyses: what the multiple-testing correction leaves open**: [REE-125](https://linear.app/reef-id/issue/REE-125)
- **"Did you know?" tips, the next ones**: [REE-13](https://linear.app/reef-id/issue/REE-13)
- **Do sheet readers progress faster?**: [REE-80](https://linear.app/reef-id/issue/REE-80)
- **Activity outside the quiz, signed in or not**: [REE-40](https://linear.app/reef-id/issue/REE-40), [REE-126](https://linear.app/reef-id/issue/REE-126)
- **Professionalise the platform**: [REE-81](https://linear.app/reef-id/issue/REE-81)
- **Recalibrate the first-launch fallback on real beginners and experts**: [REE-82](https://linear.app/reef-id/issue/REE-82)
- **Re-measure whether the photo quiz presses on the same genus or pair too long**: [REE-83](https://linear.app/reef-id/issue/REE-83)
- **Stop favouring unanswered photos while the opening hold is on**: [REE-84](https://linear.app/reef-id/issue/REE-84)
- **No new genus after a miss outside the path?**: [REE-127](https://linear.app/reef-id/issue/REE-127)
- **Credits, later**: [REE-50](https://linear.app/reef-id/issue/REE-50)
- **Fish sheets at three levels**: [REE-54](https://linear.app/reef-id/issue/REE-54), [REE-74](https://linear.app/reef-id/issue/REE-74)
- **Ability calibration, after the wrongly-given fix**: [REE-128](https://linear.app/reef-id/issue/REE-128)
- **After the fixes of 2026-11-04**: [REE-129](https://linear.app/reef-id/issue/REE-129)
- **Admin per-genus abilities with the level's move**: [REE-130](https://linear.app/reef-id/issue/REE-130)
- **Remove the fish easy-photos bootstrap once fish answers exist**: [REE-85](https://linear.app/reef-id/issue/REE-85)
- **A progressive path for juveniles, colour phases and sexual dimorphism**: [REE-131](https://linear.app/reef-id/issue/REE-131)
- **Fish look-alikes at any rank**: [REE-86](https://linear.app/reef-id/issue/REE-86)
- **Look-alike pairs between species: the mimicry class, the rest**: [REE-45](https://linear.app/reef-id/issue/REE-45), [REE-87](https://linear.app/reef-id/issue/REE-87), [REE-163](https://linear.app/reef-id/issue/REE-163)
- **Fish confusion at several ranks**: [REE-55](https://linear.app/reef-id/issue/REE-55)
- **Species photos: agent pre-proposals, never blocking**: [REE-74](https://linear.app/reef-id/issue/REE-74)
- **Fish commonness: swap in Reef Life Survey Siquijor 2025 when published**: [REE-88](https://linear.app/reef-id/issue/REE-88)
- **FishBase as a fish photo source, next**: [REE-17](https://linear.app/reef-id/issue/REE-17), [REE-89](https://linear.app/reef-id/issue/REE-89)
- **Fish photo judging, next**: [REE-52](https://linear.app/reef-id/issue/REE-52)
- **Fish judging: a flash or lamp on a dark background is not a night shot**: [REE-74](https://linear.app/reef-id/issue/REE-74)
- **Contrast correction on the Learn sheets**: [REE-132](https://linear.app/reef-id/issue/REE-132)
- **Fish ID Key for EventMeasure**: [REE-9](https://linear.app/reef-id/issue/REE-9)
- **Fish achievements**: [REE-15](https://linear.app/reef-id/issue/REE-15), [REE-30](https://linear.app/reef-id/issue/REE-30), [REE-56](https://linear.app/reef-id/issue/REE-56)
- **Fish welcome question**: [REE-57](https://linear.app/reef-id/issue/REE-57), [REE-90](https://linear.app/reef-id/issue/REE-90)
- **Watermark pass, the rest**: [REE-18](https://linear.app/reef-id/issue/REE-18)
- **Fish basics, the rest**: [REE-133](https://linear.app/reef-id/issue/REE-133)
- **Fish families left out on 2026-11-08**: [REE-91](https://linear.app/reef-id/issue/REE-91)
- **Corals of the World: permission or replacements before any wider or commercial deployment**: [REE-92](https://linear.app/reef-id/issue/REE-92)
- **IMR lecture photos, second pass**: [REE-93](https://linear.app/reef-id/issue/REE-93)
- **Fish: the path as a tree, with a scientific genus level**: [REE-26](https://linear.app/reef-id/issue/REE-26), [REE-27](https://linear.app/reef-id/issue/REE-27)
- **Scientific genera: the step feels too early**: [REE-94](https://linear.app/reef-id/issue/REE-94)
- **A level's group, per parent?**: [REE-158](https://linear.app/reef-id/issue/REE-158)
- **Fish genera need a presentation and ID cues before they open widely**: [REE-95](https://linear.app/reef-id/issue/REE-95)
- **Fish common names: 1 to 3 curated per species**: [REE-33](https://linear.app/reef-id/issue/REE-33)
- **A held-out photo set**: [REE-58](https://linear.app/reef-id/issue/REE-58)
- **Auto-sort follow-ups**: [REE-134](https://linear.app/reef-id/issue/REE-134)
- **Measured photo block: the full run**: [REE-19](https://linear.app/reef-id/issue/REE-19)
- **Modules**: [REE-64](https://linear.app/reef-id/issue/REE-64)
- **Architecture review, steps 3 and 4: what is left**: [REE-29](https://linear.app/reef-id/issue/REE-29)
- **One engine for every subject, what is left**: [REE-28](https://linear.app/reef-id/issue/REE-28)
- **New-RA phone review, 2026-11-20: My progress and the quiz photo on a phone**: [REE-70](https://linear.app/reef-id/issue/REE-70)
- **Level-dependent target, checked by the players**: [REE-96](https://linear.app/reef-id/issue/REE-96)
- **Simulated profiles fitted to real players**: [REE-97](https://linear.app/reef-id/issue/REE-97)
- **Lecture position bias**: [REE-98](https://linear.app/reef-id/issue/REE-98)
- **Recalibrate the comeback after a break with the players' data**: [REE-99](https://linear.app/reef-id/issue/REE-99)
- **Next round of independent reviews**: [REE-100](https://linear.app/reef-id/issue/REE-100)
- **Independent review of the learning algorithm**: [REE-135](https://linear.app/reef-id/issue/REE-135)
- **Engine coherence review: its 8 decisions**: [REE-10](https://linear.app/reef-id/issue/REE-10)
- **Time in the photo rating**: [REE-16](https://linear.app/reef-id/issue/REE-16), [REE-76](https://linear.app/reef-id/issue/REE-76)
- **Photo memory that fades with time**: [REE-101](https://linear.app/reef-id/issue/REE-101)
- **More look-alike duels when several genera are shaky**: [REE-136](https://linear.app/reef-id/issue/REE-136)
- **Name-similarity confusion**: [REE-24](https://linear.app/reef-id/issue/REE-24), [REE-102](https://linear.app/reef-id/issue/REE-102)
- **Photo difficulty with few genera open**: [REE-103](https://linear.app/reef-id/issue/REE-103)
- **Short lessons, Duolingo-style**: [REE-137](https://linear.app/reef-id/issue/REE-137)
- **The expectation's slope, and per-format guess rates**: [REE-104](https://linear.app/reef-id/issue/REE-104)
- **Photo-level features in the photo difficulty**: [REE-105](https://linear.app/reef-id/issue/REE-105)
- **Featured-photo suggestions from the data**: [REE-106](https://linear.app/reef-id/issue/REE-106)
- **Taxonomy reference: the fish section of `tools/taxonomy.json`**: [REE-107](https://linear.app/reef-id/issue/REE-107)
- **Growth form + quality guesses for auto-refilled candidates**: [REE-108](https://linear.app/reef-id/issue/REE-108)
- **Near-duplicate / redundancy suggestions among IMR + Pierre photos**: [REE-74](https://linear.app/reef-id/issue/REE-74)
- **Tour leftovers from the new-player walkthrough**: [REE-49](https://linear.app/reef-id/issue/REE-49)
- **Paliform-lobe photos in Corallite anatomy**: [REE-109](https://linear.app/reef-id/issue/REE-109)
- **The level's answer count follows the log**: [REE-42](https://linear.app/reef-id/issue/REE-42)
- **Full replay, what is left**: [REE-138](https://linear.app/reef-id/issue/REE-138)
- **Fish progress replayed from the answer log**: [REE-59](https://linear.app/reef-id/issue/REE-59)
- **Domain and repository rename, with a migration for players**: [REE-110](https://linear.app/reef-id/issue/REE-110)
- **Separate IMR-owned content from the core app**: [REE-34](https://linear.app/reef-id/issue/REE-34)
- **Sea slugs without a species name**: [REE-111](https://linear.app/reef-id/issue/REE-111)
- **Sea slug achievements, after the first version**: [REE-32](https://linear.app/reef-id/issue/REE-32)

- **Placement test for "IMR course" and "know well"**: [REE-112](https://linear.app/reef-id/issue/REE-112)
- **First-launch question, follow-ups**: [REE-139](https://linear.app/reef-id/issue/REE-139)

## Admin for every subject (corals and fish)

Pierre approved (2026-11-04) a pooled admin for corals and fish: the same groups, tabs and filters, each subject describing itself ([spec/admin.md](spec/admin.md) "Admin for every subject: the pooled model"). Twelve small PRs; **each keeps the coral admin working**, checked by `tests/admin.smoke.js` (both widths, coral pages unchanged; fish pages get their own checks in the same smoke). Fish was invisible to players while the beta was admin-only (open to every player since 2026-11-06, Q158). Nine are built; the pointers below lead to what is left.

Pierre's decisions (2026-11-04, on the design study's questions):
- **One subject switch for everything**, To do included, each side of the switch showing its own to-do count.
- **Photos per species**: 8 observations in play per circle-1 species, 12 for the PDF's 24 most sighted, 5 for a species met only on the surprise cards (5 photos in play and 5 candidates, Q372); candidate cap 30 photos per species, +10 per extra phase, at most 60 (Q36, [spec/fish-photos.md](spec/fish-photos.md)). Per entry: 5 easy photos and every IMR phase at least once (the study's proposal).
- **Colour phases are photo tags**, not sections (juvenile, female, terminal male...).
- **Colour "cast" is a level of colour loss**: none / slight / strong / monochrome (not a hue).
- **The judging pass also proposes crops** (as the coral candidate pass does).
- **Look-alike pairs** from the data, IMR, players' confusions and reference sites; **the cues always sourced** (rule C2).
- **No IMR photos for fish**: iNaturalist covers every species.
- **Fish answers are logged to the sheet from the very first second** (Pierre, 2026-11-06, replacing the earlier plan to log once curated photos enter the game; PR 11).
- **The coral "Genera" page becomes a subject-neutral units page** (genera for corals; for fish, since the units plan of 2026-11-06, the book's families with their genera and species).

- **Photo review for fish (plan PR 9)**: [REE-62](https://linear.app/reef-id/issue/REE-62)
- **Fish Look-alikes (plan PR 10)**: [REE-46](https://linear.app/reef-id/issue/REE-46)
- **Log fish answers (plan PR 11)**: [REE-28](https://linear.app/reef-id/issue/REE-28)

- **Admin: one Remove with Undo and a list of removed photos (option A)**: [REE-44](https://linear.app/reef-id/issue/REE-44)

- **Open point for the plan: the fish auto-sort thresholds**: [REE-120](https://linear.app/reef-id/issue/REE-120)

## Game modes

Pierre, 2026-11-08: bring back every game mode of the ReefRecall study (his own app, studied on 2026-11-03: formats, research and recommendations in [FORMATS.md](FORMATS.md), the fish order in [FISH_PATH.md](FISH_PATH.md)) and add other kinds. Every mode draws from the one progression path (rule L4), fits one screen (U2), never rewards time (L1, L8), uses only declared or measured look-alikes (never invented groups), and graduates from the Lab only with his OK (U13). Built already: photo → 4 names, typed names, Again and look-alike duels, Memory, the custom quiz ("My weakest", "Recently missed": ReefRecall's "Clear my blindspots"), first-meeting cards (its "Dive briefing"). Practice ideas elsewhere: short lessons (Next), ReefCloud point drills, the realistic mode, the learning-path study's leftovers (Parked). Every mode opens to every subject, as shared code (Pierre, 2026-11-19 20:34, Q437: «il faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui, c'est du code commun»). Of the seven new modes below, four are approved by Pierre (2026-11-18; the formats the multi-photo study of #1081 names: Same or different?, Odd one out, Life stages matched, Down the tree, relayed by the integrator; his own words are not in the repo); the queue's order (the integrator's): Same or different?, Odd one out, Down the tree, Life stages matched. Sort them, Virtual dive and Trainer's set are ideas proposed on 2026-11-08, never approved.

- **Every game mode for every subject**: [REE-66](https://linear.app/reef-id/issue/REE-66)
- **Find the X**: [REE-63](https://linear.app/reef-id/issue/REE-63)
- **Matrix**: [REE-67](https://linear.app/reef-id/issue/REE-67)
- **Live mode, after version 1**: [REE-140](https://linear.app/reef-id/issue/REE-140), [REE-141](https://linear.app/reef-id/issue/REE-141)
- **Photo → trait**: [REE-142](https://linear.app/reef-id/issue/REE-142)
- **0 to 2 correct, or "None"**: [REE-143](https://linear.app/reef-id/issue/REE-143)
- **Name → trait**: [REE-144](https://linear.app/reef-id/issue/REE-144)
- **Macro lens hint**: [REE-145](https://linear.app/reef-id/issue/REE-145)
- **Name roots**: [REE-146](https://linear.app/reef-id/issue/REE-146)
- **Timed classification**: [REE-147](https://linear.app/reef-id/issue/REE-147)
- **Replayable challenge**: [REE-164](https://linear.app/reef-id/issue/REE-164)
- **Find the Critter**: [REE-148](https://linear.app/reef-id/issue/REE-148)
- **Regional (vernacular) names**: [REE-149](https://linear.app/reef-id/issue/REE-149)
- **Odd one out**: [REE-68](https://linear.app/reef-id/issue/REE-68)
- **Same or different?**: [REE-69](https://linear.app/reef-id/issue/REE-69)
- **Sort them**: [REE-150](https://linear.app/reef-id/issue/REE-150)
- **Down the tree**: [REE-21](https://linear.app/reef-id/issue/REE-21)
- **Life stages matched**: [REE-22](https://linear.app/reef-id/issue/REE-22)
- **Virtual dive**: [REE-151](https://linear.app/reef-id/issue/REE-151)
- **Trainer's set**: [REE-152](https://linear.app/reef-id/issue/REE-152)
- **Short-term study ideas not built**: [REE-165](https://linear.app/reef-id/issue/REE-165)
- **Learning-path study leftovers**: [REE-166](https://linear.app/reef-id/issue/REE-166)
- **Corallite anatomy next steps**: [REE-153](https://linear.app/reef-id/issue/REE-153)
- **Zoom ladder and Size ruler sliders**: [REE-154](https://linear.app/reef-id/issue/REE-154)

## Parked (medium term)

Pierre's short-term goal is ID on ideal photos, or on dives with time to examine each colony. These come after.

- **Player learning trajectories**: [REE-113](https://linear.app/reef-id/issue/REE-113)
- **Split `docs/LEARNING.md` and `docs/ARCHITECTURE.md`**: [REE-167](https://linear.app/reef-id/issue/REE-167)
- **Glossary entries for the words still unglossed on the genus sheets**: [REE-155](https://linear.app/reef-id/issue/REE-155)

- **IMR survey records as presence evidence for coral genera, if Pierre gets the data**: [REE-114](https://linear.app/reef-id/issue/REE-114)
- **Load order, further steps**: [REE-168](https://linear.app/reef-id/issue/REE-168)
- **The CSS minified at deploy**: [REE-169](https://linear.app/reef-id/issue/REE-169)
- **Bonus genera: more of them**: [REE-43](https://linear.app/reef-id/issue/REE-43), [REE-170](https://linear.app/reef-id/issue/REE-170)
- **Enlargement as a signal**: [REE-76](https://linear.app/reef-id/issue/REE-76)
- **Response time, genus term**: [REE-77](https://linear.app/reef-id/issue/REE-77)
- **Response time, photo term**: [REE-76](https://linear.app/reef-id/issue/REE-76)
- **Reuse the data in ReefRecall**: [REE-115](https://linear.app/reef-id/issue/REE-115)
- **Rights tagged for a later split**: [REE-171](https://linear.app/reef-id/issue/REE-171)
- **First-time RA review leftover: wrong-answer comparisons not like for like**: [REE-116](https://linear.app/reef-id/issue/REE-116)
- **Sign out keeps the draft on a shared device**: [REE-117](https://linear.app/reef-id/issue/REE-117)
- **PR preview links (test vs production)**: [REE-118](https://linear.app/reef-id/issue/REE-118)
- **Look-alike account names**: [REE-35](https://linear.app/reef-id/issue/REE-35)
- **Security follow-ups**: [REE-119](https://linear.app/reef-id/issue/REE-119)
- **Alerts lines of a name taken again**: [REE-36](https://linear.app/reef-id/issue/REE-36)

## Long term

- **Roles, instances and cohorts**: [REE-31](https://linear.app/reef-id/issue/REE-31), [REE-37](https://linear.app/reef-id/issue/REE-37), [REE-65](https://linear.app/reef-id/issue/REE-65), [REE-172](https://linear.app/reef-id/issue/REE-172)
- **The app as a generic product licensed to organisations**: [REE-173](https://linear.app/reef-id/issue/REE-173)
- **Training for survey organisations**: [REE-174](https://linear.app/reef-id/issue/REE-174)
- **More subjects**: [REE-20](https://linear.app/reef-id/issue/REE-20), [REE-156](https://linear.app/reef-id/issue/REE-156), [REE-175](https://linear.app/reef-id/issue/REE-175)
- **Content versions and duplicate-safe answers**: [REE-176](https://linear.app/reef-id/issue/REE-176)
- **Partial transfer between regions**: [REE-157](https://linear.app/reef-id/issue/REE-157)

## Not transferred yet

Subjects that stay tracked here, as they were, each with why it is not in Linear.

| Item | Source | Status |
|---|---|---|
| **Hosting capacity (watch)** (Pierre, 2026-11-05: as long as it holds, we hold; when it no longer holds, find other hosting): about 6.3 GB on R2 (2026-11-15) against the free 10 GB, 10.2 GB if every species reached the highest cap of 60 photos. Watched since 2026-11-18 by the infrastructure dashboard (PAGES.md "Infrastructure health"; the `Infra:` line of `python3 tools/brief.py`; [record](decisions/2026-11-18-infrastructure-health.md)). Not built: an R2 reading in CI once Pierre makes a read-only token; the hourly job reading the sheet's numbers (`INFRA_TOKEN`, Pierre's call). Detail: Measured 2026-11-15 ([AVIF study](reviews/2026-11-15-avif-study.md) §4): about 6.3 GB on R2 already (25,091 photos with an online original, 23,557 of them fish, about 237 KB a fish photo, the 1600 px files 62 % of the bytes); about 10.2 GB if all 662 species reached the highest cap of 60. The earlier estimate of 2 GB is out of date. Cloudflare R2's free tier is 10 GB with no egress fees. The candidate caps as shipped (Q36, ARCHITECTURE.md "Fish candidates") allow 16,720 fish candidate photos at most (37.8 per species on average); candidates stay remote on iNaturalist and FishBase, only the photos Pierre publishes are hosted. The dashboard warns past 70% of the Pages 1 GB, R2's 10 GB (by hand, `tools/infra.json`) and the sheet's 10 million cells; its first reading of R2 was 63%. | Pierre, 2026-11-05 | Next (watch) (not transferred: the migration marked it obsolete for its R2 read-only token, withdrawn with his agreement (05:48, #1350); the watch itself stays here) |
| **Fish mode** (Pierre, 2026-11-03: one engine for corals and fish, a WoRMS reference tree and an IMR teaching tree, circles 1-3): shipped as a beta on 2026-11-04 and open to every player since 2026-11-06 (Q158); the spec is [FISH_PATH.md](FISH_PATH.md), [spec/subjects.md](spec/subjects.md) and [spec/fish.md](spec/fish.md). Waiting on Pierre: more Dauin species of the IMR entries in circle 3 beyond the diver families; the Dauin barracudas for circle 2 (circle 2 keeps the PDF's one barracuda for now); the PDF species not confirmed in the Philippines (out of the game); the likely slips flagged in `check`, to compare with EventMeasure's list. Left from the original plan: the Fish ID Key and the ReefRecall game modes (rows below, and Game modes); the fish pages for the app's Look-alikes and Memory were not checked against the code. Detail: Rules from Pierre (2026-11-03): the EventMeasure / PDF name comes first, the WoRMS name as an indication beside it (`now`); circle 3 is the families divers want to recognise (muck diving), not PDF-based, plus the winks (whale shark, pelagic thresher); gobies stay out of circle 3 (tiny, hard to find on dives, of little interest to most divers; the PDF gobies stay in `fish.json` out of the game, for the Fish ID Key); species out of the game stay in `fish.json` (`out`); his own species-level iNaturalist observations count as confirmed even when Needs ID (for presence, and for the fish photo pipeline: his species-level photos are usable as that species). Winks: a light bonus shown as a rare surprise card in the quiz, never twice the same in a visit, one photo, 3 absurd choices with tongue-in-cheek labels and a friendly feedback line, never counted in the progress, no effect on photo ratings; the texts are in `fish.json` `wink`, validated by Pierre (2026-11-03). Winks exist for every fish player. The frame both subjects share (Pierre, 2026-11-04, from the fish UX study: subject switch, welcome question, Fish basics, achievements, Identify, opening fish to a group, app icon, leaderboards): FISH_PATH.md "Both subjects in one app". The fish beta feedback of 2026-11-04: the opening starts with a starter core of easy families (Butterflyfish, Angelfish, Damselfish, Surgeonfish & Unicornfish); the first photos are very easy (no juveniles, colour phases or strong sexual dimorphism at the very start), with an annotation pass giving each fish photo a difficulty prior until answers exist (FISH_PATH.md "The very start"); milestone cards for species names and for scientific names; "scientific name" (not "Latin") in player-facing text; a card that explains juveniles, colour phases and sexual dimorphism; a half fault that cannot be gamed; a non-linear global score (100% only with both the common and the scientific names of every species, about 80% common names only, about 85% scientific names only: FISH_PATH.md "My progress (fish)"); species names opening entry by entry, never all at once; the fish photo and admin decisions (FISH_PATH.md "Fish photos and the admin"). Fish answers are logged to the sheet from the first second (sheet v60, Pierre 2026-11-06) and replayed per subject since sheet v111-v112 (ARCHITECTURE.md "Other subjects' replays"). | chat 2026-11-03 | In progress (not transferred: Content curation: lives in the admin's Points (Inbox > To do > Points), not in Linear) |
| **Fish identification key: points for Pierre** (2026-11-04, after the key went in, rule S3): the **Clingfishes** were taken out of circle 3 (Pierre, 2026-11-04: not among the family labels of the key's index; `leftOut`). The **Thresher sharks** wink (Alopiidae) has none either (winks are not in the game, so no rule applies). Label mappings to check against the book's pages (notes in `keys`): Grunters (Terapontidae; javelin grunters too?), Basslets (Liopropoma?), Flounders (lefteye flounders only?). The key's region as the book states its scope (`region.area`). | Pierre, 2026-11-04 | Waiting on Pierre (not transferred: Content questions: live in the admin's Points, not in Linear) |
| Candidate photos from outside the Philippines (Coral Triangle: Indonesia, Malaysia, Papua New Guinea) for the genera short of photos (*Caulastraea*, *Acanthastrea*, *Leptastrea*, *Stylocoeniella*, *Zoopilus*, *Catalaphyllia*). Pierre, 2026-11-02: «Non, pour l'instant, on va pas élargir au-delà des Philippines.» (#337); don't propose again unless he asks. | chat 2026-11-02 | Declined for now (his words) (not transferred: Declined for now (11-02, #337); stays in ROADMAP) |

## Declined (don't propose again)

- Photo Elo or any stat without Pierre's own answers, and admin filters on "me" or test accounts (Pierre, 2026-11-04: his account is a real player's; he deleted his only test account; the "Without me", "Others / Me" and "This is also me" switches were removed).
- Anki deck.
- Museum specimens as presence evidence (Pierre, 2026-11-05: the presence rule, rule C8, stays as it is).
- Asking SeaLifeBase, Silliman University or Corals of the World for photos (Pierre, 2026-11-05: not at this point).
- A daily-habit / Duolingo-style app (units, streaks, spaced days, decay).
- Look-alike "families" invented by Claude; any invented grouping.
- "Reset this genus" or any bulk wipe in admin.
- Swipe gesture in the Candidates swiper (misfired when zooming; buttons only).
- Manual Easy/Medium/Hard level selector and the "Lecture photos" set in the quiz.
- The 4 static welcome cards (replaced by the guided tour).
- Asking for ReefCloud images (see Long term, "Training for survey organisations").
- An admin button to reserve a photo for the sheet or the games (`use`): added in PR #303, removed at Pierre's request (2026-11-01, for now); the field stays in `core.js`, unused.
- A text label under the phone hammer icon (Tools): Pierre, 2026-11-01: Tools is not what he wants to put forward at first.
- The public "Photos from Dauin / Philippines / All" filter (removed in PR #230: redundant with the IMR/own-first photo rule).
- The Reef colour theme (dropped in PR #219); Lagoon as default (Depth chosen, PR #218).
- Coral Finder book photos anywhere in the app (games, sheets, the Coral ID Key), including crops for the 27 extra Dauin genera (PR #184's idea): Pierre, 2026-11-08, copyrighted (© R. Kelley / BYOGUIDES); the 554 crops were removed, the Key's boxes are drawings. The book stays a cited source.
- A rule against simple codes (1234, 0000) at sign-in: Pierre, 2026-11-03, simple codes stay allowed so people remember them; homonyms are handled by "Is it you?" and the surname's initial.
- Publishing `curation.json` as a whole copy from the admin (lost curation on 2026-11-01; Publish merges key by key since PR #240).
- **Measured and declined (2026-11-04)**: drawing the admin's log pages (Players, Activity, Health, Journey) before `start()` has its candidate files (cand.json, suggest.json, metrics.json) and has run the auto-sort. Since #488 the sheet reads leave in parallel with those files, which are in (with `start()` done) about 1.2 s into a warm phone load, while the answer log comes at 3.5-4 s: about 0 s gained, against splitting `start()` in two (candidates in PHOTOS/KNOWN, the judging pass, metric flags, auto-sort) and a To do count that would change after the first draw. Measured again on 2026-11-19, cold, on a slow phone profile (CPU x4, 1.6 Mbps), where the files are not in by the time the log comes: `suggest.json` alone is 2-3 s of 19; only it is now left for later, on a Players page only ([spec/admin.md](spec/admin.md) "What the first page waits for"; the Inbox count then comes a few seconds after Activity).
- **Declined for now (Pierre, 2026-11-04)**: keeping a copy of the answer log or of players' data on the admin's phone (IndexedDB or any browser storage) to open the admin pages faster, including the players' saved copies kept between visits. Only the reuse of a read within one page load stays (admin speed, PR 1); the admin's own scripts may be cached by the service worker (no player data).
- A probabilistic model beyond BKT + Elo (IRT-style): Pierre, 2026-11-08, superseded (the domain-score bar, the global score and the rated world since).
- A group index or side panel on Genera (a global left sidebar): Pierre, 2026-11-08 (width goes to photos).
- An exam on photos at a fixed hard quantile (Q139) and an exam over two visits (Q143): Pierre, 2026-11-18, no (inventory L8; paraphrase, STATUS de83ee3a9, #1088). The exams are the mastery exam on each player's reserve and the species exams (Q395).
