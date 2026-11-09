// The Analyses module (analysis.js), continued: Recompute here, deleted accounts, the player profiles, the Wright map, time and difficulty (the first part, and why it is split: tests/analysis.test.js).
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');
const {near, withTruth, synthMeta} = require('./analysisfix.js');

test('Recompute here: the Web Worker computes the new views, and a stored report of an older AV is not reused', () => {
  // analysis.js run as the admin's Worker (new Worker('analysis.js?v=N')): a global scope with postMessage, no window,
  // no module; the message handler computes a whole report
  const vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    msgs = [],
    ctx = {postMessage: m => msgs.push(m), Date, Math, JSON, Map, Set, Float64Array, Int32Array, Number, String, Object, Array};
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'analysis.js'), 'utf8'), ctx);
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'))),
    rows = A.demoLog(data, Date.UTC(2026, 10, 1), {players: A.DEMO_PLAYERS.slice(0, 5)}),
    meta = {ph: A.photoMeta(data)},
    old = A.report(rows, meta, null, {B: 0});
  // a report stored by the previous code: the same answers, without the new views
  old.AV = A.AV - 1;
  Object.values(old.R).forEach(r => Object.values(r.A).forEach(a => (delete a.ent, delete a.map)));
  ctx.onmessage({data: {id: 1, rows, meta, B: 0, seed: 1, prev: JSON.parse(JSON.stringify(old))}});
  const res = msgs.find(m => m.res);
  assert.ok(res, JSON.stringify(msgs.find(m => m.err)));
  const last = res.res.R[res.res.M[res.res.M.length - 1]];
  assert.ok(last.A.conf.map && last.A.conf.map.g.length >= 3, 'the mix-up map');
  assert.ok(last.A.rt.ent && last.A.photo.ent, 'effects hard to tell apart');
});

// Sheet v55 (Pierre, 2026-11-05, Q86): the answers a deleted account left (anonymous flag 2) stay in the pooled fits but
// are in no per-player result and no count of players (Codex review #600: the Sessions model rows kept the marker too).
test('a deleted account (flag 2) is in no per-player list and no count of players', () => {
  const R = A.rng(7),
    G = ['A', 'B', 'C', 'D'],
    rows = [];
  for (let i = 0; i < 4000; i++) {
    const p = i % 5 === 4 ? 'gone' : 'p' + (i % 5),
      k = Math.floor(R() * 4),
      g = G[k],
      o = G[(k + 1) % 4],
      ok = R() < 0.7;
    // sessions: a new one every 40 answers per player (30 minutes apart)
    rows.push([
      p,
      Math.floor(i / 5) * 20e3 + Math.floor(i / 200) * 40 * 60e3,
      g,
      ok ? g : o,
      ok ? 1 : 0,
      'quiz|d|k2',
      'f' + (i % 50),
      0.7,
      0,
      0,
      `${g} ${o}`,
      p === 'gone' ? 2 : 0,
      5 + R() * 5,
      0
    ]);
  }
  const L = A.prep(rows),
    c = A.confusions(L, 0, 1),
    s = A.sessions(L, 0, 1);
  assert.ok(!c.player.some(x => x.k === 'gone'), 'not in the mix-ups per player');
  assert.strictEqual(c.players, 4);
  assert.strictEqual(s.players, 4, 'not counted in the Sessions model');
  // the pooled models still fit with two clusters when one of them is a deleted account (Codex review #600)
  const two = A.prep(rows.filter(r => r[0] === 'p0' || r[0] === 'gone'));
  assert.ok(!A.rt(two, 0, 1).thin, 'answer time fitted');
  assert.strictEqual(A.rt(two, 0, 1).players, 1);
  assert.ok(!(s.desc && s.desc.table.some(x => x.p === 'gone')), 'not in the sessions table');
  assert.ok(
    s.desc.returns.every(r => r.at <= 4),
    'not in the players coming back: ' + JSON.stringify(s.desc.returns)
  );
  const l = A.learning(L, 0, 1);
  assert.ok(!l.genus || l.genus.every(g => g.players <= 4), 'not in the players per genus');
});

