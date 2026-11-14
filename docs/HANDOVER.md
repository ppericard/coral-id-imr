# Handover: picking up IMR Reef ID in a new Claude account

Written 2026-11-01 when Pierre moved development to another Claude Code account. If you pick the project up cold, read "Where things are" below, then [`STATUS.md`](STATUS.md): where things stand now. Until then the project ran in a Claude "project" with a shared memory, many parallel threads and private claude.ai docs. **None of that is reachable from the new account.** Everything that mattered has been copied into this repository; this file is the map.

## Read in this order (15 minutes)

1. [`AGENTS.md`](../AGENTS.md): the constitution: who the app is for, Rule 0, the merge contract, the index of Pierre's
   rules; then the [`rules/`](rules/) file your task touches (its "Read on demand" table).
2. This file: where things are, where external things live, the one-time setups only Pierre can do.
3. [`STATUS.md`](STATUS.md): where things stand (tracks in flight, the integrator's queue), the open questions for Pierre, what only he can do. `python3 tools/brief.py` adds what can be computed (open PRs, branches without a PR, the sheet script's version).
4. [`ROADMAP.md`](ROADMAP.md): the prioritised backlog, declined ideas; the points to settle (content questions, questions for an IMR trainer) are in [`points.json`](../points.json), shown in the admin (To do › Points).
5. [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DESIGN.md`](DESIGN.md) when you touch code or UI.
6. [`reviews/`](reviews/README.md): the last expert reviews (code, admin, first-time RA, design) with what is still open.

## Where things are (for a newcomer)

| You want | Look at |
|---|---|
| The rules you must not break | [`AGENTS.md`](../AGENTS.md): Rule 0 (Pierre's hours, Manila time), the merge contract, the index of the rules (IDs C, P, L, U, A, S, D, W); each rule in full in [`rules/`](rules/) |
| The app's code | `index.html` + `app.js` (start-up, routing, shared helpers), `quiz.js` (screens), `model.js` (what to ask next), `learn.js`, `progress.js`, `home.js`, `tour.js`, `tips.js`, `sync.js` (the sheet), `core.js` (pure functions shared with the admin and the sheet), `sw.js` (offline cache); "Repository map" below |
| How the learning works, and why | [`LEARNING.md`](LEARNING.md) (each rule with its measurements; `tools/learnsim.js` simulates, `tools/abilityeval.js` replays the real answers) |
| The subjects (corals, fish) | `core.js` `SUBJECTS`, `app.js` `UNITS`; fish content `fish.json` (built by `tools/build_fish.py`), the fish path spec [`FISH_PATH.md`](FISH_PATH.md), ARCHITECTURE.md "Subjects" and "Fish content" |
| The admin | `admin.html`, `admin*.js`, `autosort.js`, `analysis.js`; try it with `admin.html?demo`; ARCHITECTURE.md "Admin" and ROADMAP "Admin for every subject" |
| The progress sheet | `tools/sync/Code.gs` (self-updating Apps Script; "Code.gs" below), its tests `tests/sync.test.js` on an in-memory sheet (`tests/gas.js`) |
| Photos | `data.json` photo lists, `curation.json` (Pierre's choices), `img/` mirrored to Cloudflare R2 (`core.js` `PHOTO_BASE`), the tools in `tools/` (ARCHITECTURE.md "Photos") |
| Tests and CI | `tests/*.test.js` (Node), `tests/*.smoke.js` (Playwright, one CI job each), `.github/workflows/checks.yml` and `smokes.yml` (skipped for a docs-only PR); rules W12, W14 ([`rules/ship.md`](rules/ship.md)) |
| Merging several PRs at once | the merge train, `python3 tools/train.py` (rule W26; [INTEGRATOR.md](INTEGRATOR.md) "The merge mechanics") |
| Deploy | `.github/workflows/pages.yml` (stamps the version numbers, then publishes), [`PAGES.md`](PAGES.md) |
| Where things stand, what waits on Pierre | [`STATUS.md`](STATUS.md) (the integrator's only); `python3 tools/brief.py` |
| What is next, what was declined | [`ROADMAP.md`](ROADMAP.md): ideas discussed but not built yet, declined ideas; points to settle (content questions, IMR trainer questions): [`points.json`](../points.json), admin To do › Points |
| Photo judging by an outside agent | `judging/`: [`judging/BRIEF.md`](../judging/BRIEF.md) is the brief for an agent that only judges photos (growth form, quality, view…), not for coding agents; `judging/PROMPT.md` what to paste |

## Where decisions live

- **[`AGENTS.md`](../AGENTS.md) and [`rules/`](rules/)**: the standing rules; keep them current when Pierre states a new lasting rule (rule W19).
- **[`STATUS.md`](STATUS.md)**: where things stand, the open questions for Pierre and the last question number, his pending actions, ideas parked after hours, the last stop. The integrator's only.
- **[`ROADMAP.md`](ROADMAP.md)**: deferred ideas. **[`points.json`](../points.json)**: long-standing content questions, questions for an IMR trainer and other points to settle (admin › To do › Points).
- **[`reviews/`](reviews/README.md)**: the last expert reviews, with what is still open.
- **Pull requests**: each PR description explains a decision; `git log` titles (squash merges ` (#N)`) are a good index.
- **Code comments**: most non-obvious behaviours are explained in a comment right above the code, often with the date and "Pierre" when it was his call.
- The original Claude project memory and the claude.ai design docs linked in ROADMAP.md are **not reachable** from the new account (handover 2026-11-01): their substance was copied into this repo. Anything that matters must be in this repo, not only in an agent's memory.

## State of play

In [`STATUS.md`](STATUS.md), written by the integrator only; the history is in `git log` and the PR descriptions.

## Pending actions for Pierre

In [`STATUS.md`](STATUS.md) "Pierre's hands"; the steps of the one-time setups are below ("Protect main", "Clean merged branches", "Analyses report").

## Questions for an IMR trainer

In the admin, Inbox › To do › Points (from [`points.json`](../points.json), with the content questions for Pierre; since 2026-11-05). Never settle them in the app; keep the lecture's version (rules C1, C5).

## Setting up to work, and what lives outside GitHub

Nothing needs rebuilding: the site is served by GitHub Pages from `main` through `pages.yml`, so a merged PR triggers deployment. The Pages source must be GitHub Actions; see [PAGES.md](PAGES.md) for the workflows and recovery. There is no build step and no package manager. What a new agent needs is a working copy; the only pieces outside GitHub are the Google Sheet + Apps Script (progress sync) and Pierre's admin token, recreated only if they are ever lost.

**Working copy (any machine or cloud container):**
1. Clone `https://github.com/ppericard/coral-id-imr` (public). **A clone or worktree made before 2026-11-08 16:20 Manila never pushes** (the history was rewritten then: its commits would bring the old photos back): clone again. Python 3 (CI: 3.15), Node (CI: 26, the current LTS) and Playwright 1.64.1 with its Chromium are all you need (the versions CI pins: `.github/workflows/checks.yml`).
2. Serve: `python3 -m http.server 8000`, open <http://localhost:8000> (app) and <http://localhost:8000/admin.html?demo> (admin without a token, every page on made-up data, nothing sent; `?readonly` shows the real curation instead). Sync and photo Elo talk to the live Apps Script even locally (read-only unless you sign in).
3. Check: `node tests/run.js` (the unit tests, in the machine slot: rule W24), `node tests/pages.smoke.js`, `node tests/draw.smoke.js`, `node tests/admin.smoke.js` (Playwright; never add a `package.json`), `python3 tools/check_versions.py` (consistency only: the deploy stamps the version numbers, the integrator assigns the sheet's `VERSION` at merge).
4. Network: iNaturalist hosts (listed under "External resources") for photo scripts; GitHub for PRs. Python scripts need Pillow for photo work: `pip install --require-hashes -r tools/requirements.txt` (the version and file hashes CI pins).

**Hosting settings (already in place; only if the repo ever moves):**
1. GitHub Pages: Settings > Pages > Source **GitHub Actions**, with `pages.yml` as the single deployer. It replaced the original branch `main` / root source on 2026-11-01 ([PAGES.md](PAGES.md)); the setting is outside git. `.nojekyll` remains committed. If the site stops updating with "Please cancel <sha> first" (a known GitHub Pages glitch, hit several times on 2026-11-01), follow PAGES.md > Manual recovery.
2. Actions: `.github/workflows/pages.yml` (push to `main`, manual dispatch, and Candidate photos completion), `.github/workflows/checks.yml` and `smokes.yml` (PR checks, and a merge train's push) and `approved-photos.yml` (after a push changing `curation.json` or the fish judgements; needs Settings > Actions > Workflow permissions "Read and write"); every workflow and what it commits: [PAGES.md](PAGES.md) "Workflow inventory and triggers".
3. Admin writes: a fine-grained GitHub token, this repository only, Contents read and write, 90-day expiry; the admin lock screen links to the token page and stores it encrypted with a password of Pierre's choice. Changing the repo name or owner means updating `REPO` in `admin.js` and in `tools/sync/Code.gs` (the admins' token check), then redeploying the script.

**Progress sync (outside GitHub; only if the Sheet or script is ever lost):**
1. New Google Sheet > Extensions > Apps Script > paste [`tools/sync/Code.gs`](../tools/sync/Code.gs) > save.
2. Project Settings > Script Properties: add `ANON_SALT` = any long random string (keeps anonymous player ids unguessable; never commit it).
3. Deploy > New deployment > type **Web app**, Execute as **Me**, Who has access **Anyone** > Deploy, accept the permissions. Run once in the editor a function that calls `UrlFetchApp` (see "Code.gs" below) so the admins' GitHub token check works.
4. Put the `/exec` URL in `SYNC_URL` in `app.js`. The tabs (`RAs`, `Answers`, `Activity`, `By genus`, `Reports`, `Events`, `Pages`, `Alerts`, `Deploy log`, `Progress data`, `Replayed`, `Groups`, `Analyses`, `Removed`, `Timings`) are created on first use. Old progress lives in the old Sheet only.

**Content (`data.json`):** the original build scripts read a scratchpad that no longer exists (`tools/archive/`). `data.json` is the source of truth: edit it directly or through a small re-runnable `tools/apply_*.py` script, and write it with `tools/datajson.py` (one genus per line; the PR check fails on any other layout). The lecture text came from the Google Slides copy of Lecture 6 (Slides API, incl. presenter notes); photos from the lecture deck media, Pierre's iNaturalist and other iNaturalist observers (see ARCHITECTURE.md "Photos" and "Tools"). **The lecture photos' rights are uncertain** (Pierre, 2026-11-04): many are not IMR's own (from iNaturalist or the web without a proper source); they stay preferred for corals but are to be traced to their original and credited or replaced (ROADMAP, rule P1). The IMR fish presentation's photos are mostly not IMR's own either (likely from ID books): fish never use them.

## Working with Pierre

Pierre Pericard (GitHub `ppericard`), Research Fellow at IMR (Institute for Marine Research, Dauin, Philippines) since early October 2026. He builds this to learn the IMR genera himself and to train the RAs.

How to work with him is in [`AGENTS.md`](../AGENTS.md) (Rule 0, "Working mode": the merge contract and the questions) and [`rules/ship.md`](rules/ship.md) W1-W11 (French in chat, English everywhere else; fix by default; how he judges UX). One more thing: his Google interface is in **French**: give Apps Script steps with the French menu names (below).

## Repository map

| Path | What |
|---|---|
| `index.html`, `app.js`, `app.css` | The public app: start-up, routing, settings, shared helpers (photos, ID tips, glossary, key helpers, progress state). Its parts are classic scripts sharing one global scope, loaded in tiers by the inline loader of `index.html` (load order, ARCHITECTURE.md "Speed on poor connections"): `sync.js` with Home (tier 1, `window.BOOT`, which `app.js` waits for before its first page), then in tier 2 `model.js`, `tips.js`, `quiz.js`, `learn.js` and `progress.js` (the games, Learn, My progress), then the Tools (`flag.js`, the Lab). A page waits for its tier (`pageTier`, `need`); code that can run before a later tier is in checks for it (`prog()` for the header pill, `typeof achAfter`). |
| `learn.js` | The Learn pages, split out of `app.js` (2026-11-02): Genera (`viewGenera`), a genus sheet (`viewGenus`, `myProg`), Look-alikes (`viewLookalikes`, montages, `classics`, `pairs`) and Compare (`viewCompare`). |
| `quiz.js` | The quiz screens, split out of `app.js` (2026-11-02): the question (`question`, `trail`, the hint), the stage fitted to the screen (`fitStage`, `fitTiles`, `fitLow`), the answer and its feedback (`answer`), the one-tap question (`pulseAsk`), the bonus genera offer (`bonusOfferShow`), the next question planned and preloaded (`planNext`, `NEXTQ`), the photo quiz (`quizPhoto`), the custom quiz on the genera the player picks (`quizCustom`, `viewCustom`; its draw `model.js` `customDraw`, `customChoices`) and duels (`quizDuel`). Loaded in tier 2, after `model.js` and `tips.js`. |
| `model.js` | The learning model, split out of `app.js` (2026-11-02): next genus (`weighted`, `drawW`; opening `OPEN`, `openChance`, `openPick`), photos (`photoSet`, `PICKD`, `CAL`), photo difficulty (`photoDiff`, `PSTAT`), ability (`ELO`, `abilityStep`), progress (`pgWeight`, `knownP`; `core.js` `PROG`), the mastery exam (`EXAM`), wrong choices (`TRAP`, `distractors`, `pooledConf`). Rules and research: `docs/LEARNING.md`. Loaded first in tier 2. |
| `tips.js` | "Did you know?" tips (the owner, 2026-11-04): the registry `TIPS` and its pure rules (`tipDue`, per-device counters `reefid-tips`), tested in `tests/tips.test.js`; `quiz.js` shows them at the break at Next (`tipAfter`, `tipShow`, `breakArm`). Loaded in tier 2 before `quiz.js`. A new tip is one registry entry (ROADMAP candidates). |
| `progress.js` | My progress (`quizBoard`), the progress pill (`showProg`), the progress backup (`bindProgFile`), the public leaderboard (`viewBoard`, `loadBoard`, ⚙ Leaderboard) and achievements (`ACH`, `achCheck`, `achPop`, `viewAch`), split out of `app.js` (2026-11-02). Loaded last in tier 2, after `learn.js`. |
| `sync.js` | The link with the sync sheet, split out of `app.js` (code review L1, 2026-11-02): signed-in progress (`syncPush`, `syncPull`), photo statistics (`loadStats`), players' reports (`reportDialog`), answers of players not signed in (`sendAnon`), the app's own error reports and one-tap answers (`ev`, `pulse`), the pages opened in a visit (`pagesRoute`, `pagesSend`, sheet v30), signing in (`signIn`, `bindSync`). A classic script loaded right after `app.js`, with Home (it shares its top-level names); `app.js` waits for it (`window.BOOT`) before its first page. Required like `app.js` (the loader tries it 3 times, the service worker keeps it); the state the pages read (`SYNC_URL`, `LOCAL`, `SYNC`, `syncTrouble`) stays in `app.js`. |
| `core.js` | Pure functions shared by app, admin and the sync script (embedded in `Code.gs` by `tools/sync_core.py`), tested in `tests/`: the **subjects** (`SUBJECTS`, the taxon model: corals and fish on one engine, `subjKey`, `fishGen`; ARCHITECTURE.md "Subjects"; `app.js` `UNITS` reads each subject's data, `SUBJ` is the current one, `inSubject()` visits another; never name a subject in the engine), Pierre's curation and the photos per context (`applyCuration`, `applySlots`, `CAP`), curation merge (`merge3`, `mergeOld`), two-device progress merge (`mergeProgress`), photo Elo replay (`eloOf`, same rules as `Code.gs` `stats_`), the progress engine and its full replay of the answer log (`PROG`, `eloStep`, `replayProgress`, `replayedOf`) with its rules versions (`RVS`, `RV`). |
| `tools/rename_app.py` | The mechanical part of the rename to IMR Reef ID (visible name from `core.js` `ORG`, storage keys from `core.js` `LEGACY_KEYS`, shell cache name, CSP hashes), idempotent: re-run it after a rebase on a branch that still uses the old names (ARCHITECTURE.md "Names, storage keys and caches"). |
| `tests/` | `node tests/run.js` (every `*.test.js` under `node --test`, in the machine slot, rule W24): `core.js`, the sync script against an in-memory sheet (`gas.js`), and Pierre's photo rules on the real `data.json` + `curation.json` (`photos.test.js`: no several-corals or sheet-only photo in games, exclusions and hides applied, pins first, IMR/own first). Add a case there when you add a photo rule. `fish.smoke.js` plays the fish subject (draw from the fish slate only, circle opt-in, winks, typed names, progress kept apart from the corals'); `subjects.test.js` the registry and the fish adapter. `draw.smoke.js` runs the real `photoSet()` / `distractors()` in Chromium (one observation per question, no multi photo, Research Grade only for genera off the IMR list, traps as asked, Millepora in the slate, the bonus genera offer and opening): extend it when you change the question draw. |
| `home.js`, `home-art.js`, `home.css` | Home page; `home-art.js` draws the corallite schematic beside the glossary's anatomy link. |
| `tour.js` | First-visit guided tour (`?tour` forces it); its first step is the first-launch question (rule L10). |
| `flag.js` | ⚑ "bad photo" button, only in Pierre's admin browser (players report problems with `repBtn()`/`reportDialog()` in `sync.js`, read in admin To do). |
| `proto/` | Lab/Tools prototypes (`lab.js` hub + one file per tool); `idkey.js` is the graduated Coral ID Key. |
| `admin.html`, `admin.js`, `admin.css` | Pierre's back-office: 4 header modes (Inbox, Photos, Players, Analyses: `#modes` in `admin.html`), each with its tabs and their views (`GROUPS`, `navs()`; ARCHITECTURE.md "Admin back-office"). |
| `autosort.js` | Admin only: the auto-sort's pure rules (sure rule per field, the fish pre-sort's `fishSure`, 1-in-20 Checks, agreement and auto-off per field, retests, metric flags), tested in `tests/autosort.test.js` and `tests/fishphotos.test.js`; `admin.js` `autoRun` applies them to the draft (ARCHITECTURE.md "Auto-sort"). |
| `analysis.js`, `admin-analyses.js`, `tools/analyses.js` | The Analyses group (Pierre, 2026-11-04): `analysis.js` the model code (crossed random effects, explanatory IRT, verdicts, milestones; Node, browser and Web Worker; `tests/analysis*.test.js` recover known effects from synthetic data), `tools/analyses.js` the script the hourly GitHub Action `.github/workflows/analyses.yml` runs (reads the answer log with the admin token, refits every 1000 answers, stores the report in the sheet, sheet v35), `admin-analyses.js` draws it (ARCHITECTURE.md "Analyses"). |
| `admin-fish.js` | Admin: the fish pages of the admin plan (docs/ROADMAP.md "Admin for every subject"), so far the fish Candidates swiper (`#fish/photos/candidates`, `renderFishCand`; its pure rules in `autosort.js`: `fishQueue`, `fishAdd`, `fishReject`, `fishExclude`). Loaded after `admin.js`, whose helpers it uses. |
| `admin-journey.js` | Admin: one player's journey (`#players/list/journey/<name>`, opened from Players): progress, genera met over time, easiest / hardest for them, mix-ups, days; and the summary of one session unfolded on Players › Activity (`sessionSummary`, `sessionFacts`). Loaded after `admin.js`, whose helpers it uses. |
| `data.json` | All genus data and photo lists (the served source of truth). |
| `curation.json` | Pierre's choices, applied on top of `data.json` at load. Pierre-owned. |
| `fish.json`, `fish-photos.json`, `fish-game.json` | The fish subject's content: WoRMS reference tree + IMR teaching tree, built by `tools/build_fish.py` from `tools/fish_source.json` (ARCHITECTURE.md "Fish content"); its photos: `fish-game.json`, the photos Pierre put in play in the admin, hosted on R2 (written by `tools/fish_game.py` in the Candidate photos workflow), and the **stopgap** list of remote iNaturalist photos (`fish-photos.json`, `tools/fish_photos.py`), which an entry keeps beside its curated photos until it has 5 very easy ones (`core.js` `fishPhotos`). Read by the app through `core.js` `fishGen` when the subject is Fish. Each photo carries its judged ease `e` (`tools/fish_judge.py`, rubric `judging/FISH.md`): the first questions on an entry show only very easy ones (`model.js` `easyFirst`). Its `sheet` holds the sheet-only photos of species with no game photo (`use: 'ref'`, never in a game: `fishGen` keeps them out; ARCHITECTURE.md "Fish content"). |
| `fish-cand.json` | Fish candidate photos waiting for Pierre (admin only, like `cand.json`; curated in the admin's fish Candidates, `admin-fish.js`, admin plan PR 5a, docs/ROADMAP.md "Admin for every subject"), from `tools/fetch_fish.py` and `tools/fetch_fishbase.py` (FishBase, Pierre 2026-11-05: its underwater CC BY-NC photos, from its data snapshot, filling the room iNaturalist leaves; `rep` tags a reference photo, FishBase's main picture or the iNaturalist cover, one ease point easier when judged): iNaturalist, Pierre's own first, then CC0 / CC BY before CC BY-NC (never share-alike or ND), the Indo-West Pacific only abroad, poor photos kept on purpose, at most 20 observations per species; still remote, never committed as images; pre-sorted by `tools/judging_fish.py` (ARCHITECTURE.md "Fish candidates"). |
| `forms.json`, `quality.json`, `picks.json`, `dups.json`, `suggest.json`, `metrics.json` | Machine suggestions (growth forms, quality, featured picks, duplicates, judging results, objective photo metrics). |
| `img/` | The photos with no other backup (IMR lecture photos, page art; the Coral Finder book crops left on 2026-11-08, `tests/nobook.test.js`), WebP in four sizes: 1600 px, 960 px `-m`, 480 px `-s`, 240 px `-t` (`tools/photos.py`; every tool that writes photos uses its `save()`, CI checks each photo has all four). No Git LFS. Every photo with an online original (iNaturalist, Pierre's own iNaturalist photos, FishBase) lives on Cloudflare R2 only (Pierre, 2026-11-05; never commit one to `img/`: `photos.py --check` fails). The app reads all of them from R2 (`core.js` `PHOTO_BASE`, the one switch); when R2 fails, a photo with an online original falls back to it, the others to these files (`core.js` `photoAway`; ARCHITECTURE.md "Photos"). |
| `tools/` | Python build/import scripts; `tools/sync/Code.gs` is the Google Apps Script for progress sync; `tools/commonness.py` measures once how common each game genus is near Dauin (iNaturalist) into `data.json` `cm`, which the opening of genera uses (common first); `tools/learnsim.js` the learning-outcome simulation (`--learner field`, `--custom 8`: the field learner and the Custom-8 scenario); `tools/learnprof.js` its simulated players' profiles, both subjects (by lecture group, family, circle or commonness); `tools/ratedworld.js` its rated world (`--world rated`: synthetic, fully rated units, photos and players, the app's `model.js` and `core.js` in Node); `tools/learncmp.js` pairs two of its `--out` files against the guardrails of rule L11 (docs/LEARNING.md "Validating a learning change"); `tools/fieldeval.js` its field measures with paired intervals over the seeds, and the set-size check on the real answer log (read-only, counts only); `tools/realcheck.js` the app's estimates against the real answer log (a saved Answers tab, aggregates only); `tools/abilityeval.js` replays the real answer log (a read-only export) with the app's Elo and scores its next-answer predictions, rule by rule; `tools/rtprep.js` and `tools/rtdecomp.py` split the response time into player, genus and photo and test the genus and photo terms (docs/LEARNING.md "Response time: genus and photo"); `tools/fallbackeval.js` scores the first-launch question's fallback rule on learnsim's traces and the real log (read-only). |
| `judging/` | Package for an outside photo-judging agent. |
| `.github/workflows/pages.yml` | Single Pages deployer: main pushes, manual dispatch and Candidate photos completion; requires Actions source. Recovery: `docs/PAGES.md`. |
| `.github/workflows/approved-photos.yml` | Candidate photos: after a push changing `curation.json`, `suggest.json`, `tools/fish_judge.json`, `tools/fish_refs.json` or `tools/fish_game.py`: download the photos put in play and upload them to R2, refill the coral candidate lists and commit (`data.json`, `cand.json`, `excluded.json`, `fish-game.json`, `img/`); then refill the short fish species (`fish-cand.json`, `tools/fish_refill.json`) and mirror `img/` to R2. |
| `.github/workflows/photos-r2.yml`, `tools/r2_sync.sh` | Copy `img/` to the Cloudflare R2 bucket (rclone, checksums: only changed files go up; never deletes from the bucket) on a push that changes `img/`, or by hand, then check the bucket holds every R2-only photo; `tools/r2_sync.sh DIR` uploads the photos `tools/fetch_approved.py` downloaded (the Candidate photos Action). Secrets `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and variable `R2_BUCKET`, set by Pierre; without them the copy does nothing and an upload fails. |
| `.github/dependabot.yml` | Weekly check of the GitHub Actions and `tools/requirements.txt` versions, one grouped PR per ecosystem (rule W9). |

Details in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Code.gs (progress sync) and how to redeploy

- Code: [`tools/sync/Code.gs`](../tools/sync/Code.gs); details and version history in ARCHITECTURE.md "Progress sync". How to change it (one `tools/sync/changes/<branch>.md` in the PR, never `VERSION`: the integrator assigns it at merge with `tools/sheet_version.py --assign`; stay backward compatible; the version gate): rules D3-D5 ([`rules/sheet.md`](rules/sheet.md)).
- Live version check without writing: open `SYNC_URL?name=x&pin=ab` (`SYNC_URL` constant in `app.js`); the JSON reply carries `v`.
- **Self-update (from v11, Pierre 2026-11-01): ACTIVE** since Pierre's setup on 2026-11-01 (Cloud project "IMR Coral ID sync", consent screen published, "Self-update ready"; v11 verified live). After a one-time setup, every `Code.gs` merged to `main` with a higher `VERSION` goes live by itself within about 15 minutes; the Sheet's "Deploy log" tab lists each install. **One-time setup (Pierre, French UI, ~5 min):** (1) open <https://script.google.com/home/usersettings> and switch **API Google Apps Script** to **Activé**; (2) in the Sheet > **Extensions > Apps Script**: **Paramètres du projet** (gear) > tick **Afficher le fichier manifeste « appsscript.json » dans l'éditeur**; back in **Éditeur**, replace `appsscript.json` with <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/appsscript.json> and `Code.gs` with the raw link below, save; (3) in the function menu of the toolbar pick **installAutoUpdate** > **Exécuter** > accept the permissions (Google may say the app is unverified: **Paramètres avancés** > **Accéder à … (non sécurisé)**, it is his own script); (4) **Déployer > Gérer les déploiements > Modifier > Nouvelle version > Déployer** (the last manual deploy). Step (3) checks the Apps Script API at once and writes the result in the Sheet's **Deploy log** tab (and the editor's execution log): "Self-update ready" means done. **If it says "NOT ready"** (it did for Pierre on 2026-11-01: "Apps Script API has not been used in project 785247313569", the script's hidden default Cloud project, which cannot be opened; a standard Cloud project is needed): (a) <https://console.cloud.google.com> > new project (e.g. "IMR Coral ID sync"); (b) **API et services > Bibliothèque** > "Apps Script API" > **Activer**; (c) **Google Auth Platform / Écran de consentement OAuth** (<https://console.cloud.google.com/auth/overview>): app name, his address as support and contact e-mail, audience **Externe**; on **Branding**, *Application home page* `https://ppericard.github.io/coral-id-imr/`, *Application privacy policy link* `https://ppericard.github.io/coral-id-imr/privacy.html` and *Authorized domains* `ppericard.github.io` (Google greys out Publish without them), **Save**; then **Audience > Publier l'application** (**En production**): never leave it in test mode, where Google drops the authorisation after 7 days and the time trigger silently stops; for his own use no Google verification is needed (an "unverified app" warning, **Paramètres avancés > Accéder à…**); (d) copy the project **number** (Tableau de bord); (e) in Apps Script: **Paramètres du projet > Projet Google Cloud Platform (GCP) > Changer de projet** > paste the number > **Définir le projet**; (f) run **installAutoUpdate** again. If anything still fails, the manual steps below always work. An update interrupted half-way (code replaced, deployment not) is finished at the next run (`AUTO_PENDING`).
- **Manual deploy (before the setup, or if self-update fails).** Give Pierre this raw link to copy: <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs>. His steps (French UI): open the Google Sheet "IMR Coral ID – RA progress" > **Extensions > Apps Script** > select all of `Code.gs` and paste the new code > save (disk icon) > **Déployer > Gérer les déploiements** > pencil icon (**Modifier**) on the existing deployment > **Version : Nouvelle version** > **Déployer**. The URL stays the same. Then check `v` with the link above.
- A redeploy does **not** grant new permissions. If a new version uses a new Google service, Pierre must run, once in the editor, a function that calls it and accept the prompt (this is how `UrlFetchApp` was granted for v8: `function autoriser(){ UrlFetchApp.fetch("https://api.github.com"); }`).
- Never change the column layout of the `RAs` tab (positional); add tabs instead.
- Sheet id `1R-L_JqKz9eFF8jvnmPy2g12Zrpn__uWm1Y32kkMfQUE` (Pierre's Drive). Secret Script Property `ANON_SALT` (never in the repo).

## Admin workflow (what Pierre does, what you must not break)

Pierre curates photos in `admin.html`; every click is a browser draft; **Publish** merges the draft key by key onto the latest `curation.json` and commits it to `main` ("Photo curation: … (by ppericard)"); the GitHub Action `approved-photos.yml` then downloads approved candidates and refills candidate lists ("Candidate photos: …"). The rules (never change his curation, no bulk reset, one click with Undo, rebase before merging): A1, A2 ([`rules/admin.md`](rules/admin.md)), W18. Admin help sits behind "?" (tabs "This page" / "Start here").

## External resources

| What | Where |
|---|---|
| IMR reference material (Lecture 6 PPTX, slate photo) | Pierre's Google Drive, IMR folder `1gt0sv2YN4Og7-O_YCb3cVgvW94-CK6oG` (needs his Google sign-in). |
| Lecture 6 as Google Slides (read with the Slides API, incl. presenter notes) | Slides id `13msDDkJzPN6fRam-ezX_vl93osAd0Cw4rJ1aINOzveI`. Full-resolution deck media: Drive folder `1FDXDg3XvjXwML0KGxxtjMjVq2fU3jP8i`. **Full-resolution IMR photos** (Pierre, 2026-11-05): search the unzipped deck `2026_L6_CoralID/ppt/media` on his Drive, never the Slides, which were compressed on purpose. |
| Lecture text in the app | `data.json` `gen[g].imr` (verbatim slide text, review slides, presenter notes), `mn` mnemonics, `sl`/`rsl` slide numbers, `tools/lecture_more.tsv`, `tools/course_views.txt`. |
| Coral Finder 2022 (R. Kelley, BYOGUIDES; copyrighted) | PDF on Pierre's Google Drive, in the IMR / coral folder (85 scanned pages, no text layer; PDF page = book page + 5). Never commit it, its page images or crops of it (copyright: the 554 crops once in `img/` were removed on 2026-11-08, Pierre). Page mapping already in `data.json` (`pages`, `key`, `x`). |
| Pierre's iNaturalist | user `ppericard`, coral taxon 47532; covers 36 of the 39 slate genera (missing Anacropora, Astrea, Duncanopsammia at the time). |
| ReefRecall | Pierre's separate mobile app (`ppericard/reefrecall`). The coral tools stay standalone; the data may be reused there later. |

The cloud environment needs network access to `api.inaturalist.org`, `www.inaturalist.org`, `inaturalist-open-data.s3.amazonaws.com` and `static.inaturalist.org` for photo work; Google Drive downloads need Pierre's sign-in (use a Drive / Slides connector if the new account has one).

## Context worth knowing (history in brief)

- 2026-10-31: first standalone artifacts (Coral Finder key, quiz, mind map, genus doc, now in `reference/`), then one web app on GitHub Pages, the Lab of prototypes, the admin back-office, photo curation rules, the Coral Finder rebuilt as a tolerant clue ranking (renamed the Coral ID Key on 2026-11-04: the book keeps the name Coral Finder), responsive system, adaptive difficulty.
- 2026-11-01: expert reviews (code, admin, RA, design) and their fixes, Code.gs v6-v9, players' reports, bonus genera, welcome tour for beta testers, graded answer choices, confusion scores.
- An incident on 2026-11-01 (a stale admin draft published as a whole copy wiped curation) led to the key-by-key Publish merge (PR #240): never go back to whole-copy publishing.
- The photos are leaving the repo (Pierre, 2026-11-02; his rule of 2026-11-05: git keeps only the photos with no other backup): Cloudflare R2 first (done 2026-11-03: the app and the admin read from the bucket, `core.js` `PHOTO_BASE`), then the photos with an online original removed from `img/` (step 2: they live on R2 only and fall back to their iNaturalist / FishBase original), then the history rewrite that shrank `.git` (step 3, done 2026-11-08: pack 702 MiB to 63 MiB, Q121, Q300): "Photos out of the repo, step 3" below. See ROADMAP "Photos out of the repo".

## First prompt for the new account

Paste this into the new Claude Code session (repository `ppericard/coral-id-imr` attached):

```
You are taking over development of ppericard/coral-id-imr, a static web app (GitHub Pages)
that teaches the IMR coral genera to Research Assistants at the Institute for Marine Research,
Dauin, Philippines. Previous work happened in another Claude account; you have no access to its
memory or chats. Everything you need is in the repo.

1. Read AGENTS.md, then docs/HANDOVER.md, then docs/STATUS.md, then docs/ROADMAP.md. Skim docs/ARCHITECTURE.md and
   docs/DESIGN.md. Follow the rules in AGENTS.md and docs/rules/ strictly.
2. Run the tests (node tests/run.js) and serve the app locally (python3 -m http.server)
   to check that main works.
3. Reply to me in French with: (a) a 5-line summary of where the project stands, (b) what I
   still have to do myself (from docs/STATUS.md "Pierre's hands"), (c) the top 3 backlog items you
   propose to start with. Do not start coding until I answer.

Working rules: answer me in French, write everything else in English; you are the integrator
(AGENTS.md "Working mode"): start subagents on their own branches and PRs, merge only what was
already decided with me, bring me every other choice as a short numbered question with context
and your recommendation; fix review findings without asking; follow Rule 0 and its quiet hours;
update the docs in every PR. Save any new lasting rule I give you in docs/rules/ (with its ID in
AGENTS.md), not only in your memory.
```

## Analyses report (one-time setup, 2026-11-04)

The admin's **Analyses** group shows a report that a GitHub Action computes from the answer log every 1000 answers and stores in the sync sheet (docs/ARCHITECTURE.md "Analyses"). The Action reads and writes the sheet with an admin token, the same kind of token as the admin page's: until it exists, every run is skipped (green, with the message "ANALYSES_ADMIN_TOKEN is not set: skipped") and the admin's views say "No report yet". Never paste the token in a chat or a file.

1. **Make a token for the Action** (a separate one from the admin page's, so either can be revoked alone): GitHub > your picture > Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > Generate new token. Name "Coral ID analyses"; expiration up to a year (note the date); Resource owner `ppericard`; Repository access **Only select repositories** > `coral-id-imr`; Repository permissions: **Contents: Read-only** (the sync script only asks GitHub whether the token's owner can write to the repository, which Pierre can; the token itself never needs to write). Generate, copy it.
2. **Store it as a repository secret**: the repository > Settings > Secrets and variables > Actions > **New repository secret**: name `ANALYSES_ADMIN_TOKEN`, value the token. Secrets never show in logs or to forks.
3. **Check**: the repository > Actions > **Analyses report** > Run workflow (tick *force*) > Run. The log says "Stored: Corals, N answers, M milestones …" (counts only). The admin's Analyses group then shows the report. From then on it runs every hour and computes only when the corals' answers reach the next round thousand (2000, 3000, …; the fish answers counted apart); the other runs log "Corals: N answers, newest milestone M: the next one at M + 1000."

If the log says the token was refused: the token has expired or lost access to the repository (make a new one, step 1, and replace the secret). "The sync script answers as v…: needs v35": the sheet script has not updated itself yet (about 15 minutes after a merge; its "Deploy log" tab says).

## Protect main (one-time setup)

GitHub does not enforce the merge rules by itself (governance review, 2026-11-05). Pierre, about 2 minutes:

1. The repository > **Settings > General > Pull Requests**: keep only **Allow squash merging** (untick merge commits and rebase merging), so every merge is a squash titled `… (#N)`.
2. **Settings > Rules > Rulesets > New ruleset > New branch ruleset**: name `main`, Enforcement status **Active**, Target branches > Add target > **Include default branch**; under Rules tick only **Restrict deletions** and **Block force pushes**; Create.

GitHub push protection for secrets is already on (Pierre, 2026-11-08).

Required checks are deliberately not set: they would block the admin's Publish and the Candidate photos Action, which push straight to `main`. The merge train (rule W26, `tools/train.py`) relies on it too: it squash-merges PRs that are not up to date with `main` once their train is green, so "Require branches to be up to date before merging" must stay off. The history rewrite of 2026-11-08 (below) needed "Block force pushes" off for its push; it is ticked again.

## Photos out of the repo, step 3: the history rewrite (done 2026-11-08)

**Done on 2026-11-08, about 16:20 Manila** (Pierre's go, Q121 and Q300: everything at once, photos and Coral Finder crops, once the queue was empty). 8,240 paths were stripped from every commit of the 18 branches: every file once in `img/` and not in today's `img/`, minus the IMR lecture photos, the 2,216 Coral Finder crop files among them. The pack went from 702 MiB to 63 MiB; a fresh clone is about 75 MB. Today's tree is unchanged (checked file by file on all 18 branches). `.git-blame-ignore-revs` was remapped to the new hashes (commit 14fdb4b). Backup: Pierre's own mirror clone, kept off GitHub, and a verified bundle (he says when they can go). The photo workflows were disabled during the window and enabled again; Deploy Pages ran green and the live site was checked.

**Every clone or worktree made before 2026-11-08 16:20 Manila must never push** (its branches hold the old history: a push would bring the photos back). Agents and computers clone again. "Block force pushes" is ticked again. **No GitHub Support purge, by Pierre's choice** (2026-11-08): the old objects, the Coral Finder crops among them, stay reachable only through old pull-request refs and old commit URLs, never in a clone. If a rights holder ever asks, the fallback is a Support request then, or recreating the repository (it loses the PRs and the settings: not recommended). Pierre's last steps (STATUS "Pierre's hands"): drop the crops from R2 ("Coral Finder book crops on R2" below) and, when he says so, delete his backup.

The procedure, kept for reference (as written before the rewrite; step 4's count came out at 8,240 paths). Step 2 removed from `img/` every photo with an online original (they live on Cloudflare R2 only), but their old copies stayed in `.git`, so every clone still downloaded them. Step 3 rewrites the history so they leave `.git`. It rewrites every commit hash of `main`, so it needs **Pierre's explicit go before the force-push** (AGENTS.md "Working mode": anything irreversible), done by the integrator in one sitting, about 30 minutes:

1. **Quiet window.** No open PR (merge or close them first: a PR branch built on the old history cannot be rebased on the new one by git alone), every agent session stopped, Pierre not publishing from the admin until the end; disable the photo workflows meanwhile: `gh workflow disable approved-photos.yml` and `gh workflow disable photos-r2.yml`.
2. **Backup**, kept outside GitHub (Pierre's computer or his cloud drive) until he says it can go: `git clone --mirror https://github.com/ppericard/coral-id-imr.git coral-id-imr-backup.git` and `git -C coral-id-imr-backup.git bundle create ../coral-id-imr-backup.bundle --all`; check it: `git -C coral-id-imr-backup.git fsck` and `git bundle verify coral-id-imr-backup.bundle`.
3. **Pierre turns off "Block force pushes"**: Settings > Rules > Rulesets > `main` > untick Block force pushes > Save (keep Restrict deletions).
4. **The rewrite**, in a fresh full clone (never an agent's worktree): `git clone https://github.com/ppericard/coral-id-imr.git rewrite && cd rewrite && pip install git-filter-repo`, then the list of every file that ever was in `img/` and is not there now, minus the IMR lecture photos (their only backup is git, even once deleted); every Coral Finder book crop ever committed (`img/<genus>-cf-…`, removed on 2026-11-08: copyrighted, Pierre) is stripped with the rest:
   `git log --all --pretty=format: --name-only -- img/ | grep . | sort -u > /tmp/all.txt`
   `git ls-tree -r --name-only HEAD img/ | sort > /tmp/head.txt`
   `comm -23 /tmp/all.txt /tmp/head.txt | grep -Ev '^img/imrl?-' > /tmp/strip.txt; wc -l /tmp/strip.txt` (about 7770 paths: the 5548 files of step 2, the 2216 crop files and older photos removed earlier); `grep -c -- '-cf-' /tmp/strip.txt` gives at least 2216 and `git ls-tree -r --name-only HEAD img/ | grep -c -- '-cf-'` 0
   `git filter-repo --invert-paths --paths-from-file /tmp/strip.txt`, then `git count-objects -vH` (the pack shrinks by about the size of those photos and their older versions; note both sizes for Pierre) and `git ls-tree -r --name-only HEAD img/ | sort | diff - /tmp/head.txt` (empty: today's `img/` untouched).
5. **`.git-blame-ignore-revs`** names commits by hash: rewrite it with the new hashes from `.git/filter-repo/commit-map` (old, new per line) and commit it on the rewritten `main`.
6. **Force-push**: `git remote add origin https://github.com/ppericard/coral-id-imr.git && git push --force origin main` (then `--force` for any other branch kept, and `git push --force --tags origin`).
7. **Pierre turns "Block force pushes" back on**; enable the two workflows again (`gh workflow enable …`); run Actions > Deploy Pages once and check the site.
8. **The book crops' last copies** (Pierre's, after the force-push; on 2026-11-08 he chose not to make the Support request, above): ask GitHub Support to purge the cached views and the old pull-request refs that still hold `img/*-cf-*` (Settings has no button for it), and delete the crops on R2 once if not done yet ("Coral Finder book crops on R2" below).
9. **Every agent and every computer re-clones** (`git clone`, sparse without `img/` as rule W22 says); an old clone or worktree must not push (its `main` is the old history: a push would bring the photos back). GitHub keeps the old objects behind the old pull-request refs until its own clean-up, so the repository's size on GitHub may drop later than the clones'; GitHub Support can run that clean-up on request.

## Clean branches and Actions

Agents cannot delete a branch or a workflow run from their sessions (the GitHub proxy refuses), so the workflow **Clean branches and Actions** (`clean.yml`, Pierre, 2026-11-11) does it with the repository's token, every Sunday 18:37 UTC on its own. It deletes the branches whose PR was merged and that got nothing after, the merge-train branches (`train/*`) older than two days (a train never has a PR, so GitHub's "Automatically delete head branches", on in the settings, never removes them), and the runs of workflows whose file is no longer on `main` (debug workflows pushed from a branch, finished one-offs), so they leave the Actions list. It keeps `main`, branches with an open PR, its `KEEP` list (work kept on purpose; take a name out once its work is merged or dropped) and everything else, which it lists in its log. By hand: Actions > **Clean branches and Actions** > Run workflow, "dry_run" ticked by default (it lists); "also_delete" takes more branch names, only those Pierre agreed to. A deleted merged branch can be restored from its PR page.

The Coral Finder book crops left the R2 bucket on 2026-11-09 (2216 files, none left; the one-off workflow that did it is gone).
