require('./slot.js').testGuard();
// Odd one out (proto/oddone.js): the drawing, run in Node on stubs as tests/samediff.test.js runs Same or different?'s. Rule L4:
// only units the player has unlocked; the intruder is one of the shown unit's declared look-alikes when one is unlocked, else
// any unlocked unit with another label; the four photos are three observations of one unit and one of the intruder, in one view
// and framed alike (rule P4's multi-photo case). The page is untimed and changes no progress: its code, and the shared helpers
// it uses (proto/lab.js labShots, labSheet), never call the quiz's recorders.
const test = require('node:test');
const block = require('./block.js'); // the block of a browser file a test runs, its markers checked
const assert = require('node:assert');
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SRC = read('proto/oddone.js'),
  LAB = read('proto/lab.js'),
  SHARED = block(LAB, 'const labObs', 'function viewLab(', {file: 'proto/lab.js'});
function load(extra = {}) {
  const ctx = {...extra};
  vm.createContext(ctx);
  vm.runInContext(
    'const labObs = p => p.o || p.f;\n' +
      block(SRC, 'function ooPlan', 'LAB.add(', {file: 'proto/oddone.js'}) +
      '\nthis.plan = ooPlan; this.photos = ooPhotos;',
    ctx
  );
  return ctx;
}
const {plan, photos} = load();
const ok = () => true;
// Declared pairs of a made-up subject: A-B and B-C (a chain), D-E, and F-G.
const PAIRS = [
  ['A', 'B'],
  ['B', 'C'],
  ['D', 'E'],
  ['F', 'G']
];
const declared = (a, b) => PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

test('only unlocked units; the intruder is a declared look-alike of the shown unit whenever one is unlocked', () => {
  const met = ['A', 'B', 'D', 'F', 'X']; // C, E, G locked; X in no pair
  const seen = new Set();
  for (let k = 0; k < 800; k++) {
    const p = plan(met, PAIRS, ok);
    assert.ok(met.includes(p.maj) && met.includes(p.odd), `a locked unit: ${p.maj} ${p.odd}`);
    assert.notStrictEqual(p.maj, p.odd);
    assert.ok(p.at >= 0 && p.at <= 3 && Number.isInteger(p.at), `the place ${p.at}`);
    const unlockedLooks = met.filter(o => declared(p.maj, o));
    if (unlockedLooks.length) assert.ok(unlockedLooks.includes(p.odd), `${p.maj}: ${p.odd} is not one of its look-alikes ${unlockedLooks}`);
    seen.add(p.maj);
  }
  // X has no declared look-alike: it is still shown (else any unlocked unit is the intruder), and so is every other unit.
  assert.deepStrictEqual([...seen].sort(), ['A', 'B', 'D', 'F', 'X']);
});

test('a unit with no unlocked look-alike gets any other unlocked unit; the intruder place is never fixed', () => {
  const odd = new Set(),
    at = new Set();
  for (let k = 0; k < 600; k++) {
    const p = plan(['A', 'X', 'Y'], PAIRS, ok); // A-B needs B: none of the three has a look-alike unlocked
    odd.add(`${p.maj}>${p.odd}`);
    at.add(p.at);
  }
  assert.deepStrictEqual([...odd].sort(), ['A>X', 'A>Y', 'X>A', 'X>Y', 'Y>A', 'Y>X']);
  assert.deepStrictEqual([...at].sort(), [0, 1, 2, 3]);
});

test('two labels only: a unit one label names with the shown unit is never its intruder (the labels check is the caller)', () => {
  const apart = (a, b) => !((a === 'A' && b === 'B') || (a === 'B' && b === 'A'));
  for (let k = 0; k < 300; k++) {
    const p = plan(['A', 'B', 'C'], PAIRS, apart);
    assert.ok(apart(p.maj, p.odd), `${p.maj} and ${p.odd} carry one label`);
    // B-C is the declared pair that stays, and A has only C left whatever its look-alikes
    if (p.maj === 'A') assert.strictEqual(p.odd, 'C');
  }
  assert.strictEqual(plan(['A', 'B'], PAIRS, apart), null, 'the only two units carry one label');
});

