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
const {fishOn} = require('../core.js');
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

// A genus's and a species' cover (Pierre, 2026-11-13): the same map under the genus's 'g:' id or the species' id; a photo
// leaving play from its family's page leaves them too, in the same step; another photo's covers stay.
test('fishCover on a genus or a species; fishDrop takes the photo out of every cover', () => {
  let F = {add: {a: 's1', b: 's1', c: 's2'}};
  F = A.fishCover(A.fishCover(A.fishCover(F, 'f:A', 'a'), 'g:Xus', 'a'), 's1', 'a');
  F = A.fishCover(A.fishCover(F, 's2', 'c'), 'g:Yus', 'b');
  assert.deepStrictEqual(F.genera, {'f:A': {cover: 'a'}, 'g:Xus': {cover: 'a'}, s1: {cover: 'a'}, s2: {cover: 'c'}, 'g:Yus': {cover: 'b'}});
  const D = A.fishDrop(F, 'f:A', 'a');
  assert.deepStrictEqual(D.genera, {s2: {cover: 'c'}, 'g:Yus': {cover: 'b'}});
  assert.ok(F.genera['g:Xus'], 'its input untouched');
  assert.deepStrictEqual(A.fishCover(F, 's1', 'a').genera.s1, undefined, 'a second click takes his pick off');
  assert.deepStrictEqual(A.fishDrop(F, 'f:A', 'zz').genera, F.genera, 'a photo no cover names changes nothing');
});

