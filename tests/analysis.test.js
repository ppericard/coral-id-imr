// The Analyses module (analysis.js): the model code recovers known effects from synthetic data, the answer log is read
// as the app logs it, milestones and verdicts, and the workflow script (tools/analyses.js) end to end on a stub sheet.
// In three files that node --test runs in parallel (one held the run's critical path: test-suite audit, 2026-11-09):
// this one, analysis-verdicts.test.js and analysis-views.test.js, on shared helpers (tests/analysisfix.js).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {near} = require('./analysisfix.js');

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

test('core.js fmtOf (the per-format offsets of the sheet and the app) reads the formats as analysis.js', () => {
  const C = require('../core.js');
  for (const [m, n] of [
    ['quiz', 4],
    ['quiz|k3', 4],
    ['quiz|k2', 4],
    ['quiz|k2', 2],
    ['quiz', 2],
    ['quiz|d|k2', 2],
    ['quiz|s|d|k2', 2],
    ['quiz-duel|A|B', 2],
    ['quiz-duel', 2],
    ['quiz|x', 4],
    ['quiz|t|x', 0],
    ['quiz|s|t', 0],
    ['quiz|c|k2', 4],
    ['quiz|s|c', 4]
  ])
    assert.strictEqual(C.fmtOf(m, n), A.fmtOf(m, n), m + ' ' + n);
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

// The admin demo's made-up answers (admin-demo.js, analysis.js demoLog) changed from one load to the next in Chromium: a
// random-comparator sort (sort(() => R() - 0.5)) calls its comparator a number of times that depends on the engine and on
// whether the code is optimised yet, so every later seeded draw moved, and tests/admin.smoke.js failed now and then on
// Health's "difficulty in words" (2026-11-06). shuffle draws exactly n - 1 numbers.
test('shuffle: a permutation from exactly n - 1 draws; no seeded stream feeds a random-comparator sort', () => {
  const fs = require('fs'),
    path = require('path'),
    L = ['a', 'b', 'c', 'd', 'e'];
  for (const x of [0, 0.37, 0.999]) {
    let n = 0;
    const o = A.shuffle(L, () => (n++, x));
    assert.deepStrictEqual(o.slice().sort(), L, 'the same items');
    assert.strictEqual(n, L.length - 1, 'n - 1 draws');
  }
  assert.deepStrictEqual(L, ['a', 'b', 'c', 'd', 'e'], 'the list itself is left as it was');
  assert.deepStrictEqual(A.shuffle([], Math.random), []);
  const a = A.shuffle(
      L,
      (
        s => () =>
          (s = (s * 16807) % 2147483647) / 2147483647
      )(7)
    ),
    b = A.shuffle(
      L,
      (
        s => () =>
          (s = (s * 16807) % 2147483647) / 2147483647
      )(7)
    );
  assert.deepStrictEqual(a, b, 'the same seed, the same order');
  for (const f of ['analysis.js', 'admin-demo.js'])
    assert.ok(!/\.sort\(\(\)\s*=>/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), `${f}: a random-comparator sort`);
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
  const rows = A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 1});
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
  assert.strictEqual(logs[logs.length - 1], `Corals: ${rows.length} answers, newest milestone 1000: the next one at 2000.`);
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
  assert.strictEqual(logs[logs.length - 1], `Corals: ${rows.length} answers, newest milestone 1000: the next one at 2000.`);
});

