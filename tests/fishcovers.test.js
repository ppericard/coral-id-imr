require('./slot.js').testGuard();
// Pierre's choices per fish unit on the admin's fish pages (curation.json fish genera {unit id: {cover, feat, ok}},
// autosort.js treePick) reach the app: app.js treeBuild → treeCurate gives the unit his cover (coverP, read first by
// cover(): the Learn cards, the sheets, the first-meeting cards, Home) while it is among its game photos, else the
// default cover; rankPhotos never takes it back; his featured photos of a species (featP) lead that species' photos on
// the sheets. The blocks of app.js run in a vm on core.js.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js'),
  A = require('../autosort.js'),
  {nodeCover} = require('../admin-covers.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// The app's fish build (treeBuild, treeCurate, treeGenera, rankPhotos) and its card photo (cover), with photoDiff
// (model.js) when given: run(raw, cur) builds TREEU from {f, ph, gm} under curation cur. The made-up worlds below list
// their photos as fish-photos.json's first photos (gm empty): records of photos in play by themselves (auto), as the
// real file's are, so Pierre's curation takes one out by its photo id (core.js treePhotos, treePhotoIn).
const inPlay = P => Object.fromEntries(Object.entries(P || {}).map(([t, L]) => [t, L.map(p => ({auto: 'cand', ...p}))]));
function app(photoDiff) {
  const ctx = {
    treeGen: C.treeGen,
    // no player id here (no SYNC, no anonId): no reserve, every photo in its unit's views
    reserveId: C.reserveId,
    reserveOf: C.reserveOf,
    reserveSplit: C.reserveSplit,
    treePhotos: (first, game, cur) => C.treePhotos(game && Object.keys(game).length ? first : inPlay(first), game, cur),
    easyRank: C.easyRank,
    easyCover: C.easyCover,
    treePid: C.treePid,
    treeScoreTree: C.treeScoreTree,
    treeSpUnits: C.treeSpUnits,
    spUnitId: C.spUnitId,
    treeGenSets: C.treeGenSets,
    refLevel: C.refLevel,
    contentApply: C.contentApply,
    treeCur: C.treeCur,
    unitRankOf: C.unitRankOf,
    SUBJECTS: C.SUBJECTS,
    ORG: C.ORG,
    ...(photoDiff ? {photoDiff} : {})
  };
  vm.createContext(ctx);
  vm.runInContext(
    "let TREEU = null, TREERAW = null, CUR = null, TREEF = null, TREE_AT = 'fish';\n" +
      block(src, 'const VIEWS = [', '];\n', {through: 1, file: 'app.js'}) +
      block(src, 'const allPhotos = g =>', '// applyCuration(d, c) and applySlots', {file: 'app.js'}) +
      block(src, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) +
      block(src, 'const treeBuild = () => {', 'const treeLoad = id =>', {file: 'app.js'}) +
      block(src, 'function rankPhotos() {', '\n}\n', {through: 1, file: 'app.js'}) +
      '\nthis.run = (raw, cur) => { TREERAW = raw; CUR = cur; return treeBuild(); }; this.cover = cover;' +
      '\nthis.juvP = juvP; this.adultFirst = adultFirst; this.seenCover = seenCover; this.nearSeen = nearSeen;' +
      ' this.wmP = wmP; this.coverFirst = coverFirst;',
    ctx
  );
  return ctx;
}

// One family of two species in one genus, its photos in play (auto: inPlay above): fi1 the easiest, fi2 harder, fi3 of s2.
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
  // No pick: the first of the easyRank order.
  let G = X.run(raw(), cur({})).gen['f:A'];
  assert.strictEqual(X.cover(G).f, 'fi1');
  assert.strictEqual(G.coverP, undefined);
  // His pick (a harder photo, never first in the game's order) is the card's photo.
  G = X.run(raw(), cur({cover: 'fi2'})).gen['f:A'];
  assert.strictEqual(X.cover(G).f, 'fi2');
  assert.strictEqual(G.cover, 'fi2');
  assert.strictEqual(G.views.wide[0].f, 'fi1', "the games' order is unchanged");
  // A pick out of play (rejected after the pick) falls back on the default; a pick of no photo at all, too.
  G = X.run(raw(), cur({cover: 'fi2'}, {seen: {fi2: 1}})).gen['f:A'];
  assert.strictEqual(X.cover(G).f, 'fi1');
  assert.ok(!G.views.wide.some(p => p.f === 'fi2'));
  assert.strictEqual(X.cover(X.run(raw(), cur({cover: 'gone'})).gen['f:A']).f, 'fi1');
  // The same photo under its candidate name (the admin picked the candidate, the game plays its reference copy).
  assert.strictEqual(X.cover(X.run(raw(), cur({cover: 'fish-s1-cand-2'})).gen['f:A']).f, 'fi2');
  // The genus unit (treeGenera) keeps its own cover: a family's pick is the family's.
  const g = X.run(raw(), cur({cover: 'fi2'})).gen['g:Xus'];
  assert.strictEqual(g.coverP, undefined);
  assert.strictEqual(X.cover(g).f, 'fi1');
  // No curation loaded yet: the default cover.
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
// (autosort.js treeCoverOf over the photos in play, treeGameIn), and the admin's Tree bar gives the app's reason (his ★, a
// juvenile ignored, out of play: admin-covers.js nodeCover), the photo matched by its id under either name (core.js
// treePid: his pick on a reference photo whose candidate copy the game plays, as on f:Damselfishes).
test("real data: every curated fish cover in play is the card's photo, the admin's and the app's alike", () => {
  const f = read('fish.json'),
    P = read('fish-photos.json'),
    gm = C.treeGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    X = app(),
    FISH = X.run({f, ph: P, gm: gm.photos ? gm : {photos: {}}}, cu),
    G = (cu.fish || {}).genera || {},
    all = Object.values(gm.photos || {}).flat(),
    play = A.treeGameIn(all, cu),
    gj = new Map(all.map(p => [p.f, {e: p.e, jt: p.jt}])), // the admin's fuJ falls back on the game record's judgment
    units = A.treeUnitsOf(f),
    pid = C.treePid;
  let n = 0;
  Object.entries(G).forEach(([id, k]) => {
    const g = FISH.gen[id],
      u = units.find(x => x.id === id);
    if (!k.cover || !g || !u) return;
    const rec = g.views.wide.find(p => pid(p.f) === pid(k.cover)),
      why = !rec ? 'gone' : X.juvP(rec) && !A.treeCoverJ(cu.fish, id, rec) ? 'juv' : 'mine',
      c = nodeCover(
        id,
        play.filter(p => u.species.includes(p.sp)),
        cu.fish,
        x => gj.get(x) || null
      );
    assert.strictEqual(c.gone ? 'gone' : c.juv ? 'juv' : c.by, why, `${id}: the admin's reason is the app's`);
    if (why === 'mine') assert.strictEqual(pid(c.p.f), pid(X.cover(g).f), `${id}: the admin's cover is the app's`);
  });
  Object.entries(G).forEach(([id, k]) => {
    const g = FISH.gen[id];
    if (!k.cover || !g) return;
    const rec = g.views.wide.find(p => C.treePid(p.f) === C.treePid(k.cover));
    // A pick on a juvenile is ignored, by the app and the admin alike (the next test): a judging pass can tag his pick
    // juvenile after he made it. Unless he confirmed it (his exception: autosort.js treeCoverJ).
    if (rec && X.juvP(rec) && !A.treeCoverJ(cu.fish, id, rec)) {
      assert.notStrictEqual(C.treePid(X.cover(g).f), C.treePid(k.cover), `${id}: a juvenile pick is ignored`);
      return;
    }
    if (rec) {
      n++;
      assert.strictEqual(C.treePid(X.cover(g).f), C.treePid(k.cover), id);
    }
    const u = units.find(x => x.id === id),
      adm =
        u &&
        A.treeCoverOf(
          play.filter(p => u.species.includes(p.sp)),
          cu.fish,
          id
        );
    if (adm && pid(adm.f) === pid(k.cover))
      assert.strictEqual(pid(X.cover(g).f), pid(k.cover), `${id}: the admin shows it, the app must too`);
  });
  if (Object.values(G).some(k => k.cover)) assert.ok(n, 'at least one curated cover is in play');
});

// On the real files, Pierre's two juvenile ★ covers: the Damselfishes' (judged a juvenile, ignored until confirmed) and
// the Boxfishes' (the yellow juvenile Ostracion cubicus, which a judging proposal may tag juvenile).
// The Tree page's one click (autosort.js treeCoverJOk) makes each his cover in force, the admin's and the app's; the
// Boxfishes' holds whichever comes first, the confirmation or the Accept of the proposal (admin-light.js lightAccept with
// the cover kept), and an Accept without it leaves the cover ignored until he confirms. Publish keeps the field (merge3).
// In memory only: curation.json is never written (rule A1).
test('real data: the two juvenile ★ covers, confirmed, hold in the admin and the app, whatever the order with #942', t => {
  const L = require('../admin-light.js'),
    cu = read('curation.json'),
    G0 = (cu.fish || {}).genera || {},
    BOX = 'f:Boxfishes',
    DAM = 'f:Damselfishes';
  if (!(G0[BOX] || {}).cover || !(G0[DAM] || {}).cover) return t.skip('the two covers are no longer his');
  const f = read('fish.json'),
    gm = C.treeGameRead(read('fish-game.json')),
    P = read('fish-photos.json'),
    all = Object.values(gm.photos || {}).flat(),
    gj = new Map(all.map(p => [p.f, {e: p.e, jt: p.jt}])),
    j = x => gj.get(x) || null,
    units = A.treeUnitsOf(f),
    pid = C.treePid,
    X = app();
  // The admin's reason and the app's cover, for a fish part F.
  const admin = (F, id) => {
    const u = units.find(x => x.id === id),
      play = A.treeGameIn(all, {...cu, fish: F});
    return nodeCover(
      id,
      play.filter(p => u.species.includes(p.sp)),
      F,
      j
    );
  };
  // The app reads a photo's tags from its game record (the players' copy drops fish.tags: tools/curplay.py), which the next
  // build writes from his tags (tools/fish_game.py): the records of the photos in `follow` take the draft's tags, as built.
  let follow = [];
  const built = F => ({
    ...gm,
    photos: Object.fromEntries(
      Object.entries(gm.photos).map(([t, R]) => [
        t,
        R.map(r => (follow.includes(r.f) && (F.tags || {})[r.f] ? {...r, jt: F.tags[r.f]} : r))
      ])
    )
  });
  const appCover = (F, id) => X.cover(X.run({f, ph: P, gm: built(F)}, {...cu, fish: F}).gen[id]).f;
  const mine = (F, id, what) => {
    const c = admin(F, id);
    assert.strictEqual(c.by, 'mine', `${id} ${what}: the admin's`);
    assert.ok(!c.juv, `${id} ${what}: not ignored`);
    assert.strictEqual(pid(appCover(F, id)), pid(G0[id].cover), `${id} ${what}: the app's`);
  };
  const F0 = cu.fish;
  // Damselfishes: ignored while judged a juvenile, confirmed in one click.
  if (admin(F0, DAM).juv) {
    assert.notStrictEqual(pid(appCover(F0, DAM)), pid(G0[DAM].cover), 'ignored before');
    mine(A.treeCoverJOk(F0, DAM), DAM, 'confirmed');
  }
  // Boxfishes: the proposal that tags it juvenile, if still open.
  const S = L.lightSets([[], read('judging/fish-one-judgement.json').curation]),
    x = L.lightJOf(S, F0, G0[BOX].cover);
  if (!x) return;
  follow = [x.photo];
  assert.deepStrictEqual(L.lightCovers(F0, x), [BOX], 'the proposal makes his Boxfishes ★ a juvenile');
  // Accept, cover kept (the question answered yes): one step.
  const Fa = L.lightAccept(F0, x, L.lightCovers(F0, x));
  assert.ok(A.treeJuv(A.treePhotoAt(all, x.photo), j(x.photo), Fa), 'now a juvenile');
  mine(Fa, BOX, 'accepted, kept');
  // Confirmed first (the Tree page's button, offered while the proposal is open), then a plain Accept.
  const Fc = A.treeCoverJOk(F0, BOX);
  mine(Fc, BOX, 'confirmed before the tag');
  assert.deepStrictEqual(L.lightCovers(Fc, x), [], 'Accept has nothing left to ask');
  mine(L.lightAccept(Fc, x), BOX, 'confirmed, then accepted');
  // Accepted without keeping it: ignored, until the one click.
  const Fn = L.lightAccept(F0, x);
  assert.ok(admin(Fn, BOX).juv, 'accepted without: ignored');
  assert.notStrictEqual(pid(appCover(Fn, BOX)), pid(G0[BOX].cover), "accepted without: ignored by the app's next build too");
  mine(A.treeCoverJOk(Fn, BOX), BOX, 'accepted, then confirmed');
  // Publish (core.js merge3) keeps the confirmation beside the cover, onto a published file changed elsewhere meanwhile.
  const base = {...cu, fish: F0},
    theirs = {...cu, fish: {...F0, genera: {...G0, [BOX]: {...G0[BOX], ok: true}}}},
    out = C.merge3(base, {...cu, fish: Fa}, theirs);
  assert.deepStrictEqual(out.fish.genera[BOX], {...G0[BOX], ok: true, coverJ: G0[BOX].cover});
});

// The first-meeting card (quiz.js introCard: cover()) shows his ★ Cover even when it is not what the automatic choice
// would take (his covers are all very visible and of reference level): a reference-level photo of the family (core.js
// refLevel, refFirst) leads the game's order, his pick is the card.
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
    FISH = X.run({f: read('fish.json'), ph: read('fish-photos.json'), gm: C.treeGameRead(read('fish-game.json'))}, cu);
  const low = Object.entries((cu.fish || {}).genera || {}).filter(([id, k]) => {
    const g = FISH.gen[id];
    return g && g.coverP && C.treePid(g.coverP.f) === C.treePid(k.cover) && !C.refLevel(g.coverP) && g.views.wide.some(C.refLevel);
  });
  low.forEach(([id, k]) => assert.strictEqual(C.treePid(X.cover(FISH.gen[id]).f), C.treePid(k.cover), id));
});

