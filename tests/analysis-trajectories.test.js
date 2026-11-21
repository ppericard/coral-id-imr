require('./slot.js').testGuard();
// The Analyses module (analysis.js), Player trajectories (ROADMAP "Analyses: structure views", whole-history learning
// trajectories; Q78): the profile's behaviours on successive windows of each player's whole history. Planted changes along
// a history come back window by window; a player with one window has no trajectory; too few players give none.
// tests/analysis.test.js says why the module's tests are split.
const test = require('node:test'),
  assert = require('node:assert');
const A = require('../analysis.js');

const DAY = 864e5,
  W = A.TR.W;
// n answers of a player in sessions of 25 (10 s apart, a day between), 4 choices, expected 0.75. rise: the chance of a right
// answer climbs from 0.5 to 0.95 across the history, else stays 0.75; late: from this window on, sessions start at 19:00
// Manila time (11:00 UTC) instead of 09:00 (01:00 UTC).
function player(id, n, o = {}) {
  const R = A.rng(o.seed || 3),
    rows = [];
  for (let i = 0; i < n; i++) {
    const w = Math.floor(i / W),
      s = Math.floor(i / 25),
      hour = o.late != null && w >= o.late ? 11 : 1,
      t = Date.UTC(2026, 0, 1 + s, hour, 0, 0) + (i % 25) * 10e3,
      p = o.rise ? 0.5 + 0.45 * (i / (n - 1)) : 0.75,
      y = R() < p ? 1 : 0;
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

test('trajectories: a window of 100 answers each, a player with one window has none, the newest answers are kept whole', () => {
  const T = A.trajectories(log({a: {n: 450}, b: {n: 400}, c: {n: 250}, d: {n: 150}, e: {n: 399}}), 0, 1);
  assert.strictEqual(T.thin, undefined);
  assert.strictEqual(T.players, 4, 'a, b, c and e have two windows or more; d has one');
  assert.deepStrictEqual(
    T.who.map(p => [p.k, p.w.map(r => r[0])]),
    [
      ['a', [100, 200, 300, 400]],
      ['b', [100, 200, 300, 400]],
      ['e', [100, 200, 300]],
      ['c', [100, 200]]
    ],
    'the most answers first; a last block under 100 answers is left out'
  );
  assert.deepStrictEqual(
    T.feats.map(f => f.k),
    ['pace', 'zoom', 'acc', 'stop', 'len', 'wk', 'eve'],
    'no learning slope: it needs the whole range of practice'
  );
  T.who.forEach(p => p.w.forEach(r => assert.strictEqual(r.length, 1 + T.feats.length)));
  assert.strictEqual(T.n, (4 + 4 + 3 + 2) * W);
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
    f = k => T.feats.findIndex(x => x.k === k) + 1,
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
  // the typical trajectory: the median over the players at each window, from 3 players
  const m = Object.fromEntries(T.med.map(r => [r[0], r]));
  assert.deepStrictEqual(Object.keys(m).map(Number), [100, 200, 300, 400, 500]);
  assert.ok(m[500][f('acc')] - m[100][f('acc')] > 0.2, 'the median rises');
  // how many rose, fell or stayed (a change beyond 0.5 SD of the behaviour's windows)
  const c = T.chg[f('acc') - 1];
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
