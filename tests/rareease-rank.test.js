// Rarely under ease 4 before Open Water, continued (the harness and what it checks: tests/rareease.js and
// tests/rareease.test.js).
const test = require('node:test'),
  assert = require('node:assert');
const {engine, pool, share, DRAWS} = require('./rareease.js');

test('a unit of another rank (a fish genus) under Open Water is not capped (Pierre, 2026-11-08, Q271)', () => {
  const L = pool(),
    G = engine('fish', L, {rank: 'genus'}),
    F = engine('fish', L, {rank: 'family'}),
    g = share(G, L, DRAWS.BACK);
  assert.ok(g > 0.3, `a genus under Open Water: ${(100 * g).toFixed(1)}% under ease 4, drawn as before`);
  assert.ok(share(F, L) <= F.RARE.SHARE + 0.03, 'a unit naming its own rank, the family, is capped');
});

test('past Open Water the hard photos come back at the targeting', () => {
  const L = pool(),
    E = engine('fish', L, {th: 1.2, score: 0.6, ok: 12}),
    r = share(E, L, DRAWS.BACK);
  assert.ok(r > 0.3, `under ease 4 past Open Water: ${(100 * r).toFixed(1)}%`);
});

test('corals: photos with no judged ease are never held back', () => {
  const L = pool().map(({e, ...p}) => p),
    E = engine('coral', L);
  let hard = 0,
    tot = 0;
  for (let i = 0; i < DRAWS.BACK; i++)
    E.photoSet('u', null, 0, 4, 'k4').shown.forEach(x => ((tot += 1), (hard += /^hard/.test(x.f) ? 1 : 0)));
  // No ease, no prior: every observation alike, so the 240 "hard" ones take about their share of the pool.
  assert.ok(hard / tot > 0.85, `${((100 * hard) / tot).toFixed(1)}%`);
});
