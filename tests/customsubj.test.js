require('./slot.js').testGuard();
// The custom quiz for every subject (Pierre, 2026-11-19, Q437; docs/reviews/2026-11-19-modes-every-subject.md PR 2): one
// selection key per subject (core.js subjKey, the corals' unchanged), merged and cleared per subject (sync.js, rule D7),
// the first view's groups from one UNITS member (app.js UNITS cq: quiz.js cqByIMR, cqByKey, cqByFamily).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'),
  APP = src('app.js'),
  QUIZ = src('quiz.js'),
  SYNC = src('sync.js'),
  plain = x => JSON.parse(JSON.stringify(x));

test('one custom selection key per subject: the corals keep theirs, the others travel with the player', () => {
  assert.strictEqual(C.subjKey('coral', 'custom'), 'reefid-sync-coral-custom', 'the corals saved selections stay');
  assert.strictEqual(C.subjKey('fish', 'custom'), 'reefid-sync-fish-custom');
  assert.strictEqual(C.subjKey('seaslug', 'custom'), 'reefid-sync-seaslug-custom');
  const keys = C.SUBJECTS.map(S => C.subjKey(S.id, 'custom'));
  assert.strictEqual(new Set(keys).size, C.SUBJECTS.length);
  keys.forEach(k => assert.ok(k.startsWith(C.KEYS.SYNC), k + ' travels (core.js KEYS.SYNC)'));
  assert.match(src('model.js'), /get KEY\(\) \{\s*return sKey\('custom'\);/, 'CUSTOM.KEY is the subject on screen’s key');
});

test('every subject has the Custom quiz tab; none names it closed', () => {
  C.SUBJECTS.forEach(S => {
    assert.ok(S.pages.includes('quiz-custom'), S.id + ' opens quiz-custom');
    assert.ok(!('quiz-custom' in (S.closed || {})), S.id + ' does not close it');
  });
});

test('sync: each subject’s selection is merged (the latest wins) and cleared at sign-out, never the corals’ only', () => {
  const mi = block(SYNC, 'function mergeSavedIn(', '\n}\n', {file: 'sync.js', through: 1});
  assert.match(mi, /SUBJECTS\.forEach\(S => \{\s*const k = subjKey\(S\.id, 'custom'\)/);
  assert.ok(!/reefid-sync-coral-custom/.test(mi), 'no fixed coral key left in the merge');
  const so = block(SYNC, 'function signOutClear(', '\n}\n', {file: 'sync.js', through: 1});
  assert.match(so, /'wink', 'custom'\]\.map\(k => subjKey\(S\.id, k\)\)/);
  assert.ok(!/CUSTOM\.KEY/.test(so), 'no fixed key left in the sign-out clear');
});

// The merge rule itself, run on the loop's body as sync.js has it.
test('sync: the merge keeps the more recent selection of each subject and leaves a subject the copy lacks alone', () => {
  const code = block(SYNC, "  SUBJECTS.forEach(S => {\n    const k = subjKey(S.id, 'custom');", '\n  });\n', {file: 'sync.js', through: 1}),
    mem = {},
    ctx = {
      SUBJECTS: C.SUBJECTS,
      subjKey: C.subjKey,
      store: {get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => (mem[k] = v)},
      d: {}
    };
  vm.createContext(ctx);
  const run = d => {
    ctx.d = d;
    vm.runInContext(code, ctx);
  };
  const fk = C.subjKey('fish', 'custom'),
    ck = C.subjKey('coral', 'custom'),
    sk = C.subjKey('seaslug', 'custom');
  mem[ck] = {g: ['Acropora', 'Porites'], t: 5};
  run({
    [ck]: JSON.stringify({g: ['Favites', 'Porites'], t: 9}),
    [fk]: JSON.stringify({g: ['a', 'b'], t: 3})
  });
  assert.deepStrictEqual(plain(mem[ck].g), ['Favites', 'Porites'], 'a newer selection of the account replaces this device’s');
  assert.deepStrictEqual(plain(mem[fk].g), ['a', 'b'], 'the fish selection arrives under its own key');
  assert.ok(!(sk in mem), 'a subject the copy lacks is left alone');
  run({[ck]: JSON.stringify({g: ['x', 'y'], t: 2}), [fk]: 'not json'});
  assert.deepStrictEqual(plain(mem[ck].g), ['Favites', 'Porites'], 'an older one never wins');
  assert.deepStrictEqual(plain(mem[fk].g), ['a', 'b'], 'a broken value changes nothing');
});

// The groups, with the app's helpers stubbed.
const tree = {
  gen: {
    f1: {id: 'f1', name: 'Fam one', group: 1},
    f2: {id: 'f2', name: 'Fam two', group: 2},
    f3: {id: 'f3', name: 'Fam three'},
    's:a': {id: 's:a', name: 'Sp a', parent: 'f2', rank: 'species'},
    g1: {id: 'g1', parent: 'F2', rank: 'genus'},
    g2: {id: 'g2', parent: 'F1', rank: 'genus'},
    g3: {id: 'g3', rank: 'genus'},
    F1: {id: 'F1', rank: 'family'},
    F2: {id: 'F2', rank: 'family'}
  },
  key: {short: 'Key'},
  groups: [
    {n: 1, title: 'Group one'},
    {n: 2, title: 'Group two'}
  ]
};
function groupsCtx(extra = {}) {
  const ctx = {
    TREEU: tree,
    GX: n => tree.gen[n],
    esc: s => String(s),
    groupHue: n => n * 10,
    uname: n => `<i>${n}</i>`,
    rankOf: n => (tree.gen[n] || {}).rank || '',
    unitRankOf: () => 'genus',
    SUBJ: {id: 'seaslug'},
    UNITS: {seaslug: {listBy: 'family'}},
    ...extra
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(APP, 'const unitsByParent = ', '\n};\n', {file: 'app.js', through: 1}) +
      block(QUIZ, 'const cqMark = ', '\n', {file: 'quiz.js'}) +
      block(QUIZ, 'function cqByKey(', '\n}\n', {file: 'quiz.js', through: 1}) +
      block(QUIZ, 'function cqByFamily(', '\n}\n', {file: 'quiz.js', through: 1}) +
      '\nthis.cqByKey = cqByKey; this.cqByFamily = cqByFamily; this.unitsByParent = unitsByParent;',
    ctx
  );
  return ctx;
}

test('unitsByParent: the units under their family in the tree’s order, those with none last', () => {
  const c = groupsCtx();
  assert.deepStrictEqual(plain(c.unitsByParent(['g3', 'g1', 'g2'], 'family')), [
    ['F1', ['g2']],
    ['F2', ['g1']],
    ['', ['g3']]
  ]);
});

test('cqByFamily: one group per family, the unit with no family in a last one', () => {
  const G = plain(groupsCtx().cqByFamily(['g1', 'g2', 'g3']));
  assert.deepStrictEqual(
    G.map(g => [g.k, g.t, g.L]),
    [
      ['F1', '<i>F1</i>', ['g2']],
      ['F2', '<i>F2</i>', ['g1']],
      ['?', 'Other', ['g3']]
    ]
  );
});

test('cqByKey: the key’s identification groups in its order, a species in its family’s group, the rest last', () => {
  const G = plain(groupsCtx().cqByKey(['f3', 's:a', 'f1', 'f2']));
  assert.deepStrictEqual(
    G.map(g => [g.k, g.t, g.L]),
    [
      [1, 'Group one', ['f1']],
      [2, 'Group two', ['s:a', 'f2']],
      ['?', 'Not in a group yet', ['f3']]
    ].map(([k, t, L]) => [k, t, [...L].sort((a, b) => ['f3', 's:a', 'f1', 'f2'].indexOf(a) - ['f3', 's:a', 'f1', 'f2'].indexOf(b))])
  );
  const none = groupsCtx({TREEU: {...tree, key: null}}).cqByKey(['f1', 'f2']);
  assert.deepStrictEqual(
    plain(none).map(g => [g.t, g.L]),
    [['All', ['f1', 'f2']]],
    'without a key one group holds every unit'
  );
});

test('UNITS: each subject declares its custom quiz groups in one place (cq by, about, src, groups)', () => {
  const U = block(APP, '\nconst UNITS = {', '\ntreeAt(SUBJ.id);', {file: 'app.js'});
  assert.strictEqual(U.split('\n    cq: {').length - 1, 3, 'one cq per subject');
  assert.ok(/cqByIMR/.test(U) && /cqByKey/.test(U) && /cqByFamily/.test(U));
  assert.ok(
    !/'fish'|SUBJECTS\[/.test(block(QUIZ, 'function cqGroups(', '\nfunction cqByFamily', {file: 'quiz.js'}).replace(/\/\/[^\n]*/g, '')),
    'no subject test in the groups'
  );
});
