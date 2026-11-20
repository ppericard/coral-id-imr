# The admin's Inbox, Players and live analyses

How the admin reads the players: Inbox › To do (what needs Pierre: reports, errors, alerts, Health, the points to handle),
the Players pages (the list, groups, a player's Journey, Activity and its live read, Visits) and the analyses drawn live
from the answer log (Stops, Pairs, Heatmap). Everything here is read from the sync sheet with the admin token
([sync.md](sync.md)); nothing read is stored on the device. The shell (addresses, the subject switch, sheet reads,
difficulty in words) is in [admin.md](admin.md); the photo pages in [admin-photos.md](admin-photos.md). This is the
specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and the
PRs.

## Inbox › To do

### All and Reports

`#inbox/todo/all` and `#inbox/todo/reports` (`renderTriage()` draws both): Reports lists the players' reports with who
sent them, flags, suggestions and duplicates (ARCHITECTURE "Players' reports"); **All** lists everything by urgency:
Health's red line only when something is wrong (`healthLine()`: photos everyone misses, genera players are stuck on),
reports, flags, the devices' errors of the last 30 days (`evSummary()`), Featured photos rated Poor, the judging agent's
suggestions last.

**On the fish side** (`#fish/inbox/todo/all`) the same with the fish Health line (`healthLine(S)`: its photos everyone
misses, its families and genera players are stuck on, `#fish/inbox/todo/health`) and, last instead of the corals' photo
sections, its **photo work as counts that open their pages** (`fishTodoLines`, `bindFishTodo`): the candidates the fish
Candidates swiper shows by default (`autosort.js` `fishCandTodo`: never the auto-sort's Checks, nor those of a species at
its target or set aside), the open cover and light proposals (Photo review), and Coverage › Games' To do counts
(`autosort.js` `FISHCOV_TODO`, `fishCovTodo`, shared with `renderFishCov`, under the same All | IMR filter, so a count is
the chip it opens: a click opens Coverage › Games with that chip pressed). The corals' out of the presence rule,
share-alike, Featured but rated Poor and the judging agent's suggestions have no fish counterpart (the fish candidates
carry the pass's judgment in Candidates). The switch's and the tab's counts stay the reports and flags (`subjTodo`,
`todoHere`).

### Errors and Alerts

- **Errors** `#inbox/todo/errors`: what the players' devices report by themselves (`app.js` `ev`, the sheet's Events
  tab, admin token only): app errors, photos that did not load, saves that failed, and the one-tap question's answers.
- **Alerts** `#inbox/todo/alerts`: the sync sheet's Alerts tab, read-only (`readAlerts`, `ALERTS_SHEET`: an older sheet
  version gets a page naming the version it waits for): its lines of the last 30 days, newest first, counted by kind
  (caps reached, photos of another unit, a left-out device signed in), a capped name shown as its admin id, no line of
  a deleted, merged or archived account (rule D7); every subject's page (`EVERY`), the same on the fish side
  (`renderAlerts`; [SECURITY.md](../SECURITY.md) "The Alerts tab in the admin").

### Health

`#inbox/todo/health` ("Health and Stops", below): what needs action: photos everyone misses, genera that don't take off.

### Points to handle

