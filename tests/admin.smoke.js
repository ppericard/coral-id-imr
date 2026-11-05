const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js'); // playwright; contexts in reduced motion by default
const slot = require('./slot.js');
const ROOT = path.join(__dirname, '..');
// Analyses › Learning › Stops › Genus sheets opened on the demo's Pages tab (admin-demo.js: 4 visits a player at 0, 1/4, 1/2 and 3/4 of
// their answers; Ana opens 3 sheets in her first 3 visits, Carla 2, Ben 1; a device not signed in one; one visit with no
// id is counted by its device): players, share that opened one, visits, share with one.
const SHEETS_ALL = ['Under 50 answers 8 50% 18 28%', '50-300 answers 6 50% 11 45%', 'Over 300 answers 1 0% 1 0%', 'All 9 44% 30 33%'].join(
  ' | '
);
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
// SMOKE_W=390 or 1280: one width only (tests/slot.js; default: both).
const WIDTHS = [390, 1280];
(async () => {
  const ws = slot.widths(WIDTHS);
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
    const ctx = await b.newContext({viewport: {width: w, height: 800}, serviceWorkers: 'block'});
    await ctx.route(
      u => !u.href.startsWith(base),
      r => {
        if (/script\.google|api\.github/.test(r.request().url())) out.push(r.request().url());
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
        .filter(x => !x.cf && !named(x.f)),
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
    const FCAND = rd('fish-cand.json').cand,
      FF = Object.entries(FCAND)
        .flatMap(([sid, L]) => L.map(x => [sid, x.f]))
        .filter(([, f]) => !autoCheck(f))
        .slice(0, 3);
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
    await ctx.route(
      u => u.href.startsWith(base) && u.pathname === '/curation.json',
      r => r.fulfill({contentType: 'application/json', body: JSON.stringify({...CUR, auto: {[day]: LOG}, fish: {out: {[FF[2][1]]: 'x'}}})})
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
            [FF[2][1]]: {jt: 'p1g0sm1', e: 5, k: 'best'}
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
    const text = () => p.evaluate(() => document.getElementById('view').innerText);
    await p.goto(base + 'admin.html?demo');
    await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
    if (!(await p.$('.adm-demo'))) fails.push(`${w}px: no demo banner`);
    if (await p.$('.adm-lock')) fails.push(`${w}px: lock screen shown in demo mode`);
    // Opened with no address, the page shows Players › Activity, the recent sessions (Pierre, 2026-11-05; it was Players ›
    // List from 2026-11-04), on a phone as on a desktop.
    {
      const tab = await p.evaluate(() => (document.querySelector('#subnav .adm-subtabs [aria-pressed="true"]') || {}).textContent || '');
      const menu = await p.evaluate(() => ((document.getElementById('modesel') || {}).selectedOptions || [])[0]?.textContent || '');
      if (!/Activity/.test(tab + ' ' + menu)) fails.push(`${w}px: opened with no address on "${tab || menu}", not Players › Activity`);
      // A subject without Activity yet (fish) lands on Players › List, never on "Not for fish yet" (Codex review #554).
      const fishHref = await p.evaluate(() => (document.querySelector('#subj [data-subj="fish"]') || {}).getAttribute?.('href') || '');
      if (fishHref && !/^#fish\/~users$/.test(fishHref)) fails.push(`${w}px: the Fish switch opens ${fishHref}, not #fish/~users`);
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
      const L = TABS.flatMap(t => t[2].map(([h, v]) => ({h, tab: t[1], view: t[2].length > 1 ? h : null, n: t[2].length, name: v})));
      // Old addresses that are not a view of their own, and a player's journey (under Players).
      return [
        ...L,
        {h: '~mont', tab: 'Look-alikes', view: null, n: 1},
        {h: '~stats-needs', tab: 'Coverage', view: '~cov', n: 2},
        {h: '~journey/Ana Demo', tab: 'List', view: null, n: 1}
      ];
    });
    // Pierre, 2026-11-04: no tab holds a view of its own name, no group a tab of its own name.
    const same = await p.evaluate(() => [
      ...TABS.filter(t => t[2].length > 1 && t[2].some(([, v]) => v === t[1])).map(t => t[1]),
      ...GROUPS.filter(([, g, L]) => L.some(t => t[1] === g)).map(([, g]) => g)
    ]);
    if (same.length) fails.push(`${w}px: a tab or group named like what it holds: ${same.join(', ')}`);
    const OLD = ['~triage', '~stats-needs', '~cov', '~kcov', '~events', '~health', '~cand', '~form', '~quality', '~look', '~excluded'];
    OLD.push('~users', '~stats', '~stats-conf', '~stats-photos', '~diff', '~mont');
    const miss = OLD.filter(h => !ROUTES.some(r => r.h === h));
    if (miss.length) fails.push(`${w}px: old addresses without a tab: ${miss.join(' ')}`);
    if (ROUTES.filter(r => r.tab && !['~mont', '~stats-needs', '~journey/Ana Demo'].includes(r.h)).length < 18)
      fails.push(`${w}px: fewer than 18 views`);
    for (const r of ROUTES) {
      const h = r.h || (await p.evaluate(() => Object.keys(DATA.gen)[0]));
      await go(h);
      const at = await where();
      const strip = x => x.replace(/ \(\d+\)$| ⚠$/, '');
      if (strip(at.tab) !== r.tab || strip(at.menu) !== r.tab) fails.push(`${w}px #${h}: tab ${at.tab || at.menu}, not ${r.tab}`);
      if (r.n > 1 && (at.view !== r.view || at.views !== r.n || !at.shown))
        fails.push(`${w}px #${h}: view switch ${JSON.stringify(at)}, expected ${r.view} of ${r.n}`);
      if (r.n === 1 && at.views) fails.push(`${w}px #${h}: a view switch on a one-view tab`);
      if (at.wide > 0) fails.push(`${w}px #${h}: page ${at.wide} px wider than the window`);
    }
    // The subject switch (admin plan PR 2): one segment per subject in the header, the corals' addresses unchanged (the
    // loop above), a subject's pages under its prefix (core.js SUBJECTS admin.hash), only the tabs of the pages it has, a
    // page it does not have yet saying so, a link without a prefix keeping the subject when it has that page, and the
    // switch going back to the corals' page used last.
    {
      const S = await p.evaluate(() => SUBJECTS.map(s => ({id: s.id, name: s.name, hash: s.admin.hash, pages: s.admin.pages})));
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
      await go('~quality');
      let at = await seg();
      if (at.subj.length !== S.length || at.subj[0][1] !== 'true') fails.push(`${w}px Subjects: switch ${JSON.stringify(at.subj)}`);
      await go(other.hash + '~triage');
      at = await seg();
      if (
        !at.subj.some(([id, on]) => id === other.id && on === 'true') ||
        at.note ||
        !at.tabs.includes('To do') ||
        at.groups.includes('photos')
      )
        fails.push(`${w}px Subjects: ${other.id} Reports ${JSON.stringify(at)}`);
      await go(other.hash + '~cand');
      at = await seg();
      if (!new RegExp(`Not for ${other.name.toLowerCase()} yet`).test(at.note))
        fails.push(`${w}px Subjects: ${other.id} Candidates ${JSON.stringify(at)}`);
      // A link without a prefix clicked on a fish page (a player's journey from Players) keeps the fish side, as clicked.
      await p.evaluate(() => {
        const a = document.createElement('a');
        a.href = '#~users';
        a.id = 'subjtest';
        a.textContent = 'test';
        document.getElementById('view').prepend(a);
      });
      await p.click('#subjtest');
      await settle();
      at = await seg();
      if (at.hash !== '#' + other.hash + '~users' || !at.subj.some(([id, on]) => id === other.id && on === 'true'))
        fails.push(`${w}px Subjects: a shared page without prefix left the ${other.id} side ${JSON.stringify(at)}`);
      // An explicit coral address keeps its subject, and Back from a fish page to it stays coral, history not rewritten
      // (Codex review #492): #~users, then #fish/~triage, then Back.
      await go('~users');
      at = await seg();
      const n0 = await p.evaluate(() => history.length);
      if (at.hash !== '#~users' || at.subj[0][1] !== 'true')
        fails.push(`${w}px Subjects: #~users not on the corals' side ${JSON.stringify(at)}`);
      await go(other.hash + '~triage');
      await p.evaluate(() => history.back());
      await settle();
      at = await seg();
      const n1 = await p.evaluate(() => history.length);
      if (at.hash !== '#~users' || at.subj[0][1] !== 'true' || n1 !== n0 + 1)
        fails.push(`${w}px Subjects: Back to #~users ${JSON.stringify({...at, n0, n1})}`);
      await p.evaluate(() => history.forward());
      await settle();
      at = await seg();
      if (at.hash !== '#' + other.hash + '~triage' || !at.subj.some(([id, on]) => id === other.id && on === 'true'))
        fails.push(`${w}px Subjects: Forward to the ${other.id} Reports ${JSON.stringify(at)}`);
      if (at.wide > 0) fails.push(`${w}px Subjects: page ${at.wide} px wider than the window`);
      await p.click(`#subj [data-subj="${S[0].id}"]`);
      await settle();
      at = await seg();
      if (at.subj[0][1] !== 'true' || at.hash !== '#~users') fails.push(`${w}px Subjects: back to ${S[0].id} ${JSON.stringify(at)}`);
    }
    // Analyses (Pierre, 2026-11-04): the stored report (the demo computes it as the GitHub Action would, tools/analyses.js)
    // drawn in every view, with charts and no sideways scroll; the 4-choice count of Formats equals a direct count of the
    // demo's answer log; the milestone switch; the verdicts say something for every effect.
    errs.length = 0;
    await go('~an');
    await p
      .waitForFunction(() => document.querySelector('.adm-an .adm-kpis'), null, {timeout: 90000})
      .catch(() => fails.push(`${w}px Analyses: no report`));
    const anv = await p.evaluate(() => ({
      rows: document.querySelectorAll('.adm-an-eff tbody tr').length,
      verdicts: [...document.querySelectorAll('.adm-an-eff .adm-an-v')].filter(x => x.textContent.trim()).length,
      ms: document.querySelectorAll('[data-anm]').length,
      badge: (document.querySelector('.adm-an-badge') || {}).textContent || ''
    }));
    if (anv.rows < 40 || anv.verdicts !== anv.rows || anv.ms < 3 || !/since .* next at/.test(anv.badge))
      fails.push(`${w}px Analyses overview: ${JSON.stringify(anv)}`);
    for (const h of ['~an-rt', '~an-zoom', '~an-photo', '~an-fmt', '~an-conf', '~an-learn', '~an-back', '~an-sess']) {
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
    }
    if (once) {
      // Once: Formats against a direct count, the milestone switch, a script before v35, views remembered, To do, Hidden, the view filter.
      await go('~an-fmt');
      const anf = await p.evaluate(async () => {
        const rows = (await (await fetch(SYNC_URL, {method: 'POST', body: JSON.stringify({readAnswers: 1, token: TOKEN})})).json()).rows;
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
      // A sync script before v35 has no report: the views say so, nothing breaks (AGENTS.md 7a).
      {
        const aq = await ctx.newPage(),
          aqe = [];
        aq.on('pageerror', e => aqe.push(e.message));
        await aq.goto(base + 'admin.html?demo&v=30#~an-rt');
        await aq
          .waitForFunction(() => /No report yet/.test(document.getElementById('view').textContent), null, {timeout: 30000})
          .catch(() => aqe.push('no "No report yet"'));
        if (aqe.length) fails.push(`${w}px Analyses with script v30: ${aqe.join(' | ')}`);
        await aq.close();
      }

      // Each tab reopens its view used last, each header group its tab used last (kept in the store, as other admin prefs),
      // except Players, which always opens Activity (fixed group, Pierre 2026-11-05), List having been used before.
      await go('~kcov');
      await go('~triage');
      const mem = await p.evaluate(() => ({
        cov: (document.querySelector('#subnav .adm-subtabs a:nth-child(2)') || {}).getAttribute?.('href'),
        todo: document.querySelector('#modes [data-mode="todo"]').getAttribute('href'),
        players: document.querySelector('#modes [data-mode="players"]').getAttribute('href'),
        kept: (store.get('reefid-admin-view', {}) || {}).cov
      }));
      if (mem.cov !== '#~kcov' || mem.todo !== '#~triage' || mem.kept !== '~kcov' || mem.players !== '#~stats')
        fails.push(`${w}px: views not remembered ${JSON.stringify(mem)}`);
      await p.reload();
      await p.waitForFunction(() => typeof DRAFT !== 'undefined' && DRAFT && DRAFT.genera, null, {timeout: 30000});
      await settle();
      if ((await p.evaluate(() => document.querySelector('#modes [data-mode="todo"]').getAttribute('href'))) !== '#~triage')
        fails.push(`${w}px: the To do group forgot its last view after a reload`);
      // To do › All: Health's red line (the demo has photos everyone misses), the reports, the devices' errors, suggestions last.
      await go('~todo');
      await p
        .waitForFunction(() => document.querySelector('[data-hline]') && /Errors/.test(document.getElementById('view').innerText), null, {
          timeout: 15000
        })
        .catch(() => {});
      const all = await p.evaluate(() => {
        const v = document.getElementById('view'),
          t = v.innerText;
        return {
          line: !!v.querySelector('[data-hline] a[href="#~health"]'),
          rep: /Demo report/.test(t),
          err: !!v.querySelector('.adm-tderr'),
          first: v.querySelector('section > *')?.matches('[data-hline]')
        };
      });
      if (!all.line || !all.rep || !all.err || !all.first) fails.push(`${w}px To do › All: ${JSON.stringify(all)}`);
      // Genera › Hidden: Put back takes a removed photo back.
      const hid = await p.evaluate(() => {
        const n = Object.keys(DATA.gen).find(g => photos(g).length > 3),
          f = photos(n)[0].f;
        ACT.hide(n, f);
        location.hash = '~hidden';
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
      // all, its genus page tag turning to "kept"; Remove all asks first (rule 23: bulk), does nothing when refused, excludes
      // each photo still to handle (one Undo step each) when accepted; in Kept, Remove excludes and Keep again un-keeps.
      {
        await go('~triage');
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
            await go(g2);
            return p.evaluate(f => {
              const e = document.querySelector(`#view .adm-tile[data-f="${f}"] .adm-rule`);
              return e ? (e.classList.contains('kept') ? 'kept' : 'out') : 'none';
            }, f2);
          };
          const before = await tag();
          await go('~triage');
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
          await go('~triage');
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
      // removed automatically; the demo has the real data's share-alike photos): a "share-alike" tag on the genus page; the
      // same actions as Out of the presence rule: Remove (the ×, Undo), Keep → Kept (curation seen 'sa:f', tag "kept"),
      // un-keep, Remove all asks first and acts only on the photos still to handle.
      {
        await go('~triage');
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
            await go(g2);
            return p.evaluate(f => {
              const e = document.querySelector(`#view .adm-tile[data-f="${f}"] .adm-sa`);
              return e ? (e.classList.contains('kept') ? 'kept' : 'sa') : 'none';
            }, f2);
          };
          const before = await tag();
          await go('~triage');
          await p.click(`#view .adm-saq [data-f="${f2}"] [data-sa="keep"]`);
          await settle();
          r = await sq();
          const kept = await p.evaluate(a => (DRAFT.seen || {})['sa:' + a[0]] === 1 && photos(a[1]).some(x => x.f === a[0]), [f2, g2]);
          if (r.n !== s0.n - 1 || r.head !== s0.n - 1 || r.kept.join() !== f2 || r.kpressed !== 1 || !kept)
            fails.push(`${w}px Share-alike: Keep did not move ${f2} to Kept ${JSON.stringify(r)}`);
          const after = await tag();
          if (before !== 'sa' || after !== 'kept') fails.push(`${w}px Share-alike: the tag of a kept photo, ${before} → ${after}`);
          await go('~triage');
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
          all: rows(cur).map(([v]) => label(cur, v)),
          nc: unused(cur).length
        }));
      // A missing button is a failure, not a 30 s wait: the checks after it then fail too.
      const pick = async sel => ((await p.$(sel)) ? p.click(sel) : fails.push(`${w}px View filter: no ${sel}`));
      if (gg.three.length < 2 || !gg.two) fails.push(`${w}px View filter: no test genera ${JSON.stringify(gg)}`);
      else {
        await go(gg.three[0]);
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
        await go(gg.three[1]);
        s = await gstate();
        if (s.on.join() !== 'macro' || s.rows.join() !== 'Corallites' || s.cands)
          fails.push(`${w}px View filter: Corallites not kept on ${gg.three[1]} ${JSON.stringify(s)}`);
        await pick('.adm-sticky [data-gv="medium"]');
        await settle();
        await go(gg.two);
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
        await go(gg.three[0]);
        s = await gstate();
        if (s.rows.join() !== 'Close-up') fails.push(`${w}px View filter: Close-up not back on ${gg.three[0]} ${JSON.stringify(s)}`);
        await pick('.adm-gvnote [data-gv="all"]');
        await settle();
        s = await gstate();
        if (s.on.join() !== 'all' || s.rows.length !== 3 || !s.cands || s.note || s.saved !== '"all"')
          fails.push(`${w}px View filter: All views ${JSON.stringify(s)}`);
      }
    }
    // To do › Points (Pierre, 2026-11-05: the points to handle live in the admin, never in a text list): the list from
    // points.json, the Astrea question first among the open ones; its page shows the question and its 4 photo slots
    // (numbered, blind) with an answer field each, notes and the status segment, with no sideways scroll at either width.
    // Once: Stand-by moves it below the open ones (in the draft only, curation.json points), Undo brings it back first,
    // Resolved folds it, a note and an answer reach the draft, Reopen; nothing published, nothing sent.
    {
      await go('~points');
      const pl = () =>
        p.evaluate(() => ({
          open: [...document.querySelectorAll('[data-ptsec="open"] + .adm-pts [data-pt]')].map(a => a.dataset.pt),
          wait: [...document.querySelectorAll('[data-ptsec="wait"] + .adm-pts [data-pt]')].map(a => a.dataset.pt),
          done: [...document.querySelectorAll('[data-ptfold="done"] [data-pt]')].map(a => a.dataset.pt),
          head: +((document.querySelector('[data-ptsec="open"] small') || {}).textContent || 0),
          meta: ((document.querySelector('[data-ptsec="open"] + .adm-pts [data-pt] .adm-ptmeta') || {}).textContent || '').trim(),
          count: ((document.querySelector('#subnav .adm-views [data-view="~points"]') || {}).textContent || '').trim(),
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
        g0.hash !== '#~point/astrea-reefcloud' ||
        !/ReefCloud label/.test(g0.q) ||
        g0.slots !== 4 ||
        g0.imgs !== 4 ||
        g0.nums !== '1,2,3,4' ||
        g0.names ||
        g0.answers !== 4 ||
        !g0.notes ||
        g0.acts.join() !== 'Resolved,Stand-by,Dismiss' ||
        !/^To do/.test(g0.tab) ||
        g0.view !== '~points'
      )
        fails.push(`${w}px Points: the Astrea page ${JSON.stringify(g0)}`);
      if (g0.wide > 0) fails.push(`${w}px Points: the Astrea page ${g0.wide} px wider than the window`);
      // The enlarged photo: blind (number and credit, no taxon), ‹ › through the 4.
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
        await go('~points');
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
        await go('~point/astrea-reefcloud');
        await p.fill('.adm-ptph [data-pta]', 'Astrea');
        await p.fill('[data-ptn]', 'Asked at the morning briefing');
        await p.click('[data-pts="done"]');
        await settle();
        const s2 = await st();
        if (!s2 || s2.s !== 'done' || s2.n !== 'Asked at the morning briefing' || s2.a['astrea-wide-502260981'] !== 'Astrea')
          fails.push(`${w}px Points: note, answer and Resolved in the draft ${JSON.stringify(s2)}`);
        g = await pg();
        await go('~points');
        l = await pl();
        if (l.open.includes('astrea-reefcloud') || l.done.join() !== 'astrea-reefcloud' || (await p.$('[data-ptfold="done"][open]')))
          fails.push(`${w}px Points: Resolved is not folded at the bottom ${JSON.stringify({...l, open: l.open.slice(0, 3)})}`);
        const out = await p.evaluate(() => ((output().points || {})['astrea-reefcloud'] || {}).s);
        if (out !== 'done') fails.push(`${w}px Points: the resolved point is not in the curation to publish (${out})`);
        await go('~point/astrea-reefcloud');
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
        await go('~point/astrea-reefcloud');
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
        await go('~point/no-such-point');
        if (!/No point no-such-point/.test(await text())) fails.push(`${w}px Points: an unknown point`);
      }
    }
    // Users: the made-up players, one opened, a merge and a delete.
    await go('~users');
    let t = await text();
    if (!/Ana Demo/.test(t) || !/mara demo2/.test(t)) fails.push(`${w}px Users: demo players missing`);
    if (once) {
      // Once: an anonymous id's Journey.
      // Each anonymous id opens its own Journey (#~anon/<id>, so a name starting with @ keeps its own; Codex review #375).
      const anon = await p.$eval('a[href^="#~anon/"]', a => a.getAttribute('href')).catch(() => null);
      if (!anon) fails.push(`${w}px Users: no Journey link on the anonymous ids`);
      else {
        await go(anon.slice(1));
        if (!/Not signed in ·[\s\S]*not saved \(not signed in\)/.test(await text()))
          fails.push(`${w}px ${anon}: anonymous Journey missing`);
        await go('~users');
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
    if (once) {
      // Once: sorts, the replayed progress, scripts before v42 and v28, sheet reads, the leaderboard, rename, greyed names.
      if (!/12 min ago/.test(t)) fails.push(`${w}px Players: the device that stopped 12 minutes ago is not "12 min ago"`);
      // Names joined with the anonymous stats: every demo player has a level; sorting by name puts Ana first, reversed last.
      const lv = await p.$$eval('.adm-urow td:nth-child(3)', L => L.map(td => td.textContent.trim()));
      if (!lv.length || lv.some(x => x === '–')) fails.push(`${w}px Players: a level is missing (${lv.join(' ')})`);
      if (!/Not signed in \(\d+\)/.test(t)) fails.push(`${w}px Players: no "Not signed in" group`);
      const firstName = () => p.$eval('.adm-urow td b', b => b.textContent);
      await p.click('[data-usort="name"]');
      await settle();
      if ((await firstName()) !== 'Ana Demo') fails.push(`${w}px Players: sort by name, first is ${await firstName()}`);
      await p.click('[data-usort="name"]');
      await settle();
      if ((await firstName()) !== 'Test Demo') fails.push(`${w}px Players: reversed sort by name, first is ${await firstName()}`);
      // The quiz / Duel-tab columns sort too (Codex review #383: they were filled after the sort, which threw).
      for (const k of ['right', 'recent', 'duels']) {
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
        const col = k => [...document.querySelectorAll('.adm-utbl thead button')].findIndex(b => b.dataset.usort === k),
          row = n => [...document.querySelectorAll('.adm-urow')].find(r => r.dataset.uopen === n),
          cell = (n, k) => row(n).querySelectorAll('td')[col(k)];
        return Object.fromEntries(
          ['Ana Demo', 'Ben Demo', 'Dio Demo'].map(n => [
            n,
            {
              prog: cell(n, 'prog').innerText.trim(),
              learned: cell(n, 'learned').innerText.trim(),
              marks: row(n).querySelectorAll('.adm-saved').length
            }
          ])
        );
      });
      if (
        rp['Ana Demo'].marks ||
        !/^\d+%$/.test(rp['Ana Demo'].prog) ||
        !/^\d+%\s*↻ saved \d+%$/.test(rp['Dio Demo'].prog) ||
        !/^0\/40\s*↻ saved 1\/40$/.test(rp['Dio Demo'].learned) ||
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
        await go('~journey/' + encodeURIComponent(n));
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
      // itself from their saved copies, which it still does with a script before v42 (one userData call each, AGENTS.md 7a).
      {
        const open = async v => {
          const q = await p.context().newPage();
          q.on('pageerror', e => fails.push(`${w}px Players v${v} page error: ${e.message}`));
          await q.goto(base + `admin.html?demo&v=${v}#~users`);
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
      }
      // The admin never gets ahead of the sheet script (AGENTS.md 7a): answering as v27, the demo's Players and Journey
      // show what they did before the full replay (no Progress column, no "↻ saved" mark, the sheet's Learned column, the
      // Journey's learned genera from the saved copy).
      {
        const q = await p.context().newPage();
        q.on('pageerror', e => fails.push(`${w}px v27 page error: ${e.message}`));
        await q.goto(base + 'admin.html?demo&v=27#~users');
        await q.waitForSelector('.adm-urow', {timeout: 20000}).catch(() => {});
        await q.waitForTimeout(1500);
        const o = await q.evaluate(() => {
          const col = k => [...document.querySelectorAll('.adm-utbl thead button')].findIndex(b => b.dataset.usort === k),
            row = [...document.querySelectorAll('.adm-urow')].find(r => r.dataset.uopen === 'Dio Demo');
          return {
            prog: col('prog'),
            marks: document.querySelectorAll('.adm-saved').length,
            learned: row && row.querySelectorAll('td')[col('learned')].innerText.trim(),
            anonProg: [...document.querySelectorAll('.adm-uremoved th')].some(t => t.textContent === 'Progress')
          };
        });
        if (o.prog !== -1 || o.marks || !/^1\/\d+$/.test(o.learned) || o.anonProg)
          fails.push(`${w}px Players before v28: ${JSON.stringify(o)}`);
        await q.goto(base + 'admin.html?demo&v=27#~journey/' + encodeURIComponent('Dio Demo'));
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
        await q.goto(base + 'admin.html?demo#~todo');
        await quiet();
        const n = count(await calls());
        if (n.answers !== 1 || n.stats !== 1 || n.events !== 1 || n.reports !== 1)
          fails.push(`sheet reads: To do asked ${JSON.stringify(n)}, once each expected`);
        await q.route(/\/cand\.json$/, r => setTimeout(() => r.continue().catch(() => {}), 2000));
        await q.goto(base + 'admin.html?demo&load=2#~users');
        await quiet();
        const [a] = (await calls()).filter(c => c.k === 'answers'),
          cj = await q.evaluate(
            () => (performance.getEntriesByType('resource').find(e => /\/cand\.json$/.test(e.name)) || {}).responseStart
          );
        if (!a || !(cj > 0) || !(a.t0 < cj))
          fails.push(`sheet reads: Players' answer log asked at ${a && Math.round(a.t0)} ms, cand.json in at ${Math.round(cj)} ms`);
        await q.unroute(/\/cand\.json$/);
        await q.goto(base + 'admin.html?demo&load=3#~cand');
        await quiet();
        const before = (await calls()).length;
        await q.evaluate(() => (location.hash = '~stats-stop'));
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
        await q.goto(base + 'admin.html?demo&slow=stats&load=4#~health');
        await quiet();
        if (await q.evaluate(() => window.__early)) fails.push('sheet reads: the answer log was published before the photo ratings');
        await q.close();
      }
      await go('~users');
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
        const beta = await p.evaluate(() => (SUBJECTS.find(S => S.beta) || {}).id);
        const grp = () =>
          p.evaluate(() => ({
            line: (document.querySelector('.adm-ugroup') || {}).innerText || '',
            col: [...document.querySelectorAll('.adm-utbl th')].some(th => /^beta/i.test(th.textContent.trim())),
            all: !!document.querySelector('[data-ugall]'),
            bar: (document.querySelector('.adm-ubar') || {}).innerText || ''
          }));
        const coral = await grp();
        if (coral.line || coral.col) fails.push(`${w}px Players (corals): a beta group line or column ${JSON.stringify(coral)}`);
        if (beta) {
          await go(beta + '/~users');
          const g0 = await grp(),
            n = await p.evaluate(() => USERS.users.length);
          if (
            !new RegExp(`beta:\\s+0\\s+of\\s+${n}\\s+players`).test(g0.line) ||
            !g0.col ||
            !g0.all ||
            !/Not in the \S+ beta\s*Add/.test(g0.bar)
          )
            fails.push(`${w}px Players (${beta}): the beta group before ${JSON.stringify(g0)}`);
          await p.click('[data-ugroup="Dio Demo"]');
          await settle();
          const g1 = await grp();
          if (!new RegExp(`beta:\\s+1\\s+of\\s+${n}\\s+players`).test(g1.line) || !/In the \S+ beta\s*Remove/.test(g1.bar))
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
          await q.goto(base + `admin.html?demo&v=45#${beta}/~users`);
          await q
            .waitForFunction(() => window.DEMO_PENDING === 0 && document.querySelector('.adm-urow'), null, {timeout: 20000})
            .catch(() => {});
          const old = await q.evaluate(() => ({
            note: /needs the sheet script v48/.test(document.getElementById('view').innerText),
            btn: !!document.querySelector('[data-ugall], [data-ugroup]')
          }));
          if (!old.note || old.btn) fails.push(`${w}px Players (${beta}) with sheet v45: ${JSON.stringify(old)}`);
          await q.close();
          await go('~users'); // the corals' page, Dio's row still open, as the steps below expect
        }
      }
      // Rename (sheet v20): Ben's record moves to the suggested "Ben Demo-test" (the confirm is accepted, above), hidden
      // from the leaderboard.
      await p.click('[data-uopen="Ben Demo"]');
      await settle();
      await p.evaluate(() => (window.prompt = (q, def) => def)); // the suggested name (Playwright accepts a prompt empty)
      await p.click('[data-uren="Ben Demo"]');
      await p
        .waitForFunction(() => /Ben Demo-test/.test(document.getElementById('view').innerText), null, {timeout: 10000})
        .catch(() => {});
      // The rename reloads the players, their answers and stats, and the table is drawn again as each comes in: read it
      // once all are in (a row read in between was missing, and reported as "Carla's name is greyed").
      await settle();
      const ren = await text();
      if (!/Ben Demo-test/.test(ren) || /Ben Demo\s/.test(ren.replace(/Ben Demo-test/g, '')))
        fails.push(`${w}px Players: rename Ben Demo → Ben Demo-test not shown`);
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
      for (const n of ['Ben Demo-test', 'Test Demo']) {
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
            th = t.querySelector('thead th');
          return {table: t.offsetWidth, name: th.offsetWidth, cap: 9 * parseFloat(getComputedStyle(t).fontSize) + 12 + 1};
        });
      const LONG = 'Bartholomew Alexander Montgomery-Fitzgerald Demo LongName-60';
      const before = await size();
      await p.click('[data-uopen="Ben Demo"]');
      await settle();
      await p.evaluate(n => (window.prompt = () => n), LONG);
      await p.click('[data-uren="Ben Demo"]');
      await p.waitForFunction(n => document.querySelector(`[data-uopen="${n}"]`), LONG, {timeout: 10000}).catch(() => {});
      const after = await size(),
        cut = await p
          .$eval(`.adm-urow[data-uopen="${LONG}"] .adm-cut`, b => ({title: b.title, cut: b.scrollWidth > b.clientWidth}))
          .catch(() => null);
      if (LONG.length !== 60 || after.name > after.cap || after.table - before.table > after.name - before.name + 1)
        fails.push(`${w}px Players: a 60-character name widened the table (${JSON.stringify({before, after})})`);
      if (!cut || !cut.cut || !cut.title.startsWith(LONG))
        fails.push(`${w}px Players: the 60-character name is not cut with its title (${JSON.stringify(cut)})`);
    }
    if (once) {
      // Once: merge and delete.
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
    }
    // A player's journey (admin-journey.js), opened from their row: numbers, both curves, the genera in the order met.
    await p.click('[data-uopen="Ana Demo"]');
    await settle();
    await p.click('.adm-udet a[href^="#~journey/"]');
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
      await p.waitForFunction(() => /First cards/.test(document.getElementById('view').innerText), null, {timeout: 10000}).catch(() => {});
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
      await go('~journey/' + encodeURIComponent('Carla Demo'));
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
      await go('~journey/' + encodeURIComponent('Ana Demo'));
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
        !/quiz \(Fish\) 7 min \(2×\)/.test(sa.t) // a fish page (fish.quiz) read back with its subject
      )
        fails.push(`${w}px journey sheets (Ana): ${JSON.stringify(sa)}`);
      await go('~journey/' + encodeURIComponent('Dio Demo'));
      const sd = await jsheets();
      if (!sd || sd.rows || !/None opened/.test(sd.t)) fails.push(`${w}px journey sheets (Dio): ${JSON.stringify(sd)}`);
      await go('~users');
      const anonIds = await p.$$eval('a[href^="#~anon/"]', L => [...new Set(L.map(a => a.getAttribute('href').slice(7)))]);
      const anonSheets = [];
      for (const id of anonIds) {
        await go('~anon/' + id);
        const x = await jsheets();
        anonSheets.push(x ? x.rows : -1);
      }
      if (anonSheets.filter(n => n === 1).length !== 1 || anonSheets.some(n => n > 1))
        fails.push(`${w}px anonymous journeys' sheets: ${JSON.stringify(anonSheets)}`);

      // To do › Reports lists the demo reports; Activity shows the demo players' answers.
      // Errors & feedback (sheet v19 events): the one-tap answers, app errors, photos, saves, from the demo's made-up events.
      await go('~events');
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
      await go('~triage');
      if (!/Demo report/.test(await text())) fails.push(`${w}px To do › Reports: demo reports missing`);
      // A fish report (Codex review #442): the fish entry by its IMR name and its iNaturalist photo, not an empty tile.
      {
        const fr = await p
          .waitForFunction(
            () => {
              const c = [...document.querySelectorAll('.adm-rep')].find(x => /Demo fish report/.test(x.textContent));
              const im = c && c.querySelector('.adm-tile img');
              return c && im && /Damselfish \(fish\)/.test(c.textContent) ? im.getAttribute('src') : false;
            },
            null,
            {timeout: 10000}
          )
          .then(h => h.jsonValue())
          .catch(() => null);
        if (!fr || !/inaturalist/.test(fr)) fails.push(`${w}px To do › Reports: the fish report has no fish name or photo (${fr})`);
      }
    }
    await go('~stats');
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
          all: ANS.rows.length,
          ids: new Set(ANS.rows.map(r => r[0])).size,
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
        if (an.last !== '12 min ago' || an.n !== 8 || !/^#~anon\//.test(an.link) || R[1] !== an)
          fails.push(`${w}px Recent sessions: the device not signed in ${JSON.stringify(an)}`);
        if (!R.some(x => /^#~journey\//.test(x.link) && !x.now)) fails.push(`${w}px Recent sessions: no other signed-in player`);
      }
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
        s1.link !== '#~journey/Carla%20Demo' ||
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
    }
    // Difficulty in words (Pierre, 2026-11-05, Q19 and Q26): on the main views no signed raw difficulty or level is left
    // ("+1.44", "−0.80"); every reading is a badge (admin.js recBadge) whose colour class is the band of its % (≥75 very
    // easy, 60-75 easy, 40-60 middle, 25-40 hard, <25 very hard) and whose title holds the raw value; players read as an
    // Elo with the level in its title. At both widths, with no sideways scroll.
    for (const [h, need] of [
      ['~stats-photos', 'rec'],
      ['~diff', 'rec'],
      ['~health', 'rec'],
      ['~users', 'elo'],
      ['~stats-log', 'elo'],
      ['~journey/Carla%20Demo', 'elo']
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
    // Photo stats › Overview (Pierre, 2026-11-03: general stats on every photo): its numbers against a direct count made
    // here with the Coverage page's own covOf (photos and colonies per genus x view), the candidates and the rejected
    // marks, and a plain median (sort, middle value); nothing wider than the window.
    await go('~pstats');
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
        diff: tabOf('~diff')[1],
        diffs: tabOf('~stats-photos')[1],
        first: TABS.find(t => t[0] === 'pstats')[2][0][0]
      }));
      if (mv.diff !== 'Photo review' || mv.diffs !== 'Photo stats' || mv.first !== '~pstats')
        fails.push(`${w}px Photo stats tabs: ${JSON.stringify(mv)}`);
      await p.evaluate(() => store.set('reefid-admin-view', {...store.get('reefid-admin-view', {}), pstats: '~diff'}));
      await go('~quality');
      const ps = await p.evaluate(() =>
        [...document.querySelectorAll('#subnav .adm-subtabs a')].find(a => /Photo stats/.test(a.textContent)).getAttribute('href')
      );
      if (ps !== '#~pstats') fails.push(`${w}px Photo stats: a remembered Photo list view opens ${ps}, not Overview`);
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
    await go('~health');
    // Every account counts (Pierre, 2026-11-04): no "Without me", "Others / Me" or "This is also me" anywhere.
    if (await p.$('[data-sf="elo"], [data-sf="who"], [data-ume]')) fails.push(`${w}px Health: a filter on your own answers is back`);
    {
      const hs = await health();
      if (hs.secs !== 'photos genera' || !hs.rows) fails.push(`${w}px Health: sections ${JSON.stringify(hs)}`);
      if (hs.wide > 0) fails.push(`${w}px Health: page ${hs.wide} px wider than the window`);
    }
    await go('~stats-stop');
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
    // Activity's analysis cards are on Analyses › Learning › Answer log, and only there (one role per admin page).
    {
      const cards = () => p.evaluate(() => [...document.querySelectorAll('#view .adm-scard h3')].map(h => h.textContent.trim()));
      const ANALYSIS_CARDS = ['Learning curve', 'Calibration', 'Conditions', 'Genera', 'Mix-ups'];
      await go('~stats-log');
      const lg = await cards();
      if (ANALYSIS_CARDS.some(t => !lg.includes(t)) || lg.some(t => /^Recent sessions|^Activity over time/.test(t)))
        fails.push(`${w}px Answer log: cards ${JSON.stringify(lg)}`);
      await go('~stats');
      const ac = await cards();
      if (
        ANALYSIS_CARDS.some(t => ac.includes(t)) ||
        !ac.some(t => /^Recent sessions/.test(t)) ||
        !ac.some(t => /^Activity over time/.test(t))
      )
        fails.push(`${w}px Activity: cards ${JSON.stringify(ac)}`);
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
          await go('~stats');
          await p.evaluate(prep);
          if (label === 'reload') {
            await p.click('[data-sload]');
            await settle();
          }
          await go('~stats-stop');
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
        await go('~stats');
        await go('~stats-stop');
        await p.waitForTimeout(1500);
        const reads = (await p.evaluate(() => PGREADS)) - n0;
        if (n0 !== 2 || reads) fails.push(`${w}px Stops genus sheets reads: ${n0} for two stale caches, then ${reads} on a fresh one`);
      }
      // The enlarged photo's caption links to the photo's source, as in the games (AGENTS.md rule 11; Pierre, 2026-11-03:
      // he opened his own photo everyone misses, to check its identification on iNaturalist, and found no link): an iNat
      // photo's observation (new tab, noopener) and the genus sheet; a Coral Finder book photo keeps its © line, no link.
      const lbSrc = f =>
        p.evaluate(f => {
          const ph = PHOTOS[f],
            cap = document.querySelector('#lightbox:not([hidden]) .lb-cap');
          if (!cap) return 'no lightbox';
          if (!cap.querySelector(`code`) || cap.querySelector('code').textContent !== f) return 'caption names another photo';
          const a = [...cap.querySelectorAll('a.lb-src')];
          if (ph.cf)
            return a.length
              ? 'a book photo has a source link'
              : /Coral Finder/.test(cap.textContent)
                ? ''
                : 'book photo without its © line';
          if (!/inaturalist\.org\/observations\//.test(ph.o || '')) return a.length ? 'a link on a photo with no iNat page' : '';
          if (a.length !== 1 || a[0].href !== ph.o) return `no link to ${ph.o}`;
          if (a[0].target !== '_blank' || !/noopener/.test(a[0].rel)) return 'source link not in a new tab with noopener';
          if (!cap.querySelector(`a[href$="#g-${encodeURIComponent(ph.genus)}"]`)) return 'genus not linked to its sheet';
          return '';
        }, f);
      await go('~health');
      if (await p.$('[data-health="photos"] [data-zf]')) {
        await p.click('[data-health="photos"] [data-zf]');
        if (await p.evaluate(() => document.getElementById('lightbox').hidden)) fails.push(`${w}px Health: a photo click opened nothing`);
        else {
          const e = await lbSrc(await p.$eval('[data-health="photos"] [data-zf]', b => b.dataset.zf));
          if (e) fails.push(`${w}px Health lightbox: ${e}`);
        }
        await p.keyboard.press('Escape');
      }
      // Both admin lightboxes (zoom: a genus's photos; zoomOne: Excluded, Flags, Candidates, auto-sort), on Pierre's photo
      // of the report, a candidate and a Coral Finder book photo.
      for (const [how, f] of await p.evaluate(() => {
        const own = 'lobactis-medium-746236519',
          cand = Object.values(DATA.cand)
            .flat()
            .find(x => !x.cf),
          book = Object.values(PHOTOS).find(x => x.cf);
        return [
          ['zoom', PHOTOS[own] ? own : Object.values(PHOTOS).find(x => x.own).f],
          ['zoomOne', cand.f],
          ['zoomOne', book.f]
        ];
      })) {
        await p.evaluate(([how, f]) => (how === 'zoom' ? zoom(PHOTOS[f].genus, f) : zoomOne(PHOTOS[f])), [how, f]);
        const e = await lbSrc(f);
        if (e) fails.push(`${w}px Lightbox (${how}, ${f}): ${e}`);
        await p.keyboard.press('Escape');
      }
    }
    if (errs.length) fails.push(`${w}px Health: ${errs.slice(0, 3).join(' | ')}`);

    if (once) {
      // Once: Growth form, game genera, Candidates, the cap, judgments, the pre-sort, the auto-sort, retests, the fish auto-sort, Publish.
      // Photo review › Growth form (Pierre, 2026-11-03: he checks forms by hand to see whether the automatic detection is
      // good): the agreement line at the top; a click that keeps the dashed guess raises agreement, one that picks another
      // form lowers it, live; Guesses first puts the photos still on a guess first in each row, the unsure ones first.
      await go('~form');
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
      await go('~cov');
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
      await go('~stats-needs');
      if (!(await p.evaluate(() => (NEEDS || []).length && NEEDS.every(r => isGame(r.n)))))
        fails.push(`${w}px Where to look: empty, or a row for a genus no game asks`);
      if (!(await p.evaluate(() => !!document.querySelector('#cov-look.open .adm-needs') && !!document.querySelector('.cov-t'))))
        fails.push(`${w}px Where to look: not open above the Games grid`);
      // Candidates: Skip sets the photo aside, Reject marks it reviewed (a draft change), then Publish (in memory).
      await go('~cand');
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
          over: OVER.n,
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
      // the queue, counted, back on Show.
      const as = await p.evaluate(F => {
        const inQ = () => candQueue('all').some(x => x.p.f === F[2] && !x.aside);
        return {aside: !inQ(), note: !!document.querySelector('.adm-caside')};
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
      // Source priority in a cell with fewer free slots than sure adds (AGENTS.md rule 7, Codex review #400): Pierre's own
      // Fair photo takes the last slot ahead of another observer's Good one; quality and sharpness only break ties.
      const pri = await p.evaluate(() => {
        const free = m =>
            cands(m).filter(x => !x.cf && !x.from && !aOf(x.f) && !autoCheck(x.f) && !rejected(x.f) && !(entry(m).add || {})[x.f]),
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
      await go('~cand');
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
      // An auto-added photo carries an "auto" tag on its genus page.
      if (au.added) {
        const g = await p.evaluate(F => Object.keys(DRAFT.genera).find(n => (DRAFT.genera[n].add || {})[F[0]]), CF);
        await go(g);
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
      await go('~cand');
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
      // One fish auto decision undone in the Auto details (Codex review #479, AGENTS.md rule 8): gone from the draft, logged
      // undone, never applied again at the next run.
      if (fa) {
        await go('~cand');
        await p.evaluate(() => {
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
        });
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
      } else fails.push(`${w}px Publish: button still disabled after a change`);
    }
    if (errs.length) fails.push(`${w}px actions: ${errs.slice(0, 3).join(' | ')}`);

    const keys = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    const real = keys.filter(k => /^reefid-(curation|admin)/.test(k));
    if (real.length) fails.push(`${w}px: demo wrote real admin keys: ${real.join(', ')}`);
    await ctx.close();
  }
  // The difficulty bands' colours (tokens --rec-* in app.css): five distinct fills, text readable on each (≥ 4.5:1), in
  // light and dark, colour-blind off and on (the admin follows the app's ⚙ Colour-blind, reefid-sync-cvd): green to red,
  // or dark blue to dark orange. Once, at 1280.
  if (ws.includes(1280))
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
      await q.goto(base + 'admin.html?demo#~stats-photos');
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
  const part = slot.partial([], null, WIDTHS, ws);
  console.log(
    part
      ? 'Admin demo OK' + part + '; nothing sent.'
      : 'Admin demo OK: every tab, view and old address at 390 and 1280 px; at 1280 merge, delete, reports, health, skip, reject, cap, auto-sort, fish auto-sort, retest, publish; nothing sent.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
