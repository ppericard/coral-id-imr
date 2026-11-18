# Front end: pages, routing, settings

The player's app (`index.html` and its scripts): its addresses and pages, the helpers every page shares, the ⚙
Settings and the install card. This is the specification of what the code does now; why each part was decided is in
the PRs and [docs/decisions/](../decisions/README.md). The other parts of the front end each have their spec:
[model.md](model.md) (the learning model), [quiz.md](quiz.md) (the quiz's questions, feedback and games),
[achievements.md](achievements.md) (achievements and the leaderboard), [basics.md](basics.md) (the Lab and the basics
modules), [service-worker.md](service-worker.md), [cards.md](cards.md) (the cards and prompts around a game). The load
order, the photo sizes and the start-up are in [ARCHITECTURE.md](../ARCHITECTURE.md) "Overview"; the subjects in
"Subjects"; the look in [DESIGN.md](../DESIGN.md).

## Addresses and routing (`app.js`, `core.js`)

Hash routing in `app.js` `route()`. Sections and their tabs are declared once in `MODES`.

**Addresses**: `#<section>/<page>[/<thing>…][?<filters>]`, in the words on screen, lower case, joined by `-`
(`#learn/genus/Acropora`, `#learn/look-alikes/A/B`, `#learn/compare/A/B`, `#practice/duels/A/B`,
`#identify/key?form=B&box=B1`, `#tools/anatomy`, `#leaderboard/achievements`). Home is the clean URL (the logo's
`href="./"`). The scheme comes from [the URL scheme study](../reviews/2026-11-05-url-scheme-study.md) 3.2.

**A subject other than the corals puts its prefix first** (`core.js` `SUBJECTS` `hash`: `#fish/practice/quiz`,
`#fish/learn/families`, `#fish/progress`, `#fish/identify/key`), on the pages of the sections that follow the subject
(`ROUTE_SUBJ`: Learn, Practice, Identify, My progress; the leaderboard, the Tools and About carry none); its units'
words come from `SUBJECTS` `one` / `many`. Opening a prefixed address brings that subject on screen (`setSubject`), or
the corals' page for a player who may not open it (`subjOpen`); an address without a prefix shows the subject chosen
(`reefid-sync-subject`) and is rewritten with its prefix in place; switching the subject rewrites the address
(`setSubject`).

**Page keys.** Inside, the code names a page by its page key (`genera`, `g-Acropora`, `cmp|A|B`, `cmp-A|B`,
`quiz-duel|A|B`, `idkey|form=B;box=B1`, `lab-anatomy|arr|x`): the vocabulary of `MODES`, `SUBJECTS` `pages` and the
answer modes, which the sheet parses and which do not change. `core.js` `routeOut` (key → address) and `routeIn`
(address → key; the filters split off the raw hash before each segment is decoded, so a separator inside a thing stays
in it) translate, and nothing else does: `app.js` `hashNow()` (the key on screen), `hr(k)` (a link; the first subject
that has the page when the one on screen does not), `hrFull`, `go(k)`. `tests/routes.test.js` checks every key both
ways and that no address is typed in the app's code.

**Old and unknown addresses** are not translated (rule W3): an address whose first segment is a section opens that
section's own page (`ROUTE_FIRST`: `#learn/…` the Genera list, `#practice/…` the Quiz, `#tools/<no tool>` the Tools
page), any other opens Home, and the address is replaced. The former forms (`#g-…`, `#quiz`, `#key`, `#k-…`, `#l-…`,
`#key-imr`, `#tips`, `#quiz-course`, `#credits`, `#lab-<graduated tool>`…) all open Home.

**Page names.** The page name logged and used for the photo sizes is the address's section and page (`core.js`
`pageName`: `learn.genus`, `practice.duels`, `identify.key`, `tools.anatomy`, `fish.practice.quiz`).

## The pages

