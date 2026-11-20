require('./slot.js').testGuard();
// Memory (proto/pairs.js memoryGenera): the genera of a game come from those the player has met first, genera not met
// only to fill the grid. The function runs in Node on stubs, as tests/memory.test.js does.
const test = require('node:test');
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const LOOK = {A: ['B'], B: ['A', 'C'], C: ['B'], D: [], E: ['F'], F: ['E'], G: [], H: []};
function load() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'proto', 'pairs.js'), 'utf8'),
    ctx = {
      lookAlikes: n => LOOK[n] || [],
      shuffle: a => {
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
    };
  vm.createContext(ctx);
  vm.runInContext(
    'const labObs = p => p.o || p.f;\n' +
      block(src, 'function memoryGenera', 'const MEMORY') +
      '\nthis.f = memoryGenera; this.photos = memoryPhotos; this.kin = memoryKin; this.tree = memoryTree;',
    ctx
  );
  return ctx;
}
const SRC = fs.readFileSync(path.join(__dirname, '..', 'proto', 'pairs.js'), 'utf8');
const memoryGenera = () => load().f,
  memoryPhotos = () => load().photos;
const names = Object.keys(LOOK);

// One progression path for every game (rule L4): only genera unlocked, fewer than the grid holds when fewer
// are; genera not met never fill the grid.
test('only the genera unlocked; fewer than the grid when fewer are unlocked', () => {
  const f = memoryGenera();
  for (let k = 0; k < 50; k++) {
    const met = new Set(['A', 'D', 'G']);
    for (const look of [false, true]) {
      const two = [...f(names, 2, look, n => met.has(n))];
      assert.strictEqual(two.length, 2);
      assert.ok(
        two.every(n => met.has(n)),
        `${look}: ${two}`
      );
      const five = [...f(names, 5, look, n => met.has(n))];
      assert.deepStrictEqual(five.slice().sort(), ['A', 'D', 'G'], `${look}: the 3 unlocked only: ${five}`);
    }
    // Nobody unlocked (a new player): none; everyone: any genera, all different.
    assert.deepStrictEqual([...f(names, 6, false, () => false)], []);
    assert.strictEqual(new Set(f(names, 6, false, () => true)).size, 6);
  }
});

test('look-alike set: among the genera met, look-alikes of those in come first', () => {
  const f = memoryGenera(),
    met = new Set(['A', 'B', 'C', 'D', 'G', 'H']);
  for (let k = 0; k < 50; k++) {
    const g = [...f(names, 3, true, n => met.has(n))];
    assert.ok(
      g.every(n => met.has(n)),
      `${g}`
    );
    // Seeded on A, B or C, the other two follow (a chain of look-alikes); seeded on D, G or H (no look-alike), any met.
    if (['A', 'B', 'C'].includes(g[0])) assert.deepStrictEqual(g.slice().sort(), ['A', 'B', 'C']);
  }
});

// A unit and its own genus are one answer twice (model.js choiceNames): apart keeps them off one board, the look-alike set
// included; the coral call, with no apart, is unchanged.
test('apart: two units one label names never share a game', () => {
  const f = memoryGenera(),
    nested = (a, b) => (a === 'A' && b === 'B') || (a === 'B' && b === 'A'),
    apart = (n, gens) => gens.every(g => !nested(g, n));
  for (let k = 0; k < 100; k++)
    for (const look of [false, true]) {
      const g = [...f(names, 8, look, () => true, undefined, apart)];
      assert.ok(!(g.includes('A') && g.includes('B')), `${look}: ${g}`);
      assert.strictEqual(new Set(g).size, g.length);
      assert.strictEqual(g.length, 7, `${look}: every other unit still plays`);
    }
  assert.deepStrictEqual([...f([], 4, true, () => true)], [], 'no unit unlocked: none');
});

