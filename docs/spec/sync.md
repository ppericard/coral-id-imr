# Progress sync and the sheet script

How a player's progress and answers reach the Google Sheet and come back, and what the sheet script does with them. This
is the specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md)
and the PRs, the script's version history in [tools/sync/HISTORY.md](../../tools/sync/HISTORY.md). The rules that govern
it are D1-D9 in [rules/sheet.md](../rules/sheet.md); what is exposed and what protects it is in
[SECURITY.md](../SECURITY.md); the learning engine the replay runs is in [LEARNING.md](../LEARNING.md). The cards and
prompts the app shows around a game, some of them kept with the progress, are in [cards.md](cards.md).

## The parts

- **The app's side**: `sync.js` (signing in, saving, loading, merging, adopting a replay, sending events), the shared
  engine `core.js` (merges, the replay, the formats of what is stored), `model.js` (the player's model the progress
  feeds) and `progress.js` (the cards that tell a player about a change). `app.js` `SYNC_URL` is the address of the
  sheet script.
- **The sheet script**: an Apps Script web app, [`tools/sync/Code.gs`](../../tools/sync/Code.gs), in the Google Sheet
  "IMR Coral ID – RA progress" on Pierre's Drive. It answers the app's requests, keeps the answer log, replays progress
  from it, serves the photo statistics, the leaderboard and the admin's reads, and updates itself from GitHub.
- **Accounts**: a name and a 4-digit code, no Google account. The code only prevents accidental overwrites: it is not a
  password (SECURITY.md).
- **A local copy never talks to the sheet**: on `localhost`, `file:` or a webdriver browser the app never signs in,
  saves or sends (`app.js` `LOCAL`, `sheetFetch`, unless a test sets `window.SHEET_STUB`), so tests never reach the real
  sheet (rule D1).

### Version gates and the floor

A feature that needs sheet script version N turns on only when the script's replies say `v` ≥ N (rule D4): a gate is a
`const X_SHEET = N` in the app's code. Gates stop at `core.js` `SHEET_FLOOR`, a script version already confirmed live:
it is set only to a version merged at least three days before, never to the build's `VERSION`, because Pages deploys
before the script updates itself. `sync.js` `sheetV` reads the script's version as at least the floor, also before any
reply, so a new device or an offline first launch plays today's rules. Every gate at or below the floor is deleted with
its old branch: `tests/gates.test.js` lists the gates and fails on one at or below the floor, or on a floor above
`VERSION`; `tools/sheet_version.py` never moves the floor. A gate this file names (`PA_SHEET`, `CV_SHEET`, `STRUCT_SHEET`,
`PAIRS_SHEET`, `VIEWPORT_SHEET`, `LIVEGAME_SHEET`) is one of those still above it.

### Where the player meets it

The header's "Sign in" button (`#signb`, shown by `showProg()` while signed out, or as "Not saved" when `syncTrouble()`,
which then opens ⚙) opens the sign-in card (`signinNudge(false, false)`). The account line (`#sync`, filled by
`bindSync()`) and "Backup or reset progress" (`bindProgFile()`, `#reset`) live in ⚙ (`#settings`), never on My progress
(rule U9).

## The sheet

### Tabs

The column layout of a tab is positional: never move or change a column; a new column goes at the end, a new kind of
record in a new tab.

| Tab | Holds |
|---|---|
| `RAs` | One row per player: name, the hidden code hash and the saved data as JSON (column H) |
| `Progress data` | Name, revision, the saved data in 45,000-character chunks (a cell holds at most 50,000); `RAs` column H keeps the JSON when it fits, else `@Progress data` |
| `By genus` | The corals' progress per player and genus, written at each save that carries a summary's `genera`: its columns are the script's own, never the client's (`Code.gs` `scale_`, `core.js` `gameOf` over data.json: the global scale, the slate then the bonus genera, rule L6), each filled from the summary's status for it, any other key ignored, the grid widened to that scale at most, nothing written while data.json cannot be read (the app sends the scale's genera from `SCALE_SHEET`, the slate's to an older script); its header row is the list of genera the corals' leaderboard counts |
| `Answers` | One row per answer (below) |
| `Activity` | A QUERY per player over the Answers tab; it counts every subject's answers |
| `Reports` | One row per report or feedback: time, reporter, verified, reason, expected, answered, suggested genus, note, mode (game, photo, sheet or page), photos, where, id, image (the report's id when a picture is attached, else empty; from v212) |
| `Report images` | One row per picture a player attached to a report (below): id, time, player, type, bytes, the image in base64 chunks |
| `Events` | The app's events (below) |
| `Pages` | The pages-opened summaries, same columns as Events (below) |
| `Replayed`, `Replayed Fish`, one per replayed subject | The full replays kept per player (below) |
| `Stats`, `Stats Fish`, `Stats Sea slugs` | The pooled photo statistics' snapshot, one tab per subject with game photos (below) |
| `Timings` | How long the script's operations take; no player data (below) |
| `Roles`, `Audit` | The admin list (and the record of the roles before the groups carried them), and the log of privileged changes (below) |
| `Group settings`, `Groups` | The player groups, their settings and rights, and their members (below) |
| `Alerts` | The script's alerts, read by the admin (SECURITY.md "The Alerts tab in the admin") |
| `Deploy log` | Each self-update install or error, the one-shot migrations, the leaderboard's replays made ahead, the backup's lines |

### The Answers tab

Columns, in order: Name, Time, Genus shown, Answered, Right, Mode, Photos (space-separated file stems), Id, Expected,
Ability, New photos, Choices (the units offered, space-separated), Seconds, Enlarged, UTC offset, Typed, Retyped right,
Subject, Rank, Taxon shown, Taxon answered, Species shown, Scoring, Rejected tries, Device, Photo answered, Content
version (`Code.gs` `LOG`). Every reader takes them by position (`answers_`, `stats_`, `users_`, `hold_`, the Activity
QUERY on A:E): new columns only ever go at the end. A tab with fewer columns reads the missing ones blank (`logRows_`)
until the next answer adds them (`logAnswers_` inserts the columns before its header check). A row logged before a
column existed has it blank, and an app that sends no value for a field leaves it blank: the script ignores the fields
it does not know, so a field that an older script would drop needs no gate (no `*_SHEET`) unless the app must know it
was kept.

- **Seconds** and **Enlarged**: the answer's time and whether a photo was enlarged (below, "Answer time and
  enlargement"). `readAnswers` rows carry them at indexes 12 and 13 (null when blank), after the anonymous flag (11).
- **UTC offset**: the device's offset when the answer was given, minutes east of UTC (`tz`), so the admin can read the
  time of day at home (the Journey's Cards and steps, `admin-journey.js` `jOffAt`; `readAnswers` index 14). The rows
  logged before the column existed were given +480 once (every player then was on Philippine time).
- **Typed** and **Retyped right**: a typed answer's raw text as first typed (`ty`, up to 40 characters, control
  characters out, never a formula) and its spelling step (`tr`: 1 a close typo of the right name retyped exactly, 0
  retyped wrong or skipped, blank when none was asked). Logged only; `readAnswers` indexes 15-16.
- **Subject**, **Rank**, **Taxon shown**, **Taxon answered**, **Species shown**: below, "Every subject's answers".
  `readAnswers` indexes 17-21 (`core.js` `LOG_SUBJ` 17).
- **Scoring**: what the app scored the answer with, `core.js` `scoreRec` as JSON (photo difficulty, memory, mix-ups
  term, look-alike test, recalls, the corallites hint revealed after the answer, the format's offset `o`, the kind of a
  smaller fault `z`: `cn` a common name typed for a species' scientific name, `g` its genus alone, `core.js` `PART`,
  Q394 A; a miss weighed half or a quarter, never a gain; the photos' time term `i` a right answer's time was netted of,
  `core.js` `rtWeight` ti, kept even at 0, from sheet `RTNET_SHEET`: a row without it is netted by the terms served
  when it is replayed, LEARNING.md "The player's time net of the photo's"); read by its
  name (`SC_COL`, column W); `readAnswers` index 22, an object, and the same index in the replay's rows (`rowOf_`,
  `logRow`, `core.js` `LOG_SC`); blank when the app sent none (LEARNING.md "One scorer").
- **Rejected tries**: the texts a typed answer refused before it, a JSON list. Logged only.
- **Device**: the anonymous id of the device that sent the answer (`sync.js` `devId`, the Device of its Events and Pages
  rows): one `dev` per save or anonymous send, written in each of its rows by `logAnswers_` (`dev_`: 8 to 16 lower-case
  letters and digits, else blank), signed in or not. Served by no reader (`readAnswers` stops at index 22). Kept
  through a claim at sign-in, a rename and a merge; blanked when a delete keeps the answers as `~deleted <id>`
  (`devBlank_`, rule D7); gone with them on a delete of everything. `tests/devanswers.test.js`, `tests/adopt.test.js`.
- **Photo answered**: the file stem of the photo a Find the X answer tapped (`pa`, right answers included), so a view
  of the fish species taken for another family can read it through `fish-game.json`; checked as Photos are (`PH`, 400
  characters), else blank; blank for every other answer. Sent only once the replies say `v` ≥ `core.js` `PA_SHEET`,
  the copy sent leaving it out before and the queue keeping it (`logOut`, `sync.js`, rule D4). Logged only; it names no
  one, so it travels with its row. `tests/findxlog.test.js`.
- **Content version**: a short id of the content the answer's subject was built from on the device, the entry's `cv`
  (`core.js` `contentVersion`): the versions of the data files its units were built from, as fetched (the deploy's
  `?v=` hash from `tools/stamp_versions.py`, kept by `app.js` `okJson` on what it read under a symbol; a hash of the
  content for a file fetched without one, the sea slugs', and for what the app makes from one, `FORMS`, `AUTOQ`:
  `fileVer`), its part of the curation the units were built under (`curPart`: a tree subject's own key and the shared
  `exclude`; the corals' the root without the other subjects' keys, so another subject's Publish leaves it as it is)
  and the structure stamp in force (`''` on the base's circles and pairs, and while the sheet does not replay under the
  structure yet, which the units then do not follow). So it changes whenever the photos in play, the units, the
  structure or the curation do, and a text edit in a data file changes it too; it starts with a letter so the sheet
  never reads it as a number. Made once per build at the subject's first answer (`app.js` `contentVer`, from the
  inputs `build` and `treeBuild` keep on the units they make, `DATA` and a tree subject's `TREEU`, as a property no copy
  or key list meets: `cvIn`), on the device, because the copy in force is the device's (a kept curation, a draft
  preview). 'c' and up to 15 lower-case letters and digits, else blank. Sent only once the replies say `v` ≥ `core.js`
  `CV_SHEET` (`logOut`, rule D4). Logged only; a reader takes it by name and accepts a blank. `tests/contentver.test.js`.

**Id** is the answer's attempt id (`core.js` `answerId`: the time in base 36 and 8 characters of the device's crypto, 16
in all; a live answer's is `live.js` `liveAid`, one per player and question, so a page reloaded before it left the queue
logs the same id). It is made once per answer and sent as it is at every try. `freshAnswers_` and `logAnswers_` skip an
id the tab already has (the Id column read once per send, under the script lock; none for a send with no answer) or one
met earlier in the same send (`newIds_`, which also counts it once against the caps), compared as the tab keeps it (its
first 20 characters).

