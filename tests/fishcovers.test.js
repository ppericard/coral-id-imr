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
      '\nthis.run = (raw, cur) => { FISHRAW = raw; CUR = cur; return fishBuild(); }; this.cover = cover;' +
      '\nthis.juvP = juvP; this.adultFirst = adultFirst; this.seenCover = seenCover; this.nearSeen = nearSeen;',
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
    X = app(),
    ctx = {cover: g => g.coverP || g.views.wide[0], juvP: X.juvP, adultFirst: X.adultFirst};
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
  // Never a juvenile (Pierre, 2026-11-13): a juvenile that suits the tile is passed over, as a juvenile first photo.
  const jl = {f: 'jl', ar: 1.5, jt: 'p1g0sl1j'},
    jp = {f: 'jp', ar: 1.5, jt: 'p1g0sl1', ph: 'juvenile'};
  assert.strictEqual(ctx.tile({views: {wide: [jl, jp, land]}}, true).f, 'land');
  assert.strictEqual(ctx.tile({views: {wide: [jl, sq]}}, true).f, 'sq', 'nothing suits: the first that is not a juvenile');
  assert.strictEqual(ctx.tile({views: {wide: [jl, jp]}}, true).f, 'jl', 'juveniles only: the first');
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

// ---- A genus's and a species' ★ Cover (Pierre, 2026-11-13: "choisir les couvertures des genres et les couvertures des
// espèces"): curation.json fish genera under the genus's 'g:' id or the species' id, {cover}. A genus unit (circle 1) takes
// it as its coverP, as a family; a genus with no unit and a species get it in FISH.covers while it is in play as a photo of
// that genus or species; learn.js reads them: the species' first photo (spPhoto), the genus row and cards (genCover). ----
// Two families: f:A (circle 1, its genus g:Xus a unit), f:B (circle 3, its genus g:Yus no unit).
const F2 = {
  families: [
    {id: 'f:A', name: 'As', sci: ['Aidae'], species: ['s1', 's2'], genera: ['g:Xus'], circle: 1},
    {id: 'f:B', name: 'Bs', sci: ['Bidae'], species: ['s3'], genera: ['g:Yus'], circle: 3}
  ],
  genera: [
    {id: 'g:Xus', name: 'Xus', family: 'f:A', species: ['s1', 's2']},
    {id: 'g:Yus', name: 'Yus', family: 'f:B', species: ['s3']}
  ],
  species: [
    {id: 's1', name: 'Xus unus', circle: 1, genus: 'g:Xus', family: 'f:A'},
    {id: 's2', name: 'Xus duo', circle: 1, genus: 'g:Xus', family: 'f:A'},
    {id: 's3', name: 'Yus tres', circle: 3, genus: 'g:Yus', family: 'f:B'}
  ]
};
const raw2 = () => {
  const r = ph();
  r.photos.t1.push({f: 'fi6', sp: 's2', src: 'https://x/6/original.jpg', e: 2});
  r.photos.t2 = [
    {f: 'fi4', sp: 's3', src: 'https://x/4/original.jpg', e: 5},
    {f: 'fi5', sp: 's3', src: 'https://x/5/original.jpg', e: 2}
  ];
  return {f: F2, ph: r, gm: {photos: {}}};
};
const cur2 = (G, more = {}) => ({fish: {genera: G, ...more}});

