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

// The units in play before the views (app.js before), verbatim but for the names: each reader computed them again.
const REF = `const bonusList0 = () => [...new Set(SETS().flatMap(S => [...(Q[S.k] ? S.units() : []), ...autoOf(S)]))];
const shareFree0 = () => SETS().flatMap(S => (S.after ? [...(Q[S.k + 'H'] ? S.units() : []), ...autoOf(S)] : []));
const pool0 = () => [...slateGenera(), ...bonusList0()].filter(photoAny);
const sciUp0 = () =>
  new Set([...slateGenera(), ...SETS().flatMap(S => (S.k === SCI_SP.k ? [] : [...(Q[S.k] ? S.units() : []), ...autoOf(S)]))]);
const sciNow = () =>
  TREEU ? (TREEU.sci || []).filter(n => (GX(n).circle || 1) < 2 || typeof generaOn !== 'function' || !!generaOn()) : [];`;
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
  block(APP, 'function spPlay(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'function sciPlay(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'function sciOpen(', '\n}\n', {through: 1, file: 'app.js'}),
  block(APP, 'const SCI_SP = {', '\n};\n', {through: 1, file: 'app.js'}),
  line(APP, 'const autoOf = ', 'app.js'),
  'const SETS_OF = {coral: [{' +
    block(APP, "        k: 'bon',", '\n      }\n    ]', {file: 'app.js'}) +
    '}], fish: [' +
    block(APP, '      // The scientific genera (treeGenera, sciOpen)', '      SCI_SP\n    ],', {file: 'app.js'}) +
    'SCI_SP], seaslug: [SCI_SP]};',
  'const SETS = () => SETS_OF[SUBJ.id];'
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
  line(APP, 'const sciNow = stateView(', 'app.js'),
  'this.F = {bonusList, pool, sciUp, shareFree, sciNow, store, stateBump, stateNow, VIEW_CHECK, STATE_KEYS, ver: () => STATE_V};'
].join('\n');
const OLD = REF + '\nconst sciUp = sciUp0;\nthis.F = {bonusList: bonusList0, pool: pool0, sciUp: sciUp0, shareFree: shareFree0, sciNow};';

// Two pages over one world W (its subject, tree, settings Q, records' readers and storage): the views and the code
// before them. W's members are read at every use (getters), so a switch or a new Q is seen by both.
function pages(W, check) {
  const mk = code => {
    const ctx = {
      C,
      keyGet: C.keyGet,
      SUBJECTS: C.SUBJECTS,
      subjKey: C.subjKey,
      startKey: C.startKey,
      startEventsOf: C.startEventsOf,
      SHEET_FLOOR: C.SHEET_FLOOR,
      BONUS: C.BONUS,
      LV_AT,
      INTRO: {START: W.START},
      window: {VIEW_CHECK_ON: check},
      setTimeout: f => W.later.push(f),
      UNITS: {fish: {}, seaslug: {}, coral: {}}
    };
    for (const k of ['SUBJ', 'TREEU', 'Q', 'localStorage'])
      Object.defineProperty(ctx, k, {get: () => W[k], set: v => (W[k] = v), enumerable: true});
    ctx.GX = n => W.GX(n);
    ctx.photoAny = n => W.photoAny(n);
    ctx.genScore = n => W.genScore(n);
    ctx.introduced = n => W.introduced(n);
    ctx.askedOpen = n => W.introduced(n);
    ctx.slateGenera = () => W.slate();
    vm.createContext(ctx);
    vm.runInContext(SHARED + '\n' + code, ctx);
    return ctx.F;
  };
  return {N: mk(NEW), O: mk(OLD)};
}
const items = v => (v instanceof Set || (v && v.constructor && v.constructor.name === 'Set') ? [...v] : [...v]);
// Every view against the reference, in a random order, a few times over (the reads after the first are the kept value).
function same(N, O, r, st, label) {
  const names = ['bonusList', 'pool', 'sciUp', 'shareFree', 'sciNow'];
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
    const nm = names[Math.floor(r() * names.length)],
      v0 = st.ver(),
      a = items(N[nm]()),
      b = items(O[nm]());
    assert.deepStrictEqual(a, b, `${label}: ${nm}`);
    st.reads++;
    if (st.ver() === v0) st.kept++;
    if (nm === 'pool') st.units = Math.max(st.units, a.length);
  }
}
const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pick = (r, L) => L[Math.floor(r() * L.length)];
const SHEETS = [0, 150, 170, 180, 190, 1000];

// The writers between two reads: the settings saved (a set turned on, off, closed on the card, on by hand), the sheet's
// version or the first-launch record (through store.set, or round it as another tab writes), nothing at all.
function write(W, F, r, setK) {
  const x = r();
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
    const v = pick(r, SHEETS);
    if (r() < 0.5) F.store.set(SV, v);
    else W.localStorage.setItem(SV, JSON.stringify(v)); // another tab, a test: no store.set here
    return 'sheet';
  }
  if (x < 0.5) {
    const imr = r() < 0.5,
      o = imr ? {c: 'imr', t: 1, h: [['imr', 0, 1, 'card']]} : {c: 'new', t: 1, h: [['new', 0, 1, 'card']]},
      k = C.startKey(W.SUBJ.id);
    if (r() < 0.5) F.store.set(k, o);
    else W.localStorage.setItem(k, JSON.stringify(o));
    return 'start';
  }
  return 'none';
}

