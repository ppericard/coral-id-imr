// The pending question in the real app (quiz.js PEND; docs/spec/quiz.md "The pending question"): a question shown and not
// answered is still there, with its photos and choices, when the player leaves for Learn and comes back and when the page
// is reloaded; answered, it is not kept; its photo or genus gone, a new one is drawn quietly. Every subject (core.js
// SUBJECTS), every game with a question (the Quiz, the Custom quiz, the Duel tab) and the formats that can be forced
// (typed; Find the X of the fish). Checks, with every host but the local server refused (rule D1):
// 1. leave to Learn for a few seconds and come back: the same unit, photos, prompt and choices, unanswered; the clock
//    carries the seconds looked at it before leaving and not the seconds away (QCLOCK.pre);
// 2. reload: the same again, from the device's store alone;
// 3. answered: nothing is kept for the game (the record is gone before the next question shows);
// 4. a photo hidden since, a genus out of the custom selection since: another question, no error;
// 5. a phone (390) and a desktop (1280) width; no page error. SHOTS=dir keeps screenshots of the question back from
//    Learn, light and dark (the app's Theme, rule W17).
// Locally: node tests/pending.smoke.js (in the machine slot, tests/slot.js); SMOKE_W=390 for one width.
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js');
const slot = require('./slot.js');
const qa = require('./answer.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json'
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

const fails = [],
  ok = (x, m) => x || fails.push(m);
const AWAY = 2500; // ms on Learn: the time away, which must not be counted
const WIDTHS = slot.widths([390, 1280]);

async function context(b, base, S, width, theme) {
  const ctx = await b.newContext({viewport: {width, height: width < 600 ? 844 : 800}, serviceWorkers: 'block'}),
    stub = require('./photostub.js')(ROOT);
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await stub.r2(ctx);
  await stub.inat(ctx);
  await ctx.addInitScript(qa.PAGE);
  await ctx.addInitScript(
    ([id, starts, admin, theme]) => {
      try {
        if (sessionStorage.getItem('pending-smoke')) return; // a reload keeps what the page stored
        sessionStorage.setItem('pending-smoke', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-subject', JSON.stringify(id));
        for (const k of starts) localStorage.setItem(k, '{"c":"new","t":1}');
        if (admin) localStorage.setItem('reefid-admin-vault', 'smoke'); // a subject open to a group
        if (theme) localStorage.setItem('reefid-sync-theme', theme);
      } catch (e) {}
    },
    [S.id, C.SUBJECTS.map(x => C.startKey(x.id)), S.open === 'group', theme || '']
  );
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(`page error: ${e.message}`));
  p.on('console', m => m.type() === 'error' && /Content Security Policy|Refused to/.test(m.text()) && errs.push(`CSP: ${m.text()}`));
  return {ctx, p, errs};
}
const ready = p => p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
// Start-up's one-time cards out of the way, each closed by its first button (tests/staged.smoke.js settle).
async function settle(p) {
  for (let i = 0; i < 8; i++) {
    if (
      !(await p
        .waitForFunction(() => window.CARDS_SAID, null, {timeout: 25000})
        .then(
          () => 1,
          () => 0
        ))
    )
      return;
    if (!(await p.$('.unlock'))) return;
    await p.click('.unlock [data-b="1"]');
  }
}
const addr = (S, k) => '#' + C.routeOut(k, S);
// A page key reached by its address, and waited for.
async function go(p, S, k) {
  await p.evaluate(h => (location.hash = h), addr(S, k));
  await p.waitForFunction(() => window.ROUTED === hashNow(), null, {timeout: 20000});
}
// The question on screen, as the player sees it.
const look = p =>
  p.evaluate(() => {
    const q = document.querySelector('#view .q'),
      n = typeof qNow === 'function' && qNow();
    return q && n
      ? {
          t: n.g,
          ph: n.ph,
          prompt: q.querySelector('.prompt').textContent,
          ch: [...q.querySelectorAll('[data-c]')].map(b => b.dataset.c),
          typed: !!q.querySelector('.tyform'),
          find: !!q.querySelector('.qfx'),
          done: q.classList.contains('done')
        }
      : null;
  });
const stored = (p, key) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), key);

