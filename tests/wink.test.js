// The fish surprise cards come late (quiz.js WINK, winkDue; Pierre, 2026-11-06: his second fish question was the whale
// shark; the first only after at least 300 fish answers, the next after about 600-700): quiz.js's own code runs in Node
// on stubs (the player's answer count, the store, the subject's winks).
const test = require('node:test');
const assert = require('node:assert');
const cut = require('./block.js');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
// One page of the app: the subject on screen (fish by default), its answer count n, the device's storage (saved, kept
// across "reloads" when passed again), a card on screen or not.
function page({subj = 'fish', n = 0, saved = {}} = {}) {
  const ctx = {
    SUBJ: C.subjectOf(subj),
    UNITS: {fish: {winks: () => ['t51', 't60']}, coral: {winks: () => []}},
    n,
    card: false,
    store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
  };
  ctx.sDev = name => C.subjDev(ctx.SUBJ.id, name);
  ctx.answersSoFar = () => ctx.n;
  ctx.document = {querySelector: s => (s === '.unlock' && ctx.card ? {} : null)};
  vm.createContext(ctx);
  vm.runInContext(
    cut(src, 'const WINK = {', 'function winkShow(', {file: 'quiz.js'}) +
      // winkShow's bookkeeping, without its screen (the lines that mark a surprise shown)
      '\nthis.M = {WINK, winkAt, winkSlot, winkDue, shown: ({k}) => ((WINKS[SUBJ.id] = k), store.set(WINKK(), k))};',
    ctx
  );
  return Object.assign(ctx.M, {ctx, saved});
}
// Play a page from answer a to b, one question at a time; each surprise shown is answered (it adds no answer), then the
// question. Returns [answer count, wink] for each surprise.
function play(M, a, b) {
  const out = [];
  for (M.ctx.n = a; M.ctx.n < b; M.ctx.n++) {
    const w = M.winkDue();
    if (w) (out.push([M.ctx.n, w.n]), M.shown(w));
    assert.strictEqual(M.winkDue(), null, 'never twice in a row');
  }
  return out;
}

test('surprise thresholds: one named constant, 300 then 600-700, the later ones never closer', () => {
  const M = page();
  assert.strictEqual(M.WINK.AT[0], 300);
  assert.ok(M.WINK.AT[1] >= 600 && M.WINK.AT[1] <= 700, String(M.WINK.AT[1]));
  const gap = M.WINK.AT[1] - M.WINK.AT[0];
  for (let k = 2; k < 6; k++) assert.ok(M.winkAt(k) - M.winkAt(k - 1) >= gap, `surprise ${k}: ${M.winkAt(k)}`);
});

test('no surprise before 300 fish answers, the first just after, none again before 600', () => {
  const M = page();
  assert.deepStrictEqual(play(M, 0, 300), [], 'none before 300');
  const first = play(M, 300, 600);
  assert.deepStrictEqual(first, [[300, 't51']], 'the first at 300, once');
  assert.strictEqual(play(M, 600, M.WINK.AT[1]).length, 0, 'none again before the second threshold');
  assert.deepStrictEqual(play(M, M.WINK.AT[1], M.winkAt(2)), [[M.WINK.AT[1], 't60']], 'the second, the other wink');
  assert.deepStrictEqual(play(M, M.winkAt(2), M.winkAt(2) + 1), [[M.winkAt(2), 't51']], 'the third: the first wink again');
});

test('a card on screen delays the surprise within its window; past the window it is skipped', () => {
  const M = page({n: 300});
  M.ctx.card = true;
  assert.strictEqual(M.winkDue(), null, 'never over a card');
  M.ctx.card = false;
  M.ctx.n = 310;
  assert.strictEqual(JSON.stringify(M.winkDue()), '{"n":"t51","k":0}', 'the next question, still in the window');
  const late = page({n: 300 + M.WINK.WIN});
  assert.strictEqual(late.winkDue(), null, 'past the window: no catch-up (a sign-in on a new device at 400)');
  assert.strictEqual(page({n: 400}).winkDue(), null);
});

test('the count is the record: a reload keeps it, and a surprise shown is not shown again on the device', () => {
  const saved = {},
    a = page({n: 305, saved});
  const w = a.winkDue();
  assert.ok(w);
  a.shown(w);
  // A reload (a new page on the same device and record): the count comes back from the record, never from 0.
  const b = page({n: 306, saved});
  assert.strictEqual(b.winkDue(), null, 'not again after a reload in its window');
  assert.deepStrictEqual(play(b, 306, 600), [], 'nothing before the second');
  // A reload long before 300 never brings one (the count is the player's, not the visit's).
  assert.strictEqual(page({n: 2}).winkDue(), null, "Pierre's case: the second question");
});

test('the corals have no surprise', () => {
  const M = page({subj: 'coral'});
  assert.deepStrictEqual(play(M, 0, 2000), []);
});
