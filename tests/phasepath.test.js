require('./slot.js').testGuard();
// Juveniles and colour phases on their unit's mastery: never at the very start of a unit, then in stages, with the card
// that explains them and no wall; one rule for every level, the variants on a ramp of their own unit's mastery;
// "Learned" asks each variant group. core.js phaseOf, varKindOf, varRamp, VAR_AT, phaseKind, phaseCardOf, phasePair,
// and model.js photoSet, varLeft, examSet, examPassed run in Node on fish-like pools (tests/rareease.js).
// docs/LEARNING.md "Juveniles and colour phases on their unit's mastery".
const test = require('node:test'),
  assert = require('node:assert');
const C = require('../core.js');
const {engine} = require('./rareease.js');

test('phaseOf: the judged phase word, else the juvenile flag of the tags, else none', () => {
  assert.strictEqual(C.phaseOf({ph: 'male'}), 'male');
  assert.strictEqual(C.phaseOf({ph: 'juvenile', jt: 'p1g0sl1j2'}), 'juvenile');
  assert.strictEqual(C.phaseOf({jt: 'p1g1sm1j2'}), 'juvenile');
  // The phase flag p marks a whole entry whose sexes differ: not the photo's own phase. No flag, no phase.
  assert.strictEqual(C.phaseOf({jt: 'p1g0sl1pr5'}), '');
  assert.strictEqual(C.phaseOf({jt: 'p1g0sl14'}), '');
  assert.strictEqual(C.phaseOf({}), '');
  assert.strictEqual(C.phaseOf(null), '');
});

test('varKindOf: the kind from the photo and its family juvenile classes', () => {
  const juv = {f: 'j', t: 'Dascyllus aruanus', ph: 'juvenile'},
    male = {f: 'm', t: 'Pseudanthias squamipinnis', ph: 'male'},
    adult = {f: 'a', t: 'Dascyllus aruanus'};
  assert.strictEqual(C.varKindOf(adult, {cls: 'A'}), '');
  assert.strictEqual(C.varKindOf(male, null), 'ph');
  assert.strictEqual(C.varKindOf(male, {cls: 'A'}), 'ph', 'a sex or colour phase whatever the juvenile class');
  assert.strictEqual(C.varKindOf(juv, {cls: 'A'}), 'jE');
  assert.strictEqual(C.varKindOf(juv, {cls: 'B'}), 'jL');
  assert.strictEqual(C.varKindOf(juv, {cls: 'C'}), 'j');
  assert.strictEqual(C.varKindOf(juv, null), 'j', 'no classes (another subject, or a family with none): j');
  // A mixed family: a genus or a species named in early or late, the photo's taxon that name or under it.
  assert.strictEqual(C.varKindOf(juv, {cls: 'mixed', early: ['Dascyllus']}), 'jE');
  assert.strictEqual(C.varKindOf(juv, {cls: 'mixed', late: ['Dascyllus aruanus']}), 'jL');
  assert.strictEqual(C.varKindOf(juv, {cls: 'mixed', early: ['Dascyl']}), 'j', 'a name, never a prefix of one');
  assert.strictEqual(C.varKindOf({f: 't', t: 'Chromis viridis', jt: 'p1g1sm1j2'}, {cls: 'mixed', early: ['Dascyllus']}), 'j');
  assert.deepStrictEqual(C.VAR_KINDS, ['', 'jE', 'j', 'jL', 'ph']);
  assert.deepStrictEqual(C.VAR_KINDS.map(C.varGroup), ['', 'juv', 'juv', 'juv', 'ph']);
});

test('varRamp and the defaults (Q391): early juveniles from the start, the rest from Open Water, late ones at Advanced', () => {
  const at = C.VAR_AT;
  assert.deepStrictEqual(at, {jE: [0, 0], j: [0.5, 0.8], jL: [0.8, 0.8], ph: [0.5, 0.8]});
  assert.strictEqual(C.varRamp(0, at.jE), 1, 'an early-class juvenile from the unit’s first question');
  assert.strictEqual(C.varRamp(0.49, at.j), 0);
  assert.strictEqual(C.varRamp(0.5, at.j), 0);
  assert.ok(Math.abs(C.varRamp(0.65, at.j) - 0.5) < 1e-9);
  assert.strictEqual(C.varRamp(0.8, at.j), 1);
  assert.strictEqual(C.varRamp(0.79, at.jL), 0);
  assert.strictEqual(C.varRamp(0.8, at.jL), 1, 'a step at Advanced, before the exam opens at 0.85');
  assert.strictEqual(C.varRamp(0.95, at.ph), 1);
  for (let x = 0; x < 1; x += 0.01) assert.ok(C.varRamp(x + 0.01, at.ph) >= C.varRamp(x, at.ph), 'never goes down');
});

test('the card trigger: the first photo whose kind has no card yet, once per kind', () => {
  const adult = {f: 'a', sp: 's1'},
    juv = {f: 'j', sp: 's1', ph: 'juvenile'},
    male = {f: 'm', sp: 's1', ph: 'male', jt: 'p1g0sl1p4'},
    juvTag = {f: 't', sp: 's1', jt: 'p1g1sm1j2'};
  assert.strictEqual(C.phaseKind(adult), '');
  assert.strictEqual(C.phaseKind(juvTag), 'juvenile');
  assert.strictEqual(C.phaseKind(male), 'phase');
  assert.strictEqual(C.phaseKind({ph: 'intermediate', jt: 'p1g0sl1pr5'}), 'phase');
  // A male or a female judged on an entry not marked dimorph (no phase flag p): held back by the draw, but no card says
  // its sexes look different (rule C2).
  assert.strictEqual(C.phaseKind({ph: 'male', jt: 'p1g0sl14'}), '');
  assert.strictEqual(C.phaseKind({ph: 'female'}), '');
  const none = () => false;
  assert.strictEqual(C.phaseCardOf([adult], none), null);
  assert.deepStrictEqual(C.phaseCardOf([adult, juv], none), {p: juv, k: 'juvenile'});
  assert.deepStrictEqual(C.phaseCardOf([male], none), {p: male, k: 'phase'});
  // The juvenile card shown: a juvenile brings nothing more, a sex phase still brings its own.
  const seen = k => k === 'juvenile';
  assert.strictEqual(C.phaseCardOf([juvTag], seen), null);
  assert.deepStrictEqual(C.phaseCardOf([juv, male], seen), {p: male, k: 'phase'});
  assert.strictEqual(
    C.phaseCardOf([juv, male], () => true),
    null
  );
  assert.strictEqual(C.phaseCardOf([], none), null);
});

