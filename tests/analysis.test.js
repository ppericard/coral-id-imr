// The Analyses module (analysis.js): the model code recovers known effects from synthetic data, the answer log is read
// as the app logs it, milestones and verdicts, and the workflow script (tools/analyses.js) end to end on a stub sheet.
// node --test tests/
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const near = (got, want, tol, what) => assert.ok(Math.abs(got - want) <= tol, `${what}: ${got.toFixed(3)} not within ${tol} of ${want}`);

test('guessOf is the same as core.js (Code.gs guess_)', () => {
  const C = require('../core.js');
  for (const [m, ch] of [
    ['quiz', 'A B C D'],
    ['quiz', 'A B'],
    ['quiz', ''],
    ['quiz|k2', 'A B C D'],
    ['quiz|k3', 'A B C D'],
    ['quiz|t', ''],
    ['quiz|d|k2', 'A B'],
    ['quiz-duel', 'A B'],
    ['quiz-duel|A|B', 'A B'],
    ['quiz|s|t', ''],
    ['quiz|c|k2', 'A B C D'],
    ['quiz|x', 'A B C D']
  ])
    assert.strictEqual(A.guessOf(m, ch), C.guessOf(m, ch), m + ' ' + ch);
});

test('formats read from the mode and the choices', () => {
  assert.strictEqual(A.fmtOf('quiz', 4), 'k4');
  assert.strictEqual(A.fmtOf('quiz|k3', 4), 'k3');
  assert.strictEqual(A.fmtOf('quiz|k2', 4), 'k2');
  assert.strictEqual(A.fmtOf('quiz|k2', 2), 'again');
  assert.strictEqual(A.fmtOf('quiz', 2), 'again');
  assert.strictEqual(A.fmtOf('quiz|d|k2', 2), 'qduel');
  assert.strictEqual(A.fmtOf('quiz-duel|A|B', 2), 'duel');
  assert.strictEqual(A.fmtOf('quiz|x', 4), 'exam');
  assert.strictEqual(A.fmtOf('quiz|s|t', 0), 'typed');
});

test('prep: sessions, exposures, the previous answer on the genus, an Again after a miss', () => {
  const M = 6e4,
    r = (t, g, a, ok, m = 'quiz', ch = 'A B C D') => ['p1', t, g, a, ok, m, 'f1', 0.7, 0, 0, ch, 0, 5, 0];
  const L = A.prep([
    r(0, 'A', 'B', 0),
    r(1 * M, 'A', 'A', 1, 'quiz|k2', 'A B'), // Again: A or B?
    r(2 * M, 'A', 'A', 1),
    r(100 * M, 'A', 'A', 1), // a new session, 98 minutes later
    ['p1', 101 * M, 'B', 'B', 1, 'learn', '', null, null, null, '', 0, null, null] // not a quiz answer: left out
  ]);
  assert.strictEqual(L.length, 4);
  assert.deepStrictEqual(
    L.map(a => [a.f, a.n, a.pos, a.afterMiss, a.afterAgain, a.streak]),
    [
      ['k4', 0, 1, 0, 0, 1],
      ['again', 1, 2, 0, 0, 0],
      ['k4', 2, 3, 1, 1, 0],
      ['k4', 3, 1, 0, 0, 0]
    ]
  );
  assert.notStrictEqual(L[3].sess, L[2].sess);
  assert.strictEqual(L[3].prev.t, 2 * M);
});

test('lmm recovers fixed effects and crossed variance components (a question shares its photos)', () => {
  const R = A.rng(3),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
  const P = Array.from({length: 30}, () => nrm() * 0.4),
    G = Array.from({length: 30}, () => nrm() * 0.2),
    H = Array.from({length: 300}, () => nrm() * 0.3);
  const y = [],
    X = [],
    kp = [],
    kg = [],
    kh = [];
  for (let i = 0; i < 6000; i++) {
    const p = i % 30,
      g = Math.floor(R() * 30),
      h = [Math.floor(R() * 300), ...(R() < 0.5 ? [Math.floor(R() * 300)] : [])],
      x = R() < 0.5 ? 1 : 0,
      z = nrm();
    y.push(1 + 0.5 * x - 0.3 * z + P[p] + G[g] + h.reduce((s, k) => s + H[k], 0) / h.length + nrm() * 0.5);
    X.push([1, x, z]);
    kp.push('p' + p);
    kg.push('g' + g);
    kh.push(h.map(k => 'h' + k));
  }
  const F = [A.factor('player', kp), A.factor('genus', kg), A.factor('photo', kh)];
  const M = A.lmm(y, X, F);
  near(M.b[1], 0.5, 0.05, 'x');
  near(M.b[2], -0.3, 0.03, 'z');
  near(Math.sqrt(M.s2), 0.5, 0.03, 'residual SD');
  near(Math.sqrt(F[0].tau2), 0.4, 0.15, 'player SD');
  near(Math.sqrt(F[2].tau2), 0.3, 0.1, 'photo SD');
});

test('glmm with a guess rate recovers its effects; fmtFit a real guess rate and difficulty', () => {
  const R = A.rng(5),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    sig = x => 1 / (1 + Math.exp(-x));
  const P = Array.from({length: 40}, () => nrm() * 0.8);
  const y = [],
    X = [],
    kp = [],
    g = [];
  for (let i = 0; i < 12000; i++) {
    const p = i % 40,
      x = R() < 0.4 ? 1 : 0,
      gi = R() < 0.5 ? 0.25 : 0.5;
    y.push(R() < gi + (1 - gi) * sig(0.8 + P[p] - 0.7 * x) ? 1 : 0);
    X.push([1, x]);
    kp.push('p' + p);
    g.push(gi);
  }
  const M = A.glmm(y, X, [A.factor('player', kp)], {g: Float64Array.from(g)});
  near(M.b[1], -0.7, 0.12, 'x');
  // a format whose real guess rate is 0.35 (the app thinks 0.5) and 0.5 harder than the app's expectation
  const xs = [],
    ys = [];
  for (let i = 0; i < 20000; i++) {
    const x = nrm() * 1.5;
    xs.push(x);
    ys.push(R() < 0.35 + 0.65 * sig(x - 0.5) ? 1 : 0);
  }
  const f = A.fmtFit(ys, xs, 0.5);
  near(f.c, 0.35, 0.05, 'guess rate');
  near(f.d, -0.5, 0.15, 'difficulty');
});

test('synthetic log: every analysis runs and gives back the generator’s effects', () => {
  const V = ['wide', 'medium', 'macro'],
    S = ['imr', 'own', 'inat'],
    photos = {},
    meta = {ph: {}},
    look = {};
  for (let g = 0; g < 16; g++) {
    const G = 'Gen' + g;
    photos[G] = [];
    look[G] = ['Gen' + ((g + 1) % 16), 'Gen' + ((g + 3) % 16)];
    for (let k = 0; k < 12; k++) {
      const p = {
        f: `g${g}-${k}`,
        v: V[k % 3],
        q: [3, 2, 1][Math.floor(k / 3) % 3],
        sh: 20 + ((k * 37 + g * 11) % 200),
        src: S[(k + g) % 3],
        o: `o${g}-${Math.floor(k / 3)}`
      };
      photos[G].push(p);
      meta.ph[p.f] = [p.v, p.q, p.sh, p.src];
    }
  }
  const pl = Array.from({length: 12}, (_, i) => ['P' + i, ((i % 5) - 2) * 0.4, 600, 0.05 + 0.03 * (i % 6)]);
  const rows = A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 11});
  const r = A.runAll(rows, meta, {B: 0});
  const T = A.TRUTH,
    e = (a, k) => r.A[a].effects.find(x => x.k === k);
  Object.entries(r.A).forEach(([k, a]) => assert.ok(!a.err && !a.thin, `${k}: ${a.err || 'thin'}`));
  near(e('rt', 'right').est, T.rt.right, 0.04, 'time: right');
  near(e('rt', 'typed').est, T.rt.typed, 0.06, 'time: typed');
  near(e('rt', 'enl').est, T.rt.enl, 0.06, 'time: enlarged');
  near(e('rt', 'sd_genus').est, T.rt.sdGenus, 0.08, 'time: SD genus');
  near(e('photo', 'macro').est, T.ph.macro, 0.25, 'photo: corallites');
  near(e('photo', 'poor').est, T.ph.poor, 0.25, 'photo: poor');
  near(e('photo', 'alone').est, T.ph.alone, 0.2, 'photo: one view alone');
  near(e('learn', 'slope').est, T.learn.slope, 0.15, 'learning slope');
  near(e('zoom', 'rel').est, T.zoom, 0.25, 'zoom');
  near(e('back', 'slope').est, T.back, 0.2, 'forgetting');
  near(e('sess', 'streak').est, T.sess.streak, 0.35, 'sessions: misses in a row');
  assert.strictEqual(e('fmt', 'g_typed').v === 'clear', false, 'typed: no guessing found');
  assert.ok(e('learn', 'card').v === 'nolog', 'the first-meeting card is not in the log');
  // the verdicts are consistent with the intervals
  Object.values(r.A).forEach(a =>
    a.effects.forEach(x => {
      if (x.v === 'clear' && !x.sd) assert.ok(x.lo > (x.nul || 0) || x.hi < (x.nul || 0), x.k);
      if (x.v === 'thin' && x.need) assert.ok(x.need >= 100, x.k);
    })
  );
});

test('milestones, verdicts and the report: earlier milestones reused only for the same answers', () => {
  // round thousands only (Pierre, 2026-11-05), never the total
  assert.deepStrictEqual(A.milestones(2500), [1000, 2000]);
  assert.deepStrictEqual(A.milestones(3000), [1000, 2000, 3000]);
  assert.deepStrictEqual(A.milestones(1933), [1000]);
  assert.deepStrictEqual(A.milestones(400), []);
  assert.strictEqual(A.verdictOf({est: 0.5, lo: 0.2, hi: 0.8, sesoi: 0.25}, 1000).v, 'clear');
  assert.strictEqual(A.verdictOf({est: 0.05, lo: -0.1, hi: 0.2, sesoi: 0.25}, 1000).v, 'margin');
  const t = A.verdictOf({est: 0.2, lo: -0.4, hi: 0.8, sesoi: 0.25}, 1000);
  assert.strictEqual(t.v, 'thin');
  assert.strictEqual(t.need, 6000, 'half-width 0.6 down to the 0.25 that matters: 5.76 times the answers, rounded up');
  assert.strictEqual(A.verdictOf({est: 0.4, lo: 0.3, hi: 0.6, nul: 0.5, sesoi: 0.05}, 100).v, 'thin', 'a reference value');
  const fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1), {days: 400, players: A.DEMO_PLAYERS.slice(0, 4).map(p => [p[0], p[1], 400, p[3]])});
  assert.ok(rows.length >= 1100, String(rows.length));
  const meta = {ph: A.photoMeta(data)};
  // the stored report (the Action's): round milestones only; Recompute here (live) adds all the answers as one more point
  const r0 = A.report(rows.slice(0, 1100), meta, null, {B: 0});
  assert.deepStrictEqual(r0.M, [1000]);
  assert.ok(!('live' in r0) && !r0.R[1100]);
  const r1 = A.report(rows.slice(0, 1100), meta, r0, {B: 0, live: 1}),
    r2 = A.report(rows, meta, r1, {B: 0, live: 1});
  assert.deepStrictEqual(r1.M, [1000, 1100]);
  assert.strictEqual(r1.live, 1100);
  assert.strictEqual(r1.R[1000], r0.R[1000], 'the live look reuses the stored milestone');
  assert.strictEqual(A.report(rows.slice(0, 1000), meta, r0, {B: 0, live: 1}).live, undefined, 'a round total is a milestone already');
  assert.strictEqual(r2.R[1000], r1.R[1000], 'milestone 1000 reused');
  assert.notStrictEqual(r2.R[r2.M[r2.M.length - 1]], r1.R[1100]);
  const small = A.compact(JSON.parse(JSON.stringify(r2)), JSON.stringify(r2).length - 1);
  assert.ok(
    small.R[1000].A.rt.lean && !small.R[1000].A.rt.genus && small.R[1000].A.rt.effects,
    'oldest milestones keep their effects only'
  );
  assert.ok(!small.R[small.M[small.M.length - 1]].A.rt.lean, 'the latest keeps everything');
});

