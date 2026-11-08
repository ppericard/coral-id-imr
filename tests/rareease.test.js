// Rarely under ease 4 before Open Water (Pierre, 2026-11-06 14:17: "No wall: before Open Water a photo under ease 4 may
// come, but rarely"; model.js RARE, rareCap): model.js photoSet runs in Node on a unit whose pool is dominated by hard
// photos, as the fish starter families are (about two thirds of their photos under ease 4, and many more observations
// than a pool-sized unit). Before Open Water the photos under ease 4 make at most about RARE.SHARE of the draws, whatever
// their number; they still come (no wall); past Open Water they come back; a photo with no judged ease (the corals) is
// never held back; only the units of the subject's own rank are capped, the fish families (Q271). docs/LEARNING.md
// "Rarely under ease 4 before Open Water".
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');

// The draw of model.js (PICKD to the end of photoSet, photoDiff, wpick) with the game around it stubbed: one unit, n,
// its photos L (one per observation, the fish's single view), the player's ability th and progress score sc on it.
function engine(subject, L, {th = 1.2, score = 0.3, ok = 2, lv = 'new', ps = {}, rank = ''} = {}) {
  let s = 12345;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647,
    M = Object.create(Math);
  M.random = rnd;
  const ctx = {
    Math: M,
    SUBJ: C.subjectOf(subject),
    calibOf: C.calibOf,
    refLevel: C.refLevel,
    memBucket: C.memBucket,
    aimOf: C.aimOf,
    DOM: C.DOM,
    TARGET_P: C.TARGET_P,
    AIM: C.AIM,
    LEVEL: '_level',
    P: {u: {ok, ko: 0, th, ps}},
    PSTAT: {},
    PGD: {},
    PMEM: [0, -0.45, -1.1, -1.7],
    PFMT: {},
    fmtOff: () => 0,
    GX: () => ({levels: 3, views: {wide: L}}),
    imrFormsOf: () => ['a'],
    gamePics: (n, v) => (v === 'wide' ? L : []),
    gamePhotoOk: () => true,
    isCore: () => false,
    level: () => [lv],
    rankOf: () => rank,
    shaky: () => false,
    recent: () => [],
    ability: () => th,
    genScore: () => score,
    LV_AT: [0.5, 0.8, 0.95],
    pick: a => a[Math.floor(rnd() * a.length)]
  };
  vm.createContext(ctx);
  const draw = cut(src, 'const PICKD = {', '// The next exam question of genus n', {file: 'model.js'}),
    diff = cut(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
    wp = cut(src, 'function wpick(', '\n}\n', {through: 1, file: 'model.js'});
  vm.runInContext(`${draw}\n${diff}\n${wp}\nthis.photoSet = photoSet;\nthis.RARE = RARE;\nthis.rareCap = rareCap;`, ctx);
  return ctx;
}
// A pool like a starter family's, but harder still: 12 easy photos (ease 4-5) against 240 under ease 4.
const pool = () => {
  const L = [];
  for (let i = 0; i < 12; i++) L.push({f: `easy${i}`, o: `oe${i}`, e: 4 + (i % 2)});
  for (let i = 0; i < 240; i++) L.push({f: `hard${i}`, o: `oh${i}`, e: 1 + (i % 3)});
  return L;
};
const share = (E, L, N = 3000) => {
  const e = Object.fromEntries(L.map(p => [p.f, p.e]));
  let under = 0,
    tot = 0;
  for (let i = 0; i < N; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => {
      tot++;
      if (e[x.f] && e[x.f] < 4) under++;
    });
  return under / tot;
};

test('before Open Water, a pool dominated by hard photos: those under ease 4 come rarely, never walled off', () => {
  const L = pool(),
    E = engine('fish', L),
    r = share(E, L);
  assert.ok(r <= E.RARE.SHARE + 0.03, `under ease 4: ${(100 * r).toFixed(1)}% of the draws (at most about ${100 * E.RARE.SHARE}%)`);
  assert.ok(r > 0.02, `no wall: under ease 4 still drawn (${(100 * r).toFixed(1)}%)`);
  // The same at the start (no answer yet, ability 0): the cap only lowers the hard share, never raises it.
  const F = engine('fish', L, {th: 0, ok: 0, score: 0});
  assert.ok(share(F, L) <= F.RARE.SHARE + 0.03);
});

test('observations mixing easy and hard photos: their hard photos count too (Codex review #729)', () => {
  // 12 observations, each one ease-4 photo among twenty ease-3 ones (mixed observations exist in 24 units of
  // fish-game.json): counting each observation as easy left 91% of the draws under ease 4.
  const L = [];
  for (let i = 0; i < 12; i++) {
    L.push({f: `easy${i}`, o: `o${i}`, e: 4});
    for (let j = 0; j < 20; j++) L.push({f: `hard${i}-${j}`, o: `o${i}`, e: 3});
  }
  const E = engine('fish', L),
    r = share(E, L);
  assert.ok(r <= E.RARE.SHARE + 0.03, `under ease 4: ${(100 * r).toFixed(1)}%`);
  assert.ok(r > 0.02, `no wall (${(100 * r).toFixed(1)}%)`);
  // Mixed and pure observations together: the 240-hard pool with every easy photo inside a hard observation's.
  const M = pool().map((p, i) => (i < 12 ? {...p, o: `oh${i}`} : p)),
    F = engine('fish', M);
  assert.ok(share(F, M) <= F.RARE.SHARE + 0.03);
});

test('exploration questions with every easy observation seen: still within the cap (Codex review #729)', () => {
  // A unit held (calibration questions, CAL.RATE, draw among the observations never seen) whose 12 easy ones were all
  // seen and answered right twice: the exploration alone drew 36% under ease 4.
  const L = pool(),
    ps = Object.fromEntries(L.filter(p => p.e >= 4).map(p => [p.f, [2, 2]])),
    E = engine('fish', L, {lv: 'mid', ps}),
    r = share(E, L);
  assert.ok(r <= E.RARE.SHARE + 0.03, `under ease 4: ${(100 * r).toFixed(1)}%`);
  assert.ok(r > 0.02, `no wall (${(100 * r).toFixed(1)}%)`);
});

test('a unit of another rank (a fish genus) under Open Water is not capped (Pierre, 2026-11-08, Q271)', () => {
  const L = pool(),
    G = engine('fish', L, {rank: 'genus'}),
    F = engine('fish', L, {rank: 'family'}),
    g = share(G, L);
  assert.ok(g > 0.3, `a genus under Open Water: ${(100 * g).toFixed(1)}% under ease 4, drawn as before`);
  assert.ok(share(F, L) <= F.RARE.SHARE + 0.03, 'a unit naming its own rank, the family, is capped');
});

test('past Open Water the hard photos come back at the targeting', () => {
  const L = pool(),
    E = engine('fish', L, {th: 1.2, score: 0.6, ok: 12}),
    r = share(E, L);
  assert.ok(r > 0.3, `under ease 4 past Open Water: ${(100 * r).toFixed(1)}%`);
});

test('a family with few easy photos: its few easiest count as the easy ones', () => {
  // 2 photos at ease 3, the rest at ease 1-2: the bar is the third easiest (ease 2 here), so the ease-1 photos are held.
  const L = [
    {f: 'a', o: 'a', e: 3},
    {f: 'b', o: 'b', e: 3}
  ];
  for (let i = 0; i < 60; i++) L.push({f: `h${i}`, o: `h${i}`, e: i < 10 ? 2 : 1});
  const E = engine('fish', L),
    e = Object.fromEntries(L.map(p => [p.f, p.e]));
  let one = 0,
    tot = 0;
  for (let i = 0; i < 3000; i++) E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => ((tot += 1), (one += e[x.f] === 1 ? 1 : 0)));
  assert.ok(one / tot <= E.RARE.SHARE + 0.03, `ease 1: ${((100 * one) / tot).toFixed(1)}%`);
  assert.ok(one > 0, 'still drawn');
});

