require('./slot.js').testGuard();
// The fish genera's own presentation and ID marks (each genus needs a short presentation and its ID
// cues, sourced, rules C2, C3, C6, before the genera open to more players): tools/fish_genus_marks.json, built into
// fish.json genera plain, marks, msrc, mby by tools/build_fish.py add_families (genus_marks), shown on the genus card
// (app.js treeGenera) and the sheet the genus opens (learn.js genMarks). Every new line has a source; a genus with IMR
// cues may take marks too, shown on its sheet under its IMR cues as a family's are, never in their place (rule C1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  M = json('tools/fish_genus_marks.json'),
  APP = src('app.js'),
  LEARN = src('learn.js');
const FG = Object.fromEntries(F.genera.map(g => [g.name, g])),
  SP = Object.fromEntries(F.species.map(s => [s.id, s]));
// The public sources the task allows (FishBase, Fishes of Australia, Reef Life Survey, WoRMS, FAO's species
// identification guides and catalogues, a peer-reviewed revision by its DOI), each by https.
const HOSTS =
  /^https:\/\/(www\.fishbase\.se|fishbase\.se|fishesofaustralia\.net\.au|reeflifesurvey\.com|www\.marinespecies\.org|www\.fao\.org|doi\.org)\//;

test('every line of tools/fish_genus_marks.json has a source: plain and each mark, each ref a src key and where in it', () => {
  for (const [k, s] of Object.entries(M.src)) {
    assert.ok(typeof s.t === 'string' && s.t.split(',')[0].trim(), `${k}: a label, its short name before a comma`);
    assert.match(s.u, HOSTS, `${k}: ${s.u}`);
  }
  const used = new Set();
  const refs = (g, what, rr) => {
    assert.ok(Array.isArray(rr) && rr.length, `${g}: ${what} has no source`);
    for (const [key, where] of rr) {
      assert.ok(M.src[key], `${g}: ${what} cites ${key}, not a source of src`);
      assert.ok(typeof where === 'string' && where.trim(), `${g}: ${what} does not say where in ${key}`);
      used.add(key);
    }
  };
  for (const [g, x] of Object.entries(M.genera)) {
    if (x.plain) refs(g, 'plain', x.plain[1]);
    for (const [words, rr] of x.marks || []) refs(g, words, rr);
    assert.ok((x.marks || []).length || M.none[g], `${g}: no marks and no reason in none`);
    assert.ok(!((x.marks || []).length && M.none[g]), `${g}: marks and a reason in none`);
  }
  assert.deepStrictEqual([...used].sort(), Object.keys(M.src).sort(), 'every source is cited');
});

test('built into fish.json as written: plain, marks, and each line pointing at its sources in msrc', () => {
  for (const [g, x] of Object.entries(M.genera)) {
    const r = FG[g];
    assert.ok(r, `${g}: not a genus of fish.json`);
    assert.strictEqual(r.plain, x.plain ? x.plain[0] : undefined, g);
    assert.deepStrictEqual(r.marks, x.marks ? x.marks.map(m => m[0]) : undefined, g);
    const at = (rr, ix) => {
      assert.strictEqual(ix.length, rr.length, `${g}: one msrc index per source`);
      rr.forEach(([key, where], i) =>
        assert.deepStrictEqual(r.msrc[ix[i]], {t: `${M.src[key].t}, ${where}`, u: M.src[key].u}, `${g}: ${key}`)
      );
    };
    if (x.plain) at(x.plain[1], r.mby.plain);
    (x.marks || []).forEach((m, i) => at(m[1], r.mby.marks[i]));
  }
  // Only the genera of the file carry them.
  for (const r of F.genera)
    if (!M.genera[r.name]) for (const k of ['plain', 'marks', 'msrc', 'mby']) assert.ok(!(k in r), `${r.name}: ${k}`);
});

