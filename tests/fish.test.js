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

test('the 27 IMR entries are level 1, circle 1, in the order of the IMR presentation, first in the tree', () => {
  const c1 = F.teach.filter(t => t.circle === 1);
  assert.deepStrictEqual(
    c1.map(t => t.name),
    IMR27
  );
  assert.deepStrictEqual(
    F.teach.slice(0, 27).map(t => t.name),
    IMR27
  );
  c1.forEach(t => assert.strictEqual(t.level, 1, t.name));
});

// Identification groups (Pierre, 2026-11-04; rule S3): the key in force for this deployment's region
// (tools/fish_source.json deploy.key among keys; for the Indo-Pacific, the index of a reef fish ID book) is the reference for fish
// groups. Every teaching node in the game (any circle, winks aside) carries one of its groups, unless the source marks it
// as waiting (keyGroup null with keyWhy); fish.json is as `build_fish.py --regroup` gives it.
const KEY = SRC.keys.find(k => k.id === SRC.deploy.key);
const BUILD = path.join(__dirname, '..', 'tools', 'build_fish.py');
const regroupCheck = src => {
  const args = [BUILD, '--regroup', '--check'];
  let tmp = null;
  if (src) {
    tmp = path.join(require('os').tmpdir(), `fish_source.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(src));
    args.push('--src', tmp);
  }
  const r = require('child_process').spawnSync('python3', args, {encoding: 'utf8'});
  if (tmp) fs.unlinkSync(tmp);
  return {status: r.status, out: (r.stdout || '') + (r.stderr || '')};
};
const clone = o => JSON.parse(JSON.stringify(o));

test('identification groups: the key in force, credited, its 20 groups; every node in the game in one of them', () => {
  assert.ok(KEY, 'deploy.key names a key');
  assert.deepStrictEqual({id: F.key.id, cite: F.key.cite, short: F.key.short}, {id: KEY.id, cite: KEY.cite, short: KEY.short});
  assert.match(F.key.cite, /Reef Fish Identification – Tropical Pacific, 2nd ed\./);
  assert.deepStrictEqual(
    F.key.groups.map(g => g.n),
    Array.from({length: 20}, (_, i) => i + 1)
  );
  F.key.groups.forEach((g, i) => {
    assert.strictEqual(g.title, KEY.groups[i].title);
    assert.ok(g.pages[0] <= g.pages[1] && (i === 0 || g.pages[0] === F.key.groups[i - 1].pages[1] + 1), `pages of group ${g.n}`);
  });
  assert.strictEqual(F.groups, undefined, 'the IMR shape groups are gone');
  const nums = new Set(F.key.groups.map(g => g.n)),
    waiting = new Set(SRC.teach.filter(t => (t.keyGroup || {})[KEY.id] === null).map(t => t.id));
  F.teach
    .filter(t => !t.wink)
    .forEach(t => assert.ok(nums.has(t.group) || (waiting.has(t.id) && t.group === undefined), `${t.id} ${t.name}: group ${t.group}`));
  // The IMR look-alike pairs the book splits keep their own groups: the book's order, not the slides'.
  const g = id => F.teach.find(t => t.id === id).group;
  assert.deepStrictEqual(
    [g('t02'), g('t06'), g('t01'), g('t10'), g('t16'), g('t13'), g('t08'), g('t09'), g('t23'), g('t24'), g('t26'), g('t22'), g('t19')],
    [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 16, 17]
  );
  const r = regroupCheck();
  assert.strictEqual(r.status, 0, r.out);
});

test('the clingfishes are out of circle 3 (Pierre, 2026-11-04: not in the key); no node waits for a group', () => {
  assert.ok(!F.teach.some(t => t.fam === 'Gobiesocidae' || t.id === 't62'), 'no clingfish entry');
  assert.ok(SRC.retired.teach.includes('t62') && ['s460', 's461'].every(id => SRC.retired.species.includes(id)), 'ids retired');
  assert.ok(SRC.leftOut.Gobiesocidae, 'the decision and its reason kept in leftOut');
  assert.ok(!Object.values(REF).some(n => n.name === 'Gobiesocidae'), 'no reference node left for them');
  assert.ok(!SRC.teach.some(t => Object.values(t.keyGroup || {}).includes(null)), 'no node waits for a group');
});

test('identification groups: the build fails, naming the node, on a node in the game with no group or two', () => {
  // No group: the jawfishes once their label is gone from the key.
  const a = clone(SRC);
  a.keys.find(k => k.id === a.deploy.key).groups.find(x => x.n === 13).labels = a.keys
    .find(k => k.id === a.deploy.key)
    .groups.find(x => x.n === 13)
    .labels.filter(l => l[0] !== 'Jawfishes');
  let r = regroupCheck(a);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /t58 Jawfishes: no group/);
  // A wait for a decision (keyGroup null) needs its keyWhy, and lets the build go on.
  a.teach.find(t => t.id === 't58').keyGroup = {[a.deploy.key]: null};
  r = regroupCheck(a);
  assert.match(r.out, /t58 Jawfishes: keyGroup null needs a keyWhy/);
  // Two groups: the soapfish genus of Groupers (Diploprion) moved to another group of the key.
  const b = clone(SRC),
    K = b.keys.find(k => k.id === b.deploy.key);
  K.groups.find(x => x.n === 7).labels.find(l => l[0] === 'Soapfishes')[1] = ['Grammistidae'];
  K.groups.find(x => x.n === 12).labels.push(['test', ['Diploprioninae']]);
  r = regroupCheck(b);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /t13 Groupers: two groups 7, 12/);
  // An explicit choice settles the group (the families follow that key's labels, so fish.json differs from it).
  b.teach.find(t => t.id === 't13').keyGroup = {[K.id]: 7};
  r = regroupCheck(b);
  assert.doesNotMatch(r.out, /identification groups \(rule S3/);
  assert.match(r.out, /is not as key .* gives it/);
  // A label in two groups of a key is refused.
  const c = clone(SRC);
  c.keys.find(k => k.id === c.deploy.key).groups[0].labels.push(['test', ['Labridae']]);
  r = regroupCheck(c);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /Labridae is under groups/);
  // A region with no key has no group rule.
  const d = clone(SRC);
  delete d.deploy.key;
  r = regroupCheck(d);
  assert.doesNotMatch(r.out, /identification groups \(rule S3/);
  assert.match(r.out, /is not as key \(none\) gives it/);
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
  // The surprise card: 3 absurd distractors from our own teaching entries, a label each, two short feedback lines.
  const tids = new Set(F.teach.map(t => t.id));
  winks.forEach(t => {
    assert.strictEqual(t.wink.choices.length, 3, t.name);
    t.wink.choices.forEach(([id, label]) => assert.ok(tids.has(id) && id !== t.id && label, `${t.name}: choice ${id}`));
    ['right', 'wrong'].forEach(k => assert.ok(t.wink[k] && t.wink[k].length <= 80, `${t.name}: ${k}`));
  });
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
    } else
      assert.ok(p.ph === false || /no circle|circle 3: not confirmed near Dauin/.test(s.out), `${s.name}: out (${s.out}) but confirmed`);
    // Confirmed near Dauin (Pierre, 2026-11-03): his own there, 2+ Research Grade observers there, or the IMR reference list.
    if (s.inat) {
      assert.strictEqual(p.near, p.nearBy.length > 0, `${s.id}: near and nearBy disagree`);
      assert.strictEqual(p.nearBy.includes('imr'), !!s.pdf, `${s.id}: imr iff in the PDF list`);
      assert.strictEqual(p.nearBy.includes('observers'), p.dauinU >= 2, `${s.id}: observers iff 2+ observers near Dauin`);
    }
    // Circle 3 only for species confirmed near Dauin.
    if (s.circle === 3) assert.ok(p.near, `${s.id} ${s.name}: circle 3 but not confirmed near Dauin`);
    if (/circle 3: not confirmed/.test(s.out || '')) assert.ok(!p.near, `${s.id}: out of circle 3 but confirmed`);
    assert.strictEqual(s.r, i + 1, `${s.name}: species not in rank order`);
    if (!s.src || s.src === 'slides') assert.ok(s.common, `${s.name}: no common name`);
  });
  // Every species of the IMR reference PDF stays in fish.json, in the game or not (the future Fish ID Key needs them all).
  SRC.species.filter(s => !s.src).forEach(s => assert.ok(names.has(s.name), `PDF species ${s.name} missing`));
  // Cheatsheet species come first, in cheatsheet order.
  const cs = F.species.filter(s => s.cs);
  assert.deepStrictEqual(
    cs.map(s => s.cs),
    [...cs.map(s => s.cs)].sort((a, b) => a - b)
  );
  assert.ok(F.species.slice(0, cs.length).every(s => s.cs));
});

// Species order inside an entry: the commonness index (Pierre, 2026-11-04; docs/FISH_PATH.md "Species order: the commonness
// index", tools/fish_commonness.py): the most commonly met around Dauin first, each species of a teaching node with its
// index (cmi, 0-1), its sub-entries in the same order; fish.json is as `build_fish.py --commonness` gives it.
test('species order inside an entry follows the commonness index', () => {
  F.teach.forEach(t => {
    t.species.forEach(id => {
      const c = SP.get(id).cmi;
      assert.ok(typeof c === 'number' && c >= 0 && c <= 1, `${t.name}: ${id} has no commonness index`);
    });
    t.species
      .slice(1)
      .forEach((id, i) => assert.ok(SP.get(id).cmi <= SP.get(t.species[i]).cmi, `${t.name}: ${id} after a less common species`));
    (t.sub || []).forEach(u =>
      assert.deepStrictEqual(
        u.species,
        t.species.filter(id => u.species.includes(id)),
        `${t.name} / ${u.name}`
      )
    );
  });
  // The IMR 24 most sighted lead their entries unless the field counts say otherwise (weights 3 / 2 / 1): Pierre's
  // examples from the review, the threespot dascyllus and the lemon damsel first among damselfish, the threadfin anthias
  // before the purple one.
  const name = id => SP.get(id).name;
  const dams = F.teach.find(t => t.id === 't01').species.map(name);
  assert.deepStrictEqual(dams.slice(0, 2), ['Dascyllus trimaculatus', 'Pomacentrus moluccensis']);
  assert.deepStrictEqual(
    F.teach
      .find(t => t.id === 't15')
      .species.map(name)
      .slice(0, 2),
    ['Pseudanthias huchtii', 'Pseudanthias tuka']
  );
  const r = require('child_process').spawnSync('python3', [BUILD, '--commonness', '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

// The commonness index's rules on a small made-up entry (tools/fish_commonness.py, offline): an IMR 24 species first, a
// field census that records every species scores an absent one 0, a partial list scores only what it lists, observers
// are shrunk toward the entry's mean (M), and a rerun gives the same numbers.
test('commonness index: the rules on a made-up entry', () => {
  const code = `
import json, sys
sys.path.insert(0, ${JSON.stringify(path.join(__dirname, '..', 'tools'))})
import fish_commonness as fc
sp = lambda i, n, r, cs=None: dict(id=i, name=n, r=r, ref=0, **({'cs': cs} if cs else {}))
fish = {'species': [sp('s1', 'Aa one', 1, 24), sp('s2', 'Aa two', 2), sp('s3', 'Aa three', 3), sp('s4', 'Aa four', 4)],
        'teach': [{'id': 't1', 'name': 'T', 'species': ['s4', 's3', 's2', 's1']}], 'ref': {}}
inputs = {'params': {'weights': {'field': 3, 'imr': 2, 'inat': 1}, 'M': 5, 'decades': 2},
          'field': {'census': {'kind': 'presence', 'absent': 0, 'values': {'Aa one': 2, 'Aa two': 4}},
                    'partial': {'kind': 'count', 'absent': None, 'values': {'Aa three': 10}},
                    'off': {'kind': 'count', 'absent': 0, 'use': False, 'values': {'Aa four': 99}}}}
inat = {'species': {'s1': [1, 1, 2, 3], 's2': [2, 9, 20, 40], 's3': [3, 9, 20, 40], 's4': [4, 0, 0, 0]}}
a = fc.compute(fish, inputs, inat)['t1']
b = fc.compute(fish, inputs, inat)['t1']
print(json.dumps({'order': [i for i, _, _ in a], 'idx': {i: round(x, 4) for i, x, _ in a},
                  'sig': {i: r['signals'] for i, _, r in a}, 'same': a == b}))
`;
  const r = require('child_process').spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  assert.ok(o.same, 'a rerun gives the same numbers');
  // s1: IMR 24, half the census's best, few observers; s2: the census's best, many observers.
  assert.deepStrictEqual(o.order, ['s2', 's1', 's3', 's4']);
  assert.strictEqual(o.sig.s2.field, 1);
  assert.strictEqual(o.sig.s1.field, 0.5);
  assert.strictEqual(o.sig.s3.field, 0, 'absent from the full census: 0; the partial list alone (one species) does not count');
  assert.strictEqual(o.sig.s4.field, 0, 'a source with use false is ignored');
  assert.strictEqual(o.sig.s1.imr, 0.904);
  assert.strictEqual(o.sig.s2.inat, 1);
  assert.ok(o.sig.s3.inat === 1 && o.idx.s3 < o.idx.s1, 'same observers as s2, but no field record and no IMR 24');
  assert.ok(o.sig.s4.inat === 0, 'no observer anywhere: 100x below the top or more');
});

// Two species of the index on one iNaturalist taxon (Codex #497: s104 / s105 both on 559534) get the same counts, in
// whatever order they come; fetch() uses the client it is given.
test('commonness fetch: species sharing an iNaturalist taxon all get its counts', () => {
  const code = `
import json, sys
sys.path.insert(0, ${JSON.stringify(path.join(__dirname, '..', 'tools'))})
import fish_commonness as fc
class Fake:
    def get(self, url):
        if 'species_counts' in url:
            return {'total_results': 1, 'results': [{'count': 5, 'taxon': {'id': 7, 'ancestor_ids': [1, 7]}}]}
        return {'total_results': 3}
out = {}
for order in (['a', 'b'], ['b', 'a']):
    fish = {'species': [{'id': 'a', 'inat': 7}, {'id': 'b', 'inat': 7}], 'teach': [{'id': 't', 'name': 'T', 'species': order}]}
    out[''.join(order)] = fc.fetch(fish, Fake())
print(json.dumps(out))
`;
  const r = require('child_process').spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  for (const k of ['ab', 'ba']) assert.deepStrictEqual(o[k], {a: [7, 3, 3, 3], b: [7, 3, 3, 3]}, k);
});

// The starter core and the judged photos (Pierre, 2026-11-04: the fish beta opened on the wrong families and on photos
// too hard for a beginner; judging/FISH.md, tools/fish_judge.py).
const PH = read('fish-photos.json').photos,
  JUDGE = read('tools/fish_judge.json');
test('start: the starter core, four easy circle-1 entries from Pierre’s fish-ID design, in fish.json and its source', () => {
  const byId = new Map(F.teach.map(t => [t.id, t]));
  assert.deepStrictEqual(F.start, SRC.start);
  assert.deepStrictEqual(F.start.map(id => byId.get(id).name).sort(), [
    'Angelfish',
    'Butterflyfish',
    'Damselfish',
    'Surgeonfish & Unicornfish'
  ]);
  F.start.forEach(id => assert.strictEqual(byId.get(id).circle, 1, id));
  // dimorph: only where the presentation's phase lines say the sexes or phases differ.
  F.teach
    .filter(t => t.dimorph)
    .forEach(t =>
      assert.ok(
        (t.phase || []).some(l => /males|phase/i.test(l)),
        t.name
      )
    );
  assert.deepStrictEqual(
    F.teach.filter(t => t.dimorph).map(t => t.name),
    ['Parrotfish', 'Anthias']
  );
});
// judging/FISH.md "Caps" and "Reference photos", the same rule as tools/fish_judge.py cap(): a reference photo (rep) gets
// the flag r and one ease point (REP_BONUS), the caps applied after it.
const CODE = /^([pohtd])([01])([gdn])([0-3])([smb])([lms])([1smx])([jca]*)([1-5])$/;
const capOf = (code, phase, juvOk, rep) => {
  const [, v, w, l, k, , , n, fl0, e0] = code.match(CODE),
    fl = fl0 + (phase ? 'p' : '') + (rep ? 'r' : '');
  let e = Math.min(5, +e0 + (rep ? 1 : 0));
  if ((/j/.test(fl) && !juvOk) || n === 'x' || k === '3') e = Math.min(e, 2);
  if (/[ca]/.test(fl) || l === 'n' || k === '2' || /[htd]/.test(v) || w === '0') e = Math.min(e, 3);
  return {e, jt: code.slice(0, 7) + fl};
};
// The juvenile classes (fish.json juv, from tools/fish_source.json; the same rule as tools/fish_judge.py juv_early): a
// juvenile is judged without the juvenile cap when its entry is class A or its species is in the entry's early list.
const SPN = new Map(F.species.map(s => [s.id, [s.name, s.now].filter(Boolean)]));
const JUV = Object.fromEntries(F.teach.map(t => [t.id, t.juv]));
const juvEarly = (tid, p) => {
  const j = JUV[tid];
  if (!j || typeof j !== 'object') return false;
  if (j.cls === 'A') return true;
  return (j.early || []).some(x => (SPN.get(p.sp) || []).some(n => n === x || n.startsWith(x + ' ')));
};
test('judged photos: every fish game photo judged with a valid code, written into fish-photos.json with its caps', () => {
  const dim = new Set(F.teach.filter(t => t.dimorph).map(t => t.id)),
    c1 = F.teach.filter(t => t.level === 1 && t.circle === 1 && !t.wink).map(t => t.id),
    codes = {};
  Object.entries(JUDGE.photos).forEach(([tid, m]) =>
    Object.entries(m).forEach(([f, c]) => {
      assert.match(c, CODE, `${f}: code ${c}`);
      assert.ok(!(f in codes), `${f} judged twice`);
      codes[f] = [tid, c];
    })
  );
  // Every circle since 2026-11-04 (circle 1 first, then circles 2 and 3 and the winks: ROADMAP "Fish photo judging").
  Object.entries(PH).forEach(([tid, L]) => L.forEach(p => assert.ok(p.f in codes, `${tid} ${p.f}: not judged`)));
  Object.entries(PH).forEach(([tid, L]) =>
    L.forEach(p => {
      if (!(p.f in codes)) return assert.ok(p.e === undefined && p.jt === undefined && !p.c, `${p.f}: e without a judgement`);
      assert.strictEqual(codes[p.f][0], tid, `${p.f}: judged under another entry`);
      assert.deepStrictEqual(
        {e: p.e, jt: p.jt},
        capOf(codes[p.f][1], dim.has(tid), juvEarly(tid, p), p.rep),
        `${p.f}: run python3 tools/fish_judge.py`
      );
      assert.deepStrictEqual(p.c, JUDGE.crops[p.f], `${p.f}: its proposed crop`);
      // Never among the very easy photos of the first questions: juveniles, night, partial, head / tail / top views,
      // camouflage, out of water, an unclear subject.
      if (
        (/j/.test(p.jt.slice(7)) && !juvEarly(tid, p)) ||
        /[ca]/.test(p.jt.slice(7)) ||
        /[htd]/.test(p.jt[0]) ||
        p.jt[1] === '0' ||
        p.jt[2] === 'n' ||
        p.jt[3] >= '2' ||
        p.jt[6] === 'x'
      )
        assert.ok(p.e <= 3, `${p.f}: ${p.jt} at ease ${p.e}`);
    })
  );
  // Crops: proposals in curation.json's format, inside the photo, for judged photos only.
  Object.entries(JUDGE.crops).forEach(([f, c]) => {
    assert.ok(f in codes, `${f}: a crop without a judgement`);
    assert.ok(c.length === 4 && c[0] >= 0 && c[1] >= 0 && c[2] <= 1 && c[3] <= 1 && c[0] < c[2] && c[1] < c[3], `${f}: crop ${c}`);
  });
  // Every circle-1 entry has at least 5 very easy photos (Pierre, 2026-11-04), so its first questions take turns among
  // them (model.js easyFirst); the photos the pass added are judged and appear once, one per observation.
  c1.forEach(id => assert.ok(PH[id].filter(p => p.e >= 4).length >= 5, `${id}: fewer than 5 very easy photos`));
  Object.entries(JUDGE.add || {}).forEach(([tid, L]) =>
    L.forEach(a => {
      const p = PH[tid].find(x => x.o === a.o);
      assert.ok(p && p.f === a.f && p.e >= 4, `${tid} ${a.f}: an added photo missing or not very easy`);
      assert.ok(['cc0', 'cc-by', 'cc-by-nc'].includes(a.lic), `${a.f}: licence ${a.lic}`);
    })
  );
  // Juveniles: a show-early genus's (or a class-A entry's) can be very easy; a capped one cannot.
  const juvs = Object.entries(PH).flatMap(([tid, L]) => L.filter(p => p.jt && /j/.test(p.jt.slice(7))).map(p => [tid, p]));
  ['t04', 't14', 't17'].forEach(id =>
    assert.ok(
      PH[id].some(p => /j/.test(p.jt.slice(7)) && p.e >= 4),
      `${id}: no very easy juvenile`
    )
  );
  assert.ok(
    juvs.some(([tid, p]) => JUV[tid].cls === 'mixed' && juvEarly(tid, p) && p.e >= 4),
    'a juvenile of a show-early genus (mixed entry) can be very easy'
  );
  const capped = juvs.filter(([tid, p]) => !juvEarly(tid, p));
  assert.ok(capped.length && capped.every(([, p]) => p.e <= 2), 'a capped juvenile is at most 2');
  assert.ok(
    capped.some(([tid, p]) => (JUV[tid].late || []).some(x => SPN.get(p.sp).some(n => n === x || n.startsWith(x + ' ')))),
    'a juvenile of a late (look-alike) species is capped'
  );
  // The phase flag (sex or colour phase: a species-level difficulty) caps nothing at the family level.
  assert.ok(
    Object.values(PH)
      .flat()
      .some(p => /p/.test((p.jt || '').slice(7)) && p.e >= 4),
    'a phase photo can be very easy'
  );
});

// The curated photos (admin plan PR 7, tools/fish_game.py): every photo Pierre put in play carries the rubric's code and
// an ease; where that ease is the pass's (Pierre did not change it in the admin), the caps hold, so no juvenile, night
// shot, partial fish or camouflage reaches the very easy photos of the first questions. Checked on the list a run would
// write (fish_game.py plan, nothing downloaded) and on the game as it plays (core.js fishPhotos: fish-game.json and the
// stopgap): every circle-1 entry keeps at least 5 very easy photos (Pierre, 2026-11-04).
test('curated photos: a valid code and ease for each, the caps where the ease is the pass’s; 5 very easy per circle-1 entry', () => {
  const {execFileSync} = require('child_process'),
    C = require('../core.js'),
    S = read('suggest.json').fish || {},
    CUR = read('curation.json'),
    FC = CUR.fish || {},
    plan = JSON.parse(
      execFileSync(
        'python3',
        [
          '-c',
          `import sys, json; sys.path.insert(0, 'tools')
import fish_game as G
L = lambda f, d=None: G.load('.', f, d)
todo, keep = G.plan(L('fish.json'), L('curation.json', {}), L('fish-cand.json', {'cand': {}}), (L('suggest.json', {}) or {}).get('fish') or {}, L('fish-game.json', {'photos': {}}))
print(json.dumps([r for r, _, _ in todo] + list(keep.values())))`
        ],
        {cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 << 20}
      )
    ),
    entry = new Map(F.teach.flatMap(t => (t.species || []).map(s => [s, t.id])));
  assert.strictEqual(
    plan.length,
    Object.keys(FC.add || {}).filter(f => C.fishOn(FC, f, FC.add[f])).length,
    'every photo in play is listed'
  );
  plan.forEach(p => {
    // The judged tags with their flags (the phase p and reference r flags included), then the ease.
    assert.match(p.jt + String(p.e), /^[pohtd][01][gdn][0-3][smb][lms][1smx][jcapr]*[1-5]$/, `${p.f}: code ${p.jt} ease ${p.e}`);
    const pass = !(p.f in (FC.ease || {})) || (S[p.f] && S[p.f].e === FC.ease[p.f] && S[p.f].jt === FC.tags[p.f]);
    if (!pass) return; // Pierre's own values stand (an ease he set is his choice)
    const tid = entry.get(p.sp),
      fl = p.jt.slice(7);
    if ((/j/.test(fl) && !juvEarly(tid, p)) || p.jt[6] === 'x' || p.jt[3] === '3') assert.ok(p.e <= 2, `${p.f}: ${p.jt} at ease ${p.e}`);
    if (/[ca]/.test(fl) || p.jt[2] === 'n' || p.jt[3] === '2' || /[htd]/.test(p.jt[0]) || p.jt[1] === '0')
      assert.ok(p.e <= 3, `${p.f}: ${p.jt} at ease ${p.e}`);
  });
  const GM = read('fish-game.json').photos,
    X = C.fishGen(F, C.fishPhotos(PH, GM, CUR, F));
  X.c1.forEach(id => assert.ok(X.gen[id].views.wide.filter(p => p.e >= 4).length >= 5, `${id}: fewer than 5 very easy photos in the game`));
});

test('juvenile classes: every circle-1 entry classed, with sources, as in the source file (research note of 2026-11-04)', () => {
  const c1 = F.teach.filter(t => t.level === 1 && t.circle === 1 && !t.wink),
    SJ = Object.fromEntries(SRC.teach.map(t => [t.id, t.juv]));
  c1.forEach(t => {
    const j = t.juv;
    assert.ok(j && ['A', 'B', 'C', 'mixed', 'ns'].includes(j.cls), `${t.id}: juvenile class`);
    assert.deepStrictEqual(j, SJ[t.id], `${t.id}: fish.json juv differs from tools/fish_source.json`);
    if (j.cls !== 'ns') assert.ok((j.src || []).length && j.src.every(u => /^https:\/\//.test(u)), `${t.id}: sources`);
    if (j.cls === 'mixed') assert.ok((j.early || []).length + (j.late || []).length, `${t.id}: mixed without genera`);
    // Mimicry is a hypothesis (Pierre): never stated as a fact.
    assert.ok(!/\bmimic/i.test(JSON.stringify(j)), `${t.id}: mimicry stated as a fact`);
    // early / late name genera or species of the entry.
    const names = t.species.flatMap(id => SPN.get(id) || []);
    [...(j.early || []), ...(j.late || [])].forEach(x =>
      assert.ok(
        names.some(n => n === x || n.startsWith(x + ' ')),
        `${t.id}: ${x} is no species or genus of the entry`
      )
    );
  });
  assert.deepStrictEqual(
    c1.filter(t => t.juv.cls === 'A').map(t => t.name),
    ['Spadefish', 'Sweetlips', 'Boxfish']
  );
  assert.deepStrictEqual(
    c1.filter(t => t.juv.cls === 'B').map(t => t.name),
    ['Parrotfish', 'Emperor']
  );
  ['t04', 't14'].forEach(id => assert.match(c1.find(t => t.id === id).juv.by, /^Pierre, 2026-11-04/));
});

test('fish-photos.json (the stopgap game photos) shows only species in the game', () => {
  // A species that leaves the game (e.g. circle 3 needs "confirmed near Dauin", 2026-11-03) leaves the quiz's photos too.
  const P = read('fish-photos.json').photos;
  Object.entries(P).forEach(([t, L]) =>
    L.forEach(p => assert.ok(p.sp && SP.get(p.sp) && SP.get(p.sp).circle, `${t} ${p.f}: ${p.t} (${p.sp}) is not in the game`))
  );
});

// Curated common names, the proposal (Pierre, 2026-11-04: 1 to 3 per species; docs/FISH_PATH.md "Common names";
// tools/fish_common.py): every game species has 1 to 3 names, the PDF's first and as written (rule C1), each with its
// sources, no two spellings of one name listed apart, and the file is what the selection gives.
test('common names: a PDF slip shows the FishBase spelling, the PDF form accepted; no third rule', () => {
  const P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'fish_common.json'), 'utf8')).species;
  assert.strictEqual(P.s132.names[0].name, "Russell's snapper");
  assert.ok(P.s132.names[0].alt.includes('Russelss’s snapper'));
  assert.strictEqual(P.s008.names[0].name, 'Eastern triangular butterflyfish');
  assert.ok(P.s008.names[0].alt.includes('Eastern triangular'));
});

test('common names proposal: 1 to 3 per game species, the PDF name first, sourced, as the selection gives it', () => {
  const P = read('tools/fish_common.json').species;
  const norm = n => n.toLowerCase().replace(/[\s\-‐‑'’`]/g, '');
  F.species
    .filter(s => s.circle)
    .forEach(s => {
      const p = P[s.id];
      assert.ok(p, `${s.id} ${s.name}: no proposal`);
      assert.strictEqual(p.sp, s.name);
      assert.ok(p.names.length >= 1 && p.names.length <= 3, `${s.name}: ${p.names.length} names`);
      // The PDF name first, as written; a PDF name flagged as a likely slip (check) shows FishBase's spelling, the PDF form
      // still accepted when typed (Pierre, 2026-11-05).
      if (s.common && !(s.check && (p.names[0].alt || []).includes(s.common)))
        assert.strictEqual(p.names[0].name, s.common, `${s.name}: the PDF name first, as written`);
      else if (s.common) assert.ok(p.names[0].alt.includes(s.common), `${s.name}: the PDF form accepted when typed`);
      p.names.forEach(n => assert.ok(n.from.length, `${s.name}: ${n.name} has no source`));
      const keys = p.names.map(n => norm(n.name));
      assert.strictEqual(new Set(keys).size, keys.length, `${s.name}: a name listed twice`);
    });
  const r = require('child_process').spawnSync('python3', [path.join(__dirname, '..', 'tools', 'fish_common.py'), '--check'], {
    encoding: 'utf8'
  });
  assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
});