// One game, one format: leave to Learn and back, reload, answer. at: the page key of the game; kept: its key in the store.
async function keep(p, S, label, at, kept) {
  const key = C.subjDev(S.id, 'pending'),
    a = await look(p);
  if (!ok(a && !a.done, `${label}: no question on screen`)) return null;
  await p.waitForTimeout(2000); // looked at for a while (a slow photo starts the clock late)
  await go(p, S, 'genera');
  const rec = (await stored(p, key))[kept];
  ok(rec && rec.t === a.t, `${label}: the question is kept when the player leaves (${JSON.stringify(rec)})`);
  ok(rec && rec.rt > 0, `${label}: the seconds looked at it are kept (rt ${rec && rec.rt})`);
  await p.waitForTimeout(AWAY);
  await go(p, S, at);
  await qa.ready(p);
  const b = await look(p);
  ok(
    JSON.stringify(a) === JSON.stringify(b),
    `${label}: back from Learn, the same question\n  ${JSON.stringify(a)}\n  ${JSON.stringify(b)}`
  );
  const clock = await p.evaluate(() => ({pre: QCLOCK.pre, read: qclockRead()}));
  ok(rec && Math.abs(clock.pre - rec.rt) < 0.06, `${label}: the clock carries ${rec && rec.rt} s (pre ${clock.pre})`);
  ok(
    clock.read !== null && rec && clock.read >= rec.rt - 0.01 && clock.read < rec.rt + AWAY / 1000 - 0.5,
    `${label}: the time away is not counted (read ${clock.read}, looked ${rec && rec.rt} s, away ${AWAY / 1000} s)`
  );
  await p.reload();
  await ready(p);
  await qa.ready(p);
  const c = await look(p);
  ok(
    JSON.stringify(a) === JSON.stringify(c),
    `${label}: after a reload, the same question\n  ${JSON.stringify(a)}\n  ${JSON.stringify(c)}`
  );
  return a;
}
// Answers the question on screen: nothing is kept for the game once answered.
async function answered(p, S, label, kept) {
  const key = C.subjDev(S.id, 'pending'),
    r = await p.evaluate(() => smokeAnswer());
  ok(r && r.t, `${label}: answered (${JSON.stringify(r)})`);
  ok(!(kept in (await stored(p, key))), `${label}: an answered question is not kept`);
}

