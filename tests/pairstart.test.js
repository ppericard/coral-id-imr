'use strict';
require('./slot.js').testGuard();
// Pairs' and the Heatmap's start of a fish pair is the game's (fish admin at parity, Pierre 2026-11-08: the admin's
// Starts as left out the key group and the species): admin.js pairPrior over fishUnitRec, on the registry the admin reads
// (reports.js repReg), against model.js confPrior over the units the game builds (core.js fishGen, app.js fishGenera,
// app.js imrFormsOf), on the real fish.json, for every pair of units of one rank (a question's choices are of its rank).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  C = require('../core.js'),
  {repReg} = require('../reports.js');
const F = json('fish.json'),
  PH = json('fish-photos.json'),
  GM = json('fish-game.json'),
  APP = src('app.js'),
  MODEL = src('model.js');

// The game: fishGenera over fishGen (the photos in play), and confPrior with isLook, dataSeed and imrFormsOf as the app
// has them (no curation: the content overlay is not read by the admin's registry either).
const ctx = {DOM: {EX: 0.9}, CONF: C.CONF, DATA: {key: [], course: {}, gen: {}}};
['easyCover', 'fishScoreTree', 'fishSpUnits', 'rankWeights'].forEach(k => (ctx[k] = C[k]));
vm.createContext(ctx);
vm.runInContext(
  [
    block(APP, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}),
    block(APP, 'const imrFormsOf = n => {', '\n};\n', {through: 1, file: 'app.js'}),
    block(MODEL, 'const isLook = (t, n) =>', '\n', {through: 1, file: 'model.js'}),
    block(MODEL, 'const confPrior = (t, n, look) =>', 'function pooledConf(', {file: 'model.js'}),
    block(MODEL, 'function dataSeed(a, b) {', '\n}\n', {through: 1, file: 'model.js'}),
    'this.fishGenera = fishGenera; this.confPrior = confPrior; this.isLook = isLook;'
  ].join('\n'),
  ctx
);
const X = ctx.fishGenera(C.fishGen(F, C.fishPhotos(PH.photos, C.fishGameRead(GM).photos, null)), F);
ctx.GX = n => X.gen[n];

// The admin: admin.js pairPrior and fishUnitRec (between `// answerlog: begin` / `end`) on reports.js repReg.
const {pairPrior, fishUnitRec} = new Function(
  'fmtOf',
  'trustOf',
  'CONF',
  block(src('admin.js'), '// answerlog: begin', '// answerlog: end', {file: 'admin.js'}) + '\nreturn {pairPrior, fishUnitRec};'
)(C.fmtOf, C.trustOf, C.CONF);
const FA = repReg(F, PH, GM),
  rec = n => fishUnitRec(FA, n, 'g:'),
  admin = (a, b) => pairPrior(a, b, rec(a), rec(b))[1],
  game = (a, b) => ctx.confPrior(a, b, ctx.isLook(a, b));

const rank = r => Object.keys(X.gen).filter(n => X.gen[n].rank === r || (r === 'family' && n.startsWith('f:') && !X.gen[n].wink));
const pairs = L => L.flatMap((a, i) => L.slice(i + 1).map(b => [a, b]));

test('every pair of fish families starts on Pairs as in the game, the key group included', () => {
  const L = rank('family'),
    P = pairs(L),
    bad = P.filter(([a, b]) => admin(a, b) !== game(a, b));
  assert.ok(L.length > 30, 'the families');
  assert.deepStrictEqual(bad.slice(0, 5), []);
  // the key group shows: some pairs start at the game's FORM rate, which the old start (look-alike or other) left out
  assert.ok(P.some(([a, b]) => game(a, b) === C.CONF.FORM && admin(a, b) === C.CONF.FORM));
});

test('every pair of fish genera and of fish species starts on Pairs as in the game', () => {
  ['genus', 'species'].forEach(r => {
    const L = rank(r),
      bad = pairs(L).filter(([a, b]) => admin(a, b) !== game(a, b));
    assert.ok(L.length > 20, r);
    assert.deepStrictEqual(bad.slice(0, 5), [], r);
  });
  // two species of one family start as look-alikes (core.js fishSpUnits look), as the game declares them
  const [s1, s2] = X.spl.filter(id => X.gen[id].parent === X.gen[X.spl[0]].parent);
  assert.ok(s2, 'a family with two species units');
  assert.deepStrictEqual(pairPrior(s1, s2, rec(s1), rec(s2)), ['Look-alike', C.CONF.LOOK]);
});
