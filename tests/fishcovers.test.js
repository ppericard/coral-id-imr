// Pierre's choices per fish unit on the admin's fish pages (curation.json fish genera {unit id: {cover, feat, ok}},
// autosort.js fishPick) reach the app (2026-11-08: his ★ Cover choices, published several times, never showed: the
// app's fish build set every card's photo to the first of the game's order). app.js fishBuild → fishCurate gives the
// unit his cover (coverP, read first by cover(): the Learn cards, the sheets, the first-meeting cards, Home) while it is
// among its game photos, else the cover as before; rankPhotos never takes it back; his featured photos of a species
// (featP) lead that species' photos on the sheets. The blocks of app.js run in a vm on core.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js'),
  A = require('../autosort.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// The app's fish build (fishBuild, fishCurate, fishGenera, rankPhotos) and its card photo (cover), with photoDiff
// (model.js) when given: run(raw, cur) builds FISH from {f, ph, gm} under curation cur.
function app(photoDiff) {
  const ctx = {
    fishGen: C.fishGen,
    fishPhotos: C.fishPhotos,
    easyRank: C.easyRank,
    easyCover: C.easyCover,
    fishPid: C.fishPid,
    fishScoreTree: C.fishScoreTree,
    ...(photoDiff ? {photoDiff} : {})
  };
  vm.createContext(ctx);
  vm.runInContext(
    'let FISH = null, FISHRAW = null, CUR = null;\n' +
      block(src, 'const VIEWS = [', '];\n', {through: 1, file: 'app.js'}) +
      block(src, 'const allPhotos = g =>', '// applyCuration(d, c) and applySlots', {file: 'app.js'}) +
      block(src, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) +
      block(src, 'const fishBuild = () => {', 'const fishLoad = () =>', {file: 'app.js'}) +
      block(src, 'function rankPhotos() {', '\n}\n', {through: 1, file: 'app.js'}) +
      '\nthis.run = (raw, cur) => { FISHRAW = raw; CUR = cur; return fishBuild(); }; this.cover = cover;',
    ctx
  );
  return ctx;
}

// One family of two species in one genus, its photos from the stopgap list: fi1 the easiest, fi2 harder, fi3 of s2.
const F = {
  families: [{id: 'f:A', name: 'As', sci: ['Aidae'], species: ['s1', 's2'], genera: ['g:Xus'], circle: 1}],
  genera: [{id: 'g:Xus', name: 'Xus', species: ['s1', 's2']}],
  species: [
    {id: 's1', name: 'Xus unus', circle: 1, genus: 'g:Xus'},
    {id: 's2', name: 'Xus duo', circle: 1, genus: 'g:Xus'}
  ]
};
const ph = () => ({
  photos: {
    t1: [
      {f: 'fi1', sp: 's1', src: 'https://x/1/original.jpg', e: 5},
      {f: 'fi2', sp: 's1', src: 'https://x/2/original.jpg', e: 3},
      {f: 'fi3', sp: 's2', src: 'https://x/3/original.jpg', e: 4}
    ]
  }
});
const raw = () => ({f: F, ph: ph(), gm: {photos: {}}});
const cur = (k, more = {}) => ({fish: {genera: {'f:A': k}, ...more}});

test("fish cover: Pierre's ★ Cover is the card's photo while in play, else the first of the game's order", () => {
  const X = app();
  // No pick: the first of the easyRank order, as before.
  let G = X.run(raw(), cur({})).gen['f:A'];
  assert.strictEqual(X.cover(G).f, 'fi1');
  assert.strictEqual(G.coverP, undefined);
  // His pick (a harder photo, never first in the game's order) is the card's photo.
  G = X.run(raw(), cur({cover: 'fi2'})).gen['f:A'];
  assert.strictEqual(X.cover(G).f, 'fi2');
  assert.strictEqual(G.cover, 'fi2');
  assert.strictEqual(G.views.wide[0].f, 'fi1', "the games' order is unchanged");
  // A pick no longer in play (rejected since) falls back as before; a pick of no photo at all, too.
  G = X.run(raw(), cur({cover: 'fi2'}, {seen: {fi2: 1}})).gen['f:A'];
  assert.strictEqual(X.cover(G).f, 'fi1');
  assert.ok(!G.views.wide.some(p => p.f === 'fi2'));
  assert.strictEqual(X.cover(X.run(raw(), cur({cover: 'gone'})).gen['f:A']).f, 'fi1');
  // The same photo under its candidate name (the admin picked the candidate, the game still plays its stopgap copy).
  assert.strictEqual(X.cover(X.run(raw(), cur({cover: 'fish-s1-cand-2'})).gen['f:A']).f, 'fi2');
  // The genus unit (fishGenera) keeps its own cover: a family's pick is the family's.
  const g = X.run(raw(), cur({cover: 'fi2'})).gen['g:Xus'];
  assert.strictEqual(g.coverP, undefined);
  assert.strictEqual(X.cover(g).f, 'fi1');
  // No curation loaded yet: the build as before.
  assert.strictEqual(X.cover(X.run(raw(), null).gen['f:A']).f, 'fi1');
});

test('fish cover: rankPhotos (the players’ ratings) never takes the curated cover back', () => {
  // The ratings make fi3 the easiest: the game's order follows them, the card keeps his pick.
  const X = app((n, p) => ({fi3: -9, fi1: -5})[p.f] || 0);
  let G = X.run(raw(), cur({})).gen['f:A'];
  assert.strictEqual(G.views.wide[0].f, 'fi3');
  assert.strictEqual(X.cover(G).f, 'fi3', 'no pick: the first of the rated order, as before');
  G = X.run(raw(), cur({cover: 'fi2'})).gen['f:A'];
  assert.strictEqual(G.views.wide[0].f, 'fi3');
  assert.strictEqual(X.cover(G).f, 'fi2');
  assert.strictEqual(G.cover, 'fi2');
});

test('fish Feature: his featured photos of a species, in his order, those in play and of that species only', () => {
  const X = app();
  const G = X.run(raw(), cur({feat: {s1: ['fi2', 'gone', 'fi1', 'fi3'], s2: ['fi3'], s9: ['fi1']}}, {seen: {}})).gen['f:A'];
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(G.featP).map(([s, L]) => [s, L.map(p => p.f)])))), // out of the vm's realm
    {s1: ['fi2', 'fi1'], s2: ['fi3']}
  );
  assert.strictEqual(X.cover(G).f, 'fi1', 'featuring is not the cover');
  assert.strictEqual(X.run(raw(), cur({feat: {s1: ['gone']}})).gen['f:A'].featP, undefined);
});

