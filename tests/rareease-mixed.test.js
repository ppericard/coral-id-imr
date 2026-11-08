// Rarely under ease 4 before Open Water, continued (the harness and what it checks: tests/rareease.js and
// tests/rareease.test.js).
const test = require('node:test'),
  assert = require('node:assert');
const {engine, pool, share} = require('./rareease.js');

test('observations mixing easy and hard photos: their hard photos count too (Codex review #729)', () => {
  // 12 observations, each one ease-4 photo among twenty ease-3 ones (mixed observations exist in 24 units of
  // fish-game.json): counting each observation as easy left 91% of the draws under ease 4.
  const L = [];
  for (let i = 0; i < 12; i++) {
    L.push({f: `easy${i}`, o: `o${i}`, e: 4});
    for (let j = 0; j < 20; j++) L.push({f: `hard${i}-${j}`, o: `o${i}`, e: 3});
  }
  const E = engine('fish', L),
    r = share(E, L);
  assert.ok(r <= E.RARE.SHARE + 0.03, `under ease 4: ${(100 * r).toFixed(1)}%`);
  assert.ok(r > 0.02, `no wall (${(100 * r).toFixed(1)}%)`);
  // Mixed and pure observations together: the 240-hard pool with every easy photo inside a hard observation's.
  const M = pool().map((p, i) => (i < 12 ? {...p, o: `oh${i}`} : p)),
    F = engine('fish', M);
  assert.ok(share(F, M) <= F.RARE.SHARE + 0.03);
});

test('exploration questions with every easy observation seen: still within the cap (Codex review #729)', () => {
  // A unit held (calibration questions, CAL.RATE, draw among the observations never seen) whose 12 easy ones were all
  // seen and answered right twice: the exploration alone drew 36% under ease 4.
  const L = pool(),
    ps = Object.fromEntries(L.filter(p => p.e >= 4).map(p => [p.f, [2, 2]])),
    E = engine('fish', L, {lv: 'mid', ps}),
    r = share(E, L);
  assert.ok(r <= E.RARE.SHARE + 0.03, `under ease 4: ${(100 * r).toFixed(1)}%`);
  assert.ok(r > 0.02, `no wall (${(100 * r).toFixed(1)}%)`);
});
