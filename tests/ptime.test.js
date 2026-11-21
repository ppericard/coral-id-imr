require('./slot.js').testGuard();
// The photo's time term (core.js PTIME, ptimeStep, ptimeOut, ptimeInto, ptimeOff; docs/LEARNING.md "The photo's time
// term"): which answers feed it, the weight by the player's level, the enlargement against habit, the fade by
// information; and step 2 (Q452): a right answer's time net of its photos' term, logged in the scoring record and
// replayed (rule D5, rules version 13).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  C = require('../core.js');

// A small seeded generator, so a failure replays.
const rng = seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const normal = R => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R());
// One answer through ptimeStep, every field defaulted (a trusted right answer, 4 choices, one photo, at level 1).
const step = (T, o) =>
  C.ptimeStep(T, {w: 'p1', fs: ['x'], m: 'quiz', nch: 4, rk: 'genus', ok: 1, sec: 8, zm: 0, L: 1, rt: true, wt: 0.8, inf: 0.1, ...o});
// A player's habit: n timed answers at sec seconds on other photos.
const habit = (T, w, n = 20, sec = 8) => {
  for (let i = 0; i < n; i++) step(T, {w, fs: ['h-' + w + i], sec});
};

test('a photo every player answers slower than their habit gets a positive time term, one at their habit about none', () => {
  const T = C.ptimeNew();
  ['a', 'b', 'c'].forEach(w => habit(T, w));
  ['a', 'b', 'c'].forEach(w => (step(T, {w, fs: ['slow'], sec: 16}), step(T, {w, fs: ['usual'], sec: 8})));
  const o = C.ptimeOut(T);
  assert.ok(o.slow[0] > 0.1, JSON.stringify(o.slow));
  assert.ok(!o.usual || Math.abs(o.usual[0]) < 0.05, JSON.stringify(o.usual));
  // shrunk: never the raw z (log 2 = 0.69), and clipped at CLIP however slow
  const T2 = C.ptimeNew();
  habit(T2, 'a');
  step(T2, {w: 'a', fs: ['vslow'], sec: 600});
  const v = C.ptimeOut(T2).vslow[0];
  assert.ok(v > 0 && v < 0.2, 'one answer, clipped at 1 and shrunk by the prior: ' + v);
});

test('misses, typed, enlarged, untimed and non-rating answers leave the time term alone; the first MIN timed answers have no z', () => {
  const T = C.ptimeNew();
  habit(T, 'a');
  step(T, {w: 'a', fs: ['m'], sec: 30, ok: 0});
  step(T, {w: 'a', fs: ['t'], sec: 30, m: 'quiz|t'});
  step(T, {w: 'a', fs: ['e'], sec: 30, zm: 1});
  step(T, {w: 'a', fs: ['u'], sec: null});
  step(T, {w: 'a', fs: ['n'], sec: 30, rt: false});
  ['m', 't', 'e', 'u', 'n'].forEach(f => assert.ok(!T.P[f] || T.P[f][1] === 0, f + ' ' + JSON.stringify(T.P[f])));
  // the rating answers among them still count their information (the fade reads every answer that rates)
  assert.ok(T.P.m[4] > 0 && !T.P.n);
  const T2 = C.ptimeNew();
  habit(T2, 'b', C.RTIME.MIN - 1);
  step(T2, {w: 'b', fs: ['early'], sec: 30});
  assert.ok(!T2.P.early || T2.P.early[1] === 0, 'no median yet: no z');
});