test('the card marks go with the account at sign-out (rule D7; Codex review #953)', () => {
  const fs = require('fs'),
    path = require('path'),
    rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  assert.ok(rd('quiz.js').includes("const PHASEC = {KEY: 'phase-'"), 'the key prefix sync.js clears');
  assert.ok(
    rd('sync.js').includes("...['juvenile', 'phase'].map(k => subjDev(S.id, 'phase-' + k))"),
    'sync.js signOutClear clears both kinds'
  );
});

test('the card pairs: a juvenile beside an adult of its species, a male beside a female, never another species', () => {
  const L = [
    {f: 'x', sp: 's2'},
    {f: 'fem', sp: 's1', ph: 'female'},
    {f: 'ad', sp: 's1'},
    {f: 'mal', sp: 's1', ph: 'male'},
    {f: 'juv', sp: 's1', ph: 'juvenile'}
  ];
  assert.strictEqual(C.phasePair(L[4], L).f, 'ad');
  assert.strictEqual(C.phasePair(L[3], L).f, 'fem');
  assert.strictEqual(C.phasePair(L[1], L).f, 'mal');
  assert.strictEqual(C.phasePair({f: 'int', sp: 's1', ph: 'intermediate'}, L).f, 'mal');
  // No adult judged: a juvenile is paired with a male, then a female; a species alone in the pool: no pair.
  const noAdult = L.filter(p => p.f !== 'ad');
  assert.strictEqual(C.phasePair(L[4], noAdult).f, 'mal');
  assert.strictEqual(C.phasePair({f: 'j2', sp: 's9', ph: 'juvenile'}, L), null);
  assert.strictEqual(C.phasePair(L[4], [L[4]]), null);
});

// A fish unit's pool: 40 observations with no phase (ease 4) and 40 variant photos at ease 5 with the reference look, so
// the draw would favour them (the hardest case for holding them back): juveniles of Xus a, males of Xus b. The cap
// under ease 4 (model.js RARE) plays no part: no photo is under it.
const pool = () => {
  const L = [];
  for (let i = 0; i < 40; i++) L.push({f: `a${i}`, o: `oa${i}`, e: 4, jt: 'p1g0sl14', t: 'Xus a'});
  for (let i = 0; i < 40; i++)
    L.push({f: `p${i}`, o: `op${i}`, e: 5, jt: 'p1g0sl15', ...(i % 2 ? {ph: 'juvenile', t: 'Xus a'} : {ph: 'male', t: 'Xus b'})});
  return L;
};
const kindOf = p => (C.phaseOf(p) === 'juvenile' ? 'juv' : C.phaseOf(p) ? 'ph' : '');
// The share of draws showing a juvenile and a sex or colour phase, in N draws.
const shares = (E, N = 600) => {
  const L = pool(),
    K = Object.fromEntries(L.map(p => [p.f, kindOf(p)])),
    n = {juv: 0, ph: 0};
  for (let i = 0; i < N; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => {
      if (K[x.f]) n[K[x.f]]++;
    });
  return {juv: n.juv / N, ph: n.ph / N};
};
const draws = (E, N = 200) => Array.from({length: N}, () => E.photoSet('u', null, 0, 4, 'k4').shown[0].f);

test('the ramp per class (Q391 a): on the unit’s own bar, the thresholds of its kind', () => {
  // Another juvenile (class C) and a sex phase: none before Open Water, some on the way, full from Advanced.
  const C0 = {cls: 'C'};
  for (const score of [0, 0.3, 0.5])
    assert.deepStrictEqual(shares(engine('fish', pool(), {score, juv: C0})), {juv: 0, ph: 0}, `at ${score}`);
  const mid = shares(engine('fish', pool(), {score: 0.65, juv: C0})),
    full = shares(engine('fish', pool(), {score: 0.8, juv: C0}));
  assert.ok(mid.juv > 0 && mid.ph > 0, `no wall: they come between Open Water and Advanced (${JSON.stringify(mid)})`);
  assert.ok(mid.juv < full.juv && mid.ph < full.ph, `in stages: ${JSON.stringify(mid)} then ${JSON.stringify(full)}`);
  // An early-class juvenile (class A, or its genus or species named early): from the unit's first question, at full
  // weight; the sexes still wait for Open Water.
  for (const juv of [{cls: 'A'}, {cls: 'mixed', early: ['Xus']}, {cls: 'mixed', early: ['Xus a']}]) {
    const s = shares(engine('fish', pool(), {score: 0, ok: 0, juv}));
    assert.ok(s.juv > 0.2, `early juveniles from the start: ${JSON.stringify(juv)} ${s.juv}`);
    assert.strictEqual(s.ph, 0);
  }
  // A late-class juvenile (class B, or named late): none until Advanced, then at full weight at once.
  for (const juv of [{cls: 'B'}, {cls: 'mixed', late: ['Xus a']}]) {
    assert.strictEqual(shares(engine('fish', pool(), {score: 0.79, juv})).juv, 0, `late juveniles wait: ${JSON.stringify(juv)}`);
    assert.ok(shares(engine('fish', pool(), {score: 0.8, juv})).juv > 0.2);
  }
});

