# Achievements and the leaderboard

The 🏆 page's two tabs, the leaderboard (`#leaderboard`) and the achievements (`#leaderboard/achievements`), and the
player's badge on My progress. This is the specification of what the code does now; why each part was decided is in
the PRs and [docs/decisions/](../decisions/README.md). The sheet's side (the board's ranking, its replays and groups)
is in [sync.md](sync.md#the-leaderboard-follows-the-rules); the cards' look in [DESIGN.md](../DESIGN.md) "Cards";
rule L8 keeps achievements to learning milestones.

## Achievements

**The 🏆 page's second tab** (`boardTabs()`), `#leaderboard/achievements`.

**Per subject.** Each subject shows and checks its own list (`SUBJECTS` `achs()`: the corals' `core.js` `ACH`, the
fish's `FISH_ACH`, the sea slugs' `SEASLUG_ACH`; its ? text is `UNITS` `achHelp`), all in the one synced record
(`reefid-sync-ach`) under ids of their own (the fish's start with f, the sea slugs' with ss), so a fish achievement
never counts in the corals' and back. The Contributions are one family shown on every subject (`ACH_CONTRIB`). The
record's feats (runs, corallites, hard photos) are kept by the corals' answers only (`SUBJECTS` `achFeats`: another
subject's answer neither extends nor breaks the run). `achFind(id)` finds an achievement in any list (pop-ups, the
admin's Journey).

**An achievement** has a family (its icon), a tier 1-3 (shown 🥉🥈🥇) and a test on a snapshot of the player's progress
(`achSnap()`). They pop up as they are passed, spread out over the ~300-430 questions learning a whole genus takes. Their
descriptions say what the player can now do (informational feedback motivates: Deci, Koestner & Ryan 1999,
*Psychological Bulletin* 125(6)); counts stay counts (genera met, progress %, Elo). The lists are learning milestones
only, never time or days played (rule L8):

- the corals' (`ACH`): genera met; the genera at each mastery level (`lvStep`: 5/10/20 genera at Open Water or above,
  5/10/20 at Advanced, 5/10 at Divemaster; Instructor on 1/5/10/20/all; the ids of the former quarter rungs are kept, so
  nothing earned is lost); overall progress 5-100%; runs of 10/25 right answers; the first duel won (a 2-choice
  contrast: the Duel tab, a duel in the quiz or an Again, `core.js` `contrastQ`); right with the
  corallites alone; right on a photo most players miss (`PSTAT`: half or fewer of its 5+ answers right) shown alone
  (Sharp eye); Elo 1100-1400 (the device's global level, from `ELO_MIN` = 200 answers); an IMR group fully learned; a
  bonus genus met; Coral basics done (every step seen: `proto/basics.js` calls `achBasics()`, which sets the feat
  `_basics`);
- the fish's (`FISH_ACH`): families met, the families at each level, Instructor, the circles at Advanced, the global
  fish score every 10 points, the scientific genera at Open Water and Advanced, species by their common names and by their
  scientific names, Fish basics done (fbasics, "Fin to tail": the fish's feat `_fbasics`, set by the same `achBasics()`);
- the sea slugs' (`SEASLUG_ACH`): genera met, genera at each level, families with every genus at Advanced, the taxonomic
  groups (the nudibranchs first), the first circle, the sea slug % every 10 points.

The runs and Sharp eye count only in the normal photo quiz (its Again, typed questions and slipped-in duels included),
never in the custom quiz, the Duel tab or a live game: an answer there neither extends nor breaks the run
(`achAfter(good, ph, cur)`, `achRunIn`); its other achievements count as anywhere.

Descriptions say what the player can now do ("You told two look-alikes apart"); counts stay counts. Achievements are
only added: nothing takes one back but the recount below (a learned mark taken away keeps them: below).

**Two families.** The learning achievements (`kind: 'learn'`) and, apart, the **Contributions** (`kind: 'contrib'`,
💬, three more in `ACH`): *First feedback*, *Helping hand*, *Co-author* for the 1st, 5th and 10th report counted. They
encourage players to send feedback and show it is taken seriously, and never count in the learning: the badge's and
`#ach`'s "earned / total" count only the learning list (`progress.js` `ACH_L`), `#ach` lists the Contributions in a
section of their own below it (`ACH_C`, with the number of reports counted), and nothing in the progress or the
leaderboard reads them.

- A report counts as it is sent (`sync.js` `reportDialog` calls `progress.js` `achReport`, which calls `core.js`
  `contribAdd`), from anywhere (a game, the enlarged photo, a genus sheet, Send feedback), signed in or not, whatever the
  subject on screen. One per photo: a report on a photo already in a counted report does not count again; a report on
  no photo counts once, by its id; an "Other" report counts only with a note; nothing counts on a device still signed
  in with an account the admin deleted (the sheet answered `gone`).
- The counted reports are the record's `_fb` (each one its photos joined by a space, or `r:<id>`; at most
  `CONTRIB_MAX` = 50), synced with the rest: `mergeAch` joins two records' lists by the same rule (`contribJoin`), so
  one photo reported on two devices before they synced counts once. The snapshot's `fb` is its length.
- A report sent from Home or About before `progress.js` (tier 2) is in is counted once it comes (`need(2)`).
- Every Contributions tier shows at once: the first as the toast, the 5th and 10th as a card that stays until closed
  (`progress.js` `achCard`, `cardShow` kind `ach` with the achievement's emoji, its button deaf for 600 ms and Enter not
  pressing it, `cardCalm`; one card at a time, `cardFree`).

**Pop-ups.** `achCheck()` stores the new ones in `reefid-sync-ach` and pops up only the first of each family (icons;
🌱🌿🪸 are one family, 🎓👑 one, ⭐🌟 one: `achFam`) and the top tier; several at once make one toast (`achRecap`). The
others land quietly in `reefid-ach-new` (this device only, outside the synced record, so a sign-in or another device's
sync neither brings nor drops them; cleared at sign-out), with a red dot on 🏆 in the header and on 🏅 in the player's
card (`achDot`) and a "New" tag on `#leaderboard/achievements`, which clears them. A toast (`achPop`) is queued, shows
4.2 s, has confetti but under reduced motion, and never shows over a card or the tour (it waits, `achBlocked`,
`achHold`). A device with progress but no record yet gets what is already met in one recap pop-up.

**The record** (`reefid-sync-ach`, a `reefid-sync` key, so synced): `{id: time, _run, _best, _cor, _hard, _gone,
_basics, _fb, _rep, _thx, _thxAt}` (the fish's and the sea slugs' done feats `_fbasics` and `_sbasics` too). `achSnap()` builds the snapshot; `achAfter()`
runs after each answer (the run of right answers, one-off feats; `quiz.js` `recordAnswer` passes the game, `cur`);
`mergeSaved()` unions two devices' records with `achMerge` / `core.js` `mergeAch` (each achievement with its earliest
date, the best run kept, the current run this device's).

**Recount.** Records carry `_v` = `ACH_V`, and `achMerge` takes no achievement from a record of another version (its
feats yes). Raising `ACH_V` makes every device recount every subject's list once on its own progress, silently
(`achMigrate()`, `inSubject`, `core.js` `achRecount`): each achievement tested again on the current rules, those still
met keeping their date, the others locked again, the feats kept. An achievement taken out of a list goes from every
player at that recount (the new record holds only the list's ids): none is kept for those who had it. A subject whose
data is not in yet (a lazy-loaded one) keeps its achievements aside on the device (`reefid-ach-old`, cleared at
sign-out) until its data comes (`achPending`: from `app.js` `treeLoad` and before each check), so nothing untested
travels.

**A learned mark taken away** by a recalculation (`model.js` `mxRecalc`, LEARNING.md "Learned under the former model")
keeps the achievements and tells nothing (`model.js` `MXL.QUIET`). The code for the other way is kept: with `QUIET` off,
the learned-based achievements (`core.js` `ACH_LEARN`) the progress no longer meets are taken back (`progress.js`
`achRecheck`, `core.js` `achRevoke`, dated in `_gone` so the union never brings back a copy earned before) and the
player is told once by a card (`progress.js` `mxLostNotice`, `reefid-mx-lost`, each mark told also in the account's
`reefid-sync-told`).

**The list page.** `#leaderboard/achievements` lists them, earned first (newest first) with their date, then the others
by how many players hold them (the next within reach first), each with the share of signed-in players holding it (the
sheet's `GET ?achs=1`: `{n, counts}` from each player's saved `reefid-sync-ach`, counts only; `loadAchs()`, kept 5
minutes in memory). The leaderboard and the achievement shares are also kept on the device (`reefid-achs-cache`),
drawn at once, then refreshed.

## Your feedback helped

When a report is **handled**, the player who sent it is thanked at their next visit.

- **Handled** is Pierre's Done in the admin (To do › Reports ✓ Done, `curation.json` `seen` `'rep:<id>'` once
  published) **or** a PR's: **`reports-handled.json`** at the repository root, `{"<report id>": {"pr": 577, "at":
  "2026-11-05"}}`, edited in PRs by the integrator when a PR fixed what a report said (agents never write
  `curation.json`). `core.js` `handledSeen` makes one map of both, read by the app (`progress.js` `handledLoad`: fetched
  only by a device whose record holds report ids, again at most every 30 minutes) and the admin (a report in the file
  leaves the to-do list and the Inbox count and is listed folded under it, "Handled in a PR", each line "handled in #N"
  linking to the PR: `admin.js` `handledLoad`, `repsPR`).
- **The thanks** is a card that stays until closed (`cardShow` kind `feedback` with 🙌, `cls: 'helped'`: kicker "Thank
  you", *Your feedback helped*, "A report you sent was looked at and handled." or "N reports you sent were…"; one OK,
  deaf for 600 ms, Enter not pressing it, `cardCalm`), shown at a calm moment (`progress.js` `achHelped`,
  `helpedCalm`): never over a question, a card, the tour, a toast or the report dialog (it waits for them, `helpedMo`);
  with a game on screen, at the break at Next when no other card took it (`helpedArm`, called at the end of `quiz.js`
  `answer`; closing it goes on to the next question). A card the safety net had to close because it was never drawn
  (`cardShow`, 2.5 s after the first frame drawn; the event `empty card closed`) is not counted as read: it is due again
  at the next check.
- **Never again and again**: at the first report handled, then every report handled since the last thanks in one card,
  at most once per 7 days (`core.js` `helpedDue`, `HELPED_GAP`; `helpedMark` on closing; the record's `_thxAt` is the
  time of the last thanks, the latest of two devices in `mergeAch`). Left unseen by leaving the page, it comes back.
- **When it is checked**: at start-up (signed in: only once the sheet's load reply and its saved record are merged,
  `sync.js` `repsSeen`, `repsPulled`, so a thanks given on another device is never repeated), when a new
  `curation.json` arrives (`app.js` route), when `reports-handled.json` is read and when the sheet lists the player's
  reports.
- **Never for an account the admin deleted**: the sheet answers its device `gone` (no `reps`), and a device holding
  `SYNC.err === 'gone'` thanks nothing and counts no Contributions; `Code.gs` `repsOf_` never returns a deleted
  account's reports, even when its name is taken again by someone else (only reports sent after the name's last
  removal, Removed tab).
- **The ids.** The record keeps the ids of the reports the player sent (`_rep`: stored as each is sent, `achReport`;
  and, signed in, from the sheet's load reply, `reps`, the ids of their own verified reports, the last 50, `repsOf_`,
  read from the script version that serves it, `sync.js` `repsSeen`) and those already thanked (`_thx`), the last 100 and
  200 (`core.js` `LIST_MAX`: more thanked kept than sent, and twice the sheet's 50 sent, so an id the sheet lists again
  never lost its thanks), synced and joined across devices like `_fb` (`core.js` `repsAdd`). An anonymous player's
  reports are matched on the device that sent them (the ids it kept). Ids only: nothing Pierre or the PR writes reaches
  the player. `#ach` adds "· N handled" to the Contributions' line.

