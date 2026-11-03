// Fish quiz test (the taxon model, core.js SUBJECTS): runs the real app in Chromium on the fish subject and checks:
// - the draw: fish questions only from the fish slate (circle 1, the IMR entries) until a circle is opted in; every
//   choice a fish entry; one photo, from one observation; winks never asked as questions;
// - circle opt-in: circle 2 offered once every IMR entry has been asked, circle 3 once the progress reaches FISH_C3;
//   "Not now" kept; once on, their entries join the draw, never counted in the progress;
// - winks: a surprise card for a circle-1 player too (Pierre, 2026-11-03), its absurd choices and feedback lines from
//   fish.json, never counted (progress, answers, log unchanged), never twice in a visit;
// - typed answers: the entry's names (IMR name, family, sub-entries) read as the entry;
// - progress per subject kept apart: fish answers in reefid-sync-fish-progress only, the corals' untouched; switching
//   back to corals brings the coral slate and progress back.
// iNaturalist photos are not fetched (every other host is aborted): the logic only. Needs Playwright, like
// draw.smoke.js. Locally: node tests/fish.smoke.js
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
    // Play the real quiz screen: 30 answers, right or wrong, cards closed.
    const coralBefore = localStorage.getItem('reefid-sync-coral-progress');
    for (let i = 0; i < 30; i++) {
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
      const n = [...WINKS.seen][0],
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
  // The screens a fish player sees, at 390 and 1280 px (light theme): Home's selector with Fish tagged beta, the Learn
  // door saying beta once chosen; a fish question (4 upright names); the enlarged photo before the answer credits its author by name
  // only (blindCredit: no taxon, no link); after the answer the full credit with its iNaturalist link; My progress; a
  // wink once; nothing wider than the screen on any of them.
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
          localStorage.setItem('reefid-sync-subject', '"fish"');
        }
      } catch (e) {}
    });
    const q = await c2.newPage();
    q.on('pageerror', e => errs.push(`${width}px: ${e.message}`));
    const wide = async what => {
      const w = await q.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (w > 0) ui.push(`${width}px ${what}: ${w}px wider than the screen`);
    };
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH && document.querySelector('.hsubj'), null, {
      timeout: 30000
    });
    const home = await q.evaluate(() => ({
      fish: (document.querySelector('.hsubj [data-subj="fish"]') || {}).textContent || '',
      on: (document.querySelector('.hsubj [aria-pressed="true"]') || {}).dataset,
      beta:
        ((document.querySelector('.hdoor.learn .hdwhen') || {}).textContent || '') +
        ' | ' +
        ((document.querySelector('.hdoor.learn .hddesc') || {}).textContent || '')
    }));
    if (!/Fish\s*beta/.test(home.fish) || !home.on || home.on.subj !== 'fish' || !/Something fishy.*\|.*Fish is in beta/.test(home.beta))
      ui.push(`${width}px Home: selector or beta line ${JSON.stringify(home)}`);
    await wide('Home');
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
    await c2.close();
  }
  // Codex review #442, on the real app with a sheet stub (AGENTS.md rule 13: window.SHEET_STUB, nothing sent):
  // (1) the sheet's opening hold is the corals': a pull with Fish on screen leaves the fish hold alone;
  // (2) signing in on a device that never played fish: the account's fish progress is the merge baseline, so the next
  //     sync does not add it again (10/2 stayed 10/2, was 20/4);
  // (3) a wink takes no planned question and leaves the Again / duel spacing alone;
  // (4) a genus sheet or a comparison opened with Fish chosen (Identify, the Coral Finder) brings the corals on screen.
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
  const fails = [...out, ...ui, ...rv];
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
