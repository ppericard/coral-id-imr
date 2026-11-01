// Page smoke test (code re-review 2026-11-01, M5): serves the site locally, opens the main routes in Chromium at phone
// and desktop widths, and fails on any page error. Not a node --test file: it needs Playwright, which CI installs with
// npm into a temporary folder (no package.json in this repo). Locally: node tests/pages.smoke.js (Playwright installed).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json'};
const ROUTES = ['genera', 'g-Acropora', 'cmp', 'cmp-Pocillopora|Stylophora', 'quiz', 'quiz-duel', 'pairs', 'finder', 'progress', 'lab',
  'quiz-duel|Foo|Bar', 'g-%E0'];   // the last two are malformed links: they must not crash a page

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'}); res.end(b); });
});

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`, fails = [];
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
    // Only this site: photos from iNaturalist and the Google sync are cut off, so the test never depends on them.
    await ctx.route(u => !u.href.startsWith(base), r => r.abort());
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto(base); await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    if (errs.length) fails.push(`${w}px start: ${errs.join(' | ')}`);
    for (const h of ROUTES) {
      errs.length = 0;
      await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(700);
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
    }
    errs.length = 0;
    await p.goto(base + 'admin.html?readonly'); await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    await p.waitForTimeout(500);
    if (errs.length) fails.push(`${w}px admin.html?readonly: ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await b.close(); server.close();
  if (fails.length) { console.error('Page errors:\n' + fails.join('\n')); process.exit(1); }
  console.log(`Pages OK: ${ROUTES.length} routes + admin at 390 and 1280 px.`);
})().catch(e => { console.error(e); process.exit(1); });
