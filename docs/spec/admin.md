# The admin back-office: navigation, subjects, the draft and Publish

`admin.html` is Pierre's back-office: it curates the photos and the content every subject's game uses, reads the
players' answers, reports and events from the sync sheet, and publishes his choices as `curation.json`. This file
describes its shell: the header and the addresses, the subject switch, the pooled model every subject's pages share, the
draft and Publish, and the conventions every page follows. The photo pages are in [admin-photos.md](admin-photos.md), the
Tree tab and its node pages in [admin-tree.md](admin-tree.md), the To do, Players and live answer-log pages in
[admin-players.md](admin-players.md); the stored analyses are ARCHITECTURE "Analyses". This is the specification of what
the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and the PRs. The rules that
govern it are A1-A5 ([rules/admin.md](../rules/admin.md)).

## Who opens it

For Pierre and the other token holders only: it is not linked from the app except from ⚙ for a token holder. A
fine-grained GitHub token (this repository only, Contents read/write) unlocks it and lets it publish ("Publish", below);
`admin.html?readonly` works without one, `admin.html?demo` opens every page on made-up data ("Read-only, demo and
preview", below).

## The header: groups, tabs and views

Four header groups (modes), each with its tabs: **Inbox**, **Photos**, **Players** and **Analyses**, the header list
`#modes` in `admin.html`, built from `GROUPS` (and its flat list `TABS`) by `navs()` in `admin.js`. Inbox carries the To
do count and the over-the-cap ⚠ ([admin-photos.md › The cap](admin-photos.md#the-cap-per-genus--view)). The row under the
header (`#subnav`) shows the tabs of the current group on the left and, for a tab with several views, one segmented
switch of its views on the right (links with `aria-pressed`; the views carry their counts: reports, hidden, excluded, ⚠
over the cap).

| Group | Tab | Views (the address of each; the fish side's under `#fish/`) |
|---|---|---|
| Inbox | To do | All `#inbox/todo/all` · Reports `#inbox/todo/reports` · Errors `#inbox/todo/errors` · Alerts `#inbox/todo/alerts` · Health `#inbox/todo/health` · Points `#inbox/todo/points` |
| Inbox | Coverage | Games `#inbox/coverage/games` · Sheets & ID Key `#inbox/coverage/sheets-id-key` · Rights `#inbox/coverage/rights` |
| Photos | Tree | Key `#photos/tree/key/<node id>` · WoRMS `#photos/tree/worms/<node id>` |
| Photos | Candidates | `#photos/candidates` |
| Photos | Photo review | Quality `#photos/review/quality` · Growth form `#photos/review/growth-form` · Ease `#fish/photos/review/ease` · Phase & framing `#fish/photos/review/phase-framing` · By difficulty `#photos/review/by-difficulty` · Light proposals `#fish/photos/review/light-proposals` · Cover proposals `#fish/photos/review/cover-proposals` |
| Photos | Look-alikes | `#photos/look-alikes` |
| Photos | Photo stats | Overview `#photos/stats/overview` · Difficulty `#photos/stats/difficulty` · Taxa `#photos/stats/taxa` |
| Players | Activity | Recent sessions `#players/activity` |
| Players | Visits | `#players/visits` |
| Players | List | `#players/list`, a player's Journey `#players/list/journey/<name>`, a device's `#players/list/anon/<id>` |
| Players | Groups | `#players/groups` |
| Analyses | Overview | `#analyses/overview` |
| Analyses | Speed | Answer time `#analyses/speed/answer-time` · Enlarging `#analyses/speed/enlarging` |
| Analyses | Difficulty | Photos `#analyses/difficulty/photos` · Formats `#analyses/difficulty/formats` · Mix-ups `#analyses/difficulty/mix-ups` · Time `#analyses/difficulty/time` · Pairs `#analyses/difficulty/pairs` · Heatmap `#analyses/difficulty/heatmap` |
| Analyses | Learning | Practice `#analyses/learning/practice` · After a break `#analyses/learning/after-a-break` · Sessions `#analyses/learning/sessions` · Profiles `#analyses/learning/profiles` · Answer log `#analyses/learning/answer-log` · Stops `#analyses/learning/stops` |

The Analyses tabs: **Overview** (what the data says clearly, every result in words, the milestones); Speed's Answer time
and Enlarging; Difficulty's Photos, Formats, Mix-ups, **Time** (what the time to answer and enlarging say about a
photo, from the report), **Pairs** (live from the answer log, `statsConf`) and **Heatmap** (live from the answer log,
`admin-heatmap.js` `statsHeat`; one map per rank asked); Learning's Practice, After a break, Sessions, **Profiles**
(player profiles, from the report), **Answer log** (live: learning curve, calibration, conditions, genera, mix-ups) and
**Stops** (live: where players stop, genus sheets opened).

What each page shows: Inbox and Players in [admin-players.md](admin-players.md); Photos in
[admin-photos.md](admin-photos.md) and [admin-tree.md](admin-tree.md); the Analyses views read from the stored report in
ARCHITECTURE "Analyses", the live ones (Pairs, Heatmap, Answer log, Stops) in
[admin-players.md › Live analyses](admin-players.md#live-analyses-from-the-answer-log).

**Names** (rule A3): no tab holds a view of its own name and no group a tab of its own name: the group **Inbox**, the
players' tab **List**, Activity's view **Recent sessions**.

**No page titles**: an admin page never repeats its place in the header (group, tab, view) as a heading; headings name
the sections of a page (with their counts), a genus or a player (Journey).

### Addresses

`#<group>/<tab>/<view>`, each segment the word on screen in lower case joined by `-` (a tab drops its group's word: Photo
review → `review`), computed from `GROUPS` (`TABS`, `ADM_PAGES`). A tab with one view has no view segment
(`#players/activity`), unless that view is named for the views to come (`#fish/photos/tree/key`). A thing a page is
about follows as a last segment (`#photos/tree/key/<Genus>`, `#players/list/journey/<name>`,
`#players/list/anon/<id>`, `#inbox/todo/points/<id>`; `ADM_PARAM`); a filter follows `?`
(`#inbox/coverage/games?look=all`: Where to look open in full; `hashQuery`, split off before decoding). A subject other
than the corals puts its prefix first (`#fish/inbox/todo/reports`: "One subject switch", below).

`admRoute()` decides what an address shows: a shorter one (a group, a tab) opens its first view, an old or unknown one
its group's first view, else the landing page, and the address is replaced in place (`readHash`). Old addresses (`#~…`,
`#<Genus>`, the former `#photos/genera/…`) are not translated (rule W3: there is no table of aliases). Links come from
`GROUPS` (`navs()`) and `genusHref()`. With no address the admin opens on its landing page, Players › Activity `#players/activity`
(`homeOf`; Players › List for a subject without Activity).

### What it remembers

A header group reopens the tab and view used last in it (`reefid-admin-nav-group`, group → address), a tab its view used
last (`reefid-admin-nav-tab`, tab → address), except the Players group, marked `fixed` in `GROUPS`: a click on it always
opens its first tab, Activity. The subject switch opens the same page on the other side (`admin.js` `sameOn`: the view
on screen when that side has it, else the view that side opens for the same tab or group). Each memory is checked
against today's addresses before use, all are kept in the admin store (`demo:`-prefixed in the demo), and each subject
keeps its own last tab, view and page (`subjK`: the corals keep the unprefixed keys). The app's ⚙ View keeps
`reefid-admin-view` to itself.

### Phones and narrow screens

Under 600 px the header's menu (`#modesel`) lists every tab, grouped, and the row under the header keeps only the view
switch, full width. Between 600 px and about 1280 px the header groups give way to the same menu whenever they do not fit
on one line (`fitModes()`, which sets `body.adm-narrow`), so they are never cut off.

## One subject switch

One switch for every page, To do included: a mini switch next to the logo, in the header line at every width (`#subj`,
`navs()`), as the app's header chip. Each side is a subject of `core.js` `SUBJECTS`: its icon (`SUBJECTS` `icon`, the
app's set), its name on screens 600 px and wider (on phones each side shows its icon over its count, and the logo steps
aside while the switch shows, so the page menu keeps its room) and its to-do count (`subjTodo`: the corals' To do items
(reports, flags, suggestions); for a subject with its own part of `curation.json`, its photos flagged on the site and its
open reports; the auto-sort's Checks are never to-dos). The tab's and the Inbox's count on a side is the same count
(`todoHere`).

### Each subject's admin part (`SUBJECTS` `admin`)

Each subject describes its admin in `core.js` `SUBJECTS` `admin`; the engine never names a subject:

- `hash`, the prefix of its addresses (`''` for the corals; `fish/` for the fish, so `#fish/inbox/todo/reports` is the
  fish side's Reports; on `SUBJECTS` itself);
- `cur`, its part of `curation.json` (`''` = the top level; `fish`, `seaslug`);
- `pages`, the admin pages it has (`null` = all, the corals'; a page covers the addresses under it). The fish and the
  sea slugs list To do (All, Reports, Errors, Health, Points), Players › List, Photos › Tree, Candidates, Photo stats ›
  Overview, Heatmap and their Analyses views; the fish add Coverage › Games, Photo review › Ease, Phase & framing and By
  difficulty, and Look-alikes;
- `todo`, the sections of its To do besides the reports, flags and errors every subject has (the corals' `rule`, `sa`,
  `poor`, `sug`: their photo sections, never shown on another side; the fish's `photos`: its photo work in All);
- `files`, for a subject with sheets at several ranks, the public files the admin reads its units and photos from (`f`
  its tree, `ph` its first photos when it has some, `gm` its game photos, `cand` its candidate photos; `reports.js`
  `repReg`). Each subject's go into its own registry once one of its reports or flags shows (`admin.js` `unitAdmin`,
  `UNITA`), so its reported photo shows on its Reports side from its game file's source, with its unit, the species it is
  identified as and its credits. The registry reads the tree with the content editor's structure and text in force
  (`core.js` `contentApply` under the published curation, `SAVED`: `admin.js` `unitBuild`), as the app does, so a
  look-alike pair or a circle edited there shows on Pairs, the Heatmap and the Journey (its photos and family pages stay
  those of the file as built, so a report on a photo of a family taken out of every circle still shows it); a Publish, a
  rebase or another tab's Publish builds it again (`unitRefresh`);
- `autosort`, true for a subject whose part the auto-sort writes at each load (the fish: `fishAutoRun`, `autoWhen`, its
  part's key `AK`; [fish-photos.md › The fish auto-sort](fish-photos.md#the-fish-auto-sort));
- `origins` and `csrc`, its photo origins (the filter bar's chips) and its candidate sources; `obs`, its word for
  observations; `target` and `tags` for the sea slugs ([admin-tree.md › The sea slugs](admin-tree.md#the-sea-slugs)).

A field of `admin` set for one subject only (`autosort`, `csrc`, `target`, `tags`) is listed in `tests/subject-neutral.test.js`
`FLAGS` with what it switches on, like the top-level ones. **The admin and the Learn pages still hold code of each
subject's own** (the fish and sea slugs' pages next to the corals', `ASUBJ.rank === 'family'`, `S.sheets ? FISHA : DATA`,
`FISHS`, `DATA.gen`...): `tests/subject-neutral-admin.test.js` counts every such test per file and lists every such
duplicate by name, each with its row of
[reviews/2026-11-19-admin-one-engine.md](../reviews/2026-11-19-admin-one-engine.md) §3. A new one fails the test, and a
number never goes up: the step of §5 that removes a duplicate lowers its numbers in the same PR.

### Which pages a subject has

`hasPage` decides: every Players page (`players/…`), the pages about no subject or read from what every subject holds (`EVERY`: Coverage › Rights, To do ›
Alerts, Photo stats › Taxa), a view with work of its own while it has some (`GROUPS` view options `live` and `draw`: Light proposals, Cover
proposals), a tab or view for one unit rank only shown to a subject of that rank (`GROUPS` option `rank`: Photo review's
Ease, Phase & framing and the proposals, `rank: 'family'`; `SUBJECTS` `rank`), and otherwise what `pages` lists. The
header shows only the groups, tabs and views of the pages the subject has; an address of a page it does not have says
"Not for fish yet" (in the subject's words).

The Players pages are every subject's: Activity and a Journey follow the switch, each under its subject's prefix; the
List, Groups and Visits are one page for every subject (`SHARED`: no prefix, the switch inert there, the side on screen
kept for the other pages; `#fish/players/list` lands on `#players/list`). A link without a prefix (a player's journey
from Activity) keeps the subject on screen when it has that page; the switch's own links say which subject, and so does
a link marked `data-own` (the list's journey links, a journey's own toggle); on a player's page the switch keeps the
player (`playerPage`).

### The tree subjects

Every subject with its own part of `curation.json` and sheets at several ranks (`TREES`: the fish, the sea slugs) has the
same Photos › Tree and photo tools, on the one **in force** (`FISHS`, `TK` its part's key): the subject on screen when it
is one, else the last one on screen (`treeIn`, from `readHash`, as the app's `treeAt`). Its family pages' data (`FISHC`:
`fishLoad(withGame, S)`, each subject's loads its own in `TLOAD`, so a load on its way when the switch moves lands in its
subject; its candidate lists are read through its tree's ids: a species' `inat`, a genus's name, an informal species'
key), its registry (`FISHA` = `UNITA[id]`) and every read and write of its part (`DRAFT[TK]`, `SAVED[TK]`, `SUG[TK]`) are
the one in force's, so `fishTile`, `bindFishTiles`, `fishRepTile` and the node pages act on its own part of
`curation.json`. Publish writes every tree subject's part (`output`, `fishOut`), its summary counts each in its words
(`treeSummary`, `SUBJECTS` `card`), and the change list names each (`fiChanged`). What the sea slugs add is in
[admin-tree.md › The sea slugs](admin-tree.md#the-sea-slugs).

## Admin for every subject: the pooled model

One admin for every subject. Its model: **subject → group → unit → (sub-unit) → section → observation → photo**, with
**facets** (tags) on each photo, **origins**, a **target** and **states** (candidate → in play → hidden / excluded /
rejected / not this). Each subject describes itself (an admin part of `core.js` `SUBJECTS`, above: its words, groups,
sections, facets, origins, target, data and curation keys); the engine never names a subject. Corals: units = genera,
sections = views (Colony / Close-up / Corallites). Fish: units = the book's families, each with its genera, sections =
**species** (curation at the species level), one whole-fish view, and what varies is a facet: phase, framing, quality,
colour loss, several species, licence. One `curation.json` and one Publish: fish choices under a `fish` key with the
coral key names inside, the coral keys where they always were (rule A1); one subject switch for everything, each side
with its own to-do count; coral addresses carry no prefix, fish pages are under `#fish/`. The plan's order and what is
still to build are in [ROADMAP.md](../ROADMAP.md) "Admin for every subject".

**One filter bar**: every photo page draws its filters with one component in `admin.js`, `FB` (`origins`: the origin
chips, with counts and short names on the genus bar or as a Show row; `views`: the view filter, a segmented control on
the genus bar or chips on Photo review; `unit`, `check`: Photo review's unit select and check boxes; `sources`: the
Candidates sources), filled from the subject on screen (`SUBJECTS` `views`, `one` / `many`, `admin` `origins` and
`csrc`), and wires them with `bindBar` (one state per filter, shared by every page: `SHOW` in `reefid-admin-origins`,
`GVIEW`, Photo review's `QF` / `FF`, `CSRC`). `tests/admin.smoke.js` checks the coral pages' DOM (genus page, view filter,
origin chips, Quality, Growth form, Candidates sources, Hidden, Excluded) at 390 and 1280 px.

## The draft

Every click is a local draft (Undo/Redo, Ctrl+Z), kept in one IndexedDB store, `reefid-admin-draft` (`admin-draft.js`;
the sign-out seal's [design note](../reviews/2026-11-09-admin-signout-seal.md)). Its records: `draft`
(its JSON, its revision, the revision its writer had last seen), `base` (the published curation it was made on), `state`
(the generation, one more at each sign-out, and the revision stored) and one `seal:<token mark>` per token.

- **One transaction per write.** Every read-modify-write is one readwrite transaction, which the browser runs one after
  another across tabs and applies all or nothing. A click's write reads the state, is refused in another generation,
  takes in the draft another tab stored since (`mergeTabs()` in `core.js`, a `merge3` against the exact draft the other
  tab started from, so clicks made in both tabs at once both survive) and a newly published base, then writes; a
  BroadcastChannel tells the other tabs at once (a hint: their next write takes it in anyway). Web Crypto runs outside
  the transactions: a seal is encrypted first, then written by a transaction that checks nothing moved (the generation,
  the draft's revision, the seal's id) and goes round again otherwise.
- **Sign out** seals the unpublished draft and its base with the token (AES-GCM, the key a SHA-256 of the token; the
  record names a SHA-256 mark of the token, never the token) and takes the plain draft and base off, in one transaction,
  so the next person on the browser, another token, a read-only visit and `?draft` see none of it; a draft with nothing
  unpublished is only taken off (rule A1). Every other admin tab of that token locks (its next write is refused; the
  channel tells it at once), sealing first what it held that never reached the store (onto the token's seal, or with
  none onto the published curation: only that tab's own changes, so a later merge never brings back a choice undone
  since). A tab of that token reloaded after the sign-out (a discarded tab, which missed it) opens no seal and locks: the
  session keeps the generation it was opened in (`sessionStorage` `reefid-admin-session-gen`), and `load` refuses a
  restored session whose token signed out after it, so only the password typed again opens the seal. A tab of another
  token carries on, its draft written back in the new generation (the signed-out admin's clicks it took in included:
  the seal protects against the next person who opens the admin, not an admin of another token already in).
- **Unlocking** with the same token opens the seal into the draft (a newer plain draft wins where both changed) in the
  transaction that writes the draft and its base. While it seals, the page is read-only ("Sealing…"); if it cannot seal,
  Sign out says so and a second click within 15 s leaves the draft in plain.
- **The old store**: a draft kept in `localStorage` (`reefid-curation-draft`, `-base`) moves into the store once
  (`draftMove`, due for removal from 2026-12-18).
- **Tests**: `tests/admindraft.test.js` runs the store over a stand-in IndexedDB (`tests/fakeidb.js`: transactions one at
  a time, ended by an await), one test per race found in review; the admin smoke's `seal` part signs out with two tabs in
  Chromium.
- **A click's cost**: a click's write stores the draft's text `snap` as it is and parses no draft when no other tab
  wrote, and `autoWhen` skips the fish part's keeps when the click left that part as it was (the same object: the admin
  never writes into it; `tests/adminclick.test.js`). The fish auto-sort at load (`fishAutoRun`, which reads
  `fish-cand.json`) runs once the first page is drawn and the page is idle (`requestIdleCallback`, 4 s at most).
- **Undo steps**: the last 60, as many as fit in `HIST_ROOM` (4.5 million characters: with a draft over a million
  characters, one or two), kept in `sessionStorage` `reefid-admin-undo` with the draft they lead to (`keepHist`, written
  once the clicks pause for `HIST_WAIT`, 1.5 s, and when the page is hidden or left), so they survive a reload of the tab
  (re-based like the draft) and are dropped if another tab changed the draft; Sign out removes them.

### The key-by-key merge

Publish first re-reads the published file; if it changed, `rebase()` applies `merge3(base, draft, published)`: a key
Pierre changed since the base keeps his value, every other key takes the published one; objects merge recursively, lists
and plain values are single choices (the same key changed on both sides: the draft wins). The draft is also merged onto
the published file on page load. Old drafts without a base go through `mergeOld()` (adds, never removes). Publishing a
whole copy is never done.

## Publish

**Publish** commits `curation.json` to `main` through the GitHub Contents API with the fine-grained token, stored
encrypted in the browser with the admin password (`reefid-admin-vault`). Once unlocked, the plain token is kept only in
`sessionStorage` (this tab, until the browser closes), never in `localStorage`; the token link asks for a 90-day expiry.
Collaborators who cannot scope a fine-grained token to this personal repository are pointed to a classic token (`repo`
scope).

Publish first shows a summary (`pubSummary()`: counts per kind of change, the genera touched, and every subject's counts:
`treeSummary`, `lightSummary`, `coverSummary`, `contentSummary`, the auto-sort decisions) and asks to confirm; a change of
structure confirms once more ([admin-tree.md › Structure](admin-tree.md#structure-circles-and-look-alike-pairs)).
"Validate N" (Growth form) asks too. Publish re-reads `curation.json` (never from the HTTP cache), merges with `merge3`,
retries once by itself on a 409, and names in its toast any published choice the draft replaced. Its commit messages end
with `(by <GitHub login>)`. The Candidate photos workflow that follows a push of `curation.json` downloads the photos in
play ([data.md](data.md#curationjson-pierres-choices), ARCHITECTURE "Photos").

The draft button carries the status: "● Publish" with a draft (its title lists the kinds of change, "Draft (saved …)"),
"Published" when clean, "Read-only" without a token.

## Read-only, demo and preview

- `admin.html?readonly` works without a token (download JSON instead of Publish); `?readonly` keeps no draft (clicks
  live in the tab only); the lock screen links to it.
- `admin.html?demo` opens every page without a token, so agents can see and test the admin: `admin-demo.js` (loaded
  before `admin.js`, inert without `?demo`) replaces `fetch` for the sync script and the GitHub API with in-memory
  replies shaped like `Code.gs`'s (`answers_`, `stats_` via `core.js` `eloOf` / `confusionOf`, `users_` with merge and
  delete, `reports_`) and GitHub's (`curation.json` from the site, Publish kept in memory), on 7 made-up players (~1150
  answers, seeded so every run is the same), a few anonymous answers and 5 reports; any other outside call is refused.
  `admin.js` `DEMO` prefixes its storage keys with `demo:` so a demo never touches a real draft, vault or Undo history,
  and hides Preview draft; a banner says it is a demo. What each page's demo data stages is said with the page.
- `index.html?draft` previews unpublished choices in the app: it loads `admin-draft.js` for that preview only and reads
  the store (`ddbPeek`), never creating it.

## Reading the sheet, and speed

- **Sheet reads**: every read of the sync script goes through `sheetRead(kind, go)`, so a page drawn again while a read
  is on its way, or another page, reuses it instead of asking again (kinds `ans`, `stats`, `users`, `pages`, `events`,
  `reports`); ↻ and the account actions call `sheetAgain(...kinds)` (forget, drop the read on its way, its late reply
  ignored), a forced reload `sheetDrop`. The landing page's reads leave as soon as the token is known (`sheetEarly`, by
  address: Players the player list and the answer log, a Journey also the pages opened, To do the log, events and
  reports, Visits all four…), in parallel with the GitHub token check and `start()`'s data files, which they do not
  need; a refused token drops them. Health and the Journey ask for the pages opened together with the answer log.
  Nothing read from the sheet is stored on the device. `tests/admin.smoke.js` checks the reads through the demo's call
  log (`admin-demo.js` `DEMO_CALLS`).
- **Memos**: `photos` / `own` / `cands` walk every genus and are memoized per draft state, kept from page to page:
  `render()` clears them only when the draft differs from the one they were computed for (`memoFresh`), and photos or
  candidates sent to another genus are indexed once per state (`sentTo`); code that changes `DRAFT` and then reads them
  without `saveDraft()` or `render()` must call `memoReset()`. Replays of the whole answer log (`playSplit`,
  `levelMargin`, `confusionOf`) run once per log loaded (`ofAns`). `status()` computes what it reads from the draft
  (changes, suggestions, cells over the cap) once per draft and published file, To do's Health line once per log,
  photo ratings and draft (in `MEMO`).
- The tiles of Quality, Growth form and By difficulty use `content-visibility: auto` (thousands of tiles).

## Conventions of every page

- **Help**: the "?" help has two tabs: this page (its `HELP` entry: what each row, column and number means, rule A2), and
  **Start here** (`HELP.start`: the workflow, what reaches the site, what is permanent, who to ask), shown first until a
  browser has opened it once.
- **Admin tables never scroll sideways for one long cell**: every `.adm-tbl` cell stops at `--cut` (9 em on phones,
  16 em from tablets; `admin.css`) and ends in "…", its full text in the title (set on hover by one listener on `#view`,
  or written by `cut()` / `pname()` for names); player names are capped by `.adm-cut` itself (an inline block, which
  every browser honours), genus links are never cut (known length), error messages wrap within a wider cap (13 / 36 em).
  Tables with many columns still scroll, column by column.
- **Every account counts**: no page leaves anyone's answers out (`playerRows` = the whole log, `rowsOf` a subject's,
  `photoStats` = the sheet's `?stats=1`); a leaderboard "hidden" (Board −1) changes only the public leaderboard. "you"
  marks the account this browser is signed in with (`isMe`, `MEID` = the anonymous id the sheet derives from the
  signed-in sync name), a mark only (`tests/everyone.test.js`). A deleted, merged or archived account's answers are out
  (`rowsOf`, rule D7).
- **Times**: every admin time is 24 h whatever the browser's language (`dateText()`); relative times by `ago()`
  ([admin-players.md › The list](admin-players.md#the-list)).
- **Colour-blind**: the admin follows the app's ⚙ Colour-blind (`reefid-sync-cvd`, read at start like the theme).
- **Charts** are drawn at the page's width, never scaled down, so their labels keep the 12 px minimum (`--fs-xs`) on
  phones too.

### Difficulty in words

One helper and one colour scale for the whole admin, `admin.js` between `// recognised: begin` and `end`
(`tests/rec.test.js`); a signed raw number ("+1.44") is never shown.

- A **photo** reads as **recognised by N%** (`recBadge`, `recPct`): the share of starting players (level 0, Elo 1000)
  who recognise it without guessing, σ(−d) = 1 / (1 + e^d) for its photo Elo d (the format-free part of the model,
  p = 1/k + (1 − 1/k)·σ(θ − d): the guess floor 1/k depends on the mode and is left out on purpose; d = 0 → 50%).
- A **genus** (any grouping) reads the same for a typical photo of it, its difficulty offset (`?stats=1` `gd`, kept in
  `GD`; the median of its photos when the sheet serves none).
- Five bands on the whole % shown (`REC`, `recBand`): ≥75 very easy, 60-75 easy, 40-60 middle, 25-40 hard, <25 very hard,
  as a pill (`.adm-rec.rec-<band>`, tokens `--rec-*`, [DESIGN.md](../DESIGN.md)), "19%" alone where a column, a card or a
  label beside it says what it is; the raw value in its title (a tap shows the title in the toast on a touch screen, the
  `$v` click listener).
- A **player** reads as their **Elo** (`eloText`: 1000 + 200 × level, ± the 95% margin of `levelMargin` where it
  exists), the level in the title.
- Charts on the difficulty axis keep it (easier on the left) with % labels at its ends and the bands as a coloured line
  under it (`recScale`). "vs expected" (points against the game's expectation) keeps its sign, and so does the one-tap
  tables' "Difficulty" column: the players' own felt difficulty (−1 too easy to +1 too hard), not a model difficulty.
- The method is in the "?" of every page that shows a reading (`REC_HELP`, `REC_PAGES`). Where it reads: Photo review ›
  By difficulty (each tile), Photo stats › Difficulty (the KPIs: median photo, middle half, hardest genus; the
  distribution's axis and bins; Views and Sources "Recognised"; each genus, its dots and lanes), Health and a session's
  summary (photos everyone misses: "recognised by N%", and "harder than its genus" when its photo Elo is
  `HEALTH.PH_FAR` above its genus median), Players (Elo, Not signed in: Elo), a Journey (Elo), Analyses › Learning ›
  Answer log (Genera: the median player Elo on each), Coverage's Where to look ("too easy": players' Elo against the
  hardest photo's reading, a badge in the full list's chip, words in the banner's titles), Candidates (the colony to
  retire: "recognised by N%, like another colony", a badge in the suggestion, words with the raw value in the tile's
  title), the one-tap tables' level bands (Elo below 900, 900-1100, above 1100).
- `tests/admin.smoke.js` checks every view of every tab, Coverage's full list and the demo journeys: no signed raw
  number in the text (seconds, points and the felt difficulty aside), every badge in the band of its %, no "recognised by
  N%" as plain text outside a badge; a new view inherits the check.

### The enlarged photo

The lightbox: `zoom()` steps through a genus's photos with ‹ › (through `zoomSet()`, which To do › Points also uses for a
point's photos) from the genus pages, Photo review, Photo stats, Health, Errors and Hidden; `zoomOne()` shows one photo
from Excluded, To do's flags, Candidates and the auto-sort. Both captions come from `lbCap()`: the genus (a link to its
sheet, `./?draft#g-<Genus>`, in a new tab) · the view, or Candidate / Not this genus · the photo's credit · its source ·
its file name. An iNaturalist photo (`o` an `inaturalist.org/observations/` URL) shows its iNaturalist taxon and author
and an **iNat observation ↗** link to `o` (new tab, `noopener`), as the games' `photoSrc()` (rule P5); an IMR lecture
photo shows its slide, with no link (no public page). `tests/admin.smoke.js` checks the link on Health's photo, both
lightboxes and a candidate.

### Photos the admin cannot show

Excluded photos gone from `data.json` show an iNaturalist thumbnail from the photo id in their name. Choices naming a
missing photo can be dropped per genus with "Forget them" (one Undo step); excluded photos never count as missing. When a
photo's file fails on R2 the admin falls back as the app does, its rotation drawn by `rotFit` (ARCHITECTURE "Photos",
**Served from Cloudflare R2**).
