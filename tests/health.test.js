'use strict';
// Health › Photos everyone misses counts players, not answers (Pierre, 2026-11-05): admin.js photoAnswers, missedBy,
// manyMiss and everyoneMisses (between `// everyone: begin` / `end`), the one rule Health, To do's Health line, the
// session summary's "hard for everyone" (healthBad) and the demo data (admin-demo.js) share. Made-up rows:
// [id, time, genus shown, answered, right, mode, photos].
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  block = require('./block');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const src = read('admin.js');
const {HEALTH, photoAnswers, missedBy, manyMiss, everyoneMisses} = new Function(
  block(src, '// everyone: begin', '// everyone: end', {file: 'admin.js'}) +
    '\nreturn {HEALTH, photoAnswers, missedBy, manyMiss, everyoneMisses};'
)();
let t = 0;
const row = (id, ok, ph = 'f1') => [id, t++, 'Favia', ok ? 'Favia' : 'Favites', ok ? 1 : 0, 'quiz', ph];
const of = (R, f = 'f1') => photoAnswers(R)[f];

test('the thresholds: 3 players, 2 of them and a majority under 50%, under 40% right overall', () => {
  assert.deepStrictEqual([HEALTH.PL_MIN, HEALTH.PL_MISS, HEALTH.PL_LOW, HEALTH.PH_LOW], [3, 2, 0.5, 0.4]);
});

test('photoAnswers: each answer once for every photo it showed, per player', () => {
  const P = photoAnswers([row('a', 0, 'f1 f2'), row('a', 1, 'f1'), row('b', 0, 'f2 f2')], f => f !== 'f3');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(P)), {
    f1: {n: 2, ok: 1, by: {a: [2, 1]}},
    f2: {n: 2, ok: 0, by: {a: [1, 0], b: [1, 0]}}
  });
  assert.strictEqual(photoAnswers([row('a', 0, 'f3')], f => f !== 'f3').f3, undefined, 'a photo the admin does not know');
});

test('one player missing the same photo many times is not everyone', () => {
  const o = of(Array.from({length: 8}, () => row('solo', 0)));
  assert.strictEqual(o.n, 8);
  assert.deepStrictEqual(missedBy(o), {pl: 1, miss: 1});
  assert.strictEqual(manyMiss(o), false);
  assert.strictEqual(everyoneMisses(o), false);
  // ... nor with two players who got it right once each: three players, but only one misses it.
  const o2 = of([...Array.from({length: 8}, () => row('solo', 0)), row('b', 1), row('c', 1)]);
  assert.deepStrictEqual(missedBy(o2), {pl: 3, miss: 1});
  assert.strictEqual(everyoneMisses(o2), false, '8 of 10 answers wrong, yet one player');
});

test('a new photo answered by one or two players only is not listed', () => {
  assert.strictEqual(everyoneMisses(of([row('a', 0)])), false);
  assert.strictEqual(everyoneMisses(of([row('a', 0), row('b', 0)])), false, 'two players: under PL_MIN');
});

test('three players mostly missing it: listed', () => {
  const o = of([row('a', 0), row('a', 0), row('b', 0), row('c', 1), row('c', 0)]);
  assert.deepStrictEqual(missedBy(o), {pl: 3, miss: 2}, 'c at 50% does not miss it (under 50% does)');
  assert.strictEqual(manyMiss(o), true);
  assert.strictEqual(everyoneMisses(o), true, '1 right in 5');
});

test('a majority of players, and the overall share under 40%, are both needed', () => {
  // 2 of 4 players miss it: not a majority.
  const half = of([row('a', 0), row('b', 0), row('c', 1), row('d', 1)]);
  assert.deepStrictEqual(missedBy(half), {pl: 4, miss: 2});
  assert.strictEqual(manyMiss(half), false);
  // 2 of 3 players miss it, but one who gets it right answered it often: 6 right in 8, over 40%.
  const busy = of([row('a', 0), row('b', 0), ...Array.from({length: 6}, () => row('c', 1))]);
  assert.strictEqual(manyMiss(busy), true);
  assert.strictEqual(everyoneMisses(busy), false);
});

test('healthBad, the session summary and the demo all use the one rule', () => {
  const bad = block(src, 'function healthBad(R) {', '\n}\n', {through: 1, file: 'admin.js'});
  assert.match(bad, /photoAnswers\(R,/);
  assert.match(bad, /manyMiss\(o\)/);
  assert.match(bad, /everyoneMisses\(o\)/);
  assert.doesNotMatch(bad, /o\.n >= H\.PH_MIN/, 'the old answer-count gate');
  assert.match(read('admin-journey.js'), /hardAll = ofAns\('hardAll', \(\) => new Set\(healthBad\(/);
  const demo = read('admin-demo.js');
  assert.match(demo, /everyoneMisses\(tally\(/);
  assert.match(demo, /photoAnswers\(/);
});