// Codex review #522: FishBase's main name counts as FishBase evidence even with no comnames record (Chromis agilis); a
// name accepted as a spelling (alt) counts in the shared-name check (Dascyllus trimaculatus' "Three spot damsel" is
// Pomacentrus tripunctatus' PDF name); a spelling that links two groups merges them (Antennarius striatus).
test('common names proposal: FishBase main name, shared spellings, linked spellings', () => {
  const P = read('tools/fish_common.json').species;
  const norm = n => n.toLowerCase().replace(/[\s\-‐‑'’`]/g, '');
  const keys = p => p.names.flatMap(n => [n.name, ...(n.alt || [])]).map(norm);
  assert.ok(keys(P.s088).includes('agilechromis'), 'Chromis agilis: Agile chromis proposed');
  assert.ok(!keys(P.s084).includes('threespotdamsel'), 'Dascyllus trimaculatus: no spelling of another species’ name');
  const ant = P.s386.names.find(n => [n.name, ...(n.alt || [])].map(norm).includes('striateanglerfish'));
  assert.ok(
    ant && [ant.name, ...(ant.alt || [])].map(norm).includes('stripedangler'),
    'Antennarius striatus: one name, its spellings merged'
  );
});

// The game's units (Pierre, 2026-11-06 13:04 and 13:38; docs/reviews/2026-11-06-fish-units-plan.md): the book's
// families, then genera and species; the IMR course a tag (imr: IMR's name) on the families and genera it teaches.
test('families: the book’s, every game species in exactly one, Amphiprion in the Damselfishes, Diploprion in the Soapfishes', () => {
  const FAM = new Map(F.families.map(f => [f.id, f])),
    GEN = new Map(F.genera.map(g => [g.id, g])),
    labels = new Set(SRC.keys.find(k => k.id === SRC.deploy.key).groups.flatMap(g => g.labels.map(l => l[0])));
  assert.strictEqual(FAM.size, F.families.length, 'family ids unique');
  F.families.forEach(f => {
    assert.match(f.id, /^f:[A-Za-z]+$/, f.id + ': letters only after f:');
    assert.ok(f.sci.length, f.id + ': its scientific names');
    assert.ok(labels.has(f.name) || f.wink, f.id + ': a label of the key in force (or a wink with none)');
    f.genera.forEach(g => assert.strictEqual(GEN.get(g).family, f.id, g + ' in ' + f.id));
  });
  const seen = new Map();
  F.families.forEach(f => f.species.forEach(s => (assert.ok(!seen.has(s), s + ' in two families'), seen.set(s, f.id))));
  GAME.forEach(s => {
    assert.strictEqual(seen.get(s.id), s.family, s.name + ': in its family');
    assert.strictEqual(s.genus, 'g:' + s.name.split(' ')[0], s.name + ': its genus, the PDF name’s first word');
    assert.ok(GEN.get(s.genus).species.includes(s.id), s.name + ' in its genus');
  });
  assert.strictEqual(seen.size, GAME.length, 'every game species placed');
  const fam = n => SP.get(F.species.find(s => s.name === n).id).family;
  assert.strictEqual(fam('Amphiprion ocellaris'), 'f:Damselfishes');
  assert.strictEqual(fam('Diploprion bifasciatum'), 'f:Soapfishes');
  assert.strictEqual(fam('Saurida gracilis'), 'f:Lizardfishes');
  assert.deepStrictEqual(FAM.get('f:Lizardfishes').sci, ['Synodontidae', 'Harpadontidae']);
  assert.strictEqual(F.families.filter(f => f.circle === 1).length, 28, '28 families in circle 1');
});

test('the IMR tag: IMR’s name on the 27 families and the genera IMR names; the Soapfishes taught with the Groupers', () => {
  const tagged = F.families.filter(f => f.imr);
  assert.deepStrictEqual(
    tagged.map(f => f.imr),
    IMR27,
    'one family per IMR entry, in IMR order'
  );
  tagged.forEach(f => assert.strictEqual(f.circle, 1, f.id));
  const by = Object.fromEntries(F.families.map(f => [f.id, f]));
  assert.strictEqual(by['f:Damselfishes'].imr, 'Damselfish');
  assert.deepStrictEqual(by['f:Damselfishes'].sl, [7, 8, 9]);
  assert.strictEqual(by['f:Soapfishes'].imr, undefined);
  assert.strictEqual(by['f:Soapfishes'].imrWith, 'Groupers');
  assert.deepStrictEqual(
    by['f:Butterflyfishes'].look.map(l => l[0]),
    ['f:Angelfishes'],
    'IMR look-alikes as family ids'
  );
  const g = Object.fromEntries(F.genera.filter(x => x.imr).map(x => [x.name, x.imr]));
  assert.deepStrictEqual(g, {
    Dascyllus: 'Dascyllus',
    Pomacentrus: 'Pomacentrus',
    Chromis: 'Chromis',
    Amphiprion: 'Anemonefish',
    Heniochus: 'Bannerfish',
    Zebrasoma: 'Surgeonfish',
    Ctenochaetus: 'Surgeonfish',
    Acanthurus: 'Surgeonfish',
    Naso: 'Unicornfish'
  });
});

// Pierre's declared look-alike groups of families (2026-11-06, from experience: tools/fish_source.json look): every pair
// of a group a look-alike both ways, its source beside IMR's in lsrc; they seed the traps and the confusion groups until
// pooled fish answers exist (rule L7). An id that is not a family stops the build.
test('declared look-alikes: Pierre’s family groups both ways, sourced; an unknown family stops the build', () => {
  const by = Object.fromEntries(F.families.map(f => [f.id, f])),
    groups = SRC.look.find(d => d.src === 'Pierre, 2026-11-06').groups;
  assert.deepStrictEqual(groups, [
    ['f:Butterflyfishes', 'f:Angelfishes'],
    ['f:Snappers', 'f:CoralBreams', 'f:Emperors'],
    ['f:Parrotfishes', 'f:Wrasses'],
    ['f:Soldierfishes', 'f:Squirrelfishes', 'f:Cardinalfishes'],
    ['f:Triggerfishes', 'f:Filefishes']
  ]);
  groups.forEach(g =>
    g.forEach(a =>
      g
        .filter(b => b !== a)
        .forEach(b => {
          assert.ok(
            (by[a].look || []).some(l => l[0] === b),
            `${a} looks like ${b}`
          );
          assert.match(by[a].lsrc[b], /Pierre, 2026-11-06/, `${a} → ${b} sourced`);
        })
    )
  );
  assert.strictEqual(by['f:Butterflyfishes'].lsrc['f:Angelfishes'], 'IMR fish presentation, slide 10 and Pierre, 2026-11-06');
  assert.match(by['f:Wrasses'].lsrc['f:Parrotfishes'], /some wrasse species only/);
  assert.strictEqual(by['f:Lizardfishes'].lsrc['f:Sandperches'], 'IMR fish presentation, slide 48', 'an IMR-only pair keeps IMR alone');
  F.families.forEach(f => (f.look || []).forEach(([b]) => assert.ok(by[b] && f.lsrc && f.lsrc[b], `${f.id} → ${b} has a source`)));
  const bad = clone(SRC);
  bad.look[0].groups.push(['f:Butterflyfishes', 'f:Nofishes']);
  const r = regroupCheck(bad);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /f:Nofishes is not a family/);
});
