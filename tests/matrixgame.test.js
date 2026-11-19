require('./slot.js').testGuard();
// Matrix (proto/matrixgame.js): the drawing, run in Node on stubs as tests/oddone.test.js runs Odd one out's. Rule L4: the four
// photographed units are unlocked ones, starting from a declared look-alike pair when one is unlocked; the fifth name is a
// look-alike of a shown unit first, a unit of the game never met only when no unlocked one is left; the five names carry five
// labels; the four photos are four observations in one view, framed alike (rule P4's multi-photo case). The page is untimed
// and changes no progress: its code, and the shared helpers it uses (proto/lab.js labShots, labSheet), never call the quiz's
// recorders.
const test = require('node:test');
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SRC = read('proto/matrixgame.js'),
  LAB = read('proto/lab.js'),
  SHARED = block(LAB, 'const labObs', 'function viewLab(', {file: 'proto/lab.js'});
function load(extra = {}) {
  const ctx = {...extra};
  vm.createContext(ctx);
  vm.runInContext(
    'const labObs = p => p.o || p.f;\n' +
      block(SRC, 'function mxPlan', 'LAB.add(', {file: 'proto/matrixgame.js'}) +
      '\nthis.plan = mxPlan; this.photos = mxPhotos;',
    ctx
  );
  return ctx;
}
const {plan, photos} = load();
const ok = () => true;
// A seeded random, so a run is the same every time.
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
// Declared pairs of a made-up subject: A-B and B-C (a chain), D-E, F-G.
const PAIRS = [
  ['A', 'B'],
  ['B', 'C'],
  ['D', 'E'],
  ['F', 'G']
];
const declared = (a, b) => PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const ALL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

test('four distinct unlocked units start from a declared pair; five distinct names, the fifth never shown as a photo', () => {
  const met = ['A', 'B', 'D', 'F', 'X', 'Y']; // C, E, G locked; X, Y in no pair
  const rnd = seeded(7),
    starts = new Set();
  for (let k = 0; k < 800; k++) {
    const p = plan(met, PAIRS, ok, ALL, rnd);
    assert.strictEqual(new Set(p.units).size, 4, `four units: ${p.units}`);
    assert.ok(
      p.units.every(n => met.includes(n)),
      `a locked unit shown: ${p.units}`
    );
    assert.ok(!p.units.includes(p.extra), 'the fifth name is also a photo');
    assert.strictEqual(new Set(p.names).size, 5);
    assert.deepStrictEqual([...p.names].sort(), [...p.units, p.extra].sort());
    // a declared pair among the four whenever one has both units unlocked (A-B, D-E no: E locked; so A-B only)
    assert.ok(
      p.units.some(a => p.units.some(b => declared(a, b))),
      `no declared pair in ${p.units}`
    );
    starts.add([...p.units].sort().join(''));
  }
  assert.ok(starts.size > 3, 'the same four every time');
});

test('the fifth name is a look-alike of a shown unit when one is left, unlocked ones first, else any unit of the game', () => {
  const rnd = seeded(11);
  // A, B, D, E and F unlocked: whatever four are shown, the one left is the fifth.
  const met = ['A', 'B', 'D', 'E', 'F'];
  for (let k = 0; k < 400; k++) {
    const p = plan(met, PAIRS, ok, ALL, rnd);
    assert.ok(met.includes(p.extra), `an unlocked unit is left, yet the fifth is ${p.extra}`);
  }
  // exactly four unlocked: the fifth comes from the game's other units, a look-alike of a shown one first (C, of B)
  const four = ['A', 'B', 'D', 'E'],
    seen = new Set();
  for (let k = 0; k < 400; k++) {
    const p = plan(four, PAIRS, ok, ALL, rnd);
    assert.deepStrictEqual([...p.units].sort(), four);
    assert.ok(['C', 'F', 'G', 'H', 'I', 'J'].includes(p.extra));
    assert.strictEqual(
      p.units.some(t => declared(p.extra, t)),
      p.extra === 'C',
      `${p.extra} against ${p.units}`
    );
    seen.add(p.extra);
  }
  assert.deepStrictEqual([...seen], ['C'], 'a look-alike of a shown unit comes before any other');
});

