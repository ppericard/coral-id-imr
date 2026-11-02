// Page smoke test (code re-review 2026-11-01, M5): serves the site locally, opens the main routes in Chromium at phone
// and desktop widths, and fails on any page error. Not a node --test file: it needs Playwright, which CI installs with
// npm into a temporary folder (no package.json in this repo). Locally: node tests/pages.smoke.js (Playwright installed).
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
  '.webmanifest': 'application/manifest+json'
};
const ROUTES = [
  'genera',
  'g-Acropora',
  'cmp',
  'cmp-Pocillopora|Stylophora',
  'quiz',
  'quiz-duel',
  'pairs',
  'finder',
  'progress',
  'board',
  'ach',
  'lab',
  'quiz-duel|Foo|Bar',
  'g-%E0'
]; // the last two are malformed links: they must not crash a page

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

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`,
    fails = [];
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
    // Only this site: photos from iNaturalist and the Google sync are cut off, so the test never depends on them.
    await ctx.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    const p = await ctx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(base);
    await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    if (errs.length) fails.push(`${w}px start: ${errs.join(' | ')}`);
    for (const h of ROUTES) {
      errs.length = 0;
      await p.evaluate(h => {
        location.hash = h;
      }, h);
      await p.waitForTimeout(700);
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
    }
    // The one-tap question after 15 answers, and app errors queued for the sheet but never sent from a local copy (LOCAL).
    // A fresh browser that has seen the tour (a tour opened earlier in this context resumes after a reload).
    if (w === 390) {
      const c2 = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
      await c2.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await c2.addInitScript(() => {
        localStorage.setItem('imr-tour', '"done"');
        localStorage.setItem('imr-nudge', '1');
      });
      const q2 = await c2.newPage(),
        e2 = [];
      q2.on('pageerror', e => e2.push(e.message));
      await q2.goto(base + '#quiz');
      await q2.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
      let at = 0;
      for (let i = 1; i <= 20 && !at; i++) {
        await q2.waitForSelector('#view [data-c]');
        await q2.evaluate(() => document.querySelector('#view [data-c]').click());
        await q2.waitForSelector('#next');
        if (await q2.$('#after .pulse')) at = i;
        else await q2.evaluate(() => document.getElementById('next').click());
      }
      if (at !== 15) fails.push(`${w}px one-tap question: shown at answer ${at}, expected 15`);
      else {
        await q2.click('[data-pulse="hard"]');
        await q2.evaluate(() =>
          setTimeout(() => {
            throw new Error('smoke test error');
          }, 0)
        );
        await q2.waitForTimeout(300);
        const q = await q2.evaluate(() => JSON.parse(localStorage.getItem('imr-evq') || '[]').map(x => x.k + ':' + (x.r || x.msg)));
        if (!q.includes('pulse:hard') || !q.some(x => /smoke test error/.test(x))) fails.push(`${w}px events not queued: ${q.join(' | ')}`);
      }
      const other = e2.filter(e => !/smoke test error/.test(e));
      if (other.length) fails.push(`${w}px quiz: ${other.slice(0, 3).join(' | ')}`);
      await c2.close();
    }
    errs.length = 0;
    await p.goto(base + 'admin.html?readonly');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    await p.waitForTimeout(500);
    if (errs.length) fails.push(`${w}px admin.html?readonly: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  server.close();
  if (fails.length) {
    console.error('Page errors:\n' + fails.join('\n'));
    process.exit(1);
  }
  console.log(`Pages OK: ${ROUTES.length} routes + admin at 390 and 1280 px.`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