## The badge

My progress shows the player's **badge** (`badge()`): the overall ring with its %, the initial and name, then on its own
line the units unlocked ("30/40 genera unlocked": `progress.js` `unlockText`, the subject's units opened on the path,
`model.js` `introduced`, out of `slateGenera()`, in `SUBJECTS` `many`; the header pill has no room for it, so only its
tooltip says it), the two highest levels reached (`lvSummary`), 🏆 the leaderboard place and the Elo (`#leaderboard`;
the Elo is the device's own level, `eloLine()`, shown only from `ELO_MIN` answers, with no countdown; the board brings
the place only), and 🏅 earned / total with the latest three of different kinds (`#leaderboard/achievements`). Under the
ring (`#pbrank`), linking to the leaderboard: the rank (from the board) and the Elo (always the device's own, so it does
not change when the board loads).

## The leaderboard

🏆 in the header on every page (`#boardgo`), the first tab of the 🏆 page (Leaderboard / Achievements): the signed-in
players by progress %, then Elo, shown only from `ELO_MIN` = 200 answers (before, the badge says how many answers are
left: `eloLine()`). `eloScore()` = 1000 + 200 × the player's global level (`P['~level'].th`), which the sheet's `board_`
reads from each player's saved progress, `ELO_MIN` counted on that record: one level shown everywhere. The player's row
is highlighted and shows this device's level (`eloLine()`, as My progress). From the sheet's `?board=1` (`loadBoard()`,
kept 1 minute in memory).

