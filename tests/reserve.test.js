require('./slot.js').testGuard();
// The per-player reserve (Pierre, 2026-11-18 ~12:05 Manila: "En fait la réserve elle doit être définie par joueur. Il
// n'y a pas d'intérêt d'avoir une réserve globale"; it replaced #1057's fish-holdout.json): core.js reserveOf,
// reserveSplit, heldOf, resHash, reserveId; model.js examSet and genusDiff on the held lists; the |h log token on the
// exam's answers; the sheet's replay deciding alike (rules D8, D9). Every subject, one rule (rule S1).
// docs/LEARNING.md "The reserve in the game".
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const C = require('../core.js');
const cut = require('./block.js');
const {engine} = require('./rareease.js');

const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  json = f => JSON.parse(read(f));

test('fishObs: a photo’s observation, an iNaturalist one by its id alone', () => {
  assert.strictEqual(C.fishObs({f: 'x', o: 'https://www.inaturalist.org/observations/123'}), '123');
  assert.strictEqual(C.fishObs({f: 'x', o: '123'}), '123', 'the short form');
  const fb = 'https://www.fishbase.se/photos/PicturesSummary.php?ID=1&what=species&pic=A_u0.jpg';
  assert.strictEqual(C.fishObs({f: 'x', o: fb}), fb, 'a FishBase page whole');
  assert.strictEqual(C.fishObs({f: 'fish-s001-cand-9'}), 'fish-s001-cand-9', 'no observation: the file');
});

test('resHash and reserveId: fixed values, the same on every device and in the sheet', () => {
  // Pinned: a change to the hash would move every player's reserve (their exam's photos), so it changes only on purpose.
  assert.strictEqual(C.resHash(''), 'ab3e7c0b');
  assert.strictEqual(C.resHash('player one s1 10'), '2f222c72');
  assert.strictEqual(C.resHash('player two s1 10'), 'ebee9c50');
  // the characters as they come (a name with an accent: one code unit each, as the loop reads them)
  assert.strictEqual(C.resHash('é'), C.resHash('é'));
  // The account's name in any case or spacing (the sheet's Answers player), an anonymous device as the sheet logs it.
  assert.strictEqual(C.reserveId('  Player One '), 'player one');
  assert.strictEqual(C.reserveId('~anon abc123xyz0'), '~anon abc123xyz0');
  assert.strictEqual(C.reserveId(null), '');
});

// A made-up subject: one family f:A of two species (s1 100 observations, s2 12) with a genus g:A of s1 alone and a
// genus g:B of s2 alone, and a species unit of s1 (noex). n: observations per species; more: fields per photo.
const world = (n = {s1: 100, s2: 12}, more = {}) => {
  const ph = sp => Array.from({length: n[sp]}, (_, i) => ({f: `${sp}-${i}`, o: `${sp}o${i}`, sp, ...((more[sp] || {})[i] || {})})),
    s1 = ph('s1'),
    s2 = ph('s2');
  return {
    gen: {
      'f:A': {id: 'f:A', views: {wide: [...s1, ...s2]}},
      'g:A': {id: 'g:A', rank: 'genus', parent: 'f:A', views: {wide: s1.slice()}},
      'g:B': {id: 'g:B', rank: 'genus', parent: 'f:A', views: {wide: s2.slice()}},
      s1u: {id: 's1u', noex: 1, views: {wide: s1.slice()}}
    }
  };
};
const count = (R, sp) => [...R].filter(k => k.startsWith(sp + ' ')).length;

test('reserveOf: stable per player, whatever the build or the order of the photos', () => {
  const a = C.reserveOf(world(), 'Player One'),
    X = world();
  X.gen['f:A'].views.wide.reverse();
  X.gen['g:A'].views.wide.reverse();
  const b = C.reserveOf(X, ' player one');
  assert.ok(a.size > 0);
  assert.deepStrictEqual([...b].sort(), [...a].sort(), 'the same reserve on another device (another order, the name typed otherwise)');
  assert.strictEqual(C.reserveOf(world(), '').size, 0, 'no id: no reserve');
});