test('every variant at full weight: the same draws as a pool with none judged', () => {
  const L = pool(),
    bare = L.map(p => ({...p, ph: undefined})),
    A = engine('fish', L, {score: 0.8, juv: {cls: 'C'}}),
    B = engine('fish', bare, {score: 0.8, juv: {cls: 'C'}});
  assert.deepStrictEqual(draws(A), draws(B));
});

test('a family’s own thresholds (fish.json varAt) win over the defaults, kind by kind', () => {
  const s = shares(engine('fish', pool(), {score: 0, juv: {cls: 'C'}, varAt: {ph: [0, 0]}}));
  assert.ok(s.ph > 0.2, `its sexes from the start: ${s.ph}`);
  assert.strictEqual(s.juv, 0, 'its juveniles keep the default');
});

test('never a wall: a unit with fewer than 3 observations at full weight draws its variant photos from the start', () => {
  const L = [
    {f: 'a0', o: 'a0', e: 4},
    {f: 'a1', o: 'a1', e: 4}
  ];
  for (let i = 0; i < 20; i++) L.push({f: `p${i}`, o: `p${i}`, e: 4, ph: 'juvenile'});
  const E = engine('fish', L, {ok: 0, score: 0});
  let ph = 0;
  for (let i = 0; i < 300; i++) ph += E.photoSet('u', null, 0, 4, 'k4').shown[0].f[0] === 'p' ? 1 : 0;
  assert.ok(ph > 150, `phase photos drawn ${ph} times in 300`);
});

test('a draw among some photos only (a Find the X, among its tiles): the count at full weight is the whole unit’s', () => {
  // The unit has many photos without a phase, but one tile only (as the Anthias): the tile drawn at the start is that
  // one; a unit whose whole pool has too few photos at full weight draws its variant tiles.
  const L = pool().map(p => ({...p, xc: C.phaseOf(p) ? 1 : 0}));
  L[0].xc = 1;
  const tile = p => !!p.xc,
    E = engine('fish', L, {ok: 0, score: 0});
  for (let i = 0; i < 200; i++) assert.strictEqual(E.photoSet('u', null, 0, 4, 'find', tile).shown[0].f, L[0].f);
  const few = L.filter(p => C.phaseOf(p) || p.f === 'a0' || p.f === 'a1'),
    F = engine('fish', few, {ok: 0, score: 0});
  let ph = 0;
  for (let i = 0; i < 200; i++) ph += C.phaseOf(few.find(p => p.f === F.photoSet('u', null, 0, 4, 'find', tile).shown[0].f)) ? 1 : 0;
  assert.ok(ph > 100, `phase tiles drawn ${ph} times in 200`);
});

test('an observation with an adult and a juvenile photo shows its adult one at the start', () => {
  const L = pool().slice(0, 40);
  L.push({f: 'mixA', o: 'mix', e: 5, jt: 'p1g0sl15'}, {f: 'mixJ', o: 'mix', e: 5, jt: 'p1g0sl1j5'});
  const E = engine('fish', L, {ok: 0, score: 0});
  let mix = 0;
  for (let i = 0; i < 600; i++) {
    const f = E.photoSet('u', null, 0, 4, 'k4').shown[0].f;
    assert.notStrictEqual(f, 'mixJ');
    mix += f === 'mixA' ? 1 : 0;
  }
  assert.ok(mix > 0, 'the observation still comes, with its adult photo');
});

test('the cap under ease 4 before Open Water still holds with the phase photos held back', () => {
  // Easy photos half phase (as the Anthias' and the Parrotfishes'), the rest under ease 4: holding the easy phase photos
  // back must not let the hard ones past the cap (model.js RARE, applied after).
  const L = [];
  // 24 easy, so the 12 adults among them fill the rotation's floor (model.js RARE.FEW) and ease 4 is the bar.
  for (let i = 0; i < 24; i++) L.push({f: `e${i}`, o: `e${i}`, e: 5, ...(i % 2 ? {ph: 'female'} : {})});
  for (let i = 0; i < 200; i++) L.push({f: `h${i}`, o: `h${i}`, e: 1 + (i % 3)});
  const E = engine('fish', L, {ok: 2, score: 0.3}),
    e = Object.fromEntries(L.map(p => [p.f, p.e]));
  let hard = 0,
    ph = 0;
  for (let i = 0; i < 1500; i++) {
    const f = E.photoSet('u', null, 0, 4, 'k4').shown[0].f;
    hard += e[f] < 4 ? 1 : 0;
    ph += f.startsWith('e') && Number(f.slice(1)) % 2 ? 1 : 0;
  }
  assert.ok(hard / 1500 <= E.RARE.SHARE + 0.03, `under ease 4: ${hard / 1500}`);
  assert.strictEqual(ph, 0);
});

test('one rule for every subject (rule S1): a coral pool, with no photo judged a variant, draws as before', () => {
  // No coral photo carries a phase: nothing is held back, at any level, and the exam asks no group.
  const L = pool().slice(0, 40),
    A = engine('coral', L, {score: 0}),
    B = engine('coral', L, {score: 0.9});
  assert.strictEqual(A.varOf('u', L).on, false);
  assert.strictEqual(B.varOf('u', L).on, false);
  assert.deepStrictEqual(A.varLeft('u'), []);
});

