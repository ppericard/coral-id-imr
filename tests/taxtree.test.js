// The generic classification tree (taxtree.js; Pierre, 2026-11-13, Q340: any depth, any ranks, for any subject): the
// builder, its roll-ups, the filter, the rows on screen and the WAI-ARIA tree keys, on made-up classifications of
// several shapes (never assuming a level count or rank names).
const test = require('node:test'),
  assert = require('node:assert');
const {ttBuild, ttPath, ttUnder, ttLeaves, ttRoll, ttFirst, ttNearest, ttShown, ttRows, ttKey} = require('../taxtree.js');

// A chain of 9 levels with ranks of any word, one missing (absent) and one empty, and a side branch.
const deep = () => {
  const R = ['domain', '', 'phylum', undefined, 'clade', 'superfamily', 'family', 'genus', 'species'],
    N = R.map((r, i) => ({id: 'n' + i, name: 'Node ' + i, ...(r === undefined ? {} : {rank: r}), ...(i ? {up: 'n' + (i - 1)} : {})}));
  N.push({id: 'x', name: 'Side leaf', up: 'n4'});
  return N;
};

test('taxtree: any depth, ranks of any word or none', () => {
  const T = ttBuild(deep());
  assert.deepStrictEqual(T.problems, []);
  assert.deepStrictEqual(T.roots, ['n0']);
  assert.deepStrictEqual(ttPath(T, 'n8'), ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']);
  assert.strictEqual(T.node.get('n3').rank, undefined);
  assert.strictEqual(T.node.get('n1').rank, '');
  assert.deepStrictEqual(ttLeaves(T, 'n0'), ['n8', 'x']);
  assert.deepStrictEqual(ttLeaves(T, 'n5'), ['n8']);
  assert.deepStrictEqual(ttLeaves(T, 'x'), ['x']);
  assert.deepStrictEqual(ttUnder(T, 'n6'), ['n6', 'n7', 'n8']);
  assert.deepStrictEqual(ttPath(T, 'nope'), []);
  // a roll-up over the leaves, at every level
  const c = ttRoll(T, () => 1);
  assert.strictEqual(c.n0, 2);
  assert.strictEqual(c.n4, 2);
  assert.strictEqual(c.n5, 1);
  assert.strictEqual(c.x, 1);
  assert.strictEqual(
    ttFirst(T, 'n0', n => n.rank === 'family'),
    'n6'
  );
  assert.strictEqual(
    ttFirst(T, 'n7', n => n.rank === 'family'),
    null
  );
});

test('taxtree: another shape (several roots, levels of unequal depth), siblings in the order given', () => {
  const T = ttBuild([
    {id: 'b', name: 'B'},
    {id: 'a', name: 'A'},
    {id: 'a2', up: 'a', name: 'A2'},
    {id: 'a1', up: 'a', name: 'A1'},
    {id: 'a1x', up: 'a1', name: 'A1x', rank: 'any word'}
  ]);
  assert.deepStrictEqual(T.roots, ['b', 'a']);
  assert.deepStrictEqual(T.kids.get('a'), ['a2', 'a1']);
  assert.deepStrictEqual(ttLeaves(T, 'a'), ['a2', 'a1x']);
  assert.deepStrictEqual(
    ttRoll(T, n => (n.id === 'a1x' ? 3 : 1)),
    {b: 1, a: 4, a2: 1, a1: 3, a1x: 3}
  );
});

test('taxtree: problems are reported, never fixed silently', () => {
  const T = ttBuild([
    {id: 'r', name: 'R'},
    {id: 'r', name: 'R again'},
    {id: 'o', name: 'Orphan', up: 'gone'},
    {id: 'c1', up: 'c2'},
    {id: 'c2', up: 'c1'},
    {id: 'c3', up: 'c1'},
    {name: 'no id'}
  ]);
  const why = Object.fromEntries(T.problems.map(p => [p.id, p.why]));
  assert.strictEqual(why.r, 'duplicate id');
  assert.strictEqual(T.node.get('r').name, 'R');
  assert.strictEqual(why.o, 'parent not found: gone');
  assert.ok(T.roots.includes('o'));
  // the cycle is cut once, where it is met; the rest stays in place, and a node hanging off it is not in it
  assert.strictEqual(why.c1, 'cycle');
  assert.strictEqual(why.c2, undefined);
  assert.deepStrictEqual(T.kids.get('c1'), ['c2', 'c3']);
  assert.strictEqual(why.c3, undefined);
  assert.ok(T.problems.some(p => p.why === 'no id'));
  // every node still reachable from a root: no node lost
  const all = new Set(T.roots.flatMap(x => ttUnder(T, x)));
  assert.deepStrictEqual([...all].sort(), ['c1', 'c2', 'c3', 'o', 'r']);
});

test('taxtree: the nearest node on the way up that a test accepts (a node page’s unit), at any depth', () => {
  const T = ttBuild(deep()),
    unit = n => n.rank === 'family';
  // itself, then its ancestors, the nearest first
  assert.strictEqual(ttNearest(T, 'n6', unit), 'n6');
  assert.strictEqual(ttNearest(T, 'n8', unit), 'n6');
  assert.strictEqual(
    ttNearest(T, 'n8', n => /^(clade|genus)$/.test(n.rank || '')),
    'n7'
  );
  // above every unit, on a side branch with none, or an id not in the tree: none
  assert.strictEqual(ttNearest(T, 'n4', unit), null);
  assert.strictEqual(ttNearest(T, 'x', unit), null);
  assert.strictEqual(ttNearest(T, 'gone', unit), null);
  // the root itself counts
  assert.strictEqual(
    ttNearest(T, 'x', n => n.id === 'n0'),
    'n0'
  );
});

test('taxtree: a filter shows what it accepts, with what leads to it and what is under it', () => {
  const T = ttBuild(deep());
  const s = ttShown(T, n => n.id === 'n5');
  assert.deepStrictEqual([...s].sort(), ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8']);
  assert.ok(!s.has('x'));
  assert.ok(ttShown(T, () => false, ['x']).has('n4'));
  assert.strictEqual(ttShown(T, () => false).size, 0);
});

test('taxtree: the rows on screen (aria-level, posinset, setsize, expanded) follow what is open and shown', () => {
  const T = ttBuild([{id: 'g1'}, {id: 'f1', up: 'g1'}, {id: 'f2', up: 'g1'}, {id: 's1', up: 'f1'}, {id: 'g2'}]);
  assert.deepStrictEqual(
    ttRows(T, new Set(), null).map(r => [r.id, r.level, r.kids, r.open, r.pos, r.size]),
    [
      ['g1', 1, 2, false, 1, 2],
      ['g2', 1, 0, false, 2, 2]
    ]
  );
  assert.deepStrictEqual(
    ttRows(T, new Set(['g1', 'f1']), null).map(r => r.id),
    ['g1', 'f1', 's1', 'f2', 'g2']
  );
  assert.deepStrictEqual(
    ttRows(T, new Set(['g1', 'f1']), new Set(['g1', 'f2'])).map(r => [r.id, r.pos, r.size]),
    [
      ['g1', 1, 1],
      ['f2', 1, 1]
    ]
  );
  // a node whose children are all filtered out is a leaf on screen
  assert.strictEqual(ttRows(T, new Set(['g1', 'f1']), new Set(['g1', 'f1'])).find(r => r.id === 'f1').kids, 0);
});

test('taxtree: the WAI-ARIA tree keys', () => {
  const T = ttBuild([{id: 'g1'}, {id: 'f1', up: 'g1'}, {id: 'f2', up: 'g1'}, {id: 's1', up: 'f1'}, {id: 'g2'}, {id: 'h', up: 'g2'}]);
  let open = new Set(['g1']);
  const rows = () => ttRows(T, open, null);
  assert.deepStrictEqual(ttKey(T, rows(), 'g1', 'ArrowDown'), {focus: 'f1'});
  assert.deepStrictEqual(ttKey(T, rows(), 'f1', 'ArrowUp'), {focus: 'g1'});
  assert.strictEqual(ttKey(T, rows(), 'g1', 'ArrowUp'), null);
  assert.strictEqual(ttKey(T, rows(), 'g2', 'ArrowDown'), null);
  assert.deepStrictEqual(ttKey(T, rows(), 'f1', 'ArrowRight'), {open: 'f1'});
  open.add('f1');
  assert.deepStrictEqual(ttKey(T, rows(), 'f1', 'ArrowRight'), {focus: 's1'});
  assert.strictEqual(ttKey(T, rows(), 's1', 'ArrowRight'), null);
  assert.deepStrictEqual(ttKey(T, rows(), 's1', 'ArrowLeft'), {focus: 'f1'});
  assert.deepStrictEqual(ttKey(T, rows(), 'f1', 'ArrowLeft'), {close: 'f1'});
  assert.strictEqual(ttKey(T, rows(), 'g2', 'ArrowLeft'), null);
  assert.deepStrictEqual(ttKey(T, rows(), 'f2', 'Home'), {focus: 'g1'});
  assert.deepStrictEqual(ttKey(T, rows(), 'g1', 'End'), {focus: 'g2'});
  assert.deepStrictEqual(ttKey(T, rows(), 'f2', 'Enter'), {select: 'f2'});
  assert.deepStrictEqual(ttKey(T, rows(), 'f2', ' '), {select: 'f2'});
  assert.deepStrictEqual(ttKey(T, rows(), 'g1', '*'), {openAll: ['g1', 'g2']});
  assert.strictEqual(ttKey(T, rows(), 'g1', 'a'), null);
  // a row no longer on screen: the focus goes to the first
  assert.deepStrictEqual(ttKey(T, rows(), 'gone', 'ArrowDown'), {focus: 'g1'});
});