**Mode** is the game: `quiz` the photo quiz, `quiz-duel` the Duel tab, `live` a live game's answer and `wink` a
surprise card's (below); then the suffixes, in this order (`quiz.js` `answer`): `|s` the custom quiz (right after
`quiz`, rated as the photo quiz); `|d` a duel slipped into the photo quiz; `|f` a Find the X (the photo tapped in
`pa`; its format offset `find`, `core.js` `fmtOf`); `|c` a comeback question after a break (its `e` recall-adjusted, counted in the hold); `|w` a question of the
gentle restart (logged on one day only, left out of the hold); `|h` a photo of the player's reserve (asked by the exam only); `|kN` the
number of plausible choices (always last but `|t` and `|x`); `|t` a typed question (the player typed the unit: rated
with no guess rate, `guess_` 0; Answered is the unit read, empty for "I don't know", the raw text in Typed; Choices
empty); `|x` a mastery exam question. What each mode counts: [quiz.md](quiz.md#what-each-mode-counts).

### Every subject's answers

Every subject's answers are logged from the first one, at any rank, and sent as they come (`sync.js` `syncOnce`,
`sendAnon`).

- **Subject** is the `core.js` `SUBJECTS` id (`coral`, `fish`, `seaslug`); blank in the oldest rows, all coral; an app
  that sends no `s` is coral.
- **Rank** is the rank asked: the subject's `SUBJECTS` `rank` (coral `genus`, fish `family`: an IMR entry, which two
  entries may share as a scientific family), unless the unit has its own (`app.js` `rankOf`: `genus` for a fish
  scientific genus, `species` for a species unit).
- **Taxon shown** and **Taxon answered** are the names at that rank when a unit's id is not its name (`app.js`
  `unitName`: `Damselfish` for `t01`, `Chromis` for `g:Chromis`); blank for a coral genus, its own name, and for "I
  don't know".
- **Species shown** is the species of the photo (`app.js` `speciesShown` through `UNITS` `species`: a fish photo's
  `fish-photos.json` `sp` read in `fish.json` species, several joined by `, `); a species with no name yet by its label
  (`Goniobranchus sp. 5`: a digit is kept only in the 1 to 3 digit number after `sp. ` that ends a name); blank for the
  corals' genus photos.
- Genus shown, Answered, Choices and a duel's Mode keep the units as the app asks them, the machine's ids (`t01`,
  `g:Chromis`: `logAnswers_` accepts digits and `:` after a first letter). The app's log entry carries `s`, `rk`, `tn`,
  `ta`, `sp` (`quiz.js` `answer`). `readAnswers` fills the subject with `coral` and the rank with the subject's in the
  rows that have none.
- **What is computed reads one subject at a time.** The corals are the subject the sheet's photo statistics, hold and
  admin player list read (`SUBJECTS` `replay`): `Code.gs` `answerRows_` keeps its rows only, so `stats_` (photo Elo,
  genus offsets `gd`, photo memory `mem`, confusions, trusted players), `hold_`, `replay_`, `replayedAll_` and `users_`
  never see another subject's row; the other subjects' replays and statistics take their own rows (below). Every reader
  of one subject's answers keeps its rows with `core.js` `subjRows` (`admin.js` `ANS.rows`, every subject's in
  `ANS.all`; `tools/analyses.js`, `abilityeval.js` and the tools that read its `normalise`, `memreplay.js`,
  `realcheck.js`, `rtprep.js`, `fallbackeval.js`); the app's own readers of its queue use `subjEntries` (`holdAdopt`,
  `replayAdopt`, the reset check in `mergeSaved`, `signIn`'s anonymous base, `quiz.js` `ANONB`, `model.js` `lastAt`,
  `progress.js` `sorryNotice`).

### Surprise cards' answers