/* ---------- Player profiles (Pierre, 2026-11-05: Q70-Q73) ---------- */
test('eigSym: eigenvalues in decreasing order, orthonormal vectors, S v = λ v', () => {
  const R = A.rng(9),
    n = 6,
    M = Array.from({length: n}, () => Array.from({length: n}, () => R() - 0.5)),
    S = M.map((r, i) => r.map((_, j) => M[i].reduce((s, x, k) => s + x * M[j][k], 0)));
  const E = A.eigSym(S);
  E.val.forEach((v, k) => !k || assert.ok(v <= E.val[k - 1] + 1e-12, 'decreasing'));
  for (let k = 0; k < n; k++) {
    const v = E.vec.map(r => r[k]);
    S.forEach((r, i) =>
      near(
        r.reduce((s, x, j) => s + x * v[j], 0),
        E.val[k] * v[i],
        1e-9,
        `S v = λ v (${k}, ${i})`
      )
    );
    for (let l = 0; l < n; l++)
      near(
        v.reduce((s, x, i) => s + x * E.vec[i][l], 0),
        k === l ? 1 : 0,
        1e-9,
        'orthonormal'
      );
  }
});

// Made-up players of two planted styles: evening players with long sessions who enlarge often and answer slowly, and
// morning players with short sessions who never enlarge and answer fast; the same success. One more player with too few
// answers for a profile of their own.
const styleLog = () => {
  const R = A.rng(4),
    G = ['A', 'B', 'C', 'D', 'E', 'F'],
    rows = [],
    DAY = 864e5;
  const play = (id, eve, nAns) => {
    let t = Date.UTC(2026, 9, 1, eve ? 12 : 1) + Math.floor(R() * 4) * 6e4,
      day = 0,
      inSess = 0;
    for (let i = 0; i < nAns; i++) {
      const g = G[Math.floor(R() * G.length)],
        ok = R() < 0.75,
        others = G.filter(x => x !== g).slice(0, 3);
      rows.push([
        id,
        t,
        g,
        ok ? g : others[0],
        ok ? 1 : 0,
        'quiz',
        'f' + g,
        0.75,
        0,
        0,
        [g, ...others].join(' '),
        0,
        (eve ? 9 : 4) * (0.8 + 0.4 * R()),
        eve ? (R() < 0.6 ? 1 : 0) : 0
      ]);
      inSess++;
      if (inSess >= (eve ? 40 : 8)) {
        inSess = 0;
        // evening players: one session a day; morning players: two, two hours apart
        if (eve || i % 16 === 15) (day++, (t = Date.UTC(2026, 9, 1 + day, eve ? 12 : 1)));
        else t += 2 * 36e5;
      } else t += 30e3;
    }
    void DAY;
  };
  for (let k = 0; k < 5; k++) play('eve' + k, true, 240);
  for (let k = 0; k < 5; k++) play('morn' + k, false, 240);
  play('new1', true, 50);
  return rows;
};

