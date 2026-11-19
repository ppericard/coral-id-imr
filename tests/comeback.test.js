require('./slot.js').testGuard();
// The comeback after a break (model.js, docs/LEARNING.md "Comeback after a break"): model.js's own code run in Node on
// stubs (the player's record P, the ability and genus difficulty, the store).
const test = require('node:test');
const cut = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const {pgMissW} = require('../core.js');

const DAY = 864e5,
  MIN = 60000;
// The opening hold's tolerance as model.js sets it (INTRO.SLACK), which the comeback's sum takes too.
const SRC = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8'),
  SLACK = Number(/const INTRO = \{[\s\S]*?\bSLACK: ([\d.]+)/.exec(SRC)[1]);
function model({P = {}, th = {}, answers = 0, slack = SLACK, closed = () => false} = {}) {
  const src = SRC,
    pick = (a, b) => cut(src, a, b),
    hold = /const holdNext = [\s\S]*?;\n/.exec(src.slice(src.indexOf('const holdNext')))[0],
    block = pick('// Comeback after a break (Pierre', 'function weighted(');
  const saved = {},
    ctx = {
      P,
      LEVEL: '~level',
      INTRO: {SLACK: slack},
      PICKD: {P: 0.8},
      aimOff: (k = 4) => Math.log((0.8 - 1 / k) / (1 - 1 / k) / (1 - (0.8 - 1 / k) / (1 - 1 / k))),
      pgMissW, // core.js (shared with the full replay)
      sig: x => 1 / (1 + Math.exp(-x)),
      ability: n => th[n] ?? 0,
      genusDiff: () => 0,
      GX: n => n !== '~level',
      slateGenera: () => Object.keys(P).filter(n => n !== '~level'),
      bonusList: () => [],
      asked: n => !!((P[n] || {}).ok || (P[n] || {}).ko),
      closed, // model.js: a unit closed by One at a time or answered live before its card
      answersSoFar: () => answers,
      sDev: n => 'reefid-' + n, // the corals' device keys (app.js sDev)
      store: {get: (k, d) => (k in saved ? saved[k] : d), set: (k, v) => (saved[k] = v)}
    };
  vm.createContext(ctx);
  vm.runInContext(
    hold +
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
    // rustNow says when a new visit starts, so quiz.js replans the questions planned before the break.
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
  // A player whose only answers are a live game's on units still closed (rule L4; model.js introLive): no comeback, no
  // floor, so the first cards come (Codex review #1234).
  const L = model({P: player(5, 40 * MIN), answers: 5, closed: () => true});
  assert.strictEqual(L.rustNow(), false);
  assert.ok(!L.noOpen() && L.cb().r === 0);
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

// The comeback's tolerance (docs/LEARNING.md "The comeback's tolerance"): the comeback's sum
// takes the opening hold's tolerance, INTRO.SLACK an answer, on top of the rust a question repairs.
// n comeback questions, m of them missed and spread evenly from the first (a miss at 0, then every n/m), each at the
// recall-adjusted chance p on a usual 4-choice question; the answer at which the comeback ended (0: it ran them all) and
// the sum at the start.
function cbRun({genera, ago, n, m, p, slack}) {
  const M = model({P: player(genera, ago), slack});
  M.rustNow();
  const r0 = M.cb().r,
    R = M.recallAt('g0'),
    s = (p - 1 / 4) / ((1 - 1 / 4) * R), // sig(th - d) that gives the chance p at the recall R
    th = Math.log(s / (1 - s));
  let end = 0;
  for (let i = 0; i < n && !end; i++) {
    M.comebackStep(R, th, 0, 4, !(Math.ceil(((i + 1) * m) / n) > Math.ceil((i * m) / n)));
    if (M.cb().r === 0) end = i + 1;
  }
  return {r0, R, end, r: M.cb().r};
}

test("the study's case (Q367): 0.075 an answer below expectation no longer holds a whole 40-question visit", () => {
  // The study's P5 (docs/reviews/2026-11-14-comeback-study.md): back after 1.03 days with 29 genera answered right, 40
  // comeback questions, 27 right at a mean expectation of 0.75. The order of her answers is not published: here the
  // misses come every third answer from the first, an order under which the rule without tolerance (slack 0) ran all
  // 40, as hers did.
  const P5 = {genera: 29, ago: 1.03 * DAY, n: 40, m: 13, p: 0.75};
  const before = cbRun({...P5, slack: 0}),
    now = cbRun(P5);
  // An honest starting sum: the FSRS rust of 29 genera after a day (each genus at stability x 0.5, one day answered right).
  assert.ok(before.r0 > 0.5 && before.r0 < 1, before.r0);
  assert.ok(before.R > 0.9 && before.R < 1, before.R);
  assert.strictEqual(before.end, 0, 'the rule before Q367: still in the comeback after 40 questions');
  assert.ok(before.r > before.r0 + 1, `the sum grew: ${before.r0} -> ${before.r}`);
  assert.ok(now.end > 0 && now.end < 40, `the tolerance ends it within the visit (${now.end})`);
  assert.strictEqual(SLACK, 0.1, "model.js INTRO.SLACK, the opening hold's tolerance");
});

test('the tolerance does not end every comeback: more than 0.1 an answer below expectation still holds it', () => {
  // 24 right of 40 at 0.75 (0.15 below): the sum still grows, as the tolerance keeps for a player who really struggles.
  const r = cbRun({genera: 29, ago: 1.03 * DAY, n: 40, m: 16, p: 0.75});
  assert.strictEqual(r.end, 0);
  assert.ok(r.r > r.r0, `${r.r0} -> ${r.r}`);
  // At the expected rate (30 of 40) it now ends sooner than before.
  const at = slack => cbRun({genera: 29, ago: 3 * DAY, n: 40, m: 10, p: 0.75, slack}).end;
  assert.ok(at(SLACK) > 0 && (at(0) === 0 || at(SLACK) < at(0)), `${at(SLACK)} / ${at(0)}`);
});

test("the comeback reads the opening hold's tolerance itself: INTRO.SLACK 0 gives the rule before Q367", () => {
  // One right answer at p 0.75, R 0.9, l = 0.75 x 2/3 x 0.1: the sum falls by 1 - p + l, plus the tolerance.
  const step = slack => {
    const M = model({slack});
    M.setCb({r: 2, t: 0, ok: 0, f: 0});
    const x = 0.75 * (2 / 3),
      th = Math.log(2 / 3 / (1 - 2 / 3));
    M.comebackStep(0.9, th, 0, 4, true);
    return {r: M.cb().r, l: x * 0.1, p: 0.25 + x * 0.9};
  };
  const a = step(0),
    b = step(0.1),
    c = step(0.3);
  assert.ok(Math.abs(a.r - Math.round((2 + a.p - 1 - a.l) * 1000) / 1000) < 1e-9, a.r);
  assert.ok(Math.abs(b.r - (a.r - 0.1)) < 1.5e-3, `${b.r} ${a.r}`);
  assert.ok(Math.abs(c.r - (a.r - 0.3)) < 1.5e-3, `${c.r} ${a.r}`);
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
  // An answer recorded late (a live game's, given an hour ago) leaves the later time in place.
  const at0 = s.at;
  M.answeredAt(s, false, at0 - 3600e3);
  assert.strictEqual(s.at, at0);
  // Days answered right count once each, in order: yesterday then today counts 2; yesterday's right answer recorded
  // late after them counts nothing more and leaves the last day today, and today's next right answer adds nothing
  // (Codex review #1234).
  const today = Date.now(),
    yday = today - DAY,
    t = {};
  M.answeredAt(t, true, yday);
  M.answeredAt(t, true, today);
  assert.deepStrictEqual([t.dd, t.dl], [2, M.dayNo(today)]);
  M.answeredAt(t, true, yday + 1000);
  assert.deepStrictEqual([t.dd, t.dl, t.at], [2, M.dayNo(today), today]);
  M.answeredAt(t, true, today + 1000);
  assert.strictEqual(t.dd, 2);
  // Recall right after the answer: 1 at the same millisecond, a hair under it one tick later (recallAt reads the clock
  // again, and the clock can tick between the two calls).
  assert.ok(M.recallAt('g3') > 1 - 1e-6 && s.dd === dd + (s.dl === M.dayNo() ? 1 : 0) && s.dl === M.dayNo());
});

test('a miss the rust explains costs less progress (pgMissW with the recall)', () => {
  const f = pgMissW; // core.js (shared with the full replay)
  // A photo at the game's aim (aimOff(4) = 1.01 below the ability) or easier: in full.
  assert.strictEqual(f(1.02, 0, 4), 1);
  assert.strictEqual(f(1.02, 0, 4, 1), 1);
  const e = x => 0.25 + (0.75 * x) / (1 + Math.exp(-1));
  assert.ok(Math.abs(f(1, 0, 4, 0.6) - e(0.6) / 0.8) < 1e-9 && f(1, 0, 4, 0.6) < 0.75);
});
