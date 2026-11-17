require('./slot.js').testGuard();
// The fish held-out photo set (tools/holdout.py; ROADMAP "A held-out photo set"; Pierre, 2026-11-16, Q385; 2026-11-18:
// "Il en faut suffisament pour refaire l'examen plusieurs fois, si et seulement si on a assez de photos par ailleurs"):
// 15 per exam unit (a family, a scientific genus), across its species in turn, never fewer than 8 left in practice per
// species; never Pierre's own, a reference source's or a reference-level photo, nor a surprise-only species; a whole
// observation in or out (rule P4); a fixed hash order; sticky when photos are added. Made-up fixtures, then the committed
// fish-holdout.json against the real files.
const test = require('node:test'),
  assert = require('node:assert'),
  crypto = require('crypto'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// Runs tools/holdout.py's function fn on the JSON arguments, returns its JSON result.
const py = (fn, ...args) =>
  JSON.parse(
    execFileSync(
      'python3',
      ['-c', `import sys, json; sys.path.insert(0, 'tools'); import holdout as h\nprint(json.dumps(h.${fn}(*json.load(sys.stdin))))`],
      {cwd: ROOT, encoding: 'utf8', input: JSON.stringify(args), maxBuffer: 64 << 20}
    )
  );
// The same with module constants set first (the variants' parameters: GENUS_KEEP, RATIO, FLOOR).
const pyWith = (set, fn, ...args) =>
  JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import sys, json; sys.path.insert(0, 'tools'); import holdout as h\nfor k, v in ${JSON.stringify(set)}.items(): setattr(h, k, v)\nprint(json.dumps(h.${fn}(*json.load(sys.stdin))))`
      ],
      {cwd: ROOT, encoding: 'utf8', input: JSON.stringify(args), maxBuffer: 64 << 20}
    )
  );
const RULE = JSON.parse(
  execFileSync('python3', ['-c', "import sys, json; sys.path.insert(0, 'tools'); import holdout as h; print(json.dumps(h.RULE))"], {
    cwd: ROOT,
    encoding: 'utf8'
  })
);
const rank = o =>
  crypto
    .createHash('sha256')
    .update(RULE.salt + ':' + o)
    .digest('hex');
const byRank = L => [...L].sort((a, b) => (rank(a) < rank(b) ? -1 : 1));

// A game record: an ordinary judged photo (ease 3, not of reference level) of species sp, observation o.
const rec = (sp, o, k = {}) => ({f: `fish-${sp}-cand-${o}`, o: String(o), sp, e: 3, jt: 'p1g0sl1', ...k});
const game = (...L) => ({photos: {t01: L.flat()}});
const many = (sp, n, from = 1000) => Array.from({length: n}, (_, i) => rec(sp, from + i));
// f:A a family of circle 2 (no genus unit), f:B one of circle 1 with two scientific genera, f:W a surprise-only one.
const FISH = {
  families: [
    {id: 'f:A', circle: 2, species: ['s1', 's2']},
    {id: 'f:B', circle: 1, species: ['s3', 's4', 's5'], genera: ['g:X', 'g:Y']},
    {id: 'f:W', species: ['s9'], wink: {photos: []}}
  ],
  genera: [
    {id: 'g:X', family: 'f:B', species: ['s3', 's4']},
    {id: 'g:Y', family: 'f:B', species: ['s5']}
  ],
  species: ['s1', 's2', 's3', 's4', 's5'].map(id => ({id, circle: id < 's3' ? 2 : 1}))
};
// The take mechanics on small fixtures, the unit floor off (FLOOR 0: below, its own test).
const held = (G, prev = null, set = {FLOOR: 0}) => pyWith(set, 'build', G, FISH, prev);
const first = (L, n) =>
  byRank(L.map(p => p.o))
    .slice(0, n)
    .sort();

test('15 per exam unit, across its species in turn, 8 always left in practice per species', () => {
  assert.deepStrictEqual(RULE, {unit: 'exam', target: 15, keep: 8, genusKeep: 8, ratio: 0, floor: 30, salt: 'fish-holdout'});
  assert.deepStrictEqual(py('exam_units', FISH), [
    ['f:A', ['s1', 's2']],
    ['f:B', ['s3', 's4', 's5']],
    ['g:X', ['s3', 's4']],
    ['g:Y', ['s5']]
  ]);
  // s1 100 observations, s2 10 (2 to spare): in turn, s2 runs out after 2, s1 gives the rest
  const H = held(game(many('s1', 100), many('s2', 10, 5000)));
  assert.strictEqual(H.s1.length, 13);
  assert.strictEqual(H.s2.length, 2);
  // a unit that cannot reach 15 holds what it can: 12 observations, 4 held out; 8 or fewer, none
  assert.strictEqual(held(game(many('s1', 12))).s1.length, 4);
  assert.deepStrictEqual(held(game(many('s1', 8))), {});
  // 30 observations, 27 of them Pierre's own: the 3 eligible ones only
  const own = many('s1', 27).map(p => ({...p, own: true}));
  assert.strictEqual(held(game(own, many('s1', 3, 5000))).s1.length, 3);
});

test('the families first, then each scientific genus topped up to 15', () => {
  // f:B: 5 from each species; g:X (s3, s4) has 10, takes 5 more in turn; g:Y (s5) has 5, takes 10 more
  const G = game(many('s3', 40, 1000), many('s4', 40, 2000), many('s5', 40, 3000)),
    H = held(G);
  assert.deepStrictEqual([H.s3.length, H.s4.length, H.s5.length], [8, 7, 15]);
  assert.deepStrictEqual(H.s3, first(many('s3', 40, 1000), 8));
});

// One helper for every exam unit (holdout.py take; the integrator's option B on #1057, Pierre, 2026-11-18: "si et
// seulement si on a assez de photos par ailleurs"): a unit takes only from species that keep 8 in practice after it.
test('take(): a thin genus holds what it can, a rich genus reaches 15, a family across its species; never a species under 8', () => {
  const left = (G, H) =>
    Object.fromEntries(Object.entries(py('pool', G, FISH)).map(([sp, O]) => [sp, Object.keys(O).length - (H[sp] || []).length]));
  // a thin genus: g:Y (s5) has 12 observations, so 4 to spare; f:B took its share first, g:Y tops up to what s5 can give
  const thin = game(many('s3', 40, 1000), many('s4', 40, 2000), many('s5', 12, 3000)),
    T = held(thin);
  assert.strictEqual(T.s5.length, 4);
  assert.strictEqual(left(thin, T).s5, 8);
  // a rich genus: s5 with 40 observations reaches its 15
  const rich = game(many('s3', 40, 1000), many('s4', 40, 2000), many('s5', 40, 3000));
  assert.strictEqual(held(rich).s5.length, 15);
  // a family: f:A across s1 (9 observations, 1 to spare) and s2 (60): 1 from s1, the rest from s2
  const fam = game(many('s1', 9), many('s2', 60, 5000)),
    F = held(fam);
  assert.deepStrictEqual([F.s1.length, F.s2.length], [1, 14]);
  for (const [G, H] of [
    [thin, T],
    [fam, F]
  ])
    assert.ok(
      Object.values(left(G, H)).every(n => n >= 8),
      JSON.stringify(left(G, H))
    );
  // the helper itself: the same rule called directly on a unit
  const E = {a: ['1', '2', '3'], b: ['4', '5', '6', '7']},
    h = {a: [], b: []};
  assert.strictEqual(py('take', h, E, {a: 1, b: 4}, ['a', 'b']), 5);
});

// Learning first (Pierre, 2026-11-18 06:48: "Si on n'a pas assez de photos, ben on privilégie l'apprentissage"): a
// unit holds back only from a real surplus, what leaves it FLOOR (30) observations in practice; RATIO, the variant the
// learning check did not keep, as a parameter.
test('learning first: a unit holds back only above 30 observations in practice', () => {
  const on = G => held(G, null, {});
  assert.deepStrictEqual(on(game(many('s1', 30))), {}, 'a thin unit holds back nothing');
  assert.strictEqual(on(game(many('s1', 40))).s1.length, 10, '40 in play: 10 held, 30 left');
  assert.strictEqual(on(game(many('s1', 100))).s1.length, 15, 'a rich unit reaches 15');
  // a thin genus in a rich family: the family takes its 15, the genus g:Y (s5, 32 observations) only 2 in all
  const G = game(many('s3', 60, 1000), many('s4', 60, 2000), many('s5', 32, 3000)),
    H = on(G);
  assert.strictEqual(H.s5.length, 2);
  // RATIO 2 (off): practice at least twice the held-out ones, 30 in play: 10 held
  assert.strictEqual(held(game(many('s1', 30)), null, {FLOOR: 0, RATIO: 2}).s1.length, 10);
});

test("never Pierre's own, a reference source's or a reference-level photo, nor a surprise-only species", () => {
  const G = game(
    many('s1', 40),
    rec('s1', 1, {own: true}),
    rec('s1', 2, {rep: 'inaturalist'}),
    rec('s1', 3, {e: 5, jt: 'p1g0sl1'}), // the reference look, judged very easy: reference level (core.js refLevel)
    // one observation, two photos: one of them his own, so the whole observation stays in practice (rule P4)
    rec('s1', 4),
    {...rec('s1', 4, {own: true}), f: 'fish-s1-cand-4b'},
    many('s9', 40, 3000)
  );
  for (let i = 0; i < 5; i++) {
    const H = held(G);
    assert.ok(!('s9' in H), 'a surprise-only species holds nothing out');
    for (const o of ['1', '2', '3', '4']) assert.ok(!H.s1.includes(o), o);
    G.photos.t01.push(...many('s1', 10, 10000 + 10 * i));
  }
  // a reference-level photo of ease 5 without the reference look is an ordinary one
  assert.deepStrictEqual(py('pool', game(rec('s2', 7, {e: 5, jt: 'p2g0sl1'})), FISH), {s2: {7: true}});
});

test('the first eligible observations in the hash order, the same at every run', () => {
  const G = game(many('s1', 70), many('s2', 25, 4000)),
    H = held(G);
  assert.deepStrictEqual(H, held(G));
  assert.deepStrictEqual(H.s1, first(many('s1', 70), 8));
  assert.deepStrictEqual(H.s2, first(many('s2', 25, 4000), 7));
  // an observation keyed by its short id whatever the record's form (fish_short: the full address reads as the id)
  const full = many('s2', 25, 4000).map(p => ({...p, o: 'https://www.inaturalist.org/observations/' + p.o}));
  assert.deepStrictEqual(held(game(many('s1', 70), full)).s2, H.s2);
});

test('sticky: added photos never move a held-out observation; gone ones leave; 8 always stay in practice', () => {
  const old = many('s1', 60),
    H = held(game(old));
  assert.strictEqual(H.s1.length, 15);
  // 60 more observations: the same 15 (the unit is at its target)
  const more = [...old, ...many('s1', 60, 2000)];
  assert.deepStrictEqual(held(game(more), H), H);
  // a held-out observation gone from play leaves the set; the unit tops up by the same hash order
  const gone = H.s1[0],
    H3 = held(game(more.filter(p => p.o !== gone)), H);
  assert.ok(!H3.s1.includes(gone));
  assert.strictEqual(H3.s1.length, 15);
  assert.ok(H.s1.filter(o => o !== gone).every(o => H3.s1.includes(o)));
  // a held-out observation that became Pierre's own leaves the set too
  const mine = H.s1[1],
    H4 = held(game(more.map(p => (p.o === mine ? {...p, own: true} : p))), H);
  assert.ok(!H4.s1.includes(mine));
  // down to 20 observations in play, 15 of them held out: 3 go back to practice, the last in the hash order first
  const kept = [...old.filter(p => H.s1.includes(p.o)), ...old.filter(p => !H.s1.includes(p.o)).slice(0, 5)],
    H5 = held(game(kept), H);
  assert.deepStrictEqual(
    H5.s1,
    byRank(H.s1)
      .slice(0, kept.length - RULE.keep)
      .sort()
  );
});

test('stale(): the file is out of date when its rule or its set differs', () => {
  const doc = read('fish-holdout.json');
  assert.strictEqual(py('stale', doc, doc.held), false);
  assert.strictEqual(py('stale', {...doc, rule: {...doc.rule, target: 10}}, doc.held), true);
  assert.strictEqual(py('stale', doc, {...doc.held, s0: ['1']}), true);
  assert.strictEqual(py('stale', null, {}), true);
});

test('fish-holdout.json is what the rule gives on fish-game.json and fish.json (holdout.py --check)', () => {
  const doc = read('fish-holdout.json'),
    G = read('fish-game.json'),
    F = read('fish.json');
  assert.deepStrictEqual(py('build', G, F, doc.held), doc.held);
  assert.match(execFileSync('python3', ['tools/holdout.py', '--check'], {cwd: ROOT, encoding: 'utf8'}), /observations held out/);
  // on the real data: every held-out observation eligible, each species with 8 or more left in practice
  const P = py('pool', G, F);
  for (const [sp, L] of Object.entries(doc.held)) {
    assert.ok(
      L.every(o => P[sp][o] === true),
      sp
    );
    assert.ok(Object.keys(P[sp]).length - L.length >= RULE.keep, sp);
  }
  // every family reaches its 15; nearly every scientific genus too (those short have too few photos to spare)
  const S = py('stats', G, F, doc.held);
  // every exam unit holds nothing or keeps 30 or more in practice (learning first); most families still reach 15
  const sp = Object.fromEntries(Object.entries(P).map(([s, O]) => [s, Object.keys(O).length]));
  for (const [u, L] of py('exam_units', F)) {
    const S2 = [...new Set(L)].filter(s => s in sp),
      n = S2.reduce((t, s) => t + sp[s], 0),
      h = S2.reduce((t, s) => t + (doc.held[s] || []).length, 0);
    assert.ok(h === 0 || n - h >= 30, u + ': ' + h + ' held of ' + n);
  }
  assert.ok(S.units.families.target >= 0.75 * S.units.families.units, JSON.stringify(S.units));
  assert.strictEqual(S.under, S.already, 'no species pushed under 8 in practice');
});
