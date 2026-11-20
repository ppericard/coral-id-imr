'use strict';
require('./slot.js').testGuard();
// tools/fallbackeval.js (docs/LEARNING.md "The first-launch question"): the fallback matrix and the prior's fit, read for
// either subject from learnsim --out runs, on fixed inputs.
const test = require('node:test'),
  assert = require('node:assert');
const F = require('../tools/fallbackeval.js');

// A run of profile prof under answer c whose global level stays at lv and whose answers all come right at e 0.8.
const run = (
  prof,
  lv,
  rows = [
    {q: 50, knowSlate: 0.2},
    {q: 80, knowSlate: 0.3}
  ]
) => ({
  profile: prof,
  rows,
  early: {
    tr: Array.from({length: 80}, (_, i) => ({
      ok: 1,
      e: 0.8,
      th: lv,
      m: 'quiz|k4',
      first: i < 15 ? 1 : 0,
      lv,
      held: 0,
      met: Math.min(15, i + 1)
    }))
  }
});

test('the truthful answers come from tools/learnprof.js, the casual diver and the fish profiles included', () => {
  assert.strictEqual(F.truthOf('beginner'), 'new');
  assert.strictEqual(F.truthOf('casualDiver'), 'new');
  assert.strictEqual(F.truthOf('lectureRA'), 'imr');
  assert.strictEqual(F.truthOf('strongRA'), 'know');
  assert.strictEqual(F.truthOf('expert'), 'know');
  assert.strictEqual(F.truthOf('spotty'), 'new'); // run by name: no answer of its own
});

test('a run shorter than 300 answers reads its last checkpoint', () => {
  const [r] = F.simRuns({runs: [run('casualDiver', 0)]}, 'new');
  assert.strictEqual(r.k100, 0.3);
  assert.strictEqual(r.k300, 0.3);
  // A run's own answer (learnsim --choice auto) wins over the file's.
  assert.strictEqual(F.simRuns({runs: [{...run('lectureRA', 0), choice: 'imr'}]}, 'new')[0].c, 'imr');
});

test('the tables: every profile of the runs, the verdict and the prior fit against the band', () => {
  const R = [
    ...F.simRuns({runs: [run('casualDiver', 0.1), run('casualDiver', 0.1)]}, 'new'),
    ...F.simRuns({runs: [run('casualDiver', 2), run('casualDiver', 2)]}, 'know'),
    ...F.simRuns({runs: [run('expert', 2.5)]}, 'new')
  ];
  const L = F.simTables(R),
    row = s => L.find(l => l.startsWith(s));
  // The casual diver under its truthful "new", level 0.1: no card; under "know", level 2: no "lower".
  assert.match(row('| casualDiver (new) | new (truthful) | 0/2 | 0/2 |'), /–/);
  assert.match(row('| casualDiver (new) | know | 0/2 |'), /0\/2 lower/);
  // An expert who said "new", level 2.5 on all first answers right: "higher" at the first checkpoint.
  assert.match(row('| expert (know) | new | 0/1 | 1/1 | 40 |'), /1\/1 higher/);
  assert.match(row('| expert (know) | new (−∞ to 0.25) |'), /0\/1 \/ 0\/1 \/ 0\/1 \|$/);
  // The prior fit: surprise 0.2 (every answer right at e 0.8), the level inside the band.
  assert.match(row('| casualDiver (new) | new (truthful) (−∞ to 0.25) |'), /0\.20 ± 0\.00 \| 0\.10 ± 0\.00 .*\| 2\/2 \/ 2\/2 \/ 2\/2 \|$/);
  assert.match(row('| casualDiver (new) | know (0.875 to ∞) |'), /2\/2 \/ 2\/2 \/ 2\/2 \|$/);
  assert.ok(L.includes('Wrong answers caught in the right direction: 1/3; cards to truthful answers: 0/2'));
});
