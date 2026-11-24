'use strict';
require('./slot.js').testGuard();
// The storage read once (sync.js keptGet, keptBy, keptPush; REE-263, docs/reviews/2026-11-24-per-answer-cost.md fix 5):
// the keys an answer reads many times are parsed once and kept while their stored text stays the same. A speed-up only:
// here, over thousands of random storage states and writes (store.set, another tab's raw write, a removal, a key under
// its old name, no JSON, "null", a blocked or full storage), every kept read equals a fresh store.get, every kept push
// writes the text the old store.set wrote, and sheetV, imrSaid and startV give what the code before them gave.
const test = require('node:test'),
  assert = require('node:assert'),
  vm = require('vm');
const C = require('../core.js'),
  block = require('./block.js'),
  {keptPage, read} = require('./kept.js');
// A value of the page's vm realm against one of this realm: compared as stored (JSON), the realms' prototypes apart.
const eqJ = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);

// A small deterministic generator (mulberry32), so a failure replays.
const rng = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (r, L) => L[Math.floor(r() * L.length)];
const CHOICES = [...C.CHOICE.opts.map(o => o[0]), 'bogus', '', null];
const LOG = 'reefid-log0',
  Q = 'reefid-anonq',
  SV = 'reefid-sheet-v',
  STC = C.startKey('coral'),
  STF = C.startKey('fish'),
  KEYS = [LOG, Q, SV, STC, STF];
const answerOf = (r, i) => ({
  id: 'a' + i,
  s: pick(r, ['coral', 'fish', '']),
  g: pick(r, ['A', 'B']),
  ok: r() < 0.5 ? 1 : 0,
  m: pick(r, ['quiz', 'quiz-duel|w', 'wink', 'quiz|t']),
  ...(r() < 0.3 ? {ty: 'idk'} : {})
});
const startOf = r => {
  const o = {};
  if (r() < 0.9) o.c = pick(r, CHOICES);
  if (r() < 0.5)
    o.h = Array.from({length: Math.floor(r() * 4)}, (_, i) => [
      pick(r, CHOICES),
      i * 10,
      1000 + i,
      pick(r, ['card', 'tour', 'inferred', 'ease', ''])
    ]);
  if (r() < 0.3) o.ease = [pick(r, CHOICES), Math.floor(r() * 50), 2000];
  // a fallback card shown ('<answer>-<direction>', joined: no old key name for tools/rename_app.py)
  if (r() < 0.3) o.fb = {[pick(r, ['imr', 'know', 'new']) + '-' + pick(r, ['lo', 'hi'])]: [3, 4]};
  if (r() < 0.2) o.at = 5;
  return o;
};
// What a key may hold: a value of its kind, or anything else a storage may hold.
const valueOf = (r, k) => {
  const x = r();
  if (x < 0.1) return pick(r, [null, 0, 5, 'text', {}, [], true]);
  if (k === SV) return pick(r, [0, C.SHEET_FLOOR - 3, C.SHEET_FLOOR, C.SHEET_FLOOR + 9, '231', -1]);
  if (k === STC || k === STF) return startOf(r);
  return Array.from({length: Math.floor(r() * 12)}, (_, i) => answerOf(r, i));
};
const rawOf = (r, k) => (r() < 0.15 ? pick(r, ['not json{', '', 'null', '[1,', 'undefined']) : JSON.stringify(valueOf(r, k)));

