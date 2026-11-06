// The domain-score bar (Pierre, 2026-11-06, Q127-Q129, Q135; core.js DOM, domStep; docs/LEARNING.md "The domain-score
// bar"): a genus's bar is the share of all its possible photos the player would name alone and typed, the posterior
// expectation on a grid of abilities from a fixed population prior and the player's own answers on that genus only.
const test = require('node:test');
const assert = require('node:assert');
const C = require('../core.js');

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const KS = [2, 3, 4, Infinity];
const dup = x => JSON.parse(JSON.stringify(x));

// A question as quiz.js answer hands it to scoreAnswer (the inputs the scorer needs), on the domain-score rules.
const q = (t, ok, o = {}) => ({t, c: ok ? t : o.c || '', ok, k: 4, chs: [], ph: [], cv: !!o.c, d0: 0, mu: 0, ...o});

test('a miss never raises the bar, a right answer never lowers it (the posterior and the stored bar)', () => {
  const r = rng(11);
  let checked = 0;
  for (let run = 0; run < 400; run++) {
    const s = {};
    const n = Math.floor(r() * 40);
    for (let i = 0; i < n; i++) C.domStep(s, r() < 0.6, r() * 5 - 2, KS[Math.floor(r() * 4)], 0.5 + r() / 2, {mu: r() * 2 - 1});
    for (const ok of [false, true]) {
      const t = dup(s),
        b = t.ds || 0,
        mu = r() * 2 - 1,
        d = r() * 6 - 3,
        k = KS[Math.floor(r() * 4)];
      C.domStep(t, ok, d, k, 1, {mu});
      if (ok) assert.ok(t.ds >= b, `right answer lowered the bar ${b} -> ${t.ds}`);
      else assert.ok(t.ds <= b, `miss raised the bar ${b} -> ${t.ds}`);
      checked++;
    }
  }
  assert.strictEqual(checked, 800);
  // The same through the scorer, on the genus shown and on the genus wrongly given (Pierre's rule L2).
  const P = {};
  for (let i = 0; i < 30; i++) C.scoreAnswer(P, q('A', i % 4 !== 0, {d0: 0.3}));
  const a = P.A.ds;
  C.scoreAnswer(P, q('B', true, {d0: 0.3}));
  for (let i = 0; i < 5; i++) C.scoreAnswer(P, q('B', true, {d0: 0.3}));
  const b0 = P.B.ds;
  const sb0 = C.scoreOf(P.B, P, 'B');
  C.scoreAnswer(P, q('A', false, {c: 'B', chs: ['A', 'B', 'C', 'D'], d0: 1, mu: 0, muc: 0}));
  assert.ok(P.A.ds <= a, 'a miss lowers the genus shown');
  // The genus given (Q174): no miss in its posterior, a false alarm taken off its bar (faOf): lower, never higher.
  assert.strictEqual(P.B.ds, b0);
  assert.ok(C.scoreOf(P.B, P, 'B') < sb0, 'the genus given: its bar lower by its false-alarm rate');
});

test('the posterior update itself never moves its expectation against the answer (no drift)', () => {
  const r = rng(5);
  for (let i = 0; i < 300; i++) {
    let lp = C.DOM_PRIOR.slice();
    const n = Math.floor(r() * 20);
    for (let j = 0; j < n; j++) lp = C.domUpdate(lp, r() < 0.5, r() * 4 - 2, KS[Math.floor(r() * 4)], 1, 1, false);
    const mu = r() * 2 - 1,
      d = r() * 6 - 3,
      k = KS[Math.floor(r() * 4)],
      e = C.domScore(lp, mu);
    assert.ok(C.domScore(C.domUpdate(lp, false, d, k, 1, 1, false), mu) <= e + 1e-9);
    assert.ok(C.domScore(C.domUpdate(lp, true, d, k, 1, 1, false), mu) >= e - 1e-9);
  }
});

