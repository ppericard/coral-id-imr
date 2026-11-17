require('./slot.js').testGuard();
// Juveniles and colour phases on their unit's mastery (Pierre, 2026-11-07: never at the very start of a unit, then in
// stages, with the card that explains them; no wall, 2026-11-06; 2026-11-17, Q391 a: one rule for every level, the
// variants on a ramp of their own unit's mastery; Q391 b: "Learned" asks each variant group): core.js phaseOf,
// varKindOf, varRamp, VAR_AT, phaseKind, phaseCardOf, phasePair, and model.js photoSet, varLeft, examSet, examPassed run
// in Node on fish-like pools (tests/rareease.js). docs/LEARNING.md "Juveniles and colour phases on their unit's mastery".
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
  for (let i = 0; i < 12; i++) L.push({f: `e${i}`, o: `e${i}`, e: 5, ...(i % 2 ? {ph: 'female'} : {})});
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

// "Learned" asks each variant group (Q391 b): while a group released by the unit's mastery has no right answer, the
// exam's next question draws its photo (the hardest never seen within it), and the exam is not passed; quiz.js answer's
// exam step (cut out here and run as the game runs it) restarts it at a miss, as before.
const quiz = require('fs').readFileSync(require('path').join(__dirname, '..', 'quiz.js'), 'utf8');
const examStep = new Function(
  's, good, exq, tq, ph, EXAM, TYPED, answersSoFar, examPassed, target, unameT, achPop',
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
  // Both groups right: the hardest photo never seen of the whole unit, as before (here an adult once m0 is seen).
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