// Home's landscape tiles (home.js tilePhoto): his cover when its shape (ar) suits the tile (LAND_AR) and it shows the
// whole fish, else the mosaic's own pick (the first of the game's order that suits the tile, else the first); square
// tiles: cover().
test('Home tiles: his cover when it suits a landscape tile, else the mosaic pick (Q291)', () => {
  const hs = fs.readFileSync(path.join(ROOT, 'home.js'), 'utf8'),
    X = app(),
    ctx = {cover: g => g.coverP || g.views.wide[0], juvP: X.juvP, adultFirst: X.adultFirst, ORG: C.ORG};
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
  // Never a juvenile: a juvenile that suits the tile is passed over, as a juvenile first photo.
  const jl = {f: 'jl', ar: 1.5, jt: 'p1g0sl1j'},
    jp = {f: 'jp', ar: 1.5, jt: 'p1g0sl1', ph: 'juvenile'};
  assert.strictEqual(ctx.tile({views: {wide: [jl, jp, land]}}, true).f, 'land');
  assert.strictEqual(ctx.tile({views: {wide: [jl, sq]}}, true).f, 'sq', 'nothing suits: the first that is not a juvenile');
  assert.strictEqual(ctx.tile({views: {wide: [jl, jp]}}, true).f, 'jl', 'juveniles only: the first');
  // His ★ cover on a juvenile he confirmed (cj: app.js treeCurate) leads like any cover that suits.
  assert.strictEqual(ctx.tile({views: {wide: [land]}, coverP: {...jl, cj: 1}}, true).f, 'jl');
  assert.strictEqual(ctx.tile({views: {wide: [land]}, coverP: jl}, true).f, 'land', 'not confirmed: passed over');
});