test("genus and species covers: a 'g:' key is the genus's card, a species key its own; never another unit's", () => {
  const X = app();
  let B = X.run(raw2(), cur2({}));
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi1', 'no pick: the first of the game order');
  assert.deepStrictEqual(Object.keys(B.covers), []);
  B = X.run(raw2(), cur2({'g:Xus': {cover: 'fi3'}, s1: {cover: 'fi2'}, 'g:Yus': {cover: 'fi5'}, s3: {cover: 'fi5'}}));
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi3', "the genus unit's card");
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi1', "the family's card unchanged");
  assert.strictEqual(B.gen['g:Xus'].views.wide[0].f, 'fi1', "the games' order unchanged");
  assert.strictEqual(B.covers.s1.f, 'fi2');
  assert.strictEqual(B.covers['g:Yus'].f, 'fi5', 'a genus with no unit');
  assert.strictEqual(B.covers.s3.f, 'fi5');
  assert.ok(!B.gen.s1 && !B.gen['g:Yus'], 'no unit made for them');
  // A photo of another species or genus is no cover of this one; a candidate name finds its stopgap copy.
  B = X.run(raw2(), cur2({s1: {cover: 'fi3'}, 'g:Yus': {cover: 'fi1'}, s2: {cover: 'fish-s1-cand-2'}}));
  assert.deepStrictEqual(Object.keys(B.covers), []);
  assert.strictEqual(X.run(raw2(), cur2({s1: {cover: 'fish-s1-cand-2'}})).covers.s1.f, 'fi2');
  // Out of play (rejected since): no cover; the genus falls back as before.
  B = X.run(raw2(), cur2({'g:Xus': {cover: 'fi3'}, s1: {cover: 'fi2'}}, {seen: {fi2: 1, fi3: 1}}));
  assert.strictEqual(B.covers.s1, undefined);
  assert.strictEqual(B.gen['g:Xus'].coverP, undefined);
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi1');
});

// learn.js: the species' photos with his species cover first, then his featured, then the game's order; the genus row on
// the family sheet led by his genus cover, then the first photo of its other species; the sibling genus cards (genCover).
function sheets(B) {
  const ls = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8'),
    X = app(),
    ctx = {
      FISH: B,
      juvP: X.juvP,
      adultFirst: X.adultFirst,
      easyRank: C.easyRank,
      GX: n => B.gen[n],
      hr: k => k,
      esc: s => String(s),
      thumb: p => `data-f="${p.f}"`,
      noFish: () => '<nofish>',
      spOpen: () => true,
      genSpecies: g => g.species.map(id => F2.species.find(s => s.id === id)),
      seenCover: X.seenCover,
      fishSeen: sid => X.nearSeen((B.sps || {})[sid])
    };
  vm.createContext(ctx);
  vm.runInContext(
    'let FSPH = null, FSPH_OF = null;\n' +
      block(ls, 'const fishSpPhotos = () => {', '// The one "No photo yet" drawing', {file: 'learn.js'}) +
      block(ls, 'function fishGenusRow(g, flat) {', '\n}\n', {through: 1, file: 'learn.js'}) +
      '\nthis.spPhoto = spPhoto; this.genCover = genCover; this.sp = fishSpPhotos; this.row = fishGenusRow; this.nodeCover = nodeCover;',
    ctx
  );
  return ctx;
}
test('sheets: the species cover leads its photos, the genus cover its row and cards', () => {
  const X = app(),
    gx = F2.genera[0],
    imgs = h => [...h.matchAll(/data-f="([^"]+)"/g)].map(m => m[1]);
  let L = sheets(X.run(raw2(), cur2({'f:A': {feat: {s1: ['fi2']}}})));
  assert.deepStrictEqual([...L.sp().s1.map(p => p.f)], ['fi2', 'fi1'], 'featured first');
  assert.strictEqual(L.genCover(gx), null);
  assert.deepStrictEqual(imgs(L.row(gx, [])), ['fi2', 'fi3'], 'no genus cover: each species its first photo');
  L = sheets(X.run(raw2(), cur2({'f:A': {feat: {s2: ['fi6']}}, s2: {cover: 'fi3'}, 'g:Xus': {cover: 'fi6'}})));
  assert.deepStrictEqual([...L.sp().s2.map(p => p.f)], ['fi3', 'fi6'], 'his species cover before his featured photo');
  assert.strictEqual(L.spPhoto({id: 's2'}).f, 'fi3');
  assert.strictEqual(L.genCover(gx).f, 'fi6');
  assert.deepStrictEqual(imgs(L.row(gx, [])), ['fi6', 'fi1'], 'the genus cover, then the other species');
  // A genus with no unit: its cover from FISH.covers.
  L = sheets(X.run(raw2(), cur2({'g:Yus': {cover: 'fi5'}})));
  assert.strictEqual(L.genCover(F2.genera[1]).f, 'fi5');
});

