# Sheet script history

One entry per version of the sync script (`tools/sync/Code.gs`), newest first. Line 1 of the script says only the
version and points here (Pierre, 2026-11-18: the whole history on line 1 was tens of thousands of characters long in
the Apps Script editor). The integrator's `python3 tools/sheet_version.py --assign` writes the new entry at the top at
merge, from the PR's `tools/sync/changes/<branch>.md` (rule D3, docs/rules/sheet.md); nobody adds one by hand, and
`python3 tools/check_versions.py` checks it (line 1 and the top entry agree, one entry per version, no duplicate, no gap).
The self-update reads only `const VERSION = N;`, so nothing here changes what the script does.

Entries up to v176 were moved here from the old line 1 word for word (code marks were dropped there, so they are
missing from those; `docs/ARCHITECTURE.md`'s version history keeps them for most). Their dates: the day
ARCHITECTURE.md's version history gives, else the day the old line 1 gave for its group of entries, never later than
the next newer entry; for v7 to v34, which no record dates, that is 2026-11-04, "at the latest" (v35 was that day). Some
numbers have no entry and never had one (v41, v43, v72, v73, v75, v78, v82: left unused, or taken by a branch that
merged under another number). `## earlier` is the one entry from before the numbering.

## v178 (2026-11-18)

Each answer's content version is logged (ROADMAP "Content versions and duplicate-safe answers"; Pierre, 2026-11-18: "Bonne idée. A implémenter rapidement parce que le contenu évolue vite"): a new last Answers column, Content version, holds the answer's `cv`, a short id the app makes per subject from the data files its units were built from (their deploy `?v=` hashes, a content hash for a file fetched without one), its part of the curation in force and the structure stamp in force (core.js `contentVersion`), so analyses and replays can tell which content an answer saw; 'c' and up to 15 lower-case letters and digits, else blank, blank in the rows logged before; logged only, read by nothing the script computes. The app sends it only from v178 (core.js `CV_SHEET`, `logOut`, rule D4). The answer's Id is its attempt id (core.js `answerId`, now 8 random characters from the device's crypto; a live answer's is fixed per player and question, live.js `liveAid`): an id met twice in one send is now logged once and counted once against the caps (`newIds_`), as an id the tab already has was, compared as the tab keeps it (its first 20 characters); a send with no answer no longer reads the Id column

## v177 (2026-11-18)

The screen a pages-opened summary was sent from (Pierre, 2026-11-18: measure the screen sizes the players really use, to design multi-photo game formats): a 'pages' event may carry vp {w, h, d, o, b}, the usable CSS viewport (innerWidth, innerHeight) rounded to 10 px, the pixel ratio to one decimal, the orientation (p or l) and the width band of its short side (0 ≤360, 1 361-390, 2 391-414, 3 415-600, 4 wider, taken on the device from the exact width); the embedded pagesClean keeps it in the Pages tab's Detail JSON, rounded and clamped again, the band kept only when it agrees with the rounded size (no new column, no new identifier). The app sends it only from this version (sync.js VIEWPORT_SHEET); admin Players › Visits shows the devices of the last 90 days by band and the most common sizes

## v176 (2026-11-18)

The embedded core.js makes the scientific genera of every circle units (Pierre, 2026-11-18 ~06:32 Manila: "lance"; docs/FISH_PATH.md "Levels"): built for circle 1 alone (130 genera) when circle 1 alone was on the path, they now include the 107 genera of the families of circles 2 and 3 (core.js fishGenSets, read by the app's fishGenera, the replay's fishReplayGen and the variant table's fishVarTable; a surprise card's genus stays none). The sheet's fish replay therefore reads them (their sibling genera as look-alikes, their family's line), its variant table holds them and the leaderboard's tree credits their species' scientific names with them (fishBoardTree); a new fish rules version (FISH_RVS 4, no card: rules D5, D6) replays every fish player at once, the leaderboards included (rules D8, D9). The units, the tree and the variant table are cached under new keys (sgen4, stree3, svar2), so those a script before them cached are never read. The app opens the genera of circles 2 and 3 from this version (sync.js GENERA_SHEET, rule D4). The corals and the sea slugs are as before

## v175 (2026-11-18)

