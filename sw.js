// Offline cache: app shell first, then photos as they are viewed.
// The shell cache is reefid-shell-vN: on activation every other shell cache goes (REPLACES), never the photo cache.
const V = 'reefid-shell-v343';
// Shell caches this worker replaces: its own name, and the one from before the rename to IMR Reef ID (2026-11-03).
const REPLACES = ['reefid-shell-', 'imr-coral-id-']; // rename-app: keep
// The question "your version?" to the open pages (app.js), under its name before the rename too.
const VER_ASK = ['reefid-ver?', 'imr-ver?']; // rename-app: keep
// Photos live in their own cache that no deploy deletes (code review 2026-11-01, H3): bumping V used to wipe every
// offline photo. Capped at PH_MAX entries, oldest first out (cache keys keep insertion order).
// Its name did not follow the rename to IMR Reef ID (2026-11-03): a new name would have thrown away, or copied while the
// app waits, up to PH_MAX offline photos per phone. It gets one with the domain move, on a new origin whose caches
// start empty anyway (docs/ROADMAP.md).
const PH = 'imr-photos-v1',
  PH_MAX = 2500;
// The admin's own files (Pierre, 2026-11-04: admin pages slow on his phone) live in a cache of their own that no deploy
// deletes either: a new app version used to drop them with the old shell cache, so the first admin visit after each
// deploy downloaded them all again (about 240 kB gzipped), even unchanged. One entry per file: a new ?v= replaces the
// older one. Only the admin's code: no player data is ever kept here.
const ADM = 'reefid-admin-files',
  ADM_FILE = /\/(admin[\w-]*\.(js|css)|autosort\.js|analysis\.js)$/;
// The R2 bucket the pages read the photos from (core.js PHOTO_BASE, where the switch is; this only lets the worker cache
// them, under either address): same paths as the site's img/.
const PHOTO_RETRY = 800, // as core.js PHOTO_RETRY
  R2 = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev',
  SITE = new URL('./', location).href;
