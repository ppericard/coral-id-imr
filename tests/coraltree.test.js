require('./slot.js').testGuard();
// Photos › Tree for the corals (admin-coraltree.js; docs/ROADMAP.md "The Tree tab", its last step; Pierre, 2026-11-13: it
// must work for "coraux, nudibranches ou plantes"): the corals' adapter of the generic tree (taxtree.js), on the real
// data.json and names.json (as the admin holds them: the x genera merged into gen) and on made-up data.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const {ctLeaves, ctKeyOf, ctWormsOf, ctFilters} = require('../admin-coraltree.js'),
  {ttBuild, ttLeaves, ttPath, ttPass, ttReach} = require('../taxtree.js'),
  {lectureGroup, slateOf} = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// data.json as the admin holds it (admin.js: Object.assign(DATA.gen, DATA.x.gen), d.x kept).
const adminData = () => {
  const d = read('data.json');
  Object.assign(d.gen, d.x.gen);
  return d;
};
const W = read('names.json').coral.worms;

test('Key: the IMR lecture groups, each genus once, a leaf, under the group the app shows it in', () => {
  const d = adminData(),
    T = ttBuild(ctKeyOf(d)),
    G = Object.keys(d.gen);
  assert.deepStrictEqual(T.problems, []);
  // every genus the admin has a page for is exactly one leaf, its id its name; nothing else is a leaf
  const leaves = T.roots.flatMap(r => ttLeaves(T, r));
  assert.deepStrictEqual([...leaves].sort(), [...G].sort());
  assert.strictEqual(new Set(leaves).size, leaves.length);
  // the roots: the lecture groups in their order, then the genera in no group
  assert.deepStrictEqual(T.roots, [...d.imrg.map(x => 'k:' + x.n), 'k:none']);
  d.imrg.forEach(x => {
    const n = T.node.get('k:' + x.n);
    assert.strictEqual(n.rank, 'group');
    assert.strictEqual(n.name, `${x.n} · ${x.t}`);
  });
  // each genus under its lecture group (core.js lectureGroup: a ★ genus with most of its look-alikes, rule L5)
  G.forEach(n => assert.strictEqual(T.up.get(n), lectureGroup(d, n) ? 'k:' + lectureGroup(d, n) : 'k:none', n));
  // the x genera (Millepora, the bonus and Coral Finder key genera) are in no lecture group
  Object.keys(d.x.gen).forEach(n => assert.strictEqual(T.up.get(n), 'k:none', n));
  // the ★ genera (on the slate, not numbered) sit with their look-alikes, after the numbered genera of their group
  ['Duncanopsammia', 'Alveopora', 'Merulina', 'Cyphastrea', 'Halomitra'].forEach(n => {
    const n0 = T.node.get(n),
      sib = T.kids.get(T.up.get(n));
    assert.ok(n0.star && !n0.num, n);
    assert.notStrictEqual(T.up.get(n), 'k:none', n);
    assert.ok(sib.indexOf(n) > Math.max(...sib.filter(x => d.gen[x].n).map(x => sib.indexOf(x))), n);
  });
  // in a group, the numbered genera by their number
  const g1 = T.kids.get('k:1');
  assert.deepStrictEqual(g1, ['Acropora', 'Pocillopora', 'Stylophora', 'Anacropora']);
  // no group, the slate's genus first (Millepora), then A-Z
  const none = T.kids.get('k:none');
  assert.strictEqual(none[0], 'Millepora');
  assert.deepStrictEqual(
    none.slice(1),
    [...none.slice(1)].sort((a, b) => a.localeCompare(b))
  );
  // the slate, as the games count it (core.js slateOf): ★ for the starred only
  const S = new Set(slateOf(d));
  G.forEach(n => assert.strictEqual(T.node.get(n).slate, S.has(n), n));
  assert.strictEqual(T.node.get('Millepora').star, false);
});

test('Key: never the Coral Finder key of data.json key (growth forms, rule C4), never a growth form', () => {
  const d = adminData(),
    N = ctKeyOf(d),
    ids = new Set(N.map(n => n.id)),
    boxes = [...d.key, ...d.x.groups].flatMap(k => [k.id, ...k.leaves.map(l => l.id)]),
    forms = [...d.key, ...d.x.groups].map(k => k.name);
  boxes.forEach(b => assert.ok(!ids.has(b), b));
  // (the IMR lecture's own group lines may share a word with them: group 5, "Meandering ridges / valleys")
  N.forEach(n => forms.forEach(f => assert.notStrictEqual(n.name, f, n.id)));
  N.filter(n => !n.genus).forEach(n => assert.match(n.id, /^k:(\d+|none)$/));
  // Montipora sits in five boxes of the Coral Finder key: here, one parent
  assert.strictEqual(N.filter(n => n.id === 'Montipora').length, 1);
});

