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
  assert.deepStrictEqual(A.milestones(2500), [1000, 2000, 2500]);
  assert.deepStrictEqual(A.milestones(3000), [1000, 2000, 3000]);
  assert.deepStrictEqual(A.milestones(400), [400]);
  assert.strictEqual(A.verdictOf({est: 0.5, lo: 0.2, hi: 0.8, sesoi: 0.25}, 1000).v, 'clear');
  assert.strictEqual(A.verdictOf({est: 0.05, lo: -0.1, hi: 0.2, sesoi: 0.25}, 1000).v, 'margin');
  const t = A.verdictOf({est: 0.2, lo: -0.4, hi: 0.8, sesoi: 0.25}, 1000);
  assert.strictEqual(t.v, 'thin');
  assert.strictEqual(t.need, 6000, 'half-width 0.6 down to the 0.25 that matters: 5.76 times the answers, rounded up');
  assert.strictEqual(A.verdictOf({est: 0.4, lo: 0.3, hi: 0.6, nul: 0.5, sesoi: 0.05}, 100).v, 'thin', 'a reference value');
  const fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1), {days: 30, players: A.DEMO_PLAYERS.slice(0, 4).map(p => [p[0], p[1], 300, p[3]])});
  const meta = {ph: A.photoMeta(data)};
  const r1 = A.report(rows.slice(0, 1100), meta, null, {B: 0}),
    r2 = A.report(rows, meta, r1, {B: 0});
  assert.deepStrictEqual(r1.M, [1000, 1100]);
  assert.strictEqual(r2.R[1000], r1.R[1000], 'milestone 1000 reused');
  assert.notStrictEqual(r2.R[r2.M[r2.M.length - 1]], r1.R[1100]);
  const small = A.compact(JSON.parse(JSON.stringify(r2)), 1);
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
  let stored = null;
  const logs = [],
    calls = [];
  const io = {
    post: async b => {
      calls.push(Object.keys(b).filter(k => k !== 'token' && k !== 'report'));
      if (b.token !== 'tok') return {ok: false, error: 'token'};
      if (b.analysesGet) {
        const meta = stored && {answers: JSON.parse(stored).answers, av: JSON.parse(stored).AV};
        return b.head ? {ok: true, answers: rows.length, stored: meta} : {ok: true, answers: rows.length, stored: meta, report: stored};
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
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0}), 'wait', 'no new answers: nothing to do');
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0, force: true}), 'stored');
  assert.ok(/1 reused|2 reused/.test(logs[logs.length - 1]), logs[logs.length - 1]);
  assert.ok(!logs.join(' ').match(/id\d|Demo/), 'the log has counts only');
  // an older sync script answers 'input': nothing done, no error
  const old = {post: async () => ({ok: false, error: 'input', v: 29}), log: t => logs.push(t)};
  assert.strictEqual(await sheetRun(old, 'tok', {B: 0}), 'old');
});