// Pierre, 2026-11-08: "il faut faire tous les 1000, mais pour le nombre de réponses dans le mode de jeu": the corals'
// analyses are refitted every 1000 coral answers. The sheet's head counted every row of every subject, so the fish answers
// made each hourly run read the whole log (and the admin announce a refit that was not due).
test('tools/analyses.js on the real sheet script: fish answers never bring a coral refit', async () => {
  const {sheetRun} = require('../tools/analyses.js'),
    {loadCodeGs} = require('./gas.js'),
    TOK = 'ghp_write000000000000000000',
    s = loadCodeGs(),
    t0 = Date.UTC(2026, 10, 1),
    row = (i, subject) => {
      const r = ['Ana', new Date(t0 + i * 6e4), 'Acropora', 'Acropora', 1, 'quiz', 'acropora-1', 'x' + i];
      r[17] = subject;
      return r;
    };
  const sh = require('vm').runInContext("sheet_('Answers', LOG)", s.ctx);
  // 1500 coral answers (1000 logged before v60 with no Subject), then 1600 fish answers: 3100 rows in the tab
  for (let i = 0; i < 1500; i++) sh.appendRow(row(i, i < 1000 ? '' : 'coral'));
  for (let i = 0; i < 1600; i++) sh.appendRow(row(1500 + i, 'fish'));
  assert.strictEqual(
    s.post({analysesPut: 1, report: JSON.stringify({R: {}, answers: 1200, made: 1, AV: A.AV, subject: 'coral'}), token: TOK}).ok,
    true
  );
  const calls = [],
    logs = [],
    io = {post: async b => (calls.push(Object.keys(b).find(k => /^(analyses|read)/.test(k))), s.post(b)), log: t => logs.push(t)};
  assert.strictEqual(await sheetRun(io, TOK, {B: 0}), 'wait');
  assert.deepStrictEqual(calls, ['analysesGet'], 'no new thousand of coral answers: the log is not read');
  assert.strictEqual(logs.pop(), 'Corals: 1500 answers, newest milestone 1000: the next one at 2000.');
});

test("tools/analyses.js: the head of an older script (every subject's rows) is judged again on the subject's log", async () => {
  const {sheetRun, headCount} = require('../tools/analyses.js'),
    rows = Array.from({length: 3100}, (_, i) => {
      const r = ['p1', i, 'Acropora', 'Acropora', 1, 'quiz', ''];
      r[17] = i < 1500 ? 'coral' : 'fish';
      return r;
    });
  assert.strictEqual(headCount({answers: 3100}, 'coral'), 3100, 'before v105: an upper bound');
  assert.strictEqual(headCount({answers: 1500, counts: {coral: 1500, fish: 1600}}, 'coral'), 1500);
  assert.strictEqual(headCount({answers: 1500, counts: {coral: 1500, fish: 1600}}, 'fish'), 1600);
  const puts = [],
    logs = [],
    io = {
      post: async b =>
        b.analysesGet
          ? {ok: true, answers: 3100, stored: {answers: 1200, av: A.AV}}
          : b.readAnswers
            ? {ok: true, rows}
            : (puts.push(b), {ok: true}),
      log: t => logs.push(t)
    };
  assert.strictEqual(await sheetRun(io, 'tok', {B: 0}), 'wait');
  assert.strictEqual(puts.length, 0, 'nothing stored: 1500 coral answers, the 1600 fish ones apart');
  assert.strictEqual(logs.pop(), 'Corals: 1500 answers, newest milestone 1000: the next one at 2000.');
});

// Pierre, 2026-11-08: each subject's analyses ("fish when the fish analyses exist"), refitted every 1000 answers of that
// subject. The made-up fish answers of the tests and the admin demo: synth on the fish units' photos (core.js fishGen),
// tagged with their subject as the sheet serves them.
const fishLog = (n, o = {}) => {
  const fs = require('fs'),
    path = require('path'),
    C = require('../core.js'),
    rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')),
    G = C.fishGen(rd('fish.json'), rd('fish-photos.json').photos).gen,
    ids = Object.keys(G)
      .filter(id => G[id].views.wide.length >= 3)
      .slice(0, 24),
    k = n / A.DEMO_PLAYERS.reduce((t, p) => t + p[2], 0);
  return A.synth({
    players: A.DEMO_PLAYERS.map(p => ['f' + p[0].length + p[1], p[1], Math.ceil(p[2] * k), p[3]]),
    photos: Object.fromEntries(ids.map(id => [id, G[id].views.wide.slice(0, 8).map(p => ({f: p.f, v: 'wide'}))])),
    look: Object.fromEntries(ids.map(id => [id, G[id].look || []])),
    start: Date.UTC(2026, 9, 1),
    end: Date.UTC(2026, 10, 1),
    seed: o.seed || 3,
    subject: 'fish'
  });
};

