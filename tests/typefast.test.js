require('./slot.js').testGuard();
// The faster typed-answer reading: core.js typeDist keeps three rows of its matrix instead of the whole one,
// typeMatchIn skips a name whose length is further from the text's than its tolerance, typeElse reads its lists'
// names once per norm, and treeTypeNames reads the names near a short form through an index by length. Each gives
// exactly the answers of the plain code, kept here as the reference: the same distances, matches, nudges and typed
// names on the real fish, sea slug and coral names, their slips, random texts and made-up trees.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  util = require('node:util');
const block = require('./block.js');
const C = require('../core.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));

// The plain code the fast one replaces, word for word.
function distRef(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
function matchRef(names, text, norm = C.typeNorm) {
  const t = norm(text);
  if (t.length < 3) return null;
  const all = names
    .map(x => ({...x, d: distRef(t, x.k)}))
    .filter(x => x.d <= C.TYPE.tol(x.k.length))
    .sort((a, b) => a.d - b.d);
  if (!all.length) return null;
  const best = all.filter(x => x.d === all[0].d),
    gs = [...new Set(best.map(x => x.g))];
  if (gs.length > 1) return {near: gs};
  return {
    g: best[0].g,
    old: best[0].old,
    exact: best[0].d === 0,
    ...(best[0].alt ? {alt: 1} : {}),
    ...(best[0].oft ? {oft: best[0].oft} : {})
  };
}
function elseRef(text, other, x = {}, norm = C.typeNorm) {
  const sci = new Set((x.sci || []).map(norm)),
    t = norm(text);
  if (!t || sci.has(t)) return '';
  const m = matchRef(
    (other || []).filter(o => !sci.has(norm(o.old))),
    text,
    norm
  );
  if (m && !m.near) {
    const imr = String((x.own && x.own(m.g)) || ''),
      own = !m.old || /i[dn]ae$/i.test(m.old) || [imr, ...imr.split(/\s*&\s*|\s+and\s+/)].some(n => n && norm(n) === norm(m.old));
    return own ? (x.rank ? x.rank(m.g) : '') || '' : 'common';
  }
  const c = matchRef(
    (x.common || []).filter(n => !sci.has(norm(n))).map(n => ({k: norm(n), g: 'common', old: ''})),
    text,
    norm
  );
  return c && !c.near ? 'common' : '';
}

// A seeded stream, so every run reads the same texts.
let seed = 4242;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  pick = L => L[Math.floor(rnd() * L.length)],
  ABC = 'abcdefghijklmnopqrstuvwxyz';
// One to three slips of a text: a letter left out, doubled, changed, or two neighbours swapped.
const slip = s => {
  let t = s;
  for (let n = 1 + Math.floor(rnd() * 3); n > 0 && t.length > 1; n--) {
    const i = Math.floor(rnd() * t.length),
      k = Math.floor(rnd() * 4);
    if (k === 0) t = t.slice(0, i) + t.slice(i + 1);
    else if (k === 1) t = t.slice(0, i) + t[i] + t.slice(i);
    else if (k === 2) t = t.slice(0, i) + pick(ABC) + t.slice(i + 1);
    else if (i < t.length - 1) t = t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2);
  }
  return t;
};

const F = read('fish.json'),
  D = read('data.json');
// The fish species' common names as entries (several per species, some shared), and the coral genera with their old
// names (core.js typeNamesOf), each with texts: every name, slips of them, random letters, short and empty ones.
const treeNames = [];
F.species.forEach(s =>
  [s.common, ...(s.cn || []).flat()]
    .filter(Boolean)
    .forEach((n, i) => treeNames.push({k: C.typeNormAll(n), g: s.id, old: i ? n : '', alt: i ? 1 : 0}))
);
const coralNames = C.typeNamesOf(
  [...Object.keys(D.gen), ...Object.keys((D.x || {}).gen || {})],
  n => D.gen[n] || ((D.x || {}).gen || {})[n]
);
const textsOf = (raw, n = 120) => [
  ...raw.slice(0, n),
  ...Array.from({length: 2 * n}, () => slip(pick(raw))),
  ...Array.from({length: n / 3}, () => Array.from({length: 2 + Math.floor(rnd() * 18)}, () => pick(ABC)).join('')),
  '',
  'ab',
  'Acropora sp.',
  'Pocil lopora'
];

test('typeDist: the distances of the whole matrix, on names and slips of every length', () => {
  const raw = [...treeNames.map(x => x.k), ...coralNames.map(x => x.k)];
  for (let i = 0; i < 3000; i++) {
    const a = rnd() < 0.5 ? pick(raw) : slip(pick(raw)),
      b = rnd() < 0.3 ? slip(a) : pick(raw);
    assert.strictEqual(C.typeDist(a, b), distRef(a, b), `${a} / ${b}`);
  }
  ['', 'a', 'ab', 'ba'].forEach(a =>
    ['', 'a', 'ab', 'ba', 'abc'].forEach(b => assert.strictEqual(C.typeDist(a, b), distRef(a, b), `${a} / ${b}`))
  );
});

test('typeMatchIn: the same reading as before, fish common names and coral genera', () => {
  const fishRaw = F.species.flatMap(s => [s.common, ...(s.cn || []).flat()]).filter(Boolean);
  // a sample of the fish names (the reference reads every name of the list at every text: slow on all of them)
  // (two made-up entries as close to one text: a "which one?")
  const fishSome = [...treeNames.filter((_, i) => i % 4 === 0), {k: 'reefgobyx', g: 'z1', old: ''}, {k: 'reefgobyy', g: 'z2', old: ''}];
  let near = 0,
    exact = 0,
    close = 0,
    none = 0;
  [...textsOf(fishRaw.filter((_, i) => i % 7 === 0)), 'Reef goby z'].forEach(t => {
    const m = C.typeMatchIn(fishSome, t, C.typeNormAll),
      ref = matchRef(fishSome, t, C.typeNormAll);
    // A name two species share (Twotone / Two-tone wrasse) reads as both (shared), where the reference reads "which
    // one?" (near) on the same species: the sample meets one because the main names come first.
    if (m && m.shared) assert.deepStrictEqual([...m.shared].sort(), [...ref.near].sort(), t);
    else assert.deepStrictEqual(m, ref, t);
    if (!m) none++;
    else if (m.near) near++;
    else if (m.exact) exact++;
    else close++;
  });
  // every kind of reading is met
  assert.ok(near && exact && close && none, JSON.stringify({near, exact, close, none}));
  const coralRaw = coralNames.map(x => x.old || x.g);
  textsOf(coralRaw).forEach(t => assert.deepStrictEqual(C.typeMatchIn(coralNames, t), matchRef(coralNames, t), t));
});

test('typeElse: the same nudge as before, read twice (the names kept from the first read)', () => {
  const first = x => String(x || '').split(/\s+/)[0],
    x = {
      sci: [...(F.genera || []).map(g => g.name), ...F.species.flatMap(s => [first(s.name), first(s.now)])].filter(Boolean),
      common: [...(F.genera || []).flatMap(g => [g.common, g.imr]), ...F.species.flatMap(s => [s.common, ...(s.cn || []).flat()])].filter(
        (n, i) => n && i % 5 === 0
      ),
      rank: () => 'family',
      own: g => (g.length % 2 ? 'Damselfish' : '')
    };
  const other = treeNames.filter((_, i) => i % 6 === 0),
    raw = [...x.sci.slice(0, 40), ...x.common.slice(0, 80), ...other.map(o => o.old).filter(Boolean)];
  const kinds = new Set();
  for (let r = 0; r < 2; r++)
    textsOf(raw, 45)
      .filter((_, i) => i % 2 === r)
      .forEach(t => {
        const k = C.typeElse(t, other, x, C.typeNormAll);
        assert.strictEqual(k, elseRef(t, other, x, C.typeNormAll), t);
        kinds.add(k);
      });
  assert.ok(kinds.has('') && kinds.has('common'), [...kinds].join(','));
});

// core.js fHash (easyRank's last tie-break) loops over the name instead of spreading it into an array: the same hash,
// astral characters included (both read a code point's first unit), so the same order of equal photos.
test('easyRank: equal photos in the order of the name hash, as before', () => {
  const ref = f => [...String(f)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261),
    names = [...Array.from({length: 300}, (_, i) => `fish-s${i}-cand-${(i * 7919) % 100003}`), 'fi1', 'é', '🐟x', 'x🐠', '', 'Acropora'],
    L = names.map(f => ({f, e: 3}));
  assert.deepStrictEqual(
    C.easyRank(L).map(p => p.f),
    names.slice().sort((a, b) => ref(a) - ref(b))
  );
});

// core.js treeTypeNames as it was, word for word: every short form read against every name and short form. It runs
// inside core.js's own source (in place of the new one), so it reads the same helpers (typeNormAll, typeDist, TYPE,
// typeWiden, typeForms, typeKnown, typeOff).
function treeTypeNamesRef(gen, drop = '', known = []) {
  const out = [],
    // sc: the species a name designates when it names part of the unit only; one key of a unit read by two
    // names takes the wider (no sc: the whole unit; "Surgeonfish", the label's singular, over the sub-entry)
    add = (k, g, x, i, oft, sc) => {
      if (!k) return;
      const o = out.find(y => y.k === k && y.g === g);
      if (o) return typeWiden(o, sc);
      out.push({k, g, old: i ? x : '', alt: i ? 1 : 0, nm: x, ...(oft ? {oft} : {}), ...(sc ? {sc} : {})});
    },
    scOf = (g, x) => (g.scopes || {})[x],
    oftOf = (g, k) => (g.oft || []).find(([, o]) => typeNormAll(o) === k);
  Object.values(gen || {}).forEach(g =>
    (g.names || [g.name]).forEach((x, i) => add(typeNormAll(x), g.id, x, i, oftOf(g, typeNormAll(x)), scOf(g, x)))
  );
  const d = typeNormAll(drop);
  if (!d) return out;
  const cut = new RegExp("^([A-Za-z][A-Za-z '-]*?)[ -]*" + d + '(?:es)?$', 'i'),
    short = out
      .map(o => {
        const x = typeNormAll(o.old) === o.k ? o.old : (gen[o.g].names || [gen[o.g].name])[0],
          m = String(x || '').match(cut),
          k = m ? typeNormAll(m[1]) : '';
        // the short form and its plural, and the name's own plural or singular ("Triggers", "Triggerfishes",
        // "Frogfish": plain right answers, not spellings to fix)
        const one = o.k.endsWith(d + 'es') ? [o.k.slice(0, -2), x.replace(/es$/i, '')] : o.k.endsWith(d) ? [o.k + 'es', x + 'es'] : null;
        return m && k.length >= 3 && k !== o.k
          ? [
              {k, g: o.g, x: m[1].trim(), oft: o.oft, sc: o.sc},
              {k: k + 's', g: o.g, x: m[1].trim() + 's', oft: o.oft, sc: o.sc},
              ...(one ? [{k: one[0], g: o.g, x: one[1].trim(), own: !o.old, oft: o.oft, sc: o.sc}] : [])
            ]
          : [];
      })
      .flat(),
    near = (a, b) => typeDist(a, b) <= TYPE.tol(Math.min(a.length, b.length));
  short
    .filter(s => ![...out, ...short].some(o => o.g !== s.g && near(s.k, o.k)))
    .forEach(s => add(s.k, s.g, s.x, s.own ? 0 : 1, s.oft, s.sc));
  // The other number of every common name, as the name it comes from (its own name's: the unit's own, alt 0); never a
  // scientific name's (a unit of a scientific rank, a family's sciNames: "Zebrasomas" is no plural), which keeps its
  // spelling step.
  Object.values(gen || {})
    .filter(g => !g.rank)
    .forEach(g =>
      (g.names || [g.name]).forEach(
        (x, i) =>
          !(g.sciNames || []).includes(x) &&
          typeForms(x).forEach(y => add(typeNormAll(y), g.id, y, i, oftOf(g, typeNormAll(x)), scOf(g, x)))
      )
    );
  typeKnown(out, known);
  typeOff(out, known);
  return out;
}

// core.js's source with treeTypeNames replaced (by the reference, or a mutant of the new one), loaded as a module.
const CORE_SRC = fs.readFileSync(path.join(__dirname, '..', 'core.js'), 'utf8'),
  TTN = block(CORE_SRC, '  function treeTypeNames(', '\n  }\n', {through: 1, file: 'core.js'}),
  coreWith = fn => {
    const m = {exports: {}};
    new Function(
      'module',
      'exports',
      CORE_SRC.replace(TTN, () => fn)
    )(m, m.exports);
    return m.exports;
  };

// A made-up tree whose short forms often fall within the tolerance of another unit's name or short form: names of a
// few letters at every length around the tolerance's step (6 / 7 letters), some the same stem as another unit's, some
// a slip of one (a letter left out, doubled, changed, two neighbours swapped), each with a word "fish" or none.
const madeUp = () => {
  const A = 'aeinorst',
    tails = [' fish', 'fish', 'fishes', ' fishes', '-fish', ' Fish', ''],
    stems = [],
    stem = () => {
      const r = rnd(),
        w = r < 0.2 && stems.length ? pick(stems) : r < 0.55 && stems.length ? slip(pick(stems)) : '';
      return w || Array.from({length: 2 + Math.floor(rnd() * 8)}, () => pick(A)).join('');
    },
    gen = {};
  for (let i = 0, n = 3 + Math.floor(rnd() * 25); i < n; i++) {
    const names = Array.from({length: 1 + Math.floor(rnd() * 3)}, () => {
      const w = stem();
      stems.push(w);
      return w[0].toUpperCase() + w.slice(1) + pick(tails);
    });
    gen['u' + i] = {id: 'u' + i, name: names[0], names, ...(rnd() < 0.15 ? {rank: 'genus'} : {})};
  }
  return gen;
};

test('treeTypeNames: the names of the pairwise reading, in its order, on every tree; its mutants caught', () => {
  seed = 2026;
  const SL = read('seaslug.json'),
    drop = C.subjectOf('fish').typeDrop,
    X = C.treeGen(F, {}, {}),
    sp = new Map(F.species.map(s => [s.id, s])),
    genera = [];
  // a genus unit per fish.json genus of circle 1, as tests/typednames.test.js builds them (app.js treeGenera); the
  // units the app reads (app.js UNITS fish names): no species, a genus only when it is in the game (sciNow)
  F.genera.forEach(G => {
    const L = (G.species || []).map(id => sp.get(id)).filter(s => s && s.circle === 1);
    if (L.length && X.gen[G.family] && X.gen[G.family].circle === 1)
      ((X.gen[G.id] = {id: G.id, name: G.name, rank: 'genus', names: [G.name]}), genera.push(G.id));
  });
  const unitsIn = sci =>
      Object.fromEntries(Object.entries(X.gen).filter(([n, g]) => g.rank !== 'species' && (g.rank !== 'genus' || sci.has(n)))),
    cur = {
      razorfish: {'f:Wrasses': 'off', 'f:Shrimpfishes': 'often'},
      Tuskfish: {'f:Wrasses': 'on'},
      'sea pig': {'f:Wrasses': 'on'},
      Hogfish: {'f:Wrasses': 'off'},
      Chromis: {'f:Damselfishes': 'often'},
      Tang: {'f:Surgeonfishes': 'often'}
    },
    slugs = Object.fromEntries(Object.entries(C.treeGen(SL, {}, undefined, 'genus').gen).filter(([, g]) => g.rank !== 'species')),
    corals = Object.fromEntries(Object.keys(D.gen).map(n => [n, {id: n, name: n, rank: 'genus'}]));
  const cases = [
    ...[new Set(), new Set(genera), new Set(genera.filter(() => rnd() < 0.5))].flatMap((sci, i) => [
      [`fish ${i}`, unitsIn(sci), drop, C.treeNameIndex(F)],
      [`fish ${i}, Pierre's exceptions`, unitsIn(sci), drop, C.treeNameIndex(F, cur)]
    ]),
    ['fish, no name index', unitsIn(new Set(genera)), drop, []],
    ['sea slugs', slugs, C.subjectOf('seaslug').typeDrop || '', []],
    ['sea slugs, a word dropped', slugs, 'doris', []],
    ['corals, a word dropped', corals, 'pora', []],
    ...Array.from({length: 200}, (_, i) => [`made-up ${i}`, madeUp(), 'fish', []])
  ];
  const ref = coreWith('  ' + treeTypeNamesRef.toString().replace('treeTypeNamesRef', 'treeTypeNames') + '\n'),
    want = cases.map(([, gen, drop, known]) => ref.treeTypeNames(gen, drop, known));
  cases.forEach(([what, gen, drop, known], i) => assert.deepStrictEqual(C.treeTypeNames(gen, drop, known), want[i], what));
  // Each mutant of the new reading gives other names on at least one tree: the cases meet a short form within the
  // tolerance of another unit's name at the window's edge (one letter of difference on a short name, two on a long
  // one), of a key two units share, and of its own unit's names only.
  const W = 'Math.abs(m - n) <= TYPE.tol(Math.min(m, n))',
    G = '(gs.size > 1 || !gs.has(s.g))';
  [
    ['a window one letter narrower', W, 'Math.abs(m - n) < TYPE.tol(Math.min(m, n))'],
    ['one letter at most on a long name', W, 'Math.abs(m - n) <= Math.min(1, TYPE.tol(Math.min(m, n)))'],
    ['the same length only', W, 'm === n'],
    ['a key another unit shares with this one left out', G, '!gs.has(s.g)'],
    ["the unit's own names read as another's", G, 'true'],
    ['no short form ever within the tolerance', '&& near(s.k, k)) return true', '&& false) return true']
  ].forEach(([what, from, to]) => {
    assert.strictEqual(TTN.split(from).length, 2, `${what}: ${from} occurs once in treeTypeNames`);
    const M = coreWith(TTN.replace(from, () => to));
    assert.ok(
      cases.some(([, gen, drop, known], i) => !util.isDeepStrictEqual(M.treeTypeNames(gen, drop, known), want[i])),
      `mutant not caught: ${what}`
    );
  });
});