test('the weight follows the level only where the players show it: steadier strong players weigh more', () => {
  // Strong players (L 2.5) answer with less scatter than weak ones (L 0); every player's z is noise around their habit.
  const R = rng(5),
    T = C.ptimeNew(),
    players = Array.from({length: 10}, (_, i) => ({w: 'p' + i, L: i < 5 ? 0 : 2.5, sd: i < 5 ? 0.8 : 0.3}));
  players.forEach(p => habit(T, p.w, 15));
  assert.strictEqual(C.ptimeBeta(T), 0, 'too few answers for a fit: equal weights');
  for (let k = 0; k < 120; k++)
    players.forEach(p => step(T, {w: p.w, L: p.L, fs: ['q' + k], sec: Math.exp(Math.log(8) + p.sd * normal(R))}));
  const b = C.ptimeBeta(T);
  assert.ok(b < -0.1, 'the variance falls with the level: ' + b);
  assert.ok(C.ptimeVar(T, 2.5) < C.ptimeVar(T, 0), 'a strong player`s answer has the smaller variance, so the larger weight');
  assert.ok(C.ptimeVar(T, 0) / C.ptimeVar(T, 2.5) <= Math.exp(2 * C.PTIME.BMAX) + 1e-9, 'capped');
  // the same with every player as scattered: the slope shrinks to 0, equal weights
  const T2 = C.ptimeNew(),
    R2 = rng(9);
  players.forEach(p => habit(T2, p.w, 15));
  for (let k = 0; k < 120; k++)
    players.forEach(p => step(T2, {w: p.w, L: p.L, fs: ['q' + k], sec: Math.exp(Math.log(8) + 0.5 * normal(R2))}));
  assert.ok(Math.abs(C.ptimeBeta(T2)) < Math.abs(b) / 3, 'no clear slope: about equal weights, ' + C.ptimeBeta(T2));
  // fewer than MIN_P players: equal weights whatever the data
  const T3 = C.ptimeNew(),
    R3 = rng(2);
  players
    .slice(0, 2)
    .concat(players.slice(5, 7))
    .forEach(p => habit(T3, p.w, 15));
  for (let k = 0; k < 300; k++)
    players
      .slice(0, 2)
      .concat(players.slice(5, 7))
      .forEach(p => step(T3, {w: p.w, L: p.L, fs: ['q' + k], sec: Math.exp(Math.log(8) + p.sd * normal(R3))}));
  assert.strictEqual(C.ptimeBeta(T3), 0);
});

test('the enlargement counts against each player’s own habit', () => {
  const T = C.ptimeNew();
  // a player who always enlarges, and one who never does
  for (let i = 0; i < 30; i++)
    (step(T, {w: 'zoomer', fs: ['h' + i], zm: 1, sec: null}), step(T, {w: 'plain', fs: ['g' + i], zm: 0, sec: null}));
  step(T, {w: 'zoomer', fs: ['A'], zm: 1, sec: null});
  step(T, {w: 'plain', fs: ['B'], zm: 1, sec: null});
  const o = C.ptimeOut(T);
  assert.ok(o.B && o.B[1] > 0.05, 'the one who never enlarges tells: ' + JSON.stringify(o.B));
  assert.ok(!o.A || o.A[1] < o.B[1] / 3, 'the habitual enlarger tells far less: ' + JSON.stringify([o.A, o.B]));
  // an answer that did not log the mark (an old row) leaves it alone
  step(T, {w: 'plain', fs: ['C'], zm: null, sec: null});
  assert.ok(!o.C && !C.ptimeOut(T).C);
});

test('the term fades by information, not by answers; served after the photo’s five numbers', () => {
  const I0 = 5 * C.infoAt(1, 4);
  assert.ok(Math.abs(C.ptimeOff([0.2, 0.1, 0], 5) - C.PTIME.C * 0.3) < 1e-12, 'whole with no information');
  assert.ok(Math.abs(C.ptimeOff([0.2, 0.1, I0], 5) - C.PTIME.C * 0.15) < 1e-12, 'half at I0');
  assert.ok(C.ptimeOff([0.2, 0, 50 * I0], 5) < 0.01, 'a rating that has learned a lot keeps little of it');
  // an expert's right answers bring little information: many of them keep most of the term
  const inf = x => C.infoAt(x, 4);
  assert.ok(20 * inf(4) < I0 && 20 * inf(1) > I0, 'twenty answers at 4 logits above the photo inform less than five at the target');
  for (const bad of [null, undefined, [], [0.1], [NaN, 0, 1], [0.1, 0, -1]]) assert.strictEqual(C.ptimeOff(bad, 5), 0, JSON.stringify(bad));
  // ptimeInto: three numbers more for a photo with a term, none for the others
  const T = C.ptimeNew();
  habit(T, 'a');
  step(T, {w: 'a', fs: ['slow'], sec: 20});
  const ph = C.ptimeInto({slow: [0.1, 3, 2, 3, 'Acropora'], other: [0.2, 1, 1, 1, 'Porites']}, T);
  assert.strictEqual(ph.slow.length, 8);
  assert.strictEqual(ph.other.length, 5);
  assert.deepStrictEqual(ph.slow.slice(5), C.ptimeOut(T).slow);
});