test('profiles: two planted styles come back as the two groups, stable when a player is left out; a short history greyed', () => {
  const D = A.prep(styleLog()),
    r = A.profiles(D, 0, 1),
    id = i => r.who[i].k;
  assert.ok(!r.thin, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(r.players, 10);
  assert.deepStrictEqual(
    r.feats.map(f => f.k),
    A.PROF_F.map(f => f[0])
  );
  // the greyed player: last in the list, outside the tree, the map and the groups
  const last = r.who[r.who.length - 1];
  assert.ok(last.k === 'new1' && last.low === 1 && last.n === 50, JSON.stringify(last));
  assert.strictEqual(r.pca.pts.length, 10);
  // the behaviours as planted: evening share, enlarging, session length, pace
  const f = k => A.PROF_F.findIndex(x => x[0] === k),
    rowOf = name => r.who.find(w => w.k === name);
  near(rowOf('eve0').v[f('eve')], 1, 1e-9, 'evening share');
  near(rowOf('morn0').v[f('eve')], 0, 1e-9, 'morning player');
  assert.strictEqual(rowOf('eve0').v[f('len')], 40);
  assert.strictEqual(rowOf('morn0').v[f('len')], 8);
  assert.ok(rowOf('eve0').v[f('zoom')] > 0.2 && rowOf('morn0').v[f('zoom')] < -0.2, 'enlarging, net of the views');
  assert.ok(rowOf('eve0').v[f('pace')] > 0.3 && rowOf('morn0').v[f('pace')] < -0.3, 'pace');
  near(rowOf('morn0').v[f('wk')], 14, 1.5, 'two sessions a day');
  // two groups, each one style, each a block of the tree's order; stable in every run
  assert.strictEqual(r.k, 2);
  const G = r.groups.map(L => L.map(id).map(s => s.replace(/\d+$/, '')));
  G.forEach(L => assert.strictEqual(new Set(L).size, 1, 'one style per group: ' + L));
  r.groups.forEach(L => assert.strictEqual(L[L.length - 1] - L[0], L.length - 1, 'a block'));
  assert.ok(r.stab.loo.every(j => j === 1) && r.stab.kept === 10, JSON.stringify(r.stab));
  assert.ok(
    r.stab.boot.every(j => j > 0.9),
    JSON.stringify(r.stab)
  );
  // the map's first axis separates the styles; it explains most of the spread
  const x = r.pca.pts.map(p => p[0]),
    side = r.who.slice(0, 10).map((w, i) => [w.k.replace(/\d+$/, ''), Math.sign(x[i])]);
  assert.ok(new Set(side.filter(s => s[0] === 'eve').map(s => s[1])).size === 1, JSON.stringify(side));
  assert.ok(side.find(s => s[0] === 'eve')[1] !== side.find(s => s[0] === 'morn')[1], 'opposite sides');
  assert.ok(r.pca.var[0] > 0.5, String(r.pca.var));
  // in words: the closest pair is two players of one style
  const [i, j] = r.close[0];
  assert.strictEqual(id(i).replace(/\d+$/, ''), id(j).replace(/\d+$/, ''));
});

test('profiles: fewer than 3 players with 100 answers is not enough; each player’s window is their last 300 answers', () => {
  const rows = styleLog(),
    two = A.profiles(A.prep(rows.filter(r => /^(eve0|eve1|new1)$/.test(r[0]))), 0, 1);
  assert.ok(two.thin && two.n === 2 && two.min === 3 && two.who.length === 3, JSON.stringify(two).slice(0, 300));
  // a player with 500 answers: only the last 300 count
  const extra = [];
  for (let i = 0; i < 260; i++)
    extra.push(['eve0', Date.UTC(2026, 8, 1) + i * 30e3, 'A', 'A', 1, 'quiz', 'fA', 0.75, 0, 0, 'A B C D', 0, 30, 1]);
  const r = A.profiles(A.prep(rows.concat(extra)), 0, 1);
  assert.strictEqual(r.who.find(w => w.k === 'eve0').n, 300);
  // the whole report carries the profiles, keyed by the anonymous ids only
  const rep = A.runAll(rows, {}, {B: 0});
  assert.ok(rep.A.who && rep.A.who.who.length === 11 && rep.A.who.effects.length === 0);
});

// Codex review #604: three fixes in the profiles, each with a test that failed before it.
test('profiles: misses in a row are counted within a session, not across the break', () => {
  // two-answer sessions, both answers wrong: within a session the second miss is the one that ends it
  const rows = [];
  for (let p = 0; p < 4; p++)
    for (let s = 0; s < 40; s++)
      for (let k = 0; k < 2; k++)
        rows.push(['p' + p, Date.UTC(2026, 9, 1) + s * 864e5 + k * 30e3, 'A', 'B', 0, 'quiz', 'fA', 0.7, 0, 0, 'A B C D', 0, 5, 0]);
  const V = A.profFeat(A.prep(rows)),
    f = A.PROF_F.findIndex(x => x[0] === 'stop');
  Object.values(V).forEach(v => assert.ok(v[f] > 0.9, `stopping after 2+ misses: ${v[f]}`));
});

test('profiles: stable only when every leave-one-out run keeps every group; the map projects what the PCA diagonalised', () => {
  // the planted styles: stable; then the same players with enlarging logged for two of them only (the rest missing)
  const ok = A.profiles(A.prep(styleLog()), 0, 1);
  assert.strictEqual(ok.stab.stable, 1);
  const rows = styleLog().map(r => (/^(eve0|morn0)$/.test(r[0]) ? r : [...r.slice(0, 13), null])),
    r = A.profiles(A.prep(rows), 0, 1);
  assert.strictEqual(r.stab.stable, r.stab.kept === r.stab.runs && r.stab.boot.every(j => j >= r.stab.at) ? 1 : 0);
  // each axis's spread over the players equals its eigenvalue (the sum of its squared loadings)
  [0, 1].forEach(k => {
    const spread = r.pca.pts.reduce((s, p) => s + p[k] ** 2, 0) / r.pca.pts.length,
      lam = r.pca.load.reduce((s, l) => s + l[k] ** 2, 0);
    near(spread, lam, 0.03, `axis ${k + 1}: the points' spread against its eigenvalue`);
  });
});

// Codex review #604, second pass: the window's cut session and the bootstrap's multiplicities.
test('profiles: a session cut by the 300-answer window is not a session length; a bootstrap draw keeps its multiplicities', () => {
  // two complete sessions of 200 answers: the window holds the last 100 of the first and the whole second
  const rows = [];
  for (let s = 0; s < 2; s++)
    for (let i = 0; i < 200; i++)
      rows.push(['p1', Date.UTC(2026, 9, 1 + s) + i * 30e3, 'A', 'A', 1, 'quiz', 'fA', 0.7, 0, 0, 'A B C D', 0, 5, 0]);
  const D = A.prep(rows).slice(-300),
    f = A.PROF_F.findIndex(x => x[0] === 'len');
  assert.strictEqual(A.profFeat(D).p1[f], 200);
  // a player drawn three times weighs three times in the z-scores (and in the tree); the groups list distinct players
  const V = {a: [0, 0, 0, 0, 0, 0, 0], b: [1, 1, 1, 1, 1, 1, 1], c: [4, 4, 4, 4, 4, 4, 4], d: [5, 5, 5, 5, 5, 5, 5]};
  assert.notStrictEqual(A.zOf(V, ['a', 'a', 'a', 'b', 'c', 'd'])('d')[0], A.zOf(V, ['a', 'b', 'c', 'd'])('d')[0]);
  const G = A.profRun(V, ['a', 'a', 'a', 'b', 'c', 'd'], 2);
  assert.deepStrictEqual(G.map(L => L.slice().sort()).sort(), [
    ['a', 'b'],
    ['c', 'd']
  ]);
});

// Codex review #604, third pass: with 3 profiled players no leave-one-out run can be grouped; that is no evidence, not
// instability.
test('profiles: with 3 players the stability is unknown, never "not stable"', () => {
  const rows = styleLog().filter(r => /^(eve0|eve1|morn0)$/.test(r[0])),
    r = A.profiles(A.prep(rows), 0, 1);
  assert.ok(!r.thin && r.players === 3, JSON.stringify(r).slice(0, 200));
  assert.strictEqual(r.stab.runs, 0);
  assert.strictEqual(r.stab.of, 3);
  assert.strictEqual(r.stab.stable, null);
  // with 10 players every run is compared
  const ten = A.profiles(A.prep(styleLog()), 0, 1);
  assert.strictEqual(ten.stab.runs, 10);
});

// Codex review #604, fourth pass: the page names the check that failed (left out one player, or drawn again).
test('admin: why groups are not stable names each failing check apart', () => {
  const vm = require('vm'),
    src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8'),
    ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src.match(/const anWhy = st => \{[\s\S]*?\n\};/)[0] + ';this.anWhy = anWhy;', ctx);
  assert.strictEqual(ctx.anWhy({kept: 8, runs: 8, boot: [0.9, 0.706], at: 0.75}), ' Some groups change when the players are drawn again.');
  assert.strictEqual(ctx.anWhy({kept: 5, runs: 8, boot: [0.9, 0.9], at: 0.75}), ' These groups change when one player is left out.');
  assert.strictEqual(ctx.anWhy({kept: 8, runs: 8, boot: [0.9, null], at: 0.75}), '');
});

