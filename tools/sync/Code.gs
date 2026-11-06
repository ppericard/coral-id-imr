// IMR Reef ID: progress sync for the RAs, stored in this Google Sheet.  VERSION 78 (2026-11-06: v78: the embedded core.js lists the fish admin's Candidates page (SUBJECTS fish admin pages, photos/candidates; admin plan PR 5a), unused by the script: nothing it computes changes; v77 is held by #652; v76: the embedded core.js reads a FishBase reference or sheet photo (fb<stem>) and its candidate (fish-<species>-cand-fb-<stem>) as one photo (fishPid; Codex review #660), unused by the script: the fish answers are not logged, so nothing it computes changes; v74: the embedded core.js accepts more typed fish names (fish beta QA: fishNames reads a node's curated other names, fish.json aka, and its names in common use, often, which fishGen lists as oft and the typed match returns for a gentle correction; fishTypeNames, with SUBJECTS typeDrop, the name without "fish", its plural and the name's own plural, when unambiguous in the game), and gains SUBJECTS several (the report dialog's "Several corals" / "Several fish species" reason), unused by the script: nothing it computes changes; v72 and v73 are held by #655 and #599; v71: the embedded core.js puts a fish unit's reference-level photos first (refLevel, refFirst: a reference source's photo judged very easy, or any photo judged 5 with the reference look, one kind of fish; Pierre, 2026-11-06) and gains the subjects' difficulty calibration (SUBJECTS calib, CALIB, calibOf: the corals keep the defaults), unused by the script: the fish answers are not logged, so nothing it computes changes; v70: the embedded core.js gains the fish game photos (fishOn, fishPid, FISHPH, fishPhotos: the photos Pierre put in play, hosted on R2, in place of the stopgap list where an entry has 5 very easy ones; admin plan PR 7), unused by the script: only the replayed subject (the corals) feeds what it computes, so nothing changes; v69: the fish units are the book's families (Pierre, 2026-11-06 13:04; docs/reviews/2026-11-06-fish-units-plan.md): the embedded core.js gains the old-id map (SUBJECTS renamed, renamedId, renameUnits, renameLogEntry); a fish answer naming an old entry (t01, from an app before the switch) is logged under its family (f:Damselfishes; one map per row, the species shown deciding a split entry: Diploprion is the Soapfishes), and so are a report's units (f: ids accepted); a one-shot migration (ONCE_ fishunits, Pierre's yes, Q159) renames the fish rows and reports logged before, in the Deploy log; v68: the embedded core.js orders a fish unit's photos by their ease, then how much they look like a reference photo, never by who took them (easyRank, refScore; Pierre, 2026-11-06), and marks the corals' photo source tiers (SUBJECTS tiers), unused by the script: nothing it computes changes; v67: fish opens to every player (Pierre, 2026-11-06, Q158: "open fish to everyone now", the beta label kept): the embedded core.js has SUBJECTS fish open: 'all', so groupIds_ lists no subject: the load and save replies carry groups: [], userGroup answers error 'group', the admin's player list has no Beta column, and the Groups tab's rows are kept (read again if fish goes back to open: 'group'); v66: the embedded core.js gains the admin's filter bar fields (admin plan PR 3: SUBJECTS admin origins, each subject's photo origins, and csrc, its Candidates sources), unused by the script: nothing it computes changes; v65: the embedded core.js gains the app's addresses (URL refonte: routeOut, routeIn, the page names learn.genus, practice.quiz… of pageName, routeRename, pageRename, migrateRoutes) and the subjects' address prefix (SUBJECTS hash); pagesClean keeps the new names as they come ('.' and '-' were already allowed), so nothing the script stores or serves changes; v64: the embedded core.js names the fish admin pages by their new addresses (URL refonte: SUBJECTS admin pages inbox/todo/reports, inbox/todo/errors, players/list), nothing the script does changes; v63: one player level shown everywhere (Pierre, 2026-11-06, Q134): the leaderboard's level (board_) is the app's own, the th of the '~level' record in each player's saved progress, read with the % from the same copy, from ELO_MIN answers of that record; stats_'s chain R (start -1) no longer reaches the board and stays internal: the photo Elo's player term, and ras for the admin; nothing a player's progress holds changes (no rules version); v57-v65 were taken by pending branches; v62: one surprise counted once (Pierre, 2026-11-06, Q137 part 1): the embedded core.js scoreAnswer has the genus shown take the global level as it stands after the answer's step on it, so the genus's levelMove carries only the level's moves from the other answers; core.js rules version 7 replays every player once; nothing else the script computes changes; v61: one scorer (Pierre, 2026-11-06, Q132): the app and the full replay score an answer through one function, core.js scoreAnswer, and each answer carries what the app scored it with (sc: the photo difficulty, the photo memory, the mix-ups term, the look-alike test, the recalls of a comeback question, the corallites hint revealed after the answer), kept in a new last Answers column, Scoring (core.js scoreRec as JSON, each field checked; blank when the app sent none), read by its name and served by readAnswers at index 15 (an object, null before), and replayed at index 15 of the replay rows (rowOf_), so replay_ and replayedAll_ rebuild exactly the progress the app had for those rows, whatever pooled stats they hold; rows logged before keep the replay by their logged e; core.js rules version 6 replays every player once; the Answers tab is read up to its last column (answerRows_, answers_), so a tab not yet widened reads as before; v60: every subject's answers are logged (Pierre, 2026-11-06: fish answers logged from the very first second; the sheet records an answer at any taxonomic level): the Answers tab gets five columns at the end, Subject (the answer's subject, core.js SUBJECTS id: coral or fish; blank in the rows logged before, all coral; an app that sends none is coral), Rank (the rank asked: coral genus; fish family, an IMR entry, or genus, a scientific genus; later species), Taxon shown and Taxon answered (the names at that rank when a unit's id is not its name: Damselfish for t01, Chromis for g:Chromis; blank for a coral genus) and Species shown (the PDF species of the fish photo shown); Genus shown, Answered, Choices and a duel's mode keep the units as the app asks them (t01, g:Chromis allowed: digits and ':' after a first letter); only the subject the sheet replays (core.js SUBJECTS replay: the corals) feeds what the script computes (answerRows_: photo ratings, genus offsets, confusions, memory, trusted players, the opening hold, the full replay; the admin's player list numbers in users_), so a fish answer moves no coral number; readAnswers serves the five at indexes 17-21, after v59's Typed and Retyped right, now served at 15-16 (the subject filled with coral, the rank with the subject's, in the rows logged before) and every reader of one subject keeps its rows (core.js subjRows); a tab with fewer columns reads them blank (logRows_) until the next answer adds them; the embedded core.js renames SUBJECTS log to replay, adds rank, the answer-log subject helpers and LOG_SHEET 60, the version from which the app sends the answers of a subject the sheet does not replay (rule D4); v59: the Answers tab gains two columns at the end, Typed (a typed answer's raw text as first typed, up to 40 characters) and Retyped right (its spelling step: 1 retyped exactly, 0 not, blank when none was asked; quiz.js typeBind, a player's idea approved by Pierre the same day), logged only, and the embedded core.js gains typeVerdict and typeDiff, unused by the script: nothing it computes changes; v58: archive instead of rename (Pierre, 2026-11-05, Q84/Q88; the deleted-accounts audit, PR 2): admin {userArchive: {from, into}} (was userRename) moves the record to the archive name and marks it Board -2 (no new column); an archive leaves normal operation: liveRows_ keeps it out of the leaderboard, the achievement shares, the player list (sent apart as archived: [{name, id, time, answers, reports}]), the beta groups (dropped at archiving; userGroup adds live players only), readAnswers' players, and repsOf_-style readers; its answers are flagged 2 in readAnswers as a deleted account's (pooled photo statistics only) and left out of stats_ ras; a merge, a rename or a leaderboard toggle refuse an archive (error 'archived'); a delete still takes it, in either mode; a player's own save never undoes Board -1 or -2; each account's saved data keeps its generation _acct (made at its first save, kept by every save and merge, sent apart as acct in the load reply), so a device that knew another generation of the name says the record was archived; the app's device of an archived record sees found: false while it holds a sheet revision and says the record was archived instead of re-creating it (sync.js); a player deletes their own account and all its data (POST selfDelete with dname / dpin, selfDelete_: the code checked, "delete everything" semantics, the Removed tombstone only, capped 3 tries per name (keyed by its anonymous id) and 30 in all per 6 hours; the app's #delete-account page); archiving moves the record's name mentions in Events and Alerts to the archive name (redact_, as a merge), so deleting the archive leaves none; a report carries the account generation it was queued under (racct): from another generation of the name, or under a name that has no account left, it is logged with no reporter, Verified 0, never the new account's (Codex review #603); a save carries the generation the device saved under (acct): checked under the lock before anything is logged or written, a name with no account left or another generation of it answers error 'archived'; page summaries carry it too (eacct) and another generation files them under no player; a save's reply carries the generation (acct), so the device that created the account knows it at once; a report's generation is checked whatever its code or throttle; v57: a player's load reply (GET name, pin) carries reps, the ids of their own verified reports in the Reports tab (Reporter their name, Verified 1, sent after the name's last removal if it was deleted and taken again; the last REPS_MAX = 50; no field when none: repsOf_), so their app can tell them once that a report was handled (Pierre, 2026-11-05, Q66: the app reads the admin's Done from curation.json seen 'rep:<id>' and thanks the player; Pierre's notes are never sent); an older app ignores the field; the embedded core.js gains repsAdd and helpedTake (the app's side), unused by the script; v56: the embedded core.js gains the Contributions achievements (Pierre, 2026-11-05, Q65: core.js ACH kind 'contrib', fb1 / fb5 / fb10 for the 1st, 5th and 10th report sent; contribKey, contribAdd, contribJoin) and mergeAch joins two records' lists (the reports counted, _fb), unused by the script: it stores a player's achievements record as it comes and counts its ids for the shares (achs_) as before, so nothing it computes changes; v55: a deleted account leaves nothing in normal operation (Pierre, 2026-11-05, Q84-Q91): userDelete with answers deletes the account's reports too, without answers relabels them "~deleted <id>" with Verified 0 (open ones stay in the admin's Inbox as from a removed account, never thanked); the page summaries are always deleted (Pages); name mentions in Events ('old' rows) and Alerts (n:<name>) are redacted; a delete or merge clears the board, achievements and stats caches and marks the stored Analyses report stale (analysesGet head stale, ROSTER_AT), so the Action refits it at once; readAnswers flags the "~deleted" rows 2 in the anonymous column (1 stays a device that never signed in), and stats_ leaves them out of the per-player abilities (ras), the photos, genus offsets, confusions and memory keep them; a report sent with the name and code of a removed account is logged under the name it joined (merged) or with no reporter, Verified 0 (deleted); a device's Replayed row is dropped when its answers are claimed at sign-in or deleted (anonDelete); a one-shot cleanup (ONCE_ removedcleanup) deletes the Replayed rows of devices with no answer left and the reports of accounts deleted outright before this version, logged in the Deploy log; v54: comments only: this file and the embedded core.js cite Pierre's rules by their new IDs (docs/rules/), nothing the script does changes; v53: the beta groups (groupIds_) are the subjects that open to a group (core.js SUBJECTS open: 'group', subjGroup), no longer every subject with a beta label, which is now the label only; fish says open: 'group', so the groups, replies and Groups tab are the same as v52, and a subject set to open: 'all' keeps its rows in the Groups tab (read, never deleted) for a return to 'group'; v52: the embedded core.js's achievement descriptions say the runs of right answers and Sharp eye are earned in the Quiz only, not in the custom quiz or the Duel tab (Pierre, 2026-11-05, Q82; the app's progress.js achAfter), unused by the script: nothing it computes changes; v51: the embedded core.js gains the photo fallback helpers (photoOnline, photoFileOf, photoAway, photoFallback, photoIndex, photoCropOf; Pierre, 2026-11-05: when R2 fails, a photo with an online original is read from it, not from img/), unused by the script: nothing it computes changes; v50: every reply is the script's own JSON (Pierre, 2026-11-05: "save failed" too often): an exception thrown out of doGet / doPost (the script lock not had in time, a Sheets service timeout or quota, a script error) made Apps Script answer with its HTML error page, which has no CORS header, so the browser told the app "Failed to fetch" / "Load failed" although the script had answered; it is now caught and answered {ok: false, error: 'lock'} (the script lock waited for LOCK_MS, 20 s, held by another request: lock_, tryLock) or {ok: false, error: 'server', msg} (fail_), which the app retries; a save releases the script lock once its progress is written, its hold, groups and full replay computed after (the replay under its own lock, as a load's), so the lock is held for less time; the photo stats request carries the app's anonymous device id (dev) and the minutes its page has been open (up): the newest build reported is kept (BUILD_TOP), and a device on a replaced version is logged in Events as kind 'old' with its device id and version, when its page stayed open OLD_OPEN minutes on a version replaced OLD_H hours ago or it started a version replaced OLD_STUCK hours ago (behind_), at most once per device every 6 hours; v49 (2026-11-05): the embedded core.js keeps the sheet-only fish photos (use: 'ref', fish-photos.json sheet: a species with no game photo may keep one for its sheet, never in a game) out of a fish entry's game photos and lists them by species (fishGen sheet), unused by the script: the fish answers are not logged, so nothing it computes changes; v48 (2026-11-04): beta groups (Pierre, 2026-11-04: fish opens to a group of players he picks in the admin, not by one site-wide switch): a Groups tab (Group: a subject in beta, core.js SUBJECTS beta; Name; Added), admin POST {userGroup: name or [names], group, on, token} adds or removes players (existing players only, under the script lock), the admin's player list (users_) and each player's load and save replies carry the groups they are in (groups: [subject ids], [] for none: an older script sends no field, so the app keeps the beta subject closed), and a rename, a merge or a delete carries the memberships; v47: the embedded core.js asks the first-launch question per subject (SUBJECTS start, its words; core.js startKey: the fish welcome question's answer in reefid-sync-fish-start beside reefid-sync-coral-start; CHOICE.opts keeps only the ids and variables) and an account merge (mergeUsers) unites each subject's record; the coral record the replay reads (startOf_) and everything the script computes are unchanged; v46: players' reports keep a genus question's units (g:Platax); the embedded core.js lists the fish scientific genera's opt-in set (SUBJECTS fish optin sci), so a player's choice merges like the circles'; nothing else changes here; v45: the embedded core.js gains the admin's part of each subject (SUBJECTS admin: its address prefix, its part of curation.json, its admin pages), unused by the script: nothing it computes changes; v44: each answer's UTC offset on the player's device (tz, minutes east of UTC, Date.getTimezoneOffset at answer time, sign turned) in a new last Answers column, UTC offset, logged only and served by readAnswers at index 14; a one-shot migration (ONCE_ tz) fills +480 into the rows logged before (every player so far was on Philippine time), so the analyses can read the time of day at home of players outside the sheet's time zone; the app sends it with every answer (an older script ignores the field); v43 was left unused (the admin's subject switch became v45); v42: the admin's player list (users) carries each player's full replay, rp: [progress %, learned, the saved copy's %] over the slate (core.js slateOf on data.json, cached with gen_), computed here with the replay record of the Replayed tab (reused while the player's rows, reset and first-launch answer are the same), so the admin's Players page reads no saved copy one player at a time (replayedAll_); the embedded core.js keeps the sorted keys of a player's answer-time record beside it (rtMedian), so a replay no longer sorts them at every right answer, same results; v40: the embedded core.js gives a fish entry the group of the identification key in force (fishGen key, groups: fish.json key, Allen et al. 2015 for the Indo-Pacific, instead of the 10 IMR shape groups), unused by the script: the fish answers are not logged, so nothing it computes changes; v39: the embedded core.js names a page drawn with another subject than the corals on screen <subject>.<page> (pageName with the subject's prefix, SUBJECTS pv: fish.quiz, fish.home) and reads it back (pageSubj), so the Pages tab tells a fish page from a coral one, and gains the subjects' zoom tip wording (SUBJECTS zoom), unused by the script; pagesClean, which keeps these names as they come ('.' was already allowed), is unchanged, so the script stores and serves the same; v38: the Coral Finder tool became the Coral ID Key: a one-shot migration (ONCE_ idkey) renames the tool's old page names to idkey / lab-idkey in the Pages, Events and Reports tabs, logged in the Deploy log; core.js copy with the renamed identifiers and the device migration migrateIdKey. v37: the embedded core.js gains the fish starter core (fishGen marks fish.json start entries first) and the fish card cover chosen within the highest source tier (Pierre's own first), then by the judged ease of fish-photos.json, unused by the script: the fish answers are not logged, so nothing it computes changes; v36: the full replay applies the player's first-launch answer (reefid-sync-coral-start in their saved data, or start in an anonymous device's send): a genus never answered starts from the global level shrunk towards the level the answer says, the answer in force at each answer (core.js startPriorAt), the stored replay keyed by that history's fingerprint too (Replayed Since = reset#fingerprint, core.js startFp) and sent with it (fp), so the app adopts it only for the history it holds, as the app does; v35: the admin's Analyses report (multifactor analyses of the answer log, every 1000 answers), computed by a GitHub Action (tools/analyses.js, .github/workflows/analyses.yml) and kept here: POST analysesPut stores it in an Analyses tab (chunked, 2.5 MB at most), POST analysesGet reads it (head: 1, only the answer count and the stored report's own count), admin token only; v34: a save keeps the saved copy's keys of a subject the saving app does not know (core.js keepSubjectKeys: an app from before fish no longer erases the fish progress); players' reports keep a fish teaching id (t01) as the expected and answered unit (logReports_); the embedded core.js gains the subjects (SUBJECTS, the fish adapter fishGen, mergeUsers per subject), unused by the script: the fish answers are not logged, so nothing it computes changes, and the fish progress is stored in the Data column as any other key; v33: the app was renamed IMR Reef ID and its storage keys with it (owner's decision, 2026-11-03): a player's saved data is read under the new key names or the old ones (dataKey_: progress, reset, achievements), an account merge drops the rules version under both names; the embedded core.js gains the key table (LEGACY_KEYS, keysIn, withLegacy), unused by the script; v32: the full replay reads each answer's Seconds (core.js rtWeight: a right answer's ability steps weighed by its time against the player's earlier ones, rules version 4); the app weighs its steps by time only from this version (core.js RT_SHEET); v31: hierarchical photo Elo: a photo's difficulty is its genus's offset plus its own residual, both moved by every trusted answer (the genus offset by GENUS_K 0.4, damped by its weighed answers), so a photo nobody has answered starts at its genus's offset; ?stats=1 serves each photo's total difficulty as before and the genus offsets as gd: {genus: [offset, weighed answers]} (stats cache stats15); the genus offset moves the photo memory offsets the full replay uses, so core.js rules version 3 replays every player again; v30: pages opened in a visit: an event 'pages' (core.js PAGES, cleaned by pagesClean: which pages were open, how many times and for how long, the genus sheets opened with how they were reached and whether the genus had been asked already, the answers so far) under the admin's id of the player, never the name: the device's anonymous answer id (eanon) is stored as aid_('~anon ' + id), a signed-in player's name and code (ename, epin) are checked and stored as aid_(name), a wrong code stores no id; kept in a Pages tab of their own, which POST {readEvents: 1, pages: 1, token} reads (the last 10,000), so the other events never push them out; v29: the embedded core.js gains the admin's quantile and distOf helpers (Photo stats Overview), unused by the script; v28: progress replayed from the whole answer log by this script: the app's own progress engine (core.js, embedded at the end of this file by tools/sync_core.py) replays a player's answers in the reply to a sign-in, load or save (or to a device's anonymous answers) when their app applied an older rules version, the result kept in a new Replayed tab and sent as replay: {rv, n, rec, ids}; the app adopts it, the player's saved copy is never rewritten here; the hold's ids, like the replay's, cover every answer from the request's pt (the oldest answer the device still queues); v27: typed answers (mode |t, the player types the genus instead of picking one of the choices) are rated with no guess rate (guess_ 0), stats cache stats14; v26: photo memory estimated from the answers: an answer on a photo is expected easier by an offset that depends on the player's own history with it (new 0; shown never right, right once, right twice or more: estimated in the same replay as the photos and the players, shrunk to the old fixed rule as prior), one expectation for the photos and the player's level (until v25 the level ignored memory), ?stats=1 serves the offsets as mem and the answers behind them as memn (stats cache stats13); v25: a request from an app version before 2026-11-03 (no av) is logged in Events as kind 'old', with the name or anonymous id when it carries one, at most once an hour per sender; v24: the flood caps count only answers the sheet does not have yet, so a device sending again what it already sent (the app's one-time catch-up of anonymous answers, a resend after a lost reply) never uses up its quota; v23: the opening hold synced: each load of a player's progress carries hold, the app's CUSUM (model.js holdStep) over their logged answers since their last progress reset, the gentle restart's answers (mode |w) left out; Answers gets two columns at the end, Seconds (time to answer) and Enlarged (a photo enlarged before answering, 0/1), logged only; v22: the leaderboard % follows the app's new progress per genus, a moving average of the answers weighed by what each one proves (s.pg, core.js PROG, pgOf); progress saved before it replays its last 10 results; v21: Events tab: one 'load' event a visit with the load times (first page, quiz, first quiz photo), the line measured, the bytes downloaded and the CDN server, so the loading order is set from the players' real lines; v20: the admin can hide a player from the public leaderboard (Board -1, userBoard), which the player's own syncs never undo (a test account); 2-choice questions logged as plain quiz are rated as 2-choice (from the Choices column; stats cache stats12); the admin can rename a player to keep their record apart (userRename: answers, reports, progress follow, hidden from the leaderboard; the old name is free again, so the person can start over under it); v19: Events tab: anonymous error reports from the players' devices (app errors, photos that fail, saves that fail) and their answers to the occasional one-tap question (too easy / about right / too hard); admin readEvents; v18: devices that never signed in count for photo difficulty and confusions under the same rule as signed-in players (10 answers, clearly above chance, weighed by experience n / (n + 10)); plain answer count per photo; v17: photo difficulty and confusions count only signed-in players whose answers are clearly above chance (10 answers or more); every player starts as a beginner (level -1); a player's answers move the photos more as their level settles (n / (n + 30)), and repeats count against what the player remembers of the photo; answers of a device that never signed in count once it signs in; readAnswers rows carry an anonymous flag; admin anonDelete removes the answers of chosen anonymous ids (test runs); v16: the leaderboard computes each player's progress % itself from their saved progress (same formula as the app), so it is up to date for everyone without waiting for their next sync; v15: the leaderboard shows a player's level only from 200 answers (it moves too much before); GET ?achs=1 gives how many signed-in players hold each achievement; v14: public leaderboard (GET ?board=1: name, progress %, level of every signed-in player who did not opt out), the progress % and the opt-out are saved with each sync (Progress, Board columns); per-player answers and abilities are admin-only (POST readAnswers / readStats with the token), so leaderboard names can't be matched to an answer history; v13: the admin player list gives each player's anonymous id, so the admin can show names beside the anonymous answer stats (admin token only, like the names); v12: answers of players who never sign in arrive under a random device id (~anon <id>), moved to the name at sign-in; caps against floods (per anonymous id, per name, new accounts, reports) with an Alerts tab; v11: updates itself from GitHub (autoUpdate, every 15 min, once installAutoUpdate has run: no more copy and paste); admin user management: list players with their stats, delete a player, merge two names of one person (admin token only); a removed name+code gets error 'gone' instead of a new account; the mode of a duel on a chosen pair (quiz-duel|A|B) is kept (it was dropped, so it was rated as a 4-choice answer); v10: each answer logs the choices offered (Choices column), and ?stats=1 adds how often each pair of genera was offered together and mixed up (confusion scores); v9: quiz questions with easy wrong choices are logged "quiz|kN" (N plausible choices) and rated with a 1/N guess; v8: reports read by every admin with their GitHub token (v7 had a single owner), reports and feedback from anywhere in the app (photos, sheets, pages); v7: players report a wrong answer or a bad photo (Reports tab); v6: code review fixes: progress of any size (Progress data tab), stale-write check, input sanitised, PIN throttle, secret salt for anonymous ids; earlier: v5 continuous difficulty)
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
const LOG = ['Name', 'Time', 'Genus shown', 'Answered', 'Right', 'Mode', 'Photos', 'Id', 'Expected', 'Ability', 'New photos', 'Choices', 'Seconds', 'Enlarged', 'UTC offset', 'Typed', 'Retyped right', 'Subject', 'Rank', 'Taxon shown', 'Taxon answered', 'Species shown', 'Scoring'];
const SC_COL = LOG.indexOf('Scoring');
const ACTIVITY = '=QUERY(Answers!A:E, "select A, count(E), sum(E), max(B) where A is not null group by A order by max(B) desc label count(E) \'Answers\', sum(E) \'Right\', max(B) \'Last answer\'", 1)';