// A family and its genera (and species) all unlocked: the board never holds a unit with its ancestor or descendant.
test('kin: a family and its genus never share a board', () => {
  const ctx = load(),
    parent = {Coris: 'Wrasses', 'Coris gaimard': 'Coris', Chromis: 'Damsels'},
    parentOf = u => parent[u],
    all = ['Wrasses', 'Coris', 'Coris gaimard', 'Damsels', 'Chromis', 'Other'];
  assert.ok(ctx.kin('Wrasses', 'Coris', parentOf) && ctx.kin('Coris', 'Wrasses', parentOf));
  assert.ok(ctx.kin('Wrasses', 'Coris gaimard', parentOf), 'a species and its family');
  assert.ok(!ctx.kin('Coris', 'Chromis', parentOf) && !ctx.kin('Other', 'Wrasses', parentOf));
  const apart = (n, gens) => gens.every(g => !ctx.kin(g, n, parentOf));
  for (let k = 0; k < 200; k++)
    for (const look of [false, true]) {
      const g = [...ctx.f(all, 6, look, () => true, undefined, apart)];
      for (const a of g) for (const b of g) assert.ok(a === b || !ctx.kin(a, b, parentOf), `${look}: ${g}`);
      assert.ok(g.length >= 3, `${look}: ${g}`);
    }
});

// Both kinds of name unlocked: a common-name species and the scientific genus or species of the same fish are one taxon,
// and the parent walk never links them (kin cannot see it), so a board keeps to one naming tree (memoryTree).
test('naming trees: a board holds one tree, the units both share stay', () => {
  const ctx = load(),
    TREE = {fam1: '', fam2: '', cnA: 'cn', cnB: 'cn', cnC: 'cn', sciG: 'sci', sciA: 'sci', sciB: 'sci'},
    all = Object.keys(TREE),
    treeOf = n => TREE[n];
  const seen = new Set();
  for (let k = 0; k < 200; k++) {
    const kept = ctx.tree(all, treeOf),
      trees = new Set(kept.map(treeOf).filter(Boolean));
    assert.strictEqual(trees.size, 1, `one naming tree: ${kept}`);
    assert.ok(kept.includes('fam1') && kept.includes('fam2'), 'the shared units stay');
    seen.add([...trees][0]);
  }
  assert.deepStrictEqual([...seen].sort(), ['cn', 'sci'], 'either tree can be drawn');
  // One tree in play (or none): nothing changes, the very same list.
  for (const L of [['fam1', 'cnA', 'cnB'], ['sciG', 'sciA', 'fam1'], ['fam1', 'fam2'], []]) assert.strictEqual(ctx.tree(L, treeOf), L);
  // A tree that cannot hold a game (one unit, no shared unit) is not kept while another can.
  for (let k = 0; k < 100; k++) assert.deepStrictEqual([...ctx.tree(['cnA', 'cnB', 'cnC', 'sciG'], treeOf)].sort(), ['cnA', 'cnB', 'cnC']);
  // Every tree too short: still one tree.
  assert.strictEqual(new Set(ctx.tree(['cnA', 'sciG'], treeOf).map(treeOf)).size, 1);
});

