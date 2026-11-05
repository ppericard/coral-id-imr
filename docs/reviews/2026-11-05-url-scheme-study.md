# URL scheme study: IMR Reef ID app and admin (2026-11-05)

Read-only study for Pierre's request of 2026-11-05: "The URLs attached to the sub-sections no longer really make sense; the way URLs are built in the admin needs reviewing, and while we are at it the app's URLs too."

## 0. What I checked and how

- **Code read** on `main` at `225bc45d` (main checkout `/home/user/coral-id-imr`): `app.js` (`MODES`, `modeOf`, `sectionOf`, `subjPage`, `route`, `go`, `ctxBar`, `pageKey`/`SIZE_PAGES`), `proto/lab.js` (`GRADUATED`, `viewLab`, `labTool`), `proto/basics.js`, `proto/idkey.js`, `proto/anatomy.js`, `proto/cards.js`, `proto/zoom.js`, `learn.js`, `quiz.js` (`CUSTOM_H`, `modeBase`, duel routes), `progress.js`, `home.js`, `tour.js`, `sync.js` (`pagesRoute`, `ev`, report `where`), `flag.js`, `core.js` (`SUBJECTS`, `PAGES`, `pageName`, `pageFrom`, `pagesClean`, `migrateIdKey`), `index.html`, `sw.js`, `manifest.webmanifest`, `admin.html`, `admin.js` (`GROUPS`, `TABS`, `ALIAS`, `pageOf`, `navs`, `subjOfHash`, `homeOf`, `render`, `modeKey`, `sheetEarly`, `toggleHelp`), `admin-analyses.js`, `admin-journey.js`, `tools/sync/Code.gs` (`EVH`, `REP`, `events_`, `ONCE_`, `word_`).
- **Docs read**: AGENTS.md rules 0, 13b, 15, 16, 21, 22, 23, 24b and the merge contract; ARCHITECTURE.md "Pages and routing", "Subjects", "Admin back-office"; ROADMAP "Domain and repository rename" and "Admin for every subject".
- **Counted** with `git grep` (counts are lines, approximate): route literals in app code ~240 lines, `~` addresses in admin code ~170 lines, routes in tests ~285 lines, in docs ~80 lines.
- **Sheet read** (read-only, connector, allowed by the merge contract "Data access"): the Pages tab's Page and Detail columns (about 230 rows) and the Deploy log. I did **not** read the Events or Reports tabs. No names were copied here.
- **Not done**: I did not click around on port 8000 or run any test. Every behaviour below is from reading the code; where I infer, I say so.

## 1. Inventory

### 1.1 App routes (hash routes, `app.js` `route()`)

