require('./slot.js').testGuard();
// The admin's one registry (docs/reviews/2026-11-19-admin-one-engine.md §4, step 3): admin.js reg(S) gives every
// subject's units and photos in one shape, reports.js repReg's. A tree subject's is the very object its files were read
// into (unitAdmin, UNITA); a flat subject's (SUBJECTS flat: the corals' data.json) is built in memory by reports.js
// flatReg, kept per draft state (MEMO), no file of its own. These tests run flatReg on the real data.json, and the
// `// reg: begin` / `end` block of admin.js on stubs, and check that the pages that read the registry now see what they
// read before from data.json (DATA.gen and the bonus genera, the slate), so no page changes.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  C = require('../core.js'),
  {repReg, flatReg} = require('../reports.js'),
  {heatLab, heatUp} = require('../admin-heatmap.js');

// data.json as the admin holds it: its x genera laid into gen at load (admin.js: Object.assign(DATA.gen, DATA.x.gen)).
const adminData = () => {
  const D = json('data.json');
  if (D.x) Object.assign(D.gen, D.x.gen);
  return D;
};
// A genus's photos as a page shows them: here its data.json views, each photo once (admin.js photos applies the draft).
const viewsOf = D => n =>
  Object.values(D.gen[n].views || {})
    .flat()
    .filter(p => p && p.f);

test('flatReg: the corals as a registry in repReg shape, built from data.json in memory', () => {
  const D = adminData(),
    slate = C.slateOf(D),
    R = flatReg(D, viewsOf(D), slate),
    names = Object.keys(D.gen);
  assert.ok(names.length > 40, 'the slate genera and the x genera');
  // every genus a unit, its record data.json's, with its id and name
  names.forEach(n => {
    const g = R.gen[n];
    assert.ok(g, n);
    assert.strictEqual(g.id, n);
    assert.strictEqual(g.name, n);
    assert.deepStrictEqual(g.look, D.gen[n].look, `${n}: its look-alikes`);
    assert.strictEqual(g.fam, D.gen[n].fam, `${n}: its family`);
  });
  assert.deepStrictEqual(Object.keys(R.gen), names);
  // each photo under its genus
  names.forEach(n => viewsOf(D)(n).forEach(p => assert.strictEqual(R.ph[p.f].entry, n, p.f)));
  assert.ok(Object.keys(R.ph).length > 500, 'the photos');
  // the slate as the app counts it, the bonus genera apart, nothing above or below the genera
  assert.deepStrictEqual(R.slate, slate);
  assert.ok(R.slate.includes('Millepora'));
  assert.deepStrictEqual(Object.keys(R.extra).sort(), Object.keys(D.x.gen).sort());
  ['fam', 'spid', 'spg', 'imr', 'spu'].forEach(k => assert.deepStrictEqual(Object.keys(R[k]), [], k));
  assert.deepStrictEqual(R.groups, []);
  // the shape every page reads: every member of a tree subject's registry is there
  const S = C.SUBJECTS.find(x => x.admin.files),
    W = S.admin.files,
    T = repReg(json(W.f), W.ph ? json(W.ph) : null, json(W.gm), C.unitRankOf(S));
  ['gen', 'ph', 'slate', 'fam', 'spid', 'spg', 'imr', 'groups', 'spu'].forEach(k => {
    assert.ok(k in T, `repReg ${k}`);
    assert.ok(k in R, `flatReg ${k}`);
    assert.strictEqual(Array.isArray(R[k]), Array.isArray(T[k]), k);
  });
  // a genus page's photos only: no photosOf, no photo; no data, no registry
  assert.deepStrictEqual(flatReg(D, null, slate).ph, {});
  assert.strictEqual(flatReg(null), null);
  assert.strictEqual(flatReg({}), null);
});

test('the corals through the registry read as before: names, look-alikes, a pair start, the slate', () => {
  const D = adminData(),
    R = flatReg(D, viewsOf(D), C.slateOf(D)),
    // the old reads: admin-analyses.js anGen (DATA.gen), Pairs' and the Heatmap's gx, the Heatmap's coral label (n),
    // the Journey's IMR name (none for a coral genus) and the Heatmap's roster (slateOf(DATA))
    gx = n => D.gen[n] || ((D.x || {}).gen || {})[n] || {look: []};
  [...Object.keys(D.gen), 'Nonexistent'].forEach(n => {
    assert.strictEqual(heatLab(R, n), n, `${n}: named as before`);
    assert.strictEqual(R.imr[n], undefined, `${n}: no IMR name`);
    assert.strictEqual(heatUp(R, n), undefined, `${n}: nothing above it`);
  });
  Object.keys(D.gen).forEach(n => {
    assert.deepStrictEqual((R.gen[n] || {}).look, gx(n).look, n);
    assert.strictEqual((R.gen[n] || {}).fam, gx(n).fam, n);
  });
  assert.deepStrictEqual(
    R.slate.filter(() => true),
    C.slateOf(D)
  );
});