test('tools/analyses.js: waits for 1000 new answers, stores the report, prints no id', async () => {
  const {sheetRun} = require('../tools/analyses.js'),
    fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json')));
  const rows = A.demoLog(data, Date.UTC(2026, 10, 1), {
    days: 300,
    players: A.DEMO_PLAYERS.slice(0, 3).map(p => [p[0], p[1], 450, p[3]])
  }).map(r => ['id' + r[0].length, ...r.slice(1)]);
  let stored = null,
    stale = false;
  const logs = [],
    calls = [];
  const io = {
    post: async b => {
      calls.push(Object.keys(b).filter(k => k !== 'token' && k !== 'report'));
      if (b.token !== 'tok') return {ok: false, error: 'token'};
      if (b.analysesGet) {
        const meta = stored && {answers: JSON.parse(stored).answers, av: JSON.parse(stored).AV};
        return b.head
          ? {ok: true, answers: rows.length, stored: meta, stale}
          : {ok: true, answers: rows.length, stored: meta, report: stored};
      }
      if (b.readAnswers) return {ok: true, rows};
      if (b.analysesPut) return ((stored = b.report), {ok: true, stored: {}});
      return {ok: false, error: 'input'};
    },
    log: t => logs.push(t)
  };
  assert.strictEqual(await sheetRun(io, 'bad', {B: 0}), 'refused');
  assert.ok(rows.length > 1000, String(rows.length));
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0}), 'stored');
  assert.ok(JSON.parse(stored).R[1000]);
  assert.deepStrictEqual(JSON.parse(stored).M, [1000], 'round milestones only, no "All N" point');
  assert.ok(!('live' in JSON.parse(stored)));
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0}), 'wait', 'no new answers: nothing to do');
  assert.strictEqual(logs[logs.length - 1], `${rows.length} answers, newest milestone 1000: the next one at 2000.`);
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0, force: true}), 'stored');
  assert.ok(/1 reused|2 reused/.test(logs[logs.length - 1]), logs[logs.length - 1]);
  // sheet v55: an account removed since the stored report (head stale): refitted at once, nothing reused.
  stale = true;
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0}), 'stored');
  assert.ok(/\(0 reused\)/.test(logs[logs.length - 1]), logs[logs.length - 1]);
  stale = false;
  assert.ok(!logs.join(' ').match(/id\d|Demo/), 'the log has counts only');
  // an older sync script answers 'input': nothing done, no error
  const old = {post: async () => ({ok: false, error: 'input', v: 29}), log: t => logs.push(t)};
  assert.strictEqual(await sheetRun(old, 'tok', {B: 0}), 'old');
  // the sheet's head counts more rows than the log read holds (rows without a player): judged again on the log, nothing stored
  const st = {answers: rows.length, av: A.AV},
    puts = [],
    short = {
      post: async b =>
        b.analysesGet ? {ok: true, answers: 2000, stored: st} : b.readAnswers ? {ok: true, rows} : (puts.push(b), {ok: true}),
      log: t => logs.push(t)
    };
  assert.strictEqual(await sheetRun(short, 'tok', {B: 0}), 'wait');
  assert.strictEqual(puts.length, 0);
  assert.strictEqual(logs[logs.length - 1], `${rows.length} answers, newest milestone 1000: the next one at 2000.`);
});

// Pierre, 2026-11-05: the report sits on round milestones only (1000, 2000, 3000, …), never shifted by the count of the
// first stored report (1933 answers then: the next one at 2000, not 2933).
test('tools/analyses.js plan: compute when the log reaches a round thousand the stored report lacks', () => {
  const {plan} = require('../tools/analyses.js'),
    st = n => ({answers: n, av: A.AV}),
    go = (n, s, f) => plan(n, s, f).go;
  assert.deepStrictEqual(plan(1933, st(1933)), {go: false, why: 'wait', last: 1000, now: 1000, next: 2000});
  assert.strictEqual(go(1999, st(1933)), false);
  assert.deepStrictEqual(plan(2000, st(1933)), {go: true, why: 'new', last: 1000, now: 2000, next: 3000});
  assert.strictEqual(go(2999, st(2000)), false);
  assert.strictEqual(go(2999, st(2140)), false, 'stored at 2140: newest milestone 2000');
  assert.strictEqual(plan(3000, st(2140)).why, 'new');
  assert.strictEqual(plan(5200, st(3000)).why, 'new', 'several thousands at once');
  assert.strictEqual(plan(1933, {answers: 1933, av: A.AV - 1}).why, 'code', 'the analysis code changed');
  assert.strictEqual(plan(1933, st(1933), true).why, 'force');
  assert.strictEqual(plan(1933, st(1933), false, true).why, 'removed', 'an account removed since (sheet v55 stale)');
  assert.strictEqual(plan(900, st(1100), false, true).why, 'removed', 'removed below the first milestone: the old report is replaced');
  assert.strictEqual(plan(900, null, false, true).why, 'none');
  assert.strictEqual(plan(1933, null).why, 'first');
  assert.strictEqual(plan(999, null).why, 'none', 'no milestone before 1000');
  assert.strictEqual(go(999, null, true), false, 'not even forced');
  assert.strictEqual(plan(1990, st(2000)).why, 'new', 'answers deleted below the stored milestone: computed again');
  // every stored report's milestones are multiples of 1000
  [999, 1000, 1933, 2000, 2999, 3000, 12345].forEach(n =>
    assert.ok(
      A.milestones(n).every(M => M > 0 && M % A.STEP === 0),
      String(n)
    )
  );
  assert.strictEqual(A.STEP, 1000);
});

// Codex review #441: with few players (no bootstrap), an effect constant within each player must carry the players'
// spread in its interval, not shrink with their number of answers (the fixed effects' covariance marginal over the
// random effects, margV).
test('a player-level effect from 4 players is not made sure by many answers each (lmm and glmm)', () => {
  const R = A.rng(9),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    sig = x => 1 / (1 + Math.exp(-x)),
    habit = [0.1, 0.3, 0.5, 0.7],
    u = [0.8, -0.9, 1.1, -0.6]; // the players' own effects (SD about 1), unrelated to their habit
  const y = [],
    yb = [],
    X = [],
    kp = [];
  for (let i = 0; i < 8000; i++) {
    const p = i % 4;
    y.push(1 + u[p] + nrm() * 0.5);
    yb.push(R() < sig(u[p]) ? 1 : 0);
    X.push([1, habit[p] - 0.4]);
    kp.push('p' + p);
  }
  const L = A.lmm(y, X, [A.factor('player', kp)]),
    G = A.glmm(yb, X, [A.factor('player', kp)]);
  // conditional on the players' effects the SE would be about 0.01 (lmm) and 0.05 (glmm): the habit would look "clear"
  assert.ok(L.se[1] > 0.5, `lmm habit SE ${L.se[1]}`);
  assert.ok(G.se[1] > 0.5, `glmm habit SE ${G.se[1]}`);
  // a within-player effect keeps a tight interval
  const y2 = [],
    X2 = [];
  for (let i = 0; i < 8000; i++) {
    const p = i % 4,
      x = R() < 0.5 ? 1 : 0;
    y2.push(1 + u[p] + 0.3 * x + nrm() * 0.5);
    X2.push([1, x]);
  }
  const L2 = A.lmm(y2, X2, [A.factor('player', kp)]);
  assert.ok(L2.se[1] < 0.02 && Math.abs(L2.b[1] - 0.3) < 0.04, `within-player SE ${L2.se[1]}`);
});

// Codex review #441: the exam is read from |x whatever the format (a typed exam question is quiz|t|x).
test('a typed exam question counts as an exam', () => {
  const r = (m, ch) => ['p1', 1, 'A', 'A', 1, m, 'f1', 0.7, 0, 0, ch, 0, 5, 0];
  const L = A.prep([r('quiz|t|x', ''), r('quiz|x', 'A B C D'), r('quiz|t', '')]);
  assert.deepStrictEqual(
    L.map(a => [a.f, a.exam]),
    [
      ['typed', 1],
      ['exam', 1],
      ['typed', 0]
    ]
  );
});

// Codex review #441: a change to the photos' features (curation: view, quality) refits every milestone.
test('stored milestones are refitted when the photo features change', () => {
  const fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1), {days: 400, players: A.DEMO_PLAYERS.slice(0, 3).map(p => [p[0], p[1], 400, p[3]])});
  const meta = {ph: A.photoMeta(data)},
    r1 = A.report(rows, meta, null, {B: 0}),
    f = Object.keys(meta.ph)[0],
    meta2 = {ph: {...meta.ph, [f]: ['macro', 1, null, 'inat']}},
    r2 = A.report(rows, meta2, r1, {B: 0}),
    r3 = A.report(rows, meta, r1, {B: 0});
  assert.notStrictEqual(r2.R[1000], r1.R[1000], 'a photo moved: refitted');
  assert.strictEqual(r3.R[1000], r1.R[1000], 'nothing changed: reused');
});

// Codex review #441: each player's mix-ups against the pooled rates are observed / expected, not the odds ratio exp(u).
test('confusions: a player who mixes up often reads as observed / expected', () => {
  const R = A.rng(4),
    G = ['A', 'B', 'C', 'D'],
    rows = [];
  for (let i = 0; i < 4000; i++) {
    const p = 'p' + (i % 4),
      k = Math.floor(R() * 4),
      g = G[k],
      o = G[(k + 1) % 4],
      // p0 picks the wrong one 60% of the time, the others 20%
      ok = R() < (p === 'p0' ? 0.4 : 0.8);
    rows.push([p, i * 1000, g, ok ? g : o, ok ? 1 : 0, 'quiz|d|k2', 'f' + (i % 50), 0.7, 0, 0, `${g} ${o}`, 0, 5, 0]);
  }
  const c = A.confusions(A.prep(rows), 0, 1),
    p0 = c.player.find(x => x.k === 'p0');
  assert.ok(Math.abs(p0.oe - p0.mix / p0.exp) < 1e-9, 'observed / expected');
  assert.ok(p0.oe < 2.5 && p0.or > p0.oe, `obs/exp ${p0.oe.toFixed(2)}, odds ratio ${p0.or.toFixed(2)}`);
  assert.ok(p0.lo < p0.oe && p0.oe < p0.hi);
});

// Codex review #441 (second pass): a renamed player has a new anonymous id: the milestones holding the old one are refitted.
test('a milestone is refitted when a player’s id changes', () => {
  const rows = A.demoLog(
      JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data.json'))),
      Date.UTC(2026, 10, 1),
      {
        days: 400,
        players: A.DEMO_PLAYERS.slice(0, 3).map(p => [p[0], p[1], 400, p[3]])
      }
    ),
    meta = {ph: {}},
    r1 = A.report(rows, meta, null, {B: 0}),
    renamed = rows.map(r => (r[0] === A.DEMO_PLAYERS[0][0] ? ['renamed', ...r.slice(1)] : r)),
    r2 = A.report(renamed, meta, r1, {B: 0});
  assert.notStrictEqual(r2.R[1000], r1.R[1000]);
  assert.strictEqual(A.report(rows, meta, r1, {B: 0}).R[1000], r1.R[1000]);
});

// Codex review #441: the comeback calibration's bootstrap draws the same questions as its estimate (all the comeback
// questions, after a right or a wrong answer), not only the slope's sample.
test('comeback calibration: estimate and interval over the same questions', () => {
  const rows = [],
    D2 = 2 * 864e5;
  for (let p = 0; p < 6; p++)
    for (let c = 0; c < 15; c++) {
      const t0 = (p * 100 + c) * 4 * D2,
        r = (k, m, ok, E) => ['p' + p, t0 + k * D2, 'A', ok ? 'A' : 'B', ok, m, 'f1', E, 0, 0, 'A B C D', 0, 5, 0];
      // a comeback question after a right answer, 1 for 0.5 expected; one after a wrong answer, 0 for 0.5 expected
      rows.push(r(0, 'quiz', 1, 0.8), r(1, 'quiz|c', 1, 0.5), r(2, 'quiz', 0, 0.8), r(3, 'quiz|c', 0, 0.5));
    }
  const b = A.comeback(A.prep(rows), 40, 3),
    e = b.effects.find(x => x.k === 'calib');
  assert.ok(Math.abs(e.est) < 1e-9, String(e.est));
  assert.ok(e.hi < 0.3, `interval [${e.lo}, ${e.hi}]`);
});

