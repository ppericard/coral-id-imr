require('./slot.js').testGuard();
// Photos › Tree, the structure editor (admin-content.js; docs/reviews/2026-11-14-sheet-overlay-design.md): the pure
// part. A family's circle in force and its state, its look-alike
// pairs (the base's and his), the pair entries the draft writes (core.js contentPairKey, contentPairSet,
// contentPairDrop), the Sheet's look-alike lines read with the pairs in force, the edits to check, the emptied pairs map
// kept through two merges, and whether a draft changes the structure (its Publish confirms once). The edits are made up.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js'),
  {sheetSlots, sheetTodo, contentShells, sheetFile, circleRow, pairRows, structChanged, montPairs} = require('../admin-content.js'),
  AS = require('../autosort.js');
const ROOT = path.join(__dirname, '..'),
  F = JSON.parse(fs.readFileSync(path.join(ROOT, 'fish.json'), 'utf8')),
  S = C.subjectOf('fish'),
  fam = id => F.families.find(f => f.id === id),
  e = (v, was, x = {}) => ({v, was, t: 1, ...x});
// A circle-1 family with a look-alike line to another family, and a family it is in no pair with.
const A = F.families.find(f => !f.wink && f.circle === 1 && (f.look || []).some(x => fam(x[0]))),
  LK = A.look.find(x => fam(x[0]))[0],
  near = new Set([A.id, ...A.look.map(x => x[0]), ...F.families.filter(f => (f.look || []).some(x => x[0] === A.id)).map(f => f.id)]),
  NEW = F.families.find(f => !f.wink && !near.has(f.id)).id;

test('the pair key: two node ids in code-point order joined by |, whichever comes first', () => {
  assert.strictEqual(C.contentPairKey('f:Wrasses', 'f:Parrotfishes'), 'f:Parrotfishes|f:Wrasses');
  assert.strictEqual(C.contentPairKey('f:Parrotfishes', 'f:Wrasses'), 'f:Parrotfishes|f:Wrasses');
  // code-point order, as structEntries reads it: an upper-case letter before a lower-case one
  assert.strictEqual(C.contentPairKey('f:abc', 'f:Zed'), 'f:Zed|f:abc');
});

test('a pair edit: withdrawn over the base, added with its source, the base value removing it, the map kept', () => {
  const K = C.contentPairKey(A.id, LK),
    N = C.contentPairKey(A.id, NEW);
  let c = C.contentPairSet({}, K, null, 1, null, 5);
  assert.deepStrictEqual(c, {pairs: {[K]: {v: null, was: 1, t: 5}}});
  c = C.contentPairSet(c, N, 1, null, {t: 'A made-up guide', u: 'https://example.org'}, 6);
  assert.deepStrictEqual(c.pairs[N], {v: 1, was: null, src: {t: 'A made-up guide', u: 'https://example.org'}, t: 6});
  // an empty source is no source (a source is never required)
  assert.ok(!('src' in C.contentPairSet({}, N, 1, null, {t: ' '}, 7).pairs[N]));
  // the base's value again: the entry goes, the map stays (the merge)
  const d = C.contentPairSet(C.contentPairSet(c, K, 1, 1, null, 8), N, null, null, null, 9);
  assert.deepStrictEqual(d, {pairs: {}});
  assert.deepStrictEqual(C.contentPairDrop({pairs: {[K]: e(null, 1)}, nodes: {x: {}}}, K), {pairs: {}, nodes: {x: {}}});
  // a new map each time: the draft's maps are never changed in place
  const c0 = {pairs: {[K]: e(null, 1)}};
  C.contentPairDrop(c0, K);
  assert.ok(c0.pairs[K]);
});