**One leaderboard per subject** (`SUBJECTS` `board`), no merged ranking. The page shows the subject on screen's
(`boardSubj()`; the header's subject switch redraws it, the address stays `#leaderboard`): the corals' by coral %, the
fish's by the fish global score (My progress's ring: `model.js` `headPct`, `core.js` `treeScore` over the subject's
tree, `UNITS` `tree`), the sea slugs' by their own %, each then by that subject's Elo (its own `P['~level']`). A
subject's board is live once the sheet serves it (`boardLive`); until then the page shows the first subject's, with no
rank on My progress and no announcement. The first subject's board is
`?board=1`, another's `?board=1&s=<id>`, shown from a board reply (`boardOk()`; a subject whose board comes with a later
script, `SUBJECTS` `boardSheet`, only from a reply that says it, rule D4: an older script answers with the first
subject's board, never shown as another's). Each subject's copy is kept apart on the device
(`subjDev(id, 'board-cache')`: `reefid-board-cache`, `reefid-fish-board-cache`), drawn at once, then refreshed, fetched
with tier 4 after the quiz and its next photos.

**The fish score's tree.** The app sends its tree with a save (`summary.boards {fish: {f, s}}`) and `board_` ranks by
`treeScore` over it (an older app's list read as before). The sheet keeps the tree in chunks (`BOARD_CHUNK_`), up to
`BOARD_TREE_MAX_` = 50,000 characters, so one entry per species fits (`Code.gs` `boardTreePut_`, `boardTreeGet_`,
each chunk and the whole tree checked both ways, a refused or unreadable tree logged in the Deploy log, `boardLog_`).
Every save reply carries `bt`,
the checksum of the tree the sheet holds, and from a reply with `v` ≥ `sync.js` `TREE_SHEET` the app sends the tree only
when it changed or the sheet holds another (`treesSeen`, `reefid-board-trees` on the device; with every save before).
The species units open only from `TREE_SHEET` and `SPECIES_SHEET` (`sync.js` `speciesOn`, rule D4); the tree then holds
one entry per species with a listed name, its unit `s:s091` as its common names (`core.js` `treeScoreTree` on). The
sheet's own copy of each subject's tree: [sync.md › The leaderboard's tree](sync.md#full-replay).

**On the board by default.** Signed-in players appear by default; ⚙ Leaderboard On/Off (`reefid-sync-board` = `{v, t}`,
sent with each sync as the summary's `board`; `mergeSaved()` takes another device's choice when it is more recent, so an
opt-out holds on every device). Players already signed in are told once (`boardNotice()`, `reefid-board-told`), on a
subject that has the leaderboard (`SUBJECTS` `board`) only; a subject switch takes the note away and it is due again
(`progress.js` `toastsOff`). The note never covers a question: it waits while a game's question is on screen, answered
or not (`.q` in the view), shows on the first page without one (Home, Learn, My progress) and, if a question opens
while it shows, is taken back, not told, and comes at the next break (`progress.js` `noticeHold`, `boardStep`; REE-210).

**The admin's 🌱**: the account the admin page is signed in to when it reads the answer log with a valid admin token
(`admin.js` `loadStats`, `aname` / `apin`; `Code.gs` `answers_`) is the admin's account, one at most, kept as its code
hash in the script's properties (`ADMIN_ACCT`, `adminAcct_`; written under the script lock with its row read again
there, `adminClaim_`, so a read under way never undoes a delete, merge or archive; another account signed in there
replaces it; a delete, a merge (its from) and an archive clear it, `adminDrop_`, rule D7). Its rows on every subject's
board carry a 4th field `1`, its load reply `admin: 1`; from that field (`core.js` `markRow`) the app shows a plain-text
🌱 after the name's element, outside its text (`core.js` `markHtml`, `.bwho` > `.bname` + `.amark`, never cut by the
name's ellipsis; title and label "Admin"), on the board and on the account line in ⚙ (`sync.js` `markSeen` from a real
load reply only, never a light save's own copy; `markMine`, `reefid-amark` under the account's name, cleared at
sign-out and by a load that finds no account under the name). No step for the admin: the account's name is unchanged.

**Group boards** ("Player groups" in [sync.md](sync.md#player-groups)). From a reply with `v` ≥ `GROUPS_SHEET`
(`progress.js` `boardScopes`, rule D4) the page shows the boards of the player's own groups first (each under its
name; `myGroups`, the load reply's `gids` kept as `reefid-groups` `ids`), then **All players** (everyone), each its own
list with the player's row marked; every other group's board in a closed **Other groups** fold (`.bmore`; an empty one
left out). My progress's rank is the player's place on the first of them that lists them. From `SCOPES_SHEET` to
`GROUPS_SHEET` - 1: the player's cohort, **Staff**, **All players**, **Other cohorts**. An older reply, or no other
board: the one board, untitled.