// "Learned" asks each variant group: while a group released by the unit's mastery has no right answer, the
// exam's next question draws its photo (the hardest never seen within it), and the exam is not passed; quiz.js answer's
// exam step (cut out here and run as the game runs it) restarts it at a miss.
const quiz = require('fs').readFileSync(require('path').join(__dirname, '..', 'quiz.js'), 'utf8');
const examStep = new Function(
  's, good, exq, tq, ph, EXAM, TYPED, tally, examPassed, target, unameT, achPop', // tally: model.js's answer clock
  require('./block.js')(quiz, '  if (!good) delete s.ex;\n', '    } else s.ex = ex;\n  }\n', {through: 1, file: 'quiz.js'})
);
const examPool = () => {
  const L = [];
  for (let i = 0; i < 12; i++) L.push({f: `a${i}`, o: `oa${i}`, e: 2 + (i % 3), t: 'Xus a'});
  for (let i = 0; i < 4; i++) L.push({f: `j${i}`, o: `oj${i}`, e: 1 + i, ph: 'juvenile', t: 'Xus a'});
  for (let i = 0; i < 4; i++) L.push({f: `m${i}`, o: `om${i}`, e: 1 + i, ph: 'male', t: 'Xus b'});
  return L;
};

test('varLeft: the groups released by the unit’s mastery with no right answer yet', () => {
  const L = examPool(),
    E = engine('fish', L, {score: 0.86, juv: {cls: 'C'}});
  assert.deepStrictEqual(E.varLeft('u'), ['juv', 'ph']);
  E.P.u.ps = {j2: [1, 0]}; // shown, answered wrong: still left
  assert.deepStrictEqual(E.varLeft('u'), ['juv', 'ph']);
  E.P.u.ps = {j2: [2, 1], m0: [1, 1]};
  assert.deepStrictEqual(E.varLeft('u'), []);
  // A group not released yet is not asked (a family's own later threshold); the late juveniles are released at Advanced.
  assert.deepStrictEqual(engine('fish', L, {score: 0.86, juv: {cls: 'C'}, varAt: {ph: [0.9, 0.9]}}).varLeft('u'), ['juv']);
  assert.deepStrictEqual(engine('fish', L, {score: 0.8, juv: {cls: 'B'}}).varLeft('u'), ['juv', 'ph']);
  // A unit with no variant: nothing.
  assert.deepStrictEqual(engine('fish', L.slice(0, 12), {score: 0.9}).varLeft('u'), []);
});

test('the exam asks an unseen variant group: its hardest photo never seen, the next group once it is right', () => {
  const L = examPool(),
    diff = Object.fromEntries(L.map(p => [p.f, -p.e])), // photoDiff stand-in below: the lower the ease, the harder
    E = engine('fish', L, {score: 0.86, juv: {cls: 'C'}, PSTAT: {}}),
    hardest = pre => L.filter(p => p.f.startsWith(pre)).sort((a, b) => diff[b.f] - diff[a.f])[0].f;
  for (let i = 0; i < 30; i++) assert.ok(E.examSet('u').shown[0].f.startsWith('j'), 'the juveniles first');
  assert.strictEqual(E.examSet('u').shown[0].f, hardest('j'), 'the hardest of the group');
  E.P.u.ps = {[hardest('j')]: [1, 0]}; // seen, missed: the hardest never seen next
  assert.ok(E.examSet('u').shown[0].f.startsWith('j'));
  assert.notStrictEqual(E.examSet('u').shown[0].f, hardest('j'));
  E.P.u.ps = {j0: [1, 1]};
  for (let i = 0; i < 30; i++) assert.ok(E.examSet('u').shown[0].f.startsWith('m'), 'then the sexes');
  // Both groups right: the hardest photo never seen of the whole unit (here an adult once m0 is seen).
  E.P.u.ps = {j0: [1, 1], m3: [1, 1], m0: [1, 0]};
  for (let i = 0; i < 30; i++) assert.strictEqual(E.examSet('u').shown[0].f, 'a0', 'then any photo, as before');
});

test('the exam is passed only with each variant group right; a miss restarts it', () => {
  const L = examPool(),
    E = engine('fish', L, {score: 0.86, juv: {cls: 'C'}}),
    s = E.P.u,
    step = (good, f, typed) => [s, good, true, typed, [{f, view: 'wide'}], E.EXAM, E.TYPED, () => 100, E.examPassed, 'u', x => x, () => {}],
    run = (good, f, typed = false) => {
      if (good) s.ps = {...(s.ps || {}), [f]: [1, 1]};
      examStep(...step(good, f, typed));
    };
  // Five right answers on adult photos, two typed: not passed, the variant groups left; the count held at EXAM.n.
  for (let i = 0; i < E.EXAM.n; i++) run(true, `a${i}`, i < E.TYPED.exam);
  assert.ok(!s.mx, 'not learned: its juveniles and its sexes not answered right');
  assert.strictEqual(s.ex.k, E.EXAM.n);
  run(true, 'j0');
  assert.ok(!s.mx, 'the sexes still left');
  // A miss restarts it, as any miss does.
  run(false, 'm0');
  assert.strictEqual(s.ex, undefined, 'the exam restarted');
  // A new exam: every group already answered right, so five right answers pass it.
  for (let i = 0; i < E.EXAM.n - 1; i++) run(true, `a${i}`, i < E.TYPED.exam);
  assert.ok(!s.mx, 'four of five');
  run(true, 'm1');
  assert.ok(s.mx, 'learned: five right, two typed, each group right');
  assert.strictEqual(s.ex, undefined);
});