test('tools/analyses.js: one report per subject, each from its own answers (the subject split)', async () => {
  const {sheetRunAll, subjects, metaOf} = require('../tools/analyses.js'),
    C = require('../core.js'),
    fs = require('fs'),
    data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data.json')));
  assert.deepStrictEqual(subjects(), ['coral', 'fish'], 'the replayed subject first, then every subject with analyses');
  assert.deepStrictEqual(metaOf('fish'), {ph: {}}, 'no coral photo features for the fish');
  assert.ok(Object.keys(metaOf('coral').ph).length > 100, "the corals' photo features from data.json");
  const coral = A.demoLog(data, Date.UTC(2026, 10, 1), {
      days: 300,
      players: A.DEMO_PLAYERS.slice(0, 3).map(p => [p[0], p[1], 400, p[3]])
    }).map(r => ['id' + r[0].length, ...r.slice(1)]),
    fish = fishLog(1150),
    rows = [...coral, ...fish].sort((a, b) => a[1] - b[1]),
    counts = C.subjCounts(rows);
  assert.ok(counts.coral >= 1000 && counts.fish >= 1000, JSON.stringify(counts));
  const stored = {},
    puts = [],
    logs = [];
  let v = A.AN_SUBJ_SHEET;
  const io = {
    post: async b => {
      if (b.analysesGet) {
        const sj = b.subject || 'coral',
          t = stored[sj],
          meta = t && {answers: JSON.parse(t).answers, av: JSON.parse(t).AV, subject: sj};
        // an older script knows one report: the corals', whatever the subject asked
        const st = v >= A.AN_SUBJ_SHEET ? meta : stored.coral && {answers: JSON.parse(stored.coral).answers, av: A.AV, subject: 'coral'};
        return {
          ok: true,
          v,
          subject: v >= A.AN_SUBJ_SHEET ? sj : 'coral',
          answers: counts[sj],
          counts,
          stored: st,
          ...(b.head ? {} : {report: v >= A.AN_SUBJ_SHEET ? t : stored.coral})
        };
      }
      if (b.readAnswers) return {ok: true, rows: rows.map(r => r.slice())};
      if (b.analysesPut) {
        const r = JSON.parse(b.report);
        puts.push(r.subject);
        stored[v >= A.AN_SUBJ_SHEET ? r.subject : 'coral'] = b.report;
        return {ok: true, stored: {}};
      }
      return {ok: false, error: 'input'};
    },
    log: t => logs.push(t)
  };
  // an older script: the corals' report only, the fish one neither stored nor read in its place
  v = A.AN_SUBJ_SHEET - 1;
  assert.deepStrictEqual(await sheetRunAll(io, 'tok', {B: 0}), {coral: 'stored', fish: 'old'});
  assert.deepStrictEqual(puts, ['coral']);
  assert.ok(/^Fish: the sync script answers as v\d+: one report per subject needs v\d+\. Nothing done\.$/.test(logs.pop()));
  v = A.AN_SUBJ_SHEET;
  assert.deepStrictEqual(await sheetRunAll(io, 'tok', {B: 0}), {coral: 'wait', fish: 'stored'});
  assert.deepStrictEqual(puts, ['coral', 'fish']);
  const rc = JSON.parse(stored.coral),
    rf = JSON.parse(stored.fish);
  assert.strictEqual(rc.subject, 'coral');
  assert.strictEqual(rf.subject, 'fish');
  assert.strictEqual(rc.answers, counts.coral, "the corals' report counts the coral answers only");
  assert.strictEqual(rf.answers, counts.fish, 'the fish report counts the fish answers only');
  assert.deepStrictEqual(rf.M, [1000]);
  // the fish report's units are the fish units, never a coral genus; the coral one's never a fish unit
  const units = rep => {
    const R = rep.R[rep.M[rep.M.length - 1]];
    return [...(R.A.learn.genus || []).map(g => g.k), ...((R.A.conf.map && R.A.conf.map.g) || [])];
  };
  assert.ok(units(rf).length && units(rf).every(g => /^[fgs]:/.test(g)), units(rf).join(' '));
  assert.ok(units(rc).length && units(rc).every(g => !/^[fgs]:/.test(g)), units(rc).join(' '));
  // the fish photos have one view: no view effect in its mix-ups, no photo feature in What makes a photo hard
  const F = rf.R[1000].A;
  assert.deepStrictEqual(
    F.conf.effects.map(e => e.k),
    ['sd_player', 'sd_pair'],
    'no view never shown read as "no clear effect"'
  );
  assert.deepStrictEqual(F.photo.effects, []);
  assert.ok(
    ['medium', 'macro'].every(k => rc.R[1000].A.conf.effects.some(e => e.k === k)),
    "the corals' views kept"
  );
  // nothing new: both wait
  assert.deepStrictEqual(await sheetRunAll(io, 'tok', {B: 0}), {coral: 'wait', fish: 'wait'});
  assert.strictEqual(logs.pop(), `Fish: ${counts.fish} answers, newest milestone 1000: the next one at 2000.`);
  // the token refused: the corals stop the run, the fish are not asked
  assert.deepStrictEqual(await sheetRunAll({post: async () => ({ok: false, error: 'token'}), log: () => {}}, 'tok', {B: 0}), {
    coral: 'refused'
  });
});

