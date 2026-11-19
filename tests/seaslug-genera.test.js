require('./slot.js').testGuard();
// The sea slugs learn genera, not families (docs/ARCHITECTURE.md "Sea slugs"): core.js SUBJECTS seaslug unitRank
// 'genus' makes the genera the units of its circles from the start (core.js treeGen unit, treeGenUnits; app.js
// treeGenera completes them), its families structure only, no opt-in genus set; one engine (rule S1): the fish, whose
// SUBJECTS has no unitRank, keep their families first and their scientific genera as the opt-in set.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js'),
  C = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(src(f)),
  APP = src('app.js'),
  plain = x => JSON.parse(JSON.stringify(x)); // out of the vm's realm, for deepStrictEqual
const SEA = C.subjectOf('seaslug'),
  FISHS = C.subjectOf('fish'),
  F = json('seaslug.json'),
  GM = C.treeGameRead(json('seaslug-game.json')),
  photos = () => C.treePhotos({}, GM.photos, C.treeCur(SEA, json('curation.json')));

// treeGenera as app.js has it (its core.js helpers, as the app has them).
const ctx = {
  easyCover: C.easyCover,
  treeScoreTree: C.treeScoreTree,
  treeSpUnits: C.treeSpUnits,
  treeGenSets: C.treeGenSets,
  rankWeights: C.rankWeights
};
vm.createContext(ctx);
vm.runInContext(block(APP, 'function treeGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.treeGenera = treeGenera;', ctx);

test('the subject field: the sea slugs play their genera from the start, the fish and the corals their own rank', () => {
  assert.strictEqual(SEA.unitRank, 'genus');
  assert.strictEqual(SEA.rank, 'family', "the tree's top rank stays the family (the admin's tree pages read it)");
  assert.deepStrictEqual(
    C.SUBJECTS.map(S => [S.id, C.unitRankOf(S)]),
    [
      ['coral', 'genus'],
      ['fish', 'family'],
      ['seaslug', 'genus']
    ]
  );
  assert.ok(!('unitRank' in FISHS) && !('unitRank' in C.subjectOf('coral')), 'the fish and the corals keep their rank');
  assert.deepStrictEqual([SEA.one, SEA.many, SEA.optin], ['genus', 'genera', []]);
});

test('core.js treeGen unit genus: every genus of the circles a unit, in its best species’ circle; families structure only', () => {
  const X = C.treeGen(F, photos(), undefined, C.unitRankOf(SEA)),
    all = [...X.c1, ...X.c2, ...X.c3];
  assert.strictEqual(X.unit, 'genus');
  // every genus of seaslug.json, each once, by its circle (tools/seaslug_game.py: its best species')
  assert.deepStrictEqual([...all].sort(), F.genera.map(g => g.id).sort());
  [1, 2, 3].forEach(c =>
    assert.deepStrictEqual(
      X['c' + c],
      F.genera.filter(g => g.circle === c).map(g => g.id),
      'circle ' + c
    )
  );
  assert.ok(X.c1.length > 10 && X.c2.length > 10 && X.c3.length > 10, [X.c1.length, X.c2.length, X.c3.length].join());
  F.genera.forEach(G => {
    const g = X.gen[G.id],
      sp = new Set(G.species);
    assert.deepStrictEqual([g.rank, g.name, g.parent, g.circle, g.species], ['genus', G.name, G.family, G.circle, G.species], G.id);
    // its family's photos of its species, every one of them, and its own genus-level photos (gl)
    assert.deepStrictEqual(
      g.views.wide.map(p => p.f),
      X.gen[G.family].views.wide.filter(p => sp.has(p.sp) || (p.gl && p.sp === G.id)).map(p => p.f),
      G.id
    );
    // its look-alikes: its sibling genera
    assert.deepStrictEqual(
      [...g.look].sort(),
      F.genera
        .filter(o => o.family === G.family && o.id !== G.id)
        .map(o => o.id)
        .sort(),
      G.id
    );
  });
  // the families: in gen (the sheets, the blocks, a genus's parent), never a unit
  F.families.forEach(f => assert.ok(X.gen[f.id] && !X.gen[f.id].rank && !all.includes(f.id), f.id));
  assert.deepStrictEqual(X.winks, []);
});

test('the fish are unchanged: their own rank gives treeGen the families as before, with no unit mark', () => {
  const FJ = json('fish.json'),
    PH = json('fish-photos.json'),
    ph = C.treePhotos(PH.photos, C.treeGameRead(json('fish-game.json')).photos, null),
    a = C.treeGen(FJ, ph, PH.sheet),
    b = C.treeGen(FJ, ph, PH.sheet, C.unitRankOf(FISHS));
  assert.deepStrictEqual(b, a);
  assert.ok(!('unit' in a));
  assert.ok(a.c1.every(n => n.startsWith('f:')) && a.c1.length > 20);
  // and the sea slugs' tree read at the family (no unitRank) is the families' game it was
  const s = C.treeGen(F, photos());
  assert.deepStrictEqual([...s.c1, ...s.c2, ...s.c3].sort(), F.families.map(f => f.id).sort());
});

test('app.js treeGenera on genera from the start: each completed in its own circle, every species of the circles, no opt-in set', () => {
  const X = ctx.treeGenera(C.treeGen(F, photos(), undefined, 'genus'), F);
  assert.deepStrictEqual(plain(X.sci), []);
  F.genera.forEach(G => {
    const g = X.gen[G.id];
    assert.deepStrictEqual(
      plain([g.rank, g.one, g.parent, g.circle, g.species, g.names[0]]),
      ['genus', 'genus', G.family, G.circle, G.species, G.name],
      G.id
    );
    assert.ok(g.fam.startsWith(X.gen[G.family].name) && g.tl && typeof g.sum === 'string' && g.cm >= 0, G.id);
    assert.ok(!g.views.wide.length || g.cover === C.easyCover(g.views.wide).f, G.id);
  });
  assert.ok(X.c2.some(n => X.gen[n].circle === 2) && X.c3.every(n => X.gen[n].circle === 3));
  // the fish: their scientific genera stay an opt-in set (TREEU.sci), in every circle, each in its family's circle
  const FJ = json('fish.json'),
    Y = ctx.treeGenera(C.treeGen(FJ, {}), FJ);
  assert.ok(Y.sci.length > 200 && Y.sci.every(n => Y.gen[n].circle === Y.gen[Y.gen[n].parent].circle && Y.gen[n].rank === 'genus'));
  assert.ok([1, 2, 3].every(c => Y.sci.some(n => Y.gen[n].circle === c)));
  assert.ok(Y.c1.every(n => n.startsWith('f:')));
});

test('every sea-slug genus in play has photos at the photo target (Q377: start 6 a species)', () => {
  const X = C.treeGen(F, photos(), undefined, 'genus'),
    T = json('tools/seaslugs.json').photoTarget;
  [...X.c1, ...X.c2, ...X.c3].forEach(n => assert.ok(X.gen[n].views.wide.length >= T.start, `${n}: ${X.gen[n].views.wide.length}`));
});

// app.js rankOf: '' for the rank a subject's units are at, so the draw's own-rank rule (model.js rareOn), the choices
// (model.js distractors), the typed names (quiz.js typeMatch) and the log (quiz.js rk) read the sea slugs' genera as the
// fish's families and their families as another rank.
test('rankOf and the logged rank: the units’ rank is the subject’s own, in each subject', () => {
  const X = ctx.treeGenera(C.treeGen(F, photos(), undefined, 'genus'), F),
    FJ = json('fish.json'),
    Y = ctx.treeGenera(C.treeGen(FJ, {}), FJ),
    R = {};
  const c = {SUBJ: null, GX: n => R[n], unitRankOf: C.unitRankOf};
  vm.createContext(c);
  vm.runInContext(block(APP, 'const rankOf = n => {', '\n};\n', {through: 1, file: 'app.js'}) + '\nthis.rankOf = rankOf;', c);
  const at = (S, gen, n) => {
    c.SUBJ = S;
    Object.keys(R).forEach(k => delete R[k]);
    Object.assign(R, gen);
    return [c.rankOf(n), c.rankOf(n) || C.unitRankOf(S)];
  };
  assert.deepStrictEqual(at(SEA, X.gen, 'g:Chromodoris'), ['', 'genus']);
  assert.deepStrictEqual(at(SEA, X.gen, 'f:Chromodorididae'), ['family', 'family']);
  assert.deepStrictEqual(at(FISHS, Y.gen, 'f:Damselfishes'), ['', 'family']);
  assert.deepStrictEqual(at(FISHS, Y.gen, 'g:Chromis'), ['genus', 'genus']);
  assert.deepStrictEqual(at(C.subjectOf('coral'), {Acropora: {}}, 'Acropora'), ['', 'genus']);
  assert.deepStrictEqual(at(C.subjectOf('coral'), {}, 'nothing'), ['', 'genus']);
});

// A typed answer on a sea-slug genus question reads the genera only; a family name typed is told so (quiz.js typeKind:
// a question below the tree's top rank, as a fish genus question), never read as a slip of a genus.
test('typed: a sea-slug genus question reads genera, and a family typed gets the “that is a family” nudge', () => {
  const X = ctx.treeGenera(C.treeGen(F, photos(), undefined, 'genus'), F),
    Q = src('quiz.js'),
    names = C.treeTypeNames(X.gen, '', []),
    c = {
      SUBJ: SEA,
      GX: n => X.gen[n],
      unitRankOf: C.unitRankOf,
      typeElse: C.typeElse,
      typeMatchIn: C.typeMatchIn,
      typeNames: () => names,
      UNITS: {seaslug: {norm: C.typeNormAll, typeOther: rk => (rk === 'genus' ? {sci: F.genera.map(g => g.name), common: []} : null)}}
    };
  vm.createContext(c);
  vm.runInContext(
    block(APP, 'const rankOf = n => {', '\n};\n', {through: 1, file: 'app.js'}) +
      block(Q, 'const typeMatch = (text, rk', '// The nudge for a text typeKind reads', {file: 'quiz.js'}) +
      '\nthis.typeMatch = typeMatch; this.typeKind = typeKind;',
    c
  );
  const m = c.typeMatch('Chromodoris', '');
  assert.strictEqual(m && m.g, 'g:Chromodoris');
  assert.strictEqual(c.typeMatch('Chromodorididae', ''), null, 'a family is no answer to a genus question');
  assert.strictEqual(c.typeKind('Chromodorididae', ''), 'family');
  assert.strictEqual(c.typeKind('Zzzz', ''), '');
});

// The circles open as the fish's (app.js treeGate), counting genera: circle 2 once every circle-1 genus has been asked
// (and met), circle 3 once circle 1's plain mean reaches FISH_C3 (the sea slugs have no score).
test('treeGate on the sea slugs’ genera: circle 2 after every circle-1 genus asked, circle 3 at 50% on circle 1', () => {
  const X = C.treeGen(F, photos(), undefined, 'genus'),
    st = {asked: new Set(), score: 0},
    g = {
      TREEU: X,
      GX: n => X.gen[n],
      asked: n => st.asked.has(n),
      introduced: n => st.asked.has(n),
      headScore: () => null,
      progPct: L => (L === X.c1 ? Math.round(100 * st.score) : 0)
    };
  vm.createContext(g);
  vm.runInContext(
    block(APP, 'const FISH_C3 = {', '\n// Every family in play met', {file: 'app.js'}) +
      '\nthis.treeGate = treeGate; this.FISH_C3 = FISH_C3;',
    g
  );
  const [a2, a3] = [X.c2[0], X.c3[0]];
  assert.ok(
    X.c1.every(n => g.treeGate(n)),
    'circle 1 always'
  );
  X.c1.slice(0, -1).forEach(n => st.asked.add(n));
  assert.deepStrictEqual([g.treeGate(a2), g.treeGate(a3)], [false, false], 'one circle-1 genus not asked yet');
  st.asked.add(X.c1[X.c1.length - 1]);
  assert.deepStrictEqual([g.treeGate(a2), g.treeGate(a3)], [true, false]);
  st.score = 0.49;
  assert.strictEqual(g.treeGate(a3), false);
  st.score = 0.5;
  assert.strictEqual(g.treeGate(a3), true);
});

test('UNITS seaslug: no opt-in set, the genera in its words', () => {
  const U = block(APP, '\n  seaslug: {', '\ntreeAt(SUBJ.id);', {file: 'app.js'});
  assert.ok(/\n    sets: \[\]\n/.test(U), 'no opt-in set');
  assert.ok(!/sciOpen|TREEU\.sci/.test(U), 'no scientific-genera set');
  assert.ok(/Name the sea slug genus in the photo/.test(U) && /To learn a sea slug genus/.test(U));
  assert.ok(!/sea slug famil/i.test(U.replace(/\/\/[^\n]*/g, '')), 'no family wording left for the player');
});

// The admin reads the same units (reports.js repReg, admin.js unitRead with core.js unitRankOf): the Players page's and
// the Journey's slate are the genera, a photo shown by its genus, its family page through the family.
test('the admin registry: the sea slugs’ slate is their genera, the fish’s their families', () => {
  const R = require('../reports.js'),
    S = R.repReg(F, null, json('seaslug-game.json'), C.unitRankOf(SEA));
  assert.deepStrictEqual([...S.slate].sort(), F.genera.map(g => g.id).sort());
  const f = Object.keys(S.ph)[0];
  assert.ok(S.ph[f].entry.startsWith('g:') && S.fam[S.ph[f].entry] === S.gen[S.ph[f].entry].parent);
  const FJ = json('fish.json'),
    Fi = R.repReg(FJ, json('fish-photos.json'), json('fish-game.json'), C.unitRankOf(FISHS)),
    F0 = R.repReg(FJ, json('fish-photos.json'), json('fish-game.json'));
  assert.deepStrictEqual(Fi.slate, F0.slate);
  assert.ok(Fi.slate.every(n => n.startsWith('f:')));
  // the taxonomic groups the Heatmap's families sit in (admin-heatmap.js supOf): every genus's family has one; the fish none
  assert.deepStrictEqual(S.taxa.groups, F.taxa.groups);
  S.slate.forEach(g =>
    assert.ok(
      S.taxa.groups.some(x => x.n === S.gen[S.fam[g]].tg),
      g
    )
  );
  assert.strictEqual(Fi.taxa, undefined);
});

// The Journey's rank steps (admin-journey.js jSteps): a question below the units' rank, never the units themselves.
test('the Journey: a sea-slug genus question is no "Genus questions" step; a fish genus question still is', () => {
  const J = src('admin-journey.js'),
    {jSteps} = new Function(block(J, '// jsteps: begin', '// jsteps: end', {file: 'admin-journey.js'}) + '\nreturn {jSteps};')(),
    rec = () => ({circle: 1}),
    rows = [
      ['a', 1, 'g:Chromodoris'],
      ['a', 2, 'f:Chromodorididae']
    ];
  assert.deepStrictEqual(
    jSteps(rows, rec, SEA).map(s => s[2]),
    ['family']
  );
  assert.deepStrictEqual(
    jSteps([['a', 1, 'g:Chromis']], rec, FISHS).map(s => s[2]),
    ['genus']
  );
});

// The Learn page's taxonomic groups (the families in logical taxonomic groups, the true nudibranchs apart: Nudibranchia
// first, Doridina then Cladobranchia, then the other sea slugs by order), from WoRMS's classification
// (tools/seaslug_groups.json, rule C2) into seaslug.json taxa and each family's tgroup.
test('the taxonomic groups: Doridina, Cladobranchia, then the other orders; every family in one; the fish have none', () => {
  const G = json('tools/seaslug_groups.json'),
    titles = F.taxa.groups.map(g => g.title);
  assert.deepStrictEqual(titles, [
    'Nudibranchia · Doridina',
    'Nudibranchia · Cladobranchia',
    'Sacoglossa',
    'Cephalaspidea',
    'Aplysiida',
    'Pleurobranchida'
  ]);
  assert.ok(/WoRMS/.test(F.taxa.cite) && F.taxa.short === 'WoRMS');
  // every family in exactly one group, the nudibranchs (the order of tools/seaslugs.json, iNaturalist's group) in 1 and 2
  const order = new Map(json('tools/seaslugs.json').species.map(s => [s.family, s.group]));
  F.families.forEach(f => {
    assert.strictEqual(G.groups.filter(g => g.families.includes(f.name)).length, 1, f.name);
    assert.strictEqual(f.tgroup <= 2, order.get(f.name) === 'Nudibranchia', f.name);
    assert.ok(G.aphia[f.name] > 0, f.name);
  });
  // read by the engine: each family's tg and the tree's taxa; display only (the genera's draw fields are their own)
  const X = C.treeGen(F, photos(), undefined, 'genus');
  assert.deepStrictEqual(X.taxa, F.taxa);
  F.families.forEach(f => assert.strictEqual(X.gen[f.id].tg, f.tgroup, f.id));
  const FJ = json('fish.json'),
    Y = C.treeGen(FJ, {});
  assert.ok(!('taxa' in Y) && Object.values(Y.gen).every(g => !('tg' in g)));
});

test('seaslug_game.py: a family of the game in no taxonomic group fails the build, naming it', () => {
  const {spawnSync} = require('child_process'),
    code = `import sys\nsys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'tools'))})\nimport seaslug_game as g\ng.taxa({'cite': 'c', 'short': 's', 'groups': [{'title': 'A', 'families': ['X']}]}, ['X', 'Y'])`,
    r = spawnSync('python3', ['-c', code], {encoding: 'utf8'});
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /no group in tools\/seaslug_groups\.json for Y/);
});