async function subject(b, base, S, fails0) {
  const hash = S.hash;
  for (const width of WIDTHS) {
    const {ctx, p, errs} = await context(b, base, S, width);
    const L = `${S.id} ${width}`;
    try {
      await p.goto(base + '#' + hash + 'home');
      await ready(p);
      await settle(p);
      // every unit open at once (no first-meeting cards over the questions), the Custom quiz's units picked
      await p.evaluate(() => (introAll('card'), save()));
      await p.evaluate(() => {
        const sel = unlocked().slice(0, 4);
        localStorage.setItem(CUSTOM.KEY, JSON.stringify({g: sel}));
      });
      // the Quiz
      await go(p, S, 'quiz');
      await qa.ready(p);
      await keep(p, S, `${L} quiz`, 'quiz', 'quiz');
      if (SHOTS) {
        await p.screenshot({path: path.join(SHOTS, `pending-${S.id}-${width}-light.png`)});
        await p.evaluate(() => localStorage.setItem('reefid-sync-theme', 'dark'));
        await p.reload();
        await ready(p);
        await qa.ready(p);
        await p.screenshot({path: path.join(SHOTS, `pending-${S.id}-${width}-dark.png`)});
        await p.evaluate(() => localStorage.setItem('reefid-sync-theme', 'light'));
        await p.reload();
        await ready(p);
        await qa.ready(p);
      }
      await answered(p, S, `${L} quiz`, 'quiz');
      if (width === 1280) await more(p, S, L); // the other games and formats at the desktop width, once
    } catch (e) {
      fails.push(`${L}: ${e.message.split('\n')[0]}`);
    }
    fails.push(...errs.map(e => `${L}: ${e}`));
    await ctx.close();
  }
}
async function more(p, S, L) {
  {
    {
      // a photo hidden since: another question, quietly (an answered one is left first: Learn and back draws the next)
      await go(p, S, 'genera');
      await go(p, S, 'quiz');
      await qa.ready(p);
      const k = C.subjDev(S.id, 'pending');
      await go(p, S, 'genera');
      await p.evaluate(key => {
        const o = JSON.parse(localStorage.getItem(key));
        o.quiz.sh[0][0] = 'gone-from-the-data.webp';
        localStorage.setItem(key, JSON.stringify(o));
      }, k);
      await go(p, S, 'quiz');
      await qa.ready(p);
      const now = await look(p),
        rec = (await stored(p, k)).quiz;
      ok(now && !now.done, `${L} a photo gone: a question is on screen`);
      ok(
        rec && rec.sh[0][0] !== 'gone-from-the-data.webp',
        `${L} a photo gone: the question kept is the new one (${JSON.stringify(rec && rec.sh)})`
      );
      await answered(p, S, `${L} quiz`, 'quiz');
      // typed (forced as tests/pages.smoke.js does): the form, no choices, the same genus
      await p.evaluate(() => {
        Object.assign(TYPED, {from: 0, at: [[0, 1]]});
        NEXTQ = null;
      });
      await go(p, S, 'genera');
      await p.evaluate(key => localStorage.setItem(key, '{}'), k);
      await go(p, S, 'quiz');
      await qa.ready(p);
      const ty = await look(p);
      if (ok(ty && ty.typed, `${L} typed: a typed question was forced (${JSON.stringify(ty)})`)) {
        const t2 = await keep(p, S, `${L} typed`, 'quiz', 'quiz');
        ok(t2 && t2.typed && !t2.ch.length, `${L} typed: the form and no choices after the reload`);
        await answered(p, S, `${L} typed`, 'quiz');
      }
      await p.reload(); // the typed share back to the game's own
      await ready(p);
      // Find the X (the fish: the corals have no tiles)
      if (await p.evaluate(() => !!UNITS[SUBJ.id].tiles && TREEU && TREEU.c1 && TREEU.c1.some(n => UNITS[SUBJ.id].tiles(n).length))) {
        const got = await p.evaluate(() => {
          FIND.P = 1;
          for (let i = 0; i < 60; i++) {
            NEXTQ = null;
            twoAt = -Infinity;
            quizPhoto();
            document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove()));
            if (SHOWNQ && SHOWNQ.findx) return true;
            smokeAnswer();
          }
          return false;
        });
        if (ok(got, `${L} find the X: one was drawn`)) {
          const f = await keep(p, S, `${L} find the X`, 'quiz', 'quiz');
          ok(f && f.find, `${L} find the X: the four tiles after the reload`);
          await answered(p, S, `${L} find the X`, 'quiz');
        }
        await p.evaluate(() => (FIND.P = 0.05));
      }
      // the Custom quiz: kept as its own game; its genus out of the selection since: another question
      await go(p, S, 'quiz-custom|play');
      await qa.ready(p);
      await keep(p, S, `${L} custom`, 'quiz-custom|play', 'quiz-custom|play');
      const cu = await look(p);
      await go(p, S, 'genera');
      await p.evaluate(t => {
        const sel = unlocked().filter(n => n !== t);
        localStorage.setItem(CUSTOM.KEY, JSON.stringify({g: sel.slice(0, 3)}));
      }, cu.t);
      await go(p, S, 'quiz-custom|play');
      await qa.ready(p);
      const cn = await look(p);
      ok(cn && cn.t !== cu.t, `${L} custom: its genus left the selection, another question (${cn && cn.t})`);
      await answered(p, S, `${L} custom`, 'quiz-custom|play');
      // the Duel tab: its own game, where there is a look-alike pair unlocked
      await go(p, S, 'quiz-duel');
      const none = await p.$('.duelnone');
      if (none) console.log(`  ${L}: no duel pair unlocked, the Duel tab left out`);
      else {
        await qa.ready(p);
        await keep(p, S, `${L} duel`, 'quiz-duel', 'quiz-duel');
        await answered(p, S, `${L} duel`, 'quiz-duel');
      }
    }
  }
}

(async () => {
  await slot.slot('pending.smoke');
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`,
    b = await chromium.launch();
  for (const S of C.SUBJECTS) await subject(b, base, S, fails);
  await b.close();
  server.close();
  if (fails.length) {
    console.log('FAIL pending.smoke' + slot.partial(['all'], null, [390, 1280], WIDTHS));
    fails.forEach(f => console.log(' - ' + f));
    process.exit(1);
  }
  console.log('OK pending.smoke' + slot.partial(['all'], null, [390, 1280], WIDTHS));
})().catch(e => (console.error(e), process.exit(1)));
