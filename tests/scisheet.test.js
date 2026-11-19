require('./slot.js').testGuard();
// The species by their scientific names on the sheet (docs/reviews/2026-11-18-species-step2-plan.md §5, the sheet PR;
// Q394 A, Q397, Q398): the central levels table (core.js LEVELS, spUnitId, levelOf); the scientific species units, fish
// and sea slugs (core.js treeSpUnits 'sci'), in the sheet's replay units (treeReplayGen) and its leaderboard tree
// (treeBoardTree, treeScoreTree sci); the smaller faults (core.js PART, partOf, the scoring record's z); the sync script
// logging, replaying and photo-checking such answers (tests/gas.js: an in-memory sheet, nothing leaves this process,
// rule D1). The app opens none of them until its own PR, behind SCI_SHEET (rule D4).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const C = require('../core.js');
const {loadCodeGs} = require('./gas.js');

const ROOT = path.join(__dirname, '..'),
  src = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  F = JSON.parse(src('fish.json')),
  SF = JSON.parse(src('seaslug.json')),
  FISH = C.subjectOf('fish'),
  SLUG = C.subjectOf('seaslug'),
  XF = C.treeGen(F, {}),
  XS = C.treeGen(SF, {}, undefined, C.unitRankOf(SLUG)),
  SCF = C.treeSpUnits(F, XF, 'sci'),
  SCS = C.treeSpUnits(SF, XS, 'sci');

test('the levels table: each level its prefix, rank, name kind and parent; a species key in letters and digits', () => {
  assert.deepStrictEqual(
    Object.entries(C.LEVELS).map(([k, L]) => [k, L.pre, L.rank, L.parent]),
    [
      ['family', 'f:', 'family', null],
      ['genus', 'g:', 'genus', 'family'],
      ['cn', 's:', 'species', 'family'],
      ['sci', 'sci:', 'species', 'genus']
    ]
  );
  assert.strictEqual(C.spUnitId('cn', 's091'), 's:s091');
  assert.strictEqual(C.spUnitId('sci', 's091'), 'sci:s091');
  assert.strictEqual(C.spUnitId('sci', 'x:goniobranchus-sp5'), 'sci:xgoniobranchussp5');
  assert.deepStrictEqual(['f:Damselfishes', 'g:Chromis', 's:s091', 'sci:s091', 'Acropora', ''].map(C.levelOf), [
    'family',
    'genus',
    'cn',
    'sci',
    '',
    ''
  ]);
});

test('the fish: one scientific unit per species in play, under its genus unit, the traps its family’s', () => {
  const inPlay = new Set(XF.c1.concat(XF.c2, XF.c3)),
    ids = SCF.map(u => u.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'one key per species');
  assert.ok(SCF.length >= 650, String(SCF.length));
  SCF.forEach(u => {
    assert.match(u.id, /^sci:[A-Za-z0-9]+$/);
    assert.strictEqual(u.id, C.spUnitId('sci', u.s.id));
    assert.strictEqual(u.genus, u.s.genus, u.id);
    assert.strictEqual(u.from, u.genus, 'it starts from its genus (the scientific tree), never its common-name unit');
    assert.strictEqual(u.family, u.s.family);
    assert.ok(inPlay.has(u.family), u.id);
    assert.deepStrictEqual(
      u.look,
      SCF.filter(o => o.family === u.family && o !== u).map(o => o.id)
    );
  });
  // every species with a common-name unit has a scientific one too, and the 3 with no common name have one
  const cn = C.treeSpUnits(F, XF);
  assert.ok(cn.every(u => ids.includes(C.spUnitId('sci', u.s.id))));
  assert.ok(SCF.some(u => !(u.s.cn || []).length));
  // the common-name units are those of before: no new field, no new unit
  assert.ok(cn.every(u => C.levelOf(u.id) === 'cn' && !('genus' in u)));
  assert.deepStrictEqual(C.treeSpUnits(F), C.treeSpUnits(F, undefined, 'cn'));
});

