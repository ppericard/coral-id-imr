'use strict';
require('./slot.js').testGuard();
// The photo draw's data filled in idle time (app.js drawFillSoon, drawFillStep; docs/spec/model.md "The state version and
// its views"): the units in play's data views (model.js drawPhotos) filled while the page is idle, in slices, so a draw
// finds them ready. A speed-up only: every draw must be the one the on-demand fill gives. Two pages from the same seed,
// app.js's versions and views, its fill and model.js's draw in each (as tests/drawview.test.js runs them), the game
// around stubbed on made-up units: page A fills idle (any number of slices between two steps, of any length, the last
// one cut short), page B never does. The same writers run on both (the player's records, the units met, the photo
// statistics, the calibration set, the units in play changed with a data bump as a subject switch does); a draw comes
// between slices, mid-fill. Every draw is compared (the same photos, the same random numbers), and every unit's kept data
// entry by entry, VIEW_CHECK off and on. Then: once filled, no draw on a unit in play computes its data; the fill
// follows a version move and skips a unit the data no longer has; without requestIdleCallback it runs in timed slices;
// mutants of the fill's version rule and of its queue are caught.
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
const modelCode = model =>
  [
    cut(model, 'const PICKD = {', '// The next exam question of genus n', {file: 'model.js'}),
    cut(model, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
    cut(model, 'const PMEM0 = memOf();', '\n// Per-format offsets', {file: 'model.js'}),
    cut(model, 'const PFMT0 = ', '\n// Progress saved before the photo memory', {file: 'model.js'}),
    cut(model, 'function wpick(', '\n}\n', {through: 1, file: 'model.js'}),
    cut(model, 'const RECENT = ', '\n', {file: 'model.js'})
  ].join('\n');
// Each computation of a unit's data counted (CALCS), through the view as model.js makes it.
const VIEW_LINE = "const drawPhotos = typeof dataViewBy === 'function' ? dataViewBy('drawPhotos', drawPhotosCalc) : drawPhotosCalc;";
const counted = model => model.replace(VIEW_LINE, "const drawPhotos = dataViewBy('drawPhotos', n => (CALCS.push(n), drawPhotosCalc(n)));");
const APP_CODE = cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'});
const FILL = cut(APP, 'const DRAW_FILL = {', '// The plain sentence:', {file: 'app.js'});

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pickOf = (r, L) => L[Math.floor(r() * L.length)];

// Made-up units (r: the generator): a fish family F of 120 colonies and its genera, a coral of three views with growth
// forms (x among them), a two-level genus, a bonus genus (x) some of whose photos gamePhotoOk refuses; Z: a unit that
// comes into play with a data bump (the subject's other units).
function unitsOf(r) {
  let i = 0;
  const photo = (o, extra = {}) => {
    const p = {f: 'p' + i++, o, e: r() < 0.85 ? 1 + Math.floor(r() * 5) : 0, ...extra};
    if (r() < 0.3) p.jt = pickOf(r, ['p1g0sl1', 'p1g0sms', 'p2g1sl1', 'p1g0sl1j', 'p1g0sl1c']);
    if (r() < 0.1) p.gid = 'g' + i;
    return p;
  };
  const fish = (n, obs) =>
    Array.from({length: obs}, (_, k) => {
      const x = r();
      return photo(n + 'o' + k, x < 0.15 ? {ph: 'juvenile', t: pickOf(r, ['Early sp', 'Late sp'])} : x < 0.25 ? {sp: 'mimA'} : {});
    });
  const coral = (n, obs, views) => {
    const V = Object.fromEntries(views.map(v => [v, []]));
    for (let k = 0; k < obs; k++) for (const v of views) if (r() < 0.75) V[v].push(photo(n + 'o' + k, {form: pickOf(r, ['x', 'b', 'm'])}));
    return V;
  };
  return {
    F: {
      levels: 3,
      views: {wide: fish('F', 120)},
      juv: {cls: '', early: ['Early sp'], late: ['Late sp']},
      mim: [{sp: 'mimA', st: 'all', u: ['F'], m: ['M1'], fb: 'M1', pair: {id: 'pa', b: 'mimA'}}],
      forms: ['a']
    },
    'g:F1': {levels: 3, parent: 'F', views: {wide: fish('g:F1', 30)}},
    'g:F2': {levels: 3, parent: 'F', views: {wide: fish('g:F2', 8)}},
    C3: {levels: 3, views: coral('C3', 20, ['wide', 'medium', 'macro'])},
    C2: {levels: 2, views: coral('C2', 12, ['wide', 'medium', 'macro'])},
    B: {levels: 3, x: true, views: coral('B', 8, ['wide', 'medium'])},
    M1: {levels: 3, views: {wide: fish('M1', 4)}},
    Z: {levels: 3, views: {wide: fish('Z', 25)}}
  };
}

// The page. fill: app.js's fill block (a mutant's); idle: whether requestIdleCallback exists (else the setTimeout slices).
function page(seed, check, {fill = FILL, idle = true, model = modelCode(MODEL)} = {}) {
  const r = rng(seed),
    U = unitsOf(r),
    Z = U.Z;
  delete U.Z; // not in play, nor in the data, until the units in play change
  let s = 1;
  const M = Object.create(Math);
  M.random = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  const SUBJ = C.subjectOf('fish'),
    box = {cal: C.calibOf(SUBJ)},
    later = [],
    IDLE = [],
    TIMERS = [],
    MET = new Set(['F']),
    CALCS = [],
    refused = new Set(Object.values(U.B.views).flatMap(L => L.filter((p, i) => i % 3 === 0).map(p => p.f)));
  const play = {L: ['F', 'g:F1', 'g:F2', 'C3', 'C2', 'B', 'M1']};
  const stubs = {
    Math: M,
    window: {VIEW_CHECK_ON: check},
    localStorage: memStorage(),
    setTimeout: (f, ms) => (ms === 50 ? TIMERS.push(f) : later.push(f)),
    requestIdleCallback: idle ? f => IDLE.push(f) : undefined,
    SUBJECTS: C.SUBJECTS,
    subjKey: C.subjKey,
    startKey: C.startKey,
    keyGet: C.keyGet,
    keyRename: C.keyRename,
    SUBJ,
    calibOf: S => (S === SUBJ ? box.cal : C.calibOf(S)),
    unitRankOf: C.unitRankOf,
    refLevel: C.refLevel,
    phaseOf: C.phaseOf,
    varKindOf: C.varKindOf,
    VAR_AT: C.VAR_AT,
    varRamp: C.varRamp,
    memBucket: C.memBucket,
    aimOf: C.aimOf,
    DOM: C.DOM,
    TARGET_P: C.TARGET_P,
    AIM: C.AIM,
    LEVEL: '_level',
    P: {},
    PSTAT: {},
    PTM: {},
    ptimeOff: C.ptimeOff,
    PGD: {},
    PMEM: [0, -0.45, -1.1, -1.7],
    memOf: C.memOf,
    PFMT: {},
    fmtOff: (F, f) => (f === 'duel' ? 0.3 : 0),
    GX: n => U[n],
    DATA: {gen: U},
    dataPartial: () => false,
    pool: () => play.L.slice(),
    introReady: n => MET.has(n),
    introReadyFn: () => n => MET.has(n),
    introduced: n => MET.has(n),
    imrFormsOf: n => U[n].forms || (n === 'C3' ? ['b', 'm'] : ['b']),
    gamePics: (n, v) => U[n].views[v] || [],
    gamePhotoOk: (n, p) => !refused.has(p.f),
    level: n => [(P0(n) || {}).lv || 'new'],
    rankOf: n => (n.startsWith('g:') ? 'genus' : ''),
    shaky: n => !!(P0(n) || {}).sh,
    recent: n => String((P0(n) || {}).h || '').split(''),
    ability: n => (P0(n) || {}).th || 0,
    genScore: n => (P0(n) || {}).sc || 0,
    LV_AT: [0.5, 0.8, 0.95],
    pick: a => a[Math.floor(M.random() * a.length)],
    CALCS
  };
  let P0 = () => null;
  const ctx = vm.createContext({...stubs}),
    names = Object.keys(stubs),
    make = vm.runInContext(
      `(function (${names.join(', ')}) {\n${APP_CODE}\n${counted(model)}\n${fill}\n` +
        `const set = (k, v) => k === 'PSTAT' ? (PSTAT = v) : k === 'PGD' ? (PGD = v) : k === 'PTM' ? (PTM = v) : k === 'CALSET' ? (CALSET = v) : null;\n` +
        `return {photoSet, drawPhotos, stateBump, swapBump, dataMark, dataBack, seenAdd, set, P, dver: () => DATA_V, drawFillSoon, drawFillDone, F: DRAW_FILL};\n})`,
      ctx
    );
  assert.ok(counted(model).includes('CALCS.push(n)'), 'model.js drawPhotos as the count expects it');
  const T = make(...names.map(k => stubs[k]));
  P0 = n => T.P[n];
  return {T, U, Z, MET, box, play, IDLE, TIMERS, CALCS, later, ctx, seed: v => (s = v), rnd: () => s};
}

// One idle slice (page A): the oldest asked, with an idle period of `left` units of time (each unit filled spends one);
// false when none was asked.
function slice(pg, left) {
  if (pg.IDLE.length) pg.IDLE.shift()({timeRemaining: () => left--});
  else if (pg.TIMERS.length) pg.TIMERS.shift()();
  else return false;
  return true;
}
// Every slice asked, until none is (left: each one's idle period).
const drain = (pg, left = 50) => {
  let k = 0;
  while (slice(pg, left)) assert.ok(++k < 1000, 'the fill ends');
  return k;
};

// The writers, as the app has them (the same random numbers on both pages).
function write(pg, r) {
  const {T, U, MET, box, play} = pg,
    units = play.L.filter(n => U[n]),
    x = r();
  if (x < 0.4) {
    const n = pickOf(r, units),
      s = (T.P[n] = T.P[n] || {}),
      L = Object.values(U[n].views).flat();
    s.ok = (s.ok || 0) + Math.floor(r() * 3);
    s.ko = (s.ko || 0) + Math.floor(r() * 2);
    s.th = r() * 3 - 0.5;
    s.sc = r();
    s.lv = pickOf(r, ['new', 'weak', 'mid', 'good']);
    s.h = Array.from({length: 1 + Math.floor(r() * 8)}, () => (r() < 0.7 ? '1' : '0')).join('');
    s.ps = s.ps || {};
    const p = pickOf(r, L);
    if (p) s.ps[p.f] = [1 + Math.floor(r() * 3), Math.floor(r() * 2)];
    T.stateBump('rec');
    return 'record';
  }
  if (x < 0.5) {
    MET.add(pickOf(r, units));
    T.stateBump('rec');
    return 'met';
  }
  if (x < 0.7) {
    const ps = {},
      gd = {};
    Object.values(U).forEach(u =>
      Object.values(u.views)
        .flat()
        .forEach(
          p =>
            r() < 0.6 &&
            (ps[p.f] = [r() * 3 - 1.5, Math.floor(r() * 40), Math.floor(r() * 30), ...(r() < 0.5 ? [Math.floor(r() * 50)] : [])])
        )
    );
    Object.keys(U).forEach(n => r() < 0.7 && (gd[n] = [r() * 2 - 1, 50]));
    T.set('PSTAT', ps);
    T.set('PGD', gd);
    T.stateBump();
    return 'stats';
  }
  if (x < 0.8) {
    T.set('CALSET', {
      fish: Object.fromEntries(
        Object.keys(U).map(n => [
          n,
          Object.values(U[n].views)
            .flat()
            .filter(() => r() < 0.3)
            .map(p => p.f)
        ])
      )
    });
    T.stateBump();
    return 'calset';
  }
  if (x < 0.88) {
    // the units in play change with the data (a subject switch, new data): Z comes in or leaves, B leaves or comes back
    if (U.Z) {
      delete U.Z;
      play.L = play.L.filter(n => n !== 'Z').concat(['B']);
    } else {
      U.Z = pg.Z;
      play.L = ['Z', ...play.L.filter(n => n !== 'B')];
    }
    T.stateBump();
    return 'play';
  }
  if (x < 0.92) {
    box.cal = {...box.cal, ref: 1 + Math.floor(r() * 3), early: r() * 0.6};
    T.stateBump();
    return 'calib';
  }
  return 'none';
}

// A value of a page as one of this file's (each page is a realm of its own: its objects' prototypes are its own), the
// numbers as they are.
const plain = x =>
  Array.isArray(x)
    ? Array.from(x, plain)
    : x && typeof x === 'object'
      ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]))
      : x;