test('reserveOf: two players reserve different observations, so every photo is practised by others', () => {
  const ids = Array.from({length: 12}, (_, i) => 'p' + i),
    sets = ids.map(id => C.reserveOf(world(), id));
  assert.ok(
    sets.every(s => s.size === sets[0].size),
    'the same size for every player'
  );
  const union = new Set(sets.flatMap(s => [...s]));
  assert.ok(union.size > sets[0].size * 4, 'spread over the observations: ' + union.size);
  for (let i = 1; i < sets.length; i++) assert.notDeepStrictEqual([...sets[i]].sort(), [...sets[0]].sort(), ids[i]);
});

test('reserveOf: up to 15 per unit with an exam, the floors kept (30 per unit, 8 per species)', () => {
  // g:A (100 observations of s1) reaches 15, which its family f:A (112) holds too; g:B (12 of s2) is under its floor of
  // 30: it keeps all its photos, its family taking none of them.
  const R = C.reserveOf(world(), 'p');
  assert.strictEqual(count(R, 's1'), 15);
  assert.strictEqual(count(R, 's2'), 0, 'a thin genus keeps all its photos');
  // s2 at 40: g:B may hold up to 10 (30 kept).
  const R2 = C.reserveOf(world({s1: 100, s2: 40}), 'p');
  assert.ok(count(R2, 's2') >= 1 && count(R2, 's2') <= 10, 's2: ' + count(R2, 's2'));
  [
    [R, world()],
    [R2, world({s1: 100, s2: 40})]
  ].forEach(([S, W]) =>
    Object.values(W.gen)
      .filter(g => !g.noex)
      .forEach(g => {
        const L = g.views.wide,
          h = L.filter(p => S.has(p.sp + ' ' + p.o)).length;
        assert.ok(h <= 15 || g.id === 'f:A', g.id + ' ' + h);
        assert.ok(L.length - h >= 30 || h === 0, g.id + ' floor');
      })
  );
  // A family of six species of 10: in turn, each keeping 8 (two each), 48 left in practice.
  const many = {gen: {'f:M': {id: 'f:M', views: {wide: []}}}};
  for (let s = 0; s < 6; s++) for (let i = 0; i < 10; i++) many.gen['f:M'].views.wide.push({f: `m${s}-${i}`, o: `m${s}o${i}`, sp: 'm' + s});
  const RM = C.reserveOf(many, 'p');
  assert.strictEqual(RM.size, 12);
  for (let s = 0; s < 6; s++) assert.strictEqual(count(RM, 'm' + s), 2);
  // Four species of 10 (40 in all): 10 above the family's floor, but 2 each keeps 8: 8 reserved, 32 in practice.
  many.gen['f:M'].views.wide = many.gen['f:M'].views.wide.filter(p => p.sp < 'm4');
  assert.strictEqual(C.reserveOf(many, 'p').size, 8);
  // Three species of 12 (36): 6 above the floor, each species could give 4: the floor binds, 6 reserved.
  const three = {gen: {'f:T': {id: 'f:T', views: {wide: []}}}};
  for (let s = 0; s < 3; s++)
    for (let i = 0; i < 12; i++) three.gen['f:T'].views.wide.push({f: `t${s}-${i}`, o: `t${s}o${i}`, sp: 't' + s});
  assert.strictEqual(C.reserveOf(three, 'p').size, 6);
});

test('reserveOf: never Pierre’s own, an IMR or reference photo, nor a card’s photo; a whole observation', () => {
  // s1's first 60 observations: own, imr, a reference source's easy photo, a reference-level photo, then two plain ones
  // in turn.
  const tags = {};
  for (let i = 0; i < 60; i++) tags[i] = [{own: true}, {imr: true}, {rep: 1, e: 4, jt: 'p1g0sl1x'}, {e: 5, jt: 'p1g0sl1x'}, {}, {}][i % 6];
  const X = world({s1: 100, s2: 12}, {s1: tags});
  X.gen['f:A'].cover = 's1-4';
  X.gen['g:A'].featP = {s1: [X.gen['g:A'].views.wide[10]]};
  X.covers = {s1: X.gen['g:A'].views.wide[16]};
  // a second photo of observation s1o70, Pierre's own: the whole observation stays practice
  X.gen['f:A'].views.wide.push({f: 's1-70b', o: 's1o70', sp: 's1', own: true});
  const R = C.reserveOf(X, 'p');
  for (const k of R) {
    const i = +k.split(' ')[1].slice(3);
    assert.ok(i >= 60 || [4, 5].includes(i % 6), k);
    assert.ok(!['s1 s1o4', 's1 s1o10', 's1 s1o16', 's1 s1o70'].includes(k), k);
  }
  assert.strictEqual(count(R, 's1'), 15);
});