test('a unit with no declared look-alike unlocked is still asked: the next ones are look-alikes of those shown, else any', () => {
  const rnd = seeded(3),
    shown = new Set();
  for (let k = 0; k < 500; k++) shown.add(plan(['X', 'Y', 'Z', 'W', 'V'], [], ok, [], rnd).units.sort().join(''));
  assert.ok(shown.size >= 4, 'with no pair at all, every four of five come');
  // Chains: with B-C declared and A-B, a start at A-B draws C before any unrelated unit
  const chain = new Set();
  for (let k = 0; k < 400; k++) {
    const p = plan(
      ['A', 'B', 'C', 'X', 'Y'],
      [
        ['A', 'B'],
        ['B', 'C']
      ],
      ok,
      [],
      rnd
    );
    if (p.units.includes('A') && p.units.includes('B')) chain.add(p.units.includes('C') ? 'C' : 'other');
  }
  assert.deepStrictEqual([...chain], ['C'], 'A-B was shown with an unrelated unit while C, a look-alike of B, was unlocked');
});

test('five labels: units one label names are never together; nothing to ask when four labels cannot be found', () => {
  // A and B carry one label, so do C and D
  const one = (a, b) =>
    ![
      ['A', 'B'],
      ['C', 'D']
    ].some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const rnd = seeded(5);
  for (let k = 0; k < 500; k++) {
    const p = plan(['A', 'B', 'C', 'D', 'E', 'F'], PAIRS, one, ALL, rnd);
    for (const a of p.names) for (const b of p.names) assert.ok(a === b || one(a, b), `${a} and ${b} carry one label`);
  }
  assert.strictEqual(plan(['A', 'B', 'C', 'D'], PAIRS, one, [], rnd), null, 'only three labels among four units');
});

test('fewer than four unlocked units, or no fifth name: nothing to ask (a new player)', () => {
  assert.strictEqual(plan([], PAIRS, ok, ALL), null);
  assert.strictEqual(plan(['A', 'B', 'C'], PAIRS, ok, ALL), null);
  assert.strictEqual(plan(['A', 'A', 'B', 'C'], PAIRS, ok, ALL), null, 'one unit twice is one unit');
  assert.strictEqual(plan(['A', 'B', 'C', 'D'], PAIRS, ok, []), null, 'four units and no fifth name');
  assert.strictEqual(plan(['A', 'B', 'C', 'D'], PAIRS, ok, ['A', 'B', 'C', 'D']), null, 'the fifth is never one of the four');
  assert.notStrictEqual(plan(['A', 'B', 'C', 'D'], PAIRS, ok, ['E']), null);
});

// A stub photo source: unit -> photos {f, o (observation), sdv (view), xc (the fish's square cut)}, drawn as lab.js labShots does.
const LIB = {
  A: [
    {f: 'a1', o: 'oa1', sdv: 'macro'},
    {f: 'a2', o: 'oa2', sdv: 'wide'}
  ],
  B: [
    {f: 'b1', o: 'ob1', sdv: 'macro'},
    {f: 'b2', o: 'ob2', sdv: 'macro', xc: [1, 2, 3, 4]}
  ],
  C: [{f: 'c1', o: 'oc1', sdv: 'wide'}],
  D: [{f: 'd1', o: 'od1', sdv: 'macro', xc: [1, 1, 1, 1]}],
  E: [{f: 'e1', o: 'oe1', sdv: 'macro', xc: [2, 2, 2, 2]}],
  F: [{f: 'f1', o: 'of1', sdv: 'macro'}]
};
const photo = (n, want) =>
  (LIB[n] || []).find(
    p =>
      !want ||
      ((!want.view || p.sdv === want.view) &&
        ![].concat(want.not || []).includes(p.o || p.f) &&
        (want.tile === undefined || !!p.xc === want.tile))
  ) || null;
const keys = L => Array.from(L, p => p.f);

