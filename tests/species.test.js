require('./slot.js').testGuard();
// The fish species level, step 1 (docs/reviews/2026-11-14-species-step1.md: one progress unit per species, behind the
// chunked tree's version; the main name fills it, any listed name credits it): the
// species units (core.js fishSpUnits, app.js fishGenera), the order they open in (app.js spPlay), the global score's tree
// with them (core.js fishScoreTree) and its anchors, a species never answered starting from its family's ability (core.js
// abilityOf from), the sheet's replay of them (core.js fishReplayGen, replayProgress), the typed names, the achievements.
// On the real fish.json; nothing leaves the process.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  F = read('fish.json'),
  PH = read('fish-photos.json'),
  K = C.subjectOf('fish').score;

// app.js fishGenera (the families' genera and the species units) and spPlay, as the app has them.
const ctx = {
  DOM: {EX: 0.9},
  easyCover: C.easyCover,
  fishScoreTree: C.fishScoreTree,
  fishSpUnits: C.fishSpUnits,
  fishGenSets: C.fishGenSets,
  rankWeights: C.rankWeights,
  LV_AT: [0.5, 0.8, 0.85],
  photoAny: n => !!(ctx.GXS[n] && ctx.GXS[n].views.wide.length),
  GXS: {}
};
vm.createContext(ctx);
vm.runInContext(
  [
    block(src('app.js'), 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}),
    block(src('app.js'), 'function spPlay(L, score, met, on) {', '\n}\n', {through: 1, file: 'app.js'}),
    'const GX = n => GXS[n];',
    'this.T = {fishGenera, spPlay};'
  ].join('\n'),
  ctx
);
// the photos in play, as the app builds them (fish-game.json under the curation)
const X = ctx.T.fishGenera(
  C.fishGen(F, C.fishPhotos(PH.photos, C.fishGameRead(read('fish-game.json')).photos, read('curation.json')), PH.sheet),
  F
);
ctx.GXS = X.gen;
const byName = n => F.species.find(s => s.name === n);

test('the species units: one per species with a listed common name, in a family in play, its family the one it starts from', () => {
  const U = C.fishSpUnits(F),
    sp = new Map(F.species.map(s => [s.id, s]));
  assert.strictEqual(U.length, F.species.filter(s => (s.cn || []).length && !(F.families.find(f => f.id === s.family) || {}).wink).length);
  assert.ok(U.length > 600, String(U.length));
  U.forEach(u => {
    assert.strictEqual(u.id, 's:' + u.s.id);
    assert.ok((u.s.cn || []).length, u.id);
    assert.strictEqual(u.from, u.family);
    assert.strictEqual(u.s.family, u.family);
    // its look-alikes: the other species units of its family
    assert.ok(u.look.every(o => o !== u.id && sp.get(o.slice(2)).family === u.family));
  });
  // none for a species with no name, none for a wink family's
  const none = F.species.filter(s => !(s.cn || []).length);
  assert.ok(none.length >= 3 && none.every(s => !U.some(u => u.s.id === s.id)));
  // each family's in its species order (the commonness order, cmi)
  F.families.forEach(f => {
    const own = U.filter(u => u.family === f.id).map(u => u.s.id);
    assert.deepStrictEqual(
      own,
      f.species.filter(id => own.includes(id))
    );
  });
  // the app's records: rank species, labelled by the main name here (outside IMR), the scientific name beside it, its
  // family's photos of that species only, no exam
  const s = byName('Forcipiger flavissimus'),
    g = X.gen['s:' + s.id];
  assert.strictEqual(g.rank, 'species');
  assert.strictEqual(g.name, s.cn[0][0]);
  assert.strictEqual(g.sci, s.name);
  assert.strictEqual(g.from, s.family);
  assert.strictEqual(g.noex, 1);
  assert.strictEqual(g.decl.length, 0);
  assert.ok(g.views.wide.length && g.views.wide.every(p => p.sp === s.id));
  assert.deepStrictEqual(
    [...X.spl],
    U.map(u => u.id)
  );
});

test('spPlay: nothing while off; a family at Advanced brings its species one at a time, the most met first', () => {
  const fam = 'f:Butterflyfishes',
    L = X.spl,
    own = L.filter(n => X.gen[n].parent === fam && X.gen[n].views.wide.length),
    met = new Set(),
    at = {[fam]: 0.85};
  const open = (on = true) => [
    ...ctx.T.spPlay(
      L,
      n => at[n] || 0,
      n => met.has(n),
      on
    )
  ];
  assert.deepStrictEqual(open(false), []);
  assert.deepStrictEqual(open(), [own[0]]);
  met.add(own[0]);
  assert.deepStrictEqual(open(), [own[0], own[1]]);
  // under Advanced: the species met stay, no new one
  at[fam] = 0.79;
  assert.deepStrictEqual(open(), [own[0]]);
  at[fam] = 0;
  met.clear();
  assert.deepStrictEqual(open(), []);
});