// Codex review #441: a start already above 80% reaches it at 0 answers, whatever the slope.
test('answers to mastery: 0 when the start is already there', () => {
  assert.strictEqual(A.toMaster(1.747, -0.116, 0), 0);
  assert.strictEqual(A.toMaster(-1, -0.1, 0), 999);
  assert.ok(A.toMaster(-1, 0.5, 0) > 0 && A.toMaster(-1, 0.5, 0) < 999);
});

// Codex review #441: Sessions on a very long log (no Math.max over a spread of every answer).
test('sessions: 200,000 answers do not overflow the stack', () => {
  const A2 = [];
  for (let i = 0; i < 200000; i++)
    A2.push({
      p: 'p' + (i % 7),
      t: i * 60e3,
      y: i % 3 ? 1 : 0,
      x: 0.5,
      s: 5,
      pos: 1 + (i % 30),
      streak: 0,
      sess: 'p' + (i % 7) + '#' + Math.floor(i / 210)
    });
  const r = A.sessRows(A2);
  assert.ok(r.rows.length > 190000 && r.lens.length > 0);
  assert.ok(A.km(r.lens).length > 1);
});

// Codex review #441: the answers to mastery carry the intercept's uncertainty too (joint with the slope): an intercept
// above the target but uncertain, with a flat slope, is not "0 [0, 0]".
test('answers to mastery: the interval comes from the intercept and the slope together', () => {
  const [lo, hi] = A.masterCI(1.667, -0.05, [
    [0.785 ** 2, 0],
    [0, 0.01]
  ]);
  assert.strictEqual(lo, 0);
  assert.strictEqual(hi, 999, 'part of the intercept’s range is below the target with no learning: not reached');
  const [lo2, hi2] = A.masterCI(-0.5, 0.6, [
    [0.01, 0],
    [0, 0.001]
  ]);
  assert.ok(lo2 > 0 && hi2 < 999 && lo2 < A.toMaster(-0.5, 0.6, 0) && A.toMaster(-0.5, 0.6, 0) < hi2, `${lo2} ${hi2}`);
});

// Codex review #441: compaction always ends under the cap, however many milestones (older ones thinned, then only the
// latest), and keeps the latest whole.
test('compact: under the cap with 300 milestones', () => {
  const eff = Array.from({length: 60}, (_, i) => ({
    k: 'e' + i,
    label: 'Effect number ' + i,
    est: 0.1,
    lo: -0.1,
    hi: 0.3,
    v: 'thin',
    need: 2000
  }));
  const one = M => ({
    M,
    n: M,
    at: M,
    fp: 'x',
    A: Object.fromEntries(
      ['rt', 'zoom', 'photo', 'fmt', 'conf', 'learn', 'back', 'sess'].map(k => [k, {n: M, effects: eff, table: 'x'.repeat(2000)}])
    )
  });
  const rep = {AV: 1, M: Array.from({length: 300}, (_, i) => (i + 1) * 1000)};
  rep.R = Object.fromEntries(rep.M.map(M => [M, one(M)]));
  const max = 2400000,
    c = A.compact(rep, max);
  assert.ok(JSON.stringify(c).length <= max, String(JSON.stringify(c).length));
  assert.strictEqual(c.M[c.M.length - 1], 300000);
  assert.ok(c.R[300000].A.rt.table, 'the latest keeps its tables');
  assert.ok(
    c.M.every(M => c.R[M]),
    'every milestone listed is there'
  );
});

// Test-suite review, 2026-11-04: compact() keeps a running size instead of measuring the whole report at every step. Same
// result as the measuring version (kept here as the reference) at every cap, from "fits as it is" through each of its
// three steps down to "not even the latest fits"; the labels carry non-ASCII text (the size is in UTF-16 units, as before).
test('compact: the running size gives the same report as measuring it at every step', () => {
  const sizes = new Set(), // every size the reference compares with its cap: the caps at, just under and just over them
    reference = (rep, max) => {
      const J = () => {
        const n = JSON.stringify(rep).length;
        sizes.add(n);
        return n;
      };
      for (const M of rep.M.slice(0, -1)) {
        if (J() <= max) break;
        const r = rep.R[M];
        Object.keys(r.A).forEach(k => {
          const a = r.A[k];
          r.A[k] = {n: a.n, players: a.players, thin: a.thin, err: a.err, typ: a.typ, effects: a.effects, lean: 1};
          if (Array.isArray(a.table) && k === 'fmt') r.A[k].table = a.table.map(t => ({k: t.k, n: t.n, E: t.E, g0: t.g0}));
        });
      }
      while (J() > max && rep.M.length > 6) {
        const keep = new Set([rep.M[0], ...rep.M.slice(-5)]),
          old = rep.M.filter(M => !keep.has(M));
        old.filter((_, i) => i % 2 === 0).forEach(M => delete rep.R[M]);
        rep.M = rep.M.filter(M => rep.R[M]);
        rep.thinned = (rep.thinned || 0) + 1;
      }
      if (J() > max) {
        const last = rep.M[rep.M.length - 1];
        rep.M.slice(0, -1).forEach(M => delete rep.R[M]);
        rep.M = [last];
      }
      return rep;
    };
  const make = n => {
    const rep = {AV: 3, made: 1762300000000, answers: n * 1000, M: Array.from({length: n}, (_, i) => (i + 1) * 1000)};
    rep.R = Object.fromEntries(
      rep.M.map((M, j) => [
        M,
        {
          M,
          n: M,
          fp: 'fp' + j,
          A: Object.fromEntries(
            ['rt', 'zoom', 'photo', 'conf'].map((k, i) => [
              k,
              {
                n: M,
                players: 4,
                thin: j % 3 === 0,
                effects: [{k: 'e' + i, label: 'Effet « mémoire » ' + j, est: 0.1 * i, lo: -0.1, hi: 0.3}],
                table: 'x'.repeat(200 + ((j * 37 + i * 11) % 300)),
                genus: {Acropora: [j, i]}
              }
            ])
          )
        }
      ])
    );
    return rep;
  };
  for (const n of [1, 5, 6, 7, 30]) {
    sizes.clear();
    const full = JSON.stringify(make(n)).length;
    for (let c = 0; c <= full + 10; c += Math.max(1, Math.round(full / 50))) reference(make(n), c);
    const caps = new Set([0, full + 10]);
    sizes.forEach(z => [z - 1, z, z + 1].forEach(c => caps.add(c)));
    for (const max of caps)
      assert.strictEqual(JSON.stringify(A.compact(make(n), max)), JSON.stringify(reference(make(n), max)), `n ${n}, max ${max}`);
  }
});

// Codex review #441: a wrong answer A -> B is a miss for B too (quiz.js counts it against both genera), so B's next
// answer is "after a miss", and the Again on the pair counts for it.
test('a mix-up is a miss for the genus given too', () => {
  const r = (t, g, a, ok, m, ch) => ['p1', t, g, a, ok, m, 'f1', 0.7, 0, 0, ch, 0, 5, 0];
  const L = A.prep([r(1, 'A', 'B', 0, 'quiz', 'A B C D'), r(2, 'A', 'A', 1, 'quiz|k2', 'A B'), r(3, 'B', 'B', 1, 'quiz', 'A B C D')]);
  assert.deepStrictEqual([L[2].afterMiss, L[2].afterAgain], [1, 1]);
});

// Codex review #441: the photos' views are the ones the games use (core.js applyCuration + applySlots): a genus on 2
// zoom levels has no Close-up view in the games. Found in the real files, no genus named here.
test('photo views follow the game pipeline (2 zoom levels)', () => {
  const fs = require('fs'),
    path = require('path'),
    rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f))),
    data = rd('data.json'),
    cur = rd('curation.json'),
    C = require('../core.js'),
    meta = A.photoMeta(data, cur, rd('quality.json'), rd('metrics.json'));
  const d = JSON.parse(JSON.stringify(data));
  C.applyCuration(d, cur);
  const two = Object.keys(d.gen).filter(g => d.gen[g].levels === 2);
  assert.ok(two.length, 'some genus on 2 zoom levels');
  two.forEach(g => {
    const fs2 = [...Object.values(data.gen[g].views || {}).flat(), ...((data.course || {})[g] || [])].map(p => p.f).filter(f => meta[f]);
    assert.ok(!fs2.some(f => meta[f][0] === 'medium'), `${g}: no Close-up view in the games`);
  });
});

// The plain reading (plainOf, Pierre 2026-11-04: "a non-statistician must understand it at a glance"): every effect has
// a name in words, its direction says which way the chance of a right answer (or the time, the stops, the mix-ups) goes,
// and its colour (tone) says whether that helps or hurts.
test('plainOf: names in words, directions and tones', () => {
  const P = (key, e, a, o) => A.plainOf(key, {v: 'clear', ...e}, a, o);
  // more likely to stop after a wrong answer: odds up on "stop" = hurts
  let r = P('sess', {k: 'wrong', est: 1.2, lo: 0.6, hi: 1.8}, {typ: {p: 0.02}});
  assert.match(r.text, /^More likely to stop/);
  assert.strictEqual(r.tone, 'bad');
  assert.ok(r.val > r.base && r.lo > r.base, 'the range is above the typical chance');
  // a difficulty (+ = harder) on the photos reads as more likely WRONG, with the chance of a right answer
  r = P('photo', {k: 'poor', est: 0.7, lo: 0.3, hi: 1.1}, {typ: {p: 0.8, g: 0.25}});
  assert.match(r.text, /^More likely wrong: about \d+% right instead of 80%/);
  assert.strictEqual(r.tone, 'bad');
  assert.ok(r.advice, 'a clear result says what it suggests');
  // a negative difficulty = easier = helps
  r = P('photo', {k: 'sharp', est: -0.4, lo: -0.7, hi: -0.1}, {typ: {p: 0.8, g: 0.25}});
  assert.match(r.text, /^More likely right/);
  assert.strictEqual(r.tone, 'good');
  // log-odds of a right answer: + = more likely right
  r = P('zoom', {k: 'rel', est: -0.9, lo: -1.5, hi: -0.3}, {typ: {p: 0.78, g: 0.2}});
  assert.match(r.text, /^More likely wrong/);
  // mix-ups: + = mixed up more often = hurts
  r = P('conf', {k: 'macro', est: 0.5, lo: 0.2, hi: 0.8}, {typ: {p: 0.06}});
  assert.match(r.text, /^Mixed up more often/);
  assert.strictEqual(r.tone, 'bad');
  // time: + = slower, neither good nor bad
  r = P('rt', {k: 'enl', est: 0.93, lo: 0.6, hi: 1.2}, {typ: {s: 6}});
  assert.match(r.text, /^Slower: about 15 s instead of 6.0 s/);
  assert.strictEqual(r.tone, 'info');
  assert.strictEqual(r.scale, 's');
  // the app's own calibration: neither good nor bad, in points
  r = P('back', {k: 'calib', est: 0.15, lo: 0.05, hi: 0.25}, {});
  assert.match(r.text, /^Players do better than the app expects: \+15 points/);
  assert.strictEqual(r.tone, 'info');
  // no clear effect and not enough data say so, with no advice
  r = A.plainOf('photo', {k: 'poor', est: 0.05, lo: -0.1, hi: 0.2, v: 'margin'}, {typ: {p: 0.8, g: 0.25}});
  assert.match(r.text, /^No clear effect/);
  assert.strictEqual(r.tone, 'none');
  assert.strictEqual(r.advice, '');
  r = A.plainOf('photo', {k: 'poor', est: 0.4, lo: -0.5, hi: 1.3, v: 'thin'}, {typ: {p: 0.8, g: 0.25}});
  assert.match(r.text, /^Too early to tell/);
  assert.strictEqual(r.tone, 'thin');
  // a spread in words
  r = A.plainOf('photo', {k: 'sd_genus', est: 0.6, lo: 0.3, hi: 0.9, v: 'clear', sd: true}, {typ: {p: 0.8, g: 0.25}});
  assert.match(r.text, /^They differ: a typical genus gets between \d+% and \d+% right/);
  // a format reads against its own expected chance
  r = A.plainOf('fmt', {k: 'd_k4', est: 0.5, lo: 0.2, hi: 0.8, v: 'clear'}, {}, {row: {n: 100, E: 0.7, g0: 0.25}});
  assert.match(r.text, /^Harder than the app expects: about \d+% recognised beyond guessing where it expects 60%/); // E 70%, floor 25%
});

