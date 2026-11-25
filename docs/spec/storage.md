<!-- rename-app: keep-begin -->
# Names, storage keys and caches

The app's name and where it is written, the names of everything the app stores on a device (localStorage,
sessionStorage, the caches), and how data written under older names moves to the current ones. This is the
specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and
the PRs. This file names the old keys on purpose: it sits between `rename-app: keep-begin` and `keep-end` markers, so
`tools/rename_app.py` leaves it as it is.

## The app's name

**IMR Reef ID** (it was IMR Coral ID; the address and the repository `coral-id-imr` change later, with the domain move
in [ROADMAP.md](../ROADMAP.md)). The organisation and app names are in one place, `core.js` `ORG` (`short` IMR, `name`
Institute for Marine Research, `app` IMR Reef ID, `appShort` Reef ID, the home-screen label): pages built by JS read it
(`SHEET_NAME`, the progress file message, the sign-in button's tooltip); the static files that carry the name
(`index.html`'s title, social tags and header; `admin.html` "IMR Reef ID Admin"; `privacy.html`;
`manifest.webmanifest` `name` / `short_name`; `tools/og/og.html`, then `node tools/og/make_og.js` for `og.jpg`;
`README.md` and the docs) are written from it by **`tools/rename_app.py`**. The same tool writes the **bare
organisation words** of `index.html`, `privacy.html`, `admin.html` and `tools/og/og.html` (`ORG_FILES`) from `ORG`: the
whole word "IMR" becomes `ORG.short` and "Institute for Marine Research" becomes `ORG.name` (HTML-escaped), so the
survey lists line of `index.html`'s description, the "Non-IMR genera" labels and `privacy.html`'s prose follow a fork's
`ORG` and read as before in the IMR edition; CI's `--check` covers them. Not covered: the organisation's words in pages
built by JS, which read `ORG` themselves. **The course's words** are `ORG` fields too, each a whole name without its
article, at today's values: `course` (IMR course), `lecture` (IMR lecture: its notes, groups and photos), `lectureRef`
(IMR Lecture 6, as a reference names it), `fishPres` (IMR fish presentation), `list`, `slate` and `benthic` (the
survey's coral list, slate and benthic slate), `trainer` (IMR trainer); a phrase not listed builds on `ORG.short`
("At IMR or elsewhere"). The core (`core/subjects.js`, `core/achievements.js`, `core/tree.js`) writes its texts from
them, and so do the players' pages (`app.js`, `learn.js`, `quiz.js`, `progress.js`, `home.js`, `sync.js` and the rest),
which also derive the prefixes of the data's source lines from `ORG` (`model.js` `isClassic`, `learn.js` `srcTag`); the
admin's pages still write theirs (REE-34). The Lab (`proto/*.js`) writes the course's words from `ORG` too, but keeps the
lecture sentences with their citation ("(IMR Lecture 6)") as literals, listed in `tests/orgwords.test.js` `KEEP` (they
credit that lecture's words, rule C2); the four it repeats from the glossary it reads from `data.json` `terms`. The data's own values (the source lines "IMR Lecture 6, slide …"
and "IMR fish presentation, …" in `data.json` and `fish.json`) and the identifiers (`imr` fields, `cqByIMR`) keep their words: code derives what it matches from `ORG`.
`tests/orgwords.test.js` counts the word "IMR" still written in the code outside comments, per file, against the lines
left to move and the few that stay (the sheet backups' pCloud folder, the rules versions' records)
([decision](../decisions/2026-11-25-org-course-words.md)). Things outside the repository kept their
old name: the Google Sheet "IMR Coral ID – RA progress" and the Cloud project "IMR Coral ID sync".

**`tools/rename_app.py`** applies every mechanical part of the rename (the visible name, the storage keys, the shell
cache's name, the CSP hashes of the inline scripts, Prettier on what it changed), idempotently: after a rebase on a
branch that still uses the old names, run `python3 tools/rename_app.py` and commit its result on its own (`--check`
changes nothing and fails when something is left; CI runs it). Lines marked `rename-app: keep` (or blocks between
`rename-app: keep-begin` / `keep-end`) are left alone: the code that names the old keys on purpose. A fork for another
organisation edits `ORG` and runs it with `--from "IMR Reef ID" --from-short IMR --from-name "Institute for Marine Research"`
(the earlier app name, short form and full name).

## Storage keys

One app-wide prefix, `reefid-`, names the app without the organisation (a fork keeps the players' keys; `reef-` alone
could clash with another app on the shared origin `ppericard.github.io`). `core.js` `KEYS`:

- `reefid-sync-<name>` (`KEYS.SYNC`) **travels with the player**: `progress.js` `progData()` sends every such key to the
  sheet (the Data column) and to progress files, and `loadData()` takes them back. What belongs to one group of
  organisms carries the group: `reefid-sync-coral-progress`, `reefid-sync-fish-progress`.
- `reefid-<name>` (`KEYS.APP`) **stays on the device**: the default, so nothing is sent by mistake.
- Per subject ([subjects.md](subjects.md)): `core.js` `subjKey` (`reefid-sync-coral-progress`,
  `reefid-sync-fish-progress`, `-quiz`, `-intro`, `-intro-offer`, `-reset`, `reefid-sync-fish-wink`) and `subjDev`
  (`reefid-hold` and `reefid-comeback` for the corals, `reefid-fish-hold`, `reefid-fish-comeback`); the choice of
  subject `reefid-sync-subject`.

| Old name | Name now | Holds |
|---|---|---|
| `imr-coral-progress` | `reefid-sync-coral-progress` | Per-genus progress `P` ([model.md](model.md)). |
| `imr-coral-quiz` | `reefid-sync-coral-quiz` | Quiz settings `Q` (bonus genera `bon`, ...). |
| `imr-coral-intro`, `imr-coral-intro-offer` | `reefid-sync-coral-intro`, `reefid-sync-coral-intro-offer` | First-meeting cards seen, Open all and the back card's choice (`model.js` `INTRO`). |
| `imr-coral-reset` | `reefid-sync-coral-reset` | Time of the last progress reset (the sheet's opening hold counts from it). |
| `imr-coral-custom` | `reefid-sync-coral-custom` | The genera picked for the custom quiz (`quiz.js` `quizCustom`). |
| (none) | `reefid-sync-fish-custom`, `reefid-sync-seaslug-custom` | The same for the fish's families and the sea slugs' genera: one key per subject (`subjKey(id, 'custom')`), merged and cleared per subject (`sync.js`). |
| `imr-coral-rv` | `reefid-sync-coral-rv` | The progress rules version this device applied (`sync.js` `RVK`, full replay); the sheet drops it under both names from a merged account. |
| `imr-coral-ach`, `imr-coral-board` | `reefid-sync-ach`, `reefid-sync-board` | Achievements, leaderboard choice. |
| (none) | `reefid-sync-told` | The one-time notices told on any device of the account (`core.js` `TOLD`, tokens; [sync.md](sync.md#one-time-notices-after-the-first-sync)). |
| `imr-coral-theme`, `-palette`, `-cvd`, `-size` | `reefid-sync-theme`, `-palette`, `-cvd`, `-size` | ⚙ Theme, Colours, Colour-blind, photo size per page (`index.html`'s inline script reads the first three before paint). |
| `imr-coral-order`, `-gview`, `-cmpview`, `-lkswiped`, `-pview` | `reefid-sync-order`, `-gview`, `-cmpview`, `-lkswiped`, `-pview` | Genera order and view, Compare view, look-alike swipe hint seen, My progress view. |
| `imr-coral-sync` | `reefid-account` | The sign-in record (`SYNC`: name, code, base, log); it never travels. |
| `imr-coral-loaded` (session) | `reefid-loaded` (session) | "Progress loaded from ..." after a reload. |
| every other `imr-<name>` | `reefid-<name>` | The device-only keys, below. |

The device-only keys: `reefid-tour`, `-nudge`, `-log0`, `-recalc`, `-prompt-at`, `-pulse`, `-again-told`, `-hold`,
`-comeback`, `-pending` (the question left unanswered, per subject: `reefid-pending`, `reefid-fish-pending`; [quiz.md](quiz.md#the-pending-question)), `-link`, `-photo-q`, `-photo-stats`, `-idkey-x`, `-idkey-lay`, `-idkey-pv`, `-idkey-start2`, `-lab-votes`,
`-curation-last`, `-curation-draft`, `-curation-base` (the admin's old draft, moved once into its IndexedDB store:
`admin.js` `draftMove`), `-ach-new`, `-achs-cache`, `-board-cache`, `-board-told`, `-board-sent14`, `-anon-base`,
`-anon-id`, `-anon-resent`, `-anonq`, `-dev-id`, `-evq`, `-reports`, `-report-name`, `-photo-flags`, and the admin's
`reefid-admin-` keys (`-vault` the encrypted token; `-view`, the ⚙ View that hides the admin's tools in the app;
`-session`, `-session-gen` and `-undo` in sessionStorage; the views, filters and sorts each page keeps, such as `-gview`,
`-qfilter`, `-ffilter`, `-origins`, `-cands`, `-cseed`, `-csrc2`, `-diff`, `-kcov`, `-started`, `-stats`, and the last
subject, group and tab, `-nav-subj`, `-nav-group`, `-nav-tab`). The admin demo prefixes its keys with `demo:`.

The service worker's messages to the pages follow the same names (`reefid-ver?`).

**Keys read many times an answer** (REE-263): `sync.js` `keptGet`, `keptBy` and `keptPush` keep a key's parsed value,
and what is read from it, while its stored text stays the same: `reefid-sheet-v` (`sheetV`), the subject's
`-start` record (`model.js` `startV`, `imrSaid`), and the answer queues `reefid-log0` and `reefid-anonq` (`quiz.js`
`logAnswer` and the readers of LOG0 in `quiz.js` and `model.js`, `sync.js` `sendAnon`). The first read of a key in a
task asks the storage for the text (`keyGet`) and compares it; the task's later reads trust that comparison (`app.js`
`freshSeen`, `freshNow`: the mark ends with the task's microtasks), unless this tab wrote the key since. Every write of
the app page calls `app.js` `storeWrote`: `store.set`, `store.drop` (a removal), `store.raw` (a text written as it is:
`progress.js` `loadData`, the settings kept as plain text) and `sync.js` `keptPush`; `tests/kept.test.js` fails on a
`localStorage` write in the page's scripts that goes round them. The key moves of `core.js` (`migrateStorage`,
`migrateRoutes`) run first, before any read. Another tab's write is seen by the next task's first read: within a task
the page's storage changes only by its own writes (Chromium applies another tab's change from a message, a task of its
own; Firefox reads through a snapshot kept until the task's end; Safari is not checked). Were another tab's write ever
readable mid-task, a kept read would see it one task late, as if it had landed after the task. No `storage` event is
listened to. The values are
those of `store.get`. A kept value is shared: only readers that never change it read through `keptGet`. In the smokes,
`KEPT_CHECK` (`tests/facheck.js`) checks every kept value against a fresh `store.get`, the reads that trust their
task's comparison included.

## Moving data written under older names

**On a device** (`core.js` `LEGACY_KEYS`, one table read by both `tools/rename_app.py` and the devices):
`migrateStorage()` is the first line of `app.js` and `admin.js` (after `core.js`, before anything reads a key): each
old key is copied to its new name if the new one is absent (a new one already there is kept), then removed; a key that
cannot be written (storage full) keeps its old name until the next start, and is read under it meanwhile (`keyGet`). The
inline theme scripts of `index.html` and `admin.html` run before it and read both names. A progress file says
`app: 'reefid'` (`'imr-coral-id'` is still read).

**The Coral ID Key's old names**: the tool's device keys (`-idkey-x`, `-idkey-lay`, `-idkey-pv`, `-idkey-start2`, the
admin's `reefid-admin-kcov`) and the page or tool names stored inside `reefid-sync-size`, `reefid-lab-votes` and the
admin's view keys were moved once from the tool's earlier name; that one-shot is gone. A device that never ran it keeps
those settings under the old names, read by nothing. Nothing reads an old name: an old `#finder` link lands on the
default page (no redirect); `tests/idkey.test.js` checks that no code names the old tool.

**The addresses' data move** (rule W3): `core.js` `migrateRoutes`, run by the app and the admin at start-up after
`migrateStorage`, moves this device's data once from the old page names and addresses: the photo size per page
(`reefid-sync-size`, keyed by page name: `genera`, `genus`, `pair`, `idkey`, `lab-gallery`, `lab-elim` become
`learn.genera`, `learn.genus`, `learn.compare`, `identify.key`, `tools.gallery`, `tools.elim`; `tips` dropped), the
events still queued (`reefid-evq`: each one's address, a visit summary's page names) and the photos flagged
(`reefid-photo-flags`: where they were seen); idempotent. The translations (`routeRename`: an old address to its new one;
`pageRename`: an old page name to its new one) sit between `routes-migration: begin` / `end` markers, for the sheet's
own one-shot over the Pages, Events and Reports tabs. Delete them with their callers once every device and the sheet
have moved.

**In the sheet**: a player's Data JSON is keyed by these names. Until every device runs the renamed app, an app from
before the rename still saves (and reads) the old names. So the app reads either (`core.js` `keysIn` on every reply that
carries a player's data: `syncGet`, the admin's `userPost`; the new name wins) and sends the new names
**plus a copy under the old ones** (`withLegacy`, while `LEGACY_SEND` is true: an old app reading a record without its names would
merge its progress with an empty one and drop the saved record). `Code.gs` reads either through `dataKey_` (the progress
for the leaderboard % and the abilities, the reset for the opening hold, the achievements). `LEGACY_SEND` goes off with
the domain move ([ROADMAP.md](../ROADMAP.md)). The salt of the code hashes and anonymous ids (`Code.gs` `SALT`,
`admin.js`) stays `'imr-coral-id'`: changing it would lock every player out.

## Caches

`sw.js` ([service-worker.md › Caches](service-worker.md#caches)): the shell cache `reefid-shell-vN` (`imr-coral-id-vN`
before the rename; on activation every other cache with either prefix goes, `REPLACES`); the admin's files
`reefid-admin-files` (`ADM`, `ADM_FILE`); the photo cache `imr-photos-v1`, not renamed: a new name would throw away (or
copy while the app waits) up to 2,500 offline photos per phone; it gets one with the domain move, whose new origin
starts with empty caches anyway. The admin page itself keeps one more, `reefid-admin-blobs` (`admin.js` `blobText`: the
text of `curation.json` under its blob's sha, the latest only; public data, never the worker's). The worker asks the open pages their version under both message names (`VER_ASK`), so
a page from before the rename is not reloaded in the middle of a question.
<!-- rename-app: keep-end -->
