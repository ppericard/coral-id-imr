// Speed check from a player's side (Pierre, 2026-11-01: "everything must stay very fluid, on low-end phones and on the
// poor connections common in the Philippines"). Two axes: the network (speed, and stability: some requests fail) and
// the phone's power (Chromium CPU throttling: 6x slower ~ a cheap Android phone). Not run by CI (a few minutes, and the
// numbers are for reading, not pass/fail). Locally:
//   node tools/perf.js            all profiles
//   node tools/perf.js brick      only the profiles whose name contains "brick"
// Measures, per profile: cold start (first visit: Home shown, then the first quiz photo), warm start (service worker
// and cache in place), the time each main page takes from the click to its paint, quiz clicks (answer -> feedback,
// Next -> next photo shown), the leaderboard (sync script mocked with a 2 s delay, as a cold Apps Script), and the main
// thread blocked by long tasks (> 50 ms) during the run.
const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');
const {chromium} = require('playwright');
const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
// Like GitHub Pages: gzip for text, ETag revalidation, max-age=600.
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) return res.writeHead(403), res.end();
  fs.readFile(f, (e, b) => {
    if (e) return res.writeHead(404), res.end();
    const ext = path.extname(f),
      tag = '"' + b.length + '-' + fs.statSync(f).mtimeMs + '"';
    if (req.headers['if-none-match'] === tag) return res.writeHead(304), res.end();
    const h = {'Content-Type': TYPES[ext] || 'application/octet-stream', ETag: tag, 'Cache-Control': 'max-age=600'};
    if (/\.(html|js|css|json|svg|webmanifest)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
      h['Content-Encoding'] = 'gzip';
      b = zlib.gzipSync(b);
    }
    res.writeHead(200, h);
    res.end(b);
  });
});
const NET = {
  wifi: null,
  '4G': {d: 9e6, u: 3e6, l: 60},
  '3G': {d: 1.6e6, u: 0.75e6, l: 150},
  'slow 3G': {d: 0.4e6, u: 0.4e6, l: 400}
};
const PROFILES = [
  {name: 'good phone, 4G', net: '4G', cpu: 1},
  {name: 'good phone, slow 3G', net: 'slow 3G', cpu: 1},
  {name: 'brick, 3G', net: '3G', cpu: 6},
  {name: 'brick, slow 3G', net: 'slow 3G', cpu: 6},
  {name: 'brick, 3G, unstable (1 request in 5 fails)', net: '3G', cpu: 6, fail: 5}
];
const PAGES = ['genera', 'g-Acropora', 'quiz', 'progress', 'board', 'ach', 'finder', 'lab', 'home'];
const s1 = ms => (ms / 1000).toFixed(1) + ' s';
const ms = x => Math.round(x) + ' ms';

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const only = process.argv[2];
  const b = await chromium.launch();
  for (const pr of PROFILES.filter(p => !only || p.name.includes(only))) {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
    let nreq = 0;
    // Everything off this server is cut (fonts, iNat), except the sync script, mocked: slow like a cold Apps Script.
    await ctx.route(
      u => !u.href.startsWith(base),
      async r => {
        if (/script\.google/.test(r.request().url())) {
          await new Promise(ok => setTimeout(ok, 2000));
          const u = r.request().url();
          return r.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(/board=1/.test(u) ? {ok: true, rows: [['Ana', 42, 1180], ['Ben', 30, 0]]} : /achs=1/.test(u) ? {ok: true, n: 2, counts: {}} : {ok: true})
          });
        }
        return r.abort();
      }
    );
    if (pr.fail)
      await ctx.route(
        u => u.href.startsWith(base) && !/\.html$|\/$/.test(new URL(u.href).pathname),
        r => (++nreq % pr.fail === 0 ? r.abort('connectionreset') : r.fallback())
      );
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    const n = NET[pr.net];
    if (n) await cdp.send('Network.emulateNetworkConditions', {offline: false, downloadThroughput: n.d / 8, uploadThroughput: n.u / 8, latency: n.l});
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: pr.cpu});
    let bytes = 0;
    cdp.on('Network.loadingFinished', e => (bytes += e.encodedDataLength));
    await p.addInitScript(() => {
      window.__lt = 0;
      try {
        new PerformanceObserver(l => l.getEntries().forEach(e => (window.__lt += e.duration - 50))).observe({type: 'longtask', buffered: true});
      } catch (e) {}
      // The welcome tour would cover the pages: marked as seen.
      try {
        localStorage.setItem('imr-tour', '1');
      } catch (e) {}
    });
    const out = [];
    const ready = () => p.waitForFunction(() => window.APP_READY && !/Loading/.test(document.getElementById('view').innerText), null, {timeout: 180000});
    const photoShown = () =>
      p.waitForFunction(() => [...document.querySelectorAll('#view .qph img')].some(i => i.complete && i.naturalWidth > 0), null, {timeout: 60000}).then(
        () => true,
        () => false
      );
    // 1. Cold start.
    let t = Date.now();
    await p.goto(base);
    await ready().catch(() => out.push('  cold start: never ready'));
    const tHome = Date.now() - t;
    t = Date.now();
    await p.evaluate(() => (location.hash = 'quiz'));
    const ok1 = await photoShown();
    out.push(`  cold start: Home ${s1(tHome)}, first quiz photo +${ok1 ? s1(Date.now() - t) : 'never (60 s)'}, ${Math.round(bytes / 1024)} KB`);
    // 2. Quiz clicks, 6 questions: Next at once for 3 (a player in a hurry), after reading the feedback for 3 s for 3
    // (the usual case: the next question's photos are fetched meanwhile).
    const A = [],
      N = [[], []];
    for (let i = 0; i < 6; i++) {
      const has = await p.$('#view [data-c]');
      if (!has) break;
      A.push(
        await p.evaluate(
          () =>
            new Promise(ok => {
              const t0 = performance.now();
              document.querySelector('#view [data-c]').click();
              requestAnimationFrame(() => setTimeout(() => ok(performance.now() - t0), 0));
            })
        )
      );
      const nx = await p.$('#next');
      if (!nx) break;
      if (i % 2) await p.waitForTimeout(3000);
      const t1 = Date.now();
      await p.evaluate(() => document.getElementById('next').click());
      const shown = await photoShown();
      N[i % 2].push(shown ? Date.now() - t1 : 60000);
      // Close any popup (achievement, unlock card) that would cover the next question.
      await p.evaluate(() => document.querySelectorAll('.ulcard .next, .achpop').forEach(x => x.click && x.click()));
    }
    const avg = L => (L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0);
    const nx = L => `${ms(avg(L))} (max ${ms(Math.max(0, ...L))})`;
    out.push(`  quiz: answer -> feedback ${nx(A)}; Next -> photo shown: at once ${nx(N[0])}, after reading 3 s ${nx(N[1])}`);
    // 3. Pages: click to paint (route + one frame), then until their photos are in.
    const R = [];
    for (const h of PAGES) {
      const d = await p.evaluate(
        h =>
          new Promise(ok => {
            const t0 = performance.now();
            addEventListener('hashchange', () => requestAnimationFrame(() => setTimeout(() => ok(performance.now() - t0), 0)), {once: true});
            location.hash = h;
          }),
        h
      );
      const t2 = Date.now();
      await p
        .waitForFunction(() => [...document.querySelectorAll('#view img')].filter(i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight; }).slice(0, 8).every(i => i.complete) && !/Loading/.test(document.getElementById('view').innerText), null, {
          timeout: 15000
        })
        .catch(() => {});
      R.push(`${h} ${ms(d)}${Date.now() - t2 > 150 ? ` (+${s1(Date.now() - t2)} content)` : ''}`);
    }
    out.push('  pages (paint, then content): ' + R.join(' · '));
    // 4. Warm start: the service worker (registered by hand: the app does it on https only) and the caches in place.
    const sw = await p.evaluate(() =>
      Promise.race([
        navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready.then(() => true)),
        new Promise(ok => setTimeout(() => ok(false), 60000))
      ]).catch(() => false)
    );
    if (!sw) out.push('  service worker: not installed within 60 s');
    await p.waitForTimeout(3000);
    bytes = 0;
    t = Date.now();
    await p.goto(base);
    await ready().catch(() => {});
    const tW = Date.now() - t;
    t = Date.now();
    await p.evaluate(() => (location.hash = 'quiz'));
    const ok2 = await photoShown();
    out.push(`  warm start: Home ${s1(tW)}, quiz photo +${ok2 ? s1(Date.now() - t) : 'never'}, ${Math.round(bytes / 1024)} KB`);
    out.push(`  main thread blocked (long tasks): ${s1(await p.evaluate(() => window.__lt))}`);
    console.log(`${pr.name}\n${out.join('\n')}`);
    await ctx.close();
  }
  await b.close();
  server.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