- **Home** (the clean URL; `home.js`, `home.css`): two doors, all in one screen, and one credit line under them
  (`.hcred`: "By Pierre Pericard · for IMR · Credits", linking `#about`). The doors grow to fill the screen above the
  phone tab bar: on phones the Learn and Practice buttons (tab bar icon, label, one-line purpose) take the height left
  past a capped photo band (at most 28% of the screen), Identify is a compact row. Learn is the primary door, Identify
  the secondary one (DESIGN.md "Home hierarchy"). In the Learn & practise door, under its buttons, a quiet line leads
  to the subject's basics module ("New to corals? Start with the basics (5 min)" to `#learn/basics`; "New to reef
  fish?" on the fish: `UNITS` `basics` `ask`), only while the module is not done (`app.js` `basicsDone`, `basicsDue`),
  the player has fewer than `CHOICE.ASK` (50) answers, and their first-launch answer was not "I had the IMR coral
  course" or "I know corals well". On phones a short link ("New to corals? Basics in 5 min ›") takes the place of the
  door's "Learning phase" kicker and of the line, so Home still fits one screen at 360 × 640. Home's doors are drawn
  before the data is in ("Load order in tiers" in ARCHITECTURE.md "Overview").
- **About and credits** (`#about`; `home.js` `viewAbout`, tier 1): who made it, the IMR course content, the photos and
  their licences (each photo keeps its own credit), References (works cited by page or link: the Coral Finder book is
  cited there, never credited as a source of the content), privacy (links `privacy.html`) and Send feedback. The page
  bar names it with a Back button (`ctxBar`). Reached from the Home credit line and from the last line of the ? help on
  every page (`helpEnd()`: About & credits · Privacy · Send feedback). There is no page footer.
- **Delete my account** (`#about/delete-account`, then `/done`, page keys `delete-account` and `delete-account|done`;
  `sync.js` `viewDeleteAccount`, tier 1): a discreet page where a player deletes their own account and all their data,
  linked from About › Privacy and `privacy.html` only. Signed in: what is deleted in plain words, the account's code
  (checked on the device first, so a wrong one never reaches the sheet), then a second step ("Yes, delete everything" /
  Cancel); POST `{selfDelete, dname, dpin}` (`Code.gs` `selfDelete_`: everything deleted, the Removed tombstone only; 3
  tries per name and 30 in all per 6 hours); then `signOutClear(true)` (the device signed out and cleared, with every
  report this account queued and the name typed for reports) and the `/done` page. Signed out: how to delete an account.
- **Learn › Basics** (`#learn/basics`, `#fish/learn/basics`): Coral basics and Fish basics, step 0 of the Learn path,
  the first Learn tab ("Basics" on phones): [basics.md](basics.md).