test("a family's circle: the base, his edit in force (fresh, stale), the base's own value (absorbed), a bad one", () => {
  assert.deepStrictEqual(circleRow(S, F, {}, A.id), {of: [1, 2, 3], base: 1, e: null, state: '', v: 1});
  assert.deepStrictEqual(circleRow(S, F, {nodes: {[A.id]: {circle: e(2, 1)}}}, A.id).v, 2);
  assert.strictEqual(circleRow(S, F, {nodes: {[A.id]: {circle: e(2, 1)}}}, A.id).state, 'fresh');
  const none = circleRow(S, F, {nodes: {[A.id]: {circle: e(null, 1)}}}, A.id);
  assert.deepStrictEqual([none.v, none.state], [null, 'fresh']);
  // edited over a base that changed since: his stays in force
  const st = circleRow(S, F, {nodes: {[A.id]: {circle: e(3, 2)}}}, A.id);
  assert.deepStrictEqual([st.v, st.state, st.base], [3, 'stale', 1]);
  assert.strictEqual(circleRow(S, F, {nodes: {[A.id]: {circle: e(1, 2)}}}, A.id).state, 'absorbed');
  const bad = circleRow(S, F, {nodes: {[A.id]: {circle: e(7, 1)}}}, A.id);
  assert.deepStrictEqual([bad.v, bad.state, bad.why], [1, 'orphan', 'value']);
  // a genus, a species, an unknown id: no circle of their own here
  assert.strictEqual(circleRow(S, F, {}, F.genera[0].id), null);
  assert.strictEqual(circleRow(S, F, {}, F.species[0].id), null);
  assert.strictEqual(circleRow(S, F, {}, 'f:Nope'), null);
  // a subject with no structure (the corals)
  assert.strictEqual(circleRow(C.SUBJECTS[0], F, {}, A.id), null);
});

test("a family's pairs: the base's (either side's line), withdrawn, added, and one never applied", () => {
  const K = C.contentPairKey(A.id, LK),
    N = C.contentPairKey(A.id, NEW),
    base = pairRows(S, F, {}, A.id);
  assert.ok(base.length >= 1);
  assert.ok(base.every(r => r.base === 1 && r.v === 1 && r.e === null && r.state === '' && (r.a === A.id || r.b === A.id)));
  assert.ok(base.some(r => r.key === K));
  assert.ok(base.every(r => r.a < r.b && r.key === r.a + '|' + r.b));
  // a pair one side declares only counts once (the base declares it: f:MoorishIdol → f:Butterflyfishes)
  const all = pairRows(S, F, {});
  assert.strictEqual(new Set(all.map(r => r.key)).size, all.length);
  assert.ok(all.some(r => r.key === 'f:Butterflyfishes|f:MoorishIdol'));
  const R = pairRows(S, F, {pairs: {[K]: e(null, 1), [N]: e(1, null, {src: {t: 'S'}}), 'f:Zzz|f:Nope': e(1, null)}}, A.id);
  const by = Object.fromEntries(R.map(r => [r.key, r]));
  assert.deepStrictEqual([by[K].v, by[K].state, by[K].base], [null, 'fresh', 1]);
  assert.deepStrictEqual([by[N].v, by[N].state, by[N].base, by[N].e.src], [1, 'fresh', null, {t: 'S'}]);
  assert.ok(!by['f:Zzz|f:Nope'], 'not one of its pairs');
  const O = pairRows(S, F, {pairs: {'f:Nope|f:Zzz': e(1, null), [A.id + '|' + A.id + 'x']: e(2, null)}});
  assert.deepStrictEqual(
    O.filter(r => r.state === 'orphan').map(r => r.why),
    ['node', 'node']
  );
  assert.ok(pairRows(S, F, {pairs: {[N]: e(2, null)}}).find(r => r.key === N).why === 'value');
  assert.deepStrictEqual(pairRows(C.SUBJECTS[0], F, {}), []);
});

test("the Sheet reads the pairs in force: an added pair's line to fill, a withdrawn pair's words never applied", () => {
  const K = C.contentPairKey(A.id, LK),
    N = C.contentPairKey(A.id, NEW),
    Cm = {pairs: {[K]: e(null, 1), [N]: e(1, null)}, nodes: {[A.id]: {['look/' + LK]: e('Mine', 'x')}}},
    R = sheetSlots(S, F, Cm, A.id),
    by = Object.fromEntries(R.map(r => [r.slot, r]));
  assert.deepStrictEqual([by['look/' + NEW].base, by['look/' + NEW].v, by['look/' + NEW].state], [null, null, '']);
  assert.deepStrictEqual([by['look/' + LK].state, by['look/' + LK].why], ['orphan', 'slot']);
  // the other side too
  assert.ok(sheetSlots(S, F, Cm, NEW).some(r => r.slot === 'look/' + A.id && r.state === ''));
  // the file: the pairs only (a family taken off the game keeps its sheet), the same object for the same pairs
  const P = sheetFile(S, F, Cm);
  assert.strictEqual(sheetFile(S, F, {...Cm}), P);
  assert.strictEqual(sheetFile(S, F, {nodes: {[A.id]: {circle: e(null, 1)}}}), F);
  assert.ok(sheetSlots(S, F, {nodes: {[A.id]: {circle: e(null, 1)}}}, A.id).length > 0);
  // the edits to check: that line, and the structure's own (a stale circle, a pair never applied)
  const T = sheetTodo(S, F, {...Cm, nodes: {...Cm.nodes, [NEW]: {circle: e(3, 2)}}, pairs: {...Cm.pairs, 'f:Nope|f:Zzz': e(1, null)}});
  assert.deepStrictEqual(
    T.map(x => [x.node, x.slot, x.state, x.why || '']),
    [
      [A.id, 'look/' + LK, 'orphan', 'slot'],
      [NEW, 'circle', 'stale', ''],
      ['f:Nope', 'pair:f:Nope|f:Zzz', 'orphan', 'node']
    ]
  );
});

