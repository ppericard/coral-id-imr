// The fish global score as built (Pierre, 2026-11-04 the formula, 2026-11-08 Q242 the commonness weights and the
// square-root display; docs/FISH_PATH.md "My progress (fish)"): core.js rankWeights, treeScore and fishScoreTree, and the
// subject's constants (SUBJECTS fish score).
const test = require('node:test');
const assert = require('node:assert');
const C = require('../core.js');
const F = require('../fish.json');

const K = C.SUBJECTS.find(s => s.id === 'fish').score;
const near = (x, y, d = 1e-9) => assert.ok(Math.abs(x - y) <= d, `${x} ≠ ${y}`);

test('rankWeights: 1/√ of the rank by count, ties share their mean rank, zeros count the least, order free', () => {
  const w = C.rankWeights([10, 5, 5, 0, 0, 0]);
  near(w[0], 1);
  near(w[1], 1 / Math.sqrt(2.5));
  near(w[2], w[1]);
  near(w[3], 1 / Math.sqrt(5));
  assert.ok(w[5] === w[3] && w[3] > 0, 'every zero the same weight, never nothing');
  const v = C.rankWeights([0, 5, 'x', 10, 0, 5, null]);
  near(v[3], 1);
  near(v[1], v[5]);
  assert.ok(v[2] === v[0] && v[6] === v[0], 'anything but a positive number counts 0');
  assert.deepStrictEqual(C.rankWeights([]), []);
});

// A small tree with every kind of unit: two families of two circles, three species (one with two common names).
const T = {
  f: [
    ['f:A', 2, 1],
    ['f:B', 0.5, 3]
  ],
  s: [
    [1, 'g:X', 's:1', ['n:1a', 'n:1b'], 1],
    [1, 'g:X', 's:2', ['n:2'], 1],
    [0.5, 'g:Y', 's:3', ['n:3'], 3]
  ]
};
const units = {
  f: ['f:A', 'f:B'],
  g: ['g:X', 'g:Y'],
  sci: ['s:1', 's:2', 's:3'],
  com: ['n:1a', 'n:1b', 'n:2', 'n:3']
};
const know = (...kinds) => Object.fromEntries(kinds.flatMap(k => units[k]).map(u => [u, {mx: 1}]));

test('treeScore: the anchors of Q242 (√ of 25 / 55 / 80 / 85 / 90 / 100%)', () => {
  const pct = P => C.treeScore(P, T, K).pct;
  assert.strictEqual(pct({}), 0);
  assert.strictEqual(pct(know('f')), 50, 'families only');
  assert.strictEqual(pct(know('f', 'g')), 74, 'families and every genus: √0.55');
  assert.strictEqual(pct(know('f', 'com')), 89, 'every common name: √0.80');
  assert.strictEqual(pct(know('f', 'sci')), 92, 'every scientific name: √0.85');
  assert.strictEqual(pct(know('f', 'g', 'com')), 95, 'every common name and every genus: √0.90');
  assert.strictEqual(pct(know('f', 'g', 'sci', 'com')), 100, 'both names of every species');
  near(C.treeScore(know('f', 'com'), T, K).raw, 0.8);
  near(C.treeScore(know('f', 'sci'), T, K).raw, 0.85);
});

test('treeScore: components from the same computation, weighted, per circle', () => {
  // Family A only (weight 2 of 2.5), and the genus X (its two species weigh 2 of 2.5).
  const R = C.treeScore({'f:A': {mx: 1}, 'g:X': {mx: 1}}, T, K);
  near(R.entries, 2 / 2.5);
  near(R.genera, 2 / 2.5);
  near(R.common, 0);
  near(R.scientific, 0, 0);
  near(R.S, (2 * 0.5) / 2.5, 1e-12);
  near(R.credit, 0.8 * R.S);
  near(R.raw, 0.25 * R.entries + 0.75 * R.credit);
  assert.strictEqual(R.pct, Math.round(100 * Math.sqrt(R.raw)));
  near(R.by[1].entries, 1);
  near(R.by[3].entries, 0);
  near(R.by[1].genera, 1);
  // A common name half known: C is the mean of the species' names, so all of them are needed.
  const H = C.treeScore({'n:1a': {mx: 1}}, T, K);
  near(H.common, (1 * 0.5) / 2.5);
  // The genus credit is half the genus's bar, never above the species' own scientific bar.
  near(C.treeScore({'g:X': {mx: 1}, 's:1': {mx: 1}}, T, K).S, (1 + 0.5) / 2.5);
});