// The sheet's replay decides from the answer log (rules D8, D9; fish rules version 3): core.js varUnit and varLeftOf are
// what model.js varLeft runs, and what the replay reads through the variant table (treeVarTable, replayProgress vars,
// replayedOf). App and sheet agree.
test('varUnit and varLeftOf: model.js varLeft runs them, its constants are the app’s', () => {
  const L = examPool(),
    E = engine('fish', L, {score: 0.86, juv: {cls: 'C'}});
  assert.strictEqual(C.VAR_FULL, E.PICKD.VARIETY);
  assert.deepStrictEqual(C.MX_EXAM, {n: E.EXAM.n, typed: E.TYPED.exam});
  const U = E.varUnitOf('u');
  assert.deepStrictEqual(U, C.varUnit(L, {cls: 'C'}));
  assert.strictEqual(U.n, 12);
  assert.deepStrictEqual(U.at, {j: C.VAR_AT.j, ph: C.VAR_AT.ph});
  [{}, {j2: [1, 0]}, {j2: [2, 1]}, {j2: [2, 1], m0: [1, 1]}].forEach(ps => {
    E.P.u.ps = ps;
    assert.deepStrictEqual(E.varLeft('u'), C.varLeftOf(U, 0.86, ps), JSON.stringify(ps));
  });
  // A mixed observation counts once; fewer than VAR_FULL at full weight: every group released (the fallback).
  const M = [
      {f: 'a', o: 'x'},
      {f: 'j', o: 'x', ph: 'juvenile'},
      {f: 'b', o: 'y'},
      {f: 'm', o: 'z', ph: 'male'}
    ],
    V = C.varUnit(M, null);
  assert.deepStrictEqual(V.v, [
    ['j', 'j', -1],
    ['m', 'ph', 0]
  ]);
  assert.deepStrictEqual(C.varLeftOf(V, 0.1, {}), ['juv', 'ph'], 'the fallback: nothing held back');
  assert.deepStrictEqual(engine('fish', M, {score: 0.1}).varLeft('u'), ['juv', 'ph']);
  assert.strictEqual(C.varUnit(L.slice(0, 12), null), null, 'no variant: nothing kept');
  assert.deepStrictEqual(C.varLeftOf(null, 1, {}), []);
});

