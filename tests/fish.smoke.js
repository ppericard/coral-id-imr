// Fish quiz test (the taxon model, core.js SUBJECTS): runs the real app in Chromium on the fish subject and checks:
// - the draw: the fish slate is every family of every circle (Pierre, 2026-11-06, Q175); every choice a fish family; one
//   photo, from one observation; winks never asked as questions; no circle setting row or offer card;
// - the circles on the path (Q177): circle 2 may open once every circle-1 family has been asked, circle 3 once the
//   progress on circle 1 reaches FISH_C3, never before (the opening draws circle 1 first), and only once the player says
//   yes (Pierre, 2026-11-07: its card at FISH_C3, Not now keeps it closed, My progress opens it); every circle in the
//   progress (Q204);
//   "I'm at IMR": the IMR-tagged families open first;
// - winks: a surprise card for a circle-1 player too (Pierre, 2026-11-03), its absurd choices and feedback lines from
//   fish.json, never counted (progress, answers, log unchanged); late (Pierre, 2026-11-06): none in the first answers
//   (quiz.js WINK.AT: 200), once due shown once, then not again for the player (reefid-sync-fish-wink, travels);
// - typed answers: the entry's names (IMR name, family, sub-entries) read as the entry;
// - progress per subject kept apart: fish answers in reefid-sync-fish-progress only, the corals' untouched; switching
//   back to corals brings the coral slate and progress back;
// - the fish beta is the admin's only (Pierre, 2026-11-04): a player who is not the admin sees no subject switch (Home,
//   header, ⚙, Tools) and stays on the corals even with Fish saved, its fish progress kept; the admin switches on Home
//   (the Corals | Fish row) and in the header (the subject chip), one state. Every context below but that one holds an
//   admin token.
// - load order: a fish record under the former moving average, opened by a link straight to a quiz page with data.json
//   late (and fish.json in between), rebuilt once the data is in, with no page error, Fish kept, as on a plain load;
// iNaturalist photos are not fetched (every other host is aborted): the logic only. Needs Playwright, like
// draw.smoke.js. Locally: node tests/fish.smoke.js
// A page key's address (core.js routeOut), for the corals.
const C = require('../core.js'),
  FISHN = C.FISH_ACH.length,
  addr = k => C.routeOut(k) ?? k;
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js'); // playwright; contexts in reduced motion by default
const slot = require('./slot.js');
const qa = require('./answer.js'); // waits for and answers the question on screen, whatever its format
const ROOT = path.join(__dirname, '..');
// The game species of Chromis in fish.json: the genus page shows a tile each, a Chromis sheet the others (the count moves
// with the data: 13 until 2026-11-08, when the near-Dauin species of the game families came in).
const CHROMIS = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8')).species.filter(
  s => s.circle && s.genus === 'g:Chromis'
).length;
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

// The end of a run: the failures, or OK (with the parts left out, for a partial run).
async function done(b, fails, run) {
  await b.close();
  server.close();
  if (fails.length) {
    console.error([...new Set(fails)].join('\n'));
    process.exit(1);
  }
  console.log('fish smoke: OK' + slot.partial(PARTS, run));
}
// The parts of this smoke (tests/slot.js parts): SMOKE_PART=main|fresh is the shard CI runs on one runner, SMOKE_ONLY the
// same names (default: both). fresh: (9), the brand-new fish players (freshPlayers); main: everything else.
const PARTS = ['main', 'fresh'];
// Start-up's one-time cards out of the way (progress.js window.CARDS_SAID: every card due on screen or decided): each
// card on screen but the ones kept (a selector) is closed by its first button, until start-up has nothing more to show.
// A card that was due before or after a sync (the recalculation notes: never held, rule D6) then never covers a click.
const said = q =>
  q
    .waitForFunction(() => window.CARDS_SAID, null, {timeout: 25000})
    .then(
      () => '',
      () => 'start-up never settled its cards'
    );
async function settle(q, keep = '') {
  const sel = `.unlock${keep ? `:not(${keep})` : ''}`;
  for (let i = 0; i < 8; i++) {
    const no = await said(q);
    if (no) return no;
    if (!(await q.$(sel))) return '';
    await q.click(`${sel} [data-b="1"]`);
  }
  return 'start-up cards kept coming';
}
// (11) Find the X (quiz.js FIND, planFind; Pierre, 2026-11-03, Q321 D1): one name, four photos, slipped into the fish quiz.
// Every circle-1 family met but three, FIND.P set to 1 for the run so it comes at once: never on a family not met, nor with
// one; four square tiles (fish-game.json xc), the families' buttons, no name buttons; the right tile and the wrong one
// marked once answered; logged quiz|f with the unit's own photo, the four units as choices and the unit of the photo
// tapped; scored as a 4-choice answer (its expectation over 1 in 4). With FIND.P back at 0 none comes.
async function findTheX(b, base, errs) {
  const c = await b.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  await c.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await c.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('fish-fx')) {
        sessionStorage.setItem('fish-fx', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-subject', '"fish"');
        localStorage.setItem('reefid-sync-fish-start', '{"c":"imr","t":1}');
      }
    } catch (e) {}
    let s = 4242;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  });
  const q = await c.newPage();
  q.on('pageerror', e => errs.push(`find the X: ${e.message}`));
  await q.goto(base + '#practice/quiz');
  await q.waitForFunction(() => window.APP_READY && typeof FISH === 'object' && FISH && document.querySelector('#view .q'), null, {
    timeout: 30000
  });
  await qa.install(q);
  const r = await q.evaluate(async () => {
    const fails = [],
      ok = (x, m) => x || fails.push(m),
      closeCards = () => document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
    const tiled = FISH.c1.filter(n => UNITS.fish.tiles(n).length),
      unmet = tiled.slice(-3);
    ok(tiled.length >= 8, `families with a tile: ${tiled.length}`);
    ok(!UNITS.coral.tiles('Acropora').length, 'no tiles for the corals');
    FISH.c1
      .filter(n => !unmet.includes(n))
      .forEach(n => {
        introAdd([n], false);
        Object.assign(st(n), {ok: 4, ko: 0, h: '1111', th: 1});
      });
    closeCards();
    FIND.P = 1;
    let seen = 0,
      wrong = null;
    for (let i = 0; i < 80 && seen < 12; i++) {
      // the families not met before this question (the path opens some as the other questions go)
      const notMet = slateGenera().filter(n => !introReady(n));
      NEXTQ = null;
      quizPhoto();
      closeCards();
      const Q = SHOWNQ;
      if (!Q || !Q.findx) {
        smokeAnswer();
        continue;
      }
      seen++;
      const [, t, ch, prompt, set] = Q,
        // answer.js: a read of a Find the X's tiles (the question checked here is that format; smokeAnswer answers it)
        tiles = [...document.querySelectorAll('#view .qstage.qfx .fxt [data-c]')];
      ok(prompt === `Find the ${unameT(t)}`, `the prompt: ${prompt}`);
      ok(ch.length === 4 && new Set(ch).size === 4 && ch.includes(t), `four units: ${ch}`);
      ok(
        ch.every(n => introReady(n) && !notMet.includes(n) && !rankOf(n)),
        `only families met: ${ch}`
      );
      ok(tiles.map(x => x.dataset.c).join() === ch.join(), 'the tiles are the choices, in their order');
      ok(!document.querySelector('#view .ans'), 'no name buttons'); // answer.js: the format has none
      ok(
        set.find.every(x => x.p.xc && GX(x.n).views.wide.some(y => y.f === x.p.f)),
        'each photo a tile of its own unit'
      );
      ok(
        [...document.querySelectorAll('#view .fxt img')].every(im => /-x\.webp\?x=/.test(im.getAttribute('src'))),
        'the tile files'
      );
      // A wrong tap the first time, right after.
      const pick = wrong ? t : ch.find(n => n !== t),
        before = (SYNC ? SYNC.log : store.get(LOG0, [])).length;
      smokeAnswer(pick);
      const log = SYNC ? SYNC.log : store.get(LOG0, []),
        a = log[log.length - 1];
      ok(log.length === before + 1 || !SYNC_URL, 'one answer logged');
      if (a) {
        ok(a.m === 'quiz|f', `mode ${a.m}`);
        ok(a.g === t && a.a === pick && a.ok === (pick === t ? 1 : 0), 'unit shown, unit of the photo tapped');
        ok(a.ph === set.shown[0].f && a.ph === set.find.find(x => x.n === t).p.f, `its photo: ${a.ph}`);
        ok(a.ch === ch.join(' '), `the four units: ${a.ch}`);
        ok(a.e > 0.25 && a.e < 1, `expected ${a.e} over 1 in 4`);
      }
      // answer.js: the tiles marked once answered (a read, after smokeAnswer)
      const ok1 = document.querySelector('#view .fxt.fok [data-c]'),
        // answer.js: the same read, the tile tapped
        ko1 = document.querySelector('#view .fxt.fko [data-c]');
      ok(ok1 && ok1.dataset.c === t, 'the right tile marked');
      ok(pick === t ? !ko1 : ko1 && ko1.dataset.c === pick, 'the tile tapped marked');
      ok(document.querySelectorAll('#view .fxt figcaption').length === 4, 'every tile named once answered');
      if (!wrong) wrong = pick;
    }
    ok(seen >= 3, `Find the X questions: ${seen}`);
    // A tile that never loads (its retries and its 480 px step spent): its answers close at once, since the photos are the
    // choices (Codex review #885), with the usual way out; another tile coming in later does not open them again.
    let fx = null;
    for (let i = 0; i < 80 && !fx; i++) {
      NEXTQ = null;
      quizPhoto();
      closeCards();
      if (SHOWNQ && SHOWNQ.findx) fx = SHOWNQ;
      else smokeAnswer();
    }
    ok(fx, 'a Find the X for the failed tile');
    if (fx) {
      const ims = [...document.querySelectorAll('#view .fxt img')],
        bad = ims[0],
        // the other three in (a file of the site: the photos' host is out of reach in the smokes), so the stage has photos
        come = im =>
          new Promise(
            res => (
              im.addEventListener('load', res, {once: true}),
              im.setAttribute('src', 'icon-192.png?' + ims.indexOf(im) + '-' + Date.now())
            )
          );
      await Promise.all(ims.slice(1).map(come));
      // as at the end of its way: R2 asked again (r2try), its 480 px step spent (low, no data-lo left), retried twice
      Object.assign(bad.dataset, {retry: '2', low: '1', r2try: '1'});
      bad.removeAttribute('data-lo');
      bad.setAttribute('src', 'data:image/gif;base64,');
      bad.dispatchEvent(new Event('error'));
      // answer.js: the answers' state after a tile failed (none can be answered: nothing to smokeAnswer)
      const shut = () => [...document.querySelectorAll('#view .fxt [data-c]')].every(b => b.disabled);
      ok(shut() && document.querySelector('#view .q.qnone') && document.getElementById('qfail'), 'a missing tile closes the answers');
      await come(ims[1]);
      ok(shut(), 'another tile loading does not open them again');
    }
    // Back to 0: none.
    FIND.P = 0;
    let none = 0;
    for (let i = 0; i < 30; i++) {
      NEXTQ = null;
      quizPhoto();
      closeCards();
      if (SHOWNQ && SHOWNQ.findx) none++;
      smokeAnswer();
    }
    ok(!none, `${none} Find the X with FIND.P 0`);
    return fails;
  });
  await c.close();
  return r.map(m => `find the X: ${m}`);
}
// (9) as a function: its own CI shard (SMOKE_PART=fresh), the longest block of this smoke. Its failures, and its page
// errors in errs.
async function freshPlayers(b, base, errs) {
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
    await qa.install(q);
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
      ok(
        starters.slice().sort().join() === 'f:Angelfishes,f:Butterflyfishes,f:Damselfishes,f:Surgeonfishes',
        `the starter core from fish.json: ${starters}`
      );
      // The card: Pierre's ★ Cover while in play (app.js fishCurate: his pick, 2026-11-08), else the default (app.js
      // seenCover; Pierre, 2026-11-13, Q339 (b)): a photo of its species most seen around the instance's centre (observers,
      // then observations), the first of that species' adult photos by reference level (core.js refFirst), never a juvenile.
      const seenK = p => fishSeen(p.sp)[0] * 1e6 + fishSeen(p.sp)[1],
        // among the species with a reference-level adult photo (else with an adult photo), the most seen; his ★ cover of it
        // when he picked one (Pierre, 2026-11-14 on #864), else its reference photo
        mostSeen = (L, c) => {
          const A = L.filter(p => !juvP(p)),
            R = A.filter(refLevel);
          if (!A.length) return !!c;
          if (!c || juvP(c) || seenK(c) !== Math.max(...(R.length ? R : A).map(seenK))) return false;
          const pk = fishSpPick(c.sp);
          if (pk && A.some(p => p.f === pk.f)) return c.f === pk.f;
          return R.length ? refLevel(c) : refFirst(c) === Math.min(...A.filter(p => p.sp === c.sp).map(refFirst));
        };
      ok(
        starters.every(n => {
          const L = GX(n).views.wide,
            c = ph(n, GX(n).cover);
          if (GX(n).coverP) return c.f === GX(n).coverP.f && cover(GX(n)).f === c.f;
          return mostSeen(L, c);
        }),
        "each card shows Pierre's cover, else its most seen species' photo (Q339 (b))"
      );
      // Chromis (Pierre's example of 2026-11-13): with no pick of his, its card shows its species seen by the most distinct
      // observers around the centre, not the first of the easy order.
      const cg = GX('g:Chromis');
      ok(
        !cg || cg.coverP || mostSeen(cg.views.wide, ph('g:Chromis', cg.cover)),
        `Chromis: the card shows its most seen species (${cg && (FISH.sps[ph('g:Chromis', cg.cover).sp] || {}).name})`
      );
      // No wall (Pierre, 2026-11-06 14:17): before Open Water a photo under ease 4 may come, but rarely (model.js RARE:
      // about 1 in 10 at most, whatever the pool; the bound below leaves room for 15 photos' noise).
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
        smokeAnswer();
        route();
      }
      ok(gated >= N / 2, `only ${gated} photos checked before Open Water`);
      ok(under <= gated / 3, `${under} of ${gated} photos under ease 4 before Open Water: the easy ones should dominate`);
      const cards = Object.keys(introMap()).filter(n => introMap()[n][3] === 's');
      ok(cards.sort().join() === 'f:Angelfishes,f:Butterflyfishes,f:Damselfishes,f:Surgeonfishes', `the first cards: ${cards}`);
      // The draw itself, on every circle-1 entry before and after Open Water.
      FISH.c1.forEach(n => {
        const L = GX(n).views.wide,
          es = L.map(p => p.e || 3).sort((a, b) => b - a),
          cut = Math.min(4, es[Math.min(3, es.length) - 1]), // as easyFirst: its 3 easiest when it has fewer (the Soapfishes have 2)
          s0 = JSON.parse(JSON.stringify(st(n))),
          pgAt = x => {
            delete st(n).dp;
            delete st(n).ds;
            st(n).pg = x;
          };
        pgAt(0);
        // Before Open Water: the harder photos drawn less often than their share of the entry's photos (the prior and the
        // aim favour the easy ones; no wall).
        let hard = 0,
          tot = 0;
        for (let k = 0; k < 120; k++) photoSet(n).shown.forEach(x => ((tot += 1), (hard += (ph(n, x.f).e || 3) < cut ? 1 : 0)));
        const share = L.filter(p => (p.e || 3) < cut).length / L.length;
        ok(!share || hard / tot < share, `${n}: photos under ease ${cut} drawn ${hard}/${tot}, their share ${share.toFixed(2)}`);
        // After Open Water: the entry as a player reaches it, its bar at 60% with the answers and the ability that take
        // it there (12 answers, 10 right, ability 0.5: the low end), not the bar alone, since the draw leans on the
        // answers and the ability (SUBJECTS calib early fades with the answers, Q186's narrower targeting follows the
        // ability): the harder photos come in.
        pgAt(0.6);
        Object.assign(st(n), {ok: 10, ko: 2, th: 0.5});
        let low = 0;
        for (let k = 0; k < 400; k++) photoSet(n).shown.forEach(x => (low += (ph(n, x.f).e || 3) < cut ? 1 : 0));
        ok(low > 0 || es[es.length - 1] >= cut, `${n}: the harder photos never come after Open Water`);
        P[n] = s0;
      });
      return {fails, gated};
    }, 15);
    fresh.push(...r.fails.map(m => `new player ${seed}: ${m}`));
    await c6.close();
  }
  return fresh;
}

