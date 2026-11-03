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
// the admin): every view of the 9 tabs and every old address at 390 and 1280 px with no page error, each landing on its
// tab and view, the view remembered per tab, then the main actions on made-up data: open a player, merge two names,
// delete a test account, the reports in To do, Skip and Reject in Candidates, the auto-sort (decisions, a
// blind Check, the agreement block, undo, the auto tag, a retest), Publish.
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
    // Candidate pass of the judging agent (suggest.json "cand", tools/judging_cand.py): made-up judgments. The auto-sort
    // (autosort.js) decides the sure ones at load: CF[0] a sure add (Good, Corallites), CF[1] a sure near-duplicate
    // (rejected), CF[2] a comparison image (left set aside, Pierre's), CF[3] unsure (his); CHK, a sure add that the
    // 1-in-20 draw makes a Check (shown to him blind).
    const ALL = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, 'cand.json'))).cand)
        .flat()
        .filter(x => !x.cf),
      {autoCheck} = require('../autosort.js'),
      CF = ALL.filter(x => !autoCheck(x.f))
        .slice(0, 4)
        .map(x => x.f),
      CHK = ALL.find(x => autoCheck(x.f)).f;
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
    const settle = async () => {
      await p.waitForTimeout(300);
      await p
        .waitForFunction(() => !/^\s*Loading/.test((document.querySelector('#view .note') || {}).textContent || ''), null, {timeout: 15000})
        .catch(async () => fails.push(`${w}px ${await p.evaluate(() => location.hash)}: still loading`));
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
        {h: '~journey/Ana Demo', tab: 'Players', view: null, n: 1}
      ];
    });
    const OLD = ['~triage', '~stats-needs', '~cov', '~fcov', '~events', '~health', '~cand', '~form', '~quality', '~look', '~excluded'];
    OLD.push('~users', '~stats', '~stats-conf', '~stats-photos', '~diff', '~mont');
    const miss = OLD.filter(h => !ROUTES.some(r => r.h === h));
    if (miss.length) fails.push(`${w}px: old addresses without a tab: ${miss.join(' ')}`);
    if (ROUTES.filter(r => r.tab && !['~mont', '~stats-needs', '~journey/Ana Demo'].includes(r.h)).length < 17)
      fails.push(`${w}px: fewer than 17 views`);
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
    // Each tab reopens its view used last, each header group its tab used last (kept in the store, as other admin prefs).
    await go('~fcov');
    await go('~triage');
    const mem = await p.evaluate(() => ({
      cov: (document.querySelector('#subnav .adm-subtabs a:nth-child(2)') || {}).getAttribute?.('href'),
      todo: document.querySelector('#modes [data-mode="todo"]').getAttribute('href'),
      players: document.querySelector('#modes [data-mode="players"]').getAttribute('href'),
      kept: (store.get('imr-admin-view', {}) || {}).cov
    }));
    if (mem.cov !== '#~fcov' || mem.todo !== '#~triage' || mem.kept !== '~fcov' || mem.players !== '#~users')
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

    // Users: the made-up players, one opened, a merge and a delete.
    await go('~users');
    let t = await text();
    if (!/Ana Demo/.test(t) || !/mara demo2/.test(t)) fails.push(`${w}px Users: demo players missing`);
    // Each anonymous id opens its own Journey (#~anon/<id>, so a name starting with @ keeps its own; Codex review #375).
    const anon = await p.$eval('a[href^="#~anon/"]', a => a.getAttribute('href')).catch(() => null);
    if (!anon) fails.push(`${w}px Users: no Journey link on the anonymous ids`);
    else {
      await go(anon.slice(1));
      if (!/Not signed in ·[\s\S]*not saved \(not signed in\)/.test(await text())) fails.push(`${w}px ${anon}: anonymous Journey missing`);
      await go('~users');
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
    // Leaderboard (sheet v20): Hide marks the player hidden, Show puts them back.
    await p.click('[data-uopen="Dio Demo"]');
    await settle();
    await p.click('[data-uboard="Dio Demo"]');
    await settle();
    if (!/Hidden from the leaderboard/.test(await text())) fails.push(`${w}px Players: Hide did not hide Dio from the leaderboard`);
    await p.click('[data-uboard="Dio Demo"]');
    await settle();
    if (!/On the leaderboard/.test(await text())) fails.push(`${w}px Players: Show did not put Dio back`);
    // Rename (sheet v20): Ben's record moves to the suggested "Ben Demo-test" (the confirm is accepted, above), hidden
    // from the leaderboard.
    await p.click('[data-uopen="Ben Demo"]');
    await settle();
    await p.evaluate(() => (window.prompt = (q, def) => def)); // the suggested name (Playwright accepts a prompt empty)
    await p.click('[data-uren="Ben Demo"]');
    await p.waitForFunction(() => /Ben Demo-test/.test(document.getElementById('view').innerText), null, {timeout: 10000}).catch(() => {});
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
      if (!h || h.tag || h.color !== h.muted || h.italic !== 'italic' || !h.title.includes(n) || !/hidden/i.test(h.title))
        fails.push(`${w}px Players: hidden player ${n} not greyed without a tag (${JSON.stringify(h)})`);
    }
    const shown = await nameOf('Carla Demo');
    if (!shown || shown.color === shown.muted || shown.italic === 'italic') fails.push(`${w}px Players: Carla's name is greyed`);
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
      await p.click('[data-uopen="Ben Demo-test"]');
      await settle();
      await p.evaluate(n => (window.prompt = () => n), LONG);
      await p.click('[data-uren="Ben Demo-test"]');
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
    if (jo.h !== 'Ana Demo' || jo.charts < 3 || !jo.rows || !jo.ordered || !jo.lists || jo.tab !== 'Players' || jo.small)
      fails.push(`${w}px journey: ${JSON.stringify(jo)}`);
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
        /Photo quiz/.test(document.getElementById('view').innerText) && /Look-alike duels/.test(document.getElementById('view').innerText)
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

    // To do › Reports lists the demo reports; Activity shows the demo players' answers.
    // Errors & feedback (sheet v19 events): the one-tap answers, app errors, photos, saves, from the demo's made-up events.
    await go('~events');
    await p
      .waitForFunction(() => /Saves that failed/i.test(document.getElementById('view').innerText), null, {timeout: 10000})
      .catch(() => {});
    const evt = await text();
    if (!/About right/i.test(evt) || !/reading 'views'/.test(evt) || !/Saves that failed/i.test(evt))
      fails.push(`${w}px Errors & feedback: demo events missing`);
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
    await go('~stats');
    if (/No answers yet/.test(await text())) fails.push(`${w}px Activity: no answers`);
    // Recent sessions (Pierre, 2026-11-03): the last 10 sessions of every player, newest first, by name or anonymous id;
    // Carla playing now (quiz, duel and typed answers), the device that stopped 12 minutes ago by its id; ↻ reloads.
    const recent = () =>
      p.evaluate(() => {
        const c = document.querySelector('[data-recent]');
        if (!c) return null;
        const R = [...c.querySelectorAll('tbody tr')].map(tr => ({
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
      if (!/quiz/.test(c.modes) || !/duel/.test(c.modes) || !/typed 2/.test(c.modes))
        fails.push(`${w}px Recent sessions: modes ${c.modes}`);
      if (R.filter(x => x.now).length !== 1) fails.push(`${w}px Recent sessions: ${R.filter(x => x.now).length} sessions now, expected 1`);
      if (an.last !== '12 min ago' || an.n !== 8 || !/^#~anon\//.test(an.link) || R[1] !== an)
        fails.push(`${w}px Recent sessions: the device not signed in ${JSON.stringify(an)}`);
      if (!R.some(x => /^#~journey\//.test(x.link) && !x.now)) fails.push(`${w}px Recent sessions: no other signed-in player`);
    }
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
    // Health (To do): its four sections from the demo answers, with and without this browser's own answers, no sideways
    // page scroll; a photo everyone misses opens in the lightbox.
    const health = () =>
      p.evaluate(() => ({
        secs: [...document.querySelectorAll('[data-health]')].map(s => s.dataset.health).join(' '),
        rows: document.querySelectorAll('[data-health="genera"] tbody tr').length,
        bars: document.querySelectorAll('[data-health="time"] .adm-cols > div').length,
        wide: document.documentElement.scrollWidth - innerWidth
      }));
    await go('~health');
    for (const v of ['all', 'others']) {
      if (v === 'others') {
        if (!(await p.$('[data-sf="elo"][data-v="others"]'))) {
          fails.push(`${w}px Health: no "Without me" switch`);
          break;
        }
        await p.click('[data-sf="elo"][data-v="others"]');
        await settle();
      }
      const hs = await health();
      if (hs.secs !== 'stop photos genera time' || !hs.rows || hs.bars !== 60)
        fails.push(`${w}px Health (${v}): sections ${JSON.stringify(hs)}`);
      if (hs.wide > 0) fails.push(`${w}px Health (${v}): page ${hs.wide} px wider than the window`);
    }
    if (await p.$('[data-health="photos"] [data-zf]')) {
      await p.click('[data-health="photos"] [data-zf]');
      if (await p.evaluate(() => document.getElementById('lightbox').hidden)) fails.push(`${w}px Health: a photo click opened nothing`);
      await p.keyboard.press('Escape');
    }
    if (errs.length) fails.push(`${w}px Health: ${errs.slice(0, 3).join(' | ')}`);
    if (await p.$('[data-sf="elo"][data-v="all"]')) {
      await p.click('[data-sf="elo"][data-v="all"]');
      await settle();
    }

    // Game genera first (Pierre, 2026-11-03; core.js gameOf): Game coverage lists every genus a game asks, Millepora and
    // the bonus genera included; in Candidates no Finder-only genus comes before a game genus of the same source, none
    // is proposed for Corallites, and a Finder-only genus is full at CAP.sheet colonies.
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
    if (!gq.fo) fails.push(`${w}px Game genera: no Finder-only genus in the data`);
    Object.entries(gq.order).forEach(([s, [first, lastGame, n]]) => {
      if (first >= 0 && first < lastGame)
        fails.push(`${w}px Candidates ${s}: a Finder-only genus at ${first}, before a game genus at ${lastGame} (${n})`);
    });
    if (gq.macro) fails.push(`${w}px Candidates: ${gq.macro} Corallites candidates for Finder-only genera`);
    if (!gq.cap) fails.push(`${w}px Cap: not CELL_MAX for the game genera and CAP.sheet for the Finder-only ones`);
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
      if (!(await p.evaluate(f => (DRAFT.seen || {})['cand:' + f], rf))) fails.push(`${w}px Candidates: Reject left no mark in the draft`);
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
          const r = {toast: document.querySelector('.adm-toast').textContent, ex: !!excl(f), inQ: candQueue('all').some(x => x.p.f === f)};
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
    errs.length = 0;
    if (await p.isEnabled('#save')) {
      await p.click('#save');
      await p
        .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 10000})
        .catch(() => fails.push(`${w}px Publish: no "Published" toast`));
      if (!(await p.evaluate(() => Object.keys(output().auto || {}).length && Object.keys(output().retest || {}).length)))
        fails.push(`${w}px Publish: the auto-sort log or the retests are not published`);
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
  console.log(
    'Admin demo OK: every tab, view and old address at 390 and 1280 px, merge, delete, reports, health, skip, reject, cap, auto-sort, retest, publish; nothing sent.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