// On the real files: every curated cover the game plays is the family's card photo, as the admin's page shows it
// (autosort.js fishCoverOf over the photos in play, fishGameIn).
test("real data: every curated fish cover in play is the card's photo, the admin's and the app's alike", () => {
  const f = read('fish.json'),
    P = read('fish-photos.json'),
    gm = C.fishGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    X = app(),
    FISH = X.run({f, ph: P, gm: gm.photos ? gm : {photos: {}}}, cu),
    G = (cu.fish || {}).genera || {},
    play = A.fishGameIn(Object.values(gm.photos || {}).flat(), cu),
    units = A.fishUnits(f);
  let n = 0;
  Object.entries(G).forEach(([id, k]) => {
    const g = FISH.gen[id];
    if (!k.cover || !g) return;
    const inPlay = g.views.wide.some(p => C.fishPid(p.f) === C.fishPid(k.cover));
    if (inPlay) {
      n++;
      assert.strictEqual(C.fishPid(X.cover(g).f), C.fishPid(k.cover), id);
    }
    const u = units.find(x => x.id === id),
      adm =
        u &&
        A.fishCoverOf(
          play.filter(p => u.species.includes(p.sp)),
          cu.fish,
          id
        );
    if (adm && adm.f === k.cover) assert.strictEqual(X.cover(g).f, k.cover, `${id}: the admin shows it, the app must too`);
  });
  if (Object.values(G).some(k => k.cover)) assert.ok(n, 'at least one curated cover is in play');
});

// The first-meeting card (quiz.js introCard: cover()) shows his ★ Cover even when it is not what the automatic choice
// would take (Pierre, 2026-11-08, Q289: "the covers I chose are all very visible and of reference level"): a
// reference-level photo of the family (core.js refLevel, refFirst) leads the game's order, his pick is the card.
test('fish first-meeting card: his ★ Cover wins over a reference-level photo (Q289)', () => {
  const X = app(),
    r = raw();
  Object.assign(r.ph.photos.t1[0], {jt: 'p1g0sl1r', rep: 'inaturalist'});
  const G = X.run(r, cur({cover: 'fi2'})).gen['f:A'];
  assert.ok(C.refLevel(G.views.wide[0]) && G.views.wide[0].f === 'fi1', 'the reference-level photo leads the game');
  assert.strictEqual(X.cover(G).f, 'fi2');
});
test("real data: a curated cover below the automatic choice is still the family's card (Q289)", () => {
  const cu = read('curation.json'),
    X = app(),
    FISH = X.run({f: read('fish.json'), ph: read('fish-photos.json'), gm: C.fishGameRead(read('fish-game.json'))}, cu);
  const low = Object.entries((cu.fish || {}).genera || {}).filter(([id, k]) => {
    const g = FISH.gen[id];
    return g && g.coverP && C.fishPid(g.coverP.f) === C.fishPid(k.cover) && !C.refLevel(g.coverP) && g.views.wide.some(C.refLevel);
  });
  low.forEach(([id, k]) => assert.strictEqual(C.fishPid(X.cover(FISH.gen[id]).f), C.fishPid(k.cover), id));
});