| Hash today | What it shows | Where in the UI | Built / handled in |
|---|---|---|---|
| (clean URL) | Home, two doors | logo; `#home` link in the header is rewritten to the clean URL | `home.js` `viewHome`, `route` |
| `#home` | alias of Home (header logo href) | header logo | `index.html`, `route` replaceState |
| `#basics`, `#basics\|<step>`, `#basics\|walls\|<view>`, `#basics\|<Term>`, `#basics\|words`, suffix `\|edit` | Coral basics (step 0 of Learn) | Learn tab 1 "Coral basics" / "Basics" | `proto/basics.js` via `labTool` (GRADUATED) |
| `#genera` | genus grid (Fish: fish families list) | Learn tab 2 "Genera"; header "Learn" | `learn.js`, `UNITS[id].list()` |
| `#g-<Genus>` | genus sheet | context page under Learn (page bar with Back, prev/next) | `viewGenus`; built in ~20 places (`learn.js`, `progress.js`, `quiz.js`, `app.js`, `proto/lab.js genLink`, `admin.js` `./?draft#g-`) |
| `#cmp`, `#cmp\|A\|B` | Look-alikes deck, positioned on pair A/B | Learn tab 3 "Look-alikes" | `viewLookalikes` |
| `#cmp-A\|B` | side-by-side comparison of two genera, all views ("All views", "Compare them") | context page under Learn | `viewCompare`; built in `learn.js`, `quiz.js`, `proto/idkey.js`, `web.js`, `matrix.js`, `admin.js` |
| `#quiz` | Quiz | Practice tab 1; header "Practice" | `quizPhoto` |
| `#quiz-custom`, `#quiz-custom\|play` | Custom quiz: selection screen / the quiz | Practice tab 2 "Custom quiz" / "Custom" | `quizCustom`, `CUSTOM_H` |
| `#quiz-duel`, `#quiz-duel\|A\|B` | Look-alike duels / a fixed pair ("Drill this pair") | Practice tab 3 "Look-alike duels" / "Duels" | `quizDuel` |
| `#pairs` | Memory (colony ↔ corallites) | Practice tab 4 "Memory" | `proto/pairs.js` via `labTool` |
| `#idkey`, `#idkey\|form=…;box=…;not=…` | Coral ID Key, state in the hash | Identify (corals); header "Identify" | `proto/idkey.js` |
| `#fishkey` | Fish ID Key, "coming soon" | Identify (fish) | `home.js` `viewFishKey` |
| `#progress` | My progress | tab bar "My progress", header pill | `quizBoard` |
| `#board` | Leaderboard | 🏆 page tab 1 | `viewBoard` |
| `#ach` | Achievements | 🏆 page tab 2 | `viewAch` |
| `#about` | About and credits | Home credit line, last line of every "?" help | `home.js` `viewAbout` |
| `#lab` | Tools hub | header "Tools", hammer icon | `proto/lab.js` `viewLab` |
| `#lab-<id>`, `#lab-<id>\|<args>` | a Tools prototype (`anatomy`, `map`, `zoom`, `elim`, `matrix`, `web`, `size`, `reveal`, `spot`, `type`, `gallery`, `cards`) e.g. `#lab-anatomy\|arr\|<id>`, `#lab-cards\|<kind>`, `#lab-zoom\|<Genus>` | Tools | `viewLab` |

**Subjects in the app**: the subject is **not** in the address. Fish pages are `#genera` and `#quiz` with the saved subject `reefid-sync-subject` (ARCHITECTURE "Beta": "Fish has no route of its own"). `subjPage` reroutes a page the subject lacks; `route` switches subject for `#g-…`/`#cmp-…`/`#idkey|…` links.

### 1.2 App legacy redirects still in the code (all predate rule 24b)

| Old | Goes to | Where |
|---|---|---|
| `#key`, `#key-tr` | `#idkey` | `route` |
| `#k-<group>` | `#idkey\|form=<group>` | `route` |
| `#l-<leaf>` | `#idkey\|form=…;box=…` | `route` |
| `#key-imr` | `#genera` (lecture order) | `route` |
| `#tips`, `#tips\|…` | `#genera` (ID tips view) | `route` |
| `#quiz-course` | `#quiz` | `route` |
| `#quiz-board` | My progress (drawn, not redirected) | `route`, `sectionOf`, `sync.js` regexes, `core.js pageName` |
| `#credits` | `#about` | `route` |
| `#lab-basics…`, `#lab-idkey…`, `#lab-pairs…` | the graduated tool | `viewLab` |
| `#<tool>` of a non-graduated tool | `#lab-<tool>` ("a tool sent back to the Lab keeps working from its old link") | `labTool` |
| unknown hash | falls through to `UNITS[SUBJ.id].list()` (the Genera list), hash left as is | last `else` of `route` |

### 1.3 Admin routes (`admin.html`, `#…`)

Header groups → tabs → views (`GROUPS`). `''` = a genus page `#<Genus>`. Subject prefix `#fish/` (`SUBJECTS.admin.hash`); fish has only `~triage`, `~events`, `~users`, `~journey/`, `~anon/`.

