'use strict';
require('./slot.js').testGuard();
// The wrong choices' reads as views (docs/spec/model.md "The state version and its views"): a pair's pooled confusion
// through each unit's part of its prior (model.js confUnit, formsOf: views of the data version per unit; pooledConfFn,
// one read for a loop), the choice labels (choiceKeyFn: a view of the data version per unit and per IMR answer, the
// answer in the key, since a species named by its common name is labelled with the player's first common name), each
// unit's class (rankKindFn: app.js kindRank read once for a loop), and app.js keyView's fn behind them. A speed-up only:
// every value and every set of wrong choices must be the code before's. The reference is that code, kept here as it was
// (its comment lines left out, its names …0), beside the new one in one page: app.js's versions and views, model.js's
// pooled confusion, labels and distractors, on made-up units of three classes (families with declared and data
// look-alikes, families and growth forms; species by their common names, two of one label, the IMR name on some; genera).
// Between reads, the writers: the player's records and the IMR answer (stateBump('rec')), the pooled answers (stateBump(),
// as the statistics joined), the units' records (stateBump(), as a data build). VIEW_CHECK off and on. Then the
// mutations: a unit's record, its growth forms, its name or its class changed under the player's bump alone is caught,
// by VIEW_CHECK and by the reference.
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
const APP_CODE = cut(APP, 'let STATE_V = 0;', 'const store = {', {file: 'app.js'});
const BUMP = "const stateBump = rec => void (STATE_V++, rec === 'rec' || DATA_V++);";
const MODEL_CODE = [
  cut(MODEL, 'const isLook = (t, n) =>', '// Known mix-ups', {file: 'model.js'}),
  cut(MODEL, 'function dataSeed(a, b) {', '\n}\n', {through: 1, file: 'model.js'}),
  cut(MODEL, "// A choice's label as its button shows it", '\n// Elo, the progress', {file: 'model.js'})
].join('\n');

// The code before these views (model.js pooledConf, confOf, confusable, choiceApart, distractors), verbatim but for the
// names and the comment lines.
const REF = `function pooledConf0(t, n) {
  return confScore(PCONF[t < n ? t + '|' + n : n + '|' + t], confPrior(t, n, isLook(t, n)));
}
function confOf0(t, n) {
  return confScore(pairConf(P, t, n), pooledConf0(t, n));
}
const confusable0 = (t, n) => confOf0(t, n) >= CONF.TRAP;
const choiceApart0 = (L, taken = []) => {
  const seen = new Set(taken.map(choiceKey));
  return L.filter(n => !seen.has(choiceKey(n)) && seen.add(choiceKey(n)));
};
function distractors0(t, list, traps = trapsFor(t), known = introducedFn(), wide = true) {
  const rk = rankKind(t),
    tk = choiceKeys(t);
  list = list.filter(n => rankKind(n) === rk);
  if (rk && wide) list = [...new Set([...list, ...rankUnits(rk)])];
  list = list.filter(n => n === t || !tk.has(choiceKey(n)));
  const ranked = list
    .filter(n => n !== t)
    .map(n => [n, confOf0(t, n) * (0.8 + 0.4 * Math.random())])
    .sort((a, b) => b[1] - a[1])
    .map(x => x[0]);
  const mine = ranked.filter(n => known(n) && confusable0(t, n)),
    pooled = list
      .filter(n => n !== t && known(n) && !mine.includes(n) && pooledConf0(t, n) >= CONF.TRAP)
      .sort((a, b) => pooledConf0(t, b) - pooledConf0(t, a)),
    look = choiceApart0([...mine, ...pooled]),
    out = look.slice(0, traps),
    left = list.filter(n => n !== t && !look.includes(n));
  if (traps >= 2)
    return choiceApart0([
      ...out,
      ...ranked.filter(n => known(n) && !look.includes(n)),
      ...look.slice(traps),
      ...ranked.filter(n => !known(n))
    ]).slice(0, 3);
  const T = GX(t);
  const tf = imrFormsOf(t),
    apart = n => !imrFormsOf(n).some(f => tf.includes(f));
  const easy = left.filter(apart),
    far = easy.filter(n => GX(n).ig !== T.ig);
  const rank = L => [
    ...shuffle(L.filter(n => far.includes(n))),
    ...shuffle(L.filter(n => easy.includes(n) && !far.includes(n))),
    ...shuffle(L.filter(n => !easy.includes(n)))
  ];
  const met = rank(left.filter(known)),
    other = rank(left.filter(n => !known(n))),
    used = new Set(out.flatMap(imrFormsOf)),
    res = [...out];
  const add = (L, spread) =>
    L.forEach(n => {
      if (res.length >= 3 || !choiceApart0([n], res).length || (spread && imrFormsOf(n).some(f => used.has(f)))) return;
      res.push(n);
      imrFormsOf(n).forEach(f => used.add(f));
    });
  add(met, true);
  add(met, false);
  add(look.filter(known), false);
  add(other, true);
  add(other, false);
  return res.slice(0, 3);
}`;

