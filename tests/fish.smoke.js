// Fish quiz test (the taxon model, core.js SUBJECTS): runs the real app in Chromium on the fish subject and checks:
// - the draw: fish questions only from the fish slate (circle 1, the IMR entries) until a circle is opted in; every
//   choice a fish entry; one photo, from one observation; winks never asked as questions;
// - circle opt-in: circle 2 offered once every IMR entry has been asked, circle 3 once the progress reaches FISH_C3;
//   "Not now" kept; once on, their entries join the draw, never counted in the progress;
// - winks: a surprise card for a circle-1 player too (Pierre, 2026-11-03), its absurd choices and feedback lines from
//   fish.json, never counted (progress, answers, log unchanged); late (Pierre, 2026-11-06): none in the first answers
//   (quiz.js WINK.AT: 300), once due shown once, then not again on the device (reefid-fish-wink);
// - typed answers: the entry's names (IMR name, family, sub-entries) read as the entry;
// - progress per subject kept apart: fish answers in reefid-sync-fish-progress only, the corals' untouched; switching
//   back to corals brings the coral slate and progress back;
// - the fish beta is the admin's only (Pierre, 2026-11-04): a player who is not the admin sees no subject switch (Home,
//   header, ⚙, Tools) and stays on the corals even with Fish saved, its fish progress kept; the admin switches on Home
//   (the Corals | Fish row) and in the header (the subject chip), one state. Every context below but that one holds an
//   admin token.
// iNaturalist photos are not fetched (every other host is aborted): the logic only. Needs Playwright, like
// draw.smoke.js. Locally: node tests/fish.smoke.js
// A page key's address (core.js routeOut), for the corals.
const C = require('../core.js'),
  addr = k => C.routeOut(k) ?? k;
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js'); // playwright; contexts in reduced motion by default
const slot = require('./slot.js');
const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname),
    f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) return (res.writeHead(403), res.end());
  fs.readFile(f, (e, b) => {
    if (e) return (res.writeHead(404), res.end());
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'});
    res.end(b);
  });
});