function sheet_(name, head){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (head) { sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); if (head === HEAD) sh.hideColumns(7, 2); } }
  return sh;
}
function hash_(name, pin){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + '|' + name.toLowerCase() + '|' + pin));
}
const VERSION = 78;  // bump with the header line on every change; every reply carries it as v
function json_(o){ o.v = VERSION; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function find_(sh, name){
  const names = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]).toLowerCase());
  const i = names.indexOf(name.toLowerCase());
  return i > 0 ? i + 1 : 0;
}
function clean_(p){ return {name: String(p.name || '').trim().slice(0, 40), pin: String(p.pin || '').trim()}; }
// A user string never becomes a formula: a leading = + - @ gets Sheets' quote prefix (hidden, not part of the value read back).
// Also used for the code hash, whose base64 can start with +.
const safe_ = x => { const t = String(x == null ? '' : x); return /^[=+\-@]/.test(t) ? "'" + t : t; };
// Answer fields keep only the characters they can have; anything else is dropped.
const word_ = (x, re, n) => { const t = String(x == null ? '' : x).slice(0, n); return re.test(t) ? t : ''; };
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
function doGet(e){ try { return doGet_(e); } catch (err) { return fail_(err); } }
function doPost(e){ try { return doPost_(e); } catch (err) { return fail_(err); } }
const fail_ = err => json_(err && err.lockBusy ? {ok: false, error: 'lock'} : {ok: false, error: 'server', msg: errText_(err)});
const errText_ = err => String((err && err.message) || err || '').replace(/[A-Za-z0-9_-]{25,}/g, '…').replace(/[\u0000-\u001f]+/g, ' ').slice(0, 100);
// The script lock, waited for at most ms (LOCK_MS by default; it was waitLock(10000), whose timeout threw); thrown as
// {lockBusy} when another request holds it longer, which doGet / doPost answer as error 'lock'.
const LOCK_MS = 20000;
function lock_(ms){ const l = LockService.getScriptLock(); if (!l.tryLock(ms || LOCK_MS)) throw {lockBusy: true}; return l; }
function doGet_(e){
  ROWS_ = null;
  if (e.parameter.stats && !e.parameter.av) oldApp_('photo stats');
  if (e.parameter.stats) behind_(e.parameter);  // v50: a device on a replaced app version
  if (e.parameter.stats) { const st = stats_(); return json_({ok: st.ok, photos: st.photos, conf: st.conf, mem: st.mem, memn: st.memn, gd: st.gd}); }
  if (e.parameter.answers) return json_({ok: false, error: 'token'});
  if (e.parameter.board) return json_(board_());
  if (e.parameter.achs) return json_(achs_());
  const {name, pin} = clean_(e.parameter);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const sh = sheet_('RAs', HEAD), r = find_(sh, name);
  if (!r) { const g = gone_(name, hash_(name, pin)); return json_(g ? {ok: false, error: 'gone', into: g.into} : {ok: true, found: false}); }
  if (blocked_(name)) return json_({ok: false, error: 'wait'});
  const row = sh.getRange(r, 1, 1, HEAD.length).getValues()[0];
  if (row[6] !== hash_(name, pin)) { failed_(name); return json_({ok: false, error: 'pin'}); }
  if (!e.parameter.av) oldApp_('load', name);  // only for a real account with its code (Codex review #373)
  const d = readData_(name, String(row[7] || '')), data = JSON.parse(d.json), out = {ok: true, found: true, updated: row[1], rev: d.rev, data: data};
  // v58: the account's generation, apart from the progress (sync.js acctChanged); the app never stores it as a key.
  if (data && typeof data._acct === 'string') { out.acct = data._acct; delete data._acct; }
  // v48: the beta groups the player is in (groupsOf_), [] for none. A failure leaves it out (the app keeps what it had).
  try { out.groups = groupsOf_(name); } catch (err) {}
  // v57: the ids of the player's own verified reports (repsOf_), for "Your feedback helped" (Q66). A failure leaves it out.
  try { const reps = repsOf_(name); if (reps.length) out.reps = reps; } catch (err) {}
  // v23: the player's opening hold from their answers (hold_). An app before v23 ignores it; a failure leaves it out
  // (the app keeps its own).
  try { const o = hold_(name, resetOf_(data), Number(e.parameter.pt)); out.hold = o.h; out.holdIds = o.ids; } catch (err) {}
  // v28: the full replay of the player's log, when their app applied an older rules version (replay_). A failure leaves
  // it out (the app keeps its own progress and asks again next time).
  if (e.parameter.rv !== undefined) {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) try { const rp = replay_(name, resetOf_(data), Number(e.parameter.rv), Number(e.parameter.pt), startOf_(data)); if (rp) out.replay = rp; } catch (err) {} finally { lock.releaseLock(); }
  }
  return json_(out);
}

