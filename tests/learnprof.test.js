'use strict';
// tools/learnprof.js (rule L11; docs/LEARNING.md "Validating a learning change", "Profiles"): the simulated players'
// profiles, by lecture group, family, circle or commonness rather than data order, on the real coral slate and on fixed
// fish units.
const test = require('node:test'),
  assert = require('node:assert'),
  path = require('path');
const C = require('../core.js'),
  D = require('../data.json'),
  P = require('../tools/learnprof.js');

const SL = C.slateOf(D),
  corals = {SL, group: g => C.lectureGroup(D, g), numbered: g => (D.gen[g] || {}).n > 0},
  known = (n, U) => P.knownUnits(P.profOf(n, U === corals ? 'coral' : 'fish'), U);

test('the default lists: the casual diver plays the fish only; the special profiles by name only', () => {
  assert.deepStrictEqual(P.defaults('coral'), ['beginner', 'lectureRA', 'strongRA', 'expert']);
  assert.deepStrictEqual(P.defaults('fish'), ['beginner', 'casualDiver', 'lectureRA', 'strongRA', 'expert']);
  assert.strictEqual(P.profOf('casualDiver', 'coral'), null);
  assert.deepStrictEqual(P.profOf('casualDiver', 'fish'), {rate: 0.12, names: 'common', gen: 'lo', by: 'common', hi: 0.3, lo: 0.02});
  assert.strictEqual(P.profOf('lectureRA', 'fish').gen, 'imr');
});

test('corals: the lecture RA knows the numbered genera, the strong RA the first lecture groups, never by data order', () => {
  const lec = known('lectureRA', corals);
  assert.strictEqual(lec.size, SL.filter(g => (D.gen[g] || {}).n > 0).length);
  assert.ok(lec.has('Acropora') && !lec.has('Millepora') && !lec.has('Alveopora'));
  // Groups in the course's order until 60% of the slate: whole groups, a starred genus with its look-alikes' group.
  const strong = known('strongRA', corals),
    groups = new Set([...strong].map(corals.group));
  assert.ok(strong.size >= 0.6 * SL.length && strong.size < 0.75 * SL.length, String(strong.size));
  SL.filter(g => groups.has(corals.group(g))).forEach(g => assert.ok(strong.has(g), g + ' left out of its group'));
  assert.ok(Math.max(...groups) < Math.min(...[...new Set(SL.map(corals.group))].filter(k => k > 0 && !groups.has(k))));
  assert.ok(strong.has('Alveopora'), 'a starred genus follows its look-alike Goniopora (group 6)');
  assert.strictEqual(known('expert', corals).size, SL.length);
  // The spotty player and strongBack as before (groups listed; data order).
  assert.deepStrictEqual(
    [...known('spotty', corals)],
    SL.filter(g => [1, 2, 3, 4, 5].includes(corals.group(g)))
  );
  assert.deepStrictEqual(
    [...known('strongBack', corals)],
    SL.filter((g, i) => i % 5 < 4)
  );
});

test('fish: the RAs know circle 1, the casual diver the families carrying half of the weight, genera by their family', () => {
  const fish = {
    SL: ['f:A', 'f:B', 'f:C', 'f:D', 'f:E'],
    core: ['f:A', 'f:C'],
    tree: [
      ['f:A', 0.1],
      ['f:B', 0.4],
      ['f:C', 0.3],
      ['f:D', 0.15],
      ['f:E', 0.05]
    ]
  };
  assert.deepStrictEqual([...known('lectureRA', fish)], ['f:A', 'f:C']);
  // B (0.4) then C (0.3): half of 1.0 reached after C.
  assert.deepStrictEqual([...known('casualDiver', fish)].sort(), ['f:B', 'f:C']);
  const lec = P.profOf('lectureRA', 'fish'),
    str = P.profOf('strongRA', 'fish'),
    k = known('lectureRA', fish);
  assert.ok(P.genKnown(lec, k, 'f:A', 1) && !P.genKnown(lec, k, 'f:A', 0) && !P.genKnown(lec, k, 'f:B', 1));
  assert.ok(P.genKnown(str, k, 'f:A', 0) && !P.genKnown(str, k, 'f:B', 1));
  assert.ok(P.genKnown(P.profOf('expert', 'fish'), new Set(), 'f:B', 0));
  assert.ok(!P.genKnown(P.profOf('beginner', 'fish'), new Set(fish.SL), 'f:A', 1));
});

test('learnsim loads the rules in the page before the app', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'tools', 'learnsim.js'), 'utf8');
  assert.match(src, /addInitScript\(\{path: path\.join\(__dirname, 'learnprof\.js'\)\}\)/);
  assert.match(src, /LEARNPROF\.knownUnits\(prof,/);
});