test("the sheet's variant table is the app's: every unit's, and the groups left, from the same files", () => {
  const fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    json = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')),
    Fs = ['fish.json', 'fish-photos.json', 'fish-game.json', 'curation.json'].map(json),
    S = C.subjectOf('fish'),
    ctx = {
      DOM: {EX: 0.9},
      easyCover: C.easyCover,
      treeScoreTree: C.treeScoreTree,
      treeSpUnits: C.treeSpUnits,
      treeGenSets: C.treeGenSets,
      rankWeights: C.rankWeights
    };
  vm.createContext(ctx);
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInContext(
    require('./block.js')(app, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.treeGenera = treeGenera;',
    ctx
  );
  // The app's units (app.js treeBuild: treeGen over treePhotos, then treeGenera, then a player's reserve split out:
  // core.js reserveSplit), and the sheet's table from the same files, made without any reserve (the sheet never reads
  // one): its photos withheld from the views, the app's exam photos (views and held) are the sheet's.
  const cur = C.treeCur(S, Fs[3]),
    gm = C.treeGameRead(Fs[2]).photos,
    X = ctx.treeGenera(C.treeGen(Fs[0], C.treePhotos(Fs[1].photos, gm, cur), Fs[1].sheet, C.unitRankOf(S)), Fs[0]),
    held = C.reserveOf(X, 'player one'),
    T = S.replayed.vars(Fs[0], Fs, S),
    // the same table whatever the order its photos come in (the app's views, then its reserved photos)
    canon = U => U && {n: U.n, at: U.at, v: U.v.map(([f, k, i]) => [f, k, i < 0]).sort((a, b) => (a[0] < b[0] ? -1 : 1))};
  C.reserveSplit(X, held);
  assert.ok(held.size > 1000, 'a reserve is made: ' + held.size);
  let n = 0,
    nh = 0;
  Object.values(X.gen).forEach(g => {
    if (g.wink || g.noex) return; // a wink family is never asked; a species unit has no exam
    if (g.held) nh++;
    const home = g.rank ? X.gen[g.parent] : g,
      E = engine('fish', g.views.wide, {juv: home.juv || null, varAt: home.varAt || null, score: 1, held: g.held || null}),
      U = E.varUnitOf('u');
    assert.deepStrictEqual(canon(T[g.id] || null), canon(U), g.id);
    if (!U) return;
    n++;
    // The groups left at a learned unit's full bar, with no right answer, then one right per group: the same both ways.
    const one = G => U.v.find(x => C.varGroup(x[1]) === G);
    [{}, ...C.VAR_GROUPS.map(G => (one(G) ? {[one(G)[0]]: [1, 1]} : {}))].forEach(ps => {
      E.P.u.ps = ps;
      assert.deepStrictEqual(C.varLeftOf(T[g.id], 1, ps), E.varLeft('u'), g.id + ' ' + JSON.stringify(ps));
    });
  });
  assert.ok(n >= 50 && Object.keys(T).some(k => k.startsWith('g:')), 'families and genera with variants: ' + n);
  assert.ok(nh >= 50, 'units with held-out photos: ' + nh);
  assert.ok(JSON.stringify(T).length < 600000, 'kept in the script cache in parts (Code.gs cacheBigPut_)');
});

test('the replay takes a learned mark away when a variant group has no right answer in the log; the corals as before', () => {
  const L = examPool(),
    vars = {'f:X': C.varUnit(L, {cls: 'C'})},
    gen = {'f:X': {look: [], fam: 'X'}, 'f:Y': {look: [], fam: 'Y'}},
    t0 = Date.UTC(2026, 10, 10),
    row = (i, f, ok = 1) =>
      C.logRow(
        {
          id: 'a' + i,
          t: new Date(t0 + i * 1000).toISOString(),
          g: 'f:X',
          a: ok ? 'f:X' : 'f:Y',
          ok,
          m: 'quiz|c',
          ph: f,
          ch: 'f:X f:Y',
          e: 0.8,
          th: 1,
          sc: {d: 0, r: 1}
        },
        'p'
      ),
    mx = t0 + 60000,
    saved = {'f:X': {ok: 5, ko: 0, h: '11111', ds: 1, dp: [1, 1], mx}},
    adopt = (rows, o) => C.replayAdopted(C.replayProgress(rows, {gen, ...o}).p.P, saved, 3)['f:X'];
  const adults = [0, 1, 2, 3].map(i => row(i, `a${i}`));
  // Only adults right in the log: both groups left, the mark goes, its exam kept as passed but for them.
  const A = adopt(adults, {vars});
  assert.ok(!A.mx);
  assert.deepStrictEqual(A.ex, {k: C.MX_EXAM.n, t: C.MX_EXAM.typed, v: [], ts: mx, at: 0});
  // A juvenile right, a male answered wrong: the sexes still left.
  assert.ok(!adopt([...adults, row(4, 'j1'), row(5, 'm2', 0)], {vars}).mx);
  // Each group right in the log: the mark stays.
  assert.strictEqual(adopt([...adults, row(4, 'j1'), row(5, 'm2')], {vars}).mx, mx);
  // No table (the corals; this device's answers on top of the sheet's replay): the mark kept.
  assert.strictEqual(adopt(adults, {}).mx, mx);
  // The sheet's replay carried on this device: its vl kept from the record it starts from.
  const rec = C.replayProgress(adults, {gen, vars}).p.P;
  assert.deepStrictEqual(rec['f:X'].vl, ['juv', 'ph']);
  const on = C.replayProgress([row(9, 'a5')], {gen, start: {p: {P: rec, n: 0, used: 0, rep: 0}}}).p.P;
  assert.deepStrictEqual(on['f:X'].vl, ['juv', 'ph']);
  // The record adopted keeps the log's groups left (vl), which the exam reads; none once each group is right in the log.
  assert.deepStrictEqual(A.vl, ['juv', 'ph']);
  assert.ok(!('vl' in adopt([...adults, row(4, 'j1'), row(5, 'm2')], {vars})));
});

// A right answer on a variant photo in the saved copy but not in the log (played before the fish
// answers were logged) comes back into the adopted record's photos seen (replayedOf merges ps); the exam reads the log's
// groups (vl) over it, so the mark comes back only once that group is answered right here, as the sheet decides.
test('a right variant answer the log lacks does not bring the mark back: the exam asks the group the log left', () => {
  const L = examPool(),
    vars = {'f:X': C.varUnit(L, {cls: 'C'})},
    gen = {'f:X': {look: [], fam: 'X'}, 'f:Y': {look: [], fam: 'Y'}},
    t0 = Date.UTC(2026, 10, 10),
    row = (i, f) =>
      C.logRow(
        {
          id: 'a' + i,
          t: new Date(t0 + i * 1000).toISOString(),
          g: 'f:X',
          a: 'f:X',
          ok: 1,
          m: 'quiz|c',
          ph: f,
          ch: 'f:X f:Y',
          e: 0.8,
          th: 1,
          sc: {d: 0, r: 1}
        },
        'p'
      ),
    mx = t0 + 60000,
    // The saved copy: learned, with a juvenile and a male answered right that the log does not hold.
    saved = {'f:X': {ok: 5, ko: 0, h: '11111', ds: 1, dp: [1, 1], mx, ps: {j1: [1, 1], m2: [1, 1]}}},
    rec = C.replayProgress(
      [0, 1, 2, 3].map(i => row(i, `a${i}`)),
      {gen, vars}
    ).p.P,
    A = C.replayAdopted(rec, saved, 3)['f:X'];
  assert.ok(!A.mx, 'the mark goes');
  assert.deepStrictEqual(
    [A.ps.j1, A.ps.m2],
    [
      [1, 1],
      [1, 1]
    ],
    'the saved exposure kept'
  );
  assert.deepStrictEqual(A.vl, ['juv', 'ph']);
  // The app's exam on that record: both groups left, a juvenile asked first, not passed.
  const E = engine('fish', L, {score: 1, juv: {cls: 'C'}}),
    one = f => L.find(p => p.f === f);
  E.P.u = JSON.parse(JSON.stringify(A));
  assert.deepStrictEqual(E.varLeft('u'), ['juv', 'ph']);
  assert.ok(!E.examPassed('u', E.P.u.ex));
  for (let i = 0; i < 20; i++) assert.ok(E.examSet('u').shown[0].f.startsWith('j'), 'the juveniles asked');
  // A right answer on an adult clears nothing; on a juvenile, its group; on a male, the last: passed.
  E.varRight('u', [one('a0')]);
  assert.deepStrictEqual(E.P.u.vl, ['juv', 'ph']);
  E.varRight('u', [one('j0')]);
  assert.deepStrictEqual(E.varLeft('u'), ['ph']);
  assert.ok(!E.examPassed('u', E.P.u.ex));
  for (let i = 0; i < 20; i++) assert.ok(E.examSet('u').shown[0].f.startsWith('m'), 'then the sexes');
  E.varRight('u', [one('m0')]);
  assert.ok(!('vl' in E.P.u));
  assert.deepStrictEqual(E.varLeft('u'), []);
  assert.ok(E.examPassed('u', E.P.u.ex), 'learned again');
  // The sheet decides alike once those answers reach the log: no group left, the mark kept.
  const rec2 = C.replayProgress([0, 1, 2, 3].map(i => row(i, `a${i}`)).concat([row(4, 'j0'), row(5, 'm0')]), {gen, vars}).p.P;
  assert.ok(!('vl' in rec2['f:X']));
  assert.strictEqual(C.replayAdopted(rec2, saved, 3)['f:X'].mx, mx);
  // Between devices (core.js mergeProgress): this device's cleared groups win when it answered since the baseline.
  const B = {'f:X': {...A}},
    mine = {'f:X': {...E.P.u, ok: A.ok + 2, h: A.h + '11'}},
    M = C.mergeProgress(B, mine, B)['f:X'];
  assert.ok(!('vl' in M));
  assert.deepStrictEqual(C.mergeProgress(B, B, {'f:X': {...A, ok: A.ok + 1, h: A.h + '1'}})['f:X'].vl, ['juv', 'ph']);
  // quiz.js answer clears them at a right answer, before the exam step reads them.
  const quizSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'quiz.js'), 'utf8');
  assert.ok(quizSrc.indexOf('if (good) varRight(target, seenPh);') < quizSrc.indexOf('if (examPassed(target, ex))'));
  assert.ok(quizSrc.indexOf('if (good) varRight(target, seenPh);') > quizSrc.indexOf('const res = scoreAnswer(P, q)'));
});

