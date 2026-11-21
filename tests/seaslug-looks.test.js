require('./slot.js').testGuard();
// The sea slugs' genus look-alikes (the survey docs/reviews/2026-11-17-seaslug-lookalikes-survey.md): the genus pairs
// a specialist source names (the Sea Slug Forum, Nudi Pixel's look-alike index, the papers) enter as declared
// look-alikes, kept whatever the players answer; the genus pairs only iNaturalist's identifications show enter as data
// look-alikes, which the players' answers can drop; the decided species pairs (tools/seaslugs.json lookalikes) are the
// species units' declared look-alikes (core.js treeSpUnits decl).
// - tools/seaslug_game.py genus_looks writes them into seaslug.json (genus look, dlook, lsrc) from
//   tools/seaslug_lookalikes_cand.json;
// - app.js treeGenera reads them (look, decl, lsrc, dl), model.js seeds the data look-alikes (dataSeed, isDataLook,
//   dataLooks, confPrior), learn.js lists them on the sheets with their sources (treeGenusLooks).
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
  // the species looks are the decided species pairs only (tools/seaslug_source.json lookalikes): the two Spanish dancers
  // (Q377) and the two sourced pairs of #1164 (Q390 D); the survey's other species sets wait
  assert.deepStrictEqual(
    F.species
      .filter(s => s.look)
      .map(s => s.name)
      .sort(),
    [
      'Chromodoris alcalai',
      'Chromodoris dianae',
      'Hexabranchus lacer',
      'Hexabranchus sanguineus',
      'Thecacera pacifica',
      'Thecacera pikachu'
    ]
  );
  const sid = Object.fromEntries(F.species.map(s => [s.name, s.id])),
    lk = n => F.species.find(s => s.name === n).look;
  [
    ['Thecacera pacifica', 'Thecacera pikachu'],
    ['Chromodoris alcalai', 'Chromodoris dianae']
  ].forEach(([a, b]) => assert.deepStrictEqual([lk(a), lk(b)], [[sid[b]], [sid[a]]], `${a} / ${b} both ways`));
});

