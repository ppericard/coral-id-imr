'use strict';
require('./slot.js').testGuard();
// The opening's checks and the comeback's rust, read for less work (docs/spec/model.md "The state version and its views",
// "Comeback after a break"): the units ready to be asked (model.js introReady, readyCalc: a view of the state version over
// the units with a record or an intro map entry, the answer clock read at each read for a unit that waits; introReadyFn,
// one read for a loop; unlocked), the genera opened on a card (cardsCalc, behind openRecent), circle 2's condition
// (app.js c1Met, behind treeGate), mayOpen's one read of the subject's units, and rustNow, which sums the rust only at a
// new visit or in a comeback (rustAdd) and otherwise keeps genusDiff's first values as the sum would (rustSkip). A
// speed-up only: every value, every read of the clock and every write must be the code before's. The reference is that
// code, kept here as it was (its comment lines left out, its names …0), beside the new one: for the opening, one page
// with app.js's versions and views and model.js's first meeting; for the rust, two pages, the new block and the block
// with the code before, driven by the same answers, gaps and data changes. VIEW_CHECK off and on. Then the mutations: an
// intro map entry, a record or a circle-1 record changed with no bump is caught, by VIEW_CHECK and by the reference.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js'),
  C = require('../core.js'),
  {memStorage} = require('./kept.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  MODEL = src('model.js'),
  APP = src('app.js');
const APP_CODE = cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'});
const INTRO_CODE = cut(MODEL, 'const INTRO = {', '\n};\n', {through: 1, file: 'model.js'});
const FIRST_CODE = cut(MODEL, 'let INTROS = null;', '// via: where the player opened them', {file: 'model.js'});
const CARDS_CODE = cut(MODEL, '// The genera opened on a card, each with its mark', '// No new genus while one opened', {file: 'model.js'});
const GATE_CODE = cut(APP, "// Circle 2's condition", '\n};\n', {through: 1, file: 'app.js'});

// The code before (model.js introReady, mayOpen, unlocked, openRecent; app.js treeGate), verbatim but for the names and
// the comment lines.
const REF = `const introReady0 = n => {
  if (closed(n)) return false;
  if (askedOpen(n)) return true;
  const e = introMap()[n];
  return !!e && (!!e[1] || tally() >= introMark(e) + INTRO.GAP);
};
const mayOpen0 = n => !(typeof openShut === 'function' && openShut(n)) && (!unitsNow().gate || unitsNow().gate(n));
const unlocked0 = (list = pool()) => list.filter(introReady0);
const openRecent0 = (at = answersSoFar()) => {
  const c = tally() + at - answersSoFar();
  return Object.entries(introMap())
    .filter(([n, e]) => /^[sc]$/.test(e[3] || (e[1] ? 's' : 'c')) && !closed(n) && c - introMark(e) < OPEN.WIN)
    .map(([n]) => n);
};
const treeGate0 = n => {
  const c = (GX(n) || {}).circle || 1;
  if (c < 2) return true;
  const c1 = TREEU ? TREEU.c1 : [];
  return c < 3 ? c1.every(x => askedOpen(x) && introduced(x)) : !!TREEU && treeC3();
};`;

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pickOf = (r, L) => L[Math.floor(r() * L.length)];
// 24 units: the first 6 circle 1 (TREEU.c1), the others circle 1, 2 or 3; and names only an object's prototype holds.
const UNITS = Array.from({length: 24}, (_, i) => 'U' + i);
const ODD = ['constructor', 'toString', 'nope'];

// The page: app.js's versions and views, model.js's first meeting and cards, app.js's circle 2 gate, and the reference.
// check: VIEW_CHECK on. The answer clock (tally) and the answer count are the box's, each read of the clock counted.
function page(seed, check) {
  const r = rng(seed),
    box = {c: 0, a: 0, tc: 0, shut: new Set(), gate: new Set(), c3: false},
    later = [],
    saved = {};
  const circle = Object.fromEntries(UNITS.map((n, i) => [n, i < 6 ? 1 : 1 + Math.floor(r() * 3)]));
  const stubs = {
    window: {VIEW_CHECK_ON: check},
    localStorage: memStorage(),
    setTimeout: f => later.push(f),
    SUBJECTS: C.SUBJECTS,
    subjKey: C.subjKey,
    startKey: C.startKey,
    keyGet: C.keyGet,
    keyRename: C.keyRename,
    SUBJ: {id: 'fish'},
    sKey: k => 'reefid-sync-fish-' + k,
    P: {},
    OPEN: {WIN: 15},
    GX: n => (Object.hasOwn(circle, n) ? {circle: circle[n]} : undefined),
    TREEU: {c1: UNITS.slice(0, 6)},
    treeC3: () => box.c3,
    UNITS: {fish: {gate: n => !box.gate.has(n)}},
    openShut: n => box.shut.has(n),
    slateGenera: () => UNITS,
    pool: () => UNITS,
    answersSoFar: () => box.a,
    tally: () => (box.tc++, box.c),
    syncSoon: () => {},
    box,
    saved
  };
  const ctx = vm.createContext({...stubs}),
    names = Object.keys(stubs),
    make = vm.runInContext(
      `(function (${names.join(', ')}) {\n${APP_CODE}\n` +
        // store: the intro map's key is the player's own (app.js REC_KEYS: stateBump('rec')); raw writes nothing.
        `const store = {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => ((saved[k] = JSON.stringify(v)), stateBump('rec'))};\n` +
        `${INTRO_CODE}\n${FIRST_CODE}\n${CARDS_CODE}\n${GATE_CODE}\n${REF}\n` +
        `return {P, INTRO, store, introMap, introReady, introReady0, introReadyFn, introducedFn, introduced, unlocked, unlocked0, mayOpen, mayOpen0, openRecent, openRecent0, treeGate, treeGate0, stateBump};\n})`,
      ctx
    );
  return {T: make(...names.map(k => stubs[k])), r, box, later, circle};
}

// The writers between reads: a record (its answers, the time of its last one), an intro map entry (a first card, a card,
// Open all, One at a time's mark, a live game's mark; with or without a time and a clock mark), both removed, the clock
// and the answer count moving (no input), the gates moving (their stubs: read live by both).
function write(pg) {
  const {T, r, box} = pg,
    x = r(),
    n = r() < 0.08 ? pickOf(r, ODD.slice(1)) : pickOf(r, UNITS),
    t = 1000 + Math.floor(r() * 100);
  if (x < 0.3) {
    if (r() < 0.15) delete T.P[n];
    else T.P[n] = {ok: Math.floor(r() * 3), ko: Math.floor(r() * 2), ...(r() < 0.8 ? {at: t} : {})};
    T.stateBump('rec');
    return 'record';
  }
  if (x < 0.6) {
    const m = T.introMap();
    if (r() < 0.1) delete m[n];
    else {
      const k = pickOf(r, ['s', 'c', 'a', 'b', undefined]),
        e = [Math.floor(r() * 40), r() < 0.3 ? 1 : 0, r() < 0.8 ? t : 0, k];
      if (r() < 0.7) e.push(r() < 0.05 ? NaN : Math.floor(r() * 40));
      m[n] = e;
    }
    T.store.set(T.INTRO.KEY, m); // the app's writers' way (model.js introAdd, introLive, introBack, introMerge)
    return 'intro';
  }
  if (x < 0.85) {
    box.c += Math.floor(r() * 4);
    box.a += Math.floor(r() * 3);
    return 'clock';
  }
  if (x < 0.92) {
    const s = r() < 0.5 ? box.shut : box.gate;
    s.has(n) ? s.delete(n) : s.add(n);
    return 'gate';
  }
  box.c3 = !box.c3;
  return 'c3';
}
// One read and the clock reads it made.
const clocked = (box, f) => {
  const t0 = box.tc,
    v = f();
  return [v, box.tc - t0];
};
// The reads, each against the reference, the clock's reads included: every unit's readiness one by one and in a loop,
// unlocked, mayOpen, the cards' window at three answer counts, treeGate.
function reads(pg, label) {
  const {T, box} = pg,
    all = [...UNITS, ...ODD];
  for (const n of all) {
    assert.deepStrictEqual(
      clocked(box, () => T.introReady(n)),
      clocked(box, () => T.introReady0(n)),
      `${label}: introReady ${n}`
    );
    assert.strictEqual(T.mayOpen(n), T.mayOpen0(n), `${label}: mayOpen ${n}`);
    assert.strictEqual(T.treeGate(n), T.treeGate0(n), `${label}: treeGate ${n}`);
  }
  assert.deepStrictEqual(
    clocked(box, () => all.filter(T.introReadyFn())),
    clocked(box, () => all.filter(T.introReady0)),
    `${label}: introReadyFn over a loop`
  );
  assert.deepStrictEqual(
    clocked(box, () => T.unlocked(all)),
    clocked(box, () => T.unlocked0(all)),
    `${label}: unlocked`
  );
  assert.deepStrictEqual(
    clocked(box, () => T.unlocked()),
    clocked(box, () => T.unlocked0()),
    `${label}: unlocked, the units in play`
  );
  assert.deepStrictEqual(all.filter(T.introducedFn()), all.filter(T.introduced), `${label}: introducedFn over a loop`);
  for (const at of [undefined, box.a, box.a + 3])
    assert.deepStrictEqual(
      clocked(box, () => T.openRecent(at)),
      clocked(box, () => T.openRecent0(at)),
      `${label}: openRecent(${at})`
    );
}

for (const check of [false, true])
  test(`the units ready, the cards' window, circle 2's gate and mayOpen equal the code before (VIEW_CHECK ${check ? 'on' : 'off'})`, () => {
    let n = 0;
    const kinds = {};
    for (const seed of [3, 17, 101]) {
      const pg = page(seed, check);
      reads(pg, `seed ${seed}, start`);
      for (let i = 0; i < 150; i++) {
        const w = write(pg);
        kinds[w] = (kinds[w] || 0) + 1;
        // Several reads in one version too: a kept value read again.
        reads(pg, `seed ${seed}, write ${i} (${w})`);
        if (pg.r() < 0.3) reads(pg, `seed ${seed}, write ${i} (${w}), again`);
        n++;
      }
      assert.deepStrictEqual(pg.later, [], 'nothing thrown in a task of its own');
    }
    assert.ok(n === 450 && Object.keys(kinds).length === 5, `every kind of write: ${JSON.stringify(kinds)}`);
  });

test('the readiness covers its cases: ready at once, asked since its card, waiting for its gap, closed, not met', () => {
  const pg = page(5, false),
    {T, box} = pg,
    m = T.introMap();
  m.U1 = [3, 1, 1000, 's', 3]; // a first card: ready at once
  m.U2 = [3, 0, 1000, 'c', 3]; // a card: ready INTRO.GAP answers on the clock after its mark
  m.U3 = [3, 0, 1000, 'b']; // closed
  m.U4 = [3, 0, 1000, 'c', 3];
  T.P.U4 = {ok: 1, ko: 0, at: 1001}; // asked since its card
  T.P.U5 = {ok: 1, ko: 0, at: 900}; // asked, no card
  T.stateBump('rec');
  box.c = 4;
  const at = () => ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'].map(T.introReady);
  assert.deepStrictEqual(at(), [true, false, false, true, true, false]);
  box.c = 5; // the gap reached: no version moved, the clock is read at the read
  assert.deepStrictEqual(at(), [true, true, false, true, true, false]);
  assert.deepStrictEqual(
    clocked(box, () => T.introReady('U2')),
    [true, 1],
    'a unit that waits reads the clock'
  );
  assert.deepStrictEqual(
    clocked(box, () => T.introReady('U1')),
    [true, 0],
    'a unit ready at once does not'
  );
  assert.deepStrictEqual([...T.openRecent()], ['U1', 'U2', 'U4'], "the cards' window: the first card and the cards, not the closed one");
  box.c = 18;
  assert.deepStrictEqual([...T.openRecent()], [], 'out of the window on the clock, with no version moved');
});

// The mutations: an input changed with no bump. With VIEW_CHECK on a read throws; off, the value kept differs from the
// reference until a bump makes it again.
const MUTATIONS = [
  ['an intro map entry', (T, m) => (m.U8 = [0, 1, 1000, 'c', 0]), 'U8', 'introReady', 'ready'],
  ['a record', T => (T.P.U9 = {ok: 1, ko: 0, at: 2000}), 'U9', 'introReady', 'ready'],
  ['an intro map entry, a card', (T, m) => (m.U10 = [0, 0, 1000, 'c', 0]), null, 'openRecent', 'cards'],
  ['a circle-1 record', T => delete T.P.U0, 'U12', 'treeGate', 'c1Met']
];
for (const [what, change, unit, read, view] of MUTATIONS)
  test(`a change of ${what} with no bump is caught (${view})`, () => {
    for (const check of [true, false]) {
      const pg = page(9, check),
        {T, box} = pg,
        m = T.introMap();
      // Every circle-1 unit asked since its card, so circle 2 is open; U12 is circle 2.
      pg.circle.U12 = 2;
      for (const n of UNITS.slice(0, 6)) ((m[n] = [0, 1, 1000, 's', 0]), (T.P[n] = {ok: 1, ko: 0, at: 1001}));
      T.stateBump('rec');
      box.c = 1;
      const val = () => (read === 'openRecent' ? T.openRecent() : T[read](unit)),
        ref = () => (read === 'openRecent' ? T.openRecent0() : T[read + '0'](unit));
      assert.deepStrictEqual(val(), ref(), `${what}: equal before`);
      change(T, m);
      if (check) {
        assert.throws(val, new RegExp(`state view ${view}:`), `${what}: VIEW_CHECK throws`);
        assert.ok(pg.later.length > 0, `${what}: and again in a task of its own`);
      } else {
        assert.notDeepStrictEqual(val(), ref(), `${what}: the value kept is the old one`);
        T.stateBump('rec');
        assert.deepStrictEqual(val(), ref(), `${what}: a bump makes it again`);
      }
    }
  });

// The rust: the comeback block of model.js as it is, and the same block with the code before (recallAt, rustOf, rustNow),
// each in a page of its own, driven by the same answers, gaps and data changes.
const BLOCK = cut(MODEL, "// Comeback after a break (Pierre's rule", 'function weighted(', {file: 'model.js'});
const RUST_FROM = '// Recall of genus n at time t',
  RUST_TO = '// No genus opens (card, open-all';
const RUST0 = `const recallAt = (n, t = Date.now(), last = lastAt()) => {
  const a = (P[n] || {}).at || last;
  return a && t > a ? recallOf((t - a) / DAY, stability(n)) : 1;
};
const rustOf = R => (1 - 1 / 4) * (1 - R) * sig(aimOff(4) - Math.log(R));
const cbPlayCalc = () => [...slateGenera(), ...bonusList()].filter(n => !closed(n));
const cbGeneraCalc = () => cbPlay().filter(n => (P[n] || {}).ok > 0);
const cbPlay = typeof stateView === 'function' ? stateView('cbPlay', cbPlayCalc) : cbPlayCalc;
const cbGenera = typeof stateView === 'function' ? stateView('cbGenera', cbGeneraCalc) : cbGeneraCalc;
function rustNow(now = Date.now()) {
  const last = lastAt();
  if (!last || now <= last) return false;
  if (cbGenera().length < 2) {
    if (CB.r || CB.f) ((CB = {...CB, r: 0, t: now, ok: 0, f: 0}), cbSave());
    return false;
  }
  const on = CB.r > 0,
    from = on ? Math.max(last, CB.t) : last,
    floor = () => (CB.f = Math.max(CB.f, tally() + COMEBACK.FLOOR));
  const visit = now - last >= SESSION.GAP;
  if (visit) floor();
  if (now > from) {
    const A = cbPlay().filter(asked),
      add = A.reduce((t, n) => t + rustOf(recallAt(n, now, last)) - rustOf(recallAt(n, from, last)), 0);
    if (on) CB.r += add;
    else if (visit && add > 0) {
      CB.r = add;
      CB.ok = 0;
      floor();
    }
  }
  CB.t = now;
  cbSave();
  return visit;
}
`;
const BLOCK0 = BLOCK.slice(0, BLOCK.indexOf(RUST_FROM)) + RUST0 + BLOCK.slice(BLOCK.indexOf(RUST_TO));
const LV = '~level';
// A page of the comeback block: P its own copy, gd the genus difficulties of the data now (a tree's new photos change
// them without clearing the memo, as app.js treeBuild does), the writes counted.
function rustPage(block, P, gd) {
  const saved = {},
    io = {sets: 0, gd: 0},
    ctx = {
      P,
      LEVEL: LV,
      INTRO: {SLACK: 0.1},
      PICKD: {P: 0.8},
      // the aim follows the global level (model.js aimP), read live
      aimOff: (k = 4) => {
        const p = 0.8 - 0.05 * Math.max(-1, Math.min(1, (P[LV] || {}).th || 0)),
          x = (p - 1 / k) / (1 - 1 / k);
        return Math.log(x / (1 - x));
      },
      pgMissW: C.pgMissW,
      sig: x => 1 / (1 + Math.exp(-x)),
      ability: n => ((P[n] || {}).th ?? 0) + 0.3 * ((P[LV] || {}).th || 0),
      GDIFF: {},
      GX: n => n !== LV,
      slateGenera: () => Object.keys(P).filter(n => n !== LV),
      bonusList: () => [],
      asked: n => !!((P[n] || {}).ok || (P[n] || {}).ko),
      closed: n => !!(P[n] || {}).closed,
      answersSoFar: () => ((P[LV] || {}).ok || 0) + ((P[LV] || {}).ko || 0),
      sDev: n => 'reefid-' + n,
      store: {get: (k, d) => (k in saved ? JSON.parse(saved[k]) : d), set: (k, v) => (io.sets++, (saved[k] = JSON.stringify(v)))}
    };
  ctx.genusDiff = n => (n in ctx.GDIFF ? ctx.GDIFF[n] : (io.gd++, (ctx.GDIFF[n] = gd[n] || 0)));
  vm.createContext(ctx);
  // end: a comeback ended by its answers (model.js comebackStep's CUSUM)
  vm.runInContext(block + '\nthis.M = {rustNow, cb: () => CB, end: () => ((CB.r = 0), cbSave())};', ctx);
  return {M: ctx.M, ctx, saved, io};
}
// What a page shows after a step: the reply, the comeback's record, the memo, the writes.
const rustSeen = (pg, v) => JSON.stringify([v, pg.M.cb(), pg.ctx.GDIFF, pg.saved, pg.io]);

test('rustNow equals the code before: the rust summed at a visit and in a comeback, the memo kept as the sum kept it', () => {
  assert.ok(BLOCK.includes(RUST_FROM) && BLOCK.includes(RUST_TO) && BLOCK.includes('rustSkip'), 'the block as this test expects it');
  const seen = {visit: 0, comeback: 0, skip: 0, few: 0, memo: 0};
  for (const seed of [2, 7, 31, 64]) {
    const r = rng(seed),
      t0 = 1.7e12,
      P = {[LV]: {ok: 0, ko: 0, at: t0, th: 0}},
      gd = {},
      units = Array.from({length: 14}, (_, i) => 'G' + i),
      A = rustPage(BLOCK, structuredClone(P), gd),
      B = rustPage(BLOCK0, structuredClone(P), gd);
    let now = t0;
    // The same change to both pages' records.
    const both = f => [A.ctx.P, B.ctx.P].forEach(f);
    for (let i = 0; i < 400; i++) {
      const x = r();
      if (x < 0.45) {
        // an answer: its unit's record, the global level's
        const n = pickOf(r, units),
          good = r() < 0.7,
          th = Math.round((r() * 3 - 1) * 100) / 100,
          mx = r() < 0.1,
          own = r() < 0.85;
        now += 2000 + Math.floor(r() * 20000);
        both(P => {
          const s = (P[n] = P[n] || {ok: 0, ko: 0});
          good ? s.ok++ : s.ko++;
          s.th = th;
          s.dd = (s.dd || 0) + (good ? 1 : 0);
          if (own) s.at = now;
          else delete s.at;
          s.mx = mx ? 1 : 0;
          P[LV].ok += good ? 1 : 0;
          P[LV].ko += good ? 0 : 1;
          P[LV].th = Math.round((P[LV].th + (good ? 0.02 : -0.03)) * 1e4) / 1e4;
          P[LV].at = now;
        });
      } else if (x < 0.5) {
        // a tree's new photos: the difficulties of the data move, the memo is not cleared
        const n = pickOf(r, units);
        gd[n] = Math.round((r() * 2 - 1) * 100) / 100;
        seen.memo++;
      } else if (x < 0.53) {
        // the photo statistics joined: the memo cleared (model.js statsJoin)
        A.ctx.GDIFF = {};
        B.ctx.GDIFF = {};
      } else if (x < 0.56) {
        const n = pickOf(r, units),
          c = r() < 0.5;
        both(P => P[n] && (P[n].closed = c));
      }
      // the time to plan or answer at: seconds, minutes, hours or days after the last answer
      if (A.M.cb().r > 0 && r() < 0.25) (A.M.end(), B.M.end());
      const gap = pickOf(r, [0, 5e3, 5e3, 6e4, 6e4, 25 * 6e4, 31 * 6e4, 3 * 36e5, 2 * 864e5]) * (0.5 + r());
      const at = now + Math.round(gap),
        cb = A.M.cb().r > 0,
        a = A.M.rustNow(at),
        b = B.M.rustNow(at);
      assert.strictEqual(rustSeen(A, a), rustSeen(B, b), `seed ${seed}, step ${i}: the reply, the record, the memo and the writes`);
      if (a) seen.visit++;
      else if (cb) seen.comeback++;
      else if (Object.keys(A.ctx.P).filter(n => n !== LV && A.ctx.P[n].ok > 0 && !A.ctx.P[n].closed).length < 2) seen.few++;
      else seen.skip++;
      if (r() < 0.5) now = Math.max(now, at);
    }
  }
  for (const v of Object.values(seen)) assert.ok(v >= 4, `every case met: ${JSON.stringify(seen)}`);
  console.log('# rustNow cases:', JSON.stringify(seen));
});