// A juvenile photo is never a cover, at any rank, picked or not (Pierre, 2026-11-13: "Un juvénile ne devrait probablement
// jamais finir en couverture"): juvenile = its phase word (the record's ph) or its tags' juvenile flag (app.js juvP).
// His pick on one is ignored (fishCurate: no coverP, no FISH.covers); every default skips them while the unit has another
// photo (the card's cover, rankPhotos, a species' one photo, the family hero), and a unit of juveniles only keeps one.
test('a juvenile is never a cover: his pick ignored, the defaults skip it, a unit of juveniles keeps one', () => {
  const X = app(),
    R = () => {
      const r = raw2();
      Object.assign(r.ph.photos.t1[0], {ph: 'juvenile'}); // fi1 (s1, the easiest): juvenile by its phase
      Object.assign(r.ph.photos.t1[2], {jt: 'p1g0sl1j'}); // fi3 (s2): juvenile by its tags
      r.ph.photos.t2.forEach(p => (p.ph = 'juvenile')); // s3: juveniles only
      return r;
    };
  assert.ok(X.juvP({ph: 'juvenile'}) && X.juvP({jt: 'p1g0sl1j'}) && !X.juvP({jt: 'p1g0sl1', ph: 'male'}) && !X.juvP(null));
  let B = X.run(R(), cur2({'f:A': {cover: 'fi1'}, 'g:Xus': {cover: 'fi3'}, s2: {cover: 'fi3'}, s1: {cover: 'fi2'}}));
  assert.strictEqual(B.gen['f:A'].coverP, undefined, 'a juvenile family pick is ignored');
  assert.strictEqual(B.gen['g:Xus'].coverP, undefined, 'a juvenile genus pick too');
  assert.strictEqual(B.covers.s2, undefined, 'a juvenile species pick too');
  assert.strictEqual(B.covers.s1.f, 'fi2', 'an adult pick stands');
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2', 'the default skips the juvenile first photo');
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi2');
  assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1', "the games' order is unchanged");
  assert.strictEqual(X.cover(B.gen['f:B']).f, 'fi4', 'juveniles only: it keeps one');
  // rankPhotos (the players' ratings) skips them too.
  const Y = app((n, p) => ({fi1: -9, fi3: -8})[p.f] || 0);
  B = Y.run(R(), cur2({}));
  assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1');
  assert.strictEqual(Y.cover(B.gen['f:A']).f, 'fi2');
  // The sheets: a species' one photo, the family's, the species sheet's first photo.
  const L = sheets(X.run(R(), cur2({'f:A': {feat: {s2: ['fi3']}}})));
  assert.strictEqual(L.spPhoto({id: 's1'}).f, 'fi2', 'its easiest photo is a juvenile: the next');
  assert.strictEqual(L.spPhoto({id: 's2'}).f, 'fi6', 'a featured juvenile is not its one photo either');
  assert.strictEqual(L.spPhoto({id: 's3'}).f, 'fi4', 'juveniles only: it keeps one');
});

// The species sheet's photos (learn.js spSheetPhotos): three adult photos, the first its cover (fishSpPhotos' order),
// then up to two juveniles apart; a juvenile is never its first photo while it has an adult one (Pierre, 2026-11-13;
// Codex review #858's "juvenile cover first" reverted with it).
test('species sheet: the adults first, then the juveniles apart', () => {
  const ls = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8'),
    X = app(),
    a = k => ({f: 'a' + k, jt: 'p1g0sl1'}),
    j = k => ({f: 'j' + k, jt: 'p1g0sl1j'}),
    ctx = {juvP: X.juvP};
  vm.createContext(ctx);
  vm.runInContext(block(ls, 'function spSheetPhotos(P) {', '\n}\n', {through: 1, file: 'learn.js'}) + '\nthis.sp = spSheetPhotos;', ctx);
  const run = P => {
    const r = ctx.sp(P);
    return [r.shown.map(p => p.f).join(), r.more.map(p => p.f).join()];
  };
  assert.deepStrictEqual(run([j(1), a(1), a(2), j(2), a(3), a(4), {f: 'p', ph: 'juvenile'}]), ['a1,a2,a3,j1,j2', 'a4']);
  assert.deepStrictEqual(run([j(1), j(2), j(3)]), ['j1,j2', '']);
});