test('every genus in play, any circle, has IMR cues or a presentation and its marks or a reason; an IMR genus marks at most', () => {
  // In play: every family but the surprise cards' (wink); circles 2 and 3 too (the content comes first,
  // before their genera open as units).
  const play = F.families.filter(f => !f.wink);
  for (const f of play) {
    const L = F.genera.filter(g => g.family === f.id);
    assert.ok(L.length, f.id);
    for (const g of L) {
      if ((g.cues || []).length) continue;
      assert.ok(M.families.includes(f.id), `${f.id}: not in families done`);
      assert.ok(g.plain, `${f.id}: ${g.name} has no presentation`);
      assert.ok((g.marks || []).length || M.none[g.name], `${f.id}: ${g.name} has neither marks nor a reason`);
    }
  }
  for (const id of M.families)
    assert.ok(
      play.some(f => f.id === id),
      `${id}: not a family in play`
    );
  assert.ok(
    F.genera.some(g => g.circle === 3 && g.plain),
    'circle 3 is covered'
  );
  // The surprise cards' genera need nothing (whale shark, thresher sharks).
  for (const f of F.families.filter(f => f.wink))
    for (const g of F.genera.filter(g => g.family === f.id)) assert.ok(!M.genera[g.name] && !M.none[g.name], g.name);
});