test('a pair restored that empties the map: kept through two merges, so a pair another device added stays', () => {
  const K = C.contentPairKey(A.id, LK),
    N = C.contentPairKey(A.id, NEW),
    note = {nodes: {[NEW]: {note: e('Another device', null)}}},
    pub0 = {fish: {content: {pairs: {[K]: e(null, 1)}}}, genera: {}},
    mine = {fish: {content: C.contentPairDrop(pub0.fish.content, K)}, genera: {}},
    merge = (base, m, t) => contentShells(m, C.merge3(base, m, t));
  // the first merge: another device published a note meanwhile (the content maps merged key by key), the emptied pairs
  // map put back
  const pubA = {fish: {content: {...note, pairs: {[K]: e(null, 1)}}}, genera: {}},
    m1 = merge(pub0, mine, pubA);
  assert.deepStrictEqual(m1.fish.content, {...note, pairs: {}});
  // the second (another rebase, Publish's retry, against the file now published): another device's pair is kept, his
  // restore too
  const pubB = {fish: {content: {...note, pairs: {[K]: e(null, 1), [N]: e(1, null)}}}, genera: {}},
    m2 = merge(pubA, m1, pubB);
  assert.deepStrictEqual(Object.keys(m2.fish.content.pairs), [N]);
  // without the shell the same two merges would drop it (the reason for contentShells)
  const bare = C.merge3(pubA, C.merge3(pub0, mine, pubA), pubB);
  assert.ok(!bare.fish.content.pairs);
});

test('a structure change: a circle or a pair, as published (an emptied map or a text edit is none)', () => {
  const K = C.contentPairKey(A.id, LK);
  assert.ok(!structChanged({}, {}));
  assert.ok(!structChanged({pairs: {}, nodes: {[A.id]: {}}}, {}));
  assert.ok(!structChanged({nodes: {[A.id]: {cues: e(['x'], A.cues)}}}, {}));
  assert.ok(structChanged({nodes: {[A.id]: {circle: e(2, 1)}}}, {}));
  assert.ok(structChanged({pairs: {[K]: e(null, 1)}}, {}));
  assert.ok(structChanged({}, {pairs: {[K]: e(null, 1)}}));
  assert.ok(!structChanged({pairs: {[K]: e(null, 1)}}, {pairs: {[K]: e(null, 1)}}));
});

