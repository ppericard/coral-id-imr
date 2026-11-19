require('./slot.js').testGuard();
// The sea slug species' own ID marks, agent drafts until Pierre validates them (Pierre, 2026-11-19): tools/
// seaslug_species_marks.json, built into seaslug.json species marks, msrc, mby and mdraft by tools/seaslug_cues.py
// species_apply (through tools/seaslug_game.py), shown on the species sheet by learn.js marksBox, the box the fish
// species and every genus use (rule S1), with its "Draft" label. Every line has a source and the page's words it rests
// on (rule C2); a species named is one of its genus's species in the tree (rule C6).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync} = require('child_process'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const T = json('seaslug.json'),
  M = json('tools/seaslug_species_marks.json'),
  APP = src('app.js'),
  LEARN = src('learn.js');
const BY = Object.fromEntries(T.species.map(s => [s.name, s])),
  GEN = Object.fromEntries(T.genera.map(g => [g.id, g]));
// The public pages the marks were written from: SEASLUG.WORLD species pages and Sea Slug Forum fact sheets.
const HOSTS = /^https:\/\/(en\.seaslug\.world\/species\/[a-z_]+|www\.seaslugforum\.net\/find\/[a-z]+)$/;
const copy = o => JSON.parse(JSON.stringify(o));

test('every line has its sources, each a src key and the words of the page it rests on; every source is cited', () => {
  for (const [k, s] of Object.entries(M.src)) {
    assert.ok(typeof s.t === 'string' && s.t.split(',')[0].trim(), `${k}: a label, its short name before a comma`);
    assert.match(s.u, HOSTS, `${k}: ${s.u}`);
  }
  const used = new Set();
  for (const [n, x] of Object.entries(M.species))
    for (const [words, rr] of x.marks) {
      assert.ok(Array.isArray(rr) && rr.length, `${n}: '${words}' has no source`);
      for (const [key, quote] of rr) {
        assert.ok(M.src[key], `${n}: cites ${key}, not a source of src`);
        assert.ok(typeof quote === 'string' && quote.trim().length > 3, `${n}: no words of ${key}`);
        used.add(key);
      }
    }
  assert.deepStrictEqual([...used].sort(), Object.keys(M.src).sort(), 'every source is cited');
});

test('every species of the tree has its marks or a reason, never both; most have marks', () => {
  for (const s of T.species) assert.ok(!!M.species[s.name] !== !!M.none[s.name], `${s.name}: marks or a reason in none`);
  for (const n of [...Object.keys(M.species), ...Object.keys(M.none)]) assert.ok(BY[n], `${n}: a species of the tree`);
  for (const [n, why] of Object.entries(M.none)) assert.ok(typeof why === 'string' && why.trim(), n);
  // Every species that shares its genus with another has marks, but where a source says they cannot be told apart
  // or no page read describes it.
  const many = T.species.filter(s => GEN[s.genus].species.length > 1);
  assert.ok(many.filter(s => M.species[s.name]).length >= many.length - 6, 'the species of a shared genus have marks');
});

test('built into seaslug.json as written: marks, msrc each source once (never the quote), mby, mdraft', () => {
  assert.strictEqual(M.draft, true, 'agent drafts until Pierre validates them');
  for (const [n, x] of Object.entries(M.species)) {
    const s = BY[n];
    assert.deepStrictEqual(
      s.marks,
      x.marks.map(m => m[0]),
      n
    );
    assert.strictEqual(s.mdraft, 1, n);
    assert.strictEqual(new Set(s.msrc.map(e => e.u + e.t)).size, s.msrc.length, `${n}: each source once`);
    x.marks.forEach(([, rr], i) =>
      assert.deepStrictEqual(
        s.mby.marks[i].map(j => s.msrc[j]),
        [...new Map(rr.map(([k]) => [k, {t: M.src[k].t, u: M.src[k].u}])).values()],
        `${n}: mark ${i}`
      )
    );
  }
  for (const s of T.species)
    if (!M.species[s.name]) for (const k of ['marks', 'msrc', 'mby', 'mdraft']) assert.ok(!(k in s), `${s.name}: ${k}`);
});

