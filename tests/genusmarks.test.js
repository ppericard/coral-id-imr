// The fish genera's own presentation and ID marks (Pierre, 2026-11-08: each genus needs a short presentation and its ID
// cues, sourced, rules C2, C3, C6, before the genera open to more players): tools/fish_genus_marks.json, built into
// fish.json genera plain, marks, msrc, mby by tools/build_fish.py add_families (genus_marks), shown on the genus card
// (app.js fishGenera) and the sheet the genus opens (learn.js genMarks). Every new line has a source; the IMR cues stay
// apart (rule C1).
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
// The public sources the task allows (FishBase, Fishes of Australia, WoRMS, FAO's species identification guides, a
// peer-reviewed revision by its DOI), each by https.
const HOSTS = /^https:\/\/(www\.fishbase\.se|fishbase\.se|fishesofaustralia\.net\.au|www\.marinespecies\.org|www\.fao\.org|doi\.org)\//;

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

test('the families done: every circle-1 genus has IMR cues, its own marks or a reason; never marks beside IMR cues', () => {
  assert.ok(M.families.length, 'at least one family done');
  for (const id of M.families) {
    const L = F.genera.filter(g => g.family === id && g.circle === 1);
    assert.ok(L.length, id);
    for (const g of L) assert.ok((g.cues || []).length || (g.marks || []).length || M.none[g.name], `${id}: ${g.name}`);
  }
  for (const g of F.genera) assert.ok(!((g.cues || []).length && (g.marks || g.plain)), `${g.name}: IMR cues and our marks together`);
  for (const [g, why] of Object.entries(M.none)) assert.ok(FG[g] && typeof why === 'string' && why.trim(), g);
});

test('a tip is short and seen on a photo; a species named is one of its own game species, found in the Philippines (C3, C6)', () => {
  for (const [g, x] of Object.entries(M.genera)) {
    assert.ok((x.marks || []).length <= 3, `${g}: at most 3 marks`);
    for (const [words] of x.marks || []) {
      assert.ok(words.length <= 80, `${g}: '${words}' is long for a tip`);
      assert.doesNotMatch(words, /\d|\b(spines?|rays?|teeth|tooth|canines?)\b/i, `${g}: '${words}': counts and teeth are not photo cues`);
    }
    const lines = [x.plain ? x.plain[0] : '', ...(x.marks || []).map(m => m[0])];
    const own = FG[g].species.map(id => SP[id]);
    for (const t of lines)
      for (const [, ini, ep] of t.matchAll(/\b([A-Z])\. ([a-z]+)/g)) {
        const s = own.find(s => s.name.split(' ')[1] === ep);
        assert.ok(ini === g[0] && s, `${g}: '${ini}. ${ep}' is not one of its species`);
        assert.ok(s.present && s.present.ph, `${g}: ${s.name} not confirmed in the Philippines (rule C8)`);
      }
  }
});

// fishGenera as app.js has it, on the real fish.json (as tests/scigenera.test.js loads it).
const ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover, fishScoreTree: C.fishScoreTree, rankWeights: C.rankWeights};
vm.createContext(ctx);
vm.runInContext(
  [block(APP, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}), 'this.fishGenera = fishGenera;'].join('\n'),
  ctx
);
const X = ctx.fishGenera(
  C.fishGen(F, C.fishPhotos(json('fish-photos.json').photos, C.fishGameRead(json('fish-game.json')).photos, null)),
  F
);

test('the genus card: its marks under a label naming their sources, its presentation; an IMR genus keeps the IMR cues', () => {
  const g = X.gen['g:Cheilinus'];
  assert.deepStrictEqual([...g.qt], FG.Cheilinus.marks);
  assert.strictEqual(g.plain, FG.Cheilinus.plain);
  assert.match(g.tl, /^ID marks \(FAO species guide\)$/);
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
});

test('the sheet: genMarks on the one sheet the genus opens, each line with its source numbers', () => {
  const T = C.fishTree(F);
  const c2 = {
    fishGo: id =>
      T.go(
        C.sheetIdOf(
          C.SUBJECTS.find(s => s.sheets),
          id
        )
      ),
    repBtn: () => '<button>report</button>'
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
  // A one-species genus: on its species' sheet (Gomphosus varius).
  assert.ok(c2.genMarks(FG.Gomphosus, 's:Gomphosus varius').includes(FG.Gomphosus.marks[0]));
  assert.strictEqual(c2.genMarks(FG.Chromis, 'g:Chromis'), '', 'an IMR genus: its IMR cues only');
  for (const [fn, at] of [
    ['function fishGenus(g) {', '${genMarks(g, g.id)}'],
    ['function fishSpecies(s) {', "${genMarks(g, 's:' + s.name)}"],
    ['function fishFamily(f) {', "${G.map(g => genMarks(g, f.id)).join('')}"]
  ])
    assert.ok(block(LEARN, fn, '\n}\n').includes(at), fn);
});