test('the score tree: off as before (no species unit); on, every species unit once in the common-name place, the anchors', () => {
  const off = X.tree,
    on = X.treeSp,
    U = C.fishSpUnits(F).map(u => u.id);
  assert.ok(!JSON.stringify(off).includes('"s:'));
  assert.deepStrictEqual(off, C.fishScoreTree(X, F));
  assert.deepStrictEqual(on.f, off.f);
  const names = on.s.flatMap(e => e[3] || []);
  assert.deepStrictEqual([...names].sort(), [...U].sort());
  on.s.forEach(e => assert.strictEqual(e[2], '')); // no scientific species unit yet
  // the same total weight, every circle
  const sum = T => Math.round(T.s.reduce((t, e) => t + e[0], 0) * 100);
  assert.ok(Math.abs(sum(on) - sum(off)) <= 2);
  // fits the sheet's chunked tree (Code.gs BOARD_TREE_MAX_ 50,000; its unit pattern)
  assert.ok(JSON.stringify(on).length < 50000, String(JSON.stringify(on).length));
  assert.ok(names.every(n => /^[A-Za-z][A-Za-z0-9: -]{0,39}$/.test(n)));
  // anchors (docs/FISH_PATH.md "My progress (fish)"): families 50, families and every common name 89, and every genus
  // of the game too 95 (the genera exist in every circle)
  const P = {};
  on.f.forEach(([u]) => (P[u] = {mx: 1}));
  assert.strictEqual(C.treeScore(P, on, K).pct, 50);
  names.forEach(n => (P[n] = {mx: 1}));
  const R = C.treeScore(P, on, K);
  assert.strictEqual(R.pct, 89);
  assert.strictEqual(R.common, 1);
  on.s.forEach(e => e[1] && (P[e[1]] = {mx: 1}));
  assert.ok(
    on.s.every(e => e[1]),
    'every species under its genus unit'
  );
  assert.strictEqual(C.treeScore(P, on, K).pct, 95);
  // A player with the genera and no species stays at or under the families-and-genera anchor
  const G = {};
  on.f.forEach(([u]) => (G[u] = {mx: 1}));
  on.s.forEach(e => e[1] && (G[e[1]] = {mx: 1}));
  assert.strictEqual(C.treeScore(G, on, K).pct, 74);
  assert.strictEqual(C.treeScore(G, on, K).pct, C.treeScore(G, off, K).pct);
});

test('abilityOf from: a unit never answered starts from the unit it names once that one has an ability', () => {
  const P = {[C.LEVEL]: {ok: 40, ko: 10, th: 0.4}, 'f:Butterflyfishes': {ok: 30, ko: 2, th: 1.6, lt: 0.4}};
  const fam = C.abilityOf(P, 'f:Butterflyfishes', 0);
  assert.strictEqual(C.abilityOf(P, 's:x', 0, 'f:Butterflyfishes'), fam);
  // without from, or from a unit never answered: the global level's start, as any unit
  assert.strictEqual(C.abilityOf(P, 's:x', 0), C.playerStart(P, 's:x', 0));
  assert.strictEqual(C.abilityOf(P, 's:x', 0, 'f:Wrasses'), C.playerStart(P, 's:x', 0));
  // answered: its own
  P['s:x'] = {ok: 1, ko: 0, th: -0.2, lt: 0.4};
  assert.strictEqual(C.abilityOf(P, 's:x', 0, 'f:Butterflyfishes'), -0.2);
  // the Elo step of its first answer starts there (scoreAnswer q.from)
  const Q = {[C.LEVEL]: {ok: 40, ko: 10, th: 0.4}, 'f:Butterflyfishes': {ok: 30, ko: 2, th: 1.6, lt: 0.4}},
    q = {t: 's:y', ok: true, k: 4, chs: ['s:y', 's:z'], d0: 1.6, ph: ['a']};
  const a = C.scoreAnswer(JSON.parse(JSON.stringify(Q)), {...q, from: 'f:Butterflyfishes'}),
    b = C.scoreAnswer(JSON.parse(JSON.stringify(Q)), q);
  assert.strictEqual(a.th0, fam);
  assert.ok(b.th0 < a.th0);
});

// The sheet's replay (core.js replayProgress, its units fishReplayGen): a log with no species row replays exactly as with
// the units of before (no rules version needed); a species row as the game scored it (the species picked wrongly, rule L2;
// the start from the family).
const T = i => new Date(Date.UTC(2026, 10, 15, 0, i)).toISOString();
const ans = (i, g, a, ok, ch) => ({
  id: 'a' + i,
  t: T(i),
  s: 'fish',
  g,
  a,
  ok: ok ? 1 : 0,
  m: 'quiz',
  ph: 'p' + i,
  ch: ch.join(' '),
  e: 0.75,
  th: 0,
  sc: {d: 0}
});
const GEN = C.fishReplayGen(F),
  OLD = Object.fromEntries(
    Object.entries(GEN)
      .filter(([n]) => !n.startsWith('s:'))
      .map(([n, g]) => [n, {look: g.look, fam: g.fam}])
  );