test('a genus never answered shows 0, and a first miss leaves it at 0', () => {
  assert.strictEqual(C.domBar(C.DOM_PRIOR, 0), 0);
  assert.strictEqual(C.scoreOf({}), 0);
  const s = {};
  C.domStep(s, false, 0, 4, 1, {mu: 0});
  assert.strictEqual(s.ds, 0);
  assert.ok(C.domOn(s) && s.dp.length === C.DOM.N);
  const t = {};
  C.domStep(t, true, 1, 4, 1, {mu: 0});
  assert.ok(t.ds > 0, 'a right answer credits it');
});

test('a very easy genus still reaches its exam: the ramp from the prior never caps the bar (Codex review #646)', () => {
  // A posterior with all its mass at the top of the grid: the bar near 1 whatever the genus offset, and increasing in
  // the domain score on both sides of the knee.
  const top = C.DOM_PRIOR.map((_, i) => (i === C.DOM.N - 1 ? 0 : -C.DOM.CLIP));
  for (const mu of [-4, -3, -2, -1, 0, 1, 2]) {
    assert.ok(C.domBar(top, mu) >= C.DOM.EX, `mu ${mu}: ${C.domBar(top, mu)}`);
    assert.strictEqual(C.domBar(C.DOM_PRIOR, mu), 0);
    let prev = -1;
    for (let j = 0; j < C.DOM.N; j++) {
      const lp = C.DOM_PRIOR.map((_, i) => (i === j ? 0 : -C.DOM.CLIP)),
        b = C.domBar(lp, mu);
      assert.ok(b >= prev - 1e-12, `mu ${mu}: not increasing at ${j}`);
      prev = b;
    }
  }
});

test("own answers only (Q128): another genus's answers and the global level never move a genus's bar", () => {
  const P = {};
  for (let i = 0; i < 6; i++) C.scoreAnswer(P, q('A', true, {d0: 0.5}));
  const A = dup(P.A);
  for (let i = 0; i < 40; i++) C.scoreAnswer(P, q('B', true, {d0: 1.5, k: Infinity}));
  assert.ok(P['~level'].th > 1, 'the global level rose');
  assert.deepStrictEqual([P.A.dp, P.A.ds], [A.dp, A.ds], "A's bar unchanged");
  // The game's ability on A did move with the level (levelMove): the bar does not use it.
  assert.notStrictEqual(C.abilityOf(P, 'A'), A.th);
});

test('format-aware: what a right answer proves grows with the choices, typed most; a miss costs the same whatever the choices', () => {
  const after = (ok, k) => {
    const s = {};
    C.domStep(s, true, 0.5, 4, 1, {mu: 0});
    C.domStep(s, ok, 0.5, k, 1, {mu: 0});
    return s.ds;
  };
  assert.ok(after(true, 2) < after(true, 4) && after(true, 4) < after(true, Infinity), 'right: 2 < 4 < typed');
  // A miss: the guess rate only explains right answers (P(miss) = (1 - 1/k)(1 - sig), the factor the same at every
  // ability), so a miss says the same about the ability among 2 choices, 4 or typed.
  const miss = k => {
    const s = {};
    for (let i = 0; i < 8; i++) C.domStep(s, true, 0.5, 4, 1, {mu: 0});
    const b = s.ds;
    C.domStep(s, false, 0.5, k, 1, {mu: 0});
    return b - s.ds;
  };
  assert.ok(Math.abs(miss(2) - miss(4)) < 1e-9 && Math.abs(miss(4) - miss(Infinity)) < 1e-9 && miss(4) > 0);
  // A harder photo: a right answer proves more, a miss less.
  const at = (ok, d) => {
    const s = {};
    for (let i = 0; i < 4; i++) C.domStep(s, true, 0, 4, 1, {mu: 0});
    C.domStep(s, ok, d, 4, 1, {mu: 0});
    return s.ds;
  };
  assert.ok(at(true, 2) > at(true, -1), 'right on a hard photo > on an easy one');
  assert.ok(at(false, 2) > at(false, -1), 'a miss on a hard photo costs less');
});

