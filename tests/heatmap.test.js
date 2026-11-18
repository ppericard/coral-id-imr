'use strict';
require('./slot.js').testGuard();
// Analyses › Difficulty › Heatmap (admin-heatmap.js): the matrix built from the answer log,
// as Pairs reads it (core.js confusionOf, admin.js pairPrior and noChoiceMixups between `// answerlog: begin` / `end`).
// Made-up rows, the sheet's readAnswers shape: [id, time, shown, answered, right, mode, photos, expected, ability, new
// photos, choices].
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block');
const ROOT = path.join(__dirname, '..'),
  C = require('../core.js'),
  {HEAT, heatBin, heatOrder, heatMatrix, heatRanks, heatRank, heatNeed, heatPlayers} = require('../admin-heatmap.js');
const {pairPrior, noChoiceMixups} = new Function(
  'fmtOf',
  'trustOf',
  'CONF',
  block(fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'), '// answerlog: begin', '// answerlog: end', {file: 'admin.js'}) +
    '\nreturn {pairPrior, noChoiceMixups};'
)(C.fmtOf, C.trustOf, C.CONF);
let t = 0;
const row = (id, shown, answered, ok, choices = '', mode = 'quiz') => [
  id,
  t++,
  shown,
  answered,
  ok ? 1 : 0,
  mode,
  'p1',
  0.7,
  0,
  0,
  choices
];
// A trusted player (core.js trustOf: 10 answers or more, clearly above guessing): 12 right four-choice answers first.
const warm = (id, R) => {
  for (let i = 0; i < 12; i++) R.push(row(id, 'Porites', 'Porites', 1, 'Porites Acropora Favia Fungia'));
  return R;
};
// The coral records the prior reads (data.json gen: look, fam).
const G = {
  Favia: {look: ['Dipsastraea'], fam: 'Merulinidae'},
  Dipsastraea: {look: ['Favia'], fam: 'Merulinidae'},
  Favites: {look: [], fam: 'Merulinidae'},
  Goniastrea: {look: [], fam: 'Merulinidae'},
  Acropora: {look: ['Isopora'], fam: 'Acroporidae'},
  Isopora: {look: ['Acropora'], fam: 'Acroporidae'},
  Montipora: {look: [], fam: 'Acroporidae'},
  Porites: {look: [], fam: 'Poritidae'},
  Fungia: {look: [], fam: 'Fungiidae'},
  Millepora: {look: [], fam: 'Milleporidae'}
};
const rec = n => G[n] || {look: []},
  prior = (a, b) => pairPrior(a, b, rec(a), rec(b));
const build = R => heatMatrix(C.confusionOf(R), noChoiceMixups(R).typed, rec, prior);

test('heatMatrix: a cell is the times the column was answered when offered beside the row, its rate shrunk as Pairs', () => {
  const R = warm('a', []);
  R.push(
    row('a', 'Favia', 'Favites', 0, 'Favia Favites Porites Fungia'),
    row('a', 'Favia', 'Favia', 1, 'Favia Favites Porites Fungia'),
    row('a', 'Favia', 'Favia', 1, 'Favia Favites Acropora Fungia')
  );
  const M = build(R),
    c = M.cell['Favia|Favites'];
  assert.deepStrictEqual([c.off, c.mix, c.pt, c.pv], [3, 1, 'Family', C.CONF.FAM]);
  assert.strictEqual(c.sc, C.confScore([3, 1], C.CONF.FAM));
  // offered, never taken: a cell with its offers and no mix-up
  assert.deepStrictEqual([M.cell['Favia|Porites'].off, M.cell['Favia|Porites'].mix], [2, 0]);
  // never offered beside Favia: no cell
  assert.strictEqual(M.cell['Favia|Isopora'], undefined);
  // the direction is kept: Favites was never shown
  assert.strictEqual(M.cell['Favites|Favia'], undefined);
  assert.strictEqual(M.mix, 1);
});

test('heatMatrix: both directions add up to the pair Pairs shows, and read the same look-alike from the data', () => {
  const R = warm('a', []);
  // Goniastrea and Favites (same family): 24 offers in all, 9 mix-ups both ways, a look-alike from the data (core.js
  // dataLook: 20 offers or more, a score of CONF.TRAP or more)
  for (let i = 0; i < 12; i++) R.push(row('a', 'Goniastrea', i < 5 ? 'Favites' : 'Goniastrea', i >= 5, 'Goniastrea Favites Porites'));
  for (let i = 0; i < 12; i++) R.push(row('a', 'Favites', i < 4 ? 'Goniastrea' : 'Favites', i >= 4, 'Favites Goniastrea Porites'));
  const C0 = C.confusionOf(R),
    M = build(R),
    ab = M.cell['Goniastrea|Favites'],
    ba = M.cell['Favites|Goniastrea'],
    pr = C0.pair['Favites|Goniastrea'];
  assert.strictEqual(ab.off + ba.off, pr[0]);
  assert.strictEqual(ab.mix + ba.mix, pr[1]);
  assert.ok(C.dataLook(pr, C.confScore(pr, C.CONF.FAM)));
  assert.ok(ab.dl && ba.dl);
  // a declared look-alike is outlined as one, never "from the data"
  R.push(row('a', 'Acropora', 'Isopora', 0, 'Acropora Isopora Porites'));
  const L = build(R).cell['Acropora|Isopora'];
  assert.deepStrictEqual([L.look, L.dl, L.pt], [true, false, 'Look-alike']);
});

test('heatMatrix: typed mix-ups kept apart, never in a cell, a unit met only typed still on the map', () => {
  const R = warm('a', []);
  R.push(
    row('a', 'Favia', 'Dipsastraea', 0, '', 'quiz|t'),
    row('a', 'Favia', 'Dipsastraea', 0, '', 'quiz|t'),
    row('a', 'Millepora', 'Montipora', 0, '', 'quiz|t'),
    row('a', 'Favia', 'Favia', 1, '', 'quiz|t')
  );
  // an untrusted player's typed mix-up is left out, as on Pairs
  R.push(row('z', 'Fungia', 'Porites', 0, '', 'quiz|t'));
  const M = build(R);
  assert.deepStrictEqual(M.typed, {'Favia|Dipsastraea': 2, 'Millepora|Montipora': 1});
  assert.strictEqual(M.nt, 3);
  assert.strictEqual(M.cell['Favia|Dipsastraea'], undefined);
  assert.strictEqual(M.mix, 0);
  for (const u of ['Favia', 'Dipsastraea', 'Millepora', 'Montipora']) assert.ok(M.units.includes(u), u);
});

test('heatMatrix: units in blocks of their family, the biggest first, each block in one run', () => {
  const R = warm('a', []);
  R.push(
    row('a', 'Favia', 'Favites', 0, 'Favia Favites Goniastrea Dipsastraea'),
    row('a', 'Acropora', 'Montipora', 0, 'Acropora Montipora Isopora Millepora')
  );
  const M = build(R);
  // Merulinidae (4), Acroporidae (3), then the single ones by name: Fungiidae, Milleporidae, Poritidae
  assert.deepStrictEqual(
    M.groups.map(g => g[0]),
    ['Merulinidae', 'Acroporidae', 'Fungiidae', 'Milleporidae', 'Poritidae']
  );
  M.groups.forEach(([f, a, b]) => {
    const L = M.units.slice(a, b + 1);
    assert.ok(
      L.every(u => rec(u).fam === f),
      `${f}: ${L}`
    );
  });
  assert.strictEqual(
    M.units.length,
    M.groups.reduce((n, g) => n + g[2] - g[1] + 1, 0)
  );
  assert.strictEqual(new Set(M.units).size, M.units.length);
});

test('heatMatrix: units with no family (a subject at one rank, the fish families) in one block, last', () => {
  const recF = n => ({'g:Chromis': {fam: 'f:Damselfishes'}, 'g:Dascyllus': {fam: 'f:Damselfishes'}})[n] || {look: [], fam: ''},
    pr = (a, b) => pairPrior(a, b, recF(a), recF(b)),
    R = [];
  for (let i = 0; i < 12; i++) R.push(row('a', 'f:Wrasses', 'f:Wrasses', 1, 'f:Wrasses f:Gobies f:Damselfishes'));
  R.push(row('a', 'g:Chromis', 'g:Dascyllus', 0, 'g:Chromis g:Dascyllus'));
  const M = heatMatrix(C.confusionOf(R), {}, recF, pr);
  assert.deepStrictEqual(
    M.groups.map(g => g[0]),
    ['f:Damselfishes', '']
  );
  assert.deepStrictEqual(M.units.slice(2).sort(), ['f:Damselfishes', 'f:Gobies', 'f:Wrasses']);
});

test('heatOrder: from the unit mixed up most, each next the one its pair with the last scores highest; ties by name', () => {
  const S = {'A|C': 0.5, 'C|D': 0.4, 'B|D': 0.3},
    M = {'A|C': 6, 'C|D': 3},
    k = (a, b) => (a < b ? a + '|' + b : b + '|' + a),
    sc = (a, b) => S[k(a, b)] || 0.03,
    mix = (a, b) => M[k(a, b)] || 0;
  // C has 9 mix-ups: C, then A (0.5), then the rest by their pair with A (all 0.03: by name)
  assert.deepStrictEqual(heatOrder(['D', 'A', 'B', 'C'], sc, mix), ['C', 'A', 'B', 'D']);
  // nothing mixed up: by name, each next the strongest pair with the last
  assert.deepStrictEqual(
    heatOrder(['D', 'B', 'A'], sc, () => 0),
    ['A', 'B', 'D']
  );
  assert.deepStrictEqual(heatOrder([], sc, mix), []);
});

test('heatBin: five strengths, from under 5% to a declared look-alike start and more; typed by count', () => {
  assert.deepStrictEqual(HEAT.BINS, [0.05, 0.1, C.CONF.TRAP, C.CONF.LOOK]);
  assert.deepStrictEqual(
    [0, 0.049, 0.05, 0.1, 0.19, 0.2, 0.3, 0.9].map(x => heatBin(x)),
    [0, 0, 1, 2, 2, 3, 4, 4]
  );
  assert.deepStrictEqual(
    [1, 2, 3, 4, 5, 9].map(n => heatBin(n, HEAT.TYPED)),
    [1, 2, 3, 3, 4, 4]
  );
});

test('the admin loads the heatmap module after admin.js, and the view sits next to Pairs', () => {
  const html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'),
    js = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8');
  assert.ok(html.indexOf('src="admin.js?') < html.indexOf('src="admin-heatmap.js?'), 'admin-heatmap.js after admin.js');
  assert.match(js, /\['pairs', 'Pairs'\],\n\s*\/\/[^\n]*\n\s*\['heatmap', 'Heatmap'\]/);
  assert.match(block(js, 'const LIVE_STATS = [', '];', {file: 'admin.js'}), /'analyses\/difficulty\/heatmap'/);
  // the corals' admin pages are every page; a subject with units at several ranks names it (the fish, the sea slugs),
  // and has the tree its map reads its units' names and blocks from (admin.js unitRegOf: its SUBJECTS admin files f)
  const on = C.SUBJECTS.filter(S => S.sheets && S.admin.pages && S.admin.pages.includes('analyses/difficulty/heatmap'));
  assert.ok(on.length >= 2, 'the subjects at several ranks have the heatmap');
  on.forEach(S => assert.ok(S.admin.files && S.admin.files.f, S.id));
  // a subject whose units are its genera (core.js unitRankOf) among them
  assert.ok(
    on.some(S => C.unitRankOf(S) === 'genus'),
    'a subject played at the genus'
  );
  // its help in its words (a subject with sheets: fishheat)
  assert.match(js, /'analyses\/difficulty\/heatmap': ASUBJ\.sheets \? 'fishheat' : 'statsheat'/);
});

test('heatRanks: the ranks the log asked, in the subject order; none for a subject at one rank', () => {
  const sheets = {family: 'f:', genus: 'g:', species: 's:'},
    R = [row('a', 'g:Chromis', 'g:Chromis', 1), row('a', 'f:Wrasses', 'f:Wrasses', 1), row('a', 'f:Gobies', 'f:Wrasses', 0)];
  assert.deepStrictEqual(heatRanks(R, sheets), [
    ['family', 'f:'],
    ['genus', 'g:']
  ]);
  // species once one of its questions is logged
  R.push(row('a', 's:Chromis viridis', 's:Chromis viridis', 1));
  assert.deepStrictEqual(
    heatRanks(R, sheets).map(r => r[0]),
    ['family', 'genus', 'species']
  );
  assert.deepStrictEqual(heatRanks(R, undefined), []);
  assert.deepStrictEqual(heatRanks([], sheets), []);
});

test('heatRank: one rank of the pairs and typed mix-ups; the cells of each rank add up to the whole', () => {
  const R = [];
  for (let i = 0; i < 12; i++) R.push(row('a', 'f:Wrasses', 'f:Wrasses', 1, 'f:Wrasses f:Gobies f:Damselfishes f:Blennies'));
  R.push(
    row('a', 'f:Gobies', 'f:Blennies', 0, 'f:Gobies f:Blennies f:Wrasses f:Damselfishes'),
    row('a', 'g:Chromis', 'g:Dascyllus', 0, 'g:Chromis g:Dascyllus g:Pomacentrus'),
    row('a', 'g:Chromis', 'g:Pomacentrus', 0, '', 'quiz|t'),
    row('a', 'f:Gobies', 'f:Blennies', 0, '', 'quiz|t')
  );
  const C0 = C.confusionOf(R),
    T = noChoiceMixups(R).typed,
    F = heatRank(C0, T, 'f:'),
    G = heatRank(C0, T, 'g:');
  assert.ok(Object.keys(F.C.dir).every(k => /^f:[^|]+\|f:/.test(k)));
  assert.deepStrictEqual(Object.keys(G.C.dir).sort(), ['g:Chromis|g:Dascyllus', 'g:Chromis|g:Pomacentrus']);
  assert.deepStrictEqual(G.C.pair['g:Chromis|g:Dascyllus'], [1, 1]);
  assert.deepStrictEqual(F.typed, {'f:Gobies|f:Blennies': 1});
  assert.deepStrictEqual(G.typed, {'g:Chromis|g:Pomacentrus': 1});
  assert.strictEqual(Object.keys(F.C.dir).length + Object.keys(G.C.dir).length, Object.keys(C0.dir).length);
  assert.deepStrictEqual(heatRank(null, null, 'f:'), {C: {pair: {}, dir: {}}, typed: {}});
});

test('heatMatrix: blockOf puts a lower rank in blocks of the rank above (a genus in its family)', () => {
  const FAM = {'g:Chromis': 'Damselfishes', 'g:Dascyllus': 'Damselfishes', 'g:Pomacentrus': 'Damselfishes', 'g:Naso': 'Surgeonfishes'},
    recF = () => ({look: [], fam: ''}),
    pr = (a, b) => pairPrior(a, b, recF(a), recF(b)),
    R = warm('a', []);
  R.push(
    row('a', 'g:Chromis', 'g:Dascyllus', 0, 'g:Chromis g:Dascyllus g:Pomacentrus g:Naso'),
    row('a', 'g:Naso', 'g:Naso', 1, 'g:Naso g:Chromis')
  );
  const P = heatRank(C.confusionOf(R), {}, 'g:'),
    M = heatMatrix(P.C, P.typed, recF, pr, [], u => FAM[u]);
  assert.deepStrictEqual(
    M.groups.map(g => [g[0], g[2] - g[1] + 1]),
    [
      ['Damselfishes', 3],
      ['Surgeonfishes', 1]
    ]
  );
  // the coral genera of the warm-up are another rank: not on the map
  assert.ok(M.units.every(u => u.startsWith('g:')));
  // without blockOf: the record's fam
  assert.deepStrictEqual(
    heatMatrix(P.C, P.typed, recF, pr).groups.map(g => g[0]),
    ['']
  );
});

test('heatMatrix: supOf puts the families in their taxonomic group, each group in one run, the biggest first', () => {
  // made-up genera of the sea slugs' kind: the family above each genus, the families' groups (seaslug.json taxa)
  const FAM = {
      'g:Chromodoris': 'Chromodorididae',
      'g:Hypselodoris': 'Chromodorididae',
      'g:Nembrotha': 'Polyceridae',
      'g:Flabellina': 'Flabellinidae',
      'g:Phyllodesmium': 'Facelinidae',
      'g:Pteraeolidia': 'Facelinidae',
      'g:Elysia': 'Plakobranchidae',
      'g:Odd': ''
    },
    GRP = {
      Chromodorididae: 'Doridina',
      Polyceridae: 'Doridina',
      Flabellinidae: 'Cladobranchia',
      Facelinidae: 'Cladobranchia',
      Plakobranchidae: 'Sacoglossa'
    },
    recF = () => ({look: [], fam: ''}),
    pr = (a, b) => pairPrior(a, b, recF(a), recF(b)),
    M = heatMatrix(
      {},
      {},
      recF,
      pr,
      Object.keys(FAM),
      u => FAM[u],
      u => GRP[FAM[u]]
    );
  // Doridina and Cladobranchia (3 genera each: by name), then Sacoglossa (1); the genus with no family last, in no group
  assert.deepStrictEqual(
    M.sups.map(g => [g[0], g[2] - g[1] + 1]),
    [
      ['Cladobranchia', 3],
      ['Doridina', 3],
      ['Sacoglossa', 1],
      ['', 1]
    ]
  );
  // inside a group, its families the biggest first, each family's genera in one run
  assert.deepStrictEqual(
    M.groups.map(g => g[0]),
    ['Facelinidae', 'Flabellinidae', 'Chromodorididae', 'Polyceridae', 'Plakobranchidae', '']
  );
  M.sups.forEach(([s, a, b]) =>
    assert.ok(
      M.units.slice(a, b + 1).every(u => (GRP[FAM[u]] || '') === s),
      s
    )
  );
  // the groups cover the families' runs exactly
  M.groups.forEach(([, a, b]) => assert.ok(M.sups.some(([, x, y]) => x <= a && b <= y)));
  // without supOf: no groups, the blocks the biggest first
  const B = heatMatrix({}, {}, recF, pr, Object.keys(FAM), u => FAM[u]);
  assert.deepStrictEqual(B.sups, []);
  assert.deepStrictEqual(
    B.groups.map(g => g[0]),
    ['Chromodorididae', 'Facelinidae', 'Flabellinidae', 'Plakobranchidae', 'Polyceridae', '']
  );
});

test('heatNeed: the cells under CONF.N offers, the offers they lack and about the answers that would bring them there', () => {
  const N = C.CONF.N,
    cell = {'A|B': {off: 30}, 'B|A': {off: 5}, 'A|C': {off: 2}, 'C|A': {off: N}};
  // 37 + N offers from 20 answers: about (37 + N) / 20 a answer; the short cells lack (N - 5) + (N - 2)
  const d = heatNeed(cell, 20);
  assert.deepStrictEqual([d.n, d.lo, d.short], [4, 2, 2 * N - 7]);
  assert.strictEqual(d.need, Math.ceil((2 * N - 7) / ((37 + N) / 20)));
  assert.strictEqual(d.thin, false);
  // most cells under N: not enough data yet
  assert.strictEqual(heatNeed({...cell, 'B|C': {off: 1}}, 21).thin, true);
  // nothing offered: nothing to say, no division by zero
  assert.deepStrictEqual(heatNeed({}, 0), {n: 0, lo: 0, short: 0, need: 0, thin: false});
});

test('heatMatrix: every unit of the roster on the map, an unanswered one with empty cells (Codex review #889)', () => {
  const R = warm('a', []),
    M = heatMatrix(C.confusionOf(R), {}, rec, prior, Object.keys(G));
  assert.deepStrictEqual([...M.units].sort(), Object.keys(G).sort());
  // Goniastrea was never shown nor offered: on both axes, no cell
  assert.ok(!Object.keys(M.cell).some(k => k.split('|').includes('Goniastrea')));
  // a unit met outside the roster (a bonus genus once played) joins it
  R.push(row('a', 'Acropora', 'Acropora', 1, 'Acropora Anacropora'));
  assert.ok(heatMatrix(C.confusionOf(R), {}, rec, prior, Object.keys(G)).units.includes('Anacropora'));
});

test("heatPlayers: one player's map is drawn for the players with answers, named when signed in, else by their device's id", () => {
  // made-up ids and names (rule D2); rows as admin.js rowsOf gives them, a deleted or archived account's already out
  const R = [
    ['id-b', 5, 'Favia', 'Favia', 1],
    ['id-a', 3, 'Favia', 'Favia', 1],
    ['dev-1', 9, 'Favia', 'Favia', 1],
    ['dev-2', 12, 'Favia', 'Favia', 1],
    ['dev-1', 2, 'Favia', 'Favia', 1],
    ['', 4, 'Favia', 'Favia', 1]
  ];
  const users = [
    {name: 'Zoe Demo', id: 'id-a'},
    {name: 'Ana Demo', id: 'id-b'},
    // signed in, but no answer in this subject (or a merged account, its answers moved to the name kept): not listed
    {name: 'Ben Demo', id: 'id-c'},
    {name: 'No Id', id: ''}
  ];
  assert.deepStrictEqual(heatPlayers(R, users), [
    ['id-b', 'Ana Demo', 1],
    ['id-a', 'Zoe Demo', 1],
    // never signed in: by id, the latest to answer first
    ['dev-2', 'dev-2', 0],
    ['dev-1', 'dev-1', 0]
  ]);
  // the player list not read yet: every player by their id
  assert.deepStrictEqual(
    heatPlayers(R, null).map(p => p[0]),
    ['dev-2', 'dev-1', 'id-b', 'id-a']
  );
  assert.deepStrictEqual(heatPlayers([], users), []);
});

test("one player's map: their part of every cell, by the same rules (their answers count once trusted)", () => {
  const R = warm('a', warm('b', []));
  R.push(
    row('a', 'Favia', 'Favites', 0, 'Favia Favites Porites Fungia'),
    row('b', 'Favia', 'Favites', 0, 'Favia Favites Porites Fungia'),
    row('b', 'Favia', 'Favia', 1, 'Favia Favites Porites Fungia'),
    // c: two answers, not above chance yet (core.js trustOf): no cell of theirs, as in the pooled map
    row('c', 'Favia', 'Favites', 0, 'Favia Favites Porites Fungia'),
    row('c', 'Favia', 'Favites', 0, 'Favia Favites Porites Fungia')
  );
  const all = build(R),
    of = id => build(R.filter(r => r[0] === id)),
    A = of('a'),
    B = of('b');
  assert.deepStrictEqual([A.cell['Favia|Favites'].off, A.cell['Favia|Favites'].mix], [1, 1]);
  assert.deepStrictEqual([B.cell['Favia|Favites'].off, B.cell['Favia|Favites'].mix], [2, 1]);
  // the players' cells add up to the pooled one
  Object.keys(all.cell).forEach(k =>
    assert.deepStrictEqual(
      [(A.cell[k] || {off: 0}).off + (B.cell[k] || {off: 0}).off, (A.cell[k] || {mix: 0}).mix + (B.cell[k] || {mix: 0}).mix],
      [all.cell[k].off, all.cell[k].mix]
    )
  );
  assert.deepStrictEqual(of('c').cell, {});
  assert.strictEqual(C.trustOf(R.filter(r => r[0] === 'c')).c, false);
});