// POST {name, pin, data, summary: {learned, seen, total, review: [], genera: {Genus: 'ok'|'mid'|'weak'|'new'}},
//   answers: [{id, t, g, a, ok, m, ph, e, th, nw, ch, rt, zm, tz}], at: revision merged against (optional)} → {ok, log: true, rev}.
// log tells the app its answers are saved; they are logged first, so they are kept even if the progress write fails.
// at ≠ the saved revision → {ok: false, error: 'stale', log: true}: another device wrote meanwhile; the app pulls, merges, resends.
// POST {reports: [...], rname, rpin} → {ok, rep: true}: players' reports (logReports_, v7). The reporter goes in rname/rpin,
// never name/pin, so an older script answers 'input' and never mistakes a report for an empty progress write.
function doPost_(e){
  ROWS_ = null;
  const p = JSON.parse(e.postData.contents);
  if (Array.isArray(p.anonAnswers) && !p.av) oldApp_('anonymous answers', '~anon ' + String(p.anon || '').slice(0, 16));
  if (Array.isArray(p.anonAnswers)) return json_(anon_(p));  // v12: players not signed in (see anon_)
  if (Array.isArray(p.reports)) return json_(logReports_(p));
  if (p.selfDelete) return json_(selfDelete_(p));  // v58: a player deletes their own account (see selfDelete_)
  if (p.readReports) return json_(reports_(p.token));  // admin: POST {readReports: 1, token} (see reports_)
  if (Array.isArray(p.events)) return json_(events_(p));  // v19: error reports and one-tap answers (see events_)
  if (p.analysesPut || p.analysesGet) return json_(analyses_(p));  // admin (v35): the Analyses report, see analyses_
  if (p.readEvents) return json_(readEvents_(p.token, p.pages));  // admin: POST {readEvents: 1, token}; v30 pages: 1 for the Pages tab
  if (p.readStats || p.readAnswers) {  // admin (v14): per-player numbers, see doGet
    if (!isAdmin_(String(p.token || ''))) return json_({ok: false, error: 'token'});
    return json_(p.readStats ? stats_() : answers_({name: p.aname, pin: p.apin}));
  }
  if (p.users || p.userData || p.userDelete || p.userMerge || p.anonDelete || p.userBoard || p.userArchive || p.userGroup) return json_(users_(p));  // admin user management (v11, see users_; v48 userGroup)
  const {name, pin} = clean_(p);
  if (!name || !/^\d{4}$/.test(pin)) return json_({ok: false, error: 'input'});
  const lock = lock_();
  let out;
  try {
    const sh = sheet_('RAs', HEAD), h = hash_(name, pin), s = p.summary || {};
    let r = find_(sh, name);
    if (r && blocked_(name)) return json_({ok: false, error: 'wait'});
    // The code is checked before anything is written (v12 review: a wrong code must not move anonymous answers).
    if (r && sh.getRange(r, 7).getValue() !== h) { failed_(name); return json_({ok: false, error: 'pin'}); }
    // A name the admin removed or merged, with its old code: no new account. Answers of a merged name go to the name it
    // joined; the app then asks the player to sign out (and to sign in under the other name).
    const g = r ? null : gone_(name, h);
    if (g) { if (g.into) logAnswers_(g.into, p.answers); return json_({ok: false, error: 'gone', into: g.into, log: !!g.into}); }
    // v58 (Codex review #603): the generation the device saved under (acct, sync.js), checked under the lock before
    // anything is logged or written: no account of the name any more, or another generation of it (archived, the name
    // taken again since), and the save is refused as archived (the app stops and says so).
    if (typeof p.acct === 'string' && p.acct) {
      if (!r) return json_({ok: false, error: 'archived'});
      let d = {}; try { d = JSON.parse(readData_(String(sh.getRange(r, 1).getValue()), String(sh.getRange(r, 8).getValue() || '')).json || '{}') || {}; } catch (e) {}
      if (d._acct && d._acct !== p.acct) return json_({ok: false, error: 'archived'});
    }
    // Caps (v12): at most 40 new accounts and 3000 answers per name every 6 hours; over that, nothing is written and the
    // app keeps its answers to send later. A real class of RAs stays far below both.
    if (!r && over_('newacct', 40)) return json_({ok: false, error: 'busy'});
    // Only the answers the sheet does not have yet count (v24): a resend after a lost reply uses up nothing.
    const f = freshAnswers_(p.answers);
    if (f.fresh.length && over_('n:' + name.toLowerCase(), 3000, f.fresh.length)) return json_({ok: false, error: 'busy'});
    // The first send after signing in carries the device's anonymous id: its anonymous answers become this name's, for an
    // existing account (code checked above) as for a new one (before logAnswers_, which skips the resent ids).
    if (/^[a-z0-9]{8,16}$/.test(String(p.anon || ''))) {
      relabel_('Answers', 1, '~anon ' + p.anon, name);
      pagesMove_('~anon ' + p.anon, name);  // v30: the sheets opened on the device go with its answers (Codex review #423)
      dropRows_(RPL.TAB, '~anon ' + p.anon);  // v55: the device's full replay record goes too (its answers are the name's now)
    }
    logAnswers_(name, f.fresh, f.seen);
    if (!p.av) oldApp_('save', name);  // after the code check (Codex review #373)
    const saved = r ? readData_(name, String(sh.getRange(r, 8).getValue() || '')) : {json: '{}', rev: 0}, rev = saved.rev;
    if (typeof p.at === 'number' && p.at !== rev) return json_({ok: false, error: 'stale', log: true, rev: rev});
    // v34: the keys of a subject the saving app does not know (an app from before fish) are kept from the saved copy
    // (core.js keepSubjectKeys): replacing the record would erase that progress.
    let old = {}; try { old = JSON.parse(saved.json || '{}') || {}; } catch (e) {}
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
    // One row per RA, one column per genus, coloured by status: the class at a glance.
    const genera = Object.keys(s.genera || {});
    if (genera.length) {
      const g = sheet_('By genus'), head = ['Name', 'Learned'].concat(genera.map(safe_));
      g.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); g.setFrozenRows(1); g.setFrozenColumns(2);
      const gr = find_(g, name) || g.getLastRow() + 1;
      g.getRange(gr, 1, 1, head.length).setValues([[safe_(name), (s.learned || 0) + '/' + (s.total || 0)].concat(genera.map(n => LABELS[s.genera[n]] || ''))])
        .setBackgrounds([['#ffffff', '#ffffff'].concat(genera.map(n => COLORS[s.genera[n]] || '#ffffff'))]);
    }
    out = {ok: true, log: true, rev: rev + 1, acct: kept._acct};  // v58: the generation, known to the creating device at once (Codex review #603)
  } finally { lock.releaseLock(); }
  // v50: what the reply adds is read once the progress is written and the script lock released (it was computed under
  // it, so every other save, anonymous send and event batch waited for this player's replay; some waited past the lock's
  // timeout, and those failed). The answers this save logged are in the tab by now.
  // The hold over every answer now logged, in time order (Codex review #370: a device that sent answers older than
  // another device's must not keep the order it replayed them in): the app takes it after a send.
  try { out.groups = groupsOf_(name); } catch (err) {}  // v48, as the load reply
  try { const o = hold_(name, resetOf_(p.data), p.pt); out.hold = o.h; out.holdIds = o.ids; } catch (err) {}
  // v28: the full replay, over every answer now logged (replay_), under the script lock of its own as a load's (doGet_):
  // not had in time, the reply goes without it and the app asks again at its next sync.
  const lock2 = LockService.getScriptLock();
  if (lock2.tryLock(10000)) try { const rp = replay_(name, resetOf_(p.data), typeof p.rv === 'number' ? p.rv : NaN, p.pt, startOf_(p.data)); if (rp) out.replay = rp; } catch (err) {} finally { lock2.releaseLock(); }
  return json_(out);
}

// Appends new answers to the Answers tab, skipping ids already anywhere in it (a resend after a lost reply).
// The answers of a send the Answers tab does not have yet (by id): what the flood caps count (v24, Codex review #372: a
// device sending again what it already sent must not use up its quota). The ids read once are handed to logAnswers_.
function freshAnswers_(answers){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), n = sh ? sh.getLastRow() - 1 : 0;
  const seen = new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
  return {seen: seen, fresh: (Array.isArray(answers) ? answers : []).filter(a => a && a.id && !seen.has(String(a.id)))};
}
function logAnswers_(name, answers, seen0){
  if (!Array.isArray(answers) || !answers.length) return;
  const sh = sheet_('Answers', LOG);
  // The new columns first (v60): the header check below reads the last one, which a tab made before has not.
  if (sh.getMaxColumns && sh.getMaxColumns() < LOG.length) sh.insertColumnsAfter(sh.getMaxColumns(), LOG.length - sh.getMaxColumns());
  if (sh.getRange(1, LOG.length).getValue() !== LOG[LOG.length - 1]) sh.getRange(1, 1, 1, LOG.length).setValues([LOG]).setFontWeight('bold');  // tab made before v5 (or v10, v23: the new columns get their header)
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Activity')) sheet_('Activity').getRange(1, 1).setFormula(ACTIVITY);
  const n = sh.getLastRow() - 1;
  const seen = seen0 || new Set(n > 0 ? sh.getRange(2, 8, n, 1).getValues().map(r => String(r[0])) : []);
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
      sj, rank(a, sj), word_(a.tn, TX, 80), word_(a.ta, TX, 80), word_(a.sp, SP, 300), scoring_(a.sc)]; });
  if (!rows.length) return;
  const at = sh.getLastRow() + 1, extra = at + rows.length - 1 - sh.getMaxRows();
  if (extra > 0) sh.insertRowsAfter(sh.getMaxRows(), extra);  // getRange can't reach past the grid
  sh.getRange(at, 1, rows.length, LOG.length).setValues(rows);
  dropHold_(name);
}
const num_ = x => typeof x === 'number' && isFinite(x) ? x : '';
// v23: seconds to answer, 0-600 to the tenth (blank when the app sent none: before v23, or photos never loaded); and a
// 0/1 flag (blank when not sent).
const secs_ = x => typeof x === 'number' && isFinite(x) ? Math.round(Math.max(0, Math.min(600, x)) * 10) / 10 : '';
const flag_ = x => x === 1 || x === true ? 1 : x === 0 || x === false ? 0 : '';
// v44: the device's UTC offset when the answer was given, in whole minutes east of UTC (-720 to +840 exist; blank when
// the app sent none or something else), logged only: the time of day at home for the analyses (Pierre, 2026-11-04).
const tz_ = x => Number.isInteger(x) && Math.abs(x) <= 840 ? x : '';
// v59: a typed answer's raw text, control characters out, trimmed, at most 40 characters, never read as a formula (safe_).
const typed_ = x => typeof x === 'string' ? safe_(x.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40)) : '';
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
function startOf_(data){
  try { const o = JSON.parse((data || {})['reefid-sync-coral-start'] || 'null'); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
}
function resetOf_(data){
  try { return resetAt_(JSON.parse(dataKey_(data, 'reset') || '""')); } catch (e) { return 0; }
}
// A progress reset time as the app keeps it (an ISO string) in ms, 0 when there is none.
const resetAt_ = t => typeof t === 'string' && t ? new Date(t).getTime() || 0 : 0;
// Returns {h, ids}: ids = the answer ids of the player's last HOLD.IDS rows counted, so the app does not add again the
// answers of a send whose reply was lost (they are already in h; Codex review #370), and every row from pt on (the time
// of the oldest answer the device still queues, as replay_ reads it: a lost reply can leave up to 2,000 answers already
// logged in the queue; Codex review #399). The cache keeps the last HOLD.IDS and the time of the first of them (t): a
// pt before it reads the rows again.
function hold_(name, since, pt){
  const c = CacheService.getScriptCache(), k = holdKey_(name), hit = c.get(k),
    from = typeof pt === 'number' && isFinite(pt) ? pt - 1000 : Infinity;
  // v50 (Codex review #565): the cached hold is used only while the Answers tab has as many rows as when it was read
  // (n): a request that read the tab before another logged answers must not keep its older hold in the cache.
  const tab = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), nAll = tab ? tab.getLastRow() : 0;
  if (hit) { const o = JSON.parse(hit); if (o.s === since && o.ids && typeof o.t === 'number' && from > o.t && o.n === nAll) return {h: o.h, ids: o.ids}; }
  const who = lc_(name), all = answerRows_(), nRead = ROWS_LAST_ || nAll;  // v60: the tab's rows as read, every subject's
  let h = 0;
  const rows = all
    .filter(r => lc_(r[0]) === who && !/\|w(\||$)/.test(String(r[5])))
    .map(r => [new Date(r[1]).getTime() || 0, Number(r[4]) ? 1 : 0, Number(r[8]) || 0, String(r[7])])
    .filter(r => r[0] > since)
    .sort((a, b) => a[0] - b[0]);  // stable: answers logged with the same time keep the sheet's order
  rows.forEach(([, ok, e]) => { h = Math.max(0, Math.round((h + e - ok - HOLD.SLACK) * 1000) / 1000); });
  const last = rows.slice(-HOLD.IDS), ids = rows.filter((r, i) => i >= rows.length - HOLD.IDS || r[0] >= from).map(r => r[3]);
  try { c.put(k, JSON.stringify({s: since, h: h, ids: last.map(r => r[3]), t: last.length ? last[0][0] : 0, n: nRead}), 21600); } catch (e) {}
  return {h: h, ids: ids};
}

