// Live mode test (Pierre, 2026-11-17, Q393; docs/reviews/2026-11-18-live-mode-design.md): the real app in Chromium, one
// trainer page (1280 px) and three students (390 px), against the sync script on an in-memory sheet in this process
// (tests/gas.js; each page's app.js sheetFetch answered through SHEET_STUB: rule D1, and any request that leaves the local
// server is refused and counted). Checks:
// 1. the trainer (an account with the trainer role) sets up a game on an IMR lecture group and gets a code; a player
//    without the role is refused by the script;
// 2. three students join by the code (one signed in, two by a nickname) and appear in the lobby;
// 3. every question: the same photo on every screen, four choices, the right one never sent before the reveal; the
//    students answer, the trainer's page reveals by itself once all have answered, each choice's share and the top 5;
// 4. the end: the podium and the most-missed questions for the trainer; for the students their place, the signed-in one's
//    answers logged with mode 'live' in their account's queue, a nickname's nowhere, with the line to sign in;
// 5. no page error. Screenshots (SHOTS=dir): trainer lobby, question, reveal, podium (1280); student join, question,
//    reveal (390); light and dark.
// Locally: node tests/live.smoke.js (in the machine slot, tests/slot.js).
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const {chromium} = require('./calm.js');
const slot = require('./slot.js');
const {loadCodeGs} = require('./gas.js');
const ROOT = path.join(__dirname, '..');
const LIVEGAME_SHEET = Number(/const LIVEGAME_SHEET = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'live.js'), 'utf8'))[1]);
const SHOTS = process.env.SHOTS || '';
// The last update note (progress.js RECALC): seen already, so no card covers the game (a player closes it).
const RECALC_LAST = [...fs.readFileSync(path.join(ROOT, 'progress.js'), 'utf8').matchAll(/^\s+id: '([a-z0-9-]+)',$/gm)]
  .map(m => m[1])
  .filter(x => /-20\d\d-\d\d$/.test(x))
  .pop();
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
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
// The photo bucket is not reached: each of its photos is answered with one of the few photos the repository holds.
const LOCAL_PH = fs
  .readdirSync(path.join(ROOT, 'img'))
  .filter(f => /-m\.webp$/.test(f))
  .map(f => path.join(ROOT, 'img', f));
const photoFor = u => fs.readFileSync(LOCAL_PH[[...u].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % LOCAL_PH.length]);

// The sync script, one for every page, and the requests that tried to leave.
const s = loadCodeGs();
const escaped = [];
s.post({name: 'Tess', pin: '1234', data: {}, summary: {}, answers: []});
s.post({name: 'Pat', pin: '1234', data: {}, summary: {}, answers: []});
s.post({roleGrant: {account: 'Tess', role: 'trainer', scope: 'instance:imr'}, token: 'ghp_write000000000000000000'});
const sheet = (url, body) => {
  const u = new URL(url),
    j = body ? s.post(JSON.parse(body)) : s.get(Object.fromEntries(u.searchParams));
  // The replies say the script serves the live mode (this branch's script is that version once assigned: rule D3).
  return JSON.parse(JSON.stringify({...j, v: Math.max(LIVEGAME_SHEET, Number(j.v) || 0)}));
};

async function page(b, base, w, init) {
  const ctx = await b.newContext({viewport: {width: w, height: w < 600 ? 844 : 800}, serviceWorkers: 'block'});
  await ctx.exposeFunction('__sheet', sheet);
  await ctx.route(
    u => !u.href.startsWith(base),
    r => {
      const u = r.request().url();
      if (/\.r2\.dev\/img\/.+\.webp/.test(u)) return r.fulfill({status: 200, contentType: 'image/webp', body: photoFor(u)});
      escaped.push(u);
      return r.abort();
    }
  );
  await ctx.addInitScript(() => {
    window.SHEET_STUB = (url, o) =>
      window.__sheet(String(url), o && o.body ? String(o.body) : null).then(j => ({status: 200, json: () => Promise.resolve(j)}));
  });
  await ctx.addInitScript(init);
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  return {ctx, p, errs};
}
const ready = p => p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
// A one-time card the app shows on opening (an update note) closed, as a player would.
const calmCards = p => p.evaluate(() => document.querySelectorAll('.unlock').forEach(d => (d.ulClose ? d.ulClose() : d.remove())));
const base0 = () => {
  localStorage.setItem('reefid-tour', '"done"');
  localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
  localStorage.setItem('reefid-nudge', '1');
};
// Light, then dark (the app's own theme switch: data-theme), at the page's width.
async function shot(p, name) {
  if (!SHOTS) return;
  await p.waitForTimeout(300);
  await p.screenshot({path: path.join(SHOTS, name + '-light.png')});
  await p.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  await p.waitForTimeout(150);
  await p.screenshot({path: path.join(SHOTS, name + '-dark.png')});
  await p.evaluate(() => (document.documentElement.dataset.theme = 'light'));
}