// The sex or colour phase card (quiz.js phaseShow) names the source of its lines: the one the content editor gave with
// an edit of them (app.js treeGenera psrc), else IMR's. The juvenile card has none (tests/fishjuvdiff.test.js).
test('the phase card shows its lines under their recorded source, else IMR', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'quiz.js'), 'utf8'),
    fn = require('./block.js')(src, 'const phaseSrcs = ', '\n}\n', {through: 1, file: 'quiz.js'}),
    p0 = {f: 'm', ph: 'male'},
    T = {title: ''},
    show = (g, sps = {}, p = p0) => {
      let body = '';
      const stubs = {
        TREEU: {sps},
        safeUrl: u => u,
        GX: () => g,
        phasePair: () => null,
        phasePool: () => [],
        gamePhotoOk: () => true,
        photoTaxon: () => null,
        taxonLine: () => '',
        phaseOf: x => x.ph || '',
        phaseWord: x => x.ph || 'Adult',
        img: x => x.f,
        esc: x => String(x).replace(/</g, '&lt;'),
        credit: () => 'c',
        cardShow: o => ((body = o.body), (T.title = o.title), {querySelectorAll: () => []}),
        setTimeout: () => {},
        TIP: {WAIT: 0}
      };
      new Function(...Object.keys(stubs), fn + '\nreturn phaseShow;')(...Object.values(stubs))({p, k: 'phase'}, 'u');
      return body;
    };
  assert.match(show({phase: ['Juveniles yellow']}), /<p class="phlines"><b>IMR<\/b>: Juveniles yellow<\/p>/);
  assert.match(
    show({phase: ['An edited line'], psrc: {t: 'Randall 2005 <p. 3>'}}),
    /<p class="phlines"><b>Randall 2005 &lt;p. 3><\/b>: An edited line<\/p>/
  );
  assert.ok(!/phlines/.test(show({phase: []})), 'no line: no source');
  // A species the cited phase list flags (fish.json species phs; docs/decisions/2026-11-21-fish-phase-flag-from-cited-
  // list.md): the card names the list's sources (rule C2), keeps the IMR lines on sexes or phases only, and its title
  // follows the list's kind.
  const sex = {s1: {phs: {k: 'sex', src: [{t: 'Reef Life Survey', u: 'https://rls.example/s1'}, {t: 'FishBase'}]}}},
    q = {f: 'm', ph: 'male', sp: 's1'},
    a = show({phase: ['Juveniles look very different from adults']}, sex, q);
  assert.match(
    a,
    /<p class="phlines phsrc">Sources: <a href="https:\/\/rls.example\/s1" target="_blank" rel="noopener">Reef Life Survey<\/a>, FishBase<\/p>/
  );
  assert.ok(!/IMR/.test(a), 'an IMR line on juveniles is not the sex card’s');
  assert.match(T.title, /males and females/);
  const b = show({phase: ['Males and females differ in colour']}, sex, q);
  assert.match(b, /<b>IMR<\/b>: Males and females differ in colour<\/p><p class="phlines phsrc">Sources: /);
  const ip = show({phase: []}, {s1: {phs: {k: 'phase', src: [{t: 'Fishes of Australia'}]}}}, q);
  assert.match(ip, /<p class="phlines phsrc">Source: Fishes of Australia<\/p>/);
  assert.match(T.title, /colour phases can look very different/, 'initial and terminal phases only: not "males and females"');
  show({phase: []}, {}, q);
  assert.match(T.title, /males and females/, 'no list entry: as before');
});

// This device's answers replayed on top of the sheet's (sync.js replayAdoptS) recompute the variant groups left with the
// table when the replay's rules version reads it (core.js rvVars): a queued right answer on the last
// group keeps the learned mark; without the table the sheet's vl stays as it came.
test('a queued right answer on the last variant group keeps the mark when this device adopts the replay', () => {
  assert.strictEqual(C.rvVars('fish', 2), false);
  assert.strictEqual(C.rvVars('fish', 3), true);
  assert.strictEqual(C.rvVars('coral', 99), false);
  const L = examPool(),
    vars = {'f:X': C.varUnit(L, {cls: 'C'})},
    gen = {'f:X': {look: [], fam: 'X'}, 'f:Y': {look: [], fam: 'Y'}},
    t0 = Date.UTC(2026, 10, 10),
    row = (i, f, who) =>
      C.logRow(
        {
          id: 'a' + i,
          t: new Date(t0 + i * 1000).toISOString(),
          g: 'f:X',
          a: 'f:X',
          ok: 1,
          m: 'quiz|c',
          ph: f,
          ch: 'f:X f:Y',
          e: 0.8,
          th: 1,
          sc: {d: 0, r: 1}
        },
        who
      ),
    mx = t0 + 60000,
    saved = {'f:X': {ok: 5, ko: 0, h: '11111', ds: 1, dp: [1, 1], mx}},
    // The sheet's replay: adults only, both groups left.
    rec = C.replayProgress(
      [0, 1, 2, 3].map(i => row(i, `a${i}`, 'p')),
      {gen, vars}
    ).p.P,
    queued = [row(4, 'j1', '~me'), row(5, 'm2', '~me')],
    onTop = o => C.replayProgress(queued, {gen, start: {'~me': {P: rec, n: 0, used: 0, rep: 0}}, ...o})['~me'].P;
  assert.deepStrictEqual(rec['f:X'].vl, ['juv', 'ph']);
  assert.ok(!('vl' in onTop({vars})['f:X']));
  assert.strictEqual(C.replayAdopted(onTop({vars}), saved, 3)['f:X'].mx, mx);
  assert.ok(!C.replayAdopted(onTop({}), saved, 3)['f:X'].mx, 'without the table, the sheet’s vl as it came');
  // sync.js replayAdoptS passes the table (rpVars: app.js UNITS vars) under such a version, and waits without it
  // (tests/fishadopt.test.js runs it).
  const sync = require('fs').readFileSync(require('path').join(__dirname, '..', 'sync.js'), 'utf8');
  assert.match(sync, /vt = rows\.length && rvVars\(S\.id, rp\.rv\) \? rpVars\(S\) : null,/);
  assert.match(sync, /vars: vt \|\| undefined/);
  assert.match(sync, /if \(rows\.length && rvVars\(S\.id, rp\.rv\) && !vt\) return false;/);
});

