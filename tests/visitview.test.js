'use strict';
require('./slot.js').testGuard();
// A visit to another subject keeps the subject on screen's data views (REE-298; app.js swapBump, dataMark, dataBack;
// docs/spec/model.md "The state version and its views"). A signed-in player's sync visits the other subjects at each
// save and each pull (sync.js syncSummary, mergeSaved; app.js inSubject), and a tree is lent for a while (treeWith):
// each swap moves the data version, so the views read meanwhile are the visited one's. Back where it started with no
// other data written, the version reads as the one before, so the views kept for it hold; a data write meanwhile, or a
// tree the visit left in force, leaves the new version. app.js's own code runs here (the versions and the views, the
// trees in force, subjectLoad, inSubject, treeWith), the rest stubbed: two data views read the data inputs (the subject,
// the tree in force and its build, made-up statistics), and every read is compared with a computation now, VIEW_CHECK
// off and on. The visits: one that writes nothing (kept), one that writes a record (kept), one that writes data (made
// again), tree subject to tree subject (kept), a tree to build on the way (made again), from a subject with no tree in
// force (the visited tree stays in force: made again), nested visits, treeWith, and then real writes after a kept visit
// (a version handed out again would serve a value read during the visit). Mutants of each rule are caught.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js'),
  C = require('../core.js'),
  {memStorage} = require('./kept.js');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const parts = app => [
  cut(app, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
  cut(app, 'let TREEU = null,', 'const treeBuild = () => {', {file: 'app.js'}),
  cut(app, 'const treeOf = id =>', '// The units of every tree subject loaded made again', {file: 'app.js'}),
  cut(app, 'const SUBJ_HOOKS = [];', '// The subject switch (docs/DESIGN.md', {file: 'app.js'})
];

// The page: app.js's parts (a mutant's), the subjects' trees (fish and sea slugs; the corals have none), a tree build
// that counts and bumps as treeBuild does, a hook that reads the intro map again as model.js's does.
function page(check, app = APP) {
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
      UNITS: {fish: {get: {}}, seaslug: {get: {}}, coral: {}},
      DATA: {},
      P: {},
      Q: {},
      unitsRenamed: () => {},
      store: {get: (k, d) => d},
      sKey: k => k,
      qLoad: () => ({}),
      prog: () => {},
      calcs
    };
  const names = Object.keys(stubs),
    make = vm.runInContext(
      `(function (${names.join(', ')}) {\n` +
        `const BUILDS = {n: 0}, DSTAT = {x: 0};\n` +
        `const treeBuild = () => ((TREEU = {id: TREE_AT, n: ++BUILDS.n}), stateBump(), TREEU);\n` +
        parts(app).join('\n') +
        `\nSUBJ_HOOKS.push(keep => stateBump('rec'));\n` +
        // the data inputs: the subject, the tree in force and its build, the statistics (DSTAT)
        `const truth = k => JSON.stringify([SUBJ.id, TREE_AT, TREEU && TREEU.id, TREEU && TREEU.n, DSTAT.x, k]);\n` +
        `const dv = dataViewBy('dv', k => (calcs.push(k), truth(k)));\n` +
        `const dw = dataView('dw', () => (calcs.push('*'), truth('*')));\n` +
        // a view the visits read (the subject on screen does not): its values are the visited subject's
        `const dx = dataViewBy('dx', k => truth('x' + k));\n` +
        `return {dv, dw, dx, truth, inSubject, treeWith, treeAt, treeOf, stateBump,\n` +
        `  write: () => (DSTAT.x++, stateBump()), stale: id => (treeOf(id).stale = true),\n` +
        `  raw: id => (treeOf(id).TREERAW = {}), at: () => TREE_AT, onScreen: id => (SUBJ = subjectOf(id)), dver: () => DATA_V};\n})`,
      vm.createContext({})
    );
  const T = make(...names.map(k => stubs[k]));
  return {T, later, calcs};
}

// Every value of the subject on screen's views read now equals a computation now; returns how many computations the
// reads made.
function readAll(pg, label, keys = ['a', 'b']) {
  const n = pg.calcs.length;
  for (const k of keys) assert.strictEqual(pg.T.dv(k), pg.T.truth(k), `${label}: dv(${k})`);
  assert.strictEqual(pg.T.dw(), pg.T.truth('*'), `${label}: dw`);
  return pg.calcs.length - n;
}
// What a visit reads (dx): the visited subject's values.
function visitRead(pg, label) {
  for (const k of ['a', 'c']) assert.strictEqual(pg.T.dx(k), pg.T.truth('x' + k), `${label}: dx(${k})`);
}
// The subject on screen's views read, then fn, then read again: the computations the second read made (0: kept).
function around(pg, label, fn) {
  readAll(pg, label + ', before');
  fn();
  return readAll(pg, label + ', after');
}
// The fish on screen with both trees built (each subject's data in, as after a first visit), or the corals.
function fishPage(check, app) {
  const pg = page(check, app);
  pg.T.raw('fish');
  pg.T.raw('seaslug');
  pg.T.treeAt('seaslug'); // built
  pg.T.treeAt('fish'); // built, in force
  return pg;
}

