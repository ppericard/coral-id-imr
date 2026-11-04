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
//   node tools/perf.js field      the field link only (see FIELD below): first visit over HTTP/2, as GitHub Pages serves
//                                 it, at the bandwidth of a real RA's first visit; reports the load order.
const http = require('http'),
  http2 = require('http2'),
  os = require('os'),
  {execFileSync} = require('child_process'),
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
// Like GitHub Pages: gzip for text, ETag revalidation, max-age=600. send(res, body) writes the body (the field link
// shapes it), log(path) hears each request.
const handler =
  (send = (res, b) => res.end(b), log = () => {}) =>
  (req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
      f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
    if (!f.startsWith(ROOT)) return res.writeHead(403), res.end();
    log(u.slice(1));
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
      send(res, b);
    });
  };
const serve = handler();
const server = http.createServer(serve);
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
// The field link (Pierre, 2026-11-02): a real RA's first visit from the IMR field station, Philippines (HAR, Chrome):
// served by Fastly's Manila POP (latency ~0.4 s) but ~86 kbit/s of bandwidth, shared by every request in flight. Served
// over HTTP/2 like GitHub Pages (one connection, all requests at once; HTTP/1.1 would queue them 6 at a time), with a
// self-signed certificate made by openssl. The link is shaped by this server, not by Chromium: the service worker's own
// requests (its install fetches the whole shell) escape the page's network emulation, and they share the real line too.
// Three first visits per device: Home then straight to the quiz (first photo, then Next -> photo for questions 2-5,
// the player taking ~8 s per question as a fluent RA does, and getting the second one wrong), Home then My progress, and Home left open 30 s before the
// quiz. "Asked at" = when the server got the first request for a file.
const FIELD = {rate: 86e3 / 8, lat: 400, read: 5000, feedback: 3000};
const FIELD_DEV = [
  {name: 'phone', ctx: {viewport: {width: 390, height: 800}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}},
  {name: 'desktop', ctx: {viewport: {width: 1280, height: 800}}}
];
const ASKED = ['data.json', 'quiz.js', 'progress.js', 'learn.js', 'proto/lab.js', 'proto/lab.css', 'forms.json', 'proto/finder.js', 'sw.js'];
// One line of FIELD.rate bytes/s shared evenly by the replies in flight (20 ms slices), each reply starting FIELD.lat
// ms after its request.
function shaper(st) {
  const live = new Set();
  let timer = null;
  const tick = () => {
    let budget = FIELD.rate * 0.02;
    while (budget >= 1 && live.size) {
      const share = Math.max(1, Math.floor(budget / live.size));
      for (const r of [...live]) {
        // A reply to a closed page (the previous run) is dropped.
        if ((r.res.stream || r.res).destroyed) {
          live.delete(r);
          continue;
        }
        const n = Math.min(share, r.b.length - r.i);
        r.res.write(r.b.subarray(r.i, r.i + n));
        r.i += n;
        budget -= n;
        st.bytes += n;
        if (r.i >= r.b.length) {
          live.delete(r);
          r.res.end();
        }
      }
    }
    if (!live.size) timer = clearInterval(timer);
  };
  return (res, b) =>
    setTimeout(() => {
      live.add({res, b, i: 0});
      if (!timer) timer = setInterval(tick, 20);
    }, FIELD.lat);
}
async function field() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-')),
    key = path.join(dir, 'k.pem'),
    crt = path.join(dir, 'c.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '1', '-subj', '/CN=127.0.0.1'], {stdio: 'ignore'});
  const st = {bytes: 0, asked: {}, t0: 0};
  const S = ms => (ms / 1000).toFixed(1) + ' s';
  const h2 = http2.createSecureServer(
    {key: fs.readFileSync(key), cert: fs.readFileSync(crt), allowHTTP1: true},
    handler(shaper(st), f => {
      if (!(f in st.asked)) st.asked[f] = Date.now() - st.t0;
      if (process.env.PERFDBG) console.log('  > ' + S(Date.now() - st.t0) + ' ' + f);
    })
  );
  await new Promise(ok => h2.listen(0, '127.0.0.1', ok));
  // Every run is a first visit: a new browser context (no cache, no service worker).
  const base = `https://127.0.0.1:${h2.address().port}/`;
  const b = await chromium.launch({args: ['--ignore-certificate-errors']});
  for (const dev of FIELD_DEV)
    for (const mode of ['quiz', 'progress', 'stay']) {
      // FIELD=phone:quiz,desktop:stay runs only those.
      if (process.env.FIELD && !process.env.FIELD.split(',').includes(dev.name + ':' + mode)) continue;
      const ctx = await b.newContext({...dev.ctx, ignoreHTTPSErrors: true});
      await ctx.route(
        u => !u.href.startsWith(base),
        r => (/script\.google/.test(r.request().url()) ? r.fulfill({contentType: 'application/json', body: '{"ok":true}'}) : r.abort())
      );
      await ctx.addInitScript(() => {
        try {
          localStorage.setItem('reefid-tour', '1');
localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        } catch (e) {}
      });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      if (process.env.PERFDBG) p.on('load', () => console.log('  load event ' + S(Date.now() - st.t0)));
      Object.assign(st, {bytes: 0, asked: {}, t0: Date.now()});
      const out = [];
      const shown = () =>
        p
          .waitForFunction(() => [...document.querySelectorAll('#view .qph img')].some(i => i.complete && i.naturalWidth > 0), null, {timeout: 180000, polling: 100})
          .then(
            () => true,
            () => false
          );
      // The photo files of the question on screen (the size picked: -t 240, -s 480, -m 960 px, none 1600 px).
      const files = () => p.evaluate(() => [...document.querySelectorAll('#view .qstage img')].map(i => (i.currentSrc || i.src).replace(/^.*\/img\/|\.webp.*$/g, '')).join('+'));
      const F = [];
      // The first-visit cards of the genera met (over the question) are read and closed like a player would.
      const cards = () => p.evaluate(() => document.querySelectorAll('.unlock .ulcard .next:not(.sec)').forEach(x => x.click()));
      await p.goto(base, {waitUntil: 'commit'});
      await p.waitForFunction(() => document.querySelector('#view .hdoors'), null, {timeout: 300000, polling: 100});
      const tHome = Date.now() - st.t0;
      out.push(`Home ${S(tHome)} (${Math.round(st.bytes / 1024)} KB before)`);
      if (mode === 'stay') await p.waitForTimeout(30000);
      let t = Date.now();
      if (mode === 'progress') {
        await p.evaluate(() => (location.hash = 'progress'));
        await p.waitForFunction(() => document.querySelector('#view .pring'), null, {timeout: 300000, polling: 100});
        out.push(`My progress +${S(Date.now() - t)} after the click`);
      } else {
        await p.evaluate(() => (location.hash = 'quiz'));
        const ok = await shown();
        out.push(`${mode === 'stay' ? 'after 30 s on Home, ' : ''}first quiz photo +${ok ? S(Date.now() - t) : 'never'} after the click`);
        if (mode === 'quiz') {
          const N = [];
          for (let i = 0; i < 4; i++) {
            for (let k = 0; k < 6; k++) await cards();
            await p.waitForTimeout(FIELD.read);
            await cards();
            F.push(await files());
            if (!(await p.$('#view [data-c]'))) break;
            // Right, except the second answer (a fluent RA gets ~80% right; a wrong answer re-plans what comes next).
            await p.evaluate(wrong => {
              const i0 = document.querySelector('#view .qstage img'),
                f = i0.dataset.f || (i0.getAttribute('src') || '').replace(/^img\/|(-[tsm])?\.webp.*$/g, ''), // data-f: Millepora's iNat URLs
                all = {...DATA.gen, ...((DATA.x || {}).gen || {})},
                has = n => [...Object.values(all[n].views || {}).flat(), ...((DATA.course || {})[n] || [])].some(x => x && x.f === f),
                t = Object.keys(all).find(has),
                B = [...document.querySelectorAll('#view [data-c]')];
              (B.find(b => (b.dataset.c === t) !== wrong) || B[0]).click();
            }, i === 1);
            await p.waitForTimeout(FIELD.feedback);
            if (!(await p.$('#next'))) break;
            t = Date.now();
            await p.evaluate(() => document.getElementById('next').click());
            N.push((await shown()) ? S(Date.now() - t) : 'never');
            await p.evaluate(() => document.querySelectorAll('.ulcard .next, .achpop').forEach(x => x.click && x.click()));
          }
          await p.waitForTimeout(FIELD.read);
          F.push(await files());
          out.push(`Next -> photo, questions 2-5: ${N.join(', ')}`);
          out.push(`photo files, questions 1-5: ${F.join(' · ')}`);
        }
      }
      out.push('asked at: ' + ASKED.map(f => `${f} ${f in st.asked ? S(st.asked[f]) : '-'}`).join(' · '));
      const firstImg = Object.entries(st.asked).find(([f]) => f.startsWith('img/'));
      if (firstImg) out.push(`first photo asked at ${S(firstImg[1])}; ${Math.round(st.bytes / 1024)} KB by the end`);
      if (errs.length) out.push('page errors: ' + errs.slice(0, 3).join(' | '));
      console.log(`field link, ${dev.name}, ${mode === 'quiz' ? 'Home -> quiz' : mode === 'progress' ? 'Home -> My progress' : 'Home 30 s -> quiz'}\n  ${out.join('\n  ')}`);
      await ctx.close();
    }
  await b.close();
  h2.close();
}
const PAGES = ['genera', 'g-Acropora', 'quiz', 'progress', 'board', 'ach', 'finder', 'lab', 'home'];
const s1 = ms => (ms / 1000).toFixed(1) + ' s';
const ms = x => Math.round(x) + ' ms';