function stats() {
  return {reads: 0, kept: 0, units: 0, ops: {}};
}

// A rated-world run of subject sub: after each answer (the scorer's caller bumps: quiz.js recordAnswer), some writes
// and reads; check: VIEW_CHECK on.
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
    Fn.stateBump(); // the scorer's caller (quiz.js recordAnswer) and the progress saved
    for (let j = 0; j < 1 + Math.floor(r() * 3); j++) {
      const op = write(W, Fn, r, U.setK);
      st.ops[op] = (st.ops[op] || 0) + 1;
      same(Fn, Fo, r, st, `${sub} ${profile} ${seed} after ${i + 1}, ${op}${check ? ', VIEW_CHECK' : ''}`);
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
        Fn.stateBump();
      } else if (y < 0.55) {
        // a subject switch (app.js subjectLoad: its tree, its records and settings, then the bump)
        const fish = W.SUBJ.id !== 'fish';
        W.SUBJ = C.subjectOf(fish ? 'fish' : 'seaslug');
        W.TREEU = fish ? F : X;
        W.Q = {};
        Fn.stateBump();
      } else write(W, Fn, r, W.SUBJ.id === 'fish' ? 'sci' : 'ssp');
      same(Fn, Fo, r, st, `${W.SUBJ.id} state ${s}${check ? ', VIEW_CHECK' : ''}`);
    }
    assert.deepStrictEqual(W.later, [], 'no VIEW_CHECK difference thrown later');
  }
  t.diagnostic(`${st.reads} reads, ${st.kept} of a kept value; up to ${st.units} units in play`);
  assert.ok(st.units > 50, 'species of the sea slugs or the fish in play');
});

// A small world of made-up units for the checks below: one family, two genera of it in the sci set.
function tiny(check) {
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

test('the declared names: sync.js SHEETV and model.js OWN_STATS are the keys app.js lists', () => {
  assert.match(SYNC, /const SHEETV = 'reefid-sheet-v',/);
  assert.match(MODEL, /const OWN_STATS = 'reefid-photo-stats-';/);
  assert.match(MODEL, /store\.get\('reefid-photo-stats', \{\}\)/);
  assert.match(APP, /const STATE_LIVE = \['reefid-sheet-v', \.\.\.SUBJECTS\.map\(S => startKey\(S\.id\)\)\]/);
});

// Every writer the version declares (app.js STATE_V's comment) bumps it after it writes: a test on the code, so a writer
// that loses its bump fails here, not only in a smoke that happens to read a view after it.
test('every declared writer bumps the version', () => {
  const has = (S, from, to, file, n = 1) => {
    const b = block(S, from, to, {through: 1, file});
    assert.ok((b.match(/stateBump\(\)/g) || []).length >= n, `${file} ${from.trim()}: ${n} stateBump() at least`);
  };
  has(APP, 'const st = n =>', ';\n', 'app.js');
  has(APP, 'function subjectLoad(S, keep) {', '\n}\n', 'app.js', 2);
  has(APP, 'function inSubject(id, fn) {', '\n}\n', 'app.js', 2);
  has(APP, 'function treePull() {', '\n}\n', 'app.js');
  has(APP, 'const treeBuild = () => {', '\n};\n', 'app.js');
  has(APP, 'function build() {', '\n}\n', 'app.js');
  has(APP, 'function rankPhotos() {', '\n}\n', 'app.js');
  has(APP, "  const rb = document.getElementById('reset');", 'introReset();', 'app.js');
  assert.match(APP, /if \(STATE_KEYS\.has\(k\)\) stateBump\(\);/, 'store.set: an input key bumps');
  has(MODEL, 'function mxRecalc(fn, why', '\n}\n', 'model.js');
  has(MODEL, 'function answeredAt(s, good', '\n}\n', 'model.js');
  has(MODEL, 'function varRight(n, L) {', '\n}\n', 'model.js');
  has(MODEL, 'function statsJoin(base = PBASE) {', '\n}\n', 'model.js');
  has(MODEL, '  SUBJ_HOOKS.push(keep => {', '\n  });\n', 'model.js');
  assert.match(MODEL, /\nif \(typeof stateBump === 'function'\) stateBump\(\);\n$/, 'model.js: a bump once loaded');
  has(QUIZ, 'function recordAnswer({', '\n}\n', 'quiz.js', 2);
  has(SYNC, 'function replayAdoptS(', '\n}\n', 'sync.js');
  has(SYNC, 'function mergeSubject(', '\n}\n', 'sync.js', 2);
  assert.match(SYNC, /\nif \(typeof stateBump === 'function'\) stateBump\(\);\n$/, 'sync.js: a bump once loaded');
});
