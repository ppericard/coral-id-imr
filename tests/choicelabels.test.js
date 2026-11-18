require('./slot.js').testGuard();
// A multiple-choice question never shows two choices of one label (two fish species may carry the same common name;
// nothing is blocked, but the game avoids the ambiguity): model.js distractors and customChoices
// keep the first of each label (choiceKey, choiceApart) and take the next distractor in place of the other. model.js's
// own code runs in Node; the units are real fish species labelled as a multiple-choice question would show them
// (app.js cnShow: the IMR name for a player at IMR, the main name for the others), on the real fish.json pairs.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const core = require('../core.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  F = read('fish.json'),
  byName = n => F.species.find(s => s.name === n);

// The player's first name (app.js cnFirst, which cnShow returns).
const cnShow = (s, imr) => {
  const L = (s.cn || []).map(n => n[0]);
  return L[imr && Number.isInteger(s.cni) && L[s.cni] ? s.cni : 0] || '';
};

// model.js's wrong choices on the species of fish.json, each unit a species labelled as player imr sees it.
// units: other units instead (the game's own, below).
function model(imr, look = {}, units = null) {
  const src = fs.readFileSync(path.join(ROOT, 'model.js'), 'utf8'),
    GEN =
      units ||
      Object.fromEntries(
        F.species
          .filter(s => s.circle && s.cn)
          .map(s => [
            s.id,
            // also: its listed names with their spellings (app.js fishGenera), read by model.js choiceKeys
            {name: cnShow(s, imr), also: (s.cn || []).flat(), look: look[s.id] || [], fam: s.family, ig: s.family, forms: []}
          ])
      ),
    ctx = {
      P: {},
      PCONF: {},
      CONF: core.CONF,
      confScore: core.confScore,
      pairConf: core.pairConf,
      GX: n => GEN[n],
      rankOf: () => '',
      imrFormsOf: () => [],
      ability: () => 0,
      formatAt: a => [Math.min(3, Math.max(0, a / 0.18))],
      pick: L => L[Math.floor(Math.random() * L.length)],
      shuffle: L => L.slice().sort(() => Math.random() - 0.5),
      weight: () => 1
    };
  vm.createContext(ctx);
  vm.runInContext(
    block(src, 'function wpick', '// Which genus to ask next') +
      block(src, 'const trapsFor = ', '// Once the whole file is in') +
      '\nthis.M = {distractors, customChoices, choiceKey, choiceKeys, choiceApart};',
    ctx
  );
  return {M: ctx.M, label: n => GEN[n].name};
}
const id = n => byName(n).id,
  all = () => true;

test('the real pairs: a choice of the target’s label never shows; the next distractor takes its place', () => {
  // Outside IMR, Pomacentrus armillatus and P. opisthostigma both show "Brown damsel" (iNaturalist's default and the
  // IMR name); at IMR, P. armillatus shows its own IMR name, Borneo damsel, so both may be choices.
  const t = id('Pomacentrus armillatus'),
    o = id('Pomacentrus opisthostigma'),
    rest = ['Pomacentrus moluccensis', 'Pomacentrus pavo', 'Chromis viridis'].map(id);
  [false, true].forEach(imr => {
    const {M, label} = model(imr);
    assert.strictEqual(label(t) === label(o), !imr, imr ? 'IMR players' : 'other players');
    for (let k = 0; k < 4; k++) {
      const ch = [...M.distractors(t, [t, o, ...rest], k, all)];
      assert.strictEqual(ch.length, 3, `${k} traps`);
      if (!imr) assert.deepStrictEqual(ch.sort(), [...rest].sort(), `${k} traps: the next distractor in place of ${label(o)}`);
      assert.strictEqual(new Set(ch.map(label)).size, 3);
    }
    // The other way round: opisthostigma asked, armillatus never beside it outside IMR; at IMR, among the choices drawn.
    let met = 0;
    for (let r = 0; r < 40; r++) met += M.distractors(o, [t, o, ...rest], r % 4, all).includes(t) ? 1 : 0;
    assert.ok(imr ? met > 0 : met === 0, `${imr ? 'IMR players' : 'other players'}: ${met} of 40`);
  });
});