(async () => {
  await require('../tests/slot.js')('tools/perf.js'); // one Playwright run per 2 cores on this machine (tests/slot.js)
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const only = process.argv[2];
  if (only === 'field') return field().then(() => server.close());
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
    // The sync script is also mocked inside the page: once the service worker is registered (warm start), requests
    // going through it pass by ctx.route, and a run reached the real sheet (17 anonymous "players", 2026-11-02).
    await p.addInitScript(() => {
      const f = window.fetch;
      window.fetch = (u, o) => {
        const url = String((u && u.url) || u);
        if (!/script\.google/.test(url)) return f(u, o);
        const body = /board=1/.test(url) ? {ok: true, rows: [['Ana', 42, 1180], ['Ben', 30, 0]]} : /achs=1/.test(url) ? {ok: true, n: 2, counts: {}} : {ok: true};
        return new Promise(ok => setTimeout(() => ok(new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}})), 2000));
      };
    });
    await p.addInitScript(() => {
      window.__lt = 0;
      try {
        new PerformanceObserver(l => l.getEntries().forEach(e => (window.__lt += e.duration - 50))).observe({type: 'longtask', buffered: true});
      } catch (e) {}
      // The welcome tour would cover the pages: marked as seen.
      try {
        localStorage.setItem('reefid-tour', '1');
localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
    });
    const out = [];
    // Home drawn (the start-up's first page; the quiz and the other pages may still be on their way, index.html tiers).
    const ready = () => p.waitForFunction(() => document.querySelector('#view .hdoors'), null, {timeout: 180000});
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
    out.push(
      `  photos: ${await p.evaluate(() => (navigator.connection || {}).effectiveType || '?')} reported, Auto works as ${await p.evaluate(() => (typeof saver === 'function' && saver() ? 'Saver' : 'by box'))}`
    );
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
  if (!only) await field();
  server.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
