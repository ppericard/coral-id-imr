// The comeback after a break (model.js, docs/LEARNING.md "Comeback after a break"): model.js's own code run in Node on
// stubs (the player's record P, the ability and genus difficulty, the store).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const DAY = 864e5,
  MIN = 60000;
function model({P = {}, th = {}, answers = 0} = {}) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    pick = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)),
    hold = /const holdNext = [\s\S]*?;\n/.exec(src.slice(src.indexOf('const holdNext')))[0],
    miss = pick('function pgMissW', 'const knownP'),
    block = pick('// Comeback after a break (Pierre', 'function weighted(list)');
  const saved = {},
    ctx = {
      P,
      LEVEL: '~level',
      INTRO: {SLACK: 0.1},
      PICKD: {TARGET_OFF: 1},
      sig: x => 1 / (1 + Math.exp(-x)),
      ability: n => th[n] ?? 0,
      genusDiff: () => 0,
      GX: n => n !== '~level',
      slateGenera: () => Object.keys(P).filter(n => n !== '~level'),
      bonusList: () => [],
      asked: n => !!((P[n] || {}).ok || (P[n] || {}).ko),
      answersSoFar: () => answers,
      store: {get: (k, d) => (k in saved ? saved[k] : d), set: (k, v) => (saved[k] = v)}
    };
  vm.createContext(ctx);
  vm.runInContext(
    hold +
      miss +
      block +
      '\nthis.M = {FSRS, SESSION, COMEBACK, recallOf, stability, recallAt, rustOf, rustNow, noOpen, comebackOf, comebackStep, answeredAt, dayNo, cb: () => CB, setCb: x => (CB = x)};',
    ctx
  );
  return ctx.M;
}
// A player who answered genera g0..g(n-1) right, the last answer `ago` ms before now (each genus's own time too).
function player(n, ago, extra = {}) {
  const now = Date.now(),
    P = {'~level': {ok: 10 * n, ko: 0, at: now - ago}};
  for (let i = 0; i < n; i++) P['g' + i] = {ok: 10, ko: 1, at: now - ago, dd: 1, ...extra};
  return P;
}

test('FSRS forgetting curve: R = 0.9 when t equals the stability, 1 at once, falling as a power law', () => {
  const M = model();
  assert.strictEqual(M.recallOf(0, 3), 1);
  assert.ok(Math.abs(M.recallOf(3.2, 3.2) - 0.9) < 1e-9);
  assert.ok(Math.abs(M.recallOf(15.7, 15.7) - 0.9) < 1e-9);
  assert.ok(M.recallOf(1, 3) > M.recallOf(7, 3) && M.recallOf(7, 3) > M.recallOf(30, 3));
  assert.ok(M.recallOf(30, 15.7) > M.recallOf(30, 3.2));
});

test('stability: FSRS first-rating stabilities by how solid the genus is, x 2.5 per further day answered right', () => {
  const P = {weak: {ok: 1}, avg: {ok: 3}, mx: {ok: 9, mx: 1}, spaced: {ok: 9, mx: 1, dd: 3}};
  const M = model({P, th: {weak: -20, avg: 0, mx: -20, spaced: -20}});
  assert.ok(Math.abs(M.stability('weak') - 0.4) < 1e-6); // Again
  assert.ok(Math.abs(M.stability('mx') - 15.7) < 1e-9); // Easy: learned
  const s = M.stability('avg'); // x 0.5, between Hard 1.2 and Good 3.2
  assert.ok(s > 1.2 && s < 3.2, s);
  assert.ok(Math.abs(M.stability('spaced') - 15.7 * 2.5 ** 2) < 1e-9);
  // Hard and Good sit near a third and two thirds of the way on the log scale.
  const x = S => Math.log(S / 0.4) / Math.log(15.7 / 0.4);
  assert.ok(Math.abs(x(1.2) - 0.3) < 0.01 && Math.abs(x(3.2) - 0.57) < 0.01);
});

test('rust grows with the break and is near 0 after 10 minutes; a solid player rusts less', () => {
  const rust = (ago, th = 0, extra) => {
    const M = model({P: player(15, ago, extra), th: Object.fromEntries(Array.from({length: 15}, (_, i) => ['g' + i, th]))});
    M.rustNow();
    return M.cb().r;
  };
  assert.strictEqual(rust(10 * MIN), 0); // no new visit: no comeback
  const r30 = rust(31 * MIN); // a new visit: a comeback, tiny
  assert.ok(r30 > 0 && r30 < 0.05, r30);
  const L = [8 * 60 * MIN, 3 * DAY, 7 * DAY, 30 * DAY].map(t => {
    const M = model({P: player(15, t)});
    // the rust itself, whatever starts a comeback
    return 15 * M.rustOf(M.recallAt('g0'));
  });
  for (let i = 1; i < L.length; i++) assert.ok(L[i] > L[i - 1], L.join());
  assert.ok(L[0] < 0.5 && L[3] > 2, L.join());
  assert.ok(rust(30 * DAY) > rust(30 * DAY, 3)); // a strong ability: more stable
  assert.ok(rust(30 * DAY, 3) > rust(30 * DAY, 3, {dd: 4})); // spaced days: more stable still
  // The rust of a genus: 0 at R = 1, the 4-choice question's success above chance at R = 0.
  const M = model();
  assert.strictEqual(M.rustOf(1), 0);
  assert.ok(M.rustOf(0.5) > M.rustOf(0.9));
});

