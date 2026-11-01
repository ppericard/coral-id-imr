// Offline cache: app shell first, then photos as they are viewed.
const V = 'imr-coral-id-v165';
// Photos live in their own cache that no deploy deletes (code review 2026-11-01, H3): bumping V used to wipe every
// offline photo. Capped at PH_MAX entries, oldest first out (cache keys keep insertion order).
const PH = 'imr-photos-v1', PH_MAX = 2500;
const SHELL = ['./', 'index.html', 'app.css?v=75', 'app.js?v=111', 'flag.js?v=4', 'quality.json?v=3', 'data.json?v=25', 'forms.json?v=7', 'icon.svg', 'manifest.webmanifest', 'proto/lab.js?v=52', 'proto/lab.css?v=40', 'home-art.js?v=3', 'home.js?v=22', 'home.css?v=19', 'tour.js?v=4',
  // Lab prototypes are loaded by lab.js; keep this list and its ?v in step with LAB.files and LAB_V.
  ...['finder', 'map', 'anatomy', 'zoom', 'elim', 'matrix', 'web', 'size', 'reveal', 'spot', 'pairs', 'gallery'].map(f => `proto/${f}.js?v=52`)];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
// Activate: photos still in an old shell cache move to the photo cache first, then the old shell caches go.
self.addEventListener('activate', e => e.waitUntil((async () => {
  const old = (await caches.keys()).filter(k => k.startsWith('imr-coral-id-') && k !== V), ph = await caches.open(PH);
  for (const k of old) {
    const c = await caches.open(k);
    for (const req of await c.keys()) if (new URL(req.url).pathname.includes('/img/') && !(await ph.match(req))) { const res = await c.match(req); if (res && res.ok) await ph.put(req, res); }
    await caches.delete(k);
  }
  await self.clients.claim();
})()));
let trimAt = 0;
const trim = async c => { if (Date.now() - trimAt < 60000) return; trimAt = Date.now(); const ks = await c.keys(); for (const k of ks.slice(0, Math.max(0, ks.length - PH_MAX))) await c.delete(k); };
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  // Photos: cache first; only good replies are kept, so a passing 404 is not stored for good.
  if (u.pathname.includes('/img/')) e.respondWith(caches.open(PH).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) { const cl = res.clone(); c.put(e.request, cl).then(() => trim(c)); } return res; }))));
  // App files: always revalidate with the server so an update never mixes new and old files.
  else e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(e.request, c)); } return res; }).catch(() => caches.match(e.request)));
});