test('reserveSplit: the reserve out of every view, into held (marked ho, one copy), nothing else moved', () => {
  const X = world(),
    before = Object.fromEntries(Object.entries(X.gen).map(([k, g]) => [k, g.views.wide.map(p => p.f).sort()])),
    R = C.reserveOf(X, 'p');
  C.reserveSplit(X, R);
  Object.entries(X.gen).forEach(([k, g]) => {
    assert.ok(!g.views.wide.some(p => p.ho || R.has(p.sp + ' ' + p.o)), k + ': a reserved photo in its views');
    assert.ok(
      C.heldOf(g).every(p => p.ho && R.has(p.sp + ' ' + p.o)),
      k
    );
    assert.deepStrictEqual([...g.views.wide, ...C.heldOf(g)].map(p => p.f).sort(), before[k], k + ': the same photos in all');
  });
  assert.ok(!('held' in X.gen['g:B']), 'no held key without a reserved photo');
  const f0 = C.heldOf(X.gen['f:A'])[0];
  assert.strictEqual(
    C.heldOf(X.gen['g:A']).find(p => p.f === f0.f),
    f0,
    'one copy of a photo across the units'
  );
  assert.strictEqual(C.heldOf(X.gen.s1u).length, 15, 'a species unit (no exam) withholds them too');
  assert.ok(!world().gen['f:A'].views.wide.some(p => p.ho), 'the photos it was given are not marked');
});

test('reserveSplit: a coral genus’s views and game lists (applySlots sl), every view; the lists given never changed', () => {
  const col = (i, v) => ({f: `c${i}-${v}`, o: `https://www.inaturalist.org/observations/${i}`}),
    views = {wide: [], medium: [], macro: []};
  for (let i = 0; i < 50; i++) ['wide', 'medium', 'macro'].forEach(v => views[v].push(col(i, v)));
  const sl = Object.fromEntries(
      Object.entries(views).map(([v, L]) => [v, {feat: L.slice(0, 3), more: L.slice(3, 6), game: L.slice(), idkey: L.slice(0, 8)}])
    ),
    g = {id: 'Acropora', views, sl},
    X = {gen: {Acropora: g}},
    R = C.reserveOf(X, 'p');
  assert.strictEqual(R.size, 15, '50 colonies: 15 reserved, 35 in practice');
  assert.ok(
    [...R].every(k => k.startsWith('Acropora ')),
    'a unit with no species: the unit'
  );
  assert.ok(![...R].some(k => ['0', '1', '2'].includes(k.split(' ')[1])), 'the featured colonies stay practice');
  C.reserveSplit(X, R);
  ['wide', 'medium', 'macro'].forEach(v => {
    assert.strictEqual(C.heldOf(g, v).length, 15, v);
    assert.strictEqual(g.views[v].length, 35, v);
    assert.strictEqual(g.sl[v].game.length, 35, v);
    assert.ok(!g.sl[v].idkey.some(p => R.has('Acropora ' + C.fishObs(p))), v + ' idkey');
  });
  assert.strictEqual(views.wide.length, 50, 'the lists given are not changed (the rated world shares them)');
  assert.strictEqual(sl.wide.game.length, 50);
  // Codex review #1099: a photo Pierre keeps on the sheet only (curation use 'ref': in the view, not in the game list)
  // never reaches the exam through the reserve, and never counts as a game photo.
  const v2 = {wide: []};
  for (let i = 0; i < 50; i++) v2.wide.push(col(i, 'wide'));
  const ref = v2.wide.map(p => ({...p, f: p.f + '-ref'})),
    g2 = {id: 'Acropora', views: {wide: [...v2.wide, ...ref]}, sl: {wide: {feat: [], game: v2.wide.slice()}}},
    X2 = {gen: {Acropora: g2}},
    R2 = C.reserveOf(X2, 'p');
  C.reserveSplit(X2, R2);
  assert.strictEqual(C.heldOf(g2, 'wide').length, 15);
  assert.ok(!C.heldOf(g2).some(p => /-ref$/.test(p.f)), 'no sheet-only photo held for the exam');
  assert.ok(!g2.views.wide.some(p => R2.has('Acropora ' + C.fishObs(p))), 'the reserved colonies leave the sheet too');
});

