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
  SP = new Map(F.species.map(s => [s.id, s])),
  GAME = F.species.filter(s => !s.out);
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
const under = (a, set) => {
  for (; a != null; a = REF[a].parent) if (set.includes(a)) return true;
  return false;
};
// The genus of the species' PDF name (the teaching tree files a species by it), when the reference tree has it.
const genusNode = s => {
  const g = s.name.split(' ')[0];
  const hit = Object.entries(REF).find(([, n]) => n.rank === 'Genus' && n.name === g);
  return hit ? +hit[0] : null;
};
const placedUnder = (s, set) => under(s.ref, set) || (genusNode(s) != null && under(genusNode(s), set));

test('ids: stable, unique, never a name, never a retired one', () => {
  const ids = [...nodes().map(t => t.id), ...F.species.map(s => s.id)];
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate id');
  nodes().forEach(t => assert.match(t.id, /^t\d{2}[a-z]?$/, t.id));
  F.species.forEach(s => assert.match(s.id, /^s\d{3}$/, s.id));
  // The ids come from the source file: the build never invents or renumbers one.
  const srcIds = new Set([...SRC.teach.flatMap(t => [t, ...(t.sub || [])]).map(t => t.id), ...SRC.species.map(s => s.id)]);
  ids.forEach(id => assert.ok(srcIds.has(id), `${id} not in tools/fish_source.json`));
  const retired = [...SRC.retired.teach, ...SRC.retired.species];
  retired.forEach(id => assert.ok(!srcIds.has(id), `retired id ${id} reused`));
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

test('circles: 1, 2 or 3 in the game; barracudas in circle 2; nothing silvery or pelagic in circle 1', () => {
  F.teach.forEach(t => assert.ok([1, 2, 3].includes(t.circle), t.name));
  GAME.forEach(s => assert.ok([1, 2, 3].includes(s.circle), s.name));
  F.species.filter(s => s.out).forEach(s => assert.strictEqual(s.circle, undefined, `${s.name} is out of the game`));
  const fam = s => {
    let a = s.ref;
    while (a != null && REF[a].rank !== 'Family') a = REF[a].parent;
    return a == null ? null : REF[a].name;
  };
  assert.deepStrictEqual(
    F.teach.filter(t => t.circle === 2).map(t => t.name),
    ['Barracuda']
  );
  GAME.filter(s => ['Sphyraenidae', 'Carangidae', 'Mugilidae'].includes(fam(s))).forEach(s => assert.ok(s.circle > 1, s.name));
  // A species is never in a closer circle than its teaching node.
  F.teach.forEach(t => t.species.forEach(id => assert.ok(SP.get(id).circle >= t.circle, `${id} in ${t.name}`)));
});

test('circle 3: beyond IMR, each family with its reason; winks marked, with a note', () => {
  F.teach
    .filter(t => t.circle === 3)
    .forEach(t => {
      assert.ok(t.why || t.wink, `${t.name}: no reason`);
      assert.ok(['diver', 'wink'].includes(t.src), `${t.name}: src ${t.src}`);
    });
  const winks = F.teach.filter(t => t.wink);
  winks.forEach(t => assert.ok(t.circle === 3 && t.note && t.species.length, t.name));
  const names = winks.flatMap(t => t.species.map(id => SP.get(id).name));
  ['Rhincodon typus', 'Alopias pelagicus'].forEach(n => assert.ok(names.includes(n), `${n} not a wink`));
  // Sources of circle 3 are listed in the source file.
  SRC.teach.filter(t => t.src === 'diver').forEach(t => t.srcs.forEach(k => assert.ok(SRC.sources[k], `${t.name}: source ${k}`)));
});

test('every teaching node maps to existing reference nodes, and holds species of its own references', () => {
  nodes().forEach(t => {
    assert.ok(t.ref.length, `${t.name}: no reference node`);
    [...t.ref, ...(t.not || [])].forEach(a => assert.ok(REF[a], `${t.name}: reference node ${a} missing`));
    t.species.forEach(id => {
      const s = SP.get(id);
      assert.ok(s && !s.out, `${t.name}: species ${id} missing or out of the game`);
      assert.ok(placedUnder(s, t.ref), `${s.name} is not under ${t.name}'s references`);
      assert.ok(!placedUnder(s, t.not || []), `${s.name} is under a reference ${t.name} leaves out`);
    });
  });
  F.teach.forEach(t =>
    (t.sub || []).forEach(u => u.species.forEach(id => assert.ok(t.species.includes(id), `${u.name}: ${id} not in ${t.name}`)))
  );
  // Each species of the game is in exactly one level-1 node; look-alikes point to teaching nodes.
  const n = new Map();
  F.teach.forEach(t => t.species.forEach(id => n.set(id, (n.get(id) || 0) + 1)));
  GAME.forEach(s => assert.strictEqual(n.get(s.id), 1, `${s.name} in ${n.get(s.id) || 0} level-1 nodes`));
  const ids = new Set(nodes().map(t => t.id));
  nodes().forEach(t => (t.look || []).forEach(([id, cue]) => assert.ok(ids.has(id) && cue, `${t.name}: look-alike ${id}`)));
  F.teach.filter(t => t.circle === 1).forEach(t => assert.ok(t.species.length, `${t.name}: no species`));
  // The teaching tree files a species by the genus of its PDF name (Chromis agilis under Chromis, not Pycnochromis).
  const chromis = F.teach[0].sub.find(u => u.name === 'Chromis');
  GAME.filter(s => s.name.startsWith('Chromis ') && F.teach[0].species.includes(s.id)).forEach(s =>
    assert.ok(chromis.species.includes(s.id), `${s.name} not under Chromis`)
  );
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

test('species: PDF name first, WoRMS accepted name beside it, presence, rank order', () => {
  const names = new Set();
  F.species.forEach((s, i) => {
    const n = REF[s.ref];
    assert.ok(n, `${s.name}: reference node missing`);
    assert.strictEqual(n.rank, 'Species', s.name);
    assert.strictEqual(s.now || s.name, n.name, `${s.id}: now/name is not the WoRMS accepted name`);
    assert.ok(s.now !== s.name, `${s.name}: now repeats the name`);
    assert.ok(!names.has(s.name), `${s.name} twice`);
    names.add(s.name);
    const p = s.present;
    assert.ok(Number.isInteger(p.dauin) && p.dauin >= 0 && Number.isInteger(p.dauinNI) && p.dauinNI >= 0, s.name);
    assert.strictEqual(typeof p.ph, 'boolean', s.name);
    if (!s.out) {
      assert.ok(Number.isInteger(s.inat), `${s.name}: iNaturalist id`);
      assert.strictEqual(p.ph, true, `${s.name} in the game but not confirmed in the Philippines`);
    } else assert.ok(p.ph === false || /no circle/.test(s.out), `${s.name}: out (${s.out}) but confirmed`);
    assert.strictEqual(s.r, i + 1, `${s.name}: species not in rank order`);
    if (!s.src || s.src === 'slides') assert.ok(s.common, `${s.name}: no common name`);
  });
  // Every species of the IMR reference PDF stays in fish.json, in the game or not (the future Fish Finder needs them all).
  SRC.species.filter(s => !s.src).forEach(s => assert.ok(names.has(s.name), `PDF species ${s.name} missing`));
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