test('rareCap: the hard photos weigh at most the share, whatever their number', () => {
  const E = engine('fish', pool());
  for (const nh of [5, 50, 500, 5000]) {
    const keys = ['e1', 'e2', ...Array.from({length: nh}, (_, i) => `h${i}`)],
      sc = Object.fromEntries(keys.map(k => [k, k[0] === 'e' ? 1 : 0.6])),
      f = E.rareCap(keys, sc, k => k[0] === 'h'),
      mh = nh * 0.6 * f;
    assert.ok(mh / (mh + 2) <= E.RARE.SHARE + 1e-9, `${nh} hard observations: ${mh / (mh + 2)}`);
  }
  // Already rare, or nothing easy to draw: unchanged.
  assert.strictEqual(
    E.rareCap(['e', 'h'], {e: 1, h: 0.05}, k => k === 'h'),
    1
  );
  assert.strictEqual(
    E.rareCap(['h1', 'h2'], {h1: 1, h2: 1}, () => true),
    1
  );
});

test('corals: photos with no judged ease are never held back', () => {
  const L = pool().map(({e, ...p}) => p),
    E = engine('coral', L);
  let hard = 0,
    tot = 0;
  for (let i = 0; i < 2000; i++) E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => ((tot += 1), (hard += /^hard/.test(x.f) ? 1 : 0)));
  // No ease, no prior: every observation alike, so the 240 "hard" ones take about their share of the pool.
  assert.ok(hard / tot > 0.85, `${((100 * hard) / tot).toFixed(1)}%`);
});
