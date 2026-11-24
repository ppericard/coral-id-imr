'use strict';
require('./slot.js').testGuard();
// @slow: the units met, the bars, the exam entry, the comeback's units, the start's level and a level's need as views,
// checked against the code before them on rated-world simulation runs
// model.js's views of the state version (app.js stateView, stateViewBy) and of the data version (dataViewBy;
// docs/spec/model.md "The state version and its views"): the units met (metCalc: introduced, introducedFn), each unit's
// bar (genScoreCalc: genScore) and exam entry (examOnCalc: examOn), the units the comeback reads (cbPlayCalc,
// cbGeneraCalc), the start's level (startPCalc: startP), a class's units with a photo (lvlAllCalc, a data view) and its
// need (lvlNeedCalc). A speed-up only: every read must give exactly what the code before them gave. The reference is a
// copy of that code, kept here as it was (only its names changed, so it runs beside the new one), in the page of a
// rated-world run (tools/ratedworld.js: model.js whole on the world's units, the records P as the play makes them) of
// the fish, the corals and the sea slugs, with app.js's state and data versions added to that page, VIEW_CHECK off and
// on. Between the reads, the writers the app has: a scored answer, the settings saved, a card opened, a first-launch
// record, the sheet's version written by another tab between two of the page's tasks. Then the mutation checks: an
// answer whose bump is lost, or a bump of the player's records that forgets the state version, is caught, by VIEW_CHECK
// and by the reference.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js'),
  LP = require('../tools/learnprof.js'),
  block = require('./block.js'),
  {memStorage} = require('./kept.js'),
  seaslugU = require('./seaslugunits.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  APP = src('app.js'),
  MODEL = src('model.js');

// The code before the views (model.js before), verbatim but for the names.
const REF = `const introduced0 = n => !closed(n) && (asked(n) || n in introMap());
const genScore0 = n => scoreOf(P[n], P, n);
const examOn0 = n => {
  const s = P[n] || {};
  return !s.mx && !(GX(n) || {}).noex && examOpen(s, P, n) && !lookLeft(n).length && (!!s.ex || !matesLeft(n).length);
};
const cbPlay0 = () => [...slateGenera(), ...bonusList()].filter(n => !closed(n));
const cbGenera0 = () => cbPlay0().filter(n => (P[n] || {}).ok > 0);
const startP0 = () => startV().p;
const lvlAll0 = (k, list) => (typeof rankUnits === 'function' ? rankUnits(k) : list).filter(n => rankKind(n) === k && photoAny(n));
const lvlNeed0 = (k, list) => {
  if (!k) return 0;
  const L = lvlAll0(k, list);
  return Math.max(0, Math.min(INTRO.START, L.length) - L.filter(introduced0).length);
};`;
// The views (model.js now), renamed (…N) beside the page's own model.js, which made its bindings with no stateView.
const ren = (s, names) => s.replace(new RegExp(`\\b(${names.join('|')})\\b`, 'g'), '$1N');
const NEW = [
  ren(block(MODEL, 'const introducedCalc = ', 'const introducedFn = ', {file: 'model.js'}), ['introducedCalc', 'metCalc', 'metNow']),
  ren(block(MODEL, 'const introducedFn = ', 'const introduced = ', {file: 'model.js'}), ['introducedCalc', 'introducedFn', 'metNow']),
  ren(block(MODEL, 'const introduced = metNow', ';\n', {through: 1, file: 'model.js'}), ['introducedCalc', 'introduced', 'metNow']),
  ren(block(MODEL, 'const genScoreCalc = ', 'const genScore = ', {file: 'model.js'}), ['genScoreCalc']),
  ren(block(MODEL, 'const genScore = typeof', ';\n', {through: 1, file: 'model.js'}), ['genScoreCalc', 'genScore']),
  ren(block(MODEL, 'const examOnCalc = ', 'const examOn = ', {file: 'model.js'}), ['examOnCalc']),
  ren(block(MODEL, 'const examOn = typeof', ';\n', {through: 1, file: 'model.js'}), ['examOnCalc', 'examOn']),
  ren(block(MODEL, 'const cbPlayCalc = ', 'const cbGenera = ', {file: 'model.js'}), ['cbPlayCalc', 'cbGeneraCalc', 'cbPlay']),
  ren(block(MODEL, 'const cbGenera = ', ';\n', {through: 1, file: 'model.js'}), ['cbGeneraCalc', 'cbGenera']),
  ren(block(MODEL, 'const startPCalc = ', 'const startP = ', {file: 'model.js'}), ['startPCalc']),
  ren(block(MODEL, 'const startP = typeof', ';\n', {through: 1, file: 'model.js'}), ['startPCalc', 'startP']),
  ren(block(MODEL, 'const lvlAllCalc = ', 'const openFresh = ', {file: 'model.js'}), [
    'lvlAllCalc',
    'lvlNeedCalc',
    'lvlViews',
    'lvlAll',
    'lvlNeed'
  ])
].join('\n');
const NAMES = ['introduced', 'genScore', 'examOn', 'cbPlay', 'cbGenera', 'startP', 'lvlAll', 'lvlNeed'];

// app.js's versions and views, then the views and the reference, in the page of a rated-world player pl. The page's
// store is the rated world's (no storeWrote): the harness bumps after each write, as the app's store.set does. The
// page's model.js writers (answeredAt, varRight, mxRecalc) bump through the same stateBump. mutate: a change to app.js's
// block (the mutation checks below).
const BUMP = "const stateBump = rec => void (STATE_V++, rec === 'rec' || DATA_V++);";
function harness(pl, check, mutate = s => s) {
  const ctx = pl.ctx,
    later = [],
    queued = [],
    app = block(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'});
  assert.ok(app.includes(BUMP), 'app.js stateBump as the mutations expect it');
  Object.assign(ctx, {
    window: {VIEW_CHECK_ON: check},
    localStorage: memStorage(),
    setTimeout: f => later.push(f),
    queueMicrotask: f => queued.push(f)
  });
  ctx.localStorage.setItem('reefid-sheet-v', '1000');
  vm.runInContext(
    [
      mutate(app),
      NEW,
      REF,
      `this.__T = {${NAMES.map(n => `${n}: ${n}N, ${n}0`).join(', ')}, introducedFn: introducedFnN, stateBump, ver: () => STATE_V, dver: () => DATA_V};`
    ].join('\n'),
    ctx
  );
  ctx.__endTask = () => queued.splice(0).forEach(f => f());
  return {T: ctx.__T, later};
}

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const rankKindOf = ctx => vm.runInContext('rankKind', ctx); // model.js's, a binding of the page
const pick = (r, L) => L[Math.floor(r() * L.length)];
const arr = v => (Array.isArray(v) || (v && typeof v.length === 'number') ? [...v] : v);

// The reads, each against the reference, a few times over (the reads after the first in a version are kept): some
// units met or not, their bars and exam entries; the comeback's lists; the start's level; a level's units and need.
function reads(T, ctx, r, all, ks, st, label) {
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
    const v0 = st.last,
      x = r();
    if (x < 0.4) {
      const f = T.introducedFn();
      for (let j = 0; j < 16; j++) {
        const n = pick(r, j % 4 ? all : ['constructor', 'nowhere', ...st.met()]);
        assert.strictEqual(T.introduced(n), T.introduced0(n), `${label}: introduced ${n}`);
        assert.strictEqual(f(n), T.introduced0(n), `${label}: introducedFn ${n}`);
        if (T.introduced0(n)) st.met1++;
      }
    } else if (x < 0.7)
      for (let j = 0; j < 12; j++) {
        const n = pick(r, j % 2 ? st.met() : all);
        if (!n) continue;
        assert.strictEqual(T.genScore(n), T.genScore0(n), `${label}: genScore ${n}`);
        const e = T.examOn(n);
        assert.strictEqual(e, T.examOn0(n), `${label}: examOn ${n}`);
        if (e) st.exam++;
      }
    else if (x < 0.8) {
      assert.deepStrictEqual(arr(T.cbPlay()), arr(T.cbPlay0()), `${label}: cbPlay`);
      assert.deepStrictEqual(arr(T.cbGenera()), arr(T.cbGenera0()), `${label}: cbGenera`);
      assert.strictEqual(T.startP(), T.startP0(), `${label}: startP`);
    } else
      for (const kk of ks) {
        assert.deepStrictEqual(arr(T.lvlAll(kk, ctx.pool())), arr(T.lvlAll0(kk, ctx.pool())), `${label}: lvlAll ${kk}`);
        const w = T.lvlNeed(kk, ctx.pool());
        assert.strictEqual(w, T.lvlNeed0(kk, ctx.pool()), `${label}: lvlNeed ${kk}`);
        if (w > 0 && kk) st.need++;
      }
    st.reads++;
    st.last = T.ver();
    if (st.last === v0) st.kept++;
  }
}

// The writers between two reads, as the app writes them: the settings saved (store.set bumps, the player's), a card
// opened (the intro map saved), a first-launch record saved, the sheet's version written by another tab (seen by
// stateNow at the next task), nothing at all.
function write(ctx, M, T, U, r) {
  if (r() < 0.3) ctx.__endTask(); // a task ends now and then; another tab writes between two
  const x = r();
  if (x < 0.2) {
    const k = pick(r, [U.setK, U.setK + 'H', U.setK + 'O']);
    ctx.Q[k] = r() < 0.6;
    T.stateBump('rec');
    return 'settings';
  }
  if (x < 0.3) {
    const L = ctx.pool().filter(n => !M.introduced(n));
    if (!L.length) return 'none';
    M.introAdd([pick(r, L)]);
    T.stateBump('rec');
    return 'card';
  }
  if (x < 0.35) {
    M.startSet(pick(r, ['new', 'imr', 'know']), 'card');
    T.stateBump('rec');
    return 'start';
  }
  if (x < 0.45) {
    ctx.__endTask();
    ctx.localStorage.setItem('reefid-sheet-v', pick(r, ['150', '1000']));
    return 'sheet';
  }
  return 'none';
}

// A rated-world run of U, N answers: after each one, the scorer's caller bumps the state version (quiz.js recordAnswer:
// stateBump('rec')), then writes and reads.
function played(U, profile, seed, N, check, st, opts = {}) {
  const W = RW.world(U, seed),
    pl = RW.playerOf(U, W, {profile, seed, N, cps: [N], ...opts}),
    ctx = pl.ctx,
    {T, later} = harness(pl, check),
    M = vm.runInContext('({introduced, introAdd, startSet})', ctx),
    all = [...U.slate, ...U.extra, ...(U.sp || []), ...(U.ssp || [])],
    ks = ['', ...new Set(all.map(rankKindOf(ctx)))],
    r = rng(seed * 7919 + (check ? 1 : 0)),
    d0 = T.dver();
  st.met = () => Object.keys(ctx.P).filter(n => all.includes(n));
  st.last = T.ver();
  for (let i = 0; i < N; i++) {
    pl.step(i);
    T.stateBump('rec');
    // after every other answer: the reads cost more than the play (the reference computes everything again)
    for (let j = 0; j < (i % 2 ? 0 : 1 + Math.floor(r() * 3)); j++) {
      const op = write(ctx, M, T, U, r);
      st.ops[op] = (st.ops[op] || 0) + 1;
      reads(T, ctx, r, all, ks, st, `${U.subject} ${profile} ${seed} after ${i + 1}, ${op}${check ? ', VIEW_CHECK' : ''}`);
    }
  }
  assert.deepStrictEqual(later, [], 'no VIEW_CHECK difference thrown later');
  st.units = Math.max(st.units, st.met().length);
  st.data = Math.max(st.data, T.dver() - d0);
  return {pl, T};
}

const stats = () => ({reads: 0, kept: 0, units: 0, met1: 0, exam: 0, need: 0, data: 0, ops: {}});
const say = (t, check, st) =>
  t.diagnostic(
    `${check ? 'VIEW_CHECK on' : 'VIEW_CHECK off'}: ${st.reads} reads, ${st.kept} of a kept value; up to ${st.units} units with a record, ${st.met1} reads of a unit met, ${st.exam} of an exam entry, ${st.need} of a level's need above 0; data versions in a run up to ${st.data}; writes ${JSON.stringify(st.ops)}`
  );

test('rated-world fish and coral runs: the units met, bars, exam entries, comeback lists, start level and level needs are the code before', t => {
  for (const check of [false, true]) {
    const st = stats();
    for (const [sub, profile, seed, N] of [
      ['fish', 'lectureRA', 1, 250],
      ['fish', 'expert', 2, 400],
      ['coral', 'lectureRA', 3, 150],
      ['coral', 'expert', 5, 700]
    ])
      played(RW.unitsOf(sub), profile, seed, N, check, st);
    say(t, check, st);
    assert.ok(st.kept > st.reads / 3, 'most reads are of a kept value');
    assert.ok(st.exam > 5, 'exam entries compared');
    assert.ok(st.need > 5, 'a level short of its group compared');
    assert.ok(st.units > 60, 'the fish units with a record');
  }
});

// The sea slugs have no learner profile of their own (tools/learnprof.js): the corals' part of the profile plays them.
test('rated-world sea slug runs: the same views, the code before', t => {
  const U = seaslugU(),
    profOf = LP.profOf;
  LP.profOf = (n, s) => profOf(n, s === 'seaslug' ? 'coral' : s);
  try {
    for (const check of [false, true]) {
      const st = stats();
      played(U, 'lectureRA', 4, 300, check, st, {beyond: 'yes'});
      played(U, 'expert', 6, 600, check, st, {beyond: 'yes'});
      say(t, check, st);
      assert.ok(st.kept > st.reads / 3, 'most reads are of a kept value');
      assert.ok(st.units > 20 && st.need > 0, 'sea slug genera met, a level of species short of its group');
    }
  } finally {
    LP.profOf = profOf;
  }
});

// The mutation checks: the runs above with the version's bump broken must fail, so they would catch a broken version:
// (1) stateBump moving nothing; (2) stateBump('rec'), the bump of every answer, moving the data version but not the
// state version. VIEW_CHECK throws, and without it a read differs from the code before.
const MUTANTS = {
  'a bump that moves nothing': s => s.replace(BUMP, 'const stateBump = rec => void rec;'),
  'the records’ bump forgets the state version': s =>
    s.replace(BUMP, "const stateBump = rec => void (rec === 'rec' || STATE_V++, DATA_V++);")
};
test('mutations: a broken version bump is caught by the runs, VIEW_CHECK on and off', () => {
  const U = RW.unitsOf('fish');
  for (const [why, mutate] of Object.entries(MUTANTS))
    for (const check of [true, false]) {
      const W = RW.world(U, 9),
        pl = RW.playerOf(U, W, {profile: 'lectureRA', seed: 9, N: 300, cps: [300]}),
        {T, later} = harness(pl, check, mutate),
        all = [...U.slate, ...U.extra, ...(U.sp || [])];
      let caught = '';
      for (let i = 0; i < 300 && !caught; i++) {
        pl.step(i);
        T.stateBump('rec');
        try {
          for (const n of all)
            if (T.genScore(n) !== T.genScore0(n) || T.introduced(n) !== T.introduced0(n) || T.examOn(n) !== T.examOn0(n))
              caught = `a read differs after ${i + 1} answers`;
        } catch (e) {
          if (!/state view .*: the value kept differs/.test(e.message)) throw e;
          caught = e.message;
        }
      }
      later.length = 0;
      assert.ok(caught, `${why}${check ? ', VIEW_CHECK' : ''}: caught`);
      if (check) assert.match(caught, /state view/, `${why}: VIEW_CHECK throws`);
    }
});

test('mutation: the sheet’s version moved with the player’s bump alone leaves a data view as it was; its own bump makes it again', () => {
  const U = RW.unitsOf('fish'),
    pl = RW.playerOf(U, RW.world(U, 3), {profile: 'lectureRA', seed: 3, N: 50, cps: [50]}),
    ctx = pl.ctx,
    {T} = harness(pl, false),
    k = rankKindOf(ctx)(U.sp[0]),
    rk = ctx.rankUnits;
  for (let i = 0; i < 50; i++) pl.step(i);
  const a = T.lvlAll(k, ctx.pool());
  assert.ok(a.length > 4, 'a class of species with photos');
  ctx.rankUnits = x => (x === k ? rk(x).slice(0, 2) : rk(x)); // the data changed (fewer units of the class in the game)
  T.stateBump('rec'); // a bump that forgets the data version
  assert.strictEqual(T.lvlAll(k, ctx.pool()), a, 'kept: the data view did not see the change');
  assert.notDeepStrictEqual(arr(T.lvlAll(k, ctx.pool())), arr(T.lvlAll0(k, ctx.pool())), 'the code before reads the change');
  T.stateBump(); // the data version too
  assert.deepStrictEqual(arr(T.lvlAll(k, ctx.pool())), arr(T.lvlAll0(k, ctx.pool())), 'made again');
  assert.strictEqual(T.lvlAll(k, ctx.pool()).length, 2);
  ctx.rankUnits = rk;
});

test('one computation per version: the views computed at their first read, kept until the next bump', () => {
  const U = RW.unitsOf('fish'),
    pl = RW.playerOf(U, RW.world(U, 5), {profile: 'strongRA', seed: 5, N: 200, cps: [200]}),
    ctx = pl.ctx;
  for (let i = 0; i < 200; i++) pl.step(i);
  const {T} = harness(pl, false),
    n = Object.keys(ctx.P).find(x => U.slate.includes(x) && (ctx.P[x].ok || 0) > 2);
  let scores = 0;
  const so = ctx.scoreOf;
  ctx.scoreOf = (...a) => (scores++, so(...a));
  try {
    T.genScore(n);
    const s0 = scores;
    for (let i = 0; i < 5; i++) T.genScore(n);
    assert.strictEqual(scores, s0, 'a bar read six times: computed once');
    T.stateBump('rec');
    T.genScore(n);
    assert.strictEqual(scores, s0 + 1, 'bumped: computed again');
    const d = T.dver(),
      k = rankKindOf(ctx)(U.sp[0]),
      L = T.lvlAll(k, ctx.pool());
    T.stateBump('rec');
    assert.strictEqual(T.lvlAll(k, ctx.pool()), L, 'a data view: kept across the player’s bumps');
    assert.strictEqual(T.dver(), d);
  } finally {
    ctx.scoreOf = so;
  }
});