test('two distractors of one label: one only, whichever rule ranks it first (traps or easy choices, the custom quiz)', () => {
  // Twospot wrasse (Halichoeres biocellatus, Oxycheilinus bimaculatus) for every player; Yellowtail / Yellow-tail wrasse
  // (Anampses meleagrides, Diproctacanthus xanthurus) outside IMR, read as one label (letters only).
  const pairs = [
    ['Halichoeres biocellatus', 'Oxycheilinus bimaculatus', [false, true]],
    ['Anampses meleagrides', 'Diproctacanthus xanthurus', [false]]
  ];
  const t = id('Thalassoma lunare'),
    rest = ['Halichoeres hortulanus', 'Coris gaimard', 'Gomphosus varius', 'Cheilinus fasciatus'].map(id);
  pairs.forEach(([a, b, who]) =>
    who.forEach(imr => {
      const A = id(a),
        B = id(b);
      // Declared look-alikes of the target: both are its traps.
      const {M, label} = model(imr, {[t]: [A, B]});
      assert.strictEqual(M.choiceKey(A), M.choiceKey(B), `${label(A)} / ${label(B)}`);
      const list = [t, A, B, ...rest];
      for (let r = 0; r < 60; r++) {
        const k = r % 4,
          ch = [...M.distractors(t, list, k, all)],
          cu = [...M.customChoices(t, [t, A], list, k, all)];
        [ch, cu].forEach((L, i) => {
          assert.strictEqual(L.length, 3, `${i ? 'custom' : 'photo'} quiz, ${k} traps`);
          assert.ok(!(L.includes(A) && L.includes(B)), `${a} and ${b} together: ${L.map(label)}`);
          assert.strictEqual(new Set(L.map(M.choiceKey)).size, 3, L.map(label).join(', '));
        });
        // From 2 traps, one of the pair is still a trap: the one ranked first.
        if (k >= 2) assert.ok(ch.includes(A) || ch.includes(B), `${k} traps: ${ch.map(label)}`);
      }
    })
  );
  // The custom quiz's own choices hold one of the pair, the top-up from the other units never brings the other.
  const {M} = model(false);
  const A = id('Halichoeres biocellatus'),
    B = id('Oxycheilinus bimaculatus');
  for (let r = 0; r < 30; r++) {
    const cu = [...M.customChoices(t, [t, A], [t, A, B, ...rest], 1, all)];
    assert.ok(cu.includes(A) && !cu.includes(B), cu.join(','));
  }
});

// The species level: a wrong choice whose label is another listed name of the target (outside IMR,
// on a photo of Forcipiger flavissimus, "Longnose butterflyfish", the main name of F. longirostris and a listed name of
// F. flavissimus, typed right). model.js choiceKeys: never a choice of any listed name of the target. The pairs on the real
// fish.json, as each player type reads the labels: 5 outside IMR, 9 at IMR; none of them is ever offered.
test('a wrong choice never carries another listed name of the target: the real pairs, outside IMR and at IMR', () => {
  const norm = x =>
      x
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z]/g, ''),
    L = F.species.filter(s => s.circle && s.cn);
  [
    [false, 5],
    [true, 9]
  ].forEach(([imr, want]) => {
    const {M, label} = model(imr),
      pairs = [];
    L.forEach(t => {
      const own = norm(label(t.id)),
        keys = new Set(t.cn.flat().map(norm));
      L.forEach(o => o !== t && norm(label(o.id)) !== own && keys.has(norm(label(o.id))) && pairs.push([t.id, o.id]));
    });
    assert.strictEqual(pairs.length, want, `${imr ? 'IMR' : 'other'}: ${pairs.map(([t, o]) => `${t}/${label(o)}`)}`);
    if (!imr) assert.ok(pairs.some(([t, o]) => t === id('Forcipiger flavissimus') && o === id('Forcipiger longirostris')));
    const rest = ['Chromis viridis', 'Pomacentrus pavo', 'Thalassoma lunare', 'Coris gaimard'].map(id);
    pairs.forEach(([t, o]) => {
      assert.ok(M.choiceKeys(t).has(M.choiceKey(o)));
      for (let k = 0; k < 4; k++) {
        const ch = [...M.distractors(t, [t, o, ...rest], k, all)],
          cu = [...M.customChoices(t, [t, o], [t, o, ...rest], k, all)];
        assert.ok(!ch.includes(o) && !cu.includes(o), `${label(t)}: ${label(o)} offered (${k} traps)`);
        assert.strictEqual(ch.length, 3);
      }
    });
  });
});

test('choiceApart: the first of each label, none of a label taken', () => {
  const {M} = model(false),
    [a, b, c] = ['Halichoeres biocellatus', 'Oxycheilinus bimaculatus', 'Thalassoma lunare'].map(id);
  assert.deepStrictEqual([...M.choiceApart([a, b, c])], [a, c]);
  assert.deepStrictEqual([...M.choiceApart([b, a, c])], [b, c]);
  assert.deepStrictEqual([...M.choiceApart([a, c], [b])], [c]);
  assert.deepStrictEqual([...M.choiceApart([])], []);
});

