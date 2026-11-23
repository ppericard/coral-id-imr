require('./slot.js').testGuard();
// Find the X on a mimicry pair (REE-45; Pierre, 2026-11-19, Q416 c: «ok. Du coup à mettre dans la suite des trucs à faire»,
// on "a photo of the class would be the decoy tile on Find the Angelfish"; docs/LEARNING.md "The mimicry class"): on the unit
// of the species a pair resembles, one of the three others is the unit of the species that resembles it, its tile a
// photo of the class (model.js mimSide, drawHas, mimTrap; quiz.js mimDecoys, planFind), the unit's own tile the species
// resembled at its stage; the real functions of both files run in a vm with the game around them stubbed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const cut = require('./block.js');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const MSRC = rd('model.js'),
  QSRC = rd('quiz.js');

// f:A holds s0 (adults) and s1 (adults and juveniles; the juveniles resemble s2); f:B holds s3 and s2 (the model); f:C..f:F
// are fillers. Every photo carries a tile (xc) unless a test takes them off.
const pics = (sp, n, ph = '', tile = true) =>
  Array.from({length: n}, (_, i) => ({
    f: `${sp}${ph}${i}`,
    o: `o${sp}${ph}${i}`,
    sp,
    ...(ph ? {ph} : {}),
    ...(tile ? {xc: [0, 0, 1, 1]} : {})
  }));