(async () => {
  await slot('fish.smoke');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  const CORAL = {Acropora: {ok: 3, ko: 1, h: '1101', th: 0.2}};
  await ctx.addInitScript(coral => {
    try {
      if (!sessionStorage.getItem('fish-smoke')) {
        sessionStorage.setItem('fish-smoke', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
        localStorage.setItem('reefid-sync-subject', '"fish"');
        localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
        localStorage.setItem('reefid-sync-coral-progress', JSON.stringify(coral));
      }
    } catch (e) {}
    let s = 777;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  }, CORAL);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#practice/quiz');
  await p.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH, null, {timeout: 30000});
  const out = await p.evaluate(() => {
    const fails = [],
      ok = (c, m) => c || fails.push(m);
    const closeCards = () => document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
    ok(SUBJ.id === 'fish', 'subject fish at start-up');
    ok(slateGenera().length === 27 && slateGenera().every(n => FISH.c1.includes(n)), 'the fish slate = the 27 IMR entries');
    ok(!pool().some(n => !FISH.c1.includes(n)), 'circle 1 only before any opt-in');
    // No wall (Pierre, 2026-11-06 14:17): on a fresh entry a photo under ease 4 can be drawn, rarely; the prior and the
    // aim favour the easy ones (no easyFirst gate any more).
    {
      const hardP = p => (p.e || 3) < 4,
        n = pool().find(x => GX(x).views.wide.some(hardP) && GX(x).views.wide.some(p => !hardP(p))),
        W = GX(n).views.wide,
        N = 400;
      let hard = 0;
      for (let i = 0; i < N; i++) hard += hardP(photoSet(n).shown[0]) ? 1 : 0;
      ok(hard > 0, `${n}: a harder photo can be drawn early`);
      ok(hard / N < W.filter(hardP).length / W.length, `${n}: harder photos drawn less often than their share (${hard}/${N})`);
    }
    // The draw, many times: target and choices from the pool, one photo of one observation, never a wink.
    const L = pool();
    for (let i = 0; i < 300; i++) {
      const t = L[i % L.length],
        set = photoSet(t),
        ch = distractors(t, L, i % 4);
      ok(set.shown.length === 1, `${t}: one photo per question`);
      ok(
        set.shown.every(x => GX(t).views.wide.some(y => y.f === x.f)),
        `${t}: its own photos`
      );
      ok(ch.length === 3 && ch.every(n => L.includes(n) && n !== t), `${t}: 3 choices from the fish slate`);
    }
    ok(!FISH.winks.some(n => pool().includes(n)), 'winks never in the draw');
    // Sheet-only photos (fish-photos.json sheet, core.js fishGen; Pierre, 2026-11-05: a species with no game photo may
    // keep one for its sheet, never in the quiz or any game): in FISH.sheet by species, in no unit's game
    // photos (entries, scientific genera, winks), never drawn.
    const SH = new Set(
      Object.values(FISH.sheet || {})
        .flat()
        .map(x => x.f)
    );
    ok(
      ['s105'].every(id => (FISH.sheet[id] || []).every(x => x.use === 'ref') && FISH.sheet[id].length),
      'sheet: the covers'
    );
    const units = Object.keys(FISH.gen);
    ok(!units.some(n => GX(n).views.wide.some(x => SH.has(x.f) || x.use === 'ref')), 'sheet: no sheet-only photo among game photos');
    units
      .filter(n => GX(n).views.wide.length)
      .forEach(n => {
        for (let i = 0; i < 3; i++) ok(!photoSet(n).shown.some(x => SH.has(x.f)), `${n}: a sheet-only photo drawn`);
      });
    // Play the real quiz screen: 30 answers, right or wrong, cards closed; no wink so early (Pierre, 2026-11-06: his second
    // fish question was the whale shark; none before WINK.AT[0] answers).
    ok(answersSoFar() + 30 < WINK.AT[0], 'the smoke starts far below the first surprise');
    const coralBefore = localStorage.getItem('reefid-sync-coral-progress');
    for (let i = 0, asked = 0; asked < 30 && i < 60; i++) {
      closeCards();
      if (!document.querySelector('#view .q')) quizPhoto();
      const q = SHOWNQ;
      if (document.querySelector('#view .q.wink')) {
        ok(false, `a wink at ${answersSoFar()} answers`);
        document.querySelector('#view [data-w]').click();
        route();
        continue;
      }
      ok(q && FISH.c1.includes(q[1]), 'question on an IMR entry');
      const ans = document.querySelectorAll('#view [data-c]');
      if (ans.length) {
        ok(
          [...ans].every(b => GX(b.dataset.c) && GX(b.dataset.c).name),
          'every choice is a fish entry'
        );
        ans[i % 3 === 0 ? (ans[0].dataset.c === q[1] ? 1 : 0) : [...ans].findIndex(b => b.dataset.c === q[1])].click();
      } else {
        const f = document.querySelector('#view .tyform');
        f.querySelector('input').value = GX(q[1]).name;
        f.requestSubmit();
      }
      asked++;
      route();
    }
    const fish = JSON.parse(localStorage.getItem('reefid-sync-fish-progress') || '{}');
    ok(
      Object.keys(fish)
        .filter(n => n !== '~level')
        .every(n => GX(n) && GX(n).name),
      'fish progress holds fish entries only'
    );
    ok(answersSoFar() >= 30, 'answers counted in the fish progress');
    ok(localStorage.getItem('reefid-sync-coral-progress') === coralBefore, 'coral progress untouched by fish answers');
    // Fish answers are logged from the first answer (Pierre, 2026-11-06; sheet v60): queued for the sheet (signed out:
    // LOG0 and the anonymous queue; a local copy sends nothing, rule D1) with their subject, the rank asked, the names
    // at that rank and the species shown; never the corals' anonymous base (ANONB: the corals' replay only).
    const L0 = JSON.parse(localStorage.getItem('reefid-log0') || '[]');
    ok(
      L0.length >= 30 && L0.every(a => a.s === 'fish' && ['family', 'genus'].includes(a.rk) && a.tn === GX(a.g).name),
      'fish answers logged with their subject, rank and name: ' + JSON.stringify(L0.slice(0, 2))
    );
    ok(JSON.parse(localStorage.getItem('reefid-anonq') || '[]').length === L0.length, 'fish answers queued for the anonymous send');
    ok(L0.filter(a => a.sp).length >= L0.length / 2, 'the species shown logged: ' + JSON.stringify(L0.map(a => a.sp).slice(0, 5)));
    ok(!localStorage.getItem('reefid-anon-base'), 'no coral anonymous base from fish answers');
    // Typed names.
    const tm = x => typeMatch(x) && typeMatch(x).g;
    ok(tm('Damselfish') === 't01' && tm('Chromis') === 't01' && tm('Pomacentridae') === 't01', 'typed: names of Damselfish');
    ok(tm('unicornfish') === 't06' && tm('Moorish idol') === 't05', 'typed: parts and two-word names');
    ok(!tm('Acropora'), 'typed: a genus is no fish entry');
    // Winks for a circle-1 player: made due at this count (the first threshold moved here, the counts left as they are),
    // shown, answered, never counted.
    const P0 = JSON.stringify(P),
      W0 = WINK.AT.slice();
    WINK.AT[0] = answersSoFar();
    closeCards();
    quizPhoto();
    const wk = document.querySelector('#view .q.wink');
    ok(!!wk, 'a wink comes for a circle-1 player');
    if (wk) {
      const n = UNITS[SUBJ.id].winks()[0], // the first surprise: the first wink
        w = GX(n).wink,
        labels = [...wk.querySelectorAll('[data-w]')].map(b => b.textContent.slice(1));
      ok(w.choices.every(([, l]) => labels.includes(l)) && labels.includes(GX(n).name), 'wink: its name and the absurd choices');
      wk.querySelector(`[data-w="${w.choices[0][0]}"]`).click();
      ok(document.querySelector('#after').textContent.includes(w.wrong), 'wink: the wrong line');
      ok(JSON.stringify(P) === P0, 'wink: not counted');
      ok(localStorage.getItem('reefid-fish-wink') === '0', 'wink: kept as shown on this device');
      route();
      closeCards();
      quizPhoto();
      ok(!document.querySelector('#view .q.wink'), 'wink: not again in its window');
    }
    WINK.AT.splice(0, 2, ...W0);
    // Circle 2: offered once every IMR entry was asked; "Not now" kept.
    ok(!bonusOfferDue(), 'no offer before every IMR entry is asked');
    FISH.c1.forEach(n => (st(n).ok = st(n).ok || 1));
    const S2 = bonusOfferDue();
    ok(S2 && S2.k === 'c2', 'circle 2 offered once every IMR entry is asked');
    bonusOfferShow(S2);
    document.querySelector('.unlock .sec').click();
    ok(Q.c2 === false && (!bonusOfferDue() || bonusOfferDue().k !== 'c2'), '"Not now" kept');
    // Circle 3: once the progress reaches FISH_C3.
    ok(!bonusOfferDue(), 'circle 3 not before the progress threshold');
    FISH.c1.forEach(n => (st(n).pg = 0.7));
    const S3 = bonusOfferDue();
    ok(S3 && S3.k === 'c3', 'circle 3 offered at the threshold');
    const pct = progPct();
    bonusSet(true, 'c3');
    ok(
      pool().some(n => FISH.c3.includes(n)),
      'circle 3 in the draw once on'
    );
    ok(progPct() === pct, 'circle 3 never counted in the progress');
    bonusSet(false, 'c3');
    ok(!pool().some(n => FISH.c3.includes(n)), 'Off: out of the draw');
    // The scientific genera (app.js fishGenera, docs/FISH_PATH.md "Levels", branch B): one unit per genus of the
    // circle-1 species of each IMR entry, never two entries; offered once an entry is at Advanced, a family's genera in
    // play only from its Advanced; their questions and typed answers among genera only, an entry's among entries; never
    // counted in the progress, never a duel pair.
    const sci = SETS().find(S => S.k === 'sci'),
      G = FISH.sci;
    ok(G.length > 50 && G.every(n => GX(n).rank === 'genus' && FISH.c1.includes(GX(n).parent)), 'sci: genera of the IMR entries');
    ok(
      G.every(n => GX(n).species.every(id => GX(GX(n).parent).views && FISH.gen[GX(n).parent])) &&
        new Set(G.map(n => GX(n).name)).size === G.length,
      'sci: a genus in one entry only'
    );
    ok(
      G.every(n => isBonus(n) && setOf(n) === sci),
      'sci: every genus in its set, opened or not'
    );
    FISH.c1.forEach(n => (st(n).pg = 0.2));
    ok(!sci.units().length, 'sci: no genus in play before an entry is at Advanced');
    st('t02').pg = 0.72;
    ok(sci.units().length && sci.units().every(n => GX(n).parent === 't02'), 'sci: the genera of the entry at Advanced only');
    ok(bonusOfferDue() && bonusOfferDue().k === 'sci', 'sci: offered once an entry is at Advanced');
    const pc = progPct();
    bonusSet(true, 'sci');
    ok(pool().some(n => GX(n).rank) && pool().every(n => !GX(n).rank || GX(n).parent === 't02'), 'sci: on, the genera in play');
    ok(progPct() === pc, 'sci: never counted in the progress');
    const g0 = pool().find(n => GX(n).rank),
      e0 = 't02';
    ok(
      distractors(g0, pool(), 3).every(n => GX(n).rank === 'genus'),
      'sci: a genus question offers genera only'
    );
    ok(
      distractors(e0, pool(), 3).every(n => !GX(n).rank),
      'sci: an entry question offers entries only'
    );
    ok(!UNITS.fish.pairs().some(pr => pr.some(n => GX(n).rank)), 'sci: no duel pair of genera');
    ok(typeMatch('Chromis').g === 't01' && typeMatch('Chromis', 'genus').g === 'g:Chromis', 'sci: typed Chromis by rank');
    // Codex review #526: a genus's WoRMS-accepted name is accepted when typed (Pseudanthias tuka is now Mirolabrichthys).
    ok(typeMatch('Mirolabrichthys', 'genus') && typeMatch('Mirolabrichthys', 'genus').g === 'g:Pseudanthias', 'sci: typed accepted genus');
    // Codex review #526: a family with a single genus at Advanced still gets 3 wrong genus names (any genus may be a
    // wrong choice, as in the quiz); a genus card's photo is its easiest, most reference-like one, whoever took it
    // (Pierre, 2026-11-06: no source tier for fish), and a never-seen photo of Pierre's gets no draw bonus.
    st('t02').pg = 0.2;
    st('t04').pg = 0.72;
    const pl = pool().filter(n => GX(n).rank);
    ok(pl.length === 1 && GX(pl[0]).parent === 't04', 'sci: Spadefish alone, one genus in play');
    ok(distractors(pl[0], pool(), 0).length === 3, 'sci: still 3 wrong genus names');
    ok(
      G.every(n => {
        const w = GX(n).views.wide;
        // the first of its reference-level photos when it has any (core.js refFirst), else its easiest
        const top = w.filter(p => refFirst(p) === refFirst(w[0]));
        return !w.length || (GX(n).cover === w[0].f && top.every(p => photoDiff(n, p) >= photoDiff(n, w[0])));
      }),
      "sci: a genus card's photo is its easiest (reference level first)"
    );
    ok(!isCore({own: true, e: 5}), "fish: Pierre's own photo gets no draw bonus");
    bonusSet(false, 'sci');
    ok(!pool().some(n => GX(n).rank), 'sci: Off, out of the draw');
    // Report a problem after a fish answer (fish beta sweep, 2026-11-05: the right-answer list offered the teaching ids,
    // "t01", and the dialog spoke of genera and corals): the fish names, in the fish words.
    closeCards();
    quizPhoto();
    const rq = document.querySelector('#view [data-c]');
    if (rq) rq.click();
    else {
      const f = document.querySelector('#view .tyform');
      f.querySelector('input').value = GX(SHOWNQ[1]).name;
      f.requestSubmit();
    }
    const rb = document.querySelector('#view [data-rep]');
    ok(rb, 'report: a Report button after the answer');
    if (rb) {
      rb.click();
      const dl = document.querySelector('#repdlg');
      const opts = [...dl.querySelectorAll('#repgen option')].map(o => o.value);
      ok(opts.length >= 27 && opts.includes('Damselfish'), 'report: the fish names offered ' + opts.slice(0, 3));
      ok(!opts.some(o => /^t\d+$/.test(o)), 'report: no teaching id offered ' + opts.filter(o => /^t\d+$/.test(o)).slice(0, 3));
      const txt = dl.textContent;
      ok(/Right family, if you know/.test(txt) && /Several fish/.test(txt), 'report: the fish words');
      ok(!/genus|coral/i.test(txt), 'report: no coral words: ' + txt.replace(/\s+/g, ' ').slice(0, 160));
      ok(!/\bt\d\d\b/.test(dl.querySelector('input[name="fix"]').placeholder), 'report: no teaching id as the example');
      dl.close();
    }
    return fails;
  });
  // Back to corals: the coral slate and its progress.
  const back = await p.evaluate(async () => {
    await setSubject('coral');
    return {subj: SUBJ.id, slate: slateGenera().length, ac: (P.Acropora || {}).ok, fish: localStorage.getItem('reefid-sync-subject')};
  });
  // The screens the admin sees in the fish beta, at 390 and 1280 px (light theme): the subject switch in its two places,
  // one state (Pierre, 2026-11-04; docs/DESIGN.md "Subject switch"): a Corals | Fish row at the top of Home and a chip
  // next to the logo in the header, on every page, its small menu with both subjects; the header keeps its size and Home
  // still fits one screen; no Tools tile and no emoji on the links to Tools any more (the chip is the way back). Then a
  // fish question (4 upright names); the enlarged photo before the answer credits its author by name only (blindCredit:
  // no taxon, no link); after the answer the full credit with its iNaturalist link; My progress; a wink once; back to the
  // corals through the header chip; nothing wider than the screen on any of them.
  const ui = [];
  for (const width of [390, 1280]) {
    const c2 = await b.newContext({viewport: {width, height: width < 600 ? 844 : 800}, serviceWorkers: 'block'});
    await c2.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c2.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-ui')) {
          sessionStorage.setItem('fish-ui', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
        }
      } catch (e) {}
    });
    const q = await c2.newPage();
    q.on('pageerror', e => errs.push(`${width}px: ${e.message}`));
    const wide = async what => {
      const w = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (w > 0) ui.push(`${width}px ${what}: ${w}px wider than the screen`);
    };
    // The two switches and the header: which subject each one shows, the chip's place (next to the logo, inside the
    // header's one line, clear of the controls), the header's height with and without the chip (rule U3), Home's height.
    const look = () =>
      q.evaluate(() => {
        const row = document.querySelector('#view .hsubj'),
          chip = document.getElementById('subjb'),
          hdr = document.querySelector('header'),
          box = e => e && e.getBoundingClientRect(),
          home = box(document.querySelector('.brand .home')),
          cb = box(chip),
          tools = [...document.querySelectorAll('.hdr-tools > :not([hidden]):not(.setpop)')].filter(e => e.offsetParent).map(box),
          h1 = hdr.offsetHeight,
          wrap = document.getElementById('subjc');
        if (wrap) wrap.hidden = true;
        const h0 = hdr.offsetHeight;
        if (wrap) wrap.hidden = false;
        return {
          subj: SUBJ.id,
          row: row
            ? [...row.querySelectorAll('[data-subj]')]
                .map(x => x.dataset.subj + (x.getAttribute('aria-pressed') === 'true' ? '*' : ''))
                .join()
            : '',
          rowFull: row
            ? Math.abs(row.getBoundingClientRect().width - document.querySelector('#view .hdoors').getBoundingClientRect().width) < 2
            : false,
          rowFirst: row ? row.getBoundingClientRect().bottom <= document.querySelector('#view .hdoors').getBoundingClientRect().top : false,
          chip: chip && chip.offsetParent ? chip.getAttribute('aria-label') : '',
          nextToLogo: !!(cb && home && cb.left >= home.right - 1 && cb.left - home.right < 24),
          clear: !!cb && tools.every(t => cb.right <= t.left || cb.left >= t.right),
          inLine: !!cb && cb.top >= hdr.getBoundingClientRect().top && cb.bottom <= hdr.getBoundingClientRect().top + h0,
          hdr: [h0, h1],
          fits: document.documentElement.scrollHeight <= innerHeight + 1
        };
      });
    // Home, corals on: the row (Corals pressed), the chip (Corals), Home one screen, the header's size unchanged.
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    const h0 = await look();
    if (h0.subj !== 'coral' || !/coral\*/.test(h0.row) || !/fish(?!\*)/.test(h0.row) || !h0.rowFull || !h0.rowFirst)
      ui.push(`${width}px Home, Corals on: no Corals | Fish row at the top ${JSON.stringify(h0)}`);
    if (!/Corals/.test(h0.chip) || !h0.nextToLogo || !h0.clear || !h0.inLine || h0.hdr[0] !== h0.hdr[1])
      ui.push(`${width}px header chip, Corals on: ${JSON.stringify(h0)}`);
    if (!h0.fits) ui.push(`${width}px Home with the subject row: more than one screen ${JSON.stringify(h0)}`);
    await wide('Home');
    // Fish chosen on Home: saved, everything follows (the row, the chip, the Learn door's photos are fish).
    if (!(await q.$('#view .hsubj [data-subj="fish"]'))) {
      await c2.close();
      continue;
    }
    await q.click('#view .hsubj [data-subj="fish"]');
    await q.waitForFunction(() => SUBJ.id === 'fish' && typeof FISH === 'object' && FISH && document.querySelector('#view .hsubj'), null, {
      timeout: 30000
    });
    const h1 = await look();
    const saved = await q.evaluate(() => localStorage.getItem('reefid-sync-subject'));
    if (saved !== '"fish"' || !/fish\*/.test(h1.row) || !/Fish/.test(h1.chip) || h1.hdr[0] !== h1.hdr[1] || !h1.fits)
      ui.push(`${width}px Fish chosen on Home: ${JSON.stringify({...h1, saved})}`);
    await wide('Home, Fish on');
    // Tools: no subject tile and no emoji on the links to Tools any more; the chip is there, on every page.
    await q.evaluate(() => (location.hash = '#tools'));
    await q.waitForFunction(() => document.querySelector('#view .labhub'), null, {timeout: 15000});
    const tl = await q.evaluate(() => ({
      tile: !!document.querySelector('#view .labsubj, #view [data-subj]'),
      badge: [...document.querySelectorAll('.labgo, .sections a[data-tab="lab"]')].some(a => a.dataset.badge),
      chip: (document.getElementById('subjb') || {}).offsetParent ? document.getElementById('subjb').getAttribute('aria-label') : ''
    }));
    if (tl.tile || tl.badge || !/Fish/.test(tl.chip)) ui.push(`${width}px Tools with Fish on: ${JSON.stringify(tl)}`);
    // The families page (learn.js viewFishList): the groups of the identification key in force (fish.json key,
    // rule S3), in the key's order, only those that hold an IMR entry, each under its number and title as the key prints
    // them, every entry under its own group; the key credited in full under the list.
    await q.evaluate(() => (location.hash = '#learn/genera'));
    await q.waitForFunction(() => document.querySelector('#view .gdiv'), null, {timeout: 15000});
    const fam = await q.evaluate(() => {
      const K = FISH.key || {},
        G = FISH.groups,
        heads = [...document.querySelectorAll('#view .gblk')].map(b => ({
          n: +b.querySelector('.gn').textContent,
          t: b.querySelector('.gt').textContent,
          ids: [...b.querySelectorAll('.tipg .tipph b')].map(x => x.textContent)
        })),
        c1 = heads.filter(h => G.some(g => g.n === h.n)),
        want = G.filter(g => FISH.c1.some(n => GX(n).group === g.n)).map(g => g.n),
        cite = (document.querySelector('#view .keycite') || {}).textContent || '';
      return {
        order: c1.map(h => h.n).join() === want.join(),
        titles: c1.every(h => (G.find(g => g.n === h.n) || {}).title === h.t),
        placed: c1.every(h => h.ids.every(nm => FISH.c1.some(n => unameT(n) === nm && GX(n).group === h.n))),
        got: c1.map(h => h.n).join(),
        want: want.join(),
        cite: !!K.cite && cite.includes(K.cite)
      };
    });
    if (!fam.order || !fam.titles || !fam.placed || !fam.cite) ui.push(`${width}px families page: ${JSON.stringify(fam)}`);
    await wide('the families page');
    // The family sheets (learn.js viewFishSheet; the fish-sheets study, option B): a family on the families page opens its
    // sheet, under the book's English name with its scientific name below; an old entry id links to its family; the only
    // genus of a family opens the family sheet; the species filter is on by default and one tap shows them all.
    await q.click('#view .tipg a.tipph');
    await q.waitForFunction(() => document.querySelector('#view .fsheet'), null, {timeout: 15000});
    const sh = await q.evaluate(() => ({
      hash: location.hash,
      title: (document.querySelector('#view .fn-t') || {}).textContent,
      sci: (document.querySelector('#view .fn-s') || {}).textContent || '',
      tips: !!document.querySelector('#view .tipbox .idtips li'),
      rows: document.querySelectorAll('#view .frow').length,
      bar: (document.querySelector('#modes .ctx-t') || {}).textContent || '',
      old: hr('g-t02'),
      wide: document.documentElement.scrollWidth <= innerWidth
    }));
    if (!/^#fish\/learn\/family\/\w+$/.test(sh.hash) || !sh.title || !sh.sci || !sh.tips || !sh.rows || !sh.bar.includes(sh.title))
      ui.push(`${width}px family sheet: ${JSON.stringify(sh)}`);
    if (sh.old !== '#fish/learn/family/Butterflyfishes' || !sh.wide) ui.push(`${width}px family sheet links: ${JSON.stringify(sh)}`);
    await wide('a family sheet');
    await q.evaluate(() => (location.hash = '#fish/learn/genus/Platax'));
    await q
      .waitForFunction(
        () => location.hash === '#fish/learn/family/Spadefishes' && document.querySelector('#view .fsheet [data-mine]'),
        null,
        {
          timeout: 15000
        }
      )
      .catch(() => {});
    const sp = await q
      .evaluate(() => {
        const a = document.querySelectorAll('#view .ftiles:not(.juv) .ftile').length;
        document.querySelector('#view .seg [data-mine="0"]').click();
        return {hash: location.hash, mine: a, all: document.querySelectorAll('#view .ftiles:not(.juv) .ftile').length};
      })
      .catch(e => ({err: e.message}));
    if (sp.hash !== '#fish/learn/family/Spadefishes' || sp.all !== 5 || sp.mine !== 0)
      ui.push(`${width}px Spadefishes sheet: ${JSON.stringify(sp)}`);
    await q.evaluate(() => (location.hash = '#practice/quiz'));
    await q.waitForFunction(() => document.querySelector('#view .q'), null, {timeout: 15000});
    // The first-meeting cards over the first question: closed one by one with their own button.
    for (let i = 0; i < 8 && (await q.$('.unlock')); i++) await q.click('.unlock .next:not(.sec)');
    const qs = await q.evaluate(() => {
      const B = [...document.querySelectorAll('#view .ans [data-c]')];
      return {n: B.length, plain: B.every(x => x.classList.contains('plain')), fish: B.every(x => GX(x.dataset.c) && GX(x.dataset.c).name)};
    });
    if (qs.n !== 4 || !qs.plain || !qs.fish) ui.push(`${width}px question: ${JSON.stringify(qs)}`);
    await wide('a fish question');
    await q.click('#view .qph .zoom');
    const blind = await q.evaluate(() => {
      const c = document.querySelector('#lightbox .lb-cap');
      return {t: c ? c.textContent : '', links: c ? c.querySelectorAll('a').length : -1, sp: SHOWNQ ? GX(SHOWNQ[1]).name : ''};
    });
    if (!/©\s*\S/.test(blind.t) || blind.links || (blind.sp && blind.t.includes(blind.sp)))
      ui.push(`${width}px enlarged photo before the answer: ${JSON.stringify(blind)}`);
    await q.click('#lightbox [data-x]');
    await q.click('#view .ans [data-c]');
    const after = await q.evaluate(() => {
      const fb = document.querySelector('#after .fb'),
        cr = fb && fb.querySelector('.credit a[href*="inaturalist.org"]');
      return {fb: !!fb, credit: !!cr, h3: fb ? fb.querySelector('h3').textContent : ''};
    });
    if (!after.fb || !after.credit) ui.push(`${width}px answer: no full credit with its link ${JSON.stringify(after)}`);
    await wide('the answer');
    await q.evaluate(() => (location.hash = '#progress'));
    await q.waitForFunction(() => document.querySelector('#view .pgame'), null, {timeout: 15000});
    await wide('My progress');
    // A wink, made due at this count (the first threshold moved here, none shown yet).
    const wk = await q.evaluate(() => {
      location.hash = '#practice/quiz';
      return new Promise(ok =>
        setTimeout(() => {
          document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
          WINK.AT[0] = answersSoFar();
          delete WINKS[SUBJ.id];
          localStorage.removeItem('reefid-fish-wink');
          quizPhoto();
          ok({wink: !!document.querySelector('#view .q.wink'), seen: WINKS[SUBJ.id]});
        }, 300)
      );
    });
    if (!wk.wink || wk.seen !== 0) ui.push(`${width}px wink: ${JSON.stringify(wk)}`);
    await wide('a wink');
    // Back to the corals through the header chip: its menu holds both subjects; a choice closes it.
    await q.evaluate(() => (location.hash = '#practice/quiz'));
    await q.waitForFunction(() => document.querySelector('#view .q'), null, {timeout: 15000});
    for (let i = 0; i < 8 && (await q.$('.unlock')); i++) await q.click('.unlock .next:not(.sec)');
    await q.click('#subjb');
    const menu = await q.evaluate(() => {
      const m = document.getElementById('subjmenu');
      return {
        open: !!m && !m.hidden && !!m.offsetParent,
        expanded: document.getElementById('subjb').getAttribute('aria-expanded'),
        items: m
          ? [...m.querySelectorAll('[data-subj]')].map(x => x.dataset.subj + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')).join()
          : '',
        inside: !!m && m.getBoundingClientRect().right <= innerWidth && m.getBoundingClientRect().left >= 0
      };
    });
    if (!menu.open || menu.expanded !== 'true' || !/fish\*/.test(menu.items) || !/coral(?!\*)/.test(menu.items) || !menu.inside)
      ui.push(`${width}px header chip's menu: ${JSON.stringify(menu)}`);
    await wide('the chip menu open');
    await q.click('#subjmenu [data-subj="coral"]');
    await q.waitForFunction(() => SUBJ.id === 'coral', null, {timeout: 15000});
    const bk = await q.evaluate(() => ({
      slate: slateGenera().length,
      saved: localStorage.getItem('reefid-sync-subject'),
      chip: document.getElementById('subjb').getAttribute('aria-label'),
      closed: document.getElementById('subjmenu').hidden,
      expanded: document.getElementById('subjb').getAttribute('aria-expanded')
    }));
    if (bk.slate < 39 || bk.saved !== '"coral"' || !/Corals/.test(bk.chip) || !bk.closed || bk.expanded !== 'false')
      ui.push(`${width}px back to Corals through the header chip: ${JSON.stringify(bk)}`);
    // The menu closes with Escape and with a tap elsewhere, choosing nothing.
    await q.evaluate(() => (location.hash = '#about'));
    await q.waitForFunction(() => document.querySelector('#view .about p'), null, {timeout: 15000});
    await q.click('#subjb');
    await q.keyboard.press('Escape');
    const esc1 = await q.evaluate(() => document.getElementById('subjmenu').hidden);
    await q.click('#subjb');
    await q.click('#view .about p');
    const out1 = await q.evaluate(() => ({closed: document.getElementById('subjmenu').hidden, subj: SUBJ.id}));
    if (!esc1 || !out1.closed || out1.subj !== 'coral')
      ui.push(`${width}px chip menu: Escape ${esc1}, a tap elsewhere ${JSON.stringify(out1)}`);
    await c2.close();
  }
  // Identify per subject (Pierre, 2026-11-04; ROADMAP "Identify per subject"): Identify shows the current subject's tool
  // only. Fish on: the Identify tab (#idkey) opens the Fish ID Key, "coming soon", never the Coral ID Key; Home's
  // Identify door names the fish and leads there; the corals chosen on that page bring the Coral ID Key, and the Fish ID
  // Key's address with the corals on opens the Coral ID Key. A link into the Coral ID Key with its clues (#idkey|...)
  // brings the corals on screen, as a genus sheet's does. 390 and 1280 px, nothing wider than the screen.
  for (const width of [390, 1280]) {
    const c5 = await b.newContext({viewport: {width, height: width < 600 ? 844 : 800}, serviceWorkers: 'block'});
    await c5.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c5.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-id')) {
          sessionStorage.setItem('fish-id', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-subject', '"fish"');
        }
      } catch (e) {}
    });
    const q = await c5.newPage();
    q.on('pageerror', e => errs.push(`${width}px Identify: ${e.message}`));
    const wide = async what => {
      const w = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (w > 0) ui.push(`${width}px ${what}: ${w}px wider than the screen`);
    };
    const page = () =>
      q.evaluate(() => ({
        subj: SUBJ.id,
        hash: location.hash,
        soon: !!document.querySelector('#view .keysoon'),
        text: (document.querySelector('#view') || {}).textContent.replace(/\s+/g, ' '),
        coralKey: !!document.querySelector('#view #labroot'),
        tab: (document.querySelector('nav [data-tab="identify"][aria-current="page"]') || {}).textContent || ''
      }));
    await q.goto(base + '#home');
    await q.waitForFunction(
      () => window.APP_READY && typeof FISH === 'object' && FISH && document.querySelector('#view .home-page'),
      null,
      {
        timeout: 30000
      }
    );
    const door = await q.evaluate(() => {
      const d = document.querySelector('#view .hdoor.identify');
      return {
        title: d ? d.querySelector('h2').textContent : '',
        links: d ? [...new Set([...d.querySelectorAll('a')].map(a => a.getAttribute('href')))].join() : '',
        coral: d ? /coral|ReefCloud/i.test(d.textContent) : true
      };
    });
    if (door.title !== 'Identify a fish' || door.links !== '#fish/identify/key' || door.coral)
      ui.push(`${width}px Home's Identify door, Fish on: ${JSON.stringify(door)}`);
    await wide('Home, Fish on');
    await q.evaluate(() => (location.hash = '#identify/key'));
    await q.waitForFunction(() => window.ROUTED === 'fishkey', null, {timeout: 15000}).catch(() => {});
    const f = await page();
    if (
      f.subj !== 'fish' ||
      f.hash !== '#fish/identify/key' ||
      !f.soon ||
      !/Fish ID Key/.test(f.text) ||
      !/coming soon/i.test(f.text) ||
      f.coralKey ||
      !f.tab
    )
      ui.push(`${width}px Identify, Fish on: ${JSON.stringify({...f, text: f.text.slice(0, 160)})}`);
    // The header's Identify tab links to the Fish ID Key's own address, its prefix included (Codex review #612): copied
    // and opened on a device with the corals on, it opens the fish page.
    const idh = await q.evaluate(() => [...document.querySelectorAll('a[data-tab="identify"]')].map(a => a.getAttribute('href')).join());
    if (!idh || idh.split(',').some(x => x !== '#fish/identify/key')) ui.push(`${width}px the header's Identify link, Fish on: ${idh}`);
    await wide('the Fish ID Key');
    // The corals chosen on that page: the Coral ID Key.
    await q.evaluate(() => setSubject('coral'));
    // The route is drawn (ROUTED) before the Coral ID Key's own script is in: a Tools page shows "Loading…" until then
    // (proto/lab.js). Wait for the key's text, not only the route (on a loaded machine the check read "Loading…").
    await q
      .waitForFunction(
        () =>
          SUBJ.id === 'coral' &&
          window.ROUTED === 'idkey' &&
          /Coral ID Key|growth form/i.test((document.querySelector('#view') || {}).textContent || ''),
        null,
        {timeout: 30000}
      )
      .catch(() => {});
    const c = await page();
    if (c.hash !== '#identify/key' || c.soon || !/Coral ID Key|growth form/i.test(c.text))
      ui.push(`${width}px corals chosen on the Fish ID Key: ${JSON.stringify({...c, text: c.text.slice(0, 160)})}`);
    // The Fish ID Key's address with the corals on: the address says its subject, so Fish comes on screen (URL refonte,
    // Q53-Q56: a fish page can be linked).
    await q.evaluate(() => (location.hash = '#fish/identify/key'));
    await q.waitForFunction(() => SUBJ.id === 'fish' && window.ROUTED === 'fishkey', null, {timeout: 15000}).catch(() => {});
    const c2b = await page();
    if (c2b.subj !== 'fish' || c2b.hash !== '#fish/identify/key' || !c2b.soon)
      ui.push(`${width}px #fish/identify/key with the corals on: ${JSON.stringify({...c2b, text: ''})}`);
    // Back to fish; then a link into the Coral ID Key with its clues brings the corals.
    await q.evaluate(() => setSubject('fish'));
    await q.waitForFunction(() => SUBJ.id === 'fish' && window.ROUTED === 'fishkey', null, {timeout: 15000}).catch(() => {});
    const f2 = await page();
    if (f2.hash !== '#fish/identify/key' || !f2.soon)
      ui.push(`${width}px Fish chosen on the Coral ID Key: ${JSON.stringify({...f2, text: ''})}`);
    await q.evaluate(() => (location.hash = '#identify/key?form=B'));
    await q.waitForFunction(() => SUBJ.id === 'coral', null, {timeout: 15000}).catch(() => {});
    await q.waitForTimeout(400);
    const d = await page();
    if (d.subj !== 'coral' || !d.hash.startsWith('#identify/key?form=B') || d.soon)
      ui.push(`${width}px a Coral ID Key link with Fish on: ${JSON.stringify({...d, text: ''})}`);
    // A fish page linked straight (URL refonte, Q53-Q56: the subject prefix in the app's addresses): a new tab on a fish
    // address opens that page with Fish on screen; a coral address without a prefix keeps the subject chosen there.
    for (const [h, key] of [
      ['fish/practice/quiz', 'quiz'],
      ['fish/learn/' + C.SUBJECTS.find(x => x.hash).many, 'genera']
    ]) {
      const q5 = await c5.newPage();
      await q5.goto(base + '#' + h);
      await q5.waitForFunction(k => window.ROUTED === k && SUBJ.id === 'fish', key, {timeout: 20000}).catch(() => {});
      const at = await q5.evaluate(() => ({subj: SUBJ.id, key: window.ROUTED, hash: location.hash}));
      if (at.subj !== 'fish' || at.key !== key || at.hash !== '#' + h) ui.push(`${width}px fish deep link #${h}: ${JSON.stringify(at)}`);
      await q5.close();
    }
    await c5.close();
  }
  // The admin's header with the subject chip fits one line on the narrowest phones, signed out (the Sign in pill shown)
  // and signed in: no sideways scroll at 320 and 360 px (the logotype and the chip's caret step aside there, app.css).
  for (const width of [320, 360]) {
    const c4 = await b.newContext({viewport: {width, height: 640}, serviceWorkers: 'block'});
    await c4.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c4.addInitScript(() => {
      try {
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-admin-vault', 'smoke');
      } catch (e) {}
    });
    const q = await c4.newPage();
    q.on('pageerror', e => errs.push(`${width}px narrow header: ${e.message}`));
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    for (const signed of [false, true]) {
      const m = await q.evaluate(s => {
        document.getElementById('signb').hidden = s;
        const c = document.getElementById('subjb');
        return {chip: !!(c && c.offsetParent), over: document.documentElement.scrollWidth - innerWidth};
      }, signed);
      if (!m.chip || m.over > 0) ui.push(`${width}px admin header ${signed ? 'signed in' : 'signed out'}: ${JSON.stringify(m)}`);
    }
    await c4.close();
  }
  // Fish opening to a group (served so here, above): a player who is not the admin (no admin token; or the admin token in
  // ⚙ View: User), with Fish saved on this device
  // (chosen when the switch was on Home) and fish progress: the corals on screen, fish.json not even loaded, no subject
  // switch on Home, in the header, in ⚙ or in Tools, no fish emoji on the link to Tools; a switch or a link asking for
  // Fish keeps the corals; the saved choice and the fish progress stay as they were. 390 and 1280 px.
  for (const [width, user] of [
    [390, 'player'],
    [1280, 'player'],
    [1280, 'admin in View: User']
  ]) {
    const c6 = await b.newContext({viewport: {width, height: width < 600 ? 844 : 800}, serviceWorkers: 'block'});
    await c6.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    // Fish opens to all since 2026-11-06 (Q158): closed to a player outside its group, checked on fish served with
    // open: 'group'.
    await c6.route(
      u => u.href.startsWith(base) && u.pathname === '/core.js',
      async r => {
        const res = await r.fetch(),
          t = await res.text();
        if (!t.includes("open: 'all'")) ui.push("core.js: no open: 'all' to set back to 'group'");
        await r.fulfill({response: res, body: t.replace("open: 'all'", "open: 'group'")});
      }
    );
    await c6.addInitScript(asUser => {
      try {
        if (!sessionStorage.getItem('fish-ra')) {
          sessionStorage.setItem('fish-ra', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
          localStorage.setItem('reefid-sync-fish-progress', JSON.stringify({t01: {ok: 4, ko: 1}}));
          if (asUser) {
            localStorage.setItem('reefid-admin-vault', 'smoke');
            localStorage.setItem('reefid-admin-view', 'user');
          }
        }
      } catch (e) {}
    }, user !== 'player');
    const q = await c6.newPage();
    q.on('pageerror', e => errs.push(`${width}px ${user}: ${e.message}`));
    const wide = async what => {
      const w = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (w > 0) ui.push(`${width}px ${user} ${what}: ${w}px wider than the screen`);
    };
    const look = () =>
      q.evaluate(() => ({
        subj: SUBJ.id,
        fish: !!FISH,
        sw: document.querySelectorAll('[data-subj], .hsubj, #subjb, #subjset, .labsubj').length,
        // Every word on screen and in ⚙ (hidden but in the page) but the fish opt-in rows, hidden while the corals are on.
        words: /\bfish|beta\b|fishy/i.test(
          [...document.querySelectorAll('header, #view')]
            .map(e => {
              const c = e.cloneNode(true);
              c.querySelectorAll('[data-for]:not([data-for="coral"])').forEach(r => r.remove());
              return c.textContent;
            })
            .join(' ')
        ),
        badge: [...document.querySelectorAll('.labgo, .sections a[data-tab="lab"]')].some(a => a.dataset.badge)
      }));
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    const h = await look();
    if (h.subj !== 'coral' || h.fish || h.sw || h.words || h.badge) ui.push(`${width}px ${user}, Home: ${JSON.stringify(h)}`);
    await wide('Home');
    await q.evaluate(() => (location.hash = '#tools'));
    await q.waitForFunction(() => document.querySelector('#view .labhub'), null, {timeout: 30000});
    const t = await look();
    if (t.subj !== 'coral' || t.sw || t.words || t.badge) ui.push(`${width}px ${user}, Tools: ${JSON.stringify(t)}`);
    await wide('Tools');
    // Asked for anyway: a switch (an old page's button, the console), then the Learn and Practice pages.
    await q.evaluate(() => setSubject('fish'));
    for (const hash of ['genera', 'quiz']) {
      await q.evaluate(x => (location.hash = '#' + x), addr(hash));
      await q.waitForTimeout(600);
      const g = await q.evaluate(() => ({
        subj: SUBJ.id,
        fish: !!FISH,
        units: slateGenera().every(n => !(GX(n) || {}).name)
      }));
      if (g.subj !== 'coral' || g.fish || !g.units) ui.push(`${width}px ${user}, #${hash} after asking for Fish: ${JSON.stringify(g)}`);
    }
    const kept = await q.evaluate(() => ({
      saved: localStorage.getItem('reefid-sync-subject'),
      fp: JSON.parse(localStorage.getItem('reefid-sync-fish-progress') || '{}').t01
    }));
    if (kept.saved !== '"fish"' || !kept.fp || kept.fp.ok !== 4)
      ui.push(`${width}px ${user}: saved Fish or fish progress lost ${JSON.stringify(kept)}`);
    await c6.close();
  }
  // (6b) Fish opens to a group (sheet v48; Pierre, 2026-11-04: a group he picks in the admin, not one site-wide switch),
  // on the real app with a sheet stub (nothing sent): a player who is not the admin signs in, the sheet's reply says they
  // are in the fish group: the Tools tile appears (without the admin's line) and Fish switches on. A load reply with
  // another group list closes it again: the app reloads on the corals, the saved choice kept. An older script (no groups
  // in its replies) leaves it closed; another account on the device is in no group.
  const grp = [];
  for (const old of [false, true]) {
    const c8 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c8.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    // Fish opens to all since 2026-11-06 (Q158): the group, kept for a subject that opens to a group, on fish served
    // with open: 'group'.
    await c8.route(
      u => u.href.startsWith(base) && u.pathname === '/core.js',
      async r => {
        const res = await r.fetch(),
          t = await res.text();
        if (!t.includes("open: 'all'")) grp.push("core.js: no open: 'all' to set back to 'group'");
        await r.fulfill({response: res, body: t.replace("open: 'all'", "open: 'group'")});
      }
    );
    await c8.addInitScript(old => {
      try {
        if (!sessionStorage.getItem('fish-grp')) {
          sessionStorage.setItem('fish-grp', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
          localStorage.setItem('fish-groups', JSON.stringify(['fish']));
        }
      } catch (e) {}
      window.SHEET_STUB = (url, o) => {
        const g = JSON.parse(localStorage.getItem('fish-groups') || '[]'),
          reply =
            o && o.method === 'POST'
              ? {ok: true, log: true, rev: 2}
              : {ok: true, found: true, data: {'reefid-sync-coral-progress': '{}'}, rev: 1, hold: 0, holdIds: []};
        return Promise.resolve({json: () => Promise.resolve({...reply, ...(old ? {v: 45} : {v: 48, groups: g})})});
      };
    }, old);
    const q = await c8.newPage();
    q.on('pageerror', e => errs.push(`group${old ? ' (v45)' : ''}: ${e.message}`));
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    const t0 = await q.evaluate(() => !!document.querySelector('#view .hsubj'));
    if (t0) grp.push(`signed out: a subject row ${old ? '(v45)' : ''}`);
    await Promise.all([q.waitForNavigation(), q.evaluate(() => syncGet({name: 'Ana', pin: '1234'}).then(j => signIn('Ana', '1234', j)))]);
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    const t1 = await q.evaluate(() => {
      const t = document.querySelector('#view .hsubj');
      return {tile: !!t, admin: !!t && /Admin/.test(t.textContent), open: subjOpen(SUBJECTS.find(S => S.beta))};
    });
    if (old) {
      if (t1.tile || t1.open) grp.push(`an older script (no groups): fish opened ${JSON.stringify(t1)}`);
      await c8.close();
      continue;
    }
    if (!t1.tile || t1.admin || !t1.open) grp.push(`in the fish group: the Home subject row ${JSON.stringify(t1)}`);
    // On Home, a change of the group redraws the subject row at once, both ways (Codex review #540).
    for (const [g, want] of [
      [[], false],
      [['fish'], true]
    ]) {
      await q.evaluate(g => localStorage.setItem('fish-groups', JSON.stringify(g)), g);
      await q.evaluate(() => syncPull());
      const has = await q
        .waitForFunction(w => !!document.querySelector('#view .hsubj') === w, want, {timeout: 10000})
        .then(() => true)
        .catch(() => false);
      if (!has) grp.push(`on Home, group ${JSON.stringify(g)}: the subject row did not follow`);
    }
    await q.click('#view .hsubj [data-subj="fish"]');
    await q.waitForFunction(() => SUBJ.id === 'fish' && typeof FISH === 'object' && FISH, null, {timeout: 30000}).catch(() => {});
    if ((await q.evaluate(() => SUBJ.id)) !== 'fish') grp.push('in the fish group: Fish did not switch on');
    // Another account on this device: in no group.
    const other = await q.evaluate(() => {
      const a = store.get('reefid-account', null);
      store.set('reefid-account', {...a, name: 'Ben'});
      const o = subjOpen(SUBJECTS.find(S => S.beta));
      store.set('reefid-account', a);
      return o;
    });
    if (other) grp.push("another account: in the first one's group");
    // Taken out of the group: the next load's reply closes Fish, the app reloads on the corals.
    await q.evaluate(() => localStorage.setItem('fish-groups', '[]'));
    await Promise.all([q.waitForNavigation({timeout: 15000}).catch(() => {}), q.evaluate(() => syncPull())]);
    await q.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const t2 = await q.evaluate(() => ({
      subj: SUBJ.id,
      saved: localStorage.getItem('reefid-sync-subject'),
      g: localStorage.getItem('reefid-groups')
    }));
    if (t2.subj !== 'coral' || t2.saved !== '"fish"') grp.push(`taken out of the group: ${JSON.stringify(t2)}`);
    await c8.close();
  }
  // (6c) Fish open to all (core.js SUBJECTS open: 'all', the release's one field, Pierre 2026-11-06, Q158; core.js as it
  // is): a player who is not the admin, signed out, sees the Corals | Fish row on Home (the beta tag kept),
  // switches to Fish, answers fish questions; a reload keeps Fish; signing in (the sheet's replies put them in no group)
  // keeps Fish open and the fish progress made signed out; Corals switches back.
  const all = [];
  {
    const c9 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c9.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c9.route(
      u => u.href.startsWith(base) && u.pathname === '/core.js',
      async r => {
        const res = await r.fetch(),
          t = await res.text();
        // Fish opens to all as it is (Pierre, 2026-11-06, Q158), served unchanged.
        if (!t.includes("open: 'all'")) all.push('core.js: fish does not open to all');
        await r.fulfill({response: res, body: t});
      }
    );
    await c9.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-all')) {
          sessionStorage.setItem('fish-all', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
        }
      } catch (e) {}
      window.SHEET_STUB = (url, o) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              o && o.method === 'POST'
                ? {ok: true, log: true, rev: 2, v: 48, groups: []}
                : {ok: true, found: true, data: {'reefid-sync-coral-progress': '{}'}, rev: 1, hold: 0, holdIds: [], v: 48, groups: []}
            )
        });
    });
    const q = await c9.newPage();
    q.on('pageerror', e => errs.push(`open to all: ${e.message}`));
    const ready = () => q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    await q.goto(base + '#home');
    await ready();
    const h0 = await q.evaluate(() => {
      const f = document.querySelector('#view .hsubj [data-subj="fish"]');
      return {admin: IS_ADMIN, open: subjOpen(subjectOf('fish')), btn: !!f, tag: !!(f && f.querySelector('.beta'))};
    });
    if (h0.admin || !h0.open || !h0.btn || !h0.tag) all.push(`signed out, Home: ${JSON.stringify(h0)}`);
    await q.click('#view .hsubj [data-subj="fish"]');
    await q.waitForFunction(() => SUBJ.id === 'fish' && typeof FISH === 'object' && FISH, null, {timeout: 30000}).catch(() => {});
    await q.evaluate(() => go('quiz'));
    await q.waitForFunction(() => SUBJ.id === 'fish' && document.querySelector('#view .q'), null, {timeout: 15000}).catch(() => {});
    // Three fish answers, as pages.smoke.js answers them (the right choice, or its name typed); cards closed on the way.
    const n = await q.evaluate(async () => {
      const until = async f => {
        for (let k = 0; k < 300 && !f(); k++) await new Promise(ok => setTimeout(ok, 10));
        return f();
      };
      for (let i = 0; i < 12 && answersSoFar() < 3; i++) {
        document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
        if (!document.querySelector('#view .q:not(.done)')) quizPhoto();
        if (!(await until(() => document.querySelector('#view .q:not(.done) :is([data-c], .tyform, [data-w])')))) break;
        if (document.querySelector('#view .q.wink')) document.querySelector('#view [data-w]').click();
        else {
          const t = SHOWNQ[1],
            c = [...document.querySelectorAll('#view [data-c]')].find(x => x.dataset.c === t);
          if (c) c.click();
          else {
            const f = document.querySelector('#view .tyform');
            f.querySelector('input').value = GX(t).name;
            f.requestSubmit();
          }
        }
        await until(() => document.querySelector('#view .q.done') && document.getElementById('next'));
        document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
        route();
      }
      return answersSoFar();
    });
    const fishP = () => q.evaluate(() => Object.keys(store.get(subjKey('fish', 'progress'), {}) || {}).sort());
    const p0 = await fishP();
    if (n < 3 || !p0.length) all.push(`signed out, the fish quiz: ${n} answers, fish progress ${JSON.stringify(p0)}`);
    await q.reload();
    await q.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    if ((await q.evaluate(() => SUBJ.id)) !== 'fish') all.push('signed out, reload: Fish not kept');
    await q.evaluate(() => go('home'));
    await ready();
    await Promise.all([q.waitForNavigation(), q.evaluate(() => syncGet({name: 'Ana', pin: '1234'}).then(j => signIn('Ana', '1234', j)))]);
    await ready();
    const s1 = await q.evaluate(() => ({
      subj: SUBJ.id,
      open: subjOpen(subjectOf('fish')),
      row: !!document.querySelector('#view .hsubj [data-subj="fish"]')
    }));
    const p1 = await fishP();
    if (s1.subj !== 'fish' || !s1.open || !s1.row) all.push(`signed in, in no group: ${JSON.stringify(s1)}`);
    if (!p0.every(k => p1.includes(k))) all.push(`signed in: the fish progress made signed out lost ${JSON.stringify([p0, p1])}`);
    await q.click('#view .hsubj [data-subj="coral"]');
    await q.waitForFunction(() => SUBJ.id === 'coral', null, {timeout: 15000}).catch(() => {});
    if ((await q.evaluate(() => SUBJ.id)) !== 'coral') all.push('Corals did not switch back');
    await c9.close();
  }
  // Codex review #442, on the real app with a sheet stub (rule D1: window.SHEET_STUB, nothing sent):
  // (1) the sheet's opening hold is the corals': a pull with Fish on screen leaves the fish hold alone;
  // (2) signing in on a device that never played fish: the account's fish progress is the merge baseline, so the next
  //     sync does not add it again (10/2 stayed 10/2, was 20/4);
  // (3) a wink takes no planned question and leaves the Again / duel spacing alone;
  // (4) a genus sheet or a comparison opened with Fish chosen (Identify, the Coral ID Key) brings the corals on screen.
  const rv = [];
  {
    const c3 = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
    await c3.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c3.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-rv')) {
          sessionStorage.setItem('fish-rv', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
        }
      } catch (e) {}
      // The sheet: the account (coral and fish progress), a hold of 5 on every load; saves recorded.
      const data = {
        'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 3, ko: 1}}),
        'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 10, ko: 2}})
      };
      window.SAVES = [];
      window.SHEET_STUB = (url, o) => {
        const reply =
          o && o.method === 'POST'
            ? (SAVES.push(JSON.parse(o.body)), {ok: true, log: true, rev: 2})
            : {ok: true, found: true, data, rev: 1, hold: 5, holdIds: []};
        return Promise.resolve({json: () => Promise.resolve({...reply, v: 29})});
      };
    });
    const q = await c3.newPage();
    q.on('pageerror', e => errs.push(`sheet stub: ${e.message}`));
    const ready = () => q.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH, null, {timeout: 30000});
    await q.goto(base + '#home');
    await ready();
    // Sign in (the account found), as bindSync does after "Is it you?": the page reloads.
    await Promise.all([q.waitForNavigation(), q.evaluate(() => syncGet({name: 'Ana', pin: '1234'}).then(j => signIn('Ana', '1234', j)))]);
    await ready();
    await q.evaluate(() => syncPush());
    const r = await q.evaluate(() => ({
      subj: SUBJ.id,
      saved: JSON.parse(SAVES[SAVES.length - 1].data['reefid-sync-fish-progress'] || '{}').t01,
      here: P.t01,
      fishHold: localStorage.getItem('reefid-fish-hold'),
      coralHold: localStorage.getItem('reefid-hold')
    }));
    if (r.subj !== 'fish' || !r.saved || r.saved.ok !== 10 || r.saved.ko !== 2 || r.here.ok !== 10)
      rv.push(`sign-in on a device that never played fish: fish progress ${JSON.stringify(r)} (want 10/2)`);
    if (Number(r.fishHold || 0) !== 0 || Number(r.coralHold) !== 5)
      rv.push(`the sheet's hold went to the wrong subject: ${JSON.stringify(r)}`);
    // (3) A wink with questions planned and a mix-up queued: neither is taken.
    await q.evaluate(() => (location.hash = '#practice/quiz'));
    await q.waitForSelector('#view .q');
    const w = await q.evaluate(
      () =>
        new Promise(ok => {
          document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
          topUp();
          setTimeout(() => {
            const L = pool().filter(n => introReady(n)),
              planned = NEXTQ;
            rematch = L.length > 1 ? [{pair: [L[0], L[1]], at: -10}] : [];
            twoAt = -Infinity;
            const rm = JSON.stringify(rematch);
            WINK.AT[0] = answersSoFar();
            delete WINKS[SUBJ.id];
            localStorage.removeItem('reefid-fish-wink');
            quizPhoto();
            ok({
              wink: !!document.querySelector('#view .q.wink'),
              planned: !!planned,
              kept: NEXTQ === planned,
              rm: JSON.stringify(rematch) === rm
            });
          }, 500);
        })
    );
    if (!w.wink || !w.kept || !w.rm) rv.push(`a wink took a planned question or the spacing: ${JSON.stringify(w)}`);
    // (4) A coral genus sheet and a comparison with Fish chosen.
    for (const h of ['g-Acropora', 'cmp-Acropora|Montipora']) {
      await q.evaluate(() => setSubject('fish'));
      await q.evaluate(x => (location.hash = '#' + x), addr(h));
      await q.waitForTimeout(800);
      const g = await q.evaluate(() => ({
        subj: SUBJ.id,
        hash: location.hash,
        view: !!document.querySelector('#view h2, #view .gsheet, #view .cmp, #view [data-g]')
      }));
      if (g.subj !== 'coral' || g.hash !== '#' + addr(h)) rv.push(`#${h} with Fish chosen: ${JSON.stringify(g)}`);
    }
    // (5) Fish chosen by the player on a coral genus sheet: the fish page of the section, not straight back to corals.
    await q.evaluate(() => setSubject('fish'));
    await q.waitForTimeout(800);
    const ex = await q.evaluate(() => ({subj: SUBJ.id, hash: location.hash}));
    if (
      ex.subj !== 'fish' ||
      ex.hash !==
        '#' +
          C.routeOut(
            'genera',
            C.SUBJECTS.find(s => s.hash)
          )
    )
      rv.push(`Fish chosen on a coral genus sheet: ${JSON.stringify(ex)}`);
    await c3.close();
  }
  // (7) A saved copy without fish keys (saved by an app from before fish) is not an empty fish record (Codex review
  // #442): the fish progress synced before stays here and goes with the next save (was erased: 10/2 to nothing).
  {
    const c5 = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
    await c5.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c5.addInitScript(() => {
      const F = {t01: {ok: 10, ko: 2}};
      try {
        if (!sessionStorage.getItem('fish-old')) {
          sessionStorage.setItem('fish-old', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
          localStorage.setItem('reefid-sync-fish-progress', JSON.stringify(F));
          localStorage.setItem('reefid-account', JSON.stringify({name: 'Ana', pin: '1234', log: [], base: {}, fbase: F, srv: 1}));
        }
      } catch (e) {}
      window.SAVES = [];
      // Another device on an app from before fish saved the account since (revision 2): no fish key in the copy.
      const data = {'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 3, ko: 1}})};
      window.SHEET_STUB = (url, o) => {
        const reply =
          o && o.method === 'POST'
            ? (SAVES.push(JSON.parse(o.body)), {ok: true, log: true, rev: 3})
            : {ok: true, found: true, data, rev: 2};
        return Promise.resolve({json: () => Promise.resolve({...reply, v: 29})});
      };
    });
    const q = await c5.newPage();
    q.on('pageerror', e => errs.push(`old copy: ${e.message}`));
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH, null, {timeout: 30000});
    await q.evaluate(() => syncPush());
    const o = await q.evaluate(() => ({
      here: (P.t01 || {}).ok,
      sent: SAVES.length ? (JSON.parse(SAVES[SAVES.length - 1].data['reefid-sync-fish-progress'] || '{}').t01 || {}).ok : null
    }));
    if (o.here !== 10 || o.sent !== 10) rv.push(`a saved copy without fish keys erased the fish progress: ${JSON.stringify(o)}`);
    // (8) Tools › Type the genus with Fish chosen: the corals' genera (the Tools are the corals'; Codex review #442: it
    // drew fish teaching ids, "It was t01").
    await q.evaluate(() => (location.hash = '#tools/type'));
    await q.waitForSelector('#view .tyform', {timeout: 15000});
    await q.click('#view .tyform [data-idk]');
    const ty = await q.evaluate(() => ({
      subj: SUBJ.id,
      res: (document.querySelector('#tyres') || {}).textContent || '',
      label: document.querySelector('#view .tyform label').textContent
    }));
    if (ty.subj !== 'fish' || !/It was [A-Z][a-z]+/.test(ty.res) || /\bt\d\d\b/.test(ty.res) || ty.label !== 'Genus')
      rv.push(`Type the genus with Fish chosen: ${JSON.stringify(ty)}`);
    await c5.close();
  }
  // (6) fish.json cannot come at start-up (Codex review #442): the app opens on the corals, nothing empty is kept, and
  // the next try loads the fish.
  {
    const c4 = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
    let fail = true;
    await c4.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c4.route(
      u => /\/fish\.json/.test(u.href),
      r => (fail ? r.fulfill({status: 404, body: ''}) : r.fallback())
    );
    await c4.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-fail')) {
          sessionStorage.setItem('fish-fail', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
        }
      } catch (e) {}
    });
    const q = await c4.newPage();
    await q.goto(base + '#practice/quiz');
    await q.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const a = await q.evaluate(() => ({subj: SUBJ.id, fish: !!FISH, cached: !!FISHP}));
    // A link to a fish page while fish.json still fails (Codex review #612): the corals' page, never stuck on Loading.
    await q.evaluate(() => (location.hash = '#fish/practice/quiz'));
    await q.waitForFunction(() => location.hash === '#practice/quiz' && window.ROUTED === 'quiz', null, {timeout: 15000}).catch(() => {});
    const dl = await q.evaluate(() => ({
      hash: location.hash,
      subj: SUBJ.id,
      routed: window.ROUTED,
      loading: /Loading/.test(document.getElementById('view').innerText)
    }));
    if (dl.hash !== '#practice/quiz' || dl.subj !== 'coral' || dl.routed !== 'quiz' || dl.loading)
      rv.push(`a fish link while fish.json fails: ${JSON.stringify(dl)}`);
    fail = false;
    const b2 = await q.evaluate(() =>
      setSubject('fish').then(
        () => ({subj: SUBJ.id, n: slateGenera().length}),
        e => ({err: String(e && e.message)})
      )
    );
    if (a.subj !== 'coral' || a.fish || a.cached || b2.subj !== 'fish' || b2.n !== 27)
      rv.push(`fish.json failing at start-up: ${JSON.stringify(a)} then ${JSON.stringify(b2)}`);
    await c4.close();
  }
  // (9) A brand-new fish player (Pierre, 2026-11-04: the first families and the first photos were the wrong ones): the
  // first cards are the starter core (fish.json start), the first 15 questions ask only those entries, and until an
  // entry reaches Open Water its photos are only the very easy ones (judged ease 4-5, judging/FISH.md), never a
  // juvenile of a capped genus (fish.json juv: a juvenile is very easy only in a class-A entry or a show-early genus);
  // past Open Water the others come in. (A sex / colour phase is no family-level difficulty: Pierre,
  // 2026-11-04.) Five seeds.
  const fresh = [];
  for (const seed of [11, 222, 3333, 44444, 555555]) {
    const c6 = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
    await c6.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c6.addInitScript(sd => {
      try {
        if (!sessionStorage.getItem('fish-new')) {
          sessionStorage.setItem('fish-new', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}'); // the fish welcome question answered
        }
      } catch (e) {}
      let s = sd;
      Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    }, seed);
    const q = await c6.newPage();
    q.on('pageerror', e => errs.push(`new player ${seed}: ${e.message}`));
    await q.goto(base + '#practice/quiz');
    await q.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH && document.querySelector('#view .q'), null, {
      timeout: 30000
    });
    const r = await q.evaluate(N => {
      const fails = [],
        ok = (c, m) => c || fails.push(m);
      // Read the cards as a player does (Next, Next... Start): each card is met as it shows (quiz.js introShow).
      const readCards = () => {
        for (let k = 0; k < 10 && document.querySelector('.unlock [data-b="1"]'); k++)
          document.querySelector('.unlock [data-b="1"]').click();
        document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
      };
      const starters = slateGenera().filter(n => GX(n).first),
        ph = (t, f) => GX(t).views.wide.find(y => y.f === f) || {};
      ok(starters.slice().sort().join() === 't01,t02,t03,t06', `the starter core from fish.json: ${starters}`);
      // The card: a reference-level photo where the entry has one (core.js refLevel, refFirst), else its easiest.
      ok(
        starters.every(n => {
          const L = GX(n).views.wide,
            c = ph(n, GX(n).cover);
          return L.some(refLevel) ? refLevel(c) : c.e === Math.max(...L.map(p => p.e || 0));
        }),
        'each card shows a reference-level photo, else its easiest'
      );
      // No wall (Pierre, 2026-11-06 14:17): before Open Water a photo under ease 4 may come, but rarely.
      let gated = 0,
        under = 0;
      for (let i = 0; i < N; i++) {
        readCards();
        if (!document.querySelector('#view .q')) quizPhoto();
        const qq = SHOWNQ,
          t = qq[1];
        ok(starters.includes(t), `question ${i + 1}: ${t} is not in the starter core`);
        (qq[4].shown || []).forEach(s => {
          const p = ph(t, s.f);
          if (genScore(t) >= LV_AT[0]) return;
          gated++;
          under += (p.e || 3) < 4 ? 1 : 0;
        });
        const ans = document.querySelectorAll('#view [data-c]');
        if (ans.length) [...ans].find(b => b.dataset.c === t).click();
        else {
          const f = document.querySelector('#view .tyform');
          f.querySelector('input').value = GX(t).name;
          f.requestSubmit();
        }
        route();
      }
      ok(gated >= N / 2, `only ${gated} photos checked before Open Water`);
      ok(under <= gated / 3, `${under} of ${gated} photos under ease 4 before Open Water: the easy ones should dominate`);
      const cards = Object.keys(introMap()).filter(n => introMap()[n][3] === 's');
      ok(cards.sort().join() === 't01,t02,t03,t06', `the first cards: ${cards}`);
      // The draw itself, on every circle-1 entry before and after Open Water.
      FISH.c1.forEach(n => {
        const L = GX(n).views.wide,
          es = L.map(p => p.e || 3).sort((a, b) => b - a),
          cut = Math.min(4, es[2]),
          s0 = st(n).pg;
        st(n).pg = 0;
        // Before Open Water: the harder photos drawn less often than their share of the entry's photos (the prior and the
        // aim favour the easy ones; no wall).
        let hard = 0,
          tot = 0;
        for (let k = 0; k < 120; k++) photoSet(n).shown.forEach(x => ((tot += 1), (hard += (ph(n, x.f).e || 3) < cut ? 1 : 0)));
        const share = L.filter(p => (p.e || 3) < cut).length / L.length;
        ok(!share || hard / tot < share, `${n}: photos under ease ${cut} drawn ${hard}/${tot}, their share ${share.toFixed(2)}`);
        st(n).pg = 0.6;
        let low = 0;
        for (let k = 0; k < 120; k++) photoSet(n).shown.forEach(x => (low += (ph(n, x.f).e || 3) < cut ? 1 : 0));
        ok(low > 0 || es[es.length - 1] >= cut, `${n}: the harder photos never come after Open Water`);
        st(n).pg = s0;
      });
      return {fails, gated};
    }, 15);
    fresh.push(...r.fails.map(m => `new player ${seed}: ${m}`));
    await c6.close();
  }
  // (10) The fish welcome question (Pierre, 2026-11-04; docs/FISH_PATH.md, core.js SUBJECTS start): a fish player who has
  // not answered it is asked on a card before the first fish question, in the fish words, the three answers forced; the
  // answer goes in the fish record only (reefid-sync-fish-start), the coral answer stays the corals'; "I'm new" offers no
  // basics module (no Fish basics yet): the quiz comes at once. Each answer sets the fish starting values (startV).
  const welcome = [];
  for (const pick of ['new', 'imr', 'know']) {
    const c7 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c7.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    await c7.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-welcome')) {
          sessionStorage.setItem('fish-welcome', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke'); // the fish beta is the admin's only
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-coral-start', JSON.stringify({c: 'know', t: 1, at: 0, via: 'tour'}));
        }
      } catch (e) {}
    });
    const q = await c7.newPage();
    q.on('pageerror', e => errs.push(`welcome ${pick}: ${e.message}`));
    await q.goto(base + '#practice/quiz');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('.unlock.startq'), null, {timeout: 30000});
    const card = await q.evaluate(() => {
      const d = document.querySelector('.unlock.startq');
      return {
        subj: SUBJ.id,
        title: (d.querySelector('h2, h3, .ultitle') || {}).textContent || '',
        opts: [...d.querySelectorAll('[data-start]')].map(b => [b.dataset.start, b.querySelector('b').textContent]),
        q: !!document.querySelector('#view .q')
      };
    });
    const want = [
      ['new', 'I’m new to reef fish'],
      ['imr', 'I’m at IMR (Research Assistant programme)'],
      ['know', 'I know reef fish well']
    ];
    if (
      card.subj !== 'fish' ||
      !/How well do you know reef fish\?/.test(card.title) ||
      JSON.stringify(card.opts) !== JSON.stringify(want) ||
      card.q
    )
      welcome.push(`welcome card: ${JSON.stringify(card)}`);
    await q.click(`.unlock.startq [data-start="${pick}"]`);
    await q.waitForFunction(() => document.querySelector('#view .q'), null, {timeout: 15000}).catch(() => {});
    const after = await q.evaluate(() => ({
      fish: JSON.parse(localStorage.getItem('reefid-sync-fish-start') || 'null'),
      coral: JSON.parse(localStorage.getItem('reefid-sync-coral-start') || 'null'),
      p: startV().p,
      at: startV().at,
      basics: !!document.querySelector('.unlock.basicsq'),
      card: !!document.querySelector('.unlock.startq'),
      q: !!document.querySelector('#view .q')
    }));
    const v = await q.evaluate(c => startVars(c), pick);
    if (!after.fish || after.fish.c !== pick || after.fish.via !== 'card')
      welcome.push(`${pick}: the fish record ${JSON.stringify(after.fish)}`);
    if (!after.coral || after.coral.c !== 'know') welcome.push(`${pick}: the coral answer changed ${JSON.stringify(after.coral)}`);
    if (after.p !== v.p || after.at !== v.at) welcome.push(`${pick}: the fish starting values ${JSON.stringify([after.p, after.at, v])}`);
    if (after.basics || after.card || !after.q) welcome.push(`${pick}: after the answer ${JSON.stringify(after)}`);
    await c7.close();
  }
  // (11) The fish beta invitation (progress.js subjHello, app.js UNITS hello.group; Pierre, 2026-11-05: "a proper card the
  // player closes, shown once, at a calm moment"; 2026-11-06: while fish opens to a group he picks, an invitation to test
  // the fish beta, for the players of that group only): a player who is not the admin, in the fish group (sheet stub,
  // nothing sent), settled on the corals, gets it once on Home, nothing else on screen; Later marks it seen, and it never
  // comes back; Try fish switches to Fish and opens its quiz. Never for a player outside the group, nor one who has played
  // fish already (marked seen, no card), nor a new player (not marked: it waits until they are settled). Fish open to all
  // (Q158, core.js as it is): the same invitation to a settled player, once, its own seen mark (hello.all).
  const hello = [];
  for (const who of ['later', 'try', 'closed', 'met', 'new', 'all']) {
    const c9 = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await c9.route(
      u => !u.href.startsWith(base),
      r => r.abort()
    );
    // Fish opens to all since Q158: 'all' serves core.js as it is; the group cases serve it with fish back to 'group'.
    await c9.route(
      u => u.href.startsWith(base) && u.pathname === '/core.js',
      async r => {
        const res = await r.fetch(),
          t = await res.text();
        if (!t.includes("open: 'all'")) hello.push('core.js: fish does not open to all');
        await r.fulfill({response: res, body: who === 'all' ? t : t.replace("open: 'all'", "open: 'group'")});
      }
    );
    await c9.addInitScript(who => {
      try {
        if (!sessionStorage.getItem('fish-hello')) {
          sessionStorage.setItem('fish-hello', '1');
          const s = (k, v) => localStorage.setItem(k, JSON.stringify(v));
          s('reefid-tour', 'done');
          s('reefid-board-told', 1);
          s('reefid-account', {name: 'Ana', pin: '1234'});
          s('reefid-groups', {n: 'Ana', g: who === 'closed' ? [] : ['fish']});
          s('reefid-sync-coral-start', {c: 'imr', t: 1});
          if (who !== 'new') s('reefid-sync-coral-progress', {'~level': {ok: 30, ko: 10}, Acropora: {ok: 5, ko: 1, h: '110111'}});
          if (who === 'met') s('reefid-sync-fish-start', {c: 'new', t: 1});
        }
      } catch (e) {}
      window.SHEET_STUB = (url, o) => {
        const g = (JSON.parse(localStorage.getItem('reefid-groups') || 'null') || {g: []}).g,
          reply =
            o && o.method === 'POST' ? {ok: true, log: true, rev: 2} : {ok: true, found: true, data: {}, rev: 1, hold: 0, holdIds: []};
        return Promise.resolve({json: () => Promise.resolve({...reply, v: 48, groups: g})});
      };
    }, who);
    const q = await c9.newPage();
    q.on('pageerror', e => errs.push(`hello ${who}: ${e.message}`));
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    // The announcement cards a returning player may have due at start-up (recalculations: never held, rule D6)
    // come first; the release card waits for a calm Home, here the next one.
    await q.waitForTimeout(2500);
    if (await q.evaluate(() => !!document.querySelector('.unlock:not(.hello)'))) {
      await q.evaluate(() => document.querySelectorAll('.unlock:not(.hello) [data-b="1"]').forEach(b => b.click()));
      await q.evaluate(() => route());
    }
    const shown = await q
      .waitForSelector('.unlock.hello', {timeout: 6000})
      .then(() => true)
      .catch(() => false);
    const seen = () => q.evaluate(k => localStorage.getItem(k), who === 'all' ? 'reefid-fish-hello-all' : 'reefid-fish-hello-group');
    if (who === 'closed' || who === 'met' || who === 'new') {
      if (shown) hello.push(`${who}: the card showed`);
      const s = await seen();
      if (who === 'met' ? !s : s) hello.push(`${who}: seen mark ${s}`);
      await c9.close();
      continue;
    }
    if (!shown) {
      hello.push(`${who}: no card on Home`);
      await c9.close();
      continue;
    }
    const card = await q.evaluate(() => {
      const d = document.querySelector('.unlock.hello');
      return {
        n: document.querySelectorAll('.unlock').length,
        title: d.querySelector('h3').textContent,
        btns: [...d.querySelectorAll('[data-b]')].map(b => b.textContent),
        med: d.querySelector('.ulmed').textContent
      };
    });
    if (card.n !== 1 || card.title !== 'Test the fish beta' || JSON.stringify(card.btns) !== '["Try fish","Later"]' || card.med !== '🐟')
      hello.push(`${who}: the card ${JSON.stringify(card)}`);
    await q.click(`.unlock.hello [data-b="${who === 'try' ? 1 : 2}"]`);
    if (!(await seen())) hello.push(`${who}: not marked seen`);
    if (who === 'try') {
      const on = await q
        .waitForFunction(() => SUBJ.id === 'fish' && location.hash === hr('quiz'), null, {timeout: 15000})
        .then(() => true)
        .catch(() => false);
      if (!on) hello.push(`try: ${JSON.stringify(await q.evaluate(() => [SUBJ.id, location.hash]))}`);
    } else {
      // Never again: back to Home, a reload.
      await q.reload();
      await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
      await q.waitForTimeout(3000);
      if (await q.evaluate(() => !!document.querySelector('.unlock.hello'))) hello.push(`${who}: shown again`);
    }
    await c9.close();
  }
  const fails = [...out, ...ui, ...rv, ...fresh, ...grp, ...all, ...welcome, ...hello];
  if (back.subj !== 'coral' || back.slate < 39 || back.ac !== 3 || back.fish !== '"coral"')
    fails.push('switch back to corals: ' + JSON.stringify(back));
  if (errs.length) fails.push('page errors: ' + errs.join(' | '));
  await b.close();
  server.close();
  if (fails.length) {
    console.error([...new Set(fails)].join('\n'));
    process.exit(1);
  }
  console.log('fish smoke: OK');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
