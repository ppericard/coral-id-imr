// Photo exposure per player (Pierre, 2026-11-06, Q191; docs/reviews/2026-11-06-photo-exposure-study.md §5): Seen % and
// Spread % per subject, computed by the sync sheet (Code.gs exposure_, pools_) with core.js unitPool and exposureOf, shown
// on the admin's player list. The sheet runs against tests/gas.js: nothing reaches the real sheet (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');
const ROOT = path.join(__dirname, '..'),
  read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')),
  filesOf = S => S.pool.files.map(read);

// A pool by hand: unit A has 3 colonies (the first with two views), unit B one colony.
const POOL = {A: [['a1w', 'a1m'], ['a2'], ['a3']], B: [['b1']]};
const row = (who, t, u, ph) => [who, t, u, u, 1, 'quiz', ph];

test('exposureOf: Seen counts distinct game photos over the units met, Spread follows the colonies in time order', () => {
  const E = C.exposureOf(
    [
      row('p', 3, 'A', 'a1w'), // a colony seen before (time 1): no new one while two were left
      row('p', 1, 'A', 'a1w a1m'), // first: new colony
      row('p', 4, 'A', 'a2'), // new
      row('p', 5, 'A', 'a3'), // new: A has no unseen colony left now
      row('p', 6, 'A', 'a2'), // not counted: nothing new was left to show
      row('q', 1, 'A', 'a2'),
      row('q', 2, 'A', 'gone-photo'), // out of play now: a colony of its own, new to q, not a game photo
      row('q', 3, 'A', 'gone-photo'), // the same again: a repeat while A still had unseen colonies
      row('q', 4, 'Z', 'z1'), // a unit with no game photo: left out
      row('r', 1, 'B', '') // no photo logged: left out
    ],
    POOL
  );
  assert.deepStrictEqual(E.p, [4, 4, 3, 4, 1], 'p: 4 of the 4 photos of A; 3 of 4 questions brought a colony while one was left');
  assert.deepStrictEqual(E.q, [1, 4, 2, 3, 1], 'q: one game photo seen; 2 of 3 questions brought a colony new to q');
  assert.ok(!('r' in E));
  // Two units met: the denominator is both units' game photos.
  assert.deepStrictEqual(C.exposureOf([row('s', 1, 'A', 'a2'), row('s', 2, 'B', 'b1')], POOL).s, [2, 5, 2, 2, 2]);
  assert.deepStrictEqual(C.exposureOf(null, POOL), {});
  assert.deepStrictEqual(C.exposureOf([row('s', 1, 'A', 'a2')], null), {});
});

test("unitPool: every subject's game photos per unit, by colony, as its games draw them", () => {
  const [coral, fish] = C.SUBJECTS;
  const P = C.unitPool(coral, filesOf(coral));
  // The corals: the game list of every game genus (core.js applySlots, gameOf), each photo once.
  const raw = read('data.json'),
    cur = read('curation.json'),
    d = structuredClone(raw);
  C.applyCuration(d, cur);
  C.applySlots(d, cur);
  const x = {gen: d.x.gen, course: {}, cand: d.cand};
  C.applyCuration(x, cur);
  C.applySlots(x, cur);
  const units = C.gameOf(raw);
  assert.deepStrictEqual(Object.keys(P).sort(), units.slice().sort());
  units.forEach(n => {
    const g = d.gen[n] || d.x.gen[n],
      // Research Grade only off data.json gen (app.js gamePhotoOk; Codex review #680)
      want = new Set(
        ['wide', 'medium', 'macro']
          .flatMap(v => ((g.sl || {})[v] || {}).game || [])
          .filter(p => !g.x || p.own || !p.gid)
          .map(p => p.f)
      );
    assert.deepStrictEqual(new Set(P[n].flat()), want, n);
    assert.strictEqual(P[n].flat().length, want.size, n + ': each photo once');
  });
  // Millepora holds Needs ID photos the games never show: not in the pool.
  const ni = ['wide', 'medium', 'macro'].flatMap(v => ((d.x.gen.Millepora.sl || {})[v] || {}).game || []).filter(p => !p.own && p.gid);
  assert.ok(ni.length && ni.every(p => !P.Millepora.flat().includes(p.f)));
  // A colony groups the views of one observation.
  assert.ok(Object.values(P).some(L => L.some(c => c.length > 1)));
  // The fish: its entries under the ids the answer log holds (renamedId: the families), every photo of an entry played.
  const F = C.unitPool(fish, filesOf(fish));
  assert.ok(Object.keys(F).length > 20);
  assert.ok(
    Object.keys(F).every(u => u === C.renamedId(fish, u)),
    'no old entry id'
  );
  assert.ok(Object.values(F).every(L => L.length && L.every(c => c.length)));
  // Nothing without its files, or for a subject that names no pool.
  assert.strictEqual(C.unitPool(coral, [raw, null]), null);
  assert.strictEqual(C.unitPool({...coral, pool: undefined}, filesOf(coral)), null);
});

