'use strict';
require('./slot.js').testGuard();
// The fish species units (s:s091, core.js treeSpUnits) named on the admin's pages (fish admin at parity, F15): admin.js
// repUnit (between `// repunit: begin` / `end`) gives a species unit its scientific name in italics, linked to its family's
// page, never its id; and the Heatmap's Species rank puts each unit in its genus's block (admin-heatmap.js heatUp,
// heatLab), on the registry the admin reads (reports.js repReg) over the real fish.json.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  C = require('../core.js'),
  {repReg} = require('../reports.js'),
  {heatMatrix, heatRank, heatLab, heatUp} = require('../admin-heatmap.js');
const F = json('fish.json'),
  SUBJ = C.SUBJECTS.find(S => S.id === 'fish'),
  FA = repReg(F, json('fish-photos.json'), json('fish-game.json'), C.unitRankOf(SUBJ)),
  esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

// admin.js repUnit with its page's helpers stubbed: the registry read (FA), every page present, the tree page's address.
const repUnit = new Function(
  'esc',
  'unitSubj',
  'unitRegOf',
  'hasPage',
  'TREE',
  'famHref',
  'unitRankOf',
  'genusHref',
  block(src('admin.js'), '// repunit: begin', '// repunit: end', {file: 'admin.js'}) + '\nreturn repUnit;'
)(
  esc,
  () => SUBJ,
  () => FA,
  () => true,
  'photos/tree/key',
  (id, S) => '#' + S.hash + 'photos/tree/key/' + encodeURIComponent(id),
  C.unitRankOf,
  x => '#' + x
);

const SPU = C.treeSpUnits(F);

test('repUnit names a fish species unit by its scientific name in italics, linked to its family, never its id', () => {
  assert.ok(SPU.length > 100, 'the species units');
  const u = SPU[0],
    h = repUnit(u.id, true, SUBJ);
  assert.ok(/^s:s\d+$/.test(u.id));
  assert.match(h, new RegExp(`<i>${u.s.name}</i></a>$`));
  assert.ok(h.includes(`photos/tree/key/${encodeURIComponent(u.family)}"`), h);
  assert.ok(!h.includes(u.id) && !h.includes(u.s.id), 'no raw id');
  // the subject's name after it unless the page is that subject's already
  assert.match(repUnit(u.id, false, SUBJ), /<small>\(fish\)<\/small>$/);
  // every species unit is named, none by its id
  SPU.forEach(x => assert.ok(repUnit(x.id, true, SUBJ).includes(`<i>${esc(x.s.name)}</i>`), x.id));
  // the others as before: a family by its name, a genus in italics
  assert.ok(repUnit('f:Damselfishes', true, SUBJ).includes('Damselfishes'));
  assert.match(repUnit('g:Chromis', true, SUBJ), /<i>Chromis<\/i>/);
});

test('the Heatmap puts a fish species unit in its genus block, named', () => {
  // two genera with two species units each
  const by = {};
  SPU.forEach(u => u.s.genus && (by[u.s.genus] = by[u.s.genus] || []).push(u.id));
  const G = Object.keys(by)
    .filter(g => by[g].length >= 2)
    .slice(0, 2);
  assert.strictEqual(G.length, 2);
  const row = (shown, answered, ok, choices) => ['a', 0, shown, answered, ok, 'quiz', 'p1', 0.7, 0, 0, choices];
  const R = [];
  for (let i = 0; i < 12; i++) R.push(row('f:Wrasses', 'f:Wrasses', 1, 'f:Wrasses f:Gobies f:Damselfishes f:Blennies'));
  G.forEach(g => R.push(row(by[g][0], by[g][1], 0, by[g][0] + ' ' + by[g][1]), row(by[g][1], by[g][1], 1, by[g][0] + ' ' + by[g][1])));
  const P = heatRank(C.confusionOf(R), {}, 's:'),
    rec = () => ({look: [], fam: ''}),
    M = heatMatrix(
      P.C,
      P.typed,
      rec,
      () => ['Other', 0.1],
      [],
      n => (heatUp(FA, n) ? heatLab(FA, heatUp(FA, n)) : '')
    );
  assert.deepStrictEqual(M.groups.map(g => g[0]).sort(), G.map(g => heatLab(FA, g)).sort());
  M.groups.forEach(([name, from, to]) => {
    const g = G.find(x => heatLab(FA, x) === name);
    assert.deepStrictEqual(M.units.slice(from, to + 1).sort(), by[g].slice(0, 2).sort());
  });
  // each unit by its scientific name; a unit of no record by its id's prefix off
  by[G[0]].forEach(id => assert.strictEqual(heatLab(FA, id), SPU.find(u => u.id === id).s.name));
  assert.strictEqual(heatLab(FA, 'g:Chromis'), 'Chromis');
  assert.strictEqual(heatUp(FA, 'g:Chromis'), 'f:Damselfishes');
  assert.strictEqual(heatUp(null, 's:s091'), null);
});