// A draw on unit n on both pages from the same random numbers: the same photos, the same numbers drawn.
function drawBoth(A, B, n, s0, label) {
  for (const a of [
    [n, null, 0, 4, 'k4'],
    [n, null, 0.4, 2, 'again']
  ]) {
    A.seed(s0);
    const got = A.T.photoSet(...a),
      s1 = A.rnd();
    B.seed(s0);
    const want = B.T.photoSet(...a);
    assert.deepStrictEqual(plain(got), plain(want), `${label}: photoSet(${n}, ${a[4]})`);
    assert.strictEqual(B.rnd(), s1, `${label}: photoSet(${n}, ${a[4]}) drew the same random numbers`);
    if (got.shown[0]) (A.T.seenAdd([null, n, [], '', got]), B.T.seenAdd([null, n, [], '', want]));
  }
}
// Every unit in play's kept data on both pages, entry by entry (by file: the pages' photo objects are their own).
const flat = v =>
  plain({
    pics: Object.fromEntries(Object.entries(v.pics).map(([k, L]) => [k, L.map(p => p.f)])),
    d: [...v.d].map(([p, e]) => [p.f, e])
  });
function sameData(A, B, label) {
  for (const n of B.play.L.filter(n => B.U[n]))
    assert.deepStrictEqual(flat(A.T.drawPhotos(n)), flat(B.T.drawPhotos(n)), `${label}: ${n}'s data`);
}