test('fewer than two units, or none with another label: nothing to ask (a new player)', () => {
  assert.strictEqual(plan([], PAIRS, ok), null);
  assert.strictEqual(plan(['A'], PAIRS, ok), null);
  assert.strictEqual(plan(['A', 'A'], PAIRS, ok), null, 'one unit twice is one unit');
  assert.strictEqual(
    plan(['A', 'B'], PAIRS, () => false),
    null
  );
  assert.notStrictEqual(plan(['A', 'Z'], [], ok), null, 'no declared pair at all still plays on two units');
});

// A stub photo source: unit -> photos {f, o (observation), sdv (view), xc (the fish's square cut)}, drawn as lab.js labShots does.
const LIB = {
  A: [
    {f: 'a1', o: 'oa1', sdv: 'macro'},
    {f: 'a2', o: 'oa2', sdv: 'macro'},
    {f: 'a3', o: 'oa3', sdv: 'macro'},
    {f: 'a4', o: 'oa4', sdv: 'wide'}
  ],
  B: [
    {f: 'b1', o: 'ob1', sdv: 'macro'},
    {f: 'b2', o: 'ob2', sdv: 'macro', xc: [1, 2, 3, 4]}
  ],
  C: [{f: 'c1', o: 'oc1', sdv: 'wide'}],
  D: [
    {f: 'd1', o: 'od1', sdv: 'macro', xc: [1, 1, 1, 1]},
    {f: 'd2', o: 'od2', sdv: 'macro', xc: [1, 1, 1, 1]},
    {f: 'd3', o: 'od3', sdv: 'macro', xc: [1, 1, 1, 1]}
  ],
  E: [{f: 'e1', o: 'oe1', sdv: 'macro', xc: [2, 2, 2, 2]}]
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

test('three observations of the shown unit and one of the intruder, in one view, the intruder at its place', () => {
  for (let at = 0; at < 4; at++) {
    const s = photos({maj: 'A', odd: 'B', at}, photo);
    assert.strictEqual(s.length, 4);
    assert.strictEqual(s[at].f, 'b1', `the intruder is at ${at}`);
    const three = s.filter((_, i) => i !== at);
    assert.deepStrictEqual(keys(three), ['a1', 'a2', 'a3']);
    assert.strictEqual(new Set(s.map(p => p.o)).size, 4, 'one observation twice (rule P4)');
    assert.strictEqual(new Set(s.map(p => p.sdv)).size, 1, 'two views');
  }
});

test('the four are framed alike: with the fish square cut on all four, or on none', () => {
  // D has the cut on every photo: the intruder must have it too (E), never B's uncut b1
  const s = photos({maj: 'D', odd: 'E', at: 2}, photo);
  assert.deepStrictEqual(keys(s), ['d1', 'd2', 'e1', 'd3']);
  assert.ok(Array.from(s).every(p => p.xc));
  // B has an uncut photo first (b1) and a cut one: against D it is the cut one (b2)
  assert.deepStrictEqual(keys(photos({maj: 'D', odd: 'B', at: 0}, photo)), ['b2', 'd1', 'd2', 'd3']);
  // A has no cut photo and E only a cut one: no set rather than a cut tile among uncut ones
  const u = photos({maj: 'A', odd: 'B', at: 3}, photo);
  assert.ok(
    Array.from(u).every(p => !p.xc),
    'a cut tile among uncut ones gives the intruder away'
  );
  assert.strictEqual(photos({maj: 'A', odd: 'E', at: 0}, photo), null);
});

test('a side with no photo to match: no question (the caller draws another plan)', () => {
  assert.strictEqual(photos({maj: 'C', odd: 'A', at: 0}, photo), null, 'one observation of C: no three');
  assert.strictEqual(photos({maj: 'B', odd: 'A', at: 0}, photo), null, 'two observations of B: no three');
  assert.strictEqual(photos({maj: 'A', odd: 'C', at: 0}, photo), null, "C has no photo in A's view");
  assert.strictEqual(photos({maj: 'A', odd: 'Z', at: 0}, photo), null, 'no photo at all');
  assert.strictEqual(photos({maj: 'Z', odd: 'A', at: 0}, photo), null);
});

// labShots (proto/lab.js) on stubs of the draw's own photoSet and the unit's photos.
function shots(units, max) {
  const ctx = {
    gamePics: (n, v) => (units[n] || []).filter(p => p.sdv === v),
    photoSet: (n, skip, shift, k, f, keep) => {
      assert.strictEqual(f, 'compare', 'a duel-aimed draw');
      const L = (units[n] || []).filter(p => !keep || keep(p));
      return {shown: L.length ? [L[0]] : []};
    }
  };
  vm.createContext(ctx);
  vm.runInContext(
    block(SHARED, 'const labObs', 'const labTips', {file: 'proto/lab.js'}) + `\nthis.src = labShots(${max === undefined ? '' : max});`,
    ctx
  );
  return ctx.src;
}
test('labShots: `not` as a key or a list, the view, the cut; the last photos shown wait while others can be drawn', () => {
  const U = {
    A: [
      {f: 'a1', o: 'o1', sdv: 'wide'},
      {f: 'a2', o: 'o2', sdv: 'wide'},
      {f: 'a3', o: 'o3', sdv: 'wide', xc: [1, 1, 1, 1]},
      {f: 'a4', sdv: 'macro'}
    ]
  };
  U.A.forEach(p => (p.view = p.sdv));
  const s = shots(U);
  assert.strictEqual(s.photo('A', null).f, 'a1');
  assert.strictEqual(s.photo('A', {not: 'o1'}).f, 'a2');
  assert.strictEqual(s.photo('A', {not: ['o1', 'o2']}).f, 'a3');
  assert.strictEqual(s.photo('A', {view: 'macro'}).f, 'a4', 'the photo without an observation is keyed by its file');
  assert.strictEqual(s.photo('A', {tile: true}).f, 'a3');
  assert.strictEqual(s.photo('A', {tile: false}).f, 'a1');
  assert.strictEqual(s.photo('A', {not: ['o1', 'o2', 'o3', 'a4']}), null);
  assert.strictEqual(s.photo('A', null).sdv, 'wide', 'a photo carries its view');
  s.seen([U.A[0]]);
  assert.strictEqual(s.photo('A', null).f, 'a2', 'the one just shown waits');
  s.seen([U.A[1], U.A[2], U.A[3]]);
  assert.ok(s.photo('A', null), 'when all were shown, one is drawn anyway');
});

test('the page is untimed and changes no progress: it never calls the quiz recorders, nor reads the data look-alikes', () => {
  const strip = t =>
    t
      .split('\n')
      .map(l => l.replace(/(^|\s)\/\/.*$/, ''))
      .join('\n');
  // The game, its sibling's shared helpers (lab.js), and Same or different? beside it: one list of what none may call.
  for (const [what, code] of [
    ['proto/oddone.js', strip(SRC)],
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
  assert.match(strip(SHARED), /photoSet\(/, "the draw's own photo choice");
  assert.match(code, /choiceNames\(/, 'one label for two units is no intruder');
  // The subject on screen, never a subject's name (rule S1).
  assert.ok(!/['"](fish|coral|seaslug|corals)['"]|SUBJECTS\[|SUBJ\.id\s*[=!]==/.test(code), 'proto/oddone.js tests which subject it runs');
  // Nothing named before the answer: no unit in an alt or aria-label of a tile, and no figcaption before go().
  const tileFn = code.slice(code.indexOf('const tile ='), code.indexOf('root.innerHTML = `<div class="q bleed qfind'));
  assert.ok(!/uname|unameT|\bof\[|R\.maj|R\.odd/.test(tileFn), 'a tile names its unit before the answer');
  assert.ok(!/figcaption/.test(tileFn));
});

test('registered: the Tools list, the service worker list and the hub icon', () => {
  const sw = read('sw.js');
  assert.match(block(LAB, 'files: [', '],', {file: 'proto/lab.js'}), /'oddone'/);
  assert.match(block(sw, '...[', '].map(f =>', {file: 'sw.js'}), /'oddone'/);
  assert.match(block(LAB, 'const LAB_ICONS = {', '};', {file: 'proto/lab.js'}), /\boddone:/);
});
