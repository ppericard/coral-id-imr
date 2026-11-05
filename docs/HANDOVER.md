# Handover: picking up IMR Reef ID in a new Claude account

Written 2026-11-01 when Pierre moved development to another Claude Code account. If you pick the project up cold, read "Where things are" below, then [`STATUS.md`](STATUS.md): where things stand now. Until then the project ran in a Claude "project" with a shared memory, many parallel threads and private claude.ai docs. **None of that is reachable from the new account.** Everything that mattered has been copied into this repository; this file is the map.

## Read in this order (15 minutes)

1. [`AGENTS.md`](../AGENTS.md): who the app is for, Pierre's standing rules (do not break them), how to ship a change.
2. This file: how to work with Pierre, where external things live, the one-time setups.
3. [`STATUS.md`](STATUS.md): where things stand (tracks in flight, the integrator's queue), the open questions for Pierre, what only he can do. `python3 tools/brief.py` adds what can be computed (open PRs, branches without a PR, the sheet script's version).
4. [`ROADMAP.md`](ROADMAP.md): the prioritised backlog, long-standing content questions, declined ideas.
5. [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DESIGN.md`](DESIGN.md) when you touch code or UI.
6. [`reviews/`](reviews/README.md): the last expert reviews (code, admin, first-time RA, design) with what is still open.

## Where things are (for a newcomer)

| You want | Look at |
|---|---|
| The rules you must not break | [`AGENTS.md`](../AGENTS.md): Rule 0 (Pierre's hours, Manila time), the standing rules 1-28, "How to make a change" 1-17 |
| The app's code | `index.html` + `app.js` (start-up, routing, shared helpers), `quiz.js` (screens), `model.js` (what to ask next), `learn.js`, `progress.js`, `home.js`, `tour.js`, `tips.js`, `sync.js` (the sheet), `core.js` (pure functions shared with the admin and the sheet), `sw.js` (offline cache); AGENTS.md "Repository map" |
| How the learning works, and why | [`LEARNING.md`](LEARNING.md) (each rule with its measurements; `tools/learnsim.js` simulates, `tools/abilityeval.js` replays the real answers) |
| The subjects (corals, fish) | `core.js` `SUBJECTS`, `app.js` `UNITS`; fish content `fish.json` (built by `tools/build_fish.py`), the fish path spec [`FISH_PATH.md`](FISH_PATH.md), ARCHITECTURE.md "Subjects" and "Fish content" |
| The admin | `admin.html`, `admin*.js`, `autosort.js`, `analysis.js`; try it with `admin.html?demo`; ARCHITECTURE.md "Admin" and ROADMAP "Admin for every subject" |
| The progress sheet | `tools/sync/Code.gs` (self-updating Apps Script; "Code.gs" below), its tests `tests/sync.test.js` on an in-memory sheet (`tests/gas.js`) |
| Photos | `data.json` photo lists, `curation.json` (Pierre's choices), `img/` mirrored to Cloudflare R2 (`core.js` `PHOTO_BASE`), the tools in `tools/` (ARCHITECTURE.md "Photos") |
| Tests and CI | `tests/*.test.js` (Node), `tests/*.smoke.js` (Playwright, one CI job each), `.github/workflows/checks.yml`; AGENTS.md "How to make a change" 2b |
| Deploy | `.github/workflows/pages.yml` (stamps the version numbers, then publishes), [`PAGES.md`](PAGES.md) |
| Where things stand, what waits on Pierre | [`STATUS.md`](STATUS.md) (the integrator's only); `python3 tools/brief.py` |
| What is next, what was declined | [`ROADMAP.md`](ROADMAP.md) |

## State of play

In [`STATUS.md`](STATUS.md), written by the integrator only; the history is in `git log` and the PR descriptions.

## Pending actions for Pierre

In [`STATUS.md`](STATUS.md) "Pierre's hands"; the steps of the one-time setups are below ("Protect main", "Clean merged branches", "Analyses report").

## Questions for an IMR trainer

In the admin, Inbox › To do › Points (from [`points.json`](../points.json), with the content questions for Pierre; since 2026-11-05). Never settle them in the app; keep the lecture's version.

## Setting up to work, and what lives outside GitHub

Nothing needs rebuilding: the site is served by GitHub Pages from `main` through `pages.yml`, so a merged PR triggers deployment. The Pages source must be GitHub Actions; see [PAGES.md](PAGES.md) for migration and recovery. There is no build step and no package manager. What a new agent needs is a working copy; the only pieces outside GitHub are the Google Sheet + Apps Script (progress sync) and Pierre's admin token, recreated only if they are ever lost.

**Working copy (any machine or cloud container):**
1. Clone `https://github.com/ppericard/coral-id-imr` (public). Python 3 (CI: 3.15), Node (CI: 26, the current LTS) and Playwright 1.64.1 with its Chromium are all you need (the versions CI pins: `.github/workflows/checks.yml`).
2. Serve: `python3 -m http.server 8000`, open <http://localhost:8000> (app) and <http://localhost:8000/admin.html?demo> (admin without a token, every page on made-up data, nothing sent; `?readonly` shows the real curation instead). Sync and photo Elo talk to the live Apps Script even locally (read-only unless you sign in).
3. Check: `node --test tests/*.test.js`, `node tests/pages.smoke.js`, `node tests/draw.smoke.js`, `node tests/admin.smoke.js` (Playwright; never add a `package.json`), `python3 tools/check_versions.py` (consistency only: the deploy stamps the version numbers).
4. Network: iNaturalist hosts (listed under "External resources") for photo scripts; GitHub for PRs. Python scripts need Pillow for photo work: `pip install -r tools/requirements.txt` (the version CI pins).

**Hosting settings (already in place; only if the repo ever moves):**
1. GitHub Pages: Settings > Pages > Source **GitHub Actions**, with `pages.yml` as the single deployer. This replaces the original branch `main` / root source; verify the migration in [PAGES.md](PAGES.md), since the setting is outside git. `.nojekyll` remains committed. If the site stops updating with "Please cancel <sha> first" (a known GitHub Pages glitch, hit several times on 2026-11-01), follow PAGES.md > Manual recovery.
2. Actions: `.github/workflows/pages.yml` (push to `main`, manual dispatch, and Candidate photos completion), `.github/workflows/checks.yml` (PR checks) and `approved-photos.yml` (after each `curation.json` push; needs Settings > Actions > Workflow permissions "Read and write").
3. Admin writes: a fine-grained GitHub token, this repository only, Contents read and write, 90-day expiry; the admin lock screen links to the token page and stores it encrypted with a password of Pierre's choice. Changing the repo name or owner means updating `REPO` in `admin.js` and in `tools/sync/Code.gs` (the admins' token check), then redeploying the script.

**Progress sync (outside GitHub; only if the Sheet or script is ever lost):**
1. New Google Sheet > Extensions > Apps Script > paste [`tools/sync/Code.gs`](../tools/sync/Code.gs) > save.
2. Project Settings > Script Properties: add `ANON_SALT` = any long random string (keeps anonymous player ids unguessable; never commit it).
3. Deploy > New deployment > type **Web app**, Execute as **Me**, Who has access **Anyone** > Deploy, accept the permissions. Run once in the editor a function that calls `UrlFetchApp` (see "Code.gs" below) so the admins' GitHub token check works.
4. Put the `/exec` URL in `SYNC_URL` in `app.js`. The tabs (`RAs`, `Answers`, `Activity`, `By genus`, `Reports`, `Progress data`, `Removed`) are created on first use. Old progress lives in the old Sheet only.

**Content (`data.json`):** the original build scripts read a scratchpad that no longer exists (`tools/archive/`). `data.json` is the source of truth: edit it directly or through a small re-runnable `tools/apply_*.py` script, and write it with `tools/datajson.py` (one genus per line; the PR check fails on any other layout). The lecture text came from the Google Slides copy of Lecture 6 (Slides API, incl. presenter notes); photos from the lecture deck media, Pierre's iNaturalist and other iNaturalist observers (see ARCHITECTURE.md "Photos" and "Tools"). **The lecture photos' rights are uncertain** (Pierre, 2026-11-04): many are not IMR's own (from iNaturalist or the web without a proper source); they stay preferred for corals but are to be traced to their original and credited or replaced (ROADMAP, AGENTS.md rule 7). The IMR fish presentation's photos are mostly not IMR's own either (likely from ID books): fish never use them.

## Working with Pierre

Pierre Pericard (GitHub `ppericard`), Research Fellow at IMR (Institute for Marine Research, Dauin, Philippines) since early October 2026. He builds this to learn the IMR genera himself and to train the RAs.

- **Language**: he writes in French (often dictated, so expect speech-to-text typos). Reply to him in French. Everything you produce (code, UI, docs, commits, PRs) is in English, because IMR is an English-speaking workplace.
- **Autonomy**: work on your own: branch, build, test, open PRs. **Merging follows the merge contract** (AGENTS.md "Working mode"): only what was already decided with him; every other choice, and any destructive or irreversible step, is asked first.
- **Fix by default**: when a review finds problems, fix everything you can without asking ("fais corriger tout ce que tu peux faire corriger", 2026-11-01). Bring him only real choices, or actions that need his hands (Apps Script redeploy, admin curation, decisions about IMR content).
- **Questions**: ask each one once, short, with your recommendation. He likes one-line questions he can answer quickly. Never re-ask something he already answered: check ROADMAP and PR descriptions first.
- **How he judges UX**: taps or clicks, scrolls, and what is on screen versus what must be fetched elsewhere. He uses the app on his phone a lot. He prefers visuals to text, and judges new things in use ("à voir à l'usage"): ship, then iterate on his feedback.
- **Many prototypes first, trim later**, but Lab tools graduate into the app only with his explicit OK.
- **Docs in every PR** (his rule): AGENTS / ARCHITECTURE / ROADMAP / DESIGN / README / admin help updated in the same PR, or "Docs: none needed" in the description. A full docs pass every ~20 PRs.
- **No hardcoded genus count** in user-facing text ("39"): it changes (bonus genera).
- His Google interface is in **French**: give Apps Script steps with the French menu names (below).

## Code.gs (progress sync) and how to redeploy

- Code: [`tools/sync/Code.gs`](../tools/sync/Code.gs); details and version history in ARCHITECTURE.md "Progress sync". Bump `VERSION` (header comment + constant) on every change; keep changes backward compatible, because the app must keep working with the deployed version until Pierre redeploys.
- Live version check without writing: open `SYNC_URL?name=x&pin=ab` (`SYNC_URL` constant in `app.js`); the JSON reply carries `v`.
- **Self-update (from v11, Pierre 2026-11-01): ACTIVE** since Pierre's setup on 2026-11-01 (Cloud project "IMR Coral ID sync", consent screen published, "Self-update ready"; v11 verified live). After a one-time setup, every `Code.gs` merged to `main` with a higher `VERSION` goes live by itself within about 15 minutes; the Sheet's "Deploy log" tab lists each install. **One-time setup (Pierre, French UI, ~5 min):** (1) open <https://script.google.com/home/usersettings> and switch **API Google Apps Script** to **Activé**; (2) in the Sheet > **Extensions > Apps Script**: **Paramètres du projet** (gear) > tick **Afficher le fichier manifeste « appsscript.json » dans l'éditeur**; back in **Éditeur**, replace `appsscript.json` with <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/appsscript.json> and `Code.gs` with the raw link below, save; (3) in the function menu of the toolbar pick **installAutoUpdate** > **Exécuter** > accept the permissions (Google may say the app is unverified: **Paramètres avancés** > **Accéder à … (non sécurisé)**, it is his own script); (4) **Déployer > Gérer les déploiements > Modifier > Nouvelle version > Déployer** (the last manual deploy). Step (3) checks the Apps Script API at once and writes the result in the Sheet's **Deploy log** tab (and the editor's execution log): "Self-update ready" means done. **If it says "NOT ready"** (it did for Pierre on 2026-11-01: "Apps Script API has not been used in project 785247313569", the script's hidden default Cloud project, which cannot be opened; a standard Cloud project is needed): (a) <https://console.cloud.google.com> > new project (e.g. "IMR Coral ID sync"); (b) **API et services > Bibliothèque** > "Apps Script API" > **Activer**; (c) **Google Auth Platform / Écran de consentement OAuth** (<https://console.cloud.google.com/auth/overview>): app name, his address as support and contact e-mail, audience **Externe**; on **Branding**, *Application home page* `https://ppericard.github.io/coral-id-imr/`, *Application privacy policy link* `https://ppericard.github.io/coral-id-imr/privacy.html` and *Authorized domains* `ppericard.github.io` (Google greys out Publish without them), **Save**; then **Audience > Publier l'application** (**En production**): never leave it in test mode, where Google drops the authorisation after 7 days and the time trigger silently stops; for his own use no Google verification is needed (an "unverified app" warning, **Paramètres avancés > Accéder à…**); (d) copy the project **number** (Tableau de bord); (e) in Apps Script: **Paramètres du projet > Projet Google Cloud Platform (GCP) > Changer de projet** > paste the number > **Définir le projet**; (f) run **installAutoUpdate** again. If anything still fails, the manual steps below always work. An update interrupted half-way (code replaced, deployment not) is finished at the next run (`AUTO_PENDING`).
- **Manual deploy (before the setup, or if self-update fails).** Give Pierre this raw link to copy: <https://raw.githubusercontent.com/ppericard/coral-id-imr/main/tools/sync/Code.gs>. His steps (French UI): open the Google Sheet "IMR Coral ID – RA progress" > **Extensions > Apps Script** > select all of `Code.gs` and paste the new code > save (disk icon) > **Déployer > Gérer les déploiements** > pencil icon (**Modifier**) on the existing deployment > **Version : Nouvelle version** > **Déployer**. The URL stays the same. Then check `v` with the link above.
- A redeploy does **not** grant new permissions. If a new version uses a new Google service, Pierre must run, once in the editor, a function that calls it and accept the prompt (this is how `UrlFetchApp` was granted for v8: `function autoriser(){ UrlFetchApp.fetch("https://api.github.com"); }`).
- Never change the column layout of the `RAs` tab (positional); add tabs instead.
- Sheet id `1R-L_JqKz9eFF8jvnmPy2g12Zrpn__uWm1Y32kkMfQUE` (Pierre's Drive). Secret Script Property `ANON_SALT` (never in the repo).

## Admin workflow (what Pierre does, what you must not break)

- Pierre curates photos in `admin.html`; every click is a browser draft; **Publish** merges the draft key by key onto the latest `curation.json` and commits it to `main` (commit "Photo curation: … (by ppericard)"). The GitHub Action `approved-photos.yml` then downloads approved candidates and refills candidate lists (commit "Candidate photos: …"). So `main` moves without PRs: rebase right before merging, never overwrite `curation.json` in a PR.
- His curation is never changed automatically; no bulk reset; Undo only. Everyday per-photo actions (× exclude, Reject) are one click with no confirmation: Undo is his safety net.
- Admin pages carry no explanatory text: help sits behind "?" (tabs "This page" / "Start here").

## External resources

| What | Where |
|---|---|
| IMR reference material (Lecture 6 PPTX, slate photo) | Pierre's Google Drive, IMR folder `1gt0sv2YN4Og7-O_YCb3cVgvW94-CK6oG` (needs his Google sign-in). |
| Lecture 6 as Google Slides (read with the Slides API, incl. presenter notes) | Slides id `13msDDkJzPN6fRam-ezX_vl93osAd0Cw4rJ1aINOzveI`. Full-resolution deck media: Drive folder `1FDXDg3XvjXwML0KGxxtjMjVq2fU3jP8i`. **Full-resolution IMR photos** (Pierre, 2026-11-05): search the unzipped deck `2026_L6_CoralID/ppt/media` on his Drive, never the Slides, which were compressed on purpose. |
| Lecture text in the app | `data.json` `gen[g].imr` (verbatim slide text, review slides, presenter notes), `mn` mnemonics, `sl`/`rsl` slide numbers, `tools/lecture_more.tsv`, `tools/course_views.txt`. |
| Coral Finder 2022 (R. Kelley, BYOGUIDES; copyrighted) | PDF on Pierre's Google Drive, in the IMR / coral folder (85 scanned pages, no text layer; PDF page = book page + 5). Never commit it or its page images (copyright). Page mapping already in `data.json` (`pages`, `key`, `x`). |
| Pierre's iNaturalist | user `ppericard`, coral taxon 47532; covers 36 of the 39 slate genera (missing Anacropora, Astrea, Duncanopsammia at the time). |
| ReefRecall | Pierre's separate mobile app (`ppericard/reefrecall`). The coral tools stay standalone; the data may be reused there later. |

The cloud environment needs network access to `api.inaturalist.org`, `www.inaturalist.org`, `inaturalist-open-data.s3.amazonaws.com` and `static.inaturalist.org` for photo work; Google Drive downloads need Pierre's sign-in (use a Drive / Slides connector if the new account has one).

## Context worth knowing (history in brief)

- 2026-10-31: first standalone artifacts (Coral Finder key, quiz, mind map, genus doc, now in `reference/`), then one web app on GitHub Pages, the Lab of prototypes, the admin back-office, photo curation rules, the Coral Finder rebuilt as a tolerant clue ranking (renamed the Coral ID Key on 2026-11-04: the book keeps the name Coral Finder), responsive system, adaptive difficulty.
- 2026-11-01: expert reviews (code, admin, RA, design) and their fixes, Code.gs v6-v9, players' reports, bonus genera, welcome tour for beta testers, graded answer choices, confusion scores.
- An incident on 2026-11-01 (a stale admin draft published as a whole copy wiped curation) led to the key-by-key Publish merge (PR #240): never go back to whole-copy publishing.
- The photos are leaving the repo (Pierre, 2026-11-02; his rule of 2026-11-05: git keeps only the photos with no other backup): Cloudflare R2 first (done 2026-11-03: the app and the admin read from the bucket, `core.js` `PHOTO_BASE`), then the photos with an online original removed from `img/` (step 2: they live on R2 only and fall back to their iNaturalist / FishBase original), then a history rewrite to shrink `.git` (pack 290 MiB on 2026-11-02), the force-push only with Pierre's explicit go and a backup clone: "Photos out of the repo, step 3" below. See ROADMAP "Photos out of the repo".

## First prompt for the new account

Paste this into the new Claude Code session (repository `ppericard/coral-id-imr` attached):

```
You are taking over development of ppericard/coral-id-imr, a static web app (GitHub Pages)
that teaches the IMR coral genera to Research Assistants at the Institute for Marine Research,
Dauin, Philippines. Previous work happened in another Claude account; you have no access to its
memory or chats. Everything you need is in the repo.

1. Read AGENTS.md, then docs/HANDOVER.md, then docs/STATUS.md, then docs/ROADMAP.md. Skim docs/ARCHITECTURE.md and
   docs/DESIGN.md. Follow the standing rules in AGENTS.md strictly.
2. Run the tests (node --test tests/*.test.js) and serve the app locally (python3 -m http.server)
   to check that main works.
3. Reply to me in French with: (a) a 5-line summary of where the project stands, (b) what I
   still have to do myself (from docs/STATUS.md "Pierre's hands"), (c) the top 3 backlog items you
   propose to start with. Do not start coding until I answer.

Working rules: answer me in French, write everything else in English; you are the integrator
(AGENTS.md "Working mode"): start subagents on their own branches and PRs, merge only what was
already decided with me, bring me every other choice as a short numbered question with context
and your recommendation; fix review findings without asking; follow Rule 0 and its quiet hours;
update the docs in every PR. Save any new lasting rule I give you in AGENTS.md, not only in your
memory.
```

## Analyses report (one-time setup, 2026-11-04)

The admin's **Analyses** group shows a report that a GitHub Action computes from the answer log every 1000 answers and stores in the sync sheet (docs/ARCHITECTURE.md "Analyses"). The Action reads and writes the sheet with an admin token, the same kind of token as the admin page's: until it exists, every run is skipped (green, with the message "ANALYSES_ADMIN_TOKEN is not set: skipped") and the admin's views say "No report yet". Never paste the token in a chat or a file.

1. **Make a token for the Action** (a separate one from the admin page's, so either can be revoked alone): GitHub > your picture > Settings > Developer settings > Personal access tokens > **Fine-grained tokens** > Generate new token. Name "Coral ID analyses"; expiration up to a year (note the date); Resource owner `ppericard`; Repository access **Only select repositories** > `coral-id-imr`; Repository permissions: **Contents: Read-only** (the sync script only asks GitHub whether the token's owner can write to the repository, which Pierre can; the token itself never needs to write). Generate, copy it.
2. **Store it as a repository secret**: the repository > Settings > Secrets and variables > Actions > **New repository secret**: name `ANALYSES_ADMIN_TOKEN`, value the token. Secrets never show in logs or to forks.
3. **Check**: the repository > Actions > **Analyses report** > Run workflow (tick *force*) > Run. The log says "Stored: N answers, M milestones …" (counts only). The admin's Analyses group then shows the report. From then on it runs every hour and computes only after 1000 new answers.

If the log says the token was refused: the token has expired or lost access to the repository (make a new one, step 1, and replace the secret). "The sync script answers as v…: needs v35": the sheet script has not updated itself yet (about 15 minutes after a merge; its "Deploy log" tab says).

## Protect main (one-time setup)

GitHub does not enforce the merge rules by itself (governance review, 2026-11-05). Pierre, about 2 minutes:

1. The repository > **Settings > General > Pull Requests**: keep only **Allow squash merging** (untick merge commits and rebase merging), so every merge is a squash titled `… (#N)`.
2. **Settings > Rules > Rulesets > New ruleset > New branch ruleset**: name `main`, Enforcement status **Active**, Target branches > Add target > **Include default branch**; under Rules tick only **Restrict deletions** and **Block force pushes**; Create.

Required checks are deliberately not set: they would block the admin's Publish and the Candidate photos Action, which push straight to `main`. The planned history rewrite (ROADMAP "Photos out of the repo") will need "Block force pushes" switched off for its one push, with Pierre's go.

## Photos out of the repo, step 3: the history rewrite (only with Pierre's go)

Step 2 removed from `img/` every photo with an online original (they live on Cloudflare R2 only), but their old copies stay in `.git`, so every clone still downloads them. Step 3 rewrites the history so they leave `.git`. It rewrites every commit hash of `main`, so it needs **Pierre's explicit go before the force-push** (AGENTS.md "Working mode": anything irreversible), done by the integrator in one sitting, about 30 minutes:

1. **Quiet window.** No open PR (merge or close them first: a PR branch built on the old history cannot be rebased on the new one by git alone), every agent session stopped, Pierre not publishing from the admin until the end; disable the photo workflows meanwhile: `gh workflow disable approved-photos.yml` and `gh workflow disable photos-r2.yml`.
2. **Backup**, kept outside GitHub (Pierre's computer or his cloud drive) until he says it can go: `git clone --mirror https://github.com/ppericard/coral-id-imr.git coral-id-imr-backup.git` and `git -C coral-id-imr-backup.git bundle create ../coral-id-imr-backup.bundle --all`; check it: `git -C coral-id-imr-backup.git fsck` and `git bundle verify coral-id-imr-backup.bundle`.
3. **Pierre turns off "Block force pushes"**: Settings > Rules > Rulesets > `main` > untick Block force pushes > Save (keep Restrict deletions).
4. **The rewrite**, in a fresh full clone (never an agent's worktree): `git clone https://github.com/ppericard/coral-id-imr.git rewrite && cd rewrite && pip install git-filter-repo`, then the list of every file that ever was in `img/` and is not there now, minus the IMR lecture photos and the Coral Finder book scans (their only backup is git, even once deleted):
   `git log --all --pretty=format: --name-only -- img/ | grep . | sort -u > /tmp/all.txt`
   `git ls-tree -r --name-only HEAD img/ | sort > /tmp/head.txt`
   `comm -23 /tmp/all.txt /tmp/head.txt | grep -Ev '^img/(imrl?-|[a-z]+-cf-)' > /tmp/strip.txt; wc -l /tmp/strip.txt` (about 5550 paths: the 5548 files of step 2 plus older photos removed earlier)
   `git filter-repo --invert-paths --paths-from-file /tmp/strip.txt`, then `git count-objects -vH` (the pack shrinks by about the size of those photos and their older versions; note both sizes for Pierre) and `git ls-tree -r --name-only HEAD img/ | sort | diff - /tmp/head.txt` (empty: today's `img/` untouched).
5. **`.git-blame-ignore-revs`** names commits by hash: rewrite it with the new hashes from `.git/filter-repo/commit-map` (old, new per line) and commit it on the rewritten `main`.
6. **Force-push**: `git remote add origin https://github.com/ppericard/coral-id-imr.git && git push --force origin main` (then `--force` for any other branch kept, and `git push --force --tags origin`).
7. **Pierre turns "Block force pushes" back on**; enable the two workflows again (`gh workflow enable …`); run Actions > Deploy Pages once and check the site.
8. **Every agent and every computer re-clones** (`git clone`, sparse without `img/` as AGENTS.md 16 says); an old clone or worktree must not push (its `main` is the old history: a push would bring the photos back). GitHub keeps the old objects behind the old pull-request refs until its own clean-up, so the repository's size on GitHub may drop later than the clones'; GitHub Support can run that clean-up on request.

## Clean merged branches (one-time setup)

Merged branches hide the ones that never got a PR (Pierre, 2026-11-04, AGENTS.md 26b). Agents cannot delete branches from their sessions (the git proxy refuses), so Pierre:

1. Settings > General > Pull Requests > tick **Automatically delete head branches**, for the future.
2. For the ~130 already merged: Actions > **Prune merged branches** (`prune-branches.yml`) > Run workflow once with "dry_run" ticked (it lists), then unticked (it deletes). It deletes only branches whose PR was merged and that got nothing after the merge; a deleted branch can be restored from its PR page.
