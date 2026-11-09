// The fish progress replayed by the sheet (ROADMAP "Fish progress replayed from the answer log"; Pierre, 2026-11-08):
// the units the replay reads (core.js fishReplayGen, built by Code.gs from fish.json alone) are the app's (core.js
// fishGen and app.js fishGenera over fish.json and its photos): the same units, look-alikes and family lines.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f));
const F = json('fish.json'),
  PH = json('fish-photos.json'),
  GM = C.fishGameRead(json('fish-game.json')),
  CUR = json('curation.json');
const ctx = {DOM: {EX: 0.9}, easyCover: C.easyCover, fishScoreTree: C.fishScoreTree, rankWeights: C.rankWeights};
vm.createContext(ctx);
vm.runInContext(
  block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
  ctx
);

test("fishReplayGen: the app's fish units, their look-alikes and family lines, from fish.json alone", () => {
  const X = ctx.fishGenera(C.fishGen(F, C.fishPhotos(PH.photos, GM.photos, CUR, F), PH.sheet), F),
    want = Object.fromEntries(Object.values(X.gen).map(g => [g.id, {look: [...g.look], fam: g.fam}])),
    got = C.fishReplayGen(F);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), JSON.parse(JSON.stringify(want)));
  assert.ok(Object.keys(got).some(id => id.startsWith('g:')) && Object.keys(got).some(id => id.startsWith('f:')));
});

test('fishReplayGen: nothing from an empty fish.json', () => {
  assert.deepStrictEqual(C.fishReplayGen({}), {});
  assert.deepStrictEqual(C.fishReplayGen(null), {});
});

test('the subjects the sheet replays besides the corals: fish, with its own rules versions', () => {
  assert.deepStrictEqual(C.replayedSubjects(), ['fish']);
  assert.strictEqual(C.replaySubject(), 'coral');
  assert.ok(C.rvOf('fish') >= 1 && C.rvsOf('fish') !== C.RVS && C.rvOf('coral') === C.RV);
  assert.ok(C.REPLAYS_SHEET > C.SCORE_SHEET);
  // No floor any more (Pierre, 2026-11-09, Q330: the log is the only reference, a bar may go down).
  assert.ok(!('floor' in C.subjectOf('fish').replayed) && typeof C.replayFloor === 'undefined');
});
