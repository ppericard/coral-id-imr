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

// Admin smoke test in demo mode (admin.html?demo, admin-demo.js; Pierre, 2026-11-01: agents must be able to see and test
// the admin): every page of the 4 tabs at 390 and 1280 px with no page error, then the main actions on made-up data:
// open a player, merge two names, delete a test account, the reports in Triage, Skip and Reject in Candidates, Publish.
// Checks that nothing leaves the page (no call reaches the sync script or GitHub) and that the demo never writes the real
// admin storage keys. Needs Playwright like pages.smoke.js. Locally: node tests/admin.smoke.js
(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch(),
    fails = [],
    out = [];
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
    await ctx.route(
      u => !u.href.startsWith(base),
      r => {
        if (/script\.google|api\.github/.test(r.request().url())) out.push(r.request().url());
        r.abort();
      }
    );
    const p = await ctx.newPage(),
      errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text());
    });
    p.on('dialog', d => d.accept());
    const settle = async () => {
      await p.waitForTimeout(300);
      await p
        .waitForFunction(() => !/^\s*Loading/.test((document.querySelector('#view .note') || {}).textContent || ''), null, {timeout: 15000})
        .catch(() => fails.push(`${w}px #${location.hash}: still loading`));
      await p.waitForTimeout(200);
    };
    const go = async h => {
      errs.length = 0;
      await p.evaluate(h => (location.hash = h), h);
      await settle();
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
    };
    const text = () => p.evaluate(() => document.getElementById('view').innerText);
    await p.goto(base + 'admin.html?demo');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    if (!(await p.$('.adm-demo'))) fails.push(`${w}px: no demo banner`);
    if (await p.$('.adm-lock')) fails.push(`${w}px: lock screen shown in demo mode`);
    const pages = await p.evaluate(() => GROUPS.flatMap(g => g[2].map(x => x[0])).map(h => h || Object.keys(DATA.gen)[0]));
    for (const h of pages) await go(h);

    // Users: the made-up players, one opened, a merge and a delete.
    await go('~users');
    let t = await text();
    if (!/Ana Demo/.test(t) || !/mara demo2/.test(t)) fails.push(`${w}px Users: demo players missing`);
    await p.click('[data-uopen="mara demo2"]');
    await settle();
    await p.selectOption('[data-umerge="mara demo2"]', 'Mara Demo');
    await p.waitForFunction(() => !/mara demo2/.test(document.getElementById('view').innerText), null, {timeout: 10000}).catch(() => {});
    if (/mara demo2/.test(await text())) fails.push(`${w}px Users: merge did not remove "mara demo2"`);
    await p.click('[data-uopen="Test Demo"]');
    await settle();
    await p.click('[data-udel="Test Demo"]');
    await p.waitForFunction(() => !/Test Demo/.test(document.getElementById('view').innerText), null, {timeout: 10000}).catch(() => {});
    if (/Test Demo/.test(await text())) fails.push(`${w}px Users: delete did not remove "Test Demo"`);

    // Triage lists the demo reports; Activity shows the demo players' answers.
    await go('~triage');
    if (!/Demo report/.test(await text())) fails.push(`${w}px Triage: demo reports missing`);
    await go('~stats');
    if (/No answers yet/.test(await text())) fails.push(`${w}px Activity: no answers`);

    // Candidates: Skip sets the photo aside, Reject marks it reviewed (a draft change), then Publish (in memory).
    await go('~cand');
    if (await p.$('[data-skip]')) {
      await p.click('[data-skip]');
      await settle();
      await p.click('[data-rej]');
      await settle();
      if (!(await p.evaluate(() => Object.keys(DRAFT.seen || {}).some(k => k.startsWith('cand:')))))
        fails.push(`${w}px Candidates: Reject left no mark in the draft`);
    } else fails.push(`${w}px Candidates: no candidate to try Skip and Reject on`);
    errs.length = 0;
    if (await p.isEnabled('#save')) {
      await p.click('#save');
      await p
        .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 10000})
        .catch(() => fails.push(`${w}px Publish: no "Published" toast`));
    } else fails.push(`${w}px Publish: button still disabled after a change`);
    if (errs.length) fails.push(`${w}px actions: ${errs.slice(0, 3).join(' | ')}`);

    const keys = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    const real = keys.filter(k => /^imr-(curation|admin)/.test(k));
    if (real.length) fails.push(`${w}px: demo wrote real admin keys: ${real.join(', ')}`);
    await ctx.close();
  }
  await b.close();
  server.close();
  if (out.length) fails.push('Calls left the page in demo mode: ' + [...new Set(out)].slice(0, 5).join(', '));
  if (fails.length) {
    console.error(`Admin demo: ${fails.length} problem(s)\n` + fails.join('\n'));
    process.exit(1);
  }
  console.log('Admin demo OK: every page at 390 and 1280 px, merge, delete, triage, skip, reject, publish; nothing sent.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
