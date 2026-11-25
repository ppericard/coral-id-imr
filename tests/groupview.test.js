'use strict';
require('./slot.js').testGuard();
// The confusion groups (model.js groupsOfRank) score every pair of a rank from its two units' parts, read once for the
// loop (groupPairFn: groupUnit, a view of the data version per unit, and formsOf), where each pair read its two records
// and computed their growth forms again: tens of thousands of pairs on a long fish history, whenever the units in play or
// the pooled stats change (the first answer of a comeback paid about 0.65 M calls for it). A speed-up only: the groups
// must be the code before's. One page holds app.js's versions and views, model.js's groups (declaredOf to groupsOfRank),
// confPrior, dataSeed and formsOf, and the code before (declared, groupConf and groupsOfRank verbatim but for their names
// …0). Units with declared look-alikes (decl, else look, else none), data look-alikes (dl), families, growth forms, a name
// with no record and names only an object's prototype holds (constructor, toString). Between reads, the writers: the
// pooled stats (PCONF, a new object: stateBump()), the data (a unit's decl, look, dl, family or forms: stateBump()), and
// the player's records (stateBump('rec')). VIEW_CHECK off and on. Then the mutation: a data write bumped as the player's
// own is caught, by VIEW_CHECK and by the reference.
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
// The code before, verbatim but for the names (…0) and the comment lines.
const REF = `const declared0 = (t, n) => declaredOf(t).includes(n) || declaredOf(n).includes(t);
const groupConf0 = (t, n) => confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], confPrior(t, n, declared0(t, n)));
function groupsOfRank0(L) {
  L = [...L].sort();
  const cl = new Map(L.map(n => [n, [n]])),
    sc = {},
    s = (a, b) => sc[a < b ? a + '|' + b : b + '|' + a],
    merge = (A, B) => {
      const C = [...A, ...B].sort();
      C.forEach(n => cl.set(n, C));
    },
    edges = [];
  L.forEach((a, i) =>
    L.slice(i + 1).forEach(b => {
      const v = (sc[a + '|' + b] = groupConf0(a, b));
      if (declared0(a, b) || v >= CONF.TRAP) edges.push([a, b, v]);
    })
  );
  edges
    .filter(([a, b]) => declared0(a, b))
    .sort((x, y) => y[2] - x[2] || (x[0] + '|' + x[1] < y[0] + '|' + y[1] ? -1 : 1))
    .forEach(([a, b]) => {
      const A = cl.get(a),
        B = cl.get(b);
      if (A !== B && A.length + B.length <= GROUP.MAX) merge(A, B);
    });
  for (;;) {
    let best = null;
    edges.forEach(([a, b]) => {
      const A = cl.get(a),
        B = cl.get(b);
      if (A === B || A.length + B.length > GROUP.MAX) return;
      const m = A.reduce((t, x) => t + B.reduce((u, y) => u + s(x, y), 0), 0) / (A.length * B.length),
        k = [A[0], B[0]].sort().join('|');
      if (m >= CONF.TRAP && (!best || m > best[0] || (m === best[0] && k < best[1]))) best = [m, k, A, B];
    });
    if (!best) break;
    merge(best[2], best[3]);
  }
  const out = {};
  cl.forEach((C, n) => C.length > 1 && (out[n] = C));
  return out;
}`;
const CODE = [
  cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
  'let PCONF = {};',
  cut(MODEL, 'const GROUP = {MAX: 3};', '\n// The groups of the units in play', {file: 'model.js'}),
  cut(MODEL, 'const confPrior = ', "// A pair's prior reads each unit's part of it", {file: 'model.js'}),
  cut(MODEL, 'function dataSeed(a, b) {', '\n}\n', {through: 1, file: 'model.js'}),
  line(MODEL, 'const formsOf = ', 'model.js'),
  REF,
  'this.F = {groupsOfRank, groupsOfRank0, groupConf, groupConf0, declared, declared0, groupPairFn, stateBump, setConf: c => (PCONF = c)};'
].join('\n');

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const FAMS = ['F0', 'F1', 'F2', 'F3'];
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
      confScore: C.confScore,
      CONF: C.CONF,
      // a name with no record: GX gives nothing (Object.hasOwn: the prototype's names are units of their own here)
      GX: n => (Object.hasOwn(W.U, n) ? W.U[n] : undefined),
      imrFormsOf: n => W.U[n].forms
    });
  vm.runInContext(CODE, ctx);
  return {F: ctx.F, later};
}
function world(r, n = 40) {
  const names = [...Array.from({length: n}, (_, i) => 'u' + String(i).padStart(2, '0')), 'constructor', 'toString'],
    U = {};
  for (const x of names) U[x] = unit(r, names);
  return {U, names, none: 'ghost'};
}
function unit(r, names) {
  const some = p => names.filter(() => r() < p),
    u = {fam: FAMS[Math.floor(r() * FAMS.length)], forms: ['a', 'b', 'c', 'd'].filter(() => r() < 0.35)};
  const k = r();
  if (k < 0.3) u.decl = some(0.06);
  if (k < 0.6) u.look = some(0.06);
  if (r() < 0.4) u.dl = some(0.05);
  return u;
}
// The pooled stats: pairs of the names, [offered together, mixed up].
function conf(r, names) {
  const o = {};
  for (let i = 0; i < 120; i++) {
    const a = names[Math.floor(r() * names.length)],
      b = names[Math.floor(r() * names.length)];
    if (a === b) continue;
    const off = 1 + Math.floor(r() * 60);
    o[a < b ? a + '|' + b : b + '|' + a] = [off, Math.floor(r() * r() * off)];
  }
  return o;
}
function dataWrite(W, r) {
  const n = W.names[Math.floor(r() * W.names.length)],
    u = W.U[n],
    k = Math.floor(r() * 6),
    some = p => W.names.filter(() => r() < p);
  if (k === 0) return ((u.decl = some(0.08)), 'decl');
  if (k === 1) return (delete u.decl, (u.look = some(0.08)), 'look');
  if (k === 2) return ((u.dl = some(0.06)), 'dl');
  if (k === 3) return ((u.fam = FAMS[Math.floor(r() * FAMS.length)]), 'family');
  if (k === 4) return ((u.forms = ['a', 'b', 'c', 'd'].filter(() => r() < 0.35)), 'forms');
  return ((W.U[n] = unit(r, W.names)), 'record replaced');
}