// The Learn band rotates (home.js landPool, bandPhoto): each landscape tile draws one of its unit's photos that suit it,
// his cover first then its reference photos (core.js refLevel) in the game's order, at most LAND_ROT, the day's pick
// (dayPick: the same all day, so the service worker's cached photos serve Home after the day's first visit); a unit with
// none keeps tilePhoto's photo.
const homeBand = () => {
  const hs = fs.readFileSync(path.join(ROOT, 'home.js'), 'utf8'),
    X = app(),
    ctx = {cover: g => g.coverP || g.views.wide[0], juvP: X.juvP, adultFirst: X.adultFirst, refLevel: C.refLevel, ORG: C.ORG};
  vm.createContext(ctx);
  vm.runInContext(
    block(hs, 'const LAND_AR = [', 'const ph = (n, v) =>', {file: 'home.js'}) +
      '\nthis.tile = tilePhoto; this.pool = landPool; this.band = bandPhoto; this.ROT = LAND_ROT;',
    ctx
  );
  return {X, ctx};
};
const DAY = 864e5,
  NOON = new Date(2026, 10, 15, 12).getTime(); // local noon: three hours either way stay in the day
test('Home band: a landscape tile rotates among his cover and the reference photos that suit it', () => {
  const {X, ctx} = homeBand();
  const ref = (f, o = {}) => ({f, ar: 1.5, jt: 'p1g0sl1', e: 5, ...o}),
    r1 = ref('r1'),
    r2 = ref('r2'),
    r3 = ref('r3'),
    easy = ref('easy', {e: 3}), // fits, not a reference photo (ease 3: under the very easy)
    sq = ref('sq', {ar: 1}),
    cut = ref('cut', {jt: 'p0g0sl1'}),
    juv = ref('juv', {jt: 'p1g0sl1j'}),
    cov = ref('cov', {e: 3}); // his cover: fits the tile, not reference-level
  assert.ok(C.refLevel(r1) && !C.refLevel(easy) && !C.refLevel(cov));
  const g = {views: {wide: [r1, sq, cut, juv, easy, r2, cov, r3]}};
  const fs_ = L => Array.from(L, p => p.f); // out of the vm's realm
  assert.deepStrictEqual(fs_(ctx.pool(g)), ['r1', 'r2', 'r3'], 'the reference photos that suit the tile, in order');
  assert.deepStrictEqual(fs_(ctx.pool({...g, coverP: cov})), ['cov', 'r1', 'r2', 'r3'], 'his cover first, once, reference or not');
  assert.deepStrictEqual(fs_(ctx.pool({...g, coverP: r2})), ['r2', 'r1', 'r3'], 'a cover among them is not shown twice');
  assert.deepStrictEqual(fs_(ctx.pool({...g, coverP: sq})), ['r1', 'r2', 'r3'], 'a cover that does not suit the tile stays out');
  const many = {views: {wide: Array.from({length: 10}, (_, i) => ref('m' + i))}};
  assert.strictEqual(ctx.pool(many).length, ctx.ROT, `at most LAND_ROT (${ctx.ROT})`);
  // The band shows one of them, the day's: the same at every drawing of a day (three hours either way), each of them over
  // the days, not the same for every unit; a unit with none keeps tilePhoto's photo; square tiles: the card photo.
  const gc = {...g, coverP: cov},
    pool = fs_(ctx.pool(gc)),
    days = Array.from({length: 60}, (_, k) => ctx.band(gc, true, 'f:A', NOON + k * DAY).f);
  days.forEach(f => assert.ok(pool.includes(f), f));
  assert.deepStrictEqual([...new Set(days)].sort(), [...pool].sort(), 'over 60 days, every photo of the pool');
  [-3, -1, 1, 3].forEach(h => assert.strictEqual(ctx.band(gc, true, 'f:A', NOON + h * 36e5).f, days[0], `the day's pick, ${h} h`));
  assert.ok(
    Array.from({length: 20}, (_, k) => ctx.band(gc, true, 'f:' + k, NOON).f).some(f => f !== days[0]),
    "the day's pick differs between units"
  );
  const none = {views: {wide: [sq, easy, r1].map(p => ({...p, e: p === r1 ? 3 : p.e}))}};
  assert.strictEqual(ctx.pool(none).length, 0);
  assert.strictEqual(ctx.band(none, true, 'f:A', NOON).f, ctx.tile(none, true).f, 'none to rotate: the photo as before');
  assert.strictEqual(ctx.band(none, true, 'f:A', NOON).f, 'easy');
  assert.strictEqual(ctx.band({...g, coverP: sq}, false, 'f:A', NOON).f, 'sq', 'square tiles: the card photo');
  // On the real files: every photo a tile can draw suits it, his fitting cover leads, and most circle-1 units rotate.
  const FISH = app().run(
    {f: read('fish.json'), ph: read('fish-photos.json'), gm: C.treeGameRead(read('fish-game.json'))},
    read('curation.json')
  );
  const units = Object.values(FISH.gen).filter(u => u.views.wide.length && u.circle === 1);
  units.forEach(u => {
    const P = ctx.pool(u);
    assert.ok(P.length <= ctx.ROT && new Set(P).size === P.length, u.name);
    P.forEach(p => assert.ok(p.ar >= 1.3 && p.ar <= 1.8 && p.jt.charAt(1) === '1' && !X.juvP(p), `${u.name} ${p.f}`));
    if (P.length && u.coverP && P.includes(u.coverP)) assert.strictEqual(P[0], u.coverP, u.name);
  });
  const rot = units.filter(u => ctx.pool(u).length > 1).length;
  assert.ok(rot > units.length / 2, `${rot} of ${units.length} circle-1 units rotate`);
});

// Home's band rotates only among photos on R2, never one still remote (r: 1 with its online original), which app.js
// thumb serves from iNaturalist or FishBase at ~500 px, without R2's sizes, srcset or Saver; a unit with one R2 photo
// that suits the tile shows it every day. A tile's own pick takes one on R2 first; before fish-game.json is in (app.js
// fishHome) every photo is remote, and it still takes one that suits the tile.
test('Home band: rotates only among R2 photos; a tile prefers one on R2', () => {
  const {X, ctx} = homeBand();
  const ref = (f, o = {}) => ({f, ar: 1.5, jt: 'p1g0sl1', e: 5, ...o}),
    rem = (f, o) => ref(f, {r: 1, src: `https://inaturalist-open-data.s3.amazonaws.com/photos/${f.slice(2)}/original.jpg`, ...o}),
    a = rem('fi9001'),
    b = ref('r1'),
    c = rem('fi9002'),
    d = ref('r2');
  assert.ok(C.refLevel(a) && C.refLevel(c), 'remote reference photos that suit the tile');
  const fs_ = L => Array.from(L, p => p.f);
  assert.deepStrictEqual(fs_(ctx.pool({views: {wide: [a, b, c, d]}})), ['r1', 'r2'], 'only the R2 photos rotate');
  assert.deepStrictEqual(fs_(ctx.pool({views: {wide: [a, b, c]}, coverP: a})), ['r1'], 'one R2 photo: that one');
  const one = {views: {wide: [a, b, c]}};
  for (let k = 0; k < 30; k++) assert.strictEqual(ctx.band(one, true, 'f:A', NOON + k * DAY).f, 'r1', 'one R2 photo: every day');
  // A unit with no pool: the tile's own pick (and the Identify door's art), the first R2 photo that suits it.
  assert.strictEqual(ctx.tile({views: {wide: [rem('fi9003', {e: 4}), ref('e1', {e: 4})]}}, true).f, 'e1');
  // Remote photos only (before fish-game.json is in): the first that suits the tile, never one of another shape.
  const stop = {views: {wide: [rem('fi9004', {ar: 1}), rem('fi9005', {e: 4})]}};
  assert.strictEqual(ctx.pool(stop).length, 0);
  assert.strictEqual(ctx.band(stop, true, 'f:A', NOON).f, 'fi9005', 'all remote: the one that suits the tile');
  // On the real files, with and without his curation: no remote photo in any unit's pool, nor on the tile of one with none.
  const raw = {f: read('fish.json'), ph: read('fish-photos.json'), gm: C.treeGameRead(read('fish-game.json'))};
  for (const cur of [read('curation.json'), null]) {
    const units = Object.values(X.run(raw, cur).gen).filter(u => u.views.wide.length),
      shown = u => (ctx.pool(u).length ? ctx.pool(u) : [ctx.tile(u, true)]);
    assert.deepStrictEqual(
      units.flatMap(u =>
        shown(u)
          .filter(p => p.r && p.src)
          .map(p => `${u.name} ${p.f}`)
      ),
      [],
      cur ? 'curated' : 'no curation yet'
    );
  }
});

