// Structure of fish.json, the fish mode's content (built by tools/build_fish.py from tools/fish_source.json; see its
// header). Two trees: `ref` (WoRMS reference tree) and `teach` (what the game asks: the 27 IMR entries first).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
const F = read('fish.json'),
  SRC = read('tools/fish_source.json');
const REF = F.ref,
  SP = new Map(F.species.map(s => [s.id, s]));
const nodes = () => F.teach.flatMap(t => [t, ...(t.sub || [])]);
const IMR27 = [
  'Damselfish',
  'Butterflyfish',
  'Angelfish',
  'Spadefish',
  'Moorish Idol',
  'Surgeonfish & Unicornfish',
  'Rabbitfish',
  'Parrotfish',
  'Wrasse',
  'Snapper',
  'Emperor',
  'Bream',
  'Groupers',
  'Sweetlips',
  'Anthias',
  'Fusilier',
  'Boxfish',
  'Goatfish',
  'Triggerfish',
  'Pufferfish',
  'Filefish',
  'Lionfish',
  'Soldierfish',
  'Cardinalfish',
  'Squirrelfish',
  'Lizardfish',
  'Sandperch'
];

test('ids: stable, unique, never a name', () => {
  const ids = [...nodes().map(t => t.id), ...F.species.map(s => s.id)];
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate id');
  nodes().forEach(t => assert.match(t.id, /^t\d{2}[a-z]?$/, t.id));
  F.species.forEach(s => assert.match(s.id, /^s\d{3}$/, s.id));
  // The ids come from the source file: the build never invents or renumbers one.
  const srcIds = new Set([...SRC.teach.flatMap(t => [t, ...(t.sub || [])]).map(t => t.id), ...SRC.species.map(s => s.id)]);
  ids.forEach(id => assert.ok(srcIds.has(id), `${id} not in tools/fish_source.json`));
});

test('the 27 IMR entries are level 1, circle 1, in the order of the 10 shape groups, first in the tree', () => {
  const c1 = F.teach.filter(t => t.circle === 1);
  assert.deepStrictEqual(
    c1.map(t => t.name),
    IMR27
  );
  assert.deepStrictEqual(
    F.teach.slice(0, 27).map(t => t.name),
    IMR27
  );
  let g = 1;
  c1.forEach(t => {
    assert.strictEqual(t.level, 1, t.name);
    assert.ok(t.group === g || t.group === g + 1, `${t.name}: group ${t.group} after ${g}`);
    g = t.group;
  });
  assert.strictEqual(g, 10);
  assert.deepStrictEqual(
    F.groups.map(x => x.n),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
  F.teach.filter(t => t.circle !== 1).forEach(t => assert.strictEqual(t.group, undefined, `${t.name} has an IMR group`));
});

test('circles: 1, 2 or 3; barracudas in circle 2; nothing silvery or pelagic in circle 1', () => {
  F.teach.forEach(t => assert.ok([1, 2, 3].includes(t.circle), t.name));
  F.species.forEach(s => assert.ok([1, 2, 3].includes(s.circle), s.name));
  const fam = s => {
    let a = s.ref;
    while (a != null && REF[a].rank !== 'Family') a = REF[a].parent;
    return a == null ? null : REF[a].name;
  };
  assert.deepStrictEqual(
    F.teach.filter(t => t.circle === 2).map(t => t.name),
    ['Barracuda']
  );
  F.species.filter(s => ['Sphyraenidae', 'Carangidae', 'Mugilidae'].includes(fam(s))).forEach(s => assert.ok(s.circle > 1, s.name));
  // A species is never in a closer circle than its teaching node.
  F.teach.forEach(t => t.species.forEach(id => assert.ok(SP.get(id).circle >= t.circle, `${id} in ${t.name}`)));
});

test('every teaching node maps to existing reference nodes, and holds species of its own references', () => {
  const under = (a, set) => {
    for (; a != null; a = REF[a].parent) if (set.includes(a)) return true;
    return false;
  };
  nodes().forEach(t => {
    assert.ok(t.ref.length, `${t.name}: no reference node`);
    [...t.ref, ...(t.not || [])].forEach(a => assert.ok(REF[a], `${t.name}: reference node ${a} missing`));
    t.species.forEach(id => {
      const s = SP.get(id);
      assert.ok(s, `${t.name}: species ${id} missing`);
      assert.ok(under(s.ref, t.ref), `${s.name} is not under ${t.name}'s references`);
      assert.ok(!under(s.ref, t.not || []), `${s.name} is under a reference ${t.name} leaves out`);
    });
  });
  F.teach.forEach(t =>
    (t.sub || []).forEach(u => u.species.forEach(id => assert.ok(t.species.includes(id), `${u.name}: ${id} not in ${t.name}`)))
  );
  // Each species is in exactly one level-1 node; look-alikes point to teaching nodes.
  const n = new Map();
  F.teach.forEach(t => t.species.forEach(id => n.set(id, (n.get(id) || 0) + 1)));
  F.species.forEach(s => assert.strictEqual(n.get(s.id), 1, `${s.name} in ${n.get(s.id) || 0} level-1 nodes`));
  const ids = new Set(nodes().map(t => t.id));
  nodes().forEach(t => (t.look || []).forEach(([id, cue]) => assert.ok(ids.has(id) && cue, `${t.name}: look-alike ${id}`)));
  F.teach.filter(t => t.circle === 1).forEach(t => assert.ok(t.species.length, `${t.name}: no species`));
});

test('reference tree: accepted WoRMS names, parents exist, one root per class', () => {
  Object.entries(REF).forEach(([a, n]) => {
    assert.ok(n.name && n.rank, a);
    assert.ok(n.parent === null || REF[n.parent], `${n.name}: parent ${n.parent} missing`);
    assert.ok(!(n.syn || []).includes(n.name), `${n.name} listed as its own synonym`);
  });
  Object.values(REF)
    .filter(n => n.parent === null)
    .forEach(n => assert.strictEqual(n.rank, 'Class', n.name));
});

test('every species: a WoRMS accepted species, an iNaturalist taxon, confirmed in the Philippines, ranked', () => {
  const names = new Set();
  F.species.forEach((s, i) => {
    const n = REF[s.ref];
    assert.ok(n, `${s.name}: reference node missing`);
    assert.strictEqual(n.rank, 'Species', s.name);
    assert.strictEqual(n.name, s.name, `${s.id}: name is not the WoRMS accepted name`);
    assert.ok(!names.has(s.name), `${s.name} twice`);
    names.add(s.name);
    assert.ok(Number.isInteger(s.inat) && s.inat === n.inat, `${s.name}: iNaturalist id`);
    assert.strictEqual(s.present.ph, true, `${s.name} not confirmed in the Philippines`);
    assert.ok(Number.isInteger(s.present.dauin) && s.present.dauin >= 0, s.name);
    assert.strictEqual(s.r, i + 1, `${s.name}: species not in rank order`);
    assert.ok(s.common, `${s.name}: no common name`);
  });
  // Cheatsheet species come first, in cheatsheet order.
  const cs = F.species.filter(s => s.cs);
  assert.deepStrictEqual(
    cs.map(s => s.cs),
    [...cs.map(s => s.cs)].sort((a, b) => a - b)
  );
  assert.ok(F.species.slice(0, cs.length).every(s => s.cs));
  F.teach.forEach(t =>
    assert.deepStrictEqual(
      t.species,
      [...t.species].sort((a, b) => SP.get(a).r - SP.get(b).r),
      t.name
    )
  );
});
