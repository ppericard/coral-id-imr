require('./slot.js').testGuard();
// The tell-apart lines of the coral slate pairs and the sea slugs' declared genus pairs (Pierre, 2026-11-18, the feedback
// sheet study's question (d); docs/decisions/2026-11-18-tellapart-lines.md): written in tools/coral_apart.json (laid on
// data.json ap, apsrc by tools/apply_coral_apart.py) and tools/seaslug_cues.json apart (laid on seaslug.json genera apart,
// apsrc by tools/seaslug_cues.py, read by app.js fishGenera), they reach the feedback sheet's one decisive line through
// quiz.js pairLine and pairText, read here from the real files.
// node --test tests/tellapart.test.js
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  {spawnSync} = require('child_process'),
  block = require('./block.js'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  TOOLS = path.join(ROOT, 'tools'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  plain = x => JSON.parse(JSON.stringify(x));

// quiz.js pairLine and pairText over a GX of the caller's
function pairs(GX) {
  const ctx = {GX};
  vm.createContext(ctx);
  vm.runInContext(
    block(src('quiz.js'), 'function pairLine(', '// The one decisive line of the feedback sheet', {file: 'quiz.js'}) +
      '\nthis.M = {pairLine, pairText};',
    ctx
  );
  return ctx.M;
}

// The corals: data.json as the app reads it (app.js GX: gen, then x.gen, where Millepora sits).
const D = json('data.json'),
  A = json('tools/coral_apart.json'),
  coral = pairs(n => D.gen[n] || D.x.gen[n]);

test('data.json ap and apsrc are as tools/coral_apart.json gives them (python3 tools/apply_coral_apart.py --check)', () => {
  const r = spawnSync('python3', [path.join(TOOLS, 'apply_coral_apart.py'), '--check'], {encoding: 'utf8'});
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
});

test('a coral mix-up reads both halves, the unit shown first, with the IMR lecture and Coral Finder sources', () => {
  assert.deepStrictEqual(plain(coral.pairText('Ctenactis', 'Herpolitha')), {
    t:
      'Ctenactis: one long mouth furrow, no mouths outside it; large saw-like teeth · Herpolitha: a furrow the whole length, ' +
      'plus extra mouths scattered over the surface',
    s: 'IMR Lecture 6, slide 52; Coral Finder, p. 65; IMR Lecture 6, slide 54'
  });
  // the other way round: the shown unit first
  assert.ok(coral.pairText('Herpolitha', 'Ctenactis').t.startsWith('Herpolitha: '));
  // Millepora, the slate genus kept in x.gen, has its line too
  assert.ok(coral.pairText('Millepora', 'Porites').t.startsWith('Millepora: smooth, pores barely visible'));
  // a starred genus's side cites the Corals of the World page read for it
  assert.match(coral.pairLine('Herpolitha', 'Halomitra').s, /^Corals of the World \(Veron et al\.\), Halomitra pileus factsheet/);
});

test('every declared slate pair has a line or a reason in none; the lines are ours, never labelled IMR alone', () => {
  const slate = C.slateOf(D),
    G = n => D.gen[n] || D.x.gen[n],
    seen = new Set();
  slate.forEach(a => (G(a).look || []).filter(b => slate.includes(b)).forEach(b => seen.add([a, b].sort().join('|'))));
  assert.deepStrictEqual([...seen].sort(), [...Object.keys(A.pairs), ...Object.keys(A.none)].sort());
  assert.ok(Object.keys(A.pairs).length >= 50, `${Object.keys(A.pairs).length} pairs with a line`);
  Object.keys(A.pairs).forEach(k => {
    const [a, b] = k.split('|'),
      P = coral.pairText(a, b);
    assert.ok(P, k);
    for (const x of Object.keys(A.pairs[k])) assert.ok(P.t.includes(`${x}: ${A.pairs[k][x][0]}`), k);
    // the record's own IMR lines (lk) are said "IMR"; ours name their source in full
    assert.ok(P.s && P.s !== 'IMR' && !/^IMR(;|$)/.test(P.s), `${k}: ${P.s}`);
    assert.strictEqual(G(a).lk, undefined, `${a}: no lk on a coral record (the IMR label would be wrong)`);
  });
  // a pair left without a line: no line, so the sheet falls back to the first ID tip (quiz.js fbLine)
  Object.keys(A.none).forEach(k => assert.strictEqual(coral.pairText(...k.split('|')), null, k));
});

// The sea slugs: app.js fishGenera on the real tree, as tests/seaslug-looks.test.js builds it.
const F = json('seaslug.json'),
  S = json('tools/seaslug_cues.json'),
  SEA = C.subjectOf('seaslug'),
  GM = C.fishGameRead(json('seaslug-game.json')),
  ctx = {
    easyCover: C.easyCover,
    fishScoreTree: C.fishScoreTree,
    fishSpUnits: C.fishSpUnits,
    fishGenSets: C.fishGenSets,
    rankWeights: C.rankWeights
  };
vm.createContext(ctx);
vm.runInContext(
  block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
  ctx
);
const X = C.fishGen(F, C.fishPhotos({}, GM.photos, C.treeCur(SEA, json('curation.json'))), undefined, C.unitRankOf(SEA));
ctx.fishGenera(X, F);
const slug = pairs(n => X.gen[n]);

test('a sea slug mix-up reads the declared pair line from the built genera, with its sources', () => {
  const P = slug.pairText('g:Hypselodoris', 'g:Goniobranchus');
  assert.strictEqual(
    P.t,
    'Hypselodoris: a tall body, the mantle barely overhanging it, as H. tryoni · Goniobranchus: a broad mantle that overhangs the body widely'
  );
  assert.match(P.s, /^Sea Slug Forum, Rudman 1999, Risbecia tryoni fact sheet/);
  // one side only: the Hexabranchus line, whichever genus was shown
  assert.strictEqual(
    slug.pairText('g:Hypselodoris', 'g:Hexabranchus').t,
    'Hexabranchus: gills set one by one into the back, with no pocket to pull them into'
  );
  assert.strictEqual(slug.pairText('g:Hexabranchus', 'g:Thorunna').t, slug.pairText('g:Thorunna', 'g:Hexabranchus').t);
  // a pair left without a line
  Object.keys(S.apartNone).forEach(k => assert.strictEqual(slug.pairText(...k.split('|').map(n => 'g:' + n)), null, k));
});

test('every declared sea slug genus pair has a line or a reason; a record carries no line for a pair it does not declare', () => {
  const decl = new Set();
  F.genera.forEach(g =>
    (g.look || []).forEach(o =>
      decl.add(
        [g.id, o]
          .map(x => x.slice(2))
          .sort()
          .join('|')
      )
    )
  );
  assert.deepStrictEqual([...decl].sort(), [...Object.keys(S.apart), ...Object.keys(S.apartNone)].sort());
  F.genera.forEach(g => Object.keys(g.apart || {}).forEach(o => assert.ok((g.look || []).includes(o), `${g.id} has a line for ${o}`)));
});

test('tools/seaslug_cues.py apart_of refuses a pair not declared, a number, a species out of the game, a side not in the pair', () => {
  const run = apart => {
    const code = [
      'import json, sys',
      `sys.path.insert(0, ${JSON.stringify(TOOLS)})`,
      'import seaslug_cues as c',
      "gens = {'g:Aa': {'name': 'Aa', 'look': ['g:Bb']}, 'g:Bb': {'name': 'Bb', 'look': ['g:Aa']}, 'g:Cc': {'name': 'Cc'}}",
      "src = {'s': {'t': 'A made-up guide', 'u': 'https://example.org/g'}}",
      'try:',
      `    c.apart_of(json.loads(${JSON.stringify(JSON.stringify(apart))}), gens, src, set(), {'g:Aa': ['Aa one']})`,
      "    print(json.dumps({'ok': gens['g:Bb'].get('apart'), 'src': gens['g:Bb'].get('apsrc')}))",
      'except SystemExit as e:',
      "    print(json.dumps({'err': str(e)}))"
    ].join('\n');
    const r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
    assert.strictEqual(r.status, 0, r.stderr);
    return JSON.parse(r.stdout.trim().split('\n').pop());
  };
  assert.deepStrictEqual(run({'Aa|Bb': {Aa: ['Pale tips, as A. one', [['s', 'p. 1']]]}}), {
    ok: {'g:Aa': 'Aa: Pale tips, as A. one'},
    src: {'g:Aa': [{t: 'A made-up guide, p. 1', u: 'https://example.org/g'}]}
  });
  assert.match(run({'Aa|Cc': {Aa: ['Pale tips', [['s', 'p. 1']]]}}).err, /not a declared genus pair/);
  assert.match(run({'Aa|Bb': {Aa: ['Two pale tips, 3 rings', [['s', 'p. 1']]]}}).err, /number/);
  assert.match(run({'Aa|Bb': {Aa: ['Pale tips, as A. two', [['s', 'p. 1']]]}}).err, /rule C6/);
  assert.match(run({'Aa|Bb': {Cc: ['Pale tips', [['s', 'p. 1']]]}}).err, /one or both of its genera/);
  assert.match(run({'Aa|Bb': {Aa: ['Pale tips', []]}}).err, /no source/);
});
