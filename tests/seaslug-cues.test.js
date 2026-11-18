require('./slot.js').testGuard();
// The sea slugs' sourced ID marks (study docs/reviews/2026-11-15-nudibranch-mode-study.md §9, step 7): tools/seaslug_cues.json, checked and built into seaslug.json genera and
// families (marks, msrc, mby) by tools/seaslug_cues.py through tools/seaslug_game.py, shown on the sheets (learn.js
// genMarks, fishMarks) and, a genus's, in the quiz feedback (app.js treeGenera). Every line has a source (rule C2), is
// short (rule C3) and names only the genus's own game species (rule C6); the sheets speak the sea slugs' words (app.js
// UNITS seaslug words).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const M = json('tools/seaslug_cues.json'),
  T = json('seaslug.json');
const G = Object.fromEntries(T.genera.map(g => [g.name, g])),
  FM = Object.fromEntries(T.families.map(f => [f.name, f]));
// The specialist sources read (the Sea Slug Forum, SEASLUG.WORLD, a paper by its DOI) and Wikipedia at a fixed revision.
const HOSTS =
  /^https:\/\/(www\.seaslugforum\.net\/find\/|en\.seaslug\.world\/species\/|doi\.org\/|en\.wikipedia\.org\/w\/index\.php\?title=[^&]+&oldid=\d+$)/;

