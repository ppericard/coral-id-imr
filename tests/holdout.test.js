require('./slot.js').testGuard();
// The fish held-out photo set (tools/holdout.py; ROADMAP "A held-out photo set"; Pierre, 2026-11-16, Q385): per species,
// 10% of its eligible observations, at least 5, never fewer than 8 left in practice; never Pierre's own, a reference
// source's or a reference-level photo, nor a surprise-only species; a whole observation in or out (rule P4); a fixed
// hash order; sticky when photos are added. Made-up fixtures, then the committed fish-holdout.json against the real files.
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
const FISH = {
  families: [
    {id: 'f:A', species: ['s1', 's2']},
    {id: 'f:W', species: ['s9'], wink: {photos: []}}
  ]
};
const quota = (sp, n) => (py('build', game(many(sp, n)), FISH, null)[sp] || []).length;

test('a species holds out 10% of its eligible observations, at least 5, and keeps 8 in practice', () => {
  assert.deepStrictEqual(RULE, {unit: 'species', rate: 0.1, floor: 5, keep: 8, salt: 'fish-holdout'});
  assert.deepStrictEqual(
    [100, 60, 51, 20, 13, 12, 10, 8, 3].map(n => [n, quota('s1', n)]),
    [
      [100, 10],
      [60, 6],
      [51, 6],
      [20, 5],
      [13, 5],
      [12, 4],
      [10, 2],
      [8, 0],
      [3, 0]
    ]
  );
  // 30 observations, 27 of them Pierre's own: the 3 eligible ones only
  const own = many('s1', 27).map(p => ({...p, own: true}));
  assert.strictEqual(py('build', game(own, many('s1', 3, 5000)), FISH, null).s1.length, 3);
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
    const H = py('build', G, FISH, null);
    assert.ok(!('s9' in H), 'a surprise-only species holds nothing out');
    for (const o of ['1', '2', '3', '4']) assert.ok(!H.s1.includes(o), o);
    G.photos.t01.push(...many('s1', 10, 10000 + 10 * i)); // more photos, so more held out: still none of them
  }
  // a reference-level photo of ease 5 without the reference look is an ordinary one
  assert.deepStrictEqual(py('pool', game(rec('s2', 7, {e: 5, jt: 'p2g0sl1'})), FISH), {s2: {7: true}});
});

test('the first eligible observations in the hash order, the same at every run', () => {
  const G = game(many('s1', 70), many('s2', 25, 4000)),
    H = py('build', G, FISH, null);
  assert.deepStrictEqual(H, py('build', G, FISH, null));
  assert.deepStrictEqual(
    H.s1,
    byRank(many('s1', 70).map(p => p.o))
      .slice(0, 7)
      .sort()
  );
  assert.deepStrictEqual(
    H.s2,
    byRank(many('s2', 25, 4000).map(p => p.o))
      .slice(0, 5)
      .sort()
  );
  // an observation keyed by its short id whatever the record's form (fish_short: the full address reads as the id)
  const full = many('s2', 25, 4000).map(p => ({...p, o: 'https://www.inaturalist.org/observations/' + p.o}));
  assert.deepStrictEqual(py('build', game(full), FISH, null).s2, H.s2);
});

test('sticky: added photos never move a held-out observation; gone ones leave; 8 always stay in practice', () => {
  const old = many('s1', 60),
    H = py('build', game(old), FISH, null);
  // 60 more observations: the 6 held out stay, the species tops up to 12 from the rest by the same hash order
  const more = [...old, ...many('s1', 60, 2000)],
    H2 = py('build', game(more), FISH, H);
  assert.ok(
    H.s1.every(o => H2.s1.includes(o)),
    'every observation held out stays held out'
  );
  const next = byRank(more.map(p => p.o).filter(o => !H.s1.includes(o))).slice(0, 6);
  assert.deepStrictEqual(H2.s1, [...H.s1, ...next].sort());
  // a fresh draw on the larger pool may differ: stickiness comes from the file only
  assert.strictEqual(py('build', game(more), FISH, null).s1.length, 12);
  // a held-out observation gone from play leaves the set; the species tops up again
  const gone = H2.s1[0],
    H3 = py('build', game(more.filter(p => p.o !== gone)), FISH, H2);
  assert.ok(!H3.s1.includes(gone));
  assert.strictEqual(H3.s1.length, 12);
  // a held-out observation that became Pierre's own leaves the set too
  const mine = H2.s1[1],
    H4 = py('build', game(more.map(p => (p.o === mine ? {...p, own: true} : p))), FISH, H2);
  assert.ok(!H4.s1.includes(mine));
  // down to 11 observations in play, 6 of them held out: 3 go back to practice, the last in the hash order first
  const kept = [...old.filter(p => H.s1.includes(p.o)), ...old.filter(p => !H.s1.includes(p.o)).slice(0, 5)],
    H5 = py('build', game(kept), FISH, H);
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
  assert.strictEqual(py('stale', {...doc, rule: {...doc.rule, rate: 0.2}}, doc.held), true);
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
});
