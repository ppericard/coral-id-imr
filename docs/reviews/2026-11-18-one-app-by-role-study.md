# One app by role: Trainer, Curator, Manager and Admin tools inside the app (design study, 2026-11-18)

Status: a design study with mockups. It changes no app code. The mockups are the app itself, served locally, with
prototype markup injected (section 9); they are not committed. Pierre's choices are the questions at the end (section
10); the rest is the integrator's call once he has answered.

**Where the questions stand (2026-11-19): all of section 10 is settled.** (f), the rename of the stored role ids, is
dissolved by Q408 (groups carry an instance's rights, Admin stays outside the groups). (a), the entry's name
"Workspace", is kept as the integrator's call, easy to correct. (b), (c) + (d) and (e) were asked as Q422-Q424 and
answered by Pierre on 2026-11-19 (08:53-08:54): Curators sort photos through the relay, with a log and Undo (Q422); a
Trainer's view of their cohorts and a Manager's rights both work with the name + 4-digit code for now (Q423, against
the recommendation for the Manager's rights); the token goes in the app's Admin section as the very last step, and
`admin.html` goes (Q424).

## 1. Why this study

Pierre, 2026-11-18, about 11:47 Manila:

> "Pour les modes 'trainers', 'éditeurs de contenu' … Comment on leur donne accès à leurs pages/visualisations?
> Idéalement il faudrait rester dans l'app. D'ailleurs pour l'admin aussi idéalement il faudrait arriver à rester dans
> l'app."

In English: how do trainers and content editors reach their pages and views? Ideally they stay in the app, and ideally
the admin does too. He approved ("ok") a study of **one app that adapts to the signed-in account's roles**, with the
role names **Trainer**, **Curator** (was "content editor"), **Manager** (was "instance owner") and **Admin** (the
platform).

What is already decided, and not asked again:
- **Q342-Q349** (2026-11-13; ROADMAP "Roles, instances and cohorts"): scoped roles; enforced by the sheet script with one
  `can_()` check and an Audit tab, never by the page; **no Curator or Trainer ever holds a GitHub token that can push**;
  Curators publish **through a relay in the sheet script** (Q348); the pilot sign-in stays name + 4-digit code, then a
  proper account and password manager, possibly with Google sign-in, and no secret role links (Q349); cohorts are
  joined by the player's own act (Q345); the trainer sees progress, units, activity, cohort figures and each answer,
  never devices or visits, filtered by the script (Q344 (a)).
- **Q364** (2026-11-15): rights are separate; the platform admin may grant himself a role, and the grant is logged.
- **Q365** (2026-11-15): the pilot sign-in is enough for a Curator to publish through the relay.
- **Q393** (2026-11-17): a live game is started only by an account holding the trainer role (sheet v172).

## 2. What exists today

- **The admin is a second page**, `admin.html`, with its own header (Inbox, Photos, Players, Analyses: `admin.js`
  `GROUPS`: 4 groups, 15 tabs, 43 views), its own subject switch (rule A4) and 18 scripts. Every privileged call goes with
  Pierre's **GitHub token**: kept encrypted in `localStorage` (`reefid-admin-vault`, AES-GCM from his password, PBKDF2
  250,000 rounds), unlocked into `sessionStorage` for the tab only; Publish writes `curation.json` through the GitHub
  contents API after `merge3` on the latest copy (`admin.js` `save`); the sheet script checks the token with GitHub
  (`Code.gs` `isAdmin_`), and the token is the platform admin with every right (`caller_`).
- **Roles step 1** (sheet v156, docs/SECURITY.md "Roles and the Audit tab"): the Roles tab (`admin`, `owner`, `editor`,
  `trainer`), `can_(who, right, scope)`, `gate_`, the Audit tab. **One account endpoint** takes a name and code instead
  of the token: starting a live game (`lvTrainer_`, the `live` right). Every other privileged endpoint takes the token
  only.
- **The app does not know the account's roles.** The load reply (`Code.gs` `load_`) carries `groups`, `cohort`, `notes`,
  `admin: 1` for the admin's account (the 🌱), never the roles. `live.js` shows "Host a game (trainers)" to everyone and
  learns of a missing role from the script's `role` refusal.
- **The app's admin hooks**: `app.js` `HAS_ADMIN_TOKEN` (the vault is in this browser) shows ⚙ "View: Admin | User"
  and "Admin page: Open"; `IS_ADMIN` turns on Pierre's controls (⚑ flag, Lab keep/trim). They read the device, not the
  account.
- **"Tools" is taken**: it is the Lab (the header's hammer, `#tools`, the `lab` tab). A "My tools" entry would sit next
  to it and mean something else.
- **The staff**: on `main` the staff are the accounts holding `trainer` (sheet v171, `staffSet_`, Players › List's Staff
  toggle grants the role). The player-groups branch (`claude/player-groups`, not yet a PR) makes the staff **a group,
  not a role**: the toggle is gone, a trainer grant changes no board, and "a later PR builds the roles' own page".
  This study follows that branch.
- **The live prep study** (#1077, open) designs the Trainer's set builder (`#live/prep`); this study places it in the
  Trainer's tools and does not redesign it.

## 3. The entry and what each role sees

### The entry

- **A header icon, "Workspace"** (a briefcase, the one SVG set, `.theme` round button), shown **only** when the load
  reply lists a role for the signed-in account, or when this browser holds the Admin's token (as `HAS_ADMIN_TOKEN`
  today). It sits where the Sign in pill sits for a signed-out player: a signed-in account has no Sign in pill, so the
  header keeps its width (measured on the mockups: the header holds on one line at 390 px with the logotype, and at
  360 px it already drops the logotype for the subject switch, DESIGN.md "Header on narrow phones").
- **Not on Home** (rule U12, Home keeps its two doors) and not in the phone tab bar: the header icon is on every page,
  as 🏆 and the Tools hammer are.
- **A second way in**: one ⚙ row, "Workspace: Open", beside the account line (as "Admin page: Open" today), for a
  player who does not read icons.
- **The address**: `#workspace/<role>/<tab>` in the words on screen (`#workspace/trainer/cohorts`,
  `#workspace/curator/tree/<node>`), as the admin's addresses are (rule A4). A new route is a `core.js` page name, so
  its PR carries a `tools/sync/changes/` file (rule D3).
- **One role, no switch**: an account holding one role opens straight on it. **Several roles**: a full-width `.seg` at the
  top (Trainer | Curator | Manager | Admin, only those held), remembered per device. Under it, the role's tabs as
  `.modes` (the app's slim text tabs), each tab one role (rule A3 kept inside each role).
- **The page never decides.** Hiding the entry from a player is a courtesy; every list and every action comes from the
  script after `can_` (section 5). A player who types `#workspace/trainer` sees "Not for this account" and nothing else.
- **The subject**: the app's own subject switch (header and Home) is the one switch; the role pages follow it, as the
  admin's pages follow rule A4's switch today.

### What each role sees

| Role | Tabs (first is the landing) | What is in them |
| --- | --- | --- |
| **Trainer** (`trainer` at the instance: `live`, `cohorts`) | **Cohorts**, **Live**, **Sets** | Cohorts: each cohort's join code and link, its figures (members, active this week, median progress, answers), its members' progress, learned units, level, last activity and most-missed unit, a member's page with each answer (Q344 (a): never devices or visits), the cohort's most-missed units with "Prepare a live set from these". Live: Host a game (today's `#live/host`), and the phone remote during a game (section 6). Sets: the saved sets of #1077 (Mine, Shared), New set |
| **Curator** (`editor` today, renamed `curator`: `content` at the instance) | **Tree**, **Look-alikes**, **Photos** (question (b)), **Points** | Tree: the subject's tree and node pages with the Sheet box (text slots, IMR words kept and restorable, sources) and the Structure box (circles, look-alike pairs): today's `admin-content.js`, `admin-coraltree.js`, the fish Tree; Look-alikes: the pairs in force and their photo pairs; Points: the open points of rule C5 (`points.json`); the draft bar: N changes, Undo, Preview, **Publish** (through the relay) |
| **Manager** (`owner` today, renamed `manager`: `players`, `settings`, `grant` at the instance) | **Players**, **Groups**, **Roles**, **Activity** | Players › List with rename, merge, archive, delete, Leave out; the player groups (boards, beta, apart); the roles of the instance (grant, revoke, the Audit rows); who plays (Activity). Only after the better sign-in (question (d)) |
| **Admin** (`admin` at the platform; today the token) | **Inbox**, **Analyses**, **Platform** | To do (errors, alerts, health), the Analyses, Visits, the platform's settings and every instance; and everything above, as the token passes every right (docs/SECURITY.md) |

### Today's admin pages, mapped to a role

| Admin page (address) | Role | Note |
| --- | --- | --- |
| Inbox › To do › All | each role its own | each role's to-dos appear in its own tabs, counted on its entry |
| To do › Reports | Curator (content and photo reports of their subject); Admin (the app's bugs) | split by the report's reason (`reports.js`) |
| To do › Errors, Alerts, Health | Admin | platform signals (caps, bots, script errors); Alerts could later go to a Manager for their instance |
| To do › Points | Curator | rule C5's open discrepancies are content |
| Coverage › Games, Sheets & ID Key | Curator | what the subject still lacks |
| Coverage › Rights | Curator | photo licences of their subject's photos |
| Photos › Genera (Live, Hidden, Excluded) | Curator, if (b) | Pierre's photo curation today (rule A1) |
| Photos › Tree (Key, WoRMS) | Curator | the Sheet and Structure editors already live here |
| Photos › Candidates; Photo review (every view, proposals) | Curator, if (b) | |
| Photos › Look-alikes | Curator | pairs in force, photo pairs |
| Photos › Photo stats | Curator (read only) | pooled figures, no player |
| Players › Activity | Manager; Trainer sees their cohorts' slice | |
| Players › Visits | Manager, Admin | devices and visits: never a Trainer (Q344 (a)) |
| Players › List, a player's Journey | Manager; Trainer for their cohort's members (answers, never devices) | the Journey's Cards and answers are Q344 (a)'s "each answer" |
| Analyses (Overview, Speed, Difficulty, Learning) | Admin | per-player results (`readAnswers`, the `players` right); the pooled photo and pair views could later show to a Curator, read only |
| Header: Undo, Redo, Publish, Preview draft, Download JSON | Curator and Admin | the draft and its Publish |
| Lock screen, token vault | Admin only | section 5 |
| (new) Roles page | Manager (instance), Admin (platform) | the player-groups branch leaves it for "a later PR" |

## 4. Weight: role code loaded only for role holders

### Measured

Minified with terser 5.36 (`-c -m`, the quote style of `tools/minify.js`), gzip level 9, on `main` 7b260e35. The
deploy minifies every root script since #1069 (terser 5.51.2 pinned), so the first column is close to what a phone
downloads; the bracketed column is the unminified source:

| What | Minified + gzip | (gzip, unminified source) |
| --- | --- | --- |
| Player tier 1 (`core`, `app`, `sync`, `home-art`, `home`, `tour`) | 107 KB | (291 KB) |
| Player tier 2 (`model`, `tips`, `quiz`, `learn`, `progress`, `live`) | 80 KB | (191 KB) |
| **Player, tiers 1-2** | **187 KB** | (482 KB) |
| Admin page: `core.js` (shared with the player) | 46 KB | (144 KB) |
| Admin page: its 17 own scripts | 272 KB | (489 KB) |
| **Admin page, all scripts** | **318 KB** | (633 KB) |
| of which `admin.js` alone | 133 KB | (225 KB) |
| `admin-analyses.js` + `analysis.js` | 66 KB | (115 KB) |
| `admin-content.js` + `admin-coraltree.js` + `taxtree.js` (the Curator's editors today) | 12 KB | (23 KB) |
| `admin.css` / `app.css` | | 28 KB / 42 KB |
| `curation.json` (the admin's; players get `curation-play.json`) | | 434 KB (2.7 MB raw) |

The brief's figures (314 KB against 177 KB) are of the same order; the gap is the file set (`live.js` and `home-art.js`
are in the player's here) and the terser version. Either way, **every role module is code a player must never
download**.

### The design

- **Role modules, never in `index.html`.** `roles/ui.js` (the shared admin helpers: escaping template, tables, the
  difficulty pill, the draft bar), `roles/trainer.js`, `roles/curator.js`, `roles/manager.js`, `roles/admin-*.js`, each
  with its stylesheet. They are **native ES modules loaded with `import()`** when the entry is tapped, never preloaded:
  the first leaf modules of the architecture review's step 6 (R2). A module has no top-level names in the page's scope,
  so the admin's `esc`, `img`, `save`, `author` (review R11) cannot replace the app's.
- **Not in the shell.** `tools/check_versions.py` makes `sw.js` SHELL list every versioned file `index.html` loads, and
  the service worker installs SHELL on every player's phone. So the loader's list lives in `app.js` with its own `?v=`
  stamps (the deploy stamps them, rule W15) and is exempted from that check as the admin page's files are. The service
  worker already keeps the admin's files apart: `ADM_FILE` sends them to the `reefid-admin-files` cache on first use,
  cache-first by `?v=`. Widened to `roles/`, a Trainer who opened their tools once at the station has them offline on the
  boat. `tools/minify.js` minifies the root's and `proto/`'s classic scripts only: row 2 adds `roles/` (as modules).
- **The tiers stay.** `loadTier(k)` waits for tier k-1; the role loader waits for `BOOT` (tier 1) only, so the Workspace
  opens before the quiz's tier 2 if it is tapped first. A failed module is tried again (1, 2, 3 s), as the loader does
  for scripts. Not checked: whether a browser fetches a failed `import()` URL again (the page's module map may keep the
  failure), so the retry adds a counter to the URL (`&r=2`); the service worker keeps one entry a path in the admin's
  cache, so the counter does not pile up copies. Row 2 tests it.
- **Data on demand.** Only the Curator's and the Admin's modules fetch `curation.json` (434 KB gzip), the candidates
  files and the photo statistics; a Trainer's lists come from the script.
- **Cost for a player**: the entry's few lines and the loader in `app.js` (under 1 KB minified), and the `roles` field of
  the load reply (about 40 bytes, empty for nearly everyone). No role module, stylesheet or data file.
- **Estimated module sizes** (minified + gzip, estimates from the files above, labelled as such): Trainer 15-25 KB (new
  code, plus the host half of `live.js` moved out of the player's tier 2: a few KB less for every player); Curator 40-60
  KB (the editors above and the Tree and Look-alikes pages cut out of `admin.js`); Manager about 40 KB (Players › List
  and the Journey); Admin the rest, page by page.

## 5. Security

### Rights are the script's

- Every list and every action goes to the script, which calls `can_(who, right, 'instance:imr')`; the page never
  enforces, and never holds data the account may not read. Today `caller_` knows the token only; each role's first PR
  adds an **account caller**: the name and code checked against the RAs tab as `lvTrainer_` does (a wrong code counts
  towards the name's lock, an archived account is refused), then `can_` with that account's grants, one Audit row per
  change, refusals capped.
- **A session key for role calls** (recommended, integrator's call): after one checked sign-in, the script gives the
  role page a random key kept in the script cache for a class's length at most (as a live game's trainer key is), so the code is
  not sent with every call and a name locked by someone else's guesses does not cut a Trainer off mid-class (threat 2
  below).
- **The roles in the load reply** go to the account itself only (its code checked), as `groups` do today.

### What the pilot sign-in (name + 4-digit code) is enough for

| Right | Reaches | Name + code | Source |
| --- | --- | --- | --- |
| `live` (Trainer) | host a game; students' nicknames and answers to that game | yes | Q393, sheet v172 |
| `cohorts`: create, join code, saved sets (Trainer) | the trainer's own cohorts and sets | yes (this study's reading of Q365, for the integrator to confirm: like the relay, reversible and audited) | |
| `cohorts`: read members' progress and answers (Trainer) | named players' learning data | **question (c)** | Q344 (a) decided what; not with which sign-in |
| `content` through the relay (Curator) | every player's texts, circles and pairs | yes | Q365 |
| photo curation through the relay (Curator) | which photos every player sees | with (b) | |
| `players` (Manager) | names, delete, merge, archive, Leave out, visits | **question (d)**: recommended no | Q349 |
| `grant`, `settings` (Manager) | who holds which right | **question (d)**: recommended no | Q349 |
| `platform` (Admin) | the code, every instance | the token only | Q342 |

**Each stronger right needs** the better sign-in of Q349: an account with a password a password manager fills (or a
passkey), possibly Google sign-in, with a real lock-out and a recovery path; never a secret role link (Q349). The
architecture review (R13) places it with the move to a real API.

### The GitHub token

- It stays **only in the Admin's browser**, as today: the vault in `localStorage`, the unlocked token in
  `sessionStorage`, checked by the script with GitHub. A Curator, Trainer or Manager never holds one (Q342): Curators
  publish through the relay (Q348).
- Moving the Admin's pages into the app puts the unlocked token in the page that also renders players' text (names,
  nicknames, reports, sheet sources). So: the token is unlocked only inside the Admin section, held in the Admin
  module's closure (never a global, never `window`), and the Admin pages move last, after the escaping `html` template
  (review R11) is in every role module. `index.html`'s CSP already allows `api.github.com` (`connect-src`): nothing to
  widen.

### Threats and mitigations

| # | Threat | Mitigation |
| --- | --- | --- |
| 1 | Guessing a role holder's code: 5 wrong codes lock a name for 10 minutes (docs/SECURITY.md), so trying all 10,000 codes takes about 14 days, 7 on average (review R13) <!-- effort-ok: lock times, not agent effort -->; the staff board lists likely role holders by name | Audit and an Alerts line on every lock of a role holder's name; a longer lock after repeated locks; stronger rights wait for the better sign-in (table above) |
| 2 | Locking a Trainer out before class by typing wrong codes for their name | the session key (above): a device already signed in keeps working; the Manager or Admin can clear a lock |
| 3 | A player edits the page to show the Workspace | nothing comes back: every list and action is the script's, after `can_` |
| 4 | Cross-site scripting in the page that holds the Admin's token | the `html` template (R11) first, the token in the Admin module's closure, the Admin pages last |
| 5 | The relay's own credential: a push-capable token in the script could change `Code.gs`, which updates itself from `main` | recommended: the relay writes validated edits to a queue tab; a GitHub workflow pulls them and commits only `curation.json`'s content keys in a path-checked push job, the Candidate photos workflow's pattern (docs/SECURITY.md); no push token outside GitHub. The script starts the workflow (`workflow_dispatch`) with a fine-grained token that holds the Actions permission only, which cannot push; a scheduled run is the fallback. Cost: a Publish shows on the site after the workflow's run and the Pages deploy, a few minutes later than the token's direct write. **This departs from the overlay note** (2026-11-14, "commits with the relay's own credential"); decided in the relay's PR (row 6), and Pierre adds the Actions-only token once |
| 6 | A Curator's careless or hostile edit | every edit audited by anonymous id, undoable one step at a time, its original kept in `was`; every relay Publish listed in the Admin's Inbox (the overlay note's (k), Q365) |
| 7 | A shared classroom laptop left signed in | the session key expires; the Workspace has Sign out; role data is never stored on the device beyond the role names |

## 6. Phones

- **Must work on a phone: the Trainer during a live game.** Today (`live.js`, sheet v172) the host page runs on one
  device, "projector-friendly": the host's browser builds each question and sends it (`lv: 'host'`), polls every 1.5 s,
  reveals by itself when the time is up or everyone answered, and has **Reveal now**, **Next question** and **End**.
  The students' phones show the photo and the choices, so a projector is not required. Two cases:
  - **Hosting from the phone** (no projector, or the projector not needed): today's page laid out for a phone, as
    mocked: Game PIN, the photo, the time, "14 of 18 answered", **Reveal now** in a fixed bar above the tab bar, End as
    a link. It fits one screen at 360 × 640 (measured on the mockup: the content ends at 568 px, the bar above the tab
    bar; the nicknames drop under 700 px of height). Layout only: part of row 3.
  - **A phone as the remote of a projector's game** (new): a second device on the same session. The script would give
    the trainer's account (its code or session key, checked against the session's starter) a remote key whose
    Reveal, Next and End requests the projector's tab carries out at its next poll (the question is still built in the
    host's browser). **Pause** is new to the script too (the session's end time held). Row 3b below; only if trainers
    want it (the mockup's Pause link belongs to it).
- **Also on a phone**: a cohort's figures and members (cards), Host a game, the saved sets and Host now; a Curator's
  text, pair and Points edits; a Manager's player list.
- **Comfortable on a desktop, usable on a phone**: building a set (#1077's two steps, Pick and Questions); the
  Curator's photo review grids; the Analyses (their phone forms exist, DESIGN.md "Admin chart", Q74).
- **Dense tables, one rule**: under 600 px a table is a **list of cards** (a row is a card: the name, its two key figures,
  the rest behind a tap); from 600 px the table, with low-priority columns hidden on tablets, scrolling sideways inside
  its card only, never the page, its first column sticky. Exactly the three size classes (rule U4): `admin.css` has
  breakpoints at 379, 760, 820 and 899 px, which each page loses when it moves.
- **Touch by media** (rule U4): the admin's keyboard actions on the focused photo stay for a mouse; on touch, one tap
  with Undo (rule A2).

## 7. Migration path

Each step leaves `main` shippable and can stop there. Agent time from `tools/effort.py --estimate` (#1087; agent time =
first commit to green checks), with the closest merged PRs it cites; the sheet's L and XL medians are long, so its work
is split small.

| # | PR | What | Type, size | Agent time (closest PRs) |
| --- | --- | --- | --- | --- |
| 1 | Roles in the load reply | `load_` adds `roles` (the account's grants: role and scope), the app keeps it beside `groups`, a gate (rule D4); no UI | sheet M | median 29 min, range 29-58 min (#812, #835, #838, #958, #971) |
| 2 | The Workspace shell | the header icon and the ⚙ row, `#workspace/…` routes (`core.js`, a changes file), the role switch, the `import()` loader, `sw.js` `ADM_FILE` widened to `roles/`, `check_versions.py`'s exemption, "Not for this account"; the Admin's section links to `admin.html` pages until they move | feature+tooling M | median 30 min, range 5 min-1.6 h (#820, #832, #899, #986, #1056) |
| 3 | Trainer › Live and Sets | the host half of `live.js` (about 400 lines) moved into `roles/trainer.js`, laid out for a phone too; the join page's "Host a game" link only for trainers; Sets lists #1077's sets. #1077's prep page is built by #1077's own PRs (its estimate, 25-32 agent hours, #1077), in the Trainer module if row 2 is in by then, else moved here | feature L | median 53 min, range 47-60 min (#823, #826, #829, #858, #1058) |
| 3b | The live remote (only if wanted) | `lv: 'remote'` for the session's trainer, Reveal, Next and End carried out by the host's tab at its poll, Pause (section 6) | sheet+feature M | median 30 min, range 29 min-1.6 h (#838, #958, #966, #995, #1051) |
| 4 | Trainer › Cohorts, the script (roles step 2) | real cohorts with a join code (Q345), the account caller and session key, the `cohorts` reads filtered by the script (Q344 (a)), Audit, rule D7 | sheet L | median 8.9 h, range 3.2-13.3 h (#775, #882, #946, #1050, #1060) |
| 5 | Trainer › Cohorts, the pages | the desktop table, the phone cards, a member's page (the Journey's parts, never devices) | feature L | median 53 min, range 47-60 min (#823, #826, #829, #858, #1058) |
| 6 | The Curators' relay (roles step 4) | the account caller for `content`, validation against the declared slots, the queue tab and the path-checked workflow (threat 5), Audit | sheet+tooling L | median 2.9 h, range 38 min-3.2 h (#775, #946, #1047, #1050, #1075) |
| 7 | Curator › Tree, Look-alikes, Points | `admin-content.js` (685 lines), `admin-coraltree.js` (295), the fish Tree (`renderFishUnits` and its helpers) and the Look-alikes and Points pages moved into `roles/curator.js` (with `roles/ui.js` and its `html` template): about 2,000 lines moved, twice that changed; the draft in the browser; in the app, Publish always goes through the relay, Pierre's included (his account holds the Curator grant): the token stays in `admin.html` until row 15, and `admin.html` loses the moved pages, each replaced by a link to the app | admin+feature XL | median 9.6 h, range 6.4-12.3 h (#839, #987, #988, #1062, #1076) |
| 8 | Curator › Photos (if (b)) | the photo pages (Genera, Candidates, Photo review, covers) out of `admin.js`, and the relay's photo keys | admin+feature XL | median 9.6 h, range 6.4-12.3 h (#839, #987, #988, #1062, #1076) |
| 9 | The better sign-in (roles step 5, Q349) | accounts with a password or passkey, recovery, a real lock-out | sheet XL | median 41.4 h, range 14.1-47.7 h (#840, #953, #975, #988, #1049) |
| 10 | Manager › Players, Groups, Roles | the account caller for `players` and `grant`; Players › List (`renderUsers` and its actions) and `admin-journey.js` (1,180 lines) moved; the roles page | admin+feature XL | median 9.6 h, range 6.4-12.3 h (#839, #987, #988, #1062, #1076) |
| 11-14 | Admin, page by page | 11 Inbox (To do); 12 Players › Activity and Visits (`admin-visits.js`, 680 lines); 13 Analyses (`admin-analyses.js` 2,609 and `admin-heatmap.js` 391 lines; `analysis.js` stays shared with the tools); 14 the rest (Coverage, Photo stats): each its module, each over 1,500 lines changed | admin+feature XL each | median 9.6 h each, range 6.4-12.3 h (#839, #987, #988, #1062, #1076) |
| 15 | `admin.html` goes | the vault's unlock in the Admin section, the files removed, `admin.html` a one-line redirect to `#workspace/admin` (or none: rule W3) | admin+tooling M | median 30 min, range 5-45 min (#832, #899, #938, #986, #1056) |

Sizes are lines changed, as the tool bands them: a move counts its lines twice (removed and added), which puts every
page move in XL. A move is more mechanical than the new features it is compared with, so those medians lean high.

**Total, the sum of the medians above**: about 124 agent hours, of which the better sign-in (row 9: #840, #953, #975,
#988, #1049) is 41 and the four Admin moves (rows 11-14: #839, #987, #988, #1062, #1076) 38; the Trainer's path, rows
1-5 with 3b, about 12 (its largest, row 4: #775, #882, #946, #1050, #1060). #1077's prep PRs come on top (its own
estimate, 25-32 agent hours, #1077).

Order: 1 and 2 first (2 needs 1's field, behind its gate); the Trainer (3-5) can start at once and does not wait for
the better sign-in; the Curator (6-8) after the relay; the Manager (10) after 9; the Admin's pages last (threat 4).
Steps 3, 5, 7 and 10 each cut a part out of `admin.js` into a module: the admin's smokes run on both pages until 15.

## 8. Names: "content editor", "instance owner", "staff"

Counted on `main` 7b260e35 (grep, case-insensitive):

| Word | Where | Count |
| --- | --- | --- |
| "content editor" | living docs: ARCHITECTURE (10), ROADMAP (4), SECURITY (1) | 15 lines |
| | code comments: `core.js` 17, `app.js` 8, `admin.js` 8, `learn.js` 7, `quiz.js` 3, `admin-coraltree.js` 3, `admin-content.js` 2, `autosort.js` 1, `sync.js` 1 | 50 lines |
| | `tools/` (`Code.gs` 21, the fish tools, `instance.py`, `tools/instances/imr/*.json`) | 40 lines in 11 files |
| | tests | 22 lines in 14 files |
| | **UI text**: the admin's help (`admin.js` `HELP.units`: "as the content editor", twice) | 2 |
| | reviews (history: kept as written) | 22 lines |
| "instance owner" | ROADMAP (1), the overlay note (2, history) | 3 |
| stored role ids | `Code.gs` `ROLES.DEF` and `SEEDS` (`owner`, `editor`), the Roles tab's cells, the Audit tab's "grant editor" rows (read back by `grantAudited_`'s pattern), `tests/roles.test.js`, `tests/scopes.test.js`, `tests/liveclass.test.js` | 51 lines in 4 files, and the sheet's rows |
| "staff" | `progress.js` (the board's "Staff" heading), `admin.js` (the Staff toggle, 14), `admin-demo.js`, `privacy.html`, `Code.gs` (`staffSet_`), tests, docs | 109 lines outside reviews |
| "the app's admin" | `live.js` ("Ask the app's admin to give it to your account") | 1 |

**The plan** (one PR, after the player-groups branch merges, before step 2):
- **UI text**: the help's "as the content editor" becomes "as the Curator"; `live.js`'s refusal becomes "Ask your
  Manager to give it to your account". The player-facing "your trainer" lines (`sync.js`) stay: the trainer is still
  the Trainer.
- **Docs and comments**: "content editor" (the person) becomes "Curator", "instance owner" "Manager", "the editors'
  relay" "the Curators' relay", in the living docs and comments. **"The content editor" as a tool** (the Sheet and
  Structure editors) stays "the content editor": no blind replace. Reviews and Pierre's quoted words keep theirs.
- **Stored ids**: `editor` → `curator`, `owner` → `manager` in `ROLES.DEF` and `SEEDS`, with a one-shot migration of
  the Roles tab (rule W3, as the player-groups branch's `ONCE_`), Audit rows left as written and `grantAudited_` reading
  both words: question (f).
- **"staff"**: no rename. After the player-groups branch, the staff are a group named "Staff" (data, the Manager's to
  rename): that branch removes `staffSet_` and the admin's `u.staff` toggle, and keeps `progress.js`'s `B.staff`
  only for a script older than its gate, to go with the gate floor.

**Rules whose premise changes** (their wording is Pierre's; proposed in the integrator's report, not edited here): A1
(Q346 (a) already rewords it: a person holding the content right, through draft and Publish), A2 ("The admin is for
Pierre only"), A3 (one top level per role), A4 (the app's subject switch covers the role pages).

## 9. Mockups

Made on the app at `main` 7b260e35, served on 127.0.0.1, no file changed: the app's own header, data and photos, with
the Workspace markup and a stylesheet using the app's tokens only injected into `#view`. Screenshots at device scale
factor 2. Names are made up (rule D2): "Student A"…, "Reef Team, January intake"; every figure on the Trainer's screens
is illustrative (the sheet is blocked). **The sync sheet was blocked from the first run**: its hosts resolved to
127.0.0.1, service workers blocked, and a context-wide allowlist (127.0.0.1 and the photo hosts) set before the first
page load; the last run logged 683 requests, 22 to the sheet's hosts, all blocked, none let through. The Curator's
edited slot and its source ("IMR lecture, slide 14") are illustrative, not an edit anyone made.

| File | Shows |
| --- | --- |
| `trainer-desk-light.png`, `trainer-desk-dark.png` | Trainer › Cohorts at 1280 × 800: the cohorts, the join code, the figures, the members' table, the most-missed units, Host a live game |
| `trainer-phone-light.png`, `trainer-phone-dark.png` | the same at 390 × 844: a cohort picker, figures 2 × 2, members as cards, Host a live game fixed above the tab bar |
| `trainer-live-phone-light.png`, `trainer-live-phone-small-dark.png` | the phone remote during a game, 390 × 844 and 360 × 640 |
| `curator-desk-light.png`, `curator-desk-dark.png` | Curator › Tree at 1280 × 800 for an account holding Trainer and Curator (the role switch): the IMR lecture groups, a genus page with its three views, the Sheet box (IMR words, an edited slot with its source and Restore), the look-alike pairs, the draft bar with Publish |
| `curator-phone-light.png`, `curator-phone-edit-dark.png` | the same at 390 × 844, one slot open for editing, the draft bar above the tab bar |

## 10. Questions for Pierre

Product choices only; the rest is the integrator's call. Unnumbered here: the integrator numbers those that pass the two
tests (AGENTS.md "Working mode").

**State on 2026-11-19.**
- **(a) Kept: "Workspace"** is the integrator's call (easy to correct): a name players meet only if they hold a role.
- **(b) Answered, Q422** (Pierre, 2026-11-19 08:53 and 08:54; docs/ANSWERS.md): "Pourquoi plus tard?", then "ok" to
  building it with the Curators' relay, with a log and Undo (the recommendation, now not waiting: row 8 of section 7 is
  no longer "if (b)"); and "C'est toi qui est responsable de l'ordre du développement. Fait juste au mieux."
- **(c) and (d) Answered together, Q423** (Pierre, 2026-11-19 08:53): **B**, both a Trainer's view of their cohorts and
  a Manager's rights with the name + 4-digit code: "Pour l'instant on n'a pas besoin de grosse sécurité. Ya rien de
  critique. Mais oui, la meilleure connection doit être prévue dans la roadmap". (c) is the recommendation. **(d) goes
  against it** (recommended no): the Manager's section does not wait for the better sign-in (row 9 of section 7, Q349),
  which stays planned in the roadmap. The "question (c)" and "question (d)" cells of section 5's table are now yes.
- **(e) Answered, Q424** (Pierre, 2026-11-19 08:53): **A**, the token in the app's Admin section as the very last step,
  once the pages are protected, and `admin.html` goes: "ok" (the recommendation; row 15 of section 7).
- **(f) Dissolved by Q408** (Pierre, 2026-11-19; docs/ANSWERS.md 2026-11-19, `docs/reviews/2026-11-18-groups-carry-rights-study.md`
  section 6, `docs/decisions/2026-11-19-groups-carry-rights.md`). Question 1 (OK, 06:50): groups carry settings and
  rights, a player's rights are the union of their groups', and the Roles tab and its role names go. Question 6
  (changed, 06:58): groups carry only an instance's rights (Managers, Curators, Trainers); Admin stays outside the
  groups, as the token plus a short list of admin accounts kept apart, not editable from the Groups page and shown in
  the Audit. So the stored ids `editor` and `owner` are not renamed `curator` and `manager`: the migration creates
  groups of those names instead (the migration's detail is the groups-carry-rights study's: as its question 6 proposes,
  the Roles tab is kept read-only as the record). Section 8's "Stored ids" bullet above is superseded by that.

- **(a) The entry's name.** A briefcase icon in the header for role holders, where the Sign in pill sits for a
  signed-out player. "My tools" would clash with **Tools** (the Lab). *Recommendation: "Workspace".* Others: "Teach &
  curate", or the role's own name when the account holds one.
- **(b) Do Curators curate photos?** The relay's first scope is texts, circles and pairs (the overlay note). Photos
  (live, hidden, excluded, candidates, covers) are Pierre's curation today (rules A1, P1). *Recommendation: yes, as a
  second relay step (PR 8), with the same audit and Undo; until then a Curator sees the photo pages read only.*
- **(c) A Trainer reads their cohort members' progress and answers with name + 4-digit code**, during the pilot?
  *Recommendation: yes for the pilot*: members joined by their own act and were told what the trainer sees (Q345);
  the better sign-in before a second organisation.
- **(d) Manager rights with name + 4-digit code?** Names, deletes, merges, grants. *Recommendation: no; the Manager's
  section waits for the better sign-in (PR 9), and until then Pierre does these as Admin, with the token.*
- **(e) Where does the GitHub token live once the admin is in the app?** Pierre wants the admin in the app too; the
  trade-off is the token. Either it is unlocked in the app's own page (the Admin section only, after the escaping
  template is everywhere: threat 4), and `admin.html` goes; or a small token-only page stays for the few actions that
  need the token (the vault, a Publish that is not through the relay), and everything else is in the app.
  *Recommendation: the first, as the last step (row 15)*: with Pierre publishing through the relay as Curator (row 7),
  few actions still need the token, and one page is simpler for him.
- **(f) Rename the stored role ids** (`editor` → `curator`, `owner` → `manager`) with a one-shot migration of the Roles
  tab, the Audit rows kept as written? *Recommendation: yes, once*, so the sheet, the code and the screens use one
  vocabulary (rule W3).