// The real units: the fish (fishGen, app.js fishGenera), the sea slugs (the same tree engine) and the corals (data.json
// under applyCuration and applySlots), as the app builds them.
let GENERA = null;
const fishGenera = () => {
  if (GENERA) return GENERA;
  const ctx = vm.createContext({...C, Math, Map, Set, Object, Array, JSON, String, Number});
  return (GENERA = vm.runInContext('(' + cut(read('app.js'), 'function fishGenera(', '\n}\n', {through: 1, file: 'app.js'}) + ')', ctx));
};
const treeUnits = (id, files) => {
  const S = C.subjectOf(id),
    F = json(files.f),
    ph = files.ph ? json(files.ph) : {photos: {}},
    gm = C.fishGameRead(json(files.gm)),
    cur = C.treeCur(S, json('curation.json'));
  return fishGenera()(C.fishGen(F, C.fishPhotos(ph.photos, gm.photos, cur), ph.sheet, C.unitRankOf(S)), F);
};
const coralUnits = () => {
  const d = json('data.json'),
    cur = json('curation.json');
  C.applyCuration(d, cur);
  C.applySlots(d, cur, {picks: json('picks.json'), autoq: json('quality.json').q || {}});
  return d;
};
// [id, unit] of the units with an exam, a coral genus by its key (it has no id field)
const examUnits = X => Object.entries(X.gen).filter(([, g]) => g && !g.wink && !g.noex);
const keyOf = id => p => String(p.sp || id) + ' ' + C.fishObs(p);
const obsIn = (id, g) =>
  new Set([...Object.values(g.views || {}).flat(), ...Object.values(g.sl || {}).flatMap(s => (s && s.game) || [])].map(keyOf(id)));

for (const [name, mk, min] of [
  ['fish', () => treeUnits('fish', {f: 'fish.json', ph: 'fish-photos.json', gm: 'fish-game.json'}), 1000],
  ['sea slugs', () => treeUnits('seaslug', {f: 'seaslug.json', gm: 'seaslug-game.json'}), 100],
  ['corals', coralUnits, 50]
])
  test(`the real ${name}: the floors kept, two players apart, the split whole`, () => {
    const X = mk(),
      R = C.reserveOf(X, 'player one');
    assert.ok(R.size >= min, `${name}: ${R.size} reserved`);
    examUnits(X).forEach(([id, g]) => {
      const O = obsIn(id, g),
        h = [...O].filter(k => R.has(k)).length;
      assert.ok(!h || O.size - h >= 30, `${id}: ${O.size - h} left in practice`);
      assert.ok(h <= 15 || !g.rank, `${id}: ${h} reserved (a family may hold its genera's)`);
    });
    // a unit with no species (a coral genus): one of its own
    if (name === 'corals')
      assert.ok(
        [...R].every(k => X.gen[k.slice(0, k.indexOf(' '))]),
        'keyed by the genus'
      );
    const bySp = new Map();
    examUnits(X).forEach(([id, g]) =>
      obsIn(id, g).forEach(k => bySp.set(k.slice(0, k.indexOf(' ')), (bySp.get(k.slice(0, k.indexOf(' '))) || new Set()).add(k)))
    );
    bySp.forEach((O, s) => {
      const h = [...O].filter(k => R.has(k)).length;
      assert.ok(!h || O.size - h >= 8, `${s}: ${O.size - h} left`);
    });
    {
      const R2 = C.reserveOf(X, 'player two');
      let both = 0;
      R.forEach(k => R2.has(k) && both++);
      assert.ok(both < R.size * 0.5, `two players share ${both} of ${R.size}`);
    }
    const before = Object.fromEntries(examUnits(X).map(([id, g]) => [id, [...obsIn(id, g)].sort()]));
    C.reserveSplit(X, R);
    examUnits(X).forEach(([id, g]) => {
      assert.ok(
        !Object.values(g.views)
          .flat()
          .some(p => R.has(keyOf(id)(p))),
        id
      );
      const now = new Set([...obsIn(id, g), ...C.heldOf(g).map(keyOf(id))]);
      assert.deepStrictEqual([...now].sort(), before[id], id + ': its photos whole, views and held');
    });
  });

