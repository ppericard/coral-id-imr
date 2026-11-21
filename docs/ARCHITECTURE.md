# Architecture

How the app is put together. Rules and workflow are in [`../AGENTS.md`](../AGENTS.md); deferred ideas in [`ROADMAP.md`](ROADMAP.md).

## Overview

```
data.json, fish.json, seaslug.json ───────┐  (the units; Data files, Subjects)
fish-game.json, seaslug-game.json ────────┤  (the photos in play)
forms.json, quality.json, picks.json ─────┼─> app.js + core.js (applyCuration, applySlots, treeGen) ─> pages
curation-play.json (curation.json, cut) ──┘                │                       ▲
                                                           │                       └── photos: R2, else their original
                                                           └─> progress in localStorage ─> Apps Script ─> Google Sheet
admin.html ──(GitHub API, Pierre's token)──> curation.json on main ──> Candidate photos workflow ──> R2 + data commit
main ──> Deploy Pages: build_site.py (players' curation, stamps, minify) ──> GitHub Pages
```

- **A static site** on GitHub Pages, no framework; the deploy builds its own copy (it minifies the scripts and stamps the
  versions), development has none. Everything runs in the browser; the only backend is the sheet script, the photos are
  on Cloudflare R2. [spec/site.md](spec/site.md): what is served, the static pages and assets (**`privacy.html`**, the
  **Link preview**, the **App icon**) and the security model; the deploy: "Run and deploy".