test('WoRMS: each genus under the family WoRMS gives it (names.json), the same leaves as the Key', () => {
  const d = adminData(),
    {nodes, problems} = ctWormsOf(d, W),
    T = ttBuild(nodes),
    K = ttBuild(ctKeyOf(d));
  assert.deepStrictEqual(problems, []);
  assert.deepStrictEqual(T.problems, []);
  // the same leaves, in the Key's order
  const leaves = T.roots.flatMap(r => ttLeaves(T, r)),
    kl = K.roots.flatMap(r => ttLeaves(K, r));
  assert.deepStrictEqual([...leaves].sort(), [...kl].sort());
  // every root a family, wf:<name> (no family AphiaID in the extract: never w:)
  T.roots.forEach(r => {
    assert.match(r, /^wf:[A-Z][a-z]+dae$/);
    assert.strictEqual(T.node.get(r).rank, 'family');
    assert.strictEqual(T.node.get(r).name, r.slice(3));
  });
  Object.keys(d.gen).forEach(n => assert.deepStrictEqual(ttPath(T, n), ['wf:' + W[n].fam, n], n));
  // WoRMS's families, not the IMR lecture's words (data.json fam): never "corrected" in the app (rule C1)
  assert.strictEqual(T.up.get('Pachyseris'), 'wf:Pachyseridae');
  assert.strictEqual(d.gen.Pachyseris.fam, 'Agariciidae');
  assert.strictEqual(T.up.get('Plerogyra'), 'wf:Plerogyridae');
  assert.strictEqual(d.gen.Plerogyra.fam, 'Euphylliidae');
  assert.strictEqual(T.up.get('Diploastrea'), 'wf:Diploastraeidae');
  // Millepora, a hydrozoan, in its own family
  assert.strictEqual(T.up.get('Millepora'), 'wf:Milleporidae');
  // the families in the order the Key's leaves meet them
  assert.strictEqual(T.roots[0], 'wf:Acroporidae');
});

test('WoRMS: a genus the extract lacks is reported, never placed', () => {
  const d = adminData(),
    W2 = {...W};
  delete W2.Acropora;
  const {nodes, problems} = ctWormsOf(d, W2),
    T = ttBuild(nodes);
  assert.deepStrictEqual(problems, [{id: 'Acropora', why: 'no reference'}]);
  assert.ok(T.roots.includes('Acropora'));
  assert.deepStrictEqual(ctWormsOf(d, {}).problems.length, Object.keys(d.gen).length);
});

test('made-up data: a group with no genus is left out, a ★ genus follows its look-alikes, an x genus has no group', () => {
  const d = {
    imrg: [
      {n: 1, t: 'One'},
      {n: 2, t: 'Two'},
      {n: 3, t: 'Empty'}
    ],
    gen: {
      Bb: {n: 2, ig: 1, look: []},
      Aa: {n: 1, ig: 1, look: []},
      Cc: {n: 3, ig: 2, look: []},
      Star: {n: 0, ig: 0, look: ['Cc', 'Aa', 'Cc']},
      Xx: {n: 0, look: []}
    },
    x: {gen: {Xx: {}}}
  };
  const T = ttBuild(ctKeyOf(d));
  assert.deepStrictEqual(T.roots, ['k:1', 'k:2', 'k:none']);
  assert.deepStrictEqual(T.kids.get('k:1'), ['Aa', 'Bb']);
  assert.deepStrictEqual(T.kids.get('k:2'), ['Cc', 'Star']);
  assert.deepStrictEqual(T.kids.get('k:none'), ['Xx']);
  assert.strictEqual(T.node.get('k:none').rank, undefined);
  assert.strictEqual(T.node.get('Star').star, true);
  assert.strictEqual(T.node.get('Xx').star, false);
  assert.strictEqual(T.node.get('Xx').slate, false);
  assert.deepStrictEqual(
    ctLeaves(d).map(l => l.id),
    ['Aa', 'Bb', 'Cc', 'Star', 'Xx']
  );
});

test('filters: tags on the genera, read through the leaves, the same genera in both views; never a growth form', () => {
  const d = adminData(),
    K = ttBuild(ctKeyOf(d)),
    T = ttBuild(ctWormsOf(d, W).nodes),
    F = ctFilters(d, {
      pairs: [{k: 'Favites|Goniastrea', A: 'Favites', B: 'Goniastrea'}],
      needs: n => (n === 'Porites' ? ['Colony 1/3'] : []),
      waiting: n => (n === 'Acropora' ? 4 : 0),
      draft: ['Pavona']
    }),
    by = k => F.find(x => x.k === k);
  assert.deepStrictEqual(
    F.map(x => x.k),
    ['star', 'look', 'look:Favites|Goniastrea', 'work', 'cand', 'draft']
  );
  F.forEach(x => assert.ok(!/form|branch|massive|encrust/i.test(x.t), x.t));
  const pass = f => [...ttPass(K, [f.on])].sort();
  assert.deepStrictEqual(pass(by('star')), ['Alveopora', 'Cyphastrea', 'Duncanopsammia', 'Halomitra', 'Merulina']);
  assert.deepStrictEqual(pass(by('look')), ['Favites', 'Goniastrea']);
  assert.deepStrictEqual(pass(by('work')), ['Porites']);
  assert.deepStrictEqual(pass(by('cand')), ['Acropora']);
  assert.deepStrictEqual(pass(by('draft')), ['Pavona']);
  // a group passes nothing by itself: a tag is a genus's
  ['star', 'look', 'work', 'cand', 'draft'].forEach(k => assert.ok(!by(k).on(K.node.get('k:1')), k));
  // in WoRMS: the same genera, with their families
  const vis = ttReach(T, ttPass(K, [by('look').on]));
  assert.deepStrictEqual([...vis].sort(), ['Favites', 'Goniastrea', 'wf:Merulinidae']);
  // combined with All | IMR (the slate): Millepora is on the slate, Euphyllia is not
  const imr = n => !!n.slate;
  assert.ok(ttPass(K, [imr]).has('Millepora'));
  assert.ok(!ttPass(K, [imr]).has('Euphyllia'));
  // no pair: no look-alike option
  assert.deepStrictEqual(
    ctFilters(d, {}).map(x => x.k),
    ['star', 'work', 'cand', 'draft']
  );
});