// model.js on a fish-like unit (tests/rareease.js engine): 20 practice observations and 8 reserved.
const unit = () => {
  const L = [],
    H = [];
  for (let i = 0; i < 20; i++) L.push({f: `p${i}`, o: `op${i}`, e: 1 + (i % 5)});
  for (let i = 0; i < 8; i++) H.push({f: `h${i}`, o: `oh${i}`, e: 1 + (i % 4), ho: 1});
  return {L, H};
};

test('examSet: the player’s reserved photos never shown first (the hardest), then never seen, then the least seen', () => {
  const {L, H} = unit(),
    E = engine('fish', L, {score: 0.9, held: H});
  for (let i = 0; i < 20; i++) {
    const p = E.examSet('u').shown[0];
    assert.ok(p.ho && /^h/.test(p.f), p.f);
  }
  assert.strictEqual(E.examSet('u').shown[0].e, 1, 'the hardest of them (photoDiff: the lowest ease)');
  // Every reserved photo shown (on another unit): a photo never seen, before any seen one.
  const seenH = Object.fromEntries(H.map(p => [p.f, [1, 1]])),
    F = engine('fish', L, {score: 0.9, held: H, others: {'f:X': {ps: seenH}}, ps: {p0: [2, 1], p1: [1, 0]}}),
    q = F.examSet('u').shown[0];
  assert.ok(!q.ho && !['p0', 'p1'].includes(q.f), 'a practice photo never seen: ' + q.f);
  // Every observation seen: the least seen on the unit of those never answered right on it (as before).
  const all = Object.fromEntries([...L, ...H].map((p, i) => [p.f, i === 19 ? [1, 0] : [3, 1]])),
    G = engine('fish', L, {score: 0.9, held: H, ps: all});
  assert.strictEqual(G.examSet('u').shown[0].f, 'p19');
  // No reserve (a thin unit, the corals): the same rule on its photos, as before.
  assert.ok(/^p/.test(engine('fish', L, {score: 0.9}).examSet('u').shown[0].f));
});

// Codex review #1057: exposure by observation (rule P4): a sibling photo of a reserved fish already shown waits.
test('examSet: a reserved observation already met (any photo of it) waits behind those never shown', () => {
  const {L} = unit(),
    H = [
      {f: 'x1', o: 'ox', e: 1, ho: 1},
      {f: 'x2', o: 'ox', e: 1, ho: 1},
      {f: 'y1', o: 'oy', e: 4, ho: 1}
    ],
    E = engine('fish', L, {score: 0.9, held: H, others: {'f:X': {ps: {x1: [1, 1]}}}});
  for (let i = 0; i < 10; i++) assert.strictEqual(E.examSet('u').shown[0].f, 'y1');
  const F = engine('fish', L, {score: 0.9, held: H});
  assert.ok(['x1', 'x2'].includes(F.examSet('u').shown[0].f));
});

test('photoSet never draws a reserved photo in practice (the views only)', () => {
  const {L, H} = unit(),
    E = engine('fish', L, {score: 0.9, held: H});
  for (let i = 0; i < 300; i++) assert.ok(!E.photoSet('u', null, 0, 4, 'k4').shown.some(p => p.ho));
});