test('the sea slugs: every species under its genus unit, Goniobranchus sp. 5 by its plain key', () => {
  const ids = SCS.map(u => u.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.strictEqual(SCS.length, SF.species.length, 'every species of the game');
  SCS.forEach(u => {
    assert.match(u.id, /^sci:[A-Za-z0-9]+$/);
    assert.ok(XS.gen[u.genus] && XS.gen[u.genus].rank === 'genus', u.id);
    assert.strictEqual(u.from, u.genus);
  });
  const sp5 = SCS.find(u => u.s.id === 'x:goniobranchus-sp5');
  assert.strictEqual(sp5.id, 'sci:xgoniobranchussp5');
  assert.strictEqual(sp5.genus, 'g:Goniobranchus');
  assert.ok(sp5.look.length && sp5.look.every(o => SCS.find(u => u.id === o).family === sp5.family));
  assert.ok(!C.treeSpUnits(SF, XS).length, 'no common-name species units (Q369)');
});

test("the sheet's replay units: the scientific species of both subjects, every other unit as before", () => {
  const G = FISH.replayed.gen(F),
    S = SLUG.replayed.gen(SF);
  SCF.forEach(u => assert.deepStrictEqual(G[u.id], {look: u.look, fam: u.fam, from: u.genus}));
  SCS.forEach(u => assert.deepStrictEqual(S[u.id], {look: u.look, fam: u.fam, from: u.genus}));
  // the log's patterns take the keys (Code.gs logAnswers_ G, CH; the board's BOARD_U_)
  [...SCF, ...SCS].forEach(u => assert.match(u.id, /^[A-Za-z][A-Za-z0-9: -]{0,39}$/));
});

// A replay row as the app logs an answer (core.js logRow).
const T = i => new Date(Date.UTC(2026, 10, 19, 0, i)).toISOString();
const ans = (i, x) => ({id: 'a' + i, t: T(i), s: 'fish', rk: 'species', m: 'quiz', ph: 'p' + i, e: 0.75, th: 0, sc: {d: 0}, ...x});
const GEN = C.treeReplayGen(F),
  OLD = Object.fromEntries(Object.entries(GEN).filter(([n]) => C.levelOf(n) !== 'sci'));

test('replay: a log with no scientific species row replays exactly as with the units of before', () => {
  const fams = ['f:Damselfishes', 'f:Butterflyfishes', 'f:Angelfishes', 'f:Wrasses'],
    sps = C.treeSpUnits(F)
      .slice(0, 4)
      .map(u => u.id),
    L = [];
  for (let i = 0; i < 60; i++) {
    const set = i % 2 ? fams : sps,
      g = set[i % 4],
      ok = i % 5 !== 3;
    L.push(ans(i, {g, a: ok ? g : set[(i + 1) % 4], ok: ok ? 1 : 0, ch: set.join(' ')}));
  }
  const rows = L.map(a => C.logRow(a, 'p1'));
  assert.deepStrictEqual(C.replayProgress(rows, {gen: GEN}), C.replayProgress(rows, {gen: OLD}));
});

test('replay: a scientific species picked wrongly counts against it (rule L2), never its genus, family or common name', () => {
  const [A, B, W] = SCF.filter(u => u.family === 'f:Butterflyfishes').slice(0, 3),
    L = [];
  for (let i = 0; i < 12; i++) L.push(ans(i, {rk: 'genus', g: A.genus, a: A.genus, ok: 1, ch: A.genus + ' g:Naso'}));
  L.push(ans(20, {g: A.id, a: W.id, ok: 0, ch: [A.id, W.id, B.id].join(' ')}));
  L.push(ans(21, {g: B.id, a: B.id, ok: 1, ch: [B.id, A.id, W.id].join(' ')}));
  const rows = L.map(a => C.logRow(a, 'p1')),
    R = C.replayProgress(rows, {gen: GEN}).p1.P,
    O = C.replayProgress(rows, {gen: OLD}).p1.P;
  assert.strictEqual(R[W.id].h, '0', 'the species given takes a miss');
  assert.ok(!O[W.id], 'a script without the units would not count it');
  assert.ok(!R[C.spUnitId('cn', W.s.id)] && !R[W.family], 'nothing on its common-name unit or its family');
  assert.deepStrictEqual(R[A.genus].h, O[A.genus].h, 'nor on the genus');
  // B's first answer starts from its genus's ability, above the global level's start
  assert.ok(R[B.id].th > O[B.id].th, `${R[B.id].th} > ${O[B.id].th}`);
});

// ---- Q394 A: the smaller faults ----

const LV = C.LEVEL;
const base = () => ({
  [LV]: {ok: 60, ko: 20, th: 0.6, h: '1101101110'},
  'sci:x': {ok: 5, ko: 2, h: '1101101', th: 0.4, lt: 0.6},
  'g:G': {ok: 20, ko: 4, th: 1.1, lt: 0.6}
});
// Some states of the unit: never answered, a few answers, many, its bar high (s.dp, s.ds from scoring right answers).
const states = () => {
  const out = [];
  [0, 3, 12].forEach(n => {
    const P = base();
    if (!n) delete P['sci:x'];
    for (let i = 0; i < n; i++)
      C.scoreAnswer(P, {t: 'sci:x', ok: true, k: 4, chs: ['sci:x', 'sci:y'], d0: 0.2 * (i % 5), ph: ['f' + i], from: 'g:G'});
    out.push(P);
  });
  return out;
};
const q = (ok, z, d0) => ({t: 'sci:x', ok, k: Infinity, chs: [], d0, ph: ['q'], from: 'g:G', ...(z ? {z} : {})});
const run = (P0, x) => {
  const P = JSON.parse(JSON.stringify(P0));
  C.scoreAnswer(P, x);
  return P;
};

test('a smaller fault: never a gain on the unit or the global level, less than a miss, more for a common name than a genus', () => {
  assert.deepStrictEqual(C.PART, {cn: 0.5, g: 0.25});
  states().forEach(P0 =>
    [-1, 0, 1, 2.5].forEach(d0 => {
      const s0 = P0['sci:x'] || {},
        miss = run(P0, q(false, '', d0)),
        cn = run(P0, q(false, 'cn', d0)),
        g = run(P0, q(false, 'g', d0)),
        ds0 = typeof s0.ds === 'number' ? s0.ds : 0,
        th0 = C.abilityOf(P0, 'sci:x', 0, 'g:G');
      [cn, g].forEach(P => {
        assert.ok(P['sci:x'].ds <= ds0 + 1e-12, 'the bar never rises');
        assert.ok(P['sci:x'].th <= th0 + 1e-9, 'its ability never rises');
        assert.ok(P[LV].th <= P0[LV].th + 1e-9, 'the global level never rises');
        assert.strictEqual(P['sci:x'].ko, miss['sci:x'].ko, 'a miss in its counts');
      });
      // a smaller step down than a whole miss, the genus alone smaller than a common name
      assert.ok(miss['sci:x'].th <= cn['sci:x'].th + 1e-9 && cn['sci:x'].th <= g['sci:x'].th + 1e-9);
      assert.ok(miss[LV].th <= cn[LV].th + 1e-9 && cn[LV].th <= g[LV].th + 1e-9);
      assert.ok(miss['sci:x'].ds <= cn['sci:x'].ds + 1e-12 && cn['sci:x'].ds <= g['sci:x'].ds + 1e-12);
    })
  );
});

test('a smaller fault: ignored on a right answer and for an unknown kind; no mark scores as before', () => {
  states().forEach(P0 => {
    assert.deepStrictEqual(run(P0, q(true, 'cn', 0.5)), run(P0, q(true, '', 0.5)));
    assert.deepStrictEqual(run(P0, q(false, 'xyz', 0.5)), run(P0, q(false, '', 0.5)));
    assert.deepStrictEqual(run(P0, q(false, 'constructor', 0.5)), run(P0, q(false, '', 0.5)));
  });
  assert.strictEqual(C.partOf({ok: false, z: 'cn'}), 0.5);
  assert.strictEqual(C.partOf({ok: true, z: 'cn'}), 1);
  assert.strictEqual(C.partOf({ok: false}), 1);
});

test('the scoring record keeps the kind (z), only a known one; the replay scores a marked row as the game did', () => {
  assert.deepStrictEqual(C.scoreRec({d: 0.2, z: 'cn'}), {d: 0.2, z: 'cn'});
  assert.deepStrictEqual(C.scoreRec(JSON.stringify({d: 0.2, z: 'g'})), {d: 0.2, z: 'g'});
  assert.deepStrictEqual(C.scoreRec({d: 0.2, z: 'x'}), {d: 0.2});
  assert.deepStrictEqual(C.scoreRec({d: 0.2, z: 1}), {d: 0.2});
  assert.deepStrictEqual(C.scoreRec({d: 0.2}), {d: 0.2});
  // the game's record of a marked question (scoreLog), through the app's log (logRow)
  const x = C.scoreIn({t: 'sci:x', ok: false, k: Infinity, chs: [], d0: 0.7, ph: ['q'], z: 'cn'});
  assert.strictEqual(C.scoreLog(x, {look: false}).z, 'cn');
  const [A, , W] = SCF.filter(u => u.family === 'f:Damselfishes'),
    L = [
      ans(1, {g: A.id, a: W.id, ok: 0, ch: [A.id, W.id].join(' ')}),
      ans(2, {g: A.id, a: '', ok: 0, m: 'quiz|t', ch: '', sc: {d: 0.4, z: 'cn'}}),
      ans(3, {g: A.id, a: '', ok: 0, m: 'quiz|t', ch: '', sc: {d: 0.4, z: 'g'}}),
      ans(4, {g: A.id, a: '', ok: 0, m: 'quiz|t', ch: '', sc: {d: 0.4}})
    ],
    rows = L.map(a => C.logRow(a, 'p1'));
  assert.deepStrictEqual(rows[1][C.LOG_SC], {d: 0.4, z: 'cn'});
  const R = n => C.replayProgress(rows.slice(0, n), {gen: GEN}).p1.P[A.id];
  // each further miss lowers the bar and the ability, the marked ones less than the whole miss after them
  const [r1, r2, r3, r4] = [1, 2, 3, 4].map(R);
  assert.ok(r2.th < r1.th && r3.th < r2.th && r4.th < r3.th);
  assert.ok(r1.th - r2.th < r3.th - r4.th, 'half a miss steps less than a miss');
  assert.ok(r2.th - r3.th < r1.th - r2.th, 'a quarter less than a half');
});

// ---- The leaderboard's tree ----

test('the board tree: each species in its own entry with its scientific unit; the same % for a player with none', () => {
  const on = C.treeBoardTree(F),
    X = {...XF, gen: {...C.treeReplayGen(F), ...XF.gen}},
    before = C.treeScoreTree(X, F, true),
    K = FISH.score;
  assert.deepStrictEqual(on.f, before.f);
  assert.deepStrictEqual(on.s.map(e => e[2]).sort(), SCF.map(u => u.id).sort(), 'every entry its scientific unit, every unit once');
  on.s.forEach(e => {
    const u = SCF.find(x => x.id === e[2]);
    assert.strictEqual(e[1], u.genus);
    assert.deepStrictEqual(e[3], (u.s.cn || []).length ? [C.spUnitId('cn', u.s.id)] : null);
  });
  const sum = T => T.s.reduce((t, e) => t + e[0], 0);
  assert.ok(Math.abs(sum(on) - sum(before)) < 0.01);
  // the sheet takes it as it takes an app's (Code.gs boardTreeWhy_: counts, patterns, at most 50,000 characters)
  const s = loadCodeGs();
  assert.strictEqual(s.ctx.boardTreeWhy_(on), '');
  assert.ok(JSON.stringify(on).length < 40000, String(JSON.stringify(on).length));
  // players with no scientific species answered: the same % and score on either tree
  const units = [...new Set([...before.f.map(e => e[0]), ...before.s.flatMap(e => [e[1], ...(e[3] || [])]).filter(Boolean)])];
  let r = 11;
  const rand = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) {
    const P = {};
    units.forEach(u => {
      const x = rand();
      if (x < 0.3) P[u] = {ok: 3, ko: 1, dp: C.DOM_PRIOR, ds: rand()};
      else if (x < 0.35) P[u] = {mx: 1};
    });
    const a = C.treeScore(P, before, K),
      b = C.treeScore(P, on, K);
    assert.strictEqual(b.pct, a.pct);
    assert.ok(Math.abs(b.raw - a.raw) < 1e-6);
  }
  // a scientific species learned now counts
  const P = {[SCF[0].id]: {mx: 1}};
  assert.ok(C.treeScore(P, on, K).raw > C.treeScore(P, before, K).raw);
});

