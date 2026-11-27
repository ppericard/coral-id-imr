# Service worker (`sw.js`)

How the service worker serves the app offline and fast on a poor line, and how a new version reaches an open page.
This is the specification of what the code does now; why each part was decided is in the PRs and
[docs/decisions/](../decisions/README.md). Its tests are `tests/net.smoke.js` (rule W14), `tests/swcache.test.js` and
`tests/update.test.js`. The load order the app follows before it registers the worker is in
[ARCHITECTURE.md](../ARCHITECTURE.md) "Overview"; the deploy that stamps its version is in [PAGES.md](../PAGES.md).

`app.js` registers it once every tier of the app is in, on https only.

## Caches

- **The shell**, `V` = `reefid-shell-vN` (`SHELL`: the page, the scripts of every tier, the JSON files the app starts
  with, the fonts, `curation.json`, the Lab files). The deploy stamps `V` from a hash of what the shell holds (rule
  W15), so each new version has a new cache, which replaces every older shell cache on activation (`REPLACES`: the
  older names of the app's shell caches too).
- **The photos**, `imr-photos-v1`, which no deploy deletes: at most `PH_MAX` = 2,500 entries, the oldest out first.
- **The admin's own code**, `reefid-admin-files` (`ADM_FILE`: the `admin` scripts and stylesheets, `autosort.js`,
  `analysis.js`; one entry per file, a new `?v=` replacing the older one), which no deploy deletes either. It never
  holds player data.

## Install

Each shell file is fetched on its own, up to 3 tries (`get`), so one failed request on an unstable line does not fail
the whole install. A versioned file (`?v=` in its address) or a font that an older cache already holds is copied from
it (`fixed`): most deploys change a few files. The other shell files (the page, `curation.json`, the manifest, the icon)
are asked from the server with `cache: 'no-cache'`, never from the browser's HTTP cache, which could hold the previous
deploy's page and run its old code. Then `skipWaiting`.

**The fish datasets are best-effort** (REE-339: `fish.json`, `fish-photos.json`, `fish-game.json`, about 938 kB compressed,
`optional()` in `sw.js`; they stay in `SHELL` so `tools/check_versions.py` and the cache-name hash still cover them). Every
device asks for them at install, so an RA who installs on wifi can open fish offline later, but one failing (a 503, a cut
line) cannot fail the install: the coral shell decides it, and "ready offline" means that shell is all in the cache. A
missing one is asked for again by the page, in the background at the next start of the app under the worker (`app.js`
`SETUP[5]`) or when fish is first needed (`setSubject`); the versioned-file rule under Fetch keeps each good reply in the
shell cache, so a second visit, offline too, reads them from it, and the next version copies them. While its data cannot
come, a switch to fish stays on the corals and says so in a note (`app.js` `setSubject`, `progress.js` `subjHello`).
`tests/swcache.test.js` and `tests/net.smoke.js` checks 6b and 6c hold it.

## Activate

The photos still in an old shell cache move to the photo cache, the old shell caches go, and `clients.claim` takes the
open pages. Each open app page (`index.html` only) is asked its version (`reefid-ver?` over a `MessageChannel`,
answered by `app.js`):

- a page that answers reloads by itself at its next calm moment (`app.js` `UPDATED`): the next page change
  (`route()`), or back into view unless a question waits for its answer (`QOPEN`, set by `quiz.js` `question`, cleared
  by the answer and by `route()`). Next in a game is a page change, so a new version comes between two questions;
- a page that does not answer within 3 s runs a version that has none of this and is reloaded at once
  (the client's `navigate`), once.

`app.js` `swCheck` asks the browser for a new version when the page comes back into view (at most every 5 min) and
every 30 min. Both the app and the admin listen for the takeover (`controllerchange`) from their first line, so a
version that takes over while the page still loads is seen; the admin reloads too, since every click is already in its
draft, but not while the draft could not be saved.

**A page no service worker controls** (a browser without one, such as a chat app's built-in browser or some private
windows, or one that blocks it): at those same moments `swCheck` also reads the deployed page itself (`buildCheck`: the
page's own address, `cache: 'no-store'`) and compares its `<meta name="build">` (the deploy's run number,
`tools/stamp_versions.py`) with the running page's. A higher one counts as a takeover (`UPDATED`, the same calm reload,
never while a question waits for its answer). Higher, not different (`newBuild`): a host's cache still serving an
older page would otherwise reload it in a loop. A copy never deployed has no build number and reads nothing.
`tests/net.smoke.js` check 13 runs with service workers blocked and the build stamped by the test server.

## Fetch

- **Photos** (`/img/` on the site or on R2) are cache first, looked up under both addresses (`twinOf`), so a photo cached
  from the site stays offline after the switch to R2. A photo from R2 is asked in CORS mode, whatever the page asked:
  an `<img>` asks no-cors, whose opaque reply cannot be checked and costs about 7 MB of quota each in Chrome; the bucket
  allows the site. Two tries `PHOTO_RETRY` ms apart, a 404 not retried; then the failure goes to the page, which picks
  the next source (`app.js` `photoFail`: the photo's online original, or the site's copy; "Photos" in
  ARCHITECTURE.md), and R2 is not asked again for `R2_PAUSE` (60 s). The worker never serves the site's copy by itself.
  Only good replies are kept.
- **Versioned files and fonts**: cache first, no network once cached (a new version is a new address).
- **The other app files** (the page, `curation.json`, the manifest): revalidated with the server; a cached copy is
  served after `SLOW` (2 s) on a slow line while the network refreshes the cache in the background.
- The page's reply never waits for its cache write, which is made within the event's lifetime (at most 30 s). No reply
  waits on Cache Storage with a time limit of its own.
- **A page opened while a newer version waits** (`registration.waiting`: the old worker still busy, or started again
  by a request in the instant Chromium stopped it for the swap) is not answered: the browser loads it from the network.
  In Chromium that navigation takes the waiting version over and stops the old worker with the navigation's fetch event
  in it, and a page the worker answered (or only passed on) then never loaded. The cost, only while a version waits
  (usually under a second): such a page gets neither the offline copy nor, on a slow line, the cached copy after
  `SLOW`. `tests/net.smoke.js` check 9 publishes each version while its page is quiet; `tests/swcache.test.js` checks
  the rule.
- **The swap is asked again**: while a version waits, every request the old worker gets asks it to take over again
  (`SKIP`), and its `skipWaiting()` called again asks Chromium to stop the old worker again. Chromium stops a busy old
  worker the moment it is idle, and a request that comes while it stops (the page's next file or photo) starts the old
  version again, which is then not asked to stop early: without this the new version waited until the old one had been
  idle 30 s, or at most 5 min after its `skipWaiting()` (Chromium's "lame duck" timer, the only one with DevTools
  attached, as in Playwright). With it the swap ends within seconds. It happens when a new version finishes installing
  while the page still loads (a launch right after a deploy, photos held about 1 s by the R2 retry): the player gets the
  new version later, never not at all.