- **Learn › Genera** (`#learn/genera`): the genera grid (lecture-group order by default, a slate order toggle), Photos
  or ID tips view; its first block is the basics card ([basics.md](basics.md#one-engine-two-contents)). Lecture group
  titles are `.gtitle`. `#learn/genus/<Genus>` is the genus sheet: right under its photo, before the ID tips, the plain
  sentence (`plainLine()`); once the player has seen the genus, a line at the top gives their level on it and what it
  still needs (`myProg()`, the same text as the My progress tooltip).
- **Learn › Look-alikes** (`#learn/look-alikes`): a deck of about 20 classic pair montages (`classics()`, `montage()`);
  `#learn/compare/A/B` is the pair comparison, which accepts Millepora and the bonus genera (`gameGenus()`). The two
  photos come from `learn.js` `photoPair`, which the quiz's mix-up montage ("Your answer, same view", `quiz.js`
  `answer`) also uses: the same growth form first (searched in every photo of both lists; `x` matches nothing), then
  nearest the front, then the nearest zoom level; with no same-form pair, the best pair among the first 6 of each list.
- **Practice › Quiz** (`#practice/quiz`, tab "Quiz"): the adaptive photo quiz, with typed answers and duels slipped
  in. Its page key and answer modes keep the name `quiz` (answer modes `quiz|…`, which the sheet parses):
  [model.md](model.md), [quiz.md](quiz.md).
- **Practice › Custom quiz** (`#practice/custom`, `#practice/custom/play`; tab "Custom quiz", "Custom" on phones):
  [quiz.md › Custom quiz](quiz.md#custom-quiz).
- **Practice › Look-alike duels** (`#practice/duels`; "Duels" on phones): its answers neither extend nor break the run
  of right answers and never earn Sharp eye (`progress.js` `achRunIn`).
- **Practice › Memory** (`#practice/memory`, colony ↔ corallites, from `proto/pairs.js`): its genera (`memoryGenera`)
  are those the player has met (`introduced`) first, genera not met only filling the grid (`tests/pairs.test.js`). It
  does not use the bonus genera.
- **Identify › Coral ID Key** (`#identify/key`; `proto/idkey.js`): a tolerant ranking by clues, its state in the
  address (`#identify/key?form=…&box=…&not=wall.plo`). The results page shows one suggested question (two on tablets
  and desktops, `nextChecks()`) with big Yes / No buttons showing the count and photos of the genera on each side: Yes
  adds the clue, No adds a `not` clue (genera WITH the feature count one clue off, never hidden; a removable chip
  "No: …"), Can't tell shows the next best question (not saved). Its photos are in "Photos per context" in
  ARCHITECTURE.md.
- **My progress** (`#progress`): first the player's card (`badge()`, [achievements.md](achievements.md#the-badge)),
  above the board on phones and tablets, at the top of the side column on desktops; then the board (Slate by default,
  `reefid-sync-pview`), the level counts, Review first, Often mixed up, and the Slate / Photos / Groups switch at the
  very bottom. A unit never met (no card, no answer, not opened by Open all) is a **"mystery" tile** for the players
  its subject's `UNITS[id].mystery(c)` names from their first-launch answer `c` (every fish player; the corals' "I'm
  new to corals" only): `progress.js` `mysteryOf`, a "?" in place of its name, with no cover, no link and no tooltip
  naming it, on every view; the slate keeps its number, its tooltip naming the unit's own rank (`mystT`); display only.
  The grid holds the slate's units only; each opt-in set at another rank (the fish scientific genera and species) is
  its own section under the view (`boardParts`): its units met always, its "?" tiles only while the set is on. The
  tiles show a mini ring and % ([model.md › Progress scale](model.md#progress-scale-and-mastery-levels)); Millepora and
  the bonus genera have their own places ([quiz.md › Bonus genera](quiz.md#bonus-genera)).
- **Leaderboard** (`#leaderboard`) and **Achievements** (`#leaderboard/achievements`):
  [achievements.md](achievements.md).
- **Tools (Lab)** (`#tools`, `#tools/<id>`): the prototypes, `proto/lab.js` hub: [basics.md](basics.md#the-lab-protolabjs).
- **Live** (`#live`, `#live/host`; `live.js`): a live game's join page and the trainer's page:
  [sync.md › Live games](sync.md#live-games).

Phone tab labels: "Custom" and "Duels" (`.wide` / `.narrow`), so the four Practice tabs fit 360 px.

## Shared helpers (`app.js`)

- `build()`: `structuredClone(RAW)`, then `applyCuration()`, `applyForms()`, `applySlots()` into `DATA` (also for the
  extra genera `x`).
- `applyCuration()` (`core.js`) applies `curation.json` on top of `data.json` (cover, featured order, hide, move, add
  candidates, not-this-genus, exclude, crop, 2-level genera, book switch, `single`) and drops the coral skeleton photos
  (`data.json` `skel`, rule P6): [data.md](data.md#curationjson-pierres-choices).
- `applySlots(d, c, {picks, autoq})` (`core.js`): the photos per context into `g.sl[view]`, the first 3 featured
  ("Photos per context" in ARCHITECTURE.md). The admin mirrors it (`autoOrder`).
- `curRefresh()`: a tab left open re-reads `curation.json` when it comes back into view (if the last check is over 5
  minutes old) and every 30 minutes while visible; a change applies at the next screen (`route()`), never mid-game.
  Skipped with `?draft`. Start-up never waits for `curation.json` when a kept copy exists (`CUR_KEPT`).
- `pageHelp()`: moves the intros into the "?" help box on every render (a MutationObserver on `#view`). The help box
  always ends with `helpEnd()` (About & credits · Privacy · Send feedback), so the ? shows on every page, even one
  without explanations (`resetHelp()`).
- `shownGroup()`: places a starred genus in the lecture group of its look-alikes (display only; `core.js`
  `lectureGroup`). `starNote()` names a starred genus's references on its card ("★ look-alike of …": `core.js`
  `starRefs`, the surveyed look-alikes in that group); the opening of genera reads the same references (`starWaits`,
  `model.js` `weighted`: a ★ genus opens only once they are met; LEARNING.md "Starred genera after their reference").
- `GX(n)`: a genus looked up in both the IMR genera (`DATA.gen`) and the extra Dauin genera (`DATA.x.gen`: the Coral ID
  Key, their sheets, Millepora and the bonus genera in games).
- **Game genera, defined once** (`core.js`; no genus-specific case in code): `BENTHIC` = `['Millepora']`, `BONUS` (the
  bonus genera), `slateOf(d)` (the slate) and `gameOf(d)` (the slate and the bonus genera: every genus a game can ask),
  for the app, the admin (whose `DATA.gen` also holds the `x` genera: a genus of `d.x.gen` is never a slate genus by its
  key in `d.gen`) and the tools (`tools/genera.py` reads the two lists and `CAP.sheet` from `core.js`: `game_genera`,
  `key_only`, `cap_sheet`). The other genera of `data.json` `x` are **Key-only**: Identify › Coral ID Key and their
  sheet, never a game. `tests/genera.test.js` checks that the JS and Python sides agree.
- `slateGenera()` (`app.js`, the subject's `UNITS` `slate()`; for the corals `slateOf(DATA)`): the units the games teach
  and the progress counts, "the slate" in the code. For the corals, the IMR coral slate's genera (`DATA.gen`, in
  data.json order) and `BENTHIC` (Millepora: a hydrozoan, so not on the IMR coral list, but on the IMR benthic slate,
  taught in the benthos lecture, and common at Dauin and in ReefCloud photos). Used by the draw (`pool()`), the opening
  of genera (`introLeft`, the open-all offer), `progPct`, the header pill, My progress, the sync summary (the sheet's
  "By genus" columns and the leaderboard %), the achievements and `slateIdx`. Millepora's data stays in `DATA.x.gen`
  (Coral Finder ID tips with pages, Research Grade game photos); `isBenthic(n)`. Its first-meeting card and its genus
  sheet carry `BENTHIC_NOTE` ("Not a hard coral and not on the IMR coral list, but it's on the IMR benthic slate…");
  the Slate view of My progress marks it **F** (after the starred genera), the Groups view gives it its own **F** row.
  The Genera page and the Lab tools list `DATA.gen` only (Millepora stays in the folded extra-genera line there).
- `MQ`, `isPhone()`, `isStacked()`, `tabH()`: the 3 size classes and the phone tab bar's height.
- `fitStage()`, `fitTiles()`: size the games to one screen. On phones and tablets, with one row of photos, `fitStage`
  gives the quiz stage all the height the question and answers leave, sized before the photos load (no layout shift); a
  photo close to the box's shape fills it (class `.cov`, object-fit cover), the others show whole. On desktops it picks
  the grid of views from the photos' shapes (`data-r` from data.json `ar`, written by `tools/apply_ratios.py`, also run
  by the approved-photos Action; 4:3 when missing). `flag.js` (admin ⚑) hides its button when its photo leaves the page
  and follows it on resize. `fitTiles` honours `data-minw` (the phone progress wall: the names stay readable, the wall
  may scroll).
- `IS_ADMIN`: true in Pierre's admin browser (the token vault present); gates Pierre-only controls.

## Settings (⚙, `index.html` and `app.js`)

No Subject row (the subject is switched on Home and in the header: "Subjects" in ARCHITECTURE.md). A row of one
subject only carries `data-for`; every opt-in row is `[data-optin=<k>]` with `data-on` buttons (`showBon`): Bonus
genera for the corals, Scientific names for the fish. The rows:

- **Photo size** S / M / L (`#sizerow`), shown only on the pages where it means something (`SIZE_PAGES`: Genera, the
  genus sheet, Compare, the Coral ID Key and two Lab tools), remembered per page (`reefid-sync-size`, by page name;
  default M, S on Genera); each page reads `:root[data-size]`.
- **Photo quality** Auto / Saver / Full (`reefid-photo-q`): "Photo quality setting" in ARCHITECTURE.md "Overview".
- **Non-IMR genera** On / Off (`#xrow`, on the Coral ID Key only): the Key's switch for the extra Dauin genera
  (`reefid-idkey-x`, on by default).
- **View** Admin | User and an **Admin page** link: only in the browser holding the admin token.
- **Leaderboard** On / Off (`reefid-sync-board`, synced with the progress, default On: name, progress and Elo on
  `#leaderboard`; Off is sent with the next sync): [achievements.md](achievements.md#the-leaderboard).
- **Bonus genera** On / Off (`#bonset`, `Q.bon` in `reefid-sync-coral-quiz`; off until the player accepts the offer):
  [quiz.md › Bonus genera](quiz.md#bonus-genera). On the fish, **Scientific names** (`data-optin="sci"`).
- **Theme** Light | Dark (`reefid-sync-theme`, light by default).
- **Colour-blind** On / Off (`reefid-sync-cvd` → `:root[data-cvd]`: blue and orange instead of green and red; the right
  answer is also filled and the wrong one dashed, since dark blue is close to the accent).
- **Colours**: Lagoon / Ocean / Seagrass / Twilight / Depth, swatches named under each (`reefid-sync-palette` →
  `:root[data-palette]`, **Depth by default**; the old `reef` value falls back to Depth).
- **Install the app** (`#instrow`, hidden in the installed app): below.

A small inline script in `index.html` applies the theme, palette and colour-blind mode before the first paint. There is
no "Photos from Dauin / PH / All" setting, and none is to come back.

## Install the app (`app.js`)

Phone players are nudged to install the app (an icon on the home screen) instead of opening a link in the browser.
`installNudge` offers one card (`installCard`, `cardShow` kind `feature`, `.unlock.install`, the app's icon in the
medallion) on a touch screen (`pointer: coarse`), from the 3rd visit (`INSTALL.VISITS`; a visit is a load 30 minutes or
more after the last, `installVisit`) or once 10 answers are played in any subject (`INSTALL.ANSWERS`, `answersAll`: a
full session trail), whichever comes first. It comes on Home at a calm moment, like `progress.js` `subjHello`: never
over a quiz question; signed in, after the visit's first sync (`noticeLater`); spaced from the other prompts and never
with another card (`quiz.js` `promptOk` / `promptMark`).

- Android Chrome and its family: the `beforeinstallprompt` event is held (`preventDefault`, no bar of the browser's
  own) and the card's **Install the app** calls its `prompt()`.
- iPhone and iPad Safari (`installIos`: no prompt API): the steps (Share, or ••• first on a recent iPhone, then Add to
  Home Screen, then Add) with Safari's icons inline (`INSTALL_ICONS`).
- Any other browser: no card.

The card closes for good however it closes (but by leaving the page), and never shows once installed (`appinstalled`,
an accepted prompt, or the app opened standalone: `display-mode: standalone` or `navigator.standalone`) or in the
installed app. The device record `reefid-install` (`{n: visits, t: last load, x: closed, in: installed}`) stays on the
device and is never cleared at sign-out: it is about the device, not the player. An iPhone's home-screen app has its own
storage apart from Safari's, so Safari cannot know it was installed: its card is closed for good by its button.

⚙ Settings keeps an **Install the app** row (`#instrow`, hidden in the installed app): the browser's prompt at once where
there is one, else the card (the steps, or the browser menu's Install app / Add to Home screen) without marking
anything. Nothing new is logged: the `load` event's `st` already says whether the app is installed.

Tests: `tests/install.test.js` (the decision), `tests/pages.smoke.js` part `install` (390 px: an Android-like prompt
event, iPhone Safari, the installed app, the 2nd visit, a quiz question, the ⚙ row).