(async () => {
  await slot('live.smoke');
  if (SHOTS) fs.mkdirSync(SHOTS, {recursive: true});
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const fails = [];
  const check = (ok, what) => ok || fails.push(what);
  const N = 5;

  // 1. A player with no role is refused by the script; the trainer sets up a game.
  const pat = await page(b, base, 1280, () => {
    try {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Pat', pin: '1234'}));
    } catch (e) {}
  });
  await pat.p.goto(base + '#live/host');
  await ready(pat.p);
  await pat.p.waitForSelector('#lvgo', {timeout: 30000});
  await pat.p.click('#lvgo');
  await pat.p
    .waitForFunction(() => /trainer role/.test((document.getElementById('lvmsg') || {}).textContent || ''), null, {timeout: 15000})
    .catch(() => {});
  check(/trainer role/.test(await pat.p.textContent('#lvmsg')), '1: a player with no role was not refused');
  check(!pat.errs.length, '1: page errors (no role): ' + pat.errs.join('; '));
  await pat.ctx.close();

  const T = await page(b, base, 1280, () => {
    try {
      if (sessionStorage.getItem('s')) return;
      sessionStorage.setItem('s', '1');
      localStorage.setItem('reefid-tour', '"done"');
      localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
      localStorage.setItem('reefid-account', JSON.stringify({name: 'Tess', pin: '1234'}));
    } catch (e) {}
  });
  const tp = T.p;
  await tp.goto(base + '#live/host');
  await ready(tp);
  await tp.waitForSelector('#lvgo', {timeout: 30000});
  const sets = await tp.$$eval('#lvset option', L => L.map(o => o.textContent));
  check(sets.length > 2, `1: the sets offered are only ${sets}`);
  // An IMR lecture group (the second option), 5 questions, 10 s each.
  await tp.selectOption('#lvset', {index: 1});
  await tp.click('#lvn [data-v="5"]');
  await tp.click('#lvlim [data-v="10"]');
  await shot(tp, 'trainer-setup');
  await tp.click('#lvgo');
  await tp.waitForSelector('.lvbigcode', {timeout: 15000});
  const code = (await tp.textContent('.lvbigcode')).replace(/\D/g, '');
  check(/^\d{6}$/.test(code), `1: no code: ${code}`);
  const unitsOfSet = await tp.evaluate(() => LH.plan);

  // 2. Three students: one signed in with every unit of the set unlocked, two by a nickname.
  const stud = async (acct, P) =>
    page(
      b,
      base,
      390,
      new Function(
        `try { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
        localStorage.setItem('reefid-tour', '"done"');
        localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
        localStorage.setItem('reefid-nudge', '1');
        localStorage.setItem('reefid-recalc', ${JSON.stringify(JSON.stringify(RECALC_LAST))});
        ${acct ? `localStorage.setItem('reefid-account', ${JSON.stringify(JSON.stringify(acct))});` : ''}
        ${P ? `localStorage.setItem('reefid-sync-coral-progress', ${JSON.stringify(JSON.stringify(P))});` : ''}
        } catch (e) {}`
      )
    );
  const allP = {};
  // Every slate genus met (answered), so every unit of the game is unlocked for the signed-in student (rule L4).
  const slate = await tp.evaluate(() => pool());
  slate.forEach(n => (allP[n] = {ok: 3, ko: 1, h: '1101', streak: 1}));
  const S = [await stud({name: 'Sam', pin: '1234'}, allP), await stud(null), await stud(null)];
  const nick = ['', 'Kai', 'Lia'];
  for (let i = 0; i < 3; i++) {
    const p = S[i].p;
    await p.goto(base + '#live?code=' + code);
    await ready(p);
    await p.waitForSelector('#lvjf', {timeout: 30000});
    await p.waitForTimeout(500);
    await calmCards(p);
    check((await p.inputValue('#lvcode')) === code, `2: student ${i}: the code is not filled in from the address`);
    if (i === 0) check((await p.inputValue('#lvnick')) === 'Sam', '2: the signed-in student’s first name is not filled in');
    if (i === 1) check(!!(await p.$('#lvsign')), '2: no sign-in nudge for a student not signed in');
    if (i === 0) await shot(p, 'student-join-signedin');
    if (i === 1) await shot(p, 'student-join');
    if (nick[i]) await p.fill('#lvnick', nick[i]);
    await p.click('#lvjf button[type=submit]');
    await p.waitForSelector('.lvwait', {timeout: 15000});
  }
  await tp.waitForFunction(() => document.querySelectorAll('#lhnames .chip').length === 3, null, {timeout: 10000});
  const names = await tp.$$eval('#lhnames .chip', L => L.map(x => x.textContent));
  check(names.join() === 'Sam,Kai,Lia', `2: the lobby shows ${names}`);
  await shot(tp, 'trainer-lobby');
  await shot(S[1].p, 'student-lobby');

  // 3. The questions: Sam always right, Kai always wrong, Lia right on the even ones.
  await tp.click('#lhgo');
  for (let qi = 0; qi < N; qi++) {
    await tp.waitForFunction(i => LH && LH.last && LH.last.ph === 'q' && LH.last.qi === i, qi, {timeout: 15000});
    const q = await tp.evaluate(() => LH.last.q);
    check(q.ch.length === 4 && q.ph.length >= 1, `3: question ${qi} has ${q.ch.length} choices, ${q.ph.length} photos`);
    check(unitsOfSet.includes(q.ch[q.k][0]), `3: question ${qi} asks ${q.ch[q.k][0]}, not a unit of the set`);
    for (let i = 0; i < 3; i++) {
      const p = S[i].p;
      await p.waitForFunction(
        n => document.querySelector('.lvq') && document.querySelector('.lvqn').textContent.startsWith('Question ' + n),
        qi + 1,
        {
          timeout: 15000
        }
      );
      const seen = await p.evaluate(() => ({
        src: document.querySelector('.lvph img').getAttribute('src'),
        ch: [...document.querySelectorAll('.lvch [data-i]')].map(b => b.textContent.slice(1))
      }));
      check(seen.src === q.ph[0].u, `3: student ${i} sees another photo on question ${qi}`);
      check(seen.ch.join() === q.ch.map(c => c[1]).join(), `3: student ${i} sees other choices on question ${qi}: ${seen.ch}`);
      const k = await p.evaluate(() => JSON.stringify(LV));
      check(!/"k":/.test(k), `3: the right answer reached student ${i} before the reveal`);
    }
    if (qi === 0) {
      await shot(tp, 'trainer-question');
      await shot(S[0].p, 'student-question');
    }
    const pickFor = i => (i === 0 || (i === 2 && qi % 2 === 0) ? q.k : (q.k + 1) % 4);
    for (let i = 0; i < 3; i++) await S[i].p.click(`.lvch [data-i="${pickFor(i)}"]`);
    if (qi === 0) await shot(S[1].p, 'student-answered');
    // The reveal by itself, once all three answered.
    await tp.waitForSelector('.lvrev', {timeout: 15000});
    for (let i = 0; i < 3; i++) await S[i].p.waitForSelector('.lvrev', {timeout: 15000});
    const rv = await tp.evaluate(() => LH.last.rev);
    check(rv.tot === 3 && rv.d[q.k] === (qi % 2 === 0 ? 2 : 1), `3: question ${qi}: shares ${JSON.stringify(rv.d)}`);
    check(/✓ Right/.test(await S[0].p.textContent('.lvverdict')), `3: Sam not told right on ${qi}`);
    check(/Not this time/.test(await S[1].p.textContent('.lvverdict')), `3: Kai not told wrong on ${qi}`);
    if (qi === 0) {
      await shot(tp, 'trainer-reveal');
      await shot(S[0].p, 'student-reveal-right');
      await shot(S[1].p, 'student-reveal-wrong');
    }
    await tp.click('#lhnext');
  }

  // 4. The end.
  await tp.waitForSelector('.lvend', {timeout: 15000});
  const pod = await tp.$$eval('.lvpod b', L => L.map(x => x.textContent));
  check(pod[1] === 'Sam', `4: the podium's first is not Sam: ${pod}`);
  check((await tp.$$('.lvmiss li')).length >= 1, '4: no most-missed question');
  await shot(tp, 'trainer-podium');
  for (let i = 0; i < 3; i++) await S[i].p.waitForSelector('.lvend', {timeout: 15000});
  check(/^1st/.test(await S[0].p.textContent('.lvend .lvbig')), '4: Sam is not told 1st');
  check(/count in your progress/.test(await S[0].p.textContent('#lvkeep')), '4: Sam is not told the answers count');
  check(
    /Sign in to keep your 3 right answers/.test(await S[2].p.textContent('#lvkeep')),
    '4: Lia is not invited to sign in with her 3 right answers'
  );
  await shot(S[2].p, 'student-end');
  await S[0].p.waitForTimeout(800);
  // Sam's answers reach the sheet through the account's usual sync (or still wait in its queue): mode 'live', scored.
  await S[0].p.evaluate(() => typeof syncSoon === 'function' && syncSoon());
  await S[0].p.waitForTimeout(3000);
  // By answer id: one still in the queue while the save that carries it is on its way is on the sheet too, and counts once;
  // an answer logged twice has two ids.
  const inQueue = await S[0].p.evaluate(() =>
    ((SYNC && SYNC.log) || []).filter(a => a.m === 'live').map(a => [a.g, a.a, a.ok, !!a.sc, a.id])
  );
  const A = s.sheets.Answers ? s.sheets.Answers.rows.slice(1).filter(r => r && r[0]) : [],
    logged = A.filter(r => r[5] === 'live').map(r => [r[0], r[2], r[3], r[4], !!r[22], r[7]]);
  const sam = [...new Map([...inQueue.map(a => ['Sam', ...a]), ...logged].map(a => [a[5], a])).values()];
  check(sam.length === N, `4: ${sam.length} live answers of Sam logged or queued, not ${N}: ${JSON.stringify(sam)}`);
  check(
    sam.every(a => a[0] === 'Sam' && a[3] === 1 && a[1] === a[2] && a[4]),
    `4: Sam's live answers: ${JSON.stringify(sam)}`
  );
  check(!A.some(r => /Kai|Lia|~anon/.test(String(r[0])) && r[5] === 'live'), '4: a nickname’s live answer reached the sheet');
  const kai = await S[1].p.evaluate(
    () =>
      [...JSON.parse(localStorage.getItem('reefid-log0') || '[]'), ...JSON.parse(localStorage.getItem('reefid-anonq') || '[]')].filter(
        a => a.m === 'live'
      ).length
  );
  const kaiAll = await S[1].p.evaluate(() =>
    Object.keys(localStorage).filter(k => /live/.test(localStorage.getItem(k) || '') && /"m":"live"/.test(localStorage.getItem(k)))
  );
  check(!kai && !kaiAll.length, `4: a nickname kept live answers: ${kai} ${kaiAll}`);

  // 5. Nothing left this machine; no page error.
  // Every request that tried to leave was refused here (the public reads the app makes on start-up: stats, board,
  // achievements); none carried a name, an answer or a live call.
  const out = escaped.filter(u => /script\.google/.test(u) && !/\?(stats|board|achs)=1/.test(u));
  check(!out.length, '5: a request to the sync script tried to leave the machine: ' + out);
  [T, ...S].forEach((x, i) => check(!x.errs.length, `5: page ${i} errors: ${x.errs.join('; ')}`));
  await b.close();
  server.close();
  if (fails.length) {
    console.error([...new Set(fails)].join('\n'));
    process.exit(1);
  }
  console.log('live smoke: OK');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