// sheetV, imrSaid and startV as they are now and as they were (origin/main before REE-263 fix 5), in one page.
const OLD = `
const sheetVOld = () => Math.max(Number(store.get(SHEETV, 0)) || 0, SHEET_FLOOR);
const imrSaidOld = () => {
  const o = store.get(startKey(SUBJ.id), null);
  return (
    startEventsOf(o).some(x => x[0] === 'imr' && x[3] !== 'ease' && x[3] !== 'inferred') ||
    Object.keys((o && typeof o.fb === 'object' && o.fb) || {}).some(k => k.split('-')[0] === 'imr')
  );
};
const startOfOld = () => {
  const o = store.get(startK(), null);
  return o && typeof o === 'object' && startOpt(o.c) ? o : null;
};
const startVOld = () => startVars(startOn() ? startEff(startOfOld()) : null);
this.R = {sheetV, sheetVOld, imrSaid, imrSaidOld, startV, startVOld};`;
function readers(pg) {
  const model = read('model.js');
  Object.assign(pg.ctx, {
    SUBJECTS: C.SUBJECTS,
    SUBJ: C.subjectOf('coral'),
    SHEETV: SV,
    SHEET_FLOOR: C.SHEET_FLOOR,
    startKey: C.startKey,
    startOpt: C.startOpt,
    startVars: C.startVars,
    startEventsOf: C.startEventsOf
  });
  vm.runInContext(
    block(read('sync.js'), 'const sheetV = () =>', '\n', {file: 'sync.js'}) +
      block(model, '// Read for every unit: the stored record parsed once', '// Families met first', {file: 'model.js'}) +
      block(model, 'const startS = () => SUBJ || SUBJECTS[0];', '// The gentle "lower" card', {file: 'model.js'}) +
      OLD,
    pg.ctx
  );
  return pg.ctx.R;
}
// Each step: one change to the storage of both pages, the same; a: kept, b: as before (store alone).
function step(r, a, b, n) {
  const k = pick(r, KEYS),
    x = r(),
    both = f =>
      [a, b].map(p => {
        try {
          return {v: f(p)};
        } catch (e) {
          return {e: e.message};
        }
      });
  if (x < 0.25) {
    const v = valueOf(r, k);
    return both(p => p.store.set(k, v));
  }
  if (x < 0.4) {
    const raw = rawOf(r, k); // another tab's write (the storage area is shared)
    return both(p => p.ls.raw.set(k, raw));
  }
  if (x < 0.47) return both(p => p.ls.raw.delete(k));
  if (x < 0.53) {
    const raw = rawOf(r, k); // a key still under its old name (a migration that could not write it)
    return both(p => (p.ls.raw.delete(k), p.ls.raw.set(C.keyBefore(k), raw)));
  }
  if (x < 0.58) {
    const f = r() < 0.5 ? 'fail' : 'full',
      on = r() < 0.5;
    return both(p => (p.ls[f] = on));
  }
  if (x < 0.62) {
    const S = C.subjectOf(pick(r, ['coral', 'fish', 'seaslug']));
    return both(p => (p.ctx.SUBJ = S));
  }
  const q = pick(r, [LOG, Q]),
    ans = answerOf(r, 1000 + n),
    cap = pick(r, [3, 10, 2000]);
  const [ra, rb] = [
    (() => {
      try {
        return {v: a.keptPush(q, ans, cap)};
      } catch (e) {
        return {e: e.constructor.name};
      }
    })(),
    (() => {
      try {
        return {v: b.store.set(q, [...b.store.get(q, []), ans].slice(-cap))};
      } catch (e) {
        return {e: e.constructor.name};
      }
    })()
  ];
  assert.deepStrictEqual(ra, rb, `push ${q}: the same outcome (a stored value that is no list throws as before)`);
}
// Every read of the two pages, the same.
function same(a, b, A, B, where) {
  for (const k of KEYS)
    for (const d of [[], null, 0]) {
      const want = b.store.get(k, d),
        got = a.keptGet(k, d);
      eqJ(got, want, `${where}: keptGet(${k}, ${JSON.stringify(d)})`);
      if (want === d) assert.strictEqual(got, d, `${where}: the default itself (${k})`);
      eqJ(a.store.get(k, d), want, `${where}: the two storages hold the same (${k})`);
      const f = v => (Array.isArray(v) ? v.length : v === null ? 'null' : typeof v);
      assert.strictEqual(a.keptBy(k, d, 'len' + JSON.stringify(d), f), f(want), `${where}: keptBy(${k})`);
    }
  for (const [n, f] of [
    ['sheetV', 'sheetVOld'],
    ['imrSaid', 'imrSaidOld'],
    ['startV', 'startVOld']
  ])
    assert.strictEqual(A[n](), B[f](), `${where}: ${n}`);
}

for (const check of [false, true])
  test(`random storage histories: every kept read is a fresh store.get, every push the old write${check ? ' (KEPT_CHECK on)' : ''}`, () => {
    let steps = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const r = rng(seed * 7919 + (check ? 1 : 0)),
        a = keptPage({check}),
        b = keptPage(),
        A = readers(a),
        B = readers(b);
      for (let n = 0; n < 150; n++) {
        step(r, a, b, n);
        same(a, b, A, B, `seed ${seed} step ${n}`);
        steps++;
      }
      assert.deepStrictEqual([...a.ls.raw], [...b.ls.raw], `seed ${seed}: the same storage at the end`);
    }
    assert.strictEqual(steps, 6000);
  });