Pierre settles most open points himself, from a page, never a text list. Inbox › To do › Points `#inbox/todo/points`
(`renderPoints`) lists the points of **`data/points.json`** (written by agents, never by the admin: `kinds`
{key: label} and `points` [{`id` stable, `kind` trainer / names / sources / content, `subj` a subject id of `SUBJECTS`,
`at` the date added, `title` the list's line, `q` the question in plain words, `ctx` context lines, `ask` the answer field
under each photo, `photos` [{`f` a photo id of `data.json` / `data/cand.json`, with `t`, `a`, `o`, `src` as a fallback copy} or
{`none`: why a slot is empty}], `src` [{`t`, `u`}]}]; the file's order is the priority; neutral wording, rule C1). Its
shape is checked by `points.js` `pointsProblems` (`tests/points.test.js`), and a point with a problem is left out of the
admin. Loaded once at start (`data/points.json?v=1`, stamped at deploy). Pure logic in **`points.js`** (admin only:
`PT_STATUS`, `pointsOrder`, `pointAge`, `photoKey`).

- **The list**: Open first, Stand-by below (muted), Resolved and Dismissed folded with their counts (the Kept style);
  each row its title, kind (Fish for a fish point), age; the Points view carries the open count.
- **A point's page** `#inbox/todo/points/<id>` (`renderPoint`; the address only in `POINT_R` / `pointHash`), made to
  show a trainer from a phone: the question big, the photos large (one column on a phone) and numbered, **blind** (no
  name or origin until the bar's **Names**; the enlarged photo, `zoomSet()`, steps through the point's photos with the
  number and credit only, the full `lbCap()` once Names is on), a text field under each photo for the answer (`a`),
  **Notes** (`n`), and Resolved / Stand-by / Dismiss, plus Reopen once handled, one click (toast, Undo); Context (folded)
  holds `ctx` and the sources. Notes and answers reach the draft 0.8 s after typing stops, when the field is left, and
  before any redraw (`ptFlush`).
- Everything goes through the draft and Publish (`curation.json` `points`, [data.md](data.md#curationjson-pierres-choices)),
  never written by a script (rule A1).
- **Each side lists its own points** (`subj`; `ptList(S)`, the open count on its view), a point's page under its side's
  prefix (`#fish/inbox/todo/points/<id>`, `pointHash`), opened from either side by its id (an old link), with its
  subject's name when it is the other side's.

## Players

### The list

`#players/list` (`renderUsers`), **one page for every subject** (`SHARED`: no prefix; `#fish/players/list` lands here):
one page to see, sort and manage the players, names joined to the anonymous statistics by each player's anonymous id.

- **Columns**: Name, **Last** (any subject: the exact time of their last answer in the answer log loaded, else the
  player list's, written "now" under `RECENT.NOW` = 5 minutes as a green pill, "12 min ago", "3 h ago" today,
  "yesterday 18:40" ("yest. 18:40" on phones), then the date, the full date and time on hover; `ago()` in `admin.js`;
  the default sort, most recent first, and one tap on Last brings it back), Devices (distinct devices of their
  pages-opened summaries), Groups (their groups), then a group of columns per subject (`SCOLS`: Answers, Right, Last,
  Sessions with their median length, Progress for the replayed subject, **Photos** and **Spread**). Every column title
  sorts (`UCOLS`, `SF.us` / `SF.ud`); "you" marks the synced name; a player hidden from the leaderboard has a greyed name
  (muted, italic, "hidden from the leaderboard" in its title).
- **Photos and Spread**, in the subject of the admin's switch: `ex` of `Code.gs` `users_`, computed by `exposure_` with
  `core.js` `exposureOf` over that subject's rows (`subjRows`) against its game photos per unit grouped by colony
  (`pools_`, `core.js` `unitPool` over the site's files `SUBJECTS` `pool` names: `slots` = `data.json` + `curation.json`
  through `applyCuration` / `applySlots` / `gameOf`, `entries` = the fish files through `treePhotos` / `treeGen`, units
  under the ids the log holds, `renamedId`; read from GitHub main, cached 6 hours per subject, nothing stored). Photos =
  Seen %, the distinct game photos shown out of the game photos of the units met; Spread = Spread %, in time order, of
  the questions on a unit asked while it still had game colonies the player had never been shown, the share that showed
  one (a photo out of play now counts as a colony of its own); the cells' titles give the counts; the fish genus units,
  built in `app.js` `treeGenera`, are not in the pool.
- **Progress and Learned are the full replay** (`progOf` in `admin.js`): the admin shows the values the player will
  have, not the stale copy of a player who has not reopened the app. The player list carries each player's replay
  computed by the sheet once (`Code.gs` `replayedAll_`, `rp` = [progress %, learned, the saved copy's %] over the slate,
  the replay record reused from the Replayed tab while the player's rows, reset and first-launch answer are the same), so
  the list reads no saved copy; a player the sheet gave no `rp` is replayed here (`core.js` `replayProgress` over their
  answers in the log with today's rules, the sheet's photo memory offsets and pooled confusions from `?stats=1`, the
  mastery exams taken from their saved progress, `replayedOf`), the saved copies read with `userData` 4 at a time
  (`savedOf`, `PSAVED`, also the Journey's cards) and the page drawn again when the last one is in; computed once per
  data load, memoized (`PROGM`). Only the Journey (`progOf(u, true)`, which shows the record genus by genus) still reads
  one saved copy and replays here. The anonymous ids get their replayed % too.
- **Other subjects' progress**: a subject the sheet replays from its own answers (`SUBJECTS` `replayed`: the fish and the
  sea slugs) is replayed with the units the sheet's replay reads (`unitRpl`, between `// replay units: begin` and `end`,
  tested in `tests/journeyscore.test.js`: its registry's files as read, `fishAdmin` `raw`, with the published curation's
  structure and content laid over them, `core.js` `contentApply` as `Code.gs` `subjRpl_`; then `replayed` `gen`, its
  variant table `replayed` `vars`, its slate, and for a subject with a global score the tree `replayed` `tree`), and its %
  is the one its app shows and its leaderboard ranks by (`unitPct`: `treeScore` over that tree, else `pctOf` over the
  slate): the Journey, its sessions' Progress (`admin-journey.js` `sessProg`) and the row's bar (`uprogHtml`: each subject
  the player answered in, another subject's from their saved copy read when the row opens, never for the whole list).
- **↻ saved**: where the saved copy differs (its % as the leaderboard computes it, the sheet's Learned column), a small
  muted "↻ saved 44%" beside the value (`withSaved`, `.adm-saved`, tooltip: the player has not opened the app since), in
  the table, the row's bar and the Journey.
- **Not signed in**: answers without a name (devices that never signed in, deleted accounts) are listed apart by
  anonymous id (`#players/list/anon/<id>`), with their Elo and a Statistics column.
- **A row's bar** (Elo, the quiz shares, Duels, Days, Learned, Seen and Reports are there or on the Journey, not in the
  table; the Elo is the photo Elo `ras` on the players' scale, 1000 + 200 × level ± its margin: the sheet's chain, not the
  app's `~level` players see) opens a **Journey →** button (games, mix-ups, genera to review and days played are on the Journey page only),
  shows the player's groups as chips (below), and
  **Manage**: leaderboard **Hide** / **Show** (an admin's hide the player's syncs never undo), **Merge into** another
  name (progress merged in the browser with `core.js` `mergeUsers`, then `userMerge` relabels answers and reports and
  deletes the old name) and **Delete…** (two named choices, no default: **Delete everything**, or
  **Delete, keep answers anonymously** as `~deleted <id>`, pooled photo statistics only; `uDel`); both confirm.
- **The starting answer**: the bar ends with each subject's starting answer (`admin.js` `startBlock`): the first-launch
  answer in force and its history (date, answer, how given), and **Change…**: the subject's answers, then Change /
  Cancel in the bar, then one result line. It posts `userStart` (`Code.gs` `users_`: `core.js` `startAdminSet` appends a
  choice event via `admin`, the history kept, the revision bumped so the player's devices merge it at their next sync,
  `startUnion`: the latest answer wins); the fallback window restarts from that event, as after `startSet` (the level
  card is still offered), so a card counts only the answers after the change.

### Out of the statistics

Players › List, in a player's bar (**Leave out** / **Count again**, a muted **out** beside the name) and in Not signed in
(a Statistics column), one click each way (`statsExclude`, `isExcl`, `exclBtn`; the ids from the player list's
`excluded`). The sheet keeps the ids in the tab "Stats excluded"; their answers rate nothing in `stats_` and the Analyses
report drops them (`tools/analyses.js`, `readAnswers` `excluded`); [SECURITY.md](../SECURITY.md) "Left out of the
statistics".

### Groups

`#players/groups` (`GROUPADM_SHEET`), **one page for every subject** (`SHARED`, as the list): every player group, the
newest first, a card each (`admin.js` `renderGroups`): its name and **Rename**, its members' count, **Board** and
**Apart** (Off \| On, one click), **Beta** (None or a subject that opens to a group), its members as chips (× takes one
out, **+ Add a player**), **Add all** / **Remove all** (asked first), **Delete** once nobody is in it; **New group** at
the top (its name asked, Board on). A player's row bar shows their groups as chips (×) and **+ Add to a group**
(`ugChips`, `memberSet`). On a sheet version before `GROUPADM_SHEET` the page says what it needs, and the list keeps the
beta group's Add / Remove and the Cohort select. Its help: `HELP.groups`. What a group does in the game:
[sync.md › Player groups](sync.md#player-groups).

**Groups that carry rights** (`RIGHTSADM_SHEET`, v204; Q408, [the decision](../decisions/2026-11-19-groups-carry-rights.md)):
- A group's card has a **Rights** row: a chip per right in words (`RIGHT_WORDS`: Manage players, Settings, Give rights,
  Content, Host live games, Cohorts), each with ×, and **+ Add a right**; each change sends the group's whole list
  (`groupEdit` `rights`). A group with members and no rights offers none: a line says to make a new group, then add
  players one by one (Code.gs `members`).
- A rights group has a key beside its name and comes first (then the others, the newest first within each); its members
  have no **Add all** or **Remove all**, and **+ Add a player** asks one confirm naming its rights ("Give X: Host live
  games?", `giveOk`; the player's bar asks the same). A member in `roff` shows "rights off: the code changed".
- The player's bar: a rights group's chip carries the key, and **Rights:** sums up the rights they hold.
- **Merge into** reads `{mergePlan}` first and its confirm lists the groups the kept name joins, the rights groups
  dropped with their rights, and leaving the admin list; not read, no merge.
- **Admins (outside the groups)**: a read-only line from `{roles: 1}` (Q408 answer 6).
- A rights change's errors in words (`rightsErr`: `token`, `members`, `input`, `server`); for `server` ("Saved in part:
  its Audit record failed. Try again to finish it.") **Try again** sends the same request again. After any answer the
  players are read again, so no change is sent from a list the sheet no longer has.
- **One rights change at a time on the whole page** (rule W27; `rPend`): from the request until the players are read
  again with the answer applied (a read dropped by a newer one is made again), every group's rights controls are off
  (the rights of a group, a player in or out of a rights group); the group changed shows its pending list, greyed.
- Before v204: the page as before, and no `roles` or `mergePlan` read. `tests/admin.smoke.js` (players part, both
  widths), `tests/gates.test.js`.

### A player's Journey

`#players/list/journey/<name>` and `#players/list/anon/<id>` (`admin-journey.js`): one player's path, from the answer log
the Players page already loads, joined by the anonymous id, with the genus sheets they opened ("Pages opened" from the
sheet's pages-opened summaries). **One per subject**, under its prefix (`#fish/players/list/journey/<name>`), with its own
subject switch at the top (each side with the player's answers in it); the list opens it on the subject they played last
(`lastSubj`).

- **Numbers**: answers, right, last 50, level, genera met / slate, progress and learned replayed from the log as on
  Players (with "↻ saved …" when the saved copy differs), days, sessions; a Progress column in the genera table (each
  genus's replayed bar, `core.js` `scoreOf`); the learned genera from the replay.
- **Charts and lists**: right answers over the last 20 against the chance the game expected (the logged `e`: photo
  difficulty and their level on the genus); genera met over the answers (a dot at each genus's first question, a line at
  each new day); **when they played**: one row a day from the first to the last, days without an answer included, one
  cell an hour in the admin's time zone, shaded in 5 steps of the level ramp against their busiest hour, answers and
  right share on hover, the last `JOURNEY.DAYS` days; the genera easiest and hardest for them ranked by right answers
  minus expected (3 answers or more: raw rates mislead, the game hands harder photos to whoever does well); their
  mix-ups (with **Heatmap ›**, "One player's map" below), genera to review and the slate genera not met yet; the games
  (photo quiz, "Again: A or B?" rematches after a mix-up, mastery exam questions, Look-alike duels); every genus asked
  (order met, easiest, hardest, most asked; the last 10 answers as dots, their most frequent wrong answers); answers per
  day.
- **Cards** from the player's saved progress (`userData`, admin token): the first cards and when, single cards, Open all
  genera after which answer, when and from where, or the offer declined (an orange line on the genera chart; a Card
  column); the genera learned (mastery exam passed: a green ★ curve on the genera chart at the answer that passed its
  mastery exam, its last right exam question logged `|x`; a green "learned" tag in the list).
- **Sessions**: the player's sessions as Activity lists them (`recentSessions(R, {own})`, `bindSess`; the last
  `RECENT.OWN`), each unfolding its summary.
- Help behind "?" (`HELP.journey`).

**Every subject's Journey** (`admin-journey.js`): its units named as Analyses › Learning › Answer log names them
(`jUnit`, `jName`: `admin.js` `repUnit`, an IMR sub-entry with its IMR name, in titles and the charts' tooltips too); its
Cards in its words (Open all families) with the cards of units outside the slate on a line per word (`jOffSlate`: Genus
cards); the **steps** of the path from the answer log (`jSteps`, pure, tested in `tests/journey.test.js`: the first
question on each rank other than the subject's own, `SUBJECTS` `sheets` and `rank`, and on each circle after the first, a
unit record's `circle`), listed under Cards and steps and marked on the units-met chart; the player's **opt-in choices**
(`jOptin`, pure, tested there: `SUBJECTS` `optin`, from the subject's quiz settings in their saved copy, `quiz` in
`admin.js` `savedPump`: its current state, on or off, with the time of the latest choice, and apart, with no time, the
offer's declines and the answer count of the last "Not now"), listed with the steps, in time order, not marked on the chart; the times of **Cards and steps**
in the player's own local time (`jlocal`, pure, tested in `tests/journey.test.js`: `jOffAt`, the UTC offset logged with
their answer nearest in time, the earlier of two as near; `jAtText`, the time written at that offset in UTC, so the
admin's own zone and daylight saving never enter; the offset in the time's title, a tap shows it on a phone; the admin's
clock when no answer has one), the rest of the Journey and the session summary on the admin's clock; **Games** by format
(`jGames`, tested there too; Find the X its own row, `|f`): the Custom quiz and Duel tab rows only for a subject with
those pages (`SUBJECTS` `pages`), the questions on each rank as the Answer log's Conditions count them (`logConds`); the
units table titled in the Answer log's words (`manyWord`, `stopWord`: Families and genera) once another rank is among
them; a subject with sheets at several ranks shows its sheets opened as one count and time over its visits
(`sheetVisit`, `sheetsTitle`, as Stops), its pages only. The fish **Progress** is the fish global score the player sees
(`admin.js` `unitPct`: `core.js` `treeScore` with `SUBJECTS` `score` over the tree the leaderboard ranks by) and
**Learned** the families learned over the circles, as My progress counts them, from a replay with the sheet's own units
(`admin.js` `unitRpl`). Every subject's progress is replayed in the admin from its answers (`unitsOf`: `data.json`'s
genera for the replayed subject, the fish entries' circles for another, read once by `fishAdmin`; `progOf(u, full, S)`,
`statsFor`: the sheet's photo numbers for the replayed subject only), with the saved copy's cards and mastery exams
(`savedFor`: each subject's keys) and ↻ saved where it differs; the Elo and the genus sheets table are the replayed
subject's only.

### Activity: recent sessions and who is playing now

`#players/activity` (Players › Activity, the landing page; **per subject**, `#fish/players/activity`: the subject on
screen's answers, `rowsOf`): who plays and how much.

- **Recent sessions** (`recentSessions()`): the last `RECENT.N` = 10 sessions of every player, newest first: the player
  (by name, linked to their Journey, when signed in; else the anonymous id, linked to `#players/list/anon/<id>`), Last
  (as the list's Last column; the row tinted and "N playing now" in the card title when the last answer is under
  `RECENT.NOW` = 5 minutes old), answers, right %, length (first to last answer), start time, and the modes with counts:
  quiz (look-alike duels slipped into it included), custom (the custom quiz, `quiz|s…`, its typed answers included),
  duel (the Duel tab, `quiz-duel…`), typed (a `|t` mode, the typed answers in the quiz); "as of" = when the answer log
  was read. The names come from the player list (`loadUsers`, read with the answers when Activity opens).
- **A session** has one definition, `sessionsOf()` in `admin.js`: one player's answers cut where two are `HEALTH.GAP` =
  30 minutes apart or more; used by Stops, the Journey and Recent sessions.
- **↻** next to the title reads the answer log and the player list again (the whole Answers tab, `readAnswers`, not
  cached by the script: several hundred kB and a few seconds of script time).
- **Live**: while Activity is open and in view, every `LIVE_READ.MS` = 60 s, the sheet's light read (`admin.js`
  `liveArm`, `liveRead`; `Code.gs` `live_`, `POST {readLive: 1, token}`, admin token only, no script lock, nothing
  written) brings the Answers tab's last `LIVE_N` = 50 rows with a player, as `readAnswers` serves them (`answerOut_`, a
  surprise card's left out), each player's last answer time (`last`, by admin id, from the Activity tab's QUERY while it
  holds the script's formula, else from the Name, Time and Mode columns; a deleted account's and an archive's left out)
  and the tab's row count (`n`, the window `k`). `liveMerge` (pure, between `// livemerge: begin` / `end`, tested in
  `tests/live.test.js`) appends the rows not held yet (known by time, unit shown, answered, mode and photos, not by player
  id) and the page is drawn again ("as of" the read).
- When the rows held can no longer be completed from it (a row held under another player id: answers claimed at
  sign-in, a rename or a merge; no row of the window held while the tab has more rows than it; a player's last answer
  more than a second after the last held; an account that left normal operation since the log was read, the reply's
  `roster`, `Code.gs` `rosterAt_`, later than the log's own; a player of the rows held with no last answer any more: rule
  D7, a deleted account's answers never stay on the page), the whole log and the player list are read again in the
  background (`loadStats`, `loadUsers`, the page kept on screen; a read that fails keeps the log held and the timer runs
  on). A signed-in player of the log missing from the player list reads it again (`liveUsers`: at each light read until
  the list holds them; a failed read of the list, after a full read too, keeps the last good one and is tried again at
  each light read until one succeeds, `liveUsersDue`); an unfolded session's saved copy follows its player's new answers
  (`savedClear`, as ↻).
- Hidden (another tab, a phone asleep) or another page: no read, the timer stopped (`visibilitychange`); back in view, a
  read at once when the last is over a minute old. Without the token: no timer, ↻ by hand.
- **Script cost**: one light read a minute while the page is open, reading two small ranges (the 50 rows and the
  Activity tab's one row per player; the token check kept 10 minutes, `isAdmin_`): by estimate (not measured on the live
  sheet) well under a second of script time each, and no wait on the script lock for anyone.
- **How fresh "now" is** (`sync.js`): a signed-in player's answer goes with their progress about 3 seconds after it is
  given (`syncSoon`: `save()` after each answer, one timer restarted at each change, then a load and a send,
  `syncOnce`), so it is in the sheet within about 10 seconds; a device not signed in queues its answers (`ANONQ`)
  and sends them `ANON_SEND.MS` = 3 seconds after each answer (`anonSoon`, `sendAnon`, at most 100 per request), when
  the app is hidden or closed, or when back online, under the sheet's caps (`anon_`: 600 answers per device and 6000 for
  every device not signed in every 6 hours, [SECURITY.md](../SECURITY.md)). Each anonymous request holds the script lock
  for its own write (`anon_`: the Id column read to skip resent answers, the rows appended), so, by estimate (not
  measured on the live sheet), the lock's other waiters (saves, events, reports; `LOCK_MS` = 20 s) wait a fraction of a
  second more per anonymous answer, and the Apps Script quotas (30 simultaneous executions; web app requests count in no daily trigger quota) stay far below their limits at a
  class's pace ([sync.md › Saving and loading](sync.md#saving-and-loading)). Times are the device's own clock when it
  answered (`a.t`): answers played offline arrive later with their real times, a phone set to the wrong time shows
  wrong.
- **The demo** (`admin-demo.js` `live()`) has Carla playing now (24 answers over the last 15 minutes, 2 typed, 8 in the
  custom quiz) and a device not signed in that stopped 12 minutes ago, every other demo answer at least 2 hours old;
  `tests/admin.smoke.js` checks the Last column (sort, "now", one tap), the card (10 rows, newest first, Carla playing
  now with quiz, custom 8, duel and typed, the device 12 minutes ago by its id) and ↻.

### A session unfolded

What the player made of a session: a tap on a row of Recent sessions (or Enter on it) unfolds its summary in a row under
it, on the same page, a second tap folds it (`SOPEN` in `admin.js`, by player id and first answer time, so it stays open
across ↻ and redraws; several can be open; the player's link still opens the Journey). Drawn by `sessionSummary()` in
`admin-journey.js` from `sessionFacts()` (pure, between `// sessfacts: begin` / `end`, tested in
`tests/session.test.js`; thresholds in `SESS`):

- a sentence first (answers, length, right against the expected, genera met for the first time, Open all, genera
  learned, the most progress, the most misses and what they were taken for, the misses in a row at the end,
  achievements);
- the Journey's KPI tiles (start → end, length, answers, right with the expected share, progress % before → after) and
  its chart (`journeyChart`, with `opt.w` / `opt.h` for its smaller box and `opt.min` for its scale: right answers over
  the last `SESS.WIN` = 10 of the session against the expected, on a scale from `SESS.PAD` = 5 points under the
  session's lowest point, rounded down to 10, up to 100%; a dot at each new genus's first question, ★ at a genus learned;
  under 5 answers, the answers as dots);
- **New genera** (first asked in the session; "card": its card showed in it, not asked yet);
- **Events** (session k of N and the time since the last, Open all or the offer declined, the back card's choice, the
  first-launch question and its fallback cards as the Journey's Cards list words them (`jStart`), genera learned (the
  Journey's rule: the last right `|x` question of a genus learned now), mastery exam questions, typed answers, `SESS.RUN`
  = 10 right or more in a row, ending on `SESS.END` = 3 misses or more);
- **Most improved** (the genera whose bar rose `SESS.GAIN` = 2 points or more, at most 3: the player's answers replayed
  with today's rules up to the session's first answer, then through it, `sessProg`, `core.js` `replayProgress` with
  `start`, as `progOf` replays: the sheet's photo memory and confusions, the saved copy's reset and first-launch answer;
  a genus learned now counts as learned from the time its exam was passed);
- **Difficulties** (genera missed `SESS.MISS` = 2 times or more, pairs shown → answered 2 times or more, the photos of the
  questions missed, hardest first by the photo Elo, as Health's tiles: tap to enlarge; each says "recognised by N%"
  (`admin.js` `recognised`, `recPct`; [admin.md › Difficulty in words](admin.md#difficulty-in-words)), and a photo
  everyone misses by Health's rule (counted on players), `healthBad`, adds "hard for everyone"; both in neutral text);
- **Achievements** (`reefid-sync-ach` times within `SESS.EDGE` = 5 minutes of the session's answers; `savedOf` keeps
  that key) and **Journey →** (`#players/list/anon/<id>` for a device never signed in, which has no saved copy: no cards,
  achievements or learned genera).

A signed-in player's saved copy is read when their session is unfolded (one `userData`; the page draws again when it is
in, "…" until then), and read again by ↻ (`savedClear`, as on Players and the Journey). The panel is held at the left of
the table, as wide as the visible part of its scroll box (`--sw`, set by `bindStats`), as a Players row's actions
(`.adm-sess`, `.adm-urow` / `.adm-udet` shared with Players); phones and tablets stack its parts in one column, desktops
(from 1024 px) put the chart and Journey → on the left and the lists beside them, with smaller photo tiles. The demo
gives each made-up player achievements dated at the answers that earned them, and Carla 25% progress in the session she
is playing now, where the photos of the questions she missed are ones everyone misses (enough earlier misses of the
devices not signed in, several distinct players, to pass Health's rule, `everyoneMisses`, taken from their own answers,
never the last 8 answers of the device whose recent session Activity's checks read); `tests/admin.smoke.js` unfolds and
folds her session at 390 and 1280 px (tap and Enter).

### Activity over time and play hours

A card under Recent sessions (`activityCard`): answers, active players and new players (whose first answer falls in the
period) per day, ISO week (from Monday) or month (the switch, `SF.per`; gaps filled, the last 60 periods;
`activityOver`), then the answers by hour of the day (`playHours`, local time). Tested in `tests/activity.test.js` and
`tests/admin.smoke.js`.

### Visits

`#players/visits` (`admin-visits.js` `renderVisits`, its help `HELP.visits`), **one page for every subject** (`SHARED`:
no prefix, the switch inert there; `#fish/players/visits` lands on `#players/visits`; a Subject filter, All by default):
who opens the app and what for, games or not, signed in or not, from data already logged. One scrolling page from the
Pages rows (`loadPages`, the pages-opened summaries; `pagesRows` keeps the Browser column, `ua`) and the Events `load`
rows (`loadEvents`, the last 3000 events), joined to the answer log (the ids with answers, any subject) and the player
list (names); `sheetEarly` reads all four.

- `visitsOf` (pure, tested in `tests/visits.test.js`) groups the summaries into visits (one visit = one visitor id, or
  the device for a summary with no id, and one visit id; its parts added up; its time its first summary's), every
  subject's: its pages under their logged names (`core.js` `pageSubj`: a page drawn with Fish on screen is
  `fish.<page>`), **marked with the subjects whose pages it opened** (`subj`: Corals, Fish or both, counted once) and
  **as each subject sees it** (`on`: its pages, its time, a game of its, and the genus sheets for the replayed subject
  only: they are `data.json`'s genera, `sync.js` `pvGenus`).
- **Subject** (`visitSubj`): All (the default, every visit whole) or one subject, its visits only, each counted with that
  subject's pages, still marked with every subject. **A game** = a Practice page (quiz, custom quiz, duels, Memory; the
  Lab is not one, `visitGame`). **Who**: Signed in or Not signed in with answers, Never answered (no answer in any
  subject, signed in or not).
- **The load row** of a visit, the device's latest one sent within its first part and never after its first summary
  (`VISITS.NEAR`, `VISITS.SLACK`: `sync.js` sends the load row first), each joined once, gives the first page (`p0`) and
  installed (`st`; else the device's habit); a genus sheet keeps how each summary reached it (per source counts, the
  card's "From" the most frequent); an Events read that failed is said above the numbers.
- **The device** (`devClass`): a phone from the Browser column ending in "mobile", a tablet estimated from the median
  window width `w` of the device's load rows (a mobile browser `VISITS.PHONE` = 600 px or more, a computer's browser from
  600 to under `VISITS.DESK` = 1024 px: an iPad's Safari presents itself as a Mac), else a computer; approximate, and
  only for devices still in the Events read (said in the help).
- **Filters** on one row (`VF`, kept as `reefid-admin-visits`): Subject All (default) \| Corals \| Fish (each with its
  switch icon), Period 7 d \| 30 d (default) \| All, Visits **Without a game** (default) \| All visits, Who Everyone \|
  Signed in \| Not signed in \| Never answered, Device All \| Phone \| Tablet \| Computer (`visitsPick`).
- Five numbers (`visitKpis`: visits, "of N" in all when without a game, visitors, never answered, median visit, on a
  phone) and the cards: **Visits over time** (Day \| Week from Monday, `visitPeriods`, the last 60; visits, visitors, and
  the hour of the day; on All visits the visits with a game stacked in a pale tint above those without); **Pages opened**
  (grouped Home, Learn, Identify, Practice, Progress, Other, a page of each subject its own row in its subject's words,
  `vPage`, marked with its subject's icon on All, `vLab`, `vMark`: the Coral ID Key and the Fish ID Key apart; visits,
  share, visitors, median time in a visit that opened it, total); an **ID Key** card per subject (every subject with
  visits on All, the one filtered otherwise: visits, visitors, median time, first page, by who; the steps inside the Key
  are not logged yet); **Genus sheets** (the replayed subject, on All or on it alone: the 8 most opened, visitors, time,
  reached from); **First page** and **Device** (class × installed app \| browser tab \| not known); **Screens** (the
  screen sizes the players use, for the multi-photo game formats; not filtered, drawn even when the filters keep no
  visit: the devices that sent their screen in the last 90 days, each once with its most common size, `screensOf`,
  `screenBand`, `vScreens`): the share of devices per width band (≤360, 361-390, 391-414, 415-600 by a phone's short
  side and the band it sent; Tablet, Desktop by `devClass`) and the 8 most common sizes (width × height, pixel ratio);
  **Visitors** (newest first, each row and each unfolded visit marked with its subjects, `vMarks`; the 12 most recent
  then Show all; a tap unfolds their last 8 visits, `VOPEN`; the name or anonymous id opens their Journey on the subject
  filtered, on All the one they spent most time on, the link naming it, `data-own`: `visitorSubj`).
- The demo (`admin-demo.js`) adds Ben and Carla coming back to read, two devices not signed in opening the Key, and 12
  devices that never answered (staff on computers, an iPad, an Android tablet, two on the Fish side), each with a load
  row; `tests/admin.smoke.js` checks every card, the numbers, the filters (Subject among them), a visitor unfolded, Show
  all, the shared page (the switch inert, both subjects' visits and marks, `#fish/players/visits` landing on
  `#players/visits`) and the help, at 390 and 1280 px.

## Live analyses from the answer log

The Analyses views read live from the answer log (`renderStats`): Pairs, Heatmap, Answer log and Stops. The views of the
stored report are ARCHITECTURE "Analyses".

### Answer log

`#analyses/learning/answer-log`, live from the answer log: the learning curve, calibration, conditions (the questions on
each rank, `logConds`, which a Journey's Games reuse), the units (genera, or a subject's units in its words: `manyWord`,
`stopWord`; Genera with the median player Elo on each) and the mix-ups.

### Health and Stops

**Health** `#inbox/todo/health` and **Stops** `#analyses/learning/stops`, on each subject's side (`statsHealth()` draws
both, `healthBad()` and `healthGenera()` shared with the red line of To do › All, thresholds in `HEALTH`): most players
never send feedback, so the admin reads what the logged answers already say. No new data, anonymous ids only, counts.
One role per admin page: Health (To do: is something wrong?) keeps what needs action, Stops (Analyses › Learning: what we
learn) the rest. On a subject other than the corals: its answers (`rowsOf`), its units by name (`repUnit`; a fish species unit by its scientific name), its sheets
opened from its sheet page (`fish.learn.genus` for a family, genus or species sheet alike, since `core.js` `pageName`
logs every sheet in the corals' words; `sheetVisit`), the corals' from the summary's genera.

- **Health's photos**: the fish's (and the sea slugs') from `fishAdmin` with every tool of their family's page
  (`fishRepTile`), as the corals' with their genus page's (`coralRepTile`; the To do tiles' grid, one a row on a phone),
  counted on their answers alone since the sheet rates the corals' photos only, and its slate's units with the
  scientific genera its answers met (`g:Chromis`, each in its own row; the slate holds families only): `healthBad`,
  `healthGenera`, `healthUnits` with the subject. To do › All's red line is each side's own (`healthLine(S)`).
- **Photos everyone misses**, counted on players, not answers (one player missing the same photo six times, or a new
  photo one player answered, is not "everyone"): answered by `HEALTH.PL_MIN` = 3 distinct players or more,
  `PL_MISS` = 2 or more of whom, and a majority, miss it (under `PL_LOW` = 50% of their own answers on it right), and
  either shown in `PH_MIN` = 5 answers or more with under `PH_LOW` = 40% right (the minimum keeps out photos answered
  once by each of 3 players, 2 wrong, which happens by chance at the game's ~80% target) or a photo Elo at least
  `PH_FAR` = 1 above the median of its genus's rated photos (with `PH_MIN` = 5 rated answers): maybe mislabelled or bad.
  Each tile gives right %, answers and the players who miss it out of those who answered it; the thumbnail opens the
  lightbox (`data-zf`), the genus name its page. One rule for Health, To do's Health line, the session summary's "hard
  for everyone" and the demo data built for it: `admin.js` `photoAnswers`, `missedBy`, `manyMiss`, `everyoneMisses`
  (between `// everyone: begin` / `end`, tested in `tests/health.test.js`), used by `healthBad`.
- **Genera that don't take off** (per slate genus: players who met it, the median of their right rates on it, Stuck =
  players with ≥10 answers on it under 50% over their last 10; `HEALTH.G_MIN`, `G_LOW`).
- **Stops**: players, sessions, sessions per player and answers per session; **Where players stop** (a session =
  `sessionsOf()`, one whose last answer is more recent is still going and not counted as ended; answers per session 1-5
  / 6-10 / 11-20 / 21-50 / 51+, sessions per player, how sessions ended (misses in a row on the last answers, sessions of
  ≤10 answers, `HEALTH.EARLY`, against longer ones: frustration shows as short sessions ending on misses), the genus and
  game of the last question of the short ones); **Genus sheets opened** (the Pages opened summaries).
- The answers and players per day are Players › Activity's Activity over time (day view).
- Works in `?demo` (the made-up players play in sessions of 5-40 answers about 30 seconds apart; the devices not signed
  in answer at random hours, mostly one answer a session). `tests/admin.smoke.js` checks both pages' sections and no
  sideways page scroll at 390 and 1280 px.

### Confusions: Analyses › Difficulty › Pairs

`#analyses/difficulty/pairs` (`statsConf()`): pairs of genera with offered together, mixed up, rate, direction (A→B,
B→A) and the same score the quiz uses for traps (the prior shown as Look-alike / Family / Key group / Other, `admin.js`
`pairPrior`; the corals' slightly higher start for a shared growth form is not shown; the fish's start is the game's,
`model.js` `confPrior`, for families, genera and species: `fishUnitRec` reads a family's declared look-alikes, a genus's
sibling genera, a species unit's sibling species (`reports.js` `repReg` `spu`, `core.js` `treeSpUnits`) and the family's
group of the identification key, Key group; `tests/pairstart.test.js` checks every pair on the real `fish.json`). A pair
no source declares that qualifies as a look-alike from the data (`core.js` `dataLook`: `CONF.N` 20 offers or more, score
`CONF.TRAP` or more) says "look-alike from the data" in its Starts as column, counted in a KPI: the duels, the Again and
the genus sheets treat it as declared. Then the photos, colonies (iNaturalist observation `o`) and species (`t`) most
often answered wrongly, with what they were taken for. Counts come from `confusionOf()` (`core.js`) over `?answers=1`
rows; answers logged before choices were (no choices) only appear under "Before v10". A typed mix-up (no choices
either) is listed under "Typed" and also counts in its pair as offered once and mixed up (`core.js` `confAdd`, the one
rule of `confusionOf` and of `Code.gs` `statsStep_`, so the pairs and scores shown are the `?stats=1` `conf` the game
plays with; A→B and B→A count the choices only). The "Typed text" card lists the typed near-misses as typed
(`admin.js` `typedText`, `readAnswers`' Typed and Retyped right): a typo of the unit shown with its spelling step (✓
retyped exactly, ✗ not) or another unit's name, with a KPI of the spelling steps retyped exactly; trusted players only,
a removed account's answers never; the raw text shows live only, never in a stored report.

### Heatmap

`#analyses/difficulty/heatmap`, Analyses › Difficulty › Heatmap (`admin-heatmap.js` `statsHeat`): every unit against
every unit, live from the same reading as Pairs (`confusionOf`, `noChoiceMixups`, `pairPrior`, memoised per log), for the
corals their whole slate on both axes (`core.js` `slateOf`, a genus not answered yet with empty cells; a bonus genus once
met).

- **Cells**: rows the unit shown (the photo's), columns the unit answered; a cell's number is the mix-ups (the column
  answered when offered beside the row, `confusionOf` `dir`), its colour that one direction's rate shrunk toward the
  pair's start the way Pairs' Score is (`confScore` toward Look-alike / Family / Other) in five strengths (`HEAT.BINS`:
  5%, 10%, `CONF.TRAP`, `CONF.LOOK`; the quiz's traps read `CONF.TRAP` on the pair's two-way score, never one cell),
  hatched under `CONF.N` offers (not enough data yet, rule A5), a declared look-alike outlined and one from the data
  (`dataLook` on the pair) dashed; an empty cell was never offered.
- **Order**: the units in blocks of their family (their record's `fam`, the prior's own field; never by growth form, rule
  C4), the biggest block first, units with no family in one block last; inside a block the pairs mixed up most side by
  side (`heatOrder`: from the unit with the most mix-ups in the block, each next the strongest pair with the last placed,
  ties by name). A cell opens the pair on the site's compare page (a subject with `cmp`).
- **Typed** (a switch, `SF.hm`): the typed mix-ups apart, counts only (no choices, so no rate), as Pairs keeps them.
- An HTML table in its own scroll box, its header row and name columns sticky, so a phone scrolls the matrix inside the
  box, never the page; larger cells on a touch screen.
- **What it can conclude** (rule A5, `heatNeed`): a KPI counts the cells offered `CONF.N` times or more; while most cells
  offered are under `CONF.N`, a line over the map says "Not enough data yet" with about the answers with choices it would
  take (the offers the short cells lack, over the offers a trusted player's answer has brought a cell so far: an
  estimate at today's mix of formats, not a bound); with no answer in the subject yet, "Not enough data yet: no answers
  yet" and no map; with answers but no cell yet (none with choices from a player whose answers count, `trustOf`), a line
  says so over the map.
- **A subject with units at several ranks** (`SUBJECTS` `sheets`: the fish): one map per rank its questions asked
  (`heatRanks`: a rank switch, `SF.hr`, Families / Genera / Species, a rank on it once one of its questions is logged; a
  question's choices are of its rank, so `heatRank` keeps a rank's pairs and typed mix-ups out of the one `confusionOf`
  over the subject's whole log, its trust included), its units named from its registry (`reg`, read by `regLoad`;
  [admin.md › Each subject's admin part](admin.md#each-subjects-admin-part-subjects-admin)), with Pairs' starts
  (`regRec`: `fishUnitRec`, a family's declared look-alikes, two genera of one family). Its top rank in blocks of its group in the identification key in force (the record's `ig` and the key's
  titles, `repReg` `groups`; rule S3; one block where it has no key), every unit of its slate on the map; a lower rank in
  blocks of the rank above (`heatMatrix` `blockOf` over `heatUp`: a genus in its family's, a species unit, `s:s091`, in
  its genus's, from `repReg` `spu`), its units as met, named by `heatLab` (a fish species unit by its scientific name,
  as `repUnit` names it on every page: in italics, linked to its family's page). A subject whose units are a lower rank (`unitRankOf`: the sea slugs' genera) has every unit of its
  slate on the map at that rank. Where its tree sorts its families into taxonomic groups (`seaslug.json` `taxa` and each
  family's `tg`, from `tools/seaslug_groups.json`; `repReg` `taxa`), the families' blocks sit in their group, in a sticky
  column of the groups left of the families' (`heatMatrix` `supOf`, `sups`: each group in one run, the biggest first, as
  the blocks). No cell link (the fish have no compare page). Its help in its own words (`fishheat`).
- Only for a subject whose `SUBJECTS` `admin` `pages` name it (the corals, whose list is every page; the fish; the sea
  slugs). The pure part (`heatMatrix`, `heatOrder`, `heatBin`, `heatRanks`, `heatRank`, `heatNeed`, `heatPlayers`) is
  tested in `tests/heatmap.test.js`.
- **One player's map**: a filter on the view, not a page (rule A2: the same information),
  `#analyses/difficulty/heatmap?player=<anonymous id>` (`fish/` before it on the Fish side; the subject switch keeps a
  page's filter after `?`): the same cells, ranks, blocks, roster and Typed switch from that player's answers only
  (`admin.js` `rowsOf`: a deleted, merged or archived account's answers are out, so its id shows "No answers from this
  player here", rule D7), their part of every pooled cell by the same rules (their answers count once trusted,
  `trustOf`, as everyone's; until then a line says so); the A5 line in their words ("more of their answers"). Reached
  from a player picker over the map (`heatPlayers`: Everyone, the signed-in players by name, then under Not signed in the
  devices by anonymous id, the latest first; the player list read with the log, `renderStats`) and from **Heatmap ›** in
  the Mix-ups card of their Journey (the subject on screen; none for an archive), with **Journey** beside the picker
  back.
- Difficulty › Mix-ups is the other reading: the stored report's fit, only the units mixed up, grouped by their mix-ups
  (`mixMap`).