The answer to a fish wink (`quiz.js` `winkShow`, `winkAnswer`) goes the normal answer path (`logAnswer`: the account's
queue, or `LOG0` and the anonymous queue) as one `Answers` row: Genus shown the wink unit (`f:WhaleSharks`), Answered the
choice (an old entry id renamed, `core.js` `renamedId`: `t01` is `f:Damselfishes`), Right, Mode `wink` (`core.js`
`WINK_MODE`), Photos the wink's photo, Id, Choices the four ids, Seconds and Enlarged (`QCLOCK`, `qclockArm`), UTC
offset, Subject `fish`, Rank, Taxon shown and answered, Species shown; Expected, Ability, New photos and Scoring blank
(nothing is scored). No reader counts it: `core.js` `subjRows` and `subjEntries` leave it out (`winkRow`, `winkEntry`:
every admin page, analysis and evaluation tool, the app's hold, replay, last answer and sorry card), and so do `Code.gs`
`replayed_` and `answers_`, the Analyses head's count of each subject's answers (`analyses_`, `CORE_.subjCounts`, the
refit trigger), the Activity tab, the admin's `ANS.all` and the app's counts of its queue (the "answers waiting" line,
the sign-in note, the tips' seed). `tests/winklog.test.js`.

### Answer time and enlargement

Each answer of the photo quiz and the duels carries `rt`, the seconds from the moment the question's first photo is in
(its load event, or at once when already loaded) to the click on a choice, to 0.1 s, at most 600; the clock starts again
when a first-meeting card over the question closes and stops while the app is hidden (`QCLOCK` in `quiz.js`); none when
the photo never loaded. And `zm`, 1 when a photo of the question was enlarged before answering. Both are sent with every
answer, signed in or not, and logged in Seconds (clamped 0-600, rounded to 0.1) and Enlarged (0/1). The admin's player
journey shows the player's median time and share of answers with a photo enlarged.

The seconds weigh a right answer's ability steps (unit and global level) by clamp(1 − 1.5 z, 0.5, 1.5), z its log
seconds against the player's own median over their earlier timed answers (`core.js` `RTIME`, `rtWeight`, `rtAdd`;
typed answers, answers without seconds and the first 10 timed answers weigh 1; misses are unchanged), in the app as in
the sheet's replay (the device's own answers replayed on top of an adopted replay too, `replayAdopt`), which reads them
from the Seconds column (`rowOf_` index 12; LEARNING.md "Response time"). The player's times are kept in the global
level's record, `P['~level'].rt` = {tenths of a second: answers} (an exact median, a few hundred keys at most), added up
by `mergeProgress` and `mergeUsers`, rebuilt by the replay (`replayedOf` and `replayBase` take it with the level's
answer count). The seconds and the enlarged mark also make each photo's time term in the pooled statistics ("Pooled
photo statistics"; LEARNING.md "The photo's time term"). The enlarge rates from before the enlarge mark and its one-time hint
([cards.md](cards.md#the-enlarge-hint)) are not comparable with those after.

## Requests

Every reply is JSON and carries `v`, the script's `VERSION` (`json_`). An exception thrown in `doGet` / `doPost` (above
all `lock.waitLock(10000)` timing out while other players' saves, anonymous sends and event batches hold the script lock) answers `lock` or `server`, never Apps Script's HTML error page, which has no CORS
header and would reach the app as a network failure. A save's hold, groups and replay are computed after the lock is
released.

- `POST` the progress and the answer log (a save; below).
- `GET ?name=&pin=` a load: the saved data, `hold` and `holdIds` (below; with `light`, every replayed subject's in
  `holds` too), and, when the request's `rv` is below the
  script's rules version, `replay` (below).
- `GET ?stats=1` the photo statistics: `photos`, `conf`, the photo memory offsets `mem` with their answers `memn`, the
  genus offsets `gd` of the hierarchical photo Elo (`{genus: [offset, weighed answers]}`, `photos` carrying each photo's
  total), the per-format offsets `fmt` (`{format: [offset, answers]}`, `core.js` `fmtOffsetsOf`); typed answers `|t`
  rated with no guess rate. Served from the pooled statistics' snapshot (below); `&s=<subject>` asks another subject's.
- `POST {readAnswers, token, aname, apin}` the anonymous answers for the admin (admin-only); with the caller's own name
  and code, the reply's `me` is the caller's own anonymous id. The salt is secret, in Script Properties `ANON_SALT`.
- `POST {readStats, token, s}` the admin's statistics with the per-player `ras` (below, "The other readers"). The
  public `?stats=1` keeps only the pooled numbers, so a leaderboard name cannot be matched to an answer history.
- `POST {reports, rname, rpin}` the players' reports, logged once per id. The reporter goes in `rname` / `rpin`, never
  `name` / `pin`, so a script that does not know reports refuses it (`input`) instead of taking it for an empty progress
  write; `Verified` = 1 when the code matches the sync account. A report may carry `img` (`{t: 'image/jpeg', d: base64}`),
  kept in the `Report images` tab (below); the reply then holds `img: {id: 1 | 0}` (kept or refused), the report logged
  either way.
- `POST {readReports: 1, token}` the reports with names, newest first, admins only. The script checks the admin page's
  GitHub token with GitHub (`UrlFetchApp`, write access to the repository), remembers a valid one 10 minutes by its
  hash and never stores it. That permission (`script.external_request`) is not asked by a redeploy nor by running
  `doGet`: it is granted once by running, in the editor, a function that calls `UrlFetchApp` (such as one holding
  `UrlFetchApp.fetch('https://api.github.com')`) and accepting the prompt.
- `POST {readEvents: 1, token}` the Events tab; with `pages: 1` the Pages tab (below).
- `POST {readAlerts: 1, token}` the Alerts tab for admins only, as `readEvents`: `[time ms, text]`, newest first, the
  last 3000; the per-name cap's `n:<name>` served as the name's admin id; a line that names an account or a device
  served only while its admin id is a live account's or a device's still not signed in (rule D7: a deleted, merged or
  archived account's left out; `alertId_`, `alertIds_`, `readAlerts_`).
- The rights, live games and groups requests: below.

**Hardening**: user strings never become formulas (`safe_`), answer fields are pattern-checked, 5 wrong codes for a name
block it for 10 minutes (`wait`), and answers are logged before the progress is written.

## Report images

A screenshot or photo attached to a report (Pierre, 2026-11-21, Q446; [decision](../decisions/2026-11-21-report-image.md)).
Gate: the app offers it from script v212 (`sync.js` `REPIMG_SHEET`, rule D4).

- **The app** (`sync.js` `repImgReduce`): the player picks a file in the report dialog; a canvas re-encodes it to a JPEG
  of at most 800 px on the long side, quality 0.6 (smaller steps if it is still over 180 kB), which drops the EXIF and
  the GPS. One image a report. It waits in memory (`repImgPend`) for its report, never in the queue
  (`reefid-reports`, `localStorage`); its report goes alone in its request (`repBatch`). Offline when the report is
  sent, or when the page closes before the send, the report goes without the image, and the dialog says so.
- **The tab** (`Code.gs` `REPIMG`): one row per image, `Id` (the report's), `Time`, `Player` (the reporter's anonymous
  id, as the Audit tab's; empty without a name), `Type` (`image/jpeg`), `Bytes` (decoded), then the base64 text in
  chunks of 45,000 characters, one per cell from column F (a cell holds at most 50,000). The report's row holds the same
  id in its `Image` cell. The script checks the size (200,000 decoded bytes at most), the JPEG header and the base64, and
  the caps (6 images a player and 120 in all, per 6 hours, `over_`); an image it refuses is simply not kept, the report
  still is. No new scope: the script already writes the sheet.
- **Reading it** (the integrator, when a report is handled): read the tab with the Sheets connector (`get_values` on
  `'Report images'`, read-only), save the rows as JSON, then `node tools/report_image.js list rows.json` and
  `node tools/report_image.js decode rows.json <report id> out.jpg` (it checks the size and the JPEG header against the
  row). A picture never enters play by itself (rule A1).
- **Deleting it**: once the report is handled, the integrator clears the image's row, with the connector's
  `batch_clear_values` on the range `node tools/report_image.js clear rows.json <report id>` prints (a decided process,
  Pierre, 2026-11-21: «je la lis quand il traite le rapport, puis on l'efface»); never another row, never automatic. The
  Reports row keeps the id in `Image`, the record that the report had a picture.
- **Rule D7**: an image never outlives its report. A deleted account's reports go, and `repImgSweep_` removes the
  images of the reports that went; "delete, keep answers" keeps the reports anonymised but deletes their images
  (`anonReports_`); a merge or an archive renames the `Player` column (`repImgRelabel_`). The weekly pCloud backup holds
  the tab like any other (privacy.html: the backup copies made before a deletion).

## Accounts and signing in

**Signing in** (`signIn()` in `sync.js`). The welcome tour's sign-in step holds the form (`tour.js`, a `.tsync` box
filled by `bindSync()`), and a one-time card (`signinNudge()`) offers it again after `NUDGE_AT` (20) answers played
without an account (`reefid-nudge`; never in the admin-token browser). The account is the app's, not a subject's: the 20
answers count in every subject (`sync.js` `answersAll`: each subject's `~level` ok + ko, which sign-out clears).
Skipping the tour before its sign-in step (Skip or Escape) shows the same card at once, without using up the 20-answer
one (skipped on the sign-in step itself, the form was seen and dismissed: no card then); once signed in there, its
button reads "Start playing" and opens the photo quiz.

Answers played before signing in wait in `reefid-log0` (outside the `reefid-sync-*` keys, so never in the progress data)
and join `SYNC.log` at sign-in, so the `Answers` tab gets them too. A new name keeps the device's progress and sends it.

**A known name asks first.** Players type only their first name, so two of them can pick the same name and code. When
the sheet answers `found`, on every device (a fresh one too: everyone confirms the account once per device), the
sign-in box (the card, the tour's step, the header button: all `bindSync()`) shows "Is it you? An account named X
already exists: N answers, last played D.", and how many answers of this device would join it. `core.js` `accountOf`
reads the numbers from the reply (answers: `~level` ok + ko, else the units answered; last play: `~level` `at`, else
the latest unit's `at`, else the sheet's `updated`, said "last saved"; a missing field is left out of the sentence).
*Yes, it's me* signs in; *No, it's someone else* merges, saves and sends nothing and returns to the form, the name
focused, with a hint to add the surname's initial. The name field asks for "First name + initial" from the start, and a
name taken with another code (`error: 'pin'`) says "Someone already uses the name X. If it isn't you, add your surname's
initial (X B.). If it is you, check your code." Simple codes stay allowed: people must remember them.

Once a known name is confirmed, the sheet's settings and quiz state win. When `reefid-log0` held answers, what was
played since the first anonymous answer is added to the sheet's progress
(`mergeProgress(reefid-anon-base, local, sheet)`, `reefid-anon-base` being the progress just before that answer, so leftovers of an older sign-out are never
counted twice or credited to another account); else the sheet's replaces it. Then the page reloads and the start-up
sync sends the result.

**Reserved names.** A new account whose name holds, as one of its words in any capitalisation, a member name of
`Object.prototype` (`constructor`, `__proto__`, `toString`, `valueOf`, `hasOwnProperty`…) or `prototype` (`core.js`
`RESERVED_NAMES`, `reservedName`) is not made: when the sheet answers `found: false` the form says "This name is
reserved, please choose another." and sends nothing more. The sheet refuses it too: a save that would create it answers
`error: 'reserved'` before anything is logged, and the app then stops and says "Not saved: this name is reserved,
please choose another"; an admin archive name holding one is refused as well (`users_` `userArchive`). The same refusal
covers a name holding anywhere the seedling or one of its look-alikes (`core.js` `SEED_LOOKALIKES`: 🌱 🌿 🪴 ☘ 🍀 🍃):
the seedling is the admin's own mark, shown after the admin's account name on the leaderboard, so no player can show
it. Otherwise a name is any text: trimmed, at most 40 UTF-16 code units (the form's `maxlength`, `Code.gs` `clean_`),
matched case-blind (`toLowerCase`) with no Unicode normalisation. An account that already has a reserved name signs in,
loads and saves as any other; the sheet's maps by player have no prototype (`Object.create(null)`).

**Sign out clears the device's progress** (`reefid-sync-coral-progress`, `-quiz`, `-reset`, `reefid-log0`,
`reefid-nudge`, `reefid-anon-base`, and the other subjects' and per-device records, `sync.js` `signOutClear`; a second
click confirms when answers are unsent), so the next player starts empty and leftovers never get merged into someone
else's account.

## Saving and loading

**Devices on one account.** Every change triggers a pull, a three-way merge (against `SYNC.base`), then a send. The app
also pulls and merges, without writing, on start-up, when it comes back to the screen (30 s throttle) and when back
online, so progress made on another device shows up without answering a question first. Each send carries `at`, the
sheet revision it merged against; if another device wrote in between, the sheet answers `stale` (the answers still
logged) and the app pulls, merges and sends again (at most twice). The app keeps unsent answers (2,000 at most) until
the sheet confirms `log: true`.

### Lighter saves on slow lines

The device keeps the saved copy at the revision it merged against (`SYNC.sd` `{rev, d}`, as a load serves it: the new
key names, no `_acct`; `sdSeen` after a load, `sdSaved` after a save, checked against the reply's `sum`). Then:

1. **No load before a save** (`skipPull`) when the copy is held at `SYNC.srv`, the account's generation is known, no
   answers are logged from a refused save (`lg`), no anonymous answers wait to move, no send's reply is missing, and it
   is not the page's first sync (which still loads: `repsPulled`). The held copy is merged as a load would have brought
   it (unchanged: `mine`). If another device saved since, the save's `at` gets `stale` with the load itself (`Code.gs`
   `load_`, read once the lock is released), before anything is counted or logged, and the app merges it and saves again
   at once, its answers still queued.
2. **Only what changed**: `dz`, `core.js` `dataDelta` against the held copy (per key; per unit inside an object such as
   a subject's progress), with `sum`, the checksum of the whole data (`dataSum`: every object's keys sorted, so the order
   a copy is spelled in does not matter). The sheet rebuilds the copy (`lightData_`, `dataPatch`) and keeps it only if
   its checksum is the app's, else answers `delta` before counting or logging anything (the answer caps included); the
   app then loads again and sends its data whole until the script version changes (`SYNC.nd`: never a loop of refused
   deltas).
3. **Gzipped**: `{z: base64(gzip)}` (`CompressionStream`) when longer than 1 KB, else `{lt: …}`; wrapped either way. A
   body the script cannot read answers `zip`, and the app sends it unpacked until the script version changes
   (`SYNC.nz`).
4. The sheet adds the **old key names** to what it stores (`core.js` `withLegacy`, for an app from before the rename),
   serves loads under the new names only, and takes the hold's ids from `pt` only (`hold_` `light`: not the last 500).
5. A load of the copy the device holds (`have` = its revision) comes back `same: 1` without it (`syncGet` gives it the
   copy held when it asked).
6. **Waiting on a slow line**: a save goes 3 s after the first change not sent (`SAVE_WAIT.MS`); when the last sync took
   more than `SAVE_WAIT.SLOW` (8 s), it waits twice that, at most `SAVE_WAIT.MAX` (20 s) (`syncSoon`); leaving the app
   sends it at once.

`node tools/syncperf.js` measures it (the app's `sync.js` on the in-memory script, 1,500 answers of history, 35 KB of
progress): one device, per answer, 1 request (2 HTTP round trips), 2.6 KB up and 0.9 KB down, about 1.1 s on the line at
the field link's 86 kbit/s and 400 ms, where the full load-and-save took 2 requests, about 81 KB up and 92 KB down and
11.5 s.

**Answers whose save may not have counted them.** Answers logged from a refused save (`lg`) keep the replay asked for
(rules version 0), adopted again at every load and save until a save carries them (`lgFor`; an older app's per-subject flag `lgOk` is
dropped). A save whose fate is
unknown sets the same flag (`fateUnknown`): its reply never came (the line, a request cut by the background, no answer
in `SAVE.TIMEOUT`, a reply that is not the sheet's JSON) or the script failed in it (`server`). The sheet may have logged
and written it and another device saved over it since, so a plain merge could count its answers twice; the replay of
the log counts each once by its id. A subject whose replay that load cannot adopt (no replay in the reply, an answer
queued here older than the log's last one, the fish units not in yet) waits instead of merging, its rules version back
to 0 (`mergeSubject` `waitRp`). Tested in `tests/lightsave.test.js` (with a property test of light devices, a classic
one and an older app on one account); the harness is `tests/syncpage.js`.

### A save that fails

`sync.js` `SAVE`, `sheetCall`, `saveFailed`, `saveOk`, `saveRetry`; `tests/savefail.test.js`.

- A failed try of a passing kind (no reply, no answer within `SAVE.TIMEOUT` 90 s, a reply that is not JSON, or the
  sheet's `busy`, `stale` again, `lock`, `server`, `save`) is tried again by itself after `SAVE.RETRY` (5, 10, 20, 40,
  60, 120, then every 300 s) while the app is in view and online.
- A try during which the app went to the background (`visibilitychange` hidden, `pagehide`, `freeze`: phones stop a
  hidden page's network) is not counted and is tried again when the app comes back, at once, without the 30 s pull
  throttle. Leaving the app sends a save still waiting for its timer.
- **"Not saved" shows only once saving has failed `SAVE.RED_N` (3) counted tries in a row over `SAVE.RED_MS` (60 s) at
  least** (with the retries above: at the 5th try, 75 s after the first failure); `pin`, `wait` and `gone` are red at
  once. The red state is the account record's `SYNC.err` (`net` for a run of failures, else the sheet's error, as
  `saveFailed` sets it). The answers stay queued meanwhile and the whole queue goes at the next try.
- The run of failures is kept in the account record (`SYNC.fail`: `n` counted, `hid` cut by the background, `at` the
  first failure, `why`, `d`), so a reload keeps counting.
- Events (kind `sync`): `save failed: <error>` when the red shows, `save recovered: <error>` when a run with a counted
  failure ends with a save (the player saw nothing). Where says what the last failed try did, e.g.
  `load · no reply · 0.4 s · try 5 · 76 s · 0 hidden` (the step: `load` the pull before the send, `save` the send; the HTTP status when a
  reply came; its seconds; the tries; seconds since the first failure; tries cut by the background). The sheet's errors
  read as `sheet said <error>`. The admin's Errors page counts only `save failed` as failed saves and shows the last
  try; To do leaves out `save recovered`.

## One-time notices after the first sync

For a signed-in player, the one-time cards (the update notes `recalcNotice`, the rules versions' cards `rvNotice` with
the apology `RV_SORRY`, the apology card `sorryNotice`, a subject's card `subjHello`, the leaderboard note
`boardNotice`) and the achievements check (`achCheck`: their toasts) wait for the visit's first sync (`sync.js`
`noticeLater`); so would the card of a learned mark taken away (`progress.js` `mxLostNotice`) and the achievements it
takes back (`achRecheck`), which show and take nothing while `model.js` `MXL.QUIET` holds (a card or a recheck still
due is dropped unseen; rule D6). The waiting notices go when its pull and merge are done (`noticesGo`, from the end of `syncPush` / `syncPull`, whatever the reply: offline, an error or a refused
code shows them at once from this device's state), or after `NOTICE.WAIT` (20 s) at most. Each is then decided on the
merged state: the progress and achievements of every device, and **the notices told on any device of the account**,
`reefid-sync-told` (`core.js` `TOLD`, `toldUnion`). Its tokens: `recalc:<note id>`, `rv:<version>` (a fish rules
version as `rv:fish:<version>`, `progress.js` `rvId`), `mx:<unit>@<its s.mx>`, `sorry`, `hello:<subject>-<mode>`,
`board`, `allmet:<subject>-<reason>`, `left:<subject>` (the custom quiz's reminder). The record is written when a card
is closed (`toldAdd`, with a save), merged as the union at each sync (`toldMerge` in `mergeSaved`) and in an account
merge (`mergeUsers`), cleared at sign-out with the account's keys, and deleted and archived with the account's data
(rule D7). Each card's own device mark (`reefid-recalc`, `reefid-rv-msg`, `reefid-mx-lost`, `reefid-sorry`,
`reefid-<dev>hello-<mode>`, `reefid-board-told`) counts too; the first time this code runs on a device, the marks it
holds go to the account signed in then, never to a later one (`progress.js` `toldSeed`, `reefid-told-seeded`), so a
shared device's next player never takes them. Not signed in: no wait, no tokens, the device marks only. Any script
stores the record as it comes. Tested in `tests/notices.test.js` and `tests/pages.smoke.js` `noticesAfterSync`
(`SMOKE_ONLY=notices`).

## The opening hold

The opening hold (`model.js` `holdStep`, LEARNING.md "Held while the player falls behind") follows a signed-in player
from one device to another. The load's reply carries `hold`, its CUSUM computed by `Code.gs` `hold_` over the player's
logged answers in time order since their last progress reset (`reefid-sync-coral-reset` in the saved data), leaving out
the gentle restart's answers (`|w`; the comeback's, `|c`, count with their own logged `e`), and `holdIds`, the ids of
the player's last 500 answers counted and of every answer from the request's `pt` on (as the replay's `ids`, up to the
2,000 a queue holds), so the app never adds again the answers of a send whose reply was lost. The reply to each
successful save carries both too, computed over every answer then logged in time order, so a device that sent answers
older than another device's takes the right value at once. `HOLD.SLACK` in `Code.gs` is `INTRO.SLACK` in `model.js`
(`tests/sync.test.js` replays the app's own `holdStep` on the same answers). One path for every subject the sheet
replays (`Code.gs` `holdSubjects_`, `holdsInto_`): a light request's reply (every app since the lighter saves) also
carries `holds`, `{subject: {h, ids}}`, each subject's hold over its own answers since its own reset
(`reefid-sync-fish-reset`…), as the device keeps one hold per subject (`model.js` `HOLDK`); the replay subject's is
`hold` and `holdIds` too, and a request without `light` gets those two alone, as before. Cached per player and subject
(`hold~<subject>:` and the name) until answers are logged or moved for that name. The app adopts each subject's own
(`sync.js` `holdOf`, `holdAdopt`, as that subject, [record](../decisions/2026-11-20-one-hold-path-app.md)) from `holds`
once the reply's script is at `HOLDS_SHEET` (rule D4); before it, or in a reply without `holds`, the replay subject's
alone from `hold` and `holdIds`, the other subjects keeping the device's; a subject the reply leaves out keeps the
device's too. The app (`sync.js` `mergeSaved` for each subject it merges, every subject after a save, then `model.js`
`holdSync`) adds the answers of that subject the sheet has not confirmed yet (`SYNC.log`, without the `|w` ones and
those before its reset) and takes the result as that subject's hold (`reefid-hold`, `reefid-fish-hold`…): the same sum
over the same answers on every device. A reset made on this device and not sent yet ignores the reply's hold of that
subject. A player not signed in keeps the device's hold only.

## Full replay

Progress is recalculated from the whole answer log, automatically, whenever the progress engine changes (rule D5,
LEARNING.md "Full replay"); the log is the reference for progress (rule D9).

**The engine is the app's.** `core.js` is embedded at the end of `Code.gs` between
`// BEGIN core.js (generated by tools/sync_core.py, do not edit)` and `// END core.js`, inside a function that gives it its own `module`, so its names
stay out of the script's globals (where `TRUST`, `PHOTO_W`, `MEM`, `PLAYER0` are Code.gs's own); the script reaches it
as `CORE_`. `tools/sync_core.py --fix` writes it, `--check` runs in CI, and the self-updater installs it with `Code.gs`
(one file). Code.gs keeps its own `pctOf_` and the Elo of `stats_`; `CORE_` serves the replay.

**Asking.** Requests carry `rv`, the rules version this device applied (`sync.js` `rvApplied`, key
`reefid-sync-coral-rv`, synced with the progress): `GET ?…&rv=N&pt=T`, `POST {…, rv, pt}` (a save) and
`POST {anon, anonAnswers, rv, pt, reset, rvs, sreset, sstart}` (a device that never signed in). Signing in to an existing account takes the account's
`reefid-sync-coral-rv` (0 when its data has none), never the device's (`sync.js` `signIn`).

**Replaying.** When `rv` < `CORE_.RV` (`core.js` `RVS`), `replay_` replays the player's rows of the Answers tab since
their last reset (`core.js` `replayProgress`, with `stats_` `mem` and `conf`, and the units' `look` and `fam` from
`data.json` on GitHub, `gen_`, cached 6 hours as `gen1`; none when it cannot be read). The reply carries
`replay: {rv, n, rec, ids}`: `rec` the replayed record per unit and `~level`, replayed with today's rules, the known mix-ups term
included (`core.js` `CF_LOGGED`: the app's own term taken out of the logged `e`), with per unit `lm`, the time of the
last miss that left its progress below the learned mark's keep rule (`core.js` `mxKeeps`), so `replayedOf` drops a mark
passed before it, as the game does; `ids` the ids of the rows replayed from the request's `pt` on (the time of the
oldest answer the device still queues) and at least the last 500, so a lost reply's answers still queued are never
counted twice. The anonymous request also carries `reset` (the device's `reefid-sync-coral-reset`): its replay counts
only the answers since. The first-launch answer's prior enters the replay at each answer (`core.js` `replayProgress`
option `starts`, `startPriorAt`; [cards.md](cards.md#replayed-with-the-progress)).

**Kept.** Replays are stored in the **Replayed** tab: Name (or `~anon <id>`), Rules (rv), Rows (n), Since (the cache
identity, `rplSince_`: the reset in ms, then `#` and the first-launch history's fingerprint `core.js` `startFp` when
there is one, then `~` and the structure stamp when it is not `''`, below), Updated, Record
(JSON in 45,000-character chunks from column F); a row is reused while the rules version, the row count, the reset, the
fingerprint and the stamp are the same, and the reply sends that fingerprint with the replay (`fp`). The player's
Progress data and RAs copy is never written there. Admin delete, merge and rename drop the player's Replayed row. The
Answers tab is read once per request (`answerRows_`, shared by `hold_`, `stats_` and `replay_`). An app without `rv`
gets no replay. The admin shows the replayed values (Players' Progress column and "↻ saved" marks, the Journey's
Progress).

**Adopting** (`sync.js` `replayAdopt`; LEARNING.md):

- A reply to a save or an anonymous send is adopted only if the device's reset is still the one the request carried (a
  reset made while it was on its way: the next reply brings the replay from the new reset), and only if its `fp`
  matches the first-launch history the device now holds (else the save that follows carries the merged history and
  brings the right replay). The reply to an anonymous send is ignored when the device signed in or changed anonymous id
  while it was on its way (`sendAnon` keeps the id it sent).
- After an adoption the merge baseline `SYNC.base` is the sheet's replay itself, without this device's own uncounted
  answers (`core.js` `replayBase`), so this device's unsent answers stay on top at the next merge (otherwise two devices
  adopting the same log count it twice, an older app's answers are dropped, or an unsent answer is taken into the
  baseline and lost).
- `mergeSaved` keeps the device's progress over a saved copy whose `reefid-sync-coral-rv` is below the device's (an app
  from before the replay saved it, or a copy older than the replay): the copy is not merged, and the device's version
  goes back to the copy's, so its next save (`syncPull` asks for one) brings the replay of the whole log again. The
  exception is the copy this device saved or loaded last, unchanged since (the reply's `rev` is still `SYNC.srv`;
  `mergeSaved` `mine`): already part of its progress, it is never merged nor taken for an older app's.
- A replay adopted from a save's reply is followed at once by one more save carrying the adopted version (`syncOnce`),
  so the saved copy reaches the rules version and the replays stop.
- A reset this device made that the sheet's copy lacks, or a reset from another device while answers after it are unsent
  here, also sends the rules version back to 0, so the save that follows brings the replay since the reset.

### Other subjects' replays

A subject with `SUBJECTS` `replayed` (the fish and the sea slugs; `core.js` `replayedSubjects`) is replayed by the same
`replay_` from its own rows (`subjRows_`, from the same read of the Answers tab as `answerRows_`), with its own units:
`replayed.gen` over its `replayed.file`, else its first pool file, read from GitHub (`Code.gs` `subjFile_`). The fish's
are `core.js` `treeReplayGen` over `fish.json`: the families' and the scientific genera's `look` and family line as the
app's `treeGen` and `treeGenera` build them (`tests/fishreplay.test.js`), cached 6 hours as `sgen1:fish`; the sea slugs'
`seaslug.json`, `treeReplayGen` at the genus, cached as `sgen1:seaslug`. None of `stats_`'s photo numbers are used (the
corals' only); every fish answer is logged with its scoring record and replays as the game scored it.

**The species by their scientific names** (v198; the app opens them from `SCI_SHEET`, rule D4;
docs/reviews/2026-11-18-species-step2-plan.md): both subjects' units also hold one unit per species under a genus
unit, `sci:` and the species id in letters and digits (`core.js` `LEVELS`, `spUnitId`, `treeSpUnits` `'sci'`:
`sci:s091`, `sci:xgoniobranchussp5`), with the other scientific species of its family as its look-alikes, its family's
line, and its genus as the unit it starts from (`from`), so a wrong pick of one counts against the species given (rule
L2) and nothing moves its genus, its family or its common-name unit. The Answers tab's patterns take such a key as
they are; a smaller fault's kind rides in the scoring record (`z`, above). `tests/scisheet.test.js` saves such answers
to the in-memory sheet and checks the replays it serves; the app's own units gain them in its app PR, so
`tests/fishreplay.test.js` compares every other unit with the app's until then.

- **Asked per subject** by the rules version the app applied to it (each subject its own list: the corals' `RVS`, the
  fish's `FISH_RVS`, `core.js` `rvsOf`, `rvOf`, so a fish replay never makes a coral device take its replay again):
  `POST {…, rvs: {fish: rv}}`, `GET ?…&rv_fish=N`, an anonymous send with `sreset` and `sstart` ({subject: the device's
  reset and first-launch record}); a signed-in player's reset and first-launch answer are the subject's keys of their
  data (`reefid-sync-fish-reset`, `reefid-sync-fish-start`). The reply carries `replays: {fish: {rv, n, rec, ids, fp}}`
  beside the corals' `replay`; an app that sends no `rvs` gets none.
- **Kept** in the subject's own tab, **Replayed Fish** for the fish (`rplTab_`, the same columns). A tab found empty,
  made by hand or by anything but `sheet_`, gets its header there too, and `find_` reads no name in an empty tab
  (`tests/fishadopt.test.js`). A record kept for a player whose key is a member every plain object inherits
  (`constructor`, `__proto__`) is never reused but made again. The rows are dropped with the corals' when an account is
  deleted, merged or archived, or a device's answers are claimed (`rplDrop_`). `Code.gs` `rplRec_` still reads a record
  kept in the older `{P, F}` form.
- **Adopted** as the corals' (`sync.js` `rvsAsk`, `rv_fish` on the load; `replayAdoptS`, run as that subject, with its
  rules version `reefid-sync-fish-rv` (`rvKey`), its reset as the cutoff, its units from `UNITS` `gen` and none of the
  corals' photo numbers; `mergeSubject` takes its rules version into the merge, `rpOn`), with no floor (rule D9: a bar
  may go down) and its own rules versions (`FISH_RVS`; a card told as `fish:<version>`, `progress.js` `rvId`, none for
  the fish's later versions). A refused save's answers (`SYNC.lg`, or a save whose fate is unknown) are not merged while
  the subject's replay cannot be adopted (its units not in yet, or no replay in the reply): its rules version goes back
  to 0 and the replay of its whole log is adopted once it can (`mergeSubject`).
- **The log is the only reference** (rule D9; LEARNING.md "The log, the only reference for progress"): `core.js`
  `replayedOf` and `replayBase` take the replay's record and answer count of a unit also when the device holds more
  answers there, and a unit the log has no answer on loses the answers the device counts on it; the level's answer
  count too (rules version 15, fish 7, sea slugs 4), the app's checkpoints counting on their own answer clock
  (`model.js` `tally`, ticked by `sync.js` `clockTick` before a merge or an adoption moves the count); no floor; no card for the recalculation (rules D5, D6); and the app never adopts
  a replay of a rules version newer than its own (`replayAdoptS`, `rvOf`), which it could not hold.
- A device that never signed in asks for the other subjects' replays as a save does (`sync.js` `sendAnon`: `rvs`, the
  structure stamps, `sreset` and `sstart` by subject; `Code.gs` `anon_` `replays_`) and adopts them (`replaysAdopt`,
  each subject's reset as sent the cutoff); signing in drops the device's fish rules version as the corals'
  (`signIn`), and sign-out clears it.

### Replays under the content editor's structure

A subject with `SUBJECTS` `structure` (the fish) has its units made from its first pool file with `curation.json`'s
circles and pairs laid over it by `core.js` `contentApply` (`subjRpl_`; the curation read from GitHub, its structure
entries kept as `scur1:fish` with their fingerprint `structFp`, the units and the stamp as `sgen5:fish:<fingerprint>`,
6 hours, so `fish.json` is read again only when the entries change; the cache names `sgen5`, `stree4` and `svar2` are
bumped when what they hold changes, so no cache of an older script is read, as `sgen4` and `stree3` were before the
scientific species; the units are about 560 KB for the fish and 100 KB for the sea slugs, in parts). The 15-minute
trigger reads the curation again before the leaderboard's replays (`subjStRefresh_`), and a device whose units hold a
stamp the sheet does not (`stn`, `sn_fish`) makes it read it at once, at most once a minute (`subjStSeen_`).

The app says the stamp its progress was replayed with (`sts: {fish: stamp}`, `st_fish`; `sync.js` `stsAsk`, from
`STRUCT_SHEET`); when it is not the sheet's, the sheet replays the log at the same rules version, and the reply says the
stamp (`st`, left out when `''`). The app adopts it as a replay (`replayAdoptS`: the same rules version under another
stamp; no card, rule D6) and keeps the stamp with its progress data (`reefid-sync-fish-st`, `stKey`: held as a key from
its first request, `''` for the base's, so its saves always say it; a whole copy saved without it keeps another
device's, `core.js` `keepSubjectKeys`; dropped at sign-in and sign-out as the rules version, and by `core.js`
`mergeUsers`: a merged record is no replay). A saved copy under another stamp than the device's is never merged into its
progress: the rules version goes back to 0 and the replay of the whole log is adopted instead (`mergeSubject` `stOff`).
The stamp joins the Replayed tab's cache identity after a `~` in the Since cell (`rplSince_`; a row of the base's
structure reads as before), and the leaderboard replays a listed player whose saved data says another stamp
(`boardRpl_`; the public `board_` reads the stamp from the cache only, never fetching). A curation that cannot be read
replays nothing: never the base's structure in place of the editor's. With every fish answer logged with its scoring
record, the replay scores each as the game did, so what a structure change moves in a record is a unit leaving or
joining the units (a family in or out of every circle, the genera of a family leaving or joining circle 1); the pairs,
the circles' parts of the score and the path move in the app (`tests/structure.test.js`).

**The leaderboard's tree.** With the units, `subjRpl_` makes the subject's score tree (`SUBJECTS` `replayed` `tree`:
the fish's `core.js` `treeBoardTree`, `treeScoreTree` over `treeGen`'s families and `treeReplayGen`'s genera, the app's
own `UNITS` tree; with the species level, the app's species tree `treeSp`, `treeScoreTree` on; with the scientific
species, `treeScoreTree` `sci`: each species its own entry with its `sci:` unit in the scientific place, about 33,600
characters and 662 entries, a player with none answered at the same %) from the same file and
curation, checked as a tree an app sends (`boardTreeOk_`) and kept as `stree4:fish:<fingerprint>` (made again when it
is missing beside cached units). `board_` ranks by it, from the cache only (`subjTreeKept_`), so the board's weights per
family and circle follow a circle Publish within the trigger's 15 minutes, whether a device saves or not, and a device
still on the old units cannot send the old tree back into force. When it is not cached, the board takes the tree the
apps sent (`boardUnits_`). The apps keep sending theirs (no gate).

**The corals too.** The subject the sheet replays (`SUBJECTS` `replay`) declares a structure (its look-alike pairs), so
its units come the same way: `gen_` through `subjRpl_` (`data.json` with the curation's pairs laid over it, `SUBJECTS`
coral `replayed` `gen`: `core.js` `genLooks`, cached as `sgen2:coral:<fingerprint>`, the curation's entries as
`scur1:coral`), refreshed by the same trigger (`subjStRefresh_`), and none while the curation cannot be read. The app
says its coral stamp on a load (`st_coral`, `sn_coral`), a save and an anonymous send (`sts.coral`, `stn.coral`;
`sync.js` `stsAsk`, from `core.js` `PAIRS_SHEET`); `stMain_` reads it for `replay_`, which replays at the same rules
version when it is not the sheet's, keys the Replayed tab's Since cell by it (`rplSince_`) and says it in the reply
(`replay.st`, left out when `''`); the app adopts it as the fish's (`replayAdoptS`, `reefid-sync-coral-st`). The
leaderboard's replays (`boardRpl_`) and the admin's Players (`replayedAll_`) read the same stamp. `data.json` is thus
read three times every 6 hours (the units under the pairs, the slate, the photo pools).

## The leaderboard follows the rules

Whenever progress is recalculated, the leaderboard is recalculated for every player, whether they come back or not
(rule D8). For every subject with a board and rules versions (`core.js` `rvsOf`: the corals' `RVS`, the fish's
`FISH_RVS`, any subject's `replayed.rvs`; no per-subject code), `board_` ranks a player whose saved copy applied an older
version (its `reefid-sync-<subject>-rv` key below `rvOf`) by the progress and level their app will hold once it adopts
the replay: `core.js` `replayAdopted` (the one `sync.js` `replayAdoptS` adopts with: `replayedOf` over the saved copy,
and for a subject replayed with a floor the units kept from the copy floored and the floor's typed opportunities kept)
of the record the subject's Replayed tab keeps for today's rules, row count and reset (`boardRpl_`, the same test as
`replay_`'s reuse). The level is the replayed one too (`replayedOf`: the replay's ability and answer count), from
`ELO_MIN` answers. With no record kept yet, or a player up to date: the saved copy's. The board reads only (one read of
the Answers tab and of each Replayed tab, only once a player behind is met; nothing fetched, no lock) and stays cached 5
minutes.

The records are made ahead by the 15-minute trigger (`autoUpdate`, once it finds the script up to date, after the
one-shot migrations: `boardWarm_`): every listed player (opt-out, admin hide and archive left out) behind the rules
whose record is missing or stale gets the replay `replay_` would make (`rplMake_`, outside the script lock; `data.json`,
`fish.json` and the photo statistics fetched there if not cached), all written under one short lock (`rplPut_`), each
only if, read again under the lock, nothing it was made from changed meanwhile: the account still there under the same
name and code and listed, the same saved data, the same answers of that subject since its reset, its Replayed row as
read (rule D7: an account deleted while its replay was made never gets its row back; otherwise the record is dropped and
made again at the next run if still needed). One player's failure never stops the others' (the board falls back to the
saved copy for them). Every map keyed by a player name has no prototype, `core.js` `replayProgress`'s per-player map
too. New replays start only within `BOARD_WARM_MS` (150 s) of the run, the rest at the next run; a board that got one is
dropped from the cache, and the Deploy log counts them. The player's own next sync reuses that record (`replay_`), so
the board shows what their app then shows. After a merge that appends a rules version, the boards follow within about 30
minutes (the self-update, then the next run). `tests/board.test.js`.

## Pooled photo statistics

The photo statistics pool every trusted player's answers (photo Elo, confusions, photo memory, genus and format offsets;
LEARNING.md). They are built incrementally, so a request never reads the whole Answers tab.

**Served from a snapshot.** `?stats=1` is served by `Code.gs` `statsServed_` from the snapshot (cached 20 minutes in
parts, `statsS<VERSION>`), and by `stats_(true)` only while there is no valid snapshot (one made by this version, at most
an hour old, after the last delete, merge or archive). `stats_` keeps its own cache (`stats17`).

**The fold** (`statsFold_`, run from the 15-minute trigger after the leaderboard's replays: `statsFoldRun_`, skipped when
the run is already 4 minutes old). It reads the rows after its cursor 2,000 at a time, at most 30,000 rows and 60 s a
run, and the next run goes on. Once it has read the last row it **settles** the answers older than a day (`STATS.LAG`)
in time order, keeps the newer ones **pending** (folded again on top at each run, for what is served) and writes the
reply, under the script lock (a delete, merge, archive or rewrite of the log since the run began, or the lock busy:
nothing written, the next run goes on). It gives exactly what `stats_` makes from the whole log
(`tests/statsfold.test.js`, at 6 to 100,000 rows a run, through every rebuild). `stats_` reads the answers oldest first
by their time, decides who is trusted on each player's whole log, leaves out `sxSet_`'s ids and checks the photos
against today's pools, so the fold **starts again from the first row** (a rebuild, in the same bounded steps, the last
reply served meanwhile) when an answer is logged older than what is settled (a device a day late), a player with settled
answers changes trust, the ids left out change, a game pool changes for a photo already folded (`statsPoolFp_`), the log
is rewritten (`statsDirty_` from `relabel_`, `dropRows_`, `anonDelete`, a one-shot migration: a sign-in's anonymous
answers, a merge, a delete), the script version changes, the snapshot is missing or unreadable, or its cursor disagrees
with the Script Property `STATS_FOLD` or its row no longer holds the answer id it read. `stats_` and the fold run one
step (`statsStep_`, `statsOut_`; `core.js` `fmtPoint` and `fmtFit` for the format offsets, `fmtOffsetsOf` their sum;
`ptimeStep` and `ptimeInto` for the photos' time terms), so a change to the statistics changes both at once.

**The photos' time terms.** A photo with a time term carries three more numbers in its `photos` entry, after the five:
the time term, the enlargement term and the information its rating has gathered (`core.js` `ptimeInto`, `ptimeOut`;
LEARNING.md "The photo's time term"); a photo with neither term keeps its five. The app reads them from a reply of
`core.js` `PTIME_SHEET` or later (`model.js` `ptmOf`, rule D4). The corals' full replays read the time term too
(`replayProgress` photos: a right answer's time netted of it, LEARNING.md "The player's time net of the photo's"). On the real log of 2026-11-20 they add about 25% to the
corals' `photos` (79 to 99 KB) and 19% to the fish's.

**The `Stats` tab** (internal, versioned by `STATS.FMT`, 4: no other code reads it). Columns Part, Version, Updated,
Rows, Roster, Note, then the JSON in cells of at most 45,000 characters from column G (`statsPut_` adds the columns a
longer JSON needs; a new tab has 26). Row 2 is the reply served (what `?stats=1` sends, no player); row 3 the fold,
which keeps by admin id (`aid_`, never a name) each player's trust counts, ability, photo memory buckets, timed answers
and enlarging habit (the time terms' `tm`, `core.js` `ptimeNew`) and the pending answers (unit, answer, mode, photos,
choices, expectation, seconds, enlarged, rank), about 45 characters per answer row at 6,000 rows (270 KB, 7 cells) and
22 at 50,000 (1.1 MB, 25 cells) before the time terms, which add each player's timed answers (a few hundred keys) and
five numbers per rated photo; row 4 the admin's part (below). A delete, merge or archive, a change to who
is left out and `anonDelete` blank the fold and the reply at once (rule D7, SECURITY.md "Removed accounts"). Run times
measured in node on the in-memory sheet (Apps Script adds the Sheets reads and writes): a first build 0.2 s at 6,000
rows and 1.2 s at 50,000; a run with a quarter hour's new rows 0.06 s and 0.3 s.

**Per subject.** Every subject with game photos (`SUBJECTS` `pool`: the corals, the fish, the sea slugs) has its own
fold, snapshot and reply, made by the same rules over its own answers (`stats_(read, sid)`, `statsFold_({sid})`,
`statsServed_(sid)`; `statsSid_`, the corals by default). The fish's are in the tab `Stats Fish` (`statsTab_`), their
cursor `STATS_FOLD_fish` (`statsProp_`), their caches `statsS<VERSION>:fish` and `stats17:fish`, served by
`?stats=1&s=fish`; the sea slugs' in `Stats Sea slugs`, cursor `STATS_FOLD_seaslug`, caches `statsS<VERSION>:seaslug`
and `stats17:seaslug`. The trigger folds each subject after the other while the run is under 4 minutes. A rewrite of
the log marks every subject's fold; a delete, merge or archive blanks every one.

- The sea slugs' pool is `seaslug.json`, `seaslug-game.json` and their part of `curation.json` (`SUBJECTS` `seaslug`
  `pool`, read by `core.js` `POOLS` `entries` through each file's role, `pool` `as`, and the subject's own curation
  part, `treeCur`), their genera the units; cached as `pool4seaslug` (about 110 KB, in parts).
- The `?stats=1` reply names the subject it rates (`s`). **The app reads the sea slugs' own** (`SUBJECTS` `stats`: the
  script version that serves them; `sync.js` `loadOwnStats`, asked for the subject on screen with the corals' every 10
  minutes and when the player switches to it, kept only from that script and only from a reply naming that subject,
  stored as `reefid-photo-stats-seaslug`; `model.js` `statsJoin` joins their photo ratings, genus offsets and confusions
  to the corals' in `PSTAT`, `PGD`, `PCONF`, whose keys are the subjects' own photo and unit ids). Their draw, traps and
  data look-alikes follow their players' answers; their photo memory and format offsets stay the prior and none
  (`pmem`, `pfmt`), as the sheet's replay of them reads none.
- The fish's rows are rated at the rank each question asked (a family or a species unit as the "genus" of the
  hierarchical photo Elo, its pairs among the choices offered). **The app reads the fish's own** from v189, the same
  way (`SUBJECTS` `fish` `stats`, `core.js` `FISHST_SHEET`; stored as `reefid-photo-stats-fish`): their photo ratings,
  unit offsets and pairs join the corals' in `PSTAT`, `PGD`, `PCONF` under keys of their own (photo ids, `f:`, `g:`, `s:`
  unit ids), so the fish draw, traps and look-alikes follow their players' answers. A photo shown at several ranks is
  rated under the last unit that rated it, which every reply names as each photo's 5th element from v189 (`statsOut_`,
  `core.js` `eloOf`); `model.js` `photoDiff` swaps that unit's offset for the one of the unit asked (LEARNING.md
  "Hierarchical photo Elo"). The reply also carries `mem`, `memn`
  and `fmt`, which the app ignores for the fish (`model.js` `pmem`, `pfmt`: the prior and none), as the sheet's replay of
  the fish reads no pooled number: each answer carries the scoring record it was scored with (`core.js` `scoreRec`), so
  the device's record and the sheet's replay stay equal (`tests/fishstats.test.js`). FISH_PATH.md's confusion views
  (family to family, species to family, shrunk to the family's) are not built.
- **Quota with three subjects**: one fold per subject per 15-minute run (a run reads the new rows only, a rebuild the
  whole Answers tab 2,000 rows at a time, 60 s at most a run), one `pool4` entry per subject in the script cache (the
  corals' about 43 KB, the fish's about 670 KB, the sea slugs' about 110 KB, each in parts under 100 KB), and one more
  `?stats=1` request every 10 minutes per device playing the sea slugs or the fish (served from the snapshot's cache; the
  fish's reply is about 125 KB on 2026-11-18, about 40 KB more with each photo's unit from v189, growing with the
  photos rated and the pairs offered; the served reply is cached in parts, `cacheBigPut_`).

**The other readers** use the numbers over all the data, stored, never simplified. The admin's `readStats`
(`POST {readStats, token, s}`, `s` the subject, the corals without it) is served by `statsAdmin_` from row 2 and **row 4**, the
admin part the same run writes (`Part` `admin`; both rows carry the run's start in Note, so a reader never mixes two
runs): each player's ability by admin id (`ras`, rounded as `stats_` does, less the answers of a deleted account, the
fold's `D`, and less the players archived at the time of the read, `archivedSet_`) and `skip`, with `chk: 1`; never
cached. The replays (`rplMake_` for the corals, `replayedAll_`) read the pooled statistics through `statsServed_`. Each
makes `stats_` itself when the snapshot is not served (missing, older than an hour, another version, older than the last
delete, merge or archive, or rows 2 and 4 from two runs). The other subjects' replays take no pooled statistics. In
`tests/gas.js` the snapshot is off unless a test asks for it (`opts.stats`).

## Events and pages

The app queues events (`ev`, `reefid-evq`) and sends them in batches (`sync.js` `evBatch`, `sendEvents`). The sheet's
`events_` keeps only the kinds it knows (`EVK`: `err`, `photo`, `sync`, `pulse`, `load`, `pages`, `fromhome`) in the
Events tab, whose admin read (`readEvents`) is the last 3,000 rows. Like every request, never sent from a local copy.

- **The one-tap questions and the tips** log as `pulse` events: `r` as text in the Message column and `src` (the item,
  or `tip:<id>`) in the Where column; Detail keeps `r` only for `easy`, `ok`, `hard`, the codes the difficulty items
  use; a row with an empty Where counts as the first item (`PULSE0`). The admin reads them in To do › Errors
  ([cards.md](cards.md#one-tap-questions)), each subject's apart: the subject of the Page column's address
  (`admin.js` `subjOfHash`).
- **First page from Home** (`fromhome`): which page players open first from Home, so the loading tiers ("Load order in
  tiers") can follow real use. `app.js` `fromHome`, called by `route()` before it draws a page, sends one event a visit,
  the first time a Home it drew is left for another page: the page name (`core.js` `pageName`) in the Message column,
  `{s, w, tr}` in Detail (the seconds since Home was first drawn, whether the page's tier was still on its way so the
  player saw the loading bar, whether the welcome tour ran this visit; the tour's own steps are not counted). The `load`
  event's `nx` (the first page after the first page drawn) is close, but is lost when that event leaves first (at the
  first quiz photo or after 3 minutes) and counts the tour's steps. `tests/fromhome.test.js`, `tests/sync.test.js`.

### Pages opened

Which pages players open and for how long, first-party, with no outside service or script (privacy: `privacy.html`
"Which pages you open", About › Privacy).

**The tally.** The app keeps a tally of the visit (`sync.js` `pagesRoute`, called at the end of `app.js` `route()` for
the page actually drawn, not a link that sent on; pure functions in `core.js` `PAGES`, `pageName`, `pageFrom`,
`pagesOpen`, `pagesStop`, `pagesResume`, `pagesTake`, `pagesSummary`). Per page name (`home`, `practice.quiz`,
`practice.custom`, `learn.genera`, `learn.genus`, `learn.look-alikes`, `learn.compare`, `identify.key`, `progress`,
`leaderboard.achievements`, `tools.…`: the address's section and page, its things and filters dropped; the oldest rows
hold older names, `genus`, `quiz`…, until the sheet's one-shot renames them) it counts the times opened and the seconds
on screen (only while the app is visible). A page drawn with another subject than the corals on screen carries that
subject's prefix (`core.js` `SUBJECTS` `pv`: `fish.practice.quiz`, `fish.home`…, `pageName(h, pre)`; the corals' is
empty), and switching the subject on the same page closes one page and opens the other (`pagesRoute` keys on the hash
and the prefix). The rows from before the prefix are all read as coral pages. The admin's Journey reads it back with
`pageSubj` ("practice.quiz (Fish)"). Per genus sheet it keeps `[times, seconds, from, asked]`: `from` how its first
opening was reached (`quiz`: the answer's feedback; `learn`: Genera, a sheet, Look-alikes, Compare; `progress`: My
progress, achievements, leaderboard; `other`), from the page before it or, for the quiz feedback's link that opens a
new tab on a computer, from the link clicked (`reefid-pv-link`, 30 s); `asked` whether the genus had been asked to the
player before (`P[g].ok + ko`).

**The summary.** When the app is hidden (`visibilitychange`), `pagesSend` queues one `pages` event with the summary
(`r`, `g`, capped at 30 pages and 30 genera), the visit id `vi` (random per page load), the answers so far `na`
(`answersSoFar`), the screen `vp` once the replies say `v` ≥ `sync.js` `VIEWPORT_SHEET` (`viewportOn`, rule D4) and,
once the answers' feedback was shown, the four feedback-sheet numbers `fb` (ARCHITECTURE.md "The More counter"); then it
starts a fresh tally (coming back adds another summary with the same `vi`; the page still in view counts 0 times).
`pagehide` does the same, for a browser that closes or reloads a page without a hidden event first; after a hidden
event the tally is empty, so nothing is queued twice ([decision](../decisions/2026-11-23-pages-kept-copy.md)). A page
killed with no event at all (the app or the phone stopped, a crash) still loses its summary so far. The
screen `vp` is `{w, h, d, o, b}` (`core.js` `VIEWPORT`, `viewportOf`): `innerWidth` and `innerHeight` rounded to 10 px,
`devicePixelRatio` to one decimal and clamped, `o` portrait or landscape, `b` the band of the exact short side (0 ≤360,
1 361-390, 2 391-414, 3 415-600, 4 wider, since the 10 px grid cannot keep the edges); `pagesClean` rounds and clamps it
again and keeps the band only when it agrees with the rounded size. It feeds admin Players › Visits › Screens
(`admin-visits.js` `screensOf`), for designing multi-photo game formats on the screens players really use.

**Whose it is.** Each summary is queued with its owner (`o`, `core.js` `pagesOwner`: `n:<name>` signed in,
`a:<anonymous answer id>` otherwise) and kept on the device: a request (`sync.js` `evBatch`, `core.js` `pagesBatch`)
sends only the summaries of the player active now, without `o`, and drops from the queue any queued for someone else,
so a summary left waiting (offline, a failed send) is never sent under the next player. At sign-in the device's
anonymous summaries become the account's (`pagesOwn`, as its answers do), and sign-out drops the summaries still queued.
`sendEvents` adds to a request holding one the player's id: `eanon` (the device's anonymous answer id,
`reefid-anon-id`) or, signed in, `ename` / `epin`. The sheet (`events_`, `evWho_`) stores it as the admin's id of the
player (`aid_('~anon ' + id)`, or `aid_(name)` after checking the code; '' on a wrong code), never the name or the raw
id, in the Message column of the **Pages** tab (same columns as Events), the summary cleaned by `core.js` `pagesClean`
in Detail. The Pages tab follows the answers (`pagesMove_`, `pagesDrop_`): when a device's anonymous answers are claimed
at sign-in (`anon` in the first send) their summaries move to the account's id, and an admin rename, merge or delete
moves them as it moves the answers (to the new name, the merged name, or the answers' `~deleted` id); a delete with the
answers and `anonDelete` delete them (never a named player's). `POST {readEvents: 1, pages: 1, token}` reads the last
10,000 rows of that tab (`PAGES_READ`), so errors and load times never push them out of Events' 3,000-row window.

**The admin** (`admin.js` `loadPages`, `pagesRows`, `sheetsOf`): the read is kept 5 minutes, an error 30 s, and read
again when Stops or a Journey is drawn after that (`pagesFresh`, which redraws once when a new read arrives, never on a
cached one: no render and read loop); ↻ on Activity reads it again. Analyses › Learning › Stops › Genus sheets opened
(`healthSheets`: by experience band, answers so far under 50, 50-300 and over 300, the players and visits and the share
that opened at least one sheet; Without me drops your visits) and the Journey's Genus sheets opened (per genus the
times, the time, first opened before or after the genus was first asked, from where; the pages they spent most time on;
`#players/list/journey/<name>` and `#players/list/anon/<id>`). `admin.html?demo` serves a Pages tab of made-up visits.

## The Timings tab

How long the script's operations take, so the move of the answer log to another store is decided on a measured
threshold. **No player data**: one row per measured operation, `Time`, `Op` (a fixed name in the code, never built from
a request), `Ms`, `Rows` and `Cols` (what a whole-tab read read; for a request, the `Answers` rows it saw), `Version`
(the script's) and `Weight` (how many calls the row stands for); never a name, code, device, answer id or answer content
(rules D2, D7: an account's delete, merge or archive has nothing to clean there). `Code.gs` `TIM`, `timStart_`, `tim_`,
`timEnd_`, `timTrim_`.

- **Measured**: the whole-tab reads of `Answers` (`read Answers`, `logRows_`: `answerRows_` and the admin's readAnswers)
  and of its Id column (`read Answer ids`, `freshAnswers_`, `logAnswers_`), the photo statistics' build (`stats build`,
  a cache miss of `stats_`), every player's saved data (`read Progress data`, `datas_`), the leaderboard's replays
  (`board warm`), each run of the pooled statistics' fold (`stats fold`, its Rows the answer rows it read) and a read of
  its snapshot (`read Stats`, a cache miss of `?stats=1`), and as a whole a completed `save`, an `anon save` that
  logged, a `load`, a public `stats` request, the admin's readAnswers (`admin answers`) and each run of the 15-minute
  `trigger` (`autoUpdate`).
- **Sampled per request**: 1 request in `TIM.EVERY` (50; a trigger run 1 in `TIM.EVERY_TRIGGER`, 16) keeps every row it
  measures at that weight; any other request keeps only an operation slower than `TIM.SLOW` (5 s; a trigger run
  `TIM.SLOW_TRIGGER`, 60 s) at weight 1; at most `TIM.ROWS` (8) rows a request. The rows wait in memory and are written
  at the very end of the request (`doGet` / `doPost` / `autoUpdate`'s `finally`), after every script lock is released,
  one `appendRow` each (atomic, so two requests ending together never write over each other), inside try/catch: a
  failure loses the rows, never a reply.
- **Bounded by the trigger** (`timTrim_`, its one writer of deletions): past `TIM.MAX` (4,000) rows the oldest rows are
  deleted in one `deleteRows`, back to `TIM.KEEP` (3/4) of it. The tab keeps the recent months (about 50 days at the
  expected 60 rows a day) at a fixed size, every kept row as it was logged, so the weighted figures stay unbiased; past
  twice that (a trigger that stopped) nothing more is written.
- **Read** with `tools/timings.js`: per operation the weighted count, median, p90 and max ms, the most rows read, the
  trend by day (by week past 45 days), and the quota lines (the slowest call against the 6-minute limit, the trigger's
  minutes a day against the 90 of a consumer account; the 20,000 URL fetches a day are not measured).
  `tests/timings.test.js`; the tab is off in `tests/gas.js` unless a test asks for it.

## Rights and the Audit tab

See also SECURITY.md "Rights and the Audit tab", ROADMAP "Roles, instances and cohorts" and
[the decision](../decisions/2026-11-19-groups-carry-rights.md). An account's rights are the union of two sources:

- **Its groups** (below, "Player groups"): a group carries an instance's rights (`Code.gs` `RIGHTS`: `players`,
  `settings`, `grant`, `content`, `live`, `cohorts`, each at `instance:imr`), and a member holds them while the
  membership's code hash is the account's.
- **The admin list**: the `admin` rows of the `Roles` tab (Account, Role, Scope, Since, Code hash; `admin` at
  `platform`), kept apart from the groups. An admin holds `platform` and `grant` at every scope, never an instance's
  players or content without a group that carries them. `POST {roles: 1, token}` lists it,
  `{roleGrant | roleRevoke: {account, role: 'admin', scope: 'platform'}, token}` changes it (any other role or scope:
  `input`; no page sends them yet; the admin's Groups page reads the list, read-only).

The `Audit` tab (Time, Admin id, Action, Scope, Result, Target id; `AUDIT`) gets one row per change and capped refusals,
ids only, never a name. Every privileged endpoint calls `gate_`, then `can_(caller, right, scope)`: the admin token
(`caller_`, the only caller today but a live game's start) passes every right. Pierre's rights are given once to the
admin's account (`rolesSeed_`): the admin list, and the Managers and Curators groups. A delete, merge (its from) or
archive drops the account's rights, never moves them (`rightsDrop_`, `rolesDrop_`, rule D7). The Roles tab's other rows
(`owner`, `editor`, `trainer`) are the record of the roles before the groups carried them, read by nothing since the
rights migration (below). `tests/roles.test.js`, `tests/accountrights.test.js`.

## Live games

A trainer runs a quiz for a room ([design note](../reviews/2026-11-18-live-mode-design.md)). The trainer (`#live/host`,
an account in a group that carries `live`, such as Trainers, checked by `Code.gs` `lvTrainer_`, then `can_(…, 'live')`) picks a subject open to
everyone, a set (every unit in play, or an IMR lecture group: `quiz.js` `cqGroups`), the number of questions (default
10) and the time per question (default 20 s), and projects the code; students join at `#live` (`#live?code=123456`),
signed in or with a nickname.

- The trainer's page builds each question with the game's engine (`liveBuild`: `photoSet`, `distractors` with
  `LIVE.TRAPS` look-alike traps over every unit in play) and sends it. The script (`lv_`: `start`, `host`, `join`,
  `poll`, `answer`) keeps the right answer until the reveal and scores: 100 points plus up to 100 for the time left,
  timed from when the question first reached that student (`lvPoints_`, `lvAnswer_`).
- Polled: the students every 2 s, the trainer every 1.5 s, through one module (`LIVE_CH`, the place a WebSocket service
  would go). Sessions live in the script cache only (`LV`, 6 hours at most).
- A signed-in student's answers are scored and logged by their own app like a photo-quiz answer, mode `live`
  (`liveRecord`: `scoreIn`, `scoreAnswer`, `logAnswer`), on the units they have unlocked only (rule L4); a nickname's
  are kept in the page's memory and logged only if they sign in on the end screen. Every accepted answer waits in the
  page's tab until it is logged (a subject's data that could not come is tried again at the next poll: `liveFlush`); an
  answer that never reached the script is sent again at the next poll while the question is open (`liveRecon`); a
  reveal and an answer never cross on the script (both under its lock: `lvHost_`, `lvAnswer_`).
- A trainer's reloaded game loads its own subject's data first, whatever the header shows (`hostData`).
- Gated on the script's version in every reply (`LIVEGAME_SHEET`, rule D4). `tests/liveclass.test.js`,
  `tests/live.smoke.js`.

## Player groups

A player is in any number of groups ([decision: no "apart" setting](../decisions/2026-11-18-no-apart-groups.md)), and a
group carries settings and an instance's rights ([decision: groups carry rights](../decisions/2026-11-19-groups-carry-rights.md)).
"Staff" is a group, not a role. Every setting and right only adds: a player in several groups has each of their boards,
betas and rights.

- A **group** (`Code.gs` `groupState_`) is a row of the **Group settings** tab (Group: its id, Name, Board, Apart, Beta,
  Added, Rights): Board, it has its own leaderboard; Apart, unused and written 0; Beta, `''` or the subject in beta that
  it opens to its members (`core.js` `subjGroup`); Rights, the instance's rights its members hold, `right@scope` entries
  separated by commas (`RIGHTS` at `instance:imr`; `rightsOf_`). The **Groups** tab keeps one row a membership (Group:
  the group's id, Name: the player's, Added, Code hash: the account's when it joined a group that carries rights, blank
  for the others). Ids are `g:` and 8 random characters; a group a migration made keeps its old Group cell (a subject's
  id, `cohort:<name>`, `staff`) or `r:` and its role (`r:owner`, `r:editor`, `r:trainer`).
- **Boards.** `board_` makes its one ranking (the global %, then Elo; rule D8's replays included) and splits it
  (`groupBoards_`): `rows`, the general board, everyone; `groups`, `[{id, n, rows}]`, every group with a board, the
  newest first (by Added), its members. Each keeps the ranking's order and its first 200, and the opt-out, an admin hide
  and an archive hold on all (`boardRows_`). One cache entry per subject (`board14`, `board14:<subject>`) holds every
  scope; every change to a group or a membership drops every subject's (`boardsDrop_`); with the groups unreadable,
  `rows` is not split.
- **The app** learns its groups from the load and save replies: `groups` (the subjects in beta the player's groups open)
  and `gids` (their groups' ids; `sync.js` `groupsSeen`).
- **The admin** (`users_`, audited): `{userGroup: name | [names], group: id, on}`;
  `{groupMake: {n, board, apart, beta, rights}}`, `{groupEdit: id, n?, board?, apart?, beta?, rights?}`,
  `{groupDrop: id}` (an empty group only; `groupDo_`); a name is 1 to 40 characters, unique case aside; `rights` is the
  whole list, `["right@scope"]`. The player list carries each player's `gids` and `roff` (their groups with rights
  whose membership's code hash is not the account's: rights off until they are added again; never a hash) and every
  group (`groupDefs`, with its `rights`).
- **Who changes what** (checked again under the script lock): a group's name, board or beta, the members of a group
  without rights, and a delete need `players`; a group's rights and the members of a group that carries rights need
  `grant`. A group that carries rights takes one name a call (a list: `input`), a live account (`user`, `archived`),
  and its membership is written with the account's code hash (`joinPut_`; added again, it is bound to the code now). A
  group's first right is refused while it has members (`members`: their memberships hold no code hash). A player's own
  act never joins a group that carries rights.
- **Audit rows** of the rights: `join <group id>` and `leave <group id>` (target the member's id; `(self)` for the
  caller's own account, `(account removed)` for rule D7, `(migration)`); one `grant <right> (via <group id>)` or
  `revoke …` row per member, then `right+ <right>@<scope>` or `right- …` (target the group's id). A membership written
  without its `ok` row answers an error, and its retry writes that row (`joinAudited_`); so does a group's rights
  change: the request that carries the rights compares them with the group's audited rights (`rightsAudited_`: per
  right, its last `ok` `right+` / `right-` row, a role group's `r:` rights from the migration counted without one), so
  its retry writes the rows of the change saved without them (a member's row may then be written twice). A failed
  `groupMake` with rights answers an error, its retry `exists`, and its rows come with the group's next rights edit.
- Settings and rights stay in separate groups in practice (Staff a board, Trainers `live`), never mixed by the admin
  page.
- Rule D7: a merge joins every group without rights of the merged name to the kept one's, and drops its groups with
  rights and its place on the admin list, each audited (`mergePlan_`; the reply's `join`, `drop` and `admin`, which
  `{mergePlan: {from, into}, token}` gives before, writing nothing, for the warning); a delete and an archive take the
  player out of every group, its rights audited; a group itself holds no player data.
- **The migration** (rule W3; `ONCE_` groups, `groupsMigrate_`): each distinct Group cell of the earlier layout becomes
  a group of that id (a subject's id, "<subject> beta" with that subject as beta; `cohort:<name>`, "<name>" with a
  board; any other cell a group of that name), and the trainers at `instance:imr`, under the code hash of their grant,
  the group `staff`, "Staff", with a board (made only when someone holds the role), their role kept; it only adds rows.
  Until it has run, the readers read the data as it will make it (`groupsBefore_`), and the first change to a group or
  a membership runs it first, under the script lock (`groupsNow_`). Its code (between `groups-migration` markers) goes
  once the Deploy log shows "one-shot groups".
- **The rights migration** (rule W3; `ONCE_` rights, `rightsMigrate_`, after the groups one): each instance role of the
  Roles tab held by a live account becomes a group with its rights, `r:owner` "Managers" (`players`, `settings`,
  `grant`), `r:editor` "Curators" (`content`), `r:trainer` "Trainers" (`live`, `cohorts`), " (rights)" after a name a
  group already has; each grant a membership of it, its code hash and Since kept (a grant whose hash is no longer its
  account's gives nothing, as before), one `join … (migration)` Audit row each, by `script`. The admin rows stay: the
  admin list. Nothing is deleted: the Roles tab keeps every row, and the grants of accounts no longer live stay there
  only, counted in the Deploy log line. Until it has run, the readers and `can_` read the groups as it will make them
  (`rightsBefore_`), and the first change to a group, a membership or an account runs it first (`rightsNow_`). Its code
  (between `rights-migration` markers) goes once the Deploy log shows "one-shot rights".
- `tests/playergroups.test.js`, `tests/accountrights.test.js`.

## Backup to pCloud

[BACKUP.md](../BACKUP.md) says how to restore. A weekly time trigger (`backupWeekly`, Sundays about 02:00, made once by
`installBackup` or the menu's first click) and the sheet's menu **Reef ID > Back up to pCloud now** (`onOpen`,
`backupNow`) run `backup_`: every tab read through `SpreadsheetApp` and written as one `.xlsx` built in the script
(`xlsx_`: a shared-strings table, typed numbers, booleans and dates, the zone's offset asked once per hour of the log; no
formulas or formats), uploaded with `UrlFetchApp` to pCloud's HTTP API.

- **With a token** (Script Property `PCLOUD_TOKEN`, a pCloud OAuth access token, sent only as an `Authorization: Bearer`
  header to `api.pcloud.com` or `eapi.pcloud.com`): `createfolderifnotexists` `/IMR` then `reef-id-sheet-backups` (`Code.gs`
  `BACKUP`), or inside the folder `PCLOUD_FOLDER_ID`; `uploadfile`
  `reef-id-sheet-YYYY-MM-DD.xlsx`; then `listfolder` and `deletefile` for every backup-named file past the 12 newest,
  only after a successful upload. Optional `PCLOUD_HOST` (one of those two hosts; unset, the US host is tried, then the
  EU one).
- **With an upload link** (no `PCLOUD_TOKEN`; `PCLOUD_UPLOAD_CODE`, a pCloud upload link's code; `backupCode_` also takes
  a whole link): the file goes in one `uploadtolink` request (`backupLink_`: `code`, `names`, `nopartial` in the URL,
  the file as multipart, no `Authorization` header) to `PCLOUD_HOST` or by default `eapi.pcloud.com`; no folder made, no
  retention (the code can only add files: old backups are pruned by hand), logged
  `saved … (upload link; old backups are not pruned)`. Both set: the token path, every line ending `[token path; PCLOUD_UPLOAD_CODE not used]`.
- Both secrets are scrubbed from error text, and only pCloud's numeric result is logged. No new manifest scope (a scope
  added to `appsscript.json` would reach the live script through `autoUpdate` before anyone accepts it). Never in a
  request, under the script lock or in `autoUpdate`: no token, a refused token or a missing authorisation only writes
  one `pCloud backup:` line to the `Deploy log` tab (the file name and size, or the reason; never the token).
  `tests/backup.test.js`.

## Versioning and deploy

- **Versions.** Every change to the script gets the next `VERSION` (line 1 says it and its date, the constant holds it),
  assigned by the integrator at merge, never by the PR (rule D3): the PR writes its history entry in
  `tools/sync/changes/<branch>.md`, and `tools/sheet_version.py --assign` writes it at the top of
  [tools/sync/HISTORY.md](../../tools/sync/HISTORY.md) (the whole history, one entry per version, newest first), sets
  line 1 and bumps `VERSION`. [docs/archive/sheet-history-detail.md](../archive/sheet-history-detail.md) (frozen) keeps
  the history as ARCHITECTURE.md once held it.
- **The script updates itself** (`autoUpdate`, a 15-minute time trigger made once by `installAutoUpdate`): when
  `tools/sync/Code.gs` on the `release` branch (only the merge train moves it, after a green train: rule D3,
  [decision](../decisions/2026-11-18-release-branch.md); GitHub answering 404 for it, the script reads `main`) has a
  higher `VERSION` and still contains `autoUpdate`, it replaces its own code and manifest
  (`tools/sync/appsscript.json`) through the Apps Script API with its own OAuth token, saves a version and points the
  web app deployment at it (the same `/exec` URL); the `Deploy log` tab records each install or error.
  `installAutoUpdate` checks the API at once (a standard Cloud project with the Apps Script API may be needed:
  HANDOVER.md). If the code was replaced but the deployment failed, the Script Property `AUTO_PENDING` makes the next run
  finish it. A run that finds the script up to date (`autoUpdate_`) then runs the one-shot migrations (`ONCE_`), the
  leaderboard's replays made ahead (`boardWarmRun_`, which first reads the structure again, `subjStRefresh_`) and the
  pooled statistics' fold (`statsFoldRun_`); every run ends with the Timings trim (`timTrim_`).
- **The version limit** (`SELF_VERSIONS`; the 2026-11-22 incident): Google keeps at most 200 versions a project and
  each install saves one (about 10 a day); at 200 `POST /versions` answers 429 and the script cannot update itself. The
  API cannot delete a version, so only a person can free them (Apps Script editor, Project history). After each deploy
  the script counts its versions (`selfVersionsCount_`), and an up-to-date run counts at most once an hour while no
  count is kept (the install that brought the count was finished by the updater before it), the last count failed, or
  it is 170 or more (`selfVersionsRun_`, so a clean-up is seen without a deploy); from 170 it writes one line a day to the Alerts tab and
  the Deploy log with the count and what to do (`selfVersionsSave_`). A 429 at `POST /versions` reads "error: version
  limit reached: delete old versions …" in the Deploy log (counted as 200; `AUTO_PENDING` finishes the update after the
  clean-up). While the count is 170 or more the public `?stats=1` reply carries it as `vers` (the app ignores it), for
  the hourly Health check (docs/PAGES.md "Infrastructure health").
- **By hand**, before the one-time setup (HANDOVER.md) or if it fails: copy
  <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs> into Extensions > Apps Script, then
  Deploy > Manage deployments > Edit > New version.

## Tests

- `node tests/run.js` runs every `tests/*.test.js` not tagged `// @slow` under `node --test`, in the machine slot of
  `tests/slot.js` (rule W24); `--all` adds the slow statistical ones, which CI runs. The first line of every test file, `require('./slot.js').testGuard();`, takes the slot for the `node --test`
  runner in a several-file run, so even a bare `node --test tests/*.test.js` waits (one file stays unlocked;
  `tests/slotguard.test.js` fails on a file without it). CI runs `node --test tests/*.test.js`.
- `tests/gas.js` runs `tools/sync/Code.gs` against an in-memory sheet; the unit tests check `core.js` (`merge3`,
  `mergeTabs`, `mergeProgress`, `accountOf`, `eloOf` against `stats_`, `confusionOf` against `stats_` `conf`,
  `confScore`, `pairConf`). `tests/sync.test.js` checks `replay_` (the embedded engine is `core.js`, stored once,
  replayed again on a new rules version or new rows, the reset, anonymous devices, the saved copy untouched), the hold,
  and that the script reads every one-tap item and code (and `shown`, `skip`, `none`) back as sent.
  `tests/replay.test.js` replays a device's log of typed and picked answers (exam included) and finds the record the app
  scored live. `tests/statsfold.test.js` checks that the pooled statistics' snapshot serves exactly what `stats_` makes
  from the whole log, after every run, at any number of rows a run and through each rebuild cause, and that a deleted
  account leaves nothing in it. The other test files are named with each part above.
- `tests/pages.smoke.js` signs in against a sync script answered inside the page (a wrapped `fetch`, the script's hosts
  mapped to 127.0.0.1: nothing reaches the sheet): a name taken with another code, "Is it you?" on a device with answers
  of its own and on a fresh one, No (nothing saved or sent), Yes (signed in and merged), a new name (no question), and
  the tour's sign-in step. It checks the sheet's full replay adopted by a stale signed-in device (`replayAdoptCheck`:
  the replayed record with its own unsent answer on top, sent, not adopted twice; a version with a `msg` shows its card
  once at load, after the update note due at the same load, `RECALC`, and one without shows nothing;
  `SMOKE_ONLY=replay` runs that check alone).