| Group (key) | Tab (key) | View label | Address today |
|---|---|---|---|
| Inbox (`todo`) | To do (`todo`) | All | `#~todo` |
| | | Reports | `#~triage` |
| | | Errors | `#~events` |
| | | Health | `#~health` |
| | Coverage (`cov`) | Games | `#~cov` (`#~stats-needs` = same with Where to look open, `ALIAS`) |
| | | Sheets & ID Key | `#~kcov` |
| Photos (`photos`) | Genera (`genera`) | Live | `#<Genus>` (no `~`) |
| | | Hidden | `#~hidden` |
| | | Excluded | `#~excluded` |
| | Candidates (`cand`) | – | `#~cand` |
| | Photo review (`review`) | Quality | `#~quality` |
| | | Growth form | `#~form` |
| | | By difficulty | `#~diff` |
| | Look-alikes (`look`) | – | `#~look` (`#~mont` = old, `ALIAS`) |
| | Photo stats (`pstats`) | Overview | `#~pstats` |
| | | Difficulty | `#~stats-photos` |
| Players (`players`) | List (`players`) | – | `#~users`; under it `#~journey/<name>`, `#~anon/<id>` |
| | Activity (`activity`) | Recent sessions | `#~stats` (the landing page, `homeOf`) |
| Analyses (`analyses`) | Overview (`an`) | – | `#~an` |
| | Speed (`anspeed`) | Answer time, Enlarging | `#~an-rt`, `#~an-zoom` |
| | Difficulty (`andiff`) | Photos, Formats, Mix-ups, Pairs | `#~an-photo`, `#~an-fmt`, `#~an-conf`, `#~stats-conf` |
| | Learning (`anlearn`) | Practice, After a break, Sessions, Answer log, Stops | `#~an-learn`, `#~an-back`, `#~an-sess`, `#~stats-log`, `#~stats-stop` |

The `~` exists to keep pages apart from genus names (`#Acropora`).

### 1.4 Where route names live beyond routing

