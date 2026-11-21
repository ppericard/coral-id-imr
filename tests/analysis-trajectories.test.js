require('./slot.js').testGuard();
// The Analyses module (analysis.js), Player trajectories (ROADMAP "Analyses: structure views", whole-history learning
// trajectories; Q78): the profile's behaviours on successive windows of each player's whole history, each window ending
// with a session. Planted changes along a history come back window by window; a player with one window has no
// trajectory; too few players give none; a session is never cut in two by a window.
// tests/analysis.test.js says why the module's tests are split.
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');

const W = A.TR.W;
// n answers of a player in sessions of o.ses (default 25; 10 s apart, a day between), 4 choices, expected 0.75. rise: the
// chance of a right answer climbs from 0.5 to 0.95 across the history, else stays 0.75; late: from this block of 100
// answers on, sessions start at 19:00 Manila time (11:00 UTC) instead of 09:00 (01:00 UTC); miss: the answers (their
// indexes) answered wrong whatever the chance.
function player(id, n, o = {}) {
  const R = A.rng(o.seed || 3),
    ses = o.ses || 25,
    rows = [];
  for (let i = 0; i < n; i++) {
    const w = Math.floor(i / W),
      s = Math.floor(i / ses),
      hour = o.late != null && w >= o.late ? 11 : 1,
      t = Date.UTC(2026, 0, 1 + s, hour, 0, 0) + (i % ses) * 10e3,
      p = o.rise ? 0.5 + 0.45 * (i / (n - 1)) : 0.75,
      y = (o.miss || []).includes(i) ? 0 : R() < p ? 1 : 0;
    rows.push([
      id,
      t,
      'Gen' + (i % 5),
      y ? 'Gen' + (i % 5) : 'Gen9',
      y,
      'quiz',
      'f1',
      0.75,
      0,
      0,
      'Gen0 Gen1 Gen2 Gen3',
      0,
      3 + 2 * R(),
      0
    ]);
  }
  return rows;
}
const log = o => A.prep(Object.keys(o).flatMap(id => player(id, o[id].n, o[id])));
// a window: [ordinal, answers given by its end, then a value per behaviour]
const ORD = 0,
  END = 1;

test('trajectories: windows of 100 answers ending with a session, a player with one window has none, a last short block is left out', () => {
  const T = A.trajectories(log({a: {n: 450}, b: {n: 400}, c: {n: 250}, d: {n: 150}, e: {n: 399}}), 0, 1);
  assert.strictEqual(T.thin, undefined);
  assert.strictEqual(T.players, 4, 'a, b, c and e have two windows or more; d has one');
  assert.deepStrictEqual(
    T.who.map(p => [p.k, p.w.map(r => [r[ORD], r[END]])]),
    [
      [
        'a',
        [
          [1, 100],
          [2, 200],
          [3, 300],
          [4, 400]
        ]
      ],
      [
        'b',
        [
          [1, 100],
          [2, 200],
          [3, 300],
          [4, 400]
        ]
      ],
      [
        'e',
        [
          [1, 100],
          [2, 200],
          [3, 300]
        ]
      ],
      [
        'c',
        [
          [1, 100],
          [2, 200]
        ]
      ]
    ],
    'the most answers first; the answers after the last window, under 100, are left out'
  );
  assert.deepStrictEqual(
    T.feats.map(f => f.k),
    ['pace', 'zoom', 'acc', 'stop', 'len', 'wk', 'eve'],
    'no learning slope: it needs the whole range of practice'
  );
  T.who.forEach(p => p.w.forEach(r => assert.strictEqual(r.length, 2 + T.feats.length)));
  assert.strictEqual(T.n, (4 + 4 + 3 + 2) * W);
});

test('trajectories: a window ends with a session, never inside one: its session length and its stops are the player’s own', () => {
  // 12 sessions of 60 answers: a window is 2 sessions (120 answers), never 100 answers cut inside the second
  const miss = [59, 119, 179, 239, 299, 359, 419, 479, 539, 599, 659, 719],
    T = A.trajectories(log({a: {n: 720, ses: 60, miss}, b: {n: 720, ses: 60, miss, seed: 4}, c: {n: 720, ses: 60, miss, seed: 5}}), 0, 1),
    f = k => T.feats.findIndex(x => x.k === k) + 2;
  T.who.forEach(p => {
    assert.deepStrictEqual(
      p.w.map(r => r[END]),
      [120, 240, 360, 480, 600, 720],
      `${p.k}: each window two whole sessions`
    );
    p.w.forEach(r => assert.strictEqual(r[f('len')], 60, `${p.k} window ${r[ORD]}: a session of 60 answers, not a fragment`));
  });
  // the stops after misses are measured on the sessions' real ends: a value in every window, a share of a chance
  T.who.forEach(p => p.w.forEach(r => assert.ok(r[f('stop')] != null && Math.abs(r[f('stop')]) <= 1, `${p.k} ${r[f('stop')]}`)));
  // one uninterrupted session per player has no window to split: no trajectory
  const one = A.trajectories(log({a: {n: 400, ses: 400}, b: {n: 400, ses: 400}, c: {n: 400, ses: 400}}), 0, 1);
  assert.ok(one.thin, 'a session of 400 answers is one window, a player needs two');
  assert.strictEqual(one.n, 0);
});

