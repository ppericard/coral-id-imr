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
    res.end(b);
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
// Speed numbers are measured by tools/perf.js, not here. Locally: node tests/net.smoke.js
(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch(),
    fails = [];
  const ctxOf = async (opts = {}) => {
    const ctx = await b.newContext({viewport: {width: 390, height: 800}, serviceWorkers: 'block'});
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
      const want = await p2.evaluate(() => (NEXTQ && NEXTQ.args ? NEXTQ.args[4].shown.map(x => img(x)) : []));
      await p2.evaluate(() => document.querySelectorAll('.unlock .next, .achpop').forEach(x => x.click && x.click()));
      await p2.click('#next');
      const got = await p2.evaluate(() => [...document.querySelectorAll('#view .qstage img')].map(i => i.getAttribute('src')));
      if (!want.length || want.some((u, k) => got[k] !== u)) fails.push(`Next did not show the planned question (${want[0]} vs ${got[0]})`);
    }
    // A curation rebuild (Pierre published while the tab was open) drops the planned question: it could show a photo
    // the new curation excludes or moves.
    if (!(await p2.evaluate(() => (planNext('quiz'), build(), NEXTQ === null))))
      fails.push('A planned question survived a curation rebuild');
    if (errs.length) fails.push('Plan: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 3a. Full size failing: falls back to the small version.
  {
    const {ctx, p, errs} = await ctxOf({failFull: true});
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
    'Poor connection OK: start-up without curation.json, planned and preloaded questions, photo fallback and skip, kept leaderboard, photos dropped on leaving a page, service worker install with retries.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