test('model.js photoDiff adds the term to the blend as it is, rated or not; none without a term', () => {
  const vm = require('vm'),
    block = require('./block.js'),
    src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    c = vm.createContext({
      SUBJ: C.subjectOf('coral'),
      calibOf: C.calibOf,
      ptimeOff: C.ptimeOff,
      PGD: {Acropora: [0.2, 30]},
      PSTAT: {r: [0.6, 5, 3, 5, 'Acropora']},
      PTM: {r: [0.2, 0, 0.5], u: [0.1, 0.1, 0]}
    });
  vm.runInContext(block(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}) + '\nthis.photoDiff = photoDiff;', c);
  const blend = (5 * 0.6 + 5 * 0.2) / 10;
  assert.ok(Math.abs(c.photoDiff('Acropora', {f: 'r'}) - blend - C.ptimeOff([0.2, 0, 0.5], 5)) < 1e-12);
  assert.ok(
    Math.abs(c.photoDiff('Acropora', {f: 'u'}) - 0.2 - C.PTIME.C * 0.2) < 1e-12,
    'a photo nobody rated: its prior and its whole term'
  );
  c.PTM = {};
  assert.ok(Math.abs(c.photoDiff('Acropora', {f: 'r'}) - blend) < 1e-12, 'no term: as before');
});

// Step 2 (Q452; docs/LEARNING.md "The player's time net of the photo's"): the player's time net of the photo's.
// A replay row of player p1: an Acropora question on photo a1, right or not, at minute i, s seconds, its scoring record sc.
const gen2 = {Acropora: {}, Porites: {}},
  row2 = (i, ok, s, sc) => {
    const r = new Array(C.LOG_SC + 1).fill(null);
    Object.assign(r, {
      0: 'p1',
      1: Date.UTC(2026, 10, 10) + i * 60000,
      2: 'Acropora',
      3: ok ? 'Acropora' : 'Porites',
      4: ok,
      5: 'quiz',
      6: i >= 12 ? 'a1' : 'h' + i,
      7: 0.7,
      8: 0.2,
      10: 'Acropora Porites',
      12: s
    });
    r[C.LOG_SC] = {d: 0.3, m: 0, n: 0, ...sc};
    return r;
  },
  // 12 answers to set the habit (8 s), then right answers on a1 at 16 s
  log2 = sc => [...Array.from({length: 12}, (_, i) => row2(i, 1, 8, {})), ...[12, 13, 14].map(i => row2(i, 1, 16, sc))],
  thOf = R => R.p1.P.Acropora.th;

test('rtWeight: z net of the photos time term; 0 or none is the rule before', () => {
  const G = {rt: {80: 12}}; // a habit of 8 s
  const w0 = C.rtWeight(G, 16, 4, true),
    w1 = C.rtWeight(G, 16, 4, true, Math.log(2));
  assert.strictEqual(C.rtWeight(G, 16, 4, true, 0), w0);
  assert.ok(Math.abs(w0 - (1 - C.RTIME.K * Math.log(2))) < 1e-9 || w0 === C.RTIME.LO, String(w0));
  assert.ok(Math.abs(w1 - 1) < 1e-9, 'a slowness the photo explains in full weighs as an answer at the habit: ' + w1);
  // symmetric: a fast answer on a photo fast for everyone earns less
  assert.ok(C.rtWeight(G, 6, 4, true, -0.3) < C.rtWeight(G, 6, 4, true, 0));
  // a miss, a typed answer, no seconds: 1 whatever the term
  assert.strictEqual(C.rtWeight(G, 16, 4, false, 0.5), 1);
  assert.strictEqual(C.rtWeight(G, 16, Infinity, true, 0.5), 1);
  assert.strictEqual(C.rtWeight(G, null, 4, true, 0.5), 1);
  // a term that is not a number counts 0
  assert.strictEqual(C.rtWeight(G, 16, 4, true, NaN), w0);
});

