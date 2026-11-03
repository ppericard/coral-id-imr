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
  const fails = [...out];
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