| Place | What it holds | Old names inside? |
|---|---|---|
| **Sheet, Pages tab** (`Code.gs` `PAGES_TAB`), col F "Page" | the raw hash when the summary was queued (`ev` `pg`), e.g. `g-Goniopora`, `idkey\|form=P;box=P1`, `cmp-Danafungia\|Fungia` (seen in the sheet) | yes |
| Pages tab col G "Detail" | the visit summary: page **names** from `core.js pageName` (`home`, `quiz`, `genera`, `genus`, `compare`, `lookalikes`, `quiz-duel`, `quiz-custom`, `idkey`, `basics`, `progress`, `board`, `ach`, `lab`, `fish.genera`, `fish.home`, `fish.lab`, `fish.quiz` all seen), plus `from` (`quiz`/`learn`/`progress`/`other`) per genus | yes |
| Sheet, Events tab, col F "Page" | raw hash of every event (`err`, `photo`, `sync`, `pulse`, `load`) | yes (not read, inferred from code) |
| Events col G "Detail" of `load` events | `p0` / `nx` = first and next page, raw hash (`LOADM`), filtered by `Code.gs` `pg` = `/^[a-zA-Z0-9~\|_.-]*$/` (no `/`, `?`, `=`) | yes |
| Sheet, Reports tab "Where" | raw hash of the page a report came from | yes |
| Answers "Mode" | answer modes `quiz`, `quiz\|kN`, `quiz\|s…`, `quiz-duel\|A\|B`; report modes `basics-<step>`, `page` | named after routes, but **a separate vocabulary** parsed by the sheet (`guess_`, `stats_`), `analysis.js`, the admin and the replay. `quiz.js` derives the mode from the route string (`modeBase(cur)`) |
| `reefid-sync-size` (synced: travels to the sheet's Data column) | photo size per page, keyed by a **third** page vocabulary `app.js pageKey`: `genera`, `tips` (dead), `genus`, `pair`, `idkey`, `lab-gallery`, `lab-elim` | yes |
| `reefid-lab-votes` | Keep/Trim per Tools id | ids unchanged if Tools ids stay |
| `reefid-basics` | step ids (`last`) | no route, unchanged |
| event queue (EVQ) on each device | queued events with `pg` and pages summaries | yes, briefly |
| `reefid-photo-flags` (Pierre's browser) | `where` = raw hash | display only |
| `reefid-admin-sub`, `reefid-admin-view`, `reefid-admin-last` (+ `-fish`) | admin's remembered group→address, tab→address, last page | yes (`~` addresses) |
| `core.js SUBJECTS.pages` | `['basics','genera','sheet','cmp','quiz','quiz-custom','quiz-duel','pairs']` | route ids |
| `core.js SUBJECTS.admin.pages` (fish) | `['~triage','~events','~users','~journey/','~anon/']` | admin addresses |
| Service worker, manifest | nothing: `sw.js` never looks at hashes; `start_url` is `./` (Home) | no |
| Data files | no route links in `data.json`, `curation.json`, `forms.json`, `fish.json`, `tips.js` (grep) | no |
| Tests | `pages.smoke.js` (~76 lines), `fish.smoke.js` (~35), `net.smoke.js` (~15), `admin.smoke.js` (~90 lines with `~`), `start.test.js`, `pages.test.js`, `idkey.test.js` (bans "finder"); `window.ROUTED = h` is the raw hash | yes |
| Docs and help | ARCHITECTURE (tables above), DESIGN, LEARNING, ROADMAP, FISH_PATH, AGENTS rule 23 (`ALIAS`, `#fish/…`); admin `HELP.start` names the old group "To do" and tab "Players" | yes |
| Links players may hold | browser bookmarks or WhatsApp copies of the address bar (`#g-…`, `#idkey|…`). The app has **no share button** (no `navigator.share`/clipboard in the app code). The home-screen app opens `./` | possible, rare |

## 2. Problems

1. **Names that no longer say what the page is.** App: `#pairs` is Memory; `#cmp` is Look-alikes; `#quiz-duel` vs tab "Duels"; `#board`/`#ach` for Leaderboard/Achievements; `#lab` for a section the UI calls Tools; `#idkey` vs "Coral ID Key" and `#fishkey` beside it. Admin: `~stats` is Players › Activity, `~users` is Players › List, `~triage` is Reports, `~events` is Errors, `~stats-photos` is Photo stats › Difficulty, `~diff` is Photo review › By difficulty, `~form` is Growth form, `~kcov` is Sheets & ID Key. Worst: **`~an-conf` is "Mix-ups" while `~stats-conf` is "Pairs"** (and `~stats-conf` *was* "Mix-ups" until 2026-11-04). The `~stats-*` family is now spread across Photos, Players and Analyses.
2. **No hierarchy.** Neither scheme follows the UI (section › tab, group › tab › view). The admin's own internal keys (`todo` group label "Inbox", `players` tab label "List", `pstats`) disagree with its labels.
3. **Inconsistent separators.** App: `-` for some children (`g-`, `cmp-`, `lab-`, `quiz-custom`, `quiz-duel`), `|` for parameters, `;`/`=` inside the ID Key state. Admin: `~` prefix, `-` families, `/` for journeys and subjects. Singular/plural mixed (`genera` list vs `g-` item; `~users` vs `~journey/`).
4. **Two Look-alikes routes that look alike**: `#cmp|A|B` (the deck on a pair) and `#cmp-A|B` (the comparison page) differ by one character.
5. **Three page vocabularies derived from the hash**: `core.js pageName` (logged: `genus`, `compare`, `lookalikes`), `app.js pageKey` (size prefs: `genus`, `pair`), `app.js modeOf`/`sectionOf` (routing). Plus the answer modes derived from the route string. Each new page has to be taught to all of them.
6. **Hash literals everywhere**: ~20 places build `#g-…`, ~25 admin places build `#<Genus>`, ~115 `'~…'` literals in `admin.js`. No builder function.
7. **Subjects are in the admin's addresses (`#fish/~users`) but not in the app's** (fish pages are `#genera`, `#quiz` + saved state): a fish page cannot be linked, and the logged name needs a side prefix (`fish.`).
8. **Rule 24b is not applied yet**: ~10 permanent redirects in the app (1.2) and `ALIAS` in the admin. **AGENTS.md rule 23 contradicts 24b**: "an old address must keep landing on its tab and view (`ALIAS`)" and "coral addresses never change".
9. **Decode before split**: `hashNow()` decodes the whole hash before splitting on `|`; a parameter containing the separator (a player name with `/`, for the new scheme) would break. Today it only works because separators never appear in genus names.

Side findings (not URL design, but met on the way):
- **Key collision, verified by reading the code, not run**: `reefid-admin-view` is both the app's ⚙ "View: Admin | User" (raw string `'user'`/`'admin'`, `app.js` ~2087, `flag.js` 9) and the admin's tab → view map (JSON object, `admin.js` `navs`). Same origin, same `localStorage`. Opening the admin after choosing "View: User" overwrites it with the object, so the app silently goes back to Admin view; choosing a view in the app wipes the admin's remembered views. Fix with the admin PR below (rename the admin's memories).
- **Migration residue, observed in the sheet**: the Pages tab still holds `finder|form=S` (col F) and a `finder` key in a Detail cell, although the Deploy log says `one-shot idkey (v39)` ran on 2026-11-04. The regex in `ONCE_.idkey` matches that value, so (my inference; the tab stores the date only) these rows arrived **after** the one-shot, from a device still running the old app. Any route rename needs a second sweep (section 4).
- `SIZE_PAGES` still lists `tips`, a page that no longer exists.

## 3. Proposed scheme

### 3.1 Principles (one rule set for both)

1. **Path = the UI hierarchy**, lowercase, words joined by `-`: app `#<section>/<page>[/<param>…]`, admin `#<group>/<tab>[/<view>][/<param>…]`.
2. **Each segment is the word the UI shows**: its shortest label (the phone label where there is one), lower case, punctuation dropped (`Look-alikes` → `look-alikes`, `Sheets & ID Key` → `sheets-id-key`, `After a break` → `after-a-break`). A tab drops its group's word (`Photo review` → `review`, `Photo stats` → `stats`).
3. **A tab with one view has no view segment** (`#players/activity`). A shorter address (a group, or a tab with several views) opens its **first** view: always the same answer, unlike the "last used" memory, which only fills the nav links.
4. **Parameters are path segments when they name a thing** (a genus, a pair, a player, a step), each `encodeURIComponent`-ed and decoded **after** splitting; **state goes after `?`** as `key=value&…` (`URLSearchParams`), e.g. the ID Key's clues, Basics' `edit`, Coverage's Where to look open in full.
5. **The subject is the first segment, except for the corals** (the default subject): `#fish/…`, in the admin as today and, if Pierre agrees (Q3), in the app too. Words that name the units come from `SUBJECTS` (`many`, `one`), so rule 13b holds: `#learn/genera` / `#fish/learn/families`, `#learn/genus/<Genus>` / `#fish/learn/family/<id>`.
6. **One route table per page, the single source** (app: one `ROUTES` table replacing `MODES` keys, `modeOf`, `sectionOf`, `pageName`, `pageKey`; admin: addresses computed from `GROUPS`). Links come from builders (`href.genus(n)`, `href.compare(a, b)`, admin `adm(…)`), never typed literals.
7. **Logged page name = `<section>.<page>`** of the route, parameters dropped, subject prefix kept (`fish.`): `learn.genus`, `practice.duels`, `fish.practice.quiz`. `.` and `-` already pass `core.js PAGES.RE` and `Code.gs`, so **the sheet needs no new feature**. The `load` event's `p0`/`nx` send this name, not the raw hash (the sheet's `pg` filter would blank a `/`).
8. **Answer modes stay as they are** (`quiz`, `quiz|s…`, `quiz-duel|A|B`, report modes `basics-<step>`): they are data the sheet, the replay and the analyses parse. The router translates route → mode at its edge; a golden test pins every logged mode.

