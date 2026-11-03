// Offline cache: app shell first, then photos as they are viewed.
const V = 'imr-coral-id-v283';
// Photos live in their own cache that no deploy deletes (code review 2026-11-01, H3): bumping V used to wipe every
// offline photo. Capped at PH_MAX entries, oldest first out (cache keys keep insertion order).
const PH = 'imr-photos-v1',
  PH_MAX = 2500;
// The R2 bucket the pages read the photos from (core.js PHOTO_BASE, where the switch is; this only lets the worker cache
// them and fall back to the site): same paths as the site's img/.
const PHOTO_RETRY = 800, // as core.js PHOTO_RETRY
  R2 = 'https://pub-934250f83b884a4f890497f2027ce251.r2.dev',
  SITE = new URL('./', location).href;
const SHELL = [
  './',
  'index.html',
  'app.css?v=120',
  'core.js?v=31',
  'app.js?v=182',
  'sync.js?v=17',
  'progress.js?v=13',
  'model.js?v=18',
  'quiz.js?v=23',
  'learn.js?v=4',
  'flag.js?v=10',
  'quality.json?v=3',
  'picks.json?v=1',
  'data.json?v=34',
  'forms.json?v=7',
  'icon.svg',
  'fonts/source-sans-3-normal.woff2',
  'fonts/source-sans-3-italic.woff2',
  'fonts/barlow-condensed-700-normal.woff2',
  'manifest.webmanifest',
  'curation.json',
  'proto/lab.js?v=72',
  'proto/lab.css?v=52',
  'home-art.js?v=4',
  'home.js?v=27',
  'home.css?v=22',
  'tour.js?v=14',
  // Lab prototypes are loaded by lab.js; keep this list and its ?v in step with LAB.files and LAB_V.
  ...['finder', 'map', 'anatomy', 'zoom', 'elim', 'matrix', 'web', 'size', 'reveal', 'spot', 'type', 'pairs', 'gallery'].map(
    f => `proto/${f}.js?v=71`
  )
];
const get = async (c, u, n = 3) => {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(u);
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
      const old = (await caches.keys()).filter(k => k.startsWith('imr-coral-id-') && k !== V),
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
              const ch = new MessageChannel(),
                t = setTimeout(() => {
                  c.navigate(c.url).catch(() => {});
                  done();
                }, 3000);
              ch.port1.onmessage = () => {
                clearTimeout(t);
                done();
              };
              try {
                c.postMessage({t: 'imr-ver?'}, [ch.port2]);
              } catch (err) {
                clearTimeout(t);
                done();
              }
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
// Chrome; the bucket allows the site (CORS). If R2 fails (out of reach, an error), the site's copy is served instead.
const photo = async (req, u) => {
  const c = await caches.open(PH),
    r2 = u.origin === R2,
    path = r2 ? u.pathname.slice(1) + u.search : u.href.startsWith(SITE + 'img/') ? u.href.slice(SITE.length).replace(/#.*$/, '') : '',
    twin = path && (r2 ? SITE : R2 + '/') + path,
    hit = (await c.match(req, {ignoreVary: true})) || (twin && (await c.match(twin, {ignoreVary: true})));
  if (hit) return hit;
  const keep = res => {
    if (res.ok) {
      const cl = res.clone();
      c.put(req.url, cl).then(() => trim(c));
    }
    return res;
  };
  if (!r2) return fetch(req).then(keep);
  // R2 failed twice in a row a moment ago: the site straight away, for R2_PAUSE ms (no request held open on a dead host:
  // a new worker takes over only once this one has no fetch in flight).
  if (Date.now() - r2Off < R2_PAUSE) return fetch(twin).then(keep);
  // Asked twice, PHOTO_RETRY ms apart (core.js photoRetry: a passing error gets a second try on R2), before the site.
  for (let k = 0; k < 2; k++) {
    try {
      const res = await fetch(u.href, {mode: 'cors', credentials: 'omit'});
      if (res.ok) return keep(res);
      // A file missing on R2 (404: not mirrored yet) is that file's matter, not retried; any other error is R2's.
      if (res.status === 404) return fetch(twin).then(keep);
    } catch (err) {}
    if (!k) await new Promise(ok => setTimeout(ok, PHOTO_RETRY));
  }
  r2Off = Date.now();
  r2Down();
  return fetch(twin).then(keep);
};
let r2Off = 0;
const R2_PAUSE = 60e3;
// R2 failed (Codex review #392): the pages are told, so their next photos are asked from the site straight away (app.js
// R2 false, as when an <img> fails without the worker) instead of trying R2 first, file after file. A reload tries R2 again.
const r2Down = () =>
  self.clients
    .matchAll({type: 'window'})
    .then(cs => cs.forEach(c => c.postMessage({t: 'imr-r2-down'})))
    .catch(() => {});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === R2 ? u.pathname.startsWith('/img/') : u.origin === location.origin && u.pathname.includes('/img/'))
    e.respondWith(photo(e.request, u));
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
              caches.open(V).then(x => x.put(e.request, c));
            }
            return res;
          })
      )
    );
  // The other app files (the page itself, curation.json, the manifest): revalidated with the server. On a slow link
  // (field, boat) a file already cached is served after SLOW ms instead of waiting for the network, which still refreshes
  // the cache in the background (code re-review 2026-11-01, L1).
  else {
    const net = fetch(e.request, {cache: 'no-cache'}).then(res => {
      if (res.ok) {
        const c = res.clone();
        return caches
          .open(V)
          .then(x => x.put(e.request, c))
          .then(
            () => res,
            () => res
          );
      }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
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
