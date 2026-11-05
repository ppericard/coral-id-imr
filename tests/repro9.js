// Step 9 of tests/net.smoke.js in a loop, for the DOMContentLoaded hang investigation. Not committed.
// ROOT=<checkout> N=<iterations> OLD=1 (CACHE_WAIT effectively off: the sw.js before #531) CPU=<throttle rate> node repro9.js
const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const {chromium} = require(path.join(ROOT, 'tests/calm.js'));
const slot = require(path.join(ROOT, 'tests/slot.js'));
const N = +process.env.N || 3,
  OLD = !!process.env.OLD,
  CPU = +process.env.CPU || 0;
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'};
// Instrumentation in the worker: every Cache Storage call and every fetch still pending, with its age.
const PRE = `
self.__pend = new Map(); self.__log = []; let __n = 0; const __t0 = Date.now();
const __ID = Math.random().toString(36).slice(2, 6) + '/' + (self.__DEPLOY || 0);
const __L = s => { self.__log.push((Date.now() - __t0) + ' ' + s); if (self.__log.length > 400) self.__log.shift();
  try { fetch('/__log?' + encodeURIComponent(__ID + ' ' + s), {cache: 'no-store'}).catch(() => {}); } catch (e) {} };
__L('script start');
const __wrap = (o, k, lab) => { const f = o[k]; o[k] = function (...a) { const id = ++__n, d = lab + '.' + k + '(' + String((a[0] && a[0].url) || a[0] || '').replace(location.origin, '') + ')';
  __pend.set(id, {d, t: Date.now()}); const p = f.apply(this, a); Promise.resolve(p).then(() => __pend.delete(id), e => (__pend.delete(id), __L('ERR ' + d + ' ' + e))); return p; }; };
['match', 'open', 'delete', 'keys', 'has'].forEach(k => __wrap(CacheStorage.prototype, k, 'caches'));
['put', 'match', 'keys', 'delete', 'add', 'addAll', 'matchAll'].forEach(k => __wrap(Cache.prototype, k, 'cache'));
__wrap(self, 'fetch', 'net');
const __rw = FetchEvent.prototype.respondWith;
FetchEvent.prototype.respondWith = function (p) { const id = ++__n, d = 'respondWith(' + this.request.url.replace(location.origin, '') + ')';
  __pend.set(id, {d, t: Date.now()}); Promise.resolve(p).then(r => (__pend.delete(id), __L('replied ' + d + ' ' + (r && r.status))), e => (__pend.delete(id), __L('reply failed ' + d))); return __rw.call(this, p); };
const __wu = ExtendableEvent.prototype.waitUntil;
ExtendableEvent.prototype.waitUntil = function (p) { const id = ++__n, d = 'waitUntil(' + this.type + (this.request ? ' ' + this.request.url.replace(location.origin, '') : '') + ')';
  __pend.set(id, {d, t: Date.now()}); __L(d + ' start'); Promise.resolve(p).then(() => (__pend.delete(id), __L(d + ' done')), e => (__pend.delete(id), __L(d + ' failed ' + e))); return __wu.call(this, p); };
self.addEventListener('fetch', e => __L('fetch ' + e.request.url.replace(location.origin, '')));
self.__dump = () => ({pend: [...__pend.values()].map(x => x.d + ' ' + (Date.now() - x.t) + 'ms'), log: self.__log.slice(-60)});
`;
let SWV = 0,
  HOLD = null;
const HELD = [],
  ADMIN_HITS = [];
