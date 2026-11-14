'use strict';
// Analyses › Difficulty › Heatmap (admin-heatmap.js; Pierre, 2026-11-14, Q123 m): the matrix built from the answer log,
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
  {HEAT, heatBin, heatOrder, heatMatrix} = require('../admin-heatmap.js');
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
  // the corals' admin pages are every page; another subject's name it once its matrix is ready (none yet)
  for (const S of C.SUBJECTS) if (S.admin.pages) assert.ok(!S.admin.pages.includes('analyses/difficulty/heatmap'), S.id);
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
