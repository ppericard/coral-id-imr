require('./slot.js').testGuard();
// The mimicry class drilled (docs/LEARNING.md "The mimicry class"): a photo of the class makes the unit of the species it
// resembles a trap among the choices (model.js mimUnit, mimTrap; quiz.js planPhoto), counted as plausible (plausibleK,
// pgLook); the pair duels once its card was shown and its Again after a mix-up shows the pair's species (model.js
// drawHas, mimSide, mimKeep, mimPairs; quiz.js duelPick, rematchAdd), never a photo its unit still holds back.
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

// Two families: f:A, whose species s1 has juveniles that resemble species s2 of f:B (an entry as app.js mimLay lays it),
// each with a genus and a species unit. f:A: 20 adults of s0, 10 adults and 10 juveniles of s1; f:B: 20 of s3, 10 adults
// and 10 juveniles of s2.
function pics(sp, n, ph = '') {
  const one = i => ({f: `${sp}${ph}${i}`, o: `o${sp}${ph}${i}`, sp, ...(ph ? {ph} : {})});
  return Array.from({length: n}, (_, i) => one(i));
}
const LA = [...pics('s0', 20), ...pics('s1', 10), ...pics('s1', 10, 'juvenile')],
  LB = [...pics('s3', 20), ...pics('s2', 10), ...pics('s2', 10, 'juvenile')];
const entry = (stb = 'all', m = ['s:s2', 'g:B1', 'f:B']) => ({
  sp: 's1',
  st: 'juvenile',
  u: ['s:s1', 'g:A1', 'f:A'],
  m,
  fb: m[2],
  pair: {id: 'X1', b: 's2', st: {a: 'juvenile', b: stb}}
});
const units = (e = entry()) => ({
  'f:A': {name: 'Afish', mim: [e], views: {wide: LA}},
  'f:B': {name: 'Bfish', views: {wide: LB}},
  'f:C': {name: 'Cfish', views: {wide: []}},
  'g:A1': {name: 'A1', rank: 'genus', parent: 'f:A', views: {wide: LA}},
  'g:B1': {name: 'B1', rank: 'genus', parent: 'f:B', views: {wide: LB}},
  's:s1': {name: 'S1', rank: 'species', family: 'f:A', views: {wide: LA.filter(p => p.sp === 's1')}},
  's:s2': {name: 'S2', rank: 'species', family: 'f:B', views: {wide: LB.filter(p => p.sp === 's2')}}
});
// model.js from varHome to mimPairs (the variants, the class's draw and its drills), plausibleK, mimTrap and pgLook, with
// the game around them stubbed: bars by unit (genScore), the units met, the confusion scores by unit.
function model(G, {bar = {}, met = () => true, conf = {}} = {}) {
  const code = [
    cut(MSRC, 'const varHome = n => {', '\n  return out;\n}\n', {through: 1, file: 'model.js'}),
    cut(MSRC, 'const plausibleK = ', '\n}\n', {through: 1, file: 'model.js'}),
    cut(MSRC, 'const pgLook = ', '\nfunction pgWeight(', {file: 'model.js'})
  ].join('\n');
  const stubs = {
    GX: n => G[n],
    rankOf: n => (G[n] || {}).rank || '',
    phaseOf: C.phaseOf,
    varKindOf: C.varKindOf,
    VAR_AT: C.VAR_AT,
    varRamp: C.varRamp,
    genScore: n => bar[n] || 0,
    introduced: met,
    PICKD: {VARIETY: 3},
    gamePics: (n, v) => (v === 'wide' ? G[n].views.wide : []),
    gamePhotoOk: () => true,
    choiceKey: n => (G[n] || {}).name || n,
    confOf: (t, n) => conf[n] ?? 0.1,
    confusable: (t, n) => (conf[n] ?? 0.1) >= 0.2,
    pooledConf: (t, n) => conf[n] ?? 0.1,
    imrFormsOf: () => [],
    CONF: {TRAP: 0.2}
  };
  const out = '\nreturn {mimUnit, mimMix, drawHas, mimSide, mimKeep, mimPairs, plausibleK, mimTrap, pgLook};',
    make = new Function(...Object.keys(stubs), code + out);
  return make(...Object.values(stubs));
}
const juv1 = LA.find(p => p.sp === 's1' && p.ph),
  ad1 = LA.find(p => p.sp === 's1' && !p.ph),
  s0 = LA[0];