test('plainOf: every effect of every analysis has a plain name, no code or model term', () => {
  const rows = A.demoLog(require('../data.json'), Date.now() - 3 * 864e5, {
    cur: require('../curation.json'),
    qual: require('../quality.json'),
    met: require('../metrics.json')
  });
  const meta = A.photoMeta(require('../data.json'), require('../curation.json'), require('../quality.json'), require('../metrics.json'));
  const R = A.runAll(rows, meta, {B: 4, seed: 1});
  let n = 0;
  Object.entries(R.A).forEach(([k, a]) =>
    (a.effects || []).forEach(e => {
      const row = k === 'fmt' ? (a.table || []).find(r => e.k.replace(/^(g|d|oe)_/, '') === r.k) : null,
        p = A.plainOf(k, e, a, {row});
      n++;
      assert.ok(A.PLAIN[k] && A.PLAIN[k][e.k], `${k}:${e.k} has a plain entry`);
      assert.doesNotMatch(p.name + ' ' + p.text, /logit|\bSD\b|log position|\(log\)|odds/i, `${k}:${e.k}: ${p.name} / ${p.text}`);
      assert.ok(p.text.length > 10, `${k}:${e.k} says something`);
      assert.ok(['good', 'bad', 'info', 'none', 'thin'].includes(p.tone), `${k}:${e.k} tone ${p.tone}`);
      if (a.typ) assert.ok(isFinite(a.typ.p), `${k} carries its typical values`);
    })
  );
  assert.ok(n > 40, `${n} effects read`);
});

// Sessions in figures (sessDesc, the study of 2026-11-04): sessions cut at 30 minutes, how they end, the start against
// the end of the session before, players coming back (one last seen within a day is not counted yet).
test('sessDesc: sessions, ends, breaks and returns from a small log', () => {
  const H = 36e5,
    t0 = Date.UTC(2026, 10, 2, 0, 0), // 08:00 Manila
    rows = [],
    add = (p, t, y) =>
      rows.push([
        p,
        t,
        'Porites',
        y ? 'Porites' : 'Favites',
        y ? 1 : 0,
        'quiz',
        'f',
        0.7,
        0,
        0,
        'Porites Favites Pavona Fungia',
        null,
        5,
        0
      ]);
  // A: 3 sessions, each 12 answers a minute apart, the first two end on a miss; 10 h then 20 h breaks
  [0, 10, 30].forEach((h, si) => {
    for (let i = 0; i < 12; i++) add('A', t0 + h * H + i * 6e4, si < 2 && i === 11 ? 0 : 1);
  });
  // B: one session, long ago, never back
  for (let i = 0; i < 8; i++) add('B', t0 - 48 * H + i * 6e4, 1);
  const A1 = A.prep(
      rows.sort((a, b) => a[1] - b[1]),
      {}
    ),
    d = A.sessDesc(A1, 20, 1);
  assert.strictEqual(d.sessions, 4);
  assert.strictEqual(d.players, 2);
  assert.strictEqual(d.hours[8], 2, 'two sessions start at 08:00 Manila');
  assert.strictEqual(d.ends.sessions, 3, 'the last session is still going (log end)');
  assert.strictEqual(d.ends.miss, 2);
  // returns: after the 1st session, A came back and B did not; A's 2nd and 3rd sessions ended less than a day before
  // the log ends: not counted either way
  assert.deepStrictEqual(
    d.returns.map(r => [r.at, r.back]),
    [
      [2, 1],
      [0, 0],
      [0, 0]
    ]
  );
  const g = Object.fromEntries(d.gaps.map(x => [x.label, x.n]));
  assert.strictEqual(g['3 – 12 h'], 1);
  assert.strictEqual(g['12 – 36 h'], 1);
  assert.strictEqual(d.table[0].p, 'A', 'newest first');
  assert.strictEqual(d.table[0].k, 3);
  assert.strictEqual(d.table[0].tail, '111');
});

// Codex review #495: a compacted milestone keeps each format's own expected chance and guess rate, so its plain
// reading does not change when the Formats table is dropped.
test('compact keeps the formats’ baselines: the plain reading of a lean milestone is unchanged', () => {
  const fmt = () => ({
    n: 200,
    players: 3,
    effects: [{k: 'd_duel', est: 1, lo: 0.5, hi: 1.5, v: 'clear', unit: 'logit'}],
    table: [{k: 'duel', label: 'Duel tab', n: 200, right: 0.8, E: 0.9, g0: 0.5, fit: {c: 0.5, d: -1}, pad: 'x'.repeat(4000)}]
  });
  const rep = {AV: 1, made: 0, answers: 2000, M: [1000, 2000], R: {1000: {n: 1000, A: {fmt: fmt()}}, 2000: {n: 2000, A: {fmt: fmt()}}}};
  const full = rep.R[1000].A.fmt,
    rowOf = a => (a.table || []).find(r => r.k === 'duel'),
    before = A.plainOf('fmt', full.effects[0], full, {row: rowOf(full)}).text;
  A.compact(rep, JSON.stringify(rep).length - 3000);
  const lean = rep.R[1000].A.fmt;
  assert.ok(lean.lean, 'the first milestone was compacted');
  assert.strictEqual(A.plainOf('fmt', lean.effects[0], lean, {row: rowOf(lean)}).text, before);
});

// Codex review #495: a pair's model effect is a change in the odds; "times as often" is the ratio of the chances at the
// typical mix-up rate (doubling the odds at 30% is 1.54 times as often, not twice).
test('freqRatio: an odds ratio read as how many times as often, at a given base rate', () => {
  near(A.freqRatio(0.3, Math.log(2)), 1.54, 0.01, 'odds ×2 at 30%');
  near(A.freqRatio(0.01, Math.log(2)), 1.98, 0.01, 'odds ×2 at 1%: about twice');
  near(A.freqRatio(0.3, 0), 1, 1e-9, 'no effect');
});

// Codex review #495: the answers to mastery solve for 80% recognised beyond guessing (MASTER on sig(eta)), not 80%
// raw right answers: every label says "beyond guessing".
test('the answers-to-mastery label says beyond guessing', () => {
  assert.match(A.PLAIN.learn.n_all.name, /beyond guessing/);
});

// Codex review #495 (2nd pass): typed answers have no guess floor, so the typed-versus-choices contrast moves from the
// choices' floor to none (80% right with 4 choices, +0.2 beyond guessing → about 77% right typed, not 83%).
test('plainOf: typed answers are read without the guess floor', () => {
  const r = A.plainOf('learn', {k: 'typed', est: 0.2, lo: 0.1, hi: 0.3, v: 'clear'}, {typ: {p: 0.8, g: 0.25}});
  near(r.val, 0.77, 0.01, 'typed at +0.2');
  assert.match(r.text, /^More likely wrong: about 77% right instead of 80%/);
});

// Codex review #495 (2nd pass): the difficulty contrast is on recognition beyond guessing; the Again effect is measured
// on the next ordinary question after a miss, with an Again in between.
test('plainOf: the difficulty and Again labels say what the model measures', () => {
  for (const k of ['rt', 'sess']) assert.match(A.PLAIN[k].diff.name, /beyond guessing/);
  assert.match(A.PLAIN.learn.again.name, /next ordinary question after a miss/i);
});

// Codex review #495 (3rd pass): the typed contrast's verdict is judged on the accuracy shown (a clear change in
// recognition whose range of right answers still includes the baseline is not a clear change in right answers); an
// effect with too few answers to estimate says so, not "no such answers".
test('plainOf: typed verdict on the accuracy shown; no estimate yet reads as not enough data', () => {
  const r = A.plainOf('learn', {k: 'typed', est: 0.5, lo: 0.1, hi: 0.9, v: 'clear'}, {typ: {p: 0.8, g: 0.25}});
  assert.ok(r.lo < 0.8 && r.hi > 0.8, 'the range of right answers includes 80%');
  assert.notStrictEqual(r.v, 'clear');
  assert.notStrictEqual(r.tone, 'good');
  const c = A.plainOf('back', {k: 'calib', v: 'thin', n: 1, need: null}, {});
  assert.match(c.text, /^Not enough data yet/);
  assert.strictEqual(c.tone, 'thin');
});

// Codex review #495 (4th pass): a format's difficulty is fitted with its own guess rate, so it is read as recognition
// beyond guessing (the app's expectation without its guess floor), never as raw right answers on the app's floor; the
// raw comparison is the format's "right answers against the app's expectation".
test('plainOf: a format difficulty reads as recognition beyond guessing', () => {
  const row = {k: 'k4', n: 500, E: 0.75, g0: 0.25, fit: {c: 0.5, d: -0.195}};
  const r = A.plainOf('fmt', {k: 'd_k4', est: 0.195, lo: 0.1, hi: 0.3, v: 'clear'}, {}, {row});
  near(r.base, 2 / 3, 0.001, 'the app expects 2/3 recognised beyond its 25% floor');
  near(r.val, 1 / (1 + Math.exp(-(Math.log(2) - 0.195))), 0.001, 'shifted on recognition, no floor');
  assert.match(r.text, /recognised beyond guessing/);
  assert.match(A.PLAIN.fmt.d_k4.name, /beyond guessing/);
});

// Codex review #495 (5th pass): a chart of format difficulties is drawn on recognition beyond guessing, so it has its
// own outcome heading, not "Chance of a right answer".
test('outOf: format difficulties chart on their own beyond-guessing outcome', () => {
  assert.strictEqual(A.outOf(A.PLAIN.fmt.d_k4), 'beyond');
  assert.strictEqual(A.outOf(A.PLAIN.fmt.oe_k4), 'pts');
  assert.strictEqual(A.outOf(undefined), 'right');
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8');
  assert.match(src, /beyond: '[^']*beyond guessing[^']*'/);
  assert.ok(!/S\.o\b/.test(src), 'charts group by ANALYSIS.outOf, not the raw outcome');
});

// Codex review #500: "ended on 2+ misses" counts misses within the session only; the return rate uses the same
// observation window for those who came back and those who did not (a session ended under a day ago counts for neither).
test('sessDesc: misses in a row stay within a session; returns use one observation window', () => {
  const H = 36e5,
    t0 = Date.UTC(2026, 10, 2, 0, 0),
    rows = [],
    add = (p, t, y) =>
      rows.push([
        p,
        t,
        'Porites',
        y ? 'Porites' : 'Favites',
        y ? 1 : 0,
        'quiz',
        'f',
        0.7,
        0,
        0,
        'Porites Favites Pavona Fungia',
        null,
        5,
        0
      ]);
  // C: two one-answer sessions two hours apart, both wrong, long ago
  add('C', t0 - 72 * H, 0);
  add('C', t0 - 70 * H, 0);
  // ten players start together an hour before the end; one comes back 30+ minutes later
  for (let i = 0; i < 10; i++) add('N' + i, t0, 1);
  add('N0', t0 + 0.6 * H, 1);
  const d = A.sessDesc(
    A.prep(
      rows.sort((a, b) => a[1] - b[1]),
      {}
    ),
    10,
    1
  );
  assert.strictEqual(d.ends.miss2, 0, 'no session holds two misses');
  const r1 = d.returns.find(r => r.k === 1);
  assert.deepStrictEqual([r1.at, r1.back], [1, 1], 'only C’s first session is a day old: C came back');
});

/* ---------- Multiple testing (Pierre, 2026-11-05, Q69): primary effects under Holm, the others under Benjamini-Hochberg ---------- */
test('holm and bh give the textbook adjusted p-values (R p.adjust)', () => {
  const P = [0.01, 0.04, 0.03, 0.005];
  assert.deepStrictEqual(
    A.holm(P).map(v => +v.toFixed(6)),
    [0.03, 0.06, 0.06, 0.02]
  );
  assert.deepStrictEqual(
    A.bh(P).map(v => +v.toFixed(6)),
    [0.02, 0.04, 0.04, 0.02]
  );
  assert.deepStrictEqual(A.holm([0.5, 0.9]), [1, 1], 'capped at 1');
  near(2 * A.ntail(1.959964), 0.05, 1e-7, 'normal tail');
  near(A.ntail(6), 9.865876e-10, 1e-15, 'far tail');
  near(A.nq(0.975), 1.959964, 1e-6, 'normal quantile');
  near(A.nq(1e-6), -4.753424, 1e-5, 'far quantile');
});