// The visits, each with whether the views of the subject on screen must be kept (0 computations after) or made again.
const CASES = [
  ['a visit that writes nothing', true, pg => pg.T.inSubject('coral', () => visitRead(pg, 'the corals visited'))],
  ['a visit that writes a record', true, pg => pg.T.inSubject('coral', () => (visitRead(pg, 'visited'), pg.T.stateBump('rec')))],
  [
    'a visit that writes data',
    false,
    pg => pg.T.inSubject('coral', () => (visitRead(pg, 'visited'), pg.T.write(), visitRead(pg, 'written')))
  ],
  ['tree subject to tree subject', true, pg => pg.T.inSubject('seaslug', () => visitRead(pg, 'the sea slugs visited'))],
  ['a tree built on the way', false, pg => (pg.T.stale('seaslug'), pg.T.inSubject('seaslug', () => visitRead(pg, 'the sea slugs built')))],
  [
    'nested visits',
    true,
    pg =>
      pg.T.inSubject(
        'coral',
        () => (visitRead(pg, 'outer'), pg.T.inSubject('seaslug', () => visitRead(pg, 'inner')), visitRead(pg, 'outer again'))
      )
  ],
  [
    'a write in a nested visit',
    false,
    pg => pg.T.inSubject('coral', () => pg.T.inSubject('seaslug', () => (visitRead(pg, 'inner'), pg.T.write())))
  ],
  ['a tree lent (treeWith)', true, pg => pg.T.treeWith('seaslug', () => visitRead(pg, 'the sea slugs lent'))],
  ['treeWith around a visit', true, pg => pg.T.treeWith('seaslug', () => pg.T.inSubject('coral', () => visitRead(pg, 'both')))],
  // One slot a view: a view the visit itself reads holds the visited subject's values after it, so the subject on
  // screen's are made again at their next read (a sync's visits read no data view: tools/answercost.js --syncs).
  ['a visit that reads the views of the subject on screen', false, pg => pg.T.inSubject('coral', () => readAll(pg, 'the corals visited'))]
];

function cases(check, app) {
  // A version is never handed out twice: a view read during a visit (dw, at the visit's version) and read again only
  // after k real writes is a computation now, whatever k.
  for (let k = 1; k <= 6; k++) {
    const pg = fishPage(check, app);
    readAll(pg, `a visit then ${k} writes, before`);
    pg.T.inSubject('coral', () => pg.T.dw());
    for (let i = 0; i < k; i++) pg.T.write();
    assert.strictEqual(pg.T.dw(), pg.T.truth('*'), `a view read in a visit, then ${k} writes: dw`);
    assert.deepStrictEqual(pg.later, []);
  }
  for (const [what, keep, fn] of CASES) {
    // VIEW_CHECK on computes every read again (its comparison): the values alone are checked, and nothing thrown
    const pg = fishPage(check, app),
      made = around(pg, what, () => fn(pg));
    if (keep && !check) assert.strictEqual(made, 0, `${what}: the views of the subject on screen kept`);
    else assert.ok(made > 0, `${what}: the views made again`);
    // then real writes: every value is a computation now (a version handed out again would serve a visit's value)
    for (let i = 0; i < 4; i++) {
      pg.T.write();
      assert.ok(readAll(pg, `${what}, write ${i + 1} after`) > 0, `${what}: a write after it makes the views again`);
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
      const pg = page(check, app),
        label = `${what}${raw ? '' : ', its data not in yet'}`;
      if (raw) pg.T.raw('fish');
      pg.T.onScreen('coral');
      assert.strictEqual(pg.T.at(), null);
      assert.ok(around(pg, label, () => fn(pg)) > 0, `${label}: the views made again`);
      assert.strictEqual(pg.T.at(), 'fish', `${label}: the fish's tree stays in force`);
      assert.deepStrictEqual(pg.later, []);
    }
}
test('a visit leaves the subject on screen’s data views as a fresh computation has them, kept when it wrote nothing', () => {
  for (const check of [false, true]) cases(check);
});

// Each mutant from app.js's source; every rule broken is caught, the unmutated code passes the same cases.
test('mutation: the rules that keep or drop the views, each broken, are caught', t => {
  const MUT = [
    ['a data write in the visit ignored', 'if (DATA_V - m.v === DATA_SW - m.sw) DATA_AS', 'if (true) DATA_AS'],
    ['the version put back by number (handed out again)', 'DATA_AS = {v: DATA_V, k: m.k};', 'DATA_V = m.k;'],
    ['the tree left in force ignored', '    if (TREE_AT === was.T) dataBack(m);', '    dataBack(m);'],
    ['treeWith from no tree', 'if (m && TREE_AT === was) dataBack(m);', 'if (m) dataBack(m);'],
    [
      'a swap that does not move the data version',
      'const swapBump = () => (DATA_SW++, stateBump());',
      "const swapBump = () => (DATA_SW++, stateBump('rec'));"
    ],
    ['treeAt’s swap counted as a write', '  treePull(true);\n', '  treePull();\n'],
    [
      'the version kept never read',
      'const dataNow = () => (stateNow(), DATA_V === DATA_AS.v ? DATA_AS.k : DATA_V);',
      'const dataNow = () => (stateNow(), DATA_V);'
    ],
    ['a visit never kept', '    if (TREE_AT === was.T) dataBack(m);', '']
  ];
  for (const [what, from, to] of [['the code as it is (no mutation: nothing caught)', null, null], ...MUT]) {
    assert.ok(!from || APP.split(from).length === 2, `${what}: the mutated text occurs once`);
    const app = from ? APP.replace(from, to) : APP;
    let caught = '';
    for (const check of [false, true])
      try {
        cases(check, app);
      } catch (e) {
        caught = caught || e.message.split('\n')[0];
      }
    if (from) (assert.ok(caught, `${what}: not caught`), t.diagnostic(`${what}: ${caught}`));
    else assert.strictEqual(caught, '', 'the code as it is passes');
  }
});