test('stable when photos are added (Q127): the bar reads the genus offset, never the photo list', () => {
  // The same log replayed with photo stats for many more photos (none answered): the same bars, to the last digit.
  const row = (i, g, ok) => [
    'p',
    i,
    g,
    ok ? g : 'B',
    ok ? 1 : 0,
    'quiz',
    g.toLowerCase() + (i % 3),
    null,
    null,
    0,
    'A B C D',
    null,
    5,
    ...new Array(C.LOG_SC - 13).fill(null),
    {d: 0.2 + (i % 4) / 5, m: 0.1}
  ];
  const rows = Array.from({length: 30}, (_, i) => row(i, i % 2 ? 'A' : 'C', i % 5 !== 0));
  const R1 = C.replayProgress(rows, {gen: {}}).p.P,
    R2 = C.replayProgress(rows, {gen: {}, gd: {A: [0.1, 5], C: [0.1, 5]}, mem: [0, -1, -2, -3]}).p.P;
  assert.deepStrictEqual([R1.A.ds, R1.C.ds], [R2.A.ds, R2.C.ds]);
  // The domain score is an integral over the photo population N(mu, TAU²): no photo enters it.
  const lp = R1.A.dp;
  assert.strictEqual(C.domBar(lp, 0.1), C.domBar(lp, 0.1));
  assert.ok(C.domBar(lp, 0.6) < C.domBar(lp, 0.1), 'a harder genus population: a lower share named');
});

test('the shared slope (Q147) is one input: the expectation and the posterior; 1 is the default', () => {
  const P1 = {},
    P2 = {},
    P3 = {};
  const a = C.scoreAnswer(P1, q('A', true, {d0: -1})),
    b = C.scoreAnswer(P2, q('A', true, {d0: -1, S: 1})),
    c = C.scoreAnswer(P3, q('A', true, {d0: -1, S: 0.4}));
  assert.deepStrictEqual(P1, P2);
  assert.strictEqual(a.e, b.e);
  assert.ok(c.e < a.e, 'a flatter slope: a lower expectation on an easy photo for an average player');
  assert.notDeepStrictEqual(P3.A.dp, P1.A.dp);
  // Logged and replayed: the scoring record carries it (s), the per-format offsets (o, t) and the genus offsets (m, n).
  assert.deepStrictEqual(C.scoreRec({d: 0, m: 0, n: -0.4, o: 0.2, t: 0.7, s: 0.4}), {d: 0, m: 0, n: -0.4, o: 0.2, t: 0.7, s: 0.4});
  assert.deepStrictEqual(C.scoreRec({d: 0, o: 0, t: 0, s: 1}), {d: 0}, 'defaults left out');
});

test('the exam opens at DOM.EX, a learned mark keeps at DOM.KEEP, 95% at most before the exam, 100% only once passed', () => {
  const s = {dp: C.DOM_PRIOR.slice(), ds: C.DOM.EX - 0.01};
  assert.ok(!C.examOpen(s) && Math.abs(C.barOf(s) - (C.DOM.EX - 0.01)) < 1e-12);
  s.ds = C.DOM.EX;
  assert.ok(C.examOpen(s) && C.keepsMark(s));
  s.ds = 0.99;
  assert.strictEqual(C.barOf(s), 0.95);
  s.ex = {k: 4};
  assert.ok(C.scoreOf(s) < 1 && C.scoreOf(s) > 0.95);
  s.ex = {k: 9};
  assert.strictEqual(C.scoreOf(s), 0.95 + (0.05 * 4) / 5, 'at most 4 of the 5 steps before the exam is passed');
  s.mx = 1;
  assert.strictEqual(C.scoreOf(s), 1);
  assert.ok(!C.keepsMark({dp: C.DOM_PRIOR.slice(), ds: C.DOM.KEEP - 0.01}));
  // A record not rebuilt yet (s.pg): the former rule, as before.
  assert.ok(C.examOpen({pg: C.PROG.M}) && !C.examOpen({pg: C.PROG.M - 0.01}));
  assert.strictEqual(C.barOf({pg: C.PROG.M / 2}), 0.95 / 2);
  assert.strictEqual(
    C.pctOf({A: {dp: C.DOM_PRIOR.slice(), ds: 0.5}, B: {pg: C.PROG.M}}, ['A', 'B', 'C']),
    Math.round((100 * (0.5 + 0.95)) / 3)
  );
});