// The admin's ★ Cover at the genus or species level (autosort.js fishCover under that id) and the app agree on the real
// files: a photo in play of a circle-1 genus and of one of its species, picked in memory (curation.json is never written:
// rule A1), is the genus's card and the species' first photo; once it leaves play (Remove: fishDrop, fishReject) no key
// points at it; Publish merges these keys like a family's (core.js merge3).
test('real data: a genus and a species cover picked in the admin are the app’s, and leave with the photo', () => {
  const f = read('fish.json'),
    P = read('fish-photos.json'),
    gm = C.fishGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    play = A.fishGameIn(Object.values(gm.photos || {}).flat(), cu),
    X = app();
  const B0 = X.run({f, ph: P, gm}, cu),
    gid = Object.keys(B0.gen).find(id => B0.gen[id].rank && B0.gen[id].views.wide.length > 3 && !(cu.fish.genera || {})[id]),
    G = f.genera.find(g => g.id === gid),
    inG = play.filter(p => G.species.includes(p.sp)),
    // a photo the automatic choice would not take, so the pick shows
    pg = inG.find(p => C.fishPid(p.f) !== C.fishPid(X.cover(B0.gen[gid]).f));
  assert.ok(pg, `a photo in play of ${gid}`);
  const sid = pg.sp,
    ps = inG.find(p => p.sp === sid && p.f !== pg.f) || pg;
  let F = A.fishCover(A.fishCover(cu.fish, gid, pg.f), sid, ps.f);
  assert.strictEqual(A.fishCoverOf(inG, F, gid).f, pg.f, "the admin's genus heading");
  let B = X.run({f, ph: P, gm}, {...cu, fish: F});
  assert.strictEqual(C.fishPid(X.cover(B.gen[gid]).f), C.fishPid(pg.f), `${gid}: the app's genus card`);
  assert.strictEqual(C.fishPid(B.covers[sid].f), C.fishPid(ps.f), `${sid}: the species cover`);
  const M = C.merge3(cu, {...cu, fish: F}, cu);
  assert.deepStrictEqual([M.fish.genera[gid].cover, M.fish.genera[sid].cover], [pg.f, ps.f]);
  // Remove on its family page: fishDrop then fishReject, one step.
  F = A.fishReject(A.fishDrop(F, f.species.find(s => s.id === sid).family, ps.f), ps.f);
  assert.ok(!Object.values(F.genera).some(k => k.cover === ps.f), 'no cover key left on the photo');
  B = X.run({f, ph: P, gm}, {...cu, fish: F});
  assert.ok(!B.covers[sid] || C.fishPid(B.covers[sid].f) !== C.fishPid(ps.f));
});

// The ranks ★ Cover can set are the subject's own (Pierre, 2026-11-13: "il faut que tes propositions marchent aussi pour
// les coraux, ou les nudibranches ou les plantes"): read from SUBJECTS sheets, broadest first, else the unit's rank alone
// (no switch); a key's rank from its sheet prefix, else the narrowest rank (admin.js fuRanks, fuRankOf; rule S1).
test('the cover ranks come from the subject: SUBJECTS sheets, else its unit alone', () => {
  const ad = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
    ctx = {ASUBJ: null};
  vm.createContext(ctx);
  vm.runInContext(
    block(ad, 'const fuRanks = (S = ASUBJ) =>', "// The rubric's tags in words", {file: 'admin.js'}) +
      '\nthis.ranks = fuRanks; this.rankOf = fuRankOf;',
    ctx
  );
  const [coral, fish] = [C.SUBJECTS.find(s => !s.sheets), C.SUBJECTS.find(s => s.sheets)];
  assert.deepStrictEqual([...ctx.ranks(fish)], ['family', 'genus', 'species']);
  assert.deepStrictEqual([...ctx.ranks(coral)], [coral.rank], 'one rank: no switch');
  assert.deepStrictEqual(
    ['f:Damselfishes', 'g:Chromis', 's091'].map(id => ctx.rankOf(fish, id)),
    ['family', 'genus', 'species']
  );
  // A subject of other ranks, made up (a plant key): its own words, in its own order.
  const plants = {rank: 'order', sheets: {order: 'o:', family: 'f:', genus: 'g:'}};
  assert.deepStrictEqual([...ctx.ranks(plants)], ['order', 'family', 'genus']);
  assert.strictEqual(ctx.rankOf(plants, 'f:Rosaceae'), 'family');
  assert.strictEqual(ctx.rankOf(coral, 'Acropora'), coral.rank);
});

