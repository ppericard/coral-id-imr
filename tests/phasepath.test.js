// Juveniles and colour phases in stages (Pierre, 2026-11-07: never at the very start of a unit, then in stages, with the
// card that explains them; no wall, 2026-11-06): core.js phaseOf, phaseStage, phaseKind, phaseCardOf, phasePair, and
// model.js photoSet run in Node on fish-like pools (tests/rareease.js). docs/LEARNING.md "Juveniles and colour phases in
// stages".
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

test('phaseStage: none in the first N answers, then a step at each answer, full from answer 2N; off with N 0', () => {
  for (let m = 0; m < 10; m++) assert.strictEqual(C.phaseStage(10, m), 0, `answer ${m}`);
  assert.strictEqual(C.phaseStage(10, 10), 0.1);
  assert.strictEqual(C.phaseStage(10, 14), 0.5);
  assert.strictEqual(C.phaseStage(10, 19), 1);
  assert.strictEqual(C.phaseStage(10, 500), 1);
  for (let m = 0; m < 25; m++) assert.ok(C.phaseStage(10, m + 1) >= C.phaseStage(10, m), 'never goes down');
  [0, undefined, null].forEach(N => assert.strictEqual(C.phaseStage(N, 0), 1));
});

test('the calibration: the corals hold nothing back, the fish 10 answers', () => {
  assert.strictEqual(C.CALIB.phase, 0);
  assert.strictEqual(C.calibOf(C.subjectOf('coral')).phase, 0);
  assert.strictEqual(C.calibOf(C.subjectOf('fish')).phase, 10);
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

// A fish unit's pool: 40 observations with no phase (ease 4) and 40 phase photos at ease 5 with the reference look, so
// the draw would favour them (the hardest case for holding them back); past Open Water (score 0.9), so the cap under
// ease 4 (model.js RARE) plays no part.
const pool = () => {
  const L = [];
  for (let i = 0; i < 40; i++) L.push({f: `a${i}`, o: `oa${i}`, e: 4, jt: 'p1g0sl14'});
  for (let i = 0; i < 40; i++) L.push({f: `p${i}`, o: `op${i}`, e: 5, jt: 'p1g0sl15', ph: i % 2 ? 'juvenile' : 'male'});
  return L;
};
const isPh = new Set(
  pool()
    .filter(p => C.phaseOf(p))
    .map(p => p.f)
);
const phShare = (E, N = 600) => {
  let ph = 0;
  for (let i = 0; i < N; i++) ph += E.photoSet('u', null, 0, 4, 'k4').shown.filter(x => isPh.has(x.f)).length;
  return ph / N;
};

test('the draw: no phase photo in a unit’s first 10 answers, then in stages, then as if none were held back', () => {
  const L = pool();
  for (const ok of [0, 3, 9]) assert.strictEqual(phShare(engine('fish', L, {ok, score: 0.9})), 0, `after ${ok} answers`);
  const s10 = phShare(engine('fish', L, {ok: 10, score: 0.9})),
    s15 = phShare(engine('fish', L, {ok: 15, score: 0.9})),
    s19 = phShare(engine('fish', L, {ok: 19, score: 0.9})),
    off = phShare(engine('fish', L, {ok: 19, score: 0.9, calib: {phase: 0}}));
  assert.ok(s10 > 0, `no wall: they come from answer 10 (${s10})`);
  assert.ok(s10 < s15 && s15 < s19, `in stages: ${s10}, ${s15}, ${s19}`);
  // At answer 10 a phase photo weighs a tenth (core.js phaseStage): the odds of drawing one about a tenth of the full
  // weight's (measured 0.13; the variety's lift of the other observations moves it a little).
  const odds = x => x / (1 - x);
  assert.ok(odds(s10) < 2 * 0.1 * odds(off), `the first stage well under the full weight: ${s10} against ${off}`);
  assert.strictEqual(s19, off, 'full weight from answer 19: the same draws as with nothing held back');
});

test('off (calib phase 0): the draws are the same as on a pool with no phase judged', () => {
  const L = pool(),
    bare = L.map(p => ({...p, jt: p.jt.replace('j', ''), ph: undefined})),
    A = engine('fish', L, {ok: 0, score: 0.3, calib: {phase: 0}}),
    B = engine('fish', bare, {ok: 0, score: 0.3, calib: {phase: 0}});
  for (let i = 0; i < 200; i++)
    assert.strictEqual(A.photoSet('u', null, 0, 4, 'k4').shown[0].f, B.photoSet('u', null, 0, 4, 'k4').shown[0].f);
});

test('never a wall: a unit with fewer than 3 observations without a phase draws its phase photos from the start', () => {
  const L = [
    {f: 'a0', o: 'a0', e: 4},
    {f: 'a1', o: 'a1', e: 4}
  ];
  for (let i = 0; i < 20; i++) L.push({f: `p${i}`, o: `p${i}`, e: 4, ph: 'juvenile'});
  const E = engine('fish', L, {ok: 0, score: 0.9});
  let ph = 0;
  for (let i = 0; i < 300; i++) ph += E.photoSet('u', null, 0, 4, 'k4').shown[0].f[0] === 'p' ? 1 : 0;
  assert.ok(ph > 150, `phase photos drawn ${ph} times in 300`);
});

test('a draw among some photos only (a Find the X, among its tiles): the count without a phase is the whole unit’s', () => {
  // The unit has many photos without a phase, but one tile only (as the Anthias): the tile drawn at the start is that
  // one; a unit whose whole pool has too few photos without a phase draws its phase tiles.
  const L = pool().map(p => ({...p, xc: C.phaseOf(p) ? 1 : 0}));
  L[0].xc = 1;
  const tile = p => !!p.xc,
    E = engine('fish', L, {ok: 0, score: 0.9});
  for (let i = 0; i < 200; i++) assert.strictEqual(E.photoSet('u', null, 0, 4, 'find', tile).shown[0].f, L[0].f);
  const few = L.filter(p => C.phaseOf(p) || p.f === 'a0' || p.f === 'a1'),
    F = engine('fish', few, {ok: 0, score: 0.9});
  let ph = 0;
  for (let i = 0; i < 200; i++) ph += C.phaseOf(few.find(p => p.f === F.photoSet('u', null, 0, 4, 'find', tile).shown[0].f)) ? 1 : 0;
  assert.ok(ph > 100, `phase tiles drawn ${ph} times in 200`);
});

test('an observation with an adult and a juvenile photo shows its adult one at the start', () => {
  const L = pool().slice(0, 40);
  L.push({f: 'mixA', o: 'mix', e: 5, jt: 'p1g0sl15'}, {f: 'mixJ', o: 'mix', e: 5, jt: 'p1g0sl1j5'});
  const E = engine('fish', L, {ok: 0, score: 0.9});
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

test('the corals: a photo tagged with a phase is never held back (their calibration holds nothing)', () => {
  const L = pool(),
    A = engine('coral', L, {ok: 0, score: 0.9}),
    B = engine('coral', L, {ok: 0, score: 0.9, calib: {phase: 0}});
  for (let i = 0; i < 100; i++)
    assert.strictEqual(A.photoSet('u', null, 0, 4, 'k4').shown[0].f, B.photoSet('u', null, 0, 4, 'k4').shown[0].f);
});