// Home's landscape tiles (home.js tilePhoto; Pierre, 2026-11-08, Q291: "the covers can go before the mosaic, but in
// landscape, it must fit well"): his cover when its shape (ar) suits the tile (LAND_AR) and it shows the whole fish,
// else the mosaic's own pick (the first of the game's order that suits the tile, else the first); square tiles: cover().
test('Home tiles: his cover when it suits a landscape tile, else the mosaic pick (Q291)', () => {
  const hs = fs.readFileSync(path.join(ROOT, 'home.js'), 'utf8'),
    ctx = {cover: g => g.coverP || g.views.wide[0]};
  vm.createContext(ctx);
  vm.runInContext(block(hs, 'const LAND_AR = [', 'const ph = (n, v) =>', {file: 'home.js'}) + '\nthis.tile = tilePhoto;', ctx);
  const sq = {f: 'sq', ar: 1, jt: 'p1g0sl1'},
    land = {f: 'land', ar: 1.5, jt: 'p1g0sl1'},
    cut = {f: 'cut', ar: 1.5, jt: 'p0g0sl1'},
    wide = {f: 'wide', ar: 1.9, jt: 'p1g0sl1'},
    pick = {f: 'pick', ar: 1.4, jt: 'o1g0sl1'},
    noar = {f: 'noar', jt: 'p1g0sl1'},
    g = c => ({views: {wide: [sq, land, pick]}, ...(c ? {coverP: c} : {})});
  assert.strictEqual(ctx.tile(g(pick), true).f, 'pick', 'his landscape whole-fish cover leads');
  assert.strictEqual(ctx.tile(g(null), true).f, 'land', 'no cover: the mosaic pick');
  for (const c of [sq, cut, wide, noar]) assert.strictEqual(ctx.tile(g(c), true).f, 'land', `a cover that does not suit the tile (${c.f})`);
  assert.strictEqual(ctx.tile({views: {wide: [sq]}, coverP: wide}, true).f, 'sq', 'nothing suits: the first, as before');
  assert.strictEqual(ctx.tile(g(sq), false).f, 'sq', 'square tiles: the card photo');
});

// A wink's surprise card (quiz.js winkPhoto; Pierre, 2026-11-08, Q290, of the Thresher sharks: "we can use my cover for
// the card"): his ★ Cover while in play (coverP), else one of the wink's chosen photos in play, else the unit's best.
test("wink card: his ★ Cover while in play, else the wink's chosen photos (Q290)", () => {
  const qs = fs.readFileSync(path.join(ROOT, 'quiz.js'), 'utf8'),
    ctx = {fishPid: C.fishPid, easyRank: C.easyRank, pick: a => a[0]};
  vm.createContext(ctx);
  vm.runInContext(block(qs, 'function winkPhoto(g) {', '\n}\n', {through: 1, file: 'quiz.js'}) + '\nthis.wp = winkPhoto;', ctx);
  const a = {f: 'fish-s9-cand-1', e: 5},
    b = {f: 'fish-s9-cand-2', e: 4},
    c = {f: 'fish-s9-cand-3', e: 2},
    g = {views: {wide: [a, b, c]}, wink: {photos: ['fish-s9-cand-2']}};
  assert.strictEqual(ctx.wp(g).f, b.f, 'no cover: a chosen photo');
  assert.strictEqual(ctx.wp({...g, coverP: c}).f, c.f, 'his cover');
  assert.strictEqual(ctx.wp({...g, wink: {photos: ['gone']}}).f, a.f, 'none chosen in play: the best');
  // On the real files: the Thresher sharks' card is his cover (curation.json fish genera), in play.
  const cu = read('curation.json'),
    FISH = app().run({f: read('fish.json'), ph: read('fish-photos.json'), gm: C.fishGameRead(read('fish-game.json'))}, cu);
  FISH.winks
    .filter(n => FISH.gen[n].coverP)
    .forEach(n => assert.strictEqual(C.fishPid(ctx.wp(FISH.gen[n]).f), C.fishPid(cu.fish.genera[n].cover), n));
});
