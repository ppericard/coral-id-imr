// The generic classification tree (taxtree.js; Pierre, 2026-11-13, Q340: any depth, any ranks, for any subject): the
// builder, its roll-ups, the filter, the rows on screen and the WAI-ARIA tree keys, on made-up classifications of
// several shapes (never assuming a level count or rank names).
const test = require('node:test'),
  assert = require('node:assert');
const {ttBuild, ttFromRef, ttPath, ttUnder, ttLeaves, ttRoll, ttFirst, ttNearest, ttShown, ttRows, ttKey} = require('../taxtree.js');

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

// A classification read from a reference table (ttFromRef: WoRMS's AphiaIDs for the fish, admin.js fuWormsOf), on a
// made-up table: its ranks as the table spells them, any depth, the leaves keeping their own ids.
const REF = {
  1: {name: 'Teleostei', rank: 'Class', parent: null},
  2: {name: 'Perciformes', rank: 'Order', parent: 1},
  3: {name: 'Percoidei', rank: 'Suborder', parent: 2},
  4: {name: 'Serranidae', rank: 'Family', parent: 3},
  5: {name: 'Anthiadinae', rank: 'Subfamily', parent: 4},
  6: {name: 'Pseudanthias', rank: 'Genus', parent: 5},
  7: {name: 'Pseudanthias squamipinnis', rank: 'Species', parent: 6},
  8: {name: 'Pseudanthias tuka', rank: 'Species', parent: 6},
  9: {name: 'Pomacentridae', rank: 'Family', parent: 1},
  10: {name: 'Chromis', rank: 'Genus', parent: 9},
  11: {name: 'Chromis viridis', rank: 'Species', parent: 10},
  12: {name: 'Unplaced', parent: 1}
};
const W = o => ({id: k => 'w:' + k, rank: r => r.toLowerCase(), ...o});

test('taxtree: a tree from a reference table, any depth, ranks as the table names them, leaves keep their ids', () => {
  const leaves = [
      {id: 's1', name: 'Sea goldie', ref: 7, rank: 'species'},
      {id: 's2', name: 'Chromis', ref: 11, rank: 'species'},
      // two leaves on one reference (a synonym the game keeps apart): both stay, under the same parent
      {id: 's3', name: 'Sea goldie (old name)', ref: '7', rank: 'species'},
      {id: 's4', name: 'Purple queen', ref: 8, rank: 'species', up: 'ignored'}
    ],
    {nodes, problems} = ttFromRef(leaves, REF, W());
  assert.deepStrictEqual(problems, []);
  const T = ttBuild(nodes);
  assert.deepStrictEqual(T.problems, []);
  assert.deepStrictEqual(T.roots, ['w:1']);
  // depth: 7 levels down to Pseudanthias's species, 4 to Chromis's
  assert.deepStrictEqual(ttPath(T, 's1'), ['w:1', 'w:2', 'w:3', 'w:4', 'w:5', 'w:6', 's1']);
  assert.deepStrictEqual(ttPath(T, 's2'), ['w:1', 'w:9', 'w:10', 's2']);
  // the ranks as the table spells them, through the adapter's map; a reference with no rank gets none
  assert.deepStrictEqual(
    ttPath(T, 's1').map(x => T.node.get(x).rank),
    ['class', 'order', 'suborder', 'family', 'subfamily', 'genus', 'species']
  );
  // each ancestor once, with its name and its reference key; a reference only above no leaf is not made
  assert.deepStrictEqual(T.node.get('w:6'), {id: 'w:6', name: 'Pseudanthias', ref: '6', rank: 'genus', up: 'w:5'});
  assert.ok(!T.node.has('w:12') && !T.node.has('w:7'));
  assert.strictEqual(nodes.filter(n => n.id === 'w:1').length, 1);
  // the leaves keep their own ids and fields; the leaf's own up is never read; siblings in the order the leaves meet them
  assert.deepStrictEqual(T.kids.get('w:6'), ['s1', 's3', 's4']);
  assert.deepStrictEqual(T.kids.get('w:1'), ['w:2', 'w:9']);
  assert.strictEqual(T.node.get('s3').name, 'Sea goldie (old name)');
  assert.deepStrictEqual(ttLeaves(T, 'w:1'), ['s1', 's3', 's4', 's2']);
  // the ids of the two namespaces never meet: only the leaves are ids of the subject's own
  assert.deepStrictEqual(
    [...T.node.keys()].filter(x => !x.startsWith('w:')),
    ['s1', 's2', 's3', 's4']
  );
  // a rank-less reference: no rank
  const T1 = ttBuild(ttFromRef([{id: 'z', ref: 11}], {...REF, 10: {name: 'Chromis', parent: 9}}, W()).nodes);
  assert.ok(!('rank' in T1.node.get('w:10')));
  // without a map, the reference keys are the ids and the ranks are kept as spelt
  const T2 = ttBuild(ttFromRef([{id: 's2', ref: 11}], REF).nodes);
  assert.deepStrictEqual(ttPath(T2, 's2'), ['1', '9', '10', 's2']);
  assert.strictEqual(T2.node.get('9').rank, 'Family');
});

test('taxtree: a reference table with gaps: missing parents and references reported, never fixed silently', () => {
  const ref = {
      ...REF,
      // a family whose parent the table does not have, and a genus under it
      20: {name: 'Lost family', rank: 'Family', parent: 99},
      21: {name: 'Lostgenus', rank: 'Genus', parent: 20},
      22: {name: 'Lostgenus one', rank: 'Species', parent: 21},
      // a species whose genus the table does not have
      23: {name: 'Orphan two', rank: 'Species', parent: 98},
      // a cycle in the table
      30: {name: 'Loop A', rank: 'Order', parent: 31},
      31: {name: 'Loop B', rank: 'Order', parent: 30},
      32: {name: 'Loopy one', rank: 'Species', parent: 30}
    },
    leaves = [{id: 'a', ref: 22}, {id: 'b', ref: 23}, {id: 'c', ref: 404}, {id: 'd'}, {id: 'e', ref: 32}, {id: 'f', ref: 11}],
    {nodes, problems} = ttFromRef(leaves, ref, W()),
    why = Object.fromEntries(problems.map(p => [p.id, p.why]));
  assert.strictEqual(why['w:20'], 'parent not found: 99');
  assert.strictEqual(why.b, 'parent not found: 98');
  assert.strictEqual(why.c, 'reference not found: 404');
  assert.strictEqual(why.d, 'no reference');
  assert.strictEqual(problems.length, 4);
  const T = ttBuild(nodes);
  // what lost its parent becomes a root, what is under it stays under it; every leaf is kept
  assert.ok(['w:20', 'b', 'c', 'd'].every(x => T.roots.includes(x)));
  assert.deepStrictEqual(ttPath(T, 'a'), ['w:20', 'w:21', 'a']);
  assert.deepStrictEqual(ttPath(T, 'f'), ['w:1', 'w:9', 'w:10', 'f']);
  // the cycle stops the walk (no hang); ttBuild reports it and cuts it, the leaf under it kept
  assert.deepStrictEqual(
    T.problems.map(p => p.why),
    ['cycle']
  );
  assert.strictEqual(ttPath(T, 'e').pop(), 'e');
  assert.ok(['a', 'b', 'c', 'd', 'e', 'f'].every(x => T.node.has(x)));
});
