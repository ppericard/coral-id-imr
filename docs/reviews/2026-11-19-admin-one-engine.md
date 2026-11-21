# One engine for every subject: the admin and the Learn pages (2026-11-19)

Read-only study of `main` at `3df77237a` (fetched 10:32 Manila), for the integrator. It covers what this morning's
audit ([2026-11-19-one-engine-audit](2026-11-19-one-engine-audit.md), learning engine) left out:
the admin (`admin.js`, every `admin-*.js`), `analysis.js`, the Learn pages (`learn.js`, the basics modules, the ID
Key), `home.js`, `progress.js`, and the tools that build what they show.

Pierre's frame: rule S1 as approved at 10:13 («un seul moteur, pas de cas particulier pour une unité ou une matière.
Une exception est permise quand elle est déclarée et nommée à un seul endroit, avec sa raison… Une exception qui touche
la progression des joueurs ou le format des données passe par Pierre»). Note: `docs/rules/subjects.md` on main still
has the 06:58 wording, without the last sentence. At 10:32 on Genera vs Tree: «le but est d'avoir un code commun entre
les matières, pas des codes pour chaque matière». At 10:33 he gave the method, which sets the order of this note:
«identifier les spécificités de chaque matière et voir comment les implémenter, soit avec des paramètres, soit avec des
bouts de codes spécialisés». So: §1 each subject's real specificities, §2 how each is built (a named parameter or a
named hook), §3 everything else, which is duplication to remove.