test('learned-mark protection (coherence review F8, F9): a mark of the domain-score rules survives, a BKT one does not', () => {
  // A record of the new rules has no s.pg: the former guard (typeof s.pg) would have dropped its mark.
  const s = {ok: 9, ko: 0, dp: C.DOM_PRIOR.slice(), ds: 0.9, mx: Date.UTC(2026, 10, 7)};
  assert.ok(C.afterBkt(s));
  C.memRecalc(s, C.MEM.PRIOR);
  assert.ok(s.mx, 'kept by memRecalc');
  const bkt = {ok: 9, ko: 0, h: '111111111', L: 0.99, mx: 1};
  assert.ok(!C.afterBkt(bkt));
  C.memRecalc(bkt, C.MEM.PRIOR);
  assert.ok(!bkt.mx, 'a mark passed under BKT is dropped');
  // replayedOf keeps the saved mark of a domain-score record unless a later miss takes it away.
  const rows = Array.from({length: 6}, (_, i) => [
    'p',
    10 + i,
    'A',
    'A',
    1,
    'quiz',
    'a' + i,
    null,
    null,
    0,
    'A B C D',
    null,
    4,
    ...new Array(C.LOG_SC - 13).fill(null),
    {d: 1, m: 0}
  ]);
  const rep = C.replayProgress(rows, {gen: {}}).p;
  const M = C.replayedOf(rep, {A: {...s, ok: 1}}, C.RV);
  assert.ok(M.A.mx && C.domOn(M.A) && !('pg' in M.A));
  assert.ok(!C.replayedOf(rep, {A: {ok: 1, h: '1', L: 0.9, mx: 1}}, C.RV).A.mx, 'not one passed under BKT');
});

test('rule D4: before the sheet replays these rules (q.dom false) the moving average as before; a record with s.pg keeps it until a replay', () => {
  const P = {};
  C.scoreAnswer(P, q('A', true, {d0: 0, dom: false}));
  assert.ok(typeof P.A.pg === 'number' && !('dp' in P.A) && !('ds' in P.A));
  C.scoreAnswer(P, q('A', true, {d0: 0}));
  assert.ok(typeof P.A.pg === 'number' && !('dp' in P.A), 'a record with s.pg keeps it, rules on or not');
  C.scoreAnswer(P, q('B', true, {d0: 0}));
  assert.ok(C.domOn(P.B) && !('pg' in P.B), 'a genus first answered under the rules takes the bar');
  // The replay: dom false gives the former record, the default the new one.
  const rows = Array.from({length: 4}, (_, i) => [
    'p',
    i,
    'A',
    'A',
    1,
    'quiz',
    'a' + i,
    null,
    null,
    0,
    'A B C D',
    null,
    4,
    ...new Array(C.LOG_SC - 13).fill(null),
    {d: 0.5}
  ]);
  assert.ok(typeof C.replayProgress(rows, {gen: {}, dom: false}).p.P.A.pg === 'number');
  const R = C.replayProgress(rows, {gen: {}}).p.P.A;
  assert.ok(C.domOn(R) && !('pg' in R));
});