const FAM = {
  'f:A': [...pics('s0', 6), ...pics('s1', 6), ...pics('s1', 6, 'juvenile')],
  'f:B': [...pics('s3', 6), ...pics('s2', 6)],
  'f:C': pics('s4', 6),
  'f:D': pics('s5', 6),
  'f:E': pics('s6', 6),
  'f:F': pics('s7', 6)
};
const entry = (over = {}) => ({
  sp: 's1',
  st: 'juvenile',
  u: ['s:s1', 'g:A1', 'f:A'],
  m: ['s:s2', 'g:B1', 'f:B'],
  fb: 'f:B',
  pair: {id: 'X1', b: 's2', st: {a: 'juvenile', b: 'all'}},
  ...over
});
function world({photos = FAM, e = entry(), met = () => true, bar = {}, seed = 3} = {}) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647,
    M = Object.create(Math);
  M.random = rnd;
  const G = {};
  Object.entries(photos).forEach(([f, L]) => (G[f] = {name: f.slice(2) + 'fish', look: [], views: {wide: L}}));
  G['f:A'].mim = [e];
  G['g:A1'] = {name: 'A1', rank: 'genus', parent: 'f:A', views: {wide: photos['f:A']}};
  G['g:B1'] = {name: 'B1', rank: 'genus', parent: 'f:B', views: {wide: photos['f:B']}};
  // the species by their common names: s:s1 and s:s2, with filler species s:s0, s:s3 for the class's four
  const spOf = (f, id) => photos[f].filter(p => p.sp === id);
  [
    ['s:s0', 'f:A', 's0'],
    ['s:s1', 'f:A', 's1'],
    ['s:s2', 'f:B', 's2'],
    ['s:s3', 'f:B', 's3'],
    ['s:s4', 'f:C', 's4'],
    ['s:s5', 'f:D', 's5']
  ].forEach(
    ([u, f, sp]) =>
      (G[u] = {name: 'Sp' + 'abcdefgh'[Number(sp.slice(1))], rank: 'species', kind: 'cn', family: f, parent: f, views: {wide: spOf(f, sp)}})
  );
  const shots = [];
  const stubs = {
    Math: M,
    SUBJ: {id: 'fish'},
    UNITS: {fish: {tiles: n => (G[n] ? G[n].views.wide.filter(p => p.xc) : [])}},
    GX: n => G[n],
    rankOf: n => (G[n] || {}).rank || '',
    kindRank: n => ((G[n] || {}).rank || '') + ((G[n] || {}).kind ? ':' + G[n].kind : ''),
    rankUnits: () => [],
    introReady: met,
    introduced: met,
    genScore: n => bar[n] ?? 0.9,
    phaseOf: C.phaseOf,
    varKindOf: C.varKindOf,
    VAR_AT: C.VAR_AT,
    varRamp: C.varRamp,
    PICKD: {VARIETY: 3},
    gamePics: (n, v) => (v === 'wide' && G[n] ? G[n].views.wide : []),
    gamePhotoOk: () => true,
    imrFormsOf: () => [],
    CONF: C.CONF,
    confOf: () => 0.1,
    pooledConf: () => 0.1,
    confusable: () => false,
    confTerm: () => 0,
    FIND: {P: 1},
    uname: n => (G[n] || {}).name || n,
    pick: a => a[Math.floor(rnd() * a.length)],
    shuffle: a => {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    },
    // model.js photoSet's contract here: a photo of n that keep allows
    photoSet: (n, skip, shift, k, f, keep) => {
      shots.push({n, keep: !!keep});
      const L = G[n].views.wide.filter(p => !keep || keep(p));
      return {shown: L.length ? [{...L[Math.floor(rnd() * L.length)], view: 'wide'}] : [], hint: null, reveal: []};
    }
  };
  const ctx = vm.createContext(stubs);
  vm.runInContext(
    [
      cut(MSRC, 'const varHome = n => {', '\n  return out;\n}\n', {through: 1, file: 'model.js'}),
      cut(MSRC, "// A choice's label as its button shows it", '\n}\n', {through: 1, file: 'model.js'}),
      cut(MSRC, 'function mimTrap(t, ch, u) {', '\n}\n', {through: 1, file: 'model.js'}),
      cut(QSRC, 'function mimDecoys(t, list, tile) {', '\n}\n', {through: 1, file: 'quiz.js'}),
      cut(QSRC, "const findRank = n => !rankOf(n) || rankOf(n) === 'species';", '\n}\n', {through: 1, file: 'quiz.js'}),
      'this.planFind = planFind; this.mimDecoys = mimDecoys;'
    ].join('\n'),
    ctx
  );
  return {
    G,
    shots,
    ctx,
    plan: (t, list) => ctx.planFind('quiz', t, list),
    decoys: (t, list) => JSON.parse(JSON.stringify(ctx.mimDecoys(t, list, p => !!p.xc).map(x => x.d)))
  };
}
const FAMS = ['f:A', 'f:B', 'f:C', 'f:D', 'f:E', 'f:F'],
  SPS = ['s:s0', 's:s1', 's:s2', 's:s3', 's:s4', 's:s5'];
const isClass = p => p.sp === 's1' && p.ph === 'juvenile';

test('on the model unit, a photo of the class is the decoy tile, the unit its own species resembled', () => {
  const W = world();
  for (let i = 0; i < 150; i++) {
    const q = W.plan('f:B', FAMS);
    assert.ok(q && q.findx, 'a Find the X on the model');
    const [, t, ch, , set] = q,
      dec = set.find.find(x => x.n === 'f:A');
    assert.strictEqual(t, 'f:B');
    assert.strictEqual(new Set(ch).size, 4);
    assert.ok(ch.includes('f:A'), `the resembling unit among the four: ${ch}`);
    assert.ok(dec && isClass(dec.p) && dec.p.xc, 'its tile is a juvenile of the species that resembles, a tile');
    assert.strictEqual(set.shown[0].sp, 's2', 'the model unit shows the species resembled');
    assert.ok(
      set.find.every(x => x.p.xc),
      'every photo a tile'
    );
  }
});

test('at the species rank the pair is the species units, by their common names', () => {
  const W = world();
  for (let i = 0; i < 100; i++) {
    const q = W.plan('s:s2', SPS);
    assert.ok(q && q.findx);
    const dec = q[4].find.find(x => x.n === 's:s1');
    assert.ok(q[2].includes('s:s1') && dec && isClass(dec.p), `the species decoy: ${q[2]}`);
    assert.strictEqual(q[4].shown[0].sp, 's2');
  }
});