const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const pickOf = (r, L) => L[Math.floor(r() * L.length)];
const FORMS = ['b', 'm', 'e', 'c', 'f'];
// A word for i in letters only (a label is compared by its letters: model.js labelKey).
const W = i => 'abcdefghijklmnopqrstuvwxyz'[i % 26] + 'x'.repeat(Math.floor(i / 26));

// Made-up units: 12 families (look-alikes declared and from the data, a family's group, growth forms, an IMR group ig),
// 16 species by their common names (each name a getter on the IMR answer, as app.js treeGenera's; two share a main name;
// listed names: also), 8 genera. CLASS: each unit's class (app.js kindRank).
function unitsOf(r, box) {
  const U = {},
    CLASS = {},
    fams = Array.from({length: 12}, (_, i) => 'F' + i);
  const forms = () => FORMS.filter(() => r() < 0.35);
  fams.forEach((n, i) => {
    U[n] = {
      name: 'Family ' + W(i),
      look: fams.filter(x => x !== n && r() < 0.12),
      dl: r() < 0.3 ? [pickOf(r, fams)] : undefined,
      fam: 'grp' + Math.floor(r() * 4),
      forms: forms(),
      ig: Math.floor(r() * 3)
    };
    CLASS[n] = '';
  });
  for (let i = 0; i < 16; i++) {
    const n = 's:' + i,
      main = 'Common fish ' + W(i === 7 ? 3 : i),
      imr = i % 3 ? main : 'IMR fish ' + W(i);
    U[n] = {
      get name() {
        return box.imr ? imr : main;
      },
      look: [],
      fam: 'sp',
      forms: forms(),
      ig: 0,
      also: i % 5 ? [] : ['Other name ' + W(i)]
    };
    CLASS[n] = 'species:cn';
  }
  for (let i = 0; i < 8; i++) {
    U['g:' + i] = {name: 'Genus ' + W(i), look: i % 2 ? ['g:' + ((i + 1) % 8)] : [], fam: 'gen', forms: forms(), ig: i % 2};
    CLASS['g:' + i] = 'genus';
  }
  return {U, CLASS};
}