test('replay: a log with no species row is replayed exactly as with the units of before', () => {
  const fams = ['f:Damselfishes', 'f:Butterflyfishes', 'f:Angelfishes', 'f:Wrasses'],
    gens = Object.keys(GEN)
      .filter(n => n.startsWith('g:'))
      .slice(0, 4),
    L = [];
  for (let i = 0; i < 60; i++) {
    const set = i % 3 ? fams : gens,
      g = set[i % 4],
      ok = i % 5 !== 3;
    L.push(ans(i, g, ok ? g : set[(i + 1) % 4], ok, set));
  }
  const rows = L.map(a => C.logRow(a, 'p1'));
  assert.ok(Object.keys(GEN).some(n => n.startsWith('s:')));
  assert.deepStrictEqual(C.replayProgress(rows, {gen: GEN}), C.replayProgress(rows, {gen: OLD}));
});

test('replay: a species picked wrongly counts against it (rule L2), and a species starts from its family', () => {
  const A = 's:' + byName('Forcipiger flavissimus').id,
    B = 's:' + byName('Chaetodon kleinii').id,
    W = 's:' + byName('Thalassoma lunare').id,
    L = [];
  for (let i = 0; i < 12; i++) L.push(ans(i, 'f:Butterflyfishes', 'f:Butterflyfishes', 1, ['f:Butterflyfishes', 'f:Wrasses']));
  L.push(ans(20, A, W, 0, [A, W, B]));
  L.push(ans(21, B, B, 1, [B, A, W]));
  const rows = L.map(a => C.logRow(a, 'p1')),
    R = C.replayProgress(rows, {gen: GEN}).p1.P,
    O = C.replayProgress(rows, {gen: OLD}).p1.P;
  // the wrong pick: a false alarm on W with the species units, none without them (the replay the sheet had before)
  assert.strictEqual(R[W].h, '0');
  assert.ok(!O[W]);
  // the first answer on B starts from the families' ability, above the global level's start
  assert.ok(R[B].th > O[B].th, `${R[B].th} > ${O[B].th}`);
});

test('typed: every listed and regional name of a species is its unit’s; a shared name is right for the species asked', () => {
  const tctx = {typeNormAll: C.typeNormAll};
  vm.createContext(tctx);
  vm.runInContext(
    block(src('app.js'), '// The curated common names of a fish species', '\n    .filter(([, L]) => L.length);\n}\n', {
      file: 'app.js',
      through: 1
    }) + '\nthis.M = {cnTypeNames};',
    tctx
  );
  // as UNITS fish names reads them: the species units' names, each its unit's
  const SP = X.spl.map(n => F.species.find(s => s.id === X.gen[n].sp)),
    N = tctx.M.cnTypeNames(SP).map(o => ({...o, g: 's:' + o.g})),
    read = t => C.typeMatchIn(N, t, C.typeNormAll);
  const fl = byName('Forcipiger flavissimus');
  fl.cn.flat().forEach(x => {
    const m = read(x);
    assert.ok(C.typeFits(m, 's:' + fl.id, []), `${x}: ${JSON.stringify(m)}`);
  });
  // a regional name, accepted when typed
  const r = F.species.find(s => (s.cnr || []).length && (s.cn || []).length);
  assert.ok(C.typeFits(read(r.cnr[0][0]), 's:' + r.id, []));
  // "Longnose butterflyfish": F. longirostris's main name and a listed name of F. flavissimus: right for either
  const lo = byName('Forcipiger longirostris'),
    m = read('Longnose butterflyfish');
  assert.ok(m.shared && C.typeFits(m, 's:' + fl.id, []) && C.typeFits(m, 's:' + lo.id, []));
  assert.ok(!C.typeFits(m, 's:' + byName('Chaetodon kleinii').id, []));
});

test('the species achievements: fsp1, fsp10, fsp50, on the species units at Advanced', () => {
  const A = id => C.FISH_ACH.find(a => a.id === id);
  ['fsp1', 'fsp10', 'fsp50'].forEach(id => assert.ok(A(id) && A(id).kind === 'learn', id));
  const snap = n => ({setsAdv: {sp: n}});
  assert.deepStrictEqual(
    ['fsp1', 'fsp10', 'fsp50'].map(id => [0, 1, 9, 10, 49, 50].filter(n => A(id).test(snap(n)))),
    [[1, 9, 10, 49, 50], [10, 49, 50], [50]]
  );
});