// Sheet v55 (Q86): a deleted account's answers (anonymous flag 2) make no profile.
test('profiles: a deleted account has no row', () => {
  const rows = styleLog().map(r => (r[0] === 'eve0' ? [...r.slice(0, 11), 2, ...r.slice(12)] : r)),
    r = A.profiles(A.prep(rows), 0, 1);
  assert.ok(!r.who.some(w => w.k === 'eve0') && r.players === 9, JSON.stringify(r.who.map(w => w.k)));
});

/* ---------- The Wright map and the genus × player residuals (structure views 3) ---------- */
// Made-up players and genera with known abilities and difficulties; w: a planted second skill (odd-numbered players do
// better on odd-numbered genera and worse on even ones, by w on the log-odds), 0 for one skill only.
const skillLog = (w, seed) => {
  const R = A.rng(seed),
    nrm = () => Math.sqrt(-2 * Math.log(R() + 1e-12)) * Math.cos(2 * Math.PI * R()),
    G = Array.from({length: 20}, (_, i) => 'G' + i),
    del = G.map(() => nrm() * 0.8),
    th = Array.from({length: 10}, () => nrm() * 0.6 + 0.8),
    rows = [];
  let t = 0;
  for (let p = 0; p < 10; p++)
    for (let i = 0; i < 600; i++) {
      const gi = Math.floor(R() * 20),
        g = G[gi],
        eta = th[p] - del[gi] + w * (p % 2 ? 1 : -1) * (gi % 2 ? 1 : -1),
        ok = R() < 0.25 + 0.75 / (1 + Math.exp(-eta)),
        others = G.filter(x => x !== g).slice(0, 3);
      rows.push(['p' + p, (t += 60e3), g, ok ? g : others[0], ok ? 1 : 0, 'quiz', 'f' + g, 0.7, 0, 0, [g, ...others].join(' '), 0, 5, 0]);
    }
  return {rows, del, th};
};
const rankCorr = (a, b) => {
  const rk = L => {
    const I = L.map((_, i) => i).sort((i, j) => L[i] - L[j]),
      r = [];
    I.forEach((i, k) => (r[i] = k));
    return r;
  };
  const x = rk(a),
    y = rk(b),
    n = a.length,
    m = (n - 1) / 2;
  return x.reduce((s, v, i) => s + (v - m) * (y[i] - m), 0) / x.reduce((s, v) => s + (v - m) ** 2, 0);
};

