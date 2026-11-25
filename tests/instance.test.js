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

test('fish.json byte for byte: the layer laid again offline (slides, cues, look, phase, tag and mark taken off and put back, start, the families)', () => {
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

// The fish part of the IMR content split: the presentation's slides (teaching nodes, sub-entries, species), the IMR tag and
// the dive-sign mark are the layer's; the base keeps the other sources' tags (pdf, diver, wink).
test('fish: the presentation’s slides, the IMR tag and the dive-sign mark are the layer’s; the base holds none of them', () => {
  const sub = BASE.teach.flatMap(t => t.sub || []),
    SRCS = ['pdf', 'diver', 'wink'];
  [...BASE.teach, ...sub].forEach(u => ['sl', 'sign'].forEach(k => assert.ok(!(k in u), `${u.id} ${k} in the base`)));
  BASE.species.forEach(s => assert.ok(!('sl' in s), `${s.id} sl in the base`));
  BASE.teach.forEach(t => assert.ok(!('src' in t) || SRCS.includes(t.src), `${t.id}: base src ${t.src}`));
  sub.forEach(u => assert.ok(!('src' in u), `${u.id} src`));
  // Every entry has one tag, the layer's imr or the base's other source.
  const tagged = Object.entries(FL.nodes).filter(([, x]) => 'src' in x);
  tagged.forEach(([id, x]) => assert.strictEqual(x.src, 'imr', id));
  BASE.teach.forEach(t => assert.ok('src' in t !== ((FL.nodes[t.id] || {}).src === 'imr'), `${t.id}: one tag`));
  assert.strictEqual(tagged.length, 27, 'the 27 entries of the IMR presentation');
  assert.deepStrictEqual(
    tagged.map(([id]) => id),
    F.teach.filter(t => t.src === 'imr').map(t => t.id)
  );
  assert.deepStrictEqual(
    Object.keys(FL.species),
    BASE.species.map(s => s.id).filter(id => id in FL.species),
    'the layer’s species are the base’s, in its order'
  );
  Object.values(FL.species).forEach(x =>
    Object.keys(x).forEach(k => assert.ok(['common', 'sec', 'pdf', 'cs', 'src', 'sl'].includes(k), k))
  );
  const withSl = Object.entries(FL.nodes).filter(([, x]) => x.sl);
  assert.ok(withSl.length >= 27 && withSl.every(([, x]) => x.sl.every(n => Number.isInteger(n) && n > 0)), 'slide numbers');
  // fish.json carries them as the build writes them, species included.
  const src = JSON.parse(run(['tools/instance.py', '--fish-source']).out),
    by = new Map(src.teach.flatMap(t => [t, ...(t.sub || [])]).map(t => [t.id, t])),
    sp = new Map(src.species.map(s => [s.id, s]));
  F.teach.forEach(t => {
    assert.strictEqual(t.src, by.get(t.id).src, `${t.id} src`);
    assert.strictEqual(t.sign, by.get(t.id).sign, `${t.id} sign`);
    [t, ...(t.sub || [])].forEach(u => assert.deepStrictEqual(u.sl, by.get(u.id).sl, `${u.id} sl`));
  });
  F.species.forEach(s => assert.strictEqual(s.sl, sp.get(s.id).sl, `${s.id} sl`));
  assert.strictEqual(F.species.filter(s => s.sl).length, Object.values(FL.species).filter(x => x.sl).length);
});

// The PDF's species fields (the IMR reference list, the EventMeasure PDF) and the presentation's own species mark are the
// layer's: the base keeps the common names of the species of the other sources (dauin, wink, slides).
test('fish: the PDF’s species fields (common name, section, pages, cheatsheet rank) and src slides are the layer’s; the deployment’s key is instance.json’s', () => {
  const PDF = BASE.species.filter(s => (FL.species[s.id] || {}).pdf);
  assert.strictEqual(PDF.length, 366, 'the species the PDF lists: the layer gives them their pages');
  BASE.species.forEach(s => {
    ['sec', 'pdf', 'cs', 'sl'].forEach(k => assert.ok(!(k in s), `${s.id} ${k} in the base`));
    assert.ok(!('src' in s) || ['dauin', 'wink'].includes(s.src), `${s.id}: base src ${s.src}`);
    assert.strictEqual('common' in s, !PDF.includes(s), `${s.id}: the base keeps the common name of a species off the PDF only`);
  });
  PDF.forEach(s => {
    const x = FL.species[s.id];
    assert.ok(x && x.pdf && x.sec && x.common, `${s.id}: its PDF fields in the layer`);
    assert.deepStrictEqual(
      Object.keys(x).filter(k => k !== 'sl'),
      x.cs ? ['common', 'sec', 'pdf', 'cs'] : ['common', 'sec', 'pdf'],
      s.id
    );
  });
  const ranked = Object.entries(FL.species).filter(([, x]) => x.cs);
  assert.strictEqual(ranked.length, 24, 'the 24 species of the cheatsheet');
  assert.deepStrictEqual(
    ranked.map(([, x]) => x.cs).sort((a, b) => a - b),
    Array.from({length: 24}, (_, i) => i + 1)
  );
  const slides = Object.entries(FL.species).filter(([, x]) => x.src);
  assert.deepStrictEqual(
    slides.map(([id, x]) => [id, x.src, 'pdf' in x]),
    [
      ['s367', 'slides', false],
      ['s368', 'slides', false]
    ]
  );
  Object.entries(FL.species).forEach(([id, x]) => assert.ok(x.pdf || x.src || x.sl, `${id}: a layer species gives something`));
  // fish.json carries them as the build writes them (the composed source, read by key).
  const src = JSON.parse(run(['tools/instance.py', '--fish-source']).out),
    sp = new Map(src.species.map(s => [s.id, s]));
  F.species.forEach(s => {
    const b = sp.get(s.id);
    assert.strictEqual(s.common, b.common || '', `${s.id} common`);
    ['src', 'sec', 'pdf', 'cs', 'sl'].forEach(k => assert.strictEqual(s[k], b[k], `${s.id} ${k}`));
  });
  assert.strictEqual(F.species.filter(s => s.pdf).length, 366);
  // The deployment's key is tools/instance.json's, laid as deploy.key; its region (read by nothing) is gone.
  assert.ok(!('deploy' in BASE) && typeof INST.key === 'string' && !('region' in INST));
  assert.deepStrictEqual(src.deploy, {key: INST.key});
  assert.ok(
    BASE.keys.some(k => k.id === INST.key),
    'the key in force is one of the source’s keys'
  );
});

test('fish: a changed PDF field or species mark of the layer no longer gives fish.json, a changed list stops the offline modes; a base or layer out of place stops the build', () => {
  const t = "is not as key .* gives it, with the instance's layer";
  const list =
    /the IMR list changed in the instance's layer \(pdf, cs, src\): run the full build \(python3 tools\/build_fish\.py\)\n\s+s\d+ [^\n]*: (pdf|cs|src) /;
  // The common name, the section and the slides' mark are laid again offline: a change shows as a difference.
  const common = clone(FL);
  common.species.s001.common = 'Another butterflyfish';
  assert.match(regroup(common).out, new RegExp(t));
  const sec = clone(FL);
  sec.species.s002.sec = 'POMACANTHIDAE';
  assert.match(regroup(sec).out, new RegExp(t));
  const mark = clone(FL);
  delete mark.species.s367.src;
  assert.match(regroup(mark).out, new RegExp(t));
  const sl = clone(FL);
  delete sl.species.s057.sl;
  assert.match(regroup(sl).out, new RegExp(t));
  // The list (pdf) confirms a species near Dauin and the cheatsheet (cs) ranks it: the full build, never the offline modes.
  const pdf = clone(FL);
  pdf.species.s002.pdf = '7';
  assert.match(regroup(pdf).out, list);
  const drop = clone(FL);
  delete drop.species.s044.cs;
  assert.match(regroup(drop).out, list);
  const rank = clone(FL);
  rank.species.s045.cs = 40;
  assert.match(regroup(rank).out, list);
  // The base holds none of them (an edit made in the old place, a merge); its common name is its own only off the list.
  for (const [k, v] of [
    ['sec', 'CHAETODONTIDAE'],
    ['pdf', '6'],
    ['cs', 3],
    ['src', 'slides']
  ]) {
    const stale = clone(BASE);
    stale.species[0][k] = v;
    assert.match(regroup(null, stale).out, new RegExp(`tools/fish_source\\.json s001 ${k}: the instance's`), k);
  }
  const twice = clone(BASE);
  twice.species[0].common = 'a second name';
  assert.match(
    regroup(null, twice).out,
    /layer species s001 pdf: the common name of a species of the PDF is the layer's, tools\/fish_source\.json s001 gives one too/
  );
  const own = BASE.species.find(s => s.src === 'dauin');
  // The base's own src (dauin, wink) is not laid again offline, as before; the layer's slides is, and a change of it that
  // moves who needs near (a species fish.json has as dauin) stops the modes.
  const wink = clone(BASE);
  wink.species.find(s => s.id === own.id).src = 'wink';
  assert.strictEqual(regroup(null, wink).status, 0, 'the base’s dauin or wink is the base’s: fish.json keeps its own');
  const was = clone(BASE),
    now = clone(FL);
  delete was.species.find(s => s.id === own.id).src;
  now.species[own.id] = {src: 'slides'};
  assert.match(regroup(now, was).out, list);
  const layerCommon = clone(FL);
  layerCommon.species[own.id] = {common: 'x'};
  assert.match(regroup(layerCommon).out, new RegExp(`layer species ${own.id} common: only on a species of the PDF`));
  // The layer's own rules: the PDF's fields only with the pdf, the mark slides only on a species with no pdf and no other source.
  const lone = clone(FL);
  delete lone.species.s001.pdf;
  assert.match(
    regroup(lone).out,
    /layer species s001 common: only on a species of the PDF[^]*layer species s001 sec: only on a species of the PDF/
  );
  const both = clone(FL);
  both.species.s001.src = 'slides';
  assert.match(regroup(both).out, /layer species s001 src: only 'slides', on a species with no pdf/);
  const other = clone(FL);
  other.species.s367.src = 'pdf';
  assert.match(regroup(other).out, /layer species s367 src: only 'slides'/);
  const sourced = clone(FL);
  sourced.species[own.id] = {pdf: '3'};
  assert.match(
    regroup(sourced).out,
    new RegExp(`layer species ${own.id} pdf: a species of the PDF has no src in the base \\(it has 'dauin'\\)`)
  );
  const twoSrc = clone(FL);
  twoSrc.species[own.id] = {src: 'slides'};
  assert.match(regroup(twoSrc).out, new RegExp(`layer species ${own.id} src: only 'slides'`));
  // An edition without the layer has no PDF name, section, pages or rank on its species, and the other sources keep their name.
  const bare = JSON.parse(
    py(`from instance import fish_compose
print(json.dumps(fish_compose(json.load(open('tools/fish_source.json', encoding='utf-8')), {})))`)
  );
  assert.ok(bare.species.every(s => !('sec' in s) && !('pdf' in s) && !('cs' in s) && !(s.src === 'slides')));
  assert.strictEqual(bare.species.filter(s => !('common' in s)).length, 366, 'the species of the PDF have no common name');
  assert.ok(!('deploy' in bare), 'the key in force is the instance’s, not the layer’s');
});

// The IMR names and family spellings of the entries the layer tags, their sub-entries' names, and every entry's PDF
// sections are the layer's; the WoRMS mapping (ref, not) and the tree stay in the base.
test('fish: the IMR names, family spellings and PDF sections are the layer’s; the base keeps the tree and the WoRMS mapping', () => {
  const tagged = BASE.teach.filter(t => (FL.nodes[t.id] || {}).src === 'imr'),
    others = BASE.teach.filter(t => !tagged.includes(t));
  assert.strictEqual(tagged.length, 27, 'the 27 entries of the IMR presentation');
  tagged.forEach(t => {
    assert.ok(!('name' in t) && !('fam' in t), `${t.id}: name and fam in the base`);
    (t.sub || []).forEach(u => assert.ok(!('name' in u), `${u.id} name in the base`));
  });
  others.forEach(t => assert.ok(t.name && t.fam, `${t.id}: the base keeps the name and family of an entry that is not IMR's`));
  BASE.teach.forEach(t => assert.ok(!('pdf' in t) && t.ref && t.ref.length, `${t.id}: no pdf in the base, its ref there`));
  // The layer holds them: name and fam on the 27 only, their sub-entries' names, a pdf on every entry that has a section.
  Object.entries(FL.nodes).forEach(([id, x]) => {
    if ('name' in x || 'fam' in x)
      assert.ok(
        tagged.some(t => t.id === id || (t.sub || []).some(u => u.id === id)),
        `${id}: name of an entry that is not IMR's`
      );
    if ('fam' in x || 'pdf' in x)
      assert.ok(
        BASE.teach.some(t => t.id === id),
        `${id}: fam or pdf on a sub-entry`
      );
  });
  tagged.forEach(t => {
    const x = FL.nodes[t.id];
    assert.ok(x.name && x.fam && x.pdf && x.pdf.length, `${t.id}: name, fam and pdf in the layer`);
    (t.sub || []).forEach(u => assert.ok(FL.nodes[u.id].name, `${u.id}: its name in the layer`));
    assert.deepStrictEqual(
      Object.keys(x).filter(k => ['circle', 'src', 'sign', 'name', 'fam', 'pdf', 'sl'].includes(k)),
      ['circle', 'src', ...(x.sign === false ? ['sign'] : []), 'name', 'fam', 'pdf', 'sl'],
      `${t.id}: the layer's order`
    );
  });
  assert.strictEqual(Object.values(FL.nodes).filter(x => 'pdf' in x).length, 43, 'the entries with a section in the PDF');
  assert.strictEqual(Object.values(FL.nodes).filter(x => 'name' in x).length, 27 + 7, 'the 27 entries and their 7 sub-entries');
  // fish.json writes them as the composed source gives them (name, fam, and wfam when WoRMS holds other families).
  const src = JSON.parse(run(['tools/instance.py', '--fish-source']).out),
    by = new Map(src.teach.flatMap(t => [t, ...(t.sub || [])]).map(t => [t.id, t]));
  F.teach.forEach(t => {
    assert.strictEqual(t.name, by.get(t.id).name, `${t.id} name`);
    assert.strictEqual(t.fam, by.get(t.id).fam, `${t.id} fam`);
    (t.sub || []).forEach(u => assert.strictEqual(u.name, by.get(u.id).name, `${u.id} name`));
  });
  assert.ok(
    F.teach.some(t => t.wfam),
    'a family IMR spells otherwise than WoRMS keeps its WoRMS families (wfam)'
  );
  assert.deepStrictEqual(by.get('t42').pdf, ['MURAENIDAE'], 'an entry of another source with a section: its pdf from the layer');
});

test('fish: a changed name, family spelling or PDF section of the layer no longer gives fish.json; a base or layer out of place stops the build', () => {
  const t = "is not as key .* gives it, with the instance's layer";
  // A name or family is laid again offline, with the WoRMS families it differs from (wfam): a change shows as a difference.
  const name = clone(FL);
  name.nodes.t01.name = 'Damsel';
  assert.match(regroup(name).out, new RegExp(t));
  const sub = clone(FL);
  sub.nodes.t01a.name = 'Chromis damsels';
  assert.match(regroup(sub).out, new RegExp(t));
  // A genus name taken from a sub-entry's name (tools/fish_genus_names.json, from imr) needs that name: the build stops.
  const genus = clone(FL);
  genus.nodes.t01d.name = 'Clownfish';
  assert.match(regroup(genus).out, /g:Amphiprion: no IMR sub-entry Anemonefishes for it/);
  const fam = clone(FL);
  fam.nodes.t13.fam = 'Epinephelidae';
  assert.match(regroup(fam).out, new RegExp(t));
  const same = clone(FL);
  same.nodes.t02.fam = 'Pomacanthidae';
  assert.match(regroup(same).out, new RegExp(t));
  // A name the layer does not give falls back (the family's label in the key, the first reference's name for a sub-entry):
  // the build goes on, naming it as the key does, and fish.json differs.
  const bare = clone(FL);
  delete bare.nodes.t01.name;
  delete bare.nodes.t01a.name;
  const r = regroup(bare);
  assert.match(r.out, new RegExp(t));
  assert.doesNotMatch(r.out, /Traceback/);
  // The base holds none of them: an edit made in the old place (a merge), even where the layer gives no name.
  for (const [id, k, v] of [
    ['t01', 'name', 'Damselfish'],
    ['t01', 'fam', 'Pomacentridae'],
    ['t42', 'pdf', ['MURAENIDAE']],
    ['t28', 'pdf', ['SPHYRAENIDAE']]
  ]) {
    const stale = clone(BASE);
    stale.teach.find(x => x.id === id)[k] = v;
    assert.match(regroup(null, stale).out, new RegExp(`tools/fish_source\\.json ${id} ${k}: the instance's`), `${id} ${k}`);
  }
  const stalesub = clone(BASE);
  stalesub.teach[0].sub[0].name = 'Chromis';
  assert.match(regroup(null, stalesub).out, /tools\/fish_source\.json t01a name: the instance's/);
  const omitted = clone(FL);
  delete omitted.nodes.t05.name;
  const given = clone(BASE);
  given.teach.find(x => x.id === 't05').name = 'Moorish Idol';
  assert.match(regroup(omitted, given).out, /tools\/fish_source\.json t05 name: the instance's/);
  // The names of an entry that is not IMR's are the base's: the layer cannot give them.
  const other = clone(FL);
  other.nodes.t28.name = 'Barracudas';
  other.nodes.t28.fam = 'Sphyraenidae';
  assert.match(
    regroup(other).out,
    /layer node t28 name: only on an entry the layer tags[^]*layer node t28 fam: only on an entry the layer tags/
  );
  const orphan = clone(BASE),
    lone = clone(FL);
  orphan.teach.find(x => x.id === 't28').sub = [{id: 't28a', name: 'Sphyraena', ref: ['Sphyraena']}];
  lone.nodes.t28a = {name: 'Sphyraena'};
  assert.match(regroup(lone, orphan).out, /layer node t28a name: only on an entry the layer tags/);
  const subFam = clone(FL);
  subFam.nodes.t01a.fam = 'Pomacentridae';
  assert.match(regroup(subFam).out, /layer node t01a fam: not a field of the layer/);
  // An edition without the layer: no IMR name on the entries the tag marks, the others keep theirs, no section list.
  const barec = JSON.parse(
    py(`from instance import fish_compose
print(json.dumps(fish_compose(json.load(open('tools/fish_source.json', encoding='utf-8')), {})))`)
  );
  const imr = new Set(Object.keys(FL.nodes).filter(id => FL.nodes[id].src === 'imr'));
  barec.teach.forEach(u => {
    assert.strictEqual('name' in u, !imr.has(u.id), `${u.id}: a name unless IMR's`);
    assert.strictEqual('fam' in u, !imr.has(u.id), `${u.id}: a fam unless IMR's`);
    assert.ok(!('pdf' in u), `${u.id} pdf`);
    (u.sub || []).forEach(s => assert.strictEqual('name' in s, !imr.has(u.id), `${s.id}: a name unless its entry is IMR's`));
  });
});

test('fish: an entry with no IMR name takes its family’s label in the key in force, a sub-entry its first reference’s name', () => {
  // node_names (tools/build_fish.py) on fish.json's own reference tree: what the full build and the offline modes write.
  const got = JSON.parse(
    py(`import build_fish as b
o = json.load(open('fish.json', encoding='utf-8'))
base = json.load(open('tools/fish_source.json', encoding='utf-8'))
key = b.key_in_force({'deploy': {'key': json.load(open('tools/instance.json'))['key']}, 'keys': base['keys']})
tree = {int(a): n for a, n in o['ref'].items()}
out = {}
for t in o['teach']:
    out[t['id']] = b.node_names({}, t['ref'], key, tree, True)
    for u in t.get('sub', []):
        out[u['id']] = b.node_names({}, u['ref'], key, tree, False)
nokey = {t['id']: b.node_names({}, t['ref'], None, tree, True) for t in o['teach'] if t['id'] in ('t01', 't13')}
own = b.node_names({'name': 'X', 'fam': 'Y'}, o['teach'][0]['ref'], key, tree, True)
print(json.dumps([out, nokey, own]))`)
  );
  const [out, nokey, own] = got;
  assert.deepStrictEqual(out.t01, ['Damselfishes', 'Pomacentridae', null], 'the label of the key, the WoRMS family');
  assert.deepStrictEqual(out.t08[0], 'Parrotfishes', 'a subfamily label wins over its family’s');
  assert.deepStrictEqual(out.t13, ['Groupers', null, null], 'three WoRMS families: no fam of its own');
  assert.deepStrictEqual(out.t01d, ['Amphiprion', null, null], 'a sub-entry: its first reference’s name');
  assert.deepStrictEqual(nokey.t01, ['Pomacentridae', 'Pomacentridae', null], 'a region with no key: the WoRMS family');
  assert.strictEqual(nokey.t13[0], 'Epinephelidae', 'several families: the first reference’s name');
  assert.deepStrictEqual(own, ['X', 'Y', ['Pomacentridae']], 'the source’s own name and fam, and the WoRMS families when they differ');
  F.teach.forEach(t => assert.ok(out[t.id][0], `${t.id} has a name`));
});

test('fish: the key in force is the instance’s: composed as deploy.key, none without it', () => {
  const key = JSON.parse(
    py(`from instance import fish_compose
b = json.load(open('tools/fish_source.json', encoding='utf-8'))
print(json.dumps([fish_compose(b, {}, 'k').get('deploy'), fish_compose(b, {}).get('deploy')]))`)
  );
  assert.deepStrictEqual(key, [{key: 'k'}, null]);
});

test('fish: a changed slide, tag or mark of the layer no longer gives fish.json; a base or layer out of place stops the build', () => {
  const t = "is not as key .* gives it, with the instance's layer";
  const node = clone(FL);
  node.nodes.t01.sl = [7, 8];
  assert.match(regroup(node).out, new RegExp(t));
  const subSl = clone(FL);
  subSl.nodes.t06b.sl = [15];
  assert.match(regroup(subSl).out, new RegExp(t));
  const species = clone(FL);
  species.species.s001.sl = 11;
  assert.match(regroup(species).out, new RegExp(t));
  const nospecies = clone(FL);
  delete nospecies.species.s057.sl;
  assert.match(regroup(nospecies).out, new RegExp(t));
  const tag = clone(FL);
  ['src', 'name', 'fam'].forEach(k => delete tag.nodes.t05[k]);
  assert.match(regroup(tag).out, new RegExp(t));
  const names = clone(FL);
  delete names.nodes.t05.src;
  assert.match(regroup(names).out, /layer node t05 name: only on an entry the layer tags/);
  const mark = clone(FL);
  delete mark.nodes.t04.sign;
  assert.match(regroup(mark).out, new RegExp(t));
  // The base holds none of them (an edit made in the old place, a merge).
  const stale = clone(BASE);
  stale.teach[0].sl = [1];
  assert.match(regroup(null, stale).out, /tools\/fish_source\.json t01 sl: the instance's/);
  const stalesub = clone(BASE);
  stalesub.teach[0].sub[0].sl = [1];
  assert.match(regroup(null, stalesub).out, /tools\/fish_source\.json t01a sl: the instance's/);
  const stalesp = clone(BASE);
  stalesp.species[0].sl = 1;
  assert.match(regroup(null, stalesp).out, /tools\/fish_source\.json s001 sl: the instance's/);
  const tagged = clone(BASE);
  tagged.teach[0].src = 'imr';
  assert.match(regroup(null, tagged).out, /tools\/fish_source\.json t01 src: the instance's/);
  const signed = clone(BASE);
  signed.teach[3].sign = false;
  assert.match(regroup(null, signed).out, /tools\/fish_source\.json t04 sign: the instance's/);
  // The base's own tag (pdf, diver, wink) is not the layer's: another source, or a second tag on one node, stops it.
  const other = clone(FL);
  other.nodes.t28.src = 'pdf';
  assert.match(regroup(other).out, /layer node t28 src: only the tag 'imr', on a node whose source the base does not name/);
  const two = clone(FL);
  two.nodes.t47 = {...two.nodes.t47, src: 'imr'};
  assert.match(regroup(two).out, /layer node t47 src: only the tag 'imr'/);
  const subTag = clone(FL);
  subTag.nodes.t01a.src = 'imr';
  assert.match(regroup(subTag).out, /layer node t01a src: not a field of the layer/);
  const ghost = clone(FL);
  ghost.species.s999 = {sl: 3};
  assert.match(regroup(ghost).out, /layer species s999: no species/);
  const field = clone(FL);
  field.species.s001.name = 'x';
  assert.match(regroup(field).out, /layer species s001 name: not a field of the layer \(common, sec, pdf, cs, src, sl\)/);
  // An edition without the layer has no IMR tag, slide or mark on its entries and no slide on its species.
  const bare = JSON.parse(
    py(`from instance import fish_compose
print(json.dumps(fish_compose(json.load(open('tools/fish_source.json', encoding='utf-8')), {})))`)
  );
  [...bare.teach, ...bare.teach.flatMap(u => u.sub || [])].forEach(u => assert.ok(!('sl' in u) && !('sign' in u), u.id));
  assert.ok(bare.teach.every(u => !('src' in u) || ['pdf', 'diver', 'wink'].includes(u.src)));
  assert.ok(bare.species.every(s => !('sl' in s)));
});

test('coral: the layer holds imrg, each genus’s n, ig, imr, mn, slides and ID tips, and the lecture’s pairs; data.json is the sources plus the layer, byte for byte', () => {
  assert.deepStrictEqual(Object.keys(CL.gen), Object.keys(RAW.gen));
  Object.entries(CL.gen).forEach(([g, x]) => {
    const keys = ['n', 'ig', 'imr', 'mn'];
    if (RAW.gen[g].sl) keys.push('sl', 'qt', ...(RAW.gen[g].rsl ? ['rsl'] : []));
    assert.deepStrictEqual(Object.keys(x), keys, g);
  });
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
  'imrg' in bare or any(k in r for r in bare['gen'].values() for k in ('n', 'ig', 'imr', 'mn', 'sl', 'rsl')),
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
    book = Object.keys(pairsOf(bare));
  assert.deepStrictEqual(pairsOf(back), all);
  // The split: 84 pairs, 13 the lecture's (6 in its words, 7 from its groups), 71 the Coral Finder's.
  assert.deepStrictEqual(
    [Object.keys(all).length, lecture.length, lecture.filter(k => /^IMR/.test(CL.pairs[k].src)).length, book.length],
    [84, 13, 6, 71]
  );
  assert.deepStrictEqual(
    [...lecture, ...book].sort(),
    Object.keys(all).sort(),
    'the lecture’s and the Coral Finder’s pairs are all the pairs'
  );
  assert.ok(!lecture.some(k => book.includes(k)), 'no pair in both');
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
  assert.deepStrictEqual(Object.keys(pairsOf(edition)).sort(), [...book].sort());
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

test('coral: the slate number, the lecture slides and the lecture’s ID tips are the layer’s; the Coral Finder’s tips stay in the sources', () => {
  const COMES_FROM_BOOK = Object.keys(RAW.gen).filter(g => RAW.gen[g].tl);
  assert.deepStrictEqual(COMES_FROM_BOOK, ['Merulina', 'Cyphastrea', 'Halomitra'], 'the genera whose tips are the Coral Finder’s');
  Object.entries(RAW.gen).forEach(([g, r]) => {
    const x = CL.gen[g];
    assert.strictEqual(x.n, r.n, `${g} n`);
    assert.deepStrictEqual(x.sl, r.sl, `${g} sl`);
    assert.deepStrictEqual(x.rsl, r.rsl, `${g} rsl`);
    if (r.tl) assert.ok(!('qt' in x), `${g}: Coral Finder tips in the layer`);
    else assert.deepStrictEqual(x.qt, r.qt, `${g} qt`);
  });
  assert.deepStrictEqual(
    [
      Object.values(CL.gen).filter(x => x.qt).length,
      Object.values(CL.gen).filter(x => x.sl).length,
      Object.values(CL.gen).filter(x => x.rsl).length,
      Object.values(CL.gen).filter(x => x.n === 0).length
    ],
    [36, 36, 9, 5],
    '[lecture ID tips, lecture slides, review slides, starred genera]'
  );
  const out = JSON.parse(
    py(`from instance import coral_strip, coral_compose, load_layer
from datajson import load
d, lay = load(), load_layer('coral')
bare = coral_strip(d)
edition = coral_compose(bare, {})
print(json.dumps([
  [g for g, r in bare['gen'].items() if 'qt' in r],
  [g for g, r in bare['gen'].items() if 'n' in r or 'sl' in r or 'rsl' in r],
  [g for g, r in edition['gen'].items() if 'qt' in r],
  [g for g, r in edition['gen'].items() if 'n' in r or 'sl' in r],
  edition['gen']['Merulina']['qt'] == d['gen']['Merulina']['qt'],
]))`)
  );
  assert.deepStrictEqual(
    out,
    [COMES_FROM_BOOK, [], COMES_FROM_BOOK, [], true],
    '[the sources hold the Coral Finder’s tips alone and no number or slide; an edition without the layer has no slate, no slides and no lecture tips]'
  );
  // An edit of any of them made in data.json is refused (it belongs in the layer file); the Coral Finder’s tips are the sources’ own.
  const refused = py(`from instance import coral_layered
from datajson import load
for g, k, v in [('Acropora', 'qt', ['an edit made in data.json']), ('Acropora', 'sl', [99]), ('Acropora', 'n', 99), ('Fungia', 'rsl', [99]), ('Merulina', 'qt', ['an edit of the book tips'])]:
    d = load()
    d['gen'][g][k] = v
    try:
        coral_layered(d)
        print(g, k, 'written')
    except SystemExit as e:
        print(g, k, str(e)[:60])`);
  assert.match(refused, /Acropora qt data\.json: gen Acropora qt differ from/);
  assert.match(refused, /Acropora sl data\.json: gen Acropora sl differ from/);
  assert.match(refused, /Acropora n data\.json: gen Acropora n differ from/);
  assert.match(refused, /Fungia rsl data\.json: gen Fungia rsl differ from/);
  assert.match(refused, /Merulina qt written/);
  // The layer giving tips to a genus whose tips are the Coral Finder’s stops the build; a changed value no longer gives data.json.
  const tips = py(`from instance import coral_compose, load_layer
from datajson import load, dumps
d, lay = load(), load_layer('coral')
other = json.loads(json.dumps(lay)); other['gen']['Acropora']['n'] = 99; other['gen']['Fungia']['sl'] = [1]
print(dumps(coral_compose(d, other)) == open('data.json', encoding='utf-8').read())
lay['gen']['Merulina']['qt'] = ['x']
try:
    coral_compose(d, lay)
except SystemExit as e:
    print(e)`);
  assert.match(tips, /^False\n.*qt of Merulina: their ID tips come from the Coral Finder \(tl\)/);
});