const SHELL = [
  './',
  'index.html',
  'app.css?v=140',
  'core.js?v=50',
  'app.js?v=212',
  'sync.js?v=30',
  'progress.js?v=25',
  'model.js?v=38',
  'tips.js?v=3',
  'quiz.js?v=52',
  'learn.js?v=20',
  'flag.js?v=11',
  'quality.json?v=3',
  'picks.json?v=1',
  'data.json?v=38',
  'fish.json?v=6',
  'fish-photos.json?v=6',
  'fish-game.json?v=1',
  'forms.json?v=7',
  'icon.svg',
  'fonts/source-sans-3-normal.woff2',
  'fonts/source-sans-3-italic.woff2',
  'fonts/barlow-condensed-700-normal.woff2',
  'manifest.webmanifest',
  'curation-play.json',
  'proto/lab.js?v=85',
  'proto/lab.css?v=57',
  'home-art.js?v=6',
  'home.js?v=38',
  'home.css?v=26',
  'tour.js?v=22',
  // Lab prototypes are loaded by lab.js; keep this list and its ?v in step with LAB.files and LAB_V.
  ...[
    'idkey',
    'basics',
    'map',
    'anatomy',
    'zoom',
    'elim',
    'matrix',
    'web',
    'size',
    'reveal',
    'spot',
    'type',
    'pairs',
    'gallery',
    'cards'
  ].map(f => `proto/${f}.js?v=84`)
];
// A shell file for the new version (2026-11-05, found while looking for a device left on an old app; ~86 kbit/s at the field
// station). A versioned file (?v=: a new content is a new URL) or a font that a cache already holds, the version being
// replaced's, is copied from it rather than downloaded again: most deploys change a few files, and the install, which
// the takeover waits for, downloaded the whole shell (about 1 MB). The other files (the page, curation-play.json, the
// manifest, the icon) are asked from the server itself (cache: 'no-cache', a revalidation): taken from the browser's HTTP
// cache (GitHub Pages: 10 minutes), the new version could hold the page of the deploy before and run its old code.
const fixed = u => /[?&]v=/.test(u) || u.startsWith('fonts/');
const get = async (c, u, n = 3) => {
  if (fixed(u)) {
    const hit = await caches.match(u);
    if (hit && hit.ok) return c.put(u, hit);
  }
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(u, fixed(u) ? undefined : {cache: 'no-cache'});
      if (!r.ok) throw new Error(`${u}: ${r.status}`);
      return await c.put(u, r);
    } catch (e) {
      if (i >= n) throw e;
      await new Promise(ok => setTimeout(ok, 1000 * i));
    }
  }
};
self.addEventListener('install', e =>
  e.waitUntil(
    caches
      .open(V)
      // Each file on its own, tried up to 3 times: with addAll, one file failing on an unstable line failed the whole
      // install, so a phone on such a line never got the offline copy (tools/perf.js, 1 request in 5 failing).
      .then(c => Promise.all(SHELL.map(u => get(c, u))))
      .then(() => self.skipWaiting())
  )
);
// Activate: photos still in an old shell cache move to the photo cache first, then the old shell caches go.
self.addEventListener('activate', e =>
  e.waitUntil(
    (async () => {
      const old = (await caches.keys()).filter(k => REPLACES.some(s => k.startsWith(s)) && k !== V),
        ph = await caches.open(PH);
      for (const k of old) {
        const c = await caches.open(k);
        for (const req of await c.keys())
          if (new URL(req.url).pathname.includes('/img/') && !(await ph.match(req))) {
            const res = await c.match(req);
            if (res && res.ok) await ph.put(req, res);
          }
        await caches.delete(k);
      }
      // The Coral Finder book's crops (img/<genus>-cf-<page>-<tag>…) left the app on 2026-11-08 (Pierre: copyrighted):
      // the copies a device kept leave its photo cache too.
      for (const req of await ph.keys()) if (/\/img\/[a-z]+-cf-\d/.test(new URL(req.url).pathname)) await ph.delete(req);
      await self.clients.claim();
      // Pages too old to know about updates (Pierre, 2026-11-03: RAs who opened one of the very first versions kept it
      // open for days, so their answers never reached the sheet): each open page is asked its version; a page that
      // answers reloads by itself at its next page change (app.js UPDATED); one that does not answer within 3 s runs a
      // version from before 2026-11-03 and is reloaded now, onto this version.
      // Only the app's own page (index.html): the admin, privacy and Lab pages are left alone.
      const pages = (await self.clients.matchAll({type: 'window'})).filter(c => /\/(index\.html)?$/.test(new URL(c.url).pathname));
      await Promise.all(
        pages.map(
          c =>
            new Promise(done => {
              const t = setTimeout(() => {
                c.navigate(c.url).catch(() => {});
                done();
              }, 3000);
              // Asked under both names: a page from before the rename to IMR Reef ID (2026-11-03) knows only the old
              // one, and must not be reloaded in the middle of a question for that.
              VER_ASK.forEach(q => {
                const ch = new MessageChannel();
                ch.port1.onmessage = () => {
                  clearTimeout(t);
                  done();
                };
                try {
                  c.postMessage({t: q}, [ch.port2]);
                } catch (err) {
                  clearTimeout(t);
                  done();
                }
              });
            })
        )
      );
    })()
  )
);
const SLOW = 2000;
let trimAt = 0;
const trim = async c => {
  if (Date.now() - trimAt < 60000) return;
  trimAt = Date.now();
  const ks = await c.keys();
  for (const k of ks.slice(0, Math.max(0, ks.length - PH_MAX))) await c.delete(k);
};
// Photos: cache first; only good replies are kept, so a passing 404 is not stored for good. A photo is the same file on
// R2 and on the site, so each is looked up under both addresses (photos cached from the site before the switch to R2
// stay offline, and back again if the switch is undone). From R2 it is asked in CORS mode whatever the page asked: an
// <img> asks no-cors, whose opaque reply cannot be checked (a 404 would be kept) and weighs ~7 MB of quota each in
// Chrome; the bucket allows the site (CORS). If R2 fails (out of reach, an error, a file missing), the page is told by
// the failed request itself and picks the next source: the photo's online original, or the site's copy for a photo with
// none (app.js photoFail; Pierre, 2026-11-05: the photos with an online original leave img/, so the worker no longer
// serves the site's copy by itself).
// The same file at its other address (R2 for a site photo, the site for an R2 one), and a photo looked up under both.
const twinOf = u => {
  const r2 = u.origin === R2,
    path = r2 ? u.pathname.slice(1) + u.search : u.href.startsWith(SITE + 'img/') ? u.href.slice(SITE.length).replace(/#.*$/, '') : '';
  return path && (r2 ? SITE : R2 + '/') + path;
};
const photoHit = (c, req, twin) => c.match(req, {ignoreVary: true}).then(h => h || (twin && c.match(twin, {ignoreVary: true})));
const photo = async (req, u) => {
  const c = await caches.open(PH),
    r2 = u.origin === R2,
    twin = twinOf(u),
    hit = await photoHit(c, req, twin);
  if (hit) return hit;
  const keep = res => {
    if (res.ok) {
      const cl = res.clone();
      c.put(req.url, cl).then(() => trim(c));
    }
    return res;
  };
  if (!r2) return fetch(req).then(keep);
  // R2 failed twice in a row a moment ago: the page's fallback at once, for R2_PAUSE ms (no request held open on a dead
  // host: a new worker takes over only once this one has no fetch in flight). The photo cache was asked first, so a
  // failure rejects: the request fails and the page picks the next source.
  if (Date.now() - r2Off < R2_PAUSE) throw new Error('R2 out');
  // Asked twice, PHOTO_RETRY ms apart (core.js photoRetry: a passing error gets a second try on R2), before the page's
  // fallback.
  for (let k = 0; k < 2; k++) {
    try {
      const res = await fetch(u.href, {mode: 'cors', credentials: 'omit'});
      if (res.ok) return keep(res);
      // A file missing on R2 (404: not mirrored yet) is that file's matter, not retried; any other error is R2's.
      if (res.status === 404) return res;
    } catch (err) {}
    if (!k) await new Promise(ok => setTimeout(ok, PHOTO_RETRY));
  }
  r2Off = Date.now();
  throw new Error('R2 out');
};
let r2Off = 0;
const R2_PAUSE = 60e3;
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === R2 ? u.pathname.startsWith('/img/') : u.origin === location.origin && u.pathname.includes('/img/'))
    e.respondWith(photo(e.request, u).catch(() => Response.error()));
  else if (u.origin !== location.origin) return;
  // Versioned files (?v= in the URL: a new version is a new URL) and the fonts never change: cache first, no network at
  // all once cached (Pierre, 2026-11-01: fluid on poor connections; each launch used to revalidate every file).
  else if (u.searchParams.has('v') || u.pathname.includes('/fonts/'))
    e.respondWith(
      caches.match(e.request).then(
        hit =>
          hit ||
          fetch(e.request).then(res => {
            if (res.ok) {
              const c = res.clone();
              if (!ADM_FILE.test(u.pathname)) caches.open(V).then(x => x.put(e.request, c));
              else
                caches.open(ADM).then(async x => {
                  for (const k of await x.keys()) if (new URL(k.url).pathname === u.pathname) await x.delete(k);
                  await x.put(e.request, c);
                });
            }
            return res;
          })
      )
    );
  // The other app files (the page itself, curation-play.json, the manifest): revalidated with the server. On a slow link
  // (field, boat) a file already cached is served after SLOW ms instead of waiting for the network, which still refreshes
  // the cache in the background (code re-review 2026-11-01, L1).
  // The page's reply never waits for its cache copy (2026-11-04, net.smoke step 9: the admin page never reached
  // DOMContentLoaded although the server had answered in 1 ms; the reply waited for a write into the shell cache that
  // never ended, the old worker writing into the cache a new version's activation was replacing). The copy, taken
  // before the reply is read, is written in the event's lifetime instead.
  else {
    let copy = null;
    const net = fetch(e.request, {cache: 'no-cache'}).then(res => {
      if (res.ok) copy = res.clone();
      return res;
    });
    // The copy waits at most 30 s (a stalled Cache Storage must not keep the event open for good).
    e.waitUntil(
      Promise.race([
        net.then(() => copy && caches.open(V).then(x => x.put(e.request, copy))),
        new Promise(ok => setTimeout(ok, 30000))
      ]).catch(() => {})
    );
    e.respondWith(
      caches.match(e.request).then(hit =>
        !hit
          ? net
          : Promise.race([
              net.then(
                r => (r.ok ? r : hit),
                () => hit
              ),
              new Promise(ok => setTimeout(() => ok(hit), SLOW))
            ])
      )
    );
  }
});
