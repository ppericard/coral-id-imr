require('./slot.js').testGuard();
// Same or different? (proto/samediff.js): the drawing, run in Node on stubs as tests/pairs.test.js runs Memory's. Rule L4: only
// units the player has unlocked; "declared pairs only" (Pierre, 2026-11-18): a Different is always a declared look-alike
// pair; a Same shows two observations of one unit, in the same view as its other photo (rule P4). The page is untimed and
// changes no progress: its code never calls the quiz's recorders.
const test = require('node:test');
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'proto', 'samediff.js'), 'utf8');
function draw() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    'const labObs = p => p.o || p.f;\n' + block(SRC, 'function sdPlan', 'LAB.add(') + '\nthis.plan = sdPlan; this.photos = sdPhotos;',
    ctx
  );
  return ctx;
}
const {plan, photos} = draw();
const ok = () => true;
// Declared pairs of a made-up subject: A-B and B-C (a chain), D-E, and F-G among the units not unlocked below.
const PAIRS = [
  ['A', 'B'],
  ['B', 'C'],
  ['D', 'E'],
  ['F', 'G']
];
const inPair = (n, met) => PAIRS.some(([a, b]) => (a === n && met.has(b)) || (b === n && met.has(a)));

test('only unlocked units, and a Different is always a declared pair of two unlocked units', () => {
  const met = new Set(['A', 'B', 'D', 'F', 'X']); // C, E, G locked; X in no pair
  let diff = 0;
  for (let k = 0; k < 600; k++) {
    const p = plan([...met], PAIRS, ok);
    assert.ok(
      p.units.every(n => met.has(n)),
      `a locked unit: ${p.units}`
    );
    if (!p.same) {
      diff++;
      assert.strictEqual(p.units.length, 2);
      const [a, b] = p.units;
      assert.ok(
        PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
        `${a}-${b} is no declared pair`
      );
    } else assert.strictEqual(p.units.length, 1);
    // X has no declared look-alike, so it is never asked (a Same on it would always be the right answer).
    assert.ok(!p.units.includes('X'));
    assert.ok(!p.same || inPair(p.units[0], met), `${p.units}: a Same on a unit with no unlocked look-alike`);
  }
  assert.ok(diff > 600 * 0.4 && diff < 600 * 0.6, `about half Different: ${diff} of 600`);
});

test('both sides and both units come up, in either order', () => {
  const seen = new Set();
  for (let k = 0; k < 400; k++) {
    const p = plan(['A', 'B'], [['A', 'B']], ok);
    seen.add(`${p.same ? 'S' : 'D'}:${p.units.join('')}`);
  }
  assert.deepStrictEqual([...seen].sort(), ['D:AB', 'D:BA', 'S:A', 'S:B']);
});

test('no unlocked declared pair, or one a single label names: nothing to ask (a new player)', () => {
  assert.strictEqual(plan(['A', 'C'], PAIRS, ok), null); // A-B and B-C need B
  assert.strictEqual(plan([], PAIRS, ok), null);
  assert.strictEqual(plan(['A', 'B'], [], ok), null);
  assert.strictEqual(
    plan(['A', 'B'], PAIRS, () => false),
    null
  );
  // The labels check is the caller's (choiceNames): it removes one pair, not the others.
  const apart = (a, b) => !(a === 'A' && b === 'B');
  for (let k = 0; k < 50; k++)
    assert.ok(['D', 'E'].includes(plan(['A', 'B', 'D', 'E'], PAIRS, apart).units[0]), 'the pair of one label was drawn');
});

// A stub photo source: unit -> photos {f, o (observation), sdv (view)}.
const LIB = {
  A: [
    {f: 'a1', o: 'oa1', sdv: 'macro'},
    {f: 'a2', o: 'oa2', sdv: 'macro'},
    {f: 'a3', o: 'oa3', sdv: 'wide'}
  ],
  B: [{f: 'b1', o: 'ob1', sdv: 'macro'}],
  C: [{f: 'c1', o: 'oc1', sdv: 'wide'}],
  D: [{f: 'd1', o: 'od1', sdv: 'macro'}]
};
// The first photo of the unit, as photoSet would draw one; want narrows it as proto/samediff.js photo does.
const photo = (n, want) =>
  (LIB[n] || []).find(p => !want || ((!want.view || p.sdv === want.view) && (!want.not || (p.o || p.f) !== want.not))) || null;

test('Same: two different observations of the unit, in one view; Different: one photo of each, in one view', () => {
  const s = photos({same: true, units: ['A']}, photo);
  assert.strictEqual(s.length, 2);
  assert.notStrictEqual(s[0].o, s[1].o, 'one observation twice (rule P4)');
  assert.strictEqual(s[0].sdv, s[1].sdv, 'two views');
  const d = photos({same: false, units: ['A', 'B']}, photo);
  assert.deepStrictEqual(
    Array.from(d, p => p.f), // (an array of the vm's realm is not deep-equal to this one's)
    ['a1', 'b1']
  );
  assert.strictEqual(d[0].sdv, d[1].sdv);
});

test('a side with no photo to match: no question (the caller draws another plan)', () => {
  assert.strictEqual(photos({same: true, units: ['B']}, photo), null); // one observation only
  assert.strictEqual(photos({same: false, units: ['A', 'C']}, photo), null); // A's closest view has no match in C
  assert.strictEqual(photos({same: false, units: ['Z', 'A']}, photo), null); // no photo at all
  assert.strictEqual(photos({same: false, units: ['D', 'A']}, photo).length, 2);
});

test('the page is untimed and changes no progress: it never calls the quiz recorders, nor reads the data look-alikes', () => {
  const code = SRC.split('\n')
    .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');
  for (const f of [
    'question',
    'answer',
    'recordAnswer',
    'logAnswer',
    'seenAdd',
    'duelPick',
    'dataLooks',
    'mimPairs',
    'introAdd',
    'qclockArm'
  ])
    assert.ok(!new RegExp(`\\b${f}\\(`).test(code), `proto/samediff.js calls ${f}`);
  assert.match(code, /UNITS\[SUBJ\.id\]\.pairs\(\)/, 'the declared pairs of the subject on screen');
  assert.match(code, /\bunlocked\(\)/, 'the unlocked units (rule L4)');
  // The draw's own photo choice is the shared source's (proto/lab.js labShots; tests/oddone.test.js greps it for recorders).
  assert.match(code, /labShots\(/, "the draw's own photo choice, through the shared source");
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'proto', 'lab.js'), 'utf8'), /photoSet\(n, null, 0, 2, 'compare', keep\)/);
});

test('registered: the Tools list, the service worker list and the hub icon', () => {
  const lab = fs.readFileSync(path.join(__dirname, '..', 'proto', 'lab.js'), 'utf8'),
    sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(block(lab, 'files: [', '],', {file: 'proto/lab.js'}), /'samediff'/);
  assert.match(block(sw, '...[', '].map(f =>', {file: 'sw.js'}), /'samediff'/);
  assert.match(block(lab, 'const LAB_ICONS = {', '};', {file: 'proto/lab.js'}), /\bsamediff:/);
});