// New photo statistics of units U (the subject on screen's) and their bump, the same on both pages from the generator r.
function stats(pg, r, U = pg.U) {
  const ps = {};
  Object.values(U).forEach(u =>
    Object.values(u.views)
      .flat()
      .forEach(p => r() < 0.5 && (ps[p.f] = [r() * 3 - 1.5, Math.floor(r() * 40), Math.floor(r() * 30)]))
  );
  pg.T.set('PSTAT', ps);
  pg.T.stateBump();
}
// A visit to another subject on page A, as app.js inSubject makes it (REE-298): the data swapped (the other subject's
// units in U, its units in play), the swaps bumped (swapBump), the visited subject's draw data read or not, a data write
// or not, the data put back, the swaps bumped, then dataBack and the fill asked again. Page B makes only the write
// (outside a visit): the visit itself must change nothing it reads. kind: 'clean' (nothing read, nothing written),
// 'reads' (the visited units' draw data read: this view's slot then holds them, so A's are made again at their next
// read), 'write' (the photo statistics written during the visit: every view made again).
function visit(A, B, kind, s) {
  const {T, U, play} = A,
    m = T.dataMark(),
    kept = {...U},
    L = play.L,
    other = unitsOf(rng(s));
  delete other.Z;
  const swap = to => {
    Object.keys(U).forEach(n => delete U[n]);
    Object.assign(U, to);
  };
  swap(other);
  play.L = Object.keys(other);
  T.swapBump();
  if (kind === 'reads') for (const n of ['C3', 'F']) T.drawPhotos(n);
  if (kind === 'write') stats(A, rng(s + 1), kept);
  swap(kept);
  play.L = L;
  T.swapBump();
  T.dataBack(m);
  T.drawFillSoon(); // app.js inSubject
  if (kind === 'write') stats(B, rng(s + 1));
}