test('Wright map: players and genera come back in the order of their planted ability and difficulty', () => {
  const {rows, del, th} = skillLog(0, 2),
    W = A.learning(A.prep(rows), 0, 1).wright;
  const g = W.g.map(([k, d]) => [del[Number(k.slice(1))], d]),
    p = W.th.map(([k, v]) => [th[Number(k.slice(1))], v]);
  assert.ok(rankCorr(...[g.map(x => x[0]), g.map(x => x[1])]) > 0.9, 'genera');
  assert.ok(rankCorr(...[p.map(x => x[0]), p.map(x => x[1])]) > 0.85, 'players');
  near(W.m, Math.log(4), 1e-3, 'the 80% line, logit(0.8)');
  W.th.forEach(x => assert.strictEqual(x[2], 600, 'answers per player'));
});

test('a second skill? planted: the first residual axis stands out and splits the genera; one skill: it does not', () => {
  for (const seed of [1, 2, 3]) {
    const one = A.learning(A.prep(skillLog(0, seed).rows), 0, 1).res;
    assert.ok(one.var[0] <= one.null[1], `one skill (seed ${seed}): ${JSON.stringify(one.var)} against ${JSON.stringify(one.null)}`);
    const two = A.learning(A.prep(skillLog(0.8, seed).rows), 0, 1).res;
    assert.ok(two.var[0] > 2 * two.null[1], `two skills (seed ${seed}): ${JSON.stringify(two.var)} against ${JSON.stringify(two.null)}`);
    const side = L => new Set(L.map(([k, x]) => (Number(k.slice(1)) % 2) + ':' + Math.sign(x))).size;
    assert.strictEqual(side(two.g), 2, 'odd and even genera on opposite sides of the first axis');
    assert.strictEqual(side(two.p), 2, 'odd and even players on opposite sides');
    assert.strictEqual(two.g.length, 20);
    assert.strictEqual(two.p.length, 10);
  }
});

// Sheet v55 (Q86): a deleted account is never a player on the Wright map or an arrow of the residual map.
test('Wright map and residuals: a deleted account is no player', () => {
  const {rows} = skillLog(0, 2),
    R2 = rows.map(r => (r[0] === 'p3' ? [...r.slice(0, 11), 2, ...r.slice(12)] : r)),
    L = A.learning(A.prep(R2), 0, 1);
  assert.ok(!L.wright.th.some(x => x[0] === 'p3') && L.wright.th.length === 9);
  assert.ok(!L.res.p.some(x => x[0] === 'p3') && L.res.p.length === 9);
});