test('mimUnit: the unit at the rank asked of the species a photo of the class resembles; none inside the unit asked', () => {
  const M = model(units());
  assert.strictEqual(M.mimUnit('f:A', juv1), 'f:B');
  assert.strictEqual(M.mimUnit('g:A1', juv1), 'g:B1');
  assert.strictEqual(M.mimUnit('s:s1', juv1), 's:s2');
  assert.strictEqual(M.mimUnit('f:A', ad1), null, 'an adult of a species whose juveniles resemble: no trap');
  assert.strictEqual(M.mimUnit('f:A', s0), null, 'another species');
  assert.strictEqual(M.mimUnit('f:A', undefined), null, 'no photo (a typed "I don’t know")');
  // The species resembled in the same family (two blennies): nothing at the family, the genera still apart
  const I = model(units(entry('all', ['s:s2', 'g:B1', 'f:A'])));
  assert.strictEqual(I.mimUnit('f:A', juv1), null);
  assert.strictEqual(I.mimUnit('g:A1', juv1), 'g:B1');
});

test('mimMix: a mix-up between the two species of a pair, both ways, at the rank asked; never an ordinary miss', () => {
  const e = entry(),
    M = model(units(e)),
    ad2 = LB.find(p => p.sp === 's2' && !p.ph),
    juv2 = LB.find(p => p.sp === 's2' && p.ph),
    s3 = LB.find(p => p.sp === 's3');
  // A photo of the class taken for the species it resembles, at every rank
  assert.strictEqual(M.mimMix('f:A', juv1, 'f:B'), e);
  assert.strictEqual(M.mimMix('g:A1', juv1, 'g:B1'), e);
  assert.strictEqual(M.mimMix('s:s1', juv1, 's:s2'), e);
  // The species resembled taken for the class's unit (the other side of its duel and Again)
  assert.strictEqual(M.mimMix('f:B', ad2, 'f:A'), e);
  assert.strictEqual(M.mimMix('s:s2', juv2, 's:s1'), e);
  // Never: an ordinary miss, the other answer at another rank, a right answer, no answer, no photo
  assert.strictEqual(M.mimMix('f:A', juv1, 'f:C'), null, 'another family');
  assert.strictEqual(M.mimMix('f:B', ad2, 'f:C'), null);
  assert.strictEqual(M.mimMix('f:A', juv1, 'g:B1'), null, 'another rank');
  assert.strictEqual(M.mimMix('f:A', juv1, 'f:A'), null, 'right');
  assert.strictEqual(M.mimMix('f:A', juv1, ''), null, 'I don’t know');
  assert.strictEqual(M.mimMix('f:A', undefined, 'f:B'), null, 'no photo');
  // Nor a photo of neither species at the stage that resembles: an adult of the side whose juveniles resemble, another
  // species of either family
  assert.strictEqual(M.mimMix('f:A', ad1, 'f:B'), null);
  assert.strictEqual(M.mimMix('f:A', s0, 'f:B'), null);
  assert.strictEqual(M.mimMix('f:B', s3, 'f:A'), null);
  // The side resembled at its juvenile stage only: its adults are no mix-up of the pair
  const J = entry('juvenile'),
    MJ = model(units(J));
  assert.strictEqual(MJ.mimMix('f:B', ad2, 'f:A'), null);
  assert.strictEqual(MJ.mimMix('f:B', juv2, 'f:A'), J);
  // A pair inside one family: nothing at the family (the answer is right), the genera still apart
  const I = entry('all', ['s:s2', 'g:B1', 'f:A']),
    MI = model(units(I));
  assert.strictEqual(MI.mimMix('f:A', juv1, 'f:A'), null);
  assert.strictEqual(MI.mimMix('g:A1', juv1, 'g:B1'), I);
  // Two pairs on one family resembling the same species, one of its juveniles, one of every photo: a juvenile of the
  // species resembled takes the pair that names its juveniles, an adult the other
  const G = units(),
    eAll = {...entry('all'), pair: {id: 'X1', b: 's2', st: {a: 'juvenile', b: 'all'}}},
    eJuv = {...entry('juvenile'), pair: {id: 'X2', b: 's2', st: {a: 'juvenile', b: 'juvenile'}}};
  G['f:A'].mim = [eAll, eJuv];
  const M2 = model(G);
  assert.strictEqual(M2.mimMix('f:B', juv2, 'f:A').pair.id, 'X2');
  assert.strictEqual(M2.mimMix('f:B', ad2, 'f:A').pair.id, 'X1');
});

