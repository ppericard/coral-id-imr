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
// The page's code, from model.js's source (a mutant's, below).
const codeOf = model =>
  [
    cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'}),
    'let PCONF = {};',
    cut(model, 'const GROUP = {MAX: 3};', '\n// The groups of the units in play', {file: 'model.js'}),
    cut(model, 'const confPrior = ', "// A pair's prior reads each unit's part of it", {file: 'model.js'}),
    cut(model, 'function dataSeed(a, b) {', '\n}\n', {through: 1, file: 'model.js'}),
    line(model, 'const formsOf = ', 'model.js'),
    REF,
    'this.F = {groupsOfRank, groupsOfRank0, groupConf, groupConf0, declared, declared0, groupPairFn, stateBump, setConf: c => (PCONF = c)};'
  ].join('\n');
const CODE = codeOf(MODEL);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const FAMS = ['F0', 'F1', 'F2', 'F3'];
// code: the page's code (a mutant's); conf: core.js CONF, or other priors (a lower prior that reaches CONF.TRAP).
function page(W, check, code = CODE, conf = C.CONF) {
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
      // core.js's confScore; on other priors, its formula on them
      confScore: conf === C.CONF ? C.confScore : (c, prior) => ((c ? c[1] : 0) + conf.W * prior) / ((c ? c[0] : 0) + conf.W),
      CONF: conf,
      // a name with no record: GX gives nothing (Object.hasOwn: the prototype's names are units of their own here)
      GX: n => (Object.hasOwn(W.U, n) ? W.U[n] : undefined),
      imrFormsOf: n => W.U[n].forms
    });
  vm.runInContext(code, ctx);
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

// Only the pairs that may be an edge are scored (groupPairFn pairs: the look-alikes, declared or from the data, and the
// pairs the pooled stats count), the others when the average linkage reads them: a long fish history's first build scored
// about 25,000 pairs, a few hundred of them look-alikes or counted. The worlds below are larger and their pooled stats
// count more pairs, many of them mixed up often enough to pass CONF.TRAP without being look-alikes.
function richConf(r, names, k) {
  const o = {};
  for (let i = 0; i < k; i++) {
    const a = names[Math.floor(r() * names.length)],
      b = names[Math.floor(r() * names.length)];
    if (a === b) continue;
    const off = 1 + Math.floor(r() * 40),
      // a pair key now and then the other way round (never read) or with a name not in play
      key = r() < 0.05 ? b + '|' + a : r() < 0.05 ? a + '|zz' : a < b ? a + '|' + b : b + '|' + a;
    o[key] = [off, Math.floor(r() * off * (r() < 0.3 ? 0.9 : 0.25))];
  }
  return o;
}
// A page's value as this file's own (the page's lists are another realm's).
const host = x => JSON.parse(JSON.stringify(x));
// Every pair of L (sorted), as the loop over them.
const allPairs = L => L.flatMap((a, i) => L.slice(i + 1).map(b => [a, b]));
// One world's check: the pairs left out are never an edge, the pairs kept are in the loop's order, the groups are the code
// before's. Returns what it met.
function pairsCheck(F, L, label) {
  L = [...L].sort();
  const kept = host(F.groupPairFn().pairs(L)),
    keys = new Set(kept.map(p => p.join('|'))),
    all = allPairs(L),
    met = {left: 0, kept: kept.length, edgesKept: 0};
  assert.deepStrictEqual(
    kept,
    all.filter(p => keys.has(p.join('|'))),
    `${label}: the pairs kept are pairs of L, in the loop's order`
  );
  for (const [a, b] of all) {
    const edge = F.declared0(a, b) || F.groupConf0(a, b) >= C.CONF.TRAP;
    if (keys.has(a + '|' + b)) met.edgesKept += edge ? 1 : 0;
    else (assert.ok(!edge, `${label}: ${a} ${b} is an edge left out`), met.left++);
  }
  assert.deepStrictEqual(F.groupsOfRank(L), F.groupsOfRank0(L), label);
  return met;
}

test('the pairs scored: every edge is among them, the others never one, the groups the code before’s', t => {
  const tot = {left: 0, kept: 0, edgesKept: 0, groups: 0, three: 0};
  for (const check of [false, true])
    for (let seed = 1; seed <= 5; seed++) {
      const r = rng(seed * 7919),
        W = world(r, 70),
        pg = page(W, check),
        {F} = pg;
      for (let i = 0; i < 6; i++) {
        if (i) r() < 0.5 ? (dataWrite(W, r), F.stateBump()) : F.stateBump('rec');
        F.setConf(richConf(r, W.names, 60 + Math.floor(r() * 400)));
        F.stateBump();
        const L = W.names.filter(() => r() < 0.85),
          m = pairsCheck(F, L, `seed ${seed} step ${i}${check ? ', VIEW_CHECK' : ''}`),
          g = F.groupsOfRank(L);
        for (const k of ['left', 'kept', 'edgesKept']) tot[k] += m[k];
        tot.groups += Object.keys(g).length;
        tot.three += Object.values(g).filter(x => x.length === 3).length;
      }
      assert.deepStrictEqual(pg.later, [], 'no VIEW_CHECK difference thrown later');
    }
  // most pairs are left out, and the worlds meet groups of three (average linkage reads the pairs inside two groups)
  assert.ok(tot.left > 2 * tot.kept && tot.edgesKept > 500 && tot.three > 100, JSON.stringify(tot));
  t.diagnostic(JSON.stringify(tot));
});