test('the resembling side keeps its ordinary Find the X; a unit with no pair is untouched', () => {
  const W = world();
  assert.deepStrictEqual(W.decoys('f:A', FAMS), []);
  assert.deepStrictEqual(W.decoys('f:C', FAMS), []);
  // a Find the X on f:A or f:C draws every tile freely (no keep beyond the tile), and f:A's question has no decoy forced
  W.shots.length = 0;
  const q = W.plan('f:C', FAMS);
  assert.ok(q && W.shots.every(s => s.keep));
});

test('never: the decoy unit not met, outside the list, with no tile of the class, held back by its draw; a pair inside the unit', () => {
  // not met
  let W = world({met: n => n !== 'f:A'});
  assert.deepStrictEqual(W.decoys('f:B', FAMS), []);
  // outside the list (the custom quiz's selection)
  W = world();
  assert.deepStrictEqual(
    W.decoys(
      'f:B',
      FAMS.filter(n => n !== 'f:A')
    ),
    []
  );
  // no tile on a juvenile of s1 (the fish's boxes today: the class has none)
  const noClass = {...FAM, 'f:A': [...pics('s0', 6), ...pics('s1', 6), ...pics('s1', 6, 'juvenile', false)]};
  W = world({photos: noClass});
  assert.deepStrictEqual(W.decoys('f:B', FAMS), []);
  const q0 = W.plan('f:B', FAMS);
  assert.ok(!q0 || q0[4].find.every(x => !isClass(x.p) || x.n !== 'f:A'), 'an ordinary Find the X then');
  // held back by the draw: a bar under the class's ramp (model.js MIM_AT, f:A's bar 0): no weight, no decoy
  W = world({bar: {'f:A': 0, 'f:B': 0}});
  assert.deepStrictEqual(W.decoys('f:B', FAMS), []);
  // the pair inside the unit asked (two blennies asked as their family): the model's units hold the resembling one
  W = world({e: entry({m: ['s:s2', 'g:B1', 'f:A'], fb: 'f:A'})});
  assert.deepStrictEqual(W.decoys('f:A', FAMS), []);
});

test('the model unit with no tile of the species resembled: the decoy stays, its own tile is any tile', () => {
  const noModel = {...FAM, 'f:B': [...pics('s3', 6), ...pics('s2', 6, '', false)]};
  const W = world({photos: noModel});
  for (let i = 0; i < 30; i++) {
    const q = W.plan('f:B', FAMS);
    assert.ok(q && q[2].includes('f:A'));
    assert.strictEqual(q[4].shown[0].sp, 's3', 'the only tile f:B has');
  }
});

test('the answer: the decoy is the class unit read from the four tiles, never the question own photo', () => {
  // quiz.js answer: fd, the tile of another unit whose photo is of the class resembling the name asked (model.js mimUnit)
  const W = world();
  const q = W.plan('f:B', FAMS),
    mu = (t, p) => vm.runInContext(`mimUnit(${JSON.stringify(t)}, ${JSON.stringify(p)})`, W.ctx);
  assert.strictEqual(
    q[4].find
      .filter(x => x.n !== 'f:B' && mu(x.n, x.p) === 'f:B')
      .map(x => x.n)
      .join(),
    'f:A',
    'exactly the decoy'
  );
  assert.strictEqual(mu('f:B', q[4].shown[0]), null, 'the model photo is no class photo');
  const src = QSRC;
  assert.ok(src.includes('SHOWNQ[4].find.find(x => x.n !== target && mimUnit(x.n, x.p) === target)'));
  assert.ok(src.includes('mu = mimUnit(target, seenPh[0]) || (fd ? fd.n : null)'));
  assert.ok(src.includes('mimOf(fd.n, fd.p)'), "the Again of a decoy tapped carries the pair's id");
});
