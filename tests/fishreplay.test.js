require('./slot.js').testGuard();
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
const ctx = {
  DOM: {EX: 0.9},
  easyCover: C.easyCover,
  fishScoreTree: C.fishScoreTree,
  fishSpUnits: C.fishSpUnits,
  rankWeights: C.rankWeights
};
vm.createContext(ctx);
vm.runInContext(
  block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
  ctx
);

test("fishReplayGen: the app's fish units, their look-alikes and family lines, from fish.json alone", () => {
  const X = ctx.fishGenera(C.fishGen(F, C.fishPhotos(PH.photos, GM.photos, CUR), PH.sheet), F),
    // a species unit with the unit it starts from (its family: core.js abilityOf from)
    want = Object.fromEntries(Object.values(X.gen).map(g => [g.id, {look: [...g.look], fam: g.fam, ...(g.from ? {from: g.from} : {})}])),
    got = C.fishReplayGen(F);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), JSON.parse(JSON.stringify(want)));
  assert.ok(['g:', 'f:', 's:'].every(p => Object.keys(got).some(id => id.startsWith(p))));
  assert.strictEqual(got['s:s091'].from, 'f:Damselfishes');
});

// The sea slugs' replay (their leaderboard, Pierre, 2026-11-17; rule D8): the units the sheet reads from seaslug.json
// (core.js SUBJECTS seaslug replayed: fishReplayGen at the genus) are the app's (fishGen at its unitRank, app.js
// fishGenera): its genera with their sibling genera as look-alikes and their family's line, its families as structure.
test("fishReplayGen at the genus: the app's sea slug units, from seaslug.json alone", () => {
  const S = C.subjectOf('seaslug'),
    SF = json('seaslug.json'),
    SG = C.fishGameRead(json('seaslug-game.json')),
    X = ctx.fishGenera(C.fishGen(SF, C.fishPhotos(undefined, SG.photos, CUR.seaslug), undefined, C.unitRankOf(S)), SF),
    want = Object.fromEntries(Object.values(X.gen).map(g => [g.id, {look: [...g.look], fam: g.fam}])),
    got = S.replayed.gen(SF);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), JSON.parse(JSON.stringify(want)));
  const genera = Object.keys(got).filter(id => id.startsWith('g:'));
  assert.strictEqual(genera.length, SF.genera.length);
  assert.ok(got['g:Chromodoris'].look.includes('g:Hypselodoris'), 'a sibling genus is a look-alike');
  assert.ok(!Object.keys(got).some(id => id.startsWith('s:')), 'no species unit');
  // its file named, its pool none yet (Code.gs subjFile_), its board from the version that replays it
  assert.strictEqual(S.replayed.file, 'seaslug.json');
  assert.ok(!S.pool && S.board && S.boardSheet === S.replayed.sheet && S.replayed.sheet > C.REPLAYS_SHEET);
});

test('fishReplayGen: nothing from an empty fish.json', () => {
  assert.deepStrictEqual(C.fishReplayGen({}), {});
  assert.deepStrictEqual(C.fishReplayGen(null), {});
});

test('the subjects the sheet replays besides the corals: fish and the sea slugs, each with its own rules versions', () => {
  assert.deepStrictEqual(C.replayedSubjects(), ['fish', 'seaslug']);
  assert.ok(C.rvOf('seaslug') >= 1 && C.rvsOf('seaslug') !== C.rvsOf('fish'));
  assert.ok(
    C.rvsOf('seaslug').every(r => r.msg === null),
    'no card (rules D5, D6)'
  );
  assert.strictEqual(C.replaySubject(), 'coral');
  assert.ok(C.rvOf('fish') >= 1 && C.rvsOf('fish') !== C.RVS && C.rvOf('coral') === C.RV);
  assert.ok(C.REPLAYS_SHEET > C.SCORE_SHEET);
  // No floor any more (Pierre, 2026-11-09, Q330: the log is the only reference, a bar may go down).
  assert.ok(!('floor' in C.subjectOf('fish').replayed) && typeof C.replayFloor === 'undefined');
});