### 3.2 App: old → new

| Old | New | Logged name (old → new) |
|---|---|---|
| (clean URL), `#home` | clean URL only (header logo `href="./"`) | `home` → `home` |
| `#basics`, `#basics\|<step>`, `#basics\|walls\|<view>`, `#basics\|<Term>`, `#basics\|words`, `\|edit` | `#learn/basics`, `#learn/basics/<step>`, `#learn/basics/walls/<view>`, `#learn/basics/<Term>`, `#learn/basics/words`, `?edit` | `basics` → `learn.basics` |
| `#genera` | `#learn/genera` (fish: `#fish/learn/families`) | `genera` → `learn.genera` |
| `#g-<Genus>` | `#learn/genus/<Genus>` | `genus` → `learn.genus` |
| `#cmp` | `#learn/look-alikes` | `lookalikes` → `learn.look-alikes` |
| `#cmp\|A\|B` | `#learn/look-alikes/A/B` | `lookalikes` → `learn.look-alikes` |
| `#cmp-A\|B` | `#learn/compare/A/B` | `compare` → `learn.compare` |
| `#quiz` | `#practice/quiz` | `quiz` → `practice.quiz` |
| `#quiz-custom`, `#quiz-custom\|play` | `#practice/custom`, `#practice/custom/play` | `quiz-custom` → `practice.custom` |
| `#quiz-duel`, `#quiz-duel\|A\|B` | `#practice/duels`, `#practice/duels/A/B` | `quiz-duel` → `practice.duels` |
| `#pairs` | `#practice/memory` | `pairs` → `practice.memory` |
| `#idkey`, `#idkey\|form=B;box=B1;not=wall.plo` | `#identify/key`, `#identify/key?form=B&box=B1&not=wall.plo` | `idkey` → `identify.key` |
| `#fishkey` | `#fish/identify/key` | `fish.fishkey` → `fish.identify.key` |
| `#progress` | `#progress` | `progress` → `progress` |
| `#board` | `#leaderboard` | `board` → `leaderboard` |
| `#ach` | `#leaderboard/achievements` | `ach` → `leaderboard.achievements` |
| `#about` | `#about` | `about` → `about` |
| `#lab` | `#tools` | `lab` → `tools` |
| `#lab-<id>`, `#lab-<id>\|a\|b` (e.g. `#lab-anatomy\|arr\|x`, `#lab-cards\|toast`) | `#tools/<id>`, `#tools/<id>/a/b` | `lab-<id>` → `tools.<id>` |
| redirects of 1.2 (`#key`, `#k-…`, `#l-…`, `#key-imr`, `#tips`, `#quiz-course`, `#quiz-board`, `#credits`, `#lab-<graduated>`, `labTool` fallback) | removed | `quiz-board` logged as `progress` today; nothing new |
| unknown address | its section's first page when the first segment is a section, else Home (explicit, instead of the silent Genera list) | `other` |