// Photos › Look-alikes (admin.js renderMont, MONT_BUILD tree): one photo pair per pair in force, the base's less the withdrawn ones,
// plus the added ones marked, keyed as the pair entries (fish mont); the circles do not take a pair out (as the Tree's
// filter); the same pairs as pairRows says are in force.
test('Look-alikes lists the pairs in force: a withdrawn pair gone, an added one marked, keyed as his entries', () => {
  const U = AS.fishUnits(F),
    base = AS.fishPairs(U),
    K = C.contentPairKey(A.id, LK),
    N = C.contentPairKey(A.id, NEW),
    keys = L => L.map(p => p.k).sort();
  assert.ok(base.length >= 5 && base.some(p => p.k === K));
  // the base's keys are the pair entries' keys (core.js contentPairKey), so fish mont holds an added pair as any
  base.forEach(p => assert.strictEqual(p.k, C.contentPairKey(p.A, p.B)));
  // no edit: the base's pairs, the same list, none marked
  assert.deepStrictEqual(montPairs(S, F, {}, U), base);
  assert.deepStrictEqual(montPairs(S, F, {pairs: {}}, U), base);
  const Cm = {pairs: {[K]: e(null, 1), [N]: e(1, null)}},
    L = montPairs(S, F, Cm, U),
    n = L.find(p => p.k === N);
  assert.ok(!L.some(p => p.k === K), 'the withdrawn pair has no row');
  assert.ok(n && n.added && [n.A, n.B].sort().join() === [A.id, NEW].sort().join(), 'the added pair, marked');
  assert.deepStrictEqual(n.cues, [], 'no words of the base on an added pair');
  assert.ok(L.filter(p => p.added).length === 1 && L.filter(p => p.k !== N).every(p => base.some(q => q.k === p.k && !p.added)));
  assert.strictEqual(L.length, base.length);
  // the pairs pairRows says are in force (v 1), no other
  assert.deepStrictEqual(
    keys(L),
    pairRows(S, F, Cm)
      .filter(r => r.v === 1)
      .map(r => r.key)
      .sort()
  );
  // made without the units given, the same
  assert.deepStrictEqual(montPairs(S, F, {pairs: {[N]: e(1, null)}}).length, base.length + 1);
  // a family taken off the game keeps its pairs here (the circles are left out, as the Tree's filter)
  assert.ok(montPairs(S, F, {...Cm, nodes: {[A.id]: {circle: e(null, 1)}}}, U).some(p => p.k === N));
  // an added pair the base now declares (absorbed): a base pair, not marked
  const Fb = {...F, families: F.families.map(f => (f.id === A.id ? {...f, look: [...f.look, [NEW, 'made-up words']]} : f))},
    ab = montPairs(S, Fb, {pairs: {[N]: e(1, null)}}).find(p => p.k === N);
  assert.ok(ab && !ab.added);
});

// The Tree names each circle in its subject's own words (SUBJECTS admin circles; admin-content.js circleWord, circleLab).
test('circle words: the number first and the subject’s words with it, the number alone where none are declared', () => {
  const {circleWord, circleLab} = require('../admin-content.js');
  assert.deepStrictEqual(
    [1, 2, 3].map(c => circleLab(S, c)),
    ['1 · IMR course', '2 · After the course', '3 · Beyond the course']
  );
  assert.strictEqual(circleLab(S, null), 'None');
  assert.strictEqual(circleWord(S, 4), '');
  // a subject with no words, or none for that circle, is its number (never a made-up word)
  assert.strictEqual(circleLab({admin: {}}, 2), '2');
  assert.strictEqual(circleLab(undefined, 2), '2');
  assert.strictEqual(circleLab({admin: {circles: {2: 'Second'}}}, 1), '1');
  assert.strictEqual(circleLab({admin: {circles: {2: 'Second'}}}, 2), '2 · Second');
});

test('circle words: every circle a subject’s units carry, and every circle it lets the editor set, has words', () => {
  const {circleWord} = require('../admin-content.js'),
    seaslug = JSON.parse(fs.readFileSync(path.join(ROOT, 'seaslug.json'), 'utf8')),
    files = {fish: F, seaslug};
  C.SUBJECTS.forEach(s => {
    const W = s.admin && s.admin.circles;
    if (s.structure && s.structure.circle) assert.ok(W, `${s.id}: its editor sets circles, so it names them`);
    if (!W) return;
    // words are real, short and told apart
    const w = Object.keys(W).map(c => W[c]);
    assert.ok(
      w.every(x => typeof x === 'string' && x.trim() && x.length <= 24),
      `${s.id}: words`
    );
    assert.strictEqual(new Set(w).size, w.length, `${s.id}: two circles with the same words`);
    if (s.structure && s.structure.circle) s.structure.circle.of.forEach(c => assert.ok(circleWord(s, c), `${s.id}: circle ${c}`));
    // the circle values of its built file's units
    const R = files[s.id],
      seen = new Set();
    assert.ok(R, `${s.id}: a built file to check`);
    ['families', 'genera', 'species'].forEach(k => (R[k] || []).forEach(u => u.circle != null && seen.add(u.circle)));
    assert.ok(seen.size, `${s.id}: circles in its file`);
    seen.forEach(c => assert.ok(circleWord(s, c), `${s.id}: circle ${c} of its units has no words`));
  });
});