test('mimMix is the feedback only: the draw, the scoring and the Again never read it (quiz.js)', () => {
  const uses = QSRC.split('\n').filter(l => /mimMix\(/.test(l) && !/^\s*\/\//.test(l));
  assert.strictEqual(uses.length, 1, 'one call, in answer()');
  assert.match(uses[0], /const mx = good \? null : tap \? mimMix\(c, tap, target\) : mimMix\(target, seenPh\[0\], c\);/);
  assert.ok(!/rematchAdd\([^)]*\bmx\b/.test(QSRC) && !/recordAnswer\(\{[^}]*\bmx\b/.test(QSRC), 'no Again, no record reads it');
  assert.ok(!/mimMix/.test(rd('core.js')), 'nothing in the progress engine');
});

test('mimTrap: in the place of the weakest trap, or the one of its label; plausible and a look-alike there', () => {
  const M = model(units(), {conf: {'f:C': 0.5, 'f:D': 0.05, 'f:E': 0.3}});
  // C and E the traps (0.2 or more): E, the weaker, gives its place; the easy choice D stays, so the traps stay two
  assert.deepStrictEqual(M.mimTrap('f:A', ['f:C', 'f:A', 'f:D', 'f:E'], 'f:B'), ['f:C', 'f:A', 'f:D', 'f:B']);
  // No trap among the choices: the one least confused
  const N = model(units(), {conf: {'f:C': 0.15, 'f:D': 0.05, 'f:E': 0.1}});
  assert.deepStrictEqual(N.mimTrap('f:A', ['f:C', 'f:A', 'f:D', 'f:E'], 'f:B'), ['f:C', 'f:A', 'f:B', 'f:E']);
  const ch = ['f:A', 'f:B', 'f:C', 'f:D'];
  assert.strictEqual(M.mimTrap('f:A', ch, 'f:B'), ch, 'already a choice');
  assert.strictEqual(M.mimTrap('f:A', ch, null), ch, 'no trap');
  // A choice that carries the trap's label goes first (never two choices of one label)
  const G = units();
  G['f:E'] = {name: 'Bfish', views: {wide: []}};
  const E = model(G, {conf: {'f:C': 0.5, 'f:D': 0.05, 'f:E': 0.3}}).mimTrap('f:A', ['f:A', 'f:C', 'f:D', 'f:E'], 'f:B');
  assert.deepStrictEqual(E, ['f:A', 'f:C', 'f:D', 'f:B']);
  // Plausible on that photo (the guess rate) and a look-alike among the choices (the progress weight)
  assert.strictEqual(M.plausibleK('f:A', ['f:A', 'f:C', 'f:B', 'f:D']), 2);
  assert.strictEqual(M.plausibleK('f:A', ['f:A', 'f:C', 'f:B', 'f:D'], 'f:B'), 3);
  assert.strictEqual(M.pgLook('f:A', ['f:A', 'f:B']), false);
  assert.strictEqual(M.pgLook('f:A', ['f:A', 'f:B'], 'f:B'), true);
});

test('mimKeep: the pair’s species on each side, only while that side’s draw holds one now', () => {
  const pair = ['f:A', 'f:B'];
  // Under Open Water on f:A: the class waits (its ramp from Open Water once f:B is met), so the drill keeps nothing
  assert.strictEqual(model(units(), {bar: {'f:A': 0.3, 'f:B': 0.6}}).mimKeep('X1', pair, 'f:A'), null);
  const M = model(units(), {bar: {'f:A': 0.7, 'f:B': 0.6, 'g:A1': 0.7}}),
    ka = M.mimKeep('X1', pair, 'f:A'),
    kb = M.mimKeep('X1', pair, 'f:B');
  assert.ok(ka && ka(juv1) && !ka(ad1) && !ka(s0), 'f:A: the juveniles of s1 only');
  assert.ok(kb && LB.filter(kb).every(p => p.sp === 's2') && LB.filter(kb).length === 20, 'f:B: every photo of s2 (its stage all)');
  // The genera's Again of the same pair, on the genus's own bar
  const kg = M.mimKeep('X1', ['g:A1', 'g:B1'], 'g:A1');
  assert.ok(kg && kg(juv1) && !kg(ad1));
  assert.strictEqual(model(units(), {bar: {'f:A': 0.7}}).mimKeep('X1', ['g:A1', 'g:B1'], 'g:A1'), null);
  // The side resembled at its juvenile stage, held back on its unit's ramp (f:B under Open Water): nothing kept
  const J = model(units(entry('juvenile')), {bar: {'f:A': 0.7, 'f:B': 0.3}});
  assert.strictEqual(J.mimKeep('X1', pair, 'f:B'), null);
  const kj = model(units(entry('juvenile')), {bar: {'f:A': 0.7, 'f:B': 0.9}}).mimKeep('X1', pair, 'f:B'),
    j2 = LB.find(p => p.ph && p.sp === 's2');
  assert.ok(kj && kj(j2) && !kj(LB.find(p => !p.ph && p.sp === 's2')), 'past Advanced: its juveniles only');
  // No pair, another pair, a unit of neither side
  assert.strictEqual(M.mimKeep('', pair, 'f:A'), null);
  assert.strictEqual(M.mimKeep('X9', pair, 'f:A'), null);
  assert.strictEqual(M.mimKeep('X1', ['f:A', 'f:C'], 'f:C'), null);
});

test('mimSide: never a photo taken outside the region of a species whose look varies by region, as on the card', () => {
  const e = {...entry(), ra: true, rb: true},
    M = model(units(e)),
    w = {...juv1, loc: 'world'},
    b = LB.find(p => p.sp === 's2');
  assert.ok(!M.mimSide(e, 'f:A')(w) && M.mimSide(e, 'f:A')({...juv1, loc: 'ph'}));
  assert.ok(!M.mimSide(e, 'f:B')({...b, loc: 'world'}) && M.mimSide(e, 'f:B')(b));
  assert.ok(model(units()).mimSide(entry(), 'f:A')(w), 'a species flagged nowhere: any photo of the class');
});

test('mimPairs: the class’s duels at the families, once ok and both sides’ draws hold their photos', () => {
  const all = ['f:A', 'f:B', 'f:C', 'g:A1', 'g:B1'],
    none = () => false;
  function at(bar, list = all, ok = undefined) {
    return model(units(), {bar}).mimPairs(list, ok);
  }
  const L = at({'f:A': 0.7, 'f:B': 0.6});
  assert.deepStrictEqual(
    L.map(p => p.join('|')),
    ['f:A|f:B']
  );
  assert.strictEqual(L[0].mim, 'X1');
  assert.deepStrictEqual(at({'f:A': 0.7, 'f:B': 0.6}, all, none), [], 'its card not shown yet');
  assert.deepStrictEqual(at({'f:A': 0.3, 'f:B': 0.6}), [], 'the class not in its draw yet');
  assert.deepStrictEqual(at({'f:A': 0.7, 'f:B': 0.6}, ['f:A', 'f:C']), [], 'the family resembled not in the list');
  // The species resembled in the same family: no duel
  const inside = model(units(entry('all', ['s:s2', 'g:B1', 'f:A'])), {bar: {'f:A': 0.9}});
  assert.deepStrictEqual(inside.mimPairs(['f:A', 'f:B']), []);
});

// quiz.js planPhoto's question (no card, no contrast question), with the game around it stubbed: the unit asked f:A, its
// three wrong choices f:C, f:D, f:E (f:C the only look-alike), the photo drawn photo, mimUnit by the photo's flag.
function plan({traps = 1, typed = false, ex = null, metB = true, photo = {f: 'j', cls: 1}, sel = null} = {}) {
  const M = model(units(), {conf: {'f:C': 0.5, 'f:D': 0.05, 'f:E': 0.25}}),
    ctx = {
      pool: () => ['f:A', 'f:B', 'f:C', 'f:D', 'f:E'],
      customSel: () => sel,
      CUSTOM_H: 'practice/custom/play',
      holdEase: () => 0,
      CONTRAST: {GAP: 2, P: 0},
      introReady: () => true,
      choiceNames: () => false,
      closed: () => false,
      pick: L => L[0],
      rustNow: () => false,
      cbIn: () => false,
      recallAt: () => 1,
      uname: n => n,
      shuffle: L => L,
      SHOWNQ: null,
      NEXTQ: null,
      noOpen: () => true,
      introStart: () => [],
      introduced: n => n !== 'f:B' || metB,
      comebackOf: () => null,
      introHold: () => true,
      openPace: () => false,
      openRight: () => false,
      mayOpen: () => false,
      shareRoom: () => false,
      openChance: () => 0,
      openPick: L => L[0],
      openRecent: () => [],
      openDue: () => [],
      asked: () => true,
      nextTarget: () => 'f:A',
      customDraw: null,
      duelPick: () => null,
      planFind: () => null,
      examReady: () => !!ex,
      examSet: () => ex,
      examTyped: () => false,
      trapsFor: () => traps,
      customChoices: () => ['f:C', 'f:D', 'f:E'],
      unlocked: L => L,
      distractors: () => ['f:C', 'f:D', 'f:E'],
      typedP: () => (typed ? 1 : 0),
      TYPED: {k: Infinity},
      confusable: (t, n) => n === 'f:C',
      plausibleK: M.plausibleK,
      mimTrap: M.mimTrap,
      mimUnit: (t, p) => (p && p.cls ? 'f:B' : null),
      mimKeep: () => null,
      confTerm: () => 0,
      cover: () => null,
      GX: () => ({}),
      SUBJ: {one: 'family'},
      photoSet: () => ({shown: [photo]})
    };
  vm.createContext(ctx);
  vm.runInContext(
    'let rematch = [], twoAt = -Infinity, twoPair = "", last = "", lastQs = [];\n' +
      cut(QSRC, "function planPhoto(cur = 'quiz', at = answersSoFar()) {", '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.planPhoto = planPhoto;',
    ctx
  );
  const q = ctx.planPhoto(sel ? 'practice/custom/play' : 'quiz', 10);
  q[2] = [...q[2]]; // an array of this realm, for deepStrictEqual
  return q;
}

test('planPhoto: a photo of the class puts the unit it resembles among the choices, as a trap counted plausible', () => {
  const q = plan();
  assert.deepStrictEqual(q[2], ['f:A', 'f:C', 'f:D', 'f:B'], 'in the place of the weaker trap (E)');
  assert.strictEqual(q[5], 3, 'a trap and the unit resembled: 3 plausible choices');
  // Another photo: the choices as they were
  const o = plan({photo: {f: 'x'}});
  assert.deepStrictEqual(o[2], ['f:A', 'f:C', 'f:D', 'f:E']);
  assert.strictEqual(o[5], 3);
  // No trap on the question (a unit's first questions), typed, or the unit resembled not met: nothing changes
  assert.deepStrictEqual(plan({traps: 0})[2], ['f:A', 'f:C', 'f:D', 'f:E']);
  assert.ok(plan({typed: true}).typed && !plan({typed: true})[2].includes('f:B'));
  assert.deepStrictEqual(plan({metB: false})[2], ['f:A', 'f:C', 'f:D', 'f:E']);
  // Every trap in (2 or more): every choice counts as before
  const t3 = plan({traps: 3});
  assert.ok(t3[2].includes('f:B') && t3[5] === 0);
  // The mastery exam's photo too
  assert.ok(plan({ex: {shown: [{f: 'e', cls: 1}], exam: 1}})[2].includes('f:B'));
  // The custom quiz: only when the unit resembled is in the selection
  assert.ok(!plan({sel: ['f:A', 'f:C', 'f:D', 'f:E']})[2].includes('f:B'));
  assert.ok(plan({sel: ['f:A', 'f:C', 'f:D', 'f:B', 'f:E']})[2].includes('f:B'));
});

test('rematchAdd: a mix-up on a photo of the class keeps its pair’s id for its Again, as data the planner copies', () => {
  const ctx = {CONTRAST: {Q: 3}};
  vm.createContext(ctx);
  vm.runInContext(
    'let rematch = [];\n' +
      cut(QSRC, 'const rematchAdd = (pair, at, mim', '\n};\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.Q = {add: rematchAdd, q: () => rematch};',
    ctx
  );
  ctx.Q.add(['f:A', 'f:C'], 1);
  ctx.Q.add(['f:A', 'f:B'], 2, 'X1');
  const q = JSON.parse(JSON.stringify(ctx.Q.q())),
    want = [
      {pair: ['f:A', 'f:C'], at: 1},
      {pair: ['f:A', 'f:B'], at: 2, mim: 'X1'}
    ];
  assert.deepStrictEqual(q, want);
  // The same pair queued by a plain mix-up first takes the id of a later one on the class's photo
  ctx.Q.add(['f:C', 'f:A'], 3, 'X2');
  assert.strictEqual(ctx.Q.q()[0].mim, 'X2');
  assert.strictEqual(ctx.Q.q().length, 2);
});

test('the duels and the Again draw the pair’s species through photoSet’s keep (quiz.js)', () => {
  assert.ok(QSRC.includes("photoSet(t, null, Math.log(R) + ease, 2, 'again', mimKeep(mim, pair, t))"));
  assert.ok(QSRC.includes('k = mimKeep(pair.mim, pair, t); // a pair of the mimicry class (duelPick): its species'));
  assert.ok(QSRC.includes("photoSet(t, null, ease, 2, 'qduel', k)]"));
  assert.ok(QSRC.includes("holdEase(), 2, 'duel', mimKeep(pair.mim, pair, t))"));
  assert.ok(QSRC.includes('...mimPairs(list, m => mimSeen(m.pair.id))'));
});