// The admin's status line beside the milestone switch (admin-analyses.js anStatus): the subject and its own numbers.
test('admin Analyses status line: the subject, the milestone fitted, its answers since, the next one', () => {
  const fs = require('fs'),
    path = require('path'),
    block = require('./block.js'),
    C = require('../core.js'),
    src = fs.readFileSync(path.join(__dirname, '..', 'admin-analyses.js'), 'utf8');
  const code =
    block(src, 'const anInt = ', '\n', {file: 'admin-analyses.js', through: true}) +
    block(src, 'const anSubj = ', '\n/* ---------- The page', {file: 'admin-analyses.js'}) +
    ';({anSubj, anCount, anStatus})';
  const run = (ANREP, ANS) => {
    const ctx = {ANREP, ANS, ANALYSIS: A, subjCounts: C.subjCounts, subjectOf: C.subjectOf, replaySubject: C.replaySubject};
    return require('vm').runInNewContext(code, ctx);
  };
  const line = (ANREP, ANS, lastM) => {
    const f = run(ANREP, ANS),
      S = f.anSubj({M: [lastM]});
    return f.anStatus(S, lastM, f.anCount(S));
  };
  // sheet v105: the head's count of the corals' answers (2,729 coral and 1,292 fish answers on 2026-11-08)
  assert.strictEqual(line({counts: {coral: 2729, fish: 1292}}, null, 2000), 'Corals: fitted on 2,000 answers · 729 since · next at 3,000');
  assert.strictEqual(
    line({counts: {coral: 3004, fish: 1292}}, null, 2000),
    'Corals: fitted on 2,000 answers · 1,004 since · 3,000 due within the hour'
  );
  // an older script (its answers every subject's rows, not used): the answer log this page reads, the fish rows apart
  const mixed = Array.from({length: 4021}, (_, i) => {
    const r = ['p1', i];
    r[17] = i < 2047 ? '' : i < 2729 ? 'coral' : 'fish';
    return r;
  });
  assert.strictEqual(line({counts: null}, {all: mixed}, 2000), 'Corals: fitted on 2,000 answers · 729 since · next at 3,000');
  // the log not read yet: no count, no "due"
  assert.strictEqual(line({counts: null}, null, 2000), 'Corals: fitted on 2,000 answers · next at 3,000');
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