test('quiz.js: a reserved photo (the exam’s) logged |h before |kN, |t and |x; read as the same mode', () => {
  const quiz = read('quiz.js'),
    model = read('model.js');
  assert.match(quiz, /set = ex \|\| photoSet\(/);
  assert.ok(!/heldSet|HELD\b/.test(quiz + model), 'no silent probe (Pierre, 2026-11-18)');
  const mq = cut(quiz, '  const mq =\n', ';\n', {through: 1, file: 'quiz.js'}) + 'mq;',
    mode = o =>
      vm.runInContext(
        mq,
        vm.createContext({
          modeBase: cur => cur,
          photoQuiz: cur => cur === 'quiz',
          AUTOD: false,
          FINDX: false,
          warm: false,
          k: 4,
          nc: 4,
          tq: null,
          exq: false,
          cur: 'quiz',
          ph: [{f: 'h0', ho: 1}],
          ...o
        })
      );
  assert.strictEqual(mode({}), 'quiz|h');
  assert.strictEqual(mode({warm: true, k: 3}), 'quiz|c|h|k3');
  assert.strictEqual(mode({tq: {}, exq: true}), 'quiz|h|t|x');
  assert.strictEqual(mode({exq: true}), 'quiz|h|x');
  assert.strictEqual(mode({ph: [{f: 'p0'}]}), 'quiz', 'a practice photo: as before');
  const gs = read('tools/sync/Code.gs'),
    guess_ = vm.runInNewContext('(' + /const guess_ = (\([\s\S]*?\n\});/.exec(gs)[1].replace(/;$/, '') + ')');
  for (const [m, ch] of [
    ['quiz|h', 'A B C D'],
    ['quiz|c|h|k3', 'A B C D'],
    ['quiz|h|k2', 'A B'],
    ['quiz|h|t|x', ''],
    ['quiz|h|x', 'A B C D'],
    ['quiz|s|h', 'A B C D']
  ]) {
    const plain = m.replace('|h', '');
    assert.strictEqual(guess_(m, ch), guess_(plain, ch), m);
    assert.strictEqual(C.guessOf(m, ch), C.guessOf(plain, ch), m);
    assert.strictEqual(C.fmtOf(m, ch.split(' ').filter(Boolean).length), C.fmtOf(plain, ch.split(' ').filter(Boolean).length), m);
    assert.strictEqual(C.kOf(m, ch), C.kOf(plain, ch), m);
    assert.ok(/^[A-Za-z0-9:|-]*$/.test(m), 'stored as it comes (Code.gs logAnswers_)');
  }
});

test('the replay decides alike: an answer on a reserved photo (|h, |h|x) replays as the same answer without the token', () => {
  const t0 = Date.UTC(2026, 10, 18),
    gen = {'f:X': {look: ['f:Y'], fam: 'X'}, 'f:Y': {look: ['f:X'], fam: 'Y'}},
    row = (i, m, ok) =>
      C.logRow(
        {
          id: 'a' + i,
          t: new Date(t0 + i * 1000).toISOString(),
          g: 'f:X',
          a: ok ? 'f:X' : 'f:Y',
          ok,
          m,
          ph: 'h' + (i % 4),
          ch: 'f:X f:Y',
          e: 0.7,
          th: 0.5,
          sc: {d: 0.2, r: 1}
        },
        'p'
      ),
    modes = ['quiz', 'quiz|h', 'quiz|c|k3', 'quiz|h|x', 'quiz|h|t|x', 'quiz|x'],
    rows = h => modes.flatMap((m, j) => [0, 1, 2].map(k => row(j * 3 + k, h ? m : m.replace('|h', ''), (j + k) % 3 ? 1 : 0)));
  assert.deepStrictEqual(C.replayProgress(rows(true), {gen}), C.replayProgress(rows(false), {gen}));
});

test('the sheet’s own script never reads a reserve: the tag logged with the answer is the record', () => {
  const gs = read('tools/sync/Code.gs'),
    own = gs.slice(0, gs.indexOf('const CORE_ = (function'));
  assert.ok(own.length > 1000);
  assert.ok(!/reserveOf|reserveSplit/.test(own));
});

// Codex review #1057: learnsim's truth from hashes (--truth gen) seeds the reserved photos' difficulties too.
test('learnsim and the rated world: the reserved photos get their own simulated difficulty; one player id per run', () => {
  const src = read('tools/learnsim.js'),
    seed = src.slice(src.indexOf('const GEN_D = {};'), src.indexOf('PSTAT = ps;'));
  assert.match(seed, /\.\.\.heldAll\(g\)\]\.forEach\(p => \{/);
  assert.match(seed, /GEN_D\[p\.f\] = d;/);
  // JSON, as the app's store reads it (Codex review #1099: a bare id was dropped and a random one made)
  assert.match(src, /localStorage\.setItem\('reefid-anon-id', JSON\.stringify\(aid\)\)/);
  assert.match(read('tools/ratedworld.js'), /C\.reserveSplit\(\{gen: G\}, R\)/);
});

// Codex review #1099: the rated world leaves Pierre's curated ★ covers and featured photos in practice, as the app does.
test('the rated world: a simulated player reserves no photo of Pierre’s picks; the same id, the same reserve', () => {
  const RW = require('../tools/ratedworld.js'),
    U = RW.unitsOf('fish'),
    picks = new Set(Object.values(U.covers).map(p => p.f)),
    W = RW.world(U, 1),
    gens = id => RW.engine(U, W, {seed: 1, id}).G,
    G = gens('~anon sim strongRA 1'),
    held = Object.values(G).flatMap(g => C.heldOf(g));
  assert.ok(picks.size > 0 && held.length > 1000, `${picks.size} picks, ${held.length} reserved photos`);
  assert.ok(!held.some(p => picks.has(p.f)), 'a curated pick reserved');
  const again = Object.values(gens('~anon sim strongRA 1')).flatMap(g => C.heldOf(g).map(p => p.f));
  assert.deepStrictEqual(again.sort(), held.map(p => p.f).sort());
});

test('the app splits every subject’s units for the player (no file, no subject named), and reads both lists', () => {
  const app = read('app.js'),
    sw = read('sw.js');
  assert.ok(!fs.existsSync(path.join(ROOT, 'fish-holdout.json')) && !fs.existsSync(path.join(ROOT, 'tools/holdout.py')));
  assert.ok(!/holdout\.json\?|\bho: \(\) =>|fishHeld/.test(app + sw + read('core.js') + read('model.js')), 'no held-out file read');
  assert.match(app, /FISH = reserveOn\(fishCurate\(fishGenera\(fishGen\(f, fishPhotos\(ph\.photos, gm\.photos, C\)/);
  assert.match(app, /applySlots\(d, CUR, \{picks: PICKS, autoq: AUTOQ\}\);\n  reserveOn\(d\);/);
  assert.match(app, /const reserveOn = X => reserveSplit\(X, reserveOf\(X, \(RESID = resId\(\)\)\)\);/);
  assert.match(read('sync.js'), /if \(typeof resSeen === 'function'\) resSeen\(\);/);
  const model = read('model.js');
  assert.match(model, /\.\.\.heldOf\(GX\(n\)\)\]\)\]\.filter\(p => p\.e\)/);
  assert.match(model, /of = v => \[\.\.\.gamePics\(n, v\), \.\.\.heldOf\(g, v\)\]/);
});

test('resId: the account’s name, else the device’s anonymous id as the sheet logs it', () => {
  const src = cut(read('app.js'), 'const resId = () =>', ';\n', {through: 1, file: 'app.js'}),
    run = ctx => vm.runInContext(src + '\nresId();', vm.createContext({reserveId: C.reserveId, ...ctx}));
  assert.strictEqual(run({SYNC: {name: 'Ana Lee', pin: '1234'}, anonId: () => 'x'}), 'ana lee');
  assert.strictEqual(run({SYNC: null, anonId: () => 'abc123xyz0'}), '~anon abc123xyz0');
  assert.strictEqual(run({}), '', 'neither (a harness): no reserve');
});