test('the build stops on a genus in play of any circle without its presentation, or without marks or a reason', () => {
  const {spawnSync} = require('child_process'),
    os = require('os');
  const run = m => {
    const tmp = path.join(os.tmpdir(), `genusmarks.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(m));
    try {
      const r = spawnSync('python3', [path.join(ROOT, 'tools/build_fish.py'), '--regroup', '--check', '--marks', tmp], {
        cwd: ROOT,
        encoding: 'utf8'
      });
      return {status: r.status, out: r.stdout + r.stderr};
    } finally {
      fs.unlinkSync(tmp);
    }
  };
  assert.strictEqual(run(M).status, 0, 'the file as it is passes');
  // A circle-3 genus with neither (Gobiodon), and a circle-2 one with a reason but no presentation (Aulostomus).
  const a = JSON.parse(JSON.stringify(M));
  delete a.genera.Gobiodon;
  for (const k of Object.keys(a.src)) if (!Object.values(a.genera).some(x => JSON.stringify(x).includes(`"${k}"`))) delete a.src[k];
  let r = run(a);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /genus Gobiodon of a family in play has neither marks nor a reason in none/);
  assert.strictEqual(FG.Gobiodon.circle, 3);
  const b = JSON.parse(JSON.stringify(M));
  delete b.genera.Aulostomus;
  for (const k of Object.keys(b.src)) if (!Object.values(b.genera).some(x => JSON.stringify(x).includes(`"${k}"`))) delete b.src[k];
  r = run(b);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.out, /genus Aulostomus of a family in play has no presentation/);
  assert.strictEqual(FG.Aulostomus.circle, 2);
  // A genus with IMR cues: marks only (its cues present it), never a presentation nor a reason in none.
  for (const g of F.genera.filter(g => (g.cues || []).length)) {
    assert.ok(!g.plain && !M.none[g.name], `${g.name}: IMR cues with a presentation or a reason`);
    if (M.genera[g.name]) assert.ok(g.marks.length, g.name);
  }
  for (const [g, why] of Object.entries(M.none)) assert.ok(FG[g] && typeof why === 'string' && why.trim(), g);
});

test('the build takes marks on a genus with IMR cues, and refuses a presentation, a reason or a count there', () => {
  const {spawnSync} = require('child_process'),
    os = require('os');
  const run = m => {
    const tmp = path.join(os.tmpdir(), `genusmarks.${process.pid}.${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(tmp, JSON.stringify(m));
    try {
      const r = spawnSync('python3', [path.join(ROOT, 'tools/build_fish.py'), '--regroup', '--check', '--marks', tmp], {
        cwd: ROOT,
        encoding: 'utf8'
      });
      return {status: r.status, out: r.stdout + r.stderr};
    } finally {
      fs.unlinkSync(tmp);
    }
  };
  // The real file holds marks for genera with IMR cues, and passes (the test above runs it as it is).
  const imr = Object.keys(M.genera).filter(g => (FG[g].cues || []).length);
  assert.ok(imr.includes('Naso') && imr.length >= 3, imr.join());
  const fsrc = M.genera.Chaetodon.plain[1];
  const bad = (edit, re) => {
    const m = JSON.parse(JSON.stringify(M));
    edit(m);
    const r = run(m);
    assert.notStrictEqual(r.status, 0, String(re));
    assert.match(r.out, re);
  };
  // a presentation beside its IMR cues, or a presentation alone
  bad(m => (m.genera.Naso.plain = ['Unicornfishes of reef slopes.', fsrc]), /Naso: has IMR cues: marks only/);
  bad(m => (m.genera.Chromis = {plain: ['Plankton-feeding damselfishes.', fsrc]}), /Chromis: has IMR cues: marks only/);
  // a reason in none
  bad(m => (m.none.Chromis = 'no mark seen on a photo'), /none Chromis: a reason, and never for a genus with IMR cues/);
  // the other checks hold for it as for any genus: a count, a line too long, a line without a source, a species not its own
  bad(m => (m.genera.Naso.marks[0][0] = '2 keeled plates on the tail base'), /a count is never a photo cue/);
  bad(m => (m.genera.Naso.marks[0][0] = 'A very long line '.repeat(6).trim()), /a line of at most 80 characters/);
  bad(m => (m.genera.Naso.marks[0][1] = []), /has no source/);
  bad(m => (m.genera.Naso.marks[1][0] = 'A horn on the forehead (N. tergus)'), /'N\. tergus' is not one of its game species/);
  bad(m => m.genera.Naso.marks.push(...m.genera.Naso.marks), /at most 3 marks/);
});

test('a tip is short and seen on a photo; a species named is one of its own game species, found in the Philippines (C3, C6)', () => {
  for (const [g, x] of Object.entries(M.genera)) {
    assert.ok((x.marks || []).length <= 3, `${g}: at most 3 marks`);
    for (const [words] of x.marks || []) {
      assert.ok(words.length <= 80, `${g}: '${words}' is long for a tip`);
      assert.doesNotMatch(words, /\d/, `${g}: '${words}': a count is not a photo cue`);
    }
    const lines = [x.plain ? x.plain[0] : '', ...(x.marks || []).map(m => m[0])];
    const own = FG[g].species.map(id => SP[id]);
    for (const t of lines) {
      for (const [, ini, ep] of t.matchAll(/\b([A-Z])\. ([a-z]+)/g)) {
        const s = own.find(s => s.name.split(' ')[1] === ep);
        assert.ok(ini === g[0] && s, `${g}: '${ini}. ${ep}' is not one of its species`);
        assert.ok(s.present && s.present.ph, `${g}: ${s.name} not confirmed in the Philippines (rule C8)`);
      }
      // A species named in full (Paraluteres: Canthigaster valentini) is a game species confirmed in the Philippines.
      for (const [name] of t.matchAll(/\b[A-Z][a-z]+ [a-z]+/g)) {
        const s = F.species.find(s => s.name === name);
        if (s) assert.ok(s.circle && s.present && s.present.ph, `${g}: ${name} not a game species confirmed in the Philippines`);
      }
    }
  }
  assert.ok(
    F.species.find(s => s.name === 'Canthigaster valentini'),
    'the full-name check sees a game species'
  );
});

// treeGenera as app.js has it, on the real fish.json (as tests/scigenera.test.js loads it).
const ctx = {
  DOM: {EX: 0.9},
  easyCover: C.easyCover,
  treeScoreTree: C.treeScoreTree,
  treeSpUnits: C.treeSpUnits,
  treeGenSets: C.treeGenSets,
  rankWeights: C.rankWeights
};
vm.createContext(ctx);
vm.runInContext(
  [block(APP, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}), 'this.treeGenera = treeGenera;'].join('\n'),
  ctx
);
const X = ctx.treeGenera(
  C.treeGen(F, C.treePhotos(json('fish-photos.json').photos, C.treeGameRead(json('fish-game.json')).photos, null)),
  F
);

test('the genus card: its marks under a label naming their sources, its presentation; an IMR genus keeps the IMR cues', () => {
  const g = X.gen['g:Cheilinus'];
  assert.deepStrictEqual([...g.qt], FG.Cheilinus.marks);
  assert.strictEqual(g.plain, FG.Cheilinus.plain);
  assert.match(g.tl, /^ID marks \(FAO species guide\)$/);
  // The label names the marks' sources only: Labropsis's presentation is FishBase's, its marks the FAO guide's.
  assert.ok(FG.Labropsis.msrc.some(s => s.t.startsWith('FishBase')));
  assert.strictEqual(X.gen['g:Labropsis'].tl, 'ID marks (FAO species guide)');
  for (const n of X.sci) {
    const x = X.gen[n];
    assert.doesNotMatch(x.tl, /[<>&"]/, `${n}: the label is shown as HTML, plain words only`);
    if ((FG[x.name].cues || []).length) assert.match(x.tl, /^ID tips \(IMR/, n);
    else if ((FG[x.name].marks || []).length) assert.ok(x.tl.startsWith('ID marks (') && !/IMR/.test(x.tl), n);
  }
  // A genus with a presentation and no marks (a reason in none) keeps its species line under it.
  const b = X.gen['g:Bodianus'];
  assert.strictEqual(b.qt, null);
  assert.ok(b.plain && /^Its species here/.test(b.tl));
  assert.strictEqual(X.gen['g:Chromis'].tl.startsWith('ID tips (IMR, Chromis'), true);
  // A genus with IMR cues and our marks (Naso) keeps its IMR cues as its tips, as a family with IMR cues does: the
  // marks show on its sheet, under them.
  assert.ok(FG.Naso.cues.length && FG.Naso.marks.length);
  assert.deepStrictEqual([...X.gen['g:Naso'].qt], FG.Naso.cues);
  assert.match(X.gen['g:Naso'].tl, /^ID tips \(IMR, Unicornfish/);
});

test('the sheet: genMarks on the one sheet the genus opens, each line with its source numbers', () => {
  const T = C.treeSheets(F);
  const c2 = {
    treeGo: id =>
      T.go(
        C.sheetIdOf(
          C.SUBJECTS.find(s => s.sheets),
          id
        )
      ),
    repBtn: () => '<button>report</button>',
    // learn.js esrcP: the content editor's source of an edited slot (core.js contentApply esrc)
    esrcP: (r, k) => (r.esrc && r.esrc[k] ? `<p class="note esrc">Source: ${r.esrc[k].t}</p>` : '')
  };
  vm.createContext(c2);
  vm.runInContext(
    [
      block(APP, 'const esc = ', '\n'),
      block(APP, 'const safeUrl = ', '\n};\n', {through: 1}),
      block(LEARN, 'const genMarks = ', '\n};\n', {through: 1}),
      'this.genMarks = genMarks;'
    ].join('\n'),
    c2
  );
  const g = FG.Cheilinus,
    h = c2.genMarks(g, 'g:Cheilinus');
  assert.ok(h.includes(g.plain) && g.marks.every(m => h.includes(m)), 'plain and every mark');
  assert.strictEqual(
    (h.match(/class="srcn"/g) || []).length,
    g.mby.plain.length + g.mby.marks.flat().length,
    'one number per source of each line'
  );
  assert.ok(h.includes('https://www.fao.org/4/y0870e/y0870e02.pdf'));
  assert.strictEqual(c2.genMarks(g, 'f:Wrasses'), '', 'never on a sheet the genus does not open');
  // Marks the content editor gave (the sea slugs' content marks) on a genus with no source of its own: his source, no empty
  // Sources line.
  const e = c2.genMarks(
    {...g, plain: '', marks: ['A made-up mark'], msrc: [], mby: {}, esrc: {marks: {t: 'Made-up source'}}},
    'g:Cheilinus'
  );
  assert.ok(e.includes('Source: Made-up source') && !e.includes('Sources:'));
  // A one-species genus: on its species' sheet (Gomphosus varius).
  assert.ok(c2.genMarks(FG.Gomphosus, 's:Gomphosus varius').includes(FG.Gomphosus.marks[0]));
  assert.strictEqual(c2.genMarks(FG.Chromis, 'g:Chromis'), '', 'an IMR genus without marks: its IMR cues only');
  // An IMR genus with marks (Naso): its marks with their FAO sources, never labelled IMR's; its page prints the IMR
  // cues' box first, then them.
  const n = c2.genMarks(FG.Naso, 'g:Naso');
  assert.ok(FG.Naso.marks.every(m => n.includes(m)) && n.includes('y0870e29.pdf') && !/IMR/.test(n));
  // the genus page: the cues are in its hero part, the marks its genusMarks part, declared after it (app.js UNITS sheetParts)
  const tg = block(LEARN, 'function treeGenus(g) {', '\n}\n'),
    parts = block(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), '    genus: [', ']', {file: 'app.js'});
  assert.ok(tg.indexOf('ID tips (IMR') < tg.indexOf('genusMarks: () =>'), 'the IMR cues in the hero part');
  assert.ok(parts.indexOf("'hero'") < parts.indexOf("'genusMarks'"), 'the IMR cues first, then the marks');
  for (const [fn, at] of [
    ['function treeGenus(g) {', 'genusMarks: () => genMarks(g, g.id)'],
    ['function treeSpecies(s) {', "genusMarks: () => genMarks(g, 's:' + s.name)"],
    ['function treeFamily(f) {', "${G.map(g => genMarks(g, f.id)).join('')}"]
  ])
    assert.ok(block(LEARN, fn, '\n}\n').includes(at), fn);
});
