# Deleted accounts: where a player's data lives, what delete / merge / rename do, and a cleanup policy

Audit of 2026-11-05 (about 16:45-17:30 Manila), read-only: no branch, no PR, no sheet writes. Code read at `origin/main`
4ef43b16 (sheet script v51) and at the open branches `claude/feedbackach` (#579, v52) and `claude/feedbackach-helped`
(#581, v53). Sheet read with the connector (counts only below). Players are named by role, never by name.

**Pierre's principle (2026-11-05):** when an account is deleted, the information tied to it is cleaned up. Keeping data
as an archive is fine, but archived means not used in normal operation.

**Trigger, reconstructed.** Pierre's test account sent one verified report on 2026-11-01. The account was renamed on
11-02 (the report followed it to the new name) and deleted on 11-04. The delete kept the report: it is still in the
Reports tab under the deleted name, marked Verified. The admin Inbox showed it as a live report, and it was marked
**Done** (`curation.json` seen `rep:<id>`). In #581's first commit, `repsOf_` matched reports to a player by name only.
The Removed tab blocks only the old name and code together, so anyone signing up again under that name with another
code would have been thanked for the old account's report. #581's Codex fix (only reports sent after the name's last
removal) closes that one path. The cause is wider: **today a delete leaves every report, and several other traces,
tied to the deleted name and live in normal operation.**

---

## 1. What the real sheet holds today (counts only)

| Tab | Rows | Deleted / archived accounts |
|---|---|---|
| Removed | 1 | 1 deleted account (Pierre's test account, 2026-11-04 14:12, deleted outright, not merged into another account) |
| RAs | 11 live accounts | no archived (renamed) record left; Board is 1 for all 11 (none hidden) |
| Answers | 1,933 | **0** `~deleted` rows: the test account was deleted with its answers. 1 device that never signed in (`~anon`, about 70 answers) |
| Reports | 4 | **1 from the deleted account** (Verified 1, reason Other, 11-01), still under its name; its id is **marked Done** in `curation.json` (2 of the 4 are Done) |
| Progress data, By genus | 11 each | none for the deleted account |
| Replayed | 12 | none for the deleted account; **1 orphan row** of a `~anon` device whose answers are no longer in Answers (claimed at sign-in or deleted: neither path drops the Replayed row) |
| Pages | about 240 (11-04 and 11-05) under 9 admin ids | not checkable without the secret salt; a delete with answers drops the account's Pages rows (`pagesDrop_`) |
| Events | about 990 | no row names the deleted account (the 2 `old` rows carry no name) |
| Analyses | 1 report | made 2026-11-05 15:41 Manila over 1,933 answers, after the deletion: nothing of the deleted account in it |
| Groups, Alerts | do not exist yet | none |
| Activity | `QUERY` over Answers | follows Answers |
| Deploy log | script events only | no player data |

**What remains for the deleted account in the sheet:** its Removed row (the tombstone the 'gone' check needs) and **its
report**, still under its name, Verified and Done. Its id in `curation.json` (public, ids only) is harmless once no live
account can claim the report.

---

## 2. Inventory: every place a player's data lives, and what each action does to it

Actions (`tools/sync/Code.gs` `users_`, admin Players › a row):
- **Delete+A**: `userDelete` with `answers: true` (the admin dialog's "OK: delete them too").
- **Delete−A**: `userDelete` with `answers: false` (the "Cancel: keep them without the name" choice).
- **Merge**: `userMerge` (two names of one person).
- **Rename**: `userRename` (keeps a record apart as an archive, hidden from the leaderboard).

"Acts after" = the data still shows or acts in normal operation afterwards.

### 2a. Sync sheet

| Where | What it holds | Delete+A | Delete−A | Merge | Rename | Acts after? |
|---|---|---|---|---|---|---|
| RAs | name, code hash, saved summary, Progress %, Board | row deleted | row deleted | from deleted | row renamed, Board −1 | **Rename: yes.** The archive stays a full player everywhere except the leaderboard (§3, gap G6) |
| Progress data | saved progress JSON (includes the achievements record: `_fb`, `_rep`, `_thx`) | deleted | deleted | into gets the merged copy; from deleted | relabelled | Rename: yes (as RAs) |
| By genus | per-genus status row | deleted | deleted | from deleted | relabelled | Rename: yes |
| Replayed | the full-replay record | deleted | deleted | from deleted | dropped (rebuilt on demand) | no. **But** an anonymous device's row is never dropped when its answers are claimed or `anonDelete`d (1 orphan today, G10) |
| Groups (v48) | beta memberships | dropped | dropped | joined into into | relabelled | Rename: yes ("Add all" also adds archives) |
| Answers | every answer, Name column | **deleted** | relabelled `~deleted <aid>` | relabelled into | relabelled to the archive name | **Delete−A: yes, more than photo difficulty** (§3, G3) |
| Pages (v30) | page summaries under the admin id | dropped | moved to the `~deleted` id | moved | moved | Delete−A: yes (anonymous per-player behaviour, kept with no stated use) |
| **Reports** | reporter **name**, Verified, note, photos | **untouched** | **untouched** | relabelled into | relabelled | **Yes, every case** (G1, G2) |
| Events | device id, kind; `old` rows may put a name in Message | untouched | untouched | untouched | untouched | Name mentions stay (none today; G9) |
| Alerts | `limit reached: n:<name>` | untouched | untouched | untouched | untouched | Name mentions stay (tab not created yet; G9) |
| Removed | name, code hash, into, time | +1 row | +1 row | +1 row (into) | Into column relabelled | **Needed**: the 'gone' check and #581's cut read it; the admin lists it under Players › Removed. Correct use of a tombstone |
| Analyses | per-player results under anonymous ids | stays until the next run | stays, and the `~deleted` id goes into every later run | stays | stays | **Yes** (G5). The Action refits only after 1,000 new answers (or an engine change) |
| Script caches | `board14` (5 min), `achs15` (10 min), `stats15` (10 min), the hold cache | hold dropped; **board / achs / stats not cleared** | same | same | board + stats cleared, achs not | Up to 5 min on the public leaderboard after a delete or merge (G8) |

### 2b. Repository files

| File | Player-linked data | Effect |
|---|---|---|
| `curation.json` `seen` | `rep:<report id>` = 1 when the admin marks a report Done (ids only, no name) | Public, harmless alone. With #581 it **acts**: any record holding that id in `_rep` is thanked (G2) |
| `points.json` | none (trainer and content questions) | none |
| Analyses report | not in the repo (the sheet only, by design) | see Analyses above |
| Docs (STATUS, ROADMAP, reviews) | reports summarised without names (rule 20f) | none |

### 2c. The player's device (localStorage)

| Key | Holds | On sign-out | While 'gone' (deleted) | After a rename (old name) |
|---|---|---|---|---|
| `reefid-account` (SYNC) | name, code, queued answers (`log`), `err` | cleared | kept; `err: 'gone'`, nothing saved; queued answers are lost at sign-out | **device re-creates an account under the old name** with its local copy (G4) |
| progress, quiz, reset, intro, start, hold, comeback (per subject) | the player's progress and settings | cleared | kept and playable locally | uploaded into the re-created account |
| `reefid-sync-ach` (ACHK): achievements, `_fb` (#579), `_rep` / `_thx` (#581) | achievements, counted reports, report ids, thanked ids | cleared | kept; `achHelped` waits for a sheet load that never comes (`repsPulled`), so **no thanks** | uploaded: the new account carries the archive's `_rep` and can be thanked for the archive's reports |
| **`reefid-reports`** (unsent reports, each with its sender's `rn` / `rp`) | queued reports | **not cleared** | still sent: the sheet finds no account, so it logs them **unverified under the deleted name** (G7) | sent unverified under the old name, or verified once the account is re-created |
| `reefid-report-name` | name typed for a report while signed out | not cleared | n/a | n/a |
| EVQ (events queue) | events; `pages` summaries are the account's | `pages` dropped, the rest kept (anonymous) | `pages` sent with name and code: `evWho_` finds no account, so it stores them with no id | stored under the re-created account |
| ANONID, ANONQ, LOG0 | the device's anonymous id and queue | cleared | n/a | n/a |
| `reefid-board-cache`, `reefid-achs-cache` | last leaderboard, achievement shares | kept (public data) | shows the deleted name until the next refresh | same |

### 2d. Admin views

| View | Source | Deleted / archived data today |
|---|---|---|
| Inbox › To do › Reports | `readReports` minus `curation.json` seen | **A deleted account's reports are listed as live, verified reports under its name** (G1). Merged ones show under into (correct) |
| Players (table, KPIs) | `users_` | Deleted: gone. **Renamed archive: a normal row** (counted in Players, Active 7 d, "Add all" to beta). Removed list in a fold (fine) |
| Players › Not signed in | answers whose id is not a live player's | **`~deleted` ids listed as devices that never signed in**, with Elo, replayed progress and a Journey (G3) |
| Activity › Recent sessions, Journey | `readAnswers` | `~deleted` sessions shown as anonymous players; archive by name |
| Health ("every account counts") | `readAnswers` | `~deleted` and archives counted as players |
| Analyses | stored report, or "Recompute here" | per-player results of deleted / archived ids (labelled P1, P2… when Players has no name for them) (G5) |
| Coverage, photo stats | `?stats=1` (pooled) | `~deleted` answers move photo difficulty, genus offsets, confusions and memory offsets: the stated reason for keeping them |
| Public leaderboard (app) | `board_` (live RAs rows only) | deleted: gone once the 5-minute cache expires; archive: hidden (Board −1) |
| Achievements "% of players" (app) | `achs_` over every RAs row | **renamed archives counted as players** (G6) |

---

## 3. Gaps (what breaks the principle today)

- **G1. Reports outlive a delete.** `userDelete` never touches the Reports tab (Code.gs comment: "Reports keep their text;
  nothing else changes"). They stay under the deleted name, Verified 1. The Inbox shows them as live, and the
  integrator's morning summary reads them as a live player's. 1 such report on the sheet today.
- **G2. "Your feedback helped" (#581) can act on a deleted account's reports.** Paths: (a) the name is taken again with
  another code: closed by #581's cut; (b) a renamed archive's reports are kept under the archive name while the
  device that holds their ids in `_rep` re-creates an account under the old name (G4), so that new account is thanked
  for the archive's reports; (c) any future "thank by name" use. Once reports are anonymised or deleted at delete
  time (PR 1), only (b) remains, and PR 2 closes it.
- **G3. `~deleted` answers do more than rate photos.** They are kept "for photo difficulty" (Pierre, v11/v17), but they
  also appear as a player in Players › Not signed in (mislabelled "never signed in"), Recent sessions, Journey, Health
  counts, the per-player ability list (`stats_` `ras`), the admin's per-player replay, and the Analyses per-player
  results. `answers_` flags only `~anon ` rows as anonymous, so `~deleted` rows reach the analyses as a signed-in
  player. Their Pages rows are kept too, with no stated use.
- **G4. A rename silently brings the archive back to life.** The old name is free on purpose ("start over"). But the
  device still signed in with it gets `found: false`, and `syncOnce` pushes its local copy, re-creating an account under
  the old name with the archive's progress, achievements, `_fb` / `_rep` / `_thx`, and Board 1 (back on the
  leaderboard).
- **G5. Analyses keep per-player results of removed ids.** The stored report is replaced only after 1,000 new answers or
  an engine change. With Delete−A, the `~deleted` id goes into every later report as a player.
- **G6. A renamed archive is a full player everywhere except the leaderboard**: Players table and KPIs, Activity,
  Health, Analyses, achievement shares (`achs_`), beta "Add all", `readAnswers` players.
- **G7. A deleted account's device still sends reports under its name.** The `reefid-reports` queue survives sign-out
  and keeps each report's sender, so they arrive unverified under the deleted name. The same happens to a merged
  name's queued reports: they arrive under the old name, not under the name it joined.
- **G8. Caches not cleared on delete and merge** (`board14` 5 min, `achs15` 10 min, `stats15` 10 min). Rename clears
  two of the three.
- **G9. Name mentions in log tabs**: Events `old` rows and Alerts `n:<name>` keep the name after a delete or merge (none
  today).
- **G10. Replayed orphans** for `~anon` ids claimed at sign-in or removed by `anonDelete` (1 today).
- **G11. The privacy page promises more than the default does.** `privacy.html` says: ask Pierre to have "your saved
  name, progress and answers deleted". The admin dialog's default keeps the answers, and every delete keeps the
  reports with the name.

---

## 4. Proposed policy

Three states for a player's data: **live**, **archived** (kept, never used in normal operation) and **deleted**. Plus
one narrow exception: **anonymised answers for pooled photo statistics**.

**Normal operation** means: the app (leaderboard, achievement shares, "Your feedback helped", beta groups), the admin's
working views (Inbox open items, Players, Activity, Journey, Health, Analyses per-player results), and the
integrator's morning summary.

1. **Delete everything** (a test account, or a player who asks: what the privacy page promises).
   - Deleted: RAs, Progress data, By genus, Replayed, Groups, **Answers**, **Pages**, **Reports** (the rows), Hold.
   - Redacted: name mentions in Events and Alerts (replaced by `~deleted <aid>`).
   - Kept: the Removed tombstone only (name, code hash, time), needed so that a device still signed in gets 'gone'.
     `curation.json` `rep:` ids stay (public, ids only, they point to nothing).
2. **Delete, keep anonymised answers** (a player leaves; their answers keep rating the photos).
   - Deleted: as in 1, except Answers and Reports.
   - Answers: become `~deleted <aid>` (as today) and are used **only** in pooled photo statistics: photo Elo, genus
     offsets, confusions, photo memory offsets, plain answer counts. They are never listed or counted as a player
     anywhere: Players › Not signed in, Journey, Recent sessions, Health counts, `stats_` `ras`, replay, Analyses
     per-player outputs.
   - Reports: anonymised (Reporter `~deleted <aid>`, Verified 0). Their content stays (a bad photo stays a bad photo):
     open ones stay in the Inbox as "from a removed account", and no one is ever thanked for them.
   - Pages: deleted (behaviour per player, not photo difficulty). See choice C4.
3. **Archive** (today's Rename, e.g. a record played under old rules).
   - The record leaves normal operation: no Players row (a read-only "Archived" fold next to "Removed" instead), no
     leaderboard, no achievement share, no beta group, no thanks.
   - Its answers count only where `~deleted` ones do (pooled photo statistics).
   - Its reports stay readable in the archive fold; their open items stay in the Inbox as "from an archived record".
4. **Merge**: unchanged (everything follows the person), plus the fixes below for queued reports, caches and the
   Analyses refresh.
5. **Devices holding a removed account.**
   - Deleted: 'gone' as today. Nothing more leaves the device under that name: queued reports of that sender and the
     `pages` summaries are dropped at sign-out, and the sheet logs a report whose name and code match a Removed row
     (no into) with no reporter. The thanks never run (already true: `repsPulled`).
   - Merged: 'gone' with into as today, and queued reports are credited to into.
   - Archived: the device sees `found: false` while it holds a saved revision (it had an account). It no longer
     re-creates the account: it says the record was archived, signs out (clearing the device as Sign out does) and
     offers to sign in fresh.
6. **Analyses**: a stored report made before the last delete, merge or archive is stale. The next Action run refits it
   at once (not 1,000 answers later), and the admin hides per-player results of ids that are no longer live.
7. **Caches**: every delete, merge and archive clears `board14`, `achs15` and `stats15`.

---

## 5. Concrete changes, grouped into PRs

Sheet script numbering: #579 takes v52, #581 v53. The first PR here takes **v54** (rebase if those land later or not
at all).

**PR 1: "Deleted accounts: nothing left in normal operation" (sheet v54, admin).**
- `Code.gs` `users_` `userDelete`:
  - Reports: with `answers: true`, delete the account's rows (`dropRows_('Reports', name, 2)`); else relabel them to
    `~deleted <aid>` and set Verified to 0.
  - Pages: always dropped (or as today, per choice C4).
  - Events / Alerts: redact name mentions (Message containing `(<name>)`, `n:<name>`).
  - Caches: clear `board14`, `achs15`, `stats15`.
- `userMerge`: clear the three caches.
- `logReports_`: a name+code matching a Removed row is logged with into as reporter (merged) or with no reporter
  (deleted, Verified 0).
- `answers_`: anonymous flag 1 for `~anon`, **2 for `~deleted`** (a new value at the same index, 11; readers that test
  for "truthy" stay correct).
- `stats_`: omit `~deleted` ids from `ras`. Photos, genus offsets, conf and mem keep using them.
- Replayed orphans: drop the `~anon` row at claim (`doPost_` relabel) and in `anonDelete`. Optional `ONCE_` one-shot to
  drop the 1 orphan, logged in the Deploy log; ask before, as for any sheet write.
- `analyses_` head: `stale: true` when Removed has a row newer than the stored report.
- `tools/analyses.js`: run when stale (as if `--force`).
- `analysis.js`: per-player lists skip flag-2 ids. Pooled fits keep them, per choice C3.
- Admin `admin.js`:
  - Players › Not signed in lists only `~anon` ids.
  - Journey, Recent sessions and Health skip flag-2 ids.
  - Inbox: a report whose reporter starts with `~deleted` reads "from a removed account" (no name, no "verified").
  - The delete dialog becomes one clear choice: "Delete everything (test account, or the player asked)" / "Delete,
    keep their answers anonymously for photo difficulty".
- `admin-analyses.js`: per-player results of ids not in Players read "removed", or are hidden.
- Docs:
  - ARCHITECTURE "Progress sync" (v54, the delete contract).
  - SECURITY.
  - `privacy.html` "Deleting your data": what is deleted, what may stay anonymous for photo difficulty, and that
    reports go with the account.
  - The admin help text for Players.
- Tests (`tests/sync.test.js` on the in-memory sheet only, never the real sheet): delete in both modes leaves no name
  in Reports, Pages, Events or Alerts; `answers_` flag 2; `stats_` has no `~deleted` in `ras`; a removed sender's
  report is logged anonymously; a merged sender's report goes to into; caches cleared.

**PR 2: "Archive instead of rename" (sheet v55, admin, app).**
- `Code.gs`:
  - `userRename` becomes `userArchive`: Board **−2** = archived (no new column; see choice C1). The record and its
    answers keep its name.
  - One helper `liveRows_()` used by every RAs reader: `board_`, `achs_`, `users_` list (archives sent apart as
    `archived: [...]`), `groupSet_`, `answers_` players, `replayedAll_`, `repsOf_`.
  - The archive's answers get flag 2 in `answers_`. `stats_` keeps them for photos, but not in `ras`.
  - A load from a device holding the archived name: today `found: false`. The app handles it (below); no extra server
    state needed.
- App `sync.js`: in `syncOnce` / `syncPull`, `found: false` while `SYNC.rev > 0` means "this account no longer exists
  here". Set `err: 'archived'`, push nothing, and show a card: "This record was archived by your trainer. Sign out to
  start fresh." Sign out clears the device as today.
- App sign-out (`signOff`): also drop queued `reefid-reports` entries whose sender is the signed-out account (they were
  sent under it, or will be refused). Today they survive and are sent under the deleted name.
- Admin: Players › "Archived" fold (read-only: name, date, answers, reports; Journey reachable from it, marked
  archived). No Merge / Rename / beta for archives; Delete stays (archive → delete in either mode).
- Docs: ARCHITECTURE, admin help, AGENTS "Repository map" if the action name changes.
- Tests: the archive left out of the board, achievement shares, groups and `readAnswers` players; the app's archived
  path pushes nothing (`tests/pages.smoke.js` with `SHEET_STUB`, never the real sheet).

**PR 3 (docs only, can ride with PR 1): the rule line** (below) in AGENTS.md "Standing rules › Working with Pierre",
next to 20f, or in `docs/rules/sheet.md` as **D7** if #572 merges first.

#579 and #581 need no change for this: #581's `repsOf_` cut stays as defence in depth. PR 1 makes the trigger case
impossible at the source: a deleted account's reports are deleted, or anonymised and never verified.

---

## 6. The rule line

AGENTS.md (#572 not merged; `docs/rules/sheet.md` D7 once it is):

> **20g. A deleted account leaves nothing in normal operation** (Pierre, 2026-11-05): deleting, merging or archiving
> an account cleans up every trace tied to it (sheet tabs, reports, page summaries, log mentions, caches, analyses,
> the device's queues); what is kept is either the Removed tombstone (so its devices get 'gone') or an archive that no
> normal feature, view or count reads, except anonymised answers in the pooled photo statistics. A new store of
> player data names its delete, merge and archive behaviour in the same PR.

---

## 7. Choices for Pierre (each with a recommendation)

- **C1. How to mark an archive.**
  - (a) Board −2 in the existing column (no layout change).
  - (b) A new RAs column "Archived" (a column layout change: always asked).
  - (c) Move the record to a separate "Archive" tab.
  - *Recommendation: (a)*. No layout change, one `liveRows_()` helper, reversible. (c) is cleaner to read in the sheet
    but touches every reader of the progress JSON.
- **C2. A deleted account's reports.**
  - Delete everything: delete them.
  - Delete keeping answers: anonymise them and keep the open ones in the Inbox as "from a removed account".
  - *Recommendation: yes to both.* The content of a report on a photo stays useful after the player leaves; the link to
    the person goes.
- **C3. Anonymised (`~deleted` / archived) answers in the Analyses' pooled models** (photo, genus, time effects), not
  as a player in any list.
  - *Recommendation: keep them in pooled fits.* They are the same kind of evidence as photo difficulty. Exclude them
    from every per-player result.
- **C4. Page summaries of a deleted account (Delete keeping answers).**
  - *Recommendation: delete them* (per-player behaviour, no photo use). The alternative is keeping them anonymised for
    the "do sheet readers progress faster" question, but they would then be a player in that analysis.
- **C5. Devices of an archived record.**
  - *Recommendation: "This record was archived: sign out to start fresh"*, instead of silently re-creating the account
    with the old local copy (G4). The person then signs in again with the same name (and any code) and starts empty.
- **C6. The admin delete dialog's default.**
  - *Recommendation: no default.* Two named buttons ("Delete everything" / "Keep answers anonymously"); today Cancel on
    the second prompt silently keeps the answers.
- **C7. The privacy page wording** ("Deleting your data"): say that answers may stay without the name to rate photos
  unless the player asks for everything to go, and that reports go with the account. This is wording players read.
  - *Recommendation: yes*, in PR 1.
- **C8. The orphan Replayed row and the one test-account report on the real sheet.** Fixing them is a one-off sheet
  write, which needs Pierre's explicit permission, by the integrator only.
  - *Recommendation:* let PR 1's code handle new cases. Remove the 1 orphan Replayed row and the deleted account's 1
    report by a logged one-shot (`ONCE_`) in PR 1, with his OK. The report is already marked Done.

---

## 8. Limits of this audit

- Pages rows cannot be matched to the deleted account without the secret salt (the admin can). A delete with answers
  drops them, so none should remain.
- The admin's in-memory caches and other admins' browsers were not checked: they refresh on reload.
- Older app versions (before 'gone', v11) are out of scope (alpha rule 24b: no backward compatibility).
- Nothing was written anywhere except this file.