Tools ids stay (`anatomy`, `zoom`…), so `reefid-lab-votes` needs nothing. The graduated tools keep their file ids internally (`basics`, `idkey`, `pairs`); only the route table maps them. Up from a context page becomes "drop the last segment" (`#learn/genus/X` → `#learn/genera`, `#learn/compare/A/B` → `#learn/look-alikes`).

### 3.3 Admin: old → new

| Old | New |
|---|---|
| `#~todo` | `#inbox/todo/all` |
| `#~triage` | `#inbox/todo/reports` |
| `#~events` | `#inbox/todo/errors` |
| `#~health` | `#inbox/todo/health` |
| `#~cov` | `#inbox/coverage/games` |
| `#~stats-needs` | `#inbox/coverage/games?look=all` |
| `#~kcov` | `#inbox/coverage/sheets-id-key` |
| `#<Genus>` | `#photos/genera/live/<Genus>` |
| `#~hidden` | `#photos/genera/hidden` |
| `#~excluded` | `#photos/genera/excluded` |
| `#~cand` | `#photos/candidates` |
| `#~quality` | `#photos/review/quality` |
| `#~form` | `#photos/review/growth-form` |
| `#~diff` | `#photos/review/by-difficulty` |
| `#~look`, `#~mont` | `#photos/look-alikes` |
| `#~pstats` | `#photos/stats/overview` |
| `#~stats-photos` | `#photos/stats/difficulty` |
| `#~users` | `#players/list` |
| `#~journey/<name>` | `#players/list/journey/<name>` |
| `#~anon/<id>` | `#players/list/anon/<id>` |
| `#~stats` (landing page) | `#players/activity` (landing page) |
| `#~an` | `#analyses/overview` |
| `#~an-rt`, `#~an-zoom` | `#analyses/speed/answer-time`, `#analyses/speed/enlarging` |
| `#~an-photo`, `#~an-fmt`, `#~an-conf`, `#~stats-conf` | `#analyses/difficulty/photos`, `…/formats`, `…/mix-ups`, `…/pairs` |
| `#~an-learn`, `#~an-back`, `#~an-sess`, `#~stats-log`, `#~stats-stop` | `#analyses/learning/practice`, `…/after-a-break`, `…/sessions`, `…/answer-log`, `…/stops` |
| `#fish/~triage`, `#fish/~events`, `#fish/~users`, `#fish/~journey/<n>`, `#fish/~anon/<id>` | `#fish/inbox/todo/reports`, `#fish/inbox/todo/errors`, `#fish/players/list`, `#fish/players/list/journey/<n>`, `#fish/players/list/anon/<id>` |
| `ALIAS` | removed |

The `~` is no longer needed: a genus is a parameter under `photos/genera/live/`. `SUBJECTS.admin.pages` for fish becomes path prefixes (`inbox/todo/reports`, `inbox/todo/errors`, `players/list`). The group and tab keys in `GROUPS` become the slugs (`inbox`, `todo`, `coverage`, `review`, `stats`, `list`, `speed`…), so the address is computed and every `'~…'` literal goes through one map. The admin's links into the site (`./?draft#g-…`, `./#cmp-…`) move with the app rename.