// Codex review #620: a place's likely range carries the intercept's and the slope's uncertainty, not the random effect's
// alone.
test('Wright map: each place’s uncertainty includes the fixed effects (intercept, slope, covariance)', () => {
  const D = [0, 1, 2, 3].map(n => ({p: 'p', g: 'g', n, gone: 0})),
    F = [
      {L: ['p'], u: [0.2], cv: [0.01]},
      {L: ['g'], u: [-0.3], cv: [0.04]}
    ],
    M = {
      b: [0.5, 0.4],
      V: [
        [0.09, -0.01],
        [-0.01, 0.0225]
      ]
    },
    W = A.wrightOf(D, M, F),
    l = Math.log(1 + 1.5), // the median practice of 0..3
    fv = 0.09 + l * l * 0.0225 + 2 * l * -0.01;
  near(W.th[0][3], Math.sqrt(fv + 0.01), 1e-3, 'player SE');
  near(W.g[0][3], Math.sqrt(fv + 0.04), 1e-3, 'genus SE (the typical player is this one)');
  near(W.mid, 0.5 + 0.4 * l, 1e-3, 'the typical player');
  near(W.th[0][1], 0.5 + 0.4 * l + 0.2, 1e-3, 'player place');
});

// Codex review #604 (comment 4479472198): players with the same value of a behaviour, a value whose floating-point mean
// is not exact (log 40), have no spread in it; the rounding left in the mean must not become ±1 SD for every player.
test('profiles: a behaviour every player shares reads 0 SD, never the rounding of its mean', () => {
  const V = Object.fromEntries('abcdefg'.split('').map(k => [k, A.PROF_F.map(() => Math.log(40))]));
  assert.notStrictEqual(Object.values(V).reduce((s, L) => s + L[0], 0) / 7, Math.log(40), 'the case needs a rounded mean');
  assert.deepStrictEqual(
    A.zOf(V, Object.keys(V))('a'),
    A.PROF_F.map(() => 0)
  );
  // seven players, each five sessions of 40 answers at the same hours: identical profiles, no axis of the map explains
  // anything
  const rows = [];
  'abcdefg'.split('').forEach(p => {
    for (let s = 0; s < 5; s++)
      for (let i = 0; i < 40; i++)
        rows.push(['p' + p, Date.UTC(2026, 9, 1 + s, 2) + i * 30e3, 'A', 'A', 1, 'quiz', 'fA', 0.7, 0, 0, 'A B C D', 0, 5, 0]);
  });
  const r = A.profiles(A.prep(rows), 0, 1);
  assert.ok(!r.thin && r.players === 7, JSON.stringify(r).slice(0, 200));
  r.who.forEach(w => w.z.forEach((z, f) => assert.strictEqual(z, 0, `${w.k} ${A.PROF_F[f][0]}: ${z} SD`)));
  assert.deepStrictEqual(r.pca.var, [0, 0]);
});

// Codex review #604 (comment 4479472191): a milestone compacted to the sheet's cap keeps only its profiles' counts; the
// page shows those counts and the compacted note, never an empty heatmap reading 0 answers and 0 players.
test('admin: a compacted milestone shows its profiles’ counts, not an empty heatmap', () => {
  const vm = require('vm'),
    src = require('fs').readFileSync(require('path').join(__dirname, '..', 'admin-analyses.js'), 'utf8'),
    ctx = vm.createContext({ANALYSIS: A, store: {get: (k, d) => d, set() {}}, HELP: {}, addEventListener() {}});
  vm.runInContext(src, ctx);
  ctx.kpis = L => L.map(([t, v]) => `<div><b>${v}</b><span>${t}</span></div>`).join('');
  const who = {n: 900, players: 3, win: 300, at: 100, effects: [], feats: [], who: [{k: 'p1', n: 300, low: 0, v: [], z: []}]},
    rep = {M: [1000, 2000], R: {1000: {A: {who}}, 2000: {A: {who: Object.assign({}, who)}}}, answers: 2000};
  A.compact(rep, JSON.stringify(rep).length - 1);
  const lean = rep.R[1000].A.who;
  assert.ok(lean.lean && !lean.who, 'the first milestone was compacted');
  ctx.REP = rep;
  const html = vm.runInContext("anView('who', REP, REP.R[1000])", ctx);
  assert.match(html, /<b>900<\/b><span>Answers used/);
  assert.match(html, /<b>3<\/b><span>Players/);
  assert.match(html, /Only the main results are kept/);
  assert.doesNotMatch(html, /<svg|Infinity/);
  lean.thin = true;
  lean.n = 2;
  assert.match(vm.runInContext("anView('who', REP, REP.R[1000])", ctx), /<b>2<\/b><span>Players/);
});