test('pOf: p < 0.05 exactly when the 95% interval leaves the null value out', () => {
  const e = (est, lo, hi, more) => ({est, lo, hi, sesoi: 0.25, n: 1000, unit: 'logit', ...more});
  assert.ok(A.pOf(e(0.3, 0.01, 0.6)) < 0.05);
  assert.ok(A.pOf(e(0.3, -0.01, 0.6)) > 0.05);
  assert.ok(A.pOf(e(-0.3, -0.7, -0.02)) < 0.05, 'the side facing the null, for an uneven interval');
  assert.ok(A.pOf(e(0.4, 0.3, 0.6, {nul: 0.5})) > 0.05 && A.pOf(e(0.4, 0.3, 0.48, {nul: 0.5})) < 0.05, 'a reference value');
  assert.ok(A.pOf(e(0.2, 0.03, 0.4, {sd: true, lu: 0.03})) < 0.05, 'an SD: its lower bound above a tenth of the sesoi');
  assert.ok(A.pOf(e(0.2, 0, 0.4, {sd: true, lu: -0.1})) > 0.05);
  assert.strictEqual(A.pOf({k: 'n_all', est: 12, lo: 8, hi: 20, unit: 'n'}), null, 'a number of answers is not a test');
  assert.strictEqual(A.pOf({k: 'card', v: 'nolog'}), null);
});

// A milestone of null effects (est ~ N(0, se), 95% interval est ± 1.96 se), on the analyses' own keys, so the primary ones
// are those analysis.js declares; one strong effect (6 se) in each family.
function fakeMilestone(R, strong) {
  const A2 = {},
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
  Object.keys(A.PRIMARY).forEach(k => {
    const keys = [...A.PRIMARY[k], 'x1', 'x2', 'x3'];
    A2[k] = {
      effects: keys.map(key => {
        const se = 0.1,
          est = (strong && strong[k + ':' + key]) || nrm() * se;
        return {k: key, est, lo: est - 1.96 * se, hi: est + 1.96 * se, sesoi: 0.25, n: 2000, unit: 'logit', v: 'thin'};
      })
    };
  });
  return {n: 2000, A: A2};
}
test('a null milestone of many effects: few clears after the correction, a strong effect stays clear', () => {
  const R = A.rng(20261105),
    reps = 400,
    strong = {'learn:slope': 0.6, 'rt:x1': 0.6};
  let raw = 0,
    after = 0,
    anyPrimary = 0,
    anyFalse = 0,
    strongKept = 0,
    m = 0;
  for (let r = 0; r < reps; r++) {
    const res = A.correct(fakeMilestone(R, r % 2 ? strong : null)),
      E = Object.entries(res.A).flatMap(([k, a]) => a.effects.map(e => ({k: k + ':' + e.k, e})));
    m = E.length;
    const nul = E.filter(x => !(r % 2 && strong[x.k]));
    raw += nul.filter(x => x.e.p < 0.05).length;
    after += nul.filter(x => x.e.v === 'clear').length;
    if (nul.some(x => x.e.fam === 1 && x.e.v === 'clear')) anyPrimary++;
    if (nul.some(x => x.e.v === 'clear')) anyFalse++;
    if (r % 2) strongKept += E.filter(x => strong[x.k] && x.e.v === 'clear').length;
    const m1 = Object.values(A.PRIMARY).flat().length;
    assert.ok(res.mt.m1 === m1 && res.mt.m2 === m - m1 && m1 >= 10 && m1 <= 15, JSON.stringify(res.mt));
  }
  const per = n => n / reps;
  // printed for the PR: clears per milestone of null effects, before and after
  console.log(
    `null milestone of ${m} effects, ${reps} times: ${per(raw).toFixed(2)} clear at 95% before, ${per(after).toFixed(3)} after; a false clear among the primary effects in ${anyPrimary}, anywhere in ${anyFalse}`
  );
  assert.ok(per(raw) > 1.6 && per(raw) < 2.4, `about 5% of ${m} null effects clear at 95%: ${per(raw)}`);
  assert.ok(per(after) < 0.2, `after the correction: ${per(after)}`);
  assert.ok(anyPrimary / reps <= 0.07, `primary family: a false clear in ${anyPrimary} of ${reps} milestones (Holm: 5%)`);
  assert.ok(anyFalse / reps <= 0.15, `any false clear in ${anyFalse} of ${reps} milestones`);
  assert.strictEqual(strongKept, reps, 'both strong effects (one primary, one exploratory) stay clear in every milestone');
});

test('a correction never turns a 95% non-clear into clear, and a thin effect needs more answers than it has', () => {
  const res = A.correct(fakeMilestone(A.rng(7), {'zoom:x1': 0.35, 'back:slope': 0.25}));
  Object.values(res.A).forEach(a =>
    a.effects.forEach(e => {
      assert.ok(e.pa >= e.p, e.k);
      if (e.v === 'clear') assert.ok(e.lo > 0 || e.hi < 0, e.k);
      if (e.v === 'clear') assert.ok(e.alo > 0 || e.ahi < 0, 'its adjusted interval leaves 0 out too');
      if (e.v !== 'clear') assert.ok(e.alo <= 0 && e.ahi >= 0, e.k);
    })
  );
  const z = res.A.zoom.effects.find(e => e.k === 'x1');
  assert.ok(z.p < 0.05 && z.fam === 2, 'clear at 95% (3.5 se)');
  if (z.v === 'thin') assert.ok(z.need > z.n, `${z.need} answers for ${z.n}: it needs more than it has`);
});

// The generator with its effects switched off (TRUTH patched for the duration of fn, then put back).
function withTruth(patch, fn) {
  const save = JSON.parse(JSON.stringify(A.TRUTH));
  const put = (o, p) =>
    Object.entries(p).forEach(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? put(o[k], v) : (o[k] = v)));
  put(A.TRUTH, patch);
  try {
    return fn();
  } finally {
    put(A.TRUTH, save);
  }
}
function synthMeta() {
  const V = ['wide', 'medium', 'macro'],
    S = ['imr', 'own', 'inat'],
    photos = {},
    meta = {ph: {}},
    look = {};
  for (let g = 0; g < 16; g++) {
    const G = 'Gen' + g;
    photos[G] = [];
    look[G] = ['Gen' + ((g + 1) % 16), 'Gen' + ((g + 3) % 16)];
    for (let k = 0; k < 12; k++) {
      const p = {
        f: `g${g}-${k}`,
        v: V[k % 3],
        q: [3, 2, 1][Math.floor(k / 3) % 3],
        sh: 20 + ((k * 37 + g * 11) % 200),
        src: S[(k + g) % 3],
        o: `o${g}-${Math.floor(k / 3)}`
      };
      photos[G].push(p);
      meta.ph[p.f] = [p.v, p.q, p.sh, p.src];
    }
  }
  return {photos, meta, look};
}
test('a synthetic log with no effect but two: the correction keeps the two, and the null ones are rarely clear', () => {
  const NULL = {
    rt: {right: 0, typed: 0.4, enl: 0, two: 0, sdPlayer: 0, sdGenus: 0, sdPhoto: 0},
    ph: {medium: 0, macro: 0, fair: 0, poor: 0, sharp: 0, own: 0, inat: 0, alone: 0, sdPhoto: 0},
    learn: {afterMiss: 0, again: 0},
    fmt: {k2: [0.5, 0], typed: [0, 0], again: [0.5, 0]},
    zoom: 0,
    back: 0,
    sess: {wrong: 0, streak: 0}
  };
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 12}, (_, i) => ['P' + i, 0, 450, 0.1]);
  const r = withTruth(NULL, () => A.runAll(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 5}), meta, {B: 0}));
  const E = Object.entries(r.A).flatMap(([k, a]) => (a.effects || []).filter(e => e.fam).map(e => ({k: k + ':' + e.k, e})));
  // the learning slope (practice works) and typed answers taking longer stay in the generator: both must stay clear; the
  // generator's genera differ in difficulty (photo: SD genus), so pairs of genera differ in mix-ups (SD pair): not null
  // The spreads (SD) are left out of the count: an SD's estimate never reaches 0, so a spread that is really 0 reads clear
  // with or without a correction (pOf); that is a limit of the SD's interval, not of the correction.
  // Typed answers in Learning curves are tested as right answers against the choice questions' (correct): with no guess
  // floor they are truly right less often, so that effect is not null either.
  const kept = ['learn:slope', 'rt:typed'],
    nul = E.filter(x => !kept.includes(x.k) && x.k !== 'learn:typed' && !x.e.sd),
    before = nul.filter(x => x.e.p < 0.05).map(x => x.k),
    after = nul.filter(x => x.e.v === 'clear').map(x => x.k);
  console.log(
    `null synthetic log, ${nul.length} null effects tested: ${before.length} clear at 95% before (${before.join(', ')}), ${after.length} after (${after.join(', ')})`
  );
  kept.forEach(k => assert.strictEqual(E.find(x => x.k === k).e.v, 'clear', k));
  assert.ok(after.length <= 1 && after.length <= before.length, `${after.length} null effects clear after the correction`);
  assert.ok(!nul.some(x => x.e.fam === 1 && x.e.v === 'clear'), 'no null primary effect is clear');
});

test('report: 999 draws by default for the latest milestone, fewer for the history, none beyond the cap', () => {
  assert.strictEqual(A.BOOT, 999);
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 6}, (_, i) => ['P' + i, 0.3 * i - 0.8, 520, 0.1]),
    rows = A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 3});
  assert.ok(rows.length >= 3000, String(rows.length));
  const rep = A.report(rows.slice(0, 3000), meta, null, {B: 3, Bh: 2, hcap: 2000, seed: 1});
  assert.deepStrictEqual(
    rep.M.map(M => rep.R[M].B),
    [0, 2, 3],
    'latest 3, then 2 for the 2000 answers that fit under the cap, 0 beyond'
  );
  assert.ok(rep.R[3000].mt.m1 > 0 && rep.R[3000].mt.m2 > 0, 'every milestone is corrected');
  // Recompute here's live look at all the answers takes the latest's draws too; the round milestones keep their budget
  // (the newest round thousand is still "the latest" for the history's cap), reused from the stored report
  assert.ok(rows.length > 3000 && rows.length < 4000, String(rows.length));
  const lv = A.report(rows, meta, rep, {B: 3, Bh: 2, hcap: 2000, seed: 1, live: 1});
  assert.deepStrictEqual(lv.M, [1000, 2000, 3000, rows.length]);
  assert.deepStrictEqual(
    lv.M.map(M => lv.R[M].B),
    [0, 2, 3, 3]
  );
  assert.strictEqual(lv.R[3000], rep.R[3000], 'the newest milestone reused');
  // the same draws for the same answers (seeded)
  const again = A.report(rows.slice(0, 3000), meta, null, {B: 3, Bh: 2, hcap: 2000, seed: 1});
  assert.deepStrictEqual(again.R[3000].A.rt.effects, rep.R[3000].A.rt.effects);
  // the browser's quicker interval (normal, from the draws' spread) stays within the draws' range
  const se = A.runAll(rows.slice(0, 3000), meta, {B: 6, bse: true, seed: 1});
  assert.strictEqual(se.bse, 1);
  se.A.rt.effects.filter(e => e.boot).forEach(e => assert.ok(e.lo <= e.est && e.est <= e.hi, e.k));
});

test('the admin draws no “new since the previous milestone” count', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8');
  assert.ok(!/newly|'#New'|Clear since the previous milestone/.test(src), 'a milestone is another look at the same log, not a new finding');
  assert.ok(/B: 199, Bh: 0, bse: 1/.test(src), 'Recompute here: 199 draws, normal intervals');
  // rule A2 (Codex review #588): the method stays behind the admin "?", not on the page
  assert.ok(!/class="note">Each milestone/.test(src), 'no explanatory text on the page');
});

