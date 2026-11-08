// The photo memory offsets of the subject in play (model.js pmem; the re-check of #664, F8, 2026-11-08): the sheet's
// PMEM is fitted on the corals' answers only (Code.gs stats_ reads the replayed subject's rows), so a fish answer is
// drawn, scored and recalculated with the prior (core.js MEM.PRIOR), never with a coral offset; the corals keep PMEM,
// the very array, so their outcomes are the ones before. model.js runs in a vm; the draw through tests/rareease.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const {engine} = require('./rareease.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const src = read('model.js');
// The live sheet's coral offsets of 2026-11-08 (?stats=1 mem): shown never right is harder than new for the corals.
const CORAL = [0, 0.43, -0.68, -1.42];
// An array whose every read throws: a code path that reads it fails the test.
const untouchable = () =>
  new Proxy(CORAL.slice(), {
    get(t, k) {
      if (typeof k === 'string' && /^\d+$/.test(k)) throw new Error(`a coral offset read: PMEM[${k}]`);
      return t[k];
    }
  });
// model.js PMEM, pmem, famOf and memRecalcAll on subject's progress P, with PMEM set to mem.
function model(subject, P, mem) {
  const ctx = {
    SUBJ: C.subjectOf(subject),
    store: {get: (k, d) => d},
    memOf: C.memOf,
    memFam: C.memFam,
    memBucket: C.memBucket,
    memRecalc: C.memRecalc,
    mxRecalc: fn => fn(),
    save: () => {},
    LEVEL: '_level',
    P,
    MEM_IN: mem
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      cut(src, 'let PMEM = memOf(', '\n// Per-format offsets', {file: 'model.js'}),
      cut(src, 'function memRecalcAll() {', '\n}\n', {through: 1, file: 'model.js'}),
      cut(src, 'const famOf = (n, ph) => {', '\n};\n', {through: 1, file: 'model.js'}),
      'PMEM = MEM_IN;',
      'this.M = {pmem, famOf, memRecalcAll, PMEM0};'
    ].join('\n'),
    ctx
  );
  return ctx.M;
}
// A record from before the photo memory (no pm, a bar s.pg) with photos in every bucket: memRecalc corrects its bar by
// the offsets it is given.
const oldRecord = () => ({ok: 6, ko: 2, pg: 0.6, ps: {a: [1, 0], b: [2, 1], c: [3, 3], d: [4, 2]}});
const photos = ['n', 'a', 'b', 'c'].map(f => ({f})); // new, shown never right, right once, right twice or more

test('fish: the expectation and the recalculation take the prior, never a coral offset', () => {
  const P = {u: oldRecord()},
    M = model('fish', P, untouchable());
  assert.deepStrictEqual(M.pmem(), C.MEM.PRIOR);
  const hs = photos.map(p => P.u.ps[p.f]);
  assert.strictEqual(M.famOf('u', photos), C.memFam(hs, C.MEM.PRIOR));
  const want = oldRecord();
  C.memRecalc(want, C.MEM.PRIOR);
  assert.ok(M.memRecalcAll(), 'the old record recalculated');
  assert.deepStrictEqual(P.u, want);
  assert.notStrictEqual(P.u.pg, oldRecord().pg, 'the prior did move the old bar');
});

test('fish: the draw weighs a photo already shown by the prior, never by a coral offset', () => {
  const L = Array.from({length: 12}, (_, i) => ({f: `p${i}`, o: `o${i}`, e: 3})),
    ps = {p0: [1, 0], p1: [2, 1], p2: [3, 3], p3: [4, 2]},
    E = engine('fish', L, {ps, ok: 6, PMEM: untouchable()});
  for (let i = 0; i < 300; i++) E.photoSet('u', null, 0, 4, 'k4');
});

test('corals unchanged: the sheet offsets themselves, in the draw, the expectation and the recalculation', () => {
  const P = {u: oldRecord()},
    M = model('coral', P, CORAL);
  assert.strictEqual(M.pmem(), CORAL, 'the very PMEM array');
  const hs = photos.map(p => P.u.ps[p.f]);
  assert.strictEqual(M.famOf('u', photos), C.memFam(hs, CORAL));
  const want = oldRecord();
  C.memRecalc(want, CORAL);
  M.memRecalcAll();
  assert.deepStrictEqual(P.u, want);
  // The draw: a photo already shown weighs by the sheet's offsets, read from PMEM itself.
  const L = Array.from({length: 12}, (_, i) => ({f: `p${i}`, o: `o${i}`})),
    ps = {p0: [1, 0], p1: [2, 1], p2: [3, 3], p3: [4, 2]};
  let reads = 0;
  const counted = new Proxy(CORAL.slice(), {
    get(t, k) {
      if (typeof k === 'string' && /^\d+$/.test(k)) reads++;
      return t[k];
    }
  });
  const A = engine('coral', L, {ps, ok: 6, PMEM: counted});
  for (let i = 0; i < 300; i++) A.photoSet('u', null, 0, 4, 'k4');
  assert.ok(reads > 0, 'the coral draw reads the sheet offsets');
});

test('the game reads the photo memory offsets only through pmem (model.js, quiz.js)', () => {
  const code = f =>
    read(f)
      .split('\n')
      .filter(l => !/^\s*\/\//.test(l));
  const uses = ['model.js', 'quiz.js'].flatMap(f =>
    code(f)
      .filter(l => /\bPMEM\b/.test(l))
      .map(l => `${f}: ${l.trim()}`)
  );
  assert.deepStrictEqual(uses, [
    "model.js: let PMEM = memOf((store.get('reefid-photo-stats', {}) || {}).mem);",
    'model.js: const pmem = () => (SUBJ.replay ? PMEM : PMEM0);'
  ]);
});
