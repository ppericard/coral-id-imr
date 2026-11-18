require('./slot.js').testGuard();
// The instance's layer as its own files (docs/reviews/2026-11-14-sheet-overlay-design.md; tools/instance.py): tools/instance.json names the instance and its layer files; the build lays them on the sources,
// and fish.json and data.json are exactly what the two layers give, byte for byte. Needs python3, like the other checks.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const INST = read('tools/instance.json'),
  F = read('fish.json'),
  BASE = read('tools/fish_source.json'),
  FL = read(INST.layer.fish),
  CL = read(INST.layer.coral),
  RAW = read('data.json');
const clone = o => JSON.parse(JSON.stringify(o));
const run = (args, opts = {}) => {
  const r = spawnSync('python3', args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, ...opts});
  return {status: r.status, out: (r.stdout || '') + (r.stderr || '')};
};
const py = code =>
  execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1 << 26
  });
// A temporary file holding o, removed after f.
const withTmp = (o, f) => {
  const tmp = path.join(os.tmpdir(), `instance.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmp, JSON.stringify(o));
  try {
    return f(tmp);
  } finally {
    fs.unlinkSync(tmp);
  }
};
const regroup = (layer, base) =>
  withTmp(layer || FL, lp => withTmp(base || BASE, bp => run(['tools/build_fish.py', '--regroup', '--check', '--layer', lp, '--src', bp])));

test('tools/instance.json names the instance (id, name), its centre and a layer file per subject', () => {
  assert.strictEqual(INST.id, 'imr');
  assert.ok(INST.name && INST.centre && INST.centre.radiusKm > 0);
  assert.deepStrictEqual(Object.keys(INST.layer).sort(), ['coral', 'fish']);
  Object.values(INST.layer).forEach(p => assert.ok(fs.existsSync(path.join(ROOT, p)), p));
  const r = run(['tools/instance.py', '--check']);
  assert.strictEqual(r.status, 0, r.out);
});

test('fish: the layer holds every circle, cue, look line, phase line, start and look group; the base none of them', () => {
  const nodes = BASE.teach.flatMap(t => [t, ...(t.sub || [])]);
  assert.ok(!('start' in BASE) && !('look' in BASE), 'start and look are the layer’s');
  BASE.teach.forEach(t => ['circle', 'cues', 'look', 'phase'].forEach(k => assert.ok(!(k in t), `${t.id} ${k} in the base`)));
  BASE.teach.flatMap(t => t.sub || []).forEach(u => ['cues', 'look', 'phase'].forEach(k => assert.ok(!(k in u), `${u.id} ${k}`)));
  BASE.teach.forEach(t => assert.ok([1, 2, 3].includes((FL.nodes[t.id] || {}).circle), `${t.id}: its circle in the layer`));
  const ids = new Set(nodes.map(t => t.id));
  Object.keys(FL.nodes).forEach(id => assert.ok(ids.has(id), `layer node ${id} in the base`));
  assert.ok(FL.start.length && FL.look.length);
});

test('fish: fish.json carries the layer’s fields as the build writes them (the composed source, read by key)', () => {
  const src = JSON.parse(run(['tools/instance.py', '--fish-source']).out),
    by = new Map(src.teach.flatMap(t => [t, ...(t.sub || [])]).map(t => [t.id, t]));
  F.teach.forEach(t => {
    assert.strictEqual(t.circle, by.get(t.id).circle, `${t.id} circle`);
    [t, ...(t.sub || [])].forEach(u =>
      ['cues', 'look', 'phase'].forEach(k => {
        const v = by.get(u.id)[k];
        assert.deepStrictEqual(u[k], v && v.length ? v : undefined, `${u.id} ${k}`);
      })
    );
  });
  assert.deepStrictEqual(F.start, src.start);
});

test('fish.json byte for byte: the layer laid again offline (cues, look, phase taken off and put back, start, the families)', () => {
  let r = run(['tools/build_fish.py', '--regroup', '--check']);
  assert.strictEqual(r.status, 0, r.out);
  r = run(['tools/build_fish.py', '--commonness', '--check']);
  assert.strictEqual(r.status, 0, r.out);
  // Not vacuous: a changed cue, phase or start no longer gives fish.json.
  const cue = clone(FL);
  cue.nodes.t01a.cues[0] = 'A cue of another instance';
  r = regroup(cue);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /is not as key .* gives it, with the instance's layer/);
  const phase = clone(FL);
  delete phase.nodes.t08.phase;
  assert.match(regroup(phase).out, /is not as key/);
  const start = clone(FL);
  start.start = [...start.start].reverse();
  assert.match(regroup(start).out, /is not as key/);
  // A circle moves species and their presence test: the full build, never the offline modes.
  const circ = clone(FL);
  circ.nodes.t28.circle = 3;
  r = regroup(circ);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /circles changed in the instance's layer.*\n.*t28/);
  // A node fish.json leaves out (every species out) moved below circle 3: the full build might keep it.
  assert.ok(!F.teach.some(t => t.id === 't75') && FL.nodes.t75.circle === 3, 't75 Eagle rays: out of fish.json, circle 3');
  const out = clone(FL);
  out.nodes.t75.circle = 1;
  r = regroup(out);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /t75 Eagle rays: not in fish\.json \(every species out\), circle 1 in the layer/);
});

test('fish: a base that still carries a field of the layer, or a layer node the base does not hold, stops the build', () => {
  const stale = clone(BASE);
  stale.teach[0].cues = ['an edit made in the old place'];
  let r = regroup(null, stale);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /tools\/fish_source\.json t01 cues: the instance's/);
  const old = clone(BASE);
  old.start = ['t01'];
  assert.match(regroup(null, old).out, /tools\/fish_source\.json start: the instance's/);
  const ghost = clone(FL);
  ghost.nodes.t99 = {cues: ['x']};
  r = regroup(ghost);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /layer node t99: no teaching node/);
  const sub = clone(FL);
  sub.nodes.t01a.circle = 2;
  assert.match(regroup(sub).out, /layer node t01a circle: not a field of the layer/);
});

test('coral: the layer holds imrg, each genus’s ig, imr and mn, and the lecture’s pairs; data.json is the sources plus the layer, byte for byte', () => {
  assert.deepStrictEqual(Object.keys(CL.gen), Object.keys(RAW.gen));
  Object.values(CL.gen).forEach(x => assert.deepStrictEqual(Object.keys(x), ['ig', 'imr', 'mn']));
  assert.deepStrictEqual(Object.keys(CL).sort(), ['_doc', 'gen', 'imrg', 'pairs']);
  assert.strictEqual(CL.imrg.length, 11);
  const out = JSON.parse(
    py(`from instance import coral_strip, coral_compose, load_layer
from datajson import dumps, load
s = open('data.json', encoding='utf-8').read()
d, lay = load(), load_layer('coral')
bare = coral_strip(d)
other = json.loads(json.dumps(lay)); other['gen']['Acropora']['mn'] = 'Another instance'
fewer = json.loads(json.dumps(lay)); del fewer['gen']['Acropora']['mn']; del fewer['imrg']
gone = coral_compose(d, fewer)
print(json.dumps([
  'imrg' in bare or any(k in r for r in bare['gen'].values() for k in ('ig', 'imr', 'mn')),
  dumps(coral_compose(bare, lay)) == s,
  dumps(coral_compose(bare, other)) == s,
  dumps(coral_compose(d, lay)) == s,
  ['mn' in gone['gen']['Acropora'], 'imrg' in gone, 'mn' in coral_compose(d, {})['gen']['Pocillopora']],
]))`)
  );
  // A field the layer stops giving (or no layer at all) leaves data.json too.
  assert.deepStrictEqual(
    out,
    [false, true, false, true, [false, false, false]],
    '[the sources hold none of them, sources + layer = data.json, another layer differs, data.json + layer = data.json, fields left out of the layer go]'
  );
  const r = run(['tools/datajson.py', '--check']);
  assert.strictEqual(r.status, 0, r.out);
  assert.match(r.out, /data\.json layout OK, as its layers give it/);
});

// The look-alike pairs of coral data D as the game reads them (model.js isLook: either genus's look lists the other), from
// gen and x.gen: {"A|B": {A: [lists B, A's lsrc line for B], B: [...]}}.
const LECTURE = /^(IMR Lecture 6:|Same IMR lecture group:)/;
const pairsOf = D => {
  const G = {...D.x.gen, ...D.gen},
    out = {};
  Object.entries(G).forEach(([a, r]) =>
    (r.look || []).forEach(b => {
      const [x, y] = [a, b].sort();
      out[`${x}|${y}`] = Object.fromEntries(
        [x, y].map(g => [g, [((G[g] || {}).look || []).includes(g === x ? y : x), ((G[g] || {}).lsrc || {})[g === x ? y : x]]])
      );
    })
  );
  return out;
};
const looks = D => Object.fromEntries([...Object.entries(D.x.gen), ...Object.entries(D.gen)].map(([g, r]) => [g, [r.look, r.lsrc]]));

test('coral: the IMR lecture’s pairs are the layer’s, the Coral Finder’s the sources’; the pairs in play are the same, with the same sources', () => {
  const [bare, back, edition] = JSON.parse(
    py(`from instance import coral_strip, coral_compose, load_layer
from datajson import load
d, lay = load(), load_layer('coral')
bare = coral_strip(d)
print(json.dumps([bare, coral_compose(bare, lay), coral_compose(bare, {})]))`)
  );
  // Before and after: the sources plus the layer give every genus's look and lsrc as data.json has them, order included.
  assert.strictEqual(JSON.stringify(looks(back)), JSON.stringify(looks(RAW)));
  const all = pairsOf(RAW),
    lecture = Object.keys(CL.pairs),
    finder = Object.keys(pairsOf(bare));
  assert.deepStrictEqual(pairsOf(back), all);
  // The split: 84 pairs, 13 the lecture's (6 in its words, 7 from its groups), 71 the Coral Finder's.
  assert.deepStrictEqual(
    [Object.keys(all).length, lecture.length, lecture.filter(k => /^IMR/.test(CL.pairs[k].src)).length, finder.length],
    [84, 13, 6, 71]
  );
  assert.deepStrictEqual(
    [...lecture, ...finder].sort(),
    Object.keys(all).sort(),
    'the lecture’s and the Coral Finder’s pairs are all the pairs'
  );
  assert.ok(!lecture.some(k => finder.includes(k)), 'no pair in both');
  // Each lecture pair keeps its source on both genera and its directions; the sources hold no lecture line.
  lecture.forEach(k => {
    const [a, b] = k.split('|'),
      x = CL.pairs[k];
    assert.match(x.src, LECTURE, k);
    assert.deepStrictEqual(all[k], {[a]: [a in x.look, x.src], [b]: [b in x.look, x.src]}, k);
    Object.entries(x.look).forEach(([g, i]) => assert.strictEqual(RAW.gen[g].look[i], g === a ? b : a, `${k}: ${g}'s look at ${i}`));
  });
  Object.entries(looks(bare)).forEach(([g, [, ls]]) =>
    Object.entries(ls || {}).forEach(([o, s]) => assert.doesNotMatch(s, LECTURE, `${g} lsrc ${o}: a lecture line left in the sources`))
  );
  // An edition without the IMR layer plays the Coral Finder's pairs alone, each with its Coral Finder line.
  assert.deepStrictEqual(Object.keys(pairsOf(edition)).sort(), [...finder].sort());
  Object.entries(pairsOf(edition)).forEach(([k, s]) =>
    Object.values(s).forEach(
      ([, line]) => line && assert.match(line, /^(Coral Finder|Same Coral Finder box|IMR Lecture 6 and Coral Finder)/, k)
    )
  );
  assert.ok(!['Galaxea', 'Lobactis'].some(g => edition.gen[g].look.length), 'their look-alikes are all the lecture’s');
});

test('coral: writing data.json with a changed field of the layer is refused (the edit belongs in the layer file)', () => {
  const out = py(`from instance import coral_layered
from datajson import load
d = load()
d['gen']['Acropora']['imr'] = d['gen']['Acropora']['imr'] + ['an edit made in data.json']
try:
    coral_layered(d)
    print('written')
except SystemExit as e:
    print(e)`);
  assert.match(out, /gen Acropora imr differ from tools\/instances\/imr\/coral\.json/);
  // A lecture pair's line or direction edited in data.json, the same.
  const pair = py(`from instance import coral_layered
from datajson import load
d = load()
d['gen']['Galaxea']['lsrc']['Echinopora'] = 'an edit made in data.json'
d['gen']['Pocillopora']['look'].remove('Stylophora')
try:
    coral_layered(d)
    print('written')
except SystemExit as e:
    print(e)`);
  assert.match(pair, /gen Galaxea lsrc Echinopora, gen Pocillopora look Stylophora differ from/);
  // Unchanged data passes and comes back the same.
  assert.strictEqual(
    py(`from instance import coral_layered\nfrom datajson import load\nd = load()\nprint(coral_layered(d) == d)`).trim(),
    'True'
  );
});