// The Answers tab read once per request (every LOG column; v32: Seconds and Enlarged, M-N, for the replay; v60: the
// Subject column, R; v61: Scoring, W): hold_, replay_, stats_ and the admin's replays go through it. Only the rows of the subject the
// sheet replays (core.js SUBJECTS replay: the corals; a row with no subject, logged before v60, is one): a fish answer
// rates no photo and counts in no confusion, hold or replay. Dropped whenever answers are logged or moved (dropHold_),
// and at the start of each request.
let ROWS_ = null, ROWS_LAST_ = 0;  // ROWS_LAST_: the tab's last row when ROWS_ was read (hold_ keys its cache by it)
const SUBJ_COL = LOG.indexOf('Subject');  // 17, core.js LOG_SUBJ: the same index in readAnswers rows
const replayed_ = r => CORE_.rowSubject(r) === CORE_.replaySubject();
function answerRows_(){
  if (ROWS_) return ROWS_;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers');
  ROWS_LAST_ = sh ? sh.getLastRow() : 0;
  return ROWS_ = sh ? logRows_(sh, LOG.length).filter(replayed_) : [];
}
// The Answers tab's rows (from row 2), its first k columns. A tab made before the columns of v60 has fewer until the next
// answer is logged (logAnswers_ adds them): what it lacks reads blank, so a reader never asks past the sheet's grid.
function logRows_(sh, k){
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const w = sh.getMaxColumns ? Math.min(k, sh.getMaxColumns()) : k, v = sh.getRange(2, 1, n, w).getValues();
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
function replay_(key, since, appRv, pt, start){
  if (typeof appRv !== 'number' || !isFinite(appRv) || appRv >= CORE_.RV) return null;
  const who = lc_(key), mine = answerRows_().filter(r => lc_(r[0]) === who && (new Date(r[1]).getTime() || 0) > since);
  const rows = mine.map(r => rowOf_(who, r)), n = rows.length;
  const byTime = mine.map(r => [new Date(r[1]).getTime() || 0, String(r[7])]).sort((a, b) => a[0] - b[0]);
  const from = typeof pt === 'number' && isFinite(pt) ? pt - 1000 : Infinity;
  const ids = byTime.filter((r, i) => i >= byTime.length - HOLD.IDS || r[0] >= from).map(r => r[1]);
  // The cache's identity: the reset time, and the fingerprint of the first-launch history the replay applies (a replay
  // made with another history is not reused; Codex review #428). Without a history: the reset time alone, as before.
  const fp = CORE_.startFp(start), sinceKey = fp ? since + '#' + fp : String(since);
  const sh = sheet_(RPL.TAB, RPL.HEAD), at = find_(sh, key);
  if (at) {
    const row = sh.getRange(at, 1, 1, sh.getLastColumn()).getValues()[0];
    if (Number(row[1]) === CORE_.RV && Number(row[2]) === n && String(row[3]) === sinceKey) {
      try { return {rv: CORE_.RV, n: n, rec: JSON.parse(row.slice(5).map(String).join('') || '{}'), ids: ids, fp: fp}; } catch (e) {}
    }
  }
  const gen = gen_();
  if (!gen) return null;
  const st = stats_(), rep = CORE_.replayProgress(rows, {gen: gen, mem: st.mem, conf: st.conf, starts: start ? {[who]: start} : {}})[who], rec = rep ? rep.P : {};
  const json = JSON.stringify(rec), parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(safe_(json.slice(i, i + CHUNK)));
  const r = at || sh.getLastRow() + 1, old = at ? sh.getLastColumn() : 0, out = [safe_(key), CORE_.RV, n, fp ? sinceKey : since, new Date()].concat(parts);
  while (out.length < old) out.push('');  // chunks left over from a longer record
  sh.getRange(r, 1, 1, out.length).setValues([out]);
  return {rv: CORE_.RV, n: n, rec: rec, ids: ids, fp: fp};  // fp: the first-launch history it applied (the app checks it)
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
  const salt = anonSalt_(), ids = {}, id = n => ids[n] = ids[n] || aid_(n, salt), arch = archivedSet_();
  // me: the caller's own id, only with its name and right code (the admin page marks "you").
  const {name, pin} = clean_(q || {});
  if (name && /^\d{4}$/.test(pin) && ra && !blocked_(name)) { const r = find_(ra, name); if (r && ra.getRange(r, 7).getValue() === hash_(name, pin)) out.me = id(name); else if (r) failed_(name); }
  const big = {}; const dt = ss.getSheetByName(DATA_TAB);
  if (dt && dt.getLastRow() > 1) dt.getRange(2, 1, dt.getLastRow() - 1, dt.getLastColumn()).getValues().forEach(r => { big[String(r[0]).toLowerCase()] = r.slice(2).map(String).join(''); });
  if (sh && sh.getLastRow() > 1) out.rows = logRows_(sh, LOG.length).filter(r => r[0])
    .map(r => { const sj = CORE_.rowSubject(r); return [id(r[0]), new Date(r[1]).getTime() || 0, String(r[2]), String(r[3]), Number(r[4]) ? 1 : 0, String(r[5]), String(r[6])]
      .concat([8, 9, 10].map(i => r[i] === '' ? null : Number(r[i])), [String(r[11] || ''), anonFlag_(r[0], arch)],
        [12, 13, 14].map(i => r[i] === '' || r[i] == null ? null : Number(r[i])), [String(r[15] || ''), r[16] === '' || r[16] == null ? null : Number(r[16])],
        [sj, String(r[18] || '') || (CORE_.SUBJECTS.find(S => S.id === sj) || {}).rank || '', String(r[19] || ''), String(r[20] || ''), String(r[21] || '')], [CORE_.scoreRec(r[SC_COL])]); });
  if (ra && ra.getLastRow() > 1) ra.getRange(2, 1, ra.getLastRow() - 1, 8).getValues().filter(r => r[0] && !arch.has(lc_(r[0])))  // v58: no archive
    .forEach(r => out.players[id(r[0])] = [Number(r[2]) || 0, Number(r[3]) || 0, Number(r[4]) || 0, abilities_(big[String(r[0]).toLowerCase()] || r[7])]);
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
function trusted_(rows){  // rows: [who, right 0|1, mode, anonymous, choices]
  const T = {}, out = {};
  rows.forEach(([w, ok, m, an, ch]) => { const t = T[w] = T[w] || [0, 0, 0, 0, an], g = guess_(m, ch); t[0]++; t[1] += ok; t[2] += g; t[3] += g * (1 - g); });
  Object.keys(T).forEach(w => { const t = T[w]; out[w] = t[0] >= TRUST.N && (t[1] - t[2]) / Math.sqrt(t[3]) >= TRUST.Z; });
  return out;
}
function stats_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('stats15');
  if (hit) return JSON.parse(hit);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Answers'), out = {ok: true, photos: {}, ras: {}, conf: {}, mem: MEM.PRIOR.slice(), memn: [0, 0, 0, 0], gd: {}};
  if (!sh || sh.getLastRow() < 2) return out;
  const rows = answerRows_().filter(r => r[0]).sort((a, b) => new Date(a[1]) - new Date(b[1]));
  const P = {}, PG = {}, G = {}, R = {}, H = {}, sig = x => 1 / (1 + Math.exp(-x));
  const mem = MEM.PRIOR.slice(), I = [0, 0, 0, 0], N = [0, 0, 0, 0], tau = MEM.N * infoAt_(1, 4);
  // One player whatever the capitalisation of the name (find_ and hash_ match names case-blind; aid_ lowercases too).
  const trust = trusted_(rows.map(r => [lc_(r[0]), Number(r[4]) ? 1 : 0, String(r[5]), lc_(r[0]).indexOf('~anon ') === 0, String(r[11] || '')]));
  rows.forEach(r => {
    const who = lc_(r[0]), ok = Number(r[4]) ? 1 : 0, mode = String(r[5]), fs = String(r[6]).split(/\s+/).filter(Boolean);
    const sg = String(r[2]), sa = String(r[3]);
    if (trust[who]) String(r[11] || '').split(/\s+/).filter(x => x && x !== sg).forEach(x => { const k = sg < x ? sg + '|' + x : x + '|' + sg, c = out.conf[k] = out.conf[k] || [0, 0]; c[0]++; if (!ok && sa === x) c[1]++; });
    if (!fs.length) return;
    const g = guess_(mode, r[11]), ra = R[who] = R[who] || [PLAYER0, 0];
    const gs = String(r[2] || ''), go = G[gs] = G[gs] || [0, 0];  // v31: the genus offset, shared by the photos of the genus
    const ph = fs.map(f => (PG[f] = gs, P[f] = P[f] || [0, 0, 0, 0])), b = go[0] + ph.reduce((t, p) => t + p[0], 0) / ph.length + (ph.length === 1 ? 0.5 : 0);  // one view alone is harder (app.js PICKD.SINGLE)
    // One expectation for the photos and the player, with the player's memory of these photos (v26).
    const hs = fs.map(f => H[who + '|' + f] = H[who + '|' + f] || [0, 0]);
    const s = sig(ra[0] - b - memFam_(hs, mem)), e = g + (1 - g) * s, d = ok - e, n = ra[1];
    // The photos and the memory offsets move on trusted players' answers, weighed by their experience.
    if (trust[who]) {
      const w = n / (n + PHOTO_W.N), D = (1 - g) * s * (1 - s), v = Math.max(1e-6, e * (1 - e)), A = [0, 0, 0, 0];
      // Counts are weighed too: they damp later steps and tell the app how sure the rating is (photoDiff).
      ph.forEach(p => { p[0] -= 0.8 / (1 + p[2] / 10) / ph.length * d * w; p[2] += w; p[1] += ok * w; p[3]++; });
      go[0] -= GENUS_K / (1 + go[1] / 10) * d * w; go[1] += w;
      hs.forEach(h => A[memBucket_(h)] += 1 / hs.length);
      for (let j = 1; j < 4; j++) if (A[j]) { I[j] += w * (D * A[j]) ** 2 / v; mem[j] -= w * d * D * A[j] / v / (tau + I[j]); N[j] += A[j]; }
      N[0] += A[0];
    }
    ra[0] += 0.6 / (1 + n / 40) * d; ra[1]++;
    hs.forEach(h => { h[0]++; h[1] += ok; });
  });
  // [difficulty, weighed answers, weighed right, answers]: the 4th (v18) is the plain count of the answers that rated the
  // photo, for the admin's filters (Pierre, 2026-11-02: a photo answered once weighs under 1 and "≥1" hid it).
  // v31: the difficulty served is the photo's total, its genus's offset + its residual; gd the offsets.
  Object.keys(P).forEach(f => out.photos[f] = [Math.round((G[PG[f]][0] + P[f][0]) * 100) / 100, Math.round(P[f][2] * 10) / 10, Math.round(P[f][1] * 10) / 10, P[f][3]]);
  Object.keys(G).forEach(n => out.gd[n] = [Math.round(G[n][0] * 100) / 100, Math.round(G[n][1] * 10) / 10]);
  const salt = anonSalt_();
  // v55: the answers a deleted account left ("~deleted <id>") rate the photos, never a player: no ability for them.
  const arch = archivedSet_();  // v58: an archive's answers rate the photos, never a player either
  Object.keys(R).forEach(n => { if (n.indexOf('~deleted ') !== 0 && !arch.has(n)) out.ras[aid_(n, salt)] = [Math.round(R[n][0] * 100) / 100, R[n][1]]; });
  out.mem = mem.map(x => Math.round(x * 100) / 100);
  out.memn = N.map(x => Math.round(x * 10) / 10);
  try { cache.put('stats15', JSON.stringify(out), 600); } catch (err) {}  // too big for the cache: computed each time
  return out;
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
// POST {analysesGet: 1, token, head: 1} -> {ok, answers: rows in Answers, stored: {answers, made, av, size, at} | null};
// without head, also report: the stored JSON text. POST {analysesPut: 1, token, report: JSON text} -> {ok, stored}:
// replaces the whole report (Analyses tab: row 2 its meta, then 45,000-character parts; 2.5 MB at most). Admin token only.
const AN_TAB = 'Analyses', AN_MAX = 2500000;
// v55: when an account last left normal operation (deleted, merged or archived): the Script Property ROSTER_AT set by
// rosterChanged_, or the newest row of the Removed tab (an account removed before v55).
function rosterAt_(){
  let t = Number(PropertiesService.getScriptProperties().getProperty('ROSTER_AT') || 0) || 0;
  const rm = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Removed');
  if (rm && rm.getLastRow() > 1) rm.getRange(2, 4, rm.getLastRow() - 1, 1).getValues().forEach(r => { t = Math.max(t, new Date(r[0]).getTime() || 0); });
  return t;
}
// v55: after a delete, merge or archive: the caches that still hold the account (the public leaderboard board14, the
// achievement shares achs15, the photo stats and abilities stats15) are dropped, and the Analyses report marked stale.
function rosterChanged_(){
  ['board14', 'achs15', 'stats15'].forEach(k => { try { CacheService.getScriptCache().remove(k); } catch (e) {} });
  try { PropertiesService.getScriptProperties().setProperty('ROSTER_AT', String(Date.now())); } catch (e) {}
}
function analyses_(p){
  if (!isAdmin_(String(p.token || ''))) return {ok: false, error: 'token'};
  const ss = SpreadsheetApp.getActiveSpreadsheet(), a = ss.getSheetByName('Answers'), answers = a ? Math.max(0, a.getLastRow() - 1) : 0;
  const sh = ss.getSheetByName(AN_TAB), n = sh ? sh.getLastRow() : 0;
  const metaOf = () => { try { return n >= 2 ? JSON.parse(String(sh.getRange(2, 2).getValue() || 'null')) : null; } catch (e) { return null; } };
  if (p.analysesGet) {
    const out = {ok: true, answers: answers, stored: metaOf()};
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
  const meta = {answers: Number(rep.answers) || 0, made: Number(rep.made) || 0, av: Number(rep.AV) || 0, size: text.length, at: Date.now(), roster: typeof p.roster === 'number' && isFinite(p.roster) ? p.roster : null};
  const rows = [['meta', JSON.stringify(meta)]];
  for (let i = 0; i < text.length; i += CHUNK) rows.push(['part ' + (rows.length), safe_(text.slice(i, i + CHUNK))]);
  const lock = lock_();
  try {
    const t = sheet_(AN_TAB, ['Part', 'Data']), old = t.getLastRow();
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
const EVK = {err: 1, photo: 1, sync: 1, pulse: 1, load: 1, pages: 1};
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
          : x.k === 'pages' ? JSON.stringify(CORE_.pagesClean(x)) : '';
      return [new Date(x.t || Date.now()), dev, x.k, text_(x.k === 'pulse' ? x.r : x.k === 'photo' ? x.f : x.k === 'load' ? word_(x.pop, /^[a-zA-Z0-9, -]*$/, 60) : x.k === 'pages' ? who : x.msg, 300), text_(x.src, 160), text_(x.pg, 80), det, text_(x.av, 20), text_(x.ua, 40), String(x.id)];
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

// Progress % of a saved progress over a list of genera: a copy of core.js pctOf (keep the two in step; tests/sync.test.js
// compares them). Per genus (v22): the moving average s.pg fills 95% on its way to 0.8 (the mastery exam's entry), each
// mastery-exam question passed adds 1%, a passed exam (mx) makes it 100%; progress saved before s.pg replays its last
// 10 results (h) from 0, a right answer weighed 0.67, a miss in full (core.js PROG, pgOf).
function pctOf_(P, list){
  const A = 0.15, M = 0.8, OLD = 0.67;
  const pg = s => { if (typeof s.pg === 'number') return s.pg;
    const g = String(s.h || '').split('').reduce((x, c) => x + A * (c === '1' ? OLD : 1) * ((c === '1' ? 1 : 0) - x), 0);
    return s.mx ? Math.max(g, M) : g; };
  const score = s => { if (!s) return 0; if (s.mx) return 1; const g = pg(s);
    return 0.95 * Math.min(1, g / M) + (g >= M && s.ex ? 0.05 * Math.min(4, s.ex.k || 0) / 5 : 0); }; // never 100% before the exam is passed (core.js scoreOf)
  return list && list.length ? Math.round(100 * list.reduce((t, n) => t + score((P || {})[n]), 0) / list.length) : 0;
}
const ELO_MIN = 200;
// Public leaderboard (v14; Pierre, 2026-11-01: "a small leaderboard to keep a little competition going"): GET ?board=1 →
// {ok, rows: [[name, progress %, level]]}, every signed-in player with answers who did not opt out (Board 0), ranked by
// progress then level, so players at 100% still rank by skill. Level (v63; Pierre, 2026-11-06, Q134: one player level
// shown everywhere) = the app's own global level, the th of the '~level' record in the player's saved progress (core.js
// LEVEL: the number the app shows in My progress), from ELO_MIN answers of that record (ok + ko); before v63 it was
// stats_'s separate chain R, which now stays inside stats_ as the photo Elo's player term (ras: admin only). Names are
// public here by design: the app says so and lets each player opt out in its settings (privacy.html). Nothing else of
// the player leaves the sheet. Cached 5 minutes.
function board_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('board14');
  if (hit) return JSON.parse(hit);
  const ra = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RAs'), out = {ok: true, rows: []};
  if (ra && ra.getLastRow() > 1) {
    // v16: the % from the saved progress, over the genera of the list (the "By genus" tab's columns, written from each
    // sync's summary), with the app's formula (pctOf_); the app-sent Progress column only when that can't be read.
    const bg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('By genus'),
      list = bg && bg.getLastColumn() > 2 ? bg.getRange(1, 3, 1, bg.getLastColumn() - 2).getValues()[0].map(String).filter(Boolean) : [];
    const progOf = r => { try { const P = JSON.parse(dataKey_(JSON.parse(readData_(String(r[0]), String(r[7] || '')).json || '{}'), 'progress') || '{}'); return P && typeof P === 'object' ? P : null; } catch (e) { return null; } };
    // v63: the level the app shows (progress.js eloLine): '~level'.th as saved (the app's eloScore rounds the Elo, so
    // every device reads the same number), once its record counts ELO_MIN answers, else null.
    const n_ = s => s && typeof s === 'object' ? (Number(s.ok) || 0) + (Number(s.ko) || 0) : 0;
    const levelOf = P => { const L = P && P['~level']; return L && typeof L.th === 'number' && isFinite(L.th) && n_(L) >= ELO_MIN ? L.th : null; };
    // A player with answers is listed before the level shows, at 0% too (Codex review #639): any record of the saved
    // progress with answers.
    const answered = P => !!P && Object.keys(P).some(k => n_(P[k]) > 0);
    out.rows = ra.getRange(2, 1, ra.getLastRow() - 1, HEAD.length).getValues()
      .filter(r => r[0] && !(r[9] !== '' && Number(r[9]) <= 0))  // 0 the player's opt-out, -1 hidden by an admin (v20)
      // Progress saved before v14 (blank): learned / total until the player's next sync writes it.
      // Level only from ELO_MIN answers (v15, Pierre: "even 50 is not enough to settle the score"): null before.
      .map(r => { const P = progOf(r), lv = levelOf(P), own = P && list.length ? pctOf_(P, list) : null, pct = own != null ? own : r[8] === '' ? (Number(r[4]) ? Math.round(100 * Number(r[2]) / Number(r[4])) : null) : Number(r[8]);
        return lv != null || pct || answered(P) ? [String(r[0]), pct, lv] : null; })
      .filter(Boolean)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0) || (b[2] == null ? -99 : b[2]) - (a[2] == null ? -99 : a[2]))
      .slice(0, 200);
  }
  cache.put('board14', JSON.stringify(out), 300);
  return out;
}

// Achievements, as on Steam (v15; Pierre, 2026-11-01): GET ?achs=1 → {ok, n: signed-in players with an achievement
// record, counts: {achievement id: players holding it}}, from each player's saved progress (its reefid-sync-ach key, app.js).
// Counts only, no name. Cached 10 minutes.
function achs_(){
  const cache = CacheService.getScriptCache(), hit = cache.get('achs15');
  if (hit) return JSON.parse(hit);
  const out = {ok: true, n: 0, counts: {}};
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
//     normal operation (v58, was userRename v20); 'exists' when the new name is taken, 'archived' for an archive.
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
  return n;
}
// Renames the name in column `col` of tab `tab` (answers, reports): one write of the whole column.
function relabel_(tab, col, from, into){
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return 0;
  const rg = sh.getRange(2, col, sh.getLastRow() - 1, 1), v = rg.getValues(), k = lc_(from); let n = 0;
  v.forEach(r => { if (lc_(r[0]) === k) { r[0] = safe_(into); n++; } });
  if (n) rg.setValues(v);
  if (n && tab === 'Answers') { dropHold_(from); dropHold_(into); }  // their opening hold (hold_) is computed again
  return n;
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
// name (lower case) -> the groups of a subject still in beta it is in, each once.
function groupMap_(){
  const ok = groupIds_(), m = {};
  groupRows_().forEach(r => { const g = String(r[0]), k = lc_(r[1]); if (k && ok.indexOf(g) >= 0 && (m[k] = m[k] || []).indexOf(g) < 0) m[k].push(g); });
  return m;
}
const groupsOf_ = name => groupMap_()[lc_(name)] || [];
// Adds (on) or removes players of a group: existing players only (RAs tab), each once. Returns how many changed.
function groupSet_(ra, names, g, on){
  const sh = sheet_(GROUPS.TAB, GROUPS.HEAD), rows = groupRows_(), has = k => rows.some(r => String(r[0]) === g && lc_(r[1]) === k);
  let n = 0;
  if (on) {
    const add = [], seen = {};  // v58: live players only, never an archive
    names.forEach(x => { const r = find_(ra, x), k = lc_(x); if (!r || seen[k] || has(k) || archived_(ra.getRange(r, 1, 1, HEAD.length).getValues()[0])) return;  seen[k] = 1; add.push([g, safe_(String(ra.getRange(r, 1).getValue())), new Date()]); });
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, GROUPS.HEAD.length).setValues(add);
    return add.length;
  }
  const out = {}; names.forEach(x => (out[lc_(x)] = 1));
  for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][0]) === g && out[lc_(rows[i][1])]) { sh.deleteRow(i + 2); n++; }
  return n;
}
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
  const answers = all ? dropRows_('Answers', name) : relabel_('Answers', 1, name, del);
  const reports = all ? dropRows_('Reports', name, 2) : anonReports_(name, del);
  pagesDrop_(new Set([aid_(name)]));
  ['RAs', DATA_TAB, 'By genus', RPL.TAB].forEach(t => dropRows_(t, name));
  dropRows_(GROUPS.TAB, name, 2);  // v48: out of every beta group
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
      CacheService.getScriptCache().remove('board14');
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
      Object.keys(hit).forEach(w => hit[w] && dropRows_(RPL.TAB, w));  // v55: their full replay records too
      // v30: their sheets opened too (ids are the admin's, as the Pages tab keeps them); never a named player's.
      const named = new Set(ss.getSheetByName('RAs') && ra.getLastRow() > 1 ? ra.getRange(2, 1, ra.getLastRow() - 1, 1).getValues().map(r => aid_(String(r[0]), salt)) : []);
      pagesDrop_(new Set([...ids].filter(x => !named.has(x))));
      try { CacheService.getScriptCache().remove('stats15'); } catch (e) {}
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
        if (archived_(a.v)) return {ok: false, error: 'archived'};
        if (row_(into)) return {ok: false, error: 'exists'};
        const from = String(a.v[0]);
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
        dropRows_(RPL.TAB, from);  // the replay (v28) is made again under the new name when asked
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
      // The merged progress is no replay of both logs (core.js mergeUsers drops it too): no rules version, so the
      // account's devices ask for the replay of the whole merged history (replay_).
      delete m.data['reefid-sync-coral-rv'];
      delete m.data['imr-coral-rv'];  // rename-app: keep (its name before the rename to IMR Reef ID, v33)
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
      ['RAs', DATA_TAB, 'By genus', RPL.TAB].forEach(t => dropRows_(t, from));
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
  const out = {ok: true, users: [], removed: [], archived: []}, by = {}, dcol = {}, salt = anonSalt_(), arch = {};
  liveRows_(false).forEach(r => { const a = {name: String(r[0]), id: aid_(String(r[0]), salt), time: new Date(r[1]).getTime() || 0, answers: 0, reports: 0}; out.archived.push(a); arch[lc_(a.name)] = a; });
  liveRows_().forEach(r => {
    const u = {name: String(r[0]), id: aid_(String(r[0]), salt), updated: new Date(r[1]).getTime() || 0, learned: Number(r[2]) || 0, seen: Number(r[3]) || 0, total: Number(r[4]) || 0,
      review: String(r[5] || ''), board: r[9] === '' ? 1 : Number(r[9]), answers: 0, right: 0, first: 0, last: 0, days: 0, modes: {}, recent: [0, 0], mix: [], reports: 0, size: String(r[7] || '').length};
    out.users.push(u); by[lc_(u.name)] = u; dcol[lc_(u.name)] = String(r[7] || '');
  });
  // v60: the replayed subject's answers (the corals'), as before fish answers were logged: its mix-ups name its genera.
  const an = ss.getSheetByName('Answers'), days = {}, mixes = {}, last50 = {};
  if (an && an.getLastRow() > 1) logRows_(an, SUBJ_COL + 1).filter(replayed_).forEach(r => {
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
  const rp = ss.getSheetByName('Reports');
  if (rp && rp.getLastRow() > 1) rp.getRange(2, 2, rp.getLastRow() - 1, 1).getValues().forEach(r => { const u = by[lc_(r[0])] || arch[lc_(r[0])]; if (u) u.reports++; });
  const rm = ss.getSheetByName('Removed');
  if (rm && rm.getLastRow() > 1) out.removed = rm.getRange(2, 1, rm.getLastRow() - 1, 4).getValues().filter(r => r[0]).map(r => ({name: String(r[0]), into: String(r[2] || ''), time: new Date(r[3]).getTime() || 0})).reverse();
  // v48: the beta groups each player is in.
  const gm = groupMap_();
  out.users.forEach(u => (u.groups = gm[lc_(u.name)] || []));
  replayedAll_(out.users, dcol);
  return out;
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
  const ss = SpreadsheetApp.getActiveSpreadsheet(), st = stats_(), big = {}, mine = {}, cached = {};
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
      const rep = CORE_.replayProgress(rows, {gen: gen, mem: st.mem, conf: st.conf, starts: start ? {[k]: start} : {}})[k];
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
function autoUpdate(){
  const log = m => sheet_('Deploy log', ['Time', 'Event']).appendRow([new Date(), String(m).slice(0, 500)]);
  try {
    const get = f => UrlFetchApp.fetch(SELF_RAW + f + '?t=' + Date.now(), {muteHttpExceptions: true});
    const src = get('Code.gs'); if (src.getResponseCode() !== 200) return 'github ' + src.getResponseCode();
    const code = src.getContentText(), m = /const VERSION = (\d+);/.exec(code), v = m ? Number(m[1]) : 0;
    // AUTO_PENDING: a version whose code is already in place but whose deployment did not finish (a failed /versions or
    // /deployments call). The code running now is then that version, so it must finish the deployment, not skip it.
    const props = PropertiesService.getScriptProperties(), pending = Number(props.getProperty('AUTO_PENDING') || 0);
    if (v <= VERSION && !pending) { once_(log); return 'up to date (v' + VERSION + ')'; }
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
    const rm = ss.getSheetByName('Removed'), gone = {};
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
    if (an && an.getLastRow() > 1 && an.getLastColumn() >= LOG.length - 1) {
      const n = an.getLastRow() - 1, v = an.getRange(2, 1, n, LOG.length).getValues(), cols = ['Genus shown', 'Answered', 'Mode', 'Choices', 'Taxon shown', 'Taxon answered'];
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
function once_(log){
  const props = PropertiesService.getScriptProperties();
  Object.keys(ONCE_).forEach(k => {
    if (props.getProperty('ONCE_' + k)) return;
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try { const m = ONCE_[k](); props.setProperty('ONCE_' + k, String(Date.now())); log('one-shot ' + k + ' (v' + VERSION + '): ' + m); }
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
    logAnswers_('~anon ' + id, f.fresh, f.seen);
    // v28: a device that never signed in gets its full replay too, under its anonymous id (replay_), when its app
    // applied an older rules version.
    const out = {ok: true, log: true};
    // Only the answers after the device's progress reset (p.reset, as resetOf_ reads a signed-in player's; Codex review #399).
    try { const rp = replay_('~anon ' + id, resetAt_(p.reset), typeof p.rv === 'number' ? p.rv : NaN, p.pt, p.start && typeof p.start === 'object' ? p.start : null); if (rp) out.replay = rp; } catch (err) {}
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
  //   beta    a subject still in beta: {kick, line}, Home's Learn door top line and description once it is chosen (line:
  //           HTML), and a "beta" tag on its buttons. The label only: who sees the subject is open
  //   open    who the subject opens to (subjGroup): 'all' (the default, the corals: every player, signed out included) or
  //           'group' (the admin and the players of its group, picked in the admin's Players: app.js subjOpen, sheet v48
  //           Code.gs groupIds_). Opening fish to everyone is this one field (docs/ARCHITECTURE.md "Beta")
  //   card    the kind of its first-meeting card (app.js CARD_KINDS: its emoji)
  //   remote  its photos are iNaturalist's, not the site's (the fish stopgap, tools/fish_photos.py): preloaded all the same
  //   views   the views a question may show, [code, label] (one view: one photo per question)
  //   optin   the opt-in sets: Q[k] true = on, Q[k + 'T'] when chosen (app.js UNITS[id].sets: units, card, ⚙ row)
  //   rank    the rank its units are asked at (a unit's own rank, app.js rankOf, wins: a fish scientific genus): logged
  //           with every answer (sheet v60 Answers Rank). Every subject's answers go to the sheet's Answers tab under its
  //           id (Pierre, 2026-11-06: fish answers logged from the first second, at whatever rank was asked)
  //   replay  the sheet computes from its logged answers: photo ratings, confusions, the opening hold, the full replay
  //           of its progress (Code.gs answerRows_ keeps only its rows); the others are logged only, for later
  //   ach, board  achievements and the leaderboard count this subject
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
  //           answer yet, fading with its answers (model.js photoSet: the easy photos favoured at the start, no wall).
  //           The corals keep the defaults (their photos carry no judged ease; early 0: their target as before)
  //   pages   the pages of the Learn and Practice sections it has (app.js MODES; sheet = a genus sheet, page key g-<Genus>); the others,
  //           Identify and the Tools are the corals' for now
  // The fish units renamed (Pierre, 2026-11-06 13:04: the game's units are the book's families, genera and species, not
  // the IMR entries; docs/reviews/2026-11-06-fish-units-plan.md): each old teaching-entry id (t01) and the family that
  // took it over (fish.json families: the family holding most of its species); split: the genera of an entry that went
  // to another family (Diploprion: the Soapfishes, not IMR's Groupers); names: each family's name. Read through the
  // subject (SUBJECTS renamed: renamedId, renameUnits, renameLogEntry), never by name; tests/fishunits.test.js checks it
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
      tiers: true,
      ach: true,
      board: true,
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
          ['world', 'iNat elsewhere', 'World'],
          ['book', 'CF book', 'CF']
        ],
        csrc: ['own', 'dauin', 'ph', 'book']
      }
    },
    {
      id: 'fish',
      dev: 'fish-',
      base: ['fbase', 'fpending'],
      name: 'Fish',
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
        line: '<b>Fish is in beta</b>: the 27 IMR survey families, iNaturalist photos for now. Feedback welcome.'
      },
      // Opens to every player, signed out included, the beta label kept (Pierre, 2026-11-06, Q158: "open fish to everyone
      // now"; it opened to the admin and a beta group picked in the admin's Players from 2026-11-04). 'group' would close
      // it to that group again (the sheet keeps the Groups tab's rows).
      open: 'all',
      views: [['wide', 'Photo']],
      optin: ['c2', 'c3', 'sci'], // sci: the scientific genera (app.js fishGenera, docs/FISH_PATH.md "Levels")
      // family: an IMR entry (the game's family level, Damselfish; two entries may share a scientific family).
      rank: 'family',
      renamed: FISH_RENAMED,
      replay: false,
      ach: false,
      board: false,
      // Reference-level photos first in the draw (Pierre, 2026-11-06: a new entry starts on reference photos, never only
      // them); the judged ease's prior as measured (CALIB.ease).
      calib: {ref: 3, early: 1.5},
      pages: ['genera', 'quiz'],
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
      // fish pages the admin plan has built so far (docs/ROADMAP.md "Admin for every subject"): Candidates (PR 5a,
      // admin-fish.js).
      // origins: no IMR photos for fish (Pierre, 2026-11-04), iNaturalist only: Pierre's own, then by place.
      admin: {
        cur: 'fish',
        pages: ['inbox/todo/reports', 'inbox/todo/errors', 'players/list', 'photos/candidates'],
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
  // early 0, no lean at the start.
  const CALIB = {ease: 0.5, ref: 1, early: 0};
  const calibOf = s => ({...CALIB, ...((s && s.calib) || {})});
  const subjKey = (s, name) => KEYS.SYNC + subjectOf(s).id + '-' + name;
  const subjDev = (s, name) => KEYS.APP + subjectOf(s).dev + name;
  // A subject that opens to a group of players (SUBJECTS open: 'group'), not to everyone: the app, the admin and the sheet
  // keep a group for it (app.js subjOpen, admin.js groupOn, Code.gs groupIds_). Any other value opens it to all.
  const subjGroup = S => !!S && S.open === 'group';
  // The subject whose answers the sheet computes from (SUBJECTS replay: the corals): its replay, hold and photo ratings.
  const replaySubject = () => (SUBJECTS.find(S => S.replay) || SUBJECTS[0]).id;
  // The subject of an answer: the app's log entry (s, from 2026-11-06; an entry without one came from the corals, the
  // only subject logged before), and of an answer-log row, at index LOG_SUBJ in both the sheet's readAnswers rows and
  // its Answers tab rows (sheet v60, column Subject; blank in the rows logged before: the default subject's).
  const LOG_SUBJ = 17;
  // The scoring record (core.js scoreRec; sheet v61, column Scoring, W) at index LOG_SC in the sheet's readAnswers rows,
  // its Answers tab rows and the replay rows (Code.gs rowOf_, logRow) alike.
  const LOG_SC = 22;
  const ansSubject = a => String((a && a.s) || '') || SUBJECTS[0].id;
  const rowSubject = r => String((r && r[LOG_SUBJ]) || '') || SUBJECTS[0].id;
  // The rows (or log entries, entries) of one subject, the replayed one by default: every reader of the answer log that
  // computes a subject's statistics (the analyses, the evaluation tools, the admin) keeps only that subject's rows, so a
  // fish answer never counts in a coral result.
  const subjRows = (rows, id = replaySubject()) => (Array.isArray(rows) ? rows : []).filter(r => r && rowSubject(r) === id);
  const subjEntries = (log, id = replaySubject()) => (Array.isArray(log) ? log : []).filter(a => a && ansSubject(a) === id);
  // A subject's first-launch answer (CHOICE): reefid-sync-<subject>-start, synced with the player's progress.
  const startKey = s => subjKey(s, 'start');
  // An answer's words for a subject (SUBJECTS start): [answer, line], null for an unknown answer.
  const startText = (s, c) => ((subjectOf(s).start || {}).opts || {})[c] || null;

  // Fish (fish.json, built by tools/build_fish.py; ARCHITECTURE.md "Fish content"). Level 1 of the game = the teaching
  // entries of level 1 (the 27 IMR entries of circle 1, then circles 2 and 3), each made into a record the engine reads
  // like a coral genus's (app.js GX): {id, name, fam, look (teaching ids, sub-entries folded into their entry), lk (how to
  // tell each apart, IMR's words), qt (the IMR cues), group (its group in the identification key in force, fish.json
  // key: the index of a reef fish ID book for the Indo-Pacific; rule S3), forms (that group: the wrong choices
  // start in other groups, as coral growth forms), ig (the same group), cm (how common near Dauin), views {wide:
  // photos}, levels 1, circle, wink, names (accepted when typed)}. photos: fish-photos.json "photos" (teaching id -> photo objects).
  // key: the identification key in force ({id, region, cite (full), short}, null for a region with none) and groups its
  // groups in its order ({n, title, pages}).
  // c1 = circle 1 (the slate: counts in the progress), c2 / c3 = the opt-in circles, winks = the wink entries (a
  // surprise card, never a question of the game).
  // first: one of the starter core (fish.json start, Pierre 2026-11-04), opened before the others (model.js openPick).
  // views.wide in easyRank order (below): the easiest, most reference-like photo first, whoever took it; cover: the
  // card's photo (app.js cover), the first of that order (Pierre, 2026-11-06: no source tier any more).
  // sheet: fish-photos.json "sheet" (species id -> photos), the sheet-only photos (Pierre, 2026-11-05: a species with no
  // game photo may keep one for its sheet, never in the quiz or any game, passing the game photo rules all the same;
  // tools/fish_photos.py SHEET).
  // A photo marked use: 'ref' (sheet only, the corals' word) never joins an entry's game photos, wherever it is listed:
  // every game draw reads views.wide (model.js photoSet, app.js fishGenera), so none can show it. The result's sheet
  // holds them by species ({species id: [photo]}), for a species sheet to show (none yet: docs/ARCHITECTURE.md "Fish content").
  const sheetOnly = p => !!p && p.use === 'ref';
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
  const fHash = f => [...String(f)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  // Reference level (Pierre, 2026-11-06 14:02: "reference photos" are every photo of reference quality, whoever took
  // it, not only a source's cover): a reference source's own photo (rep) judged very easy, or any photo judged ease 5
  // with the reference look in its tags (profile, whole, good light, true colours, sharp, large or medium, one fish or a
  // school of it; no juvenile, camouflage or out of water).
  const REF_LOOK = /^p1g0s[lm][1s]$/;
  // In both cases one kind of fish (count 1 or s): never a photo with other kinds (m) or an unclear subject (x), rule P3
  // (Codex review #660).
  const refLevel = p =>
    !!p &&
    /^[1s]$/.test(String(p.jt || '').charAt(6)) &&
    (((p.e || 0) >= 4 && !!p.rep) || (p.e === 5 && REF_LOOK.test(String(p.jt || '').slice(0, 7)) && !/[jca]/.test(String(p.jt).slice(7))));
  const refFirst = p => (refLevel(p) ? 0 : 1);
  function easyRank(L, d = p => -(p.e || 3)) {
    return (L || [])
      .map(p => ({p, t: refFirst(p), d: d(p), r: refScore(p.jt), h: fHash(p.f)}))
      .sort((a, b) => a.t - b.t || a.d - b.d || b.r - a.r || a.h - b.h)
      .map(x => x.p);
  }
  function fishGen(F, photos, sheet) {
    const gen = {},
      sp = new Map((F.species || []).map(s => [s.id, s])),
      start = new Set(F.start || []),
      top = id => String(id).slice(0, 3);
    (F.teach || [])
      .filter(t => t.level === 1)
      .forEach(t => {
        const dauin = (t.species || []).reduce((a, id) => a + (((sp.get(id) || {}).present || {}).dauin || 0), 0);
        gen[t.id] = {
          id: t.id,
          name: t.name,
          fam: t.fam,
          wfam: t.wfam || [],
          fish: 1,
          circle: t.circle,
          group: t.group || 0,
          ig: t.group || 0,
          forms: t.group ? ['g' + t.group] : [],
          look: [...new Set((t.look || []).map(([id]) => top(id)).filter(id => id !== t.id))],
          lk: (t.look || []).map(([id, txt]) => [top(id), txt]),
          lsrc: Object.fromEntries(
            (t.look || []).map(([id]) => [top(id), 'IMR fish presentation' + (t.sl ? ', slide ' + t.sl.join(', ') : '')])
          ),
          qt: t.cues && t.cues.length ? t.cues : null,
          sum: t.why || t.note || '',
          phase: t.phase || [],
          sub: (t.sub || []).map(s => s.name),
          cm: Math.round(Math.sqrt(dauin)),
          levels: 1,
          // nd: one of Pierre's own photos taken outside Dauin (the credit's "Dauin" tag is for his Dauin photos).
          views: {
            wide: easyRank(
              ((photos || {})[t.id] || [])
                .filter(p => p && p.f && p.src && !sheetOnly(p))
                .map(p => (p.own && p.loc && p.loc !== 'dauin' ? {...p, nd: 1} : p))
            )
          },
          ...(start.has(t.id) ? {first: 1} : {}),
          ...(t.wink ? {wink: t.wink, note: t.note || ''} : {}),
          names: fishNames(t),
          ...(fishOften(t).length ? {oft: fishOften(t)} : {})
        };
      });
    Object.values(gen).forEach(g => {
      if (g.views.wide.length) g.cover = g.views.wide[0].f;
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
    Object.entries(game || {}).forEach(([t, L]) => {
      cu[t] = (L || []).filter(p => p && p.f && p.sp && (!F || fishOn(F, p.f, p.sp)) && !X[p.f] && !xid.has(fishPid(p.f)));
      cu[t].forEach(p => cid.add(fishPid(p.f)));
    });
    new Set([...Object.keys(stop || {}), ...Object.keys(cu)]).forEach(t => {
      const C = cu[t] || [],
        obs = new Set(C.map(p => p.o).filter(Boolean));
      const S = ((stop || {})[t] || []).filter(
        p => p && p.f && !gone.has(fishPid(p.f)) && !cid.has(fishPid(p.f)) && !(p.o && obs.has(p.o))
      );
      if (C.filter(p => (p.e || 0) >= FISHPH.EASY).length < FISHPH.MIN) return (out[t] = [...C, ...S]);
      const have = new Set(C.map(genus));
      // The units' reference photos (tools/fish_refs.py, judged at the reference level: from) stay too (Pierre, 2026-11-06:
      // the covers and first photos are reference photos, whoever took them).
      out[t] = [...C, ...S.filter(p => p.from || (genus(p) && !have.has(genus(p))))];
    });
    return out;
  }
  // The names a teaching entry is known by, accepted when typed (Pierre, 2026-11-03, rule S2): its IMR name,
  // the parts of a double one ("Surgeonfish & Unicornfish"), its family as IMR writes it and the WoRMS families, and the
  // sub-entries IMR names inside it (Chromis, Bannerfish...), and the other common names curated for it or a sub-entry
  // (aka: tools/fish_source.json, Tang; often: a name in common use that the answer's feedback corrects gently, Clownfish
  // for Anemonefish, fishOften). The first is the name shown.
  function fishNames(t) {
    const parts = String(t.name || '')
      .split(/\s*&\s*|\s+and\s+/)
      .filter(Boolean);
    return [
      ...new Set([
        t.name,
        ...(parts.length > 1 ? parts : []),
        t.fam,
        ...(t.wfam || []),
        ...(t.aka || []),
        ...(t.often || []),
        ...(t.sub || []).flatMap(s => [s.name, ...(s.aka || []), ...(s.often || [])])
      ])
    ].filter(Boolean);
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
  // family IMR splits: Holocentridae = Soldierfish and Squirrelfish) names both, so it is "which one?" (typeMatchIn near).
  // drop (SUBJECTS typeDrop: 'fish'): a word a name may be typed without (Pierre, 2026-11-06: "trigger", "clown",
  // "damsel"), as its suffix, a separate word or a plural ("Triggerfish", "Trigger fish", "Triggerfishes" -> "Trigger"),
  // its own short form accepted as another name of the entry, unless it is ambiguous in the game: within the spelling
  // tolerance of a name or short form of another entry (then it is left out: typing it is no answer, as before).
  // A name in common use (fishOften: oft) carries oft: [usual name, the name often used], its short forms too.
  function fishTypeNames(gen, drop = '') {
    const out = [],
      add = (k, g, x, i, oft) =>
        k && !out.some(o => o.k === k && o.g === g) && out.push({k, g, old: i ? x : '', alt: i ? 1 : 0, ...(oft ? {oft} : {})}),
      oftOf = (g, k) => (g.oft || []).find(([, o]) => typeNormAll(o) === k);
    Object.values(gen || {}).forEach(g =>
      (g.names || [g.name]).forEach((x, i) => add(typeNormAll(x), g.id, x, i, oftOf(g, typeNormAll(x))))
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
                {k, g: o.g, x: m[1].trim(), oft: o.oft},
                {k: k + 's', g: o.g, x: m[1].trim() + 's', oft: o.oft},
                ...(one ? [{k: one[0], g: o.g, x: one[1].trim(), own: !o.old, oft: o.oft}] : [])
              ]
            : [];
        })
        .flat(),
      near = (a, b) => typeDist(a, b) <= TYPE.tol(Math.min(a.length, b.length));
    short.filter(s => ![...out, ...short].some(o => o.g !== s.g && near(s.k, o.k))).forEach(s => add(s.k, s.g, s.x, s.own ? 0 : 1, s.oft));
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
  // An object keyed by units (a progress record, the first-meeting cards) with its old ids under the new ones, the
  // mix-up and offer maps inside each record too (conf, off). Both present (an old app saved again after the switch):
  // the record with more answers stays (a count map adds up). The object itself when nothing is renamed.
  function renameUnits(S, o) {
    const R = S && S.renamed;
    if (!R || !isObj(o) || !Object.keys(o).some(k => R.ids[k] || isObj(o[k]))) return o;
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
        ['lv', 'run', 'L', 'pg', 'pm', 'rv', 'th', 'lt', 'vr', 'ro', 'ex', 'mx'].forEach(k => {
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
      ['conf', 'off', 'rt'].forEach(f => {
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
      const qa = J(A, qk),
        qb = J(B, qk);
      if (qa || qb) {
        const q = {...(qa || {}), ...(qb || {}), bu: Math.max((qa || {}).bu || 0, (qb || {}).bu || 0)};
        S.optin.forEach(k => {
          if ((qa || {})[k] || (qb || {})[k]) q[k] = true;
        });
        out[qk] = JSON.stringify(q);
      }
      // The rules version the progress was replayed with (sync.js RVK): the merged record is no replay of the two logs
      // together, so it has none, and every device of the account asks for the replay of both histories in time order
      // (the sheet relabels the answers; Codex review #399: the merged model of 20 older right answers and 10 newer misses
      // kept pg 0.96 for good).
      delete out[subjKey(S.id, 'rv')];
    });
    return out;
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
      // (Codex review #367: an old main record let the other account's pg through).
      if (typeof main.pg === 'number' || main.h || typeof main.L === 'number') o.pg = pgOf(main);
      // The photo memory mark goes with that progress (memRecalc): the other account's would leave it uncorrected.
      if (main.pm) o.pm = main.pm;
      else delete o.pm;
      // The level a genus's ability was last stepped against (lt, model.js levelRise) is the old account's: the merged
      // account's level is another, so the level's rise counts again from the genus's next own answer.
      delete o.lt;
      o.ok = (x.ok || 0) + (y.ok || 0);
      o.ko = (x.ko || 0) + (y.ko || 0);
      o.streak = main.streak || 0;
      // Answer times (rt, the global level's) add up like the mix-ups: the same person's.
      ['conf', 'off', 'rt'].forEach(f => {
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
  // How sure a player's level is (Pierre, 2026-11-03: a level from 35 answers at 97% right sat above one from 245):
  // {player id: 95% margin, in level units}, 1.96 / sqrt(Fisher information) gathered on the same replay as the level
  // itself (eloReplay, Code.gs stats_ ras; Codex review #375): an answer that was a near-sure success tells little, so a
  // run of easy right answers keeps the margin wide.
  // A player's right rate in the photo quiz apart from the Duel tab (Pierre, 2026-11-03: a new player's 31 duels on one
  // chosen pair, 2 choices each, made 89% in the quiz read as 95%): per anonymous id, [answers, right] in the quiz (mode
  // quiz or quiz|…, duels slipped into the quiz included), in its last 50, and in the Duel tab (quiz-duel…). Other
  // games are in neither. rows: readAnswers rows [id, t, shown, answered, ok, mode, …].
  function playSplit(rows) {
    const out = {};
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
  function trustOf(rows) {
    const T = {},
      out = {};
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
      R = {},
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
  // (s.pg kept beside s.mx) is left alone. Not silent (Pierre, 2026-11-03: players know they test an early beta): the
  // app sees the mark go (model.js mxRecalc), tells the player once with a card (progress.js mxLostNotice) and takes back the
  // learned-based achievements the progress no longer meets (achRevoke, progress.js achRecheck).
  // Since the sheet's full replay (replayProgress, RVS; 2026-11-03) this is only the fallback for a device that never
  // reaches the sheet: a record adopted from the replay carries pm 1, so it is never corrected here.
  function memRecalc(s, mem) {
    if (!s || typeof s !== 'object') return false;
    let old = false;
    if (s.mx && typeof s.pg !== 'number') {
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
    // Coral Finder book photos (data: gen[].book, cropped from the 2022 book) can be switched off site-wide from the
    // admin (curation.json "book": false). Kept apart from the views so games and quizzes never use them (captions).
    if (c && c.book === false)
      Object.values(d.gen).forEach(g => {
        delete g.book;
      });
    // Book photos are candidates: only those Pierre approved in the admin (genera[n].add {f: view}) show, in that view.
    const X0 = (c && c.exclude) || {};
    // Book photos sent to another genus ("Not this", out) are kept here until the out step moves them, then filtered there.
    const G0 = (c && c.genera) || {};
    Object.entries(d.gen).forEach(([n, g]) => {
      if (!g.book) return;
      const A = (G0[n] || {}).add || {},
        O = (G0[n] || {}).out || {};
      g.book = g.book.filter(p => !X0[p.f] && (A[p.f] || O[p.f])).map(p => (A[p.f] && !O[p.f] ? {...p, view: A[p.f]} : p));
    });
    // Excluded photos (exclude: {f: reason}) leave every list first: genera, lecture photos, candidates, comparisons.
    const X = (c && c.exclude) || {},
      keep = L => (L || []).filter(p => !X[p.f]);
    if (Object.keys(X).length) {
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
    }
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
        const bi = (g.book || []).findIndex(x => x.f === f);
        if (bi >= 0) {
          p = g.book.splice(bi, 1)[0];
          at = ['book'];
        }
        // A candidate sent to another genus becomes a candidate there (shown once added in that genus).
        const ki = ((d.cand || {})[n] || []).findIndex(x => x.f === f);
        if (ki >= 0) {
          p = d.cand[n].splice(ki, 1)[0];
          at = ['cand'];
        }
        if (!p) return;
        if (to === 'cmp') (d.cmp = d.cmp || []).push({...p, g: [n]});
        else if (d.gen[to] && at[0] === 'book') (d.gen[to].book = d.gen[to].book || []).push({...p, t: to});
        else if (d.gen[to] && at[0] === 'course') (d.course[to] = d.course[to] || []).push(p);
        else if (d.gen[to] && at[0] === 'cand') ((d.cand = d.cand || {})[to] = d.cand[to] || []).push(p);
        else if (d.gen[to]) {
          const G = d.gen[to],
            S = (G[at[0]] = G[at[0]] || {});
          (S[at[1]] = S[at[1]] || []).push(p);
        }
      });
    });
    // Book photos moved in from another genus show only once added here (add {f: view}).
    Object.entries(d.gen).forEach(([n, g]) => {
      if (!g.book) return;
      const A = (G0[n] || {}).add || {};
      g.book = g.book.filter(p => p.view || A[p.f]).map(p => (p.view ? p : {...p, view: A[p.f]}));
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
      const all = [...allPhotos(g), ...VIEWS.flatMap(([v]) => (g.more || {})[v] || []), ...(d.course[n] || []), ...(g.book || [])];
      // Book photos follow Hide and view moves too (they stay out of g.views, so out of games).
      if (g.book) g.book = g.book.filter(p => !hide.has(p.f)).map(p => (mv[p.f] ? {...p, view: mv[p.f]} : p));
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
        if (g.book) g.book = g.book.map(p => (p.view === 'medium' ? {...p, view: 'wide'} : p));
      }
    });
  }
  // Photos per context (applySlots). Pierre's rule: every IMR photo and every photo of his own is used, with no cap;
  // photos from other iNat observers and approved Coral Finder book photos only fill a set that is short. Per genus
  // and view: sheet = 3 featured + the other IMR/own photos (filled up to 6 in all); games = one list, every photo kept
  // (game: the featured first, then IMR/own, each by quality, Poor last; until 2026-11-03 it was split into Easy / Medium
  // / Hard sets that gave a new photo its starting difficulty, docs/LEARNING.md): since 2026-11-02 (Pierre: new photos must
  // come into the games, the players' answers rate them) games take every photo kept, IMR/own first; they were capped
  // at 4 Medium and 4 Hard, other observers' photos only filling a short set, so newly validated candidates stayed out; Coral
  // Coral ID Key (needs variety) = featured + 2 photos from other iNat observers + 3 approved book photos. Pierre's picks (feat, hide, quality, use) always win; Claude's suggestions
  // (picks.json feat) come next, then quality. curation.json "use" {f: 'ref'|'game'} keeps a photo on the sheet only
  // or in games only. Nothing is written back: photos left out simply stay unused.
  const CAP = {feat: 3, sheet: 6, inat: 2, book: 3};
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
          byQ = L => L.slice().sort((a, b) => q(b) - q(a));
        const all = [...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'game');
        // Sheet order (Pierre): IMR photos first, then his own, then other observers, each by quality; Poor photos last.
        const rr = [...byQ(all.filter(p => p.imr)), ...byQ(all.filter(p => !p.imr && p.own))];
        const others = byQ(all.filter(p => !isCore(p)));
        const ranked = [...rr, ...others].sort((a, b) => (q(a) === 1) - (q(b) === 1));
        // Coral Finder book photos (Pierre 2026-11-01): on the sheet when pinned, or to fill a gap after every field photo; never in games.
        const bk = byQ((g.book || []).filter(p => p.view === v)),
          find = f => all.find(p => p.f === f) || bk.find(p => p.f === f);
        const pin = ((g.feat || {})[v] || []).map(find).filter(Boolean),
          hint = ((sug[n] || {})[v] || []).map(find).filter(p => p && !p.cf);
        // Never a Poor photo while better ones exist, except IMR lecture photos (Pierre).
        // Featured = always the first 3 (Pierre): his pinned photos, then the best remaining ones.
        const pool = [...hint, ...ranked].filter(p => !pin.includes(p)),
          k = CAP.feat - Math.min(pin.length, CAP.feat);
        const feat = [
          ...pin.slice(0, CAP.feat),
          ...fill(
            fill(
              take(
                pool.filter(p => p.imr || q(p) !== 1),
                k
              ),
              pool,
              k
            ),
            bk.filter(p => !pin.includes(p)),
            k
          )
        ];
        // Sheet (Pierre): strictly the first 6 per view in the admin order, the 3 featured then the next 3 (games still use them all).
        const more = [...ranked, ...bk].filter(p => !feat.includes(p)).slice(0, CAP.sheet - feat.length);
        // Games: field photos and IMR lecture photos (Pierre 2026-11-01), never multi-coral or book photos.
        const gm = byQ([...field, ...course.filter(p => p.view === v && !p.multi)].filter(p => use[p.f] !== 'ref')),
          core = gm.filter(isCore),
          rest = gm.filter(p => !isCore(p));
        // One list per view (Pierre, 2026-11-03: the Easy / Medium / Hard sets went, docs/LEARNING.md "Hierarchical
        // photo Elo"): the featured game photos first, then IMR / own before other observers, each by quality, Poor last.
        const lead = feat.filter(p => gm.includes(p)),
          after = [...core, ...rest].filter(p => !lead.includes(p));
        const book = bk.filter(p => !feat.includes(p)).slice(0, CAP.book);
        g.sl[v] = {
          feat,
          more,
          game: [...lead, ...after.filter(p => q(p) >= 2), ...after.filter(p => q(p) < 2)],
          idkey: [
            ...feat,
            ...take(
              others.filter(p => !feat.includes(p) && !p.imr),
              CAP.inat
            ),
            ...book
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
  const newAch = (snap, have) => ACH.filter(a => !(have || {})[a.id] && a.test(snap)).map(a => a.id);
  // Achievements taken back (Pierre, 2026-11-03): only those that rest on genera learned, and only when a recalculation
  // takes a learned mark away (model.js mxRecalc, progress.js achRecheck); anywhere else achievements are only added.
  // achRevoke removes from A ({id: time}) those of ACH_LEARN that the snapshot no longer meets, and dates in A._gone
  // {id: time} every one of them the snapshot does not meet, held here or not: the tombstone keeps a copy earned before
  // (the sheet's, another device's not merged yet) from coming back through a merge (mergeAch); earned again later, the
  // achievement carries a newer time and stays. Returns the ids removed.
  const ACH_LEARN = ['learn1', 'learn5', 'learn10', 'learn20', 'learnall', 'group'];
  function achRevoke(A, snap, t) {
    if (!A || typeof A !== 'object') return [];
    const off = ACH.filter(a => ACH_LEARN.includes(a.id) && !a.test(snap)).map(a => a.id),
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
  // The bar of a genus, 0 to 1: s.pg fills 95% on its way to PROG.M, each mastery-exam question passed adds 1%, the
  // passed exam makes it 100%.
  function scoreOf(s) {
    if (!s) return 0;
    if (s.mx) return 1;
    const g = pgOf(s);
    // At most 4 of the 5 exam steps before the exam is passed (Codex review #393): an exam begun before typed questions
    // can have 5 right answers still waiting for its typed ones, and only a passed exam (s.mx) makes 100%.
    return 0.95 * Math.min(1, g / PROG.M) + (g >= PROG.M && s.ex ? (0.05 * Math.min(4, s.ex.k || 0)) / 5 : 0);
  }
  // Progress % of a saved progress P over a list of genera, as the app shows it (genScore / progPct). The sync sheet
  // computes the leaderboard % with a copy (Code.gs pctOf_, v16; s.pg from v22): keep the two in step
  // (tests/sync.test.js compares them; tests/draw.smoke.js compares this with the app's progPct).
  function pctOf(P, list) {
    return list && list.length ? Math.round((100 * list.reduce((t, n) => t + scoreOf((P || {})[n]), 0)) / list.length) : 0;
  }

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
  // other backup (IMR lecture photos, Coral Finder book scans, our own drawings); the photos with an online original
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
  function typeDist(a, b) {
    const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        const c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[a.length][b.length];
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
  // [genera]} when two are as close (the player is asked to check the spelling), null when nothing is close.
  // norm: how the text is read (typeNorm, the first word, for genera; typeNormAll, the whole text, for fish entries).
  function typeMatchIn(names, text, norm = typeNorm) {
    const t = norm(text);
    if (t.length < 3) return null;
    const all = names
      .map(x => ({...x, d: typeDist(t, x.k)}))
      .filter(x => x.d <= TYPE.tol(x.k.length))
      .sort((a, b) => a.d - b.d);
    if (!all.length) return null;
    const best = all.filter(x => x.d === all[0].d),
      gs = [...new Set(best.map(x => x.g))];
    if (gs.length > 1) return {near: gs};
    return {
      g: best[0].g,
      old: best[0].old,
      exact: best[0].d === 0,
      ...(best[0].alt ? {alt: 1} : {}),
      ...(best[0].oft ? {oft: best[0].oft} : {})
    };
  }
  // The spelling step (a player's idea, Pierre 2026-11-05: "Good idea!"): how a typed answer reads against the unit asked
  // t, m being typeMatchIn's reading of it. 'exact': one of its names, spelled right (capitals, accents and spaces aside);
  // 'close': one of its names within the spelling tolerance: still a right answer (the genus was recognised; grading
  // unchanged), but the player retypes it once (quiz.js typeBind); 'other': another unit's name, close or exact (a wrong
  // answer, as before); 'none': nothing close, or two names as close (no answer: the player is asked to check the spelling).
  function typeVerdict(m, t) {
    if (!m || m.near) return 'none';
    if (m.g !== t) return 'other';
    return m.exact ? 'exact' : 'close';
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
  // p: the first-launch answer's prior (abilityOf, playerStart), for a genus never answered.
  function eloStep(P, n, s, good, d, k, w = 1, p = 0) {
    const th = abilityOf(P, n, p),
      g = 1 / k,
      e = g + (1 - g) * sigm(th - d),
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
  //   of a comeback question (1 otherwise), Rc the recall of the genus given (1 otherwise);
  // - p the first-launch answer's prior (playerStart), sec the seconds, timed (the time weighs a right answer's steps,
  //   rtWeight), rt (the seconds are recorded, rtAdd; true unless false);
  // - th: the ability the weights use, only for a row logged before the scorer (its logged th; the replay then
  //   recovered d0 from its rounded e). Otherwise the ability as P holds it, which is what the game logged.
  // Returns {th0, dm, e, w, look, rw}: the ability before the answer, the question's difficulty with the memory and the
  // mix-ups, the expected success (logged e), the progress weight, the look-alike test and the time weight.
  // What only the game knows stays in quiz.js answer (the exam, the days answered, the last observations, the cards and
  // the hold); what only the log knows stays in replayProgress (the last misses lx and lm, duels won from the mode).
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
      dm = d0 + fam + cf,
      out = {dm, rw: 1, look: false, th0: null, e: null, w: null};
    if (scored) {
      const th0 = typeof q.th === 'number' ? q.th : abilityOf(P, t, p),
        look = typeof q.look === 'function' ? !!q.look() : !!q.look,
        // The miss weighs against the aim at the player's level before this answer's own step on it.
        w = ok ? pgRightW(k, look) * pgMemW(th0, d0, fam, k, R) : pgMissW(th0, dm, k, R, aimOf((P[LEVEL] || {}).th));
      s.pg = pgStep(pgOf(s), ok, w);
      delete s.L; // BKT's knowledge, before s.pg
      s.u = (s.u || 0) + 1;
      // The ability: the genus shown against the question's difficulty with the memory and the mix-ups, a right answer's
      // step weighed by its time against the player's earlier ones.
      const rw = q.timed === false ? 1 : rtWeight(P[LEVEL], q.sec, k, ok);
      eloStep(P, t, s, ok, dm, k, rw, p);
      Object.assign(out, {th0, look, w, rw, e: 1 / k + (1 - 1 / k) * R * sigm(th0 - dm)});
    }
    // The global level: made at the first answer from the player's history (its counts hold this answer), then one step
    // each, with the same weight; this answer's seconds recorded after its steps (rtWeight compares with earlier ones).
    if (P[LEVEL]) P[LEVEL][ok ? 'ok' : 'ko']++;
    else P[LEVEL] = levelSeed(P);
    if (scored) {
      eloStep(P, LEVEL, P[LEVEL], ok, dm, k, out.rw, p);
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
        x.pg = pgStep(pgOf(x), false, pgMissW(abilityOf(P, q.c, p), d0, k, typeof q.Rc === 'number' ? q.Rc : 1, aimOf(P[LEVEL].th)));
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
  // recall R, g the recall Rc of the genus given, h the hint revealed after the answer; f, c, r, g and h left out at their
  // default (0, 0, 1, 1, none). Numbers to 3 decimals: the game rounds them before scoring (scoreIn), so the replay meets
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
    return out;
  }
  // The game's inputs rounded as they are logged (scoreRec), before it scores with them.
  const scoreIn = q => ({
    ...q,
    d0: r3(q.d0),
    fam: r3(q.fam || 0),
    cf: r3(q.cf || 0),
    R: r3(q.R === undefined ? 1 : q.R),
    Rc: r3(q.Rc === undefined ? 1 : q.Rc)
  });
  // The record of a question scored by scoreAnswer (q after scoreIn, res its result): what quiz.js answer logs as sc.
  const scoreLog = (q, res) => scoreRec({d: q.d0, f: q.fam, c: q.cf, l: res.look ? 1 : 0, r: q.R, g: q.Rc, h: q.hint || undefined});

  // Rules versions (Pierre, 2026-11-03: progress is recalculated from the whole answer log, by the sheet, automatically,
  // now and whenever the progress engine changes). Every change to a rule that moves the progress (what an answer
  // weighs, the moving average, the ability step, the photo memory, what the replay keeps from the device...) appends
  // an entry here: v (the next number), at (the date), why (one line for the docs), msg (null, or the announcement card
  // {t: title, p: paragraph, in plain words} that every device which skipped this version shows once, rule D6;
  // with only: 'changed', shown only when the adoption moved the player's progress % by min points or more, {from} and
  // {to} in p being the two %). Every version takes RV_CARD (Pierre, 2026-11-03, a standing rule: rule D5);
  // Pierre is asked only for a different text. The sync script, which embeds this file
  // (tools/sync_core.py), replays a player's log again when their stored replay is older than RV, and the app adopts a
  // replay newer than the one it applied (sync.js replayAdopt). docs/LEARNING.md "Full replay".
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
    }
  ];
  const RV = RVS[RVS.length - 1].v;
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
  // The sync script version that files each answer under its subject (Code.gs v60: Answers Subject, Rank, Taxon shown,
  // Taxon answered, Species shown; its replay, hold and photo ratings keep the replayed subject's rows). An older script
  // would file a fish answer as a coral one (no subject column): the app sends the answers of a subject the sheet does not
  // replay only once the script's replies say v >= LOG_SHEET (sync.js logOk), and keeps them queued until then (rule D4).
  const LOG_SHEET = 60;
  const logOk = (a, v) => ansSubject(a) === replaySubject() || Number(v) >= LOG_SHEET;
  // The messages a device that last applied version `from` shows once it applied version `to`: one per version that
  // has one, oldest first; the same message (RV_CARD) once, at the last version that has it, so a device that skips
  // several versions sees one recalculation card with its progress before and after the whole jump.
  const rvMsgs = (from, to) =>
    RVS.filter(x => x.v > (from || 0) && x.v <= to && x.msg).filter((x, i, L) => !L.slice(i + 1).some(y => y.msg === x.msg));

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
  // start ({id: player}: a replay to go on from, as returned here, e.g. the sheet's, with this device's answers not in
  // the sheet yet on top; copied, never changed), onAnswer(row, {d, fam, cf, k, w, look}).
  // Returns {id: {P: {genus: {pg, ok, ko, h, ps, off, conf, u, th, lt, vr, streak, at, du, lx, lm}, '~level': {ok, ko, th, vr, at, rt}},
  // n, used, rep}}: per genus the moving average pg (what the app keeps as s.pg), right / wrong answers, the last 10
  // results, the photos [shown, right], the choices offered beside it and the genera given instead (the app's s.off,
  // s.conf), u = answers that moved pg, the ability th and its volatility vr (eloStep, as quiz.js answer steps them: on
  // the genus shown only, never on the genus wrongly given),
  // the run of right answers (streak), the last answer (at), a look-alike duel won (du), the last miss on it, shown or
  // given (lx, a time: it ends an exam in course), the last one that took the progress below the learned mark's keep
  // rule (lm, a time: mxKeeps); the global level LEVEL as the
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
  function replayProgress(rows, o = {}) {
    const gen = o.gen || {},
      starts = o.starts || {},
      mem = memOf(o.mem),
      conf = o.conf || {},
      since = o.since || {},
      memory = o.memory !== false,
      time = o.time !== false,
      out = o.start ? JSON.parse(JSON.stringify(o.start)) : {};
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
        if (since[id] && !(r[1] > since[id])) return;
        const pl = (out[id] = out[id] || {P: {}, n: 0, used: 0, rep: 0}),
          rec = g => {
            const x = (pl.P[g] = pl.P[g] || {pg: 0, ok: 0, ko: 0, h: '', ps: {}, u: 0});
            if (!x.ps) x.ps = {};
            if (typeof x.pg !== 'number') x.pg = 0;
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
        const pr = startPriorAt(starts[id], r[1]), // the first-launch answer's prior at this answer (abilityOf)
          replayable = fs.length && k > 1 && (sc || (typeof e === 'number' && typeof th === 'number'));
        const q = {t, c, ok, k, chs, ph: fs, cv: !!wrong, p: pr, sec, timed: time, rt: time && !!replayable, d0: null};
        if (sc) {
          // Logged by the scorer (Q132): what the game scored with, as it was then; the memory as logged unless the
          // replay leaves it out (memory: false, a what-if).
          Object.assign(q, {d0: sc.d, fam: memory ? sc.f || 0 : 0, cf: sc.c || 0, look: !!sc.l, R: sc.r === undefined ? 1 : sc.r});
          Object.assign(q, {Rc: sc.g === undefined ? 1 : sc.g, hint: sc.h});
        } else if (replayable) {
          // A row logged before the scorer: its difficulty recovered from the logged e (rounded to 0.01), its memory and
          // mix-ups term rebuilt with today's pooled stats, its look-alike test after the offers, as the game ran it.
          const fam = memFam(hs, mem),
            cf = confTermOf(pl.P, t, chs, k), // on the record before this answer (before the offers)
            qq = Math.min(0.995, Math.max(0.005, (e - 1 / k) / (1 - 1 / k))),
            dl = th - Math.log(qq / (1 - qq)), // the difficulty in the logged expectation
            // d: the photo's difficulty alone (quiz.js d0), without the memory and the mix-ups term the app logged in e.
            d = dl - (r[1] >= MEM_LOGGED ? fam : 0) - (r[1] >= CF_LOGGED ? cf : 0);
          Object.assign(q, {d0: d, fam: memory ? fam : 0, cf, th, look: () => chs.some(x => lookOf(pl.P, t, x))});
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
        if (!ok && !mxKeeps(s.pg)) s.lm = r[1];
        if (ok && (/^quiz-duel/.test(mode) || /\|d(\||$)/.test(mode))) s.du = 1;
        if (wrong) {
          const x = pl.P[c];
          x.lx = r[1];
          if (!mxKeeps(x.pg)) x.lm = r[1];
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
  // - the saved record as it is (the same mx rule) for a genus the log has no replayable answer on, or fewer answers on
  //   than the saved copy (answers that never reached the log: a replay must never lose progress);
  // - LEVEL: the replayed ability (th, vr), the larger answer count of the two (answersSoFar keys the exam's gaps, the
  //   cards met and the prompts, so it never goes back) with the answer times (rt) of the same side, the later at, rv
  //   when given.
  // The opening hold is not here: the sheet already replays it from the same log (Code.gs hold_, reply's hold).
  // The replay does not decide the exam: a genus learned keeps it here even if its replayed bar is lower, unless a miss
  // after the exam takes it away, as the game does (mxKeeps, lm).
  const REPLAYED = ['pg', 'ok', 'ko', 'h', 'ps', 'off', 'conf', 'th', 'lt', 'vr', 'streak'];
  function replayedOf(rep, saved, rv) {
    const S = isObj(saved) ? saved : {},
      R = (rep && rep.P) || {},
      out = {},
      n = x => ((x && x.ok) || 0) + ((x && x.ko) || 0),
      dup = x => JSON.parse(JSON.stringify(x)),
      kept = s => {
        const o = dup(s);
        if (typeof o.pg !== 'number') {
          delete o.mx;
          delete o.ex;
        }
        return o;
      };
    new Set([...Object.keys(S), ...Object.keys(R)]).forEach(g => {
      const s = isObj(S[g]) ? S[g] : null,
        r = isObj(R[g]) ? R[g] : null;
      if (g === LEVEL) {
        const o = s ? dup(s) : {};
        if (r) {
          if (typeof r.th === 'number') o.th = r.th;
          if (typeof r.vr === 'number') o.vr = r.vr;
          // The answer times (rt) go with the count: the replay's when it has every answer the device has.
          if (!s || n(r) >= n(s)) {
            [o.ok, o.ko] = [r.ok || 0, r.ko || 0];
            if (isObj(r.rt)) o.rt = dup(r.rt);
            else delete o.rt;
          }
          if (r.at) o.at = Math.max(r.at, Number(o.at) || 0);
          if (rv) o.rv = rv;
        }
        out[g] = o;
        return;
      }
      if (!r || !r.u || (s && n(s) > n(r))) {
        if (s) out[g] = kept(s);
        else if (r) out[g] = {pg: r.pg || 0, ok: r.ok || 0, ko: r.ko || 0, h: r.h || '', ...(rv ? {rv} : {})};
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
        if (typeof s.pg === 'number' && s.mx) {
          if (!(r.lm > s.mx)) o.mx = s.mx;
        } else if (typeof s.pg === 'number' && s.ex && !(r.lx > (s.ex.ts || s.at || 0))) o.ex = dup(s.ex);
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
  // - kept from this device's copy (the log has fewer answers on it): B's record, as before;
  // - the global level: the replay's, with B's answer count and answer times (rt) when its count is larger (replayedOf
  //   keeps the larger count).
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
        if (!r) return b && (out[g] = dup(b));
        const o = dup(r);
        if (b && n(b) > n(r)) {
          [o.ok, o.ko] = [b.ok || 0, b.ko || 0];
          if (isObj(b.rt)) o.rt = dup(b.rt);
          else delete o.rt;
        }
        out[g] = o;
      } else if (r && M[g] && M[g].rv === rv) {
        const o = dup(r);
        Object.keys((b && b.ps) || {}).forEach(f => {
          const x = (o.ps = o.ps || {})[f] || [0, 0],
            y = b.ps[f];
          if (Array.isArray(y)) o.ps[f] = [Math.max(x[0], Number(y[0]) || 0), Math.max(x[1], Number(y[1]) || 0)];
        });
        out[g] = o;
      } else if (b) out[g] = dup(b);
    });
    return out;
  }
  const learnedOf = (P, list) => list.filter(n => (P || {})[n] && P[n].mx).length;

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
    else if (b.startsWith('g-') && b.length > 2 && !a.length) p = 'learn/' + S.one + '/' + routeEnc(b.slice(2));
    else if (b.startsWith('cmp-') && b.length > 4 && a.length === 1) p = 'learn/compare/' + routeEnc(b.slice(4)) + '/' + routeEnc(a[0]);
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
    typeVerdict,
    typeDiff,
    typedShare,
    PROG,
    mxKeeps,
    pgStep,
    pgOf,
    scoreOf,
    pctOf,
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
    startWt,
    START_CAP,
    replayedOf,
    replayBase,
    logRow,
    ELO,
    abilityOf,
    levelMove,
    eloStep,
    RV_CARD,
    RVS,
    RV,
    RV_SHEET,
    RT_SHEET,
    START_SHEET,
    LOG_SHEET,
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
    newAch,
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
    LOG_SUBJ,
    LOG_SC,
    ansSubject,
    rowSubject,
    subjRows,
    subjEntries,
    subjKey,
    subjDev,
    fishGen,
    easyRank,
    refFirst,
    refLevel,
    refScore,
    fishOn,
    fishPid,
    FISHPH,
    fishPhotos,
    keepSubjectKeys,
    fishNames,
    fishTypeNames,
    renamedId,
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
    withLegacy
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else Object.assign(root, CORE);
})(this);
// END core.js
return module.exports; })();
