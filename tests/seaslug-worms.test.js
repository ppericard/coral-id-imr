require('./slot.js').testGuard();
// The sea slugs' reference taxonomy (Pierre, 2026-11-13, Q340: the admin's Photos › Tree views Key | WoRMS; 2026-11-17,
// "on garde WoRMS"): tools/seaslug_worms.py reads WoRMS's classification of every species, genus and group family into
// tools/seaslug_worms.json, and tools/seaslug_game.py writes the game's part into seaslug.json ref (AphiaID -> {name,
// rank, parent}) and each genus's ref, which the admin's WoRMS view draws (admin.js fuWormsOf), as fish.json ref.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  json = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const T = json('seaslug.json'),
  W = json('tools/seaslug_worms.json'),
  GR = json('tools/seaslug_groups.json'),
  R = T.ref;
// WoRMS's ranks from the class down, in order (tools/seaslug_worms.py RANKS).
const RANKS = [
  'Class',
  'Subclass',
  'Infraclass',
  'Subterclass',
  'Superorder',
  'Order',
  'Suborder',
  'Infraorder',
  'Parvorder',
  'Superfamily',
  'Epifamily',
  'Family',
  'Subfamily',
  'Tribe',
  'Subtribe',
  'Genus',
  'Subgenus',
  'Species',
  'Subspecies'
];
// A node's path to its root, the root first ([] when it leaves the table or loops).
const pathOf = (N, k) => {
  const out = [];
  for (let x = String(k); x !== 'null'; x = String(N[x].parent)) {
    if (!N[x] || out.includes(x)) return [];
    out.unshift(x);
  }
  return out;
};
const py = body => {
  const r = spawnSync(
    'python3',
    ['-c', `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_worms as w\n${body}`],
    {
      encoding: 'utf8'
    }
  );
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('seaslug.json ref: every species and genus reaches the one root, Gastropoda, ranks in order', () => {
  assert.ok(Object.keys(R).length > 100, 'a reference tree');
  const roots = Object.keys(R).filter(k => R[k].parent === null);
  assert.deepStrictEqual(
    roots.map(k => [R[k].name, R[k].rank]),
    [['Gastropoda', 'Class']]
  );
  const leaves = [...T.species.filter(s => s.ref != null).map(s => [s.name, s.ref]), ...T.genera.map(g => [g.name, g.ref])];
  for (const [name, ref] of leaves) {
    const p = pathOf(R, ref);
    assert.ok(p.length, `${name}: ${ref} reaches no root`);
    assert.strictEqual(p[0], roots[0], name);
    const rk = p.map(x => RANKS.indexOf(R[x].rank));
    assert.ok(
      rk.every(i => i >= 0),
      `${name}: a rank not known ${p.map(x => R[x].rank)}`
    );
    assert.ok(
      rk.every((r, i) => !i || r > rk[i - 1]),
      `${name}: ranks out of order ${p.map(x => R[x].rank)}`
    );
  }
  // every named species has its ref; only a species with no published name yet (inf) has none, under a genus that has one
  for (const s of T.species) assert.ok(s.inf ? s.ref == null : s.ref != null, s.id);
  for (const g of T.genera) assert.ok(R[g.ref] && R[g.ref].rank === 'Genus', `${g.name}: its WoRMS genus`);
  // a genus's ref is the WoRMS genus of that name (the game's genera are WoRMS's accepted names today)
  for (const g of T.genera) assert.strictEqual(R[g.ref].name, g.name, g.id);
});

test('seaslug.json ref: only the ancestors of the tree, each node as tools/seaslug_worms.json has it', () => {
  const need = new Set([...T.species.filter(s => s.ref != null).map(s => s.ref), ...T.genera.map(g => g.ref)].flatMap(k => pathOf(R, k)));
  assert.deepStrictEqual(Object.keys(R).sort(), [...need].sort(), 'no node above no leaf');
  for (const [k, n] of Object.entries(R)) assert.deepStrictEqual(n, W.nodes[k], k);
});

test('the taxonomic groups: each group title names WoRMS taxa its families sit under, or the difference is known', () => {
  // the groups' taxa are in the tree (Nudibranchia, Doridina, Cladobranchia, Sacoglossa, Cephalaspidea, Aplysiida,
  // Pleurobranchida), each family of the tree under them in WoRMS today
  const names = new Set(Object.values(R).map(n => n.name));
  for (const g of T.taxa.groups) for (const t of g.title.split('·').map(x => x.trim())) assert.ok(names.has(t), `${g.title}: ${t}`);
  const fam = Object.fromEntries(
    Object.entries(R)
      .filter(([, n]) => n.rank === 'Family')
      .map(([k, n]) => [n.name, k])
  );
  for (const f of T.families) {
    assert.ok(fam[f.name], `${f.name}: a WoRMS family of the tree`);
    assert.strictEqual(String(GR.aphia[f.name]), fam[f.name], `${f.name}: the groups file's AphiaID is WoRMS's`);
    const up = pathOf(R, fam[f.name]).map(x => R[x].name),
      title = T.taxa.groups.find(g => g.n === f.tgroup).title;
    for (const t of title.split('·').map(x => x.trim())) assert.ok(up.includes(t), `${f.name} under ${t} (${up.join(' › ')})`);
  }
});

test('tools/seaslug_worms.py --check passes offline; seaslug_game --check holds the ref', () => {
  for (const tool of ['seaslug_worms.py', 'seaslug_game.py']) {
    const r = spawnSync('python3', [path.join(TOOLS, tool), '--check'], {encoding: 'utf8'});
    assert.strictEqual(r.status, 0, tool + ': ' + r.stderr);
  }
});

test('tools/seaslug_worms.py problems: a cycle, a missing parent, a rank out of order, a species not covered', () => {
  const bad = py(`W = {'nodes': {
  '1': {'name': 'Gastropoda', 'rank': 'Class', 'parent': None},
  '2': {'name': 'Nudibranchia', 'rank': 'Order', 'parent': 1},
  '3': {'name': 'Xus', 'rank': 'Genus', 'parent': 4},
  '4': {'name': 'Xidae', 'rank': 'Family', 'parent': 3},
  '5': {'name': 'Yus', 'rank': 'Genus', 'parent': 99},
  '6': {'name': 'Zidae', 'rank': 'Family', 'parent': 7},
  '7': {'name': 'Zus', 'rank': 'Genus', 'parent': 2},
  '8': {'name': 'Loose', 'rank': 'Order', 'parent': None}}, 'genera': {'Zus': 7}}
L = {'species': [{'name': 'Zus one', 'genus': 'Zus', 'worms': {'aphiaAcc': 77}}, {'name': 'Qus two', 'genus': 'Qus', 'worms': {}}]}
print(json.dumps(w.problems(W, L, {'aphia': {'Zidae': 6, 'Lostidae': 66}})))`);
  const has = re =>
    assert.ok(
      bad.some(x => re.test(x)),
      `${re}: ${JSON.stringify(bad)}`
    );
  has(/^3 Xus: .*cycle|^4: a cycle|^3: a cycle/);
  has(/^5 Yus: parent 99 not in nodes/);
  has(/^6 Zidae: its parent Zus is a Genus, not above a Family/);
  has(/^8 Loose: a root that is not a class/);
  has(/^species Zus one: AphiaID 77/);
  has(/^genus Qus: no WoRMS genus/);
  has(/^family Lostidae: AphiaID 66/);
  assert.ok(!bad.some(x => /^family Zidae/.test(x)));
  assert.deepStrictEqual(
    py(`print(json.dumps(w.problems(json.load(open(${JSON.stringify(path.join(TOOLS, 'seaslug_worms.json'))})))))`),
    []
  );
});

test('tools/seaslug_worms.py disagreements: a family out of its group, a species WoRMS files elsewhere', () => {
  const out = py(`W = {'nodes': {
  '1': {'name': 'Gastropoda', 'rank': 'Class', 'parent': None},
  '2': {'name': 'Nudibranchia', 'rank': 'Order', 'parent': 1},
  '3': {'name': 'Doridina', 'rank': 'Suborder', 'parent': 2},
  '4': {'name': 'Cladobranchia', 'rank': 'Suborder', 'parent': 2},
  '5': {'name': 'Adidae', 'rank': 'Family', 'parent': 3},
  '6': {'name': 'Bidae', 'rank': 'Family', 'parent': 3},
  '7': {'name': 'Aus', 'rank': 'Genus', 'parent': 5},
  '8': {'name': 'Bus', 'rank': 'Genus', 'parent': 6},
  '9': {'name': 'Aus one', 'rank': 'Species', 'parent': 7},
  '10': {'name': 'Bus two', 'rank': 'Species', 'parent': 8}}, 'genera': {'Aus': 7, 'Cus': 8}}
G = {'groups': [{'title': 'Nudibranchia · Doridina', 'families': ['Adidae']}, {'title': 'Nudibranchia · Cladobranchia', 'families': ['Bidae']}],
     'aphia': {'Adidae': 5, 'Bidae': 6}}
L = {'species': [{'name': 'Aus one', 'genus': 'Aus', 'family': 'Adidae', 'circle': 1, 'worms': {'aphiaAcc': 9}},
                 {'name': 'Cus two', 'genus': 'Cus', 'family': 'Bidae', 'circle': 1, 'worms': {'aphiaAcc': 10}},
                 {'name': 'Dus out', 'genus': 'Dus', 'family': 'Bidae', 'circle': 4, 'worms': {'aphiaAcc': 10}}]}
print(json.dumps(w.disagreements(W, L, G, {1, 2, 3})))`);
  assert.strictEqual(out.length, 3, JSON.stringify(out));
  assert.match(
    out[0],
    /^family Bidae, group “Nudibranchia · Cladobranchia”: WoRMS places it under .*Doridina \(suborder\), not under Cladobranchia$/
  );
  assert.match(out[1], /^species Cus two \(game genus Cus\): WoRMS accepts it as Bus two, genus Bus$/);
  assert.match(out[2], /^genus Cus: WoRMS accepts it as Bus \(8\)$/);
});