test('read once: a kept log is parsed once, its push parses nothing, another tab’s write is read at once', () => {
  const pg = keptPage();
  vm.runInContext('const P0 = JSON.parse; this.n = 0; JSON.parse = (...a) => (this.n++, P0(...a));', pg.ctx);
  const L = Array.from({length: 2000}, (_, i) => ({id: 'x' + i, s: 'coral', ok: 1}));
  pg.store.set(LOG, L);
  pg.ctx.n = 0;
  for (let i = 0; i < 6; i++) assert.strictEqual(pg.keptGet(LOG, []).length, 2000);
  assert.strictEqual(pg.ctx.n, 1, 'six reads, one parse');
  pg.keptPush(LOG, {id: 'y', s: 'coral', ok: 0}, 2000);
  const after = pg.keptGet(LOG, []);
  assert.strictEqual(pg.ctx.n, 1, 'the push and the read after it parse nothing');
  eqJ(after[1999], {id: 'y', s: 'coral', ok: 0});
  assert.strictEqual(after[0].id, 'x1', 'capped as before');
  assert.strictEqual(pg.ls.getItem(LOG), JSON.stringify([...L, {id: 'y', s: 'coral', ok: 0}].slice(-2000)));
  // Another tab of the app writes the same key (the storage area is shared; no storage event is listened to).
  pg.ls.raw.set(LOG, JSON.stringify([{id: 'other'}]));
  eqJ(pg.keptGet(LOG, []), [{id: 'other'}], 'the other tab’s list, read at once');
  assert.strictEqual(pg.ctx.n, 2, 'one more parse');
  // A sign-out removes it: the default, nothing kept.
  pg.ls.removeItem(LOG);
  assert.deepStrictEqual(pg.keptGet(LOG, ['d']), ['d']);
  assert.ok(!pg.KEPT.has(LOG), 'nothing kept for a key gone');
  // A full storage: the push changes nothing, the next read is the list still stored.
  pg.ls.raw.set(LOG, '[1]');
  pg.ls.full = true;
  pg.keptPush(LOG, 2, 10);
  eqJ(pg.keptGet(LOG, []), [1]);
  pg.ls.full = false;
  pg.keptPush(LOG, 2, 10);
  eqJ(pg.keptGet(LOG, []), [1, 2]);
});

test('keptBy: a value read from the key kept under its name, again only when the text changes', () => {
  const pg = keptPage();
  let calls = 0;
  const f = v => (calls++, Math.max(Number(v) || 0, 7));
  pg.store.set(SV, 3);
  for (let i = 0; i < 5; i++) assert.strictEqual(pg.keptBy(SV, 0, 'v', f), 7);
  assert.strictEqual(calls, 1);
  pg.store.set(SV, 12);
  assert.strictEqual(pg.keptBy(SV, 0, 'v', f), 12);
  assert.strictEqual(calls, 2);
  pg.ls.removeItem(SV);
  assert.strictEqual(pg.keptBy(SV, 0, 'v', f), 7, 'nothing stored: f of the default, as before');
  pg.ls.fail = true;
  assert.strictEqual(pg.keptBy(SV, 0, 'v', f), 7, 'a blocked storage: f of the default');
  assert.deepStrictEqual(pg.keptGet(LOG, ['d']), ['d']);
});

test('KEPT_CHECK: a reader that changed a shared kept value, or a stale one, throws', () => {
  const pg = keptPage({check: true});
  pg.store.set(LOG, [{id: 'a'}]);
  pg.keptGet(LOG, []).push({id: 'mutated'}); // what no reader may do
  assert.throws(() => pg.keptGet(LOG, []), /kept storage read: reefid-log0 value differs/);
  const pg2 = keptPage({check: true});
  pg2.store.set(SV, 300);
  pg2.keptBy(SV, 0, 'v', v => v);
  // A kept entry that went stale (it cannot: every read compares the stored text; forced here).
  pg2.KEPT.get(SV).by.set('v', 1);
  assert.throws(() => pg2.keptBy(SV, 0, 'v', v => v), /reefid-sheet-v v differs/);
});

test('the readers changed read through it, and only readers that never change what they read', () => {
  const quiz = read('quiz.js'),
    model = read('model.js'),
    sync = read('sync.js');
  assert.match(sync, /\nconst sheetV = \(\) => keptBy\(SHEETV, 0, 'sheetV', /);
  assert.match(model, /keptBy\(k, null, 'imrSaid', imrOf\)/);
  assert.match(model, /keptBy\(k, null, 'startV', startEffOf\)/);
  assert.match(quiz, /\n {4}keptPush\(LOG0, ans, 2000\);\n {4}keptPush\(ANONQ, ans, 2000\);\n/);
  // LOG0 kept for: the first answer's check (subjEntries), the tips' seed (filter), the duels (some), the run (tipIdkRun).
  assert.strictEqual((quiz.match(/keptGet\(LOG0, \[\]\)/g) || []).length, 4);
  assert.ok(quiz.includes('!subjEntries(keptGet(LOG0, []), SUBJ.id).length'));
  // Signing in hands LOG0 to the account's log, which is changed later: a copy, as before.
  assert.match(sync, /log: store\.get\(LOG0, \[\]\)/);
});