test('a mark is short, with no number, and names only a species of its own genus (rules C3, C6)', () => {
  for (const [n, x] of Object.entries(M.species)) {
    const g = n.split(' ')[0],
      kin = GEN[BY[n].genus].species.map(id => T.species.find(s => s.id === id).name);
    assert.ok(x.marks.length >= 1 && x.marks.length <= 3, `${n}: 1 to 3 marks`);
    for (const [words] of x.marks) {
      assert.ok(words.length <= 80, `${n}: '${words}' is long for a mark`);
      assert.doesNotMatch(words, /\d/, `${n}: '${words}': a count is not a photo cue`);
      for (const [, ini, ep] of words.matchAll(/\b([A-Z])\. ([a-z]+)/g))
        assert.ok(ini === g[0] && kin.includes(`${g} ${ep}`), `${n}: '${ini}. ${ep}' is not a species of ${g}`);
    }
  }
});

test('the build stops on a line without a source or words, a number, a long line, another genus named, a species left out', () => {
  const verdict = m => {
    const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_cues as c\nT = json.load(open(${JSON.stringify(path.join(ROOT, 'seaslug.json'))}))\ntry:\n    c.species_apply(json.loads(sys.stdin.read()), T['species'])\n    print('')\nexcept SystemExit as e:\n    print(e)`;
    const r = spawnSync('python3', ['-c', code], {input: JSON.stringify(m), encoding: 'utf8'});
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  assert.strictEqual(verdict(M), '', 'the file as it is passes');
  const n = 'Chromodoris annae',
    k = M.species[n].marks[0][1][0][0];
  const stops = (edit, re) => {
    const m = copy(M);
    edit(m);
    assert.match(verdict(m), re);
  };
  stops(m => (m.species[n].marks[0][1] = []), /has no source/);
  stops(m => (m.species[n].marks[0][1] = [[k, '']]), /a source is \[a key of src, the page's words it rests on\]/);
  stops(m => (m.species[n].marks[0][0] = 'Dark specks in 2 rows'), /a mark with a number/);
  stops(m => (m.species[n].marks[0][0] = 'A blue centre edged black '.repeat(4).trim()), /a line of at most 80 characters/);
  stops(m => (m.species[n].marks[0][0] = 'Bluer than C. elisabethina'), /'C\. elisabethina' is not a game species of Chromodoris/);
  stops(m => (m.species[n].marks[0][0] = 'Bluer than Hypselodoris tryoni'), /'Hypselodoris tryoni' is not a game species of Chromodoris/);
  stops(m => delete m.species[n], /species with neither marks nor a reason in none: .*Chromodoris annae/);
  stops(m => (m.none[n] = 'both'), /both marks and a reason in none/);
  stops(m => (m.src['made-up'] = {t: 'Made up', u: 'https://en.seaslug.world/species/made_up'}), /sources never used: made-up/);
});

test('the sea slug species sheet shows its marks in the shared box, each line numbered, labelled a draft', () => {
  const c2 = {treeGo: id => id, repBtn: () => '<button>report</button>', esrcP: () => ''};
  vm.createContext(c2);
  vm.runInContext(
    [
      block(APP, 'const esc = ', '\n'),
      block(APP, 'const safeUrl = ', '\n};\n', {through: 1}),
      block(LEARN, 'const marksBox = ', '\n};\n', {through: 1}),
      'this.marksBox = marksBox;'
    ].join('\n'),
    c2
  );
  const s = BY['Chromodoris annae'],
    h = c2.marksBox(s);
  assert.ok(
    s.marks.every(m => h.includes(m)),
    'every mark'
  );
  assert.match(h, /ID marks of <i>Chromodoris annae<\/i> <span class="mdraft">Draft, not yet reviewed<\/span>/);
  assert.strictEqual((h.match(/class="srcn"/g) || []).length, s.mby.marks.flat().length, 'one number per source of each line');
  assert.ok(
    s.msrc.every(x => h.includes(x.u)),
    'each source linked'
  );
  assert.strictEqual(c2.marksBox(BY['Caloria indica']), '', 'no marks: nothing');
});