// Each decided species pair that names a literature set (tools/seaslug_source.json lookalikes, set) is that set's two
// members, its why that set's source and quote word for word (rules C2, C8): never a pair the survey did not source.
test('the decided species pairs carry their literature set verbatim', () => {
  const S = json('tools/seaslug_source.json').lookalikes,
    sets = Object.fromEntries(json('tools/seaslug_lookalikes_source.json').sets.map(s => [s.id, s])),
    L = S.filter(p => p.set);
  assert.deepStrictEqual(
    L.map(p => p.set),
    ['pola2026-pacifica-pikachu', 'gosliner2021-alcalai-dianae']
  );
  L.forEach(p => {
    const s = sets[p.set];
    assert.ok(s, p.set);
    assert.strictEqual(s.rank, 'species', p.set);
    assert.deepStrictEqual([...p.pair].sort(), [...s.members].sort(), p.set);
    assert.ok(p.why.startsWith(s.source + ': "' + s.quote + '"'), `${p.set}: its source and quote`);
    assert.ok(p.why.includes('(read: ' + s.read + ')'), `${p.set}: what was read`);
    assert.match(p.decided, /^Q390 D \(Pierre, 2026-11-17/);
  });
  // copied as they are into tools/seaslugs.json, which the game build reads
  assert.deepStrictEqual(json('tools/seaslugs.json').lookalikes, S);
});

// app.js treeGenera as the app has it, on the real tree.
const SEA = C.subjectOf('seaslug'),
  GM = C.treeGameRead(json('seaslug-game.json')),
  ctx = {
    easyCover: C.easyCover,
    treeScoreTree: C.treeScoreTree,
    treeSpUnits: C.treeSpUnits,
    treeGenSets: C.treeGenSets,
    rankWeights: C.rankWeights
  };
vm.createContext(ctx);
vm.runInContext(
  block(src('app.js'), 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.treeGenera = treeGenera;',
  ctx
);
const X = C.treeGen(F, C.treePhotos({}, GM.photos, C.treeCur(SEA, json('curation.json'))), undefined, C.unitRankOf(SEA));
ctx.treeGenera(X, F);

test('app.js treeGenera: the declared look-alikes join the siblings and the confusion groups, the data ones are seeds', () => {
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
    'TREEU',
    'return ' +
      block(src('app.js'), "Object.values(TREEU ? TREEU.gen : {})\n        .filter(g => g.rank === 'genus')", '),\n', {through: 0}) +
      ')'
  )(X);
  const want = F.genera.flatMap(G => (G.look || []).filter(o => G.id < o).map(o => [G.id, o]));
  assert.deepStrictEqual(plain(pairs).sort(), want.sort());
  assert.ok(want.some(p => p.join() === 'g:Goniobranchus,g:Phyllidiella'));
});

// The decided species pairs (tools/seaslug_source.json lookalikes: Q377, Q390 D) in play as the species units' declared
// look-alikes (core.js treeSpUnits spDecl, app.js treeGenera decl; model.js declaredOf reads them: the confusion groups).
test('the decided species pairs are the species units declared look-alikes, both ways; no other species gains one', () => {
  const sci = n => C.spUnitId('sci', F.species.find(s => s.name === n).id),
    want = [
      ['Hexabranchus lacer', 'Hexabranchus sanguineus'],
      ['Thecacera pacifica', 'Thecacera pikachu'],
      ['Chromodoris alcalai', 'Chromodoris dianae']
    ].map(p => p.map(sci));
  // the pairs the source records
  assert.deepStrictEqual(
    json('tools/seaslugs.json')
      .lookalikes.map(p => p.pair.map(sci).sort())
      .sort(),
    want.map(p => [...p].sort()).sort()
  );
  const of = Object.fromEntries(
      want.flatMap(([a, b]) => [
        [a, [b]],
        [b, [a]]
      ])
    ),
    U = C.treeSpUnits(F, X, 'sci');
  assert.ok(U.length > 100);
  Object.keys(of).forEach(id => assert.ok(X.gen[id], id + ': a unit in play'));
  U.forEach(u => {
    assert.deepStrictEqual(plain(u.decl), of[u.id] || [], u.id);
    // the app's unit carries them (model.js declaredOf: the confusion groups)
    assert.deepStrictEqual(plain(X.gen[u.id].decl), of[u.id] || [], u.id);
    // the other species of its family stay its look-alikes, the pair among them: look is unchanged
    assert.deepStrictEqual(
      plain(u.look),
      U.filter(o => o.family === u.family && o.id !== u.id).map(o => o.id),
      u.id
    );
  });
  // the sheet's replay reads look only: its species units read as before
  const R = C.treeReplayGen(F, 'genus');
  U.forEach(u => assert.deepStrictEqual(plain(R[u.id].look), plain(u.look), u.id));
  // model.js declaredOf (its record's decl, else its look): each pair declared both ways
  const declaredOf = n => X.gen[n].decl || X.gen[n].look || [];
  want.forEach(([a, b]) => assert.ok(declaredOf(a).includes(b) && declaredOf(b).includes(a), a + '|' + b));
  // model.js groupsOfRank (the confusion groups the opening reads: openPick's group partners) on the real species units
  // of the three families, no answers pooled: each pair is a group of its own; with decl emptied (as before), none is.
  const groups = gen => {
      const c = {
        PCONF: {},
        CONF: C.CONF,
        confScore: C.confScore,
        GX: n => gen[n],
        imrFormsOf: () => [],
        dataSeed: () => false
      };
      vm.createContext(c);
      vm.runInContext(
        block(src('model.js'), 'const GROUP = {MAX: 3};', '\n// The groups of the units in play', {file: 'model.js'}) +
          block(src('model.js'), 'const confPrior = (t, n, look) =>', '\nfunction pooledConf', {file: 'model.js'}) +
          '\nthis.groupsOfRank = groupsOfRank;',
        c
      );
      return c.groupsOfRank;
    },
    fams = new Set(Object.keys(of).map(id => U.find(u => u.id === id).family)),
    L = U.filter(u => fams.has(u.family)).map(u => u.id),
    G = groups(X.gen)(L);
  want.forEach(([a, b]) => assert.deepStrictEqual(plain(G[a]), [a, b].sort(), a));
  assert.deepStrictEqual(Object.keys(G).sort(), Object.keys(of).sort(), 'no other species grouped');
  const before = Object.fromEntries(L.map(n => [n, {...X.gen[n], decl: []}]));
  assert.deepStrictEqual(plain(groups(before)(L)), {});
});

test('the fish species units declare no look-alike: fish.json species carry no look', () => {
  const FI = json('fish.json'),
    XF = C.treeGen(FI, {});
  assert.ok(FI.species.every(s => !('look' in s)));
  [...C.treeSpUnits(FI, XF), ...C.treeSpUnits(FI, XF, 'sci')].forEach(u => assert.deepStrictEqual(plain(u.decl), [], u.id));
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
  // a pair nobody seeded still needs CONF.N offers and the trap score (core.js dataLook)
  assert.ok(!model({'A|D': [10, 8]}).isDataLook('A', 'D'));
  assert.ok(model({'A|D': [20, 8]}).isDataLook('A', 'D'));
});

// learn.js treeGenusLooks: the sheet's list, on made-up units.
test('learn.js treeGenusLooks: the declared ones with their sources, then the data ones while they stand', () => {
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
    block(L, 'function treeGenusLooks(g, T) {', '\n}\n', {through: 1, file: 'learn.js'}) +
      block(L, 'const treeGenusLooksOn = ', '\n', {through: 1, file: 'learn.js'}) +
      '\nthis.f = treeGenusLooks; this.on = treeGenusLooksOn;',
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