// A wink's surprise card (quiz.js winkPhoto; the Thresher sharks', for one): his ★ Cover while in play (coverP), else one
// of the wink's chosen photos in play, else the unit's best.
test("wink card: his ★ Cover while in play, else the wink's chosen photos (Q290)", () => {
  const qs = fs.readFileSync(path.join(ROOT, 'quiz.js'), 'utf8'),
    ctx = {treePid: C.treePid, easyRank: C.easyRank, pick: a => a[0]};
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
    FISH = app().run({f: read('fish.json'), ph: read('fish-photos.json'), gm: C.treeGameRead(read('fish-game.json'))}, cu);
  FISH.winks
    .filter(n => FISH.gen[n].coverP)
    .forEach(n => assert.strictEqual(C.treePid(ctx.wp(FISH.gen[n]).f), C.treePid(cu.fish.genera[n].cover), n));
});

// ---- A genus's and a species' ★ Cover: curation.json fish genera under the genus's 'g:' id or the species' id,
// {cover}. A genus unit (circle 1) takes it as its coverP, as a family; a genus with no unit and a species get it in
// TREEU.covers while it is in play as a photo of that genus or species; learn.js reads them: the species' first photo
// (spPhoto), the genus row and cards (genCover). ----
// Two families: f:A (circle 1, its genus g:Xus a unit), f:B (circle 3, its genus g:Yus no unit).
const F2 = {
  families: [
    {id: 'f:A', name: 'As', sci: ['Aidae'], species: ['s1', 's2'], genera: ['g:Xus'], circle: 1},
    // a surprise card's family (a wink): its genus has no unit, in every circle (app.js treeGenera, core.js treeGenSets)
    {id: 'f:B', name: 'Bs', sci: ['Bidae'], species: ['s3'], genera: ['g:Yus'], circle: 3, wink: {choices: [], right: '', wrong: ''}}
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
  // The family's default shows s1 (no presence: the easy order's first species), so his ★ cover of s1 (a manual choice
  // is never overridden).
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2', "the family's default: his ★ cover of its species");
  assert.strictEqual(B.gen['g:Xus'].views.wide[0].f, 'fi1', "the games' order unchanged");
  assert.strictEqual(B.covers.s1.f, 'fi2');
  assert.strictEqual(B.covers['g:Yus'].f, 'fi5', 'a genus with no unit');
  assert.strictEqual(B.covers.s3.f, 'fi5');
  assert.ok(!B.gen.s1 && !B.gen['g:Yus'], 'no unit made for them');
  // A photo of another species or genus is no cover of this one; a candidate name finds its reference copy.
  B = X.run(raw2(), cur2({s1: {cover: 'fi3'}, 'g:Yus': {cover: 'fi1'}, s2: {cover: 'fish-s1-cand-2'}}));
  assert.deepStrictEqual(Object.keys(B.covers), []);
  assert.strictEqual(X.run(raw2(), cur2({s1: {cover: 'fish-s1-cand-2'}})).covers.s1.f, 'fi2');
  // Out of play (rejected after the pick): no cover; the genus falls back on its default.
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
      TREEU: B,
      juvP: X.juvP,
      adultFirst: X.adultFirst,
      coverFirst: X.coverFirst,
      easyRank: C.easyRank,
      GX: n => B.gen[n],
      hr: k => k,
      esc: s => String(s),
      thumb: p => `data-f="${p.f}"`,
      noFish: () => '<nofish>',
      spOpen: () => true,
      genSpecies: g => g.species.map(id => F2.species.find(s => s.id === id)),
      seenCover: X.seenCover,
      treeSeen: sid => X.nearSeen((B.sps || {})[sid]),
      treeSpPick: sid => (B.covers || {})[sid] || null,
      // a tree's English names given as information (app.js vernFirst, learn.js capFirst): none for the fish
      vernFirst: () => '',
      capFirst: s => s
    };
  vm.createContext(ctx);
  vm.runInContext(
    'let FSPH = null, FSPH_OF = null;\n' +
      block(ls, 'const treeSpPhotos = () => {', '// The one "No photo yet" drawing', {file: 'learn.js'}) +
      block(ls, 'function treeGenusRow(g, flat) {', '\n}\n', {through: 1, file: 'learn.js'}) +
      '\nthis.spPhoto = spPhoto; this.genCover = genCover; this.sp = treeSpPhotos; this.row = treeGenusRow; this.nodeCover = nodeCover;',
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
  // A genus with no unit: its cover from TREEU.covers.
  L = sheets(X.run(raw2(), cur2({'g:Yus': {cover: 'fi5'}})));
  assert.strictEqual(L.genCover(F2.genera[1]).f, 'fi5');
});

// A juvenile photo is never a cover, at any rank, picked or not: juvenile = its phase word (the record's ph) or its
// tags' juvenile flag (app.js juvP). His pick on one is ignored (treeCurate: no coverP, no TREEU.covers); every default
// skips them while the unit has another photo (the card's cover, rankPhotos, a species' one photo, the family hero), and
// a unit of juveniles only keeps one.
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

