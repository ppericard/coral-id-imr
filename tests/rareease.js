// The harness of the rareease*.test.js files (rarely under ease 4 before Open Water; split in three files so node --test
// runs them in parallel processes). model.js photoSet runs in Node, in a vm, with the game around it stubbed.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');
const C = require('../core.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'model.js'), 'utf8');
const code = [
  cut(src, 'const PICKD = {', '// The next exam question of genus n', {file: 'model.js'}),
  cut(src, 'const PDIFF = {', '\n}\n', {through: 1, file: 'model.js'}),
  // The photo memory offsets of the subject in play (pmem: the sheet's PMEM for the corals, the prior for the fish).
  cut(src, 'const PMEM0 = memOf();', '\n// Per-format offsets', {file: 'model.js'}),
  // The format offsets of the subject in play (pfmt: the sheet's PFMT for the corals, none for the fish).
  cut(src, 'const PFMT0 = ', '\n// Progress saved before the photo memory', {file: 'model.js'}),
  cut(src, 'function wpick(', '\n}\n', {through: 1, file: 'model.js'})
].join('\n');

// The draw of model.js (PICKD to the end of photoSet, photoDiff, wpick) with the game around it stubbed: one unit, n,
// its photos L (one per observation, the fish's single view), the player's ability th and progress score sc on it.
// The stubs are the parameters of a function around the code, not the vm's globals: the same names and the same draws,
// but a global lookup in a vm goes through its context object, which made the draws about 40% slower.
function engine(
  subject,
  L,
  {
    th = 1.2,
    score = 0.3,
    ok = 2,
    lv = 'new',
    ps = {},
    rank = '',
    PMEM = [0, -0.45, -1.1, -1.7],
    PFMT = {},
    fmtOff = () => 0,
    PSTAT = {}
  } = {}
) {
  let s = 12345;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647,
    M = Object.create(Math);
  M.random = rnd;
  const SUBJ = C.subjectOf(subject),
    cal = C.calibOf(SUBJ);
  const stubs = {
    Math: M,
    SUBJ,
    // The subject's calibration, built once: photoSet asks for it at every photo weight (a new object each time).
    calibOf: s => (s === SUBJ ? cal : C.calibOf(s)),
    refLevel: C.refLevel,
    memBucket: C.memBucket,
    aimOf: C.aimOf,
    DOM: C.DOM,
    TARGET_P: C.TARGET_P,
    AIM: C.AIM,
    LEVEL: '_level',
    P: {u: {ok, ko: 0, th, ps}},
    PSTAT,
    PGD: {},
    PMEM,
    memOf: C.memOf,
    PFMT,
    fmtOff,
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
  const ctx = vm.createContext({...stubs}),
    names = Object.keys(stubs),
    make = vm.runInContext(`(function (${names.join(', ')}) {\n${code}\nreturn {photoSet, RARE, rareCap};\n})`, ctx);
  return make(...names.map(k => stubs[k]));
}
// A pool like a starter family's, but harder still: 12 easy photos (ease 4-5) against 240 under ease 4.
const pool = () => {
  const L = [];
  for (let i = 0; i < 12; i++) L.push({f: `easy${i}`, o: `oe${i}`, e: 4 + (i % 2)});
  for (let i = 0; i < 240; i++) L.push({f: `hard${i}`, o: `oh${i}`, e: 1 + (i % 3)});
  return L;
};
// How many draws a check takes (test-suite audit, 2026-11-09: 3,000 each made these files 60 s of the run; a draw is
// about 2.5 ms, model.js photoSet's own cost on 252 photos). The draws are seeded, so a check passes or fails the same
// at every run; the counts say how far a change to the draw can move its result. CAP, for "at most about RARE.SHARE"
// (bound SHARE + 0.03): the shares measured are 0.094 to 0.111, so the bound is 2.5 to 3.4 standard errors away at 1,500
// draws (SE 0.008 at 0.1; 4.5 at 3,000); a cap broken to a 0.16 share fails at 99.9%, to 0.20 for sure (the #729 bugs
// drew 36% and 91%). BACK, for "they come back" (above 0.3; above 0.85 for the corals): 0.67 to 0.95 measured, more
// than 8 standard errors away at 300 draws.
const DRAWS = {CAP: 1500, BACK: 300};
const share = (E, L, N = DRAWS.CAP) => {
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

module.exports = {engine, pool, share, DRAWS};
