'use strict';
require('./slot.js').testGuard();
// The Answers tab's Species shown (Code.gs logAnswers_ SP, sheet vNEXT) for every species name the app can log: the app
// logs a photo's species by its name (app.js UNITS species: the subject's spn[p.sp], joined by ', ' for several photos),
// and an informal species carries a number (the sea slugs' Goniobranchus sp. 5, x:goniobranchus-sp5; Pierre, 2026-11-17,
// Q389 (2)). Made-up answers through the sheet script (tests/gas.js), the names from the subjects' data.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {loadCodeGs} = require('./gas.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  T = 'ghp_write000000000000000000',
  SP_COL = 21; // Species shown, in the tab's rows and readAnswers' alike
// One subject's species names by id (app.js fishGenera spn) and the photos in play (the game file, by unit).
const subj = (data, game) => {
  const F = read(data),
    G = read(game).photos;
  return {spn: Object.fromEntries(F.species.map(s => [s.id, s.name])), photos: Object.values(G).flat()};
};
const SLUG = subj('seaslug.json', 'seaslug-game.json'),
  FISH = subj('fish.json', 'fish-game.json');
// As the app logs it (app.js speciesShown): the species of the photos shown, each once, joined by ', '.
const shown = (S, L) => [...new Set(L.map(p => S.spn[p.sp]).filter(Boolean))].join(', ');
let n = 0;
const slugAns = (L, extra = {}) => ({
  id: 'ss' + n++,
  t: '2026-11-17T10:00:00Z',
  g: 'g:Goniobranchus',
  a: 'g:Goniobranchus',
  ok: 1,
  m: 'quiz',
  ph: L.map(p => p.f).join(' '),
  s: 'seaslug',
  rk: 'genus',
  tn: 'Goniobranchus',
  ta: 'Goniobranchus',
  sp: shown(SLUG, L),
  ...extra
});
const logged = answers => {
  const s = loadCodeGs();
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers});
  return {tab: s.sheets.Answers.rows.slice(1), served: s.post({readAnswers: 1, token: T}).rows};
};

test('a sea slug answer on a Goniobranchus sp. 5 photo logs "Goniobranchus sp. 5" in Species shown, and readAnswers serves it', () => {
  const P = SLUG.photos.filter(p => p.sp === 'x:goniobranchus-sp5');
  assert.ok(P.length > 0, 'Goniobranchus sp. 5 has photos in play');
  const other = SLUG.photos.find(p => p.sp !== 'x:goniobranchus-sp5' && /^Goniobranchus /.test(SLUG.spn[p.sp] || ''));
  const A = [slugAns([P[0]]), slugAns([P[0], other])];
  const {tab, served} = logged(A);
  assert.deepStrictEqual(
    tab.map(r => r[SP_COL]),
    ['Goniobranchus sp. 5', 'Goniobranchus sp. 5, ' + SLUG.spn[other.sp]]
  );
  assert.deepStrictEqual(
    served.map(r => r[SP_COL]),
    tab.map(r => r[SP_COL])
  );
  assert.deepStrictEqual(tab[0].slice(17, 20), ['seaslug', 'genus', 'Goniobranchus']);
});

test('every species name the app can log for a photo in play, fish and sea slugs, is kept as it is', () => {
  [SLUG, FISH].forEach(S => {
    const names = [...new Set(S.photos.map(p => S.spn[p.sp]).filter(Boolean))];
    assert.ok(names.length > 0);
    const {tab} = logged(names.map((x, i) => slugAns([], {id: 'all' + i, sp: x})));
    assert.deepStrictEqual(
      tab.map(r => r[SP_COL]),
      names
    );
  });
});

test('Species shown still takes a letter first: a number or a formula is not stored', () => {
  const {tab} = logged(['5', '+1', '=1+1', '-sp. 5', '@x', 'sp. 5=1'].map((x, i) => slugAns([], {id: 'bad' + i, sp: x})));
  assert.deepStrictEqual(
    tab.map(r => r[SP_COL]),
    ['', '', '', '', '', '']
  );
});