// The tool's verdict on a made-up tree and cues (its error text, '' when it passes).
const verdict = (cues, tree) => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_cues as c\nT = json.loads(sys.argv[1])\ntry:\n    c.apply(json.loads(sys.argv[2]), {f['id']: f for f in T['families']}, {g['id']: g for g in T['genera']}, T['species'])\n    print('')\nexcept SystemExit as e:\n    print(e)`;
  const r = spawnSync('python3', ['-c', code, JSON.stringify(tree), JSON.stringify(cues)], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim();
};

test('every line has a source: each ref a key of src and where in it, each source https and used', () => {
  for (const [k, s] of Object.entries(M.src)) {
    assert.ok(typeof s.t === 'string' && s.t.split(',')[0].trim(), `${k}: a label, its short name before a comma`);
    assert.match(s.u, HOSTS, `${k}: ${s.u}`);
  }
  const used = new Set();
  // the marks, and the genus pairs' tell-apart lines (apart: tests/tellapart.test.js)
  const pairLines = Object.entries(M.apart || {}).map(([k, P]) => [k, {marks: Object.values(P)}]);
  for (const [n, x] of [...Object.entries(M.genera), ...Object.entries(M.families), ...pairLines])
    for (const [words, rr] of x.marks) {
      assert.ok(rr.length, `${n}: '${words}' has no source`);
      for (const [key, where] of rr) {
        assert.ok(M.src[key], `${n}: cites ${key}`);
        assert.ok(where.trim(), `${n}: where in ${key}`);
        used.add(key);
      }
    }
  assert.deepStrictEqual([...used].sort(), Object.keys(M.src).sort(), 'every source is cited');
});

test('short lines for anyone, never a count, a species named only among the genus game species (rules C3, C6)', () => {
  for (const [n, x] of Object.entries(M.genera)) {
    const eps = new Set(G[n].species.map(id => T.species.find(s => s.id === id).name.split(' ')[1]));
    for (const [w] of x.marks) {
      assert.ok(w.length <= 80 && !/\d/.test(w), `${n}: '${w}'`);
      for (const [, ini, ep] of w.matchAll(/\b([A-Z])\. ([a-z]+)/g)) assert.ok(ini === n[0] && eps.has(ep), `${n}: ${ini}. ${ep}`);
    }
  }
});

test('every circle-1 genus has marks or a reason in none, never both; the circle-1 coverage stays', () => {
  const c1 = T.genera.filter(g => g.circle === 1).map(g => g.name);
  for (const n of c1) assert.ok(!!M.genera[n] !== !!M.none[n], `${n}: marks or a reason in none, one of them`);
  assert.ok(c1.filter(n => M.genera[n]).length >= 18, 'at least 18 of the circle-1 genera have marks');
});

test('built into seaslug.json as written: marks, and each line pointing at its sources in msrc', () => {
  const same = (n, r, x) => {
    assert.deepStrictEqual(
      r.marks,
      x.marks.map(m => m[0]),
      n
    );
    x.marks.forEach(([, rr], i) =>
      rr.forEach(([key, where], j) =>
        assert.deepStrictEqual(r.msrc[r.mby.marks[i][j]], {t: `${M.src[key].t}, ${where}`, u: M.src[key].u}, `${n}: ${key}`)
      )
    );
  };
  for (const [n, x] of Object.entries(M.genera)) same(n, G[n], x);
  for (const [n, x] of Object.entries(M.families)) same(n, FM[n], x);
  for (const g of T.genera) if (!M.genera[g.name]) assert.strictEqual(g.marks, undefined, `${g.name}: marks from nowhere`);
});

test('the tool refuses a line with no source, a count, a species of another genus, a genus not in the tree, a gap', () => {
  const tree = {
    families: [{id: 'f:Afam', name: 'Afam'}],
    genera: [
      {id: 'g:Aa', name: 'Aa', family: 'f:Afam', circle: 1},
      {id: 'g:Bb', name: 'Bb', family: 'f:Afam', circle: 2}
    ],
    species: [
      {id: 's1', name: 'Aa bb', genus: 'g:Aa'},
      {id: 's2', name: 'Bb cc', genus: 'g:Bb'}
    ]
  };
  const ok = {
    src: {s: {t: 'Source, a page', u: 'https://doi.org/x'}},
    genera: {Aa: {marks: [['Pale rhinophores, as in A. bb', [['s', 'p. two']]]]}}
  };
  assert.strictEqual(verdict(ok, tree), '');
  const bad = (cues, why) => assert.match(verdict(cues, tree), why);
  bad({...ok, genera: {Aa: {marks: [['Pale rhinophores', []]]}}}, /has no source/);
  bad({...ok, genera: {Aa: {marks: [['Two gills', [['x', 'p. two']]]]}}}, /a source is/);
  bad({...ok, genera: {Aa: {marks: [['About 5 gills', [['s', 'p. two']]]]}}}, /a number/);
  bad({...ok, genera: {Aa: {marks: [['Pale, as in B. cc', [['s', 'p. two']]]]}}}, /not one of its game species/);
  bad({...ok, genera: {Zz: {marks: [['Pale', [['s', 'p. two']]]]}}}, /not in the tree/);
  bad({...ok, genera: {}}, /circle-1 genera with neither marks nor a reason in none: Aa|sources never used/);
  bad({...ok, none: {Aa: 'none read'}}, /both marks and a reason/);
  bad({...ok, src: {...ok.src, t: {t: 'Other, p', u: 'http://x'}}}, /sources never used/);
  bad({...ok, genera: {Aa: {marks: [['x'.repeat(81), [['s', 'p. two']]]]}}}, /at most 80/);
});

test("the sea slugs' sheets in their own words: no fish word in UNITS seaslug words, read through learn.js sheetWord", () => {
  const app = src('app.js'),
    learn = src('learn.js');
  const at = app.indexOf('seaslug: {'),
    w = app.slice(app.indexOf('    words: {', at), app.indexOf('\n    sheet: id => viewFishSheet(id)', at));
  assert.ok(w.length > 100, 'UNITS seaslug words');
  // its ? texts, its rank line and its drawing: no fish, FishBase, IMR or Dauin word
  assert.doesNotMatch(w.replace(/^\s*\/\/.*$/gm, ''), /\bfish|FishBase|IMR\b|Dauin/i);
  for (const k of ['famLede', 'genLede', 'spLede', 'met', 'links', 'nophoto'])
    assert.ok(learn.includes(`sheetWord('${k}')`), `learn.js reads ${k}`);
});
