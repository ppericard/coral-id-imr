// The fish units page (admin plan PR 6, admin.js renderUnitSp): an IMR entry's species as sections, its choices in
// curation.json fish genera (autosort.js fishPick, fishFeat, fishCover, fishOk, fishDrop), the photo order (fishOrder:
// never by who took them), what an entry still needs before ✓ Validated (fishNeeds, fishEntryPhases), and the photo
// actions it shares with the fish Candidates (fishOn, fishReject, fishExclude, fishNotThis).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const A = require('../autosort.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));

test('fishOrder: featured first in his order, then reference photos, then the easiest; never Pierre’s own first', () => {
  const L = [
    {f: 'a', own: true}, // Pierre's own, ease 2: no boost
    {f: 'b'}, // ease 5
    {f: 'c', rep: 1}, // a reference photo, ease 3
    {f: 'd'}, // ease 4, featured second
    {f: 'e'} // ease 4, featured first
  ];
  const F = {ease: {a: 2, b: 5, c: 3, d: 4}, genera: {t1: {feat: {s1: ['e', 'd', 'gone']}}}},
    j = f => (f === 'e' ? {e: 4} : null),
    r = A.fishOrder(L, F, 't1', 's1', j);
  assert.deepStrictEqual(
    r.feat.map(p => p.f),
    ['e', 'd'],
    'a featured photo no longer in play is left out'
  );
  assert.deepStrictEqual(
    r.rest.map(p => p.f),
    ['c', 'b', 'a']
  );
  // The reference flag of the rubric code (r) counts as a reference photo too.
  const r2 = A.fishOrder([{f: 'x'}, {f: 'y'}], {ease: {x: 5, y: 1}, tags: {y: 'p1g0sm1r'}}, 't1', 's1');
  assert.deepStrictEqual(
    r2.rest.map(p => p.f),
    ['y', 'x']
  );
});

test('fishFeat, fishCover, fishOk: one click each, in fish genera; empties left out; coral keys never touched', () => {
  let F = {add: {a: 's1'}};
  F = A.fishFeat(F, 't1', 's1', 'a').F;
  assert.deepStrictEqual(F.genera, {t1: {feat: {s1: ['a']}}});
  ['b', 'c'].forEach(f => (F = A.fishFeat(F, 't1', 's1', f).F));
  const r = A.fishFeat(F, 't1', 's1', 'd');
  assert.strictEqual(r.full, true, `at ${A.FISHFEAT} featured, a fourth waits`);
  assert.strictEqual(r.F, F);
  F = A.fishFeat(F, 't1', 's1', 'b').F;
  assert.deepStrictEqual(F.genera.t1.feat.s1, ['a', 'c']);
  F = A.fishCover(F, 't1', 'c');
  assert.strictEqual(F.genera.t1.cover, 'c');
  F = A.fishOk(F, 't1');
  assert.strictEqual(F.genera.t1.ok, true);
  // A photo leaving play leaves the featured photos and the cover too.
  F = A.fishDrop(F, 't1', 'c');
  assert.deepStrictEqual(F.genera.t1, {feat: {s1: ['a']}, ok: true});
  F = A.fishOk(A.fishDrop(F, 't1', 'a'), 't1');
  assert.deepStrictEqual(F.genera, {}, 'an emptied entry goes');
  assert.deepStrictEqual(F.add, {a: 's1'});
  F = A.fishCover(A.fishCover(F, 't2', 'z'), 't2', 'z');
  assert.deepStrictEqual(F.genera, {}, 'a second click on the cover takes his pick off');
});

test('Remove, ×, Not this on a photo in play (the fish Candidates’ convention)', () => {
  const F = {add: {a: 's1', b: 's1', c: 's1'}, seen: {}};
  assert.ok(A.fishOn(F, 'a', 's1'));
  const R = A.fishReject(F, 'a');
  assert.ok(!A.fishOn(R, 'a', 's1') && R.seen.a === 1 && !('a' in R.add));
  const X = A.fishExclude(F, 'b');
  assert.ok(!A.fishOn(X, 'b', 's1') && X.exclude.b === 'excluded');
  const N = A.fishNotThis(F, 'c', 's2', 's1');
  assert.ok(!A.fishOn(N, 'c', 's1') && N.out.c === 's2' && !('c' in N.add), 'its candidate in s2 now, not in play');
  assert.deepStrictEqual(A.fishState(N, 'c', 's1'), {sid: 's2', st: null});
  assert.deepStrictEqual(A.fishState(A.fishNotThis(F, 'c', 'x', 's1'), 'c', 's1').st, 'gone');
  assert.ok(!('c' in A.fishNotThis(N, 'c', 's1', 's1').out), 'put back: the mark goes');
  assert.deepStrictEqual(F, {add: {a: 's1', b: 's1', c: 's1'}, seen: {}}, 'pure: the draft is never changed in place');
});

test('fishEntryPhases: the IMR phases of the real entries (fish.json teach phase, dimorph)', () => {
  const T = Object.fromEntries(read('fish.json').teach.map(t => [t.name, t]));
  assert.deepStrictEqual(A.fishEntryPhases(T.Parrotfish), ['intermediate', 'male', 'female']);
  assert.deepStrictEqual(A.fishEntryPhases(T.Anthias), ['male', 'female']);
  assert.deepStrictEqual(A.fishEntryPhases(T.Angelfish), ['juvenile']);
  assert.deepStrictEqual(A.fishEntryPhases(T.Sweetlips), ['juvenile', 'intermediate']);
  assert.deepStrictEqual(A.fishEntryPhases(T.Damselfish), []);
});

test('fishNeeds: each species up to its target, 5 easy photos, every IMR phase, else nothing', () => {
  const sp = {s1: {}, s2: {cs: 1}, s3: {out: 1}},
    t = {species: ['s1', 's2', 's3'], phase: ['Juveniles look very different from adults']},
    obs = (sid, n, o = {}) => Array.from({length: n}, (_, i) => ({f: `${sid}-${i}`, o: `${sid}-o${i}`, ...o}));
  assert.deepStrictEqual(A.fishNeeds(t, {}, sp, {}), ['No photo in play', '2 species under target', 'Easy 0/5', 'No juvenile']);
  const play = {s1: obs('s1', 8), s2: obs('s2', 11)},
    F = {ease: Object.fromEntries(play.s1.map(p => [p.f, 4]))};
  assert.deepStrictEqual(A.fishNeeds(t, play, sp, F), ['1 species under target', 'No juvenile'], 'the cheatsheet species needs 12');
  play.s2.push({f: 's2-j', o: 's2-oj'});
  F.tags = {'s2-j': 'p1g0sm1j'};
  assert.deepStrictEqual(A.fishNeeds(t, play, sp, F), [], 'a juvenile tag shows the phase; the species out of the game is not counted');
  // Two photos of one observation count once.
  const p2 = {s1: [...obs('s1', 7), {f: 's1-dup', o: 's1-o0'}], s2: play.s2};
  assert.deepStrictEqual(A.fishNeeds(t, p2, sp, F), ['1 species under target']);
});
