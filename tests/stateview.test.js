'use strict';
require('./slot.js').testGuard();
// @slow: the units in play as views checked against the code before them on rated-world simulation runs
// The engine's state version and its first views (app.js STATE_V, stateBump, stateNow, stateView;
// docs/reviews/2026-11-24-incremental-engine-state.md, step 3): the units in play (bonusList, pool, sciUp, shareFree) and
// the scientific genera in the game (sciNow) are
// computed once per version of the state and read as they are until the next. A speed-up only: they must give exactly
// what the code before them gave, in the same order, at every read. The reference is a copy of that code, kept here as
// it was (only its names changed, so it runs beside the new one), over the app's own sets (app.js UNITS sets, sciOpen,
// spPlay, sciPlay, SCI_SP), the sheet's version and the first-launch record as sync.js and model.js read them, on
// rated-world fish and coral runs (the records P as the play makes them) and on made-up states of the real sea slug
// units, cut by the writers the app has: a scored answer, the settings saved (store.set), the sheet's version and the
// first-launch record written through store.set or round it (another tab: stateNow), a subject switch. Then: a write
// with no bump is caught by VIEW_CHECK, a non-input key bumps nothing, and every writer the version declares bumps it.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js'),
  block = require('./block.js'),
  {memStorage} = require('./kept.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  APP = src('app.js'),
  MODEL = src('model.js'),
  QUIZ = src('quiz.js'),
  SYNC = src('sync.js');

// The units in play before the views (app.js before), verbatim but for the names: each reader computed them again, and
// a set's units and auto were asked of the set at every read (autoOf0). The rank classes (rankUnits0), each unit's set
// (setOf0) and class (kindRank0) before their data views.
const REF = `const autoOf0 = (S, q = Q) => (S.auto && !q[S.k + 'O'] ? S.auto() : []);
const bonusList0 = () => [...new Set(SETS().flatMap(S => [...(Q[S.k] ? S.units() : []), ...autoOf0(S)]))];
const shareFree0 = () => SETS().flatMap(S => (S.after ? [...(Q[S.k + 'H'] ? S.units() : []), ...autoOf0(S)] : []));
const pool0 = () => [...slateGenera(), ...bonusList0()].filter(photoAny);
const sciUp0 = () =>
  new Set([...slateGenera(), ...SETS().flatMap(S => (S.k === SCI_SP.k ? [] : [...(Q[S.k] ? S.units() : []), ...autoOf0(S)]))]);
const sciNow = () =>
  TREEU ? (TREEU.sci || []).filter(n => (GX(n).circle || 1) < 2 || typeof generaOn !== 'function' || !!generaOn()) : [];
const kindRank0 = n => rankOf(n) + (kindOf(n) ? ':' + kindOf(n) : '');
const rankUnits0 = rk => [...new Set(SETS().flatMap(S => (S.all ? S.all() : S.units())))].filter(n => kindRank0(n) === rk);
const setOf0 = n => SETS().find(S => (S.all || S.units)().includes(n)) || null;`;
// The scientific genera in the game now (app.js sciNow) are a view too; the sets read them by that name.

const SV = 'reefid-sheet-v',
  VIEWN = ['wide', 'medium', 'macro'],
  LV_AT = [0.5, 0.8, C.DOM.EX];
const line = (S, from, file) => block(S, from, ';\n', {through: 1, file});
// The app's code the units in play read, one copy per page: the sets of every subject, the sheet's version (sync.js
// keptBy, sheetV and its gates), the first-launch record (model.js imrSaid), the state version and store.set.
const SHARED = [
  block(SYNC, 'const KEPT = new Map(),', '// Photo difficulty (the pooled Elo', {file: 'sync.js'}),
  `const SHEETV = '${SV}';`,
  block(SYNC, 'const sheetV = ', '\n', {through: 1, file: 'sync.js'}),
  block(SYNC, 'const TREE_SHEET = 143;', 'const TREES = ', {file: 'sync.js'}),
  block(MODEL, 'const imrOf = o =>', '// Families met first', {file: 'model.js'}),
  block(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
  block(APP, 'const store = {', '\n};\n', {through: 1, file: 'app.js'}),
  line(APP, 'const spOn = ', 'app.js'),
  line(APP, 'const sciSpOn = ', 'app.js'),
  line(APP, 'const sciSpAll = ', 'app.js'),
  block(APP, 'function lvlNext(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'const metCount = ', '\n};\n', {through: 1, file: 'app.js'}),
  block(APP, 'const kidsCalc = ', '// The species units in play', {file: 'app.js'}),
  block(APP, 'function spPlay(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'function sciPlay(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'function sciOpen(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'const SCI_SP = {', '\n};\n', {through: 1, file: 'app.js'}),
  line(APP, 'const setAuto = ', 'app.js'),
  line(APP, 'const setUnits = ', 'app.js'),
  line(APP, 'const autoOf = ', 'app.js'),
  'const SETS_OF = {coral: [{' +
    block(APP, "        k: 'bon',", '\n      }\n    ]', {file: 'app.js'}) +
    '}], fish: [' +
    block(APP, '      // The scientific genera (treeGenera, sciOpen)', '      SCI_SP\n    ],', {file: 'app.js'}) +
    'SCI_SP], seaslug: [SCI_SP]};',
  'const SETS = () => SETS_OF[SUBJ.id];',
  block(APP, 'const rankOf = n => {', '\n};\n', {through: 1, file: 'app.js'}),
  line(APP, 'const kindOf = ', 'app.js')
].join('\n');
// The views (app.js now) and the reference, each under the names its sets read (SCI_SP's auto reads sciUp).
const NEW = [
  line(APP, 'const sciUpCalc = ', 'app.js'),
  line(APP, 'const sciUp = stateView(', 'app.js'),
  line(APP, 'const bonusCalc = ', 'app.js'),
  line(APP, 'const bonusList = stateView(', 'app.js'),
  line(APP, 'const shareFreeCalc = ', 'app.js'),
  line(APP, 'const shareFree = stateView(', 'app.js'),
  line(APP, 'const poolCalc = ', 'app.js'),
  line(APP, 'const pool = stateView(', 'app.js'),
  line(APP, 'const sciNowCalc = ', 'app.js'),
  line(APP, 'const sciNow = dataView(', 'app.js'),
  line(APP, 'const kindRankCalc = ', 'app.js'),
  line(APP, 'const kindRank = ', 'app.js'),
  block(APP, 'const rankClassesCalc = ', 'const rankUnits = ', {file: 'app.js'}),
  line(APP, 'const rankUnits = ', 'app.js'),
  block(APP, 'const setMapCalc = ', 'const setOf = ', {file: 'app.js'}),
  line(APP, 'const setOf = ', 'app.js'),
  'this.F = {bonusList, pool, sciUp, shareFree, sciNow, rankUnits, setOf, kindRank, store, stateBump, stateNow, dataNow, VIEW_CHECK, STATE_KEYS, ver: () => STATE_V, dver: () => DATA_V};'
].join('\n');
const OLD =
  REF +
  '\nconst sciUp = sciUp0;\nthis.F = {bonusList: bonusList0, pool: pool0, sciUp: sciUp0, shareFree: shareFree0, sciNow, rankUnits: rankUnits0, setOf: setOf0, kindRank: kindRank0};';

// Two pages over one world W (its subject, tree, settings Q, records' readers and storage): the views and the code
// before them. W's members are read at every use (getters), so a switch or a new Q is seen by both.
function pages(W, check) {
  const mk = code => {
    const ctx = {
      C,
      keyGet: C.keyGet,
      SUBJECTS: C.SUBJECTS,
      ORG: C.ORG,
      subjKey: C.subjKey,
      startKey: C.startKey,
      startEventsOf: C.startEventsOf,
      SHEET_FLOOR: C.SHEET_FLOOR,
      BONUS: C.BONUS,
      LV_AT,
      INTRO: {START: W.START},
      window: {VIEW_CHECK_ON: check},
      setTimeout: f => W.later.push(f),
      UNITS: {fish: {}, seaslug: {}, coral: {}},
      // W.queued: the views' page has tasks (app.js freshNow; endTask ends one), so stateNow and its kept reads compare once
      // a task; the reference reads the storage at every read
      ...(W.queued && code === NEW ? {queueMicrotask: f => W.queued.push(f)} : {})
    };
    for (const k of ['SUBJ', 'TREEU', 'Q', 'localStorage'])
      Object.defineProperty(ctx, k, {get: () => W[k], set: v => (W[k] = v), enumerable: true});
    ctx.GX = n => W.GX(n);
    ctx.photoAny = n => W.photoAny(n);
    ctx.genScore = n => W.genScore(n);
    ctx.introduced = n => W.introduced(n);
    ctx.introducedFn = () => n => W.introduced(n); // model.js: introduced for a loop
    ctx.askedOpen = n => W.introduced(n);
    ctx.unitRankOf = C.unitRankOf;
    ctx.slateGenera = () => W.slate();
    vm.createContext(ctx);
    vm.runInContext(SHARED + '\n' + code, ctx);
    return ctx.F;
  };
  return {N: mk(NEW), O: mk(OLD)};
}
const items = v => (v instanceof Set || (v && v.constructor && v.constructor.name === 'Set') ? [...v] : [...v]);
// Every view against the reference, in a random order, a few times over (the reads after the first are the kept value).
// The views of one argument (rankUnits by class, setOf and kindRank by unit) are read for a few of the classes and units
// the tree has (st.units of W: every unit of its sets and slate).
function same(N, O, r, st, label, W) {
  const names = ['bonusList', 'pool', 'sciUp', 'shareFree', 'sciNow', 'rankUnits', 'setOf', 'kindRank'];
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
    const nm = names[Math.floor(r() * names.length)],
      v0 = st.ver();
    if (['rankUnits', 'setOf', 'kindRank'].includes(nm)) {
      const T = W.TREEU || {},
        all = [...W.slate(), ...(T.sci || []), ...(T.spl || []), ...(T.ssl || []), ...C.BONUS, 'nowhere'];
      for (let j = 0; j < 6; j++) {
        const n = pick(r, all),
          arg = nm === 'rankUnits' ? O.kindRank(n) : n,
          a = N[nm](arg),
          b = O[nm](arg);
        // each page has its own sets: the same set is the same key
        if (nm === 'setOf') assert.strictEqual(a && a.k, b && b.k, `${label}: setOf ${n}`);
        else assert.deepStrictEqual(nm === 'rankUnits' ? [...a] : a, nm === 'rankUnits' ? [...b] : b, `${label}: ${nm} ${arg}`);
        if (nm === 'rankUnits') st.classes = Math.max(st.classes || 0, a.length);
      }
    } else {
      const a = items(N[nm]()),
        b = items(O[nm]());
      assert.deepStrictEqual(a, b, `${label}: ${nm}`);
      if (nm === 'pool') st.units = Math.max(st.units, a.length);
    }
    st.reads++;
    if (st.ver() === v0) st.kept++;
  }
}
const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pick = (r, L) => L[Math.floor(r() * L.length)];
const SHEETS = [0, 150, 170, 180, 190, 1000];

// The writers between two reads: the settings saved (a set turned on, off, closed on the card, on by hand), the sheet's
// version or the first-launch record (through store.set, store.raw or store.drop, or round them as another tab writes:
// between two tasks when the page has tasks), nothing at all. With tasks, a task ends after about a third of the writes.
const endTask = W => W.queued && W.queued.splice(0).forEach(f => f());
function write(W, F, r, setK) {
  if (r() < 0.3) endTask(W);
  const x = r();
  // another tab, a test: no store method here, between two tasks
  const round = (k, raw) => (endTask(W), W.localStorage.setItem(k, raw));
  if (x < 0.25) {
    const Q = {...W.Q};
    const y = r();
    if (y < 0.4) Q[setK] = r() < 0.6;
    else if (y < 0.6) Q[setK + 'O'] = r() < 0.5 ? true : undefined;
    else if (y < 0.8) Q[setK + 'H'] = r() < 0.5;
    else Q.sciH = r() < 0.5;
    // learnSet, bonusSet, a merged choice: Q changed in place or another object (subjectLoad's qLoad), then saved
    if (r() < 0.5) {
      Object.keys(W.Q).forEach(k => delete W.Q[k]);
      Object.assign(W.Q, Q);
    } else W.Q = Q;
    F.store.set(C.subjKey(W.SUBJ.id, 'quiz'), W.Q);
    return 'settings';
  }
  if (x < 0.4) {
    const v = pick(r, SHEETS),
      y = r();
    if (y < 0.4) F.store.set(SV, v);
    else if (y < 0.55) F.store.raw(SV, JSON.stringify(v));
    else if (y < 0.65) F.store.drop(SV);
    else round(SV, JSON.stringify(v));
    return 'sheet';
  }
  if (x < 0.5) {
    const imr = r() < 0.5,
      o = imr ? {c: 'imr', t: 1, h: [['imr', 0, 1, 'card']]} : {c: 'new', t: 1, h: [['new', 0, 1, 'card']]},
      k = C.startKey(W.SUBJ.id),
      y = r();
    if (y < 0.4) F.store.set(k, o);
    else if (y < 0.55)
      F.store.raw(k, JSON.stringify(o)); // a progress file (progress.js loadData)
    else if (y < 0.65)
      F.store.drop(k); // a sign-out (sync.js)
    else round(k, JSON.stringify(o));
    return 'start';
  }
  return 'none';
}

function stats() {
  return {reads: 0, kept: 0, units: 0, ops: {}};
}

// A rated-world run of subject sub: after each answer (the scorer's caller bumps: quiz.js recordAnswer), some writes
// and reads; check: VIEW_CHECK on. The views' page has tasks (one comparison of the stored texts per task, as the app).
function played(sub, profile, seed, N, check, st) {
  const U = RW.unitsOf(sub),
    Wd = RW.world(U, seed),
    pl = RW.playerOf(U, Wd, {profile, seed, N, cps: [N]}),
    G = pl.G,
    ctx = pl.ctx,
    r = rng(seed * 7919 + (check ? 1 : 0)),
    W = {
      SUBJ: C.subjectOf(sub),
      TREEU: U.X || null,
      Q: {},
      localStorage: memStorage(),
      later: [],
      queued: [],
      START: vm.runInContext('INTRO.START', ctx),
      GX: n => G[n],
      photoAny: n => !!G[n] && VIEWN.some(v => ((U.views(n) || {})[v] || []).length),
      genScore: n => ctx.genScore(n),
      introduced: n => ctx.introduced(n),
      slate: () => U.slate
    };
  W.localStorage.setItem(SV, '1000');
  const {N: Fn, O: Fo} = pages(W, check);
  st.ver = Fn.ver;
  for (let i = 0; i < N; i++) {
    pl.step(i);
    // the scorer's caller (quiz.js recordAnswer) and the progress saved: the player's records, the data views kept
    Fn.stateBump('rec');
    for (let j = 0; j < 1 + Math.floor(r() * 3); j++) {
      const op = write(W, Fn, r, U.setK);
      st.ops[op] = (st.ops[op] || 0) + 1;
      same(Fn, Fo, r, st, `${sub} ${profile} ${seed} after ${i + 1}, ${op}${check ? ', VIEW_CHECK' : ''}`, W);
    }
  }
  assert.deepStrictEqual(W.later, [], 'no VIEW_CHECK difference thrown later');
  return pl;
}

test('rated-world fish and coral runs: every read of the units in play is the code before, the kept ones included', t => {
  for (const check of [false, true]) {
    const st = stats();
    for (const [sub, profile, seed, N] of [
      ['fish', 'lectureRA', 1, 700],
      ['fish', 'strongRA', 2, 400],
      ['coral', 'lectureRA', 3, 400]
    ])
      played(sub, profile, seed, N, check, st);
    t.diagnostic(
      `${check ? 'VIEW_CHECK on' : 'VIEW_CHECK off'}: ${st.reads} reads, ${st.kept} of a kept value; up to ${st.units} units in play; writes ${JSON.stringify(st.ops)}`
    );
    assert.ok(st.kept > st.reads / 3, 'most reads are of a kept value');
    assert.ok(st.units > 100, 'the fish species in play');
  }
});

// The sea slug units (app.js treeGenera on seaslug.json, as tests/lvlnext.test.js builds them).
function seaslugX() {
  const SEA = C.subjectOf('seaslug'),
    SF = json('seaslug.json'),
    SG = C.treeGameRead(json('seaslug-game.json')),
    CUR = json('curation.json'),
    ctx = vm.createContext({
      DOM: {EX: C.DOM.EX},
      LV_AT,
      INTRO: {START: 4},
      easyCover: C.easyCover,
      treeScoreTree: C.treeScoreTree,
      treeSpUnits: C.treeSpUnits,
      treeGenSets: C.treeGenSets,
      rankWeights: C.rankWeights,
      ORG: C.ORG,
      unitRankOf: C.unitRankOf,
      typeNormAll: C.typeNormAll,
      SUBJ: SEA,
      UNITS: {seaslug: {norm: C.typeNormAll}},
      sciOn: () => true,
      Math: Object.create(Math)
    });
  const treeGenera = vm.runInContext('(' + block(APP, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + ')', ctx);
  return treeGenera(
    Object.assign(C.treeGen(SF, C.treePhotos(undefined, SG.photos, CUR.seaslug), undefined, C.unitRankOf(SEA)), {kinds: SEA.names}),
    SF
  );
}

test('made-up states of the sea slugs, and subject switches fish ↔ sea slugs: the same units in play as before', t => {
  const X = seaslugX(),
    F = RW.unitsOf('fish').X,
    st = stats();
  for (const check of [false, true]) {
    const r = rng(check ? 4243 : 4241),
      bar = {},
      met = new Set(),
      W = {
        SUBJ: C.subjectOf('seaslug'),
        TREEU: X,
        Q: {},
        localStorage: memStorage(),
        later: [],
        queued: [],
        START: 4,
        GX: n => W.TREEU.gen[n],
        photoAny: n => !!W.TREEU.gen[n] && VIEWN.some(v => (W.TREEU.gen[n].views[v] || []).length) && !n.endsWith('3'),
        genScore: n => bar[n] || 0,
        introduced: n => met.has(n),
        slate: () => [...W.TREEU.c1, ...W.TREEU.c2, ...W.TREEU.c3]
      };
    W.localStorage.setItem(SV, '1000');
    const {N: Fn, O: Fo} = pages(W, check);
    st.ver = Fn.ver;
    for (let s = 0; s < 400; s++) {
      const T = W.TREEU,
        all = [...W.slate(), ...(T.sci || []), ...(T.spl || []), ...(T.ssl || [])],
        y = r();
      // the records (an answer, a merge, an adopted replay: some bars and units met move), then their bump
      if (y < 0.5) {
        for (let k = 0; k < 1 + Math.floor(r() * 30); k++) {
          const n = pick(r, all);
          bar[n] = pick(r, [0, 0.49, 0.5, 0.79, 0.8, 0.85, 0.95]);
          if (r() < 0.7) met.add(n);
          else met.delete(n);
        }
        Fn.stateBump('rec');
      } else if (y < 0.55) {
        // a subject switch (app.js subjectLoad: its tree, its records and settings, then the bump)
        const fish = W.SUBJ.id !== 'fish';
        W.SUBJ = C.subjectOf(fish ? 'fish' : 'seaslug');
        W.TREEU = fish ? F : X;
        W.Q = {};
        Fn.stateBump();
      } else write(W, Fn, r, W.SUBJ.id === 'fish' ? 'sci' : 'ssp');
      same(Fn, Fo, r, st, `${W.SUBJ.id} state ${s}${check ? ', VIEW_CHECK' : ''}`, W);
    }
    assert.deepStrictEqual(W.later, [], 'no VIEW_CHECK difference thrown later');
  }
  t.diagnostic(`${st.reads} reads, ${st.kept} of a kept value; up to ${st.units} units in play`);
  assert.ok(st.units > 50, 'species of the sea slugs or the fish in play');
});

// A small world of made-up units for the checks below: one family, two genera of it in the sci set.
function tiny(check, more = {}) {
  const G = {
      f: {views: {wide: [{}]}},
      'g:a': {parent: 'f', views: {wide: [{}]}},
      'g:b': {parent: 'f', views: {wide: [{}]}}
    },
    W = {
      SUBJ: C.subjectOf('fish'),
      TREEU: {gen: G, sci: ['g:a', 'g:b'], spl: [], ssl: [], c1: ['f'], c2: [], c3: []},
      Q: {},
      localStorage: memStorage(),
      later: [],
      START: 4,
      bar: {f: 0.9},
      GX: n => G[n],
      photoAny: n => !!G[n],
      genScore: n => W.bar[n] || 0,
      introduced: () => false,
      slate: () => ['f']
    };
  W.localStorage.setItem(SV, '1000');
  Object.assign(W, more);
  return {W, ...pages(W, check)};
}

test('VIEW_CHECK: an input written without a bump, or a kept list changed by a reader, throws now and in a task', () => {
  const {W, N} = tiny(true);
  assert.deepStrictEqual([...N.shareFree()], []);
  W.Q.sciH = true; // the settings changed in place, no store.set, no bump
  assert.throws(() => N.shareFree(), /state view shareFree: the value kept differs/);
  assert.strictEqual(W.later.length, 1, 'thrown again in a task of its own');
  assert.throws(() => W.later[0](), /state view shareFree/);
  // a view read inside another's computation (SCI_SP's auto reads sciUp) is checked there too
  assert.deepStrictEqual([...N.bonusList()], []);
  W.Q.sci = true;
  assert.throws(() => N.bonusList(), /state view (bonusList|sciUp): the value kept differs/);
  N.stateBump();
  assert.deepStrictEqual([...N.shareFree()], ['g:a', 'g:b']);
  assert.deepStrictEqual([...N.bonusList()], ['g:a', 'g:b']);
  N.bonusList().push('x'); // a reader that changed the shared value
  assert.throws(() => N.bonusList(), /state view bonusList/);
  // VIEW_CHECK off: the value kept, as it is, until the next bump (what the check is for)
  const o = tiny(false);
  assert.deepStrictEqual([...o.N.bonusList()], []);
  o.W.Q.sci = true;
  assert.deepStrictEqual([...o.N.bonusList()], [], 'a write with no bump is not seen');
  o.N.store.set(C.subjKey('fish', 'quiz'), o.W.Q);
  assert.deepStrictEqual([...o.N.bonusList()], ['g:a', 'g:b'], 'saved: seen');
});

test('the version: bumped by the inputs’ keys, by their text written round store.set, never by another key; one computation per version', () => {
  const {W, N} = tiny(false);
  let runs = 0;
  const g = W.genScore;
  W.genScore = n => (runs++, g(n));
  N.bonusList();
  const r0 = runs,
    v0 = N.ver();
  for (let i = 0; i < 5; i++) N.bonusList();
  assert.strictEqual(runs, r0, 'read five times: computed once');
  // the keys an answer writes that are no input
  ['reefid-log0', 'reefid-anonq', C.subjDev('fish', 'comeback'), C.subjDev('fish', 'pending'), 'reefid-ach'].forEach(k =>
    N.store.set(k, 1)
  );
  N.bonusList();
  assert.strictEqual(N.ver(), v0, 'no bump for a key that is no input');
  assert.strictEqual(runs, r0);
  for (const k of [
    C.subjKey('fish', 'progress'),
    C.subjKey('coral', 'quiz'),
    C.subjKey('seaslug', 'intro'),
    C.subjKey('fish', 'intro-offer'),
    C.startKey('coral'),
    SV,
    'reefid-photo-stats',
    'reefid-photo-stats-seaslug'
  ]) {
    const v = N.ver();
    N.store.set(k, 1);
    assert.ok(N.ver() > v, `${k}: an input, bumped`);
  }
  // another tab writes the sheet's version or a first-launch record: seen at the next read of a view
  const v1 = N.stateNow();
  W.localStorage.setItem(SV, '170');
  assert.ok(N.stateNow() > v1, 'the sheet version written round store.set');
  const v2 = N.stateNow();
  W.localStorage.setItem(C.startKey('seaslug'), '{"c":"imr"}');
  assert.ok(N.stateNow() > v2, 'a first-launch record written round store.set');
  assert.strictEqual(N.stateNow(), N.stateNow(), 'nothing written: the same version');
});

test('one comparison per task: stateNow reads the stored texts once a task; this tab’s writes are seen at once, another tab’s at the next task', () => {
  for (const check of [false, true]) {
    const {W, N} = tiny(check, {queued: []});
    let reads = 0;
    const get = W.localStorage.getItem;
    W.localStorage.getItem = k => (reads++, get(k));
    endTask(W);
    N.bonusList();
    const r0 = reads;
    for (let i = 0; i < 20; i++) (N.bonusList(), N.shareFree(), N.stateNow());
    if (!check) assert.strictEqual(reads, r0, 'forty more reads of a view in the task: no storage read');
    endTask(W);
    const v0 = N.stateNow();
    if (!check) assert.ok(reads > r0, 'the next task compares');
    // This tab: store.set, store.raw (a progress file) and store.drop (a sign-out) of an input's key, in the task.
    for (const [w, why] of [
      [() => N.store.set(SV, 170), 'store.set'],
      [() => N.store.raw(C.startKey('fish'), '{"c":"imr"}'), 'store.raw'],
      [() => N.store.drop(C.startKey('fish')), 'store.drop']
    ]) {
      const v = N.stateNow();
      w();
      assert.ok(N.stateNow() > v, `${why} in the task: a new version`);
    }
    assert.ok(N.stateNow() > v0);
    // Another tab, between two tasks: the next task's first read sees it.
    endTask(W);
    N.stateNow();
    const v1 = N.stateNow();
    endTask(W);
    W.localStorage.setItem(SV, '180');
    assert.ok(N.stateNow() > v1, 'another tab’s write: seen by the next task');
    // A write of this tab round the store methods (no storeWrote), read in the same task: VIEW_CHECK throws.
    const v2 = N.stateNow();
    W.localStorage.setItem(SV, '190');
    if (check) {
      assert.throws(() => N.stateNow(), /stateNow: a stored text changed in this task without storeWrote/);
      W.later.length = 0;
    } else assert.strictEqual(N.stateNow(), v2, 'unchecked: not seen in the task (so every writer calls storeWrote)');
    endTask(W);
    assert.ok(N.stateNow() > v2, 'seen by the next task');
  }
});

test('the declared names: sync.js SHEETV and model.js OWN_STATS are the keys app.js lists', () => {
  assert.match(SYNC, /const SHEETV = 'reefid-sheet-v',/);
  assert.match(MODEL, /const OWN_STATS = 'reefid-photo-stats-';/);
  assert.match(MODEL, /store\.get\('reefid-photo-stats', \{\}\)/);
  assert.match(APP, /const STATE_LIVE = \['reefid-sheet-v', \.\.\.SUBJECTS\.map\(S => startKey\(S\.id\)\)\]/);
});

// Every writer the version declares (app.js STATE_V's comment) bumps it after it writes: a test on the code, so a writer
// that loses its bump fails here, not only in a smoke that happens to read a view after it. The writers of the player's
// records and settings bump the state version alone (stateBump('rec')); every other writer bumps the data version too
// (stateBump(), no argument): the data, the tree, the subject, the photo statistics, a file loaded.
test('every declared writer bumps the version, the data version for every input but the player’s records', () => {
  const has = (S, from, to, file, n = 1, rec = false) => {
    const b = block(S, from, to, {through: 1, file}),
      re = rec ? /stateBump\('rec'\)/g : /stateBump\(\)/g;
    assert.ok((b.match(re) || []).length >= n, `${file} ${from.trim()}: ${n} ${rec ? "stateBump('rec')" : 'stateBump()'} at least`);
  };
  has(APP, 'const st = n =>', ';\n', 'app.js', 1, true);
  has(APP, 'function subjectLoad(S, keep) {', '\n}\n', 'app.js', 2);
  has(APP, 'function inSubject(id, fn) {', '\n}\n', 'app.js', 2);
  has(APP, 'function treePull() {', '\n}\n', 'app.js');
  has(APP, 'const treeBuild = () => {', '\n};\n', 'app.js');
  has(APP, 'function build() {', '\n}\n', 'app.js');
  has(APP, 'function rankPhotos() {', '\n}\n', 'app.js');
  has(APP, "  const rb = document.getElementById('reset');", 'introReset();', 'app.js', 1, true);
  assert.match(APP, /if \(STATE_KEYS\.has\(k\)\) stateBump\(REC_KEYS\.has\(k\) \? 'rec' : undefined\);/, 'store.set: an input key bumps');
  has(MODEL, 'function mxRecalc(fn, why', '\n}\n', 'model.js', 1, true);
  has(MODEL, 'function answeredAt(s, good', '\n}\n', 'model.js', 1, true);
  has(MODEL, 'function varRight(n, L) {', '\n}\n', 'model.js', 1, true);
  has(MODEL, 'function statsJoin(base = PBASE) {', '\n}\n', 'model.js');
  has(MODEL, '  SUBJ_HOOKS.push(keep => {', '\n  });\n', 'model.js');
  assert.match(MODEL, /\nif \(typeof stateBump === 'function'\) stateBump\(\);\n$/, 'model.js: a bump once loaded');
  has(QUIZ, 'function recordAnswer({', '\n}\n', 'quiz.js', 2, true);
  has(SYNC, 'function replayAdoptS(', '\n}\n', 'sync.js', 1, true);
  has(SYNC, 'function mergeSubject(', '\n}\n', 'sync.js', 2, true);
  assert.match(SYNC, /\nif \(typeof stateBump === 'function'\) stateBump\(\);\n$/, 'sync.js: a bump once loaded');
});

// The data version: bumped by every writer but the player's records and settings, so the data views (the rank classes,
// each unit's set and class, the scientific genera in the game) are kept across the answers and made again when the
// sheet's version changes (here, or written by another tab).
test('the data version: kept across the player’s writes, moved by the sheet’s version and every other bump', () => {
  const {W, N} = tiny(false);
  N.rankUnits('genus'); // the first read compares the stored texts (the sheet's version: data)
  const d0 = N.dver();
  for (const k of [C.subjKey('fish', 'progress'), C.subjKey('fish', 'quiz'), C.subjKey('fish', 'intro'), C.startKey('fish')])
    N.store.set(k, 1);
  N.stateBump('rec');
  assert.strictEqual(N.dataNow(), d0, 'the player’s records and settings: the data views kept');
  N.store.set(SV, 170);
  const d1 = N.dataNow();
  assert.ok(d1 > d0, 'the sheet’s version: a new data version');
  W.localStorage.setItem(SV, '180'); // another tab (no task here: compared at the next read)
  assert.ok(N.dataNow() > d1, 'the sheet’s version written round store.set');
  const d2 = N.dataNow();
  W.localStorage.setItem(C.startKey('fish'), '{"c":"imr"}');
  assert.ok(N.ver() >= 0 && N.dataNow() === d2, 'a first-launch record written round store.set: the player’s, the data kept');
  N.stateBump();
  assert.ok(N.dataNow() > d2, 'a bump with no argument: the data too');
});