test('ptimeQ: the mean of the photos terms, 0 for a photo without one; ptimeAt reads the 6th number of a ?stats=1 entry', () => {
  const at = C.ptimeAt({a: [0.1, 4, 3, 4, 'Acropora', 0.3, 0, 1], b: [0.2, 2, 1, 2, 'Acropora']});
  assert.strictEqual(at('a'), 0.3);
  assert.strictEqual(at('b'), 0);
  assert.strictEqual(at('constructor'), 0);
  assert.strictEqual(C.ptimeQ(['a', 'b'], at), 0.15);
  assert.strictEqual(C.ptimeQ([], at), 0);
  assert.strictEqual(
    C.ptimeQ(['a'], () => 'x'),
    0
  );
  // the served term equals the state's (ptimeTerm, ptimeOut)
  const T = C.ptimeNew();
  ['a', 'b', 'c'].forEach(w => habit(T, w));
  ['a', 'b', 'c'].forEach(w => step(T, {w, fs: ['slow'], sec: 16}));
  assert.strictEqual(C.ptimeTerm(T, 'slow'), C.ptimeOut(T).slow[0]);
  assert.strictEqual(C.ptimeTerm(T, 'none'), 0);
});

test('rule D5: the replay nets a right answer by its logged term, else by the photos served now; none, as before', () => {
  const st = {gen: gen2, gd: {Acropora: [0.1, 5]}},
    photos = {a1: [0.4, 3, 2, 3, 'Acropora', 0.5, 0.1, 0.2]},
    none = C.replayProgress(log2({}), st),
    served = C.replayProgress(log2({}), {...st, photos}),
    logged = C.replayProgress(log2({i: 0.5}), st),
    logged0 = C.replayProgress(log2({i: 0}), {...st, photos});
  // slow right answers on a photo slow for everyone weigh more once netted
  assert.ok(thOf(served) > thOf(none), thOf(served) + ' ' + thOf(none));
  // the logged term is the one used, whatever is served now (an answer logged with 0 replays as not netted)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(logged)), JSON.parse(JSON.stringify(served)));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(logged0)), JSON.parse(JSON.stringify(none)));
  // photos with no term: the replay before this rule
  const plain = C.replayProgress(log2({}), {...st, photos: {a1: [0.4, 3, 2, 3, 'Acropora']}});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(plain)), JSON.parse(JSON.stringify(none)));
  // and the sheet's replays pass the photos (Code.gs rplMake_, replayedAll_), as the device's (sync.js) and the admin's
  const gs = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
  const calls = [...gs.matchAll(/CORE_\.replayProgress\([^;]*/g)].map(m => m[0]);
  assert.ok(calls.length >= 2 && calls.every(c => /photos: st\.photos/.test(c)), calls.join('\n'));
});

test('the scoring record keeps the term (i), even at 0; the game rounds it before scoring', () => {
  assert.strictEqual(C.scoreRec({d: 0.1, i: 0.1234}).i, 0.123);
  assert.strictEqual(C.scoreRec({d: 0.1, i: 0}).i, 0);
  assert.ok(!('i' in C.scoreRec({d: 0.1})));
  assert.ok(!('i' in C.scoreRec({d: 0.1, i: 'x'})));
  assert.strictEqual(C.scoreRec(JSON.stringify({d: 0.1, i: -0.2})).i, -0.2);
  // the game (quiz.js: scoreIn, scoreAnswer, scoreLog) and the replay of what it logged give the same state
  const P = {},
    q = {t: 'Acropora', c: 'Acropora', ok: true, k: 2, chs: ['Acropora', 'Porites'], ph: ['a1'], d0: 0.3, mu: 0, sec: 16, ti: 0.4567};
  P[C.LEVEL] = {th: 0, ok: 12, ko: 0, rt: {80: 12}};
  const qi = C.scoreIn(q);
  assert.strictEqual(qi.ti, 0.457);
  const res = C.scoreAnswer(P, qi);
  assert.strictEqual(C.scoreLog(qi, res).i, 0.457);
  assert.ok(Math.abs(res.rw - Math.min(C.RTIME.HI, 1 - C.RTIME.K * (Math.log(16 / 8) - 0.457))) < 1e-9, String(res.rw));
});