test('Remove, ×, Not this on a photo in play (the fish Candidates’ convention)', () => {
  const F = {add: {a: 's1', b: 's1', c: 's1'}, seen: {}};
  assert.ok(fishOn(F, 'a', 's1'));
  const R = A.fishReject(F, 'a');
  assert.ok(!fishOn(R, 'a', 's1') && R.seen.a === 1 && !('a' in R.add));
  const X = A.fishExclude(F, 'b');
  assert.ok(!fishOn(X, 'b', 's1') && X.exclude.b === 'excluded');
  const N = A.fishNotThis(F, 'c', 's2', 's1');
  assert.ok(!fishOn(N, 'c', 's1') && N.out.c === 's2' && !('c' in N.add), 'its candidate in s2 now, not in play');
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

test('fishOrder follows the game: a reference-level photo before an easier ordinary one (core.js easyRank, Codex review #655)', () => {
  const L = [{f: 'plain'}, {f: 'ref', rep: 1}],
    F = {ease: {plain: 5, ref: 4}, tags: {plain: 'o1g1bm1', ref: 'p1g0sm1'}};
  assert.deepStrictEqual(
    A.fishOrder(L, F, 'f:A', 's1').rest.map(p => p.f),
    ['ref', 'plain']
  );
});

test('fishCoverOf: his pick in play, else the family’s first photo in the game’s order across its species (Codex review #655)', () => {
  // The first species' best photo is ordinary; another species has a reference-level one: it is the cover.
  const L = [
      {f: 'a1', sid: 's1'},
      {f: 'b1', sid: 's2', rep: 1}
    ],
    F = {ease: {a1: 4, b1: 4}, tags: {a1: 'o1g1bm1', b1: 'p1g0sm1'}};
  assert.strictEqual(A.fishCoverOf(L, F, 'f:A').f, 'b1');
  assert.strictEqual(A.fishCoverOf(L, {...F, genera: {'f:A': {cover: 'a1'}}}, 'f:A').f, 'a1', 'his pick wins');
  assert.strictEqual(A.fishCoverOf(L, {...F, genera: {'f:A': {cover: 'gone'}}}, 'f:A').f, 'b1', 'a pick out of play: the order');
  assert.strictEqual(A.fishCoverOf([], F, 'f:A'), null);
});

// A juvenile is never a cover (Pierre, 2026-11-13): fishJuv reads its phase word (his phase and tags, else the pass's,
// else a game record's ph or the source's life stage); his pick on one is ignored, the default skips them, a unit of
// juveniles only keeps its first.
test('fishJuv and fishCoverOf: a juvenile is never a cover, picked or not', () => {
  const L = [
      {f: 'j1', sid: 's1', rep: 1},
      {f: 'a1', sid: 's1'},
      {f: 'j2', sid: 's2', ph: 'juvenile'},
      {f: 'j3', sid: 's2', st: 'juvenile'}
    ],
    F = {ease: {j1: 5, a1: 3}, tags: {j1: 'p1g0sl1j', a1: 'p1g0sm1'}};
  assert.deepStrictEqual(
    L.map(p => A.fishJuv(p, null, F)),
    [true, false, true, true]
  );
  assert.strictEqual(A.fishJuv(L[2], null, {tags: {j2: 'p1g0sm1'}}), false, 'his tags without the flag: not a juvenile');
  assert.strictEqual(A.fishCoverOf(L, F, 'f:A').f, 'a1', 'the order’s first is a juvenile: the next');
  assert.strictEqual(A.fishCoverOf(L, {...F, genera: {'g:X': {cover: 'j1'}}}, 'g:X').f, 'a1', 'his pick on a juvenile is ignored');
  assert.strictEqual(A.fishCoverOf(L, {...F, genera: {s1: {cover: 'a1'}}}, 's1').f, 'a1');
  assert.strictEqual(A.fishCoverOf([L[2], L[3]], {}, 's2').f.charAt(0), 'j', 'juveniles only: it keeps one');
});

test('fishCov and fishLook: per family, genus and species, the photos in play, targets, easy, reference, phases, waiting', () => {
  const U = [
    {
      id: 'f:A',
      name: 'As',
      species: ['s1', 's2'],
      phase: ['Juveniles differ'],
      genera: [
        {id: 'g:X', name: 'X', imr: 'Ex', species: ['s1']},
        {id: 'g:Y', name: 'Y', species: ['s2']}
      ],
      imr: 'A'
    },
    {id: 'f:B', name: 'Bs', species: ['s3'], phase: [], genera: [{id: 'g:Z', name: 'Z', species: ['s3']}], imrWith: 'As'}
  ];
  const species = {s1: {name: 'X one', common: 'One', circle: 1, cs: 1}, s2: {name: 'Y two', circle: 1}, s3: {name: 'Z three', circle: 3}},
    play = {
      s1: Array.from({length: 12}, (_, i) => ({f: `a${i}`, o: `o${i}`})),
      s2: [
        {f: 'b0', o: 'p0'},
        {f: 'b1', o: 'p0'}
      ]
    },
    F = {ease: {a0: 5, a1: 4, b0: 4}, tags: {a2: 'p1g0sm1r', b1: 'p1g0sm1j'}, add: {c0: 's3'}},
    cand = {s2: [{f: 'b0'}, {f: 'w1'}, {f: 'w2'}], s3: [{f: 'c0'}, {f: 'w3'}]};
  // play is what the page passes in; wait reads the draft: b0 is not in F.add, so as a candidate it still waits.
  const C = A.fishCov(U, play, species, cand, F);
  const sp = Object.fromEntries(C.sp.map(r => [r.id, r]));
  assert.deepStrictEqual([sp.s1.n, sp.s1.obs, sp.s1.tgt, sp.s1.easy, sp.s1.ref, sp.s1.need], [12, 12, 12, 2, 1, []]);
  assert.deepStrictEqual([sp.s2.obs, sp.s2.tgt, sp.s2.ph, sp.s2.need], [1, 8, ['juvenile'], ['7 observations under target']]);
  assert.strictEqual(sp.s2.wait, 3, 'its candidates nobody decided');
  assert.deepStrictEqual([sp.s3.n, sp.s3.wait, sp.s3.need], [0, 1, ['No photo in play']], 'c0 is decided (F.add), so not waiting');
  const fam = Object.fromEntries(C.fam.map(r => [r.id, r]));
  assert.deepStrictEqual([fam['f:A'].ok, fam['f:A'].of, fam['f:A'].easy, fam['f:A'].want, fam['f:A'].imr], [1, 2, 3, ['juvenile'], 'A']);
  assert.deepStrictEqual(fam['f:A'].need, ['1 species under target', 'Easy 3/5']);
  assert.strictEqual(fam['f:B'].imr, 'with As');
  const gen = Object.fromEntries(C.gen.map(r => [r.id, r]));
  assert.deepStrictEqual(
    [gen['g:X'].imr, gen['g:X'].need, gen['g:Y'].need, gen['g:Z'].need],
    ['Ex', [], ['1 species under target'], ['1 species under target', 'No photo in play']]
  );
  // Where to look: under target with too few waiting to fill the gap; circle 1 first.
  assert.deepStrictEqual(
    A.fishLook(C).map(r => [r.id, r.gap]),
    [
      ['s2', 4],
      ['s3', 7]
    ]
  );
  // Two waiting photos of one observation add one observation (Codex review #659).
  const C2 = A.fishCov(
    U,
    play,
    species,
    {
      ...cand,
      s2: [
        {f: 'w1', o: 'q1'},
        {f: 'w2', o: 'q1'},
        {f: 'w4', o: 'p0'}
      ]
    },
    F
  );
  assert.deepStrictEqual(
    A.fishLook(C2)
      .filter(r => r.id === 's2')
      .map(r => [r.wait, r.waitObs, r.gap]),
    [[3, 1, 6]],
    'w4 is another photo of an observation already in play'
  );
});

test('fishCov counts a candidate sent with Not this as waiting in its new species (Codex review #659)', () => {
  const U = [{id: 'f:A', name: 'As', species: ['s1', 's2'], phase: [], genera: [{id: 'g:X', name: 'X', species: ['s1', 's2']}]}],
    species = {s1: {name: 'X one'}, s2: {name: 'X two'}},
    C = A.fishCov(
      U,
      {},
      species,
      {
        s1: [
          {f: 'a', o: 'o1'},
          {f: 'b', o: 'o2'}
        ]
      },
      {out: {b: 's2'}}
    ),
    by = Object.fromEntries(C.sp.map(r => [r.id, r]));
  assert.deepStrictEqual([by.s1.wait, by.s2.wait, by.s2.waitObs], [1, 1, 1]);
});

test('Photo review: fishSet through fishOwn, fishTag, fishAgree against the pass', () => {
  // An auto-sort add that wrote the ease (log code at): Pierre's ease takes the e out of the code, so its Undo keeps it.
  let F = {add: {a: 's1'}, ease: {a: 4}, auto: {d1: {a: 'ae'}}};
  F = A.fishSet(F, 'a', 'ease', 2);
  assert.deepStrictEqual([F.ease.a, F.auto.d1.a], [2, 'a']);
  assert.ok(!('a' in A.fishSet(F, 'a', 'ease', null).ease), 'null takes his value off');
  assert.strictEqual(A.fishTag('p1g0sm1r', 0, 'd'), 'd1g0sm1r');
  assert.strictEqual(A.fishTag('p1g0sm1r', 'j'), 'p1g0sm1jr', 'flags in the rubric order');
  assert.strictEqual(A.fishTag('p1g0sm1jr', 'j'), 'p1g0sm1r');
  assert.strictEqual(A.fishTag('bad', 0, 'o'), 'o1g0sm1', 'an unreadable code starts from a plain profile one');
  const j = f => ({a: {e: 4, jt: 'p1g0sm1', ph: 'male'}, b: {e: 3, jt: 'o1g0sm1j'}, c: {e: 5, jt: 'p1g0sm1'}})[f] || null,
    G = {ease: {a: 4, b: 5, c: 1}, tags: {a: 'p1g0sm1', b: 'p1g0sm1j'}, phase: {a: 'male'}};
  assert.deepStrictEqual(A.fishAgree(G, ['a', 'b', 'c', 'x'], 'ease', j), {n: 3, both: 3, same: 1, near: 1});
  assert.deepStrictEqual(A.fishAgree(G, ['a', 'b', 'c'], 'view', j), {n: 2, both: 2, same: 1, near: 0});
  assert.deepStrictEqual(
    A.fishAgree(G, ['a', 'b', 'c'], 'phase', j),
    {n: 2, both: 2, same: 2, near: 0},
    'male = male; juvenile (j flag) = juvenile'
  );
});

test('Look-alikes: fishPairs from the IMR lines, fishMontPick phase-matched, fishMontSet', () => {
  const U = [
    {id: 'f:B', look: [['f:A', 'B: no spine']], lsrc: {'f:A': 'IMR fish presentation, slide 3'}},
    {
      id: 'f:A',
      look: [
        ['f:B', 'A: a spine'],
        ['f:Z', 'not a game family'],
        ['f:B', 'A: a spine']
      ]
    },
    {id: 'f:C', look: []}
  ];
  assert.deepStrictEqual(A.fishPairs(U), [
    {
      k: 'f:A|f:B',
      A: 'f:B',
      B: 'f:A',
      cues: [
        ['f:B', 'B: no spine', 'IMR fish presentation, slide 3'],
        ['f:A', 'A: a spine', 'IMR course']
      ]
    }
  ]);
  const ph = p => p.ph || '',
    LA = [{f: 'a1'}, {f: 'a2', ph: 'juvenile'}, {f: 'a3', ph: 'male'}],
    LB = [{f: 'b1', ph: 'juvenile'}, {f: 'b2'}];
  let m = A.fishMontPick(null, LA, LB, ph);
  assert.deepStrictEqual([m.v, m.a.f, m.b.f, m.set, m.LA.map(p => p.f)], ['adult', 'a1', 'b2', false, ['a1', 'a3']], 'a male is an adult');
  m = A.fishMontPick({v: 'juvenile', a: 'a1', b: 'b1'}, LA, LB, ph);
  assert.deepStrictEqual([m.v, m.a.f, m.b.f, m.set], ['juvenile', 'a2', 'b1', true], 'his photo out of the phase: the first of it');
  m = A.fishMontPick({v: 'juvenile'}, LA, [{f: 'b2'}], ph);
  assert.strictEqual(m.v, 'adult', 'a phase one family lacks: adult');
  assert.strictEqual(A.fishMontPick({hide: true}, [], LB, ph).v, null);
  let F = A.fishMontSet({}, 'f:A|f:B', {v: 'adult', a: 'a3', b: null, hide: false});
  assert.deepStrictEqual(F.mont, {'f:A|f:B': {v: 'adult', a: 'a3'}});
  F = A.fishMontSet(F, 'f:A|f:B', {hide: false});
  assert.deepStrictEqual(F.mont, {}, 'Auto with nothing hidden: automatic again');
});
