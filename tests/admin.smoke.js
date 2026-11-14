const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js'); // playwright; contexts in reduced motion by default
const slot = require('./slot.js');
const ROOT = path.join(__dirname, '..');
// Analyses › Learning › Stops › Genus sheets opened on the demo's Pages tab (admin-demo.js: 4 visits a player at 0, 1/4, 1/2 and 3/4 of
// their answers; Ana opens 3 sheets in her first 3 visits, Carla 2, Ben 1; a device not signed in one; one visit with no
// id is counted by its device; and the visits of Players › Visits: Ben and Carla reading sheets, 12 devices that never
// answered): players, share that opened one, visits, share with one.
const SHEETS_ALL = [
  'Under 50 answers 22 50% 59 39%',
  '50-300 answers 6 50% 22 73%',
  'Over 300 answers 1 0% 1 0%',
  'All 23 48% 82 48%'
].join(' | ');
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
// the admin): every view of the 9 tabs and every old address at 390 and 1280 px with no page error, each landing on its
// tab and view, the view remembered per tab, then (once, at 1280: the layout checks alone run at both widths) the main
// actions on made-up data: open a player, merge two names,
// delete a test account, the reports in To do, the Photo stats Overview's numbers, Skip and Reject in Candidates, the auto-sort (decisions, a
// blind Check, the agreement block, undo, the auto tag, a retest), Publish.
// Checks that nothing leaves the page (no call reaches the sync script or GitHub) and that the demo never writes the real
// admin storage keys. Needs Playwright like pages.smoke.js. Locally: node tests/admin.smoke.js
// SMOKE_W=390 or 1280: one width only (tests/slot.js; default: both); SMOKE_PART / SMOKE_ONLY: some parts (below).
// The parts of this smoke (tests/slot.js parts): players, Players › List (a long name, merge and delete), the journeys,
// To do's errors and reports; photos, Growth form, Candidates, the auto-sort, Publish and the difficulty bands' colours
// (once, at 1280); main, everything else. SMOKE_PART=main|more is the group CI runs on one runner at 1280 (more: players
// and photos; the 390 px job runs them all); SMOKE_ONLY=players runs one part.
const PARTS = ['main', 'players', 'photos'];
const WIDTHS = [390, 1280];
(async () => {
  const run = slot.parts(PARTS, {main: ['main'], more: ['players', 'photos']}),
    ws = slot.widths(WIDTHS);
  await slot('admin.smoke');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch(),
    fails = [],
    out = [];
  for (const w of ws) {
    // Behaviour once, layout at both widths (test-suite review D6, 2026-11-04, approved by Pierre): every check whose result
    // can depend on the width (each view and old address landing on its tab or phone menu with no sideways scroll, the
    // subject switch, the Analyses charts and their cards, Players' "yest.", a long name on a phone, a journey's chart
    // labels, Activity's charts, Overview, Health and Stops with no sideways scroll, no page error, the demo's storage keys) runs at
    // 390 and 1280; the actions and data checks (sorting, replays, rename, merge, delete, journeys, events, Candidates,
    // the auto-sort, Publish…) run once, at 1280. SMOKE_W=390 runs the layout checks alone.
    const once = w === 1280;
    const ctx = await b.newContext({
      viewport: {width: w, height: 800},
      serviceWorkers: 'block',
      ...(process.env.SHOTS ? {deviceScaleFactor: 2} : {})
    });
    await ctx.route(
      u => !u.href.startsWith(base),
      r => {
        const url = r.request().url();
        if (/script\.google|api\.github/.test(url)) out.push(url);
        // SHOTS: the fish photos (iNaturalist) are shown in the screenshots, fetched once by curl (the proxy's settings)
        if (process.env.SHOTS && /^https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\//.test(url))
          try {
            return r.fulfill({
              contentType: 'image/jpeg',
              body: require('child_process').execFileSync('curl', ['-sfL', '--max-time', '20', url])
            });
          } catch (e) {}
        r.abort();
      }
    );
    // Candidate pass of the judging agent (suggest.json "cand", tools/judging_cand.py): made-up judgments. The auto-sort
    // (autosort.js) decides the sure ones at load: CF[0] a sure add (Good, Corallites), CF[1] a sure near-duplicate
    // (rejected), CF[2] a comparison image (left set aside, Pierre's), CF[3] unsure (his); CHK, a sure add that the
    // 1-in-20 draw makes a Check (shown to him blind).
    // The auto-sort only decides photos nobody decided, so these are taken among the candidates of a game genus that
    // Pierre's real curation.json never names (no add, move, hide, Not this genus, reject mark, exclusion, rating, form,
    // crop or auto-log entry): the first entries of cand.json were often ones he had already decided, and every publish
    // of his and every candidate refill changed the result (2026-11-03). CF[0] also has metrics that cannot stop a sure
    // Good add (autosort.js metFlag, with the admin's percentiles).
    const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, f))),
      CUR = rd('curation.json'),
      CUR_S = JSON.stringify(CUR),
      named = f => CUR_S.includes(JSON.stringify(f)) || CUR_S.includes(JSON.stringify('cand:' + f)),
      DJ = rd('data.json'),
      CJ = rd('cand.json').cand || {},
      MET = rd('metrics.json').m || {},
      {autoCheck, metFlag, curIdx, pierreOf} = require('../autosort.js'),
      GAME = new Set(require('../core.js').gameOf(DJ)),
      FREE = Object.entries(CJ)
        .filter(([g]) => GAME.has(g))
        .flatMap(([, L]) => L)
        .filter(x => !named(x.f)),
      SH = [...new Map([...Object.values(DJ.cand || {}), ...Object.values(CJ)].flat().map(x => [x.f, x])).values()]
        .filter(x => x.r && MET[x.f])
        .map(x => MET[x.f][0])
        .sort((a, b) => a - b),
      REF = SH.length ? {lo: SH[Math.floor(SH.length * 0.05)], hi: SH[Math.floor(SH.length * 0.95)]} : null,
      CF0 = FREE.find(x => !autoCheck(x.f) && !metFlag({keep: 'add'}, {q: 3}, MET[x.f], REF)),
      CF = [CF0, ...FREE.filter(x => x !== CF0 && !autoCheck(x.f)).slice(0, 3)].map(x => x && x.f),
      CHK = (FREE.find(x => autoCheck(x.f)) || {}).f;
    if (CF.some(f => !f) || !CHK) throw new Error(`not enough undecided candidates for the auto-sort test: ${CF} ${CHK}`);
    // The fish auto-sort (admin plan PR 4, autosort.js fishRun): FF[0] a sure add, FF[1] a sure near-duplicate, FF[2] a
    // sure add Pierre marked Not this (curation.json fish out, his click only): never proposed again.
    // FC: a sure add drawn as a Check (autoCheck): logged, not applied, Pierre's to answer blind in the fish Candidates.
    const FCAND = rd('fish-cand.json').cand,
      FALL = Object.entries(FCAND).flatMap(([sid, L]) => L.map(x => [sid, x.f])),
      FF = FALL.filter(([, f]) => !autoCheck(f)).slice(0, 3),
      FC = FALL.find(([, f]) => autoCheck(f));
    // Pierre's own auto-sort log (curation.json "auto": his checks, corrections and undos) would move the agreement line
    // and the decisions list under the test, so the admin gets a controlled log in its place: 40 decisions logged earlier
    // the same day, rejections of photos he rejected too (no comparison, so the agreement is the test's own). The test's
    // decisions come after them in the day's log, and must still be listed first (the latest 30). The rest of his curation
    // is served as it is.
    const ci = curIdx(CUR),
      now = new Date(),
      day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      LOG = Object.fromEntries(
        Object.keys(CUR.seen || {})
          .filter(k => k.startsWith('cand:') && pierreOf(CUR, ci, k.slice(5)).keep === 'reject')
          .slice(0, 40)
          .map(k => [k.slice(5), 'r'])
      );
    // To do › Share-alike needs share-alike photos on the site, and Pierre may remove the real ones at any Publish (he
    // removed the last ones on 2026-11-06): three of his own photos (never out of the presence rule) are served as CC BY-NC-SA.
    const SA = Object.entries(DJ.gen)
      .flatMap(([g, x]) => Object.values(x.views || {}).flatMap(L => L.filter(p => p.own && p.src).slice(0, 1)))
      .filter(p => !named(p.f))
      .slice(0, 3);
    if (SA.length < 3) throw new Error('not enough photos of Pierre to stand for share-alike ones');
    SA.forEach(p => Object.assign(p, {lic: 'cc-by-nc-sa', a: p.a.replace(/\(CC[^)]*\)/, '(CC BY-NC-SA)')}));
    await ctx.route(
      u => u.href.startsWith(base) && u.pathname === '/data.json',
      r => r.fulfill({contentType: 'application/json', body: JSON.stringify(DJ)})
    );
    await ctx.route(
      u => u.href.startsWith(base) && u.pathname === '/curation.json',
      r => r.fulfill({contentType: 'application/json', body: JSON.stringify({...CUR, auto: {[day]: LOG}, fish: {out: {[FF[2][1]]: 'x'}}})})
    );
    // A report handled in a PR (reports-handled.json, the integrator's): out of the to-do list, "handled in #577".
    await ctx.route(base + 'reports-handled.json', r =>
      r.fulfill({contentType: 'application/json', body: JSON.stringify({demorep1: {pr: 577, at: '2026-11-05'}})})
    );
    await ctx.route(base + 'suggest.json', r =>
      r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          v: 1,
          cand: {
            [CF[0]]: {v: 'macro', q: 3, k: 'best', fm: 'x'},
            [CF[1]]: {v: 'wide', q: 1, k: 'dup', fm: 'M', n: 'Same colony as 1'},
            [CF[2]]: {v: 'wide', q: 2, g: 'cmp', fm: 'M', n: 'Two genera side by side'},
            [CF[3]]: {v: 'wide', q: 3, k: 'best', fm: 'B', u: ['quality'], n: 'Soft?'},
            [CHK]: {v: 'wide', q: 2, k: 'best', fm: 'B', c: [0.2, 0.25, 0.8, 0.75]}
          },
          fish: {
            [FF[0][1]]: {jt: 'p1g0sm1', e: 5, k: 'best', ph: 'female'},
            [FF[1][1]]: {jt: 'p1g0sm1', e: 4, k: 'dup'},
            [FF[2][1]]: {jt: 'p1g0sm1', e: 5, k: 'best'},
            [FC[1]]: {jt: 'o1g1sso', e: 3, k: 'best', n: 'Demo check'}
          }
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
    // Waits for the page's state, not a fixed time (test-suite review, 2026-11-04: 300 + 200 ms at each of ~90 steps per
    // width): no demo call in flight (admin-demo.js DEMO_PENDING), no "Loading…" note, both for three frames in a row
    // (the hash change and the render a reply starts land within a frame).
    // SHOTS=<dir>: screenshots of a few states for the PR (2x, the page's own size), else nothing.
    const shot = async (name, sel) => {
      if (!process.env.SHOTS) return;
      const path = require('path').join(process.env.SHOTS, name + '.png'),
        el = sel && (await p.$(sel));
      if (el) {
        await el.scrollIntoViewIfNeeded();
        await el.screenshot({path});
      } else await p.screenshot({path});
    };
    const settle = async () => {
      await p.evaluate(() => (window.__calm = 0));
      await p
        .waitForFunction(
          () => {
            const busy = window.DEMO_PENDING > 0 || /^\s*Loading/.test((document.querySelector('#view .note') || {}).textContent || '');
            window.__calm = busy ? 0 : (window.__calm || 0) + 1;
            return window.__calm >= 3;
          },
          null,
          {timeout: 15000, polling: 'raf'}
        )
        .catch(async () =>
          fails.push(
            `${w}px ${await p.evaluate(() => location.hash)}: still loading (${await p.evaluate(() => window.DEMO_PENDING)} demo call(s) in flight)`
          )
        );
    };
    const go = async h => {
      errs.length = 0;
      await p.evaluate(h => (location.hash = h), h);
      await settle();
      if (errs.length) fails.push(`${w}px #${h}: ${errs.slice(0, 3).join(' | ')}`);
    };
    // A genus page: Photos › Genera › Live, the genus as the last segment.
    const goGenus = g => go('photos/genera/live/' + encodeURIComponent(g));
    const text = () => p.evaluate(() => document.getElementById('view').innerText);
    await p.goto(base + 'admin.html?demo');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    if (!(await p.$('.adm-demo'))) fails.push(`${w}px: no demo banner`);
    if (await p.$('.adm-lock')) fails.push(`${w}px: lock screen shown in demo mode`);
    // The end of a width's pass: its page errors, the real admin keys never written, the context closed.
    const finish = async () => {
      if (errs.length) fails.push(`${w}px actions: ${errs.slice(0, 3).join(' | ')}`);
      const keys = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
      const real = keys.filter(k => /^reefid-(curation|admin)/.test(k));
      if (real.length) fails.push(`${w}px: demo wrote real admin keys: ${real.join(', ')}`);
      await ctx.close();
    };
    // A run of the players' and photos' parts only (SMOKE_PART=more: tests/slot.js parts) skips the rest of the pass.
    if (!run.has('main')) {
      if (run.has('players')) await playersPart();
      if (once && run.has('photos')) await photosPart();
      await finish();
      continue;
    }
    // Opened with no address, the page shows Players › Activity, the recent sessions (Pierre, 2026-11-05; it was Players ›
    // List from 2026-11-04), on a phone as on a desktop.
    {
      const tab = await p.evaluate(() => (document.querySelector('#subnav .adm-subtabs [aria-pressed="true"]') || {}).textContent || '');
      const menu = await p.evaluate(() => ((document.getElementById('modesel') || {}).selectedOptions || [])[0]?.textContent || '');
      if (!/Activity/.test(tab + ' ' + menu)) fails.push(`${w}px: opened with no address on "${tab || menu}", not Players › Activity`);
      // Every subject has its Activity (Pierre, 2026-11-06, the Players pages per subject): the Fish switch lands on it.
      const fishHref = await p.evaluate(() => (document.querySelector('#subj [data-subj="fish"]') || {}).getAttribute?.('href') || '');
      if (fishHref && fishHref !== '#fish/players/activity')
        fails.push(`${w}px: the Fish switch opens ${fishHref}, not #fish/players/activity`);
    }
    // 9 tabs in 3 groups (Pierre, 2026-11-03), every former page a view: each view and each old address lands on its tab
    // (pressed in the tab row, or selected in the phone menu) and view (pressed in the view switch), with no page error and
    // no sideways scroll.
    const where = () =>
      p.evaluate(() => ({
        tab: (document.querySelector('#subnav .adm-subtabs [aria-pressed="true"]') || {}).textContent || '',
        menu: ((document.getElementById('modesel') || {}).selectedOptions || [])[0]?.textContent || '',
        view: (document.querySelector('#subnav .adm-views [aria-pressed="true"]') || {}).dataset?.view ?? null,
        views: document.querySelectorAll('#subnav .adm-views a').length,
        shown: !!document.querySelector('#subnav .adm-views') && document.querySelector('#subnav .adm-views').offsetParent !== null,
        wide: document.documentElement.scrollWidth - innerWidth
      }));
    const ROUTES = await p.evaluate(() => {
      // The corals' tabs (a tab for one unit rank only, Families, is checked on the fish side below).
      const L = TABS.filter(t => !t[4].rank).flatMap(t => {
        const V = t[2].filter(([, , o]) => !o.rank); // a view for one unit rank only (fish Photo review) is checked below
        return V.map(([h, v]) => ({h, tab: t[1], view: V.length > 1 ? h : null, n: V.length, name: v}));
      });
      // Deep links under a view: a genus page, Where to look open in full (a filter after '?'), a player's journey.
      return [
        ...L,
        {h: 'photos/genera/live/' + Object.keys(DATA.gen)[1], tab: 'Genera', view: 'photos/genera/live', n: 3},
        {h: 'inbox/coverage/games?look=all', tab: 'Coverage', view: 'inbox/coverage/games', n: 3},
        {h: 'players/list/journey/Ana Demo', tab: 'List', view: null, n: 1}
      ];
    });
    // Pierre, 2026-11-04: no tab holds a view of its own name, no group a tab of its own name.
    const same = await p.evaluate(() => [
      ...TABS.filter(t => t[2].length > 1 && t[2].some(([, v]) => v === t[1])).map(t => t[1]),
      ...GROUPS.filter(([, g, L]) => L.some(t => t[1] === g)).map(([, g]) => g)
    ]);
    if (same.length) fails.push(`${w}px: a tab or group named like what it holds: ${same.join(', ')}`);
    // Addresses (URL refonte, Q53-Q56): #group/tab/view, each segment the word on screen, lower case, joined by '-'.
    {
      const bad = await p.evaluate(() =>
        TABS.flatMap(t =>
          t[2]
            .filter(([h, v]) => {
              const seg = h.split('/'),
                word = x =>
                  x
                    .toLowerCase()
                    .replace(/&/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
              // a tab of one view has no view segment, unless that view is named for the views to come (Tree › Key, WoRMS
              // later: its address keeps its view's word)
              const named = t[2].length > 1 || seg.length === 3;
              return seg.length !== (named ? 3 : 2) || !/^[a-z0-9-]+(\/[a-z0-9-]+)+$/.test(h) || (named && seg[2] !== word(v));
            })
            .map(([h]) => h)
        )
      );
      if (bad.length) fails.push(`${w}px: addresses not #group/tab/view in the words on screen: ${bad.join(' ')}`);
    }
    if (ROUTES.length - 3 < 18) fails.push(`${w}px: fewer than 18 views`);
    for (const r of ROUTES) {
      const h = r.h;
      await go(h);
      const at = await where();
      const strip = x => x.replace(/ \(\d+\)$| ⚠$/, '');
      if (strip(at.tab) !== r.tab || strip(at.menu) !== r.tab) fails.push(`${w}px #${h}: tab ${at.tab || at.menu}, not ${r.tab}`);
      if (r.n > 1 && (at.view !== r.view || at.views !== r.n || !at.shown))
        fails.push(`${w}px #${h}: view switch ${JSON.stringify(at)}, expected ${r.view} of ${r.n}`);
      if (r.n === 1 && at.views) fails.push(`${w}px #${h}: a view switch on a one-view tab`);
      if (at.wide > 0) fails.push(`${w}px #${h}: page ${at.wide} px wider than the window`);
      // No page title (second admin review: titles were uneven): no heading repeats the page's group, tab or view; the
      // headings left name a section with its count, a genus or a player.
      const titles = await p.evaluate(
        ([h, words]) => {
          const g = (GROUPS.find(x => x[0] === h.split('/')[0]) || [])[1],
            re = [...words, g].filter(Boolean).map(x => new RegExp('(^|\\W)' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|\\W)', 'i'));
          return [...document.querySelectorAll('#view h2')]
            .filter(e => !e.querySelector('small'))
            .map(e => e.textContent.trim())
            .filter(t => re.some(x => x.test(t)));
        },
        [h, [r.tab, r.name]]
      );
      if (titles.length) fails.push(`${w}px #${h}: a page title ${JSON.stringify(titles)}`);
    }
    // The narrowest width of rule U4, 360 px, with the phone run (no job of its own): every view with no
    // page wider than the window, and Coverage's two grids with a view column sorted (its ▲ widens the header), in a
    // context of its own so the sort it leaves behind touches nothing else (Coverage's table.cov-t was 26 px too wide).
    if (w === 390) {
      const c3 = await b.newContext({viewport: {width: 360, height: 800}, serviceWorkers: 'block'});
      await c3.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      const q = await c3.newPage();
      q.on('pageerror', e => fails.push(`360px: ${e.message}`));
      await q.goto(base + 'admin.html?demo');
      await q.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
      const wide = async h => {
        await q.evaluate(h => (location.hash = h), h);
        await q.evaluate(() => (window.__calm = 0));
        await q
          .waitForFunction(
            () => {
              const busy = window.DEMO_PENDING > 0 || /^\s*Loading/.test((document.querySelector('#view .note') || {}).textContent || '');
              window.__calm = busy ? 0 : (window.__calm || 0) + 1;
              return window.__calm >= 3;
            },
            null,
            {timeout: 15000, polling: 'raf'}
          )
          .catch(() => fails.push(`360px #${h}: still loading`));
        return q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      };
      for (const r of ROUTES) {
        const h = r.h,
          x = await wide(h);
        if (x > 0) fails.push(`360px #${h}: page ${x} px wider than the window`);
      }
      for (const h of ['inbox/coverage/games', 'inbox/coverage/sheets-id-key']) {
        await wide(h);
        await q.click('.cov-t [data-cs="macro"]');
        const x = await wide(h);
        if (x > 0) fails.push(`360px #${h}, sorted on a view: page ${x} px wider than the window`);
      }
      await c3.close();
    }
    // The subject switch (admin plan PR 2): one segment per subject in the header, the corals' addresses unchanged (the
    // loop above), a subject's pages under its prefix (core.js SUBJECTS hash), only the tabs of the pages it has, a
    // page it does not have yet saying so, a link without a prefix keeping the subject when it has that page, and the
    // switch going back to the corals' page used last.
    {
      const S = await p.evaluate(() => SUBJECTS.map(s => ({id: s.id, name: s.name, hash: s.hash, pages: s.admin.pages})));
      const other = S.find(s => s.hash),
        seg = () =>
          p.evaluate(() => ({
            subj: [...document.querySelectorAll('#subj [data-subj]')].map(a => [a.dataset.subj, a.getAttribute('aria-pressed')]),
            hash: location.hash,
            note: (document.querySelector('#view > .note') || {}).textContent || '',
            tabs: [...document.querySelectorAll('#subnav .adm-subtabs a')].map(a => a.textContent.replace(/ \(\d+\)$/, '')),
            groups: [...document.querySelectorAll('#modes [data-mode]')].filter(a => !a.hidden).map(a => a.dataset.mode),
            wide: document.documentElement.scrollWidth - innerWidth
          }));
      await go('photos/review/quality');
      let at = await seg();
      if (at.subj.length !== S.length || at.subj[0][1] !== 'true') fails.push(`${w}px Subjects: switch ${JSON.stringify(at.subj)}`);
      // A mini switch in the header line at every width (Pierre, 2026-11-06), each side its subject's icon; its name shows
      // from 600 px, a label only on phones (where the logo steps aside for it); the header's controls inside the window.
      const mini = await p.evaluate(() => {
        const mid = e => (r => r.top + r.height / 2)(e.getBoundingClientRect()),
          sw = document.getElementById('subj');
        return {
          line: Math.round(Math.abs(mid(sw) - mid(document.getElementById('tools')))),
          right: Math.round(document.getElementById('tools').getBoundingClientRect().right - innerWidth),
          icons: [...sw.querySelectorAll('a')].map(a => !!a.querySelector('svg.sji')),
          names: [...sw.querySelectorAll('.adm-sjn')].map(n => n.getBoundingClientRect().width > 2)
        };
      });
      if (mini.line > 4 || mini.right > 0 || mini.icons.some(v => !v) || mini.names.some(v => v !== w >= 600))
        fails.push(`${w}px Subjects: mini switch ${JSON.stringify(mini)}`);
      await go(other.hash + 'inbox/todo/reports');
      at = await seg();
      if (
        !at.subj.some(([id, on]) => id === other.id && on === 'true') ||
        at.note ||
        !at.tabs.includes('To do') ||
        // Its Photos group: the pages it has (Families since admin plan PR 6, Candidates since PR 5a).
        !at.groups.includes('photos')
      )
        fails.push(`${w}px Subjects: ${other.id} Reports ${JSON.stringify(at)}`);
      // The fish units page (admin plan PR 6 on the book's families; Photos › Tree since Pierre, 2026-11-13, Q340): the fish
      // side's first Photos tab (Candidates the other) (never on the corals' side), the key's tree at the left (key groups,
      // the book's families with the IMR tag on those in the IMR course, their genera and species), a family's page with
      // one block per genus and one section per species, deep links by node id (#fish/photos/tree/key/<node id>).
      {
        const fu = () =>
          p.evaluate(() => ({
            hash: location.hash,
            tabs: [...document.querySelectorAll('#subnav .adm-subtabs a')].map(a => a.textContent),
            name: (document.querySelector('.adm-sname') || {}).textContent || '',
            sel: (document.querySelector('.adm-gsel2') || {}).value || '',
            fams: document.querySelectorAll('.adm-tree [role=treeitem] > .adm-g').length,
            imr: document.querySelectorAll('.adm-tree [role=treeitem] > .adm-g .adm-imrt').length,
            gens: [...document.querySelectorAll('.adm-fgen')].map(g => g.dataset.gen),
            rows: document.querySelectorAll('.adm-fgen .adm-row[data-sid]').length,
            imrGen: document.querySelectorAll('.adm-fgenh .adm-imrt').length,
            grp: document.querySelectorAll('.adm-tree [role=treeitem][aria-level="1"]').length,
            cur: (document.querySelector('.adm-tree [aria-selected="true"]') || {dataset: {}}).dataset.tt || '',
            tabbable: document.querySelectorAll('.adm-tree [tabindex="0"]').length,
            want: FISHC && FISHC.units.length,
            wantImr: FISHC && FISHC.units.filter(u => u.imr || u.imrWith).length,
            note: (document.querySelector('#view > .note') || {}).textContent || '',
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        await go(other.hash + 'photos');
        let u = await fu();
        if (u.hash !== '#' + other.hash + 'photos/tree/key' || u.tabs[0] !== 'Tree' || u.tabs.includes('Genera') || u.note)
          fails.push(`${w}px Tree: #${other.hash}photos ${JSON.stringify(u)}`);
        if (w === 1280 && (u.fams !== u.want || u.fams < 28 || u.imr !== u.wantImr || u.imr < 28 || u.grp < 5 || u.tabbable !== 1))
          fails.push(`${w}px Tree: the list ${JSON.stringify(u)}`);
        // The tree is whole: built without a problem, every family and every genus and species of the families' pages in it,
        // each under its own (the key group, the family, the genus), at its depth.
        const ti = await p.evaluate(() => {
          const T = fuTreeOf(FISHC.units),
            bad = [];
          FISHC.units.forEach(u => {
            if (ttPath(T, u.id).length !== 2) bad.push(u.id);
            u.genera.forEach(g =>
              g.species
                .filter(s => FISHC.species[s] && !FISHC.species[s].out)
                .forEach(s => {
                  const P = ttPath(T, s);
                  if (P.length !== 4 || P[1] !== u.id || P[2] !== g.id) bad.push(s);
                })
            );
          });
          return {problems: T.problems, bad: bad.slice(0, 5), leaves: T.roots.flatMap(r => ttLeaves(T, r)).length};
        });
        if (ti.problems.length || ti.bad.length || ti.leaves < 600) fails.push(`${w}px Tree: the tree ${JSON.stringify(ti)}`);
        // The old address is not kept (rule A4, no alias): it opens the tab's first family, not the family it named.
        await go(other.hash + 'photos/families/' + encodeURIComponent('f:Damselfishes'));
        u = await fu();
        if (u.hash !== '#' + other.hash + 'photos/tree/key' || u.sel !== (await p.evaluate(() => FISHC.units[0].id)))
          fails.push(`${w}px Tree: the old Families address ${JSON.stringify({hash: u.hash, sel: u.sel})}`);
        if (u.wide > 0) fails.push(`${w}px Families: page ${u.wide} px wider than the window`);
        await go(other.hash + 'photos/tree/key/' + encodeURIComponent('f:Damselfishes'));
        u = await fu();
        if (
          u.sel !== 'f:Damselfishes' ||
          !u.gens.includes('g:Chromis') ||
          !u.gens.includes('g:Amphiprion') ||
          u.rows < 20 ||
          u.imrGen < 4 ||
          u.wide > 0
        )
          fails.push(`${w}px Tree: Damselfishes ${JSON.stringify({...u, gens: u.gens.length})}`);
        if (w === 1280 && u.cur !== 'f:Damselfishes') fails.push(`${w}px Tree: Damselfishes not the row selected (${u.cur})`);
        // The Chromis heading's default thumb (no genus cover of his): its species most seen around the instance's centre
        // among the species with a reference-level adult photo in play, else with an adult photo (autosort.js fishCoverOf,
        // the species records admin-fish.js registers; Pierre, 2026-11-13, Q339 (b); 2026-11-14 on #864).
        const cs = await p.evaluate(() => {
          const t = document.querySelector('.adm-fgen[data-gen="g:Chromis"] > .adm-fgenh .adm-hthumb'),
            k = sid => fishNear(FISHC.species[sid])[0] * 1e6 + fishNear(FISHC.species[sid])[1],
            rows = [...document.querySelectorAll('.adm-fgen[data-gen="g:Chromis"] .adm-row[data-sid]')].map(r => r.dataset.sid),
            adult = q => !fishJuv(q, fuJ(q.f), DRAFT.fish),
            withRef = rows.filter(sid => FISHC.plays.some(q => q.sp === sid && adult(q) && refLevel(fishRec(q, DRAFT.fish, fuJ)))),
            sids = withRef.length ? withRef : rows.filter(sid => FISHC.plays.some(q => q.sp === sid && adult(q)));
          if (((DRAFT.fish || {}).genera || {})['g:Chromis'] || !sids.length) return {skip: 1};
          return {
            sid: t && t.dataset.sid,
            ok: !!t && k(t.dataset.sid) === Math.max(...sids.map(k)),
            best: sids.sort((a, b) => k(b) - k(a))[0]
          };
        });
        if (!cs.skip && !cs.ok) fails.push(`${w}px Tree: the Chromis heading is not its most seen species ${JSON.stringify(cs)}`);
        // Node pages (docs/ROADMAP.md "The Tree tab"): a genus and a species each open a page of their own, at both widths:
        // the path from the root in the bar (each ancestor a link), its family in the units' select, only its own species'
        // sections, its cover in force with why, the drill-down select of its children (the phone's way down); a key group
        // a light page of its families' cards. The ★ rank switch and the genus select are gone (the pages replace them).
        const np = () =>
          p.evaluate(() => ({
            hash: location.hash,
            crumbs: [...document.querySelectorAll('.adm-crumbs a')].map(a => a.getAttribute('href')),
            last: (document.querySelector('.adm-crumbs b') || {}).textContent || '',
            sel: (document.querySelector('.adm-gsel2') || {}).value,
            rows: [...document.querySelectorAll('.adm-main .adm-row[data-sid]')].map(r => r.dataset.sid),
            gens: document.querySelectorAll('.adm-main .adm-fgen').length,
            kids: [...document.querySelectorAll('[data-ttkid] option')].map(o => o.value).filter(Boolean),
            cards: [...document.querySelectorAll('.adm-tcard')].map(a => a.dataset.ttc),
            why: (document.querySelector('.adm-cvwhy') || {}).textContent || '',
            ok: !!document.querySelector('[data-ok]'),
            old: document.querySelectorAll('[data-fucv], [data-fugen]').length,
            cur: (document.querySelector('.adm-tree [aria-selected="true"]') || {dataset: {}}).dataset.tt || '',
            top: scrollY,
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        const want = await p.evaluate(() => {
          const T = fuTreeOf(FISHC.units);
          return {
            chromis: ttLeaves(T, 'g:Chromis'),
            path: ttPath(T, 's091'),
            k3: 'k:' + FISHC.units.find(x => x.group === 3).group,
            fams3: FISHC.units.filter(x => x.group === 3).map(x => x.id)
          };
        });
        const href = id => '#' + other.hash + 'photos/tree/key/' + encodeURIComponent(id);
        await go(other.hash + 'photos/tree/key/' + encodeURIComponent('g:Chromis'));
        u = await np();
        if (
          u.sel !== 'f:Damselfishes' ||
          u.last !== 'Chromis' ||
          u.crumbs.join() !== want.path.slice(0, 2).map(href).join() ||
          u.rows.join() !== want.chromis.join() ||
          u.gens ||
          u.kids.join() !== want.chromis.join() ||
          !/^(Your ★ cover|Default: )/.test(u.why) ||
          u.ok ||
          u.old ||
          u.top > 0 ||
          u.wide > 0 ||
          (w === 1280 && u.cur !== 'g:Chromis')
        )
          fails.push(`${w}px Tree: the genus page ${JSON.stringify({...u, rows: u.rows.length, kids: u.kids.length})}`);
        if (w === 390) await shot('tree-genus-390');
        // the drill-down: a species of the genus, its own page
        await p.selectOption('[data-ttkid]', 's091');
        await settle();
        u = await np();
        if (
          u.hash !== href('s091') ||
          u.sel !== 'f:Damselfishes' ||
          u.crumbs.join() !== want.path.slice(0, 3).map(href).join() ||
          u.rows.join() !== 's091' ||
          u.kids.length ||
          !/^(Your ★ cover|Default: )/.test(u.why) ||
          u.ok ||
          u.wide > 0 ||
          (w === 1280 && u.cur !== 's091')
        )
          fails.push(`${w}px Tree: the species page ${JSON.stringify(u)}`);
        // a key group: its families' cards, no unit chosen in the select
        await go(other.hash + 'photos/tree/key/' + encodeURIComponent(want.k3));
        u = await np();
        if (
          u.sel !== '' ||
          u.cards.join() !== want.fams3.join() ||
          u.rows.length ||
          u.why ||
          u.wide > 0 ||
          (w === 1280 && u.cur !== want.k3)
        )
          fails.push(`${w}px Tree: a key group ${JSON.stringify(u)}`);
        if (w === 390) await shot('tree-group-390');
        await p.click(`.adm-tcard[data-ttc="${want.fams3[0]}"]`);
        await settle();
        u = await np();
        if (u.hash !== href(want.fams3[0]) || u.sel !== want.fams3[0] || !u.ok || !u.gens)
          fails.push(`${w}px Tree: a group's card ${JSON.stringify({...u, rows: u.rows.length})}`);
        // A cover picked on a genus's page and on a species' page, each undone and picked again, then Publish, at both widths
        // (a phone has no tree: the drill-down reaches them), in a context of its own so the published file stays the
        // demo's for the rest of the pass: the draft holds each pick under its node's id, the bar says it is his, Undo
        // takes it back, Publish's summary counts them and the published fish part carries them (demo: kept in memory).
        {
          const nc = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
          await nc.route(
            u => !u.href.startsWith(base),
            r => r.abort()
          );
          const q = await nc.newPage(),
            ne = [],
            dlg = [];
          q.on('pageerror', e => ne.push(e.message));
          q.on('dialog', d => (dlg.push(d.message()), d.accept()));
          await q.goto(base + 'admin.html?demo#' + other.hash + 'photos/tree/key/' + encodeURIComponent('k:3'));
          await q
            .waitForFunction(() => document.querySelector('.adm-tcard'), null, {timeout: 90000})
            .catch(() => ne.push('the group page never drew'));
          const nsettle = () => q.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          const pick = async id => {
            const f = await q.evaluate(() => {
              const t = [...document.querySelectorAll('.adm-main .adm-tile[data-play]')].find(
                x =>
                  !x.querySelector('[data-fu="cover"]').disabled &&
                  x.querySelector('[data-fu="cover"]').getAttribute('aria-pressed') !== 'true'
              );
              return t && t.dataset.f;
            });
            if (!f) return (ne.push(`${id}: no photo to pick`), null);
            await q.click(`.adm-main .adm-tile[data-f="${f}"] [data-fu="cover"]`);
            await nsettle();
            const st = await q.evaluate(
              ([id, f]) => ({
                cover: (((DRAFT.fish || {}).genera || {})[id] || {}).cover,
                why: (document.querySelector('.adm-cvwhy') || {}).textContent || '',
                on: document.querySelector(`.adm-main .adm-tile[data-f="${f}"] [data-fu="cover"]`).getAttribute('aria-pressed')
              }),
              [id, f]
            );
            if (st.cover !== f || !/^Your ★ cover/.test(st.why) || st.on !== 'true') ne.push(`${id}: the pick ${JSON.stringify(st)}`);
            await q.evaluate(() => undo());
            await nsettle();
            const un = await q.evaluate(id => (((DRAFT.fish || {}).genera || {})[id] || {}).cover, id);
            if (un === f) ne.push(`${id}: Undo left the pick`);
            await q.click(`.adm-main .adm-tile[data-f="${f}"] [data-fu="cover"]`);
            await nsettle();
            return f;
          };
          // the group's card, then the drill-down to a genus of several species, then one of its species
          await q.click(`.adm-tcard[data-ttc="f:Damselfishes"]`);
          await nsettle();
          await q.selectOption('[data-ttkid]', 'g:Chromis');
          await nsettle();
          const gf = await pick('g:Chromis');
          await q.selectOption('[data-ttkid]', 's091');
          await nsettle();
          const sf = await pick('s091');
          if (w === 390 && process.env.SHOTS)
            await q.screenshot({path: require('path').join(process.env.SHOTS, 'tree-species-pick-390.png')});
          const sum = await q.evaluate(() => pubSummary());
          if (!/1 fish genus cover/.test(sum) || !/1 fish species cover/.test(sum)) ne.push(`Publish summary ${JSON.stringify(sum)}`);
          await q.click('#save');
          await q
            .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 15000})
            .catch(() => ne.push('Publish: no "Published" toast'));
          const pub = await q.evaluate(() => (SAVED.fish || {}).genera || {});
          if ((pub['g:Chromis'] || {}).cover !== gf || (pub.s091 || {}).cover !== sf)
            ne.push(`published ${JSON.stringify({g: pub['g:Chromis'], s: pub.s091, gf, sf})}`);
          // A node he covered whose rule picks another photo, still open: its page links to Cover proposals, which shows it.
          const pn = await q.evaluate(() => (coverOpen(coverList(), DRAFT.fish)[0] || {}).id || null);
          if (pn) {
            await q.evaluate(h => (location.hash = h), '#' + other.hash + 'photos/tree/key/' + encodeURIComponent(pn));
            await nsettle();
            const ln = await q.$('.adm-cvwhy a');
            if (!ln) ne.push(`${pn}: no link to its cover proposal`);
            else {
              await ln.click();
              await q
                .waitForFunction(n => document.querySelector(`.adm-cprop[data-n="${n}"]`), pn, {timeout: 30000})
                .catch(() => ne.push(`${pn}: its cover proposal not shown`));
            }
          }
          if (ne.length) fails.push(`${w}px Tree: a node's cover picked and published: ${ne.slice(0, 4).join(' | ')}`);
          await nc.close();
        }
        // The keys (the WAI-ARIA tree pattern), at 1280 where the tree shows: → unfolds the family, ↓ its first genus, Enter
        // opens that genus (the focus stays on it), ← back to the family.
        if (w === 1280) {
          await go(other.hash + 'photos/tree/key/' + encodeURIComponent('f:Damselfishes'));
          await p.evaluate(() => {
            const o = ttOpen(fuTreeOf(FISHC.units));
            o.delete('f:Damselfishes');
            render();
          });
          await p.focus('.adm-tree [aria-selected="true"]');
          const act = () =>
            p.evaluate(() => ({
              id: document.activeElement.dataset.tt,
              ex: document.activeElement.getAttribute('aria-expanded'),
              hash: location.hash
            }));
          await p.keyboard.press('ArrowRight');
          const k1 = await act();
          await p.keyboard.press('ArrowDown');
          const k2 = await act();
          await p.keyboard.press('Enter');
          await settle();
          const k3 = await act();
          await p.keyboard.press('ArrowLeft');
          const k4 = await act(),
            g0 = await p.evaluate(() => FISHC.units.find(x => x.id === 'f:Damselfishes').genera[0].id);
          if (
            k1.id !== 'f:Damselfishes' ||
            k1.ex !== 'true' ||
            k2.id !== g0 ||
            k3.id !== g0 ||
            k3.hash !== '#' + other.hash + 'photos/tree/key/' + encodeURIComponent(g0) ||
            k4.id !== 'f:Damselfishes'
          )
            fails.push(`${w}px Tree: the keys ${JSON.stringify([k1, k2, k3, k4, g0])}`);
          // The tree keeps its scroll when the page is drawn again (a click on a photo), never jumping back to the row.
          const sc = await p.evaluate(() => {
            const L = document.querySelector('.adm-list');
            L.scrollTop = L.scrollHeight;
            const want = L.scrollTop;
            render();
            return [want, document.querySelector('.adm-list').scrollTop];
          });
          if (!sc[0] || sc[0] !== sc[1]) fails.push(`${w}px Tree: the tree's scroll after a redraw ${JSON.stringify(sc)}`);
          // The tree's small words are readable: 12 px or more (rule U3, the type scale's --fs-xs; Codex review #861).
          const fs = await p.evaluate(() =>
            [...document.querySelectorAll('.adm-tree .adm-ttr, .adm-tree small')].reduce(
              (m, x) => Math.min(m, parseFloat(getComputedStyle(x).fontSize)),
              99
            )
          );
          if (fs < 12) fails.push(`${w}px Tree: a word of the tree in ${fs} px`);
          // A genus opened, another page, then Back: the genus's own page again.
          await go(other.hash + 'photos/tree/key/' + encodeURIComponent('g:Chromis'));
          await go(other.hash + 'photos/candidates');
          await p.evaluate(() => history.back());
          await settle();
          const back = await np();
          if (!/g%3AChromis$/.test(back.hash) || back.last !== 'Chromis' || !back.rows.length)
            fails.push(`${w}px Tree: Back to a genus ${JSON.stringify({...back, rows: back.rows.length})}`);
        }
        // Diploprion is in the Soapfishes (the book), tagged IMR (taught with the Groupers), with the Grammistidae soapfishes
        // since 2026-11-08 (Q248: one family, as in the book); an unknown family shows the first.
        await go(other.hash + 'photos/tree/key/' + encodeURIComponent('f:Soapfishes'));
        u = await fu();
        if (u.sel !== 'f:Soapfishes' || !u.gens.includes('g:Diploprion') || !u.gens.includes('g:Grammistes') || !/IMR/.test(u.name))
          fails.push(`${w}px Tree: Soapfishes ${JSON.stringify(u)}`);
        await go(other.hash + 'photos/tree/key/f%3ANone');
        u = await fu();
        if (u.sel !== (await p.evaluate(() => FISHC.units[0].id))) fails.push(`${w}px Tree: an unknown node ${JSON.stringify(u)}`);
        // What the game plays is what the admin counts (fish-game.json, whatever the route: the sure candidates and the
        // reference photos too, not curation.json's adds alone): each species' obs/target is at least the game's observations.
        await go(other.hash + 'photos/tree/key/' + encodeURIComponent('f:Damselfishes'));
        const gp = await p.evaluate(() => {
          const rows = [...document.querySelectorAll('.adm-fgen .adm-row[data-sid]')].map(r => {
            const sid = r.dataset.sid,
              F = DRAFT.fish || {},
              obs = new Set(
                FISHC.plays
                  .filter(q => q.sp === sid && q.auto && !(F.seen || {})[q.f] && !(F.exclude || {})[q.f] && !(F.out || {})[q.f])
                  .map(q => q.o || q.f)
              ).size,
              m = /(\d+)\/(\d+)/.exec((r.querySelector('h3 b') || {}).textContent || '');
            return {sid, obs, shown: m ? +m[1] : -1, auto: FISHC.plays.filter(q => q.sp === sid && q.auto).length};
          });
          return {
            rows: rows.length,
            bad: rows.filter(r => r.shown < r.obs).slice(0, 3),
            auto: rows.reduce((a, r) => a + r.auto, 0),
            over8: rows.filter(r => r.shown > 8).length,
            loaded: !!FISHC.plays
          };
        });
        // A reference photo only the game holds has no Not this (the publish rebuild resolves a correction against fish-cand.json
        // alone), but can be removed or excluded.
        const rf = await p.evaluate(() => {
          const r = FISHC.plays.find(q => q.auto === 'ref' && FISHC.units.some(u => u.id === 'f:Damselfishes' && u.species.includes(q.sp))),
            t = r && document.querySelector(`.adm-tile[data-f="${r.f}"]`);
          return t && {not: !!t.querySelector('[data-fu="not"]'), remove: !!t.querySelector('[data-fu="remove"]')};
        });
        if (!rf || rf.not || !rf.remove) fails.push(`${w}px Families: a game-only photo's buttons ${JSON.stringify(rf)}`);
        if (!gp.loaded || !gp.rows || gp.bad.length || !gp.auto || !gp.over8)
          fails.push(`${w}px Families: the game's photos are not counted ${JSON.stringify(gp)}`);
        // A species whose photos come from another iNaturalist taxon (fish.json photoTaxon, Q354 b) says so under its IMR
        // name, on one line of its own; no other species does.
        const ptx = await p.evaluate(() => {
          const r = document.querySelector('.adm-row[data-sid="s088"]'),
            x = r && r.querySelector('h3 .adm-ptx');
          return {
            name: r ? (r.querySelector('h3 small i') || {}).textContent : null,
            line: x ? x.textContent : null,
            block: x ? getComputedStyle(x).display : null,
            others: [...document.querySelectorAll('.adm-row[data-sid] .adm-ptx')].length
          };
        });
        if (
          ptx.name !== 'Chromis agilis' ||
          ptx.line !== 'Photos from Pycnochromis pacifica (iNat), Pacific form; IMR name kept' ||
          ptx.block !== 'block' ||
          ptx.others !== 1
        )
          fails.push(`${w}px Families: the photo taxon line ${JSON.stringify(ptx)}`);
        // Fish Coverage (admin plan PR 8): Inbox › Coverage › Games on the fish side, per family, genus or species, To do
        // and Where to look; the corals keep their grid.
        await go(other.hash + 'inbox/coverage/games');
        const cv = () =>
          p.evaluate(() => ({
            tabs: [...document.querySelectorAll('#subnav .adm-subtabs a')].map(a => a.textContent.replace(/ \(\d+\)$/, '')),
            views: document.querySelectorAll('#subnav .adm-views a').length,
            rows: document.querySelectorAll('.adm-fishcovt tbody tr').length,
            head: (document.querySelector('.adm-fishcovt thead th') || {}).textContent || '',
            look: document.querySelectorAll('.adm-fishcov .cov-lk').length,
            todo: document.querySelectorAll('.adm-ftodo [data-fishlv]').length,
            coral: !!document.querySelector('.cov-t:not(.adm-fishcovt)'),
            fams: FISHC && FISHC.units.length,
            note: (document.querySelector('#view > .note') || {}).textContent || '',
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        let c = await cv();
        // Its views: Games and Rights (every subject's, admin.js EVERY).
        if (!c.tabs.includes('Coverage') || c.views !== 2 || c.head !== 'Family' || c.rows !== c.fams || c.coral || c.note || c.wide > 0)
          fails.push(`${w}px Fish Coverage: ${JSON.stringify(c)}`);
        if (once) {
          await p.click('[data-fishlv="sp"][aria-pressed]');
          c = await cv();
          const nsp = await p.evaluate(
            () => Object.values(FISHC.species).filter(s => !s.out && FISHC.units.some(u => u.species.includes(s.id))).length
          );
          if (c.head !== 'Species' || c.rows !== nsp) fails.push(`${w}px Fish Coverage, species: ${JSON.stringify({...c, nsp})}`);
          await p.click('[data-fishlv="gen"][aria-pressed]');
          c = await cv();
          if (c.head !== 'Genus' || c.rows < 100) fails.push(`${w}px Fish Coverage, genera: ${JSON.stringify(c)}`);
          await p.click('.adm-fishcov [data-fuimr="imr"]');
          c = await cv();
          const ng = await p.evaluate(() => FISHC.units.filter(u => u.imr || u.imrWith).reduce((a, u) => a + u.genera.length, 0));
          if (c.rows !== ng) fails.push(`${w}px Fish Coverage, IMR genera: ${JSON.stringify({...c, ng})}`);
          await p.click('.adm-fishcov [data-fuimr="all"]');
          // A To do chip shows only its rows; a second click, every row again (Codex review #659).
          // ...also under IMR: the chip's count is the rows it shows (Codex review #659).
          await p.click('.adm-fishcov [data-fuimr="imr"]');
          const ci = await p.evaluate(() => {
            const b = document.querySelector('[data-fishtodo]');
            return b && {k: b.dataset.fishtodo, n: parseInt(b.textContent, 10)};
          });
          if (ci) {
            await p.click(`[data-fishtodo="${ci.k}"]`);
            if ((await cv()).rows !== ci.n) fails.push(`${w}px Fish Coverage, To do ${ci.k} under IMR: not ${ci.n} rows`);
            await p.click(`[data-fishtodo="${ci.k}"]`);
          }
          await p.click('.adm-fishcov [data-fuimr="all"]');
          const chip = await p.evaluate(() => {
            const b = document.querySelector('[data-fishtodo="spnone"]') || document.querySelector('[data-fishtodo]');
            return b && {k: b.dataset.fishtodo, n: parseInt(b.textContent, 10)};
          });
          if (chip) {
            await p.click(`[data-fishtodo="${chip.k}"]`);
            c = await cv();
            if (c.rows !== chip.n) fails.push(`${w}px Fish Coverage, To do ${chip.k}: ${c.rows} rows, not ${chip.n}`);
            await p.click(`[data-fishtodo="${chip.k}"]`);
            if ((await cv()).rows === chip.n && chip.n < 20)
              fails.push(`${w}px Fish Coverage, To do ${chip.k}: the second click kept the filter`);
          }
          await p.click('[data-fishlv="fam"][aria-pressed]');
          await go(other.hash + 'inbox/coverage/games?look=all');
          const n5 = (await cv()).look;
          await go(other.hash + 'inbox/coverage/games');
          if ((await cv()).look > 5 || n5 < (await cv()).look) fails.push(`${w}px Fish Coverage, Where to look: ${n5} in full`);
        }
        // Coverage › Rights (docs/ROADMAP.md "Rights tagged for a later split", the licence study of 2026-11-08), on both
        // sides: a row per unit with photos, each row's classes adding up to its photos and its Ready to own + open, the
        // rows adding up to the header's total (a photo is in one unit at the first level), the same total on Coverage ›
        // Games' summary line, and every photo tile of a genus or family page with its rights badge.
        for (const s of [
          {hash: '', lv0: 'gen', tile: () => goGenus('Acropora')},
          {hash: other.hash, lv0: 'fam', tile: () => go(other.hash + 'photos/tree/key/' + encodeURIComponent('f:Damselfishes'))}
        ]) {
          await go(s.hash + 'inbox/coverage/games');
          const line = await p.evaluate(() => (document.querySelector('.adm-rline') || {}).textContent || '');
          await go(s.hash + 'inbox/coverage/rights');
          const rt = () =>
            p.evaluate(() => {
              const hd = [...document.querySelectorAll('.adm-rightst thead th')].map(t => t.textContent),
                n = (tr, i) => parseInt(tr.children[i].textContent, 10) || 0,
                T = rightsAll(),
                rows = [...document.querySelectorAll('.adm-rightst tbody tr')].map(tr => ({
                  n: n(tr, 1),
                  cls: hd.slice(2, -1).reduce((a, _, i) => a + n(tr, 2 + i), 0),
                  own: hd.includes('own') ? n(tr, hd.indexOf('own')) : 0,
                  open: hd.includes('open') ? n(tr, hd.indexOf('open')) : 0,
                  ready: n(tr, hd.length - 1)
                }));
              return {
                hd,
                T,
                rows: rows.length,
                bad: rows.filter(r => r.cls !== r.n || r.ready !== r.own + r.open).length,
                sum: rows.reduce((a, r) => a + r.n, 0),
                head: (document.querySelector('.adm-rights .cov-head > b') || {}).textContent || '',
                lv: (document.querySelector('[data-rlv][aria-pressed="true"]') || {}).dataset?.rlv,
                view: (document.querySelector('#subnav .adm-views [aria-pressed="true"]') || {}).dataset?.view ?? null,
                note: (document.querySelector('#view > .note') || {}).textContent || '',
                wide: document.documentElement.scrollWidth - innerWidth
              };
            });
          let r = await rt();
          const tot = `${r.T.ready}/${r.T.n} commercial-ready`;
          if (
            r.note ||
            r.view !== 'inbox/coverage/rights' ||
            r.lv !== s.lv0 ||
            r.rows < 20 ||
            r.bad ||
            r.sum !== r.T.n ||
            r.T.ready !== r.T.own + r.T.open ||
            !r.head.startsWith(tot) ||
            !line.includes(tot) ||
            r.hd[0] !== {gen: 'Genus', fam: 'Family'}[s.lv0] ||
            r.hd.includes('book') ||
            r.wide > 0
          )
            fails.push(`${w}px Rights #${s.hash}: ${JSON.stringify({...r, line})}`);
          if (once) {
            const rows0 = r.rows;
            await p.click('[data-rlv="sp"]');
            r = await rt();
            if (r.lv !== 'sp' || r.rows <= rows0 || r.bad || r.hd[0] !== 'Species')
              fails.push(`${w}px Rights #${s.hash}, species: ${JSON.stringify(r)}`);
            await p.click(`[data-rlv="${s.lv0}"]`);
          }
          await s.tile();
          const tl = await p.evaluate(() => {
            const T = [...document.querySelectorAll('#view .adm-tile figcaption')];
            return {
              n: T.length,
              without: T.filter(c => !c.querySelector('.adm-rt')).length,
              kinds: [...new Set([...document.querySelectorAll('#view .adm-rt')].map(b => b.textContent))]
            };
          });
          if (!tl.n || tl.without || !tl.kinds.length)
            fails.push(`${w}px Rights #${s.hash}: tiles without their badge ${JSON.stringify(tl)}`);
        }
        // Fish Photo review (admin plan PR 9): Ease and Phase & framing, one family's photos in play by row; one click sets
        // Pierre's value (one Undo step); the coral views are not on the fish side, nor the fish views on the corals'.
        // Four undecided candidates each of the first family and of the Angelfishes put in play (one step, undone below).
        const h0 = await p.evaluate(() => {
          const h = HIST.length,
            F = DRAFT.fish || {},
            mine = f => [F.add, F.seen, F.exclude, F.out].some(m => m && f in m),
            add = {};
          [FISHC.units[0], FISHC.units.find(u => u.id === 'f:Angelfishes')].forEach(u => {
            const sid = u.species.find(s => (FISHC.cand[s] || []).filter(q => !mine(q.f)).length >= 4);
            FISHC.cand[sid]
              .filter(q => !mine(q.f))
              .slice(0, 4)
              .forEach(q => (add[q.f] = sid));
          });
          DRAFT.fish = {...F, add: {...(F.add || {}), ...add}};
          saveDraft();
          return h;
        });
        await go(other.hash + 'photos/review');
        const rv = () =>
          p.evaluate(() => ({
            hash: location.hash,
            views: [...document.querySelectorAll('#subnav .adm-views a')].map(a => a.textContent),
            rows: [...document.querySelectorAll('#view .adm-row h3')].map(h => h.firstChild.textContent.trim()),
            tiles: document.querySelectorAll('#view .adm-tile').length,
            agree: (document.querySelector('.adm-agree') || {}).textContent || '',
            note: (document.querySelector('#view > .note:not(.adm-agree)') || {}).textContent || '',
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        let r = await rv();
        if (
          r.hash !== '#' + other.hash + 'photos/review/ease' ||
          r.views.join() !== 'Ease,Phase & framing' ||
          !r.tiles ||
          !/^Ease: same as/.test(r.agree) ||
          r.note ||
          r.wide > 0
        )
          fails.push(`${w}px Fish Photo review: ${JSON.stringify(r)}`);
        if (once) {
          const f = await p.evaluate(() => document.querySelector('#view .adm-tile[data-f]').dataset.f);
          const e0 = await p.evaluate(f => (DRAFT.fish.ease || {})[f], f),
            to = e0 === 1 ? 2 : 1;
          await p.click(`#view .adm-tile[data-f="${f}"] [data-fre="${to}"]`);
          await settle();
          r = await rv();
          const e1 = await p.evaluate(f => (DRAFT.fish.ease || {})[f], f);
          if (e1 !== to || !r.rows.includes(`Ease ${to}${to === 1 ? ' (very hard)' : ''}`))
            fails.push(`${w}px Fish Photo review: ease ${e0} → ${e1}, rows ${r.rows}`);
          await p.evaluate(() => undo());
          await settle();
          if ((await p.evaluate(f => (DRAFT.fish.ease || {})[f], f)) !== e0) fails.push(`${w}px Fish Photo review: Undo of the ease`);
          await go(other.hash + 'photos/review/phase-framing');
          await p.selectOption('#frevfam', 'f:Angelfishes');
          await settle();
          r = await rv();
          const g = await p.evaluate(() => {
            const t = document.querySelector('#view .adm-tile[data-f]');
            return {
              f: t.dataset.f,
              phase: !!t.querySelector('[data-frp]'),
              view: !!t.querySelector('[data-frv]'),
              juv: !!t.querySelector('[data-frj]')
            };
          });
          if (!g.phase || !g.view || !g.juv || !r.rows.includes('No phase') || !/^Phase: same as/.test(r.agree))
            fails.push(`${w}px Fish Photo review, Angelfishes: ${JSON.stringify({...r, ...g})}`);
          const t0 = await p.evaluate(f => (DRAFT.fish.tags || {})[f] || '', g.f),
            // a photo the game plays on its own keeps the pass's other tags when he sets its view
            tj = await p.evaluate(f => (fuJ(f) || {}).jt || '', g.f);
          await p.click(`#view .adm-tile[data-f="${g.f}"] [data-frv="d"]`);
          await settle();
          const t1 = await p.evaluate(f => (DRAFT.fish.tags || {})[f] || '', g.f);
          if (t1[0] !== 'd' || t1.slice(1) !== (t0 || tj || 'p1g0sm1').slice(1)) fails.push(`${w}px Fish Photo review: view ${t0} → ${t1}`);
          await p.click(`#view .adm-tile[data-f="${g.f}"] [data-frp="male"]`);
          await settle();
          if ((await p.evaluate(f => DRAFT.fish.phase[f], g.f)) !== 'male' || !(await rv()).rows.includes('Male'))
            fails.push(`${w}px Fish Photo review: phase male`);
          // Juvenile on a male: the phase word goes in the same step, so the photo moves to Juvenile (Codex review #663).
          await p.click(`#view .adm-tile[data-f="${g.f}"] [data-frj]`);
          await settle();
          const jv = await p.evaluate(f => [DRAFT.fish.phase[f], (DRAFT.fish.tags[f] || '').slice(7)], g.f);
          if (jv[0] !== '' || !jv[1].includes('j') || !(await rv()).rows.includes('Juvenile'))
            fails.push(`${w}px Fish Photo review: Juvenile on a male ${jv}`);
          await p.evaluate(() => (undo(), undo(), undo()));
          await settle();
          if ((await p.evaluate(f => (DRAFT.fish.tags || {})[f] || '', g.f)) !== t0)
            fails.push(`${w}px Fish Photo review: Undo of the view`);
          // Butterflyfishes have no IMR phase lines: no phase row.
          await p.selectOption('#frevfam', 'f:Butterflyfishes');
          await settle();
          if (await p.$('#view [data-frp]')) fails.push(`${w}px Fish Photo review: a phase row on the Butterflyfishes`);
        }
        // Fish Look-alikes (admin plan PR 10): one row per IMR pair of families, phase-matched photos, Auto / Manual, Shown /
        // Hidden; the corals keep their pairs (the photos put in play above are still there).
        await go(other.hash + 'photos/look-alikes');
        const lk = () =>
          p.evaluate(() => ({
            rows: [...document.querySelectorAll('.adm-fishmont .adm-mrow')].map(r => r.querySelector('.adm-mhead b').textContent),
            prev: document.querySelectorAll('.adm-fishmont .adm-mprev img').length,
            want: fishPairs(FISHC.units).length,
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        let l = await lk();
        if (l.rows.length !== l.want || l.want < 5 || !l.rows.includes('Butterflyfishes / Angelfishes') || l.wide > 0)
          fails.push(`${w}px Fish Look-alikes: ${JSON.stringify(l)}`);
        if (once) {
          const k = 'f:Angelfishes|f:Butterflyfishes',
            row = `.adm-fishmont .adm-mrow:has([data-k="${k}"])`;
          if (await p.$(`${row} .adm-mth[data-side="a"]:not(.on)`)) {
            const f = await p.evaluate(r => document.querySelector(r + ' .adm-mth[data-side="a"]:not(.on)').dataset.f, row);
            await p.click(`${row} .adm-mth[data-f="${f}"]`);
            await p.click(`${row} [data-fmhide="1"]`);
            const e = await p.evaluate(k => (DRAFT.fish.mont || {})[k], k);
            if (!e || e.a !== f || !e.hide || !e.v || !/fish look-alike pair/.test(await p.evaluate(() => pubSummary())))
              fails.push(`${w}px Fish Look-alikes: pick and hide ${JSON.stringify(e)}`);
            await p.click(`${row} [data-fmauto]`);
            const e2 = await p.evaluate(k => (DRAFT.fish.mont || {})[k], k);
            if (!e2 || !e2.hide || e2.a || e2.v) fails.push(`${w}px Fish Look-alikes: Auto keeps only Hidden ${JSON.stringify(e2)}`);
          } else fails.push(`${w}px Fish Look-alikes: no photo to pick in ${k}`);
        }
        await go('photos/look-alikes');
        if (await p.$('.adm-fishmont')) fails.push(`${w}px Look-alikes on the corals' side drew the fish pairs`);
        await p.evaluate(h => {
          while (HIST.length > h) undo();
        }, h0);
        await settle();
        await go('photos/review/ease');
        r = await rv();
        if (!/Not for corals yet/.test(r.note) || r.views.includes('Ease'))
          fails.push(`${w}px Fish Photo review on the corals' side: ${JSON.stringify(r)}`);
        await go('inbox/coverage/games');
        c = await cv();
        if (!c.coral || c.rows) fails.push(`${w}px Coverage on the corals' side: ${JSON.stringify(c)}`);
        // The corals have no Tree tab yet (they join it in a later step), and its address says so.
        await go('photos/tree/key');
        u = await fu();
        if (!/Not for corals yet/.test(u.note) || u.tabs.includes('Tree'))
          fails.push(`${w}px Tree on the corals' side ${JSON.stringify(u)}`);
        if (once) {
          // All | IMR: the IMR course's families only, then all again (one click each, remembered).
          await go(other.hash + 'photos/tree/key/' + encodeURIComponent('f:Damselfishes'));
          await p.click('[data-fuimr="imr"]');
          u = await fu();
          if (u.fams !== u.imr || u.fams !== u.wantImr) fails.push(`${w}px Tree: the IMR filter ${JSON.stringify(u)}`);
          await p.click('[data-fuimr="all"]');
          // The actions on a family with photos in play: the order (the easiest, then the most reference-like: core.js
          // easyRank; nobody's photos moved up),
          // Feature, Cover, Remove and Undo, Not this → no game species → Put back, ×, Validated refused while something
          // is missing; the coral part of the draft untouched; everything undone after.
          // Four candidates of a species nobody decided put in play (one draft step, undone with the rest).
          const st = await p.evaluate(() => ({
            coral: JSON.stringify({...DRAFT, fish: null}),
            h: HIST.length,
            gen: JSON.stringify((DRAFT.fish || {}).genera || {})
          }));
          const fam = await p.evaluate(() => {
            const F = DRAFT.fish || {},
              mine = f => [F.add, F.seen, F.exclude, F.out].some(m => m && f in m),
              u = FISHC.units.find(
                x => x.genera.length > 1 && x.species.some(s => (FISHC.cand[s] || []).filter(p => !mine(p.f)).length >= 4)
              ),
              sid = u.species.find(s => (FISHC.cand[s] || []).filter(p => !mine(p.f)).length >= 4),
              L = FISHC.cand[sid].filter(p => !mine(p.f)).slice(0, 4);
            DRAFT.fish = {...F, add: {...(F.add || {}), ...Object.fromEntries(L.map(p => [p.f, sid]))}};
            saveDraft();
            return u.id;
          });
          await go(other.hash + 'photos/tree/key/' + encodeURIComponent(fam));
          const order = await p.evaluate(() => {
            const sec = [...document.querySelectorAll('.adm-fgen .adm-row[data-sid]')].find(
                r => r.querySelectorAll('.adm-tile').length >= 4
              ),
              F = DRAFT.fish,
              key = f => {
                const j = (SUG && SUG.fish && SUG.fish[f]) || {},
                  jt = (F.tags || {})[f] || j.jt || '';
                const e = (F.ease || {})[f] || j.e || 3,
                  p = FISHC.byF[f] || {};
                // the game's order (core.js easyRank): reference-level first, then the easiest, then refScore
                return [refLevel({e, jt, rep: p.rep || jt.slice(7).includes('r')}) ? 1 : 0, e, refScore(jt)];
              };
            const K = [...sec.querySelectorAll('.adm-tile:not(.is-feat)')].map(t => key(t.dataset.f)),
              ge = (x, y) => x[0] > y[0] || (x[0] === y[0] && (x[1] > y[1] || (x[1] === y[1] && x[2] >= y[2])));
            return {
              sid: sec.dataset.sid,
              ok: K.every((k, i) => !i || ge(K[i - 1], k)),
              K
            };
          });
          if (!order.ok) fails.push(`${w}px Families: photo order ${JSON.stringify(order)}`);
          const sec = `.adm-row[data-sid="${order.sid}"]`,
            nth = i => p.evaluate(([sec, i]) => document.querySelectorAll(sec + ' .adm-tile')[i].dataset.f, [sec, i]);
          const f0 = await nth(0);
          await p.click(`${sec} [data-f="${f0}"] [data-fu="feat"]`);
          await p.click(`${sec} [data-f="${f0}"] [data-fu="cover"]`);
          const f1 = await nth(1);
          await p.click(`${sec} [data-f="${f1}"] [data-fu="remove"]`);
          let d = await p.evaluate(
            ([fam, sid, f0, f1]) => ({
              g: DRAFT.fish.genera[fam],
              seen: DRAFT.fish.seen[f1],
              add: DRAFT.fish.add[f1],
              tile: !!document.querySelector(`[data-f="${f1}"]`),
              num: (document.querySelector(`[data-f="${f0}"] .adm-num`) || {}).textContent
            }),
            [fam, order.sid, f0, f1]
          );
          if (!d.g || !d.g.feat || d.g.feat[order.sid][0] !== f0 || d.g.cover !== f0 || d.seen !== 1 || d.add || d.tile || d.num !== '1')
            fails.push(`${w}px Families: Feature / Cover / Remove ${JSON.stringify(d)}`);
          await p.evaluate(() => undo());
          await settle();
          d = await p.evaluate(f1 => ({seen: (DRAFT.fish.seen || {})[f1], tile: !!document.querySelector(`[data-f="${f1}"]`)}), f1);
          if (d.seen || !d.tile) fails.push(`${w}px Families: Undo of Remove ${JSON.stringify(d)}`);
          await p.click(`${sec} [data-f="${f1}"] [data-fu="not"]`);
          await p.selectOption(`${sec} [data-f="${f1}"] [data-funot]`, 'x');
          await settle();
          d = await p.evaluate(f1 => ({out: (DRAFT.fish.out || {})[f1], row: !!document.querySelector(`.adm-out [data-f="${f1}"]`)}), f1);
          if (d.out !== 'x' || !d.row) fails.push(`${w}px Families: Not this ${JSON.stringify(d)}`);
          await p.click(`.adm-out [data-f="${f1}"] [data-fu="back"]`);
          await settle();
          d = await p.evaluate(f1 => ({out: (DRAFT.fish.out || {})[f1]}), f1);
          if (d.out) fails.push(`${w}px Families: Put back ${JSON.stringify(d)}`);
          // The genus's and the species' covers (Pierre, 2026-11-13), on their node pages (docs/ROADMAP.md "The Tree tab"):
          // ★ Cover on a genus's page sets the genus's cover, on a species' page the species' (each a key of fish genera: the
          // genus's 'g:' id, the species' id), one Undo step each; the bar says it is his, and the family's page marks each
          // photo with the rank it covers and rings each heading's; the drill-down opens the genus; Publish names them.
          const gc = await p.evaluate(sec => {
            const S = document.querySelector(sec);
            return {gid: S.closest('.adm-fgen').dataset.gen, t: [...S.querySelectorAll('.adm-tile[data-play]')].map(x => x.dataset.f)};
          }, sec);
          const famHash = other.hash + 'photos/tree/key/' + encodeURIComponent(fam);
          await p.selectOption('[data-ttkid]', gc.gid);
          await settle();
          if ((await p.evaluate(() => location.hash)) !== '#' + other.hash + 'photos/tree/key/' + encodeURIComponent(gc.gid))
            fails.push(`${w}px Families: the drill-down did not open ${gc.gid}`);
          await p.click(`${sec} [data-f="${gc.t[1]}"] [data-fu="cover"]`);
          await settle();
          const gw = await p.evaluate(() => (document.querySelector('.adm-cvwhy') || {}).textContent || '');
          await go(other.hash + 'photos/tree/key/' + encodeURIComponent(order.sid));
          await p.click(`${sec} [data-f="${gc.t[2]}"] [data-fu="cover"]`);
          await settle();
          const sw = await p.evaluate(
            b => ({
              why: (document.querySelector('.adm-cvwhy') || {}).textContent || '',
              bar: ((document.querySelector('.adm-filter > .adm-sthumb.mine') || {}).dataset || {}).f,
              on: (document.querySelector(`[data-f="${b}"] [data-fu="cover"]`) || {getAttribute: () => ''}).getAttribute('aria-pressed')
            }),
            gc.t[2]
          );
          if (!/^Your ★ cover/.test(gw) || !/^Your ★ cover/.test(sw.why) || sw.bar !== gc.t[2] || sw.on !== 'true')
            fails.push(`${w}px Families: the genus's and the species' pages ${JSON.stringify({gw, sw})}`);
          await go(famHash);
          const cvs = () =>
            p.evaluate(
              ([sec, gid, sid, a, b]) => ({
                g: ((DRAFT.fish.genera || {})[gid] || {}).cover,
                s: ((DRAFT.fish.genera || {})[sid] || {}).cover,
                gh: !!document.querySelector(`.adm-fgen[data-gen="${gid}"] > .adm-fgenh .adm-hthumb.mine[data-f="${a}"]`),
                sh: !!document.querySelector(`${sec} > h3 .adm-hthumb.mine[data-f="${b}"]`),
                ma: (document.querySelector(`${sec} [data-f="${a}"] .adm-covermark`) || {}).textContent || '',
                mb: (document.querySelector(`${sec} [data-f="${b}"] .adm-covermark`) || {}).textContent || '',
                fam: ((DRAFT.fish.genera || {})[FISHC.species[sid].family] || {}).cover,
                // the draft's dot on the genus's and the species' rows of the tree (unfolded on the way to their pages)
                gdot: !!document.querySelector(`.adm-tree [data-tt="${gid}"] .dot`),
                sdot: !!document.querySelector(`.adm-tree [data-tt="${sid}"] .dot`),
                sum: pubSummary()
              }),
              [sec, gc.gid, order.sid, gc.t[1], gc.t[2]]
            );
          d = await cvs();
          if (
            d.g !== gc.t[1] ||
            d.s !== gc.t[2] ||
            !d.gh ||
            !d.sh ||
            !/Genus/.test(d.ma) ||
            !/Species/.test(d.mb) ||
            d.fam !== f0 ||
            !d.gdot ||
            !d.sdot ||
            !/1 fish genus cover/.test(d.sum) ||
            !/1 fish species cover/.test(d.sum)
          )
            fails.push(`${w}px Families: genus and species covers ${JSON.stringify(d)}`);
          await p.evaluate(() => undo());
          await settle();
          d = await cvs();
          if (d.s || d.g !== gc.t[1] || d.sh) fails.push(`${w}px Families: Undo of the species cover ${JSON.stringify(d)}`);
          // A juvenile is never a cover (Pierre, 2026-11-13): a photo tagged juvenile has ★ Cover off on every node's page;
          // a pick already on one is ignored (the species heading shows another photo) and flagged, on the tile and in the bar.
          const jf = gc.t[3] || gc.t[0];
          await p.evaluate(f => {
            DRAFT.fish = fishSet(DRAFT.fish, f, 'tags', fishTag(fuJt(DRAFT.fish, f) || 'p1g0sl1', 'j'));
            saveDraft();
            render();
          }, jf);
          await settle();
          const jv = async () => {
            const out = [];
            for (const id of [fam, gc.gid, order.sid]) {
              await go(other.hash + 'photos/tree/key/' + encodeURIComponent(id));
              out.push(
                await p.evaluate(
                  ([sec, f]) => {
                    const b = document.querySelector(`${sec} [data-f="${f}"] [data-fu="cover"]`);
                    return {
                      dis: !!(b && b.disabled),
                      flag: !!document.querySelector(`${sec} [data-f="${f}"] .adm-fjcv`),
                      bar: !!document.querySelector('.adm-fjign'),
                      head: ((document.querySelector(`${sec} > h3 .adm-hthumb`) || {}).dataset || {}).f
                    };
                  },
                  [sec, jf]
                )
              );
            }
            return out;
          };
          d = await jv();
          if (!d.every(x => x.dis && !x.flag && !x.bar)) fails.push(`${w}px Families: ★ Cover on a juvenile ${JSON.stringify(d)}`);
          await p.evaluate(
            ([f, sid]) => {
              DRAFT.fish = fishCover(DRAFT.fish, sid, f);
              saveDraft();
              render();
            },
            [jf, order.sid]
          );
          await settle();
          d = await jv();
          if (!d[2] || d[2].dis || !d[2].flag || !d[2].bar || d[2].head === jf || d[0].dis !== true)
            fails.push(`${w}px Families: a species cover on a juvenile ignored and flagged ${JSON.stringify(d)}`);
          await go(famHash);
          // Other species in view (Q323): an add whose count is k (confusion possible) or the legacy m with no pass to sort
          // it is out of play, listed apart with Keep in play (count o) and Remove; Keep in play puts it back, one Undo step.
          const ko = await p.evaluate(sid => {
            const F = DRAFT.fish,
              L = (FISHC.cand[sid] || []).filter(x => ![F.add, F.seen, F.exclude, F.out].some(m => m && x.f in m)).slice(0, 2);
            if (L.length < 2) return null;
            DRAFT.fish = {
              ...F,
              add: {...F.add, [L[0].f]: sid, [L[1].f]: sid},
              tags: {...(F.tags || {}), [L[0].f]: 'p1g0smk', [L[1].f]: 'p1g0smm'}
            };
            if (SUG.fish) delete SUG.fish[L[1].f]; // not sorted by the pass
            saveDraft();
            render();
            return L.map(x => x.f);
          }, order.sid);
          await settle();
          if (!ko) fails.push(`${w}px Families: no candidates left for the other-species row`);
          else {
            d = await p.evaluate(
              ([a, b, sec]) => ({
                row: [...document.querySelectorAll('[data-fother] [data-f]')].map(t => t.dataset.f),
                inPlay: [a, b].filter(f => document.querySelector(`${sec} [data-f="${f}"]`)),
                acts: [...document.querySelectorAll(`[data-fother] [data-f="${a}"] [data-fu]`)].map(x => x.dataset.fu)
              }),
              [...ko, sec]
            );
            if (!ko.every(f => d.row.includes(f)) || d.inPlay.length || d.acts.join() !== 'zoom,keepo,remove')
              fails.push(`${w}px Families: other species out of play ${JSON.stringify(d)}`);
            await p.click(`[data-fother] [data-f="${ko[0]}"] [data-fu="keepo"]`);
            await settle();
            d = await p.evaluate(
              ([a, sec]) => ({tag: DRAFT.fish.tags[a], inPlay: !!document.querySelector(`${sec} [data-f="${a}"]`)}),
              [ko[0], sec]
            );
            if (d.tag !== 'p1g0smo' || !d.inPlay) fails.push(`${w}px Families: Keep in play ${JSON.stringify(d)}`);
            await p.evaluate(() => undo());
            await settle();
            d = await p.evaluate(a => DRAFT.fish.tags[a], ko[0]);
            if (d !== 'p1g0smk') fails.push(`${w}px Families: Undo of Keep in play left ${d}`);
          }
          const f2 = await nth(2);
          await p.click(`${sec} [data-f="${f2}"] [data-fu="exclude"]`);
          await settle();
          if (!(await p.evaluate(f2 => (DRAFT.fish.exclude || {})[f2], f2))) fails.push(`${w}px Families: × did not exclude`);
          const needs = await p.evaluate(() => (document.querySelector('.adm-needs') || {}).textContent || '');
          await p.click('[data-ok]');
          await settle();
          const ok = await p.evaluate(fam => !!((DRAFT.fish.genera || {})[fam] || {}).ok, fam);
          if (needs && ok) fails.push(`${w}px Families: Validated while "${needs}" is missing`);
          const after = await p.evaluate(() => JSON.stringify({...DRAFT, fish: null}));
          if (after !== st.coral) fails.push(`${w}px Families: the coral part of the draft changed`);
          if (!/fish family/.test(await p.evaluate(() => pubSummary())))
            fails.push(`${w}px Families: Publish does not count the fish family`);
          await p.evaluate(h => {
            while (HIST.length > h) undo();
          }, st.h);
          await settle();
          if (await p.evaluate(fam => (DRAFT.fish.genera || {})[fam], fam)) fails.push(`${w}px Families: Undo left the family's choices`);
          if ((await p.evaluate(() => JSON.stringify((DRAFT.fish || {}).genera || {}))) !== st.gen)
            fails.push(`${w}px Families: Undo left a genus or species cover`);
        }
      }
      await go(other.hash + 'photos/review/quality');
      at = await seg();
      if (!new RegExp(`Not for ${other.name.toLowerCase()} yet`).test(at.note))
        fails.push(`${w}px Subjects: ${other.id} Photo review ${JSON.stringify(at)}`);
      // The fish Candidates swiper (admin plan PR 5a, admin-fish.js): one candidate on screen with its species and
      // its IMR entry, the thinnest species first, the queue segment (All, Checks), the photo filling the screen without
      // a sideways scroll; the Check (FC) blind in the Checks queue: no judgment line, a Check tag, no suggested Add.
      await go(other.hash + 'photos/candidates');
      const fc = () =>
        p.evaluate(() => {
          const S = document.querySelector('.adm-fsw'),
            r = S && S.querySelector('.adm-swcard').getBoundingClientRect();
          return {
            f: S && S.dataset.f,
            sid: S && S.dataset.s,
            sp: ((S && S.querySelector('.adm-swg i')) || {}).textContent || '',
            sub: ((S && S.querySelector('.adm-swg small')) || {}).textContent || '',
            judge: !!(S && S.querySelector('.adm-judge')),
            chk: !!(S && S.querySelector('.adm-chk')),
            sug: !!(S && S.querySelector('[data-add].sug')),
            seg: [...document.querySelectorAll('[data-fq]')].map(b => [b.dataset.fq, b.getAttribute('aria-pressed')]),
            play: (document.querySelector('.adm-fplayn') || {}).textContent || '',
            h: r ? Math.round(r.height) : 0,
            bottom: r ? Math.round(r.bottom) : 0,
            // The decision buttons on the first screen, no page scroll (Pierre, 2026-11-06: one phone screen).
            bar: S ? Math.round(S.querySelector('.adm-swbar').getBoundingClientRect().bottom) : 0,
            scroll: document.documentElement.scrollHeight - innerHeight,
            vh: innerHeight,
            wide: document.documentElement.scrollWidth - innerWidth,
            note: (document.querySelector('#view > .note') || {}).textContent || ''
          };
        });
      at = await fc();
      const FS = await p.evaluate(() => FISHC && Object.fromEntries(Object.entries(FISHC.species).map(([k, v]) => [k, v.name])));
      if (!at.f || at.note || !FS || at.sp !== FS[at.sid] || !at.sub || at.seg.length !== 2 || !/In play \d+\/\d+/.test(at.play))
        fails.push(`${w}px Fish Candidates: ${JSON.stringify(at)}`);
      if (at.wide > 0 || at.h < 200 || at.bottom > at.vh || at.bar > at.vh || at.scroll > 0)
        fails.push(`${w}px Fish Candidates: layout ${JSON.stringify(at)}`);
      // Tags unfolded (5b; Pierre, 2026-11-06): Ease and the decision buttons still on the first screen, no page scroll;
      // the tag rows scroll in their own panel, the photo keeps some room.
      {
        const open = async () => {
          await p.click('.adm-fsw [data-ftags]');
          await settle();
        };
        if (await p.$('.adm-fsw .adm-ftags')) await open();
        await open();
        const t = await p.evaluate(() => {
          const b = q => document.querySelector(q).getBoundingClientRect(),
            T = document.querySelector('.adm-fsw .adm-ftags');
          return {
            ease: Math.round(b('.adm-fsw [aria-label="Ease"]').bottom),
            bar: Math.round(b('.adm-fsw .adm-swbar').bottom),
            card: Math.round(b('.adm-fsw .adm-swcard').height),
            panel: !!T && T.scrollHeight >= T.clientHeight,
            wide: document.documentElement.scrollWidth - innerWidth,
            vh: innerHeight,
            scroll: document.documentElement.scrollHeight - innerHeight
          };
        });
        if (t.ease > t.vh || t.bar > t.vh || t.scroll > 0 || t.wide > 0 || t.card < 120 || !t.panel)
          fails.push(`${w}px Fish Candidates: Tags open ${JSON.stringify(t)}`);
        await open();
      }
      await p.click('[data-fq="chk"]');
      await settle();
      at = await fc();
      if (at.f !== FC[1] || at.sid !== FC[0] || at.judge || !at.chk || at.sug || at.wide > 0)
        fails.push(`${w}px Fish Candidates: the Check ${FC[1]} is not shown blind ${JSON.stringify(at)}`);
      await p.click('[data-fq="all"]');
      await settle();
      // A link without a prefix clicked on a fish page (a player's journey from Players) keeps the fish side, as clicked.
      const link = h =>
        p.evaluate(h => {
          const a = document.createElement('a');
          a.href = h;
          a.id = 'subjtest';
          a.textContent = 'test';
          document.getElementById('view').prepend(a);
        }, h);
      await link('#players/activity');
      await p.click('#subjtest');
      await settle();
      at = await seg();
      if (at.hash !== '#' + other.hash + 'players/activity' || !at.subj.some(([id, on]) => id === other.id && on === 'true'))
        fails.push(`${w}px Subjects: a link without prefix left the ${other.id} side ${JSON.stringify(at)}`);
      // The list of players is one page for every subject (admin.js SHARED; Pierre, 2026-11-06): no prefix, the side on
      // screen kept (the switch inert there, its side still pressed), #fish/players/list taken to #players/list.
      await link('#players/list');
      await p.click('#subjtest');
      await settle();
      at = await seg();
      const inert = await p.evaluate(() => document.getElementById('subj').classList.contains('off'));
      if (at.hash !== '#players/list' || !at.subj.some(([id, on]) => id === other.id && on === 'true') || !inert)
        fails.push(`${w}px Subjects: the shared list from the ${other.id} side ${JSON.stringify({...at, inert})}`);
      await go(other.hash + 'players/list');
      at = await seg();
      if (at.hash !== '#players/list' || !at.subj.some(([id, on]) => id === other.id && on === 'true'))
        fails.push(`${w}px Subjects: #${other.hash}players/list ${JSON.stringify(at)}`);
      // Visits too (Pierre, 2026-11-09): one page for both subjects, #fish/players/visits taken to #players/visits, the
      // switch inert, the fish side kept for the other pages.
      await go(other.hash + 'players/visits');
      at = await seg();
      if (
        at.hash !== '#players/visits' ||
        !at.subj.some(([id, on]) => id === other.id && on === 'true') ||
        !(await p.evaluate(() => document.getElementById('subj').classList.contains('off')))
      )
        fails.push(`${w}px Subjects: #${other.hash}players/visits ${JSON.stringify(at)}`);
      // An explicit coral address keeps its subject, and Back from a fish page to it stays coral, history not rewritten
      // (Codex review #492): #players/activity, then #fish/inbox/todo/reports, then Back.
      await go('players/activity');
      at = await seg();
      const n0 = await p.evaluate(() => history.length);
      if (
        at.hash !== '#players/activity' ||
        at.subj[0][1] !== 'true' ||
        (await p.evaluate(() => document.getElementById('subj').classList.contains('off')))
      )
        fails.push(`${w}px Subjects: #players/activity not on the corals' side ${JSON.stringify(at)}`);
      await go(other.hash + 'inbox/todo/reports');
      await p.evaluate(() => history.back());
      await settle();
      at = await seg();
      const n1 = await p.evaluate(() => history.length);
      if (at.hash !== '#players/activity' || at.subj[0][1] !== 'true' || n1 !== Math.min(50, n0 + 1))
        // the browser keeps 50 entries
        fails.push(`${w}px Subjects: Back to #players/activity ${JSON.stringify({...at, n0, n1})}`);
      await p.evaluate(() => history.forward());
      await settle();
      at = await seg();
      if (at.hash !== '#' + other.hash + 'inbox/todo/reports' || !at.subj.some(([id, on]) => id === other.id && on === 'true'))
        fails.push(`${w}px Subjects: Forward to the ${other.id} Reports ${JSON.stringify(at)}`);
      if (at.wide > 0) fails.push(`${w}px Subjects: page ${at.wide} px wider than the window`);
      // The switch stays on the page on screen (Pierre, 2026-11-09): the other side's Reports, not its page used last.
      await p.click(`#subj [data-subj="${S[0].id}"]`);
      await settle();
      at = await seg();
      if (at.subj[0][1] !== 'true' || at.hash !== '#inbox/todo/reports')
        fails.push(`${w}px Subjects: back to ${S[0].id} on the same page ${JSON.stringify(at)}`);
      // A page one side lacks (a coral genus page): the other side's view of the same tab or group, one it has.
      const gen = await p.evaluate(() => Object.keys(DATA.gen)[0]);
      await p.evaluate(g => (location.hash = '#photos/genera/live/' + encodeURIComponent(g)), gen);
      await settle();
      await p.click(`#subj [data-subj="${other.id}"]`);
      await settle();
      const land = await p.evaluate(() => ({
        hash: location.hash,
        ok: typeof hasPage === 'function' && hasPage(ASUBJ, cur),
        page: typeof cur === 'string' ? cur : ''
      }));
      if (!land.ok || !land.hash.startsWith('#' + other.hash + 'photos/'))
        fails.push(`${w}px Subjects: a coral genus page switched to ${other.id} ${JSON.stringify(land)}`);
    }
    // A shorter address opens its first view; an old (pre-refonte) or unknown address opens its group's first view, else
    // the landing page, the address replaced in place (rule W3: old addresses are not translated; Q53-Q56). A deep link
    // keeps what it is about, a player's name with '/' and '?' included.
    {
      const first = await p.evaluate(() => Object.keys(DATA.gen)[0]);
      const RED = [
        ['inbox', '#inbox/todo/all', 'To do'],
        ['inbox/coverage', '#inbox/coverage/games', 'Coverage'],
        ['photos/review', '#photos/review/quality', 'Photo review'],
        ['photos/stats/nothing', '#photos/stats/overview', 'Photo stats'],
        ['analyses', '#analyses/overview', 'Overview'],
        ['players', '#players/activity', 'Activity'],
        ['~triage', '#players/activity', 'Activity'],
        ['~stats-needs', '#players/activity', 'Activity'],
        ['Acropora', '#players/activity', 'Activity'],
        ['fish/~users', '#fish/players/activity', 'Activity'],
        ['photos', '#photos/genera/live', 'Genera']
      ];
      for (const [from, to, tab] of RED) {
        await go(from);
        const at = await where(),
          hash = await p.evaluate(() => location.hash),
          strip = x => x.replace(/ \(\d+\)$| ⚠$/, '');
        if (hash !== to || strip(at.tab || at.menu) !== tab)
          fails.push(`${w}px #${from}: ${hash} on ${at.tab || at.menu}, not ${to} on ${tab}`);
      }
      // #photos lands on the first genus page.
      await go('photos');
      if (!(await p.evaluate(g => (document.querySelector('.adm-sname') || {}).textContent === g, first)))
        fails.push(`${w}px #photos: not the first genus page`);
      // Deep links: a genus page, and a journey whose name holds the separators (split before decoding).
      await go('photos/genera/live/' + encodeURIComponent('Porites'));
      if ((await p.evaluate(() => (document.querySelector('.adm-sname') || {}).textContent)) !== 'Porites')
        fails.push(`${w}px #photos/genera/live/Porites: not the Porites page`);
      const odd = 'A/B?c=1&d';
      await go('players/list/journey/' + encodeURIComponent(odd));
      const j = await p.evaluate(() => ({
        cur,
        hash: location.hash,
        tab: (document.querySelector('#subnav .adm-subtabs [aria-pressed="true"]') || {}).textContent || ''
      }));
      if (j.cur !== 'players/list/journey/' + odd || !/^List/.test(j.tab) || j.hash !== '#players/list/journey/' + encodeURIComponent(odd))
        fails.push(`${w}px a journey with '/' and '?' in the name: ${JSON.stringify(j)}`);
      // ...and keeps it through the subject switch, there and back (the page used last, encoded again: Codex review #610).
      if (await p.$('#subj [data-subj="fish"]')) {
        await p.click('#subj [data-subj="fish"]');
        await settle();
        await p.click('#subj [data-subj="coral"]');
        await settle();
        const back = await p.evaluate(() => cur);
        if (back !== 'players/list/journey/' + odd) fails.push(`${w}px a journey with '/' and '?' after the subject switch: ${back}`);
      }
      // A journey link without a prefix clicked on the fish side: the fish journey, the name whole (Codex review #610).
      await go('fish/inbox/todo/reports');
      await p.evaluate(odd => {
        const a = document.createElement('a');
        a.href = '#players/list/journey/' + encodeURIComponent(odd);
        a.id = 'oddtest';
        a.textContent = 'odd';
        document.getElementById('view').prepend(a);
      }, odd);
      await p.click('#oddtest');
      await settle();
      const fj = await p.evaluate(() => ({cur, s: ASUBJ.id}));
      if (fj.cur !== 'players/list/journey/' + odd || fj.s !== 'fish')
        fails.push(`${w}px a fish journey link with '/' and '?': ${JSON.stringify(fj)}`);
      // Opened straight from an address (a bookmark, a link), a deep link draws its page.
      const q = await ctx.newPage();
      await q.goto(base + 'admin.html?demo#photos/review/growth-form');
      await q.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
      const dl = await q.evaluate(() => ({
        cur,
        tab: (document.querySelector('#subnav .adm-views [aria-pressed="true"]') || {}).textContent || ''
      }));
      if (dl.cur !== 'photos/review/growth-form' || !/Growth form/.test(dl.tab))
        fails.push(`${w}px deep link #photos/review/growth-form opened ${JSON.stringify(dl)}`);
      await q.goto(base + 'admin.html?demo#~kcov');
      await q.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
      const ol = await q.evaluate(() => location.hash);
      if (ol !== '#players/activity') fails.push(`${w}px old address #~kcov opened ${ol}, not the landing page`);
      await q.close();
    }
    // Analyses (Pierre, 2026-11-04): the stored report (the demo computes it as the GitHub Action would, tools/analyses.js)
    // drawn in every view, with charts and no sideways scroll; the 4-choice count of Formats equals a direct count of the
    // demo's answer log; the milestone switch; the verdicts say something for every effect.
    errs.length = 0;
    await go('analyses/overview');
    await p
      .waitForFunction(() => document.querySelector('.adm-an .adm-kpis'), null, {timeout: 90000})
      .catch(() => fails.push(`${w}px Analyses: no report`));
    // Only the clear results until a list's toggle shows the others (Pierre, 2026-11-05): the first chart has no unclear
    // bar while folded, and its bars run from the most negative change (the default sort).
    const anFold = await p.evaluate(() => {
      const c = document.querySelector('.adm-an-card'),
        d = [...c.querySelectorAll('g[data-d]')].map(g => Number(g.dataset.d));
      return {
        open: (c.querySelector('[data-anmore]') || {}).ariaExpanded,
        unclear: c.querySelectorAll('.an-dbar.t-thin,.an-dbar.t-none').length,
        sorted: d.every((v, i) => !i || d[i - 1] <= v),
        n: d.length
      };
    });
    if (anFold.open === 'false' && (anFold.unclear || !anFold.sorted))
      fails.push(`${w}px Analyses folded chart: ${JSON.stringify(anFold)}`);
    // the words: every result once the toggle shows them
    await p.evaluate(() => {
      const b = document.querySelector('[data-anmore="words"]');
      if (b && b.ariaExpanded === 'false') b.click();
    });
    const anv = await p.evaluate(() => ({
      rows: document.querySelectorAll('.adm-an-eff tbody tr').length,
      verdicts: [...document.querySelectorAll('.adm-an-eff .adm-an-v')].filter(x => x.textContent.trim()).length,
      ms: document.querySelectorAll('[data-anm]').length,
      badge: (document.querySelector('.adm-an-badge') || {}).textContent || ''
    }));
    if (anv.rows < 40 || anv.verdicts !== anv.rows || anv.ms < 3 || !/^Corals: fitted on .* next at/.test(anv.badge))
      fails.push(`${w}px Analyses overview: ${JSON.stringify(anv)}`);
    // the stored report's switch: round milestones only (Pierre, 2026-11-05: 1000, 2000, …, no "All N"), the newest pressed;
    // the status line counts from it, the corals' answers only (Pierre, 2026-11-08: the demo's fish answers apart; a demo
    // script before v105 counts every subject's rows in its head, so the line counts from the answer log read)
    await p
      .waitForFunction(() => / since · /.test((document.querySelector('.adm-an-badge') || {}).textContent || ''), null, {timeout: 30000})
      .catch(() => {});
    const anseg = await p.evaluate(() => {
      const B = [...document.querySelectorAll('.adm-sseg [data-anm]')];
      return {
        labels: B.map(b => b.textContent),
        pressed: B.map(b => b.ariaPressed),
        badge: document.querySelector('.adm-an-badge').textContent,
        coral: subjCounts(ANS.all)[replaySubject()],
        fish: ANS.all.length - subjCounts(ANS.all)[replaySubject()]
      };
    });
    const newest = anseg.labels.length && Number(anseg.labels[anseg.labels.length - 1].replace('k', '')) * 1000,
      anLine = `Corals: fitted on ${newest.toLocaleString('en-US')} answers · ${(anseg.coral - newest).toLocaleString('en-US')} since · next at ${(newest + 1000).toLocaleString('en-US')}`;
    if (
      !anseg.labels.length ||
      !anseg.labels.every(l => /^\d+k$/.test(l)) ||
      anseg.pressed.join() !== anseg.labels.map((_, i, L) => String(i === L.length - 1)).join() ||
      anseg.badge !== anLine
    )
      fails.push(`${w}px Analyses milestone switch: ${JSON.stringify(anseg)}, wanted "${anLine}"`);
    // Recompute here on every screen, phones included (Pierre, 2026-11-05: it was hidden under 600 px): shown, inside the window.
    const anre = await p.evaluate(() => {
      const e = document.querySelector('[data-anre]'),
        r = e && e.getBoundingClientRect();
      return (
        e && {shown: r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none', left: r.left, right: r.right, vw: innerWidth}
      );
    });
    if (!anre || !anre.shown || anre.left < 0 || anre.right > anre.vw)
      fails.push(`${w}px Analyses: Recompute here ${JSON.stringify(anre)}`);
    // Recompute here leaves out the players and devices left out of the statistics, as the stored report does (analysis.js
    // leftOut; Codex review #801): a left-out sender's rows never reach the worker. The worker is stubbed, then put back.
    const anx = await p.evaluate(async () => {
      const subj = subjRows(ANS.all, ASUBJ.id),
        id = subj[0] && subj[0][0],
        W0 = window.Worker,
        E = USERS || ANS, // the player list's ids when loaded, else the log's (anRecompute reads them in that order)
        U0 = E.excluded;
      let got = null;
      window.Worker = function () {
        this.postMessage = m => (got = m.rows);
        this.terminate = () => {};
      };
      E.excluded = [id];
      anRecompute();
      for (let i = 0; i < 50 && !got; i++) await new Promise(r => setTimeout(r, 100));
      window.Worker = W0;
      E.excluded = U0;
      ANWORK = null;
      ANLOCS[ASUBJ.id] = null;
      ANLOC = null;
      render();
      return {
        all: subj.length,
        mine: subj.filter(r => r[0] === id).length,
        sent: got && got.length,
        left: got && got.filter(r => r[0] === id).length
      };
    });
    if (!anx.mine || anx.left !== 0 || anx.sent !== anx.all - anx.mine)
      fails.push(`${w}px Analyses: Recompute here with a sender left out ${JSON.stringify(anx)}`);
    for (const h of [
      'analyses/speed/answer-time',
      'analyses/speed/enlarging',
      'analyses/difficulty/photos',
      'analyses/difficulty/formats',
      'analyses/difficulty/mix-ups',
      'analyses/difficulty/time',
      'analyses/learning/practice',
      'analyses/learning/after-a-break',
      'analyses/learning/sessions',
      'analyses/learning/profiles'
    ]) {
      await go(h);
      const v = await p.evaluate(() => ({
        svg: document.querySelectorAll('#view svg.adm-an-svg').length,
        thin: /Not enough data yet: \d/.test((document.querySelector('.adm-an') || {}).textContent || ''),
        none: !document.querySelector('.adm-an') && document.getElementById('view').textContent.slice(0, 80),
        wide: document.documentElement.scrollWidth - innerWidth,
        cards: [...document.querySelectorAll('.adm-an .adm-scard')].filter(
          c => c.scrollWidth > c.clientWidth + 1 && !c.querySelector('.adm-tscroll')
        ).length
      }));
      if (v.svg < 2 || v.thin || v.none || v.wide > 0 || v.cards) fails.push(`${w}px Analyses #${h}: ${JSON.stringify(v)}`);
      // Effects hard to tell apart (the multifactor visualisation study, 2026-11-05): a folded card in every analysis with
      // two effects or more from one model (After a break has one); opened, its heatmap or table, no sideways scroll
      if (h !== 'analyses/learning/after-a-break' && h !== 'analyses/learning/profiles') {
        const ent = await p.evaluate(() => {
          const c = document.getElementById('anc-effects-hard-to-tell-apart');
          if (!c) return null;
          const folded = c.classList.contains('folded');
          if (folded) c.querySelector('[data-anfold]').click();
          return {
            folded,
            // the words follow the sign (Codex review #592): estimates that move together are read by their difference
            words: [...c.querySelectorAll('.adm-an-says-l li')].map(li => li.textContent),
            table: c.querySelectorAll('tbody tr').length,
            wide: document.documentElement.scrollWidth - innerWidth,
            small: [...c.querySelectorAll('svg text')].filter(t => parseFloat(getComputedStyle(t).fontSize) < 12).length
          };
        });
        const pos = ent && ent.words.filter(t => /hard to tell apart \(correlation [\d.]+, the same way\)/.test(t)),
          neg = ent && ent.words.filter(t => /hard to tell apart \(correlation [\d.]+, opposite ways\)/.test(t));
        if (
          ent &&
          (pos.some(t => !/difference/.test(t)) || neg.some(t => !/sum/.test(t)) || (h === 'analyses/difficulty/formats' && !pos.length))
        )
          fails.push(`${w}px Analyses #${h} entangled words: ${JSON.stringify(ent.words)}`);
        if (!ent || !ent.folded || !ent.table || ent.wide > 0 || ent.small)
          fails.push(`${w}px Analyses #${h} entangled: ${JSON.stringify(ent)}`);
      }
    }
    // Player profiles (Pierre, 2026-11-05, Q70-Q73): a row per made-up player with a cell per behaviour, the greyed rows
    // (under 100 answers) last, names from Players linked to their journeys, the tree, the stability line, the map of players
    {
      await go('analyses/learning/profiles');
      const pr = await p.evaluate(() => {
        const c = document.getElementById('anc-player-profiles'),
          svg = c && c.querySelector('svg.adm-an-svg');
        return (
          c && {
            rows: svg.querySelectorAll('text.an-lab').length,
            cells: svg.querySelectorAll('rect.an-h').length,
            dim: [...svg.querySelectorAll('text.an-lab')].map(t => t.classList.contains('an-dim')),
            links: svg.querySelectorAll('a[href^="#players/list/journey/"]').length,
            tree: !!svg.querySelector('path.an-tree'),
            stab: /runs with one player left out/.test(c.textContent),
            map: !!document.querySelector('#view svg circle.an-dot') && !!document.querySelector('#view line.an-arrow'),
            wide: document.documentElement.scrollWidth - innerWidth
          }
        );
      });
      const greyLast = pr && pr.dim.every((d, i) => !d || pr.dim.slice(i).every(Boolean));
      if (!pr || pr.rows < 7 || pr.cells < 7 * pr.rows || !pr.links || !pr.tree || !pr.stab || !pr.map || pr.wide > 0 || !greyLast)
        fails.push(`${w}px Analyses player profiles: ${JSON.stringify(pr)}`);
    }
    // The Wright map and the genus × player residuals (Learning › Practice): players and genera on one scale with their
    // names, the second-skill biplot with its words; no sideways scroll
    {
      await go('analyses/learning/practice');
      const wr = await p.evaluate(() => {
        const W = document.getElementById('anc-players-and-genera-on-one-scale'),
          S = document.getElementById('anc-a-second-skill');
        return {
          labels: W ? W.querySelectorAll('svg text.an-lab').length : 0,
          dots: W ? W.querySelectorAll('svg circle.an-dot').length : 0,
          skill: S ? S.querySelectorAll('svg circle.an-dot').length : 0,
          words: S ? /skill/.test(S.querySelector('.adm-an-says-l').textContent) : false,
          wide: document.documentElement.scrollWidth - innerWidth
        };
      });
      if (wr.labels < 20 || wr.dots < 5 || wr.skill < 10 || !wr.words || wr.wide > 0)
        fails.push(`${w}px Analyses Wright map and second skill: ${JSON.stringify(wr)}`);
    }
    // Does it depend on …? (the study's §5 item 6): each interaction card answers in one line with its verdict, its levels
    // drawn (the demo's log has all three), 12 px text at least, no sideways scroll
    for (const [h, id] of [
      ['analyses/speed/enlarging', 'anc-does-enlarging-help-more-on-some-views'],
      ['analyses/difficulty/mix-ups', 'anc-does-the-view-change-where-misses-go-pair-by-pair'],
      ['analyses/learning/practice', 'anc-does-practice-help-every-format-alike']
    ]) {
      await go(h);
      const ix = await p.evaluate(id => {
        const c = document.getElementById(id);
        return (
          c && {
            says: !!c.querySelector('.adm-an-ix .adm-an-v'),
            marks: c.querySelectorAll('svg circle, svg path.an-line').length,
            small: [...c.querySelectorAll('svg text')].filter(t => parseFloat(getComputedStyle(t).fontSize) < 12).length,
            wide: document.documentElement.scrollWidth - innerWidth
          }
        );
      }, id);
      if (!ix || !ix.says || ix.marks < 3 || ix.small || ix.wide > 0)
        fails.push(`${w}px Analyses #${h} interaction: ${JSON.stringify(ix)}`);
    }
    // Each genus with practice (the study's §5 item 7): one small chart a genus with its name, the words, the table
    {
      await go('analyses/learning/practice');
      const gc = await p.evaluate(() => {
        const c = document.getElementById('anc-each-genus-with-practice');
        return (
          c && {
            panels: c.querySelectorAll('.adm-an-sm figure svg').length,
            rows: c.querySelectorAll('table tbody tr').length,
            words: /80%/.test((c.querySelector('.adm-an-says-l') || {}).textContent || ''),
            wide: document.documentElement.scrollWidth - innerWidth
          }
        );
      });
      if (!gc || gc.panels < 20 || gc.rows !== gc.panels || !gc.words || gc.wide > 0)
        fails.push(`${w}px Analyses each genus with practice: ${JSON.stringify(gc)}`);
    }
    // Can we trust this model? (the study's §5 item 8): under each binary analysis its words (calibration, residuals) and
    // charts; under Answer time, its residuals' line and chart
    for (const h of [
      'analyses/speed/answer-time',
      'analyses/speed/enlarging',
      'analyses/learning/practice',
      'analyses/learning/sessions'
    ]) {
      await go(h);
      const ck = await p.evaluate(() => {
        const c = document.getElementById('anc-can-we-trust-this-model');
        return c && {words: c.querySelectorAll('.adm-an-says-l li').length, charts: c.querySelectorAll('.adm-an-sm figure svg').length};
      });
      if (!ck || ck.words < (/answer-time/.test(h) ? 1 : 2) || ck.charts < 1)
        fails.push(`${w}px Analyses #${h} model check: ${JSON.stringify(ck)}`);
    }
    // The mix-up map (Pierre's Q74): the whole matrix from tablet width up (cells, the tree, families outlined); on a phone
    // the tree as a list whose family bands open their block on a tap; 12 px text at least, no sideways scroll
    {
      await go('analyses/difficulty/mix-ups');
      const mm = () =>
        p.evaluate(() => {
          const c = document.getElementById('anc-mix-up-map');
          return (
            c && {
              cells: c.querySelectorAll('rect.an-h').length,
              tree: !!c.querySelector('path.an-tree'),
              bands: c.querySelectorAll('[data-anfam]').length,
              on: (c.querySelector('[data-anfam][aria-pressed="true"]') || {}).dataset?.anfam,
              head: (c.querySelector('h4.adm-an-out') || {}).textContent || '',
              wide: document.documentElement.scrollWidth - innerWidth,
              small: [...c.querySelectorAll('svg text')].filter(t => parseFloat(getComputedStyle(t).fontSize) < 12).length
            }
          );
        });
      const m0 = await mm();
      if (!m0 || !m0.tree || m0.wide > 0 || m0.small) fails.push(`${w}px Analyses mix-up map: ${JSON.stringify(m0)}`);
      else if (w >= 600 && (m0.cells < 50 || m0.bands)) fails.push(`${w}px Analyses mix-up map, the whole matrix: ${JSON.stringify(m0)}`);
      else if (w < 600 && m0.bands > 1) {
        // a tap on a genus name inside the band selects its family too (Codex review #592: the names sat above the band)
        const at = await p.evaluate(() => {
          const b = document.querySelector('#anc-mix-up-map [data-anfam="1"] rect');
          b.scrollIntoView({block: 'center'});
          const r = b.getBoundingClientRect(),
            t = document.querySelector('#anc-mix-up-map svg text.an-lab').getBoundingClientRect();
          return {x: t.left + 10, y: r.top + 11};
        });
        await p.mouse.click(at.x, at.y);
        await settle();
        const m1 = await mm();
        if (m1.on !== '1' || m1.head === m0.head) fails.push(`${w}px Analyses mix-up map, a family tapped: ${JSON.stringify({m0, m1})}`);
      }
    }
    // Difficulty › Heatmap (admin-heatmap.js; Pierre, 2026-11-14, Q123 m): every genus against every genus from the live log,
    // the same rows and columns, in family blocks; the cells add up to the Mix-ups count, the diagonal empty, a cell opens
    // the compare page of its two genera; Typed apart (its cells add up to its own count, no rate, nothing hatched). At 390
    // the matrix scrolls inside its box (its header and names kept in view), never the page; at 1280 it fits its box.
    {
      await go('analyses/difficulty/heatmap');
      const hm = () =>
        p.evaluate(() => {
          const box = document.querySelector('#view .adm-hm'),
            T = box && box.querySelector('.adm-hmt');
          if (!T) return null;
          const num = L => [...L].reduce((t, e) => t + (Number(e.textContent) || 0), 0),
            kp = Object.fromEntries(
              [...document.querySelectorAll('#view .adm-kpis > div')].map(d => [
                d.querySelector('span').textContent,
                d.querySelector('b').textContent
              ])
            ),
            a = [...T.querySelectorAll('td a')].find(x => x.textContent),
            m = a && /^(.+) shown, (.+) (?:answered|typed): /.exec(a.title);
          return {
            rows: T.querySelectorAll('tbody tr').length,
            cols: T.querySelectorAll('thead .hm-col').length,
            fams: T.querySelectorAll('.hm-fam').length,
            sum: num(T.querySelectorAll('td')),
            kp,
            diag: [...T.querySelectorAll('td.hm-d')].filter(d => d.textContent).length,
            nd: T.querySelectorAll('td.hm-d').length,
            lo: T.querySelectorAll('td.hm-lo').length,
            // the whole slate on the map, answered or not (Codex review #889)
            slate: slateOf(DATA).length,
            // a cell offered but never mixed up is a full-size target too (Codex review #889)
            flat: [...T.querySelectorAll('td a')].filter(x => !x.textContent && x.getBoundingClientRect().height < 10).length,
            leg: [...document.querySelectorAll('#view .adm-hm-leg span')].map(x => x.textContent).join(' | '),
            link: a ? decodeURIComponent(a.getAttribute('href')) : '',
            pair: m ? [m[1], m[2]].sort().join('|') : '',
            wide: document.documentElement.scrollWidth - innerWidth,
            scroll: box.scrollWidth - box.clientWidth
          };
        });
      const h0 = await hm();
      if (
        !h0 ||
        h0.rows < h0.slate ||
        h0.cols !== h0.rows ||
        h0.flat ||
        h0.leg !== 'Under 5% | 5%-10% | 10%-20% | 20%-30% | 30%+ | Under 20 offers | Look-alike | From the data' ||
        h0.nd !== h0.rows ||
        h0.diag ||
        h0.fams < 3 ||
        String(h0.sum) !== h0.kp['Mix-ups'] ||
        !h0.sum ||
        !h0.lo ||
        h0.link !== `./#learn/compare/${h0.pair.split('|').join('/')}` ||
        h0.wide > 0 ||
        (w < 600 ? h0.scroll <= 0 : h0.scroll > 0)
      )
        fails.push(`${w}px Analyses heatmap: ${JSON.stringify(h0)}`);
      if (w < 600 && h0) {
        // scrolled inside its box: the column names and the row names stay in view
        const st = await p.evaluate(() => {
          const box = document.querySelector('#view .adm-hm');
          box.scrollIntoView();
          box.scrollLeft = 300;
          box.scrollTop = 300;
          const b = box.getBoundingClientRect(),
            th = box.querySelector('thead .hm-col:last-child').getBoundingClientRect(),
            rh = box.querySelector('tbody tr:last-child .hm-row').getBoundingClientRect();
          return {box: box.scrollLeft > 0 && box.scrollTop > 0, top: Math.round(th.top - b.top), left: Math.round(rh.left - b.left)};
        });
        if (!st.box || Math.abs(st.top) > 2 || st.left > 30) fails.push(`${w}px Analyses heatmap scrolled: ${JSON.stringify(st)}`);
      }
      await p.click('#view [data-sf="hm"][data-v="typed"]');
      await settle();
      const h1 = await hm();
      if (!h1 || String(h1.sum) !== h1.kp['Typed mix-ups'] || !h1.sum || h1.lo || h1.rows !== h0.rows || h1.wide > 0)
        fails.push(`${w}px Analyses heatmap, Typed: ${JSON.stringify(h1)}`);
      await p.click('#view [data-sf="hm"][data-v="pick"]');
      await settle();
      // not a fish page yet (core.js SUBJECTS admin pages): the corals first
      if (
        once &&
        (await p.evaluate(() =>
          hasPage(
            SUBJECTS.find(S => S.admin.pages),
            'analyses/difficulty/heatmap'
          )
        ))
      )
        fails.push(`${w}px Analyses heatmap: on the fish side already`);
    }
    if (once) {
      // Once: Formats against a direct count, the milestone switch, a script before v35, views remembered, To do, Hidden, the view filter.
      await go('analyses/difficulty/formats');
      const anf = await p.evaluate(async () => {
        const log = (await (await fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readAnswers: 1, token: TOKEN})})).json()).rows,
          // the newest milestone, shown by default: the first round thousand of answers in time order (Pierre, 2026-11-05)
          rows = log
            .slice()
            .sort((a, b) => a[1] - b[1])
            .slice(0, Math.floor(log.length / 1000) * 1000);
        // 4 choices, 4 plausible: a photo-quiz answer that is not typed, not a duel, not an exam, with 4 genera offered and
        // no |k2 or |k3, with the app's expectation logged
        const direct = rows.filter(
          r =>
            /^quiz/.test(r[5]) &&
            !/^quiz-duel/.test(r[5]) &&
            !/\|(t|d|x)(\||$)/.test(r[5]) &&
            !/\|k[123]/.test(r[5]) &&
            String(r[10] || '')
              .split(/\s+/)
              .filter(Boolean).length !== 2 &&
            r[7] != null
        ).length;
        const row = [...document.querySelectorAll('.adm-an tbody tr')].find(
          tr => tr.cells[0] && tr.cells[0].textContent === '4 choices' && tr.cells.length === 7
        );
        return {direct, shown: row ? Number(row.cells[1].textContent.replace(/,/g, '')) : null};
      });
      if (anf.shown !== anf.direct) fails.push(`${w}px Analyses Formats: 4 choices ${anf.shown}, direct count ${anf.direct}`);
      // Sort (Pierre, 2026-11-05): the same control above every list, one choice per page; most positive first reverses the
      // bars, by topic puts a sub-heading per analysis in the charts and the words, by name; then back to the default.
      await go('analyses/overview');
      const anSorted = async s => {
        await p.evaluate(s => document.querySelector(`.adm-an-card [data-ans="${s}"]`).click(), s);
        await settle();
        return p.evaluate(() => {
          const c = document.querySelector('.adm-an-card'),
            d = [...c.querySelectorAll('g[data-d]')].map(g => Number(g.dataset.d));
          return {
            down: d.every((v, i) => !i || d[i - 1] >= v),
            heads: c.querySelectorAll('.an-grp-t').length,
            subs: c.querySelectorAll('.an-sub').length,
            rows: document.querySelectorAll('.adm-an-all tr.an-grp').length,
            pressed: [...document.querySelectorAll('[data-ans][aria-pressed="true"]')].map(b => b.dataset.ans)
          };
        });
      };
      const sPos = await anSorted('pos'),
        sTopic = await anSorted('topic'),
        sName = await anSorted('name'),
        sNeg = await anSorted('neg');
      if (!sPos.down || sPos.pressed.some(x => x !== 'pos') || sPos.pressed.length < 2 || !sPos.subs || sPos.heads)
        fails.push(`${w}px Analyses sort, most positive first: ${JSON.stringify(sPos)}`);
      if (!sTopic.heads || sTopic.subs || !sTopic.rows) fails.push(`${w}px Analyses sort, by topic: ${JSON.stringify(sTopic)}`);
      if (sName.heads || sName.rows || sNeg.pressed.some(x => x !== 'neg'))
        fails.push(`${w}px Analyses sort, by name / back: ${JSON.stringify({sName, sNeg})}`);
      await p.click('[data-anm="1000"]');
      await settle();
      const anm = await p.evaluate(() => ({
        pressed: (document.querySelector('[data-anm][aria-pressed="true"]') || {}).dataset?.anm,
        kpi: (document.querySelector('.adm-kpis b') || {}).textContent
      }));
      await p.click('[data-anm="all"]');
      await settle();
      if (anm.pressed !== '1000' || !/^[\d,]+$/.test(anm.kpi || '') || Number(anm.kpi.replace(/,/g, '')) > 1000)
        fails.push(`${w}px Analyses: the milestone switch ${JSON.stringify(anm)}`);
      if (errs.length) fails.push(`${w}px Analyses: ${errs.slice(0, 3).join(' | ')}`);
      // A sync script before v35 has no report: the views say so, nothing breaks (rule D4).
      {
        const aq = await ctx.newPage(),
          aqe = [];
        aq.on('pageerror', e => aqe.push(e.message));
        await aq.goto(base + 'admin.html?demo&v=30#analyses/speed/answer-time');
        await aq
          .waitForFunction(() => /No report yet/.test(document.getElementById('view').textContent), null, {timeout: 30000})
          .catch(() => aqe.push('no "No report yet"'));
        if (aqe.length) fails.push(`${w}px Analyses with script v30: ${aqe.join(' | ')}`);
        await aq.close();
      }
      // Pierre, 2026-11-08: the corals' status line never counts the fish answers. Script v104 (from v60 the demo logs fish
      // answers too; the head's answers every row of every subject, not used: the line counts from the answer log read)
      // and v105 (the head counts each subject apart).
      if (w === 1280)
        for (const v of [104, 105]) {
          const aq = await ctx.newPage(),
            aqe = [];
          aq.on('pageerror', e => aqe.push(e.message));
          await aq.goto(base + `admin.html?demo&v=${v}#analyses/overview`);
          await aq
            .waitForFunction(
              () => ANS && ANS.all && / since · /.test((document.querySelector('.adm-an-badge') || {}).textContent || ''),
              null,
              {timeout: 90000}
            )
            .catch(() => aqe.push('no status line with a count'));
          const st = await aq.evaluate(() => {
            const L = [...document.querySelectorAll('.adm-sseg [data-anm]')].map(b => b.textContent),
              coral = ANS && ANS.all ? subjCounts(ANS.all)[replaySubject()] : null;
            return {
              badge: (document.querySelector('.adm-an-badge') || {}).textContent || '',
              newest: L.length ? Number(L[L.length - 1].replace('k', '')) * 1000 : 0,
              coral,
              fish: ANS && ANS.all ? ANS.all.length - coral : 0
            };
          });
          const want = `Corals: fitted on ${st.newest.toLocaleString('en-US')} answers · ${(st.coral - st.newest).toLocaleString('en-US')} since · next at ${(st.newest + 1000).toLocaleString('en-US')}`;
          if (!st.fish || !st.newest || st.badge !== want) aqe.push(`${JSON.stringify(st)}, wanted "${want}"`);
          if (aqe.length) fails.push(`${w}px Analyses with script v${v}: ${aqe.join(' | ')}`);
          await aq.close();
        }
      // Pierre, 2026-11-08: each subject's analyses ("fish when the fish analyses exist"). From the script that stores one
      // report per subject (analysis.js AN_SUBJ_SHEET), the fish side's Analyses draw the fish report: its own status line
      // and milestone, its views but What makes a photo hard and the live views but Stops (one line on its Overview says so),
      // the fish words and unit names, never a coral genus; the corals' side keeps its own report. Its Stops is the live
      // view drawn from the fish answers, not from the report (checked with fish Health, below: "Fish admin at parity"). A
      // script before it: the fish side has no report (rule D4), the corals' unchanged. At 1280, and the Overview and
      // Mix-ups at 360 px too.
      {
        const GATE = require('../analysis.js').AN_SUBJ_SHEET;
        for (const [v, vw] of [
          [GATE, 1280],
          [GATE, 360],
          [GATE - 1, 1280]
        ]) {
          const fc = await b.newContext({viewport: {width: vw, height: 900}, serviceWorkers: 'block'});
          await fc.route(
            u => !u.href.startsWith(base),
            r => r.abort()
          );
          const fq = await fc.newPage(),
            fe = [],
            tag = `${vw}px Fish Analyses with script v${v}`;
          fq.on('pageerror', e => fe.push(e.message));
          const look = async h => {
            await fq.evaluate(h => (location.hash = h), h);
            await fq
              .waitForFunction(
                h =>
                  location.hash === '#' + h &&
                  cur === h.replace(/^fish\//, '') &&
                  /fitted on|No report yet|Not for /.test(document.getElementById('view').textContent),
                h,
                {timeout: 90000}
              )
              .catch(() => fe.push(`#${h}: nothing drawn`));
            return fq.evaluate(() => {
              // the fish words (core.js SUBJECTS analyses one, many) left aside: a "genus" left is a coral word
              const V = document.getElementById('view'),
                W = ASUBJ.analyses || {},
                t = [V.textContent, ...[...V.querySelectorAll('[title]')].map(e => e.getAttribute('title'))]
                  .join(' ')
                  .split(W.one || '\u0000')
                  .join(' ')
                  .split(W.many || '\u0000')
                  .join(' ')
                  .split(W.one ? W.one[0].toUpperCase() + W.one.slice(1) : '\u0000')
                  .join(' ')
                  .split(W.many ? W.many[0].toUpperCase() + W.many.slice(1) : '\u0000')
                  .join(' ');
              return {
                badge: (document.querySelector('.adm-an-badge') || {}).textContent || '',
                none: /No report yet/.test(V.textContent),
                not: (document.querySelector('.adm-an-not') || {}).textContent || '',
                note: (document.querySelector('#view > .note') || {}).textContent || '',
                views: [...document.querySelectorAll('#subnav .adm-views a, #subnav .adm-subtabs a')].map(a => a.textContent),
                words: (t.match(/\b(genus|genera|Genus|Genera)\b/g) || []).length,
                ids: (t.match(/\b[fgs]:[A-Z]\w*/g) || []).slice(0, 3),
                coral: Object.keys(DATA.gen).some(g => new RegExp(`\\b${g}\\b`).test(V.textContent)),
                cards: V.querySelectorAll('.adm-an-card').length,
                wide: document.documentElement.scrollWidth - innerWidth
              };
            });
          };
          await fq.goto(base + `admin.html?demo&v=${v}#fish/analyses/overview`);
          let at = await look('fish/analyses/overview');
          if (v < GATE) {
            if (!at.none) fe.push(`the fish side shows a report: ${JSON.stringify(at)}`);
          } else {
            if (!/^Fish: fitted on 1,000 answers · [\d,]+ since · next at 2,000$/.test(at.badge) || !at.cards)
              fe.push(`Overview ${JSON.stringify(at)}`);
            if (at.not !== 'Not for fish yet: Difficulty › Photos, Difficulty › Heatmap.')
              fe.push(`the line on what is not there: "${at.not}"`);
            // every view the fish side has: the live ones (Stops, Pairs, Answer log) and the others, each drawn from the
            // fish report
            const [H, LV] = await fq.evaluate(() => [
              TABS.filter(t => t[3] === 'analyses').flatMap(t => t[2].map(([h]) => h).filter(h => hasPage(ASUBJ, h))),
              LIVE_STATS
            ]);
            if (
              H.length !== 13 ||
              H.some(h => /photos$/.test(h)) ||
              ['analyses/learning/stops', 'analyses/difficulty/pairs', 'analyses/learning/answer-log'].some(h => !H.includes(h))
            )
              fe.push(`its views ${H.join(' ')}`);
            // the views drawn from the fish report (the live ones have no report to draw: their own block below)
            for (const h of vw === 1280 ? H.filter(h => !LV.includes(h)) : ['analyses/overview', 'analyses/difficulty/mix-ups']) {
              at = await look('fish/' + h);
              if (at.none || !/^Fish: /.test(at.badge) || at.words || at.ids.length || at.coral || at.wide > 0)
                fe.push(`#fish/${h} ${JSON.stringify({...at, views: undefined})}`);
            }
            if (vw === 1280) {
              at = await look('fish/analyses/difficulty/photos');
              if (!/Not for fish yet/.test(at.note)) fe.push(`#fish/analyses/difficulty/photos ${JSON.stringify(at)}`);
            }
          }
          // the corals' report on the corals' side, as before
          at = await look('analyses/overview');
          if (!/^Corals: fitted on/.test(at.badge) || at.not) fe.push(`the corals' Overview ${JSON.stringify(at)}`);
          if (fe.length) fails.push(`${tag}: ${fe.slice(0, 4).join(' | ')}`);
          await fc.close();
        }
      }

      // Each tab reopens its view used last, each header group its tab used last (kept in the store, as other admin prefs),
      // except Players, which always opens Activity (fixed group, Pierre 2026-11-05), List having been used before.
      await go('inbox/coverage/sheets-id-key');
      await go('inbox/todo/reports');
      const mem = await p.evaluate(() => ({
        cov: (document.querySelector('#subnav .adm-subtabs a:nth-child(2)') || {}).getAttribute?.('href'),
        todo: document.querySelector('#modes [data-mode="inbox"]').getAttribute('href'),
        players: document.querySelector('#modes [data-mode="players"]').getAttribute('href'),
        kept: (store.get('reefid-admin-nav-tab', {}) || {})['inbox/coverage'],
        // the app's ⚙ View (reefid-admin-view, a string) is no longer the admin's tab memory (URL scheme study, side finding)
        appView: store.get('reefid-admin-view', null)
      }));
      if (
        mem.cov !== '#inbox/coverage/sheets-id-key' ||
        mem.todo !== '#inbox/todo/reports' ||
        mem.kept !== 'inbox/coverage/sheets-id-key' ||
        mem.players !== '#players/activity' ||
        mem.appView !== null
      )
        fails.push(`${w}px: views not remembered ${JSON.stringify(mem)}`);
      await p.reload();
      await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
      await settle();
      if ((await p.evaluate(() => document.querySelector('#modes [data-mode="inbox"]').getAttribute('href'))) !== '#inbox/todo/reports')
        fails.push(`${w}px: the To do group forgot its last view after a reload`);
      // To do › All: Health's red line (the demo has photos everyone misses), the reports, the devices' errors, suggestions last.
      await go('inbox/todo/all');
      await p
        .waitForFunction(() => document.querySelector('[data-hline]') && /Errors/.test(document.getElementById('view').innerText), null, {
          timeout: 15000
        })
        .catch(() => {});
      const all = await p.evaluate(() => {
        const v = document.getElementById('view'),
          t = v.innerText;
        return {
          line: !!v.querySelector('[data-hline] a[href="#inbox/todo/health"]'),
          rep: /Demo report/.test(t),
          err: !!v.querySelector('.adm-tderr'),
          first: v.querySelector('section > *')?.matches('[data-hline]'),
          open1: !!v.querySelector('.adm-rep[data-rep="demorep1"]'),
          pr: [...v.querySelectorAll('.adm-repspr a[href*="/pull/"]')].map(a => [a.textContent, a.getAttribute('href')])
        };
      });
      if (!all.line || !all.rep || !all.err || !all.first) fails.push(`${w}px To do › All: ${JSON.stringify(all)}`);
      if (
        all.open1 ||
        JSON.stringify(all.pr) !== JSON.stringify([['handled in #577', 'https://github.com/ppericard/coral-id-imr/pull/577']])
      )
        fails.push(`${w}px To do › All, a report handled in a PR: ${JSON.stringify(all)}`);
      // Genera › Hidden: Put back takes a removed photo back.
      const hid = await p.evaluate(() => {
        const n = Object.keys(DATA.gen).find(g => photos(g).length > 3),
          f = photos(n)[0].f;
        ACT.hide(n, f);
        location.hash = 'photos/genera/hidden';
        return {n, f};
      });
      await settle();
      if (!(await p.$(`#view [data-f="${hid.f}"] [data-unhide]`))) fails.push(`${w}px Hidden: the removed photo is not listed`);
      else {
        await p.click(`#view [data-f="${hid.f}"] [data-unhide]`);
        await settle();
        if (await p.evaluate(h => (entry(h.n).hide || []).includes(h.f), hid)) fails.push(`${w}px Hidden: Put back left the photo removed`);
      }
      // To do › Out of the presence rule (Pierre, 2026-11-05: he sorts these photos himself, and one out of the rule "must not
      // be there"; the demo has the real data's out-of-rule photos): Remove excludes a photo for good (the ×) and Undo brings
      // it back; Keep moves it down to the folded Kept subsection (curation seen 'rule:f'), out of the count and of Remove
      // all, its genus page tag turning to "kept"; Remove all asks first (rule A2: bulk), does nothing when refused, excludes
      // each photo still to handle (one Undo step each) when accepted; in Kept, Remove excludes and Keep again un-keeps.
      {
        await go('inbox/todo/reports');
        const rq = () =>
          p.evaluate(() => {
            const t = [...document.querySelectorAll('#view .adm-ruleq:not(.adm-rulekept .adm-ruleq) [data-f]')],
              k = [...document.querySelectorAll('#view [data-rulekept] .adm-ruleq [data-f]')];
            return {
              n: t.length,
              head: +((document.querySelector('[data-rulesec] small') || {}).textContent || 0),
              fs: t.map(x => [x.dataset.f, x.dataset.g]),
              kept: k.map(x => x.dataset.f),
              kn: +((document.querySelector('[data-rulekept] > summary small') || {}).textContent || 0),
              kpressed: k.filter(x => x.querySelector('[data-rule="keep"]').getAttribute('aria-pressed') === 'true').length,
              segs: t.filter(x => x.querySelectorAll('.adm-qseg [data-rule]').length === 2).length,
              all: !!document.querySelector('[data-rulesec] button[data-ruleall]'),
              note: !!document.querySelector('[data-rulesec] p')
            };
          });
        const r0 = await rq();
        if (r0.n < 3 || r0.head !== r0.n || r0.segs !== r0.n || !r0.all || r0.note || r0.kept.length)
          fails.push(`${w}px To do › Out of rule: not listed with Remove / Keep and Remove all ${JSON.stringify(r0)}`);
        else {
          const [f1] = r0.fs[0],
            [f2, g2] = r0.fs[1];
          await p.click(`#view .adm-ruleq [data-f="${f1}"] [data-rule="exclude"]`);
          await settle();
          let r = await rq();
          if (r.n !== r0.n - 1 || r.fs.some(x => x[0] === f1) || !(await p.evaluate(f => !!(DRAFT.exclude || {})[f], f1)))
            fails.push(`${w}px Out of rule: Remove did not exclude ${f1} ${JSON.stringify(r)}`);
          await p.click('#undo');
          await settle();
          r = await rq();
          if (r.n !== r0.n || !r.fs.some(x => x[0] === f1)) fails.push(`${w}px Out of rule: Undo did not bring ${f1} back`);
          // Keep: down to Kept, out of the count; its tag on the genus page turns to "kept".
          const tag = async () => {
            await goGenus(g2);
            return p.evaluate(f => {
              const e = document.querySelector(`#view .adm-tile[data-f="${f}"] .adm-rule`);
              return e ? (e.classList.contains('kept') ? 'kept' : 'out') : 'none';
            }, f2);
          };
          const before = await tag();
          await go('inbox/todo/reports');
          await p.click(`#view .adm-ruleq [data-f="${f2}"] [data-rule="keep"]`);
          await settle();
          r = await rq();
          const kept = await p.evaluate(a => (DRAFT.seen || {})['rule:' + a[0]] === 1 && photos(a[1]).some(x => x.f === a[0]), [f2, g2]);
          if (
            r.n !== r0.n - 1 ||
            r.head !== r0.n - 1 ||
            r.fs.some(x => x[0] === f2) ||
            r.kept.join() !== f2 ||
            r.kn !== 1 ||
            r.kpressed !== 1 ||
            !kept ||
            (await p.$('[data-rulekept][open]'))
          )
            fails.push(`${w}px Out of rule: Keep did not move ${f2} to Kept ${JSON.stringify(r)}`);
          const after = await tag();
          if (before !== 'out' || after !== 'kept')
            fails.push(`${w}px Out of rule: the tag of a kept photo on its genus page, ${before} → ${after}`);
          await go('inbox/todo/reports');
          // Remove all: refused, nothing moves; accepted, every photo still to handle is excluded, one Undo step each, Kept stays.
          const asked = await p.evaluate(() => {
            const c = window.confirm,
              h = HIST.length;
            let m = null;
            window.confirm = x => ((m = x), false);
            document.querySelector('[data-ruleall]').click();
            window.confirm = c;
            return {m, same: HIST.length === h};
          });
          r = await rq();
          if (asked.m !== `Remove ${r0.n - 1} photos out of the presence rule?` || !asked.same || r.n !== r0.n - 1)
            fails.push(`${w}px Out of rule: Remove all did not ask first ${JSON.stringify(asked)} ${r.n}`);
          const h0 = await p.evaluate(() => HIST.length);
          await p.click('[data-ruleall]'); // the page's dialog handler accepts
          await settle();
          const gone = await p.evaluate(
            a => ({
              left: outOfRuleList().length,
              steps: HIST.length - a[0],
              all: !!document.querySelector('[data-ruleall]'),
              kept: [...document.querySelectorAll('#view [data-rulekept] [data-f]')].map(x => x.dataset.f).join(),
              keptOut: !!(DRAFT.exclude || {})[a[1]]
            }),
            [h0, f2]
          );
          if (gone.left || gone.all || gone.steps !== r0.n - 1 || gone.kept !== f2 || gone.keptOut)
            fails.push(`${w}px Out of rule: Remove all ${JSON.stringify(gone)} of ${r0.n - 1}`);
          await p.evaluate(n => {
            for (let i = 0; i < n; i++) undo();
          }, gone.steps);
          await settle();
          r = await rq();
          if (r.n !== r0.n - 1) fails.push(`${w}px Out of rule: ${gone.steps} Undo steps brought back ${r.n} of ${r0.n - 1}`);
          // In Kept (unfolded, and it stays so across redraws): Remove excludes it, Undo brings it back; Keep again un-keeps it.
          await p.click('[data-rulekept] > summary');
          await p.click(`#view [data-rulekept] [data-f="${f2}"] [data-rule="exclude"]`);
          await settle();
          r = await rq();
          if (r.kept.length || !(await p.evaluate(f => !!(DRAFT.exclude || {})[f], f2)))
            fails.push(`${w}px Out of rule: Remove in Kept did not exclude ${f2} ${JSON.stringify(r)}`);
          await p.click('#undo');
          await settle();
          if (!(await p.$('[data-rulekept][open]'))) fails.push(`${w}px Out of rule: Kept folded again after a redraw`);
          await p.click(`#view [data-rulekept] [data-f="${f2}"] [data-rule="keep"]`);
          await settle();
          r = await rq();
          if (
            r.n !== r0.n ||
            !r.fs.some(x => x[0] === f2) ||
            r.kept.length ||
            (await p.evaluate(f => !!(DRAFT.seen || {})['rule:' + f], f2))
          )
            fails.push(`${w}px Out of rule: un-keep did not bring ${f2} back ${JSON.stringify(r)}`);
        }
      }
      // To do › Share-alike (Pierre, 2026-11-05: no share-alike for corals any more, but the ones on the site are never
      // removed automatically; three of Pierre's photos stand for share-alike ones, SA above): a "share-alike" tag on the genus page; the
      // same actions as Out of the presence rule: Remove (the ×, Undo), Keep → Kept (curation seen 'sa:f', tag "kept"),
      // un-keep, Remove all asks first and acts only on the photos still to handle.
      {
        await go('inbox/todo/reports');
        const sq = () =>
          p.evaluate(() => {
            const t = [...document.querySelectorAll('#view .adm-saq:not([data-sakept] .adm-saq) [data-f]')],
              k = [...document.querySelectorAll('#view [data-sakept] .adm-saq [data-f]')];
            return {
              n: t.length,
              want: saList().length,
              head: +((document.querySelector('[data-sasec] small') || {}).textContent || 0),
              title: (document.querySelector('[data-sasec] h2') || {}).textContent || '',
              fs: t.map(x => [x.dataset.f, x.dataset.g]),
              kept: k.map(x => x.dataset.f),
              kpressed: k.filter(x => x.querySelector('[data-sa="keep"]').getAttribute('aria-pressed') === 'true').length,
              segs: t.filter(x => x.querySelectorAll('.adm-qseg [data-sa]').length === 2).length,
              tags: t.filter(x => x.querySelector('.adm-sa:not(.kept)')).length,
              all: !!document.querySelector('[data-sasec] button[data-saall]'),
              note: !!document.querySelector('[data-sasec] p')
            };
          });
        const s0 = await sq();
        if (
          s0.n < 2 ||
          s0.n !== s0.want ||
          s0.head !== s0.n ||
          !/^Share-alike/.test(s0.title) ||
          s0.segs !== s0.n ||
          s0.tags !== s0.n ||
          !s0.all ||
          s0.note ||
          s0.kept.length
        )
          fails.push(`${w}px To do › Share-alike: not listed with its tag, Remove / Keep and Remove all ${JSON.stringify(s0)}`);
        else {
          const [f1] = s0.fs[0],
            [f2, g2] = s0.fs[1];
          await p.click(`#view .adm-saq [data-f="${f1}"] [data-sa="exclude"]`);
          await settle();
          let r = await sq();
          if (r.n !== s0.n - 1 || !(await p.evaluate(f => !!(DRAFT.exclude || {})[f], f1)))
            fails.push(`${w}px Share-alike: Remove did not exclude ${f1} ${JSON.stringify(r)}`);
          await p.click('#undo');
          await settle();
          if ((await sq()).n !== s0.n) fails.push(`${w}px Share-alike: Undo did not bring ${f1} back`);
          const tag = async () => {
            await goGenus(g2);
            return p.evaluate(f => {
              const e = document.querySelector(`#view .adm-tile[data-f="${f}"] .adm-sa`);
              return e ? (e.classList.contains('kept') ? 'kept' : 'sa') : 'none';
            }, f2);
          };
          const before = await tag();
          await go('inbox/todo/reports');
          await p.click(`#view .adm-saq [data-f="${f2}"] [data-sa="keep"]`);
          await settle();
          r = await sq();
          const kept = await p.evaluate(a => (DRAFT.seen || {})['sa:' + a[0]] === 1 && photos(a[1]).some(x => x.f === a[0]), [f2, g2]);
          if (r.n !== s0.n - 1 || r.head !== s0.n - 1 || r.kept.join() !== f2 || r.kpressed !== 1 || !kept)
            fails.push(`${w}px Share-alike: Keep did not move ${f2} to Kept ${JSON.stringify(r)}`);
          const after = await tag();
          if (before !== 'sa' || after !== 'kept') fails.push(`${w}px Share-alike: the tag of a kept photo, ${before} → ${after}`);
          await go('inbox/todo/reports');
          const asked = await p.evaluate(() => {
            const c = window.confirm,
              h = HIST.length;
            let m = null;
            window.confirm = x => ((m = x), false);
            document.querySelector('[data-saall]').click();
            window.confirm = c;
            return {m, same: HIST.length === h};
          });
          if (asked.m !== `Remove ${s0.n - 1} share-alike photos?` || !asked.same || (await sq()).n !== s0.n - 1)
            fails.push(`${w}px Share-alike: Remove all did not ask first ${JSON.stringify(asked)}`);
          const h0 = await p.evaluate(() => HIST.length);
          await p.click('[data-saall]'); // accepted by the page's dialog handler
          await settle();
          const gone = await p.evaluate(
            a => ({left: saList().length, steps: HIST.length - a[0], keptOut: !!(DRAFT.exclude || {})[a[1]]}),
            [h0, f2]
          );
          if (gone.left || gone.steps !== s0.n - 1 || gone.keptOut) fails.push(`${w}px Share-alike: Remove all ${JSON.stringify(gone)}`);
          await p.evaluate(n => {
            for (let i = 0; i < n; i++) undo();
          }, gone.steps);
          await settle();
          // Un-keep from Kept: back in the list to handle.
          await p.click('[data-sakept] > summary');
          await p.click(`#view [data-sakept] [data-f="${f2}"] [data-sa="keep"]`);
          await settle();
          r = await sq();
          if (r.n !== s0.n || r.kept.length || (await p.evaluate(f => !!(DRAFT.seen || {})['sa:' + f], f2)))
            fails.push(`${w}px Share-alike: un-keep did not bring ${f2} back ${JSON.stringify(r)}`);
        }
      }
      // Genera: the view filter of the sticky bar (Pierre, 2026-11-04). Corallites shows that section alone (Candidates and
      // Not this genus hidden, counted in one line), is remembered from genus to genus, falls back to All on a 2-zoom genus
      // without a Close-up row when Close-up is saved, and All (or the line's All views) brings the whole page back.
      const gg = await p.evaluate(() => {
        const N = Object.keys(DATA.gen);
        return {
          three: N.filter(n => rows(n).length === 3 && unused(n).length).slice(0, 2),
          two: N.find(n => !rows(n).some(([v]) => v === 'medium'))
        };
      });
      const gstate = () =>
        p.evaluate(() => ({
          btns: [...document.querySelectorAll('.adm-sticky [data-gv]')].map(b => b.textContent),
          on: [...document.querySelectorAll('.adm-sticky [data-gv][aria-pressed="true"]')].map(b => b.dataset.gv),
          rows: [...document.querySelectorAll('.adm-main > section.adm-row:not(.adm-out) h3')].map(h => h.firstChild.textContent.trim()),
          drops: [...document.querySelectorAll('.adm-main [data-drop]')].map(g => g.dataset.drop),
          cands: !!document.querySelector('.adm-main .adm-cands'),
          note: (document.querySelector('.adm-gvnote') || {}).textContent || '',
          saved: localStorage.getItem('demo:reefid-admin-gview'),
          all: rows(cur.slice(LIVE.length + 1)).map(([v]) => label(cur.slice(LIVE.length + 1), v)),
          nc: unused(cur.slice(LIVE.length + 1)).length
        }));
      // A missing button is a failure, not a 30 s wait: the checks after it then fail too.
      const pick = async sel => ((await p.$(sel)) ? p.click(sel) : fails.push(`${w}px View filter: no ${sel}`));
      if (gg.three.length < 2 || !gg.two) fails.push(`${w}px View filter: no test genera ${JSON.stringify(gg)}`);
      else {
        await goGenus(gg.three[0]);
        let s = await gstate();
        if (s.btns.join('|') !== 'All|Colony|Close-up|Corallites' || s.on.join() !== 'all' || s.rows.length !== 3 || !s.cands)
          fails.push(`${w}px View filter: All on ${gg.three[0]} ${JSON.stringify(s)}`);
        await pick('.adm-sticky [data-gv="macro"]');
        await settle();
        s = await gstate();
        if (
          s.on.join() !== 'macro' ||
          s.rows.join() !== 'Corallites' ||
          s.drops.join() !== 'macro' ||
          s.cands ||
          !s.note.includes(`${s.nc} candidate`)
        )
          fails.push(`${w}px View filter: Corallites on ${gg.three[0]} ${JSON.stringify(s)}`);
        if (s.saved !== '"macro"') fails.push(`${w}px View filter: Corallites not remembered (${s.saved})`);
        await goGenus(gg.three[1]);
        s = await gstate();
        if (s.on.join() !== 'macro' || s.rows.join() !== 'Corallites' || s.cands)
          fails.push(`${w}px View filter: Corallites not kept on ${gg.three[1]} ${JSON.stringify(s)}`);
        await pick('.adm-sticky [data-gv="medium"]');
        await settle();
        await goGenus(gg.two);
        s = await gstate();
        if (
          s.btns.join('|') !== ['All', ...s.all].join('|') ||
          s.btns.length !== 3 ||
          s.on.join() !== 'all' ||
          s.rows.join() !== s.all.join() ||
          s.note
        )
          fails.push(`${w}px View filter: a saved Close-up on 2-zoom ${gg.two} ${JSON.stringify(s)}`);
        if (s.saved !== '"medium"') fails.push(`${w}px View filter: the fallback overwrote the saved view (${s.saved})`);
        await goGenus(gg.three[0]);
        s = await gstate();
        if (s.rows.join() !== 'Close-up') fails.push(`${w}px View filter: Close-up not back on ${gg.three[0]} ${JSON.stringify(s)}`);
        await pick('.adm-gvnote [data-gv="all"]');
        await settle();
        s = await gstate();
        if (s.on.join() !== 'all' || s.rows.length !== 3 || !s.cands || s.note || s.saved !== '"all"')
          fails.push(`${w}px View filter: All views ${JSON.stringify(s)}`);
      }
      // One filter bar (admin plan PR 3, admin.js FB): every photo page's chips come from the subject's descriptor (core.js
      // SUBJECTS admin origins, csrc, views), and an origin switched off on one page is off on the others (one state, SHOW):
      // the genus bar (short names with counts), Quality and Growth form (full names),
      // their view chips and unit select, the Candidates sources. The origin is switched back on after.
      {
        const fb = () =>
          p.evaluate(() => ({
            o: [...document.querySelectorAll('#view [data-o]')]
              .filter(b => b.dataset.o !== 'all')
              .map(b => b.dataset.o + ':' + b.textContent.trim()),
            off: [...document.querySelectorAll('#view [data-o][aria-pressed="false"]')].map(b => b.dataset.o),
            v: [...document.querySelectorAll('#view [data-qv], #view [data-fv]')].map(b => b.dataset.qv || b.dataset.fv),
            unit: (s => s && [s.getAttribute('aria-label'), s.options[0].textContent])(document.querySelector('#qgen, #fgen')),
            src: [...document.querySelectorAll('#view [data-src]')].map(b => b.dataset.src),
            want: {
              o: ASUBJ.admin.origins.map(o => o[0]),
              short: ASUBJ.admin.origins.map(o => o[2]),
              name: ASUBJ.admin.origins.map(o => o[1]),
              v: ['all', ...ASUBJ.views.map(x => x[0]), 'cand'],
              src: [...ASUBJ.admin.csrc, 'all']
            }
          }));
        await goGenus(gg.three[0] || 'Acropora');
        let s = await fb();
        if (s.o.map(x => x.split(':')[0]).join() !== s.want.o.join() || s.o.some((x, i) => !x.split(':')[1].startsWith(s.want.short[i])))
          fails.push(`${w}px Filter bar: genus page origins ${JSON.stringify(s)}`);
        await go('photos/review/quality');
        s = await fb();
        if (
          s.o.join() !== s.want.o.map((o, i) => o + ':' + s.want.name[i]).join() ||
          s.v.join() !== s.want.v.join() ||
          JSON.stringify(s.unit) !== '["Genus","All genera"]'
        )
          fails.push(`${w}px Filter bar: Quality ${JSON.stringify(s)}`);
        await p.click('#view [data-o="dauin"]');
        await settle();
        await go('photos/review/growth-form');
        s = await fb();
        if (
          s.o.map(x => x.split(':')[0]).join() !== s.want.o.join() ||
          s.off.join() !== 'dauin' ||
          s.v.join() !== s.want.v.join() ||
          JSON.stringify(s.unit) !== '["Genus","All genera"]'
        )
          fails.push(`${w}px Filter bar: Growth form (Dauin switched off on Quality) ${JSON.stringify(s)}`);
        await goGenus(gg.three[0] || 'Acropora');
        s = await fb();
        if (s.off.join() !== 'dauin' || !(await p.$('.adm-sticky [data-o="all"]')))
          fails.push(`${w}px Filter bar: Dauin off on Quality, not on the genus page ${JSON.stringify(s)}`);
        await p.click('.adm-sticky [data-o="all"]');
        await settle();
        s = await fb();
        if (s.off.length || (await p.$('.adm-sticky [data-o="all"]'))) fails.push(`${w}px Filter bar: All ${JSON.stringify(s)}`);
        await go('photos/candidates');
        s = await fb();
        if (s.src.join() !== s.want.src.join()) fails.push(`${w}px Filter bar: Candidates sources ${JSON.stringify(s)}`);
      }
    }
    // To do › Points (Pierre, 2026-11-05: the points to handle live in the admin, never in a text list): the list from
    // points.json, the Astrea question first among the open ones; its page shows the question and its 7 photo slots
    // (numbered, blind) with an answer field each, notes and the status segment, with no sideways scroll at either width.
    // Once: Stand-by moves it below the open ones (in the draft only, curation.json points), Undo brings it back first,
    // Resolved folds it, a note and an answer reach the draft, Reopen; nothing published, nothing sent.
    {
      await go('inbox/todo/points');
      const pl = () =>
        p.evaluate(() => ({
          open: [...document.querySelectorAll('[data-ptsec="open"] + .adm-pts [data-pt]')].map(a => a.dataset.pt),
          wait: [...document.querySelectorAll('[data-ptsec="wait"] + .adm-pts [data-pt]')].map(a => a.dataset.pt),
          done: [...document.querySelectorAll('[data-ptfold="done"] [data-pt]')].map(a => a.dataset.pt),
          head: +((document.querySelector('[data-ptsec="open"] small') || {}).textContent || 0),
          meta: ((document.querySelector('[data-ptsec="open"] + .adm-pts [data-pt] .adm-ptmeta') || {}).textContent || '').trim(),
          count: ((document.querySelector('#subnav .adm-views [data-view="inbox/todo/points"]') || {}).textContent || '').trim(),
          wide: document.documentElement.scrollWidth - innerWidth
        }));
      const l0 = await pl();
      if (l0.open[0] !== 'astrea-reefcloud' || l0.open.length < 20 || l0.head !== l0.open.length || !/^Trainer/.test(l0.meta))
        fails.push(`${w}px Points: the list ${JSON.stringify({...l0, open: l0.open.slice(0, 3)})}`);
      if (l0.count !== `Points ${l0.open.length}`) fails.push(`${w}px Points: the view's open count "${l0.count}"`);
      if (l0.wide > 0) fails.push(`${w}px Points: page ${l0.wide} px wider than the window`);
      await p.click('[data-pt="astrea-reefcloud"]');
      await settle();
      const pg = () =>
        p.evaluate(() => ({
          hash: location.hash,
          q: (document.querySelector('.adm-ptq') || {}).textContent || '',
          slots: document.querySelectorAll('.adm-ptph').length,
          imgs: document.querySelectorAll('.adm-ptph img').length,
          nums: [...document.querySelectorAll('.adm-ptph .adm-ptn')].map(b => b.textContent).join(),
          names: document.querySelectorAll('.adm-ptname').length,
          answers: document.querySelectorAll('.adm-ptph [data-pta]').length,
          notes: !!document.querySelector('[data-ptn]'),
          acts: [...document.querySelectorAll('[data-pts]')].map(
            b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')
          ),
          tab: (document.querySelector('#subnav .adm-subtabs [aria-pressed="true"]') || {}).textContent || '',
          view: (document.querySelector('#subnav .adm-views [aria-pressed="true"]') || {}).dataset?.view || '',
          wide: document.documentElement.scrollWidth - innerWidth
        }));
      const g0 = await pg();
      if (
        g0.hash !== '#inbox/todo/points/astrea-reefcloud' ||
        !/ReefCloud label/.test(g0.q) ||
        g0.slots !== 7 ||
        g0.imgs !== 7 ||
        g0.nums !== '1,2,3,4,5,6,7' ||
        g0.names ||
        g0.answers !== 7 ||
        !g0.notes ||
        g0.acts.join() !== 'Resolved,Stand-by,Dismiss' ||
        !/^To do/.test(g0.tab) ||
        g0.view !== 'inbox/todo/points'
      )
        fails.push(`${w}px Points: the Astrea page ${JSON.stringify(g0)}`);
      if (g0.wide > 0) fails.push(`${w}px Points: the Astrea page ${g0.wide} px wider than the window`);
      // The enlarged photo: blind (number and credit, no taxon), ‹ › through the 7.
      await p.click('[data-ptz="1"]');
      const lb = await p.evaluate(() => {
        const c = () => (document.querySelector('#lightbox .lb-cap') || {}).textContent || '';
        const a = c();
        document.querySelector('#lightbox [data-d="1"]').click();
        const b = c();
        document.querySelector('#lightbox [data-x]').click();
        return {a, b, shut: document.getElementById('lightbox').hidden};
      });
      if (!/^2 · .*Albert Kang/.test(lb.a) || /Favites|colemani/.test(lb.a) || !/^3 · /.test(lb.b) || !lb.shut)
        fails.push(`${w}px Points: the enlarged photo ${JSON.stringify(lb)}`);
      if (once) {
        const st = () => p.evaluate(() => JSON.parse(JSON.stringify((DRAFT.points || {})['astrea-reefcloud'] || null)));
        const saved0 = await p.evaluate(() => JSON.stringify(SAVED.points || null));
        // Stand-by: down below the open points, still listed.
        await p.click('[data-pts="wait"]');
        await settle();
        const s1 = await st();
        let g = await pg();
        if (!s1 || s1.s !== 'wait' || g.acts.join() !== 'Resolved,Stand-by*,Dismiss,Reopen')
          fails.push(`${w}px Points: Stand-by ${JSON.stringify({s1, acts: g.acts})}`);
        await go('inbox/todo/points');
        let l = await pl();
        if (
          l.open[0] === 'astrea-reefcloud' ||
          l.open.includes('astrea-reefcloud') ||
          l.wait.join() !== 'astrea-reefcloud' ||
          l.head !== l0.open.length - 1
        )
          fails.push(`${w}px Points: Stand-by did not move it below the open points ${JSON.stringify({...l, open: l.open.slice(0, 3)})}`);
        await p.click('#undo');
        await settle();
        l = await pl();
        if (l.open[0] !== 'astrea-reefcloud' || l.wait.length || (await st()))
          fails.push(`${w}px Points: Undo did not bring it back first ${JSON.stringify({...l, open: l.open.slice(0, 3)})}`);
        // A note and an answer reach the draft; Resolved folds it at the bottom; Reopen brings it back to the open ones.
        await go('inbox/todo/points/astrea-reefcloud');
        await p.fill('.adm-ptph [data-pta]', 'Astrea');
        await p.fill('[data-ptn]', 'Asked at the morning briefing');
        await p.click('[data-pts="done"]');
        await settle();
        const s2 = await st();
        if (!s2 || s2.s !== 'done' || s2.n !== 'Asked at the morning briefing' || s2.a['astrea-wide-502260981'] !== 'Astrea')
          fails.push(`${w}px Points: note, answer and Resolved in the draft ${JSON.stringify(s2)}`);
        g = await pg();
        await go('inbox/todo/points');
        l = await pl();
        if (l.open.includes('astrea-reefcloud') || l.done.join() !== 'astrea-reefcloud' || (await p.$('[data-ptfold="done"][open]')))
          fails.push(`${w}px Points: Resolved is not folded at the bottom ${JSON.stringify({...l, open: l.open.slice(0, 3)})}`);
        const out = await p.evaluate(() => ((output().points || {})['astrea-reefcloud'] || {}).s);
        if (out !== 'done') fails.push(`${w}px Points: the resolved point is not in the curation to publish (${out})`);
        await go('inbox/todo/points/astrea-reefcloud');
        const vals = await p.evaluate(() => [document.querySelector('[data-pta]').value, document.querySelector('[data-ptn]').value]);
        if (vals.join('|') !== 'Astrea|Asked at the morning briefing')
          fails.push(`${w}px Points: the page does not show the note and answer ${vals}`);
        await p.click('[data-pts="open"]');
        await settle();
        const s3 = await st();
        if (!s3 || s3.s || s3.n !== 'Asked at the morning briefing') fails.push(`${w}px Points: Reopen ${JSON.stringify(s3)}`);
        // Back to how it was, one Undo step at a time (Reopen, Resolved, the note and answer).
        for (let i = 0; i < 6 && (await st()); i++) {
          await p.click('#undo');
          await settle();
        }
        if ((await st()) || (await p.evaluate(() => JSON.stringify(SAVED.points || null))) !== saved0)
          fails.push(`${w}px Points: Undo did not bring the point back to how it was, or something was published`);
        // An edit still waiting for its 0.8 s reaches the draft when the page is hidden or left (Codex review #571: a reload
        // or a phone sending the browser to the background right after typing lost it).
        await go('inbox/todo/points/astrea-reefcloud');
        for (const ev of ['pagehide', 'visibilitychange']) {
          const got = await p.evaluate(ev => {
            const t = document.querySelector('[data-ptn]');
            t.value = 'typed then left ' + ev;
            t.dispatchEvent(new Event('input', {bubbles: true}));
            if (ev === 'visibilitychange') {
              Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
              document.dispatchEvent(new Event('visibilitychange'));
              delete document.visibilityState;
            } else window.dispatchEvent(new Event('pagehide'));
            return ((DRAFT.points || {})['astrea-reefcloud'] || {}).n || '';
          }, ev);
          if (got !== 'typed then left ' + ev) fails.push(`${w}px Points: a note typed just before ${ev} is not in the draft ("${got}")`);
        }
        for (let i = 0; i < 4 && (await st()); i++) {
          await p.click('#undo');
          await settle();
        }
        // A point that does not exist says so.
        await go('inbox/todo/points/no-such-point');
        if (!/No point no-such-point/.test(await text())) fails.push(`${w}px Points: an unknown point`);
      }
    }
    // The players' part (SMOKE_ONLY=players; CI runs it with the photos' part in the admin 1280 "more" job): Players ›
    // List, a long name, merge and delete, the journeys, To do's errors and reports. A function, run here in a whole run,
    // or alone right after the page opens (above).
    async function playersPart() {
      // Users: the made-up players, one opened, a merge and a delete.
      await go('players/list');
      let t = await text();
      if (!/Ana Demo/.test(t) || !/mara demo2/.test(t)) fails.push(`${w}px Users: demo players missing`);
      if (once) {
        // Once: an anonymous id's Journey.
        // Each anonymous id opens its own Journey (#players/list/anon/<id>, so a name starting with @ keeps its own; Codex review #375).
        const anon = await p.$eval('a[href^="#players/list/anon/"]', a => a.getAttribute('href')).catch(() => null);
        if (!anon) fails.push(`${w}px Users: no Journey link on the anonymous ids`);
        else {
          await go(anon.slice(1));
          if (!/Not signed in ·[\s\S]*not saved \(not signed in\)/.test(await text()))
            fails.push(`${w}px ${anon}: anonymous Journey missing`);
          await go('players/list');
        }
      }
      // Who played last (Pierre, 2026-11-03): Last is the second column, to the minute, and the default sort, most recent
      // first by the exact time of the last answer; Carla (the demo's player now) first, with the "now" pill.
      const lastCol = () =>
        p.$$eval('.adm-urow', L =>
          L.map(tr => ({
            name: tr.querySelector('td b').textContent,
            t: Number((tr.querySelector('td:nth-child(2) [data-t]') || {dataset: {t: 0}}).dataset.t),
            now: !!tr.querySelector('td:nth-child(2) .adm-ago.now'),
            txt: tr.querySelector('td:nth-child(2)').textContent.trim()
          }))
        );
      const checkLast = async how => {
        const L = await lastCol();
        if (!L.length || L[0].name !== 'Carla Demo' || !L[0].now || L[0].txt !== 'now')
          fails.push(`${w}px Players (${how}): Carla not first and "now" (${JSON.stringify(L[0])})`);
        if (L.some((x, i) => i && x.t > L[i - 1].t))
          fails.push(`${w}px Players (${how}): not most recent first ${L.map(x => x.txt).join(', ')}`);
        if (L.filter(x => x.now).length !== 1)
          fails.push(`${w}px Players (${how}): ${L.filter(x => x.now).length} players "now", expected 1`);
        // 24 h times, "yest." on phones (Pierre, 2026-11-03: a narrower Last column).
        const yest = w < 600 ? /^yest\. \d\d:\d\d$/ : /^yesterday \d\d:\d\d$/;
        if (!L.slice(1).every(x => /min ago|h ago|^\d+ \w+$|^\w+ \d+$/.test(x.txt) || yest.test(x.txt)) || L.some(x => /AM|PM/.test(x.txt)))
          fails.push(`${w}px Players (${how}): Last texts ${L.map(x => x.txt).join(', ')}`);
      };
      await checkLast('default sort');
      // Change the starting answer (sheet v99, Pierre 2026-11-08, Q228; admin.js startBlock): Carla's bar shows her corals
      // answer and its history, Change… lists the answers, one picked asks Change / Cancel in the page (no browser dialog),
      // Change sends it and says so; the new answer and its history line show, and nothing is wider than the screen while
      // the answers are listed. Before v99, Change… is greyed (rule D4).
      {
        const q = await p.context().newPage();
        q.on('pageerror', e => fails.push(`${w}px Starting answer page error: ${e.message}`));
        q.on('dialog', d => (fails.push(`${w}px Starting answer: a browser dialog (${d.message()})`), d.dismiss()));
        const open = async v => {
          await q.goto(base + `admin.html?demo&v=${v}#players/list`);
          await q.waitForFunction(() => window.DEMO_PENDING === 0 && document.querySelector('.adm-urow'), null, {timeout: 20000});
          await q.click('[data-uopen="Carla Demo"]');
          await q.waitForSelector('.adm-ustart-s', {timeout: 10000});
        };
        const bar = () => q.$eval('.adm-ustart', x => x.innerText.replace(/\s+/g, ' ')),
          wide = () => q.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        try {
          await open(98);
          if (!(await q.$('[data-ustart][disabled]'))) fails.push(`${w}px Starting answer (v98): Change… not greyed`);
          await open(99);
          const b0 = await bar();
          if (!/Corals starting answer: I know corals well/.test(b0) || !/I had the IMR coral course · in the welcome tour/.test(b0))
            fails.push(`${w}px Starting answer: bar ${JSON.stringify(b0)}`);
          await q.click('[data-ustart]');
          const opts = await q.$$eval('[data-ustart-c]', L => L.map(b => [b.dataset.ustartC, b.disabled]));
          if (
            JSON.stringify(opts) !==
            JSON.stringify([
              ['new', false],
              ['imr', false],
              ['know', true]
            ])
          )
            fails.push(`${w}px Starting answer: the answers listed ${JSON.stringify(opts)}`);
          if (await wide()) fails.push(`${w}px Starting answer: wider than the screen with the answers listed`);
          await q.click('[data-ustart-c="imr"]');
          if (!/Change to “I had the IMR coral course”\?/.test(await bar())) fails.push(`${w}px Starting answer: no confirm step`);
          await q.click('[data-ustart-ok]');
          await q.waitForFunction(() => /Changed to/.test(document.querySelector('.adm-ustart').innerText), null, {timeout: 10000});
          const b1 = await bar();
          if (
            !/Corals starting answer: I had the IMR coral course/.test(b1) ||
            !/I had the IMR coral course · changed by you on Players/.test(b1) ||
            !/their app takes it at its next sync/.test(b1)
          )
            fails.push(`${w}px Starting answer: after Change ${JSON.stringify(b1)}`);
          const saved = await q.evaluate(() => (PSAVED['Carla Demo'].by.coral.start || {}).via);
          if (saved !== 'admin') fails.push(`${w}px Starting answer: the saved copy here not updated (${saved})`);
          if (await wide()) fails.push(`${w}px Starting answer: wider than the screen after Change`);
        } catch (e) {
          fails.push(`${w}px Starting answer: ${e.message.split('\n')[0]}`);
        }
        await q.close();
      }
      if (once) {
        // Once: sorts, the replayed progress, scripts before v42 and v28, sheet reads, the leaderboard, rename, greyed names.
        if (!/12 min ago/.test(t)) fails.push(`${w}px Players: the device that stopped 12 minutes ago is not "12 min ago"`);
        // Names joined with the answer log by anonymous id: every demo player has answers in the corals' group (the fifth
        // column); sorting by name puts Ana first, reversed last.
        const lv = await p.$$eval('.adm-urow td:nth-child(5)', L => L.map(td => td.textContent.trim()));
        if (!lv.length || lv.some(x => !/^\d+$/.test(x))) fails.push(`${w}px Players: answers missing (${lv.join(' ')})`);
        if (!/Not signed in \(\d+\)/.test(t)) fails.push(`${w}px Players: no "Not signed in" group`);
        const firstName = () => p.$eval('.adm-urow td b', b => b.textContent);
        await p.click('[data-usort="name"]');
        await settle();
        if ((await firstName()) !== 'Ana Demo') fails.push(`${w}px Players: sort by name, first is ${await firstName()}`);
        await p.click('[data-usort="name"]');
        await settle();
        if ((await firstName()) !== 'Test Demo') fails.push(`${w}px Players: reversed sort by name, first is ${await firstName()}`);
        // Each subject's columns sort too (Codex review #383: they were filled after the sort, which threw).
        for (const k of await p.$$eval('[data-usort*=":"]', L => L.map(b => b.dataset.usort))) {
          await p.click(`[data-usort="${k}"]`);
          await settle();
          if (!(await p.$('.adm-urow'))) fails.push(`${w}px Players: sort by ${k} left no rows`);
        }
        // One tap on Last brings back most recent first.
        await p.click('[data-usort="last"]');
        await settle();
        await checkLast('Last tapped');
        await p.click('[data-usort="name"]');
        await settle();
        // Full replay (core.js replayProgress; docs/LEARNING.md "Full replay"): Progress and Learned replayed from the log, and
        // "↻ saved …" where the saved copy differs: Dio's is from the former model (a genus learned under BKT, taken back),
        // Ben's is 20 answers behind; Ana's matches the replay (no mark). Her journey says the same, Dio's too.
        await p
          .waitForFunction(() => !/…/.test(document.querySelector('.adm-utbl').innerText), null, {timeout: 10000})
          .catch(() => fails.push(`${w}px Players: Progress still reading the saved copies`));
        const rp = await p.evaluate(() => {
          const col = k =>
              [...document.querySelectorAll('.adm-utbl thead button')].findIndex(b => b.dataset.usort === SUBJECTS[0].id + ':' + k),
            row = n => [...document.querySelectorAll('.adm-urow')].find(r => r.dataset.uopen === n),
            cell = (n, k) => row(n).querySelectorAll('td')[col(k)];
          return Object.fromEntries(
            ['Ana Demo', 'Ben Demo', 'Dio Demo'].map(n => [
              n,
              {
                prog: cell(n, 'prog').innerText.trim(),
                marks: row(n).querySelectorAll('.adm-saved').length
              }
            ])
          );
        });
        if (
          rp['Ana Demo'].marks ||
          !/^\d+%$/.test(rp['Ana Demo'].prog) ||
          !/^\d+%\s*↻ saved \d+%$/.test(rp['Dio Demo'].prog) ||
          !/↻ saved/.test(rp['Ben Demo'].prog)
        )
          fails.push(`${w}px Players: replayed progress ${JSON.stringify(rp)}`);
        await p.click('[data-uopen="Dio Demo"]');
        await settle();
        if (!/Progress \d+%\s*↻ saved \d+% · Learned 0\s*↻ saved 1/.test(await p.$eval('.adm-ubar', x => x.innerText)))
          fails.push(`${w}px Players: Dio's bar without the replayed progress`);
        for (const [n, mark] of [
          ['Dio Demo', true],
          ['Ana Demo', false]
        ]) {
          await go('players/list/journey/' + encodeURIComponent(n));
          await p.waitForFunction(() => !/…/.test(document.querySelector('.adm-kpis').innerText), null, {timeout: 10000}).catch(() => {});
          const k = await p.evaluate(() => ({
            kpis: document.querySelector('.adm-kpis').innerText.replace(/\s+/g, ' '),
            genus: document.querySelectorAll('.adm-jtbl .adm-saved').length,
            col: [...document.querySelectorAll('.adm-jtbl thead th')].some(t => t.textContent === 'Progress')
          }));
          if (!/\d+% (↻ saved \d+% )?Progress/i.test(k.kpis) || /↻ saved/.test(k.kpis) !== mark || !!k.genus !== mark || !k.col)
            fails.push(`${w}px journey (${n}) replayed progress: ${JSON.stringify(k)}`);
        }
        // Players reads no saved copy one player at a time (sheet v42, Pierre 2026-11-04: about 15 s on a phone for 40
        // players): the player list carries each player's replay (rp), the same numbers the admin gets when it replays them
        // itself from their saved copies, which it still does with a script before v42 (one userData call each, rule D4).
        {
          const open = async v => {
            const q = await p.context().newPage();
            q.on('pageerror', e => fails.push(`${w}px Players v${v} page error: ${e.message}`));
            await q.goto(base + `admin.html?demo&v=${v}#players/list`);
            await q
              .waitForFunction(() => window.DEMO_PENDING === 0 && document.querySelector('.adm-urow'), null, {timeout: 20000})
              .then(() => q.waitForTimeout(1000))
              .catch(() => fails.push(`${w}px Players v${v}: never drawn`));
            return q;
          };
          const reads = q => q.evaluate(() => window.DEMO_CALLS.filter(c => c.k === 'userData').length);
          const q = await open(42);
          if (await reads(q)) fails.push(`${w}px Players (v42): ${await reads(q)} saved copies read one by one`);
          // The admin's own replay of every player (their saved copies read now), against the sheet's rp.
          const diff = await q.evaluate(async () => {
            USERS.users.forEach(u => savedOf(u.name));
            for (let i = 0; i < 100 && USERS.users.some(u => !PSAVED[u.name]); i++) await new Promise(r => setTimeout(r, 100));
            return USERS.users
              .map(u => {
                const f = progOf(u, true);
                return [u.name, JSON.stringify(u.rp), JSON.stringify(f && [f.pct, f.learned, f.saved && f.saved.pct])];
              })
              .filter(([, a, b]) => a !== b);
          });
          if (diff.length) fails.push(`${w}px Players (v42): rp differs from the admin's own replay: ${JSON.stringify(diff.slice(0, 3))}`);
          await q.close();
          const q41 = await open(41);
          if (!(await reads(q41))) fails.push(`${w}px Players (v41): no saved copy read (the replay needs them before v42)`);
          await q41.close();
          // Photo exposure (sheet v81; Pierre, 2026-11-06, Q191): Photos (Seen %) and Spread columns from the list's ex, in the
          // subject of the switch, each cell a share (its counts in the title) or –; none before v81 (rule D4).
          const cols = q =>
            q.evaluate(() => {
              const H = [...document.querySelectorAll('.adm-utbl thead button')].map(b => b.dataset.usort),
                at = k => H.indexOf(SUBJECTS[0].id + ':' + k); // the corals' group (one pair per subject)
              return {
                at: [at('photos'), at('spread')],
                cells: [...document.querySelectorAll('.adm-urow')].map(r =>
                  ['photos', 'spread'].map(k => (at(k) < 0 ? null : r.querySelectorAll('td')[at(k)].innerText.trim()))
                ),
                tips: [...document.querySelectorAll('.adm-urow td span[title]')].filter(x => / of /.test(x.title)).length
              };
            });
          const qx = await open(81),
            ox = await cols(qx);
          const ok = ox.at.every(i => i >= 0) && ox.cells.length && ox.cells.every(c => c.every(x => /^(\d{1,3}%|–)$/.test(x)));
          if (!ok || !ox.cells.some(c => /%$/.test(c[0]) && /%$/.test(c[1])) || !ox.tips)
            fails.push(`${w}px Players (v81): Photos and Spread ${JSON.stringify({...ox, cells: ox.cells.slice(0, 3)})}`);
          await qx.close();
          const q80 = await open(80),
            o80 = await cols(q80);
          if (o80.at.some(i => i >= 0)) fails.push(`${w}px Players (v80): exposure columns before the script serves them`);
          await q80.close();
        }
        // The admin never gets ahead of the sheet script (rule D4): answering as v27, the demo's Players and Journey
        // show what they did before the full replay (no Progress column, no "↻ saved" mark, the sheet's Learned column, the
        // Journey's learned genera from the saved copy).
        {
          const q = await p.context().newPage();
          q.on('pageerror', e => fails.push(`${w}px v27 page error: ${e.message}`));
          await q.goto(base + 'admin.html?demo&v=27#players/list');
          await q.waitForSelector('.adm-urow', {timeout: 20000}).catch(() => {});
          await q.waitForTimeout(1500);
          const o = await q.evaluate(() => {
            const col = k => [...document.querySelectorAll('.adm-utbl thead button')].findIndex(b => b.dataset.usort.endsWith(':' + k));
            return {
              prog: col('prog'),
              marks: document.querySelectorAll('.adm-saved').length,
              anonProg: [...document.querySelectorAll('.adm-uremoved th')].some(t => t.textContent === 'Progress')
            };
          });
          if (o.prog !== -1 || o.marks || o.anonProg) fails.push(`${w}px Players before v28: ${JSON.stringify(o)}`);
          await q.goto(base + 'admin.html?demo&v=27#players/list/journey/' + encodeURIComponent('Dio Demo'));
          await q.waitForSelector('.adm-kpis', {timeout: 20000}).catch(() => {});
          // The learned genus (under BKT) comes with the saved copy, read after the page is drawn.
          await q.waitForSelector('.adm-jlearn', {timeout: 10000}).catch(() => {});
          const j = await q.evaluate(() => ({
            kpis: document.querySelector('.adm-kpis').innerText.replace(/\s+/g, ' '),
            col: [...document.querySelectorAll('.adm-jtbl thead th')].some(t => t.textContent === 'Progress'),
            learned: document.querySelectorAll('.adm-jlearn').length
          }));
          if (/Progress|↻ saved/.test(j.kpis) || !/ 1\/\d+ Learned/i.test(j.kpis) || j.col || j.learned !== 1)
            fails.push(`${w}px Journey before v28: ${JSON.stringify(j)}`);
          // Before sheet v30 the pages opened are not read: the section says which script version it waits for.
          await q
            .waitForFunction(() => /v30 not running/.test((document.querySelector('[data-jsheets]') || {}).innerText || ''), null, {
              timeout: 10000
            })
            .catch(() => fails.push(`${w}px Journey before v30: no version line for the genus sheets`));
          await q.close();
        }
        // Out of the statistics (sheet EXCL_SHEET, ROADMAP "Security follow-ups"): a player's bar and every device not signed in
        // carry Leave out / Count again, one click each way; a player left out is marked "out" in the list. Before it the
        // buttons are there, disabled, with the version they wait for.
        {
          const q = await p.context().newPage();
          q.on('pageerror', e => fails.push(`${w}px stats exclusion page error: ${e.message}`));
          const calm = () =>
            q
              .waitForFunction(() => window.DEMO_PENDING === 0 && !/^\s*Loading/.test(document.getElementById('view').innerText), null, {
                timeout: 20000
              })
              .then(() => q.waitForTimeout(300))
              .catch(() => fails.push(`${w}px stats exclusion: never settled`));
          const st = () =>
            q.evaluate(() => {
              const row = [...document.querySelectorAll('.adm-urow')].find(r => r.dataset.uopen === 'Ben Demo'),
                bar = document.querySelector('.adm-ubar [data-ustat]'),
                anon = [...document.querySelectorAll('.adm-uremoved [data-ustat]')];
              return {
                out: !!(row && row.querySelector('.adm-uex')),
                bar: bar ? [bar.textContent, bar.disabled, bar.title] : null,
                anon: anon.length,
                anonOut: document.querySelectorAll('.adm-uremoved .adm-uex').length,
                ex: (USERS.excluded || []).length
              };
            });
          const X = await p.evaluate(() => EXCL_SHEET);
          await q.goto(base + `admin.html?demo&v=${X - 1}#players/list`);
          await q.waitForSelector('.adm-urow', {timeout: 20000}).catch(() => {});
          await calm();
          await q.click('[data-uopen="Ben Demo"]');
          let e = await st();
          if (!e.bar || !e.bar[1] || !e.bar[2].endsWith('v' + X)) fails.push(`${w}px stats exclusion before v${X}: ${JSON.stringify(e)}`);
          await q.goto(base + `admin.html?demo&v=${X}#players/list`);
          await q.waitForSelector('.adm-urow', {timeout: 20000}).catch(() => {});
          await calm();
          await q.click('[data-uopen="Ben Demo"]');
          e = await st();
          if (!e.bar || e.bar[0] !== 'Leave out' || e.bar[1] || e.out || !e.anon)
            fails.push(`${w}px stats exclusion: before ${JSON.stringify(e)}`);
          await q.click('.adm-ubar [data-ustat]');
          await calm();
          if (!(await q.$('.adm-ubar'))) await q.click('[data-uopen="Ben Demo"]');
          e = await st();
          if (!e.out || e.ex !== 1 || !e.bar || e.bar[0] !== 'Count again')
            fails.push(`${w}px stats exclusion: Leave out ${JSON.stringify(e)}`);
          await q.click('.adm-uremoved [data-ustat]');
          await calm();
          e = await st();
          if (e.ex !== 2 || e.anonOut !== 1) fails.push(`${w}px stats exclusion: a device not signed in ${JSON.stringify(e)}`);
          if (!(await q.$('.adm-ubar'))) await q.click('[data-uopen="Ben Demo"]');
          await q.click('.adm-ubar [data-ustat]');
          await calm();
          e = await st();
          if (e.out || e.ex !== 1) fails.push(`${w}px stats exclusion: Count again ${JSON.stringify(e)}`);
          await q.close();
        }
        // Two subjects on the Players pages (Pierre, 2026-11-06): with every subject's answers logged (sheet v60; the demo's
        // other subject played by Ben last, Ana and Mara), the list shows a group of columns per subject, each player's
        // answers in it; a row's Journey opens on the subject they played last; that Journey is the subject's own (its
        // answers only, its units' word, its progress replayed in the admin from them with the saved copy beside it, no Elo
        // for a subject the sheet does not replay, its sessions unfolding as on Activity) with its Corals | Fish at the top;
        // the other subject's Activity shows its sessions.
        {
          const q = await p.context().newPage();
          q.on('pageerror', e => fails.push(`${w}px two subjects page error: ${e.message}`));
          const calm = () =>
            q
              .waitForFunction(() => window.DEMO_PENDING === 0 && !/^\s*Loading/.test(document.getElementById('view').innerText), null, {
                timeout: 20000
              })
              .then(() => q.waitForTimeout(800))
              .catch(() => fails.push(`${w}px two subjects: never settled`));
          await q.goto(base + 'admin.html?demo&v=81#players/list');
          await q.waitForSelector('.adm-urow', {timeout: 20000}).catch(() => {});
          await calm();
          const L = await q.evaluate(() => {
            const F = SUBJECTS.find(S => !S.replay),
              col = [...document.querySelectorAll('.adm-utbl thead button')].findIndex(b => b.dataset.usort === F.id + ':n'),
              row = n => [...document.querySelectorAll('.adm-urow')].find(r => r.dataset.uopen === n);
            return {
              F: F.id,
              groups: [...document.querySelectorAll('.adm-ugrp th.adm-ug0')].map(th => th.textContent),
              ben: col >= 0 && row('Ben Demo').querySelectorAll('td')[col].innerText.trim(),
              dio: col >= 0 && row('Dio Demo').querySelectorAll('td')[col].innerText.trim()
            };
          });
          if (L.groups.length !== 2 || L.ben !== '48' || L.dio !== '–') fails.push(`${w}px two subjects: the list ${JSON.stringify(L)}`);
          await q.click('[data-uopen="Ben Demo"]');
          const jh = await q.$eval('.adm-ubar a.next', a => a.getAttribute('href'));
          if (jh !== `#${L.F}/players/list/journey/Ben%20Demo`) fails.push(`${w}px two subjects: Ben's Journey link ${jh}`);
          await q.click('.adm-ubar a.next');
          await calm();
          // The fish units are read once (fishAdmin), then the page draws its progress.
          await q
            .waitForFunction(() => /Progress/i.test(document.querySelector('.adm-kpis').innerText), null, {timeout: 10000})
            .catch(() => {});
          const j = await q.evaluate(() => ({
            hash: location.hash,
            kpis: document.querySelector('.adm-kpis').innerText.replace(/\s+/g, ' '),
            col: [...document.querySelectorAll('.adm-jtbl thead th')].some(t => t.textContent === 'Progress'),
            sess: document.querySelectorAll('.adm-journey [data-recent] [data-sopen]').length,
            seg: [...document.querySelectorAll('.adm-jsubj a')].map(a => [a.getAttribute('aria-pressed'), a.innerText.replace(/\s+/g, ' ')])
          }));
          if (
            j.hash !== jh ||
            !/^48 Answers/i.test(j.kpis) ||
            /Elo/i.test(j.kpis) ||
            !/\d+%( ↻ saved \d+%)? Progress/i.test(j.kpis) ||
            !/Learned/i.test(j.kpis) ||
            !j.col ||
            !j.sess ||
            !/Families met/i.test(j.kpis) ||
            j.seg.length !== 2 ||
            j.seg[1][0] !== 'true' ||
            !/ 48$/.test(j.seg[1][1])
          )
            fails.push(`${w}px two subjects: Ben's ${L.F} Journey ${JSON.stringify(j)}`);
          // A session of the Journey unfolds, with the progress it brought.
          await q.click('.adm-journey [data-recent] [data-sopen]');
          await calm();
          if (!(await q.$('.adm-journey [data-sdet]')))
            fails.push(`${w}px two subjects: a session of Ben's ${L.F} Journey does not unfold`);
          await q.click('.adm-jsubj a[aria-pressed="false"]');
          await calm();
          const c = await q.evaluate(() => ({
            hash: location.hash,
            kpis: document.querySelector('.adm-kpis').innerText.replace(/\s+/g, ' ')
          }));
          const cs = await q.$$eval('.adm-journey [data-recent] [data-sopen]', L => L.length);
          if (c.hash !== '#players/list/journey/Ben%20Demo' || !/Elo/i.test(c.kpis) || !/Genera met/i.test(c.kpis) || !cs)
            fails.push(`${w}px two subjects: Ben's corals Journey from the toggle ${JSON.stringify(c)}`);
          await q.evaluate(F => (location.hash = F + '/players/activity'), L.F);
          await calm();
          const a = await q.evaluate(() => ({
            rows: [...document.querySelectorAll('[data-recent] .adm-urow')].map(r => r.querySelector('td').innerText.trim()),
            off: document.getElementById('subj').classList.contains('off')
          }));
          if (!a.rows.length || a.rows.some(n => !['Ben Demo', 'Ana Demo', 'Mara Demo'].includes(n.replace(/ you$/, ''))) || a.off)
            fails.push(`${w}px two subjects: the ${L.F} Activity ${JSON.stringify(a)}`);
          // Ben's last session is still open from his Journey (one set of open sessions): unfolded already, else a tap.
          if (!(await q.$('[data-sdet]'))) {
            await q.click('[data-recent] .adm-urow');
            await calm();
          }
          if (!(await q.$('[data-sdet]'))) fails.push(`${w}px two subjects: a ${L.F} session does not unfold`);
          await q.close();
        }
        // Sheet reads (Pierre, 2026-11-04: admin pages load slowly). (1) One read of a kind at a time: To do draws itself
        // again as its reads come in, and each draw before the answer log was in asked for it again (3 answer logs, 3
        // photo ratings, 2 event reads at once). (2) The landing page's reads leave with the token, not after start()'s data
        // files (cand.json held here for 2 s: they used to leave after it). (3) A page that needs the answer log and the
        // pages opened (Analyses › Stops) asks for both at once, not one after the other. admin-demo.js DEMO_CALLS lists the calls.
        {
          const q = await p.context().newPage();
          q.on('pageerror', e => fails.push(`${w}px sheet reads page error: ${e.message}`));
          const calls = () => q.evaluate(() => window.DEMO_CALLS.map(c => ({...c})));
          const count = L => L.reduce((o, c) => ((o[c.k] = (o[c.k] || 0) + 1), o), {});
          const quiet = () =>
            q
              .waitForFunction(
                () =>
                  window.DEMO_PENDING === 0 &&
                  typeof DRAFT !== 'undefined' &&
                  DRAFT &&
                  DRAFT.genera &&
                  !/^\s*Loading/.test(document.getElementById('view').innerText),
                null,
                {timeout: 20000}
              )
              .then(() => q.waitForTimeout(1500))
              .catch(async () => fails.push(`sheet reads: ${await q.evaluate(() => location.hash)} never settled`));
          await q.goto(base + 'admin.html?demo#inbox/todo/all');
          await quiet();
          const n = count(await calls());
          if (n.answers !== 1 || n.stats !== 1 || n.events !== 1 || n.reports !== 1)
            fails.push(`sheet reads: To do asked ${JSON.stringify(n)}, once each expected`);
          await q.route(/\/cand\.json$/, r => setTimeout(() => r.continue().catch(() => {}), 2000));
          await q.goto(base + 'admin.html?demo&load=2#players/list');
          await quiet();
          const [a] = (await calls()).filter(c => c.k === 'answers'),
            cj = await q.evaluate(
              () => (performance.getEntriesByType('resource').find(e => /\/cand\.json$/.test(e.name)) || {}).responseStart
            );
          if (!a || !(cj > 0) || !(a.t0 < cj))
            fails.push(`sheet reads: Players' answer log asked at ${a && Math.round(a.t0)} ms, cand.json in at ${Math.round(cj)} ms`);
          await q.unroute(/\/cand\.json$/);
          await q.goto(base + 'admin.html?demo&load=3#photos/candidates');
          await quiet();
          const before = (await calls()).length;
          await q.evaluate(() => (location.hash = 'analyses/learning/stops'));
          await quiet();
          const L = (await calls()).slice(before),
            ans = L.find(c => c.k === 'answers'),
            pg = L.find(c => c.k === 'pages');
          if (!ans || !pg || !(pg.t0 < ans.t1))
            fails.push(
              `sheet reads: Stops asked the pages opened at ${pg && Math.round(pg.t0)} ms, the answer log in at ${ans && Math.round(ans.t1)} ms`
            );
          // (4) The answer log is never published before the photo ratings (Codex review #488): Health and To do's Health line
          // read both once the log is there. The ratings answer a second late here (admin-demo.js slow=stats).
          await q.addInitScript(() => {
            window.__early = 0;
            const t = setInterval(() => {
              try {
                if (ANS && !STATS) window.__early++;
                if (ANS && STATS) clearInterval(t);
              } catch (e) {} // before admin.js has run
            }, 10);
          });
          await q.goto(base + 'admin.html?demo&slow=stats&load=4#inbox/todo/health');
          await quiet();
          if (await q.evaluate(() => window.__early)) fails.push('sheet reads: the answer log was published before the photo ratings');
          await q.close();
        }
        await go('players/list');
        await p.click('[data-uopen="Dio Demo"]'); // closed again for the steps below
        await settle();
        // Leaderboard (sheet v20): Hide marks the player hidden, Show puts them back.
        await p.click('[data-uopen="Dio Demo"]');
        await settle();
        await p.click('[data-uboard="Dio Demo"]');
        await settle();
        if (!/Hidden from the leaderboard/.test(await text())) fails.push(`${w}px Players: Hide did not hide Dio from the leaderboard`);
        await p.click('[data-uboard="Dio Demo"]');
        await settle();
        if (!/On the leaderboard/.test(await text())) fails.push(`${w}px Players: Show did not put Dio back`);
        // The beta group (sheet v48; Pierre, 2026-11-04: fish opens to a group he picks here, not one site-wide switch): on
        // the Players page of the subject in beta only; Add / Remove one player (no confirmation), Add all the others (the
        // confirm is accepted, above); the corals' Players page has none, and a script before v48 says what it needs.
        {
          // Fish opens to all since 2026-11-06 (Q158): the group page, kept for a subject that opens to a group, checked on
          // fish set back to 'group' at runtime, then opened to all again.
          const grp = () =>
            p.evaluate(() => ({
              line: (document.querySelector('.adm-ugroup') || {}).innerText || '',
              // Dio's Groups cell names a group (the common Groups column).
              col: (r => !!r && r.querySelectorAll('td')[3].innerText.trim() !== '–')(
                [...document.querySelectorAll('.adm-urow')].find(r => r.dataset.uopen === 'Dio Demo')
              ),
              all: !!document.querySelector('[data-ugall]'),
              bar: (document.querySelector('.adm-ubar') || {}).innerText || ''
            }));
          // No subject opens to a group: no line, no Beta column on the list.
          const coral = await grp();
          if (coral.line || coral.col) fails.push(`${w}px Players: a beta group line or column ${JSON.stringify(coral)}`);
          await p.evaluate(() => (SUBJECTS.find(S => S.id === 'fish').open = 'group'));
          const beta = await p.evaluate(() => (SUBJECTS.find(S => subjGroup(S)) || {}).id);
          if (!beta) fails.push(`${w}px Players: no subject set to open to a group`);
          else {
            await go(beta + '/players/list');
            const g0 = await grp(),
              n = await p.evaluate(() => USERS.users.length);
            if (
              !new RegExp(`beta:\\s+0\\s+of\\s+${n}\\s+players`).test(g0.line) ||
              g0.col ||
              !g0.all ||
              !/Not in the \S+ beta\s*Add/.test(g0.bar)
            )
              fails.push(`${w}px Players (${beta}): the beta group before ${JSON.stringify(g0)}`);
            await p.click('[data-ugroup="Dio Demo"]');
            await settle();
            const g1 = await grp();
            if (!new RegExp(`beta:\\s+1\\s+of\\s+${n}\\s+players`).test(g1.line) || !/In the \S+ beta\s*Remove/.test(g1.bar) || !g1.col)
              fails.push(`${w}px Players (${beta}): Add did not put Dio in the group ${JSON.stringify(g1)}`);
            await p.click('[data-ugall]');
            await settle();
            const g2 = await grp();
            if (!new RegExp(`beta:\\s+${n}\\s+of\\s+${n}\\s+players`).test(g2.line) || g2.all)
              fails.push(`${w}px Players (${beta}): Add all ${JSON.stringify(g2)}`);
            await p.click('[data-ugroup="Dio Demo"]');
            await settle();
            if (!new RegExp(`beta:\\s+${n - 1}\\s+of\\s+${n}\\s+players`).test((await grp()).line))
              fails.push(`${w}px Players (${beta}): Remove did not take Dio out`);
            const q = await p.context().newPage();
            // A fresh page reads core.js again: fish served back to open: 'group' there too (open to all since Q158).
            await q.route(
              u => u.pathname === '/core.js',
              async r => {
                const res = await r.fetch();
                await r.fulfill({response: res, body: (await res.text()).replace("open: 'all'", "open: 'group'")});
              }
            );
            await q.goto(base + `admin.html?demo&v=45#${beta}/players/list`);
            await q
              .waitForFunction(() => window.DEMO_PENDING === 0 && document.querySelector('.adm-urow'), null, {timeout: 20000})
              .catch(() => {});
            const old = await q.evaluate(() => ({
              note: /needs the sheet script v48/.test(document.getElementById('view').innerText),
              btn: !!document.querySelector('[data-ugall], [data-ugroup]')
            }));
            if (!old.note || old.btn) fails.push(`${w}px Players (${beta}) with sheet v45: ${JSON.stringify(old)}`);
            await q.close();
            // Opened to all (core.js SUBJECTS open: 'all', the release's one field, forced here at runtime): no group line, no
            // Beta column, no Add / Remove, though the subject keeps its beta label; back to 'group', they return.
            await p.evaluate(b => (SUBJECTS.find(S => S.id === b).open = 'all'), beta);
            await go('players/list');
            await go(beta + '/players/list');
            const ga = await grp(),
              gb = await p.evaluate(() => ({btn: !!document.querySelector('[data-ugall], [data-ugroup]'), label: !!ASUBJ.beta}));
            if (ga.line || ga.col || ga.all || gb.btn || !gb.label)
              fails.push(`${w}px Players (${beta}) open to all: ${JSON.stringify({...ga, ...gb})}`);
            await p.evaluate(b => (SUBJECTS.find(S => S.id === b).open = 'group'), beta);
            await go('players/list');
            await go(beta + '/players/list');
            if (!(await grp()).line) fails.push(`${w}px Players (${beta}) back to the group: no group line`);
            await p.evaluate(b => (SUBJECTS.find(S => S.id === b).open = 'all'), beta); // as it is now
            await go('players/list'); // the corals' page, Dio's row still open, as the steps below expect
          }
        }
        // Archive (sheet v58, was Rename v20): Ben's record moves to the suggested "Ben Demo-test" (the confirm is accepted,
        // above), out of the players' table, listed read-only under Archived.
        await p.click('[data-uopen="Ben Demo"]');
        await settle();
        await p.evaluate(() => (window.prompt = (q, def) => def)); // the suggested name (Playwright accepts a prompt empty)
        await p.click('[data-uarch="Ben Demo"]');
        await p
          .waitForFunction(() => /Archived \(1\)/.test(document.getElementById('view').innerText), null, {timeout: 10000})
          .catch(() => {});
        // The archive reloads the players, their answers and stats, and the table is drawn again as each comes in: read it
        // once all are in (a row read in between was missing, and reported as "Carla's name is greyed").
        await settle();
        const arc = await p.evaluate(() => ({
          rows: [...document.querySelectorAll('.adm-urow')].map(r => r.dataset.uopen),
          fold: [...document.querySelectorAll('details.adm-uremoved')].map(d => d.textContent).join(' ')
        }));
        if (arc.rows.some(n => /^Ben Demo/.test(n)) || !/Archived \(1\)/.test(arc.fold) || !/Ben Demo-test/.test(arc.fold))
          fails.push(`${w}px Players: archive Ben Demo → Ben Demo-test not shown apart (${JSON.stringify(arc)})`);
        // Hidden from the leaderboard (Pierre, 2026-11-03): no "hidden" tag, the name greyed (muted, italic), the full name
        // and the meaning in its title; a name shown on the leaderboard keeps the ink colour.
        const nameOf = n =>
          p
            .$eval(`.adm-urow[data-uopen="${n}"]`, tr => {
              const b = tr.querySelector('td:first-child .adm-cut'),
                cs = b && getComputedStyle(b),
                probe = document.createElement('span');
              probe.style.color = 'var(--muted)';
              tr.appendChild(probe);
              const muted = getComputedStyle(probe).color;
              probe.remove();
              return {
                tag: /\bhidden\b/.test(tr.cells[0].innerText),
                color: cs && cs.color,
                muted,
                italic: cs && cs.fontStyle,
                title: b && b.title
              };
            })
            .catch(() => null);
        for (const n of ['Test Demo']) {
          const h = await nameOf(n);
          if (!h) fails.push(`${w}px Players: hidden player ${n}: row not found`);
          else if (h.tag || h.color !== h.muted || h.italic !== 'italic' || !h.title.includes(n) || !/hidden/i.test(h.title))
            fails.push(`${w}px Players: hidden player ${n} not greyed without a tag (${JSON.stringify(h)})`);
        }
        const shown = await nameOf('Carla Demo');
        if (!shown) fails.push(`${w}px Players: Carla's row not found`);
        else if (shown.color === shown.muted || shown.italic === 'italic')
          fails.push(`${w}px Players: Carla's name is greyed (${JSON.stringify(shown)})`);
      }
      // A very long name never widens the table on a phone (Pierre, 2026-11-03): only the Name column grows, up to its cap
      // (admin.css --cut), the name ends in "…" and its title holds it whole.
      if (w === 390) {
        const size = () =>
          p.evaluate(() => {
            const t = document.querySelector('.adm-utbl'),
              th = t.querySelector('thead tr:last-child th'); // the Name column (the row above names the column groups)
            return {table: t.offsetWidth, name: th.offsetWidth, cap: 9 * parseFloat(getComputedStyle(t).fontSize) + 12 + 1};
          });
        const LONG = 'Bartholomew Alexander Montgomery-Fitzgerald Demo LongName-60';
        const before = await size();
        // A player with that name (the table only: renaming moved to Archive, which takes the record out of it).
        await p.evaluate(n => {
          USERS.users.find(u => u.name === 'Carla Demo').name = n;
          render();
        }, LONG);
        await p.waitForFunction(n => document.querySelector(`[data-uopen="${n}"]`), LONG, {timeout: 10000}).catch(() => {});
        const after = await size(),
          cut = await p
            .$eval(`.adm-urow[data-uopen="${LONG}"] .adm-cut`, b => ({title: b.title, cut: b.scrollWidth > b.clientWidth}))
            .catch(() => null);
        if (LONG.length !== 60 || after.name > after.cap || after.table - before.table > after.name - before.name + 1)
          fails.push(`${w}px Players: a 60-character name widened the table (${JSON.stringify({before, after})})`);
        if (!cut || !cut.cut || !cut.title.startsWith(LONG))
          fails.push(`${w}px Players: the 60-character name is not cut with its title (${JSON.stringify(cut)})`);
        await p.evaluate(n => {
          USERS.users.find(u => u.name === n).name = 'Carla Demo';
          render();
        }, LONG);
      }
      if (once) {
        // Once: merge and delete.
        await p.click('[data-uopen="mara demo2"]');
        await settle();
        await p.selectOption('[data-umerge="mara demo2"]', 'Mara Demo');
        await p
          .waitForFunction(() => !/mara demo2/.test(document.getElementById('view').innerText), null, {timeout: 10000})
          .catch(() => {});
        if (/mara demo2/.test(await text())) fails.push(`${w}px Users: merge did not remove "mara demo2"`);
        await p.click('[data-uopen="Test Demo"]');
        await settle();
        await p.click('[data-udel="Test Demo"]');
        await settle();
        // Sheet v55 (Pierre, 2026-11-05, Q89): two named choices, no default.
        const two = await p.evaluate(() => ({
          all: !!document.querySelector('[data-udel-all="Test Demo"]:not([disabled])'),
          keep: !!document.querySelector('[data-udel-keep="Test Demo"]:not([disabled])'),
          focus: !!(document.activeElement && document.activeElement.matches('[data-udel-all], [data-udel-keep]'))
        }));
        if (!two.all || !two.keep || two.focus)
          fails.push(`${w}px Users: delete does not offer its two named choices (${JSON.stringify(two)})`);
        await p.click('[data-udel-all="Test Demo"]');
        await p.waitForFunction(() => !/Test Demo/.test(document.getElementById('view').innerText), null, {timeout: 10000}).catch(() => {});
        if (/Test Demo/.test(await text())) fails.push(`${w}px Users: delete did not remove "Test Demo"`);
      }
      // A player's journey (admin-journey.js), opened from their row: numbers, both curves, the genera in the order met.
      await p.click('[data-uopen="Ana Demo"]');
      await settle();
      await p.click('.adm-udet a[href^="#players/list/journey/"]');
      await settle();
      const jo = await p.evaluate(() => {
        const v = document.getElementById('view'),
          met = [...v.querySelectorAll('.adm-jtbl tbody tr td:nth-child(3)')].map(td => Number((td.textContent.match(/#(\d+)/) || [])[1]));
        return {
          h: (v.querySelector('h2') || {}).textContent,
          charts: v.querySelectorAll('svg.adm-jl path').length,
          rows: met.length,
          ordered: met.every((x, i) => !i || x > met[i - 1]),
          lists: /Easiest for them/i.test(v.innerText) && /Hardest for them/i.test(v.innerText),
          tab: (document.querySelector('#subnav [aria-pressed="true"]') || {}).textContent,
          // Chart labels at 12 px at least as rendered (--fs-xs, never scaled down by the viewBox; Codex review #351).
          small: [...v.querySelectorAll('svg.adm-jl')].some(
            s => (s.clientWidth / s.viewBox.baseVal.width) * parseFloat(getComputedStyle(s.querySelector('text')).fontSize) < 11.9
          )
        };
      });
      if (jo.h !== 'Ana Demo' || jo.charts < 3 || !jo.rows || !jo.ordered || !jo.lists || jo.tab !== 'List' || jo.small)
        fails.push(`${w}px journey: ${JSON.stringify(jo)}`);
      if (once) {
        // Once: the journey's cards, learned genera, Carla's, sorts, sheets opened; Errors & feedback; To do › Reports.
        // The first-meeting cards from the player's saved progress (userData): Ana's first cards and single cards; Carla
        // opened all from the offer card (an orange line on the genera chart).
        await p
          .waitForFunction(() => /First cards/.test(document.getElementById('view').innerText), null, {timeout: 10000})
          .catch(() => {});
        const cards = await p.evaluate(() => ({
          t: (document.querySelector('.adm-jcards') || {}).innerText || '',
          col: [...document.querySelectorAll('.adm-jtbl tbody tr td:nth-child(2)')].map(td => td.textContent.trim())
        }));
        // Learned genera (from the saved progress): a tag in the list, a ★ on the genera chart; the games with their modes.
        const lrn = await p.evaluate(() => ({
          tags: document.querySelectorAll('.adm-jtbl .adm-jlearn').length,
          stars: document.querySelectorAll('svg.adm-jl text.s').length,
          games:
            [...document.querySelectorAll('#view td')].some(td => td.textContent === 'Quiz') &&
            /Look-alike duels/.test(document.getElementById('view').innerText)
        }));
        if (!lrn.tags || !lrn.stars || !lrn.games) fails.push(`${w}px journey learned / games: ${JSON.stringify(lrn)}`);
        if (!/First cards/.test(cards.t) || !cards.col.includes('first cards') || !cards.col.some(x => /^#\d+/.test(x)))
          fails.push(`${w}px journey cards (Ana): ${JSON.stringify(cards).slice(0, 300)}`);
        await go('players/list/journey/' + encodeURIComponent('Carla Demo'));
        await p
          .waitForFunction(() => /Opened all genera/.test(document.getElementById('view').innerText), null, {timeout: 10000})
          .catch(() => {});
        const carla = await p.evaluate(() => ({
          t: (document.querySelector('.adm-jcards') || {}).innerText || '',
          line: !!document.querySelector('svg.adm-jl line.o')
        }));
        if (
          !/Opened all genera after answer 40.*offer card/.test(carla.t) ||
          !/Kept all genera when asked after answer 70/.test(carla.t) ||
          !carla.line
        )
          fails.push(`${w}px journey (Carla): ${JSON.stringify(carla)}`);
        await go('players/list/journey/' + encodeURIComponent('Ana Demo'));
        await p.click('[data-jsort="hard"]');
        await settle();
        const firstHard = await p.$eval('.adm-jtbl tbody tr td:nth-child(6)', td => td.textContent);
        if (!/-|–/.test(firstHard)) fails.push(`${w}px journey: hardest first starts at ${firstHard}`);
        // Genus sheets opened (sheet v30 'pages', the demo's Pages tab, under the player's anonymous id): Ana's 9 sheets, the
        // first opened before it was asked, from Learn; Dio opened none; one device not signed in opened one.
        const jsheets = () =>
          p
            .waitForFunction(
              () => /visits? recorded|None opened|No visit/.test((document.querySelector('[data-jsheets]') || {}).innerText || ''),
              null,
              {
                timeout: 10000
              }
            )
            .catch(() => {})
            .then(() =>
              p.evaluate(() => {
                const s = document.querySelector('[data-jsheets]');
                return s ? {rows: s.querySelectorAll('tbody tr').length, t: s.innerText.replace(/\s+/g, ' ')} : null;
              })
            );
        const sa = await jsheets();
        if (
          !sa ||
          sa.rows !== 9 ||
          !/before asked/.test(sa.t) ||
          !/after asked/.test(sa.t) ||
          !/Learn/.test(sa.t) ||
          !/4 visits recorded/.test(sa.t) ||
          !/practice\.quiz \(Fish\) 7 min \(2×\)/.test(sa.t) // a fish page (fish.practice.quiz) read back with its subject
        )
          fails.push(`${w}px journey sheets (Ana): ${JSON.stringify(sa)}`);
        await go('players/list/journey/' + encodeURIComponent('Dio Demo'));
        const sd = await jsheets();
        if (!sd || sd.rows || !/None opened/.test(sd.t)) fails.push(`${w}px journey sheets (Dio): ${JSON.stringify(sd)}`);
        await go('players/list');
        const anonIds = await p.$$eval('a[href^="#players/list/anon/"]', L => [
          ...new Set(L.map(a => a.getAttribute('href').slice('#players/list/anon/'.length)))
        ]);
        const anonSheets = [];
        for (const id of anonIds) {
          await go('players/list/anon/' + id);
          const x = await jsheets();
          anonSheets.push(x ? x.rows : -1);
        }
        if (anonSheets.filter(n => n === 1).length !== 1 || anonSheets.some(n => n > 1))
          fails.push(`${w}px anonymous journeys' sheets: ${JSON.stringify(anonSheets)}`);

        // To do › Reports lists the demo reports; Activity shows the demo players' answers.
        // Errors & feedback (sheet v19 events): the one-tap answers, app errors, photos, saves, from the demo's made-up events.
        await go('inbox/todo/errors');
        await p
          .waitForFunction(() => /Saves that failed/i.test(document.getElementById('view').innerText), null, {timeout: 10000})
          .catch(() => {});
        const evt = await text();
        if (!/About right/i.test(evt) || !/reading 'views'/.test(evt) || !/Saves that failed/i.test(evt))
          fails.push(`${w}px Errors & feedback: demo events missing`);
        // One-tap questions (core.js PULSEQ): every item of the bank under its wording, its answers counted by level band
        // and by mode as the demo's rows say (rows with no item id are the first item's), and the common scales table.
        const pq = await p.evaluate(() => {
          const since = Date.now() - 30 * 864e5,
            R = EVS.rows.filter(r => r[3] === 'pulse' && r[1] >= since),
            tb = document.querySelector('.adm-pitems'),
            heads = [...tb.querySelectorAll('thead th')].map(th => th.textContent),
            col = t => heads.indexOf(t),
            cell = (q, label, c) => {
              const body = [...tb.tBodies].find(b => b.querySelector('.adm-pq th').firstChild.textContent.trim() === q);
              const row = body && [...body.rows].find(tr => tr.cells[0].textContent === label);
              return row ? parseInt(row.cells[c].textContent, 10) || 0 : -1;
            },
            bandOf = lv => (lv < -0.5 ? 'Beginner' : lv < 0.5 ? 'Middle' : 'Strong'),
            bad = [];
          for (const it of PULSEQ)
            for (const [k, t] of it.a) {
              const L = R.filter(r => (r[5] || PULSE0) === it.id && r[4] === k),
                want = {
                  All: L.length,
                  Beginner: L.filter(r => bandOf(JSON.parse(r[7]).lv) === 'Beginner').length,
                  Strong: L.filter(r => bandOf(JSON.parse(r[7]).lv) === 'Strong').length,
                  Quiz: L.filter(r => JSON.parse(r[7]).m === 'quiz').length,
                  Duel: L.filter(r => JSON.parse(r[7]).m === 'quiz-duel').length
                };
              for (const [h, n] of Object.entries(want))
                if (cell(it.q, t, col(h)) !== n) bad.push(`${it.q} ${t} ${h}: ${cell(it.q, t, col(h))} ≠ ${n}`);
            }
          // The response under each item (2026-11-03): shown, Not now, and no answer = shown − answered − Not now, counted
          // over the rows with an item id, by band and mode as above.
          const codes = new Set(PULSEQ.flatMap(it => it.a.map(a => a[0])));
          let ign = 0;
          for (const it of PULSEQ) {
            const L = R.filter(r => r[5] === it.id),
              per = f => {
                const C = L.filter(r => f(JSON.parse(r[7]))),
                  sh = C.filter(r => r[4] === PULSE_SHOWN).length,
                  an = C.filter(r => codes.has(r[4])).length,
                  sk = C.filter(r => r[4] === PULSE_SKIP).length;
                return {Shown: sh, 'Not now': sk, 'No answer': Math.max(0, sh - an - sk)};
              },
              cols = {All: () => true, Beginner: d => bandOf(d.lv) === 'Beginner', Duel: d => d.m === 'quiz-duel'};
            for (const [h, f] of Object.entries(cols))
              for (const [label, n] of Object.entries(per(f))) {
                if (h === 'All' && label === 'No answer') ign += n;
                if (cell(it.q, label, col(h)) !== n) bad.push(`${it.q} ${label} ${h}: ${cell(it.q, label, col(h))} ≠ ${n}`);
              }
          }
          const sc = document.querySelector('.adm-pscale');
          return {
            heads,
            bad,
            ign,
            scale:
              !!sc &&
              /Difficulty/.test(sc.textContent) &&
              /Feel/.test(sc.textContent) &&
              /Beginner/.test(sc.textContent) &&
              /Shown/.test(sc.textContent) &&
              /Answered/.test(sc.textContent),
            title: document.querySelector('.adm-pulse h3')?.textContent || ''
          };
        });
        if (
          !pq.scale ||
          !/One-tap questions/i.test(pq.title) ||
          ['All', 'Beginner', 'Middle', 'Strong', 'Quiz', 'Duel'].some(h => !pq.heads.includes(h)) ||
          pq.bad.length ||
          !pq.ign
        )
          fails.push(`${w}px Errors & feedback, one-tap questions: ${JSON.stringify(pq)}`);
        // Load times (sheet v21): the demo's three visits, their median line and the CDN server.
        if (!/Load times/i.test(evt) || !/640 kbit\/s/.test(evt) || !/MNL/.test(evt))
          fails.push(`${w}px Errors & feedback: load times missing`);
        // Keys come from anyone's device: "__proto__" as a photo or a message must not break the page (Codex review #343).
        const proto = await p.evaluate(() => {
          EVS.rows.unshift(
            ['protox', Date.now(), 'devx', 'photo', '__proto__', '', 'quiz', '', '1', 'x'],
            ['protoy', Date.now(), 'devx', 'err', '__proto__', '', 'quiz', '', '1', 'x']
          );
          try {
            renderEvents();
            return /__proto__/.test(document.getElementById('view').innerText);
          } catch (e) {
            return e.message;
          }
        });
        if (proto !== true) fails.push(`${w}px Errors & feedback with a "__proto__" event: ${proto}`);
        await go('inbox/todo/reports');
        if (!/Demo report/.test(await text())) fails.push(`${w}px To do › Reports: demo reports missing`);
        // Sheet v55: a report an account deleted with its answers kept left behind reads "From a removed account", no id.
        if (!/From a removed account/.test(await text()) || /~deleted/.test(await text()))
          fails.push(`${w}px To do › Reports: a removed account's report is not shown as such`);
        // A fish report (Codex review #442) on the fish side (Q309, rule A4: the reports follow the Corals | Fish switch): the
        // fish entry by its IMR name and its iNaturalist photo, not an empty tile; none of the fish reports on the corals' side.
        if (/Demo fish/.test(await text())) fails.push(`${w}px To do › Reports: a fish report on the corals' side`);
        await go('fish/inbox/todo/reports');
        {
          const fr = await p
            .waitForFunction(
              () => {
                const c = [...document.querySelectorAll('.adm-rep')].find(x => /Demo fish report: not a/.test(x.textContent));
                const im = c && c.querySelector('.adm-tile img');
                return c && im && /Damselfishes \(fish\)/.test(c.textContent) ? im.getAttribute('src') : false;
              },
              null,
              {timeout: 10000}
            )
            .then(h => h.jsonValue())
            .catch(() => null);
          if (!fr || !/inaturalist/.test(fr)) fails.push(`${w}px To do › Reports: the fish report has no fish name or photo (${fr})`);
        }
        await reportsBar();
      }
      // One action bar on every report (Q309), at every width: its status (Done, Stand-by, Dismiss), on one card, never
      // wider than it, on both sides.
      for (const side of ['', 'fish/']) {
        await go(side + 'inbox/todo/reports');
        const bar = await p.evaluate(() =>
          [...document.querySelectorAll('#view .adm-rep')].map(c => {
            const b = c.querySelector('.adm-repbar'),
              r = c.getBoundingClientRect();
            return {
              id: c.dataset.rep,
              st: b ? [...b.querySelectorAll('[data-rst]')].map(x => x.dataset.rst).join() : '',
              wide: !!b && (b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > r.right + 1),
              out: r.right > innerWidth + 1
            };
          })
        );
        const bad = bar.filter(x => x.st !== 'done,wait,drop' || x.wide || x.out);
        if (bar.length < 3 || bad.length)
          fails.push(`${w}px To do › Reports (${side || 'corals'}): action bars ${JSON.stringify(bad)} of ${bar.length}`);
        const sx = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (sx > 1) fails.push(`${w}px To do › Reports (${side || 'corals'}): ${sx}px of horizontal scroll`);
      }
      // A "Several fish species" report (Pierre, 2026-11-09, Q309): its reason in the fish's words, never "Several corals"; its
      // photo in play carries every tool of its family's page (the same buttons, the same tag rows once Tags is open), and
      // its count set to Others from the report writes the draft exactly as from the family page: the tag, and the photo out
      // of play (rule P3) in the same Undo step. A coral report reads "Several corals".
      await go('fish/inbox/todo/reports');
      await fishMulti(id => `#view .adm-rep[data-rep="${id}"]`);
      await go('inbox/todo/reports');
      const cw = await p.evaluate(() => (document.querySelector('.adm-repspr') || {}).textContent || '');
      if (!/Carla Demo Several corals/.test(cw)) fails.push(`${w}px To do › Reports, corals: a several-corals report's reason ${cw}`);
      if (w === 390) await shot('report-coral-390', '#view .adm-rep[data-rep="demorep0"]');
      // Health's photos everyone misses: the genus page's tile, one a row on a phone, never wider than the page.
      await go('inbox/todo/health');
      const hw = await p
        .waitForFunction(
          () => {
            const t = document.querySelector('[data-health="photos"] .adm-tile [data-act="hide"]');
            return t ? String(document.documentElement.scrollWidth - innerWidth) : false;
          },
          null,
          {timeout: 30000}
        )
        .then(async h => +(await h.jsonValue()))
        .catch(() => null);
      if (hw === null || hw > 1)
        fails.push(`${w}px Health: photos everyone misses without their genus page's tools, or ${hw}px of sideways scroll`);
      if (w === 390) await shot('health-coral-390', '[data-health="photos"] .adm-tile');
    }
    // A fish photo's tools from a report and from its family's page (Q309): one tile, one draft. At both widths.
    async function fishMulti(card) {
      const why = await p.evaluate(c => (document.querySelector(c + ' .adm-repwhy') || {}).textContent, card('demorep11'));
      if (why !== 'Several fish species') fails.push(`${w}px To do › Reports, fish: the reason reads "${why}"`);
      const tools = sel =>
        p.evaluate(sel => {
          const t = document.querySelector(sel);
          return (
            t && {
              f: t.dataset.f,
              play: t.hasAttribute('data-play'),
              fu: [...t.querySelectorAll('[data-fu]')]
                .map(x => x.dataset.fu)
                .sort()
                .join(),
              rows: [...t.querySelectorAll('.adm-ftrows [role="group"]')].map(g => g.getAttribute('aria-label')).join(),
              wide: t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().right > innerWidth + 1
            }
          );
        }, sel);
      const fishOf = () => p.evaluate(() => JSON.stringify({...(DRAFT.fish || {}), auto: null}));
      const rsel = card('demorep11') + ' .adm-ftile';
      await p.waitForFunction(s => document.querySelector(s + '[data-play]'), rsel, {timeout: 15000}).catch(() => {});
      let a = await tools(rsel);
      const want = 'cover,crop,exclude,feat,not,remove,tags,zoom';
      if (!a || !a.play || a.fu !== want) return fails.push(`${w}px To do › Reports, a fish photo in play: its tools ${JSON.stringify(a)}`);
      if (!(await p.$(rsel + ' .adm-ftrows'))) await p.click(rsel + ' [data-fu="tags"]');
      await settle();
      a = await tools(rsel);
      if (!/^Ease,.*View,Whole,Light,Colour loss,Clarity,Size,Count,Flags$/.test(a.rows) || a.wide)
        fails.push(`${w}px To do › Reports, a fish photo's tag rows: ${JSON.stringify(a)}`);
      // The Count row in plain words, each with its meaning on hover (Pierre, 2026-11-09: "Others" did not say several
      // species); other species split by the risk of confusion (Q323): k takes a photo in play out, o keeps it.
      const cnt = await p.evaluate(
        s =>
          [...document.querySelectorAll(s + ' .adm-ftrows [role="group"][aria-label="Count"] button')].map(b => [
            b.dataset.fv,
            b.textContent,
            !!b.title
          ]),
        rsel
      );
      if (
        JSON.stringify(cnt) !==
        JSON.stringify([
          ['1', 'One fish', true],
          ['s', 'Same species', true],
          ['o', 'Other species, no risk', true],
          ['k', 'Other species, confusable', true],
          ['x', 'Unclear', true]
        ])
      )
        fails.push(`${w}px To do › Reports, a fish photo's Count row: ${JSON.stringify(cnt)}`);
      if (w === 390) await shot('report-fish-tags-390', card('demorep11'));
      const d0 = await fishOf();
      await p.click(rsel + ' .adm-ftrows [data-ft="6"][data-fv="k"]');
      await settle();
      const rep = await p.evaluate(
        ([f, sel]) => ({
          tag: ((DRAFT.fish.tags || {})[f] || '')[6],
          seen: (DRAFT.fish.seen || {})[f],
          add: (DRAFT.fish.add || {})[f],
          out: ((document.querySelector(sel) || {}).querySelector?.('.adm-acts .adm-src') || {}).textContent || ''
        }),
        [a.f, rsel]
      );
      const after = await fishOf();
      if (rep.tag !== 'k' || rep.seen !== 1 || rep.add || rep.out !== 'removed')
        fails.push(`${w}px To do › Reports, Count Others on a fish photo in play: ${JSON.stringify(rep)}`);
      await p.click('#undo');
      await settle();
      if ((await fishOf()) !== d0) fails.push(`${w}px To do › Reports, Count Others: one Undo did not take it all back`);
      // The same photo on its family's page: the same tools, the same rows, the same draft from the same click.
      await go('fish/photos/tree/key/' + encodeURIComponent('f:Wrasses'));
      const fsel = `.adm-fgen .adm-tile[data-f="${a.f}"]`;
      await p.waitForFunction(s => document.querySelector(s), fsel, {timeout: 30000}).catch(() => {});
      if (!(await p.$(fsel + ' .adm-ftrows'))) await p.click(fsel + ' [data-fu="tags"]');
      await settle();
      const b = await tools(fsel);
      if (w === 390) await shot('family-fish-tags-390', fsel);
      if (!b || b.fu !== a.fu || b.rows !== a.rows || b.wide)
        fails.push(`${w}px Families: a photo's tools differ from its report's ${JSON.stringify({a, b})}`);
      else {
        await p.click(fsel + ' .adm-ftrows [data-ft="6"][data-fv="k"]');
        await settle();
        if ((await fishOf()) !== after) fails.push(`${w}px Families: Count Others does not write what the report's tile writes`);
        await p.click('#undo');
        await settle();
      }
      await p.evaluate(f => FT_OPEN.delete(f), a.f);
      await go('fish/inbox/todo/reports');
      // Moved with Not this, then added under its corrected species: in play there, with every tool (Codex review #823).
      const d1 = await fishOf();
      const to = await p.evaluate(f => {
        const s = FISHC.byF[f].sid,
          u = FISHC.units.find(x => x.id === 'f:Wrasses'),
          to = u.species.find(x => x !== s && FISHC.species[x] && !FISHC.species[x].out);
        DRAFT.fish = fishAdd(fishNotThis(DRAFT.fish || {}, f, to, s), f, to, null, FISHC.byF[f]);
        saveDraft();
        render();
        return to;
      }, a.f);
      await settle();
      const mv = await tools(rsel);
      if (!mv || !mv.play || mv.fu !== want)
        fails.push(`${w}px To do › Reports, a fish photo added under its corrected species ${to}: ${JSON.stringify(mv)}`);
      await p.click('#undo');
      await settle();
      if ((await fishOf()) !== d1) fails.push(`${w}px To do › Reports: Undo after a corrected species`);
      // The same into a species of another family: the tile follows that family (its rows, Feature, Cover), and Count
      // Others still takes the photo out of play (Codex review #823).
      const x = await p.evaluate(f => {
        const s = FISHC.byF[f].sid,
          u = FISHC.units.find(y => y.id === 'f:Damselfishes'),
          to = u.species.find(y => FISHC.species[y] && !FISHC.species[y].out);
        DRAFT.fish = fishAdd(fishNotThis(DRAFT.fish || {}, f, to, s), f, to, null, FISHC.byF[f]);
        saveDraft();
        render();
        return to;
      }, a.f);
      await settle();
      const xf = await tools(rsel),
        xfam = await p.evaluate(s => (document.querySelector(s) || {}).dataset?.fam, rsel);
      if (!xf || !xf.play || xf.fu !== want || xfam !== 'f:Damselfishes')
        fails.push(`${w}px To do › Reports, a fish photo added under ${x} in another family: ${JSON.stringify({xf, xfam})}`);
      else {
        if (!(await p.$(rsel + ' .adm-ftrows'))) await p.click(rsel + ' [data-fu="tags"]');
        await settle();
        await p.click(rsel + ' .adm-ftrows [data-ft="6"][data-fv="k"]');
        await settle();
        const xo = await p.evaluate(f => ({seen: (DRAFT.fish.seen || {})[f], on: fishOn(DRAFT.fish, f, DRAFT.fish.add[f])}), a.f);
        if (xo.seen !== 1 || xo.on) fails.push(`${w}px To do › Reports, Count Others on a photo in another family: ${JSON.stringify(xo)}`);
        await p.click('#undo');
        await settle();
      }
      await p.click('#undo');
      await settle();
      await p.evaluate(f => FT_OPEN.delete(f), a.f);
      if ((await fishOf()) !== d1) fails.push(`${w}px To do › Reports: Undo after a species of another family`);
      if (w === 390) await shot('report-fish-390', card('demorep11'));
    }
    // The reports' action bar (Q309), once: status, the tools each report can use, the list following the subject switch.
    async function reportsBar() {
      const card = id => `#view .adm-rep[data-rep="${id}"]`;
      const info = id =>
        p.evaluate(sel => {
          const c = document.querySelector(sel);
          if (!c) return null;
          const a = q => c.querySelector(q);
          return {
            rs: c.dataset.rs,
            pressed: (a('[data-rst][aria-pressed="true"]') || {}).dataset?.rst || '',
            sts: [...c.querySelectorAll('[data-rst]')].map(x => x.dataset.rst).join(),
            journey: a('[data-rj]') && a('[data-rj]').getAttribute('href'),
            unit: a('[data-ru]') && [a('[data-ru]').textContent, a('[data-ru]').getAttribute('href')],
            page: a('[data-rp]') && a('[data-rp]').getAttribute('href'),
            attach: !!a('[data-ratt]'),
            tiles: [...c.querySelectorAll('.adm-tile')].map(t => t.dataset.f),
            coralTools: !!a('.adm-tile [data-act="hide"]'),
            pick: c.querySelectorAll('[data-rpf]').length,
            unitSel: !!a('[data-rpunit]'),
            where: (a('.adm-where') || {}).textContent || '',
            fold: !!c.closest('details[data-repfold]') && c.closest('details[data-repfold]').dataset.repfold,
            afterWait: !!c.closest('#view') && [...document.querySelectorAll('#view [data-repsec="wait"] ~ .adm-rep')].includes(c)
          };
        }, card(id));
      const st = id =>
        p.evaluate(id => ({s: repStatus(DRAFT, id), seen: !!(DRAFT.seen || {})['rep:' + id], reps: (DRAFT.reps || {})[id] || ''}), id);
      await go('inbox/todo/reports');
      // The corals' side: the corals' reports and those about no subject (Home's feedback), no fish one.
      const t0 = await text();
      if (!/a timer in the quiz/.test(t0) || /Demo fish/.test(t0)) fails.push(`To do › Reports, corals: not its subject's reports only`);
      // No Journey without a player on the list: a report sent without signing in, one from a removed account.
      for (const id of ['demorep2', 'demorep6']) {
        const x = await info(id);
        if (!x || x.journey) fails.push(`To do › Reports: a Journey link on ${id} ${JSON.stringify(x)}`);
      }
      // A game report: the genus page, the page it came from, its photo with the genus page's tools (its reporter's record
      // was archived by the players' part: no Journey; Ana's feedback below has one).
      let r = await info('demorep0');
      if (
        !r ||
        r.sts !== 'done,wait,drop' ||
        !r.unit ||
        r.unit[0] !== 'Open genus' ||
        !/^#photos\/genera\/live\//.test(r.unit[1]) ||
        r.page !== 'index.html#practice/quiz' ||
        r.attach ||
        !r.tiles.length ||
        !r.coralTools
      )
        fails.push(`To do › Reports, a game report's bar: ${JSON.stringify(r)}`);
      // Stand-by: below the open ones, never thanked (not in seen); Publish counts it.
      const h0 = await p.evaluate(() => HIST.length);
      await p.click(card('demorep0') + ' [data-rst="wait"]');
      await settle();
      r = await info('demorep0');
      let s = await st('demorep0');
      const sum = await p.evaluate(() => pubSummary());
      if (
        s.s !== 'wait' ||
        s.seen ||
        s.reps !== 'wait' ||
        !r ||
        r.rs !== 'wait' ||
        r.pressed !== 'wait' ||
        !r.afterWait ||
        !/1 report status/.test(sum)
      )
        fails.push(`To do › Reports, Stand-by: ${JSON.stringify({s, r, sum})}`);
      if (/report status/.test(await p.evaluate(() => (status0().parts || []).join()))) {
        // the draft says so on Publish's title too
      } else fails.push('To do › Reports, Stand-by: the draft does not count the report status');
      // Done: thanked (seen rep:<id>), out of reps, folded in Done; Undo steps back through Stand-by to open.
      await p.click(card('demorep0') + ' [data-rst="done"]');
      await settle();
      r = await info('demorep0');
      s = await st('demorep0');
      if (
        s.s !== 'done' ||
        !s.seen ||
        s.reps ||
        !r ||
        r.fold !== 'done' ||
        !/Reopen/.test(await p.evaluate(c => document.querySelector(c).textContent, card('demorep0')))
      )
        fails.push(`To do › Reports, Done: ${JSON.stringify({s, r})}`);
      await p.click('#undo');
      await settle();
      if ((await st('demorep0')).s !== 'wait') fails.push(`To do › Reports: Undo of Done did not go back to Stand-by`);
      await p.click('#undo');
      await settle();
      s = await st('demorep0');
      if (s.s !== 'open' || (await p.evaluate(() => HIST.length)) !== h0)
        fails.push(`To do › Reports: Undo did not reopen ${JSON.stringify(s)}`);
      // Dismiss: never thanked, folded in Dismissed; Reopen there.
      await p.click(card('demorep0') + ' [data-rst="drop"]');
      await settle();
      s = await st('demorep0');
      r = await info('demorep0');
      if (s.s !== 'drop' || s.seen || !r || r.fold !== 'drop') fails.push(`To do › Reports, Dismiss: ${JSON.stringify({s, r})}`);
      await p.evaluate(c => document.querySelector(c).closest('details').setAttribute('open', ''), card('demorep0'));
      await p.click(card('demorep0') + ' [data-rst="open"]');
      await settle();
      if ((await st('demorep0')).s !== 'open' || (await p.evaluate(() => JSON.stringify(DRAFT.reps || null))) !== 'null')
        fails.push(`To do › Reports: Reopen left a status ${await p.evaluate(() => JSON.stringify(DRAFT.reps))}`);
      // A sheet report: its genus page, Attach a photo (its genus's photos), the photo then on the card with its tools,
      // kept in this tab only (never in the draft).
      r = await info('demorep3');
      if (!r || !r.unit || r.unit[0] !== 'Open genus' || !r.attach || r.tiles.length || /^game/.test(r.where))
        fails.push(`To do › Reports, a sheet report's bar: ${JSON.stringify(r)}`);
      else {
        await p.click(card('demorep3') + ' [data-ratt]');
        await settle();
        r = await info('demorep3');
        if (!r.pick || r.unitSel) fails.push(`To do › Reports, Attach on a sheet report: ${JSON.stringify(r)}`);
        const d0 = await p.evaluate(() => JSON.stringify(DRAFT));
        const f = await p.evaluate(c => document.querySelector(c + ' [data-rpf]').dataset.rpf, card('demorep3'));
        await p.click(card('demorep3') + ' [data-rpf]');
        await settle();
        r = await info('demorep3');
        if (r.tiles.join() !== f || !r.coralTools || r.pick || (await p.evaluate(() => JSON.stringify(DRAFT))) !== d0)
          fails.push(`To do › Reports, a photo attached: ${JSON.stringify({f, r})}`);
      }
      // Send feedback from Home: Open page, no unit; Attach asks the genus first.
      r = await info('demorep4');
      if (
        !r ||
        r.page !== 'index.html' ||
        r.unit ||
        r.journey !== '#players/list/journey/Ana%20Demo' ||
        !r.attach ||
        !/^page/.test(r.where)
      )
        fails.push(`To do › Reports, Home feedback's bar: ${JSON.stringify(r)}`);
      else {
        await p.click(card('demorep4') + ' [data-ratt]');
        await settle();
        r = await info('demorep4');
        if (!r.unitSel || r.pick) fails.push(`To do › Reports, Attach without a unit: no unit picker first ${JSON.stringify(r)}`);
        await p.selectOption(card('demorep4') + ' [data-rpunit]', {index: 1});
        await settle();
        r = await info('demorep4');
        if (!r.pick) fails.push(`To do › Reports, Attach: no photos once a genus is picked ${JSON.stringify(r)}`);
      }
      // Send feedback from a game carries the question's genus and photo: its tools, no Attach.
      r = await info('demorep7');
      if (!r || !r.unit || !r.tiles.length || !r.coralTools || r.attach || r.page !== 'index.html#practice/quiz')
        fails.push(`To do › Reports, feedback from a game: ${JSON.stringify(r)}`);
      // The fish side: its reports and the feedback about no subject; the fish photo tools, the fish units' links.
      await go('fish/inbox/todo/reports');
      await p
        .waitForFunction(() => typeof FISHC !== 'undefined' && FISHC && document.querySelector('.adm-ftile [data-fu="not"]'), null, {
          timeout: 15000
        })
        .catch(() => {});
      const t1 = await text();
      if (!/a timer in the quiz/.test(t1) || /two colonies/.test(t1)) fails.push(`To do › Reports, fish: not its subject's reports only`);
      const fam = '#fish/photos/tree/key/' + encodeURIComponent('f:Damselfishes');
      const ft = id =>
        p.evaluate(
          ([sel, fam]) => {
            const t = document.querySelector(sel + ' .adm-ftile');
            return (
              t && {
                f: t.dataset.f,
                x: !!t.querySelector('[data-fu="exclude"]'),
                rm: !!t.querySelector('[data-fu="remove"]'),
                not: !!t.querySelector('[data-fu="not"]'),
                open: (t.querySelector('[data-fu-open]') || {}).getAttribute?.('href') === fam,
                out: (t.querySelector('.adm-acts .adm-src') || {}).textContent || ''
              }
            );
          },
          [card(id), fam]
        );
      let fr = await ft('demorep5');
      if (!fr || !fr.x || !fr.rm || fr.not || !fr.open) fails.push(`To do › Reports, a fish photo's tools: ${JSON.stringify(fr)}`);
      else {
        await p.click(card('demorep5') + ' [data-fu="remove"]');
        await settle();
        const rm = await p.evaluate(f => ((DRAFT.fish || {}).seen || {})[f], fr.f);
        const fr2 = await ft('demorep5');
        if (rm !== 1 || fr2.out !== 'removed' || fr2.rm) fails.push(`To do › Reports, a fish photo's Remove: ${JSON.stringify({rm, fr2})}`);
        await p.click('#undo');
        await settle();
        await p.click(card('demorep5') + ' [data-fu="exclude"]');
        await settle();
        if (!(await p.evaluate(f => !!((DRAFT.fish || {}).exclude || {})[f], fr.f)))
          fails.push(`To do › Reports, a fish photo's ×: not excluded`);
        await p.click('#undo');
        await settle();
        if (await p.evaluate(f => !!((DRAFT.fish || {}).exclude || {})[f] || !!((DRAFT.fish || {}).seen || {})[f], fr.f))
          fails.push(`To do › Reports, a fish photo: Undo did not take the tools back`);
      }
      // A curated candidate photo: Not this sends it to another species of its family, or none.
      fr = await ft('demorep10');
      if (!fr || !fr.not) fails.push(`To do › Reports, a fish candidate photo: no Not this ${JSON.stringify(fr)}`);
      else {
        await p.click(card('demorep10') + ' [data-fu="not"]');
        await p.selectOption(card('demorep10') + ' [data-funot]', 'x');
        await settle();
        if ((await p.evaluate(f => ((DRAFT.fish || {}).out || {})[f], fr.f)) !== 'x')
          fails.push(`To do › Reports, a fish photo's Not this: not sent`);
        await p.click('#undo');
        await settle();
      }
      // A species sheet whose id the script did not keep: its unit from its page, a working link to its family's page; the
      // ID marks' report is a sheet's, not a game's.
      r = await info('demorep8');
      const sp = await p.evaluate(
        c => [...document.querySelectorAll(c + ' .adm-rephead a.adm-gen')].map(a => [a.textContent, a.getAttribute('href')]),
        card('demorep8')
      );
      if (
        !r ||
        !r.unit ||
        r.unit[0] !== 'Open family' ||
        r.unit[1] !== fam ||
        JSON.stringify(sp) !== JSON.stringify([['Chromis ternatensis', fam]])
      )
        fails.push(`To do › Reports, a fish species sheet report: ${JSON.stringify({r, sp})}`);
      r = await info('demorep9');
      if (!r || !/^marks/.test(r.where) || !r.unit || r.unit[1] !== fam)
        fails.push(`To do › Reports, a fish ID marks report: ${JSON.stringify(r)}`);
      // The fish side's counts are its own open reports (and flags).
      const cnt = await p.evaluate(() => ({
        view: +(((document.querySelector('#subnav a[href$="inbox/todo/reports"]') || {}).textContent || '').match(/\d+/) || [0])[0],
        open: document.querySelectorAll('#view .adm-rep[data-rs="open"]').length,
        flags: Object.keys(flagsOf(DRAFT)).length
      }));
      if (cnt.view !== cnt.open + cnt.flags) fails.push(`To do › Reports, fish: the count ${JSON.stringify(cnt)}`);
      await go('inbox/todo/reports');
    }
    if (run.has('players')) await playersPart();
    await go('players/activity');
    if (/No answers yet/.test(await text())) fails.push(`${w}px Activity: no answers`);
    if (once) {
      // Once: every account counts.
      // Every account counts (Pierre, 2026-11-04): the answers and players on Activity are the whole log's, the account
      // this browser is signed in with included; no Others / Me switch.
      const every = await p.evaluate(() => {
        const k = Object.fromEntries(
          [...document.querySelectorAll('.adm-kpis > div')].map(d => [
            d.querySelector('span').textContent,
            d.querySelector('b').textContent
          ])
        );
        return {
          answers: Number(k.Answers),
          players: Number(k.Players),
          // but the answers a deleted account or an archive left (sheet v55/v58 flag 2): no player, photos only
          all: ANS.rows.filter(r => r[11] !== 2).length,
          ids: new Set(ANS.rows.filter(r => r[11] !== 2).map(r => r[0])).size,
          sw: !!document.querySelector('[data-sf="who"]')
        };
      });
      if (every.answers !== every.all || every.players !== every.ids || every.sw)
        fails.push(`${w}px Activity: not every account counts ${JSON.stringify(every)}`);
    }
    // Recent sessions (Pierre, 2026-11-03): the last 10 sessions of every player, newest first, by name or anonymous id;
    // Carla playing now (quiz, custom quiz, duel and typed answers), the device that stopped 12 minutes ago by its id; ↻ reloads.
    const recent = () =>
      p.evaluate(() => {
        const c = document.querySelector('[data-recent]');
        if (!c) return null;
        const R = [...c.querySelectorAll('tbody tr[data-sopen]')].map(tr => ({
          who: tr.cells[0].textContent.trim(),
          anon: !!tr.cells[0].querySelector('code'),
          link: (tr.cells[0].querySelector('a') || {}).getAttribute?.('href') || '',
          t: Number((tr.cells[1].querySelector('[data-t]') || {dataset: {t: 0}}).dataset.t),
          last: tr.cells[1].textContent.trim(),
          n: Number(tr.cells[2].textContent),
          modes: tr.cells[6].textContent,
          now: tr.classList.contains('now')
        }));
        return {first: c === document.querySelector('#view section'), head: c.querySelector('h3').textContent, R};
      });
    if (once) {
      // Once: Recent sessions.
      const rs = await recent();
      if (!rs) fails.push(`${w}px Activity: no Recent sessions`);
      else {
        const R = rs.R,
          c = R[0] || {},
          an = R.find(x => x.anon) || {};
        if (!rs.first || R.length !== 10) fails.push(`${w}px Recent sessions: not first or ${R.length} rows, expected 10`);
        if (R.some((x, i) => i && x.t > R[i - 1].t)) fails.push(`${w}px Recent sessions: not newest first`);
        if (c.who !== 'Carla Demo' || !c.now || c.last !== 'now' || c.n !== 24 || !/1 playing now/.test(rs.head))
          fails.push(`${w}px Recent sessions: Carla not playing now ${JSON.stringify(c)} ${rs.head}`);
        if (!/quiz/.test(c.modes) || !/duel/.test(c.modes) || !/typed 2/.test(c.modes) || !/custom 8/.test(c.modes))
          fails.push(`${w}px Recent sessions: modes ${c.modes}`);
        if (R.filter(x => x.now).length !== 1)
          fails.push(`${w}px Recent sessions: ${R.filter(x => x.now).length} sessions now, expected 1`);
        if (!/^1[2-4] min ago$/.test(an.last) || an.n !== 8 || !/^#players\/list\/anon\//.test(an.link) || R[1] !== an)
          fails.push(`${w}px Recent sessions: the device not signed in ${JSON.stringify(an)}`);
        if (!R.some(x => /^#players\/list\/journey\//.test(x.link) && !x.now))
          fails.push(`${w}px Recent sessions: no other signed-in player`);
      }
    }
    if (once) {
      // Once: a live Activity (Pierre, 2026-11-08: "Les deux"). From sheet LIVE_SHEET the page reads the newest answers
      // every minute while it is open and in view (admin.js liveArm, liveRead; the demo's readLive): an answer Carla gives
      // now shows in her session without ↻; hidden, nothing is read; back in view, a read at once. Before it (this page,
      // the demo's default script), no light read at all (rule D4). The minute is cut to 1.5 s here.
      const LV = Number(/const LIVE_SHEET = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'))[1]);
      const lives = q => q.evaluate(() => window.DEMO_CALLS.filter(c => c.k === 'readLive').length);
      if (await lives(p)) fails.push(`${w}px live Activity: a light read before LIVE_SHEET`);
      const q = await p.context().newPage();
      q.on('pageerror', e => fails.push(`${w}px live Activity page error: ${e.message}`));
      await q.goto(base + `admin.html?demo&v=${LV}#players/activity`);
      await q.waitForSelector('[data-recent] tbody tr', {timeout: 20000}).catch(() => {});
      const carla = () =>
        q.evaluate(() => {
          const tr = [...document.querySelectorAll('[data-recent] tbody tr[data-sopen]')].find(r =>
            /Carla Demo/.test(r.cells[0].textContent)
          );
          return tr ? Number(tr.cells[2].textContent) : 0;
        });
      const n0 = await carla();
      await q.evaluate(() => {
        LIVE_READ.MS = 1500;
        liveArm();
        window.DEMO_ANSWER('Carla Demo');
      });
      const got = await q
        .waitForFunction(
          n => {
            const tr = [...document.querySelectorAll('[data-recent] tbody tr[data-sopen]')].find(r =>
              /Carla Demo/.test(r.cells[0].textContent)
            );
            return tr && Number(tr.cells[2].textContent) === n + 1;
          },
          n0,
          {timeout: 15000}
        )
        .then(() => true)
        .catch(() => false);
      const l1 = await lives(q);
      if (!got || n0 !== 24 || !l1)
        fails.push(`${w}px live Activity: Carla's new answer not shown ${JSON.stringify({n0, n: await carla(), l1})}`);
      const vis = st =>
        q.evaluate(st => {
          Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => st});
          document.dispatchEvent(new Event('visibilitychange'));
        }, st);
      await vis('hidden');
      const h0 = await lives(q);
      await q.waitForTimeout(4000);
      const h1 = await lives(q);
      if (h1 !== h0) fails.push(`${w}px live Activity: ${h1 - h0} light reads while hidden`);
      await vis('visible');
      await q.waitForTimeout(800);
      if ((await lives(q)) !== h1 + 1) fails.push(`${w}px live Activity: no light read at once back in view`);
      await q.close();
    }
    // A session unfolds its summary under it and folds again (Pierre, 2026-11-05): Carla's session playing now (made-up
    // demo data, admin-demo.js) says what she made of it in words, then start → end, length, answers, right, progress
    // before → after, the success chart, her new genera, events, achievements (25% progress, earned in it) and a link to
    // her Journey; a second tap folds it; Enter unfolds it too. At both widths: no sideways page scroll while it is open.
    {
      const sess = () =>
        p.evaluate(() => {
          const d = document.querySelector('[data-sess]');
          if (!d) return null;
          const row = d.closest('tr').previousElementSibling;
          return {
            row: row && row.dataset.sopen && row.cells[0].textContent.trim(),
            exp: row && row.getAttribute('aria-expanded'),
            open: document.querySelectorAll('[data-sess]').length,
            said: d.querySelector('.adm-sesssum').textContent,
            kpis: [...d.querySelectorAll('.adm-kpis > div > span')].map(x => x.textContent),
            prog: (d.querySelectorAll('.adm-kpis > div > b')[4] || {}).textContent,
            chart: !!d.querySelector('svg.adm-jl path.acc'),
            heads: [...d.querySelectorAll('.adm-sessgrid h4')].map(x => x.textContent),
            text: d.innerText,
            link: (d.querySelector('a.next') || {}).getAttribute?.('href'),
            wide: document.documentElement.scrollWidth - innerWidth,
            // Pierre, 2026-11-05: the scale starts under the session's lowest point, not at 0; the photos everyone misses
            // say so; the panel stays inside the visible part of the table; on desktop the lists sit beside the chart.
            low: Number((d.querySelector('svg.adm-jl text') || {}).textContent?.replace('%', '')),
            hard: d.querySelectorAll('[data-hardall]').length,
            // The photo's difficulty in words (Pierre, 2026-11-05): "recognised by N%", never the signed photo Elo.
            rec: [...d.querySelectorAll('.adm-htile .adm-hnum')].map(x => x.textContent),
            past: Math.round(
              d.getBoundingClientRect().right -
                (d.closest('.adm-tscroll').getBoundingClientRect().left + d.closest('.adm-tscroll').clientWidth)
            ),
            side:
              d.querySelector('.adm-sesschart').getBoundingClientRect().right <=
              d.querySelector('.adm-sessgrid').getBoundingClientRect().left
          };
        });
      await p.click('[data-recent] tr[data-sopen] td:nth-child(3)');
      await p.waitForFunction(
        () => /\d+% → \d+%/.test((document.querySelectorAll('[data-sess] .adm-kpis b')[4] || {}).textContent || ''),
        null,
        {
          timeout: 20000
        }
      );
      const s1 = await sess();
      if (
        !s1 ||
        s1.row !== 'Carla Demo' ||
        s1.exp !== 'true' ||
        s1.open !== 1 ||
        !/^24 answers in \d+ min, \d+% right where \d+% was expected\./.test(s1.said) ||
        s1.kpis.join('|') !== 'Start → end|Length|Answers|Right|Progress' ||
        !s1.chart ||
        !['New genera', 'Events', 'Achievements'].every(h => s1.heads.includes(h)) ||
        !/A quarter/.test(s1.text) ||
        !/Session \d+ of \d+/.test(s1.text) ||
        !/Typed 2, \d right/.test(s1.text) ||
        s1.link !== '#players/list/journey/Carla%20Demo' ||
        s1.wide > 0 ||
        !(s1.low > 0) ||
        s1.hard < 1 ||
        !s1.rec.length ||
        s1.rec.some(t => !/^recognised by \d+%( · hard for everyone)?$/.test(t)) ||
        s1.past > 0 ||
        s1.side !== w >= 1024
      )
        fails.push(`${w}px Recent sessions: Carla's session did not unfold its summary ${JSON.stringify(s1)}`);
      if (once) {
        // ↻ with a session open reads the player's saved copy again too (Codex review #557): her achievements, cards and
        // learned genera follow her new answers, not the copy read when the session was first unfolded.
        const reads = () => p.evaluate(() => window.DEMO_CALLS.filter(c => c.k === 'userData').length);
        const r0 = await reads();
        await p.click('[data-sload]');
        await settle();
        await p
          .waitForFunction(
            () => /\d+% → \d+%/.test((document.querySelectorAll('[data-sess] .adm-kpis b')[4] || {}).textContent || ''),
            null,
            {
              timeout: 20000
            }
          )
          .catch(() => {});
        const r1 = await reads(),
          still = await sess();
        if (r1 <= r0 || !still || still.row !== 'Carla Demo')
          fails.push(
            `${w}px Recent sessions ↻: the open session's saved copy was not read again (${r0} → ${r1} reads) ${JSON.stringify(still && still.row)}`
          );
      }
      await p.click('[data-recent] tr[data-sopen] td:nth-child(3)');
      const s2 = await sess();
      const exp2 = await p.$eval('[data-recent] tr[data-sopen]', tr => tr.getAttribute('aria-expanded'));
      if (s2 || exp2 !== 'false') fails.push(`${w}px Recent sessions: a second tap did not fold the summary ${JSON.stringify(s2)}`);
      if (once) {
        await p.focus('[data-recent] tr[data-sopen]');
        await p.keyboard.press('Enter');
        const s3 = await sess();
        if (!s3 || s3.row !== 'Carla Demo') fails.push(`${w}px Recent sessions: Enter did not unfold the summary`);
        await p.keyboard.press('Enter');
        if (await sess()) fails.push(`${w}px Recent sessions: Enter did not fold the summary`);
      }
    }
    // Activity over time (Pierre, 2026-11-04: "who plays and how much"): answers, active players and new players per day,
    // week or month (the switch), and the play hours (24 bars).
    const act = async () =>
      p.evaluate(() => {
        const c = document.querySelector('.adm-actv');
        return (
          c && {
            charts: c.querySelectorAll('.adm-acol').length,
            bars: c.querySelector('.adm-acol .adm-cols').children.length,
            hours: c.querySelectorAll('.adm-phours > div').length,
            on: (c.querySelector('[data-sf="per"][aria-pressed="true"]') || {}).dataset?.v,
            wide: document.documentElement.scrollWidth - innerWidth
          }
        );
      });
    const ac0 = await act();
    if (ac0) {
      await p.click('.adm-actv [data-sf="month"], .adm-actv [data-v="month"]');
      await settle();
    }
    const ac1 = await act();
    if (!ac0 || ac0.charts !== 3 || ac0.hours !== 24 || !ac0.bars || !ac1 || ac1.on !== 'month' || ac1.bars > ac0.bars || ac1.wide > 0)
      fails.push(`${w}px Activity over time: ${JSON.stringify([ac0, ac1])}`);
    if (ac0) {
      await p.click('.adm-actv [data-v="day"]');
      await settle();
    }
    // 60 periods (the most the card draws) fit their chart at every width: the bars shrink, none spills out of its chart
    // (Codex review #501: a 4 px minimum and 3 px gaps needed 417 px a chart).
    const fit = await p.evaluate(() => {
      const t0 = Date.now() - 90 * 864e5,
        R = Array.from({length: 90}, (_, i) => [`p${i % 7}`, t0 + i * 864e5]),
        box = document.createElement('div');
      box.id = 'fittest';
      box.innerHTML = activityCard(R);
      document.getElementById('view').prepend(box);
      const C = [...box.querySelectorAll('.adm-acol .adm-cols')],
        r = {
          bars: C[0].children.length,
          over: C.filter(c => c.scrollWidth > c.clientWidth + 1).length,
          wide: document.documentElement.scrollWidth - innerWidth
        };
      box.remove();
      return r;
    });
    if (fit.bars !== 60 || fit.over || fit.wide > 0) fails.push(`${w}px Activity over time: 60 periods do not fit ${JSON.stringify(fit)}`);
    if (once) {
      // Once: ↻, photo difficulty lanes.
      // ↻ reads the answers again (no timer): the page comes back with its sessions.
      const before = await p.evaluate(() => ANS.at);
      await p.click('[data-sload]');
      await settle();
      const re = await recent();
      if (!re || re.R.length !== 10 || !(await p.evaluate(b => ANS && ANS.at > b, before)))
        fails.push(`${w}px Activity ↻: the answers were not read again`);
      // Photo difficulty by genus: one lane per view, a median bar in every lane that has photos.
      await go('photos/stats/difficulty');
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
    }
    // Difficulty in words (Pierre, 2026-11-05, Q19 and Q26): on the main views no signed raw difficulty or level is left
    // ("+1.44", "−0.80"); every reading is a badge (admin.js recBadge) whose colour class is the band of its % (≥75 very
    // easy, 60-75 easy, 40-60 middle, 25-40 hard, <25 very hard) and whose title holds the raw value; players read as an
    // Elo with the level in its title. At both widths, with no sideways scroll.
    for (const [h, need] of [
      ['photos/stats/difficulty', 'rec'],
      ['photos/review/by-difficulty', 'rec'],
      ['inbox/todo/health', 'rec'],
      ['analyses/learning/answer-log', 'elo'],
      ['players/list/journey/Carla%20Demo', 'elo']
    ]) {
      await go(h);
      const r = await p.evaluate(() => {
        const v = document.getElementById('view'),
          B = [...v.querySelectorAll('.adm-rec')],
          band = n => (n >= 75 ? 'veasy' : n >= 60 ? 'easy' : n >= 40 ? 'mid' : n >= 25 ? 'hard' : 'vhard');
        return {
          signed: (v.innerText.match(/(^|[^\w.])[+−-]\d+\.\d+(?! ?s\b)/gm) || []).slice(0, 3),
          rec: B.length,
          off: B.filter(b => !b.classList.contains('rec-' + band(Number((b.textContent.match(/(\d+)%/) || [])[1]))))
            .map(b => b.className + ' ' + b.textContent)
            .slice(0, 3),
          noRaw: B.filter(b => !/(difficulty|offset)[^·]* [+−]?\d+\.\d\d \(\+ = harder\)/.test(b.title))
            .map(b => b.title)
            .slice(0, 2),
          elo: v.querySelectorAll('.adm-elo[title*="level"]').length,
          wide: document.documentElement.scrollWidth - innerWidth
        };
      });
      if (r.signed.length || !r[need] || r.off.length || r.noRaw.length || r.wide > 0)
        fails.push(`${w}px #${h}: difficulty not read in words ${JSON.stringify(r)}`);
    }
    // ...and everywhere else in the admin (ROADMAP "Intuitive difficulty display everywhere", Pierre, 2026-11-05): on every
    // view of every tab, Coverage's full "Where to look" list and both demo journeys, no signed raw number in the page's
    // text (seconds and "pts" aside; the one-tap tables' felt difficulty, the players' own −1…+1 survey scale, aside), every
    // badge in the band of its %, and no "recognised by N%" written as plain text outside a badge. Once, at 1280.
    if (once)
      for (const h of new Set([
        ...ROUTES.map(r => r.h).filter(h => h && !h.startsWith('players/list/journey/')),
        'inbox/coverage/games?look=all',
        'players/list/journey/Ana Demo',
        'players/list/journey/Carla Demo'
      ])) {
        await go(h);
        const r = await p.evaluate(() => {
          const v = document.getElementById('view'),
            band = n => (n >= 75 ? 'veasy' : n >= 60 ? 'easy' : n >= 40 ? 'mid' : n >= 25 ? 'hard' : 'vhard'),
            felt = [...v.querySelectorAll('.adm-pscale')];
          felt.forEach(x => (x.style.display = 'none'));
          const signed = (v.innerText.match(/(^|[^\w.])[+−-]\d+\.\d+(?! ?(s|pts?)\b)/gm) || []).slice(0, 3);
          felt.forEach(x => (x.style.display = ''));
          const plain = [],
            tw = document.createTreeWalker(v, NodeFilter.SHOW_TEXT);
          for (let n; (n = tw.nextNode());)
            if (/recognised by \d+%/i.test(n.textContent) && !n.parentElement.closest('.adm-rec'))
              plain.push(n.textContent.trim().slice(0, 80));
          return {
            signed,
            plain: plain.slice(0, 3),
            off: [...v.querySelectorAll('.adm-rec')]
              .filter(
                b =>
                  !b.classList.contains('rec-' + band(Number((b.textContent.match(/(\d+)%/) || [])[1]))) || !/[+−]?\d+\.\d\d/.test(b.title)
              )
              .map(b => b.className + ' ' + b.textContent)
              .slice(0, 3)
          };
        });
        if (r.signed.length || r.plain.length || r.off.length)
          fails.push(`${w}px #${h}: difficulty not read in words ${JSON.stringify(r)}`);
      }
    // Photo stats › Overview (Pierre, 2026-11-03: general stats on every photo): its numbers against a direct count made
    // here with the Coverage page's own covOf (photos and colonies per genus x view), the candidates and the rejected
    // marks, and a plain median (sort, middle value); nothing wider than the window.
    await go('photos/stats/overview');
    const ov = await p.evaluate(() => {
      const cells = sel => [...document.querySelectorAll(sel)].map(r => [...r.children].map(c => c.innerText.trim()));
      const med = L => {
          const a = L.slice().sort((x, y) => x - y),
            h = a.length >> 1;
          return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
        },
        txt = x => (Number.isInteger(x) ? String(x) : x.toFixed(1));
      let play = 0,
        cols = 0;
      const per = [],
        perV = {wide: [], medium: [], macro: []},
        tot = {wide: 0, medium: 0, macro: 0},
        F = [];
      [...GAME].forEach(n => {
        let k = 0;
        const O = new Set();
        covViews(n).forEach(([v]) => {
          const c = covOf(n, v);
          k += c.n;
          tot[v] += c.n;
          perV[v].push(c.n);
          c.L.forEach(x => (O.add(x.o || x.f), F.push(x.f)));
        });
        play += k;
        cols += O.size;
        per.push(k);
      });
      let wait = 0,
        rej = 0;
      Object.keys(DATA.gen).forEach(n =>
        cands(n)
          .filter(x => !(entry(n).add || {})[x.f])
          .forEach(x => (rejected(x.f) ? rej++ : wait++))
      );
      const pool = Object.fromEntries(cells('[data-pov="pool"] tbody tr').map(r => [r[0], Number(r[1])]));
      const views = Object.fromEntries(cells('[data-pov="views"] tbody tr').map(r => [r[0], r]));
      return {
        kpi: [...document.querySelectorAll('.adm-pov .adm-kpis b')].map(b => b.innerText.trim()),
        want: [String(play), String(cols), String(per.filter(Boolean).length), String(wait)],
        pool,
        rej,
        sum: ['In play', 'Not in games', 'Comparison only', 'Removed', 'Candidates', 'Rejected', 'Excluded'].reduce(
          (t, k) => t + pool[k],
          0
        ),
        genus: cells('[data-pov="genus"] tbody tr')[0],
        wantMed: txt(med(per)),
        wantRange: `${Math.min(...per)}–${Math.max(...per)}`,
        views: [
          ['Colony', 'wide'],
          ['Close-up', 'medium'],
          ['Corallites', 'macro']
        ].map(([t, v]) => [views[t] && views[t][1], String(tot[v]), views[t] && views[t][3].split(' ')[0], txt(med(perV[v]))]),
        never: Number(cells('[data-pov="answers"] tbody tr')[0][1]),
        wantNever: F.filter(f => !nAns(STATS[f])).length,
        ends: document.querySelectorAll('[data-pov="ends"] a.adm-gen').length,
        wide: document.documentElement.scrollWidth - innerWidth
      };
    });
    if (ov.kpi.join() !== ov.want.join()) fails.push(`${w}px Overview: headline ${ov.kpi} instead of ${ov.want}`);
    if (ov.pool['In play'] !== Number(ov.want[0]) || ov.pool.Rejected !== ov.rej || ov.pool.Total !== ov.sum)
      fails.push(`${w}px Overview: All photos ${JSON.stringify(ov.pool)}, rejected ${ov.rej}`);
    if (!ov.genus || ov.genus[1].split(' ')[0] !== ov.wantMed || ov.genus[2] !== ov.wantRange)
      fails.push(`${w}px Overview: per genus ${ov.genus} instead of median ${ov.wantMed}, range ${ov.wantRange}`);
    if (ov.views.some(([a, b, c, d]) => a !== b || c !== d)) fails.push(`${w}px Overview: views ${JSON.stringify(ov.views)}`);
    if (ov.never !== ov.wantNever) fails.push(`${w}px Overview: ${ov.never} photos never rated instead of ${ov.wantNever}`);
    if (ov.ends !== 10) fails.push(`${w}px Overview: ${ov.ends} genus links in Fewest and most`);
    if (ov.wide > 0) fails.push(`${w}px Overview: page ${ov.wide} px wider than the window`);
    // The calibration goal (Pierre, 2026-11-06, Q192): 3+ answers per genus, every game genus once, its photos in play and
    // those with 3 answers or more as counted here; a photo 2 logits above its genus after 6 answers is far harder than it
    // (listed on Difficulty, counted on the genus's row), one with 4 answers is not yet; the ratings put back after.
    {
      const rated = await p.evaluate(() => {
        const R = [...document.querySelectorAll('[data-pov="rated"] tbody tr')].map(r => [...r.children].map(c => c.innerText.trim())),
          F = [...GAME].flatMap(n => covViews(n).flatMap(([v]) => covOf(n, v).L.map(x => x.f)));
        return {
          rows: R.length,
          genera: GAME.size,
          photos: R.reduce((t, r) => t + Number(r[1]), 0),
          want: F.length,
          three: R.reduce((t, r) => t + Number(r[2]), 0),
          wantThree: F.filter(f => nAns(STATS[f]) >= RATE.MIN).length
        };
      });
      if (rated.rows !== rated.genera || rated.photos !== rated.want || rated.three !== rated.wantThree)
        fails.push(`${w}px Overview: 3+ answers per genus ${JSON.stringify(rated)}`);
      const inj = await p.evaluate(() => {
        const L = poolStats().play.filter(x => GD[x.genus] && !STATS[x.f]),
          a = L[0],
          b = L.find(x => x.genus !== a.genus);
        STATS[a.f] = [GD[a.genus][0] + 2, 5.5, 1, 6];
        STATS[b.f] = [GD[b.genus][0] + 2, 3.5, 1, 4];
        return {a: a.f, b: b.f, g: a.genus};
      });
      await go('photos/stats/difficulty');
      const far = await p.evaluate(({a, b}) => {
        const L = [...document.querySelectorAll('[data-pst="far"] [data-zf]')].map(x => x.dataset.zf);
        return {a: L.includes(a), b: L.includes(b), n: L.length, all: farHarder(poolStats().play).length};
      }, inj);
      if (!far.a || far.b || far.n !== far.all) fails.push(`${w}px Difficulty: far harder than their genus ${JSON.stringify(far)}`);
      // Its own threshold: shown when the answers filter leaves no photo too (Codex review #682).
      const empty = await p.evaluate(a => {
        const m = SF.min;
        SF.min = 1e6;
        render();
        const r = {
          far: [...document.querySelectorAll('[data-pst="far"] [data-zf]')].some(x => x.dataset.zf === a),
          note: !!document.querySelector('#view .note')
        };
        SF.min = m;
        render();
        return r;
      }, inj.a);
      if (!empty.far || !empty.note) fails.push(`${w}px Difficulty: far harder with an empty filter ${JSON.stringify(empty)}`);
      await go('photos/stats/overview');
      const cnt = await p.evaluate(g => {
        const r = [...document.querySelectorAll('[data-pov="rated"] tbody tr')].find(x => x.children[0].innerText.trim() === g);
        return r ? Number(r.children[5].innerText.trim() || 0) : -1;
      }, inj.g);
      if (cnt < 1) fails.push(`${w}px Overview: the far harder photo is not counted on ${inj.g}'s row (${cnt})`);
      await p.evaluate(({a, b}) => (delete STATS[a], delete STATS[b], render()), inj);
    }
    if (once) {
      // Once: comparison-only and its Undo, the Photo list's move.
      // A photo in play and a candidate sent to Not this genus › Look-alike comparison (curation out 'cmp') leave their genus
      // for no other one: they move to the Comparison only row, once each, and the total stays (Codex review #430: they fell
      // out of the inventory). Two Undo steps put them back.
      const poolRows = () =>
        p.evaluate(() =>
          Object.fromEntries(
            [...document.querySelectorAll('[data-pov="pool"] tbody tr')].map(r => [
              r.children[0].innerText.trim(),
              Number(r.children[1].innerText)
            ])
          )
        );
      const cm0 = await poolRows(),
        cmp = await p.evaluate(() => {
          const n = [...GAME].find(m => covOf(m, 'wide').L.some(x => !x.from && !x.cand) && pending(m).some(x => !x.from)),
            f = covOf(n, 'wide').L.find(x => !x.from && !x.cand).f,
            c = pending(n).find(x => !x.from);
          ACT.out(n, f, null, 'cmp');
          ACT.out(n, c.f, null, 'cmp');
          return {n, f, c: c.f, rej: rejected(c.f)};
        });
      await settle();
      const cm1 = await poolRows();
      if (
        cm1.Total !== cm0.Total ||
        cm1['Comparison only'] !== cm0['Comparison only'] + 2 ||
        cm1['In play'] !== cm0['In play'] - 1 ||
        cm1[cmp.rej ? 'Rejected' : 'Candidates'] !== cm0[cmp.rej ? 'Rejected' : 'Candidates'] - 1
      )
        fails.push(`${w}px Overview: comparison only ${JSON.stringify({cmp, before: cm0, after: cm1})}`);
      await p.evaluate(() => (undo(), undo()));
      await settle();
      const cm2 = await poolRows();
      if (JSON.stringify(cm2) !== JSON.stringify(cm0)) fails.push(`${w}px Overview: undo of comparison only ${JSON.stringify(cm2)}`);
      // Photo list moved to Photo review (By difficulty) and kept its address; the Photo stats tab opens on Overview, also
      // in a browser that remembered Photo list as its view.
      const mv = await p.evaluate(() => ({
        diff: tabOf('photos/review/by-difficulty')[1],
        diffs: tabOf('photos/stats/difficulty')[1],
        first: TABS.find(t => t[0] === 'photos/stats')[2][0][0]
      }));
      if (mv.diff !== 'Photo review' || mv.diffs !== 'Photo stats' || mv.first !== 'photos/stats/overview')
        fails.push(`${w}px Photo stats tabs: ${JSON.stringify(mv)}`);
      await p.evaluate(() =>
        store.set('reefid-admin-nav-tab', {...store.get('reefid-admin-nav-tab', {}), 'photos/stats': 'photos/review/by-difficulty'})
      );
      await go('photos/review/quality');
      const ps = await p.evaluate(() =>
        [...document.querySelectorAll('#subnav .adm-subtabs a')].find(a => /Photo stats/.test(a.textContent)).getAttribute('href')
      );
      if (ps !== '#photos/stats/overview') fails.push(`${w}px Photo stats: a remembered Photo list view opens ${ps}, not Overview`);
    }
    // Health (To do: is something wrong?) keeps what needs action, photos everyone misses and genera that don't take off;
    // Analyses › Learning › Stops has where players stop and the genus sheets opened (Pierre, 2026-11-04, one role per
    // admin page): each from the demo answers, no sideways page scroll; a photo everyone misses opens in the lightbox.
    const health = () =>
      p.evaluate(() => ({
        secs: [...document.querySelectorAll('[data-health]')].map(s => s.dataset.health).join(' '),
        rows: document.querySelectorAll('[data-health="genera"] tbody tr').length,
        // Genus sheets opened, by experience: the three bands, then the visits whose answers so far are not known (none
        // in the demo) and All.
        sheets: [...document.querySelectorAll('[data-health="sheets"] tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
        wide: document.documentElement.scrollWidth - innerWidth
      }));
    await go('inbox/todo/health');
    // Every account counts (Pierre, 2026-11-04): no "Without me", "Others / Me" or "This is also me" anywhere.
    if (await p.$('[data-sf="elo"], [data-sf="who"], [data-ume]')) fails.push(`${w}px Health: a filter on your own answers is back`);
    {
      const hs = await health();
      if (hs.secs !== 'photos genera' || !hs.rows) fails.push(`${w}px Health: sections ${JSON.stringify(hs)}`);
      if (hs.wide > 0) fails.push(`${w}px Health: page ${hs.wide} px wider than the window`);
    }
    await go('analyses/learning/stops');
    {
      await p
        .waitForFunction(() => /Over 300/.test((document.querySelector('[data-health="sheets"]') || {}).innerText || ''), null, {
          timeout: 10000
        })
        .catch(() => {});
      const hs = await health();
      if (hs.secs !== 'stop sheets') fails.push(`${w}px Stops: sections ${JSON.stringify(hs)}`);
      if (hs.wide > 0) fails.push(`${w}px Stops: page ${hs.wide} px wider than the window`);
      if (hs.sheets.join(' | ') !== SHEETS_ALL) fails.push(`${w}px Stops genus sheets: ${JSON.stringify(hs.sheets)}`);
    }
    // Fish admin at parity (Pierre, 2026-11-08: "j'ai besoin d'avoir les outils pour pouvoir continuer d'avancer"): Stops
    // and Health follow the Corals | Fish switch (rule A4). With the demo's fish answers (the script of today: its three
    // fish players), Stops counts the fish players, names the fish units in their own column and counts the fish sheets
    // opened; Health lists every unit of the fish slate and every fish genus answered by name, nothing of the corals'.
    // Once, at 1280 and 360 px.
    if (once) {
      const VER = Number(/const VERSION = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'tools/sync/Code.gs'), 'utf8'))[1]);
      for (const vw of [1280, 360]) {
        const fc = await b.newContext({viewport: {width: vw, height: 900}, serviceWorkers: 'block'});
        await fc.route(
          u => !u.href.startsWith(base),
          r => r.abort()
        );
        const fq = await fc.newPage(),
          fe = [];
        fq.on('pageerror', e => fe.push(e.message));
        await fq.goto(base + `admin.html?demo&v=${VER}#fish/analyses/learning/stops`);
        await fq
          .waitForFunction(
            () =>
              cur === 'analyses/learning/stops' &&
              FISHA &&
              /Players/.test((document.querySelector('.adm-kpis') || {}).textContent || '') &&
              /\d/.test((document.querySelector('[data-health="sheets"] tbody') || {}).textContent || ''),
            null,
            {timeout: 90000}
          )
          .catch(() => fe.push('Stops not drawn'));
        const st = await fq.evaluate(() => {
          const V = document.getElementById('view'),
            k = [...document.querySelectorAll('.adm-kpis > *')].map(e => e.textContent);
          return {
            players: (k.find(t => /Players/.test(t)) || '').replace(/\D/g, ''),
            want: String(new Set(rowsOf().map(r => r[0])).size),
            sheets: (document.querySelector('[data-health="sheets"] h3') || {}).textContent || '',
            last: [...V.querySelectorAll('[data-health="stop"] th')].map(e => e.textContent),
            // the subject's words for its units (admin.js stopWord: SUBJECTS analyses one, else one)
            word: stopWord(ASUBJ),
            ids: (V.textContent.match(/\b[fgs]:[A-Z]\w*/g) || []).slice(0, 3),
            open: document.querySelectorAll('[data-health="sheets"] tbody tr').length,
            wide: document.documentElement.scrollWidth - innerWidth
          };
        });
        if (
          st.want === '0' ||
          st.players !== st.want ||
          st.sheets !== 'Family, genus and species sheets opened' ||
          !/^Family/.test(st.word) ||
          !st.last.includes(st.word) ||
          st.ids.length ||
          !st.open ||
          st.wide > 0
        )
          fe.push(`Stops ${JSON.stringify(st)}`);
        await fq.evaluate(() => (location.hash = '#fish/inbox/todo/health'));
        await fq
          .waitForFunction(() => cur === 'inbox/todo/health' && document.querySelector('[data-health="genera"] tbody tr'), null, {
            timeout: 60000
          })
          .catch(() => fe.push('Health not drawn'));
        const hl = await fq.evaluate(() => {
          const V = document.getElementById('view');
          return {
            h3: [...V.querySelectorAll('h3')].map(e => e.textContent.replace(/\s*\d+$/, '')),
            rows: V.querySelectorAll('[data-health="genera"] tbody tr').length,
            // its slate (the families) and the scientific genera its answers met (g:Chromis), one row each
            slate:
              FISHA.slate.length +
              new Set(
                rowsOf()
                  .map(r => r[2])
                  .filter(u => typeof u === 'string' && u.startsWith(ASUBJ.sheets.genus) && !FISHA.slate.includes(u))
              ).size,
            head: (V.querySelector('[data-health="genera"] th') || {}).textContent || '',
            want: [stopWord(ASUBJ), `Photos everyone misses | ${manyWord(ASUBJ)} that don't take off`],
            ids: (V.textContent.match(/\b[fgs]:[A-Z]\w*/g) || []).slice(0, 3),
            coral: V.querySelectorAll('[data-health="photos"] .adm-htile').length,
            wide: document.documentElement.scrollWidth - innerWidth
          };
        });
        if (
          !/^Families/.test(hl.want[1].split(' | ')[1]) ||
          hl.h3.join(' | ') !== hl.want[1] ||
          hl.rows !== hl.slate ||
          hl.head !== hl.want[0] ||
          hl.ids.length ||
          hl.coral ||
          hl.wide > 0
        )
          fe.push(`Health ${JSON.stringify(hl)}`);
        if (fe.length) fails.push(`${vw}px Fish Stops and Health: ${fe.slice(0, 4).join(' | ')}`);
        await fc.close();
      }
      // Fish admin at parity, the next step: Analyses › Learning › Answer log and Analyses › Difficulty › Pairs follow the
      // Corals | Fish switch (rule A4). The demo's fish answers are family questions picked from choices; a few genus
      // questions, typed answers and a mix-up of two genera of one family are added to its log (as the fresh Health block
      // below does). The Answer log: the fish players and answers only, the families and genera by name (an IMR sub-entry
      // with its IMR name), the questions on each rank and typed against picked, no Elo column (the sheet sends the corals'
      // levels), no compare page; Pairs: the two genera start as look-alikes, the fish photos and observations, the typed
      // mix-ups apart; no raw unit id, no coral genus, no sideways scroll. Once, at 1280 and 390 px.
      for (const vw of [1280, 390]) {
        const VER = Number(/const VERSION = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'tools/sync/Code.gs'), 'utf8'))[1]),
          fc = await b.newContext({viewport: {width: vw, height: 900}, serviceWorkers: 'block'});
        await fc.route(
          u => !u.href.startsWith(base),
          r => r.abort()
        );
        const fq = await fc.newPage(),
          fe = [];
        fq.on('pageerror', e => fe.push(e.message));
        await fq.goto(base + `admin.html?demo&v=${VER}#fish/analyses/learning/answer-log`);
        await fq
          .waitForFunction(
            () => cur === 'analyses/learning/answer-log' && FISHA && ANS && document.querySelector('#view .adm-scard'),
            null,
            {
              timeout: 90000
            }
          )
          .catch(() => fe.push('Answer log not drawn'));
        const ok = await fq.evaluate(() => {
          const R = rowsOf(),
            ids = [...new Set(R.map(r => r[0]))].slice(0, 2),
            ph = Object.keys(FISHA.ph),
            add = [];
          if (!R.length || ids.length < 2) return false;
          let t = Date.now() - 300 * 60e3;
          const mk = (id, shown, ans, right, mode, ch) =>
            Object.assign([...R[0]], {0: id, 1: (t += 1000), 2: shown, 3: ans, 4: right, 5: mode, 6: ph[add.length % ph.length], 10: ch});
          ids.forEach(id => {
            for (let i = 0; i < 6; i++)
              add.push(
                mk(
                  id,
                  'g:Amphiprion',
                  i % 2 ? 'g:Amphiprion' : 'g:Chromis',
                  i % 2,
                  'quiz',
                  'g:Amphiprion g:Chromis g:Dascyllus g:Pomacentrus'
                )
              );
            for (let i = 0; i < 4; i++) add.push(mk(id, 'g:Chromis', i % 3 ? 'g:Chromis' : 'g:Pomacentrus', i % 3 ? 1 : 0, 'quiz|t', ''));
          });
          ANS = {...ANS, all: [...(ANS.all || ANS.rows || []), ...add]};
          render();
          return true;
        });
        if (!ok) fe.push('no fish answers in the demo');
        const seen = () =>
          fq.evaluate(() => {
            const V = document.getElementById('view');
            return {
              h3: [...V.querySelectorAll('.adm-scard h3')].map(h => h.textContent.trim()),
              cond: [...V.querySelectorAll('.adm-scard')]
                .filter(x => /^Conditions/.test(x.textContent))
                .map(x => [...x.querySelectorAll('td:first-child')].map(td => td.textContent))
                .flat(),
              th: [...V.querySelectorAll('th')].map(e => e.textContent.trim()),
              players: ([...document.querySelectorAll('.adm-kpis > *')].find(e => /Players/i.test(e.textContent)) || {}).textContent || '',
              want: String(new Set(rowsOf().map(r => r[0])).size),
              imr: [...V.querySelectorAll('td small')].map(e => e.textContent),
              // an IMR sub-entry's tag (fishAdmin imr): its IMR name, after the organisation's short name (core.js ORG)
              imrWant: FISHA.imr['g:Amphiprion'] ? ORG.short + ' ' + FISHA.imr['g:Amphiprion'] : '',
              cmp: V.querySelectorAll('a[href*="cmp-"]').length,
              ids: (V.textContent.match(/\b[fgs]:[A-Z]\w*/g) || []).slice(0, 3),
              coral: Object.keys(DATA.gen)
                .filter(g => new RegExp(`\\b${g}\\b`).test(V.textContent))
                .slice(0, 3),
              pair: [...V.querySelectorAll('tr')]
                .filter(tr => /Amphiprion · Chromis/.test(tr.textContent))
                .map(tr => tr.cells[1].textContent),
              zo: V.querySelectorAll('[data-zo]').length,
              wide: document.documentElement.scrollWidth - innerWidth
            };
          });
        const lg = await seen();
        if (
          lg.h3.join(' | ') !== 'Learning curve | Calibration | Conditions | Families and genera | Mix-ups' ||
          ['Family questions', 'Genus questions', 'Typed', 'From choices'].some(c => !lg.cond.includes(c)) ||
          lg.cond.some(c => /view|corallites/i.test(c)) ||
          lg.th.includes('Elo') ||
          !lg.players.includes(lg.want) ||
          !lg.imrWant ||
          !lg.imr.includes(lg.imrWant) ||
          lg.cmp ||
          lg.ids.length ||
          lg.coral.length ||
          lg.wide > 0
        )
          fe.push(`Answer log ${JSON.stringify(lg)}`);
        await fq.evaluate(() => (location.hash = '#fish/analyses/difficulty/pairs'));
        await fq
          .waitForFunction(() => cur === 'analyses/difficulty/pairs' && document.querySelector('#view .adm-scard'), null, {timeout: 60000})
          .catch(() => fe.push('Pairs not drawn'));
        const pr = await seen();
        if (
          pr.h3.join(' | ') !== 'Pairs | Photos | Observations | Species | Typed' ||
          pr.pair.join() !== 'Look-alike' ||
          !pr.zo ||
          pr.cmp ||
          pr.ids.length ||
          pr.coral.length ||
          pr.wide > 0
        )
          fe.push(`Pairs ${JSON.stringify(pr)}`);
        // a fish photo enlarges alone, its family named in the caption
        else {
          await fq.click('#view [data-zo]');
          const lb = await fq.evaluate(() => ({
            open: !$('lightbox').hidden,
            cap: ($('lightbox').querySelector('.lb-cap') || {}).textContent || ''
          }));
          if (!lb.open || /\b[fgs]:[A-Z]/.test(lb.cap) || !lb.cap.trim()) fe.push(`a photo enlarged ${JSON.stringify(lb)}`);
        }
        if (fe.length) fails.push(`${vw}px Fish Answer log and Pairs: ${fe.slice(0, 4).join(' | ')}`);
        await fc.close();
      }
      // A fresh admin session straight to fish Health (Codex review #800): a candidate photo everyone misses keeps its Not
      // this, the family pages' data (fishLoad, FISHC) read for it as Reports does. The fish auto-sort, which would read them
      // at load, is kept out (suggest.json without its fish part), so nothing else has read them before Health. With 25
      // photos everyone misses (24 shown: statsHealth MAXPH), one Removed leaves the list and the 25th comes in.
      {
        const VER = Number(/const VERSION = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'tools/sync/Code.gs'), 'utf8'))[1]),
          fc = await b.newContext({viewport: {width: 1280, height: 900}, serviceWorkers: 'block'});
        await fc.route(
          u => !u.href.startsWith(base),
          r => r.abort()
        );
        await fc.route(
          u => u.pathname === '/suggest.json',
          async r => {
            const j = await (await r.fetch()).json();
            delete j.fish;
            await r.fulfill({json: j});
          }
        );
        const fq = await fc.newPage(),
          fe = [];
        fq.on('pageerror', e => fe.push(e.message));
        await fq.goto(base + `admin.html?demo&v=${VER}#fish/inbox/todo/health`);
        await fq
          .waitForFunction(
            () => cur === 'inbox/todo/health' && FISHA && ANS && document.querySelector('[data-health="genera"] tbody tr'),
            null,
            {
              timeout: 90000
            }
          )
          .catch(() => fe.push('Health not drawn'));
        // three players miss a candidate photo in play (fish-cand.json and the fish photos) three times each, first in the
        // list, and 24 other fish photos twice each
        const pre = await fq.evaluate(async () => {
          const was = !!FISHC,
            C = await fetch('fish-cand.json').then(r => r.json()),
            cf = new Set(Object.values(C.cand || {}).flatMap(L => L.map(x => x.f))),
            D = DRAFT.fish || {},
            open = Object.keys(FISHA.ph).filter(x => !['exclude', 'out', 'seen'].some(k => (D[k] || {})[x])),
            f = open.find(x => cf.has(x)),
            more = open.filter(x => x !== f).slice(0, 24),
            r0 = rowsOf()[0];
          if (!f || !r0 || more.length < 24) return {was, f, r0: !!r0};
          let t = Date.now() - 600 * 60e3;
          const add = ['nt1', 'nt2', 'nt3'].flatMap(id =>
            [f, f, f, ...more.flatMap(x => [x, x])].map(x =>
              Object.assign([...r0], {0: id, 1: (t += 1000), 2: FISHA.ph[x].entry, 4: 0, 6: x})
            )
          );
          ANS = {...ANS, all: [...(ANS.all || ANS.rows || []), ...add]};
          render();
          return {was, f, r0: true};
        });
        if (pre.was || !pre.f || !pre.r0) fe.push(`not a fresh session with a candidate photo: ${JSON.stringify(pre)}`);
        else
          await fq
            .waitForFunction(f => document.querySelector(`[data-health="photos"] [data-f="${CSS.escape(f)}"] [data-fu="not"]`), pre.f, {
              timeout: 60000
            })
            .catch(async () =>
              fe.push(
                `no Not this on ${pre.f}: ${JSON.stringify(
                  await fq.evaluate(f => ({fishc: !!FISHC, tile: !!document.querySelector(`[data-f="${CSS.escape(f)}"]`)}), pre.f)
                )}`
              )
            );
        if (!fe.length) {
          const shown = () => fq.evaluate(() => [...document.querySelectorAll('[data-health="photos"] .adm-ftile')].map(e => e.dataset.f)),
            S0 = await shown(),
            gone = S0.find(x => x !== pre.f);
          if (S0.length !== 24 || !/\+1 more/.test(await fq.textContent('[data-health="photos"]')))
            fe.push(`25 photos everyone misses: ${S0.length} shown`);
          else {
            await fq.click(`[data-health="photos"] [data-f="${gone}"] [data-fu="remove"]`);
            await fq
              .waitForFunction(
                ([g, L]) => {
                  const F = [...document.querySelectorAll('[data-health="photos"] .adm-ftile')].map(e => e.dataset.f);
                  return F.length === 24 && !F.includes(g) && F.some(x => !L.includes(x));
                },
                [gone, S0],
                {timeout: 15000}
              )
              .catch(async () => fe.push(`after Remove on ${gone}: ${JSON.stringify(await shown())}`));
          }
        }
        if (fe.length) fails.push(`1280px Fish Health, fresh session: ${fe.slice(0, 4).join(' | ')}`);
        await fc.close();
      }
    }
    // Activity's analysis cards are on Analyses › Learning › Answer log, and only there (one role per admin page).
    {
      const cards = () => p.evaluate(() => [...document.querySelectorAll('#view .adm-scard h3')].map(h => h.textContent.trim()));
      const ANALYSIS_CARDS = ['Learning curve', 'Calibration', 'Conditions', 'Genera', 'Mix-ups'];
      await go('analyses/learning/answer-log');
      const lg = await cards();
      if (ANALYSIS_CARDS.some(t => !lg.includes(t)) || lg.some(t => /^Recent sessions|^Activity over time/.test(t)))
        fails.push(`${w}px Answer log: cards ${JSON.stringify(lg)}`);
      await go('players/activity');
      const ac = await cards();
      if (
        ANALYSIS_CARDS.some(t => ac.includes(t)) ||
        !ac.some(t => /^Recent sessions/.test(t)) ||
        !ac.some(t => /^Activity over time/.test(t))
      )
        fails.push(`${w}px Activity: cards ${JSON.stringify(ac)}`);
    }
    // Players › Visits (Pierre, 2026-11-08, Q301-Q304; admin-visits.js, the demo's visits in admin-demo.js): every card,
    // no sideways scroll, the demo's numbers under the default filters (every subject, 30 days, Without a game, Everyone,
    // every device), at both widths; one page for both subjects (Pierre, 2026-11-09: admin.js SHARED, as the list of
    // players): the switch inert, both subjects' visits each marked with its subjects, a page of each subject its own row,
    // #fish/players/visits landing on #players/visits; once, the filters (Subject among them), a visitor unfolded, Show
    // all and the help.
    {
      const vis = () =>
        p.evaluate(() => ({
          cards: [...document.querySelectorAll('#view [data-visits]')]
            .map(x => x.dataset.visits + (x.dataset.vkey ? ':' + x.dataset.vkey : ''))
            .join(' '),
          hash: location.hash,
          off: document.getElementById('subj').classList.contains('off'),
          // The subjects marked on the visitors' rows, and the pages marked with the fish's icon.
          marks: [...document.querySelectorAll('[data-vopen] .adm-vsjs')].map(m =>
            [...m.querySelectorAll('.adm-vsj')].map(x => x.title).join('+')
          ),
          fishPages: [...document.querySelectorAll('[data-visits="pages"] tbody tr')]
            .filter(r => r.querySelector('.adm-vsj[title="Fish"]'))
            .map(r => r.cells[0].textContent.trim()),
          // textContent: the tiles' labels are upper case by CSS only
          kpis: [...document.querySelectorAll('.adm-vis .adm-kpis > div')].map(d => d.textContent.replace(/\s+/g, ' ').trim()).join(' | '),
          rows: document.querySelectorAll('[data-vopen]').length,
          open: document.querySelectorAll('.adm-vdet').length,
          legend: !!document.querySelector('[data-visits="time"] .adm-legend'),
          stack: document.querySelectorAll('[data-visits="time"] i.adm-vgame').length,
          pages: (document.querySelector('[data-visits="pages"]') || {}).textContent || '',
          dev: [...document.querySelectorAll('[data-visits="device"] tbody tr')].map(r => r.textContent.replace(/\s+/g, ' ').trim()),
          wide: document.documentElement.scrollWidth - innerWidth
        }));
      // Reached from the fish side by its old address: the shared page, no prefix, the switch inert, the fish side kept.
      await go('fish/players/visits');
      const v0 = await vis();
      if (v0.hash !== '#players/visits' || !v0.off) fails.push(`${w}px Visits: #fish/players/visits at ${v0.hash}, switch inert ${v0.off}`);
      if (v0.cards !== 'time pages key:coral key:fish sheets first device visitors') fails.push(`${w}px Visits: cards ${v0.cards}`);
      // Both subjects' visits, some only the corals', some only the fish's (Ana's in both, with a game: below); the fish's
      // pages their own rows.
      if (!v0.marks.includes('Corals') || !v0.marks.includes('Fish'))
        fails.push(`${w}px Visits: the visitors' subjects ${JSON.stringify(v0.marks)}`);
      if (!v0.fishPages.includes('Fish ID Key') || !v0.fishPages.includes('Families') || !/Coral ID Key/.test(v0.pages))
        fails.push(`${w}px Visits: the pages of each subject ${JSON.stringify(v0.fishPages)}`);
      if (v0.wide > 0) fails.push(`${w}px Visits: page ${v0.wide} px wider than the window`);
      // The players' part's actions at 1280, when it ran before this (a whole run; not SMOKE_PART=main), leave one more
      // visitor of the demo without an answer (a merge, the answers of devices deleted).
      const never = once && run.has('players') ? 14 : 13;
      if (v0.kpis !== `46of 75Visits without a game | 17Visitors | ${never}Never answered | 8 minMedian visit | 54%On a phone`)
        fails.push(`${w}px Visits: numbers ${v0.kpis}`);
      if (v0.rows !== 12 || v0.open || v0.legend || v0.stack) fails.push(`${w}px Visits: ${JSON.stringify({...v0, pages: ''})}`);
      if (!/Coral ID Key/.test(v0.pages) || !/Tools › anatomy/.test(v0.pages) || /Quiz|Duels/.test(v0.pages))
        fails.push(`${w}px Visits: pages opened without a game ${v0.pages}`);
      // Q304: three device classes, the iPad (a computer's browser 820 px wide) and the Android tablet among the tablets.
      if (
        !v0.dev.some(t => /^Tablet/.test(t)) ||
        !v0.dev.some(t => /^Phone, installed app/.test(t)) ||
        !v0.dev.some(t => /^Computer/.test(t))
      )
        fails.push(`${w}px Visits: devices ${JSON.stringify(v0.dev)}`);
      if (once) {
        const click = async (f, v) => {
          errs.length = 0;
          await p.click(`[data-vf="${f}"][data-v="${v}"]`);
          await settle();
          if (errs.length) fails.push(`${w}px Visits ${f}=${v}: ${errs.slice(0, 3).join(' | ')}`);
          return vis();
        };
        const va = await click('vis', 'all');
        if (!/^75Visits \| 23Visitors/.test(va.kpis) || !va.legend || !va.stack || !/Quiz/.test(va.pages))
          fails.push(`${w}px Visits, All visits: ${va.kpis} legend ${va.legend} stacked ${va.stack}`);
        const vn = await click('who', 'never');
        // Only those who never answered: every visitor is one.
        if (!/^[1-9]\d*Visits \| (\d+)Visitors \| \1Never answered/.test(vn.kpis)) fails.push(`${w}px Visits, Never answered: ${vn.kpis}`);
        const vt = await click('dev', 'tablet');
        if (!/^\d+Visits \| [1-9]\d*Visitors/.test(vt.kpis) || !vt.dev.every(t => /^Tablet/.test(t)))
          fails.push(`${w}px Visits, Tablet: ${vt.kpis} ${JSON.stringify(vt.dev)}`);
        await click('dev', 'all');
        await click('who', 'all');
        const vw = await click('by', 'week');
        if (vw.wide > 0) fails.push(`${w}px Visits by week: page ${vw.wide} px wider than the window`);
        await click('vis', 'nogame');
        await p.click('[data-vopen]');
        await settle();
        const vo = await vis();
        if (vo.open !== 1 || vo.wide > 0) fails.push(`${w}px Visits: a visitor unfolded ${JSON.stringify({open: vo.open, wide: vo.wide})}`);
        await p.click('[data-vall]');
        await settle();
        const vs = await vis();
        if (vs.rows !== 17) fails.push(`${w}px Visits: Show all lists ${vs.rows} visitors, not 17`);
        // A visitor's name opens their Journey.
        const jl = await p.$eval('[data-visits="visitors"] a[href^="#players/list/"]', a => a.getAttribute('href')).catch(() => '');
        if (!jl) fails.push(`${w}px Visits: no Journey link`);
        // Subject: Fish alone, its visits with its own pages in its words, its Key, no genus sheets, no page marked (one
        // subject); on All visits Ana's visit in both, marked with both; the corals alone as the page was per subject.
        const vf = await click('subj', 'fish');
        if (
          !/^\d+of \d+Visits without a game \| 2Visitors \| 2Never answered/.test(vf.kpis) ||
          vf.cards !== 'time pages key:fish first device visitors' ||
          !/Families/.test(vf.pages) ||
          vf.fishPages.length ||
          vf.hash !== '#players/visits' ||
          !vf.off
        )
          fails.push(`${w}px Visits, Fish: ${vf.kpis} ${vf.cards} ${vf.pages} ${vf.hash}`);
        const vfa = await click('vis', 'all');
        if (!/^5Visits \| 3Visitors/.test(vfa.kpis) || !vfa.marks.includes('Corals+Fish'))
          fails.push(`${w}px Visits, Fish, All visits: ${vfa.kpis} ${JSON.stringify(vfa.marks)}`);
        // Every visitor's Journey link names the subject filtered (Codex review #836), whatever side the switch is on.
        const fl = await p.$$eval('[data-visits="visitors"] a[href*="players/list/"]', L =>
          L.map(a => [a.getAttribute('href'), a.hasAttribute('data-own')])
        );
        if (!fl.length || fl.some(([h, o]) => !h.startsWith('#fish/players/list/') || !o))
          fails.push(`${w}px Visits, Fish: Journey links ${JSON.stringify(fl)}`);
        const vc = await click('subj', 'coral');
        if (
          !/^71Visits \| 21Visitors/.test(vc.kpis) ||
          vc.cards !== 'time pages key:coral sheets first device visitors' ||
          /Families/.test(vc.pages)
        )
          fails.push(`${w}px Visits, Corals: ${vc.kpis} ${vc.cards}`);
        await click('subj', 'all');
        await click('vis', 'nogame');
        // Its help behind "?" (rule A2).
        await p.click('#help');
        if (await p.$('#admhelp [data-ht="page"]')) await p.click('#admhelp [data-ht="page"]');
        const ht = await p.evaluate(() => (document.getElementById('admhelp') || {}).textContent || '');
        if (!/tablet/i.test(ht) || !/a game = a Practice page/i.test(ht) || !/Subject/.test(ht))
          fails.push(`${w}px Visits: help ${ht.slice(0, 80)}`);
        await p.click('#help');
        await go('players/visits');
      }
    }
    if (once) {
      // Once: stale page summaries, the lightboxes' source links.
      // The page summaries are read again once stale (Codex review #423): a first read's error (offline, a script before
      // v30) does not stay on Stops; ↻ on Activity reads them again; and a visit reads them once at most (no
      // render / read loop).
      {
        const sheetsText = () => p.evaluate(() => (document.querySelector('[data-health="sheets"]') || {}).innerText || '');
        await p.evaluate(() => {
          window.PGREADS = 0;
          const f = window.fetch;
          window.fetch = (u, o) => {
            if (o && /"pages":1/.test(String(o.body || ''))) window.PGREADS++;
            return f(u, o);
          };
        });
        const stale = async (label, prep) => {
          await go('players/activity');
          await p.evaluate(prep);
          if (label === 'reload') {
            await p.click('[data-sload]');
            await settle();
          }
          await go('analyses/learning/stops');
          await p
            .waitForFunction(() => /Over 300/.test((document.querySelector('[data-health="sheets"]') || {}).innerText || ''), null, {
              timeout: 8000
            })
            .catch(() => {});
          await p.waitForTimeout(1500);
          const t = await sheetsText();
          if (!/Over 300/.test(t) || /Offline/.test(t)) fails.push(`${w}px Stops genus sheets after ${label}: ${t.replace(/\s+/g, ' ')}`);
        };
        await stale('a stale error', () => {
          PGS = {err: 'Offline'};
          pgsAt = Date.now() - 600000;
        });
        await stale('reload', () => {
          PGS = {err: 'Offline'};
          pgsAt = Date.now();
        });
        const n0 = await p.evaluate(() => PGREADS);
        await go('players/activity');
        await go('analyses/learning/stops');
        await p.waitForTimeout(1500);
        const reads = (await p.evaluate(() => PGREADS)) - n0;
        if (n0 !== 2 || reads) fails.push(`${w}px Stops genus sheets reads: ${n0} for two stale caches, then ${reads} on a fresh one`);
      }
      // The enlarged photo's caption links to the photo's source, as in the games (rule P5; Pierre, 2026-11-03:
      // he opened his own photo everyone misses, to check its identification on iNaturalist, and found no link): an iNat
      // photo's observation (new tab, noopener) and the genus sheet.
      const lbSrc = f =>
        p.evaluate(f => {
          const ph = PHOTOS[f],
            cap = document.querySelector('#lightbox:not([hidden]) .lb-cap');
          if (!cap) return 'no lightbox';
          if (!cap.querySelector(`code`) || cap.querySelector('code').textContent !== f) return 'caption names another photo';
          const a = [...cap.querySelectorAll('a.lb-src')];
          if (!/inaturalist\.org\/observations\//.test(ph.o || '')) return a.length ? 'a link on a photo with no iNat page' : '';
          if (a.length !== 1 || a[0].href !== ph.o) return `no link to ${ph.o}`;
          if (a[0].target !== '_blank' || !/noopener/.test(a[0].rel)) return 'source link not in a new tab with noopener';
          if (!cap.querySelector(`a[href$="#learn/genus/${encodeURIComponent(ph.genus)}"]`)) return 'genus not linked to its sheet';
          return '';
        }, f);
      await go('inbox/todo/health');
      // Health's photos everyone misses carry every tool of their genus page (Q309): the same buttons as the photo's tile there.
      const hz = '[data-health="photos"] .adm-tile [data-act="zoom"]';
      if (!(await p.$(hz))) fails.push(`${w}px Health: no photo everyone misses with its genus page's tile`);
      else {
        const ht = await p.evaluate(() => {
          const t = document.querySelector('[data-health="photos"] .adm-tile[data-g]'),
            acts = el =>
              [...el.querySelectorAll('[data-act], .adm-qseg [data-q], .adm-fseg [data-fm]')]
                .map(x => x.dataset.act || 'q')
                .sort()
                .join();
          return t && {f: t.dataset.f, g: t.dataset.g, acts: acts(t), n: !!t.querySelector('.adm-hnum')};
        });
        await go('photos/genera/live/' + encodeURIComponent(ht.g));
        const gt = await p.evaluate(f => {
          const t = document.querySelector(`.adm-tile[data-f="${CSS.escape(f)}"]`);
          return (
            t &&
            [...t.querySelectorAll('[data-act], .adm-qseg [data-q], .adm-fseg [data-fm]')]
              .map(x => x.dataset.act || 'q')
              .sort()
              .join()
          );
        }, ht.f);
        if (!ht.n || !gt || gt !== ht.acts)
          fails.push(`${w}px Health: a photo's tools differ from its genus page ${JSON.stringify({ht, gt})}`);
        await go('inbox/todo/health');
        await p.click(hz);
        if (await p.evaluate(() => document.getElementById('lightbox').hidden)) fails.push(`${w}px Health: a photo click opened nothing`);
        else {
          const e = await lbSrc(await p.$eval(hz, b => b.closest('[data-f]').dataset.f));
          if (e) fails.push(`${w}px Health lightbox: ${e}`);
        }
        await p.keyboard.press('Escape');
      }
      // Both admin lightboxes (zoom: a genus's photos; zoomOne: Excluded, Flags, Candidates, auto-sort), on Pierre's photo
      // of the report and a candidate.
      for (const [how, f] of await p.evaluate(() => {
        const own = 'lobactis-medium-746236519',
          cand = Object.values(DATA.cand).flat()[0];
        return [
          ['zoom', PHOTOS[own] ? own : Object.values(PHOTOS).find(x => x.own).f],
          ['zoomOne', cand.f]
        ];
      })) {
        await p.evaluate(([how, f]) => (how === 'zoom' ? zoom(PHOTOS[f].genus, f) : zoomOne(PHOTOS[f])), [how, f]);
        const e = await lbSrc(f);
        if (e) fails.push(`${w}px Lightbox (${how}, ${f}): ${e}`);
        await p.keyboard.press('Escape');
      }
    }
    if (errs.length) fails.push(`${w}px Health: ${errs.slice(0, 3).join(' | ')}`);

    // The photos' part (SMOKE_ONLY=photos), once, at 1280: a function, run here in a whole run, or alone right after the page
    // opens (above).
    async function photosPart() {
      // Once: Growth form, game genera, Candidates, the cap, judgments, the pre-sort, the auto-sort, retests, the fish auto-sort, Publish.
      // Photo review › Light proposals (admin-light.js; Pierre, 2026-11-14): in a context of its own, three proposals of
      // judging/fish-light-q308.json, Pierre's published fish part holding their earlier tags and ease. The view lists
      // them (in the switch), Accept one and Undo, Keep mine, Accept all (the view leaves the switch, the page says so),
      // Undo brings them back, then Publish: its summary counts them, and the published fish part carries them.
      {
        const LP = rd('judging/fish-light-q308.json').curation.slice(0, 3),
          fishFix = {
            add: Object.fromEntries(LP.map(x => [x.photo, /^fish-(s\d+)-/.exec(x.photo)[1]])),
            tags: Object.fromEntries(LP.map(x => [x.photo, x.curated[0]])),
            ease: Object.fromEntries(LP.map(x => [x.photo, x.curated[1]]))
          };
        const lc = await b.newContext({viewport: {width: 1280, height: 900}, serviceWorkers: 'block'});
        await lc.route(
          u => !u.href.startsWith(base),
          r => r.abort()
        );
        await lc.route(
          u => u.href.startsWith(base) && u.pathname === '/judging/fish-light-q308.json',
          r => r.fulfill({contentType: 'application/json', body: JSON.stringify({curation: LP})})
        );
        await lc.route(
          u => u.href.startsWith(base) && u.pathname === '/curation.json',
          r => r.fulfill({contentType: 'application/json', body: JSON.stringify({...CUR, fish: fishFix})})
        );
        const lq = await lc.newPage(),
          le = [],
          dlg = [];
        lq.on('pageerror', e => le.push(e.message));
        lq.on('dialog', d => (dlg.push(d.message()), d.accept()));
        const lst = () =>
          lq.evaluate(() => ({
            tiles: [...document.querySelectorAll('#view .adm-lprop')].map(t => t.dataset.f),
            words: [...document.querySelectorAll('#view .adm-lprop .adm-ldiff li')].map(l => l.textContent),
            views: [...document.querySelectorAll('#subnav .adm-views a')].map(a => a.textContent),
            note: (document.querySelector('#view > .note') || {}).textContent || '',
            all: (document.querySelector('[data-lpall]') || {}).textContent || '',
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        const lwait = fn =>
          lq.waitForFunction(fn, null, {timeout: 60000}).catch(async () => le.push(`timed out: ${JSON.stringify(await lst())}`));
        await lq.goto(base + 'admin.html?demo#fish/photos/review/light-proposals');
        await lwait(() => document.querySelectorAll('#view .adm-lprop').length === 3);
        const tg = f => lq.evaluate(f => [(DRAFT.fish.tags || {})[f], (DRAFT.fish.ease || {})[f], (DRAFT.fish.kept || {})[f]], f);
        let s = await lst();
        if (s.tiles.length !== 3 || !LP.every(x => s.tiles.includes(x.photo))) le.push(`not the 3 proposals ${JSON.stringify(s)}`);
        if (
          !s.views.includes('Light proposals') ||
          s.all !== 'Accept all 3' ||
          !s.words.some(t => /^Light n night livery|^Light d dim/.test(t)) ||
          s.wide > 0
        )
          le.push(`the view ${JSON.stringify(s)}`);
        const [f0, f1] = s.tiles;
        const x0 = LP.find(x => x.photo === f0),
          x1 = LP.find(x => x.photo === f1);
        await lq.click(`.adm-lprop[data-f="${f0}"] [data-lpa]`);
        await lwait(() => document.querySelectorAll('#view .adm-lprop').length === 2);
        if (JSON.stringify(await tg(f0)) !== JSON.stringify([...x0.rejudged, undefined]))
          le.push(`Accept: ${JSON.stringify(await tg(f0))}`);
        await lq.evaluate(() => undo());
        await lwait(() => document.querySelectorAll('#view .adm-lprop').length === 3);
        if (JSON.stringify(await tg(f0)) !== JSON.stringify([...x0.curated, undefined]))
          le.push(`Undo of Accept: ${JSON.stringify(await tg(f0))}`);
        await lq.click(`.adm-lprop[data-f="${f1}"] [data-lpk]`);
        await lwait(() => document.querySelectorAll('#view .adm-lprop').length === 2);
        if (JSON.stringify(await tg(f1)) !== JSON.stringify([...x1.curated, 'q308'])) le.push(`Keep mine: ${JSON.stringify(await tg(f1))}`);
        await lq.click('[data-lpall]');
        await lwait(() => /No light proposal left/.test(document.getElementById('view').textContent));
        s = await lst();
        if (!/Accept all 2/.test(dlg.join('|')) || s.views.includes('Light proposals') || s.tiles.length)
          le.push(`Accept all ${JSON.stringify(s)}`);
        await lq.evaluate(() => undo());
        await lwait(() => document.querySelectorAll('#view .adm-lprop').length === 2);
        if (!(await lst()).views.includes('Light proposals')) le.push('Undo of Accept all: the view not back in the switch');
        await lq.click('[data-lpall]');
        await lwait(() => /No light proposal left/.test(document.getElementById('view').textContent));
        const sum = await lq.evaluate(() => pubSummary());
        if (!/^2 fish light proposals accepted$/m.test(sum) || !/^1 fish light proposal kept as it was$/m.test(sum))
          le.push(`Publish summary ${JSON.stringify(sum)}`);
        await lq.click('#save');
        await lq
          .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 15000})
          .catch(() => le.push('Publish: no "Published" toast'));
        if (!dlg.some(m => /2 fish light proposals accepted/.test(m))) le.push(`Publish's confirm ${JSON.stringify(dlg)}`);
        const pub = await lq.evaluate(() => SAVED.fish);
        if (
          (pub.kept || {})[f1] !== 'q308' ||
          LP.filter(x => x !== x1).some(x => pub.tags[x.photo] !== x.rejudged[0] || pub.ease[x.photo] !== x.rejudged[1]) ||
          pub.tags[f1] !== x1.curated[0]
        )
          le.push(`published ${JSON.stringify({kept: pub.kept, tags: LP.map(x => pub.tags[x.photo])})}`);
        if (le.length) fails.push(`Light proposals: ${le.slice(0, 4).join(' | ')}`);
        await lc.close();
      }
      // Photo review › Cover proposals (admin-covers.js; Pierre, 2026-11-14 after Q339 (b), #864): in a context of its own.
      // Pierre's published fish part first with no node cover: no proposal, the view not in the switch. Then three family
      // covers of his, each an adult photo in play the rule does not pick (found in the page, so the check follows the data):
      // three cards, Accept one and Undo, Keep mine, Accept all (the view leaves the switch), Undo, then Publish: its summary
      // counts the Keep mine, the published fish part carries the covers and the answer.
      {
        const noCov = {...CUR, fish: {...(CUR.fish || {}), genera: {}}},
          centre = rd('fish.json').centre.name;
        let curBody = JSON.stringify(noCov);
        const cc = await b.newContext({viewport: {width: 1280, height: 900}, serviceWorkers: 'block'});
        await cc.route(
          u => !u.href.startsWith(base),
          r => r.abort()
        );
        await cc.route(
          u => u.href.startsWith(base) && u.pathname === '/curation.json',
          r => r.fulfill({contentType: 'application/json', body: curBody})
        );
        const cq = await cc.newPage(),
          ce = [],
          dlg = [];
        cq.on('pageerror', e => ce.push(e.message));
        cq.on('dialog', d => (dlg.push(d.message()), d.accept()));
        const cst = () =>
          cq.evaluate(() => ({
            tiles: [...document.querySelectorAll('#view .adm-cprop')].map(t => t.dataset.n),
            why: [...document.querySelectorAll('#view .adm-cprop .adm-cwhy')].map(l => l.textContent),
            names: [...document.querySelectorAll('#view .adm-cprop .adm-cside .adm-t i')].map(l => l.textContent),
            views: [...document.querySelectorAll('#subnav .adm-views a')].map(a => a.textContent),
            note: (document.querySelector('#view > .note') || {}).textContent || '',
            all: (document.querySelector('[data-cpall]') || {}).textContent || '',
            wide: document.documentElement.scrollWidth - innerWidth
          }));
        const cwait = fn =>
          cq.waitForFunction(fn, null, {timeout: 90000}).catch(async () => ce.push(`timed out: ${JSON.stringify(await cst())}`));
        await cq.goto(base + 'admin.html?demo#fish/photos/review/cover-proposals');
        await cwait(() => /No cover proposal left/.test(document.getElementById('view').textContent));
        let s = await cst();
        if (s.views.includes('Cover proposals') || s.tiles.length) ce.push(`no cover of his: ${JSON.stringify(s)}`);
        // Three families with a default, each given as his cover an adult photo in play that is not the rule's.
        const picks = await cq.evaluate(() => {
          const out = {};
          for (const u of FISHC.units) {
            const e = fuFamM(u),
              r = fishCoverRule(e.all, DRAFT.fish, u.id, fuJ),
              p = r && e.all.find(q => q.src && fishPid(q.f) !== fishPid(r.p.f) && !fishJuv(q, fuJ(q.f), DRAFT.fish));
            if (p) out[u.id] = {cover: p.f};
            if (Object.keys(out).length === 3) break;
          }
          return out;
        });
        const ids = Object.keys(picks);
        if (ids.length !== 3) ce.push(`three families to cover: ${JSON.stringify(picks)}`);
        curBody = JSON.stringify({...noCov, fish: {...noCov.fish, genera: picks}});
        // From a sibling page: the view comes into the switch by itself once the family pages' data is read, and opens.
        await cq.goto(base + 'admin.html?demo#fish/photos/review/ease');
        await cq.reload();
        await cwait(() => [...document.querySelectorAll('#subnav .adm-views a')].some(a => a.textContent === 'Cover proposals'));
        await cq.click('#subnav .adm-views a:text-is("Cover proposals")');
        await cwait(() => document.querySelectorAll('#view .adm-cprop').length === 3);
        const cov = id => cq.evaluate(id => [(((DRAFT.fish || {}).genera || {})[id] || {}).cover, ((DRAFT.fish || {}).kept || {})[id]], id);
        s = await cst();
        if (
          ids.some(id => !s.tiles.includes(id)) ||
          !s.views.includes('Cover proposals') ||
          s.all !== 'Accept all 3' ||
          s.why.length !== 3 ||
          !s.why.every(t => t.startsWith(`Most seen near ${centre}: `) || t.startsWith(`None seen near ${centre}`)) ||
          s.names.length !== 6 ||
          s.names.some(t => !t) ||
          s.wide > 0
        )
          ce.push(`the view ${JSON.stringify(s)}`);
        const [n0, n1] = s.tiles;
        const rule0 = await cq.evaluate(n => coverOpen(coverList(), DRAFT.fish).find(x => x.id === n).rule.f, n0);
        await cq.click(`.adm-cprop[data-n="${n0}"] [data-cpa]`);
        await cwait(() => document.querySelectorAll('#view .adm-cprop').length === 2);
        if ((await cov(n0))[0] !== rule0) ce.push(`Accept: ${JSON.stringify(await cov(n0))} not ${rule0}`);
        await cq.evaluate(() => undo());
        await cwait(() => document.querySelectorAll('#view .adm-cprop').length === 3);
        if ((await cov(n0))[0] !== picks[n0].cover) ce.push(`Undo of Accept: ${JSON.stringify(await cov(n0))}`);
        await cq.click(`.adm-cprop[data-n="${n1}"] [data-cpk]`);
        await cwait(() => document.querySelectorAll('#view .adm-cprop').length === 2);
        const k1 = await cov(n1);
        if (k1[0] !== picks[n1].cover || !/^cover:\S+>\S+$/.test(k1[1] || '')) ce.push(`Keep mine: ${JSON.stringify(k1)}`);
        await cq.click('[data-cpall]');
        await cwait(() => /No cover proposal left/.test(document.getElementById('view').textContent));
        s = await cst();
        if (!/Accept all 2 cover proposals/.test(dlg.join('|')) || s.views.includes('Cover proposals') || s.tiles.length)
          ce.push(`Accept all ${JSON.stringify(s)}`);
        await cq.evaluate(() => undo());
        await cwait(() => document.querySelectorAll('#view .adm-cprop').length === 2);
        if (!(await cst()).views.includes('Cover proposals')) ce.push('Undo of Accept all: the view not back in the switch');
        await cq.click('[data-cpall]');
        await cwait(() => /No cover proposal left/.test(document.getElementById('view').textContent));
        const sum = await cq.evaluate(() => pubSummary());
        if (!/^1 fish cover proposal kept as it was$/m.test(sum)) ce.push(`Publish summary ${JSON.stringify(sum)}`);
        await cq.click('#save');
        await cq
          .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 15000})
          .catch(() => ce.push('Publish: no "Published" toast'));
        const pub = await cq.evaluate(() => SAVED.fish);
        if (
          (pub.kept || {})[n1] !== k1[1] ||
          pub.genera[n1].cover !== picks[n1].cover ||
          ids.filter(id => id !== n1).some(id => pub.genera[id].cover === picks[id].cover)
        )
          ce.push(`published ${JSON.stringify({kept: pub.kept, genera: pub.genera})}`);
        if (ce.length) fails.push(`Cover proposals: ${ce.slice(0, 4).join(' | ')}`);
        await cc.close();
      }
      // Photo review › Growth form (Pierre, 2026-11-03: he checks forms by hand to see whether the automatic detection is
      // good): the agreement line at the top; a click that keeps the dashed guess raises agreement, one that picks another
      // form lowers it, live; Guesses first puts the photos still on a guess first in each row, the unsure ones first.
      await go('photos/review/growth-form');
      const fag = () =>
        p.evaluate(() => {
          const d = document.getElementById('fagree');
          if (!d) return null;
          return {
            txt: d.querySelector('summary').innerText,
            set: +d.dataset.set,
            both: +d.dataset.both,
            ok: +d.dataset.ok,
            un: +d.dataset.un
          };
        });
      const a0 = await fag();
      if (
        !a0 ||
        !/^Your forms: \d+ set · agreement with the automatic guess: (\d+%|–) \(of \d+ where both exist\) · unsure guesses: \d+$/.test(
          a0.txt
        )
      )
        fails.push(`${w}px Growth form: agreement line ${JSON.stringify(a0)}`);
      const rate = a => (a.both ? a.ok / a.both : 0);
      // Two tiles still on a guess: the first is confirmed (its dashed form clicked), the second given another form.
      const gt = await p.evaluate(() =>
        [...document.querySelectorAll('.adm-qt')]
          .filter(t => t.querySelector('.adm-fseg.auto [data-fm][aria-pressed="true"]:not([data-fm="x"])'))
          .slice(0, 2)
          .map(t => t.dataset.f)
      );
      if (a0 && gt.length === 2) {
        const sel = f => `.adm-qt[data-f="${f}"]`;
        await p.click(`${sel(gt[0])} .adm-fseg [data-fm][aria-pressed="true"]`);
        const a1 = await fag();
        if (a1.set !== a0.set + 1 || a1.both !== a0.both + 1 || a1.ok !== a0.ok + 1 || !(rate(a1) > rate(a0) || rate(a0) === 1))
          fails.push(`${w}px Growth form: confirming a guess did not raise agreement ${JSON.stringify([a0, a1])}`);
        await p.click(`${sel(gt[1])} .adm-fseg [data-fm]:not([aria-pressed="true"]):not([data-fm="x"])`);
        const a2 = await fag();
        if (a2.both !== a1.both + 1 || a2.ok !== a1.ok || !(rate(a2) < rate(a1)))
          fails.push(`${w}px Growth form: changing a guess did not lower agreement ${JSON.stringify([a1, a2])}`);
        if (!(await p.evaluate(() => document.querySelectorAll('#fagree .adm-fag-t td.ko').length)))
          fails.push(`${w}px Growth form: the guess → yours table shows no disagreement after a change`);
        await p.evaluate(() => {
          undo();
          undo();
        });
        await settle();
        const a3 = await fag();
        if (a3.ok !== a0.ok || a3.both !== a0.both)
          fails.push(`${w}px Growth form: Undo did not bring agreement back ${JSON.stringify([a0, a3])}`);
      } else fails.push(`${w}px Growth form: fewer than 2 photos on a guess`);
      await p.check('#fgfirst');
      await settle();
      const gord = await p.evaluate(() =>
        [...document.querySelectorAll('.adm-qgrid')].map(g =>
          [...g.querySelectorAll('.adm-fseg')].map(s => (!s.classList.contains('auto') ? 2 : s.classList.contains('unsure') ? 0 : 1))
        )
      );
      const badRow = gord.findIndex(R => R.some((r, i) => i && r < R[i - 1]));
      if (badRow >= 0) fails.push(`${w}px Growth form › Guesses first: row ${badRow} not guesses first, unsure first`);
      if (!gord.some(R => R.length && R[0] < 2 && R.includes(2)))
        fails.push(`${w}px Growth form › Guesses first: no row with guesses before your forms`);
      await p.uncheck('#fgfirst');
      await settle();

      // Game genera first (Pierre, 2026-11-03; core.js gameOf): Game coverage lists every genus a game asks, Millepora and
      // the bonus genera included; in Candidates no Key-only genus comes before a game genus of the same source, none
      // is proposed for Corallites, and a Key-only genus is full at CAP.sheet colonies.
      await go('inbox/coverage/games');
      const gq = await p.evaluate(() => {
        const rows = [...document.querySelectorAll('.cov-t tbody tr')].map(tr => tr.dataset.g),
          game = gameOf(DATA),
          fo = Object.keys(DATA.x.gen).filter(n => !isGame(n)),
          order = {};
        ['dauin', 'ph', 'all'].forEach(s => {
          const Q = candQueue(s);
          order[s] = [Q.findIndex(x => !isGame(x.n)), Q.map(x => isGame(x.n)).lastIndexOf(true), Q.length];
        });
        return {
          rows: rows.slice().sort().join() === game.slice().sort().join(),
          mill: rows.includes('Millepora') && BONUS.every(n => rows.includes(n)),
          fo: fo.length,
          order,
          macro: candQueue('all').filter(x => !isGame(x.n) && cellView(x.n, x.p) === 'macro' && lv(x.n) !== 2).length,
          cap: fo.every(n => capOf(n) === CAP.sheet) && game.every(n => capOf(n) === CELL_MAX)
        };
      });
      if (!gq.rows || !gq.mill) fails.push(`${w}px Game coverage: rows are not the game genera (Millepora and bonus: ${gq.mill})`);
      if (!gq.fo) fails.push(`${w}px Game genera: no Key-only genus in the data`);
      Object.entries(gq.order).forEach(([s, [first, lastGame, n]]) => {
        if (first >= 0 && first < lastGame)
          fails.push(`${w}px Candidates ${s}: a Key-only genus at ${first}, before a game genus at ${lastGame} (${n})`);
      });
      if (gq.macro) fails.push(`${w}px Candidates: ${gq.macro} Corallites candidates for Key-only genera`);
      if (!gq.cap) fails.push(`${w}px Cap: not CELL_MAX for the game genera and CAP.sheet for the Key-only ones`);
      // Where to look: a banner above the Games grid (its first cells), open in full on its old address.
      const lk = await p.evaluate(() => ({
        links: document.querySelectorAll('#cov-look .cov-lk').length,
        grid: !!document.querySelector('.cov-t')
      }));
      if (!lk.links || !lk.grid) fails.push(`${w}px Coverage › Games: Where to look banner ${JSON.stringify(lk)}`);
      await go('inbox/coverage/games?look=all');
      if (!(await p.evaluate(() => (NEEDS || []).length && NEEDS.every(r => isGame(r.n)))))
        fails.push(`${w}px Where to look: empty, or a row for a genus no game asks`);
      if (!(await p.evaluate(() => !!document.querySelector('#cov-look.open .adm-needs') && !!document.querySelector('.cov-t'))))
        fails.push(`${w}px Where to look: not open above the Games grid`);
      // Candidates: Skip sets the photo aside, Reject marks it reviewed (a draft change), then Publish (in memory).
      await go('photos/candidates');
      if (await p.$('[data-skip]')) {
        await p.click('[data-skip]');
        await settle();
        const rf = await p.$eval('.adm-sw[data-f]', e => e.dataset.f);
        await p.click('[data-rej]');
        await settle();
        if (!(await p.evaluate(f => (DRAFT.seen || {})['cand:' + f], rf)))
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
          x = candQueue('all').find(y => y.full && isGame(y.n));
        if (!x) return {none: true};
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
          over: OVER.n,
          warn: /⚠/.test(document.querySelector('#modes [data-mode="inbox"]').textContent)
        };
      });
      if (cap.none) fails.push(`${w}px Cap: no candidate waits in a full cell (expected with the real data)`);
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
        return {v: a.vg, q: AUTOQ[a.f], wa: jw(a), wb: jw(b), line: jLine(b), left: candQueue('all').filter(x => !x.p.j).length};
      }, CF);
      if (jd.v !== 'macro' || jd.q !== 3) fails.push(`${w}px Judged: view or quality guess not applied (${jd.v}, ${jd.q})`);
      if (!(jd.wb < jd.wa / 10)) fails.push(`${w}px Judged: a Poor near-duplicate is not pushed back (${jd.wa} vs ${jd.wb})`);
      if (!/near-duplicate/.test(jd.line) || !/Same colony/.test(jd.line)) fails.push(`${w}px Judged: swiper line ${jd.line}`);
      await go('photos/candidates');
      if (!jd.left || !/not judged yet/.test(await text())) fails.push(`${w}px Judged: no reminder of the candidates not judged`);
      // A suggested crop (suggest.json cand c) shows on the candidate and is saved with the add (Pierre, 2026-11-03).
      const sc = await p.evaluate(F => {
        const n = Object.keys(DATA.cand).find(g => DATA.cand[g].some(x => x.f === F[0])),
          q = DATA.cand[n].find(x => x.f === F[0]),
          had = (DRAFT.crop || {})[F[0]];
        q.j = {...q.j, c: [0.05, 0.04, 0.95, 0.97]};
        const shown = /object-view-box/.test(crSrc(q, 1));
        ACT.addc(n, F[0], null, 'macro');
        const saved = JSON.stringify((DRAFT.crop || {})[F[0]]);
        return {had: !!had, shown, saved};
      }, CF);
      if (!sc.had && (!sc.shown || sc.saved !== '[0.05,0.04,0.95,0.97]'))
        fails.push(`${w}px Suggested crop: not shown or not saved with the add (${JSON.stringify(sc)})`);
      await p.click('#undo');
      await settle();
      // The pre-sort sets a sure comparison image aside (Pierre, 2026-11-03; the auto-sort leaves those to him): out of
      // the queue, counted, back on Show. The count is the shown source's (renderCand nAside, over candQueue(CSRC)), and
      // CF[2] is whichever undecided candidate the real curation leaves (Dauin, Philippines…: Pierre's Publish of
      // 2026-11-08 moved it from Dauin to Philippines while the page showed Dauin), so the page is put on CF[2]'s own
      // source first, All when that is not a source of the swiper; the source shown before is restored after.
      const as = await p.evaluate(F => {
        const inQ = () => candQueue('all').some(x => x.p.f === F[2] && !x.aside),
          x = candQueue('all').find(y => y.p.f === F[2]),
          o = x && origin(x.p),
          prev = CSRC;
        CSRC = FB.srcs().some(([k]) => k === o) ? o : 'all';
        render();
        return {aside: !inQ(), note: !!document.querySelector('.adm-caside'), src: CSRC, prev};
      }, CF);
      if (!as.aside || !as.note) fails.push(`${w}px Pre-sort: the comparison image is not set aside (${JSON.stringify(as)})`);
      // The rule (same as tools/excluded.py set_aside): several corals and Poor are set aside too, unless unsure.
      const rule = await p.evaluate(() =>
        [
          {g: 'exclude'},
          {g: 'cmp'},
          {k: 'dup', q: 2},
          {k: 'best', q: 2, m: 1},
          {k: 'best', q: 1},
          {k: 'best', q: 2},
          {k: 'alt', q: 3},
          {g: 'Porites', q: 2},
          {k: 'best', q: 1, m: 1, u: ['quality']},
          {g: 'exclude', u: ['genus']}
        ].map(j => aside({j}))
      );
      if (rule.join() !== 'true,true,true,true,true,false,false,false,false,false') fails.push(`${w}px Pre-sort rule: ${rule.join()}`);
      if (as.note) {
        await p.click('[data-caside]');
        await settle();
        if (
          (await p.$eval('.adm-caside', e => e.getAttribute('aria-pressed'))) !== 'true' ||
          !(await p.evaluate(F => candQueue('all').some(x => x.p.f === F[2]), CF))
        )
          fails.push(`${w}px Pre-sort: Show did not bring them back`);
        await p.click('[data-caside]');
        await settle();
      }
      await p.evaluate(s => {
        CSRC = s;
        render();
      }, as.prev);
      await settle();
      // Auto-sort (Pierre, 2026-11-03): the sure judgments were decided at load, logged as auto, the Check waits for him.
      const au = await p.evaluate(
        ([F, C]) => {
          const code = f => (aOf(f) || {}).code || null,
            q = candQueue('all');
          return {
            add: code(F[0]),
            added: !!Object.values(DRAFT.genera).some(k => (k.add || {})[F[0]]),
            full: q.some(x => x.p.f === F[0] && x.full),
            rej: code(F[1]),
            seen: !!(DRAFT.seen || {})['cand:' + F[1]],
            cmp: code(F[2]),
            unsure: code(F[3]),
            chk: code(C),
            chkQ: q.some(x => x.p.f === C && x.chk)
          };
        },
        [CF, CHK]
      );
      if (!((au.add === 'ac3x' && au.added) || (!au.add && au.full)))
        fails.push(`${w}px Auto: the sure add was not added (${JSON.stringify(au)})`);
      if (au.rej !== 'r' || !au.seen) fails.push(`${w}px Auto: the sure near-duplicate was not rejected (${JSON.stringify(au)})`);
      if (au.cmp || au.unsure) fails.push(`${w}px Auto: decided a comparison image or an unsure judgment (${JSON.stringify(au)})`);
      if (au.chk !== '?aw2B' || !au.chkQ) fails.push(`${w}px Auto: the Check is not logged or not in the queue (${JSON.stringify(au)})`);
      // Source priority in a cell with fewer free slots than sure adds (rule P1, Codex review #400): Pierre's own
      // Fair photo takes the last slot ahead of another observer's Good one; quality and sharpness only break ties.
      const pri = await p.evaluate(() => {
        const free = m => cands(m).filter(x => !x.from && !aOf(x.f) && !autoCheck(x.f) && !rejected(x.f) && !(entry(m).add || {})[x.f]),
          n = [...GAME].find(m => free(m).length >= 2),
          [a, b] = free(n),
          keep = Object.values(DATA.cand)
            .flat()
            .map(x => [x, {j: x.j, mf: x.mf, own: x.own, imr: x.imr, loc: x.loc, o: x.o}]),
          cm = CELL_MAX;
        keep.forEach(([x]) => delete x.j);
        Object.assign(a, {j: {v: 'wide', q: 3, k: 'best', fm: 'B'}, own: false, imr: false, loc: 'dauin', o: 'test-obs-a'});
        Object.assign(b, {j: {v: 'wide', q: 2, k: 'best', fm: 'B'}, own: true, imr: false, o: 'test-obs-b'});
        delete a.mf;
        delete b.mf;
        memoReset();
        CELL_MAX = covOf(n, 'wide').obs + 1;
        const R = autoRun(),
          r = {n, R, other: !!(entry(n).add || {})[a.f], mine: !!(entry(n).add || {})[b.f]};
        if (R && R.add + R.reject + R.exclude + R.check) undo();
        CELL_MAX = cm;
        keep.forEach(([x, o]) => Object.entries(o).forEach(([k, v]) => (v === undefined ? delete x[k] : (x[k] = v))));
        memoReset();
        return r;
      });
      if (!pri.mine || pri.other) fails.push(`${w}px Auto: source priority in a nearly full cell ${JSON.stringify(pri)}`);
      // The Check card: tagged, blind (no judgment line, no suggested view, no dashed quality), answered like any other;
      // rated Good where the pass said Fair, form not given (so not compared).
      await go('photos/candidates');
      const ck = await p.evaluate(C => {
        CSRC = 'all';
        candQueue('all').forEach(x => x.p.f !== C && CSKIP.add(x.p.f));
        render();
        const S = document.querySelector('.adm-sw[data-f]');
        return {
          f: S && S.dataset.f,
          tag: !!S.querySelector('.adm-chk'),
          judge: !!S.querySelector('.adm-judge'),
          sug: !!S.querySelector('.adm-swbar .sug'),
          q: !!S.querySelector('.adm-swacts [data-q][aria-pressed="true"]')
        };
      }, CHK);
      if (ck.f !== CHK || !ck.tag || ck.judge || ck.sug || ck.q)
        fails.push(`${w}px Auto: Check card not shown blind with its tag (${JSON.stringify(ck)})`);
      else {
        // Crop on the Check stays blind (Codex review #400): the editor opens on the full photo, not the agent's crop, and
        // saving it keeps an explicit no-crop, so the add does not write the suggestion behind his back (ACT.addc).
        await p.click('.adm-sw [data-crop]');
        await p.click('[data-c="save"]');
        await settle();
        const crc = await p.evaluate(C => {
          const r = JSON.stringify((DRAFT.crop || {})[C]);
          undo();
          return r;
        }, CHK);
        if (crc !== '[0,0,1,1]') fails.push(`${w}px Auto: crop editor on a Check not blind (saved ${crc})`);
        await settle();
        await p.click('.adm-swacts [data-q="3"]');
        await p.click('.adm-swbar [data-add="wide"]');
        await settle();
        if (await p.$('[data-ranyway]')) {
          // A full cell: add it anyway (the Check is answered the same way).
          await p.click('[data-ranyway]');
          await settle();
        }
        const res = await p.evaluate(C => {
          const L = aCmp().filter(c => c.f === C && c.how === 'check');
          return {
            toast: document.querySelector('.adm-toast').textContent,
            L: L.map(c => c.field + (c.ok ? '+' : '-')).join(' '),
            t: aOf(C).d.t,
            last: aCmp().slice(-1)[0].f
          };
        }, CHK);
        if (!/Check: the agent said add/.test(res.toast) || res.L !== 'keep+ view+ quality-')
          fails.push(`${w}px Auto: Check answer not compared (${JSON.stringify(res)})`);
        // The time of his answer is logged, and his answer is the latest comparison (Codex review #400).
        if (!(res.t > Date.now() / 1000 - 600) || res.last !== CHK)
          fails.push(`${w}px Auto: Check answer not timed (${JSON.stringify(res)})`);
      }
      // The agreement block, its details, and one auto decision undone (back in the queue, never applied again), then redone.
      await p.evaluate(() => {
        CSKIP.clear();
        render();
      });
      // The line is folded behind the Auto chip (Pierre, 2026-11-06: one phone screen); the chip opens it.
      if (await p.$('.adm-auto')) fails.push(`${w}px Auto: the line shows before its chip is tapped`);
      await p.click('[data-aopen]');
      await settle();
      const line = await p.$eval('.adm-auto', e => e.textContent).catch(() => '');
      if (!/Keep 100%/.test(line) || !/Quality 0%/.test(line)) fails.push(`${w}px Auto: agreement line ${line}`);
      if (line) await p.click('[data-adet]');
      await settle();
      const det = await p.evaluate(
        F => ({
          rows: document.querySelectorAll('.adm-autodet tbody tr').length,
          undo: !!document.querySelector(`[data-af="${F[1]}"] [data-aundo]`),
          dis: document.querySelectorAll('.adm-autodet [data-af]:not(:has([data-aundo]))').length
        }),
        CF
      );
      if (det.rows !== 4 || !det.undo || !det.dis) fails.push(`${w}px Auto: details ${JSON.stringify(det)}`);
      if (det.undo) {
        await p.click(`[data-af="${CF[1]}"] [data-aundo]`);
        await settle();
        const un = await p.evaluate(
          F => ({
            code: aOf(F[1]).code,
            seen: !!(DRAFT.seen || {})['cand:' + F[1]],
            inQ: candQueue('all').some(x => x.p.f === F[1] && !x.aside)
          }),
          CF
        );
        if (un.code !== '-r' || un.seen || !un.inQ) fails.push(`${w}px Auto: Undo of an auto decision ${JSON.stringify(un)}`);
        await p.click('#undo');
        await settle();
        if ((await p.evaluate(F => aOf(F[1]).code, CF)) !== 'r') fails.push(`${w}px Auto: Undo did not bring the auto decision back`);
      }
      // Undo of an auto add takes back only the add it wrote (Codex review #400): Pierre's approval in the genus he sent the
      // photo to with Not this genus, or a view he moved it to, stays.
      const ua = await p.evaluate(F => {
        const f = F[2],
          g = PHOTOS[f].genus,
          to = Object.keys(DATA.gen).find(x => x !== g),
          day = Object.keys(DRAFT.auto).sort().pop(),
          one = (mine, view) => {
            DRAFT.genera[g] = {...(DRAFT.genera[g] || {}), add: {...((DRAFT.genera[g] || {}).add || {}), [f]: view}};
            if (mine) DRAFT.genera[to] = {...(DRAFT.genera[to] || {}), add: {...((DRAFT.genera[to] || {}).add || {}), [f]: 'medium'}};
            DRAFT.auto = {...DRAFT.auto, [day]: {...DRAFT.auto[day], [f]: 'aw2B'}};
            saveDraft();
            autoUndo(f);
            const r = {own: ((DRAFT.genera[g] || {}).add || {})[f] || null, other: ((DRAFT.genera[to] || {}).add || {})[f] || null};
            undo();
            undo();
            return r;
          };
        return {plain: one(false, 'wide'), notThis: one(true, 'wide'), moved: one(false, 'medium')};
      }, CF);
      if (ua.plain.own || ua.notThis.own || ua.notThis.other !== 'medium' || ua.moved.own !== 'medium')
        fails.push(`${w}px Auto: Undo of an auto add ${JSON.stringify(ua)}`);
      // Undo of an auto exclusion (Codex review #400): a candidate whose entry is still in the candidate files is back in
      // Candidates; one whose entry is gone is not, and the toast does not claim it is.
      const ux = await p.evaluate(F => {
        const day = Object.keys(DRAFT.auto).sort().pop(),
          one = f => {
            DRAFT.exclude = {...(DRAFT.exclude || {}), [f]: 'auto'};
            DRAFT.auto = {...DRAFT.auto, [day]: {...DRAFT.auto[day], [f]: 'x'}};
            saveDraft();
            autoUndo(f);
            const r = {
              toast: document.querySelector('.adm-toast').textContent,
              ex: !!excl(f),
              inQ: candQueue('all').some(x => x.p.f === f)
            };
            undo();
            undo();
            return r;
          };
        return {here: one(F[3]), gone: PHOTOS['acropora-cand-1'] ? null : one('acropora-cand-1')};
      }, CF);
      if (ux.here.ex || !ux.here.inQ || !/back in Candidates/.test(ux.here.toast))
        fails.push(`${w}px Auto: Undo of an auto exclusion ${JSON.stringify(ux.here)}`);
      if (!ux.gone || ux.gone.ex || /back in Candidates/.test(ux.gone.toast) || !/no longer in the candidate files/.test(ux.gone.toast))
        fails.push(`${w}px Auto: Undo of an auto exclusion whose candidate entry is gone ${JSON.stringify(ux.gone)}`);
      if (line) await p.click('[data-adet]');
      await settle();
      await p.click('[data-aopen]');
      await settle();
      // An auto-added photo carries an "auto" tag on its genus page.
      if (au.added) {
        const g = await p.evaluate(F => Object.keys(DRAFT.genera).find(n => (DRAFT.genera[n].add || {})[F[0]]), CF);
        await goGenus(g);
        if (!(await p.$(`[data-f="${CF[0]}"] .adm-autot`))) fails.push(`${w}px Auto: no auto tag on ${g}`);
        // Remove on the genus page of a photo the auto-sort added: rejected, a Keep disagreement, timed as the latest
        // comparison (Codex review #400); Undo takes both back. Remove of a candidate Pierre added himself is unchanged.
        await p.$eval(`[data-f="${CF[0]}"] [data-act="hide"]`, b => b.click());
        await settle();
        const rm = await p.evaluate(
          ([F, g]) => {
            const K = aCmp().filter(c => c.field === 'keep');
            return {
              added: !!(entry(g).add || {})[F],
              rej: rejected(F),
              fix: K.some(c => c.f === F && !c.ok && c.how === 'fix'),
              last: (K.slice(-1)[0] || {}).f,
              t: !!aOf(F).d.t
            };
          },
          [CF[0], g]
        );
        if (rm.added || !rm.rej || !rm.fix || rm.last !== CF[0] || !rm.t)
          fails.push(`${w}px Auto: Remove of an auto-added photo is not a Keep disagreement ${JSON.stringify(rm)}`);
        await p.click('#undo');
        await settle();
        const back = await p.evaluate(([F, g]) => ({added: !!(entry(g).add || {})[F], rej: rejected(F), t: !!aOf(F).d.t}), [CF[0], g]);
        if (!back.added || back.rej || back.t) fails.push(`${w}px Auto: Undo of that Remove ${JSON.stringify(back)}`);
        const own = await p.evaluate(g => {
          const c = pending(g).find(x => !aOf(x.f) && !rejected(x.f));
          if (!c) return null;
          ACT.addc(g, c.f, null, 'wide');
          ACT.hide(g, c.f);
          const r = {rej: rejected(c.f), added: !!(entry(g).add || {})[c.f]};
          undo();
          undo();
          return r;
        }, g);
        if (own && (own.rej || own.added)) fails.push(`${w}px Remove of a candidate Pierre added: ${JSON.stringify(own)}`);
      }
      // Blind retest: after AUTO.retest decisions, a photo Pierre rated comes back without its rating; his answer is kept apart.
      await go('photos/candidates');
      const rt = await p.evaluate(() => {
        CDONE = AUTO.retest;
        render();
        const S = document.querySelector('.adm-blind[data-f]');
        return (
          S && {
            f: S.dataset.f,
            tag: (S.querySelector('.adm-chk') || {}).textContent,
            q: (DRAFT.quality || {})[S.dataset.f],
            pressed: !!S.querySelector('[data-rq][aria-pressed="true"]')
          }
        );
      });
      if (!rt || rt.tag !== 'Retest' || rt.pressed) fails.push(`${w}px Retest: card ${JSON.stringify(rt)}`);
      else {
        await p.click('[data-rq="1"]');
        await p.click('[data-rtdone]');
        await settle();
        const r2 = await p.evaluate(f => ({e: (DRAFT.retest || {})[f], q: DRAFT.quality[f]}), rt.f);
        if (!r2.e || r2.e.q[0] !== rt.q || r2.e.q[1] !== 1 || r2.q !== rt.q) fails.push(`${w}px Retest: answer ${JSON.stringify(r2)}`);
      }
      // The fish auto-sort ran at load into DRAFT.fish (not a coral key), and Publish counts and sends it.
      const fa = await p
        .waitForFunction(() => DRAFT.fish && DRAFT.fish.auto, null, {timeout: 15000})
        .then(() =>
          p.evaluate(
            F => ({
              fish: DRAFT.fish,
              sum: pubSummary(),
              coral: F.some(([, f]) => JSON.stringify(DRAFT.genera).includes(f)),
              // A draft with fish changes only still enables Publish (status counts the fish curation).
              alone: (() => {
                const keep = DRAFT;
                DRAFT = {...clone(SAVED), fish: DRAFT.fish};
                status();
                const r = {dis: $('save').disabled, title: $('save').title};
                DRAFT = keep;
                status();
                return !r.dis && /fish curation/.test(r.title) ? true : r;
              })()
            }),
            FF
          )
        )
        .catch(() => null);
      if (
        !fa ||
        fa.fish.add[FF[0][1]] !== FF[0][0] ||
        fa.fish.tags[FF[0][1]] !== 'p1g0sm1' ||
        fa.fish.phase[FF[0][1]] !== 'female' ||
        fa.fish.seen[FF[1][1]] !== 1 ||
        FF[2][1] in fa.fish.add ||
        fa.fish.out[FF[2][1]] !== 'x' ||
        fa.coral ||
        fa.alone !== true ||
        !/fish photo in play/.test(fa.sum) ||
        !/fish auto-sort decision/.test(fa.sum)
      )
        fails.push(
          `${w}px Fish auto-sort: ${JSON.stringify(fa && {add: fa.fish.add, seen: fa.fish.seen, out: fa.fish.out, coral: fa.coral, alone: fa.alone})}`
        );
      // One fish auto decision undone in the Auto details (Codex review #479, rule A1): gone from the draft, logged
      // undone, never applied again at the next run.
      if (fa) {
        // The coral Candidates no longer list the fish decisions: they are on the fish side's Candidates.
        await go('photos/candidates');
        if (await p.$('[data-ff]')) fails.push(`${w}px Candidates: fish auto decisions on the coral Candidates`);
        await go('fish/photos/candidates');
        await p.evaluate(() => {
          AOPEN = true; // the Auto line unfolded (its chip), Details open
          ADET = true;
          render();
        });
        const fb = await p.$(`[data-ff="${FF[0][1]}"] [data-faundo]`);
        if (!fb) fails.push(`${w}px Fish auto-sort: no Undo for ${FF[0][1]} in the Auto details`);
        else {
          await fb.click();
          await settle();
          const fu = await p.evaluate(async f => {
            const day = Object.keys(DRAFT.fish.auto).sort().pop(),
              r = {add: !!(DRAFT.fish.add || {})[f], code: DRAFT.fish.auto[day][f]};
            await fishAutoRun();
            r.again = !!(DRAFT.fish.add || {})[f];
            return r;
          }, FF[0][1]);
          if (fu.add || !/^-a[tepc]*$/.test(fu.code) || fu.again) fails.push(`${w}px Fish auto-sort: Undo ${JSON.stringify(fu)}`);
        }
        // Over 30 fish decisions: the latest 30, then "All N" shows every one (Codex review #479).
        const fl = await p.evaluate(() => {
          const keep = DRAFT.fish,
            day = '2026-11-01',
            L = Object.fromEntries(Array.from({length: 35}, (_, i) => [`fish-test-cand-${i}`, 'r']));
          DRAFT.fish = {...keep, auto: {...keep.auto, [day]: L}};
          AALL = false;
          render();
          const n0 = document.querySelectorAll('[data-ff]').length,
            b = [...document.querySelectorAll('[data-aall]')].find(
              x =>
                x.closest('.adm-autodet') &&
                /All \d+/.test(x.textContent) &&
                x.previousElementSibling &&
                x.previousElementSibling.querySelector('[data-ff]')
            );
          if (b) b.click();
          const n1 = document.querySelectorAll('[data-ff]').length;
          DRAFT.fish = keep;
          AALL = false;
          render();
          return {n0, b: !!b, n1};
        });
        if (fl.n0 !== 30 || !fl.b || fl.n1 < 36) fails.push(`${w}px Fish auto-sort: All for over 30 decisions ${JSON.stringify(fl)}`);
        await p.evaluate(() => {
          ADET = false;
          AOPEN = false;
        });
        // The fish swiper's clicks (admin plan PR 5a, admin-fish.js; autosort.js fishAdd, fishReject, fishExclude): the
        // Check FC answered + Add (in play for its species with the pass's tags and ease, its log code timed, the
        // auto-sort's answer told: same), a photo in play taken out of play from its enlarged view, a candidate rejected
        // with ←, the next one excluded with ×, Undo taking the last click back; never "out" (Not this is Pierre's, PR
        // 5b), no coral key touched.
        await go('fish/photos/candidates');
        const coral0 = await p.evaluate(() => JSON.stringify([DRAFT.genera, DRAFT.seen || {}, DRAFT.exclude || {}, DRAFT.auto || {}]));
        await p.click('[data-fq="chk"]');
        await settle();
        await p.click('.adm-fsw [data-add]');
        await settle();
        const r1 = await p.evaluate(F => {
          const x = DRAFT.fish,
            day = Object.keys(x.auto || {}).find(d => x.auto[d][F[1]]);
          return {
            add: (x.add || {})[F[1]],
            tags: (x.tags || {})[F[1]],
            ease: (x.ease || {})[F[1]],
            code: day && x.auto[day][F[1]],
            left: (document.querySelector('.adm-fsw') || {dataset: {}}).dataset.f || null,
            toast: (document.querySelector('.adm-toast') || {}).textContent || ''
          };
        }, FC);
        if (
          r1.add !== FC[0] ||
          r1.tags !== 'o1g1sso' ||
          r1.ease !== 3 ||
          !/^\?a@[0-9a-z]+$/.test(r1.code || '') ||
          r1.left ||
          !/same/.test(r1.toast)
        )
          fails.push(`${w}px Fish Candidates: Add on the Check ${JSON.stringify(r1)}`);
        await p.evaluate(F => fishZoom(FISHC.byF[F[1]], F[0], true), FC);
        await p.click('#lightbox [data-fout]');
        await settle();
        const r2 = await p.evaluate(
          F => ({add: F[1] in (DRAFT.fish.add || {}), seen: (DRAFT.fish.seen || {})[F[1]], lb: $('lightbox').hidden}),
          FC
        );
        if (r2.add || r2.seen !== 1 || !r2.lb) fails.push(`${w}px Fish Candidates: Out of play ${JSON.stringify(r2)}`);
        await p.click('[data-fq="all"]');
        await settle();
        const f0 = await p.evaluate(() => document.querySelector('.adm-fsw').dataset.f);
        await p.keyboard.press('ArrowLeft');
        await settle();
        const f1 = await p.evaluate(() => document.querySelector('.adm-fsw').dataset.f);
        await p.click('.adm-fsw [data-x]');
        await settle();
        const r3 = await p.evaluate(([a, b]) => ({seen: (DRAFT.fish.seen || {})[a], ex: (DRAFT.fish.exclude || {})[b]}), [f0, f1]);
        await p.click('#undo');
        await settle();
        const r4 = await p.evaluate(
          ([a, b, F2]) => ({
            seen: (DRAFT.fish.seen || {})[a],
            ex: b in (DRAFT.fish.exclude || {}),
            back: document.querySelector('.adm-fsw').dataset.f === b,
            out: Object.keys(DRAFT.fish.out || {}).filter(f => f !== F2),
            coral: JSON.stringify([DRAFT.genera, DRAFT.seen || {}, DRAFT.exclude || {}, DRAFT.auto || {}])
          }),
          [f0, f1, FF[2][1]]
        );
        if (
          f0 === f1 ||
          r3.seen !== 1 ||
          r3.ex !== 'excluded' ||
          r4.seen !== 1 ||
          r4.ex ||
          !r4.back ||
          r4.out.length ||
          r4.coral !== coral0
        )
          fails.push(`${w}px Fish Candidates: Reject, ×, Undo ${JSON.stringify({f0, f1, r3, r4: {...r4, coral: r4.coral === coral0}})}`);
        // 5b on the same card (f1): ease, a tag (Light: Night) behind Tags, the crop editor's Save, and Not this → another
        // species of its entry (Pierre's click: curation.json fish out), the photo then that species' candidate, marked
        // "from"; each one Undo step; no coral key touched.
        await p.click('.adm-fsw [data-fe="2"]');
        await settle();
        if (!(await p.$('.adm-fsw [data-ft]'))) {
          await p.click('.adm-fsw [data-ftags]');
          await settle();
        }
        await p.click('.adm-fsw [data-ft="2"][data-fv="n"]');
        await settle();
        await p.click('.adm-fsw [data-fcrop]');
        await p.waitForSelector('#lightbox .adm-crop [data-c="save"]');
        await p.click('#lightbox [data-c="full"]');
        await p.click('#lightbox [data-c="save"]');
        await settle();
        const r5 = await p.evaluate(f => {
          const F = DRAFT.fish,
            sel = document.querySelector('.adm-fsw [data-fnot]'),
            to = sel && [...sel.querySelectorAll('optgroup option')].map(o => o.value).find(v => v && v !== 'x');
          return {
            ease: (F.ease || {})[f],
            tag: ((F.tags || {})[f] || '')[2],
            crop: (F.crop || {})[f],
            pressed: !!document.querySelector('.adm-fsw [data-fe="2"][aria-pressed="true"]'),
            dashed: !!document.querySelector('.adm-fsw .adm-ftag.auto [data-fe]'),
            sug: ((SUG.fish || {})[f] || {}).c || null,
            to
          };
        }, f1);
        if (
          r5.ease !== 2 ||
          r5.tag !== 'n' ||
          !r5.pressed ||
          r5.dashed ||
          (r5.sug ? JSON.stringify(r5.crop) !== '[0,0,1,1]' : r5.crop !== undefined)
        )
          fails.push(`${w}px Fish Candidates 5b: rows and crop ${JSON.stringify(r5)}`);
        if (r5.to) {
          await p.selectOption('.adm-fsw [data-fnot]', r5.to);
          await settle();
          const r6 = await p.evaluate(
            ([f, to]) => ({
              out: (DRAFT.fish.out || {})[f],
              add: f in (DRAFT.fish.add || {}),
              q: (x => x && {sid: x.sid, from: x.from})(
                fishQueue(FISHC.cand, SUG.fish || {}, FISHC.species, DRAFT.fish).find(x => x.p.f === f)
              ),
              toast: (document.querySelector('.adm-toast') || {}).textContent || ''
            }),
            [f1, r5.to]
          );
          if (r6.out !== r5.to || r6.add || !r6.q || r6.q.sid !== r5.to || !r6.q.from || !/sent to/.test(r6.toast))
            fails.push(`${w}px Fish Candidates 5b: Not this ${JSON.stringify(r6)}`);
          await p.click('#undo');
          await settle();
          if (await p.evaluate(f => f in (DRAFT.fish.out || {}), f1)) fails.push(`${w}px Fish Candidates 5b: Undo of Not this`);
        } else fails.push(`${w}px Fish Candidates 5b: no species to send ${f1} to`);
        if ((await p.evaluate(() => JSON.stringify([DRAFT.genera, DRAFT.seen || {}, DRAFT.exclude || {}, DRAFT.auto || {}]))) !== coral0)
          fails.push(`${w}px Fish Candidates 5b: a coral key changed`);
      }
      // Rotate a photo (Pierre, 2026-11-08: curation.json rot, fish.rot): in the crop editor, ⟳ ⟳ ⟲ is a quarter right,
      // the photo and its frame turned together (the box turned, sized to fit, a drag in its own axes); Save puts it in
      // the draft as one Undo step, drawn at once on the tile (data-rot), the Crop button on, the draft and Publish's
      // summary counting it; Undo takes it back, Redo again; 0° resets it. Then the same on the fish Candidates
      // (fish.rot), and both left in the draft for the Publish below.
      {
        await go('photos/candidates');
        const G = await p.evaluate(() => Object.keys(DATA.gen).find(n => photos(n).some(x => x.src && !x.r && !crOf(x.f) && !roOf(x.f))));
        await goGenus(G);
        const f = await p.evaluate(() => {
          const b = [...document.querySelectorAll('#view .adm-tile[data-f] [data-act="crop"]')].find(
            x => !crOf(x.closest('[data-f]').dataset.f)
          );
          return b && b.closest('[data-f]').dataset.f;
        });
        const tile = `#view .adm-tile[data-f="${f}"]`,
          st0 = await p.evaluate(() => ({title: document.getElementById('save').title, sum: pubSummary(), h: HIST.length}));
        if (!f) fails.push(`${w}px Rotate: no photo with the Crop tool on ${G}`);
        else {
          await p.click(`${tile} [data-act="crop"]`);
          await p.waitForSelector('#lightbox .adm-rotbar [data-r="90"]');
          const ed0 = await p.evaluate(() => ({zero: document.querySelector('#lightbox [data-r="0"]').disabled}));
          await p.click('#lightbox [data-r="90"]');
          await p.click('#lightbox [data-r="90"]');
          await p.click('#lightbox [data-r="-90"]');
          const ed = await p.evaluate(() => {
            const b = document.querySelector('#lightbox .adm-cropbox'),
              r = b.getBoundingClientRect();
            return {
              t: b.style.transform,
              zero: document.querySelector('#lightbox [data-r="0"]').disabled,
              // Turned a quarter: on screen its width is its own height, and it fits the window.
              swap: Math.abs(r.width - b.offsetHeight) < 2 && Math.abs(r.height - b.offsetWidth) < 2,
              fits: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1
            };
          });
          if (!ed0.zero || ed.t !== 'rotate(90deg)' || ed.zero || !ed.swap || !ed.fits)
            fails.push(`${w}px Rotate: the editor ${JSON.stringify({ed0, ed})}`);
          await p.click('#lightbox [data-c="save"]');
          await settle();
          const r1 = await p.evaluate(
            ([f, t]) => ({
              rot: (DRAFT.rot || {})[f],
              crop: (DRAFT.crop || {})[f],
              steps: HIST.length,
              tile: (document.querySelector(t + ' .adm-ph img') || {}).dataset?.rot,
              on: !!document.querySelector(t + ' [data-act="crop"].on'),
              title: document.getElementById('save').title,
              sum: pubSummary(),
              out: (output().rot || {})[f]
            }),
            [f, tile]
          );
          if (
            r1.rot !== 90 ||
            r1.crop !== undefined ||
            r1.steps !== st0.h + 1 ||
            r1.tile !== '90' ||
            !r1.on ||
            !/rotations/.test(r1.title) ||
            /rotations/.test(st0.title) ||
            !/^1 rotation$/m.test(r1.sum) ||
            /rotation/.test(st0.sum) ||
            r1.out !== 90
          )
            fails.push(`${w}px Rotate: saved ${JSON.stringify({st0, r1})}`);
          const state = () =>
            p.evaluate(
              ([f, t]) => ({rot: (DRAFT.rot || {})[f], tile: (document.querySelector(t + ' .adm-ph img') || {}).dataset?.rot || null}),
              [f, tile]
            );
          await p.click('#undo');
          await settle();
          const r2 = await state();
          await p.click('#redo');
          await settle();
          const r3 = await state();
          if (r2.rot !== undefined || r2.tile !== null || r3.rot !== 90 || r3.tile !== '90')
            fails.push(`${w}px Rotate: Undo / Redo ${JSON.stringify({r2, r3})}`);
          // 0° in the editor, opened on the photo turned: back upright, the photo's key gone but the map kept (an empty
          // rot, as a reset crop leaves crop {}: the next merge keeps another device's rotations; review #793), nothing
          // published for it; Undo brings the turn back.
          await p.click(`${tile} [data-act="crop"]`);
          await p.waitForSelector('#lightbox [data-r="0"]:not([disabled])');
          await p.click('#lightbox [data-r="0"]');
          await p.click('#lightbox [data-c="save"]');
          await settle();
          const r4 = {
            ...(await state()),
            map: await p.evaluate(f => !!DRAFT.rot && typeof DRAFT.rot === 'object' && !(f in DRAFT.rot) && !(f in (output().rot || {})), f)
          };
          if (r4.rot !== undefined || r4.tile !== null || !r4.map || /rotation/.test(await p.evaluate(() => pubSummary())))
            fails.push(`${w}px Rotate: 0° ${JSON.stringify(r4)}`);
          await p.click('#undo');
          await settle();
          if ((await state()).rot !== 90) fails.push(`${w}px Rotate: Undo of 0°`);
        }
        // The fish Candidates: the same editor writes fish.rot, a quarter left = 270, drawn on the card.
        await go('fish/photos/candidates');
        if (await p.$('.adm-fsw [data-fcrop]')) {
          const ff = await p.evaluate(() => document.querySelector('.adm-fsw').dataset.f);
          await p.click('.adm-fsw [data-fcrop]');
          await p.waitForSelector('#lightbox .adm-rotbar [data-r="-90"]');
          await p.click('#lightbox [data-r="-90"]');
          await p.click('#lightbox [data-c="save"]');
          await settle();
          const r5 = await p.evaluate(
            f => ({
              rot: ((DRAFT.fish || {}).rot || {})[f],
              coral: (DRAFT.rot || {})[f],
              card: (document.querySelector('.adm-fsw .adm-swph img') || {}).dataset?.rot,
              on: !!document.querySelector('.adm-fsw [data-fcrop].on'),
              sum: pubSummary(),
              out: ((output().fish || {}).rot || {})[f]
            }),
            ff
          );
          if (
            r5.rot !== 270 ||
            r5.coral !== undefined ||
            r5.card !== '270' ||
            !r5.on ||
            !/^1 fish photo rotation$/m.test(r5.sum) ||
            r5.out !== 270
          )
            fails.push(`${w}px Rotate: fish ${JSON.stringify(r5)}`);
          // Publish's confirm lists both (refused here: the Publish below sends them).
          const m = await p.evaluate(() => {
            const c = window.confirm;
            let m = null;
            window.confirm = x => ((m = x), false);
            document.getElementById('save').click();
            window.confirm = c;
            return m;
          });
          if (!/^1 rotation$/m.test(m || '') || !/^1 fish photo rotation$/m.test(m || ''))
            fails.push(`${w}px Rotate: Publish's summary ${JSON.stringify(m)}`);
        } else fails.push(`${w}px Rotate: no fish candidate with the Crop tool`);
      }
      errs.length = 0;
      if (await p.isEnabled('#save')) {
        await p.click('#save');
        await p
          .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 10000})
          .catch(() => fails.push(`${w}px Publish: no "Published" toast`));
        if (!(await p.evaluate(() => Object.keys(output().auto || {}).length && Object.keys(output().retest || {}).length)))
          fails.push(`${w}px Publish: the auto-sort log or the retests are not published`);
        if (!(await p.evaluate(() => Object.keys((output().fish || {}).auto || {}).length && (output().fish || {}).out)))
          fails.push(`${w}px Publish: the fish curation is not published`);
        if (!(await p.evaluate(() => Object.keys(SAVED.rot || {}).length && Object.keys((SAVED.fish || {}).rot || {}).length)))
          fails.push(`${w}px Publish: the rotations are not published`);
      } else fails.push(`${w}px Publish: button still disabled after a change`);
      // Quality and Growth form keys (second admin review, 2026-11-01: hover + key fired by accident): a key acts only on
      // the photo that has the focus, never on one the mouse is over, never with Ctrl/Alt/Cmd, never for a stray key.
      {
        await go('photos/review/quality');
        const two = await p.evaluate(() => [...document.querySelectorAll('#view .adm-qt')].slice(0, 2).map(t => t.dataset.f));
        const sel = f => `#view .adm-qt[data-f="${f}"]`,
          q = f => p.evaluate(f => (DRAFT.quality || {})[f] || 0, f);
        if (two.length < 2) fails.push(`${w}px Quality keys: fewer than 2 photos`);
        else {
          const q0 = await q(two[0]);
          await p.hover(sel(two[0]));
          await p.evaluate(() => document.activeElement && document.activeElement.blur());
          await p.keyboard.press('1');
          if ((await q(two[0])) !== q0) fails.push(`${w}px Quality keys: a key rated the photo under the mouse, without focus`);
          await p.focus(sel(two[0]));
          await p.keyboard.press('Control+1');
          await p.keyboard.press('7');
          if ((await q(two[0])) !== q0) fails.push(`${w}px Quality keys: Ctrl+1 or a stray key changed the rating`);
          const want = q0 === 1 ? 3 : 1;
          await p.hover(sel(two[1]));
          await p.keyboard.press(String(want));
          const r = await p.evaluate(([a, b]) => [(DRAFT.quality || {})[a], (DRAFT.quality || {})[b] || 0], two);
          if (r[0] !== want || r[1] !== (await p.evaluate(f => (SAVED.quality || {})[f] || 0, two[1])))
            fails.push(`${w}px Quality keys: the focused photo not rated, or the hovered one was ${JSON.stringify(r)}`);
        }
        await go('photos/review/growth-form');
        const f = await p.evaluate(() => ((document.querySelector('#view .adm-qt') || {}).dataset || {}).f);
        const gf = () => p.evaluate(f => (DRAFT.gf || {})[f] || '', f);
        if (!f) fails.push(`${w}px Growth form keys: no photo`);
        else {
          const g0 = await gf();
          await p.hover(`#view .adm-qt[data-f="${f}"]`);
          await p.evaluate(() => document.activeElement && document.activeElement.blur());
          await p.keyboard.press('M');
          if ((await gf()) !== g0) fails.push(`${w}px Growth form keys: a key set the form of the photo under the mouse, without focus`);
          // A click on a form button redraws the buttons: the tile keeps the focus, so the next key still acts on it.
          await p.click(`#view .adm-qt[data-f="${f}"] .adm-fseg [data-fm="B"]`);
          const kept = await p.evaluate(f => document.querySelector(`#view .adm-qt[data-f="${f}"]`).contains(document.activeElement), f);
          await p.keyboard.press('E');
          const g1 = await gf();
          if (!kept || g1[0] !== 'E')
            fails.push(`${w}px Growth form keys: after a click the tile lost the focus or E missed ${JSON.stringify({kept, g1})}`);
        }
      }
    }
    if (once && run.has('photos')) await photosPart();
    await finish();
  }
  // The difficulty bands' colours (tokens --rec-* in app.css): five distinct fills, text readable on each (≥ 4.5:1), in
  // light and dark, colour-blind off and on (the admin follows the app's ⚙ Colour-blind, reefid-sync-cvd): green to red,
  // or dark blue to dark orange. Once, at 1280.
  if (ws.includes(1280) && run.has('photos'))
    for (const [theme, cvd, veasy] of [
      ['light', '0', 'rgb(27, 107, 51)'],
      ['dark', '0', 'rgb(31, 115, 55)'],
      ['light', '1', 'rgb(11, 79, 156)'],
      ['dark', '1', 'rgb(31, 95, 174)']
    ]) {
      const c = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
      await c.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await c.addInitScript(
        ([t, v]) => {
          localStorage.setItem('reefid-sync-theme', t);
          localStorage.setItem('reefid-sync-cvd', v);
        },
        [theme, cvd]
      );
      const q = await c.newPage();
      await q.goto(base + 'admin.html?demo#photos/stats/difficulty');
      await q.waitForFunction(() => typeof recBadge === 'function' && document.querySelector('#view .adm-recscale'), null, {
        timeout: 30000
      });
      const r = await q.evaluate(() => {
        const box = document.createElement('p');
        box.innerHTML = [-2, -0.7, 0, 0.7, 2].map(d => recBadge(d)).join(' ');
        document.getElementById('view').prepend(box);
        const lum = s => {
            const [r, g, b] = s
              .match(/\d+/g)
              .map(Number)
              .map(x => x / 255)
              .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          },
          ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
        const B = [...box.children].map(x => {
          const st = getComputedStyle(x);
          return {k: x.className, bg: st.backgroundColor, cr: Math.round(ratio(st.backgroundColor, st.color) * 100) / 100};
        });
        box.remove();
        return {B, cvd: document.documentElement.dataset.cvd || '', theme: document.documentElement.dataset.theme || ''};
      });
      const K = r.B.map(x => x.k.replace('adm-rec rec-', ''));
      if (
        K.join() !== 'veasy,easy,mid,hard,vhard' ||
        new Set(r.B.map(x => x.bg)).size !== 5 ||
        r.B.some(x => x.cr < 4.5) ||
        r.B[0].bg !== veasy ||
        (cvd === '1') !== (r.cvd === '1')
      )
        fails.push(`difficulty bands, ${theme}${cvd === '1' ? ', colour-blind' : ''}: ${JSON.stringify(r)}`);
      await c.close();
    }
  await b.close();
  server.close();
  if (out.length) fails.push('Calls left the page in demo mode: ' + [...new Set(out)].slice(0, 5).join(', '));
  if (fails.length) {
    console.error(`Admin demo: ${fails.length} problem(s)\n` + fails.join('\n'));
    process.exit(1);
  }
  const part = slot.partial(PARTS, run, WIDTHS, ws);
  console.log(
    part
      ? 'Admin demo OK' + part + '; nothing sent.'
      : 'Admin demo OK: every tab, view and old address at 390 and 1280 px; at 1280 merge, delete, reports, health, skip, reject, cap, auto-sort, fish auto-sort, retest, publish; nothing sent.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