### 3.4 How subjects fit

- Admin: unchanged rule (`#fish/` prefix, corals none), applied to the new paths.
- App (Q3): the same rule. `#fish/learn/families`, `#fish/practice/quiz`, `#fish/progress`, `#fish/identify/key`. Opening a `#fish/…` address switches the subject (what `route` already does for `#g-…` links), a subject the player may not open (`subjOpen`) falls back to the corals' page of the same section, as today. The saved subject (`reefid-sync-subject`) stays the default for a bare section address (`#practice/quiz` with Fish chosen redirects to `#fish/practice/quiz`). Logged names keep `fish.` (already the case). Benefit: a fish page can be linked, Back/Forward across a subject switch is exact, and the logged name is the route. Cost: the address and the saved choice must agree; `setSubject` rewrites the address (it already rewrites it through `subjPage`).

## 4. Migration under rule 24b

| Data | Migration | When |
|---|---|---|
| Pages tab col F (raw hash), col G (page names in the summary), Events col F (raw hash) and col G `load` `p0`/`nx`, Reports "Where" | `Code.gs` `ONCE_.routes`, same shape as `ONCE_.idkey` (same tabs and columns), logged in the Deploy log. The translation lives once in `core.js` `routeRename(old)` (raw hash → new hash; page name → new name), which `tools/sync_core.py` embeds in `Code.gs`, between `routes-migration: begin/end` markers like the idkey one | in the sheet PR, merged once the app PR has been live about a day |
| Residue (rows sent later by a device still on the old app, as the `finder` rows show) | a second sweep, `ONCE_.routes2` (same function), in the next sheet version a few days later; it can also clear the two `finder` cells | a few days after `routes` |
| `reefid-sync-size` (synced) | `core.js migrateRoutes` at start-up (app and admin, after `migrateIdKey`): keys `genera`, `genus`, `pair`, `idkey`, `lab-gallery`, `lab-elim` → `learn.genera`, `learn.genus`, `learn.compare`, `identify.key`, `tools.gallery`, `tools.elim`; `tips` dropped. Idempotent, so a value the sheet sends back from an older device is moved at the next start (as `migrateIdKey` does) | app rename PR |
| Device event queue (EVQ) | the same start-up step renames `pg` and the pages-summary names of queued events, so nothing old leaves an updated device | app rename PR |
| `reefid-photo-flags` `where` | display only on Pierre's device: migrate with the same function (one line) or leave | app rename PR |
| `reefid-admin-sub`, `-view`, `-last` (+ `-fish`) | not real data (remembered tabs). Rename them (`reefid-admin-nav-group`, `-nav-tab`, `-nav-last`), which also ends the `reefid-admin-view` collision, and validate every remembered value against `GROUPS` before use. No migration code | admin PR |
| `curation.json` | nothing: no keys are page names | – |
| Answers "Mode", Reports "Mode", pulse `m` | nothing: modes are not renamed (3.1 point 8) | – |
| `reefid-sync-coral-custom`, `reefid-basics`, `reefid-lab-votes` | nothing: they hold genera, step ids and tool ids, not routes | – |

**What cannot break**
- The installed app's start page: `start_url` is `./` (Home, no hash) and stays.
- The service worker: unaffected (hashes never reach it).
- Shared genus links: only copies of the address bar (no share button), likely few in alpha. Without a redirect an old `#g-Acropora` lands on Home (with the explicit fallback above) instead of the sheet. 