// ---- The sync script: logged, replayed, photo-checked ----

const resp = body => ({getResponseCode: () => 200, getContentText: () => body});
const FILES = {
  'data.json': src('data.json'),
  'fish.json': src('fish.json'),
  'seaslug.json': src('seaslug.json'),
  'seaslug-game.json': src('seaslug-game.json'),
  'curation.json': src('curation.json')
};
const fetch = url => {
  const m = /\/main\/([a-z.-]+)$/.exec(url);
  return m && FILES[m[1]] ? resp(FILES[m[1]]) : null;
};

test('the sheet logs a scientific species answer with its mark, and replays it as the game scores it', () => {
  const s = loadCodeGs({fetch, cacheMax: 100 * 1024}),
    [A, B] = SCF.filter(u => u.family === 'f:Damselfishes'),
    [SA, SB] = SCS.filter(u => u.genus === 'g:Goniobranchus' && u.s.id !== 'x:goniobranchus-sp5'),
    sp5 = SCS.find(u => u.s.id === 'x:goniobranchus-sp5'),
    fish = [
      ans(1, {g: A.id, a: B.id, ok: 0, ch: [A.id, B.id].join(' ')}),
      ans(2, {g: A.id, a: A.id, ok: 1, ch: [A.id, B.id].join(' ')}),
      ans(3, {g: B.id, a: '', ok: 0, m: 'quiz|t', ch: '', sc: {d: 0.3, z: 'cn'}})
    ],
    slug = [
      ans(4, {s: 'seaslug', g: sp5.id, a: SA.id, ok: 0, ch: [sp5.id, SA.id, SB.id].join(' ')}),
      ans(5, {s: 'seaslug', g: SB.id, a: '', ok: 0, m: 'quiz|t', ch: '', sc: {d: 0.3, z: 'g'}})
    ],
    r = s.post({name: 'Ana', pin: '1234', data: {}, summary: {}, answers: [...fish, ...slug]});
  assert.ok(r.ok, JSON.stringify(r).slice(0, 200));
  const rows = s.sheets.Answers.rows.slice(1);
  assert.deepStrictEqual(
    rows.map(x => [x[2], x[3]]),
    [...fish, ...slug].map(a => [a.g, a.a]),
    'the units shown and given kept'
  );
  const SC = require('vm').runInContext('SC_COL', s.ctx); // the Scoring column (a const: not on the context)
  assert.deepStrictEqual(JSON.parse(rows[2][SC]), {d: 0.3, z: 'cn'});
  assert.deepStrictEqual(JSON.parse(rows[4][SC]), {d: 0.3, z: 'g'});
  // its replay units hold them (Code.gs subjGen_, made from fish.json under the curation in force)
  const G = s.ctx.subjGen_('fish'),
    SG = s.ctx.subjGen_('seaslug');
  assert.deepStrictEqual(G[A.id].from, A.genus);
  assert.deepStrictEqual(SG[sp5.id].from, 'g:Goniobranchus');
  // the replays served at the next load: as core.js replays the same answers with those units
  const g = s.get({name: 'Ana', pin: '1234', rv: '0', rv_fish: '0', rv_seaslug: '0'}),
    want = (L, gen, vars) =>
      C.replayProgress(
        L.map(a => C.logRow(a, 'p')),
        {gen, vars}
      ).p.P;
  assert.deepStrictEqual(g.replays.fish.rec, JSON.parse(JSON.stringify(want(fish, G, s.ctx.subjVar_('fish')))));
  assert.deepStrictEqual(g.replays.seaslug.rec, JSON.parse(JSON.stringify(want(slug, SG, s.ctx.subjVar_('seaslug')))));
  assert.strictEqual(g.replays.fish.rv, C.rvOf('fish'));
  assert.strictEqual(g.replays.seaslug.rv, C.rvOf('seaslug'));
  // the wrong picks counted against the species given (rule L2)
  assert.strictEqual(g.replays.fish.rec[B.id].h.slice(0, 1), '0');
  assert.ok(g.replays.seaslug.rec[SA.id]);
});

test('the photo check: a sea slug species by its scientific name is its genus’s', () => {
  const S = SLUG,
    files = S.pool.files.map(f => JSON.parse(src(f))),
    P = C.unitPool(S, files),
    s = loadCodeGs({fetch, cacheMax: 100 * 1024}),
    up = s.ctx.unitUp_(files[0]);
  SCS.forEach(u => assert.strictEqual(up[u.id], u.genus, u.id));
  const u = SCS.find(x => (P[x.genus] || []).length),
    mine = new Set([u.genus, u.family].flatMap(k => (P[k] || []).flat())),
    other = Object.keys(P).find(k => k !== u.genus && k !== u.family && P[k].length && !mine.has(P[k][0][0])),
    idx = s.ctx.photoIdx_('seaslug');
  assert.ok(idx && idx.n === 1, 'the sea slugs’ pool read');
  assert.strictEqual(s.ctx.photoCheck_(idx, 'seaslug', u.id, [P[u.genus][0][0]]), 'ok');
  assert.strictEqual(s.ctx.photoCheck_(idx, 'seaslug', u.id, [P[other][0][0]]), 'other');
});