function run(seed, check, N, opt = {}) {
  const A = page(seed, check, opt),
    B = page(seed, check),
    rA = rng(seed * 7),
    rB = rng(seed * 7),
    rI = rng(seed * 13 + 5),
    rV = rng(seed * 31 + 7),
    ops = {},
    visits = {};
  let slices = 0,
    ready = 0,
    kept = 0;
  A.T.drawFillSoon(); // asked after the boot's first plan
  for (let i = 0; i < N; i++) {
    const op = write(A, rA);
    assert.strictEqual(write(B, rB), op, 'the same writes');
    ops[op] = (ops[op] || 0) + 1;
    const label = `seed ${seed} step ${i} after ${op}${check ? ', VIEW_CHECK' : ''}${opt.idle === false ? ', no idle callback' : ''}`;
    A.T.drawFillSoon(); // asked again after each plan (quiz.js planNext) and visit
    // opt.visits: now and then a visit to another subject on page A (a sync's, app.js inSubject). After one that read
    // and wrote nothing, a fill done before stays done: nothing asked, and no unit's data computed again below.
    let clean = false;
    if (opt.visits && rV() < 0.3) {
      const x = rV(),
        kind = x < 0.5 ? 'clean' : x < 0.75 ? 'reads' : 'write',
        done = kind === 'clean' && rV() < 0.7 && (drain(A), A.T.drawFillDone());
      visit(A, B, kind, 1 + Math.floor(rV() * 1e6));
      visits[kind] = (visits[kind] || 0) + 1;
      if (done) {
        assert.ok(A.T.drawFillDone() && !A.IDLE.length && !A.TIMERS.length, `${label}: a visit that changed nothing asks no fill`);
        clean = true;
      }
    }
    // some slices, the last one maybe cut short, then a draw mid-fill
    for (let k = Math.floor(rI() * 3); k > 0; k--) slices += slice(A, Math.floor(rI() * 4)) ? 1 : 0;
    const units = B.play.L.filter(n => B.U[n]),
      n = pickOf(rA, units);
    assert.strictEqual(pickOf(rB, units), n);
    const s0 = 1 + Math.floor(rA() * 2147483645),
      a0 = A.CALCS.length,
      b0 = B.CALCS.length;
    rB();
    drawBoth(A, B, n, s0, label);
    // the draw found the data the idle fill made (page B computed it at the draw, page A did not)
    if (!check && A.CALCS.length === a0 && B.CALCS.length > b0) ready++;
    sameData(A, B, label);
    if (clean && !check) {
      assert.strictEqual(A.CALCS.length, a0, `${label}: after a visit that changed nothing, every unit's data kept`);
      kept++;
    }
  }
  assert.deepStrictEqual(A.later, [], 'no VIEW_CHECK difference thrown later');
  return {ops, slices, ready, visits, kept};
}

