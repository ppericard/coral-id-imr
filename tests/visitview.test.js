'use strict';
require('./slot.js').testGuard();
// A visit to another subject keeps the subject on screen's views and memos (REE-298, REE-300; app.js swapBump,
// dataMark, dataBack, memoGet, memoPut; docs/spec/model.md "The state version and its views"). A signed-in player's sync
// visits the other subjects at each save and each pull (sync.js syncSummary, mergeSaved, holdAdopt, replayAdoptS; app.js
// inSubject), and a tree is lent for a while (treeWith): each swap moves the versions, so the views read meanwhile are
// the visited one's. Back where it started with no other data written, the data version reads as the one before; with
// no record of the subject on screen written either (the visited subject's own merge, hold and replay are its records),
// the state version too, and the memos the subject hooks reset (model.js each unit's difficulty and the intro map read,
// quiz.js the typed names) are put back. A data write, a tree the visit left in force, a record of the subject on screen
// written (its key, a visit back to it, another tab's first-launch record) leaves the new version.
// app.js's own code runs here (the versions and the views, the trees in force, subjectLoad, inSubject, treeWith), with
// model.js's genusDiff, introMap and subject hook and quiz.js's typeNames and hook; the rest stubbed. Two data views and
// a state view read the inputs (the subject, the tree in force and its build, made-up statistics; the records, the
// settings, the intro map through its memo, the first-launch record), and every read, of a view or a memo, is compared
// with a computation from where the inputs are kept, VIEW_CHECK off and on. Mutants of each rule are caught.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js'),
  C = require('../core.js'),
  {memStorage} = require('./kept.js');
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'),
  SRC = {app: src('app.js'), model: src('model.js'), quiz: src('quiz.js')};