Labels used here: `Co-n`, `Fi-n`, `Sl-n` for the corals', fish's and sea slugs' specificities; `Dup-n` for the
duplication rows. They are not rule IDs (rule C4, rule S1 and so on are the project's rules).

**Short answer.** The admin is two admins behind one switch. `render()` (admin.js ~3641) picks a flat-coral renderer
or a tree renderer for 7 pages (Tree, Candidates, Coverage › Games, Photo review › By difficulty, Look-alikes, and Photo
review's Quality / Growth form vs Ease / Phase & framing). It uses three different proxies for "tree subject":
`ASUBJ.rank === 'family'`, `ASUBJ.sheets` and `ASUBJ.admin.cur`, and the S1 test catches none of them. Today all three
agree for the three subjects. But `rank === 'family'` no longer means what its comment says ("units are families"):
the sea slugs' units are genera (`unitRank: 'genus'`). A future tree subject at genus rank (benthos) would be sent to
the corals' renderers by one proxy and to the tree renderers by the others. Behind the proxies sit two photo and unit
registries (`DATA`/`PHOTOS` for the corals; `UNITA` / `FISHA` / `FISHC` for the tree subjects) and two places in
`curation.json` (its top level for the corals, `admin.cur ''`; a part per tree subject). Learn has the same split:
`viewGenera`/`viewGenus` read `DATA.gen` directly, while `viewFishList`/`viewFishSheet` (the tree sheets) serve fish
and sea slugs.

The pattern to copy is already in the code:
- **Photo stats › Overview** (`renderPstats`) is one renderer, `pstatsHtml`, fed by two adapters in one shape
  (`pstatsCoral`, `pstatsFish`).
- `tools/analyses.js` picks its photo adapter through a declared parameter, `SUBJECTS analyses.photos` (`true` or
  `'judged'`).
- The basics modules share one engine (`proto/basics.js` `BASICS.add`; `proto/fishbasics.js` registers its content
  into it).

None of the PRs proposed here changes a stored key or players' progress. Four optional later changes would alter a data
format (§6); they go to Pierre. Every PR before them works with in-memory adapters over today's files.

## 1. Each subject's real specificities (the domain, not today's code)

Each item is tied to something seen in the code or data. The last column says which pages it touches.

### Corals (`SUBJECTS[0]`, flat, `data.json`)

| | Specificity | Seen in | Pages |
|---|---|---|---|
| Co-1 | One playable rank, the genus, with no species units: a photo's species (`t`) is a name only | `rank: 'genus'`, no `sheets`; admin-coraltree.js header | both |
| Co-2 | Three views of a colony: Colony, Close-up, Corallites (the corallite view is the coral's key detail) | `views` (3), `zoom` | both |
| Co-3 | Growth forms: real and taught, but rule C4 forbids grouping genera by them | `forms.json`, `renderForm`, Basics trail | admin (Growth form review), Learn (basics) |
| Co-4 | The IMR lecture groups (1-11) as the teaching key; the Coral Finder book key (growth-form boxes, page numbers) as the identification tool | `data.json imrg`, `ig`; `data.json key`, `g.pages` ("Coral Finder p."), `proto/idkey.js` (1,143 lines) | Learn list and sheet, ID Key, admin Tree Key view, Coverage › Sheets & ID Key |
| Co-5 | Starred look-alike genera (★, untracked by IMR) and Millepora / the bonus genera (`x`) | `n` field, `BENTHIC`, `BONUS`, `data.json x` | Learn list (★ filter), sheet, admin Tree |
| Co-6 | IMR lecture material: lecture notes, mnemonic, lecture comparison images | content slots `imr`, `mn`; `DATA.cmp` | Learn sheet, compare page |
| Co-7 | The genus sheet's content slots: plain, ID tips, mnemonic, lecture notes, summary, Coral ID Key criteria, look-alike, to check, other sources | `SUBJECTS content.genus.slots` (already declared) | Learn sheet, admin content editor |
| Co-8 | Pages switched on for the corals only: compare (`cmp`), `pairs`, custom quiz, duel | `pages` | Learn, Practice |

### Fish (tree, `fish.json` + `fish-game.json`)

| | Specificity | Seen in | Pages |
|---|---|---|---|
| Fi-1 | A tree of three ranks with sheets at each (family, genus, species); the units are families | `rank: 'family'`, `sheets {family, genus, species}` | both |
| Fi-2 | One view (Photo); difficulty comes from the judged rubric (ease 1-5, light, framing, view angle) | `views` (1); `judging/FISH.md`; `FTAGS` | admin review, candidates |
| Fi-3 | Juveniles, colour phases, sexual dimorphism | `FREV_PHASE`, phase in `fish_game.py`, juvenile tiles in `treeFamily` | admin (Phase & framing, the montage's phase switch), Learn sheet |
| Fi-4 | The book's identification groups as the key (rule S3); circles 1-3 | `structure.circle`, `fish.json key`, `viewFishList` | both |
| Fi-5 | Common names (1-3 curated per species), IMR / EventMeasure names, nicknames | `cn`, `imrName`, `spCommon`, `vernHead` | Learn sheet, admin |
| Fi-6 | The mimicry class (pairs M1-M7 across families) | `mimPairs`, ROADMAP row | Practice, Learn look-alikes |
| Fi-7 | Auto-sort of candidates (the judged pass), FishBase as a source | `admin.autosort: true` (fish only), the `fishbase` origin | admin Candidates |
| Fi-8 | A Fish ID Key for EventMeasure (planned, "coming soon") | `UNITS fish identify: 'fishkey'`, `home.js viewFishKey` | Identify |

### Sea slugs (tree, `seaslug.json` + `seaslug-game.json`, beta)

| | Specificity | Seen in | Pages |
|---|---|---|---|
| Sl-1 | A tree with families above and genus units (`unitRank: 'genus'`), species sheets | `rank: 'family'`, `unitRank: 'genus'`, `sheets` | both |
| Sl-2 | Scientific names only; English names and nicknames as information (Pikachu) | Q369 (d); `seaslug_names.json`; `vernName` nick | Learn sheet |
| Sl-3 | Their own view angles and flags in the rubric (dorsal, lateral, head-on, rear, ventral; "features hidden") | `SUBJECTS admin.tags` (declared) | admin review, candidates |
| Sl-4 | A photo target per species (12 in play) | `admin.target: 12` | admin coverage, candidates |
| Sl-5 | Taxonomic groups as the list's grouping (Doridina, Cladobranchia, the other orders); genus look-alikes with literature sources | `listBy: 'family'`, `seaslug_groups.json`, `lsrc t: 'srcs'` | Learn list, sheet |
| Sl-6 | No basics module and no ID Key yet | `pages` without `basics`; `identify: 'fishkey'` | Learn |

## 2. How to build each specificity in the shared code

The rule for the choice: **a parameter** (data or a `SUBJECTS` / `UNITS` field) when the difference is a value, a list
or a label; **a named hook** (one function in one place, with its reason in a comment and, for a temporary one, a
ROADMAP row) only when the difference is real behaviour that data cannot express.

| Specificity | Build it as | Name (proposed) |
|---|---|---|
| Ranks and units (Co-1, Fi-1, Sl-1) | Parameter, already there | `rank`, `unitRank`, `sheets`. The corals are a tree of one rank: `sheets` absent means one rank. Every "is this a tree?" question reads one helper, `ranksOf(S)` (admin.js `fuRanks` already computes it) |
| Views (Co-2, Fi-2) | Parameter, already there | `views` |
| Growth forms (Co-3) | Named hook: an extra photo-review axis | `SUBJECTS admin.review` lists the axes; the corals' `growth-form` axis reads `forms.json`. Reason: rule C4 (forms are tagged, never used as a grouping) |
| The teaching key / list grouping (Co-4, Fi-4, Sl-5) | Parameter | `UNITS listBy` (already the sea slugs'), extended to an IMR-group grouping for the corals; the groups come from data (`imrg`, `fish.json key`, `seaslug_groups.json`) |
| The identification key (Co-4, Fi-8) | Parameter plus a module | `UNITS identify` (already there). When it is built, the Fish ID Key should reuse `proto/idkey.js`'s engine with its key as data, the way Fish basics reuses the basics engine. It is not duplicated today, because the fish side is a placeholder |
| Coral Finder page numbers, "In the key" (Co-4) | A sheet section the subject declares | `UNITS sheetParts` (§4) |
| ★ and bonus genera (Co-5) | Data, already there (rules L5, L6) | `n`, `BENTHIC`, `BONUS`; the ★ filter becomes a tree filter (`ttTagSel`, as admin-coraltree.js already does) |
| Lecture material, comparison images (Co-6) | Content slots (data) plus one sheet section | `content` slots (declared); `DATA.cmp` read through a `UNITS cmp()` getter |
| Content slots (Co-7, fish, sea slugs) | Parameter, already there | `SUBJECTS content` |
| One-subject pages (Co-8) | Parameter, already there | `pages`; each one-subject entry gets its reason beside it (S1: «avec sa raison») |
| Phases and juveniles (Fi-3) | Parameter | an `admin.review` axis `phase`, its list in the rubric data; the sheet's juvenile block shows whenever a node has phase photos (no subject test) |
| Common names, nicknames (Fi-5, Sl-2) | Data | `cn`, `nick` in the built files; the sheet shows what the node carries |
| Mimicry (Fi-6) | Engine (this morning's audit) | `mimPairs` (data-driven) |
| Auto-sort (Fi-7) | Parameter, already there: a feature switched on for one subject | `admin.autosort` (with its reason in core.js) |
| The rubric's rows (Fi-2, Sl-3) | Parameter: every subject declares its own | `SUBJECTS admin.tags`. Today only the sea slugs declare it, and the fish rubric is the hard-coded default (`admin-fish.js` `FROWS`, `FFLAGS_MINE`) |
| Photo target (Sl-4) | Parameter, already there | `admin.target` |
| Photo quality 1-3 (corals) vs ease 1-5 (judged) | **Not a domain difference**: the corals predate the judging rubric. Short term: one band-review page with the scale as a parameter (`admin.review` axis `{k: 'quality', scale: QUAL}` or `{k: 'ease', scale: 1-5}`). One scale for every subject would be a data-format change and a change to the corals' photo process: Pierre's call | |

## 3. Duplication to remove (today's per-subject code)

Line counts are approximate: each counts from the function to the next top-level `function` or `const`, so they
include some helpers. The coral genus page inside `render()` (admin.js ~3705 to ~4146) is estimated at about 440
lines. "Proxy" names the test that picks the branch today. The last column gives the PR in §5, the risk ("none" means
no stored key, no format, no player-visible change) and the test that can hold it (the "ratchet" is §5 PR 1).

| | Job | Corals' code | Tree subjects' code | Proxy | Shared already | Shared design | PR · risk · test |
|---|---|---|---|---|---|---|---|
| Dup-1 | Photos › Tree and per-node photo curation | `admin-coraltree.js` `renderCoralTree` (295) + Genera › Live (`render()` ~440), Hidden (41), Excluded (68) | `renderFishUnits` (343) + `fu*` helpers (admin.js ~1909-3040, about 1,100) | `rank === 'family'` | `taxtree.js`, `ttMount`, `ttCrumbs`, `ttTagSel` | **In flight: `claude/genera-into-tree`** (not on the remote yet) folds Genera into the Tree's node pages. Then one `renderTree(S)`, the only per-subject part being the tree's builder (`ctKeyOf`/`ctWormsOf` vs `fuTreeOf`/`fuWormsOf`), declared in one place (`TREE_BUILD`) | 0, 4 · none (admin) · ratchet + admin smoke on both sides |
| Dup-2 | The unit and photo registry the pages read | `DATA`, `PHOTOS`, `photos(n)`, `pending(n)` | `unitAdmin(S)`, `UNITA`, `FISHA`, `FISHC` | `S.sheets ? FISHA : DATA` (admin-analyses.js 1014, admin-heatmap.js 272-273, admin-taxa.js 136, admin-journey.js 1124) | `repUnit`, `repReg` | One `reg(S)` for every subject: a coral adapter builds `{gen, ph, units, spu}` from `data.json` + `curation.json` in memory (no file change) | 3 · none · unit test of the adapter + ratchet (`DATA.gen` in admin) |
| Dup-3 | Candidates swiper | `renderCand` (admin.js ~7271, 150 + helpers), `CSKIP`/`CFULL`/`CASIDE`, `candFlags` | `admin-fish.js` `renderFishCand` (a 565-line file), `FSKIP`/`FFULL`/`FASIDE`, the same chips (`adm-cfull`) | `admin.cur` | the source chips (`FB.sources`) | One swiper; per subject: `admin.files.cand` (corals: `cand.json`), `admin.tags`, `admin.target`, `admin.autosort`. Reading `cand.json` through an adapter avoids a format change | 5 · none if the draft writes stay where they are (`DRAFT` top level vs `DRAFT[TK]`) · the existing `fishcand` tests + smoke |
| Dup-4 | Photo review (rate photos in bands) | `renderQuality` (69), `renderForm` (122) | `renderFishReview` (166; ease, phase) | view option `rank: 'family'` | segment rows (`fRow`, `frevRow`: two copies) | One band-review page; axes from `SUBJECTS admin.review` (corals: quality, growth form; fish: ease, phase and framing; sea slugs: ease) | 6 · none (same writes) · smoke + ratchet |
| Dup-5 | Photo review › By difficulty | `renderDiff` (52) | `renderFishDiff` (64) | `ASUBJ.sheets` | the sheet's `?stats` read | One page on `reg(S)` and one tile (Dup-8) | 6 · none · smoke |
| Dup-6 | Look-alikes montage | `renderMont` (63) | `renderFishMont` (95), phase switch | `rank === 'family'` | the curation keys already have one shape: `mont {pair: {v, a, b, hide}}` ("the coral key names") | One montage; a phase switch when the subject's rubric has phases; the view picker from `views`. Overlaps the Tree tab row's "the admin's coral Look-alikes page reading the pairs in force" | 7 · none · smoke |
| Dup-7 | Inbox › Coverage › Games | `renderCov` (97) | `renderFishCov` (106) | `rank === 'family'` | `autosort.js fishCov` for the tree subjects | One coverage table; columns from `views` (corals) or phases (fish); a level switch from `sheets` | 7 · none · smoke |
| Dup-8 | Photo tiles with their tools | the genus page's tiles, `coralRepTile` (16) | `fishTile` (67), `fishRepTile` (33) | `PHOTOS[f] ? … : FISHA` (`repPhotoSubj`) | `srcTag`, `rightsTag`, `nameTag` | One tile on `reg(S)` | 8 · none · smoke |
| Dup-9 | The rubric in code | none (`QUAL`) | Three copies: `admin-fish.js` `FTAGS`/`FFLAGS`/`FROWS`/`FFLAGS_MINE`; admin.js `FU_TAGS`/`FU_FLAGS`; admin.js `FREV_PHASE`/`FREV_VIEW`. The fish rubric is the default and the sea slugs override it | `S.admin.tags ?` | `tagWords` | Every subject's rubric declared in `SUBJECTS admin.tags`, one `tagWords` | 2 · none (same codes; `judging/*.md` unchanged) · a test that every tree subject declares `admin.tags` |
| Dup-10 | Photo stats › Taxa | `admin-taxa.js` `!S.sheets` branch from `DATA.gen` | from `FISHC` | `S.sheets`, `FISHS !== S` | the page | Through `reg(S)` (Dup-2) | 3 · none · `tests/` of admin-taxa |
| Dup-11 | Players' Journey: sheets opened, own record | `admin-journey.js` "Genus sheets opened", `own = !!ASUBJ.replay` | the `sheetVisit` path | `ASUBJ.sheets` (7 lines, ~759-787), `replay` | page names are already subject-prefixed (`core.js pageName`, `pv`) | One section; its title from `S.one`/`sheetsTitle(S)` | 3 · none · smoke |
| Dup-12 | Visits: which subject reads the sheet's first tab | `SUBJECTS.find(S => S.replay)` (admin-visits.js 362, 587), admin.js `replayS` | | `replay` | | Goes with the engine audit's `replay` split (its item 1.3) | engine audit · sheet · S1 FLAGS (#1202) |
| Dup-13 | Learn: the list | `viewGenera` (~140) + `packGroups` | `viewFishList` (~100) | `UNITS list` | `UNITS listBy`, `lede`, `byRank` | One list; grouping from `listBy` (the corals' IMR groups + families + A-Z + ★ filter, as data) | 9 · players see nothing new if the HTML is identical · HTML snapshot per subject |
| Dup-14 | Learn: the sheet | `viewGenus` (~95), reads `DATA.gen`, `DATA.key`, `DATA.cmp` | `viewFishSheet` → `treeFamily` / `treeGenus` / `fishSpecies` (~490) | `UNITS sheet` | `lookHub` (reads `GX`), `esrc*`, `treeNote` | One sheet component, its sections from the node and the subject's declared `sheetParts` (Co-2, Co-4, Co-6) | 10 · as Dup-13 · HTML snapshot |
| Dup-15 | Learn: compare / look-alikes pages | `viewLookalikes`, `viewCompare`, `classics` (~160) read `DATA.gen` | the tree sheets' `treeGenusLooks` | `pages` (`cmp`) | `lookHub` | Read units through `GX` / `reg`. Opening these pages to fish or sea slugs is new to players, so it needs Pierre's words; making the code generic does not | 12 · none for the code · ratchet |
| Dup-16 | Home | `DATA.gen` (home.js 59, 67), `fish = !!GX(slate[0]).name` ("a subject whose units have names") | | data-shape test | `UNITS door`, `land`, `about` | A `UNITS` field (e.g. `named: true`), or `GX(n).name` read for every subject | 11 · none · ratchet |
| Dup-17 | My progress groups view | `DATA.imrg` (progress.js 164, quiz.js 2732) | none | `progress: [..., 'groups']` | `SUBJ.progress` (declared) | A `UNITS groups()` getter. Read-only, but `progress.js` also writes the achievements record (feats), so keep the change to the reader | 11 · none · ratchet |
| Dup-18 | Basics | `proto/basics.js` (979; the engine + the coral content) | `proto/fishbasics.js` (721) registers into `BASICS.add` | `UNITS basics` | **Already one engine** | Keep. Later: split the engine out of `basics.js`, so the coral content is a module like the fish's. Completion writes the feats `_basics` / `_fbasics` to the achievements record (`progress.js achBasics`): keep the keys | not in the list · none if the feat keys stay |
| Dup-19 | ID Key | `proto/idkey.js` (Coral ID Key) | `home.js viewFishKey` placeholder | `UNITS identify` | | Not duplicated yet. A design constraint for the Fish ID Key (ROADMAP "Fish ID Key for EventMeasure"): one key engine with each key as data | n/a |
| Dup-20 | Tools that build the pages' data | `datajson.py`, `apply_*.py` (a flat data.json) | `build_fish.py` (1,543) + `fish_game.py` (944) vs `build_seaslugs.py` (713) + `seaslug_game.py` (673). The sea slug builder reimplements `in_play`, `phase`, `crop`, `sure` without importing `fish_game.py` | n/a | the output shape (`seaslug.json` is "in fish.json's shape") | One tree-game builder with per-subject inputs (rubric, target, sources): the Tree tab row's "the builds' generic `tree` section per subject" | 13 · none if the output files are byte-identical · rebuild and diff |
| Dup-21 | Analyses | `analysis.js` is neutral (`rankRef(S)` from `sheets`, `unitRankOf`); `tools/analyses.js` picks its photo adapter by `analyses.photos` (declared); `admin-analyses.js` forks on `FISHA` vs `DATA` | | `SU.sheets` | the models | Through `reg(S)` (Dup-2) | 3 · none · ratchet |

Also seen: light and cover proposals (`admin-light.js`, `admin-covers.js`) are tree-only, shown through `{rank:
'family'}` options and the FISHC state. They are proposal pages of the judging and cover rules; once Dup-1 and Dup-2
are done they apply to every subject.

## 4. Target architecture

One admin and one Learn. Each component reads **one registry per subject** and **declared parameters**:

- **Registry** `reg(S)` (admin) / `GX` + `TREEU` (app): every subject as a tree of nodes (`id, rank, name, parent,
  children, photos, cover, content`). The corals are a one-rank tree built in memory from `data.json` (the pattern of
  admin-coraltree.js `ctKeyOf` and `core.js xGen`). Later it can be built as a file (§6 b).
- **Components**, one each: Tree + node page (Dup-1); Candidates swiper (Dup-3); band review (Dup-4, Dup-5); montage
  (Dup-6); coverage (Dup-7); tile (Dup-8); Learn list (Dup-13); Learn sheet (Dup-14); compare (Dup-15). Each reads
  only `reg(S)` and `S`.
- **Declared parameters** (`core.js SUBJECTS` / `app.js UNITS`): `views`, `sheets`/`unitRank`, `content`,
  `structure`, `pages` (with reasons), `listBy`, `identify`, `analyses.photos`, `admin.tags` (every subject),
  `admin.review` (new: the review axes), `admin.target`, `admin.autosort`, `admin.files`, `UNITS sheetParts` (new: the
  sheet's extra sections, e.g. for the corals the three views, the Coral Finder pages and the lecture comparisons).
- **Named hooks** (one place, each with its reason): the tree builders per data shape (`TREE_BUILD`, until the corals
  are a tree file); the growth-form axis (rule C4); the ID Key engine's per-key data. Nothing else should test a
  subject.
- **Precedent**: `renderPstats` → `pstatsHtml(pstatsCoral | pstatsFish)`.

The three proxies give way to one helper, `ranksOf(S)`, and then to nothing at all once every page reads `reg(S)`.

## 5. Small PRs, biggest duplication first (prerequisites first where needed)

Effort figures come from `python3 tools/effort.py --estimate`. admin M: median 49 min (range 18-56), like #908, #1013,
#1059, #1166, #1169. admin L: median 43 min (range 25-49), like #906, #942, #959, #1132, #1169. admin XL has n=1, so it
falls back to the L set. feature L: median 27 min (range 22-29), like #901, #948, #974, #976, #1058. feature M: median
18 min (range 5-30), like #899, #911, #917, #986, #1056. tooling M: median 15 min (range 6-24), like #960, #1040, #1144,
#1157, #1160. fix S: median 5 min (range 4-31), like #912, #1037, #1094, #1125, #1189. These measure agent time to
green checks; refactors of this size probably run longer.

0. **(In flight) `claude/genera-into-tree`**: the coral Genera tab into the Tree's node pages (Dup-1, first half). Do
   not duplicate it.
1. **S1 test ratchet for the admin and Learn** (tooling M; stacks on #1202, which rewrites the same test file). Each
   proxy (`rank === '…'`, `.sheets ?`, `.admin.cur ?` as a branch, `\bFISHS\b`, `DATA.gen` and `DATA.imrg` in shared
   renderers, `SUBJECTS.find(S => S.replay)`, `!s.hash`) gets a per-file count that may only go down (`ALLOWED` with
   counts and its ROADMAP row); `.sheets` has legitimate reads, so it gets a count, not a ban. #1202's FLAGS check
   sees only top-level `=== true` fields, so it should also see nested one-subject fields (`admin.autosort`,
   `admin.tags`, `admin.target`). Without the ratchet the duplication comes back.
   **Done** (`tests/subject-neutral-admin.test.js`, spec/admin.md "Each subject's admin part"): nine proxies counted per
   file (46 file-proxy pairs, 278 occurrences), 150 subject-named or twin top-level names listed by name with their Dup
   row (plus the count of such names in `autosort.js` and the two basics modules), two one-off lines, and four nested
   flags (`admin.autosort`, `csrc`, `target`, `tags`) in `tests/subject-neutral.test.js` FLAGS. No ROADMAP row names
   this study yet, so the entries cite the "One engine for every subject, what is left" row and the study's Dup rows.
   Each step below lowers its numbers in its own PR.
2. **The rubric declared for every subject** (Dup-9; admin M). Small and independent, so it can run in parallel with
   1. PR 5 needs it.
   **Done** (spec/admin.md "Each subject's admin part"): the fish declare `admin.tags` as the sea slugs do, both through
   `core.js` `treeRubric` (the shared rows once, the subject's views, light and flags beside); the admin reads it in one
   place (`admin.js` `tagRows`, `tagFlags`, `tagWords`, `tagText`) and the review rows' view and phase buttons read it too.
   Gone: the nine rubric constants and the four readers of the three copies (13 names), one `FISHS` read in `admin-fish.js`
   (277 occurrences to 276, 150 names to 137) and the `admin.tags` flag of `tests/subject-neutral.test.js` FLAGS (it is
   no longer one subject's). Checked against the old code on every value of every position and flag: the same rows,
   words and flags for both subjects, but the fish's impossible letters `v` and `f` and the sea slugs' review view
   buttons, which were the fish's and are now their own six views.
3. **One registry `reg(S)` with a coral adapter** (Dup-2, Dup-10, Dup-11, Dup-21; admin L). The prerequisite for 4-8.
   No page changes.
   **Done** (spec/admin.md "Each subject's admin part", `tests/registry.test.js`): `admin.js` `reg(S)`, `regLoad(S)`,
   `regRec(S, n)` in one block, the one switch the subject's declared data shape (`SUBJECTS` `flat`); a tree subject gets
   the object its files were read into (`UNITA`), the corals one built in memory in `repReg`'s shape (`reports.js`
   `flatReg`: `data.json` and the genus pages' photos under the draft, rebuilt per draft state; no file, no format
   change). Read by Analyses (`anGen`, the units' names, the thumbnails), Pairs and the Heatmap (one pair record, one
   roster from the registry's slate), Photo stats › Taxa (the corals' half; its tree half still reads the family pages'
   data, `FISHC`, step 4's), and the Journey (its units' names; one "sheets opened" section for every subject, the log's
   per-genus listing named once, `sheetsByUnit`). Gone: `unitWait`, the Pairs and Heatmap `gx`/`rec` twins; `fuRanks`
   renamed `ranksOf` (§2). The tree in force's registry (`FISHA`) still serves To do's reports, Health and the tiles
   (steps 4 and 8). The ratchet: 273 occurrences to 251, 45 file-proxy pairs to 41 (`.sheets` 66 to 50, `DATA.gen` 78 to
   73, `FISHS` 37 to 36), one name fewer (`fuRanks`). Checked: the demo admin's HTML of Taxa, the Heatmap, Pairs, four Analyses
   views and three Journeys, for each subject, identical before and after (1280 px, the clock fixed).
4. **One Tree** (Dup-1, second half; admin L): `renderTree(S)`, the builders declared in one place. Depends on 0 and
   3.
   **Done** (spec/admin-tree.md "The tab and its two views", `tests/treebuild.test.js`): `admin.js` `renderTree(S, id,
   view)` draws every subject's Tree page (the tree, the bar, the selects, All | IMR, Tag…, the drill-down, the content
   editor's boxes, the cards, the shared photo lists); `TREE_BUILD` holds the two builders, picked by the declared shape
   (`SUBJECTS` `flat`: `treeShape`, `treeBuild`) as `reg(S)` is: `flat` (the corals' `ctTree`, `ctRow`, `ctFilters`,
   `coralLive`) and `tree` (the fish's and the sea slugs' `fuTreeOf`, `fuWormsOf`, `fuRow`, `fuFilters` and their node
   page). `tvTree`, the help key and `admin-nodephotos.js` `NODE_PHOTOS` read the same shape. Gone: `renderFishUnits`,
   `renderCoralTree`, `fuTreeMount` (now the shared `treeMount`), `fuTagK`, `ctTagK`, and the three `ASUBJ.rank ===
   'family'` proxies of the Tree (the dispatch, `tvTree`, the help key) and `NODE_PHOTOS[ASUBJ.rank]`. The ratchet: 251
   occurrences to 246, 41 file-proxy pairs to 40 (`ASUBJ.rank` 21 to 17, `DATA.gen` in `admin-coraltree.js` 2 to 1: the
   genus page reads `reg(S)`), five names fewer. Checked: the demo admin's HTML of 61 Tree pages (each subject, Key and
   WoRMS, every node kind, plain, IMR on and four tags), before and after at 1280 px, the clock fixed: the same but for
   the unified behaviour, each the integrator's call (admin only): the view alone opens on its first node of the broadest
   rank for every subject (a coral genus, was the first lecture group; WoRMS's first genus, was its first family; the
   fish and the sea slugs as before); a tree subject's key group page has the drill-down select (the corals' and the
   other pages had it); the WoRMS families' select in the tree's order; the sea slugs' families' select labelled Family
   (was Genus). Photo stats › Taxa's tree half still reads `FISHC` (Dup-10, not the Tree's).
5. **One Candidates swiper** (Dup-3; admin L, the biggest single duplicate after the Tree). Depends on 2 and 3.
   **Done** (spec/admin.md "Each subject's admin part", spec/admin-photos.md, `tests/candbuild.test.js`): `admin.js`
   `renderCand(S)` draws every subject's swiper (the queue's switch, the row of toggles, the empty page, the card and its
   decision bar, the keys, the photo that does not load); `CAND_BUILD` (`// cand build: begin/end`) holds the builders,
   picked by the declared shape (`candBuild`, through `treeShape`, as `TREE_BUILD`): `flat` in `admin.js` (`candQueue`, quality
   and growth form, the cells' cap and the replace-a-colony page, Retest), `tree` in `admin-fish.js` (`fishQueue`, the
   target, the rubric's rows, the photos in play, Not this), each with the same fifteen members (listed above
   `CAND_BUILD`). The skipped, full, set-aside and pinned state is one `cst(S)` per subject. No stored key, draft write,
   `cand.json` or browser key changed, and no `SUBJECTS` field was added (`flat` already says the shape). Gone:
   `renderFishCand`, `FFULL`, `FASIDE`, `FSKIP`, `FPIN`, `CSKIP`, `CFULL`, `CASIDE`, the fish card's own wiring and the
   `ASUBJ.admin.cur` proxy of the dispatch (it and the loading branch of `renderFishCand`). The ratchet: `.admin.cur`
   25 to 24 in `admin.js` and 1 to 0 in `admin-fish.js`, `FISHS` 10 to 6 in `admin-fish.js`, six names fewer. Checked: the
   demo admin's `#view` HTML of 28 states (default, Tags open, Auto line and details, each source, the Checks queue, full and
   set aside shown and hidden, one skip, every one skipped, Show the skipped ones) for each subject at 390 and 1280 px, the
   clock and the queue seed fixed, before and after: identical but for the unified behaviour below (admin only, each the
   integrator's call): the corals' card now says "Photo not loading" with its link when its remote photo does not load (the
   fish's did); the empty page counts the candidates actually skipped (the corals' counted the queue's, set-aside ones
   included); the fish's and the sea slugs' toggles and skipped candidates, one set for both before, are one set each.
6. **One band review** (Dup-4 + Dup-5; admin L). Adds `admin.review` (the axes); the growth-form axis is the corals'
   named hook.
   **Done** (spec/admin-photos.md "Photo review", spec/admin.md "Each subject's admin part", `tests/reviewbuild.test.js`):
   `admin.js` `renderReview(S, id)` draws every subject's band page (the loading gate, the bar, the bands and their
   tiles, the zoom and the ×, the drag to another band, the keys) and `renderDiff(S)` draws By difficulty (the minimum
   of answers, Hardest | Easiest, "No answers yet"); `REVIEW_BUILD` (`// review build: begin/end`) holds the two
   builders, picked by the declared shape (`SUBJECTS` `flat`: `treeShape`, `reviewBuild`, as `TREE_BUILD`,
   `CAND_BUILD`, `reg(S)`), each with the same members (`axes`, `ready`, `load`, `page`, `diff`, listed above it):
   `flat` (the corals' Quality and Growth form; the sheet's photo ratings) and `tree` (the fish's and the sea slugs'
   Ease and Phase & framing; the answers alone). **No `admin.review` field in `core.js`** (a sensitive file, rule W27):
   the axes are the builder's, as step 5's `admin.files.cand` became the shape: the `GROUPS` review views carry an
   `axis` option and `hasPage` gives a subject the axes of its builder, which also replaces the two `{rank: 'family'}`
   options of Ease and Phase & framing. The growth-form axis (agreement block, pins, Validate, To classify rows) is the
   flat builder's named hook, with rule C4 as its reason; the quality and ease scales stay two (§6 c, Pierre's call). No
   stored key, draft write or browser key changed. Gone: `renderFishReview`, `renderQuality`, `renderForm`,
   `renderFishDiff`, `FREV`, `frevRow`, `FDIFF_MAX` (7 names; `renderDiff` is now the shared frame), the dispatch's
   `ASUBJ.sheets` proxy and the help map's. The ratchet: `.sheets` 32 to 30, `rank: 'family'` view option 4 to 2 (the
   two proposal views keep it) and `DATA.gen` 46 to 45 in `admin.js`. Checked: the demo admin's `#view` HTML of 86
   states (Quality, Growth form and By difficulty of the corals; Ease, Phase & framing and By difficulty of the fish; the
   sea slugs' pages; the filters stored, then one or two clicks on a tile) at 390 and 1280 px, before and after:
   identical but for the shared wrapper section of the fish's pages, the zoom attribute (`data-act="zoom"`) and the drop
   attribute (`data-drop`, none on a To classify row), which no style or script reads, and the photo's address, which
   flips between R2 and its online original with the order of the failed image requests of the test (the same
   in both). Nothing visible changed.
7. **One montage and one coverage page** (Dup-6, Dup-7; admin M each). The montage also does the Tree tab row's "coral
   Look-alikes page reading the pairs in force".
8. **One tile** (Dup-8; admin M). It falls out of 3-5.
9. **Learn: one list** (Dup-13; feature M). Acceptance: the same HTML as today for each subject (snapshot tests), so
   players see nothing new and it stays out of Pierre's queue.
   **Done** (spec/front-end.md "Learn › Genera", `tests/listbuild.test.js`): `learn.js` `viewList` draws every subject's
   Learn list (the lead, the grid, the foot, the redraw of the grid by the filters, the packing of the groups side by
   side); `LIST_BUILD` (`// list build: begin/end`) holds the two builders, picked by the declared data shape (`SUBJECTS`
   `flat`: `listBuild`, as `TREE_BUILD`, `CAND_BUILD` and `REVIEW_BUILD` are), each with the same six members (`lead`,
   `grid`, `blocks`, `foot`, `bind`, `after`): `flat` (the corals: the IMR slate in the lecture's groups or the slate's
   order, the search, the family filter, Photos | ID tips, the Coral Finder's other genera folded under it) and `tree`
   (the fish and the sea slugs: the key's groups, or a block per unit of the rank `UNITS listBy` names, or one block;
   the opt-in sets; the key's credit). Shared: `listBlock` (a group's block), `listBasics` (step 0's block). The
   corals' lecture groups, order switch and filters stay the flat builder's: putting them in data would open them to
   every subject, which players would see (Pierre's words needed). Two things the two lists did differently stay
   different, builder-supplied: the tree list's grid has no id (it is not packed again when the window is resized,
   as before) and the classes of the group titles (`gtitle`, `gt`). Gone: `viewGenera`, `viewFishList` (the names
   `UNITS list` entries and tests used). No `SUBJECTS` or `UNITS` field was added, and the ratchet's counts did not
   move (the code moved, its reads stayed in the builder). Checked: the app's `#view`, help box and page bar
   HTML of 90 states (the corals' list in each order and view, with a family, ★, a search that hits and one that does
   not, Enter on the search, the other genera's fold open, basics none, started and done, progress seeded, the bonus
   genera on, a view and an order switch; the fish's and the sea slugs' lists with basics in its three states, progress
   and the opt-in sets), at 1280 and 390 px, the clock, the random numbers and the player's reserve fixed: identical
   byte for byte, before and after.
10. **Learn: one sheet** (Dup-14; feature L), with `UNITS sheetParts`. Acceptance: the same HTML as today.
   **Done in part** (spec/front-end.md, `tests/sheetparts.test.js`): the four sheets (the corals' genus sheet; a tree's
   family, genus and species sheets) are drawn through one frame, `sheetPage(lede, cls, body)`, and the lines they
   share are one part each: `sheetRep` (the report line), `moreDetails` (the fold), `heroBtn` and `heroPic` (the first
   photo's button), `cuesBox` (the IMR cues box), `looksSection` ("Don't confuse with" for the tree sheets). **Then**
   the sheets are lists of declared parts: `UNITS sheetParts` names each sheet's sections in their order (the
   corals' `genus`; the tree subjects' `family`, `genus`, `species`), and `sheetBody` draws them from the sheet's
   builders of those names (`tests/sheetparts.test.js`: every declared part has its builder, every builder is
   declared; the tests that read a section's place now read the declared order). Checked: the app's `#view`, help box and page bar HTML of 116 states (a coral
   genus of the lecture, a starred one, a bonus one and one of two levels, and a look-alike view switch; the fish's and
   the sea slugs' families with several genera, with one genus, with one species, with and without IMR cues, a wink
   family sent to the list, genera with and without cues and roots, one sent on to its one species, species with
   juveniles, with many photos, with none, with marks, with a juvenile line and with a size and a depth, a sea slug
   species with no name yet; each first sheet at 390 px and with the species filter on All), progress seeded, the
   clock, the random numbers and the player's reserve fixed: identical byte for byte, before and after.
11. **Small Learn, home and progress readers** (Dup-16, Dup-17; fix S).
12. **Compare pages made generic** (Dup-15; feature M): the code only. Opening them to other subjects is Pierre's
    call.
13. **Tools: one tree-game builder** (Dup-20; tooling, probably L): `seaslug_game.py` on `fish_game.py`'s functions,
    the outputs byte-identical.
    **Done in part** (`tests/treegame.test.js`): the rules of the photos in play that `seaslug_game.py` wrote a second time
    are `fish_game.py`'s, which it calls with the sea slugs' own rubric: `cand_sure` and `judged_sure` take the subject's
    pattern of the tags and the keep a judgement without one counts as (`sure` is the fish rule, the sea slugs' tags, best by
    default, plus their egg masses), `phase` is `fish_game.phase`, `crop_mine` reads `crop_of`, `stale` is `photos.stale`,
    and Pierre's decisions and adds read through two new shared functions, `decided_of` and `add_ok`, which the fish's
    `in_play` uses too. Gone: `PLAY_COUNT`, the sea slugs' copies of the count and tag tests. The REE-12 hook stays in
    `seaslug_game.write` (the tree section follows the repository's own files), now with a test. Checked: `--check` of
    the sea slugs' files and the unit tests of both builds; `build()` of the sea slugs and `plan()` of the fish, old and new
    code, on the real inputs and on 12 and 8 made-up curations (adds, rejections, exclusions, moves, tags, eases, crops,
    rotations, the top-level exclude): the same trees, games and download lists. One difference, in an input the admin never
    writes: a rotation that is not 90, 180 or 270 counts as none when a photo's files are tested for being stale (the
    fish's rule). **Then** the sea slugs' photos in play and their records are `in_play` and `record` themselves:
    `in_play` takes the subject's part of the curation, its sure rule, its candidate lists in order and the units an add
    may name, and keeps its rule of one photo once across every list (the species' lists first, then the genus-level
    ones; [decision](../decisions/2026-11-21-tree-photo-once.md)); `seaslug_game.py` adds its own fields (`gl`, `bb`,
    `r`) to `record`'s and keeps its cap (`kept`) and R2 step (`place`). The candidate route now also keeps out a photo
    whose count in force is other species one could take for its subject for both subjects (`other_out`, as core.js
    `treePhotoIn`). Checked: `--check` of the sea slugs' files, and old and new code on the real inputs (3,014 sea-slug
    photos in play, 0 photos in more than one of the 272 lists; the fish's `plan()`): identical; on made-up inputs, the
    differences are the edge cases the decision lists.
14. **Later**: the format changes of §6, only if wanted. None is needed for 1-13.

## 6. What needs Pierre (S1's last sentence: data format or players' progress)

- **No PR in §5 changes players' progress or a stored key.** The admin pages write `curation.json` through the draft
  and Publish, and each PR keeps those writes where they are (the corals' at the top level, the others in their part).
  The Learn pages write only `reefid-sync-cmpview` and `reefid-sync-lkswiped`, and log page names that are already
  subject-prefixed (`core.js pageName`, `pv`); those must stay unchanged, which is part of "same HTML". The files that
  do write the progress or achievements record (`progress.js`, `proto/basics.js` through the feats `_basics` /
  `_fbasics`) are touched only as readers (Dup-17) or not at all (Dup-18).
- **Data formats**, each only if chosen; the in-memory adapters avoid them all:
  - (a) Moving the corals' curation from the top level of `curation.json` into a part of its own (`admin.cur ''` →
    a key).
  - (b) Building `data.json` as a tree file (the morning audit's item 11). The Tree tab row (Pierre, 2026-11-13,
    Q339-Q341: "it works for any subject: each subject builds its own tree from its own references";
    `docs/reviews/2026-11-18-roadmap-row-details.md#the-tree-tab`) already agrees in principle and lists "the builds'
    generic `tree` section per subject" as left. The concrete change to `data.json`'s keys is still a format other
    code follows, so it should be shown to him in one line, citing that row.
  - (c) One photo-quality scale for every subject: the corals' Good/Fair/Poor `quality` vs the judged `ease` 1-5. This
    also changes the corals' photo process.
  - (d) `cand.json` in the tree candidates' shape.
- **What players see**: opening compare / pairs / custom quiz / duel to fish or sea slugs (Dup-15, Co-8) is a new
  feature. A Learn refactor that is not HTML-identical needs his words, or "integrator's call, easy to correct" when
  only the layout changes.
- Nothing else here needs him: names, components, tests and adapters are the agents' (AGENTS.md, the merge contract).

## 7. What was checked and what was not (rule W11)

**Checked:**
- `core.js SUBJECTS` in full (corals, fish, sea slugs, including `admin`).
- admin.js: the subject setup (`TREES`, `FISHS`, `ADM0`, `subjOfHash`, `hasPage`), `GROUPS` (every tab and view), the
  whole `render()` dispatch, the headers and first lines of every paired renderer in Dup-1 to Dup-8, `renderPstats`,
  `renderQuality`, `renderFishReview`, the first 60 lines of `renderCand`, and the rubric constants (`FU_TAGS`,
  `FREV_*`).
- `admin-fish.js` (header and `tagRows`) and the `admin-coraltree.js` header; greps of `admin-analyses.js`,
  `admin-heatmap.js`, `admin-journey.js`, `admin-visits.js`, `admin-taxa.js`, `admin-content.js`, `admin-covers.js`
  and `admin-light.js`.
- `analysis.js` (grep: `rankRef`) and `tools/analyses.js` `metaOf` (`photoMeta` / `photoMetaFish` by
  `analyses.photos`).
- `learn.js` (every top-level function and the subject reads); the `app.js UNITS` member names for the three subjects,
  and `GX`.
- `home.js`, `progress.js` and `quiz.js` (greps, including writes and the feats); `proto/basics.js` and
  `proto/fishbasics.js` (the registration).
- The `tools/` listing, the `fish_game.py` and `seaslug_game.py` function lists, and the sea slug header.
- `tests/subject-neutral.test.js` on main and on #1202.
- `docs/rules/subjects.md`; `docs/rules/admin.md` A4; the ROADMAP rows "Fish admin at parity", "The Tree tab" and
  "Architecture review, steps 3 and 4"; `roadmap-row-details.md#the-tree-tab`; today's decisions `tree-tab-step` and
  `fish-units-named-admin`.
- The morning audit, and the open PRs (REST list).

**Not checked:**
- The bodies of most paired renderers beyond their first lines: `renderCov`/`renderFishCov`, `renderMont`/
  `renderFishMont` and `renderDiff`/`renderFishDiff` are classified by header and dispatch.
- `admin-demo.js` (1,729 lines of demo data; grep only), `admin-draft.js`, `autosort.js` beyond its names, the
  `proto/idkey.js` body.
- The bodies of `build_fish.py` / `build_seaslugs.py`, `datajson.py` and the `apply_*` tools; `Code.gs`; CSS;
  `sw.js`; the `admin.html` load order; the decision `admin-taxa-view`.
- The branch `claude/genera-into-tree`, which is not on the remote: it is described from the brief only.

**Guesses:**
- The line counts (method above).
- That a coral adapter can feed every tree component without a format change (admin-coraltree.js shows it for the
  Tree).
- That the Learn refactors can be HTML-identical.
- The effort of the refactors, beyond the measured medians.