test('two devices and two accounts: the bar goes with the model of the side that played', () => {
  const B = {A: {ok: 2, ko: 0, h: '11', dp: C.DOM_PRIOR.slice(), ds: 0.1}},
    L = dup(B),
    R = dup(B);
  C.domStep(L.A, true, 1, 4, 1, {mu: 0});
  L.A.ok = 3;
  L.A.h = '111';
  const M = C.mergeProgress(B, L, R);
  assert.deepStrictEqual([M.A.dp, M.A.ds], [L.A.dp, L.A.ds]);
  // mergeUsers: the account that answered the genus more brings its bar, the other's never mixed in.
  const x = {A: {ok: 9, ko: 1, h: '1111111110', dp: C.DOM_PRIOR.map(v => v - 1), ds: 0.7}},
    y = {A: {ok: 2, ko: 0, h: '11', pg: 0.3}},
    U = JSON.parse(
      C.mergeUsers({'reefid-sync-coral-progress': JSON.stringify(y)}, {'reefid-sync-coral-progress': JSON.stringify(x)})[
        'reefid-sync-coral-progress'
      ]
    );
  assert.ok(C.domOn(U.A) && U.A.ds === 0.7 && !('pg' in U.A));
  const V = JSON.parse(
    C.mergeUsers(
      {'reefid-sync-coral-progress': JSON.stringify(x)},
      {'reefid-sync-coral-progress': JSON.stringify({A: {ok: 20, ko: 0, h: '1111111111', pg: 0.6}})}
    )['reefid-sync-coral-progress']
  );
  assert.ok(!('dp' in V.A) && !('ds' in V.A) && V.A.pg === 0.6);
});

test('the stored posterior stays compact: 21 numbers to 2 decimals, clipped', () => {
  const s = {};
  const r = rng(3);
  for (let i = 0; i < 300; i++) C.domStep(s, r() < 0.8, r() * 3 - 1, 4, 1, {mu: 0});
  assert.strictEqual(s.dp.length, C.DOM.N);
  assert.ok(s.dp.every(v => v <= 0 && v >= -C.DOM.CLIP && Math.round(v * 100) === Math.round(v * 100 + 1e-9)));
  assert.ok(s.dp.includes(0));
  assert.ok(JSON.stringify(s.dp).length < 200);
});

test('pair coverage (Q129): the exam waits until the genus has been compared with each of its look-alikes', () => {
  const P = {A: {ok: 9, ko: 0, off: {B: 2}}, C: {ok: 1, ko: 0, off: {}}, D: {ok: 3, ko: 1, conf: {A: 1}}};
  // B offered beside A (A's offers), D mixed up with A (D's record, the other way round); E never compared.
  assert.deepStrictEqual(C.looksLeft(P, 'A', ['B', 'D', 'E']), ['E']);
  assert.deepStrictEqual(C.looksLeft(P, 'A', ['B', 'D']), []);
  // C asked with A among its choices counts for A too (either way).
  P.C.off.A = 1;
  assert.deepStrictEqual(C.looksLeft(P, 'A', ['C']), []);
  assert.deepStrictEqual(C.looksLeft(P, 'A', []), [], 'a genus without look-alikes in play');
  assert.deepStrictEqual(C.looksLeft({}, 'A', ['B']), ['B']);
});

test('pair coverage counts a look-alike declared on either side (model.js examLooks, as isLook reads them)', () => {
  const vm = require('vm'),
    src = require('fs').readFileSync(require('path').join(__dirname, '..', 'model.js'), 'utf8'),
    block = require('./block.js');
  // Acropora lists Montipora, Montipora does not list Acropora (the coral data's own case, Codex on #646).
  const look = {Acropora: ['Montipora', 'Isopora'], Montipora: ['Porites'], Porites: [], Isopora: [], Pavona: []};
  const ctx = {
    GX: n => (look[n] ? {look: look[n]} : null),
    slateGenera: () => ['Acropora', 'Montipora', 'Porites', 'Pavona'],
    bonusList: () => []
  };
  vm.createContext(ctx);
  vm.runInContext(block(src, 'const examLooks = ', '\nconst lookLeft', {file: 'model.js'}) + '\nthis.f = examLooks;', ctx);
  const f = n => [...ctx.f(n)].sort(); // copied out of the vm's realm
  assert.deepStrictEqual(f('Montipora'), ['Acropora', 'Porites'], 'the reverse declaration counts');
  assert.deepStrictEqual(f('Acropora'), ['Montipora'], 'Isopora is not in play');
  assert.deepStrictEqual(f('Pavona'), []);
  // With Montipora compared with Porites only, Acropora is still left: the exam waits.
  const P = {Montipora: {ok: 20, ko: 0, off: {Porites: 3}}};
  assert.deepStrictEqual(C.looksLeft(P, 'Montipora', f('Montipora')), ['Acropora']);
});