test('trajectories: right beyond the expectation rises along a history planted to rise, and stays with none; evening play follows the hour', () => {
  const T = A.trajectories(
      log({
        a: {n: 500, rise: 1, late: 3},
        b: {n: 500, rise: 1, late: 3, seed: 4},
        c: {n: 500, rise: 1, late: 3, seed: 5},
        d: {n: 500, seed: 6}
      }),
      0,
      1
    ),
    f = k => T.feats.findIndex(x => x.k === k) + 2,
    by = Object.fromEntries(T.who.map(p => [p.k, p.w]));
  ['a', 'b', 'c'].forEach(id => {
    const w = by[id];
    assert.ok(w[4][f('acc')] - w[0][f('acc')] > 0.25, `${id} first ${w[0][f('acc')]} last ${w[4][f('acc')]}`);
    assert.deepStrictEqual(
      w.map(r => r[f('eve')]),
      [0, 0, 0, 1, 1],
      `${id}: the sessions move to the evening at the 4th window`
    );
  });
  assert.ok(Math.abs(by.d[4][f('acc')] - by.d[0][f('acc')]) < 0.2, 'no rise planted: no rise');
  // the typical trajectory: by window, the median over the players, from 3 players
  const m = Object.fromEntries(T.med.map(r => [r[ORD], r]));
  assert.deepStrictEqual(Object.keys(m).map(Number), [1, 2, 3, 4, 5]);
  assert.strictEqual(m[5][END], 500);
  assert.ok(m[5][f('acc')] - m[1][f('acc')] > 0.2, 'the median rises');
  // how many rose, fell or stayed (a change beyond 0.5 SD of the behaviour's windows)
  const c = T.chg[f('acc') - 2];
  assert.strictEqual(c.n, 4);
  assert.strictEqual(c.up, 3, JSON.stringify(c));
  assert.strictEqual(c.up + c.down + c.flat, c.n);
});

test('trajectories: under 3 players with two windows, the view waits (thin), and says how many it has', () => {
  const T = A.trajectories(log({a: {n: 300}, b: {n: 250}, c: {n: 190}}), 0, 1);
  assert.ok(T.thin);
  assert.strictEqual(T.n, 2);
  assert.strictEqual(T.min, 3);
  assert.deepStrictEqual(T.effects, []);
});

test('trajectories: a deleted account’s answers make no trajectory; more than the players shown are counted', () => {
  const rows = ['a', 'b', 'c', 'd'].flatMap(id => player(id, 300)),
    D = A.prep(rows);
  D.filter(a => a.p === 'd').forEach(a => (a.gone = 1));
  const T = A.trajectories(D, 0, 1);
  assert.strictEqual(T.players, 3);
  assert.ok(!T.who.some(p => p.k === 'd'));
  assert.strictEqual(T.more, 0);
});

test('trajectories: the report carries them with the other analyses, compacted away from older milestones', () => {
  const rows = ['a', 'b', 'c', 'd', 'e'].flatMap((id, i) => player(id, 450, {seed: 10 + i, rise: i % 2}));
  const rep = A.report(rows, {ph: {}}, null, {B: 0});
  const M = rep.M[rep.M.length - 1];
  assert.ok(rep.R[M].A.traj, 'a traj analysis in the milestone');
  assert.strictEqual(rep.R[M].A.traj.players, 5);
  assert.ok(rep.R[M].A.traj.who.length === 5);
  // an older milestone loses its trajectories when the report is over the sheet's cap (compact keeps the effects only)
  const small = A.compact(JSON.parse(JSON.stringify(rep)), 1),
    old = small.R[small.M[0]];
  if (small.M.length > 1) assert.ok(old.A.traj.lean && !old.A.traj.who, 'the oldest milestone keeps no player rows');
});