test('no two units of one rank in today’s game share a label: the draw is unchanged where no name is shared', () => {
  // The fish units (app.js fishGen, fishGenera on the real fish.json): the entries and the scientific genera, by rank; the
  // corals' genera are their names. Read as model.js choiceKey reads a label.
  const APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'),
    PH = read('fish-photos.json'),
    ctx = {
      DOM: {EX: 0.9},
      easyCover: core.easyCover,
      fishScoreTree: core.fishScoreTree,
      fishSpUnits: core.fishSpUnits,
      fishGenSets: core.fishGenSets,
      rankWeights: core.rankWeights
    };
  vm.createContext(ctx);
  vm.runInContext(
    block(APP, 'function fishGenera(X, F) {', '\n}\n', {through: 1, file: 'app.js'}) + '\nthis.fishGenera = fishGenera;',
    ctx
  );
  const X = ctx.fishGenera(core.fishGen(F, PH.photos), F),
    {M} = model(false, {}, X.gen);
  const byRank = {};
  Object.entries(X.gen).forEach(([n, g]) => (byRank[g.rank || ''] = byRank[g.rank || ''] || []).push([M.choiceKey(n), n]));
  assert.ok(Object.keys(byRank).length >= 3, Object.keys(byRank).join(','));
  // The species units (app.js fishGenera) may share a label: only the shared first names this player type
  // reads (here outside IMR: imrNow not loaded), each on two species, kept apart by choiceApart (tests below).
  const shared = {};
  Object.entries(byRank).forEach(([rk, L]) => {
    const seen = new Map();
    L.forEach(([k, n]) => {
      if (rk === 'species' && seen.has(k)) return void (shared[k] = [seen.get(k), n]);
      assert.ok(!seen.has(k), `${rk || 'entry'}: ${n} and ${seen.get(k)} share a label`);
      seen.set(k, n);
    });
  });
  assert.deepStrictEqual(Object.keys(shared).sort(), ['browndamsel', 'seagrasswrasse', 'twospotwrasse', 'yellowtailwrasse']);
  // The corals: a genus's label is its name (no record name: choiceKey reads the id).
  const D = read('data.json'),
    CK = model(false, {}, {}).M.choiceKey,
    coral = Object.keys(D.gen || {}).map(n => CK(n));
  assert.ok(coral.length >= 30, String(coral.length));
  assert.strictEqual(new Set(coral).size, coral.length, 'two coral genera of one label');
});

