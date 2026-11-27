# A fictional second edition on localhost: what still ties the app to IMR (2026-11-27)

**Status: study with a reproducible probe, no app change (REE-284).** The "Local test of content portability" paragraph
of REE-284, and item 5 of the integrator's A27/F27 reconciliation (REE-284, 2026-11-27 06:50 Manila): a fictional
second edition before any real one, with A27's finding that two path-based editions on one origin are not isolated
(`sw.js` activate). Nothing in the app, the sheet script or the workflows was changed; each seam below is a candidate
small PR, not done here. Every choice is marked for the integrator or for Pierre.

- **Base:** `origin/main` at `ba94c261` (#1626), 2026-11-27. Every `file:line` is on that commit; `core.js` lines are
  given with the `core/` part that holds them (`tools/sync_core.py` joins them).
- **Probe:** [`tools/studies/ree284/fictional.js`](../../tools/studies/ree284/fictional.js), its synthetic courses in
  [`course.js`](../../tools/studies/ree284/course.js), how to run it in the
  [README](../../tools/studies/ree284/README.md). Run five times on this base: the first stopped on the service worker
  (finding 3.3), the four others found the same things (the play takes about 40 s once the machine slot is free).
- **Labels (rule W11):** **measured** is what the probe recorded; **read** is read in the code, not seen running;
  **judgement** is my opinion.
- **Not verified:** a real second origin over https (the probe serves `http://127.0.0.1`, where the app does not register
  its service worker by itself, `app.js:4442`; the probe registers it, as `tests/net.smoke.js` does); the admin (left
  out on purpose: a fictional edition has none); the fish and sea slug subjects with fictional content (the courses
  are coral-shaped only).

## 1. What the probe does

Two editions, **a** ("FFS Tide Trainer", Fictional Field School) and **b** ("ZTA Shore Guide", Zed Test Academy), each
four invented genera in two invented families, three synthetic photos per view drawn in the browser, invented ID tips,
look-alike lines and a glossary term. No IMR media, no admin, no progress service.

- **Built** in a temporary folder from the 65 code files the deploy publishes (pages.yml `git archive`, minus what
  `.gitattributes` marks `export-ignore` and the admin's files), unchanged, with `core.js` `ORG` replaced and the static
  pages rewritten by `tools/rename_app.py`, the fork procedure `core/keys.js:1-4` documents (it renamed `index.html`,
  `privacy.html`, `manifest.webmanifest`: title "FFS Tide Trainer", short name "Tide Trainer"). The 29 IMR content files
  (`*.json`, `data/`, `img/`, `og.jpg`) are left out; each edition brings its own `data.json`, curation, `forms.json`,
  `quality.json`, `picks.json` and `calibration-set.json`.
- **Served** on `127.0.0.1` at `/a/` and `/b/` (one origin). Every request for another host is aborted and recorded by
  Playwright, and Chromium runs with no proxy and resolves no host but `127.0.0.1`. `navigator.webdriver` is hidden, so
  the app tells a local copy by its address alone (#1626).
- **Played:** a new player's first screen (the tour), then Home, Genera, a genus sheet, one quiz question answered,
  My progress, the leaderboard, About, Tools; then the service worker, edition b beside a, and a synthetic export in the
  legacy format on a fresh device of edition a.
- **A ratchet:** `KNOWN` in the probe holds what is listed below. A new dependency fails the run, and one fixed fails it
  until it is taken out of `KNOWN` and this report.

## 2. What worked (measured)

- **The content seam holds for the corals.** The app ran on a `data.json` with no instance layer (no `imrg`, `n`, `ig`,
  `imr`, `mn`, `sl`), no Coral Finder key or traits, no lecture photos and an empty curation: the Genera page lists the
  four invented genera, a sheet shows its synthetic photo and tips, a quiz question came with four choices (all
  invented genera) and was answered, the progress was recorded under the invented genus. No page error.
- **The organisation's name is a fork away.** `ORG` and `tools/rename_app.py` changed every place the app names itself
  or the organisation's course words ("The genera on the FFS slate", "ID tips (FFS)", the page title, the manifest).
- **The admin is not needed by the player page:** no admin file was asked for during the play.
- **#1626 holds (rule D1).** `LOCAL` is `true` on `http://127.0.0.1` with `navigator.webdriver` false, so the origin
  check alone (`app.js:3416-3417`) turns the sheet off. Zero requests to `script.google.com` or
  `script.googleusercontent.com` through start-up, eight pages, a question, the service worker, the second edition and a
  sign-in. The anonymous answer was kept in `reefid-anonq` and never sent. In the legacy check, the six sheet calls
  (statistics, the account load, the leaderboard twice, the achievements' shares, the save) reached only the test's
  `window.SHEET_STUB`.
- **The legacy-format export is read.** Device keys under the old names (`imr-coral-progress`, `imr-coral-theme`,
  `imr-coral-sync`, `imr-tour`) and an account saved under the old names: no old key left, the device's progress kept,
  the account's progress merged, signed in, the dark theme kept (`core/keys.js:37-49` `LEGACY_KEYS`, `core/keys.js:65` `migrateKeys`).

## 3. IMR dependencies found

### 3.1 The network: IMR's photo bucket (measured)

| Destination | Tried | From | Where it is set |
|---|---|---|---|
| `pub-934250f83b884a4f890497f2027ce251.r2.dev` (IMR's R2 bucket) | 61 times in one short play: 43 by the pages (images), 18 by the service worker | every photo of the edition, R2 first, the site's `img/` after the failure | `core/photos.js:181` (`core.js:5708`) `PHOTO_BASE`; `sw.js:23` `R2`; `index.html:6` the CSP's `img-src` and `connect-src` |

No other host was tried. **Judgement:** deployed on its own origin with a network, edition b would ask IMR's bucket for
each of its photos first (a 404 each, then the site), so its photo names reach a host IMR controls, and every photo
pays a failed round trip until the R2 pause (`sw.js` `R2_PAUSE`). The CSP (`index.html:6`) also allows only IMR's
hosts: R2, the sheet script, `api.github.com`, iNaturalist, FishBase, Corals of the World.

### 3.2 IMR files the shared code still asks for (measured)

| File asked | When | Asked by |
|---|---|---|
| `img/reefcloud-example-m.webp` (an IMR media file) | Home, both editions | `home.js:137` |
| `seaslug.json` | during the coral play | the sea slug unit's loader, `app.js:3003` |
| `fish.json`, `fish-photos.json`, `fish-game.json` | the service worker's install | `sw.js:47-49` (`SHELL`) |

### 3.3 The service worker cannot install without IMR's fish files (measured)

`sw.js` `SHELL` lists the IMR edition's data files, the three fish files among them (`sw.js:47-49`), and one file that
fails three times fails the whole install (`sw.js:97-110` `get`, `sw.js:119`). Edition a, which teaches no fish, had no worker until the
probe served `{}` placeholders for them: an edition without fish has no offline copy.

### 3.4 Two editions on one origin share and destroy each other's state (measured)

With a at `/a/` (worker active, one question answered) and b at `/b/` deployed later (its `V` one higher):

- **b's worker deleted a's shell cache.** After b's activation the origin holds `reefid-shell-v344` (b's files only);
  a's `reefid-shell-v343` is gone. `sw.js:133` deletes every cache whose name starts with `reefid-shell-` and is not its
  own `V`: caches are per origin, not per worker scope. a is no longer available offline.
- **One photo cache holds both editions' photos:** `imr-photos-v1` (`sw.js:12`), capped at 2,500 entries for the origin.
- **b reads a's progress:** b's pages see `reefid-sync-coral-progress` with a's genus in it. Storage keys are per origin
  (`core/keys.js:33` `KEYS`), so a player of b who signs in would carry a's units into b's account.

This confirms A27's finding: **one origin per organisation.** A path prefix in the cache and storage names would stop
the collisions, not the reads: same-origin pages can read each other's storage.

### 3.5 The sheet: off for every other origin, and only IMR's (read, measured)

`app.js:3407` `SYNC_URL` (IMR's deployment) and `app.js:3416` `SHEET_SITE` (IMR's site) are constants. A second edition
on its own origin is a local copy: no account, no leaderboard, no statistics, the anonymous answers kept unsent
(measured on `127.0.0.1`). That is safe for a first fictional or pilot edition (no backend, as REE-284 asks to keep
possible); a real edition with its own progress service needs its own pair of site and script, which today is a code
change.

### 3.6 The subjects are code (read, measured)

`core/subjects.js:229-774` `SUBJECTS` declares the corals, the fish and the sea slugs. An edition with only corals still
shows the tour's "has three subjects: corals, fish and sea slugs" (`tour.js:217`), "The sea slugs of the Philippines"
(`app.js:3004`), "as on ReefCloud photos" (`app.js:2536`), "as on the FFS survey videos" (`app.js:2679`), and the subject
menu offers fish and sea slugs whose files it does not hold (3.2).

### 3.7 The IMR slate's meaning is code (measured, read)

- A genus with no slate number (`n`, the instance's layer) is read as an IMR starred genus: every invented genus shows
  "★ not surveyed" (sheet, quiz feedback, cards; `app.js:3663`, `proto/lab.js:161`, `proto/web.js:177`) and the sheet
  says "★ Not surveyed by FFS. It is on the slate so you don't mistake it for , so you need to recognise it and set it
  aside." with an empty list (`learn.js:602-605`: it names only look-alikes that carry `n`).
- `core/photos.js:9-10` (`core.js:5536-5537`) `BENTHIC` and `BONUS` name IMR genera (Millepora; Isopora, Leptoseris,
  Heliopora, Sandalolitha, Pleuractis). Harmless when absent (`slateOf` filters by `d.x.gen`), but the slate's
  composition is half code.
- The sheet shows "Coral Finder p." with no page (`learn.js:620-621`, `app.js:3384` for `x` genera): the Coral Finder is
  assumed as the coral reference.

### 3.8 IMR words shown that ORG does not carry (measured on the pages, read in the code)

| Page | Words | Where |
|---|---|---|
| First screen (tour) | ReefCloud; Pierre (Home's credit under it) | `tour.js:48`; `home.js:163` |
| Home (both editions) | "By Pierre Pericard · for FFS" | `home.js:163` |
| Genus sheet | Coral Finder | `learn.js:620-621` |
| About | Pierre Pericard, "Dauin, Philippines", Coral Finder, Corals of the World, the GitHub repository | `home.js:197`, `home.js:205-206`, `home.js:213`, `home.js:231` |
| Tools | Coral Finder; "the FFS reference PDF", EventMeasure | `proto/idkey.js:51-71`; `proto/fishkey.js:105-106` |
| Static page text | "the corals and reef fish of Dauin", "Non-FFS genera … seen at Dauin" | `index.html:10`, `15`, `92`, `96` |
| Not reached by the probe | Dauin in the credit of the instance's own photos; "ask Pierre Pericard" on account deletion | `app.js:840`; `sync.js:2240`, `sync.js:2309` |

A static read of the 65 served code files (comments left out; `--json` holds it per file and line) finds IMR words or
IMR-chosen hosts in the code of 19 of them, most in Home, About, the sheets and the Lab: `app.js`, `core.js`,
`home.js`, `idtips.js`, `index.html`, `learn.js`, `model.js`, `progress.js`, `quiz.js`, `sw.js`, `sync.js`, `tour.js` and
seven `proto/*.js`; among them the Lab's "IMR Lecture 6" citations written
out rather than through `ORG` (`proto/anatomy.js:273-294`, `proto/basics.js:428-563`); and the rules versions' notes
(`core.js:6512-6578`, "Pierre, 2026-11-04"). Content words in the data (lecture text, slides) and the Lab's lecture
citations are [the IMR layer, round 3](2026-11-25-imr-layer-round-3.md)'s (REE-294).

### 3.9 The legacy export: a unit the edition does not hold is kept (measured)

The synthetic account's progress named "Retiredia", a unit edition a does not hold. The app does not show it, but keeps
it in `reefid-sync-coral-progress` and saves it back to the account. Progress is keyed by unit name only, with no
course or edition: an export from another course, or IMR's, merges silently into any edition's progress.
`LEGACY_KEYS` (`core/keys.js:37-49`) moves the old IMR names on any edition's devices (correct for IMR, and harmless
elsewhere: nothing else writes `imr-*`).

### 3.10 One repository, one deploy (read)

The deploy publishes the repository root (`pages.yml` `git archive`): the code, IMR's content files and the root
Markdown files (`README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`) together. Nothing assembles an edition from
the shared code and an edition's own content; the probe's `buildEdition` does it in a temporary folder.

## 4. What blocks a real second edition

In order of what must be decided first (judgement):

1. **Its own origin** (3.4): a path on IMR's origin destroys IMR's offline copy at each deploy and mixes progress.
   Hosting and domain are Pierre's (REE-81, REE-110; costly, money).
2. **Its own photo host, or none** (3.1): until `PHOTO_BASE` is the edition's, every photo is asked of IMR's bucket first.
3. **An offline copy without the fish** (3.3): the worker installs only with IMR's file list.
4. **Its subjects** (3.6) and **its slate's meaning** (3.7): a course that is not IMR's coral slate reads as a slate of
   starred genera.
5. **Its own words** (3.8): the author, the place, the reference books and the About page.
6. **Progress that knows its course** (3.9), before an edition's players can sign in anywhere shared.

A progress service of its own (3.5) is not a blocker: the second edition runs without one today.

## 5. The smallest seams, each a candidate PR (not done here)

Each is behaviour-preserving for IMR and would be checked by this probe (its `KNOWN` line taken out in the same PR).

| # | Seam | Files | Check | Who decides |
|---|---|---|---|---|
| S1 | The service worker's shell lists the data files as optional: a 404 on a subject's data file does not fail the install (or `SHELL` names only the files every edition has) | `sw.js` | `tests/net.smoke.js` step 6, this probe (3.3 gone) | integrator (implementation detail) |
| S2 | The photo base read from the edition (one value beside `ORG`, `''` for an edition without R2) instead of a constant, and the CSP's photo hosts from the same place at build | `core/photos.js`, `sw.js`, `index.html`, `tools/rename_app.py` | `tests/net.smoke.js` step 12, this probe (3.1 gone) | integrator; `core/` is a sheet-script file (rule D3: no behaviour change for the sheet) |
| S3 | The author, the place and the reference books as edition words beside `ORG` (`ORG.place` from `tools/instance.json` `centre.name`, which `docs/spec/data.md` "The instance's centre" already plans), read by Home, About and the credits | `core/keys.js`, `home.js`, `app.js`, `sync.js`, `index.html` | `tests/renameorg.test.js`, this probe (3.8 rows gone) | integrator (wording, REE-34) |
| S4 | The starred-genus text only when the edition declares a slate (`data.json` carries the slate the build lays from `tools/instance.json` `slate`, with `BENTHIC` and `BONUS`); without one, no ★ and no "Not surveyed" | `learn.js`, `app.js`, `proto/lab.js`, `proto/web.js`, `core/photos.js`, `tools/instance.py` | `tests/instance.test.js`, this probe (3.7) | Pierre: the meaning of a genus without a slate number is a player-facing choice |
| S5 | The subjects an edition offers, from its content (a list in an edition file), the tour and the subject menu following it | `core/subjects.js`, `tour.js`, `app.js` | `tests/subjects.test.js`, this probe (3.2, 3.6) | Pierre (what an edition offers); rule S1 holds |
| S6 | A course id on the stored progress (or its key), so an export from another course is kept apart instead of merged | `core/keys.js`, `progress.js`, `sync.js`, `Code.gs` | `tests/adopt.test.js`, `tests/sync.test.js`, this probe (3.9) | Pierre: a data format other code follows (costly to undo); with REE-311's version signals |
| S7 | `tools/edition.py`: assemble an edition (shared code, its own content, `ORG`) in a folder, the probe's `buildEdition` promoted to a build step | `tools/`, `tools/studies/ree284/` | this probe builds through it | integrator (tooling) |

**Recommended order (judgement):** S1 and S7 first (no player sees a change; they make every later probe run cheaper),
then S2 and S3 (IMR-neutral constants), then S4 to S6 with Pierre's answers. The origin (4.1) is not a seam: it is the
hosting decision that a real edition waits for.

## 6. For Pierre (not asked now: Rule 0 and the batch)

- **Q-a, a genus without a slate number** (S4): today it reads as "★ not surveyed". Options: (1) no star and no slate
  text when the edition declares no slate; (2) keep the IMR meaning everywhere. Recommendation: (1).
- **Q-b, what an edition offers** (S5): the subjects from the edition's content, or every edition keeps the three.
  Recommendation: from the content, the tour following it.
- **Q-c, progress across courses** (S6): a course id on the stored progress before any second edition shares an account
  store. Recommendation: yes, designed with REE-311.
