const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('playwright');
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
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(u === '/sw.js' && SWV ? b + `\n// deploy ${SWV}\n` : b); // test 9: a new deploy changes sw.js
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
// Speed numbers are measured by tools/perf.js, not here. Locally: node tests/net.smoke.js
(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch(),
    fails = [];
  const ctxOf = async (opts = {}) => {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}, deviceScaleFactor: opts.dpr || 1, serviceWorkers: 'block'});
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('imr-tour', '1');
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
    if (opts.failFull) await ctx.route(/\/img\/[^/]+(?<!-s)\.webp/, r => r.abort('connectionreset'));
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
      const want = await p2.evaluate(() => (NEXTQ && NEXTQ.args ? NEXTQ.args[4].shown.map(x => resized(img(x), '')) : []));
      await p2.evaluate(() => document.querySelectorAll('.unlock .next, .achpop').forEach(x => x.click && x.click()));
      await p2.click('#next');
      const got = await p2.evaluate(() => [...document.querySelectorAll('#view .qstage img')].map(i => resized(i.getAttribute('src'), '')));
      if (!want.length || want.some((u, k) => got[k] !== u)) fails.push(`Next did not show the planned question (${want[0]} vs ${got[0]})`);
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
      localStorage.setItem('imr-board-cache', JSON.stringify({rows: [['Kept Player', 40, 1.2]], t: Date.now() - 600000}))
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
    await p.goto(base);
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
    const tier = u => (/-s\.webp/.test(u) ? 's' : /-m\.webp/.test(u) ? 'm' : 'full');
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
    const tour = () => localStorage.setItem('imr-tour', '1');
    // Phone, 2x: one photo ~390 px wide -> 960 px file.
    await run({width: 390, height: 800}, 2, tour, async (p, t) => {
      if (!t.length || t.some(x => x === 's')) fails.push(`Phone 2x quiz photos too small: ${t}`);
      if (t.some(x => x === 'full') && t.length === 1) fails.push(`Phone 2x single quiz photo took 1600 px: ${t}`);
      // Home band thumbnails (~60 px on a phone): the 240 px files (Pierre: no big files for how they are shown).
      await p.evaluate(() => (location.hash = 'home'));
      await p.waitForTimeout(1500);
      const h = await p.evaluate(() => [...document.querySelectorAll('.hdtiles img')].map(i => i.currentSrc).filter(Boolean)); // lazy: those in view
      if (!h.length || h.some(u => !/-t\.webp/.test(u))) fails.push(`Home thumbnails on a 2x phone not 240 px: ${h.slice(0, 2)}`);
    });
    // Auto on a slow connection (Network Information API) = Saver: smaller files, enlarged view 960 then 1600 px.
    await run(
      {width: 390, height: 800},
      2,
      () => {
        localStorage.setItem('imr-tour', '1');
        Object.defineProperty(navigator, 'connection', {value: {effectiveType: '3g', saveData: false}, configurable: true});
      },
      async (p, t) => {
        if (t.some(x => x === 'full')) fails.push(`Auto on 3G still loaded 1600 px quiz photos: ${t}`);
        await p.click('#view .qstage .zoom');
        const lb1 = await p.getAttribute('#lightbox .lb-in img', 'src');
        if (tier(lb1) !== 'm') fails.push(`Saver enlarged view did not start at 960 px: ${lb1}`);
        await p.click('#lightbox .lb-in img');
        const lb2 = await p.getAttribute('#lightbox .lb-in img', 'src');
        if (tier(lb2) !== 'full') fails.push(`Saver enlarged view did not load 1600 px on a click: ${lb2}`);
      }
    );
    // Full: 1600 px even on a small screen.
    await run(
      {width: 390, height: 800},
      1,
      () => {
        localStorage.setItem('imr-tour', '1');
        localStorage.setItem('imr-photo-q', JSON.stringify('full'));
      },
      async (p, t) => {
        if (t.some(x => x !== 'full')) fails.push(`Full quality did not load 1600 px: ${t}`);
      }
    );
    // Big dense screen: a box bigger than guessed gets the 1600 px file.
    await run({width: 1440, height: 900}, 2, tour, async (p, t) => {
      if (t.length === 1 && t[0] !== 'full') fails.push(`Big 2x screen single quiz photo not 1600 px: ${t}`);
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
  {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}});
    await ctx.addInitScript(() => localStorage.setItem('imr-tour', '1'));
    await ctx.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    const p = await ctx.newPage();
    await p.goto(base);
    await ready(p);
    await p.evaluate(() => navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready)); // https only in the app
    await p.reload();
    await ready(p);
    if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) fails.push('Update test: the page is not controlled');
    // A local copy never sends anonymous answers or reports to the real sheet, even with the service worker in (its
    // requests pass by ctx.route): tools/perf.js runs had reached it.
    const sent = await p.evaluate(async () => {
      const f = window.fetch,
        hits = [];
      window.fetch = (u, o) =>
        /script\.google/.test(String((u && u.url) || u)) ? (hits.push(String(u)), Promise.reject(new Error('x'))) : f(u, o);
      localStorage.setItem('imr-anonq', JSON.stringify([{id: 'a1', t: Date.now(), g: 'Acropora', a: 'Porites', ok: 0}]));
      localStorage.setItem('imr-reports', JSON.stringify([{k: 'photo', m: 'test'}]));
      sendAnon();
      sendReports();
      await new Promise(ok => setTimeout(ok, 300));
      window.fetch = f;
      return hits;
    });
    if (sent.length) fails.push('A local copy sent answers or reports to the sheet: ' + sent[0].slice(0, 60));
    await p.evaluate(() => (window.__old = 1));
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
    await r.addInitScript(() => localStorage.setItem('imr-tour', '1'));
    await r.route(
      u => !u.href.startsWith(base),
      x => x.abort()
    );
    const f = await r.newPage();
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
    SWV = 9;
    await f.evaluate(() => swCheck());
    await f
      .waitForFunction(() => UPDATED, null, {timeout: 30000})
      .catch(() => fails.push('A tab first opened before any install missed the next version'));
    await r.close();
    // The admin page does the same (its demo mode: no token, nothing sent).
    const q = await ctx.newPage();
    await q.goto(base + 'admin.html?demo');
    await q.waitForFunction(() => typeof UPDATED !== 'undefined' && navigator.serviceWorker.controller, null, {timeout: 20000});
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
  await b.close();
  server.close();
  if (fails.length) {
    console.error(`Poor connection: ${fails.length} problem(s)\n` + fails.join('\n'));
    process.exit(1);
  }
  console.log(
    'Poor connection OK: start-up without curation.json, planned and preloaded questions, photo fallback and skip, kept leaderboard, photos dropped on leaving a page, service worker install with retries, photo sizes, start-up retries, new versions without a manual reload.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