const TOK = 'ghp_write000000000000000000';
// The site's files from GitHub main, served from this checkout (counted); anything else is the default stub.
const site = (n = {}) => ({
  n,
  fetch: url => {
    const m = /raw\.githubusercontent\.com\/[^/]+\/[^/]+\/main\/(.+)$/.exec(url);
    if (!m || !fs.existsSync(path.join(ROOT, m[1]))) return null;
    n[m[1]] = (n[m[1]] || 0) + 1;
    const t = fs.readFileSync(path.join(ROOT, m[1]), 'utf8');
    return {getResponseCode: () => 200, getContentText: () => t};
  }
});

test("v81 users: each player's exposure per subject, from the Answers tab and the game pools (cached)", () => {
  const f = site(),
    s = loadCodeGs({fetch: f.fetch}),
    [coral, fish] = C.SUBJECTS,
    CP = C.unitPool(coral, filesOf(coral)),
    FP = C.unitPool(fish, filesOf(fish)),
    fu = Object.keys(FP)[0],
    t = i => new Date(Date.UTC(2026, 10, 6, 6, 0, i)).toISOString(),
    a = (id, i, g, ph, x = {}) => ({id, t: t(i), g, a: g, ok: 1, m: 'quiz', ph, ...x});
  const acro = CP.Acropora,
    L = [
      a('c1', 1, 'Acropora', acro[0].join(' ')),
      a('c2', 2, 'Acropora', acro[0][0]),
      a('c3', 3, 'Acropora', acro[1][0]),
      a('c4', 4, 'Porites', CP.Porites[0][0]),
      a('f1', 5, fu, FP[fu][0][0], {s: fish.id, rk: fish.rank}),
      a('f2', 6, fu, FP[fu][0][0], {s: fish.id, rk: fish.rank})
    ];
  s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: L});
  s.post({name: 'Ben', pin: '1111', data: {}, summary: {}, answers: []});
  const r = s.post({users: 1, token: TOK}),
    ana = r.users.find(u => u.name === 'Ana');
  const want = (rows, P) =>
    C.exposureOf(
      rows.map(x => ['ana', Date.parse(x.t), x.g, x.a, 1, 'quiz', x.ph]),
      P
    ).ana;
  assert.deepStrictEqual(ana.ex[coral.id], want(L.slice(0, 4), CP));
  assert.deepStrictEqual(ana.ex[coral.id].slice(2), [3, 4, 2], 'a repeat while Acropora had unseen colonies');
  assert.deepStrictEqual(ana.ex[fish.id], want(L.slice(4), FP));
  assert.deepStrictEqual(ana.ex[fish.id].slice(2), [1, 2, 1]);
  assert.ok(!('ex' in r.users.find(u => u.name === 'Ben')), 'no answer, no exposure');
  // Cached: a second list reads no file again; each file was read once (curation.json once for both subjects).
  s.post({users: 1, token: TOK});
  assert.ok(
    [...coral.pool.files, ...fish.pool.files].every(x => f.n[x] >= 1),
    JSON.stringify(f.n)
  );
  assert.strictEqual(f.n['curation.json'], 1);
  assert.strictEqual(f.n['fish-photos.json'], 1);
  // Files out of reach: no exposure, the list as before.
  const s2 = loadCodeGs();
  s2.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: L});
  const u2 = s2.post({users: 1, token: TOK});
  assert.ok(u2.ok && !('ex' in u2.users[0]));
});
