// Fish quiz test (the taxon model, core.js SUBJECTS): runs the real app in Chromium on the fish subject and checks:
// - the draw: fish questions only from the fish slate (circle 1, the IMR entries) until a circle is opted in; every
//   choice a fish entry; one photo, from one observation; winks never asked as questions;
// - circle opt-in: circle 2 offered once every IMR entry has been asked, circle 3 once the progress reaches FISH_C3;
//   "Not now" kept; once on, their entries join the draw, never counted in the progress;
// - winks: a surprise card for a circle-1 player too (Pierre, 2026-11-03), its absurd choices and feedback lines from
//   fish.json, never counted (progress, answers, log unchanged), never twice in a visit;
// - typed answers: the entry's names (IMR name, family, sub-entries) read as the entry;
// - progress per subject kept apart: fish answers in reefid-sync-fish-progress only, the corals' untouched; switching
//   back to corals brings the coral slate and progress back;
// - the fish beta is the admin's only (Pierre, 2026-11-04): a player who is not the admin sees no subject switch (Home,
//   header, ⚙, Tools) and stays on the corals even with Fish saved, its fish progress kept; the admin switches on Home
//   (the Corals | Fish row) and in the header (the subject chip), one state. Every context below but that one holds an
//   admin token.
// iNaturalist photos are not fetched (every other host is aborted): the logic only. Needs Playwright, like
// draw.smoke.js. Locally: node tests/fish.smoke.js
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('playwright');
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
        localStorage.setItem('reefid-sync-coral-progress', JSON.stringify(coral));
      }
    } catch (e) {}
    let s = 777;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  }, CORAL);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#quiz');
  await p.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH, null, {timeout: 30000});
  const out = await p.evaluate(() => {
    const fails = [],
      ok = (c, m) => c || fails.push(m);
    const closeCards = () => document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
    ok(SUBJ.id === 'fish', 'subject fish at start-up');
    ok(slateGenera().length === 27 && slateGenera().every(n => FISH.c1.includes(n)), 'the fish slate = the 27 IMR entries');
    ok(!pool().some(n => !FISH.c1.includes(n)), 'circle 1 only before any opt-in');
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
    // Play the real quiz screen: 30 answers, right or wrong, cards closed (a wink that comes in between is no answer).
    const coralBefore = localStorage.getItem('reefid-sync-coral-progress');
    for (let i = 0, asked = 0; asked < 30 && i < 60; i++) {
      closeCards();
      if (!document.querySelector('#view .q')) quizPhoto();
      const q = SHOWNQ;
      if (document.querySelector('#view .q.wink')) {
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
    ok(!localStorage.getItem('reefid-log0') && !localStorage.getItem('reefid-anonq'), 'fish answers not logged for the sheet');
    // Typed names.
    const tm = x => typeMatch(x) && typeMatch(x).g;
    ok(tm('Damselfish') === 't01' && tm('Chromis') === 't01' && tm('Pomacentridae') === 't01', 'typed: names of Damselfish');
    ok(tm('unicornfish') === 't06' && tm('Moorish idol') === 't05', 'typed: parts and two-word names');
    ok(!tm('Acropora'), 'typed: a genus is no fish entry');
    // Winks for a circle-1 player: forced due, shown, answered, never counted.
    const P0 = JSON.stringify(P),
      W0 = WINK.P;
    WINK.P = 1;
    WINKS.at = -Infinity;
    closeCards();
    quizPhoto();
    const wk = document.querySelector('#view .q.wink');
    ok(!!wk, 'a wink comes for a circle-1 player');
    if (wk) {
      const n = [...WINKS.seen].at(-1), // the wink just shown (an earlier one may have come in the answers above)
        w = GX(n).wink,
        labels = [...wk.querySelectorAll('[data-w]')].map(b => b.textContent.slice(1));
      ok(w.choices.every(([, l]) => labels.includes(l)) && labels.includes(GX(n).name), 'wink: its name and the absurd choices');
      wk.querySelector(`[data-w="${w.choices[0][0]}"]`).click();
      ok(document.querySelector('#after').textContent.includes(w.wrong), 'wink: the wrong line');
      ok(JSON.stringify(P) === P0, 'wink: not counted');
      route();
      WINKS.at = -Infinity;
      closeCards();
      quizPhoto();
      const again = document.querySelector('#view .q.wink');
      ok(!again || [...WINKS.seen].length === 2, 'wink: never the same twice in a visit');
    }
    WINK.P = W0;
    WINKS.at = answersSoFar();
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
    // header's one line, clear of the controls), the header's height with and without the chip (rule 18), Home's height.
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
    await q.evaluate(() => (location.hash = '#lab'));
    await q.waitForFunction(() => document.querySelector('#view .labhub'), null, {timeout: 15000});
    const tl = await q.evaluate(() => ({
      tile: !!document.querySelector('#view .labsubj, #view [data-subj]'),
      badge: [...document.querySelectorAll('.labgo, .sections a[data-tab="lab"]')].some(a => a.dataset.badge),
      chip: (document.getElementById('subjb') || {}).offsetParent ? document.getElementById('subjb').getAttribute('aria-label') : ''
    }));
    if (tl.tile || tl.badge || !/Fish/.test(tl.chip)) ui.push(`${width}px Tools with Fish on: ${JSON.stringify(tl)}`);
    // The families page (learn.js viewFishList): the groups of the identification key in force (fish.json key, AGENTS.md
    // rule 6c), in the key's order, only those that hold an IMR entry, each under its number and title as the key prints
    // them, every entry under its own group; the key credited in full under the list.
    await q.evaluate(() => (location.hash = '#genera'));
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
    await q.evaluate(() => (location.hash = '#quiz'));
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
    // A wink, forced due once (WINK.P 1), then never the same again in the visit.
    const wk = await q.evaluate(() => {
      location.hash = '#quiz';
      return new Promise(ok =>
        setTimeout(() => {
          document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
          WINK.P = 1;
          WINKS.at = -Infinity;
          const was = answersSoFar();
          if (was < WINK.FROM) P['~level'] = {...(P['~level'] || {}), ok: WINK.FROM};
          quizPhoto();
          ok({wink: !!document.querySelector('#view .q.wink'), seen: WINKS.seen.size});
        }, 300)
      );
    });
    if (!wk.wink || wk.seen !== 1) ui.push(`${width}px wink: ${JSON.stringify(wk)}`);
    await wide('a wink');
    // Back to the corals through the header chip: its menu holds both subjects; a choice closes it.
    await q.evaluate(() => (location.hash = '#quiz'));
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
  // A player who is not the admin (no admin token; or the admin token in ⚙ View: User), with Fish saved on this device
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
    await c6.addInitScript(asUser => {
      try {
        if (!sessionStorage.getItem('fish-ra')) {
          sessionStorage.setItem('fish-ra', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-sync-subject', '"fish"');
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
    await q.evaluate(() => (location.hash = '#lab'));
    await q.waitForFunction(() => document.querySelector('#view .labhub'), null, {timeout: 30000});
    const t = await look();
    if (t.subj !== 'coral' || t.sw || t.words || t.badge) ui.push(`${width}px ${user}, Tools: ${JSON.stringify(t)}`);
    await wide('Tools');
    // Asked for anyway: a switch (an old page's button, the console), then the Learn and Practice pages.
    await q.evaluate(() => setSubject('fish'));
    for (const hash of ['genera', 'quiz']) {
      await q.evaluate(x => (location.hash = '#' + x), hash);
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
  // Codex review #442, on the real app with a sheet stub (AGENTS.md rule 13: window.SHEET_STUB, nothing sent):
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
    await q.evaluate(() => (location.hash = '#quiz'));
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
            WINK.P = 1;
            WINKS.at = -Infinity;
            if (answersSoFar() < WINK.FROM) P['~level'] = {...(P['~level'] || {}), ok: WINK.FROM};
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
      await q.evaluate(x => (location.hash = '#' + x), h);
      await q.waitForTimeout(800);
      const g = await q.evaluate(() => ({
        subj: SUBJ.id,
        hash: location.hash,
        view: !!document.querySelector('#view h2, #view .gsheet, #view .cmp, #view [data-g]')
      }));
      if (g.subj !== 'coral' || g.hash !== '#' + h) rv.push(`#${h} with Fish chosen: ${JSON.stringify(g)}`);
    }
    // (5) Fish chosen by the player on a coral genus sheet: the fish page of the section, not straight back to corals.
    await q.evaluate(() => setSubject('fish'));
    await q.waitForTimeout(800);
    const ex = await q.evaluate(() => ({subj: SUBJ.id, hash: location.hash}));
    if (ex.subj !== 'fish' || ex.hash !== '#genera') rv.push(`Fish chosen on a coral genus sheet: ${JSON.stringify(ex)}`);
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
    await q.evaluate(() => (location.hash = '#lab-type'));
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
        }
      } catch (e) {}
    });
    const q = await c4.newPage();
    await q.goto(base + '#quiz');
    await q.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
    const a = await q.evaluate(() => ({subj: SUBJ.id, fish: !!FISH, cached: !!FISHP}));
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
        }
      } catch (e) {}
      let s = sd;
      Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    }, seed);
    const q = await c6.newPage();
    q.on('pageerror', e => errs.push(`new player ${seed}: ${e.message}`));
    await q.goto(base + '#quiz');
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
      ok(
        starters.every(n => ph(n, GX(n).cover).e === Math.max(...GX(n).views.wide.map(p => p.e || 0))),
        'each card shows its easiest photo'
      );
      let gated = 0;
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
          ok(p.e >= 4, `question ${i + 1}: ${t} photo ${s.f} of ease ${p.e} before Open Water`);
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
      const cards = Object.keys(introMap()).filter(n => introMap()[n][3] === 's');
      ok(cards.sort().join() === 't01,t02,t03,t06', `the first cards: ${cards}`);
      // The draw itself, on every circle-1 entry before and after Open Water.
      FISH.c1.forEach(n => {
        const L = GX(n).views.wide,
          es = L.map(p => p.e || 3).sort((a, b) => b - a),
          cut = Math.min(4, es[2]),
          s0 = st(n).pg;
        st(n).pg = 0;
        const before = new Set();
        for (let k = 0; k < 120; k++) photoSet(n).shown.forEach(x => before.add(x.f));
        ok(
          [...before].every(f => (ph(n, f).e || 3) >= cut),
          `${n}: a photo under ease ${cut} before Open Water`
        );
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
  const fails = [...out, ...ui, ...rv, ...fresh];
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