// The block of admin.js run on stubs: which registry each subject gets, how often a flat one is built, the pair records.
const glue = (ctx = {}) => {
  const c = vm.createContext({
    DATA: null,
    MEMO: {},
    UNITA: {},
    flatReg: (...a) => (c.built++, flatReg(...a)),
    built: 0,
    photos: () => [],
    slateOf: C.slateOf,
    unitRegOf: S => (S && c.UNITA[S.id]) || null,
    unitAdmin: S => ((c.asked = S), Promise.resolve()),
    fishUnitRec: (R, n, gp) => ({look: ['tree'], R, n, gp}),
    ...ctx
  });
  vm.runInContext(
    block(src('admin.js'), '// reg: begin', '// reg: end', {file: 'admin.js'}) +
      '\nthis.reg = reg; this.regLoad = regLoad; this.regRec = regRec;',
    c
  );
  return c;
};

test('reg: one door, the subject declaring its data shape (SUBJECTS flat); a tree subject gets its read object', async () => {
  const flat = C.SUBJECTS.filter(S => S.flat),
    tree = C.SUBJECTS.filter(S => !S.flat);
  assert.ok(flat.length === 1 && tree.length >= 2, 'the corals flat, the fish and the sea slugs not');
  // every subject reads one way or the other: a flat subject has no files to read, any other names its tree file
  flat.forEach(S => assert.ok(!S.admin.files, S.id));
  tree.forEach(S => assert.ok(S.admin.files && S.admin.files.f, S.id));
  const c = glue(),
    F = flat[0],
    T = tree[0];
  assert.strictEqual(c.reg(null), null);
  // a flat subject: none before its data, then built once per draft state, again after a draft change
  assert.strictEqual(c.reg(F), null);
  c.DATA = adminData();
  const R = c.reg(F);
  assert.ok(R && R.gen.Acropora && c.built === 1);
  assert.strictEqual(c.reg(F), R, 'kept while the draft stays');
  c.MEMO = {};
  assert.notStrictEqual(c.reg(F), R, 'built again after a draft change (render clears MEMO)');
  assert.strictEqual(c.built, 2);
  await c.regLoad(F);
  assert.strictEqual(c.asked, undefined, 'nothing to read for a flat subject');
  // a tree subject: none until its files are read, then the very object its files went into
  assert.strictEqual(c.reg(T), null);
  await c.regLoad(T);
  assert.strictEqual(c.asked, T);
  const TR = {gen: {}};
  c.UNITA[T.id] = TR;
  assert.strictEqual(c.reg(T), TR);
  // a pair's record: a flat subject's genus, then its extra (bonus) genera, else none; another subject's as its game
  // builds its units, with its genus prefix
  const D = c.DATA,
    gx = n => D.gen[n] || ((D.x || {}).gen || {})[n] || {look: []};
  [...Object.keys(D.gen), 'Millepora', 'Isopora', 'Nonexistent'].forEach(n => {
    // (the none record is made in the block's own realm: compared as JSON)
    assert.strictEqual(JSON.stringify(c.regRec(F, n).look), JSON.stringify(gx(n).look), n);
    assert.strictEqual(c.regRec(F, n).fam, gx(n).fam, n);
  });
  const r = c.regRec(T, 'g:Chromis');
  assert.deepStrictEqual([r.R, r.n, r.gp], [TR, 'g:Chromis', T.sheets.genus]);
  assert.strictEqual(c.regRec(T, 'x', null).R, null, 'unread: the tree record of none');
});

test('the pages that fork on the registry read it through reg, never DATA.gen or the tree in force', () => {
  const read = {
    'admin-analyses.js': /\bFISHA\b|\bDATA\.gen\b/,
    'admin-heatmap.js': /\bDATA\.gen\b|\bunitAdmin\(|\bfishUnitRec\(/,
    'admin-taxa.js': /\bDATA\.gen\b|\.sheets\b/
  };
  Object.entries(read).forEach(([f, re]) => {
    const code = src(f)
      .split('\n')
      .filter(l => !/^\s*(\/\/|\/?\*)/.test(l))
      .join('\n');
    assert.doesNotMatch(code, re, f);
    assert.match(code, /\breg\(/, `${f} reads reg`);
  });
});
