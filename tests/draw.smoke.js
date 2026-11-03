// Question draw test (code re-review 2026-11-01, ROADMAP "Test the question draw"): runs the real photoSet() and
// distractors() of app.js in Chromium, for every genus and several player levels, and checks Pierre's rules:
// - every photo of a question (shown, hint, revealed after) comes from ONE observation (same colony; AGENTS.md 14b);
// - never a several-corals or Coral Finder book photo in a game (rule 10); genera off the IMR list (Millepora, bonus):
//   Research Grade or Pierre's only (14a);
// - answer choices: 3 distinct genera of the list, never the target; exactly the asked number of traps (look-alikes /
//   confused genera) when enough exist, none at the very start (14c);
// - first meetings: genera met on cards before being asked, never right after their card (INTRO), none while the
//   player falls behind (introHold); a starred genus never before the genera its card compares it to (core.js starRefs);
// - out-of-game prompts at least PROMPT.GAP answers apart (promptOk);
// - Millepora a slate genus (progress, cards); the bonus genera offered once every slate genus is met and never before,
//   "Not now" kept, once on opened one card at a time, never counted in the progress, Off out of the draw;
// - typed questions (model.js TYPED): sometimes on a genus well on its way, never under TYPED.from; logged quiz|t with
//   the genus read as the answer; a typo read, a word that is no genus refused, a typed miss against both genera, "I
//   don't know" a miss for the genus shown only; the mastery exam needs TYPED.exam typed right answers;
// - the custom quiz (quiz.js planPhoto on its selection): only genera picked are asked, one not met with its card, the
//   choices from the selection, topped up to 4 only under 4 genera picked.
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
      localStorage.setItem('imr-coral-start', '{"c":"new","t":1}');
    } catch (e) {}
    // Same draws every run (as profiles.smoke.js): unseeded, the mastery-exam check failed once on CI (PR #362: the 5th
    // exam question of a 97% genus, drawn rarely, did not come within the 400 answers; not reproduced in 48 local runs).
    let s = 4242;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  });
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
  // Runs inside the page: app.js globals (P, photoSet, distractors, BONUS...) are in scope.
  const out = await p.evaluate(() => {
    // Answers the question on screen with genus g: its choice, or typed on a typed question (model.js TYPED; '' = I
    // don't know). The choices of the question: the buttons, or those the draw chose for a typed one (SHOWNQ).
    const say = g => {
        const b = document.querySelector(`#view [data-c="${CSS.escape(g)}"]`);
        if (b) return b.click();
        const f = document.querySelector('#view .tyform');
        if (!g) return f.querySelector('[data-idk]').click();
        f.querySelector('input').value = g;
        f.requestSubmit();
      },
      choices = () => {
        const L = [...document.querySelectorAll('#view [data-c]')].map(b => b.dataset.c);
        return L.length ? L : (SHOWNQ && SHOWNQ[2]) || [];
      };
    const fails = [],
      RUNS = 30,
      key = x => x.o || x.f,
      bonus = BONUS.filter(n => GX(n));
    const genera = [...slateGenera(), ...bonus];
    let draws = 0;
    // Player levels on every genus: new, beginner, middle, strong (ability th on the photo-difficulty scale).
    for (const th of [null, 0, 1, 2.5]) {
      P = th === null ? {} : Object.fromEntries(genera.map(n => [n, {ok: 5, ko: 2, h: '1101101', th, pg: 0.4}]));
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
            if (g.x && !x.own && x.gid) fails.push(`${n}: photo ${x.f} of a genus off the IMR list is not Research Grade`);
          });
        }
      }
    }
    // Answer choices, from the slate list, at each number of traps.
    const list = slateGenera();
    if (!list.includes('Millepora') || list.length !== Object.keys(DATA.gen).length + 1 || pool().some(isBonus))
      fails.push(`slate genera: ${list.length}, Millepora ${list.includes('Millepora')}, bonus genera in the pool before any choice`);
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
    P = Object.fromEntries(genera.map(n => [n, {ok: 3, ko: 1, h: '1101', th: 0.5, pg: 0.4}]));
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.85};
    P[LEVEL] = {ok: 200, ko: 30, th: 1};
    const at = [],
      qx = question,
      logged = () => {
        const L = SYNC ? SYNC.log || [] : store.get(LOG0, []);
        return L[L.length - 1] || {};
      };
    let shownT = null,
      exTyped = 0;
    question = (...a) => ((shownT = a[1]), qx(...a)); // the genus asked (a duel slipped in is not nextTarget's)
    for (let i = 0; i < 400 && !P[t].mx; i++) {
      quizPhoto();
      const ex = EXAMQ === t,
        ty = !!TYPEDQ;
      if (ex) {
        at.push(answersSoFar());
        if (document.querySelectorAll('.qstage .qph').length !== 1) fails.push('exam question with several photos');
        exTyped += ty;
      }
      say(shownT);
      // Typed exam questions are logged |t|x (the sheet reads |x at the end, model.js TYPED).
      if (ex && (logged().m || '') !== (ty ? 'quiz|t|x' : 'quiz|x')) fails.push(`exam answer logged ${logged().m}, typed ${ty}`);
    }
    question = qx;
    if (!P[t].mx) fails.push(`${t}: not mastered after 400 right answers (exam questions: ${at.length})`);
    if (at.length !== EXAM.n) fails.push(`${t}: ${at.length} exam questions, ${EXAM.n} expected`);
    // The exam needs TYPED.exam typed right answers among its EXAM.n.
    if (exTyped < TYPED.exam) fails.push(`${t}: mastered with ${exTyped} typed exam answers, ${TYPED.exam} needed`);
    // An exam begun before the typed questions (4 right, none typed): its next questions are typed until it has them,
    // its count held at EXAM.n (never over 100%).
    {
      const s0 = P[t];
      P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.85, ex: {k: 4, v: ['wide'], at: -99}};
      const L = [];
      for (let i = 0; i < 3 && !P[t].mx; i++) {
        const ty = examTyped(t);
        L.push(ty ? 't' : 'c');
        question('quiz', t, shuffle([t, ...distractors(t, pool(), 3)]), 'Which genus?', {...examSet(t), ...(ty ? {typed: 1} : {})});
        say(t);
        if (genScore(t) > 1) fails.push(`exam begun before typed questions: ${genScore(t)} over 100%`);
      }
      if (L.join('') !== 'tt' || !P[t].mx || P[t].ex) fails.push(`exam begun before typed questions: ${L.join('')}, mastered ${!!P[t].mx}`);
      P[t] = s0;
    }
    if (at.some((x, i) => i && x - at[i - 1] < EXAM.gap))
      fails.push(`${t}: exam questions closer than ${EXAM.gap} answers: ${at.join(', ')}`);
    if (level(t)[0] !== 'ok' || genScore(t) !== 1) fails.push(`${t}: mastered but not learned at 100%`);
    // One draw weight (model.js drawW, review item 8): never asked weighs 1, the most; a genus known and measured less
    // than one badly known; "Review" is shaky, the same chance.
    {
      const keep = {...P},
        [a, b, c] = genera.filter(n => DATA.gen[n] && n !== t);
      P[a] = {ok: 0, ko: 0};
      P[b] = {ok: 40, ko: 4, h: '1111111111', th: 2.5};
      P[c] = {ok: 6, ko: 6, h: '0101010101', th: -1.4};
      const w = [a, b, c].map(drawW);
      if (!(w[0] === 1 && w[1] < w[2] && w[2] < 1)) fails.push(`draw weights: never asked ${w[0]}, known ${w[1]}, shaky ${w[2]}`);
      if (level(c)[0] !== 'weak' || level(b)[0] === 'weak' || shaky(b) || !shaky(c)) fails.push('Review is not shaky');
      Object.keys(P).forEach(k => delete P[k]);
      Object.assign(P, keep);
    }
    // Typed questions (model.js TYPED, quiz.js typeForm): a genus well on its way (here 89%) is sometimes asked typed, a
    // beginner's genus (24%) never; a typed answer is logged quiz|t with the genus read as its answer (never the raw
    // text) and no choices; a typo is read as the genus; a typed miss naming another genus counts against both; "I
    // don't know" is a miss for the genus shown only; a word that is no genus is no answer.
    {
      const hi = genera.filter((n, i) => i % 2 && DATA.gen[n]),
        lo = genera.filter((n, i) => !(i % 2) && DATA.gen[n]);
      P = Object.fromEntries([
        ...hi.map(n => [n, {ok: 20, ko: 3, h: '1111011111', th: 1.5, pg: 0.75}]),
        ...lo.map(n => [n, {ok: 4, ko: 3, h: '1010110', th: 0, pg: 0.2}])
      ]);
      P[LEVEL] = {ok: 300, ko: 60, th: 1};
      const n = {hi: 0, hiT: 0, lo: 0, loT: 0};
      for (let i = 0; i < 300; i++) {
        NEXTQ = null;
        rematch = null;
        quizPhoto();
        document.querySelectorAll('.unlock').forEach(x => x.remove());
        const g = SHOWNQ[1],
          ty = !!SHOWNQ.typed,
          dom = !!document.querySelector('#view .tyform') && !document.querySelector('#view [data-c]');
        if (ty !== dom || ty !== !!TYPEDQ) fails.push(`typed question ${g}: planned ${ty}, form on screen ${dom}`);
        if (genScore(g) >= 0.85) (n.hi++, (n.hiT += ty)); // a genus near its exam (89% at the start)
        if (genScore(g) < TYPED.from) (n.lo++, (n.loT += ty)); // a beginner's genus (24% at the start), still under TYPED.from
        say(g);
      }
      if (!n.hiT || n.hiT > 0.8 * n.hi || n.loT || n.lo < 50)
        fails.push(`typed questions: ${n.hiT} of ${n.hi} on genera from 85%, ${n.loT} of ${n.lo} on genera under ${100 * TYPED.from}%`);
      // One typed question on screen, answered with a typo, a word that is no genus, then another genus, then I don't know.
      const typedQ = () => {
        for (let i = 0; i < 200; i++) {
          NEXTQ = null;
          rematch = null;
          quizPhoto();
          document.querySelectorAll('.unlock').forEach(x => x.remove());
          if (SHOWNQ.typed) return SHOWNQ[1];
          say(SHOWNQ[1]);
        }
        fails.push('no typed question in 200');
      };
      let g = typedQ();
      const f = () => document.querySelector('#view .tyform'),
        // two different neighbouring letters swapped, from the third on (Millepora's "ll" swapped is no typo)
        sw = [...g].findIndex((x, i) => i >= 2 && g[i + 1] && x !== g[i + 1]),
        typo = g.slice(0, sw) + g[sw + 1] + g[sw] + g.slice(sw + 2),
        a0 = answersSoFar();
      f().querySelector('input').value = 'xyzcoral';
      f().requestSubmit();
      if (answersSoFar() !== a0 || !/not a genus/.test(f().querySelector('.tymsg').textContent))
        fails.push('a word that is no genus was taken as an answer');
      f().querySelector('input').value = typo.toLowerCase();
      f().requestSubmit();
      let l = logged();
      if (answersSoFar() !== a0 + 1 || !/^quiz\|t(\|x)?$/.test(l.m) || l.a !== g || !l.ok || l.ch !== '' || !(l.e > 0 && l.e < 1))
        fails.push(`typed answer "${typo}" for ${g} logged ${JSON.stringify(l)}`);
      if (!/read as/.test((document.querySelector('#after .tyread') || {}).textContent || ''))
        fails.push('a typed answer with a typo does not say how it was read');
      if (document.querySelector('#tyin:not(.ok)')) fails.push('a right typed answer: the field is not marked right');
      g = typedQ();
      const other = hi.find(x => x !== g),
        h0 = (P[other].h || '').length,
        th0 = ability(g),
        thO = ability(other),
        ownO = [P[other].th, P[other].lt],
        lvO = P[LEVEL].th,
        pgO = P[other].pg;
      say(other);
      l = logged();
      // Against both genera (rule 13): the genus shown in its ability and progress, the genus given in its progress and
      // recent results only, no Elo step of its own (docs/LEARNING.md "The genus wrongly given in the Elo"): its own
      // estimate and the level it was stepped against unchanged; its ability moves only with the global level, as every
      // genus does ("Global level and genus"), so never by more than the level's own move.
      if (
        !/^quiz\|t(\|x)?$/.test(l.m) ||
        l.a !== other ||
        l.ok ||
        P[other].h.slice(-1) !== '0' ||
        !(ability(g) < th0) ||
        P[other].th !== ownO[0] ||
        P[other].lt !== ownO[1] ||
        Math.abs(ability(other) - thO) > Math.abs(P[LEVEL].th - lvO) + 0.011 ||
        !(P[other].pg < pgO) ||
        !(P[g].conf || {})[other]
      )
        fails.push(
          `typed miss naming ${other} for ${g}: logged ${JSON.stringify(l)}, ${other} h ${P[other].h} (was ${h0} long), ability ${thO} -> ${ability(other)}, progress ${pgO} -> ${P[other].pg}`
        );
      if (!document.querySelector('#after h3.ko')) fails.push('a typed miss: the feedback is not a wrong answer');
      g = typedQ();
      const before = JSON.stringify(Object.fromEntries(Object.entries(P).filter(([k]) => k !== g && k !== LEVEL)));
      f().querySelector('input').value = 'xyzcoral';
      f().requestSubmit();
      say('');
      l = logged();
      if (!/^quiz\|t(\|x)?$/.test(l.m) || l.a !== '' || l.ok || P[g].h.slice(-1) !== '0')
        fails.push(`I don't know on ${g}: logged ${JSON.stringify(l)}`);
      if (JSON.stringify(Object.fromEntries(Object.entries(P).filter(([k]) => k !== g && k !== LEVEL))) !== before)
        fails.push("I don't know changed another genus");
      if (f().querySelector('input').value || !document.querySelector('#after h3.idk'))
        fails.push(`I don't know: field "${f().querySelector('input').value}", feedback ${document.querySelector('#after h3').className}`);
      NEXTQ = null;
      rematch = null;
    }
    // A miss on the genus ends an exam in course.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.85, ex: {k: 3, v: ['wide'], at: answersSoFar()}};
    answer('quiz', 'Porites' === t ? 'Acropora' : 'Porites', t, photoSet(t).shown, false, null);
    if (P[t].ex) fails.push(`${t}: a miss did not end the exam`);
    // Mastery holds only while the genus stays known: misses that bring it under 95% take it away.
    // Misses on its easiest photos (a random set could be the hardest, where a miss says little: CI run of PR #336).
    const wrong = 'Porites' === t ? 'Acropora' : 'Porites',
      pics = Object.values(DATA.gen[t].views)
        .flat()
        .sort((a, b) => photoDiff(t, a) - photoDiff(t, b));
    // One miss keeps a learned genus (mxKept), a second one before it is back up takes it away.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, pg: PROG.M, mx: 1};
    answer('quiz', wrong, t, pics.slice(0, 2), false, null);
    if (!P[t].mx) fails.push(`${t}: one miss took a learned genus away (progress ${knownP(t)})`);
    answer('quiz', wrong, t, pics.slice(0, 2), false, null);
    if (P[t].mx) fails.push(`${t}: still mastered after two misses (progress ${knownP(t)})`);
    // A miss never raises the progress, even on its hardest photo shown alone, and takes it down visibly (core.js PROG).
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.75};
    const b0 = genScore(t);
    answer('quiz', wrong, t, pics.slice(-1), false, null);
    if (genScore(t) > b0 - 0.1) fails.push(`${t}: a miss at ${Math.round(100 * b0)}% only took it to ${Math.round(100 * genScore(t))}%`);
    // What a right answer proves (pgWeight): more against a look-alike, and more among 4 plausible choices than 2.
    const la = Object.keys(DATA.gen).find(n => n !== t && pooledConf(t, n) >= CONF.TRAP),
      far = Object.keys(DATA.gen).find(n => n !== t && pooledConf(t, n) < CONF.TRAP && !isLook(t, n) && !confusable(t, n));
    if (la && far && !(pgWeight(t, [t, la], 2) > pgWeight(t, [t, far], 2) && pgWeight(t, [t, la], 4) > pgWeight(t, [t, la], 2)))
      fails.push(`${t}: progress weights do not favour look-alikes and more choices`);
    // Photo memory (model.js famOf, pgMemW; docs/LEARNING.md "Photo memory"): a right answer on a photo the player got
    // right twice before is expected easier (logged e), raises the ability and the progress less than one on a new photo.
    {
      const ph = pics.slice(0, 1),
        log = () => (SYNC ? SYNC.log : store.get(LOG0, [])).slice(-1)[0] || {},
        one = known => {
          P[t] = {ok: 10, ko: 2, h: '1101101', th: 1, pg: 0.4, pm: 1, ps: known ? {[ph[0].f]: [2, 2]} : {}};
          answer('quiz', t, t, ph, false, null);
          return {pg: P[t].pg, th: P[t].th, e: log().e};
        },
        k0 = one(false),
        k1 = one(true);
      if (!(k1.pg < k0.pg && k1.th < k0.th && k1.e > k0.e))
        fails.push(`photo memory: a right answer on a known photo ${JSON.stringify(k1)}, on a new one ${JSON.stringify(k0)}`);
    }
    // Progress saved before the photo memory: recalculated once, silently, saved (model.js memRecalcAll, core.js memRecalc);
    // not again at the next load or pull, nor at the next answer.
    {
      const f0 = pics[0].f,
        f1 = (pics[1] || pics[0]).f;
      P[t] = {ok: 20, ko: 4, h: '1111011111', th: 1, pg: 0.7, ps: {[f0]: [4, 3], [f1]: [3, 0]}};
      const ch1 = memRecalcAll(),
        pg1 = P[t].pg,
        kept = (store.get('imr-coral-progress', {})[t] || {}).pg,
        ch2 = memRecalcAll();
      if (!ch1 || ch2 || !(pg1 < 0.7) || P[t].pm !== 1 || kept !== pg1)
        fails.push(`silent recalculation: ${JSON.stringify({ch1, ch2, pg1, kept, pm: P[t].pm})}`);
      if (document.querySelector('.recalc')) fails.push('silent recalculation: a pop-up showed');
      const before = P[t].pg;
      answer('quiz', t, t, pics.slice(0, 1), false, null);
      if (P[t].pm !== 1 || memRecalc(P[t], PMEM) || !(P[t].pg > before))
        fails.push(`after the recalculation, a right answer: ${before} -> ${P[t].pg} (pm ${P[t].pm})`);
    }
    // Spread the repeats: in the genus with the fewest game photos, every photo already shown, all right twice but one
    // colony's never right: that colony comes up more often than when all are equally known (a soft factor, never a
    // filter: the photos all known still come up).
    {
      const nph = n => new Set(VIEWS.flatMap(([v]) => gamePics(n, v, 'hard').map(x => x.f))).size,
        n = slateGenera().reduce((a, x) => (nph(x) < nph(a) ? x : a)),
        files = VIEWS.flatMap(([v]) => gamePics(n, v, 'hard')),
        cols = [...new Set(files.map(key))],
        c0 = cols[0],
        share = ps => {
          let hit = 0;
          for (let i = 0; i < 1000; i++) {
            P[n] = {ok: 20, ko: 4, h: '1101101', th: 0.5, pg: 0.5, ps};
            if (photoSet(n).shown.some(x => key(x) === c0)) hit++;
          }
          return hit / 1000;
        },
        all = Object.fromEntries(files.map(x => [x.f, [3, 2]])),
        even = share(all),
        favour = share({...all, ...Object.fromEntries(files.filter(x => key(x) === c0).map(x => [x.f, [1, 0]]))});
      // Measured 2026-11-03 on the genera with the fewest photos: x 1.4-1.5 (the old rule, x 0.6 from right twice: 1.0-1.1).
      if (cols.length < 2 || !(favour > 1.25 * even) || !(even > 0))
        fails.push(
          `${n} (${files.length} photos, ${cols.length} colonies): the least remembered colony came up ${favour} (all known alike: ${even})`
        );
    }
    // Exam photos are never-seen ones while some remain.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.85, ps: {}};
    const v0 = examSet(t).shown[0];
    P[t].ps[v0.f] = [1, 0];
    for (let i = 0; i < 20; i++)
      if (examSet(t).shown[0].f === v0.f && gamePics(t, v0.view, 'hard').length > 1) fails.push(`${t}: exam reused a photo already seen`);
    // The sheet's leaderboard % (Code.gs pctOf_, a copy of core.js pctOf) from the progress as saved (save()) equals the
    // app's progPct: varied progress, records saved before s.pg (BKT's L, recent results only, learned) among them, then
    // a few answers played through the quiz.
    for (let r = 0; r < 20; r++) {
      P = {};
      slateGenera().forEach((n, i) => {
        const x = (i * 7 + r * 13) % 10;
        if (x === 0) return;
        P[n] =
          x === 1
            ? {ok: 3, ko: 1, h: '1011'}
            : {
                ok: x,
                ko: 1,
                h: '1101111111'.slice(0, x),
                ...(r % 3 ? {pg: Math.min(0.9, 0.1 * x)} : {L: Math.min(0.99, 0.1 * x)}),
                ...(x === 9 ? {ex: {k: r % 5, v: [], at: 0}} : {}),
                ...(x === 8 && r % 2 ? {mx: 1} : {})
              };
      });
      for (let i = 0; i < 3; i++) {
        quizPhoto();
        const c = choices();
        say(c[(i + r) % c.length]);
      }
      save();
      const saved = store.get('imr-coral-progress', {});
      if (progPct() !== pctOf(saved, slateGenera()))
        fails.push(`progress %: app ${progPct()} vs core pctOf of the saved progress ${pctOf(saved, slateGenera())}`);
    }
    // First meetings (INTRO, Pierre 2026-11-02): from zero, INTRO.START cards then questions among them; every genus
    // asked was met on a card before; one met on a card alone is not asked before INTRO.GAP answers; at least
    // INTRO.EVERY answers between two cards; with enough genera met, the choices are all genera met.
    {
      P = {};
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      rematch = null; // no "Again" left over from the section before
      store.set(INTRO.OFFER.KEY, null);
      NEXTQ = null;
      const q0 = question;
      let tg, shownF;
      question = (...a) => ((tg = a[1]), (shownF = a[4].shown.map(p => p.f)), q0(...a));
      const at = {},
        cardsAt = [];
      let offers = 0;
      for (let i = 0; i < 120; i++) {
        const a = answersSoFar(),
          before = new Set(Object.keys(INTROS));
        NEXTQ = null;
        document.querySelectorAll('.unlock').forEach(x => x.remove()); // closed by the player before Next
        quizPhoto();
        // The player reads the cards through (each genus is met when its card shows).
        for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not(.sec)'));) b.click();
        const now = Object.keys(INTROS).filter(n => !before.has(n));
        if (now.length) cardsAt.push([a, now.length]);
        // A starred genus opens only after the genera its card compares it to (core.js starRefs; Pierre, 2026-11-03).
        now.forEach((n, k) =>
          starRefs(DATA, n)
            .filter(r => pool().includes(r) && !at[r] && !asked(r) && !now.slice(0, k).includes(r))
            .forEach(r => fails.push(`question ${i}: ★ ${n} opened before its reference ${r}`))
        );
        now.forEach(n => (at[n] = [a, INTROS[n][1]]));
        if (i === 0 && (now.length !== INTRO.START || !now.includes(tg)))
          fails.push(`first question: cards ${now.join(', ')}, asked ${tg}`);
        // The question shown with its genus's card never repeats the card's photo (new-player walkthrough 2026-11-02).
        if (now.includes(tg) && shownF.includes((cover(GX(tg)) || {}).f)) fails.push(`question ${i}: the photo of ${tg}'s card again`);
        if (!at[tg] && !asked(tg)) fails.push(`question ${i}: ${tg} asked without its card`);
        if (document.querySelector('.unlock [data-bonus]'))
          fails.push(`question ${i}: bonus genera offered before every slate genus is met`);
        else if (at[tg] && !at[tg][1] && a < at[tg][0] + INTRO.GAP)
          fails.push(`question ${i}: ${tg} asked ${a - at[tg][0]} answer(s) after its card`);
        const ch = choices();
        if (Object.keys(INTROS).length >= 4 && !ch.every(introduced)) fails.push(`question ${i}: a choice never met (${ch.join(', ')})`);
        // A genus met on a card of its own is no choice on the question behind it: its card says it comes up a little
        // later (beginner review 2026-11-03).
        if (i && now.length === 1 && ch.includes(now[0])) fails.push(`question ${i}: ${now[0]} a choice behind its own card`);
        // The offer to open all genera: only in its window, at a high enough level, once; declined here.
        const offer = document.querySelector('.unlock.intro [data-open]');
        if (offer) {
          const O = INTRO.OFFER,
            th = (P[LEVEL] || {}).th || 0;
          if (a < O.AT || a > O.UNTIL || th < O.TH || offers++) fails.push(`offer at ${a} answers, level ${th}, offer #${offers}`);
          document.querySelector('.unlock.intro .sec').click();
        }
        document.querySelectorAll('.unlock.intro').forEach(x => x.remove());
        say(i % 3 ? tg : ch.find(c => c !== tg));
      }
      // The same over many first questions (one draw each above would rarely catch it).
      for (let i = 0, same = 0; i < 60; i++) {
        P = {};
        INTROS = {};
        HOLDS = 0; // a fresh player: no opening hold, no comeback
        CB = {r: 0, t: 0, ok: 0, f: 0};
        rematch = null; // no "Again" left over from the section before
        NEXTQ = null;
        document.querySelectorAll('.unlock').forEach(x => x.remove());
        quizPhoto();
        if (shownF.includes((cover(GX(tg)) || {}).f) && !same++) fails.push(`first question: the photo of ${tg}'s card again`);
      }
      document.querySelectorAll('.unlock').forEach(x => x.remove());
      // Starred genera after their references (core.js starRefs, model.js openPick; Pierre, 2026-11-03), on many paths:
      // the first cards from zero, in the order shown, and the opening draw once every other genus is met. A reference
      // missing from the genera in play never holds a starred genus back.
      {
        const star = slateGenera().filter(n => starRefs(DATA, n).length),
          refs = [...new Set(star.flatMap(n => starRefs(DATA, n)))];
        if (!star.length) fails.push('no starred genus with a reference in the data');
        for (let i = 0; i < 200; i++) {
          P = {};
          INTROS = {};
          const L = introStart(pool());
          L.forEach((n, k) =>
            starRefs(DATA, n).forEach(r => {
              if (pool().includes(r) && !L.slice(0, k).includes(r)) fails.push(`first cards ${L.join(', ')}: ★ ${n} before ${r}`);
            })
          );
        }
        P = {};
        INTROS = {};
        slateGenera()
          .filter(n => !star.includes(n) && !refs.includes(n))
          .forEach(n => (INTROS[n] = [0, 1, 0, 's']));
        const seen = new Set(),
          openFrom = L =>
            openPick(
              L.filter(n => !introduced(n)),
              L
            );
        for (let i = 0; i < 2000; i++) seen.add(openFrom(pool()));
        const early = star.filter(n => seen.has(n));
        if (early.length) fails.push(`opening draw: ★ ${early.join(', ')} drawn before their references`);
        if (!refs.some(r => seen.has(r))) fails.push('opening draw: no reference drawn');
        refs.forEach(r => (INTROS[r] = [0, 1, 0, 's']));
        seen.clear();
        for (let i = 0; i < 2000; i++) seen.add(openFrom(pool()));
        if (!star.every(n => seen.has(n)))
          fails.push(`opening draw: references met, ★ ${star.filter(n => !seen.has(n)).join(', ')} never drawn`);
        refs.forEach(r => delete INTROS[r]);
        seen.clear();
        for (let i = 0; i < 2000; i++) seen.add(openFrom(pool().filter(n => !refs.includes(n))));
        if (!star.every(n => seen.has(n))) fails.push('opening draw: ★ genera held back by references out of the list');
        P = {};
        INTROS = {};
      }
      cardsAt.forEach(([a, k], i) => {
        if (i && a - cardsAt[i - 1][0] < INTRO.EVERY) fails.push(`two cards ${a - cardsAt[i - 1][0]} answer(s) apart`);
        if (i && k !== 1) fails.push(`${k} cards at once after the first ones`);
      });
      if (cardsAt.length < 3) fails.push(`only ${cardsAt.length} card showing(s) in 120 questions`);
      // Mostly right (an RA after the lecture): the offer comes between OFFER.AT and OFFER.UNTIL answers, and Open all
      // genera opens every genus left.
      P = {};
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      rematch = null; // no "Again" left over from the section before
      store.set(INTRO.OFFER.KEY, null);
      let shownAt = 0;
      for (let i = 0; i <= INTRO.OFFER.UNTIL && !shownAt; i++) {
        NEXTQ = null;
        document.querySelectorAll('.unlock').forEach(x => x.remove()); // closed by the player before Next
        // Achievement toasts gone by then (a player reads the feedback longer than this loop): prompts wait for them.
        document.querySelectorAll('.achpop').forEach(x => x.remove());
        achQ.length = 0;
        achBusy = false;
        quizPhoto();
        for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not(.sec)'));) b.click();
        const o = document.querySelector('.unlock.intro [data-open]');
        if (o) {
          shownAt = answersSoFar();
          o.click();
        }
        document.querySelectorAll('.unlock.intro').forEach(x => x.remove());
        say(tg);
      }
      if (!shownAt || shownAt < INTRO.OFFER.AT || introLeft().length)
        fails.push(`all right: offer at ${shownAt} answers, ${introLeft().length} genera left after Open all`);
      // Back to one at a time (model.js backDue, introBack; Pierre 2026-11-03): from that Open all, a player who keeps up
      // never gets the card; one who then drops gets it once the drop since Open all reaches 2 x INTRO.HOLD. "One at a
      // time" closes every genus opened at once (answered or not), the others stay open, and they come back through
      // their cards, one at a time, never asked or offered as a choice while closed.
      {
        const nextQ = () => {
          NEXTQ = null;
          document.querySelectorAll('.unlock, .achpop').forEach(x => x.remove()); // closed by the player before Next
          achQ.length = 0;
          achBusy = false;
          quizPhoto();
        };
        // The sections after this one go on from the state of that Open all.
        const keep = {P: JSON.stringify(P), I: JSON.stringify(INTROS), o: store.get(INTRO.OFFER.KEY, null), HOLDS, bon: Q.bon};
        const allSet = Object.keys(INTROS).filter(n => INTROS[n][3] === 'a'),
          before = Object.keys(INTROS).filter(n => INTROS[n][3] !== 'a');
        for (let i = 0; i < 40; i++) {
          nextQ();
          if (document.querySelector('.unlock [data-back]')) fails.push(`back card for a player who keeps up (answer ${answersSoFar()})`);
          for (
            let b;
            (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not([data-back]):not([data-bonus]):not(.sec)'));
          )
            b.click();
          say(tg);
        }
        let backAt = null;
        for (let i = 0; i < 40 && backAt === null; i++) {
          nextQ();
          if (document.querySelector('.unlock [data-back]')) backAt = (store.get(INTRO.OFFER.KEY, {}) || {}).h;
          else say(choices().find(c => c !== tg));
        }
        const hb = HOLDS;
        if (backAt === null || backAt < 2 * INTRO.HOLD)
          fails.push(`dropping: back card ${backAt === null ? 'never shown' : 'at ' + backAt}`);
        const t0 = SHOWNQ[1];
        document.querySelector('.unlock [data-back]').click();
        const o = store.get(INTRO.OFFER.KEY, {}) || {},
          shut = allSet.filter(n => INTROS[n] && INTROS[n][3] === 'b');
        if (o.bk !== 'one' || shut.length !== allSet.length || !before.every(introduced) || allSet.some(introduced))
          fails.push(`One at a time: closed ${shut.length} of ${allSet.length}, record ${JSON.stringify(o)}`);
        // Closed genera hold no place among the shaky ones that stop the opening (Codex P1 on #408): closed with their
        // answers kept and badly known, they would keep the opening chance at 0, and being closed they are never asked,
        // so the player could never open them again.
        {
          const P0 = JSON.stringify(P);
          allSet.forEach(n => (P[n] = {...(P[n] || {}), ok: Math.max(1, (P[n] || {}).ok || 0), ko: 3, th: -1.5}));
          const stuck = allSet.filter(shaky).length;
          if (stuck >= OPEN.K && !(openChance(pool()) > 0))
            fails.push(`One at a time: ${stuck} closed genera, badly known, keep the opening chance at ${openChance(pool())}`);
          if (stuck < OPEN.K) fails.push(`One at a time: only ${stuck} closed genera made shaky for the check`);
          P = JSON.parse(P0);
        }
        // The question on screen was chosen again among the genera still open.
        if (!introReady(SHOWNQ[1]) || !choices().every(introduced))
          fails.push(`after One at a time: asked ${SHOWNQ[1]} (was ${t0}), choices ${choices().join(', ')}`);
        const back = new Set();
        for (let i = 0; i < 200 && back.size < 2; i++) {
          const was = new Set(allSet.filter(introduced)); // a card shows with the question (quizPhoto)
          if (i) nextQ();
          if (document.querySelector('.unlock [data-back]')) fails.push('back card shown twice');
          for (
            let b;
            (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not([data-back]):not([data-bonus]):not(.sec)'));
          )
            b.click();
          const now = allSet.filter(n => introduced(n) && !was.has(n));
          if (now.length > 1) fails.push(`${now.length} closed genera back at once`);
          now.forEach(n => (INTROS[n][3] !== 'c' ? fails.push(`${n} back without its card`) : back.add(n)));
          if (!introReady(SHOWNQ[1]) && !SHOWNQ.intro) fails.push(`question ${i}: ${SHOWNQ[1]} asked while closed`);
          if (!choices().every(c => introduced(c) || (SHOWNQ.intro || []).includes(c)))
            fails.push(`question ${i}: a closed genus among the choices (${choices().join(', ')})`);
          say(tg);
        }
        if (back.size < 2)
          fails.push(
            `One at a time: ${back.size} closed genera came back on their cards in 200 answers (hold ${hb} at the back card, ${HOLDS} now)`
          );
        document.querySelectorAll('.unlock').forEach(x => x.remove());
        P = JSON.parse(keep.P);
        INTROS = JSON.parse(keep.I);
        store.set(INTRO.KEY, INTROS);
        store.set(INTRO.OFFER.KEY, keep.o);
        HOLDS = keep.HOLDS;
        if (keep.bon === undefined) delete Q.bon;
        else Q.bon = keep.bon;
        rematch = null;
        NEXTQ = null;
      }
      // Synced with the progress: the cards and the offer are imr-coral* keys (sent by progData), and the cards seen on
      // another device join this one's (introMerge), ready; a progress reset starts them over.
      {
        INTROS = {};
        HOLDS = 0; // a fresh player: no opening hold, no comeback
        CB = {r: 0, t: 0, ok: 0, f: 0};
        rematch = null; // no "Again" left over from the section before
        store.set(INTRO.KEY, {});
        store.set(INTRO.OFFER.KEY, null);
        const g = Object.keys(DATA.gen)[5];
        introAdd([Object.keys(DATA.gen)[0]], false);
        store.set(INTRO.OFFER.KEY, {at: 60, open: 0});
        const d = progData();
        if (!d[INTRO.KEY] || !d[INTRO.OFFER.KEY]) fails.push('cards or offer not in the synced data');
        store.set(INTRO.OFFER.KEY, null);
        introMerge(JSON.stringify({[g]: [7, 0]}), JSON.stringify({at: 60, open: 0}));
        if (!introduced(g) || !introReady(g) || !introduced(Object.keys(DATA.gen)[0]) || !store.get(INTRO.OFFER.KEY, null))
          fails.push('cards from another device not merged');
        // The latest decision about the offer wins: declined here, opened later on another device.
        store.set(INTRO.OFFER.KEY, {at: 60, open: 0, t: 1000});
        introMerge(null, JSON.stringify({at: 80, open: 1, via: 'progress', t: 2000}));
        if (!(store.get(INTRO.OFFER.KEY, {}) || {}).open) fails.push('an older decline kept over a later Open all');
        introMerge(null, JSON.stringify({at: 50, open: 0, t: 500}));
        if (!(store.get(INTRO.OFFER.KEY, {}) || {}).open) fails.push('an older decline replaced a later Open all');
        introReset();
        if (g in introMap() || store.get(INTRO.OFFER.KEY, null)) fails.push('progress reset kept the cards');
      }
      // Contrast questions (quiz.js CONTRAST): look-alike duels slipped into the photo quiz, about 1 question in 10, on
      // pairs of genera met and ready, never the pair of the previous contrast question,
      // logged quiz|d|k2; with the Agains, two 2-choice questions are never closer than CONTRAST.GAP.
      {
        const n0 = answersSoFar();
        let duels = 0,
          lastTwo = null;
        const q1 = question;
        question = (...a) => ((window.__dq = a), q1(...a));
        for (let i = 0; i < 300; i++) {
          NEXTQ = null;
          document.querySelectorAll('.unlock').forEach(x => x.remove());
          quizPhoto();
          document.querySelectorAll('.unlock').forEach(x => x.remove());
          const q = window.__dq;
          if (q[2].length === 2) {
            const at = answersSoFar(),
              k = q[2].slice().sort().join('|');
            if (lastTwo && at - lastTwo[0] < CONTRAST.GAP) fails.push(`2-choice questions ${at - lastTwo[0]} answers apart`);
            if (AUTOD) {
              duels++;
              if (!q[2].every(introReady)) fails.push(`duel in the quiz on ${q[2].join(', ')}`);
              if (lastTwo && lastTwo[1] === k) fails.push(`duel ${k} right after a contrast question on the same pair`);
            }
            lastTwo = [at, k];
          }
          const won = AUTOD && i % 10;
          say(i % 10 ? q[1] : q[2].find(c => c !== q[1]));
          if (won && !P[q[1]].du) fails.push('a duel won in the quiz does not count for the duel achievement');
          if (AUTOD && !/^quiz\|d\|k2$/.test(((SYNC && SYNC.log && SYNC.log.slice(-1)[0]) || {}).m || 'quiz|d|k2'))
            fails.push('duel in the quiz not logged quiz|d|k2');
        }
        question = q1;
        // Spacing and the draws make the count vary (11 in a CI run, about 15 on average): enough to show they come.
        if (duels < 5 || duels > 50) fails.push(`${duels} duels in the quiz in 300 questions (about 1 in 10 expected)`);
      }
      // Nothing is planned past a question that changes what comes next while it is on screen (Codex review #361: an
      // exam planned behind an unanswered exam broke its spacing); a plain question gets its next ones planned.
      {
        const keepV = $v.innerHTML,
          keepQ = SHOWNQ;
        dropPlans();
        $v.innerHTML = '<div class="q"></div>';
        SHOWNQ = ['quiz', 'X', ['A', 'B', 'C', 'D'], '', {exam: true}];
        planNext('quiz');
        if (NEXTQ) fails.push('questions planned past an unanswered exam question');
        SHOWNQ = ['quiz', 'X', ['A', 'B', 'C', 'D'], '', {}];
        planNext('quiz');
        if (!NEXTQ) fails.push('no question planned past a plain question');
        dropPlans();
        $v.innerHTML = keepV;
        SHOWNQ = keepQ;
      }
      // Achievement toasts (Pierre, 2026-11-02): the first of each family and the top tier pop up; a later step of a family
      // already held lands quietly (a "new" dot on 🏆), and the achievements page clears it.
      {
        const keep = store.get(ACHK, null),
          snap = achSnap(),
          meets = ACH.filter(a => a.test(snap)).map(a => a.id);
        if (meets.includes('met20')) {
          const A = {_v: ACH_V};
          meets.filter(id => id !== 'met20').forEach(id => (A[id] = 1));
          store.set(ACHK, A);
          const q0 = achQ.length;
          achCheck();
          const B = store.get(ACHK, {}) || {},
            nw = store.get('imr-ach-new', []),
            popped =
              achQ.slice(q0).some(a => a.id === 'met20') ||
              [...document.querySelectorAll('.achpop b')].some(b => /Wide eyes/.test(b.textContent));
          // Unseen ones are kept on this device only, never in the synced record (Codex review #360).
          if (!B.met20 || !nw.includes('met20') || B._new || popped)
            fails.push(`quiet achievement: ${JSON.stringify({held: !!B.met20, nw, popped})}`);
          if (!document.getElementById('boardgo').classList.contains('hasnew')) fails.push('no "new" dot on 🏆 after a quiet achievement');
          viewAch();
          if (
            !document.querySelector('.achc.new') ||
            store.get('imr-ach-new', []).length ||
            document.getElementById('boardgo').classList.contains('hasnew')
          )
            fails.push('the achievements page did not show and clear the new achievement');
          store.set(ACHK, keep);
        } else fails.push(`achievement test needs 20 genera met (${snap.met})`);
      }
      // Out-of-game prompts (sign-in card, one-tap question, open-all offer) take turns: at least PROMPT.GAP answers after
      // the last one, never with a card or an achievement toast on screen; a count that went back starts over.
      {
        const keep = store.get(PROMPT.KEY, null),
          a = answersSoFar(),
          ok = at => (store.set(PROMPT.KEY, at), promptOk());
        document.querySelectorAll('.unlock, .achpop').forEach(x => x.remove());
        const busy = typeof achBusy !== 'undefined' && achBusy;
        if (!busy && (ok(a - PROMPT.GAP + 1) || !ok(a - PROMPT.GAP) || !ok(a + 5) || !ok(null)))
          fails.push(`prompt spacing: ${[a - PROMPT.GAP + 1, a - PROMPT.GAP, a + 5, null].map(ok).join()}`);
        const d = document.createElement('div');
        d.className = 'unlock';
        document.body.append(d);
        if (ok(null)) fails.push('a prompt allowed over a card');
        d.remove();
        if (PULSE.FIRST !== 35 || NUDGE_AT !== 20 || INTRO.OFFER.AT !== 50 || PROMPT.GAP !== 10)
          fails.push(`prompt thresholds: ${[NUDGE_AT, PULSE.FIRST, INTRO.OFFER.AT, PROMPT.GAP].join()}`);
        store.set(PROMPT.KEY, keep);
      }
      // "I've had the IMR lecture": every slate genus opens at once, and no card comes after.
      introAll('progress');
      if (introLeft().length) fails.push(`open all genera: ${introLeft().length} left`);
      // Kept for the admin's player journey: when each card showed, and where all were opened from.
      const oa = store.get(INTRO.OFFER.KEY, {}) || {};
      if (!oa.open || oa.via !== 'progress' || !oa.t || Object.values(introMap()).some(e => !e[2] || !e[3]))
        fails.push(`open all not recorded for the journey: ${JSON.stringify(oa)}`);
      // Every slate genus met: the bonus genera are offered once (a prompt: PROMPT.GAP answers after the last one);
      // "Not now" is kept.
      // Until every slate genus has been asked once (bonusOfferDue), then 30 more questions to check "Not now" holds:
      // how many were asked before opening all depends on the opening pace (OPEN.MAX, 2026-11-03).
      let boffers = 0,
        after = 0;
      store.set(PROMPT.KEY, null);
      delete Q.bon;
      for (let i = 0; i < 400 && after < 30; i++) {
        if (boffers) after++;
        NEXTQ = null;
        quizPhoto();
        const bo = document.querySelector('.unlock [data-bonus]');
        if (bo) {
          boffers++;
          bo.closest('.ulcard').querySelector('.sec').click();
        }
        if (document.querySelector('.unlock.intro')) fails.push('a card after opening all genera');
        document.querySelectorAll('.unlock.intro').forEach(x => x.remove());
        say(tg);
      }
      if (boffers !== 1 || Q.bon !== false || pool().some(isBonus))
        fails.push(`bonus offer after every slate genus met: shown ${boffers} time(s), Q.bon ${Q.bon}`);
      // On (⚙): they join the genera not met yet and open one card at a time, at least INTRO.EVERY answers apart, each
      // asked only after its card; their answers never move the progress; Off takes them out again, progress kept.
      bonusSet(true);
      {
        const B = BONUS.filter(n => GX(n)),
          cards = [];
        if (!B.every(n => pool().includes(n)) || B.some(introduced)) fails.push('bonus genera on: not in the pool as genera not met');
        for (let i = 0; i < 150; i++) {
          NEXTQ = null;
          const a = answersSoFar(),
            before = new Set(Object.keys(INTROS));
          quizPhoto();
          for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not(.sec)'));) b.click();
          if (document.querySelector('.unlock [data-bonus]')) fails.push('bonus offer made again');
          const now = Object.keys(INTROS).filter(n => !before.has(n));
          if (now.length) cards.push([a, now]);
          if (isBonus(tg) && !introduced(tg)) fails.push(`${tg} asked without its card`);
          document.querySelectorAll('.unlock').forEach(x => x.remove());
          say(tg);
        }
        cards.forEach(([a, L], i) => {
          if (L.length !== 1 || !isBonus(L[0])) fails.push(`bonus cards: ${L.join(', ')} at ${a} answers`);
          if (i && a - cards[i - 1][0] < INTRO.EVERY) fails.push(`two bonus cards ${a - cards[i - 1][0]} answer(s) apart`);
        });
        if (cards.length < 2) fails.push(`only ${cards.length} bonus genus card(s) in 150 questions`);
        // Their own progress grows, the slate's % does not count it.
        const pb = {...P};
        B.forEach(n => (P[n] = {ok: 30, ko: 0, h: '1111111111', pg: 0.9, mx: 1}));
        if (progPct() !== progPct(slateGenera()) || slateGenera().some(isBonus)) fails.push('bonus genera counted in the progress');
        P = pb;
        bonusSet(false);
        if (pool().some(isBonus) || !B.some(n => P[n])) fails.push('bonus genera off: still in the pool, or their progress lost');
      }
      question = q0;
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      rematch = null; // no "Again" left over from the section before
    }
    // Opening held while the player does clearly worse than expected (introHold, a CUSUM, Pierre 2026-11-02): two
    // misses where 0.8 was expected hold; right answers pay it back by what they beat the expectation by; never below 0.
    {
      const h0 = HOLDS;
      HOLDS = 0;
      holdStep(0.8, false);
      if (introHold()) fails.push('held after one miss');
      holdStep(0.8, false);
      holdStep(0.8, false);
      const on = introHold(); // 3 x (0.8 - SLACK)
      let n = 0;
      while (introHold() && n < 50) (holdStep(0.95, true), n++);
      if (!on || n < 3) fails.push(`hold: on ${on}, released after ${n} right answer(s)`);
      for (let i = 0; i < 20; i++) holdStep(0.5, true);
      if (HOLDS !== 0) fails.push(`hold below 0: ${HOLDS}`);
      // A player slightly below what the game expects (0.85 expected, 0.8 right) is never held: the slack.
      for (let i = 0; i < 200; i++) holdStep(0.85, i % 5 !== 0);
      if (introHold()) fails.push(`held a player 5 points below expectation: ${HOLDS}`);
      // The comeback after a break (model.js, "Comeback after a break"): the progress's times moved back as if the player
      // had left. 10 minutes: nothing. 40 minutes: a new visit (SESSION.GAP), no genus opens for COMEBACK.FLOOR answers,
      // a comeback of a question or two (very little rust). A week: comeback questions (flagged warm, the genus's recall cb < 1, no
      // card, duel or exam, on genera answered right, the surest first), logged |c with the recall-adjusted expectation,
      // counted in the opening hold; right answers end it; openings come back after the floor.
      const ago = ms => Object.values(P).forEach(s => s && s.at && (s.at -= ms)),
        logged = () => {
          const L = SYNC ? SYNC.log || [] : store.get(LOG0, []);
          return L[L.length - 1] || {};
        },
        right = () => say(SHOWNQ[1]),
        fresh = () => {
          NEXTQ = null;
          rematch = null;
          document.querySelectorAll('.unlock').forEach(x => x.remove());
        };
      CB = {r: 0, t: 0, ok: 0, f: 0};
      fresh();
      quizPhoto();
      right(); // an answer now: the times are set
      if (cbGenera().length < 2) fails.push(`comeback test: ${cbGenera().length} genera answered right`);
      ago(10 * 60000);
      fresh();
      quizPhoto();
      if (SHOWNQ.warm || noOpen() || CB.r) fails.push(`10-minute break: ${JSON.stringify({warm: SHOWNQ.warm, CB})}`);
      right();
      ago(40 * 60000);
      fresh();
      const a40 = answersSoFar();
      for (let i = 0; i < COMEBACK.FLOOR + 1; i++) {
        quizPhoto();
        if (SHOWNQ.warm && i >= 2) fails.push(`40-minute break: comeback question ${i} (rust ${CB.r})`);
        if (SHOWNQ.intro || noOpen() !== answersSoFar() < a40 + COMEBACK.FLOOR)
          fails.push(`40-minute break, answer ${i}: card ${!!SHOWNQ.intro}, openings held ${noOpen()}`);
        right();
        fresh();
      }
      HOLDS = 2;
      ago(7 * 864e5);
      const a7 = answersSoFar();
      let nCb = 0,
        firstSure = null;
      for (let i = 0; i < 80; i++) {
        fresh();
        quizPhoto();
        if (!SHOWNQ.warm) break;
        nCb++;
        const t = SHOWNQ[1],
          ch = [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c);
        if (SHOWNQ.intro || SHOWNQ.auto || SHOWNQ[4].exam || !(P[t] || {}).ok || !(SHOWNQ.cb < 1) || !noOpen())
          fails.push(`comeback question ${i}: ${JSON.stringify({t, intro: SHOWNQ.intro, cb: SHOWNQ.cb, ok: (P[t] || {}).ok})}`);
        if (ch.length !== 4) fails.push(`comeback question ${i}: ${ch.length} choices`);
        if (firstSure === null) {
          const R = cbGenera().map(x => recallAt(x)),
            med = R.slice().sort((x, y) => y - x)[Math.ceil(R.length / 2) - 1];
          firstSure = recallAt(t) >= med - 1e-9;
        }
        const h = HOLDS,
          r0 = CB.r;
        right();
        const l = logged();
        if (!/^quiz(\|d)?\|c(\||$)/.test(l.m || '') || !(l.e <= 1)) fails.push(`comeback answer ${i} logged ${JSON.stringify(l)}`);
        if (h > 0 && HOLDS === h) fails.push(`comeback answer ${i} left the hold at ${h}`);
        if (CB.r >= r0 && r0 > 0) fails.push(`comeback answer ${i}: a right answer did not melt the rust (${r0} -> ${CB.r})`);
      }
      if (!nCb || nCb > 60 || CB.r) fails.push(`comeback after a week: ${nCb} questions, rust left ${CB.r}`);
      if (!firstSure) fails.push('the comeback did not start on the surest genera');
      // The floor holds openings for COMEBACK.FLOOR answers at least, then they come back.
      for (let i = answersSoFar(); i < a7 + COMEBACK.FLOOR + 1; i++) {
        if (!noOpen() && answersSoFar() < a7 + COMEBACK.FLOOR)
          fails.push(`openings back ${answersSoFar() - a7} answers after a week's break`);
        fresh();
        quizPhoto();
        right();
      }
      if (noOpen()) fails.push(`openings still held ${answersSoFar() - a7} answers after a week's break`);
      // A miss during a comeback brings its Again, still a comeback question.
      ago(30 * 864e5);
      fresh();
      quizPhoto();
      if (!SHOWNQ.warm) fails.push(`no comeback after a month (rust ${CB.r})`);
      say(choices().find(x => x !== SHOWNQ[1]));
      for (let k = 0; k < 2 && !(SHOWNQ && SHOWNQ.again && k); k++) {
        NEXTQ = null;
        document.querySelectorAll('.unlock').forEach(x => x.remove());
        quizPhoto();
        if (!SHOWNQ.again) right();
      }
      if (!SHOWNQ.again || !SHOWNQ.warm || !(SHOWNQ.cb <= 1))
        fails.push(`Again during the comeback: ${JSON.stringify({again: SHOWNQ.again, warm: SHOWNQ.warm, cb: SHOWNQ.cb})}`);
      right();
      CB = {r: 0, t: 0, ok: 0, f: 0};
      rematch = null; // no "Again" left over from the section before
      HOLDS = h0;
    }
    // Custom quiz (model.js customDraw, customChoices; quiz.js planPhoto on CUSTOM_H): the real draw on the real data,
    // a new player and a strong one. Every genus asked is one picked, a genus not met yet comes with its own card (it is
    // the one asked), the choices come from the selection when it has 4 genera or more, and a 2-genus selection is
    // topped up to 4 distinct choices with the other picked genus among them; the photo quiz's offers never show there.
    {
      const sel4 = ['Pocillopora', 'Stylophora', 'Seriatopora', 'Acropora', 'Porites'],
        sel2 = ['Fungia', 'Danafungia'];
      for (const strong of [false, true])
        for (const sel of [sel4, sel2]) {
          P = strong ? Object.fromEntries(genera.map(n => [n, {ok: 20, ko: 2, h: '1111011111', th: 2, pg: 0.7}])) : {};
          if (strong) P[LEVEL] = {ok: 400, ko: 40, th: 2};
          store.set(INTRO.KEY, {});
          INTROS = null;
          rematch = null;
          NEXTQ = null;
          store.set(CUSTOM.KEY, {g: sel, t: Date.now()});
          for (let i = 0; i < 40; i++) {
            const q = planPhoto(CUSTOM_H),
              [cur, t, ch] = q,
              tag = `custom quiz (${strong ? 'strong' : 'new'} player, ${sel.length} picked): ${t} [${ch.join(', ')}]`;
            if (cur !== CUSTOM_H || !sel.includes(t)) fails.push(`${tag}: genus asked not picked`);
            if (q.intro && (q.intro.join() !== t || !q.custom)) fails.push(`${tag}: card ${q.intro} with the question`);
            if (!q.intro && !introduced(t)) fails.push(`${tag}: a genus not met asked without its card`);
            if (q.intro) introAdd(q.intro, true, 'c');
            if (!ch.includes(t) || new Set(ch).size !== ch.length) fails.push(`${tag}: choices`);
            if (ch.length === 4 && sel.length >= 4 && ch.some(n => !sel.includes(n))) fails.push(`${tag}: a choice outside the selection`);
            if (sel.length === 2 && !q.again && !q.auto && (ch.length !== 4 || !sel.every(n => ch.includes(n))))
              fails.push(`${tag}: a 2-genus selection not topped up to 4 with both genera`);
            if (!q.again && !q.auto && !q.typed && ch.length !== 4) fails.push(`${tag}: ${ch.length} choices`);
          }
        }
      // Codex review #411 (1): a selection of genera nobody confuses can't give the traps a strong player's level asks
      // for; the question is scored with the choices really shown (plausibleK), never as a 4-choice one with traps.
      // (2): no mastery exam question in the custom quiz (rule 14e: its choices could hold no look-alike); the exam
      // comes in the photo quiz.
      {
        // Four genera no pair of which is confusable, sharing no IMR growth form if the data allows (then plausibleK < 4).
        const pick4 = ok => {
          const L = [];
          for (const n of pool()) if (L.length < 4 && L.every(x => ok(x, n))) L.push(n);
          return L;
        };
        const far = pick4((x, n) => !confusable(x, n) && !confusable(n, x) && !imrFormsOf(x).some(f => imrFormsOf(n).includes(f))),
          apart = far.length === 4 ? far : pick4((x, n) => !confusable(x, n) && !confusable(n, x));
        P = Object.fromEntries(genera.map(n => [n, {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.85}]));
        P[LEVEL] = {ok: 600, ko: 40, th: 2};
        rematch = null;
        NEXTQ = null;
        store.set(CUSTOM.KEY, {g: apart, t: Date.now()});
        let exams = 0,
          scored = 0;
        for (let i = 0; i < 60; i++) {
          const q = planPhoto(CUSTOM_H),
            [, t, ch, , set, kq] = q;
          if (set.exam) exams++;
          if (q.again || q.auto || q.typed) continue;
          scored++;
          // The k the answer uses (quiz.js answer: 0 = every choice counts).
          const want = ch.filter(n => n !== t && confusable(t, n)).length < 2 ? plausibleK(t, ch) : ch.length;
          if ((kq || ch.length) !== want)
            fails.push(`custom quiz on ${apart.join(', ')}: ${t} [${ch.join(', ')}] scored k ${kq}, ${want} expected`);
        }
        if (apart.length < 4 || !scored) fails.push(`custom quiz scoring check did not run (${apart.join(', ')}, ${scored})`);
        if (exams) fails.push(`custom quiz: ${exams} mastery exam questions in 60 (the exam belongs to the photo quiz)`);
        // A played custom session (Pierre, 2026-11-03: exams only in the normal quiz): genera one exam question from
        // Learned, every answer right, typed ones too; never an exam question on screen, never s.mx from it.
        P = Object.fromEntries(
          genera.map(n => [n, {ok: 30, ko: 2, h: '1111111111', th: 2, pg: 0.9, ex: {k: EXAM.n - 1, t: TYPED.exam, v: ['wide'], at: -99}}])
        );
        P[LEVEL] = {ok: 600, ko: 40, th: 2};
        NEXTQ = null;
        let shown = 0;
        for (let i = 0; i < 30; i++) {
          document.querySelectorAll('.unlock').forEach(x => x.remove());
          quizPhoto(CUSTOM_H);
          if (EXAMQ || SHOWNQ[4].exam) shown++;
          say(SHOWNQ[1]);
        }
        const mx = apart.filter(n => P[n].mx);
        if (shown || mx.length) fails.push(`custom quiz session: ${shown} exam questions shown, mastery credited on ${mx.join(', ')}`);
        if (!(answersSoFar() > 600)) fails.push('custom quiz session: the answers were not counted');
      }
      store.set(CUSTOM.KEY, null);
      store.set(INTRO.KEY, {});
      INTROS = null;
    }
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
    `Question draw OK: ${out.draws} draws over ${out.genera} genera at 4 player levels, answer choices at 0-3 traps, mastery exam, typed questions, first meetings, starred genera after their references, prompt spacing, custom quiz.`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
