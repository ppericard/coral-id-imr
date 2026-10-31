// Offline cache: app shell first, then photos as they are viewed.
const V = 'imr-coral-id-v121';
const SHELL = ['./', 'index.html', 'app.css?v=51', 'app.js?v=78', 'flag.js?v=3', 'quality.json?v=1', 'data.json?v=20', 'forms.json?v=7', 'icon.svg', 'manifest.webmanifest', 'proto/lab.js?v=42', 'proto/lab.css?v=29', 'home-art.js?v=3', 'home.js?v=22', 'home.css?v=16', 'tour.js?v=4',
  // Lab prototypes are loaded by lab.js; keep this list and its ?v in step with LAB.files and LAB_V.
  ...['finder', 'map', 'anatomy', 'zoom', 'elim', 'matrix', 'web', 'size', 'reveal', 'spot', 'pairs', 'gallery'].map(f => `proto/${f}.js?v=42`)];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('imr-coral-id-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  // Shell files: network first so updates show up; photos: cache first.
  if (u.pathname.includes('/img/')) e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(e.request, c)); return res; })));
  // App files: always revalidate with the server so an update never mixes new and old files.
  else e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(e.request, c)); return res; }).catch(() => caches.match(e.request)));
});