test('the confusion groups from the units’ parts: the code before’s, every pair the same, VIEW_CHECK off and on', () => {
  for (const check of [false, true])
    for (const seed of [1, 2, 3]) {
      const r = rng(seed * 104729),
        W = world(r),
        pg = page(W, check),
        {F} = pg,
        ops = {},
        stat = {groups: 0, pairs: 0, noRecord: 0};
      const read = label => {
        // the rank's units: most of the names, a name with no record now and then
        const L = W.names.filter(() => r() < 0.8);
        if (r() < 0.3) (L.push(W.none), stat.noRecord++);
        const fn = F.groupPairFn();
        for (const a of L)
          for (const b of L) {
            if (a === b) continue;
            assert.strictEqual(fn.decl(a, b), F.declared0(a, b), `${label}: declared ${a} ${b}`);
            // a pair with no record throws in both (confPrior reads its family) unless it is a look-alike
            let x, y;
            try {
              x = fn.conf(a, b);
            } catch (e) {
              x = 'throws';
            }
            try {
              y = F.groupConf0(a, b);
            } catch (e) {
              y = 'throws';
            }
            assert.strictEqual(x, y, `${label}: groupConf ${a} ${b}`);
            stat.pairs++;
          }
        const L2 = L.filter(n => n !== W.none),
          g = F.groupsOfRank(L2);
        assert.deepStrictEqual(g, F.groupsOfRank0(L2), label);
        stat.groups += Object.keys(g).length;
      };
      F.setConf(conf(r, W.names));
      F.stateBump();
      read(`seed ${seed} first`);
      for (let i = 0; i < 40; i++) {
        const k = r();
        let op;
        if (k < 0.25) (F.setConf(conf(r, W.names)), F.stateBump(), (op = 'pooled stats'));
        else if (k < 0.75) ((op = dataWrite(W, r)), F.stateBump());
        else (F.stateBump('rec'), (op = 'records'));
        ops[op] = (ops[op] || 0) + 1;
        const label = `seed ${seed} step ${i} after ${op}${check ? ', VIEW_CHECK' : ''}`;
        read(label);
        if (r() < 0.3) read(label + ', again');
      }
      assert.deepStrictEqual(pg.later, [], 'no VIEW_CHECK difference thrown later');
      assert.ok(stat.groups > 100 && stat.noRecord > 0, JSON.stringify(stat));
      for (const k of ['decl', 'look', 'dl', 'family', 'forms', 'pooled stats', 'records'])
        assert.ok(ops[k] > 0, `${k} met: ${JSON.stringify(ops)}`);
    }
});

test('mutation: a unit’s look-alikes written with the player’s bump alone are caught, by VIEW_CHECK and by the reference', () => {
  for (const check of [false, true]) {
    const r = rng(9),
      W = world(r),
      pg = page(W, check),
      {F} = pg,
      L = W.names;
    F.setConf(conf(r, W.names));
    F.stateBump();
    F.groupsOfRank(L);
    // two units declared look-alikes of each other, as their records now say
    const [a, b] = L.filter(n => !F.declared0(n, L[0]) && n !== L[0])
      .slice(0, 1)
      .concat([L[0]]);
    W.U[a].decl = [b];
    F.stateBump('rec');
    if (check) {
      assert.throws(() => F.groupsOfRank(L), /data view groupUnit/, 'VIEW_CHECK throws');
      pg.later.length = 0;
    } else {
      assert.notStrictEqual(F.groupPairFn().decl(a, b), F.declared0(a, b), 'the kept part differs from the reference');
      F.stateBump();
      assert.deepStrictEqual(F.groupsOfRank(L), F.groupsOfRank0(L), 'a data bump makes it again');
    }
  }
});
