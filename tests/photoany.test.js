// model.js photoAny tells whether photoSet(n) would show a photo without drawing one (performance pass, 2026-11-09:
// app.js pool asks it of every unit, several times a question). Here both run on made-up units of every shape (three
// views or two levels, forms "x" in the colony slot, one or several growth forms, photos refused by gamePhotoOk, a
// photo with no name, empty views, one view alone) and agree on each, over several draws.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');
const code = [
  cut(src, 'const PICKD = {', '// The next exam question of genus n', {file: 'model.js'}),
  cut(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
  cut(src, 'const PMEM0 = memOf();', '\n// Per-format offsets', {file: 'model.js'}),
  cut(src, 'function wpick(', '\n}\n', {through: 1, file: 'model.js'})
].join('\n');

let seed = 777;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// U: {unit: {levels, views: {wide: [...], medium, macro}, forms: n}}; refused: photo names gamePhotoOk refuses.
function engine(U, refused) {
  const M = Object.create(Math);
  M.random = rnd;
  const stubs = {
    Math: M,
    SUBJ: C.subjectOf('coral'),
    calibOf: C.calibOf,
    refLevel: C.refLevel,
    memBucket: C.memBucket,
    aimOf: C.aimOf,
    DOM: C.DOM,
    TARGET_P: C.TARGET_P,
    AIM: C.AIM,
    LEVEL: '_level',
    P: {},
    PSTAT: {},
    PGD: {},
    PMEM: [0, -0.45, -1.1, -1.7],
    memOf: C.memOf,
    pfmt: () => ({}),
    fmtOff: () => 0,
    GX: n => U[n],
    imrFormsOf: n => Array.from({length: U[n].forms}, (_, i) => 'f' + i),
    gamePics: (n, v) => U[n].views[v] || [],
    gamePhotoOk: (n, p) => !refused.has(p.f),
    isCore: () => false,
    level: () => ['new'],
    rankOf: () => '',
    shaky: () => false,
    recent: () => [],
    ability: () => 0.5,
    genScore: () => 0.3,
    LV_AT: [0.5, 0.8, 0.95],
    pick: a => a[Math.floor(rnd() * a.length)]
  };
  const ctx = vm.createContext({...stubs}),
    names = Object.keys(stubs);
  return vm.runInContext(`(function (${names.join(', ')}) {\n${code}\nreturn {photoSet, photoAny};\n})`, ctx)(...names.map(k => stubs[k]));
}

test('photoAny: true exactly when photoSet shows a photo, on units of every shape', () => {
  const U = {},
    refused = new Set();
  let id = 0;
  for (let u = 0; u < 400; u++) {
    const two = rnd() < 0.3,
      views = {};
    for (const v of ['wide', 'medium', 'macro'])
      if (rnd() < 0.5) {
        const n = Math.floor(rnd() * 3);
        views[v] = Array.from({length: n}, () => {
          const p = {
            f: rnd() < 0.05 ? undefined : 'p' + id++,
            o: rnd() < 0.5 ? 'o' + Math.floor(rnd() * 3) : undefined,
            e: 1 + Math.floor(rnd() * 5)
          };
          if (rnd() < 0.3) p.form = 'x';
          if (p.f && rnd() < 0.3) refused.add(p.f);
          return p;
        });
      }
    U['u' + u] = {levels: two ? 2 : 3, views, forms: rnd() < 0.3 ? 1 : 2};
  }
  const E = engine(U, refused);
  const kinds = {yes: 0, no: 0};
  Object.keys(U).forEach(n => {
    const any = E.photoAny(n);
    kinds[any ? 'yes' : 'no']++;
    for (let k = 0; k < 4; k++) assert.strictEqual(any, E.photoSet(n).shown.length > 0, `${n} ${JSON.stringify(U[n])}`);
  });
  assert.ok(kinds.yes > 50 && kinds.no > 50, JSON.stringify(kinds));
});
