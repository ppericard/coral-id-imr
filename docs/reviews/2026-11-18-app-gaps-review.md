# App gaps review: scope gaps and a global product review (2026-11-18)

Status: review, read-only. No app code, data file, photo or account was changed. Pierre's choices are in the last
section, as (a), (b)…; the integrator numbers the ones that need a number.

Why it exists. Pierre, 2026-11-18, after the fish's scientific genus units turned out to exist for circle 1 only (they
were built on 2026-11-04/05, when circle 1 alone was on the path; every circle joined the path on 2026-11-06, Q175, and
nobody extended them): "Et vérifie d'ailleurs s'il ne manque pas du contenu ailleurs dans le jeu similaire à ce
problème". Then, about 06:38 Manila, widened: "faire aussi un point global sur l'app pour identifier les gaps, ce qui
manque en terme de fonctionnalité ou de contenu".

- **Section 1**: content and features built for a subset (a circle, a subject, a rank, a level) and never extended when
  the scope grew.
- **Section 2**: what a complete identification-learning app for these three subjects would have that ours lacks, in
  features and in content, from the player's, the trainer's and the admin's side.

Labels (rule W11): **[measured]** = counted by a script on `main` @b6e0d263 (2026-11-18); **[read]** = read in a file or
a doc; **[guess]** = my judgement. Sizes (all [guess], one agent): **S** up to half a day; **M** one to two days; **L**
more, usually content work over many taxa. **L11** = the check level of rule L11 (0 none beyond the tests, 1 the app
world, 2 both worlds), and L12 (the real log) from level 1.

Status words: **decided, not built** (a decision covers it: a gap to fill); **in flight #N** (an open PR builds it);
**planned** (a ROADMAP or doc row, its status quoted); **integrator's call** (easy to correct, ships under the merge
contract); **needs Pierre** (an open choice); **intended** (a decision made it so: no gap); **not planned**. Every
"not planned" item was checked against ROADMAP "Declined" and the rules that close doors (L1 no decay, L8 no reward for
time, U7, U12, "no daily-habit app"): none is proposed again here.

## Summary

- **The genus gap is real and wider than the units.** 107 fish genera of circles 2-3 (wink families aside) have no game
  unit, no presentation, no ID marks and no name root; the build enforces all three for circle 1 only. The units are a
  small code change; the content is the bulk, and Pierre made it a precondition (2026-11-08).
- **Four more circle-1-only fish contents**: the families' behaviour, habitat and size lines (28 of 67), their juvenile
  classes (27 of 67), their look-alike pairs (15 of 67, none beyond circle 1), and the Find the X tiles (418 of 420 tiles
  in circle 1). And the 5-very-easy-photos target is checked for circle 1 only: 13 circle-3 families are below it.
- **The sea slugs repeat the pattern**: sourced genus marks for circle 1 (18 of 24) and almost none beyond (1 of 54).
  Their stars set has no achievement and nothing in the app reads it (Q369 (c) asked for one).