// Without fish-game.json the units play on their first photos (app.js treeLoad), and a variant table
// made from them lacks variant photos (the morays: their sexes only, not their juveniles), so a queued right answer on a
// male would clear the juveniles the sheet left. app.js UNITS fish vars gives no table until the whole game pool is in.
test('the variant table waits for the whole game pool: a partial one would clear a group the sheet left', () => {
  const fs = require('fs'),
    path = require('path'),
    json = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')),
    Fs = ['fish.json', 'fish-photos.json', 'fish-game.json', 'curation.json'].map(json),
    S = C.subjectOf('fish'),
    full = S.replayed.vars(Fs[0], Fs, S),
    part = S.replayed.vars(Fs[0], [Fs[0], Fs[1], {photos: {}}, Fs[3]], S),
    groups = U => [...new Set(U.v.map(x => C.varGroup(x[1])))].sort();
  assert.deepStrictEqual(groups(full['f:Morays']), ['juv', 'ph']);
  assert.deepStrictEqual(groups(part['f:Morays']), ['ph'], 'the first photos alone: no juvenile');
  const male = part['f:Morays'].v.find(x => x[1] === 'ph')[0],
    gen = C.treeReplayGen(Fs[0]),
    t0 = Date.UTC(2026, 10, 10),
    row = (i, f, who) =>
      C.logRow(
        {
          id: 'a' + i,
          t: new Date(t0 + i * 1000).toISOString(),
          g: 'f:Morays',
          a: 'f:Morays',
          ok: 1,
          m: 'quiz|c',
          ph: f,
          ch: '',
          e: 0.8,
          th: 1,
          sc: {d: 0, r: 1}
        },
        who
      ),
    rec = C.replayProgress([row(0, 'an-adult', 'p')], {gen, vars: full}).p.P,
    onTop = vars => C.replayProgress([row(1, male, '~me')], {gen, start: {'~me': {P: rec, n: 0, used: 0, rep: 0}}, vars})['~me'].P;
  assert.deepStrictEqual(rec['f:Morays'].vl, ['juv', 'ph']);
  assert.deepStrictEqual(onTop(full)['f:Morays'].vl, ['juv'], 'the whole table: the juveniles still left');
  assert.ok(!('vl' in onTop(part)['f:Morays']), 'a partial table would clear them');
  // The hook: null until fish-game.json is in (TREERAW game, app.js treeLoad).
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'),
    hook = require('./block.js')(app, '    vars: S =>\n', '        : null,\n', {through: 1, file: 'app.js'}).trim().replace(/,$/, ''),
    vars = TREERAW => new Function('TREERAW', 'TREEF', 'CUR', `return {${hook}};`)(TREERAW, null, Fs[3]).vars(S);
  assert.match(app, /full: true, game: !!\(gm && gm\.photos\)/);
  assert.strictEqual(vars({f: Fs[0], ph: Fs[1], gm: {photos: {}}, full: true, game: false}), null);
  assert.deepStrictEqual(
    Object.keys(vars({f: Fs[0], ph: Fs[1], gm: C.treeGameRead(Fs[2]), full: true, game: true})).sort(),
    Object.keys(full).sort()
  );
});

// Two devices on one account, each clearing a variant group the log left (core.js mergeProgress): the
// groups left after the merge are those neither device has answered right since the shared replay.
test('two devices each clearing a variant group: the merge leaves neither', () => {
  const b = {ok: 4, ko: 0, h: '1111', rv: 3, vl: ['juv', 'ph'], ps: {a0: [4, 4]}},
    one = {...b, ok: 5, h: '11111', vl: ['ph'], ps: {a0: [4, 4], j0: [1, 1]}},
    two = {...b, ok: 5, h: '11111', vl: ['juv'], ps: {a0: [4, 4], m0: [1, 1]}},
    M = C.mergeProgress({u: b}, {u: one}, {u: two}).u;
  assert.deepStrictEqual(M.ps, {a0: [4, 4], j0: [1, 1], m0: [1, 1]});
  assert.ok(!('vl' in M), 'each group answered right on one device');
  assert.ok(!('vl' in C.mergeProgress({u: b}, {u: two}, {u: one}).u), 'either way round');
  // One device cleared a group, the other answered an adult: the other group still left.
  const adult = {...b, ok: 5, h: '11111', ps: {a0: [5, 5]}};
  assert.deepStrictEqual(C.mergeProgress({u: b}, {u: adult}, {u: one}).u.vl, ['ph']);
  assert.deepStrictEqual(C.mergeProgress({u: b}, {u: one}, {u: adult}).u.vl, ['ph']);
  // A side that never held that replay (another rules version, no vl) clears nothing.
  const old = {ok: 5, ko: 0, h: '11111', rv: 2, ps: {a0: [5, 5]}};
  assert.deepStrictEqual(C.mergeProgress({u: b}, {u: b}, {u: old}).u.vl || null, null, 'its own record taken whole');
  assert.deepStrictEqual(C.mergeProgress({u: b}, {u: {...b, ok: 6, h: '111111'}}, {u: old}).u.vl, ['juv', 'ph']);
});