const parts = ({app, model, quiz}) => [
  cut(app, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
  cut(app, 'let TREEU = null,', 'const treeBuild = () => {', {file: 'app.js'}),
  cut(app, 'const treeOf = id =>', '// The units of every tree subject loaded made again', {file: 'app.js'}),
  cut(app, 'const SUBJ_HOOKS = [];', '// The subject switch (docs/DESIGN.md', {file: 'app.js'}),
  // model.js: each unit's difficulty (its memo GDIFF), the intro map read (INTROS), the subject hook and its memos
  'let GDIFF = {}, GDV = null, INTROS = null, HOLDS = 0, CB = null, lastQs = [], last = null;',
  cut(model, 'const genusDiff = n => {', '// Shaky:', {file: 'model.js'}),
  cut(model, 'const introMap = () => {', '// An entry', {file: 'model.js'}),
  cut(model, "if (typeof SUBJ_HOOKS !== 'undefined')\n  SUBJ_HOOKS.push(keep => {\n    INTROS = null;", '// The functions the views read', {
    file: 'model.js'
  }),
  // quiz.js: the typed names (TYPEN), the subject hook and its memo
  'let TYPEN = null;',
  cut(quiz, 'const typeNames = () => {', '// rk: the class', {file: 'quiz.js'}),
  cut(quiz, "if (typeof SUBJ_HOOKS !== 'undefined')\n  SUBJ_HOOKS.push(keep => {\n    TYPEN = null;", 'put: m => (TYPEN = m)});', {
    through: 1,
    file: 'quiz.js'
  })
];

// The page: the parts above (a mutant's), the subjects' trees (fish and sea slugs; the corals have none), a tree build
// that counts and bumps as treeBuild does, the stored records (RECS, each subject's under its keys: progress, intro), a
// subject's genus offsets (PGD) and typed names made from the data inputs.
function page(check, S = SRC) {
  const later = [],
    calcs = [],
    stubs = {
      window: {VIEW_CHECK_ON: check},
      localStorage: memStorage(),
      setTimeout: f => later.push(f),
      SUBJECTS: C.SUBJECTS,
      subjKey: C.subjKey,
      startKey: C.startKey,
      keyGet: C.keyGet,
      keyRename: C.keyRename,
      subjectOf: C.subjectOf,
      SUBJ: C.subjectOf('fish'),
      UNITS: null,
      DATA: {},
      P: {},
      Q: {},
      unitsRenamed: () => {},
      store: null,
      sKey: null,
      qLoad: null,
      prog: () => {},
      calcs
    };
  const names = Object.keys(stubs),
    make = vm.runInContext(
      `(function (${names.join(', ')}) {\n` +
        `const BUILDS = {n: 0}, DSTAT = {x: 0}, RECS = new Map(), N = {names: 0, intro: 0};\n` +
        // the records as stored, each read a copy (the app parses the stored text); the intro map's reads counted
        `store = {get: (k, d) => (/-intro$/.test(k) && N.intro++, RECS.has(k) ? JSON.parse(RECS.get(k)) : d)};\n` +
        `sKey = k => subjKey(SUBJ.id, k);\n` +
        `qLoad = () => ({q: SUBJ.id});\n` +
        `const treeBuild = () => ((TREEU = {id: TREE_AT, n: ++BUILDS.n}), stateBump(), TREEU);\n` +
        `const VIEWS = [['wide']], gamePics = () => [], heldOf = () => [], GX = () => null, calibOf = () => ({ease: 0}),\n` +
        `  PDIFF = {MID: 0}, HOLDK = () => sKey('hold'), cbLoad = () => ({}), memRecalcAll = () => {}, domRecalcAll = () => {},\n` +
        `  INTRO = {get KEY() { return sKey('intro'); }};\n` +
        // a unit's genus offset: the data inputs (the statistics, the tree in force and its build, the subject)
        `const dnum = n => (DSTAT.x * 7 + (TREEU ? TREEU.n * 3 : 0) + SUBJ.id.length * 11 + n.length) / 4;\n` +
        `const PGD = new Proxy({}, {get: (o, n) => [dnum(n)]});\n` +
        // a tree subject's names are its tree's (the tree in force), the corals' their own
        `const nameList = () => (SUBJ.id === 'coral' ? [SUBJ.id] : [SUBJ.id, TREE_AT, TREEU && TREEU.n]).join(' ');\n` +
        `UNITS = {fish: {get: {}, names: () => (N.names++, nameList())}, seaslug: {get: {}, names: () => (N.names++, nameList())},\n` +
        `  coral: {names: () => (N.names++, nameList())}};\n` +
        parts(S).join('\n') +
        // the data inputs: the subject, the tree in force and its build, the statistics (DSTAT)
        `\nconst truth = k => JSON.stringify([SUBJ.id, TREE_AT, TREEU && TREEU.id, TREEU && TREEU.n, DSTAT.x, k]);\n` +
        // the state inputs from where they are kept: the records and settings in force, the stored intro map and
        // first-launch record, and the data
        `const struth = k => JSON.stringify([SUBJ.id, P, Q, RECS.get(sKey('intro')) || '{}', localStorage.getItem(startKey(SUBJ.id)), truth(k)]);\n` +
        `const dv = dataViewBy('dv', k => (calcs.push(k), truth(k)));\n` +
        `const dw = dataView('dw', () => (calcs.push('*'), truth('*')));\n` +
        // a view the visits read (the subject on screen does not): its values are the visited subject's
        `const dx = dataViewBy('dx', k => truth('x' + k));\n` +
        // a state view reads the intro map through its memo, as model.js cardsCalc does
        `const sv = stateViewBy('sv', k => (calcs.push('s' + k), JSON.stringify([SUBJ.id, P, Q, JSON.stringify(introMap()), localStorage.getItem(startKey(SUBJ.id)), truth(k)])));\n` +
        `return {dv, dw, dx, sv, truth, struth, inSubject, treeWith, treeAt, treeOf, stateBump, N, introMap,\n` +
        `  gd: n => [GDV !== DATA_V || !(n in GDIFF), genusDiff(n), Math.round(dnum(n) * 100) / 100],\n` +
        `  tn: () => [typeNames(), nameList()], intro: () => RECS.get(sKey('intro')) || '{}',\n` +
        `  write: () => (DSTAT.x++, stateBump()), stale: id => (treeOf(id).stale = true),\n` +
        // a record written through the store (its key: storeWrote), or in P as the merge writes it (stateBump('rec'))
        `  writeKey: (id, name, v) => (RECS.set(subjKey(id, name), JSON.stringify(v)), storeWrote(subjKey(id, name))),\n` +
        `  writeP: () => ((P.w = (P.w || 0) + 1), RECS.set(sKey('progress'), JSON.stringify(P)), stateBump('rec')),\n` +
        `  otherTab: id => localStorage.setItem(startKey(id), JSON.stringify({c: 'imr', t: ++BUILDS.n})),\n` +
        `  raw: id => (treeOf(id).TREERAW = {}), at: () => TREE_AT, onScreen: id => (SUBJ = subjectOf(id)), dver: () => DATA_V};\n})`,
      vm.createContext({})
    );
  const T = make(...names.map(k => stubs[k]));
  return {T, later, calcs};
}

// Every value of the subject on screen's views and memos read now equals a computation from the inputs as kept; returns
// what the reads made again: the data views' and the state view's computations, the units' difficulties, the typed
// names and the intro map read again.
function readAll(pg, label, keys = ['a', 'b']) {
  const {T, calcs} = pg,
    n = calcs.length,
    nm = T.N.names,
    ni = T.N.intro;
  let gd = 0;
  for (const k of keys) {
    assert.strictEqual(T.dv(k), T.truth(k), `${label}: dv(${k})`);
    assert.strictEqual(T.sv(k), T.struth(k), `${label}: sv(${k})`);
    const [miss, v, fresh] = T.gd(k);
    assert.strictEqual(v, fresh, `${label}: genusDiff(${k})`);
    gd += miss;
  }
  assert.strictEqual(T.dw(), T.truth('*'), `${label}: dw`);
  const [tn, fresh] = T.tn();
  assert.strictEqual(tn, fresh, `${label}: typeNames`);
  assert.strictEqual(JSON.stringify(T.introMap()), T.intro(), `${label}: the intro map`);
  const made = calcs.slice(n);
  return {
    D: made.filter(c => c[0] !== 's').length,
    S: made.filter(c => c[0] === 's').length,
    G: gd,
    T: T.N.names - nm,
    I: T.N.intro - ni
  };
}
// What a visit reads (dx): the visited subject's values.
function visitRead(pg, label) {
  for (const k of ['a', 'c']) assert.strictEqual(pg.T.dx(k), pg.T.truth('x' + k), `${label}: dx(${k})`);
}
// The subject on screen's views and memos read, then fn, then read again: what the second read made again.
function around(pg, label, fn) {
  readAll(pg, label + ', before');
  fn();
  return readAll(pg, label + ', after');
}
// The fish on screen with both trees built (each subject's data in, as after a first visit), or the corals.
function fishPage(check, S) {
  const pg = page(check, S);
  pg.T.raw('fish');
  pg.T.raw('seaslug');
  pg.T.treeAt('seaslug'); // built
  pg.T.treeAt('fish'); // built, in force
  pg.T.writeKey('fish', 'intro', {Chromis: [1, 1, 0, 's']});
  pg.T.writeKey('coral', 'intro', {Acropora: [2, 1, 0, 's']});
  return pg;
}

// The visits, each with what the subject on screen keeps after it (every other thing is made again): D its data views,
// S its state view, G each unit's difficulty, T the typed names, I the intro map read.
const ALL = 'DSGTI';
const CASES = [
  ['a visit that writes nothing', ALL, pg => pg.T.inSubject('coral', () => visitRead(pg, 'the corals visited'))],
  // the visited subject's merge: its progress stored and refilled in P, its intro map
  [
    'a visit that writes the visited subject’s records',
    ALL,
    pg =>
      pg.T.inSubject('coral', () => {
        visitRead(pg, 'visited');
        pg.T.writeP();
        pg.T.writeKey('coral', 'progress', {Acropora: {ok: 3}});
        pg.T.writeKey('coral', 'intro', {Acropora: [2, 1, 0, 's'], Porites: [3, 1, 0, 'c']});
      })
  ],
  ['a visit that writes data', '', pg => pg.T.inSubject('coral', () => (visitRead(pg, 'visited'), pg.T.write(), visitRead(pg, 'written')))],
  ['tree subject to tree subject', ALL, pg => pg.T.inSubject('seaslug', () => visitRead(pg, 'the sea slugs visited'))],
  ['a tree built on the way', '', pg => (pg.T.stale('seaslug'), pg.T.inSubject('seaslug', () => visitRead(pg, 'the sea slugs built')))],
  [
    'nested visits',
    ALL,
    pg =>
      pg.T.inSubject(
        'coral',
        () => (
          visitRead(pg, 'outer'),
          pg.T.inSubject('seaslug', () => (visitRead(pg, 'inner'), pg.T.writeP())),
          visitRead(pg, 'outer again')
        )
      )
  ],
  [
    'a write in a nested visit',
    '',
    pg => pg.T.inSubject('coral', () => pg.T.inSubject('seaslug', () => (visitRead(pg, 'inner'), pg.T.write())))
  ],
  ['a tree lent (treeWith)', ALL, pg => pg.T.treeWith('seaslug', () => visitRead(pg, 'the sea slugs lent'))],
  [
    'treeWith around a visit',
    ALL,
    pg => pg.T.treeWith('seaslug', () => pg.T.inSubject('coral', () => (visitRead(pg, 'both'), pg.T.writeP())))
  ],
  // One slot a view: a view the visit itself reads holds the visited subject's values after it, so the subject on
  // screen's are made again at their next read (a sync's visits read no view: tools/answercost.js --syncs); the versions
  // came back, so the memos are put back.
  ['a visit that reads the views of the subject on screen', 'GTI', pg => pg.T.inSubject('coral', () => readAll(pg, 'the corals visited'))],
  // A record of the subject on screen written during the visit: the state version and the intro map read are new.
  [
    'a visit that writes the subject on screen’s intro map',
    'DGT',
    pg =>
      pg.T.inSubject(
        'coral',
        () => (visitRead(pg, 'visited'), pg.T.writeKey('fish', 'intro', {Chromis: [1, 1, 0, 's'], Amphiprion: [4, 1, 0, 'c']}))
      )
  ],
  [
    'a visit that writes the subject on screen’s progress',
    'DGT',
    pg => pg.T.inSubject('coral', () => (visitRead(pg, 'visited'), pg.T.writeKey('fish', 'progress', {Chromis: {ok: 1}})))
  ],
  [
    'a visit back to the subject on screen that writes',
    'DGT',
    pg => pg.T.inSubject('coral', () => pg.T.inSubject('fish', () => (visitRead(pg, 'back'), pg.T.writeP())))
  ],
  // another tab's first-launch record, seen at the visit's next read (app.js stateNow): nobody's known
  [
    'another tab writes the subject on screen’s first-launch record',
    'DGT',
    pg => pg.T.inSubject('coral', () => (pg.T.otherTab('fish'), visitRead(pg, 'visited')))
  ],
  [
    'another tab writes the visited subject’s first-launch record',
    'DGT',
    pg => pg.T.inSubject('coral', () => (pg.T.otherTab('coral'), visitRead(pg, 'visited')))
  ],
  // a tree lent runs no hook: the intro map stays read
  [
    'a tree lent while the subject on screen’s records are written',
    'DGTI',
    pg => pg.T.treeWith('seaslug', () => (visitRead(pg, 'lent'), pg.T.writeP()))
  ],
  ['the tree on screen built on the return', '', pg => pg.T.inSubject('seaslug', () => (visitRead(pg, 'visited'), pg.T.stale('fish')))],
  // a difficulty kept for a version left before the visit: not put back (made for that version, model.js GDV)
  ['a data write, then a visit before any read', 'TI', pg => (pg.T.write(), pg.T.inSubject('coral', () => visitRead(pg, 'visited')))]
];

function cases(check, S) {
  // A version is never handed out twice: a view read during a visit (at the visit's version) and read again only after
  // k real writes is a computation now, whatever k.
  for (let k = 1; k <= 6; k++) {
    const pg = fishPage(check, S);
    readAll(pg, `a visit then ${k} writes, before`);
    pg.T.inSubject('coral', () => (pg.T.dw(), pg.T.sv('a')));
    for (let i = 0; i < k; i++) i % 2 ? pg.T.write() : pg.T.writeP();
    assert.strictEqual(pg.T.dw(), pg.T.truth('*'), `a view read in a visit, then ${k} writes: dw`);
    assert.strictEqual(pg.T.sv('a'), pg.T.struth('a'), `a view read in a visit, then ${k} writes: sv`);
    assert.deepStrictEqual(pg.later, []);
  }
  for (const [what, keep, fn] of CASES) {
    // VIEW_CHECK on computes every read of a view again (its comparison): the values alone are checked for the views,
    // and nothing thrown; the memos are no view
    const pg = fishPage(check, S),
      made = around(pg, what, () => fn(pg));
    for (const x of 'DSGTI')
      if (keep.includes(x) && !(check && 'DS'.includes(x))) assert.strictEqual(made[x], 0, `${what}: ${x} kept`);
      else if (!keep.includes(x)) assert.ok(made[x] > 0, `${what}: ${x} made again`);
    // then real writes: every value is a computation now (a version handed out again would serve a visit's value)
    for (let i = 0; i < 4; i++) {
      i % 2 ? pg.T.writeP() : pg.T.write();
      const m = readAll(pg, `${what}, write ${i + 1} after`);
      assert.ok(m.S > 0 && (i % 2 || m.D > 0), `${what}: a write after it makes the views again`);
    }
    assert.deepStrictEqual(pg.later, [], `${what}: no VIEW_CHECK difference thrown later`);
  }
  // From the corals with no tree in force: a visit to the fish leaves their tree in force, an input of the views; with
  // their data in (built on the way) or not yet (nothing built: the swap alone).
  for (const [what, fn] of [
    ['a visit to the fish from no tree in force', pg => pg.T.inSubject('fish', () => visitRead(pg, 'the fish visited'))],
    ['a tree lent from no tree in force', pg => pg.T.treeWith('fish', () => visitRead(pg, 'the fish lent'))]
  ])
    for (const raw of [true, false]) {
      const pg = page(check, S),
        label = `${what}${raw ? '' : ', its data not in yet'}`;
      if (raw) pg.T.raw('fish');
      pg.T.onScreen('coral');
      assert.strictEqual(pg.T.at(), null);
      const made = around(pg, label, () => fn(pg));
      assert.ok(made.D > 0 && made.S > 0, `${label}: the views made again`);
      assert.strictEqual(pg.T.at(), 'fish', `${label}: the fish's tree stays in force`);
      assert.deepStrictEqual(pg.later, []);
    }
}
test('a visit leaves the subject on screen’s views and memos as a fresh computation has them, kept when it wrote nothing of it', () => {
  for (const check of [false, true]) cases(check);
});

// Each mutant from the files' source; every rule broken is caught, the unmutated code passes the same cases.
test('mutation: the rules that keep or drop the views and the memos, each broken, are caught', t => {
  const MUT = [
    ['a data write in the visit ignored', 'app', 'const data = DATA_V - m.v === DATA_SW - m.sw,', 'const data = true,'],
    ['the version put back by number (handed out again)', 'app', 'if (data) DATA_AS = {v: DATA_V, k: m.k};', 'if (data) DATA_V = m.k;'],
    ['the tree left in force ignored', 'app', '    if (TREE_AT === was.T) memoPut(memo, dataBack(m));', '    memoPut(memo, dataBack(m));'],
    ['treeWith from no tree', 'app', 'if (m && TREE_AT === was) memoPut(memo, dataBack(m));', 'if (m) memoPut(memo, dataBack(m));'],
    [
      'a swap that does not move the data version',
      'app',
      "const swapBump = rec => (STATE_SW++, rec === 'rec' || DATA_SW++, stateBump(rec, null));",
      "const swapBump = rec => (STATE_SW++, DATA_SW++, stateBump('rec', null));"
    ],
    ['treeAt’s swap counted as a write', 'app', '  treePull(true);\n', '  treePull();\n'],
    [
      'the data version kept never read',
      'app',
      'const dataNow = () => (stateNow(), DATA_V === DATA_AS.v ? DATA_AS.k : DATA_V);',
      'const dataNow = () => (stateNow(), DATA_V);'
    ],
    ['a visit never kept', 'app', '    if (TREE_AT === was.T) memoPut(memo, dataBack(m));', ''],
    // REE-300: the state version and the memos
    [
      'a write of the subject on screen’s records counted as another’s',
      'app',
      'STATE_V - m.sv === STATE_SW - m.ssw + (REC_N - m.n) - ((REC_BY[m.s] || 0) - m.own);',
      'STATE_V - m.sv === STATE_SW - m.ssw + (REC_N - m.n);'
    ],
    [
      'a stored record for the subject in force, not its key’s',
      'app',
      "stateBump(REC_KEYS.has(k) ? 'rec' : undefined, REC_KEYS.get(k));",
      "stateBump(REC_KEYS.has(k) ? 'rec' : undefined);"
    ],
    [
      'another tab’s write for the subject in force',
      'app',
      "if (ch) stateBump(ch === 'rec' ? 'rec' : undefined, null);",
      "if (ch) stateBump(ch === 'rec' ? 'rec' : undefined);"
    ],
    [
      'the hook’s intro map read counted as a write',
      'model',
      "if (typeof swapBump === 'function') swapBump('rec');",
      "if (typeof stateBump === 'function') stateBump('rec');"
    ],
    [
      'a swap of the records counted as the subject in force’s',
      'app',
      "const swapBump = rec => (STATE_SW++, rec === 'rec' || DATA_SW++, stateBump(rec, null));",
      "const swapBump = rec => (STATE_SW++, rec === 'rec' || DATA_SW++, stateBump(rec));"
    ],
    [
      'the state version kept never read',
      'app',
      '  STATE_AT = freshNow();\n  return STATE_V === STATE_AS.v ? STATE_AS.k : STATE_V;',
      '  STATE_AT = freshNow();\n  return STATE_V;'
    ],
    ['the state version put back with the data alone', 'app', '    state = data && m.s !== null && STATE_V', '    state = data || STATE_V'],
    ['the memos put back whatever the data', 'app', 'void (back.data && SUBJ_MEMOS.forEach(', 'void (SUBJ_MEMOS.forEach('],
    ['the intro map put back without the state version', 'model', '      if (back.state) INTROS = m.INTROS;', '      INTROS = m.INTROS;'],
    ['a difficulty put back for a version left before the visit', 'model', '      if (m.GDV === m.dv) ((GDIFF', '      if (true) ((GDIFF'],
    [
      'the memos never put back',
      'app',
      'const memoPut = (memo, back) => void (back.data &&',
      'const memoPut = (memo, back) => void (false &&'
    ]
  ];
  for (const [what, file, from, to] of [['the code as it is (no mutation: nothing caught)', null, null, null], ...MUT]) {
    assert.ok(!from || SRC[file].split(from).length === 2, `${what}: the mutated text occurs once`);
    const S = from ? {...SRC, [file]: SRC[file].replace(from, to)} : SRC;
    let caught = '';
    for (const check of [false, true])
      try {
        cases(check, S);
      } catch (e) {
        caught = caught || e.message.split('\n')[0];
      }
    if (from) (assert.ok(caught, `${what}: not caught`), t.diagnostic(`${what}: ${caught}`));
    else assert.strictEqual(caught, '', 'the code as it is passes');
  }
});
