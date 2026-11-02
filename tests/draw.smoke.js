// Question draw test (code re-review 2026-11-01, ROADMAP "Test the question draw"): runs the real photoSet() and
// distractors() of app.js in Chromium, for every genus and several player levels, and checks Pierre's rules:
// - every photo of a question (shown, hint, revealed after) comes from ONE observation (same colony; AGENTS.md 14b);
// - never a several-corals or Coral Finder book photo in a game (rule 10); bonus genera: Research Grade or Pierre's only (14a);
// - answer choices: 3 distinct genera of the list, never the target; exactly the asked number of traps (look-alikes /
//   confused genera) when enough exist, none at the very start (14c);
// - first meetings: genera met on cards before being asked, never right after their card (INTRO).
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
    const at = [],
      qx = question;
    let shownT = null;
    question = (...a) => ((shownT = a[1]), qx(...a)); // the genus asked (a duel slipped in is not nextTarget's)
    for (let i = 0; i < 400 && !P[t].mx; i++) {
      quizPhoto();
      if (EXAMQ === t) {
        at.push(answersSoFar());
        if (document.querySelectorAll('.qstage .qph').length !== 1) fails.push('exam question with several photos');
      }
      document.querySelector(`[data-c="${CSS.escape(shownT)}"]`).click();
    }
    question = qx;
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
    // Misses on its easiest photos (a random set could be the hardest, where a miss says little: CI run of PR #336).
    const wrong = 'Porites' === t ? 'Acropora' : 'Porites',
      pics = Object.values(DATA.gen[t].views)
        .flat()
        .sort((a, b) => photoDiff(t, a) - photoDiff(t, b));
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.96, mx: 1};
    for (let i = 0; i < 3 && P[t].mx; i++) answer('quiz', wrong, t, pics.slice(0, 2), false, null);
    if (P[t].mx) fails.push(`${t}: still mastered after misses (L ${knownP(t)})`);
    // A miss never raises what the genus is known to be, even on its hardest photo shown alone.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.96, mx: 1};
    answer('quiz', wrong, t, pics.slice(-1), false, null);
    if (knownP(t) > 0.96) fails.push(`${t}: a miss on a hard photo raised L from 0.96 to ${knownP(t)}`);
    // Exam photos are never-seen ones while some remain.
    P[t] = {ok: 30, ko: 2, h: '1111111111', th: 2, L: 0.97, ps: {}};
    const v0 = examSet(t).shown[0];
    P[t].ps[v0.f] = [1, 0];
    for (let i = 0; i < 20; i++)
      if (examSet(t).shown[0].f === v0.f && gamePics(t, v0.view, 'hard').length > 1) fails.push(`${t}: exam reused a photo already seen`);
    // The sheet's leaderboard % (Code.gs pctOf_, a copy of core.js pctOf) equals the app's progPct on varied progress.
    for (let r = 0; r < 20; r++) {
      P = {};
      Object.keys(DATA.gen).forEach((n, i) => {
        const x = (i * 7 + r * 13) % 10;
        if (x === 0) return;
        P[n] =
          x === 1
            ? {ok: 3, ko: 1, h: '1011'}
            : {
                ok: x,
                ko: 1,
                h: '11',
                L: Math.min(0.99, 0.1 * x),
                ...(x === 9 ? {ex: {k: r % 5, v: [], at: 0}} : {}),
                ...(x === 8 && r % 2 ? {mx: 1} : {})
              };
      });
      if (progPct() !== pctOf(P, Object.keys(DATA.gen)))
        fails.push(`progress %: app ${progPct()} vs core pctOf ${pctOf(P, Object.keys(DATA.gen))}`);
    }
    // First meetings (INTRO, Pierre 2026-11-02): from zero, INTRO.START cards then questions among them; every genus
    // asked was met on a card before; one met on a card alone is not asked before INTRO.GAP answers; at least
    // INTRO.EVERY answers between two cards; with enough genera met, the choices are all genera met.
    {
      P = {};
      INTROS = {};
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
        now.forEach(n => (at[n] = [a, INTROS[n][1]]));
        if (i === 0 && (now.length !== INTRO.START || !now.includes(tg)))
          fails.push(`first question: cards ${now.join(', ')}, asked ${tg}`);
        // The question shown with its genus's card never repeats the card's photo (new-player walkthrough 2026-11-02).
        if (now.includes(tg) && shownF.includes((cover(GX(tg)) || {}).f)) fails.push(`question ${i}: the photo of ${tg}'s card again`);
        if (!at[tg] && !asked(tg) && !isBonus(tg)) fails.push(`question ${i}: ${tg} asked without its card`);
        else if (at[tg] && !at[tg][1] && a < at[tg][0] + INTRO.GAP)
          fails.push(`question ${i}: ${tg} asked ${a - at[tg][0]} answer(s) after its card`);
        const ch = [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c);
        if (Object.keys(INTROS).length >= 4 && !ch.every(introduced)) fails.push(`question ${i}: a choice never met (${ch.join(', ')})`);
        // The offer to open all genera: only in its window, at a high enough level, once; declined here.
        const offer = document.querySelector('.unlock.intro [data-open]');
        if (offer) {
          const O = INTRO.OFFER,
            th = (P[LEVEL] || {}).th || 0;
          if (a < O.AT || a > O.UNTIL || th < O.TH || offers++) fails.push(`offer at ${a} answers, level ${th}, offer #${offers}`);
          document.querySelector('.unlock.intro .sec').click();
        }
        document.querySelectorAll('.unlock.intro').forEach(x => x.remove());
        document.querySelector(`[data-c="${CSS.escape(i % 3 ? tg : ch.find(c => c !== tg))}"]`).click();
      }
      // The same over many first questions (one draw each above would rarely catch it).
      for (let i = 0, same = 0; i < 60; i++) {
        P = {};
        INTROS = {};
        NEXTQ = null;
        document.querySelectorAll('.unlock').forEach(x => x.remove());
        quizPhoto();
        if (shownF.includes((cover(GX(tg)) || {}).f) && !same++) fails.push(`first question: the photo of ${tg}'s card again`);
      }
      document.querySelectorAll('.unlock').forEach(x => x.remove());
      cardsAt.forEach(([a, k], i) => {
        if (i && a - cardsAt[i - 1][0] < INTRO.EVERY) fails.push(`two cards ${a - cardsAt[i - 1][0]} answer(s) apart`);
        if (i && k !== 1) fails.push(`${k} cards at once after the first ones`);
      });
      if (cardsAt.length < 3) fails.push(`only ${cardsAt.length} card showing(s) in 120 questions`);
      // Mostly right (an RA after the lecture): the offer comes between OFFER.AT and OFFER.UNTIL answers, and Open all
      // genera opens every genus left.
      P = {};
      INTROS = {};
      store.set(INTRO.OFFER.KEY, null);
      let shownAt = 0;
      for (let i = 0; i <= INTRO.OFFER.UNTIL && !shownAt; i++) {
        NEXTQ = null;
        document.querySelectorAll('.unlock').forEach(x => x.remove()); // closed by the player before Next
        quizPhoto();
        for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not(.sec)'));) b.click();
        const o = document.querySelector('.unlock.intro [data-open]');
        if (o) {
          shownAt = answersSoFar();
          o.click();
        }
        document.querySelectorAll('.unlock.intro').forEach(x => x.remove());
        document.querySelector(`[data-c="${CSS.escape(tg)}"]`).click();
      }
      if (!shownAt || shownAt < INTRO.OFFER.AT || introLeft().length)
        fails.push(`all right: offer at ${shownAt} answers, ${introLeft().length} genera left after Open all`);
      // Synced with the progress: the cards and the offer are imr-coral* keys (sent by progData), and the cards seen on
      // another device join this one's (introMerge), ready; a progress reset starts them over.
      {
        INTROS = {};
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
      // Look-alike duels slipped into the photo quiz (AUTO_DUEL): about 1 question in 10 once past the first answers,
      // on pairs of genera met, never the same pair twice within AUTO_DUEL.SAME answers, logged quiz|d|k2.
      {
        const n0 = answersSoFar(),
          seen = [];
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
          // Two 2-choice questions (a duel slipped in, an Again) never closer than AUTO_DUEL.GAP, Agains after a
          // normal question's mix-up excepted (they follow it by design).
          if (q[2].length === 2) {
            const gap = answersSoFar() - (lastTwo == null ? -1e9 : lastTwo[0]),
              need = lastTwo && lastTwo[1] ? AUTO_DUEL.GAP : AUTO_DUEL.AGAIN;
            if (AUTOD && gap < need) fails.push(`duel in the quiz ${gap} answers after a 2-choice question`);
            if (AUTOD || !lastTwo || !lastTwo[1]) lastTwo = [answersSoFar(), AUTOD];
          }
          if (AUTOD) {
            duels++;
            const k = q[2].slice().sort().join('|'),
              at = answersSoFar();
            if (q[2].length !== 2 || !q[2].every(introReady)) fails.push(`duel in the quiz on ${q[2].join(', ')}`);
            if (seen.some(([a, kk]) => kk === k && at - a < AUTO_DUEL.SAME)) fails.push(`duel ${k} twice within ${AUTO_DUEL.SAME} answers`);
            seen.push([at, k]);
          }
          const won = AUTOD && i % 10;
          document.querySelector(`[data-c="${CSS.escape(i % 10 ? q[1] : q[2].find(c => c !== q[1]))}"]`).click();
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
      // "I've had the IMR lecture": every slate genus opens at once, and no card comes after.
      introAll('progress');
      if (introLeft().length) fails.push(`open all genera: ${introLeft().length} left`);
      // Kept for the admin's player journey: when each card showed, and where all were opened from.
      const oa = store.get(INTRO.OFFER.KEY, {}) || {};
      if (!oa.open || oa.via !== 'progress' || !oa.t || Object.values(introMap()).some(e => !e[2] || !e[3]))
        fails.push(`open all not recorded for the journey: ${JSON.stringify(oa)}`);
      for (let i = 0; i < 30; i++) {
        NEXTQ = null;
        quizPhoto();
        if (document.querySelector('.unlock.intro')) fails.push('a card after opening all genera');
        document.querySelectorAll('.unlock.intro').forEach(x => x.remove());
        document.querySelector(`[data-c="${CSS.escape(tg)}"]`).click();
      }
      question = q0;
      INTROS = {};
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
    `Question draw OK: ${out.draws} draws over ${out.genera} genera at 4 player levels, answer choices at 0-3 traps, mastery exam, first meetings.`
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
