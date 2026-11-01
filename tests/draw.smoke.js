// Question draw test (code re-review 2026-11-01, ROADMAP "Test the question draw"): runs the real photoSet() and
// distractors() of app.js in Chromium, for every genus and several player levels, and checks Pierre's rules:
// - every photo of a question (shown, hint, revealed after) comes from ONE observation (same colony; AGENTS.md 14b);
// - never a several-corals or Coral Finder book photo in a game (rule 10); bonus genera: Research Grade or Pierre's only (14a);
// - answer choices: 3 distinct genera of the list, never the target; exactly the asked number of traps (look-alikes /
//   confused genera) when enough exist, none at the very start (14c).
// Like pages.smoke.js it needs Playwright (CI installs it in a temporary folder; no package.json). Locally:
// node tests/draw.smoke.js
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

(async () => {
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await ctx.route(
    u => !u.href.startsWith(base),
    r => r.abort()
  );
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('imr-tour', '"done"');
    } catch (e) {}
  });
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
  // Runs inside the page: app.js globals (P, photoSet, distractors, BONUS...) are in scope.
  const out = await p.evaluate(() => {
    const fails = [],
      RUNS = 30,
      key = x => x.o || x.f,
      bonus = BONUS.filter(n => GX(n));
    const genera = [...Object.keys(DATA.gen), ...bonus];
    let draws = 0;
    // Player levels on every genus: new, beginner, middle, strong (ability th on the photo-difficulty scale).
    for (const th of [null, 0, 1, 2.5]) {
      P = th === null ? {} : Object.fromEntries(genera.map(n => [n, {ok: 5, ko: 2, h: '1101101', th, L: 0.5}]));
      for (const n of genera) {
        const g = GX(n),
          book = new Set((g.book || []).map(x => x.f));
        for (let i = 0; i < RUNS; i++) {
          const s = photoSet(n),
            all = [...s.shown, ...(s.hint ? [s.hint] : []), ...(s.reveal || [])];
          if (!s.shown.length) {
            if (gamePics(n, 'wide').length + gamePics(n, 'medium').length + gamePics(n, 'macro').length)
              fails.push(`${n}: no photo shown although it has game photos`);
            break;
          }
          draws++;
          if (new Set(all.map(key)).size > 1)
            fails.push(`${n} (th ${th}): photos of several observations in one question: ${all.map(key).join(', ')}`);
          if (new Set(all.map(x => x.f)).size < all.length) fails.push(`${n} (th ${th}): the same photo twice in one question`);
          all.forEach(x => {
            if (x.multi) fails.push(`${n}: several-corals photo ${x.f} in a game`);
            if (book.has(x.f)) fails.push(`${n}: Coral Finder book photo ${x.f} in a game`);
            if (g.x && !x.own && x.gid) fails.push(`${n}: bonus genus photo ${x.f} is not Research Grade`);
          });
        }
      }
    }
    // Answer choices, from the slate list, at each number of traps.
    const list = Object.keys(DATA.gen);
    for (const t of list)
      for (const traps of [0, 1, 2, 3])
        for (let i = 0; i < 10; i++) {
          const c = distractors(t, list, traps),
            conf = list.filter(n => n !== t && confusable(t, n));
          if (c.length !== 3 || new Set(c).size !== 3) fails.push(`${t}: choices ${c.join(', ')} are not 3 distinct genera`);
          if (c.includes(t)) fails.push(`${t}: the answer is also a wrong choice`);
          if (c.some(n => !list.includes(n))) fails.push(`${t}: a choice outside the list`);
          const k = c.filter(n => conf.includes(n)).length,
            want = Math.min(traps, conf.length);
          // With fewer traps than asked available, any genus may fill in; never fewer traps than asked when they exist,
          // and none at all at the start (0 traps) when enough easy genera exist.
          if (k < want) fails.push(`${t}: ${k} trap(s) offered, ${want} asked (${c.join(', ')})`);
          if (traps < 2 && k > traps) fails.push(`${t}: ${k} trap(s) offered at level ${traps} (${c.join(', ')})`);
        }
    // Mastery exam (app.js EXAM): every genus can be examined (one photo alone, flagged exam); played through the real
    // quiz with right answers, a 95% genus gets its EXAM.n exam questions at least EXAM.gap answers apart, then is learned.
    genera.forEach(n => {
      const e = examSet(n);
      if (e && (e.shown.length !== 1 || !e.exam)) fails.push(`${n}: exam question is not one photo alone`);
    });
    const t = Object.keys(DATA.gen)[0];
    P = Object.fromEntries(genera.map(n => [n, {ok: 3, ko: 1, h: '1101', th: 0.5, L: 0.5}]));
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.97};
    P[LEVEL] = {ok: 200, ko: 30, th: 1};
    const at = [];
    for (let i = 0; i < 400 && !P[t].mx; i++) {
      quizPhoto();
      if (EXAMQ === t) {
        at.push(answersSoFar());
        if (document.querySelectorAll('.qstage .qph').length !== 1) fails.push('exam question with several photos');
      }
      document.querySelector(`[data-c="${CSS.escape(last)}"]`).click();
    }
    if (!P[t].mx) fails.push(`${t}: not mastered after 400 right answers (exam questions: ${at.length})`);
    if (at.length !== EXAM.n) fails.push(`${t}: ${at.length} exam questions, ${EXAM.n} expected`);
    if (at.some((x, i) => i && x - at[i - 1] < EXAM.gap))
      fails.push(`${t}: exam questions closer than ${EXAM.gap} answers: ${at.join(', ')}`);
    if (level(t)[0] !== 'ok' || genScore(t) !== 1) fails.push(`${t}: mastered but not learned at 100%`);
    // A miss on the genus ends an exam in course.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.97, ex: {k: 3, v: ['wide'], at: answersSoFar()}};
    answer('quiz', 'Porites' === t ? 'Acropora' : 'Porites', t, photoSet(t).shown, false, null);
    if (P[t].ex) fails.push(`${t}: a miss did not end the exam`);
    // Mastery holds only while the genus stays known: misses that bring it under 95% take it away.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.96, mx: 1};
    for (let i = 0; i < 3 && P[t].mx; i++) answer('quiz', 'Porites' === t ? 'Acropora' : 'Porites', t, photoSet(t).shown, false, null);
    if (P[t].mx) fails.push(`${t}: still mastered after misses (L ${knownP(t)})`);
    // Exam photos are never-seen ones while some remain.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.97, ps: {}};
    const v0 = examSet(t).shown[0];
    P[t].ps[v0.f] = [1, 0];
    for (let i = 0; i < 20; i++)
      if (examSet(t).shown[0].f === v0.f && gamePics(t, v0.view, 'hard').length > 1) fails.push(`${t}: exam reused a photo already seen`);
    return {fails: [...new Set(fails)], draws, genera: genera.length};
  });
  await b.close();
  server.close();
  if (errs.length) out.fails.push('Page errors: ' + errs.join(' | '));
  if (out.fails.length) {
    console.error(`Question draw: ${out.fails.length} problem(s)\n` + out.fails.slice(0, 40).join('\n'));
    process.exit(1);
  }
  console.log(
    `Question draw OK: ${out.draws} draws over ${out.genera} genera at 4 player levels, answer choices at 0-3 traps, mastery exam.`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
