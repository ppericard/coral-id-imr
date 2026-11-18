# Loading and speed: tiers, photos on a slow line, new versions

How the players' app loads and stays fast on a poor connection and a low-end phone: the order its files come in, the
photo sizes it picks, how a photo that fails is replaced, and how a new version reaches an open page. This is the
specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and
the PRs. The service worker itself is [service-worker.md](service-worker.md); the pages and Settings
[front-end.md](front-end.md); where the photo files live and the R2 fallback [photos.md](photos.md).

The case it is built for: a first visit from the IMR field station, served from a nearby CDN point (about 0.4 s of
latency) at about 86 kbit/s, and a fluent player who answers in about 8 s, less than one question's photos take on that
line. Measured with `node tools/perf.js` (network × CPU profiles; `node tools/perf.js field`, that field link) and, for
the progress sync's bytes and round trips per answer, `node tools/syncperf.js`
([sync.md › Lighter saves](sync.md#saving-and-loading)).

## Load order in tiers

The files come one tier after the other, so what the player waits for never shares the line with the rest:

1. **Home**: `app.css`, `proto/lab.css` (which also holds the layout of Home, My progress and the games' side columns,
   `.pgame`, `data-page=lab`), `home.css`, the main font, `core.js`, `app.js`, `sync.js`, `home-art.js`, `home.js`,
   `tour.js`, `data.json`, `curation.json`.
2. **The photo quiz**: `model.js`, `tips.js` (the "Did you know?" tips' registry and rules), `quiz.js`, `learn.js` (the
   quiz uses it for its look-alike pairs and mix-up montages), `progress.js` (each answer updates the achievements, and
   it opens My progress at once; a sign-in from the tour waits for it), `live.js` (the live mode), with `forms.json`,
   `quality.json` and `picks.json`, which the draw and the photo slots use: the data is rebuilt with them, then the
   achievements are counted and the sheet's photo statistics asked for.
3. **The photos of the next quiz questions** (below).
4. **The sheet's reads**: the sync, the anonymous answers, the leaderboard, the achievement shares.
5. **The rest**: `flag.js`, `proto/lab.js` with the Lab; then the service worker is registered, and its install caches
   every other shell file (the italic and condensed fonts, the Lab…) for the next visit.

The tiers are listed in `index.html`: tier 1 as `<link rel=preload as=script data-tier=1>`, later ones as bare
`<link data-tier=N href>`, which fetch nothing until the loader turns them into preloads. `loadTier(N)` in the inline
loader (its own CSP hash) starts tiers 2..N at once and resolves once their scripts have run, in order, each inserted
once the one before has run, each failed one tried again up to 3 times (after 1, 2, 3 s); `window.BOOT` resolves once
tier 1 has run, and `app.js` waits for it before the first page (`domReady`). `need(N)` in `app.js` adds each tier's
set-up (`SETUP`), and `HAVE` is the last tier in. A failed stylesheet is tried again the same way, and so are the Lab
prototypes (`labLoad`). `data.json` is preloaded too (`as=fetch crossorigin`, the same address as the fetch, so it
downloads alongside the scripts), and the JSON files are fetched again on failure, up to 3 tries (`getR`); if
`data.json` still fails, the page offers Try again.

A page opened before its files arrived (`pageTier`: Home, About and Delete my account 1; the quiz, the duels, the Learn
pages, My progress, the leaderboard, the achievements and the live mode 2; Tools and the Coral ID Key 5) shows the
loading bar and asks for its tier at once, ahead of the queue (`route()`); a link straight to a page asks for its tier at
start-up, alongside Home's files.

**Home's doors before the data** (`app.js` `beforeData`): once tier 1's scripts have run (`BOOT`), the doors are drawn
with the Learn door's band and the Identify door's photo dark (`home.js` `viewHome` without `DATA`; that photo, drawn at
once, would share the slow line with the data), for a subject whose doors need none of its own files (`UNITS`
`doorsFirst`: the corals; a tree subject's Home waits for its own files). Once the data is in, the start-up's `route()`
draws Home again with its band (`homeAgain`), keeping the scroll, the open ? help and the focus. A page tapped before the
data shows the loading bar and asks for its tier at once; the welcome tour (not offered in ? before the data), the cards
and the notices wait for the data. Home's own photos are lazy thumbnails.

**Under "Loading…"** a bar moves one step per script run and one for `data.json` (`bootTick`; it counts tier 1, or the
tiers the first page needs: `bootMax`), and after 6 s a line says only the first visit is this slow.

**What tests wait for**: `window.APP_READY` is set once tier 2 is in (Home, the quiz and the Learn pages work);
`window.ROUTED` holds the address of the last page `route()` drew, set only by a full drawing; `window.CARDS_SAID`
(`progress.js`) reads true once start-up has settled its one-time cards (the notices that waited for the visit's first
sync have run, `subjHello` is not waiting for its calm moment, no card waits to try again unless the card it waits behind
is on screen), so a test that proves a card does not come waits for it rather than for a fixed time.

## Start-up

- Start-up never waits for `curation.json` when a kept copy exists (`CUR_KEPT`: the last curation read, kept in
  `localStorage` `reefid-curation-last`); `curRefresh` reads it right after, and a change applies at the next screen.
- The tree subjects' units are built once, in the first `build()` (their load, `treeLoad`, leaves them to it while
  `DATA` is not built). The games' units with a photo to show (`app.js` `pool()`, asked several times a question) come
  from `model.js` `photoAny`, which tells what `photoSet(n).shown.length` would without drawing (a draw on a big fish
  family costs a millisecond or more; `tests/photoany.test.js`).
- Leaving a page drops its photos still loading (`route()`), so a slow line goes to the new page.
- The leaderboard and achievement shares are kept on the device (`reefid-board-cache`, one per subject, such as
  `reefid-fish-board-cache`; `reefid-achs-cache`): drawn at once, then refreshed. They are fetched with tier 4, after the
  quiz and its next photos.
- The fonts are served from `fonts/` (latin subset, SIL OFL), not from Google Fonts.

## The players' copy of the curation

The deploy writes `curation-play.json` from `curation.json` with `tools/curplay.py`, without what the app never reads:
the coral auto-sort log `auto`, the admin's `retest` and the players' `flag`, the Candidates' reject marks in the coral
`seen` (it keeps the `rep:` marks, the reports thanked), the fish judging `tags` and `ease`, the fish `auto` log except
its undone adds, and the same in every tree subject's part (`curplay.py` `TREE_PARTS`, the sea slugs' too; a part's
`seen` stays whole, the game reads it): about 0.6 million characters instead of 2.1 million. It is part of the
service worker's shell, so the first offline launch after a deploy still has Pierre's choices. `curation.json` itself
is served unchanged and the admin reads it whole; the app falls back to `curation.json` where the copy is missing (a
local server where the tool was not run); the smokes write it through `tests/calm.js`; `tests/curplay.test.js` checks
that the app builds the same games from both and that no player script reads a field the copy drops.

## The quiz plans ahead

The next questions are chosen ahead, up to 3 in the photo quiz (`AHEAD`; one in the Duel tab), and their photos fetched
meanwhile, so Next shows one at once (`planNext`, `NEXTQ` holding the next ones in `.next`, each keyed on the answers
count it is for and the genera in play). The queue is topped up when a question shows and after each answer, and the
first questions are planned as soon as tier 2 is in.

Planning ahead keeps the rules of the draw. A question that changes what comes next (one with cards, an exam question, a
duel slipped in, an "Again") ends the queue: nothing is chosen past it before it is answered. A wrong answer drops the
queue and puts the planner's own state back (`dropPlans`: the genus asked last, the duel and "Again" spacing), so the
"Again" still comes one question later. After a right answer the questions already chosen stay: their weights lag up to
2 answers, and a new card, exam question or duel can come up to 2 questions later than without planning ahead.

The photos come in order of need, two at a time, question after question: the cards of the genera met, then the photos
shown small then full size, then the hint and the other views (`pump`, with `fetch()`, which unlike `new Image()` does
not hold the page's load event). All at once they would share a slow line, and the first photo would come later than
without preloading.

## Photo sizes

Each photo exists in 1600, 960 (`-m`), 480 (`-s`) and 240 px (`-t`) ([photos.md › The files](photos.md#where-the-files-are)).

- **A big photo** (the quiz, Look-alikes, a sheet's cover, the Lab tools) gets the smallest file that covers its box at
  the screen's density counted up to 2x (`fit`). The quiz guesses the box from the last question with as many photos
  (`QBOX`, so the preload fetches the right file), and a box bigger than guessed loads the bigger file (`upsizeImg`,
  `upsize`; never a smaller one).
- **Cards and strips** use `srcset` with the 480, 960 and 1600 px files (the card's `sizes` measured per S / M / L
  setting). **Thumbnails** (the Home band, the progress tiles, the look-alike pairs, the tips) use `thumb()`: 240 or 480 px
  by drawn width and density (a Home tile on a phone is about 60 px wide: 240 px, about 10 KB). The Home ReefCloud art has
  a 760 px version for phones. Leaving a page drops `srcset` with `src`, or the download goes on. The enlarged view loads
  the 1600 px file over the 480 px one.
- **A photo not downloaded yet** (`r: 1`: a candidate just added, and the photos of the extra genera only the Coral ID
  Key shows, `DATA.x.gen`; the game genera's are all downloaded) loads from iNaturalist with two files only (`img()`):
  `medium` (500 px) for the 480 px size,
  `large` (1024 px) for 960 and 1600 px; `resized()`, `upsizeImg` and the preload (`pfUrls`) leave it alone.
- A quiz photo carries its name in `data-f` (`quiz.js` `question`), so the failed-photo report (`ev('photo')`, the
  admin's "Photos not loaded") and the tests (`net.smoke.js`, `profiles.smoke.js`, `tools/perf.js`) name an iNaturalist
  photo by its `f`, not by its address.
- Each game photo shows its 480 px version (`data-lo`, also the blurred backdrop) as the image's background until the
  bigger one is in.

## Photo quality setting

`reefid-photo-q`: Auto (the default), Saver, Full.

- **Saver** takes the 480 px file for a big photo whatever its box (shown whole at its own size on a bigger desktop box,
  `LOWRES`), drops the 1600 px file from `srcset`, gives thumbnails their 240 px file and Home's ReefCloud art its 760 px
  one, and the enlarged view starts at 960 px (1600 on a click). Saver never moves a shown photo to a bigger file
  (`upsizeImg`); only the enlarged view does, on a tap.
- **Auto** is Saver when the browser reports the data saver or a 2g / 3g connection (the Network Information API, Chrome
  on Android), or, once the app has measured the line itself, when it is under 500 kbit/s (`LINK.SLOW`). The browser's
  estimate only counts before a measure: on the field link it did not flag the line, and Safari and Firefox have no such
  API. The measure (`linkMeasure`, `LINK`) is the bytes the page got from the network over the time spent receiving them
  (Resource Timing; overlapping downloads counted once, cached files not at all), once 40 KB are in; it is kept in
  `reefid-link` for a launch served from the cache. A 480 px photo on a large desktop screen is a real loss, so a fast
  line keeps the bigger files.
- **Full** always loads 1600 px for big photos.

## A photo that fails

A failing photo is retried twice (after 1 s, then 4 s), then replaced by its 480 px version. If that fails too, the frame
shows the "photo missing" tile (`app.js` `noPhoto`, [DESIGN.md](../DESIGN.md)), the question's answers close, it offers
another one, and nothing is counted. The whole chain for a site photo: R2 → R2 once more (800 ms) → its online original
at a light size (or the site's `img/` for a photo with none: [photos.md › Fallback](photos.md#served-from-cloudflare-r2))
→ 2 retries → the 480 px version (online `medium`, or R2's copy first under the service worker) → the tile. On a slow
line (Saver) the files asked are already the 480 px ones (`fit`), so the online fallback is `medium` from the start.

## New versions

**New versions reach players without a manual reload**: each deploy changes `sw.js` (`V`), the browser checks it at each
launch and the app again when it comes back into view (5 min apart) and every 30 min (`swCheck`); the new worker installs
in the background and takes over, and the page reloads itself at its next calm moment.
**Never in the middle of a question**: back in view, the page reloads only when no question waits for its answer, and
Next in a game is a page change, so a new version comes between two questions
([service-worker.md › Activate](service-worker.md#activate): `UPDATED`, `QOPEN`, `route()`). A page from a
version that cannot answer the worker's version question is reloaded by the worker, once. A page no service worker
controls reads the deployed page's build number instead (`buildCheck`). The admin page reloads the same way (every
click is already in its draft; not while the draft could not be saved).

**Every request to the sheet carries the app's version** (`av`), so a device left on an old version can be found:

- a request without it comes from a page older than any version that sends it: the sheet logs it in Events as kind
  `old` (with the name or anonymous id it carries), at most once an hour per sender and request (`Code.gs` `oldApp_`);
- the app's photo statistics request (at launch, then every 10 minutes in view) also carries its anonymous device id
  `dev` (the Device of its events, which the Pages tab ties to the player's answers) and `up`, the minutes its page has
  been open (never from a local copy). The sheet (`Code.gs` `behind_`) keeps the newest build reported (Script Property
  `BUILD_TOP`; a build far ahead of it, `BUILD_JUMP`, refused) and logs in Events, kind `old`, Device the id, App the
  version, a device on an older build when its page stayed open 30 min (`OLD_OPEN`) on a version replaced an hour
  (`OLD_H`) before, or when it starts a version replaced a day (`OLD_STUCK`) before; at most once per device every 6
  hours;
- so every read the repository's own tools make carries an `av` that is no build number (`admin.js` `av=admin`,
  `tools/brief.py` `av=brief`, `tools/learnsim.js --stats live` `av=learnsim`, `tools/health.py` `av=health`; by hand
  `curl "<SYNC_URL>?stats=1&av=tool"`), checked by `tests/statsav.test.js`: a `?stats=1` read without one would be
  logged as an old app.