test('every pair is scored when the shortcut does not hold: a unit with no record, a name twice, a lower prior at CONF.TRAP', () => {
  const r = rng(31),
    W = world(r, 30),
    L = [...W.names].sort();
  // a unit with no record: every pair, and the same throw as the code before (confPrior reads its family)
  {
    const {F} = page(W, false);
    F.setConf(richConf(r, W.names, 200));
    F.stateBump();
    const M = [...L, W.none].sort();
    assert.deepStrictEqual(host(F.groupPairFn().pairs(M)), allPairs(M));
    assert.throws(() => F.groupsOfRank0(M));
    assert.throws(() => F.groupsOfRank(M));
  }
  // a name twice
  {
    const {F} = page(W, false),
      M = [...L, L[3]].sort();
    F.setConf(richConf(r, W.names, 200));
    F.stateBump();
    assert.deepStrictEqual(host(F.groupPairFn().pairs(M)), allPairs(M));
    assert.deepStrictEqual(F.groupsOfRank(M), F.groupsOfRank0(M));
  }
  // look-alikes of another shape than a list
  {
    const V = {...W, U: {...W.U, [L[2]]: {...W.U[L[2]], decl: L[5]}}},
      {F} = page(V, false);
    F.setConf(richConf(r, W.names, 200));
    F.stateBump();
    assert.deepStrictEqual(host(F.groupPairFn().pairs(L)), allPairs(L));
    assert.deepStrictEqual(F.groupsOfRank(L), F.groupsOfRank0(L));
  }
  // the family's prior at CONF.TRAP: every pair of a family is an edge, so every pair is scored
  {
    const {F} = page(W, false, CODE, {...C.CONF, FAM: 0.25});
    F.setConf({});
    F.stateBump();
    assert.deepStrictEqual(host(F.groupPairFn().pairs(L)), allPairs(L));
    const g = F.groupsOfRank(L);
    assert.deepStrictEqual(g, F.groupsOfRank0(L));
    assert.ok(Object.keys(g).length > 5, 'families grouped');
  }
});

// Mutants of the new code, each made from model.js's source: each must give other groups than the code before on one of
// the worlds above. Keeping the pairs in another order is an equivalent mutant: the declared pairs are sorted on a total
// order and the average linkage's best pair is the same whichever edge comes first (ties are broken on the groups' names).
test('mutation: the pairs left out or a pair read unscored are caught', t => {
  const MUT = [
    ['the pooled stats’ pairs left out', 'for (const k of Object.keys(PCONF))', 'for (const k of [])'],
    ['the data look-alikes left out', 'u.dl.forEach(m => add(n, m));', ''],
    ['the declared look-alikes left out', 'u.decl.forEach(m => add(n, m));', ''],
    [
      'a pair not scored yet read as 0',
      'if (!sc.has(k)) sc.set(k, a < b ? groupConf(a, b) : groupConf(b, a));',
      'if (!sc.has(k)) return 0;'
    ],
    ['the lower priors not checked', '[CONF.FAM, CONF.FORM, CONF.BASE].some(p => confScore(undefined, p) >= CONF.TRAP) ||', ''],
    ['a key read at its first | only', "x = k.indexOf('|', x + 1)", 'x = -1']
  ];
  for (const [what, from, to] of MUT) {
    assert.strictEqual(MODEL.split(from).length, 2, `${what}: the mutated text occurs once`);
    const code = codeOf(MODEL.replace(from, to));
    let caught = false;
    for (let seed = 1; seed <= 12 && !caught; seed++) {
      const r = rng(seed * 7919),
        W = world(r, 70);
      // names with a | in them, for the key read at its first | only
      if (seed > 6) for (const n of W.names.slice(0, 8)) ((W.U['a|' + n] = W.U[n]), (W.names = [...W.names, 'a|' + n]));
      for (const conf of [C.CONF, {...C.CONF, FAM: 0.25}]) {
        const {F} = page(W, false, code, conf);
        F.setConf(richConf(r, W.names, 300));
        F.stateBump();
        const L = W.names.filter(() => r() < 0.9),
          ref = F.groupsOfRank0(L); // the code before never throws here
        if (!caught) caught = !require('util').isDeepStrictEqual(host(F.groupsOfRank(L)), host(ref)) && `seed ${seed}, FAM ${conf.FAM}`;
      }
    }
    assert.ok(caught, `${what}: caught`);
    t.diagnostic(`${what}: caught at ${caught}`);
  }
});