// Pierre's exception (a juvenile better known than the adults, as the Boxfishes' yellow one): his ★ cover on a juvenile
// holds once he confirmed it (curation.json fish genera {id: {cover, coverJ}}, coverJ naming the cover's photo under
// either name: app.js coverOk), at every rank, in the card, the default's species pick (seenCover), a species' one photo
// and its sheet. A confirmation naming another photo is none; the default alone
// never takes a juvenile.
test('a juvenile cover he confirmed holds everywhere; the default still never takes one', () => {
  const X = app(),
    R = () => {
      const r = raw2();
      Object.assign(r.ph.photos.t1[0], {ph: 'juvenile'}); // fi1 (s1): juvenile by its phase
      Object.assign(r.ph.photos.t1[2], {jt: 'p1g0sl1j'}); // fi3 (s2): juvenile by its tags
      return r;
    };
  let B = X.run(
    R(),
    cur2({'f:A': {cover: 'fi1', coverJ: 'fi1'}, 'g:Xus': {cover: 'fi3', coverJ: 'fish-s2-cand-3'}, s2: {cover: 'fi3', coverJ: 'fi3'}})
  );
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi1', 'the family card: his confirmed juvenile');
  assert.ok(B.gen['f:A'].coverP.cj && X.juvP(B.gen['f:A'].coverP), 'marked as confirmed, still a juvenile');
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi3', 'a genus: confirmed under the other name of the photo');
  assert.strictEqual(B.covers.s2.f, 'fi3', 'a species');
  assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1', "the games' order is unchanged");
  // A confirmation of another photo, or none: the juvenile pick stays ignored.
  B = X.run(R(), cur2({'f:A': {cover: 'fi1', coverJ: 'fi2'}, s2: {cover: 'fi3'}}));
  assert.strictEqual(B.gen['f:A'].coverP, undefined);
  assert.strictEqual(B.covers.s2, undefined);
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2', 'the default skips the juvenile');
  // The default's species pick: s1 is the leaf chosen (on its adult photo); his confirmed ★ cover of s1 is taken.
  B = X.run(R(), cur2({s1: {cover: 'fi1', coverJ: 'fi1'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi1', 'the default: his confirmed ★ cover of the most seen species');
  B = X.run(R(), cur2({s1: {cover: 'fi1'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2', 'not confirmed: the species ★ is ignored');
  // The sheets: a species' one photo and its sheet's first.
  const L = sheets(X.run(R(), cur2({s2: {cover: 'fi3', coverJ: 'fi3'}})));
  assert.strictEqual(L.spPhoto({id: 's2'}).f, 'fi3', "the species' one photo: his confirmed juvenile");
  assert.strictEqual(sheets(X.run(R(), cur2({s2: {cover: 'fi3'}}))).spPhoto({id: 's2'}).f, 'fi6', 'not confirmed: the adult');
});

// A watermarked photo is never a default cover, at any level (its flag w: app.js wmP): the card's default, rankPhotos,
// the default's species pick, a species' one photo and its sheet's first photo skip it while the node has another adult
// photo. His ★ cover on one stays his choice (rule A1) at every rank, kept in the admin (coverW: autosort.js treeCoverW)
// or not: the app never reads coverW. Home skips it all the same, kept or not, his ★ cover included (home.js homeOk).
test('a watermarked photo is never a default cover; his ★ cover on one stays his, and Home skips it, kept or not', () => {
  const X = app(),
    R = () => {
      const r = raw2();
      r.f = seenF({s1: {dauinU: 9}}); // s1 the most seen: the default's species
      Object.values(r.ph.photos)
        .flat()
        .forEach(p => Object.assign(p, {jt: 'p1g0sm0', ar: 1.5}));
      r.ph.photos.t1[0].jt = 'p1g0sm0w'; // fi1 (s1, the easiest): watermarked
      r.ph.photos.t2[0].jt = 'p1g0sm0w'; // fi4 (s3, the easiest)
      r.ph.photos.t2[1].jt = 'p1g0sm0w'; // fi5: s3 has only watermarked photos
      return r;
    };
  assert.ok(X.wmP({jt: 'p1g0sl1w'}) && X.wmP({jt: 'p1g0sl1jwr'}) && !X.wmP({jt: 'p1g0sl1'}) && !X.wmP({f: 'coral'}) && !X.wmP(null));
  assert.ok(!X.wmP({jt: 'w1g0sl1'}), 'the flags only, after the seven tags');
  let B = X.run(R(), cur2({}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2', 'the family default skips the watermarked first photo');
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi2', 'a genus unit too');
  assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1', "the games' order is unchanged");
  assert.strictEqual(X.cover(B.gen['f:B']).f, 'fi4', 'only watermarked photos: it keeps one');
  // rankPhotos (the players' ratings) skips it too.
  const Y = app((n, p) => ({fi1: -9})[p.f] || 0);
  assert.strictEqual(Y.cover(Y.run(R(), cur2({})).gen['f:A']).f, 'fi2');
  // His ★ cover on one: his choice at every rank, kept (coverW) or not.
  for (const k of [{cover: 'fi1'}, {cover: 'fi1', coverW: 'fi1'}]) {
    B = X.run(R(), cur2({'f:A': k, 'g:Xus': k, s1: k}));
    assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi1', `the family: his ★ ${JSON.stringify(k)}`);
    assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi1', 'the genus');
    assert.strictEqual(B.covers.s1.f, 'fi1', 'the species');
    assert.ok(!B.gen['f:A'].coverP.cj, 'no mark: the app never reads coverW');
  }
  // His ★ cover of the species the default chooses, watermarked: the default takes its photo without one instead, kept
  // or not; a node whose adult photos all carry one takes it.
  B = X.run(R(), cur2({s1: {cover: 'fi1', coverW: 'fi1'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2', 'the default never takes his watermarked species ★');
  B = X.run(R(), cur2({s3: {cover: 'fi5'}}));
  assert.strictEqual(X.cover(B.gen['f:B']).f, 'fi5', 'only watermarked photos: his species ★ as before');
  // The sheets: a species' one photo and its sheet's first; the family hero (learn.js nodeCover).
  let L = sheets(X.run(R(), cur2({})));
  assert.strictEqual(L.spPhoto({id: 's1'}).f, 'fi2', "a species' one photo skips it");
  assert.strictEqual(L.spPhoto({id: 's3'}).f, 'fi4', 'only watermarked photos: it keeps one');
  assert.strictEqual(L.nodeCover(F2.species.slice(0, 2)).f, 'fi2');
  L = sheets(X.run(R(), cur2({s1: {cover: 'fi1'}})));
  assert.strictEqual(L.spPhoto({id: 's1'}).f, 'fi1', 'his species ★ with a watermark: its one photo, his choice');
  L = sheets(X.run(R(), cur2({'f:A': {feat: {s1: ['fi1']}}})));
  assert.strictEqual(L.spPhoto({id: 's1'}).f, 'fi2', 'a featured photo is not his cover: skipped as the default');
  // Home: his kept ★ cover with a watermark is skipped all the same (the band's pool and a tile's pick).
  const {ctx} = homeBand();
  B = X.run(R(), cur2({'f:A': {cover: 'fi1', coverW: 'fi1'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi1');
  assert.ok(!Array.from(ctx.pool(B.gen['f:A']), p => p.f).includes('fi1'), 'not in the band');
  assert.notStrictEqual(ctx.tile(B.gen['f:A'], true).f, 'fi1', 'not its tile');
});

// The species sheet's photos (learn.js spSheetPhotos): three adult photos, the first its cover (treeSpPhotos' order),
// then up to two juveniles apart; a juvenile is never its first photo while it has an adult one.
test('species sheet: the adults first, then the juveniles apart', () => {
  const ls = fs.readFileSync(path.join(ROOT, 'learn.js'), 'utf8'),
    X = app(),
    a = k => ({f: 'a' + k, jt: 'p1g0sl1'}),
    j = k => ({f: 'j' + k, jt: 'p1g0sl1j'}),
    ctx = {juvP: X.juvP};
  vm.createContext(ctx);
  vm.runInContext(
    block(ls, 'function spSheetPhotos(P, lead = null) {', '\n}\n', {through: 1, file: 'learn.js'}) + '\nthis.sp = spSheetPhotos;',
    ctx
  );
  const run = P => {
    const r = ctx.sp(P);
    return [r.shown.map(p => p.f).join(), r.more.map(p => p.f).join()];
  };
  assert.deepStrictEqual(run([j(1), a(1), a(2), j(2), a(3), a(4), {f: 'p', ph: 'juvenile'}]), ['a1,a2,a3,j1,j2', 'a4']);
  assert.deepStrictEqual(run([j(1), j(2), j(3)]), ['j1,j2', '']);
  // His confirmed juvenile species cover (lead: learn.js spJCover) stays first, and is not shown again among the juveniles.
  const P = [j(1), a(1), a(2), j(2), a(3)],
    r = ctx.sp(P, P[0]);
  assert.deepStrictEqual([r.shown.map(p => p.f).join(), r.more.map(p => p.f).join()], ['j1,a1,a2,j2', 'a3']);
  // The default's photo without a watermark (lead: learn.js spPhoto) first, before a watermarked one ahead of it.
  const w = {f: 'w1', jt: 'p1g0sl1w'},
    Q = [w, a(1), j(1), a(2), a(3)],
    s = ctx.sp(Q, Q[1]);
  assert.deepStrictEqual([s.shown.map(p => p.f).join(), s.more.map(p => p.f).join()], ['a1,w1,a2,j1', 'a3']);
});

// The admin's ★ Cover at the genus or species level (autosort.js treeCover under that id) and the app agree on the real
// files: a photo in play of a circle-1 genus and of one of its species, picked in memory (curation.json is never written:
// rule A1), is the genus's card and the species' first photo; once it leaves play (Remove: treeDrop, treeReject) no key
// points at it; Publish merges these keys like a family's (core.js merge3).
test('real data: a genus and a species cover picked in the admin are the app’s, and leave with the photo', () => {
  const f = read('fish.json'),
    P = read('fish-photos.json'),
    gm = C.treeGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    play = A.treeGameIn(Object.values(gm.photos || {}).flat(), cu),
    X = app();
  const B0 = X.run({f, ph: P, gm}, cu),
    gid = Object.keys(B0.gen).find(id => B0.gen[id].rank && B0.gen[id].views.wide.length > 3 && !(cu.fish.genera || {})[id]),
    G = f.genera.find(g => g.id === gid),
    inG = play.filter(p => G.species.includes(p.sp)),
    // a photo the automatic choice would not take, so the pick shows
    pg = inG.find(p => C.treePid(p.f) !== C.treePid(X.cover(B0.gen[gid]).f));
  assert.ok(pg, `a photo in play of ${gid}`);
  const sid = pg.sp,
    ps = inG.find(p => p.sp === sid && p.f !== pg.f) || pg;
  let F = A.treeCover(A.treeCover(cu.fish, gid, pg.f), sid, ps.f);
  assert.strictEqual(A.treeCoverOf(inG, F, gid).f, pg.f, "the admin's genus heading");
  let B = X.run({f, ph: P, gm}, {...cu, fish: F});
  assert.strictEqual(C.treePid(X.cover(B.gen[gid]).f), C.treePid(pg.f), `${gid}: the app's genus card`);
  assert.strictEqual(C.treePid(B.covers[sid].f), C.treePid(ps.f), `${sid}: the species cover`);
  const M = C.merge3(cu, {...cu, fish: F}, cu);
  assert.deepStrictEqual([M.fish.genera[gid].cover, M.fish.genera[sid].cover], [pg.f, ps.f]);
  // Remove on its family page: treeDrop then treeReject, one step.
  F = A.treeReject(A.treeDrop(F, f.species.find(s => s.id === sid).family, ps.f), ps.f);
  assert.ok(!Object.values(F.genera).some(k => k.cover === ps.f), 'no cover key left on the photo');
  B = X.run({f, ph: P, gm}, {...cu, fish: F});
  assert.ok(!B.covers[sid] || C.treePid(B.covers[sid].f) !== C.treePid(ps.f));
});

// The ranks ★ Cover can set are the subject's own (corals, sea slugs or plants alike): read from SUBJECTS sheets,
// broadest first, else the unit's rank alone (no switch); a key's rank from its sheet prefix, else the narrowest rank
// (admin.js ranksOf, fuRankOf; rule S1).
test('the cover ranks come from the subject: SUBJECTS sheets, else its unit alone', () => {
  const ad = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
    ctx = {ASUBJ: null};
  vm.createContext(ctx);
  vm.runInContext(
    block(ad, 'const ranksOf = (S = ASUBJ) =>', '// The rubric a subject declares', {file: 'admin.js'}) +
      '\nthis.ranks = ranksOf; this.rankOf = fuRankOf;',
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

// ---- The default cover of a node with leaves: when he has picked no cover for the node, among its species with a
// reference-level photo that is not a juvenile, the one most seen around the instance's centre by distinct observers
// (ties: observations, then the easy order), then his ★ cover of that species, else its easiest such reference photo;
// with no reference photo under the node, the most seen species with an adult photo; a node with no presence keeps the
// easy order's first. The app (app.js seenCover: treeCurate, rankPhotos;
// learn.js nodeCover) and the admin (autosort.js treeCoverOf) alike.
// f:A and g:Xus hold s1 (fi1 e5, fi2 e3) and s2 (fi3 e4, fi6 e2): fi1 leads the easy order; none is reference-level
// unless a case makes it one (side profile, sharp, a reference source: core.js refLevel).
const seenF = pres => ({...F2, species: F2.species.map(s => (pres[s.id] ? {...s, present: pres[s.id]} : s))});
const REFJT = 'p1g0sl1';
// wm: the photos with a watermark (their flag w); in such a case every other photo carries a plain code too (no
// reference look), so the easy order stays the ease's.
const seenRaw = (pres, juv = [], ref = [], wm = []) => {
  const r = raw2();
  r.f = seenF(pres);
  Object.values(r.ph.photos)
    .flat()
    .forEach(p => {
      if (juv.includes(p.f)) p.ph = 'juvenile';
      if (ref.includes(p.f)) Object.assign(p, {jt: REFJT, rep: 'inaturalist', e: Math.max(p.e, 4)});
      if (wm.length) p.jt = (p.jt || 'p1g0sm0') + (wm.includes(p.f) ? 'w' : '');
    });
  return r;
};
const CASES = [
  // [what, presence, juveniles, reference-level photos, the default]
  ['no presence: the easy order, as before', {}, [], [], 'fi1'],
  [
    'no reference photo: the most observers wins over the easiest photo',
    {s1: {dauinU: 2, dauin: 5}, s2: {dauinU: 9, dauin: 9}},
    [],
    [],
    'fi3'
  ],
  ['tied observers: the most observations', {s1: {dauinU: 9, dauin: 12}, s2: {dauinU: 9, dauin: 9}}, [], [], 'fi1'],
  ['tied observers and observations: the easy order', {s1: {dauinU: 9, dauin: 9}, s2: {dauinU: 9, dauin: 9}}, [], [], 'fi1'],
  ['its easiest photo a juvenile: its next', {s2: {dauinU: 9, dauin: 9}}, ['fi3'], [], 'fi6'],
  ['every photo of it juvenile: the next species', {s2: {dauinU: 9, dauin: 9}}, ['fi3', 'fi6'], [], 'fi1'],
  ['juveniles only: the easy order keeps one', {s2: {dauinU: 9, dauin: 9}}, ['fi1', 'fi2', 'fi3', 'fi6'], [], 'fi1'],
  ['the generic names first (nearU, nearN), the first names after', {s1: {dauinU: 2}, s2: {nearU: 1, dauinU: 9}}, [], [], 'fi1'],
  ['nearN breaks the tie as dauin did', {s1: {nearU: 3, nearN: 3}, s2: {nearU: 3, nearN: 4, dauin: 1}}, [], [], 'fi3'],
  ['(b): only the species with a reference photo compete', {s1: {dauinU: 9, dauin: 9}, s2: {dauinU: 2, dauin: 2}}, [], ['fi6'], 'fi6'],
  ['(b): its reference photo, not its easiest photo', {s2: {dauinU: 9, dauin: 9}}, [], ['fi6', 'fi1'], 'fi6'],
  ['(b): among several with one, the most seen', {s1: {dauinU: 9}, s2: {dauinU: 2}}, [], ['fi6', 'fi2'], 'fi2'],
  ['(b): a juvenile reference photo does not count', {s1: {dauinU: 9}, s2: {dauinU: 2}}, ['fi6'], ['fi6'], 'fi1'],
  // [..., the photos with a watermark]: never a default cover while the node has another adult photo
  ['its easiest photo watermarked: its next', {s2: {dauinU: 9, dauin: 9}}, [], [], 'fi6', ['fi3']],
  ['every photo of it watermarked: the next species', {s2: {dauinU: 9, dauin: 9}}, [], [], 'fi1', ['fi3', 'fi6']],
  ['every adult photo watermarked: the rule as before', {s2: {dauinU: 9, dauin: 9}}, [], [], 'fi3', ['fi1', 'fi2', 'fi3', 'fi6']],
  ['a juvenile without one and adults with: an adult all the same', {s2: {dauinU: 9}}, ['fi6'], [], 'fi3', ['fi1', 'fi2', 'fi3']],
  ['(b): a watermarked reference photo does not count', {s1: {dauinU: 9}, s2: {dauinU: 2}}, [], ['fi6', 'fi2'], 'fi6', ['fi2']],
  ['(b): a photo without one before a watermarked reference photo', {s2: {dauinU: 9}}, [], ['fi3'], 'fi6', ['fi3']]
];
test('default cover (Q339 (b)): the most seen species with a reference photo, then its reference photo; ties, juveniles', () => {
  const X = app();
  CASES.forEach(([what, pres, juv, ref, want, wm]) => {
    const B = X.run(seenRaw(pres, juv, ref, wm), cur2({}));
    assert.strictEqual(X.cover(B.gen['f:A']).f, want, `family: ${what}`);
    assert.strictEqual(X.cover(B.gen['g:Xus']).f, want, `genus unit: ${what}`);
  });
  // His pick of the node wins, at every rank, even over the most seen species.
  const pres = {s2: {dauinU: 9, dauin: 9}};
  let B = X.run(seenRaw(pres), cur2({'f:A': {cover: 'fi2'}, 'g:Xus': {cover: 'fi1'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi2');
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi1');
  // His ★ cover of the species the default shows is the node's photo, even when it is not its reference photo; another
  // species' pick is not.
  B = X.run(seenRaw(pres, [], ['fi3']), cur2({s2: {cover: 'fi6'}, s1: {cover: 'fi2'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi6');
  assert.strictEqual(X.cover(B.gen['g:Xus']).f, 'fi6');
  B = X.run(seenRaw(pres, ['fi6'], ['fi3']), cur2({s2: {cover: 'fi6'}}));
  assert.strictEqual(X.cover(B.gen['f:A']).f, 'fi3', 'a juvenile species pick is ignored');
  // The players' ratings (rankPhotos) order the photos within the species; the species stays the most seen.
  const Y = app((n, p) => ({fi1: -9, fi6: -8, fi3: -1})[p.f] || 0);
  B = Y.run(seenRaw(pres), cur2({}));
  assert.strictEqual(B.gen['f:A'].views.wide[0].f, 'fi1', "the games' order is unchanged");
  assert.strictEqual(Y.cover(B.gen['f:A']).f, 'fi6', 'the rated order within the most seen species');
  assert.strictEqual(Y.cover(Y.run(seenRaw(pres), cur2({s2: {cover: 'fi3'}})).gen['f:A']).f, 'fi3', 'rankPhotos keeps his species pick');
  // The sheets (learn.js nodeCover: the family hero, its look-alike cards, the sibling genus cards) read the same rule.
  let L = sheets(X.run(seenRaw(pres, ['fi3']), cur2({})));
  assert.strictEqual(L.nodeCover(F2.species.slice(0, 2)).f, 'fi6');
  L = sheets(X.run(seenRaw(pres), cur2({s2: {cover: 'fi6'}})));
  assert.strictEqual(L.nodeCover(F2.species.slice(0, 2)).f, 'fi6', 'his species pick');
  assert.strictEqual(sheets(X.run(seenRaw({}), cur2({}))).nodeCover(F2.species.slice(0, 2)).f, 'fi1', 'no presence: as before');
});

// The admin's copy (autosort.js treeCoverOf: the family's and the genus headings' default thumbs) picks as the app does.
test("default cover (Q339 (b)): the admin's treeCoverOf agrees with the app's seenCover", () => {
  const X = app(),
    E = {fi1: 5, fi2: 3, fi3: 4, fi6: 2};
  CASES.forEach(([what, pres, juv, ref, want, wm]) => {
    const r = seenRaw(pres, juv, ref, wm),
      sp = Object.fromEntries(r.f.species.map(s => [s.id, s])),
      rec = Object.fromEntries(r.ph.photos.t1.map(p => [p.f, p])),
      // the judgment the admin reads (fuJ): the record's ease and tags
      jr = f => ({e: (rec[f] || {}).e || E[f], jt: (rec[f] || {}).jt}),
      L = r.ph.photos.t1.map(p => ({f: p.f, sp: p.sp, ...(p.ph ? {ph: p.ph} : {}), ...(p.rep ? {rep: p.rep} : {})}));
    assert.strictEqual(A.treeCoverOf(L, {}, 'f:A', jr, sid => A.treeNear(sp[sid])).f, want, `admin: ${what}`);
    assert.strictEqual(X.seenCover(r.ph.photos.t1, sid => X.nearSeen(sp[sid])).f, want, `app: ${what}`);
    // the admin's own records carry the species as sid
    assert.strictEqual(
      A.treeCoverOf(
        L.map(({sp: s, ...p}) => ({...p, sid: s})),
        {},
        'f:A',
        jr,
        sid => A.treeNear(sp[sid])
      ).f,
      want
    );
  });
  const j = f => ({e: E[f]});
  // His ★ cover of the species the default shows; a juvenile one ignored (the admin reads his phase too).
  const spP = {s2: {present: {dauinU: 9}}},
    LP = ['fi1', 'fi2', 'fi3', 'fi6'].map(f => ({f, sp: f === 'fi1' || f === 'fi2' ? 's1' : 's2'}));
  assert.strictEqual(A.treeCoverOf(LP, {genera: {s2: {cover: 'fi6'}}}, 'f:A', j, sid => A.treeNear(spP[sid])).f, 'fi6');
  assert.strictEqual(A.treeCoverOf(LP, {genera: {s1: {cover: 'fi2'}}}, 'f:A', j, sid => A.treeNear(spP[sid])).f, 'fi3');
  assert.strictEqual(
    A.treeCoverOf(LP, {genera: {s2: {cover: 'fi6'}}, phase: {fi6: 'juvenile'}}, 'f:A', j, sid => A.treeNear(spP[sid])).f,
    'fi3',
    'a juvenile species pick is ignored'
  );
  // A photo's species in the admin: the one his curation adds it to (a candidate of s1 sent to s2 with Not this and added
  // there still carries sid s1), else its game record's, else its candidate's; a record with neither reads as unseen.
  const sp2 = {s2: {present: {dauinU: 9}}},
    M = [
      {f: 'fi1', sid: 's1'},
      {f: 'fi3', sid: 's1'}
    ];
  assert.strictEqual(A.treeCoverOf(M, {}, 'f:A', j, sid => A.treeNear(sp2[sid])).f, 'fi1');
  assert.strictEqual(A.treeCoverOf(M, {add: {fi3: 's2'}}, 'f:A', j, sid => A.treeNear(sp2[sid])).f, 'fi3', 'its species is the add');
  assert.strictEqual(A.treeCoverOf([{f: 'fi1'}, {f: 'fi3', sp: 's2'}], {}, 'f:A', j, sid => A.treeNear(sp2[sid])).f, 'fi3');
  // His pick wins; with no species registered (treeSeenFrom not called) every default keeps the game's order.
  const sp = {s2: {present: {dauinU: 9}}},
    L = [
      {f: 'fi1', sp: 's1'},
      {f: 'fi3', sp: 's2'}
    ];
  assert.strictEqual(A.treeCoverOf(L, {genera: {'f:A': {cover: 'fi1'}}}, 'f:A', j, sid => A.treeNear(sp[sid])).f, 'fi1');
  assert.strictEqual(A.treeCoverOf(L, {}, 'f:A', j).f, 'fi1', 'nothing registered: as before');
  A.treeSeenFrom(sid => sp[sid]);
  try {
    assert.strictEqual(A.treeCoverOf(L, {}, 'f:A', j).f, 'fi3', 'the registered records (admin-fish.js)');
  } finally {
    A.treeSeenFrom(null);
  }
});

// On the real files: each of his ★ covers of a family or a genus on a watermarked photo stays his card in the app
// (rule A1), and in the admin either he kept it (coverW) or its node page asks and Cover proposals hold an open proposal of
// a photo without a watermark (unless the node has no adult photo without one). Whatever he answers and publishes, and
// whatever a later watermark pass tags, this holds; the cases are printed, not counted.
test('real data: his watermarked ★ covers stay his; each is kept or has an open proposal without a watermark (Q379)', t => {
  const {coverProposal, coverOpen, nodeCover} = require('../admin-covers.js');
  const f = read('fish.json'),
    gm = C.treeGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    B = app().run({f, ph: read('fish-photos.json'), gm}, cu),
    sp = Object.fromEntries(f.species.map(s => [s.id, s])),
    seen = sid => A.treeNear(sp[sid]),
    play = A.treeGameIn(Object.values(gm.photos || {}).flat(), cu),
    rec = Object.fromEntries(play.map(p => [p.f, p])),
    j = fid => rec[fid] || null,
    F = cu.fish || {},
    nodes = Object.fromEntries([...f.families, ...f.genera].map(u => [u.id, new Set(u.species)])),
    out = [];
  Object.entries(F.genera || {}).forEach(([id, k]) => {
    if (!k || !k.cover || !nodes[id]) return;
    const L = play.filter(p => nodes[id].has(p.sp)),
      c = nodeCover(id, L, F, j, false, seen);
    if (c.by !== 'mine' || !A.treeWm(c.p, j(c.p.f), F)) return;
    const g = B.gen[id];
    if (g) assert.strictEqual(g.coverP && C.treePid(g.coverP.f), C.treePid(k.cover), `${id}: his ★ stays the app's card`);
    if (c.wok) return out.push(`${id} kept`);
    assert.ok(c.wm, `${id}: the page asks`);
    const clean = L.some(p => !A.treeJuv(p, j(p.f), F) && !A.treeWm(p, j(p.f), F)),
      x = coverProposal(id, L, F, j, seen);
    if (!clean) return out.push(`${id} no photo without a watermark`);
    assert.ok(x && x.wm && !A.treeWm(x.rule, j(x.rule.f), F), `${id}: a proposal without a watermark`);
    assert.strictEqual(coverOpen([x], F).length, 1, `${id}: open`);
    out.push(`${id} → ${x.rule.f}`);
  });
  t.diagnostic(`his watermarked ★ covers: ${out.join(', ') || 'none'}`);
});

// On the real files: every fish unit Pierre has not picked a cover for shows a photo of its species most seen around the
// centre among those with a reference-level adult photo in play (else among those with an adult photo), his ★ cover of
// that species when he has one, in the app and in the admin, each over its own pool (the admin's: the game photos read
// with their records' judgments; the app's adds the stopgap's, and the two read juveniles each their way).
test('real data: the default covers are of the most seen species with a reference photo, app and admin (Q339 (b))', () => {
  const f = read('fish.json'),
    gm = C.treeGameRead(read('fish-game.json')),
    cu = read('curation.json'),
    X = app(),
    B = X.run({f, ph: read('fish-photos.json'), gm}, cu),
    sp = Object.fromEntries(f.species.map(s => [s.id, s])),
    seen = sid => X.nearSeen(sp[sid]),
    key = sid => seen(sid)[0] * 1e6 + seen(sid)[1],
    play = A.treeGameIn(Object.values(gm.photos || {}).flat(), cu),
    rec = Object.fromEntries(play.map(p => [p.f, p])),
    j = fid => rec[fid] || null,
    nodes = Object.fromEntries([...f.families, ...f.genera].map(u => [u.id, new Set(u.species)])),
    picks = (cu.fish || {}).genera || {};
  assert.ok(f.centre && f.centre.name && Number.isFinite(f.centre.lat) && f.centre.radiusKm > 0, 'fish.json centre');
  let n = 0;
  Object.entries(B.gen).forEach(([id, g]) => {
    if (g.coverP || !g.views.wide.length || !nodes[id]) return;
    // the adult photos without a watermark when it has any, else its adult photos
    const W0 = g.views.wide.filter(p => !X.juvP(p)),
      A0 = W0.some(p => !X.wmP(p)) ? W0.filter(p => !X.wmP(p)) : W0,
      R0 = A0.filter(C.refLevel),
      c = g.views.wide.find(p => p.f === g.cover);
    if (!A0.length) return;
    n++;
    assert.ok(!X.juvP(c), `${id}: never a juvenile`);
    assert.ok(A0.includes(c), `${id}: never a watermarked photo while it has another adult one`);
    assert.strictEqual(key(c.sp), Math.max(...(R0.length ? R0 : A0).map(p => key(p.sp))), `${id}: ${sp[c.sp].name} is not its species`);
    if (B.covers[c.sp] && (!X.wmP(B.covers[c.sp]) || A0 === W0))
      assert.strictEqual(c.f, B.covers[c.sp].f, `${id}: his ★ cover of ${sp[c.sp].name}`);
    else if (R0.some(p => p.sp === c.sp)) assert.ok(C.refLevel(c), `${id}: its reference photo`);
    const L = play.filter(p => nodes[id].has(p.sp)),
      adm = A.treeCoverOf(L, cu.fish, id, j, sid => A.treeNear(sp[sid])),
      ad0 = L.filter(p => !A.treeJuv(p, j(p.f), cu.fish)),
      ad = ad0.some(p => !A.treeWm(p, j(p.f), cu.fish)) ? ad0.filter(p => !A.treeWm(p, j(p.f), cu.fish)) : ad0,
      ar = ad.filter(p => C.refLevel(A.treePhotoRec(p, cu.fish, j)));
    if (!adm || !ad.length) return;
    assert.ok(ad.includes(adm), `${id}: the admin's default never takes a watermarked photo while it has another adult one`);
    assert.strictEqual(key(adm.sp), Math.max(...(ar.length ? ar : ad).map(p => key(p.sp))), `${id}: the admin shows ${sp[adm.sp].name}`);
    const k = (picks[adm.sp] || {}).cover;
    if (k && ad.some(p => p.f === k)) assert.strictEqual(adm.f, k, `${id}: the admin shows his ★ cover of ${sp[adm.sp].name}`);
  });
  assert.ok(n > 50, `${n} units checked`);
});

// Tags the auto-sort copied are no choice of the admin's (Pierre, 2026-11-19 20:57): the game record's phase, which the
// build reads from the newer judgement (tools/fish_game.py read_cur), says whether a photo is a juvenile, as the app's
// juvP reads it; his own tags or phase stand. So his ★ cover on a photo the newer judgement calls a juvenile waits for
// his confirmation, in the admin as in the app (the f:Boxfishes cover after #1259).
test('treeJuv: the auto-sort copy of tags reads the game record, his own tags stand', () => {
  const rec = {f: 'fx', sp: 's1', jt: 'o1g0sl1j', ph: 'juvenile'},
    adult = {f: 'fx', sp: 's1', jt: 'p1g1sm1'},
    auto = {tags: {fx: 'p1g1sm1'}, ease: {fx: 4}, add: {fx: 's1'}, auto: {'2026-11-04': {fx: 'ate'}}},
    his = {...auto, auto: {'2026-11-04': {fx: 'ae'}}};
  assert.strictEqual(A.treeJuv(rec, null, auto), true, 'the copy is read anew: a juvenile');
  assert.strictEqual(A.treeJuv(adult, null, {...auto, tags: {fx: 'p1g1sm1j'}}), false, 'the record says adult');
  assert.strictEqual(A.treeJuv(rec, null, his), false, 'his own tags stand');
  assert.strictEqual(A.treeJuv(rec, null, {tags: {fx: 'p1g1sm1'}}), false, 'no log: his');
});
