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
  '.woff2': 'font/woff2',
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

// Three players through the real photo quiz (Pierre, 2026-11-02; docs/LEARNING.md): a complete beginner, an IMR RA
// after one lecture (knows some genera a little), an expert. The learner model is the test's, not the app's: know[g] =
// chance to recognise genus g on a photo of average difficulty, lowered on harder photos and single views; otherwise a
// guess among the plausible choices (none on a typed question, model.js TYPED: "I don't know" or another genus typed);
// each answer teaches a little. Checks that the app, with nothing set per profile:
// keeps a beginner on a few genera at a time, the easier ones first, and keeps opening new ones; gives an expert many
// genera, hard choices (look-alike traps) and progress well ahead of a beginner's; no genus reaches its exam's entry before it was asked beside a look-alike. Locally: node tests/profiles.smoke.js
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
    localStorage.setItem('reefid-tour', '"done"');
    localStorage.setItem('reefid-sync-coral-start', '{"c":"new","t":1}');
    // Same draws every run: the app's own randomness is seeded too.
    let s = 12345;
    Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  });
  const p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(base);
  await p.waitForFunction(() => window.APP_READY, null, {timeout: 30000});
  const R = await p.evaluate(() => {
    const sig = x => 1 / (1 + Math.exp(-x)),
      logit = q => Math.log(q / (1 - q)),
      G = slateGenera();
    let seed = 7;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const q0 = question;
    question = (...a) => ((window.__q = a), q0(...a));
    const profiles = {
      beginner: [() => Object.fromEntries(G.map(g => [g, 0.02])), 0.12],
      RA: [() => Object.fromEntries(G.map((g, i) => [g, i % 5 < 2 ? 0.55 : 0.1])), 0.12],
      expert: [() => Object.fromEntries(G.map(g => [g, 0.93])), 0.05]
    };
    const out = {};
    // One player of a profile through N questions: the 100-question rows, the genera that reached their exam's entry
    // too early, the first genera asked.
    const play = (mk, rate, N) => {
      P = {};
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      store.set(INTRO.OFFER.KEY, {open: 0}); // the offer to open all is declined: the path is what is measured
      const know = mk(),
        early = new Set(),
        typedOk = new Set(),
        first = [],
        rows = [];
      let blk = {n: 0, ok: 0, traps: 0, tn: 0, ty: 0};
      for (let i = 0; i < N; i++) {
        NEXTQ = null;
        quizPhoto();
        // The player reads the first-meeting cards through (each genus is met when its card shows).
        for (let b; (b = document.querySelector('.unlock.intro .ulbtns .next:not([data-open]):not([data-notnow]):not(.sec)'));) b.click();
        const t = window.__q[1];
        if (!first.includes(t)) first.push(t);
        // A typed question (model.js TYPED) has no buttons: its choices are the draw's, unseen; nothing to guess from.
        const typed = !!document.querySelector('#view .tyform'),
          ch = typed ? window.__q[2] : [...document.querySelectorAll('#view [data-c]')].map(x => x.dataset.c),
          traps = ch.filter(c => c !== t && (confusable(t, c) || pooledConf(t, c) >= CONF.TRAP)).length,
          all = Object.values(GX(t).views).flat(),
          // By name (data-f, quiz.js): an iNaturalist photo not downloaded yet (r: 1) has a URL that names no file in img/.
          fs = [...document.querySelectorAll('#view .qstage img')].map(im => im.dataset.f),
          pd = fs
            .map(f => all.find(x => x.f === f))
            .filter(Boolean)
            .map(x => photoDiff(t, x)),
          diff = pd.length ? pd.reduce((a, x) => a + x, 0) / pd.length : 0,
          kq = Math.min(ch.length, Number((document.querySelector('#view .ans') || {dataset: {}}).dataset.k) || ch.length),
          pk = sig(logit(Math.min(0.995, Math.max(0.005, know[t]))) - diff - (fs.length === 1 ? 0.5 : 0)),
          right = rnd() < pk || (!typed && rnd() < 1 / kq),
          // A typed miss: "I don't know" half the time, else another genus typed (one of the draw's wrong choices).
          pick = right ? t : typed && rnd() < 0.5 ? '' : ch.filter(c => c !== t)[Math.floor(rnd() * (ch.length - 1))];
        blk.n++;
        blk.ok += right;
        // Traps of the 4-choice questions only: a look-alike duel slipped into the quiz (CONTRAST) has one wrong choice,
        // always a look-alike, and is a separate exercise.
        if (!AUTOD && !typed) {
          blk.traps += traps;
          blk.tn++;
        }
        if (typed) {
          blk.ty++;
          const f = document.querySelector('#view .tyform');
          if (!pick) f.querySelector('[data-idk]').click();
          else ((f.querySelector('input').value = pick), f.requestSubmit());
          // A typed right answer: every genus, its look-alikes included, was a possible answer (model.js pgWeight).
          if (right) typedOk.add(t);
        } else document.querySelector(`[data-c="${CSS.escape(pick)}"]`).click();
        know[t] += rate * (1 - know[t]);
        // Progress (core.js PROG): a genus reaches its exam's entry (95%) only once it has been asked beside one of its
        // look-alikes (Pierre, 2026-11-02: never confirmed before it has been compared with the genera it gets confused with).
        if (knownP(t) >= PROG.M && !typedOk.has(t) && !Object.keys(P[t].off || {}).some(n => GX(n) && pooledConf(t, n) >= CONF.TRAP))
          early.add(t);
        if ((i + 1) % 100 === 0) {
          rows.push({
            q: i + 1,
            right: Math.round((100 * blk.ok) / blk.n),
            traps: +(blk.traps / Math.max(1, blk.tn)).toFixed(2),
            typed: blk.ty,
            met: G.filter(introduced).length,
            asked: G.filter(asked).length,
            learned: G.filter(g => (P[g] || {}).mx).length,
            sure: G.filter(g => knownP(g) >= PROG.M).length,
            half: G.filter(g => genScore(g) >= 0.5).length,
            pct: progPct(G)
          });
          blk = {n: 0, ok: 0, traps: 0, tn: 0, ty: 0};
        }
      }
      return {rows, early, first};
    };
    const mean = L => L.reduce((a, x) => a + x, 0) / L.length;
    for (const [name, [mk, rate]] of Object.entries(profiles)) {
      const {rows, early, first} = play(mk, rate, 300);
      out[name] = {
        rows,
        early: [...early],
        firstEase: +mean(first.slice(0, 8).map(genusDiff)).toFixed(2),
        allEase: +mean(G.map(genusDiff)).toFixed(2)
      };
    }
    // Easiest first: with nothing met and the players' answers behind the photo ratings, the easiest genus (genusDiff)
    // is drawn far more often than the hardest. Made-up ratings: one genus's photos rated easy, another's hard.
    {
      P = {};
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      store.set(INTRO.OFFER.KEY, {open: 0}); // the offer to open all is declined: the path is what is measured
      const keep = PSTAT,
        fake = {},
        [ga, gb] = [G[3], G[7]];
      [ga, gb].forEach((g, k) =>
        Object.values(GX(g).views)
          .flat()
          .forEach(p => (fake[p.f] = k ? [1.5, 40, 10] : [-1.5, 40, 36]))
      );
      PSTAT = fake;
      GDIFF = {};
      const byD = G.slice().sort((a, b) => genusDiff(a) - genusDiff(b)),
        easy = byD[0],
        hard = byD[byD.length - 1],
        n = {[easy]: 0, [hard]: 0};
      for (let i = 0; i < 4000; i++) {
        const x = openPick(G);
        if (x in n) n[x]++;
      }
      out.easyFirst = {easy, hard, dEasy: genusDiff(easy), dHard: genusDiff(hard), nEasy: n[easy], nHard: n[hard]};
      // Without any rating from the players, no difficulty order: the two are drawn about as often. Their iNaturalist
      // commonness (data.json cm, a separate order: common first) is made equal for this check, then put back.
      PSTAT = {};
      GDIFF = {};
      const cms = [GX(easy).cm, GX(hard).cm];
      GX(easy).cm = GX(hard).cm;
      const m = {[easy]: 0, [hard]: 0};
      for (let i = 0; i < 4000; i++) {
        const x = openPick(G);
        if (x in m) m[x]++;
      }
      [GX(easy).cm, GX(hard).cm] = cms;
      out.noData = m;
      PSTAT = keep;
      GDIFF = {};
    }
    // Bonus genera (opt-in, 2026-11-02; their own weight cap and 15% share went with it): once on, they are the genera
    // not met yet, which only the opening draws (openPick, when a question opens one: model.js openChance); the genus
    // draw of the questions themselves never asks them before their card; off, never drawn. Every slate genus met and
    // half way (nothing shaky: the opening is wide open), none of the bonus genera met.
    const B = BONUS.filter(n => GX(n));
    if (B.length) {
      P = {};
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      G.forEach(g => (P[g] = {ok: 8, ko: 2, h: '1101111011', th: 1.5, pg: 0.5}));
      out.bonusOpen = openChance([...G, ...B]);
      out.bonusPick = B.includes(openPick([...G, ...B].filter(n => !introduced(n))));
      out.bonusOff = (bonusSet(false), pool().filter(isBonus).length);
    }
    // Online calibration (CAL): on a genus the player holds, a photo nobody has answered yet comes up more often than its
    // rated twins (made-up ratings at each photo's own prior difficulty: its genus offset, model.js photoDiff).
    {
      P = {};
      INTROS = {};
      HOLDS = 0; // a fresh player: no opening hold, no comeback
      CB = {r: 0, t: 0, ok: 0, f: 0};
      store.set(INTRO.OFFER.KEY, {open: 0}); // the offer to open all is declined: the path is what is measured
      const keep = PSTAT,
        g = G.find(n => VIEWS.flatMap(([v]) => gamePics(n, v)).length >= 8),
        L = [...new Set(VIEWS.flatMap(([v]) => gamePics(g, v)))],
        f0 = L[L.length - 1].f,
        keepCal = {...CAL},
        shown = on => {
          Object.assign(CAL, on ? keepCal : {B: 0, RATE: 0, U: 0});
          let k = 0;
          for (let i = 0; i < 3000; i++) if (photoSet(g).shown.some(x => x.f === f0)) k++;
          return k;
        };
      PSTAT = Object.fromEntries(L.filter(x => x.f !== f0).map(x => [x.f, [photoDiff(g, x), 40, 30, 40]]));
      // Calibration questions come on a genus the player already holds (met, not shaky).
      P[g] = {ok: 20, ko: 2, h: '1111111111', th: 1.5, L: 0.9};
      out.cal = {genus: g, photo: f0, without: shown(false), with: shown(true)};
      PSTAT = keep;
    }
    // Focus over several players (AGENTS.md rule 14f): the beginner's first 100 questions again with 7 more seeds, the
    // app's randomness and the player's both, after every other check so their draws stay as they were.
    out.focus = [out.beginner.rows[0].met];
    for (let k = 1; k <= 7; k++) {
      let s = 12345 + 7919 * k;
      Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
      seed = 7 + 1009 * k;
      out.focus.push(play(profiles.beginner[0], profiles.beginner[1], 100).rows[0].met);
    }
    return out;
  });
  await b.close();
  server.close();
  const fails = [],
    [b1, , b3] = R.beginner.rows,
    [e1, , e3] = R.expert.rows,
    [r1, , r3] = R.RA.rows;
  for (const [k, v] of Object.entries(R)) if (v.rows) console.log(k, JSON.stringify(v));
  console.log('beginner genera met by question 100, 8 seeds:', R.focus.join(' '));
  console.log(
    'bonus opening chance',
    R.bonusOpen,
    'off',
    R.bonusOff,
    'easy first',
    JSON.stringify(R.easyFirst),
    'calibration',
    JSON.stringify(R.cal)
  );
  // 17 (was 16; photo memory, 2026-11-03): this seed went from 16, at the limit, to 17, while 6 other seeds gave 11.5
  // genera on average before and 11.3 after (10-15), and tools/learnsim.js 30 seeds no change either (docs/LEARNING.md
  // "Photo memory"): one draw, not a faster opening.
  // Kept at 17 with the genus wrongly given out of the Elo (2026-11-03, docs/LEARNING.md "The genus wrongly given in
  // the Elo"), measured on main after #408 (one opening rule, OPEN.K 8): this seed meets 12 genera by question 100 with
  // and without the change (margin 5). Over 5 seeds (tools/learnsim.js) the change does open faster: 15.6 -> 19.2 genera
  // by question 100 (seeds 12-22 -> 17-24), at 79% right (86%); a watched effect (ROADMAP), not hidden by this bound.
  // Back to 17 with the global level's move on the genera and the success aimed for by level (2026-11-03,
  // docs/LEARNING.md "Global level and genus", "Beginners and experts"): this seed meets 13 genera by question 100 (main
  // 12; the level's move alone gave 18, when the limit went to 21 for a while). Margin 4. Over 5 seeds
  // (tools/learnsim.js) the beginner meets 20.2 by question 100 (main 19.2), 28.0 by 200 (main 30.4).
  // On the 8 seeds below: 10-19, mean 12.8 (main 14.5 after the candidate refill).
  // On the mean of 8 seeds since the candidate refill of 2026-11-03 (f9aae3a: 616 photos the auto-sort added joined
  // data.json, so every draw changed): this seed went from 12 to 19 with no change to the code, while the 8 seeds gave
  // 12-16 (mean 13.9) before and 12-19 (mean 14.5) after. One seed sat inside the spread of the seeds and failed on a
  // data change; the mean of 8 moves with the opening rule, not with one draw. For reference, before #413 the same 8
  // seeds gave 8-12 (mean 9.8): the watched effect above.
  const fMean = R.focus.reduce((a, x) => a + x, 0) / R.focus.length;
  if (fMean > 17) fails.push(`beginner met ${fMean.toFixed(1)} genera on average in 100 questions (${R.focus.join(' ')}): not focused`);
  if (b3.met <= b1.met) fails.push(`beginner stopped opening genera (${b1.met} then ${b3.met})`);
  if (r3.met <= r1.met) fails.push(`RA stopped opening genera (${r1.met} then ${r3.met})`);
  const E = R.easyFirst,
    N = Object.values(R.noData);
  if (Math.max(...N) > 2 * Math.min(...N))
    fails.push(`without the players' ratings an order was applied anyway: ${JSON.stringify(R.noData)}`);
  if (!(E.nEasy > 3 * Math.max(1, E.nHard)))
    fails.push(`easiest genus not drawn first: ${E.easy} (${E.dEasy}) ${E.nEasy} times, ${E.hard} (${E.dHard}) ${E.nHard} times`);
  if (e1.met <= b1.met) fails.push(`expert met no more genera than a beginner in 100 questions (${e1.met} vs ${b1.met})`);
  if (e3.met <= b3.met) fails.push(`expert opened no more genera than a beginner (${e3.met} vs ${b3.met})`);
  // Traps come only from genera met (first-meeting cards), so an expert has few at 100 questions; once their genera are
  // open (300) they get one or more a question, and more than a beginner from the start. (The mean of 100 and 300 sat at
  // the threshold and failed with some seeds, duels in the quiz or not: 4 seeds compared, 2026-11-02.)
  if (e3.traps < 1 || e1.traps <= b1.traps)
    fails.push(`expert got ${e1.traps}, ${e3.traps} look-alike traps a question (beginner ${b1.traps} at 100)`);
  // Progress (core.js PROG, a moving average weighed by what each answer proves) climbs progressively: after 300
  // questions an expert (every genus open by question 200) has many genera half way and far more progress than a
  // beginner, while genera at their exam's entry (95%) come from about question 400 on (6 seeds, docs/LEARNING.md).
  if (e3.half < 10) fails.push(`expert has ${e3.half} genera at 50% or more after 300 questions`);
  if (e3.pct <= b3.pct + 10) fails.push(`expert's progress not clearly above a beginner's (${e3.pct}% vs ${b3.pct}%)`);
  for (const [k, v] of Object.entries(R))
    if (v.early && v.early.length) fails.push(`${k}: ${v.early.join(', ')} at 95% before being asked beside a look-alike`);
  // Nothing shaky: the opening chance is 1 (its pace is then openPace's: at most OPEN.MAX genera in OPEN.WIN answers,
  // 2026-11-04; the hotfix of 2026-11-03 capped the chance itself at 0.5).
  if (R.bonusOpen !== 1 || !R.bonusPick || R.bonusOff)
    fails.push(`bonus genera not met: opening chance ${R.bonusOpen} (1 expected), opened: ${R.bonusPick}; off: ${R.bonusOff} in the pool`);
  if (!(R.cal.with > 1.3 * Math.max(10, R.cal.without)))
    fails.push(`calibration: an unrated photo was not drawn more often: ${JSON.stringify(R.cal)}`);
  if (errs.length) fails.push('page errors: ' + errs.slice(0, 3).join(' | '));
  if (fails.length) {
    console.error(`Learning path: ${fails.length} problem(s)\n` + fails.join('\n'));
    process.exit(1);
  }
  console.log(
    'Learning path OK: a beginner and an RA focus on a few genera, easier first, and keep opening; an expert gets many genera, traps and progress well ahead; no genus reaches 95% before meeting its look-alikes.'
  );
})().catch(e => {
  console.error(e);
  process.exit(1);
});