**Is a one-time redirect worth an exception to 24b?** For the app, a **time-boxed** one is cheap and safe: the translation `core.js routeRename` must exist anyway for the data migration, and it is deleted with it. Calling it in `route` for an unknown address until that code is deleted (at the latest with the domain move planned before December 2026, ROADMAP) costs about three lines and spares an RA a dead link. The domain move will break every saved link anyway unless the old address forwards the hash; if the move comes first, that forwarding page is the natural home for the translation, outside the app. For the admin: no exception (Pierre's bookmarks only).

## 5. Effort, risks, PR split

### PR split (each PR keeps the app working; estimates are guesses for one agent)

1. **Admin addresses** (~1 day). `GROUPS` keys → slugs, addresses computed from `GROUPS`, one map instead of ~115 `'~…'` literals, `render`/`modeKey`/`sheetEarly`/`toggleHelp`/`pageOf` keyed on the new ids, `SUBJECTS.admin.pages` (core.js, so `sync_core.py --fix` refreshes the copy embedded in `Code.gs`; past changes of the same kind took a `VERSION` bump, e.g. v45 for `SUBJECTS.admin`), `ALIAS` removed, admin memories renamed (fixes the collision), help texts, `tests/admin.smoke.js` (~90 lines), ARCHITECTURE admin tables, **AGENTS.md rule 23 text** (Q4). Independent of the app. Highest merge-conflict risk: `admin.js` is under heavy work (admin plan PRs 3-12, open branches); land it early and short, so the fish pages are built on the new scheme.
2. **App route table, no rename** (~1 day). One `ROUTES` table and builders, `pageId()` replacing `pageName`/`pageKey`/`modeOf`/`sectionOf`, split-then-decode, route → answer-mode translation in `quiz.js` with a **golden test** pinning every logged mode. Behaviour and addresses identical, so the existing smokes prove it.
3. **App rename** (~1-1.5 days). Switch the table to the new paths, redirects of 1.2 removed, explicit unknown-address fallback, `core.js routeRename` + `migrateRoutes` (size prefs, EVQ, flags), `load` event names, admin's links into the site, tests (~200 lines in `pages.smoke.js`, `fish.smoke.js`, `net.smoke.js`, `start.test.js`, `pages.test.js`), docs (~80 lines), a test that no old route is left (as `idkey.test.js` does for "finder"), and the time-boxed old-link translation if Pierre agrees (Q2).
4. **Sheet one-shot** (~0.5 day). `ONCE_.routes` over Pages, Events, Reports with `tests/gas.js` cases, `VERSION` bump; then `ONCE_.routes2` in the next version.
5. **Subject in the app's addresses** (~0.5-1 day, only if Q3 is yes; can ride in PR 3).

### Risks and how each is covered
- **Answer modes renamed by accident** (they feed the replay and every stat): golden test in PR 2, before any rename.
- **The sheet refusing new names**: logged names use `.` and `-` only (already accepted); `load` sends names, not raw hashes. No deploy-order dependency (rule 7a) except running the one-shot after the app is live.
- **Residue rows**: device-side queue migration plus the second sweep.
- **Separator in a parameter** (a player name with `/`): split first, decode each segment; a test with such a name in the admin smoke.
- **Smokes**: they check routes heavily (`window.ROUTED` is the hash). One smoke at a time (rule 16); run only the parts touched, CI for the rest.
- **Concurrent admin work**: PR 1 first and small; tell the agents on the admin plan to build on it.

## 6. Questions for Pierre (with recommendations)

- **Q1. The scheme.** App `#<section>/<page>/<param>` (e.g. `#learn/genus/Acropora`, `#practice/duels`, `#practice/memory`, `#identify/key`, `#leaderboard/achievements`, `#tools/anatomy`), admin `#<group>/<tab>/<view>` (e.g. `#players/activity`, `#players/list`, `#inbox/todo/reports`, `#photos/stats/difficulty`), words taken from the labels on screen, logged page names `learn.genus`, `practice.quiz`… *Recommendation: yes, as in tables 3.2 and 3.3.*
- **Q2. Old links of players** (`#g-Acropora` saved or sent before the change). Translate them once, until the migration code is deleted (at the latest with the domain move), or let them land on Home? *Recommendation: translate, time-boxed: the code exists anyway for the data migration and is deleted with it.*
- **Q3. The subject in the app's addresses**: fish pages get `#fish/…` as in the admin (a fish page can be linked; opening such a link switches to Fish, for those who may open it). *Recommendation: yes, in the same rename, while fish is in beta and few people see it.*
- **Q4. Rule 23 vs 24b**: rule 23 says an old admin address must keep landing on its page (`ALIAS`) and that coral addresses never change; 24b says no redirects. *Recommendation: drop that sentence of rule 23 and keep 24b: old admin addresses stop working, no `ALIAS`.*

Integrator's calls (no question needed): `#tools` rather than `#lab` (the UI word), `compare` for the side-by-side page, the admin memory keys' names, the unknown-address fallback.
