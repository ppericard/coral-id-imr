require('./slot.js').testGuard();
// The photo's time term (core.js PTIME, ptimeStep, ptimeOut, ptimeInto, ptimeOff; docs/LEARNING.md "The photo's time
// term"): which answers feed it, the weight by the player's level, the enlargement against habit, the fade by
// information, and that the progress replay never reads it (rule D5).
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

test('rule D5: the progress replay never reads the photos or their time terms', () => {
  // replayProgress takes gen, mem, conf, fmt, gd (and its own options): a photo's term moves only future answers' d0,
  // which each answer logs in its scoring record, so the replay of a logged answer is the same with or without it.
  const gen = {Acropora: {}, Porites: {}},
    row = (i, ok) => {
      const r = new Array(C.LOG_SC + 1).fill(null);
      Object.assign(r, {
        0: 'p1',
        1: Date.UTC(2026, 10, 10) + i * 60000,
        2: 'Acropora',
        3: ok ? 'Acropora' : 'Porites',
        4: ok,
        5: 'quiz',
        6: 'a1',
        7: 0.7,
        8: 0.2,
        10: 'Acropora Porites',
        12: 5 + i
      });
      r[C.LOG_SC] = {d: 0.3 + i / 20, m: 0, n: 0};
      return r;
    },
    rows = [0, 1, 2, 3].map(i => row(i, i % 3 ? 1 : 0)),
    st = {gen, gd: {Acropora: [0.1, 5]}},
    a = C.replayProgress(rows, st),
    b = C.replayProgress(rows, {...st, photos: {a1: [0.4, 3, 2, 3, 'Acropora', 0.25, 0.1, 0.2]}});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)));
  // and the sheet's replays pass it none of the photos (Code.gs rplMake_, replayedAll_)
  const gs = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
  const calls = [...gs.matchAll(/CORE_\.replayProgress\([^;]*/g)].map(m => m[0]);
  assert.ok(calls.length >= 2 && calls.every(c => !/photos/.test(c)), calls.join('\n'));
});