let T0 = Date.now(), SLOG = [];
const L = s => SLOG.push(`${Date.now() - T0} ${s}`);
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/__log?')) { L('W ' + decodeURIComponent(req.url.slice(7))); res.writeHead(204); return res.end(); }
  L('req ' + req.url + ' ' + (req.headers['service-worker'] ? '[sw-script]' : '') + (req.headers['sec-fetch-dest'] || '') + ' ' + (req.headers['sec-fetch-mode'] || ''));
  res.on('finish', () => /admin\.html|sw\.js/.test(req.url) && L('done ' + req.url));
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (HOLD && HOLD.test(u)) return void HELD.push(res);
  if (u === '/admin.html') {
    const hit = {url: req.url, at: Date.now(), done: 0};
    ADMIN_HITS.push(hit);
    res.on('finish', () => (hit.done = Date.now()));
  }
  fs.readFile(f, (e, b) => {
    if (e) return res.writeHead(404), res.end();
    const type = TYPES[path.extname(f)] || 'application/octet-stream';
    let body = b;
    if (u === '/sw.js') {
      let s = String(b);
      if (OLD) s = s.replace('CACHE_WAIT = 3000', 'CACHE_WAIT = 1e9');
      body = Buffer.from(`self.__DEPLOY = ${SWV};\n` + PRE + s + (SWV ? `\n// deploy ${SWV}\n` : ''));
    }
    if (/^(text\/|application\/(json|manifest)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.writeHead(200, {'Content-Type': type, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding'});
      return res.end(zlib.gzipSync(body));
    }
    res.writeHead(200, {'Content-Type': type});
    res.end(body);
  });
});
const track = pg => {
  const s = {n: 0, at: Date.now()},
    end = () => ((s.n = Math.max(0, s.n - 1)), (s.at = Date.now()));
  pg.on('request', () => (s.n++, (s.at = Date.now())));
  pg.on('requestfinished', end);
  pg.on('requestfailed', end);
  return async () => {
    for (const t = Date.now(); (s.n || Date.now() - s.at < 500) && Date.now() - t < 20000; ) await pg.waitForTimeout(100);
  };
};
const INTROS = JSON.stringify(Object.fromEntries([...Object.keys(require(path.join(ROOT, 'data.json')).gen), 'Millepora'].map(n => [n, [0, 1]])));
const init = () => (localStorage.setItem('reefid-tour', '1'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'));
const initI = s => {
  localStorage.getItem('reefid-sync-coral-intro') || localStorage.setItem('reefid-sync-coral-intro', s);
  localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
};
const ready = p => p.waitForFunction(() => window.APP_READY && !/Loading/.test(document.getElementById('view').innerText), null, {timeout: 20000});

async function once(base, it) {
  const fails = [];
  SWV = 0;
  const b9 = await chromium.launch({args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
  const newCtx = async () => {
    const c = await b9.newContext({viewport: {width: 390, height: 800}});
    await c.addInitScript(initI, INTROS);
    await c.addInitScript(init);
    return c;
  };
  const thr = async pg => CPU && (await (await pg.context().newCDPSession(pg)).send('Emulation.setCPUThrottlingRate', {rate: CPU}));
  const ctx = await newCtx();
  T0 = Date.now(); SLOG = [];
  const p = await ctx.newPage(),
    pQuiet = track(p);
  const cdp = await ctx.newCDPSession(p);
  cdp.on('ServiceWorker.workerVersionUpdated', e => e.versions.forEach(v => L(`V${v.versionId} ${v.runningStatus} ${v.status}${v.controlledClients && v.controlledClients.length ? ' clients ' + v.controlledClients.length : ''}`)));
  cdp.on('ServiceWorker.workerErrorReported', e => L('SWERR ' + JSON.stringify(e)));
  await cdp.send('ServiceWorker.enable');
  await thr(p);
  await p.goto(base);
  await ready(p);
  await p.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready));
  await p.reload();
  await ready(p);
  await p.waitForFunction(() => typeof HAVE !== 'undefined' && HAVE >= 5, null, {timeout: 20000});
  await p.evaluate(() => (window.__old = 1));
  await pQuiet();
  SWV = 1;
  await p.evaluate(() => swCheck());
  await p.waitForFunction(() => UPDATED, null, {timeout: 30000}).catch(() => fails.push('A: no takeover'));
  await p.evaluate(() => (location.hash = 'genera'));
  await p.waitForFunction(() => !window.__old && window.APP_READY && location.hash === '#genera', null, {timeout: 20000}).catch(() => fails.push('A: no reload'));
  const r = await newCtx();
  const f = await r.newPage(),
    fQuiet = track(f);
  await thr(f);
  await f.goto(base);
  await ready(f);
  await f.evaluate(() =>
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(
      () => new Promise(ok => (navigator.serviceWorker.controller ? ok() : navigator.serviceWorker.addEventListener('controllerchange', ok)))
    )
  );
  await f.waitForFunction(() => typeof HAVE !== 'undefined' && HAVE >= 5, null, {timeout: 20000});
  await fQuiet();
  SWV = 9;
  await f.evaluate(() => swCheck());
  await f.waitForFunction(() => UPDATED, null, {timeout: 30000}).catch(() => fails.push('B: missed version'));
  await r.close();
  const q = await ctx.newPage(),
    qQuiet = track(q);
  await thr(q);
  L('--- q opens (server SWV ' + SWV + ')');
  await q.goto(base + 'admin.html?demo');
  await q.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera && navigator.serviceWorker.controller, null, {timeout: 20000});
  await qQuiet();
  await q.evaluate(() => (window.__old = 1));
  L('--- SWV 2');
  SWV = 2;
  await q.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
  await q.waitForFunction(() => UPDATED, null, {timeout: 30000}).catch(() => fails.push('C: no takeover'));
  await q.evaluate(() => (location.hash = '~cand'));
  await q.waitForFunction(() => !window.__old && location.hash === '#~cand', null, {timeout: 20000}).catch(() => fails.push('C: no reload'));
  await qQuiet();
  L('--- HOLD');
  HOLD = /cand\.json$/;
  const pend = new Map();
  ctx.on('request', r => pend.set(r, `${r.url().replace(base, '')}${r.serviceWorker && r.serviceWorker() ? ' (worker)' : ''}`));
  ctx.on('requestfinished', r => pend.delete(r));
  ctx.on('requestfailed', r => pend.delete(r));
  L('--- q2 opens');
  const q2At = Date.now(),
    q2 = await ctx.newPage();
  await thr(q2);
  const t0 = Date.now();
  let hang = null;
  await q2.goto(base + 'admin.html?demo', {waitUntil: 'domcontentloaded', timeout: 30000}).catch(async e => {
    const ws = [];
    for (const w of ctx.serviceWorkers()) ws.push(await Promise.race([w.evaluate(() => self.__dump && self.__dump()), new Promise(ok => setTimeout(() => ok('worker did not answer'), 5000))]));
    hang = {
      pending: [...pend.values()],
      hits: ADMIN_HITS.filter(h => h.at >= q2At).map(h => `${h.url} +${h.at - q2At} ${h.done ? 'answered +' + (h.done - q2At) : 'never answered'}`),
      held: HELD.length,
      slog: SLOG.slice(-150),
      workers: ws
    };
  });
  const dcl = Date.now() - t0;
  HOLD = null;
  HELD.splice(0).forEach(x => x.destroy());
  await b9.close();
  return {fails, dcl, hang};
}

(async () => {
  await slot('repro9');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let hangs = 0;
  for (let i = 0; i < N; i++) {
    const t = Date.now();
    const r = await once(base, i).catch(e => ({fails: ['crash ' + String(e).slice(0, 200)], dcl: -1}));
    if (r.hang) hangs++;
    console.log(`#${i} ${Math.round((Date.now() - t) / 1000)}s dcl=${r.dcl}ms fails=${JSON.stringify(r.fails)}${r.hang ? ' HANG ' + JSON.stringify(r.hang, null, 1) : ''}`);
  }
  console.log(`hangs ${hangs}/${N} OLD=${OLD} CPU=${CPU}`);
  server.close();
  process.exit(0);
})();