test('the draws and every unit’s data are the same filled idle as on demand, VIEW_CHECK off and on', t => {
  for (const check of [false, true])
    for (const seed of [1, 2, 3]) {
      const st = run(seed, check, 150);
      t.diagnostic(
        `seed ${seed}${check ? ' VIEW_CHECK' : ''}: ${st.slices} slices, ${st.ready} draws on data filled idle, writes ${JSON.stringify(st.ops)}`
      );
      assert.ok(st.ops.stats > 10 && st.ops.play > 3 && st.ops.record > 30, 'every writer ran');
      assert.ok(st.slices > 50, 'the fill ran between the steps');
      if (!check) assert.ok(st.ready > 10, 'draws found the data the idle fill made');
    }
  const st = run(4, false, 150, {idle: false});
  t.diagnostic(`no idle callback: ${st.slices} slices, ${st.ready} draws on data filled idle`);
  assert.ok(st.slices > 20 && st.ready > 10, 'without requestIdleCallback: the timed slices');
});

// REE-298: a visit to another subject and back (app.js inSubject, a sync's), on page A only, between the steps: the
// draws and every unit's data are still page B's (a fresh fill, no visit); a visit that read and wrote nothing leaves
// the fill done and every unit's data kept; one that read the visited units' draw data, or wrote data, has them made
// again, the same.
test('a visit to another subject and back: the same draws and data as a fresh fill, kept when it changed nothing', t => {
  for (const check of [false, true])
    for (const seed of [1, 2, 3]) {
      const st = run(seed, check, 150, {visits: true});
      t.diagnostic(
        `seed ${seed}${check ? ' VIEW_CHECK' : ''}: visits ${JSON.stringify(st.visits)}, ${st.kept} after which every unit's data was kept`
      );
      assert.ok(st.visits.clean > 5 && st.visits.reads > 3 && st.visits.write > 3, 'every kind of visit ran');
      if (!check) assert.ok(st.kept > 3, 'visits that changed nothing kept the data');
    }
});