// Codex review #588: a bootstrap draw that leaves out every answer with a feature cannot estimate it; the warm start
// must not hand back the full fit's value as if it were a draw.
test('a warm-started draw without a feature gives no value for it (not the full fit’s)', () => {
  const R = A.rng(3),
    D = [];
  for (let p = 0; p < 6; p++)
    for (let i = 0; i < 80; i++) {
      const f = p === 0 && i % 2 ? 1 : 0;
      D.push({p: 'P' + p, f, y: R() < A.ntail(-(0.3 + 0.8 * f)) ? 1 : 0});
    }
  const fit = S =>
    A.glmm(
      S.map(a => a.y),
      S.map(a => [1, a.f]),
      [
        A.factor(
          'player',
          S.map(a => a.p)
        )
      ]
    );
  fit(D); // the full fit: the warm start of the draws
  const seen = [];
  A.boot(
    D,
    S => {
      const m = fit(S);
      seen.push([S.some(a => a.f), m.b[1]]);
      return {f: m.b[1]};
    },
    40,
    9
  );
  const without = seen.filter(x => !x[0]);
  assert.ok(without.length > 0, 'some draws leave player 0 out');
  without.forEach(x => assert.ok(!isFinite(x[1]), `a draw without the feature returned ${x[1]}`));
  assert.ok(seen.filter(x => x[0]).every(x => isFinite(x[1])));
});

// Codex review #588: an effect smaller than its sesoi, unresolved after the correction, never says fewer answers than
// it has would settle it.
test('answers needed after the correction: never fewer than the answers already in', () => {
  const res = {
    n: 1000,
    A: Object.fromEntries(
      Object.entries(A.PRIMARY).map(([k, keys]) => [
        k,
        {effects: keys.map(key => ({k: key, est: 0, lo: -0.2, hi: 0.2, sesoi: 0.25, n: 1000, unit: 'logit', v: 'margin'}))}
      ])
    )
  };
  res.A.learn.effects[0] = {k: 'slope', est: 0.15, lo: 0.0324, hi: 0.2676, sesoi: 0.25, n: 1000, unit: 'logit', v: 'clear'};
  const e = A.correct(res).A.learn.effects[0];
  assert.strictEqual(e.v, 'thin');
  assert.ok(e.need > 1000, `${e.need} answers for an effect unresolved with 1000`);
});

// Codex review #588: typed answers are read as right answers against the choice questions' (another guess floor), so
// they are tested and corrected on that contrast, not on the recognition coefficient against 0.
test('typed answers: the verdict shown is the corrected test of the contrast shown', () => {
  const se = 0.1,
    mk = (k, est) => ({k, est, lo: est - 1.96 * se, hi: est + 1.96 * se, sesoi: 0.25, n: 2000, unit: 'logit', v: 'thin'}),
    run = est => {
      const res = {
        n: 2000,
        A: {
          learn: {typ: {p: 0.75, g: 0.25, s: 6}, effects: [mk('typed', est)]},
          rt: {effects: Array.from({length: 20}, (_, i) => mk('x' + i, 1.645 * se))}
        }
      };
      A.correct(res);
      const e = res.A.learn.effects[0];
      return {e, P: A.plainOf('learn', e, res.A.learn)};
    };
  const c0 = Math.log(0.75 / 0.25) - Math.log(2); // the coefficient at which typed answers are right as often: log 1.5
  let r = run(0.15);
  assert.notStrictEqual(r.P.v, 'clear', 'p 0.1 on the contrast shown, not clear');
  near(r.e.nul, c0, 1e-6, 'tested against equal right answers');
  r = run(c0 + 0.6);
  assert.strictEqual(r.P.v, 'clear');
  assert.strictEqual(r.e.v, 'clear');
  r = run(c0);
  assert.notStrictEqual(r.P.v, 'clear', 'as many right answers: no clear effect, whatever the recognition coefficient');
});

// Codex review #588 (3rd pass): an adjusted p capped at 1 no longer gives the level the effect faces; the answers needed
// must still reach a verdict when its interval shrinks as 1/sqrt(n).
test('answers needed after the correction reach a verdict, even when the adjusted p is capped at 1', () => {
  const build = eff => ({
    n: 1000,
    A: Object.fromEntries(
      Object.entries(A.PRIMARY).map(([k, keys]) => [
        k,
        {effects: keys.map(key => ({k: key, est: 0, lo: -0.2, hi: 0.2, sesoi: 0.25, n: 1000, unit: 'logit', v: 'margin'}))}
      ])
    )
  });
  const base = {k: 'slope', est: 0.4, lo: -0.7624, hi: 1.5624, sesoi: 0.25, n: 1000, unit: 'logit', v: 'thin'};
  const r1 = build();
  r1.A.learn.effects[0] = {...base};
  const e = A.correct(r1).A.learn.effects[0];
  assert.strictEqual(e.v, 'thin');
  const f = Math.sqrt(1000 / e.need),
    r2 = build();
  r2.A.learn.effects[0] = {...base, lo: 0.4 - 1.1624 * f, hi: 0.4 + 1.1624 * f, n: e.need};
  const e2 = A.correct(r2).A.learn.effects[0];
  assert.notStrictEqual(e2.v, 'thin', `${e.need} answers: still undecided (adjusted p ${e2.pa})`);
});

// Codex review #591: Recompute here on an empty log (no milestone and, with 0 answers, no live point) gives a report with
// no point at all; the page treats it as no report ("No report yet"), never reading a milestone that is not there.
test('admin: a report without any point counts as no report', () => {
  const vm = require('vm'),
    src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8'),
    ctx = vm.createContext({ANALYSIS: A, store: {get: (k, d) => d, set() {}}, HELP: {}, addEventListener() {}});
  vm.runInContext(src, ctx);
  const empty = A.report([], {ph: {}}, null, {B: 0, live: 1});
  assert.deepStrictEqual([empty.M, empty.live], [[], undefined]);
  ctx.EMPTY = empty;
  assert.strictEqual(vm.runInContext("ANREP = {st: 'ok', rep: EMPTY}; anRep()", ctx), null, 'stored');
  assert.strictEqual(
    vm.runInContext("AN.src = 'local'; ANLOC = {rep: EMPTY}; ANREP = {st: 'none', rep: null}; anRep()", ctx),
    null,
    'this tab'
  );
  const one = {M: [1000], R: {1000: {A: {}}}, answers: 1200};
  ctx.ONE = one;
  assert.strictEqual(vm.runInContext('ANLOC = {rep: ONE}; anRep()', ctx), one);
});

/* ---------- Structure views (the multifactor visualisation study of 2026-11-05; Pierre's Q70-Q77) ---------- */
test('entOf: two entangled conditions read as hard to tell apart, an independent one does not', () => {
  const R = A.rng(5),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    y = [],
    X = [],
    kp = [];
  for (let i = 0; i < 4000; i++) {
    const a = nrm(),
      b = a + 0.25 * nrm(), // planted: b follows a closely
      c = nrm(); // independent
    X.push([1, a, b, c]);
    kp.push('p' + (i % 20));
    y.push(0.5 * a + 0.5 * b + 0.3 * c + nrm());
  }
  const M = A.lmm(y, X, [A.factor('player', kp)]),
    E = A.entOf(M.V, X, [null, 'a', 'b', 'c']);
  assert.deepStrictEqual(E.k, ['a', 'b', 'c']);
  assert.ok(E.r[1][0] < -0.9, `estimates of a and b: r = ${E.r[1][0]}`);
  assert.ok(E.x[1][0] > 0.9, `conditions a and b: r = ${E.x[1][0]}`);
  assert.ok(E.vif[0] > 5 && E.vif[1] > 5, `VIF of a and b: ${E.vif}`);
  assert.ok(E.vif[2] < 1.2 && Math.abs(E.r[2][0]) < 0.15 && Math.abs(E.x[2][1]) < 0.15, `c stays apart: ${JSON.stringify(E)}`);
  // an effect reported with the opposite sign (a difficulty) flips its correlations with the others, not its VIF
  const F = A.entOf(M.V, X, [null, 'a', 'b', 'c'], [1, -1, 1, 1]);
  assert.strictEqual(F.r[1][0], -E.r[1][0]);
  assert.strictEqual(F.x[1][0], E.x[1][0]);
  assert.deepStrictEqual(F.vif, E.vif);
  // a condition that never varies is left out; fewer than two effects: nothing to compare
  assert.deepStrictEqual(
    A.entOf(
      M.V,
      X.map(x => [x[0], x[1], 0, x[3]]),
      [null, 'a', 'b', 'c']
    ).k,
    ['a', 'c']
  );
  assert.strictEqual(A.entOf(M.V, X, [null, 'a', null, null]), null);
});

test('hclust: planted groups come back, each a block in the leaf order; cutTree splits them', () => {
  // three groups of points on a line, far apart: average linkage and Ward find them
  const pts = [0, 0.1, 0.25, 5, 5.2, 5.1, 10, 10.3, 9.9, 10.1],
    D = pts.map(a => pts.map(b => Math.abs(a - b))),
    D2 = D.map(r => r.map(v => v * v));
  for (const [T, h] of [
    [A.hclust(D), 2],
    [A.hclust(D2, 'ward'), 3]
  ]) {
    assert.strictEqual(T.m.length, pts.length - 1);
    assert.deepStrictEqual(
      [...T.order].sort((a, b) => a - b),
      pts.map((_, i) => i)
    );
    assert.ok(
      T.m.every((x, k) => !k || x[2] >= T.m[k - 1][2] - 1e-9),
      'heights never fall (monotone linkage)'
    );
    const G = A.cutTree(T, pts.length, h).map(L => L.slice().sort((a, b) => a - b));
    assert.deepStrictEqual(
      G.slice().sort((a, b) => a[0] - b[0]),
      [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8, 9]
      ]
    );
    // each group sits together in the leaf order
    G.forEach(L => {
      const at = L.map(i => T.order.indexOf(i)).sort((a, b) => a - b);
      assert.strictEqual(at[at.length - 1] - at[0], L.length - 1, 'contiguous: ' + L);
    });
  }
  assert.deepStrictEqual(A.hclust([[0]]), {m: [], order: [0]});
});

// A made-up log of 4-choice questions on 12 genera in 3 planted families: a wrong answer goes to a genus of the same family
// `w` times as often as to another genus offered (w = 1: no structure).
const mixLog = (w, seed) => {
  const R = A.rng(seed),
    G = ['A', 'B', 'C'].flatMap(f => [0, 1, 2, 3].map(i => f + i)),
    fam = g => g[0],
    rows = [];
  let t = 0;
  for (let p = 0; p < 8; p++)
    for (let i = 0; i < 700; i++) {
      const g = G[Math.floor(R() * G.length)],
        ch = [g];
      // two choices from its family when there are, one from elsewhere
      while (ch.length < 4) {
        const same = R() < 0.5,
          L = G.filter(x => !ch.includes(x) && (fam(x) === fam(g)) === same);
        ch.push(L[Math.floor(R() * L.length)]);
      }
      const right = R() < 0.7,
        wr = ch.slice(1).map(x => (fam(x) === fam(g) ? w : 1));
      let r = R() * wr.reduce((s, x) => s + x, 0);
      const ans = right ? g : ch.slice(1).find((x, k) => (r -= wr[k]) < 0) || ch[3];
      rows.push(['p' + p, (t += 60e3), g, ans, right ? 1 : 0, 'quiz', 'f' + g, 0.7, 0, 0, ch.sort(() => R() - 0.5).join(' '), 0, 5, 0]);
    }
  return rows;
};

