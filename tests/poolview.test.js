'use strict';
require('./slot.js').testGuard();
// Whether a unit has a game photo to show (model.js photoAny) is a view of the data version per unit (photoAnyBy, read
// once for a loop through photoAnyFn), for the units in play (app.js poolCalc, a state view): poolCalc asked photoAny of
// every unit in play at every answer, and it reads the data alone (the unit's photos and their growth forms, its growth
// forms, gamePhotoOk). A speed-up only: the units in play must be the code before's, in the same order. One page holds
// app.js's versions and views, model.js's photoAny and its view, app.js's poolCalc and pool, and the code before
// (poolCalc verbatim but for its name). Units of every shape (three views or two levels, form "x" in the colony slot, one
// or several growth forms, photos refused by gamePhotoOk, a photo with no name, empty views). Between reads, the writers:
// the slate and the bonus units (the player's: stateBump('rec')), the records alone (the same), and the data (a photo
// added, removed, refused or let through, its form, a unit's levels or growth forms: stateBump()). VIEW_CHECK off and on.
// Then the mutation: a data write bumped as the player's own is caught, by VIEW_CHECK and by the reference.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js'),
  C = require('../core.js'),
  {memStorage} = require('./kept.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  MODEL = src('model.js'),
  APP = src('app.js');
const line = (s, from, file) => cut(s, from, '\n', {file});
const CODE = [
  cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
  cut(MODEL, 'function photoAny(n) {', '// The photo variants of unit n', {file: 'model.js'}),
  line(APP, 'const poolCalc = ', 'app.js'),
  line(APP, 'const pool = stateView(', 'app.js'),
  // The code before, verbatim but for its name.
  'const poolCalc0 = () => [...slateGenera(), ...bonusList()].filter(photoAny);',
  'this.F = {pool, poolCalc, poolCalc0, photoAny, photoAnyBy, photoAnyFn, stateBump, ver: () => [STATE_V, DATA_V]};'
].join('\n');

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
// W: the world both codes read: U the units' records (levels, views, forms), refused (the photo names gamePhotoOk
// refuses), slate and bonus (the units in play's sources).
function page(W, check) {
  const later = [],
    ctx = vm.createContext({
      window: {VIEW_CHECK_ON: check},
      localStorage: memStorage(),
      setTimeout: f => later.push(f),
      SUBJECTS: C.SUBJECTS,
      subjKey: C.subjKey,
      startKey: C.startKey,
      keyGet: C.keyGet,
      keyRename: C.keyRename,
      GX: n => W.U[n],
      // read once by each computation of photoAny: W.computed counts them
      imrFormsOf: n => ((W.computed = (W.computed || 0) + 1), Array.from({length: W.U[n].forms}, (_, i) => 'f' + i)),
      gamePics: (n, v) => W.U[n].views[v] || [],
      gamePhotoOk: (n, p) => !W.refused.has(p.f),
      slateGenera: () => [...W.slate],
      bonusList: () => [...W.bonus]
    });
  vm.runInContext(CODE, ctx);
  return {F: ctx.F, later};
}
let pid = 0;
const photo = r => {
  const p = {f: r() < 0.05 ? undefined : 'p' + pid++};
  if (r() < 0.3) p.form = 'x';
  return p;
};
function world(r, n = 60) {
  const U = {},
    refused = new Set();
  for (let u = 0; u < n; u++) {
    const views = {};
    for (const v of ['wide', 'medium', 'macro']) if (r() < 0.5) views[v] = Array.from({length: Math.floor(r() * 3)}, () => photo(r));
    for (const p of Object.values(views).flat()) if (p.f && r() < 0.3) refused.add(p.f);
    U['u' + u] = {levels: r() < 0.3 ? 2 : 3, views, forms: r() < 0.3 ? 1 : 2};
  }
  const names = Object.keys(U);
  return {U, refused, slate: names.filter(() => r() < 0.6), bonus: names.filter(() => r() < 0.2)};
}
// A data write: one of the inputs photoAny reads, changed on a unit drawn.
function dataWrite(W, r) {
  const names = Object.keys(W.U),
    g = W.U[names[Math.floor(r() * names.length)]],
    vs = ['wide', 'medium', 'macro'],
    v = vs[Math.floor(r() * 3)],
    L = (g.views[v] = g.views[v] || []),
    k = Math.floor(r() * 7);
  if (k === 0) return (L.push(photo(r)), 'photo added');
  if (k === 1) return (L.splice(Math.floor(r() * L.length), 1), 'photo removed');
  if (k === 2 && L.length) return (W.refused.add(L[Math.floor(r() * L.length)].f), 'photo refused');
  if (k === 3) return (W.refused.clear(), 'every photo let through');
  if (k === 4 && L.length) {
    const p = L[Math.floor(r() * L.length)];
    p.form = p.form === 'x' ? 'f0' : 'x';
    return 'form';
  }
  if (k === 5) return ((g.levels = g.levels === 2 ? 3 : 2), 'levels');
  return ((g.forms = g.forms === 1 ? 2 : 1), 'growth forms');
}
function playerWrite(W, r) {
  const names = Object.keys(W.U),
    pickSome = p => names.filter(() => r() < p);
  const k = Math.floor(r() * 3);
  if (k === 0) return ((W.slate = pickSome(0.6)), 'slate');
  if (k === 1) return ((W.bonus = pickSome(0.2)), 'bonus');
  return 'records';
}

test('the units in play with photoAny as a data view: the code before’s, in order, VIEW_CHECK off and on', () => {
  for (const check of [false, true])
    for (const seed of [1, 2, 3]) {
      const r = rng(seed * 7919),
        W = world(r),
        pg = page(W, check),
        {F} = pg,
        ops = {},
        stat = {reads: 0, inPlay: 0, out: 0, data: 0};
      const read = label => {
        const ref = F.poolCalc0(),
          v = F.pool();
        assert.deepStrictEqual(v, ref, label);
        assert.deepStrictEqual(F.poolCalc(), ref, `${label}: poolCalc`);
        // each unit's kept value, one by one and through the loop's read, against photoAny now
        const fn = F.photoAnyFn();
        for (const n of Object.keys(W.U)) {
          assert.strictEqual(F.photoAnyBy(n), F.photoAny(n), `${label}: ${n}`);
          assert.strictEqual(fn(n), F.photoAny(n), `${label}: ${n}, the loop's read`);
        }
        stat.reads++;
        stat.inPlay += v.length;
        stat.out += W.slate.length + W.bonus.length - v.length;
      };
      read(`seed ${seed} first read`);
      for (let i = 0; i < 200; i++) {
        const data = r() < 0.5,
          op = data ? dataWrite(W, r) : playerWrite(W, r);
        ops[op] = (ops[op] || 0) + 1;
        F.stateBump(data ? undefined : 'rec');
        if (data) stat.data++;
        const label = `seed ${seed} step ${i} after ${op}${check ? ', VIEW_CHECK' : ''}`;
        read(label);
        if (r() < 0.3) read(label + ', again in the same version');
      }
      assert.deepStrictEqual(pg.later, [], 'no VIEW_CHECK difference thrown later');
      assert.ok(stat.inPlay > 1000 && stat.out > 500 && stat.data > 50, JSON.stringify(stat));
      for (const k of ['photo added', 'photo removed', 'photo refused', 'form', 'levels', 'growth forms', 'slate', 'bonus', 'records'])
        assert.ok(ops[k] > 0, `${k} met: ${JSON.stringify(ops)}`);
    }
});

test('photoAny’s view: computed once per unit and data version, kept across the player’s bumps', () => {
  const r = rng(11),
    W = world(r),
    {F} = page(W, false),
    inPlay = new Set([...W.slate, ...W.bonus]),
    names = Object.keys(W.U);
  W.computed = 0;
  F.pool();
  assert.strictEqual(W.computed, inPlay.size, 'the first read: each unit in play once');
  F.pool();
  F.stateBump('rec');
  F.pool();
  F.stateBump('rec');
  assert.strictEqual(F.poolCalc().length, F.pool().length);
  assert.strictEqual(W.computed, inPlay.size, 'the player’s bumps: no unit computed again');
  for (const n of names) F.photoAnyBy(n);
  assert.strictEqual(W.computed, names.length, 'a unit not in play: computed at its first read');
  F.stateBump();
  F.pool();
  assert.strictEqual(W.computed, names.length + inPlay.size, 'a data bump: each unit in play computed again');
});

test('mutation: a photo input written with the player’s bump alone is caught, by VIEW_CHECK and by the reference', () => {
  for (const check of [false, true]) {
    const r = rng(5),
      W = world(r),
      pg = page(W, check),
      {F} = pg;
    F.pool();
    // every photo of a unit in play with a photo refused: it leaves the units in play
    const n = F.pool()[0];
    for (const p of Object.values(W.U[n].views).flat()) W.refused.add(p.f);
    assert.ok(!F.photoAny(n), 'the unit has no photo left');
    F.stateBump('rec');
    if (check) {
      assert.throws(() => F.pool(), /data view photoAny/, 'VIEW_CHECK throws');
      pg.later.length = 0;
    } else {
      assert.notDeepStrictEqual(F.pool(), F.poolCalc0(), 'the kept value differs from the reference');
      F.stateBump();
      assert.deepStrictEqual(F.pool(), F.poolCalc0(), 'a data bump makes it again');
    }
  }
});