test('naming trees: the cards fall back to the full photo, and the board takes the tree of the unit', () => {
  const code = SRC.split('\n')
    .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');
  // A cropped tile that fails falls back to the square photo, as every other tile (data-lo, app.js photoGone).
  const face = code.slice(code.indexOf('face: (c, size) => {'), code.indexOf('aria: () =>'));
  assert.match(face, /<img src="[^"]*" data-lo="\$\{img\(c\.p, 's'\)\}"/);
  assert.match(face, /data-f="\$\{esc\(c\.p\.f\)\}"/);
  // The units a game draws from are one tree's (memoryTree), by the kind of name, never by which subject it is.
  assert.match(code, /memoryTree\(unlocked\(\), n => kindOf\(n\)/);
});

test('look-alike set from the subject own pairs: likes replaces the data look-alikes', () => {
  const f = memoryGenera(),
    likes = n => ({X: ['Y'], Y: ['X', 'Z'], Z: ['Y']})[n] || [];
  for (let k = 0; k < 60; k++) {
    const g = [...f(['X', 'Y', 'Z', 'D', 'G', 'H'], 3, true, () => true, likes)];
    if (['X', 'Y', 'Z'].includes(g[0])) assert.deepStrictEqual(g.slice().sort(), ['X', 'Y', 'Z']);
  }
});

// One-view subjects (UNITS memory 'photos'): the second photo shows the unit differently, never the same observation.
// photo(n, want) as lab.js labShots gives it: a photo of n not of an observation in want.not, passing want.fit.
function source(list) {
  return (n, want) => {
    const not = (want && want.not) || [],
      ok = list.filter(p => !not.includes(p.o || p.f) && (!want || !want.fit || want.fit(p)));
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null;
  };
}
const juv = p => p.ph === 'juvenile';
test('pair of photos: a different species first, then a juvenile and an adult, then another observation', () => {
  const photos = memoryPhotos();
  // Two species: the pair is always one of each, whichever photo comes first.
  const sp = [
    {f: 'a1', o: 'o1', sp: 'x'},
    {f: 'a2', o: 'o2', sp: 'x'},
    {f: 'a3', o: 'o3', sp: 'x'},
    {f: 'b1', o: 'o4', sp: 'y'}
  ];
  for (let k = 0; k < 100; k++) {
    const [p, q] = photos('U', source(sp), juv);
    assert.deepStrictEqual([p.sp, q.sp].sort(), ['x', 'y']);
  }
  // One species, a juvenile among adults: the pair is a juvenile and an adult.
  const ph = [
    {f: 'a1', o: 'o1', sp: 'x'},
    {f: 'a2', o: 'o2', sp: 'x'},
    {f: 'j1', o: 'o3', sp: 'x', ph: 'juvenile'}
  ];
  for (let k = 0; k < 100; k++) {
    const [p, q] = photos('U', source(ph), juv);
    assert.deepStrictEqual([juv(p), juv(q)].sort(), [false, true]);
  }
  // Nothing tells them apart: two observations of the unit.
  const same = [
    {f: 'a1', o: 'o1', sp: 'x'},
    {f: 'a2', o: 'o2', sp: 'x'},
    {f: 'a3', o: 'o3', sp: 'x'}
  ];
  for (let k = 0; k < 100; k++) {
    const [p, q] = photos('U', source(same), juv);
    assert.notStrictEqual(p.o, q.o);
  }
});

test('pair of photos: never one observation twice (rule P4); a unit with one observation is left out', () => {
  const photos = memoryPhotos(),
    // Three photos, two of them one observation, a second species on one of them.
    L = [
      {f: 'a1', o: 'o1', sp: 'x'},
      {f: 'a2', o: 'o1', sp: 'y'},
      {f: 'a3', o: 'o2', sp: 'x'}
    ];
  for (let k = 0; k < 100; k++) {
    const [p, q] = photos('U', source(L), juv);
    assert.notStrictEqual(p.o, q.o);
  }
  assert.strictEqual(
    photos(
      'U',
      source([
        {f: 'a1', o: 'o1'},
        {f: 'a2', o: 'o1'}
      ]),
      juv
    ),
    null
  );
  assert.strictEqual(photos('U', source([]), juv), null);
});

test('the page is untimed and changes no progress: no recorder is called, no subject named, one declared kind of pair (rule S1)', () => {
  const strip = t =>
      t
        .split('\n')
        .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
        .join('\n'),
    code = strip(SRC);
  for (const f of [
    'question',
    'answer',
    'recordAnswer',
    'logAnswer',
    'seenAdd',
    'duelPick',
    'dataLooks',
    'introAdd',
    'qclockArm',
    'sendReports',
    'syncSoon',
    'store.set'
  ])
    assert.ok(!new RegExp(`\\b${f.replace('.', '\\.')}\\(`).test(code), `proto/pairs.js calls ${f}`);
  // The kind comes from the subject on screen's declaration, never from its name.
  assert.match(code, /MEMORY\[UNITS\[SUBJ\.id\]\.memory\]/);
  assert.ok(!/['"](fish|coral|seaslug|corals)['"]|SUBJECTS\[|SUBJ\.id\s*[=!]==/.test(code), 'proto/pairs.js tests which subject it runs');
  // The tree kind: the units the player has unlocked, the subject's own pairs, the draw's photos, nested units apart.
  const tree = code.slice(code.indexOf('photos: {'));
  assert.match(tree, /unlocked\(\)/);
  assert.match(tree, /UNITS\[SUBJ\.id\]\.pairs\(\)/);
  assert.match(tree, /labShots\(/);
  assert.match(tree, /choiceNames\(/);
  // No unit is named on a card before the pair is found: the alt and the label are neutral.
  assert.ok(!/alt="[^"]*\$\{[^}]*(uname|c\.n)/.test(tree) && !/aria: .*(uname|c\.n)/.test(tree), 'a card names its unit before the pair');
});
