// The faster typed-answer reading (performance pass, 2026-11-09): core.js typeDist keeps three rows of its matrix
// instead of the whole one, typeMatchIn skips a name whose length is further from the text's than its tolerance, and
// typeElse reads its lists' names once per norm. Each gives exactly the answers of the code before, kept here as the
// reference: the same distances, matches and nudges on the real fish and coral names, their slips and random texts.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));

// The code before the pass, word for word.
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
const fishNames = [];
F.species.forEach(s =>
  [s.common, ...(s.cn || []).flat()]
    .filter(Boolean)
    .forEach((n, i) => fishNames.push({k: C.typeNormAll(n), g: s.id, old: i ? n : '', alt: i ? 1 : 0}))
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
  const raw = [...fishNames.map(x => x.k), ...coralNames.map(x => x.k)];
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
  const fishSome = [...fishNames.filter((_, i) => i % 4 === 0), {k: 'reefgobyx', g: 'z1', old: ''}, {k: 'reefgobyy', g: 'z2', old: ''}];
  let near = 0,
    exact = 0,
    close = 0,
    none = 0;
  [...textsOf(fishRaw.filter((_, i) => i % 7 === 0)), 'Reef goby z'].forEach(t => {
    const m = C.typeMatchIn(fishSome, t, C.typeNormAll);
    assert.deepStrictEqual(m, matchRef(fishSome, t, C.typeNormAll), t);
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
  const other = fishNames.filter((_, i) => i % 6 === 0),
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
