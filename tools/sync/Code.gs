// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 130 (2026-11-14: v130: A small Timings tab measures how the sheet copes as the answer log grows (the storage study of 2026-11-14, step 1: "log ms and rows for each full read and for each save, sampled, in a small tab with no player data"; Pierre, 2026-11-14, Q352: the answer log moves to Cloudflare D1 only when a measured threshold is crossed): one row per measured operation (Time, Op, Ms, Rows, Cols, Version, Weight), never a name, code, device, answer id or answer content (rules D2, D7). Measured: the whole-tab reads of Answers (logRows_) and of its Id column (freshAnswers_, logAnswers_), the photo stats' build (stats_), every player's saved data (datas_), the leaderboard's replays (boardWarm_), and as a whole a completed save, an anonymous send that logged, a load, a public stats request, the admin's readAnswers and each run of the 15-minute trigger. Sampled per request (TIM.EVERY 50; trigger runs TIM.EVERY_TRIGGER 16) at that weight, plus every operation slower than TIM.SLOW 5 s (a trigger run 60 s) at weight 1; kept in memory and written at the end of the request (timEnd_, from doGet / doPost / autoUpdate's finally, after every lock is released), one appendRow a row inside try/catch, so a failure never touches a reply. The trigger keeps the tab bounded (timTrim_): past TIM.MAX 4,000 rows the oldest rows are deleted, back to 3,000 (TIM.KEEP), the kept rows as logged; past twice that nothing more is written. Read with tools/timings.js. Nothing a player sees changes; v129: The embedded core.js names the fish admin's Photos › Families page photos/tree (SUBJECTS fish admin pages): the tab became Tree, the key's classification as a tree of any depth (Pierre, 2026-11-13, Q340); nothing the script computes changes; 2026-11-09: v128: Other species in view, split in two (Pierre, 2026-11-09, Q323): the embedded core.js gains FISH_COUNT, fishCount and fishOther (a fish photo's count tag o, other species with no risk of confusion, may be in play; k, other species one could take for the subject, and the legacy m not sorted yet never are, rule P3) and its fishIn and fishPhotos read them; the script itself uses none of them (the replay and the leaderboards are unchanged), so nothing a player sees from the sheet moves; v127: The log is the only reference for progress (rule D9; Pierre, 2026-11-09, Q322, Q330): the full replay's record of a unit and its answer count win over a player's saved copy also when the copy holds more answers there (counted twice: a save whose reply was lost, then another device's save, #824), and a unit the log has no answer on loses the answers the copy counts on it, through core.js replayedOf and replayBase, so the leaderboard too (board_, boardWarm_, rule D8); the fish replay is no longer floored against the saved bars (replayFloor, floorRef_ gone; a record kept as {P, F} before is still read, rplRec_): a fish bar may go down. Rules version 10 (corals) and fish rules version 2, with no card (Q330); v126: The shared core reads a typed fish name more plainly and through the name index, with no change to the sheet's own work (Pierre, 2026-11-09, the names study's plain fixes, Q319 and Q320): a family's name and its other number are one name (core.js typeForms), a name typed exactly is never read as a slip of another, a name several families share is all of them (typeMatchIn shared), and fishNameIndex lifts the names below a family (its species' listed and scientific names, its genera's names, the kind words of fish.json vn) to that family, each right only on a photo it designates (Q333: typeFits), with Pierre's exceptions (curation.json fish names); the sheet never reads typed text, so nothing it computes changes; v125: The admin's 🌱 added on its own, the account's name unchanged (replaces the v123 rename, userSeed, now removed): the account the admin page is signed in to when it reads the answer log with a valid admin token (answers_, its name and code sent as aname / apin, the code checked) is the admin's account, one at most, kept as its code hash in the script's properties (ADMIN_ACCT; another account signed in there replaces it); its rows on every leaderboard carry a 4th field 1 (board_) and its load reply admin: 1 (load_), which the app shows as a 🌱 after the name, outside the name's text; a delete, a merge (its from) and an archive of that account clear it (rule D7); new names holding the seedling or a look-alike stay refused (Pierre, 2026-11-09, Q328 corrected: "the emoji isn't part of my username", added automatically with no step for him); v124: The Events tab takes a new kind, fromhome (ROADMAP "Load order, further steps" (c); Pierre, 2026-11-02, reopened 2026-11-09): the first page a visit opens from Home (app.js fromHome), its page name in the message column and {s, w, tr} in the detail (the seconds on Home, whether the page's tier was still on its way, whether the welcome tour ran), so the load order's tiers can follow which page players really open first; v123: The seedling 🌱 in the admin's own name, which no other player may have: the admin page renames its own signed-in account (users_ userSeed, with the admin's GitHub token and the account's name and code, checked as a save checks them) to its name with " 🌱" after it, or back without it (core.js seedName), moving the whole record as an archive does but keeping it live (RAs row with the code hash for the new name, saved progress, By genus, answers, reports, pages, beta groups, statistics exclusion, log mentions, Removed's Into, every subject's replay record), and the old name gets a Removed row pointing to the new one so the account's other devices are told to sign in under it; and the embedded core.js refuses a new account or an archive name holding the seedling or one of its look-alikes (herb, potted plant, shamrock, four-leaf clover, leaf in the wind) as reserved, an existing account keeping its name, so only the admin page gives such a name and one it frees can never be taken again (Pierre, 2026-11-09, Q328: "an icon the others are not allowed to have", the 🌱 emoji in his own name); v122: the shared core reads fish-game.json in its short form (Pierre, 2026-11-09: an iNaturalist observation by its id and the original photo by its extension instead of full addresses, tools/fish_short.py): fishGameRead gives every record its addresses back before the fish photo pools are built (POOLS entries); the pools are the same as from the file before; v121: the shared core leaves the coral skeleton photos out of every photo list: applyCuration drops a photo marked skel (data.json, written by tools/apply_skeletons.py from judging/skeletons.json) wherever it is, as it drops an excluded one (rule P6, Pierre, 2026-11-09: coral skeletons are never shown, the features cannot be seen properly); nothing the script computes changes; v120: the shared core reads a typed answer faster, with the same answers: typeDist keeps three rows of its matrix instead of the whole one, typeMatchIn skips a name whose length is further from the text's than its spelling tolerance (the distance is at least that difference), and typeElse reads its lists' names once per norm (performance pass asked by Pierre, 2026-11-09: "what can we speed up in the app"); nothing the script computes changes; v119: Reserved account names: no new account and no archive name holds, as one of its words in any capitalisation, a member name of Object.prototype (constructor, __proto__, toString, valueOf, hasOwnProperty…) or prototype (core.js RESERVED_NAMES, reservedName): a save that would make one answers reserved before anything is logged or written, and userArchive into one answers reserved; an account that already has such a name loads and saves as before; and the maps by player that still had a prototype have none (the player list's numbers, the beta groups and their changes, the ids of readAnswers and the live view, the achievements' shares, the replayed progress of the list; core.js trustOf, eloReplay, playSplit, exposureOf), so such a player is a player like any other there and nothing is added to Object.prototype (Pierre, 2026-11-09: these names broke the maps by player; the front door refuses them, nobody locked out); v118: Every leaderboard follows the rules: a player whose saved copy applied an older rules version of a subject (corals RVS, fish FISH_RVS, any subject's rvsOf) is ranked on that subject's board by the progress and level their app will hold once it adopts the replay of their log (core.js replayAdopted, the record sync.js replayAdoptS adopts: replayedOf over the saved copy, with the floor of a subject replayed with one), from the record its Replayed tab keeps for today's rules, row count and reset (boardRpl_); a player up to date, or one with no record yet, by the saved copy as before; the board only reads (nothing fetched, no lock) and stays cached 5 minutes. The 15-minute trigger, once up to date, makes those records ahead for every listed player behind the rules (boardWarm_: the replay of replay_, rplMake_, outside the script lock, all written under one short lock, each only if the account (same name and code, listed), its saved data, its answers of that subject since its reset and its Replayed row are, read again under the lock, what it was made from (Codex review #810, rule D7: an account deleted meanwhile never gets its row back), at most BOARD_WARM_MS of new replays a run), the same record the player's next sync reuses, drops the boards that changed from the cache and counts them in the Deploy log; one player's failure never stops the others' or the board, and every map keyed by a player name, core.js replayProgress's too, has no prototype (Codex review #810: a player named constructor) (Pierre, 2026-11-09, rule D8: "whenever progress is recalculated, the leaderboard must be recalculated automatically, even if people do not reconnect"); v117: The fish replay stored and sent at last: a tab that exists but is empty (made by hand, or by anything but sheet_) gets its header as a new tab does, and find_ reads no name in an empty tab instead of throwing; the sheet's "Replayed Fish" tab stood empty without its header, so every fish replay failed in replay_ before it was stored or sent (replays_ leaves a failed subject out) and no fish player was replayed while their apps asked at every sync (Pierre, 2026-11-08, Q298, Q310: every fish player's progress replayed from the answer log, today's bar as a floor; production bug, 2026-11-09). And core.js replayProgress keys its players without a prototype, so a player named like an Object property (constructor, __proto__) is replayed like any other (Codex review #810); v116: Lighter saves on slow lines: a light save (the app's light, wrapped as {z: base64 gzip} or {lt} so an older script finds no name and writes nothing; a body it cannot unpack answers zip) sends only what changed since the copy it holds at its revision (dz, core.js dataDelta) with the checksum of its whole data (sum, dataSum), rebuilt here on the saved copy and kept only if the checksums agree (lightData_, dataPatch; else delta, before anything is logged), or its whole data under the new key names, the old ones added here (withLegacy); its reply says the checksum of the copy saved (sum); a light save against another revision is answered stale before anything is counted or logged, with the load of the copy there (load_, read once the lock is released), so the app merges and saves again without a load of its own; a load says the revision of the copy the device holds (have) and an unchanged copy comes back same: 1 without it; a light request's hold names the answers from pt only (hold_: not the last 500) and its loads serve the copy under the new key names only; an app that does not ask is answered as before (Pierre, 2026-11-08, ROADMAP "Lighter saves on slow lines": field use at IMR on weak connections, "save failed" seen there); v115: the admin can leave a player or a device not signed in out of the statistics (POST {statsExclude: admin id, on, token}, users_; the tab "Stats excluded", sxSet_, sxPut_): their answers rate no photo, confusion, photo memory or format offset (stats_), readAnswers and the player list serve the ids as excluded and the Analyses report drops their rows (tools/analyses.js), a change drops the photo stats and makes the report stale (rosterChanged_); their own progress, level and leaderboard place stay, and a delete, merge or archive moves or drops the row (sxMove_, rule D7); and an answer whose photos are game photos of another unit or subject and none of its own (photoCheck_ over pools_, a coral photo named after its genus counting as its own, photos in no pool unsure) rates no photo in stats_ (skip counts in readStats), is logged as every answer, never refused, and the first such send of each 6-hour window per sender is written to the Alerts tab under its admin id (photoAlert_, against the cached pools only), a fish answer at the genus or species level checked against its family's photos and an old entry id as the family it became (unitUp_, core.js renamedId); only an answer that rates gives a photo its genus offset, so a left-out or flagged one moves no photo difficulty; the game pools are cached in parts (pool2<subject>, cacheBigPut_: the fish pool is over the cache's 100 KB a value) and stats_ reads every subject's; a device left out that signs in stays out, its row moved to the name's admin id with an Alerts line by ids once the account is saved (the claim of the device's answers too: a stale or failed save moves nothing) (the integrator, 2026-11-09); nothing is fetched under the script lock (stats_ reads the cached pools only, except for the public stats and readStats, stats_(true)); a unit, answer, mode, photo or choice holding a word Object.prototype has (constructor, __proto__) is refused when logged (word_, protoWord_), such rows logged before are left out of answerRows_ and the photo exposure, and stats_'s maps have no prototype (Pierre, 2026-11-08, ROADMAP "Security follow-ups": "je suis ok avec tout ce que tu as listé"); v114: core.js SUBJECTS fish admin pages: Inbox › To do › Health and Analyses › Learning › Stops on the fish side (fish admin at parity with the corals, Pierre, 2026-11-08: "j'ai besoin d'avoir les outils pour pouvoir continuer d'avancer"); the script reads nothing new (its embedded copy of core.js only); v113: one Analyses report per subject (Pierre, 2026-11-08: each subject's analyses refitted every 1000 answers of that subject, "fish when the fish analyses exist"): the corals' report stays in the Analyses tab, another subject's goes to a tab of its own ("Analyses Fish", anTab_, as the fish replay's records); analysesGet reads the stored report of the subject asked (default the replayed one, the corals, no longer the stored report's subject), analysesPut stores a report in the tab of its subject (none: the replayed one), and both refuse a subject the script does not know (input), so a fish report never replaces the corals'; the Action computes each subject's report from its own answers (tools/analyses.js sheetRunAll) and the admin's Analyses follow the Corals | Fish switch (admin-analyses.js, gate analysis.js AN_SUBJ_SHEET); core.js SUBJECTS analyses (the subjects with a report, whether their photo features are read, the admin's words for their units) and the fish admin's Analyses pages; 2026-11-08: v112: the fish progress replayed from its answers is floored by the script, so today's bars are a floor at its first replay (replay_, floorRef_, core.js replayFloor: against the saved copy's units no replay gave yet, the replay's record with its domain score lifted to the saved bar, the reference kept with the record in "Replayed Fish" for the replays of the same fish rules version and dropped by a progress reset, none under a later version; Pierre, 2026-11-08, Q310; the integrator, 2026-11-08: per unit, once), and the app adopts the fish replay from this version (sync.js replayAdoptS, core.js REPLAYS_SHEET); an account merge drops every subject's rules version applied (reefid-sync-fish-rv too); v111: the progress of the other subjects the sheet replays (core.js SUBJECTS replayed: fish) is replayed from their own answers too (replay_ per subject, its units from fish.json: core.js fishReplayGen, cached 6 hours; under its own rules versions, core.js FISH_RVS, rvOf, so the corals are not replayed again; its record kept in the tab "Replayed Fish"), in the reply to a sign-in, a load, a save or an anonymous send whose app asks for it (rvs: {fish: its rules version applied}; the load's rv_fish), as replays: {fish: {rv, n, rec, ids, fp}}; an app that asks for none gets none, and the corals' replay is unchanged; a delete, merge, archive or claimed device drops those rows too (Pierre, 2026-11-08: "recalculate every player's progress from their answers", Q298, Q310); v110: the admin's light read for a live Players › Activity (Pierre, 2026-11-08: "Les deux"): POST {readLive: 1, token} → {ok, rows: the Answers tab's last 50 rows with a player, as readAnswers serves them (answerOut_, now shared by both; a surprise card's left out), last: {admin id: time ms of each player's last answer}, from the Activity tab's QUERY while it holds the script's formula, else from the Name, Time and Mode columns, a deleted account's and an archive's left out, n: the tab's answer rows, k: the window read} (live_), admins only, no script lock, nothing written; the admin re-reads it every minute while Activity is open and in view (admin.js LIVE_SHEET); nothing else the script does changes (a device not signed in now sends each answer about 3 s after it, sync.js anonSoon: the same anon_ and caps); v109: a new last Answers column, Device (Pierre, 2026-11-08, Q312): the anonymous id of the device that sent the answer (sync.js devId, the Device of its Events and Pages rows), one dev per save or anonymous send written in each of its rows (logAnswers_, dev_: 8 to 16 lower-case letters and digits, else blank), signed in or not; an app before it sends none and its rows are logged as before, Device blank; logged only, served by no reader (readAnswers unchanged); kept through a claim at sign-in, a rename and a merge, blanked when a delete keeps the answers as "~deleted <id>" (devBlank_, rule D7); the app sends it from this version (sync.js DEV_SHEET); v108: no change to what the script does: the comment on VERSION says it is assigned at merge with the header line (tools/sheet_version.py --assign; Pierre, 2026-11-08, Q305); v107: the embedded core.js drops the Coral Finder book's crops (applyCuration and applySlots no longer read gen.book or curation "book"; CAP.book gone; cfCrop names a crop's id), unused by the script: nothing it computes changes; v106: the embedded core.js gives the Coral ID Key 5 other observers' photos per view (CAP.inat, was 2), unused by the script: nothing it computes changes; v105: the Analyses head counts each subject's answers apart (analysesGet counts, core.js subjCounts: a subject's rows with a player; answers, the asked or stored report's subject's, no longer every row of every subject), so the corals' analyses are refitted every 1000 coral answers, the fish answers never moving them, and the stored meta keeps the report's subject (Pierre, 2026-11-08); v104: the embedded core.js gains the one-time notices told on any device of an account (TOLD, toldUnion: reefid-sync-told, stored as it comes like any travelling key); an account merge (mergeUsers) keeps the union of both accounts' notices told: nothing else it computes changes; v103: the embedded core.js gains the photo rights tie-break (licOf, rightsClass, rightsRank: between otherwise-equal photos, an open licence or Pierre's own before CC BY-NC, in easyRank and applySlots; Pierre, 2026-11-08, Q270), unused by the script: nothing it computes changes; v102: the embedded core.js gains the fish achievements around the global score (Pierre, Q259-Q263: FISH_ACH redesigned, fpct25 retired, flearn30 in ACH_LEARN) and achRecount (the app's recount, progress.js ACH_V 3), unused by the script: achs_ counts every id of the one achievements record as before, and a record recounted by the app holds no retired id; nothing it computes changes; v101: the fish leaderboard by the fish global score (Pierre, Q242; core.js SUBJECTS fish score, treeScore): a subject with a score sends its tree with a save (summary.boards {id: {f, s}}, kept in the script's properties as its units list was, boardTreeOk_), and its board ranks by treeScore's % over it, the % My progress shows; a list (an app before it) is kept and read as before; the embedded core.js gains rankWeights and treeScore; v100: an Answers column Rejected tries at the end, the texts a typed answer had refused before it (Pierre, Q237), logged only; v99: the admin changes a player's first-launch answer for one subject (Pierre, 2026-11-08, Q228): POST {userStart: name, s, c, token} appends a choice event via 'admin' to that subject's record (core.js startAdminSet, its history kept) and writes the copy with the revision bumped, so a device mid-sync reads it again and merges it (startUnion: the latest answer wins); nothing else changes; v98: a surprise card's answer (Mode wink, core.js WINK_MODE) is logged like any other and left out of every reader: replayed_, answers_ (readAnswers), the Activity tab; 2026-11-07: v97: the embedded core.js gains fish circle 3 opened by choice (SUBJECTS fish optin beyond, openState, OPEN_AGAIN; mergeUsers keeps an opt-in's larger "Not now" count), unused by the script but in an account merge (the quiz settings merged as before, plus that count): nothing it computes changes; 2026-11-06: v96: the embedded core.js gains the fish achievements (FISH_ACH, SUBJECTS achs, achFeats, achFind, ACH_CONTRIB; newAch and achRevoke take a list), unused by the script: achs_ counts every id of the one achievements record as before, fish ids included; v95: one leaderboard per subject (Pierre, 2026-11-04: separate per subject, no merged ranking; core.js SUBJECTS fish board): GET ?board=1&s=<subject> serves that subject's, ranked by its % (core.js pctOf on the player's saved progress of that subject, over the units its apps last sent with a save, summary.boards, kept in the script's properties: boardUnitsSave_), then its level ('~level' of that progress); no s, the corals' as before; the opt-out, an admin's hide and an archive hold for every subject; each subject's board cached apart (board14:<id>) and dropped with the others on a hide, delete, merge or archive; v94: the embedded core.js lists the fish admin's Look-alikes page (SUBJECTS fish admin pages photos/look-alikes; admin plan PR 10), unused by the script: nothing it computes changes; v93: the embedded core.js lists the fish admin's Photo review pages (SUBJECTS fish admin pages photos/review/ease and photos/review/phase-framing; admin plan PR 9), unused by the script: nothing it computes changes; v92: the embedded core.js lists the fish admin's Coverage page (SUBJECTS fish admin pages inbox/coverage/games; admin plan PR 8), unused by the script: nothing it computes changes; v91: the embedded core.js lists the fish admin's Candidates page (SUBJECTS fish admin pages, photos/candidates; admin plan PR 5a), unused by the script: nothing it computes changes; v90: the embedded core.js gains each subject's icon (SUBJECTS icon, moved from app.js UNITS for the admin's mini subject switch), unused by the script: nothing it computes changes; v89: the embedded core.js gains winkUnion and an account merge (mergeUsers) unites each subject's surprise cards met (each surprise once per player, Pierre 2026-11-06; Codex review #652), stored in the Data column as any other key: nothing the script computes changes; v88: the embedded core.js gains domFromCounts, the app's silent rebuild of a non-replayed subject's units (fish) under the domain-score bar from each record's counts (Pierre, 2026-11-06, Q200), unused by the script: nothing it computes changes; v87: the domain-score bar (Pierre, 2026-11-06, Q127-Q129, Q135; merge approved 15:41, Q196): the embedded core.js scores a genus's bar as the share of all its possible photos the player would name alone and typed, the posterior expectation on a grid of abilities from a fixed population prior and the player's own answers on that genus only (core.js DOM, domStep: s.dp the log posterior, s.ds the bar), less the genus's false-alarm rate (Pr = H - FA, Snodgrass & Corwin 1988: a genus named by mistake is no miss on its own photos, Q174), in place of the moving average s.pg; the full replay (replay_, replayedAll_) gives it the genus offsets of ?stats=1 gd for the rows logged without them (an answer's Scoring record now carries the offsets the app used, m and n, and the typed format's offset and the slope when the app has them, t, s; o, the format's offset, as since v77), core.js rules version 9 replays every player once; the leaderboard % calls core.js pctOf itself instead of a copy (pctOf_), so the two never drift apart; the app gives a genus first answered the new bar only once this script replies v >= 87 (core.js DOM_SHEET, rule D4); the load and save replies carry notes, the Notes tab's card.* lines (notes_: Pierre's text that is never in the repo, the PS of rules version 9's apology card under the key card.rv8.ps, core.js RV_SORRY); the exam's entry needs pair coverage in the app (core.js looksLeft, Q129), nothing the script computes; v86: the embedded core.js gains the fish photos in play by themselves (fishIn, fishGone: a candidate judged sure or a reference-level photo, hosted on R2, until Pierre rejects, excludes, moves or undoes it; Q180, Q199), unused by the script: nothing it computes changes; v85: the embedded core.js lists only the scientific genera as the fish opt-in set (SUBJECTS fish optin: ['sci']; Pierre, 2026-11-06, Q175: every fish circle is on the path and counts in the progress, the circle 2 and 3 opt-ins gone), so an account merge no longer keeps a stored c2 / c3 choice on; nothing the script computes changes; v84: the embedded core.js builds the fish units from the book's families (fishGen over fish.json families, each family's look-alike sources from its lsrc, its typed names with the IMR entries' aka and often: the switch, units plan PR 4) and moves a stored record's old unit ids (renameUnits, read by the app), unused by the script: nothing it computes changes; v83: the embedded core.js gains the fish draw's calibration for big pools (SUBJECTS calib u and pool, CALIB pool: an unanswered fish photo's narrower targeting and the floor shared over 30 observations; Pierre, 2026-11-06 15:33, Q186; the corals keep their draw), unused by the script: nothing it computes changes; v81: the admin's player list gives each player's photo exposure per subject (Pierre, 2026-11-06, Q191; the photo exposure study §5): ex {subject id: [seen, of, hit, asked, units]}, Seen % and Spread % (exposure_, core.js exposureOf over each subject's rows), against each subject's game photos per unit grouped by colony (pools_: core.js unitPool over the files its SUBJECTS pool names, read from GitHub main, cached 6 hours per subject; the games' Research Grade rule for Millepora and the bonus genera); nothing is stored, nothing the app reads changes; v80: the embedded core.js gains the fish sheets' addresses (SUBJECTS sheets: #fish/learn/family/Damselfishes, genus, species; routeOut, routeIn; sheetIdOf, fishTree), unused by the script: pageName names every fish sheet learn.genus, as before for the corals' words, so nothing it stores or serves changes; v79: the embedded core.js lists the fish admin's Families page (SUBJECTS fish admin pages photos/families: admin plan PR 6 on the book's families), unused by the script: nothing it computes changes; v78 is taken by a pending branch; v77: per-format offsets (Pierre, 2026-11-06, Q138): stats_ fits each question format's offset (core.js fmtOffsetsOf: 4 choices, 4 shown with 3 or 2 plausible, Again, a duel in the quiz, the Duel tab, an exam question, typed; an offset in logits on the app's log-odds, the guess rate kept at 1/k, fitted on the trusted answers' logged expectation with a N(0, 1) prior, from 20 answers) and serves it in ?stats=1 as fmt: {format: [offset, answers]}; the app's ability steps take it from this version (core.js FMT_SHEET, 77) and log it in the scoring record (scoreRec o), which the full replay (replay_, replayedAll_) replays as logged, a row logged without a scoring record taking the offset served now (core.js rules version 8); stats cache stats17; v76: the embedded core.js reads a FishBase reference or sheet photo (fb<stem>) and its candidate (fish-<species>-cand-fb-<stem>) as one photo (fishPid; Codex review #660), unused by the script: the fish answers are not logged, so nothing it computes changes; v74: the embedded core.js accepts more typed fish names (fish beta QA: fishNames reads a node's curated other names, fish.json aka, and its names in common use, often, which fishGen lists as oft and the typed match returns for a gentle correction; fishTypeNames, with SUBJECTS typeDrop, the name without "fish", its plural and the name's own plural, when unambiguous in the game), and gains SUBJECTS several (the report dialog's "Several corals" / "Several fish species" reason), unused by the script: nothing it computes changes; v72 and v73 are held by #655 and #599; v71: the embedded core.js puts a fish unit's reference-level photos first (refLevel, refFirst: a reference source's photo judged very easy, or any photo judged 5 with the reference look, one kind of fish; Pierre, 2026-11-06) and gains the subjects' difficulty calibration (SUBJECTS calib, CALIB, calibOf: the corals keep the defaults), unused by the script: the fish answers are not logged, so nothing it computes changes; v70: the embedded core.js gains the fish game photos (fishOn, fishPid, FISHPH, fishPhotos: the photos Pierre put in play, hosted on R2, in place of the stopgap list where an entry has 5 very easy ones; admin plan PR 7), unused by the script: only the replayed subject (the corals) feeds what it computes, so nothing changes; v69: the fish units are the book's families (Pierre, 2026-11-06 13:04; docs/reviews/2026-11-06-fish-units-plan.md): the embedded core.js gains the old-id map (SUBJECTS renamed, renamedId, renameUnits, renameLogEntry); a fish answer naming an old entry (t01, from an app before the switch) is logged under its family (f:Damselfishes; one map per row, the species shown deciding a split entry: Diploprion is the Soapfishes), and so are a report's units (f: ids accepted); a one-shot migration (ONCE_ fishunits, Pierre's yes, Q159) renames the fish rows and reports logged before, in the Deploy log; v68: the embedded core.js orders a fish unit's photos by their ease, then how much they look like a reference photo, never by who took them (easyRank, refScore; Pierre, 2026-11-06), and marks the corals' photo source tiers (SUBJECTS tiers), unused by the script: nothing it computes changes; v67: fish opens to every player (Pierre, 2026-11-06, Q158: "open fish to everyone now", the beta label kept): the embedded core.js has SUBJECTS fish open: 'all', so groupIds_ lists no subject: the load and save replies carry groups: [], userGroup answers error 'group', the admin's player list has no Beta column, and the Groups tab's rows are kept (read again if fish goes back to open: 'group'); v66: the embedded core.js gains the admin's filter bar fields (admin plan PR 3: SUBJECTS admin origins, each subject's photo origins, and csrc, its Candidates sources), unused by the script: nothing it computes changes; v65: the embedded core.js gains the app's addresses (URL refonte: routeOut, routeIn, the page names learn.genus, practice.quiz… of pageName, routeRename, pageRename, migrateRoutes) and the subjects' address prefix (SUBJECTS hash); pagesClean keeps the new names as they come ('.' and '-' were already allowed), so nothing the script stores or serves changes; v64: the embedded core.js names the fish admin pages by their new addresses (URL refonte: SUBJECTS admin pages inbox/todo/reports, inbox/todo/errors, players/list), nothing the script does changes; v63: one player level shown everywhere (Pierre, 2026-11-06, Q134): the leaderboard's level (board_) is the app's own, the th of the '~level' record in each player's saved progress, read with the % from the same copy, from ELO_MIN answers of that record; stats_'s chain R (start -1) no longer reaches the board and stays internal: the photo Elo's player term, and ras for the admin; nothing a player's progress holds changes (no rules version); v57-v65 were taken by pending branches; v62: one surprise counted once (Pierre, 2026-11-06, Q137 part 1): the embedded core.js scoreAnswer has the genus shown take the global level as it stands after the answer's step on it, so the genus's levelMove carries only the level's moves from the other answers; core.js rules version 7 replays every player once; nothing else the script computes changes; v61: one scorer (Pierre, 2026-11-06, Q132): the app and the full replay score an answer through one function, core.js scoreAnswer, and each answer carries what the app scored it with (sc: the photo difficulty, the photo memory, the mix-ups term, the look-alike test, the recalls of a comeback question, the corallites hint revealed after the answer), kept in a new last Answers column, Scoring (core.js scoreRec as JSON, each field checked; blank when the app sent none), read by its name and served by readAnswers at index 15 (an object, null before), and replayed at index 15 of the replay rows (rowOf_), so replay_ and replayedAll_ rebuild exactly the progress the app had for those rows, whatever pooled stats they hold; rows logged before keep the replay by their logged e; core.js rules version 6 replays every player once; the Answers tab is read up to its last column (answerRows_, answers_), so a tab not yet widened reads as before; v60: every subject's answers are logged (Pierre, 2026-11-06: fish answers logged from the very first second; the sheet records an answer at any taxonomic level): the Answers tab gets five columns at the end, Subject (the answer's subject, core.js SUBJECTS id: coral or fish; blank in the rows logged before, all coral; an app that sends none is coral), Rank (the rank asked: coral genus; fish family, an IMR entry, or genus, a scientific genus; later species), Taxon shown and Taxon answered (the names at that rank when a unit's id is not its name: Damselfish for t01, Chromis for g:Chromis; blank for a coral genus) and Species shown (the PDF species of the fish photo shown); Genus shown, Answered, Choices and a duel's mode keep the units as the app asks them (t01, g:Chromis allowed: digits and ':' after a first letter); only the subject the sheet replays (core.js SUBJECTS replay: the corals) feeds what the script computes (answerRows_: photo ratings, genus offsets, confusions, memory, trusted players, the opening hold, the full replay; the admin's player list numbers in users_), so a fish answer moves no coral number; readAnswers serves the five at indexes 17-21, after v59's Typed and Retyped right, now served at 15-16 (the subject filled with coral, the rank with the subject's, in the rows logged before) and every reader of one subject keeps its rows (core.js subjRows); a tab with fewer columns reads them blank (logRows_) until the next answer adds them; the embedded core.js renames SUBJECTS log to replay, adds rank, the answer-log subject helpers and LOG_SHEET 60, the version from which the app sends the answers of a subject the sheet does not replay (rule D4); v59: the Answers tab gains two columns at the end, Typed (a typed answer's raw text as first typed, up to 40 characters) and Retyped right (its spelling step: 1 retyped exactly, 0 not, blank when none was asked; quiz.js typeBind, a player's idea approved by Pierre the same day), logged only, and the embedded core.js gains typeVerdict and typeDiff, unused by the script: nothing it computes changes; v58: archive instead of rename (Pierre, 2026-11-05, Q84/Q88; the deleted-accounts audit, PR 2): admin {userArchive: {from, into}} (was userRename) moves the record to the archive name and marks it Board -2 (no new column); an archive leaves normal operation: liveRows_ keeps it out of the leaderboard, the achievement shares, the player list (sent apart as archived: [{name, id, time, answers, reports}]), the beta groups (dropped at archiving; userGroup adds live players only), readAnswers' players, and repsOf_-style readers; its answers are flagged 2 in readAnswers as a deleted account's (pooled photo statistics only) and left out of stats_ ras; a merge, a rename or a leaderboard toggle refuse an archive (error 'archived'); a delete still takes it, in either mode; a player's own save never undoes Board -1 or -2; each account's saved data keeps its generation _acct (made at its first save, kept by every save and merge, sent apart as acct in the load reply), so a device that knew another generation of the name says the record was archived; the app's device of an archived record sees found: false while it holds a sheet revision and says the record was archived instead of re-creating it (sync.js); a player deletes their own account and all its data (POST selfDelete with dname / dpin, selfDelete_: the code checked, "delete everything" semantics, the Removed tombstone only, capped 3 tries per name (keyed by its anonymous id) and 30 in all per 6 hours; the app's #delete-account page); archiving moves the record's name mentions in Events and Alerts to the archive name (redact_, as a merge), so deleting the archive leaves none; a report carries the account generation it was queued under (racct): from another generation of the name, or under a name that has no account left, it is logged with no reporter, Verified 0, never the new account's (Codex review #603); a save carries the generation the device saved under (acct): checked under the lock before anything is logged or written, a name with no account left or another generation of it answers error 'archived'; page summaries carry it too (eacct) and another generation files them under no player; a save's reply carries the generation (acct), so the device that created the account knows it at once; a report's generation is checked whatever its code or throttle; v57: a player's load reply (GET name, pin) carries reps, the ids of their own verified reports in the Reports tab (Reporter their name, Verified 1, sent after the name's last removal if it was deleted and taken again; the last REPS_MAX = 50; no field when none: repsOf_), so their app can tell them once that a report was handled (Pierre, 2026-11-05, Q66: the app reads the admin's Done from curation.json seen 'rep:<id>' and thanks the player; Pierre's notes are never sent); an older app ignores the field; the embedded core.js gains repsAdd and helpedTake (the app's side), unused by the script; v56: the embedded core.js gains the Contributions achievements (Pierre, 2026-11-05, Q65: core.js ACH kind 'contrib', fb1 / fb5 / fb10 for the 1st, 5th and 10th report sent; contribKey, contribAdd, contribJoin) and mergeAch joins two records' lists (the reports counted, _fb), unused by the script: it stores a player's achievements record as it comes and counts its ids for the shares (achs_) as before, so nothing it computes changes; v55: a deleted account leaves nothing in normal operation (Pierre, 2026-11-05, Q84-Q91): userDelete with answers deletes the account's reports too, without answers relabels them "~deleted <id>" with Verified 0 (open ones stay in the admin's Inbox as from a removed account, never thanked); the page summaries are always deleted (Pages); name mentions in Events ('old' rows) and Alerts (n:<name>) are redacted; a delete or merge clears the board, achievements and stats caches and marks the stored Analyses report stale (analysesGet head stale, ROSTER_AT), so the Action refits it at once; readAnswers flags the "~deleted" rows 2 in the anonymous column (1 stays a device that never signed in), and stats_ leaves them out of the per-player abilities (ras), the photos, genus offsets, confusions and memory keep them; a report sent with the name and code of a removed account is logged under the name it joined (merged) or with no reporter, Verified 0 (deleted); a device's Replayed row is dropped when its answers are claimed at sign-in or deleted (anonDelete); a one-shot cleanup (ONCE_ removedcleanup) deletes the Replayed rows of devices with no answer left and the reports of accounts deleted outright before this version, logged in the Deploy log; v54: comments only: this file and the embedded core.js cite Pierre's rules by their new IDs (docs/rules/), nothing the script does changes; v53: the beta groups (groupIds_) are the subjects that open to a group (core.js SUBJECTS open: 'group', subjGroup), no longer every subject with a beta label, which is now the label only; fish says open: 'group', so the groups, replies and Groups tab are the same as v52, and a subject set to open: 'all' keeps its rows in the Groups tab (read, never deleted) for a return to 'group'; v52: the embedded core.js's achievement descriptions say the runs of right answers and Sharp eye are earned in the Quiz only, not in the custom quiz or the Duel tab (Pierre, 2026-11-05, Q82; the app's progress.js achAfter), unused by the script: nothing it computes changes; v51: the embedded core.js gains the photo fallback helpers (photoOnline, photoFileOf, photoAway, photoFallback, photoIndex, photoCropOf; Pierre, 2026-11-05: when R2 fails, a photo with an online original is read from it, not from img/), unused by the script: nothing it computes changes; v50: every reply is the script's own JSON (Pierre, 2026-11-05: "save failed" too often): an exception thrown out of doGet / doPost (the script lock not had in time, a Sheets service timeout or quota, a script error) made Apps Script answer with its HTML error page, which has no CORS header, so the browser told the app "Failed to fetch" / "Load failed" although the script had answered; it is now caught and answered {ok: false, error: 'lock'} (the script lock waited for LOCK_MS, 20 s, held by another request: lock_, tryLock) or {ok: false, error: 'server', msg} (fail_), which the app retries; a save releases the script lock once its progress is written, its hold, groups and full replay computed after (the replay under its own lock, as a load's), so the lock is held for less time; the photo stats request carries the app's anonymous device id (dev) and the minutes its page has been open (up): the newest build reported is kept (BUILD_TOP), and a device on a replaced version is logged in Events as kind 'old' with its device id and version, when its page stayed open OLD_OPEN minutes on a version replaced OLD_H hours ago or it started a version replaced OLD_STUCK hours ago (behind_), at most once per device every 6 hours; v49 (2026-11-05): the embedded core.js keeps the sheet-only fish photos (use: 'ref', fish-photos.json sheet: a species with no game photo may keep one for its sheet, never in a game) out of a fish entry's game photos and lists them by species (fishGen sheet), unused by the script: the fish answers are not logged, so nothing it computes changes; v48 (2026-11-04): beta groups (Pierre, 2026-11-04: fish opens to a group of players he picks in the admin, not by one site-wide switch): a Groups tab (Group: a subject in beta, core.js SUBJECTS beta; Name; Added), admin POST {userGroup: name or [names], group, on, token} adds or removes players (existing players only, under the script lock), the admin's player list (users_) and each player's load and save replies carry the groups they are in (groups: [subject ids], [] for none: an older script sends no field, so the app keeps the beta subject closed), and a rename, a merge or a delete carries the memberships; v47: the embedded core.js asks the first-launch question per subject (SUBJECTS start, its words; core.js startKey: the fish welcome question's answer in reefid-sync-fish-start beside reefid-sync-coral-start; CHOICE.opts keeps only the ids and variables) and an account merge (mergeUsers) unites each subject's record; the coral record the replay reads (startOf_) and everything the script computes are unchanged; v46: players' reports keep a genus question's units (g:Platax); the embedded core.js lists the fish scientific genera's opt-in set (SUBJECTS fish optin sci), so a player's choice merges like the circles'; nothing else changes here; v45: the embedded core.js gains the admin's part of each subject (SUBJECTS admin: its address prefix, its part of curation.json, its admin pages), unused by the script: nothing it computes changes; v44: each answer's UTC offset on the player's device (tz, minutes east of UTC, Date.getTimezoneOffset at answer time, sign turned) in a new last Answers column, UTC offset, logged only and served by readAnswers at index 14; a one-shot migration (ONCE_ tz) fills +480 into the rows logged before (every player so far was on Philippine time), so the analyses can read the time of day at home of players outside the sheet's time zone; the app sends it with every answer (an older script ignores the field); v43 was left unused (the admin's subject switch became v45); v42: the admin's player list (users) carries each player's full replay, rp: [progress %, learned, the saved copy's %] over the slate (core.js slateOf on data.json, cached with gen_), computed here with the replay record of the Replayed tab (reused while the player's rows, reset and first-launch answer are the same), so the admin's Players page reads no saved copy one player at a time (replayedAll_); the embedded core.js keeps the sorted keys of a player's answer-time record beside it (rtMedian), so a replay no longer sorts them at every right answer, same results; v40: the embedded core.js gives a fish entry the group of the identification key in force (fishGen key, groups: fish.json key, Allen et al. 2015 for the Indo-Pacific, instead of the 10 IMR shape groups), unused by the script: the fish answers are not logged, so nothing it computes changes; v39: the embedded core.js names a page drawn with another subject than the corals on screen <subject>.<page> (pageName with the subject's prefix, SUBJECTS pv: fish.quiz, fish.home) and reads it back (pageSubj), so the Pages tab tells a fish page from a coral one, and gains the subjects' zoom tip wording (SUBJECTS zoom), unused by the script; pagesClean, which keeps these names as they come ('.' was already allowed), is unchanged, so the script stores and serves the same; v38: the Coral Finder tool became the Coral ID Key: a one-shot migration (ONCE_ idkey) renames the tool's old page names to idkey / lab-idkey in the Pages, Events and Reports tabs, logged in the Deploy log; core.js copy with the renamed identifiers and the device migration migrateIdKey. v37: the embedded core.js gains the fish starter core (fishGen marks fish.json start entries first) and the fish card cover chosen within the highest source tier (Pierre's own first), then by the judged ease of fish-photos.json, unused by the script: the fish answers are not logged, so nothing it computes changes; v36: the full replay applies the player's first-launch answer (reefid-sync-coral-start in their saved data, or start in an anonymous device's send): a genus never answered starts from the global level shrunk towards the level the answer says, the answer in force at each answer (core.js startPriorAt), the stored replay keyed by that history's fingerprint too (Replayed Since = reset#fingerprint, core.js startFp) and sent with it (fp), so the app adopts it only for the history it holds, as the app does; v35: the admin's Analyses report (multifactor analyses of the answer log, every 1000 answers), computed by a GitHub Action (tools/analyses.js, .github/workflows/analyses.yml) and kept here: POST analysesPut stores it in an Analyses tab (chunked, 2.5 MB at most), POST analysesGet reads it (head: 1, only the answer count and the stored report's own count), admin token only; v34: a save keeps the saved copy's keys of a subject the saving app does not know (core.js keepSubjectKeys: an app from before fish no longer erases the fish progress); players' reports keep a fish teaching id (t01) as the expected and answered unit (logReports_); the embedded core.js gains the subjects (SUBJECTS, the fish adapter fishGen, mergeUsers per subject), unused by the script: the fish answers are not logged, so nothing it computes changes, and the fish progress is stored in the Data column as any other key; v33: the app was renamed IMR Reef ID and its storage keys with it (owner's decision, 2026-11-03): a player's saved data is read under the new key names or the old ones (dataKey_: progress, reset, achievements), an account merge drops the rules version under both names; the embedded core.js gains the key table (LEGACY_KEYS, keysIn, withLegacy), unused by the script; v32: the full replay reads each answer's Seconds (core.js rtWeight: a right answer's ability steps weighed by its time against the player's earlier ones, rules version 4); the app weighs its steps by time only from this version (core.js RT_SHEET); v31: hierarchical photo Elo: a photo's difficulty is its genus's offset plus its own residual, both moved by every trusted answer (the genus offset by GENUS_K 0.4, damped by its weighed answers), so a photo nobody has answered starts at its genus's offset; ?stats=1 serves each photo's total difficulty as before and the genus offsets as gd: {genus: [offset, weighed answers]} (stats cache stats15); the genus offset moves the photo memory offsets the full replay uses, so core.js rules version 3 replays every player again; v30: pages opened in a visit: an event 'pages' (core.js PAGES, cleaned by pagesClean: which pages were open, how many times and for how long, the genus sheets opened with how they were reached and whether the genus had been asked already, the answers so far) under the admin's id of the player, never the name: the device's anonymous answer id (eanon) is stored as aid_('~anon ' + id), a signed-in player's name and code (ename, epin) are checked and stored as aid_(name), a wrong code stores no id; kept in a Pages tab of their own, which POST {readEvents: 1, pages: 1, token} reads (the last 10,000), so the other events never push them out; v29: the embedded core.js gains the admin's quantile and distOf helpers (Photo stats Overview), unused by the script; v28: progress replayed from the whole answer log by this script: the app's own progress engine (core.js, embedded at the end of this file by tools/sync_core.py) replays a player's answers in the reply to a sign-in, load or save (or to a device's anonymous answers) when their app applied an older rules version, the result kept in a new Replayed tab and sent as replay: {rv, n, rec, ids}; the app adopts it, the player's saved copy is never rewritten here; the hold's ids, like the replay's, cover every answer from the request's pt (the oldest answer the device still queues); v27: typed answers (mode |t, the player types the genus instead of picking one of the choices) are rated with no guess rate (guess_ 0), stats cache stats14; v26: photo memory estimated from the answers: an answer on a photo is expected easier by an offset that depends on the player's own history with it (new 0; shown never right, right once, right twice or more: estimated in the same replay as the photos and the players, shrunk to the old fixed rule as prior), one expectation for the photos and the player's level (until v25 the level ignored memory), ?stats=1 serves the offsets as mem and the answers behind them as memn (stats cache stats13); v25: a request from an app version before 2026-11-03 (no av) is logged in Events as kind 'old', with the name or anonymous id when it carries one, at most once an hour per sender; v24: the flood caps count only answers the sheet does not have yet, so a device sending again what it already sent (the app's one-time catch-up of anonymous answers, a resend after a lost reply) never uses up its quota; v23: the opening hold synced: each load of a player's progress carries hold, the app's CUSUM (model.js holdStep) over their logged answers since their last progress reset, the gentle restart's answers (mode |w) left out; Answers gets two columns at the end, Seconds (time to answer) and Enlarged (a photo enlarged before answering, 0/1), logged only; v22: the leaderboard % follows the app's new progress per genus, a moving average of the answers weighed by what each one proves (s.pg, core.js PROG, pgOf); progress saved before it replays its last 10 results; v21: Events tab: one 'load' event a visit with the load times (first page, quiz, first quiz photo), the line measured, the bytes downloaded and the CDN server, so the loading order is set from the players' real lines; v20: the admin can hide a player from the public leaderboard (Board -1, userBoard), which the player's own syncs never undo (a test account); 2-choice questions logged as plain quiz are rated as 2-choice (from the Choices column; stats cache stats12); the admin can rename a player to keep their record apart (userRename: answers, reports, progress follow, hidden from the leaderboard; the old name is free again, so the person can start over under it); v19: Events tab: anonymous error reports from the players' devices (app errors, photos that fail, saves that fail) and their answers to the occasional one-tap question (too easy / about right / too hard); admin readEvents; v18: devices that never signed in count for photo difficulty and confusions under the same rule as signed-in players (10 answers, clearly above chance, weighed by experience n / (n + 10)); plain answer count per photo; v17: photo difficulty and confusions count only signed-in players whose answers are clearly above chance (10 answers or more); every player starts as a beginner (level -1); a player's answers move the photos more as their level settles (n / (n + 30)), and repeats count against what the player remembers of the photo; answers of a device that never signed in count once it signs in; readAnswers rows carry an anonymous flag; admin anonDelete removes the answers of chosen anonymous ids (test runs); v16: the leaderboard computes each player's progress % itself from their saved progress (same formula as the app), so it is up to date for everyone without waiting for their next sync; v15: the leaderboard shows a player's level only from 200 answers (it moves too much before); GET ?achs=1 gives how many signed-in players hold each achievement; v14: public leaderboard (GET ?board=1: name, progress %, level of every signed-in player who did not opt out), the progress % and the opt-out are saved with each sync (Progress, Board columns); per-player answers and abilities are admin-only (POST readAnswers / readStats with the token), so leaderboard names can't be matched to an answer history; v13: the admin player list gives each player's anonymous id, so the admin can show names beside the anonymous answer stats (admin token only, like the names); v12: answers of players who never sign in arrive under a random device id (~anon <id>), moved to the name at sign-in; caps against floods (per anonymous id, per name, new accounts, reports) with an Alerts tab; v11: updates itself from GitHub (autoUpdate, every 15 min, once installAutoUpdate has run: no more copy and paste); admin user management: list players with their stats, delete a player, merge two names of one person (admin token only); a removed name+code gets error 'gone' instead of a new account; the mode of a duel on a chosen pair (quiz-duel|A|B) is kept (it was dropped, so it was rated as a 4-choice answer); v10: each answer logs the choices offered (Choices column), and ?stats=1 adds how often each pair of genera was offered together and mixed up (confusion scores); v9: quiz questions with easy wrong choices are logged "quiz|kN" (N plausible choices) and rated with a 1/N guess; v8: reports read by every admin with their GitHub token (v7 had a single owner), reports and feedback from anywhere in the app (photos, sheets, pages); v7: players report a wrong answer or a bad photo (Reports tab); v6: code review fixes: progress of any size (Progress data tab), stale-write check, input sanitised, PIN throttle, secret salt for anonymous ids; earlier: v5 continuous difficulty)
// Setup: Extensions > Apps Script, paste this file, Deploy > New deployment > Web app,
// Execute as: Me, Who has access: Anyone. Put the /exec URL in SYNC_URL in app.js.
// Each RA picks a name and a 4-digit code in the app; the code only stops accidental overwrites.

// The app's old id, kept as the salt of the code hashes (hash_) and of the public anonymous ids (admin.js): changing it
// would lock every player out (rename to IMR Reef ID, 2026-11-03).
const SALT = 'imr-coral-id';  // rename-app: keep
// v33 (rename of 2026-11-03): the app's keys were renamed with the app (renamed IMR Reef ID; core.js LEGACY_KEYS). A
// player's saved data holds the new names, the old ones (an app from before the rename saved it last), or both (the
// renamed app also sends the old names while old apps may read them): the new name first, else the old one.
const DATA_KEYS_ = {  // rename-app: keep-begin
  progress: ['reefid-sync-coral-progress', 'imr-coral-progress'],
  reset: ['reefid-sync-coral-reset', 'imr-coral-reset'],
  ach: ['reefid-sync-ach', 'imr-coral-ach']
};  // rename-app: keep-end
function dataKey_(data, k){ const d = data || {}, n = DATA_KEYS_[k]; return d[n[0]] !== undefined ? d[n[0]] : d[n[1]]; }
// Progress and Board (v14): the player's progress % (as the app shows it) and 0 when they chose to stay off the public
// leaderboard (blank or 1 = shown); -1 (v20) = hidden by an admin (userBoard), kept whatever the player's app sends.
const HEAD = ['Name', 'Updated', 'Learned', 'Seen', 'Total', 'Review first', 'Code hash', 'Data', 'Progress', 'Board'];
const COLORS = {ok: '#dcefd9', mid: '#e3f1f3', weak: '#f7dcd6', new: '#f2f2f2'};
const LABELS = {ok: 'Learned', mid: 'Learning', weak: 'Review', new: ''};
// One row per quiz answer: the history behind each RA's progress. Activity sums it up per RA.
// Seconds and Enlarged (v23, Pierre 2026-11-02: a right answer that needed a long look or an enlarged photo says the photo
// was harder; logged to be analysed later, nothing uses them yet): seconds from the question's photos in view to the
// answer (0-600, 0.1 s), and 1 when a photo of the question was enlarged before answering. Added at the end: every reader
// takes the columns by position (answers_, stats_, users_, the Activity QUERY), so the first twelve never move.
// Typed and Retyped right (v59, a player's idea approved by Pierre 2026-11-05; the name study's question g): a typed
// answer's raw text as the player typed it first (up to 40 characters; blank for a picked answer or "I don't know"), and
// its spelling step (quiz.js typeBind): 1 when a close typo of the right name was retyped exactly, 0 when the retype was
// still wrong or skipped, blank when none was asked. Logged only: nothing the script computes reads them.
// v60 (Pierre, 2026-11-06: fish answers logged from the first second, the sheet records an answer at any taxonomic level):
// five columns at the end, after v59's Typed and Retyped right. Subject: the subject's id (core.js SUBJECTS: coral, fish), blank in the rows logged before
// (all coral). Rank: the rank asked (coral genus; fish family, an IMR entry, genus, later species). For every subject,
// Genus shown, Answered and Choices hold the units the app asks (a coral genus; a fish entry t01, a scientific genus
// g:Chromis), the machine's ids; Taxon shown and Taxon answered their names at that rank when an id is not its name
// (Damselfish, Chromis; blank for a coral genus, which is its own name, and for "I don't know"); Species shown the
// species of the photos shown (a fish photo's PDF species name; blank for the corals' genus photos). Only the subject
// the sheet replays (core.js SUBJECTS replay: the corals) feeds what the script computes (answerRows_: the photo
// ratings, confusions, opening hold, full replay; users_): the other subjects' rows are logged and served (readAnswers),
// nothing more.
// Scoring (v61, Pierre 2026-11-06, Q132): what the app scored the answer with (core.js scoreRec as JSON: photo difficulty,
// memory, mix-ups, look-alike test, recalls, the hint revealed after it), so the full replay scores it the same; read
// by its name (LOG.indexOf), not its place.
// Rejected tries (v100, Pierre 2026-11-08, Q237: "c'est essentiel. Et c'est vrai pour tout le jeu, partout"): the texts a
// typed answer refused before it was given (quiz.js typeBind: no unit of the game, two as close, a common name or another
// rank's name on a genus question), in order, as a JSON list (at most 10, each cleaned and cut to 40 characters as
// Typed); blank when none. Logged only: nothing the script computes reads it, and every reader takes the columns before
// it as they were.
// Device (v109, Pierre 2026-11-08, Q312): the anonymous id of the device that sent the answer (sync.js devId, the Device
// of its Events and Pages rows; dev in the save or the anonymous send, from the apps that know v109), signed in or not;
// blank when the app sent none (an app before it, a row logged before). Logged only, served to no reader yet; blanked
// when a deleted account's answers are kept as "~deleted <id>" (deleteAccount_, rule D7), so they never lead back to a
// device.
const LOG = ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id', 'Expected', 'Ability', 'New photos', 'Choices', 'Seconds', 'Enlarged', 'UTC offset', 'Typed', 'Retyped right', 'Subject', 'Rank', 'Taxon shown', 'Taxon answered', 'Species shown', 'Scoring', 'Rejected tries', 'Device'];
const DEV_COL = LOG.indexOf('Device');
const SC_COL = LOG.indexOf('Scoring');
// The Activity tab (one formula over the Answers tab): answers, right and last answer per player. v98: a surprise
// card's answer (Mode wink, core.js WINK_MODE) counts in none of them; the formula of the tab made before (ACTIVITY_V1)
// is replaced when the first one is logged (logAnswers_), a formula edited by hand is left alone.
const ACTIVITY = '=QUERY(Answers!A:F, "select A, count(E), sum(E), max(B) where A is not null and (F is null or F <> \'wink\') group by A order by max(B) desc label count(E) \'Answers\', sum(E) \'Right\', max(B) \'Last answer\'", 1)';
const ACTIVITY_V1 = '=QUERY(Answers!A:E, "select A, count(E), sum(E), max(B) where A is not null group by A order by max(B) desc label count(E) \'Answers\', sum(E) \'Right\', max(B) \'Last answer\'", 1)';

// v117: a tab that exists but is empty (made by hand, or by anything but this function) gets its header too, as a new one
// does. The tab "Replayed Fish" stood empty on the sheet, without its header: find_ on it threw, so every fish replay
// failed before it was stored or sent (replays_ leaves a failed subject out), and no fish player was ever replayed.
function sheet_(name, head){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (head && sh.getLastRow() < 1) { sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); if (head === HEAD) sh.hideColumns(7, 2); }
  return sh;
}
function hash_(name, pin){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + '|' + name.toLowerCase() + '|' + pin));
}
const VERSION = 130;  // assigned at merge with the header line (tools/sheet_version.py --assign; a PR never edits either: rule D3); every reply carries it as v
function json_(o){ o.v = VERSION; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function find_(sh, name){
  if (sh.getLastRow() < 1) return 0;  // v117: an empty tab holds no name (a range of no row throws)
  const names = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]).toLowerCase());
  const i = names.indexOf(name.toLowerCase());
  return i > 0 ? i + 1 : 0;
}
function clean_(p){ return {name: String(p.name || '').trim().slice(0, 40), pin: String(p.pin || '').trim()}; }
// A user string never becomes a formula: a leading = + - @ gets Sheets' quote prefix (hidden, not part of the value read back).
// Also used for the code hash, whose base64 can start with +.
const safe_ = x => { const t = String(x == null ? '' : x); return /^[=+\-@]/.test(t) ? "'" + t : t; };
// Answer fields keep only the characters they can have; anything else is dropped.
const word_ = (x, re, n) => { const t = String(x == null ? '' : x).slice(0, n); return re.test(t) && !protoWord_(t) ? t : ''; };
// v115 (review of #801): a value holding a name Object.prototype has (__proto__, constructor, toString…) as one of its
// words is refused as any malformed value (word_): as a photo, unit or mode it would reach the script's lookup maps
// (stats_, photoCheck_) and take the inherited member for its entry.
const PROTO_RE = new RegExp('(^|[\\s|:,])(' + Object.getOwnPropertyNames(Object.prototype).concat('__proto__').join('|') + ')(?=$|[\\s|:,])');
const protoWord_ = t => PROTO_RE.test(t);
// A row of the Answers tab holding such a word in its unit, answer, mode, photos or choices (logged before word_ refused
// them): left out of what the script computes from the log (answerRows_: the photo stats, the replays, the hold).
const protoRow_ = r => [2, 3, 5, 6, 11].some(i => r[i] != null && r[i] !== '' && protoWord_(String(r[i])));
// Wrong codes: after 5 for one name within 10 minutes, every attempt for that name waits 10 minutes (10,000 codes can't be tried).
const failKey_ = name => 'pinfail:' + name.toLowerCase();
const blocked_ = name => Number(CacheService.getScriptCache().get(failKey_(name)) || 0) >= 5;
function failed_(name){ const c = CacheService.getScriptCache(), k = failKey_(name); c.put(k, String(Number(c.get(k) || 0) + 1), 600); }

// Progress of any size: a Sheets cell holds at most 50,000 characters, so the progress JSON lives in the "Progress data" tab,
// one row per RA: name, revision, then the JSON in chunks of 45,000 characters. RAs column H keeps the JSON when it fits
// (readable, and what older script versions read), else '@Progress data'. The revision counts writes (stale-write check).
const DATA_TAB = 'Progress data', CHUNK = 45000;
function dataRow_(name){ const sh = sheet_(DATA_TAB, ['Name', 'Revision', 'Data']), r = find_(sh, name); return {sh: sh, r: r}; }
function readData_(name, h){
  const d = dataRow_(name);
  if (!d.r) return {rev: 0, json: h && h !== '@' + DATA_TAB ? h : '{}'};
  const row = d.sh.getRange(d.r, 1, 1, d.sh.getLastColumn()).getValues()[0];
  return {rev: Number(row[1]) || 0, json: row.slice(2).map(String).join('') || '{}'};
}
function writeData_(name, json, rev){
  const d = dataRow_(name), r = d.r || d.sh.getLastRow() + 1, parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(safe_(json.slice(i, i + CHUNK)));
  const old = d.r ? d.sh.getLastColumn() : 0, row = [safe_(name), rev].concat(parts);
  while (row.length < old) row.push('');  // clear chunks left over from a longer copy
  d.sh.getRange(r, 1, 1, row.length).setValues([row]);
}

// GET ?stats=1 → photo difficulty learned from every answer (Elo, see stats_), cached 10 minutes: photos, conf, the
// photo memory offsets (mem, memn, v26) and the genus offsets (gd, v31) only.
// Per-player numbers are admin-only from v14 (the public leaderboard names players: a public per-id ability or answer log
// could be matched to a name): POST {readStats: 1, token} → stats_ with ras; POST {readAnswers: 1, token, aname, apin}
// → answers_ (aname/apin, never name/pin: an older script must not take it for a progress write). GET ?answers=1 → 'token'.
// GET ?name=…&pin=… → the saved progress for that RA, if the code matches, and (v23) their opening hold (hold_).
// v50 (Pierre, 2026-11-05: "save failed" too often): every reply is the script's own JSON. An exception thrown out of
// doGet / doPost (the script lock not had in time, a Sheets service timeout or quota, a script error) made Apps Script
// answer with its HTML error page, which carries no CORS header: the browser hid it from the app and reported a network
// failure ("Failed to fetch", Safari "Load failed") although the script had answered. It is now caught and answered as
// {ok: false, error: 'lock'} (lock_: the script lock not had within LOCK_MS, another request held it) or {ok: false,
// error: 'server', msg} (a short message, long ids cut): a ContentService reply, which the browser lets the app read.
// The app keeps what it sent and tries again (sync.js); an app before v50 reads them as any refused request (its
// answers, events and reports stay queued and go again).
function doGet(e){ timStart_(TIM.EVERY); try { return doGet_(e); } catch (err) { return fail_(err); } finally { timEnd_(); } }
function doPost(e){ timStart_(TIM.EVERY); try { return doPost_(e); } catch (err) { return fail_(err); } finally { timEnd_(); } }
const fail_ = err => json_(err && err.lockBusy ? {ok: false, error: 'lock'} : {ok: false, error: 'server', msg: errText_(err)});
const errText_ = err => String((err && err.message) || err || '').replace(/[A-Za-z0-9_-]{25,}/g, '…').replace(/[\u0000-\u001f]+/g, ' ').slice(0, 100);
// The script lock, waited for at most ms (LOCK_MS by default; it was waitLock(10000), whose timeout threw); thrown as
// {lockBusy} when another request holds it longer, which doGet / doPost answer as error 'lock'.
const LOCK_MS = 20000;
function lock_(ms){ const l = LockService.getScriptLock(); if (!l.tryLock(ms || LOCK_MS)) throw {lockBusy: true}; return l; }

// v130: the Timings tab (the storage study of 2026-11-14, step 1: "log ms and rows for each full read and for each save,
// sampled, in a small tab with no player data"; Pierre, 2026-11-14, Q352: the answer log moves to Cloudflare D1 only when
// a measured threshold is crossed). One row per measured operation: Time, Op (a fixed name, never built from a request),
// Ms (elapsed), Rows and Cols (what a whole-tab read read; for a request, the Answers tab's rows it saw), Version (the
// script's), Weight (how many calls the row stands for). Never a name, code, device, answer id or answer content (rules
// D2, D7: nothing to clean when an account goes). Measured: the whole-tab reads of Answers (logRows_: answerRows_, the
// admin's readAnswers) and of its Id column (freshAnswers_, logAnswers_), the photo stats' build (stats_, a cache miss),
// every player's saved data (datas_), the leaderboard's replays (boardWarm_), and as a whole a completed save, an
// anonymous send that logged, a load, a public stats request, the admin's readAnswers and each run of the 15-minute
// trigger (autoUpdate). Sampled per request (timStart_): 1 request in TIM.EVERY (1 trigger run in TIM.EVERY_TRIGGER)
// keeps every row it measures, at that weight; any other keeps only an operation slower than TIM.SLOW (a trigger run
// TIM.SLOW_TRIGGER), at weight 1. The rows wait in memory (TIM_) and are written at the very end of the request (timEnd_,
// from doGet / doPost's finally and autoUpdate's), after every script lock is released, one appendRow each (atomic: two
// requests ending together never write over each other), inside try/catch: a failure loses the rows, never the reply.
// Bounded by the trigger (timTrim_): past TIM.MAX rows the oldest rows are deleted, back to TIM.KEEP of TIM.MAX (the
// recent months kept, every kept row as it was logged, so the weighted figures stay unbiased); past twice TIM.MAX (a
// trigger that stopped), nothing more is written. Read by tools/timings.js (per operation: count, median, p90, max ms;
// rows over time; the quota limits).
const TIM = {TAB: 'Timings', HEAD: ['Time', 'Op', 'Ms', 'Rows', 'Cols', 'Version', 'Weight'], EVERY: 50, EVERY_TRIGGER: 16, SLOW: 5000, SLOW_TRIGGER: 60000, MAX: 4000, KEEP: 0.75, ROWS: 8, ON: true};
let TIM_ = {on: false, every: 1, t0: 0, op: '', n: '', rows: []};
// A request (or trigger run) starts: sampled or not, at 1 in every.
function timStart_(every){
  TIM_ = {on: false, every: 1, t0: Date.now(), op: '', n: '', rows: []};
  try { TIM_.every = every; TIM_.on = TIM.ON && every > 0 && Math.random() * every < 1; } catch (e) {}
}
// One operation that started at t0 (Date.now()) ends: kept when the request is sampled or the operation slow. top: the
// request's own row, which the per-request cap (TIM.ROWS) never drops. Never throws.
function tim_(op, t0, rows, cols, top){
  try {
    if (!TIM.ON) return;
    const ms = Date.now() - t0, slow = ms >= (op === 'trigger' ? TIM.SLOW_TRIGGER : TIM.SLOW);
    if (!slow && !TIM_.on) return;
    if (!top && TIM_.rows.length >= TIM.ROWS - 1) return;
    const n = x => (typeof x === 'number' && isFinite(x) ? x : '');
    TIM_.rows.push([new Date(), String(op), ms, n(rows), n(cols), VERSION, slow ? 1 : TIM_.every]);
  } catch (e) {}
}
// The request ends: its own row (TIM_.op, set where the request is known to be one of those measured), then the rows
// written. Never throws.
function timEnd_(){
  try {
    if (TIM_.op) tim_(TIM_.op, TIM_.t0, TIM_.n, '', true);
    const L = TIM_.rows;
    TIM_.rows = [];
    if (!L.length) return;
    const sh = sheet_(TIM.TAB, TIM.HEAD);
    if (sh.getLastRow() > 2 * TIM.MAX) return;
    L.forEach(r => sh.appendRow(r));
  } catch (e) {}
}
// From the 15-minute trigger only (one writer): past TIM.MAX rows, the oldest rows deleted in one deleteRows, back to
// TIM.KEEP of TIM.MAX; rows appended meanwhile land below and are not touched. Returns the rows removed. Never throws.
function timTrim_(){
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TIM.TAB);
    if (!sh) return 0;
    const n = sh.getLastRow() - 1;
    if (n <= TIM.MAX) return 0;
    const k = n - Math.floor(TIM.MAX * TIM.KEEP);
    sh.deleteRows(2, k);
    return k;
  } catch (e) { return 0; }
}
function doGet_(e){
  ROWS_ = null;
  if (e.parameter.stats && !e.parameter.av) oldApp_('photo stats');
  if (e.parameter.stats) behind_(e.parameter);  // v50: a device on a replaced app version
  if (e.parameter.stats) { TIM_.op = 'stats'; const st = statsServed_() || stats_(true);  // vNEXT: the snapshot (statsFold_), else the whole log
    return json_({ok: st.ok, photos: st.photos, conf: st.conf, mem: st.mem, memn: st.memn, gd: st.gd, fmt: st.fmt}); }
  if (e.parameter.answers) return json_({ok: false, error: 'token'});
  if (e.parameter.board) return json_(board_(e.parameter.s));
  if (e.parameter.achs) return json_(achs_());
  const {name, pin} = clean_(e.parameter);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const sh = sheet_('RAs', HEAD), r = find_(sh, name);
  if (!r) { const g = gone_(name, hash_(name, pin)); return json_(g ? {ok: false, error: 'gone', into: g.into} : {ok: true, found: false}); }
  if (blocked_(name)) return json_({ok: false, error: 'wait'});
  const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (row[6] !== hash_(name, pin)) { failed_(name); return json_({ok: false, error: 'pin'}); }
  if (!e.parameter.av) oldApp_('load', name);  // only for a real account with its code (Codex review #373)
  // The other subjects' replays (replays_), each asked by its own rules version (rv_fish).
  const rvs = {};
  CORE_.replayedSubjects().forEach(id => { if (e.parameter['rv_' + id] !== undefined) rvs[id] = Number(e.parameter['rv_' + id]); });
  const have = e.parameter.have !== undefined && e.parameter.have !== '' ? Number(e.parameter.have) : NaN;
  TIM_.op = 'load';  // v130: timed (timEnd_)
  return json_(load_(name, row, {pt: Number(e.parameter.pt), rv: e.parameter.rv !== undefined ? Number(e.parameter.rv) : undefined, rvs: rvs, have: have, light: !!e.parameter.light}));
}
// The load of a player's saved copy (row: their RAs row, the code checked), as GET ?name=&pin= answers it, and from v116
// as a light save answers 'stale' (doPost_). q: pt, rv (undefined: no replay asked), rvs, and from v116 have (the
// revision of the copy the device holds: the same revision answers same: 1 and leaves the copy out, the device reading
// its own; sync.js syncGet) and light (the hold's ids from pt only: hold_; the copy under the new key names only, the
// old ones, which the app reads as the new when it has no new one, under the new: core.js keysIn).
function load_(name, row, q){
  const d = readData_(name, String(row[7] || '')), data = JSON.parse(d.json), out = {ok: true, found: true, updated: row[1], rev: d.rev, data: data};
  // v58: the account's generation, apart from the progress (sync.js acctChanged); the app never stores it as a key.
  if (data && typeof data._acct === 'string') { out.acct = data._acct; delete data._acct; }
  // v48: the beta groups the player is in (groupsOf_), [] for none. A failure leaves it out (the app keeps what it had).
  try { out.groups = groupsOf_(name); } catch (err) {}
  try { out.notes = notes_(); } catch (err) {}  // v87: the Notes tab's card lines (notes_)
  if (row[6] && row[6] === adminAcct_()) out.admin = 1;  // v125: this is the admin's account (the app shows its 🌱)
  // v57: the ids of the player's own verified reports (repsOf_), for "Your feedback helped" (Q66). A failure leaves it out.
  try { const reps = repsOf_(name); if (reps.length) out.reps = reps; } catch (err) {}
  // v23: the player's opening hold from their answers (hold_). An app before v23 ignores it; a failure leaves it out
  // (the app keeps its own).
  try { const o = hold_(name, resetOf_(data), q.pt, q.light); out.hold = o.h; out.holdIds = o.ids; } catch (err) {}
  // v28: the full replay of the player's log, when their app applied an older rules version (replay_). A failure leaves
  // it out (the app keeps its own progress and asks again next time).
  if (q.rv !== undefined) {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) try { const rp = replay_(name, resetOf_(data), q.rv, q.pt, startOf_(data)); if (rp) out.replay = rp; } catch (err) {} finally { lock.releaseLock(); }
  }
  const rps = replays_(name, data, q.rvs || {}, q.pt); if (rps) out.replays = rps;
  if (q.have === d.rev) { delete out.data; out.same = 1; }  // v116: the device holds this very copy (sync.js sdOf)
  else if (q.light) out.data = CORE_.keysIn(data);  // v116: under the new key names only, as the app reads it (sync.js syncGet)
  return out;
}

// POST {name, pin, data, summary: {learned, seen, total, review: [], genera: {Genus: 'ok'|'mid'|'weak'|'new'}},
//   answers: [{id, t, g, a, ok, m, ph, e, th, nw, ch, rt, zm, tz}], at: revision merged against (optional)} → {ok, log: true, rev}.
// log tells the app its answers are saved; they are logged first, so they are kept even if the progress write fails.
// at ≠ the saved revision → {ok: false, error: 'stale', log: true}: another device wrote meanwhile; the app pulls, merges, resends.
// v119: no account yet and a reserved name (core.js reservedName) → {ok: false, error: 'reserved'}, nothing logged or written.
// POST {reports: [...], rname, rpin} → {ok, rep: true}: players' reports (logReports_, v7). The reporter goes in rname/rpin,
// never name/pin, so an older script answers 'input' and never mistakes a report for an empty progress write.
function doPost_(e){
  ROWS_ = null;
  let p = JSON.parse(e.postData.contents);
  // v116 (lighter saves, sync.js syncOnce): a light save comes wrapped, its gzip in base64 (z) or as it is (lt), so a
  // script before v116, which finds no name in it, answers 'input' and never takes a delta for an empty progress write.
  // A z this script cannot read answers 'zip': the app sends it again unpacked.
  if (p && typeof p.z === 'string') { try { p = JSON.parse(unzip_(p.z)); } catch (err) { return json_({ok: false, error: 'zip'}); } }
  else if (p && p.lt && typeof p.lt === 'object') p = p.lt;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return json_({ok: false, error: 'input'});
  if (Array.isArray(p.anonAnswers) && !p.av) oldApp_('anonymous answers', '~anon ' + String(p.anon || '').slice(0, 16));
  if (Array.isArray(p.anonAnswers)) return json_(anon_(p));  // v12: players not signed in (see anon_)
  if (Array.isArray(p.reports)) return json_(logReports_(p));
  if (p.selfDelete) return json_(selfDelete_(p));  // v58: a player deletes their own account (see selfDelete_)
  if (p.readReports) return json_(reports_(p.token));  // admin: POST {readReports: 1, token} (see reports_)
  if (Array.isArray(p.events)) return json_(events_(p));  // v19: error reports and one-tap answers (see events_)
  if (p.analysesPut || p.analysesGet) return json_(analyses_(p));  // admin (v35): the Analyses report, see analyses_
  if (p.readEvents) return json_(readEvents_(p.token, p.pages));  // admin: POST {readEvents: 1, token}; v30 pages: 1 for the Pages tab
  if (p.readStats || p.readAnswers || p.readLive) {  // admin (v14): per-player numbers, see doGet; v110 readLive (live_)
    if (!isAdmin_(String(p.token || ''))) return json_({ok: false, error: 'token'});
    if (p.readAnswers && !p.readLive && !p.readStats) TIM_.op = 'admin answers';  // v130: timed (timEnd_)
    return json_(p.readLive ? live_() : p.readStats ? stats_(true) : answers_({name: p.aname, pin: p.apin}));
  }
  if (p.users || p.userData || p.userDelete || p.userMerge || p.anonDelete || p.userBoard || p.userArchive || p.userGroup || p.userStart || p.statsExclude) return json_(users_(p));  // admin user management (v11, see users_; v48 userGroup; v98 userStart; v115 statsExclude)
  const {name, pin} = clean_(p);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const lock = lock_();
  let out, held = true;
  try {
    const sh = sheet_('RAs', HEAD), h = hash_(name, pin), s = p.summary || {};
    let r = find_(sh, name);
    if (r && blocked_(name)) return json_({ok: false, error: 'wait'});
    // The code is checked before anything is written (v12 review: a wrong code must not move anonymous answers).
    if (r && sh.getRange(r, 7).getValue() !== h) { failed_(name); return json_({ok: false, error: 'pin'}); }
    // A name the admin removed or merged, with its old code: no new account. Answers of a merged name go to the name it
    // joined; the app then asks the player to sign out (and to sign in under the other name).
    const g = r ? null : gone_(name, h);
    if (g) { if (g.into) logAnswers_(g.into, p.answers, null, p.dev); return json_({ok: false, error: 'gone', into: g.into, log: !!g.into}); }
    // v58 (Codex review #603): the generation the device saved under (acct, sync.js), checked under the lock before
    // anything is logged or written: no account of the name any more, or another generation of it (archived, the name
    // taken again since), and the save is refused as archived (the app stops and says so).
    if (typeof p.acct === 'string' && p.acct) {
      if (!r) return json_({ok: false, error: 'archived'});
      let d = {}; try { d = JSON.parse(readData_(String(sh.getRange(r, 1).getValue()), String(sh.getRange(r, 8).getValue() || '')).json || '{}') || {}; } catch (e) {}
      if (d._acct && d._acct !== p.acct) return json_({ok: false, error: 'archived'});
    }
    // v119 (Pierre, 2026-11-09): no new account under a reserved name (core.js reservedName: a word such as constructor,
    // __proto__ or toString), refused before anything is logged or written; an account that has one already saves as before.
    if (!r && CORE_.reservedName(name)) return json_({ok: false, error: 'reserved'});
    const saved = r ? readData_(name, String(sh.getRange(r, 8).getValue() || '')) : {json: '{}', rev: 0}, rev = saved.rev;
    // v116: a light save against another revision than the saved one (another device wrote since) is answered 'stale'
    // before anything is counted or logged, with the load of the copy there (load_), read once the lock is released, as a
    // load is: the app merges it and saves again at once, its answers still queued with it (as an app before v116 loads,
    // merges, then saves). A name not found (no row) answers found: false, which the app reads as archived. The row (its
    // code checked above) is read before the lock goes: an admin's delete, merge or archive in between moves the rows up,
    // and the row at r would then be another player's (independent review of #799).
    if (p.light && typeof p.at === 'number' && p.at !== rev) {
      if (!r) return json_({ok: false, error: 'stale', rev: rev, found: false});
      const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
      lock.releaseLock(); held = false;
      const ld = load_(name, row, {pt: p.pt, rv: typeof p.rv === 'number' ? p.rv : undefined, rvs: p.rvs && typeof p.rvs === 'object' ? p.rvs : {}, light: true});
      return json_(Object.assign(ld, {ok: false, error: 'stale', rev: ld.rev}));
    }
    let old = {}; try { old = JSON.parse(saved.json || '{}') || {}; } catch (e) {}
    // v116: a light save's data (lightData_): the copy rebuilt from a delta, or the whole data under the new key names, the
    // old ones added here. A delta that does not rebuild the copy the app holds is refused before anything is counted or
    // logged ('delta': the app sends the whole data again, its answers with it, which the caps below then count once).
    if (p.light) {
      const ld = lightData_(p, old, rev);
      if (!ld) return json_({ok: false, error: 'delta', rev: rev});
      p.data = ld;
    }
    // Caps (v12): at most 40 new accounts and 3000 answers per name every 6 hours; over that, nothing is written and the
    // app keeps its answers to send later. A real class of RAs stays far below both.
    if (!r && over_('newacct', 40)) return json_({ok: false, error: 'busy'});
    // Only the answers the sheet does not have yet count (v24): a resend after a lost reply uses up nothing.
    const f = freshAnswers_(p.answers);
    if (f.fresh.length && over_('n:' + name.toLowerCase(), 3000, f.fresh.length)) return json_({ok: false, error: 'busy'});
    logAnswers_(name, f.fresh, f.seen, p.dev);
    if (!p.av) oldApp_('save', name);  // after the code check (Codex review #373)
    if (typeof p.at === 'number' && p.at !== rev) return json_({ok: false, error: 'stale', log: true, rev: rev});
    // v34: the keys of a subject the saving app does not know (an app from before fish) are kept from the saved copy
    // (core.js keepSubjectKeys): replacing the record would erase that progress.
    // v58: the account's generation (_acct), made with the account and kept by every save (sent apart as acct): a device that knew another
    // generation of this name (a record archived, then the name taken again) learns it was replaced (sync.js acctChanged;
    // Codex review #603). An account saved before v58 gets one at its next save.
    const kept = CORE_.keepSubjectKeys(old, p.data || {});
    kept._acct = typeof old._acct === 'string' && old._acct ? old._acct : Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    const json = JSON.stringify(kept);
    try {
      writeData_(name, json, rev + 1);
      if (!r) { r = sh.getLastRow() + 1; }
      if (sh.getRange(1, 9).getValue() !== HEAD[8]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold');  // tab made before v14
      const pct = typeof s.pct === 'number' && isFinite(s.pct) ? Math.max(0, Math.min(100, Math.round(s.pct))) : '';
      // Board: the player's choice when the app sends it, else the one saved (an older app must not undo an opt-out).
      // An admin's hide (-1, v20) and an archive (-2, v58) stay: the player's app never sends them back to 1.
      const saved = r ? sh.getRange(r, 10).getValue() : '',
        board = Number(saved) < 0 && saved !== '' ? Number(saved) : typeof s.board === 'number' ? (s.board ? 1 : 0) : saved === 0 ? 0 : 1;
      sh.getRange(r, 1, 1, HEAD.length).setValues([[safe_(name), new Date(), s.learned || 0, s.seen || 0, s.total || 0, (s.review || []).map(safe_).join(', '), safe_(h), json.length < CHUNK ? json : '@' + DATA_TAB, pct, board]]);
    } catch (err) { return json_({ok: false, error: 'save', log: true}); }
    // The first send after signing in carries the device's anonymous id: its anonymous answers become this name's, for an
    // existing account (code checked above) as for a new one. v115 (review of #801): once the account is written, so a
    // send refused as stale or failing to save moves nothing (the app keeps the id and sends it again with its retry).
    if (/^[a-z0-9]{8,16}$/.test(String(p.anon || ''))) {
      relabel_('Answers', 1, '~anon ' + p.anon, name);
      pagesMove_('~anon ' + p.anon, name);  // v30: the sheets opened on the device go with its answers (Codex review #423)
      rplDrop_('~anon ' + p.anon);  // v55: the device's full replay record goes too (its answers are the name's now; every subject's)
      // v115 (the integrator, 2026-11-09, review of #801): a device left out of the statistics stays out once signed in:
      // its row follows its answers to the name's admin id (the whole account then, which the admin can count again in
      // Players), with an Alerts line under both admin ids, never a name.
      if (sxMove_('~anon ' + p.anon, name)) {
        rosterChanged_();
        try { sheet_('Alerts', ['Time', 'Event']).appendRow([new Date(), safe_('left out of the statistics: device ' + aid_('~anon ' + p.anon) + ' signed in as ' + aid_(name) + ', left out too')]); } catch (e) {}
      }
    }
    // One row per RA, one column per genus, coloured by status: the class at a glance.
    const genera = Object.keys(s.genera || {});
    if (genera.length) {
      const g = sheet_('By genus'), head = ['Name', 'Learned'].concat(genera.map(safe_));
      g.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); g.setFrozenRows(1); g.setFrozenColumns(2);
      const gr = find_(g, name) || g.getLastRow() + 1;
      g.getRange(gr, 1, 1, head.length).setValues([[safe_(name), (s.learned || 0) + '/' + (s.total || 0)].concat(genera.map(n => LABELS[s.genera[n]] || ''))])
        .setBackgrounds([['#ffffff', '#ffffff'].concat(genera.map(n => COLORS[s.genera[n]] || '#ffffff'))]);
    }
    try { boardUnitsSave_(s.boards); } catch (err) {}  // v95: the units of each other subject's leaderboard
    TIM_.op = 'save';  // v130: a completed save is timed as a whole, to its reply (timEnd_)
    out = {ok: true, log: true, rev: rev + 1, acct: kept._acct};  // v58: the generation, known to the creating device at once (Codex review #603)
    // v116: the checksum of the copy now saved, under the new key names (core.js dataSum), so a light app knows it holds
    // that very copy (sync.js sdSaved) and sends only what changes next time.
    if (p.light) { const k2 = CORE_.keysIn(kept); delete k2._acct; out.sum = CORE_.dataSum(k2); }
  } finally { if (held) lock.releaseLock(); }
  // v50: what the reply adds is read once the progress is written and the script lock released (it was computed under
  // it, so every other save, anonymous send and event batch waited for this player's replay; some waited past the lock's
  // timeout, and those failed). The answers this save logged are in the tab by now.
  // The hold over every answer now logged, in time order (Codex review #370: a device that sent answers older than
  // another device's must not keep the order it replayed them in): the app takes it after a send.
  try { out.groups = groupsOf_(name); } catch (err) {}  // v48, as the load reply
  try { out.notes = notes_(); } catch (err) {}  // v87, as the load reply
  try { const o = hold_(name, resetOf_(p.data), p.pt, !!p.light); out.hold = o.h; out.holdIds = o.ids; } catch (err) {}
  // v28: the full replay, over every answer now logged (replay_), under the script lock of its own as a load's (doGet_):
  // not had in time, the reply goes without it and the app asks again at its next sync.
  const lock2 = LockService.getScriptLock();
  if (lock2.tryLock(10000)) try { const rp = replay_(name, resetOf_(p.data), typeof p.rv === 'number' ? p.rv : NaN, p.pt, startOf_(p.data)); if (rp) out.replay = rp; } catch (err) {} finally { lock2.releaseLock(); }
  const rps = replays_(name, p.data, p.rvs, p.pt); if (rps) out.replays = rps;  // the other subjects' (replays_)
  return json_(out);
}

// v116 (lighter saves): the data of a light save p (sync.js syncOnce), against the saved copy old at revision rev. A
// delta (dz, core.js dataDelta) against the copy the app holds at its revision at: that copy is the saved one under the
// new key names (core.js keysIn, the generation _acct left out, as a load serves it), the delta applied (dataPatch), and
// the result taken only when its checksum is the app's (sum: the whole data the app holds, dataSum); null otherwise.
// Without a delta, the app's data as it is. Either way under the new names only: the old names are added here
// (core.js withLegacy, for a device still on an app from before the rename), as the app added them before.
function lightData_(p, old, rev){
  if (p.dz === undefined) return CORE_.withLegacy(p.data && typeof p.data === 'object' ? p.data : {});
  if (typeof p.at !== 'number' || p.at !== rev) return null;  // (a delta against another revision is answered 'stale' first)
  const base = CORE_.keysIn(old); delete base._acct;
  const d = CORE_.dataPatch(base, p.dz);
  return d && CORE_.dataSum(d) === p.sum ? CORE_.withLegacy(d) : null;
}
// A light save's gzip, in base64 (sync.js gzip64), read back as text.
function unzip_(z){ return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(z), 'application/x-gzip')).getDataAsString('UTF-8'); }

// Appends new answers to the Answers tab, skipping ids already anywhere in it (a resend after a lost reply).
// The answers of a send the Answers tab does not have yet (by id): what the flood caps count (v24, Codex review #372: a
// device sending again what it already sent must not use up its quota). The ids read once are handed to logAnswers_.
function freshAnswers_(answers){
  const t0 = Date.now(), sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), n = sh ? sh.getLastRow() - 1 : 0;
  const seen = new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  if (n > 0) { TIM_.n = n; tim_('read Answer ids', t0, n, 1); }  // v130: the Timings tab
  return {seen: seen, fresh: (Array.isArray(answers) ? answers : []).filter(a => a && a.id && !seen.has(String(a.id)))};
}
// dev (v109): the sending device's anonymous id (dev_), in every row of the send; blank when the app sent none.
function logAnswers_(name, answers, seen0, dev){
  if (!Array.isArray(answers) || !answers.length) return;
  const dv = dev_(dev);
  const sh = sheet_('Answers', LOG);
  // The new columns first (v60): the header check below reads the last one, which a tab made before has not.
  if (sh.getMaxColumns && sh.getMaxColumns() < LOG.length) sh.insertColumnsAfter(sh.getMaxColumns(), LOG.length - sh.getMaxColumns());
  if (sh.getRange(1, LOG.length).getValue() !== LOG[LOG.length - 1]) sh.getRange(1, 1, 1, LOG.length).setValues([LOG]).setFontWeight('bold');  // tab made before v5 (or v10, v23: the new columns get their header)
  const act = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activity');
  if (!act) sheet_('Activity').getRange(1, 1).setFormula(ACTIVITY);
  else if (answers.some(CORE_.winkEntry) && act.getRange(1, 1).getFormula() === ACTIVITY_V1) act.getRange(1, 1).setFormula(ACTIVITY);  // v98
  const n = sh.getLastRow() - 1, t0 = Date.now();
  const seen = seen0 || new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  if (!seen0 && n > 0) { TIM_.n = n; tim_('read Answer ids', t0, n, 1); }  // v130: the Timings tab
  // v60: a unit may be a fish entry (t01) or scientific genus (g:Chromis), in Genus shown, Answered, Choices and a duel's
  // mode; still a letter first, so nothing can start a formula.
  const G = /^[A-Za-z][A-Za-z0-9: -]*$/, M = /^[A-Za-z0-9:|-]*$/, PH = /^[A-Za-z0-9_. -]*$/, ID = /^[a-z0-9]+$/, CH = /^[A-Za-z0-9: ]*$/;
  const W = /^[a-z]{1,20}$/, TX = /^[A-Za-z][A-Za-z0-9 .&'()-]*$/, SP = /^[A-Za-z][A-Za-z .,()-]*$/;
  const subj = a => word_(a.s, W, 20) || CORE_.SUBJECTS[0].id;  // an app from before v60 sends none: its answers are coral
  const rank = (a, sj) => word_(a.rk, W, 20) || (CORE_.SUBJECTS.find(S => S.id === sj) || {}).rank || '';
  // v69: a fish answer from an app before the switch to the book's families names an old entry (t01): renamed here to
  // its family (core.js renameLogEntry, the row's species shown deciding a split entry), so the log holds family ids only.
  const rows = answers.filter(a => a && a.id && ID.test(String(a.id)) && !seen.has(String(a.id))).slice(0, 2000)
    .map(a0 => { const a = CORE_.renameLogEntry(CORE_.subjectOf(subj(a0)), a0), sj = subj(a); return [safe_(name), new Date(a.t), word_(a.g, G, 40), word_(a.a, G, 40), a.ok ? 1 : 0, word_(a.m, M, 80), word_(a.ph, PH, 400), String(a.id).slice(0, 20), num_(a.e), num_(a.th), num_(a.nw), word_(a.ch, CH, 200), secs_(a.rt), flag_(a.zm), tz_(a.tz), typed_(a.ty), flag_(a.tr),
      sj, rank(a, sj), word_(a.tn, TX, 80), word_(a.ta, TX, 80), word_(a.sp, SP, 300), scoring_(a.sc), rejected_(a.rj), dv]; });
  if (!rows.length) return;
  const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
  sh.getRange(at, 1, rows.length, LOG.length).setValues(rows);
  dropHold_(name);
  try { photoAlert_(name, rows); } catch (e) {}  // v115: flagged, never refused
}
const num_ = x => typeof x === 'number' && isFinite(x) ? x : '';
// v109: a device id as the app makes it (sync.js devId: a string of 10 lower-case letters and digits; 8 to 16 accepted,
// as the Events' Device, events_), else blank: never anything a cell could read as a formula.
const dev_ = x => typeof x === 'string' && /^[a-z0-9]{8,16}$/.test(x) ? x : '';
// v23: seconds to answer, 0-600 to the tenth (blank when the app sent none: before v23, or photos never loaded); and a
// 0/1 flag (blank when not sent).
const secs_ = x => typeof x === 'number' && isFinite(x) ? Math.round(Math.max(0, Math.min(600, x)) * 10) / 10 : '';
const flag_ = x => x === 1 || x === true ? 1 : x === 0 || x === false ? 0 : '';
// v44: the device's UTC offset when the answer was given, in whole minutes east of UTC (-720 to +840 exist; blank when
// the app sent none or something else), logged only: the time of day at home for the analyses (Pierre, 2026-11-04).
const tz_ = x => Number.isInteger(x) && Math.abs(x) <= 840 ? x : '';
// v59: a typed answer's raw text, control characters out, trimmed, at most 40 characters, never read as a formula (safe_).
const typed_ = x => typeof x === 'string' ? safe_(x.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40)) : '';
// v100: the texts a typed answer refused before it, each as typed_ (control characters out, trimmed, 40 characters at most),
// at most 10, in order, as a JSON list; blank when none (or the app sent none).
const rejected_ = x => { const L = Array.isArray(x) ? x.filter(t => typeof t === 'string').map(t => t.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40)).filter(Boolean).slice(0, 10) : []; return L.length ? JSON.stringify(L) : ''; };
// v61: the scoring record (core.js scoreRec: only its known fields, each checked), as JSON; blank when the app sent none.
const scoring_ = x => { const o = CORE_.scoreRec(x); return o ? JSON.stringify(o) : ''; };

// The opening hold (v23, Pierre 2026-11-02: it follows the player from one device to another, and is rebuilt from the
// answers they gave before it existed: an RA who left on a run of misses had no hold on his device). The app's rule
// (model.js holdStep, docs/LEARNING.md "Held while the player falls behind"): over the answers in time order, h = max(0,
// h + expected - right - SLACK), rounded to 1/1000 at each step as the app does; no new genus card while h is 1.5 or
// more (the app decides that). Answers of the gentle restart (mode with |w, from v23) do not count, older rows do; only
// the answers since the player's last progress reset count (reefid-sync-coral-reset, as the app starts the hold over then).
// HOLD.SLACK is model.js INTRO.SLACK: keep both in step (tests/sync.test.js replays model.js on the same answers).
// The app takes it and adds its own answers the sheet has not confirmed yet (model.js holdSync). Cached per player
// until their next answers are logged or moved (logAnswers_, relabel_, dropRows_).
const HOLD = {SLACK: 0.1, IDS: 500};
const holdKey_ = name => 'hold:' + lc_(name);
function dropHold_(name){ ROWS_ = null; try { CacheService.getScriptCache().remove(holdKey_(name)); } catch (e) {} }
// The first-launch answer in a player's saved data (reefid-sync-coral-start, v29), null when there is none or it is broken.
// sid: another subject's (core.js subjKey, startKey: reefid-sync-fish-start, -reset), under its new key name or
// the one from before the rename (core.js keyLegacy).
const subjData_ = (data, k) => { const d = data || {}, o = CORE_.keyLegacy(k); return d[k] !== undefined ? d[k] : o ? d[o] : undefined; };
function startOf_(data, sid){
  try { const o = JSON.parse((sid ? subjData_(data, CORE_.startKey(sid)) : (data || {})['reefid-sync-coral-start']) || 'null'); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}
function resetOf_(data, sid){
  try { return resetAt_(JSON.parse((sid ? subjData_(data, CORE_.subjKey(sid, 'reset')) : dataKey_(data, 'reset')) || '""')); } catch (e) { return 0; }
}
// A progress reset time as the app keeps it (an ISO string) in ms, 0 when there is none.
const resetAt_ = t => typeof t === 'string' && t ? new Date(t).getTime() || 0 : 0;
// Returns {h, ids}: ids = the answer ids of the player's last HOLD.IDS rows counted, so the app does not add again the
// answers of a send whose reply was lost (they are already in h; Codex review #370), and every row from pt on (the time
// of the oldest answer the device still queues, as replay_ reads it: a lost reply can leave up to 2,000 answers already
// logged in the queue; Codex review #399). The cache keeps the last HOLD.IDS and the time of the first of them (t): a
// pt before it reads the rows again.
// light (v116, a request of the lighter saves, sync.js): only the ids from pt on, the only ones such an app reads (every
// answer it still queues is at pt or later; holdSync adds the queued answers not among them), not the last HOLD.IDS:
// up to 500 ids, several KB, in every reply. The cache keeps their times (tt) for it; a cache without them is read again.
function hold_(name, since, pt, light){
  const c = CacheService.getScriptCache(), k = holdKey_(name), hit = c.get(k),
    from = typeof pt === 'number' && isFinite(pt) ? pt - 1000 : Infinity,
    mine = (ids, tt) => (light ? ids.filter((x, i) => tt[i] >= from) : ids);
  // v50 (Codex review #565): the cached hold is used only while the Answers tab has as many rows as when it was read
  // (n): a request that read the tab before another logged answers must not keep its older hold in the cache.
  const tab = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), nAll = tab ? tab.getLastRow() : 0;
  if (hit) { const o = JSON.parse(hit); if (o.s === since && o.ids && typeof o.t === 'number' && from > o.t && o.n === nAll && (!light || Array.isArray(o.tt))) return {h: o.h, ids: mine(o.ids, o.tt || [])}; }
  const who = lc_(name), all = answerRows_(), nRead = ROWS_LAST_ || nAll;  // v60: the tab's rows as read, every subject's
  let h = 0;
  const rows = all
    .filter(r => lc_(r[0]) === who && !/\|w(\||$)/.test(String(r[5])))
    .map(r => [new Date(r[1]).getTime() || 0, Number(r[4]) ? 1 : 0, Number(r[8]) || 0, String(r[7])])
    .filter(r => r[0] > since)
    .sort((a, b) => a[0] - b[0]);  // stable: answers logged with the same time keep the sheet's order
  rows.forEach(([, ok, e]) => { h = Math.max(0, Math.round((h + e - ok - HOLD.SLACK) * 1000) / 1000); });
  const last = rows.slice(-HOLD.IDS), ids = rows.filter((r, i) => (!light && i >= rows.length - HOLD.IDS) || r[0] >= from).map(r => r[3]);
  try { c.put(k, JSON.stringify({s: since, h: h, ids: last.map(r => r[3]), tt: last.map(r => r[0]), t: last.length ? last[0][0] : 0, n: nRead}), 21600); } catch (e) {}
  return {h: h, ids: ids};
}

// The Answers tab read once per request (every LOG column; v32: Seconds and Enlarged, M-N, for the replay; v60: the
// Subject column, R; v61: Scoring, W): hold_, replay_, stats_ and the admin's replays go through it. Only the rows of the subject the
// sheet replays (core.js SUBJECTS replay: the corals; a row with no subject, logged before v60, is one): a fish answer
// rates no photo and counts in no confusion, hold or replay. Dropped whenever answers are logged or moved (dropHold_),
// and at the start of each request.
let ROWS_ = null, ROWS_LAST_ = 0;  // ROWS_LAST_: the tab's last row when ROWS_ was read (hold_ keys its cache by it)
const SUBJ_COL = LOG.indexOf('Subject');  // 17, core.js LOG_SUBJ: the same index in readAnswers rows
const replayed_ = r => CORE_.rowSubject(r) === CORE_.replaySubject() && !CORE_.winkRow(r);  // v98: never a surprise card's
function answerRows_(){
  if (ROWS_) return ROWS_;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers');
  ROWS_LAST_ = sh ? sh.getLastRow() : 0;
  ROWS_ALL_ = sh ? logRows_(sh, LOG.length).filter(r => !protoRow_(r)) : [];  // v115 (review of #801)
  return ROWS_ = ROWS_ALL_.filter(replayed_);
}
// The rows of another subject the sheet replays (core.js replayedSubjects: fish), from the same read of the tab
// (answerRows_), dropped with it; never a surprise card's answer.
let ROWS_ALL_ = [], SROWS_ = {of: null};
function subjRows_(sid){
  if (sid === CORE_.replaySubject()) return answerRows_();
  const base = answerRows_();
  if (SROWS_.of !== base) SROWS_ = {of: base};
  return SROWS_[sid] = SROWS_[sid] || ROWS_ALL_.filter(r => CORE_.rowSubject(r) === sid && !CORE_.winkRow(r));
}
// The Answers tab's rows (from row 2), its first k columns. A tab made before the columns of v60 has fewer until the next
// answer is logged (logAnswers_ adds them): what it lacks reads blank, so a reader never asks past the sheet's grid.
function logRows_(sh, k){
  const n = sh.getLastRow() - 1, t0 = Date.now();
  if (n < 1) return [];
  const w = sh.getMaxColumns ? Math.min(k, sh.getMaxColumns()) : k, v = sh.getRange(2, 1, n, w).getValues();
  TIM_.n = n; tim_('read Answers', t0, n, w);  // v130: the Timings tab
  return w < k ? v.map(r => r.concat(new Array(k - w).fill(''))) : v;
}

// Full replay of a player's progress (v28, Pierre 2026-11-03: progress is recalculated from the whole answer log,
// automatically, never by a human click, now and whenever the progress engine changes). The engine is core.js, embedded
// at the end of this file (CORE_, kept identical by tools/sync_core.py): replayProgress over the player's rows of the
// Answers tab since their last progress reset, with the photo memory offsets and the pooled confusions of stats_ (cached)
// and the genera's look-alikes and families from data.json (gen_). RV (core.js RVS) is the rules version: every change to
// a progress rule appends one. Done in the reply to a sign-in, a load or a save whose app says it applied an older
// version (rv below CORE_.RV; an app that sends no rv cannot adopt a replay and gets none), and for a device that never
// signed in in the reply to its anonymous answers. The result is kept in the "Replayed" tab, one row per player (name,
// or "~anon <id>"): Name, Rules (rv), Rows (n, the player's rows replayed), Since (the reset time, ms), Updated, then
// the record JSON in 45,000-character chunks; it is reused while the rules, the row count and the reset are the same,
// computed again otherwise. The player's own saved copy (Progress data, RAs Data) is never rewritten here (no race
// with a device's save): the app adopts the replay and saves it itself (sync.js replayAdopt). The reply carries
// replay: {rv, n, rec, ids}: rec the replayed record per genus and '~level' (core.js replayProgress's P), ids the ids of
// the rows replayed that the app may still hold in its queue, so it does not replay again an answer the sheet already
// counted: every row from pt on (the time of the oldest answer queued on the device, sent with the request; a second of
// margin for the sheet's dates), at least the last HOLD.IDS rows (an app that sends no pt). Until Codex review #399 only
// the last HOLD.IDS, while a lost reply can leave up to 2,000 answers already logged in the device's queue.
// Cost per player: the Answers tab is read once per request anyway (hold_), the replay of a few hundred rows takes
// milliseconds, data.json is fetched once every 6 hours (cached), stats_ is the cached ?stats=1 computation.
const RPL = {TAB: 'Replayed', HEAD: ['Name', 'Rules', 'Rows', 'Since', 'Updated', 'Record']};
// The genera's look-alikes and families (data.json gen and x.gen, as the app's GX), what the replay's look-alike test
// needs: from GitHub main, cached 6 hours. null when it cannot be read (no replay then; the app keeps its own).
function gen_(){
  const hit = CacheService.getScriptCache().get('gen1');
  return hit ? JSON.parse(hit) : dataJson_().gen;
}
// The slate (v42, core.js slateOf over data.json: what the app's progress % and Learned count), cached with gen_.
function slate_(){
  const hit = CacheService.getScriptCache().get('slate1');
  return hit ? JSON.parse(hit) : dataJson_().slate;
}
// Lines for the app's cards (v87; Pierre, 2026-11-05, Q109: a card may name a player, a name never written in the repo):
// the Notes tab (Key, Text), rows whose key starts with card., served as notes: {key: text} with every load and save
// reply (sync.js NOTES_KEY; core.js RV_SORRY ps: card.rv8.ps, the PS of rules version 9's apology). The tab is
// Pierre's: made by hand, read only here; none, an empty object.
function notes_(){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Notes'), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => {
    const k = String(r[0] || '').trim();
    if (/^card\.[\w.-]{1,60}$/.test(k)) out[k] = String(r[1] || '').slice(0, 300);
  });
  return out;
}
function dataJson_(){
  const c = CacheService.getScriptCache(), none = {gen: null, slate: null};
  let d;
  try {
    const r = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + REPO + '/main/data.json', {muteHttpExceptions: true});
    if (!r || r.getResponseCode() !== 200) return none;
    d = JSON.parse(r.getContentText());
  } catch (e) { return none; }
  const out = {}, slate = CORE_.slateOf(d);
  [d.gen || {}, (d.x || {}).gen || {}].forEach(G => Object.keys(G).forEach(n => {
    if (!out[n]) out[n] = {look: (G[n].look || []).filter(x => typeof x === 'string'), fam: String(G[n].fam || '')};
  }));
  if (!Object.keys(out).length) return none;
  try { c.put('gen1', JSON.stringify(out), 21600); c.put('slate1', JSON.stringify(slate), 21600); } catch (e) {}
  return {gen: out, slate: slate.length ? slate : null};
}
// An Answers row as a replay row (core.js replayProgress): [player, time ms, shown, answered, right, mode, photos, e, th,
// new photos, choices, null, seconds, null ... null, scoring at 22]; blank numbers are null (answers before v5; seconds before
// v23). v32: the seconds (at 12, as in readAnswers rows) weigh a right answer's ability steps in the replay as in the app
// (core.js rtWeight). v61: the scoring record (at 22, core.js LOG_SC, as in readAnswers rows; null before it): the replay scores the
// answer with what the app scored it with (core.js scoreAnswer).
const numOrNull_ = x => x === '' || x == null || !isFinite(Number(x)) ? null : Number(x);
const rowOf_ = (who, r) => [who, new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6]), numOrNull_(r[8]), numOrNull_(r[9]), numOrNull_(r[10]), String(r[11] || ''), null, numOrNull_(r[12]), ...new Array(CORE_.LOG_SC - 13).fill(null), CORE_.scoreRec(r[SC_COL])];
// start: the player's first-launch answer (the app's reefid-sync-coral-start record; v36): the replay steps the ability
// with the prior it says, as the app does (core.js startPriorAt).
// sid: the subject replayed, the corals by default (replays_ for the others: their own rows, units and tab, and no
// photo memory offsets, pooled confusions, format or genus offsets, which stats_ computes for the corals only: an answer
// logged with its scoring record, as every fish answer is, replays as the game scored it).
// v127: no floor any more (Pierre, 2026-11-09, Q330: the log is the only reference, a bar may go down); until then the
// fish replay was floored here against the account's saved bars at its first replay (kept as {P: record, F: reference},
// which rplRec_ still reads).
function replay_(key, since, appRv, pt, start, sid){
  const main = !sid || sid === CORE_.replaySubject(), top = rplTop_(sid);  // its own rules versions (core.js rvOf)
  if (typeof appRv !== 'number' || !isFinite(appRv) || appRv >= top) return null;
  const who = lc_(key), mine = rplMine_(key, since, sid);
  const n = mine.length;
  const byTime = mine.map(r => [new Date(r[1]).getTime() || 0, String(r[7])]).sort((a, b) => a[0] - b[0]);
  const from = typeof pt === 'number' && isFinite(pt) ? pt - 1000 : Infinity;
  const ids = byTime.filter((r, i) => i >= byTime.length - HOLD.IDS || r[0] >= from).map(r => r[1]);
  // The cache's identity: the reset time, and the fingerprint of the first-launch history the replay applies (a replay
  // made with another history is not reused; Codex review #428). Without a history: the reset time alone, as before.
  const fp = CORE_.startFp(start), sinceKey = rplSince_(since, start);
  const sh = sheet_(main ? RPL.TAB : rplTab_(sid), RPL.HEAD), at = find_(sh, key);
  if (at) {
    const row = sh.getRange(at, 1, 1, sh.getLastColumn()).getValues()[0], prev = rplRead_(row);
    // Never reused for a player whose key is a member every plain object inherits ("constructor", "__proto__": lc_ keeps
    // no other): core.js replayProgress before v117 read that member as their record and replayed none of their answers
    // (Codex review #812), so a record kept for them may be wrong; made again instead, the same for every other player.
    if (prev && !(who in Object.prototype) && rplFresh_(row, top, n, sinceKey)) return {rv: top, n: n, rec: rplRec_(prev.o), ids: ids, fp: fp};
  }
  const made = rplMake_(who, mine, since, start, sid);
  if (!made) return null;
  rplPut_(sh, at, key, top, n, fp ? sinceKey : since, made.rec);
  return {rv: top, n: n, rec: made.rec, ids: ids, fp: fp};  // fp: the first-launch history it applied (the app checks it)
}
// The pieces of replay_, shared with the leaderboard (board_, boardWarm_; v118). A subject's last rules version (core.js
// rvOf: the corals' RVS, another subject's SUBJECTS replayed rvs).
const rplTop_ = sid => CORE_.rvOf(!sid ? CORE_.replaySubject() : sid);
// The cache's identity of a replay: the reset time, with the first-launch history's fingerprint when there is one.
const rplSince_ = (since, start) => (fp => (fp ? since + '#' + fp : String(since)))(CORE_.startFp(start));
// The player's rows of the subject replayed since their reset (the Answers tab as read once per request).
function rplMine_(key, since, sid){
  const main = !sid || sid === CORE_.replaySubject(), who = lc_(key);
  return (main ? answerRows_() : subjRows_(sid)).filter(r => lc_(r[0]) === who && (new Date(r[1]).getTime() || 0) > since);
}
// A row of a Replayed tab read: its rules version, reset time, record kept ({P, F} for one floored before v127); null when broken.
function rplRead_(row){
  try { return {rv: Number(row[1]), since: String(row[3]).split('#')[0], o: JSON.parse(row.slice(5).map(String).join('') || '{}')}; } catch (e) { return null; }
}
// Reused while the rules, the row count and the reset are the same.
const rplFresh_ = (row, top, n, sinceKey) => Number(row[1]) === top && Number(row[2]) === n && String(row[3]) === sinceKey;
// The replayed record of a record kept (one floored before v127 kept {P: record, F: reference}).
const rplRec_ = o => (o && o.P && o.F ? o.P : o);
// The replay itself (core.js replayProgress) over the player's rows (mine). {rec}, null without the units (gen_,
// subjGen_: fetched when not cached, so never under the script lock for the leaderboard).
function rplMake_(who, mine, since, start, sid){
  const main = !sid || sid === CORE_.replaySubject(), rows = mine.map(r => rowOf_(who, r));
  const gen = main ? gen_() : subjGen_(sid);
  if (!gen) return null;
  const st = main ? stats_() : {}, rep = CORE_.replayProgress(rows, {gen: gen, mem: st.mem, conf: st.conf, fmt: st.fmt || {}, gd: st.gd, starts: start ? {[who]: start} : {}})[who];
  return {rec: rep ? rep.P : {}};
}
// Writes the record at row at (0: a new row) of tab sh, in CHUNK-character parts.
function rplPut_(sh, at, key, top, n, sinceCell, rec){
  const json = JSON.stringify(rec), parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(safe_(json.slice(i, i + CHUNK)));
  const r = at || sh.getLastRow() + 1, old = at ? sh.getLastColumn() : 0, out = [safe_(key), top, n, sinceCell, new Date()].concat(parts);
  while (out.length < old) out.push('');  // chunks left over from a longer record
  sh.getRange(r, 1, 1, out.length).setValues([out]);
}

// The replays of the other subjects the sheet replays (core.js replayedSubjects: fish; Pierre, 2026-11-08), each
// asked by the app with the rules version it applied to that subject (rvs: {subject: rv}; an app that sends none gets
// none, as before), each since that subject's own progress reset with its own first-launch answer: from the player's
// data (signed in), or the device's (alt: {reset: {subject: ISO time}, start: {subject: record}}, an anonymous send).
// Under a script lock of its own (held: the caller holds it already, anon_). Returns {subject: {rv, n, rec, ids, fp}}
// or null when none was replayed; a subject that fails is left out (the app keeps its own and asks again).
function replays_(key, data, rvs, pt, alt, held){
  const ask = CORE_.replayedSubjects().filter(id => rvs && typeof rvs === 'object' && typeof rvs[id] === 'number' && isFinite(rvs[id]) && rvs[id] < CORE_.rvOf(id));
  if (!ask.length) return null;
  const lock = held ? null : LockService.getScriptLock(), out = {};
  if (lock && !lock.tryLock(10000)) return null;
  try {
    ask.forEach(id => {
      try {
        const o = alt ? (x => (x && typeof x === 'object' ? x[id] : undefined)) : null,
          since = alt ? resetAt_(o(alt.reset)) : resetOf_(data, id),
          st = alt ? o(alt.start) : startOf_(data, id),
          rp = replay_(key, since, rvs[id], typeof pt === 'number' ? pt : NaN, st && typeof st === 'object' ? st : null, id);
        if (rp) out[id] = rp;
      } catch (err) {}
    });
  } finally { if (lock) lock.releaseLock(); }
  return Object.keys(out).length ? out : null;
}
// The tab keeping another subject's replay records: "Replayed Fish", as RPL.TAB keeps the corals'.
const rplTab_ = sid => RPL.TAB + ' ' + CORE_.subjectOf(sid).name;
// Every tab of replay records, the corals' first: an account deleted, merged, archived or a device claimed drops its rows
// in each (rplDrop_).
const rplTabs_ = () => [RPL.TAB].concat(CORE_.replayedSubjects().map(rplTab_));
function rplDrop_(name){ return rplTabs_().reduce((n, t) => n + dropRows_(t, name), 0); }
// The units another subject's replay reads (core.js replayProgress gen: look-alikes and family lines): for fish, core.js
// fishReplayGen over fish.json from GitHub main (the pool's first file, SUBJECTS pool), cached 6 hours as data.json is.
// null when it cannot be read (no replay then; the app keeps its own).
function subjGen_(sid){
  const S = CORE_.subjectOf(sid), c = CacheService.getScriptCache(), k = 'sgen1:' + S.id, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  if (!(S.replayed && typeof S.replayed.gen === 'function')) return null;
  const file = ((S.pool || {}).files || [])[0];
  let d;
  try {
    const r = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + REPO + '/main/' + file, {muteHttpExceptions: true});
    if (!r || r.getResponseCode() !== 200) return null;
    d = JSON.parse(r.getContentText());
  } catch (e) { return null; }
  const gen = S.replayed.gen(d);
  if (!gen || !Object.keys(gen).length) return null;
  try { c.put(k, JSON.stringify(gen), 21600); } catch (e) {}
  return gen;
}

// Anonymous id of an RA: the same for the same name, no name in it. Its salt is secret (Script Properties, made on first
// use), so nobody can rebuild ids from a list of names; the admin learns its own id with ?answers=1&name=…&pin=… (v6).
function anonSalt_(){
  const pr = PropertiesService.getScriptProperties(); let s = pr.getProperty('ANON_SALT');
  if (!s) { s = Utilities.getUuid(); pr.setProperty('ANON_SALT', s); }
  return s;
}
function aid_(name, salt){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, (salt || anonSalt_()) + '|anon|' + String(name).trim().toLowerCase(), Utilities.Charset.UTF_8)).slice(0, 8);
}

// The anonymous column of readAnswers (index 11): 1 a device that never signed in ("~anon <id>"), 2 (v55) the answers an
// account deleted without its answers left behind ("~deleted <id>"): used only in the pooled photo statistics, never as a
// player (Pierre, 2026-11-05, Q86); 0 a signed-in player. Readers that test it for truthy still see both as no name.
// v58: an archived record's answers are flagged 2 too (arch: archivedSet_), as a deleted account's.
const anonFlag_ = (w, arch) => (String(w).indexOf('~anon ') === 0 ? 1 : String(w).indexOf('~deleted ') === 0 || (arch && arch.has(lc_(w))) ? 2 : 0);
// {ok, rows: [[id, time ms, genus shown, answered, right 0|1, mode, photos, expected, ability, new photos, choices, anonymous 0|1|2,
//   seconds, enlarged 0|1, UTC offset, typed, retyped right, subject, rank, taxon shown, taxon answered, species shown, scoring]], players:
//   {id: [learned, seen, total, {genus: ability}]}}. v59: the typed text (index 15, '' when none) and the spelling step (16, null
//   when none was asked), served from v60 so the indexes match the tab's columns. v60: the subject (index 17, core.js LOG_SUBJ: the default subject's id, coral, in the rows
//   logged before), the rank asked (the subject's rank when the row has none), the names at that rank and the species
//   shown ('' when none); a reader of one subject keeps its rows (core.js subjRows), so a fish answer never counts in a
//   coral result. v61: the scoring record (index 22, core.js LOG_SC: scoreRec, null before it). Expected/ability/new photos are null
//   on answers before v5; choices (the genera offered, space-separated) is '' on answers before v10; seconds and enlarged
//   (v23, at the end so the indexes before them never move) are null on answers before v23; the UTC offset (v44, minutes
//   east of UTC on the player's device; +480 in the rows logged before v44, the one-shot tz) is null only when an app
//   sent none; the scoring record (v61, core.js scoreRec, an object) is null before v61.
function answers_(q){
  // v55: the roster read before the answers (Codex review #600): a removal while they are read leaves the report stale.
  const ss = SpreadsheetApp.getActiveSpreadsheet(), out = {ok: true, rows: [], players: {}, roster: rosterAt_()}, sh = ss.getSheetByName('Answers'), ra = ss.getSheetByName('RAs');
  const salt = anonSalt_(), ids = Object.create(null), id = n => ids[n] = ids[n] || aid_(n, salt), arch = archivedSet_();  // v119: by name, no prototype (a player named constructor)
  out.excluded = [...sxSet_()];  // v115: the ids left out of the statistics (sxSet_), for the Analyses report and the admin
  // me: the caller's own id, only with its name and right code (the admin page marks "you").
  const {name, pin} = clean_(q || {});
  if (name && /^\d{4}$/.test(pin) && ra && !blocked_(name)) {
    const r = find_(ra, name), h = hash_(name, pin), row = r ? ra.getRange(r, 1, 1, HEAD.length).getValues()[0] : null;
    if (row && row[6] === h) {
      out.me = id(name);
      if (!archived_(row) && adminAcct_() !== h) try { adminClaim_(name, h); } catch (e) {}  // v125: the admin's account (adminAcct_)
    } else if (r) failed_(name);
  }
  const big = Object.create(null); const dt = ss.getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { big[String(r[0]).toLowerCase()] = r.slice(2).map(String).join(''); });
  // v98: a surprise card's answer (core.js winkRow) is served to no reader: the admin's pages and analyses never count it.
  if (sh && sh.getLastRow() > 1) out.rows = logRows_(sh, LOG.length).filter(r => r[0] && !CORE_.winkRow(r)).map(r => answerOut_(r, id, arch));
  if (ra && ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, 8).getValues().filter(r => r[0] && !arch.has(lc_(r[0])))  // v58: no archive
    .forEach(r => out.players[id(r[0])] = [Number(r[2]) || 0, Number(r[3]) || 0, Number(r[4]) || 0, abilities_(big[String(r[0]).toLowerCase()] || r[7])]);
  return out;
}
// One Answers row as readAnswers serves it (above): id, the player's admin id (aid_, memoised by the caller); arch, the
// archived names (anonFlag_). Also the rows of the admin's light read (live_), so both read alike.
function answerOut_(r, id, arch){
  const sj = CORE_.rowSubject(r);
  return [id(r[0]), new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6])]
    .concat([8, 9, 10].map(i => r[i] === '' ? null : Number(r[i])), [String(r[11] || ''), anonFlag_(r[0], arch)],
      [12, 13, 14].map(i => r[i] === '' || r[i] == null ? null : Number(r[i])), [String(r[15] || ''), r[16] === '' || r[16] == null ? null : Number(r[16])],
      [sj, String(r[18] || '') || (CORE_.SUBJECTS.find(S => S.id === sj) || {}).rank || '', String(r[19] || ''), String(r[20] || ''), String(r[21] || '')], [CORE_.scoreRec(r[SC_COL])]);
}
// The admin's light read (v110, Pierre 2026-11-08: "Les deux", a live Players › Activity): POST {readLive: 1, token} →
// {ok, rows, last, n, k, roster}, re-read every minute while that page is open and in view (admin.js liveRead), where readAnswers
// sends the whole tab. rows: the Answers tab's last LIVE_N rows with a player, as readAnswers serves them (answerOut_),
// in the tab's order, a surprise card's left out (core.js winkRow). last: {admin id (aid_): time ms of the player's last
// answer}, every player and device not signed in with one, a deleted account's answers and an archive's left out
// (anonFlag_ 2, as no reader counts them as a player), read from the Activity tab (one row per player, its QUERY's max
// time) while it holds the script's formula, else from the Name, Time and Mode columns. n: the tab's answer rows (from
// row 2), k: how many of the last were read (the window). roster: when an account last left normal operation
// (rosterAt_, as readAnswers sends it), so the admin reads the whole log again after a delete, merge or archive. Admins only (isAdmin_, whose answer is kept 10 minutes, so a read every minute asks GitHub once in ten). A
// read only, as readAnswers: no script lock, nothing written, so it never makes a save or an anonymous send wait.
const LIVE_N = 50;
function live_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Answers'), out = {ok: true, rows: [], last: {}, n: 0, k: 0, roster: rosterAt_()};
  if (!sh || sh.getLastRow() < 2) return out;
  const salt = anonSalt_(), ids = Object.create(null), id = n => ids[n] = ids[n] || aid_(n, salt), arch = archivedSet_();  // v119: by name, no prototype (a player named constructor)
  const n = out.n = sh.getLastRow() - 1, k = out.k = Math.min(n, LIVE_N), w = sh.getMaxColumns ? Math.min(LOG.length, sh.getMaxColumns()) : LOG.length;
  out.rows = sh.getRange(n - k + 2, 1, k, w).getValues().map(r => w < LOG.length ? r.concat(new Array(LOG.length - w).fill('')) : r)
    .filter(r => r[0] && !CORE_.winkRow(r)).map(r => answerOut_(r, id, arch));
  const act = ss.getSheetByName('Activity'), f = act ? act.getRange(1, 1).getFormula() : '';
  const L = act && act.getLastRow() > 1 && (f === ACTIVITY || f === ACTIVITY_V1)  // V1: from before the first surprise card, none to leave out
    ? act.getRange(2, 1, act.getLastRow() - 1, 4).getValues().map(r => [r[0], r[3]])
    : sh.getRange(2, 1, n, 6).getValues().filter(r => r[0] && !CORE_.winkRow(r)).map(r => [r[0], r[1]]);
  L.forEach(([nm, t]) => {
    if (!nm || anonFlag_(nm, arch) === 2) return;
    const i = id(nm), ms = new Date(t).getTime() || 0;
    if (ms > (out.last[i] || 0)) out.last[i] = ms;
  });
  return out;
}
// Per-genus ability (th) from an RA's saved progress, nothing else from it.
function abilities_(data){
  const out = {};
  try { const P = JSON.parse(dataKey_(JSON.parse(data || '{}'), 'progress') || '{}'); Object.keys(P).forEach(g => { if (typeof P[g].th === 'number') out[g] = P[g].th; }); } catch (e) {}
  return out;
}

// Elo over the Answers tab, oldest first. Each answer: P(right) = g + (1 - g) * sigmoid(ability - difficulty), with
// g = 1/choices (4 in the quiz, 2 in a duel), ability = the RA's, difficulty = mean of the photos shown, +0.5 when a
// single view was shown alone (harder than the same photo with the other views), plus the genus offset (v31), minus the player's photo memory (MEM,
// v26). Ratings move by K * (result - P(right)), K shrinking as a photo or an RA gathers answers. Returns {ok, photos:
// {file: [difficulty, answers, right]}, ras: {anonymous id: [ability, answers]}, conf: {"A|B": [offered, mixed up]},
// mem: [offsets by memory bucket], memn: [trusted answers in each], gd: {genus: [offset, weighed answers]}}. Difficulty
// 0 = average photo, met for the first time; +1 = clearly harder.
// v31 (Pierre, 2026-11-03): hierarchical photo Elo, the player rule "global level + genus" applied to the photos. A
// photo's difficulty = its genus's offset (G, every photo of the genus shown shares it: one colony per question) + its
// own residual (P), both moved by each trusted answer's surprise: P as before, G by GENUS_K / (1 + its weighed answers
// / 10). photos serves the total (G + P), so the app reads it as before; gd the offsets, the prior of a photo nobody
// has answered yet (model.js photoDiff). The Easy / Medium / Hard prior it replaces predicted the answers worse than no
// prior at all (docs/LEARNING.md "Hierarchical photo Elo", with the replay that set GENUS_K).
// conf (v10): per pair of genera (A before B alphabetically), how often one was shown with the other among the choices, and how often the other was answered; only answers that logged their choices (v10) count.
// The app turns it into confusion scores (core.js confScore) to pick the look-alike traps; core.js confusionOf counts the same.
// admin.js eloOf replays the same rules in the browser (photo Elo with or without the author's answers): keep both in step.
// Who rates the photos and the confusions (v17, Pierre 2026-11-02, after 17 anonymous "players" turned out to be test
// runs; v18: devices that never signed in too, under the same rule, now that it tells real players from bots and random
// clicking, Pierre): players whose answers show they really play: TRUST.N answers or more, right clearly above chance (one-sided z of at
// least TRUST.Z against each question's guess rate). Bots and random clicking stay out; nobody's own progress, level or
// leaderboard place changes. core.js trustOf replays the same rule for the admin: keep both in step.
// N is per player, not per photo: a photo counts from its first answer (Pierre kept 10, 2026-11-02).
const TRUST = {N: 10, Z: 1.645};
// How much one answer moves the photos (v17, Pierre 2026-11-02): a player's answers weigh n / (n + PHOTO_W.N) after n
// answers (Glicko's idea: a player whose level is still uncertain moves the items little; a beginner answering at
// random at first counts more and more as their level settles). Every answer counts, repeats too, but against what the
// player is expected to remember of that photo (Duolingo half-life regression and PFA: the item's difficulty is fitted
// beside the player's own history with it): v17-v25 a fixed rule, a photo new to the player PHOTO_W.NEW harder, one
// they already got right twice PHOTO_W.KNOWN easier; from v26 the prior of the estimated photo memory (MEM).
// N 10 (was 30; v18, Pierre, same reason): the 10th answer weighs 0.5, the 30th 0.75 (were 0.25 and 0.5).
const PHOTO_W = {N: 10, NEW: 0.5, KNOWN: -1};
// Photo memory (v26, Pierre 2026-11-03: in a genus with few photos the same ones come back, players learn the photos
// rather than the genus, and that skewed the photo difficulty and the player's progress). An answer on a photo is
// expected easier by an offset (logits off its difficulty) from the player's own history with that photo, [shown,
// right]: bucket 0 new (the reference, 0: a photo's rating is what a player meets on it the first time), 1 shown never
// right, 2 right once, 3 right twice or more; a question with several photos takes the mean of its photos' offsets.
// Buckets 1-3 are rated in the replay itself, on the trusted answers weighed as for the photos: after each answer each
// one its photos fall in moves by the surprise over the information gathered so far plus the prior's (a Newton step on
// the log-likelihood, as Glicko moves a rating by what it learns over how sure it is). Prior: the old rule as offsets
// from a new photo (0, -0.5, -0.5, -1.5), weighing MEM.N answers at the game's usual chance (80%, 4 choices). Served by
// ?stats=1 (mem; memn the answers behind each bucket); the app (model.js) expects every question with them.
// core.js MEM, memBucket, memFam and eloReplay are the same: keep them in step (tests/core.test.js compares them).
const MEM = {N: 10, PRIOR: [0, -PHOTO_W.NEW, -PHOTO_W.NEW, PHOTO_W.KNOWN - PHOTO_W.NEW]};
const memBucket_ = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3);
const memFam_ = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[memBucket_(h)], 0) / hs.length : 0);
// Fisher information of one answer at ability - difficulty x with k choices (the prior's weight: MEM.N at x 1, k 4).
function infoAt_(x, k){ const s = 1 / (1 + Math.exp(-x)), p = 1 / k + (1 - 1 / k) * s; return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p)); }
// Every player starts as a beginner, not an average player (Pierre, 2026-11-02: the RAs play from the first day of
// their course, others know even less): level PLAYER0 = -1, i.e. about 45% right on a photo of average difficulty with
// 4 choices. Starting at 0 (average), a beginner's misses made the photos look harder than they are.
const PLAYER0 = -1;
// v31: how fast a genus's offset moves (core.js GENUS_K, in step): 0.2-0.4 beat the photo-only Elo on the real answer
// log, 0.8 is too fast (docs/LEARNING.md "Hierarchical photo Elo").
const GENUS_K = 0.4;
// v20: a photo-quiz question logged without its number of choices but with fewer than 4 in the Choices column (the
// "Again: A or B?" question after a mix-up, logged plain "quiz" until 2026-11-02) is rated with its real guess rate,
// 1 / choices (Pierre: correct the existing data too; nothing in the sheet is rewritten). core.js guessOf in step.
// v27: a typed answer (|t: the player types the genus, nothing to pick from) has no guess rate, 0 (core.js guessOf).
const guess_ = (mode, choices) => {
  if (/\|t(\||$)/.test(mode)) return 0;
  const kq = /\|k(\d)$/.exec(mode); if (kq) return 1 / Number(kq[1]);
  if (mode.indexOf('quiz-duel') === 0) return 0.5;
  const n = String(choices || '').split(/\s+/).filter(Boolean).length;
  return n >= 2 && n < 4 ? 1 / n : 0.25;
};
// A player's trust counters [answers, right, sum of guess rates, sum of their variances], one answer added (vNEXT: kept
// per player in the pooled stats' snapshot, statsFold_), and whether they make the player trusted (TRUST).
const trustAdd_ = (t, ok, g) => { t[0]++; t[1] += ok; t[2] += g; t[3] += g * (1 - g); return t; };
const trustOk_ = t => !!t && t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z;
function trusted_(rows){  // rows: [who, right 0|1, mode, anonymous, choices]
  const T = Object.create(null), out = Object.create(null);  // v115: keyed by names, no inherited entry
  rows.forEach(([w, ok, m, an, ch]) => trustAdd_(T[w] = T[w] || [0, 0, 0, 0, an], ok, guess_(m, ch)));
  Object.keys(T).forEach(w => { out[w] = trustOk_(T[w]); });
  return out;
}
// vNEXT: the pooled stats as a fold, one answer at a time, so the whole log (stats_) and a few new rows at a time
// (statsFold_) run the very same steps. An answer as the fold reads it (a "mini row"): [tab row, time ms, player key,
// unit shown, answered, right 0|1, mode, photos, logged expectation (null when none), choices]. The player key is the
// lower-case name in stats_, the admin's anonymous id (aid_) in the snapshot, which never holds a name (rule D2).
const tOf_ = r => new Date(r[1]).getTime() || 0;  // an unreadable time sorts first (it compared as NaN before vNEXT)
const statsMini_ = (r, row, w) => [row, tOf_(r), w, String(r[2] || ''), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6]), numOrNull_(r[8]), String(r[11] || '')];
// Oldest first, the tab's order between equal times (the stable sort of stats_ before vNEXT).
const statsOrder_ = (a, b) => a[1] - b[1] || a[0] - b[0];
const nul_ = () => Object.create(null);
// An empty fold. at: when its last run started; dirty: the mark of the last rewrite of the log it saw (statsDirty_);
// roster, sx: the roster time (rosterAt_) and the ids left out of the
// statistics (sxSet_) it is built with; cause: why it was (re)built, built: when; why: the same until it is caught up,
// then ''; runs: the runs since.
function statsNew_(roster, sx, at, why){
  return {f: STATS.FMT, v: VERSION, at: at, dirty: '', built: at, cause: why, why: why, runs: 0, roster: roster, sx: sx, c: 0, id: '', h: null, pf: '',
    T: nul_(), U: nul_(), P: nul_(), PG: nul_(), G: nul_(), R: nul_(), H: nul_(), conf: nul_(), mem: MEM.PRIOR.slice(), I: [0, 0, 0, 0], N: [0, 0, 0, 0],
    skip: {excluded: 0, photos: 0}, L: nul_(), pend: []};
}
// One answer folded into S (m: a mini row, in time order). tr: its player rates the photos (trusted, not left out);
// ex: its player is left out of the statistics; idx: the game photos (photoIdx_). The rules are stats_'s (above):
// confusions and format points from trusted players, the hierarchical photo Elo with the photo memory, the player's
// ability. The photo memory is kept per player and photo as its bucket (memBucket_), all the rule reads of [shown, right].
function statsStep_(S, m, tr, ex, idx){
  const w = m[2], sg = m[3], sa = m[4], ok = m[5], mode = m[6], fs = m[7].split(/\s+/).filter(Boolean), ch = m[9];
  if (tr) ch.split(/\s+/).filter(x => x && x !== sg).forEach(x => { const k = sg < x ? sg + '|' + x : x + '|' + sg, c = S.conf[k] = S.conf[k] || [0, 0]; c[0]++; if (!ok && sa === x) c[1]++; });
  // v77: each question format's offset is fitted on the trusted answers' points (core.js fmtPoint, fmtFit).
  if (tr && sg) { const p = CORE_.fmtPoint(mode, m[8], ch, ok); if (p) (S.L[p[0]] = S.L[p[0]] || []).push(p.slice(1)); }
  if (ex) S.skip.excluded++;
  if (!fs.length) return;
  let pk = true;
  try { pk = !tr || photoCheck_(idx, CORE_.replaySubject(), sg, fs) !== 'other'; } catch (e) {}  // a check that fails flags nothing
  if (!pk) S.skip.photos++;
  const P = S.P, PG = S.PG, sig = x => 1 / (1 + Math.exp(-x)), g = guess_(mode, ch), ra = S.R[w] = S.R[w] || [PLAYER0, 0];
  // v115 (review of #801): only an answer that rates (rt) makes a genus offset and gives its photos their genus (PG,
  // the served difficulty's offset); any other names a photo's genus only while no rating answer has (a photo nobody
  // rated, served at weight 0), so a left-out or flagged answer moves no photo difficulty and adds no offset.
  const rt = tr && pk, go = rt ? (S.G[sg] = S.G[sg] || [0, 0]) : S.G[sg] || [0, 0];  // v31: the genus offset, shared by the photos of the genus
  const ph = fs.map(f => ((rt || !(f in PG)) && (PG[f] = sg), P[f] = P[f] || [0, 0, 0, 0])), b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);  // one view alone is harder (app.js PICKD.SINGLE)
  // One expectation for the photos and the player, with the player's memory of these photos (v26).
  const Hw = S.H[w] = S.H[w] || nul_(), hb = fs.map(f => Hw[f] || 0), mem = S.mem;
  const s = sig(ra[0] - b - hb.reduce((t, k) => t + mem[k], 0) / hb.length), e = g + (1 - g) * s, d = ok - e, n = ra[1];
  // The photos and the memory offsets move on trusted players' answers, weighed by their experience.
  if (rt) {
    const wt = n / (n + PHOTO_W.N), D = (1 - g) * s * (1 - s), v = Math.max(1e-6, e * (1 - e)), A = [0, 0, 0, 0], tau = MEM.N * infoAt_(1, 4);
    // Counts are weighed too: they damp later steps and tell the app how sure the rating is (photoDiff).
    ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d * wt; p[2] += wt; p[1] += ok * wt; p[3]++; });
    go[0] -= GENUS_K / (1 + go[1] / 10) * d * wt; go[1] += wt;
    hb.forEach(k => A[k] += 1 / hb.length);
    for (let j = 1; j < 4; j++) if (A[j]) { S.I[j] += wt * (D * A[j]) ** 2 / v; mem[j] -= wt * d * D * A[j] / v / (tau + S.I[j]); S.N[j] += A[j]; }
    S.N[0] += A[0];
  }
  ra[0] += 0.6 / (1 + n / 40) * d; ra[1]++;
  // [shown, right] as its bucket: new 0, shown never right 1, right once 2, right twice or more 3 (each photo shown, in turn).
  fs.forEach(f => { const k = Hw[f] || 0; Hw[f] = ok ? (k >= 2 ? 3 : 2) : k || 1; });
}
// What a fold serves: {ok, photos: {file: [difficulty, weighed answers, weighed right, answers]}, conf, mem, memn, gd,
// fmt}, the public ?stats=1 reply (stats_ adds ras and skip for the admin).
// [difficulty, weighed answers, weighed right, answers]: the 4th (v18) is the plain count of the answers that rated the
// photo, for the admin's filters (Pierre, 2026-11-02: a photo answered once weighs under 1 and "≥1" hid it).
// v31: the difficulty served is the photo's total, its genus's offset + its residual; gd the offsets.
function statsOut_(S){
  const out = {ok: true, photos: nul_(), conf: S.conf, mem: S.mem.map(x => Math.round(x * 100) / 100), memn: S.N.map(x => Math.round(x * 10) / 10), gd: nul_(), fmt: CORE_.fmtFit(S.L)};
  Object.keys(S.P).forEach(f => { const p = S.P[f]; out.photos[f] = [Math.round(((S.G[S.PG[f]] || [0])[0] + p[0]) * 100) / 100, Math.round(p[2] * 10) / 10, Math.round(p[1] * 10) / 10, p[3]]; });
  Object.keys(S.G).forEach(n => out.gd[n] = [Math.round(S.G[n][0] * 100) / 100, Math.round(S.G[n][1] * 10) / 10]);
  return out;
}
// read (v115): true where no script lock is held (the public stats, readStats): the game pools are read from GitHub
// when not cached (pools_); otherwise (a replay under the lock) only the cached pools are used, so nothing is fetched
// under the lock (the pools are warmed by the public stats every app asks for, and by the admin's player list).
// The stats are cached with chk: 1 once their photos were checked against every subject's pool (a read, or every pool
// cached); stats made under the lock with a pool not cached yet are cached with chk: 0, which a read never takes: it
// reads the pools and makes them again (Codex review #801), and a replay under the lock takes them as they are.
// vNEXT: the whole log folded in one go (statsStep_, statsOut_); the public ?stats=1 is served from the snapshot the
// trigger folds a few rows at a time (statsServed_, statsFold_) and comes here only while there is none.
function stats_(read){
  const cache = CacheService.getScriptCache(), hit = cache.get('stats17');
  if (hit) { const v = JSON.parse(hit); if (!read || v.chk) return v; }
  const t0 = Date.now();  // v130: a build is timed (the Timings tab), its read of the Answers tab apart
  // v115 (review of #801): every map keyed by a photo, unit or name has no prototype (Object.create(null)), so an id
  // such as constructor or __proto__ logged before word_ refused them is an entry like any other, never an inherited one.
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), out = {ok: true, photos: nul_(), ras: {}, conf: nul_(), mem: MEM.PRIOR.slice(), memn: [0, 0, 0, 0], gd: nul_(), fmt: {}};
  if (!sh || sh.getLastRow() < 2) return out;
  // One player whatever the capitalisation of the name (find_ and hash_ match names case-blind; aid_ lowercases too).
  const rows = answerRows_().filter(r => r[0]), M = rows.map((r, i) => statsMini_(r, i, lc_(r[0]))).sort(statsOrder_);
  const trust = trusted_(M.map(m => [m[2], m[5], m[6], m[2].indexOf('~anon ') === 0, m[9]]));
  // v115: the players and devices the admin left out of the statistics (sxSet_) count as untrusted: they rate nothing.
  const salt = anonSalt_(), sx = sxSet_(), EX = nul_(), isEx = w => sx.size > 0 && (w in EX ? EX[w] : (EX[w] = sx.has(aid_(w, salt))));
  Object.keys(trust).forEach(w => { if (trust[w] && isEx(w)) trust[w] = false; });
  // v115: an answer whose photos are of another unit (photoCheck_ 'other') rates no photo and no photo memory.
  const idx = (() => { try { return photoIdx_(read ? undefined : true); } catch (e) { return null; } })();  // every subject's; fetched only when read
  out.chk = read || (idx && idx.n >= CORE_.SUBJECTS.filter(S => S.pool).length) ? 1 : 0;  // a pool missing under the lock: 0
  const S = statsNew_(0, [], t0, '');
  M.forEach(m => statsStep_(S, m, !!trust[m[2]], isEx(m[2]), idx));
  const o = statsOut_(S);
  ['photos', 'conf', 'mem', 'memn', 'gd', 'fmt'].forEach(k => { out[k] = o[k]; });
  out.skip = S.skip;
  // v55: the answers a deleted account left ("~deleted <id>") rate the photos, never a player: no ability for them.
  const arch = archivedSet_();  // v58: an archive's answers rate the photos, never a player either
  Object.keys(S.R).forEach(n => { if (n.indexOf('~deleted ') !== 0 && !arch.has(n)) out.ras[aid_(n, salt)] = [Math.round(S.R[n][0] * 100) / 100, S.R[n][1]]; });
  try { cache.put('stats17', JSON.stringify(out), 600); } catch (err) {}  // too big for the cache: computed each time
  tim_('stats build', t0, rows.length, LOG.length);
  return out;
}

// vNEXT (Q123 j, Pierre 2026-11-14: "j first", the pooled stats built incrementally; the storage study's plan): the
// photo stats the app asks for (?stats=1) are no longer made from a read of the whole Answers tab at each request (the
// cache, 100 KB a value, would no longer hold them by December, and the read grows with the log): the 15-minute trigger
// folds the new rows into a snapshot, a few thousand at a time, and the request reads the snapshot. Corals only (the
// subject stats_ rates); fish follow in their own change.
// Exactly what stats_ makes from the whole log, run for run (tests/statsfold.test.js), which takes care: stats_ reads the
// answers oldest first by their time, not in the tab's order, decides who is trusted on each player's whole log, leaves
// out the ids sxSet_ lists and checks the photos against today's game pools. So the fold keeps two parts:
// - settled: the answers older than STATS.LAG (a day) at the run that settled them, folded once, in time order;
// - pending: the newer ones, kept as mini rows and folded again on top of the settled part at each run, for what is
//   served (they may still be overtaken by a slower device's answers, or move a player's trust).
// The fold starts again from the first row (a rebuild, in the same bounded steps, over as many runs as it takes) when
// what it settled no longer holds: an answer logged older than what is settled (a device a day late), a player with
// settled answers whose trust flips, the ids left out of the statistics changed, a game pool changed for a photo already
// folded (statsPoolFp_), the Answers tab rewritten (a sign-in's anonymous answers moved to the name, a merge, a delete, a
// one-shot migration: statsDirty_), a new script version, the snapshot missing or unreadable, the cursor's row no longer
// the one it read. Meanwhile the last snapshot is served (same version, at most STATS.AGE old), and none at all after a
// delete, merge or archive (rosterChanged_: statsDirty_ drops it), when ?stats=1 makes stats_ as before.
// The tab (STATS.TAB): row 2 the reply served (no player data: what ?stats=1 always sent), row 3 the fold (Note: when
// and why it was built), each JSON in CHUNK-character cells from column G. The fold holds, by admin id (aid_, never a
// name, rule D2), what the rules need per player: trust counters, ability, photo memory buckets, and the pending answers
// (their unit, answer, mode, photos, choices, expectation). It is internal and versioned (STATS.FMT): no other code
// reads it, and a new format rebuilds it. Rule D7: any delete, merge or archive (rosterChanged_) blanks it at once
// (statsDirty_), before the next run builds it again without the account. The cursor is mirrored in the Script Property
// STATS.PROP; the two disagreeing (a run cut between its writes) rebuild too.
const STATS = {TAB: 'Stats', HEAD: ['Part', 'Version', 'Updated', 'Rows', 'Roster', 'Note', 'Data'], FMT: 1, LAG: 864e5, ROWS: 2000, RUN_ROWS: 30000, BUDGET: 60000, UNTIL: 240000, AGE: 36e5, TTL: 1200, PROP: 'STATS_FOLD', DIRTY: 'STATS_DIRTY', ON: true};
const STATS_DATA = STATS.HEAD.length - 1;  // the first chunk's index (column G)
const statsCacheKey_ = () => 'statsS' + VERSION;
// Writes one part (row 2 served, row 3 the fold): its cells, then the JSON in CHUNK-character cells, each with a
// leading ' so Sheets keeps it as text (never a number, a date or a formula), cells left over from a longer one blanked.
function statsPut_(sh, row, meta, json){
  const out = meta.slice();
  for (let i = 0, j = 0; i < json.length; i = j) {
    j = Math.min(json.length, i + CHUNK);
    if (j < json.length && /[\ud800-\udbff]/.test(json.charAt(j - 1))) j--;  // never a character cut in two
    out.push("'" + json.slice(i, j));
  }
  const old = sh.getLastColumn();
  while (out.length < old) out.push('');
  sh.getRange(row, 1, 1, out.length).setValues([out]);
}
// One part read: {meta: its first cells, json}; null when the row is empty.
function statsGet_(sh, row){
  if (!sh || sh.getLastRow() < row) return null;
  const w = sh.getLastColumn();
  if (w <= STATS_DATA) return null;
  const v = sh.getRange(row, 1, 1, w).getValues()[0];
  return {meta: v.slice(0, STATS_DATA), json: v.slice(STATS_DATA).map(String).join('')};
}
// The fold as written (statsFold_), its maps without a prototype again; null when missing or unreadable.
function statsLoad_(sh){
  try {
    const g = statsGet_(sh, 3);
    if (!g || String(g.meta[0]) !== 'state') return null;
    const S = JSON.parse(g.json);
    if (!S || typeof S !== 'object' || !Array.isArray(S.pend) || typeof S.c !== 'number') return null;
    const re = o => { const x = nul_(); Object.keys(o || {}).forEach(k => { x[k] = o[k]; }); return x; };
    ['T', 'U', 'P', 'PG', 'G', 'R', 'H', 'conf', 'L'].forEach(k => { S[k] = re(S[k]); });
    Object.keys(S.H).forEach(w => { S.H[w] = re(S.H[w]); });
    return S;
  } catch (e) { return null; }
}
// What the photo check (photoCheck_) reads for the photos already folded: their entries in the game pools and the
// subject's parent units. A change there rebuilds (another answer may now rate a photo, or no longer).
function statsPoolFp_(S, idx){
  const sid = CORE_.replaySubject(), v = idx ? [own_(idx.up, sid) || null, Object.keys(S.P).sort().map(f => own_(idx.at, f) || 0)] : null;
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(v), Utilities.Charset.UTF_8));
}
// The Answers tab was rewritten (relabel_, dropRows_, a one-shot migration): the fold starts again at the next run.
// all (rosterChanged_: an account left normal operation, or who is left out of the statistics changed; anonDelete):
// the fold's player data is blanked now (rule D7) and the snapshot served goes too, so ?stats=1 makes stats_ until the
// fold is rebuilt.
function statsDirty_(all){
  try { PropertiesService.getScriptProperties().setProperty(STATS.DIRTY, Date.now() + ':' + Math.random()); } catch (e) {}  // a new mark each time
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STATS.TAB), w = sh ? sh.getLastColumn() : 0;
    if (all) [2, 3].forEach(r => { if (w && sh.getLastRow() >= r) sh.getRange(r, 1, 1, w).setValues([new Array(w).fill('')]); });
  } catch (e) {}
  if (all) try { CacheService.getScriptCache().remove(statsCacheKey_()); } catch (e) {}
}
// The public stats from the snapshot: cached (statsCacheKey_, in parts: cacheBigPut_), else row 2 of the tab when it
// was made by this version, at most STATS.AGE ago (the trigger runs every 15 minutes) and after the last delete, merge
// or archive (rosterAt_). null otherwise: the caller makes stats_ as before.
function statsServed_(){
  if (!STATS.ON) return null;
  const c = CacheService.getScriptCache();
  try { const hit = cacheBigGet_(c, statsCacheKey_()); if (hit) return JSON.parse(hit); } catch (e) {}
  try {
    const t0 = Date.now(), sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STATS.TAB), g = statsGet_(sh, 2);
    if (!g || String(g.meta[0]) !== 'served' || Number(g.meta[1]) !== VERSION) return null;
    if (Date.now() - (new Date(g.meta[2]).getTime() || 0) > STATS.AGE || Number(g.meta[4]) < rosterAt_()) return null;
    const o = JSON.parse(g.json);
    if (!o || typeof o !== 'object' || !o.photos) return null;
    tim_('read Stats', t0, Number(g.meta[3]) || '', '');
    try { cacheBigPut_(c, statsCacheKey_(), g.json, STATS.TTL); } catch (e) {}
    return o;
  } catch (e) { return null; }
}
// One run of the fold (the 15-minute trigger: statsFoldRun_). Reads the rows after the cursor, STATS.ROWS at a time,
// at most STATS.RUN_ROWS and STATS.BUDGET ms a run (at least one step); once it has read the whole tab it settles what
// is older than STATS.LAG, folds the rest on top and writes what is served. A run that stops before the end writes its
// progress and the next one goes on. o (tests): now (the clock the lag reads), rows, max, budget. Returns {why: why the
// fold was started again ('' when not), read, settled, pending, caught: it reached the last row, ms}.
function statsFold_(o){
  o = o || {};
  const t0 = Date.now(), now = typeof o.now === 'number' ? o.now : t0, B = o.rows || STATS.ROWS, cap = o.max || STATS.RUN_ROWS, budget = o.budget || STATS.BUDGET;
  const ss = SpreadsheetApp.getActiveSpreadsheet(), an = ss.getSheetByName('Answers'), last = an ? Math.max(0, an.getLastRow() - 1) : 0;
  const props = PropertiesService.getScriptProperties(), dirty = () => String(props.getProperty(STATS.DIRTY) || ''), mark = dirty();
  const roster = rosterAt_(), sxL = [...sxSet_()].sort(), sx = new Set(sxL);
  const idx = (() => { try { return photoIdx_(); } catch (e) { return null; } })();  // fetched when not cached: no lock held here
  const tab = sheet_(STATS.TAB, STATS.HEAD);
  let S = statsLoad_(tab), why = '';
  if (!S) why = 'missing';
  else if (S.f !== STATS.FMT || S.v !== VERSION) why = 'new version';
  else if (S.dirty !== mark) why = 'log rewritten';
  else if (S.roster < roster) why = 'account removed';
  else if (S.sx.join(' ') !== sxL.join(' ')) why = 'left out changed';
  else {
    let m = null;
    try { m = JSON.parse(props.getProperty(STATS.PROP) || 'null'); } catch (e) {}
    if (!m || m.c !== S.c || m.at !== S.at) why = 'cursor';
    else if (S.c > last || (S.c && String(an.getRange(S.c + 1, 8).getValue()) !== S.id)) why = 'rows moved';
    else if (statsPoolFp_(S, idx) !== S.pf) why = 'pools changed';
  }
  const reset = w => { why = w; return statsNew_(roster, sxL, t0, w); };
  if (why) S = reset(why);
  const salt = anonSalt_(), K = nul_(), key = n => K[n] = K[n] || aid_(n, salt);
  const width = an && an.getMaxColumns ? Math.min(LOG.length, an.getMaxColumns()) : LOG.length;
  const more = () => S.c < last && read < cap && (!read || Date.now() - t0 < budget);
  let read = 0, settled = 0, caught = false, served = null, tr = null;
  for (;;) {
    while (more()) {
      const k = Math.min(B, last - S.c);
      let v = an.getRange(S.c + 2, 1, k, width).getValues();
      if (width < LOG.length) v = v.map(r => r.concat(new Array(LOG.length - width).fill('')));
      read += k;
      const fresh = [];
      let late = false;
      // The rows stats_ reads (answerRows_: the corals', never a surprise card's, no reserved word; with a player).
      v.forEach((r, i) => { if (!r[0] || protoRow_(r) || !replayed_(r)) return; const m = statsMini_(r, S.c + 2 + i, key(lc_(r[0]))); if (S.h !== null && m[1] < S.h) late = true; fresh.push(m); });
      if (late) { S = reset('late answer'); continue; }
      fresh.forEach(m => S.pend.push(m));
      S.c += k;
      S.id = String(v[k - 1][7]);
    }
    if (S.c < last) break;  // the next run goes on
    // Every row read: each pending player's trust on their whole log (settled counters, then their pending rows in order).
    const L = S.pend.sort(statsOrder_), T2 = nul_();
    L.forEach(m => trustAdd_(T2[m[2]] = T2[m[2]] || (S.T[m[2]] || [0, 0, 0, 0]).slice(), m[5], guess_(m[6], m[9])));
    tr = x => trustOk_(T2[x]) && !sx.has(x);
    if (Object.keys(T2).some(x => x in S.U && !!S.U[x] !== tr(x))) { S = reset('trust changed'); if (more()) continue; break; }
    const H = Math.max(S.h === null ? -Infinity : S.h, now - STATS.LAG);
    while (settled < L.length && L[settled][1] < H) {
      const m = L[settled++], x = m[2];
      trustAdd_(S.T[x] = S.T[x] || [0, 0, 0, 0], m[5], guess_(m[6], m[9]));
      S.U[x] = tr(x) ? 1 : 0;
      statsStep_(S, m, tr(x), sx.has(x), idx);
    }
    S.pend = L.slice(settled);
    S.h = H;
    caught = true;
    break;
  }
  S.at = t0;
  S.dirty = mark;
  S.runs++;
  S.pf = statsPoolFp_(S, idx);
  const built = S.why;
  if (caught) S.why = '';
  const json = JSON.stringify(S);
  if (caught) { S.pend.forEach(m => statsStep_(S, m, tr(m[2]), sx.has(m[2]), idx)); served = JSON.stringify(statsOut_(S)); }
  // A rewrite of the log while this run read it: what it folded is stale, so nothing is written (the next run rebuilds).
  if (dirty() !== mark) return {why: why, read: read, settled: settled, pending: S.pend.length, caught: false, ms: Date.now() - t0, stale: true};
  const note = 'built from ' + new Date(S.built).toISOString() + ' (' + S.cause + '), ' + S.runs + ' run' + (S.runs === 1 ? '' : 's') + (caught ? '' : ', going on');
  statsPut_(tab, 3, ['state', VERSION, new Date(), S.c, S.roster, note], json);
  props.setProperty(STATS.PROP, JSON.stringify({c: S.c, at: S.at, v: VERSION}));
  if (served !== null) {
    statsPut_(tab, 2, ['served', VERSION, new Date(), S.c, S.roster, ''], served);
    if (rosterAt_() <= S.roster) try { cacheBigPut_(CacheService.getScriptCache(), statsCacheKey_(), served, STATS.TTL); } catch (e) {}
  }
  tim_('stats fold', t0, read, LOG.length);
  return {why: why, built: built, read: read, settled: settled, pending: S.pend.length, caught: caught, rows: S.c, ms: Date.now() - t0, runs: S.runs};
}
// From the 15-minute trigger (autoUpdate, when up to date, after the leaderboard's replays): one run of the fold, unless
// the trigger run is already long (STATS.UNTIL from its start: the next run folds). The Deploy log says when a build
// for a new version (or the first) is complete, and a failure.
function statsFoldRun_(log){
  if (!STATS.ON || Date.now() - TIM_.t0 > STATS.UNTIL) return;
  try {
    const r = statsFold_();
    if (r.caught && (r.built === 'missing' || r.built === 'new version')) log('pooled stats: snapshot built for v' + VERSION + ' (' + r.rows + ' answer rows, ' + r.runs + ' run' + (r.runs === 1 ? '' : 's') + ', last one ' + r.ms + ' ms)');
  } catch (e) { log('pooled stats fold failed: ' + e.message); }
}

// Players' reports (v7): from a game, after the answer, a player says the expected genus is probably wrong (and may say
// which genus it is), the photo shows several corals, the photo is bad, or something else, with an optional note.
// One row per report in the "Reports" tab. The reporter is the sync name when its code matches ("Verified" 1),
// else the name typed or nothing ("Verified" 0). Nothing here changes the photos: Pierre decides in the admin Triage.
// v8: also from an enlarged photo, a genus sheet or any page (feedback): Mode = game, photo, sheet or page; Where = the page.
const REP = ['Time', 'Reporter', 'Verified', 'Reason', 'Expected', 'Answered', 'Suggested genus', 'Note', 'Mode', 'Photos', 'Where', 'Id'];
const WHY = {wrong: 'Wrong answer', multi: 'Several corals', photo: 'Bad photo', info: 'Wrong information', bug: 'Bug', idea: 'Suggestion', other: 'Other'};
const text_ = (x, n) => safe_(String(x == null ? '' : x).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n));
function logReports_(p){
  const L = p.reports.filter(r => r && /^[a-z0-9]{1,20}$/.test(String(r.id)) && WHY[r.why]).slice(0, 50);
  if (!L.length) return {ok: true, rep: true};
  const lock = lock_();
  try {
    if (over_('reports', 300)) return {ok: false, error: 'busy'};  // v12 flood cap, checked under the lock
    const name = String(p.rname || '').trim().slice(0, 40), pin = String(p.rpin || '').trim();
    let ok = 0, who = name;
    // v55: a device still signed in with a removed account (Removed: its name and code): its reports go under the name it
    // joined (a merge, Verified 1), or under no name at all (deleted, Verified 0), never under the removed name.
    // The removal is checked whatever the code throttle says (Codex review #600): a throttled name verifies nothing, but
    // a removed account's name and code still never put the removed name on a report.
    if (name && /^\d{4}$/.test(pin)) { const h = hash_(name, pin), g = gone_(name, h);
      if (blocked_(name)) { if (g) { who = g.into; ok = 0; } }
      else { const ra = sheet_('RAs', HEAD), r = find_(ra, name);
        if (r && ra.getRange(r, 7).getValue() === h) ok = 1;
        else if (g) { who = g.into; ok = g.into ? 1 : 0; } else if (r) failed_(name); } }
    // v58 (Codex review #603): the generation the report was queued under (racct, sync.js acct), whatever the code or its
    // throttle: no account of the name any more, or another generation of it (the record archived, the name taken again
    // since, with any code), and the report has no reporter, never the new account's.
    if (who && who === name && typeof p.racct === 'string' && p.racct) { const ra = sheet_('RAs', HEAD), r = find_(ra, name);
      let d = {}; if (r) try { d = JSON.parse(readData_(String(ra.getRange(r, 1).getValue()), String(ra.getRange(r, 8).getValue() || '')).json || '{}') || {}; } catch (e) {}
      if (!r || (d._acct && d._acct !== p.racct)) { who = ''; ok = 0; } }
    const sh = sheet_('Reports', REP), n = sh.getLastRow() - 1;
    const seen = new Set(n > 0 ? sh.getRange(2, REP.length, n, 1).getValues().map(r => String(r[0])) : []);
    // v34: a unit is a genus name or a fish teaching id (t01): letters first, then letters, digits, spaces or dashes;
    // v46: or a fish scientific genus (g:Platax); v69: or a fish family (f:Damselfishes), an old entry id renamed to it.
    const G = /^([fg]:)?[A-Za-z][A-Za-z0-9 -]*$/, M = /^[A-Za-z0-9:|-]*$/, PH = /^[A-Za-z0-9_. -]*$/;
    const un = x => CORE_.SUBJECTS.reduce((y, S) => CORE_.renamedId(S, y), x);
    const rows = L.filter(r => !seen.has(String(r.id))).map(r => [new Date(r.t || Date.now()), safe_(who), ok, WHY[r.why], word_(un(r.g), G, 40), word_(un(r.a), G, 40),
      text_(r.fix, 60), text_(r.note, 1000), word_(r.m, M, 40), word_(r.ph, PH, 400), text_(r.w, 120), String(r.id)]);
    if (rows.length) { const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
      if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
      sh.getRange(at, 1, rows.length, REP.length).setValues(rows); }
    return {ok: true, rep: true};
  } finally { lock.releaseLock(); }
}
// v57 (Pierre, 2026-11-05, Q66: when the admin marks a report done, the player who sent it is told once that it helped):
// the ids of one player's reports, those sent signed in under their name with their code (Verified 1), oldest first, the
// last REPS_MAX. The admin's Done is not here (curation.json seen 'rep:<id>', public): the app checks these ids against
// it, with the ids it kept itself (an anonymous device's reports, matched on the device that sent them). Ids only: no
// reason, note or anything the admin wrote. A name whose account was deleted and taken again by someone else (Removed
// tab: another code may pick it) gets only the reports sent after its last removal (Codex review #581).
const REPS_MAX = 50;
function repsOf_(name){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Reports'), n = sh ? sh.getLastRow() - 1 : 0, me = lc_(name);
  if (n < 1) return [];
  const rm = ss.getSheetByName('Removed');
  let cut = 0;
  if (rm && rm.getLastRow() > 1) rm.getRange(2, 1, rm.getLastRow() - 1, REMOVED.length).getValues()
    .forEach(r => { if (lc_(r[0]) === me) cut = Math.max(cut, new Date(r[3]).getTime() || 0); });
  return sh.getRange(2, 1, n, REP.length).getValues()
    .filter(r => lc_(r[1]) === me && Number(r[2]) === 1 && r[REP.length - 1] && (new Date(r[0]).getTime() || 0) > cut)
    .map(r => String(r[REP.length - 1])).slice(-REPS_MAX);
}
// POST {readReports: 1, token} (v8) → {ok, rows: [[id, time ms, reporter, verified 0|1, reason key, expected, answered,
// suggested genus, note, mode, photos, where]]}, newest first. Names are shown, so only the app's admins get them: anyone whose
// GitHub token can write to the repository (the admin page's token; Pierre, 2026-11-01: "all admins"). The token is
// checked with GitHub once and remembered 10 minutes by its hash only; it is never stored. Sent by POST, so it stays
// out of URLs and logs. Needs the script's "connect to an external service" permission (asked once on redeploy).
const REPO = 'ppericard/coral-id-imr';
function isAdmin_(token){
  if (!/^[A-Za-z0-9_]{20,255}$/.test(token)) return false;
  const cache = CacheService.getScriptCache(), key = 'gh:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  if (cache.get(key) === '1') return true;
  const r = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO, {headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json'}, muteHttpExceptions: true});
  let ok = false; try { const p = r.getResponseCode() === 200 && JSON.parse(r.getContentText()).permissions; ok = !!(p && (p.push || p.maintain || p.admin)); } catch (e) {}
  if (ok) cache.put(key, '1', 600);
  return ok;
}
function reports_(token){
  if (!isAdmin_(String(token || ''))) return {ok: false, error: 'token'};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reports'), key = {}; Object.keys(WHY).forEach(k => key[WHY[k]] = k);
  if (!sh || sh.getLastRow() < 2) return {ok: true, rows: []};
  // v58: verified 2 = the reporter is an archived record (Players › Archived), so the Inbox says so without the player
  // list (Codex review #603).
  const arch = archivedSet_();
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, REP.length).getValues().filter(x => x[11])
    .map(x => [String(x[11]), new Date(x[0]).getTime() || 0, String(x[1]), arch.has(lc_(x[1])) ? 2 : Number(x[2]) ? 1 : 0, key[x[3]] || 'other', String(x[4]), String(x[5]), String(x[6]), String(x[7]), String(x[8]), String(x[9]), String(x[10])]);
  return {ok: true, rows: rows.reverse()};
}

// Analyses report (v35, Pierre 2026-11-04: multifactor analyses of the answer log "every 1000 new answers", read in the
// admin's Analyses group; docs/ARCHITECTURE.md "Analyses"). Computed by a GitHub Action (tools/analyses.js) from
// readAnswers, never on a phone; kept here because it holds per-player results (anonymous ids) and must stay private.
// POST {analysesGet: 1, token, head: 1, subject?} -> {ok, subject, answers, counts, stored: {answers, made, av, size, at,
// roster, subject} | null}; without head, also report: the stored JSON text. v105 (Pierre, 2026-11-08: a subject's
// analyses are refitted every 1000 answers of that subject, "pour le nombre de réponses dans le mode de jeu"): counts,
// each subject's answers (core.js subjCounts: its rows with a player, the count the Action and the admin use too);
// answers, those of the subject asked (default the stored report's, else the replayed one: the corals), no longer every
// row of every subject. POST {analysesPut: 1, token, report: JSON text} -> {ok, stored}: replaces the whole report
// (Analyses tab: row 2 its meta, then 45,000-character parts; 2.5 MB at most); its meta keeps the report's subject.
// v113 (Pierre, 2026-11-08: each subject's analyses, "fish when the fish analyses exist"): one report per subject, each
// in its own tab: the corals' (the replayed subject's) in Analyses as before, another subject's in "Analyses Fish"
// (anTab_, as rplTab_ names its replay records); analysesGet reads the tab of the subject asked (default the replayed
// one), analysesPut writes the tab of the report's subject, and refuses a subject the script does not know (input).
// Admin token only.
const AN_TAB = 'Analyses', AN_MAX = 2500000;
const anTab_ = sid => (CORE_.subjectOf(sid).id === CORE_.replaySubject() ? AN_TAB : AN_TAB + ' ' + CORE_.subjectOf(sid).name);
const anKnown_ = sid => CORE_.SUBJECTS.some(S => S.id === sid);
// v55: when an account last left normal operation (deleted, merged or archived): the Script Property ROSTER_AT set by
// rosterChanged_, or the newest row of the Removed tab (an account removed before v55).
function rosterAt_(){
  let t = Number(PropertiesService.getScriptProperties().getProperty('ROSTER_AT') || 0) || 0;
  const rm = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Removed');
  if (rm && rm.getLastRow() > 1) rm.getRange(2, 4, rm.getLastRow() - 1, 1).getValues().forEach(r => { t = Math.max(t, new Date(r[0]).getTime() || 0); });
  return t;
}
// v55: after a delete, merge or archive: the caches that still hold the account (the public leaderboards board14 and,
// v80, each other subject's, the achievement shares achs15, the photo stats and abilities stats15) are dropped, and the
// Analyses report marked stale.
function rosterChanged_(){
  ['achs15', 'stats17'].concat(CORE_.SUBJECTS.filter(S => S.board).map(boardCache_)).forEach(k => { try { CacheService.getScriptCache().remove(k); } catch (e) {} });
  try { PropertiesService.getScriptProperties().setProperty('ROSTER_AT', String(Date.now())); } catch (e) {}
  statsDirty_(true);  // vNEXT: the pooled stats' snapshot, its player data blanked now and rebuilt without the account (rule D7)
}
function analyses_(p){
  if (!isAdmin_(String(p.token || ''))) return {ok: false, error: 'token'};
  const ss = SpreadsheetApp.getActiveSpreadsheet(), a = ss.getSheetByName('Answers');
  if (p.analysesGet) {
    // v113: the subject asked, else the replayed one (the corals); one it does not know is refused, never read as the corals'
    const subject = String(p.subject || CORE_.replaySubject());
    if (!anKnown_(subject)) return {ok: false, error: 'input'};
    const sh = ss.getSheetByName(anTab_(subject)), n = sh ? sh.getLastRow() : 0;
    let st = null;
    try { st = n >= 2 ? JSON.parse(String(sh.getRange(2, 2).getValue() || 'null')) : null; } catch (e) { st = null; }
    // v105: up to the Subject column (Mode included), all that subjRows reads
    const counts = CORE_.subjCounts(a ? logRows_(a, CORE_.LOG_SUBJ + 1) : []);
    const out = {ok: true, subject: subject, answers: counts[subject] || 0, counts: counts, stored: st};
    // v55: a report made before the last delete, merge (or archive) of an account is stale: the Action refits it at once
    // instead of 1000 answers later (tools/analyses.js), so no per-player result of a removed account stays in it.
    // The roster as the report's answers were read (readAnswers roster, sent back with analysesPut; Codex review #600: a
    // removal while the job computed must still make it stale), else the time it was stored.
    // A snapshot of 0 (nothing removed yet when the answers were read) is a snapshot, not a missing one (Codex #603).
    if (out.stored) out.stale = rosterAt_() > (typeof out.stored.roster === 'number' ? out.stored.roster : Number(out.stored.at) || 0);
    if (!p.head && out.stored && n >= 3) out.report = sh.getRange(3, 2, n - 2, 1).getValues().map(r => String(r[0])).join('');
    return out;
  }
  const text = typeof p.report === 'string' ? p.report : '';
  if (!text || text.length > AN_MAX) return {ok: false, error: 'size'};
  let rep; try { rep = JSON.parse(text); } catch (e) { return {ok: false, error: 'input'}; }
  if (!rep || typeof rep !== 'object' || !rep.R) return {ok: false, error: 'input'};
  // v113: the report's subject picks its tab (a report without one is the replayed subject's, as before)
  const subject = String(rep.subject || CORE_.replaySubject());
  if (!anKnown_(subject)) return {ok: false, error: 'input'};
  const meta = {answers: Number(rep.answers) || 0, made: Number(rep.made) || 0, av: Number(rep.AV) || 0, size: text.length, at: Date.now(), roster: typeof p.roster === 'number' && isFinite(p.roster) ? p.roster : null,
    subject: subject};
  const rows = [['meta', JSON.stringify(meta)]];
  for (let i = 0; i < text.length; i += CHUNK) rows.push(['part ' + (rows.length), safe_(text.slice(i, i + CHUNK))]);
  const lock = lock_();
  try {
    const t = sheet_(anTab_(subject), ['Part', 'Data']), old = t.getLastRow();
    t.getRange(2, 1, rows.length, 2).setValues(rows);
    // a shorter report than the last one: blank the parts left over
    if (old > rows.length + 1) t.getRange(rows.length + 2, 1, old - rows.length - 1, 2).setValues(Array.from({length: old - rows.length - 1}, () => ['', '']));
  } finally { lock.releaseLock(); }
  return {ok: true, stored: meta};
}

// Events (v19, Pierre 2026-11-02: most RAs will not report problems, so the app reports what it can by itself). POST
// {dev: random device id (never a name), events: [{id, t, k, ...}]} → {ok, ev: true}. Kinds: 'err' (an app error: msg,
// src = file:line, pg = page), 'photo' (a photo that did not load after its retries: f, pg), 'sync' (a save that failed
// while online: msg = the error code), 'pulse' (the occasional one-tap question: r = easy | ok | hard, m = game mode,
// n = answers this visit, rr = right % of the last 10, lv = overall level, met = genera met), 'load' (v21, once a visit:
// pop = the CDN server that sent data.json; p0 / t0 = first page and seconds to draw it, qo / q1 = seconds to the quiz
// and to its first photo, nx = next page, bps = line in kbit/s, kb = KB downloaded, sw = served by the offline copy,
// sv = Saver, th = theme, w = window width, st = installed as an app rather than in a browser tab), 'pages' (v30, see
// evWho_ and pagesClean: in the Pages tab, Message = the admin's id of the player, Detail = the cleaned summary). Every event also carries
// the app version (av) and a short browser name (ua). One row each in the "Events" tab, text cut short and never run as
// a formula. Caps: 50 events per request, 200 per device and 3000 in all every 6 hours; an id already logged is skipped.
const EVH = ['Time', 'Device', 'Kind', 'Message', 'Where', 'Page', 'Detail', 'App', 'Browser', 'Id'];
// v25 (Pierre, 2026-11-03: find the devices still running one of the first versions of the app): the app sends its
// version (av) with every request; one without it comes from a version before 2026-11-03. Logged in Events as kind
// 'old' with what it asked and, when the request carries one, the player's name or anonymous id; at most once an hour
// per sender and request. The new service worker reloads such pages onto the current version (sw.js activate).
function oldApp_(what, who){
  try {
    const c = CacheService.getScriptCache(), k = 'old:' + what + ':' + lc_(who || '');
    if (c.get(k)) return;
    c.put(k, '1', 3600);
    // A global cap too (Codex review #373: names or ids made up by the thousand must not fill the tab): 300 per 6 hours.
    if (over_('old', 300, 1)) return;
    sheet_('Events', EVH).appendRow([new Date(), '', 'old', safe_('app before 2026-11-03: ' + what + (who ? ' (' + who + ')' : '')), '', '', '', '', '', 'old' + Date.now().toString(36)]);
  } catch (e) {}
}
// v50 (2026-11-05: the 'old' events said neither which device nor which version; those of 11-03 and 11-05 turned out
// to be the project's own tools reading ?stats=1 without av, not players): the app's photo stats request (at launch, every 10 minutes while in view) carries its version (av:
// "<build>-<hash>", the deploy's build number first), its anonymous device id (dev, the Device of its events, which the
// Pages tab ties to the player's answers) and the minutes its page has been open (up). The newest build reported is kept
// (Script Property BUILD_TOP: the build and when it was first reported; a build far ahead of it, BUILD_JUMP, is not
// taken: no request can make every device look behind). A device on an older build is logged in Events as kind 'old',
// Device its id, App its version, when its page has stayed open OLD_OPEN minutes on a version replaced OLD_H hours ago
// (it did not pick up the new version), or when it starts a version replaced OLD_STUCK hours ago (whatever keeps it
// there); at most once per device every 6 hours, under the old-app cap.
const OLD_OPEN = 30, OLD_H = 1, OLD_STUCK = 24, BUILD_JUMP = 500;
function behind_(p){
  try {
    const b = parseInt(String(p.av || ''), 10), dev = String(p.dev || '');
    if (!(b > 0) || !/^[a-z0-9]{8,16}$/.test(dev)) return;
    const props = PropertiesService.getScriptProperties(), now = Date.now();
    let top = null;
    try { top = JSON.parse(props.getProperty('BUILD_TOP') || 'null'); } catch (e) {}
    if (!top || !(top.b > 0)) top = {b: 0, t: now};
    if (b > top.b) { if (!top.b || b <= top.b + BUILD_JUMP) props.setProperty('BUILD_TOP', JSON.stringify({b: b, t: now})); return; }
    const h = (now - top.t) / 36e5, up = Number(p.up) || 0;
    if (b === top.b || !(h >= OLD_STUCK || (h >= OLD_H && up >= OLD_OPEN))) return;
    const c = CacheService.getScriptCache(), k = 'behind:' + dev;
    if (c.get(k)) return;
    c.put(k, '1', 21600);
    if (over_('old', 300, 1)) return;
    sheet_('Events', EVH).appendRow([new Date(), dev, 'old', safe_('app behind: build ' + b + ', newest ' + top.b + ' for ' + Math.floor(h) + ' h, page open ' + Math.round(up) + ' min'), '', '', '', text_(p.av, 20), '', 'old' + now.toString(36)]);
  } catch (e) {}
}
// v124 'fromhome': the first page a visit opens from Home (app.js fromHome; ROADMAP "Load order, further steps" (c)):
// its page name in the message column, {s: seconds on Home, w: its tier not in yet, tr: the welcome tour ran} in the detail.
const EVK = {err: 1, photo: 1, sync: 1, pulse: 1, load: 1, pages: 1, fromhome: 1};
// v30: the player behind a request's 'pages' events, as the admin knows them (aid_: the id readAnswers and the player
// list use), never the name. A signed-in player's request carries the name and code (ename, epin), checked like a load:
// a right code gives aid_(name); a wrong one, an unknown or a throttled name give '' and count no failure (the reply is
// the same either way, so it tells nothing about the code). A device not signed in sends its anonymous answer id
// (eanon), whose answers are logged as "~anon <id>": aid_('~anon ' + id). Only when the request holds a 'pages' event.
function evWho_(p){
  try {
    const salt = anonSalt_();
    if (p.ename !== undefined) {
      const {name, pin} = clean_({name: p.ename, pin: p.epin});
      if (!name || !/^\d{4}$/.test(pin) || blocked_(name)) return '';
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), r = sh && sh.getLastRow() > 1 ? find_(sh, name) : 0;
      if (!r || sh.getRange(r, 7).getValue() !== hash_(name, pin)) return '';
      // v58 (Codex review #603): summaries queued under another generation of the name (archived, taken again since): no player.
      if (typeof p.eacct === 'string' && p.eacct) { let d = {}; try { d = JSON.parse(readData_(String(sh.getRange(r, 1).getValue()), String(sh.getRange(r, 8).getValue() || '')).json || '{}') || {}; } catch (e) {}
        if (d._acct && d._acct !== p.eacct) return ''; }
      return aid_(name, salt);
    }
    const a = String(p.eanon || '');
    return /^[a-z0-9]{8,16}$/.test(a) ? aid_('~anon ' + a, salt) : '';
  } catch (e) { return ''; }
}
const PAGES_TAB = 'Pages', PAGES_READ = 10000;
// The Pages tab follows the answers (Codex review #423): its rows carry the admin's id of the answers' Name column
// (aid_), so whenever answers change name (a device's answers claimed at sign-in, an admin rename, merge or delete) the
// summaries move with them, and they are deleted with them (anonDelete, a delete with the answers). Ids are compared
// exactly (base64: case matters), and every value goes back through safe_ (an id can start with + or =).
function pagesMove_(from, into){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PAGES_TAB); if (!sh || sh.getLastRow() < 2) return 0;
  const salt = anonSalt_(), a = aid_(from, salt), b = aid_(into, salt);
  const rg = sh.getRange(2, 4, sh.getLastRow() - 1, 1), v = rg.getValues().map(r => String(r[0])); let n = 0;
  v.forEach((x, i) => { if (x === a) { v[i] = b; n++; } });
  if (n) rg.setValues(v.map(x => [safe_(x)]));
  return n;
}
// Deletes the summaries of these admin ids (a Set).
function pagesDrop_(ids){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PAGES_TAB); if (!sh || sh.getLastRow() < 2 || !ids.size) return 0;
  const v = sh.getRange(2, 4, sh.getLastRow() - 1, 1).getValues(); let n = 0;
  for (let i = v.length - 1; i >= 0; i--) if (ids.has(String(v[i][0]))) { sh.deleteRow(i + 2); n++; }
  return n;
}
function events_(p){
  const dev = String(p.dev || '');
  if (!/^[a-z0-9]{8,16}$/.test(dev)) return {ok: false, error: 'input'};
  const L = p.events.filter(x => x && EVK[x.k] && /^[a-z0-9]{1,20}$/.test(String(x.id))).slice(0, 50);
  if (!L.length) return {ok: true, ev: true};
  const lock = lock_();
  try {
    if (over_('ev:' + dev, 200, L.length) || over_('events', 3000, L.length)) return {ok: false, error: 'busy'};
    const who = L.some(x => x.k === 'pages') ? evWho_(p) : '';
    const num = (x, lo, hi) => { const v = Number(x); return isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v * 100) / 100)) : ''; };
    const row = x => {
      const pg = v => word_(v, /^[a-zA-Z0-9~|_.-]*$/, 40);
      const det = x.k === 'pulse'
        ? JSON.stringify({r: ['easy', 'ok', 'hard'].indexOf(x.r) >= 0 ? x.r : '', m: word_(x.m, /^[a-z-]*$/, 20), n: num(x.n, 0, 10000), rr: num(x.rr, 0, 100), lv: num(x.lv, -5, 5), met: num(x.met, 0, 100)})
        : x.k === 'load'
          ? JSON.stringify({p0: pg(x.p0), t0: num(x.t0, 0, 3600), qo: num(x.qo, 0, 86400), q1: num(x.q1, 0, 86400), nx: pg(x.nx), bps: num(x.bps, 0, 1e7), kb: num(x.kb, 0, 1e7), sw: x.sw ? 1 : 0, sv: x.sv ? 1 : 0, th: word_(x.th, /^(dark|light)$/, 5), w: num(x.w, 0, 10000), st: x.st ? 1 : 0})
          : x.k === 'pages' ? JSON.stringify(CORE_.pagesClean(x))
            : x.k === 'fromhome' ? JSON.stringify({s: num(x.s, 0, 86400), w: x.w ? 1 : 0, tr: x.tr ? 1 : 0}) : '';
      return [new Date(x.t || Date.now()), dev, x.k, text_(x.k === 'pulse' ? x.r : x.k === 'photo' ? x.f : x.k === 'load' ? word_(x.pop, /^[a-zA-Z0-9, -]*$/, 60) : x.k === 'pages' ? who : x.k === 'fromhome' ? pg(x.to) : x.msg, 300), text_(x.src, 160), text_(x.pg, 80), det, text_(x.av, 20), text_(x.ua, 40), String(x.id)];
    };
    // The pages summaries in their own tab (v30), the other events in Events; an id already in its tab is skipped.
    [['Events', L.filter(x => x.k !== 'pages')], [PAGES_TAB, L.filter(x => x.k === 'pages')]].forEach(([tab, M]) => {
      if (!M.length) return;
      const sh = sheet_(tab, EVH), n = sh.getLastRow() - 1;
      const seen = new Set(n > 0 ? sh.getRange(Math.max(2, n - 1998), EVH.length, Math.min(n, 2000), 1).getValues().map(r => String(r[0])) : []);
      const rows = M.filter(x => !seen.has(String(x.id))).map(row);
      if (rows.length) { const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
        if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);
        sh.getRange(at, 1, rows.length, EVH.length).setValues(rows); }
    });
    return {ok: true, ev: true};
  } finally { lock.releaseLock(); }
}
// POST {readEvents: 1, token} (v19) → {ok, rows: [[id, time ms, device, kind, message, where, page, detail, app, browser]]},
// newest first, the last 3000. Admins only (isAdmin_), like the reports. With pages: 1 (v30), the Pages tab instead, the
// last PAGES_READ rows: one a visit, kept apart so that errors and load times never push them out of the window.
function readEvents_(token, pages){
  if (!isAdmin_(String(token || ''))) return {ok: false, error: 'token'};
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(pages ? PAGES_TAB : 'Events');
  if (!sh || sh.getLastRow() < 2) return {ok: true, rows: []};
  const n = sh.getLastRow() - 1, from = Math.max(2, n + 2 - (pages ? PAGES_READ : 3000));
  // v58: an archive's page summaries stay in the tab, out of every normal view (Codex review #603).
  const salt = pages ? anonSalt_() : '', arch = pages ? new Set(liveRows_(false).map(r => aid_(String(r[0]), salt))) : new Set();
  // ...apart in arch, for the archived record's own Journey only (Codex review #603).
  const all = sh.getRange(from, 1, n - from + 2, EVH.length).getValues().filter(x => x[9])
    .map(x => [String(x[9]), new Date(x[0]).getTime() || 0, String(x[1]), String(x[2]), String(x[3]), String(x[4]), String(x[5]), String(x[6]), String(x[7]), String(x[8])]);
  const out = {ok: true, rows: all.filter(x => !(pages && arch.has(x[4]))).reverse()};
  if (pages) out.arch = all.filter(x => arch.has(x[4])).reverse();
  return out;
}

// Progress % of a saved progress over a list of genera: core.js pctOf itself (v87; a copy until v86: the coherence
// review's F5, docs/reviews/2026-11-06-engine-coherence-review.md, two formulas drift apart): the domain-score bar of a
// genus (core.js barOf: its stored s.ds less its false-alarm rate), a record not rebuilt yet its moving average s.pg as
// before, the exam's steps and a passed exam (mx) 100%.
function pctOf_(P, list){ return CORE_.pctOf(P, list); }
const ELO_MIN = 200;
// Public leaderboard (v14; Pierre, 2026-11-01: "a small leaderboard to keep a little competition going"): GET ?board=1 →
// {ok, rows: [[name, progress %, level]]} (v125: a 4th field 1 on the admin's account, adminAcct_), every signed-in player with answers who did not opt out (Board 0), ranked by
// progress then level, so players at 100% still rank by skill. Level (v63; Pierre, 2026-11-06, Q134: one player level
// shown everywhere) = the app's own global level, the th of the '~level' record in the player's saved progress (core.js
// LEVEL: the number the app shows in My progress), from ELO_MIN answers of that record (ok + ko); before v63 it was
// stats_'s separate chain R, which now stays inside stats_ as the photo Elo's player term (ras: admin only). Names are
// public here by design: the app says so and lets each player opt out in its settings (privacy.html). Nothing else of
// the player leaves the sheet. Cached 5 minutes.
// One leaderboard per subject (v95; Pierre, 2026-11-04: separate per subject, no merged ranking): &s=<id> asks for that
// subject's (core.js SUBJECTS board), the same rule on its own progress and level (its saved progress key, core.js
// subjKey), over the units its apps last sent (boardUnitsSave_); no s, or a subject without a leaderboard, the first
// one's (the corals), as before. The opt-out, an admin's hide and an archive (the Board column) hold for every subject.
const boardSubj_ = id => CORE_.SUBJECTS.find(S => S.board && S.id === String(id || '')) || CORE_.SUBJECTS.find(S => S.board);
const boardCache_ = S => S === CORE_.SUBJECTS.find(x => x.board) ? 'board14' : 'board14:' + S.id;
const BOARD_UNITS_ = 'BOARD_UNITS_';
// v125 (Pierre, 2026-11-09, Q328 corrected: the seedling 🌱 after his name, added on its own, the name itself unchanged
// and no step for him): the admin's account, one at most, is the player account the admin page is signed in to when it
// reads the answer log with a valid admin token (answers_: its name and code sent as aname / apin, the code checked), kept
// as that account's code hash in the script's properties (ADMIN_ACCT); another account signed in there replaces it. Its
// rows on every leaderboard carry a 4th field 1 (board_) and its load reply admin: 1 (load_), which the app shows as
// ' 🌱' after the name, outside the name's text. A delete, a merge (its from) and an archive of that account clear it
// (adminDrop_, rule D7), so a new account under the name never shows it; and no player can type the seedling or a
// look-alike in a new name (core.js reservedName).
const ADMIN_ACCT_ = 'ADMIN_ACCT';
const adminAcct_ = () => { try { return PropertiesService.getScriptProperties().getProperty(ADMIN_ACCT_) || ''; } catch (e) { return ''; } };
function adminSet_(h){
  if (!h || adminAcct_() === String(h)) return;
  PropertiesService.getScriptProperties().setProperty(ADMIN_ACCT_, String(h));
  CORE_.SUBJECTS.filter(S => S.board).forEach(S => CacheService.getScriptCache().remove(boardCache_(S)));  // every board shows it at once
}
// The account the admin page is signed in to becomes the admin's (answers_), under the script lock, as a delete, a merge
// or an archive clears it under that lock: its row is read again there and must still be live with that code hash, so a
// log read that began before one of them can never bring the mark back (Codex review #841). Lock busy: nothing written
// (the admin page's next read tries again).
function adminClaim_(name, h){
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return false;
  try {
    const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), r = ra ? find_(ra, name) : 0,
      row = r ? ra.getRange(r, 1, 1, HEAD.length).getValues()[0] : null;
    if (!row || row[6] !== h || archived_(row)) return false;
    adminSet_(h);
    return true;
  } finally { lock.releaseLock(); }
}
// The admin's account deleted, merged away or archived (h: its code hash): no account is the admin's any more.
function adminDrop_(h){
  if (!h || adminAcct_() !== String(h)) return;
  PropertiesService.getScriptProperties().deleteProperty(ADMIN_ACCT_);
  CORE_.SUBJECTS.filter(S => S.board).forEach(S => CacheService.getScriptCache().remove(boardCache_(S)));
}
// The units a subject's leaderboard counts (v95), for a subject after the first (the first reads the "By genus" tab's
// columns): its list as an app last sent it with a save (summary.boards {id: [units]}, sync.js syncSummary), kept in the
// script's properties when it changed, so every player's % is computed over the same units, as the "By genus" columns
// do for the corals. A unit is a word of the answer log (the Answers tab's Genus shown), at most 400 of them.
// v101: a subject with a global score (core.js SUBJECTS score) sends its tree instead, {f: [[family, weight, circle]],
// s: [[weight, genus, species, [common names] (null: none at all), circle]]} (app.js UNITS tree, core.js treeScore), kept the same way once it
// passes boardTreeOk_ (and a list sent afterwards by an older app never replaces it): every unit a word as above, every weight a finite number from 0 to 1000, every circle 1 to 9, at
// most 400 families and 1500 species entries, its JSON at most 9000 characters (a script property's limit).
const BOARD_U_ = /^[A-Za-z][A-Za-z0-9: -]{0,39}$/;
function boardTreeOk_(T){
  const u = x => typeof x === 'string' && BOARD_U_.test(x), u0 = x => x === '' || u(x),
    w = x => typeof x === 'number' && isFinite(x) && x >= 0 && x <= 1000, c = x => Number.isInteger(x) && x >= 1 && x <= 9;
  if (!T || typeof T !== 'object' || Array.isArray(T) || !Array.isArray(T.f) || !Array.isArray(T.s)) return null;
  if (!T.f.length || T.f.length > 400 || T.s.length > 1500) return null;
  if (!T.f.every(e => Array.isArray(e) && e.length === 3 && u(e[0]) && w(e[1]) && c(e[2]))) return null;
  if (!T.s.every(e => Array.isArray(e) && e.length === 5 && w(e[0]) && u0(e[1]) && u0(e[2]) && (e[3] === null || (Array.isArray(e[3]) && e[3].length <= 3 && e[3].every(u))) && c(e[4]))) return null;
  const json = JSON.stringify({f: T.f, s: T.s});
  return json.length <= 9000 ? json : null;
}
function boardUnitsSave_(boards){
  if (!boards || typeof boards !== 'object') return;
  const B0 = CORE_.SUBJECTS.find(x => x.board);
  CORE_.SUBJECTS.filter(S => S.board && S !== B0 && boards[S.id] && typeof boards[S.id] === 'object').forEach(S => {
    let json = null;
    const props = PropertiesService.getScriptProperties();
    if (Array.isArray(boards[S.id])) {
      // An app from before the score sends a list: it never replaces a tree a current app sent (Codex review #730), so the
      // board stays on the scale My progress shows.
      if (S.score && /^\{/.test(props.getProperty(BOARD_UNITS_ + S.id) || '')) return;
      const list = boards[S.id].map(String).filter(u => BOARD_U_.test(u)).slice(0, 400);
      if (list.length) json = JSON.stringify(list);
    } else if (S.score) json = boardTreeOk_(boards[S.id]);
    if (!json) return;
    if (props.getProperty(BOARD_UNITS_ + S.id) !== json) props.setProperty(BOARD_UNITS_ + S.id, json);
  });
}
// What a subject's board counts: its units list, or (v101) its tree ({f, s}); [] when nothing was sent yet.
function boardUnits_(S){
  try {
    const L = JSON.parse(PropertiesService.getScriptProperties().getProperty(BOARD_UNITS_ + S.id) || '[]');
    return Array.isArray(L) ? L.map(String) : L && typeof L === 'object' && Array.isArray(L.f) ? L : [];
  } catch (e) { return []; }
}
function board_(sid){
  const S = boardSubj_(sid), first = S === CORE_.SUBJECTS.find(x => x.board), key = boardCache_(S);
  const cache = CacheService.getScriptCache(), hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), out = {ok: true, rows: []};
  if (ra && ra.getLastRow() > 1) {
    // v16: the % from the saved progress, over the genera of the list (the "By genus" tab's columns, written from each
    // sync's summary), with the app's formula (pctOf_); the app-sent Progress column only when that can't be read.
    // v95: another subject's, over its units (boardUnits_), from its own saved progress only (the
    // Progress column is the first subject's).
    const bg = first ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName('By genus') : null,
      list = first ? (bg && bg.getLastColumn() > 2 ? bg.getRange(1, 3, 1, bg.getLastColumn() - 2).getValues()[0].map(String).filter(Boolean) : []) : boardUnits_(S),
      pk = CORE_.subjKey(S.id, 'progress');
    // v118 (Pierre, 2026-11-09, rule D8): a player whose saved copy applied an older rules version of the subject than
    // today's (core.js rvOf) is ranked by the progress their app will hold once it adopts the replay of their log
    // (core.js replayAdopted over the saved copy: the floor of a subject replayed with one included), from the replay
    // kept in the subject's Replayed tab for today's rules, row count and reset (boardRpl_; made by boardWarm_ in the
    // 15-minute trigger, or by the player's own sync); none kept yet, the saved copy's as before. A player up to date
    // keeps the saved copy's. Read only here: nothing is fetched or replayed, and no lock is taken.
    const X = boardRpl_(S), D = datas_(ra);
    const dataOf = r => { try { return JSON.parse(D[lc_(r[0])] || '{}'); } catch (e) { return null; } };
    const progOf = d => { try { const P = JSON.parse((first ? dataKey_(d, 'progress') : d[pk]) || '{}'); return P && typeof P === 'object' ? P : null; } catch (e) { return null; } };
    // A player whose replay cannot be read or adopted keeps the saved copy's: one account never breaks the board.
    const nowOf = r => { const d = dataOf(r), P = d ? progOf(d) : null; try { return P ? X.adopted(String(r[0]), d, P) : P; } catch (e) { return P; } };
    // v63: the level the app shows (progress.js eloLine): '~level'.th as saved (the app's eloScore rounds the Elo, so
    // every device reads the same number), once its record counts ELO_MIN answers, else null. v118: the replayed level
    // for a player behind the rules (core.js replayedOf: the replay's ability, the larger answer count), as their app
    // will show it.
    const n_ = s => s && typeof s === 'object' ? (Number(s.ok) || 0) + (Number(s.ko) || 0) : 0;
    const levelOf = P => { const L = P && P['~level']; return L && typeof L.th === 'number' && isFinite(L.th) && n_(L) >= ELO_MIN ? L.th : null; };
    // A player with answers is listed before the level shows, at 0% too (Codex review #639): any record of the saved
    // progress with answers.
    const answered = P => !!P && Object.keys(P).some(k => n_(P[k]) > 0), adm = adminAcct_();
    out.rows = boardRows_(ra)
      // Progress saved before v14 (blank): learned / total until the player's next sync writes it.
      // Level only from ELO_MIN answers (v15, Pierre: "even 50 is not enough to settle the score"): null before.
      .map(r => { const P = nowOf(r), lv = levelOf(P), own = !P ? null : !Array.isArray(list) ? (S.score ? CORE_.treeScore(P, list, S.score).pct : null) : list.length ? pctOf_(P, list) : null,
          pct = own != null || !first ? own : r[8] === '' ? (Number(r[4]) ? Math.round(100 * Number(r[2]) / Number(r[4])) : null) : Number(r[8]);
        return lv != null || pct || answered(P) ? [String(r[0]), pct, lv].concat(adm && r[6] === adm ? [1] : []) : null; })
      .filter(Boolean)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0) || (b[2] == null ? -99 : b[2]) - (a[2] == null ? -99 : a[2]))
      .slice(0, 200);
  }
  cache.put(key, JSON.stringify(out), 300);
  return out;
}
// The RAs rows a leaderboard lists: with a name, not opted out (Board 0), hidden by an admin (-1, v20) or archived (-2).
const boardRows_ = ra => ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().filter(r => r[0] && !(r[9] !== '' && Number(r[9]) <= 0));
// Every player's saved data as readData_ reads it (the Progress data tab, else the RAs Data column), by lower-case
// name, from one read of each tab: {name: JSON text}, with no prototype (a player named constructor or __proto__ is an
// entry like any other; Codex review #810).
function datas_(ra){
  const t0 = Date.now(), out = Object.create(null), dt = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { const k = String(r[0]).toLowerCase(); if (r[0] !== '' && !(k in out)) out[k] = r.slice(2).map(String).join('') || '{}'; });
  if (ra && ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().forEach(r => { const k = String(r[0]).toLowerCase(), h = String(r[7] || ''); if (r[0] !== '' && !(k in out)) out[k] = h && h !== '@' + DATA_TAB ? h : '{}'; });
  if (dt && dt.getLastRow() > 1) tim_('read Progress data', t0, dt.getLastRow() - 1, dt.getLastColumn());  // v130: the Timings tab
  return out;
}
// The leaderboard's replays (v118; Pierre, 2026-11-09, rule D8: "whenever progress is recalculated, the leaderboard
// must be recalculated automatically, even if people do not reconnect"). For any subject with rules versions (core.js
// rvsOf: the corals' RVS, another subject's SUBJECTS replayed rvs; none: nothing to do), from one read of its answers
// and of its Replayed tab, both only once a player behind is met, each by name in a map with no prototype (Codex review
// #810: a player named constructor):
// - need(name, data): null when the saved data applied the subject's last rules version (its rv key, core.js subjKey
//   'rv', as sync.js rvKey saves it), else the replay that player calls for: its reset and first-launch answer (as the
//   player's own sync asks for it: load_, replays_), rows since the reset, the record kept (rec: null unless it is today's
//   rules, row count and reset: rplFresh_) and the kept row (row, at);
// - adopted(name, data, P): the progress P (the saved copy's) as the player's app will hold it once it adopts that
//   replay (core.js replayAdopted), P itself when none is needed or kept.
function boardRpl_(S){
  const sid = S.id, top = CORE_.rvsOf(sid).length ? rplTop_(sid) : 0, main = sid === CORE_.replaySubject(), arg = main ? undefined : sid,
    tab = main ? RPL.TAB : rplTab_(sid);
  let mine = null, kept = null;
  const rvOf = d => { try { const v = Number(JSON.parse(subjData_(d, CORE_.subjKey(sid, 'rv')) || '0')); return isFinite(v) ? v : 0; } catch (e) { return 0; } };
  const need = (name, d) => {
    if (!top || !d || rvOf(d) >= top) return null;
    if (!mine) { mine = Object.create(null); (main ? answerRows_() : subjRows_(sid)).forEach(r => { const k = lc_(r[0]); if (k) (mine[k] = mine[k] || []).push(r); }); }
    if (!kept) {
      kept = Object.create(null);
      const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
      if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues().forEach((r, i) => { const k = String(r[0]).toLowerCase(); if (r[0] !== '' && !(k in kept)) kept[k] = {at: i + 2, r: r}; });
    }
    const since = resetOf_(d, arg), start = startOf_(d, arg), sinceKey = rplSince_(since, start),
      rows = (mine[lc_(name)] || []).filter(r => (new Date(r[1]).getTime() || 0) > since), c = kept[String(name).toLowerCase()] || null,
      prev = c ? rplRead_(c.r) : null;
    return {since: since, start: start, sinceKey: sinceKey, cell: CORE_.startFp(start) ? sinceKey : since, rows: rows, n: rows.length,
      row: c ? c.r : null, rec: prev && rplFresh_(c.r, top, rows.length, sinceKey) ? rplRec_(prev.o) : null};
  };
  const adopted = (name, d, P) => {
    const x = need(name, d);
    return x && x.rec && typeof x.rec === 'object' ? CORE_.replayAdopted(x.rec, CORE_.renameUnits(S, P), top) : P;
  };
  return {sid: sid, top: top, arg: arg, tab: tab, need: need, adopted: adopted};
}
// The leaderboard's replays made ahead (v118, rule D8), by autoUpdate every 15 minutes (the existing trigger), so the
// public board_ only reads them: for every subject with a leaderboard and rules versions, each player it lists whose
// saved copy is behind today's rules and whose replay is not kept for today's rules, row count and reset gets it made
// (rplMake_, outside the script lock: data.json, fish.json and the photo stats are fetched here if not cached), the same
// record that player's next sync reuses (replay_). New replays start only within BOARD_WARM_MS of the run's start (Apps
// Script's 6-minute limit), the rest at the next run. Then every one is written to its subject's Replayed tab under one
// short lock, each only if, read again under the lock, nothing it was made from changed meanwhile (Codex review #810,
// rule D7: a replay made while the account was deleted must not bring its row back): the account is still there under
// the same name and code, listed (not archived, hidden or opted out), with the same saved data (a delete, a merge, an
// archive, a save, a reset), the same answers of that subject since its reset (the Answers tab read again: a delete, a
// merge, a claim of a device's answers, answers logged), and its Replayed row as it was read (a player's own sync wrote
// it); else it is dropped, and the next run makes it again if it is still needed. Nothing is written when the lock is
// busy. A board that got one is dropped from the cache. Returns the number of replays written.
const BOARD_WARM_MS = 150000;
function boardWarm_(){
  const t0 = Date.now(), ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs');
  if (!ra || ra.getLastRow() < 2) return 0;
  const rows = boardRows_(ra), D = datas_(ra), pend = [];
  CORE_.SUBJECTS.filter(S => S.board).forEach(S => {
    const X = boardRpl_(S);
    if (!X.top) return;
    rows.forEach(r => {
      if (Date.now() - t0 > BOARD_WARM_MS) return;
      const name = String(r[0]), json = D[lc_(name)];
      let d;
      try { d = JSON.parse(json || '{}'); } catch (e) { return; }
      // One player's replay that fails is left out (the next run tries again), never the others'.
      try {
        const x = X.need(name, d);
        if (!x || x.rec) return;
        const mk = rplMake_(lc_(name), x.rows, x.since, x.start, X.arg);
        if (mk) pend.push({S: S, X: X, name: name, hash: r[6], json: json, x: x, mk: mk});
      } catch (e) {}
    });
  });
  if (!pend.length) return 0;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) return 0;
  const done = new Set();
  let made = 0;
  try {
    ROWS_ = null;  // the Answers tab read again, under the lock
    const acct = Object.create(null), now = datas_(ra),
      ans = rs => rs.map(r => String(r[7]) + '@' + (new Date(r[1]).getTime() || 0)).join('|'),
      id = q => (q ? [q[0], q[1], q[2], q[3]].map(String).join('|') : '');
    if (ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().forEach(r => { const k = String(r[0]).toLowerCase(); if (r[0] !== '' && !(k in acct)) acct[k] = r; });
    pend.forEach(p => { try {
      const k = p.name.toLowerCase(), a = acct[k];
      if (!a || String(a[0]) !== p.name || a[6] !== p.hash || (a[9] !== '' && Number(a[9]) <= 0) || now[k] !== p.json) return;
      if (ans(rplMine_(p.name, p.x.since, p.X.arg)) !== ans(p.x.rows)) return;
      const sh = sheet_(p.X.tab, RPL.HEAD), at = find_(sh, p.name),
        row = at ? sh.getRange(at, 1, 1, sh.getLastColumn()).getValues()[0] : null;
      if (id(row) !== id(p.x.row)) return;
      rplPut_(sh, at, p.name, p.X.top, p.x.n, p.x.cell, p.mk.rec);
      done.add(p.S);
      made++;
    } catch (e) {} });
  } finally { lock.releaseLock(); }
  const cache = CacheService.getScriptCache();
  done.forEach(S => { try { cache.remove(boardCache_(S)); } catch (e) {} });
  return made;
}

// Achievements, as on Steam (v15; Pierre, 2026-11-01): GET ?achs=1 → {ok, n: signed-in players with an achievement
// record, counts: {achievement id: players holding it}}, from each player's saved progress (its reefid-sync-ach key, app.js).
// Counts only, no name. Cached 10 minutes.
function achs_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('achs15');
  if (hit) return JSON.parse(hit);
  const out = {ok: true, n: 0, counts: Object.create(null)};  // v119: by achievement id as a device saved it, no prototype
  liveRows_().forEach(r => {  // v58: an archive holds no share
    let A = null;
    try { A = JSON.parse(dataKey_(JSON.parse(readData_(String(r[0]), String(r[7] || '')).json || '{}'), 'ach') || 'null'); } catch (e) {}
    if (!A || typeof A !== 'object') return;
    out.n++;
    Object.keys(A).forEach(k => { if (k[0] !== '_' && /^[a-z0-9]{1,20}$/.test(k)) out.counts[k] = (out.counts[k] || 0) + 1; });
  });
  cache.put('achs15', JSON.stringify(out), 600);
  return out;
}

// Admin user management (v11, Pierre 2026-11-01: "a page in the admin to manage the users, now that beta testers come").
// Every call needs the admin token (isAdmin_), like reading reports. POST bodies:
//   {users: 1, token} → {ok, users: [{name, updated, learned, seen, total, review, answers, right, first, last, days,
//     modes: {mode: [answers, right]}, recent: [answers, right] (last 50), mix: [[shown, answered, times]] (top 5),
//     reports, size}], removed: [{name, into, time}]}
//   {userArchive: {from, into}, token} → {ok, answers, reports}: the record moves to an archive name, Board -2, out of
//     normal operation (v58, was userRename v20); 'exists' when the new name is taken, 'archived' for an archive,
//     'reserved' (v119) for a reserved archive name (core.js reservedName).
//   {userBoard: name, hide, token} → {ok, board}: hidden from the leaderboard by an admin (-1) or shown again (1) (v20).
//   {userData: name, token} → {ok, rev, data}: that player's saved progress (the admin merges two players in the browser,
//     with core.js mergeUsers, then sends the result back with userMerge).
//   {userDelete: name, answers: true|false, token} → {ok, answers, reports}: deletes everything of the player but the
//     Removed tombstone (deleteAccount_, v55). answers true ("delete everything"): their answers and reports go too;
//     false ("delete, keep answers"): both stay without the name, "~deleted <id>" (pooled photo statistics only; the
//     reports never verified).
//   {userMerge: {from, into, data, at}, token} → into gets data (the merged progress; at = into's revision when the admin
//     read it, else 'stale'), every answer and report of from is relabelled into, and from's rows are deleted.
// Both leave a line in the "Removed" tab (name, code hash, into, time): a device still signed in with that name and code
// gets error 'gone' (with into) instead of silently re-creating the account. Someone new may still pick the name with
// another code. v55: a delete keeps nothing else in normal operation (deleteAccount_).
const REMOVED = ['Name', 'Code hash', 'Into', 'Time'];
// v58 (Pierre, 2026-11-05, Q84): an archived record is Board -2 in the RAs tab (no new column). Archived means kept, never
// used in normal operation (rule D7): every reader of the RAs rows for a normal feature reads liveRows_.
const ARCHIVED = -2;
const archived_ = row => row[9] !== '' && Number(row[9]) === ARCHIVED;
// The RAs rows (HEAD columns) with a name, archives left out (live) or only the archives (live false).
function liveRows_(live){
  const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs');
  if (!ra || ra.getLastRow() < 2) return [];
  return ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues().filter(r => r[0] && archived_(r) !== (live !== false));
}
// The archived names, lower case: their answers are flagged 2 (readAnswers) and rate the photos only (stats_).
const archivedSet_ = () => new Set(liveRows_(false).map(r => lc_(r[0])));
function gone_(name, h){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Removed');
  if (!sh || sh.getLastRow() < 2) return null;
  const k = name.toLowerCase(), rows = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][0]).toLowerCase() === k && rows[i][1] === h) return {into: String(rows[i][2] || '')};
  return null;
}
const lc_ = x => String(x == null ? '' : x).trim().toLowerCase();
// Deletes every row of tab `tab` whose column `col` (1-based) is the name (bottom up, so row numbers stay valid).
function dropRows_(tab, name, col){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return 0;
  const v = sh.getRange(2, col || 1, sh.getLastRow() - 1, 1).getValues(), k = lc_(name); let n = 0;
  for (let i = v.length - 1; i >= 0; i--) if (lc_(v[i][0]) === k) { sh.deleteRow(i + 2); n++; }
  if (tab === 'Answers') dropHold_(name);
  if (tab === 'Answers' && n) statsDirty_();  // vNEXT: the pooled stats' fold starts again
  return n;
}
// Renames the name in column `col` of tab `tab` (answers, reports): one write of the whole column.
function relabel_(tab, col, from, into){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return 0;
  const rg = sh.getRange(2, col, sh.getLastRow() - 1, 1), v = rg.getValues(), k = lc_(from); let n = 0;
  v.forEach(r => { if (lc_(r[0]) === k) { r[0] = safe_(into); n++; } });
  if (n) rg.setValues(v);
  if (n && tab === 'Answers') { dropHold_(from); dropHold_(into); statsDirty_(); }  // their opening hold (hold_) is computed again; vNEXT: the pooled stats' fold starts again
  return n;
}
// v109: blanks the Device column (DEV_COL) of every Answers row of this name: one write of that column, only when a cell
// changes.
function devBlank_(name){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers');
  if (!sh || sh.getLastRow() < 2 || (sh.getMaxColumns && sh.getMaxColumns() <= DEV_COL)) return 0;
  const n = sh.getLastRow() - 1, names = sh.getRange(2, 1, n, 1).getValues(), rg = sh.getRange(2, DEV_COL + 1, n, 1), v = rg.getValues(), k = lc_(name);
  let c = 0;
  v.forEach((r, i) => { if (lc_(names[i][0]) === k && r[0] !== '') { r[0] = ''; c++; } });
  if (c) rg.setValues(v);
  return c;
}
// v48: beta groups (Pierre, 2026-11-04: "fish opens to a group I pick in the admin, for now everyone; not one site-wide
// switch"). A subject that opens to a group (core.js SUBJECTS open: 'group', subjGroup, v53; until v52 its beta label: fish) opens in the app to the admin and to the players of its group,
// named by the subject's id. The Groups tab holds one row per membership: Group, Name, Added. The app learns its player's
// groups from the load and save replies (groups); the admin's player list carries each player's.
const GROUPS = {TAB: 'Groups', HEAD: ['Group', 'Name', 'Added']};
const groupIds_ = () => CORE_.SUBJECTS.filter(CORE_.subjGroup).map(S => S.id);  // v53: SUBJECTS open: 'group', not the beta label
function groupRows_(){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GROUPS.TAB);
  return sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
}
// name (lower case) -> the groups of a subject still in beta it is in, each once. v119: no prototype, so a player named
// constructor or __proto__ is in their own groups, never Object's member (reserved names, Pierre 2026-11-09).
function groupMap_(){
  const ok = groupIds_(), m = Object.create(null);
  groupRows_().forEach(r => { const g = String(r[0]), k = lc_(r[1]); if (k && ok.indexOf(g) >= 0 && (m[k] = m[k] || []).indexOf(g) < 0) m[k].push(g); });
  return m;
}
const groupsOf_ = name => groupMap_()[lc_(name)] || [];
// Adds (on) or removes players of a group: existing players only (RAs tab), each once. Returns how many changed.
function groupSet_(ra, names, g, on){
  const sh = sheet_(GROUPS.TAB, GROUPS.HEAD), rows = groupRows_(), has = k => rows.some(r => String(r[0]) === g && lc_(r[1]) === k);
  let n = 0;
  if (on) {
    const add = [], seen = Object.create(null);  // v58: live players only, never an archive
    names.forEach(x => { const r = find_(ra, x), k = lc_(x); if (!r || seen[k] || has(k) || archived_(ra.getRange(r, 1, 1, HEAD.length).getValues()[0])) return;  seen[k] = 1; add.push([g, safe_(String(ra.getRange(r, 1).getValue())), new Date()]); });
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, GROUPS.HEAD.length).setValues(add);
    return add.length;
  }
  const out = Object.create(null); names.forEach(x => (out[lc_(x)] = 1));
  for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][0]) === g && out[lc_(rows[i][1])]) { sh.deleteRow(i + 2); n++; }
  return n;
}
// v115 (Pierre, 2026-11-08, ROADMAP "Security follow-ups": "je suis ok avec tout ce que tu as listé"): the players
// and devices the admin leaves out of the statistics, by the admin's anonymous id (aid_: a signed-in player's or a device
// not signed in, "~anon <id>"), one row each in the tab "Stats excluded" (Id, Added). Their answers rate no photo, no
// confusion, no photo memory and no format offset (stats_), and the Analyses report leaves them out (readAnswers serves
// the list as excluded, tools/analyses.js drops their rows); their own progress, level, leaderboard place and answers
// stay as they are, and Players still shows them. Reversible: POST {statsExclude: id, on: true|false, token} (users_).
const SX = {TAB: 'Stats excluded', HEAD: ['Id', 'Added']}, SX_ID = /^[A-Za-z0-9+/]{8}$/;
function sxSet_(){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SX.TAB);
  return new Set(sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0])).filter(x => SX_ID.test(x)) : []);
}
// Puts one id in (on) or out of the list, each once; under the script lock (the caller holds it). Returns whether it changed.
function sxPut_(id, on){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SX.TAB), v = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  const at = v.map(r => String(r[0])).indexOf(id);
  if (on) { if (at >= 0) return false; const t = sheet_(SX.TAB, SX.HEAD); t.getRange(t.getLastRow() + 1, 1, 1, 2).setValues([[safe_(id), new Date()]]); return true; }  // an id may start with +
  if (at < 0) return false;
  for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === id) sh.deleteRow(i + 2);
  return true;
}
// An account removed (rule D7): its row goes, or follows its answers to the id they keep (into: a delete that keeps the
// answers as "~deleted <id>", an archive's new name), so what was left out stays out and nothing points to the name.
// Returns whether from had a row.
function sxMove_(from, into){ const had = sxPut_(aid_(from), false); if (had && into) sxPut_(aid_(into), true); return had; }
// v55 (Pierre, 2026-11-05, Q84-Q91: "when an account is deleted, the information tied to it is cleaned up; archived
// means not used in normal operation"). Deletes everything of an account but its Removed tombstone (the caller writes
// it): RAs, Progress data, By genus, Replayed, Groups, its page summaries (Pages, Q88: per-player behaviour, no photo
// use) and its name in the log tabs (redact_). With answers (Q85 "delete everything": a test account, or the player
// asked) its answers and reports are deleted; without ("delete, keep answers") the answers become "~deleted <id>" (pooled
// photo statistics only, Q86) and the reports too, with Verified 0: their content stays (a bad photo stays a bad photo),
// open ones stay in the admin's Inbox as from a removed account, and nobody is ever thanked for them. Under the script
// lock (the caller holds it). Returns {ok, answers, reports}: how many rows were deleted or relabelled.
function deleteAccount_(name, all){
  const del = '~deleted ' + aid_(name);
  { const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), r = ra ? find_(ra, name) : 0; if (r) adminDrop_(ra.getRange(r, 7).getValue()); }  // v125
  const answers = all ? dropRows_('Answers', name) : relabel_('Answers', 1, name, del);
  if (!all && answers) devBlank_(del);  // v109: the answers kept lead back to no device (rule D7)
  const reports = all ? dropRows_('Reports', name, 2) : anonReports_(name, del);
  pagesDrop_(new Set([aid_(name)]));
  ['RAs', DATA_TAB, 'By genus'].concat(rplTabs_()).forEach(t => dropRows_(t, name));  // every subject's replay
  dropRows_(GROUPS.TAB, name, 2);  // v48: out of every beta group
  sxMove_(name, all ? '' : del);  // v115: out of the statistics stays out, under the id the answers keep
  // Names merged into it before point nowhere now (Codex review #600): their devices are told the account was removed,
  // and their answers and reports never go under the deleted name (nor to someone who takes it later).
  relabel_('Removed', 3, name, '');
  redact_(name, del);
  rosterChanged_();
  return {ok: true, answers: answers, reports: reports};
}
// v58 (Pierre, 2026-11-05: "a player can delete their own account and all their data themselves"): POST {selfDelete: 1,
// dname, dpin, av} → {ok, deleted: true, answers, reports}. The player's name and code in dname / dpin, never name / pin,
// so an older script answers 'input' and never takes it for a progress write. The code is checked as a load's (a wrong
// one counts towards the 10-minute wait, blocked_), then everything of the account is deleted as the admin's "Delete
// everything" does (deleteAccount_ with its answers and reports) and its Removed tombstone written, so its other devices
// get 'gone'. A name already removed with this code answers deleted (a retry after a lost reply); an archive is the
// trainer's, never deleted here. Caps (over_, under the script lock as every write): 3 tries per name and 30 in all
// every 6 hours; the per-name key is the name's anonymous id, so an Alerts line never names the player (Codex #603). Errors: input, wait, pin, user (no such account), busy.
function selfDelete_(p){
  const {name, pin} = clean_({name: p.dname, pin: p.dpin});
  if (!name || !/^\d{4}$/.test(pin)) return {ok: false, error: 'input'};
  const lock = lock_();
  try {
    if (blocked_(name)) return {ok: false, error: 'wait'};
    if (over_('selfdel', 30) || over_('sd:' + aid_(name), 3)) return {ok: false, error: 'busy'};
    const ra = sheet_('RAs', HEAD), r = find_(ra, name), h = hash_(name, pin);
    // Already deleted (a retry after a lost reply): done. Merged meanwhile (Codex review #603): nothing was deleted, the
    // data is the joined name's now; the app says so and the player deletes that account.
    if (!r) { const g = gone_(name, h); return !g ? {ok: false, error: 'user'} : g.into ? {ok: false, error: 'gone', into: g.into} : {ok: true, deleted: true, answers: 0, reports: 0}; }
    const row = ra.getRange(r, 1, 1, HEAD.length).getValues()[0];
    if (row[6] !== h) { failed_(name); return {ok: false, error: 'pin'}; }
    if (archived_(row)) return {ok: false, error: 'user'};
    // The generation the device saved under (dacct, sync.js acct): another one means the name was taken again after an
    // archive; this device's account is not this one, so nothing is deleted (Codex review #603).
    if (typeof p.dacct === 'string' && p.dacct) { let d = {}; try { d = JSON.parse(readData_(String(row[0]), String(row[7] || '')).json || '{}') || {}; } catch (e) {}
      if (d._acct && d._acct !== p.dacct) return {ok: false, error: 'archived'}; }
    const n = String(row[0]), out = deleteAccount_(n, true);
    sheet_('Removed', REMOVED).appendRow([safe_(n), h, '', new Date()]);
    return {ok: true, deleted: true, answers: out.answers, reports: out.reports};
  } finally { lock.releaseLock(); }
}
// The reports of a name become another reporter's (a deleted account's "~deleted <id>"), never verified.
function anonReports_(name, into){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reports'); if (!sh || sh.getLastRow() < 2) return 0;
  const rg = sh.getRange(2, 2, sh.getLastRow() - 1, 2), v = rg.getValues(), k = lc_(name); let n = 0;
  v.forEach(r => { if (lc_(r[0]) === k) { r[0] = safe_(into); r[1] = 0; n++; } });
  if (n) rg.setValues(v);
  return n;
}
// A removed name in the log tabs (v55): Events' Message names a player in brackets ("app before 2026-11-03: load
// (<name>)", oldApp_), Alerts names a capped name as "n:<name> (" (over_). Each mention becomes `into` (a deleted
// account's "~deleted <id>", or the name a merged one joined). Case-blind, as names are.
function redact_(name, into){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), esc = String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!esc) return 0;
  let n = 0;
  [['Events', 4, new RegExp('\\(' + esc + '\\)', 'gi'), '(' + into + ')'], ['Alerts', 2, new RegExp('n:' + esc + ' \\(', 'gi'), 'n:' + into + ' (']].forEach(([tab, col, re, to]) => {
    const sh = ss.getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return;
    const rg = sh.getRange(2, col, sh.getLastRow() - 1, 1), v = rg.getValues(); let k = 0;
    const nv = v.map(r => { const x = String(r[0]), y = x.replace(re, () => to); if (y !== x) { k++; return [safe_(y)]; } return [r[0]]; });
    if (k) rg.setValues(nv);
    n += k;
  });
  return n;
}
function users_(p){
  if (!isAdmin_(String(p.token || ''))) return {ok: false, error: 'token'};
  const ss = SpreadsheetApp.getActiveSpreadsheet(), ra = sheet_('RAs', HEAD);
  const row_ = name => { const r = find_(ra, name); return r ? {r: r, v: ra.getRange(r, 1, 1, HEAD.length).getValues()[0]} : null; };
  const removed_ = (name, h, into) => sheet_('Removed', REMOVED).appendRow([safe_(name), h, safe_(into || ''), new Date()]);
  // v20: {userBoard: name, hide: true|false, token} hides the player from the public leaderboard (Board -1, which their
  // own syncs keep) or shows them again (1). Pierre, 2026-11-02: a renamed test account must not be on the leaderboard.
  // Under the script lock, as progress saves (Codex review #352): a sync between the read and the write could otherwise
  // put back the Board value it read.
  if (p.userBoard) {
    const lock = lock_();
    try {
      const u = row_(String(p.userBoard)); if (!u) return {ok: false, error: 'user'};
      if (archived_(u.v)) return {ok: false, error: 'archived'};  // v58: an archive stays off the leaderboard
      const b = p.hide ? -1 : 1;
      ra.getRange(u.r, 10).setValue(b);
      CORE_.SUBJECTS.filter(S => S.board).forEach(S => CacheService.getScriptCache().remove(boardCache_(S)));  // v95: every subject's board
      return {ok: true, board: b};
    } finally { lock.releaseLock(); }
  }
  // v48: {userGroup: name | [names], group, on: true|false, token} adds players to the group of a subject in beta, or
  // removes them (groupSet_); answers how many changed and the group's members. Under the script lock, as a rename or a
  // merge could otherwise move a name between the read and the write.
  if (p.userGroup) {
    const g = String(p.group || ''), names = (Array.isArray(p.userGroup) ? p.userGroup : [p.userGroup]).map(String).slice(0, 2000);
    if (groupIds_().indexOf(g) < 0) return {ok: false, error: 'group'};
    const lock = lock_();
    try {
      if (!Array.isArray(p.userGroup) && !row_(names[0])) return {ok: false, error: 'user'};
      const n = groupSet_(ra, names, g, !!p.on), m = groupMap_();
      return {ok: true, group: g, n: n, members: Object.keys(m).filter(k => m[k].indexOf(g) >= 0).length};
    } finally { lock.releaseLock(); }
  }
  // v99 (Pierre, 2026-11-08, Q228: a fallback card had moved a player to the wrong first-launch answer): {userStart: name,
  // s: subject id, c: answer, token} changes the player's answer to the subject's first-launch question (core.js
  // startAdminSet: a choice event appended, via 'admin', every earlier one kept), under the script lock as a progress save,
  // and writes the copy with the revision bumped: a device that read the copy before is answered 'stale' at its next save,
  // reads this one again and merges it (core.js startUnion: the latest answer wins), so no device's copy brings the former
  // answer back. Answers {ok, rev, start: the new record}; error 'input' (an unknown subject or answer), 'user',
  // 'archived', 'none' (no answer saved for that subject: the player is asked on their device).
  if (p.userStart) {
    const sid = String(p.s || ''), c = String(p.c || '');
    if (!CORE_.SUBJECTS.some(S => S.id === sid && S.start) || !CORE_.CHOICE.opts.some(o => o[0] === c)) return {ok: false, error: 'input'};
    const lock = lock_();
    try {
      const u = row_(String(p.userStart)); if (!u) return {ok: false, error: 'user'};
      if (archived_(u.v)) return {ok: false, error: 'archived'};  // an archive is read-only
      const name = String(u.v[0]), cur = readData_(name, String(u.v[7] || ''));
      let data = {}; try { data = JSON.parse(cur.json || '{}') || {}; } catch (e) {}
      const out = CORE_.startAdminSet(data, sid, c, Date.now());
      if (!out) return {ok: false, error: 'none'};
      const json = JSON.stringify(out.data);
      writeData_(name, json, cur.rev + 1);
      ra.getRange(u.r, 8).setValue(json.length < CHUNK ? json : '@' + DATA_TAB);
      return {ok: true, rev: cur.rev + 1, start: out.start};
    } finally { lock.releaseLock(); }
  }
  // v115: {statsExclude: admin id, on: true|false, token} leaves a player or a device not signed in out of the
  // statistics, or counts them again (sxPut_); the photo stats are recomputed and the Analyses report refitted
  // (rosterChanged_). Answers {ok, excluded: every id left out}.
  if (p.statsExclude) {
    const id = String(p.statsExclude);
    if (!SX_ID.test(id)) return {ok: false, error: 'input'};
    const lock = lock_();
    try {
      if (sxPut_(id, !!p.on)) rosterChanged_();
      return {ok: true, excluded: [...sxSet_()]};
    } finally { lock.releaseLock(); }
  }
  if (p.userData) {
    const u = row_(String(p.userData)); if (!u) return {ok: false, error: 'user'};
    const d = readData_(String(u.v[0]), String(u.v[7] || '')), data = JSON.parse(d.json);
    if (data && typeof data === 'object') delete data._acct;  // v58: the generation stays the sheet's (userMerge keeps into's)
    return {ok: true, rev: d.rev, data: data};
  }
  // v17: {anonDelete: [anonymous ids], token} deletes every answer of those ids among the rows without a name (devices
  // that never signed in, accounts deleted with their answers kept): test runs and junk (Pierre, 2026-11-02). Never a
  // named player's answers.
  if (Array.isArray(p.anonDelete)) {
    const ids = new Set(p.anonDelete.map(String).slice(0, 500)), salt = anonSalt_();
    const lock = lock_();
    try {
      const sh = ss.getSheetByName('Answers'); if (!sh || sh.getLastRow() < 2) return {ok: true, answers: 0};
      const v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(), hit = {};
      let n = 0;
      for (let i = v.length - 1; i >= 0; i--) {
        const w = String(v[i][0]);
        if (!/^~(anon|deleted) /.test(w)) continue;
        if (!(w in hit)) hit[w] = ids.has(aid_(w, salt));
        if (hit[w]) { sh.deleteRow(i + 2); n++; }
      }
      Object.keys(hit).forEach(w => hit[w] && rplDrop_(w));  // v55: their full replay records too (every subject's)
      // v30: their sheets opened too (ids are the admin's, as the Pages tab keeps them); never a named player's.
      const named = new Set(ss.getSheetByName('RAs') && ra.getLastRow() > 1 ? ra.getRange(2, 1, ra.getLastRow() - 1, 1).getValues().map(r => aid_(String(r[0]), salt)) : []);
      pagesDrop_(new Set([...ids].filter(x => !named.has(x))));
      [...ids].filter(x => SX_ID.test(x) && !named.has(x)).forEach(x => sxPut_(x, false));  // v115: no row left for ids with no answer
      try { CacheService.getScriptCache().remove('stats17'); } catch (e) {}
      if (n) statsDirty_(true);  // vNEXT: the pooled stats' snapshot without them, rebuilt
      return {ok: true, answers: n};
    } finally { lock.releaseLock(); }
  }
  if (p.userDelete || p.userMerge || p.userArchive) {
    const lock = lock_();
    try {
      // v58 (was userRename, v20): {userArchive: {from, into}, token} → the player's record moves to an archive name
      // (Pierre, 2026-11-02: keep his account played with the old algorithms apart, as "Pierre-test", and start over as
      // "Pierre"): RAs row, saved progress, By genus, answers and reports, marked Board -2 (ARCHIVED; Pierre, 2026-11-05,
      // Q84: no new column). An archive is kept, never used in normal operation (liveRows_). The code hash is tied to the
      // name (hash_), so the app no longer opens it. The old name is not marked removed: a new sign-in may start a new
      // account there; a device still signed in with it is told the record was archived (sync.js, Q88).
      if (p.userArchive) {
        const m = p.userArchive || {}, a = row_(String(m.from || '')), into = String(m.into || '').trim().slice(0, 40);
        if (!a || !into) return {ok: false, error: 'user'};
        if (CORE_.reservedName(into)) return {ok: false, error: 'reserved'};  // v119: no archive under a reserved name either
        if (archived_(a.v)) return {ok: false, error: 'archived'};
        if (row_(into)) return {ok: false, error: 'exists'};
        const from = String(a.v[0]);
        adminDrop_(a.v[6]);  // v125: an archive is no longer the admin's account
        ra.getRange(a.r, 1).setValue(safe_(into));
        ra.getRange(a.r, 10).setValue(ARCHIVED);
        relabel_(DATA_TAB, 1, from, into);
        relabel_('By genus', 1, from, into);
        const answers = relabel_('Answers', 1, from, into), reports = relabel_('Reports', 2, from, into);
        pagesMove_(from, into);
        // Names merged into it before point to the archive too (Removed's Into): a device still signed in with one of
        // them must not log into the new account under the old name (Codex review #352).
        relabel_('Removed', 3, from, into);
        redact_(from, into);  // its name in the log tabs follows it, so deleting the archive leaves none (Codex review #603)
        dropRows_(GROUPS.TAB, from, 2);  // v58: an archive is in no beta group
        sxMove_(from, into);  // v115: its answers stay out of the statistics if they were
        rplDrop_(from);  // the replay (v28; every subject's) is made again under the new name when asked
        rosterChanged_();  // v55: the three caches (achs15 too) and the Analyses report
        return {ok: true, answers: answers, reports: reports};
      }
      if (p.userDelete) {
        const u = row_(String(p.userDelete)); if (!u) return {ok: false, error: 'user'};
        const name = String(u.v[0]);
        const out = deleteAccount_(name, !!p.answers);
        removed_(name, u.v[6], '');
        return out;
      }
      const m = p.userMerge || {}, a = row_(String(m.from || '')), b = row_(String(m.into || ''));
      if (!a || !b || a.r === b.r || !m.data || typeof m.data !== 'object') return {ok: false, error: 'user'};
      if (archived_(a.v) || archived_(b.v)) return {ok: false, error: 'archived'};  // v58: an archive is never merged
      const from = String(a.v[0]), into = String(b.v[0]), cur = readData_(into, String(b.v[7] || ''));
      if (typeof m.at === 'number' && m.at !== cur.rev) return {ok: false, error: 'stale', rev: cur.rev};
      adminDrop_(a.v[6]);  // v125: the merged-away account is no longer the admin's (the kept one becomes it at the admin's next read)
      // The merged progress is no replay of both logs (core.js mergeUsers drops it too): no rules version, so the
      // account's devices ask for the replay of the whole merged history (replay_).
      delete m.data['reefid-sync-coral-rv'];
      delete m.data['imr-coral-rv'];  // rename-app: keep (its name before the rename to IMR Reef ID, v33)
      CORE_.SUBJECTS.forEach(S => delete m.data[CORE_.subjKey(S.id, 'rv')]);  // every subject's (fish's too: its own rules versions)
      let curData = {}; try { curData = JSON.parse(cur.json || '{}') || {}; } catch (e) {}
      if (curData._acct) m.data._acct = curData._acct; else delete m.data._acct;  // v58: the kept account's generation
      const json = JSON.stringify(m.data);
      writeData_(into, json, cur.rev + 1);
      ra.getRange(b.r, 2).setValue(new Date()); ra.getRange(b.r, 8).setValue(json.length < CHUNK ? json : '@' + DATA_TAB);
      const answers = relabel_('Answers', 1, from, into), reports = relabel_('Reports', 2, from, into);
      pagesMove_(from, into);
      // v48: the merged name's beta groups join the kept name's (each once).
      groupRows_().filter(r => lc_(r[1]) === lc_(from)).forEach(r => groupSet_(ra, [into], String(r[0]), true));
      dropRows_(GROUPS.TAB, from, 2);
      sxMove_(from, '');  // v115: the kept name's choice holds for the answers it takes
      ['RAs', DATA_TAB, 'By genus'].concat(rplTabs_()).forEach(t => dropRows_(t, from));  // every subject's replay
      redact_(from, into);  // v55: its name in the log tabs becomes the name it joined
      relabel_('Removed', 3, from, into);  // names merged into from earlier now point to into (Codex review #600)
      removed_(from, a.v[6], into);
      rosterChanged_();
      return {ok: true, rev: cur.rev + 1, answers: answers, reports: reports};
    } finally { lock.releaseLock(); }
  }
  // The list, with each player's numbers from the Answers and Reports tabs.
  // id (v13): the player's anonymous id, the one ?answers=1 and ?stats=1 use, so the admin's player list can join the two.
  // v58: archives apart, archived: [{name, id, time (the record's last save), answers, reports}], read-only in the admin.
  // v119: every map by player has no prototype (a player named constructor or __proto__ is a player like any other).
  const out = {ok: true, users: [], removed: [], archived: []}, by = Object.create(null), dcol = Object.create(null), salt = anonSalt_(), arch = Object.create(null);
  liveRows_(false).forEach(r => { const a = {name: String(r[0]), id: aid_(String(r[0]), salt), time: new Date(r[1]).getTime() || 0, answers: 0, reports: 0}; out.archived.push(a); arch[lc_(a.name)] = a; });
  liveRows_().forEach(r => {
    const u = {name: String(r[0]), id: aid_(String(r[0]), salt), updated: new Date(r[1]).getTime() || 0, learned: Number(r[2]) || 0, seen: Number(r[3]) || 0, total: Number(r[4]) || 0,
      review: String(r[5] || ''), board: r[9] === '' ? 1 : Number(r[9]), answers: 0, right: 0, first: 0, last: 0, days: 0, modes: {}, recent: [0, 0], mix: [], reports: 0, size: String(r[7] || '').length};
    out.users.push(u); by[lc_(u.name)] = u; dcol[lc_(u.name)] = String(r[7] || '');
  });
  // v60: the replayed subject's answers (the corals'), as before fish answers were logged: its mix-ups name its genera.
  const an = ss.getSheetByName('Answers'), days = Object.create(null), mixes = Object.create(null), last50 = Object.create(null), all = an && an.getLastRow() > 1 ? logRows_(an, SUBJ_COL + 1) : [];
  all.filter(replayed_).forEach(r => {
    const u = by[lc_(r[0])]; if (!u) { const a = arch[lc_(r[0])]; if (a) a.answers++; return; }
    const t = new Date(r[1]).getTime() || 0, ok = Number(r[4]) ? 1 : 0, mode = String(r[5]).split('|')[0] || '?', k = lc_(u.name);
    u.answers++; u.right += ok; if (t && (!u.first || t < u.first)) u.first = t; if (t > u.last) u.last = t;
    (days[k] = days[k] || {})[Utilities.formatDate ? Utilities.formatDate(new Date(t), 'GMT+8', 'yyyy-MM-dd') : new Date(t + 8 * 36e5).toISOString().slice(0, 10)] = 1;
    const md = u.modes[mode] = u.modes[mode] || [0, 0]; md[0]++; md[1] += ok;
    (last50[k] = last50[k] || []).push([t, ok]);
    if (!ok && r[3] && r[3] !== r[2]) { const x = (mixes[k] = mixes[k] || {}), key = r[2] + '|' + r[3]; x[key] = (x[key] || 0) + 1; }
  });
  Object.keys(by).forEach(k => { const u = by[k];
    u.days = Object.keys(days[k] || {}).length;
    const L = (last50[k] || []).sort((a, b) => a[0] - b[0]).slice(-50); u.recent = [L.length, L.reduce((t, x) => t + x[1], 0)];
    u.mix = Object.keys(mixes[k] || {}).map(x => x.split('|').concat([mixes[k][x]])).sort((a, b) => b[2] - a[2]).slice(0, 5); });
  // v81: each player's photo exposure in every subject with game photos (exposure_): ex {subject id: [seen, of, hit, asked, units]}.
  exposure_(all, by);
  const rp = ss.getSheetByName('Reports');
  if (rp && rp.getLastRow() > 1) rp.getRange(2, 2, rp.getLastRow() - 1, 1).getValues().forEach(r => { const u = by[lc_(r[0])] || arch[lc_(r[0])]; if (u) u.reports++; });
  const rm = ss.getSheetByName('Removed');
  if (rm && rm.getLastRow() > 1) out.removed = rm.getRange(2, 1, rm.getLastRow() - 1, 4).getValues().filter(r => r[0]).map(r => ({name: String(r[0]), into: String(r[2] || ''), time: new Date(r[3]).getTime() || 0})).reverse();
  // v48: the beta groups each player is in.
  const gm = groupMap_();
  out.users.forEach(u => (u.groups = gm[lc_(u.name)] || []));
  replayedAll_(out.users, dcol);
  out.excluded = [...sxSet_()];  // v115: the ids left out of the statistics
  return out;
}
// v81 (Pierre, 2026-11-06, Q191; the photo exposure study, docs/reviews/2026-11-06-photo-exposure-study.md §5): the
// admin's player list gives each player's photo exposure per subject, ex: {subject id: [seen, of, hit, asked, units]}
// (core.js exposureOf over that subject's rows, core.js subjRows): Seen % = seen / of, the distinct game photos they have
// been shown out of the game photos of the units they have met; Spread % = hit / asked, in time order, of the questions
// on a unit asked while it still had game colonies they had never been shown, the share that showed one. The game photos
// are each subject's units' as its games draw them (pools_). A subject whose files cannot be read gets no ex; a player
// with no answer in a subject has none for it. Computed at each list from the Answers tab: nothing is stored.
function exposure_(rows, by){
  const pools = pools_();
  CORE_.SUBJECTS.forEach(S => {
    if (!pools[S.id]) return;
    // v115 (review of #801): a row logged before word_ refused ids named like Object.prototype's members (a unit
    // constructor) is left out, and a subject whose exposure fails anyway gets none: the list is served all the same.
    let E = {};
    try { E = CORE_.exposureOf(CORE_.subjRows(rows, S.id).filter(r => !protoRow_(r)).map(r => [lc_(r[0]), new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6])]), pools[S.id]); } catch (e) { return; }
    Object.keys(E).forEach(k => { if (by[k]) (by[k].ex = by[k].ex || {})[S.id] = E[k]; });
  });
}
// Each subject's game photos per unit, grouped by colony (core.js unitPool over the site's files its SUBJECTS pool names,
// read from GitHub main, each file once per request): {subject id: pool}, cached 6 hours per subject (pool2<id>, cut in
// parts by cacheBigPut_: the corals' about 43 KB, the fish's about 390 KB, over the script cache's 100 KB a value). A
// subject whose files cannot be read is left out, and not asked again for 10 minutes.
// only (v115): true, the cached pools alone, nothing fetched (an answer's write: photoAlert_); a subject id, that
// subject's pool fetched when not cached, the others from the cache only. ups (v115): an object given gets each
// subject's parent units, cached with its pool (unitUp_: a fish genus or species to its family; photoCheck_).
function pools_(only, ups){
  const c = CacheService.getScriptCache(), out = {}, files = {};
  const site_ = name => {
    if (name in files) return files[name];
    let v = null;
    try {
      const r = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + REPO + '/main/' + name, {muteHttpExceptions: true});
      if (r && r.getResponseCode() === 200) v = JSON.parse(r.getContentText());
    } catch (e) {}
    return files[name] = v;
  };
  CORE_.SUBJECTS.filter(S => S.pool).forEach(S => {
    const k = 'pool2' + S.id, hit = cacheBigGet_(c, k);
    if (hit) { try { const v = JSON.parse(hit); if (v && v.p) { out[S.id] = v.p; if (ups) ups[S.id] = v.u || {}; } return; } catch (e) {} }
    if (only === true || (only && only !== S.id)) return;
    let P = null, U = {};
    try { const F = S.pool.files.map(site_); P = CORE_.unitPool(S, F); if (P) U = unitUp_(F[0]); } catch (e) { P = null; }
    if (!P || !Object.keys(P).length) { try { c.put(k, 'null', 600); } catch (e) {} return; }
    out[S.id] = P;
    if (ups) ups[S.id] = U;
    try { cacheBigPut_(c, k, JSON.stringify({p: P, u: U}), 21600); } catch (e) {}
  });
  return out;
}
// v115: a value over the script cache's 100 KB a value (Apps Script CacheService) is put in parts of CACHE_PART
// characters (at most 3 bytes each in UTF-8: under 100 KB), k + '#' + i, then k as '#<parts>'; one part gone and it is
// read as missing (null), so the caller builds it again. A short value is put as it is (a value never starts with '#').
const CACHE_PART = 32000;
function cacheBigPut_(c, k, v, ttl){
  if (v.length <= CACHE_PART) { c.put(k, v, ttl); return; }
  const parts = {};
  let n = 0;
  for (let i = 0, j = 0; i < v.length; i = j) {
    j = Math.min(v.length, i + CACHE_PART);
    if (j < v.length && /[\ud800-\udbff]/.test(v.charAt(j - 1))) j--;  // never a character cut in two
    parts[k + '#' + n++] = v.slice(i, j);
  }
  c.putAll(parts, ttl);
  c.put(k, '#' + n, ttl);  // last: a reader never takes the parts before they are all in
}
function cacheBigGet_(c, k){
  const v = c.get(k);
  if (!v || v.charAt(0) !== '#') return v;
  const keys = Array.from({length: Number(v.slice(1)) || 0}, (_, i) => k + '#' + i), got = keys.length ? c.getAll(keys) : {};
  return keys.length && keys.every(x => typeof got[x] === 'string') ? keys.map(x => got[x]).join('') : null;
}
// v115 (review of #801): a subject's units above the ones its pool holds, from its first pool file: fish.json's genera
// (g:Chromis) and species (by sheet id, s:Chromis ternatensis, and by id) to their family (f:Damselfishes), the unit
// the fish pool groups its photos under (core.js unitPool); {} for a file without them (the corals' data.json).
function unitUp_(F){
  const up = Object.create(null);
  if (!F || !Array.isArray(F.genera)) return up;
  F.genera.forEach(g => { if (g && g.id && g.family) up[g.id] = g.family; });
  (F.species || []).forEach(x => {
    const fam = x && (x.family || up['g:' + String(x.name || '').split(' ')[0]]);
    if (!fam) return;
    if (x.id) up[x.id] = fam;
    if (x.name) up['s:' + x.name] = fam;
  });
  return up;
}
// v115 (Pierre, 2026-11-08, ROADMAP "Security follow-ups": check server-side that an answer's photos belong to the unit
// shown): every subject's game photos (pools_, the compact list the games draw from) as {at: {photo: ['subject|unit', …]},
// up: {subject id: its parent units, unitUp_}, n: how many subjects' pools it holds}; null when no pool could be read
// (then no answer is checked).
function photoIdx_(only){
  const up = Object.create(null), pools = pools_(only, up), at = Object.create(null);
  Object.keys(pools).forEach(sid => Object.keys(pools[sid]).forEach(u => pools[sid][u].forEach(c => c.forEach(f => (at[f] = at[f] || []).push(sid + '|' + u)))));
  return Object.keys(at).length ? {at, up, n: Object.keys(pools).length} : null;
}
// An answer's photos against the unit it shows: 'ok' when one of them is a game photo of that unit in that subject, or is
// named after it (a coral photo's file starts with its genus: an older app, a photo given to another genus since), or the
// answer has no photo; 'other' when none is and one at least is a game photo of another unit or subject (a fish photo
// under a coral genus); 'unknown' when no photo is in any pool (out of play now, renamed, made up). Only 'other' is
// flagged: such an answer is logged and counts for the player as any other, and only rates no photo (stats_).
// The unit is also taken as the subject renamed it (core.js renamedId: an old fish entry t01 is f:Damselfishes) and as
// its parent unit (unitUp_: a fish genus g:Chromis or species s:Chromis ternatensis is its family's, whose photos the
// fish pool groups; review of #801).
function photoCheck_(idx, sid, unit, fs){
  if (!idx || !fs.length) return 'ok';
  const S = CORE_.SUBJECTS.find(x => x.id === sid), up = own_(idx.up, sid) || {}, own = lc_(unit), keys = [];
  [unit, CORE_.renamedId(S, unit)].forEach(u => [u, own_(up, u)].forEach(x => { if (typeof x === 'string' && x && keys.indexOf(sid + '|' + x) < 0) keys.push(sid + '|' + x); }));
  let other = 0;
  for (let i = 0; i < fs.length; i++) {
    const at = own_(idx.at, fs[i]);
    if ((Array.isArray(at) && at.some(x => keys.indexOf(x) >= 0)) || lc_(fs[i].split('-')[0]) === own) return 'ok';
    if (Array.isArray(at)) other++;
  }
  return other ? 'other' : 'unknown';
}
// o's own entry k (never an inherited member: a parsed cache value has Object's prototype), else undefined.
const own_ = (o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
// On write: a send whose answers show photos of another unit (photoCheck_ 'other', against the pools already cached:
// nothing is fetched under the script lock) is logged as it is, never refused (an old app or a photo moved since must
// lose nothing), and the first such send of each 6-hour window per sender is written to the Alerts tab under the
// sender's admin id (aid_), never a name.
function photoAlert_(name, rows){
  const idx = photoIdx_(true);
  if (!idx) return;
  const n = rows.filter(r => photoCheck_(idx, String(r[17] || CORE_.SUBJECTS[0].id), String(r[2]), String(r[6]).split(/\s+/).filter(Boolean)) === 'other').length;
  if (!n) return;
  const id = aid_(name), c = CacheService.getScriptCache(), k = 'photochk:' + id + ':' + Math.floor(Date.now() / 216e5);
  if (c.get(k)) return;
  c.put(k, '1', 21600);
  sheet_('Alerts', ['Time', 'Event']).appendRow([new Date(), safe_('photos not of the unit shown: ' + id + ' (' + n + ' of ' + rows.length + ' answers)')]);
}
// v42 (Pierre, 2026-11-04: admin pages slow on his phone; Players read every player's saved copy, one call each, to
// replay their progress itself): each player of the list gets rp: [progress %, learned, the saved copy's progress %],
// the full replay of their log as the admin showed it (core.js replayProgress over their rows since their last reset,
// with their first-launch answer, the photo memory and pooled confusions of stats_; then replayedOf with their saved
// copy, pctOf and learnedOf over the slate). Computed here once (rule L12): the replay record is the one the
// Replayed tab keeps (replay_), reused while the rules, the player's row count and reset are the same, made and stored
// otherwise. No rp without data.json (gen_) or for a broken saved copy: the admin then reads that player's copy itself.
function replayedAll_(users, dcol){
  const gen = gen_(), list = slate_();
  if (!gen || !list || !users.length) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet(), st = stats_(), big = Object.create(null), mine = Object.create(null), cached = Object.create(null);  // v119: by player, no prototype
  const dt = ss.getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { big[lc_(r[0])] = r.slice(2).map(String).join(''); });
  answerRows_().forEach(r => { const k = lc_(r[0]); if (k) (mine[k] = mine[k] || []).push(r); });
  const sh = sheet_(RPL.TAB, RPL.HEAD);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues().forEach((r, i) => { cached[lc_(r[0])] = {at: i + 2, r: r}; });
  users.forEach(u => {
    const k = lc_(u.name);
    let data, P;
    try {
      const h = dcol[k] || '', json = big[k] !== undefined ? big[k] : h && h !== '@' + DATA_TAB ? h : '{}';
      data = JSON.parse(json || '{}');
      P = JSON.parse(dataKey_(data, 'progress') || '{}');
    } catch (e) { return; }
    if (!P || typeof P !== 'object') return;
    const since = resetOf_(data), start = startOf_(data), fp = CORE_.startFp(start), sinceKey = fp ? since + '#' + fp : String(since),
      rows = (mine[k] || []).filter(r => (new Date(r[1]).getTime() || 0) > since).map(r => rowOf_(k, r)), n = rows.length, c = cached[k];
    let rec = null;
    if (c && Number(c.r[1]) === CORE_.RV && Number(c.r[2]) === n && String(c.r[3]) === sinceKey) {
      try { rec = JSON.parse(c.r.slice(5).map(String).join('') || '{}'); } catch (e) { rec = null; }
    }
    if (!rec) {
      // v119: the player's own entry only (a player named constructor never takes the map's inherited member).
      const R = CORE_.replayProgress(rows, {gen: gen, mem: st.mem, conf: st.conf, fmt: st.fmt || {}, gd: st.gd, starts: start ? {[k]: start} : {}}),
        rep = Object.prototype.hasOwnProperty.call(R, k) ? R[k] : null;
      rec = rep ? rep.P : {};
      const json = JSON.stringify(rec), parts = [];
      for (let i = 0; i < json.length; i += CHUNK) parts.push(safe_(json.slice(i, i + CHUNK)));
      const at = c ? c.at : sh.getLastRow() + 1, old = c ? c.r.length : 0, row = [safe_(u.name), CORE_.RV, n, fp ? sinceKey : since, new Date()].concat(parts);
      while (row.length < old) row.push('');
      sh.getRange(at, 1, 1, row.length).setValues([row]);
      if (!c) cached[k] = {at: at, r: row};
    }
    const G = CORE_.replayedOf({P: rec}, P);
    u.rp = [CORE_.pctOf(G, list), CORE_.learnedOf(G, list), CORE_.pctOf(P, list)];
  });
}
// Self-update from GitHub (v11; Pierre, 2026-11-01: "find a way to redeploy the script without me"). A time trigger
// (installAutoUpdate, run once by hand in the editor) calls autoUpdate every 15 minutes: when tools/sync/Code.gs on main
// carries a higher VERSION, the script replaces its own code with it (and its manifest with tools/sync/appsscript.json),
// saves a new version and points the existing web app deployment(s) at it, through the Apps Script API with the
// script's own OAuth token. The /exec URL never changes. Needs, once: the Apps Script API switched on in
// https://script.google.com/home/usersettings, the manifest's scopes accepted (running installAutoUpdate asks), and a
// first manual deploy of this version. A newer file without autoUpdate is never installed (it would end the updates);
// every attempt that does something is written to the "Deploy log" tab. Anyone who can push to main can change this
// script, exactly as they can change the site.
const SELF_RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/tools/sync/';
// Run once by hand: makes the trigger, then checks right away that the Apps Script API answers this script (a project
// whose hidden Cloud project can't use the API fails here, with what to do, instead of at the first real update).
function installAutoUpdate(){
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'autoUpdate').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoUpdate').timeBased().everyMinutes(15).create();
  const r = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + '/content', {headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true});
  const msg = r.getResponseCode() === 200 ? 'Self-update ready: the Apps Script API answers. ' + autoUpdate()
    : 'Self-update NOT ready: the Apps Script API answered ' + r.getResponseCode() + ' (' + r.getContentText().slice(0, 200) + '). Check that the API is on in script.google.com/home/usersettings, else link a Google Cloud project with the Apps Script API enabled (see HANDOVER).';
  sheet_('Deploy log', ['Time', 'Event']).appendRow([new Date(), msg.slice(0, 500)]);
  Logger.log(msg);
  return msg;
}
// v130: each run is timed (the Timings tab: timStart_, timEnd_), and trims that tab (timTrim_) whatever it did.
function autoUpdate(){
  timStart_(TIM.EVERY_TRIGGER);
  TIM_.op = 'trigger';
  try { return autoUpdate_(); } finally { timTrim_(); timEnd_(); }
}
function autoUpdate_(){
  const log = m => sheet_('Deploy log', ['Time', 'Event']).appendRow([new Date(), String(m).slice(0, 500)]);
  try {
    const get = f => UrlFetchApp.fetch(SELF_RAW + f + '?t=' + Date.now(), {muteHttpExceptions: true});
    const src = get('Code.gs'); if (src.getResponseCode() !== 200) return 'github ' + src.getResponseCode();
    const code = src.getContentText(), m = /const VERSION = (\d+);/.exec(code), v = m ? Number(m[1]) : 0;
    // AUTO_PENDING: a version whose code is already in place but whose deployment did not finish (a failed /versions or
    // /deployments call). The code running now is then that version, so it must finish the deployment, not skip it.
    const props = PropertiesService.getScriptProperties(), pending = Number(props.getProperty('AUTO_PENDING') || 0);
    if (v <= VERSION && !pending) { try { once_(log); } finally { boardWarmRun_(log); statsFoldRun_(log); } return 'up to date (v' + VERSION + ')'; }
    if (v > VERSION && code.indexOf('function autoUpdate(') < 0) { log('v' + v + ' not installed: it has no autoUpdate'); return 'skipped'; }
    const man = get('appsscript.json'), id = ScriptApp.getScriptId(), auth = {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()};
    const api = (method, path, body) => { const o = {method: method, headers: auth, muteHttpExceptions: true}; if (body) { o.contentType = 'application/json'; o.payload = JSON.stringify(body); }
      const r = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + id + path, o);
      if (r.getResponseCode() >= 300) throw new Error(method.toUpperCase() + ' ' + path + ' ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
      return JSON.parse(r.getContentText() || '{}'); };
    if (v > VERSION) {
      const files = api('get', '/content').files || [], js = files.filter(f => f.type === 'SERVER_JS');
      if (js.length !== 1) { log('v' + v + ' not installed: expected one script file, found ' + js.length); return 'skipped'; }
      props.setProperty('AUTO_PENDING', String(v));
      api('put', '/content', {files: files.map(f => ({name: f.name, type: f.type,
        source: f.type === 'SERVER_JS' ? code : f.name === 'appsscript' && man.getResponseCode() === 200 ? man.getContentText() : f.source}))});
    }
    const dv = Math.max(v, pending), ver = api('post', '/versions', {description: 'v' + dv + ' from GitHub main'});
    const deps = (api('get', '/deployments').deployments || []).filter(d => d.deploymentConfig && d.deploymentConfig.versionNumber && (d.entryPoints || []).some(e => e.entryPointType === 'WEB_APP'));
    deps.forEach(d => api('put', '/deployments/' + d.deploymentId, {deploymentConfig: {versionNumber: ver.versionNumber, manifestFileName: 'appsscript', description: 'v' + dv + ' (auto)'}}));
    props.deleteProperty('AUTO_PENDING');
    log('deployed v' + dv + ' as version ' + ver.versionNumber + ' (' + deps.length + ' web app deployment' + (deps.length === 1 ? '' : 's') + ')' + (v > VERSION ? '' : ', finishing an interrupted update'));
    return 'deployed v' + dv;
  } catch (e) { log('error: ' + e.message); return 'error'; }
}

// One-shot data migrations (Pierre, 2026-11-04, alpha: no backward compatibility, rule W3): the code that
// brings one moves the stored data once, then only the new names exist. Run by autoUpdate when it finds itself up to
// date, so by the new code itself, within 15 minutes of its install; a Script Property (ONCE_<name>) marks each one done,
// the Deploy log says what it changed. A failed one is tried again at the next run.
const ONCE_ = {
  // idkey-migration: begin
  // v38: the Coral Finder tool became the Coral ID Key (#finder → #idkey, #lab-finder → #lab-idkey; the book keeps its
  // name). The page names in the logged rows: Pages and Events (Page; Detail: a visit summary's page names, the load
  // times' first and next page) and Reports (Where).
  idkey: () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), out = [];
    const ren = x => typeof x === 'string' ? x.replace(/(^|")(lab-)?finder(?=$|["|;])/g, '$1$2idkey') : x;
    [[PAGES_TAB, 6, 2], ['Events', 6, 2], ['Reports', REP.indexOf('Where') + 1, 1]].forEach(([tab, col, w]) => {
      const sh = ss.getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return;
      const rg = sh.getRange(2, col, sh.getLastRow() - 1, w), v = rg.getValues(); let n = 0;
      const nv = v.map(r => r.map(x => { const y = ren(x); if (y !== x) n++; return y; }));
      if (n) rg.setValues(nv);
      out.push(tab + ' ' + n);
    });
    return 'page names finder → idkey: ' + out.join(', ') + ' cells';
  },
  // idkey-migration: end
  // tz-migration: begin
  // v44: every answer logged before the UTC offset column came from players on Philippine time (Pierre, 2026-11-04):
  // the empty UTC offset cells of the rows there now get +480; a cell that holds a value is never touched.
  tz: () => {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), col = LOG.indexOf('UTC offset') + 1;
    if (!sh || sh.getLastRow() < 2) return 'UTC offset: no answers';
    if (sh.getMaxColumns && sh.getMaxColumns() < LOG.length) sh.insertColumnsAfter(sh.getMaxColumns(), LOG.length - sh.getMaxColumns());
    if (sh.getRange(1, col).getValue() !== LOG[col - 1]) sh.getRange(1, 1, 1, LOG.length).setValues([LOG]).setFontWeight('bold');
    const n = sh.getLastRow() - 1, names = sh.getRange(2, 1, n, 1).getValues(), rg = sh.getRange(2, col, n, 1), v = rg.getValues();
    let k = 0;
    const nv = v.map((r, i) => names[i][0] && (r[0] === '' || r[0] == null) ? (k++, [480]) : [r[0]]);
    if (k) rg.setValues(nv);
    return 'UTC offset +480 in ' + k + ' empty cells of ' + n + ' rows';
  },
  // tz-migration: end
  // removedcleanup-migration: begin
  // v55 (Pierre, 2026-11-05, Q91: yes to a one-shot logged cleanup): what removals before v55 left in normal operation.
  // The Replayed rows of devices that never signed in whose answers are no longer in Answers (claimed at sign-in or
  // deleted by anonDelete, which did not drop them then), and the reports of accounts deleted outright (a Removed row
  // with no Into) sent under that name before its removal (v55 deletes or anonymises them at delete time). Counts only.
  removedcleanup: () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), an = ss.getSheetByName('Answers'), names = new Set();
    if (an && an.getLastRow() > 1) an.getRange(2, 1, an.getLastRow() - 1, 1).getValues().forEach(r => names.add(lc_(r[0])));
    let a = 0, b = 0;
    const rp = ss.getSheetByName(RPL.TAB);
    if (rp && rp.getLastRow() > 1) {
      const v = rp.getRange(2, 1, rp.getLastRow() - 1, 1).getValues();
      for (let i = v.length - 1; i >= 0; i--) { const w = lc_(v[i][0]); if (w.indexOf('~anon ') === 0 && !names.has(w)) { rp.deleteRow(i + 2); a++; } }
    }
    const rm = ss.getSheetByName('Removed'), gone = Object.create(null);
    if (rm && rm.getLastRow() > 1) rm.getRange(2, 1, rm.getLastRow() - 1, REMOVED.length).getValues()
      .forEach(r => { const k = lc_(r[0]); if (k && !String(r[2] || '')) gone[k] = Math.max(gone[k] || 0, new Date(r[3]).getTime() || 0); });
    const re = ss.getSheetByName('Reports');
    if (re && re.getLastRow() > 1) {
      const v = re.getRange(2, 1, re.getLastRow() - 1, 2).getValues();
      for (let i = v.length - 1; i >= 0; i--) { const k = lc_(v[i][1]); if (k && gone[k] && (new Date(v[i][0]).getTime() || 0) <= gone[k]) { re.deleteRow(i + 2); b++; } }
    }
    return 'Replayed ' + a + ' orphan row' + (a === 1 ? '' : 's') + ' of devices with no answer left, Reports ' + b + ' row' + (b === 1 ? '' : 's') + ' of accounts deleted outright';
  },
  // removedcleanup-migration: end
  // fishunits-migration: begin
  // v69 (Pierre, 2026-11-06, Q159: yes): the fish units became the book's families (f:Damselfishes), not the IMR entries
  // (t01). The fish rows logged before: Genus shown, Answered, Mode, Choices, Taxon shown and Taxon answered renamed with
  // one map per row (core.js renameLogEntry: the species shown decides a split entry, so a right answer stays right);
  // the Reports tab's Expected and Answered by the entry's family. Answers logged after it come renamed (logAnswers_).
  fishunits: () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), an = ss.getSheetByName('Answers'), out = [];
    const RS = CORE_.SUBJECTS.filter(S => S.renamed), C = n => LOG.indexOf(n);
    // Only the six renamed columns are written back, each a whole column, and only when one of its cells changed: every
    // value in them passed a letters-first check when logged, so none can read as a formula (Codex review #654: writing
    // whole rows back would drop the apostrophe safe_() put before a name or a typed answer).
    // v100: the tab's v60 columns by name (Species shown), and its rows through logRows_ (a column added since reads blank).
    if (an && an.getLastRow() > 1 && an.getLastColumn() >= C('Species shown') + 1) {
      const n = an.getLastRow() - 1, v = logRows_(an, LOG.length), cols = ['Genus shown', 'Answered', 'Mode', 'Choices', 'Taxon shown', 'Taxon answered'];
      const nv = cols.map(c => v.map(r => [r[C(c)]])), key = ['g', 'a', 'm', 'ch', 'tn', 'ta']; let k = 0;
      v.forEach((r, i) => {
        const FS = RS.find(S => S.id === String(r[C('Subject')]));
        if (!FS) return;
        const a = {g: String(r[C('Genus shown')]), a: String(r[C('Answered')]), m: String(r[C('Mode')]), ch: String(r[C('Choices')]),
          tn: String(r[C('Taxon shown')]), ta: String(r[C('Taxon answered')]), sp: String(r[C('Species shown')])};
        const b = CORE_.renameLogEntry(FS, a);
        if (b === a) return;
        k++;
        key.forEach((x, j) => (nv[j][i] = [b[x]]));
      });
      if (k) cols.forEach((c, j) => an.getRange(2, C(c) + 1, n, 1).setValues(nv[j]));
      out.push('Answers ' + k + ' fish row' + (k === 1 ? '' : 's'));
    }
    const re = ss.getSheetByName('Reports');
    if (re && re.getLastRow() > 1) {
      const c = REP.indexOf('Expected') + 1, rg = re.getRange(2, c, re.getLastRow() - 1, 2), v = rg.getValues(); let k = 0;
      const nv = v.map(r => r.map(x => { const y = RS.reduce((z, S) => CORE_.renamedId(S, z), String(x)); if (y !== String(x)) { k++; return y; } return x; }));
      if (k) rg.setValues(nv);
      out.push('Reports ' + k + ' cell' + (k === 1 ? '' : 's'));
    }
    return 'units renamed (fish entries → families): ' + (out.join(', ') || 'nothing logged');
  }
  // fishunits-migration: end
};
// The leaderboard's replays (boardWarm_, rule D8) at each run of the trigger that finds the script up to date (so by the
// code installed), after the one-shot migrations, even when one fails (it is tried again at the next run); the Deploy log says how many were made, only when some were, and a failure.
function boardWarmRun_(log){
  const t0 = Date.now();
  try { const n = boardWarm_(); tim_('board warm', t0, '', ''); if (n) log('leaderboard: ' + n + ' replay' + (n === 1 ? '' : 's') + ' made for players behind the rules (v' + VERSION + ')'); }
  catch (e) { log('leaderboard replays failed: ' + e.message); }
}
function once_(log){
  const props = PropertiesService.getScriptProperties();
  Object.keys(ONCE_).forEach(k => {
    if (props.getProperty('ONCE_' + k)) return;
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try { const m = ONCE_[k](); props.setProperty('ONCE_' + k, String(Date.now())); statsDirty_(); log('one-shot ' + k + ' (v' + VERSION + '): ' + m); }  // vNEXT: it may rewrite Answers
    catch (e) { log('one-shot ' + k + ' failed: ' + e.message); }
    finally { lock.releaseLock(); }
  });
}

// Players who never sign in (v12, Pierre 2026-11-01: their answers should still improve the photo ratings and the
// confusions). POST {anon: random device id, anonAnswers: [...]}: logged like a signed-in player's, under the name
// "~anon <id>" (no name, no code). Signing in later moves them to the name (doPost, p.anon). Caps: 100 answers per
// request, 600 per id and 6000 for all anonymous players every 6 hours; over that: {ok: false, error: 'busy'}.
function anon_(p){  // also p.pt (replay_) and p.reset: the device's progress reset, the replay's cutoff (v28)
  const id = String(p.anon || '');
  if (!/^[a-z0-9]{8,16}$/.test(id)) return {ok: false, error: 'input'};
  const L = p.anonAnswers.slice(0, 100);
  // Counters are read and written under the script lock, so concurrent requests cannot both pass a cap.
  const lock = lock_();
  try {
    const f = freshAnswers_(L);
    if (f.fresh.length && (over_('a:' + id, 600, f.fresh.length) || over_('anon', 6000, f.fresh.length))) return {ok: false, error: 'busy'};
    logAnswers_('~anon ' + id, f.fresh, f.seen, p.dev);
    // v28: a device that never signed in gets its full replay too, under its anonymous id (replay_), when its app
    // applied an older rules version.
    const out = {ok: true, log: true};
    TIM_.op = 'anon save';  // v130: timed as a whole, to its reply (timEnd_)
    // Only the answers after the device's progress reset (p.reset, as resetOf_ reads a signed-in player's; Codex review #399).
    try { const rp = replay_('~anon ' + id, resetAt_(p.reset), typeof p.rv === 'number' ? p.rv : NaN, p.pt, p.start && typeof p.start === 'object' ? p.start : null); if (rp) out.replay = rp; } catch (err) {}
    // the other subjects' (replays_), each since its own reset with its own first-launch answer (sreset, sstart:
    // {subject: the device's reefid-sync-<subject>-reset and -start}), already under this lock.
    const rps = replays_('~anon ' + id, null, p.rvs, p.pt, {reset: p.sreset, start: p.sstart}, true); if (rps) out.replays = rps;
    return out;
  } finally { lock.releaseLock(); }
}
// Flood guard: a counter per key in the script cache for a 6-hour window. Call it under the script lock (doPost, anon_,
// logReports_ hold it), so a read and the write that follows are not interleaved with another request. Returns true (and counts nothing) when adding
// n would pass the limit; the first refusal of a window is written to the "Alerts" tab, so Pierre and agents see it.
function over_(key, limit, n){
  n = n || 1;
  const c = CacheService.getScriptCache(), w = Math.floor(Date.now() / 216e5), k = 'cap:' + key + ':' + w, v = Number(c.get(k) || 0);
  if (v + n > limit) {
    if (!c.get(k + ':alert')) { c.put(k + ':alert', '1', 21600); try { sheet_('Alerts', ['Time', 'Event']).appendRow([new Date(), safe_('limit reached: ' + key + ' (' + limit + ' per 6 h)')]); } catch (e) {} }
    return true;
  }
  c.put(k, String(v + n), 21600);
  return false;
}

// The app's core.js (progress engine, replayProgress), embedded by tools/sync_core.py: Code.gs reaches it as CORE_.
// Its own module object keeps its names out of this script's globals (TRUST, MEM... are Code.gs's own).
const CORE_ = (function () { const module = {exports: {}};
// BEGIN core.js (generated by tools/sync_core.py, do not edit)
// Pure functions shared by the app (app.js), the admin (admin.js) and the tests (node --test tests/*.test.js).
// No DOM, no globals of the app: in the browser they become globals (classic script), in Node module.exports.
(function (root) {
  // The organisation and the app's name, in one place (Pierre, 2026-11-03: the app was renamed IMR Reef ID, corals now,
  // fish and benthos next; he is thinking of open-sourcing the app for other organisations, docs/ROADMAP.md "Open source").
  // Pages built by JS read ORG; the static files (index.html, admin.html, privacy.html, manifest.webmanifest,
  // tools/og/og.html, README.md, the docs) are rewritten from it by tools/rename_app.py. The storage keys never depend on
  // it (KEYS below), so a fork renames the app without moving any player's data.
  const ORG = {short: 'IMR', name: 'Institute for Marine Research', app: 'IMR Reef ID', appShort: 'Reef ID'};
  // Storage keys (localStorage, sessionStorage): one app-wide prefix that names the app without the organisation, and is
  // distinct from other apps on the shared origin ppericard.github.io.
  //   reefid-<name>        stays on this device (sign-in record, caches, queues, the admin, the Lab);
  //   reefid-sync-<name>   travels with the player: progress files, the sheet's Data column (progress.js progData) and so
  //                        every device signed in to the account. What belongs to one group of organisms carries it:
  //                        reefid-sync-coral-progress now, reefid-sync-fish-progress beside it later.
  // A new key that should travel takes KEYS.SYNC; anything else stays on the device by default (nothing sent by mistake).
  const KEYS = {APP: 'reefid-', SYNC: 'reefid-sync-'};
  // rename-app: keep-begin
  // The names before 2026-11-03 (imr-coral-* travelled, the other imr-* stayed) and the new ones: exact names first, then
  // prefixes (ending in -). One table for the code (tools/rename_app.py reads it) and the players' devices (migrateKeys).
  const LEGACY_KEYS = [
    ['imr-coral-sync', 'reefid-account'],
    ['imr-coral-loaded', 'reefid-loaded'],
    ['imr-coral-progress', 'reefid-sync-coral-progress'],
    ['imr-coral-quiz', 'reefid-sync-coral-quiz'],
    ['imr-coral-intro', 'reefid-sync-coral-intro'],
    ['imr-coral-intro-offer', 'reefid-sync-coral-intro-offer'],
    ['imr-coral-reset', 'reefid-sync-coral-reset'],
    ['imr-coral-custom', 'reefid-sync-coral-custom'],
    ['imr-coral-rv', 'reefid-sync-coral-rv'],
    ['imr-coral-', 'reefid-sync-'],
    ['imr-', 'reefid-']
  ];
  // rename-app: keep-end
  // The new name of a key from before the rename, or null (a key that never had another name).
  const keyRename = k => {
    for (const [o, n] of LEGACY_KEYS) if (o.endsWith('-') ? k.startsWith(o) : k === o) return o.endsWith('-') ? n + k.slice(o.length) : n;
    return null;
  };
  // Its name before the rename (a travelling key only), for the sheet copies of withLegacy.
  const keyLegacy = k => {
    if (!k.startsWith(KEYS.SYNC)) return null;
    for (const [o, n] of LEGACY_KEYS) if (o.endsWith('-') ? k.startsWith(n) : k === n) return o.endsWith('-') ? o + k.slice(n.length) : o;
    return null;
  };
  // On a device, at start-up, before anything reads them (app.js and admin.js call it first): each old key moves to its
  // new name, unless the new one is already there (the new one is kept), then the old one goes. A key that cannot be
  // written (storage full) stays under its old name and is tried again at the next start. Returns the keys moved.
  function migrateKeys(s) {
    const old = [];
    try {
      for (let i = 0; i < s.length; i++) if (keyRename(s.key(i))) old.push(s.key(i));
    } catch (e) {}
    return old.filter(k => {
      try {
        const n = keyRename(k);
        if (s.getItem(n) === null) s.setItem(n, s.getItem(k));
        s.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    });
  }
  // The name a key had before the rename, or null (any key: the reverse of keyRename; a name that never existed, e.g. a
  // key added since, gives a name nothing holds).
  const keyBefore = k => {
    for (const [o, n] of LEGACY_KEYS) if (n.endsWith('-') ? k.startsWith(n) : k === n) return n.endsWith('-') ? o + k.slice(n.length) : o;
    return null;
  };
  // A key's value read from a Storage, under its old name when the new one is absent (Codex review #439): a key the
  // migration could not write (storage full) stays under its old name until a later start moves it, and the player's
  // progress must not look empty meanwhile. The app's and the admin's store.get read through it.
  function keyGet(s, k) {
    const v = s.getItem(k);
    if (v !== null) return v;
    const o = keyBefore(k);
    return o ? s.getItem(o) : null;
  }
  // Every key that travels with the player (KEYS.SYNC), from a Storage, as {name: value}: progress files, the sheet's
  // Data (progress.js progData). A travelling key still under its old name (a migration that could not write it yet)
  // counts under its new name, the new one winning (Codex review #439: a save must not leave out a record whose move is
  // pending, nor a backup).
  function travelData(s) {
    const raw = {};
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k.startsWith(KEYS.SYNC) || (keyRename(k) || '').startsWith(KEYS.SYNC)) raw[k] = s.getItem(k);
      }
    } catch (e) {}
    return keysIn(raw);
  }
  // Keys to remove, with their old names (sign-out): a key left under its old name by a migration that could not write
  // it would otherwise sign the player back in at the next start, or hand their progress to the next player of the
  // device (Codex review #439).
  const withOldNames = L => [...new Set(L.flatMap(k => [k, keyBefore(k)].filter(Boolean)))];
  // Both storages of this page (a page with storage blocked moves nothing).
  function migrateStorage() {
    try {
      return [...migrateKeys(localStorage), ...migrateKeys(sessionStorage)];
    } catch (e) {
      return [];
    }
  }
  // idkey-migration: begin
  // One-shot move of this device's data to the names of 2026-11-04 (Pierre: the Coral Finder tool became the Coral ID
  // Key; the book keeps its name). Alpha (rule W3): no old name is read anywhere else; this moves the data
  // once and the code forgets them. The tool's keys reefid-finder-* become reefid-idkey-*, the admin's Sheets & ID Key
  // table reefid-admin-fcov reefid-admin-kcov, and page names stored inside values: the photo size per page
  // (reefid-sync-size), the Lab votes per tool (reefid-lab-votes), the admin's remembered views (reefid-admin-view,
  // -sub). Idempotent: once nothing is left under an old name it changes nothing (a value the sheet sends back from
  // before is moved at the next start). app.js and admin.js run it at start-up, after migrateStorage. Delete it (and
  // its test, tests/idkey.test.js) once every device has started the renamed app. Returns the keys it wrote.
  const IDKEY_OLD = {finder: 'idkey', 'lab-finder': 'lab-idkey', '~fcov': '~kcov'};
  function migrateIdKey(s) {
    try {
      s = s || localStorage; // storage blocked: nothing to move
    } catch (e) {
      return [];
    }
    const done = [],
      move = (o, n) => {
        const v = s.getItem(o);
        if (v === null) return;
        if (s.getItem(n) === null) s.setItem(n, v);
        s.removeItem(o);
        done.push(n);
      },
      edit = (k, f) => {
        const v = s.getItem(k);
        let o;
        try {
          o = JSON.parse(v);
        } catch (e) {}
        if (!isObj(o)) return;
        const w = JSON.stringify(f(o));
        if (w !== v) (s.setItem(k, w), done.push(k));
      },
      // An object keyed by page or tool name: the old name's entry under the new one, unless the new one is set.
      names = o => {
        Object.keys(IDKEY_OLD).forEach(a => {
          if (!Object.prototype.hasOwnProperty.call(o, a)) return;
          if (!Object.prototype.hasOwnProperty.call(o, IDKEY_OLD[a])) o[IDKEY_OLD[a]] = o[a];
          delete o[a];
        });
        return o;
      },
      // An object whose values are page names.
      values = o => {
        Object.keys(o).forEach(
          k => typeof o[k] === 'string' && Object.prototype.hasOwnProperty.call(IDKEY_OLD, o[k]) && (o[k] = IDKEY_OLD[o[k]])
        );
        return o;
      };
    try {
      const keys = [];
      for (let i = 0; i < s.length; i++) keys.push(s.key(i));
      keys.filter(k => k.startsWith('reefid-finder-')).forEach(k => move(k, 'reefid-idkey-' + k.slice(14)));
      move('reefid-admin-fcov', 'reefid-admin-kcov');
      edit('reefid-sync-size', names);
      edit('reefid-lab-votes', names);
      edit('reefid-admin-view', values);
      edit('reefid-admin-sub', values);
    } catch (e) {}
    return done;
  }
  // idkey-migration: end
  // A player's data from the sheet or a progress file, which may hold the old names (an app from before the rename
  // saved it), the new ones, or both (withLegacy): with the new names only, the new one winning.
  function keysIn(d) {
    const out = {};
    if (!isObj(d)) return out;
    Object.keys(d).forEach(k => keyRename(k) || (out[k] = d[k]));
    Object.keys(d).forEach(k => {
      const n = keyRename(k);
      if (n && !(n in out)) out[n] = d[k];
    });
    return out;
  }
  // What the app sends to the sheet: the new names plus a copy under the old ones, while a device of the same player may
  // still run an app from before the rename (it reads only the old names: without them it would merge its progress with
  // an empty record and lose the saved one). LEGACY_SEND goes to false once every device has the renamed app (with the
  // domain move, docs/ROADMAP.md); the sheet script reads either name (tools/sync/Code.gs dataKey_).
  const LEGACY_SEND = true;
  function withLegacy(d) {
    const out = {...(d || {})};
    if (LEGACY_SEND)
      Object.keys(d || {}).forEach(k => {
        const o = keyLegacy(k);
        if (o) out[o] = d[k];
      });
    return out;
  }
  // Lighter saves (sheet v116, docs/ROADMAP.md "Lighter saves on slow lines"; sync.js syncOnce, Code.gs doPost_): a
  // device that knows the saved copy at the revision it saves against sends only what changed since (dataDelta), and the
  // sheet rebuilds the whole copy from its own (dataPatch), keeping it only if it is exactly the copy the device holds
  // (dataSum, checked by both sides on the same spelling). A player's data is {key: the JSON text of its value}.
  const plain = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const jsonOf = s => {
    if (typeof s !== 'string') return undefined;
    try {
      return JSON.parse(s);
    } catch (e) {
      return undefined;
    }
  };
  // A key's value in one spelling whatever the order of its keys: its JSON read and spelled with every object's keys sorted
  // (canon, below), a text that is not JSON as it is.
  const valCanon = s => {
    const v = jsonOf(s);
    return v === undefined ? 's' + String(s) : 'j' + canon(v);
  };
  // Two texts of one key that say the same (a copy the sheet rebuilt from a delta spells its keys in its own order).
  const sameText = (a, b) => a === b || (typeof a === 'string' && typeof b === 'string' && valCanon(a) === valCanon(b));
  // The checksum of a player's data: a 53-bit hash of every key and its value's canon (cyrb53), with its length.
  function dataSum(d) {
    const t = Object.keys(d || {})
      .sort()
      .map(k => JSON.stringify(k) + '=' + valCanon(d[k]))
      .join('\u0000');
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0; i < t.length; i++) {
      const c = t.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + '.' + t.length.toString(36);
  }
  // What changed from base to now, key by key: null for a key gone, the new text for a key replaced, and for a key whose
  // value is an object on both sides (a subject's progress: one record per unit), {p: the entries changed, d: the ones
  // gone} when that is shorter than the text itself.
  function dataDelta(base, now) {
    const out = {};
    base = base || {};
    now = now || {};
    Object.keys(base).forEach(k => !(k in now) && (out[k] = null));
    Object.keys(now).forEach(k => {
      if (base[k] === now[k]) return;
      const a = jsonOf(base[k]),
        b = jsonOf(now[k]);
      if (plain(a) && plain(b)) {
        const p = {},
          d = Object.keys(a).filter(u => !(u in b));
        Object.keys(b).forEach(u => JSON.stringify(a[u]) !== JSON.stringify(b[u]) && (p[u] = b[u]));
        const o = d.length ? {p, d} : {p};
        if (JSON.stringify(o).length < String(now[k]).length) return void (out[k] = o);
      }
      out[k] = now[k];
    });
    return out;
  }
  // base with delta applied (dataDelta); null when the delta does not fit it (a patch on a key that is not an object).
  function dataPatch(base, delta) {
    const out = {...(base || {})};
    if (!plain(delta)) return null;
    for (const k of Object.keys(delta)) {
      const x = delta[k];
      if (x === null) delete out[k];
      else if (typeof x === 'string') out[k] = x;
      else if (plain(x) && plain(x.p) && (x.d === undefined || Array.isArray(x.d))) {
        const v = jsonOf(out[k]);
        if (!plain(v) || Object.keys(x.p).includes('__proto__')) return null;
        (x.d || []).forEach(u => delete v[String(u)]);
        Object.keys(x.p).forEach(u => (v[u] = x.p[u]));
        out[k] = JSON.stringify(v);
      } else return null;
    }
    return out;
  }

  // Subjects (the taxon model, Pierre 2026-11-03: "fish in the app on the same engine as corals, cleanly", with a Corals /
  // Fish selector): what the game teaches. The engine (model.js, quiz.js, progress.js) works on one subject at a time,
  // the current one (app.js SUBJ): its units (coral genera, fish teaching entries), their records (app.js GX), its
  // progress P and quiz settings Q under its own keys. Everything a subject differs in is a field here (data) or a
  // function of app.js UNITS (what reads the subject's data); the engine never names a subject.
  //   id      key part: reefid-sync-<id>-progress, -quiz, -intro, -intro-offer, -reset (subjKey; rule W21)
  //   dev     its device-only keys: reefid-<dev><name> (subjDev): '' for corals, whose keys predate subjects
  //   base    the sign-in record's fields for the progress last sent or received ([base, pending], sync.js mergeSaved)
  //   name, one, many, what, lecture: words of the interface (Corals; genus, genera; Coral to identify; the IMR coral
  //           lecture). Names of units: app.js uname (a genus in italics, a fish entry by its IMR name)
  //   icon    its icon in the subject switches, the app's (app.js subjIcon) and the admin's (admin.js): SVG inside a
  //           24 px viewBox, the one icon set (a branching coral, a fish)
  //   beta    a subject still in beta: {kick, line}, Home's Learn door top line and description once it is chosen (line:
  //           HTML), and a "beta" tag on its buttons. The label only: who sees the subject is open
  //   open    who the subject opens to (subjGroup): 'all' (the default, the corals: every player, signed out included) or
  //           'group' (the admin and the players of its group, picked in the admin's Players: app.js subjOpen, sheet v48
  //           Code.gs groupIds_). Opening fish to everyone is this one field (docs/ARCHITECTURE.md "Beta")
  //   card    the kind of its first-meeting card (app.js CARD_KINDS: its emoji)
  //   remote  its photos are iNaturalist's, not the site's (the fish stopgap, tools/fish_photos.py): preloaded all the same
  //   views   the views a question may show, [code, label] (one view: one photo per question)
  //   optin   the opt-in choices: Q[k] true = on, Q[k + 'T'] when chosen, and for a part of the slate opened by choice
  //           Q[k + 'N'] its "Not now" count, Q[k + 'A'] the answer count at the last one (app.js UNITS[id].sets: units
  //           off the slate, card, ⚙ row; UNITS[id].opens: slate units that open once on, card, My progress button)
  //   rank    the rank its units are asked at (a unit's own rank, app.js rankOf, wins: a fish scientific genus): logged
  //           with every answer (sheet v60 Answers Rank). Every subject's answers go to the sheet's Answers tab under its
  //           id (Pierre, 2026-11-06: fish answers logged from the first second, at whatever rank was asked)
  //   replay  the sheet computes from its logged answers: photo ratings, confusions, the opening hold, the full replay
  //           of its progress (Code.gs answerRows_ keeps only its rows); the others are logged only, for later
  //   ach     it has achievements: achs() its list (core.js ACH, FISH_ACH), all in the one synced record (progress.js
  //           ACHK) under ids of their own; achFeats: its answers keep the record's feats (runs, corallites, hard photos)
  //   board   it has its own leaderboard (sheet v95: Code.gs board_ &s=<id>), by its % then its Elo
  //   progress    the views of My progress (progress.js quizBoard), the first by default
  //   pv      the prefix of its page names in the visit log (pageName: '' for corals, 'fish.' for fish: fish.practice.quiz)
  //   hash    the prefix of its addresses, in the app and the admin ('' for the corals, 'fish/': #fish/practice/quiz,
  //           #fish/inbox/todo/reports; routeOut, routeIn, admin.js subjOfHash)
  //   zoom    what the "Did you know?" zoom tip asks to look at closely (tips.js; fish: no claim about what tells
  //           them apart)
  //   tiers   its photo sources rank its photos (rule P1: IMR lecture photos, then Pierre's own, then other observers):
  //           the draw's bonus for a core photo never seen (app.js isCore, model.js photoSet). Off for fish (Pierre,
  //           2026-11-06: his photos are never forced or boosted; the ease and reference look place them, core.js easyRank)
  //   calib   the difficulty engine's calibration for its photos (Pierre, 2026-11-06 14:18: one engine, its calibration may
  //           differ per subject), over CALIB (calibOf): ease, the logits one judged ease point moves a photo's prior
  //           difficulty (model.js photoDiff); ref, how many times more a never-seen reference-level photo weighs in the
  //           draw (core.js refLevel, model.js photoSet); early, how many logits lower the draw aims on a unit with no
  //           answer yet, fading with its answers (model.js photoSet: the easy photos favoured at the start, no wall);
  //           u, how unsure the difficulty of a photo nobody has answered is (variance, model.js calSd: the targeting is
  //           that much wider for it, narrowing as answers come); pool, the number of observations a unit's draw floor
  //           is shared over (model.js photoSet: each observation keeps PICKD.FLOOR of the best one's weight, times
  //           pool / observations when a unit has more, so a big pool's floor weighs no more than a pool-sized one's).
  //           The corals keep the defaults (their photos carry no judged ease; early 0: their target as before; no u,
  //           model.js CAL.U, and an unbounded pool: their draw as before)
  //   pages   the pages of the Learn and Practice sections it has (app.js MODES; sheet = a genus sheet, page key g-<Genus>); the others,
  //           Identify and the Tools are the corals' for now
  //   pool    where its game photos come from, for the sheet's photo exposure per player (Code.gs pools_, core.js
  //           unitPool; Pierre, 2026-11-06, Q191): files, the site's files it reads (fetched from main, in this order),
  //           and of, the builder of POOLS that turns them into its units' game photos, as the app's games draw them
  // The fish units renamed (Pierre, 2026-11-06 13:04: the game's units are the book's families, genera and species, not
  // the IMR entries; docs/reviews/2026-11-06-fish-units-plan.md): each old teaching-entry id (t01) and the family that
  // took it over (fish.json families: the family holding most of its species); split: the genera of an entry that went
  // to another family (Diploprion: the Soapfishes, not IMR's Groupers); names: each family's name. Read through the
  // subject (SUBJECTS renamed: renamedId, renameUnits, renameLogEntry), never by name; tests/fishrename.test.js checks it
  // against fish.json. Kept while old ids may still arrive (an app from before the switch, a saved copy, the log).
  const FISH_RENAMED = {
    ids: {
      't01': 'f:Damselfishes',
      't02': 'f:Butterflyfishes',
      't03': 'f:Angelfishes',
      't04': 'f:Spadefishes',
      't05': 'f:MoorishIdol',
      't06': 'f:Surgeonfishes',
      't07': 'f:Rabbitfishes',
      't08': 'f:Parrotfishes',
      't09': 'f:Wrasses',
      't10': 'f:Snappers',
      't11': 'f:Emperors',
      't12': 'f:CoralBreams',
      't13': 'f:Groupers',
      't14': 'f:Sweetlips',
      't15': 'f:Anthias',
      't16': 'f:Fusiliers',
      't17': 'f:Boxfishes',
      't18': 'f:Goatfishes',
      't19': 'f:Triggerfishes',
      't20': 'f:Puffers',
      't21': 'f:Filefishes',
      't22': 'f:Lionfishes',
      't23': 'f:Soldierfishes',
      't24': 'f:Cardinalfishes',
      't25': 'f:Squirrelfishes',
      't26': 'f:Lizardfishes',
      't27': 'f:Sandperches',
      't28': 'f:Barracudas',
      't29': 'f:Jacks',
      't42': 'f:Morays',
      't43': 'f:GardenEels',
      't44': 'f:Stingrays',
      't45': 'f:Scorpionfishes',
      't46': 'f:Pipefishes',
      't47': 'f:Frogfishes',
      't48': 'f:GhostPipefishes',
      't49': 'f:SnakeEels',
      't50': 'f:Porcupinefishes',
      't51': 'f:WhaleSharks',
      't52': 'f:Stonefishes',
      't54': 'f:Dragonets',
      't57': 'f:SeaMoths',
      't58': 'f:Jawfishes',
      't59': 'f:FlyingGurnards',
      't60': 'f:Threshersharks',
      't61': 'f:Stargazers',
      't63': 'f:RequiemSharks'
    },
    split: {
      't13': {'Diploprion': 'f:Soapfishes'},
      't46': {'Hippocampus': 'f:Seahorses'},
      't52': {'Ablabys': 'f:Waspfishes', 'Paracentropogon': 'f:Waspfishes'}
    },
    names: {
      'f:Damselfishes': 'Damselfishes',
      'f:Butterflyfishes': 'Butterflyfishes',
      'f:Angelfishes': 'Angelfishes',
      'f:Spadefishes': 'Spadefishes',
      'f:MoorishIdol': 'Moorish Idol',
      'f:Surgeonfishes': 'Surgeonfishes',
      'f:Rabbitfishes': 'Rabbitfishes',
      'f:Parrotfishes': 'Parrotfishes',
      'f:Wrasses': 'Wrasses',
      'f:Snappers': 'Snappers',
      'f:Emperors': 'Emperors',
      'f:CoralBreams': 'Coral Breams',
      'f:Groupers': 'Groupers',
      'f:Soapfishes': 'Soapfishes',
      'f:Sweetlips': 'Sweetlips',
      'f:Anthias': 'Anthias',
      'f:Fusiliers': 'Fusiliers',
      'f:Boxfishes': 'Boxfishes',
      'f:Goatfishes': 'Goatfishes',
      'f:Triggerfishes': 'Triggerfishes',
      'f:Puffers': 'Puffers',
      'f:Filefishes': 'Filefishes',
      'f:Lionfishes': 'Lionfishes',
      'f:Soldierfishes': 'Soldierfishes',
      'f:Cardinalfishes': 'Cardinalfishes',
      'f:Squirrelfishes': 'Squirrelfishes',
      'f:Lizardfishes': 'Lizardfishes',
      'f:Sandperches': 'Sandperches',
      'f:Barracudas': 'Barracudas',
      'f:Jacks': 'Jacks',
      'f:Morays': 'Morays',
      'f:GardenEels': 'Garden Eels',
      'f:Stingrays': 'Stingrays',
      'f:Scorpionfishes': 'Scorpionfishes',
      'f:Pipefishes': 'Pipefishes',
      'f:Seahorses': 'Seahorses',
      'f:Frogfishes': 'Frogfishes',
      'f:GhostPipefishes': 'Ghost Pipefishes',
      'f:SnakeEels': 'Snake Eels',
      'f:Porcupinefishes': 'Porcupinefishes',
      'f:WhaleSharks': 'Whale Sharks',
      'f:Stonefishes': 'Stonefishes',
      'f:Waspfishes': 'Waspfishes',
      'f:Dragonets': 'Dragonets',
      'f:SeaMoths': 'Sea Moths',
      'f:Jawfishes': 'Jawfishes',
      'f:FlyingGurnards': 'Flying Gurnards',
      'f:Threshersharks': 'Thresher sharks',
      'f:Stargazers': 'Stargazers',
      'f:RequiemSharks': 'Requiem Sharks'
    }
  };
  const SUBJECTS = [
    {
      id: 'coral',
      dev: '',
      base: ['base', 'pending'],
      name: 'Corals',
      icon: '<path d="M12 21v-7M12 14c-3 0-5-2-5-5V6M12 14c3 0 5-2 5-5V4M7 9 4.5 7M17 8l2.5-2M12 14V9M12 9l-2-2.5M12 9l2-3"/>',
      one: 'genus',
      many: 'genera',
      what: 'Coral',
      // several: the report dialog's reason for a photo with more than one of them in frame (sync.js REP_WHY, "Several corals").
      several: 'corals',
      card: 'genus',
      lecture: 'the IMR coral lecture',
      pv: '',
      hash: '',
      zoom: 'the corallites, the detail that often tells look-alikes apart',
      views: [
        ['wide', 'Colony'],
        ['medium', 'Close-up'],
        ['macro', 'Corallites']
      ],
      optin: ['bon'],
      rank: 'genus',
      replay: true,
      pool: {files: ['data.json', 'curation.json'], of: 'slots'},
      tiers: true,
      ach: true,
      // Its achievements (core.js ACH; a function: the list is defined below) and whether its answers keep the feats of the
      // shared record (runs, corallites, hard photos: progress.js achAfter).
      achs: () => ACH,
      achFeats: true,
      board: true,
      // Its Analyses report (admin Analyses, tools/analyses.js; one report per subject, refitted every 1000 of its answers:
      // Pierre, 2026-11-08). photos: its photos' features, read by What makes a photo hard (analysis.js photoMeta: view,
      // quality, sharpness, source, from data.json, curation.json, quality.json and metrics.json). The admin's words for
      // its units are its one and many.
      analyses: {photos: true},
      // basics: Coral basics (proto/basics.js), step 0 of the Learn path, corals only.
      pages: ['basics', 'genera', 'sheet', 'cmp', 'quiz', 'quiz-custom', 'quiz-duel', 'pairs'],
      progress: ['slate', 'photos', 'groups'],
      // The first-launch question (CHOICE below): its words for this subject, one [answer, line] per CHOICE.opts id.
      start: {
        q: 'How well do you know corals?',
        opts: {
          new: ['I’m new to corals', 'Start from scratch: the app shows you the basics first.'],
          imr: ['I had the IMR coral course', 'You have met the genera in the IMR lecture.'],
          know: ['I know corals well', 'At IMR or elsewhere: you can already name many genera.']
        }
      },
      // The admin's part (admin plan PR 2, Pierre 2026-11-04: one Corals | Fish switch for the whole admin; its address
      // prefix is the subject's hash): cur: its part of curation.json ('' = the top level, as before); pages: the admin
      // pages it has (null = every page; a page covers the addresses under it).
      // For the one filter bar of every photo page (admin plan PR 3, admin.js fbar): origins, where its photos come
      // from, [key, name, short name] in the order of the chips (admin.js origin(p) gives a photo's key); csrc, the
      // sources of its Candidates swiper.
      admin: {
        cur: '',
        pages: null,
        origins: [
          ['imr', 'IMR lecture', 'IMR'],
          ['own', 'Pierre', 'Pierre'],
          ['dauin', 'iNat Dauin', 'Dauin'],
          ['ph', 'iNat Philippines', 'PH'],
          ['world', 'iNat elsewhere', 'World']
        ],
        csrc: ['own', 'dauin', 'ph']
      }
    },
    {
      id: 'fish',
      dev: 'fish-',
      base: ['fbase', 'fpending'],
      name: 'Fish',
      icon: '<path d="M3 12c3-5 9-6.5 13-3.5L21 5v14l-5-3.5C12 18.5 6 17 3 12z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/>',
      one: 'family',
      many: 'families',
      what: 'Fish',
      several: 'fish species',
      card: 'fish',
      lecture: 'the IMR fish presentation',
      pv: 'fish.',
      hash: 'fish/',
      zoom: 'the markings and the fins',
      // A word a typed name may leave out (core.js fishTypeNames): "trigger" for Triggerfish.
      typeDrop: 'fish',
      remote: true,
      // In beta (2026-11-04: Pierre promised the beta players "something fishy is coming"): said on its buttons and, once
      // chosen, on Home (home.js: "Something fishy…" and this line, HTML).
      beta: {
        kick: 'Something fishy…',
        line: '<b>Fish is in beta</b>: the reef fish families, iNaturalist photos for now. Feedback welcome.'
      },
      // Opens to every player, signed out included, the beta label kept (Pierre, 2026-11-06, Q158: "open fish to everyone
      // now"; it opened to the admin and a beta group picked in the admin's Players from 2026-11-04). 'group' would close
      // it to that group again (the sheet keeps the Groups tab's rows).
      open: 'all',
      views: [['wide', 'Photo']],
      // sci: the scientific genera (app.js fishGenera, docs/FISH_PATH.md "Levels"). beyond: circle 3, the families beyond
      // the IMR course, on the path and in the % but opened by the player's choice (app.js UNITS fish opens; Pierre,
      // 2026-11-07 08:50, Q204). The circles 2 and 3 were opt-in sets (c2, c3) until Q175 (2026-11-06): a stored c2 / c3
      // choice is not read, so a "no" given to the old offer (circle 3 then outside the %) is not taken for this one.
      optin: ['sci', 'beyond'],
      // family: a family of the book (the game's family level, f:Damselfishes: Pierre, 2026-11-06; the IMR course a tag).
      rank: 'family',
      renamed: FISH_RENAMED,
      replay: false,
      // Its progress replayed by the sheet from its own answers too (Pierre, 2026-11-08: "recalculate every player's
      // progress from their answers"; ROADMAP "Fish progress replayed from the answer log"): by the sync script
      // (Code.gs replay_ per subject, its units from fish.json: fishReplayGen), served beside the corals' replay
      // (replays: {fish: ...}) to an app that asks for it (rvs: {fish: its rules version applied}). replay stays the
      // corals': the subject the sheet rates photos, counts confusions and holds the opening from. gen: the units the
      // replay reads, from the subject's first pool file (fish.json). rvs: its own rules versions (FISH_RVS, rvsOf), so a
      // change to its replay never replays the corals again (the integrator, 2026-11-08: no card to a coral player for it).
      // No floor: the log is the only reference, a fish bar may go down (Pierre, 2026-11-09, Q330).
      replayed: {gen: F => fishReplayGen(F), rvs: () => FISH_RVS},
      pool: {files: ['fish.json', 'fish-photos.json', 'fish-game.json', 'curation.json'], of: 'entries'},
      // Its own achievements (Pierre, 2026-11-04: about 14 general fish achievements; core.js FISH_ACH), in the shared
      // record under ids of their own, never counted in the corals'.
      ach: true,
      achs: () => FISH_ACH,
      // Its own leaderboard (Pierre, 2026-11-04: separate per subject, no merged ranking): by its %, then its Elo (sheet
      // v95, Code.gs board_ &s=fish; progress.js loadBoard).
      board: true,
      // Its Analyses report (Pierre, 2026-11-08: "fish when the fish analyses exist"; one report per subject, refitted every
      // 1000 fish answers): its units are what the questions ask, families and scientific genera as the fish tree has
      // them (one, many: the admin's words for them on its Analyses pages). photos false: no photo features of its own in
      // the analyses yet (its judged ease, phase and framing are not read), so What makes a photo hard is not among its
      // admin pages.
      analyses: {photos: false, one: 'family or genus', many: 'families and genera'},
      // Its global score (Pierre, 2026-11-04 the formula, 2026-11-08 Q242 the commonness weights and the square-root
      // display; docs/FISH_PATH.md "My progress (fish)"): core.js treeScore over its tree (app.js UNITS fish tree), shown
      // as its headline % (model.js headPct: the header, My progress, the leaderboard, the fish % achievements) with its
      // components (My progress's bars). The one switch: without it the headline is the families' mean again (progPct),
      // and the rules that read it go back with it (app.js fishGate).
      score: {entries: 0.25, a: 11 / 15, b: 0.8, half: 0.5, pow: 0.5},
      // Reference-level photos first in the draw (Pierre, 2026-11-06: a new entry starts on reference photos, never only
      // them); the judged ease's prior as measured (CALIB.ease). Q186 (Pierre, 2026-11-06 15:33: the easy photos strongly
      // favoured whatever the pool size): u 0.25, an unanswered photo's prior trusted to one ease step's spread (0.5²,
      // CALIB.ease squared: every fish photo carries a judged ease); pool 30, the floor shared over 30 observations (a
      // species' candidate cap), so a pool of 1,000 photos favours its easy ones as a pool of 30 does
      // (tools/fish_draw_sim.js; docs/LEARNING.md "The fish draw in big pools").
      calib: {ref: 3, early: 1.5, u: 0.25, pool: 30},
      pages: ['genera', 'sheet', 'quiz'],
      // Its sheets (learn.js viewFishSheet; docs/reviews/2026-11-05-fish-sheets-study.md, option B): one per family of the
      // identification key, genus and species, each in its address's word with the prefix of its id (fish.json ids
      // f:Damselfishes, g:Chromis; a species by its name, s:Chromis ternatensis): #fish/learn/genus/Chromis.
      sheets: {family: 'f:', genus: 'g:', species: 's:'},
      progress: ['photos'],
      // The fish welcome question (Pierre, 2026-11-04, docs/FISH_PATH.md "The fish welcome question and the IMR answer"):
      // the coral question's twin, the same three answers' variables for now (CHOICE.opts; fish values from learnsim fish
      // profiles later). No Fish basics yet (pages): "new" offers none until it exists.
      start: {
        q: 'How well do you know reef fish?',
        opts: {
          new: ['I’m new to reef fish', 'Start from scratch: a few easy families first.'],
          imr: ['I’m at IMR (Research Assistant programme)', 'You are learning the IMR survey families.'],
          know: ['I know reef fish well', 'A diver or a guide: you can already name many families.']
        }
      },
      // The pages not about one subject (players' reports, the devices' errors, the players and their journeys) and the
      // fish pages the admin plan has built so far (docs/ROADMAP.md "Admin for every subject"): Tree, Candidates (PR
      // 5a, admin-fish.js).
      // origins: no IMR photos for fish (Pierre, 2026-11-04), iNaturalist only: Pierre's own, then by place.
      admin: {
        cur: 'fish',
        pages: [
          'inbox/todo/reports',
          'inbox/todo/errors',
          // Health (fish admin at parity, 2026-11-08): the fish photos everyone misses, with the tools of their family's
          // page, and the fish units players are stuck on (admin.js statsHealth, healthBad, healthGenera)
          'inbox/todo/health',
          'inbox/coverage/games',
          'players/list',
          'photos/tree',
          'photos/candidates',
          'photos/review/ease',
          'photos/review/phase-framing',
          'photos/look-alikes',
          // Its Analyses report's views (admin-analyses.js; one report per subject): every view of the stored report but
          // What makes a photo hard (analyses photos false), and of the views drawn from the live answer log (admin.js
          // LIVE_STATS) only Stops, from the fish answers (fish admin at parity, 2026-11-08: admin.js statsHealth,
          // healthSheets), not Pairs or Answer log.
          'analyses/overview',
          'analyses/speed',
          'analyses/difficulty/formats',
          'analyses/difficulty/mix-ups',
          'analyses/difficulty/time',
          'analyses/learning/practice',
          'analyses/learning/after-a-break',
          'analyses/learning/sessions',
          'analyses/learning/profiles',
          'analyses/learning/stops'
        ],
        origins: [
          ['own', 'Pierre', 'Pierre'],
          ['dauin', 'iNat Dauin', 'Dauin'],
          ['ph', 'iNat Philippines', 'PH'],
          ['world', 'iNat elsewhere', 'World']
        ]
      }
    }
  ];
  // The subject chosen on this device (Home or the header), synced with the player's settings.
  const SUBJECT_KEY = 'reefid-sync-subject';
  const subjectOf = id => SUBJECTS.find(s => s.id === id) || SUBJECTS[0];
  // The difficulty engine's calibration (SUBJECTS calib): ease 0.5, one standard deviation of a photo's own difficulty
  // around its unit (the hierarchical photo Elo study, docs/LEARNING.md "Fish photos judged"); ref 1, no draw bonus;
  // early 0, no lean at the start; u unset, a photo nobody answered as unsure as model.js CAL.U says; pool unbounded,
  // every observation keeps the whole floor (model.js PICKD.FLOOR).
  const CALIB = {ease: 0.5, ref: 1, early: 0, pool: Infinity};
  const calibOf = s => ({...CALIB, ...((s && s.calib) || {})});
  const subjKey = (s, name) => KEYS.SYNC + subjectOf(s).id + '-' + name;
  const subjDev = (s, name) => KEYS.APP + subjectOf(s).dev + name;
  // A subject that opens to a group of players (SUBJECTS open: 'group'), not to everyone: the app, the admin and the sheet
  // keep a group for it (app.js subjOpen, admin.js groupOn, Code.gs groupIds_). Any other value opens it to all.
  const subjGroup = S => !!S && S.open === 'group';
  // The subject whose answers the sheet computes from (SUBJECTS replay: the corals): its replay, hold and photo ratings.
  const replaySubject = () => (SUBJECTS.find(S => S.replay) || SUBJECTS[0]).id;
  // The other subjects whose progress the sheet replays from their own answers (SUBJECTS replayed: fish), by id.
  const replayedSubjects = () => SUBJECTS.filter(S => !S.replay && S.replayed).map(S => S.id);
  // The subject of an answer: the app's log entry (s, from 2026-11-06; an entry without one came from the corals, the
  // only subject logged before), and of an answer-log row, at index LOG_SUBJ in both the sheet's readAnswers rows and
  // its Answers tab rows (sheet v60, column Subject; blank in the rows logged before: the default subject's).
  const LOG_SUBJ = 17;
  // The scoring record (core.js scoreRec; sheet v61, column Scoring, W) at index LOG_SC in the sheet's readAnswers rows,
  // its Answers tab rows and the replay rows (Code.gs rowOf_, logRow) alike.
  const LOG_SC = 22;
  const ansSubject = a => String((a && a.s) || '') || SUBJECTS[0].id;
  const rowSubject = r => String((r && r[LOG_SUBJ]) || '') || SUBJECTS[0].id;
  // A surprise card's answer (quiz.js winkShow; Pierre, 2026-11-08: logged like every other answer, and never counted):
  // mode WINK_MODE, the app's log entry (m) and an answer-log row alike (index LOG_MODE in the sheet's readAnswers rows,
  // its Answers tab rows and logRow's). No progress, ability, hold, replay, photo rating, confusion, exposure, count or
  // analysis reads one: subjRows and subjEntries leave them out, and so do the sheet's readers (Code.gs replayed_,
  // answers_, the Activity tab).
  const WINK_MODE = 'wink',
    LOG_MODE = 5;
  const winkEntry = a => !!a && String(a.m || '') === WINK_MODE;
  const winkRow = r => !!r && String(r[LOG_MODE] || '') === WINK_MODE;
  // The rows (or log entries, entries) of one subject, the replayed one by default: every reader of the answer log that
  // computes a subject's statistics (the analyses, the evaluation tools, the admin) keeps only that subject's rows, so a
  // fish answer never counts in a coral result; a surprise card's answer counts in none (winkRow, winkEntry).
  const subjRows = (rows, id = replaySubject()) => (Array.isArray(rows) ? rows : []).filter(r => r && rowSubject(r) === id && !winkRow(r));
  const subjEntries = (log, id = replaySubject()) =>
    (Array.isArray(log) ? log : []).filter(a => a && ansSubject(a) === id && !winkEntry(a));
  // How many answers each subject has in the answer log, {subject id: count}: its rows with a player (index 0, the name in
  // the Answers tab, the anonymous id in readAnswers) that subjRows keeps for it. The one count of a subject's answers
  // behind its Analyses refit, every 1000 answers of that subject (Pierre, 2026-11-08: the corals' count must not take
  // the fish answers): the sheet's head (Code.gs analyses_), the Action (tools/analyses.js) and the admin's status line.
  const subjCounts = rows => {
    const R = (Array.isArray(rows) ? rows : []).filter(r => r && r[0]);
    return Object.fromEntries(SUBJECTS.map(S => [S.id, subjRows(R, S.id).length]));
  };
  // A subject's first-launch answer (CHOICE): reefid-sync-<subject>-start, synced with the player's progress.
  const startKey = s => subjKey(s, 'start');
  // An answer's words for a subject (SUBJECTS start): [answer, line], null for an unknown answer.
  const startText = (s, c) => ((subjectOf(s).start || {}).opts || {})[c] || null;

  // Fish (fish.json, built by tools/build_fish.py; ARCHITECTURE.md "Fish content"). The game's family level = the book's
  // families (fish.json families, Pierre 2026-11-06: the game's units are the families, genera and species, not the IMR
  // entries; the IMR course a tag, imr), each made into a record the engine reads like a coral genus's (app.js GX): {id
  // (f:Damselfishes), name (the book's English name), fam (the line under it: scientific names, IMR's name), imr, look
  // (family ids), lk (how to tell each apart, IMR's words), qt (the IMR cues), group (its group in the identification key in force, fish.json
  // key: the index of a reef fish ID book for the Indo-Pacific; rule S3), forms (that group: the wrong choices
  // start in other groups, as coral growth forms), ig (the same group), cm (how common near Dauin), views {wide:
  // photos}, levels 1, circle, wink, names (accepted when typed)}. photos: fish-photos.json "photos" (old entry id -> photo
  // objects, each to its species' family).
  // key: the identification key in force ({id, region, cite (full), short}, null for a region with none) and groups its
  // groups in its order ({n, title, pages}).
  // c1 / c2 / c3 = the families of each circle (all on the path and in the progress since Pierre, 2026-11-06, Q175: app.js
  // UNITS fish slate, fishGate), winks = the wink entries (a surprise card, never a question of the game).
  // first: one of the starter core (fish.json start, Pierre 2026-11-04), opened before the others (model.js openPick).
  // views.wide in easyRank order (below; no licence in it: the draw reads it): the easiest, most reference-like photo
  // first, whoever took it; cover: the card's photo (app.js cover), the first of that order, an open licence breaking
  // ties (easyCover; Pierre, 2026-11-06: no source tier any more; 2026-11-08, Q270).
  // sheet: fish-photos.json "sheet" (species id -> photos), the sheet-only photos (Pierre, 2026-11-05: a species with no
  // game photo may keep one for its sheet, never in the quiz or any game, passing the game photo rules all the same;
  // tools/fish_photos.py SHEET).
  // A photo marked use: 'ref' (sheet only, the corals' word) never joins an entry's game photos, wherever it is listed:
  // every game draw reads views.wide (model.js photoSet, app.js fishGenera), so none can show it. The result's sheet
  // holds them by species ({species id: [photo]}), for a species sheet to show (none yet: docs/ARCHITECTURE.md "Fish content").
  const sheetOnly = p => !!p && p.use === 'ref';
  // The rights a photo comes with (Pierre, 2026-11-08, Q270: "à qualité égale", CC0 / CC BY and his own photos before
  // CC BY-NC, so the stock a later commercial app could use grows; the CC BY-NC photos stay fully usable): 'imr' an IMR
  // lecture photo, 'book' a Coral Finder book photo, 'own' Pierre's own (whatever its licence), 'open' CC0 or CC BY,
  // 'nc' the rest (CC BY-NC, or no licence read). licOf: the photo's licence code, its lic, else read from its credit a
  // ("(CC BY-NC-SA)" -> cc-by-nc-sa, "no rights reserved" -> cc0), null when neither says (IMR lecture, Coral Finder
  // book); the admin's presence.js licence. tools/rights.py is the Python copy of all three (tests/rights.test.js).
  // rightsRank is the tie-break key, last of an order between otherwise-equal photos and never above quality, ease or
  // variety (docs/rules/photos.md P1): 0 own or open, 1 the rest. Own and open rank alike, so his photos are never
  // boosted over another open one (P1, fish).
  function licOf(p) {
    if (!p) return null;
    if (p.lic) return String(p.lic).toLowerCase();
    const m = /\((CC0|CC[ -][A-Z -]+?)\)/.exec(p.a || '');
    if (!m) return /no rights reserved/i.test(p.a || '') ? 'cc0' : null; // iNaturalist's CC0 credit
    return m[1] === 'CC0' ? 'cc0' : 'cc-' + m[1].slice(3).toLowerCase().trim().split(/\s+/).join('-');
  }
  function rightsClass(p) {
    if (!p) return 'nc';
    if (p.imr) return 'imr';
    if (p.cf) return 'book';
    if (p.own) return 'own';
    return /^(cc0|cc-by)$/.test(licOf(p) || '') ? 'open' : 'nc';
  }
  const rightsRank = p => (/^(own|open)$/.test(rightsClass(p)) ? 0 : 1);
  // How much a judged photo looks like a reference photo (judging/FISH.md, its tags jt): REF.rep for the flag r (a
  // reference source shows it for the species: FishBase's main picture, iNaturalist's cover), then a point for each
  // field-guide trait (profile, whole fish, good light, no colour loss, sharp, large, one fish), a point off for a
  // juvenile, camouflage or out of the water. 0 for a photo with no tags. Ties only: the ease ranks first (easyRank).
  const REF = {rep: 8, good: ['p', '1', 'g', '0', 's', 'l', '1'], bad: 'jca'};
  function refScore(jt) {
    const c = String(jt || '');
    if (c.length < 7) return 0;
    const fl = c.slice(7).replace(/\d+$/, '');
    return (
      (fl.includes('r') ? REF.rep : 0) +
      REF.good.reduce((t, v, i) => t + (c[i] === v ? 1 : 0), 0) -
      [...REF.bad].filter(x => fl.includes(x)).length
    );
  }
  // The order a unit's photos are met in when the order matters (the card's photo, the list's first photo, the sheets),
  // Pierre, 2026-11-06: "the first photos a player sees, by whatever mechanism, must be easy, near-reference photos";
  // his own photos stay but are never forced or boosted, so the source never ranks. d(p): the photo's difficulty, lower
  // = easier: by default its judged ease (fish-photos.json e, judging/FISH.md; the curated ease once the game reads his
  // curation), a photo with none as a middle one (3); app.js passes model.js photoDiff, which blends the ease with the
  // players' answers once they are logged. Then the most reference-like (refScore), then a fixed hash of the photo's
  // file name: the list's order says who took a photo (tools/fish_photos.py lists Pierre's first), so it never decides.
  // A reference-level photo (refLevel, below) comes before every other photo (Pierre, 2026-11-06: a player starts an
  // entry on reference photos, never on one prolific observer's easy photos): the cover and each list's first photos;
  // the draw favours them too (model.js photoSet, SUBJECTS calib ref). The ease ranks within each of the two groups.
  // (a loop over the name's characters, as the spread [...f] read them, without building the array: easyRank hashes
  // every photo of a list, some 15,000 fish photos at each build; performance pass, 2026-11-09)
  const fHash = f => {
    let h = 2166136261;
    for (const c of String(f)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  // Reference level (Pierre, 2026-11-06 14:02: "reference photos" are every photo of reference quality, whoever took
  // it, not only a source's cover): a reference source's own photo (rep) judged very easy, or any photo judged ease 5
  // with the reference look in its tags (profile, whole, good light, true colours, sharp, large or medium, one fish or a
  // school of it; no juvenile, camouflage or out of water).
  const REF_LOOK = /^p1g0s[lm][1s]$/;
  // In both cases one kind of fish (count 1 or s): never a photo with other species in view (o, k, the legacy m) or an
  // unclear subject (x), rule P3 (Codex review #660; o is in play, not a reference: Q323).
  const refLevel = p =>
    !!p &&
    /^[1s]$/.test(String(p.jt || '').charAt(6)) &&
    (((p.e || 0) >= 4 && !!p.rep) || (p.e === 5 && REF_LOOK.test(String(p.jt || '').slice(0, 7)) && !/[jca]/.test(String(p.jt).slice(7))));
  const refFirst = p => (refLevel(p) ? 0 : 1);
  // Last before the hash, the rights (rightsRank, below): between otherwise-equal photos, an open licence or Pierre's own
  // first (Pierre, 2026-11-08, Q270). lic false leaves them out: the order the game's draw reads (views.wide), whose ties
  // decide model.js photoSet's variety cut, so the draw never reads a licence (Codex review #742); the card photo, the
  // first of the order with them (easyCover).
  function easyRank(L, d = p => -(p.e || 3), lic = true) {
    return (L || [])
      .map(p => ({p, t: refFirst(p), d: d(p), r: refScore(p.jt), l: lic ? rightsRank(p) : 0, h: fHash(p.f)}))
      .sort((a, b) => a.t - b.t || a.d - b.d || b.r - a.r || a.l - b.l || a.h - b.h)
      .map(x => x.p);
  }
  // A unit's card photo: the first of its photos in easyRank order, the rights breaking ties (Q270); null with none.
  const easyCover = (L, d) => easyRank(L, d)[0] || null;
  function fishGen(F, photos, sheet) {
    const gen = {},
      sp = new Map((F.species || []).map(s => [s.id, s])),
      start = new Set((F.start || []).map(id => FISH_RENAMED.ids[id] || id)),
      gens = new Map((F.genera || []).map(g => [g.id, g]));
    // The game photos by family: a photo goes to its species' family (fish-photos.json lists them by old entry id).
    const famOf = new Map();
    (F.families || []).forEach(f => f.species.forEach(id => famOf.set(id, f.id)));
    // The IMR entries teaching each family's species: their other common names (aka) and names in common use (often,
    // corrected gently: Clownfish for Anemonefish) stay accepted when typed (fish beta QA, #657).
    const teachOf = new Map();
    (F.teach || [])
      .filter(x => x.level === 1)
      .forEach(x =>
        (x.species || []).forEach(id => {
          const fid = famOf.get(id);
          if (fid) teachOf.set(fid, new Set([...(teachOf.get(fid) || []), x]));
        })
      );
    const byFam = {};
    Object.entries(photos || {}).forEach(([tid, L]) =>
      (L || []).forEach(p => {
        const fid = famOf.get(p && p.sp) || FISH_RENAMED.ids[tid];
        if (fid) (byFam[fid] = byFam[fid] || []).push(p);
      })
    );
    (F.families || []).forEach(t => {
      const dauin = (t.species || []).reduce((a, id) => a + (((sp.get(id) || {}).present || {}).dauin || 0), 0),
        imrGen = (t.genera || []).map(id => gens.get(id)).filter(g => g && g.imr);
      gen[t.id] = {
        id: t.id,
        name: t.name,
        // The line under its name: the scientific name or names (the book's family is not always one taxonomic family),
        // then IMR's name when it differs (the IMR tag), or the IMR entry that teaches its species.
        fam: [
          (t.sci || []).join(', '),
          t.imr && t.imr !== t.name ? 'IMR: ' + t.imr : '',
          t.imrWith ? 'IMR course: with the ' + t.imrWith : ''
        ]
          .filter(Boolean)
          .join(' · '),
        wfam: [],
        imrName: t.imr || '', // the IMR tag (IMR's name), read by the opening for "I'm at IMR" (model.js openPick)
        fish: 1,
        circle: t.circle,
        group: t.group || 0,
        ig: t.group || 0,
        forms: t.group ? ['g' + t.group] : [],
        look: [...new Set((t.look || []).map(([id]) => id).filter(id => id !== t.id))],
        lk: (t.look || []).map(([id, txt]) => [id, txt]),
        // Each look-alike line's source: the family's own (fish.json lsrc, Pierre's declared groups, #662), else the slides.
        lsrc:
          t.lsrc ||
          Object.fromEntries((t.look || []).map(([id]) => [id, 'IMR fish presentation' + (t.sl ? ', slide ' + t.sl.join(', ') : '')])),
        qt: t.cues && t.cues.length ? t.cues : null,
        sum: t.why || t.note || '',
        phase: t.phase || [],
        // The names IMR uses inside it (its sub-entries: Chromis, Anemonefish, Bannerfish...), each once.
        sub: [...new Set(imrGen.map(g => g.imr))],
        cm: Math.round(Math.sqrt(dauin)),
        levels: 1,
        // nd: one of Pierre's own photos taken outside Dauin (the credit's "Dauin" tag is for his Dauin photos).
        views: {
          wide: easyRank(
            (byFam[t.id] || [])
              .filter(p => p && p.f && p.src && !sheetOnly(p))
              .map(p => (p.own && p.loc && p.loc !== 'dauin' ? {...p, nd: 1} : p)),
            undefined,
            false
          )
        },
        ...(start.has(t.id) ? {first: 1} : {}),
        ...(t.wink ? {wink: t.wink, note: t.note || ''} : {}),
        names: fishNames(t, imrGen, [...(teachOf.get(t.id) || [])]),
        // Its scientific names among them (its own, its IMR genera's, its IMR entries' families): never read in an English
        // plural or singular (fishTypeNames; Codex review #834: "Amphiprions").
        // The names among them that designate part of it only (Pierre, 2026-11-09 ~15:45 Manila, Q333): an IMR genus or
        // sub-entry (Chromis, Anemonefish, Clownfish, Unicornfish), each with the species it designates (fishTypeNames sc).
        scopes: fishScopes(imrGen, [...(teachOf.get(t.id) || [])]),
        sciNames: [...new Set([...(t.sci || []), ...imrGen.map(g => g.name), ...[...(teachOf.get(t.id) || [])].map(x => x.fam)])].filter(
          Boolean
        ),
        ...([...(teachOf.get(t.id) || [])].flatMap(fishOften).length ? {oft: [...(teachOf.get(t.id) || [])].flatMap(fishOften)} : {})
      };
    });
    Object.values(gen).forEach(g => {
      if (g.views.wide.length) g.cover = easyCover(g.views.wide).f;
    });
    const ids = Object.keys(gen),
      play = n => !gen[n].wink,
      sh = {},
      shAdd = (id, p) => p && p.f && p.src && id && !(sh[id] = sh[id] || []).some(x => x.f === p.f) && sh[id].push({...p, use: 'ref'});
    Object.entries(sheet || {}).forEach(([id, L]) => (L || []).forEach(p => shAdd(id, p)));
    Object.values(photos || {}).forEach(L => (L || []).filter(sheetOnly).forEach(p => shAdd(p.sp, p)));
    return {
      gen,
      sheet: sh,
      c1: ids.filter(n => play(n) && gen[n].circle === 1),
      c2: ids.filter(n => play(n) && gen[n].circle === 2),
      c3: ids.filter(n => play(n) && gen[n].circle === 3),
      winks: ids.filter(n => !play(n)),
      key: F.key ? {id: F.key.id, region: F.key.region, cite: F.key.cite, short: F.key.short} : null,
      groups: (F.key && F.key.groups) || []
    };
  }
  // The fish units as the full replay reads them (core.js replayProgress gen: each unit's look-alikes and family line, for
  // the look-alike prior of a mix-up and the unit wrongly given): the families of fishGen and the scientific genera of
  // app.js fishGenera (a circle-1 family's genera with species of circle 1, each with its sibling genera as look-alikes
  // and its family's name and line as its family), from fish.json alone (no photo changes them). The sync sheet builds it
  // from fish.json (Code.gs fishGen_); tests/fishreplay.test.js checks it against the app's units.
  function fishReplayGen(F) {
    const X = fishGen(F || {}, {}),
      out = {},
      sp = new Map(((F && F.species) || []).map(s => [s.id, s])),
      gens = new Map(((F && F.genera) || []).map(g => [g.id, g]));
    Object.values(X.gen).forEach(g => (out[g.id] = {look: g.look.slice(), fam: g.fam}));
    ((F && F.families) || [])
      .filter(f => f.circle === 1 && X.gen[f.id])
      .forEach(f => {
        const E = X.gen[f.id],
          ids = (f.genera || [])
            .map(id => gens.get(id))
            .filter(G => G && (G.species || []).some(id => (sp.get(id) || {}).circle === 1))
            .map(G => G.id);
        ids.forEach(id => (out[id] = {look: ids.filter(o => o !== id), fam: E.name + (E.fam ? ' · ' + E.fam : '')}));
      });
    return out;
  }
  // The fish game photos (admin plan PR 7): the photos Pierre put in play in the admin's fish Candidates, downloaded to R2
  // (fish-game.json, tools/fish_game.py, run by the Candidate photos workflow after each Publish), take the place of the
  // stopgap list (fish-photos.json, remote iNaturalist photos) entry by entry.
  // fishOn(F, f, sid): photo f is in play for species sid, F being curation.json fish: add names sid, the photo is neither
  // rejected (seen) nor excluded, and its Not this (out), if set, names that same species (the admin's rule, Not this
  // coming with admin plan PR 5b; tools/fish_game.py fish_on is its copy).
  const fishOn = (F, f, sid) => {
    const o = ((F && F.out) || {})[f];
    return ((F && F.add) || {})[f] === sid && !(F.seen || {})[f] && !(F.exclude || {})[f] && (!o || o === sid);
  };
  // The count tag (judging/FISH.md "Tags", the code's 7th letter) and play: 1 one fish, s several of its kind, o other
  // species in view with no risk of taking one for the subject at the game's rank (in play), k other species one could
  // take for the subject at that rank (never in play: rule P3), x the subject not obvious; m, the one code for other
  // species before the split (Pierre, 2026-11-09, Q323), reads as not sorted yet, so as k until it is sorted.
  // FISH_COUNT.play: the counts an automatic route may put in play (autosort.js fishSure, tools/fish_game.py
  // judged_sure); FISH_COUNT.other: the counts never in play, whatever the route, Pierre's adds included.
  const FISH_COUNT = {play: '1so', other: 'km'};
  // fishCount(mine, pass): the count in force on a photo, from Pierre's tags (mine, curation.json fish tags) first, else
  // the pass's or the game record's (pass, a jt); his legacy m is refined by the pass's o or k (the re-judge of
  // 2026-11-09: judging/fish/*.json through suggest.json, which tools/fish_game.py writes into the game record's jt).
  // '' with no tag. tools/fish_game.py count_of is its copy.
  const fishCount = (mine, pass) => {
    const c = String(mine || '').charAt(6),
      q = String(pass || '').charAt(6);
    return c === 'm' && /^[ok]$/.test(q) ? q : c || q;
  };
  // A photo with other species one could take for its subject, or not sorted yet (k, m): never in play (rule P3).
  const fishOther = (mine, pass) => {
    const c = fishCount(mine, pass);
    return !!c && FISH_COUNT.other.includes(c);
  };
  // fishIn(F, p, gone): game record p (fish-game.json) is in play (Pierre, 2026-11-06, Q180 and Q199: one notion of "in
  // play", every fish photo in play hosted on R2): his own add (fishOn on its species), or a photo that entered by itself
  // (p.auto: a candidate judged sure, a reference photo judged at the reference level; tools/fish_game.py in_play) whose
  // photo id (fishPid) he did not reject, exclude or move with Not this (gone: those ids, fishGone; tools/fish_game.py
  // fish_in is its copy).
  // An automatic add of the auto-sort he undid counts as decided against too (its log code '-a...', autosort.js fishUndo:
  // "the photo waits for his decision"; Codex review #674). Never a photo whose count in force (fishCount: Pierre's tag,
  // his legacy m refined by the record's) is other species one could take for its subject (fishOther, Q323): the admin,
  // which reads his whole curation, passes his tag (mine), so it applies at once there; the players' curation leaves the
  // tags out (tools/curplay.py), so the app reads the record's jt, which tools/fish_game.py writes from his tag.
  const fishGone = (cur, F = (cur && cur.fish) || {}) =>
    new Set(
      [
        ...['seen', 'exclude', 'out'].flatMap(k => Object.keys(F[k] || {})),
        ...Object.values(F.auto || {}).flatMap(d => Object.keys(d || {}).filter(f => /^-a/.test(String(d[f])))),
        ...Object.keys((cur && cur.exclude) || {})
      ].map(f => fishPid(f))
    );
  // mine: Pierre's tag on the photo (curation.json fish tags), passed by the admin only (autosort.js fishGameIn).
  const fishIn = (F, p, gone, mine) => !!p && (fishOn(F, p.f, p.sp) || (!!p.auto && !gone.has(fishPid(p.f)))) && !fishOther(mine, p.jt);
  // A photo's identity across the lists (tools/fish_game.py pid): i + its iNaturalist photo id (stopgap fi<id>, candidate
  // fish-<species>-cand-<id>), b + its FishBase file stem (candidate fish-<species>-cand-fb-<stem>, reference or sheet
  // photo fb<stem>: Codex review #660, so Pierre's curation of a FishBase candidate applies to its reference copy too),
  // else its name.
  function fishPid(f) {
    const s = String(f),
      m = /^fi(\d+)$/.exec(s) || /-cand-(\d+)[cd]?$/.exec(s),
      b = /-cand-fb-(.+)$/.exec(s) || /^fb(.+)$/.exec(s);
    return m ? 'i' + m[1] : b ? 'b' + b[1] : s;
  }
  // fish-game.json's short form (Pierre, 2026-11-09: "observation id + extension instead of full URLs"; tools/fish_short.py
  // writes it, this is its copy): a record's o, an iNaturalist observation, as its id alone, and its src, the original on
  // iNaturalist's open-data bucket, as its extension alone when the photo is the record's own (the id in its name,
  // fishPid). fishGameRow gives a record its addresses back, keys in their order (the record as it was written before);
  // a record already whole (the file before the short form) is the same object. fishGameRead: the file, every record whole.
  // Every reader of fish-game.json reads it through fishGameRead: the app (fishLoad), the admin, the sheet's photo pools
  // (POOLS entries), the tools and the tests. A page of an older version that meets the short file keeps every photo (its
  // src is still set) but its fallback to the original and its observation link are broken until it updates.
  const FISH_OBS = 'https://www.inaturalist.org/observations/',
    FISH_ORIG = 'https://inaturalist-open-data.s3.amazonaws.com/photos/';
  const fishGameRow = p => {
    if (!p || typeof p !== 'object') return p;
    const id = (/^i(\d+)$/.exec(fishPid(p.f)) || [])[1],
      o = typeof p.o === 'string' && /^\d+$/.test(p.o),
      s = typeof p.src === 'string' && /^[a-z0-9]{2,5}$/.test(p.src) && !!id;
    if (!o && !s) return p;
    return {...p, ...(o ? {o: FISH_OBS + p.o} : {}), ...(s ? {src: FISH_ORIG + id + '/original.' + p.src} : {})};
  };
  const fishGameRead = G =>
    G && G.photos && typeof G.photos === 'object'
      ? {...G, photos: Object.fromEntries(Object.entries(G.photos).map(([t, L]) => [t, Array.isArray(L) ? L.map(fishGameRow) : L]))}
      : G;
  // An entry plays on its curated photos alone once it has MIN very easy ones (ease EASY or more: the easy photos the
  // draw favours at the start, judging/FISH.md), Pierre's minimum for every circle-1 entry (2026-11-04: at least 5 very
  // easy photos; tools/fish_judge.py WANT); with fewer, the stopgap's photos join its curated ones.
  const FISHPH = {MIN: 5, EASY: 4};
  // fishPhotos(stop, game, cur): {teaching id: [photo]}, what fishGen takes. stop: fish-photos.json photos; game:
  // fish-game.json photos (each with sp, the species it is in play for); cur: curation.json (or a draft), null when not
  // loaded yet. Pierre's curation applies at once, before the workflow runs again: a curated photo shows only while it is
  // in play (fishOn on its species) and not excluded for good (curation exclude, by name or photo id); a stopgap photo
  // never shows once Pierre rejected, excluded or moved (Not this) the same photo as a candidate, nor when the entry's
  // curated photos hold that photo or its observation. With no curation (not loaded), the lists as they are.
  // fish (fish.json, optional): an entry on its curated photos alone still keeps the stopgap's photos of every scientific
  // genus its curated photos do not cover (the genus: the species name's first word, as app.js fishGenera reads it), so
  // no genus unit loses its photos when its entry switches (Codex review #614).
  function fishPhotos(stop, game, cur, fish) {
    const F = cur && cur.fish,
      gname = new Map(((fish && fish.species) || []).map(s => [s.id, String(s.name || '').split(/\s+/)[0]])),
      genus = p => (p && p.sp && gname.get(p.sp)) || '',
      X = (cur && cur.exclude) || {},
      xid = new Set(Object.keys(X).map(fishPid)),
      gone = new Set(xid),
      out = {},
      cu = {},
      cid = new Set();
    if (F) ['seen', 'exclude', 'out'].forEach(k => Object.keys(F[k] || {}).forEach(f => gone.add(fishPid(f))));
    const autoGone = F ? fishGone(cur) : gone;
    Object.entries(game || {}).forEach(([t, L]) => {
      cu[t] = (L || []).filter(p => p && p.f && p.sp && (!F || fishIn(F, p, autoGone)) && !X[p.f] && !xid.has(fishPid(p.f)));
      cu[t].forEach(p => cid.add(fishPid(p.f)));
    });
    new Set([...Object.keys(stop || {}), ...Object.keys(cu)]).forEach(t => {
      const C = cu[t] || [],
        obs = new Set(C.map(p => p.o).filter(Boolean));
      // A stopgap photo with other species one could take for its subject stays out too (fishOther: its jt, Q323).
      const S = ((stop || {})[t] || []).filter(
        p => p && p.f && !gone.has(fishPid(p.f)) && !cid.has(fishPid(p.f)) && !(p.o && obs.has(p.o)) && !fishOther(null, p.jt)
      );
      if (C.filter(p => (p.e || 0) >= FISHPH.EASY).length < FISHPH.MIN) return (out[t] = [...C, ...S]);
      const have = new Set(C.map(genus));
      // The units' reference photos (tools/fish_refs.py, judged at the reference level: from) stay too (Pierre, 2026-11-06:
      // the covers and first photos are reference photos, whoever took them).
      out[t] = [...C, ...S.filter(p => p.from || (genus(p) && !have.has(genus(p))))];
    });
    return out;
  }
  // The names a family is known by, accepted when typed (rule S2): the book's name, IMR's (the IMR tag) and the parts of a
  // double one ("Surgeonfish & Unicornfish"), its scientific names, the names IMR uses inside it with their genera
  // (Chromis, Anemonefish, Amphiprion: a finer name, still right), and the other common names curated for the IMR entries
  // teaching its species or their sub-entries (T: aka, tools/fish_source.json, Tang; often: a name in common use that the
  // answer's feedback corrects gently, Clownfish for Anemonefish, fishOften), and the scientific families of those IMR
  // entries (fam: Holocentridae, Syngnathidae): one the book splits names each of its families, so typed it reads as all
  // of them (typeMatchIn shared), never as a slip of one of them (Holocentrinae). The first is the name shown.
  function fishNames(t, imrGen, T) {
    const parts = String(t.imr || '')
      .split(/\s*&\s*|\s+and\s+/)
      .filter(Boolean);
    return [
      ...new Set([
        t.name,
        t.imr,
        ...(parts.length > 1 ? parts : []),
        ...(t.sci || []),
        ...(imrGen || []).flatMap(g => [g.imr, g.name]),
        ...(T || []).flatMap(x => [
          x.fam,
          ...(x.aka || []),
          ...(x.often || []),
          ...(x.sub || []).flatMap(u => [...(u.aka || []), ...(u.often || [])])
        ])
      ])
    ].filter(Boolean);
  }
  // The names of part of a family (fishGen scopes): {name: [species ids]}, its IMR genera (their tag and scientific name:
  // the genus's species) and its IMR entries' sub-entries (their name and other names: the sub-entry's species).
  function fishScopes(imrGen, T) {
    const S = {},
      put = (x, L) => x && (L || []).length && (S[x] = [...new Set([...(S[x] || []), ...L])]);
    (imrGen || []).forEach(g => [g.imr, g.name].forEach(x => put(x, g.species)));
    (T || []).forEach(e => (e.sub || []).forEach(u => [u.name, ...(u.aka || []), ...(u.often || [])].forEach(x => put(x, u.species))));
    return S;
  }
  // The names in common use that a typed answer may give, accepted as right but corrected gently (Pierre, 2026-11-06,
  // Q164: "✓ Yes, Anemonefish (often called clownfish)"): [[the usual name, the name often used]], from the node's and
  // its sub-entries' often (tools/fish_source.json).
  const fishOften = t => [t, ...(t.sub || [])].flatMap(u => (u.often || []).map(x => [u.name, x]));
  // A whole name, normalised for typing (fish names have several words: "Moorish Idol"): letters only, lower case.
  const typeNormAll = s =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type for the fish entries gen (fishGen): [{k, g, old, alt}], old = the name typed when it is
  // not the entry's own (read as the entry), alt marks those as other names, not old ones. A name two entries share (a
  // family the book splits: Holocentridae = Soldierfishes and Squirrelfishes) names both (typeMatchIn shared).
  // drop (SUBJECTS typeDrop: 'fish'): a word a name may be typed without (Pierre, 2026-11-06: "trigger", "clown",
  // "damsel"), as its suffix, a separate word or a plural ("Triggerfish", "Trigger fish", "Triggerfishes" -> "Trigger"),
  // its own short form accepted as another name of the entry, unless it is ambiguous in the game: within the spelling
  // tolerance of a name or short form of another entry (then it is left out: typing it is no answer, as before).
  // A name in common use (fishOften: oft) carries oft: [usual name, the name often used], its short forms too.
  // Every name is also read in the other number (typeForms: "Grouper" for Groupers, "Goby" for Gobies, "Pipefish" for
  // Pipefishes), as the name itself: exactly, never as a spelling to fix, whatever other name it is close to.
  // known (fishNameIndex): the names below the entries, each read as the entry it lifts to (Peacock razorfish, Iniistius,
  // Anglerfish), and the words owned by none, read exactly as such ({known}, typeMatchIn), so a name the game knows is
  // never taken for a slip of another (Angelfishes).
  function fishTypeNames(gen, drop = '', known = []) {
    const out = [],
      // sc: the species a name designates when it names part of the unit only (Q333); one key of a unit read by two
      // names takes the wider (no sc: the whole unit; "Surgeonfish", the label's singular, over the sub-entry)
      add = (k, g, x, i, oft, sc) => {
        if (!k) return;
        const o = out.find(y => y.k === k && y.g === g);
        if (o) return typeWiden(o, sc);
        out.push({k, g, old: i ? x : '', alt: i ? 1 : 0, nm: x, ...(oft ? {oft} : {}), ...(sc ? {sc} : {})});
      },
      scOf = (g, x) => (g.scopes || {})[x],
      oftOf = (g, k) => (g.oft || []).find(([, o]) => typeNormAll(o) === k);
    Object.values(gen || {}).forEach(g =>
      (g.names || [g.name]).forEach((x, i) => add(typeNormAll(x), g.id, x, i, oftOf(g, typeNormAll(x)), scOf(g, x)))
    );
    const d = typeNormAll(drop);
    if (!d) return out;
    const cut = new RegExp("^([A-Za-z][A-Za-z '-]*?)[ -]*" + d + '(?:es)?$', 'i'),
      short = out
        .map(o => {
          const x = typeNormAll(o.old) === o.k ? o.old : (gen[o.g].names || [gen[o.g].name])[0],
            m = String(x || '').match(cut),
            k = m ? typeNormAll(m[1]) : '';
          // the short form and its plural, and the name's own plural or singular ("Triggers", "Triggerfishes",
          // "Frogfish": plain right answers, not spellings to fix)
          const one = o.k.endsWith(d + 'es') ? [o.k.slice(0, -2), x.replace(/es$/i, '')] : o.k.endsWith(d) ? [o.k + 'es', x + 'es'] : null;
          return m && k.length >= 3 && k !== o.k
            ? [
                {k, g: o.g, x: m[1].trim(), oft: o.oft, sc: o.sc},
                {k: k + 's', g: o.g, x: m[1].trim() + 's', oft: o.oft, sc: o.sc},
                ...(one ? [{k: one[0], g: o.g, x: one[1].trim(), own: !o.old, oft: o.oft, sc: o.sc}] : [])
              ]
            : [];
        })
        .flat(),
      near = (a, b) => typeDist(a, b) <= TYPE.tol(Math.min(a.length, b.length));
    short
      .filter(s => ![...out, ...short].some(o => o.g !== s.g && near(s.k, o.k)))
      .forEach(s => add(s.k, s.g, s.x, s.own ? 0 : 1, s.oft, s.sc));
    // The other number of every common name, as the name it comes from (its own name's: the unit's own, alt 0); never a
    // scientific name's (a unit of a scientific rank, a family's sciNames: Codex review #834, "Zebrasomas", "Halichoere"
    // were read exactly), which keeps its spelling step.
    Object.values(gen || {})
      .filter(g => !g.rank)
      .forEach(g =>
        (g.names || [g.name]).forEach(
          (x, i) =>
            !(g.sciNames || []).includes(x) &&
            typeForms(x).forEach(y => add(typeNormAll(y), g.id, y, i, oftOf(g, typeNormAll(x)), scOf(g, x)))
        )
      );
    typeKnown(out, known);
    typeOff(out, known);
    return out;
  }
  // One key of a unit read by two names: the wider of the two (no sc: the whole unit; else the species of both).
  function typeWiden(o, sc) {
    if (!o.sc) return;
    if (!sc) delete o.sc;
    else o.sc = [...new Set([...o.sc, ...sc])];
  }
  // Pierre's 'off' (curation.json fish.names, fishNameIndex: {x, off: family id}), applied once every name is in: no name
  // of that family, in either number, reads x any more, whatever brought it (a genus's common name, the family's own,
  // Chromis); the name is known (another unit's names, at any rank, still read before it: typeMatchIn).
  function typeOff(out, known) {
    (known || [])
      .filter(e => e.off)
      .forEach(e => {
        const ks = new Set([e.x, ...typeForms(e.x)].map(typeNormAll));
        for (let i = out.length - 1; i >= 0; i--) if (out[i].g === e.off && ks.has(out[i].k)) out.splice(i, 1);
        ks.forEach(k => !out.some(o => o.k === k && o.known) && out.push({k, g: '', old: e.x, alt: 1, known: 1, w: 1}));
      });
  }
  // The name index (fishNameIndex) into the typed names: a name with an owner, read as that family ({k, g, old, alt: 1,
  // vr: its role, n, of: how many of the family's species carry it; oft for a name Pierre marks "often"), in both numbers
  // for a word; a name with none, known ({k, g: '', known: 1, w: 1 for a word}), only where it is no unit's name.
  function typeKnown(out, known) {
    const have = new Set(out.filter(o => !o.known).map(o => o.k)),
      seen = new Set(out.map(o => o.k + '|' + o.g));
    (known || [])
      .filter(e => e.g)
      .forEach(e =>
        [e.x, ...(['ss', 'gs'].includes(e.vr) ? [] : typeForms(e.x))].forEach(y => {
          const k = typeNormAll(y);
          if (k.length < 3) return;
          if (seen.has(k + '|' + e.g)) {
            // already a name of that unit (Tang, Chromis): Pierre's "often" still applies to it (Codex review #834), and
            // the wider reading holds
            const o = out.find(x => x.k === k && x.g === e.g && !x.known);
            if (o && e.oft && !o.oft) o.oft = e.oft;
            if (o) typeWiden(o, e.sc);
            return;
          }
          seen.add(k + '|' + e.g);
          have.add(k);
          out.push({
            k,
            g: e.g,
            old: y,
            alt: 1,
            vr: e.vr,
            ...(e.n ? {n: e.n, of: e.of} : {}),
            ...(e.oft ? {oft: e.oft} : {}),
            ...(e.sc ? {sc: e.sc} : {})
          });
        })
      );
    (known || [])
      .filter(e => !e.g)
      .forEach(({x, w}) =>
        [x, ...typeForms(x)].forEach(y => {
          const k = typeNormAll(y);
          if (k.length >= 3 && !have.has(k)) (have.add(k), out.push({k, g: '', old: y, alt: 1, known: 1, ...(w ? {w: 1} : {})}));
        })
      );
  }
  // A name's last word in the other number, for typing (English: Groupers / Grouper, Gobies / Goby, Pipefishes /
  // Pipefish, Sweetlips / Sweetlip): [] for a scientific name (-idae, -inae) or a last word whose number is not plain
  // (Anthias, Chromis, Dascyllus: -as, -is, -us).
  function typeForms(x) {
    const m = String(x || '').match(/^(.*?)([A-Za-z]+)$/);
    if (!m || /i[dn]ae$/i.test(m[2])) return [];
    const [, a, w] = m,
      f = w.match(/fishes$/i)
        ? w.slice(0, -2)
        : w.match(/fish$/i)
          ? w + 'es'
          : w.match(/ies$/i)
            ? w.slice(0, -3) + 'y'
            : w.match(/(ch|sh|x|ss)es$/i)
              ? w.slice(0, -2)
              : w.match(/[^aeiou]y$/i)
                ? w.slice(0, -1) + 'ies'
                : w.match(/(ss|us|is|as)$/i)
                  ? ''
                  : w.match(/s$/i)
                    ? w.slice(0, -1)
                    : w.match(/(ch|sh|x)$/i)
                      ? w + 'es'
                      : w + 's';
    return f && f.length >= 3 ? [a + f] : [];
  }
  // The fish name index (Pierre, 2026-11-09, Q319, Q320; docs/reviews/2026-11-09-shared-common-names.md), for typed
  // answers (fishTypeNames known): each name below the family with the family it lifts to and its role (vr): 'sp' a
  // listed common name of a game species (fish.json cn, every spelling), 'ss' a species' scientific name (its PDF name
  // and WoRMS's), 'gs' a genus's scientific name, 'gc' a genus's common name, 'k' a kind word carried by at least 2 of
  // the family's species or all of them (fish.json vn, tools/fish_names.py: razorfish, toby), with n and of; a kind word
  // a family's species carry less than that ('w') is known, owned by none: never read as a slip of another family's
  // name. cur (curation.json fish.names, Pierre's exceptions, written only by the admin): {name: {family id: 'off' (not
  // that family's), 'on' (that family's, the name added or a known word given to it), 'often' (that family's, the
  // feedback naming the family gently: Q164)}}. [{x, g: family id or '', vr, n, of, oft, w}].
  function fishNameIndex(F, cur) {
    const out = [],
      fam = new Map(((F && F.families) || []).map(f => [f.id, f])),
      C = Object.fromEntries(Object.entries(cur || {}).map(([x, v]) => [typeNormAll(x), v || {}])),
      off = (x, g) => (C[typeNormAll(x)] || {})[g] === 'off',
      oft = (x, g) => ((C[typeNormAll(x)] || {})[g] === 'often' && fam.get(g) ? [fam.get(g).name, x] : null),
      put = (x, g, vr, n, of, sc) => {
        if (!x || !fam.has(g)) return;
        if (off(x, g)) return out.push({x, g: '', vr: 'w', w: 1, off: g});
        const o = oft(x, g),
          // Pierre's on or often gives the name to the whole family, whatever part it named (Codex review #834)
          whole = ['on', 'often'].includes((C[typeNormAll(x)] || {})[g]);
        out.push({x, g, vr, ...(n ? {n, of} : {}), ...(o ? {oft: o} : {}), ...(sc && sc.length && !whole ? {sc} : {})});
      };
    const game = ((F && F.species) || []).filter(s => s.circle && !s.out && s.family);
    game.forEach(s => {
      (s.cn || []).forEach(L => L.forEach(x => put(x, s.family, 'sp', 0, 0, [s.id])));
      [s.name, s.now].forEach(x => put(x, s.family, 'ss', 0, 0, [s.id]));
    });
    const inGame = new Set(game.map(s => s.genus));
    ((F && F.genera) || [])
      .filter(g => inGame.has(g.id))
      .forEach(g => (put(g.name, g.family, 'gs', 0, 0, g.species), put(g.common, g.family, 'gc', 0, 0, g.species)));
    // A kind word designates the species that carry it (Q333: "razorfish" on a cleaner wrasse is a mistake); Pierre's
    // on or often gives it to the whole family.
    ((F && F.vn) || []).forEach(([x, owners]) =>
      (owners || []).forEach(([g, r, n, of, sp]) => {
        const c = (C[typeNormAll(x)] || {})[g];
        put(x, g, 'k', n, of, c === 'on' || c === 'often' ? null : sp);
      })
    );
    // Pierre's own names (on), the index's or not.
    Object.entries(cur || {}).forEach(([x, v]) =>
      Object.entries(v || {}).forEach(([g, c]) => {
        if ((c === 'on' || c === 'often') && !out.some(e => e.g === g && typeNormAll(e.x) === typeNormAll(x))) put(x, g, 'cur');
      })
    );
    return out;
  }

  // A unit id the subject renamed (SUBJECTS renamed: a fish entry t01 → its family f:Damselfishes), else the id as it is.
  // sp: the species shown (a name, or names joined by ', '): the genus of the first one picks the family of an entry
  // that went to two (t13 with a Diploprion photo: the Soapfishes; any other: the Groupers).
  function renamedId(S, id, sp) {
    const R = S && S.renamed;
    if (!R || typeof id !== 'string' || !R.ids[id]) return id;
    const g = String(sp || '').split(/[\s,]+/)[0];
    return ((R.split || {})[id] || {})[g] || R.ids[id];
  }
  // The id of a sheet of subject S in its one spelling, or null when S has no such sheet. A subject without sheet ranks
  // (SUBJECTS sheets: the corals) takes any id as its unit's; one with them takes an id with one of their prefixes, an
  // old unit id renamed since first (renamedId: t01 → f:Damselfishes), so a link from a record written before the rename
  // still opens its sheet.
  function sheetIdOf(S, id) {
    const s = String(id == null ? '' : id);
    if (!S || !S.sheets) return s;
    const r = renamedId(S, s);
    return Object.values(S.sheets).some(p => r.startsWith(p) && r.length > p.length) ? r : null;
  }
  // The fish sheets (docs/reviews/2026-11-05-fish-sheets-study.md, option B, Pierre 2026-11-06) read from fish.json
  // alone: fam, gen and sp by id (the species of the families only, so none of those left out of the game), spOf (a
  // species by its id or its sheet id s:<name>) and order, the families in the key's order (its group numbers, then the
  // file's order; a family with no group last). go(id): the sheet a family, genus or species id opens, by option B:
  // a genus with one species opens that species' sheet; the only genus of its family has no page of its own (the family
  // sheet lists its species: the study's recommendation for one genus with several species); any other genus opens its
  // short page. null for an id it does not know.
  function fishTree(F) {
    const fam = {},
      gen = {},
      sp = {},
      byName = {};
    ((F && F.families) || []).forEach(f => (fam[f.id] = f));
    ((F && F.genera) || []).forEach(g => (gen[g.id] = g));
    ((F && F.species) || []).forEach(s => {
      if (!s.family || !fam[s.family]) return;
      sp[s.id] = s;
      byName[s.name] = s;
    });
    const order = Object.values(fam)
      .map((f, i) => [f, i])
      .sort((a, b) => (a[0].group || 99) - (b[0].group || 99) || a[1] - b[1])
      .map(x => x[0].id);
    const spOf = id => sp[id] || (String(id).startsWith('s:') ? byName[String(id).slice(2)] || null : null);
    const go = id => {
      if (fam[id]) return id;
      const s = spOf(id);
      if (s) return 's:' + s.name;
      const g = gen[id];
      if (!g || !fam[g.family]) return null;
      const L = (g.species || []).filter(x => sp[x]);
      if (L.length === 1) return 's:' + sp[L[0]].name;
      return fam[g.family].genera.length === 1 ? g.family : id;
    };
    return {fam, gen, sp, order, spOf, go};
  }
  // An object keyed by units (a progress record, the first-meeting cards) with its old ids under the new ones, the
  // mix-up and offer maps inside each record too (conf, off). Both present (an old app saved again after the switch):
  // the record with more answers stays (a count map adds up). The object itself when nothing is renamed.
  function renameUnits(S, o) {
    const R = S && S.renamed;
    const old = m => isObj(m) && Object.keys(m).some(k => R.ids[k]);
    if (!R || !isObj(o) || !Object.keys(o).some(k => R.ids[k] || (isObj(o[k]) && (old(o[k].conf) || old(o[k].off))))) return o;
    const n = x => (isObj(x) ? (Number(x.ok) || 0) + (Number(x.ko) || 0) : -1),
      counts = m => {
        if (!isObj(m) || !Object.keys(m).some(k => R.ids[k])) return m;
        const c = {};
        Object.entries(m).forEach(([k, v]) => {
          const j = renamedId(S, k);
          c[j] = typeof v === 'number' && typeof c[j] === 'number' ? c[j] + v : c[j] === undefined ? v : c[j];
        });
        return c;
      },
      inner = v => {
        if (!isObj(v)) return v;
        const w = {...v};
        ['conf', 'off'].forEach(k => w[k] !== undefined && (w[k] = counts(w[k])));
        return w;
      },
      out = {};
    Object.keys(o).forEach(k => {
      if (R.ids[k]) return;
      out[k] = inner(o[k]);
    });
    Object.keys(o).forEach(k => {
      if (!R.ids[k]) return;
      const j = renamedId(S, k),
        v = inner(o[k]);
      if (!(j in out) || n(v) > n(out[j])) out[j] = v;
    });
    return out;
  }
  // One answer-log entry (the app's queue, a sheet row read back) with the subject's old unit ids renamed, the same map for
  // the whole row so it keeps what happened: an old id is the family of the photo shown when it was the unit shown (a
  // right answer stays right, the unit shown stays among the choices), else the family that took the entry over. g, a,
  // ch (ids joined by spaces), m (a duel's mode: quiz-duel|A|B), tn and ta (the names at that rank). The entry itself
  // when nothing is renamed.
  function renameLogEntry(S, a) {
    const R = S && S.renamed;
    if (!R || !a) return a;
    const one = x => (x === a.g ? renamedId(S, x, a.sp) : renamedId(S, x));
    const touched = [a.g, a.a, ...String(a.ch || '').split(' '), ...String(a.m || '').split('|')].some(x => R.ids[x]);
    if (!touched) return a;
    const out = {...a};
    if (a.g) out.g = one(a.g);
    if (a.a) out.a = one(a.a);
    if (a.ch) out.ch = String(a.ch).split(' ').map(one).join(' ');
    if (a.m) out.m = String(a.m).split('|').map(one).join('|');
    if (R.ids[a.g]) out.tn = R.names[out.g] || a.tn;
    if (R.ids[a.a]) out.ta = R.names[out.a] || a.ta;
    return out;
  }

  // A player's saved data (the sheet's Data, Code.gs save), with the keys of the subjects after the first (fish:
  // reefid-sync-fish-*) that the saved copy holds and the incoming one lacks kept from the saved copy: an app from before
  // that subject saves its whole record without them, and replacing the record would erase that progress, which no
  // answer log can rebuild (Codex review #442). saved, data: {key: value}; returns the data to save.
  function keepSubjectKeys(saved, data) {
    const out = {...(data || {})},
      pre = SUBJECTS.slice(1).map(S => KEYS.SYNC + S.id + '-');
    Object.keys(saved || {}).forEach(k => {
      if (!(k in out) && pre.some(x => k.startsWith(x))) out[k] = saved[k];
    });
    return out;
  }

  // The draft is never published as a whole copy: it is merged, key by key, onto the latest published curation.
  // merge3(base, mine, theirs): base = the published curation this draft started from; a key I changed since base
  // keeps my value, every other key takes the published one (so choices published from another browser or device
  // are never lost). Objects merge key by key; lists and plain values are single choices. Same choice on both sides = conflict, mine wins.
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o),
    eq = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
  // conf (optional): collects the paths where both sides changed the same choice differently, so Publish can say which
  // published choices this draft replaced (the rule stays the same: mine wins).
  function merge3(base, mine, theirs, conf, path = []) {
    const b = isObj(base) ? base : {},
      m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      out = {};
    new Set([...Object.keys(b), ...Object.keys(m), ...Object.keys(t)]).forEach(k => {
      const both = isObj(m[k]) && isObj(t[k]);
      if (conf && !both && !eq(m[k], b[k]) && !eq(t[k], b[k]) && !eq(m[k], t[k])) conf.push([...path, k]);
      const v = eq(m[k], b[k]) ? t[k] : eq(t[k], b[k]) ? m[k] : both ? merge3(b[k], m[k], t[k], conf, [...path, k]) : m[k];
      // A copy, never a shared object: setQ & co. edit DRAFT's maps in place, and a map shared with SAVED would change
      // both, hiding the edit from Publish (code review 2026-11-01).
      if (v !== undefined && !(isObj(v) && !Object.keys(v).length && k !== 'genera'))
        out[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    });
    return out;
  }
  // An old draft saved before drafts kept their base: add what it has on top of the published curation, never remove.
  function mergeOld(mine, theirs) {
    const m = isObj(mine) ? mine : {},
      t = isObj(theirs) ? theirs : {},
      out = {...t};
    Object.keys(m).forEach(k => {
      out[k] = isObj(m[k]) && isObj(t[k]) ? mergeOld(m[k], t[k]) : m[k] === undefined ? t[k] : m[k];
    });
    return out;
  }

  // Two admin tabs in one browser (code re-review 2026-11-01, M4): each keeps its draft in memory and writes all of it to
  // localStorage on every click, so the last tab clicked used to erase the other tab's clicks. When another tab writes its
  // draft, this tab merges it onto its own: shared = the draft both tabs last agreed on (what this tab last wrote or took),
  // mine = this tab's draft, other = the one just written. Returns the merged draft and whether this tab must write it back
  // (it holds clicks the other tab lacks). Compared without key order, so two tabs never bounce the same draft back and forth.
  const canon = o =>
    JSON.stringify(o, (k, v) =>
      isObj(v)
        ? Object.keys(v)
            .sort()
            .reduce((a, x) => ((a[x] = v[x]), a), {})
        : v
    );
  function mergeTabs(shared, mine, other) {
    const draft = merge3(shared, mine, other);
    draft.genera = draft.genera || {};
    return {draft, share: canon(draft) !== canon(other), changed: canon(draft) !== canon(mine)};
  }

  // Two devices on one account (app.js mergeSaved): three-way merge of the per-genus progress. B = the record as last
  // sent or received, P = this device, R = the record just pulled. Counts add up (R + P - B), so neither side's answers
  // are lost or counted twice; the latest local state wins for the per-genus model when this device answered since B.
  function mergeProgress(B, P, R) {
    const Z = {ok: 0, ko: 0, streak: 0},
      out0 = {};
    B = B || {};
    P = P || {};
    R = R || {};
    new Set([...Object.keys(R), ...Object.keys(P)]).forEach(g => {
      const b = B[g] || Z,
        l = P[g] || Z,
        r = R[g] || Z,
        out = {...r};
      out.ok = Math.max(0, (r.ok || 0) + (l.ok || 0) - (b.ok || 0));
      out.ko = Math.max(0, (r.ko || 0) + (l.ko || 0) - (b.ko || 0));
      // Typed questions (ty, faOf): added up like the counts.
      const ty = Math.max(0, (r.ty || 0) + (l.ty || 0) - (b.ty || 0));
      if (ty) out.ty = ty;
      else delete out.ty;
      // A record recalculated here for the photo memory (pm, memRecalc) with no answer of its own counts as this device's
      // model only while the other side has not moved since B: answers saved from another device win over a mere
      // recalculation (Codex review #387: an old copy reopened must not undo a passed exam), and the recalculation is
      // applied to them after the merge (model.js memRecalcAll).
      // The same for a record this device adopted from the sheet's full replay (rv, the rules version: sync.js
      // replayAdopt): it replaces the copy of the same answers, unless the other side has answered since.
      const moved = x => (x.ok || 0) + (x.ko || 0) !== (b.ok || 0) + (b.ko || 0) || (x.h || '') !== (b.h || ''),
        mine = moved(l) || (((l.pm || 0) !== (b.pm || 0) || (l.rv || 0) !== (b.rv || 0)) && !moved(r));
      out.streak = mine ? l.streak || 0 : r.streak || 0;
      if (mine && l.h) out.h = l.h;
      if (mine)
        // vr: the Elo step's volatility (app.js abilityStep), part of the model the device that played updated; lt: the
        // global level at the genus's last own step (core.js levelMove), which goes with its th.
        // dp, ds: the domain-score bar's posterior and bar (domStep), the model of that device's answers like pg.
        ['lv', 'run', 'L', 'pg', 'dp', 'ds', 'pm', 'rv', 'th', 'lt', 'vr', 'ro', 'ex', 'mx'].forEach(k => {
          if (l[k] !== undefined) out[k] = l[k];
          else delete out[k];
        });
      // Times for the comeback after a break (model.js): the latest answer (at) and the latest day answered right (dl) of
      // either device; days answered right (dd) the larger count (two devices on different days count one less: safe side).
      ['at', 'dl', 'dd'].forEach(k => {
        const v = Math.max(Number(l[k]) || 0, Number(r[k]) || 0);
        if (v) out[k] = v;
        else delete out[k];
      });
      if (l.cor || r.cor) out.cor = 1;
      if (l.du || r.du) out.du = 1;
      // Mix-ups (conf: genus answered instead) and offers (off: genus offered as a wrong choice) add up across devices, and
      // so do the global level's answer times (rt, rtWeight: how many timed answers took each tenth of a second).
      ['conf', 'off', 'rt', 'tyk'].forEach(f => {
        const c = {...(r[f] || {})};
        Object.keys(l[f] || {}).forEach(k => {
          const v = (c[k] || 0) + l[f][k] - ((b[f] || {})[k] || 0);
          if (v > 0) c[k] = v;
          else delete c[k];
        });
        if (Object.keys(c).length) out[f] = c;
        else delete out[f];
      });
      // Photos seen [shown, right]: added up like the mix-ups, so two devices never lose or double-count a photo.
      const ps = {...(r.ps || {})};
      Object.keys(l.ps || {}).forEach(f => {
        const x = ps[f] || [0, 0],
          y = l.ps[f],
          z = (b.ps || {})[f] || [0, 0];
        ps[f] = [0, 1].map(i => Math.max(0, x[i] + y[i] - z[i]));
      });
      if (Object.keys(ps).length) out.ps = ps;
      else delete out.ps;
      if (out.ok + out.ko || out.h) out0[g] = out;
    });
    return out0;
  }

  // Two accounts of one person merged in the admin (user management, Code.gs v11): A = the name that goes away, B = the
  // name kept, both as saved by the app (progData: localStorage key -> string). Their answers are different answers, so
  // counts add up (ok, ko, mix-ups, offers, photos seen), milestones are kept if either has them, and the per-genus model
  // (ability th, knowledge L, recent results h...) comes from whichever account answered that genus more. Settings are
  // B's; bonus genera unlocked or on (bon) on either stay so. Returns B's data with the merged progress.
  // Each subject's progress and quiz settings are merged on their own (SUBJECTS: reefid-sync-<id>-progress, -quiz): a
  // subject neither account played stays out of the result; its opt-in sets (optin) on either stay on.
  function mergeUsers(A, B) {
    A = A || {};
    B = B || {};
    const J = (d, k) => {
      try {
        return JSON.parse(d[k] || 'null');
      } catch (e) {
        return null;
      }
    };
    const out = {...A, ...B};
    SUBJECTS.forEach((S, i) => {
      // The subject's first-launch record: the union of both accounts' histories (startUnion, Codex review #428), so the
      // replay after the merge applies each account's answers' priors at their times.
      const sk = startKey(S.id),
        sa = J(A, sk),
        sb = J(B, sk);
      if (sa || sb) out[sk] = JSON.stringify(startUnion(sa, sb));
      const pk = subjKey(S.id, 'progress'),
        qk = subjKey(S.id, 'quiz');
      if (!i || pk in A || pk in B) out[pk] = JSON.stringify(mergeUserP(J(A, pk) || {}, J(B, pk) || {}));
      // The surprise cards met on either account: met once, never shown again (Codex review #652).
      const wk = subjKey(S.id, 'wink'),
        wa = J(A, wk),
        wb = J(B, wk);
      if (wa || wb) out[wk] = JSON.stringify(winkUnion(wa, wb));
      const qa = J(A, qk),
        qb = J(B, qk);
      if (qa || qb) {
        const q = {...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)};
        S.optin.forEach(k => {
          if ((qa || {})[k] || (qb || {})[k]) q[k] = true;
          // An offer declined on either account is not made more often for the merge: the larger "Not now" count.
          const n = Math.max((qa || {})[k + 'N'] || 0, (qb || {})[k + 'N'] || 0);
          if (n) q[k + 'N'] = n;
        });
        out[qk] = JSON.stringify(q);
      }
      // The rules version the progress was replayed with (sync.js RVK): the merged record is no replay of the two logs
      // together, so it has none, and every device of the account asks for the replay of both histories in time order
      // (the sheet relabels the answers; Codex review #399: the merged model of 20 older right answers and 10 newer misses
      // kept pg 0.96 for good).
      delete out[subjKey(S.id, 'rv')];
    });
    // The one-time notices told on either account (TOLD): told once, never shown again for the merge.
    const ta = J(A, TOLD.KEY),
      tb = J(B, TOLD.KEY);
    if (ta || tb) out[TOLD.KEY] = JSON.stringify(toldUnion(ta, tb));
    return out;
  }
  // The one-time notices a player has seen, on any device of the account (Pierre, 2026-11-08: a device holding an old
  // copy of his account showed again the cards and toasts he had seen on another device): a list of tokens, one per
  // notice seen (progress.js: 'recalc:<note id>' an update note, 'rv:<version>' a rules version's card, 'mx:<unit>@<time>'
  // a learned mark taken away, 'sorry' the apology, 'hello:<subject>-<mode>' a subject's card, 'board' the leaderboard
  // note). It travels with the progress (KEYS.SYNC) and merges as the union (sync.js mergeSaved, signIn; mergeUsers), so
  // a notice told on one device is never told again on another. Anything but a short string is dropped; sorted.
  const TOLD = {KEY: KEYS.SYNC + 'told', MAX: 120};
  function toldUnion(a, b) {
    const out = new Set();
    [a, b].forEach(L => Array.isArray(L) && L.forEach(t => typeof t === 'string' && t && t.length <= TOLD.MAX && out.add(t)));
    return [...out].sort();
  }
  // The surprise cards (winks) two records have met (quiz.js winkMerge at a sync, mergeUsers for two accounts): {wink id:
  // answer count when shown}, the union, the earlier count kept; anything else in either is ignored (Pierre, 2026-11-06:
  // each surprise once per player).
  function winkUnion(a, b) {
    const out = {};
    [a, b].forEach(r => {
      if (!r || typeof r !== 'object' || Array.isArray(r)) return;
      Object.keys(r).forEach(n => {
        const v = Math.max(0, Number(r[n]) || 0);
        if (!(n in out) || v < out[n]) out[n] = v;
      });
    });
    return out;
  }
  // A part of the slate opened by choice (app.js UNITS opens: fish circle 3; Pierre, 2026-11-07 08:50: "circle 3 an
  // option; if the player says no, those families don't open, but the player must be able to unlock them later"), from
  // the subject's quiz settings q and the part's key k. o: met (one of its units already opened on a card), due (its
  // threshold reached), left (a unit of it not open yet), at (the player's answer count). on: the player said yes, or was
  // never asked and has one of its units open (it opened by itself before the choice existed: kept on). row: My progress
  // offers to open it. ask: its card is due: never answered, or once more OPEN_AGAIN answers after a first "Not now"
  // (a "no" seen without its count counts as one), then never.
  const OPEN_AGAIN = 200;
  function openState(q, k, o = {}) {
    q = q || {};
    const v = q[k],
      on = v === true || (v === undefined && !!o.met),
      row = !on && !!o.due && !!o.left,
      ask = row && (v === undefined || (v === false && (q[k + 'N'] || 1) < 2 && (o.at || 0) >= (q[k + 'A'] || 0) + OPEN_AGAIN));
    return {on, row, ask};
  }
  // One subject's progress of two accounts (mergeUsers).
  function mergeUserP(a, b) {
    const P = {};
    const n = s => (s.ok || 0) + (s.ko || 0),
      add = (x, y) => {
        const o = {...(x || {})};
        Object.keys(y || {}).forEach(k => {
          o[k] = (o[k] || 0) + y[k];
        });
        return o;
      };
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(g => {
      const x = a[g] || {},
        y = b[g] || {},
        main = n(x) > n(y) ? x : y,
        o = {...(main === x ? y : x), ...main};
      // The progress comes from the same account as the rest of the model, recomputed if it was saved before s.pg
      // (Codex review #367: an old main record let the other account's pg through): its domain-score bar (dp, ds) when it
      // has one, the other account's never mixed in; else its moving average.
      if (domOn(main)) {
        [o.dp, o.ds] = [main.dp.slice(), main.ds];
        delete o.pg;
      } else {
        delete o.dp;
        delete o.ds;
        if (typeof main.pg === 'number' || main.h || typeof main.L === 'number') o.pg = pgOf(main);
      }
      // The photo memory mark goes with that progress (memRecalc): the other account's would leave it uncorrected.
      if (main.pm) o.pm = main.pm;
      else delete o.pm;
      // The level a genus's ability was last stepped against (lt, model.js levelRise) is the old account's: the merged
      // account's level is another, so the level's rise counts again from the genus's next own answer.
      delete o.lt;
      o.ok = (x.ok || 0) + (y.ok || 0);
      o.ko = (x.ko || 0) + (y.ko || 0);
      if ((x.ty || 0) + (y.ty || 0))
        o.ty = (x.ty || 0) + (y.ty || 0); // typed questions on the unit (faOf), the same person's
      else delete o.ty;
      o.streak = main.streak || 0;
      // Answer times (rt, the global level's) add up like the mix-ups: the same person's.
      ['conf', 'off', 'rt', 'tyk'].forEach(f => {
        const c = add(x[f], y[f]);
        if (Object.keys(c).length) o[f] = c;
        else delete o[f];
      });
      const ps = {...(x.ps || {})};
      Object.keys(y.ps || {}).forEach(f => {
        const p = ps[f] || [0, 0];
        ps[f] = [p[0] + y.ps[f][0], p[1] + y.ps[f][1]];
      });
      if (Object.keys(ps).length) o.ps = ps;
      else delete o.ps;
      if (x.cor || y.cor) o.cor = 1;
      if (x.du || y.du) o.du = 1;
      if (o.ok + o.ko || o.h) P[g] = o;
    });
    return P;
  }

  // Who rates the photos and the confusions, as tools/sync/Code.gs trusted_ (v17; v18: devices that never signed in too,
  // under the same rule, Pierre 2026-11-02): players with TRUST.N answers or more and a right rate clearly above chance (one-sided z of at least TRUST.Z against each question's guess rate).
  const TRUST = {N: 10, Z: 1.645}; // answers per player, not per photo
  // As Code.gs guess_ (v20): without |kN, a photo-quiz question with 2 or 3 genera in its choices (readAnswers row
  // index 10) is rated with 1 / choices ("Again: A or B?", logged plain "quiz" until 2026-11-02).
  // A typed answer (|t, 2026-11-03: the player types the genus instead of picking one of the choices) has no guess rate:
  // nothing to pick from, so the expected success has no 1/k floor (Code.gs guess_ v27; model.js TYPED.k).
  const TYPED_RE = /\|t(\||$)/;
  const guessOf = (mode, choices) => {
    if (TYPED_RE.test(mode)) return 0;
    const kq = /\|k(\d)$/.exec(mode);
    if (kq) return 1 / Number(kq[1]);
    if (mode.indexOf('quiz-duel') === 0) return 0.5;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? 1 / n : 0.25;
  };
  // Question formats (analysis.js FORMATS, whose fmtOf this is: tests/analysis.test.js checks both agree), from the mode
  // quiz.js logs and the number of choices shown: typed (|t), the Duel tab (quiz-duel…), a look-alike duel in the quiz
  // (|d), an exam question (|x), "Again: A or B?" (2 choices), 4 shown of which 3 or 2 plausible (|k3, |k2), 4 plausible.
  function fmtOf(m, nch) {
    m = String(m || '');
    if (TYPED_RE.test(m)) return 'typed';
    if (m.indexOf('quiz-duel') === 0) return 'duel';
    if (/\|d(\||$)/.test(m)) return 'qduel';
    if (/\|x(\||$)/.test(m)) return 'exam';
    if (nch === 2) return 'again';
    const k = /\|k(\d)/.exec(m);
    return k && Number(k[1]) < 4 ? (Number(k[1]) >= 3 ? 'k3' : 'k2') : 'k4';
  }
  // Per-format offsets (Pierre, 2026-11-06, Q138; docs/LEARNING.md "Per-format offsets"): on the real answers a question's
  // format moved its success beyond what the app's guess rate 1/k allows for (2 plausible choices among 4 shown: right
  // 87% where the app expected 74%; typed: 76% where it expected 82%). Each format f gets an offset d_f, in logits, added
  // to the app's log-odds: P(right) = 1/k + (1 - 1/k) sig(ability - difficulty + d_f) (positive: easier than the app
  // thought). Fitted by the sheet (Code.gs stats_, ?stats=1 fmt) on the trusted answers with their logged expectation e,
  // the app's log-odds then x = logit((e - 1/k) / (1 - 1/k)), clamped to 1-99%: Newton's method on d_f with a normal prior
  // N(0, FMT.SD^2) (a format with few answers stays near the app's own value, 0), for a format with FMT.N answers or more.
  // The guess rate stays 1/k: fitted with it, the two were not identifiable on the real log (estimates correlated -0.9,
  // the 2-choice guess running off to 0.87 with its offset to minus infinity). Served {format: [offset, answers]}; a
  // format absent counts 0 (fmtOff). The logged e stays the app's expectation before the offset, so the fit always reads
  // the same quantity.
  const FMT = {N: 20, SD: 1};
  function fmtOffsetsOf(rows) {
    const trust = trustOf(rows),
      by = {};
    rows.forEach(r => {
      const p = trust[r[0]] && r[2] ? fmtPoint(r[5], r[7], r[10], r[4]) : null;
      if (p) (by[p[0]] = by[p[0]] || []).push(p.slice(1));
    });
    return fmtFit(by);
  }
  // One answer's point for the fit (fmtOffsetsOf), its player trusted and its unit shown: [format, e, g, right 0|1], null
  // when it is no quiz question or has no logged expectation e. m: its mode, ch: its choices (space-separated). Code.gs
  // collects the same points as it folds the answer log a few rows at a time (statsStep_) and fits them with fmtFit.
  function fmtPoint(m, e, ch, ok) {
    m = String(m || '');
    if (m.indexOf('quiz') !== 0 || typeof e !== 'number' || !isFinite(e)) return null;
    const n = String(ch || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return [fmtOf(m, n), e, guessOf(m, ch), ok ? 1 : 0];
  }
  // The fit itself over {format: [[e, g, right], ...]}, the points in log order: {format: [offset, answers]} for each
  // format with FMT.N points or more.
  function fmtFit(by) {
    const out = {},
      sg = x => 1 / (1 + Math.exp(-x));
    Object.keys(by).forEach(f => {
      const L = by[f].map(([e, g, y]) => {
        const q = Math.min(0.99, Math.max(0.01, g < 1 ? (e - g) / (1 - g) : 0.5));
        return [Math.log(q / (1 - q)), g, y];
      });
      if (L.length < FMT.N) return;
      let d = 0;
      for (let it = 0; it < 50; it++) {
        let gr = -d / FMT.SD ** 2,
          h = 1 / FMT.SD ** 2;
        L.forEach(([x, g, y]) => {
          const s = sg(x + d),
            p = Math.min(1 - 1e-9, Math.max(1e-9, g + (1 - g) * s)),
            j = (1 - g) * s * (1 - s);
          gr += ((y - p) / (p * (1 - p))) * j;
          h += (j * j) / (p * (1 - p));
        });
        const st = Math.min(1, Math.max(-1, gr / h));
        d += st;
        if (Math.abs(st) < 1e-6) break;
      }
      out[f] = [Math.round(d * 100) / 100, L.length];
    });
    return out;
  }
  // The offset of a question's format, from the sheet's fmt ({} or null with an older sheet: 0); f a format key (fmtOf).
  const fmtOff = (F, f) => {
    const o = F && F[f];
    return Array.isArray(o) && typeof o[0] === 'number' && isFinite(o[0]) ? o[0] : 0;
  };
  // The sync script version that serves fmt and replays with it (Code.gs v77): the app reads fmt only from a reply that
  // says v >= FMT_SHEET (rule D4), so a replay never undoes what the app did live; before it, every offset is 0.
  const FMT_SHEET = 77;
  const fmtsOf = j => (j && j.v >= FMT_SHEET && j.fmt && typeof j.fmt === 'object' ? j.fmt : {});
  // How sure a player's level is (Pierre, 2026-11-03: a level from 35 answers at 97% right sat above one from 245):
  // {player id: 95% margin, in level units}, 1.96 / sqrt(Fisher information) gathered on the same replay as the level
  // itself (eloReplay, Code.gs stats_ ras; Codex review #375): an answer that was a near-sure success tells little, so a
  // run of easy right answers keeps the margin wide.
  // A player's right rate in the photo quiz apart from the Duel tab (Pierre, 2026-11-03: a new player's 31 duels on one
  // chosen pair, 2 choices each, made 89% in the quiz read as 95%): per anonymous id, [answers, right] in the quiz (mode
  // quiz or quiz|…, duels slipped into the quiz included), in its last 50, and in the Duel tab (quiz-duel…). Other
  // games are in neither. rows: readAnswers rows [id, t, shown, answered, ok, mode, …].
  function playSplit(rows) {
    const out = Object.create(null); // by player, no prototype (trustOf)
    (rows || [])
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const m = String(r[5] || ''),
          o = (out[r[0]] = out[r[0]] || {q: [0, 0], d: [0, 0], L: []});
        if (m.startsWith('quiz-duel')) (o.d[0]++, (o.d[1] += r[4] ? 1 : 0));
        else if (m === 'quiz' || m.startsWith('quiz|')) (o.q[0]++, (o.q[1] += r[4] ? 1 : 0), o.L.push(r[4] ? 1 : 0));
      });
    Object.values(out).forEach(o => {
      const L = o.L.slice(-50);
      o.q50 = [L.length, L.reduce((t, x) => t + x, 0)];
      delete o.L;
    });
    return out;
  }
  function levelMargin(rows) {
    const {R} = eloReplay(rows || []);
    return Object.fromEntries(Object.entries(R).map(([k, r]) => [k, r[2] > 0 ? 1.96 / Math.sqrt(r[2]) : Infinity]));
  }
  // Keyed by player (names lower-cased in the sheet, anonymous ids in the admin), with no prototype: a player named
  // constructor or __proto__ is an entry like any other, never Object's member (reserved names, Pierre 2026-11-09).
  function trustOf(rows) {
    const T = Object.create(null),
      out = Object.create(null);
    rows.forEach(r => {
      if (!r[0]) return;
      const t = (T[r[0]] = T[r[0]] || [0, 0, 0, 0, 0]),
        g = guessOf(r[5], r[10]);
      t[0]++;
      t[1] += r[4] ? 1 : 0;
      t[2] += g;
      t[3] += g * (1 - g);
      if (r[11]) t[4] = 1;
    });
    Object.keys(T).forEach(w => {
      const t = T[w];
      out[w] = t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z;
    });
    return out;
  }

  // How much one answer moves the photos, as Code.gs PHOTO_W (v17): weight n / (n + N) after n answers of the player.
  // NEW and KNOWN: the fixed memory rule of v17-v25 (a photo new to the player 0.5 harder, one right twice before 1
  // easier), now only the prior of the estimated photo memory below (MEM).
  const PHOTO_W = {N: 10, NEW: 0.5, KNOWN: -1}; // v18: 10, was 30 (same reason)
  // Every player starts as a beginner (Code.gs PLAYER0): about 45% right on an average photo with 4 choices.
  const PLAYER0 = -1;
  // Photo memory (Pierre, 2026-11-03: in a genus with few photos the same ones come back, players learn the photos
  // rather than the genus, and that skews the photo difficulty and the player's progress). One rule for the sheet, the
  // admin and the app: an answer on a photo is expected easier by an offset (logits subtracted from its difficulty) that
  // depends on the player's own history with that photo, [times shown, times right] (H in the replay, s.ps in the app):
  // bucket 0 new, 1 shown but never right, 2 right once, 3 right twice or more (memBucket). A question with several
  // photos takes the mean offset of its photos (memFam). New is the reference, 0: a photo's rating is what a player meets
  // on it the first time. The other three are estimated from the trusted answers, rated in the same replay as the photos
  // and the players (eloReplay, Code.gs stats_, v26): after each answer, each offset its photos fall in moves by its
  // surprise (right - expected) over the information gathered so far plus the prior's (a step of Newton's method on the
  // log-likelihood, as Glicko moves a rating by what it learns over how sure it already is), the prior MEM.PRIOR weighing
  // as much as MEM.N answers at the game's usual chance (80%, 4 choices). The prior is the old fixed rule (PHOTO_W) as
  // offsets from a new photo: 0, -0.5, -0.5, -1.5; a bucket with few answers stays close to it. N 10: answers on a
  // remembered photo are 90% right or more, where each tells little, so the 64 "right once" answers of the first 550
  // move it about two thirds of the way to what they show (30: half way). ?stats=1 serves the estimate as mem (memn:
  // answers behind each bucket); the app falls back to the prior with an older sheet (memOf). docs/LEARNING.md "Photo
  // memory".
  const MEM = {N: 10, PRIOR: [0, -PHOTO_W.NEW, -PHOTO_W.NEW, PHOTO_W.KNOWN - PHOTO_W.NEW]};
  const memBucket = h => (!h || !h[0] ? 0 : !h[1] ? 1 : h[1] === 1 ? 2 : 3);
  const memFam = (hs, mem) => (hs.length ? hs.reduce((t, h) => t + mem[memBucket(h)], 0) / hs.length : 0);
  // The offsets of a ?stats=1 reply (mem, sheet v26), or the prior from an older sheet.
  const memOf = m =>
    Array.isArray(m) && m.length === 4 && m.every(x => typeof x === 'number' && isFinite(x)) ? m.slice() : MEM.PRIOR.slice();
  // Fisher information of one answer at ability - difficulty x with k choices; the prior's weight is MEM.N of them at
  // x = 1 with 4 choices (about 80% right), 0.135 each.
  const infoAt = (x, k) => {
    const s = 1 / (1 + Math.exp(-x)),
      p = 1 / k + (1 - 1 / k) * s;
    return ((1 - 1 / k) * s * (1 - s)) ** 2 / (p * (1 - p));
  };
  // Hierarchical photo Elo (Pierre, 2026-11-03; docs/LEARNING.md "Hierarchical photo Elo"): a photo's difficulty is its
  // genus's offset plus its own residual, the player rule "global level + genus" (Pelánek et al. 2017) applied to the
  // photos. Both move on every trusted answer by the same surprise: the residual as the photo rating always did, the
  // genus offset by GENUS_K / (1 + its weighed answers / 10), the photos' damping form. A photo nobody has answered starts
  // at its genus's offset instead of 0. GENUS_K 0.4: on the real answer log, replayed with each answer scored before it
  // moves anything, 0.2 and 0.4 both beat a photo-only Elo and the Easy / Medium / Hard prior, 0.8 moves too fast.
  // Code.gs GENUS_K in step; ?stats=1 serves the offsets as gd (sheet v31), the photos' ratings as totals.
  const GENUS_K = 0.4;
  // Photo Elo replayed over the answer log (rows [id, time ms, genus shown, answered, right 0|1, mode, photos…]), as
  // tools/sync/Code.gs stats_ does in the sheet: keep the two in step (tests/core.test.js compares them). Every answer
  // moves the player's level; the photos and the memory offsets move on trusted players' answers only (trustOf, v17),
  // weighed as above. All against the same expectation, photo memory included (until v25 the level ignored memory
  // and the photos used the fixed rule, so the two pulled apart).
  // Returns the photo ratings P (the residual, [rating, weighed answers, weighed right, answers]), the genus of each photo
  // PG, the genus offsets G ([offset, weighed answers]), the player levels R ([level, answers, information]), the memory
  // offsets mem (rounded as served) and memn, the trusted answers behind each bucket (a question with several photos
  // shares its answer between their buckets). Every photo of a question is of the genus shown (one colony, rule P4).
  function eloReplay(rows) {
    const P = {},
      PG = {},
      G = {},
      R = Object.create(null), // by player, no prototype (trustOf)
      H = {},
      trust = trustOf(rows),
      mem = MEM.PRIOR.slice(),
      I = [0, 0, 0, 0],
      N = [0, 0, 0, 0],
      tau = MEM.N * infoAt(1, 4),
      sig = x => 1 / (1 + Math.exp(-x));
    rows
      .slice()
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const fs = r[6].split(/\s+/).filter(Boolean);
        if (!r[0] || !fs.length) return;
        const ok = r[4] ? 1 : 0,
          g = guessOf(r[5], r[10]),
          ra = (R[r[0]] = R[r[0]] || [PLAYER0, 0]);
        const gs = String(r[2] || ''),
          go = (G[gs] = G[gs] || [0, 0]),
          ph = fs.map(f => ((PG[f] = gs), (P[f] = P[f] || [0, 0, 0, 0]))),
          b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);
        const hs = fs.map(f => (H[r[0] + '|' + f] = H[r[0] + '|' + f] || [0, 0])),
          s = sig(ra[0] - b - memFam(hs, mem)),
          e = g + (1 - g) * s,
          d = ok - e,
          n = ra[1];
        if (trust[r[0]]) {
          const w = n / (n + PHOTO_W.N),
            D = (1 - g) * s * (1 - s),
            v = Math.max(1e-6, e * (1 - e)),
            A = [0, 0, 0, 0];
          ph.forEach(p => {
            p[0] -= (0.8 / (1 + p[2] / 10) / ph.length) * d * w;
            p[2] += w;
            p[1] += ok * w;
            p[3]++;
          });
          go[0] -= (GENUS_K / (1 + go[1] / 10)) * d * w;
          go[1] += w;
          hs.forEach(h => (A[memBucket(h)] += 1 / hs.length));
          for (let j = 1; j < 4; j++)
            if (A[j]) {
              I[j] += (w * (D * A[j]) ** 2) / v;
              mem[j] -= (w * d * D * A[j]) / v / (tau + I[j]);
              N[j] += A[j];
            }
          N[0] += A[0];
        }
        // Fisher information about the level from this answer, on the same model as the level's step (levelMargin).
        ra[2] = (ra[2] || 0) + ((1 - g) * s * (1 - s)) ** 2 / Math.max(1e-6, e * (1 - e));
        ra[0] += (0.6 / (1 + n / 40)) * d;
        ra[1]++;
        hs.forEach(h => {
          h[0]++;
          h[1] += ok;
        });
      });
    return {P, PG, G, R, mem: mem.map(x => Math.round(x * 100) / 100), memn: N.map(x => Math.round(x * 10) / 10)};
  }
  // The photo memory offsets estimated from the answer log, as Code.gs ?stats=1 mem and memn.
  function photoMemOf(rows) {
    const {mem, memn} = eloReplay(rows);
    return {mem, memn};
  }
  // Progress saved before the photo memory, recalculated once and silently (Pierre, 2026-11-03: the replay of the real
  // answer log moved the bars down 1-3 points, so no pop-up). Every answer since the change weighs a right answer on a
  // known photo x pgMemW (model.js); the answers before it counted in full. The device keeps no answer log for a
  // signed-in player (the sheet has it), only each genus's record: its photos [shown, right] (s.ps). A uniform factor f
  // on the right answers' weights multiplies the moving average's balance odds by f (pg = p w / (p w + (1 - p) m) for a
  // success rate p, right weight w, miss weight m), so pg' = f pg / (f pg + 1 - pg), f the mean weight of the genus's
  // right answers: of a photo's r right answers in n shows, r / n count as its first show (weight 1, a share as if right
  // answers fell evenly on its shows) and the rest as repeats, at the weight of the bucket the photo has now, at the
  // game's target (ability 1 above the photo, 4 choices). Approximate (no order is kept, misses on known photos are not
  // redone): tools/memreplay.js prints it beside the full replay of the sheet's log. Never raises a bar. A learned genus is
  // left alone (its exam showed photos never seen). Once per record: s.pm marks it (also set on a record that needed no
  // change) and travels with s.pg between devices (mergeProgress, mergeUsers), so no device corrects a record twice; a
  // record made after the change is marked at its first answer (quiz.js answer) and never corrected. Returns true when
  // it marked the record now or dropped a former learned mark (below).
  // Learned under the former model (Pierre, 2026-11-03: "I find it hard to believe that the two genera marked as learned
  // really are"): a genus learned on a record without s.pg passed its exam under BKT (before 2026-11-02), whose
  // estimate reached 95% after about 4 right answers, so the exam came at once, mostly against easy choices; replayed
  // with today's rules (tools/memreplay.js) those genera stand at 78-83%, under the exam's entry. Their learned mark
  // (and any exam in course) is dropped at every call (load, pull, answer: a copy from another device that still has it
  // loses it too); the genus keeps its bar from its record (pgOf, s.h) and takes the exam again. An exam passed since
  // (s.pg kept beside s.mx) is left alone. Silent (Pierre, 2026-11-09 ~15:40 Manila, Q332): the app sees the mark go
  // (model.js mxRecalc) and tells nothing; until then a card told it once (progress.js mxLostNotice) and the
  // learned-based achievements the progress no longer met were taken back (achRevoke, progress.js achRecheck).
  // Since the sheet's full replay (replayProgress, RVS; 2026-11-03) this is only the fallback for a device that never
  // reaches the sheet: a record adopted from the replay carries pm 1, so it is never corrected here.
  function memRecalc(s, mem) {
    if (!s || typeof s !== 'object') return false;
    let old = false;
    if (s.mx && !afterBkt(s)) {
      delete s.mx;
      delete s.ex;
      old = true;
    }
    if (s.pm) return old;
    s.pm = 1;
    if (s.mx || typeof s.pg !== 'number' || !(s.pg > 0)) return true;
    const e = x => 0.25 + 0.75 / (1 + Math.exp(-x));
    let r = 0,
      w = 0;
    Object.values(s.ps || {}).forEach(h => {
      if (!Array.isArray(h) || !(h[0] > 0) || !(h[1] > 0)) return;
      const first = h[1] / h[0];
      r += h[1];
      w += first + (h[1] - first) * Math.min(1, e(1) / e(1 - mem[memBucket(h)]));
    });
    if (r && w < r) {
      const f = w / r;
      s.pg = Math.round(((f * s.pg) / (f * s.pg + 1 - s.pg)) * 1e4) / 1e4;
    }
    return true;
  }
  // The photo ratings as Code.gs ?stats=1 photos: [difficulty (genus offset + residual), weighed answers, weighed right,
  // answers].
  function eloOf(rows) {
    const {P, PG, G} = eloReplay(rows);
    const out = {};
    Object.keys(P).forEach(
      f =>
        (out[f] = [Math.round((G[PG[f]][0] + P[f][0]) * 100) / 100, Math.round(P[f][2] * 10) / 10, Math.round(P[f][1] * 10) / 10, P[f][3]])
    );
    return out;
  }
  // The genus offsets as Code.gs ?stats=1 gd (v31): {genus: [offset, weighed answers]}.
  function genusOffsetsOf(rows) {
    const {G} = eloReplay(rows);
    return Object.fromEntries(Object.entries(G).map(([n, o]) => [n, [Math.round(o[0] * 100) / 100, Math.round(o[1] * 10) / 10]]));
  }

  // Confusions between genera (Pierre, 2026-11-01): from the answer log rows (as eloOf; row[10] = the genera offered,
  // space-separated, logged since sheet script v10). pair["A|B"] (A before B alphabetically) = [offered together, mixed up]:
  // one was shown with the other among the choices, and the other was answered. Same counts as Code.gs stats_ conf (tests
  // check it). dir["shown|other"] = [offered, answered] keeps the direction. old["shown|answered"] = mix-ups logged without
  // their choices (before v10): they can't be turned into a rate, only counted.
  function confusionOf(rows) {
    const trust = trustOf(rows);
    rows = rows.filter(r => trust[r[0]]); // trusted players only, as Code.gs stats_ (v17)
    const pair = {},
      dir = {},
      old = {},
      inc = (O, k, took) => {
        const c = (O[k] = O[k] || [0, 0]);
        c[0]++;
        if (took) c[1]++;
      };
    rows.forEach(r => {
      const g = r[2],
        a = r[3],
        ok = r[4],
        ch = String(r[10] || '')
          .split(/\s+/)
          .filter(x => x && x !== g);
      if (!g) return;
      if (!ch.length) {
        if (!ok && a && a !== g) old[g + '|' + a] = (old[g + '|' + a] || 0) + 1;
        return;
      }
      ch.forEach(x => {
        const took = !ok && a === x;
        inc(pair, g < x ? g + '|' + x : x + '|' + g, took);
        inc(dir, g + '|' + x, took);
      });
    });
    return {pair, dir, old};
  }
  // Confusion score of a pair: its mix-up rate when offered together, starting from a prior rate worth CONF.W offers (the
  // declared look-alikes of the IMR lecture and the Coral Finder start high), then following the players' real answers.
  // N (2026-11-04): the offers a pair needs before the data can make it a look-alike (dataLook, below).
  const CONF = {W: 8, LOOK: 0.3, FAM: 0.12, FORM: 0.08, BASE: 0.03, TRAP: 0.2, N: 20};
  const confScore = (c, prior) => ((c ? c[1] : 0) + CONF.W * prior) / ((c ? c[0] : 0) + CONF.W);
  // A look-alike from the data (Pierre, 2026-11-04: "if the data says people constantly confuse two genera, they become
  // look-alikes by force; that was the point of the confusion data: to find look-alikes the courses never named"): a
  // pair offered together CONF.N times or more (c, the pooled [offered, mixed up]) whose pooled score (score, confScore
  // on the pair's own prior: same family, a shared growth form or neither) reaches CONF.TRAP. The prior's weight (CONF.W
  // offers at a low rate) is what makes it clear: at 20 offers a pair of unrelated genera needs 6 mix-ups (30%), when
  // the declared look-alikes were mixed up 13% of the time they were offered (the real answers of 2026-11-03).
  const dataLook = (c, score) => !!c && c[0] >= CONF.N && score >= CONF.TRAP;
  // How much harder a question is for a player who mixes up its genus with one of its choices more than everyone does
  // (2026-11-04, docs/LEARNING.md "Known mix-ups"): the player's own score of the pair (own, pairConf, shrunk toward the
  // pooled score as confOf does) against the pooled score, in logits, when higher; 0 for a pair the player mixes up no
  // more than everyone. The pooled score already shows in the photos' difficulty (every player's answers); this is the
  // player's own excess, so it is never counted twice. No constant: confScore's own prior weight sets how fast it grows.
  const logitOf = p => Math.log(p / (1 - p));
  const confGap = (own, pooled) => {
    const q = Math.min(0.99, Math.max(0.01, pooled));
    return Math.max(0, logitOf(Math.min(0.99, confScore(own, q))) - logitOf(q));
  };
  // One player's own record on a pair (progress P): [times the two were offered together, times mixed up], both directions.
  // Offers are counted since 2026-11-01 (P[g].off); mix-ups logged before that count as offered at least once each.
  function pairConf(P, a, b) {
    const x = P[a] || {},
      y = P[b] || {},
      mix = ((x.conf || {})[b] || 0) + ((y.conf || {})[a] || 0);
    return [Math.max(mix, ((x.off || {})[b] || 0) + ((y.off || {})[a] || 0)), mix];
  }

  // An apology, once (Pierre, 2026-11-04): from the opening rule of #408 (merged FROM) to this fix, the app opened too
  // many genera at once to strong players and did not ease the questions after misses. Only to the players who really
  // felt it (Pierre: "a player who answered a single question then must not get it"), read from the device's own data
  // when this version first runs on it (progress.js sorryNotice keeps it, so later play changes nothing):
  // - n: their answers in the window, at least SORRY.N (20). Exact from the answers the device still keeps (signed out:
  //   all of them); else the answers since the last card shown before FROM (the cards keep the answers count and time).
  // - h: the opening hold's sum then (model.js holdStep: a CUSUM of the shortfall against each answer's expected
  //   success e, 0.1 allowed per answer), so where their last run ended: SORRY.H (3, 2 x INTRO.HOLD, the evidence the
  //   back-to-one-at-a-time card asks for) or more; or half of it with SORRY.CARDS (4, one more than OPEN.MAX now allows)
  //   genera or more opened on cards within OPEN.WIN answers in the window (c, the most in any 15).
  // On the real answers (2026-11-03) it selects both collapsed runs (44 answers, h 3.22, 7 cards in 16 answers; 31
  // answers, h 4.31) and nobody else; a run at the expected success ends at 3 or more about 2-5% of the time
  // (simulated, 20-80 answers at e 0.7-0.9). Not after UNTIL: a player back weeks later would not know what it is about.
  const SORRY = {FROM: Date.parse('2026-11-03T11:34:11Z'), UNTIL: Date.parse('2026-11-17T00:00:00Z'), N: 20, H: 3, CARDS: 4, WIN: 15};
  const sorryFelt = ({n, h, c}) =>
    (Number(n) || 0) >= SORRY.N && ((Number(h) || 0) >= SORRY.H || ((Number(c) || 0) >= SORRY.CARDS && h >= SORRY.H / 2));
  // The inputs from the device's data at its first run (first: that time): log, the answers it keeps ({t ISO, ok, e});
  // cards, the intro map ({genus: [answers, ready, time, kind]}); total, the player's answers count; h, the hold's sum.
  const sorryOf = ({log, cards, total, h, first}) => {
    const inW = t => typeof t === 'number' && t >= SORRY.FROM && t < first,
      nLog = (log || []).filter(a => a && inW(Date.parse(a.t))).length,
      E = Object.values(cards || {}).filter(e => Array.isArray(e)),
      before = E.filter(e => typeof e[2] === 'number' && e[2] < SORRY.FROM).map(e => Number(e[0]) || 0), // cards with no time (older) say nothing
      win = E.filter(e => inW(e[2]) && (e[3] || 'c') === 'c').map(e => Number(e[0]) || 0),
      // Answers since the last card shown before the window; with no card before it, every answer was in it only when
      // the cards in it show the player started there.
      est = before.length ? total - Math.max(...before) : win.length ? total : 0;
    return {
      n: Math.max(nLog, est),
      h: Number(h) || 0,
      c: Math.max(0, ...win.map(x => win.filter(y => y >= x && y < x + SORRY.WIN).length))
    };
  };
  const sorryDue = ({felt, now, shown}) => !shown && now < SORRY.UNTIL && !!felt && sorryFelt(felt);
  // The first name to greet a player with, from their sign-in name (Pierre, 2026-11-04, for every personalised card,
  // rule U10): the first word ("Ana Lopez" -> "Ana", "Ana B." -> "Ana"), its first letter capitalised;
  // only the letters it starts with (an apostrophe or a hyphen inside kept: "O'Neil", "Jean-Luc"), so a name with no
  // letter first ("~a12", "123") gives '' and the card says a plain "Hi!".
  const firstName = name => {
    const m = /^\p{L}[\p{L}\p{M}'’-]*/u.exec(String(name || '').trim()),
      w = m ? m[0].replace(/['’-]+$/, '') : '';
    return w ? w[0].toUpperCase() + w.slice(1) : '';
  };
  const sorryHi = name => (firstName(name) ? `Hi ${firstName(name)}!` : 'Hi!');
  // Account names refused for a new account or an archive name (Pierre, 2026-11-09): a name holding, as one of its words,
  // a member name of Object.prototype or a word like it (prototype). Such a name, as a key of a plain object (the sheet's
  // maps by player: stats, replays, board, groups), reads the inherited member instead of an entry; the code no longer
  // relies on it (maps with no prototype), and the front door refuses them too. Words split as Code.gs PROTO_RE splits a
  // value (spaces, | : ,), any capitalisation (the sheet matches names case-blind, and keys them in lower case). An
  // account that already has such a name keeps working: only a sign-up (the app's form, Code.gs doPost_ with no row
  // yet) and an archive name (users_ userArchive) are refused, with error 'reserved'. The list is the one Pierre saw;
  // whatever else this engine's Object.prototype has is refused as well.
  const RESERVED_NAMES = [
    '__proto__',
    'constructor',
    'prototype',
    'toString',
    'toLocaleString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__'
  ];
  const RESERVED_LC = new Set(RESERVED_NAMES.concat(Object.getOwnPropertyNames(Object.prototype)).map(w => w.toLowerCase()));
  // The seedling 🌱 is the admin's own mark after his name (Pierre, 2026-11-09, Q328 corrected: "an icon the others are not
  // allowed to have", added on its own, the name unchanged): the app shows it after the admin's account name (Code.gs
  // adminAcct_, v125; adminMark below), and no player may show it: a new account or an archive name holding it, or one
  // of its look-alikes, anywhere is refused as reserved. Seedling, herb, potted plant, shamrock, four-leaf clover,
  // leaf fluttering in wind (any variation selector after it changes nothing: the base character is enough).
  const SEED_LOOKALIKES = ['\u{1F331}', '\u{1F33F}', '\u{1FAB4}', '\u2618', '\u{1F340}', '\u{1F343}'];
  const SEED_RE = new RegExp('[' + SEED_LOOKALIKES.join('') + ']', 'u');
  const reservedName = name =>
    SEED_RE.test(String(name == null ? '' : name)) ||
    String(name == null ? '' : name)
      .split(/[\s|:,]+/)
      .some(w => w !== '' && RESERVED_LC.has(w.toLowerCase()));
  const SEED = '\u{1F331}';
  // The admin's mark (v125): from the script that knows the admin's account (Code.gs adminAcct_: a 4th field 1 on its
  // leaderboard rows, admin: 1 in its load reply), and only there (rule D4: an older script sends neither). markRow: a
  // leaderboard row of a reply of version v. markHtml: the mark itself, plain text after the name's element, outside its
  // text (the name stays the account's name).
  const MARK_SHEET = 125;
  const markRow = (row, v) => Number(v) >= MARK_SHEET && Array.isArray(row) && row[3] === 1;
  const markHtml = () => `<span class="amark" role="img" title="Admin" aria-label="Admin">${SEED}</span>`;
  // When it happened, as the player's clock says it (tz: minutes behind UTC, Date's getTimezoneOffset): this evening,
  // yesterday evening (afternoon, morning), else the date.
  const sorryWhen = (now, tz = 0) => {
    const loc = t => new Date(t - tz * 60000),
      f = loc(SORRY.FROM),
      day = t => Math.floor((t - tz * 60000) / 864e5),
      h = f.getUTCHours(),
      part = h >= 17 ? 'evening' : h >= 12 ? 'afternoon' : 'morning',
      d = day(now) - day(SORRY.FROM);
    if (d <= 0) return `This ${part}`;
    if (d === 1) return `Yesterday ${part}`;
    return `On ${f.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][f.getUTCMonth()]}`;
  };
  const sorryText = (name, now, tz) => ({
    t: `${sorryHi(name)} Sorry about your last run.`,
    p: `${sorryWhen(now, tz)} we adjusted how the app picks your questions, and some of it wasn't right yet: too many new genera came at once, and the questions didn't get easier after misses. It's fixed now. Sorry for the rough ride!`
  });

  // Two admin tabs in one browser share the stored draft. Each write carries _tab: {rev, seen}: its own revision and the
  // revision of the stored draft that tab had last seen. `revs` maps the revisions this tab wrote or took in to their drafts,
  // so the merge base is exactly the draft the other tab started from, even when both clicked before hearing of each other.
  // Returns null for a revision already taken in; an untagged draft (older admin page) merges against `saved`.
  function takeTab(revs, mine, saved, stored) {
    const t = stored._tab || {},
      other = Object.assign({}, stored);
    delete other._tab;
    if (t.rev && revs[t.rev]) return null;
    const m = mergeTabs(revs[t.seen] || saved, mine, other);
    if (t.rev) revs[t.rev] = other;
    return m;
  }

  // Pierre's curation and the photos per context (moved from app.js, code re-review 2026-11-01 M2, so the rules can be tested).
  const VIEWS = [
    ['wide', 'Colony'],
    ['medium', 'Close-up'],
    ['macro', 'Corallites']
  ];
  const allPhotos = g => VIEWS.flatMap(([v]) => (g.views[v] || []).map(p => ({...p, view: v})));
  // Editorial curation from curation.json (edited in admin.html): per genus, cover photo, featured photos
  // per view (in order), hidden photos and photos moved to another view. Hidden photos leave games too.
  // Candidates (data.json cand, not shown until approved) join a view when listed in add {photo: view}.
  function applyCuration(d, c) {
    // The Coral Finder book's crops left the app on 2026-11-08 (Pierre: copyrighted, R. Kelley / BYOGUIDES). curation.json
    // still names some (add, feat, quality, crop, seen: rule A1, never rewritten): those ids match no photo, so every step
    // below drops them (tests/nobook.test.js).
    // Excluded photos (exclude: {f: reason}) leave every list first: genera, lecture photos, candidates, comparisons.
    // So do the coral skeleton photos (data.json skel: 1, rule P6, Pierre, 2026-11-09: never shown, the features cannot
    // be seen properly; tools/apply_skeletons.py from judging/skeletons.json; tests/skeletons.test.js).
    const X = (c && c.exclude) || {},
      keep = L => (L || []).filter(p => !X[p.f] && !p.skel);
    Object.values(d.gen).forEach(g =>
      ['views', 'more'].forEach(s =>
        Object.keys(g[s] || {}).forEach(v => {
          g[s][v] = keep(g[s][v]);
        })
      )
    );
    ['course', 'cand'].forEach(s =>
      Object.keys(d[s] || {}).forEach(n => {
        d[s][n] = keep(d[s][n]);
      })
    );
    if (d.cmp) d.cmp = keep(d.cmp);
    // "Several corals" photos Pierre marked as one coral (single: {f: 1}) are normal photos again (games and sheet).
    const ONE = (c && c.single) || {};
    if (Object.keys(ONE).length)
      Object.entries(d.gen).forEach(([n, g]) => {
        VIEWS.forEach(([v]) => {
          const L = (g.more || {})[v];
          if (!L) return;
          L.filter(p => ONE[p.f]).forEach(p => (g.views[v] = g.views[v] || []).push(p));
          g.more[v] = L.filter(p => !ONE[p.f]);
        });
        (d.course[n] || []).forEach(p => {
          if (ONE[p.f]) delete p.multi;
        });
      });
    // "Not this genus" (out: {f: 'cmp' | genus}) runs first for every genus, so a photo given to another genus
    // can be featured or picked as cover there; 'cmp' sends it to the look-alike comparison images (d.cmp).
    Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
      const g = d.gen[n];
      if (!g) return;
      Object.entries(k.out || {}).forEach(([f, to]) => {
        let p = null,
          at = null;
        VIEWS.forEach(([v]) =>
          ['views', 'more'].forEach(s => {
            const L = (g[s] || {})[v] || [],
              i = L.findIndex(x => x.f === f);
            if (i >= 0) {
              p = L.splice(i, 1)[0];
              at = [s, v];
            }
          })
        );
        const ci = (d.course[n] || []).findIndex(x => x.f === f);
        if (ci >= 0) {
          p = d.course[n].splice(ci, 1)[0];
          at = ['course'];
        }
        // A candidate sent to another genus becomes a candidate there (shown once added in that genus).
        const ki = ((d.cand || {})[n] || []).findIndex(x => x.f === f);
        if (ki >= 0) {
          p = d.cand[n].splice(ki, 1)[0];
          at = ['cand'];
        }
        if (!p) return;
        if (to === 'cmp') (d.cmp = d.cmp || []).push({...p, g: [n]});
        else if (d.gen[to] && at[0] === 'course') (d.course[to] = d.course[to] || []).push(p);
        else if (d.gen[to] && at[0] === 'cand') ((d.cand = d.cand || {})[to] = d.cand[to] || []).push(p);
        else if (d.gen[to]) {
          const G = d.gen[to],
            S = (G[at[0]] = G[at[0]] || {});
          (S[at[1]] = S[at[1]] || []).push(p);
        }
      });
    });
    Object.entries((c && c.genera) || {}).forEach(([n, k]) => {
      const g = d.gen[n];
      if (!g) return;
      Object.entries(k.add || {}).forEach(([f, v]) => {
        const p = ((d.cand || {})[n] || []).find(x => x.f === f);
        if (p && VIEWS.some(([w]) => w === v)) (g.views[v] = g.views[v] || []).push(p);
      });
      const hide = new Set(k.hide || []),
        mv = k.move || {},
        feat = k.feat || {};
      const regroup = src => {
        const out = {};
        VIEWS.forEach(([v]) =>
          ((src || {})[v] || []).forEach(p => {
            if (hide.has(p.f)) return;
            const w = mv[p.f] || v;
            (out[w] = out[w] || []).push(p);
          })
        );
        return out;
      };
      const all = [...allPhotos(g), ...VIEWS.flatMap(([v]) => (g.more || {})[v] || []), ...(d.course[n] || [])];
      g.views = regroup(g.views);
      g.more = regroup(g.more);
      // Featured photos lead their view, so quick picks (comparisons, first photo of a view) use them too.
      Object.entries(g.views).forEach(([v, L]) => {
        const F = feat[v] || [];
        g.views[v] = [...F.map(f => L.find(p => p.f === f)).filter(Boolean), ...L.filter(p => !F.includes(p.f))];
      });
      if (d.course[n]) d.course[n] = d.course[n].filter(p => !hide.has(p.f)).map(p => (mv[p.f] ? {...p, v: mv[p.f]} : p));
      if (Object.keys(feat).length) g.feat = feat;
      const cv = k.cover && !hide.has(k.cover) && all.find(p => p.f === k.cover);
      if (cv) g.coverP = cv;
      // Zoom levels per genus (curation lv: 2 | 3, admin switch). 2 levels: the Closer photos join Colony, the Closer
      // view disappears; his Closer picks stay in curation.json, so switching back to 3 restores them.
      if (k.lv === 3) delete g.levels;
      if (k.lv === 2 && g.levels !== 2) {
        g.levels = 2;
        ['views', 'more'].forEach(s => {
          const S = g[s] || {};
          if ((S.medium || []).length) S.wide = [...(S.wide || []), ...S.medium];
          delete S.medium;
        });
        if (d.course[n]) d.course[n] = d.course[n].map(p => (p.v === 'medium' ? {...p, v: 'wide'} : p));
      }
    });
  }
  // Photos per context (applySlots). Pierre's rule: every IMR photo and every photo of his own is used, with no cap;
  // photos from other iNat observers only fill a set that is short. Per genus
  // and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = one list, every photo kept
  // (game: the featured first, then IMR/own, each by quality, Poor last; until 2026-11-03 it was split into Easy / Medium
  // / Hard sets that gave a new photo its starting difficulty, docs/LEARNING.md): since 2026-11-02 (Pierre: new photos must
  // come into the games, the players' answers rate them) games take every photo kept, IMR/own first; they were capped
  // at 4 Medium and 4 Hard, other observers' photos only filling a short set, so newly validated candidates stayed out; Coral
  // Coral ID Key (needs variety) = featured + 5 photos from other iNat observers (Pierre, 2026-11-08: 2 before; field
  // photos fill the variety the Coral Finder book's crops gave, removed that day). Pierre's picks (feat, hide, quality,
  // use) always win; Claude's suggestions (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'}
  // keeps a photo on the sheet only or in games only. Nothing is written back: photos left out simply stay unused.
  const CAP = {feat: 3, sheet: 6, inat: 5};
  // A Coral Finder book crop's id (<genus>-cf-<page>-<tag>). The crops left the app and the repository on 2026-11-08
  // (Pierre); curation.json still names some (rule A1: never rewritten), ids that match no photo any more.
  const cfCrop = f => /^[a-z]+-cf-\d/.test(f || '');
  // The automatic rating never calls an IMR lecture photo Poor (Pierre: it misjudges slide images); only his own rating can (autoQ).
  const isCore = p => !!(p.imr || p.own);
  // o.picks = picks.json (Claude's suggested featured photos), o.autoq = quality.json q (automatic rating).
  function applySlots(d, c, o = {}) {
    const AUTOQ = o.autoq || {},
      autoQ = f => {
        const a = AUTOQ[f] || 2;
        return a === 1 && /^imrl?-/.test(f) ? 2 : a;
      };
    const qualOf = (c, f) => ((c && c.quality) || {})[f] || autoQ(f);
    const use = (c && c.use) || {},
      sug = (o.picks || {}).feat || {};
    // k photos from L in order, a different observation each time when possible.
    const take = (L, k) => {
      const out = [],
        seen = new Set();
      [true, false].forEach(fresh =>
        L.forEach(p => {
          if (out.length < k && !out.includes(p) && (!fresh || !seen.has(p.o || p.f))) {
            out.push(p);
            seen.add(p.o || p.f);
          }
        })
      );
      return out;
    };
    const fill = (L, extra, k) =>
      L.length >= k
        ? L
        : [
            ...L,
            ...take(
              extra.filter(p => !L.includes(p)),
              k - L.length
            )
          ];
    Object.entries(d.gen).forEach(([n, g]) => {
      const course = (d.course[n] || []).map(p => ({...p, view: p.v === 'medium' && g.levels === 2 ? 'macro' : p.v}));
      g.sl = {};
      VIEWS.forEach(([v]) => {
        const field = (g.views[v] || []).filter(p => !p.multi),
          q = p => qualOf(c, p.f),
          // Equal quality: an open licence or his own first (rightsRank, Q270), else the list's order: the sheet, the
          // featured photos and the Coral ID Key. The game list keeps the quality order alone (byQ0), its featured lead
          // included, so the draw's ties (model.js photoSet's variety cut, which follows the list) never read a licence
          // (Codex review #742).
          byQ0 = L => L.slice().sort((a, b) => q(b) - q(a)),
          byQr = L => L.slice().sort((a, b) => q(b) - q(a) || rightsRank(a) - rightsRank(b));
        const all = [...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'game');
        // Sheet order (Pierre): IMR photos first, then his own, then other observers, each by quality; Poor photos last.
        // Never a Poor photo while better ones exist, except IMR lecture photos (Pierre).
        // Featured = always the first 3 (Pierre): his pinned photos, then the best remaining ones.
        // A pin or a suggestion naming no photo (a removed one: a Coral Finder book crop, 2026-11-08) is dropped.
        const slot = byQ => {
          const rr = [...byQ(all.filter(p => p.imr)), ...byQ(all.filter(p => !p.imr && p.own))];
          const others = byQ(all.filter(p => !isCore(p)));
          const ranked = [...rr, ...others].sort((a, b) => (q(a) === 1) - (q(b) === 1));
          const find = f => all.find(p => p.f === f);
          const pin = ((g.feat || {})[v] || []).map(find).filter(Boolean),
            hint = ((sug[n] || {})[v] || []).map(find).filter(Boolean);
          const pool = [...hint, ...ranked].filter(p => !pin.includes(p)),
            k = CAP.feat - Math.min(pin.length, CAP.feat);
          const feat = [
            ...pin.slice(0, CAP.feat),
            ...fill(
              take(
                pool.filter(p => p.imr || q(p) !== 1),
                k
              ),
              pool,
              k
            )
          ];
          return {others, ranked, feat};
        };
        const {others, ranked, feat} = slot(byQr),
          feat0 = slot(byQ0).feat;
        // Sheet (Pierre): strictly the first 6 per view in the admin order, the 3 featured then the next 3 (games still use them all).
        const more = ranked.filter(p => !feat.includes(p)).slice(0, CAP.sheet - feat.length);
        // Games: field photos and IMR lecture photos (Pierre 2026-11-01), never multi-coral photos.
        const gm = byQ0([...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'ref')),
          core = gm.filter(isCore),
          rest = gm.filter(p => !isCore(p));
        // One list per view (Pierre, 2026-11-03: the Easy / Medium / Hard sets went, docs/LEARNING.md "Hierarchical
        // photo Elo"): the featured game photos first, then IMR / own before other observers, each by quality, Poor last.
        const lead = feat0.filter(p => gm.includes(p)),
          after = [...core, ...rest].filter(p => !lead.includes(p));
        g.sl[v] = {
          feat,
          more,
          game: [...lead, ...after.filter(p => q(p) >= 2), ...after.filter(p => q(p) < 2)],
          idkey: [
            ...feat,
            ...take(
              others.filter(p => !feat.includes(p) && !p.imr),
              CAP.inat
            )
          ]
        };
        // Featured photos lead their view, so every "first photo of the view" (Look-alikes, Compare, Lab, home) uses them.
        if (g.views[v]) g.views[v] = [...feat.filter(p => g.views[v].includes(p)), ...g.views[v].filter(p => !feat.includes(p))];
      });
    });
  }

  // Global player level (Pierre, 2026-11-01: "good beta testers must not wait 100 questions for it to get harder"): the
  // starting ability of a genus the player has never answered. The player's global ability is an Elo over ALL their answers
  // (app.js keeps it in the progress as the pseudo-genus LEVEL, '~level': ok, ko and th like a genus, so it syncs and
  // merges like one); progress saved before it existed falls back on the mean ability of the genera answered. It is shrunk
  // towards 0 while answers are few (M / (M + N)) and only partly carried over (W: knowing Acropora well says something,
  // not everything, about Porites), then clamped to [LO, HI]: a strong player's first question on a new genus has traps
  // and harder photos but is never the hardest, a struggling player's starts a little easier. Taken once: the first answer
  // on the genus saves its own ability (s.th) from there.
  // p (2026-11-03, the first-launch question, CHOICE below): the level the player said they start from. The answers are
  // shrunk towards it instead of towards 0, with the same weight N: (m t + N p) / (m + N). No answers: W x p; p 0 (the
  // default, "I'm new to corals") is the rule as it was. No new constant.
  const LEVEL = '~level',
    START = {W: 0.8, N: 10, LO: -0.5, HI: 1.5};
  function playerStart(P, skip, p = 0) {
    P = P || {};
    const n = s => ((s && s.ok) || 0) + ((s && s.ko) || 0),
      G = P[LEVEL];
    let m = 0,
      t = 0;
    if (G && typeof G.th === 'number' && n(G)) {
      m = n(G);
      t = m * G.th;
    } else
      Object.keys(P).forEach(g => {
        const s = P[g] || {};
        if (g === skip || g === LEVEL || typeof s.th !== 'number' || !n(s)) return;
        m += n(s);
        t += n(s) * s.th;
      });
    p = typeof p === 'number' && isFinite(p) ? p : 0;
    if (!m && !p) return 0;
    const v = (START.W * (t + START.N * p)) / (m + START.N);
    return Math.round(Math.min(START.HI, Math.max(START.LO, v)) * 100) / 100;
  }

  // The first-launch question (Pierre, 2026-11-03): a forced choice among three, in the welcome tour before the first
  // question (or on a card before the next quiz question for a player who skipped the tour, and once for an existing
  // player with fewer than ASK answers; from ASK answers on the choice is inferred silently: startInfer). It initialises
  // a few variables of the existing model, never a coded path: v.p, the level the answers are shrunk towards (playerStart:
  // the starting ability of a genus never answered, hence the photos, traps and single views of its first questions, and
  // the shaky signal that paces the opening of genera); v.at, the answer from which the offer to open all genera can come
  // (model.js introOffer, INTRO.OFFER.AT for everyone before); v.basics, Coral basics offered first. "new" is the
  // default player of before (a new player is a beginner). Values and their simulation: docs/LEARNING.md "The first-
  // launch question". Each subject asks its own (SUBJECTS start: its words; the fish welcome question, Pierre 2026-11-04),
  // with these answers and variables, stored per subject in reefid-sync-<subject>-start (startKey, synced with the
  // progress): {c, t, at, via, w, v, hd, fb, h}.
  // Fallback (for everyone, also those who answered: they may have picked wrong): the answers after the choice (w:
  // [difficulty, guess rate, right, first answer on its genus], kept up to the last checkpoint) are checked at AT (40
  // and 60) answers only (Pierre, 2026-11-04: no card before 40 answers in either direction, "an expert, 20 answers
  // isn't enough: with few genera unlocked even a mediocre player gets everything right"; startCheck). The level each
  // answer predicts is a band around its prior, the edges midway between the priors (new under 0.25, IMR course 0.25 to
  // 0.875, know well above). The rule reads the level the game already keeps, the global level (the Elo over every
  // answer, difficulty allowed for), with its standard error over the window (Pierre's pick, 2026-11-04, variant
  // "Ba80H", after weighing the errors: a true beginner left on a harder path is the costliest one, so "lower" is
  // sensitive and its card a gentle offer, cheap when it is wrong): 'lo' (Coral basics, or a lower answer; only for the
  // answers with a floor, IMR course and know well) when the global level is below the floor with one-sided 80%
  // confidence (ZL), or the opening hold has fired in the window (#425 eases the questions then, so the misses do not
  // show in the level); 'hi' (a higher answer), with OFFER.MET (10) genera met, when the global level is above the
  // band's ceiling with 95% confidence (Z, as the admin's level margin) and, as a guard only, the level fitted on each
  // genus's FIRST answer (before the game has adapted to it; levelFit) is above the ceiling too: a player who did well
  // only on the few genera they have learned is not moved up. The simulation, the real log and the variants compared:
  // docs/LEARNING.md "The fallback test, redesigned".
  const CHOICE = {
    ASK: 50,
    AT: [40, 60], // the checkpoints of the fallback window (answers after the choice); the window ends at the last
    Z: 1.96,
    ZL: 0.84, // "lower": one-sided 80%
    MET: 10, // the slate genera met before a 'hi' verdict: the same as the open-all offer's (model.js INTRO.OFFER.MET)
    // [id, variables], in order from the lowest level to the highest (startBand); their words per subject: SUBJECTS start.
    opts: [
      ['new', {p: 0, at: 50, basics: 1}],
      ['imr', {p: 0.5, at: 30, basics: 0}],
      ['know', {p: 1.25, at: 20, basics: 0}]
    ]
  };
  const startOpt = c => CHOICE.opts.find(o => o[0] === c) || null;
  // The variables of a choice (none yet, or an unknown one: the default player's).
  const startVars = c => (startOpt(c) || CHOICE.opts[0])[1];
  // The band of levels an answer predicts: [floor, ceiling], the edges midway between its prior and its neighbours'.
  function startBand(c) {
    const i = CHOICE.opts.findIndex(o => o[0] === c),
      p = j => CHOICE.opts[j][1].p;
    return [i > 0 ? (p(i - 1) + p(i)) / 2 : -Infinity, i >= 0 && i < CHOICE.opts.length - 1 ? (p(i) + p(i + 1)) / 2 : Infinity];
  }
  // The level that best explains answers A ([difficulty, guess rate, right]) on the ability scale (the app's
  // g + (1 - g) sigmoid(level - difficulty)), searched over ELO.lo..hi, and its standard error 1 / sqrt(information).
  const stSig = x => 1 / (1 + Math.exp(-x));
  const stP = (th, d, g) => g + (1 - g) * stSig(th - d);
  const stInfo = (th, d, g) => {
    const q = stSig(th - d),
      pr = stP(th, d, g);
    return ((1 - g) * q * (1 - q)) ** 2 / Math.max(1e-9, pr * (1 - pr));
  };
  const stSe = (th, A) =>
    1 /
    Math.sqrt(
      Math.max(
        1e-9,
        A.reduce((t, a) => t + stInfo(th, a[0], a[1]), 0)
      )
    );
  function levelFit(A) {
    let best = -Infinity,
      bt = 0;
    for (let i = 0, lo = -1.5, hi = 3; lo + i * 0.02 <= hi + 1e-9; i++) {
      const th = lo + i * 0.02,
        ll = A.reduce((t, a) => t + Math.log(a[2] ? stP(th, a[0], a[1]) : 1 - stP(th, a[0], a[1])), 0);
      if (ll > best) ((best = ll), (bt = th));
    }
    return [Math.round(bt * 100) / 100, stSe(bt, A)];
  }
  // The verdict at a checkpoint (AT: 40 or 60 answers after the choice), null between them and when consistent: 'lo'
  // or 'hi' (above: the opening hold alone is enough for 'lo'). w: the window's answers [d, g, right, first]; lv: the global level now; met: the slate genera met;
  // held: the opening hold fired in the window.
  function startCheck(w, c, lv, met, held) {
    const n = (w || []).length;
    if (!CHOICE.AT.includes(n) || !startOpt(c) || typeof lv !== 'number') return null;
    const [floor, ceil] = startBand(c),
      se = stSe(lv, w),
      z = CHOICE.Z;
    if (isFinite(floor) && (held || lv + CHOICE.ZL * se < floor)) return 'lo';
    if (met < CHOICE.MET || lv - z * se <= ceil) return null;
    // The guard: the first answers on each genus above the ceiling too (never a trigger on their own).
    const F = w.filter(a => a[3]);
    return F.length && levelFit(F)[0] > ceil ? 'hi' : null;
  }
  // The choices a fallback card offers: below the current one ('lo') or above it ('hi').
  const startNext = (c, dir) => {
    const i = CHOICE.opts.findIndex(o => o[0] === c);
    return (dir === 'lo' ? CHOICE.opts.slice(0, Math.max(0, i)).reverse() : CHOICE.opts.slice(i + 1)).map(o => o[0]);
  };
  // An existing player with ASK answers or more is not asked: the choice is inferred from their global level (the Elo
  // over all their answers, LEVEL), the choice whose starting level W x p is nearest (midpoints: under 0.2 new, under 0.7
  // imr, else know). Shown as "inferred" in the admin's player journey.
  function startInfer(P) {
    const G = (P || {})[LEVEL],
      t = G && typeof G.th === 'number' ? G.th : 0;
    return CHOICE.opts.reduce((b, o) => (Math.abs(START.W * o[1].p - t) < Math.abs(START.W * b[1].p - t) ? o : b))[0];
  }
  // The global record made at the first answer after this change: it starts from the player's history (every answer so
  // far, the answer-weighted mean ability of the genera), so their earlier answers keep counting (code review, #320).
  function levelSeed(P) {
    let ok = 0,
      ko = 0,
      m = 0,
      t = 0;
    Object.keys(P || {}).forEach(g => {
      const s = P[g] || {},
        n = (s.ok || 0) + (s.ko || 0);
      if (g === LEVEL) return;
      ok += s.ok || 0;
      ko += s.ko || 0;
      if (typeof s.th === 'number' && n) {
        m += n;
        t += n * s.th;
      }
    });
    return {ok, ko, th: m ? Math.round((t / m) * 100) / 100 : 0};
  }

  // Common first (Pierre, 2026-11-03: open the genera "easy and common first"): the opening weight of each genus not met
  // yet (model.js weighted) is multiplied by sqrt((1 + cm) / (1 + median cm of those genera)), cm = how common the genus
  // is near Dauin on iNaturalist (data.json, tools/commonness.py). No constant: the square root damps it, the median
  // makes it relative to the genera still to open. A genus without cm counts as the median (factor 1).
  // An existing account at sign-in (Pierre, 2026-11-03: players type only their first name, so two of them can pick the
  // same name and code; sync.js bindSync asks "Is it you?" before entering it): what its saved progress, as the sheet's
  // sign-in reply carries it (data, updated), says about it. n: answers (the LEVEL record's ok + ko; 0 for progress saved
  // before LEVEL existed), genera: genera answered, at: the last answer (LEVEL.at, else the latest genus s.at, else the
  // sheet's last save, then saved is true). A missing or broken field counts as nothing, never as an error.
  function accountOf(data, updated) {
    let R = {};
    try {
      R = JSON.parse((data && data['reefid-sync-coral-progress']) || '{}');
    } catch (e) {}
    if (!isObj(R)) R = {};
    const num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      L = isObj(R[LEVEL]) ? R[LEVEL] : {},
      gs = Object.keys(R).filter(g => g !== LEVEL && isObj(R[g]) && num(R[g].ok) + num(R[g].ko) > 0);
    let at = num(L.at) || Math.max(0, ...gs.map(g => num(R[g].at))),
      saved = false;
    if (!at) {
      at = num(typeof updated === 'number' ? updated : Date.parse(String(updated || '')));
      saved = !!at;
    }
    return {n: num(L.ok) + num(L.ko), genera: gs.length, at, saved};
  }

  function commonFactor(cms) {
    const v = (cms || []).filter(x => typeof x === 'number' && x >= 0).sort((a, b) => a - b),
      h = v.length >> 1,
      med = v.length ? (v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2) : 0;
    return (cms || []).map(x => (typeof x === 'number' && x >= 0 ? Math.sqrt((1 + x) / (1 + med)) : 1));
  }

  // Achievements (Pierre, 2026-11-01: "unlocked as milestones are passed, with an animated pop-up, to keep the wish to play";
  // "well spread out": learning a whole genus takes ~300-430 questions, so most rungs are the quarters on the way there).
  // Learning milestones only, never time or days played (the learning model's rule), plus one family apart, the
  // Contributions (kind 'contrib', at the end: reports sent, never learning). Each has a family, a tier
  // (1 bronze, 2 silver, 3 gold) and a test on a snapshot the app builds (app.js achSnap):
  //   {total, met, q: [genera at Open Water (>= 50%), Advanced (>= 80%), Divemaster (>= 95%) or above; model.js MASTERY,
  //   2026-11-03, were the quarters 25/50/75% before], learned (Instructor), pct, streak (best run of right answers), duel, cor,
  //    hard, elo (0 until 200 answers, app.js ELO_MIN: it moves a lot before), group (an IMR lecture group fully learned), bonus (bonus genera met),
  //    basics (Coral basics done), fb (reports counted for the Contributions, contribAdd)}.
  // Median questions to reach the old quarter rungs, simulated with the real game (2026-11-01, before the levels; 75% / 90% right): 5 at 25%
  // 76 / 57, 10 at 50% 231 / 137, 5 at 75% 363 / 203, first learned ~430 / ~300.
  // Descriptions say what the player can now do (Pierre, 2026-11-02: informational feedback motivates, Deci, Koestner &
  // Ryan 1999; counts stay counts: genera met, progress %, Elo).
  const ACH = [
    ['met10', 'Explorer', 'Met 10 genera', 1, '🧭', s => s.met >= 10],
    ['met20', 'Wide eyes', 'Met 20 genera', 1, '🧭', s => s.met >= 20],
    ['metall', 'Whole slate', 'Met every genus of the list', 2, '🧭', s => s.total && s.met >= s.total],
    ['q25a', 'Open Water: 5 genera', '5 genera at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 5],
    ['q25b', 'Open Water: 10 genera', '10 genera at Open Water level or above', 1, '🌱', s => s.q[0] >= 10],
    ['q25c', 'Open Water: 20 genera', '20 genera at Open Water level or above', 2, '🌱', s => s.q[0] >= 20],
    ['q50a', 'Advanced: 5 genera', '5 genera at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 5],
    ['q50b', 'Advanced: 10 genera', '10 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 10],
    ['q50c', 'Advanced: 20 genera', '20 genera at Advanced level or above', 2, '🌿', s => s.q[1] >= 20],
    ['q75a', 'Divemaster: 5 genera', '5 genera at Divemaster level or above (95%: their mastery exam is on)', 2, '🪸', s => s.q[2] >= 5],
    ['q75b', 'Divemaster: 10 genera', '10 genera at Divemaster level or above', 2, '🪸', s => s.q[2] >= 10],
    ['learn1', 'First Instructor', "You passed a genus's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['learn5', 'Instructor: 5 genera', 'Mastery exam passed on 5 genera', 3, '🎓', s => s.learned >= 5],
    ['learn10', 'Instructor: 10 genera', 'Mastery exam passed on 10 genera', 3, '🎓', s => s.learned >= 10],
    ['learn20', 'Instructor: 20 genera', 'Mastery exam passed on 20 genera', 3, '🎓', s => s.learned >= 20],
    ['learnall', 'Coral master', 'You know every genus of the list for sure', 3, '👑', s => s.total && s.learned >= s.total],
    ['pct5', 'First steps', '5% progress', 1, '📈', s => s.pct >= 5],
    ['pct10', 'On the way', '10% progress', 1, '📈', s => s.pct >= 10],
    ['pct25', 'A quarter', '25% progress', 2, '📈', s => s.pct >= 25],
    ['pct50', 'Half the slate', '50% progress', 2, '📈', s => s.pct >= 50],
    ['pct75', 'Three quarters', '75% progress', 3, '📈', s => s.pct >= 75],
    ['pct100', 'Complete', '100% progress', 3, '📈', s => s.pct >= 100],
    ['run10', 'On a roll', '10 right in a row in the Quiz: your eye is getting sharp', 1, '🔥', s => s.streak >= 10],
    ['run25', 'Unstoppable', '25 right in a row in the Quiz: a sharp eye', 2, '🔥', s => s.streak >= 25],
    ['duel', 'Look-alike slayer', 'You told two look-alikes apart', 1, '⚔️', s => s.duel],
    ['cor', 'Corallite reader', 'You named a genus from its corallites alone', 1, '🔬', s => s.cor],
    ['hard', 'Sharp eye', 'You named a photo most players miss, in the Quiz', 2, '🎯', s => s.hard],
    ['elo1100', 'Elo 1100', 'Reached an Elo of 1100', 1, '⭐', s => s.elo >= 1100],
    ['elo1200', 'Elo 1200', 'Reached an Elo of 1200', 2, '⭐', s => s.elo >= 1200],
    ['elo1300', 'Elo 1300', 'Reached an Elo of 1300', 3, '⭐', s => s.elo >= 1300],
    ['elo1400', 'Elo 1400', 'Reached an Elo of 1400', 3, '🌟', s => s.elo >= 1400],
    ['group', 'Group complete', 'You know a whole IMR lecture group', 3, '🧩', s => s.group],
    ['bonus', 'Off the list', 'You met a bonus genus, off the IMR list', 2, '🔓', s => s.bonus >= 1],
    // Coral basics done (Pierre, 2026-11-03: completion recognised): every step of the module seen (proto/basics.js), a
    // learning milestone like the others (the words the ID tips use), reached in about 5 minutes by those who take it.
    ['basics', 'Coral basics', 'You know the words the ID tips use: polyp, corallite, septa, walls, growth forms', 1, '📖', s => s.basics],
    // Contributions (Pierre, 2026-11-05, Q65): a family of its own, apart from the learning ones above, for the players who
    // send reports and feedback, to encourage it and show it is taken seriously. kind 'contrib': never in the learning
    // count (progress.js badge, viewAch), every tier pops up right after the report that earns it (progress.js achCheck).
    // s.fb = reports counted (contribAdd).
    ['fb1', 'First feedback', 'You sent your first report. Every report is read: thank you!', 1, '💬', s => s.fb >= 1, 'contrib'],
    ['fb5', 'Helping hand', '5 reports sent: you are making the app better', 2, '💬', s => s.fb >= 5, 'contrib'],
    ['fb10', 'Co-author', '10 reports sent: the app owes you a lot', 3, '💬', s => s.fb >= 10, 'contrib']
  ].map(([id, title, desc, tier, icon, test, kind = 'learn']) => ({id, title, desc, tier, icon, test, kind}));
  // The fish achievements (Pierre, 2026-11-04: "about 14 general fish achievements" to start; redesigned around the global
  // score, 2026-11-08, Q259-Q263: docs/LEARNING.md "Fish achievements, around the global score"). Learning milestones only
  // (rule L8), tested on the fish snapshot (progress.js achSnap: the same fields over the fish slate; core = the IMR
  // course's families; circ = each circle's families, Advanced or above counted; sets.sci = scientific genera at Open
  // Water or above, setsAdv.sci at Advanced or above; pct = the global fish score, treeScore's %), in the shared record
  // under ids starting with f, so a fish achievement never counts in the corals' (each subject's page and badge count its
  // own list; SUBJECTS achs). Names short, fun and varied, diver-flavoured (Pierre, 2026-11-08: "des noms sympas,
  // rigolos, pour varier"); descriptions plain and exact. Retired (Q259, 2026-11-08): fpct25, removed from every record by
  // the recount (progress.js ACH_V 3, achMigrate), as every % one met on the former families' mean and not on the score.
  // Wait for the species level, documented, not built: fpct70, fpct100, species named, Fish basics (LEARNING).
  // Timing simulated with the real fish game (tools/learnsim.js --subject fish --ach).
  const FISH_ACH = [
    ['fmet5', 'Meet the neighbours', 'Met 5 fish families', 1, '🧭', s => s.met >= 5],
    ['fmetcore', 'Roll call', 'Met every family of the IMR course', 2, '🧭', s => s.core.total && s.core.met >= s.core.total],
    ['fmetall', 'Full logbook', 'Met every fish family in the game', 2, '🧭', s => s.total && s.met >= s.total],
    ['fq50a', 'Certified', '5 families at Open Water level or above (50%+)', 1, '🌱', s => s.q[0] >= 5],
    ['fq50b', "School's in", '20 families at Open Water level or above', 2, '🌱', s => s.q[0] >= 20],
    ['fq80a', 'Night diver', '5 families at Advanced level or above (80%+)', 1, '🌿', s => s.q[1] >= 5],
    ['fq80b', 'Deep diver', '15 families at Advanced level or above', 2, '🌿', s => s.q[1] >= 15],
    ['fq95a', 'Dive guide', '5 families at Divemaster level or above (95%: their mastery exam is on)', 2, '🐠', s => s.q[2] >= 5],
    ['flearn1', 'First briefing', "You passed a family's mastery exam: you could teach it", 2, '🎓', s => s.learned >= 1],
    ['flearn10', 'Course director', 'Mastery exam passed on 10 families', 3, '🎓', s => s.learned >= 10],
    ['flearn30', 'Fish whisperer', 'Mastery exam passed on 30 families', 3, '🎓', s => s.learned >= 30],
    // The circles (the IMR course's families, those that open right after them, those beyond the course).
    [
      'fcoreadv',
      'House reef',
      'Every family of the IMR course at Advanced level or above (80%+)',
      2,
      '🗺️',
      s => s.core.total && s.core.adv >= s.core.total
    ],
    [
      'fc2',
      'Supporting cast',
      'Every family that opens right after the IMR course’s at Advanced level or above',
      2,
      '🗺️',
      s => !!(s.circ && s.circ[1] && s.circ[1].total && s.circ[1].adv >= s.circ[1].total)
    ],
    [
      'fc3adv',
      'Muck diver',
      '20 families beyond the IMR course at Advanced level or above',
      3,
      '🗺️',
      s => !!(s.circ && s.circ[2] && s.circ[2].adv >= 20)
    ],
    [
      'flearncore',
      'Transect master',
      'You know every family of the IMR course for sure',
      3,
      '👑',
      s => s.core.total && s.core.learned >= s.core.total
    ],
    // The global fish score (core.js treeScore, Q242), every 10 points (Q259); 50% is the families' anchor.
    ['fpct10', 'Giant stride', '10% fish progress', 1, '📈', s => s.pct >= 10],
    ['fpct20', 'Bubble trail', '20% fish progress', 1, '📈', s => s.pct >= 20],
    ['fpct30', 'Reef crest', '30% fish progress', 2, '📈', s => s.pct >= 30],
    ['fpct40', 'Down the wall', '40% fish progress', 2, '📈', s => s.pct >= 40],
    ['fpct50', 'Family reunion', '50% fish progress: what knowing every family for sure is worth', 3, '📈', s => s.pct >= 50],
    ['fpct60', 'Blue water', '60% fish progress', 3, '📈', s => s.pct >= 60],
    // The scientific genera (an opt-in set, SUBJECTS optin sci).
    [
      'fsci5',
      'Latin lessons',
      '5 scientific genera at Open Water level or above: you can name them as EventMeasure does',
      2,
      '🏷️',
      s => (s.sets.sci || 0) >= 5
    ],
    ['fgen20', 'Name dropper', '20 scientific genera at Advanced level or above (80%+)', 2, '🏷️', s => ((s.setsAdv || {}).sci || 0) >= 20],
    ['fgen60', 'Walking field guide', '60 scientific genera at Advanced level or above', 3, '🏷️', s => ((s.setsAdv || {}).sci || 0) >= 60]
  ].map(([id, title, desc, tier, icon, test, kind = 'learn']) => ({id, title, desc, tier, icon, test, kind}));
  // The Contributions (kind 'contrib') are one family for every subject, listed with the corals' (ACH) and shown on every
  // subject's page; achFind: an achievement of any list by its id.
  const ACH_CONTRIB = ACH.filter(a => a.kind === 'contrib');
  const achFind = id => ACH.find(a => a.id === id) || FISH_ACH.find(a => a.id === id) || null;
  // Reports that count for the Contributions (Pierre, 2026-11-05, Q65): every report sent (game, enlarged photo, genus
  // sheet, Send feedback), signed in or not; one per photo: a report on photos already in a counted report does not count
  // again (several reports on one photo count once); an "Other" report counts only with a note. A counted report goes into
  // the achievements record's _fb (synced like the rest; mergeAch joins two devices' lists): its photos joined by a space,
  // or r:<id> for a report on no photo. CONTRIB_MAX entries are kept, more than the top tier needs.
  const CONTRIB_MAX = 50;
  const contribPhotos = r =>
    String((r && r.ph) || '')
      .split(/\s+/)
      .filter(Boolean);
  function contribKey(r, have) {
    if (!r || !r.id || (r.why === 'other' && !String(r.note || '').trim())) return '';
    const ph = contribPhotos(r);
    if (!ph.length) return 'r:' + r.id;
    const done = new Set((have || []).flatMap(k => (k.startsWith('r:') ? [] : k.split(' '))));
    return ph.some(f => done.has(f)) ? '' : ph.join(' ');
  }
  // Two devices' lists of counted reports (mergeAch): b's entries join a's by the same rule, so one photo reported on
  // each device before they synced counts once (Codex review #579); the last CONTRIB_MAX.
  function contribJoin(a, b) {
    const out = Array.isArray(a) ? [...a] : [];
    (Array.isArray(b) ? b : []).forEach(k => {
      if (typeof k !== 'string' || !k || out.includes(k)) return;
      if (k.startsWith('r:') || contribKey({id: 'x', ph: k}, out)) out.push(k);
    });
    return out.slice(-CONTRIB_MAX);
  }
  // Counts report r into the record A (changes A._fb); true when it counted.
  function contribAdd(A, r) {
    const have = Array.isArray(A && A._fb) ? A._fb : [],
      k = contribKey(r, have);
    if (!A || !k || have.includes(k)) return false;
    A._fb = [...have, k].slice(-CONTRIB_MAX);
    return true;
  }
  // The achievements a snapshot meets that `have` ({id: time}) does not hold yet, in list order.
  const newAch = (snap, have, list = ACH) => list.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);
  // The full recount (progress.js achMigrate, achPending; Pierre, 2026-11-01 and 2026-11-08: "recalculer ... leur succès
  // actuel" from their current progress): into B, every achievement of list that the snapshot meets, dated by the
  // earliest of B's own (a copy already recounted, merged in) and old's (the record before the recount), else t. What the
  // snapshot does not meet is left out (an achievement of an older record never comes back through a merge: mergeAch
  // takes no achievement from a record of another version). Changes B; returns the ids it holds from list.
  function achRecount(B, old, list, snap, t) {
    const ok = x => typeof x === 'number' && x > 0;
    return (list || [])
      .filter(a => a.test(snap))
      .map(a => {
        const d = [B[a.id], old && old[a.id]].filter(ok);
        B[a.id] = d.length ? Math.min(...d) : t;
        return a.id;
      });
  }
  // Achievements taken back (Pierre, 2026-11-03): only those that rest on genera learned, and only when a recalculation
  // takes a learned mark away (model.js mxRecalc, progress.js achRecheck); anywhere else achievements are only added.
  // achRevoke removes from A ({id: time}) those of ACH_LEARN that the snapshot no longer meets, and dates in A._gone
  // {id: time} every one of them the snapshot does not meet, held here or not: the tombstone keeps a copy earned before
  // (the sheet's, another device's not merged yet) from coming back through a merge (mergeAch); earned again later, the
  // achievement carries a newer time and stays. Returns the ids removed.
  const ACH_LEARN = ['learn1', 'learn5', 'learn10', 'learn20', 'learnall', 'group', 'flearn1', 'flearn10', 'flearn30', 'flearncore'];
  // list: the achievements the snapshot is about (a subject's own: SUBJECTS achs), the corals' by default.
  function achRevoke(A, snap, t, list = ACH) {
    if (!A || typeof A !== 'object') return [];
    const off = list.filter(a => ACH_LEARN.includes(a.id) && !a.test(snap)).map(a => a.id),
      out = off.filter(id => A[id]);
    if (off.length) A._gone = {...(A._gone || {})};
    off.forEach(id => {
      delete A[id];
      A._gone[id] = Math.max(t, A._gone[id] || 0);
    });
    return out;
  }
  // "Your feedback helped" (Pierre, 2026-11-05, Q66): when the admin marks a report done (admin To do › Reports ✓ Done:
  // curation.json seen 'rep:<id>', public), the player who sent it is told once, at their next visit (progress.js
  // achHelped). The achievements record keeps the ids of the reports the player sent (_rep: from this device at sending,
  // sync.js reportDialog; from the sheet's load reply for those sent signed in, Code.gs v57 reps) and those already thanked
  // (_thx), both synced and joined across devices (mergeAch), the last LIST_MAX of each: more thanked kept than sent, and
  // twice the sheet's REPS_MAX (Code.gs) sent, so an id the sheet lists again is never one whose thanks were dropped
  // (Codex review #581: equal caps evicted a thanked id the sheet then brought back). Ids only: nothing the admin
  // wrote reaches the player. repsAdd adds ids (true when A changed). Never again and again for a player who sends many
  // reports (Pierre, 2026-11-05): thanked at the first report handled, then every report handled since the last thanks in
  // one, at most once per HELPED_GAP (7 days; the record's _thxAt, the time of the last thanks, the latest of two devices).
  // helpedDue returns the ids to thank now ([] within the gap); helpedMark marks them thanked at `now`.
  const REP_ID = /^[a-z0-9]{1,20}$/,
    LIST_MAX = {_fb: CONTRIB_MAX, _rep: 100, _thx: 200};
  function repsAdd(A, ids) {
    const have = Array.isArray(A && A._rep) ? A._rep : [],
      add = [...new Set((ids || []).map(String))].filter(x => REP_ID.test(x) && !have.includes(x));
    if (!A || !add.length) return false;
    A._rep = [...have, ...add].slice(-LIST_MAX._rep);
    return true;
  }
  // Reports handled in a PR (Pierre, 2026-11-05): reports-handled.json {"<report id>": {pr, at}}, edited in PRs by the
  // integrator (agents never write curation.json), counts as Pierre's Done (curation.json seen 'rep:<id>'): handledSeen
  // returns the 'rep:<id>' keys of both, the one map helpedDue and the admin read.
  function handledSeen(seen, file) {
    const out = {};
    Object.keys(seen && typeof seen === 'object' ? seen : {}).forEach(k => k.startsWith('rep:') && seen[k] && (out[k] = 1));
    Object.keys(file && typeof file === 'object' && !Array.isArray(file) ? file : {}).forEach(
      id => REP_ID.test(id) && (out['rep:' + id] = 1)
    );
    return out;
  }
  const HELPED_GAP = 7 * 864e5;
  function helpedDue(A, seen, now) {
    if (!A || !seen || typeof seen !== 'object') return [];
    if (typeof A._thxAt === 'number' && now - A._thxAt < HELPED_GAP) return [];
    const thx = Array.isArray(A._thx) ? A._thx : [];
    return (Array.isArray(A._rep) ? A._rep : []).filter(id => seen['rep:' + id] && !thx.includes(id));
  }
  function helpedMark(A, ids, now) {
    if (!A || !(ids || []).length) return;
    const thx = Array.isArray(A._thx) ? A._thx : [];
    A._thx = [...thx, ...ids.filter(id => !thx.includes(id))].slice(-LIST_MAX._thx);
    A._thxAt = Math.max(now, typeof A._thxAt === 'number' ? A._thxAt : 0);
  }
  // Two achievement records of one player (progress.js achMerge: another device's, the sheet's, this device's before
  // signing in): every achievement with its earliest date, the best run kept; the current run (_run) stays A's. A record of
  // another version than v (progress.js ACH_V: counted on older rules) brings its feats (keys starting with _) but not its
  // achievements. Removals (_gone) join, the latest per id; an achievement dated at or before its removal, on either side,
  // is dropped (taken back, it must be earned again). Changes and returns A.
  function mergeAch(A, ra, v) {
    A = A && typeof A === 'object' ? A : {};
    if (!ra || typeof ra !== 'object') return A;
    const old = ra._v !== v,
      gone = {...(A._gone || {})};
    Object.entries(ra._gone || {}).forEach(([k, t]) => typeof t === 'number' && !(gone[k] >= t) && (gone[k] = t));
    const off = (k, t) => typeof gone[k] === 'number' && !(t > gone[k]);
    Object.keys(ra).forEach(k => {
      if (k === '_run' || k === '_v' || k === '_gone' || (old && k[0] !== '_') || off(k, ra[k])) return;
      // A list: the Contributions' _fb by their rule (contribJoin), any other (the reports sent _rep and thanked _thx) both devices' entries, each once, the last LIST_MAX.
      if (k === '_fb') return (A[k] = contribJoin(A[k], ra[k]));
      if (Array.isArray(ra[k]))
        return (A[k] = [...new Set([...(Array.isArray(A[k]) ? A[k] : []), ...ra[k]])].slice(-(LIST_MAX[k] || CONTRIB_MAX)));
      A[k] = k === '_best' || k === '_thxAt' ? Math.max(A[k] || 0, ra[k] || 0) : A[k] && !off(k, A[k]) ? Math.min(A[k], ra[k]) : ra[k];
    });
    Object.keys(gone).forEach(k => off(k, A[k]) && delete A[k]);
    if (Object.keys(gone).length) A._gone = gone;
    return A;
  }

  // Progress of a genus (2026-11-02, Pierre: BKT climbed too fast, and a right answer among a few genera counted
  // almost as much as one against the genus's look-alikes; Pelánek & Řihák 2017 recommend a moving average as the
  // mastery criterion): s.pg, an exponential moving average of the answers on the genus, each weighed by what it proves
  // (w, 0 to 1): a right answer s.pg += PROG.A × w × (1 − s.pg), w from the choices (model.js pgWeight); a miss
  // s.pg −= PROG.A × w × s.pg, w from how hard the photo was for the player (model.js pgMissW: in full on a photo at
  // the player's level, less on a harder one; Pierre: a miss on a very hard photo does not mean the genus is badly
  // known, and a miss must not cost more than it proves). Each point
  // is harder to earn than the last, a run of right answers on easy choices tops out lower than one against look-alikes,
  // and the bar follows the recent answers. PROG.M = the mastery exam's entry, shown as 95%. docs/LEARNING.md
  // "Progress (moving average) and mastery" has the simulation behind A 0.15 and M 0.8.
  // OLD: progress saved before s.pg (BKT's L) is recomputed from what the record holds in order, its last 10 results
  // (s.h), from 0, a right answer weighed 2/3 (what it proved is not known: the middle weight, a 4-choice question
  // without look-alike or 2 choices with one). Simulated, that is close for a beginner and below the live value for a
  // strong player (never above it by much): 10 right answers in a row give 0.65, 77% on the bar, so no genus enters the
  // exam on old answers alone. A genus learned on such a record lost it (memRecalc, 2026-11-03: its exam was passed under
  // BKT); until that runs, it counts at the exam entry.
  const PROG = {A: 0.15, M: 0.8, LOOK: 0.5, OLD: 0.67};
  // A learned genus keeps its mark while its progress stays at PROG.M × (1 − PROG.A) or above after a miss (one miss from
  // PROG.M or above, not two): the game's rule (model.js mxKept, applied in quiz.js answer after each miss) and the
  // replay's (replayProgress lm, replayedOf).
  const mxKeeps = pg => pg >= PROG.M * (1 - PROG.A) - 1e-6;
  const pgStep = (g, good, w) => Math.round((g + PROG.A * w * ((good ? 1 : 0) - g)) * 1e4) / 1e4;
  // The fallback for a device that never reaches the sheet: once it does, the sheet's full replay of its log replaces
  // such a record (replayProgress, sync.js replayAdopt).
  function pgOf(s) {
    if (!s) return 0;
    if (typeof s.pg === 'number') return s.pg;
    const g = [...String(s.h || '')].reduce((x, c) => x + PROG.A * (c === '1' ? PROG.OLD : 1) * ((c === '1' ? 1 : 0) - x), 0);
    return s.mx ? Math.max(g, PROG.M) : g;
  }
  // The bar of a genus, 0 to 1: the dynamic bar (barOf: the domain score corrected by the genus's false alarms, at most
  // 95%; a record not rebuilt yet, its former moving average s.pg filling 95% on its way to PROG.M), then each
  // mastery-exam question passed fills a fifth of what is left to 100% (1% a question from 95%), the passed exam makes
  // it 100%. P, n: the player's progress and the genus's name, for the false-alarm correction (faOf); without them, none.
  function scoreOf(s, P, n) {
    if (!s) return 0;
    if (s.mx) return 1;
    const b = barOf(s, P, n);
    // At most 4 of the 5 exam steps before the exam is passed (Codex review #393): an exam begun before typed questions
    // can have 5 right answers still waiting for its typed ones, and only a passed exam (s.mx) makes 100%.
    return b + (examOpen(s, P, n) && s.ex ? ((1 - b) * Math.min(4, s.ex.k || 0)) / 5 : 0);
  }
  // Progress % of a saved progress P over a list of genera, as the app shows it (genScore / progPct). The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_, v16; s.pg from v22): keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + scoreOf((P || {})[n], P, n), 0)) / list.length) : 0;
  }
  // Weights by commonness (Pierre, 2026-11-08, Q242: the fish global score's alternative A): each item weighs 1/√ of its
  // rank by its count, the largest count first (rank 1 weighs 1, rank 4 weighs 0.5, rank 100 weighs 0.1). Tied counts
  // share the mean of the ranks they span (fractional ranking), so the order of the list never matters, and the items
  // nobody counted (0) share the last ranks' mean: they weigh the least, never nothing. counts: numbers (anything else
  // counts 0). Returns the weights in the list's order.
  function rankWeights(counts) {
    const c = (counts || []).map(x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0)),
      ord = c.map((x, i) => i).sort((i, j) => c[j] - c[i]),
      w = new Array(c.length);
    for (let a = 0; a < ord.length;) {
      let b = a;
      while (b + 1 < ord.length && c[ord[b + 1]] === c[ord[a]]) b++;
      const r = (a + 1 + b + 1) / 2; // the mean of ranks a+1 .. b+1
      for (let k = a; k <= b; k++) w[ord[k]] = 1 / Math.sqrt(r);
      a = b + 1;
    }
    return w;
  }
  // The tree of the fish global score (treeScore, SUBJECTS fish score; Pierre, 2026-11-08, Q242; docs/FISH_PATH.md
  // "My progress (fish)"): the families of the slate on the trunk, each weighted by the sum of its species' weights; on the
  // branches every species of those families, weighted by how common it is near Dauin (rankWeights over fish.json
  // present.dauinU, its distinct Research Grade observers within 40 km: observers, not observations, so a few keen
  // photographers of one species do not weigh; Codex review #730), with its units: its genus when the game has it as a unit (the scientific
  // genera of circle 1, app.js fishGenera), its scientific and common names none until the species level exists. The species with
  // no unit of their own are packed by genus and circle (their weights summed: the same score, a tree the sheet can keep).
  // The circle is the family's (treeScore by: the components per circle).
  function fishScoreTree(X, F) {
    const sp = new Map((F.species || []).map(s => [s.id, s])),
      fam = new Map((F.families || []).map(f => [f.id, f])),
      fams = [...X.c1, ...X.c2, ...X.c3].filter(id => fam.has(id)),
      L = fams.flatMap(id => (fam.get(id).species || []).filter(x => sp.has(x)).map(x => [sp.get(x), id])),
      w = rankWeights(L.map(([s]) => (s.present || {}).dauinU || 0)),
      fw = {},
      pack = new Map(),
      r4 = x => Math.round(x * 1e4) / 1e4,
      circ = id => X.gen[id].circle || 1;
    L.forEach(([s, id], i) => {
      fw[id] = (fw[id] || 0) + w[i];
      const g = s.genus && X.gen[s.genus] ? s.genus : '',
        named = !!s.common, // no common name at all: null (treeScore, Q247), never packed with the others
        key = g + '|' + circ(id) + '|' + named,
        e = pack.get(key) || [0, g, '', named ? [] : null, circ(id)];
      e[0] += w[i];
      pack.set(key, e);
    });
    return {f: fams.map(id => [id, r4(fw[id] || 0), circ(id)]), s: [...pack.values()].map(e => [r4(e[0]), ...e.slice(1)])};
  }
  // A subject's global score and its components, from one computation (Pierre, 2026-11-04 the formula, 2026-11-08 Q242 the
  // weights and the √ display; docs/FISH_PATH.md "My progress (fish)"). Every unit keeps its own bar (scoreOf: the bar as
  // the app shows it, 1 once its exam is passed, 0 never answered), which drives its levels and its exam, unchanged; this
  // only adds them up.
  // T, the subject's tree (app.js UNITS tree): f [[family unit, weight, circle]], the trunk; s [[weight, genus unit,
  // species unit, [common-name units], circle]], the branches, one per species ('' and [] for units that do not exist
  // yet). An entry of s may stand for several species of one genus with no unit of their own (their weights summed: the
  // same score, a shorter tree for the sheet). A family's weight is the sum of its species' (rankWeights over the
  // observers near Dauin), a genus's the sum of its species' too.
  // K, the subject's constants (core.js SUBJECTS score): entries (the trunk's share, 0.25), a and b (a species' credit
  // with its common names only, its scientific name only), half (a genus's share of its species' scientific credit), pow
  // (the display: 100 raw^pow, 0.5 the square root).
  // Per species: C = the mean of its common names' bars, S = max(its scientific name's bar, half × its genus's bar),
  // credit = a C + b S + (1 − a − b) C S. raw = entries × Entries + (1 − entries) × the weighted mean credit.
  // Returns {pct (the % shown, 0-100, rounded), raw, and the components, each a weighted mean from 0 to 1: entries (the
  // families), genera (the genera, each weighted by its species), common (C over the species), scientific (the species'
  // own scientific names, no genus credit), S (S over the species, the genus credit included), credit; by: the same per
  // circle, {1: {...}, 2: {...}}; units: every unit of the tree with its own bar}. A rule that reads a score reads one of
  // these (app.js fishGate: by[1].entries). A species entry whose common names are null has none at all (Q247, below).
  function treeScore(P, T, K) {
    const F = (T && T.f) || [],
      S = (T && T.s) || [],
      k = K || {},
      a = k.a,
      b = k.b,
      half = k.half,
      we = k.entries,
      units = {},
      m = k => (k ? (k in units ? units[k] : (units[k] = scoreOf((P || {})[k], P, k))) : 0),
      acc = () => ({fw: 0, f: 0, sw: 0, cw: 0, c: 0, sc: 0, S: 0, cr: 0, gw: 0, g: 0}),
      all = acc(),
      by = {},
      at = c => (by[c] = by[c] || acc()),
      genW = {};
    F.forEach(([u, w, c]) => {
      const x = m(u) * w;
      [all, at(c || 1)].forEach(o => ((o.fw += w), (o.f += x)));
    });
    S.forEach(([w, g, sp, names, c]) => {
      // names null: a species with no common name at all (Pierre, 2026-11-08, Q247: "elles ne participeront pas à la
      // branche nom commun"): out of the Common names component, and its credit is its scientific value alone (S), so it
      // still reaches 1 once its scientific name is mastered (100% stays reachable). [] : its common names have no unit
      // yet (0 until the species level).
      const none = names === null,
        N = Array.isArray(names) ? names : [],
        C = N.length ? N.reduce((t, n) => t + m(n), 0) / N.length : 0,
        own = m(sp),
        G = m(g),
        Sv = Math.max(own, half * G),
        cr = none ? Sv : a * C + b * Sv + (1 - a - b) * C * Sv;
      [all, at(c || 1)].forEach(
        o => ((o.sw += w), none || ((o.cw += w), (o.c += w * C)), (o.sc += w * own), (o.S += w * Sv), (o.cr += w * cr))
      );
      if (g) (genW[g] = genW[g] || {w: 0, c: c || 1, m: G}).w += w;
    });
    Object.values(genW).forEach(o => [all, at(o.c)].forEach(x => ((x.gw += o.w), (x.g += o.w * o.m))));
    const out = o => {
      const d = (x, y) => (y > 0 ? x / y : 0),
        r = {
          entries: d(o.f, o.fw),
          genera: d(o.g, o.gw),
          common: d(o.c, o.cw),
          scientific: d(o.sc, o.sw),
          S: d(o.S, o.sw),
          credit: d(o.cr, o.sw)
        };
      r.raw = we * r.entries + (1 - we) * r.credit;
      r.pct = Math.round(100 * Math.pow(Math.max(0, Math.min(1, r.raw)), k.pow));
      return r;
    };
    const R = out(all);
    R.by = Object.fromEntries(Object.entries(by).map(([c, o]) => [c, out(o)]));
    R.units = units; // every unit of the tree with its own bar (scoreOf), the per-unit level of each part
    return R;
  }

  // The domain-score bar (Pierre, 2026-11-06, Q127-Q129, Q135; docs/LEARNING.md "The domain-score bar"): the bar of a
  // genus is the share of ALL its possible photos, easy to hard, the player would name right, one photo alone with no
  // choices to guess from (100% = every photo named), as far as their own answers on that genus have shown (Q128: never
  // the global level, never another genus). The IRT domain score (Bock, Thissen & Zimowski 1997) over the genus's photo
  // population (random-item IRT, De Boeck 2008: a photo's difficulty d ~ N(mu_g, DOM.TAU²), mu_g the sheet's genus
  // offset gd, so adding photos moves no bar), estimated as the POSTERIOR EXPECTED domain score on a grid of abilities
  // (docs/reviews/2026-11-06-engine-algorithms-review.md §14): a fixed population prior N(DOM.M0, DOM.SD0²) for a genus
  // never answered, then each own answer's likelihood, format-aware (guess rate 1/k, none typed; a per-format offset and
  // the shared slope as inputs, Q138, Q147), with the photo's difficulty, memory and mix-ups term as the game scores it.
  // With a logistic likelihood a miss shifts the posterior down (monotone likelihood ratio), so the bar never rises on a
  // miss; the caution comes from the prior, not from a lower bound (θ - z SE rose after a miss). Learners change: before
  // each own answer the posterior drifts by DOM.Q (the process noise of a Kalman filter, Glicko's growing deviation), so
  // old answers fade and a genus learned late is credited. The grid holds the log posterior (s.dp, relative to its top,
  // 2 decimals, clipped at -DOM.CLIP), the bar its expectation (s.ds), stored at each own answer: it moves only when the
  // player answers (or a replay rebuilds it), never when the photo stats change. A genus never answered shows 0: s.ds is
  // the domain score from twice the prior's own (D0) up, a ramp from 0 at D0 below (domBar): increasing, so monotone too.
  // The dynamic bar runs 0 to 95% (min(0.95, s.ds)); the mastery exam opens at s.ds >= DOM.EX and only the exam takes
  // the genus to 100% (Pierre's Q decisions, 2026-11-06). A learned genus keeps its mark while s.ds >= DOM.KEEP.
  // A record the new rules have not rebuilt (no s.dp: progress from before rules version 9, until the sheet's full
  // replay under it reaches the device) keeps its former moving average s.pg (pgOf, PROG) as before (rule D4).
  // Grid: LO + i STEP, N points (-4 to 6, the abilities and photo difficulties the game meets, with room for the prior).
  // M0, SD0: the population prior of a genus never answered: most players start a genus not knowing it (the game's
  // ability floor ELO.lo is -1.5; a broad 1.5 lets an expert's first right answers on hard photos lift it within a
  // handful). TAU: the spread of a photo's own difficulty around its genus (the hierarchical photo Elo study,
  // docs/LEARNING.md; model.js PDIFF.EASE). SINGLE: one view alone is harder (model.js PICKD.SINGLE). Q: the drift per
  // own answer, in ability units (sd). EX: the exam's entry; KEEP: the learned mark's keep rule (about one miss below EX).
  // KNEE: where the zero ramp meets the domain score, in multiples of the prior's own D0 (domBar).
  const DOM = {LO: -4, STEP: 0.5, N: 21, M0: -2, SD0: 1.5, TAU: 0.5, SINGLE: 0.5, Q: 0.1, EX: 0.85, KEEP: 0.8, CLIP: 30, KNEE: 2};
  const domTh = i => DOM.LO + i * DOM.STEP;
  const DOM_PRIOR = Array.from({length: DOM.N}, (_, i) => -0.5 * ((domTh(i) - DOM.M0) / DOM.SD0) ** 2);
  const domNorm = lp => {
    const m = Math.max(...lp);
    return lp.map(x => Math.max(-DOM.CLIP, Math.round((x - m) * 100) / 100));
  };
  // The record's log posterior on the grid: its own (s.dp), else the prior (a genus never answered under these rules).
  const domLp = s => (s && Array.isArray(s.dp) && s.dp.length === DOM.N ? s.dp : DOM_PRIOR);
  // The chance of a right answer at ability th: g + (1 - g) R sig(S (th - d)), g the guess rate 1/k (0 typed: k
  // infinite), R the recall after a break, S the shared slope (Q147: 1, the Elo's, until the sheet estimates it).
  const domP = (th, d, k, R = 1, S = 1) => {
    const g = isFinite(k) && k > 1 ? 1 / k : 0;
    return g + (1 - g) * R * sigm(S * (th - d));
  };
  // The posterior after one own answer: the drift first (a three-point kernel of variance DOM.Q², on the probabilities;
  // none before the first answer), then the answer's likelihood. lp: the log posterior before. Returns the new one.
  function domUpdate(lp, ok, d, k, R = 1, S = 1, drift = true) {
    let x = lp.slice();
    if (drift) {
      const a = Math.min(1 / 3, (DOM.Q * DOM.Q) / (2 * DOM.STEP * DOM.STEP)),
        p = x.map(v => Math.exp(v));
      x = p.map((v, i) => Math.log(Math.max(1e-300, (1 - 2 * a) * v + a * (i ? p[i - 1] : v) + a * (i < DOM.N - 1 ? p[i + 1] : v))));
    }
    x = x.map((v, i) => {
      const q = Math.min(1 - 1e-9, Math.max(1e-9, domP(domTh(i), d, k, R, S)));
      return v + Math.log(ok ? q : 1 - q);
    });
    return domNorm(x);
  }
  // The domain score of a log posterior: the expected share of the genus's photos named right alone and typed,
  // E over θ of E over d ~ N(mu', TAU²) of sig(S (θ - d)), the inner one in closed form (sig(x / sqrt(1 + pi v / 8)),
  // the probit approximation of the logistic-normal integral). mu' = mu (the genus offset gd) + SINGLE + ot (the typed
  // format's offset, Q138: 0 until the sheet serves it).
  function domScore(lp, mu = 0, S = 1, ot = 0) {
    const c = Math.sqrt(1 + (Math.PI / 8) * S * S * DOM.TAU * DOM.TAU),
      m = (Number(mu) || 0) + DOM.SINGLE + (Number(ot) || 0);
    let w = 0,
      t = 0;
    lp.forEach((v, i) => {
      const p = Math.exp(v);
      w += p;
      t += p * sigm((S * (domTh(i) - m)) / c);
    });
    return w > 0 ? t / w : 0;
  }
  // The bar's value, 0 to 1: the domain score itself from the knee up; below, a straight ramp from 0 at the prior's own
  // (D0), so a genus never answered shows 0 and a miss from there leaves it at 0. The knee is twice D0, or halfway from
  // D0 to 1 for a very easy genus (D0 over 1/3: Codex review #646, mu -3 put 2 D0 above 1 and the exam out of reach), so
  // the bar always reaches every value up to 1. An increasing map: the bar moves the posterior's way.
  function domBar(lp, mu = 0, S = 1, ot = 0) {
    const d0 = domScore(DOM_PRIOR, mu, S, ot),
      x = domScore(lp, mu, S, ot),
      knee = Math.min(DOM.KNEE * d0, (1 + d0) / 2);
    return Math.max(0, Math.min(1, x >= knee ? x : (knee * (x - d0)) / (knee - d0)));
  }
  // One own answer on the genus record s (scoreAnswer: the genus shown; the genus wrongly given, Pierre's rule L2, as a
  // miss on its photo). d: the question's difficulty for the player, k the plausible choices, R the recall, f {mu: the
  // genus offset, o: this format's offset, t: the typed format's, S: the slope}. The stored bar moves the answer's way
  // only (a right answer never lowers it, a miss never raises it): the drift alone can move the posterior's expectation
  // a little either way, and the bar shows evidence, not the passing of answers.
  function domStep(s, ok, d, k, R = 1, f = {}) {
    const S = typeof f.S === 'number' && f.S > 0 ? f.S : 1,
      had = Array.isArray(s.dp) && s.dp.length === DOM.N;
    s.dp = domUpdate(domLp(s), ok, d + (Number(f.o) || 0), k, R, S, had);
    const b = Math.round(domBar(s.dp, f.mu, S, f.t) * 1e4) / 1e4,
      o = typeof s.ds === 'number' ? s.ds : 0;
    s.ds = ok ? Math.max(o, b) : Math.min(o, b);
    delete s.pg; // the former moving average: this record is under the domain-score rules now
  }
  // Whether a record is under the domain-score rules (s.dp), and the three readings every consumer goes through:
  // barOf (the dynamic bar, 0 to 0.95), examOpen (the mastery exam may start), keepsMark (a learned genus stays learned).
  const domOn = s => !!s && Array.isArray(s.dp) && typeof s.ds === 'number';
  // A record of a subject the sheet does not replay (SUBJECTS replay false: fish), kept under the former moving average
  // s.pg, rebuilt on the device under the domain-score rules (Pierre, 2026-11-06, Q200; model.js domRecalcAll), silently.
  // Signed-in devices keep no log of the answers the sheet has confirmed, and the sheet's answer log is not readable by
  // players, so the rebuild works from what every copy of the record holds: its right and wrong answers (ok, ko) and the
  // order of its last 10 (h). The earlier answers are spread evenly, rights among misses, then the last 10 in their
  // order, each on a photo of the unit's average difficulty d (its genus offset with one view alone) among k choices.
  // Approximate (the photos, formats and memory of each answer are not kept), deterministic, the same on every device.
  // A false alarm (this unit named on another unit's photo, scoreAnswer) adds a 0 to h and no ko: it is no miss on the
  // unit's own photos (Q174, faOf takes it), so h keeps at most ko of its zeros, the latest (Codex review #688: its
  // earlier zeros could be false alarms, and an own miss invented there would count each false alarm twice).
  // Returns the record's new dp and ds (domStep from the prior), the record itself unchanged.
  function domFromCounts(s, d, k = 4, mu = 0) {
    const ok = Math.max(0, s.ok || 0),
      ko = Math.max(0, s.ko || 0),
      h0 = String(s.h || '').replace(/[^01]/g, ''),
      z0 = [...h0].filter(c => c === '0').length;
    let drop = Math.max(0, z0 - ko);
    const h = [...h0]
        .filter(c => c === '1' || (drop > 0 ? (drop--, false) : true))
        .join('')
        .slice(-(ok + ko)),
      hr = [...h].filter(c => c === '1').length,
      r0 = Math.max(0, ok - hr),
      m0 = Math.max(0, ko - (h.length - hr)),
      seq = [];
    for (let i = 0, r = 0; i < r0 + m0; i++) {
      // Bresenham: the i-th earlier answer is right when the rights so far fall behind their share.
      const right = r0 > 0 && (m0 === 0 || (r + 1) * (r0 + m0) <= (i + 1) * r0 + r0 / 2);
      seq.push(right);
      if (right) r++;
    }
    [...h].forEach(c => seq.push(c === '1'));
    const x = {};
    seq.forEach(ok1 => domStep(x, ok1, d, k, 1, {mu}));
    return {dp: x.dp, ds: x.ds};
  }
  // The false-alarm correction (Pierre, 2026-11-06, Q174; it replaces rule L2's miss on the genus wrongly given in the
  // bar). Naming genus n for a photo of another genus is a false alarm: it says the player answers n too readily (a
  // response bias), not that they fail to name n's own photos, so it does not enter n's posterior. Signal detection
  // theory separates the two (Green & Swets 1966; Macmillan & Creelman 2005): the two-high-threshold corrected
  // recognition Pr = H - FA (Snodgrass & Corwin 1988, J. Exp. Psychol. Gen. 117(1)), H the hit rate, here the domain
  // score from n's own photos, FA the false-alarm rate: the times n was given for another genus's photo (the other
  // records' s.conf[n]) over the questions where n was a possible answer (offered among the choices, the other records'
  // s.off[n], or any typed question on another unit of its rank: P[LEVEL].tyk[rank] - s.ty, every unit of the rank asked
  // can be typed). 0 without P or
  // without a question where n could be given. The rule L2 count of the genus given (its recent results, its run) and
  // the ability are untouched.
  // A unit's rank as its id says it (a fish family f:, a scientific genus g:; a coral genus, or an id without a prefix: '').
  const rankKey = n => (/^([a-z]+):/.exec(String(n || '')) || [])[1] || '';
  function faOf(P, n) {
    if (!P || !n) return 0;
    let fa = 0,
      op = Math.max(0, (((P[LEVEL] || {}).tyk || {})[rankKey(n)] || 0) - ((P[n] || {}).ty || 0));
    for (const t in P) {
      if (t === n || t === LEVEL || !P[t]) continue;
      fa += (P[t].conf || {})[n] || 0;
      op += (P[t].off || {})[n] || 0;
    }
    return op > 0 ? Math.min(1, fa / op) : 0;
  }
  // The domain score as the bar uses it: s.ds less the genus's false-alarm rate (faOf), at least 0.
  const domVal = (s, P, n) => Math.max(0, s.ds - faOf(P, n));
  const barOf = (s, P, n) => (!s ? 0 : domOn(s) ? Math.min(0.95, domVal(s, P, n)) : 0.95 * Math.min(1, pgOf(s) / PROG.M));
  const examOpen = (s, P, n) => !!s && (domOn(s) ? domVal(s, P, n) >= DOM.EX - 1e-9 : pgOf(s) >= PROG.M);
  const keepsMark = (s, P, n) => !!s && (domOn(s) ? domVal(s, P, n) >= DOM.KEEP - 1e-9 : mxKeeps(pgOf(s)));
  // Pair coverage, the mastery exam's other entry condition (Pierre, 2026-11-06, Q129; the research note's option (a),
  // the PALM / Larkwire practice): a genus takes its exam only once it has been compared with each of its look-alikes,
  // asked with it among the choices (either way: s.off, as the game counts the offers) or mixed up with it (s.conf).
  // Pierre, 2026-11-02: "a genus can't be confirmed as learned before it has been compared with the genera it gets
  // confused with". looks: the look-alikes in play (model.js examLooks: the declared ones the player can be asked).
  // Returns the look-alikes not compared yet ([] when the condition holds).
  const looksLeft = (P, n, looks) => {
    const s = (P || {})[n] || {},
      seen = (x, y) => ((P[x] || {}).off || {})[y] > 0 || ((P[x] || {}).conf || {})[y] > 0;
    return (looks || []).filter(x => x !== n && !((s.off || {})[x] > 0 || (s.conf || {})[x] > 0 || seen(x, n)));
  };
  // The learned-mark protection (docs/reviews/2026-11-06-engine-coherence-review.md F8, F9): a mark passed under the
  // former model, Bayesian Knowledge Tracing (before 2026-11-02), is dropped (memRecalc, replayedOf); such a record has
  // neither the moving average s.pg nor the domain-score bar s.ds. Explicit, so a record of the domain-score rules,
  // which carries no s.pg, keeps its mark: "learned after BKT" is a record with either.
  const afterBkt = s => !!s && (typeof s.pg === 'number' || typeof s.ds === 'number');

  // The genera the games play, defined once for the app, the admin and tools/fetch_local.py (tools/genera.py reads the
  // two lists below from this file). data.json "gen" is the IMR coral slate; data.json "x" holds the Coral Finder's extra
  // genera (in the book, present at Dauin, not on the IMR list), shown only in Identify > Coral ID Key, except:
  // - BENTHIC (Pierre, 2026-11-02): Millepora, fire coral, not a hard coral nor on the IMR coral list but on the IMR
  //   benthic slate and everywhere at Dauin: a slate genus for the games and the progress (app.js isBenthic);
  // - BONUS (Pierre, 2026-11-01, opt-in since 2026-11-02): genera off the slate common at Dauin and easily taken for a
  //   slate genus (app.js bonusList, isBonus). Played once the player turns them on; never counted in the progress.
  // slateOf(d) = the slate as the games and the progress count it (app.js slateGenera); gameOf(d) = every genus a game
  // can ask (slate + BONUS), the "game genera" of the admin (candidate queue first, Game coverage, caps). The rest of
  // data.json "x" are the Key-only genera. d = data.json as served ({gen, x: {gen}}), or the admin's copy, whose
  // DATA.gen also holds the "x" genera (admin.js): a genus of d.x.gen is never a slate genus by its key in d.gen.
  const BENTHIC = ['Millepora'],
    BONUS = ['Isopora', 'Leptoseris', 'Heliopora', 'Sandalolitha', 'Pleuractis'];
  const xGen = d => (d && d.x && d.x.gen) || {};
  function slateOf(d) {
    const X = xGen(d);
    return [...Object.keys((d && d.gen) || {}).filter(n => !X[n]), ...BENTHIC.filter(n => X[n])];
  }
  function gameOf(d) {
    const X = xGen(d);
    return [...slateOf(d), ...BONUS.filter(n => X[n])];
  }
  // The game photos of a subject's units, for the sheet's photo exposure per player (Pierre, 2026-11-06, Q191; the photo
  // exposure study, docs/reviews/2026-11-06-photo-exposure-study.md §5), as its games can draw them: SUBJECTS pool names
  // the site's files a subject reads and its builder here, which gets them parsed, in that order. slots: data.json with
  // Pierre's curation and the photos per context applied (as app.js build), the game list of every game genus (gameOf:
  // the slate, Millepora, the bonus genera) in each view; entries: the photos of each entry played (fishPhotos, fishGen
  // views.wide). Only which photos are in play matters here, not their order (no picks, no automatic quality). Not
  // applied: the Colony slot's "form not visible" rule (model.js photoSet: 9 colony photos in 4 genera on 2026-11-06,
  // most kept by the one-form exception, which needs the Coral Finder key: app.js imrFormsOf).
  const POOLS = {
    slots: ([raw, cur]) => {
      const d = JSON.parse(JSON.stringify(raw)),
        out = {};
      applyCuration(d, cur);
      applySlots(d, cur);
      if (d.x) {
        const x = {gen: d.x.gen, course: {}, cand: d.cand};
        applyCuration(x, cur);
        applySlots(x, cur);
      }
      gameOf(raw).forEach(n => {
        const g = d.gen[n] || xGen(d)[n];
        // The games' Research Grade rule for the genera off data.json gen (app.js gamePhotoOk: Millepora, the bonus
        // genera; Codex review #680).
        if (g) out[n] = VIEWS.flatMap(([v]) => ((g.sl || {})[v] || {}).game || []).filter(p => !g.x || p.own || !p.gid);
      });
      return out;
    },
    entries: ([f, ph, gm, cur]) => {
      const F = fishGen(f || {}, fishPhotos((ph || {}).photos, (fishGameRead(gm) || {}).photos, cur, f), (ph || {}).sheet);
      return Object.fromEntries(
        Object.values(F.gen)
          .filter(g => !g.wink)
          .map(g => [g.id, g.views.wide])
      );
    }
  };
  // unitPool(S, files): {unit: [[photo file, …] for each colony]}, subject S's game photos grouped by colony (one
  // observation, o; a photo without one stands alone), its units under the ids its answer log holds (renamedId, with the
  // photo's species: a fish entry logs as its family); null when S names no pool or one of its files is missing.
  function unitPool(S, files) {
    const P = S && S.pool,
      make = P && POOLS[P.of];
    if (!make || !Array.isArray(files) || files.length < P.files.length || files.some(x => !x)) return null;
    const by = {};
    Object.entries(make(files) || {}).forEach(([n, L]) =>
      (L || []).forEach(p => {
        if (!p || !p.f) return;
        const O = (by[renamedId(S, n, p.t)] = by[renamedId(S, n, p.t)] || {}),
          c = (O[String(p.o || p.f)] = O[String(p.o || p.f)] || []);
        if (!c.includes(p.f)) c.push(p.f);
      })
    );
    return Object.fromEntries(Object.entries(by).map(([u, O]) => [u, Object.values(O)]));
  }
  // exposureOf(rows, pool): each player's photo exposure in one subject (Pierre, 2026-11-06, Q191; the exposure study
  // §5), from that subject's answer-log rows ([player, time ms, unit shown, answered, right, mode, photos], any order)
  // and its unitPool: {player: [seen, of, hit, asked, units]}.
  // - Seen % = seen / of: the distinct game photos the player has been shown, out of the game photos of the units they
  //   have met (a question on it; units: how many, those with no game photo left out).
  // - Spread % = hit / asked, in time order: of the questions on a unit asked while it still had game colonies the player
  //   had never been shown, the share that showed one (a colony is one observation; a photo out of play now counts as a
  //   colony of its own). A count of colonies seen against questions would hide repeats (A, A, B scores 100%).
  function exposureOf(rows, pool) {
    const P = pool || {},
      col = new Map(),
      by = Object.create(null); // by player, no prototype (trustOf)
    Object.entries(P).forEach(([u, L]) => L.forEach((c, i) => c.forEach(f => col.set(u + '|' + f, i))));
    (rows || [])
      .map((r, i) => [r, i])
      .filter(([r]) => r && r[0] && P[r[2]] && String(r[6] || '').trim())
      .sort((a, b) => (Number(a[0][1]) || 0) - (Number(b[0][1]) || 0) || a[1] - b[1])
      .forEach(([r]) => {
        const u = String(r[2]),
          b = (by[r[0]] = by[r[0]] || {hit: 0, asked: 0, U: {}}),
          s = (b.U[u] = b.U[u] || {ph: new Set(), co: new Set(), left: P[u].length}),
          fs = String(r[6]).split(/\s+/).filter(Boolean),
          cs = new Set(fs.map(f => (col.has(u + '|' + f) ? col.get(u + '|' + f) : 'out|' + f)));
        if (s.left > 0) {
          b.asked++;
          if ([...cs].some(c => !s.co.has(c))) b.hit++;
        }
        cs.forEach(c => {
          if (s.co.has(c)) return;
          s.co.add(c);
          if (typeof c === 'number') s.left--;
        });
        fs.forEach(f => col.has(u + '|' + f) && s.ph.add(f));
      });
    return Object.fromEntries(
      Object.entries(by).map(([w, b]) => {
        const U = Object.entries(b.U);
        return [
          w,
          [
            U.reduce((t, [, s]) => t + s.ph.size, 0),
            U.reduce((t, [u]) => t + P[u].reduce((k, c) => k + c.length, 0), 0),
            b.hit,
            b.asked,
            U.length
          ]
        ];
      })
    );
  }
  // The starred (★) genera: on the slate, not numbered (data.json gen[n].n 0, not surveyed by IMR), there because they
  // look like surveyed genera (rule L5). lectureGroup(d, n): the IMR lecture group a genus is shown in, its own
  // (ig), else, for a ★ genus the lecture doesn't group, the group most of its Coral Finder look-alikes belong to (ties:
  // the first listed); 0 for none (app learn.js shownGroup). starRefs(d, n): the surveyed look-alikes in that group, the
  // genera its card names ("★ look-alike of Turbinaria, Tubastraea", learn.js starNote); [] for any other genus.
  // starWaits(d, n, list, met) (Pierre, 2026-11-03: a ★ genus opens only once the genus its card compares it to has
  // been met; a beginner met Duncanopsammia, "Like Turbinaria, but corallites about 6 mm", before Turbinaria): true while
  // one of n's references is in list (the genera the draw can open) and not met. A reference is always a surveyed genus,
  // which never waits itself, and one not in the list never holds n back: no genus can wait for ever.
  function lectureGroup(d, n) {
    const G = (d && d.gen) || {},
      g = G[n];
    if (!g || xGen(d)[n]) return 0;
    if (g.ig) return g.ig;
    const L = (g.look || []).filter(b => G[b] && G[b].ig),
      c = {};
    L.forEach(b => (c[G[b].ig] = (c[G[b].ig] || 0) + 1));
    return L.reduce((best, b) => (c[G[b].ig] > c[best] ? G[b].ig : best), L.length ? G[L[0]].ig : 0) || 0;
  }
  function starRefs(d, n) {
    const G = (d && d.gen) || {},
      X = xGen(d),
      g = G[n];
    if (!g || g.n || X[n]) return [];
    const k = lectureGroup(d, n);
    return (g.look || []).filter(b => G[b] && G[b].n && !X[b] && G[b].ig === k);
  }
  const starWaits = (d, n, list, met) => starRefs(d, n).some(r => list.includes(r) && !met(r));

  // Photos out of the repo, step 2 (Pierre, 2026-11-03; docs/ROADMAP.md): the site's photos (img/<f>.webp and its -m, -s,
  // -t files) are read from the Cloudflare R2 bucket that tools/r2_sync.sh mirrors img/ to, same paths under this base;
  // the site's own img/ is the fallback (app.js / admin.js photoFail, sw.js photo). The one switch: '' here sends the
  // app, the admin and the Coral ID Key back to img/ (sw.js only caches what it is asked for).
  const PHOTO_BASE = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev/';
  // The same files on the site: every R2 address in s (a URL, a srcset, an inline style) made relative again.
  const photoLocal = s => (PHOTO_BASE && typeof s === 'string' ? s.split(PHOTO_BASE).join('') : s);

  // Photos out of the repo, step 1 of Pierre's rule (2026-11-05; docs/ROADMAP.md): git will keep only the photos with no
  // other backup (IMR lecture photos, our own drawings); the photos with an online original
  // (data.json / cand.json / fish-photos.json src: iNaturalist, Pierre's own iNaturalist photos, FishBase) leave img/
  // later. So once R2 fails, a photo with an online original is read from that original, at a light size, and only the
  // others from the site's img/ (app.js photoFail, quiz.js pump, admin.js).
  // Our files are 240 ('t'), 480 ('s'), 960 ('m') and 1600 px (''); iNaturalist serves small (240 px), medium (500 px),
  // large (1024 px) and the original (up to 2048 px, often several MB, never asked for here).
  const ONLINE_SIZE = {t: 'small', s: 'medium', m: 'large', '': 'large'};
  // An online original (src) at the size closest to one of our files. Other hosts (FishBase: one file per photo, about
  // 500 px wide) as they are.
  const photoOnline = (src, size) => String(src).replace('/original.', `/${ONLINE_SIZE[size || ''] || 'large'}.`);
  // The photo file a site address names, on R2 or on the site: {f, size}, or null for any other address.
  function photoFileOf(u) {
    const m = /(?:^|\/)img\/([^/?#\s]+?)(?:-([tsm]))?\.webp(?:[?#]|$)/.exec(photoLocal(String(u || '')));
    return m ? {f: m[1], size: m[2] || ''} : null;
  }
  // The address that replaces a site photo's address u once R2 has failed: its online original at the same size when it
  // has one (look(f): the photo's record, with src), else the same file on the site. Any other address as it is.
  function photoAway(u, look) {
    const x = photoFileOf(u),
      p = x && look ? look(x.f) : null;
    return !x ? u : p && p.src ? photoOnline(p.src, x.size) : photoLocal(u);
  }
  // Every R2 address in a string (an src, a srcset, an inline style) replaced so.
  const R2_ADDR = PHOTO_BASE ? new RegExp(PHOTO_BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + 'img/[^\\s"\'(),]+', 'g') : null;
  const photoAwayAll = (s, look) => (R2_ADDR && typeof s === 'string' ? s.replace(R2_ADDR, u => photoAway(u, look)) : s);
  // An element whose R2 photo failed (an <img>, or the figure holding a game photo's backdrop): its src, srcset, data-lo
  // (the 480 px fallback) and inline style point at the photo's online original, or at the site's copies for a photo with
  // none (no look: the site for every photo). keepLo: data-lo stays on R2 (under the service worker, which keeps photos
  // offline under their R2 address: the 480 px step then tries the offline copy first). True when it had an R2 address.
  // srcset before src: each change starts a new load, and the browser picks from the srcset.
  function photoFallback(el, look, keepLo) {
    let hit = false;
    if (PHOTO_BASE && el && el.getAttribute)
      for (const a of ['data-lo', 'style', 'srcset', 'src']) {
        const v = a === 'data-lo' && keepLo ? null : el.getAttribute(a);
        if (v && v.includes(PHOTO_BASE)) {
          el.setAttribute(a, photoAwayAll(v, look));
          hit = true;
        }
      }
    return hit;
  }
  // Every photo record (an object with f and src) under the roots given (data.json as built, the fish data), by name and
  // by online original: the fallback's look and the crops' reverse lookup.
  function photoIndex(...roots) {
    const f = new Map(),
      src = new Map(),
      seen = new Set();
    const walk = o => {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      if (Array.isArray(o)) return o.forEach(walk);
      if (typeof o.f === 'string' && typeof o.src === 'string') {
        if (!f.has(o.f)) f.set(o.f, o);
        if (!src.has(o.src)) src.set(o.src, o);
      }
      for (const k in o) if (o[k] && typeof o[k] === 'object') walk(o[k]);
    };
    roots.forEach(walk);
    return {f, src};
  }
  // The crop to draw on an online original shown at address u (photoAway's): the site's files have Pierre's crop baked in
  // (curation.json crop, data.json cr, tools/fetch_approved.py), the original has not. As object-view-box
  // inset(top right bottom left), as the admin's crop preview (admin.js crSrc); a browser without it shows the whole
  // photo. '' for an uncropped photo, a photo still remote (r: 1: shown whole from iNaturalist anyway) or any other address.
  function photoCropOf(u, idx) {
    if (!idx || typeof u !== 'string') return '';
    const p = idx.src.get(u.replace(/#.*$/, '').replace(/\/(?:small|medium|large)\.(\w+)$/, '/original.$1')),
      c = p && !p.r && p.cr,
      pc = v => +(v * 100).toFixed(1);
    return Array.isArray(c) && c.length === 4 ? `inset(${pc(c[1])}% ${pc(1 - c[2])}% ${pc(1 - c[3])}% ${pc(c[0])}%)` : '';
  }

  // A photo that fails on R2 is asked from R2 once more after PHOTO_RETRY ms before any other source (Pierre,
  // 2026-11-03: in a 50-player load test 2 requests in 2000 failed, passing network errors a second try gets). An
  // element whose R2 photo fails for the first time: true, and a probe asks R2 again; if it loads, the element's src
  // and srcset are set again (the file now comes from the browser's cache), else fallback(el) runs (photoFallback).
  // The element keeps its attributes meanwhile. False otherwise: the caller falls back at once.
  const PHOTO_RETRY = 800;
  function photoRetry(el, fallback) {
    if (!PHOTO_BASE || !el || !el.getAttribute || !el.dataset || el.dataset.r2try) return false;
    const src = el.getAttribute('src') || '',
      set = el.getAttribute('srcset') || '',
      u = el.currentSrc || src;
    if (!u.includes(PHOTO_BASE)) return false;
    el.dataset.r2try = '1';
    setTimeout(() => {
      const t = new Image();
      t.onload = () => {
        if (set) el.setAttribute('srcset', set);
        if (src) el.setAttribute('src', src);
      };
      t.onerror = () => fallback(el);
      t.src = u;
    }, PHOTO_RETRY);
    return true;
  }

  // Typed answers (Pierre, 2026-11-03; first the Lab prototype proto/type.js, then the quiz, quiz.js): the player types
  // the genus instead of picking 1 of 4 (recall, not recognition). What Pierre agreed: light spelling tolerance (1 letter
  // on a short name, 2 on a long one), old names accepted ("formerly X" in the genus's own lines), no suggestions while
  // typing, the phone's autocorrect and capitals off, an "I don't know" button (a miss), the right spelling shown after
  // the answer. A word that is no game genus, even with the tolerance, is no answer: the player is asked to check it.
  const TYPE = {
    // Edits allowed: one for a name of up to 6 letters, two beyond (Porites, Pocillopora).
    tol: n => (n <= 6 ? 1 : 2)
  };
  // Optimal string alignment distance (Levenshtein + a swap of two neighbouring letters, the commonest typo).
  // Three rows of the matrix only (the row being filled, the one above and, for the swap, the one above that): the same
  // values as the whole matrix, without allocating it (performance pass, 2026-11-09; tests/typefast.test.js).
  function typeDist(a, b) {
    const m = b.length;
    let p2 = new Array(m + 1).fill(0),
      p1 = Array.from({length: m + 1}, (_, j) => j),
      r = new Array(m + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      r[0] = i;
      for (let j = 1; j <= m; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p1[j] + 1, r[j - 1] + 1, p1[j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        r[j] = v;
      }
      [p2, p1, r] = [p1, r, p2];
    }
    return p1[m];
  }
  const typeNorm = s =>
    String(s || '')
      .trim()
      .split(/\s+/)[0] // "Acropora sp." or a species: the genus is the first word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, '');
  // Every name a player may type: the genera cur (every genus the app knows, the slate's and the extra ones) and the old
  // names of their own "formerly X" lines (gx(name): the genus's record, its crit and imr lines). An old name that is
  // itself a game genus is left out: Duncanopsammia peltata was "formerly Turbinaria peltata", Turbinaria is still valid.
  // Returns [{k: normalised name, g: genus, old: the old name or ''}].
  function typeNamesOf(cur, gx) {
    const out = cur.map(n => ({k: typeNorm(n), g: n, old: ''}));
    cur.forEach(n => {
      const g = gx(n) || {},
        txt = [...(g.crit || []), ...(g.imr || [])].join(' ');
      for (const m of txt.matchAll(/formerly ((?:[A-Z][a-z]+)(?:\s*\/\s*[A-Z][a-z]+)*)/g))
        m[1]
          .split('/')
          .map(x => x.trim())
          .forEach(o => {
            if (!gx(o) && !out.some(x => x.k === typeNorm(o))) out.push({k: typeNorm(o), g: n, old: o});
          });
    });
    return out;
  }
  // What the typed text names among names (typeNamesOf): {g, old, exact} for one genus within the tolerance, {near:
  // [genera]} when two are as close by spelling (the player is asked to check the spelling), {shared: [units], exact}
  // for a name several units share typed exactly, {known} for a name that is no unit's (fishTypeNames known), null when
  // nothing is close. The closest names decide: a name typed exactly is never read as a slip of another.
  // norm: how the text is read (typeNorm, the first word, for genera; typeNormAll, the whole text, for fish entries).
  function typeMatchIn(names, text, norm = typeNorm) {
    const t = norm(text);
    if (t.length < 3) return null;
    // A name whose length differs from the text's by more than its tolerance is skipped unread: the distance is at
    // least the difference in length (each edit changes it by one at most), so the filter below would drop it anyway.
    const all = names
      .filter(x => Math.abs(x.k.length - t.length) <= TYPE.tol(x.k.length))
      .map(x => ({...x, d: typeDist(t, x.k)}))
      .filter(x => x.d <= TYPE.tol(x.k.length))
      .sort((a, b) => a.d - b.d);
    if (!all.length) return null;
    // The closest names decide. A name the game knows that is no unit's (known: fishTypeNames) closest: {known}, no
    // unit; else the units' names among them. Typed exactly, a name several units share is all of them ({shared}: the
    // answer is right for each, quiz.js typeUnit); two units as close by spelling only is {near} ("which one?").
    const top = all.filter(x => x.d === all[0].d),
      best = top.filter(x => !x.known);
    if (!best.length) return {known: 1, old: top[0].old, ...(top[0].w ? {w: 1} : {})};
    const gs = [...new Set(best.map(x => x.g))];
    // One name several units share, typed exactly or with a slip (every closest name the same key): shared, the slip
    // taking the spelling step as any name's; two names as close: near.
    if (gs.length > 1)
      return best[0].d === 0 || best.every(x => x.k === best[0].k)
        ? {
            shared: gs,
            old: best[0].old,
            // the name as written that the text reads as (Gobies), for the spelling step's correction
            name: best[0].nm || best[0].old,
            exact: best[0].d === 0,
            // each unit's own reading of it: its role (vr), how many of its species carry it (n, of), its gentle name (oft)
            by: Object.fromEntries(
              gs.map(g => {
                const x = best.find(y => y.g === g);
                return [
                  g,
                  {
                    ...(x.vr ? {vr: x.vr} : {}),
                    ...(x.n ? {n: x.n, of: x.of} : {}),
                    ...(x.oft ? {oft: x.oft} : {}),
                    ...(x.sc ? {sc: x.sc} : {})
                  }
                ];
              })
            )
          }
        : {near: gs};
    return {
      g: best[0].g,
      old: best[0].old,
      exact: best[0].d === 0,
      ...(best[0].alt ? {alt: 1} : {}),
      ...(best[0].oft ? {oft: best[0].oft} : {}),
      ...(best[0].vr ? {vr: best[0].vr} : {}),
      ...(best[0].n ? {n: best[0].n, of: best[0].of} : {}),
      ...(best[0].sc ? {sc: best[0].sc} : {})
    };
  }
  // What a typed text that is no unit of the rank asked names instead (Pierre, 2026-11-08, Q237: on a genus question a
  // common name or a family name was told "not a genus in the game: check the spelling", which misleads), for a nudge
  // that gives nothing away (the same whether it is the photo's or another one, never a scientific name: quiz.js
  // typeBind). other: the names of the units of the other ranks ([{k, g, old, alt}], typeMatchIn's); x.sci: the
  // scientific names at the rank asked, in the game or not (one of them, or another name of a unit that is one, is no
  // common name: the spelling message as before); x.common: the common names at the rank asked (Anemonefishes); x.rank(g):
  // the rank word of unit g; x.own(g): IMR's name for it (Damselfish; "Surgeonfish & Unicornfish", each part too), its own
  // name as much as its first. Returns x.rank(g)
  // for a unit's own name or a scientific name of it (-idae, -inae: Damselfishes, Damselfish, Pomacentridae; Scarinae
  // for the book's Parrotfishes), 'common' for any
  // other name it goes by (Anemonefish, Clownfish) or a common name at the rank asked, '' otherwise.
  // The names of the lists, read once per norm and name (the same lists come at every refused text): typeElse's own.
  const TYPE_NORMED = new Map();
  const typeNormed = norm => {
    let c = TYPE_NORMED.get(norm);
    if (!c) TYPE_NORMED.set(norm, (c = new Map()));
    if (c.size > 50000) c.clear(); // a bound, far above the subjects' lists
    return s => {
      let k = c.get(s);
      if (k === undefined) c.set(s, (k = norm(s)));
      return k;
    };
  };
  function typeElse(text, other, x = {}, norm = typeNorm) {
    const nm = typeNormed(norm),
      sci = new Set((x.sci || []).map(nm)),
      t = norm(text);
    if (!t || sci.has(t)) return '';
    const m = typeMatchIn(
      (other || []).filter(o => !sci.has(nm(o.old))),
      text,
      norm
    );
    if (m && m.known) return 'common';
    // A name the index lifts from below (fishNameIndex): a scientific name (a species', a genus's) is no common name (the
    // spelling message as before); a shared one is a common name unless it is a family's own (Holocentridae, Goby).
    if (m && (m.vr === 'ss' || m.vr === 'gs')) return '';
    if (m && m.shared)
      return /i[dn]ae$/i.test(m.old || '') || Object.values(m.by || {}).some(r => !r.vr)
        ? (x.rank ? x.rank(m.shared[0]) : '') || ''
        : 'common';
    if (m && !m.near) {
      const imr = String((x.own && x.own(m.g)) || ''),
        own = !m.old || /i[dn]ae$/i.test(m.old) || [imr, ...imr.split(/\s*&\s*|\s+and\s+/)].some(n => n && norm(n) === norm(m.old));
      return own ? (x.rank ? x.rank(m.g) : '') || '' : 'common';
    }
    const c = typeMatchIn(
      (x.common || []).filter(n => !sci.has(nm(n))).map(n => ({k: nm(n), g: 'common', old: ''})),
      text,
      norm
    );
    return c && !c.near ? 'common' : '';
  }
  // The spelling step (a player's idea, Pierre 2026-11-05: "Good idea!"): how a typed answer reads against the unit asked
  // t, m being typeMatchIn's reading of it. 'exact': one of its names, spelled right (capitals, accents and spaces aside);
  // 'close': one of its names within the spelling tolerance: still a right answer (the genus was recognised; grading
  // unchanged), but the player retypes it once (quiz.js typeBind); 'other': another unit's name, close or exact (a wrong
  // answer, as before); 'none': nothing close, or two names as close (no answer: the player is asked to check the spelling).
  // A name several units share ({shared}): as one of t's names when t is one of them, else 'other'; a known name that is
  // no unit's ({known}): 'none'.
  // sp: the species of the photo (its own taxon, quiz.js): a name of part of t only reads as t when it designates them
  // (typeFits; Q333), else 'other'.
  function typeVerdict(m, t, sp) {
    if (!m || m.near || m.known) return 'none';
    if (!typeFits(m, t, sp)) return 'other';
    if (m.shared) return m.exact ? 'exact' : 'close';
    if (m.g !== t) return 'other';
    return m.exact ? 'exact' : 'close';
  }
  // Does the reading m name unit t as the photo shows it (Pierre, 2026-11-09 ~15:45 Manila, Q333: "if someone types
  // Razorfish on a photo of a wrasse that really is a razorfish, then yes, it counts for the family; but you cannot type
  // Razorfish for a wrasse that is not a razorfish"; and "we won't penalise someone who knows the genus's name, or even
  // the species'; but the mistakes must be penalised")? A name of t as a whole, or of part of t (sc: its species) when the
  // photo's species sp are among them; sp unknown ([]): read as before, nothing proves a mistake.
  function typeFits(m, t, sp) {
    if (!m || m.near || m.known) return false;
    const r = m.shared ? (m.shared.includes(t) ? (m.by || {})[t] || {} : null) : m.g === t ? m : null;
    if (!r) return false;
    return !r.sc || !(sp || []).length || r.sc.some(x => sp.includes(x));
  }
  // The letters of name to show in bold once a retyped spelling is still wrong (quiz.js typeSpell): those the typed text
  // got wrong, left out or swapped, along typeDist's alignment; a letter typed in excess marks the letter of name where it
  // went in. Returns indexes into [...name] (spaces and other signs are never marked). norm: as typeMatchIn's.
  function typeDiff(text, name, norm = typeNorm) {
    const a = norm(text),
      pos = [],
      L = [];
    [...String(name || '')].forEach((c, i) => {
      const k = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z]/g, '');
      if (k) (L.push(k[0]), pos.push(i));
    });
    const b = L.join(''),
      n = a.length,
      m = b.length;
    if (!m) return [];
    const d = Array.from({length: n + 1}, (_, i) => [i, ...Array(m).fill(0)]);
    for (let j = 1; j <= m; j++) d[0][j] = j;
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    const mark = new Set();
    let i = n,
      j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) (i--, j--);
      else if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && d[i][j] === d[i - 2][j - 2] + 1)
        (mark.add(j - 1), mark.add(j - 2), (i -= 2), (j -= 2));
      else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) (mark.add(j - 1), i--, j--);
      else if (j > 0 && d[i][j] === d[i][j - 1] + 1) (mark.add(j - 1), j--);
      else (mark.add(Math.min(j, m - 1)), i--);
    }
    return [...mark].map(k => pos[k]).sort((x, y) => x - y);
  }
  // The share of a genus's questions asked as typed ones, from its progress x (0 to 1, the % shown): none below T.from,
  // then a straight line between the points T.at ([progress, share], in order), flat after the last (model.js TYPED).
  function typedShare(x, T) {
    const at = T.at || [];
    if (!(x >= T.from) || !at.length) return 0;
    if (x <= at[0][0]) return at[0][1];
    for (let i = 1; i < at.length; i++)
      if (x <= at[i][0]) {
        const [x0, y0] = at[i - 1],
          [x1, y1] = at[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    return at[at.length - 1][1];
  }

  // What one answer proves, the weights of pgStep (docs/LEARNING.md "Progress (moving average) and mastery"), shared by
  // the app (model.js pgWeight, quiz.js answer) and the full replay below, so both run the same rules.
  // TARGET_P: the chance every question aims for, whatever its format (model.js PICKD.P, the difficulty controller:
  // about 80% right; 2026-11-03, before it a photo TARGET_OFF 1.0 below the ability, 80% with 4 choices only).
  const TARGET_P = 0.8;
  // The success aimed for follows the player's global level (Pierre, 2026-11-03: strong players must find the app
  // challenging quickly, and beginners must not be overwhelmed): AIM, points [global level, success], 85% up to a level
  // of 0.5, 75% from 1.5, a straight line between, flat outside (no cliff); TARGET_P (0.8, the middle) stays the game's
  // reference. model.js aimP (the photos aimed at, the opening's shaky bar) and the miss weight (pgMissW, in the game
  // and in the full replay) take it from here. docs/LEARNING.md "Beginners and experts".
  const AIM = [
    [0.5, 0.85],
    [1.5, 0.75]
  ];
  function aimOf(L) {
    const [[l0, p0], [l1, p1]] = AIM;
    return p0 + (p1 - p0) * Math.min(1, Math.max(0, ((Number(L) || 0) - l0) / (l1 - l0)));
  }
  const sigm = x => 1 / (1 + Math.exp(-x));
  // A right answer, w from 0 to 1: the plausible choices k ((1 − 1/k) / (1 − 1/4): 4 weigh 1, 3 0.89, 2 0.67), in full
  // when a genus it gets confused with is among the choices (look), PROG.LOOK when none is. model.js pgWeight finds look.
  // A typed answer (k infinite, model.js TYPED.k) counts in full: every genus, its look-alikes included, was a possible
  // answer.
  const pgRightW = (k, look) => Math.min(1, Math.max(0, (1 - 1 / k) / (1 - 1 / 4))) * (look || !isFinite(k) ? 1 : PROG.LOOK);
  // What a miss proves (Pierre, 2026-11-02: "a miss on a very hard photo doesn't necessarily mean the genus is badly
  // known"; a miss must not cost more than it proves): the Elo chance the player had to get it right (ability th against
  // the photo's difficulty d, k choices, as abilityStep), over the chance the game aims for (aim: aimOf the player's global
  // level, 85% to 75%, whatever the format: model.js's difficulty controller, aimP; TARGET_P, 0.8, when not given). A photo at the player's level or easier: the miss counts in full; a harder one:
  // less (1 unit harder: 0.78; 2 units: 0.56). No new constant: the Elo and the photo targeting set it. The right answers
  // keep their weight (pgRightW): simulated, a photo factor on them only slowed everyone.
  // R: the recall expected after a break, for a comeback question (model.js comebackOf; 1 otherwise): the chance the
  // player had is then the recall-adjusted one, so a miss the rust explains costs less progress (Pierre, 2026-11-02).
  function pgMissW(th, d, k, R = 1, aim = TARGET_P) {
    const e = (x, r = 1) => 1 / k + (1 - 1 / k) * r * sigm(x);
    return Math.min(1, e(th - d, R) / aim);
  }
  // What a right answer on a photo the player knows proves (Pierre, 2026-11-03): only what memory does not explain. The
  // mirror of pgMissW (a ratio of chances, like it): the chance the player had on the same photos new over the chance
  // they had with their memory of them (fam, model.js famOf), at most 1: the share of such right answers that would have
  // come without the memory. A new photo (fam 0) keeps its full weight: simulated, a photo-difficulty factor on every
  // right answer only slowed everyone, so only the part memory explains is taken off. 4 choices, a photo at the game's
  // target (ability 1 above it): x 0.93 shown never right, x 0.87 right once, x 0.84 right twice or more with the
  // offsets of 2026-11-03. Tried first, the room for surprise left ((1 - chance with memory) / (1 - chance new): x 0.71
  // / 0.41 / 0.23): simulated, it took a third to a half of the genera learned by question 600 and put the progress
  // further below the truth than memory had put it above (docs/LEARNING.md "Photo memory").
  function pgMemW(th, d, fam, k, R = 1) {
    const e = x => 1 / k + (1 - 1 / k) * R * sigm(x);
    return fam >= 0 ? 1 : Math.min(1, e(th - d) / e(th - d - fam));
  }
  // Number of choices as the app scored an answer, from its log row: a typed answer (|t, quiz.js answer) none to guess
  // from (Infinity, model.js TYPED.k: no 1/k floor, as guessOf), |kN in the mode (the plausible choices, logged when
  // fewer than the buttons), a duel 2, else the genera offered (2-3), else 4.
  const kOf = (mode, choices) => {
    if (TYPED_RE.test(String(mode || ''))) return Infinity;
    const kq = /\|k(\d)/.exec(String(mode || ''));
    if (kq) return Number(kq[1]);
    if (/duel|\|d(\||$)/.test(String(mode || ''))) return 2;
    const n = String(choices || '')
      .split(/\s+/)
      .filter(Boolean).length;
    return n >= 2 && n < 4 ? n : 4;
  };

  // Player ability per genus (s.th), on the same scale as photo difficulty (0 = average photo): an Elo step after each
  // answer, as in the sync sheet (Code.gs stats_): P(right) = g + (1 - g) * sigmoid(ability - difficulty), g = 1/choices;
  // ability moves by K * (result - P(right)), K shrinking as answers build up (Pelánek 2016) but never below kmin, so a
  // genus that starts going wrong eases off quickly. Learners change (Pierre, 2026-11-02): as Glicko-2's volatility
  // (Glickman 2012), s.vr follows the recent surprise (result - expected, moving average, rate vr); while answers keep
  // beating (or missing) the expectation, the step grows by up to vg x |s.vr|, within kmax. docs/LEARNING.md. Moved here
  // from model.js (2026-11-03) so the full replay (replayProgress) rebuilds the ability with the app's own step;
  // model.js ability / abilityStep call these on the app's P.
  // abilityOf(P, n): progress saved with the old Easy/Medium/Hard steps (s.lv) starts from the matching ability; a genus
  // never answered starts from the player's global level (playerStart); a genus already answered: its own estimate (s.th,
  // from its last own step) plus the global level's move since then (levelMove), so what the player shows on the other
  // genera moves it too while its own answers are few: the global + concept skill of Pelánek et al. (UMUAI 2017), as a
  // lazy update (2026-11-03, docs/LEARNING.md "Global level and genus").
  const ELO = {th0: 0, kmax: 0.8, kmin: 0.25, n: 15, lo: -1.5, hi: 3, vr: 0.1, vg: 2};
  // p: the level the player's first-launch answer says (CHOICE, startVars(c).p), which a genus never answered starts
  // from (playerStart); 0, the default player's, when they have not answered.
  const abilityOf = (P, n, p = 0) => {
    const s = (P || {})[n] || {};
    if (typeof s.th !== 'number') return s.lv ? ELO.th0 + Math.min(2, s.lv) : playerStart(P, n, p);
    return Math.min(ELO.hi, Math.max(ELO.lo, s.th + levelMove(P, n, s)));
  };
  // The global level's move since the genus's own last step (s.lt: the level then), weighed by the genus's own
  // uncertainty 1 / (1 + answers / ELO.n), the share its own Elo step gives a new answer: a genus with few answers leans
  // on the level, one with many on itself. Both ways (a one-way rise was tried: biased upward, it over-rated a simulated
  // beginner by 0.5-0.7). No new constant. Taken in at the genus's next own step (eloStep). Progress saved before (no
  // s.lt): nothing until that step.
  function levelMove(P, n, s) {
    const G = (P || {})[LEVEL];
    if (n === LEVEL || !s || typeof s.lt !== 'number' || !G || typeof G.th !== 'number') return 0;
    return Math.round(((G.th - s.lt) / (1 + ((s.ok || 0) + (s.ko || 0)) / ELO.n)) * 100) / 100;
  }
  // w (response time, 2026-11-04, rtWeight): the step's size times w; 1 by default. The volatility follows the plain
  // surprise either way.
  // p: the first-launch answer's prior (abilityOf, playerStart), for a genus never answered. S: the shared slope of the
  // answer model (scoreAnswer slopeOf, Q147: 1 until the sheet estimates it).
  function eloStep(P, n, s, good, d, k, w = 1, p = 0, S = 1) {
    const th = abilityOf(P, n, p),
      g = 1 / k,
      e = g + (1 - g) * sigm(S * (th - d)),
      m = (s.ok || 0) + (s.ko || 0);
    s.vr = Math.round(((1 - ELO.vr) * (s.vr || 0) + ELO.vr * ((good ? 1 : 0) - e)) * 1000) / 1000;
    // The global level's step has no floor (ELO.kmin is for a genus, which must ease off quickly when it starts going
    // wrong): the level pools every answer and now moves every genus (levelMove), so it settles as answers build up
    // (Pelánek's uncertainty function), the volatility still letting it catch up with a lasting change. With the floor a
    // run of early misses sank it (one real player to -0.41 against a fit of 0.56) and dragged the genera with it.
    const K = Math.min(ELO.kmax, Math.max(n === LEVEL ? 0 : ELO.kmin, ELO.kmax / (1 + m / ELO.n)) * (1 + ELO.vg * Math.abs(s.vr)));
    // Kept to 4 decimals for the global level (2 for a genus): without the floor its steps fall under 0.005 after a few
    // hundred answers, and rounding them to 2 decimals lost every one (Codex review #415: 1000 right answers left it at 1).
    const r = n === LEVEL ? 1e4 : 100;
    s.th = Math.round(Math.min(ELO.hi, Math.max(ELO.lo, th + w * K * ((good ? 1 : 0) - e))) * r) / r;
    // The level this step was taken against (the level before this answer's own step on it); scoreAnswer moves it on to
    // the level after that step (Q137 part 1), so the genus never takes its own answer twice.
    if (n !== LEVEL && P && P[LEVEL] && typeof P[LEVEL].th === 'number') s.lt = P[LEVEL].th;
    delete s.lv;
    delete s.run;
  }

  // Response time (Pierre, 2026-11-04: "the signal is already very clear on few players; the question is how to
  // integrate it"; rule L1: the seconds taken to answer are evidence about that answer, never a decay; docs/
  // LEARNING.md "Response time"). A right answer given faster than the player's usual is stronger evidence that they know
  // the genus, a slow one weaker: its two ability steps (the genus shown and the global level) are taken times
  // w = clamp(1 - K z, LO, HI), z = log(seconds) minus the median log(seconds) of the player's own earlier timed answers.
  // A miss, an answer without seconds (an app before sheet v23, a clock that never started), a typed answer (slower by
  // design) and the player's first MIN timed answers: w 1. The answer's own time never changes its prediction, only the
  // step after it. K 1.5: the value chosen by leave one player out on the real answers for 8 of 9 players (2 for one;
  // tools/abilityeval.js +T*+G, PR #431); LO, HI and MIN are #431's rule as measured. The seconds are those logged (to the
  // tenth, at most 600: quiz.js qclockRead, Code.gs secs_), so the sheet's replay of the log meets exactly the same ones.
  // The earlier times live in the global level's record (P[LEVEL].rt: how many timed answers took each number of tenths
  // of a second, {"45": 3, ...}; a few hundred keys at most), so the median is exact, the record compact, two devices'
  // records add up (mergeProgress) and the full replay rebuilds it from the log (replayProgress).
  const RTIME = {K: 1.5, LO: 0.5, HI: 1.5, MIN: 10};
  // The tenths of a second of a timed answer, or 0 when it does not count (no seconds, 0, a typed answer: k infinite).
  const rtTenths = (sec, k) => (typeof sec === 'number' && isFinite(sec) && isFinite(k) ? Math.round(Math.min(600, sec) * 10) : 0);
  // The median log(seconds) of the times in rt, null with fewer than RTIME.MIN (the mean of the two middle ones when even).
  // The record's keys, sorted, are kept beside it (RT_KEYS) and kept in step by rtAdd, so a replay of a long log does not
  // sort them again at every right answer (Pierre, 2026-11-04: the admin's replay of every player, 0.2 s of it on a phone).
  // Kept only for a record whose keys are still those it saw (another change to it: sorted again); same result.
  const RT_KEYS = new WeakMap();
  const rtKeys = rt => {
    const c = RT_KEYS.get(rt);
    if (c && c.n === Object.keys(rt).length) return c.ks;
    const ks = Object.keys(rt)
      .map(Number)
      .filter(x => x > 0)
      .sort((a, b) => a - b);
    RT_KEYS.set(rt, {ks, n: Object.keys(rt).length});
    return ks;
  };
  function rtMedian(rt) {
    const ks = rt && typeof rt === 'object' ? rtKeys(rt).filter(x => rt[x] > 0) : [],
      n = ks.reduce((t, x) => t + rt[x], 0);
    if (n < RTIME.MIN) return null;
    const at = i => {
      let c = 0;
      for (const x of ks) if ((c += rt[x]) > i) return Math.log(x / 10);
    };
    return n % 2 ? at((n - 1) / 2) : (at(n / 2 - 1) + at(n / 2)) / 2;
  }
  // The weight of a right answer's ability steps from its seconds, against the player's earlier times (G: P[LEVEL]).
  function rtWeight(G, sec, k, good) {
    const x = rtTenths(sec, k),
      m = good && x > 0 ? rtMedian(G && G.rt) : null;
    return m === null ? 1 : Math.min(RTIME.HI, Math.max(RTIME.LO, 1 - RTIME.K * (Math.log(x / 10) - m)));
  }
  // The answer's seconds added to the player's times (after its own steps: z is against the earlier answers only).
  function rtAdd(G, sec, k) {
    const x = rtTenths(sec, k);
    if (!G || x <= 0) return;
    G.rt = G.rt || {};
    G.rt[x] = (G.rt[x] || 0) + 1;
  }

  // One scorer for an answer (Pierre, 2026-11-06, Q132; docs/reviews/2026-11-06-engine-coherence-review.md F1, F6;
  // docs/LEARNING.md "One scorer"): the live game (quiz.js answer) and the full replay of the answer log
  // (replayProgress: the sheet's, the admin's, this device's own) score an answer through this one function, so a rule
  // is written once and both give the same state. P: the player's progress (genus records and LEVEL), changed in place.
  // q, what the question was:
  // - t the genus shown, c the genus given ('' for none or "I don't know"), ok, k (the plausible choices, Infinity for a
  //   typed answer), chs the choices offered, cv (c is a genus of the game: it then takes a miss too, Pierre's rule L2);
  // - ph the photo files seen while answering, hint a corallites hint revealed after the answer without being opened
  //   (shown, never recognised: the log keeps it in the scoring record, scoreRec h);
  // - the inputs the game had then (null d0: an answer that moves only the counts, as the replay's rows logged before
  //   sheet v5): d0 the photo difficulty (the mean over its photos, + PICKD.SINGLE for a photo alone), fam the photo
  //   memory (memFam), cf the known mix-ups term (model.js confTerm), look (a genus it is confused with among the
  //   choices: a boolean, or a function called after the offers are counted, as the game always checked it), R the recall
  //   of a comeback question (1 otherwise), Rc the recall of the genus given (1 otherwise), df the offset of the question's
  //   format (fmtOff, Q138: 0 without the sheet's fmt), which the ability steps' expectation takes (the question that
  //   much easier) and nothing else does yet: the logged e and the progress weights stay without it;
  // - p the first-launch answer's prior (playerStart), sec the seconds, timed (the time weighs a right answer's steps,
  //   rtWeight), rt (the seconds are recorded, rtAdd; true unless false);
  // - th: the ability the weights use, only for a row logged before the scorer (its logged th; the replay then
  //   recovered d0 from its rounded e). Otherwise the ability as P holds it, which is what the game logged.
  // Returns {th0, dm, e, w, look, rw}: the ability before the answer, the question's difficulty with the memory and the
  // mix-ups, the expected success (logged e), the progress weight, the look-alike test and the time weight.
  // What only the game knows stays in quiz.js answer (the exam, the days answered, the last observations, the cards and
  // the hold); what only the log knows stays in replayProgress (the last misses lx and lm, duels won from the mode).
  // The domain-score bar's inputs of a question (scoreAnswer): q.dom false, a game whose sheet does not replay these rules
  // yet (model.js domOn_, DOM_SHEET; rule D4), keeps the former moving average; a record already under them (s.dp), or one
  // without a former moving average (a genus first answered under them, every genus of a full replay), takes the domain
  // score; a record with s.pg keeps it until a full replay under these rules rebuilds it from the log.
  const domIn = (q, s) => q.dom !== false && (domOn(s) || typeof s.pg !== 'number');
  // The shared slope of the answer model (Q147, pending Pierre): one input, used in the expectation (the ability step,
  // the logged e) and in the bar's posterior; 1 (the Elo's own) until the sheet estimates it and the game passes q.S.
  const slopeOf = q => (q && typeof q.S === 'number' && q.S > 0 ? q.S : 1);
  // mu: the genus offset gd of the genus the bar is for; df: this question's format offset, dt the typed format's (Q138,
  // Q146: in logits, a format easier than the app thought has a positive offset, as PR #638's fmtOff and its q.df, so
  // the question counts as that much easier: a 2-choice right answer, more often right than a 1 in 2 guess explains,
  // proves less, and a 2-choice miss weighs less; 0 until the game passes the sheet's offsets).
  const domF = (q, mu) => ({mu: Number(mu) || 0, o: -(Number(q.df) || 0), t: -(Number(q.dt) || 0), S: slopeOf(q)});
  function scoreAnswer(P, q) {
    const t = q.t,
      ok = !!q.ok,
      k = q.k,
      chs = q.chs || [],
      rec = n => {
        const x = (P[n] = P[n] || {});
        x.ok = x.ok || 0;
        x.ko = x.ko || 0;
        x.h = x.h || '';
        return x;
      },
      s = rec(t);
    // The choices offered beside it and the genus given instead, before the weights (the player's own mix-up rate).
    chs.forEach(x => x !== t && ((s.off = s.off || {})[x] = (s.off[x] || 0) + 1));
    s[ok ? 'ok' : 'ko']++;
    s.streak = ok ? (s.streak || 0) + 1 : 0;
    if (!ok && q.c) (s.conf = s.conf || {})[q.c] = (s.conf[q.c] || 0) + 1;
    const scored = typeof q.d0 === 'number' && isFinite(q.d0),
      d0 = scored ? q.d0 : 0,
      fam = Number(q.fam) || 0,
      cf = Number(q.cf) || 0,
      R = typeof q.R === 'number' ? q.R : 1,
      p = Number(q.p) || 0,
      df = Number(q.df) || 0,
      dm = d0 + fam + cf,
      out = {dm, rw: 1, look: false, th0: null, e: null, w: null};
    if (scored) {
      const th0 = typeof q.th === 'number' ? q.th : abilityOf(P, t, p),
        look = typeof q.look === 'function' ? !!q.look() : !!q.look;
      let w = null;
      // The bar (Q135): the domain score from the player's own answers on the genus, the question's difficulty as the game
      // scores it (photo, memory, mix-ups), its format and recall (domStep); a record not rebuilt under these rules yet,
      // or a game whose sheet does not replay them yet (q.dom false, rule D4), the former moving average as before.
      if (domIn(q, s)) domStep(s, ok, dm, k, R, domF(q, q.mu));
      else {
        // The miss weighs against the aim at the player's level before this answer's own step on it.
        w = ok ? pgRightW(k, look) * pgMemW(th0, d0, fam, k, R) : pgMissW(th0, dm, k, R, aimOf((P[LEVEL] || {}).th));
        s.pg = pgStep(pgOf(s), ok, w);
      }
      delete s.L; // BKT's knowledge, before s.pg
      s.u = (s.u || 0) + 1;
      // The ability: the genus shown against the question's difficulty with the memory and the mix-ups, a right answer's
      // step weighed by its time against the player's earlier ones.
      const rw = q.timed === false ? 1 : rtWeight(P[LEVEL], q.sec, k, ok);
      eloStep(P, t, s, ok, dm - df, k, rw, p, slopeOf(q));
      Object.assign(out, {th0, look, w, rw, e: 1 / k + (1 - 1 / k) * R * sigm(slopeOf(q) * (th0 - dm))});
    }
    // The global level: made at the first answer from the player's history (its counts hold this answer), then one step
    // each, with the same weight; this answer's seconds recorded after its steps (rtWeight compares with earlier ones).
    if (P[LEVEL]) P[LEVEL][ok ? 'ok' : 'ko']++;
    else P[LEVEL] = levelSeed(P);
    // Typed questions, every one and those on this genus (ty): any genus could have been typed, so each is a question where
    // any other genus was a possible answer, the false-alarm rate's denominator (faOf).
    if (!isFinite(k)) {
      // Per rank (rankKey: a fish family's f:, a genus's g:; the corals none): a typed answer can only be a unit of the
      // rank asked (quiz.js typeMatch), so only those are possible answers (Codex review #646).
      const tk = (P[LEVEL].tyk = P[LEVEL].tyk || {}),
        rk = rankKey(t);
      tk[rk] = (tk[rk] || 0) + 1;
      s.ty = (s.ty || 0) + 1;
    }
    if (scored) {
      eloStep(P, LEVEL, P[LEVEL], ok, dm - df, k, out.rw, p, slopeOf(q));
      // One surprise counted once (Pierre, 2026-11-06, Q137 part 1; docs/reviews/2026-11-06-engine-algorithms-review.md
      // §2a; docs/LEARNING.md "One surprise, counted once"): the genus shown takes the level as it stands after this
      // answer's step on it, so its levelMove carries only the level's moves from the other answers. Taken against the
      // level before (eloStep's s.lt), it moved the genus once by its own step and again, at its next question, by the
      // share of the level's step on the same answer (a first right answer: 0.30, then 0.22 more).
      s.lt = P[LEVEL].th;
    }
    if (q.rt !== false) rtAdd(P[LEVEL], q.sec, k);
    // Recent results over every game, newest last (an opening only after a right answer: model.js openRight).
    P[LEVEL].h = ((P[LEVEL].h || '') + (ok ? 1 : 0)).slice(-10);
    // The photos: those seen, shown and (a right answer) recognised; a hint revealed after the answer, shown only.
    const ps = (s.ps = s.ps || {});
    (q.ph || []).forEach(f => {
      const x = (ps[f] = ps[f] || [0, 0]);
      x[0]++;
      if (ok) x[1]++;
    });
    if (q.hint) (ps[q.hint] = ps[q.hint] || [0, 0])[0]++;
    s.h = (s.h + (ok ? 1 : 0)).slice(-10);
    // Pierre's rule L2: a wrong answer counts against the genus given too: its progress by the chance the player had on it
    // (its own ability now, against the photo's difficulty without the memory, which is of the genus shown; its recall
    // Rc after a break), a miss in its recent results, its run reset. Not its ability (docs/LEARNING.md "The genus wrongly
    // given in the Elo"): the Elo moves on the questions about the genus itself.
    if (!ok && q.cv && q.c && q.c !== t) {
      const x = rec(q.c);
      if (scored) {
        const Rc = typeof q.Rc === 'number' ? q.Rc : 1;
        // The bar: no miss in its posterior (a false alarm, counted by its record's offers and mix-ups and taken off its
        // bar by faOf, Q174); a record of the former rules (s.pg): a miss on the photo shown, as before.
        if (!domIn(q, x)) x.pg = pgStep(pgOf(x), false, pgMissW(abilityOf(P, q.c, p), d0, k, Rc, aimOf(P[LEVEL].th)));
        delete x.L;
        x.u = (x.u || 0) + 1;
      }
      x.h = (x.h + '0').slice(-10);
      x.streak = 0;
    }
    return out;
  }
  // The scoring record logged with each answer (quiz.js answer: the answer's sc; the sheet's Answers column Scoring,
  // Code.gs v61, and the replay rows' index LOG_SC, 22): the inputs scoreAnswer had that the replay cannot rebuild from the log
  // (Pierre, 2026-11-06, Q132: "replayed" means what the game scored, whenever and wherever it is replayed).
  // d the photo difficulty d0, f the photo memory fam, c the mix-ups term cf, l the look-alike test (1 or 0), r the
  // recall R, g the recall Rc of the genus given, h the hint revealed after the answer, o the format's offset df (Q138:
  // the sheet's fmt as the game had it, so a replay never takes today's offsets for an answer scored with others); f, c,
  // r, g, h and o left out at their default (0, 0, 1, 1, none, 0); m, n, t, s the domain-score bar's (below). Numbers to 3 decimals: the game rounds them before scoring (scoreIn), so the replay meets
  // exactly what it used. x: the record as an object or its JSON (a sheet cell); null when it has no d (a row logged
  // before the scorer, or broken).
  const SC_MAX = 50;
  const r3 = x => Math.round(x * 1000) / 1000;
  const scNum = x => (typeof x === 'number' && isFinite(x) && Math.abs(x) <= SC_MAX ? r3(x) : null);
  function scoreRec(x) {
    let o = x;
    if (typeof o === 'string') {
      if (!o || o[0] !== '{') return null;
      try {
        o = JSON.parse(o);
      } catch (e) {
        return null;
      }
    }
    if (!isObj(o) || scNum(o.d) === null) return null;
    const out = {d: scNum(o.d)};
    if (scNum(o.f)) out.f = scNum(o.f);
    if (scNum(o.c)) out.c = scNum(o.c);
    if (o.l === 1 || o.l === true) out.l = 1;
    if (scNum(o.r) !== null && scNum(o.r) !== 1 && o.r >= 0 && o.r <= 1) out.r = scNum(o.r);
    if (scNum(o.g) !== null && scNum(o.g) !== 1 && o.g >= 0 && o.g <= 1) out.g = scNum(o.g);
    if (typeof o.h === 'string' && /^[A-Za-z0-9_.-]{1,120}$/.test(o.h)) out.h = o.h;
    // The domain-score bar's inputs (rules version 9): m the genus offset of the genus shown and n that of the genus
    // given (kept even at 0: absent means a row logged before, whose replay takes the sheet's gd), o (above) the format's offset
    // df, which the bar takes too, and t the typed format's dt (left out at 0), s the shared slope (left out at 1).
    if (scNum(o.m) !== null) out.m = scNum(o.m);
    if (scNum(o.n) !== null) out.n = scNum(o.n);
    if (scNum(o.o)) out.o = scNum(o.o);
    if (scNum(o.t)) out.t = scNum(o.t);
    if (scNum(o.s) !== null && o.s > 0 && scNum(o.s) !== 1) out.s = scNum(o.s);
    return out;
  }
  // The game's inputs rounded as they are logged (scoreRec), before it scores with them.
  const scoreIn = q => ({
    ...q,
    d0: r3(q.d0),
    fam: r3(q.fam || 0),
    cf: r3(q.cf || 0),
    R: r3(q.R === undefined ? 1 : q.R),
    Rc: r3(q.Rc === undefined ? 1 : q.Rc),
    df: r3(q.df || 0),
    ...(typeof q.mu === 'number' ? {mu: r3(q.mu)} : {}),
    ...(typeof q.muc === 'number' ? {muc: r3(q.muc)} : {}),
    ...(typeof q.dt === 'number' ? {dt: r3(q.dt)} : {}),
    ...(typeof q.S === 'number' ? {S: r3(q.S)} : {})
  });
  // The record of a question scored by scoreAnswer (q after scoreIn, res its result): what quiz.js answer logs as sc.
  const scoreLog = (q, res) =>
    scoreRec({
      d: q.d0,
      f: q.fam,
      c: q.cf,
      l: res.look ? 1 : 0,
      r: q.R,
      g: q.Rc,
      h: q.hint || undefined,
      m: q.mu,
      n: q.muc,
      o: q.df,
      t: q.dt,
      s: q.S
    });

  // Rules versions (Pierre, 2026-11-03: progress is recalculated from the whole answer log, by the sheet, automatically,
  // now and whenever the progress engine changes). Every change to a rule that moves the progress (what an answer
  // weighs, the moving average, the ability step, the photo memory, what the replay keeps from the device...) appends
  // an entry here: v (the next number), at (the date), why (one line for the docs), msg (null, or the announcement card
  // {t: title, p: paragraph, in plain words} that every device which skipped this version shows once, rule D6;
  // with only: 'changed', shown only when the adoption moved the player's progress % by min points or more, {from} and
  // {to} in p being the two %). Every version takes RV_CARD (Pierre, 2026-11-03, a standing rule: rule D5);
  // Pierre is asked only for a different text. The sync script, which embeds this file
  // (tools/sync_core.py), replays a player's log again when their stored replay is older than RV, and the app adopts a
  // replay newer than the one it applied (sync.js replayAdopt). docs/LEARNING.md "Full replay". The leaderboards follow
  // on their own (rule D8): the script's 15-minute trigger replays every listed player behind the new version (Code.gs
  // boardWarm_), and each board ranks them by what their app will adopt (board_, replayAdopted); nothing to add here.
  // The standard recalculation card (Pierre, 2026-11-03: "only to the players whose progress the replay moves a lot; if
  // it moves everyone a lot, everyone gets it"): shown to a player whose progress % the adoption moved by 5 points or
  // more, either way (progress.js rvNoticeAdd), with the two %.
  const RV_CARD = {
    kind: 'update', // the card's kind (app.js cardShow, CARD_KINDS)
    t: 'Your progress was recalculated with the improved model',
    p: 'Your progress is now computed again from all your answers, with the rules the app uses today. It went from {from}% to {to}%. Every answer you gave is kept.',
    only: 'changed',
    min: 5
  };
  // The apology of rules version 9 (Pierre, 2026-11-06: the recalculation approved with the domain-score bar; the card
  // and its PS from PR #611, Q109: sincere, say it does not mean they know less, turn it into encouragement, our mistake
  // not theirs, the new bar means more; Pierre 2026-11-06: 2-3 short lines, never "bars" but "progress", encouraging: it
  // is because they learned so fast that the old count could not keep up; no mechanics on the card; heading "Sorry"; his
  // text of 14:43). Shown to every player whose % the
  // adoption took down by a point or more (down: a rise gets the standard card when it is of 5 points or more). ps: the key of a line the sheet serves (Code.gs notes_, the Notes tab;
  // sync.js NOTES_KEY), shown small under the text when it is set: Pierre's PS, which may name a player. A name is never
  // written in the repo (rule D2).
  const RV_SORRY = {
    kind: 'apology',
    kick: 'Sorry',
    t: 'Sorry: we recalculated your progress',
    p: "You've been learning so fast that our old way of counting couldn't keep up. It wasn't you, it was us: your new progress is lower, but you haven't lost anything you know.",
    // The two %, on a line of their own that never wraps (Pierre, 2026-11-06: "Your progress: 38% → 24%").
    pct: 'Your progress: {from}% → {to}%',
    ps: 'card.rv8.ps',
    only: 'changed',
    min: 1,
    // Only to the players whose % went down (Pierre, 2026-11-06: the card says the new progress is lower); a rise of
    // RV_CARD.min points or more gets the standard card instead (rvMsgs with skip, progress.js rvNoticeAdd).
    down: true
  };
  const RVS = [
    {
      v: 1,
      at: '2026-11-03',
      why: 'Full replay of each player by the sheet: moving average weighed by what each answer proves, photo memory, former-model learned marks dropped, no Elo step on the genus wrongly given, a genus ability moving with the global level and the miss weighed against the aim at that level (#415), a learned mark kept unless a miss logged after its exam takes it away as the game does',
      // Pierre, 2026-11-03: the standard card, only for the players whose progress % moves by 5 points or more (several
      // lose points: the former model's learned marks are dropped).
      msg: RV_CARD
    },
    {
      v: 2,
      at: '2026-11-04',
      why: 'The opening pace and known mix-ups (#425): a question whose choices hold a genus the player mixes up with the one shown more than everyone does (3 or more plausible choices) counts as that much harder, for the ability, the global level and the weight of a miss',
      msg: RV_CARD
    },
    {
      v: 3,
      at: '2026-11-04',
      why: 'Hierarchical photo Elo (sheet v31): the genus offset enters the expectation the photo memory offsets are fitted against, so the memory offsets the replay uses change',
      // Codex P1 on #422: mem (?stats=1, Code.gs stats_) feeds replayProgress, so a log replayed under v2 gives other
      // bars than under v3. Pierre's standing rule (2026-11-03): every rules version gets the standard recalculation
      // card, only for the players whose progress % moves by 5 points or more.
      msg: RV_CARD
    },
    {
      v: 4,
      at: '2026-11-04',
      why: "Answer time weighs right answers (Pierre, 2026-11-04): a right answer's ability steps, on the genus and the global level, times clamp(1 - 1.5 z, 0.5, 1.5), z its log seconds against the player's own median over their earlier timed answers (RTIME, rtWeight)",
      msg: RV_CARD
    },
    {
      v: 5,
      at: '2026-11-04',
      why: 'The first-launch question (#428): a genus never answered starts from the global level shrunk towards the level the player said (new 0, IMR course 0.5, know well 1.25), the answer in force at each answer (reefid-sync-coral-start, its history h, or the band below taken with Coral basics on the fallback card, ease)',
      msg: RV_CARD
    },
    {
      v: 6,
      at: '2026-11-06',
      why: 'One scorer (Q132, sheet v61): the game and the replay score an answer through scoreAnswer; an answer logged with its scoring record (photo difficulty, memory, mix-ups, look-alike test, recalls, a corallites hint revealed after it, shown but not recognised) replays exactly as the game scored it, an older row by its logged e as before',
      msg: RV_CARD
    },
    {
      v: 7,
      at: '2026-11-06',
      why: "One surprise counted once (Q137 part 1): the genus shown takes the global level as it stands after this answer's step on it, so levelMove carries only the level's moves from the other answers (a first right answer moved a genus 0.30, then 0.22 more through the level)",
      msg: RV_CARD
    },
    {
      v: 8,
      at: '2026-11-06',
      why: "Per-format offsets (Pierre, 2026-11-06, Q138; sheet v77): the ability steps of the genus and the global level expect each question with its format's offset from the real answers (fmtOffsetsOf: 2 plausible choices among 4, Again, Duel tab, typed...), so a 2-choice question right more often than 1 in 2 explains no longer over-credits the ability; an answer's scoring record logs the offset it was scored with (o), a row logged before the scorer takes today's",
      msg: RV_CARD
    },
    {
      v: 9,
      at: '2026-11-06',
      why: "The domain-score bar (Q127-Q129, Q135, sheet v87): a genus's bar is the share of all its possible photos the player would name alone and typed, the posterior expectation on a grid of abilities from a fixed population prior and the player's own answers on that genus only (format-aware, the photo's difficulty, memory and mix-ups as scored, a drift per answer so old answers fade), at most 95% until the mastery exam, which opens at 85% once the genus has been asked beside each of its look-alikes; a genus named by mistake counts as a false alarm, its bar less its false-alarm rate (Pr = H - FA, Snodgrass & Corwin 1988), not as a miss on its photos; it replaces the moving average s.pg, and the learned marks passed since 2026-11-02 are kept unless a miss logged after the exam takes them away",
      // Pierre, 2026-11-06 (Q172): the apology card (PR #611's, Q109) for every player whose % the replay moved; its PS
      // from the sheet's Notes tab, key card.rv8.ps (named when this was rules version 8, before PR #638 took that
      // number; the key is kept so the row Pierre adds stays as written: never in the repo; progress.js rvNotice).
      msg: RV_SORRY
    },
    {
      v: 10,
      at: '2026-11-09',
      why: "The log is the only reference (rule D9; Pierre, 2026-11-09, Q322, Q330): the replay's record of a genus and its answer count win over the saved copy, also when the copy holds more answers there (they were counted twice: a save whose reply was lost, then another device's save, PR #824), and a genus the log has no answer on loses the answers the copy counts on it.",
      // No card (Pierre, 2026-11-09 ~14:45 Manila, Q330): the progress is updated everywhere without telling the player.
      msg: null
    }
  ];
  const RV = RVS[RVS.length - 1].v;
  // The rules versions of the fish progress replayed by the sheet (SUBJECTS fish replayed rvs; ROADMAP "Fish progress
  // replayed from the answer log", Pierre 2026-11-08, Q298, Q310): its own list, numbered from 1 as RVS is, so a fish
  // replay never makes a coral device take its replay again, nor the other way round. Each entry as in RVS; its card is
  // told under the subject's id (progress.js rvNoticeAdd: 'fish:1').
  const FISH_RVS = [
    {
      v: 1,
      at: '2026-11-08',
      why: "The fish progress replayed from the answer log (Pierre, 2026-11-08: recalculate every player's progress from their answers; Q298, Q310): a fish player's progress is replayed by the sheet from their fish answers (logged since sheet v60) with the corals' engine, each unit's bar before its first replay kept as a floor (until fish rules version 2)",
      msg: RV_CARD
    },
    {
      v: 2,
      at: '2026-11-09',
      why: "The log is the only reference (rule D9; Pierre, 2026-11-09, Q322, Q330): the replay's record of a unit and its answer count win over the saved copy, also when the copy holds more answers there (counted twice, or played before the fish log began: in no log, so dropped), and no floor any more: a unit's bar may go down.",
      // No card (Pierre, 2026-11-09 ~14:45 Manila, Q330).
      msg: null
    }
  ];
  // A subject's rules versions (the corals' RVS, another subject's SUBJECTS replayed rvs) and the last of them (0: none).
  const rvsOf = id => {
    const S = subjectOf(id);
    return S.replay ? RVS : S.replayed && typeof S.replayed.rvs === 'function' ? S.replayed.rvs() : [];
  };
  const rvOf = id => (L => (L.length ? L[L.length - 1].v : 0))(rvsOf(id));
  // The sync script version from which the sheet replays (Code.gs replay_, v28). The app never gets ahead of the sheet
  // script (rule D4, Pierre 2026-11-03): it adopts a replay (sync.js replayAdopt) and the admin shows replayed
  // values (admin.js progOf) only when the script's replies say v >= RV_SHEET; otherwise both do what they did before.
  const RV_SHEET = 28;
  // The sync script version that replays the answer time (Code.gs v32 reads the Seconds column into the replay rows):
  // the app weighs a right answer's steps by its time (rtWeight) only once the script's replies say v >= RT_SHEET
  // (sync.js sheetV), so a replay never undoes what the app did live (rule D4); before it, exactly as before.
  const RT_SHEET = 32;
  // The sync script version that replays the first-launch answer's prior (Code.gs v36 replay_ reads the player's
  // reefid-sync-coral-start: its answers and the silent ease): the app shrinks a new genus's start towards that prior
  // (model.js startP) only once the script's replies say v >= START_SHEET, so a replay never undoes it (rule D4,
  // Codex review #428); before it, the default player's prior 0, exactly as before.
  const START_SHEET = 36;
  // The sync script version that replays the domain-score bar (rules version 9, core.js DOM): a genus first answered in
  // the app takes it only once the script's replies say v >= DOM_SHEET (model.js domRules), and the app's own replay of
  // its queued answers on top of the sheet's follows the same version (sync.js replayAdopt); before, the moving average
  // s.pg exactly as before (rule D4).
  const DOM_SHEET = 87;
  // The sheet script that ranks a subject with a global score by it (Code.gs v101 board_, core.js treeScore): the app shows
  // the score, and sends its tree, only from a reply with v >= SCORE_SHEET (model.js headScore, sync.js boardUnits; rule
  // D4: the leaderboard and My progress on one scale; Codex review #730), before that the families' mean as before.
  const SCORE_SHEET = 101;
  // The sync script version that files each answer under its subject (Code.gs v60: Answers Subject, Rank, Taxon shown,
  // Taxon answered, Species shown; its replay, hold and photo ratings keep the replayed subject's rows). An older script
  // would file a fish answer as a coral one (no subject column): the app sends the answers of a subject the sheet does not
  // replay only once the script's replies say v >= LOG_SHEET (sync.js logOk), and keeps them queued until then (rule D4).
  const LOG_SHEET = 60;
  // The sync script version that replays the other subjects' progress under this app's rules (SUBJECTS replayed: fish,
  // its own rules versions FISH_RVS; Code.gs replays_): the app asks for that replay and adopts it (sync.js replayAdoptS)
  // only once the script's replies say v >= REPLAYS_SHEET
  // (rule D4); before,
  // that subject does exactly what it did (no rules version, the plain merge).
  const REPLAYS_SHEET = 112;
  // The sync script version whose readers leave a surprise card's answer out (Code.gs v98: replayed_, answers_, the
  // Activity tab): an older one would count it as a fish answer in the admin's lists and the Activity tab, so the app
  // sends it only once the script's replies say v >= WINK_SHEET, queued until then (rule D4).
  const WINK_SHEET = 98;
  const logOk = (a, v) => (winkEntry(a) ? Number(v) >= WINK_SHEET : ansSubject(a) === replaySubject() || Number(v) >= LOG_SHEET);
  // The messages a device that last applied version `from` shows once it applied version `to`: one per version that
  // has one, oldest first; the same message (RV_CARD) once, at the last version that has it, so a device that skips
  // several versions sees one recalculation card with its progress before and after the whole jump. An apology (kind
  // 'apology', RV_SORRY) in the jump says what the standard card says, and more: the standard card is then left out.
  // skip: leave the apologies out (a player whose % did not go down: progress.js rvNoticeAdd), the standard card back.
  // sid: the subject whose rules versions they are (rvsOf: the corals' RVS by default, fish FISH_RVS).
  const rvMsgs = (from, to, skip = false, sid) => {
    // No card for a recalculation any more (Pierre, 2026-11-09 ~14:45 Manila, Q330): a jump to a version without a card
    // shows none, not even the card of a version it skips.
    const V = (sid ? rvsOf(sid) : RVS).find(x => x.v === to);
    if (V && !V.msg) return [];
    const L = (sid ? rvsOf(sid) : RVS)
      .filter(x => x.v > (from || 0) && x.v <= to && x.msg && !(skip && x.msg.kind === 'apology'))
      .filter((x, i, A) => !A.slice(i + 1).some(y => y.msg === x.msg));
    return L.some(x => x.msg.kind === 'apology') ? L.filter(x => x.msg !== RV_CARD) : L;
  };

  // Full replay (Pierre, 2026-11-03: "why recalculate on the phones when the phone doesn't have the full log? Recalculate
  // from all the results"): every player's progress rebuilt from the sheet's answer log, in time order, with today's rules
  // (the weights above, pgStep, the photo memory, the ability step), as if every answer had been played under them. The
  // reference recalculation, done by the sync sheet itself (Code.gs replay_, in the reply to a sign-in, load or save
  // when the player's stored replay is older than RV or covers fewer rows than the log has) and adopted by the app
  // (sync.js replayAdopt). The device's own recalculations (memRecalc from s.ps, pgOf from the last 10 results s.h) only
  // approximate it from what a device keeps: they remain the fallback for a device that never reaches the sheet.
  // docs/LEARNING.md "Full replay".
  // rows: the answer log (sheet readAnswers rows, Code.gs rowOf_, or the app's own log through logRow: [id, time ms,
  // genus shown, answered, right 0|1, mode, photos, expected e, ability th, new photos, choices, (11: unused here),
  // seconds to answer (null without), (13, 14: unused here), the scoring record (15: scoreRec, null before it)]; the
  // seconds weigh a right answer's ability steps, rtWeight). Every answer goes through scoreAnswer, the game's own
  // scorer. o: gen (data.json
  // genera, Millepora and the bonus genera included: look-alikes `look`, family `fam`), mem (photo memory offsets,
  // ?stats=1 mem; the prior without), conf (the pooled pairs, ?stats=1 conf, as the app's PCONF), since ({id: time ms}:
  // only the answers after a progress reset), memory (false: the rule before the photo memory, tools/memreplay.js), time
  // (false: no response time, the rule before rules version 4),
  // fmt (the per-format offsets, ?stats=1 fmt, sheet v77, rules version 8: for a row without a scoring record; a row
  // with one replays the offset it logged, o; none: 0),
  // start ({id: player}: a replay to go on from, as returned here, e.g. the sheet's, with this device's answers not in
  // the sheet yet on top; copied, never changed), onAnswer(row, {d, fam, cf, k, w, look}).
  // dom (false: the former moving average, rules before version 9), gd (the genus offsets for rows logged without them).
  // Returns {id: {P: {genus: {dp, ds, ok, ko, h, ps, off, conf, u, th, lt, vr, streak, at, du, lx, lm}, '~level': {ok, ko, th, vr, at, rt}},
  // n, used, rep}}: per genus the domain-score bar's log posterior dp and bar ds (domStep; pg, the former moving average,
  // for a record of the start copy that holds one, or with dom false), right / wrong answers, the last 10
  // results, the photos [shown, right], the choices offered beside it and the genera given instead (the app's s.off,
  // s.conf), u = answers that moved the bar, the ability th and its volatility vr (eloStep, as quiz.js answer steps them: on
  // the genus shown only, never on the genus wrongly given),
  // the run of right answers (streak), the last answer (at), a look-alike duel won (du), the last miss on it, shown or
  // given (lx, a time: it ends an exam in course), the last one that took the progress below the learned mark's keep
  // rule (lm, a time: keepsMark); the global level LEVEL as the
  // app keeps it (seeded at the first answer by levelSeed, then one step per answer); per player the rows read (n),
  // replayed (used: with e and th) and on a photo already shown (rep).
  // A row logged with its scoring record (2026-11-06, Q132: index LOG_SC) is scored with what the game had then: its photo
  // difficulty d0, photo memory, mix-ups term, look-alike test, recall and hint, so the replay gives exactly the state the
  // game had, whenever and wherever it runs (the device, the sheet, the admin), whatever pooled stats each holds; only
  // the rules (this file) can change it. A row logged before it: as follows.
  // Each question's difficulty d (photo difficulty, + 0.5 for a photo shown alone) is recovered from what the app logged
  // then: e = 1/k + (1 - 1/k) sig(th - d), th the player's ability on the genus at that moment. A typed answer (|t,
  // 2026-11-03; kOf) has no guess rate (k infinite: e = sig(th - d)), counts in full when right (pgRightW) and was
  // logged with no choices, as quiz.js answer scores it. Since the photo memory
  // (MEM_LOGGED) the logged e includes the memory of the photos (fam), taken out again here with the replay's own fam;
  // since the known mix-ups (CF_LOGGED) it includes the app's mix-ups term too (cf, model.js confTerm), taken out the
  // same way, and the replay adds its own to every answer, older ones included (today's rule).
  // Approximations of such a row, explicit: the ability th and the photos are those the app logged (the game would have drawn others
  // under other rules; the weights use the logged th, the replayed th is the app's step over the recovered
  // difficulties); a comeback question's recall is taken as 1 (its e logged with it reads as a harder photo); the
  // look-alike test and the mix-ups term are the app's (declared look-alikes or confusions over CONF.TRAP, pooled and the
  // player's own; confGap) with a prior from the look-alikes and the family only (the app also gives CONF.FORM to genera
  // sharing an IMR growth form, which the sheet does not know: on such a pair the pooled score starts from 0.03 instead
  // of 0.08, so the replayed term is larger while the pair's pooled offers are few, the same once they are many);
  // a miss on the genus wrongly given weighs the chance the player had on it with its ability as replayed (the app's own
  // at that moment is not logged; the same when the replay goes on from the app's record, sync.js); every photo of a
  // right answer counts as recognised (the app does not count a corallites photo answered
  // without opening it, which the log leaves out anyway). Answers logged without e and th (before sheet v5) count in
  // ok/ko/h only, and move no ability. The mastery exam is not replayed: replayedOf takes it from the saved copy.
  const MEM_LOGGED = Date.UTC(2026, 10, 3, 4, 46); // PR #387 merged: the app's logged e includes the photo memory
  // From the known mix-ups (PR #425, live 2026-11-03 15:35 UTC: 23:35 Asia/Taipei, the instant of tools/abilityeval.js
  // CF_FROM, which reads the sheet's wall clock; #426): the app's logged e includes its mix-ups term (model.js confTerm),
  // taken out again here with the replay's own. An app not yet updated logs a few answers without it after that time.
  const CF_LOGGED = Date.UTC(2026, 10, 3, 15, 35);
  // The first-launch record's history (reefid-sync-coral-start h, Codex review #428): an append-only list of timestamped
  // events, merged between devices as a union (startUnion), from which the current answer, the silent ease and the prior
  // at any time are derived (startNorm, startPriorAt). A choice event: [c, answers then, time, via] (via tour, card,
  // fallback, inferred). An ease event (Coral basics on the "lower" card, model.js startEase): [the band below, answers
  // then, time, 'ease', the answer it eased, the time of that answer's choice event]; it applies from its time until the
  // next choice event, and only while that very choice event is the one in force (Codex review #428: matched by its code
  // alone, an ease taken on know@100 also eased an independent know@200 from another device). A record of before the
  // history (no h): its answer as one choice event at its t, and its ease field (if any) as one ease event. An ease event
  // without the choice's time (written before 2026-11-04): bound, within its own record, to the latest choice of that
  // answer at or before the ease.
  // Every event is kept: the replay of the whole log needs the prior in force at each answer, however old (Codex review
  // #428: a cap at 10 dropped the earliest answers' prior). Nor is the list compacted: an event that repeats the answer
  // in force can matter again once another device's events are merged in between (know@100, know@300 merged with
  // imr@200: "know" from 300 on), so dropping it would not commute with the union. START_CAP is only a safety bound, far
  // above any real history (a player gives one answer, rarely changes it, and a fallback card comes once per answer and
  // direction): at about 40 bytes an event, 200 events stay under 8 KB in the synced record.
  const START_CAP = 200;
  const stTime = x => (typeof x[2] === 'number' ? x[2] : -Infinity);
  const stEase = x => x[3] === 'ease';
  const stKey = x => (stEase(x) ? `e|${x[2]}|${x[0]}|${x[4]}|${x[5]}` : `c|${x[2]}|${x[0]}`);
  function startEvents(rec) {
    if (!isObj(rec)) return [];
    const h = Array.isArray(rec.h) && rec.h.length ? rec.h : startOpt(rec.c) ? [[rec.c, rec.at || 0, rec.t, rec.via || '']] : [],
      e = rec.ease,
      ev = (
        Array.isArray(e) && startOpt(e[0]) && !h.some(x => Array.isArray(x) && stEase(x))
          ? [...h, [e[0], e[1] || 0, e[2], 'ease', rec.c]]
          : h
      ).filter(x => Array.isArray(x) && startOpt(x[0]));
    // An ease without its choice's time: the latest choice of that answer at or before it, in this record.
    return ev.map(x => {
      if (!stEase(x) || typeof x[5] === 'number') return x;
      const ch = ev
        .filter(y => !stEase(y) && y[0] === x[4] && stTime(y) <= stTime(x))
        .sort((a, b) => stTime(a) - stTime(b))
        .pop();
      return [x[0], x[1], x[2], 'ease', x[4], ch && typeof ch[2] === 'number' ? ch[2] : null];
    });
  }
  // The events of several records, once each (by kind, time and value), oldest first (a choice before an ease at the
  // same time, then by value: the same order whichever record comes first), START_CAP at most (the latest).
  function startEventsOf(...recs) {
    // One per key; between two copies of an event that differ only in their details (answers then, via), the same one
    // whichever record comes first.
    const by = new Map();
    recs.flatMap(startEvents).forEach(x => {
      const k = stKey(x),
        y = by.get(k);
      if (!y || JSON.stringify(x) < JSON.stringify(y)) by.set(k, x);
    });
    return [...by.values()]
      .sort(
        (a, b) =>
          stTime(a) - stTime(b) || (stEase(a) ? 1 : 0) - (stEase(b) ? 1 : 0) || (stKey(a) < stKey(b) ? -1 : stKey(a) > stKey(b) ? 1 : 0)
      )
      .slice(-START_CAP);
  }
  // The choice event and the ease in force at time t (Infinity: now) over a sorted event list.
  function startStateAt(ev, t) {
    let ch = null,
      ez = null;
    ev.forEach(x => {
      if (stTime(x) > t) return;
      if (!stEase(x)) ((ch = x), (ez = null));
      else if (ch && x[4] === ch[0] && x[5] === ch[2]) ez = x; // the very choice event it eased
    });
    return {ch, ez};
  }
  // A short fingerprint of a record's history (the sheet's replay cache, Code.gs replay_: a replay made with another
  // history is not reused; Codex review #428): '' with no record.
  function startFp(rec) {
    const ev = startEventsOf(rec);
    if (!ev.length) return '';
    let h = 5381;
    const s = JSON.stringify(ev.map(x => (stEase(x) ? [x[0], x[2], 'ease', x[4], x[5]] : [x[0], x[2]])));
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // The first-launch answer's prior at time t (2026-11-03, CHOICE): the eased band's while an ease is in force, else the
  // answer's, 0 before the first answer (the player then played as the default player). The replay steps the ability
  // with it (o.starts).
  function startPriorAt(rec, t) {
    const {ch, ez} = startStateAt(startEventsOf(rec), t);
    return ez ? startVars(ez[0]).p : ch ? startVars(ch[0]).p : 0;
  }
  // The epoch of a record's fallback window: its last reset (wt), else the answer's time.
  const startWt = x => (x && typeof x.wt === 'number' ? x.wt : (x && x.t) || 0);
  // A record with its fields derived from its history: c, at, t, via the last choice; ease the ease in force on it.
  function startNorm(rec) {
    if (!isObj(rec)) return null;
    const h = startEventsOf(rec),
      {ch, ez} = startStateAt(h, Infinity);
    if (!ch) return null;
    const out = {...rec, h, c: ch[0], at: ch[1], t: ch[2], via: ch[3]};
    if (ez) out.ease = [ez[0], ez[1], ez[2]];
    else delete out.ease;
    return out;
  }
  // Two devices' records merged (model.js startMerge, sync.js signIn): the union of their histories; the fallback window
  // (w, hd, v, wt) of the record that holds the current answer, on the same answer the later window epoch (a progress
  // reset) then the longer window; the fallback cards shown on either.
  function startUnion(a, b) {
    const A = startNorm(a),
      B = startNorm(b);
    if (!A || !B) return A || B;
    const h = startEventsOf(A, B),
      {ch} = startStateAt(h, Infinity),
      own = x => x.c === ch[0] && x.t === ch[2],
      n = x => (Array.isArray(x.w) ? x.w.length : 0),
      W =
        own(A) && own(B)
          ? startWt(A) !== startWt(B)
            ? startWt(A) > startWt(B)
              ? A
              : B
            : n(A) >= n(B)
              ? A
              : B
          : own(B) && !own(A)
            ? B
            : A;
    return startNorm({...W, h, fb: {...(B.fb || {}), ...(A.fb || {})}});
  }
  // Pierre's change of a player's first-launch answer for one subject (the admin's Players, Change; Code.gs users_
  // userStart, sheet v99; Pierre 2026-11-08, Q228: a fallback card had moved a player to the wrong answer). data: the
  // player's saved copy (keysIn names, _acct and the rest kept); s: the subject id; c: the answer (CHOICE.opts); now: ms.
  // The change is a choice event appended to the history, via 'admin', never an event taken away: a device's copy would
  // bring it back at its next merge (startUnion), whereas the appended event, the latest, wins it. Its time is now, or
  // just after the latest event when a device's clock ran ahead, so it is always the answer in force; its answers count
  // the player's in that subject (its LEVEL record). Every earlier event stays, so the replay keeps each answer's prior
  // (startPriorAt). The fallback window starts again from this event, as an answer given in the app does (model.js
  // startSet; Pierre, 2026-11-08, Q228: "if the player then turns out much better than I thought, the level card must
  // still be offered"): its answers (w), the opening hold seen in it (hd), its epoch (wt) and a verdict waiting for its
  // card (v) were about the former answer and go, so no card comes from the answers given under it; the checkpoints
  // count the answers after the change. The cards shown (fb) stay: once per answer and direction, as in the app. The
  // copy under the key's name from before the rename (keyLegacy, which an app
  // of before it still reads) gets the same record when the copy holds it. null when nothing is to change: an unknown
  // subject or answer, a subject without the question, or no answer saved for it (the player is asked on their device).
  // Returns {data, start: the new record}.
  function startAdminSet(data, s, c, now) {
    if (!isObj(data) || !startOpt(c) || !SUBJECTS.some(S => S.id === s && S.start)) return null;
    const k = startKey(s),
      old = keyLegacy(k),
      parse = x => {
        try {
          return JSON.parse(x || 'null');
        } catch (e) {
          return null;
        }
      },
      rec = startNorm(parse(typeof data[k] === 'string' ? data[k] : old && data[old]));
    if (!rec) return null;
    const P = parse(data[subjKey(s, 'progress')]),
      L = isObj(P) && isObj(P[LEVEL]) ? P[LEVEL] : {},
      num = x => (typeof x === 'number' && isFinite(x) && x > 0 ? x : 0),
      a = num(L.ok) + num(L.ko),
      ev = startEvents(rec),
      t = Math.max(Math.round(Number(now) || 0), ...ev.map(x => stTime(x) + 1).filter(isFinite)),
      {w, hd, v, wt, ...rest} = rec,
      start = startNorm({...rest, w: [], h: startEventsOf({h: [...ev, [c, a, t, 'admin']]})}),
      json = JSON.stringify(start),
      out = {...data, [k]: json};
    if (old && old in data) out[old] = json;
    return {data: out, start};
  }
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      starts = o.starts || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      fmt = o.fmt || {},
      memory = o.memory !== false,
      time = o.time !== false,
      // dom: false, the rules before version 9 (the former moving average; a device whose sheet does not replay version 9
      // yet, sync.js replayAdopt, rule D4); gd: the genus offsets ({genus: [offset, weighed answers]}, ?stats=1 gd) for
      // the rows logged without them.
      dom = o.dom !== false,
      gdv = g => {
        const x = (o.gd || {})[g];
        return Math.round((Array.isArray(x) ? Number(x[0]) || 0 : Number(x) || 0) * 1000) / 1000;
      },
      // Keyed by player id: no prototype, so a player named "constructor" or "__proto__" is a player like any other
      // (a plain object read Object's own constructor for one, and replayed nothing). own: an id's entry of a map given.
      out = Object.assign(Object.create(null), o.start ? JSON.parse(JSON.stringify(o.start)) : {}),
      own = (m, k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : undefined);
    const prior = (t, n) => {
      const a = gen[t] || {},
        b = gen[n] || {};
      return (a.look || []).includes(n) || (b.look || []).includes(t) ? CONF.LOOK : a.fam && a.fam === b.fam ? CONF.FAM : CONF.BASE;
    };
    const pooledOf = (t, n) => confScore(conf[t < n ? t + '|' + n : n + '|' + t], prior(t, n));
    // Known mix-ups (model.js confTerm, #425): the most, over the choices, of the player's own score of the pair above
    // the pooled one (confGap), on the record before this answer, on a question with 3 or more plausible choices; it adds
    // to the question's difficulty for the ability, the level and a miss's weight, as quiz.js answer adds it to dm.
    const confTermOf = (P, t, chs, k) =>
      k >= 3 ? Math.max(0, ...chs.filter(n => n !== t && gen[n]).map(n => confGap(pairConf(P, t, n), pooledOf(t, n)))) : 0;
    // model.js pgWeight: a genus among the choices that the player gets confused with (pooled, then their own record).
    const lookOf = (P, t, n) => {
      if (n === t || !gen[n]) return false;
      const pooled = pooledOf(t, n);
      return pooled >= CONF.TRAP || confScore(pairConf(P, t, n), pooled) >= CONF.TRAP;
    };
    const split = x =>
      String(x || '')
        .split(/\s+/)
        .filter(Boolean);
    rows
      .filter(r => r && r[0] && r[2])
      .sort((a, b) => a[1] - b[1])
      .forEach(r => {
        const id = r[0];
        if (own(since, id) && !(r[1] > own(since, id))) return;
        const pl = (out[id] = out[id] || {P: {}, n: 0, used: 0, rep: 0}),
          rec = g => {
            // No former moving average on a new record: the domain-score bar from its first answer (scoreAnswer domIn);
            // a record of the copy it goes on from (start) keeps what it has.
            const x = (pl.P[g] = pl.P[g] || {ok: 0, ko: 0, h: '', ps: {}, u: 0});
            if (!x.ps) x.ps = {};
            x.h = x.h || '';
            x.u = x.u || 0;
            return x;
          },
          t = String(r[2]),
          c = String(r[3] || ''),
          ok = !!r[4],
          mode = String(r[5] || ''),
          fs = split(r[6]),
          e = r[7],
          th = r[8],
          chs = split(r[10]),
          k = kOf(mode, r[10]),
          sec = typeof r[12] === 'number' ? r[12] : null,
          sc = scoreRec(r[LOG_SC]),
          s = rec(t),
          hs = fs.map(f => s.ps[f]),
          wrong = !ok && c && c !== t && gen[c];
        if (wrong) rec(c);
        pl.n++;
        if (hs.some(h => h && h[0])) pl.rep++;
        const pr = startPriorAt(own(starts, id), r[1]), // the first-launch answer's prior at this answer (abilityOf)
          replayable = fs.length && k > 1 && (sc || (typeof e === 'number' && typeof th === 'number'));
        const q = {t, c, ok, k, chs, ph: fs, cv: !!wrong, p: pr, sec, timed: time, rt: time && !!replayable, d0: null, dom};
        // The domain-score bar's genus offsets: as the game logged them (sc m, n), else the replay's gd (o.gd).
        q.mu = sc && typeof sc.m === 'number' ? sc.m : gdv(t);
        q.muc = sc && typeof sc.n === 'number' ? sc.n : gdv(c);
        if (sc) Object.assign(q, {df: sc.o || 0, dt: sc.t || 0, S: sc.s || 1});
        if (sc) {
          // Logged by the scorer (Q132): what the game scored with, as it was then; the memory as logged unless the
          // replay leaves it out (memory: false, a what-if).
          Object.assign(q, {d0: sc.d, fam: memory ? sc.f || 0 : 0, cf: sc.c || 0, look: !!sc.l, R: sc.r === undefined ? 1 : sc.r});
          // The format's offset as logged (o, Q138): 0 for an answer scored before the offsets or without them.
          Object.assign(q, {Rc: sc.g === undefined ? 1 : sc.g, hint: sc.h, df: sc.o || 0});
        } else if (replayable) {
          // A row logged before the scorer: its difficulty recovered from the logged e (rounded to 0.01), its memory and
          // mix-ups term rebuilt with today's pooled stats, its look-alike test after the offers, as the game ran it.
          const fam = memFam(hs, mem),
            cf = confTermOf(pl.P, t, chs, k), // on the record before this answer (before the offers)
            qq = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(qq / (1 - qq)), // the difficulty in the logged expectation
            // d: the photo's difficulty alone (quiz.js d0), without the memory and the mix-ups term the app logged in e.
            d = dl - (r[1] >= MEM_LOGGED ? fam : 0) - (r[1] >= CF_LOGGED ? cf : 0);
          // The format's offset from today's pooled fit (fmt, sheet v77, rules version 8), as its memory and mix-ups.
          const df = fmtOff(fmt, fmtOf(mode, chs.length));
          Object.assign(q, {d0: d, fam: memory ? fam : 0, cf, th, df, look: () => chs.some(x => lookOf(pl.P, t, x))});
        }
        const res = scoreAnswer(pl.P, q);
        if (replayable) {
          pl.used++;
          if (o.onAnswer) o.onAnswer(r, {d: q.d0, fam: q.fam, cf: q.cf, k, w: res.w, look: res.look});
        }
        pl.P[LEVEL].at = r[1];
        s.at = r[1];
        // The learned mark (not replayed: replayedOf takes it from the saved copy) is lost, in the game, at a miss that
        // leaves the progress below the keep rule (quiz.js answer, mxKept), on the genus shown as on the genus given: lm,
        // the time of the last such miss, takes away a mark passed before it; lx, the last miss, ends an exam in course.
        if (!ok) s.lx = r[1];
        if (!ok && !keepsMark(s, pl.P, t)) s.lm = r[1];
        if (ok && (/^quiz-duel/.test(mode) || /\|d(\||$)/.test(mode))) s.du = 1;
        if (wrong) {
          const x = pl.P[c];
          x.lx = r[1];
          if (!keepsMark(x, pl.P, c)) x.lm = r[1];
        }
      });
    return out;
  }
  // An answer of the app's own log (quiz.js answer: {id, t, g, a, ok, m, ph, e, th, nw, ch, rt}) as a replay row for
  // player id: this device's answers the sheet has not confirmed yet, replayed on top of the sheet's replay (sync.js).
  // The seconds rt at index 12 and the scoring record sc at LOG_SC (22), as in the sheet's readAnswers rows (11, their
  // anonymous flag, and 13 to 21, enlarged to species shown, unused here: null).
  const logRow = (a, id) => [
    id,
    Date.parse(a.t) || 0,
    String(a.g || ''),
    String(a.a || ''),
    a.ok ? 1 : 0,
    String(a.m || ''),
    String(a.ph || ''),
    typeof a.e === 'number' ? a.e : null,
    typeof a.th === 'number' ? a.th : null,
    typeof a.nw === 'number' ? a.nw : null,
    String(a.ch || ''),
    null,
    typeof a.rt === 'number' ? a.rt : null,
    ...new Array(LOG_SC - 13).fill(null),
    scoreRec(a.sc)
  ];
  // A player's progress as the app holds it after the replay (rep: replayProgress's player; saved: the player's
  // reefid-sync-coral-progress, the device's copy in the app, the sheet's copy in the admin). What comes from where:
  // - from the replay, for every genus the log has replayable answers on: pg, ok, ko, h, off, conf, th, lt, vr, streak,
  //   at (the later of the two), du (either), the photos seen ps per photo the larger [shown, right] of the two (the
  //   device also counts as shown a corallites hint revealed after the answer, which the log leaves out: a replay must
  //   not make it new again for the exam, model.js examSet), pm 1 (the record is under the photo memory rule: memRecalc must never
  //   correct it again), and rv when given (the rules version it was replayed with: mergeProgress then keeps it over
  //   an older copy of the same answers);
  // - from the saved copy, what the log cannot give: the mastery exam passed (mx) or in course (ex), dropped when passed
  //   under the former model (a record without s.pg, before 2026-11-02: that genus takes the exam again; memRecalc, commit
  //   of 2026-11-03), and the mark dropped too when the log has a miss after the exam that the game takes it away at
  //   (r.lm later than s.mx, the time it was passed; 1 before 2026-11-02, so any such miss): misses logged but never in
  //   the saved copy (a save refused, Codex review #399: 10 misses, pg 0.19, still learned) count as the game counts
  //   them, and a recalculation alone (no such miss after the exam) keeps the mark; likewise the exam in course ends at
  //   any miss on the genus, shown or given, later than its start (r.lx after s.ex.ts; an exam saved before it had its
  //   start time: after the genus's last answer, s.at), as quiz.js answer ends it (Codex review #399: a miss logged over
  //   a saved exam of 4 questions passed kept its 4); the days answered right (dd, dl: the device's calendar days, for the comeback after a break); the
  //   last observations shown (ro: the log keeps photo files, not observations); right with the corallites in view
  //   (cor: the log does not say which view a photo was shown in);
  // - the log is the only reference (rule D9; Pierre, 2026-11-09, Q322, Q330): a genus the log has answers on takes the
  //   replay's record and counts also when the saved copy holds more answers there (they were counted twice: a reply
  //   lost then another device's save, PR #824), its counts and recent results only when none of them is replayable; a
  //   genus the log has no answer on keeps the saved record only if it holds no answer either (its answers are in no
  //   log: dropped);
  // - LEVEL: the replayed ability (th, vr), the larger answer count of the two (answersSoFar keys the exam's gaps, the
  //   cards met and the prompts, so it never goes back; the log's count there waits for checkpoints that do not hang on
  //   it: a follow-up, branch claude/level-count-from-log) with the answer times (rt) of the same side, the later at,
  //   rv when given; no ability when the log has no answer at all (rule D9; Codex review of #840).
  // The opening hold is not here: the sheet already replays it from the same log (Code.gs hold_, reply's hold).
  // The replay does not decide the exam: a genus learned keeps it here even if its replayed bar is lower, unless a miss
  // after the exam takes it away, as the game does (mxKeeps, lm).
  const LEVEL_LOG = ['th', 'vr', 'lt', 'tyk', 'rt'];
  const REPLAYED = ['pg', 'dp', 'ds', 'ok', 'ko', 'ty', 'h', 'ps', 'off', 'conf', 'th', 'lt', 'vr', 'streak'];
  function replayedOf(rep, saved, rv) {
    const S = isObj(saved) ? saved : {},
      R = (rep && rep.P) || {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x)),
      kept = s => {
        const o = dup(s);
        if (!afterBkt(o)) {
          delete o.mx;
          delete o.ex;
        }
        return o;
      };
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      const s = isObj(S[g]) ? S[g] : null,
        r = isObj(R[g]) ? R[g] : null;
      if (g === LEVEL) {
        // One rule for the level (rule D9; Codex reviews of #840): every field that feeds progress (the ability th, vr,
        // lt, the typed opportunities tyk, the answer times rt) is the log's, absent when the log has none; only the
        // plain answer count (ok, ko: the clock the checkpoints hang on) keeps the larger of the two until
        // claude/level-count-from-log.
        const o = s ? dup(s) : {};
        LEVEL_LOG.forEach(f => (r && r[f] !== undefined ? (o[f] = dup(r[f])) : delete o[f]));
        if (r) {
          if (!s || n(r) >= n(s)) [o.ok, o.ko] = [r.ok || 0, r.ko || 0];
          if (r.at) o.at = Math.max(r.at, Number(o.at) || 0);
          if (rv) o.rv = rv;
        }
        out[g] = o;
        return;
      }
      if (!r || !r.u) {
        // No answer of the log on it: the saved record only when it counts no answer either (rule D9).
        if (!r) return void (s && !n(s) && (out[g] = kept(s)));
        // No answer that moved the bar: the counts and recent results only (a former moving average if it has one).
        out[g] = {ok: r.ok || 0, ko: r.ko || 0, h: r.h || '', ...(rv ? {rv} : {})};
        if (domOn(r)) [out[g].dp, out[g].ds] = [dup(r.dp), r.ds];
        else if (typeof r.pg === 'number') out[g].pg = r.pg;
        // Its offers and mix-ups stay: the other genera's false-alarm rates read them (faOf; Codex review #646).
        ['conf', 'off'].forEach(f => isObj(r[f]) && Object.keys(r[f]).length && (out[g][f] = dup(r[f])));
        if (r.ty) out[g].ty = r.ty;
        return;
      }
      const o = {};
      REPLAYED.forEach(f => r[f] !== undefined && (o[f] = dup(r[f])));
      if (s && isObj(s.ps) && Object.keys(s.ps).length) {
        o.ps = o.ps || {};
        Object.keys(s.ps).forEach(f => {
          const x = o.ps[f] || [0, 0],
            y = Array.isArray(s.ps[f]) ? s.ps[f] : [];
          o.ps[f] = [0, 1].map(i => Math.max(Number(x[i]) || 0, Number(y[i]) || 0));
        });
      }
      const at = Math.max(Number(r.at) || 0, Number(s && s.at) || 0);
      if (at) o.at = at;
      if (r.du || (s && s.du)) o.du = 1;
      o.pm = 1;
      if (rv) o.rv = rv;
      if (s) {
        ['dd', 'dl', 'ro', 'cor'].forEach(f => s[f] !== undefined && (o[f] = dup(s[f])));
        if (afterBkt(s) && s.mx) {
          if (!(r.lm > s.mx)) o.mx = s.mx;
        } else if (afterBkt(s) && s.ex && !(r.lx > (s.ex.ts || s.at || 0))) o.ex = dup(s.ex);
      }
      out[g] = o;
    });
    return out;
  }
  // The merge baseline once a replay is adopted (sync.js replayAdopt, mergeProgress's B): the history every device of the
  // account shares, never mixed with this device's own answers not in the sheet yet, which stay the difference P - B and
  // so go on top in the next three-way merge (Codex review #399, three cases: two devices adopting the same log counted it
  // twice, an older app's answers were dropped, an unsent answer was taken into the baseline and lost). rec: the sheet's
  // replay (replay.rec), M: the record adopted (replayedOf), rv: its rules version, B: the baseline before (the shared
  // saved copy). Per genus:
  // - adopted from the replay (M[g].rv is rv): the replayed record as the app holds it without this device's copy
  //   (replayedOf of rec alone), its photos shown per photo the larger of the replay's and B's (exposure the log leaves
  //   out, a corallites hint revealed after the answer, that a device already synced: shared too);
  // - kept from this device's copy (a unit the log has no answer on and the copy counts none on either): B's record;
  // - the global level: the replay's, with B's answer count and answer times (rt) when its count is larger (replayedOf
  //   keeps the larger count); when the sheet sent no level (no answer in the log), B's level, never the adopted one,
  //   which holds this device's unsent answers (Codex review of #840).
  function replayBase(rec, M, rv, B) {
    const R = replayedOf({P: rec}, {}, rv),
      B0 = isObj(B) ? B : {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x));
    Object.keys(M || {}).forEach(g => {
      const b = isObj(B0[g]) ? B0[g] : null,
        r = R[g];
      if (g === LEVEL) {
        if (!r) {
          // No level in the log: the shared clock (ok, ko) only, none of the log's fields (LEVEL_LOG), as replayedOf.
          if (!b) return;
          const o = dup(b);
          LEVEL_LOG.forEach(f => delete o[f]);
          return void (out[g] = o);
        }
        const o = dup(r);
        if (b && n(b) > n(r)) [o.ok, o.ko] = [b.ok || 0, b.ko || 0]; // the clock only (replayedOf, LEVEL_LOG)
        out[g] = o;
      } else if (r && M[g] && M[g].rv === rv) {
        const o = dup(r);
        Object.keys((b && b.ps) || {}).forEach(f => {
          const x = (o.ps = o.ps || {})[f] || [0, 0],
            y = b.ps[f];
          if (Array.isArray(y)) o.ps[f] = [Math.max(x[0], Number(y[0]) || 0), Math.max(x[1], Number(y[1]) || 0)];
        });
        out[g] = o;
      } else if (!r && b && n(b) > 0) {
        // A unit the log has no answer on whose shared copy counts answers: discarded by the adoption (rule D9), so no
        // baseline either; this device's unsent answers on it stay the difference and go on top (Codex review of #840).
      } else if (b) out[g] = dup(b);
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;
  // The progress a device holds once it adopts a replay (sync.js replayAdoptS), and so the one the leaderboard ranks a
  // player by once their saved copy is behind the rules (Code.gs board_; Pierre, 2026-11-09, rule D8). R: the replay (with
  // the device's own answers on top, if any), P: the device's copy, rv: the replay's rules version: replayedOf of R over
  // P. No floor (Pierre, 2026-11-09, Q330: the log is the only reference, a bar may go down; until then a subject could be
  // replayed with the saved bars as a floor, and fish was).
  function replayAdopted(R, P, rv) {
    return replayedOf({P: R}, isObj(P) ? P : {}, rv);
  }

  // Pages opened in a visit (sheet v30 event 'pages'; Pierre, 2026-11-03: "most players only play the quiz and never
  // open the genus sheets": does a beginner use them more, does a sheet reader progress faster?). First-party, one
  // summary a visit, no free text: which pages were open, how many times and for how long (seconds visible, the page in
  // view), and the genus sheets opened: how many times, for how long, how the first one was reached (from: the quiz
  // feedback, a Learn page, My progress, anything else) and whether the genus had already been asked to the player
  // then (asked). The app keeps the tally (sync.js pagesRoute) with these pure functions; the sheet cleans what arrives
  // with pagesClean (Code.gs events_, through its embedded copy of this file). SHEET: the sync script version that
  // stores them (rule D4: nothing is queued before the sheet says v >= SHEET).
  const PAGES = {
    SHEET: 30,
    ROUTES: 30, // at most this many page names a summary, the most opened first
    GEN: 30, // at most this many genus sheets a summary
    MAXN: 1000, // openings of one page counted at most
    MAXS: 86400, // seconds of one page counted at most
    RE: /^[a-zA-Z0-9~][a-zA-Z0-9~|_.-]{0,39}$/, // a page name (a hash without its parameters)
    GENUS: /^[A-Z][a-z]{2,30}$/,
    FROM: ['quiz', 'learn', 'progress', 'other']
  };
  // routes: begin
  // The app's addresses (URL refonte, Pierre 2026-11-05, Q53-Q56; docs/reviews/2026-11-05-url-scheme-study.md 3.2):
  // #<section>/<page>[/<thing>…][?filters], in the words on screen: #learn/genus/Acropora, #practice/duels/A/B,
  // #identify/key?form=B&box=B1, #tools/anatomy, #leaderboard/achievements; Home is the clean URL. A subject other than
  // the corals puts its prefix first (SUBJECTS hash: #fish/practice/quiz), on the pages of the sections that follow the
  // subject (ROUTE_SUBJ); its units' words come from SUBJECTS one / many (#fish/learn/families).
  // Inside, the app names a page by its page key, the vocabulary its code, SUBJECTS pages, MODES and the answer modes
  // share ('genera', 'g-Acropora', 'cmp|A|B', 'cmp-A|B', 'quiz-duel|A|B', 'idkey|form=B;box=B1', 'lab-anatomy|arr|x').
  // routeOut and routeIn translate one into the other, here only: every link is built by them (app.js hr), every
  // address read by them (app.js hashNow). No old address is read (rule W3): routeIn gives an unknown one no key.
  const ROUTE_SUBJ = ['learn', 'practice', 'identify', 'progress'];
  // A section's own page, for its bare address (#learn) and an unknown address inside it (the header tabs' targets).
  const ROUTE_FIRST = {
    learn: 'genera',
    practice: 'quiz',
    identify: 'idkey',
    progress: 'progress',
    leaderboard: 'board',
    tools: 'lab',
    about: 'about'
  };
  const ROUTE_FIXED = {
    quiz: 'practice/quiz',
    'quiz-custom': 'practice/custom',
    'quiz-duel': 'practice/duels',
    pairs: 'practice/memory',
    cmp: 'learn/look-alikes',
    basics: 'learn/basics',
    progress: 'progress',
    board: 'leaderboard',
    ach: 'leaderboard/achievements',
    about: 'about',
    // Delete my account (sheet v58 selfDelete, #603): a page reached from About, its |done state after the deletion.
    'delete-account': 'about/delete-account',
    lab: 'tools',
    idkey: 'identify/key',
    fishkey: 'identify/key'
  };
  const routeEnc = x => encodeURIComponent(x).replace(/%2C/g, ',');
  const routeSubj0 = () => SUBJECTS.find(s => !s.hash) || SUBJECTS[0];
  // The address of page key k for subject S (default: the corals), without '#'. null for no known page.
  function routeOut(k, S) {
    S = S || routeSubj0();
    const s = String(k == null ? '' : k),
      [b, ...a] = s.split('|');
    let p, q;
    if (!s || s === 'home') return '';
    if (b === 'genera' && !a.length) p = 'learn/' + S.many;
    else if (b.startsWith('g-') && b.length > 2 && !a.length) {
      // A subject with sheets at several ranks (SUBJECTS sheets: fish families, genera, species) names the rank of the
      // sheet from its id's prefix (g-f:Damselfishes: #fish/learn/family/Damselfishes); any other sheet is its unit's.
      const id = b.slice(2),
        w = Object.keys(S.sheets || {}).find(x => id.startsWith(S.sheets[x]) && id.length > S.sheets[x].length);
      p = 'learn/' + (w || S.one) + '/' + routeEnc(w ? id.slice(S.sheets[w].length) : id);
    } else if (b.startsWith('cmp-') && b.length > 4 && a.length === 1) p = 'learn/compare/' + routeEnc(b.slice(4)) + '/' + routeEnc(a[0]);
    else if (b.startsWith('lab-') && b.length > 4) p = 'tools/' + [b.slice(4), ...a].map(routeEnc).join('/');
    else if ((b === 'idkey' || b === 'fishkey') && a.length <= 1) {
      p = ROUTE_FIXED[b];
      // The Key's clues (form=B;box=B1;not=wall.plo) as filters, kept as they are (the Key encodes its free text).
      if (a[0]) q = a[0].split(';').filter(Boolean).join('&');
    } else if (b === 'basics') {
      // Coral basics: its step, glossary term or view as segments, its editing switch (|edit) as a filter.
      const e = a[a.length - 1] === 'edit';
      p = ['learn/basics', ...(e ? a.slice(0, -1) : a).map(routeEnc)].join('/');
      if (e) q = 'edit=1';
    } else if (
      ROUTE_FIXED[b] &&
      (!a.length ||
        (['cmp', 'quiz-duel'].includes(b) && a.length === 2) ||
        (b === 'quiz-custom' && a.length === 1 && a[0] === 'play') ||
        (b === 'delete-account' && a.length === 1 && a[0] === 'done'))
    )
      p = [ROUTE_FIXED[b], ...a.map(routeEnc)].join('/');
    else return null;
    const pre = ROUTE_SUBJ.includes(p.split('/')[0]) ? S.hash || '' : '';
    return pre + p + (q ? '?' + q : '');
  }
  // The page an address shows: {S: its subject, bare: no subject prefix, key: its page key (null: unknown), sec: its
  // section (for an unknown address inside a known section), fall: the page key to show instead of an unknown one}.
  // Split before decoding: the filters off the raw hash first, then each segment decoded alone.
  // tool(S): the subject's Identify tool (app.js UNITS identify), 'idkey' when not given.
  function routeIn(h, tool) {
    const raw = String(h == null ? '' : h).replace(/^#/, ''),
      qi = raw.indexOf('?'),
      dec = x => {
        try {
          return decodeURIComponent(x);
        } catch (e) {
          return x;
        }
      };
    let seg = (qi < 0 ? raw : raw.slice(0, qi)).split('/').map(dec);
    const query = qi < 0 ? '' : raw.slice(qi + 1),
      Sx = SUBJECTS.find(s => s.hash && seg[0] + '/' === s.hash),
      S = Sx || routeSubj0();
    if (Sx) seg = seg.slice(1);
    while (seg.length && seg[seg.length - 1] === '') seg.pop();
    const out = (key, sec) => ({S, bare: !Sx, key, sec: sec || seg[0] || 'home', fall: key != null ? key : ROUTE_FIRST[seg[0]] || ''});
    const [s0, s1, ...r] = seg,
      n = seg.length,
      kv = query.split('&').filter(Boolean);
    if (!n) return out(query ? null : '', 'home');
    if (seg.some(x => x === '' || x.includes('|'))) return out(null);
    const key = (() => {
      if (s0 === 'learn') {
        if (s1 === 'basics') {
          const e = kv.some(x => /^edit(=|$)/.test(x));
          return ['basics', ...r, ...(e ? ['edit'] : [])].join('|');
        }
        if (s1 === S.many && n === 2) return 'genera';
        if (S.sheets && S.sheets[s1] && n === 3) return 'g-' + S.sheets[s1] + r[0];
        if (s1 === S.one && n === 3) return 'g-' + r[0];
        if (s1 === 'look-alikes' && (n === 2 || n === 4)) return ['cmp', ...r].join('|');
        if (s1 === 'compare' && n === 4) return 'cmp-' + r[0] + '|' + r[1];
      } else if (s0 === 'practice') {
        if (s1 === 'quiz' && n === 2) return 'quiz';
        if (s1 === 'custom' && (n === 2 || (n === 3 && r[0] === 'play'))) return ['quiz-custom', ...r].join('|');
        if (s1 === 'duels' && (n === 2 || n === 4)) return ['quiz-duel', ...r].join('|');
        if (s1 === 'memory' && n === 2) return 'pairs';
      } else if (s0 === 'identify') {
        if (s1 === 'key' && n === 2) return (tool ? tool(S) : 'idkey') + (kv.length ? '|' + kv.join(';') : '');
      } else if (s0 === 'progress' && n === 1) return 'progress';
      else if (s0 === 'leaderboard' && n === 1) return 'board';
      else if (s0 === 'leaderboard' && s1 === 'achievements' && n === 2) return 'ach';
      else if (s0 === 'about' && n === 1) return 'about';
      else if (s0 === 'about' && s1 === 'delete-account' && (n === 2 || (n === 3 && r[0] === 'done')))
        return ['delete-account', ...r].join('|');
      else if (s0 === 'tools') return n === 1 ? 'lab' : ['lab-' + s1, ...r].join('|');
      return null;
    })();
    // A section that follows the subject is the only place a subject prefix means something.
    if (key != null && Sx && !ROUTE_SUBJ.includes(s0)) return out(null);
    return out(key);
  }
  // The page name of a page key, logged in the visit summary (sheet v30 'pages') and used for the photo size per page:
  // its address's section and page, its things and filters dropped ('learn.genus', 'learn.look-alikes',
  // 'practice.duels', 'identify.key', 'tools.anatomy', 'leaderboard.achievements', 'progress', 'home'), in the corals'
  // words whatever the subject (a page's identity). pre: the prefix of the subject on screen (SUBJECTS pv): a page drawn
  // with Fish on screen is 'fish.<page>' ('fish.practice.quiz', 'fish.home'). '.' and '-' are in PAGES.RE: the sheet
  // (pagesClean) keeps these names as they come.
  function pageName(h, pre = '') {
    const s = String(h == null ? '' : h).replace(/^#/, ''),
      p = routeOut(s, Object.assign({}, routeSubj0(), {hash: ''})),
      seg = p == null ? null : p.split('?')[0].split('/');
    let n = !s || s === 'home' ? 'home' : !seg ? 'other' : seg.slice(0, 2).join('.');
    if (!PAGES.RE.test(n)) n = 'other';
    if (!pre) return n;
    return PAGES.RE.test(pre + n) ? pre + n : pre + 'other';
  }
  // routes: end
  // routes-migration: begin
  // The data written under the old addresses and page names (before the URL refonte of 2026-11-05, Q53-Q56), moved once
  // (rule W3: no old address is read anywhere else; the app moves its own stored data at start-up, migrateRoutes; the
  // sheet moves its rows once, Code.gs ONCE_ in its own PR). The old addresses were today's page keys, so routeOut is
  // their translation. Delete this with its callers once every device and the sheet have moved.
  // An old address (the raw hash, without '#') to its new one; a new or unknown one is left as it is.
  const routeRename = h => {
    const s = String(h == null ? '' : h).replace(/^#/, ''),
      n = s === 'home' ? 'home' : routeOut(s === 'quiz-board' ? 'progress' : s === 'credits' ? 'about' : s);
    return n == null ? s : n;
  };
  // An old page name (genus, compare, lookalikes, quiz, fish.quiz, lab-anatomy…) to its new one (learn.genus,
  // learn.compare, learn.look-alikes, practice.quiz, fish.practice.quiz, tools.anatomy); a new one is left as it is.
  const PAGE_OLD = {genus: 'g-x', compare: 'cmp-x|y', lookalikes: 'cmp'};
  function pageRename(n) {
    const s = String(n == null ? '' : n),
      S = SUBJECTS.find(x => x.pv && s.startsWith(x.pv)),
      pre = S ? S.pv : '',
      b = s.slice(pre.length);
    if (
      /^(learn|practice|identify|leaderboard|tools)\./.test(b) ||
      ['home', 'progress', 'about', 'other', 'tools', 'leaderboard'].includes(b)
    )
      return s;
    const k = PAGE_OLD[b] || (b === 'lab' ? 'lab' : b),
      m = pageName(k, pre);
    return m === pre + 'other' ? s : m;
  }
  // This device's data under the old names (app.js and admin.js at start-up, after migrateIdKey): the photo size per page
  // (reefid-sync-size, keyed by page name: genera, genus, pair, idkey, lab-gallery, lab-elim; tips dropped), the events
  // still queued (reefid-evq: each one's address, a visit summary's page names), the photos flagged (reefid-photo-flags:
  // where they were seen). Idempotent (a value the sheet sends back from an older device is moved at the next start).
  // Returns the keys it wrote.
  const SIZE_OLD = {
    genera: 'learn.genera',
    genus: 'learn.genus',
    pair: 'learn.compare',
    idkey: 'identify.key',
    'lab-gallery': 'tools.gallery',
    'lab-elim': 'tools.elim',
    tips: null
  };
  function migrateRoutes(s) {
    try {
      s = s || localStorage;
    } catch (e) {
      return [];
    }
    const done = [],
      edit = (k, f) => {
        try {
          const v = s.getItem(k);
          if (v === null) return;
          const w = JSON.stringify(f(JSON.parse(v)));
          if (w !== v) (s.setItem(k, w), done.push(k));
        } catch (e) {}
      };
    edit('reefid-sync-size', o => {
      if (!isObj(o)) return o;
      Object.keys(SIZE_OLD).forEach(a => {
        if (!Object.prototype.hasOwnProperty.call(o, a)) return;
        if (SIZE_OLD[a] && !Object.prototype.hasOwnProperty.call(o, SIZE_OLD[a])) o[SIZE_OLD[a]] = o[a];
        delete o[a];
      });
      return o;
    });
    edit('reefid-evq', L =>
      !Array.isArray(L)
        ? L
        : L.map(x => {
            if (!isObj(x)) return x;
            const y = {...x};
            if (typeof y.pg === 'string') y.pg = routeRename(y.pg).slice(0, 60);
            if (isObj(y.r)) {
              const r = {};
              Object.keys(y.r).forEach(n => {
                const m = pageRename(n),
                  a = r[m],
                  b = y.r[n];
                r[m] = Array.isArray(a) && Array.isArray(b) ? [a[0] + b[0], a[1] + b[1]] : b;
              });
              y.r = r;
            }
            return y;
          })
    );
    edit('reefid-photo-flags', L =>
      !Array.isArray(L)
        ? L
        : L.map(x => {
            if (!isObj(x) || typeof x.where !== 'string') return x;
            const [h, ...rest] = x.where.split(' · ');
            return {...x, where: [h === 'home' ? h : routeRename(h) || 'home', ...rest].join(' · ')};
          })
    );
    return done;
  }
  // routes-migration: end
  // A page name read back (admin): its subject (by its SUBJECTS pv prefix) and its page ('fish.quiz' -> ['fish', 'quiz'],
  // 'quiz' -> ['coral', 'quiz']).
  function pageSubj(n) {
    const s = String(n == null ? '' : n),
      S = SUBJECTS.find(x => x.pv && s.startsWith(x.pv)) || SUBJECTS.find(x => !x.pv);
    return [S.id, S.pv ? s.slice(S.pv.length) : s];
  }
  // How a genus sheet was reached, from the page it was opened from.
  function pageFrom(h) {
    const n = pageName(h);
    if (/^practice\.(quiz|custom|duels)$/.test(n)) return 'quiz';
    if (/^learn\.(genera|genus|compare|look-alikes)$/.test(n) || n === 'practice.memory') return 'learn';
    if (/^(progress|leaderboard)/.test(n)) return 'progress';
    return 'other';
  }
  const pagesNew = () => ({r: Object.create(null), g: Object.create(null), cur: null, at: 0});
  // The page in view stops counting time (hidden, or another page opens).
  function pagesStop(S, now) {
    const c = S.cur;
    if (c && S.at) {
      const ms = Math.max(0, now - S.at);
      (S.r[c.n] = S.r[c.n] || [0, 0])[1] += ms;
      if (c.g) (S.g[c.g] = S.g[c.g] || [0, 0, c.from, c.asked])[1] += ms;
    }
    S.at = 0;
  }
  // A page opened: h its hash; o.genus the genus of a sheet (checked by the caller against the data), o.from how it
  // was reached (pageFrom), o.asked the genus already asked to the player, o.hidden the app not in view, o.pre the
  // page-name prefix of the subject on screen (SUBJECTS pv, pageName).
  function pagesOpen(S, h, now, o = {}) {
    pagesStop(S, now);
    const n = pageName(h, o.pre),
      g = n === 'learn.genus' && PAGES.GENUS.test(String(o.genus || '')) ? o.genus : null;
    (S.r[n] = S.r[n] || [0, 0])[0]++;
    if (g) (S.g[g] = S.g[g] || [0, 0, PAGES.FROM.includes(o.from) ? o.from : 'other', o.asked ? 1 : 0])[0]++;
    S.cur = {n, g, from: g ? S.g[g][2] : '', asked: g ? S.g[g][3] : 0};
    S.at = o.hidden ? 0 : now;
  }
  const pagesResume = (S, now) => {
    if (S.cur && !S.at) S.at = now;
  };
  // The summary: {r: {page: [times, seconds]}, g: {genus: [times, seconds, from, asked]}}, seconds rounded, the most
  // opened first and capped (ROUTES, GEN); null when nothing was open. Times 0 = the page kept from the previous summary
  // of the same visit (pagesTake), still in view.
  function pagesSummary(S) {
    const sec = ms => Math.min(PAGES.MAXS, Math.round(ms / 1000)),
      keep = (O, cap) =>
        Object.keys(O)
          .filter(k => O[k][0] > 0 || sec(O[k][1]) > 0)
          .sort((a, b) => O[b][0] - O[a][0] || O[b][1] - O[a][1] || (a < b ? -1 : 1))
          .slice(0, cap),
      r = {},
      g = {};
    keep(S.r, PAGES.ROUTES).forEach(k => (r[k] = [Math.min(PAGES.MAXN, S.r[k][0]), sec(S.r[k][1])]));
    keep(S.g, PAGES.GEN).forEach(k => (g[k] = [Math.min(PAGES.MAXN, S.g[k][0]), sec(S.g[k][1]), S.g[k][2], S.g[k][3]]));
    return Object.keys(r).length ? {r, g} : null;
  }
  // The summary so far, and a fresh tally for the rest of the visit (the page in view goes on counting from 0 times).
  function pagesTake(S, now) {
    pagesStop(S, now);
    const out = pagesSummary(S);
    S.r = Object.create(null);
    S.g = Object.create(null);
    return out;
  }
  // Whose summary it is (Codex review #423): set when it is queued, so a summary left in the queue (offline, a failed
  // send) is never sent under whoever is active later. 'n:<name, lower case>' signed in, 'a:<anonymous answer id>' else.
  // It stays on the device (pagesBatch strips it).
  const pagesOwner = (sync, anon) => (sync && sync.name && sync.pin ? 'n:' + String(sync.name).trim().toLowerCase() : 'a:' + anon);
  // The events a request sends for the player active now (owner): every other event, and the summaries queued for
  // this owner (without their owner field); the ids of the summaries queued for another owner (or none), to drop.
  function pagesBatch(q, owner) {
    const send = [],
      drop = [];
    (q || []).forEach(x => {
      if (!x || x.k !== 'pages') return send.push(x);
      if (x.o !== owner) return drop.push(x.id);
      const {o, ...y} = x;
      send.push(y);
    });
    return {send, drop};
  }
  // At sign-in the device's anonymous summaries become the account's, as its anonymous answers do (sync.js signIn).
  const pagesOwn = (q, from, into) => (q || []).map(x => (x && x.k === 'pages' && x.o === from ? {...x, o: into} : x));
  // What the sheet keeps of a 'pages' event (Code.gs events_): known shapes only, numbers clamped, no other field. The
  // output objects have no prototype (names come from the players' devices: "__proto__" must stay a plain key).
  function pagesClean(x) {
    const o = x && typeof x === 'object' ? x : {},
      n = (v, hi) => {
        const k = Math.round(Number(v));
        return isFinite(k) ? Math.max(0, Math.min(hi, k)) : 0;
      },
      obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}),
      R = obj(o.r),
      G = obj(o.g),
      r = Object.create(null),
      g = Object.create(null);
    Object.keys(R)
      .filter(k => PAGES.RE.test(k) && Array.isArray(R[k]))
      .slice(0, PAGES.ROUTES)
      .forEach(k => (r[k] = [n(R[k][0], PAGES.MAXN), n(R[k][1], PAGES.MAXS)]));
    Object.keys(G)
      .filter(k => PAGES.GENUS.test(k) && Array.isArray(G[k]))
      .slice(0, PAGES.GEN)
      .forEach(
        k => (g[k] = [n(G[k][0], PAGES.MAXN), n(G[k][1], PAGES.MAXS), PAGES.FROM.includes(G[k][2]) ? G[k][2] : 'other', G[k][3] ? 1 : 0])
      );
    const out = {r, g, vi: /^[a-z0-9]{1,12}$/.test(String(o.vi || '')) ? String(o.vi) : ''};
    if (o.na !== undefined && o.na !== null && o.na !== '' && isFinite(Number(o.na))) out.na = n(o.na, 1e6);
    return out;
  }

  // The one-tap question's bank (Pierre, 2026-11-03: "ask slightly different questions about roughly the same
  // concept", so the players say as they go whether the difficulty suits their level; quiz.js pulseAsk, admin Errors).
  // Each item is answered in one tap; each answer sits on one or two common scales: d, felt difficulty (−1 too easy,
  // 0 right, +1 too hard) and f, how the play feels (−1 bad, 0 neutral, +1 good); null = says nothing on that scale.
  // A "no" to a one-sided item (frustrating? boring?) is 0 on both: not too hard, not too easy; asked as often as each
  // other, the two one-sided items shrink a mean towards 0 without tilting it. Codes easy / ok / hard keep their v19
  // meaning on the difficulty scale (the sheet's Detail keeps only those three); an item's other codes ride as they
  // come (Message column) and its id in the Where column: no new sheet version (v19 stores both as text).
  // Sources (docs/LEARNING.md "What the players say about the difficulty"): are, the app's question since v19 (the
  // Too Easy / Appropriate / Too Difficult rating of Papoušek, Stanislav & Pelánek 2016); zone, flow's three channels
  // (boredom, flow, anxiety: Csikszentmihalyi 1975), the balance the flow short scale's item 16 asks as demands too
  // little / just right / too high (Rheinberg, Vollmeyer & Engeser 2003); more, the same balance asked as a wish; fun,
  // frus, bored, the in-game GEQ's positive affect, tension and negative affect items (IJsselsteijn, de Kort & Poels 2013).
  // Besides the answers, every prompt logs its showing (PULSE_SHOWN) and, when it ends without an answer, a "Not now"
  // (PULSE_SKIP) or moving on without a tap (PULSE_NONE): the admin's response rates.
  const PULSE_SHOWN = 'shown',
    PULSE_SKIP = 'skip',
    PULSE_NONE = 'none';
  const PULSEQ = [
    {
      id: 'are',
      q: 'These questions are',
      a: [
        ['easy', 'Too easy', -1, null],
        ['ok', 'About right', 0, null],
        ['hard', 'Too hard', 1, null]
      ]
    },
    // The challenge-skill balance as the flow channels, said as states (Pierre, 2026-11-03: "the challenge is too low /
    // too high" left non-native speakers unsure whether low meant easy or hard).
    {
      id: 'zone',
      q: 'Right now I feel',
      a: [
        ['easy', 'Bored', -1, null],
        ['ok', 'In the zone', 0, null],
        ['hard', 'Struggling', 1, null]
      ]
    },
    {
      id: 'more',
      q: 'Want harder photos?',
      a: [
        ['easy', 'Yes', -1, null],
        ['ok', 'Keep it', 0, null],
        ['hard', 'Easier', 1, null]
      ]
    },
    {
      id: 'fun',
      q: 'Having fun?',
      a: [
        ['lo', 'Not really', null, -1],
        ['mid', "It's OK", null, 0],
        ['hi', 'Yes!', null, 1]
      ]
    },
    {
      id: 'frus',
      q: 'Frustrating?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', 0.5, -0.5],
        ['yes', 'Very', 1, -1]
      ]
    },
    {
      id: 'bored',
      q: 'Getting boring?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', -0.5, -0.5],
        ['yes', 'Yes', -1, -1]
      ]
    }
  ];
  // The first item ever asked, and the item of every answer logged before the bank (no item id: sheet rows until
  // 2026-11-03).
  const PULSE0 = 'are';
  const pulseItem = id => PULSEQ.find(x => x.id === (id || PULSE0)) || null;
  // An answer on the common scales: {d, f}, null where it says nothing (an unknown item or code: both null).
  function pulseScore(id, code) {
    const it = pulseItem(id),
      a = it && it.a.find(x => x[0] === code);
    return a ? {d: a[2], f: a[3]} : {d: null, f: null};
  }
  // Which item to ask next. Rounds: every item once in a shuffled order, then a new round, never starting with the item
  // just asked, so a player never meets the same wording twice in a row and meets each one as often. st is what the
  // device stored at the last ask ({q: item asked, left: the round's items still to ask}; before the bank, {at} alone,
  // which means PULSE0 was asked); rnd a random number generator in [0, 1). Returns {q, left}, to store.
  function pulsePick(st, rnd = Math.random) {
    const ids = PULSEQ.map(x => x.id),
      last = (st && st.q) || (st && typeof st.at === 'number' ? PULSE0 : ''),
      shuffle = L => {
        const o = L.slice();
        for (let i = o.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [o[i], o[j]] = [o[j], o[i]];
        }
        return o;
      };
    let left = (st && Array.isArray(st.left) ? st.left : []).filter((x, i, L) => ids.includes(x) && x !== last && L.indexOf(x) === i);
    if (!left.length) {
      if (!last) return {q: PULSE0, left: shuffle(ids.filter(x => x !== PULSE0))};
      left = shuffle(ids);
      if (left[0] === last) left.push(left.shift());
    }
    return {q: left[0], left: left.slice(1)};
  }

  // Quantile q (0-1) of a list sorted in ascending order, linear between neighbours (the usual "type 7": the median of
  // 1, 2, 3, 4 is 2.5, its first quartile 1.75). null for an empty list. Admin Photo stats.
  function quantile(a, q) {
    if (!a.length) return null;
    const i = (a.length - 1) * Math.min(1, Math.max(0, q)),
      k = Math.floor(i);
    return a[k] + (a[Math.min(k + 1, a.length - 1)] - a[k]) * (i - k);
  }
  // How a list of numbers spreads (admin Photo stats › Overview, Pierre 2026-11-03: "a median and a spread, not a box
  // plot"): count, sum, mean, min, max, the median and the middle half (p25 to p75). The list is not changed.
  function distOf(L) {
    const a = L.filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y),
      sum = a.reduce((t, x) => t + x, 0);
    return {
      n: a.length,
      sum,
      mean: a.length ? sum / a.length : null,
      min: a.length ? a[0] : null,
      p25: quantile(a, 0.25),
      med: quantile(a, 0.5),
      p75: quantile(a, 0.75),
      max: a.length ? a[a.length - 1] : null
    };
  }

  const CORE = {
    quantile,
    distOf,
    BENTHIC,
    BONUS,
    slateOf,
    gameOf,
    lectureGroup,
    starRefs,
    starWaits,
    PHOTO_BASE,
    photoLocal,
    photoFallback,
    photoOnline,
    photoFileOf,
    photoAway,
    photoIndex,
    photoCropOf,
    photoRetry,
    PHOTO_RETRY,
    TYPE,
    TYPED_RE,
    typeDist,
    typeNorm,
    typeNamesOf,
    typeMatchIn,
    typeElse,
    typeVerdict,
    typeDiff,
    typedShare,
    PROG,
    mxKeeps,
    pgStep,
    pgOf,
    scoreOf,
    pctOf,
    rankWeights,
    fishScoreTree,
    treeScore,
    DOM,
    DOM_PRIOR,
    domP,
    domUpdate,
    domScore,
    domBar,
    domStep,
    domOn,
    barOf,
    examOpen,
    keepsMark,
    domFromCounts,
    faOf,
    looksLeft,
    afterBkt,
    TARGET_P,
    AIM,
    aimOf,
    pgRightW,
    pgMissW,
    pgMemW,
    kOf,
    MEM_LOGGED,
    CF_LOGGED,
    replayProgress,
    scoreAnswer,
    scoreRec,
    scoreIn,
    scoreLog,
    startPriorAt,
    startFp,
    startEvents,
    startEventsOf,
    startStateAt,
    startNorm,
    startUnion,
    startAdminSet,
    startWt,
    START_CAP,
    replayedOf,
    replayAdopted,
    replayBase,
    logRow,
    ELO,
    abilityOf,
    levelMove,
    eloStep,
    RV_CARD,
    RV_SORRY,
    RVS,
    RV,
    RV_SHEET,
    RT_SHEET,
    START_SHEET,
    DOM_SHEET,
    SCORE_SHEET,
    LOG_SHEET,
    REPLAYS_SHEET,
    WINK_SHEET,
    logOk,
    RTIME,
    rtMedian,
    rtWeight,
    rtAdd,
    rvMsgs,
    learnedOf,
    PAGES,
    ROUTE_SUBJ,
    ROUTE_FIRST,
    routeOut,
    routeIn,
    routeRename,
    pageRename,
    migrateRoutes,
    pageName,
    pageSubj,
    pageFrom,
    pagesNew,
    pagesStop,
    pagesOpen,
    pagesResume,
    pagesSummary,
    pagesTake,
    pagesClean,
    pagesOwner,
    pagesBatch,
    pagesOwn,
    ACH,
    FISH_ACH,
    ACH_CONTRIB,
    achFind,
    newAch,
    achRecount,
    ACH_LEARN,
    achRevoke,
    mergeAch,
    CONTRIB_MAX,
    contribKey,
    contribAdd,
    LIST_MAX,
    repsAdd,
    HELPED_GAP,
    handledSeen,
    helpedDue,
    helpedMark,
    LEVEL,
    SORRY,
    firstName,
    RESERVED_NAMES,
    SEED_LOOKALIKES,
    reservedName,
    SEED,
    MARK_SHEET,
    markRow,
    markHtml,
    sorryFelt,
    sorryOf,
    sorryDue,
    sorryHi,
    sorryText,
    START,
    playerStart,
    CHOICE,
    startKey,
    startText,
    startOpt,
    startVars,
    startCheck,
    startBand,
    levelFit,
    startNext,
    startInfer,
    levelSeed,
    accountOf,
    commonFactor,
    applyCuration,
    applySlots,
    CAP,
    cfCrop,
    isObj,
    eq,
    canon,
    merge3,
    mergeTabs,
    takeTab,
    mergeOld,
    mergeProgress,
    eloOf,
    genusOffsetsOf,
    GENUS_K,
    levelMargin,
    playSplit,
    trustOf,
    guessOf,
    fmtOf,
    FMT,
    fmtOffsetsOf,
    fmtPoint,
    fmtFit,
    fmtOff,
    FMT_SHEET,
    fmtsOf,
    TRUST,
    PHOTO_W,
    PLAYER0,
    MEM,
    memBucket,
    memFam,
    memOf,
    photoMemOf,
    memRecalc,
    confusionOf,
    CONF,
    confScore,
    confGap,
    dataLook,
    pairConf,
    mergeUsers,
    winkUnion,
    TOLD,
    toldUnion,
    OPEN_AGAIN,
    openState,
    PULSEQ,
    PULSE0,
    PULSE_SHOWN,
    PULSE_SKIP,
    PULSE_NONE,
    pulseItem,
    pulseScore,
    pulsePick,
    ORG,
    KEYS,
    SUBJECTS,
    SUBJECT_KEY,
    subjectOf,
    CALIB,
    calibOf,
    subjGroup,
    replaySubject,
    replayedSubjects,
    rvsOf,
    rvOf,
    LOG_SUBJ,
    LOG_SC,
    ansSubject,
    rowSubject,
    WINK_MODE,
    LOG_MODE,
    winkEntry,
    winkRow,
    subjRows,
    subjEntries,
    subjCounts,
    subjKey,
    subjDev,
    fishGen,
    fishReplayGen,
    easyRank,
    easyCover,
    refFirst,
    refLevel,
    refScore,
    licOf,
    rightsClass,
    rightsRank,
    fishOn,
    FISH_COUNT,
    fishCount,
    fishOther,
    fishIn,
    fishGone,
    fishPid,
    FISHPH,
    fishPhotos,
    unitPool,
    exposureOf,
    keepSubjectKeys,
    fishNames,
    fishTypeNames,
    fishNameIndex,
    typeFits,
    typeForms,
    fishGameRow,
    fishGameRead,
    renamedId,
    sheetIdOf,
    fishTree,
    renameUnits,
    renameLogEntry,
    typeNormAll,
    LEGACY_KEYS,
    keyRename,
    keyLegacy,
    keyBefore,
    keyGet,
    travelData,
    withOldNames,
    migrateKeys,
    migrateStorage,
    migrateIdKey,
    keysIn,
    LEGACY_SEND,
    withLegacy,
    dataSum,
    sameText,
    dataDelta,
    dataPatch
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
})(this);
// END core.js
return module.exports; })();