- **A service worker** (`sw.js`) caches the app shell for offline use and the photos as they are viewed:
  [spec/service-worker.md](spec/service-worker.md).
  - **New versions reach players without a manual reload**, **Never in the middle of a question**,
    **A page left on a replaced version** (the app's version on every request to the sheet):
    [spec/loading.md › New versions](spec/loading.md#new-versions). The players' copy of the curation,
  `curation-play.json`: [loading.md](spec/loading.md#the-players-copy-of-the-curation).
- **Speed on poor connections and low-end phones**: [spec/loading.md](spec/loading.md), measured with `tools/perf.js`
  and `tools/syncperf.js`.
  - **Load order in tiers** (**1 Home**, **2 the photo quiz**, **3 the photos of the next quiz questions, then the
    Learn pages**, **4 the sheet's reads**, **5 the rest**, the Lab's stylesheet with it), Home's doors before the data,
    the loading bar:
    [loading.md › Load order in tiers](spec/loading.md#load-order-in-tiers).
  - **Start-up** without waiting for the curation, the units built once, the cached leaderboard, the fonts:
    [loading.md › Start-up](spec/loading.md#start-up).
  - **Quiz** questions planned ahead and their photos fetched in order:
    [loading.md › The quiz plans ahead](spec/loading.md#the-quiz-plans-ahead).
  - **Photo sizes**, the **Photo quality setting** (Auto, Saver, Full), a photo that fails:
    [loading.md › Photo sizes](spec/loading.md#photo-sizes), [quality](spec/loading.md#photo-quality-setting),
    [failures](spec/loading.md#a-photo-that-fails).

## Front end

**What it is.** The players' app: one page (`index.html`) with hash routing, the sections Learn, Practice, Identify, My
progress, the leaderboard, Tools and About, for every subject; the learning model that picks each question, its
photos and its format from the player's own answers; the feedback after an answer, the achievements and the leaderboard;
the ⚙ Settings; and the service worker that serves it offline and brings each new version in.

**Main files.** `index.html` (the inline tier loader, the ⚙ panel), `app.css`, `home.css`; `app.js` (routing, `build()`,
the shared helpers, Settings, the install card), `core.js` (the engine shared with the admin and the sheet script:
`SUBJECTS`, `routeOut` / `routeIn`, `scoreAnswer`, the achievement lists; written in its parts, `core/*.js`, which
`tools/sync_core.py` joins into the one `core.js` the pages load), `model.js` (the learning model), `quiz.js`
(the games, typed questions, the feedback sheet), `learn.js` (the Learn pages), `progress.js` (My progress,
achievements, the leaderboard), `home.js`, `tour.js`, `tips.js`, `flag.js`, `sync.js` (Progress sync), `live.js`;
`proto/` (the Lab and the basics modules); `sw.js`.

**How it connects.** It loads the data files and `curation.json` ("Data files", "Photos per context", "Photos"), in the
tiers of "Overview"; every answer goes to `sync.js` and the sheet ("Progress sync"), which rates the photos and pairs
the model reads back (`?stats=1`) and replays the progress with the same `core.js`; the units come from "Subjects".
Rules L1-L12 ([rules/learning.md](rules/learning.md)), U1-U14 ([rules/ui.md](rules/ui.md)), C3
([rules/content.md](rules/content.md)) and S1 ([rules/subjects.md](rules/subjects.md)) govern it; its look is
[DESIGN.md](DESIGN.md), the research behind the model [LEARNING.md](LEARNING.md).

**Where the details live.** [spec/front-end.md](spec/front-end.md), the addresses and routing, the pages, the shared
helpers, the Settings and the install card; [spec/model.md](spec/model.md), the learning model in the app;
[spec/quiz.md](spec/quiz.md), typed questions, the feedback sheet, the glossary, the custom quiz and the bonus genera;
[spec/achievements.md](spec/achievements.md), achievements, the badge and the leaderboard; [spec/basics.md](spec/basics.md),
the Lab and the basics modules; [spec/service-worker.md](spec/service-worker.md); the cards around a game are
[spec/cards.md](spec/cards.md).

- **Pages and routing** (`app.js`), **Addresses**, **A subject other than the corals puts its prefix first**, the page
  table and the old addresses: [front-end.md › Addresses](spec/front-end.md#addresses-and-routing-appjs-corejs),
  [the pages](spec/front-end.md#the-pages).
  - **About and credits**, **Delete my account**, **Quiz**: [front-end.md › The pages](spec/front-end.md#the-pages).
  - **Custom quiz**: [quiz.md › Custom quiz](spec/quiz.md#custom-quiz).
  - **Coral basics**, **Fish basics**, **Sea slug basics**, **One engine, one content per subject**:
    [basics.md](spec/basics.md#one-engine-one-content-per-subject).
  - **Achievements**, **Contributions**, **Your feedback helped**, **Never again and again**, **Never for an account the
    admin deleted**: [achievements.md](spec/achievements.md#achievements),
    [Your feedback helped](spec/achievements.md#your-feedback-helped).
  - **Leaderboard**, **One leaderboard per subject**, **The admin's 🌱**, **Staff and cohort boards**, **All players**,
    **Other groups**, **Other cohorts**: [achievements.md › The leaderboard](spec/achievements.md#the-leaderboard).
  - The **mystery tile** of My progress: [front-end.md › The pages](spec/front-end.md#the-pages).
- **Game genera, defined once**, and the other shared helpers: [front-end.md](spec/front-end.md#shared-helpers-appjs).
- **Settings** (⚙), **Depth default**, **Bonus genera On / Off**:
  [front-end.md › Settings](spec/front-end.md#settings--indexhtml-and-appjs).
- **Learning model** (`model.js`): [model.md](spec/model.md).
  - **Comeback after a break**: [model.md](spec/model.md#comeback-after-a-break).
  - **First-meeting cards, Open all genera and back to one at a time**: [model.md › Which unit next](spec/model.md#which-unit-next).
  - **Learned**, the **silent mastery exam**, **No time between sessions anywhere**, **Progress scale**, the **mastery
    levels**: [model.md › Progress and mastery](spec/model.md#progress-and-mastery),
    [Progress scale](spec/model.md#progress-scale-and-mastery-levels).
  - **The exam's reserve** (each player's own, every subject): [reserve.md](spec/reserve.md).
  - **Which genus next**: [model.md › Which unit next](spec/model.md#which-unit-next).
  - **Continuous difficulty**, **Answer choices**, **Confusion scores**, **Personal path**, **Online calibration**,
    **Juveniles and colour phases on their unit's mastery**, **The mimicry class**, **One colony per question**,
    **Photo difficulty**, **Photo memory**: [model.md › Difficulty and ability](spec/model.md#difficulty-and-ability).
  - **Typed questions**, **Every tunable number is in `TYPED`**, **On a genus question below the subject's rank**,
    **Fish names**, **Every text refused**: [quiz.md › Typed questions](spec/quiz.md#typed-questions).
  - **Similar names after a mix-up**, **The short feedback sheet** (**one decisive line**, **More / Less and Next**, the
    **More panel**, the **first ID tip or mark**, **The coral and sea-slug pairs' lines**), **The More counter**:
    [quiz.md › The feedback sheet](spec/quiz.md#the-feedback-sheet).
  - **Glossary words**: [quiz.md](spec/quiz.md#glossary-words).
  - **Bonus genera**, **Offered once**, **Add them** / **Not now**: [quiz.md › Bonus genera](spec/quiz.md#bonus-genera).
- **Lab prototypes** (`proto/`): [basics.md › The Lab](spec/basics.md#the-lab-protolabjs).
- **Install the app** (`app.js`): [front-end.md](spec/front-end.md#install-the-app-appjs).
- **Service worker** (`sw.js`): **Caches**, **Install**, **Activate**, **A page no service worker controls**, **Fetch**,
  **A page opened while a newer version waits**, **No time limit on Cache Storage**:
  [service-worker.md](spec/service-worker.md).

## Subjects (the taxon model)

**What it is.** A subject is what the games teach: the corals, the fish (families, then scientific genera and species)
and the sea slugs (genera). The engine never names one: it works on the current subject, which describes itself as data,
and the player switches between the subjects open to them.

**Main files.** `core.js` `SUBJECTS` (the registry, shared with the admin and the sheet script), `unitRankOf`,
`subjGroup`, `treeGen`, `treeScore`; `app.js` `UNITS` (what the app reads each subject's units and pages through),
`setSubject`, `inSubject`, `subjOpen`, `treeGenera`, the tree state (`treeAt`, `treeLoad`); `progress.js` `subjHello`;
`learn.js` `viewList`, `viewTreeSheet`; `sync.js` `mergeSubject`; `tools/seaslug_game.py` and the fish build tools
(Data files).

**How it connects.** Each subject's data comes from its own files (Data files); its progress syncs and replays per
subject (Progress sync); the admin has one switch over the same registry (Admin back-office); its addresses carry its
prefix ("Pages and routing"). Rules S1-S3 ([rules/subjects.md](rules/subjects.md)) govern it.

**Where the details live.** [spec/subjects.md](spec/subjects.md), the model: the registry, what reads a subject's data,
records, Identify, the switch, the sync per subject, who sees a subject, the subject's card;
[spec/fish-game.md](spec/fish-game.md), what fish players get, the scientific genera, the species and the global score;
[spec/fish-sheets.md](spec/fish-sheets.md), the fish family, genus and species sheets;
[spec/seaslugs.md](spec/seaslugs.md), the sea slugs.

- **Registry**: [subjects.md › The registry](spec/subjects.md#the-registry-corejs-subjects).
- **Tree engine names and the flat subject**:
  [subjects.md](spec/subjects.md#tree-engine-names-and-the-flat-subject).
- **What reads the subject's data**: [subjects.md](spec/subjects.md#what-reads-the-subjects-data-appjs-units).
- **Records**: [subjects.md › Records](spec/subjects.md#records).
- **Identify per subject**: [subjects.md](spec/subjects.md#identify-per-subject).
- **Switching**: [subjects.md › Switching](spec/subjects.md#switching).
- **Sync**, **Full replay**: [subjects.md › Sync and replay per subject](spec/subjects.md#sync-and-replay-per-subject);
  the replays themselves: [sync.md › Full replay](spec/sync.md#full-replay).
- **Beta**, **Opening** (who sees a subject): [subjects.md › Who sees a subject](spec/subjects.md#who-sees-a-subject).
- **The beta group**: [subjects.md › The beta group](spec/subjects.md#the-beta-group); the player groups:
  [sync.md › Player groups](spec/sync.md#player-groups).
- **The subject's cards: the fish beta invitation**: [subjects.md › The subject's card](spec/subjects.md#the-subjects-card).
- **Sea slugs**: [seaslugs.md](spec/seaslugs.md).
- **Fish players get**: [fish-game.md](spec/fish-game.md#fish-players-get), the circles and the gate, the winks.
- **Fish scientific genera**: [fish-game.md](spec/fish-game.md#fish-scientific-genera).
- **Fish species, step 1: by common name**: its **Units**, **Opening**, **Display and typing**, **Score and gate** and
  **Rest**: [fish-game.md](spec/fish-game.md#fish-species-step-1-by-common-name).
- **Species by scientific name (step 2)**, fish and sea slugs: its **Units**, **The class**, **Opening**, **Display**,
  **Typed answers and Q394**, **Score and gate** and **Rest**: [fish-game.md](spec/fish-game.md#species-by-scientific-name-step-2).
- **Fish global score**: [fish-game.md](spec/fish-game.md#the-fish-global-score).
- **Fish sheets**: [fish-sheets.md](spec/fish-sheets.md).

## Names, storage keys and caches

<!-- rename-app: keep-begin -->
**What it is.** The app's name (**The app's name**: IMR Reef ID, from `core.js` `ORG`, applied to the static files by
**`tools/rename_app.py`**), the names of what it keeps on a device (**Storage keys**: `reefid-sync-*` travel with the
player, `reefid-*` stay on the device, `core.js` `KEYS`) and of its caches (**Caches**: `reefid-shell-vN`,
`reefid-admin-files`, `imr-photos-v1`), and the moves of data written under older names (**Migration on a device**,
**The Coral ID Key rename**, **The URL refonte's data move**, **Migration in the sheet**).

**Where the details live.** [spec/storage.md](spec/storage.md); the caches' behaviour in
[spec/service-worker.md](spec/service-worker.md).
<!-- rename-app: keep-end -->

## Data files

**What it is.** The JSON files at the root of the repository are the data players' pages load: the coral content
(`data.json`), Pierre's choices (`curation.json`, written only by the admin's Publish), the quality, forms and picks
files, and the fish and sea-slug content and game photo lists. What only the tools and the admin read lives in `data/`
(Q265; it is published, the admin fetches it): the candidate lists, the suggestions of the judging passes, excluded
photos, presence, names, points, metrics and the measured block. A built file is its sources
plus the instance's layer; the content editor's edits and Pierre's curation are laid over it when it is read.

**Main files.** [DATA.md](DATA.md), the table of every data file with its writer and its readers; `tools/datajson.py`
(the one writer of `data.json` and `data/cand.json`), `tools/build_fish.py` (`fish.json`), `tools/fetch_local.py`,
`tools/fetch_fish.py` and `tools/fetch_fishbase.py` (the candidates), `tools/fish_game.py` (`fish-game.json`,
`fish-photos.json`), `tools/instance.py` and `tools/instance.json` (the instance); in the app and the admin, `core.js`
(`applyCuration`, `contentApply`, `treeGen`, `treePhotos`, `rightsClass`), `presence.js` and `autosort.js`.

**How it connects.** The app, the admin and the sheet script read the same files (the sheet script from `main` on
GitHub, for its replay: Progress sync). The admin's Publish writes `curation.json`, and the Candidate photos workflow
that follows it downloads the photos in play to R2 and commits the photo lists ("Photos"). Rule C8 (presence), the
photo rules P1-P6 ([rules/photos.md](rules/photos.md)), A1 ([rules/admin.md](rules/admin.md)) and S1-S3
([rules/subjects.md](rules/subjects.md)) govern them.

**Where the details live.** [spec/data.md](spec/data.md), the coral data files, the curation, the suggestion files,
the photo rights and licences and the instance; [spec/content.md](spec/content.md), the content editor's edits;
[spec/fish.md](spec/fish.md), the fish content; [spec/fish-photos.md](spec/fish-photos.md), the fish photos from source
to game.

- **`data.json` (served source of truth)**, its layout and records, **The plain sentence**, **Name roots**:
  [data.md › `data.json`](spec/data.md#datajson-the-served-source-of-truth).
- **`curation.json` (Pierre-owned; never overwrite in a PR)**: [data.md](spec/data.md#curationjson-pierres-choices).
- **Suggestion files** and their precedence: [data.md](spec/data.md#suggestion-files).
- **The calibration set** (`calibration-set.json`): [data.md](spec/data.md#the-calibration-set-calibration-setjson).
- **Presence of coral species**, **Share-alike coral photos**:
  [data.md](spec/data.md#presence-of-coral-species-presencejson), [share-alike](spec/data.md#share-alike-coral-photos).
- **Photo rights tie-break**, the rights facet, **The licence refresh**: [data.md › Photo rights](spec/data.md#photo-rights).
- **The instance's centre**, **The instance's layer** (its **`fish.json`** and **`coral.json`**, the **Checks**, what is
  **Not in the layer yet**): [data.md › The instance](spec/data.md#the-instance).
- **The content editor's edits**: **Three layers**, **Slots**, **An entry**, **States**, **Draft and Publish**,
  **Sources reach the units too**, **The players' copy**, **Structure: circles and look-alike pairs**,
  **The corals' structure: look-alike pairs only**, and the sea slugs': [content.md](spec/content.md).
- **Fish content**: **Files**, **Two trees**, **The game's units: families, genera, species**, **Circles**,
  **Names: EventMeasure / PDF first, WoRMS as an indication**, **Presence: confirmed**, **Species**,
  **Curated common names**, **The name index**, **Commonness**, **Identification groups: the regional key**,
  **Starter core and judged photos**, **Rebuild**: [fish.md](spec/fish.md).
- **Pierre's choices per family in the app**, **The default cover of a node with leaves**:
  [fish.md › Covers](spec/fish.md#covers).
- **Fish photos (the sources and the area rule)**: **Sources**, **Rules**, **The area**, **On the way to the game**:
  [fish-photos.md](spec/fish-photos.md#where-fish-photos-come-from-the-sources-and-the-area-rule).
- **Fish candidates**: **Fetch**, **Photo taxon**, **Automatic refill**, **FishBase**, **Reference photos**,
  **`data/fish-cand.json`**, **Curation**, **Pre-sort**, **One judgement per photo**, **Fish auto-sort**,
  **Fish Candidates**: [fish-photos.md](spec/fish-photos.md#candidates-from-inaturalist-toolsfetch_fishpy).
- **Curated game photos**, **The file's short form**:
  [fish-photos.md › The photos in play](spec/fish-photos.md#the-photos-in-play-fish-gamejson-toolsfish_gamepy).
- **Photos, stopgap** (retired; the first photos now): [fish-photos.md](spec/fish-photos.md#first-photos-fish-photosjson-photos).
- **Sheet-only photos**: [fish-photos.md](spec/fish-photos.md#sheet-only-photos-fish-photosjson-sheet).
- **The tiles**: [fish-photos.md](spec/fish-photos.md#the-tiles).

## Photos per context (`applySlots`, `CAP`)

Which coral photos the sheets, the games and the Coral ID Key show, per genus and view (`core.js` `applySlots`, `CAP`;
rules P1-P6, [rules/photos.md](rules/photos.md)): [spec/photos.md › Photos per context](spec/photos.md#photos-per-context-applyslots-cap).
**Order**, **Sheet**, **Games**, **The card's photo**, **Coral ID Key**: there. The fish choose theirs in [spec/fish-photos.md](spec/fish-photos.md).

## Photos

**What it is.** Every photo the site shows: WebP files in four sizes, served from a Cloudflare R2 bucket, with the
photo's online original (iNaturalist, FishBase) or the site's `img/` as the fallback; the coral photo sources; the
Candidate photos workflow that downloads what Pierre adds and refills the candidate lists.

**Main files.** `core.js` `PHOTO_BASE`, `photoRetry`, `photoOnline`; `app.js` `photoFail`, `cropWatch`, `turnSet` (and
the admin's own); `tools/photos.py`, `tools/r2_sync.sh`, `tools/fetch_approved.py`, `tools/fetch_local.py`,
`tools/excluded.py`; `.github/workflows/approved-photos.yml` and `photos-r2.yml`.

**How it connects.** The photo records are in the data files ("Data files"); Pierre's Publish of `curation.json` ("Admin
back-office") starts the Candidate photos workflow, whose commit starts the deploy ("Run and deploy"); the app picks a
photo's size by its box and the line ([spec/loading.md](spec/loading.md)); the service worker keeps them offline. Rules
P1-P6 ([rules/photos.md](rules/photos.md)) govern them.

**Where the details live.** [spec/photos.md](spec/photos.md); the fish photos in
[spec/fish-photos.md](spec/fish-photos.md).

- **Served from Cloudflare R2**, the **Fallback** to the online original, **Crops**, **Rotations**:
  [photos.md › Served from Cloudflare R2](spec/photos.md#served-from-cloudflare-r2).
- **Where the files are**, the four sizes (**WebP, four sizes**): [photos.md](spec/photos.md#where-the-files-are);
  uploading to R2: [photos.md](spec/photos.md#uploading-to-r2).
- **Sources** of the coral photos: [photos.md](spec/photos.md#coral-photo-sources).
- **New candidates are not stored**, the Candidate photos workflow, the **Key-only genus** cap:
  [photos.md](spec/photos.md#the-candidate-photos-workflow).
- **Excluded photos** (`tools/excluded.py`, `data/excluded.json`, the admin's **Put back**): [photos.md](spec/photos.md#excluded-photos).
- **Measured values** of each game photo (contrast, brightness, saturation, warm share, sharpness; `data/measured.json`,
  `tools/photo_measure.py`): [spec/measured.md](spec/measured.md).

## Admin back-office (`admin.html`)

**What it is.** Pierre's back-office, for token holders only: it curates every subject's photos and content, reads the
players' answers, reports and events from the sync sheet, and publishes his choices as `curation.json`. One admin for
every subject: four header groups (Inbox, Photos, Players, Analyses), one subject switch, every click a local draft that
reaches the site only with his Publish.

**Main files.** `admin.html` and `admin.css`; `admin.js` (the shell, routing, the draft, Publish, most pages);
`admin-draft.js` (the draft's IndexedDB store and the sign-out seal); `autosort.js` (the auto-sort and the fish photo
logic, pure); `taxtree.js` (the generic tree); `admin-fish.js`, `admin-coraltree.js`, `admin-content.js`,
`admin-covers.js`, `admin-light.js` (the Tree tab, the content editor's boxes, the proposals); `admin-journey.js`,
`admin-visits.js`, `admin-heatmap.js`, `admin-analyses.js` (players and analyses); `admin-taxa.js` (Photo stats › Taxa); `points.js` and `data/points.json` (the
points to handle); `admin-demo.js` (`?demo`). `analysis.js`, `admin-analyses.js` and `admin-demo.js` are
fetched when a page needs them (`lazyLoad`; [spec/admin.md](spec/admin.md) "What the first page waits for").

**How it connects.** It reads the site's data files and `curation.json` (Data files), the sync sheet with its admin token
(Progress sync), the judging files through the GitHub API; Publish commits `curation.json` to `main`, and the Candidate
photos workflow then downloads the photos in play (Photos). Each subject describes its admin part in `core.js`
`SUBJECTS`; the engine never names a subject. Rules A1-A5 ([rules/admin.md](rules/admin.md)) govern it.

**Where the details live.** [spec/admin.md](spec/admin.md), the shell: the header and addresses, the subject switch, the
pooled model, the draft and Publish, the conventions of every page; [spec/admin-photos.md](spec/admin-photos.md), the
photo pages; [spec/admin-tree.md](spec/admin-tree.md), the Tree tab and the generic tree;
[spec/admin-players.md](spec/admin-players.md), To do, Players and the live analyses. The stored analyses are "Analyses"
below.

- **Four header modes, each with its tabs**, **Addresses**, **Names**, **No page titles**, **Pages by hash**:
  [admin.md › The header](spec/admin.md#the-header-groups-tabs-and-views); the tabs and their views, each in its spec:
  - **To do**, **Points to handle**: [admin-players.md › Inbox › To do](spec/admin-players.md#inbox--to-do).
  - **Coverage**, **Coverage › Games**, **Coverage › Sheets & ID Key**:
    [admin-photos.md › Coverage](spec/admin-photos.md#coverage).
  - **Genus status**, **Needs**: [admin-photos.md › A genus's page](spec/admin-photos.md#a-genuss-page-in-the-tree).
  - **Tree** (the corals' genus pages included, the former Genera tab): [admin-tree.md](spec/admin-tree.md).
  - **Candidates**, **Auto-sort**: [admin-photos.md › Candidates](spec/admin-photos.md#candidates-the-corals),
    [the auto-sort](spec/admin-photos.md#the-auto-sort).
  - **Photo review**, **Growth form**, **Keys on Quality and Growth form**, **Photo rotation**:
    [admin-photos.md › Photo review](spec/admin-photos.md#photo-review),
    [the crop editor](spec/admin-photos.md#the-crop-editor-and-photo-rotation).
  - **Look-alikes**: [admin-photos.md › Look-alikes](spec/admin-photos.md#look-alikes).
  - **Photo stats**, **Photo stats › Overview**, **Photo stats › Taxa**: [admin-photos.md › Photo stats](spec/admin-photos.md#photo-stats).
  - **List**, **Out of the statistics**, **Groups**: [admin-players.md › Players](spec/admin-players.md#players).
  - **Activity**, **Recent sessions and who is playing now**, **A session unfolded**,
    **Activity over time and play hours**:
    [admin-players.md › Activity](spec/admin-players.md#activity-recent-sessions-and-who-is-playing-now).
  - **Visits**: [admin-players.md › Visits](spec/admin-players.md#visits).
  - **Overview**, **Speed**, **Difficulty**, **Learning**: the Analyses tabs, "Analyses" below; the views read live:
    [admin-players.md › Live analyses](spec/admin-players.md#live-analyses-from-the-answer-log).
- **One subject switch**: [admin.md](spec/admin.md#one-subject-switch); **The tree subjects**:
  [admin.md](spec/admin.md#the-tree-subjects).
- **Admin for every subject** (the pooled model), **One filter bar**:
  [admin.md](spec/admin.md#admin-for-every-subject-the-pooled-model).
- **Every click is a local draft**, **Sign out**, **Key-by-key merge**, **Publish**:
  [admin.md › The draft](spec/admin.md#the-draft), [Publish](spec/admin.md#publish).
- **Sheet reads**, **Performance**: [admin.md › Reading the sheet](spec/admin.md#reading-the-sheet-and-speed).
- **Difficulty in words**, **Admin tables never scroll sideways for one long cell**, **Every account counts**,
  **Enlarged photo**: [admin.md › Conventions of every page](spec/admin.md#conventions-of-every-page).
- **Health**, **Confusions**, **Heatmap**: [admin-players.md › Live analyses](spec/admin-players.md#health-and-stops),
  [Pairs](spec/admin-players.md#confusions-analyses--difficulty--pairs), [Heatmap](spec/admin-players.md#heatmap).
- **The generic tree**: [admin-tree.md](spec/admin-tree.md#the-generic-tree-taxtreejs); **the builds' tree section**, each
  subject's classifications as `data/<subject>-tree.json`: [admin-tree.md](spec/admin-tree.md#the-tree-section-toolstree_sectionpy).

## Analyses

**What it is.** The admin's Analyses group: multifactor reports of each subject's answer log (what makes an answer
right, fast or a mix-up, how players learn), fitted by a GitHub Action every 1000 answers of the subject and stored in
the sync sheet; the admin only draws them, in plain words and charts, and can recompute them in its own tab.

**Main files.** `analysis.js` (the models, the report, the plain reading; browser, Web Worker and Node); `tools/analyses.js`
and `.github/workflows/analyses.yml` (the hourly fit); `admin-analyses.js` (the views); `Code.gs` `analyses_` (the
stored report).

**How it connects.** It reads the answer log of the sheet with the admin token (`ANALYSES_ADMIN_TOKEN`, "Progress sync")
and the photo features of the data files ("Data files"); the admin shows it on each subject's side of the switch ("Admin
back-office"). Rules A2, A4 and A5 ([rules/admin.md](rules/admin.md)) govern its views; the methods are
[spec/analyses-method.md](spec/analyses-method.md).

**Where the details live.** [spec/analyses.md](spec/analyses.md); the methods and their validation:
[spec/analyses-method.md](spec/analyses-method.md); the views read live from the answer log in
[spec/admin-players.md](spec/admin-players.md#live-analyses-from-the-answer-log).

- **One report per subject**: [analyses.md](spec/analyses.md#one-report-per-subject).
- **Where it computes**: [analyses.md](spec/analyses.md#where-it-computes).
- **Milestones**: [analyses.md](spec/analyses.md#milestones).
- **The report**, its format: [analyses.md](spec/analyses.md#the-report).
- **Sheet v35**, the sheet's endpoints: [analyses.md](spec/analyses.md#the-sheets-endpoints).
- **The admin**, its views, **The plain reading**, **Visual first**, **Recompute here**:
  [analyses.md › The admin's views](spec/analyses.md#the-admins-views-admin-analysesjs).
- **The module** (`analysis.js`): [analyses.md](spec/analyses.md#the-module-analysisjs).
- **Demo**: [analyses.md](spec/analyses.md#demo-adminhtmldemo).

## Progress sync (Google Sheet)

**What it is.** A player's progress and answers live on the device and, once signed in (a name and a 4-digit code, no
Google account), in a Google Sheet behind an Apps Script web app, the sheet script. Every answer is logged there; the
progress is merged across a player's devices and recalculated from the answer log whenever the progress rules change;
the same script serves the pooled photo statistics, the leaderboard, the admin's reads, the players' reports and events,
rights, live games and player groups (which carry an instance's rights), and updates itself from GitHub.

**Main files.** `sync.js` (signing in, saving and loading, the three-way merge, adopting a replay, the events queue);
`core.js` (the shared engine: merges, `replayProgress`, the formats stored, `SUBJECTS`; joined from its parts,
`core/*.js`, and embedded in the sheet script by `tools/sync_core.py`); [`tools/sync/Code.gs`](../tools/sync/Code.gs) (the script: `doGet` / `doPost`, `replay_`,
`hold_`, `stats_` and its fold, `board_`, `autoUpdate`); `progress.js` and `quiz.js` (the cards that tell a player about
a change, the prompts at a break); `app.js` `SYNC_URL`.

**How it connects.** The front end calls `sync.js` after each answer and at start-up; `core.js` runs the same rules on
the device and in the script, so a replay on the sheet gives what the game scored; the admin reads the sheet with its
token (Admin back-office, Analyses); the data files the replay needs (`data.json`, `fish.json`, `seaslug.json`,
`curation.json`) are read from GitHub; the self-update installs `Code.gs` from the `release` branch the merge train moves.
Rules D1-D9 ([rules/sheet.md](rules/sheet.md)) govern it, [SECURITY.md](SECURITY.md) says what it exposes.

**Where the details live.** [spec/sync.md](spec/sync.md), the specification of the sync and the sheet script, and
[spec/cards.md](spec/cards.md), the cards and prompts around a game; the script's versions in
[tools/sync/HISTORY.md](../tools/sync/HISTORY.md).

- **Signing in**, **A known name asks first**, **Reserved names**, **Sign out clears the device's progress**:
  [sync.md › Accounts and signing in](spec/sync.md#accounts-and-signing-in).
- **The gate floor** and the version gates: [sync.md › Version gates and the floor](spec/sync.md#version-gates-and-the-floor).
- **Sheet tabs**, **`Answers` columns**, **Every subject's answers, at any rank**, **Surprise cards' answers**, **Answer
  time and enlargement**: [sync.md › The sheet](spec/sync.md#the-sheet).
- **Endpoints**: [sync.md › Requests](spec/sync.md#requests).
- **Devices on one account**, **Lighter saves on slow lines**, **A save that fails**:
  [sync.md › Saving and loading](spec/sync.md#saving-and-loading).
- **One-time notices after the first sync**: [sync.md](spec/sync.md#one-time-notices-after-the-first-sync).
- **Opening hold synced**: [sync.md › The opening hold](spec/sync.md#the-opening-hold).
- **Full replay**, **Other subjects' replays**, **Under the content editor's structure**, **The leaderboard's tree**,
  **The corals too**: [sync.md › Full replay](spec/sync.md#full-replay).
- **The leaderboard follows the rules**: [sync.md](spec/sync.md#the-leaderboard-follows-the-rules).
- **Pooled stats built incrementally**: [sync.md › Pooled photo statistics](spec/sync.md#pooled-photo-statistics).
- **Pages opened**, **First page from Home**: [sync.md › Events and pages](spec/sync.md#events-and-pages).
- **`Timings` tab**: [sync.md › The Timings tab](spec/sync.md#the-timings-tab).
- **Rights and the Audit tab**, **Live games**, **Player groups**: [sync.md](spec/sync.md#rights-and-the-audit-tab),
  [live](spec/sync.md#live-games), [groups](spec/sync.md#player-groups).
- **Backup to pCloud**: [sync.md](spec/sync.md#backup-to-pcloud); restoring: [BACKUP.md](BACKUP.md).
- **Versioning and deploy**: [sync.md](spec/sync.md#versioning-and-deploy).
- **Tests** of the sync: [sync.md › Tests](spec/sync.md#tests).
- **Every card comes from one builder**, **Out-of-game prompts spaced out**: [cards.md](spec/cards.md#one-card-builder).
- **Welcome tour**, **The subject to start with**: [cards.md › The welcome tour](spec/cards.md#the-welcome-tour).
- **First-launch question**, **One per subject**, **Fallback card**:
  [cards.md › The first-launch question](spec/cards.md#the-first-launch-question).
- **Progress recalculated for everyone, and new game modes announced**, **The apology card**:
  [cards.md › Notes about a change](spec/cards.md#notes-about-a-change).
- **Enlarging a photo made visible**: [cards.md › The enlarge hint](spec/cards.md#the-enlarge-hint).
- **One-tap questions**: [cards.md](spec/cards.md#one-tap-questions).
- **"Did you know?" tips**: [cards.md](spec/cards.md#did-you-know-tips).
- **The Duel tab's relief card**: [cards.md](spec/cards.md#the-duel-tabs-relief-card).
- **The custom quiz's reminder of the units waiting in the Quiz**:
  [cards.md](spec/cards.md#the-custom-quizs-reminder-of-the-units-waiting-in-the-quiz).

## Security model

What is public and what protects what: [spec/site.md › Security model](spec/site.md#security-model) for the site and the
admin page; [SECURITY.md](SECURITY.md) for abuse (bots, floods), the sheet script's protections and the Candidate photos
workflow's push to `main`. **Everything in the repo is public**; **The GitHub token is the real key** (and the CSP:
rule U5); **Templates** (`esc()`, `safeUrl()`); **Sync sheet**; **GitHub Action**; **Photos to R2**
([spec/photos.md › Uploading to R2](spec/photos.md#uploading-to-r2)).

## Tools (`tools/`)

**What it is.** The scripts that build and check the data files, build the site at deploy, run the merge train and the
sheet script's versions, watch the infrastructure and check a learning change: Python 3 and Node, run from the
repository root, by hand or by the workflows.

**Main files.** [tools/README.md](../tools/README.md), the index: each script in one line, in groups, and the conventions
every tool follows; `tools/archive/`, the first build's scripts, which cannot run again.

**How it connects.** The data tools write the data files ("Data files"; [DATA.md](DATA.md) says which tool writes which
file), `data.json` only through `datajson.py` (rule W16), iNaturalist and WoRMS only through `inat.py` (rule C7); the
photo tools feed the Candidate photos workflow and R2 ("Photos"); `build_site.py` builds the deploy ("Run and deploy");
`sync_core.py` and `sheet_version.py` keep the sheet script ("Progress sync"); the learning tools check a change to the
model (rule L11, [LEARNING.md](LEARNING.md)).

**Where the details live.** [spec/tools.md](spec/tools.md), each script's inputs, outputs, options and tests, in the
README's groups; the build at deploy and the health check in [PAGES.md](PAGES.md).

## Reference material (outside the repo)

- IMR Lecture 6 (2026_L6_CoralID.pptx) and a Google Slides copy, plus the Coral Finder 2022 PDF, are on Pierre's Google Drive (IMR folder). Slide text and presenter notes were extracted into `data.json` (`imr`, `mn`, `sl`).
- Pierre's iNaturalist: user `ppericard`, coral taxon 47532.

## Run and deploy

**What it is.** Running the site locally (a plain static server; a local copy never writes to the sheet), the tests, and
the way `main` reaches GitHub Pages: every push to `main` deploys, the admin's Publish and the Candidate photos
workflow's commits included, through a build of a staged copy that is played before it goes live.

**Main files.** `.github/workflows/pages.yml` (Deploy Pages), `checks.yml`, `smokes.yml`; `tools/build_site.py`,
`tools/check_json.py`; `.gitattributes`.

**Where the details live.** [spec/deploy.md](spec/deploy.md): **Run** locally, **Deploy**, the **Tests** and the
repository's attributes (`.gitattributes`); every workflow, the build at deploy and the recovery of a stuck deployment:
[PAGES.md](PAGES.md); the tools: "Tools".

## Players' reports

**What it is.** "⚑ Report a problem" in every game, on an enlarged photo and a sheet, and "Send feedback" in every page's
? help: a small dialog whose report reaches the sheet and the admin's To do, where Pierre gives it a status (Done thanks
the player) and has the tools of its unit and photos at hand. His own ⚑ flags on photos are separate and admin-only.

**Main files.** `sync.js` (`repBtn`, `reportDialog`, `sendReports`), `reports.js` (the admin's list and statuses),
`admin.js` (the photo tiles), `flag.js`; the sheet's Reports tab ("Progress sync").

**Where the details live.** [spec/player-reports.md](spec/player-reports.md): sending a report,
**One action bar on every report**, **The list follows the subject switch**, Pierre's flags; To do in
[spec/admin-players.md](spec/admin-players.md#inbox--to-do).
