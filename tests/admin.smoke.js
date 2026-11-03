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
    // Each anonymous id opens its own Journey (#~anon/<id>, so a name starting with @ keeps its own; Codex review #375).
    const anon = await p.$eval('a[href^="#~anon/"]', a => a.getAttribute('href')).catch(() => null);
    if (!anon) fails.push(`${w}px Users: no Journey link on the anonymous ids`);
    else {
      await go(anon.slice(1));
      if (!/Not signed in ·[\s\S]*not saved \(not signed in\)/.test(await text())) fails.push(`${w}px ${anon}: anonymous Journey missing`);
      await go('~users');
    }
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
    // The quiz / Duel-tab columns sort too (Codex review #383: they were filled after the sort, which threw).
    for (const k of ['right', 'recent', 'duels']) {
      await p.click(`[data-usort="${k}"]`);
      await settle();
      if (!(await p.$('.adm-urow'))) fails.push(`${w}px Players: sort by ${k} left no rows`);
    }
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
    if (!/Ben Demo-test\s+hidden/.test(ren) || /Ben Demo\s/.test(ren.replace(/Ben Demo-test/g, '')))
      fails.push(`${w}px Players: rename Ben Demo → Ben Demo-test (hidden) not shown`);
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
    if (!/Opened all genera after answer 40.*offer card/.test(carla.t) || !carla.line)
      fails.push(`${w}px journey (Carla): ${JSON.stringify(carla)}`);
    await go('~journey/' + encodeURIComponent('Ana Demo'));
    await p.click('[data-jsort="hard"]');
    await settle();
    const firstHard = await p.$eval('.adm-jtbl tbody tr td:nth-child(6)', td => td.textContent);
    if (!/-|–/.test(firstHard)) fails.push(`${w}px journey: hardest first starts at ${firstHard}`);

    // Triage lists the demo reports; Activity shows the demo players' answers.
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
    await go('~stats-needs');
    if (!(await p.evaluate(() => (NEEDS || []).length && NEEDS.every(r => isGame(r.n)))))
      fails.push(`${w}px Where to look: empty, or a row for a genus no game asks`);
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
    // The pre-sort sets the sure near-duplicate aside (Pierre, 2026-11-03): out of the queue, counted, back on Show.
    const as = await p.evaluate(F => {
      const inQ = () => candQueue('all').some(x => x.p.f === F[1] && !x.aside);
      return {aside: !inQ(), note: !!document.querySelector('.adm-caside')};
    }, CF);
    if (!as.aside || !as.note) fails.push(`${w}px Pre-sort: the near-duplicate is not set aside (${JSON.stringify(as)})`);
    if (as.note) {
      await p.click('[data-caside]');
      await settle();
      if (
        (await p.$eval('.adm-caside', e => e.getAttribute('aria-pressed'))) !== 'true' ||
        !(await p.evaluate(F => candQueue('all').some(x => x.p.f === F[1]), CF))
      )
        fails.push(`${w}px Pre-sort: Show did not bring them back`);
      await p.click('[data-caside]');
      await settle();
    }
    errs.length = 0;
    if (await p.isEnabled('#save')) {
      await p.click('#save');
      await p
        .waitForFunction(() => /Published/.test((document.querySelector('.adm-toast') || {}).textContent || ''), null, {timeout: 10000})
        .catch(() => fails.push(`${w}px Publish: no "Published" toast`));
    } else fails.push(`${w}px Publish: button still disabled after a change`);
    if (errs.length) fails.push(`${w}px actions: ${errs.slice(0, 3).join(' | ')}`);

    const keys = await p.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
    const real = keys.filter(k => /^reefid-(curation|admin)/.test(k));
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
  console.log('Admin demo OK: every page at 390 and 1280 px, merge, delete, triage, health, skip, reject, cap, publish; nothing sent.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