test('one photo of each unit in the order of the tiles, four observations, one view, framed alike', () => {
  assert.strictEqual(photos({units: ['A', 'A']}, photo), null, "a unit twice: its other photo is not in the first one's view");
  const t = photos({units: ['A', 'B', 'F']}, photo);
  assert.deepStrictEqual(keys(t), ['a1', 'b1', 'f1']);
  assert.strictEqual(new Set(t.map(p => p.o)).size, 3, 'one observation twice (rule P4)');
  assert.strictEqual(new Set(t.map(p => p.sdv)).size, 1, 'two views');
  // the first photo decides the framing: D has the cut, so every unit shows its cut photo (B: b2), a unit with none gives none
  assert.deepStrictEqual(keys(photos({units: ['D', 'B', 'E']}, photo)), ['d1', 'b2', 'e1']);
  assert.strictEqual(photos({units: ['D', 'A']}, photo), null, 'A has no cut photo: no uncut tile among cut ones');
  // an uncut first photo: B's first photo is b1, so the cut b2 is never drawn beside it
  assert.strictEqual(photos({units: ['B', 'D']}, photo), null);
});

test('a unit with no photo in the first one’s view: no question (the caller draws another plan)', () => {
  assert.strictEqual(photos({units: ['A', 'C']}, photo), null, "C has no photo in A's macro view");
  assert.strictEqual(photos({units: ['Z', 'A']}, photo), null, 'no photo at all');
  assert.strictEqual(photos({units: ['A', 'Z']}, photo), null);
});

test('the page is untimed and changes no progress: it never calls the quiz recorders, nor reads the data look-alikes', () => {
  const strip = t =>
    t
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n');
  // The game, and the shared helpers (lab.js) it uses: one list of what none may call.
  for (const [what, code] of [
    ['proto/matrixgame.js', strip(SRC)],
    ['proto/lab.js labShots and labSheet', strip(SHARED)]
  ])
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
      'qclockArm',
      'qclockGo',
      'sendReports',
      'syncSoon',
      'store.set'
    ])
      assert.ok(!new RegExp(`\\b${f.replace('.', '\\.')}\\(`).test(code), `${what} calls ${f}`);
  const code = strip(SRC);
  assert.match(code, /UNITS\[SUBJ\.id\]\.pairs\(\)/, 'the declared pairs of the subject on screen');
  assert.match(code, /\bunlocked\(\)/, 'the units the player has unlocked (rule L4)');
  assert.match(code, /labShots\(/, "the draw's own photo choice, through the shared source");
  assert.match(code, /choiceNames\(/, 'one label for two units is no pair');
  // The subject on screen, never a subject's name (rule S1).
  assert.ok(
    !/['"](fish|coral|seaslug|corals)['"]|SUBJECTS\[|SUBJ\.id\s*[=!]==/.test(code),
    'proto/matrixgame.js tests which subject it runs'
  );
  // Nothing named before its pair is right: no unit in an alt or aria-label of a tile, and no figcaption in the tile's markup.
  const tileFn = code.slice(code.indexOf('const tile ='), code.indexOf('const name ='));
  assert.ok(!/uname|unameT|\bof\[|R\.units|R\.names/.test(tileFn), 'a tile names its unit before its pair is right');
  assert.ok(!/figcaption/.test(tileFn));
  // The matched and the wrong tile are named in pair() only, the wrong pair's caption never names the tile's own unit.
  const wrong = code.slice(code.indexOf("f.classList.add('fko')"), code.indexOf('if (got.size === 4)'));
  assert.ok(!/of\[k\]/.test(wrong), "a wrong pair's feedback names the photo's unit");
  // The pair's own buttons are not the quiz's answers (app.js qAnswers opens and closes every [data-c]): the names keep data-n.
  assert.match(code, /data-n=/);
  assert.ok(!/<button[^>]*data-c="\$\{esc\(c\)\}"/.test(code), 'a name button carries data-c');
});

test('registered: the Tools list, the service worker list and the hub icon, beside the Feature matrix, not instead of it', () => {
  const sw = read('sw.js');
  assert.match(block(LAB, 'files: [', '],', {file: 'proto/lab.js'}), /'matrixgame'/);
  assert.match(block(LAB, 'files: [', '],', {file: 'proto/lab.js'}), /'matrix'/);
  assert.match(block(sw, '...[', '].map(f =>', {file: 'sw.js'}), /'matrixgame'/);
  assert.match(block(LAB, 'const LAB_ICONS = {', '};', {file: 'proto/lab.js'}), /\bmatrixgame:/);
  assert.match(SRC, /id: 'matrixgame'/);
  assert.match(read('proto/matrix.js'), /id: 'matrix'/);
});