// ---- The default cover of a node with leaves (Pierre, 2026-11-13, Q339 (b): "ok" to distinct observers): when he has
// picked none, the leaf most seen around the instance's centre by distinct observers (ties: observations, then the easy
// order), then that leaf's easiest photo that is not a juvenile; a node with no presence keeps the easy order's first.
// The app (app.js seenCover: fishCurate, rankPhotos; learn.js nodeCover) and the admin (autosort.js fishCoverOf) alike.
// f:A and g:Xus hold s1 (fi1 e5, fi2 e3) and s2 (fi3 e4, fi6 e2): fi1 leads the easy order.
const seenF = pres => ({...F2, species: F2.species.map(s => (pres[s.id] ? {...s, present: pres[s.id]} : s))});
const seenRaw = (pres, juv = []) => {
  const r = raw2();
  r.f = seenF(pres);
  Object.values(r.ph.photos)
    .flat()
    .forEach(p => juv.includes(p.f) && (p.ph = 'juvenile'));
  return r;
};
const CASES = [
  // [what, presence, juveniles, the default]
  ['no presence: the easy order, as before', {}, [], 'fi1'],
  ['the most observers wins over the easiest photo', {s1: {dauinU: 2, dauin: 5}, s2: {dauinU: 9, dauin: 9}}, [], 'fi3'],
  ['tied observers: the most observations', {s1: {dauinU: 9, dauin: 12}, s2: {dauinU: 9, dauin: 9}}, [], 'fi1'],
  ['tied observers and observations: the easy order', {s1: {dauinU: 9, dauin: 9}, s2: {dauinU: 9, dauin: 9}}, [], 'fi1'],
  ['its easiest photo a juvenile: its next', {s2: {dauinU: 9, dauin: 9}}, ['fi3'], 'fi6'],
  ['every photo of it juvenile: the next species', {s2: {dauinU: 9, dauin: 9}}, ['fi3', 'fi6'], 'fi1'],
  ['juveniles only: the easy order keeps one', {s2: {dauinU: 9, dauin: 9}}, ['fi1', 'fi2', 'fi3', 'fi6'], 'fi1'],
  ['the generic names first (nearU, nearN), the first names after', {s1: {dauinU: 2}, s2: {nearU: 1, dauinU: 9}}, [], 'fi1'],
  ['nearN breaks the tie as dauin did', {s1: {nearU: 3, nearN: 3}, s2: {nearU: 3, nearN: 4, dauin: 1}}, [], 'fi3']
];
test('default cover (Q339 (b)): the most seen species around the centre, then its easiest photo; ties, juveniles', () => {
  const X = app();
  CASES.forEach(([what, pres, juv, want]) => {
    const B = X.run(seenRaw(pres, juv), cur2({}));
    assert.strictEqual(X.cover(B.gen['f:A']).f, want, `family: ${what}`);
    assert.strictEqual(X.cover(B.gen['g:Xus']).f, want, `genus unit: ${what}`);
    assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1', `the games' order is unchanged: ${what}`);
  });
  // His pick wins, at every rank, even over the most seen species.
  const pres = {s2: {dauinU: 9, dauin: 9}};
  let B = X.run(seenRaw(pres), cur2({'f:A': {cover: 'fi2'}, 'g:Xus': {cover: 'fi1'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2');
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi1');
  // The players' ratings (rankPhotos) order the photos within the species; the species stays the most seen.
  const Y = app((n, p) => ({fi1: -9, fi6: -8, fi3: -1})[p.f] || 0);
  B = Y.run(seenRaw(pres), cur2({}));
  assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1');
  assert.strictEqual(Y.cover(B.gen['f:A']).f, 'fi6', 'the rated order within the most seen species');
  // The sheets (learn.js nodeCover: the family hero, its look-alike cards, the sibling genus cards) read the same rule.
  const L = sheets(X.run(seenRaw(pres, ['fi3']), cur2({})));
  assert.strictEqual(L.nodeCover(F2.species.slice(0, 2)).f, 'fi6');
  assert.strictEqual(sheets(X.run(seenRaw({}), cur2({}))).nodeCover(F2.species.slice(0, 2)).f, 'fi1', 'no presence: as before');
});

// The admin's copy (autosort.js fishCoverOf: the family's and the genus headings' default thumbs) picks as the app does.
test("default cover (Q339 (b)): the admin's fishCoverOf agrees with the app's seenCover", () => {
  const X = app(),
    E = {fi1: 5, fi2: 3, fi3: 4, fi6: 2},
    j = f => ({e: E[f]});
  CASES.forEach(([what, pres, juv, want]) => {
    const r = seenRaw(pres, juv),
      sp = Object.fromEntries(r.f.species.map(s => [s.id, s])),
      L = r.ph.photos.t1.map(p => ({f: p.f, sp: p.sp, ...(p.ph ? {ph: p.ph} : {})}));
    assert.strictEqual(A.fishCoverOf(L, {}, 'f:A', j, sid => A.fishNear(sp[sid])).f, want, `admin: ${what}`);
    assert.strictEqual(X.seenCover(r.ph.photos.t1, sid => X.nearSeen(sp[sid])).f, want, `app: ${what}`);
    // the admin's own records carry the species as sid
    assert.strictEqual(
      A.fishCoverOf(
        L.map(({sp: s, ...p}) => ({...p, sid: s})),
        {},
        'f:A',
        j,
        sid => A.fishNear(sp[sid])
      ).f,
      want
    );
  });
  // His pick wins; with no species registered (fishSeenFrom not called) every default keeps the game's order.
  const sp = {s2: {present: {dauinU: 9}}},
    L = [
      {f: 'fi1', sp: 's1'},
      {f: 'fi3', sp: 's2'}
    ];
  assert.strictEqual(A.fishCoverOf(L, {genera: {'f:A': {cover: 'fi1'}}}, 'f:A', j, sid => A.fishNear(sp[sid])).f, 'fi1');
  assert.strictEqual(A.fishCoverOf(L, {}, 'f:A', j).f, 'fi1', 'nothing registered: as before');
  A.fishSeenFrom(sid => sp[sid]);
  try {
    assert.strictEqual(A.fishCoverOf(L, {}, 'f:A', j).f, 'fi3', 'the registered records (admin-fish.js)');
  } finally {
    A.fishSeenFrom(null);
  }
});

// On the real files: every fish unit Pierre has not picked a cover for shows a photo of its species most seen around the
// centre among those with an adult photo in play, and the admin's heading shows a photo of that same species.
test('real data: the default covers are of the most seen species, in the app and the admin alike (Q339 (b))', () => {
  const f = read('fish.json'),
    gm = C.fishGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    X = app(),
    B = X.run({f, ph: read('fish-photos.json'), gm}, cu),
    sp = Object.fromEntries(f.species.map(s => [s.id, s])),
    seen = sid => X.nearSeen(sp[sid]),
    key = sid => seen(sid)[0] * 1e6 + seen(sid)[1],
    play = A.fishGameIn(Object.values(gm.photos || {}).flat(), cu),
    nodes = Object.fromEntries([...f.families, ...f.genera].map(u => [u.id, new Set(u.species)]));
  assert.ok(f.centre && f.centre.name && Number.isFinite(f.centre.lat) && f.centre.radiusKm > 0, 'fish.json centre');
  let n = 0;
  Object.entries(B.gen).forEach(([id, g]) => {
    if (g.coverP || !g.views.wide.length || !nodes[id]) return;
    const A0 = g.views.wide.filter(p => !X.juvP(p)),
      c = g.views.wide.find(p => p.f === g.cover);
    if (!A0.length) return;
    n++;
    assert.ok(!X.juvP(c), `${id}: never a juvenile`);
    assert.strictEqual(key(c.sp), Math.max(...A0.map(p => key(p.sp))), `${id}: ${sp[c.sp].name} is not its most seen species`);
    const adm = A.fishCoverOf(
      play.filter(p => nodes[id].has(p.sp)),
      cu.fish,
      id,
      () => null,
      sid => A.fishNear(sp[sid])
    );
    if (adm) assert.strictEqual(key(adm.sp), key(c.sp), `${id}: the admin shows ${sp[adm.sp].name}, the app ${sp[c.sp].name}`);
  });
  assert.ok(n > 50, `${n} units checked`);
});