test('the false-alarm correction (Q174; Snodgrass & Corwin 1988, Pr = H - FA): false alarms over the questions where the genus could be given', () => {
  const ds = 0.6,
    P = {
      B: {ok: 5, ko: 0, dp: C.DOM_PRIOR.slice(), ds},
      A: {ok: 6, ko: 2, off: {B: 6, C: 2}, conf: {B: 2}},
      C: {ok: 3, ko: 1, off: {B: 2}, conf: {}},
      '~level': {ok: 20, ko: 3, tyk: {'': 4}}
    };
  // 2 false alarms on B; B offered 8 times beside other genera, and 4 typed questions on other genera: 2 / 12.
  assert.strictEqual(C.faOf(P, 'B'), 2 / 12);
  assert.ok(Math.abs(C.barOf(P.B, P, 'B') - (ds - 2 / 12)) < 1e-12);
  assert.strictEqual(C.barOf(P.B), ds, 'without the record, no correction');
  // Typed questions on B itself are no chance to give B for another genus.
  P.B.ty = 3;
  assert.strictEqual(C.faOf(P, 'B'), 2 / 9);
  // Never below 0; no question where B could be given: no correction.
  P.A.conf.B = 50;
  assert.strictEqual(C.barOf(P.B, P, 'B'), 0);
  assert.strictEqual(C.faOf({B: P.B}, 'B'), 0);
  // The exam's entry and the learned mark read the corrected value too.
  const Q = {B: {ok: 9, ko: 0, dp: C.DOM_PRIOR.slice(), ds: 0.9}, A: {ok: 1, ko: 0, off: {B: 10}, conf: {B: 1}}};
  assert.ok(C.examOpen(Q.B) && !C.examOpen(Q.B, Q, 'B'), '0.9 - 0.1 is under the exam entry');
  assert.ok(C.keepsMark(Q.B, Q, 'B'));
  assert.strictEqual(C.pctOf(Q, ['B']), 80);
});

test('typed questions are counted (ty), replayed, merged and added up across accounts', () => {
  const P = {};
  C.scoreAnswer(P, q('A', true, {k: Infinity}));
  C.scoreAnswer(P, q('B', false, {k: Infinity, c: 'A'}));
  assert.deepStrictEqual([P['~level'].tyk, P.A.ty, P.B.ty], [{'': 2}, 1, 1]);
  // B typed by mistake... here A was typed for a B photo: one false alarm on A out of 1 typed question on another genus.
  assert.strictEqual(C.faOf(P, 'A'), 1);
  const B = {A: {ok: 1, ko: 0, ty: 1}},
    L = {A: {ok: 2, ko: 0, ty: 2}},
    R = {A: {ok: 2, ko: 0, ty: 2}};
  assert.strictEqual(C.mergeProgress(B, L, R).A.ty, 3);
});

test('typed chances to name a unit count only the questions of its rank (Codex review #646: a family is never typed on a genus question)', () => {
  const P = {};
  for (let i = 0; i < 20; i++) C.scoreAnswer(P, q('g:Chromis', true, {k: Infinity}));
  C.scoreAnswer(P, q('f:Damselfishes', false, {k: Infinity, c: 'f:Angelfishes'}));
  assert.deepStrictEqual(P['~level'].tyk, {g: 20, f: 1});
  // One false alarm on the Angelfishes family over the one typed family question: rate 1, not 1 / 21.
  assert.strictEqual(C.faOf(P, 'f:Angelfishes'), 1);
});

