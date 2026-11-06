// The fish units page (admin plan PR 6 on the book's families, admin.js renderFishUnits): the families, genera and species
// as the admin reads them from fish.json (autosort.js fishUnits), a family's choices in curation.json fish genera keyed by
// family id (fishPick, fishFeat, fishCover, fishOk, fishDrop), the photo order (fishOrder: never by who took them), what a
// family still needs before ✓ Validated (fishNeeds, fishUnitPhases), and the photo actions it shares with the fish
// Candidates (fishOn, fishReject, fishExclude, fishNotThis).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const A = require('../autosort.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));

test('fishOrder: featured first in his order, then the game’s order (easiest, then most reference-like); never Pierre’s own first', () => {
  const L = [
    {f: 'a', own: true}, // Pierre's own, ease 2: no boost
    {f: 'b'}, // ease 5
    {f: 'c'}, // ease 3
    {f: 'd'}, // ease 4, featured second
    {f: 'e'} // ease 4, featured first
  ];
  const F = {ease: {a: 2, b: 5, c: 3, d: 4}, genera: {'f:A': {feat: {s1: ['e', 'd', 'gone']}}}},
    j = f => (f === 'e' ? {e: 4} : null),
    r = A.fishOrder(L, F, 'f:A', 's1', j);
  assert.deepStrictEqual(
    r.feat.map(p => p.f),
    ['e', 'd'],
    'a featured photo no longer in play is left out'
  );
  assert.deepStrictEqual(
    r.rest.map(p => p.f),
    ['b', 'c', 'a']
  );
  // At the same ease, the reference photo (the rubric's flag r, his tags before the pass's) comes first.
  const r2 = A.fishOrder([{f: 'x'}, {f: 'y'}], {ease: {x: 4, y: 4}, tags: {y: 'p1g0sm1r'}}, 'f:A', 's1', f =>
    f === 'x' ? {jt: 'p1g0sm1'} : null
  );
  assert.deepStrictEqual(
    r2.rest.map(p => p.f),
    ['y', 'x']
  );
});

