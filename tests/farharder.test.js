require('./slot.js').testGuard();
// The calibration goal (docs/reviews/2026-11-06-photo-exposure-study.md §4, §7.6): the admin
// flags the photos in play far harder than their genus (admin.js farHarder: the photo's own part of its difficulty, its
// ?stats=1 difficulty minus its genus's offset gd, of FAR.D logits or more after FAR.N answers or more), the farthest
// first; RATE.MIN is the first answers each photo should get (3).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8');
const load = (stats, gd) => {
  const ctx = {STATS: stats, GD: gd};
  vm.createContext(ctx);
  vm.runInContext(
    [
      block(src, 'const RATE = {MIN: 3}', '\n', {file: 'admin.js', through: true}) +
        block(src, '  FAR = {', '\n', {file: 'admin.js', through: true}),
      block(src, 'const nAns = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'const photoStats = ', '\n', {file: 'admin.js', through: true}),
      block(src, 'function farHarder(play) {', '\n}\n', {file: 'admin.js', through: true}),
      block(src, 'function farFrom(play, ST, G, unitOf) {', '\n}\n', {file: 'admin.js', through: true}),
      'this.out = {RATE, FAR, farHarder, farFrom};'
    ].join('\n'),
    ctx
  );
  return ctx.out;
};

test('farHarder: 1.5 logits or more above the genus after 5 answers or more, the farthest first', () => {
  const GD = {A: [0.4, 30], B: [-0.2, 12]},
    // [difficulty (genus offset + residual), weighed answers, weighed right, answers]
    S = {
      a1: [2.0, 4.2, 1, 5], // residual 1.6, 5 answers: flagged
      a2: [1.9, 3.1, 1, 4], // residual 1.5 but 4 answers: not yet
      a3: [1.85, 6, 2, 8], // residual 1.45: within
      b1: [1.8, 8, 2, 9], // residual 2.0: flagged, first
      b2: [-2.5, 9, 9, 9], // far easier: never flagged
      c1: [3, 9, 0, 9] // a genus with no offset (a sheet that sends none): none
    },
    play = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1', 'zz'].map(f => ({f, genus: f[0].toUpperCase(), view: 'wide'}));
  const {RATE, FAR, farHarder} = load(S, GD);
  assert.deepStrictEqual([RATE.MIN, FAR.N, FAR.D], [3, 5, 1.5]);
  const L = farHarder(play);
  assert.deepStrictEqual(
    L.map(p => p.f),
    ['b1', 'a1']
  );
  assert.deepStrictEqual([L[0].a, Math.round(L[0].r * 100) / 100, L[0].gd, L[0].d], [9, 2, -0.2, 1.8]);
  // Exactly at the threshold counts.
  assert.deepStrictEqual(
    load({x: [1.9, 5, 1, 5]}, {X: [0.4, 1]})
      .farHarder([{f: 'x', genus: 'X'}])
      .map(p => p.f),
    ['x']
  );
  assert.deepStrictEqual(load(null, {}).farHarder(play), []);
});

test('farFrom: a tree subject’s photo against the offset of the unit it was rated at (the sheet’s fifth element), not its row’s', () => {
  // [difficulty, weighed answers, weighed right, answers, the unit whose offset the difficulty carries]
  const ST = {
      a: [2.25, 4, 1, 5, 'f:A'], // rated at its family: residual 1.75
      b: [1.25, 6, 2, 6, 'g:B'], // rated at its genus (offset -0.5): residual 1.75, though its family's offset is 0.75
      c: [1.25, 6, 2, 6, 'f:B'], // residual 0.5: within
      d: [3.5, 3, 1, 4, 'f:A'], // 4 answers: not yet
      e: [3.0, 6, 2, 6, 'g:None'] // a unit the sheet has no offset for: none
    },
    G = {'f:A': [0.5, 30], 'f:B': [0.75, 20], 'g:B': [-0.5, 8]},
    play = ['a', 'b', 'c', 'd', 'e', 'zz'].map(f => ({f, u: f === 'b' || f === 'c' ? 'f:B' : 'f:A'})),
    {farFrom} = load(ST, G);
  const L = farFrom(play, ST, G, p => (ST[p.f] || [])[4]);
  assert.deepStrictEqual(
    L.map(p => [p.f, p.r, p.gd, p.u]),
    [
      ['b', 1.75, -0.5, 'f:B'],
      ['a', 1.75, 0.5, 'f:A']
    ],
    'a tie on the gap: the one with more answers first, then the order given'
  );
  assert.deepStrictEqual(
    farFrom([], ST, G, () => 'f:A'),
    []
  );
});