test("replayedOf keeps a genus's offers and mix-ups even when none of its rows moved its bar (Codex review #646)", () => {
  const rows = [['p', 1, 'A', 'B', 0, 'quiz', 'a1', null, null, 0, 'A B C D', null, null, ...new Array(C.LOG_SC - 13).fill(null), null]];
  const rep = C.replayProgress(rows, {gen: {}}).p;
  const M = C.replayedOf(rep, {}, C.RV);
  assert.deepStrictEqual([M.A.conf, M.A.off], [{B: 1}, {B: 1, C: 1, D: 1}]);
});

test('the typed format offset (dt) enters the domain score, is logged (sc t) and replayed (Codex review #646)', () => {
  // quiz.js answer passes it on every question.
  const quiz = require('fs').readFileSync(require('path').join(__dirname, '..', 'quiz.js'), 'utf8');
  assert.match(quiz, /dt: fmtOff\(PFMT, 'typed'\)/);
  const q0 = {t: 'A', c: 'A', ok: true, k: 4, chs: ['A', 'B', 'C', 'D'], ph: ['a1'], d0: 0, fam: 0, cf: 0, p: 0, timed: false, mu: 0};
  const P1 = {},
    P2 = {},
    qa = C.scoreIn({...q0}),
    qb = C.scoreIn({...q0, dt: -1});
  for (let i = 0; i < 20; i++) (C.scoreAnswer(P1, qa), C.scoreAnswer(P2, qb));
  // A typed format harder than the app thought (offset -1): the share named typed and alone is lower.
  assert.ok(P2.A.ds < P1.A.ds, `${P2.A.ds} < ${P1.A.ds}`);
  assert.strictEqual(C.scoreLog(qb, {look: false}).t, -1);
  const row = [
    'p',
    1,
    'A',
    'A',
    1,
    'quiz',
    'a1',
    null,
    null,
    0,
    'A B C D',
    null,
    null,
    ...new Array(C.LOG_SC - 13).fill(null),
    C.scoreLog(qb, {look: false})
  ];
  const R = C.replayProgress(
    Array.from({length: 20}, (_, i) => Object.assign(row.slice(), {1: i + 1})),
    {gen: {}}
  ).p.P.A;
  assert.strictEqual(R.ds, P2.A.ds, 'replayed with the logged typed offset');
});

test('the replay judge reads the bar with the record, so the false-alarm correction is judged as the app shows it (Codex review #646)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'tools', 'barjudge.js'), 'utf8');
  assert.match(src, /C\.scoreOf\(P\[g\], P, g\)/);
  assert.doesNotMatch(src, /C\.scoreOf\(P\[g\]\)/);
});

