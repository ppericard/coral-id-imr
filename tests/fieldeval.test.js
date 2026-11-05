'use strict';
// tools/fieldeval.js (docs/LEARNING.md "Field learner and the Custom-8 scenario"): the logistic fit with an offset behind
// the real-log set-size check, and Holm's adjustment.
const test = require('node:test'),
  assert = require('node:assert');
const {fit, pOf, holm} = require('../tools/fieldeval.js');

// Codex review #619: three players, 100 answers each over five genera, right and wrong in turn with e = 0.9; plain
// Newton steps diverged (slope above a billion, a non-finite log-loss, and still an exact p printed).
test('the fit stays finite when the answers fall far below the expectation', () => {
  const rows = [];
  for (let p = 0; p < 3; p++)
    for (let i = 0; i < 100; i++) rows.push({p, y: i % 2, o: Math.log(9), one: 1, x: Math.log2(1 + Math.min(4, Math.floor(i / 20)))});
  const b = fit(rows, ['one', 'x']);
  assert.ok(b.every(Number.isFinite), JSON.stringify(b));
  assert.ok(Math.abs(b[1]) < 20, JSON.stringify(b));
  for (const r of rows) {
    const q = pOf(r, ['one', 'x'], b);
    assert.ok(q > 0 && q < 1);
  }
});

test('the fit recovers a known slope', () => {
  // Deterministic data: right with chance sig(0.5 - 0.4 x), as expected counts.
  const rows = [];
  for (let x = 0; x <= 5; x++) {
    const p = 1 / (1 + Math.exp(-(0.5 - 0.4 * x)));
    for (let i = 0; i < 1000; i++) rows.push({y: i < Math.round(1000 * p) ? 1 : 0, o: 0, one: 1, x});
  }
  const [a, b] = fit(rows, ['one', 'x']);
  assert.ok(Math.abs(a - 0.5) < 0.02 && Math.abs(b + 0.4) < 0.02, `${a} ${b}`);
});

test('Holm adjusts step-down and keeps the order', () => {
  assert.deepStrictEqual(
    holm([0.01, 0.04, 0.03, NaN]).map(x => (Number.isNaN(x) ? 'NaN' : +x.toFixed(4))),
    [0.03, 0.06, 0.06, 'NaN']
  );
});