test('a visit starts after 30 minutes without an answer: the floor of 10 answers, comeback or not', () => {
  for (const [ago, floor] of [
    [20 * MIN, false],
    [40 * MIN, true]
  ]) {
    const M = model({P: player(5, ago), answers: 50});
    // rustNow says when a new visit starts, so quiz.js replans the questions planned before the break (Codex review #374).
    assert.strictEqual(M.rustNow(), floor);
    assert.ok(floor ? M.cb().r > 0 && M.cb().r < 0.05 : M.cb().r === 0, M.cb().r); // a tiny comeback at a new visit
    assert.strictEqual(M.noOpen(), floor);
    // The floor outlasts a comeback that one right answer ends.
    M.comebackStep(1, 0, -1, 2, true);
    assert.strictEqual(M.cb().r, 0);
    assert.strictEqual(M.noOpen(), floor);
    if (floor) assert.strictEqual(M.cb().f, 50 + M.COMEBACK.FLOOR);
  }
  // A player with fewer than 2 genera answered right: nothing to come back to.
  const M = model({P: player(1, 30 * DAY), answers: 11});
  M.rustNow();
  assert.ok(!M.noOpen() && M.cb().r === 0);
  // A brand-new player: no time at all.
  const N = model({P: {}});
  N.rustNow();
  assert.ok(!N.noOpen());
});

test('comeback stop rule: a CUSUM that right answers melt and misses keep going; it ends at 0', () => {
  const run = (good, R = 0.6) => {
    const M = model({P: player(20, 7 * DAY)});
    M.rustNow();
    const r0 = M.cb().r;
    assert.ok(r0 > 1, r0);
    const out = [];
    for (let i = 0; i < 100 && M.cb().r > 0; i++) (M.comebackStep(R, 0, -1, 4, good(i)), out.push(M.cb().r));
    return {r0, out};
  };
  const all = run(() => true);
  assert.ok(all.out.length < 15 && all.out[all.out.length - 1] === 0, all.out.join());
  for (let i = 1; i < all.out.length; i++) assert.ok(all.out[i] < all.out[i - 1]);
  // At the expected rate (p ~ 0.62 here) it still ends (each question repairs its own rust), later than all right.
  const exp = run(i => i % 5 !== 1 && i % 5 !== 3);
  assert.ok(exp.out.length > all.out.length && exp.out[exp.out.length - 1] === 0, exp.out.length);
  // A miss adds to it.
  const M = model({P: player(20, 7 * DAY)});
  M.rustNow();
  const r = M.cb().r;
  M.comebackStep(0.6, 0, -1, 4, false);
  assert.ok(M.cb().r > r);
});

test('comeback questions: the surest genera until one is right, then the most rusted', () => {
  const P = player(6, 30 * DAY);
  ['g0', 'g1', 'g2'].forEach(n => (P[n].dd = 4)); // spaced: sure
  const M = model({P});
  M.rustNow();
  const first = M.comebackOf(Object.keys(P).filter(n => n !== '~level'));
  assert.deepStrictEqual(first.slice().sort(), ['g0', 'g1', 'g2']);
  M.comebackStep(0.9, 0, -1, 4, true);
  const then = M.comebackOf(Object.keys(P).filter(n => n !== '~level'));
  assert.deepStrictEqual(then.slice().sort(), ['g3', 'g4', 'g5']);
  // An answer refreshes its genus and counts a new day answered right once a day.
  const s = P.g3,
    dd = s.dd;
  M.answeredAt(s, true);
  M.answeredAt(s, true);
  // Recall right after the answer: 1 at the same millisecond, a hair under it one tick later (recallAt reads the clock
  // again; CI failed on PR #380 when it ticked between the two calls).
  assert.ok(M.recallAt('g3') > 1 - 1e-6 && s.dd === dd + (s.dl === M.dayNo() ? 1 : 0) && s.dl === M.dayNo());
});

test('a miss the rust explains costs less progress (pgMissW with the recall)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
    ctx = {PICKD: {TARGET_OFF: 1}, sig: x => 1 / (1 + Math.exp(-x))};
  vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf('function pgMissW'), src.indexOf('const knownP')) + '\nthis.f = pgMissW;', ctx);
  assert.strictEqual(ctx.f(1, 0, 4), 1);
  assert.strictEqual(ctx.f(1, 0, 4, 1), 1);
  const e = x => 0.25 + (0.75 * x) / (1 + Math.exp(-1));
  assert.ok(Math.abs(ctx.f(1, 0, 4, 0.6) - e(0.6) / e(1)) < 1e-9 && ctx.f(1, 0, 4, 0.6) < 0.75);
});
