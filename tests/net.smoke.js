const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');
const {chromium} = require('playwright');
const slot = require('./slot.js');
const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
let SWV = 0;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(f, (e, b) => {
    if (e) {
      res.writeHead(404);
      return res.end();
    }
    const type = TYPES[path.extname(f)] || 'application/octet-stream',
      body = u === '/sw.js' && SWV ? Buffer.from(b + `\n// deploy ${SWV}\n`) : b; // test 9: a new deploy changes sw.js
    // Text files gzipped when the browser accepts it, as the real host serves them (GitHub Pages): on the throttled
    // lines below, the start-up time is what a player waits, not what an uncompressed data.json would cost.
    if (/^(text\/|application\/(json|manifest)|image\/svg)/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.writeHead(200, {'Content-Type': type, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding'});
      return res.end(zlib.gzipSync(body));
    }
    res.writeHead(200, {'Content-Type': type});
    res.end(body);
  });
});

// Poor connections (Pierre, 2026-11-01: fluid on the connections common in the Philippines). Checks:
// 1. Start-up with a kept curation never waits for curation.json (here it never answers).
// 2. The next quiz question is chosen and its photos fetched during the feedback; Next shows that very question.
// 3. A game photo whose full size keeps failing falls back to its 480 px version; when both fail, the question offers
//    another one.
// 4. The leaderboard shows the copy kept on the device at once while the sync script is slow.
// 5. Leaving a page drops its photos still loading.
// 6. The service worker installs even when each app file fails once (retried at install).
// 9. A new version reloads the page by itself at the next page change; a local copy sends nothing to the sheet.
// 8. Start-up recovers when its scripts, stylesheet and data.json fail once (loader retries, getR).
// 7. Photo sizes follow the box, the screen density and the Photo quality setting (Auto, Saver, Full); thumbnails 240 px.
//    Auto is Saver on a line the app measures as slow, and Saver never moves a shown photo to a bigger file.
// 10. Load order (index.html tiers): Home shows before My progress and the Tools files are asked for, the quiz files come
//    before My progress, which comes before the Tools; a link straight to #quiz, #progress or #lab on a first visit works.
// 11. A browser driven by a program sends nothing to the sheet on any host name.
// 12. Photos are read from R2 (core.js PHOTO_BASE); R2 out of reach, they come from the site at once (page and service
//    worker), and the worker keeps them offline under either address.
// Speed numbers are measured by tools/perf.js, not here. Locally: node tests/net.smoke.js
(async () => {
  await slot('net.smoke');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch(),
    fails = [];
  // The first-encounter card (quiz.js introShow) would cover the quiz in the checks that are not about it: every slate
  // genus (Millepora too, app.js BENTHIC) starts as met on a card, except in a context opened with {intro: true}; the
  // bonus genera offer that then comes (every slate genus met) is answered "Not now" (Q.bon false).
  const INTROS = JSON.stringify(Object.fromEntries([...Object.keys(require('../data.json').gen), 'Millepora'].map(n => [n, [0, 1]]))),
    ctxNew = b.newContext.bind(b);
  b.newContext = async ({intro, ...o} = {}) => {
    const c = await ctxNew(o);
    if (!intro)
      await c.addInitScript(s => {
        try {
          localStorage.getItem('reefid-sync-coral-intro') || localStorage.setItem('reefid-sync-coral-intro', s);
          localStorage.getItem('reefid-sync-coral-quiz') || localStorage.setItem('reefid-sync-coral-quiz', '{"bon":false}');
        } catch (e) {}
      }, INTROS);
    return c;
  };
  const ctxOf = async (opts = {}) => {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}, deviceScaleFactor: opts.dpr || 1, serviceWorkers: 'block'});
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('reefid-tour', '1');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      } catch (e) {}
    });
    await ctx.route(
      u => !u.href.startsWith(base),
      async r => {
        if (/script\.google/.test(r.request().url()) && opts.slowScript) return; // never answers
        return r.abort();
      }
    );
    if (opts.hangCuration) await ctx.route(base + 'curation.json', () => {}); // never answers
    if (opts.failFull) {
      await ctx.route(/\/img\/[^/]+(?<!-s)\.webp/, r => r.abort('connectionreset'));
      // An iNaturalist photo (r: 1, app.js img(); Millepora's until 2026-11-03): its bigger file ('large') fails too and its 480 px one
      // ('medium') answers, here with a local 480 px file (every other host is cut off, so that check failed whenever
      // the first question was on Millepora).
      const small = fs.readFileSync(
        path.join(
          ROOT,
          'img',
          fs.readdirSync(path.join(ROOT, 'img')).find(f => f.endsWith('-s.webp'))
        )
      );
      await ctx.route(/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/\d+\/(large|medium)\./, r =>
        /\/large\./.test(r.request().url()) ? r.abort('connectionreset') : r.fulfill({contentType: 'image/webp', body: small})
      );
    }
    if (opts.failAll) await ctx.route(/\/img\/.*\.webp/, r => r.abort('connectionreset'));
    const p = await ctx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    return {ctx, p, errs};
  };
  const ready = p =>
    p.waitForFunction(() => window.APP_READY && !/Loading/.test(document.getElementById('view').innerText), null, {timeout: 20000});

  // 1 + 2: kept curation, then plan and preload.
  {
    const {ctx, p, errs} = await ctxOf();
    await p.goto(base + '#quiz');
    await ready(p);
    await p.close();
    await ctx.route(base + 'curation.json', () => {});
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => errs.push(e.message));
    const t = Date.now();
    await p2.goto(base + '#quiz');
    await ready(p2).catch(() => fails.push('Start-up waited for curation.json although a copy was kept'));
    if (Date.now() - t > 10000) fails.push(`Start-up with a kept curation took ${Date.now() - t} ms`);
    for (let i = 0; i < 3; i++) {
      await p2.click('#view [data-c]');
      await p2
        .waitForFunction(() => typeof NEXTQ !== 'undefined' && NEXTQ && NEXTQ.args, null, {timeout: 5000})
        .catch(() => fails.push('No next question planned during the feedback'));
      // The same photos (by name: data-f, quiz.js), each in one of its files. The size is chosen when it shows (the box,
      // the line measured, Saver): an iNaturalist photo (not downloaded: r: 1; Millepora's until 2026-11-03) is its 'medium' file for
      // 480 px and 'large' otherwise, names resized() leaves alone, so comparing resized(…, '') failed whenever
      // Millepora came up (#376). The host is chosen when it shows too: R2 is cut off here, and about a second after the
      // first R2 failure (core.js photoRetry: one more try PHOTO_RETRY ms later) the page reads its photos from the site
      // (app.js R2 false). Planned while R2 was still on and shown after, the same file came from img/ instead of the
      // R2 address read with the plan: this check failed about 1 run in 3 on a busy machine (2026-11-03). Both sides
      // are compared without the R2 base (core.js photoLocal); check 12 is about which host.
      const want = await p2.evaluate(() =>
        NEXTQ && NEXTQ.args ? NEXTQ.args[4].shown.map(x => ({f: x.f, files: [img(x, 's'), img(x, 'm'), img(x, '')].map(photoLocal)})) : []
      );
      await p2.evaluate(() => document.querySelectorAll('.unlock .next, .achpop').forEach(x => x.click && x.click()));
      await p2.click('#next');
      const got = await p2.evaluate(() =>
        [...document.querySelectorAll('#view .qstage img')].map(i => ({
          f: i.dataset.f,
          u: photoLocal(i.getAttribute('src').replace(/#.*$/, ''))
        }))
      );
      if (!want.length || got.length !== want.length || want.some((w, k) => got[k].f !== w.f || !w.files.includes(got[k].u)))
        fails.push(`Next did not show the planned question (${want.map(w => w.f)} vs ${got.map(g => `${g.f} ${g.u}`)})`);
    }
    // A curation rebuild (Pierre published while the tab was open) drops the planned question: it could show a photo
    // the new curation excludes or moves.
    if (!(await p2.evaluate(() => (planNext('quiz'), build(), NEXTQ === null))))
      fails.push('A planned question survived a curation rebuild');
    if (errs.length) fails.push('Plan: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 3a. The bigger file failing: falls back to the 480 px version.
  {
    const {ctx, p, errs} = await ctxOf({failFull: true, dpr: 2}); // 2x: the 960 px file, not the 480 px one
    await p.goto(base + '#quiz');
    await ready(p);
    await p
      .waitForFunction(
        () => [...document.querySelectorAll('#view .qstage img')].every(i => i.dataset.low && i.complete && i.naturalWidth > 0),
        null,
        {timeout: 15000}
      )
      .catch(() => fails.push('A failing full-size game photo did not fall back to its small version'));
    if (errs.length) fails.push('Fallback: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 3b. Everything failing: another question is offered, nothing counted.
  {
    const {ctx, p, errs} = await ctxOf({failAll: true});
    await p.goto(base + '#quiz');
    await ready(p);
    const n0 = await p.evaluate(() => answersSoFar());
    await p.waitForSelector('#qfail button', {timeout: 15000}).catch(() => fails.push('No "Another question" when the photos cannot load'));
    if (await p.$('#qfail button')) {
      await p.click('#qfail button');
      if ((await p.evaluate(() => answersSoFar())) !== n0) fails.push('Skipping a photo that did not load counted an answer');
      if (!(await p.$('#view [data-c]'))) fails.push('"Another question" did not show a question');
    }
    if (errs.length) fails.push('Skip: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 4. Leaderboard from the kept copy while the script is slow.
  {
    const {ctx, p, errs} = await ctxOf({slowScript: true});
    await p.addInitScript(() =>
      localStorage.setItem('reefid-board-cache', JSON.stringify({rows: [['Kept Player', 40, 1.2]], t: Date.now() - 600000}))
    );
    await p.goto(base + '#board');
    await ready(p);
    await p
      .waitForFunction(() => /Kept Player/.test(document.getElementById('view').innerText), null, {timeout: 3000})
      .catch(() => fails.push('The leaderboard did not show the kept copy at once'));
    if (errs.length) fails.push('Board: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 5. Leaving a page drops its photos still loading, so they do not take the line from the next page.
  {
    const {ctx, p, errs} = await ctxOf();
    await ctx.route(/\/img\/.*\.webp/, () => {}); // never answer
    let dropped = 0;
    p.on('requestfailed', r => /\/img\//.test(r.url()) && dropped++);
    // The photos of the next quiz questions, fetched as images from start-up on, hold the page's load event: here they
    // never come.
    await p.goto(base, {waitUntil: 'domcontentloaded'});
    await ready(p);
    const n = await p.evaluate(() => [...document.querySelectorAll('#view img')].filter(i => !i.complete).length);
    await p.evaluate(() => (location.hash = 'lab'));
    await p.waitForTimeout(500);
    if (!n || !dropped) fails.push(`Leaving Home did not drop its photos still loading (${n} loading, ${dropped} dropped)`);
    if (errs.length) fails.push('Drop: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 7. Photo sizes: the file fits the box at the screen's density (up to 2x); Saver (asked, or Auto on a slow connection)
  // one size down, the enlarged view at 960 px then 1600 on a click; Full always 1600 px.
  {
    // An iNaturalist photo (not downloaded: r: 1; Millepora's until 2026-11-03) has two files (app.js img()): 'medium' (500 px) for the
    // 480 px size, 'large' (1024 px) for both 960 and 1600 px ('m+': passes for either). Read as 1600 px, a Millepora
    // question failed the Saver checks (#375).
    const tier = u =>
        /-s\.webp|\/photos\/\d+\/medium\./.test(u) ? 's' : /-m\.webp/.test(u) ? 'm' : /\/photos\/\d+\/large\./.test(u) ? 'm+' : 'full',
      big = x => x === 'full' || x === 'm+',
      mid = x => x === 'm' || x === 'm+';
    const run = async (vp, dpr, init, check) => {
      const ctx = await b.newContext({viewport: vp, deviceScaleFactor: dpr, serviceWorkers: 'block'});
      await ctx.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await ctx.addInitScript(init);
      const p = await ctx.newPage(),
        errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(base + '#quiz');
      await ready(p);
      await p.waitForTimeout(300);
      const T = await p.evaluate(() => [...document.querySelectorAll('#view .qstage img')].map(i => i.getAttribute('src')));
      await check(p, T.map(tier));
      if (errs.length) fails.push('Sizes: ' + errs.slice(0, 3).join(' | '));
      await ctx.close();
    };
    const tour = () => (localStorage.setItem('reefid-tour', '1'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'));
    // Phone, 2x: one photo ~390 px wide -> 960 px file.
    await run({width: 390, height: 800}, 2, tour, async (p, t) => {
      if (!t.length || t.some(x => x === 's')) fails.push(`Phone 2x quiz photos too small: ${t}`);
      if (t.some(x => x === 'full') && t.length === 1) fails.push(`Phone 2x single quiz photo took 1600 px: ${t}`);
      // Home band thumbnails (~60 px on a phone): the 240 px files (Pierre: no big files for how they are shown).
      // A 480 px file the quiz already fetched (its next questions' photos) may be shown instead: the browser picks a
      // srcset file it already has, at no cost.
      // The quiz's preloads first: with R2 cut off (as here) they reach the site only after their R2 retry (core.js
      // PHOTO_RETRY), and a file they bring in later would be taken for one Home asked for.
      await p.evaluate(() => Promise.race([prefetched(), new Promise(ok => setTimeout(ok, 15000))]));
      const t0 = await p.evaluate(() => ((location.hash = 'home'), performance.now()));
      await p.waitForTimeout(1500);
      const h = await p.evaluate(
        t0 =>
          [...document.querySelectorAll('.hdtiles img')]
            .map(i => i.currentSrc)
            .filter(Boolean) // lazy: those in view
            .filter(u => !performance.getEntriesByName(u).some(e => e.startTime < t0)),
        t0
      );
      if (h.some(u => !/-t\.webp/.test(u)))
        fails.push(`Home thumbnails on a 2x phone not 240 px: ${h.filter(u => !/-t\.webp/.test(u)).slice(0, 2)}`);
    });
    // Saver: smaller files, enlarged view 960 then 1600 px. (Auto on a browser-reported 2g/3g line only counts until the
    // app has measured the line itself, which a local server does at once; the measured case is checked below.)
    await run(
      {width: 390, height: 800},
      2,
      () => {
        localStorage.setItem('reefid-tour', '1');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-photo-q', '"saver"');
      },
      async (p, t) => {
        if (t.some(big)) fails.push(`Saver still loaded 1600 px quiz photos: ${t}`);
        await p.click('#view .qstage .zoom');
        const lb1 = await p.getAttribute('#lightbox .lb-in img', 'src');
        if (!mid(tier(lb1))) fails.push(`Saver enlarged view did not start at 960 px: ${lb1}`);
        await p.click('#lightbox .lb-in img');
        const lb2 = await p.getAttribute('#lightbox .lb-in img', 'src');
        if (!big(tier(lb2))) fails.push(`Saver enlarged view did not load 1600 px on a click: ${lb2}`);
      }
    );
    // Auto on a line measured slow (Resource Timing, ~320 kbit/s here, under LINK.SLOW = 500 kbit/s; Chrome reports no slow connection): Saver, and the
    // shown photo is not moved to a bigger file after layout.
    {
      const ctx = await b.newContext({viewport: {width: 390, height: 800}, deviceScaleFactor: 2, serviceWorkers: 'block'});
      await ctx.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await ctx.addInitScript(
        () => (localStorage.setItem('reefid-tour', '1'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
      );
      const p = await ctx.newPage(),
        cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {offline: false, downloadThroughput: 4e4, uploadThroughput: 4e4, latency: 50});
      // Not the load event (Playwright's 30 s default): on this line the page loads its first two tiers (the scripts, the
      // stylesheets and fonts, data.json, forms.json...: about 830 KB, 2026-11-03) before it fires, 29 s on main and 30 s
      // with the full replay's code (+45 KB), so the check failed on bytes, not on what it checks. What it needs is the
      // quiz and its photo, timed here on their own.
      const t0 = Date.now();
      await p.goto(base + '#quiz', {waitUntil: 'commit'});
      const shown = await p
        .waitForFunction(() => window.APP_READY && document.querySelector('#view .qstage img'), null, {timeout: 90000})
        .then(() => true)
        .catch(() => false);
      if (!shown) fails.push(`a ~320 kbit/s line: no quiz photo ${Math.round((Date.now() - t0) / 1000)} s after opening #quiz`);
      await p.waitForTimeout(1500);
      const t = await p.evaluate(() => [...document.querySelectorAll('#view .qstage img')].map(i => i.getAttribute('src')));
      const kb = await p.evaluate(() => Math.round(linkMeasure() / 1000));
      if (!(kb > 0 && kb < 500) || t.some(u => tier(u) !== 's'))
        fails.push(`Auto on a line measured at ${kb} kbit/s did not take the 480 px files: ${t}`);
      await ctx.close();
    }
    // Full: 1600 px even on a small screen.
    await run(
      {width: 390, height: 800},
      1,
      () => {
        localStorage.setItem('reefid-tour', '1');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-photo-q', JSON.stringify('full'));
      },
      async (p, t) => {
        if (!t.length || t.some(x => !big(x))) fails.push(`Full quality did not load 1600 px: ${t}`);
      }
    );
    // Big dense screen: a box bigger than guessed gets the 1600 px file.
    await run({width: 1440, height: 900}, 2, tour, async (p, t) => {
      if (t.length === 1 && !big(t[0])) fails.push(`Big 2x screen single quiz photo not 1600 px: ${t}`);
    });
  }
  // 8. Start-up on an unstable line: core.js, app.js, home.js, app.css and data.json fail once each, the app still starts
  // (index.html loader and stylesheet retries, getR), on Home.
  {
    const {ctx, p, errs} = await ctxOf();
    const seen = new Set();
    await ctx.route(/\/(core\.js|app\.js|home\.js|app\.css|data\.json)\?v=/, r => {
      const u = r.request().url().replace(/\?.*/, '');
      if (seen.has(u)) return r.fallback();
      seen.add(u);
      return r.abort('connectionreset');
    });
    await p.goto(base);
    await p
      .waitForFunction(() => window.APP_READY, null, {timeout: 20000})
      .catch(() => fails.push('Start-up did not recover from its files failing once'));
    if (!(await p.$('.hdoors'))) fails.push('Start-up after failed files did not open Home');
    if (!(await p.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)')))
      fails.push('app.css not applied after failing once');
    await ctx.close();
  }
  // 8c. A Lab prototype that never answers does not hold the start-up (Codex review, PR #336).
  {
    const {ctx, p} = await ctxOf();
    await ctx.route(/\/proto\/zoom\.js/, () => {}); // never answers
    await p.goto(base, {waitUntil: 'commit'}); // the load event waits for it
    await p
      .waitForFunction(() => window.APP_READY && document.querySelector('.hdoors'), null, {timeout: 15000})
      .catch(() => fails.push('A hanging Lab prototype held the start-up'));
    await ctx.close();
  }
  // 8b. A line where every 5th request fails (tools/perf.js "unstable" profile): the app still starts. Reloading the
  // page on a failed file (first try) never got through: each reload failed again.
  {
    const {ctx, p} = await ctxOf();
    let n = 0;
    await ctx.route(
      u => u.href.startsWith(base) && !/\.html$|\/$/.test(new URL(u.href).pathname),
      r => (++n % 5 === 0 ? r.abort('connectionreset') : r.fallback())
    );
    await p.goto(base);
    await p
      .waitForFunction(() => window.APP_READY, null, {timeout: 30000})
      .catch(() => fails.push('Start-up failed on a line where every 5th request fails'));
    await ctx.close();
  }
  // 9. A new version (Pierre, 2026-11-02: players never reload by hand): once it has taken over in the background, the
  // page reloads itself at the next page change.
  // Each new version is published only while the page is quiet (no request for 500 ms). Chromium swaps a busy old
  // worker for a waiting one that called skipWaiting() by stopping the old one the moment it is idle; a request that
  // comes while it stops starts the old version again, and that copy is not asked to stop early: the swap then waits
  // until it has been idle 30 s, and with DevTools attached (Playwright) until the 5 min "lame duck" timer
  // (content/browser/service_worker: TriggerIdleTerminationAsap, OnStoppedInternal, kMaxLameDuckTime). Published while
  // the tab below still loaded its last tier, with photos held ~1 s by the worker's R2 retry, the old worker was busy
  // when the new one installed and the next file asked for restarted it: no takeover within 30 s in 7 of 55 runs of this
  // check (2026-11-03, timestamps of both workers: the old version started twice in each failing run, in no passing one).
  // A player meets the same delay, not a lost version (docs/ARCHITECTURE.md).
  const track = pg => {
    const s = {n: 0, at: Date.now()},
      end = () => ((s.n = Math.max(0, s.n - 1)), (s.at = Date.now()));
    pg.on('request', () => (s.n++, (s.at = Date.now())));
    pg.on('requestfinished', end);
    pg.on('requestfailed', end);
    return async () => {
      for (const t = Date.now(); (s.n || Date.now() - s.at < 500) && Date.now() - t < 20000;) await pg.waitForTimeout(100);
    };
  };
  {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}});
    await ctx.addInitScript(
      () => (localStorage.setItem('reefid-tour', '1'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
    );
    await ctx.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    const p = await ctx.newPage(),
      pQuiet = track(p);
    await p.goto(base);
    await ready(p);
    await p.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready)); // https only in the app
    await p.reload();
    await ready(p);
    if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) fails.push('Update test: the page is not controlled');
    // A local copy never sends anonymous answers or reports to the real sheet, even with the service worker in (its
    // requests pass by ctx.route): tools/perf.js runs had reached it. Once every tier is in (index.html: the sheet's
    // reads, leaderboard and sync, come with tier 4), so only what this check sends is counted.
    await p.waitForFunction(() => typeof HAVE !== 'undefined' && HAVE >= 5, null, {timeout: 20000});
    const sent = await p.evaluate(async () => {
      const f = window.fetch,
        hits = [];
      // Only writes count (POST), as in check 11: the sheet's reads (leaderboard, achievements) may come at any time.
      // A sign-in (GET with a name) counts too: it opens an account (Pierre, 2026-11-03: signed-in traffic is guarded).
      window.fetch = (u, o) =>
        /script\.google/.test(String((u && u.url) || u)) &&
        (String((o && o.method) || 'GET').toUpperCase() === 'POST' || /[?&]name=/.test(String(u)))
          ? (hits.push(String(u)), Promise.reject(new Error('x')))
          : f(u, o);
      localStorage.setItem('reefid-anonq', JSON.stringify([{id: 'a1', t: Date.now(), g: 'Acropora', a: 'Porites', ok: 0}]));
      localStorage.setItem('reefid-reports', JSON.stringify([{k: 'photo', m: 'test'}]));
      sendAnon();
      sendReports();
      await new Promise(ok => setTimeout(ok, 300));
      window.fetch = f;
      return hits;
    });
    if (sent.length) fails.push('A local copy sent answers or reports to the sheet: ' + sent[0].slice(0, 60));
    await p.evaluate(() => (window.__old = 1));
    await pQuiet();
    SWV = 1;
    await p.evaluate(() => swCheck());
    await p
      .waitForFunction(() => UPDATED, null, {timeout: 30000})
      .catch(() => fails.push('A new version did not take over in the background'));
    if (!(await p.evaluate(() => window.__old))) fails.push('The page reloaded in the middle of a page');
    await p.evaluate(() => (location.hash = 'genera'));
    await p
      .waitForFunction(() => !window.__old && window.APP_READY && location.hash === '#genera', null, {timeout: 20000})
      .catch(() => fails.push('The page did not reload onto the new version at the next page change'));
    // A tab opened before any version was installed, then left open, still gets the next version (Codex review #336).
    const r = await ctx.browser().newContext({viewport: {width: 390, height: 800}});
    await r.addInitScript(
      () => (localStorage.setItem('reefid-tour', '1'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
    );
    await r.route(
      u => !u.href.startsWith(base),
      x => x.abort()
    );
    const f = await r.newPage(),
      fQuiet = track(f);
    await f.goto(base);
    await ready(f);
    await f.evaluate(() =>
      navigator.serviceWorker
        .register('sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(
          () =>
            new Promise(ok =>
              navigator.serviceWorker.controller ? ok() : navigator.serviceWorker.addEventListener('controllerchange', ok)
            )
        )
    );
    if (await f.evaluate(() => UPDATED)) fails.push('The first install was taken for an update');
    // Left open: every tier in, and quiet (see above).
    await f.waitForFunction(() => typeof HAVE !== 'undefined' && HAVE >= 5, null, {timeout: 20000});
    await fQuiet();
    SWV = 9;
    await f.evaluate(() => swCheck());
    await f
      .waitForFunction(() => UPDATED, null, {timeout: 30000})
      .catch(() => fails.push('A tab first opened before any install missed the next version'));
    await r.close();
    // The admin page does the same (its demo mode: no token, nothing sent).
    const q = await ctx.newPage(),
      qQuiet = track(q);
    await q.goto(base + 'admin.html?demo');
    // Loaded first (DRAFT is set after the last of its files), its first page's photos in, and quiet (see above; Playwright's
    // 'networkidle' is reached once per load, then never waited for again). Published while start() still fetched cand.json, the
    // new worker now and then stayed waiting past the 30 s below (about 1 run in 8, 2026-11-03), likely the same restart
    // of the old worker; a version that takes over while the admin loads is checked next.
    await q.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera && navigator.serviceWorker.controller, null, {
      timeout: 20000
    });
    await qQuiet();
    await q.evaluate(() => (window.__old = 1));
    SWV = 2;
    await q.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    await q
      .waitForFunction(() => UPDATED, null, {timeout: 30000})
      .catch(() => fails.push('Admin: a new version did not take over in the background'));
    await q.evaluate(() => (location.hash = '~cand'));
    await q
      .waitForFunction(() => !window.__old && location.hash === '#~cand', null, {timeout: 20000})
      .catch(() => fails.push('Admin: the page did not reload onto the new version at the next page change'));
    // A version that takes over while the admin is still loading is seen too: the new worker waits for the old one's
    // fetches still in flight, then takes over once the old one is idle (or later, see above), maybe before start() goes
    // on. admin.js listened only from the end of start() and missed it; whether it did depended on which came first, so
    // what is checked is that it listens while start() still waits for its files (here cand.json never answers).
    await ctx.route(/cand\.json/, () => {});
    const q2 = await ctx.newPage();
    await q2.addInitScript(() => {
      const add = ServiceWorkerContainer.prototype.addEventListener;
      ServiceWorkerContainer.prototype.addEventListener = function (t, ...a) {
        if (t === 'controllerchange') window.__ccOn = 1;
        return add.call(this, t, ...a);
      };
    });
    await q2.goto(base + 'admin.html?demo', {waitUntil: 'domcontentloaded'});
    await q2.waitForFunction(() => typeof UPDATED !== 'undefined', null, {timeout: 20000});
    if (!(await q2.evaluate(() => window.__ccOn && !(typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera))))
      fails.push('Admin: not listening for a new version while it loads');
    await ctx.close();
  }
  // 10. Load order. Home first: nothing of My progress or the Tools asked for before it shows; then the quiz's files,
  // then My progress, then the Tools, one tier after the other.
  {
    const {ctx, p, errs} = await ctxOf();
    // When Home was drawn and when each file was asked for, on the page's own clock.
    await ctx.addInitScript(() =>
      new MutationObserver((m, o) => {
        if (document.querySelector('#view .hdoors')) ((window.__home = performance.now()), o.disconnect());
      }).observe(document, {childList: true, subtree: true})
    );
    await p.goto(base);
    await p
      .waitForFunction(() => typeof HAVE !== 'undefined' && HAVE >= 5, null, {timeout: 20000})
      .catch(() => fails.push('The last tier never came'));
    // A file shows in Resource Timing once it is in: lab.js asks for the Lab files as it runs, so they may still be on
    // their way (with the photos falling back from R2 to the site here, they share the site's connections longer).
    await p
      .waitForFunction(
        () => {
          const got = performance.getEntriesByType('resource').map(e => new URL(e.name).pathname);
          return ['/progress.js', '/flag.js', '/proto/lab.js', '/proto/idkey.js'].every(f => got.includes(f));
        },
        null,
        {timeout: 20000}
      )
      .catch(() => {});
    const [home, at] = await p.evaluate(() => [
      window.__home,
      Object.fromEntries(performance.getEntriesByType('resource').map(e => [new URL(e.name).pathname.slice(1), e.startTime]))
    ]);
    const early = ['progress.js', 'flag.js', 'proto/lab.js', 'proto/idkey.js'].filter(f => !(at[f] > home));
    if (!(home > 0) || early.length) fails.push(`Asked for before Home showed (${home} ms): ${early.join(', ')}`);
    const order = ['quiz.js', 'progress.js', 'proto/lab.js'].map(f => at[f]);
    if (!order.every((x, i) => x >= 0 && (!i || x >= order[i - 1])))
      fails.push(`Tiers out of order (quiz, My progress, Tools): ${order.join(', ')} ms`);
    if (errs.length) fails.push('Load order: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // Links straight to a page on a first visit: the page waits for its tier, then opens.
  for (const [h, sel] of [
    ['quiz', '#view [data-c]'],
    ['progress', '#view .pring'],
    ['lab', '#view .lab a']
  ]) {
    const {ctx, p, errs} = await ctxOf();
    await p.goto(base + '#' + h);
    await p
      .waitForFunction(s => document.querySelector(s) && !/Loading/.test(document.getElementById('view').innerText), sel, {timeout: 20000})
      .catch(() => fails.push(`A first visit straight to #${h} did not open it`));
    if (errs.length) fails.push(`#${h} first: ` + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 6. Service worker install on an unstable line: every app file fails once, the install still completes.
  {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}});
    const seen = new Set();
    await ctx.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await ctx.route(
      u => u.href.startsWith(base) && !/\.html$|\/$/.test(new URL(u.href).pathname) && !/sw\.js/.test(u.href),
      r => {
        const u = r.request().url();
        if (seen.has(u) || r.request().resourceType() === 'image') return r.fallback();
        seen.add(u);
        return r.abort('connectionreset');
      }
    );
    // A bare page: the app's pages would add their own requests, privacy.html's CSP forbids workers.
    await ctx.route(base + 'sw-test.html', r => r.fulfill({contentType: 'text/html', body: '<!doctype html><title>t</title>'}));
    const p = await ctx.newPage();
    await p.goto(base + 'sw-test.html');
    const ok = await p.evaluate(() =>
      Promise.race([
        navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready.then(() => true)),
        new Promise(ok => setTimeout(() => ok(false), 30000))
      ]).catch(() => false)
    );
    if (!ok) fails.push('The service worker did not install when each file failed once');
    await ctx.close();
  }
  // 12. Photos from R2 (core.js PHOTO_BASE; ROADMAP "Photos out of the repo", step 2). The app asks R2 for its photos;
  // R2 out of reach (cut off here, like every outside host: no test needs R2), the same files come from the site at once,
  // and so do the next ones. Under the service worker, the worker falls back to the site by itself, asks R2 in CORS mode
  // and keeps the photo offline, under either address.
  {
    const R2 = require('../core.js').PHOTO_BASE;
    // R2 answering, from the local files, with the bucket's CORS header.
    const fromR2 = ctx =>
      ctx.route(
        u => u.href.startsWith(R2),
        r => {
          const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
          return fs.existsSync(f)
            ? r.fulfill({status: 200, contentType: 'image/webp', headers: {'Access-Control-Allow-Origin': '*'}, body: fs.readFileSync(f)})
            : r.fulfill({status: 404});
        }
      );
    const shown = p =>
      p
        .waitForFunction(
          () => {
            const I = [...document.querySelectorAll('#view .qstage img')];
            return I.length && I.every(i => i.complete && i.naturalWidth > 0) && I.map(i => i.getAttribute('src'));
          },
          null,
          {timeout: 15000}
        )
        .then(h => h.jsonValue())
        .catch(() => null);
    // a. R2 answering: the game photos are R2's.
    {
      const {ctx, p, errs} = await ctxOf();
      await fromR2(ctx);
      await p.goto(base + '#quiz');
      await ready(p);
      const s = ((await shown(p)) || []).filter(u => !/inaturalist/.test(u)); // a candidate just added (r: 1) is iNaturalist's
      if (!s.length || !s.every(u => u.startsWith(R2 + 'img/'))) fails.push(`R2: the game photos are not read from R2 (${s})`);
      if (errs.length) fails.push('R2: ' + errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // b. R2 cut off: R2 was asked, the photos show from the site's img/, no "Another question", and the next question
    // asks R2 nothing more.
    {
      const {ctx, p, errs} = await ctxOf();
      let asked = 0;
      p.on('request', r => r.url().startsWith(R2) && asked++);
      await p.goto(base + '#quiz');
      await ready(p);
      const s = ((await shown(p)) || []).filter(u => !/inaturalist/.test(u));
      if (!asked) fails.push('R2 cut off: R2 was never asked for a photo');
      if (!s.length || !s.every(u => u.startsWith('img/')) || (await p.$('#qfail')))
        fails.push(`R2 cut off: the game photos did not fall back to the site (${s})`);
      const n = asked;
      await p.click('#view [data-c]');
      await p.evaluate(() => document.querySelectorAll('.unlock .next, .achpop').forEach(x => x.click && x.click()));
      await p.click('#next');
      const s2 = ((await shown(p)) || []).filter(u => !/inaturalist/.test(u));
      if (!s2.length || !s2.every(u => u.startsWith('img/')) || asked !== n)
        fails.push(`R2 cut off: the next question asked R2 again (${asked - n} requests) or did not show (${s2})`);
      if (errs.length) fails.push('R2 cut off: ' + errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // b2. R2 failing once per file (a passing error, Pierre 2026-11-03): each photo is asked from R2 a second time and
    // shows from R2; the page keeps reading R2 (core.js photoRetry, quiz.js preloads).
    {
      const {ctx, p, errs} = await ctxOf();
      const once = new Set();
      await ctx.route(
        u => u.href.startsWith(R2),
        r => {
          const url = r.request().url();
          if (!once.has(url)) return (once.add(url), r.abort());
          const f = path.join(ROOT, decodeURIComponent(new URL(url).pathname));
          return fs.existsSync(f)
            ? r.fulfill({status: 200, contentType: 'image/webp', headers: {'Access-Control-Allow-Origin': '*'}, body: fs.readFileSync(f)})
            : r.fulfill({status: 404});
        }
      );
      await p.goto(base + '#quiz');
      await ready(p);
      const s = ((await shown(p)) || []).filter(u => !/inaturalist/.test(u));
      if (!s.length || !s.every(u => u.startsWith(R2 + 'img/')) || (await p.$('#qfail')))
        fails.push(`R2 failing once: the photos did not come from R2 on the second try (${s})`);
      if (!(await p.evaluate(() => R2))) fails.push('R2 failing once: the page gave R2 up after one passing error');
      if (errs.length) fails.push('R2 failing once: ' + errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // c. Under the service worker (a bare page, as in 6).
    {
      const f = fs.readdirSync(path.join(ROOT, 'img')).find(x => x.endsWith('-s.webp')),
        g = f.replace(/-s\.webp$/, '-t.webp');
      const ctx = await b.newContext({viewport: {width: 390, height: 800}});
      await ctx.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await ctx.route(base + 'sw-test.html', r => r.fulfill({contentType: 'text/html', body: '<!doctype html><title>t</title>'}));
      const p = await ctx.newPage();
      await p.goto(base + 'sw-test.html');
      await p.evaluate(() =>
        Promise.race([
          navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready),
          new Promise(ok => setTimeout(ok, 30000))
        ]).catch(() => {})
      );
      await p
        .waitForFunction(() => navigator.serviceWorker.controller, null, {timeout: 20000})
        .catch(() => fails.push('Service worker: did not take the page over'));
      const load = u =>
        p.evaluate(
          u =>
            new Promise(ok => {
              const i = new Image();
              i.onload = () => ok(i.naturalWidth > 0);
              i.onerror = () => ok(false);
              i.src = u;
            }),
          u
        );
      // The type of the reply kept for u in the photo cache, once it is there. The worker keeps a photo after handing it
      // to the page (sw.js photo, keep: the cache write is not awaited, the page does not wait for it), so read at once
      // after the load it was often not there yet: missing at the image's load event in 73 of 90 loads (2026-11-03), and
      // "not kept as a CORS reply (undefined)" now and then on a busy machine. Up to 5 s. (Polled in the page:
      // Playwright's waitForFunction takes a returned Promise as a truthy value at once.)
      const kept = u =>
        p.evaluate(async u => {
          for (let k = 0; k < 100; k++) {
            const r = await caches.match(u, {ignoreVary: true});
            if (r) return r.type;
            await new Promise(ok => setTimeout(ok, 50));
          }
        }, u);
      // R2 answering: asked in CORS mode (an opaque reply is never kept), and kept.
      await fromR2(ctx);
      if (!(await load(R2 + 'img/' + g))) fails.push('Service worker: an R2 photo did not load from R2');
      const t = await kept(R2 + 'img/' + g);
      if (t !== 'cors') fails.push(`Service worker: the R2 photo was not kept as a CORS reply (${t})`);
      // R2 cut off: the worker serves the site's copy, kept under the R2 address, and tells the page (sw.js r2Down,
      // Codex review #392), whose next photos then come from the site straight away.
      let r2hits = 0;
      await ctx.route(
        u => u.href.startsWith(R2),
        r => (r2hits++, r.abort())
      );
      await p.evaluate(() => {
        window.R2DOWN = 0;
        navigator.serviceWorker.addEventListener('message', e => e.data && e.data.t === 'reefid-r2-down' && window.R2DOWN++);
        navigator.serviceWorker.startMessages();
      });
      if (!(await load(R2 + 'img/' + f))) fails.push('Service worker: an R2 photo did not fall back to the site');
      if (!(await p.waitForFunction(() => window.R2DOWN > 0, null, {timeout: 3000}).catch(() => null)))
        fails.push('Service worker: R2 failed but the page was not told');
      if (!(await kept(R2 + 'img/' + f))) fails.push('Service worker: the photo served from the site was not kept');
      // R2 failed twice: for a while the worker asks the site straight away (sw.js R2_PAUSE), no request held on R2.
      const n2 = r2hits;
      if (!(await load(R2 + 'img/' + f.replace(/-s\.webp$/, '.webp'))) || r2hits !== n2)
        fails.push(`Service worker: after R2 failed, the next photo asked R2 again (${r2hits - n2}) or did not load`);
      // Offline: a photo kept under the site's address is served for its R2 address.
      const h = f.replace(/-s\.webp$/, '-m.webp');
      await load(base + 'img/' + h);
      await ctx.route(
        u => u.href.startsWith(R2) || u.href.startsWith(base + 'img/'),
        r => r.abort()
      );
      if (!(await load(R2 + 'img/' + h))) fails.push('Service worker: offline, a photo kept from the site was not served for R2');
      await ctx.close();
    }
  }
  // 11. A browser driven by a program never sends to the sheet, whatever host it opens the app on (app.js LOCAL:
  // navigator.webdriver; Pierre, 2026-11-03: an agent's test on a made-up host name reached the sheet). The sync
  // script's hosts are mapped to this computer too, so a request that escaped the check could not reach Google.
  {
    const bw = await chromium.launch({
      args: ['--host-resolver-rules=MAP coral.test 127.0.0.1, MAP script.google.com 127.0.0.1, MAP script.googleusercontent.com 127.0.0.1']
    });
    const ctx = await bw.newContext({serviceWorkers: 'block'});
    await ctx.addInitScript(
      () => (localStorage.setItem('reefid-tour', '1'), localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}'))
    );
    const p = await ctx.newPage();
    await p.goto(`http://coral.test:${server.address().port}/#home`);
    await p.waitForFunction(
      () => window.APP_READY && typeof sendAnon === 'function' && typeof sendEvents === 'function' && typeof syncPush === 'function',
      null,
      {
        timeout: 60000
      }
    );
    const r = await p.evaluate(async () => {
      const f = window.fetch,
        hits = [];
      // Only writes count (POST: answers, reports, events): Home's own reads (the leaderboard, the achievements' shares)
      // are GETs, allowed from any copy, and sometimes landed in this window (the check failed now and then).
      window.fetch = (u, o) =>
        /script\.google/.test(String((u && u.url) || u)) && String((o && o.method) || 'GET').toUpperCase() === 'POST'
          ? (hits.push(String(u)), Promise.reject(new Error('x')))
          : f(u, o);
      localStorage.setItem('reefid-anonq', JSON.stringify([{id: 'w1', t: Date.now(), g: 'Acropora', a: 'Porites', ok: 0}]));
      localStorage.setItem('reefid-reports', JSON.stringify([{k: 'photo', m: 'test'}]));
      sendAnon();
      sendReports();
      sendEvents();
      // Signed in (an account saved on this device): neither its save nor its load reaches the sheet.
      SYNC = {name: 'Local test', pin: '1234', dirty: true, log: [{id: 'w2', t: Date.now(), g: 'Acropora', a: 'Acropora', ok: 1}]};
      await Promise.resolve(syncPush()).catch(() => {});
      await Promise.resolve(syncGet()).catch(() => {});
      SYNC = null;
      await new Promise(ok => setTimeout(ok, 300));
      window.fetch = f;
      return {local: LOCAL, hits};
    });
    if (!r.local) fails.push('A browser driven by a program on a made-up host name does not count as a local copy');
    if (r.hits.length) fails.push('A browser driven by a program sent to the sheet: ' + r.hits[0].slice(0, 60));
    await bw.close();
  }
  await b.close();
  server.close();
  if (fails.length) {
    console.error(`Poor connection: ${fails.length} problem(s)\n` + fails.join('\n'));
    process.exit(1);
  }
  console.log(
    'Poor connection OK: start-up without curation.json, planned and preloaded questions, photo fallback and skip, kept leaderboard, photos dropped on leaving a page, service worker install with retries, photo sizes, start-up retries, new versions without a manual reload, load order and links straight to a page, photos from R2 with the site as the fallback.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
