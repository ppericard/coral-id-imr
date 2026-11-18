require('./slot.js').testGuard();
// The sea slugs' genus look-alikes (Pierre, 2026-11-17, Q390 D, on the survey docs/reviews/2026-11-17-seaslug-lookalikes-
// survey.md): the genus pairs a specialist source names (the Sea Slug Forum, Nudi Pixel's look-alike index, the papers)
// enter as declared look-alikes, kept whatever the players answer; the genus pairs only iNaturalist's identifications show
// enter as data look-alikes, which the players' answers can drop; the species pairs wait for the species level.
// - tools/seaslug_game.py genus_looks writes them into seaslug.json (genus look, dlook, lsrc) from
//   tools/seaslug_lookalikes_cand.json;
// - app.js fishGenera reads them (look, decl, lsrc, dl), model.js seeds the data look-alikes (dataSeed, isDataLook,
//   dataLooks, confPrior), learn.js lists them on the sheets with their sources (fishGenusLooks).
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
const py = body => {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(TOOLS)})\nimport seaslug_game as g\n${body}`;
  const r = spawnSync('python3', ['-c', code], {encoding: 'utf8', maxBuffer: 64 << 20});
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
};
const F = json('seaslug.json'),
  byName = Object.fromEntries(F.genera.map(g => [g.name, g])),
  famOf = n => byName[n].family;

test('genus_looks on made-up candidates: a set across genera declares, iNaturalist across families seeds, the rest waits', () => {
  const genera = [
      {id: 'g:Aa', name: 'Aa', family: 'f:A'},
      {id: 'g:Ab', name: 'Ab', family: 'f:A'},
      {id: 'g:Ba', name: 'Ba', family: 'f:B'},
      {id: 'g:Ca', name: 'Ca', family: 'f:C'}
    ],
    cand = {
      pulled: '2026-11-17',
      groups: [
        // a literature set: its members those rule C6 kept (Zz outside: not a genus of the tree)
        {kind: 'literature', members: ['Aa one', 'Ba two', 'Zz three'], source: 'Someone 2000, Forum page, https://x.org/p (note)'},
        // a set inside one genus: no genus pair
        {kind: 'literature', members: ['Ca one', 'Ca two'], source: 'Paper'},
        // not literature: never declared
        {kind: 'inat', members: ['Ab one', 'Ca one'], source: 'iNaturalist'}
      ],
      pairs: [
        {rank: 'genus', a: 'Ba', b: 'Aa', ph: {n: 3}, world: {n: 9}}, // declared already: not a data pair
        {rank: 'genus', a: 'Ab', b: 'Ca', ph: {n: 2}, world: {n: 5}}, // across families: data
        {rank: 'genus', a: 'Aa', b: 'Ab', ph: {n: 9}, world: {n: 50}}, // one family: siblings already
        {rank: 'genus', a: 'Ba', b: 'Ca', world: {n: 7}, genusOnly: true}, // no species pair under it: left out
        {rank: 'species', a: 'Ba two', b: 'Ca one', ph: {n: 9}} // species: waits for the species level
      ]
    };
  const lit = o => `json.loads(${JSON.stringify(JSON.stringify(o))})`,
    out = py(`print(json.dumps(g.genus_looks(${lit(cand)}, ${lit(genera)})))`);
  const Ssrc = [{t: 'Someone 2000, Forum page: Aa one, Ba two', u: 'https://x.org/p'}],
    Isrc = [{t: 'iNaturalist identifications, one genus taken for the other: 2 in the Philippines, 5 worldwide (2026-11-17)'}];
  assert.deepStrictEqual(out, {
    'g:Aa': {look: ['g:Ba'], lsrc: {'g:Ba': Ssrc}},
    'g:Ba': {look: ['g:Aa'], lsrc: {'g:Aa': Ssrc}},
    'g:Ab': {dlook: ['g:Ca'], lsrc: {'g:Ca': Isrc}},
    'g:Ca': {dlook: ['g:Ab'], lsrc: {'g:Ab': Isrc}}
  });
  assert.deepStrictEqual(py('print(json.dumps(g.genus_looks(None, [])))'), {}, 'no candidates file: no look-alikes');
});

test('seaslug.json: the declared genus pairs across families of the survey, each with its source, both ways', () => {
  const look = (a, b) => (byName[a].look || []).includes(byName[b].id) && (byName[b].look || []).includes(byName[a].id);
  // the four pairs across two families the survey found among the game's genera (§6.1, §8)
  [
    ['Goniobranchus', 'Phyllidiella', /^Nudi Pixel, 'Nudibranch Look-Alikes': Goniobranchus geometricus, Phyllidiella pustulosa$/],
    ['Hexabranchus', 'Hypselodoris', /^Rudman W\.B\. 1999 \(July 6\), Sea Slug Forum message 'Juvenile Hexabranchus from Philippines'/],
    ['Hexabranchus', 'Thorunna', /Sea Slug Forum.*Hexabranchus lacer, Thorunna australis$/],
    ['Coryphellina', 'Samla', /^Nudi Pixel.*Samla macassarana$/]
  ].forEach(([a, b, re]) => {
    assert.ok(look(a, b), `${a} / ${b} declared`);
    assert.notStrictEqual(famOf(a), famOf(b), `${a} / ${b} across families`);
    const S = byName[a].lsrc[byName[b].id];
    assert.ok(
      S.some(x => re.test(x.t) && /^https?:\/\//.test(x.u)),
      `${a} / ${b}: ${JSON.stringify(S)}`
    );
  });
  // a declared pair inside a family (Rudman's Chromodoris kuniei sheet and Nudi Pixel): both sources
  assert.ok(look('Goniobranchus', 'Hypselodoris'));
  assert.strictEqual(byName.Goniobranchus.lsrc['g:Hypselodoris'].length, 2);
  F.genera.forEach(g => {
    // every look-alike a genus of the tree, never itself, both ways, with its source; never declared and data at once
    [...(g.look || []), ...(g.dlook || [])].forEach(o => {
      const G = F.genera.find(x => x.id === o);
      assert.ok(G && o !== g.id, `${g.id}: ${o}`);
      assert.ok((g.lsrc[o] || []).length && (G.lsrc || {})[g.id], `${g.id} / ${o}: its source, both ways`);
    });
    (g.look || []).forEach(o => assert.ok(F.genera.find(x => x.id === o).look.includes(g.id), `${g.id} / ${o} both ways`));
    (g.dlook || []).forEach(o => {
      const G = F.genera.find(x => x.id === o);
      assert.ok(G.dlook.includes(g.id), `${g.id} / ${o} both ways`);
      assert.ok(!(g.look || []).includes(o), `${g.id} / ${o}: declared and data`);
      assert.notStrictEqual(G.family, g.family, `${g.id} / ${o}: a data pair inside one family`);
      assert.match(g.lsrc[o][0].t, /^iNaturalist identifications, one genus taken for the other: \d+ in the Philippines, \d+ worldwide/);
    });
  });
  // the pairs only iNaturalist shows, among them the survey's (§6.1)
  ['Hexabranchus', 'Phyllidia'].forEach(o => assert.ok(byName.Goniobranchus.dlook.includes(byName[o].id), o));
  assert.ok(byName.Chromodoris.dlook.includes('g:Nembrotha'));
  // the species pairs wait: the one decided species pair (Q377) is the only species look
  assert.deepStrictEqual(
    F.species.filter(s => s.look).map(s => s.name),
    ['Hexabranchus lacer', 'Hexabranchus sanguineus']
  );
});

// app.js fishGenera as the app has it, on the real tree.
const SEA = C.subjectOf('seaslug'),
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

test('app.js fishGenera: the declared look-alikes join the siblings and the confusion groups, the data ones are seeds', () => {
  F.genera.forEach(G => {
    const g = X.gen[G.id],
      sib = F.genera.filter(o => o.family === G.family && o.id !== G.id).map(o => o.id);
    assert.deepStrictEqual(plain(g.look), [...new Set([...sib, ...(G.look || [])])], G.id);
    assert.deepStrictEqual(plain(g.decl), G.look || [], G.id);
    assert.deepStrictEqual(plain(g.dl || []), G.dlook || [], G.id);
    Object.entries(G.lsrc || {}).forEach(([o, L]) => assert.strictEqual(g.lsrc[o], L.map(x => x.t).join('; ')));
  });
  // the sea slug subject's duel pairs (app.js UNITS seaslug pairs): the declared pairs, each once
  const pairs = new Function(
    'FISH',
    'return ' +
      block(src('app.js'), "Object.values(FISH ? FISH.gen : {})\n        .filter(g => g.rank === 'genus')", '),\n', {through: 0}) +
      ')'
  )(X);
  const want = F.genera.flatMap(G => (G.look || []).filter(o => G.id < o).map(o => [G.id, o]));
  assert.deepStrictEqual(plain(pairs).sort(), want.sort());
  assert.ok(want.some(p => p.join() === 'g:Goniobranchus,g:Phyllidiella'));
});

// model.js's data look-alikes, on made-up units: A and B a seeded pair, A and C declared, A and D neither.
function model(PCONF) {
  const M = src('model.js'),
    GEN = {
      A: {look: ['C'], dl: ['B'], fam: 'a'},
      B: {look: [], fam: 'b'},
      C: {look: ['A'], fam: 'c'},
      D: {look: [], fam: 'd'}
    },
    c = {
      PCONF,
      CONF: C.CONF,
      confScore: C.confScore,
      dataLook: C.dataLook,
      GX: n => GEN[n],
      imrFormsOf: () => [],
      slateGenera: () => ['A', 'B', 'C', 'D'],
      bonusList: () => []
    };
  vm.createContext(c);
  vm.runInContext(
    block(M, 'const isLook = (t, n) =>', '\nfunction confOf') +
      block(M, 'const isDataLook = (a, b) =>', "// A choice's label", {file: 'model.js'}) +
      '\nthis.M = {isDataLook, dataLooks, pooledConf, dataSeed};',
    c
  );
  return c.M;
}

test('model.js: a seeded pair is a data look-alike from the start, on the declared prior, and the answers drop it', () => {
  let M = model({});
  assert.ok(M.dataSeed('A', 'B') && M.dataSeed('B', 'A') && !M.dataSeed('A', 'D'));
  assert.strictEqual(M.pooledConf('A', 'B'), C.CONF.LOOK, 'the declared look-alikes’ prior');
  assert.ok(M.isDataLook('A', 'B') && M.isDataLook('B', 'A'));
  assert.ok(!M.isDataLook('A', 'C'), 'a declared pair is never a data look-alike');
  assert.ok(!M.isDataLook('A', 'D'), 'neither: no answers, no look-alike');
  assert.deepStrictEqual(plain(M.dataLooks()), [['A', 'B']]);
  assert.deepStrictEqual(plain(M.dataLooks(['A', 'C'])), [], 'only the pairs of the list');
  // offered together 20 times, mixed up twice: the players tell them apart, the seed is dropped
  M = model({'A|B': [20, 2]});
  assert.ok(M.pooledConf('A', 'B') < C.CONF.TRAP && !M.isDataLook('A', 'B'));
  assert.deepStrictEqual(plain(M.dataLooks()), []);
  // mixed up 8 times in 20: still one
  M = model({'A|B': [20, 8]});
  assert.ok(M.isDataLook('A', 'B'));
  // a pair nobody seeded still needs CONF.N offers and the trap score (core.js dataLook), as before
  assert.ok(!model({'A|D': [10, 8]}).isDataLook('A', 'D'));
  assert.ok(model({'A|D': [20, 8]}).isDataLook('A', 'D'));
});

// learn.js fishGenusLooks: the sheet's list, on made-up units.
test('learn.js fishGenusLooks: the declared ones with their sources, then the data ones while they stand', () => {
  const L = src('learn.js'),
    c = {
      GX: id => ({'g:A': {}})[id],
      dataLooks: () => [
        ['g:A', 'g:C'],
        ['g:A', 'g:D'],
        ['g:B', 'g:C']
      ]
    };
  vm.createContext(c);
  vm.runInContext(
    block(L, 'function fishGenusLooks(g, T) {', '\n}\n', {through: 1, file: 'learn.js'}) +
      block(L, 'const fishGenusLooksOn = ', '\n', {through: 1, file: 'learn.js'}) +
      '\nthis.f = fishGenusLooks; this.on = fishGenusLooksOn;',
    c
  );
  const T = {gen: {'g:A': {}, 'g:B': {}, 'g:C': {}, 'g:D': {}}, go: id => (id === 'g:A' ? 'f:A' : id)},
    g = {id: 'g:A', look: ['g:B'], dlook: ['g:C'], lsrc: {'g:B': [{t: 'Forum', u: 'https://x'}, {t: 'Index'}], 'g:C': [{t: 'iNat'}]}};
  assert.deepStrictEqual(plain(c.f(g, T)), [
    ['g:B', 'Forum; Index'],
    ['g:C', 'iNat'],
    ['g:D', 'Often mixed up by players']
  ]);
  // a genus with a page of its own shows them there, not on its family's sheet
  assert.deepStrictEqual(plain(c.on(g, T, 'g:A')), []);
  assert.strictEqual(c.on(g, T, 'f:A').length, 3);
  assert.deepStrictEqual(plain(c.on(null, T, 'f:A')), []);
});