// Time and difficulty (Pierre, 2026-11-08: "a slow answer, even a right one, or a photo enlarged, means the photo was
// harder"): before each answer, the earlier answers of OTHER players on its photo, their right answers' speed against
// their own median (from their 10th timed answer; typed and enlarged answers out of it) and their enlarging against
// their own habit, each shrunk by TD_K answers' worth.
test('time and difficulty: others’ earlier answers on the photo only, shrunk; a player’s median from the 10th timed answer', () => {
  const row = (p, t, f, s, o = {}) => [
    p,
    t,
    'G',
    'G',
    o.y == null ? 1 : o.y,
    o.m || 'quiz',
    f,
    0.8,
    0,
    0,
    'G H I J',
    0,
    s,
    o.z == null ? 0 : o.z
  ];
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(row('Q', i, 'x', 5));
  rows.push(row('Q', 10, 'f', 10)); // z = log 2: Q's 11th timed answer, right, not enlarged
  rows.push(row('Q', 11, 'f', 30, {m: 'quiz|t', z: 1})); // typed: no z; enlarged against Q's habit 0 so far
  rows.push(row('R', 12, 'f', 4)); // R: one earlier right answer of another player on f
  rows.push(row('Q', 13, 'f', 5)); // Q again: R's answer has no z (R has no 10 timed answers), its enlarging no habit yet
  const R = A.tdFeat(A.prep(rows));
  assert.strictEqual(R[9].z, null, 'the 10th timed answer has no median yet');
  near(R[10].z, Math.log(2), 1e-9, 'z of the 11th');
  assert.strictEqual(R[11].z, null, 'a typed answer has no z');
  assert.strictEqual(R[10].slow, null, 'no other player on f yet');
  const r = R[12];
  assert.strictEqual(r.nz, 1);
  near(r.slow, Math.log(2) / (1 + A.TD_K), 1e-9, 'others’ right-answer speed, shrunk');
  assert.strictEqual(r.ne, 2, 'two of Q’s answers on f carry an enlarging against a habit');
  near(r.enl, 1 / (2 + A.TD_K), 1e-9, 'others’ enlarging against their habit, shrunk');
  assert.strictEqual(R[13].slow, null, 'Q’s own answers never count for Q');
  assert.strictEqual(R[13].nz, 0);
});

test('time and difficulty: a planted link between a photo’s time and its difficulty comes back; without it, nothing', () => {
  const {photos, meta, look} = synthMeta(),
    pl = Array.from({length: 12}, (_, i) => ['P' + i, ((i % 5) - 2) * 0.4, 600, 0.05 + 0.03 * (i % 6)]),
    run = td =>
      withTruth({td}, () => A.tdiff(A.prep(A.synth({players: pl, photos, look, start: 0, end: 200 * 864e5, seed: 3}), meta), 0, 1)),
    e = (r, k) => r.effects.find(x => x.k === k);
  // the app's expectation blind to the photos' own difficulty (blind 1): what others' time says is then news to it. One
  // seed: at 95% a null effect reads clear about once in 20 (seed 1 does, for slow, among 12 null runs tried)
  const on = run({link: 0.5, blind: 1}),
    off = run({link: 0, blind: 1}),
    known = run({link: 0.5, blind: 0});
  assert.ok(e(on, 'slow').v === 'clear' && e(on, 'slow').est < 0, `slow ${JSON.stringify(e(on, 'slow'))}`);
  assert.ok(e(on, 'tph').v === 'clear' && e(on, 'tph').est < 0, `tph ${JSON.stringify(e(on, 'tph'))}`);
  assert.ok(on.agree.photo > 0.3, `agreement ${on.agree.photo}`);
  assert.notStrictEqual(e(off, 'slow').v, 'clear', 'no link: others’ time says nothing');
  assert.notStrictEqual(e(off, 'tph').v, 'clear', 'no link: no time intensity effect');
  assert.ok(Math.abs(off.agree.photo) < 0.2, `no link: agreement ${off.agree.photo}`);
  // the app already knows each photo's difficulty: others' time adds nothing beyond its expectation, while slow photos
  // are still the hard ones
  assert.notStrictEqual(e(known, 'slow').v, 'clear', 'an app that knows the photo: nothing beyond it');
  assert.ok(e(known, 'tph').v === 'clear' && e(known, 'tph').est < 0, 'slow photos are still the hard ones');
  // its bins: right answers against expected fall from fast to slow others
  const pts = b => (b.y - b.E) / b.n;
  assert.ok(pts(on.bins[0]) > pts(on.bins[2]), JSON.stringify(on.bins));
});
