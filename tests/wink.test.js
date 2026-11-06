// The fish surprise cards (quiz.js WINK, winkDue, winkMerge; Pierre, 2026-11-06: his second fish question was the whale
// shark; the first only after at least 300 fish answers, the next after about 600-700; 13:31: each surprise once per
// player, and that's all, across devices): quiz.js's own code runs in Node on stubs (the player's answer count, the
// device's storage, the subject's winks).
const test = require('node:test');
const assert = require('node:assert');
const cut = require('./block.js');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
const WALE = 't51',
  THRESH = 't60';
// One page of the app on one device: the subject on screen (fish by default), its answer count n, the device's storage
// (saved, kept across "reloads" when passed again), a card on screen or not.
function page({subj = 'fish', n = 0, saved = {}} = {}) {
  const ctx = {
    SUBJ: C.subjectOf(subj),
    UNITS: {fish: {winks: () => [WALE, THRESH]}, coral: {winks: () => []}},
    n,
    card: false,
    winkUnion: C.winkUnion,
    store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (saved[k] = JSON.stringify(v))}
  };
  ctx.sKey = name => C.subjKey(ctx.SUBJ.id, name);
  ctx.answersSoFar = () => ctx.n;
  ctx.document = {querySelector: s => (s === '.unlock' && ctx.card ? {} : null)};
  vm.createContext(ctx);
  vm.runInContext(
    cut(src, 'const WINK = {', 'function winkShow(', {file: 'quiz.js'}) +
      // winkShow's bookkeeping, without its screen (the lines that mark a wink shown)
      '\nthis.M = {WINK, winkAt, winkDue, winkMerge, shown: ({n}) => { const a = answersSoFar(); WINKS[SUBJ.id] = {...(WINKS[SUBJ.id] || {}), [n]: a}; store.set(WINKK(), {...(store.get(WINKK(), null) || {}), [n]: a}); }};',
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

test('surprise thresholds: one named constant, 300 then 600-700', () => {
  const M = page();
  assert.strictEqual(M.WINK.AT[0], 300);
  assert.ok(M.WINK.AT[1] >= 600 && M.WINK.AT[1] <= 700, String(M.WINK.AT[1]));
});

test('none before 300 fish answers, the whale shark just after, the thresher at 650, then never again', () => {
  const M = page();
  assert.deepStrictEqual(play(M, 0, 300), [], 'none before 300');
  assert.deepStrictEqual(play(M, 300, 600), [[300, WALE]], 'the whale shark at 300, once');
  assert.deepStrictEqual(play(M, 600, M.WINK.AT[1]), [], 'none again before the second threshold');
  assert.deepStrictEqual(play(M, M.WINK.AT[1], 5000), [[M.WINK.AT[1], THRESH]], 'the thresher once, then nothing more');
});

test('a player already past both thresholds meets them apart, never back to back', () => {
  const M = page();
  const got = play(M, 900, 2000);
  assert.strictEqual(got.length, 2);
  assert.deepStrictEqual(got[0], [900, WALE]);
  assert.ok(got[1][0] - got[0][0] >= M.WINK.AT[1] - M.WINK.AT[0], JSON.stringify(got));
});

test('a card on screen delays the surprise; it comes at the next question', () => {
  const M = page({n: 300});
  M.ctx.card = true;
  assert.strictEqual(M.winkDue(), null, 'never over a card');
  M.ctx.card = false;
  M.ctx.n = 310;
  assert.strictEqual(M.winkDue().n, WALE);
});

test('once per player: not again after a reload, nor on another device of the account after a sync', () => {
  const phone = {},
    a = page({n: 305, saved: phone});
  a.shown(a.winkDue());
  // A reload (a new page on the same device and record).
  assert.deepStrictEqual(play(page({n: 306, saved: phone}), 306, 640), [], 'not again after a reload');
  // Sign-in on a laptop at 400 answers: the account's saved copy carries the travelling key, merged at the sync.
  const key = C.subjKey('fish', 'wink'),
    laptop = page({n: 400});
  assert.strictEqual(key, 'reefid-sync-fish-wink');
  laptop.winkMerge(phone[key]);
  assert.deepStrictEqual(play(laptop, 400, 640), [], 'the whale shark never again on the other device');
  assert.deepStrictEqual(play(laptop, 640, 700), [[655, THRESH]], 'the thresher there (650, and 350 after the whale shark at 305)');
  // Back on the phone after a sync: the thresher shown on the laptop never comes again either.
  const back = page({n: 700, saved: phone});
  back.winkMerge(laptop.saved[key]);
  assert.deepStrictEqual(play(back, 700, 3000), [], 'nothing more for this player');
});

test('the merge keeps the union, the earlier count, and ignores junk', () => {
  const M = page();
  M.winkMerge(JSON.stringify({[WALE]: 320}));
  M.winkMerge(JSON.stringify({[WALE]: 310, [THRESH]: 700}));
  M.winkMerge('not json');
  M.winkMerge('[1]');
  M.winkMerge(undefined);
  assert.deepStrictEqual(JSON.parse(M.saved['reefid-sync-fish-wink']), {[WALE]: 310, [THRESH]: 700});
});

test('a reload long before 300 brings none (Pierre: the whale shark as his second question)', () => {
  assert.strictEqual(page({n: 1}).winkDue(), null);
});

test('the corals have no surprise', () => {
  assert.deepStrictEqual(play(page({subj: 'coral'}), 0, 2000), []);
});

test("an account merge keeps both accounts' surprises met; sign-out clears the key (Codex review #652)", () => {
  const key = C.subjKey('fish', 'wink'),
    A = {[key]: JSON.stringify({[WALE]: 300, [THRESH]: 650})},
    B = {[key]: JSON.stringify({[WALE]: 310})};
  assert.deepStrictEqual(JSON.parse(C.mergeUsers(A, B)[key]), {[WALE]: 300, [THRESH]: 650});
  assert.strictEqual(key in C.mergeUsers({}, {}), false, 'no key when neither has one');
  const sync = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8'),
    so = cut(sync, 'function signOutClear(', '\n}\n', {file: 'sync.js'});
  assert.match(so, /'start', 'wink'\]\.map\(k => subjKey\(S\.id, k\)\)/, 'signOutClear removes reefid-sync-<subject>-wink');
});