test('mix-up map: planted families of mix-ups come back as blocks; no family from noise', () => {
  const r = A.confusions(A.prep(mixLog(6, 3)), 0, 1),
    m = r.map;
  assert.ok(m && m.g.length === 12, JSON.stringify(m && m.g));
  const F = m.fam.map(L => L.map(i => m.g[i]).sort());
  assert.deepStrictEqual(
    F.slice().sort((a, b) => a[0].localeCompare(b[0])),
    [
      ['A0', 'A1', 'A2', 'A3'],
      ['B0', 'B1', 'B2', 'B3'],
      ['C0', 'C1', 'C2', 'C3']
    ]
  );
  m.fam.forEach(L => assert.strictEqual(Math.max(...L) - Math.min(...L), L.length - 1, 'a family is a block on the diagonal'));
  // every merge points at leaves in display order or earlier merges; the cells are in display order and their rates shrunk
  m.m.forEach(([a, b], k) => [a, b].forEach(x => assert.ok(x < 12 + k, 'merge ' + k)));
  assert.ok(
    m.cells.every(([i, j, off, mix, sr]) => i !== j && off >= mix && sr > 0 && sr < 1),
    'cells: shown, answered, offers, mix-ups, rate'
  );
  const inFam = m.cells.filter(c => m.g[c[0]][0] === m.g[c[1]][0]),
    outFam = m.cells.filter(c => m.g[c[0]][0] !== m.g[c[1]][0]),
    avg = L => L.reduce((s, c) => s + c[4], 0) / L.length;
  assert.ok(avg(inFam) > 2 * avg(outFam), `rates within families ${avg(inFam)} against across ${avg(outFam)}`);
  m.across.forEach(([i, j]) => assert.notStrictEqual(m.g[i][0], m.g[j][0], 'across = between two families'));
  // the same log with wrong answers spread evenly: no pair clearly above a typical one, so no family
  const flat = A.confusions(A.prep(mixLog(1, 3)), 0, 1).map;
  assert.ok(flat && flat.fam.length === 0, JSON.stringify(flat && flat.fam));
});

test('synthetic log: each analysis reports its entangled effects on its own keys; the report carries them', () => {
  const fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1)),
    r = A.runAll(rows, {ph: A.photoMeta(data)}, {B: 0});
  for (const k of ['rt', 'zoom', 'photo', 'fmt', 'conf', 'learn', 'sess']) {
    const a = r.A[k],
      E = a.ent;
    assert.ok(E && E.k.length >= 2, k);
    const keys = new Set(a.effects.map(e => e.k));
    E.k.forEach(x => assert.ok(keys.has(x), `${k}: ${x} is one of its effects`));
    assert.strictEqual(E.r.length, E.k.length);
    E.r.forEach((row, i) => (assert.strictEqual(row.length, i), row.forEach(v => assert.ok(v == null || Math.abs(v) <= 1.0001, k))));
  }
  // Formats: a guess rate and its difficulty are estimated together (known to trade off); two formats are independent
  const f = r.A.fmt.ent;
  assert.ok(f.r[1][0] != null && f.r[2][0] === null && !f.x, JSON.stringify(f));
  // the demo plays look-alikes as mix-ups (synth TRUTH.mix): the map finds families, each pair of genera of a family
  // linked through the genus sheets' look-alikes
  const m = r.A.conf.map,
    look = g => (data.gen[g] && data.gen[g].look) || [];
  assert.ok(m.fam.length >= 3, JSON.stringify(m.fam));
  m.fam.forEach(L => {
    const N = L.map(i => m.g[i]);
    assert.ok(
      N.every(a => N.some(b => b !== a && (look(a).includes(b) || look(b).includes(a)))),
      'each genus of a family has a look-alike in it: ' + N
    );
  });
});

test('Recompute here: the Web Worker computes the new views, and a stored report of an older AV is not reused', () => {
  // analysis.js run as the admin's Worker (new Worker('analysis.js?v=N')): a global scope with postMessage, no window,
  // no module; the message handler computes a whole report
  const vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    msgs = [],
    ctx = {postMessage: m => msgs.push(m), Date, Math, JSON, Map, Set, Float64Array, Int32Array, Number, String, Object, Array};
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'analysis.js'), 'utf8'), ctx);
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1), {players: A.DEMO_PLAYERS.slice(0, 5)}),
    meta = {ph: A.photoMeta(data)},
    old = A.report(rows, meta, null, {B: 0});
  // a report stored by the previous code: the same answers, without the new views
  old.AV = A.AV - 1;
  Object.values(old.R).forEach(r => Object.values(r.A).forEach(a => (delete a.ent, delete a.map)));
  ctx.onmessage({data: {id: 1, rows, meta, B: 0, seed: 1, prev: JSON.parse(JSON.stringify(old))}});
  const res = msgs.find(m => m.res);
  assert.ok(res, JSON.stringify(msgs.find(m => m.err)));
  const last = res.res.R[res.res.M[res.res.M.length - 1]];
  assert.ok(last.A.conf.map && last.A.conf.map.g.length >= 3, 'the mix-up map');
  assert.ok(last.A.rt.ent && last.A.photo.ent, 'effects hard to tell apart');
});

// Sheet v55 (Pierre, 2026-11-05, Q86): the answers a deleted account left (anonymous flag 2) stay in the pooled fits but
// are in no per-player result and no count of players (Codex review #600: the Sessions model rows kept the marker too).
test('a deleted account (flag 2) is in no per-player list and no count of players', () => {
  const R = A.rng(7),
    G = ['A', 'B', 'C', 'D'],
    rows = [];
  for (let i = 0; i < 4000; i++) {
    const p = i % 5 === 4 ? 'gone' : 'p' + (i % 5),
      k = Math.floor(R() * 4),
      g = G[k],
      o = G[(k + 1) % 4],
      ok = R() < 0.7;
    // sessions: a new one every 40 answers per player (30 minutes apart)
    rows.push([
      p,
      Math.floor(i / 5) * 20e3 + Math.floor(i / 200) * 40 * 60e3,
      g,
      ok ? g : o,
      ok ? 1 : 0,
      'quiz|d|k2',
      'f' + (i % 50),
      0.7,
      0,
      0,
      `${g} ${o}`,
      p === 'gone' ? 2 : 0,
      5 + R() * 5,
      0
    ]);
  }
  const L = A.prep(rows),
    c = A.confusions(L, 0, 1),
    s = A.sessions(L, 0, 1);
  assert.ok(!c.player.some(x => x.k === 'gone'), 'not in the mix-ups per player');
  assert.strictEqual(c.players, 4);
  assert.strictEqual(s.players, 4, 'not counted in the Sessions model');
  // the pooled models still fit with two clusters when one of them is a deleted account (Codex review #600)
  const two = A.prep(rows.filter(r => r[0] === 'p0' || r[0] === 'gone'));
  assert.ok(!A.rt(two, 0, 1).thin, 'answer time fitted');
  assert.strictEqual(A.rt(two, 0, 1).players, 1);
  assert.ok(!(s.desc && s.desc.table.some(x => x.p === 'gone')), 'not in the sessions table');
  assert.ok(
    s.desc.returns.every(r => r.at <= 4),
    'not in the players coming back: ' + JSON.stringify(s.desc.returns)
  );
  const l = A.learning(L, 0, 1);
  assert.ok(!l.genus || l.genus.every(g => g.players <= 4), 'not in the players per genus');
});

/* ---------- Player profiles (Pierre, 2026-11-05: Q70-Q73) ---------- */
test('eigSym: eigenvalues in decreasing order, orthonormal vectors, S v = λ v', () => {
  const R = A.rng(9),
    n = 6,
    M = Array.from({length: n}, () => Array.from({length: n}, () => R() - 0.5)),
    S = M.map((r, i) => r.map((_, j) => M[i].reduce((s, x, k) => s + x * M[j][k], 0)));
  const E = A.eigSym(S);
  E.val.forEach((v, k) => !k || assert.ok(v <= E.val[k - 1] + 1e-12, 'decreasing'));
  for (let k = 0; k < n; k++) {
    const v = E.vec.map(r => r[k]);
    S.forEach((r, i) =>
      near(
        r.reduce((s, x, j) => s + x * v[j], 0),
        E.val[k] * v[i],
        1e-9,
        `S v = λ v (${k}, ${i})`
      )
    );
    for (let l = 0; l < n; l++)
      near(
        v.reduce((s, x, i) => s + x * E.vec[i][l], 0),
        k === l ? 1 : 0,
        1e-9,
        'orthonormal'
      );
  }
});

// Made-up players of two planted styles: evening players with long sessions who enlarge often and answer slowly, and
// morning players with short sessions who never enlarge and answer fast; the same success. One more player with too few
// answers for a profile of their own.
const styleLog = () => {
  const R = A.rng(4),
    G = ['A', 'B', 'C', 'D', 'E', 'F'],
    rows = [],
    DAY = 864e5;
  const play = (id, eve, nAns) => {
    let t = Date.UTC(2026, 9, 1, eve ? 12 : 1) + Math.floor(R() * 4) * 6e4,
      day = 0,
      inSess = 0;
    for (let i = 0; i < nAns; i++) {
      const g = G[Math.floor(R() * G.length)],
        ok = R() < 0.75,
        others = G.filter(x => x !== g).slice(0, 3);
      rows.push([
        id,
        t,
        g,
        ok ? g : others[0],
        ok ? 1 : 0,
        'quiz',
        'f' + g,
        0.75,
        0,
        0,
        [g, ...others].join(' '),
        0,
        (eve ? 9 : 4) * (0.8 + 0.4 * R()),
        eve ? (R() < 0.6 ? 1 : 0) : 0
      ]);
      inSess++;
      if (inSess >= (eve ? 40 : 8)) {
        inSess = 0;
        // evening players: one session a day; morning players: two, two hours apart
        if (eve || i % 16 === 15) (day++, (t = Date.UTC(2026, 9, 1 + day, eve ? 12 : 1)));
        else t += 2 * 36e5;
      } else t += 30e3;
    }
    void DAY;
  };
  for (let k = 0; k < 5; k++) play('eve' + k, true, 240);
  for (let k = 0; k < 5; k++) play('morn' + k, false, 240);
  play('new1', true, 50);
  return rows;
};

