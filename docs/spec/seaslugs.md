# Sea slugs

The sea slugs are a second tree subject on the fish engine: one "sea slugs" subject, the Philippines as its area,
scientific names in the game, its genera the units from the start, its families structure only
([study](../reviews/2026-11-15-nudibranch-mode-study.md)). They are `core.js` `SUBJECTS` `seaslug` and `app.js`
`UNITS.seaslug`, on the model every subject shares ([subjects.md](subjects.md)). This is the specification of what the
code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and the PRs.

## Its place in the registry

`open: 'all'`: every player sees them, their `beta` label kept (the *beta* tag on the switch, their invitation card,
[subjects.md › The subject's card](subjects.md#the-subjects-card)). With `open: 'group'` they would be the admin's and
their group's only, the group set once the sheet script knows the subject (`SEASLUG_SHEET`, rule D4). `replay: false`
(the corals keep the first replay and the opening hold); `pool` (`seaslug.json`, `seaslug-game.json`, `curation.json`)
and `stats` (from `SEASLUGST_SHEET`: the sheet pools their own answer statistics, the pooled photo difficulty, genus
offsets and confusions, so a data look-alike is dropped once the players tell the pair apart); `analyses` (their
Analyses report, by genus, on their photos' judged features); `calib` (the fish's draw calibration, the floor shared
over 20 observations). Their admin part (`cur: 'seaslug'`, their pages, `target`, `tags`):
[admin.md](admin.md#each-subjects-admin-part-subjects-admin), [admin-tree.md › The sea slugs](admin-tree.md#the-sea-slugs).

## Replayed, with their own leaderboard and achievements

**Replayed**: the sheet replays their progress from their own answers as it does the fish's (`SUBJECTS` `seaslug`
`replayed`: their units from `seaslug.json`, named by `replayed.file`, read by `Code.gs` `subjFile_`, `subjGen_`, cached
under `sgen1:seaslug`; `core.js` `treeReplayGen(F, 'genus')`, the units `treeGen` plays at their `unitRank`, the app's,
`tests/fishreplay.test.js`; their own rules versions `SEASLUG_RVS`, no card; their records in the "Replayed Sea slugs"
tab). The app adopts them through `UNITS.seaslug` `gen` (`sync.js` `rpUnits` reads each subject's units with its own tree
in force, `treeWith`): [sync.md › Other subjects' replays](sync.md#other-subjects-replays). Their look-alike pairs as the
content editor sets them replay from `SEASLUGPAIRS_SHEET` (`SUBJECTS` `structure`).

**Their board** (`board`, `boardSheet`: `progress.js` `boardV`, `boardLive`) ranks a player behind its rules by their
replay (`Code.gs` `board_`, `boardWarm_`; rule D8), by their % (the genera's mean: no `score`), then Elo. Both the replay
and the board turn on from the script that has them (`core.js` `SEASLUGRP_SHEET`, `replayed.sheet`; `sync.js` `rpOn`;
rule D4); before it, the subject merges against its own base `sbase` and shows no board.

**Their achievements** (`core.js` `SEASLUG_ACH`, ids `ss…`, 20): genera met, genera at each level, families with every
genus at Advanced, the nudibranch groups (`SEA_NUDI`) and the others, the first circle at Advanced, their % every 10
points to 100. They read `progress.js` `achSnap`'s `fam` (units grouped by their `parent`, each group all at Advanced)
and `tax` (each taxonomic group, `tg`, its units met and at Advanced), with their own ? text (`UNITS.seaslug` `achHelp`;
`tests/seaslugach.test.js`).

## A second tree subject on the fish engine

Their files (`UNITS` `get`: `seaslug.json` and `seaslug-game.json`, no first photos, unversioned and out of the `sw.js`
shell) have `fish.json`'s and `fish-game.json`'s shapes (`tools/seaslug_game.py`), so `treeGen`, `treeGenera`,
`treeCurate`, the list and the sheets (`viewList`, `viewTreeSheet`) and the draw read them unchanged.

**Each tree subject has its own state** (`TREE_OF`, `treeOf`: its units `TREEU`, its raw files `TREERAW`, the content
laid over them, the loads on their way); the globals `TREEU`, `TREERAW`… are the copy of the tree in force (`TREE_AT`).
`subjectLoad` and `inSubject` bring the subject's tree in force (`treeAt`; the corals have none and leave it as it is);
a subject's files that come while another is on screen go into its own state only (`treeSet`, `treeHome`, `treeLoad`;
`setSubject` loads before it switches), and its units are made when it comes in force; a new curation remakes the tree
in force and marks the others stale (`treeBuildAll`). Each subject reads its own part of the curation through `core.js`
`treeCur` (the sea slugs' `seaslug`, none yet: their photos in play are their judged ones). A family's or a genus's
commonness (`cm`) is read over the tree's own area when it names one (`present.area`, distinct observers in the
Philippines), else near Dauin (the fish). `tests/fishhome.test.js` checks two trees.

## The game: its genera from the start

The game is at the genus, the level the ID books and the experts work at, by the scientific names. `SUBJECTS`
`unitRank: 'genus'` (read through `core.js` `unitRankOf`; unset, a subject's units are at its `rank`, the fish's
families) makes `treeGen` (its `unit`, `treeGenUnits`) take every genus holding a species of the circles as a unit, in
its best species' circle, with its family's photos of its species and its own genus-level photos (`gl`: `treeGlOf`).
Its look-alikes: its sibling genera (the traps), the genera a specialist source names (the duels and the Look-alikes
deck with Compare: `UNITS.seaslug` `pairs` from each genus's `decl`, each pair with its sources' line, `lsrc`), and the data look-alikes only iNaturalist's
identifications show (`dlook`), which the players' answers can drop (`model.js` `dataSeed`). `app.js` `treeGenera`
completes those records as it does the fish's scientific genera; there is no opt-in genus set (`sets: []`,
`optin: []`). Their ID marks are their own, in our words from numbered sources (`tools/seaslug_cues.json`), shown on the
sheets and in the quiz feedback. **A species' own marks** (`tools/seaslug_species_marks.json`, agent drafts: each line
with the SEASLUG.WORLD or Sea Slug Forum page's words it rests on; `none` the species left out and why) tell it from its
genus's other species; `tools/seaslug_cues.py` `species_apply` puts `marks`, `msrc`, `mby`, `mdraft` on `seaslug.json`
species, and the species sheet shows them in `learn.js` `marksBox` with "Draft, not yet reviewed", as a fish species'
(`tests/seaslug-species-marks.test.js`). The quiz does not read them.

**The families stay structure only**: in `TREEU.gen` (no rank of their own, `app.js` `rankOf` reads them as `family`,
never asked), their sheets, a genus's family line and parent, and the Learn page: the genus tiles shown directly,
grouped by family (`UNITS.seaslug` `listBy: 'family'`, `learn.js` `viewList`, `byRank`: a block per family), the families under
their taxonomic groups: the true nudibranchs apart, Nudibranchia · Doridina then Nudibranchia · Cladobranchia, then the
other sea slugs by order: Sacoglossa, Cephalaspidea, Aplysiida, Pleurobranchida. The groups are WoRMS's classification
of each family (rule C2), hand-kept in `tools/seaslug_groups.json` (AphiaIDs), written by `tools/seaslug_game.py` into
`seaslug.json` `taxa` `{cite, short, groups [{n, title}]}` and each family's `tgroup` (a family of the game in no group
fails the build), read by `treeGen` (a family's `tg`, `X.taxa`; display only), cited under the list as the fish's key is;
the list takes as many columns as fit (`.tiplist.gtaxa`). iNaturalist splits Cladobranchia into five suborders: WoRMS is
followed, the difference a point (`data/points.json` `seaslug-cladobranchia-inat`, rule C5).

`rankOf` is '' for the rank a subject's units are at, so the draw's own-rank rule (`model.js` `rareOn`), the choices,
the typed names and the logged rank (`quiz.js` `rk`: `genus`) read the sea slugs' genera as the fish's families; a typed
family name on a genus question gets the "that's a family" nudge (`quiz.js` `typeKind`). The admin reads the same units
(`reports.js` `repReg`'s `unit`, `admin.js` `unitRead`): its registry's slate is the genera (Players, the Journey through
`unitsOf`, the heatmap's roster), each photo shown by its genus.

**Their basics module**, Sea slug basics (`proto/seaslugbasics.js`, `UNITS.seaslug` `basics`, `SUBJECTS` `basics`
`_sbasics`): step 0 of their Learn path, the first Learn tab and the "0" block of the genera page; the parts their ID marks
name (rhinophores, gills, mantle, cerata, parapodia, headshield, side gill) on drawings and their genera's photos, then
their groups ([basics.md › Sea slug basics](basics.md#sea-slug-basics-protoseaslugbasicsjs)).

The species have their sheets but no game unit yet; no key (rule S3: so no Identify door on Home and no Identify tab, `UNITS.seaslug` has no `identify`), no
first-launch "I'm at IMR" answer, no level-change card (`startFb: false`, as the fish). Their words where the fish's are
written into shared pages are `UNITS` fields (`door`: Home's Learn door and, for a subject with a key, the Identify door and the key page; `lede`: the genera page; `words`:
each sheet's ? text, a species' rank by its observers in the Philippines, the links, the "No photo yet" drawing).

**Their circles**: 1 to 3 of `tools/seaslugs.json` (45, 60 and 100 species), all on the path and in the progress as the
fish's, circles 2 and 3 opening at the fish's thresholds, counted on genera (`UNITS.seaslug` `gate`: `treeGate`: circle
2 once every circle-1 genus has been asked, circle 3 once circle 1 reaches its `SUBJECTS` `gate` (the fish's values):
with no global score, its plain mean at 50%; circle 3 by itself, with no offer card). **Before circle 3** (Pierre,
2026-11-20: «Ya pas de carte avant de passer au cercle suivant pour les nudibranches?»): once every genus in play is met
and asked and none may open now, the all-met card at the break at Next ("Every genus met", "You’ve seen them all, for
now", 🐌, `app.js` `CARD_KINDS` `'sea slug'`) says what comes next, once per reason, as the fish's
([fish-game.md](fish-game.md)): `c3`, the N genera of circle 3 still to come, at about Open Water on average; `all`,
else: the genera still without a game photo, else the mastery exams (`UNITS.seaslug` `done`, `slugNextOf`; tests:
`tests/allmet.test.js`, `tests/seaslug.smoke.js`).

**Their photos** are read from iNaturalist (`r: 1`) until the R2 step (`tools/seaslug_game.py --r2`) puts them on R2;
that step is on in the Candidate photos workflow (`SEASLUG_R2`), so the photos in play that R2 lacks are uploaded with
the fish's ([fish-photos.md](fish-photos.md)).

**Find the X** (Q437) runs on the shared engine: `app.js` `UNITS` `tiles` is the fish's declaration (`unitTiles`), and
`tools/seaslug_game.py` cuts the square tiles with the fish's code (`tools/fish_game.py` `tile_crop`, `tile_write`,
`tile_only`, nothing copied) for a record that carries the animal's box (`bb`: a judgement's, read as
`fish_game.py` `box_of` reads it) and whose tags pass the sea slugs' tile rule (`seaslug_game.py` `tile_tags`: the fish's `tile_tags` plus the dorsal view,
the sea slugs' commonest good one; integrator's call, easy to correct; 2,132 of the 3,014 photos pass). The boxes come from a bulk box pass
(2026-11-20: 2,064 of the 2,132 photos that pass the rule carry one, in 265 species, 232 with four or more; the others
are no box: cut by the frame, two animals, hidden, or a square that would show another slug) judged on
`judging/SEASLUG.md` "The animal's box" and imported as `bb` in the judging files (checked by `tools/judging_fish.py
--subject seaslug --check`, imported with the codes: `--subject seaslug codes`). A record has `bb` at once; its tile (`xc`)
is cut by the next R2 run (the Candidate photos workflow, `SEASLUG_R2`), and the format is drawn (`planFind` finds tiles)
as the tiles exist. Since 2026-11-21 it does: 2,037 photos carry a tile (`xc`), in 79 genera (77 with two or more), and a
genus met is asked with three others (`tests/seaslug.smoke.js` part 11, `tests/findx.test.js` "the sea slug data"). The pass's model and figures: `docs/decisions/2026-11-20-seaslug-box-model.md`.

## English names as information

The common names and nicknames, at the family, genus and species level, wherever names are shown, when they exist; there
is no common-name branch. `tools/seaslug_names.py` merges them from their sources into `tools/seaslug_names.json`, and
`tools/seaslug_game.py` writes each record's `en` (`[{n, src, nick, web}]`, the first the one shown first) and `ensrc`
(its iNaturalist taxon, WoRMS AphiaID, Wikipedia article) into `seaslug.json`, with the tree's `ensrc` (when each source
was read). The app reads them through `UNITS.seaslug` `vern` (`app.js` `vernOf`, `vernFirst`, `treeVern`, `vernSrcs`;
a subject without `vern`, the fish, gets none and keeps its own common names):

- under the scientific name on the family, genus and species sheets (the first, the others on an "Also" line, a
  nickname said so; every name with its linked sources under More details: `learn.js` `vernHead`, `vernMore`);
- on the Learn page (a genus tile, a family's heading: `viewList`; a genus row and a species tile on the sheets);
- in the quiz **after the answer only** (the verdict names the genus with its English name, `quiz.js` `fbBody`; the
  photo's species line, `UNITS.seaslug` `taxon`: its scientific name, the WoRMS name beside it and its first English
  name).

The choices stay scientific names. Typed on a genus question, an English name is not a right answer (as a fish genus's
common name never is, `treeGenera` `names`): `treeTypeOther` lists the tree's `en` names as common names, so the player
is told "a common name: this question needs a genus's scientific name".

## Tests

`tests/seaslug-names.test.js`, `tests/seaslug-game.test.js`, `tests/seaslug-genera.test.js` (the genera as units, the
fish unchanged, `rankOf`, the gate on genera, the admin's registry), `tests/seaslug.smoke.js` (both sides of the gate,
the quiz on circle-1 genera and its pages, the switch to the fish and back), `tests/fishhome.test.js` (two trees),
`tests/seaslugach.test.js`, `tests/seaslugstats.test.js`, `tests/seaslugstruct.test.js`.