test('a non-replayed subject (fish, Q200): its units rebuilt on the device from their counts, silently, marks kept', () => {
  // core.js domFromCounts: deterministic, the earlier answers spread evenly, the last 10 in their order.
  const fast = {ok: 6, ko: 0, h: '111111', pg: 0.6}; // the moving average after 6 right answers: 71% on the bar
  const r = C.domFromCounts(fast, 0.5, 4, 0);
  assert.deepStrictEqual(C.domFromCounts(fast, 0.5, 4, 0), r, 'the same on every device');
  assert.ok(C.barOf(fast) > 0.7 && r.ds < C.barOf(fast) - 0.05, `an over-fast record drops: ${C.barOf(fast)} -> ${r.ds}`);
  // More answers, the same share right: more credit; a run of misses last: less than the same misses first.
  assert.ok(C.domFromCounts({ok: 24, ko: 0, h: '1111111111'}, 0.5).ds > r.ds);
  assert.ok(C.domFromCounts({ok: 10, ko: 5, h: '1111100000'}, 0.5).ds < C.domFromCounts({ok: 10, ko: 5, h: '0000011111'}, 0.5).ds);
  // model.js domRecalcAll, run from its source on stubs: units with s.pg rebuilt once, learned marks kept, saved and
  // logged; a replayed subject (the corals) left to the sheet's replay.
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    block = require('./block.js'),
    src = block(fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'), 'function domRecalcAll() {', '\n}\n', {
      through: true,
      file: 'model.js'
    });
  const run = (subj, P, GX = () => ({})) => {
    const ctx = {
      ...C,
      SUBJ: subj,
      P,
      GX,
      GDIFF: {},
      LEVEL: '~level',
      PICKD: {SINGLE: 0.5},
      domRules: () => true,
      genusDiff: () => 0,
      saved: 0,
      logs: []
    };
    ctx.save = () => ctx.saved++;
    ctx.ev = (k, o) => ctx.logs.push([k, o.msg]);
    vm.createContext(ctx);
    vm.runInContext(src + '\nthis.out = domRecalcAll();', ctx);
    return ctx;
  };
  const P = {
    'f:Angelfishes': {ok: 6, ko: 0, h: '111111', pg: 0.6},
    'f:Butterflyfishes': {ok: 30, ko: 2, h: '1111111111', pg: 0.85, mx: 1793900000000},
    'f:Gobies': {ok: 0, ko: 0, h: ''},
    '~level': {ok: 38, ko: 2, th: 1}
  };
  const a = run({id: 'fish', replay: false}, P);
  assert.ok(a.out && a.saved === 1 && a.logs.length === 1 && a.logs[0][0] === 'recalc');
  assert.ok(C.domOn(P['f:Angelfishes']) && !('pg' in P['f:Angelfishes']) && P['f:Angelfishes'].ds < 0.7);
  assert.ok(P['f:Butterflyfishes'].mx && C.afterBkt(P['f:Butterflyfishes']), 'the learned mark kept');
  assert.ok(!('dp' in P['f:Gobies']), 'a unit never answered is left alone');
  const again = run({id: 'fish', replay: false}, P);
  assert.ok(!again.out && again.saved === 0, 'once per record');
  const Q = {Acropora: {ok: 6, ko: 0, h: '111111', pg: 0.6}};
  assert.ok(!run({id: 'coral', replay: true}, Q).out && Q.Acropora.pg === 0.6, 'a replayed subject waits for the sheet');
  // Codex review #688: a pull read while the fish data is not in (FISH null: GX knows no fish unit) rebuilds nothing,
  // since the rebuild is for good and the difficulty would be the fallback one; it waits for the data.
  const W = {'f:Wrasses': {ok: 6, ko: 0, h: '111111', pg: 0.6}};
  const w = run({id: 'fish', replay: false}, W, () => undefined);
  assert.ok(!w.out && w.saved === 0 && W['f:Wrasses'].pg === 0.6 && !('dp' in W['f:Wrasses']), 'no data, no rebuild');
  assert.ok(run({id: 'fish', replay: false}, W).out && C.domOn(W['f:Wrasses']), 'rebuilt once the data is in');
});

test("the fish rebuild replays no false alarm as an own miss (Codex review #688): h's zeros capped at ko", () => {
  // A false alarm (this unit named on another's photo) adds a 0 to h and no ko: six right answers and one false alarm
  // rebuild as six right answers, the false alarm left to faOf.
  const six = C.domFromCounts({ok: 6, ko: 0, h: '111111'}, 0.5);
  assert.deepStrictEqual(C.domFromCounts({ok: 6, ko: 0, h: '111110'}, 0.5), six);
  assert.deepStrictEqual(C.domFromCounts({ok: 6, ko: 0, h: '101111'}, 0.5), six);
  // An own miss is kept: one ko, two zeros in h, the latest zero kept.
  assert.deepStrictEqual(C.domFromCounts({ok: 6, ko: 1, h: '0111110'}, 0.5), C.domFromCounts({ok: 6, ko: 1, h: '1111110'}, 0.5));
  assert.ok(C.domFromCounts({ok: 6, ko: 1, h: '1111110'}, 0.5).ds < six.ds);
});
