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
    // Candidate pass of the judging agent (suggest.json "cand", tools/judging_cand.py): two made-up judgments.
    const CF = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'cand.json'))).cand)
      .flat()
      .filter(x => !x.cf)
      .slice(0, 2)
      .map(x => x.f);
    await ctx.route(base + 'suggest.json', r =>
      r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          v: 1,
          cand: {[CF[0]]: {v: 'macro', q: 3, k: 'best', fm: 'x'}, [CF[1]]: {v: 'wide', q: 1, k: 'dup', fm: 'M', n: 'Same colony as 1'}}
        })
      })
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
    // Names joined with the anonymous stats: every demo player has a level; sorting by name puts Ana first, reversed last.
    const lv = await p.$$eval('.adm-urow td:nth-child(2)', L => L.map(td => td.textContent.trim()));
    if (!lv.length || lv.some(x => x === '–')) fails.push(`${w}px Players: a level is missing (${lv.join(' ')})`);
    if (!/Not signed in \(\d+\)/.test(t)) fails.push(`${w}px Players: no "Not signed in" group`);
    const firstName = () => p.$eval('.adm-urow td b', b => b.textContent);
    await p.click('[data-usort="name"]');
    await settle();
    if ((await firstName()) !== 'Ana Demo') fails.push(`${w}px Players: sort by name, first is ${await firstName()}`);
    await p.click('[data-usort="name"]');
    await settle();
    if ((await firstName()) !== 'Test Demo') fails.push(`${w}px Players: reversed sort by name, first is ${await firstName()}`);
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
    // Errors & feedback (sheet v19 events): the one-tap answers, app errors, photos, saves, from the demo's made-up events.
    await go('~events');
    await p
      .waitForFunction(() => /Saves that failed/i.test(document.getElementById('view').innerText), null, {timeout: 10000})
      .catch(() => {});
    const evt = await text();
    if (!/About right/i.test(evt) || !/reading 'views'/.test(evt) || !/Saves that failed/i.test(evt))
      fails.push(`${w}px Errors & feedback: demo events missing`);
    await go('~triage');
    if (!/Demo report/.test(await text())) fails.push(`${w}px Triage: demo reports missing`);
    await go('~stats');
    if (/No answers yet/.test(await text())) fails.push(`${w}px Activity: no answers`);
    // Photo difficulty by genus: one lane per view, a median bar in every lane that has photos.
    await go('~stats-photos');
    const ln = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.adm-gstrips .adm-lanes')];
      return {
        rows: rows.length,
        lanes: rows.length ? rows[0].querySelectorAll('.adm-strip').length : 0,
        noMedian: [...document.querySelectorAll('.adm-lanes .adm-strip')].filter(x => x.querySelector('button') && !x.querySelector('i'))
          .length
      };
    });
    if (!ln.rows || ln.lanes < 2 || ln.noMedian) fails.push(`${w}px Photo difficulty: lanes per view missing ${JSON.stringify(ln)}`);

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
    // Cap per genus x view: candidates of full cells are left out of the queue; adding one asks which colony it replaces,
    // that colony's photos become sheet only, the candidate is added, and one Undo takes both back.
    const cap = await p.evaluate(() => {
      // The real data has full cells at 10 colonies (the cap was 10 first): lowered here so the test has some.
      CELL_MAX = 10;
      render();
      const cur = document.querySelector('.adm-sw[data-f]'),
        Q = candQueue(CSRC),
        x = candQueue('all').find(y => y.full);
      if (!x) return {none: true};
      if (candQueue('all').some(y => y.p.cf && y.full)) return {bookFull: true};
      const shownFull = cur && (Q.find(y => y.p.f === cur.dataset.f) || {}).full;
      CREPL = {n: x.n, f: x.p.f, w: cellView(x.n, x.p)};
      render();
      return {
        shownFull,
        n: x.n,
        f: x.p.f,
        w: CREPL.w,
        tiles: document.querySelectorAll('[data-repl]').length,
        refs: Object.values(DRAFT.use || {}).filter(v => v === 'ref').length,
        // Suggested colony first (unless every colony is one to keep), kept colonies last.
        order: [...document.querySelectorAll('[data-repl]')]
          .map(b => (b.classList.contains('sug') ? 's' : /keep \(/.test(b.textContent) ? 'k' : 'o'))
          .join(''),
        over: OVER,
        warn: /⚠/.test(document.querySelector('#modes [data-mode="todo"]').textContent)
      };
    });
    if (cap.bookFull) fails.push(`${w}px Cap: a Coral Finder book candidate (never in games) counted as full`);
    else if (cap.none) fails.push(`${w}px Cap: no candidate waits in a full cell (expected with the real data)`);
    else {
      if (cap.shownFull) fails.push(`${w}px Cap: the swiper shows a candidate of a full cell`);
      if (cap.tiles < 10) fails.push(`${w}px Cap: replace screen shows ${cap.tiles} colonies`);
      if (!/^(s[ok]*|k+)$/.test(cap.order) || /k.*o/.test(cap.order))
        fails.push(`${w}px Cap: suggested colony not first or kept ones not last (${cap.order})`);
      if (!!cap.over !== cap.warn) fails.push(`${w}px Cap: ${cap.over} cells over the cap, To do warning ${cap.warn}`);
      await p.click('[data-repl]');
      await settle();
      const after = await p.evaluate(
        c => ({added: (entry(c.n).add || {})[c.f], refs: Object.values(DRAFT.use || {}).filter(v => v === 'ref').length}),
        cap
      );
      if (after.added !== cap.w || after.refs <= cap.refs)
        fails.push(`${w}px Cap: replace did not add the photo and move a colony to sheet only`);
      await p.click('#undo');
      await settle();
      if (await p.evaluate(c => (entry(c.n).add || {})[c.f], cap)) fails.push(`${w}px Cap: Undo did not take the replacement back`);
    }
    // The judgments reach the candidates: view, dashed quality guess, swiper weight and line, reminder of the ones left.
    const jd = await p.evaluate(F => {
      const P = Object.values(DATA.cand).flat(),
        a = P.find(x => x.f === F[0]),
        b = P.find(x => x.f === F[1]);
      return {v: a.vg, q: AUTOQ[a.f], wa: jw(a), wb: jw(b), line: jLine(b), left: candQueue('all').filter(x => !x.p.cf && !x.p.j).length};
    }, CF);
    if (jd.v !== 'macro' || jd.q !== 3) fails.push(`${w}px Judged: view or quality guess not applied (${jd.v}, ${jd.q})`);
    if (!(jd.wb < jd.wa / 10)) fails.push(`${w}px Judged: a Poor near-duplicate is not pushed back (${jd.wa} vs ${jd.wb})`);
    if (!/near-duplicate/.test(jd.line) || !/Same colony/.test(jd.line)) fails.push(`${w}px Judged: swiper line ${jd.line}`);
    await go('~cand');
    if (!jd.left || !/not judged yet/.test(await text())) fails.push(`${w}px Judged: no reminder of the candidates not judged`);
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
  console.log('Admin demo OK: every page at 390 and 1280 px, merge, delete, triage, skip, reject, cap, publish; nothing sent.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