test('fishFeat, fishCover, fishOk: one click each, in fish genera; empties left out; coral keys never touched', () => {
  let F = {add: {a: 's1', b: 's1', c: 's1', d: 's1'}};
  F = A.fishFeat(F, 'f:A', 's1', 'a').F;
  assert.deepStrictEqual(F.genera, {'f:A': {feat: {s1: ['a']}}});
  ['b', 'c'].forEach(f => (F = A.fishFeat(F, 'f:A', 's1', f).F));
  const r = A.fishFeat(F, 'f:A', 's1', 'd');
  assert.strictEqual(r.full, true, `at ${A.FISHFEAT} featured, a fourth waits`);
  assert.strictEqual(r.F, F);
  F = A.fishFeat(F, 'f:A', 's1', 'b').F;
  assert.deepStrictEqual(F.genera['f:A'].feat.s1, ['a', 'c']);
  F = A.fishCover(F, 'f:A', 'c');
  assert.strictEqual(F.genera['f:A'].cover, 'c');
  F = A.fishOk(F, 'f:A');
  assert.strictEqual(F.genera['f:A'].ok, true);
  // A photo leaving play leaves the featured photos and the cover too.
  F = A.fishDrop(F, 'f:A', 'c');
  assert.deepStrictEqual(F.genera['f:A'], {feat: {s1: ['a']}, ok: true});
  F = A.fishOk(A.fishDrop(F, 'f:A', 'a'), 'f:A');
  assert.deepStrictEqual(F.genera, {}, 'an emptied family goes');
  assert.deepStrictEqual(F.add, {a: 's1', b: 's1', c: 's1', d: 's1'});
  F = A.fishCover(A.fishCover(F, 'f:B', 'z'), 'f:B', 'z');
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

test('fishUnitPhases: the IMR phases from the phase lines the family carries (as the IMR entries write them), dimorph', () => {
  const T = Object.fromEntries(read('fish.json').teach.map(t => [t.name, t])),
    fam = t => ({phase: t.phase, dimorph: t.dimorph});
  assert.deepStrictEqual(A.fishUnitPhases(fam(T.Parrotfish)), ['intermediate', 'male', 'female']);
  assert.deepStrictEqual(A.fishUnitPhases(fam(T.Anthias)), ['male', 'female']);
  assert.deepStrictEqual(A.fishUnitPhases(fam(T.Angelfish)), ['juvenile']);
  assert.deepStrictEqual(A.fishUnitPhases(fam(T.Sweetlips)), ['juvenile', 'intermediate']);
  assert.deepStrictEqual(A.fishUnitPhases(fam(T.Damselfish)), []);
});

test('fishUnits: families by key group, genera with their species, the IMR tag on families and genera', () => {
  const J = {
    species: [
      {id: 's1', name: 'Chromis viridis', circle: 1, genus: 'g:Chromis', family: 'f:Damselfishes'},
      {id: 's2', name: 'Amphiprion ocellaris', circle: 1, genus: 'g:Amphiprion', family: 'f:Damselfishes'},
      {id: 's3', name: 'Diploprion bifasciatum', circle: 1},
      {id: 's4', name: 'Chaetodon lunula', circle: 2}
    ],
    families: [
      {
        id: 'f:Damselfishes',
        name: 'Damselfishes',
        sci: ['Pomacentridae'],
        group: 3,
        circle: 1,
        imr: 'Damselfish',
        genera: ['g:Chromis', 'g:Amphiprion'],
        species: ['s2', 's1', 'gone']
      },
      {id: 'f:Soapfishes', name: 'Soapfishes', sci: ['Diploprioninae'], group: 13, imrWith: 'Groupers', species: ['s3']},
      {id: 'f:Butterflyfishes', name: 'Butterflyfishes', sci: 'Chaetodontidae', group: 1, species: ['s4']}
    ],
    genera: [
      {id: 'g:Chromis', name: 'Chromis', family: 'f:Damselfishes', imr: 'Chromis', species: ['s1']},
      {id: 'g:Amphiprion', name: 'Amphiprion', family: 'f:Damselfishes', imr: 'Anemonefish', species: ['s2']}
    ]
  };
  const U = A.fishUnits(J);
  assert.deepStrictEqual(
    U.map(f => f.id),
    ['f:Butterflyfishes', 'f:Damselfishes', 'f:Soapfishes'],
    'the key groups’ order'
  );
  const [b, d, so] = U;
  assert.deepStrictEqual(d.species, ['s2', 's1'], 'a species not in fish.json is left out; the commonness order kept');
  assert.deepStrictEqual(
    d.genera.map(g => [g.id, g.name, g.imr, g.species]),
    [
      ['g:Chromis', 'Chromis', 'Chromis', ['s1']],
      ['g:Amphiprion', 'Amphiprion', 'Anemonefish', ['s2']]
    ]
  );
  assert.strictEqual(d.imr, 'Damselfish');
  assert.deepStrictEqual([so.imr, so.imrWith], ['', 'Groupers']);
  assert.deepStrictEqual(
    so.genera.map(g => [g.id, g.species]),
    [['g:Diploprion', ['s3']]],
    'a genus from the species name'
  );
  assert.deepStrictEqual([b.sci, b.circle, b.imr], [['Chaetodontidae'], 2, '']);
  assert.deepStrictEqual(A.fishUnits({species: []}), [], 'no families yet: none');
  // The real fish.json, once it carries the book's families (the plan's PR 2): every game species in one family and one of
  // its genera; 28 families in circle 1.
  const R = read('fish.json');
  if (!R.families) return;
  const RU = A.fishUnits(R),
    game = R.species.filter(x => !x.out).map(x => x.id),
    inF = RU.flatMap(f => f.species),
    inG = RU.flatMap(f => f.genera.flatMap(g => g.species));
  game.forEach(s => assert.strictEqual(inF.filter(x => x === s).length, 1, `${s} in one family`));
  game.forEach(s => assert.strictEqual(inG.filter(x => x === s).length, 1, `${s} in one genus`));
  assert.strictEqual(RU.filter(f => f.circle === 1).length, 28);
});

test('fishNeeds: each species up to its target, 5 easy photos, every IMR phase, else nothing', () => {
  const sp = {s1: {}, s2: {cs: 1}, s3: {out: 1}},
    t = {species: ['s1', 's2', 's3'], phase: ['Juveniles look very different from adults']}, // a family
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

test('fishStamp: a Remove of a photo the fish auto-sort put in play is timed in its log code (Codex review #655)', () => {
  const F0 = {add: {a: 's1', b: 's1'}, auto: {d1: {a: 'at', b: 'a'}}},
    before = A.fishSigs(F0),
    F1 = A.fishReject(A.fishDrop(F0, 'f:A', 'a'), 'a'),
    S = A.fishStamp(F1, before, 36 * 36);
  assert.deepStrictEqual(S, {d1: {a: 'at@100', b: 'a'}});
  assert.strictEqual(A.fishStamp(F0, before, 1), null, 'nothing changed: nothing timed');
});

test('fishFeat frees the slot of a featured photo no longer in play; fishPhase reads the source past auto-written tags (Codex review #655)', () => {
  const F = {add: {a: 's1', b: 's1', d: 's1'}, genera: {'f:A': {feat: {s1: ['a', 'b', 'c']}}}}; // c left play (undone)
  const r = A.fishFeat(F, 'f:A', 's1', 'd');
  assert.strictEqual(r.full, false);
  assert.deepStrictEqual(r.F.genera['f:A'].feat.s1, ['a', 'b', 'd']);
  const p = {f: 'm', st: 'male'};
  assert.strictEqual(A.fishPhase(p, null, {tags: {m: 'p1g0sm1'}, auto: {d1: {m: 'ate'}}}), 'male', 'tags the auto-sort wrote');
  assert.strictEqual(A.fishPhase(p, null, {tags: {m: 'p1g0sm1'}}), '', 'his tags: his "no phase"');
});