test('profiles: two planted styles come back as the two groups, stable when a player is left out; a short history greyed', () => {
  const D = A.prep(styleLog()),
    r = A.profiles(D, 0, 1),
    id = i => r.who[i].k;
  assert.ok(!r.thin, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(r.players, 10);
  assert.deepStrictEqual(
    r.feats.map(f => f.k),
    A.PROF_F.map(f => f[0])
  );
  // the greyed player: last in the list, outside the tree, the map and the groups
  const last = r.who[r.who.length - 1];
  assert.ok(last.k === 'new1' && last.low === 1 && last.n === 50, JSON.stringify(last));
  assert.strictEqual(r.pca.pts.length, 10);
  // the behaviours as planted: evening share, enlarging, session length, pace
  const f = k => A.PROF_F.findIndex(x => x[0] === k),
    rowOf = name => r.who.find(w => w.k === name);
  near(rowOf('eve0').v[f('eve')], 1, 1e-9, 'evening share');
  near(rowOf('morn0').v[f('eve')], 0, 1e-9, 'morning player');
  assert.strictEqual(rowOf('eve0').v[f('len')], 40);
  assert.strictEqual(rowOf('morn0').v[f('len')], 8);
  assert.ok(rowOf('eve0').v[f('zoom')] > 0.2 && rowOf('morn0').v[f('zoom')] < -0.2, 'enlarging, net of the views');
  assert.ok(rowOf('eve0').v[f('pace')] > 0.3 && rowOf('morn0').v[f('pace')] < -0.3, 'pace');
  near(rowOf('morn0').v[f('wk')], 14, 1.5, 'two sessions a day');
  // two groups, each one style, each a block of the tree's order; stable in every run
  assert.strictEqual(r.k, 2);
  const G = r.groups.map(L => L.map(id).map(s => s.replace(/\d+$/, '')));
  G.forEach(L => assert.strictEqual(new Set(L).size, 1, 'one style per group: ' + L));
  r.groups.forEach(L => assert.strictEqual(L[L.length - 1] - L[0], L.length - 1, 'a block'));
  assert.ok(r.stab.loo.every(j => j === 1) && r.stab.kept === 10, JSON.stringify(r.stab));
  assert.ok(
    r.stab.boot.every(j => j > 0.9),
    JSON.stringify(r.stab)
  );
  // the map's first axis separates the styles; it explains most of the spread
  const x = r.pca.pts.map(p => p[0]),
    side = r.who.slice(0, 10).map((w, i) => [w.k.replace(/\d+$/, ''), Math.sign(x[i])]);
  assert.ok(new Set(side.filter(s => s[0] === 'eve').map(s => s[1])).size === 1, JSON.stringify(side));
  assert.ok(side.find(s => s[0] === 'eve')[1] !== side.find(s => s[0] === 'morn')[1], 'opposite sides');
  assert.ok(r.pca.var[0] > 0.5, String(r.pca.var));
  // in words: the closest pair is two players of one style
  const [i, j] = r.close[0];
  assert.strictEqual(id(i).replace(/\d+$/, ''), id(j).replace(/\d+$/, ''));
});

test('profiles: fewer than 3 players with 100 answers is not enough; each player’s window is their last 300 answers', () => {
  const rows = styleLog(),
    two = A.profiles(A.prep(rows.filter(r => /^(eve0|eve1|new1)$/.test(r[0]))), 0, 1);
  assert.ok(two.thin && two.n === 2 && two.min === 3 && two.who.length === 3, JSON.stringify(two).slice(0, 300));
  // a player with 500 answers: only the last 300 count
  const extra = [];
  for (let i = 0; i < 260; i++)
    extra.push(['eve0', Date.UTC(2026, 8, 1) + i * 30e3, 'A', 'A', 1, 'quiz', 'fA', 0.75, 0, 0, 'A B C D', 0, 30, 1]);
  const r = A.profiles(A.prep(rows.concat(extra)), 0, 1);
  assert.strictEqual(r.who.find(w => w.k === 'eve0').n, 300);
  // the whole report carries the profiles, keyed by the anonymous ids only
  const rep = A.runAll(rows, {}, {B: 0});
  assert.ok(rep.A.who && rep.A.who.who.length === 11 && rep.A.who.effects.length === 0);
});

// Codex review #604: three fixes in the profiles, each with a test that failed before it.
test('profiles: misses in a row are counted within a session, not across the break', () => {
  // two-answer sessions, both answers wrong: within a session the second miss is the one that ends it
  const rows = [];
  for (let p = 0; p < 4; p++)
    for (let s = 0; s < 40; s++)
      for (let k = 0; k < 2; k++)
        rows.push(['p' + p, Date.UTC(2026, 9, 1) + s * 864e5 + k * 30e3, 'A', 'B', 0, 'quiz', 'fA', 0.7, 0, 0, 'A B C D', 0, 5, 0]);
  const V = A.profFeat(A.prep(rows)),
    f = A.PROF_F.findIndex(x => x[0] === 'stop');
  Object.values(V).forEach(v => assert.ok(v[f] > 0.9, `stopping after 2+ misses: ${v[f]}`));
});

test('profiles: stable only when every leave-one-out run keeps every group; the map projects what the PCA diagonalised', () => {
  // the planted styles: stable; then the same players with enlarging logged for two of them only (the rest missing)
  const ok = A.profiles(A.prep(styleLog()), 0, 1);
  assert.strictEqual(ok.stab.stable, 1);
  const rows = styleLog().map(r => (/^(eve0|morn0)$/.test(r[0]) ? r : [...r.slice(0, 13), null])),
    r = A.profiles(A.prep(rows), 0, 1);
  assert.strictEqual(r.stab.stable, r.stab.kept === r.stab.runs && r.stab.boot.every(j => j >= r.stab.at) ? 1 : 0);
  // each axis's spread over the players equals its eigenvalue (the sum of its squared loadings)
  [0, 1].forEach(k => {
    const spread = r.pca.pts.reduce((s, p) => s + p[k] ** 2, 0) / r.pca.pts.length,
      lam = r.pca.load.reduce((s, l) => s + l[k] ** 2, 0);
    near(spread, lam, 0.03, `axis ${k + 1}: the points' spread against its eigenvalue`);
  });
});

// Codex review #604, second pass: the window's cut session and the bootstrap's multiplicities.
test('profiles: a session cut by the 300-answer window is not a session length; a bootstrap draw keeps its multiplicities', () => {
  // two complete sessions of 200 answers: the window holds the last 100 of the first and the whole second
  const rows = [];
  for (let s = 0; s < 2; s++)
    for (let i = 0; i < 200; i++)
      rows.push(['p1', Date.UTC(2026, 9, 1 + s) + i * 30e3, 'A', 'A', 1, 'quiz', 'fA', 0.7, 0, 0, 'A B C D', 0, 5, 0]);
  const D = A.prep(rows).slice(-300),
    f = A.PROF_F.findIndex(x => x[0] === 'len');
  assert.strictEqual(A.profFeat(D).p1[f], 200);
  // a player drawn three times weighs three times in the z-scores (and in the tree); the groups list distinct players
  const V = {a: [0, 0, 0, 0, 0, 0, 0], b: [1, 1, 1, 1, 1, 1, 1], c: [4, 4, 4, 4, 4, 4, 4], d: [5, 5, 5, 5, 5, 5, 5]};
  assert.notStrictEqual(A.zOf(V, ['a', 'a', 'a', 'b', 'c', 'd'])('d')[0], A.zOf(V, ['a', 'b', 'c', 'd'])('d')[0]);
  const G = A.profRun(V, ['a', 'a', 'a', 'b', 'c', 'd'], 2);
  assert.deepStrictEqual(G.map(L => L.slice().sort()).sort(), [
    ['a', 'b'],
    ['c', 'd']
  ]);
});

// Codex review #604, third pass: with 3 profiled players no leave-one-out run can be grouped; that is no evidence, not
// instability.
test('profiles: with 3 players the stability is unknown, never "not stable"', () => {
  const rows = styleLog().filter(r => /^(eve0|eve1|morn0)$/.test(r[0])),
    r = A.profiles(A.prep(rows), 0, 1);
  assert.ok(!r.thin && r.players === 3, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(r.stab.runs, 0);
  assert.strictEqual(r.stab.of, 3);
  assert.strictEqual(r.stab.stable, null);
  // with 10 players every run is compared
  const ten = A.profiles(A.prep(styleLog()), 0, 1);
  assert.strictEqual(ten.stab.runs, 10);
});

// Codex review #604, fourth pass: the page names the check that failed (left out one player, or drawn again).
test('admin: why groups are not stable names each failing check apart', () => {
  const vm = require('vm'),
    src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8'),
    ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src.match(/const anWhy = st => \{[\s\S]*?\n\};/)[0] + ';this.anWhy = anWhy;', ctx);
  assert.strictEqual(ctx.anWhy({kept: 8, runs: 8, boot: [0.9, 0.706], at: 0.75}), ' Some groups change when the players are drawn again.');
  assert.strictEqual(ctx.anWhy({kept: 5, runs: 8, boot: [0.9, 0.9], at: 0.75}), ' These groups change when one player is left out.');
  assert.strictEqual(ctx.anWhy({kept: 8, runs: 8, boot: [0.9, null], at: 0.75}), '');
});

// Sheet v55 (Q86): a deleted account's answers (anonymous flag 2) make no profile.
test('profiles: a deleted account has no row', () => {
  const rows = styleLog().map(r => (r[0] === 'eve0' ? [...r.slice(0, 11), 2, ...r.slice(12)] : r)),
    r = A.profiles(A.prep(rows), 0, 1);
  assert.ok(!r.who.some(w => w.k === 'eve0') && r.players === 9, JSON.stringify(r.who.map(w => w.k)));
});

/* ---------- The Wright map and the genus × player residuals (structure views 3) ---------- */
// Made-up players and genera with known abilities and difficulties; w: a planted second skill (odd-numbered players do
// better on odd-numbered genera and worse on even ones, by w on the log-odds), 0 for one skill only.
const skillLog = (w, seed) => {
  const R = A.rng(seed),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    G = Array.from({length: 20}, (_, i) => 'G' + i),
    del = G.map(() => nrm() * 0.8),
    th = Array.from({length: 10}, () => nrm() * 0.6 + 0.8),
    rows = [];
  let t = 0;
  for (let p = 0; p < 10; p++)
    for (let i = 0; i < 600; i++) {
      const gi = Math.floor(R() * 20),
        g = G[gi],
        eta = th[p] - del[gi] + w * (p % 2 ? 1 : -1) * (gi % 2 ? 1 : -1),
        ok = R() < 0.25 + 0.75 / (1 + Math.exp(-eta)),
        others = G.filter(x => x !== g).slice(0, 3);
      rows.push(['p' + p, (t += 60e3), g, ok ? g : others[0], ok ? 1 : 0, 'quiz', 'f' + g, 0.7, 0, 0, [g, ...others].join(' '), 0, 5, 0]);
    }
  return {rows, del, th};
};
const rankCorr = (a, b) => {
  const rk = L => {
    const I = L.map((_, i) => i).sort((i, j) => L[i] - L[j]),
      r = [];
    I.forEach((i, k) => (r[i] = k));
    return r;
  };
  const x = rk(a),
    y = rk(b),
    n = a.length,
    m = (n - 1) / 2;
  return x.reduce((s, v, i) => s + (v - m) * (y[i] - m), 0) / x.reduce((s, v) => s + (v - m) ** 2, 0);
};

test('Wright map: players and genera come back in the order of their planted ability and difficulty', () => {
  const {rows, del, th} = skillLog(0, 2),
    W = A.learning(A.prep(rows), 0, 1).wright;
  const g = W.g.map(([k, d]) => [del[Number(k.slice(1))], d]),
    p = W.th.map(([k, v]) => [th[Number(k.slice(1))], v]);
  assert.ok(rankCorr(...[g.map(x => x[0]), g.map(x => x[1])]) > 0.9, 'genera');
  assert.ok(rankCorr(...[p.map(x => x[0]), p.map(x => x[1])]) > 0.85, 'players');
  near(W.m, Math.log(4), 1e-3, 'the 80% line, logit(0.8)');
  W.th.forEach(x => assert.strictEqual(x[2], 600, 'answers per player'));
});

test('a second skill? planted: the first residual axis stands out and splits the genera; one skill: it does not', () => {
  for (const seed of [1, 2, 3]) {
    const one = A.learning(A.prep(skillLog(0, seed).rows), 0, 1).res;
    assert.ok(one.var[0] <= one.null[1], `one skill (seed ${seed}): ${JSON.stringify(one.var)} against ${JSON.stringify(one.null)}`);
    const two = A.learning(A.prep(skillLog(0.8, seed).rows), 0, 1).res;
    assert.ok(two.var[0] > 2 * two.null[1], `two skills (seed ${seed}): ${JSON.stringify(two.var)} against ${JSON.stringify(two.null)}`);
    const side = L => new Set(L.map(([k, x]) => (Number(k.slice(1)) % 2) + ':' + Math.sign(x))).size;
    assert.strictEqual(side(two.g), 2, 'odd and even genera on opposite sides of the first axis');
    assert.strictEqual(side(two.p), 2, 'odd and even players on opposite sides');
    assert.strictEqual(two.g.length, 20);
    assert.strictEqual(two.p.length, 10);
  }
});

// Sheet v55 (Q86): a deleted account is never a player on the Wright map or an arrow of the residual map.
test('Wright map and residuals: a deleted account is no player', () => {
  const {rows} = skillLog(0, 2),
    R2 = rows.map(r => (r[0] === 'p3' ? [...r.slice(0, 11), 2, ...r.slice(12)] : r)),
    L = A.learning(A.prep(R2), 0, 1);
  assert.ok(!L.wright.th.some(x => x[0] === 'p3') && L.wright.th.length === 9);
  assert.ok(!L.res.p.some(x => x[0] === 'p3') && L.res.p.length === 9);
});

// Codex review #620: a place's likely range carries the intercept's and the slope's uncertainty, not the random effect's
// alone.
test('Wright map: each place’s uncertainty includes the fixed effects (intercept, slope, covariance)', () => {
  const D = [0, 1, 2, 3].map(n => ({p: 'p', g: 'g', n, gone: 0})),
    F = [
      {L: ['p'], u: [0.2], cv: [0.01]},
      {L: ['g'], u: [-0.3], cv: [0.04]}
    ],
    M = {
      b: [0.5, 0.4],
      V: [
        [0.09, -0.01],
        [-0.01, 0.0225]
      ]
    },
    W = A.wrightOf(D, M, F),
    l = Math.log(1 + 1.5), // the median practice of 0..3
    fv = 0.09 + l * l * 0.0225 + 2 * l * -0.01;
  near(W.th[0][3], Math.sqrt(fv + 0.01), 1e-3, 'player SE');
  near(W.g[0][3], Math.sqrt(fv + 0.04), 1e-3, 'genus SE (the typical player is this one)');
  near(W.mid, 0.5 + 0.4 * l, 1e-3, 'the typical player');
  near(W.th[0][1], 0.5 + 0.4 * l + 0.2, 1e-3, 'player place');
});