(async () => {
  const run = slot.parts(PARTS, {main: ['main'], fresh: ['fresh']});
  await slot('fish.smoke');
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  if (!run.has('main')) {
    const pe = [],
      f = await freshPlayers(b, base, pe);
    return done(b, pe.length ? [...f, 'page errors: ' + pe.join(' | ')] : f, run);
  }
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
  await qa.install(p);
  const out = await p.evaluate(() => {
    const fails = [],
      ok = (c, m) => c || fails.push(m);
    const closeCards = () => document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
    ok(SUBJ.id === 'fish', 'subject fish at start-up');
    ok(
      FISH.c1.length === 28 &&
        FISH.c2.length > 0 &&
        FISH.c3.length > 10 &&
        slateGenera().join() === [...FISH.c1, ...FISH.c2, ...FISH.c3].join(),
      'the fish slate = every family of circles 1, 2 and 3'
    );
    ok(slateCore().join() === FISH.c1.join(), 'Open all opens circle 1 (the IMR course)');
    ok(
      !SETS().some(S => S.k === 'c2' || S.k === 'c3') && !document.querySelector('[data-optin="c2"], [data-optin="c3"]'),
      'no circle setting'
    );
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
        smokeAnswer();
        route();
        continue;
      }
      ok(q && FISH.c1.includes(q[1]), 'question on a circle-1 family (circles 2 and 3 wait)');
      // answer.js: the choices read
      const ans = [...document.querySelectorAll('#view [data-c]')];
      ok(
        ans.every(b => GX(b.dataset.c) && GX(b.dataset.c).name),
        'every choice is a fish entry'
      );
      smokeAnswer(i % 3 !== 0);
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
    ok(
      tm('Damselfishes') === 'f:Damselfishes' &&
        tm('Damselfish') === 'f:Damselfishes' &&
        tm('Chromis') === 'f:Damselfishes' &&
        tm('Pomacentridae') === 'f:Damselfishes',
      'typed: names of the Damselfishes'
    );
    ok(tm('unicornfish') === 'f:Surgeonfishes' && tm('Moorish idol') === 'f:MoorishIdol', 'typed: parts and two-word names');
    ok(!tm('Acropora'), 'typed: a genus is no fish entry');
    // A genus question's text that names no genus (Pierre, 2026-11-08, Q237; quiz.js typeKind, typeKindMsg): a family name
    // or a common name is told so, on the game's own names, and the nudge never holds a scientific genus name.
    ok(
      typeKind('Damselfishes', 'genus') === 'family' && typeKind('Pomacentridae', 'genus') === 'family',
      'typed: a family name on a genus question'
    );
    ok(
      typeKind('Anemonefish', 'genus') === 'common' && typeKind('Clownfish', 'genus') === 'common',
      'typed: a common name on a genus question'
    );
    ok(!typeKind('xyzfish', 'genus') && !typeKind('Anemonefish', ''), 'typed: nothing else, and nothing on a family question');
    {
      const sci = new Set(FISH.sci.flatMap(n => GX(n).names).map(x => x.toLowerCase())),
        bad = [];
      let n = 0;
      typeNames()
        .filter(o => rankOf(o.g) !== 'genus')
        .forEach(o => {
          const t = o.old || GX(o.g).name,
            k = typeKind(t, 'genus');
          if (!k) return;
          n++;
          const rest = typeKindMsg(t, k, 'genus').replace(`“${t}”`, '');
          if (
            rest
              .toLowerCase()
              .split(/[^a-z]+/)
              .some(w => sci.has(w))
          )
            bad.push(rest);
        });
      ok(n > 50 && !bad.length, `typed: ${n} nudges, none with a scientific genus name: ${bad.slice(0, 3)}`);
    }
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
      // Its photo: one of the wink's chosen photos (Pierre, 2026-11-07), by its iNaturalist photo id (fishPid i<id>).
      const src = wk.querySelector('.qph img').getAttribute('src');
      ok(
        (w.photos || []).some(f => src.includes(fishPid(f).slice(1))),
        `wink: one of its chosen photos (${src})`
      );
      const q0 = JSON.parse(localStorage.getItem('reefid-log0') || '[]').length;
      // Through the smokes' answerer (tests/answer.js), which finds the unit a surprise shows.
      const sa = smokeAnswer(w.choices[0][0]);
      ok(sa.fmt === 'wink' && sa.t === n && sa.n === 4, 'wink: smokeAnswer reads it: ' + JSON.stringify(sa));
      ok(document.querySelector('#after').textContent.includes(w.wrong), 'wink: the wrong line');
      ok(JSON.stringify(P) === P0, 'wink: not counted');
      // Its answer logged like any other (Pierre, 2026-11-08), once, marked by its mode (core.js WINK_MODE): queued for
      // the sheet (signed out: LOG0 and the anonymous queue) with what was shown and answered; never scored.
      const L1 = JSON.parse(localStorage.getItem('reefid-log0') || '[]'),
        wa = L1[L1.length - 1] || {};
      ok(L1.length === q0 + 1 && wa.m === 'wink' && wa.g === n && wa.ok === 0, 'wink: its answer logged once: ' + JSON.stringify(wa));
      ok(
        wa.s === 'fish' &&
          wa.a === renamedId(SUBJ, w.choices[0][0]) &&
          wa.ph &&
          wa.ch.split(' ').length === 4 &&
          !('e' in wa) &&
          !('sc' in wa),
        'wink: what was shown and answered, nothing scored'
      );
      ok(
        JSON.parse(localStorage.getItem('reefid-anonq') || '[]').some(a => a.id === wa.id),
        'wink: queued for the anonymous send'
      );
      wk.querySelector(`[data-w="${n}"]`).click();
      ok(JSON.parse(localStorage.getItem('reefid-log0') || '[]').length === q0 + 1, 'wink: one answer, a second tap logs nothing');
      ok(n in JSON.parse(localStorage.getItem('reefid-sync-fish-wink') || '{}'), 'wink: kept as shown for the player');
      route();
      closeCards();
      quizPhoto();
      ok(!document.querySelector('#view .q.wink'), 'wink: not again in its window');
    }
    WINK.AT.splice(0, 2, ...W0);
    // A wink with Pierre's ★ Cover in play shows it on its card (Pierre, 2026-11-08, Q290: the Thresher sharks).
    const wc = UNITS[SUBJ.id].winks().filter(n => GX(n).coverP);
    ok(
      wc.every(n => winkPhoto(GX(n)) === GX(n).coverP),
      `wink: his cover on the card (${wc})`
    );
    // The circles on the path (Pierre, 2026-11-06, Q175, Q177): no offer card; circle 2 may open once every circle-1
    // family has been asked, circle 3 once the progress on circle 1 reaches FISH_C3; until then the opening never draws
    // them (mayOpen, openPick); every circle counts in the progress.
    const canOpen = () => slateGenera().filter(n => !introduced(n) && mayOpen(n)),
      picks = () => [...Array(40)].map(() => canOpen().length && openPick(canOpen())).filter(Boolean);
    ok(!bonusOfferDue(), 'no circle offer card');
    // A unit's bar set through the former moving average (s.pg), whatever rule its record is under: a unit answered above
    // took the domain-score bar (core.js DOM; the fish are not replayed, model.js domRules), which s.pg alone would not move.
    const pgAt = (n, x) => {
      const s = st(n);
      delete s.dp;
      delete s.ds;
      s.pg = x;
    };
    ok(
      FISH.c1.some(n => !asked(n)),
      'some circle-1 families not asked yet'
    );
    ok(!FISH.c2.some(mayOpen) && !FISH.c3.some(mayOpen), 'circles 2 and 3 wait while a circle-1 family is not asked');
    ok(
      picks().every(n => FISH.c1.includes(n)),
      'the opening draws circle 1 only'
    );
    FISH.c1.forEach(n => (st(n).ok = st(n).ok || 1));
    ok(FISH.c2.every(mayOpen) && !FISH.c3.some(mayOpen), 'circle 2 opens once every circle-1 family is asked, circle 3 still waits');
    // The global score from the sheet script that ranks by it (core.js SCORE_SHEET, rule D4): before, the families' mean.
    store.set(SHEETV, SCORE_SHEET - 1);
    ok(headScore() === null && headPct() === progPct(), 'before SCORE_SHEET: the families mean, as before');
    store.set(SHEETV, SCORE_SHEET);
    ok(headScore() && headPct() === headScore().pct, 'from SCORE_SHEET: the global score');
    ok(!fishC3(), 'circle 1 under FISH_C3');
    const p2 = picks();
    ok(p2.length && p2.every(n => FISH.c2.includes(n)), 'the opening draws circle 2 next');
    ok(!openOfferDue(), 'no circle-3 card under FISH_C3');
    // Every family in play met and none may open now (Pierre, 2026-11-12: "on lui dit qu'il a tout vu et ce qui vient
    // ensuite"; quiz.js allMetDue, app.js fishNextOf): a card at the break at Next says so and what comes next, once per
    // reason; never while a family may still open or another card says what is next. Outside a visit's floor and the
    // prompt spacing (restored below).
    const cb0 = {...CB},
      pa0 = store.get(PROMPT.KEY, null),
      am = [],
      amAsk = L => L.forEach(n => asked(n) || (am.push([n, P[n] && {...P[n]}]), (st(n).ok = 1))),
      amKey = k => subjDev(SUBJ.id, ALLMET.KEY + k);
    CB.r = 0;
    CB.f = 0;
    store.set(PROMPT.KEY, null);
    ok(!allMetDue(), 'all met: not while circle 2 may open');
    amAsk(FISH.c2);
    const r3 = allMetDue();
    ok(
      r3 && r3.k === 'c3' && r3.lines.length === 2 && /beyond the IMR course.*about Open Water on average/.test(r3.lines[1]),
      'all met: circle 3 not reached says what it takes ' + JSON.stringify(r3)
    );
    {
      // Through the game itself (quiz.js answer): an answer, then Next brings the card; Got it goes on to the next
      // question. The answer's record put back after.
      const Pj = JSON.stringify(P),
        cb = () => ((CB.r = 0), (CB.f = 0));
      closeCards();
      quizPhoto();
      closeCards();
      cb();
      // The achievements the walk above earned, given silently, their toasts gone: they would hold the card back.
      achCheck(true);
      document.querySelectorAll('.achpop').forEach(x => x.remove());
      achQ.length = 0;
      achBusy = false;
      const {t, fmt} = smokeAnswer();
      cb();
      const nx = document.getElementById('next');
      ok(
        nx && nx.onclick !== route,
        'all met: the answer arms Next ' +
          JSON.stringify([
            t,
            fmt,
            promptOk(),
            !!allMetDue(),
            [...document.querySelectorAll('#tour, .unlock, .achpop')].map(x => x.className + ':' + x.textContent.slice(0, 60)),
            typeof achBusy !== 'undefined' && achBusy,
            store.get(PROMPT.KEY, null),
            answersSoFar()
          ])
      );
      if (nx) nx.click();
      const d = document.querySelectorAll('.unlock.allmet');
      ok(d.length === 1 && document.querySelectorAll('.unlock').length === 1, 'all met: Next brings the card, alone');
      if (d[0]) {
        const g = d[0].querySelector('[data-b]');
        g.disabled = false;
        g.click();
      }
      ok(
        !document.querySelector('.unlock') && document.querySelector('#view .q:not(.done)') && localStorage.getItem(amKey('c3')),
        'all met: Got it goes on to the next question, marked seen'
      );
      localStorage.removeItem(amKey('c3'));
      Object.keys(P).forEach(n => delete P[n]);
      Object.assign(P, JSON.parse(Pj));
      store.set(PROMPT.KEY, null);
      cb();
    }
    {
      closeCards();
      const nb = document.createElement('button');
      nb.onclick = route;
      ok(allMetArm(nb, 'quiz', false) && nb.onclick !== route, 'all met: the card takes the break at Next');
      ok(!allMetArm(nb, 'quiz-duel', false), 'all met: the photo quiz only');
      nb.onclick();
      const d = document.querySelectorAll('.unlock');
      ok(
        d.length === 1 &&
          d[0].classList.contains('allmet') &&
          /seen them all, for now/.test(d[0].textContent) &&
          d[0].textContent.includes(r3.lines[1]) &&
          d[0].querySelectorAll('[data-b]').length === 1,
        'all met: one card, its title, the next line, one button'
      );
      ok(!localStorage.getItem(amKey('c3')), 'all met: not marked before it is closed');
      if (d[0]) d[0].ulClose(); // left unseen (route): it comes back
      ok(allMetDue() && allMetDue().k === 'c3', 'all met: left unseen, it comes back');
      allMetShow(r3).querySelector('[data-b]').click(); // disabled for its first moments: no click
      ok(document.querySelector('.unlock.allmet'), 'all met: a reflex tap does not close it');
      closeCards();
      allMetShow(r3);
      document.querySelector('.unlock.allmet').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
      ok(!document.querySelector('.unlock.allmet') && localStorage.getItem(amKey('c3')), 'all met: closed, marked seen');
      ok(!allMetDue() && !allMetArm(nb, 'quiz', false), 'all met: once per reason');
      closeCards();
    }
    FISH.c1.forEach(n => pgAt(n, 0.7));
    // Circle 3 an option (Pierre, 2026-11-07 08:50): at FISH_C3 a card asks instead of opening; "Not now" keeps it closed
    // and the card comes back once, OPEN_AGAIN answers later, then never; My progress opens it any time; open, its
    // families open one at a time. It counts in the % either way (Q204, below).
    // The threshold reads the global score's circle-1 Entries component (core.js treeScore by[1].entries, Pierre
    // 2026-11-08: the path follows the new scores), from the one computation the headline comes from.
    ok(headScore().by[1].entries >= FISH_C3.entries && fishC3(), 'FISH_C3: the circle-1 Entries component');
    ok(fishC3() && !FISH.c3.some(mayOpen), 'circle 3 waits for the choice at FISH_C3');
    ok(openOfferDue() && openOfferDue().k === 'beyond' && !Q.beyond, 'the circle-3 card is due at FISH_C3');
    ok(!allMetDue(), 'all met: never while the circle-3 card is due');
    // A player whose circle 3 already opened by itself (before the choice existed) keeps it, and gets no card.
    const im = introMap(),
      c3a = FISH.c3[0];
    im[c3a] = [answersSoFar(), 0, Date.now(), 'c'];
    ok(FISH.c3.every(mayOpen) && !openOfferDue(), 'circle 3 already open: kept on, no card');
    delete im[c3a];
    closeCards();
    openOfferShow();
    const c3card = document.querySelector('.unlock.intro');
    ok(
      c3card &&
        /beyond the IMR course/.test(c3card.textContent) &&
        c3card.querySelector('.ulbtns .next:first-child[data-notnow]') &&
        /Open them/.test((c3card.querySelector('[data-opens]') || {}).textContent || ''),
      'the circle-3 card: Not now on top, Open them under it'
    );
    if (c3card) c3card.querySelector('[data-notnow]').click();
    closeCards();
    ok(Q.beyond === false && Q.beyondN === 1 && !FISH.c3.some(mayOpen), 'Not now keeps circle 3 closed');
    // The Scientific names offer due (a family at Advanced): it says what is next, the card waits for it. Answered, still
    // no card right after a first "Not now" on circle 3: its offer comes back (Pierre, 2026-11-12, #851).
    const sq = Q.sci;
    ok(!bonusOfferDue() || !allMetDue(), 'all met: never while the Scientific names offer is due');
    Q.sci = false; // the offer answered
    ok(!allMetDue(), 'all met: no card after a first Not now on circle 3 ' + JSON.stringify(allMetDue()));
    ok(!picks().some(n => FISH.c3.includes(n)), 'the opening never draws circle 3 after Not now');
    ok(!openOfferDue(), 'not asked again at once');
    Q.beyondA = answersSoFar() - OPEN_AGAIN;
    ok(openOfferDue() && openOfferDue().k === 'beyond', 'asked once more OPEN_AGAIN answers later');
    openNo('beyond');
    Q.beyondA = answersSoFar() - 10 * OPEN_AGAIN;
    ok(Q.beyondN === 2 && !openOfferDue(), 'then never');
    {
      // Its offer will not come back: the card points to My progress.
      const rb = allMetDue();
      ok(
        rb &&
          rb.k === 'beyond' &&
          rb.lines.length === 2 &&
          /The \d+ families beyond the IMR course wait for you: open them in My progress, any time/.test(rb.lines[1]),
        'all met: circle 3 declined for good points to My progress ' + JSON.stringify(rb)
      );
    }
    sq === undefined ? delete Q.sci : (Q.sci = sq);
    // My progress: the button opens it, as "Open them".
    quizBoard();
    const ob = document.querySelector('#view [data-opens="beyond"]');
    ok(
      ob && new RegExp(`\\(${FISH.c3.filter(n => !introduced(n)).length} families\\)`).test(ob.textContent),
      'My progress: Open the families beyond IMR (N families)'
    );
    if (ob) ob.click();
    ok(Q.beyond === true && FISH.c3.every(mayOpen), 'My progress opens circle 3');
    ok(!document.querySelector('#view [data-opens]'), 'the button goes once open');
    ok(
      picks().some(n => FISH.c3.includes(n)),
      'the opening draws circle 3 then'
    );
    ok(!openOfferDue() && (!bonusOfferDue() || bonusOfferDue().k === 'sci'), 'no circle card once open');
    ok(!allMetDue(), 'all met: not while circle 3 may open');
    amAsk(FISH.c3);
    {
      const sq = Q.sci,
        sci = SETS().find(S => S.k === 'sci');
      Q.sci = false; // the Scientific names offer answered "Not now"
      const ra = allMetDue();
      ok(
        ra &&
          ra.k === 'all' &&
          ra.lines.includes((sci.due() ? fishNextOf({sciDue: true}) : fishNextOf({})).lines[1]) &&
          !ra.lines.some(l => /beyond/.test(l)),
        'all met: every family met, the next step ' + JSON.stringify(ra)
      );
      sq === undefined ? delete Q.sci : (Q.sci = sq);
    }
    // Back as it was: the answers, the floor, the prompt spacing, the cards seen.
    am.forEach(([n, s]) => (s ? (P[n] = s) : delete P[n]));
    Object.assign(CB, cb0);
    store.set(PROMPT.KEY, pa0);
    ['c3', 'beyond', 'all'].forEach(k => localStorage.removeItem(amKey(k)));
    route();
    // Every circle in the progress: a circle-3 family learned moves the %, over all the families.
    const c3n = FISH.c3[0],
      pct = progPct(),
      hp = headScore().raw;
    pgAt(c3n, 0.9);
    ok(progPct() > pct && progPct() === progPct(slateGenera()), 'circle 3 counts in the families mean');
    ok(headScore().raw > hp && headScore().by[3].entries > 0, 'circle 3 counts in the global score');
    delete P[c3n];
    // "I'm at IMR" (the fish welcome answer imr): the IMR-tagged families first within circle 1 (Pierre, 2026-11-06 13:38): the
    // Soapfishes (taught by IMR with the Groupers, no IMR name of their own) wait for them.
    const sk = startKey('fish'),
      s0 = localStorage.getItem(sk),
      soap = FISH.c1.filter(n => !GX(n).imrName),
      pool1 = [...soap, ...FISH.c1.filter(n => GX(n).imrName && !GX(n).first).slice(0, 3)];
    ok(soap.length === 1, 'one circle-1 family without an IMR name: ' + soap);
    store.set(sk, {c: 'imr', t: Date.now(), at: 0, via: 'card', h: []});
    ok(
      [...Array(40)].every(() => GX(openPick(pool1)).imrName),
      "I'm at IMR: the IMR-tagged families first"
    );
    // No level-change card on the fish (Pierre, 2026-11-08): a window that says "easier than said" shows nothing.
    store.set(sk, {c: 'imr', t: Date.now(), at: 0, via: 'card', h: [], w: [], v: 'hi'});
    ok(startOf() && startOf().v === 'hi' && startDue() === null, 'fish: no level-change card');
    if (s0 === null) localStorage.removeItem(sk);
    else localStorage.setItem(sk, s0);
    // The scientific genera (app.js fishGenera, docs/FISH_PATH.md "Levels", branch B): one unit per genus of the
    // circle-1 species of each IMR entry, never two entries; offered once an entry is at Advanced, a family's genera in
    // play only from its Advanced; their questions and typed answers among genera only, an entry's among entries; never
    // counted in the progress, never a duel pair.
    const sci = SETS().find(S => S.k === 'sci'),
      G = FISH.sci;
    ok(G.length > 50 && G.every(n => GX(n).rank === 'genus' && FISH.c1.includes(GX(n).parent)), 'sci: genera of the circle-1 families');
    ok(
      G.every(n => GX(n).species.every(id => GX(GX(n).parent).views && FISH.gen[GX(n).parent])) &&
        new Set(G.map(n => GX(n).name)).size === G.length,
      'sci: a genus in one entry only'
    );
    ok(
      G.every(n => isBonus(n) && setOf(n) === sci),
      'sci: every genus in its set, opened or not'
    );
    FISH.c1.forEach(n => pgAt(n, 0.2));
    ok(!sci.units().length, 'sci: no genus in play before a family is at Advanced');
    // The boundary (Pierre, 2026-11-08, back from Q205's Open Water): at Open Water nothing, at Advanced the family's
    // genera and the offer.
    pgAt('f:Butterflyfishes', 0.6);
    ok(genScore('f:Butterflyfishes') >= LV_AT[0] && genScore('f:Butterflyfishes') < LV_AT[1], 'sci: the family at Open Water');
    ok(!sci.units().length && !(bonusOfferDue() && bonusOfferDue().k === 'sci'), 'sci: nothing at Open Water');
    ok(!pool().some(n => GX(n).rank), 'sci: no genus in play for a player not at IMR');
    // "I'm at IMR" (Q219, Q220): the IMR genera of a family at Open Water come without the offer, Heniochus here; never
    // another genus of the family, whose photos stay the family's question (Q221).
    {
      const sk = startKey('fish'),
        s0 = localStorage.getItem(sk);
      store.set(sk, {c: 'imr', t: Date.now(), at: 0, via: 'card', h: []});
      const gp = pool().filter(n => GX(n).rank);
      ok(gp.length === 1 && gp[0] === 'g:Heniochus' && Q.sci === undefined, "sci: I'm at IMR, Heniochus without the offer: " + gp);
      ok(!bonusOfferDue(), 'sci: no offer for it');
      // EventMeasure is named to an IMR player only (Pierre, 2026-11-12): the others read what the names are.
      ok(/EventMeasure/.test(sci.body), 'sci: the offer names EventMeasure for an IMR player');
      pgAt('f:Surgeonfishes', 0.6);
      ok(
        pool().includes('g:Naso') && !pool().some(n => /^g:(Acanthurus|Ctenochaetus|Zebrasoma)$/.test(n)),
        'sci: Naso only of the surgeonfishes'
      );
      ok(
        distractors('f:Surgeonfishes', pool(), 3).every(n => !GX(n).rank),
        'sci: a family question still among families'
      );
      pgAt('f:Surgeonfishes', 0.2);
      if (s0 === null) localStorage.removeItem(sk);
      else localStorage.setItem(sk, s0);
    }
    pgAt('f:Butterflyfishes', 0.72);
    ok(genScore('f:Butterflyfishes') >= LV_AT[1], 'sci: the family at Advanced');
    ok(
      sci.units().length && sci.units().every(n => GX(n).parent === 'f:Butterflyfishes'),
      'sci: the genera of the family at Advanced only'
    );
    ok(bonusOfferDue() && bonusOfferDue().k === 'sci', 'sci: offered once a family is at Advanced');
    ok(
      !/EventMeasure/.test(sci.body) && /Latin names scientists/.test(sci.body),
      'sci: the offer for a player not at IMR says what the names are, without EventMeasure'
    );
    const pc = progPct();
    bonusSet(true, 'sci');
    ok(
      pool().some(n => GX(n).rank) && pool().every(n => !GX(n).rank || GX(n).parent === 'f:Butterflyfishes'),
      'sci: on, the genera in play'
    );
    ok(progPct() === pc, 'sci: never counted in the families mean');
    // Families met first (Pierre, 2026-11-09, Q208 A): on, a genus card waits while a family in play is not met (model.js
    // openPick, app.js setLater); on by hand before it was due (Q.sciH, Q240), it does not.
    {
      const gx = pool().find(n => GX(n).rank && !sci.auto().includes(n));
      ok(
        gx && setLater(gx) && [...Array(40)].every(() => openPick(['f:Spadefishes', gx]) === 'f:Spadefishes'),
        'sci: no genus card while a family is not met: ' + gx
      );
      Q.sciH = true;
      ok(!setLater(gx), 'sci: on by hand early, nothing waits');
      delete Q.sciH;
    }
    // The global score (core.js treeScore, Q242) counts a genus: half its bar as its species' scientific credit.
    const hs = headScore(),
      gb = G.find(n => GX(n).parent === 'f:Butterflyfishes'),
      gs0 = P[gb];
    pgAt(gb, 0.9);
    ok(headScore().raw > hs.raw && headScore().genera > 0 && headScore().S > 0, 'sci: a genus moves the global score');
    if (gs0) P[gb] = gs0;
    else delete P[gb];
    ok(headPct() === headScore().pct, 'the headline % is the global score');
    const g0 = pool().find(n => GX(n).rank),
      e0 = 'f:Butterflyfishes';
    ok(
      distractors(g0, pool(), 3).every(n => GX(n).rank === 'genus'),
      'sci: a genus question offers genera only'
    );
    ok(
      distractors(e0, pool(), 3).every(n => !GX(n).rank),
      'sci: an entry question offers entries only'
    );
    ok(!UNITS.fish.pairs().some(pr => pr.some(n => GX(n).rank)), 'sci: no duel pair of genera');
    ok(typeMatch('Chromis').g === 'f:Damselfishes' && typeMatch('Chromis', 'genus').g === 'g:Chromis', 'sci: typed Chromis by rank');
    // Codex review #526: a genus's WoRMS-accepted name is accepted when typed (Pseudanthias tuka is now Mirolabrichthys).
    ok(typeMatch('Mirolabrichthys', 'genus') && typeMatch('Mirolabrichthys', 'genus').g === 'g:Pseudanthias', 'sci: typed accepted genus');
    // A common name (IMR's Anemonefish) never answers a genus question (docs/FISH_PATH.md; Codex review #656).
    ok((typeMatch('Anemonefish', 'genus') || {}).g !== 'g:Amphiprion', 'sci: IMR common name not a genus answer');
    // Codex review #526: a family with a single genus at Advanced still gets 3 wrong genus names (any genus may be a
    // wrong choice, as in the quiz); a genus card's photo is its easiest, most reference-like one, whoever took it
    // (Pierre, 2026-11-06: no source tier for fish), and a never-seen photo of Pierre's gets no draw bonus.
    pgAt('f:Butterflyfishes', 0.2);
    pgAt('f:Spadefishes', 0.72);
    const pl = pool().filter(n => GX(n).rank);
    ok(pl.length === 1 && GX(pl[0]).parent === 'f:Spadefishes', 'sci: the Spadefishes alone, one genus in play');
    ok(distractors(pl[0], pool(), 0).length === 3, 'sci: still 3 wrong genus names');
    ok(
      G.every(n => {
        const w = GX(n).views.wide;
        // with no pick of his, a photo of its species most seen around the instance's centre (app.js seenCover; Pierre,
        // 2026-11-13, Q339 (b)), then that species' first reference-level photo when it has any (core.js refFirst), else its
        // easiest; an open licence breaking ties among equals (core.js easyCover, Q270), so the cover may be another of the
        // order's equal leaders; never a juvenile while it has another photo (app.js juvP; Pierre, 2026-11-13)
        if (!w.length || GX(n).coverP) return true;
        const A = w.filter(p => !juvP(p)),
          c = w.find(p => p.f === GX(n).cover);
        if (!A.length) return !!c;
        // (Pierre, 2026-11-14 on #864: among the species with a reference photo; his ★ cover of that species when he has one)
        const k = p => fishSeen(p.sp)[0] * 1e6 + fishSeen(p.sp)[1],
          R = A.filter(refLevel),
          S = R.length ? R : A,
          pk = c && fishSpPick(c.sp),
          W = S.filter(p => c && p.sp === c.sp),
          top = W.filter(p => refFirst(p) === refFirst(W[0]));
        return (
          !!c &&
          c.f === seenCover(w, fishSeen, undefined, fishSpPick).f &&
          k(c) === Math.max(...S.map(k)) &&
          (pk && A.some(p => p.f === pk.f)
            ? c.f === pk.f
            : refFirst(c) === refFirst(W[0]) && top.every(p => photoDiff(n, p) >= photoDiff(n, c)))
        );
      }),
      "sci: a genus card's photo is its most seen species' (with a reference photo) his ★ pick or easiest"
    );
    ok(!isCore({own: true, e: 5}), "fish: Pierre's own photo gets no draw bonus");
    // The back card (Pierre, 2026-11-08): once, to a player who turned them on before the change (no sciV); "Close them
    // for now" turns them off, and either answer is never asked again.
    ok(!bonusBackDue(), 'sci: no back card for a choice made now');
    delete Q.sciV;
    ok(bonusBackDue() && bonusBackDue().k === 'sci', 'sci: the back card for a choice made before');
    closeCards();
    // Over a question on a genus about to close (Codex review #720): the question is replaced once they are closed.
    const gq = pool().find(n => GX(n).rank && photoSet(n).shown.length);
    if (gq) {
      dropPlans();
      SHOWNQ = null;
      question('quiz', gq, distractors(gq, pool(), 3), '', photoSet(gq));
      SHOWNQ = ['quiz', gq];
    }
    bonusBackShow();
    const bk = document.querySelector('.unlock [data-sciback]');
    ok(bk && /Close them for now/.test(bk.textContent), 'sci: the back card, Close them for now');
    if (bk) bk.click();
    closeCards();
    ok(Q.sci === false && Q.sciV === 1 && !bonusBackDue(), 'sci: closed, never asked again');
    // route() leaves the question unanswered (QOPEN false), then draws the next among the units in play
    ok(!gq || (!pool().includes(gq) && (!QOPEN || (SHOWNQ && SHOWNQ[1] !== gq))), 'sci: the genus question on screen replaced once closed');
    ok(!pool().some(n => GX(n).rank), 'sci: Off, out of the draw');
    // Never locked by the offer (Pierre, 2026-11-08): My progress turns them on while off, as ⚙ does.
    quizBoard();
    const so = document.querySelector('#view [data-seton="sci"]');
    ok(so && /Turn on scientific names/.test(so.textContent), 'sci: My progress offers to turn them on while off');
    if (so) so.click();
    ok(Q.sci === true && !document.querySelector('#view [data-seton="sci"]'), 'sci: on from My progress, the box gone');
    bonusSet(false, 'sci');
    route();
    // Report a problem after a fish answer (fish beta sweep, 2026-11-05: the right-answer list offered the teaching ids,
    // "t01", and the dialog spoke of genera and corals): the fish names, in the fish words.
    closeCards();
    quizPhoto();
    smokeAnswer(false);
    const rb = document.querySelector('#view [data-rep]');
    ok(rb, 'report: a Report button after the answer');
    if (rb) {
      rb.click();
      const dl = document.querySelector('#repdlg');
      const opts = [...dl.querySelectorAll('#repgen option')].map(o => o.value);
      ok(
        opts.length >= 27 && opts.includes('Damselfishes') && opts.includes('Frogfishes'),
        'report: the fish names offered ' + opts.slice(0, 3)
      );
      ok(!opts.some(o => /^t\d+$/.test(o)), 'report: no teaching id offered ' + opts.filter(o => /^t\d+$/.test(o)).slice(0, 3));
      const txt = dl.textContent;
      ok(/Right family, if you know/.test(txt) && /Several fish species/.test(txt), 'report: the fish words');
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
  // one state (Pierre, 2026-11-04; docs/DESIGN.md "Subject switch"): a Corals | Fish row at the top of Home and a switch
  // next to the logo in the header, on every page but Home (Pierre, 2026-11-08), the chip and its menu with three subjects; the header keeps its size and Home
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
    // The two switches and the header: which subject each one shows, the header switch's place (next to the logo, inside
    // the header's one line, clear of the controls), the header's height with and without it (rule U3), Home's height.
    // Two subjects: the header holds a one-click switch, a button a subject (Pierre, 2026-11-08), not the chip's menu. On
    // Home the header's switch steps aside (Pierre, 2026-11-08: it doubled Home's row), keeping its room: shown says
    // whether it can be seen and reached (a click at its middle lands on it); at, where the header's items are.
    const look = () =>
      q.evaluate(() => {
        const row = document.querySelector('#view .hsubj'),
          chip = document.querySelector('#subjc .subjsw'),
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
          chip:
            chip && chip.offsetParent && !document.getElementById('subjb')
              ? [...chip.querySelectorAll('[data-subj]')]
                  .map(x => x.dataset.subj + (x.getAttribute('aria-pressed') === 'true' ? '*' : ''))
                  .join()
              : '',
          // Each side a button of its own, its name its label (phones: the icon only, the name visually hidden).
          named: !!chip && [...chip.querySelectorAll('button[data-subj]')].every(x => x.textContent.trim()),
          nextToLogo: !!(cb && home && cb.left >= home.right - 1 && cb.left - home.right < 24),
          clear: !!cb && tools.every(t => cb.right <= t.left || cb.left >= t.right),
          inLine: !!cb && cb.top >= hdr.getBoundingClientRect().top && cb.bottom <= hdr.getBoundingClientRect().top + h0,
          hdr: [h0, h1],
          shown:
            !!cb &&
            getComputedStyle(chip).visibility === 'visible' &&
            chip.contains(document.elementFromPoint((cb.left + cb.right) / 2, (cb.top + cb.bottom) / 2)),
          at: JSON.stringify([home, ...tools].map(r => [r.left, r.top, r.width, r.height].map(Math.round))),
          fits: document.documentElement.scrollHeight <= innerHeight + 1
        };
      });
    // Home, corals on: the row (Corals pressed), the header switch hidden there (its state still followed), Home one
    // screen, the header's size unchanged.
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    const h0 = await look();
    if (h0.subj !== 'coral' || !/coral\*/.test(h0.row) || !/fish(?!\*)/.test(h0.row) || !h0.rowFull || !h0.rowFirst)
      ui.push(`${width}px Home, Corals on: no Corals | Fish row at the top ${JSON.stringify(h0)}`);
    if (h0.chip !== 'coral*,fish' || h0.shown || h0.hdr[0] !== h0.hdr[1])
      ui.push(`${width}px header switch on Home, Corals on (hidden, its room kept): ${JSON.stringify(h0)}`);
    if (!h0.fits) ui.push(`${width}px Home with the subject row: more than one screen ${JSON.stringify(h0)}`);
    // Learn: the header switch shows there, in its place (next to the logo, one line, clear of the controls), and the
    // header and its items do not move between Home and Learn.
    await q.evaluate(() => (location.hash = '#learn/genera'));
    await q.waitForFunction(() => window.ROUTED === 'genera' && document.querySelector('#view .gdiv'), null, {timeout: 15000});
    const l0 = await look();
    if (l0.chip !== 'coral*,fish' || !l0.shown || !l0.named || !l0.nextToLogo || !l0.clear || !l0.inLine || l0.hdr[0] !== l0.hdr[1])
      ui.push(`${width}px header switch on Learn, Corals on: ${JSON.stringify(l0)}`);
    if (l0.hdr[1] !== h0.hdr[1] || l0.at !== h0.at)
      ui.push(`${width}px the header moves between Home and Learn: Home ${JSON.stringify(h0.at)} ${h0.hdr}, Learn ${l0.at} ${l0.hdr}`);
    await q.evaluate(() => document.querySelector('.brand .home').click()); // Home without a reload
    await q.waitForFunction(() => (window.ROUTED || 'home') === 'home' && document.querySelector('#view .home-page'), null, {
      timeout: 15000
    });
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
    if (saved !== '"fish"' || !/fish\*/.test(h1.row) || h1.chip !== 'coral,fish*' || h1.shown || h1.hdr[0] !== h1.hdr[1] || !h1.fits)
      ui.push(`${width}px Fish chosen on Home: ${JSON.stringify({...h1, saved})}`);
    // From the keyboard on Home: Tab never stops on the hidden header switch; Enter on the row's Corals switches, and the
    // focus stays on Home's row, on the side chosen, once Home is drawn again.
    await q.focus('.brand .home');
    await q.keyboard.press('Tab');
    const t1 = await q.evaluate(() => ({inHdr: !!document.activeElement.closest('#subjc'), tag: document.activeElement.tagName}));
    await q.focus('#view .hsubj [data-subj="coral"]');
    await q.keyboard.press('Enter');
    await q.waitForFunction(() => SUBJ.id === 'coral' && document.querySelector('#view .hsubj'), null, {timeout: 30000}).catch(() => {});
    await q.waitForTimeout(100);
    const k1 = await q.evaluate(() => ({
      row: !!document.activeElement.closest('#view .hsubj'),
      subj: document.activeElement.dataset.subj,
      pressed: document.activeElement.getAttribute('aria-pressed')
    }));
    if (t1.inHdr || !k1.row || k1.subj !== 'coral' || k1.pressed !== 'true')
      ui.push(`${width}px Home's row from the keyboard: Tab from the logo ${JSON.stringify(t1)}, after Enter ${JSON.stringify(k1)}`);
    await q.click('#view .hsubj [data-subj="fish"]');
    await q.waitForFunction(() => SUBJ.id === 'fish' && document.querySelector('#view .hsubj'), null, {timeout: 30000});
    // The Learn door's landscape tiles: a family's ★ Cover where it suits the tile (whole fish, 4:3 to 16:9), else the
    // mosaic's own pick (Pierre, 2026-11-08, Q291); every tile, and the Identify door's art, one of those.
    // By photo, not by address (as the family sheet's hero below): every R2 photo fails in this smoke, so R2 goes off
    // mid-run (app.js photoFail, r2Out) and a photo shown under its R2 address may be read under its online original
    // (core.js photoAway), or the reverse, depending on when the failure lands (the train of #778 caught it on CI).
    const ht = await q.evaluate(() => {
      const srcOf = p => (/src="([^"]*)"/.exec(thumb(p, '1px')) || [])[1],
        shows = (u, p) =>
          !!u &&
          !!p &&
          (u === srcOf(p) || (photoFileOf(u) || {}).f === p.f || (!!p.src && ['t', 's', 'm', ''].some(z => u === photoOnline(p.src, z)))),
        suits = p => !!p && p.ar >= 1.3 && p.ar <= 1.8 && String(p.jt || '').charAt(1) === '1',
        want = n => {
          const g = GX(n),
            L = g.views.wide;
          return suits(g.coverP) ? g.coverP : L.slice(0, 10).find(suits) || L[0];
        },
        W = slateGenera()
          .filter(n => GX(n).views.wide.length)
          .map(n => want(n)),
        Cn = slateGenera().filter(n => suits(GX(n).coverP)),
        C = Cn.map(n => GX(n).coverP),
        T = [...document.querySelectorAll('#view .hdoor.learn .hdtiles img, #view .hdoor.identify .hdart img')].map(i =>
          i.getAttribute('src')
        );
      return {
        n: T.length,
        covers: T.filter(x => C.some(p => shows(x, p))).length,
        // the tiles of a family whose cover fits: Home draws 12 families at random, so none may come (#785's CI run),
        // and each that comes must show its cover
        ofC: T.filter(x => Cn.some(n => shows(x, GX(n).coverP) || GX(n).views.wide.some(p => shows(x, p)))).length,
        fits: C.length,
        bad: T.filter(x => !W.some(p => shows(x, p)))
      };
    });
    if (!ht.n || ht.bad.length || ht.covers !== ht.ofC)
      ui.push(`${width}px Home, Fish on: the tiles are not the covers that fit ${JSON.stringify(ht)}`);
    await wide('Home, Fish on');
    // Tools: no subject tile and no emoji on the links to Tools any more; the header switch is there, on every page but
    // Home, in its place, the header as on Home.
    await q.evaluate(() => (location.hash = '#tools'));
    await q.waitForFunction(() => document.querySelector('#view .labhub'), null, {timeout: 15000});
    const tl = await q.evaluate(() => ({
      tile: !!document.querySelector('#view .labsubj, #view [data-subj]'),
      badge: [...document.querySelectorAll('.labgo, .sections a[data-tab="lab"]')].some(a => a.dataset.badge)
    }));
    const t0 = await look();
    if (
      tl.tile ||
      tl.badge ||
      t0.chip !== 'coral,fish*' ||
      !t0.shown ||
      !t0.nextToLogo ||
      !t0.inLine ||
      t0.at !== h1.at ||
      t0.hdr[1] !== h1.hdr[1]
    )
      ui.push(`${width}px Tools with Fish on: ${JSON.stringify({...tl, ...t0, home: [h1.at, h1.hdr]})}`);
    // The families page (learn.js viewFishList): the groups of the identification key in force (fish.json key,
    // rule S3), in the key's order, only those that hold a family of the slate (every circle: Pierre, 2026-11-06, Q175),
    // each under its number and title as the key prints them, every family under its own group; the key credited in full
    // under the list.
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
        want = G.filter(g => slateGenera().some(n => GX(n).group === g.n)).map(g => g.n),
        cite = (document.querySelector('#view .keycite') || {}).textContent || '';
      return {
        order: c1.map(h => h.n).join() === want.join(),
        titles: c1.every(h => (G.find(g => g.n === h.n) || {}).title === h.t),
        placed: c1.every(h => h.ids.every(nm => slateGenera().some(n => unameT(n) === nm && GX(n).group === h.n))),
        got: c1.map(h => h.n).join(),
        want: want.join(),
        cite: !!K.cite && cite.includes(K.cite)
      };
    });
    if (!fam.order || !fam.titles || !fam.placed || !fam.cite) ui.push(`${width}px families page: ${JSON.stringify(fam)}`);
    // Each family's photo there is Pierre's ★ Cover (curation.json fish genera, app.js fishCurate) while it is in play,
    // else the card photo as before (cover(): the easiest, ties on the licence, Q270; 2026-11-08: his covers never showed).
    // By photo, not by address (R2 goes off mid-run here: the Home check above).
    const fcv = await q.evaluate(() => {
      const srcOf = a => (/src="([^"]*)"/.exec(a) || [])[1],
        shows = (u, p) =>
          !!u &&
          !!p &&
          (u === srcOf(thumb(p, '130px')) ||
            (photoFileOf(u) || {}).f === p.f ||
            (!!p.src && ['t', 's', 'm', ''].some(z => u === photoOnline(p.src, z)))),
        cards = [...document.querySelectorAll('#view .tipg')].map(a => ({
          n: slateGenera().find(n => unameT(n) === (a.querySelector('.tipph b') || {}).textContent),
          src: (a.querySelector('.tipph img') || {getAttribute: () => ''}).getAttribute('src')
        })),
        cur = Object.keys(((CUR || {}).fish || {}).genera || {}).filter(n => FISH.gen[n] && FISH.gen[n].coverP);
      return {
        cur: cur.length,
        shown: cards.filter(c => c.n && FISH.gen[c.n].coverP).length,
        bad: cards
          .filter(c => c.n && FISH.gen[c.n].views.wide.length)
          .filter(c => !shows(c.src, cover(FISH.gen[c.n])))
          .map(c => c.n)
      };
    });
    if (!fcv.shown || fcv.bad.length)
      ui.push(`${width}px families page: the cards' photos are not the curated covers ${JSON.stringify(fcv)}`);
    await wide('the families page');
    // A family's photo enlarges in the shared viewer, as the coral photos do (fish beta QA, 2026-11-06).
    await q.click('#view .tipph .zoom');
    const fz = await q.evaluate(() => {
      const L = document.getElementById('lightbox');
      return {open: !!L && !L.hidden && !!L.querySelector('.lb-in img'), cap: ((L && L.querySelector('.lb-cap')) || {}).textContent || ''};
    });
    if (!fz.open || !/Damselfish|fish/i.test(fz.cap))
      ui.push(`${width}px families page: a photo tapped did not enlarge ${JSON.stringify(fz)}`);
    await q.click('#lightbox [data-x]');
    // The family sheets (learn.js viewFishSheet; the fish-sheets study, option B): a family on the families page opens its
    // sheet, under the book's English name with its scientific name below; an old entry id links to its family; the only
    // genus of a family opens the family sheet; the species filter is on by default and one tap shows them all.
    await q.click('#view .tipg a.tipsheet');
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
    // Its hero photo is the family's curated cover too, when it has one in play (app.js fishCurate).
    const hc = await q.evaluate(() => {
      const g = FISH.gen['f:' + decodeURIComponent(location.hash.split('/').pop())],
        h = document.querySelector('#view .hero-ph img');
      // By photo, not by address: a photo's address moves from R2 to its iNaturalist original when R2 fails mid-run
      // (core.js photoUrl fallback), so the same cover can show under either.
      const id = String((g && g.coverP && g.coverP.f) || ''),
        got = h ? h.getAttribute('src') : '',
        alt = id.replace(/^fi(\d+)$/, 'photos/$1/');
      return !g || !g.coverP
        ? null
        : {want: img(g.coverP, 's'), got, same: !!id && (got.includes(id) || (alt !== id && got.includes(alt)))};
    });
    if (hc && hc.want !== hc.got && !hc.same) ui.push(`${width}px family sheet: the hero is not the curated cover ${JSON.stringify(hc)}`);
    // The family ID marks and behaviour lines (tools/fish_sheets.json), with their sources and a report link.
    const mk = await q.evaluate(() => {
      const m = document.querySelector('#view .fmarks');
      return {
        n: m ? m.querySelectorAll('li').length : 0,
        src: !!(m && m.querySelector('.msrc a[href*="fishbase"]')),
        rep: !!(m && m.querySelector('.msrc [data-rep]'))
      };
    });
    if (!mk.n || !mk.src || !mk.rep) ui.push(`${width}px family marks: ${JSON.stringify(mk)}`);
    // The family size range counts total lengths only (Codex review #696: the Stingrays mixed a disc width in).
    const rg = await q.evaluate(() => {
      const f = ftree().fam['f:Stingrays'],
        L = famSpecies(f).filter(s => s.size);
      return {mixed: L.some(s => s.size.lt), line: famSizes(f), tl: L.filter(s => !s.size.lt).map(s => s.size.len)};
    });
    if (rg.mixed && rg.tl.length < 2 && /reach/.test(rg.line))
      ui.push(`${width}px family size range mixes measures: ${JSON.stringify(rg)}`);
    await wide('a family sheet');
    // A family IMR gives no cue for (Frogfishes, circle 3): its own ID marks on its sheet, and in the first-meeting card,
    // the feedback and the families page under a label naming their sources, never IMR's (app.js fishGenera qt, tl).
    await q.evaluate(() => (location.hash = '#fish/learn/family/Frogfishes'));
    await q.waitForFunction(() => document.querySelector('#view .fsheet .fmarks'), null, {timeout: 15000}).catch(() => {});
    const nm = await q.evaluate(() => {
      const m = document.querySelector('#view .fmarks'),
        g = GX('f:Frogfishes'),
        card = introCard('f:Frogfishes').body,
        fb = fbBody('f:Frogfishes', 'f:Frogfishes', true, false, false, [], '', null);
      return {
        h: ((m && m.querySelector('h3')) || {}).textContent || '',
        n: m ? m.querySelectorAll('ul.crit')[0].querySelectorAll('li').length : 0,
        imr: !!document.querySelector('#view .tipbox .idtips'),
        tl: g.tl,
        card: card.includes(g.tl) && g.qt.every(x => card.includes(x.split(' ')[0])),
        fb: fb.includes(g.tl) && fb.includes('idtips')
      };
    });
    if (nm.h !== 'Family ID marks' || nm.n < 1 || nm.imr || !/^ID marks \(FishBase/.test(nm.tl || '') || !nm.card || !nm.fb)
      ui.push(`${width}px family with no IMR cue: ${JSON.stringify(nm)}`);
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
    // The filter starts on again on the next sheet opened (Codex review #675); every circle's families are in the
    // sheets' previous / next, both families of an entry renamed into two included (Seahorses, Waspfishes).
    await q.evaluate(() => (location.hash = '#fish/learn/family/Rabbitfishes'));
    await q
      .waitForFunction(() => location.hash.endsWith('/Rabbitfishes') && document.querySelector('#view .fsheet [data-mine]'), null, {
        timeout: 15000
      })
      .catch(() => {});
    const re = await q.evaluate(() => {
      // Every circle is on the path (Q175, Q177): circles 2 and 3's families are in the sheets' previous / next, no opt-in.
      const on = (document.querySelector('#view .seg [data-mine="1"]') || {}).getAttribute?.('aria-pressed'),
        L = fishShown();
      // The species of a family an entry was split into count with that entry (Codex review #675: t46, the Seahorses).
      const units = Object.entries(SUBJ.renamed.split || {})
        .flatMap(([t, m]) => Object.values(m).map(f => [t, f]))
        .every(([t, f]) => famUnit(f) === (GX(f) ? f : t));
      return {
        on,
        seahorses: L.includes('f:Seahorses'),
        wasp: L.includes('f:Waspfishes'),
        pipe: L.includes('f:Pipefishes'),
        off: true,
        units
      };
    });
    if (re.on !== 'true' || !re.seahorses || !re.wasp || !re.pipe || !re.off || !re.units)
      ui.push(`${width}px sheet filter and circles: ${JSON.stringify(re)}`);
    // A genus row opens its short genus page (option B): its species, the filter, its IMR cues, its sibling genera.
    await q.evaluate(() => (location.hash = '#fish/learn/family/Damselfishes'));
    await q.waitForFunction(() => document.querySelector('#view .fsheet a.frow'), null, {timeout: 15000});
    await q.click('#view .fsheet a.frow[href$="/genus/Chromis"]');
    await q
      .waitForFunction(() => location.hash === '#fish/learn/genus/Chromis' && document.querySelector('#view .fsheet .fn-t i'), null, {
        timeout: 15000
      })
      .catch(() => {});
    const gp = await q
      .evaluate(() => {
        document.querySelector('#view .seg [data-mine="0"]').click();
        return {
          hash: location.hash,
          name: (document.querySelector('#view .fn-t') || {}).textContent,
          tips: document.querySelectorAll('#view .tipbox .idtips li').length,
          tiles: document.querySelectorAll('#view .ftiles .ftile').length,
          sib: document.querySelectorAll('#view .hubsec a.lt').length,
          bar: (document.querySelector('#modes .ctx-t') || {}).textContent || ''
        };
      })
      .catch(e => ({err: e.message}));
    if (gp.name !== 'Chromis' || gp.tips !== 2 || gp.tiles !== CHROMIS || gp.sib < 2 || !/genus/.test(gp.bar))
      ui.push(`${width}px genus page: ${JSON.stringify(gp)}`);
    await wide('a genus page');
    // A species tile opens its species sheet (scientific name first, its common name, badges, photos, the other species of
    // its genus); a genus with one species opens that species' sheet (option B).
    await q.click('#view .ftiles a.ftile');
    await q
      .waitForFunction(() => location.hash.startsWith('#fish/learn/species/') && document.querySelector('#view .fbadges'), null, {
        timeout: 15000
      })
      .catch(() => {});
    const ss = await q.evaluate(() => ({
      hash: location.hash,
      name: (document.querySelector('#view .fn-t') || {}).textContent || '',
      badges: document.querySelectorAll('#view .fbadges .chip').length,
      fam: !!document.querySelector('#view .fbadges a[href="#fish/learn/family/Damselfishes"]'),
      photo: !!document.querySelector('#view .fphotos img, #view .fphotos .nofish'),
      sib: document.querySelectorAll('#view .ftiles a.ftile').length,
      bar: (document.querySelector('#modes .ctx-t') || {}).textContent || ''
    }));
    if (
      !/^Chromis /.test(ss.name) ||
      decodeURIComponent(ss.hash) !== '#fish/learn/species/' + ss.name ||
      ss.badges < 3 ||
      !ss.fam ||
      !ss.photo ||
      ss.sib !== CHROMIS - 1 ||
      !ss.bar.includes(ss.name)
    )
      ui.push(`${width}px species sheet: ${JSON.stringify(ss)}`);
    await wide('a species sheet');
    await q.evaluate(() => (location.hash = '#fish/learn/genus/Zanclus'));
    await q.waitForFunction(() => location.hash === '#fish/learn/species/Zanclus%20cornutus', null, {timeout: 15000}).catch(() => {});
    const zh = await q.evaluate(() => location.hash);
    if (zh !== '#fish/learn/species/Zanclus%20cornutus') ui.push(`${width}px a one-species genus: ${zh}`);
    // A genus common name (fish.json genera common): under the genus page's scientific name, on its family sheet's row and
    // on its species' genus chip.
    await q.evaluate(() => (location.hash = '#fish/learn/genus/Amphiprion'));
    await q
      .waitForFunction(() => /Amphiprion/.test((document.querySelector('#view .fsheet .fn-t') || {}).textContent || ''), null, {
        timeout: 15000
      })
      .catch(() => {});
    const gc = await q.evaluate(() => ({
      sub: (document.querySelector('#view .fsheet .fn-s') || {}).textContent || '',
      src: (document.querySelector('#view .fsheet .sheetmore .refs') || {}).textContent || ''
    }));
    await q.evaluate(() => (location.hash = '#fish/learn/family/Damselfishes'));
    await q
      .waitForFunction(() => document.querySelector('#view .fsheet a.frow[href$="/genus/Amphiprion"]'), null, {timeout: 15000})
      .catch(() => {});
    gc.row = await q.evaluate(() => (document.querySelector('#view .fsheet a.frow[href$="/genus/Amphiprion"]') || {}).textContent || '');
    await q.evaluate(() => (location.hash = '#fish/learn/species/Amphiprion%20clarkii'));
    await q.waitForFunction(() => document.querySelector('#view .fbadges'), null, {timeout: 15000}).catch(() => {});
    gc.chip = await q.evaluate(() => (document.querySelector('#view .fbadges a[href$="/genus/Amphiprion"]') || {}).textContent || '');
    if (
      gc.sub !== 'Anemonefishes' ||
      !/IMR fish presentation/.test(gc.src) ||
      !/Anemonefishes/.test(gc.row) ||
      !/Anemonefishes/.test(gc.chip)
    )
      ui.push(`${width}px genus common name: ${JSON.stringify(gc)}`);
    await q.evaluate(() => (location.hash = '#practice/quiz'));
    await q.waitForFunction(() => document.querySelector('#view .q'), null, {timeout: 15000});
    // The first-meeting cards over the first question: closed one by one with their own button.
    for (let i = 0; i < 8 && (await q.$('.unlock')); i++) await q.click('.unlock .next:not(.sec)');
    const qs = await q.evaluate(() => {
      // answer.js: a new fish player's first question: choices
      const B = [...document.querySelectorAll('#view .ans [data-c]')];
      return {n: B.length, plain: B.every(x => x.classList.contains('plain')), fish: B.every(x => GX(x.dataset.c) && GX(x.dataset.c).name)};
    });
    if (qs.n !== 4 || !qs.plain || !qs.fish) ui.push(`${width}px question: ${JSON.stringify(qs)}`);
    // A question drawn outside a route (as after the welcome question and the first cards) is sized with the intro
    // already behind ? (fish beta QA, 2026-11-06: measured under it, before its observer ran, Q1 got the minimum height,
    // a small letterboxed photo): the stage takes the window below the header, measured at once.
    const fit1 = await q.evaluate(() => {
      // A photo-to-name question from here on (its stage, its enlarged photo): no Find the X (quiz.js FIND; (11) checks it).
      FIND.P = 0;
      quizPhoto();
      const Q = $v.querySelector('.q'),
        want = innerHeight - Q.getBoundingClientRect().top - window.scrollY - 16 - tabH();
      return {
        qh: parseFloat(Q.style.getPropertyValue('--qh')),
        want: Math.max(260, want),
        lede: $v.querySelectorAll(':scope > .lede').length
      };
    });
    if (Math.abs(fit1.qh - fit1.want) > 2 || fit1.lede) ui.push(`${width}px a question's stage: ${JSON.stringify(fit1)}`);
    for (let i = 0; i < 8 && (await q.$('.unlock')); i++) await q.click('.unlock .next:not(.sec)');
    await wide('a fish question');
    await q.click('#view .qph .zoom');
    const blind = await q.evaluate(() => {
      const c = document.querySelector('#lightbox .lb-cap');
      return {t: c ? c.textContent : '', links: c ? c.querySelectorAll('a').length : -1, sp: SHOWNQ ? GX(SHOWNQ[1]).name : ''};
    });
    if (!/©\s*\S/.test(blind.t) || blind.links || (blind.sp && blind.t.includes(blind.sp)))
      ui.push(`${width}px enlarged photo before the answer: ${JSON.stringify(blind)}`);
    await q.click('#lightbox [data-x]');
    // The photo's species under the verdict (app.js taxonLine; Pierre, 2026-11-09): never before the answer (no line, its
    // scientific name nowhere on the page), then one line after it, right or wrong, with Next still on screen.
    const spq = await q.evaluate(() => {
      const t = SHOWNQ[1],
        f = ((SHOWNQ[4] || {}).shown || [])[0],
        p = GX(t).views.wide.find(x => f && x.f === f.f) || {},
        s = FISH.sps[p.sp] || {};
      return {
        sci: s.name || '',
        common: cnList(s)[0] || '',
        now: s.now && s.now !== s.name ? s.now : '',
        line: !!document.querySelector('.fbsp')
      };
    });
    const spBefore = await q.evaluate(sci => document.body.textContent.includes(sci), spq.sci);
    if (!spq.sci || spq.line || spBefore)
      ui.push(`${width}px the photo's species before the answer: ${JSON.stringify({...spq, spBefore})}`);
    await qa.ready(q);
    await q.evaluate(() => smokeAnswer(false));
    const spa = await q.evaluate(() => {
      const l = document.querySelector('#after .fb h3 + .fbsp'),
        nb = document.getElementById('next').getBoundingClientRect();
      return {
        text: l ? l.textContent.replace(/\s+/g, ' ').trim() : '',
        nextIn: nb.bottom <= innerHeight && nb.top >= 0,
        n: document.querySelectorAll('.fbsp').length
      };
    });
    const spWant = `This photo: ${spq.common ? spq.common + ' · ' : ''}${spq.sci}${spq.now ? ` (now ${spq.now} in WoRMS)` : ''}`;
    if (spa.text !== spWant || spa.n !== 1 || !spa.nextIn)
      ui.push(`${width}px the photo's species after the answer: ${JSON.stringify({spa, spWant})}`);
    const after = await q.evaluate(() => {
      const fb = document.querySelector('#after .fb'),
        // the photo's page: its iNaturalist observation, or its FishBase photo page (a FishBase reference photo, #660)
        cr = fb && fb.querySelector('.credit a[href*="inaturalist.org"], .credit a[href*="fishbase."]');
      return {fb: !!fb, credit: !!cr, h3: fb ? fb.querySelector('h3').textContent : ''};
    });
    if (!after.fb || !after.credit) ui.push(`${width}px answer: no full credit with its link ${JSON.stringify(after)}`);
    // A name in common use typed (Clownfish): right, the verdict's one line names the usual name gently (Pierre,
    // 2026-11-06, Q164), as the spelling step's line (.tystep); a plain name keeps the plain line.
    const oft = await q.evaluate(() => {
      const line = t => {
        const m = typeMatch(t),
          d = document.createElement('div');
        d.innerHTML = fbBody(m.g, m.g, true, false, false, [], typeRead(m, t, null), typeStep(m, t, null));
        const h = d.querySelector('h3');
        return [h.textContent.replace(/\s+/g, ' ').trim(), h.classList.contains('tystep'), !!d.querySelector('.tyread')];
      };
      return {clown: line('clown'), clownfish: line('Clownfish'), damsel: line('damsel')};
    });
    if (
      !/^✓ Yes, Anemonefish \(often called clownfish\): it's Damselfish/.test(oft.clown[0]) ||
      !oft.clown[1] ||
      oft.clown[2] ||
      oft.clownfish[0] !== oft.clown[0] ||
      !/^✓ Yes, it's Damselfish/.test(oft.damsel[0]) ||
      oft.damsel[1]
    )
      ui.push(`${width}px a name in common use typed: ${JSON.stringify(oft)}`);
    // A name several families share typed (Pierre, 2026-11-09, Q319): right on each of them and said so; on another
    // family a wrong answer with no unit given (no "Your answer would show" block), every family it names said.
    const shared = await q.evaluate(() => {
      // sp: the photo's species (Q333: a name of part of the family counts only on a photo it designates)
      const at = (t, g, sp = []) => {
        const m = typeMatch(t),
          c = typeUnit(m, g, sp),
          d = document.createElement('div');
        d.innerHTML = fbBody(g, c, c === g, false, false, [], typeRead(m, t, null, g, sp), typeStep(m, t, null, g));
        return [
          c,
          d.querySelector('h3').textContent.replace(/\s+/g, ' ').trim(),
          (d.querySelector('.tyread') || {}).textContent || '',
          !!d.querySelector('.fb > p.vs:not(.tyread)')
        ];
      };
      return {
        sol: at('Holocentridae', 'f:Soldierfishes'),
        wr: at('Holocentridae', 'f:Wrasses'),
        shr: at('razorfish', 'f:Shrimpfishes'),
        ini: at('razorfish', 'f:Wrasses'),
        pipe: at('razorfish', 'f:Pipefishes'),
        sp: at('Peacock razorfish', 'f:Wrasses'),
        // a cleaner wrasse typed "razorfish": a mistake, said so (Pierre, 2026-11-09 ~15:45 Manila, Q333)
        cl: at('razorfish', 'f:Wrasses', [Object.keys(FISH.spn).find(i => FISH.spn[i] === 'Labroides dimidiatus')])
      };
    });
    if (
      shared.sol[0] !== 'f:Soldierfishes' ||
      !/^✓ Yes, it's Soldierfishes/.test(shared.sol[1]) ||
      shared.sol[2] !== '“Holocentridae” is also used for the Squirrelfishes.' ||
      shared.wr[0] !== '' ||
      !/^✗ No, it's Wrasses/.test(shared.wr[1]) ||
      shared.wr[2] !== '“Holocentridae” names the Soldierfishes and the Squirrelfishes.' ||
      shared.wr[3] ||
      // the name index (Q320): razorfish, the Shrimpfishes' and some wrasses'; a species' name, its family's
      shared.shr[2] !== '“razorfish” is a name of the Shrimpfishes. It is also used for some Wrasses.' ||
      shared.ini[0] !== 'f:Wrasses' ||
      shared.ini[2] !== '“razorfish” is a name of some Wrasses. It is also used for the Shrimpfishes.' ||
      shared.pipe[0] !== '' ||
      shared.pipe[2] !== '“razorfish” names the Shrimpfishes and some Wrasses.' ||
      !/^✓ Yes, it's Wrasses/.test(shared.sp[1]) ||
      shared.sp[2] !== '“Peacock razorfish” is one of the Wrasses.' ||
      shared.cl[0] !== '' ||
      !/^✗ No, it's Wrasses/.test(shared.cl[1]) ||
      shared.cl[2] !== '“razorfish” is a name of some Wrasses, not this one. It is also used for the Shrimpfishes.'
    )
      ui.push(`${width}px a shared name typed: ${JSON.stringify(shared)}`);
    await wide('the answer');
    await q.evaluate(() => (location.hash = '#progress'));
    await q.waitForFunction(() => document.querySelector('#view .pgame'), null, {timeout: 15000});
    await wide('My progress');
    // The bar's note names the subject's unit (SUBJECTS one), never "genus" on fish (fish beta QA, 2026-11-06).
    const pnote = await q.evaluate(() => (document.querySelector('#view .plvlnote') || {}).textContent || '');
    if (!pnote.includes('each family is')) ui.push(`${width}px My progress note: ${JSON.stringify(pnote)}`);
    // The leaderboard's toast is never said on a subject without one (fish beta QA, 2026-11-06: it covered fish Home):
    // it stays due. Every subject has a leaderboard since sheet v95, so this one is made one without for the check. The
    // sync stubbed in memory only (sent14 set: no call to the sheet, rule D1).
    const bt = await q.evaluate(() => {
      const s0 = SYNC,
        b0 = SUBJ.board;
      store.set('reefid-board-sent14', 1);
      store.set('reefid-board-told', 0);
      SYNC = {name: 'Test', code: 'x'};
      SUBJ.board = false;
      noticesGo(); // as after the visit's first sync (sync.js noticeLater): this made-up account never syncs
      boardNotice();
      const r = {toast: !!document.querySelector('.apptoast'), told: store.get('reefid-board-told', 0)};
      SYNC = s0;
      SUBJ.board = b0;
      return r;
    });
    if (bt.toast || bt.told) ui.push(`${width}px leaderboard toast on Fish: ${JSON.stringify(bt)}`);
    // The fish leaderboard (Pierre, 2026-11-04: separate per subject): #leaderboard on Fish asks the sheet for the fish
    // board (&s=fish), shown only from a script that serves it (sheet v95, rule D4), kept apart from the corals' copy.
    // The sheet's reply is a fixture (the page's fetch wrapped in memory; nothing leaves this computer, rule D1).
    const fb = await q.evaluate(async () => {
      const f0 = window.fetch,
        asked = [];
      let v = BOARD_SHEET - 1;
      window.fetch = u => {
        asked.push(String(u).replace(/^.*\?/, ''));
        const rows = /s=fish/.test(u)
          ? [
              ['Fish P', 63, 0.8],
              ['Other P', 20, null]
            ]
          : [['Coral P', 90, 1.1]];
        return Promise.resolve(new Response(JSON.stringify({ok: true, rows, v})));
      };
      const shown = () => new Promise(ok => setTimeout(() => ok((document.getElementById('board') || {}).textContent || ''), 150));
      const sv0 = store.get(SHEETV, 0);
      try {
        localStorage.removeItem('reefid-fish-board-cache');
        // The sheet's last reply before BOARD_SHEET (rule D4; Codex review #694): Fish behaves as before it had a board, the
        // page shows the corals' board, and nothing announces one.
        store.set(SHEETV, BOARD_SHEET - 1);
        go('board');
        const before = await shown(),
          live0 = boardLive(SUBJ),
          asked0 = asked.splice(0);
        // The sheet at BOARD_SHEET, a reply still from an older script (the update under way): the corals' rows are never
        // shown as the fish board.
        store.set(SHEETV, BOARD_SHEET);
        viewBoard();
        const old = await shown();
        v = BOARD_SHEET;
        boardAt.fish = 0;
        viewBoard();
        const fresh = await shown();
        // ⚙ Leaderboard On / Off drops every subject's board in memory, so the next visit asks again (Codex review #693).
        document.querySelector('#boardset button[data-board="1"]').click();
        const dropped = !Object.keys(boardP).length;
        return {
          before,
          live0,
          asked0,
          dropped,
          asked,
          old,
          fresh,
          kept: localStorage.getItem('reefid-fish-board-cache'),
          coral: localStorage.getItem('reefid-board-cache')
        };
      } finally {
        window.fetch = f0;
        store.set(SHEETV, sv0);
      }
    });
    if (
      fb.live0 ||
      !/Coral P/.test(fb.before) ||
      !fb.asked0.every(a => a === 'board=1') ||
      !fb.dropped ||
      !fb.asked.length ||
      !fb.asked.every(a => a === 'board=1&s=fish') ||
      !/not available yet/.test(fb.old) ||
      /Coral P/.test(fb.old) ||
      !/Fish P/.test(fb.fresh) ||
      !/63%/.test(fb.fresh) ||
      !/Fish P/.test(fb.kept || '') ||
      /Fish P/.test(fb.coral || '')
    )
      ui.push(`${width}px fish leaderboard: ${JSON.stringify(fb)}`);
    await wide('the fish leaderboard');
    // The fish achievements (Pierre, 2026-11-04; core.js FISH_ACH): on Fish the page and its count are the fish's own list,
    // a fish answer keeps none of the corals' feats (the run, achFeats), and the corals keep theirs.
    const fa = await q.evaluate(async () => {
      const A0 = store.get(ACHK, null);
      store.set(ACHK, {_v: ACH_V, _run: 7, _best: 7});
      achAfter(true, [{f: 'x', view: 'wide'}], 'quiz');
      const A = store.get(ACHK, {}),
        fishIds = ACH_L().map(a => a.id);
      // One unseen of each subject: the fish page shows and clears only the fish one (Codex review #694).
      store.set(ACHNEW, ['met10', 'fmet5']);
      const dotOn = achNew();
      go('ach');
      await new Promise(ok => setTimeout(ok, 200));
      const title = (document.querySelector('#view .btitle') || {}).textContent || '',
        unseen = store.get(ACHNEW, []);
      store.set(ACHNEW, []);
      const coralIds = inSubject(SUBJECTS.find(x => !x.achs().some(a => fishIds.includes(a.id))).id, () => ACH_L().map(a => a.id));
      store.set(ACHK, A0);
      return {run: A._run, best: A._best, fishIds, title, mixed: coralIds.filter(id => fishIds.includes(id)), dotOn, unseen};
    });
    if (
      fa.run !== 7 ||
      fa.dotOn !== 1 ||
      JSON.stringify(fa.unseen) !== '["met10"]' ||
      fa.best !== 7 ||
      fa.fishIds.length !== FISHN ||
      !fa.fishIds.every(id => id[0] === 'f') ||
      !new RegExp(`/${FISHN} earned`).test(fa.title) ||
      fa.mixed.length
    )
      ui.push(`${width}px fish achievements: ${JSON.stringify(fa)}`);
    await wide('the fish achievements');
    // A wink, made due at this count (the first threshold moved here, none shown yet).
    const wk = await q.evaluate(() => {
      location.hash = '#practice/quiz';
      return new Promise(ok =>
        setTimeout(() => {
          document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
          WINK.AT[0] = answersSoFar();
          delete WINKS[SUBJ.id];
          localStorage.removeItem('reefid-sync-fish-wink');
          quizPhoto();
          ok({wink: !!document.querySelector('#view .q.wink'), seen: Object.keys(WINKS[SUBJ.id] || {}).length});
        }, 300)
      );
    });
    if (!wk.wink || wk.seen !== 1) ui.push(`${width}px wink: ${JSON.stringify(wk)}`);
    await wide('a wink');
    // Back to the corals through the header switch: one click (Pierre, 2026-11-08), no menu.
    await q.evaluate(() => (location.hash = '#practice/quiz'));
    await q.waitForFunction(() => document.querySelector('#view .q'), null, {timeout: 15000});
    for (let i = 0; i < 8 && (await q.$('.unlock')); i++) await q.click('.unlock .next:not(.sec)');
    await q.click('#subjc [data-subj="coral"]');
    await q.waitForFunction(() => SUBJ.id === 'coral', null, {timeout: 15000});
    const bk = await q.evaluate(() => ({
      slate: slateGenera().length,
      saved: localStorage.getItem('reefid-sync-subject'),
      sw: [...document.querySelectorAll('#subjc [data-subj]')]
        .map(x => x.dataset.subj + (x.getAttribute('aria-pressed') === 'true' ? '*' : ''))
        .join(),
      menu: !!document.getElementById('subjb') || !!document.getElementById('subjmenu')
    }));
    if (bk.slate < 39 || bk.saved !== '"coral"' || bk.sw !== 'coral*,fish' || bk.menu)
      ui.push(`${width}px back to Corals through the header switch: ${JSON.stringify(bk)}`);
    // The leaderboard's toast: on the corals it shows; switching to Fish takes it away and it is due again.
    const bt2 = await q.evaluate(async () => {
      const s0 = SYNC;
      SYNC = {name: 'Test', code: 'x'};
      noticesGo(); // as after the visit's first sync (sync.js noticeLater): this made-up account never syncs
      boardNotice();
      SYNC = s0;
      const shown = !!document.querySelector('.apptoast');
      await setSubject('fish');
      const r = {shown, after: !!document.querySelector('.apptoast'), told: store.get('reefid-board-told', 0)};
      await setSubject('coral');
      return r;
    });
    if (!bt2.shown || bt2.after || bt2.told) ui.push(`${width}px leaderboard toast and a subject switch: ${JSON.stringify(bt2)}`);
    await q.evaluate(() => (location.hash = '#about'));
    await q.waitForFunction(() => document.querySelector('#view .about p'), null, {timeout: 15000});
    // From the keyboard: Tab reaches each side, Enter switches, and the focus stays on the side chosen once the header is
    // redrawn (showSubj).
    await q.focus('#subjc [data-subj="coral"]');
    await q.keyboard.press('Tab');
    const tab1 = await q.evaluate(() => document.activeElement.closest('#subjc') && document.activeElement.dataset.subj);
    await q.keyboard.press('Enter');
    await q.waitForFunction(() => SUBJ.id === 'fish', null, {timeout: 15000}).catch(() => {});
    await q.waitForTimeout(100);
    const kb = await q.evaluate(() => ({
      focus: document.activeElement.closest('#subjc') ? document.activeElement.dataset.subj : document.activeElement.tagName,
      pressed: document.activeElement.getAttribute('aria-pressed')
    }));
    if (tab1 !== 'fish' || kb.focus !== 'fish' || kb.pressed !== 'true')
      ui.push(`${width}px header switch from the keyboard: Tab ${tab1}, after Enter ${JSON.stringify(kb)}`);
    // Home reached with the focus on the header switch (Back, a key): the focus goes to Home's row, never left on the
    // hidden switch.
    await q.evaluate(() => document.querySelector('.brand .home').click()); // Home without a reload
    await q.waitForFunction(() => (window.ROUTED || 'home') === 'home' && document.querySelector('#view .hsubj'), null, {timeout: 15000});
    const kh = await q.evaluate(() => ({
      row: !!document.activeElement.closest('#view .hsubj'),
      subj: document.activeElement.dataset.subj,
      hidden: getComputedStyle(document.getElementById('subjc')).visibility
    }));
    if (!kh.row || kh.subj !== 'fish' || kh.hidden !== 'hidden')
      ui.push(`${width}px Home reached from the header switch, the focus: ${JSON.stringify(kh)}`);
    await q.evaluate(() => (location.hash = '#about'));
    await q.waitForFunction(() => document.querySelector('#view .about p'), null, {timeout: 15000});
    await q.click('#subjc [data-subj="coral"]');
    await q.waitForFunction(() => SUBJ.id === 'coral' && document.querySelector('#view .about p'), null, {timeout: 15000});
    // A third subject (made up here, for the header only: app.js subjCtl): the header falls back to the chip and its menu,
    // which holds every subject; a choice closes it, as do Escape and a tap elsewhere, choosing nothing. Back to two
    // subjects, the switch again.
    await q.evaluate(() => {
      SUBJECTS.push({...SUBJECTS[0], id: 'smoke3', name: 'Third', beta: null});
      UNITS.smoke3 = UNITS[SUBJECTS[0].id]; // what the pages read of each subject (About's lines)
      showSubj();
    });
    const three = await q.evaluate(() => ({
      sw: !!document.querySelector('#subjc .subjsw'),
      chip: (document.getElementById('subjb') || {}).offsetParent ? document.getElementById('subjb').getAttribute('aria-label') : '',
      over: document.documentElement.scrollWidth - innerWidth
    }));
    if (three.sw || !/Corals/.test(three.chip) || three.over > 0)
      ui.push(`${width}px three subjects, the header chip: ${JSON.stringify(three)}`);
    // On Home the chip steps aside too: its menu, left open, closes; the focus goes to Home's row; back on another page the
    // chip is there again.
    await q.click('#subjb');
    await q.evaluate(() => document.querySelector('.brand .home').click()); // Home without a reload
    await q.waitForFunction(() => (window.ROUTED || 'home') === 'home' && document.querySelector('#view .hsubj'), null, {timeout: 15000});
    const th = await q.evaluate(() => {
      const b = document.getElementById('subjb'),
        r = b.getBoundingClientRect();
      return {
        hidden: getComputedStyle(b).visibility,
        hit: b.contains(document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)),
        menu: document.getElementById('subjmenu').hidden,
        expanded: b.getAttribute('aria-expanded'),
        row: !!document.activeElement.closest('#view .hsubj')
      };
    });
    if (th.hidden !== 'hidden' || th.hit || !th.menu || th.expanded !== 'false' || !th.row)
      ui.push(`${width}px three subjects on Home, the header chip: ${JSON.stringify(th)}`);
    await q.evaluate(() => (location.hash = '#about'));
    await q.waitForFunction(() => window.ROUTED === 'about' && document.querySelector('#view .about p'), null, {timeout: 15000});
    if ((await q.evaluate(() => getComputedStyle(document.getElementById('subjb')).visibility)) !== 'visible')
      ui.push(`${width}px three subjects, back on About: the header chip hidden`);
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
    if (!menu.open || menu.expanded !== 'true' || menu.items !== 'coral*,fish,smoke3' || !menu.inside)
      ui.push(`${width}px three subjects, the chip's menu: ${JSON.stringify(menu)}`);
    await wide('the chip menu open');
    await q.keyboard.press('Escape');
    const esc1 = await q.evaluate(() => ({closed: document.getElementById('subjmenu').hidden, focus: document.activeElement.id}));
    await q.click('#subjb');
    await q.click('#view .about p');
    const out1 = await q.evaluate(() => ({closed: document.getElementById('subjmenu').hidden, subj: SUBJ.id}));
    if (!esc1.closed || esc1.focus !== 'subjb' || !out1.closed || out1.subj !== 'coral')
      ui.push(`${width}px chip menu: Escape ${JSON.stringify(esc1)}, a tap elsewhere ${JSON.stringify(out1)}`);
    await q.click('#subjb');
    await q.click('#subjmenu [data-subj="fish"]');
    await q.waitForFunction(() => SUBJ.id === 'fish', null, {timeout: 15000});
    const pick = await q.evaluate(() => ({
      chip: document.getElementById('subjb').getAttribute('aria-label'),
      closed: document.getElementById('subjmenu').hidden,
      expanded: document.getElementById('subjb').getAttribute('aria-expanded')
    }));
    if (!/Fish/.test(pick.chip) || !pick.closed || pick.expanded !== 'false')
      ui.push(`${width}px Fish chosen in the chip's menu: ${JSON.stringify(pick)}`);
    const two = await q.evaluate(async () => {
      SUBJECTS.pop();
      delete UNITS.smoke3;
      await setSubject('coral');
      return {sw: !!document.querySelector('#subjc .subjsw'), chip: !!document.getElementById('subjb')};
    });
    if (!two.sw || two.chip) ui.push(`${width}px back to two subjects: ${JSON.stringify(two)}`);
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
  // The admin's header with the subject switch fits one line on the narrowest phones, signed out (the Sign in pill shown)
  // and signed in: no sideways scroll at 320 and 360 px (the logotype steps aside there, app.css).
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
    // Home: the header's control steps aside (Home's row is there), nothing wider than the screen.
    await q.goto(base + '#home');
    await q.waitForFunction(() => window.APP_READY && document.querySelector('#view .home-page'), null, {timeout: 30000});
    const nh = await q.evaluate(() => ({
      hidden: getComputedStyle(document.getElementById('subjc')).visibility,
      row: !!document.querySelector('#view .hsubj [data-subj="fish"]'),
      over: document.documentElement.scrollWidth - innerWidth
    }));
    if (nh.hidden !== 'hidden' || !nh.row || nh.over > 0) ui.push(`${width}px admin header on Home: ${JSON.stringify(nh)}`);
    // Another page (Learn): the header's control.
    await q.evaluate(() => (location.hash = '#learn/genera'));
    await q.waitForFunction(() => window.ROUTED === 'genera' && document.querySelector('#view .gdiv'), null, {timeout: 15000});
    // Signed out, the two sides do not fit beside the Sign in pill: one chip with the subject on screen, one click to the
    // other ([data-flip]); signed in, the two sides.
    for (const signed of [false, true]) {
      const m = await q.evaluate(s => {
        document.getElementById('signb').hidden = s;
        const h = document.querySelector('header'),
          sw = document.querySelector('#subjc .subjsw'),
          fl = document.querySelector('#subjc [data-flip]'),
          c = [sw, fl].find(e => e && e.offsetParent),
          r = c && c.getBoundingClientRect();
        return {
          shown: c ? (c === sw ? 'switch' : 'flip:' + c.dataset.flip + ':' + c.getAttribute('aria-label')) : '',
          inLine: !!r && r.bottom <= h.getBoundingClientRect().top + h.offsetHeight,
          over: document.documentElement.scrollWidth - innerWidth
        };
      }, signed);
      if (m.shown !== (signed ? 'switch' : 'flip:fish:Subject: Corals. Switch to Fish') || !m.inLine || m.over > 0)
        ui.push(`${width}px admin header ${signed ? 'signed in' : 'signed out'}: ${JSON.stringify(m)}`);
    }
    await q.evaluate(() => (document.getElementById('signb').hidden = false));
    await q.click('#subjc [data-flip]');
    await q.waitForFunction(() => SUBJ.id === 'fish', null, {timeout: 15000}).catch(() => {});
    const fl = await q.evaluate(() => ({subj: SUBJ.id, flip: document.querySelector('#subjc [data-flip]').getAttribute('aria-label')}));
    if (fl.subj !== 'fish' || fl.flip !== 'Subject: Fish. Switch to Corals')
      ui.push(`${width}px one click on the narrow chip: ${JSON.stringify(fl)}`);
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
      fp: JSON.parse(localStorage.getItem('reefid-sync-fish-progress') || '{}')['f:Damselfishes'] // t01 stored before the switch, moved at load
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
    // Three fish answers (tests/answer.js: the right choice, or its name typed); cards closed on the way.
    await qa.install(q);
    const n = await q.evaluate(async SEL => {
      const until = async f => {
        for (let k = 0; k < 300 && !f(); k++) await new Promise(ok => setTimeout(ok, 10));
        return f();
      };
      for (let i = 0; i < 12 && answersSoFar() < 3; i++) {
        document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
        if (!document.querySelector('#view .q:not(.done)')) quizPhoto();
        if (!(await until(() => document.querySelector(SEL)))) break;
        smokeAnswer();
        await until(() => document.querySelector('#view .q.done') && document.getElementById('next'));
        document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
        route();
      }
      return answersSoFar();
    }, qa.SEL);
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
          localStorage.setItem('reefid-sync-fish-wink', '{"f:Threshersharks":700}'); // the thresher, met here before signing in
        }
      } catch (e) {}
      // The sheet: the account (coral and fish progress), a hold of 5 on every load; saves recorded.
      const data = {
        'reefid-sync-coral-progress': JSON.stringify({Acropora: {ok: 3, ko: 1}}),
        'reefid-sync-fish-progress': JSON.stringify({t01: {ok: 10, ko: 2}}),
        'reefid-sync-fish-wink': JSON.stringify({'f:WhaleSharks': 300}) // the whale shark, shown on another device of the account
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
      saved: JSON.parse(SAVES[SAVES.length - 1].data['reefid-sync-fish-progress'] || '{}')['f:Damselfishes'],
      here: P['f:Damselfishes'],
      fishHold: localStorage.getItem('reefid-fish-hold'),
      coralHold: localStorage.getItem('reefid-hold'),
      // The surprise shown on the other device and the one met here before signing in (Codex review #652): both kept here
      // and in the save, so neither comes again for this player.
      wink: localStorage.getItem('reefid-sync-fish-wink'),
      winkSaved: SAVES[SAVES.length - 1].data['reefid-sync-fish-wink'],
      next: (() => {
        const W0 = WINK.AT.slice();
        WINK.AT.splice(0, 2, 0, 0);
        const L0 = P['~level'];
        P['~level'] = {...(L0 || {}), ok: 1000};
        const w = winkDue();
        WINK.AT.splice(0, 2, ...W0);
        if (L0) P['~level'] = L0;
        else delete P['~level'];
        return w && w.n;
      })()
    }));
    const both = w => JSON.stringify(JSON.parse(w || '{}')) === '{"f:WhaleSharks":300,"f:Threshersharks":700}';
    if (!both(r.wink) || !both(r.winkSaved) || r.next !== null)
      rv.push(`sign-in: a surprise met on another device or before signing in could come again ${JSON.stringify(r)}`);
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
            localStorage.removeItem('reefid-sync-fish-wink');
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
      here: (P['f:Damselfishes'] || {}).ok,
      sent: SAVES.length ? (JSON.parse(SAVES[SAVES.length - 1].data['reefid-sync-fish-progress'] || '{}')['f:Damselfishes'] || {}).ok : null
    }));
    if (o.here !== 10 || o.sent !== 10) rv.push(`a saved copy without fish keys erased the fish progress: ${JSON.stringify(o)}`);
    // (8) Tools › Type the genus with Fish chosen: the corals' genera (the Tools are the corals'; Codex review #442: it
    // drew fish teaching ids, "It was t01").
    await q.evaluate(() => (location.hash = '#tools/type'));
    await q.waitForSelector('#view .tyform', {timeout: 15000}); // answer.js: the Tools game, not a quiz question
    // The update notes due to this returning player come once the sync is over, over any page, and a page change closes
    // them unseen for 300 ms (progress.js recalcNotice): out of the way first, or one covers the click (a race CI won).
    const st = await settle(q);
    if (st) rv.push(`Type the genus with Fish chosen: ${st}`);
    await q.click('#view .tyform [data-idk]'); // answer.js: the Tools game, not a quiz question
    const ty = await q.evaluate(() => ({
      subj: SUBJ.id,
      res: (document.querySelector('#tyres') || {}).textContent || '',
      // answer.js: the Tools game, not a quiz question
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
        () => ({subj: SUBJ.id, n: slateGenera().length, all: FISH.c1.length + FISH.c2.length + FISH.c3.length}),
        e => ({err: String(e && e.message)})
      )
    );
    if (a.subj !== 'coral' || a.fish || a.cached || b2.subj !== 'fish' || b2.n !== b2.all || b2.n < 40)
      rv.push(`fish.json failing at start-up: ${JSON.stringify(a)} then ${JSON.stringify(b2)}`);
    await c4.close();
  }
  // (9) A brand-new fish player: freshPlayers, above (its own CI shard).
  const fresh = run.has('fresh') ? await freshPlayers(b, base, errs) : [];
  // (11) Find the X: findTheX, above.
  const fx = await findTheX(b, base, errs);
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
    // The announcement cards a returning player may have due at start-up (recalculations: never held, rule D6) come
    // first; the invitation waits for a calm Home, here the next one. Not a fixed wait: start-up says when its cards are
    // settled (progress.js window.CARDS_SAID, which waits for subjHello's calm moment too), the other cards are closed,
    // and once Home is drawn again the invitation is decided: on screen, or not shown.
    let st = await said(q);
    if (!st && (await q.$('.unlock:not(.hello)'))) {
      st = await settle(q, '.hello');
      await q.evaluate(() => route());
      st = st || (await said(q));
    }
    if (st) hello.push(`${who}: ${st}`);
    const shown = await q.evaluate(() => !!document.querySelector('.unlock.hello'));
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
      const st = await said(q);
      if (st) hello.push(`${who}: after a reload, ${st}`);
      if (await q.evaluate(() => !!document.querySelector('.unlock.hello'))) hello.push(`${who}: shown again`);
    }
    await c9.close();
  }
  // The admin's ⚑ "Bad photo" flag on a fish quiz photo, as on a coral one (flag.js, one brick for every subject; Pierre,
  // 2026-11-06: none on the fish quiz): a phone (no hover: the flag goes by itself on the question's photo), the photos
  // answered by a stand-in (every outside host: iNaturalist, FishBase, R2). A tap records the fish photo by its photo id
  // (core.js fishPid), its subject, its unit and where it was seen.
  const flag = [];
  {
    const stand = fs.readFileSync(require('./photostub.js')(ROOT).stand['-s']);
    const cf = await b.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, serviceWorkers: 'block'});
    await cf.route(
      u => !u.href.startsWith(base),
      r => (r.request().resourceType() === 'image' ? r.fulfill({contentType: 'image/webp', body: stand}) : r.abort())
    );
    await cf.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('fish-flag')) {
          sessionStorage.setItem('fish-flag', '1');
          localStorage.setItem('reefid-tour', '"done"');
          localStorage.setItem('reefid-admin-vault', 'smoke');
          localStorage.setItem('reefid-sync-subject', '"fish"');
          localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}');
        }
      } catch (e) {}
    });
    const q = await cf.newPage();
    q.on('pageerror', e => errs.push(`flag: ${e.message}`));
    await q.goto(base + '#practice/quiz');
    await q.waitForFunction(() => window.APP_READY && SUBJ.id === 'fish' && document.querySelector('#view .qph img'), null, {
      timeout: 30000
    });
    for (let i = 0; i < 8 && (await q.$('.unlock')); i++) await q.click('.unlock .next:not(.sec)');
    const shown = await q
      .waitForFunction(
        () => {
          const f = document.querySelector('.pflag'),
            im = document.querySelector('#view .qph img');
          if (!f || f.hidden || !im) return false;
          const a = f.getBoundingClientRect(),
            r = im.getBoundingClientRect();
          return a.top >= r.top && a.bottom <= r.bottom && a.right <= r.right + 1 && a.left >= r.left;
        },
        null,
        {timeout: 15000}
      )
      .then(() => true)
      .catch(() => false);
    if (!shown) flag.push('no ⚑ on the fish quiz photo');
    else {
      await q.tap('.pflag');
      const rec = await q.evaluate(() => {
        const im = document.querySelector('#view .qph img'),
          L = JSON.parse(localStorage.getItem('reefid-photo-flags') || '[]'),
          x = L[L.length - 1] || {};
        return {
          n: L.length,
          x,
          id: fishPid(im.dataset.f),
          file: im.dataset.f,
          holds: !!(x.unit && GX(x.unit) && GX(x.unit).views.wide.some(p => p.f === im.dataset.f))
        };
      });
      if (
        rec.n !== 1 ||
        rec.x.s !== 'fish' ||
        rec.x.f !== rec.id ||
        rec.x.file !== rec.file ||
        !rec.holds ||
        !/quiz · level/.test(rec.x.where)
      )
        flag.push('the fish flag recorded: ' + JSON.stringify(rec));
    }
    await cf.close();
  }
  // A fish record still under the former moving average (s.pg), on a link straight to a tier-2 page with data.json late:
  // the quiz tier then runs before the data is in (app.js need at start-up), and model.js domRecalcAll read GX before
  // DATA existed ("reading 'gen'", 2026-11-08); with fish.json in between, fishLoad's own call threw too and the app fell
  // back to the corals. The rebuild waits for the data (app.js start-up) and gives the same bar as a plain load.
  const early = [];
  {
    const OLD = {'f:Damselfishes': {ok: 6, ko: 2, h: '11011101', streak: 3, pg: 0.4}};
    const run = async (hash, hold) => {
      const c = await b.newContext({viewport: {width: 390, height: 800}, serviceWorkers: 'block'});
      await c.route(
        u => !u.href.startsWith(base),
        r => r.abort()
      );
      await c.addInitScript(old => {
        try {
          if (!sessionStorage.getItem('fish-early')) {
            sessionStorage.setItem('fish-early', '1');
            localStorage.setItem('reefid-tour', '"done"');
            localStorage.setItem('reefid-admin-vault', 'smoke');
            localStorage.setItem('reefid-sync-subject', '"fish"');
            localStorage.setItem('reefid-sync-fish-start', '{"c":"new","t":1}');
            localStorage.setItem('reefid-sync-fish-progress', JSON.stringify(old));
          }
        } catch (e) {}
      }, OLD);
      const q = await c.newPage(),
        pe = [];
      q.on('pageerror', e => pe.push(e.message));
      // Held until the page shows model.js has run (and, for fish.json first, until the fish data is in: FISHRAW; the units
      // themselves wait for the first build, which needs data.json): the order of a slow line, without a fixed wait. A wait
      // that fails is a failure, never a file released early (Codex review #732).
      const after = (what, arg) =>
        q
          .waitForFunction(what, arg, {timeout: 30000, polling: 50})
          .catch(e => early.push(`${hash}: a held file released early (${String(e.message).split('\n')[0]})`));
      if (hold.fish)
        await c.route(/\/fish\.json/, async r => {
          await after(() => typeof domRecalcAll === 'function');
          await r.continue();
        });
      if (hold.data)
        await c.route(/\/data\.json/, async r => {
          await after(fish => typeof domRecalcAll === 'function' && (!fish || !!FISHRAW), !!hold.fish);
          await r.continue();
        });
      await q.goto(base + hash);
      const ready = await q
        .waitForFunction(() => window.APP_READY, null, {timeout: 30000})
        .then(() => true)
        .catch(() => false);
      const r = await q.evaluate(() => ({
        subj: SUBJ.id,
        rec: (JSON.parse(localStorage.getItem('reefid-sync-fish-progress') || '{}') || {})['f:Damselfishes'] || {}
      }));
      await c.close();
      return {ready, pe, subj: r.subj, pg: r.rec.pg, ds: r.rec.ds};
    };
    const ref = await run('', {});
    if (!ref.ready || ref.pe.length || ref.subj !== 'fish' || typeof ref.ds !== 'number' || ref.pg !== undefined)
      early.push('the old fish record on a plain load: ' + JSON.stringify(ref));
    for (const [hash, hold] of [
      ['#fish/practice/quiz', {data: 1}],
      ['#fish/progress', {data: 1}],
      ['#fish/practice/quiz', {data: 1, fish: 1}]
    ]) {
      const x = await run(hash, hold);
      if (!x.ready || x.pe.length || x.subj !== 'fish' || x.pg !== undefined || x.ds !== ref.ds)
        early.push(
          `the old fish record, ${hash} with ${Object.keys(hold).join(' and ')} late: ${JSON.stringify(x)}, a plain load ${ref.ds}`
        );
    }
  }
  const fails = [...out, ...ui, ...rv, ...fresh, ...fx, ...grp, ...all, ...welcome, ...hello, ...flag, ...early];
  if (back.subj !== 'coral' || back.slate < 39 || back.ac !== 3 || back.fish !== '"coral"')
    fails.push('switch back to corals: ' + JSON.stringify(back));
  if (errs.length) fails.push('page errors: ' + errs.join(' | '));
  await done(b, fails, run);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
