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
  fishGenSets: C.fishGenSets,
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

// The genera of circles 2 and 3 (Pierre, 2026-11-18, "lance"): the sheet's replay reads them as the app makes them, so a
// wrong pick of a circle-2 genus counts against the genus picked too (rule L2), as the game counts it; the board's tree
// (fishBoardTree) credits them as the app's; the variant table holds them as the app's units do.
test('fishReplayGen: a circle-2 genus is replayed as the app scores it', () => {
  const X = ctx.fishGenera(C.fishGen(F, C.fishPhotos(PH.photos, GM.photos, CUR), PH.sheet), F),
    G = C.fishReplayGen(F),
    s = F.species.find(x => x.genus === 'g:Aeoliscus');
  assert.strictEqual(s.circle, 2);
  assert.deepStrictEqual(G['g:Aeoliscus'], {look: ['g:Centriscus'], fam: X.gen['g:Aeoliscus'].fam});
  assert.ok(Object.keys(G).filter(id => id.startsWith('g:')).length === X.sci.length && X.sci.length > 230);
  const a = {
      id: 'x1',
      t: '2026-11-18T01:00:00.000Z',
      s: 'fish',
      rk: 'genus',
      g: 'g:Aeoliscus',
      a: 'g:Centriscus',
      ok: 0,
      m: 'quiz|c',
      ph: 'fx1',
      ch: 'g:Aeoliscus g:Centriscus g:Chromis g:Naso',
      e: 0.8,
      th: 1,
      sc: {d: 0, r: 1}
    },
    P = gen => C.replayProgress([C.logRow(a, 'p1')], {gen}).p1.P;
  assert.ok(P(G)['g:Aeoliscus'] && P(G)['g:Centriscus'], 'the genus picked counts too (rule L2)');
  const old = {...G};
  delete old['g:Centriscus'];
  assert.ok(!P(old)['g:Centriscus'], 'a script without it would not');
  // the board's tree is the app's, the circle-2 genus in it
  const T = C.fishBoardTree(F);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(T)), JSON.parse(JSON.stringify(X.treeSp)));
  assert.ok(T.s.some(e => e[1] === 'g:Aeoliscus'));
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
  // its file named, its pool's first too (Code.gs subjFile_), its board from the version that replays it
  assert.strictEqual(S.replayed.file, 'seaslug.json');
  assert.strictEqual(S.pool.files[0], S.replayed.file);
  assert.ok(S.board && S.boardSheet === S.replayed.sheet && S.replayed.sheet > C.SHEET_FLOOR);
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
  // No floor any more (Pierre, 2026-11-09, Q330: the log is the only reference, a bar may go down).
  assert.ok(!('floor' in C.subjectOf('fish').replayed) && typeof C.replayFloor === 'undefined');
});
