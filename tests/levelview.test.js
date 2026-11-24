'use strict';
require('./slot.js').testGuard();
// @slow: the tree's score and the levels as views checked against the code before them on rated-world simulation runs
// The tree's score, the bars, the exam entry and the levels as views of the state version (model.js headScore, lvTable,
// lvSteps, lvStep; app.js stateView; docs/reviews/2026-11-24-incremental-engine-state.md, step 4): the global score is
// computed once per version and read as it is until the next, and so is the level of every unit with a record (its bar
// and its exam entry computed once each), a unit with no record at 0. A speed-up only: every read must give exactly what
// the code before gave. The reference is a copy of that code, kept here as it was (only its names changed, so it runs
// beside the new one), in the page of a rated-world run (tools/ratedworld.js: model.js whole on the world's units, the
// records P as the play makes them) of the fish, the corals and the sea slugs, with app.js's state version and views
// added to that page, VIEW_CHECK off and on. Between the reads, the writers the app has: a scored answer, the settings
// saved, a card opened, the sheet's version written round store.set (stateNow). Then: a record or a kept value changed
// with no bump is caught by VIEW_CHECK, and a view is computed once per version.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js'),
  LP = require('../tools/learnprof.js'),
  block = require('./block.js'),
  {memStorage} = require('./kept.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  APP = src('app.js'),
  MODEL = src('model.js');

// The tree's score and the levels before the views (model.js before), verbatim but for the names.
const REF = `const headScore0 = () => {
  const U = typeof UNITS === 'object' ? UNITS[SUBJ.id] : null,
    T = SUBJ.score && U && U.tree ? U.tree() : null;
  return T ? treeScore(P, T, SUBJ.score) : null;
};
const lvStep0 = n => {
  const k = level(n)[0];
  if (k === 'new') return 0;
  if (k === 'ok') return 5;
  const g = genScore(n) + 1e-9;
  return 1 + LV_AT.slice(0, 2).filter(x => g >= x).length + (examOn(n) ? 1 : 0);
};`;
// The views (model.js now), renamed (…N) beside the page's own model.js, which made its bindings with no stateView.
const LVN = /\b(lvTableCalc|lvTable|lvSteps|lvStep)\b/g;
const NEW = [
  block(MODEL, 'const headScore = typeof stateView', ';\n', {through: 1, file: 'model.js'}).replace(
    'const headScore ',
    'const headScoreN '
  ),
  block(MODEL, 'const lvTableCalc = ', 'const lvStep = n => lvSteps()(n);', {through: 1, file: 'model.js'}).replace(LVN, '$1N')
].join('\n');

// app.js's state version and views, then the views and the reference, in the page of a rated-world player pl: the
// version is bumped by model.js's own writers from now on (answeredAt, varRight, mxRecalc), and here after each answer.
function harness(pl, check) {
  const ctx = pl.ctx,
    later = [];
  Object.assign(ctx, {window: {VIEW_CHECK_ON: check}, localStorage: memStorage(), setTimeout: f => later.push(f)});
  ctx.localStorage.setItem('reefid-sheet-v', '1000');
  vm.runInContext(
    [
      block(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
      NEW,
      REF,
      'this.__T = {headScore: headScoreN, lvStep: lvStepN, lvSteps: lvStepsN, headScore0, lvStep0, stateBump, ver: () => STATE_V};'
    ].join('\n'),
    ctx
  );
  return {T: ctx.__T, later};
}

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pick = (r, L) => L[Math.floor(r() * L.length)];
// Out of the page's realm, so its objects compare as plain ones.
const plain = v => JSON.parse(JSON.stringify(v));

// The reads: the global score, some units' levels one by one (those with a record and some without), every unit's
// through one reader, each against the reference, a few times over (the reads after the first in a version are kept).
function reads(T, r, all, st, label) {
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
    const v0 = st.last,
      x = r();
    if (x < 0.35) assert.deepStrictEqual(plain(T.headScore()), plain(T.headScore0()), `${label}: headScore`);
    else if (x < 0.7)
      for (let j = 0; j < 12; j++) {
        const n = pick(r, j % 2 ? st.met() : all),
          a = T.lvStep(n);
        assert.strictEqual(a, T.lvStep0(n), `${label}: lvStep ${n}`);
        st.top = Math.max(st.top, a);
      }
    else {
      const lv = T.lvSteps();
      all.forEach(n => {
        const a = lv(n);
        assert.strictEqual(a, T.lvStep0(n), `${label}: lvSteps ${n}`);
        st.top = Math.max(st.top, a);
      });
    }
    st.reads++;
    st.last = T.ver();
    if (st.last === v0) st.kept++;
  }
}

// The writers between two reads, as the app writes them: the settings saved (store.set bumps), a card opened (the intro
// map saved: store.set bumps), the sheet's version written by another tab (seen by stateNow), nothing at all.
function write(ctx, M, T, U, r) {
  const x = r();
  if (x < 0.2) {
    const k = pick(r, [U.setK, U.setK + 'H', U.setK + 'O']);
    ctx.Q[k] = r() < 0.6;
    T.stateBump();
    return 'settings';
  }
  if (x < 0.3) {
    const L = ctx.pool().filter(n => !M.introduced(n));
    if (!L.length) return 'none';
    M.introAdd([pick(r, L)]);
    T.stateBump();
    return 'card';
  }
  if (x < 0.4) {
    ctx.localStorage.setItem('reefid-sheet-v', pick(r, ['150', '1000']));
    return 'sheet';
  }
  return 'none';
}

// A rated-world run of U, N answers: after each one, the scorer's caller bumps (quiz.js recordAnswer), then writes and
// reads; the false-alarm table held around the reads as the app's handlers hold it (app.js faHeld).
function played(U, profile, seed, N, check, st, opts = {}) {
  const W = RW.world(U, seed),
    pl = RW.playerOf(U, W, {profile, seed, N, cps: [N], ...opts}),
    ctx = pl.ctx,
    {T, later} = harness(pl, check),
    M = vm.runInContext('({introduced, introAdd})', ctx),
    all = [...U.slate, ...U.extra, ...(U.sp || []), ...(U.ssp || [])],
    r = rng(seed * 7919 + (check ? 1 : 0));
  st.met = () => Object.keys(ctx.P).filter(n => all.includes(n));
  st.last = T.ver();
  C.faArm(ctx.P);
  try {
    for (let i = 0; i < N; i++) {
      C.faDisarm(ctx.P);
      pl.step(i);
      C.faArm(ctx.P);
      T.stateBump();
      for (let j = 0; j < 1 + Math.floor(r() * 3); j++) {
        const op = write(ctx, M, T, U, r);
        st.ops[op] = (st.ops[op] || 0) + 1;
        reads(T, r, all, st, `${U.subject} ${profile} ${seed} after ${i + 1}, ${op}${check ? ', VIEW_CHECK' : ''}`);
      }
    }
  } finally {
    C.faDisarm(ctx.P);
  }
  assert.deepStrictEqual(later, [], 'no VIEW_CHECK difference thrown later');
  st.units = Math.max(st.units, st.met().length);
  return {pl, T};
}

// The sea slug units (app.js treeGenera on seaslug.json, as tests/stateview.test.js builds them), in the shape of the
// rated world's units (tools/ratedworld.js unitsOf): the genera on the slate, their species by their scientific names.
function seaslugU() {
  const SEA = C.subjectOf('seaslug'),
    SF = json('seaslug.json'),
    SG = C.treeGameRead(json('seaslug-game.json')),
    CUR = json('curation.json'),
    c = vm.createContext({
      DOM: {EX: C.DOM.EX},
      LV_AT: [0.5, 0.8, C.DOM.EX],
      INTRO: {START: 4},
      easyCover: C.easyCover,
      treeScoreTree: C.treeScoreTree,
      treeSpUnits: C.treeSpUnits,
      treeGenSets: C.treeGenSets,
      rankWeights: C.rankWeights,
      unitRankOf: C.unitRankOf,
      typeNormAll: C.typeNormAll,
      SUBJ: SEA,
      UNITS: {seaslug: {norm: C.typeNormAll}},
      sciOn: () => true,
      Math: Object.create(Math)
    });
  const treeGenera = vm.runInContext('(' + block(APP, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + ')', c),
    X = treeGenera(
      Object.assign(C.treeGen(SF, C.treePhotos(undefined, SG.photos, CUR.seaslug), undefined, C.unitRankOf(SEA)), {kinds: SEA.names}),
      SF
    ),
    slate = [...X.c1, ...X.c2, ...X.c3].filter(n => ((X.gen[n].views || {}).wide || []).length);
  return {
    subject: 'seaslug',
    X,
    DATA: {gen: {}},
    slate,
    extra: [],
    sp: [],
    ssp: (X.ssl || []).filter(n => slate.includes(X.gen[n].parent)),
    setK: 'ssp',
    rec: n => X.gen[n],
    views: n => ({wide: (X.gen[n].views || {}).wide || []}),
    covers: X.picks || {},
    core: X.c1,
    c3: X.c3,
    tree: null,
    kind: n => X.gen[n].rank || 'genus',
    imrFormsOf: n => X.gen[n].forms || ['a']
  };
}

const stats = () => ({reads: 0, kept: 0, units: 0, top: 0, ops: {}});
const say = (t, check, st) =>
  t.diagnostic(
    `${check ? 'VIEW_CHECK on' : 'VIEW_CHECK off'}: ${st.reads} reads, ${st.kept} of a kept value; up to ${st.units} units with a record, levels up to ${st.top}; writes ${JSON.stringify(st.ops)}`
  );

test('rated-world fish and coral runs: the global score and every level read are the code before, the kept ones included', t => {
  for (const check of [false, true]) {
    const st = stats();
    for (const [sub, profile, seed, N] of [
      ['fish', 'lectureRA', 1, 500],
      ['fish', 'expert', 2, 500],
      ['coral', 'lectureRA', 3, 400],
      ['coral', 'expert', 5, 1500]
    ])
      played(RW.unitsOf(sub), profile, seed, N, check, st);
    say(t, check, st);
    assert.ok(st.kept > st.reads / 3, 'most reads are of a kept value');
    assert.ok(st.top >= 4, 'units at the exam’s entry or learned');
    assert.ok(st.units > 60, 'the fish units with a record');
  }
});

// The sea slugs have no learner profile of their own (tools/learnprof.js): the corals' part of the profile plays them,
// a learner only; the engine is the sea slugs' (their subject, units, tree and rules).
test('rated-world sea slug runs: every level read is the code before, the kept ones included', t => {
  const U = seaslugU(),
    profOf = LP.profOf;
  LP.profOf = (n, s) => profOf(n, s === 'seaslug' ? 'coral' : s);
  try {
    for (const check of [false, true]) {
      const st = stats();
      played(U, 'lectureRA', 4, 300, check, st, {beyond: 'yes'});
      played(U, 'expert', 6, 900, check, st, {beyond: 'yes'});
      say(t, check, st);
      assert.ok(st.kept > st.reads / 3, 'most reads are of a kept value');
      assert.ok(st.top >= 3 && st.units > 20, 'sea slug genera met and at Advanced');
    }
  } finally {
    LP.profOf = profOf;
  }
});

// A short fish run, then the checks on one state: VIEW_CHECK catches a record changed with no bump and a kept value a
// reader changed; with it off, the value is kept until the next bump (what the check is for); one computation a version.
function oneState(check) {
  const U = RW.unitsOf('fish'),
    W = RW.world(U, 7),
    pl = RW.playerOf(U, W, {profile: 'strongRA', seed: 7, N: 200, cps: [200]});
  for (let i = 0; i < 200; i++) pl.step(i);
  const h = harness(pl, check),
    P = pl.ctx.P,
    n = Object.keys(P).find(x => U.slate.includes(x) && !P[x].mx && (P[x].ok || 0) > 2);
  assert.ok(n, 'a family met, not learned');
  return {...h, P, n, ctx: pl.ctx};
}

test('VIEW_CHECK: a record changed with no bump, or a kept score changed by a reader, throws now and in a task', () => {
  const {T, later, P, n} = oneState(true);
  assert.deepStrictEqual(plain(T.headScore()), plain(T.headScore0()));
  assert.strictEqual(T.lvStep(n), T.lvStep0(n));
  P[n].mx = 1; // the exam passed, written in place with no bump
  assert.throws(() => T.headScore(), /state view headScore: the value kept differs/);
  assert.strictEqual(later.length, 1, 'thrown again in a task of its own');
  assert.throws(() => later[0](), /state view headScore/);
  assert.throws(() => T.lvStep(n), /state view lvTableN: the value kept differs/); // renamed here (NEW)
  T.stateBump();
  assert.strictEqual(T.lvStep(n), 5);
  assert.deepStrictEqual(plain(T.headScore()), plain(T.headScore0()));
  T.headScore().by[1].entries = 2; // a reader that changed the shared score, deep inside
  assert.throws(() => T.headScore(), /state view headScore/);
  T.stateBump();
  assert.strictEqual(T.lvSteps()(n), 5);
});

test('VIEW_CHECK off: the value kept until the next bump; each view computed once per version', () => {
  const {T, P, n, ctx} = oneState(false);
  let trees = 0,
    levels = 0;
  const ts = ctx.treeScore,
    lv = ctx.level;
  ctx.treeScore = (...a) => (trees++, ts(...a));
  ctx.level = (...a) => (levels++, lv(...a));
  const h = T.headScore(),
    s = T.lvStep(n);
  assert.ok(trees === 1 && levels > 0, 'computed at the first read');
  const l0 = levels;
  for (let i = 0; i < 5; i++) (T.headScore(), T.lvStep(n), T.lvSteps()(n));
  assert.strictEqual(trees, 1, 'the score read six times: computed once');
  assert.strictEqual(levels, l0, 'the levels read again: computed once');
  P[n].mx = 1;
  assert.strictEqual(T.headScore(), h, 'a write with no bump is not seen');
  assert.strictEqual(T.lvStep(n), s);
  T.stateBump();
  assert.notStrictEqual(T.headScore(), h, 'bumped: computed again');
  assert.strictEqual(T.lvStep(n), 5);
  assert.strictEqual(trees, 2);
  // a unit with no record is at 0 without a computation
  const l1 = levels;
  assert.strictEqual(T.lvStep('g:no such unit'), 0);
  assert.strictEqual(levels, l1);
});
