require('./slot.js').testGuard();
// Photos › Tree, one page for every subject (docs/reviews/2026-11-19-admin-one-engine.md §5 step 4, Dup-1): admin.js
// renderTree draws any subject's tree, and the one difference between subjects, how its trees and node pages are built,
// is its builder in TREE_BUILD, picked by the data shape the subject declares (SUBJECTS flat, rule S1), never by its rank or
// its name. These tests run the `// tree build: begin` / `end` block of admin.js on stubs: every subject gets a builder,
// both builders answer the same questions, a subject is never sent to a builder by its rank (a tree subject whose units
// are genera, as a benthos subject would be, gets the tree builder), and the page itself names no subject.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  {SUBJECTS} = require('../core.js'),
  ADMIN = src('admin.js');

// The block on stubs: the trees each builder reads (the corals' ctTree, the tree subjects' FISHC and fuTreeOf/fuWormsOf).
const glue = (ctx = {}) => {
  const c = vm.createContext({
    TREE: 'photos/tree/key',
    TREE_W: 'photos/tree/worms',
    ASUBJ: null,
    FISHC: null,
    ctTree: v => ({coral: v}),
    fuTreeOf: U => ({key: U}),
    fuWormsOf: U => ({worms: U}),
    fishLoad: () => Promise.resolve('read'),
    ...ctx
  });
  vm.runInContext(
    block(ADMIN, '// tree build: begin', '// tree build: end', {file: 'admin.js'}) +
      '\nthis.TREE_BUILD = TREE_BUILD; this.treeShape = treeShape; this.treeBuild = treeBuild; this.tvTree = tvTree;',
    c
  );
  return c;
};

test('every subject gets a builder by the data shape it declares, never by its rank', () => {
  const c = glue();
  assert.deepStrictEqual(Object.keys(c.TREE_BUILD).sort(), ['flat', 'tree']);
  SUBJECTS.forEach(S => assert.strictEqual(c.treeBuild(S), c.TREE_BUILD[S.flat ? 'flat' : 'tree'], S.id));
  assert.ok(
    SUBJECTS.some(S => S.flat) && SUBJECTS.some(S => !S.flat),
    'a flat subject (the corals) and tree subjects (the fish, the sea slugs)'
  );
  // a tree subject whose units are genera (rank genus, as the corals' are) is a tree subject all the same; a flat subject
  // with families would be a flat one: the rank decides nothing (the study's three proxies, §1 "Short answer")
  assert.strictEqual(c.treeShape({id: 'benthos', rank: 'genus', unitRank: 'genus', sheets: {genus: 'g:'}}), 'tree');
  assert.strictEqual(c.treeShape({id: 'x', rank: 'family', flat: true}), 'flat');
  assert.strictEqual(c.treeShape(null), 'tree');
});

test('both builders answer the same questions', () => {
  const c = glue(),
    {flat, tree} = c.TREE_BUILD,
    members = B => Object.keys(B).sort();
  assert.deepStrictEqual(members(flat), members(tree));
  assert.deepStrictEqual(members(flat), ['help', 'load', 'open', 'ready', 'tree']);
  for (const B of [flat, tree]) {
    ['load', 'open', 'ready', 'tree'].forEach(k => assert.strictEqual(typeof B[k], 'function', k));
    // its help is a page of the admin's help
    assert.match(ADMIN, new RegExp(`\\n  ${B.help}: \``), B.help);
  }
  assert.notStrictEqual(flat.help, tree.help, 'each its own help: the corals have no species, cover rule or circles');
});

test("a view's tree comes from the subject on screen's builder; a tree subject's waits for its files", async () => {
  const flatS = SUBJECTS.find(S => S.flat),
    treeS = SUBJECTS.find(S => !S.flat),
    c = glue({ASUBJ: flatS});
  assert.deepStrictEqual({...c.tvTree(c.TREE)}, {coral: c.TREE});
  assert.deepStrictEqual({...c.tvTree(c.TREE_W)}, {coral: c.TREE_W});
  assert.strictEqual(c.TREE_BUILD.flat.ready(), true);
  c.ASUBJ = treeS;
  assert.strictEqual(c.tvTree(c.TREE), null, 'no files read yet');
  assert.strictEqual(c.TREE_BUILD.tree.ready(), false);
  assert.strictEqual(await c.TREE_BUILD.tree.load(), 'read');
  c.FISHC = {plays: [], units: []};
  assert.strictEqual(c.tvTree(c.TREE), null, 'no unit: no tree');
  assert.strictEqual(c.TREE_BUILD.tree.ready(), true);
  const U = [{id: 'f:A'}];
  c.FISHC = {plays: [], units: U};
  assert.strictEqual(c.tvTree(c.TREE).key, U);
  assert.strictEqual(c.tvTree(c.TREE_W).worms, U);
});

test('the Tree page names no subject: one renderTree, its subject differences only in the builders', () => {
  const page = block(ADMIN, '\nfunction renderTree(', '\n}\n', {through: 1, file: 'admin.js'}),
    code = page
      .split('\n')
      .filter(l => !/^\s*\/\//.test(l))
      .join('\n');
  // no subject, no proxy of one (rank, sheets, curation part, the fish's state), no builder's own function (fuHref is any
  // subject's Key address)
  assert.doesNotMatch(code, /\.rank\s*===\s*'|\.sheets\b|\.admin\.cur\b|\bFISHS\b|\bFISHC\b|\bDATA\b|\.flat\b/);
  assert.doesNotMatch(code, /\b(?:fu(?!Href\b)|ct)[A-Z]\w*\(|coralLive|fishLoad/);
  SUBJECTS.forEach(S => assert.doesNotMatch(code, new RegExp(`'${S.id}'`), S.id));
  // the dispatch, the help key and the shared photo lists ask the builder, not the subject's rank
  assert.match(ADMIN, /if \(treeOf\(cur\)\) return renderTree\(ASUBJ, /);
  assert.match(ADMIN, /treeOf\(cur\) \? treeBuild\(ASUBJ\)\.help : 'genus'/);
  assert.match(src('admin-nodephotos.js'), /NODE_PHOTOS\[treeShape\(ASUBJ\)\]/);
  assert.doesNotMatch(ADMIN + src('admin-coraltree.js'), /function render(?:FishUnits|CoralTree)\b/);
});