// An "Again" after a mix-up (quiz.js planPhoto) shows the two units of the mix-up, so it never asks
// a unit the other one names (model.js choiceNames). Outside IMR a photo of F. longirostris ("Longnose butterflyfish")
// answered "Forceps butterflyfish" queues the pair: its Again asks F. longirostris only, never F. flavissimus between
// "Longnose butterflyfish" (one of its listed names, typed right) and "Forceps butterflyfish". At IMR the labels turn
// round (F. flavissimus shows "Longnose butterflyfish", a listed name of F. longirostris): the Again asks F. flavissimus
// only. Each of the two named by the other: no Again. quiz.js planPhoto's own code runs in Node, the game around it stubbed.
function againOf(GEN) {
  const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  let picked = false;
  const ctx = {
    GX: n => GEN[n],
    pool: () => Object.keys(GEN),
    CUSTOM_H: 'practice/custom/play',
    customSel: () => null,
    holdEase: () => 0,
    CONTRAST: {GAP: 2},
    introReady: () => true,
    closed: () => false,
    pick: L => ((picked = true), L[Math.floor(Math.random() * L.length)]),
    // Past the Again's branch (no unit picked for it): the rest of the planner is not loaded.
    rustNow: () => {
      if (!picked) throw new Error('past the Again');
    },
    cbIn: () => false,
    recallAt: () => 1,
    uname: n => GEN[n].name,
    shuffle: L => L,
    photoSet: () => ({shown: []})
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(src('model.js'), "// A choice's label as its button shows it", '// The units of L whose label') +
      'let rematch = [], twoAt = -Infinity, twoPair = "";\n' +
      block(src('quiz.js'), "function planPhoto(cur = 'quiz', at = answersSoFar()) {", '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.M = {choiceNames, planPhoto, queue: p => (rematch = [{pair: p, at: 5}], twoAt = -Infinity), left: () => [rematch.length, twoAt]};',
    ctx
  );
  // The question planned 5 answers after the mix-up queued pair (target first): its unit, or null with no Again.
  return pair => {
    ctx.M.queue(pair);
    picked = false;
    let q = null;
    try {
      q = ctx.M.planPhoto('quiz', 10);
    } catch (e) {
      assert.strictEqual(e.message, 'past the Again');
    }
    assert.strictEqual(ctx.M.left()[0], 0, 'the pair leaves the queue either way');
    if (!q) {
      assert.strictEqual(ctx.M.left()[1], -Infinity, 'no Again: the contrast spacing untouched');
      return null;
    }
    assert.ok(q.again && q[2].length === 2 && pair.every(n => q[2].includes(n)));
    return q[1];
  };
}
test('an Again never asks a unit the other choice names: the Forcipiger pair, outside IMR and at IMR', () => {
  const fl = id('Forcipiger flavissimus'),
    lo = id('Forcipiger longirostris'),
    unit = (n, imr) => {
      const s = F.species.find(x => x.id === n);
      return {name: cnShow(s, imr), also: (s.cn || []).flat()};
    },
    asked = (imr, pair) => {
      const run = againOf(Object.fromEntries([fl, lo, ...pair].map(n => [n, unit(n, imr)])));
      return new Set(Array.from({length: 40}, () => run(pair)));
    };
  [
    [false, lo],
    [true, fl]
  ].forEach(([imr, only]) => {
    // either order of the mix-up (which was the target), the same unit asked
    assert.deepStrictEqual([...asked(imr, [lo, fl])], [only], imr ? 'IMR' : 'other');
    assert.deepStrictEqual([...asked(imr, [fl, lo])], [only], imr ? 'IMR' : 'other');
  });
  // A pair whose names are apart: either unit.
  const [a, b] = ['Pomacentrus moluccensis', 'Pomacentrus pavo'].map(id);
  assert.deepStrictEqual([...asked(false, [a, b])].sort(), [a, b].sort());
  // Each named by the other: no Again.
  const run = againOf({A: {name: 'Alpha', also: ['Alpha', 'Beta']}, B: {name: 'Beta', also: ['Beta', 'Alpha']}});
  assert.strictEqual(run(['A', 'B']), null);
});
// A duel never pairs two units one label names (quiz.js duelPick and planDuel's link, model.js choiceNames): outside IMR,
// Pomacentrus armillatus and P. opisthostigma both show "Brown damsel", a duel "Brown damsel or Brown damsel?"
// either answer of which is right. quiz.js's own duelPick and planDuel run here on the real fish species.
function duelOf(GEN, pairs) {
  const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
    ctx = {
      GX: n => GEN[n],
      UNITS: {fish: {pairs: () => pairs}},
      SUBJ: {id: 'fish'},
      dataLooks: () => [],
      weight: () => 1,
      mixedUp: () => 0,
      confusable: () => false,
      isClassic: () => false,
      unlocked: () => Object.keys(GEN),
      photoSet: () => ({shown: [1]}),
      pick: L => L[0],
      introduced: () => true,
      holdEase: () => 0,
      cover: () => null,
      uname: n => GEN[n].name
    };
  vm.createContext(ctx);
  vm.runInContext(
    block(src('model.js'), "// A choice's label as its button shows it", '// The units of L whose label') +
      block(src('quiz.js'), 'function duelPick(list', '\n}\n', {through: 1, file: 'quiz.js'}) +
      block(src('quiz.js'), 'function planDuel(a, b)', '\n}\n', {through: 1, file: 'quiz.js'}) +
      '\nthis.M = {duelPick, planDuel};',
    ctx
  );
  return ctx.M;
}
test('a duel never pairs two units one label names: the Brown damsel pair, outside IMR and at IMR', () => {
  const [ar, op, mo] = ['Pomacentrus armillatus', 'Pomacentrus opisthostigma', 'Pomacentrus moluccensis'].map(id),
    units = imr =>
      Object.fromEntries(
        [ar, op, mo].map(n => {
          const s = F.species.find(x => x.id === n);
          return [n, {name: cnShow(s, imr), also: (s.cn || []).flat()}];
        })
      );
  // Outside IMR: the shared-label pair never comes, by the draw or by a link; another pair still does.
  const out = duelOf(units(false), [
    [ar, op],
    [ar, mo]
  ]);
  for (let i = 0; i < 40; i++) assert.deepStrictEqual(out.duelPick([ar, op, mo]), [ar, mo]);
  assert.strictEqual(duelOf(units(false), [[ar, op]]).duelPick([ar, op, mo]), null);
  assert.deepStrictEqual(out.planDuel(ar, op)[2], [ar, mo], 'a link to the pair gets a normal duel');
  assert.strictEqual(out.planDuel(ar, op)[0], 'quiz-duel');
  // At IMR, P. armillatus shows its own IMR name (Borneo damsel), but "Brown damsel" is one of its listed names, so the
  // choice names it too (choiceNames, as an Again): still no duel of the two. Its pair with P. moluccensis duels.
  const imr = duelOf(units(true), [
    [ar, op],
    [ar, mo]
  ]);
  assert.notStrictEqual(units(true)[ar].name, units(true)[op].name);
  for (let i = 0; i < 40; i++) assert.deepStrictEqual(imr.duelPick([ar, op, mo]), [ar, mo]);
  assert.strictEqual(imr.planDuel(ar, mo)[0], `quiz-duel|${ar}|${mo}`);
});