- **Built for the fish only, never carried to the sea slugs**: the variant table in the sheet's replay (one genus
  affected), the versioned offline files, part of the admin (after #1061, #1062). **Carried to the sea slugs first**:
  their own pooled statistics (#1060); the fish's are next (STATUS).
- **Corals**: no decided gap found where a decision says "every subject". Two content questions (below).
- **Section 2**: the largest gaps are reference content (no fish or sea slug key, no Fish basics, no species-level ID
  marks), the species level's second half (#1041, waiting on Pierre), the Practice games beyond the quiz (corals only),
  an accessibility audit never run, and the domain rename that is due before December 2026.

## 1. Scope gaps: built for a subset, never extended

### 1.1 Decided gaps (to fill)

| # | Gap | Evidence | Decision | Size | L11 |
| --- | --- | --- | --- | --- | --- |
| 1 | Fish scientific genus units for circles 2-3 | `app.js:744` and `:755` (`fishGenera`: `f.circle === 1`, species `s.circle === 1`); the same filter in `core.js:1137`, `:1148` (`fishVarTable`) and `:1403`, `:1408` (`fishReplayGen`, so the sheet's replay and the board tree too). 107 genera of circles 2-3 outside the wink families (5 of circle 2, 102 of circle 3; 17 the only genus of their family; Gobies alone 23), 191 species [measured] | Q175 (every circle on the path and in the progress); ROADMAP "Fish genera need a presentation and ID cues before they open widely": "Not built: … circles 2-3", and Pierre, 2026-11-08: "each genus needs a short presentation and its ID cues … before the genera are opened to more players" [read] | units M, after rows 2-3 (content L) | 2, and L12 |
| 2 | Fish genus presentation and ID marks (`plain`, `marks`) for circles 2-3 | `fish.json` genera: `plain` 122 of 130 in circle 1, 0 of 109 in circles 2-3; `marks` 83 and 0 [measured]. The build checks circle 1 only (`tools/build_fish.py:775`; `tools/fish_genus_marks.json` about: "for the circle-1 genera") | as row 1 | L | 0 |
| 3 | Fish genus name roots for circles 2-3 | `root` 76 + 54 `skip` = the 130 genera of circle 1, none beyond [measured]; `tools/build_fish.py:767` | ROADMAP "Game modes", Name roots: "Corals and fish circle 1 done; circles 2-3 next" (Q124 d) [read] | M | 0 |
| 4 | Fish family "Behaviour, habitat, size" lines for circles 2-3 | `fish.json` families `life`: 28 of 28 in circle 1, 0 of 39 beyond, while `marks` cover 66 of 67 (`tools/fish_sheets.json`) [measured] | Q11 and Q7 (2026-11-06: the family sheet, one per family of the book, Q1; agents draft, Pierre validates) [read] | M | 0 |
| 5 | Find the X tiles (the fish's box) beyond circle 1 | `fish-game.json`: 420 photos with a tile (`xc`), 418 in circle 1, 2 in circle 3, 0 in circle 2; every circle-1 family has 4 or more tiled observations, 0 of 4 circle-2 and 1 of 35 circle-3 families have any [measured]. A family with no tile never plays Find the X (`quiz.js` `planFind`: `tiles(t).length`) | Q321 D1, D4; judging/FISH.md "The fish's box": "the rest wait for the next rounds, entry by entry" (a decided judging process) [read] | M (a box pass, about 6 observations × 37 families) | 1 |
| 6 | Find the X on the species units | `quiz.js` `planFind` asks only units with no rank (`!rankOf(t)`): the families. The species are units since 2026-11-15 [read] | FISH_PATH "Formats and their order", 5: "the species once they are units" [read] | S (code) + tiles per species | 1 |
| 7 | Sea slug genus ID marks for circles 2-3 | `seaslug.json` genera `marks`: 18 of 24 in circle 1 (6 more in `none` with a reason), 1 of 22 in circle 2, 0 of 32 in circle 3; family `marks` 3 of 33 [measured]. `tools/seaslug_cues.py` stops only on "a circle-1 genus with neither" [read] | Pierre, 2026-11-17: "Tu peux compléter tout ce qui manque pour les nudibranches?"; study §9 step 7 ("family and genus sheets with sourced cues"); circles 2-3 in the game since 2026-11-16 [read] | L | 0 |
| 8 | Sea slug stars achievement | 21 species carry `star` in `seaslug.json` [measured]; only `tools/seaslug_game.py:318` writes it, nothing in the app reads it; `SEASLUG_ACH` (`core.js:3971`) has no stars achievement [read] | Q369 (c): "A 'stars' set … with an achievement" (2026-11-15-seaslug-list.md) [read]. Its test (the units are genera, the stars species) is the integrator's call: e.g. the genera holding a star at Advanced | S (`core.js`: a changes file, rule D3) | 0 |
| 9 | Fish species achievements that wait for nothing | fpct70 "Twilight zone" and fdauin20 "Local legend" are documented, not built (LEARNING "Fish achievements, around the global score": "Waiting, 6"); 70% is reachable since the species level's step 1 (families, genera and common names top out at 95%), whose gate is met (`sync.js` `speciesOn`: `SPECIES_SHEET` 161, the sheet script at v167) [read] | Q259-Q264, Q261 (fdauin20 = circle-1 species for now) [read]; fdauin20's "named" read as by common name at Advanced is my reading [guess] | S | 0 (timing by `learnsim --ach`, as the others) |
| 10 | Fish read their own pooled statistics in the app | the sea slugs have `SUBJECTS` `stats` (`core.js` `SEASLUGST_SHEET`, #1060); the fish entry has none [read] | STATUS "Next after the queue"; ROADMAP "Admin for every subject", PR 11 [read] | M | 2, and L12 |
| 11 | Sea slug replay without the variant table | `SUBJECTS` fish `replayed.vars` (`core.js:570`); the sea slugs' `replayed` has none (`core.js:771-777`). The app's exam asks each variant group for every subject (`model.js` `varLeft`), so for *Hexabranchus* (the only genus with juvenile photos: 7 [measured]) the sheet's replay may keep a learned mark the app would not give | Q391 b ("Learned asks each variant group"; Q391 a: one rule for every level), rules D8, D9: "the app and the sheet decide alike" (`model.js:390`) [read] | S (`core.js`, `Code.gs` through `sync_core.py`, rules D3-D5) | 1 |

Notes on row 1:

- **Nobody's % moves when the units come in** [read, to confirm by a test]. A species' scientific credit is
  `max(its scientific bar, half × its genus bar)` (`core.js` `treeScore`), so a genus unit at 0 adds nothing; only the
  ceiling rises. Today `fishScoreTree` (`core.js:4265`) packs the circle 2-3 species with no genus unit (`g = ''`), so
  their S stays 0: FISH_PATH "My progress (fish)": "Today the genera exist for circle 1 only, so families and every genus
  of the game reach 67%". The "genera" component of My progress would drop, as more genera at 0 enter its mean.
- **The sheet**: the change is in `core.js`, so a `tools/sync/changes/` file (rule D3), and the sheet's replay and board
  tree follow it (rule D8). A rules version (rule D5) is probably not needed, since no logged answer is on a new unit:
  to confirm in the PR.
- **The rank share** (Q382, `model.js` `SHARE`) gets more units below the families, so the check is level 2.
- **Also circle 1 only, and following row 1**: the genera's reference photos (`tools/fish_refs.py`: "every circle-1
  genus"), and the build's report of genera with no root (ARCHITECTURE "Not built yet").

### 1.2 Integrator's calls (easy to correct)

| # | Gap | Evidence | Size | L11 |
| --- | --- | --- | --- | --- |
| 12 | Sea slug files unversioned and out of the offline shell | `app.js` `UNITS.seaslug` `get`: `seaslug.json`, `seaslug-game.json` with no `?v=`; not in `sw.js` `SHELL` (`sw.js:26-57`). The reason given, "since only its group may open it" (ARCHITECTURE "Subjects", sea slugs), is stale since `open: 'all'` (2026-11-17). They fall in the revalidate branch: cached once fetched, but fetched again at every launch (198 KB + 1,060 KB) [measured, read] | S (a `?v=` reference; precaching them for everyone costs every install about 1.3 MB: a choice to make in that PR) | 0 |
| 13 | Sea slug circle achievements beyond circle 1 | the fish have fc2 and fc3adv; the sea slugs only ssc1adv (`core.js:3971`) [read] | S | 0 |
| 14 | Fish family-sheet genus content as an editor slot | `SUBJECTS` fish `content` genus slots: `cues`, `note` only; the genus `plain` and `marks` are not editable in the admin (ROADMAP row of row 2: "Not built: … the genus marks as a content-editor slot"); #1061 adds them for the sea slugs [read] | S | 0 |
| 15 | Stale words | `learn.js:939` comment ("circle 1, and the opt-in circles once on": the code reads the whole path); ARCHITECTURE "Fish scientific genera" and FISH_PATH "Levels" ("98 genera in circle 1": 130 today) [read] | S | 0 |

The admin demo plays circle-1 families only (`admin-demo.js:841`, `:961`): made-up data, harmless.

### 1.3 In flight (not new gaps)

- **#1061**: the sea slugs' Candidates, tag rows, sheet text slots (ID marks, Note), To do › Health.
- **#1062**: their WoRMS tree (`seaslug.json` `ref` is `{}` today [measured]) and the Tree's WoRMS view.
- **#1041** (Q394-Q398): species by their scientific names, fish and sea slugs; species exams; the sea slugs' species
  units, so their score tree and species achievements wait for it.
- **#1057** (Q385): the fish held-out set. Corals: Parked (ROADMAP "A held-out photo set": "corals later").
- **#1053**: the log keeps "*Goniobranchus* sp. 5".

Left after #1061 and #1062 (decided by Pierre, 2026-11-17: "Et pour les limaces de mer, toute la partie admin, c'est
prévu aussi ?"): their auto-sort, Photo review (Ease, Phase & framing, By difficulty) and To do's photo counts, which
#1061 lists as not built; and Photos › Look-alikes, Coverage › Games and the cover proposals, which I found by comparing
the fish's and the sea slugs' `SUBJECTS` `admin` `pages` [read]. **Decided, not built; M; L11 0.**

### 1.4 Needs Pierre

| # | Gap | Evidence | Why it is his | Size | L11 |
| --- | --- | --- | --- | --- | --- |
| 16 | Fish family look-alike pairs beyond circle 1 | `fish.json` families with `look`: 15, all circle 1; 0 of 39 in circles 2-3 [measured]. The pairs come from the IMR presentation and Pierre's declared groups (2026-11-06, from experience) [read] | a pair is structure: a change replays every fish player (Q363 h A); the groups were his. The sea slugs' precedent: a sourced survey, then his choice (Q390 D) | M | 2 (traps, confusion groups) |
| 17 | Fish juvenile classes beyond circle 1 | `fish.json` `juv`: 27 families, all circle 1 [measured]; 393 juvenile photos of circles 2-3 fall to the default class `j` (`core.js` `varKindOf`) [measured] | the classes of 2026-11-04 were a research note he approved; Q391 a set one rule for every level | M | 1 |
| 18 | The 5-very-easy-photos target beyond circle 1 | checked for circle 1 only (`tools/fish_judge.py:66`, `:236`; `tools/fish_game.py:107`); 13 circle-3 families are below 5 (Sea Moths, Stonefishes, Flying Gurnards, Stargazers, Jawfishes, Snake Eels, Garden Eels, Stingrays, Soles, Cornetfishes, Remoras, Needlefishes, Convict Blennies) [measured] | his target (2026-11-04) was set when circle 1 alone played | S (the report) + M (photos) | 0 |
| 19 | Practice games beyond the quiz for fish and sea slugs | `SUBJECTS` `pages`: corals `basics, genera, sheet, cmp, quiz, quiz-custom, quiz-duel, pairs`; fish and sea slugs `genera, sheet, quiz` (`core.js` SUBJECTS) [read]. No doc plans Compare, Custom quiz, the Duels tab or Memory for them [read] | not planned; rule L14 (side-by-side comparison) speaks for Compare and the Duels | M each | 1 |
| 20 | Basics module and glossary beyond the corals | Coral basics and the glossary (`app.js` `GLOSS_PAT`, corals only); Fish basics decided (FISH_PATH, ROADMAP "Fish basics": Next) but waits for the IMR fish presentation (STATUS question); sea slugs: none, while their marks use rhinophores, cerata, gills, mantle [read] | the sea slugs' is not planned | M | 0 |
| 21 | Sea slug Find the X | `UNITS.seaslug` `tiles: () => []`; no box on their photos (0 `bb`) [measured] | not planned; needs a box pass on their rubric | M | 1 |
| 22 | Sea slug held-out set | not mentioned anywhere [read]; 12 photos per species (3,014 for 206 species) [measured] | the corals were parked for the same reason (few photos) | S (decision) | 2 if built |

### 1.5 Corals

No decided gap found where a decision says "every subject": the content editor with its sources (#988), the Tree and
covers per node, the name roots (20 of 39, the rest with a reason), Analyses and Heatmap are there. Not carried, by
decision: circles and the circle editor (design note "Not in this design"), Find the X (Pierre, 2026-11-03: coral photos
do not read as small tiles), the held-out set (Parked), the variant rule (no juvenile or phase tags on coral photos).
Two content questions for Pierre (section 3, (i) and (j)).

### 1.6 Intended (no gap)

- The IMR content is circle 1 by nature: cues, slides `sl`, `imr` tags, phase lines, the cheatsheet `cs`, the PDF
  names `pdf`, `cni`, `sec` (rule C1).
- The starter core (`start`: circle-1 entries), the circle gate (`fishGate`), the circle-3 offer (fish only; the sea
  slugs' circle 3 opens by itself, documented in `UNITS.seaslug`).
- fdauin20 on circle-1 species "for now" (Q261); the sea slugs' stars all in circle 1 (circle 1 is built around them,
  Q377).
- No "I'm at IMR" answer for the sea slugs (study §8); their circles by popularity (Q369 a).
- learnsim's `circle1` profiles (`tools/learnprof.js`): a profile's prior knowledge, not a scope.
- `fishShown` (`learn.js:954`): its code includes every circle on the path; only its comment is stale (row 15).

## 2. Global product gaps

What the three subjects would have in a complete identification-learning app, area by area, against what the docs plan.
One line each; evidence is a file, a ROADMAP row or a count.

### 2.1 Onboarding and the tour

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Tour arrows over page text on phones; replaying the tour from the quiz loses the question | ROADMAP "Tour leftovers from the new-player walkthrough" | planned (Open question) | S each |
| A beginner of the fish or the sea slugs gets no basics first ("Start from scratch: a few easy families first") | `SUBJECTS` `start`; row 20 | Fish basics planned (Next, blocked on the IMR presentation); sea slugs not planned | M |
| The first-launch fallback calibrated on real beginners and experts | ROADMAP row of that name | planned (data needed) | M |

### 2.2 Learning paths and levels

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Species by scientific name, the half credit, species exams (fish, then sea slugs) | #1041, Q394-Q398; FISH_PATH "Open questions" 3, 5 | in flight, waiting on Pierre | L |
| A wrong pick of another family's species counted against both families | FISH_PATH "Unlock rules", "Not built" (rule L2; needs a fish rules version) | decided, not built | M (L11 2) |
| Species look-alike pairs (cross-family: dwarf angelfish against dark damselfish…) | ROADMAP "Fish look-alikes at any rank": "Designed, not built" | planned | M |
| Matrix (4 photos, 5 names) after Find the X | ROADMAP "Game modes", Matrix: "Agreed: after Find the X" | decided, not built | M |
| The fish genus step offered again after a "no" | ROADMAP "Fish: the path as a tree": "left … how to offer the genus step again" | planned | S |
| Coral knowledge at species level (tags per species feeding the genus traits) | ROADMAP "Fish: the path as a tree", folded in (Pierre, 2026-11-04) | planned (Next) | M |
| The family exam rethought (20 hard questions, scientific names) | FISH_PATH "Open questions" 5 | open | M |

### 2.3 Reference content

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Fish ID Key (every species of the IMR PDF, for EventMeasure) | ROADMAP "Fish ID Key for EventMeasure"; Home shows "Coming soon" | planned (Next, after the fish mode) | L |
| Sea slug ID key | `UNITS.seaslug` door: "There is no sea slug ID key yet" | not planned | L |
| Species-level ID marks | `fish.json` species with `marks`: 0 of 664; sea slugs 0 of 206 [measured]; the writing order families → genera → species (Q7) | decided, not started | L |
| Genus page "Don't confuse with" for sibling genera with our marks | ROADMAP "Fish genera need a presentation…": "Not built" | decided, not built | S |
| Coral ID Key: photos in place of the drawings | ROADMAP row of that name | planned (as photos come) | M |
| A calmer About and credits text; the sea slugs' About lists WoRMS alone, while their marks cite 24 sources (`tools/seaslug_cues.json` `src`) | ROADMAP "About and credits: a calmer rights text" (Next) | planned; the sea slugs' line integrator's call | S |

### 2.4 Offline and the installed app

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Sea slug files out of the shell | row 12 | integrator's call | S |
| No way to take a subject's photos offline before a dive or a boat day: photos are cached only as viewed, at most 2,500 (`sw.js` `PH_MAX`), against 24,386 fish game photos [measured] | `sw.js` | not planned | M |
| The domain and repository rename: a new origin loses the local progress of players not signed in unless handed over | ROADMAP "Domain and repository rename": "Next, before December 2026" | planned, **time-critical** | M |

### 2.5 Accessibility

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| No accessibility audit and no automated check (contrast, screen reader, keyboard); reduced motion is handled (`app.css`, 9 `prefers-reduced-motion` blocks), ARIA labels exist | no axe or a11y test in `tests/` [read]; ROADMAP "Next round of independent reviews" (4): "accessibility and performance auditor, new" | planned (after the work planned now) | M |

### 2.6 Feedback loops

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Regular reviews as a new RA on a phone; the one-tap answers used to check the difficulty targets | ROADMAP "Feedback without asking": "Next" | planned | M |
| Fish pooled statistics read by the app | row 10 | decided, not built | M |
| Re-measures that wait for data (photo exposure at ~500 fish answers, the comeback, time in the photo rating, photo-level features…) | ROADMAP rows "Waiting for data" | planned | – |

### 2.7 Social: boards, cohorts, live mode

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Live mode (a trainer and a class on the same questions) | #1049 (Q393) | in flight; one question open | L |
| Staff and cohort boards | #1050 (Q399) | in flight; one question open | M |
| The sea slugs' board ranks by the genera's mean, no score tree | `SUBJECTS` seaslug (no `score`) | comes with #1041 | M |

### 2.8 Trainer tools

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| A trainer's set (an entry and a final check, the same photos for a cohort, scored apart) | ROADMAP "Game modes", Trainer's set | open question | M |
| A trainer's view of a cohort's progress (weak units, stops), beyond the boards | ROADMAP "Roles, instances and cohorts" (trainer: "follows their progress"); #1050 brings boards only [read] | decided direction, not built | L |
| Trainer pages per organisation | ROADMAP "The app as a generic product" | idea | L |

### 2.9 Content coverage, by subject [measured]

| Subject | In the game | Missing or thin |
| --- | --- | --- |
| Fish | 67 families (28, 4, 35 by circle; 2 surprise-only), 239 genera, 664 species, 661 with listed common names (3 without, Q247); 24,386 game photos; 2,129 reference photos | rows 1-6 and 16-18; 2 species with no game photo (*Siganus margaritiferus*, *Pomacentrus armillatus*: sheet-only, decided); 18 species under 8 observations (12 in circle 1, 6 in circle 3); size facts 651 and depth 646 of 670; species marks 0 |
| Sea slugs | 33 families, 78 genera, 206 species (46, 60, 100) of the 452 rule C8 confirms in the Philippines; 3,014 game photos (12 a species), 537 at the genus level; 5,163 candidates | row 7; English names on 163 of 206 species, 5 of 78 genera, 6 of 33 families (what the sources give); no reference photos (`rep`: #1045 decides the reference rule); no WoRMS tree (#1062); species with no name yet (ROADMAP "Sea slugs without a species name") |
| Corals | 39 slate genera and 27 more in `data.json` `x` (Millepora, the 5 bonus genera, the Key-only genera); ID tips on 36 of 39 | the 3 starred genera without ID tips (*Merulina*, *Cyphastrea*, *Halomitra*: no IMR words for them); mnemonics 12 of 39 and "Other sources" 12 of 39 (by nature: IMR's and Pierre's); after curation about 9 genera with no close-up, most of them free-living mushroom corals, and the two thin genera of the photo sources study (approximate: excluded photos not subtracted) |

### 2.10 The admin's workflows

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| The sea slugs' admin after #1061 and #1062 | section 1.3 | decided, not built | M |
| Fish species pairs in the admin | ROADMAP "Admin for every subject", PR 10: "species pairs Next" | planned | M |
| A structure editor and look-alike line editor for the sea slugs | #1061, STATUS question | needs Pierre (a format, a replay) | M |
| Editors publish through a relay in the sheet script, with an audit trail (no GitHub token for an editor) | ROADMAP "Roles, instances and cohorts" (Q348) | decided, not built | L |
| The admin's draft kept on sign-out on a shared device | branch `admin-signout-seal`; ROADMAP Parked row | waiting on Pierre | M |

### 2.11 Data and analytics

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| The sheet rating the fish photos (Photo stats › Difficulty for the fish) | ROADMAP backlog 4: "once the sheet rates the fish photos" | planned | M |
| Analyses: the next views, the multiple-testing leftovers | ROADMAP "Analyses: next views", "… leaves open" | open | M |
| Content versions on each answer (a photo swapped, a re-rating, offline replays safe) | ROADMAP "Content versions and duplicate-safe answers" | idea (the rules versions do part) | M |

### 2.12 Identity and accounts

| Gap | Evidence | Status | Size |
| --- | --- | --- | --- |
| Name and a 4-digit code during the pilot; a proper account later (password manager, maybe Google or Meta sign-in) | ROADMAP "Roles, instances and cohorts" (Q349) | decided direction, not built | L |
| Staging, a preview per PR, own hosting and a domain | ROADMAP "Professionalise the platform" | waiting on Pierre (the study's questions) | M |
| IMR-owned content separated from the core app (an IMR edition) | ROADMAP "Separate IMR-owned content from the core app" | agreed direction, not started | L |
| Coral Finder out of the rules; Corals of the World permission before a wider deployment | ROADMAP rows of those names | Parked; "Before any wider deployment" | S, M |

### 2.13 ROADMAP "Next" and "Long term", in short

- **Next (agreed, not started)**, beyond the rows above: CI speed, the level's answer count following the log (one PR
  once `model.js`, `quiz.js`, `core.js`, `sync.js` are free), tool and admin data into `data/`, `CAL.U`, the
  expectation's slope, the taxonomy watch's monthly refresh, auto-sort follow-ups, the next round of independent reviews.
- **Long term**: roles, instances and cohorts (step 1 built); the app as a generic product; training for survey
  organisations (ReefCloud point drills, degraded photos, 3D plots); more subjects (benthos next); partial transfer
  between regions.
- **Not planned and not declined**, from this review: rows 19-22, the offline photo download (2.4), the sea slug key
  (2.3). Localisation (the app is English only, `lang="en"`) is not planned either; IMR's RAs read English, so it is a
  question only for the generic product.

## 3. Questions for Pierre

Each with a recommendation; none blocks the decided gaps of section 1.1.

- **(a) Fish look-alike pairs beyond circle 1** (row 16): a sourced survey of the circle 2-3 families (scorpionfishes,
  stonefishes, waspfishes and lionfishes; pipefishes, seahorses and ghost pipefishes; morays, snake eels and garden
  eels…: candidates, not checked [guess]) as the sea slugs' (Q390 D), its groups yours to accept, each accepted pair
  replaying every fish player? *Recommendation*: yes.
- **(b) Juvenile classes beyond circle 1** (row 17): a research note with sources for the 39 families, classes A, B, C
  as on 2026-11-04, for your approval? *Recommendation*: yes, with row 2's content.
- **(c) The 5 very easy photos per family, for every circle** (row 18): extend the target and its report?
  *Recommendation*: yes.
- **(d) Practice games for the fish and the sea slugs** (row 19): which of Compare, the Duels tab, the Custom quiz,
  Memory? *Recommendation*: Compare and the Duels tab first (rule L14).
- **(e) Sea slug basics** (row 20): a short glossary of the words their marks use (rhinophores, cerata, gills,
  mantle), sourced, before a basics module? *Recommendation*: the glossary first.
- **(f) Sea slug Find the X** (row 21): *Recommendation*: later, after the fish's circle 2-3 box pass.
- **(g) Sea slug held-out set** (row 22): *Recommendation*: not now (12 photos a species, as the corals).
- **(h) Offline photos before a dive** (2.4): a "keep this subject offline" switch? *Recommendation*: not now; ask
  the RAs whether they play without signal.
- **(i) Coral close-ups for mushroom corals**: does rule P2's close-up view apply to the free-living Fungiidae, or is
  colony and corallites enough for them? *Recommendation*: ask an IMR trainer, through the admin's Points.
- **(j) The 3 starred coral genera without ID tips**: sourced tips under their own label (never as IMR's, rule C1), as
  the fish genera's marks? *Recommendation*: yes.

## Method

- Code: searched `circle === 1`, `c1`, "circle 1 only" and their spellings in `*.js` and `tools/*.py`; read
  `core.js` `SUBJECTS`, `fishGen`, `fishVarTable`, `fishReplayGen`, `fishSpUnits`, `fishScoreTree`, the achievement
  lists; `app.js` `UNITS` (coral, fish, seaslug), `fishGenera`; `quiz.js` `planFind`; `sw.js`; `tools/build_fish.py`,
  `fish_judge.py`, `fish_game.py`, `fish_refs.py`, `seaslug_cues.py`.
- Data: field coverage per circle in `fish.json`, `seaslug.json`, `fish-game.json`, `seaslug-game.json`,
  `fish-cand.json`, `seaslug-cand.json`, `data.json` with `curation.json` adds, `tools/fish_sheets.json`,
  `tools/fish_genus_marks.json`, `tools/fish_genus_roots.json`, `tools/seaslug_cues.json`, by short Python scripts not
  committed.
- Docs: CLAUDE.md, AGENTS.md, docs/STATUS.md, docs/ROADMAP.md (every row's title and status, "Declined"),
  docs/FISH_PATH.md, docs/ARCHITECTURE.md "Subjects" and "Fish content", docs/LEARNING.md "Fish achievements", the sea
  slug study and list, the fish sheets study, judging/FISH.md; the open PRs' titles and #1061's description.
- Not done: no simulation, no app run, no player data read.