test('once filled, a draw on any unit in play computes nothing; the fill follows a version move and the units in play', () => {
  const A = page(5, false);
  A.T.drawFillSoon();
  assert.strictEqual(A.IDLE.length, 1, 'one slice asked');
  A.T.drawFillSoon();
  assert.strictEqual(A.IDLE.length, 1, 'asked twice, still one');
  assert.ok(drain(A, 1) > 1, 'one unit a slice when the idle period ends');
  assert.ok(A.T.drawFillDone(), 'done');
  const n0 = A.CALCS.length;
  assert.strictEqual(A.CALCS[0], 'F', 'the units met first');
  for (const n of A.play.L) A.T.drawPhotos(n);
  assert.strictEqual(A.CALCS.length, n0, 'every unit in play ready');
  A.T.drawFillSoon();
  assert.strictEqual(A.IDLE.length, 0, 'a version filled asks nothing');
  A.T.stateBump('rec');
  A.T.drawFillSoon();
  assert.strictEqual(A.IDLE.length, 0, 'nor after the player’s own bump (the data version stays)');
  // a data bump mid-fill: the queue is made again, the units filled before it filled again
  A.T.stateBump();
  A.T.drawFillSoon();
  slice(A, 1);
  // the units in play change with the data (a subject switch): Z comes in, B leaves the data and the units in play
  const m = A.CALCS.length;
  A.U.Z = A.Z;
  delete A.U.B;
  A.play.L = ['Z', ...A.play.L.filter(n => n !== 'B')];
  A.T.stateBump();
  assert.ok(drain(A) >= 1 && A.T.drawFillDone(), 'the slice asked before fills the new version');
  const n1 = A.CALCS.length;
  for (const n of A.play.L) A.T.drawPhotos(n);
  assert.strictEqual(A.CALCS.length, n1, 'every unit in play ready, Z included, after the move');
  const since = A.CALCS.slice(m);
  assert.ok(since.includes('F') && since.includes('Z') && !since.includes('B'), 'F filled again for the new version, Z filled, B not');
  // held (tools/answercost.js): nothing filled until let go and asked again
  A.ctx.DRAW_FILL_HOLD = true;
  A.T.stateBump();
  A.T.drawFillSoon();
  const n2 = A.CALCS.length;
  drain(A);
  assert.strictEqual(A.CALCS.length, n2, 'held: nothing filled');
  assert.ok(!A.T.drawFillDone());
  A.ctx.DRAW_FILL_HOLD = false;
  A.T.drawFillSoon();
  drain(A);
  assert.ok(A.T.drawFillDone(), 'let go: filled');
});

// Mutants of the fill, each made from app.js's source: each leaves a unit in play not ready, or throws in an idle task.
test('mutation: the fill’s version rule and its queue, each broken, are caught', () => {
  const MUT = [
    [
      'done once for good, whatever the version',
      'DRAW_FILL.done === dataNow()) return;\n  DRAW_FILL.h',
      'DRAW_FILL.done !== -1) return;\n  DRAW_FILL.h'
    ],
    ['the queue kept across a version move', 'if (DRAW_FILL.qv !== v) {', 'if (DRAW_FILL.qv === -1) {'],
    [
      'done marked before the queue is empty',
      '  if (DRAW_FILL.q.length) DRAW_FILL.h = idleSoon(drawFillStep);\n  else DRAW_FILL.done = v;',
      '  DRAW_FILL.done = v;\n  if (DRAW_FILL.q.length) DRAW_FILL.h = idleSoon(drawFillStep);'
    ],
    ['the units not met left out', 'DRAW_FILL.q = [...L.filter(met), ...L.filter(n => !met(n))];', 'DRAW_FILL.q = L.filter(met);']
  ];
  for (const [what, from, to] of [['the fill as it is (no mutation: nothing caught)', null, null], ...MUT]) {
    assert.ok(!from || FILL.split(from).length === 2, `${what}: the mutated text occurs once`);
    const fill = from ? FILL.replace(from, to) : FILL;
    let caught = '';
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      if (caught) break;
      const A = page(seed, false, {fill}),
        r = rng(seed * 7);
      A.T.drawFillSoon();
      for (let i = 0; i < 60 && !caught; i++) {
        try {
          write(A, r);
          A.T.drawFillSoon();
          // a slice, then (now and then) a data bump between slices before the fill ends
          slice(A, 2);
          if (r() < 0.3) A.T.stateBump();
          A.T.drawFillSoon();
          drain(A);
          const n0 = A.CALCS.length;
          for (const n of A.play.L.filter(n => A.U[n])) A.T.drawPhotos(n);
          if (A.CALCS.length !== n0) caught = `seed ${seed} step ${i}: ${A.CALCS.slice(n0).join(', ')} not ready`;
        } catch (e) {
          caught = `seed ${seed} step ${i}: ${e.message}`;
        }
      }
    }
    if (from) assert.ok(caught, `${what}: caught`);
    else assert.strictEqual(caught, '', what);
  }
});