// The page: app.js's versions and views, kindRank as app.js makes it (a data view per unit), model.js's code and the
// reference. check: VIEW_CHECK on. mutate: a change to app.js's block.
function page(seed, check, mutate = s => s, kinds = ['cn', 'sci']) {
  const r = rng(seed),
    box = {imr: false, reads: 0},
    {U, CLASS} = unitsOf(r, box),
    later = [];
  let s = 7;
  const M = Object.create(Math);
  M.random = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  assert.ok(APP_CODE.includes(BUMP), 'app.js stateBump as the mutation expects it');
  const stubs = {
    Math: M,
    window: {VIEW_CHECK_ON: check},
    localStorage: memStorage(),
    setTimeout: f => later.push(f),
    SUBJECTS: C.SUBJECTS,
    subjKey: C.subjKey,
    startKey: C.startKey,
    keyGet: C.keyGet,
    keyRename: C.keyRename,
    SUBJ: {id: 'fish', names: kinds},
    CONF: C.CONF,
    confScore: C.confScore,
    pairConf: C.pairConf,
    P: {},
    PCONF: {},
    GX: n => U[n],
    CLASS,
    imrFormsOf: n => U[n].forms,
    imrNow: () => (box.reads++, box.imr),
    rankOf: n => CLASS[n].split(':')[0],
    rankUnits: rk => Object.keys(CLASS).filter(n => CLASS[n] === rk),
    trapsFor: () => 1,
    introducedFn: () => () => true,
    shuffle: a => {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(M.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    }
  };
  const ctx = vm.createContext({...stubs}),
    names = Object.keys(stubs),
    make = vm.runInContext(
      `(function (${names.join(', ')}) {\n${mutate(APP_CODE)}\nconst kindRank = dataViewBy('kindRank', n => CLASS[n]);\n${MODEL_CODE}\n${REF}\n` +
        `const set = (k, v) => (k === 'PCONF' ? (PCONF = v) : null);\n` +
        `return {pooledConf, pooledConf0, pooledConfFn, confOf, confOf0, confusable, confusable0, choiceKey, choiceKeyFn, choiceApart, choiceApart0, rankKind, rankKindFn, kindRank, distractors, distractors0, stateBump, set, P, ver: () => STATE_V, dver: () => DATA_V};\n})`,
      ctx
    );
  const T = make(...names.map(k => stubs[k]));
  return {T, U, CLASS, box, later, seed: v => (s = v), rnd: () => s};
}

// The writers between reads.
function write(pg, r) {
  const {T, U, CLASS, box} = pg,
    units = Object.keys(U),
    x = r();
  if (x < 0.3) {
    const a = pickOf(r, units),
      b = pickOf(r, units),
      st = (T.P[a] = T.P[a] || {});
    st.conf = {...(st.conf || {}), [b]: Math.floor(r() * 4)};
    st.off = {...(st.off || {}), [b]: 4 + Math.floor(r() * 4)};
    T.stateBump('rec');
    return 'record';
  }
  if (x < 0.4) {
    box.imr = !box.imr;
    T.stateBump('rec'); // the first-launch record: the player's own
    return 'imr';
  }
  if (x < 0.55) {
    const pc = {};
    units.forEach(a => units.forEach(b => a < b && r() < 0.15 && (pc[a + '|' + b] = [Math.floor(r() * 30), Math.floor(r() * 15)])));
    T.set('PCONF', pc);
    T.stateBump(); // the statistics joined (model.js statsJoin)
    return 'stats';
  }
  if (x < 0.65) {
    const n = pickOf(r, units),
      g = U[n];
    const y = r();
    if (y < 0.3) g.look = units.filter(m => m !== n && CLASS[m] === CLASS[n] && r() < 0.15);
    else if (y < 0.5) g.fam = 'grp' + Math.floor(r() * 4);
    else if (y < 0.7) g.forms = FORMS.filter(() => r() < 0.35);
    else if (y < 0.85) g.dl = [pickOf(r, units)];
    else if (!n.startsWith('s:')) g.name = 'Renamed ' + W(Math.floor(r() * 5));
    T.stateBump(); // a data build
    return 'data';
  }
  return 'none';
}

// The reads, each against the reference: every pair's pooled score, confusion and label once a few writes, through the
// views and through one read for a loop; then wrong choices for a few targets from the same random numbers.
function reads(pg, r, label, st) {
  const {T, U} = pg,
    units = Object.keys(U);
  const pc = T.pooledConfFn(),
    ck = T.choiceKeyFn(),
    kr = T.rankKindFn();
  for (const a of units) {
    assert.strictEqual(kr(a), T.rankKind(a), `${label}: class of ${a}`);
    assert.strictEqual(ck(a), T.choiceKey(a), `${label}: label of ${a}`);
    for (const b of units) {
      if (a === b || r() > 0.25) continue;
      const want = T.pooledConf0(a, b);
      assert.strictEqual(T.pooledConf(a, b), want, `${label}: pooledConf ${a} ${b}`);
      assert.strictEqual(pc(a, b), want, `${label}: pooledConfFn ${a} ${b}`);
      assert.strictEqual(T.confOf(a, b, pc), T.confOf0(a, b), `${label}: confOf ${a} ${b}`);
      assert.strictEqual(T.confusable(a, b), T.confusable0(a, b), `${label}: confusable ${a} ${b}`);
      st.pairs++;
      if (want >= C.CONF.TRAP) st.traps++;
    }
  }
  for (let j = 0; j < 4; j++) {
    const t = pickOf(r, units),
      list = units.filter(() => r() < 0.6),
      traps = Math.floor(r() * 4),
      met = new Set(units.filter(() => r() < 0.5)),
      known = n => met.has(n),
      wide = r() < 0.7,
      s0 = 1 + Math.floor(r() * 2147483645);
    pg.seed(s0);
    const want = T.distractors0(t, list, traps, known, wide),
      s1 = pg.rnd();
    pg.seed(s0);
    const got = T.distractors(t, list, traps, known, wide);
    assert.deepStrictEqual(got, want, `${label}: distractors ${t} traps ${traps}`);
    assert.strictEqual(pg.rnd(), s1, `${label}: distractors ${t}: the same random numbers`);
    st.choices += got.length;
  }
  const L = units.filter(() => r() < 0.5);
  assert.deepStrictEqual(T.choiceApart(L, units.slice(0, 3), ck), T.choiceApart0(L, units.slice(0, 3)), `${label}: choiceApart`);
}

test('the pooled confusion, the labels, the classes and the wrong choices through the views are the code before, VIEW_CHECK off and on', t => {
  for (const check of [false, true])
    for (const seed of [1, 2, 3]) {
      const pg = page(seed, check),
        r = rng(seed * 17 + (check ? 5 : 0)),
        st = {pairs: 0, traps: 0, choices: 0, ops: {}};
      for (let i = 0; i < 60; i++) {
        const op = write(pg, r);
        st.ops[op] = (st.ops[op] || 0) + 1;
        reads(pg, r, `seed ${seed} step ${i} after ${op}${check ? ', VIEW_CHECK' : ''}`, st);
      }
      assert.deepStrictEqual(pg.later, [], 'no VIEW_CHECK difference thrown later');
      t.diagnostic(
        `seed ${seed}${check ? ' VIEW_CHECK' : ''}: ${st.pairs} pairs (${st.traps} traps), ${st.choices} wrong choices, writes ${JSON.stringify(st.ops)}`
      );
      assert.ok(st.ops.imr > 2 && st.ops.data > 2 && st.ops.stats > 2, 'every writer ran');
      assert.ok(st.traps > 0, 'traps compared');
    }
});

test('the labels follow the IMR answer: one key per answer, each computed under its own', () => {
  const pg = page(4, true),
    {T, box} = pg;
  const a = T.choiceKeyFn()('s:0');
  box.imr = true;
  T.stateBump('rec');
  const b = T.choiceKeyFn()('s:0');
  assert.notStrictEqual(a, b, 'the IMR name');
  assert.strictEqual(b, T.choiceKey('s:0'));
  box.imr = false;
  T.stateBump('rec');
  assert.strictEqual(T.choiceKeyFn()('s:0'), a, 'back to the main name, kept under its own key');
  assert.strictEqual(T.dver(), 0, 'the player’s bumps only: the data version did not move');
  assert.deepStrictEqual(pg.later, []);
});

test('a subject that names no species by its common name reads no IMR answer; its labels are choiceKey’s', () => {
  for (const check of [false, true]) {
    const pg = page(8, check, s => s, ['sci']),
      {T, U, box} = pg;
    box.reads = 0;
    const ck = T.choiceKeyFn();
    assert.strictEqual(box.reads, 0, 'choiceKeyFn read no IMR answer');
    for (const n of Object.keys(U)) assert.strictEqual(ck(n), T.choiceKey(n), n);
    assert.deepStrictEqual(pg.later, []);
    // the fish's names: one read
    const pf = page(8, check);
    pf.box.reads = 0;
    pf.T.choiceKeyFn();
    assert.strictEqual(pf.box.reads, 1, 'one read of the IMR answer for the loop');
  }
});

test('keyView fn: one read of the version for a loop, the same values as the view; a newer version reads the view', () => {
  const pg = page(5, false),
    {T, U, CLASS} = pg;
  const f = T.rankKindFn();
  assert.strictEqual(f('F0'), T.kindRank('F0'));
  assert.strictEqual(f('s:1'), 'species:cn');
  CLASS['F0'] = 'moved';
  T.stateBump();
  assert.strictEqual(T.rankKindFn()('F0'), 'moved', 'a new read after a data bump sees the change');
  assert.strictEqual(f('F0'), 'moved', 'an older read, once a newer version was read, goes through the view');
  void U;
});

// The mutations: a data change bumped as the player's own. VIEW_CHECK throws for its view; with it off, the value kept
// differs from the reference.
test('mutations: a unit’s record, forms, name or class changed under the player’s bump alone is caught', () => {
  // F1 and F2 set apart first (no look-alike, families and forms apart: the base prior), with a data bump.
  const apart = pg => {
    Object.assign(pg.U.F1, {look: [], dl: undefined, fam: 'a', forms: ['x']});
    Object.assign(pg.U.F2, {look: [], dl: undefined, fam: 'b', forms: ['y']});
    for (const n of Object.keys(pg.U)) pg.U[n].look = (pg.U[n].look || []).filter(m => m !== 'F1' && m !== 'F2');
    pg.T.stateBump();
  };
  const cases = [
    ['a declared look-alike', pg => (pg.U.F1.look = ['F2']), /data view confUnit/, ['pc', 'F1', 'F2']],
    ['a growth form', pg => (pg.U.F2.forms = ['x']), /data view imrForms/, ['pc', 'F1', 'F2']],
    ['a name', pg => (pg.U['g:2'].name = 'Genus ' + W(3)), /data view choiceKey/, ['ck', 'g:2']],
    ['a class', pg => (pg.CLASS['g:4'] = 'other'), /data view kindRank/, ['kr', 'g:4']]
  ];
  for (const [what, change, view, [kind, a, b]] of cases)
    for (const check of [false, true]) {
      const pg = page(6, check),
        {T} = pg;
      apart(pg);
      // the values kept for this data version
      if (kind === 'pc') assert.strictEqual(T.pooledConfFn()(a, b), C.confScore(undefined, C.CONF.BASE), 'set apart: the base prior');
      T.choiceKeyFn()(a);
      T.rankKindFn()(a);
      change(pg);
      T.stateBump('rec');
      const now = () =>
        kind === 'pc'
          ? [T.pooledConfFn()(a, b), T.pooledConf0(a, b)]
          : kind === 'ck'
            ? [T.choiceKeyFn()(a), T.choiceKey(a)]
            : [T.rankKindFn()(a), pg.CLASS[a]];
      if (check) assert.throws(now, view, what);
      else {
        const [got, want] = now();
        assert.notStrictEqual(got, want, `${what}: the value kept, the reference reads the change`);
      }
      pg.later.length = 0;
      T.stateBump(); // its own bump: made again, the reference's value
      if (!check) {
        const [got, want] = now();
        assert.strictEqual(got, want, `${what}: made again by a data bump`);
      }
    }
});