test('treeScore: a species with no common name at all (Q247) has no common branch; its scientific name alone takes it to 1', () => {
  const U = {
      f: [['f:A', 2, 1]],
      s: [
        [1, 'g:X', 's:1', ['n:1'], 1],
        [1, 'g:X', 's:2', null, 1]
      ]
    },
    R = C.treeScore({'f:A': {mx: 1}, 's:1': {mx: 1}, 's:2': {mx: 1}, 'n:1': {mx: 1}}, U, K);
  assert.strictEqual(R.pct, 100, 'everything known: 100%');
  near(R.common, 1, 1e-12); // over the one species that has a common name
  const Q = C.treeScore({'n:1': {mx: 1}}, U, K);
  near(Q.common, 1, 1e-12);
  near(Q.credit, 11 / 15 / 2, 1e-12);
  near(C.treeScore({'s:2': {mx: 1}}, U, K).credit, 1 / 2, 1e-12, 'its credit is S');
  assert.strictEqual(C.treeScore({'s:2': {mx: 1}}, U, K).units['s:2'], 1, 'each unit with its own bar');
});

test('treeScore: a species packed with others of its genus scores the same', () => {
  const U = {
      f: [['f:A', 2, 1]],
      s: [
        [1, 'g:X', '', [], 1],
        [1, 'g:X', '', [], 1],
        [0.5, '', '', [], 1]
      ]
    },
    Pk = {
      f: U.f,
      s: [
        [2, 'g:X', '', [], 1],
        [0.5, '', '', [], 1]
      ]
    },
    P = {'f:A': {mx: 1}, 'g:X': {ok: 9, ko: 1, ds: 0.6, dp: C.DOM_PRIOR}};
  assert.deepStrictEqual(C.treeScore(P, U, K), C.treeScore(P, Pk, K));
});

test('fishScoreTree on fish.json: every family of the slate, every game species once, weights by commonness', () => {
  const gen = {},
    c = {1: [], 2: [], 3: []};
  F.families.forEach(f => ((gen[f.id] = {circle: f.circle}), c[f.circle].push(f.id)));
  F.genera.forEach(g => {
    const f = F.families.find(x => x.id === g.family);
    if (f && f.circle === 1) gen[g.id] = {rank: 'genus'};
  });
  const X = {c1: c[1], c2: c[2], c3: c[3], gen},
    Tr = C.fishScoreTree(X, F),
    sp = new Map(F.species.map(s => [s.id, s])),
    game = F.families.flatMap(f => f.species.filter(id => sp.has(id))),
    w = C.rankWeights(game.map(id => (sp.get(id).present || {}).dauinU || 0)),
    sum = a => a.reduce((t, x) => t + x, 0);
  assert.strictEqual(Tr.f.length, F.families.length);
  near(sum(Tr.s.map(e => e[0])), sum(w), 0.01);
  near(sum(Tr.f.map(e => e[1])), sum(w), 0.01);
  // A family weighs the sum of its species' weights.
  const dam = F.families.find(f => f.id === 'f:Damselfishes');
  near(Tr.f.find(e => e[0] === dam.id)[1], sum(dam.species.map(id => w[game.indexOf(id)])), 1e-3);
  // Observers, not observations (Codex review #730): a species photographed again and again by a few divers (Canthigaster
  // valentini: about 240 observations from about 40 observers) weighs by its observers.
  const wObs = C.rankWeights(game.map(id => (sp.get(id).present || {}).dauin || 0)),
    cv = F.species.find(x => x.name === 'Canthigaster valentini'),
    i = game.indexOf(cv.id),
    fcv = F.families.find(f => f.species.includes(cv.id));
  assert.ok(wObs[i] - w[i] > 0.2, `observations would weigh it ${wObs[i]}, observers ${w[i]}`);
  near(Tr.f.find(e => e[0] === fcv.id)[1], sum(fcv.species.map(id => w[game.indexOf(id)])), 1e-3);
  // Packed: a genus unit of the game (circle 1) once per circle, the species without one under ''.
  assert.ok(Tr.s.every(e => e[1] === '' || gen[e[1]]));
  // A species with no common name in fish.json gets null (Q247), never packed with named ones.
  const none = game.filter(id => !sp.get(id).common);
  assert.ok(Tr.s.filter(e => e[3] === null).length >= Math.min(1, none.length));
  assert.ok(Tr.s.length < 200 && JSON.stringify(Tr).length < 9000, 'small enough for the sheet (a script property)');
  // Today (no species units): families only 50%, families and every genus of the game 69% (the genera exist for
  // circle 1 only).
  const all = Object.fromEntries([...Tr.f.map(e => e[0]), ...Tr.s.map(e => e[1]).filter(Boolean)].map(k => [k, {mx: 1}]));
  assert.strictEqual(C.treeScore(Object.fromEntries(Tr.f.map(e => [e[0], {mx: 1}])), Tr, K).pct, 50);
  assert.strictEqual(C.treeScore(all, Tr, K).pct, 69);
});
