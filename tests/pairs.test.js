// Memory (proto/pairs.js memoryGenera): the genera of a game come from those the player has met first, genera not met
// only to fill the grid (beginner review 2026-11-03). The function runs in Node on stubs, as tests/memory.test.js does.
const test = require('node:test');
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const LOOK = {A: ['B'], B: ['A', 'C'], C: ['B'], D: [], E: ['F'], F: ['E'], G: [], H: []};
function memoryGenera() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'proto', 'pairs.js'), 'utf8'),
    ctx = {
      lookAlikes: n => LOOK[n] || [],
      shuffle: a => {
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
    };
  vm.createContext(ctx);
  vm.runInContext(block(src, 'function memoryGenera', 'LAB.add(') + '\nthis.f = memoryGenera;', ctx);
  return ctx.f;
}
const names = Object.keys(LOOK);

test('met genera first; genera not met only to fill the grid', () => {
  const f = memoryGenera();
  for (let k = 0; k < 50; k++) {
    const met = new Set(['A', 'D', 'G']);
    for (const look of [false, true]) {
      const two = [...f(names, 2, look, n => met.has(n))];
      assert.strictEqual(two.length, 2);
      assert.ok(
        two.every(n => met.has(n)),
        `${look}: ${two}`
      );
      const five = [...f(names, 5, look, n => met.has(n))];
      assert.strictEqual(new Set(five).size, 5);
      assert.ok(
        ['A', 'D', 'G'].every(n => five.includes(n)),
        `${look}: every met genus in: ${five}`
      );
    }
    // Nobody met (a new player) or everyone met: any genera, all different.
    for (const met of [() => false, () => true]) assert.strictEqual(new Set(f(names, 6, false, met)).size, 6);
  }
});

test('look-alike set: among the genera met, look-alikes of those in come first', () => {
  const f = memoryGenera(),
    met = new Set(['A', 'B', 'C', 'D', 'G', 'H']);
  for (let k = 0; k < 50; k++) {
    const g = [...f(names, 3, true, n => met.has(n))];
    assert.ok(
      g.every(n => met.has(n)),
      `${g}`
    );
    // Seeded on A, B or C, the other two follow (a chain of look-alikes); seeded on D, G or H (no look-alike), any met.
    if (['A', 'B', 'C'].includes(g[0])) assert.deepStrictEqual(g.slice().sort(), ['A', 'B', 'C']);
  }
});
