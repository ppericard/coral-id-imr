'use strict';
require('./slot.js').testGuard();
// @slow: lvlNext's count checked against the version before on rated-world simulation runs of the fish
// app.js spPlay and sciPlay (the species units in play, by common and by scientific name) count the level's units met
// once per call (metCount) and pass the count to lvlNext, which counted them again for every parent: a speed-up only.
// They must give exactly the lists the version before gave, in the same order. The reference is a copy of that version,
// kept here as it was (only its three names changed, so it runs beside the new one). Checked on rated-world fish runs
// (the species of both kinds, their families' and genera's bars and the cards opened as the play makes them), on
// made-up states of the real fish and sea slug units (units met around INTRO.START, bars around each threshold, a
// genus's own threshold, genera out of play, units with no photo) and on edge cases. The corals have no species level.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js'),
  RW = require('../tools/ratedworld.js'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  APP = src('app.js');

// The version that counted the level's units met for every parent (app.js before), verbatim but for the names lvlNext0,
// spPlay0 and sciPlay0.
const REF = `function lvlNext0(O, L, met) {
  const k = L.filter(met).length < INTRO.START ? INTRO.START : 1,
    out = [];
  for (const n of O) if (out.length < k && !met(n) && photoAny(n)) out.push(n);
  return out;
}
function spPlay0(L, score, met, on) {
  if (!on) return [];
  const by = new Map();
  L.forEach(n => {
    const p = GX(n).parent;
    if (!by.has(p)) by.set(p, []);
    by.get(p).push(n);
  });
  return [...by].flatMap(([p, U]) => [...U.filter(met), ...(score(p) >= LV_AT[1] ? lvlNext0(U, L, met) : [])]);
}
function sciPlay0(L, score, met, up, on) {
  if (!on) return [];
  const by = new Map();
  L.forEach(n => {
    const p = GX(n).parent;
    if (!by.has(p)) by.set(p, []);
    by.get(p).push(n);
  });
  return [...by].flatMap(([p, U]) => {
    if (!up.has(p)) return [];
    const at = typeof GX(p).shareAt === 'number' ? GX(p).shareAt : LV_AT[1],
      ord = GX(p).species || [],
      O = [...U].sort((a, b) => ord.indexOf(GX(a).sp) - ord.indexOf(GX(b).sp));
    return [...O.filter(met), ...(score(p) >= at ? lvlNext0(O, L, met) : [])];
  });
}`;
const LV_AT = [0.5, 0.8, 0.85],
  START = 4;

// The new functions (app.js) and the reference in one context, on the records GX reads and photoAny's photos.
function pair(GX, photoAny) {
  const ctx = vm.createContext({LV_AT, INTRO: {START}, GX, photoAny});
  vm.runInContext(
    [
      block(APP, 'function lvlNext(', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'const metCount = ', '\n};\n', {through: 1, file: 'app.js'}),
      block(APP, 'function spPlay(', '\n}\n', {through: 1, file: 'app.js'}),
      block(APP, 'function sciPlay(', '\n}\n', {through: 1, file: 'app.js'}),
      REF,
      'this.F = {spPlay, sciPlay, lvlNext, metCount, spPlay0, sciPlay0, lvlNext0};'
    ].join('\n'),
    ctx
  );
  return ctx.F;
}
// Both versions on one state: the same lists, in the same order; st counts the checks, the units the lists hold beyond
// the units met (lvlNext's, by its k: four while the level opens its group, else one) and the reads of met.
function same(F, st, {sp = [], ssp = [], score, met, up, on = true}, label) {
  const n = {new: 0, ref: 0},
    by = k => x => (n[k]++, met(x));
  const a = [...F.spPlay(sp, score, by('new'), on)],
    b = [...F.spPlay0(sp, score, by('ref'), on)];
  assert.deepStrictEqual(a, b, `${label}: spPlay`);
  const c = [...F.sciPlay(ssp, score, by('new'), up, on)],
    d = [...F.sciPlay0(ssp, score, by('ref'), up, on)];
  assert.deepStrictEqual(c, d, `${label}: sciPlay`);
  st.checks++;
  st.reads += n.new;
  st.reads0 += n.ref;
  for (const [L, out] of [
    [sp, a],
    [ssp, c]
  ]) {
    const extra = out.filter(x => !met(x)).length;
    if (!extra) continue;
    if (L.filter(met).length < START) st.group += extra;
    else st.one += extra;
  }
}
const stats = () => ({checks: 0, reads: 0, reads0: 0, group: 0, one: 0});
const rng = seed => () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
const VIEWN = ['wide', 'medium', 'macro'],
  hasPhoto = G => n => !!G[n] && VIEWN.some(v => ((G[n].views || {})[v] || []).length);

// lvlNext alone: the count passed in, the same units as the count it made itself.
test('lvlNext: given the count of the level’s units met, the same units as when it counted them', () => {
  const G = {},
    L = Array.from({length: 12}, (_, i) => 'u' + i);
  L.forEach((n, i) => (G[n] = {parent: 'p' + (i % 3), views: {wide: i % 5 === 4 ? [] : [{}]}}));
  const F = pair(n => G[n], hasPhoto(G)),
    r = rng(17);
  for (let s = 0; s < 400; s++) {
    const M = new Set(L.filter(() => r() < (s % 10) / 9)),
      met = n => M.has(n),
      O = L.filter(() => r() < 0.7);
    assert.deepStrictEqual([...F.lvlNext(O, L.filter(met).length, met)], [...F.lvlNext0(O, L, met)], `state ${s}`);
  }
  // metCount: counted once, at the first read, then kept
  let reads = 0;
  const m = F.metCount(L, n => (reads++, n === 'u1' || n === 'u2'));
  assert.strictEqual(reads, 0, 'nothing counted before a parent asks');
  assert.strictEqual(m(), 2);
  assert.strictEqual(m(), 2);
  assert.strictEqual(reads, L.length, 'the list read once');
});

// A rated-world fish run of N answers: both versions every `every` answers, and at every answer while a level holds
// few units met (around its group's opening), on the play's own state (its records P, its cards, its bars), with the
// genera in play as the world has them (the slate and the units in play) and a random part of them.
function played(profile, seed, N, every, st) {
  const U = RW.unitsOf('fish'),
    W = RW.world(U, seed),
    pl = RW.playerOf(U, W, {profile, seed, N, cps: [N]}),
    G = pl.G,
    ctx = pl.ctx,
    F = pair(n => G[n], hasPhoto(G)),
    r = rng(seed * 104729),
    few = () => [U.sp, U.ssp].some(L => L.length && L.filter(ctx.introduced).length < START + 2);
  for (let i = 0; i < N; i++) {
    pl.step(i);
    if ((i + 1) % every && !few()) continue;
    C.faArm(ctx.P);
    try {
      const up = new Set([...ctx.slateGenera(), ...ctx.bonusList()]),
        part = new Set([...up].filter(() => r() < 0.5)),
        base = {score: ctx.genScore, met: ctx.introduced, sp: U.sp, ssp: U.ssp},
        label = `fish ${profile} ${seed} after ${i + 1}`;
      same(F, st, {...base, up}, label);
      same(F, st, {...base, up: part}, label + ', part of the genera in play');
      same(F, st, {...base, up, on: false}, label + ', off');
    } finally {
      C.faDisarm(ctx.P);
    }
  }
  return pl;
}

test('rated-world fish runs: spPlay and sciPlay every 50 answers and around each opening, as before', t => {
  const st = stats();
  for (const [profile, seed, N] of [
    ['lectureRA', 1, 1500],
    ['strongRA', 2, 800]
  ]) {
    const pl = played(profile, seed, N, 50, st);
    assert.ok(Object.keys(pl.ctx.P).length > 20, `${profile}: a history`);
  }
  t.diagnostic(`${st.checks} states; units opened: ${st.group} while a level opens its group, ${st.one} one at a time`);
  t.diagnostic(`the units met read ${st.reads} times (the version before: ${st.reads0})`);
  assert.ok(st.group > 0 && st.one > 0, 'both counts taken: a level opening its group and one at a time');
  assert.ok(st.reads < st.reads0, 'the units met read fewer times');
});

// The corals have no species units (SUBJECTS names: none), so the app never builds the sp and ssp sets for them.
test('the corals: no species level, so neither spPlay nor sciPlay reaches them', () => {
  assert.ok(!C.subjectOf('coral').names, 'no species units for the corals');
  assert.match(APP, /auto: \(\) => \(TREEU && typeof genScore === 'function' \? spPlay\(/, 'the sp set needs the tree (TREEU)');
  assert.match(APP, /auto: \(\) => \(TREEU && sciSpOn\(\) && typeof genScore === 'function' \? sciPlay\(/, 'the ssp set needs the tree');
});

// The fish units (the rated world's, as app.js treeGenera builds them) and the sea slugs' (app.js treeGenera on
// seaslug.json, as tests/scispecies.test.js builds them).
function seaslugX() {
  const SEA = C.subjectOf('seaslug'),
    SF = json('seaslug.json'),
    SG = C.treeGameRead(json('seaslug-game.json')),
    CUR = json('curation.json'),
    ctx = vm.createContext({
      DOM: {EX: 0.9},
      LV_AT,
      INTRO: {START},
      easyCover: C.easyCover,
      treeScoreTree: C.treeScoreTree,
      treeSpUnits: C.treeSpUnits,
      treeGenSets: C.treeGenSets,
      rankWeights: C.rankWeights,
      unitRankOf: C.unitRankOf,
      typeNormAll: C.typeNormAll,
      SUBJ: SEA,
      UNITS: {seaslug: {norm: C.typeNormAll}},
      sciOn: () => true,
      Math: Object.create(Math)
    });
  const treeGenera = vm.runInContext('(' + block(APP, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + ')', ctx);
  return treeGenera(
    Object.assign(C.treeGen(SF, C.treePhotos(undefined, SG.photos, CUR.seaslug), undefined, C.unitRankOf(SEA)), {kinds: SEA.names}),
    SF
  );
}

test('made-up states, fish and sea slugs: units met around INTRO.START, bars around each threshold, genera out of play; as before', t => {
  const st = stats();
  for (const [subject, X] of [
    ['fish', RW.unitsOf('fish').X],
    ['seaslug', seaslugX()]
  ]) {
    const sp = X.spl || [],
      ssp = X.ssl || [];
    assert.ok(ssp.length > 100 && (subject !== 'fish' || sp.length > 100), `${subject}: species units`);
    const parents = [...new Set([...sp, ...ssp].map(n => X.gen[n].parent))];
    for (let s = 1; s <= 60; s++) {
      const r = rng(s * 7919),
        // the level's units met: none, a few (below, at and above INTRO.START), or a share of them
        nMet = [0, 1, 3, 4, 5, 8][s % 6],
        pick = L => {
          const M = new Set(s % 4 === 3 ? L.filter(() => r() < 0.3) : []);
          while (M.size < Math.min(nMet, L.length)) M.add(L[Math.floor(r() * L.length)]);
          return M;
        },
        M = new Set([...pick(sp), ...pick(ssp)]),
        // a bar per parent: none, just under, at or over its threshold (Advanced, or the genus's own)
        own = {},
        bar = {};
      parents.forEach(p => {
        if (r() < 0.15) own[p] = [0.5, 0.7, 0.9][Math.floor(r() * 3)];
        const at = own[p] !== undefined ? own[p] : LV_AT[1];
        bar[p] = [0, at - 0.01, at, at + 0.05, 1][Math.floor(r() * 5)];
      });
      // records as GX reads them: the genus's own threshold (shareAt), some units with no photo
      const noPic = new Set([...sp, ...ssp].filter(() => r() < 0.1)),
        GX = n => (n in own ? {...X.gen[n], shareAt: own[n]} : X.gen[n]),
        F = pair(GX, n => !noPic.has(n) && hasPhoto(X.gen)(n)),
        up = new Set(parents.filter(() => r() < 0.8)),
        // the lists in the app's order, or in another (a level read in another order, some units left out)
        shuffle = L => (s % 5 === 4 ? [...L].sort(() => r() - 0.5).filter(() => r() < 0.9) : L);
      same(F, st, {sp: shuffle(sp), ssp: shuffle(ssp), score: p => bar[p] || 0, met: n => M.has(n), up}, `${subject} state ${s}`);
    }
  }
  t.diagnostic(`${st.checks} states; units opened: ${st.group} while a level opens its group, ${st.one} one at a time`);
  assert.ok(st.group > 0 && st.one > 0, 'both counts taken');
});

test('edge cases: empty lists, every unit met or none, three and four met, a unit listed twice, no photo; the count made once', () => {
  const G = {};
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach((n, i) => (G[n] = {parent: i < 3 ? 'P' : 'Q', sp: i, views: {wide: [{}]}}));
  G.P = {species: [2, 1, 0]};
  G.Q = {species: [3, 4, 5]};
  const F = pair(n => G[n], hasPhoto(G)),
    st = stats(),
    all = Object.keys(G).filter(n => G[n].parent),
    hi = () => 1,
    lo = () => 0;
  const states = [
    {label: 'empty lists', sp: [], ssp: [], score: hi, met: () => true, up: new Set(['P', 'Q'])},
    {label: 'nothing met', sp: all, ssp: all, score: hi, met: () => false, up: new Set(['P', 'Q'])},
    {label: 'every unit met', sp: all, ssp: all, score: hi, met: () => true, up: new Set(['P', 'Q'])},
    {label: 'three met', sp: all, ssp: all, score: hi, met: n => 'abd'.includes(n), up: new Set(['P', 'Q'])},
    {label: 'four met', sp: all, ssp: all, score: hi, met: n => 'abde'.includes(n), up: new Set(['P'])},
    {label: 'a unit listed twice', sp: [...all, 'a', 'd'], ssp: [...all, 'a'], score: hi, met: n => n === 'a', up: new Set(['P', 'Q'])},
    {label: 'no parent at its threshold', sp: all, ssp: all, score: lo, met: n => n === 'b', up: new Set(['P', 'Q'])},
    {label: 'no genus in play', sp: all, ssp: all, score: hi, met: n => n === 'b', up: new Set()}
  ];
  for (const s of states) same(F, st, s, s.label);
  G.a.views.wide = [];
  G.e.views.wide = [];
  same(F, st, {sp: all, ssp: all, score: hi, met: () => false, up: new Set(['P', 'Q'])}, 'units with no photo');
  // no parent at its threshold: the level's count is never read (the version before never read it either)
  let reads = 0;
  F.spPlay(all, lo, n => (reads++, false), true);
  assert.strictEqual(reads, all.length, 'each unit read once for its parent, the count never made');
  reads = 0;
  F.spPlay(all, hi, n => (reads++, false), true);
  assert.ok(reads <= 3 * all.length, `the count made once (${reads} reads for ${all.length} units)`);
});
