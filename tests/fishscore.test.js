// The global fish score's formula (docs/FISH_PATH.md "My progress (fish)"): its anchors on the real circle-1 world
// (tools/fishscore.js Part A), and a credit that never goes down when a name is learned.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const F = require('../tools/fishscore.js');

const W = F.world(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish.json'), 'utf8')), null);
const row = label => F.fixed(W).find(r => r.label === label).score * 100;

test('anchors: 25 / 55 / 80 / 85 / 90 / 100%', () => {
  const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, `${x} vs ${y}`);
  near(row('Entries only'), 25);
  near(row('Entries + every genus'), 55);
  near(row('Every common name'), 80);
  near(row('Every scientific name'), 85);
  near(row('Every common name + every genus'), 90);
  near(row('Both names of every species'), 100);
});

test('the species credit rises with each name, 0 to 1', () => {
  for (let c = 0; c <= 1; c += 0.1)
    for (let s = 0; s <= 1; s += 0.1) {
      const v = F.credit(c, s);
      assert.ok(v >= -1e-12 && v <= 1 + 1e-12);
      assert.ok(F.credit(Math.min(1, c + 0.1), s) >= v - 1e-12);
      assert.ok(F.credit(c, Math.min(1, s + 0.1)) >= v - 1e-12);
    }
  assert.ok(Math.abs(F.credit(1, 1) - 1) < 1e-12);
});

test('the simulation is reproducible from its seed', () => {
  const prof = {learn: 'both', k0: {entry: 0.3, name: 0.1, genus: 0.05, sci: 0}};
  const a = F.simulate(W, prof, 11, 1500);
  const b = F.simulate(W, prof, 11, 1500);
  assert.deepStrictEqual(a.trace, b.trace);
  assert.ok(a.trace.at(-1).score > 0.15);
});

test('plateau: a run that stalls before its ceiling reports the stall (Codex review #519)', () => {
  // 26% at answer 50, 27% at 100, then 27% until answer 10,000: the open stretch is the longest.
  const trace = [
    {a: 50, score: 0.26},
    {a: 100, score: 0.27}
  ];
  for (let a = 150; a <= 10000; a += 50) trace.push({a, score: 0.27});
  const p = F.plateau(trace, 80);
  assert.strictEqual(p.len, 9900);
  assert.strictEqual(p.at, 27);
});
