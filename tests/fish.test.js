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
    } else assert.ok(p.ph === false || /no circle/.test(s.out), `${s.name}: out (${s.out}) but confirmed`);
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
  F.teach.forEach(t =>
    assert.deepStrictEqual(
      t.species,
      [...t.species].sort((a, b) => SP.get(a).r - SP.get(b).r),
      t.name
    )
  );
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
// judging/FISH.md "Caps", the same rule as tools/fish_judge.py cap().
const CODE = /^([pohtd])([01])([gdn])([0-3])([smb])([lms])([1smx])([jca]*)([1-5])$/;
const capOf = (code, phase, juvOk) => {
  const [, v, w, l, k, , , n, fl0, e0] = code.match(CODE),
    fl = fl0 + (phase ? 'p' : '');
  let e = +e0;
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
test('judged photos: every circle-1 game photo judged with a valid code, written into fish-photos.json with its caps', () => {
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
  c1.forEach(tid => PH[tid].forEach(p => assert.ok(p.f in codes, `${tid} ${p.f}: not judged`)));
  Object.entries(PH).forEach(([tid, L]) =>
    L.forEach(p => {
      if (!(p.f in codes)) return assert.ok(p.e === undefined && p.jt === undefined && !p.c, `${p.f}: e without a judgement`);
      assert.strictEqual(codes[p.f][0], tid, `${p.f}: judged under another entry`);
      assert.deepStrictEqual(
        {e: p.e, jt: p.jt},
        capOf(codes[p.f][1], dim.has(tid), juvEarly(tid, p)),
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