The gate floor (architecture review 2026-11-18, R3, step 2): core.js gets SHEET_FLOOR, a script version already confirmed live, and the app reads the script version as at least that, also before any reply, so a new device never plays the rules of a script long replaced; every gate at or below it is gone with its old branch (in core.js: the full replay's, the answer time's, the first-launch prior's, the domain-score bar's, the global score's, the answers filed by subject, the surprise cards', the other subjects' replays, the per-format offsets, the admin's mark, the pages summaries'). Copied in with core.js; nothing the script reads, writes or serves changes

## v174 (2026-11-18)

The sea slugs' look-alike pairs in the content editor's structure (Pierre, 2026-11-18, on #1061: "Option 2 : on le construit maintenant"): core.js SUBJECTS seaslug declares structure (pairs between genera, their units, in seaslug.json genera look; srcsStructure writes both genera's look and lsrc lines, an added pair out of dlook) and a look-alike line slot (lsrc/<other genus>, a list of sources {t, u}, the new slot type srcs), copied in with core.js. So subjRpl_ makes the sea slugs' replay units from seaslug.json with curation.json's seaslug pairs laid over it, keyed by the structure stamp, as the fish's and the corals', and replays_ replays a sea-slug player whose app says another stamp (Q363 h A); the 15-minute trigger reads their curation again (subjStRefresh_). Nothing changes while curation.json holds no sea-slug pair: their stamp is '' and nobody is replayed. The app lays the pairs over its units and says its stamp only from this version (core.js SEASLUGPAIRS_SHEET, rule D4)

## v173 (2026-11-18)

The embedded core.js gains the fish held-out set's helpers (fishObs, fishHeld) and a held list beside each fish unit's views (fishPhotos takes the set as a fourth argument and marks its photos ho; fishGen and fishGenUnits put them in the unit's held list, never in its views; fishVarTable reads the views and the held list together): the app withholds the observations of fish-holdout.json from practice and its mastery exam asks them first, logged |h before |kN, |t and |x (ROADMAP "A held-out photo set"; Pierre, 2026-11-16, Q385: never his own nor the reference photos, the held-out questions counted like the others and slipped in unannounced; 2026-11-18: exam only, no practice probe, "Je pensais qu'on gardait des photos pour la fin"). The script never reads the set, so its photo pools, its replay and its variant table (subjVar_) are unchanged: a held-out answer is stored, rated and replayed as any answer (the Mode column keeps |h as text; guess_ reads |kN at the end), and the app's exam photos are the table's (rules D8, D9). No rules version, no gate

## v172 (2026-11-18)

The live mode (Pierre, 2026-11-17, Q393: a trainer and a group of students answer the same photo questions at the same time, through this script, polled; docs/reviews/2026-11-18-live-mode-design.md): POST {lv: 'start' | 'host' | 'join' | 'poll' | 'answer'} (lv_); a session is started only by an account holding the trainer role (its name and code in lname / lpin, checked against the RAs tab, then can_(…, 'live', 'instance:imr'): the right live, now the trainer role's; one Audit row a start, refusals capped); the trainer's page sends each question it builds with the game's engine, the script keeps its right answer until the reveal and scores each student's answer (a session only in a subject open to every player, never one in beta for a group), 100 points plus up to 100 for the time left, timed from the moment the question first reached that student; sessions, rosters and answers live in the script cache only (6 hours at most, never a sheet tab); joins capped at 40 a session and 400 every 6 hours. Signed-in students' answers are logged by their own app through the usual save, mode live. Each student's poll (hx: how many revealed questions their page went through) brings their own accepted answers to the questions revealed since (past: right choice, accepted choice, choices, photos), so their app logs every accepted answer, and only those, even one whose reveal it missed. A reveal and an answer each take the script lock for a moment (LV.LOCK, 5 s at most; an answer timed from when it came, before the wait), so a reveal holds every answer accepted and none is accepted after it (Codex review #1049)

## v171 (2026-11-18)

Staff and cohort leaderboards (Pierre, 2026-11-17: "le staff aurait un leaderboard permanent, et chaque nouvelle cohorte aurait un leaderboard indépendant"): every subject's board reply splits its one ranking by who is where, each scope by the same global % then Elo and its first 200: rows, the general board, now without the staff; staff, the accounts holding the trainer role in the instance (staffSet_, roles step 1); cohorts, every cohort with its members but the staff, the newest first. A cohort, for now, is a named group the admin makes and fills on Players, kept in the Groups tab as cohort: and its display name (cohortId_, cohortMap_), one cohort per player; userGroup with cohort adds or removes players (a new name makes it), the player list carries each player's cohort and staff mark, the load and save replies the player's cohort (its board shown first). A cohort change and a trainer grant or revoke drop every board's cache; a merge keeps the kept name's cohort. An app from before reads rows as before

## v170 (2026-11-18)

The Answers tab's Species shown keeps a species with no name yet by its label (Goniobranchus sp. 5, tools/seaslug_informal.json; Pierre, 2026-11-17, Q389 (2)): logAnswers_ refused any digit in that column, so every answer on one of its photos was logged with the column blank (found by the species step 2 plan, #1041). A digit is now allowed only as the 1 to 3 digit number after sp. that ends a name; everything else is refused as before, still a letter first so nothing can start a formula. Nothing the script computes reads the column; readAnswers serves it as before

## v169 (2026-11-18)

The sea slugs' admin Photos › Tree gets its WoRMS view (core.js SUBJECTS seaslug admin.pages photos/tree/worms; Pierre, 2026-11-17: "on garde WoRMS", after Q340's Key | WoRMS views for the fish): an admin page list only, copied in with core.js; nothing the script reads or writes changes

## v168 (2026-11-18)

The sea slugs' admin at parity with the fish's (Pierre, 2026-11-17: "Et pour les limaces de mer, toute la partie admin, c'est prévu aussi ?"), core.js copied in: SUBJECTS seaslug content (the text slots of their sheets: a family's and a genus's ID marks, the note on every rank; no structure, so their replay reads the genus look-alikes as built), and its admin fields target, tags and two more pages (Health, Candidates); contentPut keeps a list line's source numbers (mby) only on a line an edit keeps word for word. The script lays a sea-slug sheet edit over seaslug.json before its replay as it does the fish's (subjRpl_), which reads only the genus look-alikes: the replayed progress is unchanged

## v167 (2026-11-18)

The sheet pools the sea slugs' own answer statistics (Pierre, 2026-11-17: "Tu peux compléter tout ce qui manque pour les nudibranches?"): the embedded core.js gives the sea-slug subject its game photos (SUBJECTS seaslug pool: seaslug.json, seaslug-game.json and its part of curation.json, its genera the units, core.js POOLS entries reading each file by what it is, pool as, and the subject's own curation part, treeCur), so statsSubjects_ folds its answers into a "Stats Sea slugs" tab with its own cursor and caches (photo ratings, genus offsets, confusions, photo memory, format offsets, by the same rules as the corals' and the fish's), serves them at ?stats=1&s=seaslug, checks its answers' photos against its pool (photoCheck_) and gives each player its photo exposure on the admin's list (pools_, pool3seaslug); the ?stats=1 reply now names the subject it rates (s), so an app reads another subject's only when the reply is that subject's (sync.js loadOwnStats: from this version, rule D4; an older script answers &s=seaslug with the corals'). Its Analyses report is stored in an "Analyses Sea slugs" tab once its answers reach their first thousand (tools/analyses.js, SUBJECTS seaslug analyses). The replays are unchanged: another subject's replay still reads no pooled statistics. The corals and the fish are as before

## v166 (2026-11-17)

The embedded core.js takes the fish out of beta and opens the sea slugs to every player (Pierre, 2026-11-17 ~19:10 Manila: "les poissons on peut les sortir du mode bêta … on peut laisser les nudibranches ouverts à tous mais en gardant le mot bêta dedans"): SUBJECTS fish has no beta label, sea slugs open: 'all' with their label kept, so no subject opens to a group any more (groupIds_ is empty; the Groups tab's rows are kept for a later beta). Nothing else changes in the script

## v165 (2026-11-17)

The copy of core.js follows the sea slugs' admin photo pages (2026-11-17, Pierre: "Tu peux compléter tout ce qui manque pour les nudibranches?"): SUBJECTS admin gains the candidates file of each tree subject (files.cand), the fish auto-sort's flag (autosort), the sea slugs' Photos › Tree › Key page and their Pierre origin; the admin reads them, the script's behaviour is unchanged

## v164 (2026-11-17)

The sheet replays the sea slugs' progress from their answers and serves their leaderboard (Pierre, 2026-11-17: "Tu peux faire le leaderboard et une première version des succès pour les limaces de mer stp?"; the replay that rule D8 asks of a leaderboard): the embedded core.js sets the sea-slug subject's replayed (its units from seaslug.json, the genera played from the start: fishReplayGen at the genus, each with its sibling genera as look-alikes and its family's line, as the app's; its own rules versions SEASLUG_RVS, version 1) and board, so replays_ replays a player's sea slug answers when their app asks (rv_seaslug), keeping the records in a "Replayed Sea slugs" tab (dropped with an account, rule D7), board_ serves &s=seaslug over the genera the apps send, and boardWarm_ makes the replays of players behind its rules every 15 minutes, as for the fish. subjGen_ reads a subject's replay file from replayed.file when it names one (the sea slugs have no photo pool yet), else its pool's first file as before; its units are cached under sgen1:seaslug. The corals and the fish are as before. The embedded core.js also holds the first sea slug achievements (SEASLUG_ACH), counted by ?achs=1 as every achievement id is. The sea slugs' replay units carry the genus look-alikes a specialist source names (core.js fishReplayGen at the genus: the genus look of seaslug.json, Q390 D, #1042), as the app's do, so a mix-up between them counts as the game counts it

## v163 (2026-11-17)

The coral replay runs under the content editor's look-alike pairs (docs/reviews/2026-11-14-sheet-overlay-design.md v2, step 8; Pierre, 2026-11-15, Q359: look-alike pairs are each instance's content, set by its content editor; Q363 (h) A: when he changes them, every player's progress is recalculated from the answer log, silently; Q366: the stored format). The corals now declare a structure (core.js SUBJECTS coral structure: pairs between genera, no circles; the slate stays out of it), so the subject replayed here has its units made as the fish's are: from data.json with curation.json's pairs laid over it by the app's own core.js contentApply (gen_ through subjRpl_, the same cache under the structure entries' fingerprint, the same 15-minute refresh in subjStRefresh_, and no replay while the curation cannot be read, never the base's pairs in place of the editor's). The app says the stamp its coral progress was replayed with (st_coral on a load, sts.coral on a save or an anonymous send; stMain_), and the units' when another (sn_coral, stn.coral: the curation read again at once, at most once a minute); when it is not the sheet's, replay_ replays the log at the same rules version, keyed by the stamp in the Replayed tab's Since cell (rplSince_), and the reply says it (replay.st, left out when ''). The leaderboard's replays (boardRpl_) and the admin's Players (replayedAll_) read the same stamp. The pairs count where an answer carries no scoring record (the rows from before v61: the look-alike prior of the known mix-ups and the look-alike test rebuilt from the units); an answer with one replays as the game scored it. A withdrawal that would leave a starred genus with no surveyed look-alike to open after is never applied (core.js starHold, rule L5), in the app, the admin and here alike. The stamp is '' while no pair edit changes data.json's, so the deploy replays nobody, and an app from before core.js PAIRS_SHEET says no coral stamp and is replayed by its rules version alone, as before

## v162 (2026-11-17)

The embedded core.js gains the photo phase and variant helpers (phaseOf, phaseKind, phaseCardOf, phasePair; VAR_KINDS, varKindOf, VAR_AT, varRamp, VAR_GROUPS, varGroup), the fish families' juvenile classes and variant thresholds on their records (fishGen juv, varAt) and fish rules version 3 (FISH_RVS): the app brings a unit's juvenile and sex or colour phase photos into its draw on a ramp of that unit's own mastery, thresholds per kind (early-class juveniles from the start, the others from Open Water to Advanced, late-class ones at Advanced), and a unit's mastery exam is passed only once each variant group it has is answered right (Pierre, 2026-11-17 10:52 Manila, Q391 "a oui, b oui"). The fish replay decides it from the answer log for every player at once (rules D8, D9): subjVar_ makes the variant table of the units that can be learned (core.js fishVarTable: each variant photo's file, kind and observation, from the pool files on main with the structure in force, the same functions as the app's exam, varUnit, varLeftOf), made and kept with the replay's units under the structure's fingerprint (subjRpl_: 6 hours, in parts, cacheBigPut_, about 330 KB; fish.json and the curation read once for both; remade by the 15-minute trigger); rplMake_ replays with it (replayProgress vars: each unit's groups with no right answer in the log, vl) and makes no fish replay without it; replayedOf then takes a learned mark away when its unit has such a group, silently (rule D6), its exam kept as passed but for that group (the record adopted keeps those groups, vl, which the app's exam asks until each is answered right on the device, whatever right answers its own copy holds beyond the log; two devices' merge keeps a group only while neither has answered it right). Fish rules version 3 makes the trigger replay every fish player, so the fish leaderboard follows at once, whoever never reconnects; each device adopts the same replay, and no device takes a mark away on its own

## v161 (2026-11-17)

The fish replay knows the species units (the species level, step 1; Pierre, 2026-11-15, Q362: one progress unit per species; docs/reviews/2026-11-14-species-step1.md): fishReplayGen lists each species with a listed common name of a family in play under s: and its species id (core.js fishSpecies), with the other species of its family as its look-alikes, its family's line and the family it starts from, so a species picked wrongly counts against it as in the game (rule L2) and a species never answered starts from its family's ability as in the game (abilityOf from; FISH_PATH "Unlock rules"). A log with no species row replays as before. The app opens the species only from this version (SPECIES_SHEET, with the chunked tree's TREE_SHEET; rule D4). The fish leaderboard's tree the sheet makes (core.js fishBoardTree, v147) is the species tree (fishScoreTree on, the app's treeSp), so a species' common-name credit counts on the board as on My progress; a player with no species unit keeps the same %. The replay's units and the board's tree are cached under new keys (sgen3, stree2), so a cache made by a script before the species level is never read

## v160 (2026-11-17)

The embedded core.js plays a sea slug's genus-level photo for its genus (Pierre, 2026-11-17, Q389 (1): "les observations au genre bien identifiées ... deviennent des photos des genres du jeu"): a photo of seaslug-game.json marked gl with its genus's id as sp goes to that genus's family in fishGen and joins only that genus unit's photos (fishGenUnits, fishGlOf), never a species'; no such photo is in play yet (they wait for the judging pass), the script computes nothing from the sea slugs' photos, so nothing it does changes, and the corals and the fish are as before

## v159 (2026-11-17)

A role change is never without its Audit row (the fix of the seed of 2026-11-16, which wrote the admin grant, failed before its Audit row and was retried silently, so the Audit tab showed that grant as already held): grantPut_ computes the row before writing the grant, throws when the row cannot be written, and gives a grant held without its ok row (grantAudited_) that row on the next try; rolesSeed_ is marked done only once every grant has its row; an Audit row that cannot be written and a seed that fails are a line in the Deploy log (roleLog_), never silent and never the reader's error. The Roles and Audit tabs keep their format (Q383)

## v158 (2026-11-16)

The embedded core.js adds Analyses › Difficulty › Heatmap to the sea slugs' admin pages (SUBJECTS seaslug admin pages; Pierre, 2026-11-14, Q123 m: the confusion heatmaps, once a subject's admin pages name the view): every genus against every genus, read live from its answers in the admin, the genera in their family's block and the families in their taxonomic group; the script computes nothing from this list, so nothing it does changes, and the corals and the fish are as before

## v157 (2026-11-16)

The embedded core.js plays the sea slugs at the genus from the start (Pierre, 2026-11-16: the experts and the ID books work at the genus, "c'est au niveau des genres"): SUBJECTS seaslug gains unitRank: 'genus' (read through unitRankOf), its genera the units of its circles (fishGen's unit, fishGenUnits), its families structure only (each under its taxonomic group from WoRMS on the Learn page, fishGen tg and taxa), no opt-in genus set, and the Points page among its admin pages; the sheet does not replay the sea slugs, so nothing it computes changes, and the fish and the corals are as before

## v156 (2026-11-16)

Roles step 1: one can_() check and an Audit tab (Pierre, 2026-11-13, Q342-Q349: scoped roles, one account, one role, one scope, enforced by the sync script and never by the page; Q364, 2026-11-15: rights are separate, the platform admin may grant himself a role and the grant is logged; Q365: the pilot's name and 4-digit code are enough for now; ROADMAP "Roles, instances and cohorts", docs/SECURITY.md "Roles and the Audit tab"). Grants are kept in a new Roles tab (Account, Role, Scope, Since, Code hash; not columns of the RAs tab, whose columns are read by position and which would need a list per cell): the roles admin (the platform: the code, the base database, creating instances; it may grant any role at any scope), owner (an instance's players, settings and grants), editor (an instance's content) and trainer (an instance's cohorts, for roles step 2); the player role is every account's and is not stored; scopes platform and instance:imr (this sheet serves one instance, INSTANCE_). Every privileged endpoint (the reports, events and pages, the Alerts tab (readAlerts), the Analyses report, readStats, readAnswers, readLive, the players' management, and the new roles, roleGrant and roleRevoke) goes through gate_, which asks can_(caller, right, scope): the admin token (isAdmin_, reached only through caller_) is the platform admin as before and passes every right, since whoever can push to main can change this script; an account passes only what its grants give in their scope (an account holding only the platform admin role is refused an instance's players and content until it holds that instance's role), and no endpoint takes an account's name and code as its caller yet, so who may do what is unchanged. The Audit tab (Time, Admin id, Action, Scope, Result, Target id) gets one row per change and per grant or revoke, a self-grant marked (self), and refusals at most 20 every 6 hours; reads are not written (the admin page reads every minute); every id is an anonymous id (aid_, or gh: and 8 characters for the token, never the token), never a name. Pierre's grants (platform admin, owner and content editor of the IMR instance) are given once, as self-grants by the token, to the admin's account (ADMIN_ACCT) the first time the admin page reads the answer log signed in to it (rolesSeed_). A delete, a self-delete, a merge (its from) and an archive drop the account's grants, each with an audit row by id, and never move them (rolesDrop_, rule D7); the Audit tab keeps its rows by anonymous id only. No app change: nothing waits on this version (rule D4)

## v155 (2026-11-16)

The embedded core.js names Analyses › Difficulty › Heatmap among the fish's admin pages (SUBJECTS admin pages; Pierre, 2026-11-14, Q123 m: confusion heatmaps, the corals first, then the fish), so the admin's Fish side shows every family against every family, and every genus against every genus in its family's block, live from the fish answers. The sheet script reads no such field: nothing it computes changes

## v154 (2026-11-16)

The sheet script's one GitHub call (isAdmin_, GET /repos/{repo}) now sends X-GitHub-Api-Version: 2026-03-10 (rule W9, stack bump of 2026-11-16); none of that version's breaking changes touches that endpoint's fields (permissions), so the check behaves as before

## v153 (2026-11-16)

The embedded core.js names, for each subject with sheets at several ranks, the public files the admin reads its units and photos from (SUBJECTS admin files: the fish's fish.json, fish-photos.json and fish-game.json; the sea slugs' seaslug.json and seaslug-game.json), so the admin's Reports page shows a reported sea-slug photo with its credits and identification (Codex review #987, the integrator 2026-11-16). The sheet script reads no such field: nothing it computes changes

## v152 (2026-11-16)

The admin reads the Alerts tab (ROADMAP "Security follow-ups", Pierre, 2026-11-01: "show the Alerts tab in the admin"): readAlerts (admin token only, as readEvents) serves its last 3000 lines, newest first, each as its time and text; a line of the per-name answer cap (n:<name>) is served with the name's admin id in place of the name, so the admin page shows no name. Rule D7 (the integrator, 2026-11-16; Codex review #996): a line that names an account or a device (the per-name cap, the self-delete cap sd:, photos of another unit, a left-out device signed in) is served only while its admin id is a live account's or a device's still not signed in with answers, so nothing of a deleted, merged or archived account is shown. The tab itself is not changed

## v151 (2026-11-16)

The sea-slug subject (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 5; Pierre, 2026-11-15, Q369: one "sea slugs" subject, the Philippines as its area, scientific names only; Q377: circle 1 of 45 species) joins the embedded core.js SUBJECTS as a third subject that opens to a group (open: 'group', beta), so groupIds_ now names its group beside the others: the admin can add players to the sea-slug beta from its Players page from this version on (the admin's groupOn waits for it: SEASLUG_SHEET), and a signed-in reply says whether a player is in it. Its answers are logged like any subject's (Subject seaslug, sheet v60), never replayed (no replay, no replayed: its progress merges against its own base, sbase), with no leaderboard, no achievements and no photo pool (no pool: the sheet computes no photo statistics for it yet, and chk counts only the subjects that have one), so nothing the sheet computes for the corals or the fish changes. The core also gains treeCur (the curation as the fish engine reads it for a subject: its own part, seaslug, under the fish's key) and a family's commonness read over the subject's area where its tree names one (present.area, the sea slugs' Philippine observers), which the fish replay does not read (fish.json names no area)

## v150 (2026-11-16)

The embedded core.js can answer the false-alarm rate (faOf) from one table of every unit's false alarms and chances, built in a single pass over the records in the scan's own order (faArm, faDisarm; scoreAnswer empties it), for the rated world's simulation (tools/ratedworld.js), whose 10,000-answer fish check spent most of its time scanning every record once per unit (the integrator, 2026-11-15, after #975's check could not finish in the workflow's 6 hours). The script never arms the table: it scans as before, and nothing it computes changes

## v149 (2026-11-15)

The one-shot of v38 that moved the logged page names to the Coral ID Key's (ONCE_ idkey) is removed: its Script Property marks it done on the live sheet, so it no longer ran. The embedded core.js drops the devices' one-shot of the same rename (migrateIdKey) and the first-launch answers' at, unread since the open-all offer card went (CHOICE opts). Nothing the script computes changes (alpha rule W3; Pierre, 2026-11-07: "yes, remove it"; 2026-11-12, Q337)

## v148 (2026-11-15)

The embedded core.js lists Photos › Photo stats › Overview among the fish admin's pages (SUBJECTS fish admin pages: the fish photos in play in the fish words, the answers per photo from the answers alone, the sheet rating the corals' photos only): fish admin at parity with the corals (Pierre, 2026-11-08: "compléter la partie admin des poissons pour qu'il y ait toutes les fonctionnalités existantes de la partie coraux"). Nothing the script computes changes

## v147 (2026-11-15)

The fish leaderboard ranks by a score tree the sheet makes itself under the structure in force (docs/reviews/2026-11-14-sheet-overlay-design.md v2, step 4: the admin's structure editor; Pierre, 2026-11-15, Q359, Q363 (h) A; rule D8; Codex review #977). With the replay's units, subjRpl_ now makes the subject's score tree (core.js SUBJECTS replayed tree: fishBoardTree, the app's own UNITS tree, fishScoreTree over the families and the circle-1 scientific genera) from the same fish.json and the same circles and pairs from curation.json, checked as a tree an app sends (boardTreeOk_) and cached under the same fingerprint (stree1:<subject>:<fingerprint>, 6 hours, kept fresh by the 15-minute trigger). board_ ranks by it, read from the cache only (subjTreeKept_), so after a circle Publish the board's weights per family and circle move with the replays, whether a device saves or not; when it is not cached, the tree the apps sent (boardUnits_), as before, and a list kept from an app from before the score stays the board's scale. The apps keep sending their tree; nothing changes for them (no gate, rule D4)

## v146 (2026-11-15)

The fish replay runs under the content editor's structure (Pierre, 2026-11-15, Q359: circles and look-alike pairs are each instance's content, set by its content editor; Q363 (h) A: when he changes them, every player's progress is recalculated from the answer log, silently; Q366: the stored format of the design note's section 6; docs/reviews/2026-11-14-sheet-overlay-design.md v2, step 3). The replay's units are made from fish.json with curation.json's circles and pairs laid over it by the app's own core.js contentApply (subjRpl_: the curation read from main, its structure entries kept in the cache under their fingerprint structFp, the units and the structure stamp structStamp under that fingerprint, so fish.json is read again only when they change). The 15-minute trigger reads the curation again before the leaderboard's replays (subjStRefresh_), and a device that says a stamp the sheet does not hold (stn, sn_fish) makes it read it at once, at most once a minute (subjStSeen_). A request says the stamp its progress was replayed with (sts, st_fish); when it is not the sheet's, the sheet replays that player's log at the same rules version (replays_, replay_) and the reply says the stamp (st, left out when it is '': the base's structure). The stamp joins the Replayed tabs' cache identity after a ~ in the Since cell (rplSince_; no new column, a row of the base's structure reads as before), and the leaderboard replays a player whose saved data applied another stamp (boardRpl_, boardWarm_; rule D8; the public board reads the stamp from the cache only). A curation that cannot be read replays nothing, never the base's structure in place of the editor's. An app that says no stamp gets exactly what it got before; the app says its stamps and lays the structure over its units only from this version (core.js STRUCT_SHEET, rule D4)

## v145 (2026-11-15)

The other readers of the pooled stats read the snapshot too, the step #882 and #940 left next (Q123 j; Pierre, 2026-11-15, Q357: "numbers over all the data, stored, never simplified"): the admin's readStats (statsAdmin_; s now names the subject, the corals without it) is served from row 2 of the subject's Stats tab and a new row 4, the admin part the fold writes in the same run under the same lock (each player's ability by admin id, never a name, rounded as stats_ does, less a deleted account's answers, the fold's new D, and less the players archived when it is read; skip; both rows stamped with the run in Note), and the replays (rplMake_ for the corals, replayedAll_) read the pooled stats through statsServed_. Each makes stats_ exactly as before when the snapshot may not be served (missing, older than an hour, another version, older than the last delete, merge or archive, rows 2 and 4 from two runs, an empty log), so the 100 KB cache limit and the whole-log read no longer apply to them. The numbers are the whole log's (tests/statsfold.test.js: readStats deep-equal to stats_(true) for both subjects, every replay record and the admin's rp identical with and without the snapshot). A delete, merge or archive blanks row 4 with the fold (statsDirty_, rule D7). STATS.FMT 3: each subject's snapshot is rebuilt at the first run

## v144 (2026-11-15)

The backup to pCloud can go through a pCloud upload link (Pierre, 2026-11-15: no pCloud OAuth app, which needs pCloud's approval; an upload link on his EU-region account instead; docs/BACKUP.md): when the Script Property PCLOUD_TOKEN is not set and PCLOUD_UPLOAD_CODE holds the link's code, backup_ sends the .xlsx in one uploadtolink request (backupLink_: the code, an uploader name and nopartial in the URL, the file as multipart, no Authorization header) to PCLOUD_HOST or by default eapi.pcloud.com, only one of pCloud's two API hosts. The code can only add files, so this path keeps every backup and logs "saved … (upload link; old backups are not pruned)": Pierre prunes by hand. With both properties set the token path runs as before and each of its lines says so. The code, like the token, is never logged or returned (scrubbed from any error text, raw and URL-encoded; only pCloud's numeric result is logged)

## v143 (2026-11-15)

The leaderboard tree of a subject with a global score (the fish) is kept in chunks, so the species level fits (Pierre, 2026-11-15, Q375: "ok", option A of docs/reviews/2026-11-14-species-step1.md (c); Q362: one unit per species): a tree of up to 50,000 characters (BOARD_TREE_MAX_; 9,000 before) is cut on its entries into chunks of at most 8,000 characters (boardChunks_), each a script property named by the tree's checksum, the subject's key set last to point at them and the previous tree's chunks deleted after (boardTreePut_), so a board read under way never mixes two trees and one that finds a chunk gone reads the key again (boardTreeGet_). Every chunk passes the entry checks on its own and the whole tree boardTreeOk_, when it comes in and when it is read back, its checksum too. A tree refused, a kept tree that cannot be read back, or a failed leaderboard step of a save is never dropped silently: one line in the Deploy log, once per tree and reason in 6 hours (boardLog_). Every save reply now carries bt, the checksum of the tree the sheet holds per subject with a score ('' for none), so an app from this version (sync.js TREE_SHEET) sends its tree only when it changed or the sheet holds another, instead of with every save; an older app's save, list or tree, is handled as before, and a value an older script kept is read as before. No species unit is sent yet: the app PR of the species level opens them only from this version (rule D4)

## v142 (2026-11-15)

The embedded core.js holds the content editor's text slots (Pierre, 2026-11-15, Q359 and Q366; docs/reviews/2026-11-14-sheet-overlay-design.md v2, step 1): each subject's slot lists (SUBJECTS content: the fish families' tips, phases, look-alike lines, marks, life, juveniles note and a free note; the genera's tips and note; the species' note) and the one function that lays the edits stored in the instance's curation (curation.json content in each subject's part, {nodes: {node id: {slot: {v, was, src, t, by}}}}) over the built file (contentApply), with their states (fresh, stale, absorbed) and what is never applied (orphaned); merge3 merges each of those entries whole (a hide and a rewording of one slot on two devices conflict, never mix), and fishGen carries an edit's source into the units (qsrc, lsrc). The script does not read the curation for its replay: text edits never move progress, and the structure slots (circles and pairs) come with their own step

## v141 (2026-11-15)

The photo a Find the X answer tapped is logged (Pierre, 2026-11-15, Q371: "ok pour A"): the Answers tab gets a column at the end, Photo answered, after Device, holding the file stem of the photo the player tapped (the answer's pa, sent by the app only from this version: core.js PA_SHEET, logOut), checked as Photos (the same characters, at most 400), blank otherwise, for every other answer and for the rows logged before. Its species is read from the photo through fish-game.json, for FISH_PATH's view of the species taken for another family. Logged only: no score, replay, rating or reader uses it, and every column before it stays where it was

## v140 (2026-11-15)

The embedded core.js copy follows the app: the fish name index (fishNameIndex) also reads each species' regional standard names (fish.json cnr: the Australian ones, such as "Swallowtail puller"), accepted when typed as that species' family (Pierre, 2026-11-15, Q376 (c)). The script's own behaviour and the progress rules are unchanged: the replay never reads typed names

## v139 (2026-11-15)

A weekly backup of the whole spreadsheet to Pierre's pCloud (Pierre, 2026-11-15: "OK, launch the pCloud backup PR"; the professionalise study's question f): every Sunday at about 02:00 (trigger backupWeekly, made once by installBackup or the first click of the sheet's new menu Reef ID > Back up to pCloud now), every tab is written as one .xlsx built in the script and uploaded server to server to pCloud's HTTP API as reef-id-sheet-YYYY-MM-DD.xlsx in /IMR/reef-id-sheet-backups; the 12 newest backups are kept, older ones deleted after a successful upload. The token is the Script Property PCLOUD_TOKEN, sent only to api.pcloud.com or eapi.pcloud.com in the Authorization header, never logged; no new manifest scope; no token, a refused one or a missing authorisation only writes one line to the Deploy log (docs/BACKUP.md)

## v138 (2026-11-15)

The embedded core.js lists Analyses › Difficulty › Photos (What makes a photo hard) among the fish admin's pages and names the fish photos' features its analyses read (SUBJECTS fish analyses photos 'judged': the judged ease, phase and framing of the photos the game plays, fish-game.json; analysis.js photoMetaFish): the fish photos' own features in the fish Analyses (Pierre, 2026-11-08, ROADMAP "Analyses for the fish"). The report is still computed by the Analyses Action and only stored by the script; nothing the script computes changes

## v137 (2026-11-15)

The pooled stats are built incrementally for the fish too (Q123 j for the fish; Pierre, 2026-11-14: "j (pooled stats built incrementally, per subject) first"): every subject with game photos has its own fold, snapshot and reply, made by the same rules over its own answers (stats_(read, sid), statsFold_({sid})): the fish's in a Stats Fish tab with its own cursor (STATS_FOLD_fish) and cache, folded by the 15-minute trigger after the corals', and served by ?stats=1&s=fish (the corals' without s, as before). Exactly what stats_ makes from the fish's whole log, run after run, through every rebuild (tests/statsfold.test.js); a delete, merge or archive blanks every subject's fold at once (rule D7). The app does not read the fish's reply yet

## v136 (2026-11-15)

The embedded core.js classes an IMR lecture photo traced to its original source (data.json course pg, the page that credits it) as non-commercial (rightsClass 'nc': Corals of the World's terms, personal, non-commercial or academic use with citation, all other rights reserved), one not traced staying 'imr' (Pierre, 2026-11-15, after the lecture photo sources study #925: "credit the photos now with their original sources"). The rights tie-break (rightsRank) is unchanged for them; nothing the script computes changes

## v135 (2026-11-15)

The embedded core.js lists Photos › Photo review › By difficulty among the fish admin's pages (SUBJECTS fish admin pages: the fish photos ranked by their answers alone, the sheet rating the corals' photos only): fish admin at parity with the corals (Pierre, 2026-11-08: "compléter la partie admin des poissons pour qu'il y ait toutes les fonctionnalités existantes de la partie coraux"). Nothing the script computes changes

## v134 (2026-11-15)

The pooled photo stats are built incrementally (Q123 j, Pierre 2026-11-14: "j first"; the storage study's plan): the 15-minute trigger folds the new Answers rows into a Stats tab (statsFold_: at most 2,000 rows a step, 30,000 rows and 60 s a run, resumed at the next run; the cursor in the tab and in the Script Property STATS_FOLD), and ?stats=1 serves that snapshot (statsServed_, cached in parts) instead of reading the whole log at each request (the 100 KB cache would no longer have held the stats by December). The same reply, exactly what stats_ makes from the whole log (tests/statsfold.test.js): the answers older than a day are settled in time order, the newer ones folded again on top at each run; a late answer, a trust change of a settled player, a change of who is left out, a game pool change for a folded photo, a rewrite of the log (a sign-in's anonymous answers, a merge, a delete, a one-shot migration), a new version or a broken snapshot rebuild it over the next runs, the last snapshot served meanwhile (none after a delete, merge or archive: ?stats=1 makes stats_ until it is rebuilt). The fold keeps per-player trust counts, ability and photo memory by admin id, never a name; a delete, merge or archive blanks it at once (rule D7). Corals only; stats_ and the fold share one step (statsStep_, statsOut_), and core.js fmtOffsetsOf is split into fmtPoint and fmtFit (no rule change)

## v133 (2026-11-15)

The embedded core.js lists Inbox › To do › All and Points among the fish admin's pages (SUBJECTS fish admin pages) and names each subject's To do sections (SUBJECTS admin todo: the corals' photo sections, the fish's photo work): fish admin at parity with the corals (Pierre, 2026-11-08: "compléter la partie admin des poissons pour qu'il y ait toutes les fonctionnalités existantes de la partie coraux"). Nothing the script computes changes

## v132 (2026-11-15)

The embedded core.js retires the fish stopgap (Pierre, 2026-11-15): fishPhotos keeps an entry's photos in play from fish-game.json alone (all on R2), no longer joined by the remote iNaturalist photos of an entry short of 5 very easy curated photos; fish-photos.json's first photos per entry (the same records) stand in only while fish-game.json is absent. The fish photo pool the script reads for the photo exposure per player (POOLS entries) loses the 110 remote stopgap photos of 9 circle-3 entries; no progress rule changes

## v131 (2026-11-14)

The embedded core.js lists Analyses › Difficulty › Pairs and Analyses › Learning › Answer log among the fish admin's pages (SUBJECTS fish admin pages), with its word for the observations of a question's photos (admin obs): fish admin at parity with the corals (Pierre, 2026-11-08: "compléter la partie admin des poissons pour qu'il y ait toutes les fonctionnalités existantes de la partie coraux"). Nothing the script computes changes

## v130 (2026-11-14)

A small Timings tab measures how the sheet copes as the answer log grows (the storage study of 2026-11-14, step 1: "log ms and rows for each full read and for each save, sampled, in a small tab with no player data"; Pierre, 2026-11-14, Q352: the answer log moves to Cloudflare D1 only when a measured threshold is crossed): one row per measured operation (Time, Op, Ms, Rows, Cols, Version, Weight), never a name, code, device, answer id or answer content (rules D2, D7). Measured: the whole-tab reads of Answers (logRows_) and of its Id column (freshAnswers_, logAnswers_), the photo stats' build (stats_), every player's saved data (datas_), the leaderboard's replays (boardWarm_), and as a whole a completed save, an anonymous send that logged, a load, a public stats request, the admin's readAnswers and each run of the 15-minute trigger. Sampled per request (TIM.EVERY 50; trigger runs TIM.EVERY_TRIGGER 16) at that weight, plus every operation slower than TIM.SLOW 5 s (a trigger run 60 s) at weight 1; kept in memory and written at the end of the request (timEnd_, from doGet / doPost / autoUpdate's finally, after every lock is released), one appendRow a row inside try/catch, so a failure never touches a reply. The trigger keeps the tab bounded (timTrim_): past TIM.MAX 4,000 rows the oldest rows are deleted, back to 3,000 (TIM.KEEP), the kept rows as logged; past twice that nothing more is written. Read with tools/timings.js. Nothing a player sees changes

## v129 (2026-11-14)

The embedded core.js names the fish admin's Photos › Families page photos/tree (SUBJECTS fish admin pages): the tab became Tree, the key's classification as a tree of any depth (Pierre, 2026-11-13, Q340); nothing the script computes changes

## v128 (2026-11-09)

Other species in view, split in two (Pierre, 2026-11-09, Q323): the embedded core.js gains FISH_COUNT, fishCount and fishOther (a fish photo's count tag o, other species with no risk of confusion, may be in play; k, other species one could take for the subject, and the legacy m not sorted yet never are, rule P3) and its fishIn and fishPhotos read them; the script itself uses none of them (the replay and the leaderboards are unchanged), so nothing a player sees from the sheet moves

## v127 (2026-11-09)

The log is the only reference for progress (rule D9; Pierre, 2026-11-09, Q322, Q330): the full replay's record of a unit and its answer count win over a player's saved copy also when the copy holds more answers there (counted twice: a save whose reply was lost, then another device's save, #824), and a unit the log has no answer on loses the answers the copy counts on it, through core.js replayedOf and replayBase, so the leaderboard too (board_, boardWarm_, rule D8); the fish replay is no longer floored against the saved bars (replayFloor, floorRef_ gone; a record kept as {P, F} before is still read, rplRec_): a fish bar may go down. Rules version 10 (corals) and fish rules version 2, with no card (Q330)

## v126 (2026-11-09)

The shared core reads a typed fish name more plainly and through the name index, with no change to the sheet's own work (Pierre, 2026-11-09, the names study's plain fixes, Q319 and Q320): a family's name and its other number are one name (core.js typeForms), a name typed exactly is never read as a slip of another, a name several families share is all of them (typeMatchIn shared), and fishNameIndex lifts the names below a family (its species' listed and scientific names, its genera's names, the kind words of fish.json vn) to that family, each right only on a photo it designates (Q333: typeFits), with Pierre's exceptions (curation.json fish names); the sheet never reads typed text, so nothing it computes changes

## v125 (2026-11-09)

The admin's 🌱 added on its own, the account's name unchanged (replaces the v123 rename, userSeed, now removed): the account the admin page is signed in to when it reads the answer log with a valid admin token (answers_, its name and code sent as aname / apin, the code checked) is the admin's account, one at most, kept as its code hash in the script's properties (ADMIN_ACCT; another account signed in there replaces it); its rows on every leaderboard carry a 4th field 1 (board_) and its load reply admin: 1 (load_), which the app shows as a 🌱 after the name, outside the name's text; a delete, a merge (its from) and an archive of that account clear it (rule D7); new names holding the seedling or a look-alike stay refused (Pierre, 2026-11-09, Q328 corrected: "the emoji isn't part of my username", added automatically with no step for him)

## v124 (2026-11-09)

The Events tab takes a new kind, fromhome (ROADMAP "Load order, further steps" (c); Pierre, 2026-11-02, reopened 2026-11-09): the first page a visit opens from Home (app.js fromHome), its page name in the message column and {s, w, tr} in the detail (the seconds on Home, whether the page's tier was still on its way, whether the welcome tour ran), so the load order's tiers can follow which page players really open first

## v123 (2026-11-09)

The seedling 🌱 in the admin's own name, which no other player may have: the admin page renames its own signed-in account (users_ userSeed, with the admin's GitHub token and the account's name and code, checked as a save checks them) to its name with " 🌱" after it, or back without it (core.js seedName), moving the whole record as an archive does but keeping it live (RAs row with the code hash for the new name, saved progress, By genus, answers, reports, pages, beta groups, statistics exclusion, log mentions, Removed's Into, every subject's replay record), and the old name gets a Removed row pointing to the new one so the account's other devices are told to sign in under it; and the embedded core.js refuses a new account or an archive name holding the seedling or one of its look-alikes (herb, potted plant, shamrock, four-leaf clover, leaf in the wind) as reserved, an existing account keeping its name, so only the admin page gives such a name and one it frees can never be taken again (Pierre, 2026-11-09, Q328: "an icon the others are not allowed to have", the 🌱 emoji in his own name)

## v122 (2026-11-09)

the shared core reads fish-game.json in its short form (Pierre, 2026-11-09: an iNaturalist observation by its id and the original photo by its extension instead of full addresses, tools/fish_short.py): fishGameRead gives every record its addresses back before the fish photo pools are built (POOLS entries); the pools are the same as from the file before

## v121 (2026-11-09)

the shared core leaves the coral skeleton photos out of every photo list: applyCuration drops a photo marked skel (data.json, written by tools/apply_skeletons.py from judging/skeletons.json) wherever it is, as it drops an excluded one (rule P6, Pierre, 2026-11-09: coral skeletons are never shown, the features cannot be seen properly); nothing the script computes changes

## v120 (2026-11-09)

the shared core reads a typed answer faster, with the same answers: typeDist keeps three rows of its matrix instead of the whole one, typeMatchIn skips a name whose length is further from the text's than its spelling tolerance (the distance is at least that difference), and typeElse reads its lists' names once per norm (performance pass asked by Pierre, 2026-11-09: "what can we speed up in the app"); nothing the script computes changes

## v119 (2026-11-09)

Reserved account names: no new account and no archive name holds, as one of its words in any capitalisation, a member name of Object.prototype (constructor, __proto__, toString, valueOf, hasOwnProperty…) or prototype (core.js RESERVED_NAMES, reservedName): a save that would make one answers reserved before anything is logged or written, and userArchive into one answers reserved; an account that already has such a name loads and saves as before; and the maps by player that still had a prototype have none (the player list's numbers, the beta groups and their changes, the ids of readAnswers and the live view, the achievements' shares, the replayed progress of the list; core.js trustOf, eloReplay, playSplit, exposureOf), so such a player is a player like any other there and nothing is added to Object.prototype (Pierre, 2026-11-09: these names broke the maps by player; the front door refuses them, nobody locked out)

## v118 (2026-11-09)

Every leaderboard follows the rules: a player whose saved copy applied an older rules version of a subject (corals RVS, fish FISH_RVS, any subject's rvsOf) is ranked on that subject's board by the progress and level their app will hold once it adopts the replay of their log (core.js replayAdopted, the record sync.js replayAdoptS adopts: replayedOf over the saved copy, with the floor of a subject replayed with one), from the record its Replayed tab keeps for today's rules, row count and reset (boardRpl_); a player up to date, or one with no record yet, by the saved copy as before; the board only reads (nothing fetched, no lock) and stays cached 5 minutes. The 15-minute trigger, once up to date, makes those records ahead for every listed player behind the rules (boardWarm_: the replay of replay_, rplMake_, outside the script lock, all written under one short lock, each only if the account (same name and code, listed), its saved data, its answers of that subject since its reset and its Replayed row are, read again under the lock, what it was made from (Codex review #810, rule D7: an account deleted meanwhile never gets its row back), at most BOARD_WARM_MS of new replays a run), the same record the player's next sync reuses, drops the boards that changed from the cache and counts them in the Deploy log; one player's failure never stops the others' or the board, and every map keyed by a player name, core.js replayProgress's too, has no prototype (Codex review #810: a player named constructor) (Pierre, 2026-11-09, rule D8: "whenever progress is recalculated, the leaderboard must be recalculated automatically, even if people do not reconnect")

## v117 (2026-11-09)

The fish replay stored and sent at last: a tab that exists but is empty (made by hand, or by anything but sheet_) gets its header as a new tab does, and find_ reads no name in an empty tab instead of throwing; the sheet's "Replayed Fish" tab stood empty without its header, so every fish replay failed in replay_ before it was stored or sent (replays_ leaves a failed subject out) and no fish player was replayed while their apps asked at every sync (Pierre, 2026-11-08, Q298, Q310: every fish player's progress replayed from the answer log, today's bar as a floor; production bug, 2026-11-09). And core.js replayProgress keys its players without a prototype, so a player named like an Object property (constructor, __proto__) is replayed like any other (Codex review #810)

## v116 (2026-11-09)

Lighter saves on slow lines: a light save (the app's light, wrapped as {z: base64 gzip} or {lt} so an older script finds no name and writes nothing; a body it cannot unpack answers zip) sends only what changed since the copy it holds at its revision (dz, core.js dataDelta) with the checksum of its whole data (sum, dataSum), rebuilt here on the saved copy and kept only if the checksums agree (lightData_, dataPatch; else delta, before anything is logged), or its whole data under the new key names, the old ones added here (withLegacy); its reply says the checksum of the copy saved (sum); a light save against another revision is answered stale before anything is counted or logged, with the load of the copy there (load_, read once the lock is released), so the app merges and saves again without a load of its own; a load says the revision of the copy the device holds (have) and an unchanged copy comes back same: 1 without it; a light request's hold names the answers from pt only (hold_: not the last 500) and its loads serve the copy under the new key names only; an app that does not ask is answered as before (Pierre, 2026-11-08, ROADMAP "Lighter saves on slow lines": field use at IMR on weak connections, "save failed" seen there)

## v115 (2026-11-09)

the admin can leave a player or a device not signed in out of the statistics (POST {statsExclude: admin id, on, token}, users_; the tab "Stats excluded", sxSet_, sxPut_): their answers rate no photo, confusion, photo memory or format offset (stats_), readAnswers and the player list serve the ids as excluded and the Analyses report drops their rows (tools/analyses.js), a change drops the photo stats and makes the report stale (rosterChanged_); their own progress, level and leaderboard place stay, and a delete, merge or archive moves or drops the row (sxMove_, rule D7); and an answer whose photos are game photos of another unit or subject and none of its own (photoCheck_ over pools_, a coral photo named after its genus counting as its own, photos in no pool unsure) rates no photo in stats_ (skip counts in readStats), is logged as every answer, never refused, and the first such send of each 6-hour window per sender is written to the Alerts tab under its admin id (photoAlert_, against the cached pools only), a fish answer at the genus or species level checked against its family's photos and an old entry id as the family it became (unitUp_, core.js renamedId); only an answer that rates gives a photo its genus offset, so a left-out or flagged one moves no photo difficulty; the game pools are cached in parts (pool2<subject>, cacheBigPut_: the fish pool is over the cache's 100 KB a value) and stats_ reads every subject's; a device left out that signs in stays out, its row moved to the name's admin id with an Alerts line by ids once the account is saved (the claim of the device's answers too: a stale or failed save moves nothing) (the integrator, 2026-11-09); nothing is fetched under the script lock (stats_ reads the cached pools only, except for the public stats and readStats, stats_(true)); a unit, answer, mode, photo or choice holding a word Object.prototype has (constructor, __proto__) is refused when logged (word_, protoWord_), such rows logged before are left out of answerRows_ and the photo exposure, and stats_'s maps have no prototype (Pierre, 2026-11-08, ROADMAP "Security follow-ups": "je suis ok avec tout ce que tu as listé")

## v114 (2026-11-09)

core.js SUBJECTS fish admin pages: Inbox › To do › Health and Analyses › Learning › Stops on the fish side (fish admin at parity with the corals, Pierre, 2026-11-08: "j'ai besoin d'avoir les outils pour pouvoir continuer d'avancer"); the script reads nothing new (its embedded copy of core.js only)

## v113 (2026-11-09)

one Analyses report per subject (Pierre, 2026-11-08: each subject's analyses refitted every 1000 answers of that subject, "fish when the fish analyses exist"): the corals' report stays in the Analyses tab, another subject's goes to a tab of its own ("Analyses Fish", anTab_, as the fish replay's records); analysesGet reads the stored report of the subject asked (default the replayed one, the corals, no longer the stored report's subject), analysesPut stores a report in the tab of its subject (none: the replayed one), and both refuse a subject the script does not know (input), so a fish report never replaces the corals'; the Action computes each subject's report from its own answers (tools/analyses.js sheetRunAll) and the admin's Analyses follow the Corals | Fish switch (admin-analyses.js, gate analysis.js AN_SUBJ_SHEET); core.js SUBJECTS analyses (the subjects with a report, whether their photo features are read, the admin's words for their units) and the fish admin's Analyses pages

## v112 (2026-11-08)

the fish progress replayed from its answers is floored by the script, so today's bars are a floor at its first replay (replay_, floorRef_, core.js replayFloor: against the saved copy's units no replay gave yet, the replay's record with its domain score lifted to the saved bar, the reference kept with the record in "Replayed Fish" for the replays of the same fish rules version and dropped by a progress reset, none under a later version; Pierre, 2026-11-08, Q310; the integrator, 2026-11-08: per unit, once), and the app adopts the fish replay from this version (sync.js replayAdoptS, core.js REPLAYS_SHEET); an account merge drops every subject's rules version applied (reefid-sync-fish-rv too)

## v111 (2026-11-08)

the progress of the other subjects the sheet replays (core.js SUBJECTS replayed: fish) is replayed from their own answers too (replay_ per subject, its units from fish.json: core.js fishReplayGen, cached 6 hours; under its own rules versions, core.js FISH_RVS, rvOf, so the corals are not replayed again; its record kept in the tab "Replayed Fish"), in the reply to a sign-in, a load, a save or an anonymous send whose app asks for it (rvs: {fish: its rules version applied}; the load's rv_fish), as replays: {fish: {rv, n, rec, ids, fp}}; an app that asks for none gets none, and the corals' replay is unchanged; a delete, merge, archive or claimed device drops those rows too (Pierre, 2026-11-08: "recalculate every player's progress from their answers", Q298, Q310)

## v110 (2026-11-08)

the admin's light read for a live Players › Activity (Pierre, 2026-11-08: "Les deux"): POST {readLive: 1, token} → {ok, rows: the Answers tab's last 50 rows with a player, as readAnswers serves them (answerOut_, now shared by both; a surprise card's left out), last: {admin id: time ms of each player's last answer}, from the Activity tab's QUERY while it holds the script's formula, else from the Name, Time and Mode columns, a deleted account's and an archive's left out, n: the tab's answer rows, k: the window read} (live_), admins only, no script lock, nothing written; the admin re-reads it every minute while Activity is open and in view (admin.js LIVE_SHEET); nothing else the script does changes (a device not signed in now sends each answer about 3 s after it, sync.js anonSoon: the same anon_ and caps)

## v109 (2026-11-08)

a new last Answers column, Device (Pierre, 2026-11-08, Q312): the anonymous id of the device that sent the answer (sync.js devId, the Device of its Events and Pages rows), one dev per save or anonymous send written in each of its rows (logAnswers_, dev_: 8 to 16 lower-case letters and digits, else blank), signed in or not; an app before it sends none and its rows are logged as before, Device blank; logged only, served by no reader (readAnswers unchanged); kept through a claim at sign-in, a rename and a merge, blanked when a delete keeps the answers as "~deleted <id>" (devBlank_, rule D7); the app sends it from this version (sync.js DEV_SHEET)

## v108 (2026-11-08)

no change to what the script does: the comment on VERSION says it is assigned at merge with the header line (tools/sheet_version.py --assign; Pierre, 2026-11-08, Q305)

## v107 (2026-11-08)

the embedded core.js drops the Coral Finder book's crops (applyCuration and applySlots no longer read gen.book or curation "book"; CAP.book gone; cfCrop names a crop's id), unused by the script: nothing it computes changes

## v106 (2026-11-08)

the embedded core.js gives the Coral ID Key 5 other observers' photos per view (CAP.inat, was 2), unused by the script: nothing it computes changes

## v105 (2026-11-08)

the Analyses head counts each subject's answers apart (analysesGet counts, core.js subjCounts: a subject's rows with a player; answers, the asked or stored report's subject's, no longer every row of every subject), so the corals' analyses are refitted every 1000 coral answers, the fish answers never moving them, and the stored meta keeps the report's subject (Pierre, 2026-11-08)

## v104 (2026-11-08)

the embedded core.js gains the one-time notices told on any device of an account (TOLD, toldUnion: reefid-sync-told, stored as it comes like any travelling key); an account merge (mergeUsers) keeps the union of both accounts' notices told: nothing else it computes changes

## v103 (2026-11-08)

the embedded core.js gains the photo rights tie-break (licOf, rightsClass, rightsRank: between otherwise-equal photos, an open licence or Pierre's own before CC BY-NC, in easyRank and applySlots; Pierre, 2026-11-08, Q270), unused by the script: nothing it computes changes

## v102 (2026-11-08)

the embedded core.js gains the fish achievements around the global score (Pierre, Q259-Q263: FISH_ACH redesigned, fpct25 retired, flearn30 in ACH_LEARN) and achRecount (the app's recount, progress.js ACH_V 3), unused by the script: achs_ counts every id of the one achievements record as before, and a record recounted by the app holds no retired id; nothing it computes changes

## v101 (2026-11-08)

the fish leaderboard by the fish global score (Pierre, Q242; core.js SUBJECTS fish score, treeScore): a subject with a score sends its tree with a save (summary.boards {id: {f, s}}, kept in the script's properties as its units list was, boardTreeOk_), and its board ranks by treeScore's % over it, the % My progress shows; a list (an app before it) is kept and read as before; the embedded core.js gains rankWeights and treeScore

## v100 (2026-11-08)

an Answers column Rejected tries at the end, the texts a typed answer had refused before it (Pierre, Q237), logged only

## v99 (2026-11-08)

the admin changes a player's first-launch answer for one subject (Pierre, 2026-11-08, Q228): POST {userStart: name, s, c, token} appends a choice event via 'admin' to that subject's record (core.js startAdminSet, its history kept) and writes the copy with the revision bumped, so a device mid-sync reads it again and merges it (startUnion: the latest answer wins); nothing else changes

## v98 (2026-11-08)

a surprise card's answer (Mode wink, core.js WINK_MODE) is logged like any other and left out of every reader: replayed_, answers_ (readAnswers), the Activity tab

## v97 (2026-11-07)

the embedded core.js gains fish circle 3 opened by choice (SUBJECTS fish optin beyond, openState, OPEN_AGAIN; mergeUsers keeps an opt-in's larger "Not now" count), unused by the script but in an account merge (the quiz settings merged as before, plus that count): nothing it computes changes

## v96 (2026-11-06)

the embedded core.js gains the fish achievements (FISH_ACH, SUBJECTS achs, achFeats, achFind, ACH_CONTRIB; newAch and achRevoke take a list), unused by the script: achs_ counts every id of the one achievements record as before, fish ids included

## v95 (2026-11-06)

one leaderboard per subject (Pierre, 2026-11-04: separate per subject, no merged ranking; core.js SUBJECTS fish board): GET ?board=1&s=<subject> serves that subject's, ranked by its % (core.js pctOf on the player's saved progress of that subject, over the units its apps last sent with a save, summary.boards, kept in the script's properties: boardUnitsSave_), then its level ('~level' of that progress); no s, the corals' as before; the opt-out, an admin's hide and an archive hold for every subject; each subject's board cached apart (board14:<id>) and dropped with the others on a hide, delete, merge or archive

## v94 (2026-11-06)

the embedded core.js lists the fish admin's Look-alikes page (SUBJECTS fish admin pages photos/look-alikes; admin plan PR 10), unused by the script: nothing it computes changes

## v93 (2026-11-06)

the embedded core.js lists the fish admin's Photo review pages (SUBJECTS fish admin pages photos/review/ease and photos/review/phase-framing; admin plan PR 9), unused by the script: nothing it computes changes

## v92 (2026-11-06)

the embedded core.js lists the fish admin's Coverage page (SUBJECTS fish admin pages inbox/coverage/games; admin plan PR 8), unused by the script: nothing it computes changes

## v91 (2026-11-06)

the embedded core.js lists the fish admin's Candidates page (SUBJECTS fish admin pages, photos/candidates; admin plan PR 5a), unused by the script: nothing it computes changes

## v90 (2026-11-06)

the embedded core.js gains each subject's icon (SUBJECTS icon, moved from app.js UNITS for the admin's mini subject switch), unused by the script: nothing it computes changes

## v89 (2026-11-06)

the embedded core.js gains winkUnion and an account merge (mergeUsers) unites each subject's surprise cards met (each surprise once per player, Pierre 2026-11-06; Codex review #652), stored in the Data column as any other key: nothing the script computes changes

## v88 (2026-11-06)

the embedded core.js gains domFromCounts, the app's silent rebuild of a non-replayed subject's units (fish) under the domain-score bar from each record's counts (Pierre, 2026-11-06, Q200), unused by the script: nothing it computes changes

## v87 (2026-11-06)

the domain-score bar (Pierre, 2026-11-06, Q127-Q129, Q135; merge approved 15:41, Q196): the embedded core.js scores a genus's bar as the share of all its possible photos the player would name alone and typed, the posterior expectation on a grid of abilities from a fixed population prior and the player's own answers on that genus only (core.js DOM, domStep: s.dp the log posterior, s.ds the bar), less the genus's false-alarm rate (Pr = H - FA, Snodgrass & Corwin 1988: a genus named by mistake is no miss on its own photos, Q174), in place of the moving average s.pg; the full replay (replay_, replayedAll_) gives it the genus offsets of ?stats=1 gd for the rows logged without them (an answer's Scoring record now carries the offsets the app used, m and n, and the typed format's offset and the slope when the app has them, t, s; o, the format's offset, as since v77), core.js rules version 9 replays every player once; the leaderboard % calls core.js pctOf itself instead of a copy (pctOf_), so the two never drift apart; the app gives a genus first answered the new bar only once this script replies v >= 87 (core.js DOM_SHEET, rule D4); the load and save replies carry notes, the Notes tab's card.* lines (notes_: Pierre's text that is never in the repo, the PS of rules version 9's apology card under the key card.rv8.ps, core.js RV_SORRY); the exam's entry needs pair coverage in the app (core.js looksLeft, Q129), nothing the script computes

## v86 (2026-11-06)

the embedded core.js gains the fish photos in play by themselves (fishIn, fishGone: a candidate judged sure or a reference-level photo, hosted on R2, until Pierre rejects, excludes, moves or undoes it; Q180, Q199), unused by the script: nothing it computes changes

## v85 (2026-11-06)

the embedded core.js lists only the scientific genera as the fish opt-in set (SUBJECTS fish optin: ['sci']; Pierre, 2026-11-06, Q175: every fish circle is on the path and counts in the progress, the circle 2 and 3 opt-ins gone), so an account merge no longer keeps a stored c2 / c3 choice on; nothing the script computes changes

## v84 (2026-11-06)

the embedded core.js builds the fish units from the book's families (fishGen over fish.json families, each family's look-alike sources from its lsrc, its typed names with the IMR entries' aka and often: the switch, units plan PR 4) and moves a stored record's old unit ids (renameUnits, read by the app), unused by the script: nothing it computes changes

## v83 (2026-11-06)

the embedded core.js gains the fish draw's calibration for big pools (SUBJECTS calib u and pool, CALIB pool: an unanswered fish photo's narrower targeting and the floor shared over 30 observations; Pierre, 2026-11-06 15:33, Q186; the corals keep their draw), unused by the script: nothing it computes changes

## v81 (2026-11-06)

the admin's player list gives each player's photo exposure per subject (Pierre, 2026-11-06, Q191; the photo exposure study §5): ex {subject id: [seen, of, hit, asked, units]}, Seen % and Spread % (exposure_, core.js exposureOf over each subject's rows), against each subject's game photos per unit grouped by colony (pools_: core.js unitPool over the files its SUBJECTS pool names, read from GitHub main, cached 6 hours per subject; the games' Research Grade rule for Millepora and the bonus genera); nothing is stored, nothing the app reads changes

## v80 (2026-11-06)

the embedded core.js gains the fish sheets' addresses (SUBJECTS sheets: #fish/learn/family/Damselfishes, genus, species; routeOut, routeIn; sheetIdOf, fishTree), unused by the script: pageName names every fish sheet learn.genus, as before for the corals' words, so nothing it stores or serves changes

## v79 (2026-11-06)

the embedded core.js lists the fish admin's Families page (SUBJECTS fish admin pages photos/families: admin plan PR 6 on the book's families), unused by the script: nothing it computes changes; v78 is taken by a pending branch

## v77 (2026-11-06)

per-format offsets (Pierre, 2026-11-06, Q138): stats_ fits each question format's offset (core.js fmtOffsetsOf: 4 choices, 4 shown with 3 or 2 plausible, Again, a duel in the quiz, the Duel tab, an exam question, typed; an offset in logits on the app's log-odds, the guess rate kept at 1/k, fitted on the trusted answers' logged expectation with a N(0, 1) prior, from 20 answers) and serves it in ?stats=1 as fmt: {format: [offset, answers]}; the app's ability steps take it from this version (core.js FMT_SHEET, 77) and log it in the scoring record (scoreRec o), which the full replay (replay_, replayedAll_) replays as logged, a row logged without a scoring record taking the offset served now (core.js rules version 8); stats cache stats17

## v76 (2026-11-06)

the embedded core.js reads a FishBase reference or sheet photo (fb<stem>) and its candidate (fish-<species>-cand-fb-<stem>) as one photo (fishPid; Codex review #660), unused by the script: the fish answers are not logged, so nothing it computes changes

## v74 (2026-11-06)

the embedded core.js accepts more typed fish names (fish beta QA: fishNames reads a node's curated other names, fish.json aka, and its names in common use, often, which fishGen lists as oft and the typed match returns for a gentle correction; fishTypeNames, with SUBJECTS typeDrop, the name without "fish", its plural and the name's own plural, when unambiguous in the game), and gains SUBJECTS several (the report dialog's "Several corals" / "Several fish species" reason), unused by the script: nothing it computes changes; v72 and v73 are held by #655 and #599

## v71 (2026-11-06)

the embedded core.js puts a fish unit's reference-level photos first (refLevel, refFirst: a reference source's photo judged very easy, or any photo judged 5 with the reference look, one kind of fish; Pierre, 2026-11-06) and gains the subjects' difficulty calibration (SUBJECTS calib, CALIB, calibOf: the corals keep the defaults), unused by the script: the fish answers are not logged, so nothing it computes changes

## v70 (2026-11-06)

the embedded core.js gains the fish game photos (fishOn, fishPid, FISHPH, fishPhotos: the photos Pierre put in play, hosted on R2, in place of the stopgap list where an entry has 5 very easy ones; admin plan PR 7), unused by the script: only the replayed subject (the corals) feeds what it computes, so nothing changes

## v69 (2026-11-06)

the fish units are the book's families (Pierre, 2026-11-06 13:04; docs/reviews/2026-11-06-fish-units-plan.md): the embedded core.js gains the old-id map (SUBJECTS renamed, renamedId, renameUnits, renameLogEntry); a fish answer naming an old entry (t01, from an app before the switch) is logged under its family (f:Damselfishes; one map per row, the species shown deciding a split entry: Diploprion is the Soapfishes), and so are a report's units (f: ids accepted); a one-shot migration (ONCE_ fishunits, Pierre's yes, Q159) renames the fish rows and reports logged before, in the Deploy log

## v68 (2026-11-06)

the embedded core.js orders a fish unit's photos by their ease, then how much they look like a reference photo, never by who took them (easyRank, refScore; Pierre, 2026-11-06), and marks the corals' photo source tiers (SUBJECTS tiers), unused by the script: nothing it computes changes

## v67 (2026-11-06)

fish opens to every player (Pierre, 2026-11-06, Q158: "open fish to everyone now", the beta label kept): the embedded core.js has SUBJECTS fish open: 'all', so groupIds_ lists no subject: the load and save replies carry groups: [], userGroup answers error 'group', the admin's player list has no Beta column, and the Groups tab's rows are kept (read again if fish goes back to open: 'group')

## v66 (2026-11-06)

the embedded core.js gains the admin's filter bar fields (admin plan PR 3: SUBJECTS admin origins, each subject's photo origins, and csrc, its Candidates sources), unused by the script: nothing it computes changes

## v65 (2026-11-06)

the embedded core.js gains the app's addresses (URL refonte: routeOut, routeIn, the page names learn.genus, practice.quiz… of pageName, routeRename, pageRename, migrateRoutes) and the subjects' address prefix (SUBJECTS hash); pagesClean keeps the new names as they come ('.' and '-' were already allowed), so nothing the script stores or serves changes

## v64 (2026-11-06)

the embedded core.js names the fish admin pages by their new addresses (URL refonte: SUBJECTS admin pages inbox/todo/reports, inbox/todo/errors, players/list), nothing the script does changes

## v63 (2026-11-06)

one player level shown everywhere (Pierre, 2026-11-06, Q134): the leaderboard's level (board_) is the app's own, the th of the '~level' record in each player's saved progress, read with the % from the same copy, from ELO_MIN answers of that record; stats_'s chain R (start -1) no longer reaches the board and stays internal: the photo Elo's player term, and ras for the admin; nothing a player's progress holds changes (no rules version); v57-v65 were taken by pending branches

## v62 (2026-11-06)

one surprise counted once (Pierre, 2026-11-06, Q137 part 1): the embedded core.js scoreAnswer has the genus shown take the global level as it stands after the answer's step on it, so the genus's levelMove carries only the level's moves from the other answers; core.js rules version 7 replays every player once; nothing else the script computes changes

## v61 (2026-11-06)

one scorer (Pierre, 2026-11-06, Q132): the app and the full replay score an answer through one function, core.js scoreAnswer, and each answer carries what the app scored it with (sc: the photo difficulty, the photo memory, the mix-ups term, the look-alike test, the recalls of a comeback question, the corallites hint revealed after the answer), kept in a new last Answers column, Scoring (core.js scoreRec as JSON, each field checked; blank when the app sent none), read by its name and served by readAnswers at index 15 (an object, null before), and replayed at index 15 of the replay rows (rowOf_), so replay_ and replayedAll_ rebuild exactly the progress the app had for those rows, whatever pooled stats they hold; rows logged before keep the replay by their logged e; core.js rules version 6 replays every player once; the Answers tab is read up to its last column (answerRows_, answers_), so a tab not yet widened reads as before

## v60 (2026-11-06)

every subject's answers are logged (Pierre, 2026-11-06: fish answers logged from the very first second; the sheet records an answer at any taxonomic level): the Answers tab gets five columns at the end, Subject (the answer's subject, core.js SUBJECTS id: coral or fish; blank in the rows logged before, all coral; an app that sends none is coral), Rank (the rank asked: coral genus; fish family, an IMR entry, or genus, a scientific genus; later species), Taxon shown and Taxon answered (the names at that rank when a unit's id is not its name: Damselfish for t01, Chromis for g:Chromis; blank for a coral genus) and Species shown (the PDF species of the fish photo shown); Genus shown, Answered, Choices and a duel's mode keep the units as the app asks them (t01, g:Chromis allowed: digits and ':' after a first letter); only the subject the sheet replays (core.js SUBJECTS replay: the corals) feeds what the script computes (answerRows_: photo ratings, genus offsets, confusions, memory, trusted players, the opening hold, the full replay; the admin's player list numbers in users_), so a fish answer moves no coral number; readAnswers serves the five at indexes 17-21, after v59's Typed and Retyped right, now served at 15-16 (the subject filled with coral, the rank with the subject's, in the rows logged before) and every reader of one subject keeps its rows (core.js subjRows); a tab with fewer columns reads them blank (logRows_) until the next answer adds them; the embedded core.js renames SUBJECTS log to replay, adds rank, the answer-log subject helpers and LOG_SHEET 60, the version from which the app sends the answers of a subject the sheet does not replay (rule D4)

## v59 (2026-11-05)

the Answers tab gains two columns at the end, Typed (a typed answer's raw text as first typed, up to 40 characters) and Retyped right (its spelling step: 1 retyped exactly, 0 not, blank when none was asked; quiz.js typeBind, a player's idea approved by Pierre the same day), logged only, and the embedded core.js gains typeVerdict and typeDiff, unused by the script: nothing it computes changes

## v58 (2026-11-06)

archive instead of rename (Pierre, 2026-11-05, Q84/Q88; the deleted-accounts audit, PR 2): admin {userArchive: {from, into}} (was userRename) moves the record to the archive name and marks it Board -2 (no new column); an archive leaves normal operation: liveRows_ keeps it out of the leaderboard, the achievement shares, the player list (sent apart as archived: [{name, id, time, answers, reports}]), the beta groups (dropped at archiving; userGroup adds live players only), readAnswers' players, and repsOf_-style readers; its answers are flagged 2 in readAnswers as a deleted account's (pooled photo statistics only) and left out of stats_ ras; a merge, a rename or a leaderboard toggle refuse an archive (error 'archived'); a delete still takes it, in either mode; a player's own save never undoes Board -1 or -2; each account's saved data keeps its generation _acct (made at its first save, kept by every save and merge, sent apart as acct in the load reply), so a device that knew another generation of the name says the record was archived; the app's device of an archived record sees found: false while it holds a sheet revision and says the record was archived instead of re-creating it (sync.js); a player deletes their own account and all its data (POST selfDelete with dname / dpin, selfDelete_: the code checked, "delete everything" semantics, the Removed tombstone only, capped 3 tries per name (keyed by its anonymous id) and 30 in all per 6 hours; the app's #delete-account page); archiving moves the record's name mentions in Events and Alerts to the archive name (redact_, as a merge), so deleting the archive leaves none; a report carries the account generation it was queued under (racct): from another generation of the name, or under a name that has no account left, it is logged with no reporter, Verified 0, never the new account's (Codex review #603); a save carries the generation the device saved under (acct): checked under the lock before anything is logged or written, a name with no account left or another generation of it answers error 'archived'; page summaries carry it too (eacct) and another generation files them under no player; a save's reply carries the generation (acct), so the device that created the account knows it at once; a report's generation is checked whatever its code or throttle

## v57 (2026-11-06)

a player's load reply (GET name, pin) carries reps, the ids of their own verified reports in the Reports tab (Reporter their name, Verified 1, sent after the name's last removal if it was deleted and taken again; the last REPS_MAX = 50; no field when none: repsOf_), so their app can tell them once that a report was handled (Pierre, 2026-11-05, Q66: the app reads the admin's Done from curation.json seen 'rep:<id>' and thanks the player; Pierre's notes are never sent); an older app ignores the field; the embedded core.js gains repsAdd and helpedTake (the app's side), unused by the script

## v56 (2026-11-06)

the embedded core.js gains the Contributions achievements (Pierre, 2026-11-05, Q65: core.js ACH kind 'contrib', fb1 / fb5 / fb10 for the 1st, 5th and 10th report sent; contribKey, contribAdd, contribJoin) and mergeAch joins two records' lists (the reports counted, _fb), unused by the script: it stores a player's achievements record as it comes and counts its ids for the shares (achs_) as before, so nothing it computes changes

## v55 (2026-11-05)

a deleted account leaves nothing in normal operation (Pierre, 2026-11-05, Q84-Q91): userDelete with answers deletes the account's reports too, without answers relabels them "~deleted <id>" with Verified 0 (open ones stay in the admin's Inbox as from a removed account, never thanked); the page summaries are always deleted (Pages); name mentions in Events ('old' rows) and Alerts (n:<name>) are redacted; a delete or merge clears the board, achievements and stats caches and marks the stored Analyses report stale (analysesGet head stale, ROSTER_AT), so the Action refits it at once; readAnswers flags the "~deleted" rows 2 in the anonymous column (1 stays a device that never signed in), and stats_ leaves them out of the per-player abilities (ras), the photos, genus offsets, confusions and memory keep them; a report sent with the name and code of a removed account is logged under the name it joined (merged) or with no reporter, Verified 0 (deleted); a device's Replayed row is dropped when its answers are claimed at sign-in or deleted (anonDelete); a one-shot cleanup (ONCE_ removedcleanup) deletes the Replayed rows of devices with no answer left and the reports of accounts deleted outright before this version, logged in the Deploy log

## v54 (2026-11-05)

comments only: this file and the embedded core.js cite Pierre's rules by their new IDs (docs/rules/), nothing the script does changes

## v53 (2026-11-05)

the beta groups (groupIds_) are the subjects that open to a group (core.js SUBJECTS open: 'group', subjGroup), no longer every subject with a beta label, which is now the label only; fish says open: 'group', so the groups, replies and Groups tab are the same as v52, and a subject set to open: 'all' keeps its rows in the Groups tab (read, never deleted) for a return to 'group'

## v52 (2026-11-05)

the embedded core.js's achievement descriptions say the runs of right answers and Sharp eye are earned in the Quiz only, not in the custom quiz or the Duel tab (Pierre, 2026-11-05, Q82; the app's progress.js achAfter), unused by the script: nothing it computes changes

## v51 (2026-11-05)

the embedded core.js gains the photo fallback helpers (photoOnline, photoFileOf, photoAway, photoFallback, photoIndex, photoCropOf; Pierre, 2026-11-05: when R2 fails, a photo with an online original is read from it, not from img/), unused by the script: nothing it computes changes

## v50 (2026-11-05)

every reply is the script's own JSON (Pierre, 2026-11-05: "save failed" too often): an exception thrown out of doGet / doPost (the script lock not had in time, a Sheets service timeout or quota, a script error) made Apps Script answer with its HTML error page, which has no CORS header, so the browser told the app "Failed to fetch" / "Load failed" although the script had answered; it is now caught and answered {ok: false, error: 'lock'} (the script lock waited for LOCK_MS, 20 s, held by another request: lock_, tryLock) or {ok: false, error: 'server', msg} (fail_), which the app retries; a save releases the script lock once its progress is written, its hold, groups and full replay computed after (the replay under its own lock, as a load's), so the lock is held for less time; the photo stats request carries the app's anonymous device id (dev) and the minutes its page has been open (up): the newest build reported is kept (BUILD_TOP), and a device on a replaced version is logged in Events as kind 'old' with its device id and version, when its page stayed open OLD_OPEN minutes on a version replaced OLD_H hours ago or it started a version replaced OLD_STUCK hours ago (behind_), at most once per device every 6 hours

## v49 (2026-11-05)

the embedded core.js keeps the sheet-only fish photos (use: 'ref', fish-photos.json sheet: a species with no game photo may keep one for its sheet, never in a game) out of a fish entry's game photos and lists them by species (fishGen sheet), unused by the script: the fish answers are not logged, so nothing it computes changes

## v48 (2026-11-04)

beta groups (Pierre, 2026-11-04: fish opens to a group of players he picks in the admin, not by one site-wide switch): a Groups tab (Group: a subject in beta, core.js SUBJECTS beta; Name; Added), admin POST {userGroup: name or [names], group, on, token} adds or removes players (existing players only, under the script lock), the admin's player list (users_) and each player's load and save replies carry the groups they are in (groups: [subject ids], [] for none: an older script sends no field, so the app keeps the beta subject closed), and a rename, a merge or a delete carries the memberships

## v47 (2026-11-04)

the embedded core.js asks the first-launch question per subject (SUBJECTS start, its words; core.js startKey: the fish welcome question's answer in reefid-sync-fish-start beside reefid-sync-coral-start; CHOICE.opts keeps only the ids and variables) and an account merge (mergeUsers) unites each subject's record; the coral record the replay reads (startOf_) and everything the script computes are unchanged

## v46 (2026-11-04)

players' reports keep a genus question's units (g:Platax); the embedded core.js lists the fish scientific genera's opt-in set (SUBJECTS fish optin sci), so a player's choice merges like the circles'; nothing else changes here

## v45 (2026-11-04)

the embedded core.js gains the admin's part of each subject (SUBJECTS admin: its address prefix, its part of curation.json, its admin pages), unused by the script: nothing it computes changes

## v44 (2026-11-04)

each answer's UTC offset on the player's device (tz, minutes east of UTC, Date.getTimezoneOffset at answer time, sign turned) in a new last Answers column, UTC offset, logged only and served by readAnswers at index 14; a one-shot migration (ONCE_ tz) fills +480 into the rows logged before (every player so far was on Philippine time), so the analyses can read the time of day at home of players outside the sheet's time zone; the app sends it with every answer (an older script ignores the field); v43 was left unused (the admin's subject switch became v45)

## v42 (2026-11-04)

the admin's player list (users) carries each player's full replay, rp: [progress %, learned, the saved copy's %] over the slate (core.js slateOf on data.json, cached with gen_), computed here with the replay record of the Replayed tab (reused while the player's rows, reset and first-launch answer are the same), so the admin's Players page reads no saved copy one player at a time (replayedAll_); the embedded core.js keeps the sorted keys of a player's answer-time record beside it (rtMedian), so a replay no longer sorts them at every right answer, same results

## v40 (2026-11-04)

the embedded core.js gives a fish entry the group of the identification key in force (fishGen key, groups: fish.json key, Allen et al. 2015 for the Indo-Pacific, instead of the 10 IMR shape groups), unused by the script: the fish answers are not logged, so nothing it computes changes

## v39 (2026-11-04)

the embedded core.js names a page drawn with another subject than the corals on screen <subject>.<page> (pageName with the subject's prefix, SUBJECTS pv: fish.quiz, fish.home) and reads it back (pageSubj), so the Pages tab tells a fish page from a coral one, and gains the subjects' zoom tip wording (SUBJECTS zoom), unused by the script; pagesClean, which keeps these names as they come ('.' was already allowed), is unchanged, so the script stores and serves the same

## v38 (2026-11-04)

the Coral Finder tool became the Coral ID Key: a one-shot migration (ONCE_ idkey) renames the tool's old page names to idkey / lab-idkey in the Pages, Events and Reports tabs, logged in the Deploy log; core.js copy with the renamed identifiers and the device migration migrateIdKey

## v37 (2026-11-04)

the embedded core.js gains the fish starter core (fishGen marks fish.json start entries first) and the fish card cover chosen within the highest source tier (Pierre's own first), then by the judged ease of fish-photos.json, unused by the script: the fish answers are not logged, so nothing it computes changes

## v36 (2026-11-04)

the full replay applies the player's first-launch answer (reefid-sync-coral-start in their saved data, or start in an anonymous device's send): a genus never answered starts from the global level shrunk towards the level the answer says, the answer in force at each answer (core.js startPriorAt), the stored replay keyed by that history's fingerprint too (Replayed Since = reset#fingerprint, core.js startFp) and sent with it (fp), so the app adopts it only for the history it holds, as the app does

## v35 (2026-11-04)

the admin's Analyses report (multifactor analyses of the answer log, every 1000 answers), computed by a GitHub Action (tools/analyses.js, .github/workflows/analyses.yml) and kept here: POST analysesPut stores it in an Analyses tab (chunked, 2.5 MB at most), POST analysesGet reads it (head: 1, only the answer count and the stored report's own count), admin token only

## v34 (2026-11-04)

a save keeps the saved copy's keys of a subject the saving app does not know (core.js keepSubjectKeys: an app from before fish no longer erases the fish progress); players' reports keep a fish teaching id (t01) as the expected and answered unit (logReports_); the embedded core.js gains the subjects (SUBJECTS, the fish adapter fishGen, mergeUsers per subject), unused by the script: the fish answers are not logged, so nothing it computes changes, and the fish progress is stored in the Data column as any other key

## v33 (2026-11-04)

the app was renamed IMR Reef ID and its storage keys with it (owner's decision, 2026-11-03): a player's saved data is read under the new key names or the old ones (dataKey_: progress, reset, achievements), an account merge drops the rules version under both names; the embedded core.js gains the key table (LEGACY_KEYS, keysIn, withLegacy), unused by the script

## v32 (2026-11-04)

the full replay reads each answer's Seconds (core.js rtWeight: a right answer's ability steps weighed by its time against the player's earlier ones, rules version 4); the app weighs its steps by time only from this version (core.js RT_SHEET)

## v31 (2026-11-04)

hierarchical photo Elo: a photo's difficulty is its genus's offset plus its own residual, both moved by every trusted answer (the genus offset by GENUS_K 0.4, damped by its weighed answers), so a photo nobody has answered starts at its genus's offset; ?stats=1 serves each photo's total difficulty as before and the genus offsets as gd: {genus: [offset, weighed answers]} (stats cache stats15); the genus offset moves the photo memory offsets the full replay uses, so core.js rules version 3 replays every player again

## v30 (2026-11-04)

pages opened in a visit: an event 'pages' (core.js PAGES, cleaned by pagesClean: which pages were open, how many times and for how long, the genus sheets opened with how they were reached and whether the genus had been asked already, the answers so far) under the admin's id of the player, never the name: the device's anonymous answer id (eanon) is stored as aid_('~anon ' + id), a signed-in player's name and code (ename, epin) are checked and stored as aid_(name), a wrong code stores no id; kept in a Pages tab of their own, which POST {readEvents: 1, pages: 1, token} reads (the last 10,000), so the other events never push them out

## v29 (2026-11-04)

the embedded core.js gains the admin's quantile and distOf helpers (Photo stats Overview), unused by the script

## v28 (2026-11-04)

progress replayed from the whole answer log by this script: the app's own progress engine (core.js, embedded at the end of this file by tools/sync_core.py) replays a player's answers in the reply to a sign-in, load or save (or to a device's anonymous answers) when their app applied an older rules version, the result kept in a new Replayed tab and sent as replay: {rv, n, rec, ids}; the app adopts it, the player's saved copy is never rewritten here; the hold's ids, like the replay's, cover every answer from the request's pt (the oldest answer the device still queues)

## v27 (2026-11-04)

typed answers (mode |t, the player types the genus instead of picking one of the choices) are rated with no guess rate (guess_ 0), stats cache stats14

## v26 (2026-11-04)

photo memory estimated from the answers: an answer on a photo is expected easier by an offset that depends on the player's own history with it (new 0; shown never right, right once, right twice or more: estimated in the same replay as the photos and the players, shrunk to the old fixed rule as prior), one expectation for the photos and the player's level (until v25 the level ignored memory), ?stats=1 serves the offsets as mem and the answers behind them as memn (stats cache stats13)

## v25 (2026-11-04)

a request from an app version before 2026-11-03 (no av) is logged in Events as kind 'old', with the name or anonymous id when it carries one, at most once an hour per sender

## v24 (2026-11-04)

the flood caps count only answers the sheet does not have yet, so a device sending again what it already sent (the app's one-time catch-up of anonymous answers, a resend after a lost reply) never uses up its quota

## v23 (2026-11-04)

the opening hold synced: each load of a player's progress carries hold, the app's CUSUM (model.js holdStep) over their logged answers since their last progress reset, the gentle restart's answers (mode |w) left out; Answers gets two columns at the end, Seconds (time to answer) and Enlarged (a photo enlarged before answering, 0/1), logged only

## v22 (2026-11-04)

the leaderboard % follows the app's new progress per genus, a moving average of the answers weighed by what each one proves (s.pg, core.js PROG, pgOf); progress saved before it replays its last 10 results

## v21 (2026-11-04)

Events tab: one 'load' event a visit with the load times (first page, quiz, first quiz photo), the line measured, the bytes downloaded and the CDN server, so the loading order is set from the players' real lines

## v20 (2026-11-04)

the admin can hide a player from the public leaderboard (Board -1, userBoard), which the player's own syncs never undo (a test account); 2-choice questions logged as plain quiz are rated as 2-choice (from the Choices column; stats cache stats12); the admin can rename a player to keep their record apart (userRename: answers, reports, progress follow, hidden from the leaderboard; the old name is free again, so the person can start over under it)

## v19 (2026-11-04)

Events tab: anonymous error reports from the players' devices (app errors, photos that fail, saves that fail) and their answers to the occasional one-tap question (too easy / about right / too hard); admin readEvents

## v18 (2026-11-04)

devices that never signed in count for photo difficulty and confusions under the same rule as signed-in players (10 answers, clearly above chance, weighed by experience n / (n + 10)); plain answer count per photo

## v17 (2026-11-04)

photo difficulty and confusions count only signed-in players whose answers are clearly above chance (10 answers or more); every player starts as a beginner (level -1); a player's answers move the photos more as their level settles (n / (n + 30)), and repeats count against what the player remembers of the photo; answers of a device that never signed in count once it signs in; readAnswers rows carry an anonymous flag; admin anonDelete removes the answers of chosen anonymous ids (test runs)

## v16 (2026-11-04)

the leaderboard computes each player's progress % itself from their saved progress (same formula as the app), so it is up to date for everyone without waiting for their next sync

## v15 (2026-11-04)

the leaderboard shows a player's level only from 200 answers (it moves too much before); GET ?achs=1 gives how many signed-in players hold each achievement

## v14 (2026-11-04)

public leaderboard (GET ?board=1: name, progress %, level of every signed-in player who did not opt out), the progress % and the opt-out are saved with each sync (Progress, Board columns); per-player answers and abilities are admin-only (POST readAnswers / readStats with the token), so leaderboard names can't be matched to an answer history

## v13 (2026-11-04)

the admin player list gives each player's anonymous id, so the admin can show names beside the anonymous answer stats (admin token only, like the names)

## v12 (2026-11-04)

answers of players who never sign in arrive under a random device id (~anon <id>), moved to the name at sign-in; caps against floods (per anonymous id, per name, new accounts, reports) with an Alerts tab

## v11 (2026-11-04)

updates itself from GitHub (autoUpdate, every 15 min, once installAutoUpdate has run: no more copy and paste); admin user management: list players with their stats, delete a player, merge two names of one person (admin token only); a removed name+code gets error 'gone' instead of a new account; the mode of a duel on a chosen pair (quiz-duel|A|B) is kept (it was dropped, so it was rated as a 4-choice answer)

## v10 (2026-11-04)

each answer logs the choices offered (Choices column), and ?stats=1 adds how often each pair of genera was offered together and mixed up (confusion scores)

## v9 (2026-11-04)

quiz questions with easy wrong choices are logged "quiz|kN" (N plausible choices) and rated with a 1/N guess

## v8 (2026-11-04)

reports read by every admin with their GitHub token (v7 had a single owner), reports and feedback from anywhere in the app (photos, sheets, pages)

## v7 (2026-11-04)

players report a wrong answer or a bad photo (Reports tab)

## v6 (2026-11-04)

code review fixes: progress of any size (Progress data tab), stale-write check, input sanitised, PIN throttle, secret salt for anonymous ids

## earlier

v5 continuous difficulty
