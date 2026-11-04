// Players › Activity, "who plays and how much" (Pierre, 2026-11-04): admin.js activityOver (answers, active players and
// new players per day, ISO week or month, gaps filled) and playHours (answers by hour of the day), on fixed rows.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block');
const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
  ctx = {};
vm.runInNewContext(
  block(src, '// Activity over time (Pierre, 2026-11-04', '\nfunction activityCard(', {file: 'admin.js'}) +
    '\n;this.activityOver = activityOver; this.playHours = playHours;',
  ctx
);
const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
// Ana answers on Mon 2 Nov and Wed 4 Nov, Ben first on Wed 4 Nov, Cy on Mon 9 Nov; nothing on 3 Nov or 5-8 Nov.
const R = [
  ['ana', at(2026, 11, 2, 9)],
  ['ana', at(2026, 11, 2, 9)],
  ['ana', at(2026, 11, 4, 20)],
  ['ben', at(2026, 11, 4, 21)],
  ['cy', at(2026, 11, 9, 9)],
  ['ana', at(2026, 12, 1, 9)]
];
const J = x => JSON.parse(JSON.stringify(x));

test('activityOver by day: answers, active and new players, gaps filled', () => {
  const D = J(ctx.activityOver(R, 'day', 400));
  assert.strictEqual(D[0].k, '2026-11-02');
  assert.strictEqual(D[D.length - 1].k, '2026-12-01');
  assert.strictEqual(D.length, 30);
  const by = Object.fromEntries(D.map(x => [x.k, x]));
  assert.deepStrictEqual(by['2026-11-02'], {k: '2026-11-02', answers: 2, players: 1, newp: 1});
  assert.deepStrictEqual(by['2026-11-03'], {k: '2026-11-03', answers: 0, players: 0, newp: 0});
  assert.deepStrictEqual(by['2026-11-04'], {k: '2026-11-04', answers: 2, players: 2, newp: 1});
  assert.deepStrictEqual(by['2026-12-01'], {k: '2026-12-01', answers: 1, players: 1, newp: 0});
  assert.strictEqual(J(ctx.activityOver(R, 'day', 5)).length, 5, 'the last periods only');
});

test('activityOver by ISO week (from Monday) and by month', () => {
  const W = J(ctx.activityOver(R, 'week'));
  assert.deepStrictEqual(W.slice(0, 2), [
    {k: '2026-11-02', answers: 4, players: 2, newp: 2},
    {k: '2026-11-09', answers: 1, players: 1, newp: 1}
  ]);
  assert.strictEqual(W[W.length - 1].k, '2026-11-30');
  assert.deepStrictEqual(J(ctx.activityOver(R, 'month')), [
    {k: '2026-11', answers: 5, players: 3, newp: 3},
    {k: '2026-12', answers: 1, players: 1, newp: 0}
  ]);
  assert.deepStrictEqual(J(ctx.activityOver([], 'day')), []);
});

test('playHours: answers by hour of the day', () => {
  const H = J(ctx.playHours(R));
  assert.strictEqual(H.length, 24);
  assert.deepStrictEqual([H[9], H[20], H[21], H[10]], [4, 1, 1, 0]);
});
